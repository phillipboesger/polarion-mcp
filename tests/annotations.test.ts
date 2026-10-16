import test from "node:test"
import assert from "node:assert/strict"

import { DESTRUCTIVE_ACTIONS } from "../src/annotations.js"
import { enabledTools } from "../src/tool-filter.js"
import { toolDefinitionMap } from "../src/tools.js"

const annotations = (name: string) => enabledTools.get(name)?.annotations

test("PATCH tools that take a workflow action are not idempotent", () => {
  for (const name of ["patchWorkItem", "patchWorkItems", "patchAllWorkItems", "patchDocument"]) {
    assert.equal(annotations(name)?.idempotentHint, false, name)
  }
  assert.equal(annotations("patchPlan")?.idempotentHint, true, "a plain PATCH stays idempotent")
})

test("PATCH on a relationship is destructive: it replaces the whole set", () => {
  for (const name of ["patchWorkItemRelationships", "patchCollectionsRelationships", "patchPlanRelationships", "patchPageRelationships"]) {
    assert.equal(annotations(name)?.destructiveHint, true, name)
  }
})

test("overwrite and merge actions are destructive, and every listed action exists", () => {
  for (const name of DESTRUCTIVE_ACTIONS) {
    assert.ok(toolDefinitionMap.has(name), `${name} no longer exists`)
    assert.equal(annotations(name)?.destructiveHint, true, name)
  }
})

test("read-only tools are untouched and the generated map is not mutated", () => {
  assert.deepEqual(annotations("getWorkItem"), toolDefinitionMap.get("getWorkItem")?.annotations)
  assert.equal(toolDefinitionMap.get("patchWorkItem")?.annotations?.idempotentHint, true)
})
