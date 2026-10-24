import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const text = (result: CallToolResult) => result.content.find((item): item is { type: 'text'; text: string } => item.type === 'text')?.text ?? '';
const response = (data: unknown, extra: Record<string, unknown> = {}): CallToolResult => ({ content: [], structuredContent: { data, ...extra } });
function context(call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>, signal = new AbortController().signal, progress: unknown[] = []): VirtualToolContext {
  return { callPolarionTool: call, signal, logger: console, reportProgress: async item => { progress.push(item); } };
}
import { getOutline, readDocument, readSection } from '../src/composite-documents.js';
function documentContext(parts: unknown[], items: Record<string, unknown> = {}) {
  return context(async (name, args) => {
    if (name === 'getDocumentParts') return response(parts);
    if (name === 'getWorkItem') return response([items[String(args.workItemId)] ?? { id: `${String(args.projectId)}/${String(args.workItemId)}`, attributes: { title: 'Work item', description: { type: 'text/html', value: '<p>Details</p>' }, type: 'requirement', status: 'open' } }]);
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
