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
  description: 'Builds a bounded, cycle-safe trace tree from one Work Item and returns `{nodes, edges, truncated}`. Requires a project ID and Work Item ID readable by the signed-in Polarion user. Use this to traverse multiple link levels; use `getLinkedWorkItems` or `getBacklinkedWorkItems` for a single hop. `direction` selects outgoing, incoming, or both; the result is marked truncated when the depth or node cap limits traversal.',
  inputSchema: { type: 'object', properties: {
    projectId: { type: 'string', description: 'Project ID that owns the root Work Item, such as `PROJECT`.' },
    workItemId: { type: 'string', description: 'Root Work Item ID within the project, such as `WI-123`, without the project prefix.' },
    direction: { type: 'string', enum: ['up', 'down', 'both'], default: 'both', description: '`down` follows outgoing links, `up` follows backlinks, and `both` traverses both directions; defaults to `both`.' },
    roles: { type: 'array', items: { type: 'string', description: 'Exact Polarion link role ID to retain.' }, description: 'Optional allowlist of link role IDs; omitted means include every role.' },
    depth: { type: 'integer', minimum: 0, maximum: 6, default: 3, description: 'Maximum number of link hops from the root; defaults to 3 and is capped at 6.' },
    node_cap: { type: 'integer', minimum: 1, maximum: 1000, default: 200, description: 'Maximum number of distinct Work Items to include; defaults to 200 and is capped at 1000.' },
  }, required: ['projectId', 'workItemId'] },
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
    const discovered = new Set<string>([rootId]);
    const distances = new Map([[rootId, 0]]);
    let truncated = false;
    while (queue.length) {
      const batch = queue.splice(0, 4);
      const expandable = batch.filter(id => (distances.get(id) ?? 0) < depth);
      const queries = expandable.flatMap(id => {
        const parsed = parseWorkItemId(id)!;
        return [
          ...(direction !== 'up' ? [{ id, dir: 'down' as const, name: 'getLinkedWorkItems', parsed }] : []),
          ...(direction !== 'down' ? [{ id, dir: 'up' as const, name: 'getBacklinkedWorkItems', parsed }] : []),
        ];
      });
      const fetched = await mapLimit(queries, 4, query => ctx.callPolarionTool(query.name, {
        ...query.parsed,
        fields: { linkedworkitems: 'role,sourceWorkItem,workItem' },
        max_items: 1000,
      }));
      const failed = fetched.find(result => result.isError === true);
      if (failed) return failed;
      if (fetched.some(result => (result.structuredContent as Record<string, unknown> | undefined)?.truncated === true)) truncated = true;
      const expansions = expandable.map(id => ({ id, edges: queries.flatMap((query, index) => query.id === id ? relationEdges(rows(fetched[index]!), id, query.dir) : []) }));
      for (const expansion of expansions) {
        for (const edge of expansion.edges.filter(candidate => !roleFilter || roleFilter.has(candidate.role))) {
          edgeMap.set(`${edge.from}\0${edge.to}\0${edge.role}`, edge);
          const other = edge.from === expansion.id ? edge.to : edge.from;
          if (other !== expansion.id && !discovered.has(other)) {
            if (discovered.size >= cap) { truncated = true; continue; }
            discovered.add(other);
            distances.set(other, (distances.get(expansion.id) ?? 0) + 1);
            queue.push(other);
          }
        }
      }
      for (const id of batch) seen.add(id);
      const candidates = [...new Set([rootId, ...[...edgeMap.values()].flatMap(e => [e.from, e.to])])].filter(id => !nodeMap.has(id));
      const nodeIds = candidates.slice(0, Math.max(0, cap - nodeMap.size));
      if (nodeIds.length < candidates.length) truncated = true;
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
