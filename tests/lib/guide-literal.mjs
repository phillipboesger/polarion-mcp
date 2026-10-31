// Guide-literal tests: take each local snippet from docs/clients.json, parse it the way its client
// would, start exactly the documented command/args/env and talk MCP to it against a stub Polarion.
// The only substitutions are the documented placeholders and `npx -y polarion-mcp` -> this checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export const manifest = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const setups = new Map(manifest.setups.map(setup => [setup.id, setup]));
export const PAT = 'guide-literal-pat';
export const PLACEHOLDER_URL = 'https://YOUR-POLARION/polarion/rest/v1';

const tokens = command => [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(match => match[1] ?? match[2] ?? match[3]);

/** `<tool> mcp add ... --env K=V ... [--transport stdio] polarion -- npx -y polarion-mcp` -> server entry. */
export function fromCli(text) {
  const line = text.split('\n').find(candidate => /\bmcp add\b/.test(candidate));
  const words = tokens(line);
  const env = {};
  for (let i = 0; i < words.length; i++) {
    if (words[i] === '--env' || words[i] === '-e') { const [key, ...value] = words[++i].split('='); env[key] = value.join('='); }
  }
  const dash = words.indexOf('--');
  return { command: words[dash + 1], args: words.slice(dash + 2), env };
}

export function fromToml(text) {
  const block = text.slice(text.indexOf('[mcp_servers.polarion]'));
  const command = /^command = "([^"]+)"/m.exec(block)[1];
  const args = JSON.parse(/^args = (\[.*\])/m.exec(block)[1]);
  const env = Object.fromEntries([...block.slice(block.indexOf('[mcp_servers.polarion.env]')).matchAll(/^(\w+) = "([^"]*)"/gm)].map(match => [match[1], match[2]]));
  return { command, args, env };
}

function fromPython(text) {
  const command = /"command": "([^"]+)"/.exec(text)[1];
  const args = JSON.parse(/"args": (\[[^\]]*\])/.exec(text)[1]);
  const env = Object.fromEntries([...text.slice(text.indexOf('"env"')).matchAll(/"(\w+)": "([^"]*)"/g)].map(match => [match[1], match[2]]));
  return { command, args, env };
}

/** Parses a local snippet in its client's format and returns the documented server entry. */
export function parseLocal(client) {
  const connection = client.local;
  const setup = setups.get(connection.setup);
  const snippet = connection.snippet ?? setup.snippet;
  const language = connection.language ?? setup.language;
  if (language === 'json') {
    const json = JSON.parse(snippet);
    const servers = json.mcpServers ?? json.servers;
    assert.ok(servers?.polarion, `${client.id}: no polarion entry under mcpServers/servers`);
    return servers.polarion;
  }
  if (language === 'python') return fromPython(snippet);
  if (/\bmcp add\b/.test(snippet)) return fromCli(snippet);
  throw new Error(`${client.id}: unsupported snippet format ${language}`);
}

export async function startStub(handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, authorization: req.headers.authorization });
    handler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, seen, stop: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

export const userStub = (req, res) => {
  res.setHeader('content-type', 'application/vnd.api+json');
  if (req.headers.authorization !== `Bearer ${PAT}`) { res.statusCode = 401; res.end('{"errors":[{"status":"401","title":"Unauthorized"}]}'); return; }
  res.end(JSON.stringify({ data: { type: 'users', id: 'stub-user', attributes: { name: 'Stub User' } } }));
};

export async function run(entryConfig, baseUrl, pat = PAT, entry = path.resolve('build-tests/src/index.js')) {
  assert.equal(entryConfig.command, 'npx');
  assert.deepEqual(entryConfig.args, ['-y', 'polarion-mcp']);
  assert.equal(entryConfig.env.API_BASE_URL, PLACEHOLDER_URL);
  assert.equal(entryConfig.env.BEARER_TOKEN, 'YOUR_POLARION_PAT');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-literal-'));
  const transport = new StdioClientTransport({
    command: process.execPath, args: [entry],
    env: { PATH: process.env.PATH ?? '', HOME: home, ...entryConfig.env, API_BASE_URL: baseUrl, BEARER_TOKEN: pat },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'guide-literal', version: '1' }, { capabilities: {} });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const result = await client.callTool({ name: 'getCurrentUser', arguments: {} });
    return { tools, result, text: result.content?.[0]?.text ?? '' };
  } finally {
    await client.close().catch(() => {});
    fs.rmSync(home, { recursive: true, force: true });
  }
}

