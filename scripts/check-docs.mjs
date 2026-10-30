#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderClientsBlock, renderGuides, renderReadmeFaq, renderFaqList } from './render-clients.mjs';
import { renderSite } from './render-site.mjs';
import { ICON_PATHS } from './galaxy-logos.mjs';

const RULES = {
  env: 'env-vars', tools: 'tool-references', prompts: 'prompt-resource-references',
  links: 'markdown-links-toc', examples: 'tool-call-examples', endings: 'crlf',
  website: 'website-counts', clients: 'client-references', configDuplicates: 'duplicate-config-entries',
};
// Names supplied by hosting runtimes or read through a parameterized env map.
// They are checked through their documented family/flow rather than as literals.
const INTERNAL_ENV_IGNORES = new Set(['PORT', 'RENDER_EXTERNAL_URL']);
const DYNAMIC_ENV_FAMILIES = [
  'API_KEY_<SCHEME>', 'BEARER_TOKEN_<SCHEME>', 'BASIC_USERNAME_<SCHEME>',
  'BASIC_PASSWORD_<SCHEME>', 'OAUTH_CLIENT_ID_<SCHEME>', 'OAUTH_CLIENT_SECRET_<SCHEME>',
  'OAUTH_SCOPES_<SCHEME>', 'OAUTH_TOKEN_<SCHEME>', 'OPENID_TOKEN_<SCHEME>',
];

