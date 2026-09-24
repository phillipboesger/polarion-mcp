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

/**
 * Finds a tool entry's `inputSchema: {...}` field, JSON-parses it, lets
 * `transform` mutate (or reject) it, and writes it back into the entry text
 * if changed. Mirrors the brace-matching approach `generate-tools.mjs` uses
 * for the same field, so both the base generator and the quality-enrichment
 * pass can safely edit a tool's schema without a full TS parser.
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @param {(schema: Record<string, any>) => Record<string, any> | null} transform -
 *   Receives the parsed schema; return the (possibly mutated) schema to apply
 *   the change, or `null`/`undefined` to leave the entry untouched.
 * @returns {{ entry: string, changed: boolean }} The (possibly modified) entry and whether it changed.
 */
export function withInputSchema(entry, transform) {
  const anchor = /inputSchema:\s*/.exec(entry);
  if (!anchor) return { entry, changed: false, ok: false };
  const braceStart = entry.indexOf('{', anchor.index);
  if (braceStart === -1) return { entry, changed: false, ok: false };
  const braceEnd = findMatchingClose(entry, braceStart);

  let schema;
  try {
    schema = JSON.parse(entry.slice(braceStart, braceEnd));
  } catch {
    return { entry, changed: false, ok: false };
  }

  const result = transform(schema);
  if (!result) return { entry, changed: false, ok: true };

  return {
    entry: entry.slice(0, braceStart) + JSON.stringify(result) + entry.slice(braceEnd),
    changed: true,
    ok: true,
  };
}

/**
 * Read-only probe for whether a tool entry's `inputSchema.properties`
 * declares a given property name (e.g. `dry_run`, `workflowAction`).
 *
 * @param {string} entry - Raw object-literal text of one tool definition.
 * @param {string} propName - Property name to look for.
 * @returns {{ has: boolean, ok: boolean }} Whether the property is present, and whether the schema was actually readable (an `ok: false` with `has: false` means "unknown", not "absent" -- callers should treat that as a skip, not a negative result).
 */
export function hasSchemaProperty(entry, propName) {
  let has = false;
  const { ok } = withInputSchema(entry, (schema) => {
    has = !!(schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, propName));
    return null; // read-only probe, no change
  });
  return { has, ok };
}

/**
 * Rich, concrete descriptions for parameter names that recur identically
 * across most of the 284 generated tools (`projectId`, `fields`, `query`,
 * pagination, etc.). The OpenAPI spec's own text for these is terse
 * ("The Project ID.", "query string.") or just a link to external docs —
 * Glama's TDQS "Parameter Semantics" dimension penalizes exactly this: full
 * type coverage but no in-description guidance on format, constraints, or
 * examples. Applying one dictionary here improves the parameter score on
 * nearly every tool at once instead of hand-editing 284 entries.
 *
 * The enrichment pass in `enrich-tool-metadata.mjs` applies a value only
 * when the current description doesn't already equal it exactly, which is
 * what makes re-running the pass idempotent.
 *
 * Only includes names whose *original* OpenAPI text is uniform boilerplate
 * across every tool that has them. Names left out on purpose because their
 * original text carries tool-specific nuance a generic replacement would
 * lose: `documentName` ("Branch Document Name" on the merge/branch
 * endpoints vs. plain "Document name" elsewhere) and `typeId` (meaning
 * varies per endpoint and only had one real occurrence in the current spec).
 *
 * @type {Record<string, string>}
 */
