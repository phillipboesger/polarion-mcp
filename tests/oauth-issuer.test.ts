import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createMcpHttpApp } from "../src/mcp-http-server.js"

test("authorization responses identify the metadata issuer for registered callbacks", async () => {
  for (const publicUrl of ["https://server.example", "https://server.example/prefix/"]) {
    const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL(publicUrl), validateToken: async () => true })
    const server = app.listen(0, "127.0.0.1")
    await new Promise<void>(resolve => server.once("listening", resolve))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      const metadata = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json() as { issuer: string; authorization_response_iss_parameter_supported: boolean }
      assert.equal(metadata.issuer, new URL(publicUrl).href)
      assert.equal(metadata.authorization_response_iss_parameter_supported, true)
      const callback = "https://client.example/callback?keep=yes&iss=forged&iss=again"
      const registration = await fetch(`${base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirect_uris: [callback], token_endpoint_auth_method: "none" }) })
      assert.equal(registration.status, 201)
      const { client_id } = await registration.json() as { client_id: string }
      const url = new URL(`${base}/authorize`)
      for (const [key, value] of Object.entries({ client_id, redirect_uri: callback, response_type: "code", code_challenge: "x".repeat(43), code_challenge_method: "S256", state: "s" })) url.searchParams.set(key, value)
      const page = await fetch(url, { redirect: "manual" })
      assert.equal(page.status, 200)
      assert.equal(page.headers.get("location"), null)
      const id = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1]
      assert.ok(id)
      const login = await fetch(`${base}/polarion-login`, { method: "POST", body: new URLSearchParams({ login_id: id, token: "token" }), redirect: "manual" })
      assert.equal(login.status, 302)
      const target = new URL(login.headers.get("location")!)
      assert.ok(target.searchParams.get("code"))
      assert.equal(target.searchParams.get("state"), "s")
      assert.equal(target.searchParams.get("keep"), "yes")
      assert.deepEqual(target.searchParams.getAll("iss"), [metadata.issuer])
      url.searchParams.set("response_type", "invalid")
      const error = await fetch(url, { redirect: "manual" })
      assert.equal(error.status, 302)
      const errorTarget = new URL(error.headers.get("location")!)
      assert.equal(errorTarget.searchParams.get("error"), "invalid_request")
      assert.equal(errorTarget.searchParams.get("keep"), "yes")
      assert.deepEqual(errorTarget.searchParams.getAll("iss"), [metadata.issuer])
      for (const [key, value] of [["client_id", "unknown"], ["redirect_uri", "https://attacker.example/"]]) {
        const invalid = new URL(url); invalid.searchParams.set(key, value)
        const response = await fetch(invalid, { redirect: "manual" })
        assert.equal(response.status, 400)
        assert.equal(response.headers.get("location"), null)
      }
      url.searchParams.set("response_type", "code")
      url.searchParams.set("resource", "https://other.example/mcp")
      const denial = await fetch(url, { redirect: "manual" })
      assert.equal(denial.status, 302)
      assert.deepEqual(new URL(denial.headers.get("location")!).searchParams.getAll("iss"), [metadata.issuer])
    } finally {
      await closeAllSessions()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  }
})
