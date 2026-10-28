#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guideUrl, requirement } from './render-clients.mjs';
import { HUB, ORBIT, RADII, VIEWBOX, layoutForMap } from './galaxy-layout.mjs';
import { ICON_PATHS, renderNodeLogo } from './galaxy-logos.mjs';

const repoBlob = 'https://github.com/phillipboesger/polarion-mcp/blob/main';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const httpsUrl = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Client documentation URLs must use HTTPS');
  return escapeHtml(url.href);
};

export function renderSiteClientsBlock(manifest) {
  const mode = id => manifest.serverModes.find(mode => mode.id === id);
  const layout = layoutForMap(manifest.map);
  const clientsById = new Map(manifest.clients.map(client => [client.id, client]));
  const nodes = manifest.map.map(node => ({
    id: node.id, name: node.name, color: node.color, angle: node.angle,
    position: layout[node.id].primary, clients: node.clients,
  }));
  const clients = manifest.clients.map(client => {
    const node = manifest.map.find(item => item.clients.includes(client.id));
    return {
      id: client.id, name: client.name, label: client.label, node: node?.id ?? null,
      icon: client.icon, summary: client.summary, guide: `clients/${client.id}.md`,
      satellite: node ? layout[node.id].satellites[client.id] : null,
      modes: Object.fromEntries(['local', 'server'].map(id => [id, {
        supported: !client[id].reason, reason: client[id].reason ?? null, requirement: requirement(client[id]),
      }])),
    };
  });
  const cv = (a, b, k = 0.14) => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    return `M${a.x} ${a.y} Q${mx - dy * k} ${my + dx * k} ${b.x} ${b.y}`;
  };
  const svg = `<svg class="galaxy-stage" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" role="group" aria-label="Integration map"><defs>
      <radialGradient id="hubg"><stop offset="0" stop-color="#2a79ad"/><stop offset="1" stop-color="#0d2f52"/></radialGradient>
      <linearGradient id="gem" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4285f4"/><stop offset=".55" stop-color="#9b72cb"/><stop offset="1" stop-color="#d96570"/></linearGradient>
    ${Object.entries(ICON_PATHS).map(([name, paths]) => `<symbol id="gi-${name}" viewBox="0 0 24 24">${paths}</symbol>`).join('')}
    </defs>
    <ellipse class="ring" cx="${HUB.x}" cy="${HUB.y}" rx="${ORBIT.rx}" ry="${ORBIT.ry}"/><ellipse class="ring" cx="${HUB.x}" cy="${HUB.y}" rx="${ORBIT.rx * 0.58}" ry="${ORBIT.ry * 0.58}"/>
    <circle class="pulse" cx="${HUB.x}" cy="${HUB.y}" r="${RADII.hub}"/>
    ${nodes.map(node => `<path class="edge" data-node="${escapeHtml(node.id)}" d="${cv(HUB, node.position)}"/>`).join('\n    ')}
    <g id="galaxy-satellites"></g>
    <g class="node hub" id="galaxy-hub" tabindex="0" role="button" aria-label="Polarion MCP, reset" transform="translate(${HUB.x} ${HUB.y})"><circle class="hubdisc" r="${RADII.hub}"/><rect x="-17" y="-40" width="34" height="38" rx="7" fill="rgba(98,214,255,.08)" stroke="#62d6ff" stroke-width="1.6"/><text y="-20" style="font:600 28px ui-monospace,Menlo,monospace;fill:#62d6ff;text-anchor:middle;dominant-baseline:central;pointer-events:none">p</text><text y="20" style="font:650 14px -apple-system,Segoe UI,sans-serif;letter-spacing:-.04em;fill:#fff;text-anchor:middle;pointer-events:none">polarion<tspan fill="#62d6ff">-mcp</tspan></text><text y="36" style="font:10px -apple-system,Segoe UI,sans-serif;fill:#b9d3e6;text-anchor:middle;pointer-events:none">Your bridge to Polarion</text></g>
    ${nodes.map(node => `<g class="node primary" data-node="${escapeHtml(node.id)}" role="button" tabindex="0" aria-expanded="false" aria-label="${escapeHtml(node.name)}" style="--c:${escapeHtml(node.color)}" transform="translate(${node.position.x} ${node.position.y})"><circle class="disc" r="${RADII.primary}"/>${renderNodeLogo(node.logo ?? node.id, node.color)}<text class="lbl" y="56">${escapeHtml(node.name)}</text></g>`).join('\n    ')}
  </svg>`;
  const guideBase = `${repoBlob}/docs/guides/`;
  const json = JSON.stringify({ viewBox: VIEWBOX, hub: HUB, radii: RADII, nodes, clients, guideBase })
    .replaceAll('<', '\\u003C').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const listGroups = manifest.map.map(node => `<section><h3>${escapeHtml(node.name)}</h3><ul>${node.clients.map(id => { const client = clientsById.get(id); return `<li><a class="guide-link" href="${httpsUrl(guideUrl(id))}">${escapeHtml(client.name)}</a> - ${escapeHtml(client.summary)}</li>`; }).join('')}</ul></section>`).join('\n      ');
  const docker = clientsById.get('docker');
  return `<div class="path-entries">
      <p><strong>${escapeHtml(mode('local').label)}</strong>${escapeHtml(mode('local').description)} <a href="${httpsUrl(`${repoBlob}/docs/guides/local-npm.md`)}" target="_blank" rel="noopener noreferrer">Open the local guide ↗</a></p>
      <p><strong>${escapeHtml(mode('server').label)}</strong>${escapeHtml(mode('server').description)} <a href="${httpsUrl(`${repoBlob}/docs/guides/server-docker.md`)}" target="_blank" rel="noopener noreferrer">Open the server guide ↗</a></p>
    </div>
    <div class="galaxy" id="galaxy">
      ${svg}
      <p class="galaxy-hint" id="galaxy-hint">Select a provider to see its options</p>
      <div class="galaxy-panel" id="galaxy-panel" role="region" aria-label="Setup details" tabindex="-1" hidden></div>
      <div class="galaxy-sheet" id="galaxy-sheet" role="dialog" aria-label="Setup details" hidden></div>
      <script type="application/json" id="galaxy-data">${json}</script>
      <p id="path-status" class="sr-only" role="status" aria-live="polite"></p>
      <div class="galaxy-list">${listGroups}
        <section><h3>Self-hosted server</h3><ul><li><a class="guide-link" href="${httpsUrl(guideUrl('docker'))}">${escapeHtml(docker.name)}</a> - ${escapeHtml(docker.summary)}</li></ul></section>
      </div>
    </div>`;
}

