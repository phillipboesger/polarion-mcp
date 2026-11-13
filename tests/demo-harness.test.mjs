// Tests for the demo harness in scripts/demo. None needs Docker, ffmpeg or a network beyond loopback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { DEMO, assertLocalTarget, isLocalUrl, restBase } from '../scripts/demo/lib/common.mjs';
import { REDACTED, assertNoSecrets, redact } from '../scripts/demo/lib/redact.mjs';
import { buildReplayPage, safeImageUri, summarizeToolStep, totalSeconds } from '../scripts/demo/lib/page.mjs';
import { ffmpegArgs, writeReplayPage } from '../scripts/demo/render.mjs';
import { runSeed } from '../scripts/demo/seed.mjs';
import { recordTranscript, writeTranscript } from '../scripts/demo/record.mjs';
import { startMockPolarion } from '../scripts/demo/lib/mock-polarion.mjs';

const TOKEN = 'pat-SuperSecretToken-1234567890';

const fixture = () => ({
  schema: 1,
  mode: 'live',
  caption: 'Replay of real tool calls, assistant text scripted',
  server: { name: 'polarion-rest-api', version: '1.5.0' },
  project: 'brakedemo',
  liveDocSec: 15,
  endCardSec: 5,
  steps: [
    { kind: 'user', holdSec: 8, text: 'Draft <b>three</b> requirements.' },
    {
      kind: 'tool', holdSec: 14, label: 'dry_run', tool: 'postWorkItems', durationMs: 120,
      args: { projectId: 'brakedemo', dry_run: true, requestBody: { data: [{ type: 'workitems', attributes: { type: 'requirement', title: 'R1', asil: 'D' } }] } },
      result: {
        isError: false, content: [{ type: 'text', text: 'Dry run: ...' }],
        structuredContent: { dry_run: true, preview: { method: 'POST', url: 'http://localhost/polarion/rest/v1/projects/brakedemo/workitems', warnings: ["Unknown field key(s) asil for a new 'requirement' Work Item in brakedemo, not defined for this type."] } },
      },
    },
    {
      kind: 'tool', holdSec: 20, label: 'write', tool: 'postWorkItems', durationMs: 900,
      args: { projectId: 'brakedemo', requestBody: { data: [{ type: 'workitems', attributes: { type: 'requirement', title: 'R1', asilLevel: 'D' } }] } },
      result: {
        isError: false, content: [{ type: 'text', text: 'API Response (Status: 201)' }],
        structuredContent: { data: [{ type: 'workitems', id: 'brakedemo/BRK-1' }], verification: { status: 'verified', mismatches: [], uncertain: [], skipped: [] } },
      },
    },
  ],
});

test('redact removes the token in every form and from sensitive keys', () => {
  const input = {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
    url: `http://x/y?apiKey=${encodeURIComponent(TOKEN)}`,
    nested: [{ text: `basic ${Buffer.from(`admin:${TOKEN}`).toString('base64')}`, token: 'whatever' }, `raw ${TOKEN} and Bearer abcdefghijkl12345`],
    password: 'hunter2hunter2',
    count: 3,
  };
  const out = redact(input, [TOKEN]);
  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes(TOKEN));
  assert.ok(!serialized.includes(encodeURIComponent(TOKEN)));
  assert.ok(!serialized.includes('abcdefghijkl12345'));
  assert.ok(!serialized.includes('hunter2'));
  assert.equal(out.headers.Authorization, REDACTED);
  assert.equal(out.headers.accept, 'application/json');
  assert.equal(out.count, 3);
  assert.doesNotThrow(() => assertNoSecrets(serialized, [TOKEN]));
  assert.throws(() => assertNoSecrets(JSON.stringify(input), [TOKEN]), /secret value is still present/);
});

