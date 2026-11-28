/**
 * MCP client compatibility matrix.
 *
 * Pins how TODAY's server (MCP SDK v1, spec versions up to 2025-11-25) treats
 * existing MCP clients, so a later SDK v2 migration (spec 2026-07-28) can prove
 * that old clients see no difference. Covers both transports: stdio (the built
 * `build/index.js` entry point) and Streamable HTTP (`createMcpHttpApp`).
 *
 * All behaviour asserted here is current behaviour, including exact status
 * codes and error texts; cases that look like a bug or a security gap are
 * marked with a comment. Tests only — no source changes.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { after } from "node:test"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { randomBytes, createHash } from "node:crypto"
import { once } from "node:events"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createFakePolarion, connectStdio, stdioEnv, trackElicitations, rawRpc, rawHttp, PAT, PAT_B, SECRET, GUIDE_URI } from "./compat-helpers.js"

// API_BASE_URL must exist before the config module is imported.
const FAKE = await createFakePolarion()
process.env.API_BASE_URL = FAKE.base
const { createMcpHttpApp } = await import("../../src/mcp-http-server.js")

after(async () => { await FAKE.close() })
type AppOptions = Parameters<typeof createMcpHttpApp>[0]

const CODE_MODE_TOOLS = ["execute", "search"]
const CONFIRM_TEXT = "This destructive tool requires confirmation; repeat the call with confirm: true; use dry_run: true first to preview."
const READ_SCRIPT = "const projects = await polarion.getProjects({}); return projects.data.map(project => project.id);"
const WRITE_DELETE_SCRIPT = [
  "const created = await polarion.createProject({ requestBody: { projectId: 'compat-proj', templateId: 'compat-template', params: {} } });",
  "const deleted = await polarion.deleteProject({ projectId: 'compat-proj' });",
  "return { created, deleted };",
].join("\n")
const INITIALIZED_NOTIFICATION = { jsonrpc: "2.0", method: "notifications/initialized" } as const

async function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

async function app(options: AppOptions = {}, port?: number) {
  const { app, closeAllSessions } = createMcpHttpApp({ tokenSecret: SECRET, validateToken: async token => [PAT, PAT_B].includes(token), apiBaseUrl: FAKE.base, ...options })
  const server = createServer(app)
  server.listen(port ?? 0, "127.0.0.1")
  await once(server, "listening")
  const base = port ? `http://127.0.0.1:${port}` : `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { base, close: async () => { await closeAllSessions(); await new Promise<void>(resolve => server.close(() => resolve())) } }
}

/** Reserves a free port for a moment so an app can be pinned to it. */
async function freePort() {
  const probe = createServer()
  const base = await listen(probe)
  await new Promise<void>(resolve => probe.close(() => resolve()))
  return Number(new URL(base).port)
}

