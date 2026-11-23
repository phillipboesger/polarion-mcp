import test from 'node:test';
import assert from 'node:assert/strict';
import { executeApiTool } from '../src/executor.js';
import type { McpToolDefinition } from '../src/types.js';
import { toolDefinitionMap, securitySchemes } from '../src/tools.js';
import { AxiosError } from 'axios';

test('dry-run redacts credentials in URL and body while retaining content headers', async () => {
  const old = process.env.BEARER_TOKEN;
  process.env.BEARER_TOKEN = 'test-preview-credential';
  const definition: McpToolDefinition = {
    name: 'create', description: '', method: 'post', pathTemplate: '/things', executionParameters: [],
    requestBodyContentType: 'application/json', securityRequirements: [{ bearerAuth: [] }],
    inputSchema: { type: 'object', properties: { requestBody: { type: 'object' } } },
    outputSchema: { type: 'object' },
  };
  let requests = 0;
  try {
    const result = await executeApiTool('create', definition, { dry_run: true, requestBody: { data: { attributes: { title: 'test-preview-credential' } } } }, { bearerAuth: { type: 'http', scheme: 'bearer' } }, { httpClient: async () => { requests++; throw new Error('unexpected request'); }, minIntervalMs: 0 });
    const text = (result.content[0] as { text: string }).text;
    const prefix = 'Dry run: no mutating request was sent to Polarion. Preview:\n';
    assert.ok(text.startsWith(prefix));
    const preview = JSON.parse(text.slice(prefix.length));
    assert.equal(preview.method, 'POST');
    assert.equal(preview.headers.authorization, '[REDACTED]');
    assert.equal(preview.headers.Accept, 'application/json');
    assert.equal(preview.headers['content-type'], 'application/json');
    assert.equal(preview.body.data.attributes.title, '[REDACTED]');
    assert.deepEqual(preview.warnings, []);
    assert.deepEqual(result.structuredContent, { dry_run: true, preview });
    assert.equal(requests, 0);
  } finally { if (old === undefined) delete process.env.BEARER_TOKEN; else process.env.BEARER_TOKEN = old; }
});

test('multipart error reports part names and sizes without file contents', async () => {
  const old = process.env.BEARER_TOKEN;
  process.env.BEARER_TOKEN = 'test-token';
  const body = { resource: { data: [{ type: 'workitem_attachments', attributes: { fileName: 'a.txt' } }] }, files: [Buffer.from('hello').toString('base64')] };
  try {
    const result = await executeApiTool('postWorkItemAttachments', toolDefinitionMap.get('postWorkItemAttachments')!, { projectId: 'P', workItemId: 'W', requestBody: body }, securitySchemes, { minIntervalMs: 0, maxRetries: 0, httpClient: async config => { throw new AxiosError('failed', '400', config as never, undefined, { status: 400, statusText: 'Bad Request', headers: {}, data: '', config: config as never }); } });
    assert.equal(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assert.equal(text, 'API Error: Status 400 (Bad Request). No response body received. Method: POST; path template: /projects/{projectId}/workitems/{workItemId}/attachments; content-type: multipart/form-data; multipart parts: resource: present, files: [{"fileName":"a.txt","size":5,"mimeType":"text/plain"}]');
    assert.doesNotMatch(text, /hello|aGVsbG8=/);
  } finally { if (old === undefined) delete process.env.BEARER_TOKEN; else process.env.BEARER_TOKEN = old; }
});
