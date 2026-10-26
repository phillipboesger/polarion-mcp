import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const repo = process.cwd();
const fixtures = path.join(repo, 'tests/fixtures/check-docs');
const checker = path.join(repo, 'scripts/check-docs.mjs');

function fixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
  fs.cpSync(path.join(fixtures, 'clean'), root, { recursive: true });
  for (const file of ['docs/configuration.md', 'docs/deployment.md', 'docs/security.md']) {
    const absolute = path.join(root, file);
    fs.writeFileSync(absolute, fs.readFileSync(absolute, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  return root;
}

function run(root: string, strict = false) {
  const result = spawnSync(process.execPath, [checker, '--root', root, ...(strict ? ['--strict'] : [])], { encoding: 'utf8' });
  return { ...result, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

test('website client block matches the rendered client manifest', () => {
  const renderer = path.join(repo, 'scripts/render-site.mjs');
  const result = spawnSync(process.execPath, [renderer, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  assert.match(result.stdout ?? '', /setup, domains and daily examples are up to date/);
});

test('clean documentation fixture passes every rule', t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = run(root);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /no findings/);
});

test('strict mode catches container examples that drift from the release version', t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"1.4.0"}');
  const readme = path.join(root, 'README.md');
  fs.appendFileSync(readme, '\nContainer: `ghcr.io/phillipboesger/polarion-mcp:1.4.0`\n');
  assert.equal(run(root, true).status, 0);
  fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace(':1.4.0', ':1.3.0'));
  const result = run(root, true);
  assert.equal(result.status, 1);
  assert.match(result.output, /container example pins 1\.3\.0; package version is 1\.4\.0/);
});

const expectedRules = [
  'env-vars', 'tool-references', 'prompt-resource-references', 'markdown-links-toc',
  'tool-call-examples', 'crlf', 'website-counts', 'client-references', 'duplicate-config-entries',
];
for (const rule of expectedRules) {
  test(`${rule} catches its fixture error and strict mode fails`, t => {
    const root = fixtureRoot();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const patchFile = path.join(fixtures, 'errors', `${rule}.json`);
    const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8')) as { file: string; find?: string; replace?: string; mode?: string };
    const target = path.join(root, patch.file);
    let contents = fs.readFileSync(target, 'utf8');
    if (patch.mode === 'bare-lf') contents = contents.replace(/\r\n/g, '\n');
    else {
      assert.ok(patch.find && contents.includes(patch.find), `fixture does not contain expected marker: ${patch.find}`);
      contents = contents.replace(patch.find!, patch.replace!);
    }
    fs.writeFileSync(target, contents);
    if (rule === 'client-references') fs.writeFileSync(path.join(root, 'docs/clients.json'), '{"clients":[{"name":"Known Client"}]}\n');
    const result = run(root, true);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, new RegExp(`WARNING ${rule} `));
  });
}

test('strict mode reports a duplicated known configuration variable with its location', t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = path.join(root, 'docs/configuration.md');
  fs.writeFileSync(config, [
    '# Configuration',
    '',
    '| Variable | Default | Read by | Secret? | Purpose |',
    '|---|---|---|---|---|',
    '| `TEST_ENV` | `one` | fixture | No | First entry. |',
    '| `TEST_ENV` | `two` | fixture | No | Duplicate entry. |',
    '',
  ].join('\r\n'));
  const result = run(root, true);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /WARNING duplicate-config-entries docs\/configuration\.md:6: TEST_ENV is duplicated; first listed at line 5/);
});
