#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const httpsUrl = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Client documentation URLs must use HTTPS');
  return escapeHtml(url.href);
};

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
  const connection = first.connections[first.defaultMode];
  const setup = manifest.setups.find(setup => setup.id === connection.setup);
  const clients = manifest.clients.map(({ id, name, label, defaultMode, connections, sources }) => ({ id, name, label, defaultMode, connections, source: sources[0] }));
  const data = JSON.stringify({ clients, setups: manifest.setups, serverModes: manifest.serverModes }).replaceAll('<', '\\u003c');
  return `<div class="setup-layout">
      <div class="client-groups">${groups}</div>
      <section class="setup-panel" id="setup" aria-labelledby="setup-title" tabindex="-1">
        <p class="eyebrow" id="setup-kind">${escapeHtml(setup.kind)}</p>
        <h3 id="setup-title">${escapeHtml(first.name)}</h3>
        <fieldset class="server-picker"><legend>1. How do you run the server?</legend>
          <div class="server-options">${manifest.serverModes.map(mode => `<label class="server-option"><input type="radio" name="server-mode" value="${mode.id}"${mode.id === first.defaultMode ? ' checked' : ''} /><span><strong>${escapeHtml(mode.label)}</strong><small id="description-${mode.id}">${escapeHtml(first.connections[mode.id].description || mode.description)}</small><small id="reason-${mode.id}" class="mode-reason"></small></span></label>`).join('')}</div>
        </fieldset>
        <label for="setup-client">2. Connect your client</label>
        <select id="setup-client">${manifest.clients.map(client => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join('')}</select>
        <p class="compatibility" id="setup-compatibility">${escapeHtml(first.name)} · ${escapeHtml(setup.title)}</p>
        <div id="setup-before" class="setup-before" hidden><h4 id="before-title">Before you start</h4><div id="before-items"></div></div>
        <ol class="setup-steps" id="setup-steps">${connection.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <div id="server-command" hidden>
          <div class="snippet-header"><span>Start your server · bash</span><button type="button" class="copy-snippet" data-copy="server-code">Copy server command</button></div>
          <pre tabindex="0" aria-label="Server command"><code id="server-code"></code></pre><p class="setup-note" id="server-note"></p>
        </div>
        <div class="snippet-header"><span id="snippet-language">${escapeHtml(setup.language)} · client configuration</span><button type="button" id="copy-setup" class="copy-snippet" data-copy="setup-code">Copy snippet</button></div>
        <pre tabindex="0" aria-label="Client setup snippet"><code id="setup-code">${escapeHtml(connection.snippet ?? setup.snippet)}</code></pre>
        <div id="setup-verify" class="setup-verify" hidden><h4>Check that it works</h4><p id="verify-prompt"></p><p id="verify-expect"></p></div>
        <div id="setup-fails" class="setup-fails" hidden><h4>If it does not work</h4><dl id="fails-list"></dl></div>
        <p class="setup-note" id="setup-note">${escapeHtml(connection.note || setup.note)}</p>
        <div class="setup-links"><a id="setup-source" href="${httpsUrl(first.sources[0])}" target="_blank" rel="noopener noreferrer">Client documentation ↗</a><a href="#faq">Setup questions ↓</a></div>
        <p id="setup-status" class="sr-only" role="status" aria-live="polite"></p>
      </section>
    </div>
    <script type="application/json" id="client-data">${data}</script>`;
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
  return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${body}\n${end}`);
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
  return html.replace(/(href|src)="(site\.css|viz\.js|setup\.js|carousel\.js)(\?v=[0-9a-f]+)?"/g, (_, attr, file) => {
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
    console.log('Website setup, domains and daily examples are up to date');
  } catch (error) { console.error(`render-site: ${error.message}`); process.exitCode = 1; }
}
