import test from "node:test"
import assert from "node:assert/strict"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"

import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt, SERVER_INSTRUCTIONS } from "../src/polarion.js"
import { createPolarionServer } from "../src/server.js"
import { toolDefinitionMap } from "../src/tools.js"
import { resolve } from "node:path"

/** All texts a model is told to follow: instructions, guides, prompts. */
async function guidanceTexts(): Promise<string[]> {
  const texts = [SERVER_INSTRUCTIONS]
  for (const r of listPolarionResources()) texts.push(((await readPolarionResource(r.uri)).contents[0] as { text: string }).text)
  for (const p of getPolarionPrompts()) texts.push(getPolarionPrompt(p.name, { projectId: "P", workItemId: "W-1" }).messages[0].content.text)
  return texts
}

test("every listed resource can be read, offline, as text", async () => {
  const resources = listPolarionResources()
  assert.ok(resources.length >= 3)
  for (const r of resources) {
    const content = (await readPolarionResource(r.uri)).contents[0] as { text?: string; mimeType: string }
    assert.ok(content.text && content.text.length > 100, r.uri)
    assert.ok(content.text.length < 50_000, `${r.uri} must stay small`)
  }
})

test("an unknown resource and an absent SDK PDF are clear errors", async () => {
  await assert.rejects(readPolarionResource("polarion://nope"), /Unknown resource/)
  await assert.rejects(readPolarionResource("polarion://local/admin-user-help"), /not installed/)
})

test("every tool named in the instructions, guides and prompts exists", async () => {
  const camelCaseCalls = /\b((?:get|post|patch|delete)[A-Z][A-Za-z]+)\b/g
  for (const text of await guidanceTexts()) {
    for (const [, name] of text.matchAll(camelCaseCalls)) {
      assert.ok(toolDefinitionMap.has(name), `unknown tool referenced: ${name}`)
    }
  }
})

test("every resource named in the instructions, guides and prompts exists", async () => {
  const uris = new Set(listPolarionResources().map((r) => r.uri))
  for (const text of await guidanceTexts()) {
    for (const [uri] of text.matchAll(/polarion:\/\/[a-z0-9/-]+/g)) assert.ok(uris.has(uri), `unknown resource referenced: ${uri}`)
  }
})

test("prompts require their arguments and reject unknown names", () => {
  assert.throws(() => getPolarionPrompt("create-work-item", {}), /projectId/)
  assert.throws(() => getPolarionPrompt("update-work-item", { projectId: "P" }), /workItemId/)
  assert.throws(() => getPolarionPrompt("nope"), /Unknown prompt/)
  for (const name of ["review_requirements", "trace_gap_analysis"]) assert.throws(() => getPolarionPrompt(name, { projectId: "P" }), /workItemId/)
  for (const name of ["release_readiness_summary", "test_coverage_report", "triage_new_work_items"]) assert.throws(() => getPolarionPrompt(name, {}), /projectId/)
})

test("all plugin skill and prompt tool names exist in the generated or virtual catalog", async () => {
  const { readdir, readFile } = await import("node:fs/promises")
  const { discoverVirtualTools } = await import("../src/virtual-tools.js")
  const valid = new Set([...toolDefinitionMap.keys(), ...discoverVirtualTools(new Map()).map(tool => tool.name)])
  const walk = async (directory: string): Promise<string[]> => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : Promise.resolve(entry.name.endsWith(".md") ? [resolve(directory, entry.name)] : [])))).flat()
  const paths = await walk(resolve("plugin"))
  for (const path of paths) {
    const text = await readFile(path, "utf8")
    for (const [, name] of text.matchAll(/\b((?:get|post|patch|delete)[A-Z][A-Za-z0-9]*)\b/g)) assert.ok(valid.has(name), `${path} references unknown tool ${name}`)
  }
  for (const prompt of getPolarionPrompts()) {
    const content = getPolarionPrompt(prompt.name, { projectId: "P", workItemId: "W" }).messages[0].content.text
    for (const [, name] of content.matchAll(/\b((?:get|post|patch|delete)[A-Z][A-Za-z0-9]*)\b/g)) assert.ok(valid.has(name), `${prompt.name} references unknown tool ${name}`)
  }
})

test("initialize hands the client the server instructions", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  const server = createPolarionServer()
  await server.connect(serverSide)
  const client = new Client({ name: "t", version: "1" })
  await client.connect(clientSide)
  assert.match(client.getInstructions() ?? "", /getProjects/)
  const templates = await client.listResourceTemplates()
  assert.deepEqual(templates.resourceTemplates.map(template => template.uriTemplate), [
    "polarion://project/{projectId}/workitem/{workItemId}",
    "polarion://project/{projectId}/document/{spaceId}/{documentName}",
    "polarion://project/{projectId}",
  ])
  await client.close()
})
