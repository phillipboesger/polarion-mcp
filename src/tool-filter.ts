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
import type { McpToolDefinition } from './types.js';

export interface ToolFilter {
  /** Tool names to keep; undefined keeps all. */
  allow?: string[];
  /** Keep only tools annotated as read-only. */
  readOnly?: boolean;
}

/**
 * @param env - Environment to read `MCP_TOOLS` and `MCP_READ_ONLY` from.
 * @returns The filter it describes.
 */
export function parseToolFilter(env: NodeJS.ProcessEnv): ToolFilter {
  const allow = (env.MCP_TOOLS ?? '').split(',').map(name => name.trim()).filter(Boolean);
  return { allow: allow.length > 0 ? allow : undefined, readOnly: env.MCP_READ_ONLY === 'true' };
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
    [...tools].filter(([name, def]) => (!allow || allow.has(name)) && (!filter.readOnly || def.annotations?.readOnlyHint === true))
  );
  return { tools: kept, unknown: (filter.allow ?? []).filter(name => !tools.has(name)) };
}

const filtered = filterTools(toolDefinitionMap, parseToolFilter(process.env));
if (filtered.unknown.length > 0) {
  console.error(`[WARN] MCP_TOOLS names unknown tools, ignored: ${filtered.unknown.join(', ')}`);
}
if (filtered.tools.size !== toolDefinitionMap.size) {
  console.error(`[INFO] Tool filter: ${filtered.tools.size}/${toolDefinitionMap.size} tools enabled`);
}

/** The tools this deployment exposes. */
export const enabledTools: ReadonlyMap<string, McpToolDefinition> = filtered.tools;

/** Whether tools/list leaves out output schemas. */
export const omitOutputSchema = process.env.MCP_OMIT_OUTPUT_SCHEMA === 'true';
