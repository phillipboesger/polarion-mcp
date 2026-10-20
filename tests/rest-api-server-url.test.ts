import test from "node:test"
import assert from "node:assert/strict"
import type { Request } from "express"

import { specServerUrl } from "../src/rest-api.js"

const requestWithHost = (host: string | undefined): Request => ({ get: (name: string) => (name.toLowerCase() === "host" ? host : undefined) }) as unknown as Request

test("a configured public URL is what the spec advertises, whatever Host header the request carries", () => {
  const url = specServerUrl({ PUBLIC_URL: "https://polarion-mcp.example.org/" }, 3000)
  assert.equal(url(requestWithHost("evil.example")), "https://polarion-mcp.example.org")
  assert.equal(url(requestWithHost(undefined)), "https://polarion-mcp.example.org")
})

test("Render's external URL is used when PUBLIC_URL is not set, and PUBLIC_URL wins over it", () => {
  assert.equal(specServerUrl({ RENDER_EXTERNAL_URL: "https://app.onrender.com" }, 3000)(requestWithHost("evil.example")), "https://app.onrender.com")
  assert.equal(specServerUrl({ PUBLIC_URL: "https://mine.example", RENDER_EXTERNAL_URL: "https://app.onrender.com" }, 3000)(requestWithHost("x")), "https://mine.example")
})

test("an unusable PUBLIC_URL stops the start instead of publishing a broken spec", () => {
  for (const bad of ["polarion-mcp.example.org", "ftp://x.example", "javascript:alert(1)", "https://user:pw@x.example", "https://x.example/?q=1"]) {
    assert.throws(() => specServerUrl({ PUBLIC_URL: bad }, 3000), /PUBLIC_URL/, bad)
  }
})

test("without a configured URL the Host header is only echoed when it is a plain host name, with http for a local one", () => {
  const url = specServerUrl({}, 3011)
  assert.equal(url(requestWithHost("mcp.example.org")), "https://mcp.example.org")
  assert.equal(url(requestWithHost("mcp.example.org:8443")), "https://mcp.example.org:8443")
  assert.equal(url(requestWithHost("localhost:3011")), "http://localhost:3011")
  assert.equal(url(requestWithHost("127.0.0.1:3011")), "http://127.0.0.1:3011")
  // Anything that is not host[:port] is not echoed.
  for (const bad of ["evil.example/path", "a b", "x.example, y.example", "evil.example@x", "<script>", "", undefined]) {
    assert.equal(url(requestWithHost(bad)), "http://localhost:3011", String(bad))
  }
})
