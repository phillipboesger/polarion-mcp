import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { executeApiTool } from '../src/executor.js';
import type { McpToolDefinition } from '../src/types.js';

const definition: McpToolDefinition = {
  name: 'patchDocument', description: '', method: 'patch',
  pathTemplate: '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}',
  executionParameters: ['projectId', 'spaceId', 'documentName'].map(name => ({ name, in: 'path' })),
  requestBodyContentType: 'application/json', securityRequirements: [],
  inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, spaceId: { type: 'string' }, documentName: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'spaceId', 'documentName', 'requestBody'] },
};

test('write verification and dry-run use read-back without mutating during preview', async () => {
  let current: Record<string, unknown> = { title: 'old', description: { type: 'text/html', value: ' hello ' }, estimate: 2, tags: ['b', 'a'] };
  let apply = false;
  let failRead = false;
  let writes = 0;
  let reads = 0;
  const server = createServer((req, res) => { void (async () => {
    if (req.method === 'PATCH') {
      writes++;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (apply) current = JSON.parse(Buffer.concat(chunks).toString()).data.attributes;
      res.writeHead(204).end();
    } else if ((reads++, failRead)) res.writeHead(403).end();
    else res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: current } }));
  })(); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const args = { projectId: 'p', spaceId: 's', documentName: 'd', requestBody: { data: { attributes: { title: 'new', description: { type: 'text/html', value: 'hello' }, estimate: '2', tags: ['a', 'b'] } } } };
  const call = (extra = {}, enabled = true) => executeApiTool('patchDocument', definition, { ...args, ...extra }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base, enabled);
  try {
    const mismatch = await call();
    assert.equal(mismatch.isError, true);
    assert.match(JSON.stringify(mismatch), /mismatch.*title/);
    const text = mismatch.content[0];
    assert.equal(text.type, 'text');
    if (text.type === 'text') assert.deepEqual(JSON.parse(text.text.split('\n')[1]).verification.mismatches.map((item: { field: string }) => item.field), ['title']);
    apply = true;
    assert.match(JSON.stringify(await call()), /verified/);
    apply = false;
    const beforeDisabled = reads;
    assert.match(JSON.stringify(await call({ verify: false })), /Verification disabled/);
    assert.match(JSON.stringify(await call({}, false)), /Verification disabled/);
    assert.equal(reads, beforeDisabled);
    failRead = true;
    const skipped = await call();
    assert.notEqual(skipped.isError, true);
    assert.match(JSON.stringify(skipped), /Read-back failed/);
    failRead = false;
    const before = writes;
    const preview = await call({ dry_run: true });
    assert.equal(writes, before);
    assert.match(JSON.stringify(preview), /diff/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('bulk work item writes verify each returned identity and report only mismatches', async () => {
  let mode: 'patch' | 'create' | 'missing' = 'patch';
  let mismatch = true;
  const server = createServer((req, res) => {
    if (req.method === 'PATCH') return res.writeHead(204).end();
    if (req.method === 'POST') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(mode === 'missing' ? {} : { data: [{ id: 'P/WI-1' }, { id: 'P/WI-2' }] }));
    const title = req.url?.includes('WI-2') && mismatch ? 'wrong' : 'new';
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'bulk', pathTemplate: '/projects/{projectId}/workitems', executionParameters: [{ name: 'projectId', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, requestBody: { type: 'object' } }, required: ['projectId', 'requestBody'] } };
  const args = { projectId: 'P', requestBody: { data: [{ id: 'P/WI-1', attributes: { title: 'new' } }, { id: 'P/WI-2', attributes: { title: 'new' } }] } };
  const call = () => executeApiTool('bulk', { ...def, method: mode === 'patch' ? 'patch' : 'post' }, args, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base, true);
  try {
    let result = await call(); assert.equal(result.isError, true); assert.match(JSON.stringify(result), /WI-2.title/); assert.doesNotMatch(JSON.stringify(result), /WI-1.title/);
    mode = 'create'; mismatch = false; result = await call(); assert.match(JSON.stringify(result), /verified/);
    mismatch = true; result = await call(); assert.equal(result.isError, true); assert.match(JSON.stringify(result), /WI-2.title/);
    mode = 'missing'; result = await call(); assert.notEqual(result.isError, true); assert.match(JSON.stringify(result), /does not contain an ID/);
  } finally { server.close(); await once(server, 'close'); }
});

test('dry run warns for unknown and read-only custom fields without writing', async () => {
  let writes = 0;
  const server = createServer((req, res) => {
    if (req.method !== 'GET') writes++;
    const data = req.url?.includes('getFieldsMetadata') ? { locked: { readOnly: true }, title: {} } : { title: 'old' };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: data } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await executeApiTool('patchDocument', definition, { projectId: 'p', spaceId: 's', documentName: 'd', dry_run: true, requestBody: { data: { attributes: { locked: 'a', absent: 'b' } } } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base, true);
    assert.match(JSON.stringify(result), /read-only/); assert.match(JSON.stringify(result), /not defined for this type/); assert.equal(writes, 0);
  } finally { server.close(); await once(server, 'close'); }
});

test('credentials are redacted from previews and upstream error details', async () => {
  const token = 'fake-secret-credential-12345';
  const previous = process.env.BEARER_TOKEN; process.env.BEARER_TOKEN = token;
  const server = createServer((_req, res) => res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ errors: [{ detail: token }] })));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def = { ...definition, method: 'post', pathTemplate: '/things', executionParameters: [], securityRequirements: [{ bearerAuth: [] }], inputSchema: { type: 'object', properties: { requestBody: { type: 'object' } } } };
  const schemes = { bearerAuth: { type: 'http', scheme: 'bearer' } };
  try {
    for (const dry_run of [true, false]) {
      const result = await executeApiTool('create', def, { requestBody: { title: token }, dry_run }, schemes, { minIntervalMs: 0, maxRetries: 0 }, undefined, base, true);
      assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
    }
  } finally { if (previous === undefined) delete process.env.BEARER_TOKEN; else process.env.BEARER_TOKEN = previous; server.close(); await once(server, 'close'); }
});

