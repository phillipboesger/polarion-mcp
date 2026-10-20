/**
 * Corrections to the generated tool annotations.
 *
 * The generator derives annotations from the HTTP method alone (PATCH =
 * idempotent and non-destructive, POST = non-destructive). Some operations
 * break that rule, and clients use these hints to decide what to confirm
 * with the user. The rules below are by shape, not by name, so they keep
 * working after a regeneration; the explicit list covers the remaining
 * overwrite/merge actions.
 */

import type { McpToolDefinition } from './types.js';

/** POST actions that replace or merge existing content. */
export const DESTRUCTIVE_ACTIONS = new Set([
  'overwriteDocumentParts',
  'mergeDocumentToMaster',
  'mergeDocumentFromMaster',
  'setLicense',
  'moveProjectAction',
]);

/**
 * @param def - A generated tool definition.
 * @returns The definition with corrected annotations (a copy if anything changed).
 */
export function correctAnnotations(def: McpToolDefinition): McpToolDefinition {
  if (!def.annotations) return def;
  const method = def.method.toLowerCase();
  const corrected = { ...def.annotations };

  // A workflow action is a transition: running it twice is not the same as once.
  if (method === 'patch' && def.executionParameters.some(p => p.name === 'workflowAction')) {
    corrected.idempotentHint = false;
  }
  // PATCH on a relationship replaces the whole set; links not sent are dropped.
  if (method === 'patch' && /\/relationships\/\{relationshipId\}$/.test(def.pathTemplate)) {
    corrected.destructiveHint = true;
  }
  if (DESTRUCTIVE_ACTIONS.has(def.name)) {
    corrected.destructiveHint = true;
  }

  const changed = Object.keys(corrected).some(k => corrected[k as keyof typeof corrected] !== def.annotations![k as keyof typeof corrected]);
  return changed ? { ...def, annotations: corrected } : def;
}
