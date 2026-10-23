// Security-relevant behaviour that mutation testing showed no other test
// pinned down: each test here fails when its guarded check is removed.
import test, { mock } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"
import type { AxiosRequestConfig, AxiosResponse } from "axios"

import { createMcpHttpApp } from "../src/mcp-http-server.js"
import { Sealer } from "../src/sealed.js"
import { PolarionOAuthProvider, renderLoginPage } from "../src/oauth.js"
import { httpsAgent } from "../src/httpClient.js"
import { checkResourceCustomFieldKeys, checkWorkItemUserReferences, _fieldKeyCache, _userExistsCache } from "../src/guards.js"
import { requestBearerToken } from "../src/config.js"
import { executeApiTool } from "../src/executor.js"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"
import { toolDefinitionMap, securitySchemes } from "../src/tools.js"

// The generated tools need a token; a call without one is refused before it is sent.
process.env.BEARER_TOKEN ??= "test-token"

const SECRET = "proposed-tests-secret-long-enough-0123456789"
const REDIRECT = "https://client.example/callback"
const FAST = { minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 0 }

async function startApp(opts: Record<string, unknown> = {}) {
  const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL("http://127.0.0.1"), tokenSecret: SECRET, validateToken: async () => true, ...opts })
  const server = app.listen(0)
  await new Promise<void>((r) => server.once("listening", () => r()))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { base, stop: async () => { await closeAllSessions(); await new Promise<void>((r) => server.close(() => r())) } }
}

async function register(base: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "C", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", ...extra }) })
  return (await res.json()) as { client_id: string; client_secret?: string }
}

