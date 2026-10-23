import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http"
import { randomBytes, createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import https from "node:https"

import { createMcpHttpApp } from "../src/mcp-http-server.js"
import { createCimdMetadataFetcher, fetchClientMetadataDocument, isPublicCimdAddress } from "../src/cimd.js"

const CERT = readFileSync(resolve("tests/fixtures/cimd-test-cert.pem"))
const KEY = readFileSync(resolve("tests/fixtures/cimd-test-key.pem"))
const CLIENT_ID = "https://127.0.0.1/client.json"
const CALLBACK = "https://client.example/callback"
const SECRET = randomBytes(32).toString("base64url")

async function startCimdServer(handler: RequestListener) {
  const server = https.createServer({ cert: CERT, key: KEY }, handler)
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })
  const { port } = server.address() as AddressInfo
  return {
    server,
    port,
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}

function metadata(clientId = CLIENT_ID, redirectUris = [CALLBACK]) {
  return { client_id: clientId, client_name: "CIMD Test Client", redirect_uris: redirectUris, token_endpoint_auth_method: "none" }
}

async function startApp(options: { enabled?: boolean; allowedRedirectUris?: string[]; fetcher?: (clientId: string) => Promise<unknown> } = {}) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: SECRET,
    validateToken: async token => token === "accepted-pat",
    cimdEnabled: options.enabled,
    allowedRedirectUris: options.allowedRedirectUris ?? [CALLBACK],
    fetchClientMetadata: options.fetcher as never,
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  return {
    base: `http://127.0.0.1:${port}`,
    close: async () => {
      await closeAllSessions()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}

function authorizationUrl(base: string, clientId: string, redirectUri: string, verifier: string) {
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  const url = new URL(`${base}/authorize`)
  for (const [key, value] of Object.entries({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "cimd-state",
  })) url.searchParams.set(key, value)
  return url
}

async function readClientMetadata(_request: IncomingMessage, response: ServerResponse, document: unknown, headers: Record<string, string> = {}) {
  response.writeHead(200, { "content-type": "application/json", "cache-control": "max-age=60", ...headers })
  response.end(JSON.stringify(document))
}

test("CIMD completes authorize and token flow, advertises support, and caches metadata", async () => {
  let requests = 0
  const local = await startCimdServer((request, response) => {
    requests++
    void readClientMetadata(request, response, metadata())
  })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  const app = await startApp({ enabled: true, fetcher })
  try {
    const metadataResponse = await fetch(`${app.base}/.well-known/oauth-authorization-server`)
    assert.equal((await metadataResponse.json() as { client_id_metadata_document_supported?: boolean }).client_id_metadata_document_supported, true)

    const verifier = randomBytes(32).toString("base64url")
    const authorize = await fetch(authorizationUrl(app.base, CLIENT_ID, CALLBACK, verifier), { redirect: "manual" })
    assert.equal(authorize.status, 200)
    const html = await authorize.text()
    assert.match(html, /CIMD Test Client/)
    assert.equal(requests, 1)

    const loginId = /name="login_id" value="([^"]+)"/.exec(html)?.[1]
    assert.ok(loginId)
    const login = await fetch(`${app.base}/polarion-login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ login_id: loginId as string, token: "accepted-pat" }),
      redirect: "manual",
    })
    assert.equal(login.status, 302)
    const code = new URL(login.headers.get("location") as string).searchParams.get("code")
    assert.ok(code)

    const tokens = await fetch(`${app.base}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: CLIENT_ID, code: code as string, code_verifier: verifier, redirect_uri: CALLBACK }),
    })
    assert.equal(tokens.status, 200)
    assert.ok((await tokens.json() as { access_token?: string }).access_token)
    assert.equal(requests, 1, "authorization and token lookup reuse the cached document")
  } finally {
    await app.close()
    await local.close()
  }
})

test("CIMD is rejected while disabled and the injected fetcher is not called", async () => {
  let fetches = 0
  const app = await startApp({ fetcher: async () => { fetches++; return metadata() } })
  try {
    const res = await fetch(authorizationUrl(app.base, CLIENT_ID, CALLBACK, "v".repeat(43)), { redirect: "manual" })
    assert.equal(res.status, 400)
    assert.equal(fetches, 0)
    const discovery = await fetch(`${app.base}/.well-known/oauth-authorization-server`)
    assert.equal((await discovery.json() as { client_id_metadata_document_supported?: boolean }).client_id_metadata_document_supported, false)
  } finally {
    await app.close()
  }
})

