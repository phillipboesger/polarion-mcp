#!/usr/bin/env node
/** Adds the optional response_format selector to every generated GET tool. */
import { readFileSync, writeFileSync } from 'node:fs';
import { extractToolDefinitionMapArray, splitTopLevelArrayEntries, withInputSchema } from './lib/entry-utils.mjs';

const filePath = process.argv[2] || 'src/tools.ts';
const source = readFileSync(filePath, 'utf8');
const { start, end, text } = extractToolDefinitionMapArray(source);
let added = 0;
let skipped = 0;
const entries = splitTopLevelArrayEntries(text).map((entry) => {
  if (!/method:\s*"get"/.test(entry)) return entry;
  const result = withInputSchema(entry, (schema) => {
    schema.properties ??= {};
    const current = schema.properties.response_format;
    const desired = {
      type: 'string', enum: ['concise', 'detailed'], default: 'detailed',
      description: 'Response detail level. concise removes redundant HTML and JSON:API metadata and may use a small default fieldset on large lists; detailed preserves the complete response. Defaults to detailed.',
    };
    if (JSON.stringify(current) === JSON.stringify(desired)) return null;
    schema.properties.response_format = desired;
    added++;
    return schema;
  });
  if (!result.ok) skipped++;
  return result.entry;
});
if (skipped) throw new Error(`Could not read inputSchema for ${skipped} GET tool(s)`);
writeFileSync(filePath, source.slice(0, start) + `[${entries.join(',')}]` + source.slice(end), 'utf8');
console.log(`Added/verified response_format on GET tools (${added} changed).`);
