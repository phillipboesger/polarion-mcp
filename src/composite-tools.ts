import { runJobAndWait } from './composite-jobs.js';
import { traceLinks } from './composite-trace.js';
import { getOutline, readDocument, readSection } from './composite-documents.js';
import { compositeTools as searchTools } from './composite-search.js';
import { uploadAttachment } from './composite-upload.js';

export const COMPOSITE_TOOLS = [runJobAndWait, traceLinks, readDocument, getOutline, readSection, uploadAttachment, ...searchTools] as const;
