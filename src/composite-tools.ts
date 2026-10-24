import { runJobAndWait } from './composite-jobs.js';
import { traceLinks } from './composite-trace.js';
import { getOutline, readDocument, readSection } from './composite-documents.js';

export const COMPOSITE_TOOLS = [runJobAndWait, traceLinks, readDocument, getOutline, readSection] as const;