test('workflow verification reads status and compares known target', async () => {
  const { verifyTargets } = await import('../src/write-verification.js');
  const target = { label: '', attributes: {}, workflowAction: 'start', expectedStatus: 'active' };
  assert.equal((await verifyTargets([target], async () => ({ status: 'active' }), 10)).status, 'verified');
  assert.equal((await verifyTargets([target], async () => ({ status: 'open' }), 10)).status, 'mismatch');
  assert.equal((await verifyTargets([{ ...target, expectedStatus: undefined }], async () => ({ status: 'open' }), 10)).status, 'uncertain');
});

test('bulk verification maps each returned ID to the corresponding submitted attributes', async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.method === 'POST') return res.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ id: 'P/A' }, { id: 'P/B' }] }));
    const title = req.url?.includes('/A?') ? 'first' : 'second';
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'bulk', method: 'post', pathTemplate: '/projects/{projectId}/workitems', executionParameters: [{ name: 'projectId', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, requestBody: { type: 'object' } } } };
  try {
    const result = await executeApiTool('bulk', def, { projectId: 'P', requestBody: { data: [{ attributes: { title: 'first' } }, { attributes: { title: 'second' } }] } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base);
    const text = (result.content[0] as { text: string }).text;
    assert.deepEqual(JSON.parse(text.split('\n')[1]).verification, { status: 'verified', mismatches: [], uncertain: [] });
    assert.equal(requests.length, 3);
    assert.match(requests[1], /^GET \/projects\/P\/workitems\/A\?/);
    assert.match(requests[2], /^GET \/projects\/P\/workitems\/B\?/);
  } finally { server.close(); await once(server, 'close'); }
});

test('read-back with missing attributes reports the precise failure', async () => {
  const server = createServer((req, res) => req.method === 'PATCH' ? res.writeHead(204).end() : res.writeHead(200, { 'content-type': 'application/json' }).end('{"data":{}}'));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await executeApiTool('patchDocument', definition, { projectId: 'p', spaceId: 's', documentName: 'd', requestBody: { data: { attributes: { title: 'x' } } } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base);
    const text = (result.content[0] as { text: string }).text;
    assert.deepEqual(JSON.parse(text.split('\n')[1]).verification, { status: 'skipped', mismatches: [], uncertain: [], skipped: [{ reason: 'Read-back failed: Read-back response has no attributes' }], reason: 'Read-back failed: Read-back response has no attributes' });
  } finally { server.close(); await once(server, 'close'); }
});