test("CIMD rejects redirects absent from its document and documents outside the redirect allowlist", async () => {
  const local = await startCimdServer((_request, response) => { void readClientMetadata(_request, response, metadata()) })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  const app = await startApp({ enabled: true, fetcher })
  const disallowed = await startApp({ enabled: true, fetcher, allowedRedirectUris: ["https://other.example/callback"] })
  try {
    assert.equal((await fetch(authorizationUrl(app.base, CLIENT_ID, "https://other.example/callback", "v".repeat(43)), { redirect: "manual" })).status, 400)
    assert.equal((await fetch(authorizationUrl(disallowed.base, CLIENT_ID, CALLBACK, "v".repeat(43)), { redirect: "manual" })).status, 400)
  } finally {
    await app.close()
    await disallowed.close()
    await local.close()
  }
})

test("CIMD loopback authorization requires the exact callback URI from its document", async () => {
  const loopbackCallback = "http://localhost:8787/callback"
  const local = await startCimdServer((request, response) => { void readClientMetadata(request, response, metadata(CLIENT_ID, [loopbackCallback])) })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  const app = await startApp({ enabled: true, fetcher, allowedRedirectUris: [loopbackCallback] })
  try {
    assert.equal((await fetch(authorizationUrl(app.base, CLIENT_ID, loopbackCallback, "v".repeat(43)), { redirect: "manual" })).status, 200)
    assert.equal((await fetch(authorizationUrl(app.base, CLIENT_ID, "http://localhost:9999/callback", "v".repeat(43)), { redirect: "manual" })).status, 400)
  } finally {
    await app.close()
    await local.close()
  }
})

test("CIMD metadata prefetch is rate-limited before the SDK authorize handler", async () => {
  let requests = 0
  const registeredLoopback = "http://localhost:8787/callback"
  const local = await startCimdServer((request, response) => {
    requests++
    void readClientMetadata(request, response, metadata(CLIENT_ID, [registeredLoopback]), { "cache-control": "no-store" })
  })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  const app = await startApp({ enabled: true, fetcher, allowedRedirectUris: [registeredLoopback] })
  try {
    let lastStatus = 0
    for (let attempt = 0; attempt < 101; attempt++) {
      const response = await fetch(authorizationUrl(app.base, CLIENT_ID, "http://localhost:9999/callback", "v".repeat(43)), { redirect: "manual" })
      lastStatus = response.status
      await response.arrayBuffer()
    }
    assert.equal(lastStatus, 429)
    assert.equal(requests, 100, "the extra denied request must not fetch its metadata document")
  } finally {
    await app.close()
    await local.close()
  }
})

test("CIMD rejects non-HTTPS, non-443, and userinfo client identifiers", async () => {
  for (const clientId of [
    "http://client.example/client.json",
    "https://client.example:444/client.json",
    "https://user@client.example/client.json",
  ]) {
    await assert.rejects(fetchClientMetadataDocument(clientId), /client identifier URL/i, clientId)
  }
})

test("CIMD SSRF guard rejects special addresses and every private DNS answer", async () => {
  const blocked = [
    "127.0.0.1", "10.2.3.4", "169.254.169.254", "100.64.0.1", "224.0.0.1", "0.0.0.0",
    "::1", "fc00::1", "fe80::1", "ff02::1", "::", "::ffff:127.0.0.1",
  ]
  for (const address of blocked) {
    await assert.rejects(fetchClientMetadataDocument("https://client.example/client.json", {
      resolver: async () => [{ address, family: address.includes(":") ? 6 : 4 }],
    }), /non-public address/i, address)
  }
  await assert.rejects(fetchClientMetadataDocument("https://client.example/client.json", {
    resolver: async () => [{ address: "8.8.8.8", family: 4 }, { address: "192.168.1.4", family: 4 }],
  }), /non-public address/i, "one unsafe DNS answer rejects the entire hostname")

  for (const host of ["2130706433", "0x7f000001", "0177.0.0.1", "127.1"]) {
    await assert.rejects(fetchClientMetadataDocument(`https://${host}/client.json`), /non-public address/i, host)
  }
})

test("CIMD SSRF guard rejects additional special-purpose IPv4 and IPv6 CIDRs", () => {
  const blocked = [
    "198.18.0.1", "192.31.196.1", "192.52.193.1", "192.175.48.1", "192.0.0.1",
    "192.0.2.1", "198.51.100.1", "203.0.113.1", "240.0.0.1",
    "64:ff9b:1::1", "100::1", "2001:10::1", "2001:20::1", "5f00::1",
    "2620:4f:8000::1", "3fff::1", "2001:db8::1",
  ]
  for (const address of blocked) assert.equal(isPublicCimdAddress(address), false, address)
  for (const address of blocked.slice(0, 9)) {
    const mapped = `::ffff:${address}`
    assert.equal(isPublicCimdAddress(mapped), false, mapped)
  }
})

