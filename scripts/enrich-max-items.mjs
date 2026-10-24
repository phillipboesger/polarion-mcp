#!/usr/bin/env node
/** Add the opt-in auto-pagination limit to generated JSON:API list tools. */
import { readFileSync, writeFileSync } from 'node:fs';
import { extractToolDefinitionMapArray, splitTopLevelArrayEntries, findMatchingClose, withInputSchema } from './lib/entry-utils.mjs';

const filePath = process.argv[2] || 'src/tools.ts';
const source = readFileSync(filePath, 'utf8');
const { start, end, text: arrayText } = extractToolDefinitionMapArray(source);
let added = 0;
const entries = splitTopLevelArrayEntries(arrayText).map(entry => {
  const anchor = /outputSchema:\s*/.exec(entry);
  if (!anchor) return entry;
  const objectStart = entry.indexOf('{', anchor.index);
  const objectEnd = findMatchingClose(entry, objectStart);
  let outputSchema;
  try { outputSchema = JSON.parse(entry.slice(objectStart, objectEnd)); } catch { return entry; }
  const props = outputSchema?.properties;
  const isList = Boolean(props?.data?.items && props?.links?.properties?.next && props?.meta?.properties?.totalCount);
  if (!isList) return entry;
  const result = withInputSchema(entry, schema => {
    if (schema.properties?.max_items) return null;
    schema.properties ??= {};
    schema.properties.max_items = { type: 'integer', minimum: 1, maximum: 1000, description: 'Collect up to this many results across pages (maximum 1000). Omit to fetch only the requested page, as before.' };
    added++;
    return schema;
  });
  if (!result.ok) throw new Error(`Could not read inputSchema for list tool entry: ${entry.slice(0, 100)}`);
  return result.entry;
});
writeFileSync(filePath, source.slice(0, start) + `[${entries.join(',')}]` + source.slice(end), 'utf8');
console.log(`Added max_items to ${added} generated list tools in ${filePath}.`);
