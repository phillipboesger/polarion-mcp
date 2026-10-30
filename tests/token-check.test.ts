import test from "node:test"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { createHash, randomBytes } from "node:crypto"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import axios from "axios"

// Each test file runs in its own process, so API_BASE_URL can point at a stub
// Polarion before oauth.js reads it at import time.
// Captured from GET /users on Polarion 2506; reused for permission-denied tool responses.
const permissionDenied = JSON.parse(readFileSync("tests/fixtures/polarion-permission-denied.json", "utf8"))
const SECRET_PAT = "secret-pat-value"
let rejectRecoveryToken = true
const STATUS: Record<string, number> = { ok: 200, created: 201, revoked: 401, projectOnly: 200, forbidden: 403, unsupported: 404, html403: 403, empty403: 403, mismatch403: 403, redirect: 302, broken: 400, empty: 500, html: 200, textjson: 200, noType: 200, mixedcase: 200, malformed: 200, blank: 200, errorjson: 200, errorsWithData: 200, noData: 200, invalidData: 200, noTypeField: 200, noIdField: 200, numberType: 200, numberId: 200, nullMetadata: 200, primitiveMetadata: 200, arrayMetadata: 200, wrongTopLevel: 200 }
const observed: Array<{ url: string; authorization: string | undefined }> = []
const polarion = createServer((req, res) => {
  observed.push({ url: req.url ?? "", authorization: req.headers.authorization })
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "").replace(SECRET_PAT, "")
  if (token.startsWith("legacy")) {
    // Polarion before 2512: no /metadata; /projects answers according to the token.
    const path = new URL(req.url ?? "", "http://polarion").pathname
    if (path.endsWith("/metadata") || token === "legacyNothing") {
      res.writeHead(404, { "content-type": "application/json" })
      res.end(JSON.stringify({ errors: [{ status: "404", detail: "Not Found" }] }))
    } else if (token === "legacyHtml") {
      res.writeHead(200, { "content-type": "text/html" })
      res.end("<html>SSO login</html>")
    } else if (token === "legacyServerError" || token === "legacyRedirect" || token === "legacyBroken") {
      const status = token === "legacyServerError" ? 500 : token === "legacyRedirect" ? 302 : 400
      res.writeHead(status, token === "legacyRedirect" ? { location: "/login" } : { "content-type": "application/json" })
      res.end(status === 302 ? undefined : JSON.stringify({ errors: [{ status: String(status), detail: `fail ${(req.headers.authorization ?? "").replace("Bearer ", "")}` }] }))
    } else if (token === "legacyText" || token === "legacyErrorsAndData" || token === "legacyEmptyList") {
      res.writeHead(200, { "content-type": token === "legacyText" ? "text/plain" : "application/json" })
      res.end(JSON.stringify(token === "legacyErrorsAndData" ? { errors: [{ title: "x" }], data: [] } : token === "legacyEmptyList" ? { data: [] } : { data: [] }))
    } else if (token === "legacyEmptyObject") {
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ data: { type: "projects", id: "x" } }))
    } else {
      const status = token === "legacyRevoked" ? 401 : token === "legacyForbidden" ? 403 : 200
      res.writeHead(status, { "content-type": "application/json" })
      res.end(JSON.stringify(status === 200 ? { data: [{ type: "projects", id: "demo" }] } : { errors: [{ status: String(status), detail: "denied" }] }))
    }
    return
  }
  if (token === "projectOnly" && req.url === "/polarion/rest/v1/projects/drivepilot") {
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ data: { type: "projects", id: "drivepilot" } }))
    return
  }
  const status = token === "recover" ? (rejectRecoveryToken ? 400 : 200) : token === "projectOnly" && req.url !== "/polarion/rest/v1/metadata" ? 403 : STATUS[token] ?? 500
  if (token === "redirect") {
    res.writeHead(302, { location: "/login" })
    res.end()
  } else if (token === "html" || token === "html403") {
    res.writeHead(status, { "content-type": "text/html; charset=utf-8" })
    res.end("<html><form>SSO login</form></html>")
  } else if (token === "textjson" || token === "noType" || token === "mixedcase") {
    const headers = token === "textjson" ? { "content-type": "text/plain; charset=utf-8" }
      : token === "mixedcase" ? { "content-type": "Application/Vnd.Api+JSON; Charset=UTF-8" } : {}
    res.writeHead(status, headers)
    res.end(JSON.stringify({ data: { type: "metadata", id: "metadata" } }))
  } else if (token === "malformed") {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" })
    res.end("{ malformed")
  } else if (token === "blank") {
    res.writeHead(status, { "content-type": "application/json" })
    res.end()
  } else {
    res.writeHead(status, { "content-type": token === "created" ? "application/vnd.api+json; charset=utf-8" : "application/json; charset=utf-8" })
    res.end(JSON.stringify(token === "ok" || (token === "projectOnly" && status === 200) || (token === "recover" && status === 200) ? { data: { type: "metadata", id: "metadata" } }
      : token === "created" ? { data: { type: "metadata", id: "metadata", links: {} } }
      : status === 403 ? permissionDenied
      : token === "empty403" ? { errors: [] }
      : token === "mismatch403" ? { errors: [{ status: "401" }] }
      : token === "errorjson" ? { errors: [{ title: "proxy error" }] }
          : token === "errorsWithData" ? { errors: [{ title: "proxy error" }], data: [] }
          : token === "noData" ? { message: "login required" }
            : token === "wrongTopLevel" ? { data: { type: "projects", id: "demo" } }
              : token === "noTypeField" ? { data: { id: "metadata" } }
                : token === "noIdField" ? { data: { type: "metadata" } }
                  : token === "numberType" ? { data: { type: 1, id: "metadata" } }
                    : token === "numberId" ? { data: { type: "metadata", id: 1 } }
                      : token === "nullMetadata" ? { data: null }
                        : token === "primitiveMetadata" ? { data: "metadata" }
                          : token === "arrayMetadata" ? { data: [[{ type: "metadata", id: "viewer" }]] }
            : token === "invalidData" ? { data: [{ message: "not a user" }] }
            : status === 500 ? null : { errors: [{ status: String(status), detail: `No access for\n user (${status})` }] }))
  }
})
polarion.listen(0, "127.0.0.1")
await new Promise<void>((resolve) => polarion.once("listening", () => resolve()))
process.env.API_BASE_URL = `http://127.0.0.1:${(polarion.address() as AddressInfo).port}/polarion/rest/v1`
const { probePolarionToken, validatePolarionToken } = await import("../src/oauth.js")
const { upstreamDetail } = await import("../src/token-diagnostics.js")

