import test from "node:test"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import axios from "axios"

// Each test file runs in its own process, so API_BASE_URL can point at a stub
// Polarion before oauth.js reads it at import time.
// Captured from GET /users on Polarion 2506; reused for permission-denied tool responses.
const permissionDenied = JSON.parse(readFileSync("tests/fixtures/polarion-permission-denied.json", "utf8"))
const SECRET_PAT = "secret-pat-value"
const STATUS: Record<string, number> = { ok: 200, created: 201, revoked: 401, projectOnly: 200, forbidden: 403, unsupported: 404, html403: 403, empty403: 403, mismatch403: 403, redirect: 302, broken: 400, empty: 500, html: 200, textjson: 200, noType: 200, mixedcase: 200, malformed: 200, blank: 200, errorjson: 200, errorsWithData: 200, noData: 200, invalidData: 200, noTypeField: 200, noIdField: 200, numberType: 200, numberId: 200, nullMetadata: 200, primitiveMetadata: 200, arrayMetadata: 200, wrongTopLevel: 200 }
const observed: Array<{ url: string; authorization: string | undefined }> = []
const polarion = createServer((req, res) => {
  observed.push({ url: req.url ?? "", authorization: req.headers.authorization })
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "").replace(SECRET_PAT, "")
  if (token === "projectOnly" && req.url === "/polarion/rest/v1/projects/drivepilot") {
    res.writeHead(200, { "content-type": "application/json" })
    res.end(JSON.stringify({ data: { type: "projects", id: "drivepilot" } }))
    return
  }
  const status = token === "projectOnly" && req.url !== "/polarion/rest/v1/metadata" ? 403 : STATUS[token] ?? 500
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
    res.end(JSON.stringify(token === "ok" || (token === "projectOnly" && status === 200) ? { data: { type: "metadata", id: "metadata" } }
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

test.after(() => polarion.close())

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

test("a failed check logs safe status and category, never upstream detail or secrets", async () => {
  const { log } = await check(`${SECRET_PAT}broken`)
  assert.match(log, /Polarion token probe GET \/metadata failed: request_rejected HTTP 400/)
  assert.doesNotMatch(log, /No access/)
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
      assert.match(result.diagnostic.message, /^Polarion token probe GET \/metadata:/)
      assert.ok(result.diagnostic.action.length > 0)
      assert.deepEqual((await probePolarionToken(`${SECRET_PAT}${token}`)), result, "diagnostics are deterministic")
      assert.doesNotMatch(JSON.stringify(result.diagnostic), new RegExp(SECRET_PAT))
    }
  }
  assert.deepEqual(await probePolarionToken(`${SECRET_PAT}ok`), { valid: true })
})

test("network and TLS errors are safely classified without leaking Axios text", async () => {
  const originalGet = axios.get
  try {
    const cases = [
      ["ENOTFOUND", "dns", true], ["ETIMEDOUT", "timeout", true],
      ["ECONNREFUSED", "connection_refused", true], ["CERT_AUTHORITY_INVALID", "tls_trust", false],
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

test("redirects and unsupported endpoints cannot authenticate a PAT or trigger a fallback", async () => {
  for (const mode of ["redirect", "unsupported"]) {
    observed.length = 0
    assert.equal((await check(`${SECRET_PAT}${mode}`)).result, "unavailable", mode)
    assert.equal(observed.length, 1)
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