async function codeFor(base: string, clientId: string) {
  const verifier = randomBytes(32).toString("base64url")
  const a = new URL(`${base}/authorize`)
  for (const [k, v] of Object.entries({ response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state: "s" })) a.searchParams.set(k, v)
  const loginId = /name="login_id" value="([^"]+)"/.exec(await (await fetch(a)).text())?.[1] as string
  const done = await fetch(`${base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: "pat" }), redirect: "manual" })
  return { code: new URL(done.headers.get("location") as string).searchParams.get("code") as string, verifier }
}

async function directMcpCode(provider: PolarionOAuthProvider, client: OAuthClientInformationFull, codeChallenge?: string) {
  let loginId = ""
  await provider.authorize(client, {
    redirectUri: REDIRECT,
    state: "direct-state",
    codeChallenge,
    scopes: [],
  } as never, {
    set() {},
    send(html: string) { loginId = /name="login_id" value="([^"]+)"/.exec(html)![1] },
  } as never)
  const completed = await provider.completeLogin(loginId, "pat")
  assert.equal(completed.ok, true)
  if (!completed.ok) throw new Error("direct login should issue an authorization code")
  return new URL(completed.redirectTo).searchParams.get("code") as string
}

const exchange = (base: string, body: Record<string, string>) =>
  fetch(`${base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", redirect_uri: REDIRECT, ...body }) })

test("a code issued to client A cannot be redeemed by client B, even with A's verifier", async () => {
  const { base, stop } = await startApp()
  try {
    const a = await register(base)
    const b = await register(base)
    const { code, verifier } = await codeFor(base, a.client_id)
    const res = await exchange(base, { code, code_verifier: verifier, client_id: b.client_id })
    assert.equal(res.status, 400)
    assert.equal(((await res.json()) as { error: string }).error, "invalid_grant")
  } finally { await stop() }
})

test("the PKCE challenge lookup independently enforces client, flow, expiry, and challenge binding", async () => {
  const provider = new PolarionOAuthProvider("https://p", new Sealer(SECRET), async () => true)
  const registration = {
    client_name: "direct client",
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: "none" as const,
    grant_types: ["authorization_code"],
    response_types: ["code"],
  }
  const client = await provider.clientsStore.registerClient!(registration)
  const otherClient = await provider.clientsStore.registerClient!({ ...registration, client_name: "other client" })
  const challenge = createHash("sha256").update("verifier").digest("base64url")

  const wrongClientCode = await directMcpCode(provider, client, challenge)
  await assert.rejects(provider.challengeForAuthorizationCode(otherClient, wrongClientCode), /Invalid authorization code/)
  assert.equal(await provider.challengeForAuthorizationCode(client, wrongClientCode), challenge, "a rejected client must not consume the code")

  const noChallengeCode = await directMcpCode(provider, client)
  await assert.rejects(provider.challengeForAuthorizationCode(client, noChallengeCode), /Invalid authorization code/)

  let gptLoginId = ""
  provider.authorizeGpt("gpt", "https://chatgpt.com/aip/g-x/oauth/callback", "s", {
    set() {}, send(html: string) { gptLoginId = /name="login_id" value="([^"]+)"/.exec(html)![1] },
  } as never)
  const gptLogin = await provider.completeLogin(gptLoginId, "pat")
  assert.equal(gptLogin.ok, true)
  if (!gptLogin.ok) throw new Error("GPT login should issue an authorization code")
  const gptCode = new URL(gptLogin.redirectTo).searchParams.get("code") as string
  await assert.rejects(provider.challengeForAuthorizationCode(client, gptCode), /Invalid authorization code/)

  mock.timers.enable({ apis: ["Date"], now: Date.now() })
  try {
    const expiredCode = await directMcpCode(provider, client, challenge)
    mock.timers.tick(61_000)
    await assert.rejects(provider.challengeForAuthorizationCode(client, expiredCode), /Invalid authorization code/)
  } finally { mock.timers.reset() }
})

test("the MCP token endpoint refuses a redirect_uri other than the one the login started with", async () => {
  const { base, stop } = await startApp()
  try {
    const a = await register(base)
    const { code, verifier } = await codeFor(base, a.client_id)
    const res = await exchange(base, { code, code_verifier: verifier, client_id: a.client_id, redirect_uri: "https://client.example/other" })
    assert.equal(res.status, 400)
  } finally { await stop() }
})

test("an authorization code expires after 60 s", async () => {
  const { base, stop } = await startApp()
  mock.timers.enable({ apis: ["Date"], now: Date.now() })
  try {
    const a = await register(base)
    const { code, verifier } = await codeFor(base, a.client_id)
    mock.timers.tick(61_000)
    assert.equal((await exchange(base, { code, code_verifier: verifier, client_id: a.client_id })).status, 400)
  } finally { mock.timers.reset(); await stop() }
})

test("a login page left open past 10 minutes can no longer be completed", async () => {
  const provider = new PolarionOAuthProvider("https://p", new Sealer(SECRET), async () => true)
  const loginIds: string[] = []
  mock.timers.enable({ apis: ["Date"], now: Date.now() })
  try {
    const response = { set() {}, send(h: string) { loginIds.push(/name="login_id" value="([^"]+)"/.exec(h)![1]) } }
    provider.authorizeGpt("gpt", "https://chatgpt.com/aip/g-x/oauth/callback", "s", response as never)
    provider.authorizeGpt("gpt", "https://chatgpt.com/aip/g-x/oauth/callback", "s", response as never)
    mock.timers.tick(9 * 60 * 1000)
    assert.equal((await provider.completeLogin(loginIds[0], "pat")).ok, true, "a live login remains usable within its TTL")
    mock.timers.tick(60 * 1000 + 1)
    assert.equal((await provider.completeLogin(loginIds[1], "pat")).ok, false, "an expired login is rejected")
  } finally { mock.timers.reset() }
})

test("a Polarion outage preserves the pending login and never redirects with an unverified token", async () => {
  const { base, stop } = await startApp({ validateToken: async () => "unavailable" })
  try {
    const client = await register(base)
    const authorizeUrl = new URL(`${base}/authorize`)
    for (const [key, value] of Object.entries({
      response_type: "code",
      client_id: client.client_id,
      redirect_uri: REDIRECT,
      code_challenge: createHash("sha256").update("verifier").digest("base64url"),
      code_challenge_method: "S256",
      state: "outage-state",
    })) authorizeUrl.searchParams.set(key, value)
    const page = await (await fetch(authorizeUrl)).text()
    const loginId = /name="login_id" value="([^"]+)"/.exec(page)?.[1]
    assert.ok(loginId)

    const result = await fetch(`${base}/polarion-login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ login_id: loginId as string, token: "pat" }),
      redirect: "manual",
    })
    assert.equal(result.status, 400)
    assert.equal(result.headers.get("location"), null)
    const retryPage = await result.text()
    assert.match(retryPage, /Polarion could not be reached to check the token/)
    assert.match(retryPage, new RegExp(`name="login_id" value="${loginId}"`))
  } finally { await stop() }
})

test("a sealed value relabelled to another kind does not open (kind is bound as AAD)", () => {
  const sealer = new Sealer(SECRET)
  const refresh = sealer.seal("r", { c: "x", p: "pat", s: [] })
  const relabelled = refresh.replace(/^pmcp1\.r\./, "pmcp1.a.")
  assert.equal(sealer.open("a", relabelled), undefined)
})

test("a tampered value whose plaintext still parses is refused (GCM tag is checked)", () => {
  const sealer = new Sealer(SECRET)
  const sealed = sealer.seal("a", { n: 1 })
  const raw = Buffer.from(sealed.slice("pmcp1.a.".length), "base64url")
  raw[raw.length - 2] ^= 0x01 // '1' -> '0' in {"n":1}: still valid JSON
  assert.equal(sealer.open("a", `pmcp1.a.${raw.toString("base64url")}`), undefined)
})

test("one client's derived secret does not authenticate another client", async () => {
  const { base, stop } = await startApp()
  try {
    const a = await register(base, { token_endpoint_auth_method: "client_secret_post" })
    const b = await register(base, { token_endpoint_auth_method: "client_secret_post" })
    assert.notEqual(a.client_secret, b.client_secret)
    const { code, verifier } = await codeFor(base, b.client_id)
    const res = await exchange(base, { code, code_verifier: verifier, client_id: b.client_id, client_secret: a.client_secret as string })
    assert.equal(((await res.json()) as { error: string }).error, "invalid_client")
  } finally { await stop() }
})

test("client_name is HTML-escaped on the login page", () => {
  const html = renderLoginPage("id", "https://p", `<img src=x onerror=alert(1)> & "quoted" 'single'`, "h")
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quoted&quot; &#39;single&#39;/)
})

test("an empty copied PAT stays on the login page without calling Polarion", async () => {
  let checks = 0
  const provider = new PolarionOAuthProvider("https://p", new Sealer(SECRET), async () => { checks++; return true })
  let loginId = ""
  provider.authorizeGpt("gpt", "https://chatgpt.com/aip/g-x/oauth/callback", "s", {
    set() {}, send(html: string) { loginId = /name="login_id" value="([^"]+)"/.exec(html)![1] },
  } as never)
  const result = await provider.completeLogin(loginId, " \n\t ")
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Enter your Polarion Personal Access Token/)
    assert.ok(result.pending, "a blank token must leave the login retryable")
  }
  assert.equal(checks, 0, "empty credentials must never reach the token validator")
})

test("the GPT authorize endpoint refuses callbacks with a query, a port, or plain http", async () => {
  const { base, stop } = await startApp({ gptClient: { clientId: "g", clientSecret: "s".repeat(32) } })
  try {
    for (const cb of ["https://chatgpt.com/aip/g-1/oauth/callback?x=1", "https://chatgpt.com:8443/aip/g-1/oauth/callback", "http://chatgpt.com/aip/g-1/oauth/callback"]) {
      const u = new URL(`${base}/gpt/authorize`)
      for (const [k, v] of Object.entries({ response_type: "code", client_id: "g", redirect_uri: cb, state: "s" })) u.searchParams.set(k, v)
      assert.equal((await fetch(u, { redirect: "manual" })).status, 400, cb)
    }
  } finally { await stop() }
})

test("a non-Bearer Authorization scheme is not accepted as a PAT on /mcp", async () => {
  const { base, stop } = await startApp()
  try {
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Basic dXNlcjpwYXNz" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }) })
    assert.equal(res.status, 401)
  } finally { await stop() }
})

test("the shared HTTPS agent honours rejectUnauthorized", () => {
  assert.equal(httpsAgent(true).options.rejectUnauthorized, true)
  assert.equal(httpsAgent(false).options.rejectUnauthorized, false)
})

test("the field-key cache is not shared between callers", async () => {
  _fieldKeyCache.clear()
  const seen: string[] = []
  const httpClient = async (): Promise<AxiosResponse> => {
    seen.push(requestBearerToken.getStore() ?? "none")
    return { data: { data: { attributes: { cf: {} } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }
  const target = { resourceType: "workitems", instancePath: "/projects/P/workitems/W-1", attributes: { cf: "x" }, scopeLabel: "W" }
  const ctx = { baseUrl: "https://p", headers: {}, rejectUnauthorized: true }
  await requestBearerToken.run("alice", () => checkResourceCustomFieldKeys(target, ctx, { ...FAST, httpClient }))
  await requestBearerToken.run("bob", () => checkResourceCustomFieldKeys(target, ctx, { ...FAST, httpClient }))
  assert.deepEqual(seen, ["alice", "bob"])
})

test("the user-exists cache is not shared between callers", async () => {
  _userExistsCache.clear()
  const seen: string[] = []
  const httpClient = async (): Promise<AxiosResponse> => {
    seen.push(requestBearerToken.getStore() ?? "none")
    return { data: {}, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }
  const rel = { assignee: { data: [{ type: "users", id: "u1" }] } }
  const ctx = { baseUrl: "https://p", headers: {}, rejectUnauthorized: true }
  await requestBearerToken.run("alice", () => checkWorkItemUserReferences(rel, ctx, { ...FAST, httpClient }))
  await requestBearerToken.run("bob", () => checkWorkItemUserReferences(rel, ctx, { ...FAST, httpClient }))
  assert.deepEqual(seen, ["alice", "bob"])
})

test("a nonexistent user in votes or watches is refused too", async () => {
  for (const key of ["votes", "watches"]) {
    _userExistsCache.clear()
    const httpClient = async (): Promise<AxiosResponse> => { throw Object.assign(new Error("404"), { isAxiosError: true, response: { status: 404, statusText: "", headers: {}, data: {} } }) }
    const r = await checkWorkItemUserReferences({ [key]: { data: [{ type: "users", id: "ghost" }] } }, { baseUrl: "https://p", headers: {}, rejectUnauthorized: true }, { ...FAST, httpClient })
    assert.equal(r.ok, false, key)
  }
})

test("dry_run with an invalid enum value is refused, not previewed", async () => {
  const httpClient = async (c: AxiosRequestConfig): Promise<AxiosResponse> => ({ data: { data: [{ id: "open" }] }, status: 200, statusText: "OK", headers: { "content-type": "application/json" }, config: c as any })
  const r = await executeApiTool("patchWorkItem", toolDefinitionMap.get("patchWorkItem")!, { projectId: "P", workItemId: "W-77", dry_run: true, requestBody: { data: { type: "workitems", id: "P/W-77", attributes: { status: "bogus" } } } }, securitySchemes, { ...FAST, httpClient })
  assert.match((r.content[0] as { text: string }).text, /Write refused: 'status' value 'bogus'/)
})

test("downloads are requested with a maxContentLength cap", async () => {
  let seen: AxiosRequestConfig | undefined
  const httpClient = async (c: AxiosRequestConfig): Promise<AxiosResponse> => { seen = c; return { data: Buffer.from("x"), status: 200, statusText: "OK", headers: { "content-type": "text/plain" }, config: c as any } }
  await executeApiTool("getWorkItemAttachmentContent", toolDefinitionMap.get("getWorkItemAttachmentContent")!, { projectId: "P", workItemId: "W", attachmentId: "a.txt" }, securitySchemes, { ...FAST, httpClient })
  assert.equal(seen?.maxContentLength, 20 * 1024 * 1024 + 1)
})