// Disjoint, ordered path rules: nested work items are counted with work items,
// matching the runtime toolset classifier. Tests compare every operation to it.
export const domains = [
  { id: 'work-items', title: 'Work items', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 21 12 12 21 3 12z"/><path d="M8.5 12h7"/></svg>`, segments: ['workitems'], outcome: 'Find requirements, triage defects and prepare field updates.' },
  { id: 'test-management', title: 'Test management', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`, segments: ['testruns', 'testparameterdefinitions'], outcome: 'Prepare test runs and record the results your team supplies.' },
  { id: 'plans', title: 'Plans & collections', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>`, segments: ['plans', 'collections'], outcome: 'Check release scope and keep document collections together.' },
  { id: 'documents', title: 'Documents', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg>`, segments: ['documents', 'revisions'], outcome: 'Read LiveDocs, inspect their parts and work with attachments.' },
  { id: 'pages', title: 'Pages', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M7 12h6M7 16h10"/></svg>`, segments: ['pages'], outcome: 'Read and maintain supported project and repository pages.' },
  { id: 'enumerations', title: 'Enumerations', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`, segments: ['enumerations'], outcome: 'Discover the allowed values for your project’s fields.' },
  { id: 'projects', title: 'Projects & people', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/></svg>`, segments: ['users', 'user', 'usergroups', 'roles', 'projects', 'projecttemplates', 'spaces'], outcome: 'Find accessible projects, users and configuration context.' },
  { id: 'admin', title: 'Admin & jobs', icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>`, segments: ['jobs', 'actions', 'customfields', 'license', 'llms', 'metadata'], outcome: 'Inspect metadata and manage available background jobs.' },
];

export function countDomains(toolsSource) {
  const counts = Object.fromEntries(domains.map(domain => [domain.id, 0]));
  const entries = [...toolsSource.matchAll(/^\s*\["([^"]+)", \{[\s\S]*?pathTemplate: "([^"]+)"/gm)];
  const total = [...toolsSource.matchAll(/^\s*\["[^"]+", \{/gm)].length;
  if (!total || entries.length !== total) throw new Error('Could not derive all tool paths from src/tools.ts');
  for (const [, name, endpoint] of entries) {
    const segments = endpoint.toLowerCase().split('/').filter(Boolean);
    const domain = domains.find(domain => domain.segments.some(segment => segments.includes(segment)));
    if (!domain) throw new Error(`Unclassified tool ${name}`);
    counts[domain.id]++;
  }
  return { total, counts };
}

export function renderDomains(toolsSource) {
  const { counts } = countDomains(toolsSource);
  const cards = domains.map((domain, i) => `<article class="domain-card" id="topic-${domain.id}" data-domain="${domain.id}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${domains.length}"><div class="domain-top"><span class="domain-icon" aria-hidden="true">${domain.icon}</span><span class="domain-count">${counts[domain.id]} operations</span></div><h3>${domain.title}</h3><p>${domain.outcome}</p></article>`).join('\n');
  const dots = domains.map((domain, i) => `<button type="button" class="carousel-dot" data-slide="${i}" aria-label="Show ${domain.title}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('');
  return `<div class="carousel" role="region" aria-roledescription="carousel" aria-label="Polarion topics covered by the tools">
<div class="carousel-track" tabindex="0">
${cards}
</div>
<div class="carousel-controls"><button type="button" class="carousel-prev" aria-label="Previous topic">←</button><div class="carousel-dots">${dots}</div><button type="button" class="carousel-next" aria-label="Next topic">→</button></div>
</div>`;
}

export function renderDailyUse(scenarios) {
  return `<div class="daily-layout"><div class="day-tabs" role="tablist" aria-label="Daily workflows" aria-orientation="vertical">${scenarios.map((scenario, i) => `<button type="button" role="tab" id="tab-${scenario.id}" aria-controls="day-${scenario.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${scenario.time}</span>${escapeHtml(scenario.label)}</button>`).join('')}</div><div class="day-panels">${scenarios.map(scenario => `<article class="day-chat" id="day-${scenario.id}" role="tabpanel" aria-labelledby="tab-${scenario.id}" tabindex="0"><h3>${escapeHtml(scenario.title)}</h3><div class="chat-message user"><span>You</span><p>${escapeHtml(scenario.prompt)}</p></div><div class="tool-trail"><p class="eyebrow">Tools called by your assistant</p><ol>${scenario.calls.map(call => `<li><code>${escapeHtml(call.tool)}</code><p>${escapeHtml(call.detail)}</p></li>`).join('')}</ol></div><div class="chat-message assistant"><span>Assistant · illustrative result</span><p>${escapeHtml(scenario.result)}</p></div><div class="approval"><span aria-hidden="true">⌁</span><p>${escapeHtml(scenario.guard)}</p></div></article>`).join('')}</div></div>`;
}

// Answers may carry `code` spans; everything else is escaped.
export const renderFaq = manifest => manifest.faq.map(item => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a).replace(/`([^`]+)`/g, '<code>$1</code>')}</p></details>`).join('\n      ');

