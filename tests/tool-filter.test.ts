import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import express from "express"

// Each test file runs in its own process: configure the filter before the
// modules that read it at import time are loaded.
process.env.MCP_TOOLS = "getWorkItem, deleteWorkItems, getWorkItems, noSuchTool"
process.env.MCP_READ_ONLY = "true"
process.env.MCP_OMIT_OUTPUT_SCHEMA = "true"
const { filterTools, parseToolFilter, enabledTools } = await import("../src/tool-filter.js")
const { toolDefinitionMap } = await import("../src/tools.js")
const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
const { createRestToolsRouter } = await import("../src/rest-api.js")

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer pat" }

function parseRpc(body: string): any {
  const line = body.split("\n").find((l) => l.startsWith("data:"))
  return JSON.parse(line ? line.slice("data:".length).trim() : body)
}

async function listen(app: express.Express) {
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server }
}

test("parseToolFilter: MCP_READ_ONLY accepts 1/true/yes in any case; a set but empty MCP_TOOLS exposes nothing", () => {
  for (const v of ["1", "TRUE", "yes", "True"]) assert.equal(parseToolFilter({ MCP_READ_ONLY: v }).readOnly, true, v)
  assert.equal(parseToolFilter({ MCP_READ_ONLY: "0" }).readOnly, false)
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: "," }).allow, [])
  assert.equal(filterTools(toolDefinitionMap, parseToolFilter({ MCP_TOOLS: " , " })).tools.size, 0)
})

test("parseToolFilter: unset means no filter", () => {
  assert.deepEqual(parseToolFilter({}), { allow: undefined, readOnly: false })
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: "", MCP_READ_ONLY: "no" }), { allow: undefined, readOnly: false })
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: "a, b", MCP_READ_ONLY: "true" }), { allow: ["a", "b"], readOnly: true })
})

test("filterTools: no filter keeps every tool", () => {
  assert.equal(filterTools(toolDefinitionMap, {}).tools.size, toolDefinitionMap.size)
})

test("filterTools: read-only keeps exactly the readOnlyHint tools", () => {
  const { tools } = filterTools(toolDefinitionMap, { readOnly: true })
  assert.ok(tools.size > 0 && tools.size < toolDefinitionMap.size)
  for (const def of tools.values()) assert.equal(def.annotations?.readOnlyHint, true, def.name)
  assert.ok(!tools.has("deleteWorkItems"))
})

test("filterTools: the allowlist and read-only intersect, unknown names are reported", () => {
  const { tools, unknown } = filterTools(toolDefinitionMap, parseToolFilter(process.env))
  assert.deepEqual([...tools.keys()].sort(), ["getWorkItem", "getWorkItems"])
  assert.deepEqual(unknown, ["noSuchTool"])
  assert.deepEqual(filterTools(toolDefinitionMap, { allow: [] }).tools.size, 0)
})

test("over MCP a filtered tool is neither listed nor callable, and output schemas are left out", async () => {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true })
  const { base, server } = await listen(app)
  try {
    const init = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
    })
    const session = { ...HEADERS, "mcp-session-id": init.headers.get("mcp-session-id") as string }
    await fetch(`${base}/mcp`, { method: "POST", headers: session, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) })

    const list = parseRpc(await (await fetch(`${base}/mcp`, {
      method: "POST", headers: session, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    })).text())
    assert.deepEqual(list.result.tools.map((t: { name: string }) => t.name).sort(), ["getWorkItem", "getWorkItems"])
    for (const tool of list.result.tools) assert.equal(tool.outputSchema, undefined)

    const call = parseRpc(await (await fetch(`${base}/mcp`, {
      method: "POST", headers: session,
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "deleteWorkItems", arguments: { projectId: "p" } } }),
    })).text())
    assert.match(call.result.content[0].text, /Unknown tool/)
    assert.equal(call.result.isError, true)
  } finally {
    await closeAllSessions()
    server.close()
  }
})

test("over the REST wrapper a filtered tool is neither listed nor callable", async () => {
  const app = express()
  app.use(express.json())
  app.use(createRestToolsRouter({ authenticate: (_req, _res, next) => next(), serverUrl: () => "http://x", securityScheme: {}, unauthorizedDescription: "" }))
  const { base, server } = await listen(app)
  try {
    const list = (await (await fetch(`${base}/api/tools`)).json()) as { count: number }
    assert.equal(list.count, enabledTools.size)
    const call = await fetch(`${base}/api/tools/deleteWorkItems`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
    assert.equal(call.status, 404)
    const spec = (await (await fetch(`${base}/openapi.json`)).json()) as { paths: Record<string, unknown> }
    assert.equal(spec.paths["/api/tools/deleteWorkItems"], undefined)
  } finally {
    server.close()
  }
})
