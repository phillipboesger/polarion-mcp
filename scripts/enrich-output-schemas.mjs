#!/usr/bin/env node
/**
 * Adds an MCP `outputSchema` to every tool whose Polarion OpenAPI operation
 * declares a JSON response body for its success status, so MCP clients (and
 * quality scanners like Glama's TDQS) know the shape of what a tool returns
 * instead of having to infer it from the description.
 *
 * Tools whose success response has no JSON body (e.g. `204 No Content` on
 * most DELETE operations) are intentionally left without an `outputSchema`
 * -- that's the accurate representation, not a gap.
 *
 * Requires `openapi.json` (the same spec `download-spec` fetches) to still
 * be present in the working directory; it's already there by this point in
 * the `npm run regenerate` pipeline. If it's missing (e.g. running this
 * script standalone outside that pipeline), this is a no-op rather than an
 * error. Idempotent -- safe to rerun.
 *
 * Usage: node scripts/enrich-output-schemas.mjs [path/to/tools.ts] [path/to/openapi.json]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extractToolDefinitionMapArray, splitTopLevelArrayEntries } from './lib/entry-utils.mjs';

const filePath = process.argv[2] || 'src/tools.ts';
const specPath = process.argv[3] || 'openapi.json';

if (!existsSync(specPath)) {
  console.log(`${specPath} not found -- skipping outputSchema enrichment (only runs as part of the OpenAPI regeneration pipeline).`);
  process.exit(0);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const REF_PREFIX = '#/components/schemas/';

/**
 * Resolves a single `$ref` against `components/schemas`, then recursively
 * resolves any further `$ref`s inside the target schema.
 *
 * @param {string} ref - A `#/components/schemas/<name>` reference.
 * @param {Set<string>} visited - Refs already expanded on this path (cycle guard).
 * @param {number} depth - Current recursion depth (backstop guard).
 * @returns {any} The resolved schema, or `{ type: 'object' }` if `ref` cycles back onto itself.
 */
function resolveRef(ref, visited, depth) {
  if (visited.has(ref)) return { type: 'object' }; // circular reference -- stop expanding, fall back to a generic object
  if (depth > 25) throw new Error(`$ref resolution exceeded max depth for ${ref}`);
  if (!ref.startsWith(REF_PREFIX)) throw new Error(`Unsupported $ref target: ${ref}`);
  const name = ref.slice(REF_PREFIX.length);
  const schema = spec.components?.schemas?.[name];
  if (!schema) throw new Error(`$ref target not found in openapi.json: ${ref}`);
  return resolveSchema(schema, new Set(visited).add(ref), depth + 1);
}

/**
 * Deep-clones a JSON Schema fragment, resolving every `$ref` it contains.
 *
 * @param {any} schema - A JSON Schema fragment (object, array, or primitive).
 * @param {Set<string>} visited - Refs already expanded on this path (cycle guard).
 * @param {number} depth - Current recursion depth (backstop guard).
 * @returns {any} The fully-resolved, `$ref`-free equivalent.
 */
function resolveSchema(schema, visited, depth) {
  if (Array.isArray(schema)) return schema.map((item) => resolveSchema(item, visited, depth));
  if (schema && typeof schema === 'object') {
    if (typeof schema.$ref === 'string') return resolveRef(schema.$ref, visited, depth);
    const out = {};
    for (const [key, value] of Object.entries(schema)) out[key] = resolveSchema(value, visited, depth);
    return out;
  }
  return schema;
}

function getField(entry, field) {
  const match = new RegExp(`${field}:\\s*"([^"]+)"`).exec(entry);
  return match ? match[1] : null;
}

/**
 * Finds the success (2xx) response's resolved JSON schema for an operation.
 *
 * @param {string} method - Lowercase HTTP method.
 * @param {string} pathTemplate - OpenAPI-style path template.
 * @returns {any | null} The resolved schema, or null if there's no JSON response body.
 */
function findSuccessSchema(method, pathTemplate) {
  const op = spec.paths?.[pathTemplate]?.[method];
  if (!op?.responses) return null;
  const successKey = Object.keys(op.responses).find((k) => /^2\d\d$/.test(k));
  if (!successKey) return null;
  const schema = op.responses[successKey]?.content?.['application/json']?.schema;
  if (!schema) return null; // e.g. 204 No Content
  return resolveSchema(schema, new Set(), 0);
}

const src = readFileSync(filePath, 'utf8');
const { start, end, text: mapArrayText } = extractToolDefinitionMapArray(src);
let entries = splitTopLevelArrayEntries(mapArrayText);

let addedCount = 0;
let noBodyCount = 0;
let skippedCount = 0;

entries = entries.map((entry) => {
  if (/\n\s*outputSchema:/.test(entry)) return entry; // already enriched
  const name = getField(entry, 'name');
  const pathTemplate = getField(entry, 'pathTemplate');
  const method = getField(entry, 'method')?.toLowerCase();
  if (!name || !pathTemplate || !method) {
    skippedCount++;
    return entry;
  }

  const schema = findSuccessSchema(method, pathTemplate);
  if (!schema) {
    noBodyCount++;
    return entry;
  }
  // MCP's outputSchema must be a top-level `{ type: "object", ... }` schema;
  // skip rather than emit something an MCP client would reject.
  if (schema.type !== 'object') {
    skippedCount++;
    return entry;
  }

  addedCount++;
  const outputSchema = JSON.stringify(schema);
  return entry.replace(/pathTemplate:\s*"[^"]+",/, (m) => `${m}\n    outputSchema: ${outputSchema},`);
});

const newMapArrayText = `[${entries.join(',')}]`;
const out = src.slice(0, start) + newMapArrayText + src.slice(end);
writeFileSync(filePath, out, 'utf8');

console.log(`Enriched ${filePath} with outputSchema:`);
console.log(`  outputSchema added: ${addedCount}`);
console.log(`  no JSON response body (expected, e.g. 204 on most DELETEs): ${noBodyCount}`);
console.log(`  skipped (missing fields / non-object schema root): ${skippedCount}`);
