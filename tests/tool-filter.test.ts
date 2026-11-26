import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import express from "express"

// Each test file runs in its own process: configure the filter before the
// modules that read it at import time are loaded.
process.env.MCP_READ_ONLY = "true"
process.env.MCP_MODE = "full"
const { filterTools, parseToolFilter, parseFlag, enabledTools } = await import("../src/tool-filter.js")
const { toolDefinitionMap } = await import("../src/tools.js")
const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
const { createRestToolsRouter } = await import("../src/rest-api.js")

const HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer pat" }

function parseRpc(body: string): any {
  const line = body.split("\n").find((l) => l.startsWith("data:"))
  return JSON.parse(line ? line.slice("data:".length).trim() : body)
}

async function listen(app: express.Express) {
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server }
}

test("parseToolFilter: flags accept 1/true/yes/on in any case, and a value that is neither on nor off is an error, never a silent no-op", () => {
  for (const v of ["1", "TRUE", "yes", "True", "on", " ON "]) assert.equal(parseToolFilter({ MCP_READ_ONLY: v }).readOnly, true, v)
  for (const v of ["0", "false", "No", "off", "", "  "]) assert.equal(parseToolFilter({ MCP_READ_ONLY: v }).readOnly, false, v)
  for (const v of ["enabled", "y", "2", "read-only"]) assert.throws(() => parseToolFilter({ MCP_READ_ONLY: v }), /MCP_READ_ONLY must be true or false/, v)
  assert.equal(parseFlag("MCP_LOG", "1"), true)
  assert.throws(() => parseFlag("MCP_LOG", "maybe"), /MCP_LOG/)
})

test("parseToolFilter: parses the allowlist", () => {
  assert.deepEqual(parseToolFilter({}), { readOnly: false })
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: "a, b", MCP_READ_ONLY: "true" }), { readOnly: true, allow: new Set(["a", "b"]) })
})

test("filterTools: no filter keeps every tool", () => {
  assert.equal(filterTools(toolDefinitionMap, {}).size, toolDefinitionMap.size)
})

test("filterTools: read-only keeps exactly the readOnlyHint tools", () => {
  const tools = filterTools(toolDefinitionMap, { readOnly: true })
  assert.ok(tools.size > 0 && tools.size < toolDefinitionMap.size)
  for (const def of tools.values()) assert.equal(def.annotations?.readOnlyHint, true, def.name)
  assert.ok(!tools.has("deleteWorkItems"))
})

test("filterTools treats missing annotations as non-read-only", () => {
  const readOnly = [...toolDefinitionMap.values()].find((def) => def.annotations?.readOnlyHint === true)
  const write = [...toolDefinitionMap.values()].find((def) => def.annotations?.readOnlyHint !== true)
  assert.ok(readOnly && write, "generated tools should include read and write definitions")
  const unannotated = { ...readOnly, annotations: undefined }
  const fixture = new Map([
    ["reader", readOnly],
    ["writer", write],
    ["unannotated", unannotated],
  ])

  const filtered = filterTools(fixture, { readOnly: true })
  assert.deepEqual([...filtered.keys()], ["reader"])
})

test("parseToolFilter trims flags", () => {
  assert.equal(parseFlag("FLAG", "  YeS  "), true)
  assert.equal(parseFlag("FLAG", "  OFF  "), false)
  for (const value of ["enabled-on", "maybeon", "off-ish", "disabled-off"]) {
    assert.throws(() => parseFlag("FLAG", value), /must be true or false/, value)
  }
})

test("over MCP with MCP_READ_ONLY a write tool is neither listed nor callable", async () => {
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
    const names = list.result.tools.map((t: { name: string }) => t.name)
    assert.ok(names.includes("getWorkItem") && !names.includes("deleteWorkItems"))

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

test("startup fails loudly on an invalid flag and ignores removed variables", async () => {
  const { spawnSync } = await import("node:child_process")
  const load = (env: Record<string, string>) =>
    spawnSync(process.execPath, ["-e", "import('./build-tests/src/server.js').then(m => { m.createPolarionServer(); console.log('1') })"], {
      env: { ...process.env, MCP_TOOLS: "", MCP_READ_ONLY: "", MCP_MODE: "full", ...env },
      encoding: "utf8",
    })
  const badFlag = load({ MCP_READ_ONLY: "on-ish" })
  assert.notEqual(badFlag.status, 0)
  assert.match(badFlag.stderr, /MCP_READ_ONLY must be true or false/)
  const removed = load({ MCP_TOOLS: "getWorkItem" })
  assert.equal(removed.status, 0)
  assert.equal(removed.stdout.trim(), "1")
})
