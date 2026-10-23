import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

// Each test file runs in its own process, so API_BASE_URL can point at a stub
// Polarion before oauth.js reads it at import time.
const SECRET_PAT = "secret-pat-value"
const STATUS: Record<string, number> = { ok: 200, revoked: 401, unlicensed: 403, broken: 400 }
const polarion = createServer((req, res) => {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "").replace(SECRET_PAT, "")
  const status = STATUS[token] ?? 500
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(status === 200 ? { data: [] } : { errors: [{ status: String(status), detail: `No access for\n user (${status})` }] }))
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
  assert.equal((await check(`${SECRET_PAT}revoked`)).result, false)
  assert.equal((await check(`${SECRET_PAT}unlicensed`)).result, "forbidden")
  assert.equal((await check(`${SECRET_PAT}broken`)).result, "unavailable")
})

test("a failed check logs status and Polarion's detail, never the token", async () => {
  const { log } = await check(`${SECRET_PAT}unlicensed`)
  assert.match(log, /HTTP 403 - No access for user \(403\)/)
  assert.doesNotMatch(log, new RegExp(SECRET_PAT))
  assert.equal((await check(`${SECRET_PAT}ok`)).log, "", "a successful check logs nothing")
})
