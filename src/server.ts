/**
 * Shared MCP server factory for the Polarion REST API server.
 *
 * This module builds a fully-configured MCP {@link Server} instance with all
 * tool, resource, and prompt handlers registered. It is transport-agnostic: the
 * same server definition is reused by every entry point.
 *
 * Entry points:
 * - src/index.ts          -> stdio transport (local MCP clients)
 * - src/mcp-http-server.ts -> Streamable HTTP transport (remote clients, e.g. Claude.ai)
 *
 * Keeping the handler registration in one place guarantees that all transports
 * expose exactly the same tools, resources, and prompts.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { SERVER_NAME, SERVER_VERSION } from './config.js';
import { sanitizeInputSchema } from './utils.js';
import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt, SERVER_INSTRUCTIONS } from './polarion.js';
import { securitySchemes, toolDefinitionMap } from './tools.js';
import { enabledTools, filterTools, omitOutputSchema, type ToolFilter } from './tool-filter.js';
import { executeApiTool, DEFAULT_MAX_RESPONSE_CHARS } from './executor.js';
import { lenientOutputSchema } from './output-schema.js';
import { listVirtualTools, type VirtualTool } from './virtual-tools.js';
import { createDefaultExtensions, hashAuditValue, type PolarionExtensions } from './extensions.js';
import { API_BASE_URL, getBearerToken, tokenScope } from './config.js';
import { parseToolFilter } from './tool-filter.js';
import { randomUUID, createHash } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ToolCallRateLimiter } from './tool-rate-limit.js';
import { annotateToolText } from './untrusted-content.js';
import { correlationIdFrom, createLogger, type LogFormat, type LogLevel, type PipelineLogger } from './logger.js';
import { NOOP_TELEMETRY, type TelemetryHooks } from './telemetry.js';
import './composite-tools.js';

/**
 * Creates a new, fully-configured Polarion MCP server.
 *
 * Registers handlers for tools (list/call), resources (list/read), and prompts
 * (list/get). A fresh instance should be created per transport connection; for
 * the Streamable HTTP transport that means one instance per session.
 *
 * @returns A {@link Server} ready to be connected to any MCP transport.
 */
/** @param tools - The deployment and session-filtered tool definitions. */
function toolsForClient(tools: ReadonlyMap<string, import('./types.js').McpToolDefinition>): Array<{ name: string; [key: string]: unknown }> {
  return [...tools.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: sanitizeInputSchema(def.inputSchema),
    ...(def.annotations ? { annotations: def.annotations } : {}),
    ...(def.outputSchema && !omitOutputSchema ? { outputSchema: lenientOutputSchema(def.outputSchema) } : {}),
  }));
}

interface ToolCallPipelineOptions {
  clientTools: ReadonlyMap<string, import('./types.js').McpToolDefinition>;
  virtualTools: readonly VirtualTool[];
  extensions: PolarionExtensions;
  maxResponseChars: number;
  logger: PipelineLogger;
  signal?: AbortSignal;
  rateLimiter: ToolCallRateLimiter;
  markUntrusted: boolean;
  telemetry: TelemetryHooks;
  correlationId?: string;
  server: Server;
  reportProgress?: (progress: { progress: number; total?: number; message?: string }) => Promise<void>;
}

function requiresConfirmation(toolName: string, annotations: import('./types.js').McpToolAnnotations | undefined): boolean {
  if (annotations?.readOnlyHint === true) return false;
  return annotations?.destructiveHint === true || /^(?:delete|patchAll)/i.test(toolName) || /bulk/i.test(toolName);
}

function actionSummary(toolName: string, args: Record<string, unknown>): string {
  const safe = JSON.stringify(args, (key, value) => /token|secret|password|authorization|pat/i.test(key) ? '[REDACTED]' : value);
  return `${toolName} ${safe ?? '{}'}`.slice(0, 800);
}

