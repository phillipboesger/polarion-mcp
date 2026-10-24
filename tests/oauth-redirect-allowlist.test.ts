import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createMcpHttpApp } from "../src/mcp-http-server.js"
import { REDIRECT_PRESET_URIS, isRedirectAllowed, parseRedirectAllowlist } from "../src/oauth.js"

const clients = JSON.parse(readFileSync(resolve("docs/clients.json"), "utf8")) as {
  clients: Array<{ id: string; redirectUris: Array<{ uri: string; verified: boolean }> }>
}

const CLAUDE = "https://claude.ai/api/mcp/auth_callback"
const SECRET = randomBytes(32).toString("base64url")

async function startApp(allowedRedirectUris?: string[], allowedRedirectPresets?: string[]) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: SECRET,
    validateToken: async () => true,
    allowedRedirectUris,
    allowedRedirectPresets,
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

test("redirect preset constants match verified literal callbacks in the client matrix", () => {
  const clientByPreset = {
    claude: "claude-web-desktop",
    chatgpt: "chatgpt-apps",
    vscode: "vscode-copilot",
    cursor: "cursor",
    "copilot-studio": "copilot-studio",
    gemini: "gemini-cli",
  } as const
  const expected = Object.fromEntries(Object.entries(clientByPreset).map(([preset, clientId]) => {
    const client = clients.clients.find(entry => entry.id === clientId)
    return [preset, client?.redirectUris.filter(entry => entry.verified && URL.canParse(entry.uri)).map(entry => entry.uri) ?? []]
  }))
  assert.deepEqual(Object.fromEntries(Object.entries(REDIRECT_PRESET_URIS).filter(([name]) => name !== "loopback")), expected)
})

test("each client preset permits only its verified callback URIs", () => {
  const cases = [
    ["claude", CLAUDE, ["https://claude.ai.evil.example/api/mcp/auth_callback", "https://attacker.example/api/mcp/auth_callback", "https://claude.ai/api/mcp/auth_callback/extra", "https://claude.ai@evil.example/api/mcp/auth_callback"]],
    ["cursor", "https://www.cursor.com/agents/mcp/oauth/callback", ["https://www.cursor.com.evil.example/agents/mcp/oauth/callback", "https://www.cursor.com/agents/mcp/oauth/callback/extra", "https://www.cursor.com@evil.example/agents/mcp/oauth/callback"]],
  ] as const
  for (const [preset, callback, lookalikes] of cases) {
    const allowlist = parseRedirectAllowlist(undefined, [preset])
    assert.equal(isRedirectAllowed(callback, allowlist), true, `${preset} callback`)
    for (const lookalike of lookalikes) assert.equal(isRedirectAllowed(lookalike, allowlist), false, `${preset}: ${lookalike}`)
  }
  for (const preset of ["chatgpt", "vscode", "copilot-studio", "gemini"]) {
    const allowlist = parseRedirectAllowlist(undefined, [preset])
    assert.equal(isRedirectAllowed("https://attacker.example/callback", allowlist), false, `${preset} has no verified fixed callback`)
  }
})

test("loopback preset accepts any port only for exact loopback hosts over HTTP", () => {
  const allowlist = parseRedirectAllowlist(undefined, ["loopback"])
  for (const host of ["127.0.0.1", "[::1]", "localhost"]) {
    assert.equal(isRedirectAllowed(`http://${host}:45678/callback`, allowlist), true, host)
    assert.equal(isRedirectAllowed(`http://${host}:1/callback`, allowlist), true, `${host} port 1`)
  }
  for (const uri of [
    "http://evil.example:45678/callback",
    "https://localhost:45678/callback",
    "http://localhost.evil.example:45678/callback",
    "http://127.0.0.1@evil.example:45678/callback",
    "http://localhost:45678/callback#fragment",
  ]) assert.equal(isRedirectAllowed(uri, allowlist), false, uri)
})

test("unknown presets fail closed and known presets are passed through the HTTP app", async () => {
  const unknown = parseRedirectAllowlist(undefined, ["not-a-preset"])
  assert.equal(isRedirectAllowed("https://attacker.example/callback", unknown), false)

  const { base, stop } = await startApp(undefined, ["claude"])
  try {
    assert.equal((await register(base, CLAUDE)).status, 201)
    assert.equal((await register(base, "https://claude.ai.evil.example/api/mcp/auth_callback")).status, 400)
  } finally {
    await stop()
  }

  const loopback = await startApp(undefined, ["loopback"])
  try {
    const accepted = await register(loopback.base, "http://localhost:31415/callback")
    assert.equal(accepted.status, 201)
    const { client_id } = await accepted.json() as { client_id: string }
    assert.notEqual((await authorize(loopback.base, client_id, "http://localhost:31415/other")).status, 200)
    assert.equal((await register(loopback.base, "http://localhost.evil.example:31415/callback")).status, 400)
  } finally {
    await loopback.stop()
  }
})

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

  const loopbackPrefix = parseRedirectAllowlist("http://localhost:33418/oauth/")
  assert.deepEqual(loopbackPrefix, ["http://localhost/oauth/"])
  assert.equal(isRedirectAllowed("http://localhost:5000/oauth/cb", loopbackPrefix), true)
  const externalPrefix = parseRedirectAllowlist("https://claude.ai/api/mcp/")
  assert.equal(isRedirectAllowed("https://claude.ai:8443/api/mcp/auth_callback", externalPrefix), false)
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

test("registration rejects a client if any redirect URI falls outside the allowlist", async () => {
  const { base, stop } = await startApp(parseRedirectAllowlist(CLAUDE))
  try {
    const response = await fetch(`${base}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "Some Client", redirect_uris: [CLAUDE, "https://attacker.example/callback"], token_endpoint_auth_method: "none" }),
    })
    assert.equal(response.status, 400)
    assert.equal(((await response.json()) as { error: string }).error, "invalid_client_metadata")
  } finally {
    await stop()
  }
})

test("a registration issued before the allowlist was set stops working once it is", async () => {
  const open = await startApp()
  let clientId: string
  try {
    const res = await register(open.base, "https://attacker.example/callback")
    assert.equal(res.status, 201)
    const registration = (await res.json()) as { client_id: string }
    assert.ok(registration.client_id)
    clientId = registration.client_id
    const authorizeResponse = await authorize(open.base, clientId, "https://attacker.example/callback")
    assert.equal(authorizeResponse.status, 200)
    assert.match(authorizeResponse.headers.get("content-type") ?? "", /text\/html/)
    assert.match(authorizeResponse.headers.get("cache-control") ?? "", /no-store/)
    const loginPage = await authorizeResponse.text()
    assert.match(loginPage, /name="login_id" value="[^"]+"/)
    assert.match(loginPage, /attacker\.example/)
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
