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

const connections = data.clients.flatMap(client => ['local', 'server'].filter(mode => !client[mode].reason).map(mode => ({ client, mode, connection: client[mode] })));
const clientById = id => data.clients.find(client => client.id === id);

test('K1: prompts that ask for getCurrentUser expect the user, not projects', () => {
  for (const { client, mode, connection } of connections) {
    if (!connection.verify.prompt.includes('getCurrentUser')) continue;
    assert.match(connection.verify.expect, /user/i, `${client.id}/${mode}`);
    assert.doesNotMatch(connection.verify.expect, /project/i, `${client.id}/${mode}`);
  }
});

test('K10: every supported mode has steps, a prerequisite server, a check and failure fixes including 401', () => {
  for (const { client, mode, connection } of connections) {
    assert.ok(connection.steps.length >= 2, `${client.id}/${mode} steps`);
    assert.ok(connection.verify.prompt && connection.verify.expect, `${client.id}/${mode} verify`);
    assert.ok(connection.fails.length >= 2, `${client.id}/${mode} needs at least two failure fixes`);
    assert.ok(connection.fails.some(fail => /401/.test(fail.symptom)), `${client.id}/${mode} needs a 401 fix`);
    if (mode === 'server' && !connection.verify.prompt.startsWith('curl') && !['n8n', 'rest-wrapper', 'docker'].includes(client.id)) {
      assert.ok(connection.serverSetup, `${client.id}/${mode} must show the server it needs`);
    }
  }
});

test('K2: every server example uses a known redirect preset and the image tag of this release', () => {
  const presets = new Set(['claude', 'chatgpt', 'vscode', 'cursor', 'copilot-studio', 'gemini', 'm365', 'mistral', 'loopback']);
  const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  for (const setup of data.setups) {
    for (const [, value] of setup.snippet.matchAll(/MCP_ALLOWED_REDIRECT_PRESETS=([\w,-]+)/g)) {
      for (const preset of value.split(',')) assert.ok(presets.has(preset), `${setup.id}: unknown preset ${preset}`);
    }
    for (const [, tag] of setup.snippet.matchAll(/ghcr\.io\/phillipboesger\/polarion-mcp:([\w.-]+)/g)) assert.equal(tag, version, `${setup.id} image tag`);
  }
});

test('K3: Microsoft 365 Copilot sits under Microsoft, is server only and uses the m365 preset', () => {
  const client = clientById('m365-copilot');
  const microsoft = data.groups[0].cards.find(card => card.id === 'microsoft');
  assert.ok(microsoft.clients.includes('m365-copilot'));
  assert.ok(client.local.reason);
  assert.match(data.setups.find(setup => setup.id === client.server.serverSetup).snippet, /MCP_ALLOWED_REDIRECT_PRESETS=m365/);
  assert.deepEqual(client.redirectUris.map(entry => entry.uri), ['https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect']);
});

test('K4/K5: self-hosted models and Mistral Le Chat have their own entries', () => {
  const selfHosted = clientById('self-hosted');
  assert.match(selfHosted.note, /not MCP clients/);
  assert.match(selfHosted.note, /tool calling/);
  assert.ok(selfHosted.server.alternative.snippet.includes('streamable-http'));
  assert.ok(data.groups[0].cards.find(card => card.id === 'mistral').clients.includes('mistral-le-chat'));
  assert.doesNotMatch(data.setups.find(setup => setup.id === clientById('mistral-le-chat').server.serverSetup).snippet, /PRESETS=mistral/, 'no undocumented callback may be presented as a preset');
});

test('K6: GitHub Copilot covers four IDEs with one shared snippet and keeps the old guide', () => {
  const copilot = clientById('github-copilot');
  assert.deepEqual(copilot.variants.map(variant => variant.id), ['vscode', 'eclipse', 'jetbrains', 'visual-studio']);
  for (const variant of copilot.variants) assert.ok(variant.minVersion && variant.openSteps.length, variant.id);
  assert.deepEqual(copilot.legacyIds, ['vscode-copilot']);
  assert.match(fs.readFileSync('docs/guides/clients/vscode-copilot.md', 'utf8'), /github-copilot\.md/);
  assert.match(copilot.note, /MCP servers in Copilot/);
  assert.equal(clientById('vscode-copilot'), undefined);
});

test('K7: Antigravity uses serverUrl for remote servers and keeps the Gemini CLI link', () => {
  const agy = clientById('antigravity');
  const remote = data.setups.find(setup => setup.id === agy.server.setup).snippet;
  assert.doesNotThrow(() => JSON.parse(remote));
  assert.ok(JSON.parse(remote).mcpServers.polarion.serverUrl);
  assert.doesNotMatch(remote, /httpUrl|"url"/);
  assert.deepEqual(agy.legacyIds, ['gemini-cli']);
  assert.match(fs.readFileSync('docs/guides/clients/gemini-cli.md', 'utf8'), /antigravity\.md/);
});

test('K12: FAQ entries are short, have ids and cover the required topics', () => {
  const entries = [...data.faq, ...data.faqMore];
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  for (const entry of entries) assert.ok(entry.q.length + entry.a.length <= 500, `${entry.id} is ${entry.q.length + entry.a.length} characters`);
  const required = ['rest-disabled-404', 'request-rejected-400', 'tool-limit', 'org-mcp-policy', 'corporate-proxy', 'pat-disabled-or-expired', 'self-hosted-no-tool-calls', 'pat-401', 'forbidden-403', 'unreachable-503', 'rate-limit-429', 'oauth-loop'];
  for (const id of required) assert.ok(entries.some(entry => entry.id === id), `missing FAQ ${id}`);
});

test('K13: manifest and generated guides contain no em dashes or stock AI words', () => {
  const stock = /\b(delve|tapestry|testament|seamless(ly)?|leverag(e|es|ing)|unlock(s|ing)?|pivotal|elevate|game-chang\w+)\b/i;
  const files = ['docs/clients.json', 'docs/clients.md', 'docs/guides/local-npm.md', 'docs/guides/server-docker.md', ...fs.readdirSync('docs/guides/clients').map(file => `docs/guides/clients/${file}`)];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes('—'), `${file} contains an em dash`);
    assert.doesNotMatch(text, stock, file);
  }
});
