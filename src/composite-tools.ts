import { runJobAndWait } from './composite-jobs.js';
import { traceLinks } from './composite-trace.js';

export const COMPOSITE_TOOLS = [runJobAndWait, traceLinks] as const;
