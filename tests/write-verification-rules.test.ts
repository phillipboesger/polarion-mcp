import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { executeApiTool } from '../src/executor.js';
import { isVerifiableRoute, parseVerifyMaxItems, writeLimitsFromEnv } from '../src/write-verification.js';
import { securitySchemes, toolDefinitionMap } from '../src/tools.js';
import type { McpToolDefinition } from '../src/types.js';

// A default-on check must never turn a successful write into an error unless an attribute was clearly dropped.

const FAST = { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 };
type Verification = { status: string; mismatches: Array<{ field: string }>; uncertain: Array<{ field: string }>; skipped?: Array<{ item?: string; reason: string }>; reason?: string };

const documentDefinition: McpToolDefinition = {
  name: 'patchDocument', description: '', method: 'patch',
  pathTemplate: '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}',
  executionParameters: ['projectId', 'spaceId', 'documentName'].map(name => ({ name, in: 'path' })),
  requestBodyContentType: 'application/json', securityRequirements: [],
  inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, spaceId: { type: 'string' }, documentName: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'spaceId', 'documentName', 'requestBody'] },
};

function verificationOf(result: Awaited<ReturnType<typeof executeApiTool>>): Verification {
  const text = result.content[0];
  assert.equal(text.type, 'text');
  const body = text.type === 'text' ? text.text : '';
  return JSON.parse(body.slice(body.indexOf('\n') + 1)).verification as Verification;
}

/** Runs one document PATCH against a fake Polarion whose read-back returns `readBack`. */
async function verifyPatch(sent: Record<string, unknown>, readBack: Record<string, unknown>, body?: unknown) {
  const server = createServer((req, res) => {
    if (req.method === 'PATCH') return res.writeHead(204).end();
    if (req.url?.includes('getFieldsMetadata')) return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: Object.fromEntries(Object.keys(sent).map(key => [key, {}])) } }));
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: readBack } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const requestBody = body ?? { data: { attributes: sent } };
    const result = await executeApiTool('patchDocument', documentDefinition, { projectId: 'p', spaceId: 's', documentName: 'd', requestBody }, {}, FAST, undefined, base, true);
    return { result, text: JSON.stringify(result), verification: verificationOf(result) };
  } finally { server.close(); await once(server, 'close'); }
}

test('clearing a field is verified when the read-back omits it, nulls it or empties it', async () => {
  for (const [sent, readBack] of [
    [null, {}], [null, { myField: null }], [null, { myField: '' }], [null, { myField: [] }],
    ['', {}], ['', { myField: null }], [[], {}], [[], { myField: [] }],
  ] as const) {
    const { result, verification } = await verifyPatch({ myField: sent }, readBack);
    assert.notEqual(result.isError, true, JSON.stringify([sent, readBack]));
    assert.equal(verification.status, 'verified', JSON.stringify([sent, readBack]));
  }
});

test('a clear that did not take effect is uncertain, not a hard mismatch', async () => {
  const { result, verification } = await verifyPatch({ myField: null }, { myField: 'still here' });
  assert.notEqual(result.isError, true);
  assert.equal(verification.status, 'uncertain');
  assert.deepEqual(verification.uncertain.map(item => item.field), ['myField']);
});

test('rich text compares by normalized text across plain and html', async () => {
  for (const [sent, actual] of [
    [{ type: 'text/plain', value: 'hello  world' }, { type: 'text/html', value: '<p>hello world</p>' }],
    [{ type: 'text/html', value: 'hello' }, { type: 'text/html', value: '<p>hello</p>' }],
    [{ type: 'text/html', value: '<p>a &amp; b</p>' }, { type: 'text/plain', value: 'a & b' }],
    [{ type: 'text/plain', value: 'x <b> y' }, { type: 'text/html', value: '<p>x &lt;b&gt; y</p>' }],
    [{ type: 'text/html', value: '<p>one</p><p>two</p>' }, { type: 'text/html', value: '<div>one</div>\n<div>two</div>' }],
  ] as const) {
    const { result, verification } = await verifyPatch({ description: sent }, { description: actual });
    assert.notEqual(result.isError, true);
    assert.equal(verification.status, 'verified', JSON.stringify([sent, actual]));
  }
});

