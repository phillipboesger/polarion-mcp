/**
 * Shared paced/retrying HTTP call primitive.
 *
 * Extracted out of `executor.ts` so both the main tool-execution path and
 * `guards.ts` (pre-write validation, which needs to make its own GET calls
 * to Polarion) share the same pacing clock and retry behavior instead of
 * each hammering the server independently.
 */

import https from 'node:https';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ProxyTunnelAgent, proxyFromEnv } from './proxy.js';

// axios would send an HTTPS request to the proxy as a plain forward request. The agent tunnels instead.
// Only switched off when HTTPS_PROXY is set, so http:// Polarion URLs keep axios's own HTTP_PROXY handling otherwise.
if (proxyFromEnv()) axios.defaults.proxy = false;

export const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/** ~3 req/s, matching Polarion's low burst tolerance observed in production. */
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 350;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
/**
 * Polarion forbids concurrent writes to the same project; a short settle
 * delay after a successful mutation reduces the chance the very next call
 * (e.g. an immediate read-back) races the write's server-side propagation.
 * Separate from `DEFAULT_MIN_REQUEST_INTERVAL_MS`, which paces every
 * request (reads included); this only applies once, after a mutating
 * request succeeds.
 */
const DEFAULT_POST_MUTATION_DELAY_MS = 1500;
/** Upper bound for one request, so a hung Polarion cannot hang a tool call forever. */
const DEFAULT_TIMEOUT_MS = 120_000;
/** Methods that may be resent after a 5xx: repeating them has the same effect. */
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options', 'put', 'delete']);

/** Earliest time the next request may start. */
let nextSlotAt = 0;

/**
 * Reserves the next send slot. The reservation is synchronous, so requests
 * that arrive together queue up `minIntervalMs` apart instead of all reading
 * the same "last request" time and firing at once.
 */
async function paceRequest(minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, nextSlotAt);
  nextSlotAt = startAt + minIntervalMs;
  if (startAt > now) await new Promise((r) => setTimeout(r, startAt - now));
}

/**
 * @param method - HTTP method of the failed request.
 * @param status - Status Polarion answered with.
 * @returns True if resending is safe. A 429 was rejected before any work; a
 *   5xx on POST/PATCH may come after the write happened (e.g. a proxy
 *   timeout), so resending could create duplicates.
 */
function isRetryable(method: string, status: number): boolean {
  return status === 429 || (status >= 500 && IDEMPOTENT_METHODS.has(method));
}

/** Longest Retry-After (seconds) a call waits out. */
const MAX_RETRY_AFTER_S = 60;

const agents = new Map<string, https.Agent>();

/**
 * @param rejectUnauthorized - Whether TLS certificates are verified.
 * @param env - Environment for HTTPS_PROXY / NO_PROXY; injectable for tests.
 * @returns A shared keep-alive agent, so calls reuse connections instead of
 *   paying a TLS handshake each. It tunnels through HTTPS_PROXY when set.
 */
export function httpsAgent(rejectUnauthorized: boolean, env: NodeJS.ProcessEnv = process.env): https.Agent {
  const proxy = proxyFromEnv(env);
  const key = `${rejectUnauthorized}|${proxy ? `${proxy.url.href}|${proxy.noProxy.join(',')}` : ''}`;
  let agent = agents.get(key);
  if (!agent) {
    const options = { keepAlive: true, rejectUnauthorized };
    agent = proxy ? new ProxyTunnelAgent(options, proxy) : new https.Agent(options);
    agents.set(key, agent);
  }
  return agent;
}

export interface SendWithRetryOpts {
  httpClient?: (c: AxiosRequestConfig) => Promise<AxiosResponse>;
  maxRetries?: number;
  initialBackoffMs?: number;
  minIntervalMs?: number;
  postMutationDelayMs?: number;
  /** Cancels the in-flight request and any retry wait, e.g. when the caller disconnected. */
  signal?: AbortSignal;
}

/**
 * Sends an HTTP request via axios (or an injected client), applying
 * process-wide request pacing, a timeout, and retry-with-backoff on 429
 * (any method) and 5xx (idempotent methods only).
 *
 * `opts` is the seam tests use to inject a fake `httpClient` and near-zero
 * `minIntervalMs`/`initialBackoffMs`/`postMutationDelayMs` so tests run in
 * milliseconds. Production call sites use all defaults.
 */
export async function sendWithRetry(
  config: AxiosRequestConfig,
  opts: SendWithRetryOpts = {},
  attempt = 1,
  mayHaveSucceeded = false
): Promise<AxiosResponse> {
  const {
    httpClient = axios,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
    minIntervalMs = DEFAULT_MIN_REQUEST_INTERVAL_MS,
    postMutationDelayMs = DEFAULT_POST_MUTATION_DELAY_MS,
    signal,
  } = opts;
  signal?.throwIfAborted();
  await paceRequest(minIntervalMs);
  const method = String(config.method ?? 'get').toLowerCase();
  try {
    const response = await httpClient({ timeout: DEFAULT_TIMEOUT_MS, ...(signal ? { signal } : {}), ...config });
    if (MUTATING_METHODS.has(method) && postMutationDelayMs > 0) {
      await new Promise((r) => setTimeout(r, postMutationDelayMs));
    }
    return response;
  } catch (error) {
    // The first attempt of a DELETE may have succeeded before the 5xx (a proxy
    // timeout); the retry then finds nothing. That is the outcome asked for.
    if (mayHaveSucceeded && method === 'delete' && axios.isAxiosError(error) && error.response?.status === 404) {
      return { ...error.response, status: 204, statusText: 'No Content (deleted by an earlier attempt)', data: undefined };
    }
    if (
      axios.isAxiosError(error) &&
      error.response &&
      isRetryable(method, error.response.status) &&
      attempt <= maxRetries &&
      !signal?.aborted
    ) {
      // Honour Retry-After (seconds) on 429; else back off exponentially.
      const retryAfter = Number(error.response.headers?.['retry-after']);
      // A longer wait than a tool call should block: hand the 429 to the caller instead of
      // burning the retries inside the window.
      if (error.response.status === 429 && retryAfter > MAX_RETRY_AFTER_S) throw error;
      const wait = error.response.status === 429 && retryAfter > 0
        ? retryAfter * 1000
        : initialBackoffMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
      // A 429 was rejected before any work; a 5xx may have come after the write.
      return sendWithRetry(config, opts, attempt + 1, mayHaveSucceeded || error.response.status !== 429);
    }
    throw error;
  }
}
