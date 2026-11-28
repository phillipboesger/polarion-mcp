import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createConnection, type AddressInfo, type Socket } from 'node:net';
import { once } from 'node:events';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { Sealer } from '../../src/sealed.js';
import { SUPPORTED_PROTOCOL_VERSIONS as V1_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { createFakePolarion, stdioEnv, PAT, SECRET, rawRpc, rawHttp, GUIDE_URI } from './compat-helpers.js';

const fake = await createFakePolarion();
process.env.API_BASE_URL = fake.base;
const { createMcpHttpApp, shutdownHttpServer } = await import('../../src/mcp-http-server.js');
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

test('legacy capabilities and 2024-10-07 protocol remain compatible', async () => {
  const server = await app();
  try {
    const init = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-10-07', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    const result = init.json?.result as { protocolVersion: string; capabilities: unknown };
    assert.equal(result.protocolVersion, '2024-10-07');
    assert.deepEqual(result.capabilities, { tools: {}, resources: {}, prompts: {} });
    const list = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { 'mcp-session-id': init.sessionId!, 'mcp-protocol-version': '2024-10-07' });
    assert.equal(list.status, 200);
  } finally { await server.close(); }
});

test('malformed Host headers return 400', async () => {
  const server = await app();
  try {
    for (const host of ['a b', 'x:99999999', 'u:p@localhost']) {
      const result = await rawHttp('POST', `${server.base}/mcp`, { host, authorization: `Bearer ${PAT}`, 'content-type': 'application/json' }, JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
      assert.equal(result.status, 400, host);
      assert.doesNotMatch(result.text, /stack|TypeError/);
    }
  } finally { await server.close(); }
});

test('modern HTTP subscriptions are rejected', async () => {
  const server = await app();
  try {
    const response = await fetch(`${server.base}/mcp`, { method: 'POST', signal: AbortSignal.timeout(1500), headers: { authorization: `Bearer ${PAT}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'subscriptions/listen' }, body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'subscriptions/listen', params: { notifications: { toolsListChanged: true }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }) });
    assert.equal((await response.json() as { error: { code: number } }).error.code, -32601);
  } finally { await server.close(); }
});


test('stdio rejects subscriptions and legacy mode rejects modern envelopes', async () => {
  for (const [era, method] of [['dual', 'subscriptions/listen'], ['legacy', 'tools/call']] as const) {
    const child = spawn(process.execPath, ['build/index.js'], { env: stdioEnv(fake.base, { MCP_PROTOCOL_ERA: era, MCP_MODE: 'full' }), stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = createInterface({ input: child.stdout });
    const before = fake.calls('DELETE');
    try {
      const response = Promise.race([once(lines, 'line'), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('stdio response timeout')), 15000).unref())]);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 7, method, params: { notifications: { toolsListChanged: true }, name: 'deleteProject', arguments: { projectId: 'demo', confirm: true }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }) + '\n');
      const [line] = await response;
      const result = JSON.parse(line as string) as { error?: { code: number } };
      assert.ok(result.error, era);
      if (era === 'dual') assert.equal(result.error.code, -32601);
      assert.equal(fake.calls('DELETE'), before);
    } finally { lines.close(); child.kill(); }
  }
});

test('shutdown completes when a modern upstream request never finishes', async () => {
  let arrived!: () => void;
  const started = new Promise<void>(resolve => { arrived = resolve; });
  let upstreamAborted = false;
  const upstream = createServer((_req, res) => { res.on('close', () => { upstreamAborted = true; }); arrived(); });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const instance = createMcpHttpApp({ validateToken: async () => true, tokenSecret: SECRET, apiBaseUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}` });
  const http = createServer(instance.app);
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const c = client();
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${(http.address() as AddressInfo).port}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    let settled = false;
    void c.callTool({ name: 'execute', arguments: { code: 'return await polarion.getProjects({});' } }).catch(() => {}).finally(() => { settled = true; });
    await started;
    const begin = Date.now();
    await instance.closeAllSessions();
    // Well below the 2 s drain fallback: the handler must end the call itself.
    assert.ok(Date.now() - begin < 1500, `drain took ${Date.now() - begin} ms`);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(settled, true);
    assert.equal(upstreamAborted, true);
  } finally { await c.close(); http.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise<void>(resolve => http.close(() => resolve())), new Promise<void>(resolve => upstream.close(() => resolve()))]); }
});

