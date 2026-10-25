import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { createServer as createHttpServer } from 'node:http'
import { createMcpHttpApp } from '../src/mcp-http-server.js'
import { listVirtualTools, registerVirtualTool } from '../src/virtual-tools.js'
import { enabledTools } from '../src/tool-filter.js'
import { sanitizeInputSchema } from '../src/utils.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createPolarionServer } from '../src/server.js'
import { DEFAULT_MAX_RESPONSE_CHARS } from '../src/executor.js'
import { COMPOSITE_TOOLS } from '../src/composite-tools.js'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const TOKEN = 'request-secret-token'
const HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
const INIT = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }

function parseRpc(body: string): any {
  const line = body.split('\n').find(value => value.startsWith('data:'))
  return JSON.parse(line ? line.slice(5).trim() : body)
}

async function start(options: Parameters<typeof createMcpHttpApp>[0] = {}, toolsets?: string, readOnly = false) {
  const { app, closeAllSessions } = createMcpHttpApp({ validateToken: async () => true, ...options })
  const server = app.listen(0, "127.0.0.1")
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
      const expected = [
        ...[...enabledTools.values()].map(tool => ({ name: tool.name, inputSchema: sanitizeInputSchema(tool.inputSchema) })),
        ...COMPOSITE_TOOLS.map(tool => ({ name: tool.name, inputSchema: tool.inputSchema })),
      ].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      assert.equal(expected.length, enabledTools.size + COMPOSITE_TOOLS.length)
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
        const names = listed.map((tool: { name: string }) => tool.name)
        assert.ok(names.includes('test_ping'))
        assert.ok(names.includes('trace_links'))
        assert.ok(!names.includes('test_write'))
        assert.equal((await app.request(3, 'tools/call', { name: 'test_ping', arguments: { echo: 'ok' } })).result.content[0].text, 'ok')
        assert.equal(handlerCalls, 1)
        assert.equal((await app.request(4, 'tools/call', { name: 'test_write', arguments: {} })).result.isError, true)
        assert.ok((await app.request(5, 'tools/call', { name: 'getLicense', arguments: {} })).result.isError)
      } finally { await app.stop() }
    } finally { unregisterPing(); unregisterWrite() }
  })

  await t.test('virtual tool text is capped at the response limit before it reaches the client', async () => {
    const unregister = registerVirtualTool({
      name: 'test_oversized', title: 'Test oversized', description: 'Test-only virtual tool with a large text result',
      inputSchema: { type: 'object' }, annotations: { readOnlyHint: true }, toolset: 'composites',
      handler: () => ({ content: [{ type: 'text', text: 'z'.repeat(300_000) }] }),
    })
    try {
      const app = await start({ allowedToolsets: ['composites'] }, 'composites', true)
      try {
        const text = (await app.request(6, 'tools/call', { name: 'test_oversized', arguments: {} })).result.content[0].text
        assert.ok(text.length <= DEFAULT_MAX_RESPONSE_CHARS, `virtual result was ${text.length} characters`)
        assert.equal(JSON.parse(text).truncated, true)
      } finally { await app.stop() }
    } finally { unregister() }
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

test('progress notifications reach an SDK client only when the request sends a progress token', async t => {
  const unregister = registerVirtualTool({
    name: 'progress_probe', title: 'Progress probe', description: 'Test progress forwarding',
    inputSchema: { type: 'object' }, annotations: { readOnlyHint: true }, toolset: 'composites',
    handler: async (_args, ctx) => {
      await ctx.reportProgress({ progress: 1, total: 2, message: 'working' })
      return { content: [{ type: 'text', text: 'done' }] }
    },
  })
  const server = createPolarionServer({ filter: { toolsets: ['composites'] } })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'progress-test', version: '1' })
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  try {
    await t.test('token receives progress notification', async () => {
      const received: unknown[] = []
      await client.callTool({ name: 'progress_probe', arguments: {}, _meta: { progressToken: 'progress-1' } }, undefined, { onprogress: progress => received.push(progress) })
      assert.equal(received.length, 1)
      assert.equal((received[0] as { message?: string }).message, 'working')
    })
    await t.test('missing token emits no progress notification', async () => {
      const received: unknown[] = []
      const { ProgressNotificationSchema } = await import('@modelcontextprotocol/sdk/types.js')
      client.setNotificationHandler(ProgressNotificationSchema, notification => { received.push(notification.params) })
      await client.callTool({ name: 'progress_probe', arguments: {} })
      assert.equal(received.length, 0)
    })
  } finally {
    await client.close()
    unregister()
  }
})

