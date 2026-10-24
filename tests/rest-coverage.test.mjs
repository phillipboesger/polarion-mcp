import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverageFor, diffOperations, operationsFromSpec, renderMarkdown, runCoverage } from '../scripts/rest-coverage.mjs'

const spec = paths => ({ paths })
const op = (operationId, method = 'get') => ({ [method]: { operationId } })

test('extracts operation method, path and operationId', () => {
  assert.deepEqual(operationsFromSpec(spec({ '/a': op('readA'), '/b': op('writeB', 'post') })), [
    { method: 'GET', path: '/a', operationId: 'readA' }, { method: 'POST', path: '/b', operationId: 'writeB' },
  ])
})

test('matches operationIds and identifies missing operations', () => {
  const operations = operationsFromSpec(spec({ '/a': op('readA'), '/b': op('readB') }))
  assert.equal(coverageFor(operations, new Set(['readA'])).missing[0].operationId, 'readB')
})

test('diffs operations between specs and renders markdown', () => {
  const left = operationsFromSpec(spec({ '/a': op('readA'), '/b': op('readB') }))
  const right = operationsFromSpec(spec({ '/a': op('readA'), '/c': op('readC') }))
  const diff = diffOperations(left, right)
  assert.deepEqual(diff.onlyLeft.map(item => item.operationId), ['readB'])
  assert.deepEqual(diff.onlyRight.map(item => item.operationId), ['readC'])
  assert.match(renderMarkdown({ one: coverageFor(left, new Set(['readA'])) }, { 'one / two': diff }), /readB/)
})

test('offline mode writes a tools-only summary when specs are unavailable', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'rest-coverage-'))
  try {
    await mkdir(join(cwd, 'src')); await mkdir(join(cwd, 'docs/quality'), { recursive: true })
    await writeFile(join(cwd, 'src/tools.ts'), '  ["readA", {\n  ["readB", {')
    const summary = await runCoverage({ args: ['--offline'], env: {}, cwd })
    assert.equal(summary.specs['generated-tools-only'].total, 2)
    assert.match(await readFile(join(cwd, 'docs/quality/rest-coverage.md'), 'utf8'), /2 \| 2 \| 0/)
  } finally { await rm(cwd, { recursive: true, force: true }) }
})
