import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const json = path => JSON.parse(read(path));

function versionMatches(pkg, version) {
  return pkg.registryType === 'oci'
    ? pkg.version === undefined && pkg.identifier.endsWith(`:${version}`)
    : pkg.version === version;
}

test('registry metadata agrees with the release version and identity', () => {
  const pkg = json('package.json');
  const server = json('server.json');
  assert.equal(server.version, pkg.version);
  assert.equal(server.name, pkg.mcpName);
  assert.equal(json('mcpb/manifest.json').version, pkg.version);
  assert.ok(server.packages.length > 0);
  for (const entry of server.packages) assert.ok(versionMatches(entry, pkg.version), entry.identifier);
  assert.match(read('Dockerfile'), new RegExp(`LABEL io\\.modelcontextprotocol\\.server\\.name="${server.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
});

test('package version comparison rejects mismatches', () => {
  assert.equal(versionMatches({ registryType: 'npm', version: '1.0.0' }, '1.0.1'), false);
  assert.equal(versionMatches({ registryType: 'oci', identifier: 'image:1.0.0' }, '1.0.1'), false);
  assert.equal(versionMatches({ registryType: 'oci', identifier: 'image:1.0.1', version: '1.0.1' }, '1.0.1'), false);
});

test('version sync preserves current files and rejects a missing manifest version', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'registry-metadata-'));
  const files = ['package.json', 'server.json', 'mcpb/manifest.json', 'python/polarion_alm_mcp/__init__.py', 'python/README.md'];
  try {
    for (const file of files) {
      mkdirSync(dirname(resolve(temp, file)), { recursive: true });
      copyFileSync(resolve(root, file), resolve(temp, file));
    }
    const before = files.map(file => readFileSync(resolve(temp, file)));
    const run = () => spawnSync(process.execPath, [resolve(root, 'scripts/sync-server-json.mjs')], { cwd: temp, encoding: 'utf8' });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    for (const [index, file] of files.entries()) assert.deepEqual(readFileSync(resolve(temp, file)), before[index], file);
    const manifest = resolve(temp, 'mcpb/manifest.json');
    writeFileSync(manifest, '{"name":"test"}\n');
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /manifest version field not found/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('site llms.txt relative links resolve', () => {
  const content = read('docs/llms.txt');
  const links = [...content.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(links.length);
  for (const link of links) {
    if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
    assert.ok(existsSync(resolve(root, 'docs', link.split('#')[0])), `broken link: ${link}`);
  }
});
