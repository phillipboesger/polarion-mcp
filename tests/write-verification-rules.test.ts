import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { executeApiTool } from '../src/executor.js';
import { compareAttribute, isVerifiableRoute, parseVerifyMaxItems, richTextContent, writeLimitsFromEnv } from '../src/write-verification.js';
import { securitySchemes, toolDefinitionMap } from '../src/tools.js';
import { parseUploadMaxBytes } from '../src/utils.js';
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

test('read-back and dry-run diff GETs merge fields[workitems]=@all into existing query params such as an apiKey', async () => {
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
      assert.match(get.url, /fields(%5B|\[)workitems(%5D|\])=(%40|@)all/);
      assert.doesNotMatch(get.url, /[?&]fields=/);
    }
  } finally { if (previous === undefined) delete process.env.API_KEY_QUERYKEY; else process.env.API_KEY_QUERYKEY = previous; server.close(); await once(server, 'close'); }
});

test('a document read-back asks for fields[documents]=@all and never a bare fields parameter', async () => {
  const urls: string[] = [];
  const server = createServer((req, res) => {
    urls.push(`${req.method} ${req.url}`);
    if (req.method === 'PATCH') return res.writeHead(204).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title: 'new' } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const def: McpToolDefinition = { ...documentDefinition, name: 'patchDoc', pathTemplate: '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}', executionParameters: [{ name: 'projectId', in: 'path' }, { name: 'spaceId', in: 'path' }, { name: 'documentName', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, spaceId: { type: 'string' }, documentName: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'spaceId', 'documentName', 'requestBody'] } };
    await executeApiTool('patchDoc', def, { projectId: 'p', spaceId: 's', documentName: 'd', requestBody: { data: { attributes: { title: 'new' } } } }, {}, FAST, undefined, base, true);
    const get = urls.find(item => item.startsWith('GET'));
    assert.ok(get);
    assert.match(get, /fields(%5B|\[)documents(%5D|\])=(%40|@)all/);
    assert.ok(urls.every(item => !/[?&]fields=/.test(item)));
  } finally { server.close(); await once(server, 'close'); }
});

// ---- Dry-run diff only reads single resources ----

test('dry-run on a bulk PATCH route does not GET the collection and says the diff is skipped', async () => {
  const urls: string[] = [];
  const server = createServer((req, res) => { urls.push(`${req.method} ${req.url}`); res.writeHead(200, { 'content-type': 'application/json' }).end('{"data":[]}'); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await executeApiTool('patchWorkItemsBulk', { ...bulkDefinition, method: 'patch' }, { projectId: 'P', dry_run: true, requestBody: { data: [{ type: 'workitems', id: 'P/WI-1', attributes: { title: 'new' } }] } }, {}, FAST, undefined, base, true);
    assert.notEqual(result.isError, true);
    assert.ok(!urls.some(item => item.startsWith('GET')), urls.join(', '));
    const text = (result.content[0] as { text: string }).text;
    assert.match(text, /diff skipped/);
    assert.doesNotMatch(text, /"diff"/);
  } finally { server.close(); await once(server, 'close'); }
});

// ---- A failed create names the created ids and warns against a retry ----

test('a hard mismatch on a create names the created id and says not to retry the create', async () => {
  const server = createServer((req, res) => {
    if (req.method === 'POST') return res.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ type: 'workitems', id: 'P/WI-7' }] }));
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title: 'x' } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await executeApiTool('patchWorkItemsBulk', { ...bulkDefinition, method: 'post' }, { projectId: 'P', requestBody: { data: [{ type: 'workitems', attributes: { title: 'wanted' } }] } }, {}, FAST, undefined, base, true);
    assert.equal(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assert.match(text, /Created as P\/WI-7: do not retry the create/);
    assert.match(text, /patch the item/);
  } finally { server.close(); await once(server, 'close'); }
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

test('write limits are parsed once from the environment; the upload limit uses the one strict parser', () => {
  assert.deepEqual(writeLimitsFromEnv({}), { verifyMaxItems: 10, uploadMaxBytes: 25 * 1024 * 1024 });
  assert.deepEqual(writeLimitsFromEnv({ MCP_VERIFY_MAX_ITEMS: '4', MCP_UPLOAD_MAX_BYTES: '50000000' }), { verifyMaxItems: 4, uploadMaxBytes: 50_000_000 });
  assert.equal(writeLimitsFromEnv({ MCP_VERIFY_MAX_ITEMS: '-1' }).verifyMaxItems, 10);
  for (const invalid of ['big', '0', '-5', '1.5']) {
    assert.throws(() => writeLimitsFromEnv({ MCP_UPLOAD_MAX_BYTES: invalid }), /MCP_UPLOAD_MAX_BYTES must be a positive integer/);
    assert.throws(() => parseUploadMaxBytes(invalid), /MCP_UPLOAD_MAX_BYTES must be a positive integer/);
  }
});

