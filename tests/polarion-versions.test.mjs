import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { validatePolarionVersions } from "../scripts/lib/polarion-versions.mjs"

const read = (path) => readFileSync(path, "utf8")
const versions = JSON.parse(read("docs/polarion-versions.json"))

test("Polarion release manifest is valid and documented", () => {
  assert.doesNotThrow(() => validatePolarionVersions(versions))
  const versioning = read("docs/polarion-versioning.md")
  const live = read("docs/live-tests.md")
  const header = versioning.match(/^\| Area \|.*\|$/m)?.[0]
  const list = versioning.match(/The newest three releases are guaranteed usable: ([^.]+)\./)?.[1]
  const matrix = live.match(/workflow uses the private Polarion Docker image for versions ([^,]+(?:, [^,]+)*?), listed in/)?.[1]
  assert.ok(header && list && matrix, "Release documentation sections missing")
  for (const { version } of versions) {
    assert.ok(header.split("|").map((cell) => cell.trim()).includes(version), `${version} missing from support table`)
    assert.ok(list.split(/, | and /).includes(version), `${version} missing from support list`)
    assert.ok(matrix.split(/, | and /).includes(version), `${version} missing from live matrix`)
  }
})

test("Polarion release validator rejects duplicate versions and unknown statuses", () => {
  assert.throws(() => validatePolarionVersions([...versions, versions[0]]), /Duplicate/)
  assert.throws(() => validatePolarionVersions([{ ...versions[0], status: "unknown" }]), /Invalid/)
  assert.throws(() => validatePolarionVersions(versions.map((entry) => ({ ...entry, status: "guaranteed" }))), /exactly one latest/)
  assert.throws(() => validatePolarionVersions([{ ...versions[2], allowFailure: "true" }]), /Invalid/)
  assert.throws(() => validatePolarionVersions([{ ...versions[2], image: "wrong" }]), /Invalid/)
  assert.throws(() => validatePolarionVersions([{ ...versions[2], extra: true }]), /Invalid/)
  assert.throws(() => validatePolarionVersions([[]]), /Invalid/)
  assert.throws(() => validatePolarionVersions([null]), /Invalid/)
})

test("Polarion release validator enforces rolling support and non-blocking older releases", () => {
  const older = { version: "2501", status: "best-effort", image: "ghcr.io/phillipboesger/polarion-docker:v2501", allowFailure: true }
  const four = [older, ...versions]
  assert.doesNotThrow(() => validatePolarionVersions(four))
  assert.throws(() => validatePolarionVersions(four.map((entry) => entry.version === "2506" ? { ...entry, status: "best-effort", allowFailure: true } : entry)), /guaranteed/)
  assert.throws(() => validatePolarionVersions(four.map((entry) => entry.version === "2501" ? { ...entry, status: "guaranteed" } : entry)), /best-effort/)
  assert.throws(() => validatePolarionVersions(versions.map((entry) => ({ ...entry, status: entry.version === "2512" ? "latest" : "guaranteed" }))), /latest/)
  assert.throws(() => validatePolarionVersions(versions.map((entry) => entry.status === "guaranteed" ? { ...entry, status: "best-effort", allowFailure: true } : entry)), /guaranteed/)
  assert.throws(() => validatePolarionVersions([{ ...older, allowFailure: false }, ...versions]), /Invalid/)
  assert.doesNotThrow(() => validatePolarionVersions(versions.map((entry) => ({ ...entry, allowFailure: true }))))
})

test("live workflow reads the release manifest instead of a hardcoded list", () => {
  const workflow = read(".github/workflows/live-polarion.yml")
  assert.match(workflow, /docs\/polarion-versions\.json/)
  assert.match(workflow, /fromJSON\(/)
  assert.ok(workflow.includes("continue-on-error: ${{ matrix.release.allowFailure }}"))
  assert.ok(workflow.includes("jq -c 'map(.allowFailure //= false)' docs/polarion-versions.json"))
  assert.doesNotMatch(workflow, /\[\s*["']2506["']\s*,\s*["']2512["']\s*,\s*["']2606["']\s*\]/)
})

test("live matrix jq output supplies boolean allowFailure values", (t) => {
  const result = spawnSync("jq", ["-c", "map(.allowFailure //= false)", "docs/polarion-versions.json"], { encoding: "utf8" })
  if (result.error?.code === "ENOENT") return t.skip("jq is not installed")
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^[^\n]+\n$/)
  const releases = JSON.parse(result.stdout)
  assert.equal(releases.length, 3)
  assert.deepEqual(releases.map((entry) => entry.version), versions.map((entry) => entry.version))
  assert.ok(releases.every((entry) => typeof entry.allowFailure === "boolean"))
})