function cli(argv) {
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let strict = process.env.CHECK_DOCS_STRICT === '1';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--strict') strict = true;
    else if (argv[i] === '--root' && argv[i + 1]) root = path.resolve(argv[++i]);
    else if (argv[i] === '--help') return { help: true, root, strict };
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return { root, strict };
}
const read = (root, rel) => {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; }
};
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
const filesUnder = (root, dir) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(root, rel) : [rel];
  });
};
const REQUIRED_GUIDE_SECTIONS = ['Prerequisites', 'Steps', 'Check', 'If it fails'];
// "Check" also matches "Check that it works".
const missingGuideSections = (guide, sections = REQUIRED_GUIDE_SECTIONS) => sections.filter(section => !new RegExp(`^## ${section}\\b.*$`, 'm').test(guide));
// The website lists options and links to the guides; it must not carry install procedures.
function siteInstallProblems(html) {
  const section = /<!-- clients:start -->([\s\S]*?)<!-- clients:end -->/.exec(html)?.[1] ?? '';
  const problems = [];
  if (/<ol[\s>]/.test(section)) problems.push('website clients section contains numbered steps; move them into the guides');
  if (/<pre[\s>]/.test(section)) problems.push('website clients section contains a code block; move it into the guides');
  if (/id="setup"/.test(html)) problems.push('website still contains the inline setup panel');
  return problems;
}
function checker(root) {
  const findings = [];
  const add = (rule, file, line, message) => findings.push({ rule: RULES[rule], file, line, message });
  const markdown = ['README.md', ...filesUnder(root, 'docs').filter(f => f.endsWith('.md'))];
  const contents = new Map(markdown.map(f => [f, read(root, f)]));

  // 0. The landing page client matrix must match the clients manifest exactly.
  const readme = read(root, 'README.md');
  const packageText = read(root, 'package.json');
  if (packageText) {
    const version = JSON.parse(packageText).version;
    for (const file of ['README.md', 'docs/deployment.md', 'docs/clients.json']) {
      const text = read(root, file);
      for (const match of text.matchAll(/ghcr\.io\/phillipboesger\/polarion-mcp:(\d+\.\d+\.\d+(?:-[\w.-]+)?)/g)) {
        if (match[1] !== version) add('clients', file, lineAt(text, match.index), `container example pins ${match[1]}; package version is ${version}`);
      }
    }
  }
  const startMarker = '<!-- clients:start -->';
  const endMarker = '<!-- clients:end -->';
  const startAt = readme.indexOf(startMarker);
  const endAt = readme.indexOf(endMarker);
  if (startAt < 0 || endAt < startAt || readme.indexOf(startMarker, startAt + startMarker.length) >= 0 || readme.indexOf(endMarker, endAt + endMarker.length) >= 0) {
    add('clients', 'README.md', 1, 'expected exactly one ordered client marker block');
  } else {
    try {
      const manifest = JSON.parse(read(root, 'docs/clients.json'));
      const expected = `${startMarker}\n${renderClientsBlock(manifest)}\n${endMarker}`;
      const actual = readme.slice(startAt, endAt + endMarker.length);
      if (actual !== expected) add('clients', 'README.md', lineAt(readme, startAt), 'client marker block differs from docs/clients.json; run npm run docs:clients');
      if (manifest.groups) {
        for (const [file, content] of renderGuides(manifest)) if (read(root, file) !== content) add('clients', file, 1, 'generated guide is missing or stale; run npm run docs:clients');
        if (!readme.includes(`<!-- faq:start -->\n${renderReadmeFaq(manifest)}\n<!-- faq:end -->`)) add('clients', 'README.md', 1, 'FAQ block differs from docs/clients.json; run npm run docs:clients');
        const troubleshooting = read(root, 'docs/troubleshooting.md').replace(/\r\n/g, '\n');
        if (!troubleshooting.includes(`<!-- faq:start -->\n${renderFaqList(manifest)}\n<!-- faq:end -->`)) add('clients', 'docs/troubleshooting.md', 1, 'FAQ block differs from docs/clients.json; run npm run docs:clients');
        for (const item of [...manifest.faq, ...(manifest.faqMore || [])]) {
          if (item.q.length + item.a.length > 500) add('clients', 'docs/clients.json', 1, `FAQ ${item.id} has ${item.q.length + item.a.length} characters; keep question plus answer at 500 or fewer`);
        }
        // Idiot-proof rule: every supported client x mode needs prerequisites, steps, a verification and a failure fix.
        for (const file of ['docs/guides/local-npm.md', 'docs/guides/server-docker.md']) {
          const guide = read(root, file);
          if (!guide) add('clients', file, 1, 'setup guide is missing');
          else for (const section of missingGuideSections(guide, ['Prerequisites', 'Check', 'If it fails'])) add('clients', file, 1, `guide is missing the "${section}" section`);
        }
        for (const client of manifest.clients) {
          for (const [mode, proof] of Object.entries(client.verified || {})) {
            const ageDays = (Date.now() - Date.parse(proof.date)) / 86_400_000;
            if (!(ageDays <= 90)) add('clients', 'docs/clients.json', 1, `${client.id} / ${mode} verification from ${proof.date} is older than 90 days or in the future; rerun the end-to-end check`);
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(client.checked || '')) add('clients', 'docs/clients.json', 1, `${client.id} has no checked date`);
          for (const source of client.sources || []) if (!/^https:\/\/\S+$/.test(source)) add('clients', 'docs/clients.json', 1, `${client.id} has a source that is not a plain https URL: ${source}`);
          const supported = ['local', 'server'].filter(mode => !client[mode].reason);
          if (!client[client.defaultMode] || client[client.defaultMode].reason || !supported.length) add('clients', 'docs/clients.json', 1, `${client.id} needs a supported default mode`);
          for (const mode of ['local', 'server']) {
            const connection = client[mode];
            if (connection.reason) continue;
            const missing = [];
            if ((connection.steps || []).length < 3) missing.push('at least 3 steps');
            if (!connection.verify?.prompt || !connection.verify?.expect) missing.push('a verify prompt and expected result');
            if (!(connection.fails || []).length) missing.push('an "if it fails" entry');
            if (!Array.isArray(connection.needs)) missing.push('a needs list');
            if (missing.length) add('clients', 'docs/clients.json', 1, `${client.id} / ${mode} is missing ${missing.join(', ')}`);
          }
          const guideFile = `docs/guides/clients/${client.id}.md`;
          const guide = read(root, guideFile);
          if (!guide) add('clients', guideFile, 1, `${client.id} has no guide`);
          else for (const section of missingGuideSections(guide)) add('clients', guideFile, 1, `guide is missing the "${section}" section`);
        }
        const mapped = new Map();
        for (const node of manifest.map || []) for (const id of node.clients) mapped.set(id, (mapped.get(id) || 0) + 1);
        for (const client of manifest.clients) {
          const count = mapped.get(client.id) || 0;
          if (!Object.hasOwn(ICON_PATHS, client.icon)) add('clients', 'docs/clients.json', 1, `${client.id} has unknown icon ${client.icon}`);
          if (client.id !== 'docker' && count !== 1) add('clients', 'docs/clients.json', 1, `${client.id} must be in exactly one map node (found ${count})`);
        }
        for (const id of mapped.keys()) if (!manifest.clients.some(client => client.id === id)) add('clients', 'docs/clients.json', 1, `map references unknown client ${id}`);
        if (new Set((manifest.map || []).map(node => node.id)).size !== (manifest.map || []).length) add('clients', 'docs/clients.json', 1, 'map node ids must be unique');
        const html = read(root, 'docs/index.html');
        if (html !== renderSite(root)) add('clients', 'docs/index.html', 1, 'client paths differ from docs/clients.json; run npm run docs:site');
        for (const problem of siteInstallProblems(html)) add('clients', 'docs/index.html', 1, problem);
        for (const text of [html, readme]) {
          for (const match of text.matchAll(/https:\/\/github\.com\/phillipboesger\/polarion-mcp\/blob\/main\/([^\s"')#]+)/g)) {
            if (!fs.existsSync(path.join(root, match[1]))) add('clients', text === html ? 'docs/index.html' : 'README.md', lineAt(text, match.index), `link target ${match[1]} does not exist`);
          }
        }
      }
    } catch (error) {
      add('clients', 'docs/clients.json', 1, `cannot render client table: ${error.message}`);
    }
  }

  // 1. Source/.env declarations and documented names must agree.
  const sourceEnv = new Map();
  for (const rel of filesUnder(root, 'src').filter(f => /\.[cm]?[jt]sx?$/.test(f))) {
    const text = read(root, rel);
    for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) sourceEnv.set(match[1], [rel, lineAt(text, match.index)]);
    for (const match of text.matchAll(/\benv\.([A-Z][A-Z0-9_]*)/g)) sourceEnv.set(match[1], [rel, lineAt(text, match.index)]);
  }
  const envExample = read(root, '.env.example');
  const envExampleVars = new Map([...envExample.matchAll(/^\s*([A-Z][A-Z0-9_]*)=/gm)].map(match => [match[1], ['.env.example', lineAt(envExample, match.index)]]));
  // These keys are read from the ProcessEnv object passed to specServerUrl().
  if (fs.existsSync(path.join(root, 'src/rest-api.ts'))) {
    const text = read(root, 'src/rest-api.ts');
    for (const name of ['PUBLIC_URL', 'RENDER_EXTERNAL_URL']) {
      const index = text.indexOf(`env.${name}`);
      if (index >= 0) sourceEnv.set(name, ['src/rest-api.ts', lineAt(text, index)]);
    }
  }
  const config = read(root, 'docs/configuration.md');
  // Configuration names are structured entries: the first cell of the
  // Environment variables table, or an env-style bullet. Avoid prose scanning.
  const configNames = new Map();
  let inEnvironmentTable = false;
  config.split('\n').forEach((line, index) => {
    const row = line.match(/^\s*\|\s*([^|]+?)\s*\|/);
    if (row) {
      const firstCell = row[1].trim();
      if (/^variable$/i.test(firstCell)) { inEnvironmentTable = true; return; }
      if (/^[-: ]+$/.test(firstCell)) return;
      if (inEnvironmentTable) {
        const name = firstCell.match(/`([A-Z][A-Z0-9_]*)`/);
        if (name) {
          const previous = configNames.get(name[1]);
          if (previous) add('configDuplicates', 'docs/configuration.md', index + 1, `${name[1]} is duplicated; first listed at line ${previous}`);
          else configNames.set(name[1], index + 1);
        }
      }
      return;
    }
    inEnvironmentTable = false;
    const bullet = line.match(/^\s*[-*]\s+`?([A-Z][A-Z0-9_]*)`?\s*:/);
    if (bullet) {
      const previous = configNames.get(bullet[1]);
      if (previous) add('configDuplicates', 'docs/configuration.md', index + 1, `${bullet[1]} is duplicated; first listed at line ${previous}`);
      else configNames.set(bullet[1], index + 1);
    }
  });
  const documented = new Map();
  for (const match of config.matchAll(/^\s*-\s+`?([A-Z][A-Z0-9_]*)(?:\s*\/\s*[A-Z][A-Z0-9_]*)?`?\s*:/gm)) documented.set(match[1], lineAt(config, match.index));
  for (const match of config.matchAll(/\b((?:API_KEY|BEARER_TOKEN|BASIC_USERNAME|BASIC_PASSWORD|OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET|OAUTH_SCOPES|OAUTH_TOKEN|OPENID_TOKEN)_<SCHEME>)/g)) documented.set(match[1], lineAt(config, match.index));
  // The shared ChatGPT OAuth bullet documents two variables on one line.
  for (const match of config.matchAll(/\b(GPT_CLIENT_ID|GPT_CLIENT_SECRET)\b/g)) documented.set(match[1], lineAt(config, match.index));
  for (const match of config.matchAll(/\b(?:API|BEARER|HTTP|MCP|GPT|TRUST|PUBLIC|RENDER|LOG|NODE)_[A-Z0-9_]+\b|\bPORT\b/g)) {
    if (config.slice(match.index + match[0].length).startsWith('<SCHEME>')) continue;
    if (!match[0].includes('<')) documented.set(match[0], lineAt(config, match.index));
  }
  const sourceText = filesUnder(root, 'src').map(file => read(root, file)).join('\n');
  const sourceFamilies = new Set(DYNAMIC_ENV_FAMILIES.filter(family => sourceText.includes(family.slice(0, -'<SCHEME>'.length) + '${')));
  // BEARER_TOKEN_<SCHEME> is constructed in config.ts then read via process.env[envName].
  if (/`BEARER_TOKEN_\$\{/.test(sourceText)) sourceFamilies.add('BEARER_TOKEN_<SCHEME>');
  const allEnvVars = new Map([...sourceEnv, ...envExampleVars]);
  for (const [name, source] of allEnvVars) {
    if (INTERNAL_ENV_IGNORES.has(name)) continue;
    const family = name.replace(/^(API_KEY|BEARER_TOKEN|BASIC_USERNAME|BASIC_PASSWORD|OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET|OAUTH_SCOPES|OAUTH_TOKEN|OPENID_TOKEN)_.+$/, '$1_<SCHEME>');
    if (DYNAMIC_ENV_FAMILIES.includes(family) && sourceFamilies.has(family) && documented.has(family)) continue;
    if (!documented.has(name)) add('env', source[0], source[1], `${name} is read or provided but is not listed in docs/configuration.md`);
  }
  for (const [name, line] of documented) {
    if (name.endsWith('_<SCHEME>')) {
      if (!sourceFamilies.has(name)) add('env', 'docs/configuration.md', line, `${name} is documented but no matching source env family was found`);
    } else if (!sourceEnv.has(name) && !INTERNAL_ENV_IGNORES.has(name)) add('env', 'docs/configuration.md', line, `${name} is documented but not read`);
  }

  // Parse the generated tool map safely: names and JSON inputSchema literals only.
  const toolsText = read(root, 'src/tools.ts');
  const tools = new Map();
  const entryRe = /^\s*\["([^"]+)", \{/gm;
  for (const entry of toolsText.matchAll(entryRe)) {
    const name = entry[1];
    const end = toolsText.indexOf('\n  }],', entry.index);
    const block = toolsText.slice(entry.index, end < 0 ? toolsText.indexOf('\n  }]', entry.index) : end);
    const schemaAt = block.indexOf('inputSchema: ');
    if (schemaAt >= 0) {
      const start = schemaAt + 'inputSchema: '.length;
      let depth = 0, inString = false, escaped = false, finish = start;
      for (; finish < block.length; finish++) {
        const c = block[finish];
        if (inString) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') inString = false; continue; }
        if (c === '"') inString = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) { finish++; break; }
      }
      try { tools.set(name, JSON.parse(block.slice(start, finish))); } catch { /* report malformed generated schema below */ }
    }
  }
  const actualCount = tools.size;
  const declaredCount = Number(toolsText.match(/Tool count:\s*(\d+)/)?.[1]);
  if (declaredCount !== actualCount) add('tools', 'src/tools.ts', 1, `generated header says ${declaredCount || 'no count'}; parsed ${actualCount} tool definitions`);
  for (const [file, text] of contents) {
    for (const m of text.matchAll(/\b(\d{2,4})\s+(?:Polarion\s+REST\s+)?(?:operations|tools)\b/gi)) if (+m[1] !== actualCount) add('tools', file, lineAt(text, m.index), `cites ${m[1]} tools/operations; src/tools.ts contains ${actualCount}`);
    for (const m of text.matchAll(/`((?:get|post|patch|delete|put)[A-Z][A-Za-z0-9]*)`/g)) if (!tools.has(m[1])) add('tools', file, lineAt(text, m.index), `unknown tool ${m[1]}`);
  }

  // 3. Resource URIs and prompt names cited in docs must exist in source.
  const polarion = read(root, 'src/polarion.ts');
  const resourceUris = new Set([...polarion.matchAll(/^\s*['"](polarion:\/\/[^'"]+)['"]\s*:/gm)].map(m => m[1]));
  const promptNames = new Set([...polarion.matchAll(/^\s*name:\s*'([a-z]+(?:-[a-z]+)+)'/gm)].map(m => m[1]));
  for (const [file, text] of contents) {
    for (const m of text.matchAll(/`(polarion:\/\/[A-Za-z0-9_./*-]+)`/g)) {
      if (m[1].endsWith('/*') && [...resourceUris].some(uri => uri.startsWith(m[1].slice(0, -1)))) continue;
      if (!resourceUris.has(m[1])) add('prompts', file, lineAt(text, m.index), `unknown resource URI ${m[1]}`);
    }
    for (const m of text.matchAll(/`([a-z]+(?:-[a-z]+)+)`/g)) if (/-work-items?$/.test(m[1]) && !promptNames.has(m[1])) add('prompts', file, lineAt(text, m.index), `unknown prompt ${m[1]}`);
    for (const m of text.matchAll(/\b([a-z]+-(?:work-item|work-items))\b/g)) if (text[m.index - 1] !== '`' && !promptNames.has(m[1])) add('prompts', file, lineAt(text, m.index), `unknown prompt ${m[1]}`);
    for (const m of text.matchAll(/polarion:\/\/[A-Za-z0-9_./*-]+/g)) {
      if (m[0].endsWith('/*') || resourceUris.has(m[0])) continue;
      add('prompts', file, lineAt(text, m.index), `unknown resource URI ${m[0]}`);
    }
  }

  // 4. Resolve relative Markdown targets and GitHub-style heading anchors.
  const slugsFor = text => {
    const seen = new Map(); const slugs = [];
    for (const h of text.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
      const title = h[1].replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').toLowerCase();
      const base = title.replace(/[\s]+/g, '-').replace(/[^\w-]/g, '');
      const n = seen.get(base) || 0; seen.set(base, n + 1); slugs.push({ slug: n ? `${base}-${n}` : base, line: lineAt(text, h.index) });
    }
    return slugs;
  };
  for (const [file, text] of contents) {
    const headings = slugsFor(text);
    const targets = new Set(headings.map(h => h.slug));
    for (const m of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1].trim().replace(/^<|>$/g, '').split(/\s+/)[0];
      if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
      const hashAt = target.indexOf('#'); const fragment = hashAt >= 0 ? decodeURIComponent(target.slice(hashAt + 1)) : '';
      const page = hashAt >= 0 ? target.slice(0, hashAt) : target;
      const destination = page ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(page))) : file;
      if (page && !fs.existsSync(path.join(root, destination))) add('links', file, lineAt(text, m.index), `missing link target ${page}`);
      else if (fragment && destination.endsWith('.md') && fs.existsSync(path.join(root, destination)) && !slugsFor(read(root, destination)).some(h => h.slug === fragment)) add('links', file, lineAt(text, m.index), `missing #${fragment} in ${destination}`);
      else if (fragment && !page && !targets.has(fragment)) add('links', file, lineAt(text, m.index), `missing #${fragment}`);
    }
    if (file === 'README.md') {
      const toc = [...text.matchAll(/^\s*[-*]\s+\[[^\]]+\]\(#([^)]+)\)/gm)].map(m => m[1]);
      const sectionSlugs = [...text.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)]
        .map(h => slugsFor(`# ${h[1]}`)[0]?.slug).filter(s => s && s !== 'table-of-contents');
      const listedSections = toc.filter(slug => sectionSlugs.includes(slug));
      if (sectionSlugs.join('|') !== listedSections.join('|')) add('links', file, Math.max(1, lineAt(text, Math.max(0, text.indexOf('## Table of Contents')))), `README TOC does not list every level-two heading in order`);
    }
  }

  // 5. JSON tool-call examples are checked against the generated JSON Schemas.
  for (const [file, text] of contents) {
    for (const fence of text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)) {
      const body = fence[1];
      let value;
      try { value = JSON.parse(body); } catch {
        if (/"(?:tool|toolName|name)"\s*:/.test(body) && /"arguments"\s*:/.test(body)) add('examples', file, lineAt(text, fence.index), 'tool-call example is not valid JSON');
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const name = value.tool ?? value.toolName ?? (value.name && value.arguments ? value.name : undefined);
      if (!name) continue;
      const schema = tools.get(name);
      const line = lineAt(text, fence.index);
      if (!schema) { add('examples', file, line, `example names unknown tool ${name}`); continue; }
      const args = value.arguments ?? value.input ?? {};
      const errors = validate(args, schema, '$');
      for (const error of errors) add('examples', file, line, `${name} arguments ${error}`);
    }
  }

  // 6. These docs are deliberately kept CRLF for downstream tooling.
  for (const file of ['docs/configuration.md', 'docs/deployment.md', 'docs/security.md']) {
    const bytes = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file)) : Buffer.alloc(0);
    const text = bytes.toString('utf8');
    if (!text.includes('\r\n') || /(^|[^\r])\n/.test(text)) add('endings', file, 1, 'file must use CRLF throughout with no bare LF');
  }

  // 7. Website tool counts must agree with README and the source tool map.
  const website = read(root, 'docs/index.html');
  const countRx = /\b(\d{2,4})\s+(?:Polarion\s+REST\s+)?(?:operations|tools)\b/gi;
  const readmeCounts = [...readme.matchAll(countRx)].map(m => +m[1]);
  for (const m of website.replace(/<!-- domains:start -->[\s\S]*?<!-- domains:end -->/, '').matchAll(countRx)) if (+m[1] !== actualCount || (readmeCounts.length && +m[1] !== readmeCounts[0])) add('website', 'docs/index.html', lineAt(website, m.index), `website cites ${m[1]}; README/source count is ${readmeCounts[0] ?? actualCount}/${actualCount}`);

  // 8. Optional clients manifest. Absence is intentionally silent.
  const clientsPath = path.join(root, 'docs/clients.json');
  if (fs.existsSync(clientsPath)) {
    let listed = new Set(); let valid = false;
    try {
      const data = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
      valid = !!data && Array.isArray(data.clients) && data.clients.every(c => c && typeof c.name === 'string' && c.name.trim());
      if (valid) listed = new Set(data.clients.map(c => c.name));
    } catch { /* reported below */ }
    if (!valid) add('clients', 'docs/clients.json', 1, 'expected {"clients":[{"name":"..."}]}');
    else for (const file of markdown) {
      const text = contents.get(file);
      // Only tables whose header's first cell is "Client"/"MCP client" are client matrices.
      let inClientTable = false;
      text.split('\n').forEach((line, i) => {
        const cells = line.match(/^\|\s*([^|]+?)\s*\|/);
        if (!cells) { inClientTable = false; return; }
        const first = cells[1].trim();
        if (/^(mcp )?clients?$/i.test(first)) { inClientTable = true; return; }
        const clientName = first.replace(/\s+\(unverified\)$/i, '');
        if (inClientTable && !/^[-: ]+$/.test(first) && !listed.has(clientName)) add('clients', file, i + 1, `client table references unlisted client ${first}`);
      });
    }
  }
  return findings;
}

function validate(value, schema, at) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  if (schema.anyOf) {
    if (!schema.anyOf.some(option => validate(value, option, at).length === 0)) errors.push(`does not match any allowed schema at ${at}`);
    return errors;
  }
  if (schema.oneOf) {
    if (schema.oneOf.filter(option => validate(value, option, at).length === 0).length !== 1) errors.push(`does not match exactly one allowed schema at ${at}`);
    return errors;
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`must be an object at ${at}`];
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`is missing required ${at}.${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validate(item, schema.properties[key], `${at}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`has unknown ${at}.${key}`);
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) errors.push(`has fewer than ${schema.minProperties} properties at ${at}`);
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) errors.push(`has more than ${schema.maxProperties} properties at ${at}`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) errors.push(`must be an array at ${at}`);
    else if (schema.items) value.forEach((item, i) => errors.push(...validate(item, schema.items, `${at}[${i}]`)));
    if (Array.isArray(value) && schema.minItems !== undefined && value.length < schema.minItems) errors.push(`has fewer than ${schema.minItems} items at ${at}`);
    if (Array.isArray(value) && schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`has more than ${schema.maxItems} items at ${at}`);
  } else if (schema.type === 'string' && typeof value !== 'string') errors.push(`must be a string at ${at}`);
  else if (schema.type === 'number' && typeof value !== 'number') errors.push(`must be a number at ${at}`);
  else if (schema.type === 'integer' && !Number.isInteger(value)) errors.push(`must be an integer at ${at}`);
  else if (schema.type === 'boolean' && typeof value !== 'boolean') errors.push(`must be a boolean at ${at}`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`is shorter than ${schema.minLength} characters at ${at}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`is longer than ${schema.maxLength} characters at ${at}`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`does not match the required pattern at ${at}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`is below ${schema.minimum} at ${at}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`is above ${schema.maximum} at ${at}`);
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`must be one of ${schema.enum.join(', ')} at ${at}`);
  return errors;
}

try {
  const options = cli(process.argv.slice(2));
  if (options.help) { console.log('Usage: node scripts/check-docs.mjs [--strict] [--root <dir>]'); process.exit(0); }
  const findings = checker(options.root);
  if (!findings.length) console.log('check:docs: no findings');
  else for (const finding of findings) console.log(`WARNING ${finding.rule} ${finding.file}:${finding.line}: ${finding.message}`);
  console.log(`check:docs: ${findings.length} finding(s)`);
  if (options.strict && findings.length) process.exitCode = 1;
} catch (error) {
  console.error(`check:docs: ${error.message}`);
  process.exitCode = 2;
}
