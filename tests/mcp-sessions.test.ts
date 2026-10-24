import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createServer as createHttpServer } from "node:http"

import { createMcpHttpApp, type McpHttpAppOptions } from "../src/mcp-http-server.js"

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" }
const INIT = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } })
const LIST = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })

async function startApp(options: McpHttpAppOptions = {}) {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true, ...options })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const stop = async () => {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  const init = async (token: string) => {
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: `Bearer ${token}` }, body: INIT })
    assert.equal(res.status, 200)
    return res.headers.get("mcp-session-id") as string
  }
  const list = (token: string, sessionId: string) =>
    fetch(`${base}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: `Bearer ${token}`, "mcp-session-id": sessionId }, body: LIST })
  return { base, stop, init, list }
}

async function assertLiveToolsList(response: Response) {
  assert.equal(response.status, 200)
  const text = await response.text()
  const eventData = text.split("\n").find((line) => line.startsWith("data:"))
  const message = JSON.parse(eventData ? eventData.slice("data:".length).trim() : text) as {
    jsonrpc?: string
    id?: number
    result?: { tools?: unknown[] }
  }
  assert.equal(message.jsonrpc, "2.0")
  assert.equal(message.id, 2)
  assert.ok(Array.isArray(message.result?.tools), "session must return a tools/list result")
}

test("a session belongs to the token that created it: another token gets 404", async () => {
  const app = await startApp()
  try {
    const sid = await app.init("pat-alice")
    assert.equal((await app.list("pat-bob", sid)).status, 404)
    const del = await fetch(`${app.base}/mcp`, { method: "DELETE", headers: { authorization: "Bearer pat-bob", "mcp-session-id": sid } })
    assert.equal(del.status, 404, "another user must not be able to end the session")
    await assertLiveToolsList(await app.list("pat-alice", sid))
  } finally {
    await app.stop()
  }
})

test("an idle session expires and then gets 404, so the client re-initializes", async () => {
  // Margins large enough that a loaded CI machine cannot expire it early.
  const app = await startApp({ sessionIdleMs: 400 })
  try {
    const sid = await app.init("pat-alice")
    assert.equal((await app.list("pat-alice", sid)).status, 200)
    await new Promise((r) => setTimeout(r, 900))
    assert.equal((await app.list("pat-alice", sid)).status, 404)
  } finally {
    await app.stop()
  }
})

test("activity keeps a session alive", async () => {
  // Total time (4 x 250 ms) exceeds the idle limit; each step stays well under it.
  const app = await startApp({ sessionIdleMs: 600 })
  try {
    const sid = await app.init("pat-alice")
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 250))
      await assertLiveToolsList(await app.list("pat-alice", sid))
    }
  } finally {
    await app.stop()
  }
})

test("at the session cap the least recently used session is dropped", async () => {
  const app = await startApp({ maxSessions: 2 })
  try {
    const first = await app.init("pat-a")
    const second = await app.init("pat-b")
    assert.equal((await app.list("pat-a", first)).status, 200) // first is now the most recent
    const third = await app.init("pat-c")
    assert.equal((await app.list("pat-b", second)).status, 404)
    assert.equal((await app.list("pat-a", first)).status, 200)
    assert.equal((await app.list("pat-c", third)).status, 200)
    const health = (await (await fetch(`${app.base}/health`)).json()) as { activeSessions: number }
    assert.equal(health.activeSessions, 2)
  } finally {
    await app.stop()
  }
})

test('tool rate budget is shared across a caller sessions, and separated by token', async () => {
  const upstream = createHttpServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data: [] })) })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const apiBaseUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`
  const app = await startApp({ apiBaseUrl, rateLimitTools: 1 })
  const call = async (token: string, sessionId: string, id: number) => {
    const response = await fetch(`${app.base}/mcp`, { method: 'POST', headers: { ...HEADERS, authorization: `Bearer ${token}`, 'mcp-session-id': sessionId }, body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'getProjects', arguments: {} } }) })
    const text = await response.text()
    const event = text.split('\n').find(line => line.startsWith('data:'))
    return JSON.parse(event ? event.slice(5).trim() : text).result
  }
  try {
    const aliceOne = await app.init('pat-alice')
    const aliceTwo = await app.init('pat-alice')
    const bob = await app.init('pat-bob')
    assert.equal((await call('pat-alice', aliceOne, 10)).isError, undefined)
    assert.match((await call('pat-alice', aliceTwo, 11)).content[0].text, /rate limit exceeded/i)
    assert.equal((await call('pat-bob', bob, 12)).isError, undefined)
  } finally {
    await app.stop()
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()))
  }
})

test("a body is only parsed after authentication, and bad JSON gets a JSON error without a stack trace", async () => {
  const app = await startApp()
  try {
    const anonymous = await fetch(`${app.base}/mcp`, { method: "POST", headers: HEADERS, body: "{not json" })
    assert.equal(anonymous.status, 401)
    const bad = await fetch(`${app.base}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: "Bearer pat" }, body: "{not json" })
    assert.equal(bad.status, 400)
    const text = await bad.text()
    assert.doesNotMatch(text, /node_modules|at parse|<pre>/)
    assert.equal(JSON.parse(text).jsonrpc, "2.0")
  } finally {
    await app.stop()
  }
})

test("one caller opening sessions in a loop only loses its own oldest ones, never other users'", async () => {
  const app = await startApp({ maxSessions: 1000 })
  try {
    const victim = await app.init("pat-victim")
    const flood: string[] = []
    for (let i = 0; i < 25; i++) flood.push(await app.init("pat-flooder"))
    assert.equal((await app.list("pat-victim", victim)).status, 200)
    assert.equal((await app.list("pat-flooder", flood[0])).status, 404, "the flooder's oldest session goes")
    assert.equal((await app.list("pat-flooder", flood[24])).status, 200)
    const health = (await (await fetch(`${app.base}/health`)).json()) as { activeSessions: number }
    assert.equal(health.activeSessions, 21)
  } finally {
    await app.stop()
  }
})

test("an open SSE stream keeps its session alive past the idle limit; it expires after the stream closes", async () => {
  const app = await startApp({ sessionIdleMs: 400 })
  try {
    const sid = await app.init("pat-alice")
    await fetch(`${app.base}/mcp`, { method: "POST", headers: { ...HEADERS, authorization: "Bearer pat-alice", "mcp-session-id": sid }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) })
    const abort = new AbortController()
    const stream = await fetch(`${app.base}/mcp`, {
      method: "GET", signal: abort.signal, headers: { accept: "text/event-stream", authorization: "Bearer pat-alice", "mcp-session-id": sid },
    })
    assert.equal(stream.status, 200)
    await new Promise((r) => setTimeout(r, 900))
    assert.equal((await app.list("pat-alice", sid)).status, 200, "the stream counts as activity")
    abort.abort()
    await new Promise((r) => setTimeout(r, 900))
    assert.equal((await app.list("pat-alice", sid)).status, 404, "idle after the stream closed")
  } finally {
    await app.stop()
  }
})
