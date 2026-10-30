#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoBlob = 'https://github.com/phillipboesger/polarion-mcp/blob/main';
export const guideUrl = id => `${repoBlob}/docs/guides/clients/${id}.md`;
export const modes = ['local', 'server'];
const modeLabel = { local: 'Local', server: 'Server' };
const modeGuide = { local: 'local-npm.md', server: 'server-docker.md' };
const fence = (language, code) => `\`\`\`${language === 'text' ? '' : language}\n${code}\n\`\`\``;
const supported = connection => !connection.reason;
export const requirement = connection => supported(connection) ? (connection.needs ?? []).join('; ') : connection.reason;
const cell = connection => supported(connection) ? 'Yes' : 'No';

export function renderClientsBlock(manifest) {
  return [
    '| Client | Local | Server | Guide |',
    '|---|---|---|---|',
    ...manifest.clients.map(client => `| ${client.name} | ${cell(client.local)} | ${cell(client.server)} | [Open guide](${guideUrl(client.id)}) |`),
  ].join('\n');
}

function renderConnection(manifest, client, mode, part) {
  const connection = client[mode];
  const setup = manifest.setups.find(item => item.id === connection.setup);
  if (part === 'prerequisites') {
    const lines = [`- [${manifest.serverModes.find(item => item.id === mode).label} guide](../${modeGuide[mode]}): start here if you have not set it up yet.`, ...(connection.needs ?? []).map(need => `- ${need}`)];
    const serverSetup = connection.serverSetup && manifest.setups.find(item => item.id === connection.serverSetup);
    const server = serverSetup ? `\n\nServer example (${serverSetup.title}):\n\n${fence(serverSetup.language, serverSetup.snippet)}\n\n${serverSetup.note}` : '';
    return `${lines.join('\n')}${server}`;
  }
  if (part === 'steps') {
    const snippet = connection.snippet ?? setup.snippet;
    const language = connection.language ?? setup.language;
    const note = [connection.note || setup.note, connection.teamNote].filter(Boolean).join('\n\n');
    const alt = connection.alternative;
    const alternative = alt ? `\n\n#### Alternative: ${alt.title}\n\n${[alt.description, ...(alt.needs ?? []).map(need => `Needs: ${need}.`)].filter(Boolean).join(' ')}\n\n${alt.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n${fence(alt.language ?? 'text', alt.snippet)}${alt.note ? `\n\n${alt.note}` : ''}` : '';
    return `${connection.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}${snippet ? `\n\n${fence(language, snippet)}` : ''}${note ? `\n\n${note}` : ''}${alternative}`;
  }
  if (part === 'check') return `Ask your assistant: \`${connection.verify.prompt}\`\n\nExpected: ${connection.verify.expect}`;
  return `| Symptom | Fix |\n|---|---|\n${connection.fails.map(fail => `| ${fail.symptom} | ${fail.fix} |`).join('\n')}`;
}

export function renderClientGuide(manifest, client) {
  const active = modes.filter(mode => supported(client[mode]));
  const section = (title, part) => `## ${title}\n\n${active.map(mode => `### ${modeLabel[mode]}\n\n${renderConnection(manifest, client, mode, part)}`).join('\n\n')}`;
  const unsupported = modes.filter(mode => !supported(client[mode])).map(mode => `- **${modeLabel[mode]} is not supported:** ${client[mode].reason}`);
  const sources = client.sources.map((source, i) => `- [${source.includes('github.com/phillipboesger') ? 'Server implementation' : client.thirdPartySources ? 'Third-party guide' : 'Official documentation'}${client.sources.length > 1 ? ` ${i + 1}` : ''}](${source})`);
  const unverified = client.unverified?.length ? `\n\nNot confirmed in the vendor documentation:\n\n${client.unverified.map(item => `- ${item}`).join('\n')}` : '';
  const verifiedLines = modes.filter(mode => client.verified?.[mode]).map(mode => { const v = client.verified[mode]; return `- ${modeLabel[mode]}: verified on ${v.date} with ${v.client} ${v.clientVersion}, polarion-mcp ${v.mcpVersion}, Polarion ${v.polarion} (${v.evidence}).`; });
  const verified = verifiedLines.length ? `\n\nVerified end to end:\n\n${verifiedLines.join('\n')}` : '';
  const notes = [client.note, client.referenceNote].filter(Boolean).join(' ');
  const variants = client.variants ? `\n\n## IDE variants\n\nThe snippets below are the same in every IDE. Only the way to open the configuration and the minimum version differ.\n\n${client.variants.map(variant => `### ${variant.label}\n\nNeeds: ${variant.minVersion}.\n\n${variant.openSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`).join('\n\n')}` : '';
  return `# Connect ${client.name}\n\n${client.summary} Default: **${modeLabel[client.defaultMode]}**.${notes ? `\n\n${notes}` : ''}${unsupported.length ? `\n\n${unsupported.join('\n')}` : ''}${variants}\n\n${section('Prerequisites', 'prerequisites')}\n\n${section('Steps', 'steps')}\n\n${section('Check', 'check')}\n\n${section('If it fails', 'fails')}\n\n## Sources\n\n${client.thirdPartySources ? 'Checked against third-party guides' : 'Checked against the vendor documentation'} on ${client.checked}.\n\n${sources.join('\n')}${verified}${unverified}\n\nBack to the [client index](../../clients.md).\n`;
}

