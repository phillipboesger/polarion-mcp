#!/usr/bin/env node
/**
 * Backfills tool-quality metadata directly onto `src/tools.ts`.
 *
 * `generate-tools.mjs` now injects this metadata for every future
 * regeneration from a fresh OpenAPI spec, but the currently checked-in
 * `src/tools.ts` predates that change. This script applies the same two
 * enrichments in place, idempotently, without requiring a live Polarion
 * instance to regenerate from:
 *
 * 1. `annotations` (readOnlyHint/destructiveHint/idempotentHint/openWorldHint)
 *    on every tool, derived from its HTTP method.
 * 2. A "Scope:" sentence + named alternative on tools that have a
 *    same-shaped sibling at a different scope — e.g. `getAllWorkItems`
 *    (all projects) vs. `getWorkItems` (one project), or
 *    `getGlobalEnumeration` (global) vs. `getProjectEnumeration` (one
 *    project) — so the description tells an AI agent which of two
 *    similarly-named tools to pick.
 *
 * Usage: node scripts/enrich-tool-metadata.mjs [path/to/tools.ts]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  extractToolDefinitionMapArray,
  splitTopLevelArrayEntries,
  annotationsForMethod,
} from './lib/entry-utils.mjs';

const filePath = process.argv[2] || 'src/tools.ts';

/**
 * Finds sibling tool name pairs that operate on the same resource at two
 * different scopes, based on Polarion's naming convention:
 * - `getAllX` (path under `/all/...`) vs. `getX` (path under `/projects/{projectId}/...`)
 * - `getGlobalX` (path under `/...`) vs. `getProjectX` (path under `/projects/{projectId}/...`)
 *
 * @param {string[]} names - Every tool name in the map.
 * @returns {Array<{ wide: string, narrow: string }>} Pairs of [broader-scope, project-scoped] tool names.
 */
function findScopePairs(names) {
  const nameSet = new Set(names);
  const pairs = [];
  for (const name of names) {
    if (name.includes('All')) {
      const narrow = name.replace('All', '');
      if (narrow !== name && nameSet.has(narrow)) pairs.push({ wide: name, narrow });
    }
    if (name.includes('Global')) {
      const narrow = name.replace('Global', 'Project');
      if (nameSet.has(narrow)) pairs.push({ wide: name, narrow });
    }
  }
  return pairs;
}

function getField(entry, field) {
  const match = new RegExp(`${field}:\\s*"([^"]+)"`).exec(entry);
  return match ? match[1] : null;
}

function hasAnnotations(entry) {
  return /\n\s*annotations:\s*\{/.test(entry);
}

function injectAnnotations(entry) {
  if (hasAnnotations(entry)) return entry;
  const method = getField(entry, 'method');
  if (!method) return entry;
  const annotations = JSON.stringify(annotationsForMethod(method));
  return entry.replace(/method:\s*"[^"]+",/, (m) => `${m}\n    annotations: ${annotations},`);
}

const SCOPE_MARKER = 'Scope:';

function appendScopeNote(entry, note) {
  if (entry.includes(SCOPE_MARKER)) return entry; // already enriched
  return entry.replace(/(description: `)([^`]*)(`,)/, (_m, open, text, close) => {
    const separator = /[.!?]\s*$/.test(text) ? ' ' : '. ';
    return `${open}${text}${separator}${note}${close}`;
  });
}

const src = readFileSync(filePath, 'utf8');
const { start, end, text: mapArrayText } = extractToolDefinitionMapArray(src);
let entries = splitTopLevelArrayEntries(mapArrayText);

const names = entries.map((e) => getField(e, 'name'));
const scopePairs = findScopePairs(names);

let annotationCount = 0;
entries = entries.map((entry) => {
  const before = entry;
  const updated = injectAnnotations(entry);
  if (updated !== before) annotationCount++;
  return updated;
});

let scopeNoteCount = 0;
const byName = new Map(entries.map((e, i) => [names[i], i]));
for (const { wide, narrow } of scopePairs) {
  const wideIdx = byName.get(wide);
  const narrowIdx = byName.get(narrow);
  if (wideIdx === undefined || narrowIdx === undefined) continue;

  const beforeWide = entries[wideIdx];
  entries[wideIdx] = appendScopeNote(
    entries[wideIdx],
    `Scope: spans every project (no project filter). To act on a single project, use \\\`${narrow}\\\` instead.`,
  );
  if (entries[wideIdx] !== beforeWide) scopeNoteCount++;

  const beforeNarrow = entries[narrowIdx];
  entries[narrowIdx] = appendScopeNote(
    entries[narrowIdx],
    `Scope: one project (requires a project ID). To act across all projects, use \\\`${wide}\\\` instead.`,
  );
  if (entries[narrowIdx] !== beforeNarrow) scopeNoteCount++;
}

const newMapArrayText = `[${entries.join(',')}]`;
const out = src.slice(0, start) + newMapArrayText + src.slice(end);
writeFileSync(filePath, out, 'utf8');

console.log(`Enriched ${filePath}:`);
console.log(`  annotations added/verified: ${annotationCount} tool(s) newly annotated`);
console.log(`  scope-pair siblings found: ${scopePairs.length}`);
console.log(`  scope notes added: ${scopeNoteCount}`);