function clientForHttp(base: string, headers: Record<string, string> = {}, capabilities?: Record<string, unknown>) {
  const client = new Client({ name: "compat-matrix", version: "0" }, { capabilities: (capabilities ?? { elicitation: { form: {} } }) as never })
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}`, ...headers } } })
  return { client, transport }
}

/** Sets MCP_MODE for the next HTTP initialize (the mode is read per session, not per process). */
function withMode<T>(mode: "code" | "full", run: () => Promise<T>): Promise<T> {
  process.env.MCP_MODE = mode
  return run().finally(() => { delete process.env.MCP_MODE })
}

async function connectHttp(base: string, headers: Record<string, string> = {}, capabilities?: Record<string, unknown>) {
  const pair = clientForHttp(base, headers, capabilities)
  await pair.client.connect(pair.transport)
  return { ...pair, close: async () => { await pair.transport.close(); await pair.client.close() } }
}

const toolNames = async (client: Client) => (await client.listTools()).tools.map(tool => tool.name).sort()

/** Asserts the v1 basics of one transport: ping, tools/call of a read, resources. */
async function assertV1Basics(client: Client, elicitations: string[]): Promise<void> {
  await client.ping()
  assert.deepEqual(await toolNames(client), CODE_MODE_TOOLS)

  // A read through search (local catalogue) and through execute (a real Polarion round-trip).
  const search = await client.callTool({ name: "search", arguments: { query: "delete project", detail: ["deleteProject"] } })
  assert.match(JSON.stringify(search), /deleteProject/)
  const read = await client.callTool({ name: "execute", arguments: { code: READ_SCRIPT } })
  assert.equal(read.isError, undefined)
  assert.deepEqual(JSON.parse((read.content as Array<{ text: string }>)[0]!.text).result, ["demo"])

  const resources = await client.listResources()
  assert.ok(resources.resources.some(resource => resource.uri === GUIDE_URI))
  const guide = await client.readResource({ uri: GUIDE_URI })
  assert.match((guide.contents[0] as { text: string }).text, /query syntax \(Lucene\)/)

  // A pure read must never trigger a destructive-action confirmation.
  assert.equal(elicitations.length, 0)
}

test("stdio: a v1 SDK client initializes, lists and calls tools, reads resources, pings", async () => {
  const elicitations: string[] = []
  const stdio = await connectStdio(stdioEnv(FAKE.base), { elicitation: { form: {} } })
  trackElicitations(stdio.client, elicitations, "accept")
  try {
    await assertV1Basics(stdio.client, elicitations)
  } finally { await stdio.close() }
})

test("Streamable HTTP: a v1 SDK client initializes, lists and calls tools, reads resources, pings", async () => {
  const server = await app()
  try {
    await withMode("code", async () => {
      const elicitations: string[] = []
      const pair = await connectHttp(server.base)
      trackElicitations(pair.client, elicitations, "accept")
      try { await assertV1Basics(pair.client, elicitations) } finally { await pair.close() }
    })
  } finally { await server.close() }
})

test("stdio, default config: an execute script writes then deletes with no elicitation", async () => {
  const before = { post: FAKE.calls("POST", "/projects"), delete: FAKE.calls("DELETE") }
  const elicitations: string[] = []
  const stdio = await connectStdio(stdioEnv(FAKE.base), { elicitation: { form: {} } })
  trackElicitations(stdio.client, elicitations, "accept")
  try {
    const result = await stdio.client.callTool({ name: "execute", arguments: { code: WRITE_DELETE_SCRIPT } })
    assert.equal(result.isError, undefined, JSON.stringify(result))
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    assert.equal(payload.write_calls, 2)
    assert.equal(FAKE.calls("POST", "/projects") - before.post, 1)
    assert.equal(FAKE.calls("DELETE") - before.delete, 1)
    assert.equal(elicitations.length, 0)
  } finally { await stdio.close() }
})

test("Streamable HTTP, default config: an execute script writes then deletes with no elicitation", async () => {
  const server = await app()
  try {
    await withMode("code", async () => {
      const before = { post: FAKE.calls("POST", "/projects"), delete: FAKE.calls("DELETE") }
      const elicitations: string[] = []
      const pair = await connectHttp(server.base)
      trackElicitations(pair.client, elicitations, "accept")
      try {
        const result = await pair.client.callTool({ name: "execute", arguments: { code: WRITE_DELETE_SCRIPT } })
        assert.equal(result.isError, undefined, JSON.stringify(result))
        const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
        assert.equal(payload.write_calls, 2)
        assert.equal(FAKE.calls("POST", "/projects") - before.post, 1)
        assert.equal(FAKE.calls("DELETE") - before.delete, 1)
        assert.equal(elicitations.length, 0)
      } finally { await pair.close() }
    })
  } finally { await server.close() }
})

test("MCP_CONFIRM_DESTRUCTIVE: eliciting client accepts a delete, exactly one elicit and one send", async () => {
  const server = await app({ confirmDestructive: true })
  try {
    await withMode("full", async () => {
      const elicitations: string[] = []
      const pair = await connectHttp(server.base)
      trackElicitations(pair.client, elicitations, "accept")
      try {
        const before = FAKE.calls("DELETE")
        const result = await pair.client.callTool({ name: "deleteProject", arguments: { projectId: "demo" } })
        assert.equal(result.isError, undefined, JSON.stringify(result))
        assert.equal(elicitations.length, 1)
        assert.match(elicitations[0]!, /deleteProject/)
        assert.equal(FAKE.calls("DELETE") - before, 1)
      } finally { await pair.close() }
    })
  } finally { await server.close() }
})

test("MCP_CONFIRM_DESTRUCTIVE: declined and cancelled deletes send nothing", async () => {
  const server = await app({ confirmDestructive: true })
  try {
    await withMode("full", async () => {
      for (const [action, expectedText] of [["decline", /declined/], ["cancel", /cancelled/]] as const) {
        const elicitations: string[] = []
        const pair = await connectHttp(server.base)
        trackElicitations(pair.client, elicitations, action)
        try {
          const before = FAKE.calls("DELETE")
          const result = await pair.client.callTool({ name: "deleteProject", arguments: { projectId: "demo" } })
          assert.equal(result.isError, true)
          assert.match((result.content as Array<{ text: string }>)[0]!.text, expectedText)
          assert.equal(elicitations.length, 1)
          assert.equal(FAKE.calls("DELETE") - before, 0)
        } finally { await pair.close() }
      }
    })
  } finally { await server.close() }
})

test("MCP_CONFIRM_DESTRUCTIVE: client without elicitation needs confirm:true; a script's confirm grants nothing", async () => {
  const server = await app({ confirmDestructive: true })
  try {
    await withMode("full", async () => {
      // The plain client declares no elicitation capability.
      const pair = await connectHttp(server.base, {}, {})
      try {
        // No elicitation capability and no confirm: the delete is refused before anything is sent.
        const before = FAKE.calls("DELETE")
        const refused = await pair.client.callTool({ name: "deleteProject", arguments: { projectId: "demo" } })
        assert.equal(refused.isError, true)
        assert.equal((refused.content as Array<{ text: string }>)[0]!.text, CONFIRM_TEXT)
        assert.equal(FAKE.calls("DELETE") - before, 0)

        // confirm: true on the direct call is today's one-step confirmation path.
        const confirmed = await pair.client.callTool({ name: "deleteProject", arguments: { projectId: "demo", confirm: true } })
        assert.equal(confirmed.isError, undefined, JSON.stringify(confirmed))
        assert.equal(FAKE.calls("DELETE") - before, 1)
      } finally { await pair.close() }
    })

    // Inside an execute script the code cannot grant its own confirmation:
    // confirm is stripped and the call is refused (current behaviour: the
    // script sees the same fallback error; nothing is sent).
    await withMode("code", async () => {
      // No elicitation capability: confirm inside the script must grant nothing.
      const pair = await connectHttp(server.base, {}, {})
      try {
        const before = FAKE.calls("DELETE")
        const result = await pair.client.callTool({ name: "execute", arguments: { code: "await polarion.deleteProject({ projectId: 'demo', confirm: true }); return 'deleted';" } })
        assert.equal(result.isError, true, JSON.stringify(result))
        assert.match((result.content as Array<{ text: string }>)[0]!.text, /requires confirmation|declined|cancelled/)
        assert.equal(FAKE.calls("DELETE") - before, 0)
      } finally { await pair.close() }
    })
  } finally { await server.close() }
})

test("progress notifications still arrive for a call that emits them (stdio and HTTP)", async () => {
  const collect = () => {
    // The v1 SDK routes progress callbacks by its own numeric request id and
    // strips the token from the callback payload, so only the values are visible here.
    const events: Array<{ progress: number; total?: number; message?: string }> = []
    return { events, onprogress: (event: { progress: number; total?: number; message?: string }) => { events.push(event) } }
  }
  const arguments_ = { name: "run_job_and_wait", arguments: { requestBody: { jobId: "compat-factory" }, max_wait_seconds: 1 }, _meta: { progressToken: "compat-token" } }

  const stdio = await connectStdio(stdioEnv(FAKE.base, { MCP_MODE: "full" }))
  try {
    const stdioProgress = collect()
    const stdioResult = await stdio.client.callTool(arguments_, undefined, { onprogress: stdioProgress.onprogress })
    assert.equal(stdioResult.isError, undefined, JSON.stringify(stdioResult))
    assert.ok(stdioProgress.events.length >= 2, `expected progress notifications, got ${JSON.stringify(stdioProgress.events)}`)
    assert.equal(stdioProgress.events[0]!.progress, 0)
    assert.equal(stdioProgress.events.at(-1)!.progress, 1)
  } finally { await stdio.close() }

  const server = await app()
  try {
    await withMode("full", async () => {
      const pair = await connectHttp(server.base)
      try {
        const httpProgress = collect()
        const httpResult = await pair.client.callTool(arguments_, undefined, { onprogress: httpProgress.onprogress })
        assert.equal(httpResult.isError, undefined, JSON.stringify(httpResult))
        assert.ok(httpProgress.events.length >= 2, `expected progress notifications, got ${JSON.stringify(httpProgress.events)}`)
        assert.equal(httpProgress.events.at(-1)!.progress, 1)
      } finally { await pair.close() }
    })
  } finally { await server.close() }
})

test("raw JSON-RPC: today's server accepts spec versions 2024-11-05, 2025-03-26, 2025-06-18 and 2025-11-25", async () => {
  const server = await app()
  try {
    for (const protocolVersion of ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"]) {
      const initialize = await rawRpc(server.base, PAT, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion, capabilities: {}, clientInfo: { name: "compat-raw", version: "0" } } })
      assert.equal(initialize.status, 200, protocolVersion)
      assert.ok(initialize.json?.result, `${protocolVersion}: ${JSON.stringify(initialize.json)}`)
      const sessionId = initialize.sessionId
      assert.ok(sessionId, `${protocolVersion}: no mcp-session-id on initialize`)

      const notified = await rawRpc(server.base, PAT, INITIALIZED_NOTIFICATION, { "mcp-session-id": sessionId!, "mcp-protocol-version": protocolVersion })
      assert.equal(notified.status, 202, protocolVersion)

      const listed = await rawRpc(server.base, PAT, { jsonrpc: "2.0", id: 2, method: "tools/list" }, { "mcp-session-id": sessionId!, "mcp-protocol-version": protocolVersion })
      assert.equal(listed.status, 200, protocolVersion)
      assert.deepEqual((listed.json?.result as { tools: Array<{ name: string }> }).tools.map(tool => tool.name).sort(), CODE_MODE_TOOLS, protocolVersion)

      const ended = await fetch(`${server.base}/mcp`, { method: "DELETE", headers: { authorization: `Bearer ${PAT}`, "mcp-session-id": sessionId!, "mcp-protocol-version": protocolVersion } })
      assert.equal(ended.status, 200, protocolVersion)

      // After DELETE the session is gone; a follow-up request must re-initialize (404).
      const afterEnd = await rawRpc(server.base, PAT, { jsonrpc: "2.0", id: 3, method: "tools/list" }, { "mcp-session-id": sessionId!, "mcp-protocol-version": protocolVersion })
      assert.equal(afterEnd.status, 404, protocolVersion)
    }
  } finally { await server.close() }
})

test("HTTP negatives: Host, Origin, tokens, session ids, body size and X-MCP-Readonly", async () => {
  const server = await app()
  try {
    // DNS-rebinding protection. Current behaviour: the configured allowedHosts
    // must match the Host header exactly, port included, and anything else is
    // rejected with 403 "Invalid Host header".
    const port = await freePort()
    const hostApp = await app({ allowedHosts: [`127.0.0.1:${port}`] }, port)
    try {
      const hostile = await rawHttp("POST", `${hostApp.base}/mcp`, { host: "evil.example", "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${PAT}` }, JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "compat", version: "0" } } }))
      assert.equal(hostile.status, 403)
      assert.match(hostile.text, /Invalid Host header: evil\.example/)
      const legit = await connectHttp(hostApp.base)
      try { await legit.client.ping() } finally { await legit.close() }
    } finally { await hostApp.close() }

    // A disallowed browser origin is rejected with 403.
    const evilOrigin = await fetch(`${server.base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${PAT}`, origin: "https://evil.example" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) })
    assert.equal(evilOrigin.status, 403)
    assert.equal(((await evilOrigin.json()) as { error: { message: string } }).error.message, "Origin is not allowed")

    // Missing and wrong tokens are 401.
    const anonymous = await fetch(`${server.base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "compat", version: "0" } } }) })
    assert.equal(anonymous.status, 401)
    const wrong = await rawRpc(server.base, "not-a-valid-token", { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "compat", version: "0" } } })
    assert.equal(wrong.status, 401)

    // A sealed access token issued for another deployment (another user's
    // login) is rejected with 401 — it does not silently act as this user.
    const local = await app({ publicUrl: new URL("http://127.0.0.1") })
    const foreign = await app({ publicUrl: new URL("https://foreign.example") })
    try {
      const reg = await fetch(`${foreign.base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "compat", redirect_uris: ["http://127.0.0.1/callback"], token_endpoint_auth_method: "none" }) })
      assert.equal(reg.status, 201)
      const { client_id } = await reg.json() as { client_id: string }
      const verifier = randomBytes(32).toString("base64url")
      const challenge = createHash("sha256").update(verifier).digest("base64url")
      const authorize = new URL(`${foreign.base}/authorize`)
      for (const [key, value] of Object.entries({ response_type: "code", client_id, redirect_uri: "http://127.0.0.1/callback", code_challenge: challenge, code_challenge_method: "S256", state: "compat" })) authorize.searchParams.set(key, value)
      const page = await fetch(authorize, { redirect: "manual" })
      assert.equal(page.status, 200)
      const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1]
      assert.ok(loginId)
      const login = await fetch(`${foreign.base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: PAT }), redirect: "manual" })
      assert.equal(login.status, 302)
      const code = new URL(login.headers.get("location")!).searchParams.get("code")!
      const redeemed = await fetch(`${foreign.base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id, code, code_verifier: verifier, redirect_uri: "http://127.0.0.1/callback" }) })
      assert.equal(redeemed.status, 200)
      const foreignToken = ((await redeemed.json()) as { access_token: string }).access_token
      const hijack = await rawRpc(local.base, foreignToken, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "compat", version: "0" } } })
      assert.equal(hijack.status, 401)
    } finally { await local.close(); await foreign.close() }

    // Session ids are bound to the token that created them: user B cannot use user A's session.
    const owner = await connectHttp(server.base)
    try {
      const sessionId = owner.transport.sessionId
      assert.ok(sessionId)
      const stranger = await rawRpc(server.base, PAT_B, { jsonrpc: "2.0", id: 1, method: "tools/list" }, { "mcp-session-id": sessionId! })
      assert.equal(stranger.status, 404)

      // An unknown session id is likewise a 404 that makes clients re-initialize.
      const unknown = await rawRpc(server.base, PAT, { jsonrpc: "2.0", id: 1, method: "tools/list" }, { "mcp-session-id": "00000000-0000-0000-0000-000000000000" })
      assert.equal(unknown.status, 404)

      // A request body over 10 MB is rejected with 413.
      const oversized = await rawRpc(server.base, PAT, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search", arguments: { blob: "x".repeat(11 * 1024 * 1024) } } }, { "mcp-session-id": sessionId! })
      assert.equal(oversized.status, 413)
      assert.equal(oversized.json?.error?.message, "Request body too large")
    } finally { await owner.close() }

    // X-MCP-Readonly pins the session to reads: the write in the script is blocked and nothing reaches Polarion.
    const before = FAKE.calls("DELETE")
    const readOnly = await connectHttp(server.base, { "x-mcp-readonly": "true" })
    try {
      assert.deepEqual(await toolNames(readOnly.client), CODE_MODE_TOOLS)
      const result = await readOnly.client.callTool({ name: "execute", arguments: { code: "await polarion.deleteProject({ projectId: 'demo' }); return 'deleted';" } })
      assert.equal(result.isError, true, JSON.stringify(result))
      assert.equal(FAKE.calls("DELETE") - before, 0)
    } finally { await readOnly.close() }
  } finally { await server.close() }
})
