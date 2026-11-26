import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { createPolarionServer } from '../src/server.js'

process.env.MCP_MODE = 'code'
process.env.BEARER_TOKEN = 'deadline-test-token'

interface Seen { method: string; url: string }
const TIMEOUT_MS = 4000
const text = (result: any): string => result.content.map((c: any) => c.text).join('\n')

/**
 * Runs one Code Mode session against a local Polarion stub. The elicitation client answers
 * each confirmation with `respond`, which receives the prompt text and returns after its own delay.
 */
async function withDeadlineSession(
  respond: (message: string) => Promise<'accept' | 'decline'>,
  run: (client: Client, seen: Seen[]) => Promise<void>,
  getDelayMs = 0,
): Promise<void> {
  const seen: Seen[] = []
  const upstream = createHttpServer((req, res) => {
    seen.push({ method: req.method ?? '', url: req.url ?? '' })
    req.resume()
    req.on('end', () => setTimeout(() => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ data: req.url?.includes('getAvailableOptions')
        ? [{ id: 'major', name: 'Major' }]
        : [{ type: 'workitems', id: 'P/A-1', attributes: { title: 'x' } }] }))
    }, req.method === 'GET' ? getDelayMs : 0))
  })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const server = createPolarionServer({
    apiBaseUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    confirmDestructive: true,
    codeModeLimits: { timeoutMs: TIMEOUT_MS },
  })
  const client = new Client({ name: 'deadline-test', version: '1' }, { capabilities: { elicitation: { form: {} } } })
  client.setRequestHandler(ElicitRequestSchema, async request => {
    const action = await respond(request.params.message)
    return { action, content: action === 'accept' ? { confirm: true } : undefined }
  })
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await server.connect(serverSide)
  await client.connect(clientSide)
  try {
    await run(client, seen)
  } finally {
    await client.close()
    await server.close()
    await new Promise<void>(resolve => upstream.close(() => resolve()))
  }
}

const deletes = (seen: Seen[]): number => seen.filter(s => s.method === 'DELETE').length
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
const DELETE_SCRIPT = 'return await polarion.deleteWorkItems({ projectId: "P", requestBody: { data: [{ type: "workitems", id: "P/A-1" }] } })'

test('confirmation accepted after the execute deadline sends nothing', async () => {
  let prompts = 0
  const respond = async (message: string): Promise<'accept' | 'decline'> => {
    if (!message.includes('action: deleteWorkItems')) return 'accept'
    prompts += 1
    await sleep(TIMEOUT_MS + 500)
    return 'accept'
  }
  await withDeadlineSession(respond, async (client, seen) => {
    const result = await client.callTool({ name: 'execute', arguments: { code: DELETE_SCRIPT } })
    assert.equal(result.isError, true)
    assert.match(text(result), /timed out|nothing was sent/i)
    await sleep(700)
    assert.equal(prompts, 1, 'the delete raised exactly one confirmation prompt')
    assert.equal(deletes(seen), 0, 'no DELETE reaches the stub after the deadline')
  })
})

test('confirmation accepted before the execute deadline sends exactly one DELETE', async () => {
  const respond = async (): Promise<'accept' | 'decline'> => 'accept'
  await withDeadlineSession(respond, async (client, seen) => {
    const result = await client.callTool({ name: 'execute', arguments: { code: DELETE_SCRIPT } })
    assert.equal(result.isError, undefined, text(result))
    assert.equal(deletes(seen), 1)
  })
})

const PATCH_SCRIPT = 'return await polarion.patchAllWorkItems({ requestBody: { data: [{ type: "workitems", id: "P/A-1", attributes: { severity: "major" } }] } })'
const writes = (seen: Seen[]): number => seen.filter(s => s.method !== 'GET').length

test('a call confirmed in time is not sent when checks before the send outlast the script', async () => {
  const getDelayMs = TIMEOUT_MS + 1500
  await withDeadlineSession(async () => 'accept', async (client, seen) => {
    const result = await client.callTool({ name: 'execute', arguments: { code: PATCH_SCRIPT } })
    assert.equal(result.isError, true, text(result))
    await sleep(getDelayMs)
    assert.ok(seen.some(s => s.method === 'GET'), 'the slow pre-write check ran')
    assert.equal(writes(seen), 0, 'no write reaches the stub after the script ended')
  }, getDelayMs)
})

test('a prompt left open by an ended script no longer authorizes the call', async () => {
  const respond = async (message: string): Promise<'accept' | 'decline'> => {
    if (message.includes('action: deleteWorkItems')) await sleep(1000)
    return 'accept'
  }
  await withDeadlineSession(respond, async (client, seen) => {
    const code = DELETE_SCRIPT.replace('return await ', '') + '; throw new Error("script gave up")'
    const result = await client.callTool({ name: 'execute', arguments: { code } })
    assert.match(text(result), /script gave up/)
    assert.match(text(result), /"not_sent_calls":1/)
    await sleep(1700)
    assert.equal(writes(seen), 0, 'accepting after the script ended sends nothing')
  })
})

test('an un-awaited call that is held back makes execute report an error', async () => {
  const respond = async (message: string): Promise<'accept' | 'decline'> => {
    if (message.includes('action: deleteWorkItems')) await sleep(1000)
    return 'accept'
  }
  await withDeadlineSession(respond, async (client, seen) => {
    const result = await client.callTool({ name: 'execute', arguments: { code: `${DELETE_SCRIPT.replace('return await ', '')}; return "deleted"` } })
    assert.equal(result.isError, true, text(result))
    assert.match(text(result), /"not_sent_calls":1/)
    assert.equal(writes(seen), 0)
  })
})