test('writeTranscript refuses to write when a token survived redaction', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-transcript-'));
  try {
    assert.throws(() => writeTranscript({ steps: [{ text: TOKEN }] }, dir, [TOKEN]), /secret value/);
    assert.equal(fs.existsSync(path.join(dir, 'transcript.json')), false);
    const file = writeTranscript(redact({ steps: [{ text: TOKEN }] }, [TOKEN]), dir, [TOKEN]);
    assert.ok(!fs.readFileSync(file, 'utf8').includes(TOKEN));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('isLocalUrl accepts loopback only and cannot be fooled by look-alike hosts', () => {
  for (const url of ['http://localhost', 'http://localhost:8080/polarion', 'http://127.0.0.1/polarion/rest/v1', 'http://[::1]:80', 'http://polarion.localhost']) assert.equal(isLocalUrl(url), true, url);
  for (const url of ['https://polarion.example.com', 'http://localhost.evil.com', 'http://127.0.0.1@evil.com', 'http://10.0.0.5', 'http://192.168.1.2', 'not a url', '']) assert.equal(isLocalUrl(url), false, url);
  assert.equal(restBase('http://localhost/'), 'http://localhost/polarion/rest/v1');
  assert.equal(restBase('http://localhost/polarion/rest/v1'), 'http://localhost/polarion/rest/v1');
});

test('seed refuses a non-local URL before any request, unless --i-know is given', async () => {
  const calls = [];
  const fetchImpl = (url, init) => { calls.push(`${init.method} ${url}`); return Promise.resolve(new Response('{}', { status: 200 })); };
  await assert.rejects(runSeed({ baseUrl: 'https://polarion.example.com', token: TOKEN, fetchImpl }), /non-local Polarion URL.*--i-know/);
  await assert.rejects(runSeed({ baseUrl: 'http://localhost.evil.com', token: TOKEN, fetchImpl }), /non-local/);
  assert.equal(calls.length, 0);
  await runSeed({ baseUrl: 'https://polarion.example.com', token: TOKEN, iKnow: true, fetchImpl });
  assert.ok(calls.length > 0);
});

test('seed is idempotent: second run creates nothing and warns about a missing custom field', async () => {
  const state = { project: false, document: false };
  const writes = [];
  const fetchImpl = (url, init) => {
    const route = new URL(url).pathname.replace('/polarion/rest/v1', '');
    const json = (status, body = {}) => Promise.resolve(new Response(JSON.stringify(body), { status }));
    if (init.method === 'POST') {
      writes.push(route);
      if (route === '/projects/actions/createProject') state.project = true;
      else state.document = true;
      return json(201);
    }
    if (route === `/projects/${DEMO.project}`) return json(state.project ? 200 : 404);
    if (route.endsWith(`/documents/${DEMO.document}`)) return json(state.document ? 200 : 404);
    if (route.endsWith('/actions/getFieldsMetadata')) return json(200, { data: { attributes: { title: {}, type: {} } } });
    return json(404);
  };
  const log = [];
  const first = await runSeed({ baseUrl: 'http://localhost', token: TOKEN, fetchImpl, pollMs: 1, log: line => log.push(line) });
  assert.equal(first.created.length, 2);
  assert.equal(first.missingCustomField, true);
  assert.match(log.join('\n'), /custom field "asilLevel"/);
  const writesAfterFirst = writes.length;
  const second = await runSeed({ baseUrl: 'http://localhost', token: TOKEN, fetchImpl, pollMs: 1 });
  assert.equal(second.created.length, 0);
  assert.equal(second.existing.length, 2);
  assert.equal(writes.length, writesAfterFirst);
});

test('summarizeToolStep derives warnings, flagged fields and verification from the recorded response', () => {
  const [, dry, write] = fixture().steps;
  const dryView = summarizeToolStep(dry);
  assert.equal(dryView.badge, 'dry_run');
  assert.equal(dryView.outcome.kind, 'preview');
  assert.equal(dryView.outcome.warnings.length, 1);
  assert.deepEqual(dryView.items[0].fields, [{ name: 'asil', value: 'D', flagged: true }]);
  const writeView = summarizeToolStep(write);
  assert.equal(writeView.badge, 'write');
  assert.equal(writeView.outcome.headline, 'Created BRK-1');
  assert.equal(writeView.outcome.verification.status, 'verified');
  const failed = summarizeToolStep({ ...write, result: { isError: true, content: [{ type: 'text', text: 'Write refused: nope' }] } });
  assert.equal(failed.outcome.kind, 'error');
});

test('replay page is generated from a fixture transcript: caption, no raw HTML injection, mock watermark', () => {
  const html = buildReplayPage(fixture());
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Replay of real tool calls, assistant text scripted/);
  assert.match(html, /id="demo-data"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /<html lang="en" data-mode="live">/);
  assert.equal(totalSeconds(fixture()), 8 + 14 + 20 + 15 + 5);
  // The user text contains markup; it must only appear escaped inside the JSON island.
  assert.ok(!html.includes('<b>three</b>'));
  const island = /<script type="application\/json" id="demo-data">([\s\S]*?)<\/script>/.exec(html)[1];
  const data = JSON.parse(island);
  assert.equal(data.steps[0].text, 'Draft <b>three</b> requirements.');
  assert.equal(data.mock, false);
  assert.equal(data.total, 62);

  const mock = buildReplayPage({ ...fixture(), mode: 'mock' });
  assert.match(mock, /data-mode="mock"/);
  assert.match(mock, /MOCK - not for publication/);
  assert.match(mock, /html\[data-mode="mock"\] #watermark \{ display:flex; \}/);
  assert.ok(JSON.parse(/id="demo-data">([\s\S]*?)<\/script>/.exec(mock)[1]).mock);
});

test('writeReplayPage reads transcript and screenshots from the output directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-render-'));
  try {
    fs.writeFileSync(path.join(dir, 'transcript.json'), JSON.stringify(fixture()));
    const without = writeReplayPage(dir);
    assert.equal(without.hasScreenshots, false);
    fs.mkdirSync(path.join(dir, 'screenshots'));
    fs.writeFileSync(path.join(dir, 'screenshots', 'before.png'), 'x');
    fs.writeFileSync(path.join(dir, 'screenshots', 'after.png'), 'y');
    const withShots = writeReplayPage(dir);
    assert.equal(withShots.hasScreenshots, true);
    assert.match(fs.readFileSync(withShots.file, 'utf8'), /data:image\/png;base64,eA==/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ffmpeg arguments trim to the recorded window and loosen quality per level', () => {
  const base = { input: 'in.webm', output: 'out', offsetSec: 1.5, durationSec: 62 };
  const mp4 = ffmpegArgs({ ...base, kind: 'mp4' });
  assert.deepEqual(mp4.slice(0, 5), ['-y', '-ss', '1.50', '-t', '62.00']);
  assert.ok(mp4.includes('libx264') && mp4.includes('yuv420p'));
  assert.notEqual(ffmpegArgs({ ...base, kind: 'webm', level: 0 }).join(' '), ffmpegArgs({ ...base, kind: 'webm', level: 2 }).join(' '));
  assert.match(ffmpegArgs({ ...base, kind: 'gif' }).join(' '), /palettegen/);
});

const entry = path.resolve('build', 'index.js');
test('recordTranscript against the mock Polarion records a dry run and a verified write without leaking the token', { skip: !fs.existsSync(entry) && 'build/index.js missing (run npm run build)' }, async () => {
  const token = 'mock-test-token-do-not-leak-42';
  const mock = await startMockPolarion({ token });
  try {
    const transcript = await recordTranscript({ apiBaseUrl: mock.baseUrl, token, mode: 'mock', entry });
    const tools = transcript.steps.filter(step => step.kind === 'tool');
    assert.deepEqual(tools.map(step => step.label), ['dry_run', 'write']);
    const dry = summarizeToolStep(tools[0]);
    assert.ok(dry.outcome.warnings.some(warning => warning.includes(DEMO.wrongCustomField)));
    assert.equal(mock.items.size === 3, true);
    const written = summarizeToolStep(tools[1]);
    assert.equal(written.outcome.verification.status, 'verified');
    assert.ok(!JSON.stringify(transcript).includes(token));
    // The dry run must not have created anything: exactly one POST reached the fake.
    assert.equal(mock.requests.filter(request => request.method === 'POST').length, 1);
  } finally {
    await mock.close();
  }
});

/** Runs the browser script against a minimal DOM stub and returns every value assigned to an element's `src`. */
function runClientWithScreenshots(screenshots) {
  const data = { ...JSON.parse(/id="demo-data">([\s\S]*?)<\/script>/.exec(buildReplayPage(fixture()))[1]), screenshots };
  const assigned = [];
  const makeEl = tag => {
    const node = { tag, children: [], style: {}, dataset: {}, className: '', textContent: '' };
    node.classList = { toggle() {} };
    node.appendChild = child => { node.children.push(child); return child; };
    node.replaceChildren = () => { node.children = []; };
    node.querySelector = () => makeEl('div');
    Object.defineProperty(node, 'src', { set: value => { assigned.push(value); }, get: () => '' });
    return node;
  };
  const byId = {};
  const document = {
    body: makeEl('body'),
    getElementById: id => (byId[id] ??= Object.assign(makeEl('div'), id === 'demo-data' ? { textContent: JSON.stringify(data) } : {})),
    createElement: makeEl,
    createTextNode: text => ({ text }),
  };
  const window = { location: { search: '?t=70' }, matchMedia: () => ({ matches: false }) };
  vm.runInNewContext(fs.readFileSync('scripts/demo/lib/replay-client.js', 'utf8'), { document, window, URLSearchParams, performance, requestAnimationFrame() {} });
  return assigned;
}

test('screenshot values that are not PNG/JPEG data URIs are never assigned to img.src', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const jpeg = 'data:image/jpeg;base64,/9j/4AAQ';
  assert.deepEqual(runClientWithScreenshots({ before: png, after: jpeg }), [png, jpeg]);
  const bad = ['javascript:alert(1)', 'http://evil.example/x.png', 'https://evil.example/x.png', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AAAA" onerror="alert(1)', '//evil.example/x.png', 42, {}];
  for (const value of bad) assert.deepEqual(runClientWithScreenshots({ before: value, after: value }), [], String(value));
  // The same values are already dropped when the page is built.
  for (const value of bad) assert.equal(safeImageUri(value), null, String(value));
  const html = buildReplayPage(fixture(), { screenshots: { before: 'javascript:alert(1)', after: 'http://evil.example/x.png' } });
  assert.ok(!html.includes('javascript:alert'));
  assert.ok(!html.includes('evil.example'));
});

test('record.mjs refuses a non-local live target before starting the server', () => {
  const result = spawnSync(process.execPath, ['scripts/demo/record.mjs'], { env: { PATH: process.env.PATH, POLARION_BASE_URL: 'https://polarion.example.com', POLARION_TOKEN: TOKEN }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-local Polarion URL/);
  assert.ok(!result.stderr.includes(TOKEN));
  assert.equal(assertLocalTarget('http://localhost'), undefined);
});
