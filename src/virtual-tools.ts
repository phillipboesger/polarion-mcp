import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolFilter } from './tool-filter.js';
import type { ToolsetName } from './toolsets.js';

export interface VirtualToolContext {
  callPolarionTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  /** Calls a tool through the full pipeline (policy, rate limit, audit, marking). Only set where a handler needs per-call enforcement (Code Mode). */
  callTool?(name: string, args: Record<string, unknown>, confirmationDeadline?: AbortSignal): Promise<CallToolResult>;
  requestBearerToken?: string;
  userScope?: string;
  apiBaseUrl: string;
  transport?: 'stdio' | 'http';
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
  /** The handler guarantees dry_run has no write effects and returns a preview. */
  dryRunSafe?: boolean;
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

/** Lists registered tools after applying the same read-only constraint as generated tools. */
export function listVirtualTools(filter: ToolFilter = {}): VirtualTool[] {
  return [...registry.values()].filter(tool => (!filter.readOnly || tool.annotations?.readOnlyHint === true) && (!filter.allow || filter.allow.has(tool.name) || (filter.allow.has('all-reads') && tool.annotations?.readOnlyHint === true)));
}
