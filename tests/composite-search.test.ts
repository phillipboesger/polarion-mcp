import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkItemQuery, clearCompositeToolsForTests, compositeTools, escapeLuceneValue, lintLuceneQuery, parsePolarionUrl } from '../src/composite-search.js';
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
  const textContent = result.content.find((item): item is Extract<typeof item, { type: 'text' }> => item.type === 'text');
  assert.match(textContent?.text ?? '', /customField/);
  clearCompositeToolsForTests();
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
