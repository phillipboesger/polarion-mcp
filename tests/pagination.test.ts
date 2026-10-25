import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { paginate, pageNumberFromLink, type JsonApiPage } from '../src/pagination.js';
import { executeTool } from '../src/tool-execution.js';

test('pagination merges pages, retains totalCount, and truncates at item and page limits', async () => {
  const fetched: number[] = [];
  const page = (n: number) => ({ data: [{ id: n }], links: { next: n < 5 ? `?page%5Bnumber%5D=${n + 1}` : null }, meta: { totalCount: 5 } });
  const result = await paginate(page(1), 5, async next => {
    const n = Number(new URL(next, 'https://host.test').searchParams.get('page[number]'));
    fetched.push(n);
    return page(n);
  });
  assert.deepEqual(result.response.data, [1, 2, 3, 4, 5].map(id => ({ id })));
  assert.equal(result.response.meta?.totalCount, 5);
  assert.equal(result.truncated, false);
  assert.equal('next' in (result.response.links ?? {}), false);
  assert.deepEqual(fetched, [2, 3, 4, 5]);

  const capped = await paginate(page(1), 3, async next => page(Number(new URL(next, 'https://host.test').searchParams.get('page[number]'))));
  assert.deepEqual(capped.response.data, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(capped.truncated, true);
  assert.equal((capped.response as JsonApiPage).truncated, true);

  const pageLimited = await paginate(page(1), 50, async next => page(Number(new URL(next, 'https://host.test').searchParams.get('page[number]'))), 2);
  assert.equal(pageLimited.pagesFetched, 2);
  assert.equal(pageLimited.truncated, true);

  let calls = 0;
  const hardPageCap = await paginate<JsonApiPage>({ data: [], links: { next: '?page[number]=2' } }, 1001, async () => {
    calls++;
    return { data: [], links: { next: `?page[number]=${calls + 2}` } };
  }, 100);
  assert.equal(hardPageCap.pagesFetched, 20);
  assert.equal(hardPageCap.truncated, true);

  const stopped = new AbortController();
  let abortedFetches = 0;
  stopped.abort();
  const aborted = await paginate<JsonApiPage>({ data: [{ id: 1 }], links: { next: '?page[number]=2' } }, 10, async () => { abortedFetches++; return { data: [] }; }, 20, stopped.signal);
  assert.equal(abortedFetches, 0);
  assert.equal(aborted.truncated, true);
});

test('pagination handles optional included data and safely extracts only the next page number', async () => {
  const result = await paginate<JsonApiPage>({ data: [{ id: 1 }], links: { next: '/list?page[number]=2' }, meta: { totalCount: 2 } }, 2,
    async () => ({ data: [{ id: 2 }], included: [{ id: 'related' }], links: { next: null } }));
  assert.deepEqual(result.response.included, [{ id: 'related' }]);
  assert.equal(pageNumberFromLink('https://foreign.example/x?page%5Bnumber%5D=9', 'https://polarion.example/api', 2), 9);
  assert.equal(pageNumberFromLink('not a URL', 'bad base', 2), 2);
  assert.equal(pageNumberFromLink('not a URL', 'bad base'), undefined);
});

test('generated list tool max_items paginates through a five-page stub and omission fetches one page', async () => {
  process.env.BEARER_TOKEN = 'pagination-test-token';
  let baseUrl = '';
  let requests = 0;
  const observedPages: number[] = [];
  let nextBehavior: 'normal' | 'unparseable' | 'repeat-later' = 'normal';
  let largeCollection = false;
  const upstream = createHttpServer((req, res) => {
    requests++;
    const url = new URL(req.url ?? '/', baseUrl);
    const number = Number(url.searchParams.get('page[number]') ?? 1);
    observedPages.push(number);
    const pageSize = Number(url.searchParams.get('page[size]') ?? 1);
    if (pageSize > 100) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ detail: `Expected a number between 1 and 100, got ${pageSize}` }] }));
      return;
    }
    if (largeCollection) {
      const firstItem = (number - 1) * pageSize;
      const endItem = Math.min(250, firstItem + pageSize);
      const next = endItem < 250 ? `http://localhost:12345/polarion/rest/v1/projects/PRJ/workitems?page%5Bsize%5D=${pageSize}&page%5Bnumber%5D=${number + 1}` : undefined;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: Array.from({ length: endItem - firstItem }, (_, i) => ({ type: 'workitems', id: `PRJ/WI-${firstItem + i + 1}` })), links: { next }, meta: { totalCount: 250 } }));
      return;
    }
    const nextPage = nextBehavior === 'unparseable' ? 'oops' : nextBehavior === 'repeat-later' && number > 1 ? 2 : number + 1;
    const next = number < 5 ? `http://localhost:12345/polarion/rest/v1/projects/PRJ/workitems?page%5Bsize%5D=1&page%5Bnumber%5D=${nextPage}` : undefined;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [{ type: 'workitems', id: `PRJ/WI-${number}` }], links: { next }, meta: { totalCount: 5 } }));
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/polarion/rest/v1`;
  const { createPolarionServer } = await import('../src/server.js');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const server = createPolarionServer({ apiBaseUrl: baseUrl, maxResponseChars: 220, filter: { toolsets: ['work-items'] } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'pagination-test', version: '1' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const list = await client.listTools();
    const tool = list.tools.find(item => item.name === 'getWorkItems');
    assert.ok((tool?.inputSchema as any)?.properties?.max_items);
    const collected = await client.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1, max_items: 5 } });
    assert.equal(requests, 5);
    assert.equal((collected.structuredContent as any).data[0].id, 'PRJ/WI-1');
    assert.ok((collected.structuredContent as any).data.length < 5, 'structured-content cap should omit items when the merged payload exceeds the cap');
    assert.equal((collected.structuredContent as any).meta.totalCount, 5);
    assert.equal('next' in ((collected.structuredContent as any).links ?? {}), false);
    assert.equal((collected.structuredContent as any).truncated, true);
    assert.ok(JSON.stringify(collected.structuredContent).length <= 220);
    const collectedText = (collected as any).content[0].text as string;
    assert.ok(collectedText.length <= 220);
    requests = 0;
    const limited = await client.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1, max_items: 3 } });
    assert.equal(requests, 3);
    assert.equal((limited.structuredContent as any).truncated, true);
    requests = 0;
    const baseline = await client.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1 } });
    assert.equal(requests, 1);
    const expectedPage = { data: [{ type: 'workitems', id: 'PRJ/WI-1' }], links: { next: `http://localhost:12345/polarion/rest/v1/projects/PRJ/workitems?page%5Bsize%5D=1&page%5Bnumber%5D=2` }, meta: { totalCount: 5 } };
    assert.equal((baseline as any).content[0].text, `API Response (Status: 200):\n${JSON.stringify(expectedPage)}`);

    const { Client: McpClient } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport: PairTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const compositeServer = createPolarionServer({ apiBaseUrl: baseUrl, maxResponseChars: 4000, filter: { toolsets: ['work-items', 'composites'] } });
    const [compositeClientTransport, compositeServerTransport] = PairTransport.createLinkedPair();
    const compositeClient = new McpClient({ name: 'pagination-composite-test', version: '1' });
    await Promise.all([compositeServer.connect(compositeServerTransport), compositeClient.connect(compositeClientTransport)]);
    try {
      requests = 0;
      const searched = await compositeClient.callTool({ name: 'search_work_items', arguments: { projectId: 'PRJ', max_items: 5 } });
      const searchBody = JSON.parse((searched as any).content[0].text);
      assert.deepEqual(searchBody.results.map((item: any) => item.id), ['PRJ/WI-1', 'PRJ/WI-2', 'PRJ/WI-3', 'PRJ/WI-4', 'PRJ/WI-5']);
      assert.equal(searchBody.totalCount, 5);
      assert.equal('next' in (searchBody.links ?? {}), false);
      assert.equal(requests, 6, 'one metadata lookup and five real list pages');
    } finally { await compositeClient.close(); await compositeServer.close(); }

    largeCollection = true;
    requests = 0;
    observedPages.length = 0;
    const wideServer = createPolarionServer({ apiBaseUrl: baseUrl, maxResponseChars: 50_000, filter: { toolsets: ['work-items'] } });
    const [wideClientTransport, wideServerTransport] = PairTransport.createLinkedPair();
    const wideClient = new McpClient({ name: 'pagination-page-size-test', version: '1' });
    await Promise.all([wideServer.connect(wideServerTransport), wideClient.connect(wideClientTransport)]);
    try {
      const collected250 = await wideClient.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', max_items: 250 } });
      assert.equal(requests, 3, '250 items use three pages with the API maximum of 100 per page');
      assert.deepEqual(observedPages, [1, 2, 3]);
      assert.equal((collected250.structuredContent as any).data.length, 250);
      assert.equal((collected250.structuredContent as any).data[249].id, 'PRJ/WI-250');
    } finally { await wideClient.close(); await wideServer.close(); }
    largeCollection = false;

    for (const behavior of ['unparseable', 'repeat-later'] as const) {
      nextBehavior = behavior;
      requests = 0;
      const stopped = await client.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1, max_items: 4 } });
      assert.equal(requests, behavior === 'repeat-later' ? 2 : 1, `${behavior} must stop before fetching an invalid continuation`);
      assert.equal(stopped.isError, true);
      assert.match((stopped as any).content[0].text, /Pagination stopped/);
    }

    nextBehavior = 'normal';
    requests = 0;
    observedPages.length = 0;
    const startedAtThree = await client.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1, page_number_: 3, max_items: 2 } });
    assert.equal(requests, 2);
    assert.deepEqual(observedPages, [3, 4]);
    assert.equal((startedAtThree.structuredContent as any).data[0].id, 'PRJ/WI-3');

    nextBehavior = 'normal';
    requests = 0;
    const limiter = { checks: 0, check() { return ++this.checks === 3 ? 1 : undefined; } };
    const limitedServer = createPolarionServer({ apiBaseUrl: baseUrl, rateLimiter: limiter as any, filter: { toolsets: ['work-items'] } });
    const [limitedClientTransport, limitedServerTransport] = InMemoryTransport.createLinkedPair();
    const limitedClient = new Client({ name: 'pagination-rate-test', version: '1' });
    await Promise.all([limitedServer.connect(limitedServerTransport), limitedClient.connect(limitedClientTransport)]);
    try {
      const limitedPage = await limitedClient.callTool({ name: 'getWorkItems', arguments: { projectId: 'PRJ', page_size_: 1, max_items: 5 } });
      assert.equal(requests, 2);
      assert.equal(limiter.checks, 3);
      assert.equal(limitedPage.isError, true);
      assert.match((limitedPage as any).content[0].text, /rate limit exceeded/i);
    } finally { await limitedClient.close(); await limitedServer.close(); }
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
    delete process.env.BEARER_TOKEN;
  }
});

test('max_items rejects a page size above the per-request limit instead of shifting the page window', async () => {
  const definition = {
    name: 'list_things', description: '', method: 'get', pathTemplate: '/things', executionParameters: [], securityRequirements: [],
    inputSchema: { type: 'object', properties: { 'page[size]': { type: 'number' } } },
    outputSchema: { type: 'object', properties: { data: { type: 'array', items: {} }, links: { type: 'object', properties: { next: {} } }, meta: { type: 'object', properties: { totalCount: {} } } } },
  } as any
  let upstreamCalls = 0
  const executor = async () => { upstreamCalls++; return { content: [], isError: false } } 
  await assert.rejects(
    executeTool('list_things', definition, { page_size_: 500, page_number_: 3, max_items: 10 }, {}, executor as any, { apiBaseUrl: 'http://127.0.0.1' }),
    /at most 100/,
  )
  assert.equal(upstreamCalls, 0)
})
