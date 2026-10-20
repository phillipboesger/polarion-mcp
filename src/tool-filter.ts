/**
 * Server-side tool filter.
 *
 * The full generated surface is ~280 tools and ~1 MB of tools/list, which
 * makes client tool selection unreliable. A deployment can narrow it:
 * - MCP_TOOLS: comma-separated allowlist of tool names.
 * - MCP_READ_ONLY=true: only tools annotated `readOnlyHint: true`.
 * - MCP_OMIT_OUTPUT_SCHEMA=true: leave `outputSchema` out of tools/list
 *   (roughly halves its size; results still carry structured content).
 *
 * A filtered tool is neither listed nor callable over any transport, which
 * makes the allowlist a real boundary (e.g. against prompt injection asking
 * for a delete), not just a client-side hint.
 */

import { toolDefinitionMap } from './tools.js';
import { correctAnnotations } from './annotations.js';
import type { McpToolDefinition } from './types.js';

export interface ToolFilter {
  /** Tool names to keep; undefined keeps all. */
  allow?: string[];
  /** Keep only tools annotated as read-only. */
  readOnly?: boolean;
}

/**
 * Reads an on/off setting. A value that is neither is an error: a restriction
 * such as MCP_READ_ONLY=on must not silently do nothing.
 *
 * @param name - Setting name, for the error message.
 * @param value - Its value.
 * @returns True for 1/true/yes/on, false for unset, empty, 0/false/no/off.
 * @throws Error for anything else.
 */
export function parseFlag(name: string, value: string | undefined): boolean {
  const text = value?.trim() ?? '';
  if (/^(1|true|yes|on)$/i.test(text)) return true;
  if (text === '' || /^(0|false|no|off)$/i.test(text)) return false;
  throw new Error(`${name} must be true or false, got "${text}"`);
}

/**
 * @param env - Environment to read `MCP_TOOLS` and `MCP_READ_ONLY` from.
 * @returns The filter it describes.
 * @throws Error for an invalid flag, or an `MCP_TOOLS` with no tool name in it.
 */
export function parseToolFilter(env: NodeJS.ProcessEnv): ToolFilter {
  const raw = env.MCP_TOOLS?.trim();
  // Names may be separated by commas, spaces or newlines (a YAML block value).
  const allow = raw ? raw.split(/[\s,]+/).filter(Boolean) : undefined;
  // Set but without names (e.g. ","): a typo, not a request for zero or all tools.
  if (raw && allow?.length === 0) throw new Error(`MCP_TOOLS="${raw}" lists no tool names`);
  return { allow, readOnly: parseFlag('MCP_READ_ONLY', env.MCP_READ_ONLY) };
}

/**
 * @param tools - All tool definitions, by name.
 * @param filter - What to keep.
 * @returns The kept tools, plus allowlisted names that match no tool (typos,
 *   or tools renamed by a regeneration).
 */
export function filterTools(
  tools: ReadonlyMap<string, McpToolDefinition>,
  filter: ToolFilter
): { tools: Map<string, McpToolDefinition>; unknown: string[] } {
  const allow = filter.allow ? new Set(filter.allow) : undefined;
  const kept = new Map(
    [...tools]
      .filter(([name, def]) => (!allow || allow.has(name)) && (!filter.readOnly || def.annotations?.readOnlyHint === true))
      .map(([name, def]) => [name, correctAnnotations(def)] as const)
  );
  return { tools: kept, unknown: (filter.allow ?? []).filter(name => !tools.has(name)) };
}

const filtered = filterTools(toolDefinitionMap, parseToolFilter(process.env));
if (filtered.unknown.length > 0) {
  console.error(`[WARN] MCP_TOOLS names unknown tools, ignored: ${filtered.unknown.join(', ')}`);
}
if (filtered.tools.size === 0) {
  // A server without tools is never what a deployment wants; a typo or a renamed tool should not go unnoticed.
  throw new Error('The tool filter (MCP_TOOLS, MCP_READ_ONLY) leaves no tools; check the names in MCP_TOOLS');
}
if (filtered.tools.size !== toolDefinitionMap.size) {
  console.error(`[INFO] Tool filter: ${filtered.tools.size}/${toolDefinitionMap.size} tools enabled`);
}

/** The tools this deployment exposes, with corrected annotations. */
export const enabledTools: ReadonlyMap<string, McpToolDefinition> = filtered.tools;

/** Whether tools/list leaves out output schemas. */
export const omitOutputSchema = parseFlag('MCP_OMIT_OUTPUT_SCHEMA', process.env.MCP_OMIT_OUTPUT_SCHEMA);