export function renderClientIndex(manifest) {
  return `# Connect your client\n\nThe landing page lists every client and links here. Pick the guide for your client.\n\n## Two setups\n\n- **Local:** your client starts \`npx -y polarion-mcp\` on your computer. Needs Node.js 22+ and a Polarion token. See [Local setup](guides/local-npm.md).\n- **Server:** you host the server with Docker and the client connects by URL. Cloud clients (claude.ai, ChatGPT) also need public HTTPS and OAuth. See [Server setup](guides/server-docker.md).\n\nConnecting to a team's server URL is the client side of the Server setup: it needs a running server, yours or your team's.\n\n## Clients\n\n${renderClientsBlock(manifest)}\n\nGuides record the vendor sources checked on ${manifest.checked}. They describe documented configuration, not an end-to-end test of every client account or subscription. The source of truth is [clients.json](clients.json); run \`npm run docs:clients\` and \`npm run docs:site\` after editing it.\n\n## Team server prerequisites\n\nCloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, \`MCP_PUBLIC_URL\`, a stable \`MCP_TOKEN_SECRET\`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use \`MCP_ALLOWED_REDIRECT_PRESETS=claude\` and Microsoft 365 Copilot \`m365\`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server. Follow [deployment](deployment.md) for TLS and OAuth, and see [security](security.md) and [configuration](configuration.md).\n\n## Optional smaller tool lists\n\nThe full catalog remains enabled by default. If you prefer a smaller list for a particular connection, choose the selector that matches the setup:\n\n- **Claude Desktop, Claude Code, Codex, VS Code, Cursor, Windsurf, Antigravity, and other local stdio clients:** set \`MCP_TOOLSETS\` on the local server process (for example \`MCP_TOOLSETS=work-items,documents\`) or \`MCP_TOOLS\` to an explicit comma-separated allowlist. Add \`MCP_READ_ONLY=true\` to expose only read-only tools. Set \`MCP_MODE=discover\` to expose \`search_tools\`, \`describe_tool\`, and \`call_tool\` for the enabled tools.\n- **claude.ai, ChatGPT, Copilot Studio, and other HTTP clients:** the server administrator can set \`MCP_TOOLSETS\` or \`MCP_READ_ONLY\` for every connection. An HTTP client can narrow an individual request with \`X-MCP-Toolsets: work-items,documents\`, or connect to \`/mcp/work-items,documents\`. \`MCP_TOOLS\` is a server environment allowlist. \`MCP_MODE=discover\` is also a server setting and presents the three discovery tools instead of the full tool list.\n- **REST wrapper clients:** \`/api/tools\` lists the wrapper's configured operations. The wrapper does not use MCP toolset selectors; use the MCP endpoint when you need \`MCP_TOOLSETS\`, \`MCP_TOOLS\`, \`MCP_READ_ONLY\`, or discovery mode.\n\nThese are optional configuration choices for managing the tool surface. Client-specific tool limits are not assumed. See [usage](usage.md) and [configuration](configuration.md) for selector behavior and accepted toolset names.\n\n## More questions\n\n${(manifest.faqMore || []).map(item => `### ${item.q}\n\n${item.a}`).join('\n\n')}\n`;
}

export const renderReadmeFaq = manifest => `${manifest.faq.map(item => `<details><summary>${item.q}</summary>\n\n${item.a}\n\n</details>`).join('\n')}\n\nMore answers: [docs/clients.md](docs/clients.md#more-questions).`;

export const renderFaqList = manifest => (manifest.faqMore || []).map(item => `**${item.q}**\n${item.a}`).join('\n\n');

// Old client ids keep a stub so existing links to the previous guide still resolve.
export const renderLegacyStub = client => `# ${client.name} has moved\n\nThis guide is now [Connect ${client.name}](${client.id}.md).\n`;

// Every generated file as [repo-relative path, content]. The checker compares these to disk.
export function renderGuides(manifest) {
  return [
    ['docs/clients.md', renderClientIndex(manifest)],
    ...manifest.clients.map(client => [`docs/guides/clients/${client.id}.md`, renderClientGuide(manifest, client)]),
    ...manifest.clients.flatMap(client => (client.legacyIds ?? []).map(id => [`docs/guides/clients/${id}.md`, renderLegacyStub(client)])),
  ];
}

const eol = text => (text.includes('\r\n') ? '\r\n' : '\n');

export function updateReadme(rootDir = root) {
  const readmePath = path.join(rootDir, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8'));
  const marker = /<!-- clients:start -->[\s\S]*?<!-- clients:end -->/;
  if (!marker.test(readme)) throw new Error('README.md must contain one clients marker block');
  const faqMarker = /<!-- faq:start -->[\s\S]*?<!-- faq:end -->/;
  if (!faqMarker.test(readme)) throw new Error('README.md must contain one faq marker block');
  const troublePath = path.join(rootDir, 'docs/troubleshooting.md');
  const trouble = fs.readFileSync(troublePath, 'utf8');
  const troubleMarker = /<!-- faq:start -->[\s\S]*?<!-- faq:end -->/;
  if (!troubleMarker.test(trouble)) throw new Error('docs/troubleshooting.md must contain one faq marker block');
  fs.writeFileSync(troublePath, trouble.replace(troubleMarker, () => `<!-- faq:start -->${eol(trouble)}${renderFaqList(manifest).replace(/\n/g, eol(trouble))}${eol(trouble)}<!-- faq:end -->`));
  fs.writeFileSync(readmePath, readme.replace(marker, `<!-- clients:start -->\n${renderClientsBlock(manifest)}\n<!-- clients:end -->`).replace(faqMarker, () => `<!-- faq:start -->\n${renderReadmeFaq(manifest)}\n<!-- faq:end -->`));
  for (const [file, content] of renderGuides(manifest)) {
    fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, file), content);
  }
  console.log('Updated README client table and generated client guides');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { updateReadme(); }
  catch (error) { console.error(`render-clients: ${error.message}`); process.exitCode = 1; }
}
