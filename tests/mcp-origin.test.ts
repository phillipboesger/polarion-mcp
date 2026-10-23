import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

import { createMcpHttpApp } from "../src/mcp-http-server.js"

const INIT_BODY = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "origin-test", version: "1" } },
}

async function startApp(allowedOrigins?: string[]) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: "a-secret-long-enough-for-tests-0123456789",
    validateToken: async () => true,
    allowedOrigins,
  } as Parameters<typeof createMcpHttpApp>[0])
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  return {
    base: `http://127.0.0.1:${port}`,
    stop: async () => {
      await closeAllSessions()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

test("an unlisted Origin is refused on /mcp", async () => {
  const { base, stop } = await startApp(["https://trusted.example"])
  try {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { origin: "https://evil.example", authorization: "Bearer pat", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 403)
  } finally {
    await stop()
  }
})

test("an allowed Origin gets CORS access and the MCP response headers are exposed", async () => {
  const origin = "https://trusted.example"
  const { base, stop } = await startApp([origin])
  try {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 401)
    assert.equal(res.headers.get("access-control-allow-origin"), origin)
    const exposed = res.headers.get("access-control-expose-headers")?.toLowerCase().split(/,\s*/) ?? []
    assert.ok(exposed.includes("mcp-session-id"))
    assert.ok(exposed.includes("mcp-protocol-version"))
    assert.ok(exposed.includes("www-authenticate"))
  } finally {
    await stop()
  }
})

test("allowed origins get a 204 preflight on /mcp and OAuth endpoints", async () => {
  const origin = "https://trusted.example"
  const { base, stop } = await startApp([origin])
  try {
    for (const path of ["/mcp", "/token"]) {
      const res = await fetch(`${base}${path}`, {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization, content-type, mcp-session-id, mcp-protocol-version",
        },
      })
      assert.equal(res.status, 204, path)
      assert.equal(res.headers.get("access-control-allow-origin"), origin, path)
    }
    const metadata = await fetch(`${base}/.well-known/oauth-authorization-server`, { headers: { origin } })
    assert.equal(metadata.status, 200)
    assert.equal(metadata.headers.get("access-control-allow-origin"), origin)
  } finally {
    await stop()
  }
})

test("requests without Origin remain allowed for non-browser MCP clients", async () => {
  const { base, stop } = await startApp(["https://trusted.example"])
  try {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { authorization: "Bearer pat", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("access-control-allow-origin"), null)
  } finally {
    await stop()
  }
})

test("Claude.ai and ChatGPT browser origins remain allowed by default", async () => {
  const { base, stop } = await startApp()
  try {
    for (const origin of ["https://claude.ai", "https://chatgpt.com", "https://chat.openai.com"]) {
      const res = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { origin, "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify(INIT_BODY),
      })
      assert.equal(res.status, 401, origin)
      assert.equal(res.headers.get("access-control-allow-origin"), origin)
    }
  } finally {
    await stop()
  }
})
