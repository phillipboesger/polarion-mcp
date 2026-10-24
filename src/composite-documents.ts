import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VirtualTool, VirtualToolContext } from './virtual-tools.js';
import { attrs, boundedNumber, errorResult, first, object, parseWorkItemId, relData, resultFailed, richMarkdown, rows, textResult, type JsonObject } from './composite-utils.js';

interface DocPart { id: string; type: string; level: number; headingText: string; markdown: string; raw: JsonObject }
async function readParts(args: Record<string, unknown>, ctx: VirtualToolContext): Promise<DocPart[] | CallToolResult> {
  const base = { projectId: String(args.projectId), spaceId: String(args.spaceId), documentName: String(args.document) };
  const all: JsonObject[] = [];
  const includedItems = new Map<string, JsonObject>();
  for (let page = 1; page <= 100; page++) {
    const response = await ctx.callPolarionTool('getDocumentParts', { ...base, 'page[size]': 100, 'page[number]': page, include: 'workItem', ...(typeof args.revision === 'string' ? { revision: args.revision } : {}) });
    if (resultFailed(response)) return response;
    const pageRows = rows(response); all.push(...pageRows);
    const included = object(response.structuredContent).included;
    if (Array.isArray(included)) for (const item of included) if (item?.id) includedItems.set(String(item.id), item);
    const total = Number(object(object(response.structuredContent).meta).totalCount ?? all.length);
    if (pageRows.length < 100 || all.length >= total) break;
  }
  const parts: DocPart[] = [];
  for (const part of all) {
    const a = attrs(part); const type = String(a.type ?? '');
    let markdown = richMarkdown(a.content);
    if (type === 'heading') markdown = `${'#'.repeat(Math.max(1, Math.min(6, Number(a.level ?? 0) + 1)))} ${String(a.headingText ?? '')}`;
    if (type === 'workitem') {
      const workItemId = relData(part, 'workItem').id;
      let workItem = typeof workItemId === 'string' ? includedItems.get(workItemId) ?? {} : {};
      if (!Object.keys(workItem).length && typeof workItemId === 'string') {
        const parsed = parseWorkItemId(workItemId);
        if (parsed) {
          const response = await ctx.callPolarionTool('getWorkItem', parsed);
          if (resultFailed(response)) return response;
          workItem = first(response);
        }
      }
      if (Object.keys(workItem).length) {
        const wa = attrs(workItem);
        const title = String(wa.title ?? wa.id ?? workItemId ?? 'Work item');
        markdown = `### ${title}\n\n${richMarkdown(wa.description)}`.trim();
      }
    }
    parts.push({ id: String(part.id ?? a.id ?? ''), type, level: Number(a.level ?? 0), headingText: String(a.headingText ?? ''), markdown, raw: part });
  }
  return parts;
}
function outline(parts: DocPart[]) {
  const stack: Array<{ level: number; title: string; id: string }> = [];
  return parts.filter(p => p.type === 'heading').map(p => {
    const title = p.headingText;
    while (stack.length && stack.at(-1)!.level >= p.level) stack.pop();
    const path = [...stack.map(x => x.title), title];
    stack.push({ level: p.level, title, id: p.id });
    return { id: p.id, title, level: p.level, path };
  });
}
function renderDocument(parts: DocPart[]): string {
  return parts.map(p => p.markdown).filter(Boolean).join('\n\n');
}
const documentInput = { type: 'object', properties: { projectId: { type: 'string' }, spaceId: { type: 'string' }, document: { type: 'string' }, revision: { type: 'string' } }, required: ['projectId', 'spaceId', 'document'] };
export const readDocument: VirtualTool = {
  name: 'read_document_markdown', title: 'Read LiveDoc as Markdown', toolset: 'composites', description: 'Reads a Polarion LiveDoc and renders its ordered parts and embedded Work Items as Markdown.', inputSchema: documentInput,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  async handler(args, ctx) { const parts = await readParts(args, ctx); return Array.isArray(parts) ? textResult({ markdown: renderDocument(parts), outline: outline(parts) }) : parts; },
};
export const getOutline: VirtualTool = {
  name: 'get_document_outline', title: 'Get LiveDoc outline', toolset: 'composites', description: 'Returns LiveDoc headings, nested paths, and part IDs without rendering the full body.', inputSchema: documentInput,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  async handler(args, ctx) { const parts = await readParts(args, ctx); return Array.isArray(parts) ? textResult({ outline: outline(parts) }) : parts; },
};
export const readSection: VirtualTool = {
  name: 'read_document_section', title: 'Read LiveDoc section', toolset: 'composites', description: 'Returns one LiveDoc section by heading path or part ID, capped by max_chars.',
  inputSchema: { type: 'object', properties: { ...documentInput.properties, heading_path: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }, part_id: { type: 'string' }, max_chars: { type: 'integer', default: 20000, maximum: 100000 } }, required: ['projectId', 'spaceId', 'document'] },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  async handler(args, ctx) {
    const parts = await readParts(args, ctx); if (!Array.isArray(parts)) return parts;
    const headings = outline(parts);
    let index = typeof args.part_id === 'string' ? parts.findIndex(p => p.id === args.part_id) : -1;
    if (index < 0 && args.heading_path !== undefined) {
      const path = Array.isArray(args.heading_path) ? args.heading_path.map(String) : String(args.heading_path).split(' > ').map(x => x.trim());
      const selected = headings.find(h => JSON.stringify(h.path) === JSON.stringify(path));
      if (selected) index = parts.findIndex(p => p.id === selected.id);
    }
    if (index < 0) return errorResult('Document section not found. Provide a valid part_id or heading_path.');
    const heading = parts[index]!;
    let end = parts.length;
    for (let i = index + 1; i < parts.length; i++) if (parts[i]!.type === 'heading' && parts[i]!.level <= heading.level) { end = i; break; }
    const limit = Math.floor(boundedNumber(args.max_chars, 20000, 100000));
    const markdown = parts.slice(index, end).map(p => p.markdown).filter(Boolean).join('\n\n');
    return textResult({ partId: heading.id, headingPath: headings.find(h => h.id === heading.id)?.path, markdown: markdown.slice(0, limit), truncated: markdown.length > limit });
  },
};


import { registerVirtualTool } from './virtual-tools.js';
for (const tool of [readDocument, getOutline, readSection]) registerVirtualTool(tool);
