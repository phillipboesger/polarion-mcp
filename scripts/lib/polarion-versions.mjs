/** @param {unknown} value */
export function validatePolarionVersions(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Expected a nonempty release array")
  const versions = new Set()
  let latest = 0
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        Object.keys(entry).some((key) => !["version", "status", "image", "allowFailure"].includes(key)) ||
        typeof entry.version !== "string" || !/^\d{4}$/.test(entry.version) ||
        !["latest", "guaranteed", "best-effort"].includes(entry.status) ||
        entry.image !== `ghcr.io/phillipboesger/polarion-docker:v${entry.version}` ||
        (entry.allowFailure !== undefined && typeof entry.allowFailure !== "boolean") ||
        (entry.status === "best-effort" && entry.allowFailure !== true)) {
      throw new Error("Invalid release entry")
    }
    if (versions.has(entry.version)) throw new Error("Duplicate release version")
    versions.add(entry.version)
    if (entry.status === "latest") latest++
  }
  if (latest !== 1) throw new Error("Expected exactly one latest release")
  const sorted = [...value].sort((a, b) => b.version.localeCompare(a.version))
  for (const [index, entry] of sorted.entries()) {
    const expected = index === 0 ? "latest" : index < 3 ? "guaranteed" : "best-effort"
    if (entry.status !== expected) throw new Error(`Expected ${expected} for ${entry.version}`)
  }
}
