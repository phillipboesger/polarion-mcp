#!/usr/bin/env node
/**
 * Safe Polarion tool generator.
 *
 * `openapi-mcp-generator` emits a single monolithic `src/index.ts` that inlines a
 * `toolDefinitionMap` and a `securitySchemes` object. This repository instead uses
 * a hand-written, modular architecture (server factory + three transports), so we
 * must NOT let the generator overwrite our source tree.
 *
 * This script extracts only the two generated data structures from the generator's
 * output and writes them into `src/tools.ts`, leaving every hand-written module
 * untouched. That makes "support a newer Polarion version" a safe, repeatable step.
 *
 * Usage:
 *   node scripts/generate-tools.mjs <generated-index.ts> <output-tools.ts>
 * Defaults:
 *   <generated-index.ts> = .gen/src/index.ts
 *   <output-tools.ts>    = src/tools.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';

const inputPath = process.argv[2] || '.gen/src/index.ts';
const outputPath = process.argv[3] || 'src/tools.ts';

/**
 * Returns the index just past the bracket/brace that opens at `openIndex`,
 * matching depth while ignoring brackets inside string literals.
 *
 * @param {string} src - Source text.
 * @param {number} openIndex - Index of the opening `[` or `{`.
 * @returns {number} Index immediately after the matching closing bracket.
 */
function findMatchingClose(src, openIndex) {
  const open = src[openIndex];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let quote = null; // ', ", or `
  for (let i = openIndex; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }      // skip escaped char
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error(`Unbalanced ${open} starting at index ${openIndex}`);
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * Splits a `[...]`-wrapped array literal's text into its top-level element
 * substrings (without the outer brackets), honoring nested brackets/braces
 * and quoted strings so commas inside them aren't mistaken for separators.
 *
 * @param {string} arrayText - Text starting with `[` and ending with `]`.
 * @returns {string[]} One string per top-level array element.
 */
function splitTopLevelArrayEntries(arrayText) {
  const inner = arrayText.slice(1, -1);
  const entries = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      entries.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  const last = inner.slice(start);
  if (last.trim()) entries.push(last);
  return entries;
}

/**
 * Injects a `dry_run` boolean property into a tool's `inputSchema.properties`
 * for mutating HTTP methods (post/put/patch/delete), so it survives
 * regeneration instead of only existing as a hand-edit on `src/tools.ts`.
 *
 * @param {string} mapArrayText - The raw `[...]` text of `toolDefinitionMap`'s entries.
 * @returns {{ text: string, mutatingCount: number }} The (possibly modified) array text and how many tools got `dry_run`.
 */
function injectDryRunIntoMap(mapArrayText) {
  let mutatingCount = 0;
  const entries = splitTopLevelArrayEntries(mapArrayText).map((entry) => {
    const methodMatch = /method:\s*"([^"]+)"/.exec(entry);
    if (!methodMatch || !MUTATING_METHODS.has(methodMatch[1].toLowerCase())) return entry;

    const inputSchemaAnchor = /inputSchema:\s*/.exec(entry);
    if (!inputSchemaAnchor) return entry;
    const braceStart = entry.indexOf('{', inputSchemaAnchor.index);
    if (braceStart === -1) return entry;
    const braceEnd = findMatchingClose(entry, braceStart);

    const schema = JSON.parse(entry.slice(braceStart, braceEnd));
    if (!schema.properties || typeof schema.properties !== 'object') schema.properties = {};
    schema.properties.dry_run = {
      type: 'boolean',
      description: 'If true, validate and return the request that would be sent without calling Polarion.',
    };

    mutatingCount++;
    return entry.slice(0, braceStart) + JSON.stringify(schema) + entry.slice(braceEnd);
  });
  return { text: `[${entries.join(',')}]`, mutatingCount };
}

const generated = readFileSync(inputPath, 'utf8');

// const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([ ... ])
const mapAnchor = /const\s+toolDefinitionMap\s*:\s*Map<string,\s*McpToolDefinition>\s*=\s*new Map\(\[/;
const mapMatch = mapAnchor.exec(generated);
if (!mapMatch) throw new Error('toolDefinitionMap not found in generated output');
const mapArrayStart = generated.indexOf('[', mapMatch.index);
const mapArrayEnd = findMatchingClose(generated, mapArrayStart);
const rawMapArray = generated.slice(mapArrayStart, mapArrayEnd); // [...]
const { text: mapArray, mutatingCount } = injectDryRunIntoMap(rawMapArray);

// const securitySchemes = { ... }
const secAnchor = /const\s+securitySchemes\s*=\s*\{/;
const secMatch = secAnchor.exec(generated);
if (!secMatch) throw new Error('securitySchemes not found in generated output');
const secObjStart = generated.indexOf('{', secMatch.index);
const secObjEnd = findMatchingClose(generated, secObjStart);
const secObj = generated.slice(secObjStart, secObjEnd); // {...}

const toolCount = (mapArray.match(/name:\s*"/g) || []).length;

const out = `import type { McpToolDefinition } from "./types.js";

// AUTO-GENERATED from the Polarion OpenAPI definition. Do not edit by hand.
// Regenerate with: npm run regenerate  (see docs/openapi-and-generation.md)
// Tool count: ${toolCount}

export const toolDefinitionMap: Map<string, McpToolDefinition> = new Map(${mapArray});

export const securitySchemes = ${secObj};
`;

writeFileSync(outputPath, out, 'utf8');
console.log(`Wrote ${outputPath} with ${toolCount} tools and securitySchemes.`);
console.log(`Injected dry_run into ${mutatingCount} mutating tool schema(s).`);
