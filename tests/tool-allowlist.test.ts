import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { parseToolFilter, filterTools, toolFilterWarnings } from '../src/tool-filter.js';
import { toolDefinitionMap } from '../src/tools.js';

test('allowlist parsing distinguishes blank from an empty set', () => {
  assert.equal(parseToolFilter({}).allow, undefined);
  assert.equal(parseToolFilter({ MCP_TOOLS: '  ' }).allow, undefined);
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: ',,' }).allow, new Set());
  assert.deepEqual(parseToolFilter({ MCP_TOOLS: 'a, b\nc' }).allow, new Set(['a', 'b', 'c']));
});

test('allowlist intersects corrected read-only annotations', () => {
  const reads = filterTools(toolDefinitionMap, { allow: new Set(['all-reads']) });
  assert.ok(reads.size > 0);
  assert.ok([...reads.values()].every(tool => tool.annotations?.readOnlyHint === true));
  assert.equal(filterTools(toolDefinitionMap, { allow: new Set(['getWorkItem', 'deleteWorkItems']), readOnly: true }).has('deleteWorkItems'), false);
  assert.equal(filterTools(toolDefinitionMap, { allow: new Set(['all-reads', 'deleteWorkItems']) }).has('deleteWorkItems'), true);
});

test('unknown names warn together and do not widen access', () => {
  const filter = parseToolFilter({ MCP_TOOLS: 'GetWorkItem,missing' });
  assert.equal(filterTools(toolDefinitionMap, filter).size, 0);
  const warnings = toolFilterWarnings([], filter);
  assert.match(warnings[0], /GetWorkItem.*missing/);
  assert.match(warnings.join(' '), /zero operations/);
});

test('empty allowlist starts in both modes', () => {
  for (const mode of ['full', 'code']) {
    const result = spawnSync(process.execPath, ['-e', "import('./build-tests/src/server.js').then(m => m.createPolarionServer())"], { env: { ...process.env, MCP_TOOLS: ',,', MCP_MODE: mode }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
