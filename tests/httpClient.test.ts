import test from "node:test"
import assert from "node:assert/strict"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { sendWithRetry } from "../src/httpClient.js"

function okResponse(): AxiosResponse {
  return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config: {} as any }
}

test("sendWithRetry waits postMutationDelayMs after a successful mutating request", async () => {
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => okResponse()

  const start = Date.now()
  await sendWithRetry(
    { method: "post" },
    { httpClient, minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 50 },
  )
  const elapsed = Date.now() - start
  assert.ok(elapsed >= 50, `expected at least 50ms post-mutation delay, took ${elapsed}ms`)
})

test("sendWithRetry does not apply postMutationDelayMs after a successful GET", async () => {
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => okResponse()

  const start = Date.now()
  await sendWithRetry(
    { method: "get" },
    { httpClient, minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 5000 },
  )
  const elapsed = Date.now() - start
  assert.ok(elapsed < 1000, `expected no post-mutation delay on a GET, took ${elapsed}ms`)
})

test("sendWithRetry does not apply postMutationDelayMs when the mutating request fails", async () => {
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    throw Object.assign(new Error("boom"), { isAxiosError: false })
  }

  const start = Date.now()
  await assert.rejects(() =>
    sendWithRetry(
      { method: "post" },
      { httpClient, minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 5000, maxRetries: 0 },
    ),
  )
  const elapsed = Date.now() - start
  assert.ok(elapsed < 1000, `expected no post-mutation delay on a failed request, took ${elapsed}ms`)
})

test("sendWithRetry defaults postMutationDelayMs to a non-zero value in production (opts omitted)", async () => {
  // Not asserting the exact default (that's an implementation detail); just that
  // *some* positive delay is the default, so a caller can't accidentally get 0
  // by forgetting to pass it -- matches the "opt out, not opt in" safety intent.
  let called = false
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    called = true
    return okResponse()
  }
  const start = Date.now()
  await sendWithRetry({ method: "post" }, { httpClient, minIntervalMs: 0 })
  const elapsed = Date.now() - start
  assert.ok(called)
  assert.ok(elapsed >= 500, `expected a real default post-mutation delay, took ${elapsed}ms`)
})
