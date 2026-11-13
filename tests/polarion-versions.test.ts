import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { validatePolarionVersions } from "../src/polarion-versions.js"

const read = (path: string) => readFileSync(path, "utf8")
const versions = JSON.parse(read("docs/polarion-versions.json"))

test("Polarion release manifest is valid and documented", () => {
  assert.doesNotThrow(() => validatePolarionVersions(versions))
  for (const { version } of versions) {
    for (const path of ["docs/polarion-versioning.md", "docs/live-tests.md"]) {
      assert.ok(read(path).includes(version), `${version} missing from ${path}`)
    }
  }
})

test("Polarion release validator rejects duplicate versions and unknown statuses", () => {
  assert.throws(() => validatePolarionVersions([...versions, versions[0]]), /Duplicate/)
  assert.throws(() => validatePolarionVersions([{ ...versions[0], status: "unknown" }]), /Invalid/)
  assert.throws(() => validatePolarionVersions(versions.map((entry: object) => ({ ...entry, status: "guaranteed" }))), /exactly one latest/)
  assert.throws(() => validatePolarionVersions([{ ...versions[2], allowFailure: "true" }]), /Invalid/)
})

test("live workflow reads the release manifest instead of a hardcoded list", () => {
  const workflow = read(".github/workflows/live-polarion.yml")
  assert.match(workflow, /docs\/polarion-versions\.json/)
  assert.match(workflow, /fromJSON\(/)
  assert.doesNotMatch(workflow, /\[\s*["']2506["']\s*,\s*["']2512["']\s*,\s*["']2606["']\s*\]/)
})
