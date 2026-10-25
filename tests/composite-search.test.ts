import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { buildWorkItemQuery, clearCompositeToolsForTests, compositeTools, escapeLuceneValue, lintLuceneQuery, parsePolarionUrl, setCompositeSearchClockForTests } from '../src/composite-search.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const fields = new Set(['type', 'status', 'title', 'description', 'created', 'updated', 'assignee.id']);

test('Lucene values escape metacharacters and stay inside quoted clauses', () => {
  for (const value of ['" OR status:*', 'x\\y', '(title:*)']) {
    const query = buildWorkItemQuery({ text: value }, fields);
    assert.match(query, /^\(title:"/);
    if (value.includes('"')) assert.match(query, /\\"/);
    if (value.includes('*')) assert.match(query, /\\\*/);
    assert.equal(query.includes(` OR status:*`), false);
  }
  assert.equal(escapeLuceneValue('a\\b'), 'a\\\\b');
});

test('builds structured work-item query and rejects unknown fields', () => {
  assert.equal(buildWorkItemQuery({ types: ['task'], statuses: ['open'], assignee: 'sam', createdAfter: '2026-01-01' }, fields),
    'type:"task" AND status:"open" AND assignee.id:"sam" AND created:["2026\\-01\\-01" TO *]');
  assert.throws(() => buildWorkItemQuery({ filters: [{ field: 'evil', value: 'x' }] }, fields), /Unknown work item field/);
});

test('groups type and status alternatives with OR while ANDing separate groups', () => {
  assert.equal(buildWorkItemQuery({}, fields), '');
  assert.equal(buildWorkItemQuery({ types: ['requirement'] }, fields), 'type:"requirement"');
  assert.equal(buildWorkItemQuery({ types: ['requirement', 'testcase'], statuses: ['open', 'closed'] }, fields),
    '(type:"requirement" OR type:"testcase") AND (status:"open" OR status:"closed")');
  assert.equal(buildWorkItemQuery({ types: ['requirement', 'testcase'], statuses: ['open'], filters: [{ field: 'title', value: 'A OR B' }] }, fields),
    '(type:"requirement" OR type:"testcase") AND status:"open" AND title:"A OR B"');
  assert.throws(() => buildWorkItemQuery({ filters: [{ field: 'notAField', value: 'x' }] }, fields), /Unknown work item field/);
});

test('query lint reports unknown fields, unbalanced delimiters, and suspicious operators', () => {
  const warnings = lintLuceneQuery('missing:"x OR status:open', fields);
  assert.ok(warnings.some(warning => warning.includes('Unknown field: missing')));
  assert.ok(warnings.some(warning => warning.includes('Unbalanced quotation')));
  assert.ok(lintLuceneQuery('(status:open', fields).some(warning => warning.includes('Unbalanced parentheses')));
  assert.ok(lintLuceneQuery('AND status:open', fields).some(warning => warning.includes('Suspicious boolean')));
});

test('resolves same-host URL forms and rejects foreign or malformed URLs', () => {
  const base = 'https://polarion.example/polarion/rest/v1';
  const cases: Array<[string, string, string, string, string?]> = [
    ['https://polarion.example/polarion/#/project/PRJ/workitem?id=WI-1', 'workitem', 'PRJ', 'WI-1'],
    ['https://polarion.example/polarion/redirect/project/PRJ/workitem?id=WI-2', 'workitem', 'PRJ', 'WI-2'],
    ['https://polarion.example/polarion/#/project/PRJ/document?doc=Spec', 'document', 'PRJ', 'Spec'],
    ['https://polarion.example/polarion/#/project/PRJ/document?doc=space/Spec', 'document', 'PRJ', 'Spec', 'space'],
    ['https://polarion.example/polarion/redirect/project/PRJ/document?id=Spec&space=space', 'document', 'PRJ', 'Spec', 'space'],
    ['https://polarion.example/polarion/#/project/PRJ/wiki/space/Page', 'page', 'PRJ', 'Page', 'space'],
    ['https://polarion.example/polarion/redirect/project/PRJ/testrun?id=TR-1', 'testrun', 'PRJ', 'TR-1'],
    ['https://polarion.example/polarion/redirect/project/PRJ/plan?id=PLAN-1', 'plan', 'PRJ', 'PLAN-1'],
  ];
  for (const [url, type, projectId, id, spaceId] of cases) assert.deepEqual(parsePolarionUrl(url, base), { type, projectId, id, ...(spaceId ? { spaceId } : {}) });
  assert.throws(() => parsePolarionUrl('https://evil.example/polarion/#/project/PRJ/workitem?id=WI-1', base), /host does not match/);
  assert.throws(() => parsePolarionUrl('not a url', base), /Malformed/);
  assert.throws(() => parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ/unknown?id=x', base), /Unsupported/);
  assert.throws(() => parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ%2Fother/workitem?id=WI-1', base), /Malformed/);
  assert.equal(parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ%252Fother/workitem?id=WI-1', base).projectId, 'PRJ%2Fother');
  assert.throws(() => parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ/workitem?id=%2E%2E', base), /Malformed/);
  assert.throws(() => parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ/workitem?id=WI%5Cevil', base), /Malformed/);
  assert.equal(parsePolarionUrl('https://polarion.example/polarion/#/project/PRJ/workitem?id=PRJ%2FWI-1', base).id, 'PRJ/WI-1');
});

test('search tool queries through callPolarionTool and includes generated query', async () => {
  clearCompositeToolsForTests();
  const calls: Array<[string, Record<string, unknown>]> = [];
  const ctx = {
    apiBaseUrl: 'https://polarion.example/polarion/rest/v1', logger: console, signal: new AbortController().signal,
    reportProgress: async () => undefined,
    callPolarionTool: async (name: string, args: Record<string, unknown>) => {
      calls.push([name, args]);
      return name === 'getProjectFieldsMetadata'
        ? { content: [], structuredContent: { data: { attributes: { customField: { label: 'Custom' } } } } }
        : { content: [], structuredContent: { data: [{ id: 'PRJ/WI-1' }] } };
    },
  } satisfies VirtualToolContext;
  const result = await compositeTools[0].handler({ projectId: 'PRJ', filters: [{ field: 'customField', value: 'x' }] }, ctx);
  assert.equal(calls[0]?.[0], 'getProjectFieldsMetadata');
  assert.equal(calls[1]?.[0], 'getWorkItems');
  assert.equal(calls[1]?.[1].query, 'customField:"x"');
  assert.deepEqual(calls[1]?.[1].fields, { workitems: 'type,title,status,created,updated' });
  const textContent = result.content.find((item): item is Extract<typeof item, { type: 'text' }> => item.type === 'text');
  assert.match(textContent?.text ?? '', /customField/);
  clearCompositeToolsForTests();
});

function searchContext(options: {
  apiBaseUrl?: string; userScope?: string; metadata?: () => CallToolResult; result?: CallToolResult;
} = {}) {
  const calls: Array<[string, Record<string, unknown>]> = [];
  let lookups = 0;
  const ctx = {
    apiBaseUrl: options.apiBaseUrl ?? 'https://polarion.example/polarion/rest/v1',
    userScope: options.userScope,
    logger: console, signal: new AbortController().signal, reportProgress: async () => undefined,
    callPolarionTool: async (name: string, args: Record<string, unknown>) => {
      calls.push([name, args]);
      if (name === 'getProjectFieldsMetadata') {
        lookups++;
        return options.metadata ? options.metadata() : { content: [], structuredContent: { data: { attributes: { customField: { label: 'customField' } } } } };
      }
      return options.result ?? { content: [], structuredContent: { data: [{ type: 'workitems', id: 'PRJ/WI-1', attributes: { type: 'requirement', title: 'A', status: 'open', created: 'now', updated: 'now' } }] } };
    },
  } satisfies VirtualToolContext;
  return { ctx, calls, get lookups() { return lookups; } };
}

test('omits query for empty search and requests compact summary fields with real-shaped results', async () => {
  clearCompositeToolsForTests();
  const setup = searchContext();
  const result = await compositeTools[0].handler({ projectId: 'PRJ' }, setup.ctx);
  const searchCall = setup.calls.find(([name]) => name === 'getWorkItems')!;
  assert.equal('query' in searchCall[1], false);
  assert.deepEqual(searchCall[1].fields, { workitems: 'type,title,status,created,updated' });
  const body = JSON.parse((result.content[0] as { text: string }).text);
  assert.deepEqual(body.results[0], { id: 'PRJ/WI-1', type: 'requirement', title: 'A', status: 'open', created: 'now', updated: 'now', resourceType: 'workitems' });
});

test('search response preserves pagination status and continuation metadata', async () => {
  clearCompositeToolsForTests();
  const setup = searchContext({ result: { content: [], structuredContent: {
    data: [{ id: 'PRJ/WI-1', attributes: { title: 'A' } }],
    links: { next: 'http://localhost:9999/polarion/rest/v1/projects/PRJ/workitems?page[number]=2' },
    meta: { totalCount: 101 }, truncated: true,
  } } });
  const result = await compositeTools[0].handler({ projectId: 'PRJ', max_items: 1 }, setup.ctx);
  const body = JSON.parse((result.content[0] as { text: string }).text);
  assert.equal(body.totalCount, 101);
  assert.equal(body.truncated, true);
  assert.equal(body.links.next.includes('localhost'), true);
  clearCompositeToolsForTests();
});

test('preserves caller-provided fields selector', async () => {
  clearCompositeToolsForTests();
  const setup = searchContext();
  await compositeTools[0].handler({ projectId: 'PRJ', fields: { workitems: 'id,title' } }, setup.ctx);
  assert.deepEqual(setup.calls.find(([name]) => name === 'getWorkItems')?.[1].fields, { workitems: 'id,title' });
});

test('field metadata cache isolates instance and caller scopes', async () => {
  clearCompositeToolsForTests();
  const a = searchContext({ userScope: 'caller-a', metadata: () => ({ content: [], structuredContent: { data: { attributes: { fieldA: {} } } } }) });
  const b = searchContext({ userScope: 'caller-b', metadata: () => ({ content: [], structuredContent: { data: { attributes: { fieldB: {} } } } }) });
  const otherInstance = searchContext({ apiBaseUrl: 'https://other.example/rest/v1', userScope: 'caller-a', metadata: () => ({ content: [], structuredContent: { data: { attributes: { fieldC: {} } } } }) });
  await compositeTools[1].handler({ query: 'fieldA:x', projectId: 'PRJ' }, a.ctx);
  await compositeTools[1].handler({ query: 'fieldB:x', projectId: 'PRJ' }, b.ctx);
  await compositeTools[1].handler({ query: 'fieldC:x', projectId: 'PRJ' }, otherInstance.ctx);
  assert.equal(a.lookups + b.lookups + otherInstance.lookups, 3);
});

test('field metadata cache expires and retries failed lookups', async () => {
  clearCompositeToolsForTests();
  let now = 10;
  setCompositeSearchClockForTests(() => now);
  const setup = searchContext();
  await compositeTools[1].handler({ query: 'customField:x', projectId: 'PRJ' }, setup.ctx);
  await compositeTools[1].handler({ query: 'customField:x', projectId: 'PRJ' }, setup.ctx);
  assert.equal(setup.lookups, 1);
  now += 5 * 60_000 + 1;
  await compositeTools[1].handler({ query: 'customField:x', projectId: 'PRJ' }, setup.ctx);
  assert.equal(setup.lookups, 2);

  clearCompositeToolsForTests();
  let attempt = 0;
  const retry = searchContext({ metadata: () => (++attempt === 1
    ? { content: [], isError: true }
    : { content: [], structuredContent: { data: { attributes: { customField: {} } } } }) });
  await compositeTools[1].handler({ query: 'customField:x', projectId: 'PRJ' }, retry.ctx);
  await compositeTools[1].handler({ query: 'customField:x', projectId: 'PRJ' }, retry.ctx);
  assert.equal(retry.lookups, 2);
});

test('field metadata cache evicts oldest entries at its capacity', async () => {
  clearCompositeToolsForTests();
  let calls = 0;
  const setup = searchContext({ metadata: () => { calls++; return { content: [], structuredContent: { data: {} } }; } });
  for (let i = 0; i < 501; i++) await compositeTools[1].handler({ query: 'status:open', projectId: `PRJ-${i}` }, setup.ctx);
  await compositeTools[1].handler({ query: 'status:open', projectId: 'PRJ-0' }, setup.ctx);
  assert.equal(calls, 502);
});

test('lint and URL virtual tools never execute a Lucene search without fetch', async () => {
  const calls: string[] = [];
  const ctx = { apiBaseUrl: 'https://polarion.example/polarion/rest/v1', logger: console, signal: new AbortController().signal, reportProgress: async () => undefined,
    callPolarionTool: async (name: string) => { calls.push(name); return { content: [], structuredContent: { data: { id: 'PRJ/WI-1' } } }; } } as unknown as VirtualToolContext;
  await compositeTools[1].handler({ query: 'status:open' }, ctx);
  await compositeTools[2].handler({ url: 'https://polarion.example/polarion/#/project/PRJ/workitem?id=WI-1' }, ctx);
  assert.deepEqual(calls, []);
  const fetched = await compositeTools[2].handler({ url: 'https://polarion.example/polarion/redirect/project/PRJ/workitem?id=WI-1', fetch: true }, ctx);
  assert.deepEqual(calls, ['getWorkItem']);
  assert.match((fetched.content[0] as { type: 'text'; text: string }).text, /PRJ\/WI-1/);
});
