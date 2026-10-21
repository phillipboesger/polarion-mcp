import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"

import { createMcpHttpApp } from "../src/mcp-http-server.js"
import { isRedirectAllowed, parseRedirectAllowlist } from "../src/oauth.js"

const CLAUDE = "https://claude.ai/api/mcp/auth_callback"
const SECRET = randomBytes(32).toString("base64url")

async function startApp(allowedRedirectUris?: string[]) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: SECRET,
    validateToken: async () => true,
    allowedRedirectUris,
  })
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const { port } = server.address() as AddressInfo
  const stop = async () => {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  return { base: `http://127.0.0.1:${port}`, stop }
}

function register(base: string, redirectUri: string) {
  return fetch(`${base}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Some Client", redirect_uris: [redirectUri], token_endpoint_auth_method: "none" }),
  })
}

function authorize(base: string, clientId: string, redirectUri: string) {
  const url = new URL(`${base}/authorize`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("code_challenge", createHash("sha256").update("verifier").digest("base64url"))
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("state", "s")
  return fetch(url, { redirect: "manual" })
}

test("without an allowlist any redirect URI is allowed", () => {
  assert.equal(isRedirectAllowed("https://attacker.example/cb", []), true)
  assert.deepEqual(parseRedirectAllowlist(undefined), [])
  assert.deepEqual(parseRedirectAllowlist(" , "), [])
})

test("an exact entry matches only that URI", () => {
  const list = parseRedirectAllowlist(CLAUDE)
  assert.equal(isRedirectAllowed(CLAUDE, list), true)
  assert.equal(isRedirectAllowed(`${CLAUDE}x`, list), false)
  assert.equal(isRedirectAllowed(`${CLAUDE}?next=https://attacker.example`, list), false)
  assert.equal(isRedirectAllowed("https://attacker.example/api/mcp/auth_callback", list), false)
  assert.equal(isRedirectAllowed("not a url", list), false)
})

test("a prefix entry cannot be escaped by host confusion or path traversal", () => {
  const list = parseRedirectAllowlist("https://claude.ai/api/mcp/")
  assert.equal(isRedirectAllowed(CLAUDE, list), true)
  assert.equal(isRedirectAllowed("https://claude.ai.attacker.example/api/mcp/cb", list), false)
  assert.equal(isRedirectAllowed("https://claude.ai/api/mcp/../../open-redirect", list), false)
  assert.equal(isRedirectAllowed("https://claude.ai/api/mcp/%2e%2e/%2e%2e/open-redirect", list), false)
  assert.equal(isRedirectAllowed("https://claude.ai@attacker.example/api/mcp/cb", list), false)
})

test("loopback entries allow any port (RFC 8252), other hosts do not", () => {
  const list = parseRedirectAllowlist("http://localhost/callback, http://127.0.0.1/oauth/")
  assert.equal(isRedirectAllowed("http://localhost:33418/callback", list), true)
  assert.equal(isRedirectAllowed("http://localhost:33418/other", list), false)
  assert.equal(isRedirectAllowed("http://127.0.0.1:5000/oauth/cb", list), true)
  assert.equal(isRedirectAllowed("http://localhost:5000/oauth/cb", list), false)
  assert.equal(isRedirectAllowed("https://claude.ai:8443/api/mcp/auth_callback", parseRedirectAllowlist(CLAUDE)), false)
})

test("an allowlist entry that is not an absolute URL fails at startup", () => {
  assert.throws(() => parseRedirectAllowlist("claude.ai/api/mcp/"), /not an absolute URL/)
})

test("with an allowlist, registering a foreign redirect URI is refused and an allowed one works", async () => {
  const { base, stop } = await startApp(parseRedirectAllowlist(CLAUDE))
  try {
    const refused = await register(base, "https://attacker.example/callback")
    assert.equal(refused.status, 400)
    assert.equal(((await refused.json()) as { error: string }).error, "invalid_client_metadata")
    assert.equal((await register(base, CLAUDE)).status, 201)
  } finally {
    await stop()
  }
})

test("a registration issued before the allowlist was set stops working once it is", async () => {
  const open = await startApp()
  let clientId: string
  try {
    const res = await register(open.base, "https://attacker.example/callback")
    clientId = ((await res.json()) as { client_id: string }).client_id
    assert.equal((await authorize(open.base, clientId, "https://attacker.example/callback")).status, 200)
  } finally {
    await open.stop()
  }
  const locked = await startApp(parseRedirectAllowlist(CLAUDE))
  try {
    const res = await authorize(locked.base, clientId, "https://attacker.example/callback")
    assert.notEqual(res.status, 200)
    assert.notEqual(res.status, 302, "must not redirect to the unverified URI")
  } finally {
    await locked.stop()
  }
})

test("the login page names the host the login hands its result to", async () => {
  const { base, stop } = await startApp()
  try {
    const res = await register(base, "https://attacker.example/callback")
    const { client_id } = (await res.json()) as { client_id: string }
    const html = await (await authorize(base, client_id, "https://attacker.example/callback")).text()
    assert.match(html, /sends you back to <strong>attacker\.example<\/strong>/)
  } finally {
    await stop()
  }
})

test("a registration without any redirect URI is refused, with or without an allowlist", async () => {
  for (const allowlist of [undefined, [CLAUDE]]) {
    const { base, stop } = await startApp(allowlist)
    try {
      const res = await fetch(`${base}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_name: "No callback", redirect_uris: [], token_endpoint_auth_method: "none" }),
      })
      assert.equal(res.status, 400)
    } finally {
      await stop()
    }
  }
})
