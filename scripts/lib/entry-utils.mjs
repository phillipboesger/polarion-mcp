/**
 * Shared text-level helpers for editing the generated `toolDefinitionMap`
 * array in `src/tools.ts` without a full TypeScript parser.
 *
 * The map's entries are plain JS object literals (not JSON — they use
 * backtick strings and unquoted keys), so we operate on source text with
 * bracket/quote-aware scanning instead of `JSON.parse`.
 */

/**
 * Returns the index just past the bracket/brace that opens at `openIndex`,
 * matching depth while ignoring brackets inside string literals.
 *
 * @param {string} src - Source text.
 * @param {number} openIndex - Index of the opening `[` or `{`.
 * @returns {number} Index immediately after the matching closing bracket.
 */
export function findMatchingClose(src, openIndex) {
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

/**
 * Splits a `[...]`-wrapped array literal's text into its top-level element
 * substrings (without the outer brackets), honoring nested brackets/braces
 * and quoted strings so commas inside them aren't mistaken for separators.
 *
 * @param {string} arrayText - Text starting with `[` and ending with `]`.
 * @returns {string[]} One string per top-level array element.
 */
export function splitTopLevelArrayEntries(arrayText) {
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
 * Extracts the `toolDefinitionMap`'s `[...]` array text from a source file
 * that declares `const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([...])`.
 *
 * @param {string} src - Full file source.
 * @returns {{ start: number, end: number, text: string }} Byte offsets and text of the `[...]` literal.
 */
export function extractToolDefinitionMapArray(src) {
  const anchor = /toolDefinitionMap\s*(?::\s*Map<string,\s*McpToolDefinition>)?\s*=\s*new Map\(\[/;
  const match = anchor.exec(src);
  if (!match) throw new Error('toolDefinitionMap not found');
  const start = src.indexOf('[', match.index);
  const end = findMatchingClose(src, start);
  return { start, end, text: src.slice(start, end) };
}

/**
 * MCP tool annotation hints for a given HTTP method, following the
 * conventions from the MCP spec's `ToolAnnotations` (readOnlyHint,
 * destructiveHint, idempotentHint, openWorldHint). Every Polarion operation
 * talks to an external system, so `openWorldHint` is always `true`.
 *
 * @param {string} method - Lowercase HTTP method (get/post/patch/delete).
 * @returns {Record<string, boolean>} Annotation hints for that method.
 */
export function annotationsForMethod(method) {
  switch (method.toLowerCase()) {
    case 'get':
      return { readOnlyHint: true, openWorldHint: true };
    case 'post':
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
    case 'patch':
    case 'put':
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
    case 'delete':
      return { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true };
    default:
      return { readOnlyHint: false, openWorldHint: true };
  }
}
