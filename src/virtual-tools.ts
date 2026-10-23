import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolFilter } from './tool-filter.js';
import type { ToolsetName } from './toolsets.js';

export interface VirtualToolContext {
  callPolarionTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  requestBearerToken?: string;
  userScope?: string;
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
