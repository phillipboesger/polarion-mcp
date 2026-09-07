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
import { findMatchingClose, splitTopLevelArrayEntries, annotationsForMethod } from './lib/entry-utils.mjs';

const inputPath = process.argv[2] || '.gen/src/index.ts';
const outputPath = process.argv[3] || 'src/tools.ts';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * Injects a `dry_run` boolean property into a tool's `inputSchema.properties`
 * for mutating HTTP methods (post/put/patch/delete), so it survives
 * regeneration instead of only existing as a hand-edit on `src/tools.ts`.
 *
 * Also injects an `annotations` object (readOnlyHint/destructiveHint/
 * idempotentHint/openWorldHint) derived from the HTTP method on every tool,
 * so MCP clients (and quality scanners like Glama's TDQS) get structured
 * behavioral hints instead of having to infer them from the description.
 *
 * @param {string} mapArrayText - The raw `[...]` text of `toolDefinitionMap`'s entries.
 * @returns {{ text: string, mutatingCount: number }} The (possibly modified) array text and how many tools got `dry_run`.
 */
function injectDryRunIntoMap(mapArrayText) {
  let mutatingCount = 0;
  const entries = splitTopLevelArrayEntries(mapArrayText).map((entry) => {
    const methodMatch = /method:\s*"([^"]+)"/.exec(entry);
    const method = methodMatch ? methodMatch[1].toLowerCase() : null;

    let updated = entry;
    if (method) {
      const annotations = JSON.stringify(annotationsForMethod(method));
      updated = updated.replace(/method:\s*"[^"]+",/, (m) => `${m}\n    annotations: ${annotations},`);
    }

    if (!method || !MUTATING_METHODS.has(method)) return updated;

    const inputSchemaAnchor = /inputSchema:\s*/.exec(updated);
    if (!inputSchemaAnchor) return updated;
    const braceStart = updated.indexOf('{', inputSchemaAnchor.index);
    if (braceStart === -1) return updated;
    const braceEnd = findMatchingClose(updated, braceStart);

    const schema = JSON.parse(updated.slice(braceStart, braceEnd));
    if (!schema.properties || typeof schema.properties !== 'object') schema.properties = {};
    schema.properties.dry_run = {
      type: 'boolean',
      description: 'If true, validate and return the request that would be sent without calling Polarion.',
    };

    mutatingCount++;
    return updated.slice(0, braceStart) + JSON.stringify(schema) + updated.slice(braceEnd);
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
