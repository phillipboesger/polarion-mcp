import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { randomBytes, createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { once } from "node:events"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const PAT = "e2e-stub-pat"
const SECRET = "e2e-sealing-secret-that-is-long-enough-123"
const CALLBACK = "http://127.0.0.1:43127/callback"
const INIT = { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "polarion-e2e", version: "1" } }

async function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

async function polarion() {
  const server = createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${PAT}`) { res.writeHead(401).end(); return }
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ data: [{ type: "projects", id: "demo", attributes: { name: "Demo" } }] }))
  })
  const base = await listen(server)
  return { base: `${base}/polarion/rest/v1`, close: () => new Promise<void>(resolve => server.close(() => resolve())) }
}

const POLARION = await polarion()
process.env.API_BASE_URL = POLARION.base
const { createMcpHttpApp } = await import("../../src/mcp-http-server.js")

async function app(options: Parameters<typeof createMcpHttpApp>[0] = {}) {
  const { app, closeAllSessions } = createMcpHttpApp({ tokenSecret: SECRET, validateToken: async token => token === PAT, ...options })
  const server = createServer(app)
  const base = await listen(server)
  return { base, close: async () => { await closeAllSessions(); await new Promise<void>(resolve => server.close(() => resolve())) } }
}

function clientForHttp(base: string, token: string, path = "/mcp") {
  const client = new Client({ name: "polarion-e2e", version: "1" })
  const transport = new StreamableHTTPClientTransport(new URL(`${base}${path}`), { requestInit: { headers: { authorization: `Bearer ${token}` } } })
  return { client, transport }
}

async function rpcClient(base: string, token: string, path = "/mcp") {
  const pair = clientForHttp(base, token, path)
  await pair.client.connect(pair.transport)
  return pair
}

async function listViaClient(client: Client) { return client.listTools() }

async function oauthTokens(base: string, redirectUri = CALLBACK, authorizeResource?: string) {
  const reg = await fetch(`${base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "E2E client", redirect_uris: [redirectUri], token_endpoint_auth_method: "none" }) })
  assert.equal(reg.status, 201)
  const { client_id } = await reg.json() as { client_id: string }
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  const authorize = new URL(`${base}/authorize`)
  for (const [k,v] of Object.entries({ response_type: "code", client_id, redirect_uri: redirectUri, code_challenge: challenge, code_challenge_method: "S256", state: "e2e", ...(authorizeResource ? { resource: authorizeResource } : {}) })) authorize.searchParams.set(k,v)
  const page = await fetch(authorize, { redirect: "manual" })
  assert.equal(page.status, 200)
  const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1]
  assert.ok(loginId)
  const login = await fetch(`${base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: PAT }), redirect: "manual" })
  assert.equal(login.status, 302)
  const code = new URL(login.headers.get("location")!).searchParams.get("code")!
  const redeem = (codeVerifier: string, resource?: string) => fetch(`${base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id, code, code_verifier: codeVerifier, redirect_uri: redirectUri, ...(resource ? { resource } : {}) }) })
  return { client_id, verifier, code, redeem }
}

test("stdio and Streamable HTTP conform through the official MCP SDK client", async () => {
  let stdio: Client | undefined
  let http: Client | undefined
  try {
    const stdioTransport = new StdioClientTransport({ command: process.execPath, args: ["build/index.js"], env: { ...process.env, API_BASE_URL: POLARION.base, BEARER_TOKEN: PAT } })
    stdio = new Client({ name: "e2e-stdio", version: "1" })
    await stdio.connect(stdioTransport)
    const stdioTools = await listViaClient(stdio)
    assert.equal(stdioTools.tools.length, 293)
    const stdioProjects = await stdio.callTool({ name: "getProjects", arguments: {} })
    assert.match(JSON.stringify(stdioProjects), /demo/)

    const server = await app({ validateToken: async () => true })
    try {
      const { client, transport } = await rpcClient(server.base, PAT)
      http = client
      const tools = await listViaClient(client)
      assert.equal(tools.tools.length, 293)
      const result = await client.callTool({ name: "getProjects", arguments: {} })
      assert.match(JSON.stringify(result), /demo/)
      await client.listTools() // exercises the initialized session on a later request
      await transport.close()
    } finally { await server.close() }
  } finally { await stdio?.close(); await http?.close() }
})

