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

const agents = new Map<boolean, https.Agent>();

/**
 * @param rejectUnauthorized - Whether TLS certificates are verified.
 * @returns A shared keep-alive agent, so calls reuse connections instead of
 *   paying a TLS handshake each.
 */
export function httpsAgent(rejectUnauthorized: boolean): https.Agent {
  let agent = agents.get(rejectUnauthorized);
  if (!agent) {
    agent = new https.Agent({ keepAlive: true, rejectUnauthorized });
    agents.set(rejectUnauthorized, agent);
  }
  return agent;
}

export interface SendWithRetryOpts {
  httpClient?: (c: AxiosRequestConfig) => Promise<AxiosResponse>;
  maxRetries?: number;
  initialBackoffMs?: number;
  minIntervalMs?: number;
  postMutationDelayMs?: number;
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
  attempt = 1
): Promise<AxiosResponse> {
  const {
    httpClient = axios,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
    minIntervalMs = DEFAULT_MIN_REQUEST_INTERVAL_MS,
    postMutationDelayMs = DEFAULT_POST_MUTATION_DELAY_MS,
  } = opts;
  await paceRequest(minIntervalMs);
  const method = String(config.method ?? 'get').toLowerCase();
  try {
    const response = await httpClient({ timeout: DEFAULT_TIMEOUT_MS, ...config });
    if (MUTATING_METHODS.has(method) && postMutationDelayMs > 0) {
      await new Promise((r) => setTimeout(r, postMutationDelayMs));
    }
    return response;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      isRetryable(method, error.response.status) &&
      attempt <= maxRetries
    ) {
      // Honour Retry-After (seconds) on 429, within reason; else back off exponentially.
      const retryAfter = Number(error.response.headers?.['retry-after']);
      const wait = error.response.status === 429 && retryAfter > 0 && retryAfter <= 60
        ? retryAfter * 1000
        : initialBackoffMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
      return sendWithRetry(config, opts, attempt + 1);
    }
    throw error;
  }
}
