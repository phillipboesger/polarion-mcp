import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

// Set deployment filters before importing modules that capture them.
process.env.MCP_READ_ONLY = "true"

const { createMcpHttpApp } = await import("../src/mcp-http-server.js")

process.env.MCP_MODE = 'full'

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer pat" }
const initializeBody = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })

async function startApp() {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    base,
    async stop() {
      await closeAllSessions()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

function rpc(text: string): any {
  const data = text.split("\n").find((line) => line.startsWith("data:"))
  return JSON.parse(data ? data.slice(5).trim() : text)
}

async function initialize(base: string, path = "/mcp", extraHeaders: Record<string, string> = {}) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { ...HEADERS, ...extraHeaders }, body: initializeBody })
  const payload = rpc(await response.text())
  return { response, payload, id: response.headers.get("mcp-session-id") as string }
}

async function send(base: string, id: string, body: object, extraHeaders: Record<string, string> = {}, path = "/mcp") {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...HEADERS, "mcp-session-id": id, ...extraHeaders },
    body: JSON.stringify(body),
  })
  return { response, payload: rpc(await response.text()) }
}

async function list(base: string, id: string, extraHeaders: Record<string, string> = {}, path = "/mcp") {
  const { payload } = await send(base, id, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, extraHeaders, path)
  return payload.result.tools.map((tool: { name: string }) => tool.name)
}

test("X-MCP-Readonly narrows the session; a later header cannot lift it", async () => {
  const app = await startApp()
  try {
    const { id } = await initialize(app.base, "/mcp", { "X-MCP-Readonly": "true" })
    const ro = await list(app.base, id)
    assert.ok(ro.includes("getWorkItem") && !ro.includes("deleteWorkItems"))
    const refused = await send(app.base, id, {
      jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "deleteWorkItems", arguments: { requestBody: {} } },
    }, { "X-MCP-Readonly": "false" })
    assert.equal(refused.payload.result.isError, true)
    assert.match(refused.payload.result.content[0].text, /Unknown tool/)
  } finally {
    await app.stop()
  }
})

test("an invalid X-MCP-Readonly value is a 400 and does not change an existing session", async () => {
  const app = await startApp()
  try {
    const { id } = await initialize(app.base, "/mcp", {})
    const bad = await fetch(`${app.base}/mcp`, {
      method: "POST", headers: { ...HEADERS, "mcp-session-id": id, "X-MCP-Readonly": "sometimes" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }),
    })
    assert.equal(bad.status, 400)
    assert.match((await bad.json() as any).error.message, /X-MCP-Readonly must be true or false/)
    assert.ok((await list(app.base, id)).includes("getWorkItem"))
  } finally {
    await app.stop()
  }
})

test("X-MCP-Toolsets is ignored: it does not narrow the catalogue", async () => {
  const app = await startApp()
  try {
    const { response, id } = await initialize(app.base, "/mcp", { "X-MCP-Toolsets": "work-items" })
    assert.equal(response.status, 200)
    const names = await list(app.base, id, { "X-MCP-Toolsets": "work-itemz" })
    assert.ok(names.includes("getWorkItem") && names.includes("getLicense"))
  } finally {
    await app.stop()
  }
})

test("the /mcp/:toolsets path variant no longer exists", async () => {
  const app = await startApp()
  try {
    const response = await fetch(`${app.base}/mcp/foo`, { method: "POST", headers: HEADERS, body: initializeBody })
    assert.equal(response.status, 404)
  } finally {
    await app.stop()
  }
})
