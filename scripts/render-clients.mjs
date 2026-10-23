#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startMarker = '<!-- clients:start -->';
const endMarker = '<!-- clients:end -->';

const transportLabels = {
  stdio: 'stdio',
  'streamable-http': 'Streamable HTTP',
  sse: 'SSE',
  'rest-action': 'REST action',
};

export function renderClientsBlock(clients) {
  const rows = clients.map(client => {
    const transports = client.transports.length
      ? client.transports.map(transport => transportLabels[transport] ?? transport).join(', ')
      : transportLabels[client.config.transport] ?? client.config.transport;
    const auth = client.authModes.map(mode => mode.replaceAll('-', ' ')).join(', ');
    const status = client.confidence === 'unverified' ? ' (unverified)' : '';
    return `| ${client.name}${status} | ${transports} | ${auth} | [Setup](docs/clients/${client.id}.md) |`;
  });
  return [
    '| Client | Transport | Auth | Guide |',
    '|---|---|---|---|',
    ...rows,
  ].join('\n');
}

export function updateReadme(rootDir = root) {
  const readmePath = path.join(rootDir, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8'));
  const replacement = `${startMarker}\n${renderClientsBlock(manifest.clients)}\n${endMarker}`;
  const markerPattern = new RegExp(`${startMarker}\\s*[\\s\\S]*?\\s*${endMarker}`);
  if (!markerPattern.test(readme)) throw new Error('README.md must contain one clients marker block');
  const updated = readme.replace(markerPattern, replacement);
  if (updated === readme) {
    console.log('Client table is up to date');
  } else {
    fs.writeFileSync(readmePath, updated);
    console.log('Updated the README client table');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    updateReadme();
  } catch (error) {
    console.error(`render-clients: ${error.message}`);
    process.exitCode = 1;
  }
}
