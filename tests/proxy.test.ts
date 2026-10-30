import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import https from "node:https"
import net from "node:net"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { AddressInfo } from "node:net"
import axios from "axios"
import { bypassesProxy, proxyFromEnv } from "../src/proxy.js"
import { httpsAgent } from "../src/httpClient.js"

const CERT = readFileSync(resolve("tests/fixtures/cimd-test-cert.pem"))
const KEY = readFileSync(resolve("tests/fixtures/cimd-test-key.pem"))

async function startPolarion() {
  const seen: string[] = []
  const server = https.createServer({ cert: CERT, key: KEY }, (req, res) => { seen.push(String(req.headers.authorization)); res.end("{}") })
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r))
  return { port: (server.address() as AddressInfo).port, seen, stop: () => new Promise<void>(r => { server.closeAllConnections(); server.close(() => r()) }) }
}

/** Minimal CONNECT proxy; `auth` makes it answer 407 unless the Basic credentials match. */
async function startProxy(auth?: string) {
  const tunnels: string[] = []
  const server = http.createServer((_req, res) => { res.statusCode = 405; res.end() })
  server.on("connect", (req, client, head) => {
    if (auth && req.headers["proxy-authorization"] !== `Basic ${Buffer.from(auth).toString("base64")}`) {
      client.end("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n")
      return
    }
    tunnels.push(String(req.url))
    const [host, port] = String(req.url).split(":")
    const upstream = net.connect(Number(port), host, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n")
      upstream.write(head)
      upstream.pipe(client)
      client.pipe(upstream)
    })
    upstream.on("error", () => client.destroy())
    client.on("error", () => upstream.destroy())
  })
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r))
  return { port: (server.address() as AddressInfo).port, tunnels, stop: () => new Promise<void>(r => { server.closeAllConnections(); server.close(() => r()) }) }
}

const get = (port: number, env: NodeJS.ProcessEnv) =>
  axios.get(`https://127.0.0.1:${port}/x`, { headers: { Authorization: "Bearer pat" }, httpsAgent: httpsAgent(false, env), proxy: false, timeout: 5000 })

test("proxyFromEnv reads HTTPS_PROXY and NO_PROXY and ignores unusable values", () => {
  assert.equal(proxyFromEnv({}), undefined)
  assert.equal(proxyFromEnv({ HTTPS_PROXY: "not a url" }), undefined)
  assert.equal(proxyFromEnv({ HTTPS_PROXY: "socks5://p:1080" }), undefined)
  const proxy = proxyFromEnv({ https_proxy: "http://p:3128", no_proxy: " .corp.example , localhost:8443" })
  assert.equal(proxy?.url.host, "p:3128")
  assert.deepEqual(proxy?.noProxy, [".corp.example", "localhost:8443"])
})

test("NO_PROXY matches hosts, suffixes, ports and wildcard only", () => {
  assert.equal(bypassesProxy("polarion.corp.example", 443, [".corp.example"]), true)
  assert.equal(bypassesProxy("corp.example", 443, [".corp.example"]), true)
  assert.equal(bypassesProxy("evilcorp.example", 443, [".corp.example"]), false)
  assert.equal(bypassesProxy("localhost", 8443, ["localhost:8443"]), true)
  assert.equal(bypassesProxy("localhost", 443, ["localhost:8443"]), false)
  assert.equal(bypassesProxy("anything", 443, ["*"]), true)
  assert.equal(bypassesProxy("anything", 443, []), false)
})

test("Polarion calls go through HTTPS_PROXY, bypass it on NO_PROXY and go direct without it", async () => {
  const polarion = await startPolarion()
  const proxy = await startProxy()
  try {
    const target = `127.0.0.1:${polarion.port}`
    await get(polarion.port, { HTTPS_PROXY: `http://127.0.0.1:${proxy.port}` })
    assert.deepEqual(proxy.tunnels, [target])
    await get(polarion.port, { HTTPS_PROXY: `http://127.0.0.1:${proxy.port}`, NO_PROXY: "127.0.0.1" })
    await get(polarion.port, {})
    assert.deepEqual(proxy.tunnels, [target], "bypassed and direct calls must not use the proxy")
    assert.equal(polarion.seen.length, 3)
    assert.ok(polarion.seen.every(value => value === "Bearer pat"))
  } finally {
    await proxy.stop(); await polarion.stop()
  }
})

test("a proxy that needs credentials gives a clear error without leaking them", async () => {
  const polarion = await startPolarion()
  const proxy = await startProxy("user:s3cret")
  try {
    await assert.rejects(get(polarion.port, { HTTPS_PROXY: `http://wrong:hunter2@127.0.0.1:${proxy.port}` }), (error: Error) => {
      assert.match(error.message, /refused the CONNECT tunnel: HTTP 407/)
      assert.match(error.message, /check the credentials/)
      assert.doesNotMatch(error.message, /hunter2|wrong:|s3cret/)
      return true
    })
    await get(polarion.port, { HTTPS_PROXY: `http://user:s3cret@127.0.0.1:${proxy.port}` })
    assert.equal(polarion.seen.length, 1)
  } finally {
    await proxy.stop(); await polarion.stop()
  }
})

test("an unreachable proxy fails with its address, not its credentials", async () => {
  await assert.rejects(get(1, { HTTPS_PROXY: "http://u:topsecret@127.0.0.1:9" }), (error: Error) => {
    assert.match(error.message, /Cannot reach proxy http:\/\/127\.0\.0\.1:9/)
    assert.doesNotMatch(error.message, /topsecret/)
    return true
  })
})

test("malformed percent-encoding in proxy credentials is a clear error, not a crash", async () => {
  await assert.rejects(get(1, { HTTPS_PROXY: "http://user:p%ss@127.0.0.1:9" }), (error: Error) => {
    assert.match(error.message, /not valid percent-encoding/)
    assert.doesNotMatch(error.message, /p%ss/)
    return true
  })
})

test("an empty HTTPS_PROXY falls back to the lowercase variable", () => {
  assert.equal(proxyFromEnv({ HTTPS_PROXY: "", https_proxy: "http://p:3128" })?.url.host, "p:3128")
})
