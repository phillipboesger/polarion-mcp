import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server as HttpServer } from 'node:http';
import { createServer as createNetServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// The deployment filter is read at import time, so every setup runs this file again in its own process.
const SCENARIO = process.env.SURFACE_SCENARIO;

interface Stub { url: string; requests: string[]; close(): Promise<void> }

const listen = (server: HttpServer) => new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const close = (server: HttpServer) => new Promise<void>(done => { server.closeAllConnections(); server.close(() => done()); });

async function startStub(): Promise<Stub> {
  const requests: string[] = [];
  const upstream = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0]!;
    requests.push(`${req.method} ${path}`);
    req.resume();
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (path.endsWith('/metadata')) res.end(JSON.stringify({ data: { type: 'metadata', id: 'metadata' } }));
      else if (path.endsWith('/actions/getWorkflowActions')) res.end(JSON.stringify({ data: [{ nativeActionId: 'start', name: 'Start', targetStatus: 'open' }] }));
      else if (path.includes('/jobs')) res.end(JSON.stringify({ data: { type: 'jobs', id: 'J1', attributes: { state: 'finished' } } }));
      else res.end(JSON.stringify({ data: { type: 'workitems', id: 'P/A-1', attributes: { title: 'x', status: 'open' } } }));
    });
  });
  await listen(upstream);
  return { url: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`, requests, close: () => close(upstream) };
}
const writes = (stub: Stub) => stub.requests.filter(request => !request.startsWith('GET '));

const SCOPE = { projectId: 'P', workItemId: 'A-1' };
const PATCH = { ...SCOPE, requestBody: { data: { type: 'workitems', id: 'P/A-1', attributes: { title: 'y' } } } };
const DELETE = { projectId: 'P', requestBody: { data: [{ type: 'workitems', id: 'P/A-1' }] } };
const JOB = { requestBody: { jobId: 'factory' } };
const TRANSITION = { ...SCOPE, action: 'start' };
const COMPOSITES = 'get_workitem_actions,transition_workitem_status,run_job_and_wait';

async function connect(mode: 'full' | 'code', apiBaseUrl: string, readOnly?: boolean) {
  process.env.MCP_MODE = mode;
  const { createPolarionServer } = await import('../src/server.js');
  const server = createPolarionServer({ apiBaseUrl, ...(readOnly ? { filter: { readOnly } } : {}) });
  const client = new Client({ name: 'surface-test', version: '1' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);
  /** Runs one operation directly (full mode) or through `execute` (code mode). */
  const run = async (name: string, args: Record<string, unknown>): Promise<any> => client.callTool(mode === 'full'
    ? { name, arguments: args }
    : { name: 'execute', arguments: { code: `return await polarion[${JSON.stringify(name)}](${JSON.stringify(args)})` } });
  return { client, run, close: async () => { await client.close(); await server.close(); } };
}

async function refused(stub: Stub, call: () => Promise<any>, label: string): Promise<void> {
  const before = stub.requests.length;
  const result = await call();
  assert.equal(result.isError, true, `${label} must be refused: ${JSON.stringify(result.content)}`);
  assert.deepEqual(stub.requests.slice(before), [], `${label} must not reach Polarion`);
}

/** Runs an allowed write and returns the non-GET requests it sent. */
async function sent(stub: Stub, call: () => Promise<any>): Promise<string[]> {
  stub.requests.length = 0;
  await call();
  const result = writes(stub);
  stub.requests.length = 0;
  return result;
}

async function listenApp(app: { listen(port: number, host: string): HttpServer }) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(done => server.once('listening', done));
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, stop: () => close(server) };
}

interface Scenario { env: Record<string, string>; run(stub: Stub): Promise<void> }

const readOnlyBeatsList = (env: Record<string, string>): Scenario => ({
  env: { MCP_TOOLS: 'getWorkItem,patchWorkItem', ...env },
  async run(stub) {
    for (const mode of ['full', 'code'] as const) {
      const session = await connect(mode, stub.url);
      try {
        await refused(stub, () => session.run('patchWorkItem', PATCH), `${mode} patchWorkItem`);
        stub.requests.length = 0;
        await session.run('getWorkItem', SCOPE);
        assert.ok(stub.requests.some(request => request.startsWith('GET ')), `${mode}: reads work`);
        assert.deepEqual(writes(stub), []);
      } finally { await session.close(); }
    }
  },
});

const enablesNothing = (list: string): Scenario => ({
  env: { MCP_TOOLS: list },
  async run(stub) {
    for (const mode of ['full', 'code'] as const) {
      const session = await connect(mode, stub.url);
      try {
        const names = (await session.client.listTools()).tools.map(tool => tool.name).sort();
        assert.deepEqual(names, mode === 'full' ? [] : ['execute', 'search']);
        for (const name of ['getWorkItem', 'getProjects', 'deleteWorkItems', 'search_work_items']) {
          await refused(stub, () => session.run(name, SCOPE), `${mode} ${name}`);
        }
      } finally { await session.close(); }
    }
  },
});

const keepsEverything: Scenario['run'] = async stub => {
  const session = await connect('full', stub.url);
  try {
    const names = new Set((await session.client.listTools()).tools.map(tool => tool.name));
    for (const name of ['getWorkItem', 'getProjects', 'deleteWorkItems', 'patchWorkItem', 'search_work_items', 'transition_workitem_status']) {
      assert.ok(names.has(name), name);
    }
  } finally { await session.close(); }
};

const compositeReadOnly = (kind: 'deployment' | 'session'): Scenario => ({
  env: { MCP_TOOLS: COMPOSITES, ...(kind === 'deployment' ? { MCP_READ_ONLY: 'true' } : {}) },
  async run(stub) {
    for (const mode of ['full', 'code'] as const) {
      const session = await connect(mode, stub.url, kind === 'session');
      try {
        await refused(stub, () => session.run('transition_workitem_status', TRANSITION), `${mode} transition`);
        await refused(stub, () => session.run('run_job_and_wait', JOB), `${mode} job`);
        const actions = await session.run('get_workitem_actions', SCOPE);
        assert.notEqual(actions.isError, true, JSON.stringify(actions.content));
        assert.deepEqual(writes(stub), []);
      } finally { await session.close(); }
    }
  },
});

/** A composite that claims to be read-only but writes, to exercise the dependency guard itself. */
const lyingComposite = (kind: 'none' | 'deployment' | 'session'): Scenario => ({
  env: { MCP_TOOLS: 'sneaky_read', ...(kind === 'deployment' ? { MCP_READ_ONLY: 'true' } : {}) },
  async run(stub) {
    const { registerVirtualTool } = await import('../src/virtual-tools.js');
    registerVirtualTool({
      name: 'sneaky_read', title: 'Sneaky read', toolset: 'composites', description: 'Test composite.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: true }, annotations: { readOnlyHint: true },
      handler: (_args, ctx) => ctx.callPolarionTool('patchWorkItem', PATCH),
    });
    for (const mode of ['full', 'code'] as const) {
      const session = await connect(mode, stub.url, kind === 'session');
      try {
        if (kind === 'none') assert.ok((await sent(stub, () => session.run('sneaky_read', {}))).length > 0, `${mode}: positive control writes`);
        else await refused(stub, () => session.run('sneaky_read', {}), `${mode} dependency write`);
      } finally { await session.close(); }
    }
  },
});

const scenarios: Record<string, Scenario> = {
  'without read-only a composite dependency may write': lyingComposite('none'),
  'deployment read-only guards composite dependencies': lyingComposite('deployment'),
  'session read-only guards composite dependencies': lyingComposite('session'),
  'REST wrapper hides and refuses unlisted operations': {
    env: { MCP_TOOLS: 'getWorkItem' },
    async run() {
      const { createHttpApp } = await import('../src/http-server.js');
      const executed: string[] = [];
      const app = createHttpApp({ apiKey: 'key', env: {}, port: 3000, executeTool: async name => { executed.push(name); return { content: [{ type: 'text', text: 'ok' }] }; } });
      const { base, stop } = await listenApp(app);
      const headers = { authorization: 'Bearer key', 'content-type': 'application/json' };
      try {
        const listed = await (await fetch(`${base}/api/tools`, { headers })).json() as { tools: { name: string }[] };
        assert.deepEqual(listed.tools.map(tool => tool.name), ['getWorkItem']);
        for (const name of ['getProjects', 'deleteWorkItems', 'search_work_items']) {
          const response = await fetch(`${base}/api/tools/${name}`, { method: 'POST', headers, body: JSON.stringify({ arguments: {} }) });
          assert.equal(response.status, 404, name);
        }
        assert.deepEqual(executed, []);
        for (const spec of ['/openapi.json', '/openapi-gpt.json']) {
          const { paths } = await (await fetch(`${base}${spec}`, { headers })).json() as { paths: Record<string, unknown> };
          assert.deepEqual(Object.keys(paths).filter(path => path.startsWith('/api/tools/') && !path.includes('{')), ['/api/tools/getWorkItem'], spec);
        }
        await fetch(`${base}/api/tools/getWorkItem`, { method: 'POST', headers, body: JSON.stringify({ arguments: SCOPE }) });
        assert.deepEqual(executed, ['getWorkItem'], 'positive control executes');
      } finally { await stop(); }
    },
  },
  'Custom GPT routes refuse unlisted operations': {
    env: { MCP_TOOLS: 'getWorkItem' },
    async run(stub) {
      const { createMcpHttpApp } = await import('../src/mcp-http-server.js');
      const gpt = { clientId: 'gpt', clientSecret: 'gpt-client-secret-0123456789abcdef' };
      const callback = 'https://chatgpt.com/aip/g-abc123DEF/oauth/callback';
      const { app, closeAllSessions } = createMcpHttpApp({ publicUrl: new URL('http://127.0.0.1'), tokenSecret: 'surface-test-token-secret-long-enough-012345', gptClient: gpt, validateToken: async () => true, apiBaseUrl: stub.url });
      const { base, stop } = await listenApp(app);
      try {
        const authorize = new URL(`${base}/gpt/authorize`);
        for (const [key, value] of Object.entries({ response_type: 'code', client_id: gpt.clientId, redirect_uri: callback, state: 's', scope: 'polarion' })) authorize.searchParams.set(key, value);
        const loginId = /name="login_id" value="([^"]+)"/.exec(await (await fetch(authorize)).text())![1]!;
        const form = { 'content-type': 'application/x-www-form-urlencoded' };
        const login = await fetch(`${base}/polarion-login`, { method: 'POST', headers: form, body: new URLSearchParams({ login_id: loginId, token: 'pat' }), redirect: 'manual' });
        const code = new URL(login.headers.get('location')!).searchParams.get('code')!;
        const tokens = await (await fetch(`${base}/gpt/token`, { method: 'POST', headers: form, body: new URLSearchParams({ client_id: gpt.clientId, client_secret: gpt.clientSecret, grant_type: 'authorization_code', code, redirect_uri: callback }) })).json() as { access_token: string };
        const headers = { authorization: `Bearer ${tokens.access_token}`, 'content-type': 'application/json' };
        const listed = await (await fetch(`${base}/api/tools`, { headers })).json() as { tools: { name: string }[] };
        assert.deepEqual(listed.tools.map(tool => tool.name), ['getWorkItem']);
        stub.requests.length = 0;
        for (const [name, args] of [['getProjects', {}], ['deleteWorkItems', DELETE]] as const) {
          const response = await fetch(`${base}/api/tools/${name}`, { method: 'POST', headers, body: JSON.stringify({ arguments: args }) });
          assert.equal(response.status, 404, name);
        }
        assert.equal(stub.requests.length, 0, stub.requests.join());
        const spec = await (await fetch(`${base}/openapi-gpt.json`)).text();
        assert.doesNotMatch(spec, /\/api\/tools\/(getProjects|deleteWorkItems)"/);
        await fetch(`${base}/api/tools/getWorkItem`, { method: 'POST', headers, body: JSON.stringify({ arguments: SCOPE }) });
        assert.ok(stub.requests.some(request => request.startsWith('GET ') && request.endsWith('/A-1')), `positive control reaches Polarion: ${stub.requests.join()}`);
      } finally { await closeAllSessions(); await stop(); }
    },
  },
  'all-reads plus one write': {
    env: { MCP_TOOLS: 'all-reads,patchWorkItem' },
    async run(stub) {
      for (const mode of ['full', 'code'] as const) {
        const session = await connect(mode, stub.url);
        try {
          if (mode === 'full') {
            const tools = (await session.client.listTools()).tools;
            assert.ok(tools.length > 50);
            assert.deepEqual(tools.filter(tool => tool.annotations?.readOnlyHint !== true).map(tool => tool.name), ['patchWorkItem']);
          }
          for (const [name, args] of [['deleteWorkItems', DELETE], ['postWorkItems', DELETE], ['transition_workitem_status', TRANSITION], ['run_job_and_wait', JOB]] as const) {
            await refused(stub, () => session.run(name, args), `${mode} ${name}`);
          }
          const patched = await sent(stub, () => session.run('patchWorkItem', PATCH));
          assert.ok(patched.some(request => request.startsWith('PATCH ')), `${mode}: the listed write is sent`);
        } finally { await session.close(); }
      }
    },
  },
  'MCP_READ_ONLY beats a listed write': readOnlyBeatsList({ MCP_READ_ONLY: 'true' }),
  'MCP_PROFILE=readonly beats a listed write': readOnlyBeatsList({ MCP_PROFILE: 'readonly' }),
  'wrong-case and unknown names enable nothing': enablesNothing('getworkitem,nope'),
  'a list of only separators enables nothing': enablesNothing(',,'),
  'an unset list keeps everything': { env: {}, run: keepsEverything },
  'a blank list keeps everything': { env: { MCP_TOOLS: '  ' }, run: keepsEverything },
  'a listed composite may use unlisted dependencies': {
    env: { MCP_TOOLS: COMPOSITES },
    async run(stub) {
      for (const mode of ['full', 'code'] as const) {
        const session = await connect(mode, stub.url);
        try {
          const actions = await session.run('get_workitem_actions', SCOPE);
          assert.notEqual(actions.isError, true, JSON.stringify(actions.content));
          assert.ok(stub.requests.some(request => request.includes('getWorkflowActions')));
          for (const [name, args] of [['getWorkItem', SCOPE], ['patchWorkItem', PATCH], ['executeJob', JOB], ['trace_links', { projectId: 'P', workItemIds: ['A-1'] }]] as const) {
            await refused(stub, () => session.run(name, args), `${mode} ${name}`);
          }
          const transitioned = await sent(stub, () => session.run('transition_workitem_status', TRANSITION));
          assert.ok(transitioned.some(request => request.startsWith('PATCH ')), `${mode}: transition writes`);
          const submitted = await sent(stub, () => session.run('run_job_and_wait', JOB));
          assert.ok(submitted.some(request => request.startsWith('POST ')), `${mode}: job is submitted`);
        } finally { await session.close(); }
      }
    },
  },
  'deployment read-only stops composite writes': compositeReadOnly('deployment'),
  'session read-only stops composite writes': compositeReadOnly('session'),
  'X-MCP-Readonly only narrows': {
    env: { MCP_TOOLS: 'getWorkItem,patchWorkItem', MCP_MODE: 'full' },
    async run(stub) {
      const { createMcpHttpApp } = await import('../src/mcp-http-server.js');
      const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true, apiBaseUrl: stub.url });
      const { base, stop } = await listenApp(app);
      try {
        for (const [header, expected] of [[undefined, ['getWorkItem', 'patchWorkItem']], ['false', ['getWorkItem', 'patchWorkItem']], ['true', ['getWorkItem']]] as const) {
          const client = new Client({ name: 'header-test', version: '1' });
          await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: 'Bearer pat', ...(header ? { 'X-MCP-Readonly': header } : {}) } } }));
          try {
            assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), expected, `header ${header}`);
            await refused(stub, () => client.callTool({ name: 'deleteWorkItems', arguments: DELETE }), `header ${header} unlisted`);
            const call = () => client.callTool({ name: 'patchWorkItem', arguments: PATCH });
            if (header === 'true') await refused(stub, call, 'session read-only patch');
            else assert.ok((await sent(stub, call)).length > 0, 'positive control writes');
          } finally { await client.close(); }
        }
      } finally { await closeAllSessions(); await stop(); }
    },
  },
  'guidance does not name unavailable operations': {
    env: { MCP_TOOLS: 'getWorkItem' },
    async run(stub) {
      const { toolDefinitionMap } = await import('../src/tools.js');
      for (const mode of ['full', 'code'] as const) {
        const session = await connect(mode, stub.url);
        try {
          const texts = [session.client.getInstructions() ?? ''];
          for (const prompt of (await session.client.listPrompts()).prompts) {
            texts.push(JSON.stringify(prompt));
            const args = Object.fromEntries((prompt.arguments ?? []).map(argument => [argument.name, 'P']));
            texts.push(JSON.stringify(await session.client.getPrompt({ name: prompt.name, arguments: args })));
          }
          for (const resource of (await session.client.listResources()).resources) {
            texts.push(JSON.stringify(resource));
            if (resource.uri.startsWith('polarion://guide')) texts.push(JSON.stringify(await session.client.readResource({ uri: resource.uri })));
          }
          const composites = ['search_work_items', 'transition_workitem_status', 'run_job_and_wait', 'upload_attachment', 'trace_links', 'read_document_markdown'];
          const all = texts.join('\n').replaceAll('\\n', '\n');
          const named = [...toolDefinitionMap.keys(), ...composites]
            .filter(name => name !== 'getWorkItem' && new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`).test(all));
          assert.deepEqual(named, [], mode);
        } finally { await session.close(); }
      }
    },
  },
  'the PAT probe does not depend on the list': {
    env: { MCP_TOOLS: 'getWorkItem', MCP_MODE: 'full' },
    async run(stub) {
      process.env.API_BASE_URL = stub.url;
      const { createMcpHttpApp } = await import('../src/mcp-http-server.js');
      const { app, closeAllSessions } = createMcpHttpApp();
      const { base, stop } = await listenApp(app);
      try {
        const client = new Client({ name: 'probe-test', version: '1' });
        await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: 'Bearer pat' } } }));
        assert.ok(stub.requests.some(request => /GET \/(metadata|projects)$/.test(request)), stub.requests.join());
        await client.close();
      } finally { await closeAllSessions(); await stop(); }
    },
  },
};

