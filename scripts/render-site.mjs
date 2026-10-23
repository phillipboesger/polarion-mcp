#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startMarker = '<!-- clients:start -->';
const endMarker = '<!-- clients:end -->';
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function renderSiteClientsBlock(clients) {
  return clients.map(client => {
    const transports = client.transports.length
      ? client.transports.map(value => value === 'streamable-http' ? 'Streamable HTTP' : value.toUpperCase() === 'SSE' ? 'SSE' : value).join(' · ')
      : 'REST action';
    const auth = client.authModes.map(value => value.replaceAll('-', ' ')).join(' · ');
    const statusLine = client.confidence === 'unverified' ? '        <span class="client-status">Unverified</span>\n' : '';
    return `      <article class="client-card">\n        <h3 class="client-name">${escapeHtml(client.name)}</h3>\n${statusLine}        <p class="client-detail"><strong>Transport:</strong> ${escapeHtml(transports)}</p>\n        <p class="client-detail"><strong>Auth:</strong> ${escapeHtml(auth)}</p>\n        <a class="client-guide" href="clients/${escapeHtml(client.id)}.md">Setup guide <span aria-hidden="true">→</span></a>\n      </article>`;
  }).join('\n');
}

export function renderSite(rootDir = root) {
  const htmlPath = path.join(rootDir, 'docs/index.html');
  const clients = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8')).clients;
  const toolsSource = fs.readFileSync(path.join(rootDir, 'src/tools.ts'), 'utf8');
  const count = [...toolsSource.matchAll(/^\s*\["[^"]+", \{/gm)].length;
  if (!count) throw new Error('Could not derive tool count from src/tools.ts');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const block = `${startMarker}\n${renderSiteClientsBlock(clients)}\n    ${endMarker}`;
  const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (!markerPattern.test(html) || html.match(new RegExp(startMarker, 'g'))?.length !== 1 || html.match(new RegExp(endMarker, 'g'))?.length !== 1) {
    throw new Error('docs/index.html must contain exactly one ordered client marker block');
  }
  return html.replace(markerPattern, block).replaceAll('{{TOOL_COUNT}}', count);
}

const htmlPath = path.join(root, 'docs/index.html');
try {
  const expected = renderSite();
  const current = fs.readFileSync(htmlPath, 'utf8');
  if (process.argv.includes('--check')) {
    if (current !== expected) throw new Error('website client block or generated tool counts are stale; run npm run docs:site');
    console.log('Website client block and generated tool counts are up to date');
  } else if (current === expected) {
    console.log('Website client block and generated tool counts are up to date');
  } else {
    fs.writeFileSync(htmlPath, expected);
    console.log('Updated website client block and generated tool counts');
  }
} catch (error) {
  console.error(`render-site: ${error.message}`);
  process.exitCode = 1;
}
