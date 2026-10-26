import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const text = (result: CallToolResult) => result.content.find((item): item is { type: 'text'; text: string } => item.type === 'text')?.text ?? '';
const response = (data: unknown, extra: Record<string, unknown> = {}): CallToolResult => ({ content: [], structuredContent: { data, ...extra } });
function context(call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>, signal = new AbortController().signal, progress: unknown[] = []): VirtualToolContext {
  return { callPolarionTool: call, signal, apiBaseUrl: 'https://polarion.test/polarion/rest/v1', logger: console, reportProgress: async item => { progress.push(item); } };
}
import { traceLinks } from '../src/composite-trace.js';
import { paginate, type JsonApiPage } from '../src/pagination.js';
function link(source: string, target: string, role = 'relates_to') {
  return { attributes: { role }, relationships: { sourceWorkItem: { data: { id: source } }, workItem: { data: { id: target } } } };
}
function graphContext(edges: Array<[string, string, string?]>, capCalls: string[] = [], calls: Array<{ name: string; args: Record<string, unknown> }> = []) {
  return context(async (name, args) => {
    calls.push({ name, args });
    const id = `${String(args.projectId)}/${String(args.workItemId)}`;
    if (name === 'getLinkedWorkItems') return response(edges.filter(([from]) => from === id).map(([from, to, role]) => link(from, to, role)));
    if (name === 'getBacklinkedWorkItems') return response(edges.filter(([, to]) => to === id).map(([from, to, role]) => link(from, to, role)));
    if (name === 'getWorkItem') { capCalls.push(id); return response({ id, attributes: { title: id, type: 'requirement', status: 'open' } }); }
    throw new Error(name);
  });
}

test('trace_links handles diamonds, cycles, depth, roles, and node cap', async () => {
  const edges: Array<[string, string, string?]> = [
    ['P/A', 'P/B', 'parent'], ['P/A', 'P/C', 'parent'], ['P/B', 'P/D', 'parent'], ['P/C', 'P/D', 'parent'], ['P/D', 'P/A', 'cycle'],
  ];
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const tree = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', depth: 3 }, graphContext(edges, [], calls));
  const parsed = JSON.parse(text(tree));
  assert.deepEqual(parsed.nodes.map((n: { id: string }) => n.id).sort(), ['P/A', 'P/B', 'P/C', 'P/D']);
  assert.equal(parsed.edges.length, 5);
  assert.equal(parsed.truncated, false);
  const expanded = calls.filter(call => call.name === 'getLinkedWorkItems').map(call => `${String(call.args.projectId)}/${String(call.args.workItemId)}`);
  assert.deepEqual(expanded.sort(), ['P/A', 'P/B', 'P/C', 'P/D']);

  const roles = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', roles: ['cycle'] }, graphContext(edges));
  assert.deepEqual(JSON.parse(text(roles)).nodes.map((n: { id: string }) => n.id), ['P/A']);
  const capped = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', node_cap: 2 }, graphContext(edges));
  assert.equal(JSON.parse(text(capped)).truncated, true);

  const flatStar = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', depth: 2, node_cap: 2 }, graphContext([
    ['P/A', 'P/B'], ['P/A', 'P/C'],
  ]));
  const star = JSON.parse(text(flatStar));
  assert.ok(star.nodes.some((node: { id: string }) => node.id === 'P/A'));
  assert.ok(star.nodes.length <= 2);
  assert.equal(star.truncated, true);
});

test('trace_links requests consumed relationship and Work Item fields', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const result = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', depth: 1 }, graphContext([['P/A', 'P/B', 'parent']], [], calls));
  const parsed = JSON.parse(text(result));
  assert.equal(parsed.edges.length, 1);
  assert.deepEqual(calls.find(call => call.name === 'getLinkedWorkItems')!.args.fields, { linkedworkitems: 'role,sourceWorkItem,workItem' });
  assert.deepEqual(calls.find(call => call.name === 'getWorkItem')!.args.fields, { workitems: 'title,type,status' });
});

test('trace_links propagates upstream Work Item detail errors', async () => {
  const result = await traceLinks.handler({ projectId: 'P', workItemId: 'A', direction: 'down', depth: 1 }, context(async name => {
    if (name === 'getLinkedWorkItems') return response([link('P/A', 'P/B')]);
    if (name === 'getWorkItem') return { isError: true, content: [{ type: 'text', text: 'upstream failed' }] };
    throw new Error(name);
  }));
  assert.equal(result.isError, true);
  assert.match(text(result), /upstream failed/);
});

test('trace_links includes root at depth zero and collects every link page within node cap', async () => {
  const depthZero = await traceLinks.handler({ projectId: 'P', workItemId: 'ROOT', direction: 'down', depth: 0 }, context(async name => {
    assert.equal(name, 'getWorkItem');
    return response({ id: 'P/ROOT', attributes: { title: 'Root' } });
  }));
  assert.deepEqual(JSON.parse(text(depthZero)).nodes.map((node: { id: string }) => node.id), ['P/ROOT']);

  const all = Array.from({ length: 101 }, (_, i) => link('P/ROOT', `P/CH-${i + 1}`));
  const pageNumbers: number[] = [];
  const result = await traceLinks.handler({ projectId: 'P', workItemId: 'ROOT', direction: 'down', depth: 1, node_cap: 150 }, context(async (name, args) => {
    if (name === 'getLinkedWorkItems') {
      const firstPage: JsonApiPage = { data: all.slice(0, 100), links: { next: 'http://localhost:9999/polarion/rest/v1/projects/P/workitems?page[number]=2' }, meta: { totalCount: 101 } };
      pageNumbers.push(1);
      const collected = await paginate(firstPage, Number(args.max_items), async () => {
        pageNumbers.push(2);
        return { data: all.slice(100), links: { next: null }, meta: { totalCount: 101 } };
      }, 20, new AbortController().signal);
      return response(collected.response.data, { links: collected.response.links, meta: collected.response.meta, ...(collected.truncated ? { truncated: true } : {}) });
    }
    if (name === 'getBacklinkedWorkItems') return response([]);
    if (name === 'getWorkItem') return response({ id: `${String(args.projectId)}/${String(args.workItemId)}`, attributes: { title: 'Item' } });
    throw new Error(name);
  }));
  const graph = JSON.parse(text(result));
  assert.deepEqual(pageNumbers, [1, 2]);
  assert.equal(graph.nodes.length, 102);
  assert.equal(graph.edges.length, 101);
  assert.equal(graph.truncated, false);
});
