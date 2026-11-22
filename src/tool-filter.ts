/**
 * Server-side tool filter.
 *
 * MCP_READ_ONLY=true keeps only tools annotated `readOnlyHint: true`. A
 * filtered tool is neither listed nor callable over any transport, which makes
 * it a real boundary (e.g. against prompt injection asking for a delete), not
 * just a client-side hint. Narrowing the catalogue by name is not a setting
 * any more: Code Mode keeps the tool list at two entries.
 */

import './profile.js';
import { toolDefinitionMap } from './tools.js';
import { correctAnnotations } from './annotations.js';
import type { McpToolDefinition } from './types.js';
import { toolsetsForDefinition, type ToolsetName } from './toolsets.js';

export interface ToolFilter {
  /** Tool names to keep; undefined keeps all. */
  allow?: string[];
  /** Keep only tools annotated as read-only. */
  readOnly?: boolean;
  /** Keep tools whose generated REST path belongs to one of these domains. */
  toolsets?: readonly ToolsetName[];
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
 * @param env - Environment to read `MCP_READ_ONLY` from.
 * @returns The filter it describes.
 * @throws Error for an invalid flag.
 */
export function parseToolFilter(env: NodeJS.ProcessEnv): ToolFilter {
  return { readOnly: parseFlag('MCP_READ_ONLY', env.MCP_READ_ONLY) };
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
  const toolsets = filter.toolsets ? new Set(filter.toolsets) : undefined;
  const kept = new Map(
    [...tools]
      .filter(([name, def]) => (!allow || allow.has(name))
        && (!filter.readOnly || def.annotations?.readOnlyHint === true)
        && (!toolsets || toolsetsForDefinition(def).some(toolset => toolsets.has(toolset))))
      .map(([name, def]) => [name, correctAnnotations(def)] as const)
  );
  return { tools: kept, unknown: (filter.allow ?? []).filter(name => !tools.has(name)) };
}

const filtered = filterTools(toolDefinitionMap, parseToolFilter(process.env));
if (filtered.tools.size !== toolDefinitionMap.size) {
  console.error(`[INFO] Tool filter: ${filtered.tools.size}/${toolDefinitionMap.size} tools enabled`);
}

/** The tools this deployment exposes, with corrected annotations. */
export const enabledTools: ReadonlyMap<string, McpToolDefinition> = filtered.tools;

