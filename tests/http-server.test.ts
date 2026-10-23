import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

import { createHttpApp } from "../src/http-server.js"

test("REST wrapper hides internal errors and rate limits authenticated API routes with JSON 429", async () => {
  const app = createHttpApp({
    apiKey: "test-key",
    env: {},
    port: 3000,
    rateLimit: { windowMs: 60_000, limit: 1 },
    executeTool: async () => { throw new Error("secret Authorization: Bearer leaked-token") },
  })
  const server = app.listen(0)
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const first = await fetch(`${url}/api/tools/createProject`, { method: "POST", headers: { Authorization: "Bearer test-key", "content-type": "application/json" }, body: JSON.stringify({ arguments: {} }) })
    if (first.status === 500) {
      const body = await first.json() as { message?: string }
      assert.equal(body.message, "Tool execution failed")
    } else assert.equal(first.status, 404)
    const second = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key" } })
    assert.equal(second.status, 429)
    assert.match(second.headers.get("content-type") ?? "", /application\/json/)
    assert.equal((await second.json() as { error: string }).error, "Too many requests")
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test("REST wrapper only sends CORS headers to configured origins", async () => {
  const app = createHttpApp({ apiKey: "test-key", env: { HTTP_CORS_ORIGINS: "https://allowed.example" }, port: 3000 })
  const server = app.listen(0)
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`
    const allowed = await fetch(url, { headers: { Origin: "https://allowed.example" } })
    const denied = await fetch(url, { headers: { Origin: "https://denied.example" } })
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://allowed.example")
    assert.equal(denied.headers.get("access-control-allow-origin"), null)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