test.after(() => polarion.close())

test("the default direct-PAT MCP validator exposes safe metadata diagnostics", async () => {
  const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
  const { app, closeAllSessions } = createMcpHttpApp()
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  try {
    const cases = [
      ["broken", 503, "request_rejected"], ["unsupported", 503, "endpoint_missing"],
      ["forbidden", 403, "permission_denied"], ["revoked", 401, "invalid_pat"],
      ["redirect", 503, "redirect"], ["html", 503, "unusable_response"], ["empty", 503, "server_error"],
    ] as const
    for (const [token, status, category] of cases) {
      const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${SECRET_PAT}${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } }),
      })
      assert.equal(response.status, status, category)
      assert.equal(response.headers.get("mcp-session-id"), null, "a failed probe must not open a session")
      const body = await response.json() as { error: { message: string } }
      assert.match(body.error.message, new RegExp(`^\\[${category}`))
      assert.match(body.error.message, /GET \/(metadata|projects)/)
      if (token === "broken" || token === "unsupported") assert.match(body.error.message, /API_BASE_URL/)
      assert.doesNotMatch(body.error.message, /secret-pat-value|No access for/)
    }
  } finally {
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test("the default OAuth login keeps request/configuration failures retryable", async () => {
  rejectRecoveryToken = true
  const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
  const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL("http://127.0.0.1"), tokenSecret: "test-token-secret-long-enough-for-oauth" })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`
  try {
    const registration = await fetch(`${base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Test", redirect_uris: ["https://client.example/callback"], token_endpoint_auth_method: "none" }) })
    const { client_id } = await registration.json() as { client_id: string }
    const verifier = randomBytes(32).toString("base64url")
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const authorize = new URL(`${base}/authorize`)
    for (const [key, value] of Object.entries({ response_type: "code", client_id, redirect_uri: "https://client.example/callback", code_challenge: challenge, code_challenge_method: "S256", state: "state" })) authorize.searchParams.set(key, value)
    const page = await fetch(authorize)
    const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
    const submit = () => fetch(`${base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: `${SECRET_PAT}recover` }), redirect: "manual" })
    const failed = await submit()
    assert.equal(failed.status, 400)
    const failedHtml = await failed.text()
    assert.match(failedHtml, /request_rejected/)
    assert.match(failedHtml, /API_BASE_URL/)
    assert.match(failedHtml, /name="login_id"/)
    assert.doesNotMatch(failedHtml, /secret-pat-value|No access for/)
    rejectRecoveryToken = false
    const succeeded = await submit()
    assert.equal(succeeded.status, 302)
    const code = new URL(succeeded.headers.get("location") as string).searchParams.get("code") as string
    const tokensResponse = await fetch(`${base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id, redirect_uri: "https://client.example/callback", code_verifier: verifier }) })
    assert.equal(tokensResponse.status, 200)
    const tokens = await tokensResponse.json() as { refresh_token: string }
    rejectRecoveryToken = true
    const refreshed = await fetch(`${base}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id }) })
    assert.equal(refreshed.status, 500)
    const refreshBody = await refreshed.json() as { error: string; error_description: string }
    assert.notEqual(refreshBody.error, "invalid_grant")
    assert.match(refreshBody.error_description, /request_rejected.*API_BASE_URL/)
    assert.doesNotMatch(refreshBody.error_description, /secret-pat-value|No access for/)
  } finally {
    rejectRecoveryToken = true
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test("the default Custom GPT refresh preserves configuration failures", async () => {
  rejectRecoveryToken = false
  const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
  const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL("http://127.0.0.1"), tokenSecret: "test-token-secret-long-enough-for-oauth", gptClient: { clientId: "test-gpt", clientSecret: "test-gpt-secret-long-enough" } })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`
  try {
    const authorize = new URL(`${base}/gpt/authorize`)
    for (const [key, value] of Object.entries({ response_type: "code", client_id: "test-gpt", redirect_uri: "https://chatgpt.com/aip/test/oauth/callback", state: "state" })) authorize.searchParams.set(key, value)
    const page = await fetch(authorize)
    const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
    const submitted = await fetch(`${base}/polarion-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ login_id: loginId, token: `${SECRET_PAT}recover` }), redirect: "manual" })
    assert.equal(submitted.status, 302)
    const code = new URL(submitted.headers.get("location") as string).searchParams.get("code") as string
    const credentials = Buffer.from("test-gpt:test-gpt-secret-long-enough").toString("base64")
    const form = (values: Record<string, string>) => new URLSearchParams({ client_id: "test-gpt", client_secret: "test-gpt-secret-long-enough", ...values })
    const exchange = await fetch(`${base}/gpt/token`, { method: "POST", headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" }, body: form({ grant_type: "authorization_code", code, redirect_uri: "https://chatgpt.com/aip/test/oauth/callback" }) })
    assert.equal(exchange.status, 200)
    const tokens = await exchange.json() as { refresh_token: string }
    rejectRecoveryToken = true
    const refreshed = await fetch(`${base}/gpt/token`, { method: "POST", headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" }, body: form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }) })
    assert.equal(refreshed.status, 500)
    const refreshBody = await refreshed.json() as { error: string; error_description: string }
    assert.notEqual(refreshBody.error, "invalid_grant")
    assert.match(refreshBody.error_description, /request_rejected.*API_BASE_URL/)
    assert.doesNotMatch(refreshBody.error_description, /secret-pat-value|No access for/)
  } finally {
    rejectRecoveryToken = true
    await closeAllSessions()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

/** Runs a token check and returns its result plus what it logged. */
async function check(token: string) {
  const logged: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => { logged.push(args.join(" ")) }
  try {
    return { result: await validatePolarionToken(token), log: logged.join("\n") }
  } finally {
    console.error = original
  }
}

test("Polarion's answer maps to accepted, rejected, forbidden or unavailable", async () => {
  assert.equal((await check(`${SECRET_PAT}ok`)).result, true)
  assert.equal((await check(`${SECRET_PAT}created`)).result, true, "metadata with sparse fields is accepted")
  assert.equal((await check(`${SECRET_PAT}revoked`)).result, false)
  assert.equal((await check(`${SECRET_PAT}forbidden`)).result, "forbidden")
  assert.equal((await check(`${SECRET_PAT}broken`)).result, "unavailable")
  assert.equal((await check(`${SECRET_PAT}empty`)).result, "unavailable", "missing error details must not throw or accept")
})

test("successful HTTP responses require a usable metadata JSON body", async () => {
  for (const mode of ["html", "textjson", "noType", "malformed", "blank", "errorjson", "errorsWithData", "noData", "invalidData", "wrongTopLevel", "noTypeField", "noIdField", "numberType", "numberId", "nullMetadata", "primitiveMetadata", "arrayMetadata"]) {
    assert.equal((await check(`${SECRET_PAT}${mode}`)).result, "unavailable", `${mode} response must not authenticate a PAT`)
  }
  assert.equal((await check(`${SECRET_PAT}ok`)).result, true, "metadata is a valid authenticated response")
  assert.equal((await check(`${SECRET_PAT}created`)).result, true, "metadata links are optional")
  assert.equal((await check(`${SECRET_PAT}mixedcase`)).result, true, "JSON media type matching is case-insensitive and permits parameters")
})

test("unusable successful responses produce a safe probe warning without exposing upstream content", async () => {
  const { result, log } = await check(`${SECRET_PAT}textjson`)
  assert.equal(result, "unavailable")
  assert.match(log, /Polarion token probe GET \/metadata failed: unusable_response HTTP 200/)
  assert.doesNotMatch(log, new RegExp(SECRET_PAT))
})

test("the token check sends a bearer to metadata without querying projects", async () => {
  observed.length = 0
  assert.equal((await check(`${SECRET_PAT}ok`)).result, true)
  const request = observed.at(-1)
  assert.ok(request)
  assert.equal(request.authorization, `Bearer ${SECRET_PAT}ok`)
  assert.equal(new URL(request.url, "http://polarion").pathname, "/polarion/rest/v1/metadata")
  assert.equal(new URL(request.url, "http://polarion").search, "")
})

test("a failed check logs status, category and Polarion's message, never secrets", async () => {
  const { log } = await check(`${SECRET_PAT}broken`)
  assert.match(log, /Polarion token probe GET \/metadata failed: request_rejected HTTP 400 - No access for user \(400\)/)
  assert.doesNotMatch(log, new RegExp(SECRET_PAT))
  assert.equal((await check(`${SECRET_PAT}ok`)).log, "", "a successful check logs nothing")
})

test("the detailed probe classifies metadata HTTP outcomes deterministically", async () => {
  const cases = [
    ["revoked", "invalid_pat", 401, false], ["forbidden", "permission_denied", 403, false],
    ["broken", "request_rejected", 400, false], ["unsupported", "endpoint_missing", 404, false],
    ["redirect", "redirect", 302, false], ["empty", "server_error", 500, true],
    ["html", "unusable_response", 200, false],
  ] as const
  for (const [token, category, status, retryable] of cases) {
    const result = await probePolarionToken(`${SECRET_PAT}${token}`)
    assert.equal(result.valid, false, token)
    if (!result.valid) {
      assert.equal(result.diagnostic.category, category)
      assert.equal(result.diagnostic.upstreamStatus, status)
      assert.equal(result.diagnostic.retryable, retryable)
      assert.match(result.diagnostic.message, /^Polarion token probe GET \/(metadata|projects):/)
      assert.ok(result.diagnostic.action.length > 0)
      assert.deepEqual((await probePolarionToken(`${SECRET_PAT}${token}`)), result, "diagnostics are deterministic")
      assert.doesNotMatch(JSON.stringify(result.diagnostic), new RegExp(SECRET_PAT))
    }
  }
  assert.deepEqual(await probePolarionToken(`${SECRET_PAT}ok`), { valid: true })
})

test("network and TLS errors are safely classified without leaking Axios text", async () => {
  const originalGet = axios.get.bind(axios)
  try {
    const cases = [
      ["ENOTFOUND", "dns", true], ["ETIMEDOUT", "timeout", true],
      ["ECONNREFUSED", "connection_refused", true], ["CERT_AUTHORITY_INVALID", "tls_trust", false],
      ["CERT_HAS_EXPIRED", "tls_trust", false], ["CERT_NOT_YET_VALID", "tls_trust", false],
      ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "tls_trust", false],
    ] as const
    for (const [code, category, retryable] of cases) {
      axios.get = (async () => { throw Object.assign(new Error(`secret ${SECRET_PAT} https://user:pass@host/path?token=${SECRET_PAT}`), { code }) }) as typeof axios.get
      const { result, log } = await check(`${SECRET_PAT}ignored`)
      assert.equal(result, "unavailable")
      assert.match(log, new RegExp(`Polarion token probe GET \\/metadata failed: ${category}`))
      assert.doesNotMatch(log, /secret|user:pass|token=/)
      const detailed = await probePolarionToken(`${SECRET_PAT}ignored`)
      assert.equal(detailed.valid, false)
      if (!detailed.valid) {
        assert.equal(detailed.diagnostic.category, category)
        assert.equal(detailed.diagnostic.retryable, retryable)
        assert.doesNotMatch(JSON.stringify(detailed), /secret|user:pass|token=/)
      }
    }
  } finally {
    axios.get = originalGet
  }
})

