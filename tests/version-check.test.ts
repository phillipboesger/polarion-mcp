import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, checkPolarionVersion, createVersionCheck } from '../src/version-check.js';
import { GENERATED_FROM_POLARION_VERSION } from '../src/generated-from.js';
import { readFileSync } from 'node:fs';

test('version comparison handles older, newer, equal and unparseable values', () => {
  assert.equal(compareVersions('3.25.12'), 'older');
  assert.equal(compareVersions('2607'), 'newer');
  assert.equal(compareVersions('2606'), 'equal');
  assert.equal(compareVersions('unknown'), 'unparseable');
});

test('generated version matches the coverage report', () => {
  const report = JSON.parse(readFileSync('docs/quality/rest-coverage.json', 'utf8')) as { generatedFromPolarionVersion: string };
  assert.equal(report.generatedFromPolarionVersion, GENERATED_FROM_POLARION_VERSION);
});

test('version check warns only for comparable different server versions', async () => {
  for (const [version, expected] of [['3.25.12', 'older'], ['2607', 'newer'], ['3.26.0', 'equal'], ['unknown', 'unparseable']] as const) {
    const warnings: string[] = [];
    await checkPolarionVersion({ apiBaseUrl: 'https://polarion.test/rest/v1', logger: { warn: message => warnings.push(message) }, fetchImpl: async () => new Response(JSON.stringify({ data: { attributes: { version } } })) });
    assert.equal(warnings.length, expected === 'older' || expected === 'newer' ? 1 : 0);
  }
});

test('version check swallows timeout and fetch errors', async () => {
  const logger = { warn: (_message: string) => { throw new Error('logger failure'); } };
  await assert.doesNotReject(checkPolarionVersion({ apiBaseUrl: 'https://polarion.test', logger, fetchImpl: async () => { throw new Error('network'); } }));
  await assert.doesNotReject(checkPolarionVersion({ apiBaseUrl: 'https://polarion.test', logger, fetchImpl: (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('timeout')))) }));
});

test('first-call trigger starts at most one non-blocking check', () => {
  let count = 0;
  const check = createVersionCheck({ apiBaseUrl: 'https://polarion.test', logger: { warn() {} }, fetchImpl: async () => { count++; return new Response('{}'); } });
  check(); check();
  assert.equal(count, 1);
});
