import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

// Set deployment tool filters before importing modules that capture them.
process.env.MCP_TOOLS = "getWorkItem,getWorkItems,deleteWorkItems,getLicense"
process.env.MCP_READ_ONLY = "true"

const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
type ToolsetName = import("../src/toolsets.js").ToolsetName

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer pat" }
const initializeBody = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })

async function startApp(allowedToolsets?: ToolsetName[]) {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true, allowedToolsets })
  const server = app.listen(0)
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

test("toolset header narrows the session and later headers cannot change it; calls outside it are refused", async () => {
  const app = await startApp()
  try {
    const { response, id } = await initialize(app.base, "/mcp", { "X-MCP-Toolsets": "work-items" })
    assert.equal(response.status, 200)
    assert.deepEqual(await list(app.base, id, { "X-MCP-Toolsets": "admin" }), ["getWorkItem", "getWorkItems"])

    const outside = await send(app.base, id, {
      jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "getLicense", arguments: {} },
    }, { "X-MCP-Toolsets": "admin" })
    assert.equal(outside.payload.result.isError, true)
    assert.match(outside.payload.result.content[0].text, /Unknown tool/)

    const invalidLater = await fetch(`${app.base}/mcp`, {
      method: "POST", headers: { ...HEADERS, "mcp-session-id": id, "X-MCP-Toolsets": "work-itemz" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }),
    })
    assert.equal(invalidLater.status, 400)
    assert.match((await invalidLater.json() as any).error.message, /Valid toolsets/)
    assert.deepEqual(await list(app.base, id), ["getWorkItem", "getWorkItems"])
  } finally {
    await app.stop()
  }
})

test("deployment toolsets cannot be widened by a request header", async () => {
  const app = await startApp(["work-items"])
  try {
    const { id } = await initialize(app.base, "/mcp", { "X-MCP-Toolsets": "admin" })
    assert.deepEqual(await list(app.base, id), [])
  } finally {
    await app.stop()
  }
})

test("path toolsets and readonly header intersect with MCP_TOOLS and MCP_READ_ONLY", async () => {
  const app = await startApp()
  try {
    const { id } = await initialize(app.base, "/mcp/work-items", { "X-MCP-Readonly": "true" })
    assert.deepEqual(await list(app.base, id), ["getWorkItem", "getWorkItems"])
    const outside = await send(app.base, id, {
      jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "deleteWorkItems", arguments: { requestBody: {} } },
    })
    assert.equal(outside.payload.result.isError, true)

    const adminPath = await initialize(app.base, "/mcp/admin")
    assert.deepEqual(await list(app.base, adminPath.id), ["getLicense"])
  } finally {
    await app.stop()
  }
})

test("unknown request toolsets return 400 with valid names", async () => {
  const app = await startApp()
  try {
    const { response, payload } = await initialize(app.base, "/mcp", { "X-MCP-Toolsets": "work-itemz" })
    assert.equal(response.status, 400)
    assert.equal(payload.jsonrpc, "2.0")
    assert.equal(payload.error.code, -32602)
    assert.match(payload.error.message, /Unknown toolset.*Valid toolsets.*work-items.*documents/s)
  } finally {
    await app.stop()
  }
})
