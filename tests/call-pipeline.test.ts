import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { createServer as createHttpServer } from 'node:http'
import { createMcpHttpApp } from '../src/mcp-http-server.js'
import { listVirtualTools, registerVirtualTool } from '../src/virtual-tools.js'
import { enabledTools } from '../src/tool-filter.js'
import { sanitizeInputSchema } from '../src/utils.js'

const TOKEN = 'request-secret-token'
const HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
const INIT = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }

function parseRpc(body: string): any {
  const line = body.split('\n').find(value => value.startsWith('data:'))
  return JSON.parse(line ? line.slice(5).trim() : body)
}

async function start(options: Parameters<typeof createMcpHttpApp>[0] = {}, toolsets?: string, readOnly = false) {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true, ...options })
  const server = app.listen(0)
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const init = await fetch(`${base}/mcp`, {
    method: 'POST', headers: { ...HEADERS, authorization: `Bearer ${TOKEN}`, ...(toolsets ? { 'X-MCP-Toolsets': toolsets } : {}), ...(readOnly ? { 'X-MCP-Readonly': 'true' } : {}) }, body: JSON.stringify(INIT),
  })
  const sessionId = init.headers.get('mcp-session-id')
  assert.equal(init.status, 200)
  assert.ok(sessionId)
  const headers = { ...HEADERS, authorization: `Bearer ${TOKEN}`, 'mcp-session-id': sessionId }
  const stop = async () => {
    await closeAllSessions()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
  return {
    base, headers, stop,
    async request(id: number, method: string, params: Record<string, unknown> = {}) {
      const response = await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) })
      return parseRpc(await response.text())
    },
  }
}

test('call pipeline preserves generated catalogue and gates synthetic/generated calls', async t => {
  await t.test('virtual registry applies allow, read-only, and toolset filters', () => {
    const tool = { name: 'registry_probe', title: 'Probe', description: 'Probe', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true }, toolset: 'composites' as const, handler: () => ({ content: [] }) }
    const unregister = registerVirtualTool(tool)
    assert.throws(() => registerVirtualTool(tool), /already registered/)
    assert.deepEqual(listVirtualTools({ allow: ['registry_probe'], readOnly: true, toolsets: ['composites'] }).map(item => item.name), ['registry_probe'])
    assert.deepEqual(listVirtualTools({ allow: ['elsewhere'] }), [])
    assert.deepEqual(listVirtualTools({ readOnly: true, toolsets: ['admin'] }), [])
    unregister()
    const replacementUnregister = registerVirtualTool({ ...tool })
    unregister()
    assert.equal(listVirtualTools().some(item => item.name === 'registry_probe'), true)
    replacementUnregister()
  })

  await t.test('MCP_TOOLS can select a registered virtual tool without enabling generated tools', async () => {
    const { spawnSync } = await import('node:child_process')
    const script = `
      const { registerVirtualTool } = await import('./build-tests/src/virtual-tools.js');
      registerVirtualTool({ name: 'only_virtual', title: 'Only virtual', description: 'test', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true }, toolset: 'composites', handler: () => ({ content: [] }) });
      const { createPolarionServer } = await import('./build-tests/src/server.js');
      createPolarionServer({ filter: { toolsets: ['composites'] } });
      console.log('virtual-enabled');
    `
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, MCP_TOOLS: 'only_virtual', MCP_READ_ONLY: 'true' }, encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /virtual-enabled/)
  })

  await t.test('default listing has the same generated names and input schemas', async () => {
    const app = await start()
    try {
      const actual = (await app.request(2, 'tools/list')).result.tools.map((tool: { name: string; inputSchema: unknown }) => ({ name: tool.name, inputSchema: tool.inputSchema }))
      const expected = [...enabledTools.values()].map(tool => ({ name: tool.name, inputSchema: sanitizeInputSchema(tool.inputSchema) })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      assert.equal(expected.length, 284)
      assert.equal(JSON.stringify(actual), JSON.stringify(expected))
    } finally { await app.stop() }
  })

  await t.test('virtual tools are listed and callable, with request toolset/read-only narrowing', async () => {
    let handlerCalls = 0
    const unregisterPing = registerVirtualTool({
      name: 'test_ping', title: 'Test ping', description: 'Test-only virtual tool',
      inputSchema: { type: 'object', properties: { echo: { type: 'string' } }, required: ['echo'] },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }, toolset: 'composites',
      handler: ({ echo }, ctx) => { handlerCalls++; assert.equal(ctx.requestBearerToken, TOKEN); return { content: [{ type: 'text', text: String(echo) }] } },
    })
    const unregisterWrite = registerVirtualTool({
      name: 'test_write', title: 'Test write', description: 'Test-only mutating virtual tool',
      inputSchema: { type: 'object' }, toolset: 'composites',
      handler: () => { handlerCalls++; return { content: [{ type: 'text', text: 'unexpected' }] } },
    })
    try {
      const app = await start({ allowedToolsets: ['composites'] }, 'composites', true)
      try {
        const listed = (await app.request(2, 'tools/list')).result.tools
        assert.deepEqual(listed.map((tool: { name: string }) => tool.name), ['test_ping'])
        assert.equal((await app.request(3, 'tools/call', { name: 'test_ping', arguments: { echo: 'ok' } })).result.content[0].text, 'ok')
        assert.equal(handlerCalls, 1)
        assert.equal((await app.request(4, 'tools/call', { name: 'test_write', arguments: {} })).result.isError, true)
        assert.ok((await app.request(5, 'tools/call', { name: 'getLicense', arguments: {} })).result.isError)
      } finally { await app.stop() }
    } finally { unregisterPing(); unregisterWrite() }
  })

  await t.test('policy denial skips the generated executor and audit stores only hashes', async () => {
    let upstreamRequests = 0
    const upstream = createHttpServer((_req, res) => { upstreamRequests++; res.end('{}') })
    await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
    const upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/polarion/rest/v1`
    const events: unknown[] = []
    const app = await start({
      apiBaseUrl: upstreamUrl,
      allowedToolsets: ['admin'],
      extensions: {
        policyHook: { beforeCall: ({ tool }) => tool === 'getLicense' ? { action: 'deny', reason: 'blocked by test policy' } : { action: 'allow' } },
        auditSink: { record: event => { events.push(event) } },
      },
    }, 'admin')
    try {
      const args = { secretLikeValue: 'do-not-store' }
      const reply = await app.request(2, 'tools/call', { name: 'getLicense', arguments: args })
      assert.equal(reply.result.isError, true)
      assert.match(reply.result.content[0].text, /blocked by test policy/)
      assert.equal(upstreamRequests, 0)
      assert.equal(events.length, 1)
      const event = events[0] as Record<string, unknown>
      assert.equal(event.argsHash, createHash('sha256').update(JSON.stringify(args)).digest('hex'))
      assert.equal(event.userIdHash, createHash('sha256').update(createHash('sha256').update(TOKEN).digest('hex').slice(0, 32)).digest('hex'))
      assert.equal(event.outcome, 'denied')
      assert.equal(JSON.stringify(event).includes('do-not-store'), false)
      assert.equal(JSON.stringify(event).includes(TOKEN), false)
    } finally {
      await app.stop()
      await new Promise<void>(resolve => upstream.close(() => resolve()))
    }
  })
})
