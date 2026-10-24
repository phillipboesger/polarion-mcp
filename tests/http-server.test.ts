import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import { copyFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { createHttpApp } from "../src/http-server.js"
import { enabledTools } from "../src/tool-filter.js"

test("REST wrapper hides internal errors, redacts logged credentials, and rate limits per forwarded client", async () => {
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => { errors.push(args) }
  const app = createHttpApp({
    apiKey: "test-key",
    env: { TRUST_PROXY: "1" },
    port: 3000,
    trustProxy: 1,
    rateLimit: { windowMs: 60_000, limit: 1 },
    executeTool: async () => { throw new Error("secret Authorization: Bearer leaked-token") },
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const enabledToolName = enabledTools.keys().next().value as string
    const first = await fetch(`${url}/api/tools/${enabledToolName}`, { method: "POST", headers: { Authorization: "Bearer test-key", "content-type": "application/json" }, body: JSON.stringify({ arguments: {} }) })
    assert.equal(first.status, 500)
    const body = await first.json() as { message?: string }
    assert.equal(body.message, "Tool execution failed")
    assert.doesNotMatch(JSON.stringify(body), /secret Authorization|leaked-token/)
    assert.doesNotMatch(JSON.stringify(errors), /leaked-token/)
    const second = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.10" } })
    assert.equal(second.status, 200)
    const third = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.11" } })
    assert.equal(third.status, 200)
    const fourth = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.10" } })
    assert.equal(fourth.status, 429)
    assert.match(fourth.headers.get("content-type") ?? "", /application\/json/)
    assert.equal((await fourth.json() as { error: string }).error, "Too many requests")
  } finally { console.error = originalError; await new Promise<void>(resolve => server.close(() => resolve())) }
})

test("built REST wrapper listens when invoked as http-server.js and copied index.js", async () => {
  const temp = await mkdtemp(join(tmpdir(), "polarion-http-wrapper-"))
  const indexPath = resolve(process.cwd(), "build/index.js")
  const backupPath = join(temp, "previous-index.js")
  const wrapperPath = resolve(process.cwd(), "build/http-server.js")
  await copyFile(indexPath, backupPath)
  const portServer = createServer()
  await new Promise<void>(resolve => portServer.listen(0, "127.0.0.1", resolve))
  const port = (portServer.address() as AddressInfo).port
  await new Promise<void>(resolve => portServer.close(() => resolve()))
  try {
    for (const entry of [wrapperPath, indexPath]) {
      if (entry === indexPath) await copyFile(wrapperPath, indexPath)
      const child = spawn(process.execPath, [entry], { env: { ...process.env, HTTP_API_KEY: "test-key", API_BASE_URL: "https://polarion.example", PORT: String(port) }, stdio: "ignore" })
      try {
        let listening = false
        for (let attempt = 0; attempt < 50 && !listening; attempt++) {
          if (child.exitCode !== null) break
          try {
            const response = await fetch(`http://127.0.0.1:${port}/health`)
            listening = response.ok
          } catch { await new Promise(resolve => setTimeout(resolve, 40)) }
        }
        assert.equal(listening, true, `${entry} should listen`)
      } finally {
        if (child.exitCode === null) {
          child.kill("SIGTERM")
          await new Promise<void>(resolve => child.once("exit", () => resolve()))
        }
      }
    }
  } finally {
    await copyFile(backupPath, indexPath)
    await rm(temp, { recursive: true, force: true })
  }
})

test("REST wrapper only sends CORS headers to configured origins", async () => {
  const app = createHttpApp({ apiKey: "test-key", env: { HTTP_CORS_ORIGINS: "https://allowed.example" }, port: 3000 })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`
    const allowed = await fetch(url, { headers: { Origin: "https://allowed.example" } })
    const denied = await fetch(url, { headers: { Origin: "https://denied.example" } })
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://allowed.example")
    assert.equal(denied.headers.get("access-control-allow-origin"), null)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test("REST wrapper returns a truncated tool result as parseable JSON text", async () => {
  const envelope = { truncated: true, totalChars: 10_000, preview: "{\"data\":", hint: "Narrow the query to shrink the response." }
  const app = createHttpApp({
    apiKey: "test-key",
    env: {},
    port: 3000,
    executeTool: async () => ({ content: [{ type: "text", text: JSON.stringify(envelope) }] }),
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const toolName = enabledTools.keys().next().value as string
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/${toolName}`, {
      method: "POST",
      headers: { Authorization: "Bearer test-key", "content-type": "application/json" },
      body: JSON.stringify({ arguments: {} }),
    })
    const body = await response.json() as { result: string }
    assert.deepEqual(JSON.parse(body.result), envelope)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