test('modern discovery advertises exact capabilities', async () => {
  const server = await app();
  const c = client();
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    assert.deepEqual(c.getServerCapabilities(), { tools: {}, resources: {}, prompts: {} });
  } finally { await c.close(); await server.close(); }
});

test('v2 legacy client works in dual mode', async () => {
  const server = await app();
  const c = client('legacy');
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    assert.deepEqual((await c.listTools()).tools.map(t => t.name).sort(), ['execute', 'search']);
  } finally { await c.close(); await server.close(); }
});

test('modern scripts fail closed for every elicitation capability shape', async () => {
  const server = await app({ confirmDestructive: true });
  try {
    for (const elicitation of [{}, { form: {} }, { url: {} }]) {
      const before = fake.calls('DELETE') + fake.calls('POST') + fake.calls('PATCH');
      const response = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'execute', arguments: { code: "await polarion.deleteProject({projectId:'demo',confirm:true}); return 'ok';" }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': { elicitation }, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }, { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': 'execute' });
      assert.equal(response.status, 200, JSON.stringify(response.json));
      assert.match(JSON.stringify(response.json?.result), /not yet available for modern clients/);
      assert.equal(fake.calls('DELETE') + fake.calls('POST') + fake.calls('PATCH'), before);
    }
    // Positive control: without elicitation a confirmed script runs, and its destructive call is still refused.
    const run = (id: number, code: string) => rawRpc(server.base, PAT, { jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'execute', arguments: { code, confirm: true }, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }, { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call', 'mcp-name': 'execute' });
    const read = await run(2, "const p = await polarion.getProjects({}); return p.data.map(x => x.id);");
    assert.match(JSON.stringify(read.json?.result), /demo/);
    const deletes = fake.calls('DELETE');
    const inner = await run(3, "await polarion.deleteProject({projectId:'demo',confirm:true}); return 'ok';");
    assert.match(JSON.stringify(inner.json?.result), /requires confirmation/);
    assert.equal(fake.calls('DELETE'), deletes);
  } finally { await server.close(); }
});

test('modern requests reject unsupported protocol versions', async () => {
  const server = await app();
  try {
    const response = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 1, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2099-01-01', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }, { 'mcp-protocol-version': '2099-01-01', 'mcp-method': 'ping' });
    assert.ok(response.status >= 400 || response.json?.error);
  } finally { await server.close(); }
});


