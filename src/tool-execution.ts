import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { capToolResponseText, DEFAULT_MAX_RESPONSE_CHARS } from './executor.js';
import type { SendWithRetryOpts } from './httpClient.js';
import { MAX_AUTO_ITEMS, MAX_AUTO_PAGE_SIZE, paginate, pageNumberFromLink, type JsonApiPage } from './pagination.js';
import type { McpToolDefinition } from './types.js';

/** Caller-supplied pagination arguments that are invalid (a client error, not a tool failure). */
export class PaginationArgumentError extends Error {}

export type SingleToolExecutor = (
  name: string, definition: McpToolDefinition, args: Record<string, unknown>, securitySchemes: Record<string, any>,
  sendOpts?: SendWithRetryOpts, maxResponseChars?: number, apiBaseUrl?: string,
) => Promise<CallToolResult>;

export interface ExecuteToolOptions {
  apiBaseUrl: string;
  maxResponseChars?: number;
  signal?: AbortSignal;
  beforeNextPage?: () => void | Promise<void>;
}

function capPagedStructuredContent(page: JsonApiPage, maxChars: number): JsonApiPage {
  const bounded: JsonApiPage = { ...page, data: Array.isArray(page.data) ? [...page.data] : [] };
  let text = JSON.stringify(bounded);
  while (text.length > maxChars && (bounded.data as unknown[]).length > 0) {
    (bounded.data as unknown[]).pop();
    bounded.truncated = true;
    // The dropped items belong to pages before `next`, so following it would skip them.
    if (bounded.links) bounded.links = Object.fromEntries(Object.entries(bounded.links).filter(([key]) => key !== 'next'));
    text = JSON.stringify(bounded);
  }
  return text.length > maxChars ? { data: [], truncated: true } : bounded;
}

function paginatedList(definition: McpToolDefinition): boolean {
  const properties = definition.outputSchema?.properties;
  return definition.method.toLowerCase() === 'get'
    && Boolean(properties?.data?.items && properties?.links?.properties?.next && properties?.meta?.properties?.totalCount);
}

/** Execute one API tool call, optionally collecting its generated list pages. */
export async function executeTool(
  name: string,
  definition: McpToolDefinition,
  args: Record<string, unknown>,
  securitySchemes: Record<string, any>,
  executor: SingleToolExecutor,
  options: ExecuteToolOptions,
): Promise<CallToolResult> {
  const maxItems = args.max_items;
  if (maxItems === undefined || !paginatedList(definition)) {
    return executor(name, definition, args, securitySchemes, undefined, options.maxResponseChars, options.apiBaseUrl);
  }
  if (!Number.isInteger(maxItems) || (maxItems as number) < 1 || (maxItems as number) > MAX_AUTO_ITEMS) {
    throw new PaginationArgumentError(`max_items must be an integer from 1 to ${MAX_AUTO_ITEMS}`);
  }
  const firstArgs = { ...args };
  delete firstArgs.max_items;
  const pageSizeKey = definition.inputSchema?.properties?.['page[size]'] ? 'page_size_' : undefined;
  if (pageSizeKey) {
    const suppliedSize = Number(firstArgs[pageSizeKey]);
    // Clamping a larger size would silently shift the page window the caller asked for.
    if (suppliedSize > MAX_AUTO_PAGE_SIZE) {
      throw new PaginationArgumentError(`page_size_ must be at most ${MAX_AUTO_PAGE_SIZE} when max_items is set (Polarion's per-request limit).`);
    }
    const requested = Number.isInteger(suppliedSize) && suppliedSize > 0 ? suppliedSize : maxItems as number;
    firstArgs[pageSizeKey] = Math.min(requested, maxItems as number, MAX_AUTO_PAGE_SIZE);
  }
  const first = await executor(name, definition, firstArgs, securitySchemes, undefined, options.maxResponseChars, options.apiBaseUrl);
  const body = first.structuredContent;
  if (first.isError || !body || typeof body !== 'object' || !Array.isArray((body as JsonApiPage).data)) return first;

  let lastPageNumber = Number(firstArgs.page_number_ ?? 1);
  const { response, truncated } = await paginate(body as JsonApiPage, maxItems as number, async next => {
    await options.beforeNextPage?.();
    const nextPageNumber = pageNumberFromLink(next, options.apiBaseUrl);
    if (nextPageNumber === undefined || nextPageNumber <= lastPageNumber) {
      throw new Error(`Pagination stopped for ${name}: next page number is missing or did not advance.`);
    }
    lastPageNumber = nextPageNumber;
    const nextArgs = { ...firstArgs, page_number_: nextPageNumber };
    const page = await executor(name, definition, nextArgs, securitySchemes, undefined, options.maxResponseChars, options.apiBaseUrl);
    if (page.isError || !page.structuredContent || typeof page.structuredContent !== 'object') {
      throw new Error(`Pagination failed for ${name}: ${page.content.find(item => item.type === 'text')?.text ?? 'invalid page response'}`);
    }
    return page.structuredContent as JsonApiPage;
  }, undefined, options.signal);
  const structuredContent = capPagedStructuredContent({ ...response, ...(truncated ? { truncated: true } : {}) }, options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS);
  const firstText = first.content.find(item => item.type === 'text');
  const prefix = firstText?.type === 'text' ? (firstText.text.split('\n', 1)[0] ?? 'API Response') : 'API Response';
  return {
    ...first,
    content: [{ type: 'text', text: capToolResponseText(`${prefix}\n${JSON.stringify(structuredContent)}`, options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS, definition) }],
    structuredContent,
  };
}
