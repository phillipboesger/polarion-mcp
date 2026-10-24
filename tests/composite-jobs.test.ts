import test from 'node:test';
import assert from 'node:assert/strict';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualToolContext } from '../src/virtual-tools.js';

const text = (result: CallToolResult) => result.content.find((item): item is { type: 'text'; text: string } => item.type === 'text')?.text ?? '';
const response = (data: unknown, extra: Record<string, unknown> = {}): CallToolResult => ({ content: [], structuredContent: { data, ...extra } });
function context(call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>, signal = new AbortController().signal, progress: unknown[] = []): VirtualToolContext {
  return { callPolarionTool: call, signal, apiBaseUrl: 'https://polarion.test/polarion/rest/v1', logger: console, reportProgress: async item => { progress.push(item); } };
}
const job = (state: string, status?: string) => response([{ id: 'job-1', attributes: { state, status: status ? { type: status, message: 'done' } : undefined } }]);
import { runJobAndWait } from '../src/composite-jobs.js';
test('run_job_and_wait reports successful and failed terminal states with capped log tails', async () => {
  const calls: string[] = [];
  const ctx = context(async name => {
    calls.push(name);
    if (name === 'executeJob') return response([{ id: 'job-1', attributes: { state: 'running' } }]);
    if (name === 'getJob') return job('finished', 'OK');
    if (name === 'getJobLogContent') return { content: [{ type: 'text', text: '0123456789' }] };
    throw new Error(name);
  });
  const result = await runJobAndWait.handler({ requestBody: { jobId: 'jobs.cleanup' }, log_tail_chars: 4 }, ctx);
  assert.equal(result.isError, undefined);
  assert.deepEqual(calls, ['executeJob', 'getJob', 'getJobLogContent']);
  assert.match(text(result), /"status":"OK"/);
  assert.match(text(result), /"logTail":"6789"/);

  const failure = await runJobAndWait.handler({ requestBody: { jobId: 'x' } }, context(async name => name === 'executeJob' ? response([{ id: 'j' }]) : name === 'getJob' ? job('failed', 'FAILED') : { content: [{ type: 'text', text: 'failure log' }] }));
  assert.match(text(failure), /"status":"FAILED"/);
});

test('run_job_and_wait times out and cancellation stops polling without cancelling the job', async () => {
  const calls: string[] = [];
  const timeout = await runJobAndWait.handler({ requestBody: { jobId: 'x' }, max_wait_seconds: 0 }, context(async name => {
    calls.push(name); return name === 'executeJob' ? response([{ id: 'j', attributes: { state: 'running' } }]) : job('running');
  }));
  assert.match(text(timeout), /"status":"timeout"/);
  assert.deepEqual(calls, ['executeJob']);

  const controller = new AbortController();
  let pollCalls = 0;
  const cancelContext = context(async name => {
    if (name === 'executeJob') return response([{ id: 'j', attributes: { state: 'running' } }]);
    pollCalls++;
    return job('running');
  }, controller.signal);
  const pending = runJobAndWait.handler({ requestBody: { jobId: 'x' }, max_wait_seconds: 2 }, cancelContext);
  setTimeout(() => controller.abort(), 10);
  const cancelled = await pending;
  assert.match(text(cancelled), /"jobCancelled":false/);
  assert.equal(pollCalls, 0);
});

test('run_job_and_wait emits virtual progress and is conservatively destructive', async () => {
  const progress: unknown[] = [];
  const ctx = context(async name => name === 'executeJob' ? response([{ id: 'j', attributes: { state: 'finished', status: { type: 'OK' } } }]) : { content: [{ type: 'text', text: 'log' }] }, undefined, progress);
  await runJobAndWait.handler({ requestBody: { jobId: 'x' } }, ctx);
  assert.equal(progress.length, 2);
  assert.equal(runJobAndWait.annotations?.destructiveHint, true);
  assert.match(runJobAndWait.description, /semantics vary/i);
});

test('run_job_and_wait dry_run previews without executing the job', async () => {
  const calls: string[] = [];
  const result = await runJobAndWait.handler({ requestBody: { jobId: 'jobs.cleanup' }, dry_run: true }, context(async name => {
    calls.push(name);
    return response([]);
  }));
  assert.deepEqual(calls, []);
  assert.match(text(result), /"dryRun":true/);
  assert.match(text(result), /"jobId":"jobs\.cleanup"/);
});
