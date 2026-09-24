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
 * 3. A "Cardinality:" sentence + named alternative on tools that share a
 *    resource path and HTTP method with a sibling that targets a single
 *    item by ID vs. the full collection/a batch — e.g. `deleteCollection`
 *    (one item, by ID) vs. `deleteCollections` (a batch, no ID). This is a
 *    different axis from "Scope:" (breadth of query) and can co-occur with
 *    it on the same tool.
 * 4. Rich, concrete descriptions (see `PARAM_DESCRIPTIONS` in
 *    `lib/entry-utils.mjs`) for the ~23 parameter names whose *original*
 *    OpenAPI text is uniform boilerplate across every tool that has them
 *    (`projectId`, `fields`, `query`, pagination, etc.), replacing that
 *    boilerplate with concrete format/constraint guidance. Deliberately
 *    excludes a couple of names (see the dictionary's own comment) whose
 *    original text carries tool-specific nuance a generic replacement
 *    would lose.
 * 5. An "Effect:" sentence on non-GET tools, truthfully derived from the
 *    tool's method + annotations + two structural signals (irreversible /
 *    idempotent / creates a duplicate / triggers a server-side action) —
 *    see `effectNoteForAnnotations` in `lib/entry-utils.mjs` for why method
 *    + annotations alone aren't safe enough to assert idempotency or
 *    "creates a duplicate" from.
 * 6. A "Tip:" sentence on every tool that accepts `dry_run`, pointing an
 *    agent at it before a mutating call.
 * 7. A hand-written lead description (see `TOOL_GUIDANCE` in
 *    `lib/tool-guidance.mjs`) replacing the generated OpenAPI summary on
 *    tools where that summary is too generic to pick the tool by, keeping
 *    every generated note above appended after it.
 *
 * Usage: node scripts/enrich-tool-metadata.mjs [path/to/tools.ts]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  extractToolDefinitionMapArray,
  splitTopLevelArrayEntries,
  annotationsForMethod,
  withInputSchema,
  hasSchemaProperty,
  PARAM_DESCRIPTIONS,
  effectNoteForAnnotations,
} from './lib/entry-utils.mjs';
import { TOOL_GUIDANCE } from './lib/tool-guidance.mjs';

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

/**
 * Returns a path template's "resource root" by stripping trailing
 * `{param}` segments, so an item path (`/collections/{collectionId}`) and
 * its collection path (`/collections`) resolve to the same root.
 *
 * @param {string} pathTemplate - OpenAPI-style path template.
 * @returns {string} The resource root path.
 */
function resourceRoot(pathTemplate) {
  const segments = pathTemplate.split('/').filter(Boolean);
  while (segments.length && /^\{[^}]+\}$/.test(segments[segments.length - 1])) segments.pop();
  return segments.join('/');
}

/**
 * Whether a path template addresses a single item (ends in a `{param}`
 * segment) rather than a collection.
 *
 * @param {string} pathTemplate - OpenAPI-style path template.
 * @returns {boolean} True if the path ends with a `{param}` segment.
 */
function isItemPath(pathTemplate) {
  const segments = pathTemplate.split('/').filter(Boolean);
  return segments.length > 0 && /^\{[^}]+\}$/.test(segments[segments.length - 1]);
}

/**
 * Finds item-vs-collection sibling pairs: tools that share an HTTP method
 * and resource root, where one targets a single item by ID and the other
 * targets the full collection or a batch (e.g. `deleteCollection` vs.
 * `deleteCollections`).
 *
 * @param {string[]} names - Every tool name in the map, by entry index.
 * @param {string[]} methods - Every tool's lowercase HTTP method, by entry index.
 * @param {string[]} pathTemplates - Every tool's path template, by entry index.
 * @returns {Array<{ item: string, collection: string }>} Sibling pairs.
 */