test("CIMD fetches cap global concurrency, deduplicate URLs, and cache failures", async () => {
  let requests = 0
  let active = 0
  let maxActive = 0
  const local = await startCimdServer((request, response) => {
    requests++
    active++
    maxActive = Math.max(maxActive, active)
    const clientId = `https://127.0.0.1${request.url}`
    setTimeout(() => {
      active--
      void readClientMetadata(request, response, metadata(clientId))
    }, 50)
  })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  try {
    const distinct = await Promise.allSettled(Array.from({ length: 50 }, (_, index) => fetcher(`https://127.0.0.1/client-${index}.json`)))
    assert.ok(maxActive <= 8, `observed ${maxActive} active fetches`)
    assert.equal(distinct.filter(result => result.status === "fulfilled").length, 8)
    assert.equal(requests, 8)

    requests = 0
    const same = await Promise.all(Array.from({ length: 20 }, () => fetcher("https://127.0.0.1/shared.json")))
    assert.equal(same.length, 20)
    assert.equal(requests, 1, "concurrent calls for one URL share an in-flight request")
  } finally {
    await local.close()
  }

  let failures = 0
  const failingServer = await startCimdServer((_request, response) => {
    failures++
    response.writeHead(503, { "content-type": "application/json" })
    response.end("{}")
  })
  const failingFetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: failingServer.port })
  try {
    await assert.rejects(failingFetcher(CLIENT_ID))
    await assert.rejects(failingFetcher(CLIENT_ID))
    assert.equal(failures, 1, "failed fetch is negatively cached")
  } finally {
    await failingServer.close()
  }
})

test("CIMD no-store metadata is fetched once during loopback authorize precheck and SDK handling", async () => {
  let requests = 0
  const callback = "http://localhost:8787/callback"
  const local = await startCimdServer((request, response) => {
    requests++
    void readClientMetadata(request, response, metadata(CLIENT_ID, [callback]), { "cache-control": "no-store" })
  })
  const fetcher = createCimdMetadataFetcher({ testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port })
  const app = await startApp({ enabled: true, fetcher, allowedRedirectUris: [callback] })
  try {
    const response = await fetch(authorizationUrl(app.base, CLIENT_ID, callback, "v".repeat(43)), { redirect: "manual" })
    assert.equal(response.status, 200)
    await response.arrayBuffer()
    assert.equal(requests, 1)
  } finally {
    await app.close()
    await local.close()
  }
})

test("CIMD rejects redirects, wrong content type, mismatched identity, and secret auth methods", async () => {
  for (const location of ["https://127.0.0.1/internal", "http://example.com/client.json"]) {
    const local = await startCimdServer((_request, response) => {
      response.writeHead(302, { location })
      response.end()
    })
    try {
      await assert.rejects(fetchClientMetadataDocument(CLIENT_ID, { testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port }), /redirect|200/i)
    } finally {
      await local.close()
    }
  }

  const cases: Array<{ body: unknown; headers?: Record<string, string>; error: RegExp }> = [
    { body: metadata(), headers: { "content-type": "text/plain" }, error: /content-type/i },
    { body: metadata("https://other.example/client.json"), error: /client_id/i },
    { body: metadata(CLIENT_ID, []), error: /redirect_uris/i },
    { body: { ...metadata(), token_endpoint_auth_method: "client_secret_basic" }, error: /token_endpoint_auth_method/i },
    { body: { ...metadata(), token_endpoint_auth_method: "private_key_jwt" }, error: /token_endpoint_auth_method/i },
    { body: { ...metadata(), client_secret: "secret" }, error: /client_secret/i },
  ]
  for (const entry of cases) {
    const local = await startCimdServer((request, response) => { void readClientMetadata(request, response, entry.body, entry.headers) })
    try {
      await assert.rejects(fetchClientMetadataDocument(CLIENT_ID, { testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: local.port }), entry.error)
    } finally {
      await local.close()
    }
  }
})

test("CIMD rejects oversized and slow streamed documents", async () => {
  const oversized = await startCimdServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" })
    response.end(" ".repeat(65_537))
  })
  try {
    await assert.rejects(fetchClientMetadataDocument(CLIENT_ID, { testOnlyAllowPrivateIps: true, testOnlyCa: CERT, testOnlyConnectPort: oversized.port }), /64 KiB|too large/i)
  } finally {
    await oversized.close()
  }

  const slow = await startCimdServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" })
    response.write('{"client_id":')
  })
  try {
    await assert.rejects(fetchClientMetadataDocument(CLIENT_ID, {
      testOnlyAllowPrivateIps: true,
      testOnlyCa: CERT,
      testOnlyConnectPort: slow.port,
      testOnlyTimeoutMs: 50,
    }), /timed out/i)
  } finally {
    await slow.close()
  }
})
