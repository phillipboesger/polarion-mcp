import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"

import { createMcpHttpApp } from "../src/mcp-http-server.js"

const PUBLIC_URL = "http://127.0.0.1"
const VALID_PAT = "gpt-user-polarion-pat"
const GPT_CLIENT = { clientId: "polarion-gpt", clientSecret: "gpt-client-secret-0123456789abcdef" }
const CALLBACK = "https://chatgpt.com/aip/g-abc123DEF/oauth/callback"

/** Starts the app with the OAuth login and, unless disabled, the Custom GPT client. */
async function startApp(withGpt = true) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL(PUBLIC_URL),
    validateToken: async (token) => token === VALID_PAT,
    tokenSecret: "gpt-test-token-secret-long-enough-0123456789",
    ...(withGpt ? { gptClient: GPT_CLIENT } : {}),
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

function authorizeUrl(base: string, overrides: Record<string, string> = {}) {
  const url = new URL(`${base}/gpt/authorize`)
  const params = { response_type: "code", client_id: GPT_CLIENT.clientId, redirect_uri: CALLBACK, state: "gpt-state", scope: "polarion", ...overrides }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url
}

/** Runs the Custom GPT authorize + login steps and returns the code ChatGPT would receive. */
async function gptCode(base: string) {
  const page = await fetch(authorizeUrl(base), { redirect: "manual" })
  assert.equal(page.status, 200)
  const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
  const submitted = await fetch(`${base}/polarion-login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login_id: loginId, token: VALID_PAT }),
    redirect: "manual",
  })
  assert.equal(submitted.status, 302)
  const target = new URL(submitted.headers.get("location") as string)
  assert.equal(`${target.origin}${target.pathname}`, CALLBACK)
  assert.equal(target.searchParams.get("state"), "gpt-state")
  return target.searchParams.get("code") as string
}

function gptToken(base: string, params: Record<string, string>, basic = false) {
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" }
  const body = new URLSearchParams(params)
  if (basic) {
    headers.authorization = `Basic ${Buffer.from(`${GPT_CLIENT.clientId}:${GPT_CLIENT.clientSecret}`).toString("base64")}`
  } else {
    body.set("client_id", GPT_CLIENT.clientId)
    body.set("client_secret", GPT_CLIENT.clientSecret)
  }
  return fetch(`${base}/gpt/token`, { method: "POST", headers, body })
}

type Tokens = { access_token: string; refresh_token: string; token_type: string; expires_in: number }

test("a Custom GPT completes the login without PKCE and calls the REST tools with the issued token", async () => {
  const { base, stop } = await startApp()
  try {
    const code = await gptCode(base)
    const res = await gptToken(base, { grant_type: "authorization_code", code, redirect_uri: CALLBACK })
    assert.equal(res.status, 200)
    const tokens = (await res.json()) as Tokens
    assert.equal(tokens.token_type, "Bearer")
    assert.ok(tokens.refresh_token)

    const tools = await fetch(`${base}/api/tools`, { headers: { authorization: `Bearer ${tokens.access_token}` } })
    assert.equal(tools.status, 200)
    const unknown = await fetch(`${base}/api/tools/noSuchTool`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokens.access_token}`, "content-type": "application/json" },
      body: "{}",
    })
    assert.equal(unknown.status, 404)
  } finally {
    await stop()
  }
})

test("the Custom GPT token endpoint accepts client credentials as HTTP Basic, and refreshes", async () => {
  const { base, stop } = await startApp()
  try {
    const code = await gptCode(base)
    const res = await gptToken(base, { grant_type: "authorization_code", code, redirect_uri: CALLBACK }, true)
    assert.equal(res.status, 200)
    const { refresh_token } = (await res.json()) as Tokens
    const refreshed = await gptToken(base, { grant_type: "refresh_token", refresh_token })
    assert.equal(refreshed.status, 200)
  } finally {
    await stop()
  }
})

