import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const text = (result: CallToolResult) => result.content.find((item): item is { type: 'text'; text: string } => item.type === 'text')?.text ?? '';
const response = (data: unknown, extra: Record<string, unknown> = {}): CallToolResult => ({ content: [], structuredContent: { data, ...extra } });
function context(call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>, signal = new AbortController().signal, progress: unknown[] = []): VirtualToolContext {
  return { callPolarionTool: call, signal, logger: console, reportProgress: async item => { progress.push(item); } };
}
const job = (state: string, status?: string) => response([{ id: 'job-1', attributes: { state, status: status ? { type: status, message: 'done' } : undefined } }]);
import { traceLinks } from '../src/composite-trace.js';
function link(source: string, target: string, role = 'relates_to') {
  return { attributes: { role }, relationships: { sourceWorkItem: { data: { id: source } }, workItem: { data: { id: target } } } };
}
function graphContext(edges: Array<[string, string, string?]>, capCalls: string[] = []) {
  return context(async (name, args) => {
    const id = `${String(args.projectId)}/${String(args.workItemId)}`;
    if (name === 'getLinkedWorkItems') return response(edges.filter(([from]) => from === id).map(([from, to, role]) => link(from, to, role)));
    if (name === 'getBacklinkedWorkItems') return response(edges.filter(([, to]) => to === id).map(([from, to, role]) => link(from, to, role)));
    if (name === 'getWorkItem') { capCalls.push(id); return response([{ id, attributes: { title: id, type: 'requirement', status: 'open' } }]); }
    throw new Error(name);
  });
}

test('trace_links handles diamonds, cycles, depth, roles, and node cap', async () => {
  const edges: Array<[string, string, string?]> = [
    ['P/A', 'P/B', 'parent'], ['P/A', 'P/C', 'parent'], ['P/B', 'P/D', 'parent'], ['P/C', 'P/D', 'parent'], ['P/D', 'P/A', 'cycle'],
  ];
  const tree = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', depth: 3 }, graphContext(edges));
  const parsed = JSON.parse(text(tree));
  assert.deepEqual(parsed.nodes.map((n: { id: string }) => n.id).sort(), ['P/A', 'P/B', 'P/C', 'P/D']);
  assert.equal(parsed.edges.length, 5);
  assert.equal(parsed.truncated, false);

  const roles = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', roles: ['cycle'] }, graphContext(edges));
  assert.deepEqual(JSON.parse(text(roles)).nodes.map((n: { id: string }) => n.id), ['P/A']);
  const capped = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', node_cap: 2 }, graphContext(edges));
  assert.equal(JSON.parse(text(capped)).truncated, true);
});