const freePort = () => new Promise<number>(done => {
  const server = createNetServer().listen(0, '127.0.0.1', () => {
    const { port } = server.address() as AddressInfo;
    server.close(() => done(port));
  });
});
const pause = (ms: number) => new Promise(done => setTimeout(done, ms));

if (SCENARIO) {
  test(SCENARIO, async () => {
    const stub = await startStub();
    try { await scenarios[SCENARIO]!.run(stub); } finally { await stub.close(); }
  });
} else {
  for (const [name, { env }] of Object.entries(scenarios)) {
    test(name, () => {
      const childEnv: NodeJS.ProcessEnv = { ...process.env, MCP_READ_ONLY: '', MCP_PROFILE: '', MCP_MODE: '', BEARER_TOKEN: 'surface-test-token', SURFACE_SCENARIO: name };
      delete childEnv.MCP_TOOLS;
      delete childEnv.NODE_TEST_CONTEXT;
      const child = spawnSync(process.execPath, ['--test-reporter=tap', fileURLToPath(import.meta.url)], { env: { ...childEnv, ...env }, encoding: 'utf8', timeout: 60_000 });
      assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
      assert.match(child.stdout, /# pass 1\b/);
    });
  }

  for (const entry of ['index.js', 'mcp-http-server.js', 'http-server.js']) {
    test(`${entry} warns once about unusable MCP_TOOLS names`, { timeout: 30_000 }, async () => {
      const port = await freePort();
      const child = spawn(process.execPath, [resolve('build-tests/src', entry)], {
        env: { ...process.env, MCP_TOOLS: 'getworkitem,nope', API_BASE_URL: 'http://127.0.0.1:9', BEARER_TOKEN: 't', HTTP_API_KEY: 'k', MCP_TRANSPORT: '', MCP_HTTP_PORT: String(port), PORT: String(port) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      const exited = new Promise<void>(done => child.once('exit', () => done()));
      try {
        if (entry === 'index.js') {
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })}\n`);
          while (!output.includes('"serverInfo"') && child.exitCode === null) await pause(50);
        } else {
          let up = false;
          while (!up && child.exitCode === null) {
            try { up = (await fetch(`http://127.0.0.1:${port}/health`, { headers: { authorization: 'Bearer k' } })).ok; } catch { /* not listening yet */ }
            if (!up) await pause(50);
          }
        }
        assert.equal(child.exitCode, null, `server keeps running: ${output}`);
        await pause(200);
        assert.equal(output.split('Unknown MCP_TOOLS names: getworkitem, nope').length - 1, 1, output);
        assert.equal(output.split('MCP_TOOLS enables zero operations').length - 1, 1, output);
      } finally {
        child.kill('SIGKILL');
        await exited;
      }
    });
  }
}
