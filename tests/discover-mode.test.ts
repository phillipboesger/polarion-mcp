import test from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createPolarionServer } from '../src/server.js'

test('discover mode exposes three tools and ranks work item search', async () => {
  const oldMode = process.env.MCP_MODE
  process.env.MCP_MODE = 'discover'
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createPolarionServer()
  const client = new Client({ name: 'test', version: '1' })
  try {
    await server.connect(serverTransport); await client.connect(clientTransport)
    const listed = await client.listTools()
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), ['call_tool', 'describe_tool', 'search_tools'])
    const found = await client.callTool({ name: 'search_tools', arguments: { query: 'list work items' } })
    assert.match(JSON.stringify(found), /getWorkItems/)
  } finally {
    await client.close(); await server.close()
    if (oldMode === undefined) delete process.env.MCP_MODE; else process.env.MCP_MODE = oldMode
  }
})