test("DCR OAuth discovery, PKCE login, audience binding, MCP access and refresh work", async () => {
  const server = await app({ publicUrl: new URL("http://127.0.0.1"), allowedRedirectUris: [CALLBACK] })
  try {
    const protectedResource = await fetch(`${server.base}/.well-known/oauth-protected-resource`)
    assert.equal(protectedResource.status, 200)
    const resourceMeta = await protectedResource.json() as { authorization_servers: string[] }
    assert.ok(resourceMeta.authorization_servers.length)
    assert.equal((await fetch(`${server.base}/.well-known/oauth-authorization-server`)).status, 200)
    const badPkce = await (await oauthTokens(server.base)).redeem("x".repeat(43))
    assert.equal(badPkce.status, 400)
    const mismatchReg = await fetch(`${server.base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Wrong audience", redirect_uris: [CALLBACK], token_endpoint_auth_method: "none" }) })
    const { client_id: mismatchClientId } = await mismatchReg.json() as { client_id: string }
    const mismatchUrl = new URL(`${server.base}/authorize`)
    for (const [k,v] of Object.entries({ response_type: "code", client_id: mismatchClientId, redirect_uri: CALLBACK, code_challenge: "a".repeat(43), code_challenge_method: "S256", resource: "https://foreign.example/mcp" })) mismatchUrl.searchParams.set(k,v)
    const mismatchResponse = await fetch(mismatchUrl, { redirect: "manual" })
    assert.equal(mismatchResponse.status, 302)
    assert.equal(new URL(mismatchResponse.headers.get("location")!).searchParams.get("error"), "invalid_request")
    const flow = await oauthTokens(server.base)
    const good = await flow.redeem(flow.verifier)
    assert.equal(good.status, 200)
    const tokens = await good.json() as { access_token: string; refresh_token: string }
    const mcp = await rpcClient(server.base, tokens.access_token)
    assert.equal((await mcp.client.listTools()).tools.length, 293)
    await mcp.transport.close()
    const refreshed = await fetch(`${server.base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: flow.client_id, refresh_token: tokens.refresh_token }) })
    assert.equal(refreshed.status, 200)
    const foreign = await app({ publicUrl: new URL("https://foreign.example") })
    try {
      const foreignFlow = await oauthTokens(foreign.base)
      const foreignTokens = await foreignFlow.redeem(foreignFlow.verifier)
      const foreignAccess = (await foreignTokens.json() as { access_token: string }).access_token
      const denied = await fetch(`${server.base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${foreignAccess}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: INIT }) })
      assert.equal(denied.status, 401)
    } finally { await foreign.close() }
  } finally { await server.close() }
})

test("CIMD client metadata and loopback preset authorize by exact random-port callback", async () => {
  const { createServer: createHttpsServer } = await import("node:https")
  const { readFileSync } = await import("node:fs")
  const cert = readFileSync(path.resolve("tests/fixtures/cimd-test-cert.pem"))
  const key = readFileSync(path.resolve("tests/fixtures/cimd-test-key.pem"))
  const metadataServer = createHttpsServer({ cert, key }, (_req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ client_id: "https://127.0.0.1/client.json", client_name: "CIMD e2e", redirect_uris: [CALLBACK], token_endpoint_auth_method: "none" })) })
  const metadataBase = await listen(metadataServer as never)
  const url = "https://127.0.0.1/client.json"
  const { createCimdMetadataFetcher } = await import("../../src/cimd.js")
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: cert, testOnlyConnectPort: Number(new URL(metadataBase).port) })
  const server = await app({ publicUrl: new URL("http://127.0.0.1"), cimdEnabled: true, fetchClientMetadata: fetcher })
  try {
    const verifier = randomBytes(32).toString("base64url")
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const authorize = new URL(`${server.base}/authorize`)
    for (const [k,v] of Object.entries({ response_type: "code", client_id: url, redirect_uri: CALLBACK, code_challenge: challenge, code_challenge_method: "S256" })) authorize.searchParams.set(k,v)
    const cimdPage = await fetch(authorize, { redirect: "manual" })
    assert.equal(cimdPage.status, 200)
    const loginId = /name="login_id" value="([^"]+)"/.exec(await cimdPage.text())?.[1]
    assert.ok(loginId)
    const login = await fetch(`${server.base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: PAT }), redirect: "manual" })
    assert.equal(login.status, 302)
    const code = new URL(login.headers.get("location")!).searchParams.get("code")!
    const tokenResponse = await fetch(`${server.base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: url, code, code_verifier: verifier, redirect_uri: CALLBACK }) })
    assert.equal(tokenResponse.status, 200)
    assert.ok((await tokenResponse.json() as { access_token: string }).access_token)
    const loop = await app({ publicUrl: new URL("http://127.0.0.1"), allowedRedirectPresets: ["loopback"] })
    try {
      const registration = await fetch(`${loop.base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Loopback", redirect_uris: ["http://localhost:0/cb"], token_endpoint_auth_method: "none" }) })
      assert.equal(registration.status, 201)
      const { client_id } = await registration.json() as { client_id: string }
      const callbackPort = 49152 + Math.floor(Math.random() * 10000)
      const loopUrl = new URL(`${loop.base}/authorize`)
      for (const [k,v] of Object.entries({ response_type: "code", client_id, redirect_uri: `http://localhost:${callbackPort}/cb`, code_challenge: challenge, code_challenge_method: "S256" })) loopUrl.searchParams.set(k,v)
      assert.equal((await fetch(loopUrl, { redirect: "manual" })).status, 200)
    } finally { await loop.close() }
  } finally {
    await server.close()
    metadataServer.closeAllConnections()
    await new Promise<void>(resolve => metadataServer.close(() => resolve()))
  }
})