test('composite previews and invalid inputs make no upstream writes; explicit job and upload execute once', async () => {
  const previousToken = process.env.BEARER_TOKEN
  const previousRoots = process.env.MCP_UPLOAD_ROOTS
  const dir = await mkdtemp(path.join(tmpdir(), 'polarion-composite-pipeline-'))
  const file = path.join(dir, 'proof.txt')
  await writeFile(file, 'upload-body')
  process.env.BEARER_TOKEN = TOKEN
  process.env.MCP_UPLOAD_ROOTS = dir
  const writes: Record<string, number> = { job: 0, upload: 0 }
  let uploadRequestBody = ''
  const upstream = createHttpServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString()
      if (req.method === 'POST' && req.url === '/polarion/rest/v1/jobs/actions/execute') {
        writes.job++
        res.writeHead(202, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ data: { type: 'jobs', id: 'job-1', attributes: { state: 'RUNNING' } } }))
      } else if (req.method === 'POST' && req.url?.endsWith('/polarion/rest/v1/projects/P/workitems/WI-1/attachments')) {
        writes.upload++
        uploadRequestBody = body
        res.writeHead(201, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ data: [{ type: 'workitem_attachments', id: 'P/WI-1/proof.txt' }] }))
      } else if (req.method === 'GET' && req.url === '/polarion/rest/v1/jobs/job-1') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ data: { type: 'jobs', id: 'job-1', attributes: { state: 'FINISHED', status: { type: 'OK' } } } }))
      } else if (req.method === 'GET' && req.url === '/polarion/rest/v1/jobs/job-1/log/content') {
        res.writeHead(200, { 'content-type': 'text/plain' }); res.end('complete')
      } else {
        res.writeHead(404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ errors: [{ detail: `${req.method} ${req.url}` }] }))
      }
    })
  })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/polarion/rest/v1`
  const server = createPolarionServer({ apiBaseUrl: base, filter: { toolsets: ['composites'] }, transport: 'stdio' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'composite-pipeline-test', version: '1' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  try {
    for (const flag of [true, 'true']) {
      const preview = await client.callTool({ name: 'run_job_and_wait', arguments: { requestBody: { jobId: 'jobs.dummy' }, dry_run: flag } })
      assert.equal(preview.isError, undefined)
    }
    const invalidFlag = await client.callTool({ name: 'run_job_and_wait', arguments: { requestBody: { jobId: 'jobs.dummy' }, dry_run: 'yes' } })
    assert.equal(invalidFlag.isError, true)
    const missingJobArgs = await client.callTool({ name: 'run_job_and_wait', arguments: {} })
    assert.equal(missingJobArgs.isError, true)
    const missingNestedJobArgs = await client.callTool({ name: 'run_job_and_wait', arguments: { requestBody: {} } })
    assert.equal(missingNestedJobArgs.isError, true)
    const unknownJobArgs = await client.callTool({ name: 'run_job_and_wait', arguments: { requestBodi: { jobId: 'jobs.dummy' } } })
    assert.equal(unknownJobArgs.isError, true)
    assert.equal(writes.job, 0)

    const run = await client.callTool({ name: 'run_job_and_wait', arguments: { requestBody: { jobId: 'jobs.dummy' } } })
    assert.equal(run.isError, undefined)
    assert.equal(writes.job, 1)

    for (const flag of [true, 'true']) {
      const uploadPreview = await client.callTool({ name: 'upload_attachment', arguments: { target: { type: 'work_item', projectId: 'P', id: 'WI-1' }, filePath: file, dry_run: flag } })
      assert.equal(uploadPreview.isError, undefined)
    }
    const invalidUpload = await client.callTool({ name: 'upload_attachment', arguments: { target: { type: 'work_item', projectId: 'P', id: 'WI-1' }, filePath: file, dry_run: 'maybe' } })
    assert.equal(invalidUpload.isError, true)
    const missingUploadTarget = await client.callTool({ name: 'upload_attachment', arguments: { filePath: file } })
    assert.equal(missingUploadTarget.isError, true)
    assert.equal(writes.upload, 0)

    const uploaded = await client.callTool({ name: 'upload_attachment', arguments: { target: { type: 'work_item', projectId: 'P', id: 'WI-1' }, filePath: file } })
    assert.equal(uploaded.isError, undefined)
    assert.equal(writes.upload, 1)
    assert.match(uploadRequestBody, /upload-body/)
    assert.match(uploadRequestBody, /proof\.txt/)
  } finally {
    await Promise.all([client.close(), server.close()])
    await new Promise<void>(resolve => upstream.close(() => resolve()))
    await rm(dir, { recursive: true, force: true })
    if (previousToken === undefined) delete process.env.BEARER_TOKEN; else process.env.BEARER_TOKEN = previousToken
    if (previousRoots === undefined) delete process.env.MCP_UPLOAD_ROOTS; else process.env.MCP_UPLOAD_ROOTS = previousRoots
  }
})
