import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createFakePolarion, stdioEnv, PAT, SECRET, rawRpc, rawHttp, GUIDE_URI } from './compat-helpers.js';

const fake = await createFakePolarion();
process.env.API_BASE_URL = fake.base;
const { createMcpHttpApp } = await import('../../src/mcp-http-server.js');
after(async () => { await fake.close(); });

async function app(options: Parameters<typeof createMcpHttpApp>[0] = {}) {
  const instance = createMcpHttpApp({ validateToken: async token => token === PAT, tokenSecret: SECRET, apiBaseUrl: fake.base, ...options });
  const server = createServer(instance.app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: async () => { await instance.closeAllSessions(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}

function client(mode: 'auto' | 'legacy' = 'auto', elicitation = false) {
  return new Client({ name: 'compat-modern', version: '1' }, { capabilities: elicitation ? { elicitation: { form: {} } } : {}, versionNegotiation: { mode } });
}

for (const kind of ['stdio', 'http'] as const) {
  test(`modern ${kind}: tools, read, write, resources`, async () => {
    const server = kind === 'http' ? await app() : undefined;
    const transport = server ? new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }) : new StdioClientTransport({ command: process.execPath, args: ['build/index.js'], env: stdioEnv(fake.base) });
    const c = client();
    try {
      await c.connect(transport);
      assert.equal(c.getNegotiatedProtocolVersion(), '2026-07-28');
      assert.deepEqual((await c.listTools()).tools.map(t => t.name).sort(), ['execute', 'search']);
      const read = await c.callTool({ name: 'execute', arguments: { code: 'const p = await polarion.getProjects({}); return p.data.map(x => x.id);' } });
      assert.equal(read.isError, undefined, JSON.stringify(read));
      const before = fake.calls('DELETE');
      const write = await c.callTool({ name: 'execute', arguments: { code: "await polarion.createProject({requestBody:{projectId:'compat-proj',templateId:'compat-template',params:{}}}); await polarion.deleteProject({projectId:'compat-proj'}); return 'ok';" } });
      assert.equal(write.isError, undefined, JSON.stringify(write));
      assert.equal(fake.calls('DELETE') - before, 1);
      assert.ok((await c.listResources()).resources.some(r => r.uri === GUIDE_URI));
      assert.match(JSON.stringify(await c.readResource({ uri: GUIDE_URI })), /query syntax/);
    } finally { await c.close(); await server?.close(); }
  });
}

test('modern confirmation fails closed with elicitation and permits explicit confirmation without it', async () => {
  process.env.MCP_MODE = 'full';
  const server = await app({ confirmDestructive: true });
  try {
    for (const canElicit of [true, false]) {
      const c = client('auto', canElicit);
      try {
        await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
        const before = fake.calls('DELETE');
        const refused = await c.callTool({ name: 'deleteProject', arguments: { projectId: 'demo' } });
        assert.equal(refused.isError, true);
        assert.equal(fake.calls('DELETE'), before);
        const confirmed = await c.callTool({ name: 'deleteProject', arguments: { projectId: 'demo', confirm: true } });
        assert.equal(Boolean(confirmed.isError), canElicit, JSON.stringify(confirmed));
        assert.equal(fake.calls('DELETE') - before, canElicit ? 0 : 1);
      } finally { await c.close(); }
    }
  } finally { delete process.env.MCP_MODE; await server.close(); }
});

test('modern HTTP rejects hostile requests and honors readonly', async () => {
  const server = await app();
  const hostServer = await app({ allowedHosts: ['allowed.example'] });
  try {
    const modern = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } };
    const headers = { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' };
    assert.equal((await rawHttp('POST', `${hostServer.base}/mcp`, { ...headers, host: 'evil.example', authorization: `Bearer ${PAT}`, 'content-type': 'application/json' }, JSON.stringify(modern))).status, 403);
    assert.equal((await rawRpc(server.base, PAT, modern, { ...headers, origin: 'https://evil.example' })).status, 403);
    assert.equal((await rawRpc(server.base, 'wrong', modern, headers)).status, 401);
    const tooLarge = await rawRpc(server.base, PAT, { ...modern, blob: 'x'.repeat(11 * 1024 * 1024) }, headers);
    assert.equal(tooLarge.status, 413);
    const mismatch = await rawRpc(server.base, PAT, modern, { ...headers, 'mcp-method': 'ping' });
    assert.ok(mismatch.status >= 400 || mismatch.json?.error);
    const readonly = await rawRpc(server.base, PAT, { ...modern, id: 2, method: 'tools/call', params: { ...modern.params, name: 'execute', arguments: { code: "await polarion.deleteProject({projectId:'demo'});" } } }, { ...headers, 'mcp-method': 'tools/call', 'mcp-name': 'execute', 'x-mcp-readonly': 'true' });
    assert.match(JSON.stringify(readonly.json), /error|not a function|not defined/i);
  } finally { await hostServer.close(); await server.close(); }
});

