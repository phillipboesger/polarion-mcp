import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { SERVER_VERSION } from "../src/config.js"

// Tests run from the repository root (npm test).
const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const server = JSON.parse(readFileSync("server.json", "utf8"))

test("the server reports the package version", () => {
  assert.equal(SERVER_VERSION, pkg.version)
})

test("server.json and its image tag carry the package version", () => {
  assert.equal(server.version, pkg.version)
  for (const p of server.packages) assert.equal(p.version, pkg.version)
})

test("the Docker image is labelled with the registry name from server.json", () => {
  assert.match(readFileSync("Dockerfile", "utf8"), new RegExp(`io\\.modelcontextprotocol\\.server\\.name="${server.name.replace(/[.\\]/g, "\\$&")}"`))
})

test("the stdio entry point has a shebang, so the polarion-mcp bin runs", () => {
  assert.ok(readFileSync("src/index.ts", "utf8").startsWith("#!/usr/bin/env node\n"))
})

test(".env.example does not switch off TLS verification for whoever copies it", () => {
  const active = readFileSync(".env.example", "utf8").split(/\r?\n/).filter(line => !line.trim().startsWith("#"))
  assert.equal(active.some(line => line.startsWith("NODE_TLS_REJECT_UNAUTHORIZED")), false)
})
