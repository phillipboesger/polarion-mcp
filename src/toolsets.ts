import type { McpToolDefinition } from './types.js';

/** Stable names accepted by MCP_TOOLSETS and per-request selectors. */
export const TOOLSET_NAMES = [
  'work-items', 'documents', 'test-management', 'plans', 'collections',
  'projects', 'users', 'admin', 'jobs', 'pages', 'enumerations',
  'composites',
] as const;

export type ToolsetName = typeof TOOLSET_NAMES[number];

/**
 * Classifies one generated OpenAPI operation by its REST path domain.
 *
 * @param definition - Generated tool metadata.
 * @returns Exactly one toolset for known domains, or an empty list if metadata is incomplete.
 */
export function toolsetsForDefinition(definition: McpToolDefinition): ToolsetName[] {
  const path = definition.pathTemplate?.toLowerCase() ?? '';
  const segments = path.split('/').filter(Boolean);
  if (segments.includes('workitems')) return ['work-items'];
  if (segments.includes('testruns') || segments.includes('testparameterdefinitions')) return ['test-management'];
  if (segments.includes('plans')) return ['plans'];
  if (segments.includes('collections')) return ['collections'];
  if (segments.includes('documents') || segments.includes('revisions')) return ['documents'];
  if (segments.includes('pages')) return ['pages'];
  if (segments.includes('enumerations')) return ['enumerations'];
  if (segments.includes('jobs')) return ['jobs'];
  if (segments.some(segment => ['users', 'user', 'usergroups', 'roles'].includes(segment))) return ['users'];
  if (segments[0] === 'projects' || segments[0] === 'projecttemplates' || segments[0] === 'spaces') return ['projects'];
  if (segments.some(segment => ['actions', 'customfields', 'license', 'llms', 'metadata'].includes(segment))) return ['admin'];
  return [];
}

/**
 * Parses and validates a comma-separated set of toolsets.
 *
 * @param value - Header, path, or environment value.
 * @param source - Setting name used in validation errors.
 * @returns Unique toolset names in the caller's order.
 * @throws Error when no names are supplied or a name is unknown.
 */
export function parseToolsetNames(value: string, source: string): ToolsetName[] {
  const names = value.split(',').map(name => name.trim()).filter(Boolean);
  const valid = new Set<string>(TOOLSET_NAMES);
  const unknown = names.filter(name => !valid.has(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown toolset${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}. Valid toolsets: ${TOOLSET_NAMES.join(', ')}`);
  }
  if (names.length === 0) throw new Error(`${source} lists no toolsets`);
  return [...new Set(names)] as ToolsetName[];
}