test("redirects and a missing /metadata plus /projects cannot authenticate a PAT", async () => {
  observed.length = 0
  assert.equal((await check(`${SECRET_PAT}redirect`)).result, "unavailable")
  assert.equal(observed.length, 1, "a redirect never falls back")
  observed.length = 0
  assert.equal((await check(`${SECRET_PAT}legacyNothing`)).result, "unavailable")
  assert.deepEqual(observed.map(request => new URL(request.url, "http://polarion").pathname), ["/polarion/rest/v1/metadata", "/polarion/rest/v1/projects"])
  const result = await probePolarionToken(`${SECRET_PAT}legacyNothing`)
  assert.equal(result.valid, false)
  if (!result.valid) {
    assert.equal(result.diagnostic.category, "endpoint_missing")
    assert.match(result.diagnostic.message, /GET \/projects/)
  }
})

test("Polarion before 2512 falls back to /projects after a 404 from /metadata", async () => {
  observed.length = 0
  assert.equal((await check(`${SECRET_PAT}legacy`)).result, true)
  assert.deepEqual(observed.map(request => new URL(request.url, "http://polarion").pathname), ["/polarion/rest/v1/metadata", "/polarion/rest/v1/projects"])
  assert.equal(new URL(observed[1]!.url, "http://polarion").searchParams.get("page[size]"), "1")
  assert.equal(observed[1]!.authorization, `Bearer ${SECRET_PAT}legacy`)
  assert.equal((await check(`${SECRET_PAT}legacyRevoked`)).result, false, "an invalid PAT is rejected by the fallback")
  assert.equal((await check(`${SECRET_PAT}legacyForbidden`)).result, "forbidden")
  for (const mode of ["legacyHtml", "legacyEmptyObject"]) assert.equal((await check(`${SECRET_PAT}${mode}`)).result, "unavailable", `${mode} must not authenticate`)
})

