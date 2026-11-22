import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { applyProfile, parseProfile } from "../src/profile.js"

test("standard is the default and changes nothing", () => {
  const env: NodeJS.ProcessEnv = {}
  assert.equal(parseProfile(env), "standard")
  assert.deepEqual(applyProfile(env), [])
  assert.deepEqual(env, {})
})

test("safe confirms destructive tools and marks untrusted text", () => {
  const env: NodeJS.ProcessEnv = { MCP_PROFILE: " Safe " }
  assert.deepEqual(applyProfile(env).sort(), ["MCP_CONFIRM_DESTRUCTIVE", "MCP_MARK_UNTRUSTED"])
  assert.equal(env.MCP_CONFIRM_DESTRUCTIVE, "true")
  assert.equal(env.MCP_READ_ONLY, undefined)
})

test("readonly adds MCP_READ_ONLY on top of safe", () => {
  const env: NodeJS.ProcessEnv = { MCP_PROFILE: "readonly" }
  applyProfile(env)
  assert.equal(env.MCP_READ_ONLY, "true")
  assert.equal(env.MCP_MARK_UNTRUSTED, "true")
})

test("an explicit switch wins over the profile, including an explicit off", () => {
  const env: NodeJS.ProcessEnv = { MCP_PROFILE: "readonly", MCP_READ_ONLY: "false", MCP_MARK_UNTRUSTED: "0" }
  assert.deepEqual(applyProfile(env), ["MCP_CONFIRM_DESTRUCTIVE"])
  assert.equal(env.MCP_READ_ONLY, "false")
  assert.equal(env.MCP_MARK_UNTRUSTED, "0")
})

test("an unknown profile is an error and applies nothing, without throwing on import", () => {
  assert.throws(() => parseProfile({ MCP_PROFILE: "paranoid" }), /MCP_PROFILE must be standard, safe, readonly/)
  const env: NodeJS.ProcessEnv = { MCP_PROFILE: "paranoid" }
  assert.deepEqual(applyProfile(env), [])
  assert.equal(env.MCP_READ_ONLY, undefined)
  const imported = spawnSync(process.execPath, ["-e", "import('./build-tests/src/server.js').then(() => console.log('imported'))"], {
    env: { ...process.env, MCP_PROFILE: "paranoid" }, encoding: "utf8",
  })
  assert.equal(imported.status, 0, imported.stderr)
  assert.match(imported.stdout, /imported/)
})

test("the startup entry refuses to run with an unknown profile", () => {
  const result = spawnSync(process.execPath, ["build-tests/src/index.js"], {
    env: { ...process.env, MCP_PROFILE: "paranoid" }, encoding: "utf8", timeout: 20_000,
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /MCP_PROFILE must be/)
})

test("MCP_PROFILE=readonly makes the server read-only end to end", () => {
  const result = spawnSync(process.execPath, ["-e", "import('./build-tests/src/tool-filter.js').then(m => console.log(m.enabledTools.has('deleteWorkItems'), m.enabledTools.has('getWorkItem')))"], {
    env: { ...process.env, MCP_PROFILE: "readonly", MCP_READ_ONLY: "" }, encoding: "utf8",
  })
  assert.equal(result.stdout.trim(), "false true")
})
