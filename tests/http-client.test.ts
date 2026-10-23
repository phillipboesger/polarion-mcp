import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios"

import { sendWithRetry } from "../src/httpClient.js"
import { executeApiTool } from "../src/executor.js"
import { toolDefinitionMap, securitySchemes } from "../src/tools.js"

// The generated tools need a token; a call without one is refused before it is sent.
process.env.BEARER_TOKEN ??= "test-token"

function httpError(status: number) {
  return new AxiosError("fail", "ERR", undefined, undefined, { status, statusText: "", headers: {}, config: {} as any, data: {} })
}
const ok = (config: AxiosRequestConfig): AxiosResponse => ({ status: 200, statusText: "OK", headers: {}, data: {}, config: config as any })

test("a POST is not retried on a 5xx: Polarion may already have created the items", async () => {
  let calls = 0
  await assert.rejects(sendWithRetry({ method: "POST" }, {
    httpClient: async () => { calls++; throw httpError(502) }, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0,
  }))
  assert.equal(calls, 1)
})

test("a POST is retried on 429: the request was rejected, not processed", async () => {
  let calls = 0
  const res = await sendWithRetry({ method: "POST" }, {
    httpClient: async (c) => { calls++; if (calls === 1) throw httpError(429); return ok(c) }, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0,
  })
  assert.equal(res.status, 200)
  assert.equal(calls, 2)
})

test("a PATCH is not retried on a 5xx either, a GET and a DELETE are", async () => {
  for (const [method, expected] of [["PATCH", 1], ["GET", 2], ["DELETE", 2]] as const) {
    let calls = 0
    const request = sendWithRetry({ method }, {
      httpClient: async (c) => { calls++; if (calls === 1) throw httpError(503); return ok(c) }, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0,
    })
    if (method === "PATCH") {
      await assert.rejects(request, /fail/)
    } else {
      const response = await request
      assert.equal(response.status, 200, `${method} should retry and succeed`)
    }
    assert.equal(calls, expected, method)
  }
})

test("every request gets a timeout, so a hung Polarion cannot hang a tool call forever", async () => {
  let seen: AxiosRequestConfig | undefined
  await sendWithRetry({ method: "GET" }, { httpClient: async (c) => { seen = c; return ok(c) }, minIntervalMs: 0 })
  assert.ok(typeof seen?.timeout === "number" && seen.timeout > 0)
})

test("concurrent requests are paced apart instead of firing together", async () => {
  const startedAt: number[] = []
  const httpClient = async (c: AxiosRequestConfig) => { startedAt.push(Date.now()); return ok(c) }
  await Promise.all([1, 2, 3, 4].map(() => sendWithRetry({ method: "GET" }, { httpClient, minIntervalMs: 40 })))
  startedAt.sort((a, b) => a - b)
  // Request i never starts before its slot (i x 40 ms after the first); a
  // late timer under load may only push requests later, never into a burst.
  for (let i = 1; i < startedAt.length; i++) {
    assert.ok(startedAt[i] - startedAt[0] >= i * 40 - 5, `request ${i} started ${startedAt[i] - startedAt[0]} ms after the first`)
  }
})

test("a multipart upload that is retried sends the complete file again", async () => {
  const bodies: Buffer[] = []
  let calls = 0
  const httpClient = async (c: AxiosRequestConfig): Promise<AxiosResponse> => {
    calls++
    const data = c.data
    bodies.push(Buffer.isBuffer(data) ? data : Buffer.from(String(data)))
    if (calls === 1) throw httpError(429)
    return { ...ok(c), status: 201, headers: { "content-type": "application/json" }, data: { data: [] } }
  }
  const requestBody = JSON.stringify({ resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "a.txt" } }] }, files: [Buffer.from("hello").toString("base64")] })
  const result = await Promise.race([
    executeApiTool("postWorkItemAttachments", toolDefinitionMap.get("postWorkItemAttachments")!, { projectId: "P", workItemId: "W-1", requestBody }, securitySchemes,
      { httpClient, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0 }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("retry hung")), 2000)),
  ])
  assert.notEqual(result.isError, true, JSON.stringify(result.content))
  assert.equal(calls, 2)
  assert.ok(bodies[1].includes("hello") && bodies[1].length === bodies[0].length)
})

test("a 429 with Retry-After waits as long as Polarion asks before retrying", async () => {
  const startedAt: number[] = []
  let calls = 0
  const httpClient = async (c: AxiosRequestConfig) => {
    startedAt.push(Date.now())
    if (++calls === 1) {
      throw new AxiosError("429", "ERR", undefined, undefined, { status: 429, statusText: "", headers: { "retry-after": "1" }, config: {} as any, data: {} })
    }
    return ok(c)
  }
  await sendWithRetry({ method: "GET" }, { httpClient, minIntervalMs: 0, initialBackoffMs: 1 })
  assert.ok(startedAt[1] - startedAt[0] >= 950, `retried after ${startedAt[1] - startedAt[0]} ms`)
})

test("a Retry-After longer than a tool call should wait ends the retrying: the 429 goes to the caller at once", async () => {
  let calls = 0
  const httpClient = async () => {
    calls++
    throw new AxiosError("429", "ERR", undefined, undefined, { status: 429, statusText: "", headers: { "retry-after": "120" }, config: {} as any, data: {} })
  }
  await assert.rejects(sendWithRetry({ method: "GET" }, { httpClient, minIntervalMs: 0, initialBackoffMs: 1 }), /429/)
  assert.equal(calls, 1)
})

test("a DELETE retried after a 5xx that finds the item gone (404) counts as deleted", async () => {
  let calls = 0
  const res = await sendWithRetry({ method: "DELETE" }, {
    httpClient: async () => { calls++; throw httpError(calls === 1 ? 502 : 404) }, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0,
  })
  assert.equal(res.status, 204)
  assert.equal(calls, 2)
})

test("a first-attempt 404 on DELETE is still an error", async () => {
  await assert.rejects(sendWithRetry({ method: "DELETE" }, { httpClient: async () => { throw httpError(404) }, minIntervalMs: 0, postMutationDelayMs: 0 }), /fail/)
})

test("a DELETE that found nothing after a 429 retry was never processed: the 404 stays an error", async () => {
  let calls = 0
  await assert.rejects(sendWithRetry({ method: "DELETE" }, {
    httpClient: async () => { calls++; throw httpError(calls === 1 ? 429 : 404) }, minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0,
  }), /fail/)
  assert.equal(calls, 2)
})