test("fallback failures stay classified, never authenticate, and keep the token out of logs", async () => {
  const cases = [
    ["legacyServerError", "server_error", 500, true], ["legacyRedirect", "redirect", 302, false],
    ["legacyBroken", "request_rejected", 400, false], ["legacyText", "unusable_response", 200, false],
    ["legacyErrorsAndData", "unusable_response", 200, false],
  ] as const
  for (const [mode, category, status, retryable] of cases) {
    const result = await probePolarionToken(`${SECRET_PAT}${mode}`)
    assert.equal(result.valid, false, mode)
    if (!result.valid) {
      assert.equal(result.diagnostic.category, category, mode)
      assert.equal(result.diagnostic.upstreamStatus, status, mode)
      assert.equal(result.diagnostic.retryable, retryable, mode)
      assert.match(result.diagnostic.message, /GET \/projects/, mode)
      assert.doesNotMatch(JSON.stringify(result.diagnostic), new RegExp(SECRET_PAT))
    }
    assert.doesNotMatch((await check(`${SECRET_PAT}${mode}`)).log, new RegExp(SECRET_PAT), mode)
  }
  assert.equal((await check(`${SECRET_PAT}legacyEmptyList`)).result, true, "an empty project list is still a valid answer")
})

test("a network error on the fallback is classified and reported for /projects", async () => {
  const originalGet = axios.get.bind(axios)
  let calls = 0
  try {
    axios.get = (async (url: string, config?: unknown) => {
      if (++calls === 1) return originalGet(url, config as never)
      throw Object.assign(new Error(`secret ${SECRET_PAT}`), { code: "ECONNREFUSED" })
    }) as typeof axios.get
    const { result, log } = await check(`${SECRET_PAT}legacy`)
    assert.equal(result, "unavailable")
    assert.match(log, /GET \/projects failed: connection_refused/)
    assert.doesNotMatch(log, /secret/)
  } finally {
    axios.get = originalGet
  }
})

