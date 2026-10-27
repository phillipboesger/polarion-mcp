import test from "node:test"
import assert from "node:assert/strict"

import { serverInstructions, listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt, pruneDisabledTools } from "../src/polarion.js"
import { toolDefinitionMap } from "../src/tools.js"

const all = new Set(toolDefinitionMap.keys())
const readOnly = new Set([...toolDefinitionMap].filter(([, d]) => d.annotations?.readOnlyHint === true).map(([name]) => name))
const small = new Set(["getProjects", "getWorkItems", "getWorkItem"])

const disabledToolsIn = (text: string, enabled: Set<string>) =>
  [...text.matchAll(/\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g)].map(m => m[0]).filter(name => toolDefinitionMap.has(name) && !enabled.has(name))

async function everythingTold(enabled: Set<string>): Promise<string> {
  const texts = [serverInstructions(enabled)]
  for (const r of listPolarionResources(enabled)) texts.push(((await readPolarionResource(r.uri, enabled)).contents[0] as { text: string }).text)
  for (const p of getPolarionPrompts(enabled)) texts.push(getPolarionPrompt(p.name, { projectId: "P", workItemId: "W-1" }, enabled).messages[0].content.text)
  return texts.join("\n")
}

test("with every tool exposed nothing is pruned", async () => {
  assert.equal(getPolarionPrompts(all).length, 8)
  assert.match(serverInstructions(all), /workflowAction on patchWorkItem/)
  assert.ok(listPolarionResources(all).some(r => r.uri === "polarion://guide/writing"))
})

test("onboarding guidance names identity and project tools, not a global listing", async () => {
  const text = serverInstructions(all)
  assert.match(text, /getCurrentUser/)
  assert.match(text, /getProject with its projectId/)
  assert.match(text, /A 403 there means this token cannot read that endpoint, not that login failed/)
  assert.doesNotMatch(text, /Start with getProjects/)
})

test("without getCurrentUser the identity guidance disappears but project entry stays", async () => {
  const enabled = new Set([...all].filter(name => name !== "getCurrentUser"))
  const text = serverInstructions(enabled)
  assert.doesNotMatch(text, /getCurrentUser/)
  assert.match(text, /getProject with its projectId/)
})

test("read-only and small deployments are never pointed at a tool they do not have", async () => {
  for (const enabled of [readOnly, small]) assert.deepEqual(disabledToolsIn(await everythingTold(enabled), enabled), [])
})

test("read-only: no write guide, no write prompts, no dry_run advice", async () => {
  assert.equal(listPolarionResources(readOnly).some(r => r.uri === "polarion://guide/writing"), false)
  await assert.rejects(readPolarionResource("polarion://guide/writing", readOnly), /Unknown resource/)
  assert.deepEqual(getPolarionPrompts(readOnly).map(p => p.name), ["search-work-items", "review_requirements", "trace_gap_analysis", "release_readiness_summary", "test_coverage_report", "triage_new_work_items"])
  assert.throws(() => getPolarionPrompt("create-work-item", { projectId: "P" }, readOnly), /needs tools/)
  assert.doesNotMatch(serverInstructions(readOnly), /dry_run|guide\/writing/)
})

test("a prompt that lost steps is numbered 1, 2, 3 again", () => {
  const text = getPolarionPrompt("search-work-items", { projectId: "P" }, small).messages[0].content.text
  const numbers = [...text.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]))
  assert.ok(numbers.length >= 2)
  assert.deepEqual(numbers, numbers.map((_, i) => i + 1))
})

test("pruneDisabledTools drops the lines and the whole ## section that name a missing tool, keeps the rest", () => {
  const text = "# Title\nkeep this\n## Needs postWorkItems\nbody line\nmore body\n## Fine\nuse getWorkItem here\nuse deleteWorkItems here\nend"
  assert.equal(pruneDisabledTools(text, new Set(["getWorkItem"])), "# Title\nkeep this\n## Fine\nuse getWorkItem here\nend")
})
