import type { VirtualTool } from './virtual-tools.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { attrs, boundedNumber, first, parseWorkItemId, relData, rows, textResult, type JsonObject } from './composite-utils.js';

interface TraceNode { id: string; title: string; type: string; status: string }
interface TraceEdge { from: string; to: string; role: string }
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; result[index] = await fn(items[index]!); }
  }));
  return result;
}
function relationEdges(rows: JsonObject[], current: string, direction: 'up' | 'down'): TraceEdge[] {
  return rows.map(row => {
    const source = relData(row, 'sourceWorkItem').id;
    const target = relData(row, 'workItem').id;
    const related = direction === 'down' ? target : source;
    return { from: direction === 'down' ? current : String(related ?? ''), to: direction === 'down' ? String(related ?? '') : current, role: String(attrs(row).role ?? '') };
  }).filter(edge => edge.from && edge.to);
}
export const traceLinks: VirtualTool = {
  name: 'trace_links', title: 'Trace work item links', toolset: 'composites',
  description: 'Builds a bounded, cycle-safe traceability tree across outgoing links and backlinks.',
  inputSchema: { type: 'object', properties: { projectId: { type: 'string' }, workItemId: { type: 'string' }, direction: { type: 'string', enum: ['up', 'down', 'both'], default: 'both' }, roles: { type: 'array', items: { type: 'string' } }, depth: { type: 'integer', minimum: 0, maximum: 6, default: 3 }, node_cap: { type: 'integer', minimum: 1, maximum: 1000, default: 200 } }, required: ['projectId', 'workItemId'] },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  async handler(args, ctx) {
    const rootId = `${String(args.projectId)}/${String(args.workItemId)}`;
    const direction = args.direction === 'up' || args.direction === 'down' ? args.direction : 'both';
    const depth = Math.floor(boundedNumber(args.depth, 3, 6));
    const cap = Math.max(1, Math.floor(boundedNumber(args.node_cap, 200, 1000)));
    const roleFilter = Array.isArray(args.roles) ? new Set(args.roles.map(String)) : undefined;
    const nodeMap = new Map<string, TraceNode>();
    const edgeMap = new Map<string, TraceEdge>();
    const queue = [rootId];
    const seen = new Set<string>();
    const distances = new Map([[rootId, 0]]);
    let truncated = false;
    while (queue.length && seen.size <= cap) {
      const batch = queue.splice(0, 4).filter(id => (distances.get(id) ?? 0) < depth);
      if (batch.length === 0) { truncated ||= queue.length > 0; break; }
      const queries = batch.flatMap(id => {
        const parsed = parseWorkItemId(id)!;
        return [
          ...(direction !== 'up' ? [{ id, dir: 'down' as const, name: 'getLinkedWorkItems', parsed }] : []),
          ...(direction !== 'down' ? [{ id, dir: 'up' as const, name: 'getBacklinkedWorkItems', parsed }] : []),
        ];
      });
      const fetched = await mapLimit(queries, 4, query => ctx.callPolarionTool(query.name, {
        ...query.parsed,
        fields: { linkedworkitems: 'role,sourceWorkItem,workItem' },
      }));
      const failed = fetched.find(result => result.isError === true);
      if (failed) return failed;
      const expansions = batch.map(id => ({ id, edges: queries.flatMap((query, index) => query.id === id ? relationEdges(rows(fetched[index]!), id, query.dir) : []) }));
      for (const expansion of expansions) {
        for (const edge of expansion.edges.filter(candidate => !roleFilter || roleFilter.has(candidate.role))) {
          edgeMap.set(`${edge.from}\0${edge.to}\0${edge.role}`, edge);
          const other = edge.from === expansion.id ? edge.to : edge.from;
          if (other !== expansion.id && !seen.has(other) && !queue.includes(other)) {
            if (seen.size + queue.length >= cap) { truncated = true; continue; }
            distances.set(other, (distances.get(expansion.id) ?? 0) + 1);
            queue.push(other);
          }
        }
      }
      for (const id of batch) seen.add(id);
      const nodeIds = [...new Set([rootId, ...[...edgeMap.values()].flatMap(e => [e.from, e.to])])].filter(id => !nodeMap.has(id)).slice(0, cap - nodeMap.size);
      const details = await mapLimit< string, TraceNode | CallToolResult >(nodeIds, 4, async id => {
        const parsed = parseWorkItemId(id);
        if (!parsed) return { id } as TraceNode;
        const response = await ctx.callPolarionTool('getWorkItem', { ...parsed, fields: { workitems: 'title,type,status' } });
        if (response.isError) return response;
        const item = first(response); const a = attrs(item);
        return { id, title: String(a.title ?? ''), type: String(a.type ?? ''), status: String(a.status ?? '') };
      });
      const detailError = details.find((node): node is CallToolResult => 'isError' in node && node.isError === true);
      if (detailError) return detailError;
      for (const node of details as TraceNode[]) nodeMap.set(node.id, node);
      if (seen.size >= cap && queue.length) { truncated = true; break; }
    }
    const returned = new Set(nodeMap.keys());
    return textResult({ nodes: [...nodeMap.values()], edges: [...edgeMap.values()].filter(edge => returned.has(edge.from) && returned.has(edge.to)), truncated });
  },
};


import { registerVirtualTool } from './virtual-tools.js';
registerVirtualTool(traceLinks);