test("the legacy-fallback INFO line is written once per process", async () => {
  const first = await check(`${SECRET_PAT}legacy`)
  const second = await check(`${SECRET_PAT}legacy`)
  // An earlier test may already have written it; either way a repeat probe must not log it again.
  assert.equal(second.log.includes("[INFO]"), false)
  assert.equal(first.log.includes("[INFO]"), false)
})

test("a forbidden fallback explains that old releases need global REST GET, without leaking the token", async () => {
  const result = await probePolarionToken(`${SECRET_PAT}legacyForbidden`)
  assert.equal(result.valid, false)
  if (!result.valid) {
    assert.equal(result.diagnostic.category, "permission_denied")
    assert.match(result.diagnostic.message, /GET \/projects/)
    assert.match(result.diagnostic.action, /global REST GET/)
    assert.match(result.diagnostic.action, /2512/)
    assert.doesNotMatch(JSON.stringify(result.diagnostic), new RegExp(SECRET_PAT))
  }
  assert.match((await check(`${SECRET_PAT}legacyForbidden`)).log, /Polarion token probe GET \/projects failed: permission_denied HTTP 403/)
})

test("401 and 403 from /metadata are final and never reach /projects", async () => {
  for (const mode of ["revoked", "forbidden"]) {
    observed.length = 0
    await check(`${SECRET_PAT}${mode}`)
    assert.equal(observed.length, 1, mode)
    assert.equal(new URL(observed[0]!.url, "http://polarion").pathname, "/polarion/rest/v1/metadata")
  }
})

