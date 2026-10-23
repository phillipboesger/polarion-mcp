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
  assert.match(result.stdout ?? '', /client block and generated tool counts are up to date/);
});

test('clean documentation fixture passes every rule', t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = run(root);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /no findings/);
});

const expectedRules = [
  'env-vars', 'tool-references', 'prompt-resource-references', 'markdown-links-toc',
  'tool-call-examples', 'crlf', 'website-counts', 'client-references',
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
