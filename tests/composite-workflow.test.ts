import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkitemActions, transitionWorkitemStatus } from '../src/composite-workflow.js';
import { listVirtualTools } from '../src/virtual-tools.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const actions = [
  { nativeActionId: 'start', name: 'Start', targetStatus: 'progress', available: true, requiredFields: ['resolution'] },
  { nativeActionId: 'resume', name: 'Resume', targetStatus: 'progress', available: true },
  { nativeActionId: 'close', name: 'Close', targetStatus: 'done', available: false },
];
function setup(after = 'progress') {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let reads = 0;
  const ctx = { callPolarionTool: async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    if (name === 'getWorkflowActionsForWorkItem') return { content: [], structuredContent: { data: actions } };
    if (name === 'getWorkItem') return { content: [], structuredContent: { data: { id: 'P/W-1', attributes: { status: reads++ ? after : 'open' } } } };
    return { content: [] };
  }, signal: new AbortController().signal, apiBaseUrl: '', logger: console, reportProgress: async () => {} } as VirtualToolContext;
  return { ctx, calls };
}
const args = { projectId: 'P', workItemId: 'W-1' };
const parsed = (result: any) => JSON.parse(result.content[0].text);
test('lists actions and current status', async () => {
  const { ctx } = setup();
  const value = parsed(await getWorkitemActions.handler(args, ctx));
  assert.equal(value.currentStatus, 'open'); assert.equal(value.actions[0].actionId, 'start');
});
test('resolves id and name, sends required values in one patch and verifies status', async () => {
  for (const action of ['start', 'START']) {
    const { ctx, calls } = setup();
    const result = await transitionWorkitemStatus.handler({ ...args, action, values: { resolution: 'fixed' } }, ctx);
    assert.equal(parsed(result).status_verified, true);
    const patches = calls.filter(c => c.name === 'patchWorkItem');
    assert.equal(patches.length, 1); assert.equal(patches[0]!.args.workflowAction, 'start');
    assert.equal((patches[0]!.args.requestBody as any).data.attributes.resolution, 'fixed');
  }
});
test('rejects ambiguous, unknown, unavailable and missing fields before writing', async () => {
  for (const input of [{ target_status: 'progress' }, { action: 'missing' }, { action: 'close' }, { action: 'start' }, {}, { action: 'start', target_status: 'progress' }]) {
    const { ctx, calls } = setup();
    const result = await transitionWorkitemStatus.handler({ ...args, ...input }, ctx);
    assert.equal(result.isError, true); assert.equal(calls.some(c => c.name === 'patchWorkItem'), false);
  }
});
test('dry run does not write and reports missing fields', async () => {
  const { ctx, calls } = setup();
  const result = await transitionWorkitemStatus.handler({ ...args, action: 'start', dry_run: true }, ctx);
  assert.deepEqual(parsed(result).missingRequiredFields, ['resolution']);
  assert.equal(calls.some(c => c.name === 'patchWorkItem'), false);
});
test('status mismatch fails and read-only filtering excludes transition', async () => {
  const { ctx } = setup('open');
  const result = await transitionWorkitemStatus.handler({ ...args, action: 'start', values: { resolution: 'fixed' } }, ctx);
  assert.equal(result.isError, true); assert.equal(parsed(result).status_verified, false);
  assert.equal(listVirtualTools({ readOnly: true }).some(t => t.name === 'transition_workitem_status'), false);
});

test('resolves an unambiguous target and translates assignee into a relationship', async () => {
  const { ctx, calls } = setup('done');
  const original = ctx.callPolarionTool;
  ctx.callPolarionTool = async (name, args) => name === 'getWorkflowActionsForWorkItem' ? { content: [], structuredContent: { data: [{ nativeActionId: 'finish', name: 'Finish', targetStatus: 'done', available: true, requiredFields: ['assignee'] }] } } : original(name, args);
  const result = await transitionWorkitemStatus.handler({ ...args, target_status: 'done', values: { assignee: 'alice' } }, ctx);
  assert.equal(parsed(result).status_verified, true);
  assert.deepEqual((calls.find(c => c.name === 'patchWorkItem')!.args.requestBody as any).data.relationships.assignee.data, [{ type: 'users', id: 'alice' }]);
});
