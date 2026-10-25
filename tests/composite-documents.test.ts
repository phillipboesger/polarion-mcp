import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const text = (result: CallToolResult) => result.content.find((item): item is { type: 'text'; text: string } => item.type === 'text')?.text ?? '';
const response = (data: unknown, extra: Record<string, unknown> = {}): CallToolResult => ({ content: [], structuredContent: { data, ...extra } });
function context(call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>, signal = new AbortController().signal, progress: unknown[] = []): VirtualToolContext {
  return { callPolarionTool: call, signal, apiBaseUrl: 'https://polarion.test/polarion/rest/v1', logger: console, reportProgress: async item => { progress.push(item); } };
}
import { getOutline, readDocument, readSection } from '../src/composite-documents.js';
function documentContext(parts: unknown[], items: Record<string, unknown> = {}, included: unknown[] = [], calls: Array<{ name: string; args: Record<string, unknown> }> = []) {
  return context(async (name, args) => {
    calls.push({ name, args });
    if (name === 'getDocumentParts') return response(parts, { included });
    if (name === 'getWorkItem') return response(items[String(args.workItemId)] ?? { id: `${String(args.projectId)}/${String(args.workItemId)}`, attributes: { title: 'Work item', description: { type: 'text/html', value: '<p>Details</p>' }, type: 'requirement', status: 'open' } });
    throw new Error(name);
  });
}
const heading = (id: string, headingText: string, level: number) => ({ id, attributes: { type: 'heading', headingText, level } });

test('LiveDoc Markdown renders nested headings, work item parts, empty docs, and truncation', async () => {
  const parts = [heading('h1', 'Overview', 0), { id: 'normal', attributes: { type: 'normal', content: '<p>Intro</p>' } }, heading('h2', 'Details', 1), { id: 'wi-part', attributes: { type: 'workitem', level: 2 }, relationships: { workItem: { data: { id: 'P/WI-1' } } } }, heading('h3', 'Next', 0)];
  const args = { projectId: 'P', spaceId: '_default', document: 'SRS' };
  const read = await readDocument.handler(args, documentContext(parts));
  assert.match(text(read), /# Overview/);
  assert.match(text(read), /## Details/);
  assert.match(text(read), /Work item/);
  assert.match(text(read), /Details/);
  const outlineResult = await getOutline.handler(args, documentContext(parts));
  assert.match(text(outlineResult), /\["Overview","Details"\]/);
  const section = await readSection.handler({ ...args, heading_path: ['Overview', 'Details'], max_chars: 10 }, documentContext(parts));
  assert.match(text(section), /"truncated":true/);
  const empty = await readDocument.handler(args, documentContext([]));
  assert.match(text(empty), /"markdown":""/);
});

test('LiveDoc requests sparse fields and renders HTML normal parts while preserving table HTML', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const selectedShape = [
    { id: 'normal', attributes: { type: 'normal', content: '<p>Intro <strong>text</strong></p>' } },
    { id: 'table', attributes: { type: 'table', content: '<table><tr><td>Cell</td></tr></table>' } },
    { id: 'empty-normal', attributes: { type: 'normal' } },
  ];
  const result = await readDocument.handler({ projectId: 'P', spaceId: 'S', document: 'D' }, documentContext(selectedShape, {}, [], calls));
  const rendered = JSON.parse(text(result));
  assert.match(rendered.markdown, /Intro \*\*text\*\*/);
  assert.match(rendered.markdown, /<table>/);
  assert.equal(rendered.markdown.includes('empty-normal'), false);
  const query = calls.find(call => call.name === 'getDocumentParts')!.args;
  assert.deepEqual(query.fields, { document_parts: 'type,content,headingText,level,workItem', workitems: 'title,type,description' });
});

test('document read propagates upstream collection and fallback errors', async () => {
  const collectionFailure = { isError: true, content: [{ type: 'text' as const, text: 'parts unavailable' }] };
  const direct = await readDocument.handler({ projectId: 'P', spaceId: 'S', document: 'D' }, context(async () => collectionFailure));
  assert.equal(direct.isError, true);
  assert.match(text(direct), /parts unavailable/);

  const part = { id: 'wi-part', attributes: { type: 'workitem' }, relationships: { workItem: { data: { id: 'P/WI-1' } } } };
  const fallback = await readDocument.handler({ projectId: 'P', spaceId: 'S', document: 'D' }, context(async name => name === 'getDocumentParts'
    ? response([part])
    : { isError: true, content: [{ type: 'text', text: 'work item unavailable' }] }));
  assert.equal(fallback.isError, true);
  assert.match(text(fallback), /work item unavailable/);
});

test('missing included Work Item falls back with explicit fields and relationship revision', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const part = { id: 'wi-part', attributes: { type: 'workitem' }, relationships: { workItem: { data: { id: 'P/WI-1', revision: 'rev-part' } } } };
  const result = await readDocument.handler({ projectId: 'P', spaceId: 'S', document: 'D', revision: 'rev-doc' }, documentContext([part], {}, [], calls));
  assert.match(text(result), /Details/);
  const fallback = calls.find(call => call.name === 'getWorkItem')!.args;
  assert.equal(fallback.revision, 'rev-part');
  assert.deepEqual(fallback.fields, { workitems: 'title,type,description' });
});

test('fallback Work Item uses requested document revision when relationship has none', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const part = { id: 'wi-part', attributes: { type: 'workitem' }, relationships: { workItem: { data: { id: 'P/WI-1' } } } };
  await readDocument.handler({ projectId: 'P', spaceId: 'S', document: 'D', revision: 'rev-doc' }, documentContext([part], {}, [], calls));
  assert.equal(calls.find(call => call.name === 'getWorkItem')!.args.revision, 'rev-doc');
});
