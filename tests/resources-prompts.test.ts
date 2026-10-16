import test from "node:test"
import assert from "node:assert/strict"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"

import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt, SERVER_INSTRUCTIONS } from "../src/polarion.js"
import { createPolarionServer } from "../src/server.js"
import { toolDefinitionMap } from "../src/tools.js"

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
})

test("initialize hands the client the server instructions", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  const server = createPolarionServer()
  await server.connect(serverSide)
  const client = new Client({ name: "t", version: "1" })
  await client.connect(clientSide)
  assert.match(client.getInstructions() ?? "", /getProjects/)
  await client.close()
})
