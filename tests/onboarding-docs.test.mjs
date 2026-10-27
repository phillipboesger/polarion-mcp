import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifest = await readFile(path.join(root, "docs/clients.json"), "utf8")
const site = await readFile(path.join(root, "docs/index.html"), "utf8")

test("onboarding demos ask for the signed-in user, not a global project listing", () => {
  assert.doesNotMatch(manifest, /getProjects|List the Polarion projects/)
  assert.match(manifest, /getCurrentUser/)
})

test("the Custom GPT path never points at getCurrentUser, which its 30-action schema omits", () => {
  const gpt = JSON.parse(manifest).clients.find(client => client.id === "custom-gpt")
  assert.doesNotMatch(JSON.stringify(gpt), /getCurrentUser/)
  assert.match(JSON.stringify(gpt), /getProject/)
})

test("the generated site carries the identity demo and not the old global listing", () => {
  assert.doesNotMatch(site, /List the Polarion projects|getProjects/)
  assert.match(site, /getCurrentUser/)
})