test('bulk create refuses to guess identities when response IDs are absent or incomplete', async () => {
  let response: unknown = {};
  let reads = 0;
  const server = createServer((req, res) => {
    if (req.method === 'GET') reads++;
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(response));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'bulk', method: 'post', pathTemplate: '/projects/{projectId}/workitems', executionParameters: [{ name: 'projectId', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, requestBody: { type: 'object' } } } };
  try {
    for (response of [{}, { data: [{ id: 'P/A' }] }, { data: [{ id: 'P/A' }, { id: '' }] }, { data: [{ id: 'P/A' }, {}] }]) {
      const result = await executeApiTool('bulk', def, { projectId: 'P', requestBody: { data: [{ attributes: { title: 'one' } }, { attributes: { title: 'two' } }] } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base);
      const verification = JSON.parse((result.content[0] as { text: string }).text.split('\n')[1]).verification;
      assert.deepEqual(verification, { status: 'skipped', mismatches: [], uncertain: [], reason: 'Create response does not contain an ID for each created work item.' });
      assert.equal(reads, 0);
    }
  } finally { server.close(); await once(server, 'close'); }
});

test('workflow lookup supplies the expected status and removes write-only query parameters', async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.method === 'PATCH') return res.writeHead(204).end();
    const data = req.url?.includes('getWorkflowActions') ? [{ nativeActionId: 'start', targetStatus: 'active' }] : { attributes: { status: 'active' } };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'workflow', pathTemplate: '/projects/{projectId}/workitems/{workItemId}', executionParameters: [{ name: 'projectId', in: 'path' }, { name: 'workItemId', in: 'path' }, { name: 'workflowAction', in: 'query' }, { name: 'changeTypeTo', in: 'query' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, workItemId: { type: 'string' }, workflowAction: { type: 'string' }, changeTypeTo: { type: 'string' }, requestBody: { type: 'object' } } } };
  try {
    const result = await executeApiTool('workflow', def, { projectId: 'P', workItemId: 'W', workflowAction: 'start', changeTypeTo: 'defect', requestBody: { data: { attributes: {} } } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base);
    const verification = JSON.parse((result.content[0] as { text: string }).text.split('\n')[1]).verification;
    assert.deepEqual(verification, { status: 'verified', mismatches: [], uncertain: [] });
    assert.equal(requests.length, 3);
    assert.match(requests[0], /^GET .*\/actions\/getWorkflowActions\?/);
    assert.match(requests[0], /page(%5B|\[)size(%5D|\])=1000/);
    assert.doesNotMatch(requests[0], /workflowAction|changeTypeTo/);
    assert.match(requests[1], /^PATCH .*workflowAction=start/);
    assert.match(requests[2], /^GET .*workitems\/W\?/);
  } finally { server.close(); await once(server, 'close'); }
});

test('workflow lookup is omitted when verification is disabled or the route differs', async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    res.writeHead(204).end();
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'workflow', pathTemplate: '/projects/{projectId}/workitems/{workItemId}', executionParameters: [{ name: 'projectId', in: 'path' }, { name: 'workItemId', in: 'path' }, { name: 'workflowAction', in: 'query' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, workItemId: { type: 'string' }, workflowAction: { type: 'string' }, requestBody: { type: 'object' } } } };
  const args = { projectId: 'P', workItemId: 'W', workflowAction: 'start', requestBody: { data: { attributes: {} } } };
  try {
    for (const [definitionToUse, extra, enabled] of [[def, { verify: false }, true], [def, {}, false], [{ ...def, method: 'post' }, {}, true], [{ ...def, pathTemplate: '/other/{projectId}/{workItemId}' }, {}, true]] as const) {
      requests.length = 0;
      const result = await executeApiTool('workflow', definitionToUse, { ...args, ...extra }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base, enabled);
      assert.notEqual(result.isError, true);
      assert.equal(requests.length, 1);
      assert.doesNotMatch(requests[0], /getWorkflowActions/);
    }
  } finally { server.close(); await once(server, 'close'); }
});

test('bulk PATCH resolves unqualified IDs against the project and reports missing IDs', async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.method === 'PATCH') return res.writeHead(204).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { attributes: { title: 'one' } } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const def: McpToolDefinition = { ...definition, name: 'bulk', method: 'patch', pathTemplate: '/projects/{projectId}/workitems', executionParameters: [{ name: 'projectId', in: 'path' }], inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, requestBody: { type: 'object' } } } };
  try {
    const result = await executeApiTool('bulk', def, { projectId: 'P', requestBody: { data: [{ id: 'W-1', attributes: { title: 'one' } }, { attributes: { title: 'two' } }] } }, {}, { minIntervalMs: 0, postMutationDelayMs: 0, maxRetries: 0 }, undefined, base);
    const verification = JSON.parse((result.content[0] as { text: string }).text.split('\n')[1]).verification;
    assert.equal(verification.status, 'verified');
    assert.deepEqual(verification.skipped, [{ reason: 'Updated resource identity unavailable' }]);
    assert.equal(requests.length, 2);
    assert.match(requests[1], /^GET \/projects\/P\/workitems\/W-1\?/);
  } finally { server.close(); await once(server, 'close'); }
});


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
