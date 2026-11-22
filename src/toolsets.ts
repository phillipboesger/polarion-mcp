import type { McpToolDefinition } from './types.js';

/** Domain labels used for code-mode search metadata. Not a selection mechanism. */
export type ToolsetName = 'work-items' | 'documents' | 'test-management' | 'plans' | 'collections'
  | 'projects' | 'users' | 'admin' | 'jobs' | 'pages' | 'enumerations';

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
  if (segments[0] === 'projects' || segments[0] === 'projecttemplates' || segments[0] === 'spaces' || segments.includes('spaces')) return ['projects'];
  if (segments.some(segment => ['actions', 'customfields', 'license', 'llms', 'metadata'].includes(segment))) return ['admin'];
  return [];
}
