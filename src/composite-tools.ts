import { runJobAndWait } from './composite-jobs.js';

export const COMPOSITE_TOOLS = [runJobAndWait] as const;
