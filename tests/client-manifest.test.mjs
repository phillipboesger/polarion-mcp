import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { countDomains, domains, renderSiteClientsBlock, renderSite } from '../scripts/render-site.mjs';
import { toolDefinitionMap } from '../build-tests/src/tools.js';
import { toolsetsForDefinition } from '../build-tests/src/toolsets.js';

const data = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('docs/clients.schema.json', 'utf8'));

test('integration map covers every non-docker client and every client has an icon', () => {
  const clientIds = new Set(data.clients.map(client => client.id));
  const mapped = data.map.flatMap(node => node.clients);
  const counts = new Map(mapped.map(id => [id, 0]));
  for (const id of mapped) counts.set(id, (counts.get(id) ?? 0) + 1);
  assert.equal(data.map.length, 6);
  assert.equal(new Set(data.map.map(node => node.id)).size, 6);
  assert.equal(new Set(data.map.map(node => node.angle)).size, 6);
  for (const id of mapped) assert.ok(clientIds.has(id), `unknown map client ${id}`);
  for (const client of data.clients) {
    assert.ok(client.icon, `${client.id} is missing an icon`);
    if (client.id !== 'docker') assert.equal(counts.get(client.id), 1, `${client.id} must appear exactly once in the map`);
  }
  assert.equal(counts.get('docker') ?? 0, 0);
});

test('client manifest validates every client for local and server with a reason when unsupported', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  assert.ok(validate(data), JSON.stringify(validate.errors));
  const ids = new Set(data.clients.map(client => client.id));
  assert.equal(ids.size, data.clients.length);
  const setupIds = new Set(data.setups.map(setup => setup.id));
  assert.equal(setupIds.size, data.setups.length);
  assert.deepEqual(new Set(data.groups.flatMap(group => group.cards.flatMap(card => card.clients))), ids);
  assert.deepEqual(data.serverModes.map(mode => mode.id), ['local', 'server']);
  const used = new Set();
  for (const client of data.clients) {
    const modes = [client.local, client.server];
    assert.ok(modes.some(mode => !mode.reason), `${client.id} supports neither local nor server`);
    assert.ok(client[client.defaultMode].setup, `${client.id} default must be supported`);
    if (!client.local.reason) assert.equal(client.defaultMode, 'local', `${client.id} defaults to local when both work`);
    for (const connection of modes) {
      if (connection.reason) { assert.ok(connection.reason.trim()); continue; }
      assert.ok(setupIds.has(connection.setup), `${client.id} missing setup`);
      used.add(connection.setup);
      const setup = data.setups.find(setup => setup.id === connection.setup);
      const snippet = connection.snippet ?? setup.snippet;
      assert.ok(snippet.trim(), `${client.id} has an empty snippet`);
      if ((connection.language ?? setup.language) === 'json') assert.doesNotThrow(() => JSON.parse(snippet), client.id);
      if (connection.serverSetup) { assert.ok(setupIds.has(connection.serverSetup)); used.add(connection.serverSetup); }
    }
  }
  assert.deepEqual(used, setupIds, 'no abandoned setup definitions');
});

test('hosted connectors are server-only and generic clients cover both setups', () => {
  for (const id of ['claude-web-desktop', 'chatgpt-apps', 'claude-api', 'openai-api', 'copilot-studio']) {
    const client = data.clients.find(client => client.id === id);
    assert.equal(client.defaultMode, 'server');
    assert.ok(client.local.reason);
    assert.ok(client.server.serverSetup);
  }
  assert.equal(data.clients.find(client => client.id === 'claude-web-desktop').label, 'claude.ai');
  const other = data.clients.find(client => client.id === 'generic-stdio');
  for (const mode of ['local', 'server']) assert.ok(other[mode].setup);
  for (const id of ['claude-api', 'openai-api']) {
    const client = data.clients.find(client => client.id === id);
    const server = data.setups.find(setup => setup.id === client.server.serverSetup);
    assert.match(server.snippet, /MCP_ALLOWED_HOSTS=YOUR-SERVER/);
    assert.match(client.server.needs.join(' '), /HTTPS/);
  }
  const chatgpt = data.clients.find(client => client.id === 'chatgpt-apps');
  const server = data.setups.find(setup => setup.id === chatgpt.server.serverSetup);
  assert.match(server.snippet, /MCP_ALLOWED_REDIRECT_PREFIXES=/);
  assert.doesNotMatch(server.snippet, /MCP_ALLOWED_REDIRECT_PRESETS=claude/);
  const jetbrains = data.clients.find(client => client.id === 'jetbrains-ai');
  assert.ok(jetbrains.server.reason);
  assert.equal(jetbrains.defaultMode, 'local');
});

test('schema rejects the removed three-way connection model', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  const legacy = structuredClone(data);
  legacy.clients[0].connections = { npm: legacy.clients[0].local };
  assert.equal(validate(legacy), false);
  const noDefault = structuredClone(data);
  noDefault.clients[0].defaultMode = 'remote';
  assert.equal(validate(noDefault), false);
  const noReason = structuredClone(data);
  noReason.clients.find(client => client.local.reason).local = {};
  assert.equal(validate(noReason), false);
});

test('every client has a guide with the required sections and the site links to it once', () => {
  const html = renderSite();
  for (const client of data.clients) {
    const guide = fs.readFileSync(`docs/guides/clients/${client.id}.md`, 'utf8');
    for (const section of ['Prerequisites', 'Steps', 'Check', 'If it fails']) assert.match(guide, new RegExp(`^## ${section}$`, 'm'), `${client.id} lacks ${section}`);
    assert.equal(html.split(`docs/guides/clients/${client.id}.md`).length - 1, 1, `${client.id} must be linked exactly once`);
  }
  const block = /<!-- clients:start -->([\s\S]*?)<!-- clients:end -->/.exec(html)[1];
  assert.doesNotMatch(block, /<ol|<pre|setup-steps/);
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

test('schema rejects unsafe source URLs and the site escapes manifest content', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  for (const source of ['javascript:alert(1)', 'http://example.com', 'data:text/html,test', 'not a URL']) {
    const manifest = structuredClone(data);
    manifest.clients[0].sources[0] = source;
    assert.equal(validate(manifest), false, source);
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