async function requestDestructiveConfirmation(server: Server, toolName: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<'accepted' | 'declined' | 'cancelled' | 'fallback'> {
  if (!server.getClientCapabilities()?.elicitation?.form) return args.confirm === true ? 'accepted' : 'fallback';
  try {
    const response = await server.elicitInput({
      mode: 'form',
      message: `Confirm this Polarion action: ${actionSummary(toolName, args)}`,
      requestedSchema: {
        type: 'object',
        properties: { confirm: { type: 'boolean', title: 'Confirm action', description: 'Allow this Polarion tool call to proceed.' } },
        required: ['confirm'],
      },
    }, { signal });
    if (response.action === 'accept' && response.content?.confirm === true) return 'accepted';
    return response.action === 'cancel' ? 'cancelled' : 'declined';
  } catch {
    return 'cancelled';
  }
}

/** Applies auth, policy, execution, and audit once for every MCP tools/call request. */
async function callToolPipeline(toolName: string, args: Record<string, unknown>, options: ToolCallPipelineOptions): Promise<CallToolResult> {
  const started = Date.now();
  const correlationId = options.correlationId ?? randomUUID();
  const virtual = options.virtualTools.find(tool => tool.name === toolName);
  const generated = options.clientTools.get(toolName);
  const annotations = virtual?.annotations ?? generated?.annotations;
  const destructive = requiresConfirmation(toolName, annotations);
  const bearerToken = getBearerToken();
  const callArgs = { ...args };
  delete callArgs.confirm;
  const userScope = tokenScope(bearerToken);
  let principal = { id: userScope ?? 'anonymous' } as Awaited<ReturnType<PolarionExtensions['authProvider']['validateRequest']>>;
  let outcome: 'success' | 'error' | 'denied' | 'confirmation-required' = 'error';
  let result: CallToolResult | undefined;
  const span = (() => {
    try { return options.telemetry.onSpanStart({ name: 'polarion.tools.call', correlationId, tool: toolName }); } catch { return undefined; }
  })();
  try {
    principal = await options.extensions.authProvider.validateRequest({ bearerToken, userScope });
    const retryAfter = options.rateLimiter.check(principal.id);
    if (retryAfter !== undefined) {
      outcome = 'denied';
      result = { content: [{ type: 'text', text: `Tool call rate limit exceeded. Retry in ${retryAfter} seconds.` }], isError: true };
      return result;
    }
    const decision = await options.extensions.policyHook.beforeCall({
      tool: toolName, args, user: principal,
      readOnly: annotations?.readOnlyHint === true,
      destructive,
    });
    if (decision.action === 'deny') {
      outcome = 'denied';
      result = { content: [{ type: 'text', text: decision.reason }], isError: true };
    } else if (decision.action === 'requireConfirmation' && args.dry_run !== true) {
      const confirmation = await requestDestructiveConfirmation(options.server, toolName, args, options.signal);
      if (confirmation !== 'accepted') {
        outcome = 'confirmation-required';
        const text = confirmation === 'fallback'
          ? 'This destructive tool requires confirmation. First repeat the call with dry_run: true to review its preview, then repeat the same call with confirm: true.'
          : confirmation === 'declined' ? 'The destructive tool call was declined.' : 'The destructive tool call was cancelled.';
        result = { content: [{ type: 'text', text }], isError: true };
      } else if (virtual) {
        const resolved = await options.extensions.instanceResolver.resolve(principal);
        result = await virtual.handler(callArgs, {
          callPolarionTool: async (name, callArgs) => {
            const definition = options.clientTools.get(name);
            if (!definition) return { content: [{ type: 'text', text: `Error: Unknown tool requested: ${name}` }], isError: true };
            return executeApiTool(name, definition, callArgs, securitySchemes, undefined, options.maxResponseChars, resolved.apiBaseUrl);
          },
          requestBearerToken: bearerToken,
          userScope,
          logger: options.logger,
          signal: options.signal ?? new AbortController().signal,
          reportProgress: async () => undefined,
        });
        outcome = result.isError ? 'error' : 'success';
      } else if (generated) {
        const resolved = await options.extensions.instanceResolver.resolve(principal);
        result = await executeApiTool(toolName, generated, callArgs, securitySchemes, undefined, options.maxResponseChars, resolved.apiBaseUrl);
        outcome = result.isError ? 'error' : 'success';
      } else {
        result = { content: [{ type: 'text', text: `Error: Unknown tool requested: ${toolName}` }], isError: true };
        outcome = 'error';
      }
    } else if (virtual) {
      const resolved = await options.extensions.instanceResolver.resolve(principal);
      result = await virtual.handler(callArgs, {
        callPolarionTool: async (name, callArgs) => {
          // Composite dependencies remain callable when a request narrows the
          // visible toolset to `composites`; deployment-level MCP_TOOLS and
          // MCP_READ_ONLY filtering has already been applied to enabledTools.
          const definition = enabledTools.get(name);
          if (!definition) return { content: [{ type: 'text', text: `Error: Unknown tool requested: ${name}` }], isError: true };
          return executeApiTool(name, definition, callArgs, securitySchemes, undefined, options.maxResponseChars, resolved.apiBaseUrl);
        },
        requestBearerToken: bearerToken,
        userScope,
        logger: options.logger,
        signal: options.signal ?? new AbortController().signal,
        reportProgress: options.reportProgress ?? (async () => undefined),
      });
      outcome = result.isError ? 'error' : 'success';
    } else if (generated) {
      const resolved = await options.extensions.instanceResolver.resolve(principal);
      result = await executeApiTool(toolName, generated, callArgs, securitySchemes, undefined, options.maxResponseChars, resolved.apiBaseUrl);
      outcome = result.isError ? 'error' : 'success';
    } else {
      options.logger.error(`[ERROR] Unknown tool requested: ${toolName}`);
      result = { content: [{ type: 'text', text: `Error: Unknown tool requested: ${toolName}` }], isError: true };
      outcome = 'error';
    }
  } catch (error) {
    result = { content: [{ type: 'text', text: error instanceof Error ? error.message : 'Tool call failed' }], isError: true };
    outcome = 'error';
  } finally {
    const durationMs = Math.max(0, Date.now() - started);
    await options.extensions.auditSink.record({
      timestamp: new Date().toISOString(), correlationId, tool: toolName,
      argsHash: hashAuditValue(args),
      userIdHash: createHash('sha256').update(principal.id).digest('hex'),
      outcome, durationMs,
    });
    try { options.telemetry.onSpanEnd(span, { correlationId, tool: toolName, outcome, durationMs }); } catch { /* telemetry must not change the tool result */ }
    options.logger.toolCall?.({ correlationId, tool: toolName, outcome, durationMs, msg: outcome === 'success' ? 'Tool call completed' : 'Tool call ended', secrets: bearerToken ? [bearerToken] : [] });
  }
  if (!result!.isError) {
    result!.content = result!.content.map(item => item.type === 'text'
      ? { ...item, text: annotateToolText(item.text, options.markUntrusted) }
      : item);
  }
  return result!;
}

export interface PolarionServerOptions {
  maxResponseChars?: number;
  filter?: ToolFilter;
  extensions?: Partial<PolarionExtensions>;
  apiBaseUrl?: string;
  logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  logFormat?: LogFormat;
  logLevel?: LogLevel;
  telemetry?: TelemetryHooks;
  /** Require policy confirmation before destructive and bulk tools. Defaults off. */
  confirmDestructive?: boolean;
  /** Calls per user per rolling minute; zero disables the limiter. */
  rateLimitTools?: number;
  /** Clock injection for deterministic sliding-window tests. */
  now?: () => number;
  /** Wrap user-authored Polarion strings in untrusted-content markers. */
  markUntrusted?: boolean;
}

export function createPolarionServer(options: PolarionServerOptions = {}): Server {
  const logger: PipelineLogger = options.logger ?? createLogger({ format: options.logFormat, level: options.logLevel });
  const deploymentFilter = parseToolFilter(process.env);
  const intersect = (left?: readonly string[], right?: readonly string[]) => left && right
    ? left.filter(value => right.includes(value))
    : left ?? right;
  const filter: ToolFilter = {
    allow: intersect(deploymentFilter.allow, options.filter?.allow) ? [...intersect(deploymentFilter.allow, options.filter?.allow)!] : undefined,
    readOnly: deploymentFilter.readOnly || options.filter?.readOnly,
    toolsets: options.filter?.toolsets,
  };
  const clientTools = filterTools(enabledTools, options.filter ?? {}).tools;
  const virtualTools = listVirtualTools(filter);
  const allNames = new Set(clientTools.keys());
  for (const tool of virtualTools) {
    if (allNames.has(tool.name)) throw new Error(`Virtual tool conflicts with generated tool: ${tool.name}`);
    allNames.add(tool.name);
  }
  const knownNames = new Set([...toolDefinitionMap.keys(), ...listVirtualTools().map(tool => tool.name)]);
  const unknown = (filter.allow ?? []).filter(name => !knownNames.has(name));
  if (unknown.length > 0) logger.warn(`[WARN] MCP_TOOLS names unknown tools, ignored: ${unknown.join(', ')}`);
  if (allNames.size === 0 && !options.filter) throw new Error('The tool filter (MCP_TOOLS, MCP_READ_ONLY, MCP_TOOLSETS) leaves no tools; check the names and toolsets');
  const apiBaseUrl = options.apiBaseUrl ?? API_BASE_URL;
  const extensions = { ...createDefaultExtensions(apiBaseUrl, options.confirmDestructive ?? false), ...options.extensions };
  const rateLimiter = new ToolCallRateLimiter(options.rateLimitTools ?? 0, options.now);
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},      // API operations (GET, POST, PATCH, DELETE endpoints)
        resources: {},  // Documentation and configuration files
        prompts: {},    // Pre-configured task templates
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  /**
   * Handler: List Available Tools.
   *
   * Sanitizes each tool's input schema so property names are MCP-safe; the
   * executor maps the sanitized names back to the originals.
   */
  const listedTools = [
    ...toolsForClient(clientTools),
    ...virtualTools.map(def => ({
      name: def.name,
      title: def.title,
      description: def.description,
      inputSchema: sanitizeInputSchema(def.inputSchema),
      ...(def.annotations ? { annotations: def.annotations } : {}),
    })),
  ].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listedTools as any[] }));

  /**
   * Handler: Execute a Tool (API Call).
   *
   * Looks up the requested tool and delegates execution (validation, auth, HTTP
   * call, response formatting) to {@link executeApiTool}.
   */
  server.setRequestHandler(CallToolRequestSchema, (request, extra) => {
    const requestHeader = extra?.requestInfo?.headers['x-request-id'];
    const progressToken = extra?._meta?.progressToken;
    return callToolPipeline(
      request.params.name,
      (request.params.arguments ?? {}) as Record<string, unknown>,
      {
        clientTools, virtualTools, extensions,
        maxResponseChars: options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS,
        logger, signal: extra?.signal, rateLimiter, markUntrusted: options.markUntrusted ?? false,
        telemetry: options.telemetry ?? NOOP_TELEMETRY,
        correlationId: correlationIdFrom(typeof requestHeader === 'string' ? requestHeader : undefined), server,
        reportProgress: progressToken === undefined ? undefined : async progress => {
          await extra.sendNotification({
            method: 'notifications/progress',
            params: { progressToken, ...progress },
          });
        },
      },
    );
  });

  /**
   * Handler: List Available Resources (SDK docs, OpenAPI specs, cached configs).
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: listPolarionResources() };
  });

  /**
   * Handler: Read a Specific Resource by its `polarion://` URI.
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return await readPolarionResource(request.params.uri);
  });

  /**
   * Handler: List Available Prompt templates.
   */
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: getPolarionPrompts() };
  });

  /**
   * Handler: Get a Specific Prompt template, customized with the given arguments.
   */
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return getPolarionPrompt(name, args);
  });

  return server;
}
