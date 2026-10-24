#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const setupUrl = id => `https://polarion-mcp.boesger.com/#setup/${id}`;

export function renderClientsBlock(manifest) {
  return [
    '| Group | Setup |',
    '|---|---|',
    ...manifest.readmeGroups.map(group => `| [${group.name}](${setupUrl(group.client)}) | ${group.summary} |`),
  ].join('\n');
}

export function renderClientReference(manifest) {
  return `# Client setup reference\n\n[Choose a client and complete setup on the landing page](${setupUrl('claude-desktop')}).\n\nThis reference records the vendor sources checked on ${manifest.checked}. It describes documented configuration, not an end-to-end test of every client account or subscription. The source of truth is [clients.json](clients.json); run \`npm run docs:clients\` and \`npm run docs:site\` after editing it.\n\n## Server choice\n\nChoose **npm / npx** for a local stdio subprocess, **Docker** to deploy a server, or **Remote URL** when your team already hosts it. The inline picker shows a default and disables unsupported choices with a reason. Docker normally runs Streamable HTTP; JetBrains uses a local Docker stdio subprocess because its documented remote authentication is insufficient for this guide.\n\n## Shared setups\n\n${manifest.setups.map(setup => {
    const clients = manifest.clients.filter(client => client.setup === setup.id || Object.values(client.connections).some(connection => connection.setup === setup.id || connection.serverSetup === setup.id));
    return `- **${setup.title}:** ${clients.map(client => `[${client.name}](${setupUrl(client.id)})`).join(', ')}.`;
  }).join('\n')}\n\n## Vendor sources and setup notes\n\n${manifest.clients.map(client => `### ${client.name}\n\n${[client.note, client.referenceNote].filter(Boolean).join(' ') || manifest.setups.find(setup => setup.id === client.setup).note}\n\nDefault: **${manifest.serverModes.find(mode => mode.id === client.defaultMode).label}**.\n\n${manifest.serverModes.map(mode => `- **${mode.label}:** ${client.connections[mode.id].reason || (client.connections[mode.id].serverSetup ? 'Deploy the server, then use the client configuration shown inline.' : 'Supported; use the configuration and steps shown inline.')}`).join('\n')}\n\n${client.sources.map((source, i) => `- [${source.includes('github.com/phillipboesger') ? 'Server implementation' : 'Official documentation'}${client.sources.length > 1 ? ` ${i + 1}` : ''}](${source})`).join('\n')}\n\nSteps checked against the vendor documentation on ${client.checked}.${client.unverified?.length ? ` Not confirmed in the documentation, so the steps stay neutral here:\n\n${client.unverified.map(item => `- ${item}`).join('\n')}` : ''}`).join('\n\n')}\n\n## Team server prerequisites\n\nCloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, \`MCP_PUBLIC_URL\`, a stable \`MCP_TOKEN_SECRET\`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use \`MCP_ALLOWED_REDIRECT_PRESETS=claude\`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server.\n\nThe [Docker setup](${setupUrl('docker')}) starts a local PAT-authenticated HTTP endpoint. Follow [deployment](deployment.md) for TLS and OAuth. The [REST wrapper](${setupUrl('rest-wrapper')}) uses a deployment PAT plus \`HTTP_API_KEY\`; it is a separate mode from remote MCP. See [security](security.md) and [configuration](configuration.md).\n\n## More questions\n\n${(manifest.faqMore || []).map(item => `### ${item.q}\n\n${item.a}`).join('\n\n')}\n`;
}

export const renderReadmeFaq = manifest => `${manifest.faq.map(item => `<details><summary>${item.q}</summary>\n\n${item.a}\n\n</details>`).join('\n')}\n\nMore answers: [docs/clients.md](docs/clients.md#more-questions).`;

export function updateReadme(rootDir = root) {
  const readmePath = path.join(rootDir, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8'));
  const marker = /<!-- clients:start -->[\s\S]*?<!-- clients:end -->/;
  if (!marker.test(readme)) throw new Error('README.md must contain one clients marker block');
  const faqMarker = /<!-- faq:start -->[\s\S]*?<!-- faq:end -->/;
  if (!faqMarker.test(readme)) throw new Error('README.md must contain one faq marker block');
  fs.writeFileSync(readmePath, readme.replace(marker, `<!-- clients:start -->\n${renderClientsBlock(manifest)}\n<!-- clients:end -->`).replace(faqMarker, () => `<!-- faq:start -->\n${renderReadmeFaq(manifest)}\n<!-- faq:end -->`));
  fs.writeFileSync(path.join(rootDir, 'docs/clients.md'), renderClientReference(manifest));
  console.log('Updated grouped README table and client source reference');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { updateReadme(); }
  catch (error) { console.error(`render-clients: ${error.message}`); process.exitCode = 1; }
}
