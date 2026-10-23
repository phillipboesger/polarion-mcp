import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolFilter } from './tool-filter.js';
import type { ToolsetName } from './toolsets.js';
import { toolsetsForDefinition } from './toolsets.js';

export interface VirtualToolContext {
  callPolarionTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  requestBearerToken?: string;
  userScope?: string;
  apiBaseUrl: string;
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  signal: AbortSignal;
  reportProgress(progress: { progress: number; total?: number; message?: string }): Promise<void>;
}

export interface VirtualTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  toolset: ToolsetName | 'composites';
  handler(args: Record<string, unknown>, ctx: VirtualToolContext): Promise<CallToolResult> | CallToolResult;
}

const registry = new Map<string, VirtualTool>();

/** Discover-only virtual tools. Their target set is already deployment filtered. */
export function discoverVirtualTools(tools: ReadonlyMap<string, import('./types.js').McpToolDefinition>): VirtualTool[] {
  const enabled = [...tools.values()];
  const search: VirtualTool = {
    name: 'search_tools', title: 'Search tools', toolset: 'composites',
    description: 'Search the enabled Polarion tools by name, description, or toolset.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } }, toolset: { type: 'string' }, limit: { type: 'number', default: 10 } } },
    annotations: { readOnlyHint: true },
    handler: ({ query = '', keywords = [], toolset, limit = 10 }) => {
      const terms = [...String(query).toLowerCase().matchAll(/[a-z0-9]+/g)].map(m => m[0]).concat(Array.isArray(keywords) ? keywords.map(String).map(s => s.toLowerCase()) : []);
      const ranked = enabled.map(def => {
        const sets = toolsetsForDefinition(def);
        const haystack = `${def.name} ${def.description} ${sets.join(' ')}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (def.name.toLowerCase() === term ? 5 : def.name.toLowerCase().includes(term) ? 3 : haystack.includes(term) ? 1 : 0), 0);
        return { def, sets, score };
      }).filter(row => row.score > 0 && (!toolset || row.sets.includes(toolset as never)))
        .sort((a, b) => b.score - a.score || a.def.name.localeCompare(b.def.name)).slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));
      return { content: [{ type: 'text' as const, text: JSON.stringify(ranked.map(({ def, sets }) => ({ name: def.name, description: def.description.split(/[\r\n]/)[0], toolset: sets[0], requiredParams: (def.inputSchema.required ?? []) }))) }] };
    },
  };
  const describe: VirtualTool = {
    name: 'describe_tool', title: 'Describe tool', toolset: 'composites', description: 'Return the full input schema for an enabled Polarion tool.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }, annotations: { readOnlyHint: true },
    handler: ({ name }) => { const def = tools.get(String(name)); return def ? { content: [{ type: 'text', text: JSON.stringify({ name: def.name, description: def.description, inputSchema: def.inputSchema }) }] } : { content: [{ type: 'text', text: `Unknown or filtered tool: ${String(name)}` }], isError: true }; },
  };
  const call: VirtualTool = {
    name: 'call_tool', title: 'Call tool', toolset: 'composites', description: 'Call an enabled Polarion tool through the normal server pipeline.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, arguments: { type: 'object' } }, required: ['name'] }, annotations: { readOnlyHint: true },
    handler: () => ({ content: [{ type: 'text', text: 'call_tool dispatch is handled by the server pipeline' }], isError: true }),
  };
  return [search, describe, call];
}

/** Registers a synthetic tool and returns an unregister function for isolated consumers/tests. */
export function registerVirtualTool(tool: VirtualTool): () => void {
  if (registry.has(tool.name)) throw new Error(`Virtual tool already registered: ${tool.name}`);
  registry.set(tool.name, tool);
  return () => { if (registry.get(tool.name) === tool) registry.delete(tool.name); };
}

/** Lists registered tools after applying the same allowlist/read-only/toolset constraints as generated tools. */
export function listVirtualTools(filter: ToolFilter = {}): VirtualTool[] {
  const allow = filter.allow ? new Set(filter.allow) : undefined;
  const toolsets = filter.toolsets ? new Set(filter.toolsets) : undefined;
  return [...registry.values()].filter(tool => (!allow || allow.has(tool.name))
    && (!filter.readOnly || tool.annotations?.readOnlyHint === true)
    && (!toolsets || toolsets.has(tool.toolset)));
}
