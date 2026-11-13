import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

test('site llms.txt relative links resolve', () => {
  const content = read('docs/llms.txt');
  const links = [...content.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(links.length);
  for (const link of links) {
    if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
    assert.ok(existsSync(resolve(root, 'docs', link.split('#')[0])), `broken link: ${link}`);
  }
});
