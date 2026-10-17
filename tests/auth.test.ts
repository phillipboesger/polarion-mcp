import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import { acquireOAuth2Token } from "../src/auth.js"

test("OAuth2 client credentials are read from OAUTH_CLIENT_ID_<SCHEME>, the names the executor checks", async () => {
  const seen: string[] = []
  const server = createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      seen.push(body)
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ access_token: "issued", expires_in: 3600 }))
    })
  })
  server.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  process.env.OAUTH_CLIENT_ID_MY_SCHEME = "id-1"
  process.env.OAUTH_CLIENT_SECRET_MY_SCHEME = "secret-1"
  try {
    const tokenUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/token`
    const token = await acquireOAuth2Token("my-scheme", { flows: { clientCredentials: { tokenUrl } } })
    assert.equal(token, "issued")
    assert.equal(seen.length, 1)
  } finally {
    delete process.env.OAUTH_CLIENT_ID_MY_SCHEME
    delete process.env.OAUTH_CLIENT_SECRET_MY_SCHEME
    server.close()
  }
})