export const PARAM_DESCRIPTIONS = {
  projectId: "The Polarion project ID (its URL segment, e.g. `myproject`), case-sensitive. Required to scope the request to one project; call getProjects to list valid IDs.",
  revision: "A specific repository revision (e.g. `1234`) to read the resource as it existed at that revision instead of the current HEAD. Omit to use the latest revision.",
  fields: "Sparse fieldset selector: an object keyed by resource type (e.g. `workitems`) whose value is a comma-separated list of attribute names to return (e.g. `id,title,status`), reducing payload size. Omit to return the default field set.",
  include: "Comma-separated list of related resource types to embed in the response (e.g. `author,attachments`) so they don't require a separate follow-up call. Omit to return only the primary resource.",
  "page[size]": "Maximum number of items to return in this page (e.g. `100`). Use together with `page[number]` to paginate through a large result set.",
  "page[number]": "1-based page number to fetch when the result set is paginated (e.g. `2` for the second page). Combine with `page[size]`; omit to fetch the first page.",
  query: "Polarion Lucene-style query string to filter results: field:value clauses combined with AND/OR, phrases in quotes. Exact supported field names depend on the resource type being queried.",
  sort: "Comma-separated list of fields to sort by, in priority order; prefix a field with `-` for descending order (e.g. `-updated,title`).",
  dry_run: "If true, validates the request and returns the exact request that would be sent to Polarion — with the Authorization header redacted and any binary payload summarized by byte length — without actually sending it.",
  workItemId: "The Work Item's ID within its project (e.g. `WI-123`), not the combined `project/id` path used in some link payloads.",
  testRunId: "The Test Run's ID within its project.",
  testCaseId: "The Test Case's ID being referenced.",
  testCaseProjectId: "The project ID that owns the referenced Test Case — may differ from the project in the request path when the test case is shared from another project.",
  spaceId: "The Document Space ID (a folder-like grouping of documents/pages within a project). Use `_default` (no quotes) to address the project's default space.",
  attachmentId: "The attachment's ID, as returned by the corresponding list- or get-attachments call for this resource.",
  pageName: "The Rich Page's ID/name within its space — its stable identifier, not its display title.",
  relationshipId: "The relationship's name as it appears under `relationships` in the owning resource (e.g. `assignee`, `author`, `watches`, `linkedWorkItems`), not an ID of an individual link entry.",
  fieldId: "The ID of an enumeration-typed field (e.g. `status`, `severity`, `priority`, or a custom enum field ID), not its display label. Use the matching getFieldsMetadataFor* tool to discover field IDs.",
  targetType: "Identifies the target resource type this operation applies to (e.g. `workitem`). Use `~` (no quotes) to mean no specific target type.",
  iconId: "The icon's ID, as returned by the corresponding icon-listing endpoint (getDefaultIcons/getGlobalIcons/getProjectIcons).",
  jobId: "The asynchronous job's ID, returned when the triggering call responds with a `jobs` resource. Poll getJob with this ID to check completion status.",
  templates: "If true, only return template resources; if false or omitted, return only actual (non-template) instances.",
  iteration: "The iteration number identifying which repeated occurrence of this item is being addressed (e.g. which run of a test parameter).",
};

/**
 * A truthful, non-fabricated one-sentence note on the concrete effect of
 * calling a tool, derived only from its HTTP method, MCP annotations, and
 * two structural signals (never invented) — targets Glama's TDQS
 * "Behavioral Transparency" dimension, which penalizes descriptions that
 * just restate the `destructiveHint`/`idempotentHint` flags without adding
 * real context (reversibility, retry-safety) an agent needs before calling
 * a mutating tool.
 *
 * Deliberately returns `null` for read-only (GET) tools: there's no
 * meaningful additional behavioral context to add beyond `readOnlyHint`
 * without inventing one, and TDQS's own Conciseness dimension penalizes
 * noise.
 *
 * Two corrections found by review of the first version of this function,
 * both on real generated tools:
 * - A flat "POST always creates a new resource, so it's never idempotent"
 *   claim is false for Polarion's `/actions/...`-suffixed POST endpoints
 *   (`overwriteDocumentParts`, `setLicense`, `closeCollection`, etc.) --
 *   those trigger a server-side action, not a plain create, so `pathTemplate`
 *   is checked for an `/actions/` segment before making that claim.
 * - A flat "PATCH/PUT is idempotent" claim (from `annotationsForMethod`'s
 *   per-HTTP-method default) is false for tools that accept a
 *   `workflowAction` parameter (`patchWorkItem`, `patchDocument`, etc.):
 *   re-running a workflow action from a different resulting status has real
 *   additional side effects (status change, signatures, notifications).
 *
 * @param {string} method - Lowercase HTTP method.
 * @param {{ destructiveHint?: boolean, idempotentHint?: boolean }} annotations - This tool's annotations.
 * @param {{ pathTemplate?: string, hasWorkflowAction?: boolean }} [context] - Structural signals used to avoid the two false claims above.
 * @returns {string | null} The note text (without a leading marker), or null if none applies.
 */
export function effectNoteForAnnotations(method, annotations, context = {}) {
  const m = method.toLowerCase();
  if (m === 'get') return null;
  const { pathTemplate = '', hasWorkflowAction = false } = context;

  if (annotations?.destructiveHint) {
    return 'Effect: irreversible — data removed or overwritten by this call cannot be recovered through the API.';
  }
  if (annotations?.idempotentHint) {
    if (hasWorkflowAction) {
      return 'Effect: not guaranteed idempotent — this call can trigger a workflow action, and re-running a workflow action from a different resulting status has real additional side effects (status change, signatures, notifications).';
    }
    return 'Effect: idempotent — calling it again with the same input leaves the resource in the same end state, with no additional side effects.';
  }
  if (m === 'post') {
    if (pathTemplate.includes('/actions/')) {
      return 'Effect: triggers a server-side action rather than a plain resource creation — whether repeating it is safe, a no-op, or rejected depends on the specific action; treat it as not guaranteed idempotent.';
    }
    return 'Effect: creates a new resource on each call — calling it again with the same input creates a duplicate; it is not idempotent.';
  }
  return null;
}
