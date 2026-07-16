/**
 * Shared paced/retrying HTTP call primitive.
 *
 * Extracted out of `executor.ts` so both the main tool-execution path and
 * `guards.ts` (pre-write validation, which needs to make its own GET calls
 * to Polarion) share the same pacing clock and retry behavior instead of
 * each hammering the server independently.
 */

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
let lastRequestAt = 0;

async function paceRequest(minIntervalMs: number): Promise<void> {
  const wait = minIntervalMs - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
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
 * process-wide request pacing and retry-with-backoff on 429/5xx responses.
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
  lastRequestAt = Date.now();
  try {
    const response = await httpClient(config);
    const method = String(config.method ?? 'get').toLowerCase();
    if (MUTATING_METHODS.has(method) && postMutationDelayMs > 0) {
      await new Promise((r) => setTimeout(r, postMutationDelayMs));
    }
    return response;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      (error.response.status === 429 || error.response.status >= 500) &&
      attempt <= maxRetries
    ) {
      await new Promise((r) => setTimeout(r, initialBackoffMs * 2 ** (attempt - 1)));
      return sendWithRetry(config, opts, attempt + 1);
    }
    throw error;
  }
}
