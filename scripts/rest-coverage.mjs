import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function operationsFromSpec(spec) {
  const result = []
  for (const [path, item] of Object.entries(spec.paths ?? {})) for (const [method, op] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method.toLowerCase()) || !op || typeof op !== 'object') continue
    result.push({ method: method.toUpperCase(), path, operationId: op.operationId ?? '' })
  }
  return result.sort((a, b) => `${a.method} ${a.path} ${a.operationId}`.localeCompare(`${b.method} ${b.path} ${b.operationId}`))
}

export function coverageFor(operations, operationIds) {
  const covered = operations.filter(op => operationIds.has(op.operationId))
  return { total: operations.length, covered, missing: operations.filter(op => !operationIds.has(op.operationId)) }
}

export function diffOperations(left, right) {
  const key = op => `${op.method} ${op.path} ${op.operationId}`
  const rightKeys = new Set(right.map(key)); const leftKeys = new Set(left.map(key))
  return { onlyLeft: left.filter(op => !rightKeys.has(key(op))), onlyRight: right.filter(op => !leftKeys.has(key(op))) }
}

export function renderMarkdown(summaries, diffs, offline = false) {
  const lines = ['# REST API coverage', '', `Generated from the checked-in tool surface${offline ? ' (offline mode: no OpenAPI spec was available)' : ''}.`, '', '| Spec | Operations | Covered | Missing |', '|---|---:|---:|---:|']
  for (const [name, summary] of Object.entries(summaries)) lines.push(`| ${name} | ${summary.total} | ${summary.covered.length} | ${summary.missing.length} |`)
  lines.push('', '## Missing operations', '')
  for (const [name, summary] of Object.entries(summaries)) {
    lines.push(`### ${name}`, '')
    lines.push(...(summary.missing.length ? summary.missing.map(op => `- \`${op.method} ${op.path}\` (${op.operationId || 'no operationId'})`) : ['None.']), '')
  }
  for (const [pair, diff] of Object.entries(diffs)) lines.push(`## Version differences: ${pair}`, '', `Only in left: ${diff.onlyLeft.length}; only in right: ${diff.onlyRight.length}.`, '')
  return `${lines.join('\n').trimEnd()}\n`
}

function toolOperationIds(source) {
  return new Set([...source.matchAll(/^\s*\["([^"]+)", \{/gm)].map(match => match[1]))
}

async function readSpec(file) { return JSON.parse(await readFile(file, 'utf8')) }

export async function runCoverage({ args = process.argv.slice(2), env = process.env, cwd = process.cwd() } = {}) {
  const offline = args.includes('--offline'); const check = args.includes('--check')
  const tools = await readFile(`${cwd}/src/tools.ts`, 'utf8')
  const ids = toolOperationIds(tools)
  const specs = new Map()
  const committed = `${cwd}/openapi.json`
  if (existsSync(committed)) specs.set('committed', await readSpec(committed))
  for (const version of ['2506', '2606']) {
    const flagIndex = args.indexOf(`--spec-${version}`)
    const file = env[`SPEC_${version}`] ?? (flagIndex >= 0 ? args[flagIndex + 1] : undefined)
    if (file) specs.set(version, await readSpec(file))
  }
  if (!offline && !specs.has('committed')) {
    const url = env.SPEC_URL ?? 'https://testdrive.polarion.com/polarion/sdk/doc/rest/polarionrest.json'
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Spec download failed: ${response.status}`)
    specs.set('downloaded', await response.json())
  }
  const summaries = Object.fromEntries([...specs].map(([name, spec]) => [name, coverageFor(operationsFromSpec(spec), ids)]))
  if (!Object.keys(summaries).length) summaries['generated-tools-only'] = { total: ids.size, covered: [...ids].map(operationId => ({ operationId })), missing: [] }
  const diffs = {}
  const entries = [...specs].map(([name, spec]) => [name, operationsFromSpec(spec)])
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) diffs[`${entries[i][0]} / ${entries[j][0]}`] = diffOperations(entries[i][1], entries[j][1])
  const json = { generatedFromPolarionVersion: '2606', offline, specs: Object.fromEntries(Object.entries(summaries).map(([name, s]) => [name, { total: s.total, covered: s.covered.length, missing: s.missing }])), diffs }
  await writeFile(`${cwd}/docs/quality/rest-coverage.md`, renderMarkdown(summaries, diffs, offline))
  await writeFile(`${cwd}/docs/quality/rest-coverage.json`, `${JSON.stringify(json, null, 2)}\n`)
  const missing = Object.values(summaries).some(s => s.missing.length)
  if (check && missing) throw new Error('REST coverage check failed: uncovered operations')
  return json
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCoverage().catch(error => { console.error(error.message); process.exitCode = 1 })
