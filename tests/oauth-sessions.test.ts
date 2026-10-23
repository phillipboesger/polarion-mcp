import test, { mock } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"

import { createMcpHttpApp, patFailureRateLimitKey } from "../src/mcp-http-server.js"
import type { TokenCheck } from "../src/oauth.js"

const PUBLIC_URL = "http://127.0.0.1"
const SECRET = "a-test-token-secret-that-is-long-enough-0123456789"
const REDIRECT = "https://client.example/callback"

/** Polarion stand-in: which PATs it accepts, and whether it is reachable at all. */
const polarion = { accepted: new Set<string>(), forbidden: new Set<string>(), reachable: true }

async function validateToken(token: string): Promise<TokenCheck> {
  if (!polarion.reachable) return "unavailable"
  if (polarion.forbidden.has(token)) return "forbidden"
  return polarion.accepted.has(token)
}

/** Starts the app with the OAuth login enabled, sealing tokens with `tokenSecret`. */
async function startApp(tokenSecret = SECRET) {
  const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL(PUBLIC_URL), validateToken, tokenSecret })
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

async function register(base: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${base}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Test Client", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", ...body }),
  })
  assert.equal(res.status, 201)
  return (await res.json()) as { client_id: string; client_secret?: string }
}

/** Runs register → authorize → login → code, returning what the token call needs. */
async function loginForCode(base: string, pat: string, client?: { client_id: string; client_secret?: string }) {
  const registered = client ?? (await register(base))
  const verifier = randomBytes(32).toString("base64url")
  const authorize = new URL(`${base}/authorize`)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", registered.client_id)
  authorize.searchParams.set("redirect_uri", REDIRECT)
  authorize.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"))
  authorize.searchParams.set("code_challenge_method", "S256")
  authorize.searchParams.set("state", "s")
  authorize.searchParams.set("resource", `${PUBLIC_URL}/mcp`)
  const page = await fetch(authorize, { redirect: "manual" })
  assert.equal(page.status, 200)
  const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
  const submitted = await fetch(`${base}/polarion-login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login_id: loginId, token: pat }),
    redirect: "manual",
  })
  assert.equal(submitted.status, 302)
  const code = new URL(submitted.headers.get("location") as string).searchParams.get("code") as string
  return { client: registered, code, verifier }
}

type Tokens = { access_token: string; refresh_token: string; expires_in: number }

async function login(base: string, pat: string) {
  const { client, code, verifier } = await loginForCode(base, pat)
  const res = await fetch(`${base}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: client.client_id, code_verifier: verifier, redirect_uri: REDIRECT }),
  })
  assert.equal(res.status, 200)
  const tokens = (await res.json()) as Tokens
  assert.equal(tokens.expires_in, 60 * 60, "access tokens must retain the one-hour TTL")
  assert.ok(tokens.refresh_token, "successful exchange must issue a refresh token")
  return { client, tokens }
}

