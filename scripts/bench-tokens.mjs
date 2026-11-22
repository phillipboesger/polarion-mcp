#!/usr/bin/env node
// Token benchmark for MCP_MODE=full|discover|code. Run `npm run build` first.
// Tokens are estimated as characters / 4 for everything the model reads or writes:
// the tools/list once, then every tool call (arguments) and every tool result.
// Polarion is replaced by a local stub, so the numbers compare modes, not servers.
import { createServer as createHttp } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createPolarionServer } from '../build/server.js';

const ITEMS = Array.from({ length: 100 }, (_, i) => ({
  type: 'workitems', id: `P/REQ-${i}`,
  attributes: { id: `REQ-${i}`, title: `Requirement ${i}`, status: i % 3 ? 'open' : 'approved', type: 'requirement', description: { type: 'text/html', value: `<p>${'Shall do thing. '.repeat(12)}</p>` } },
  relationships: { author: { data: { type: 'users', id: 'admin' } } },
}));
const upstream = createHttp((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.method === 'GET' && /\/workitems(\?|$)/.test(req.url)) res.end(JSON.stringify({ data: ITEMS, meta: { totalCount: 100 }, links: {} }));
  else if (req.method === 'GET') res.end(JSON.stringify({ data: [{ type: 'projects', id: 'P', attributes: { name: 'Demo' } }] }));
  else res.end(JSON.stringify({ data: { type: 'workitems', id: 'P/REQ-1' } }));
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const apiBaseUrl = `http://127.0.0.1:${upstream.address().port}`;
process.env.BEARER_TOKEN = 'bench';

const tokens = value => Math.ceil((typeof value === 'string' ? value : JSON.stringify(value)).length / 4);
const resultText = r => r.content.map(c => c.text ?? '').join('\n');

async function session(mode) {
  process.env.MCP_MODE = mode;
  const server = createPolarionServer({ apiBaseUrl, verifyWrites: false });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'bench', version: '1' });
  await server.connect(b); await client.connect(a);
  let total = tokens((await client.listTools()).tools);
  const listTokens = total;
  const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }); total += tokens({ name, args }) + tokens(resultText(r)); return r; };
  return { call, listTokens, total: () => total, close: async () => { await client.close(); await server.close(); } };
}

const quiet = fn => { const log = console.log; const err = console.error; console.log = console.error = () => {}; return fn().finally(() => { console.log = log; console.error = err; }); };

const scenarios = {
  'A: find open requirements, list id and title': {
    direct: async s => { await s.call('getWorkItems', { projectId: 'P', query: 'type:requirement AND status:open', page_size_: 100 }); },
    discover: async s => { await s.call('search_tools', { query: 'work items' }); await s.call('call_tool', { name: 'getWorkItems', arguments: { projectId: 'P', query: 'type:requirement AND status:open', page_size_: 100 } }); },
    code: async s => { await s.call('search', { query: 'work items' }); await s.call('execute', { code: "const r = await polarion.getWorkItems({ projectId: 'P', query: 'type:requirement AND status:open', page_size_: 100 }); return r.data.map(w => w.id + ' ' + w.attributes.title)" }); },
  },
  'B: set a field on 20 work items': {
    direct: async s => { await s.call('getWorkItems', { projectId: 'P', query: 'type:requirement', page_size_: 100 }); for (let i = 0; i < 20; i++) await s.call('patchWorkItem', { projectId: 'P', workItemId: `REQ-${i}`, requestBody: { data: { type: 'workitems', id: `P/REQ-${i}`, attributes: { severity: 'major' } } } }); },
    discover: async s => { await s.call('search_tools', { query: 'patch work item' }); await s.call('call_tool', { name: 'getWorkItems', arguments: { projectId: 'P', query: 'type:requirement', page_size_: 100 } }); for (let i = 0; i < 20; i++) await s.call('call_tool', { name: 'patchWorkItem', arguments: { projectId: 'P', workItemId: `REQ-${i}`, requestBody: { data: { type: 'workitems', id: `P/REQ-${i}`, attributes: { severity: 'major' } } } } }); },
    code: async s => { await s.call('search', { query: 'patch work item' }); await s.call('execute', { code: "const r = await polarion.getWorkItems({ projectId: 'P', query: 'type:requirement', page_size_: 100 }); let n = 0; for (const w of r.data.slice(0, 20)) { await polarion.patchWorkItem({ projectId: 'P', workItemId: w.attributes.id, requestBody: { data: { type: 'workitems', id: w.id, attributes: { severity: 'major' } } } }); n++; } return n" }); },
  },
  'C: count open requirements in 5 projects': {
    direct: async s => { for (let i = 0; i < 5; i++) await s.call('getWorkItems', { projectId: `P${i}`, query: 'type:requirement AND status:open', page_size_: 100 }); },
    discover: async s => { await s.call('search_tools', { query: 'work items' }); for (let i = 0; i < 5; i++) await s.call('call_tool', { name: 'getWorkItems', arguments: { projectId: `P${i}`, query: 'type:requirement AND status:open', page_size_: 100 } }); },
    code: async s => { await s.call('search', { query: 'work items' }); await s.call('execute', { code: "const out = {}; for (const p of ['P0','P1','P2','P3','P4']) { const r = await polarion.getWorkItems({ projectId: p, query: 'type:requirement AND status:open', page_size_: 100 }); out[p] = r.data.length; } return out" }); },
  },
};

const modes = [
  { label: 'full (all tools)', mode: 'full', kind: 'direct' },
  { label: 'discover', mode: 'discover', kind: 'discover' },
  { label: 'code', mode: 'code', kind: 'code' },
];
const rows = [];
await quiet(async () => {
  for (const m of modes) {
    const row = { label: m.label };
    const idle = await session(m.mode);
    row.list = idle.listTokens; await idle.close();
    for (const [name, scenario] of Object.entries(scenarios)) {
      const s = await session(m.mode);
      try { await scenario[m.kind](s); row[name] = s.total(); } catch (error) { row[name] = `error: ${error.message}`; }
      await s.close();
    }
    rows.push(row);
  }
});
upstream.close();
const names = Object.keys(scenarios);
console.log(`| Mode | tools/list | ${names.join(' | ')} |\n|---|---|${names.map(() => '---').join('|')}|`);
for (const r of rows) console.log(`| ${r.label} | ${r.list} | ${names.map(n => r[n]).join(' | ')} |`);
console.log('\nTokens estimated as characters / 4; each scenario total includes the tools/list once. Polarion is a local stub.');
process.exit(0);
