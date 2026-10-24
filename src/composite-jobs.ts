import type { VirtualTool } from './virtual-tools.js';
import { abortableDelay, attrs, boundedNumber, errorResult, first, resultFailed, resultText, textResult, type JsonObject } from './composite-utils.js';

export const runJobAndWait: VirtualTool = {
  name: 'run_job_and_wait', title: 'Run Polarion job and wait', toolset: 'composites',
  description: 'Executes a Polarion job and polls until it finishes, fails, times out, or this request is cancelled. The job itself is not cancelled when polling stops. Job semantics vary by jobId, so this tool is conservatively marked destructive.',
  inputSchema: { type: 'object', properties: {
    requestBody: { type: 'object', description: 'Parameters passed to executeJob.', properties: { jobId: { type: 'string' }, name: { type: 'string' }, nodeId: { type: ['string', 'null'] }, params: { type: ['object', 'null'] }, scope: { type: ['string', 'null'] } }, required: ['jobId'] },
    dry_run: { type: 'boolean', description: 'Preview the job request without executing it.' },
    max_wait_seconds: { type: 'number', description: 'Maximum polling time; defaults to 120 seconds and is capped at 600.' },
    log_tail_chars: { type: 'number', description: 'Maximum log tail length (default 4000, capped at 20000).' },
  }, required: ['requestBody'] },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  dryRunSafe: true,
  async handler(args, ctx) {
    if (args.dry_run === true) return textResult({ dryRun: true, requestBody: args.requestBody, message: 'Preview only; executeJob was not called.' });
    const waitSeconds = boundedNumber(args.max_wait_seconds, 120, 600);
    const logLimit = Math.floor(boundedNumber(args.log_tail_chars, 4000, 20000));
    const started = Date.now();
    const execution = await ctx.callPolarionTool('executeJob', { requestBody: args.requestBody });
    if (resultFailed(execution)) return execution;
    const jobId = String(first(execution).id ?? first(execution).attributes?.jobId ?? '');
    if (!jobId) return errorResult('executeJob did not return a job ID.');
    let job: JsonObject = first(execution);
    let delay = 1000;
    let terminal = false;
    await ctx.reportProgress({ progress: 0, total: 1, message: `Job ${jobId} started` });
    while (!terminal) {
      if (ctx.signal.aborted) return textResult({ jobId, status: 'cancelled', jobCancelled: false, message: 'Polling stopped because the request was cancelled; the Polarion job was not cancelled.' });
      const state = String(attrs(job).state ?? '').toLowerCase();
      const statusType = String(attrs(job).status?.type ?? '').toUpperCase();
      terminal = ['finished', 'completed', 'done', 'failed', 'cancelled', 'canceled'].includes(state) || ['OK', 'FAILED', 'CANCELLED', 'UNKNOWN'].includes(statusType);
      if (terminal) break;
      const elapsed = (Date.now() - started) / 1000;
      if (elapsed >= waitSeconds) return textResult({ jobId, status: 'timeout', maxWaitSeconds: waitSeconds, jobCancelled: false });
      const waited = await abortableDelay(Math.min(delay, Math.max(0, (waitSeconds - elapsed) * 1000)), ctx.signal);
      if (!waited || ctx.signal.aborted) return textResult({ jobId, status: 'cancelled', jobCancelled: false, message: 'Polling stopped because the request was cancelled; the Polarion job was not cancelled.' });
      const poll = await ctx.callPolarionTool('getJob', { jobId });
      if (resultFailed(poll)) return poll;
      job = first(poll);
      delay = Math.min(5000, delay + 1000);
      await ctx.reportProgress({ progress: Math.min(0.99, (Date.now() - started) / Math.max(1, waitSeconds * 1000)), total: 1, message: `Job ${jobId}: ${attrs(job).state ?? attrs(job).status?.type ?? 'running'}` });
    }
    const logResult = await ctx.callPolarionTool('getJobLogContent', { jobId });
    const log = resultText(logResult);
    const logTail = log.slice(-logLimit);
    await ctx.reportProgress({ progress: 1, total: 1, message: `Job ${jobId} ${attrs(job).state ?? attrs(job).status?.type ?? 'finished'}` });
    return textResult({ jobId, status: attrs(job).status?.type ?? attrs(job).state ?? 'unknown', state: attrs(job).state, message: attrs(job).status?.message, logTail, logError: logResult.isError === true ? resultText(logResult) : undefined });
  },
};


import { registerVirtualTool } from './virtual-tools.js';
registerVirtualTool(runJobAndWait);
