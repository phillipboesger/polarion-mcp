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
