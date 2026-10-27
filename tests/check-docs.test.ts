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
  assert.match(result.stdout ?? '', /paths, domains and daily examples are up to date/);
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

// The guide rules need the real manifest, guides and site, so these cases copy them into a temporary root.
function repoCopy(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-repo-'));
  const skip = /(^|[\\/])(node_modules|\.git|build|build-tests|test-results|coverage|assets|fonts|evals)([\\/]|$)/;
  fs.cpSync(repo, root, { recursive: true, filter: source => !skip.test(path.relative(repo, source)) });
  return root;
}

const guideCases: Array<[string, (root: string) => void, RegExp]> = [
  ['a missing guide', root => fs.rmSync(path.join(root, 'docs/guides/clients/cursor.md')), /cursor\.md:1: generated guide is missing or stale/],
  ['a guide without the required sections', root => {
    const file = path.join(root, 'docs/guides/clients/cursor.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## If it fails', '## Troubleshooting'));
  }, /cursor\.md:1: guide is missing the "If it fails" section/],
  ['a dangling link in a guide', root => fs.appendFileSync(path.join(root, 'docs/guides/clients/cursor.md'), '\n[gone](../missing.md)\n'), /WARNING markdown-links-toc docs\/guides\/clients\/cursor\.md/],
  ['install steps on the website', root => {
    const file = path.join(root, 'docs/index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('<!-- clients:end -->', '<ol><li>Install it</li></ol>\n<!-- clients:end -->'));
  }, /website clients section contains numbered steps/],
  ['a website link to a missing guide', root => {
    const file = path.join(root, 'docs/index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('docs/guides/clients/cursor.md', 'docs/guides/clients/nope.md'));
  }, /link target docs\/guides\/clients\/nope\.md does not exist/],
];

test('guide rules pass on the real repository content', t => {
  const root = repoCopy();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = run(root, true);
  assert.equal(result.status, 0, result.output);
});

for (const [name, mutate, expected] of guideCases) {
  test(`strict mode reports ${name}`, t => {
    const root = repoCopy();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    mutate(root);
    const result = run(root, true);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, expected);
  });
}
