import { attrs, errorResult, first, resultFailed, rows, textResult, type JsonObject } from './composite-utils.js';
import { registerVirtualTool, type VirtualTool, type VirtualToolContext } from './virtual-tools.js';

const properties = {
  projectId: { type: 'string', minLength: 1, description: 'Project ID containing the work item.' },
  workItemId: { type: 'string', minLength: 1, description: 'Work item ID within the project.' },
};
async function load(args: Record<string, unknown>, ctx: VirtualToolContext) {
  const scope = { projectId: args.projectId, workItemId: args.workItemId };
  const item = await ctx.callPolarionTool('getWorkItem', { ...scope, fields: { workitems: 'status' } });
  if (resultFailed(item)) return { error: item };
  const actions = await ctx.callPolarionTool('getWorkflowActionsForWorkItem', { ...scope, max_items: 1000 });
  if (resultFailed(actions)) return { error: actions };
  return { item: first(item), actions: rows(actions) };
}
const compact = (a: JsonObject) => ({ actionId: a.nativeActionId, name: a.name, targetStatus: a.targetStatus, requiredFields: a.requiredFields ?? [], requiredRoles: a.requiredRoles ?? [], signatureRequired: a.isSignatureRequired ?? false, available: a.available, unavailableReason: a.unavailableReason });
const status = (item: JsonObject) => attrs(item).status;
const id = (value: any) => typeof value === 'object' && value !== null ? value.id : value;
const equals = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
export const getWorkitemActions: VirtualTool = {
  name: 'get_workitem_actions', title: 'Get work item workflow actions', toolset: 'composites',
  description: 'List workflow actions and current status for one work item, including availability and required fields, roles and signatures. Requires permission to read the work item.',
  inputSchema: { type: 'object', properties, required: ['projectId', 'workItemId'] }, annotations: { readOnlyHint: true, openWorldHint: true },
  async handler(args, ctx) {
    const data = await load(args, ctx); if (data.error) return data.error;
    return textResult({ workItem: data.item!.id, currentStatus: status(data.item!), actions: data.actions!.map(compact) });
  },
};
export const transitionWorkitemStatus: VirtualTool = {
  name: 'transition_workitem_status', title: 'Transition work item status', toolset: 'composites',
  description: 'Transition one work item using an available workflow action or target status ID or label. Supply required field values and use dry_run to preview. Requires permission to perform the workflow action; signatures and roles are enforced by Polarion.',
  inputSchema: { type: 'object', properties: { ...properties,
    action: { type: 'string', minLength: 1, description: 'Workflow action ID or display name.' },
    target_status: { type: 'string', minLength: 1, description: 'Target status ID or display label.' },
    values: { type: 'object', description: 'Attribute values required by the transition.', additionalProperties: true },
    dry_run: { type: 'boolean', description: 'Preview the selected action without writing.' },
  }, required: ['projectId', 'workItemId'] },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, dryRunSafe: true,
  async handler(args, ctx) {
    if ((typeof args.action === 'string') === (typeof args.target_status === 'string')) return errorResult('Provide exactly one of action or target_status.');
    const data = await load(args, ctx); if (data.error) return data.error;
    const all = data.actions!; let target = args.target_status;
    if (typeof target === 'string' && !all.some(a => equals(a.targetStatus, target))) {
      const options = await ctx.callPolarionTool('getAvailableEnumOptionsForWorkItem', { projectId: args.projectId, workItemId: args.workItemId, fieldId: 'status', max_items: 1000 });
      if (resultFailed(options)) return options;
      const matches = rows(options).filter(o => equals(o.name, target));
      if (matches.length === 1) target = matches[0]!.id;
    }
    const matches = all.filter(a => typeof args.action === 'string' ? equals(a.nativeActionId, args.action) || equals(a.name, args.action) : equals(a.targetStatus, target));
    const valid = all.filter(a => a.available !== false).map(compact);
    if (matches.length !== 1 || matches[0]!.available === false) return errorResult(`Action unavailable, unknown or ambiguous. Matching actions: ${JSON.stringify(matches.map(compact))}. Valid actions: ${JSON.stringify(valid)}`);
    const action = matches[0]!; const values = args.values && typeof args.values === 'object' && !Array.isArray(args.values) ? args.values as JsonObject : {};
    const missing = (Array.isArray(action.requiredFields) ? action.requiredFields : []).filter((field: string) => values[field] === undefined || values[field] === null || values[field] === '' || (Array.isArray(values[field]) && values[field].length === 0));
    if (args.dry_run === true) return textResult({ dryRun: true, action: compact(action), targetStatus: action.targetStatus, missingRequiredFields: missing });
    if (missing.length) return errorResult(`Missing required fields: ${missing.join(', ')}`);
    const attributes = { ...values }; const relationships: JsonObject = {};
    if ('assignee' in attributes) {
      const assignee = attributes.assignee;
      const users = Array.isArray(assignee) ? assignee : [assignee];
      if (!users.every(user => typeof user === 'string' && user.length > 0)) return errorResult('assignee must be a user ID or an array of user IDs.');
      relationships.assignee = { data: users.map(user => ({ type: 'users', id: user })) };
      delete attributes.assignee;
    }
    const write = await ctx.callPolarionTool('patchWorkItem', { projectId: args.projectId, workItemId: args.workItemId, workflowAction: action.nativeActionId, requestBody: { data: { type: 'workitems', id: String(args.workItemId).includes('/') ? args.workItemId : `${String(args.projectId)}/${String(args.workItemId)}`, attributes, ...(Object.keys(relationships).length ? { relationships } : {}) } } });
    if (resultFailed(write)) return write;
    const after = await ctx.callPolarionTool('getWorkItem', { projectId: args.projectId, workItemId: args.workItemId, fields: { workitems: 'status' } });
    if (resultFailed(after)) return after;
    const newStatus = status(first(after)); const verified = typeof id(newStatus) === 'string' && id(newStatus) === action.targetStatus;
    const result = textResult({ previous_status: status(data.item!), new_status: newStatus, status_verified: verified, action: compact(action) });
    return verified ? result : { ...result, isError: true };
  },
};
registerVirtualTool(getWorkitemActions);
registerVirtualTool(transitionWorkitemStatus);