test('rich text that differs after normalization is uncertain and never an error', async () => {
  for (const readBack of [{ description: { type: 'text/html', value: '<p>something else</p>' } }, {}]) {
    const { result, text, verification } = await verifyPatch({ description: { type: 'text/html', value: '<p>hello</p>' } }, readBack);
    assert.notEqual(result.isError, true);
    assert.equal(verification.status, 'uncertain');
    assert.deepEqual(verification.mismatches, []);
    assert.deepEqual(verification.uncertain.map(item => item.field), ['description']);
    assert.match(text, /normalized or recomputed/);
  }
});

test('numbers, booleans, dates and arrays compare by value rather than representation', async () => {
  const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
    [{ estimate: 2 }, { estimate: '2' }],
    [{ estimate: '2.5' }, { estimate: 2.5 }],
    [{ flag: true }, { flag: 'true' }],
    [{ dueDate: '2026-01-02' }, { dueDate: '2026-01-02' }],
    [{ when: '2026-01-02T10:00:00Z' }, { when: '2026-01-02T10:00:00.000Z' }],
    [{ dueDate: '2026-01-02T00:00:00Z' }, { dueDate: '2026-01-02' }],
    [{ tags: ['b', 'a'] }, { tags: ['a', 'b'] }],
    [{ title: '  new  title ' }, { title: 'new title' }],
  ];
  for (const [sent, readBack] of cases) {
    const { result, verification } = await verifyPatch(sent, readBack);
    assert.notEqual(result.isError, true, JSON.stringify(sent));
    assert.equal(verification.status, 'verified', JSON.stringify([sent, readBack]));
  }
});

test('status, workflow and computed attributes that differ are uncertain', async () => {
  for (const [sent, readBack] of [
    [{ status: 'closed' }, { status: 'open' }],
    [{ resolution: 'fixed' }, {}],
    [{ outlineNumber: '1.2' }, { outlineNumber: '3' }],
    [{ updated: '2026-01-01T00:00:00Z' }, { updated: '2026-02-02T00:00:00Z' }],
    [{ revision: '10' }, { revision: '11' }],
  ] as const) {
    const { result, text, verification } = await verifyPatch(sent, readBack);
    assert.notEqual(result.isError, true, JSON.stringify(sent));
    assert.equal(verification.status, 'uncertain', JSON.stringify(sent));
    assert.deepEqual(verification.mismatches, []);
    assert.match(text, /normalized or recomputed/);
  }
});

test('a silently dropped or clearly different custom field is a hard mismatch', async () => {
  for (const readBack of [{}, { myCustom: 'other' }, { myCustom: null }]) {
    const { result, verification } = await verifyPatch({ myCustom: 'wanted' }, readBack);
    assert.equal(result.isError, true, JSON.stringify(readBack));
    assert.equal(verification.status, 'mismatch');
    assert.deepEqual(verification.mismatches.map(item => item.field), ['myCustom']);
  }
});

test('a mismatch is reported even when other fields are only uncertain', async () => {
  const { result, verification } = await verifyPatch({ myCustom: 'wanted', status: 'closed' }, { status: 'open' });
  assert.equal(result.isError, true);
  assert.equal(verification.status, 'mismatch');
  assert.deepEqual(verification.uncertain.map(item => item.field), ['status']);
});

test('a 204 write whose change is visible on read-back is verified', async () => {
  const { result, verification } = await verifyPatch({ title: 'new' }, { title: 'new', updated: '2026-03-03T00:00:00Z' });
  assert.notEqual(result.isError, true);
  assert.equal(verification.status, 'verified');
  assert.deepEqual(verification.mismatches, []);
  assert.deepEqual(verification.uncertain, []);
});

test('relationship writes are skipped with a reason and stay successful', async () => {
  const relationships = { assignee: { data: [{ type: 'users', id: 'u1' }] } };
  const only = await verifyPatch({}, {}, { data: { relationships } });
  assert.notEqual(only.result.isError, true);
  assert.equal(only.verification.status, 'skipped');
  assert.match(only.verification.reason ?? '', /relationships not verified/);
  const both = await verifyPatch({ title: 'new' }, { title: 'new' }, { data: { attributes: { title: 'new' }, relationships } });
  assert.equal(both.verification.status, 'verified');
  assert.match(JSON.stringify(both.verification.skipped), /relationships not verified/);
});