function replaceBlock(html, name, body) {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(start) > html.indexOf(end)) throw new Error(`docs/index.html must contain exactly one ordered ${name} marker block`);
  return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => `${start}\n${body}\n${end}`);
}

export function renderSite(rootDir = root) {
  const htmlPath = path.join(rootDir, 'docs/index.html');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/clients.json'), 'utf8'));
  const toolsSource = fs.readFileSync(path.join(rootDir, 'src/tools.ts'), 'utf8');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = replaceBlock(html, 'clients', renderSiteClientsBlock(manifest));
  if (html.includes('<!-- faq:start -->')) html = replaceBlock(html, 'faq', renderFaq(manifest));
  // Minimal fixtures used by the docs checker may only contain the clients block.
  if (html.includes('<!-- domains:start -->')) html = replaceBlock(html, 'domains', renderDomains(toolsSource));
  if (html.includes('<!-- daily:start -->')) html = replaceBlock(html, 'daily', renderDailyUse(JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/daily-use.json'), 'utf8'))));
  html = html.replaceAll('{{TOOL_COUNT}}', countDomains(toolsSource).total);
  // Pages caches assets for hours: tie each asset URL to its content so a new HTML never meets old CSS/JS.
  return html.replace(/(href|src)="(site\.css|viz\.js|paths\.js|carousel\.js)(\?v=[0-9a-f]+)?"/g, (_, attr, file) => {
    const hash = createHash('sha1').update(fs.readFileSync(path.join(rootDir, 'docs', file))).digest('hex').slice(0, 8);
    return `${attr}="${file}?v=${hash}"`;
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const expected = renderSite();
    const htmlPath = path.join(root, 'docs/index.html');
    const current = fs.readFileSync(htmlPath, 'utf8');
    if (process.argv.includes('--check') && current !== expected) throw new Error('website blocks are stale; run npm run docs:site');
    if (!process.argv.includes('--check') && current !== expected) fs.writeFileSync(htmlPath, expected);
    console.log('Website paths, domains and daily examples are up to date');
  } catch (error) { console.error(`render-site: ${error.message}`); process.exitCode = 1; }
}
