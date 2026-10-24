import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const data = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('docs/clients.schema.json', 'utf8'));

test('client manifest conforms to its schema and all grouped references resolve', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  assert.ok(validate(data), JSON.stringify(validate.errors));
  const ids = new Set(data.clients.map(client => client.id));
  assert.equal(ids.size, data.clients.length, 'client ids must be unique');
  const setupIds = new Set(data.setups.map(setup => setup.id));
  assert.equal(setupIds.size, data.setups.length, 'setup ids must be unique');
  const shown = new Set(data.groups.flatMap(group => group.cards.flatMap(card => card.clients)));
  assert.deepEqual(shown, ids, 'all clients must be reachable in grouped cards');
  for (const row of data.readmeGroups) assert.ok(ids.has(row.client));
  for (const client of data.clients) {
    assert.ok(setupIds.has(client.setup), `${client.id} references a missing setup`);
    const setup = data.setups.find(setup => setup.id === client.setup);
    const snippet = client.snippet ?? setup.snippet;
    assert.ok(snippet.trim(), `${client.id} has an empty snippet`);
    if (setup.language === 'json') assert.doesNotThrow(() => JSON.parse(snippet), client.id);
  }
  for (const setup of data.setups) assert.ok(data.clients.some(client => client.setup === setup.id), `unused setup ${setup.id}`);
});

test('HTML references resolve to repository pages, assets, or vendor URLs', () => {
  const html = fs.readFileSync('docs/index.html', 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const url = match[1];
    if (/^(https?:|data:)/.test(url)) continue;
    const target = `docs/${url.split(/[?#]/)[0]}`;
    const exists = fs.existsSync(target) || (target.endsWith('.html') && fs.existsSync(target.replace(/\.html$/, '.md')));
    assert.ok(exists, `missing website reference ${url}`);
  }
  assert.doesNotMatch(html, /(?:\bverified\b|unverified|client-status)/i);
  assert.doesNotMatch(fs.readFileSync('README.md', 'utf8'), /unverified/i);
});
