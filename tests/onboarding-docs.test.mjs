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

test("the generated guides carry the identity demo and the site no longer lists a global project check", async () => {
  const guide = await readFile(path.join(root, "docs/guides/clients/claude-desktop.md"), "utf8")
  assert.doesNotMatch(site + guide, /List the Polarion projects|getProjects/)
  assert.match(guide, /getCurrentUser/)
})

test("troubleshooting names the log line the server writes and the Polarion ALLOWED_HOSTS fix", async () => {
  const troubleshooting = await readFile(path.join(root, "docs/troubleshooting.md"), "utf8")
  const source = await readFile(path.join(root, "src/oauth.ts"), "utf8")
  assert.match(source, /Polarion token probe GET \/metadata failed/)
  assert.doesNotMatch(troubleshooting + manifest, /Polarion token check failed/, "documented log line must match what the server logs")
  assert.match(troubleshooting, /request_rejected HTTP 400/)
  assert.match(troubleshooting, /ALLOWED_HOSTS=localhost,127\.0\.0\.1,0\.0\.0\.0,host\.docker\.internal/)
  assert.match(troubleshooting, /recreate the Polarion container/)
})
