import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

import { createMcpHttpApp } from "../src/mcp-http-server.js"

const TOKEN = "test-bearer-token"

const INIT_BODY = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "node-test", version: "1.0" },
  },
}

const MCP_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  // The Streamable HTTP transport requires the client to accept SSE.
  accept: "application/json, text/event-stream",
}

/**
 * Starts the MCP HTTP app on an ephemeral port and returns its base URL plus
 * teardown helpers.
 */
async function startApp() {
  const { app, closeAllSessions } = createMcpHttpApp({ token: TOKEN })
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`
  const stop = async () => {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  return { base, stop }
}

/** Extracts the first JSON-RPC payload from a Streamable HTTP (SSE or JSON) response body. */
function parseRpc(body: string): any {
  const line = body.split("\n").find((l) => l.startsWith("data:"))
  return JSON.parse(line ? line.slice("data:".length).trim() : body)
}

test("health endpoint reports the streamable-http transport without auth", async () => {
  const { base, stop } = await startApp()
  try {
    const res = await fetch(`${base}/health`)
    assert.equal(res.status, 200)
    const body = await res.json() as { status: string; transport: string }
    assert.equal(body.status, "ok")
    assert.equal(body.transport, "streamable-http")
  } finally {
    await stop()
  }
})

test("POST /mcp without a Bearer token is rejected with 401", async () => {
  const { base, stop } = await startApp()
  try {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: MCP_HEADERS,
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 401)
  } finally {
    await stop()
  }
})

test("initialize establishes a session and tools/list returns the generated tools", async () => {
  const { base, stop } = await startApp()
  try {
    const initRes = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...MCP_HEADERS, authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(initRes.status, 200)

    const sessionId = initRes.headers.get("mcp-session-id")
    assert.ok(sessionId, "expected an mcp-session-id response header")

    const initPayload = parseRpc(await initRes.text())
    assert.equal(initPayload.result.serverInfo.name, "polarion-rest-api")

    const sessionHeaders = {
      ...MCP_HEADERS,
      authorization: `Bearer ${TOKEN}`,
      "mcp-session-id": sessionId as string,
    }

    await fetch(`${base}/mcp`, {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    })

    const listRes = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    })
    assert.equal(listRes.status, 200)

    const listPayload = parseRpc(await listRes.text())
    assert.ok(Array.isArray(listPayload.result.tools), "tools/list should return an array")
    assert.ok(listPayload.result.tools.length > 100, "expected the full generated tool set")
  } finally {
    await stop()
  }
})
