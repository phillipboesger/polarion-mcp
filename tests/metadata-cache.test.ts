import test from 'node:test'
import assert from 'node:assert/strict'
import { MetadataCache } from '../src/metadata-cache.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createPolarionServer } from '../src/server.js'

test('metadata cache expires entries using its injected clock', () => {
  let now = 10
  const cache = new MetadataCache({ ttlMs: 5, now: () => now })
  cache.set('deployment', 'user', 'projects', ['P'])
  assert.deepEqual(cache.get('deployment', 'user', 'projects'), ['P'])
  now = 15
  assert.equal(cache.get('deployment', 'user', 'projects'), undefined)
})

test('completion capability is opt-in and unknown fields return empty suggestions', async () => {
  const previous = process.env.MCP_COMPLETIONS
  process.env.MCP_COMPLETIONS = 'true'
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  const server = createPolarionServer()
  const client = new Client({ name: 'test', version: '1' })
  try {
    await server.connect(serverSide); await client.connect(clientSide)
    const reply = await client.complete({ ref: { type: 'ref/prompt', name: 'search-work-items' }, argument: { name: 'other', value: '' } })
    assert.deepEqual(reply.completion.values, [])
  } finally {
    await client.close(); await server.close()
    if (previous === undefined) delete process.env.MCP_COMPLETIONS; else process.env.MCP_COMPLETIONS = previous
  }
})

test('metadata cache scopes users, deployments, and evicts least recently used entries', () => {
  const cache = new MetadataCache({ maxEntries: 2 })
  cache.set('d', 'alice', 'projects', ['A'])
  cache.set('d', 'bob', 'projects', ['B'])
  assert.deepEqual(cache.get('d', 'alice', 'projects'), ['A'])
  assert.equal(cache.get('other-deployment', 'alice', 'projects'), undefined)
  cache.set('d', 'alice', 'statuses', ['open'])
  assert.equal(cache.get('d', 'bob', 'projects'), undefined)
  const copy = cache.get('d', 'alice', 'projects')!
  copy.push('leak')
  assert.deepEqual(cache.get('d', 'alice', 'projects'), ['A'])
})

test('metadata cache separates enum options by field and work item type', () => {
  const cache = new MetadataCache()
  cache.set('d', 'alice', 'statuses', ['open'], 'P', 'status', 'bug')
  cache.set('d', 'alice', 'statuses', ['draft'], 'P', 'status', 'requirement')
  assert.deepEqual(cache.get('d', 'alice', 'statuses', 'P', 'status', 'bug'), ['open'])
  assert.deepEqual(cache.get('d', 'alice', 'statuses', 'P', 'status', 'requirement'), ['draft'])
})