function findCardinalityPairs(names, methods, pathTemplates) {
  const groups = new Map(); // `${method}:${resourceRoot}` -> indices sharing it
  names.forEach((_, i) => {
    const key = `${methods[i]}:${resourceRoot(pathTemplates[i])}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  });

  const pairs = [];
  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    const items = indices.filter((i) => isItemPath(pathTemplates[i]));
    const collections = indices.filter((i) => !isItemPath(pathTemplates[i]));
    for (const itemIdx of items) {
      for (const collectionIdx of collections) {
        pairs.push({ item: names[itemIdx], collection: names[collectionIdx] });
      }
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
const CARDINALITY_MARKER = 'Cardinality:';
const EFFECT_MARKER = 'Effect:';
const TIP_MARKER = 'Tip:';

/**
 * Replaces parameter descriptions with the rich text from
 * `PARAM_DESCRIPTIONS` wherever the name matches and the current
 * description doesn't already equal it — an exact-match guard, so this is
 * idempotent without needing to guess at "already good enough" heuristics
 * (a length threshold would wrongly treat the original OpenAPI boilerplate
 * as already-enriched, since several of its descriptions embed a long doc
 * URL and are already >100 chars despite adding no real semantics).
 *
 * A missing/malformed `inputSchema` (the `ok: false` case from
 * `withInputSchema`) is reported back via `failed` rather than silently
 * treated as "nothing to enrich" -- on a codebase where every real tool
 * entry always has an `inputSchema`, that case means the text-scanning
 * assumptions broke, and the caller folds it into the same loud-fail
 * safety net as the Scope:/Cardinality: note skips below.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @returns {{ entry: string, count: number, failed: boolean }} The (possibly modified) entry, how many properties were enriched, and whether the schema was unreadable.
 */
function enrichParameterDescriptions(entry) {
  let count = 0;
  const { entry: updated, ok } = withInputSchema(entry, (schema) => {
    if (!schema.properties || typeof schema.properties !== 'object') return null;
    let changed = false;
    for (const [name, def] of Object.entries(schema.properties)) {
      const rich = PARAM_DESCRIPTIONS[name];
      if (!rich || !def || typeof def !== 'object') continue;
      if (def.description === rich) continue;
      def.description = rich;
      changed = true;
      count++;
    }
    return changed ? schema : null;
  });
  return { entry: updated, count, failed: !ok };
}

/**
 * Reads a tool entry's already-injected `annotations: {...}` field.
 * Annotations are always a flat object (see `annotationsForMethod`), so a
 * non-greedy regex is safe here unlike the nested `inputSchema`/`description`
 * fields, which need brace/quote-aware scanning.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @returns {Record<string, boolean>} Parsed annotations, or `{}` if absent/malformed.
 */
function getAnnotationsField(entry) {
  const match = /annotations:\s*(\{[^}]*\})/.exec(entry);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

/**
 * Finds a `description: \`...\`` field's content boundaries in a raw entry,
 * walking char-by-char and treating a backslash as escaping the next
 * character (mirroring `findMatchingClose`'s quote handling in
 * `entry-utils.mjs`). A naive `[^`]*` regex capture cannot span a backtick
 * that's already been escaped into the description by a prior enrichment
 * pass (e.g. a `Scope:` note's `` \`toolName\` `` reference), and silently
 * fails to match instead of finding the real closing backtick.
 *
 * Also verifies the field immediately following the closing backtick is
 * `,` then `inputSchema:` (the generator's fixed field order), so an
 * unexpectedly-shaped entry is rejected rather than corrupted.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @returns {{ contentStart: number, contentEnd: number } | null} Offsets of the description content, or null if not found/unexpected shape.
 */
function findDescriptionBounds(entry) {
  const anchor = /description:\s*`/.exec(entry);
  if (!anchor) return null;
  const contentStart = anchor.index + anchor[0].length;
  let i = contentStart;
  while (i < entry.length && entry[i] !== '`') {
    i += entry[i] === '\\' ? 2 : 1;
  }
  if (i >= entry.length) return null; // unterminated
  if (!/^`,\s*\n\s*inputSchema:/.test(entry.slice(i))) return null;
  return { contentStart, contentEnd: i };
}

/**
 * Appends a note to a tool's description.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @param {string} marker - Marker text used to detect this note already exists (idempotency).
 * @param {string} note - Note text to append.
 * @returns {{ entry: string, skipped: boolean }} The (possibly modified) entry, and whether it was skipped due to an unexpected description shape.
 */
function appendNote(entry, marker, note) {
  if (entry.includes(marker)) return { entry, skipped: false }; // already enriched
  const bounds = findDescriptionBounds(entry);
  if (!bounds) return { entry, skipped: true }; // unexpected shape -- skip rather than corrupt
  const { contentStart, contentEnd } = bounds;
  const text = entry.slice(contentStart, contentEnd);
  const separator = /[.!?]\s*$/.test(text) ? ' ' : '. ';
  const updated = entry.slice(0, contentEnd) + separator + note + entry.slice(contentEnd);
  return { entry: updated, skipped: false };
}

/**
 * Replaces a tool description's lead -- the text before the first generated
 * note marker -- with `lead`, keeping the notes that follow it. Rewriting the
 * same lead again is a no-op, so this is idempotent.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @param {string} lead - Plain (unescaped) replacement lead text.
 * @returns {{ entry: string, skipped: boolean }} The (possibly modified) entry, and whether it was skipped due to an unexpected description shape.
 */
function replaceLead(entry, lead) {
  const bounds = findDescriptionBounds(entry);
  if (!bounds) return { entry, skipped: true };
  const { contentStart, contentEnd } = bounds;
  const text = entry.slice(contentStart, contentEnd);
  const markerAt = [SCOPE_MARKER, CARDINALITY_MARKER, EFFECT_MARKER, TIP_MARKER]
    .map((marker) => text.indexOf(` ${marker}`))
    .filter((i) => i >= 0);
  const leadEnd = markerAt.length ? Math.min(...markerAt) : text.length;
  // The description is a template literal in tools.ts: escape the characters
  // that would end it or start an interpolation.
  const escaped = lead.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const updated = entry.slice(0, contentStart) + escaped + text.slice(leadEnd) + entry.slice(contentEnd);
  return { entry: updated, skipped: false };
}

function appendScopeNote(entry, note) {
  return appendNote(entry, SCOPE_MARKER, note);
}

function appendCardinalityNote(entry, note) {
  return appendNote(entry, CARDINALITY_MARKER, note);
}

const src = readFileSync(filePath, 'utf8');
const { start, end, text: mapArrayText } = extractToolDefinitionMapArray(src);
let entries = splitTopLevelArrayEntries(mapArrayText);

const names = entries.map((e) => getField(e, 'name'));
const scopePairs = findScopePairs(names);

const unknownGuidance = Object.keys(TOOL_GUIDANCE).filter((name) => !names.includes(name));
if (unknownGuidance.length) {
  throw new Error(`TOOL_GUIDANCE names tools that no longer exist: ${unknownGuidance.join(', ')}`);
}
let leadCount = 0;
let leadSkipped = 0;
entries = entries.map((entry, i) => {
  const lead = TOOL_GUIDANCE[names[i]];
  if (!lead) return entry;
  const result = replaceLead(entry, lead);
  if (result.skipped) leadSkipped++;
  else if (result.entry !== entry) leadCount++;
  return result.entry;
});

let annotationCount = 0;
entries = entries.map((entry) => {
  const before = entry;
  const updated = injectAnnotations(entry);
  if (updated !== before) annotationCount++;
  return updated;
});

let scopeNoteCount = 0;
let scopeNoteSkipped = 0;
const byName = new Map(entries.map((e, i) => [names[i], i]));
for (const { wide, narrow } of scopePairs) {
  const wideIdx = byName.get(wide);
  const narrowIdx = byName.get(narrow);
  if (wideIdx === undefined || narrowIdx === undefined) continue;

  const beforeWide = entries[wideIdx];
  const wideResult = appendScopeNote(
    entries[wideIdx],
    `Scope: spans every project (no project filter). To act on a single project, use \\\`${narrow}\\\` instead.`,
  );
  entries[wideIdx] = wideResult.entry;
  if (wideResult.skipped) scopeNoteSkipped++;
  else if (entries[wideIdx] !== beforeWide) scopeNoteCount++;

  const beforeNarrow = entries[narrowIdx];
  const narrowResult = appendScopeNote(
    entries[narrowIdx],
    `Scope: one project (requires a project ID). To act across all projects, use \\\`${wide}\\\` instead.`,
  );
  entries[narrowIdx] = narrowResult.entry;
  if (narrowResult.skipped) scopeNoteSkipped++;
  else if (entries[narrowIdx] !== beforeNarrow) scopeNoteCount++;
}

const methods = entries.map((e) => (getField(e, 'method') || 'get').toLowerCase());
const pathTemplates = entries.map((e) => getField(e, 'pathTemplate') || '');
const cardinalityPairs = findCardinalityPairs(names, methods, pathTemplates);

// A tool can have more than one opposite-cardinality sibling (rare), so
// aggregate per tool before appending a single note.
const collectionsByItem = new Map(); // item name -> [collection names]
const itemsByCollection = new Map(); // collection name -> [item names]
for (const { item, collection } of cardinalityPairs) {
  if (!collectionsByItem.has(item)) collectionsByItem.set(item, []);
  collectionsByItem.get(item).push(collection);
  if (!itemsByCollection.has(collection)) itemsByCollection.set(collection, []);
  itemsByCollection.get(collection).push(item);
}

let cardinalityNoteCount = 0;
let cardinalityNoteSkipped = 0;
for (const [item, collections] of collectionsByItem) {
  const idx = byName.get(item);
  if (idx === undefined) continue;
  const names_ = collections.map((n) => `\\\`${n}\\\``).join(', ');
  const before = entries[idx];
  const result = appendCardinalityNote(
    entries[idx],
    `Cardinality: targets a single item by ID. For the full collection or a batch, use ${names_} instead.`,
  );
  entries[idx] = result.entry;
  if (result.skipped) cardinalityNoteSkipped++;
  else if (entries[idx] !== before) cardinalityNoteCount++;
}
for (const [collection, items] of itemsByCollection) {
  const idx = byName.get(collection);
  if (idx === undefined) continue;
  const names_ = items.map((n) => `\\\`${n}\\\``).join(', ');
  const before = entries[idx];
  const result = appendCardinalityNote(
    entries[idx],
    `Cardinality: targets the full collection or a batch. For a single item by ID, use ${names_} instead.`,
  );
  entries[idx] = result.entry;
  if (result.skipped) cardinalityNoteSkipped++;
  else if (entries[idx] !== before) cardinalityNoteCount++;
}

let paramEnrichedCount = 0;
let paramEnrichedSchemaFailed = 0;
entries = entries.map((entry) => {
  const { entry: updated, count, failed } = enrichParameterDescriptions(entry);
  paramEnrichedCount += count;
  if (failed) paramEnrichedSchemaFailed++;
  return updated;
});

let effectNoteCount = 0;
let effectNoteSkipped = 0;
entries = entries.map((entry, i) => {
  const { has: hasWorkflowAction, ok: workflowActionOk } = hasSchemaProperty(entry, 'workflowAction');
  if (!workflowActionOk) effectNoteSkipped++; // unreadable inputSchema -- can't safely reason about this tool's effect
  const note = effectNoteForAnnotations(methods[i], getAnnotationsField(entry), {
    pathTemplate: pathTemplates[i],
    hasWorkflowAction,
  });
  if (!note) return entry;
  const before = entry;
  const result = appendNote(entry, EFFECT_MARKER, note);
  if (result.skipped) effectNoteSkipped++;
  else if (result.entry !== before) effectNoteCount++;
  return result.entry;
});

let dryRunTipCount = 0;
let dryRunTipSkipped = 0;
entries = entries.map((entry) => {
  const { has: hasDryRun, ok } = hasSchemaProperty(entry, 'dry_run');
  if (!ok) {
    dryRunTipSkipped++; // unreadable inputSchema -- can't safely tell if this tool has dry_run
    return entry;
  }
  if (!hasDryRun) return entry;
  const before = entry;
  const result = appendNote(
    entry,
    TIP_MARKER,
    'Tip: set \\`dry_run: true\\` first to preview the exact request Polarion would receive, without changing anything. On tools with a typed output schema, this preview is returned as an error-flagged result since it is not real tool output -- read the text content regardless of that flag.',
  );
  if (result.skipped) dryRunTipSkipped++;
  else if (result.entry !== before) dryRunTipCount++;
  return result.entry;
});

const newMapArrayText = `[${entries.join(',')}]`;
const out = src.slice(0, start) + newMapArrayText + src.slice(end);
writeFileSync(filePath, out, 'utf8');

console.log(`Enriched ${filePath}:`);
console.log(`  annotations added/verified: ${annotationCount} tool(s) newly annotated`);
console.log(`  scope-pair siblings found: ${scopePairs.length}`);
console.log(`  scope notes added: ${scopeNoteCount}${scopeNoteSkipped ? ` (${scopeNoteSkipped} SKIPPED -- unexpected description shape)` : ''}`);
console.log(`  cardinality-pair siblings found: ${cardinalityPairs.length}`);
console.log(`  cardinality notes added: ${cardinalityNoteCount}${cardinalityNoteSkipped ? ` (${cardinalityNoteSkipped} SKIPPED -- unexpected description shape)` : ''}`);
console.log(`  parameter descriptions enriched: ${paramEnrichedCount}${paramEnrichedSchemaFailed ? ` (${paramEnrichedSchemaFailed} SKIPPED -- unreadable inputSchema)` : ''}`);
console.log(`  effect notes added: ${effectNoteCount}${effectNoteSkipped ? ` (${effectNoteSkipped} SKIPPED -- unexpected description shape or unreadable inputSchema)` : ''}`);
console.log(`  curated lead descriptions applied: ${leadCount}${leadSkipped ? ` (${leadSkipped} SKIPPED -- unexpected description shape)` : ''}`);
console.log(`  dry_run tips added: ${dryRunTipCount}${dryRunTipSkipped ? ` (${dryRunTipSkipped} SKIPPED -- unexpected description shape or unreadable inputSchema)` : ''}`);

const totalSkipped = leadSkipped + scopeNoteSkipped + cardinalityNoteSkipped + paramEnrichedSchemaFailed + effectNoteSkipped + dryRunTipSkipped;
if (totalSkipped > 0) {
  throw new Error(
    `${totalSkipped} note(s) were skipped due to an unexpected description shape -- ` +
    'investigate before trusting this regeneration (see findDescriptionBounds in this file).',
  );
}
