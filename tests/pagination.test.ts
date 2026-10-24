import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { paginate, pageNumberFromLink, type JsonApiPage } from '../src/pagination.js';

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
  const upstream = createHttpServer((req, res) => {
    requests++;
    const url = new URL(req.url ?? '/', baseUrl);
    const number = Number(url.searchParams.get('page[number]') ?? 1);
    const next = number < 5 ? `${baseUrl}/projects/PRJ/workitems?page%5Bsize%5D=1&page%5Bnumber%5D=${number + 1}` : undefined;
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
    assert.deepEqual((collected.structuredContent as any).data.map((item: any) => item.id), ['PRJ/WI-1']);
    assert.equal((collected.structuredContent as any).meta.totalCount, 5);
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
    const expectedPage = { data: [{ type: 'workitems', id: 'PRJ/WI-1' }], links: { next: `${baseUrl}/projects/PRJ/workitems?page%5Bsize%5D=1&page%5Bnumber%5D=2` }, meta: { totalCount: 5 } };
    assert.equal((baseline as any).content[0].text, `API Response (Status: 200):\n${JSON.stringify(expectedPage)}`);
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
    delete process.env.BEARER_TOKEN;
  }
});