function refresh(base: string, clientId: string, refreshToken: string) {
  return fetch(`${base}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }),
  })
}

function initialize(base: string, bearer: string) {
  return fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "node-test", version: "1.0" } },
    }),
  })
}

function freshPat() {
  const pat = `pat-${randomBytes(8).toString("hex")}`
  polarion.accepted.add(pat)
  return pat
}

test("a login survives a server restart: access token, refresh token and client registration stay valid", async () => {
  polarion.reachable = true
  const pat = freshPat()
  const first = await startApp()
  const { client, tokens } = await login(first.base, pat)
  await first.stop()

  const second = await startApp()
  try {
    assert.equal((await initialize(second.base, tokens.access_token)).status, 200)
    const refreshed = await refresh(second.base, client.client_id, tokens.refresh_token)
    assert.equal(refreshed.status, 200)
    // ChatGPT never re-registers, so the old client id must still work for a new login.
    await loginForCode(second.base, pat, client)
  } finally {
    await second.stop()
  }
})

test("the Polarion PAT never appears in any token handed to the client", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, tokens } = await login(base, pat)
    for (const value of [tokens.access_token, tokens.refresh_token, client.client_id]) {
      assert.ok(!value.includes(pat))
      assert.ok(!Buffer.from(value.split(".").pop() as string, "base64url").toString("latin1").includes(pat))
    }
  } finally {
    await stop()
  }
})

test("an expired access token gets a 401 invalid_token challenge, and the refresh token silently renews it", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  mock.timers.enable({ apis: ["Date"], now: Date.now() })
  try {
    const { client, tokens } = await login(base, pat)
    mock.timers.tick(9 * 60 * 60 * 1000)

    const stale = await initialize(base, tokens.access_token)
    assert.equal(stale.status, 401)
    const challenge = stale.headers.get("www-authenticate") ?? ""
    assert.match(challenge, /error="invalid_token"/)
    assert.match(challenge, /resource_metadata="/)

    const refreshed = await refresh(base, client.client_id, tokens.refresh_token)
    assert.equal(refreshed.status, 200)
    const renewed = (await refreshed.json()) as Tokens
    assert.equal((await initialize(base, renewed.access_token)).status, 200)
  } finally {
    mock.timers.reset()
    await stop()
  }
})

test("a refresh token keeps working long after the old 8 h limit, as long as Polarion accepts the PAT", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  mock.timers.enable({ apis: ["Date"], now: Date.now() })
  try {
    const { client, tokens } = await login(base, pat)
    mock.timers.tick(60 * 24 * 60 * 60 * 1000)
    assert.equal((await refresh(base, client.client_id, tokens.refresh_token)).status, 200)
  } finally {
    mock.timers.reset()
    await stop()
  }
})

test("a PAT revoked in Polarion ends the session at the next refresh with invalid_grant", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, tokens } = await login(base, pat)
    polarion.accepted.delete(pat)
    const res = await refresh(base, client.client_id, tokens.refresh_token)
    assert.equal(res.status, 400)
    assert.equal(((await res.json()) as { error: string }).error, "invalid_grant")
  } finally {
    await stop()
  }
})

test("an unreachable Polarion does not end the session: refresh fails temporarily, not with invalid_grant", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, tokens } = await login(base, pat)
    polarion.reachable = false
    const res = await refresh(base, client.client_id, tokens.refresh_token)
    assert.notEqual(((await res.json()) as { error: string }).error, "invalid_grant")
    assert.ok(res.status >= 500)
    polarion.reachable = true
    assert.equal((await refresh(base, client.client_id, tokens.refresh_token)).status, 200)
  } finally {
    polarion.reachable = true
    await stop()
  }
})

test("tokens sealed with a different secret, or tampered with, are rejected", async () => {
  const pat = freshPat()
  const first = await startApp()
  const { client, tokens } = await login(first.base, pat)
  const parts = tokens.access_token.split(".")
  const body = Buffer.from(parts[2], "base64url")
  body[body.length - 1] ^= 1
  const tampered = [parts[0], parts[1], body.toString("base64url")].join(".")
  try {
    const res = await initialize(first.base, tampered)
    assert.equal(res.status, 401)
    assert.match(res.headers.get("www-authenticate") ?? "", /error="invalid_token"/)
  } finally {
    await first.stop()
  }

  const rotated = await startApp("another-secret-that-is-also-long-enough-9876543210")
  try {
    assert.equal((await initialize(rotated.base, tokens.access_token)).status, 401)
    const res = await refresh(rotated.base, client.client_id, tokens.refresh_token)
    assert.equal(res.status, 400)
  } finally {
    await rotated.stop()
  }
})

test("an access token cannot be used as a refresh token, and a refresh token cannot call /mcp", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, tokens } = await login(base, pat)
    assert.equal((await refresh(base, client.client_id, tokens.access_token)).status, 400)
    assert.equal((await initialize(base, tokens.refresh_token)).status, 401)
  } finally {
    await stop()
  }
})

test("a refresh token is bound to the client it was issued to", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { tokens } = await login(base, pat)
    const other = await register(base)
    assert.equal((await refresh(base, other.client_id, tokens.refresh_token)).status, 400)
  } finally {
    await stop()
  }
})

test("an authorization code is single-use", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, code, verifier } = await loginForCode(base, pat)
    const exchange = () =>
      fetch(`${base}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: client.client_id, code_verifier: verifier, redirect_uri: REDIRECT }),
      })
    assert.equal((await exchange()).status, 200)
    const again = await exchange()
    assert.equal(again.status, 400)
    assert.equal(((await again.json()) as { error: string }).error, "invalid_grant")
  } finally {
    await stop()
  }
})

test("a confidential client may authenticate at /token with HTTP Basic", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const client = await register(base, { token_endpoint_auth_method: "client_secret_basic" })
    assert.ok(client.client_secret)
    const { code, verifier } = await loginForCode(base, pat, client)
    const res = await fetch(`${base}/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(`${client.client_id}:${client.client_secret}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: REDIRECT }),
    })
    assert.equal(res.status, 200)
  } finally {
    await stop()
  }
})

