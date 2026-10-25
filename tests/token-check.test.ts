import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

// Each test file runs in its own process, so API_BASE_URL can point at a stub
// Polarion before oauth.js reads it at import time.
const SECRET_PAT = "secret-pat-value"
const STATUS: Record<string, number> = { ok: 200, created: 201, revoked: 401, unlicensed: 403, broken: 400, empty: 500, html: 200, malformed: 200, blank: 200, errorjson: 200, noData: 200, invalidData: 200 }
const observed: Array<{ url: string; authorization: string | undefined }> = []
const polarion = createServer((req, res) => {
  observed.push({ url: req.url ?? "", authorization: req.headers.authorization })
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "").replace(SECRET_PAT, "")
  const status = STATUS[token] ?? 500
  if (token === "html") {
    res.writeHead(status, { "content-type": "text/html; charset=utf-8" })
    res.end("<html><form>SSO login</form></html>")
  } else if (token === "malformed") {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" })
    res.end("{ malformed")
  } else if (token === "blank") {
    res.writeHead(status, { "content-type": "application/json" })
    res.end()
  } else {
    res.writeHead(status, { "content-type": token === "created" ? "application/vnd.api+json; charset=utf-8" : "application/json; charset=utf-8" })
    res.end(JSON.stringify(token === "ok" ? { data: [] }
      : token === "created" ? { data: [{ type: "project", id: "demo", links: {} }] }
        : token === "errorjson" ? { errors: [{ title: "proxy error" }] }
          : token === "noData" ? { message: "login required" }
            : token === "invalidData" ? { data: [{ message: "not a project" }] }
            : status === 500 ? null : { errors: [{ status: String(status), detail: `No access for\n user (${status})` }] }))
  }
})
polarion.listen(0, "127.0.0.1")
await new Promise<void>((resolve) => polarion.once("listening", () => resolve()))
process.env.API_BASE_URL = `http://127.0.0.1:${(polarion.address() as AddressInfo).port}/polarion/rest/v1`
const { validatePolarionToken } = await import("../src/oauth.js")

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
  assert.equal((await check(`${SECRET_PAT}created`)).result, true, "a project list with sparse project objects is accepted")
  assert.equal((await check(`${SECRET_PAT}revoked`)).result, false)
  assert.equal((await check(`${SECRET_PAT}unlicensed`)).result, "forbidden")
  assert.equal((await check(`${SECRET_PAT}broken`)).result, "unavailable")
  assert.equal((await check(`${SECRET_PAT}empty`)).result, "unavailable", "missing error details must not throw or accept")
})

test("successful HTTP responses require a usable projects JSON body", async () => {
  for (const mode of ["html", "malformed", "blank", "errorjson", "noData", "invalidData"]) {
    assert.equal((await check(`${SECRET_PAT}${mode}`)).result, "unavailable", `${mode} response must not authenticate a PAT`)
  }
  assert.equal((await check(`${SECRET_PAT}ok`)).result, true, "an empty project list is a valid authenticated response")
})

test("the token check sends a bearer and requests one Polarion page", async () => {
  observed.length = 0
  assert.equal((await check(`${SECRET_PAT}ok`)).result, true)
  const request = observed.at(-1)
  assert.ok(request)
  assert.equal(request.authorization, `Bearer ${SECRET_PAT}ok`)
  assert.equal(new URL(request.url, "http://polarion").searchParams.get("page[size]"), "1")
})

test("a failed check logs status and Polarion's detail, never the token", async () => {
  const { log } = await check(`${SECRET_PAT}unlicensed`)
  assert.match(log, /HTTP 403 - No access for user \(403\)/)
  assert.doesNotMatch(log, new RegExp(SECRET_PAT))
  assert.equal((await check(`${SECRET_PAT}ok`)).log, "", "a successful check logs nothing")
})