test('a failed read-back leaves the write a success and reports skipped', async () => {
  const server = createServer((req, res) => (req.method === 'PATCH' ? res.writeHead(204) : res.writeHead(500)).end());
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await executeApiTool('patchDocument', documentDefinition, { projectId: 'p', spaceId: 's', documentName: 'd', requestBody: { data: { attributes: { title: 'x' } } } }, {}, FAST, undefined, base, true);
    assert.notEqual(result.isError, true);
    const verification = verificationOf(result);
    assert.equal(verification.status, 'skipped');
    assert.match(verification.reason ?? '', /Read-back failed/);
  } finally { server.close(); await once(server, 'close'); }
});

// ---- Bulk cap ----

const bulkDefinition: McpToolDefinition = { ...documentDefinition, name: 'patchWorkItemsBulk', pathTemplate: '/projects/{projectId}/workitems', executionParameters: [{ name: 'projectId', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'requestBody'] } };

async function bulkRun(count: number, method: 'patch' | 'post', limits?: { verifyMaxItems?: number }) {
  const reads: string[] = [];
  const server = createServer((req, res) => {
    if (req.method !== 'GET') {
      const created = Array.from({ length: count }, (_, index) => ({ type: 'workitems', id: `P/WI-${index + 1}` }));
      return res.writeHead(method === 'post' ? 201 : 204, { 'content-type': 'application/json' }).end(method === 'post' ? JSON.stringify({ data: created }) : undefined);
    }
    reads.push(req.url ?? '');
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title: 'new' } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const data = Array.from({ length: count }, (_, index) => ({ type: 'workitems', id: `P/WI-${index + 1}`, attributes: { title: 'new' } }));
    const result = await executeApiTool('patchWorkItemsBulk', { ...bulkDefinition, method }, { projectId: 'P', requestBody: { data } }, {}, FAST, undefined, base, true, limits);
    return { result, reads, verification: verificationOf(result) };
  } finally { server.close(); await once(server, 'close'); }
}

test('bulk writes verify at most 10 items by default and report the rest as skipped', async () => {
  for (const method of ['patch', 'post'] as const) {
    const { result, reads, verification } = await bulkRun(25, method);
    assert.notEqual(result.isError, true);
    assert.equal(reads.length, 10, method);
    assert.equal(verification.status, 'verified');
    assert.equal(verification.skipped?.length, 15);
    assert.ok(verification.skipped?.every(item => item.reason === 'beyond verify limit'));
    assert.equal(verification.skipped?.[0].item, 'P/WI-11');
  }
});

test('the verify item limit is configurable', async () => {
  const { reads, verification } = await bulkRun(5, 'patch', { verifyMaxItems: 2 });
  assert.equal(reads.length, 2);
  assert.equal(verification.skipped?.length, 3);
  const all = await bulkRun(5, 'patch', { verifyMaxItems: 50 });
  assert.equal(all.reads.length, 5);
  assert.equal(all.verification.skipped, undefined);
});

// ---- Read-back requests keep query-parameter authentication ----

test('read-back and dry-run diff GETs merge fields=@all into existing query params such as an apiKey', async () => {
  const requests: Array<{ method: string; url: string }> = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method ?? '', url: req.url ?? '' });
    if (req.method === 'PATCH') return res.writeHead(204).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title: 'new' } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const previous = process.env.API_KEY_QUERYKEY; process.env.API_KEY_QUERYKEY = 'query-secret-value';
  const def: McpToolDefinition = { ...documentDefinition, name: 'patchQueryAuth', pathTemplate: '/projects/{projectId}/workitems/{workItemId}', executionParameters: [{ name: 'projectId', in: 'path' }, { name: 'workItemId', in: 'path' }], securityRequirements: [{ queryKey: [] }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, workItemId: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'workItemId', 'requestBody'] } };
  const schemes = { queryKey: { type: 'apiKey', in: 'query', name: 'api_key' } };
  try {
    for (const dry_run of [false, true]) {
      requests.length = 0;
      await executeApiTool('patchQueryAuth', def, { projectId: 'p', workItemId: 'W-1', dry_run, requestBody: { data: { attributes: { title: 'new' } } } }, schemes, FAST, undefined, base, true);
      const get = requests.find(item => item.method === 'GET');
      assert.ok(get, `a read happened (dry_run=${dry_run})`);
      assert.match(get.url, /api_key=query-secret-value/);
      assert.match(get.url, /fields=(%40|@)all/);
    }
  } finally { if (previous === undefined) delete process.env.API_KEY_QUERYKEY; else process.env.API_KEY_QUERYKEY = previous; server.close(); await once(server, 'close'); }
});

