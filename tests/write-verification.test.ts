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
  const server = createServer((req, res) => { void (async () => {
    if (req.method === 'PATCH') {
      writes++;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (apply) current = JSON.parse(Buffer.concat(chunks).toString()).data.attributes;
      res.writeHead(204).end();
    } else if (failRead) res.writeHead(403).end();
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
    assert.match(JSON.stringify(await call({ verify: false })), /Verification disabled/);
    assert.match(JSON.stringify(await call({}, false)), /Verification disabled/);
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
