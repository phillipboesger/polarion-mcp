import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderSiteClientsBlock, renderSite } from '../scripts/render-site.mjs';

const manifest = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const island = html => JSON.parse(/<script type="application\/json" id="galaxy-data">([\s\S]*?)<\/script>/.exec(html)[1]);

test('renders a deterministic integration galaxy with manifest data', () => {
  const first = renderSiteClientsBlock(manifest);
  assert.equal(first, renderSiteClientsBlock(manifest));
  assert.equal((first.match(/class="node primary"/g) || []).length, 7);
  assert.doesNotMatch(first, /name="path"/);
  const data = island(first);
  assert.deepEqual(data.nodes.map(node => node.id), manifest.map.filter(node => node.site !== false).map(node => node.id));
  assert.deepEqual(data.clients.map(client => client.id), manifest.clients.map(client => client.id));
});

test('escapes a client name inside the JSON script data island', () => {
  const cloned = structuredClone(manifest);
  cloned.clients[0].name = '</script><b>';
  const html = renderSiteClientsBlock(cloned);
  assert.doesNotMatch(html, /<\/script><b>/);
  assert.equal(island(html).clients[0].name, '</script><b>');
});

test('links every client guide exactly once in the generated site', () => {
  const html = renderSite();
  for (const client of manifest.clients) {
    const path = `docs/guides/clients/${client.id}.md`;
    assert.equal(html.split(path).length - 1, 1, `${client.id} guide should occur once`);
  }
});