test('an empty upstream error on an attachment upload names method, route, content type and parts but no credential or file content', async () => {
  const token = 'fake-upload-token-98765';
  const previous = process.env.BEARER_TOKEN; process.env.BEARER_TOKEN = token;
  const server = createServer((_req, res) => res.writeHead(400).end());
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const secretContent = 'SECRET-FILE-CONTENT-ABC';
  try {
    const result = await executeApiTool('postWorkItemAttachments', toolDefinitionMap.get('postWorkItemAttachments')!, { projectId: 'p', workItemId: 'W-1', requestBody: { resource: { data: [{ type: 'workitem_attachments', attributes: { fileName: 'a.txt' } }] }, files: [Buffer.from(secretContent).toString('base64')] } }, securitySchemes, FAST, undefined, base, true);
    assert.equal(result.isError, true);
    const text = JSON.stringify(result);
    assert.match(text, /Method: POST/);
    assert.match(text, /path template: \/projects\/\{projectId\}\/workitems\/\{workItemId\}\/attachments/);
    assert.match(text, /content-type: multipart\/form-data/);
    assert.match(text, /multipart parts: resource: present, files: /);
    assert.match(text, /a\.txt/);
    for (const forbidden of [token, 'Authorization', 'Bearer', secretContent, Buffer.from(secretContent).toString('base64')]) assert.ok(!text.includes(forbidden), `must not contain ${forbidden}`);
  } finally { if (previous === undefined) delete process.env.BEARER_TOKEN; else process.env.BEARER_TOKEN = previous; server.close(); await once(server, 'close'); }
});

test('rich text normalization never leaves markup, even for nested, malformed or entity-encoded input', () => {
  for (const [value, type] of [
    ['<scr<script>ipt>alert(1)</scr</script>ipt>', 'text/html'], ['<<b>script>x', 'text/html'], ['&lt;script&gt;alert(1)&lt;/script&gt;', 'text/html'],
    ['&amp;lt;script&amp;gt;', 'text/html'], ['a < b > c <i', 'text/html'], ['<script', 'text/html'], ['<script>x</script>', 'text/plain'],
  ] as const) {
    const normalized = richTextContent(value, type);
    assert.doesNotMatch(normalized, /[<>]/, JSON.stringify(value));
    assert.doesNotMatch(normalized, /<script/i);
  }
  assert.equal(richTextContent('<<b>script>x', 'text/html'), 'scriptx');
  assert.equal(richTextContent('&lt;script&gt;', 'text/html'), 'script');
});

test('enum objects, enum lists and numeric strings compare by value', () => {
  for (const [sent, actual] of [
    ['open', { id: 'open' }], [{ id: 'open' }, 'open'], [['a', 'b'], [{ id: 'b' }, { id: 'a' }]],
    ['1.0', '1'], ['50', '50.0'], [3, '3.00'], ['2024-05-01', '2024-04-30T22:00:00Z'], ['2024-05-01', '2024-05-02T01:00:00Z'], ['2024-05-01', '2024-05-01'],
  ] as const) assert.equal(compareAttribute('myField', sent, actual), 'verified', JSON.stringify([sent, actual]));
  assert.equal(compareAttribute('myField', ['a', 'b'], [{ id: 'a' }, { id: 'c' }]), 'uncertain');
  assert.equal(compareAttribute('myField', 'a', { id: 'b' }), 'mismatch');
});

test('false and 0 against an omitted attribute are uncertain; a non-empty plain value that is absent is a mismatch', () => {
  assert.equal(compareAttribute('flag', false, undefined), 'uncertain');
  assert.equal(compareAttribute('count', 0, undefined), 'uncertain');
  assert.equal(compareAttribute('flag', false, null), 'uncertain');
  assert.equal(compareAttribute('flag', true, undefined), 'mismatch');
  assert.equal(compareAttribute('count', 5, undefined), 'mismatch');
  assert.equal(compareAttribute('name', 'x', undefined), 'mismatch');
  assert.equal(compareAttribute('tags', ['a'], undefined), 'mismatch');
});

test('only clearly different values of the same simple kind are a mismatch', () => {
  // Same kind, clearly different.
  assert.equal(compareAttribute('f', 'alpha', 'omega'), 'mismatch');
  // Two numbers that differ may be rounding or reformatting, so they only warn.
  assert.equal(compareAttribute('f', 5, 7), 'uncertain');
  assert.equal(compareAttribute('f', '5', '7.5'), 'uncertain');
  assert.equal(compareAttribute('f', 10.005, 10.01), 'uncertain');
  assert.equal(compareAttribute('f', '2d', '2 d'), 'uncertain');
  assert.equal(compareAttribute('f', true, false), 'mismatch');
  assert.equal(compareAttribute('f', '2024-05-01', '2024-05-09'), 'mismatch');
  // Type differs, nested, truncation, case-only: uncertain.
  assert.equal(compareAttribute('f', 5, 'five'), 'uncertain');
  assert.equal(compareAttribute('f', 'yes', true), 'uncertain');
  assert.equal(compareAttribute('f', 'alpha', ['alpha', 'beta']), 'uncertain');
  assert.equal(compareAttribute('f', { a: 1 }, { a: 2 }), 'uncertain');
  assert.equal(compareAttribute('f', 'a long description', 'a long'), 'uncertain');
  assert.equal(compareAttribute('f', 'Alpha', 'alpha'), 'uncertain');
  assert.equal(compareAttribute('f', ['a', 'b'], ['a']), 'uncertain');
});
