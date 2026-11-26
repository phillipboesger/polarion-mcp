import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const scenario = process.env.ALLOWLIST_SCENARIO;
if (scenario) {
  test(scenario, async () => {
    const { createPolarionServer } = await import('../src/server.js');
    const requests: string[] = [];
    const upstream = createServer((req, res) => {
      requests.push(req.method ?? '');
      req.resume();
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ data: { type: 'workitems', id: 'A-1' } }));
    });
    await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
    const server = createPolarionServer({ apiBaseUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}` });
    const client = new Client({ name: 'allowlist-test', version: '1' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b);
    await client.connect(a);
    try {
      const tools = await client.listTools();
      const names = tools.tools.map(t => t.name);
      const call = async (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });
      if (scenario === 'full') {
        assert.ok(names.includes('getWorkItem'));
        assert.ok(!names.includes('getProjects') && !names.includes('deleteWorkItems'));
        for (const name of ['getProjects', 'deleteWorkItems']) {
          const result = await call(name, { projectId: 'P' });
          assert.equal(result.isError, true);
          assert.deepEqual(requests, []);
        }
        await call('getWorkItem', { projectId: 'P', workItemId: 'A-1' });
      } else {
        const search = await call('search', { query: 'getProjects', detail: true });
        assert.doesNotMatch(JSON.stringify(search), /getProjects/);
        const denied = await call('execute', { code: 'return await polarion.getProjects({})' });
        assert.equal(denied.isError, true);
        assert.deepEqual(requests, []);
        await call('execute', { code: 'return await polarion.getWorkItem({ projectId: "P", workItemId: "A-1" })' });
      }
      assert.ok(requests.includes('GET'), 'positive control reaches Polarion');
    } finally {
      await client.close();
      await server.close();
      await new Promise<void>(resolve => upstream.close(() => resolve()));
    }
  });
} else {
  for (const mode of ['full', 'code']) test(`allowlist blocks calls in ${mode} mode`, () => {
    const env: NodeJS.ProcessEnv = { ...process.env, MCP_TOOLS: 'getWorkItem', MCP_MODE: mode, MCP_READ_ONLY: '', MCP_PROFILE: '', ALLOWLIST_SCENARIO: mode, BEARER_TOKEN: 'test-token' };
    delete env.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  });
}