test("the Custom GPT token endpoint refuses a wrong client secret", async () => {
  const { base, stop } = await startApp()
  try {
    const code = await gptCode(base)
    const res = await fetch(`${base}/gpt/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK, client_id: GPT_CLIENT.clientId, client_secret: "wrong" }),
    })
    assert.equal(res.status, 401)
    assert.equal(((await res.json()) as { error: string }).error, "invalid_client")
  } finally {
    await stop()
  }
})

test("the Custom GPT authorize endpoint refuses unknown clients, foreign redirect URIs and a missing state", async () => {
  const { base, stop } = await startApp()
  try {
    for (const overrides of <Record<string, string>[]>[
      { client_id: "someone-else" },
      { redirect_uri: "https://evil.example/aip/g-abc/oauth/callback" },
      { redirect_uri: "https://chatgpt.com.evil.example/aip/g-abc/oauth/callback" },
      { state: "" },
      { response_type: "token" },
    ]) {
      const res = await fetch(authorizeUrl(base, overrides), { redirect: "manual" })
      assert.equal(res.status, 400, JSON.stringify(overrides))
      assert.equal(res.headers.get("location"), null, "must never redirect to an unverified URI")
    }
  } finally {
    await stop()
  }
})

test("a Custom GPT code is single-use and bound to its redirect URI", async () => {
  const { base, stop } = await startApp()
  try {
    const wrongRedirect = await gptToken(base, { grant_type: "authorization_code", code: await gptCode(base), redirect_uri: "https://chatgpt.com/aip/g-other/oauth/callback" })
    assert.equal(wrongRedirect.status, 400)

    const code = await gptCode(base)
    assert.equal((await gptToken(base, { grant_type: "authorization_code", code, redirect_uri: CALLBACK })).status, 200)
    assert.equal((await gptToken(base, { grant_type: "authorization_code", code, redirect_uri: CALLBACK })).status, 400)
  } finally {
    await stop()
  }
})

test("codes do not cross between the MCP (PKCE) flow and the Custom GPT flow", async () => {
  const { base, stop } = await startApp()
  try {
    // A GPT code (no PKCE) must not be redeemable at the PKCE token endpoint.
    const gpt = await gptCode(base)
    const viaMcp = await fetch(`${base}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: gpt, client_id: GPT_CLIENT.clientId, client_secret: GPT_CLIENT.clientSecret, code_verifier: "x".repeat(43), redirect_uri: CALLBACK }),
    })
    assert.equal(viaMcp.status, 400)

    // A PKCE code must not be redeemable at the GPT endpoint, which skips PKCE.
    const reg = await fetch(`${base}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "MCP", redirect_uris: ["https://client.example/cb"], token_endpoint_auth_method: "none" }),
    })
    const { client_id } = (await reg.json()) as { client_id: string }
    const verifier = randomBytes(32).toString("base64url")
    const auth = new URL(`${base}/authorize`)
    for (const [k, v] of Object.entries({ response_type: "code", client_id, redirect_uri: "https://client.example/cb", code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state: "s" })) auth.searchParams.set(k, v)
    const loginId = /name="login_id" value="([^"]+)"/.exec(await (await fetch(auth)).text())?.[1] as string
    const done = await fetch(`${base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: VALID_PAT }), redirect: "manual" })
    const mcpCode = new URL(done.headers.get("location") as string).searchParams.get("code") as string
    assert.equal((await gptToken(base, { grant_type: "authorization_code", code: mcpCode, redirect_uri: "https://client.example/cb" })).status, 400)
  } finally {
    await stop()
  }
})

test("the REST tools refuse requests without a token, and an unknown sealed token gets 401", async () => {
  const { base, stop } = await startApp()
  try {
    assert.equal((await fetch(`${base}/api/tools`)).status, 401)
    assert.equal((await fetch(`${base}/api/tools`, { headers: { authorization: "Bearer pmcp1.a.AAAA" } })).status, 401)
    const spec = await fetch(`${base}/openapi-gpt.json`)
    assert.equal(spec.status, 200)
    const { servers } = (await spec.json()) as { servers: { url: string }[] }
    assert.equal(servers[0].url, PUBLIC_URL)
  } finally {
    await stop()
  }
})

test("without a configured Custom GPT client, the GPT endpoints and REST tools do not exist", async () => {
  const { base, stop } = await startApp(false)
  try {
    assert.equal((await fetch(authorizeUrl(base))).status, 404)
    assert.equal((await fetch(`${base}/gpt/token`, { method: "POST" })).status, 404)
    assert.equal((await fetch(`${base}/api/tools`, { headers: { authorization: "Bearer x" } })).status, 404)
  } finally {
    await stop()
  }
})

test("the Custom GPT token endpoint is rate-limited like the SDK's own", async () => {
  const { base, stop } = await startApp()
  try {
    let last = 0
    for (let i = 0; i < 51; i++) {
      last = (await gptToken(base, { grant_type: "refresh_token", refresh_token: "pmcp1.r.AAAA" })).status
    }
    assert.equal(last, 429)
  } finally {
    await stop()
  }
})
