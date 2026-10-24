import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"

import { createMcpHttpApp, parseTrustProxy } from "../src/mcp-http-server.js"

/** Starts the app with the OAuth login (and so its rate-limited login form) enabled. */
async function startApp(trustProxy?: string | number) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    validateToken: async () => false,
    trustProxy,
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const { port } = server.address() as AddressInfo
  const stop = async () => {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  return { base: `http://127.0.0.1:${port}`, stop }
}

/** Posts to the login form 51 times (one over its limit) as one forwarded client, then once as another. */
async function exhaustLoginLimit(base: string) {
  const post = (forwardedFor: string) =>
    fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": forwardedFor },
      body: "login_id=none&token=x",
    }).then((r) => r.status)
  for (let i = 0; i < 50; i++) await post("203.0.113.1")
  return { sameClient: await post("203.0.113.1"), otherClient: await post("203.0.113.2") }
}

test("behind a trusted proxy the login rate limit counts each forwarded client separately", async () => {
  const { base, stop } = await startApp("loopback")
  try {
    const { sameClient, otherClient } = await exhaustLoginLimit(base)
    assert.equal(sameClient, 429)
    assert.equal(otherClient, 400, "a different client must not inherit the first one's limit")
  } finally {
    await stop()
  }
})

test("without trust proxy every request shares the proxy's counter", async () => {
  const { base, stop } = await startApp()
  try {
    const { otherClient } = await exhaustLoginLimit(base)
    assert.equal(otherClient, 429)
  } finally {
    await stop()
  }
})

test("parseTrustProxy accepts hop counts and address lists, refuses the permissive true", () => {
  assert.equal(parseTrustProxy(undefined), undefined)
  assert.equal(parseTrustProxy(""), undefined)
  assert.equal(parseTrustProxy(" false "), undefined)
  assert.equal(parseTrustProxy("1"), 1)
  assert.equal(parseTrustProxy("loopback"), "loopback")
  assert.equal(parseTrustProxy("10.0.0.1, 10.0.0.2"), "10.0.0.1, 10.0.0.2")
  assert.throws(() => parseTrustProxy("true"), /X-Forwarded-For/)
})

test("MCP_PUBLIC_URL with a path is refused at startup instead of silently breaking the OAuth URLs", async () => {
  const { parsePublicUrl } = await import("../src/mcp-http-server.js")
  assert.equal(parsePublicUrl(undefined), undefined)
  assert.equal(parsePublicUrl("https://mcp.example.com")?.href, "https://mcp.example.com/")
  assert.equal(parsePublicUrl("https://mcp.example.com/")?.href, "https://mcp.example.com/")
  assert.throws(() => parsePublicUrl("https://host.example/pmcp/"), /path/)
})