test("GPT REST route, work-items path toolset, and REST wrapper expose expected tools", async () => {
  const mcp = await app({ validateToken: async () => true })
  try {
    const pair = await rpcClient(mcp.base, PAT, "/mcp/work-items")
    const workItemTools = (await pair.client.listTools()).tools.map(tool => tool.name)
    assert.ok(workItemTools.includes("getWorkItem") && workItemTools.includes("getWorkItems"))
    assert.ok(!workItemTools.includes("getProjects"))
    await pair.transport.close()
  } finally { await mcp.close() }

  const gpt = await app({ publicUrl: new URL("http://127.0.0.1"), gptClient: { clientId: "e2e-gpt", clientSecret: "e2e-gpt-secret-long-enough-123456" } })
  try {
    const callback = "https://chatgpt.com/aip/g-e2e/oauth/callback"
    const authorize = new URL(`${gpt.base}/gpt/authorize`)
    for (const [k,v] of Object.entries({ response_type: "code", client_id: "e2e-gpt", redirect_uri: callback, state: "e2e" })) authorize.searchParams.set(k,v)
    const page = await fetch(authorize)
    const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())![1]
    const login = await fetch(`${gpt.base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: PAT }), redirect: "manual" })
    const code = new URL(login.headers.get("location")!).searchParams.get("code")!
    const tokenRes = await fetch(`${gpt.base}/gpt/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: "e2e-gpt", client_secret: "e2e-gpt-secret-long-enough-123456", code, redirect_uri: callback }) })
    const token = await tokenRes.json() as { access_token: string }
    assert.equal(tokenRes.status, 200)
    assert.ok((await fetch(`${gpt.base}/api/tools`, { headers: { authorization: `Bearer ${token.access_token}` } })).ok)
  } finally { await gpt.close() }

  const portServer = createServer()
  await listen(portServer)
  const restPort = (portServer.address() as AddressInfo).port
  await new Promise<void>(resolve => portServer.close(() => resolve()))
  const stub = POLARION
  const rest = spawn(process.execPath, ["build/http-server.js"], { env: { ...process.env, PORT: String(restPort), HTTP_API_KEY: "e2e-api-key", BEARER_TOKEN: PAT, API_BASE_URL: stub.base } })
  try {
    await new Promise<void>((resolve, reject) => {
      let output = ""
      const onData = (chunk: Buffer) => { output += chunk.toString(); if (output.includes(`running on port ${restPort}`)) { rest.stdout?.off("data", onData); resolve() } }
      rest.stdout?.on("data", onData)
      rest.once("exit", code => reject(new Error(`REST wrapper exited before startup (${code})`)))
      setTimeout(() => reject(new Error("REST wrapper startup timed out")), 10_000).unref()
    })
    const response = await fetch(`http://127.0.0.1:${restPort}/api/tools/getProjects`, { method: "POST", headers: { authorization: "Bearer e2e-api-key", "content-type": "application/json" }, body: JSON.stringify({ arguments: {} }) })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /demo/)
  } finally { rest.kill("SIGTERM"); await once(rest, "exit"); await stub.close() }
})

test("MCP Inspector CLI can list stdio tools", { skip: !existsSync("node_modules/.bin/inspector") }, async () => {
  const inspector = spawn(process.execPath, ["node_modules/@modelcontextprotocol/inspector/cli.js", "--cli", "node", "build/index.js", "--method", "tools/list"], { env: { ...process.env, API_BASE_URL: POLARION.base, BEARER_TOKEN: PAT }, stdio: ["ignore", "pipe", "pipe"] })
  let output = ""
  inspector.stdout?.on("data", chunk => { output += chunk.toString() })
  inspector.stderr?.on("data", chunk => { output += chunk.toString() })
  const [code] = await once(inspector, "exit") as [number | null]
  assert.equal(code, 0, output)
  assert.match(output, /getProjects/)
})