// ---- Attachment limit shares MCP_UPLOAD_MAX_BYTES ----

test('attachment uploads use one configurable size limit and a raised limit passes', async () => {
  const previousToken = process.env.BEARER_TOKEN; process.env.BEARER_TOKEN ??= 'test-token';
  const call = (size: number, limits?: { uploadMaxBytes?: number }) => executeApiTool('postWorkItemAttachments', toolDefinitionMap.get('postWorkItemAttachments')!, { projectId: 'p', workItemId: 'W-1', dry_run: true, requestBody: { resource: { data: [{ type: 'workitem_attachments', attributes: { fileName: 'a.bin' } }] }, files: [Buffer.alloc(size, 1).toString('base64')] } }, securitySchemes, FAST, undefined, 'http://127.0.0.1:1', true, limits);
  try {
  const refused = await call(1500, { uploadMaxBytes: 1000 });
  assert.equal(refused.isError, true); assert.match(JSON.stringify(refused), /1000 bytes limit/);
  assert.notEqual((await call(1500, { uploadMaxBytes: 2000 })).isError, true);
  const mib = 1024 * 1024;
  const overDefault = await call(26 * mib);
  assert.equal(overDefault.isError, true); assert.match(JSON.stringify(overDefault), /25 MiB limit/);
  assert.notEqual((await call(26 * mib, { uploadMaxBytes: 30 * mib })).isError, true);
  } finally { if (previousToken === undefined) delete process.env.BEARER_TOKEN; }
});

// ---- Pure helpers ----

test('only routes with a read-back implementation advertise verify', () => {
  const route = (method: string, pathTemplate: string) => isVerifiableRoute({ method, pathTemplate });
  assert.equal(route('patch', '/projects/{projectId}/workitems/{workItemId}'), true);
  assert.equal(route('patch', '/projects/{projectId}/workitems'), true);
  assert.equal(route('patch', '/all/workitems'), true);
  assert.equal(route('post', '/projects/{projectId}/workitems'), true);
  assert.equal(route('patch', '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}'), true);
  assert.equal(route('delete', '/projects/{projectId}/workitems/{workItemId}'), false);
  assert.equal(route('post', '/projects/{projectId}/workitems/{workItemId}/attachments'), false);
  assert.equal(route('patch', '/projects/{projectId}/testruns/{testRunId}'), false);
  assert.equal(parseVerifyMaxItems(undefined), 10);
  assert.equal(parseVerifyMaxItems('3'), 3);
  assert.equal(parseVerifyMaxItems('0'), 10);
  assert.equal(parseVerifyMaxItems('abc'), 10);
});

test('write limits are parsed once from the environment with safe defaults', () => {
  assert.deepEqual(writeLimitsFromEnv({}), { verifyMaxItems: 10, uploadMaxBytes: 25 * 1024 * 1024 });
  assert.deepEqual(writeLimitsFromEnv({ MCP_VERIFY_MAX_ITEMS: '4', MCP_UPLOAD_MAX_BYTES: '50000000' }), { verifyMaxItems: 4, uploadMaxBytes: 50_000_000 });
  assert.deepEqual(writeLimitsFromEnv({ MCP_VERIFY_MAX_ITEMS: '-1', MCP_UPLOAD_MAX_BYTES: 'big' }), { verifyMaxItems: 10, uploadMaxBytes: 25 * 1024 * 1024 });
});
