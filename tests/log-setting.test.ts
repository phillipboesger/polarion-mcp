import test from "node:test"
import assert from "node:assert/strict"
import { parseLogSetting } from "../src/logger.js"

test("MCP_LOG merges format and level; unknown words fall back to text at info", () => {
  assert.deepEqual(parseLogSetting(undefined), { logFormat: "text", logLevel: "info" })
  assert.deepEqual(parseLogSetting("json"), { logFormat: "json", logLevel: "info" })
  assert.deepEqual(parseLogSetting("debug"), { logFormat: "text", logLevel: "debug" })
  assert.deepEqual(parseLogSetting(" JSON , Warn "), { logFormat: "json", logLevel: "warn" })
  assert.deepEqual(parseLogSetting("verbose,xml"), { logFormat: "text", logLevel: "info" })
})