test("a confidential client with a wrong secret is refused", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const client = await register(base, { token_endpoint_auth_method: "client_secret_post" })
    const { code, verifier } = await loginForCode(base, pat, client)
    const res = await fetch(`${base}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: REDIRECT, client_id: client.client_id, client_secret: "wrong" }),
    })
    assert.equal(res.status, 400)
    assert.equal(((await res.json()) as { error: string }).error, "invalid_client")
  } finally {
    await stop()
  }
})

test("protected-resource metadata is also served at the root path ChatGPT probes first", async () => {
  const { base, stop } = await startApp()
  try {
    const root = await fetch(`${base}/.well-known/oauth-protected-resource`)
    const scoped = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)
    assert.equal(root.status, 200)
    assert.deepEqual(await root.json(), await scoped.json())
  } finally {
    await stop()
  }
})

test("a bearer that is not one of this server's tokens is checked with Polarion and then used as a PAT", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    assert.equal((await initialize(base, freshPat())).status, 200)
  } finally {
    await stop()
  }
})

test("a made-up bearer cannot open a session: Polarion's verdict decides (401 unknown, 403 forbidden, 503 unreachable)", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    assert.equal((await initialize(base, "made-up-token")).status, 401)
    polarion.forbidden.add("forbidden-pat")
    assert.equal((await initialize(base, "forbidden-pat")).status, 403)
    polarion.reachable = false
    assert.equal((await initialize(base, "any-token")).status, 503)
    const health = (await (await fetch(`${base}/health`)).json()) as { activeSessions: number }
    assert.equal(health.activeSessions, 0)
  } finally {
    polarion.reachable = true
    await stop()
  }
})

test("a flood of made-up bearers is cut off by the failure limiter, valid PATs are not counted", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    const good = freshPat()
    for (let i = 0; i < 60; i++) assert.equal((await initialize(base, good)).status, 200)
    const statuses: number[] = []
    for (let i = 0; i < 55; i++) statuses.push((await initialize(base, "garbage-pat")).status)
    assert.equal(statuses.filter(status => status === 401).length, 50)
    assert.equal(statuses.at(-1), 429)
  } finally {
    await stop()
  }
})

test("six OAuth clients behind one IP can each refresh without sharing a limiter bucket", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    const users = await Promise.all(Array.from({ length: 6 }, async () => login(base, freshPat())))
    const responses = await Promise.all(users.flatMap(({ client, tokens }) =>
      Array.from({ length: 9 }, () => refresh(base, client.client_id, tokens.refresh_token))))
    assert.ok(responses.every(response => response.status === 200), "refresh limits should be scoped to each OAuth client")
  } finally {
    await stop()
  }
})

test("failed PAT attempts for one caller do not block another valid caller", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    for (let i = 0; i < 51; i++) assert.equal((await initialize(base, "bad-user-a-pat")).status, i < 50 ? 401 : 429)
    const validPat = freshPat()
    const response = await initialize(base, validPat)
    assert.equal(response.status, 200)
  } finally {
    await stop()
  }
})

test("the per-IP failed-PAT ceiling caps token spraying and returns JSON-RPC", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    const cachedPat = freshPat()
    assert.equal((await initialize(base, cachedPat)).status, 200)
    let response: Response | undefined
    for (let i = 0; i < 501; i++) response = await initialize(base, `spray-${i}`)
    assert.equal(response?.status, 429)
    const body = (await response?.json()) as { jsonrpc?: string; error?: { code?: number } }
    assert.equal(body.jsonrpc, "2.0")
    assert.equal(body.error?.code, -32000)
    assert.equal((await initialize(base, cachedPat)).status, 200, "a cached valid PAT must bypass both failure limiters")
  } finally {
    await stop()
  }
})

test("failed-PAT limiter keys contain only an IP and the truncated token hash", () => {
  const pat = "secret-pat-must-not-appear-in-rate-limit-key"
  const key = patFailureRateLimitKey("203.0.113.7", pat)
  assert.match(key, /^203\.0\.113\.7:[a-f0-9]{16}$/)
  assert.equal(key.includes(pat), false)
})

test("a valid user with stale session ids is never counted as a failure and never locked out", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    const pat = freshPat()
    const stale = (n: number) =>
      fetch(`${base}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${pat}`, "mcp-session-id": `gone-${n}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: n, method: "ping" }),
      })
    for (let i = 0; i < 70; i++) assert.equal((await stale(i)).status, 404)
    assert.equal((await initialize(base, pat)).status, 200)
  } finally {
    await stop()
  }
})

