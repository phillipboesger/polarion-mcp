import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js'

// The tool filter reads its switches at import time, so every setup runs this file again in its own process.
const SCENARIO = process.env.READ_ONLY_SCENARIO

const ARGS = { projectId: 'P', requestBody: { data: [{ type: 'workitems', id: 'P/A-1', attributes: { title: 'x' } }] } }
const SCRIPT = `await polarion.getWorkItem({ projectId: "P", workItemId: "A-1" })
return await polarion.patchWorkItems(${JSON.stringify(ARGS)})`

const SETUPS: Record<string, Record<string, string>> = {
  'MCP_READ_ONLY=true': { MCP_READ_ONLY: 'true', MCP_PROFILE: '' },
  'MCP_PROFILE=readonly': { MCP_PROFILE: 'readonly', MCP_READ_ONLY: '' },
}

async function checkWritesAreBlocked(mode: 'full' | 'code'): Promise<void> {
  process.env.MCP_MODE = mode
  const { createPolarionServer } = await import('../src/server.js')
  const methods: string[] = []
  const upstream = createHttpServer((req, res) => {
    methods.push(req.method ?? '')
    req.resume()
    req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ data: { type: 'workitems', id: 'P/A-1', attributes: { title: 'x' } } }))
    })
  })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const server = createPolarionServer({
    apiBaseUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    confirmDestructive: true,
  })
  const client = new Client({ name: 'read-only-test', version: '1' }, { capabilities: { elicitation: { form: {} } } })
  const prompts: string[] = []
  client.setRequestHandler(ElicitRequestSchema, async request => {
    prompts.push(request.params.message)
    return { action: 'accept', content: { confirm: true } }
  })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await server.connect(serverSide)
  await client.connect(clientSide)
  try {
    const result: any = mode === 'full'
      ? await client.callTool({ name: 'patchWorkItems', arguments: ARGS })
      : await client.callTool({ name: 'execute', arguments: { code: SCRIPT } })
    if (mode === 'full') {
      const hidden: any = await client.callTool({ name: 'deleteWorkItems', arguments: { projectId: 'P', requestBody: ARGS.requestBody } })
      assert.match(JSON.stringify(hidden.content), /Unknown tool/)
    }
    assert.equal(result.isError, true, JSON.stringify(result.content))
    assert.match(JSON.stringify(result.content), mode === 'full' ? /Unknown tool/ : /patchWorkItems|not a function/)
    assert.deepEqual(methods.filter(method => method !== 'GET'), [], 'no write reaches Polarion')
    if (mode === 'code') assert.ok(methods.includes('GET'), 'reads still work inside execute')
    assert.deepEqual(prompts, [], 'read-only never asks for confirmation')
  } finally {
    await client.close()
    await server.close()
    await new Promise<void>(resolve => upstream.close(() => resolve()))
  }
}

if (SCENARIO) {
  test(SCENARIO, () => checkWritesAreBlocked(SCENARIO as 'full' | 'code'))
} else {
  for (const [setup, env] of Object.entries(SETUPS)) {
    for (const mode of ['full', 'code']) {
      test(`${setup} blocks bulk writes in ${mode} mode`, () => {
        const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env, READ_ONLY_SCENARIO: mode, BEARER_TOKEN: 'read-only-test-token' }
        delete childEnv.NODE_TEST_CONTEXT
        const child = spawnSync(process.execPath, ['--test-reporter=tap', selfPath()], { env: childEnv, encoding: 'utf8', timeout: 30_000 })
        assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
        assert.match(child.stdout, /# pass 1\b/)
      })
    }
  }
}

function selfPath(): string {
  return fileURLToPath(import.meta.url)
}
