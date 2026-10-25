import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { renderRichTextFieldsAsMarkdown } from './markdown.js';

export type JsonObject = Record<string, any>;
export const textResult = (value: unknown): CallToolResult => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] });
export const errorResult = (message: string): CallToolResult => ({ content: [{ type: 'text', text: message }], isError: true });
export const object = (value: unknown): JsonObject => value && typeof value === 'object' ? value as JsonObject : {};
export const rows = (result: CallToolResult): JsonObject[] => {
  const body = object(result.structuredContent);
  return Array.isArray(body.data) ? body.data : [];
};
/** Extract a single JSON:API resource without treating singleton data as a collection. */
export const first = (result: CallToolResult): JsonObject => {
  const rawData = object(result.structuredContent).data;
  if (Array.isArray(rawData)) return rows(result)[0] ?? {};
  const data = object(rawData);
  return Object.keys(data).length ? data : {};
};
export const attrs = (row: JsonObject): JsonObject => object(row.attributes);
export const relData = (row: JsonObject, rel: string): JsonObject => object(object(object(row.relationships)[rel]).data);
export const richMarkdown = (value: unknown): string => {
  if (typeof value === 'string') return value;
  const field = object(value);
  if (field.type === 'text/html' && typeof field.value === 'string') {
    const rendered = renderRichTextFieldsAsMarkdown(field) as JsonObject;
    return String(rendered.value_markdown ?? field.value);
  }
  return typeof field.value === 'string' ? field.value : '';
};
export const boundedNumber = (value: unknown, fallback: number, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
export const resultFailed = (result: CallToolResult): boolean => result.isError === true;
export const resultText = (result: CallToolResult): string => result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

export function abortableDelay(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const done = (completed: boolean) => { clearTimeout(timer); signal.removeEventListener('abort', aborted); resolve(completed); };
    const timer = setTimeout(() => done(true), ms);
    const aborted = () => done(false);
    signal.addEventListener('abort', aborted, { once: true });
  });
}


export function parseWorkItemId(id: string): { projectId: string; workItemId: string } | undefined {
  const parts = id.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  return { projectId: parts[0]!, workItemId: parts.at(-1)! };
}
