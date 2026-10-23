import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
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
    await client.close(); await server.close()
    const [readonlyClientSide, readonlyServerSide] = InMemoryTransport.createLinkedPair()
    const readonlyServer = createPolarionServer({ filter: { readOnly: true } })
    const readonlyClient = new Client({ name: 'test', version: '1' })
    await readonlyServer.connect(readonlyServerSide); await readonlyClient.connect(readonlyClientSide)
    const hidden = await readonlyClient.callTool({ name: 'call_tool', arguments: { name: 'postWorkItems', arguments: {} } })
    assert.equal(hidden.isError, true)
    await readonlyClient.close(); await readonlyServer.close()
  } finally {
    await client.close(); await server.close()
    if (oldMode === undefined) delete process.env.MCP_MODE; else process.env.MCP_MODE = oldMode
  }
})

test('call_tool returns the same tool result as a direct full-mode call', async () => {
  const upstream = createHttpServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data: [{ type: 'projects', id: 'P', attributes: { name: 'Demo' } }] })) })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const apiBaseUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`
  const call = async (mode: string, name: string, args: Record<string, unknown>) => {
    process.env.MCP_MODE = mode
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    const server = createPolarionServer({ apiBaseUrl })
    const client = new Client({ name: 'test', version: '1' })
    await server.connect(serverSide); await client.connect(clientSide)
    try { return await client.callTool({ name: mode === 'discover' ? 'call_tool' : name, arguments: mode === 'discover' ? { name, arguments: args } : args }) }
    finally { await client.close(); await server.close() }
  }
  const previous = process.env.MCP_MODE
  try {
    assert.deepEqual(await call('full', 'getProjects', {}), await call('discover', 'getProjects', {}))
  } finally {
    if (previous === undefined) delete process.env.MCP_MODE; else process.env.MCP_MODE = previous
    await new Promise<void>(resolve => upstream.close(() => resolve()))
  }
})