test('legacy switch still serves a legacy v2 client', async () => {
  const server = await app({ protocolEra: 'legacy' });
  try {
    const modern = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }, { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' });
    assert.equal(modern.status, 400);
    const legacy = client('legacy');
    try {
      await legacy.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
      assert.deepEqual((await legacy.listTools()).tools.map(t => t.name).sort(), ['execute', 'search']);
    } finally { await legacy.close(); }
  } finally { await server.close(); }
});

test('modern request filters use different catalogs and script confirmation cannot authorize a delete', async () => {
  process.env.MCP_MODE = 'full';
  const server = await app({ confirmDestructive: true });
  const connect = async (readonly: boolean) => {
    const c = client();
    await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}`, 'x-mcp-readonly': String(readonly) } } }));
    return c;
  };
  try {
    const unrestricted = await connect(false);
    const readonly = await connect(true);
    try {
      assert.ok((await unrestricted.listTools()).tools.some(t => t.name === 'deleteProject'));
      assert.ok(!(await readonly.listTools()).tools.some(t => t.name === 'deleteProject'));
    } finally { await unrestricted.close(); await readonly.close(); }
    process.env.MCP_MODE = 'code';
    const code = await connect(false);
    try {
      const before = fake.calls('DELETE');
      const result = await code.callTool({ name: 'execute', arguments: { code: "await polarion.deleteProject({projectId:'demo',confirm:true}); return 'ok';" } });
      assert.equal(result.isError, true);
      assert.equal(fake.calls('DELETE'), before);
    } finally { await code.close(); }
  } finally { delete process.env.MCP_MODE; await server.close(); }
});

test('modern concurrent callers retain their own credentials and reuse only successful PAT probes', async () => {
  const seen: string[] = [];
  const upstream = createServer((req, res) => {
    seen.push(req.headers.authorization ?? '');
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ type: 'projects', id: 'demo' }] }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const base = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/polarion/rest/v1`;
  const probes: string[] = [];
  const server = await app({ apiBaseUrl: base, validateToken: async token => { probes.push(token); return token === 'caller-a' || token === 'caller-b'; } });
  const a = client(); const b = client();
  try {
    await Promise.all([a.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: 'Bearer caller-a' } } })), b.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: 'Bearer caller-b' } } }))]);
    await Promise.all([a, b].map(c => c.callTool({ name: 'execute', arguments: { code: 'return await polarion.getProjects({});' } })));
    assert.deepEqual(seen.sort(), ['Bearer caller-a', 'Bearer caller-b']);
    assert.equal(probes.filter(token => token === 'caller-a').length, 1);
    assert.equal(probes.filter(token => token === 'caller-b').length, 1);
    for (let i = 0; i < 2; i++) assert.equal((await rawRpc(server.base, 'invalid', { jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '2026-07-28' })).status, 401);
    assert.equal(probes.filter(token => token === 'invalid').length, 2);
  } finally { await a.close(); await b.close(); await server.close(); await new Promise<void>(resolve => upstream.close(() => resolve())); }
});