test("a valid PAT is checked once per minute, not on every request of its session", async () => {
  polarion.reachable = true
  let checks = 0
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => { checks++; return true } })
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const init = await initialize(base, "cached-pat")
    const sid = init.headers.get("mcp-session-id") as string
    for (let i = 0; i < 3; i++) {
      await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer cached-pat", "mcp-session-id": sid },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2 + i, method: "ping" }),
      })
    }
    assert.equal(checks, 1)
  } finally {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test("an authorization code is burned by a wrong PKCE verifier", async () => {
  polarion.reachable = true
  const { base, stop } = await startApp()
  try {
    const { client, code, verifier } = await loginForCode(base, freshPat())
    const exchange = (codeVerifier: string) =>
      fetch(`${base}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: client.client_id, code_verifier: codeVerifier, redirect_uri: REDIRECT }),
      })
    assert.equal((await exchange("x".repeat(60))).status, 400)
    assert.equal((await exchange(verifier)).status, 400)
  } finally {
    await stop()
  }
})

test("open login pages are capped: the oldest is dropped once the limit is reached", async () => {
  const { PolarionOAuthProvider } = await import("../src/oauth.js")
  const { Sealer } = await import("../src/sealed.js")
  const provider = new PolarionOAuthProvider("https://polarion.example", new Sealer(SECRET), validateToken)
  const ids: string[] = []
  const res = { set() {}, send(html: string) { ids.push(/name="login_id" value="([^"]+)"/.exec(html)?.[1] as string) } }
  for (let i = 0; i <= 10_000; i++) provider.authorizeGpt("gpt", "https://chatgpt.com/aip/g-x/oauth/callback", "s", res as never)
  const pat = freshPat()
  const oldest = await provider.completeLogin(ids[0], pat)
  assert.equal(oldest.ok, false)
  const newest = await provider.completeLogin(ids[ids.length - 1], pat)
  assert.equal(newest.ok, true)
})

test("the login form is rate-limited, since every attempt checks a PAT against Polarion", async () => {
  const { base, stop } = await startApp()
  try {
    let last = 0
    for (let i = 0; i < 51; i++) {
      last = (await fetch(`${base}/polarion-login`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ login_id: "x", token: "guess" }),
      })).status
    }
    assert.equal(last, 429)
  } finally {
    await stop()
  }
})

/** Opens the login page for a fresh client and submits `token`, returning the raw response. */
async function submitLogin(base: string, token: string) {
  const { client_id } = await register(base)
  const authorize = new URL(`${base}/authorize`)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", client_id)
  authorize.searchParams.set("redirect_uri", REDIRECT)
  authorize.searchParams.set("code_challenge", createHash("sha256").update("v").digest("base64url"))
  authorize.searchParams.set("code_challenge_method", "S256")
  const page = await fetch(authorize, { redirect: "manual" })
  const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
  return fetch(`${base}/polarion-login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login_id: loginId, token }),
    redirect: "manual",
  })
}

test("a token Polarion knows but denies (403) gets its own message, not 'did not accept'", async () => {
  const pat = `pat-${randomBytes(8).toString("hex")}`
  polarion.forbidden.add(pat)
  const { base, stop } = await startApp()
  try {
    const res = await submitLogin(base, pat)
    assert.equal(res.status, 400)
    const html = await res.text()
    assert.match(html, /HTTP 403/)
    assert.match(html, /administrator/)
    assert.doesNotMatch(html, /did not accept/)
  } finally {
    await stop()
  }
})

test("whitespace and line breaks picked up while copying a PAT are removed, not only at the edges", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const broken = ` ${pat.slice(0, 6)}\r\n${pat.slice(6, 10)} ${pat.slice(10)}\n`
    assert.equal((await submitLogin(base, broken)).status, 302)
  } finally {
    await stop()
  }
})

test("a PAT that turns 403 ends the session at the next refresh with invalid_grant", async () => {
  const pat = freshPat()
  const { base, stop } = await startApp()
  try {
    const { client, tokens } = await login(base, pat)
    polarion.forbidden.add(pat)
    const res = await refresh(base, client.client_id, tokens.refresh_token)
    assert.equal(res.status, 400)
    assert.equal(((await res.json()) as { error: string }).error, "invalid_grant")
  } finally {
    await stop()
  }
})
