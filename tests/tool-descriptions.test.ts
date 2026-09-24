import test from "node:test"
import assert from "node:assert/strict"
import { toolDefinitionMap } from "../src/tools.js"

// Generated OpenAPI summaries that don't tell an agent what the tool is for.
// scripts/lib/tool-guidance.mjs replaces them; a regeneration must not bring them back.
const GENERIC_LEADS = [
  /^See more in the/,
  /^Files are identified by order/,
  /^Returns fields for the specified resource\./,
  /^Returns (a list of|the specified) instances?\./,
  /^(Deletes|Creates) a list of instances\./,
  /^Returns a list of \w+( \w+)? Relationships\./,
  /^(Marks|Unmarks) the Project\./,
]

test("no tool description leads with a generic generated summary", () => {
  const offenders = [...toolDefinitionMap.values()]
    .filter((tool) => GENERIC_LEADS.some((re) => re.test(tool.description)))
    .map((tool) => tool.name)
  assert.deepEqual(offenders, [])
})

test("no tool description contains raw HTML", () => {
  const offenders = [...toolDefinitionMap.values()].filter((tool) => /<a\s/.test(tool.description)).map((tool) => tool.name)
  assert.deepEqual(offenders, [])
})

test("curated leads keep the generated notes that follow them", () => {
  const patch = toolDefinitionMap.get("patchWorkItemAttachment")
  assert.ok(patch)
  assert.match(patch.description, /^Updates one existing Work Item attachment/)
  assert.match(patch.description, / Effect: idempotent/)
  assert.match(patch.description, / Tip: set `dry_run: true`/)

  const approvals = toolDefinitionMap.get("getWorkItemApprovals")
  assert.ok(approvals)
  assert.match(approvals.description, / Cardinality: targets the full collection/)
})

test("relationshipId is described as a relationship name on every relationship tool", () => {
  const relationshipTools = [...toolDefinitionMap.values()].filter((tool) => tool.pathTemplate.endsWith("/relationships/{relationshipId}"))
  assert.ok(relationshipTools.length > 0)
  for (const tool of relationshipTools) {
    const property = (tool.inputSchema.properties as Record<string, { description?: string }>).relationshipId
    assert.match(property.description ?? "", /relationship's name/, tool.name)
  }
})
