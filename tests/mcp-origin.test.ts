import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

import { createMcpHttpApp, startMcpHttpServer, tokenRateLimitKey } from "../src/mcp-http-server.js"
import { tokenScope } from "../src/config.js"

const INIT_BODY = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "origin-test", version: "1" } },
}

async function startApp(allowedOrigins?: string[], trustProxy?: string | number, allowedHosts?: string[]) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: "a-secret-long-enough-for-tests-0123456789",
    validateToken: async () => true,
    allowedOrigins,
    trustProxy,
    allowedHosts,
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

test("uppercase /MCP does not bypass Origin rejection", async () => {
  const { base, stop } = await startApp(["https://trusted.example"])
  try {
    const res = await fetch(`${base}/MCP`, {
      method: "POST",
      headers: { origin: "https://evil.example", authorization: "Bearer pat", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 403)
  } finally {
    await stop()
  }
})

test("uppercase /Token does not bypass Origin rejection or leak wildcard CORS", async () => {
  const { base, stop } = await startApp(["https://trusted.example"])
  try {
    const res = await fetch(`${base}/Token`, {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=authorization_code&client_id=victim&code=bad",
    })
    assert.equal(res.status, 403)
    assert.equal(res.headers.get("access-control-allow-origin"), null)
  } finally {
    await stop()
  }
})

test("/mcp with a trailing slash remains inside the Origin policy", async () => {
  const { base, stop } = await startApp(["https://trusted.example"])
  try {
    const res = await fetch(`${base}/mcp/`, {
      method: "POST",
      headers: { origin: "https://evil.example", authorization: "Bearer pat", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(INIT_BODY),
    })
    assert.equal(res.status, 403)
  } finally {
    await stop()
  }
})

test("the configured public URL origin can submit same-origin OAuth forms", async () => {
  const { base, stop } = await startApp()
  try {
    const origin = "http://127.0.0.1"
    const res = await fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { origin, "content-type": "application/x-www-form-urlencoded" },
      body: "login_id=none&token=pat",
    })
    assert.notEqual(res.status, 403, origin)
    assert.equal(res.headers.get("access-control-allow-origin"), origin)
  } finally {
    await stop()
  }
})

test("an explicitly configured request host origin can submit the OAuth login form", async () => {
  const hosts: string[] = []
  const { base, stop } = await startApp(undefined, undefined, hosts)
  try {
    hosts.push(new URL(base).host)
    const res = await fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/x-www-form-urlencoded" },
      body: "login_id=none&token=pat",
    })
    assert.notEqual(res.status, 403, await res.text())
    assert.equal(res.headers.get("access-control-allow-origin"), base)
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

test("GPT token limits are isolated by trusted client IP and still cap one IP", async () => {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    gptClient: { clientId: "gpt-client", clientSecret: "gpt-secret" },
    validateToken: async () => true,
    trustProxy: "loopback",
  })
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`
  const post = (ip: string) => fetch(`${base}/gpt/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip },
    body: "grant_type=authorization_code&client_id=gpt-client&client_secret=gpt-secret&code=bad&redirect_uri=https%3A%2F%2Fchatgpt.com%2Faip%2Fg-1%2Foauth%2Fcallback",
  })
  try {
    let sameIpResponse: Response | undefined
    for (let i = 0; i < 51; i++) sameIpResponse = await post("203.0.113.1")
    assert.equal(sameIpResponse?.status, 429)
    assert.equal((await post("203.0.113.2")).status, 400)
  } finally {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test("OAuth token rate-limit keys hash IP and client id into a fixed-length value", () => {
  const short = tokenRateLimitKey("203.0.113.1", "client-a")
  const long = tokenRateLimitKey("203.0.113.1", "x".repeat(100_000))
  assert.equal(short.length, 64)
  assert.equal(long.length, short.length)
  assert.ok(!long.includes("x".repeat(64)))
})

test("tokenScope uses a 128-bit in-memory cache identifier", () => {
  assert.equal(tokenScope("polarion-pat").length, 32)
  assert.equal(tokenScope("polarion-pat"), tokenScope("polarion-pat"))
  assert.notEqual(tokenScope("polarion-pat"), tokenScope("another-pat"))
})

test("distinct OAuth client ids from one IP hit the per-IP token ceiling", async () => {
  const { base, stop } = await startApp(undefined, "loopback")
  try {
    const post = (clientId: string) => fetch(`${base}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.9" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code: "bad" }),
    })
    let response: Response | undefined
    for (let i = 0; i < 501; i++) response = await post(`client-${i}`)
    assert.equal(response?.status, 429)
  } finally {
    await stop()
  }
})

test("public OAuth startup warns when no trusted proxy is configured", async () => {
  const envKeys = ["MCP_HTTP_PORT", "MCP_HTTP_HOST", "MCP_PUBLIC_URL", "MCP_TOKEN_SECRET", "MCP_ALLOWED_REDIRECT_PREFIXES", "TRUST_PROXY"] as const
  const previous = new Map(envKeys.map(key => [key, process.env[key]]))
  const warnings: string[] = []
  const originalLog = console.log
  let server: ReturnType<typeof startMcpHttpServer> | undefined
  try {
    process.env.MCP_HTTP_PORT = "0"
    process.env.MCP_HTTP_HOST = "127.0.0.1"
    process.env.MCP_PUBLIC_URL = "https://mcp.example"
    process.env.MCP_TOKEN_SECRET = "a-secret-long-enough-for-startup-warning-test"
    process.env.MCP_ALLOWED_REDIRECT_PREFIXES = "https://claude.ai/api/mcp/auth_callback"
    delete process.env.TRUST_PROXY
    console.log = () => undefined
    server = startMcpHttpServer({ logger: { warn: message => warnings.push(message) } })
    await new Promise<void>((resolve) => server?.once("listening", resolve))
    assert.ok(warnings.some(message => /shared IP|shared egress|TRUST_PROXY/i.test(message)))
  } finally {
    console.log = originalLog
    if (server?.listening) await new Promise<void>((resolve) => server?.close(() => resolve()))
    for (const key of envKeys) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
