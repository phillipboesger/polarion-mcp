import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { countDomains, domains, renderSiteClientsBlock, renderSite } from '../scripts/render-site.mjs';
import { toolDefinitionMap } from '../build-tests/src/tools.js';
import { toolsetsForDefinition } from '../build-tests/src/toolsets.js';

const data = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('docs/clients.schema.json', 'utf8'));

test('client manifest validates every supported server choice and disabled reason', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  assert.ok(validate(data), JSON.stringify(validate.errors));
  const ids = new Set(data.clients.map(client => client.id));
  assert.equal(ids.size, data.clients.length);
  const setupIds = new Set(data.setups.map(setup => setup.id));
  assert.equal(setupIds.size, data.setups.length);
  assert.deepEqual(new Set(data.groups.flatMap(group => group.cards.flatMap(card => card.clients))), ids);
  assert.deepEqual(data.serverModes.map(mode => mode.id), ['npm', 'docker', 'remote']);
  for (const row of data.readmeGroups) assert.ok(ids.has(row.client));
  const used = new Set(data.clients.map(client => client.setup));
  for (const client of data.clients) {
    assert.ok(client.connections[client.defaultMode].setup, `${client.id} default must be supported`);
    for (const connection of Object.values(client.connections)) {
      if (connection.reason) { assert.ok(connection.reason.trim()); continue; }
      assert.ok(setupIds.has(connection.setup), `${client.id} missing setup`);
      used.add(connection.setup);
      const setup = data.setups.find(setup => setup.id === connection.setup);
      const snippet = connection.snippet ?? setup.snippet;
      assert.ok(snippet.trim(), `${client.id} has an empty snippet`);
      if (setup.language === 'json') assert.doesNotThrow(() => JSON.parse(snippet), client.id);
      if (connection.serverSetup) { assert.ok(setupIds.has(connection.serverSetup)); used.add(connection.serverSetup); }
    }
  }
  assert.deepEqual(used, setupIds, 'no abandoned setup definitions');
});

test('hosted connectors require a network server and generic provider covers all three paths', () => {
  for (const id of ['claude-web-desktop', 'chatgpt-apps', 'claude-api', 'openai-api', 'copilot-studio']) {
    const client = data.clients.find(client => client.id === id);
    assert.equal(client.defaultMode, 'remote');
    assert.ok(client.connections.npm.reason);
    assert.ok(client.connections.docker.serverSetup);
    assert.ok(client.connections.remote.setup);
  }
  assert.equal(data.clients.find(client => client.id === 'claude-web-desktop').label, 'claude.ai');
  const other = data.clients.find(client => client.id === 'generic-stdio');
  for (const mode of ['npm', 'docker', 'remote']) assert.ok(other.connections[mode].setup);
  for (const id of ['claude-api', 'openai-api']) {
    const client = data.clients.find(client => client.id === id);
    const server = data.setups.find(setup => setup.id === client.connections.docker.serverSetup);
    assert.match(server.snippet, /MCP_ALLOWED_HOSTS=YOUR-SERVER/);
    assert.match(client.connections.docker.steps[0], /public HTTPS/);
  }
  const chatgpt = data.clients.find(client => client.id === 'chatgpt-apps');
  const server = data.setups.find(setup => setup.id === chatgpt.connections.docker.serverSetup);
  assert.match(server.snippet, /MCP_ALLOWED_REDIRECT_PREFIXES=/);
  assert.doesNotMatch(server.snippet, /MCP_ALLOWED_REDIRECT_PRESETS=claude/);
  const jetbrains = data.clients.find(client => client.id === 'jetbrains-ai');
  assert.match(jetbrains.connections.docker.description, /Local container.*stdio/);
  const cline = data.clients.find(client => client.id === 'cline');
  assert.equal(JSON.parse(cline.connections.remote.snippet).mcpServers.polarion.type, 'streamableHttp');
});

test('domain counts cover every generated tool once and match runtime toolset classification', () => {
  const source = fs.readFileSync('src/tools.ts', 'utf8');
  const result = countDomains(source);
  assert.equal(result.total, toolDefinitionMap.size);
  const merged = { collections: 'plans', users: 'projects', jobs: 'admin' };
  const expected = Object.fromEntries(domains.map(domain => [domain.id, 0]));
  for (const definition of toolDefinitionMap.values()) {
    const key = toolsetsForDefinition(definition)[0];
    expected[merged[key] || key]++;
    const segments = definition.pathTemplate.toLowerCase().split('/').filter(Boolean);
    const classified = domains.find(domain => domain.segments.some(segment => segments.includes(segment)));
    assert.equal(classified.id, merged[key] || key, definition.name);
  }
  assert.deepEqual(result.counts, expected);
  assert.equal(Object.values(result.counts).reduce((sum, n) => sum + n, 0), result.total);
  assert.throws(() => countDomains('no tool definitions'), /derive/);
  assert.throws(() => countDomains('["unknown", {\npathTemplate: "/unknown"'), /Unclassified/);
});

test('daily scenarios cite actual tools and preview only mutating operations', () => {
  const scenarios = JSON.parse(fs.readFileSync('docs/daily-use.json', 'utf8'));
  assert.equal(scenarios.length, 5);
  for (const scenario of scenarios) {
    assert.ok(scenario.prompt && scenario.result && scenario.guard);
    for (const call of scenario.calls) {
      const definition = toolDefinitionMap.get(call.tool);
      assert.ok(definition, `unknown scenario tool ${call.tool}`);
      if (call.detail.includes('dry_run')) assert.ok(definition.inputSchema.properties.dry_run, call.tool);
    }
  }
  assert.equal(fs.readFileSync('docs/index.html', 'utf8'), renderSite());
});

test('renderer rejects unsafe source URLs and escapes manifest content', () => {
  for (const source of ['javascript:alert(1)', 'http://example.com', 'data:text/html,test', 'not a URL']) {
    const manifest = structuredClone(data);
    manifest.clients[0].sources[0] = source;
    assert.throws(() => renderSiteClientsBlock(manifest));
  }
  const manifest = structuredClone(data);
  manifest.clients[0].name = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(renderSiteClientsBlock(manifest), /<img src=x/);
});

test('HTML references resolve and the landing page keeps essential content inline', () => {
  const html = fs.readFileSync('docs/index.html', 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const url = match[1];
    if (/^(https:|data:)/.test(url)) continue;
    assert.doesNotMatch(url, /^https?:/);
    const target = `docs/${url.split(/[?#]/)[0]}`;
    const exists = fs.existsSync(target) || (target.endsWith('.html') && fs.existsSync(target.replace(/\.html$/, '.md')));
    assert.ok(exists, `missing website reference ${url}`);
  }
  assert.doesNotMatch(html, /(?:\bverified\b|unverified|client-status)/i);
  assert.doesNotMatch(fs.readFileSync('README.md', 'utf8'), /unverified/i);
  assert.doesNotMatch(html, /—/);
  assert.doesNotMatch(html, /github\.com[^"\s]+\/discussions/);
});
