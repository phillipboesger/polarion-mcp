import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"

import { createMcpHttpApp } from "../src/mcp-http-server.js"

const PUBLIC_URL = "http://127.0.0.1"
const VALID_PAT = "a-real-looking-polarion-pat"

/** Starts the app with the OAuth login enabled and a stubbed Polarion check. */
async function startApp() {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL(PUBLIC_URL),
    validateToken: async (token) => token === VALID_PAT,
  })
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

/** Registers a client and opens the login page, returning its login_id. */
async function beginLogin(base: string) {
  const registration = await fetch(`${base}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Test Client", redirect_uris: ["https://client.example/callback"], token_endpoint_auth_method: "none" }),
  })
  assert.equal(registration.status, 201)
  const { client_id } = (await registration.json()) as { client_id: string }

  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  const authorize = new URL(`${base}/authorize`)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", client_id)
  authorize.searchParams.set("redirect_uri", "https://client.example/callback")
  authorize.searchParams.set("code_challenge", challenge)
  authorize.searchParams.set("code_challenge_method", "S256")
  authorize.searchParams.set("state", "state-123")

  const page = await fetch(authorize, { redirect: "manual" })
  assert.equal(page.status, 200)
  const html = await page.text()
  const loginId = /name="login_id" value="([^"]+)"/.exec(html)?.[1]
  assert.ok(loginId, "login page should carry a login_id")
  return { clientId: client_id, verifier, loginId: loginId as string, html }
}

test("an unauthenticated /mcp request points the client at this server's login", async () => {
  const { base, stop } = await startApp()
  try {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    })
    assert.equal(res.status, 401)
    assert.match(res.headers.get("www-authenticate") ?? "", /resource_metadata=".*\/\.well-known\/oauth-protected-resource\/mcp"/)
  } finally {
    await stop()
  }
})

test("the login page asks for a Polarion token and names the client that sent the user there", async () => {
  const { base, stop } = await startApp()
  try {
    const { html } = await beginLogin(base)
    assert.match(html, /Personal Access Token/)
    assert.match(html, /Test Client/)
  } finally {
    await stop()
  }
})

test("a token Polarion rejects does not end the login, it re-asks with the reason", async () => {
  const { base, stop } = await startApp()
  try {
    const { loginId } = await beginLogin(base)
    const res = await fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ login_id: loginId, token: "not-a-valid-pat" }),
      redirect: "manual",
    })
    assert.equal(res.status, 400)
    const html = await res.text()
    assert.match(html, /did not accept that token/)
    assert.match(html, /name="login_id"/, "the user must be able to try again")
  } finally {
    await stop()
  }
})

test("a valid Polarion token completes the login and the issued access token authenticates MCP calls as that user", async () => {
  const { base, stop } = await startApp()
  try {
    const { clientId, verifier, loginId } = await beginLogin(base)

    const submitted = await fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ login_id: loginId, token: VALID_PAT }),
      redirect: "manual",
    })
    assert.equal(submitted.status, 302)
    const redirect = new URL(submitted.headers.get("location") as string)
    assert.equal(redirect.searchParams.get("state"), "state-123")
    const code = redirect.searchParams.get("code")
    assert.ok(code, "a completed login must hand back an authorization code")

    const tokenRes = await fetch(`${base}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        client_id: clientId,
        code_verifier: verifier,
        redirect_uri: "https://client.example/callback",
      }),
    })
    assert.equal(tokenRes.status, 200)
    const tokens = (await tokenRes.json()) as { access_token: string }
    assert.ok(tokens.access_token)
    assert.notEqual(tokens.access_token, VALID_PAT, "the Polarion PAT must never be handed to the client")

    const initRes = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "node-test", version: "1.0" } },
      }),
    })
    assert.equal(initRes.status, 200)
  } finally {
    await stop()
  }
})
