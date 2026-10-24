#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startMarker = '<!-- clients:start -->';
const endMarker = '<!-- clients:end -->';
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function renderSiteClientsBlock(manifest) {
  const clientButton = id => {
    const client = manifest.clients.find(client => client.id === id);
    if (!client) throw new Error(`Unknown client ${id}`);
    return `<button type="button" data-client="${escapeHtml(id)}" aria-controls="setup" aria-pressed="${id === 'claude-desktop'}">${escapeHtml(client.label)}</button>`;
  };
  const groups = manifest.groups.map(group => `<section class="client-group" aria-labelledby="group-${group.id}">
          <h3 id="group-${group.id}">${escapeHtml(group.title)}</h3>
          <div class="provider-grid ${group.id === 'providers' ? '' : 'wide'}">${group.cards.map(card => `
            <article class="provider-card ${card.id}">
              <div class="provider-heading"><span class="monogram" aria-hidden="true">${escapeHtml(card.mark)}</span><div><h4>${escapeHtml(card.name)}</h4><p>${escapeHtml(card.description)}</p></div></div>
              <div class="client-buttons">${card.clients.map(clientButton).join('')}</div>
            </article>`).join('')}
          </div>
        </section>`).join('\n        ');
  const first = manifest.clients[0];
  const setup = manifest.setups.find(setup => setup.id === first.setup);
  const clients = manifest.clients.map(({ id, name, label, setup, steps, snippet, note, sources }) => ({ id, name, label, setup, steps, snippet, note, source: sources[0] }));
  const data = JSON.stringify({ clients, setups: manifest.setups }).replaceAll('<', '\\u003c');
  return `<div class="setup-layout">
      <div class="client-groups">${groups}</div>
      <section class="setup-panel" id="setup" aria-labelledby="setup-title" tabindex="-1">
        <p class="eyebrow" id="setup-kind">${escapeHtml(setup.kind)}</p>
        <h3 id="setup-title">${escapeHtml(setup.title)}</h3>
        <label for="setup-client">Set up</label>
        <select id="setup-client">${manifest.clients.filter(client => client.setup === first.setup).map(client => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join('')}</select>
        <p class="compatibility" id="setup-compatibility">Same format: ${escapeHtml(manifest.clients.filter(client => client.setup === first.setup).map(client => client.label).join(' · '))}</p>
        <ol class="setup-steps" id="setup-steps">${first.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <div class="snippet-header"><span id="snippet-language">${escapeHtml(setup.language)}</span><button type="button" id="copy-setup">Copy snippet</button></div>
        <pre tabindex="0" aria-label="Setup snippet"><code id="setup-code">${escapeHtml(first.snippet ?? setup.snippet)}</code></pre>
        <p class="setup-note" id="setup-note">${escapeHtml(first.note || setup.note)}</p>
        <div class="setup-links"><a id="setup-source" href="${escapeHtml(first.sources[0])}" target="_blank" rel="noopener noreferrer">Client documentation ↗</a><a href="clients.html">Sources &amp; details</a></div>
        <p id="setup-status" class="sr-only" role="status" aria-live="polite"></p>
      </section>
    </div>
    <script type="application/json" id="client-data">${data}</script>`;
}

export function renderSite(rootDir = root) {
  const htmlPath = path.join(rootDir, 'docs/index.html');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8'));
  const toolsSource = fs.readFileSync(path.join(rootDir, 'src/tools.ts'), 'utf8');
  const count = [...toolsSource.matchAll(/^\s*\["[^"]+", \{/gm)].length;
  if (!count) throw new Error('Could not derive tool count from src/tools.ts');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.split(startMarker).length !== 2 || html.split(endMarker).length !== 2 || html.indexOf(startMarker) > html.indexOf(endMarker)) throw new Error('docs/index.html must contain exactly one ordered client marker block');
  return html.replace(/<!-- clients:start -->[\s\S]*?<!-- clients:end -->/, `${startMarker}\n    ${renderSiteClientsBlock(manifest)}\n    ${endMarker}`).replaceAll('{{TOOL_COUNT}}', count);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const expected = renderSite();
    const htmlPath = path.join(root, 'docs/index.html');
    const current = fs.readFileSync(htmlPath, 'utf8');
    if (process.argv.includes('--check') && current !== expected) throw new Error('website client block is stale; run npm run docs:site');
    if (!process.argv.includes('--check') && current !== expected) fs.writeFileSync(htmlPath, expected);
    console.log('Website client block and generated tool counts are up to date');
  } catch (error) { console.error(`render-site: ${error.message}`); process.exitCode = 1; }
}
