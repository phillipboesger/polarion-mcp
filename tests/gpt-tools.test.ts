import test from "node:test"
import assert from "node:assert/strict"
import { ESSENTIAL_GPT_TOOLS } from "../src/gpt-tools.js"
import { toolDefinitionMap } from "../src/tools.js"

test("ESSENTIAL_GPT_TOOLS stays within the Custom GPT operation limit", () => {
  assert.ok(ESSENTIAL_GPT_TOOLS.length <= 30)
})

test("ESSENTIAL_GPT_TOOLS only references generated tools and stays unique", () => {
  const uniqueTools = new Set(ESSENTIAL_GPT_TOOLS)

  assert.equal(uniqueTools.size, ESSENTIAL_GPT_TOOLS.length)

  for (const toolName of ESSENTIAL_GPT_TOOLS) {
    assert.ok(toolDefinitionMap.has(toolName), `Expected generated tool definition for ${toolName}`)
  }
})