test("the real preflight permits a project user while tool permissions remain enforced", async () => {
  const { createMcpHttpApp } = await import("../src/mcp-http-server.js")
  const { app, closeAllSessions } = createMcpHttpApp()
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${SECRET_PAT}projectOnly` }
  const rpc = (body: object, session?: string) => fetch(`${base}/mcp`, {
    method: "POST", headers: { ...headers, ...(session ? { "mcp-session-id": session } : {}) }, body: JSON.stringify(body),
  })
  try {
    observed.length = 0
    const initialized = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "project-user", version: "1" } } })
    assert.equal(initialized.status, 200)
    const session = initialized.headers.get("mcp-session-id")!
    assert.ok(session)
    assert.equal(new URL(observed[0]!.url, "http://polarion").pathname, "/polarion/rest/v1/metadata")
    assert.equal(observed[0]?.authorization, headers.authorization)
    await initialized.text()
    const call = async (name: string, args: object) => {
      const response = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }, session)
      assert.equal(response.status, 200)
      const text = await response.text()
      const event = text.split("\n").find(line => line.startsWith("data:"))
      return JSON.parse(event ? event.slice(5).trim() : text).result
    }
    assert.equal((await call("getProject", { projectId: "drivepilot" })).isError, undefined)
    const denied = await call("getProjects", {})
    assert.equal(denied.isError, true)
    assert.match(denied.content[0].text, /403/)
    assert.equal(observed.at(-1)?.authorization, headers.authorization)
  } finally {
    await closeAllSessions()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test("an unreachable Polarion cannot authenticate a PAT", async () => {
  await new Promise<void>(resolve => polarion.close(() => resolve()))
  assert.equal((await check(`${SECRET_PAT}ok`)).result, "unavailable")
})

test("upstream detail is plain text for the log: tags, control characters, tokens and length are removed", () => {
  assert.equal(upstreamDetail({ errors: [{ title: "Bad title", detail: "Invalid host" }] }, SECRET_PAT), "Invalid host")
  assert.equal(upstreamDetail({ errors: [{ title: "Only title" }] }, SECRET_PAT), "Only title")
  assert.equal(upstreamDetail("<html><style>p{}</style><h1>Bad Request</h1><script>x()</script>\n<p>Invalid  Host</p></html>", SECRET_PAT), "Bad Request Invalid Host")
  assert.equal(upstreamDetail({ errors: [{ detail: `echo ${SECRET_PAT}\u001b[31m forged\nline` }] }, SECRET_PAT), "echo [token] [31m forged line")
  assert.equal(upstreamDetail("x".repeat(500), SECRET_PAT).length, 200)
  assert.equal(upstreamDetail("a\u0085b\u009bc", SECRET_PAT), "a b c", "C1 control characters are removed")
  assert.equal(upstreamDetail("abc", ""), "abc", "an empty token must not be spliced between characters")
  assert.ok(upstreamDetail("<script".repeat(50_000), SECRET_PAT).length <= 200, "huge unclosed markup stays bounded")
  for (const empty of [null, undefined, 42, [], {}, { errors: [] }, { errors: [null] }, { errors: [{ detail: 7 }] }]) assert.equal(upstreamDetail(empty, SECRET_PAT), "")
})

test("a Host-style HTML rejection reaches the log as text but not the user-facing diagnostic", async () => {
  const original = axios.get.bind(axios)
  try {
    axios.get = (async () => ({ status: 400, headers: { "content-type": "text/html" }, data: "<html><body><h1>Bad Request</h1>Invalid host header</body></html>" })) as unknown as typeof axios.get
    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { logged.push(args.join(" ")) }
    let result
    try { result = await probePolarionToken(`${SECRET_PAT}ignored`) } finally { console.error = originalError }
    assert.match(logged.join("\n"), /request_rejected HTTP 400 - Bad Request Invalid host header/)
    assert.equal(result.valid, false)
    if (!result.valid) {
      assert.match(result.diagnostic.action, /ALLOWED_HOSTS/)
      assert.doesNotMatch(JSON.stringify(result.diagnostic), /Invalid host header/)
    }
  } finally {
    axios.get = original
  }
})