test('modern OAuth rejects foreign secrets and wrong audiences', async () => {
  const server = await app({ publicUrl: new URL('https://mcp.example') });
  try {
    const payload = { p: PAT, aud: 'https://other.example/mcp', e: Date.now() + 60000 };
    const tokens = [new Sealer('foreign-secret-long-enough-for-testing-123', fake.base).seal('a', payload), new Sealer(SECRET, fake.base).seal('a', payload)];
    for (const token of tokens) {
      const response = await rawRpc(server.base, token, { jsonrpc: '2.0', id: 1, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' } } } }, { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'ping' });
      assert.equal(response.status, 401);
    }
  } finally { await server.close(); }
});

test('modern progress notifications reach the client', async () => {
  process.env.MCP_MODE = 'full';
  const server = await app();
  const c = client();
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    const events: number[] = [];
    const result = await c.callTool({ name: 'run_job_and_wait', arguments: { requestBody: { jobId: 'compat-factory' }, max_wait_seconds: 1 } }, { onprogress: event => { events.push(event.progress); } });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.ok(events.length >= 2);
    assert.equal(events[0], 0);
    assert.equal(events.at(-1), 1);
  } finally { delete process.env.MCP_MODE; await c.close(); await server.close(); }
});

test('modern cancellation prevents later upstream writes', async () => {
  let notify!: () => void;
  const started = new Promise<void>(resolve => { notify = resolve; });
  let requests = 0;
  let release!: () => void;
  const upstream = createServer((_req, res) => { requests++; release = () => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [] })); notify(); });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const server = await app({ apiBaseUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}` });
  const c = client();
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    const controller = new AbortController();
    const pending = c.callTool({ name: 'execute', arguments: { code: "await polarion.getProjects({}); await polarion.deleteProject({projectId:'demo'});" } }, { signal: controller.signal });
    await started;
    controller.abort();
    release();
    await assert.rejects(pending);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(requests, 1);
  } finally { await c.close(); await server.close(); upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve())); }
});


test('all v1 SDK legacy protocol versions negotiate and accept their request header', async () => {
  assert.deepEqual(V1_PROTOCOL_VERSIONS, ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07']);
  const server = await app();
  try {
    for (const version of V1_PROTOCOL_VERSIONS) {
      const init = await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: version, capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
      assert.equal((init.json?.result as { protocolVersion: string }).protocolVersion, version);
      assert.equal((await rawRpc(server.base, PAT, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { 'mcp-session-id': init.sessionId!, 'mcp-protocol-version': version })).status, 200);
    }
  } finally { await server.close(); }
});

// The timeout makes a missing force-close fail the test instead of hanging the run.
test('shutdown lets a slow non-MCP request finish and cuts a stalled one after the grace time', { timeout: 30_000 }, async () => {
  for (const stalled of [false, true]) {
    let arrived!: () => void;
    const started = new Promise<void>(resolve => { arrived = resolve; });
    const server = createServer((_req, res) => { arrived(); if (!stalled) setTimeout(() => res.end('written'), 300); });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const answer = fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/patchWorkItem`, { method: 'POST' }).then(response => response.text(), () => 'cut');
    await started;
    const begin = Date.now();
    await shutdownHttpServer(server, async () => {}, stalled ? 500 : 5000);
    assert.equal(await answer, stalled ? 'cut' : 'written');
    assert.ok(Date.now() - begin < 2000, `shutdown took ${Date.now() - begin} ms`);
  }
});

test('shutdown still cuts a stalled request when closing the sessions fails', { timeout: 30_000 }, async () => {
  let arrived!: () => void;
  const started = new Promise<void>(resolve => { arrived = resolve; });
  const server = createServer(() => arrived());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const answer = fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/patchWorkItem`, { method: 'POST' }).then(response => response.text(), () => 'cut');
  await started;
  await shutdownHttpServer(server, async () => { throw new Error('close failed'); }, 500);
  assert.equal(await answer, 'cut');
});

test('SIGTERM ends the HTTP server with a modern call and a half-sent request in flight', { timeout: 30_000 }, async () => {
  let arrived!: () => void;
  const started = new Promise<void>(resolve => { arrived = resolve; });
  const upstream = createServer((req, res) => {
    if (req.url?.includes('/metadata')) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { type: 'metadata', id: 'metadata' } })); return; }
    arrived();
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const child = spawn(process.execPath, ['build/mcp-http-server.js'], { env: stdioEnv(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}/polarion/rest/v1`, { MCP_HTTP_PORT: String(port), MCP_HTTP_HOST: '127.0.0.1' }), stdio: ['ignore', 'pipe', 'ignore'] });
  const c = client();
  let halfSent: Socket | undefined;
  try {
    const lines = createInterface({ input: child.stdout! });
    for await (const line of lines) if (line.includes('listening on port')) break;
    child.stdout!.resume();
    await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } }));
    void c.callTool({ name: 'execute', arguments: { code: 'return await polarion.getProjects({});' } }).catch(() => {});
    await started;
    // Only the grace-time force close ends this connection, so a SIGTERM handler that skips it never exits in time.
    halfSent = createConnection({ host: '127.0.0.1', port });
    halfSent.on('error', () => {});
    await once(halfSent, 'connect');
    await new Promise<void>(resolve => halfSent!.write('POST /api/tools/getProjects HTTP/1.1\r\nHost: 127.0.0.1\r\n', () => resolve()));
    await new Promise(resolve => setTimeout(resolve, 200));
    const exit = once(child, 'exit');
    child.kill('SIGTERM');
    const [code] = await Promise.race([exit, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no exit')), 15_000).unref())]);
    assert.equal(code, 0);
  } finally { halfSent?.destroy(); child.kill('SIGKILL'); await c.close(); upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve())); }
});
