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
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { SERVER_NAME, SERVER_VERSION } from './config.js';
import { compileZodSchema, normalizeDryRun, sanitizeInputSchema } from './utils.js';
import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt, SERVER_INSTRUCTIONS } from './polarion.js';
import { securitySchemes, toolDefinitionMap } from './tools.js';
import { enabledTools, filterTools, omitOutputSchema, type ToolFilter } from './tool-filter.js';
import { executeApiTool, capToolResponseText, DEFAULT_MAX_RESPONSE_CHARS } from './executor.js';
import { lenientOutputSchema } from './output-schema.js';
import { listVirtualTools, discoverVirtualTools, type VirtualTool } from './virtual-tools.js';
import { createDefaultExtensions, hashAuditValue, type PolarionExtensions } from './extensions.js';
import { API_BASE_URL, getBearerToken, tokenScope, callerCacheScope } from './config.js';
import { parseToolFilter } from './tool-filter.js';
import { MetadataCache, type MetadataKind } from './metadata-cache.js';
import { renderRichTextFieldsAsMarkdown } from './markdown.js';
import { randomUUID, createHash } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ToolCallRateLimiter } from './tool-rate-limit.js';
import { annotatePolarionResult, annotateToolText, markUntrustedText } from './untrusted-content.js';
import { correlationIdFrom, createLogger, type LogFormat, type LogLevel, type PipelineLogger } from './logger.js';
import { createVersionCheck } from './version-check.js';
import { NOOP_TELEMETRY, type TelemetryHooks } from './telemetry.js';
import './composite-tools.js';
import { decodePolarionIdentifier, registerCompositeTools } from './composite-search.js';
import { executeTool as executeToolWithPagination } from './tool-execution.js';

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
  transport: 'stdio' | 'http';
  correlationId?: string;
  server: Server;
  reportProgress?: (progress: { progress: number; total?: number; message?: string }) => Promise<void>;
}

function requiresConfirmation(toolName: string, annotations: import('./types.js').McpToolAnnotations | undefined): boolean {
  if (annotations?.readOnlyHint === true) return false;
  return annotations?.destructiveHint === true || /^(?:delete|patchAll)/i.test(toolName) || /bulk/i.test(toolName);
}

function actionSummary(toolName: string, args: Record<string, unknown>): string {
  const safe = JSON.stringify(args, (key, value) => /^(?:pat|token|secret|password|authorization)$/i.test(key) || /(?:token|secret)$/i.test(key) ? '[REDACTED]' : value);
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
  // Discover mode is a wrapper for the real tool. Dispatch before the pipeline
  // so only the target call consumes policy, limiter, audit, telemetry, and marking.
  if (options.virtualTools.some(tool => tool.name === 'call_tool')) {
    const virtual = options.virtualTools.find(tool => tool.name === 'call_tool');
    if (toolName === virtual?.name) {
      const target = String(args.name ?? '');
      if (!options.clientTools.has(target)) return { content: [{ type: 'text', text: `Error: Unknown or filtered tool: ${target}` }], isError: true };
      return callToolPipeline(target, (args.arguments ?? {}) as Record<string, unknown>, options);
    }
  }
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
  let outcome = 'error' as 'success' | 'error' | 'denied' | 'confirmation-required';
  let result: CallToolResult | undefined;
  const span = (() => {
    try { return options.telemetry.onSpanStart({ name: 'polarion.tools.call', correlationId, tool: toolName }); } catch { return undefined; }
  })();
    const execute = async (): Promise<void> => {
      if (virtual) {
        const resolved = await options.extensions.instanceResolver.resolve(principal);
        result = await virtual.handler(callArgs, {
          callPolarionTool: async (name, callArgs) => {
            // Composite dependencies remain callable when a request narrows the
            // visible toolset to `composites`; deployment-level MCP_TOOLS and
            // MCP_READ_ONLY filtering has already been applied to enabledTools.
            const definition = enabledTools.get(name);
            if (!definition) return { content: [{ type: 'text', text: `Error: Unknown tool requested: ${name}` }], isError: true };
            return executeToolWithPagination(name, definition, callArgs, securitySchemes, executeApiTool, {
              apiBaseUrl: resolved.apiBaseUrl, maxResponseChars: options.maxResponseChars, signal: options.signal,
              beforeNextPage: () => {
                const retryAfter = options.rateLimiter.check(principal.id);
                if (retryAfter !== undefined) throw new Error(`Tool call rate limit exceeded. Retry in ${retryAfter} seconds.`);
              },
            });
          },
          requestBearerToken: bearerToken,
          userScope,
          apiBaseUrl: resolved.apiBaseUrl,
          transport: options.transport,
          logger: options.logger,
          signal: options.signal ?? new AbortController().signal,
          reportProgress: options.reportProgress ?? (async () => undefined),
        });
        outcome = result.isError ? 'error' : 'success';
      } else if (generated) {
        const resolved = await options.extensions.instanceResolver.resolve(principal);
        result = await executeToolWithPagination(toolName, generated, callArgs, securitySchemes, executeApiTool, {
          apiBaseUrl: resolved.apiBaseUrl, maxResponseChars: options.maxResponseChars, signal: options.signal,
          beforeNextPage: () => {
            const retryAfter = options.rateLimiter.check(principal.id);
            if (retryAfter !== undefined) throw new Error(`Tool call rate limit exceeded. Retry in ${retryAfter} seconds.`);
          },
        });
        if (/^(1|true|yes|on)$/i.test(process.env.MCP_RESOURCE_LINKS ?? '') && !result.isError) {
        const uri = toolName === 'getWorkItem' ? `polarion://project/${encodeURIComponent(String(args.projectId ?? ''))}/workitem/${encodeURIComponent(String(args.workItemId ?? ''))}`
          : toolName === 'getDocument' ? `polarion://project/${encodeURIComponent(String(args.projectId ?? ''))}/document/${encodeURIComponent(String(args.spaceId ?? ''))}/${encodeURIComponent(String(args.documentName ?? ''))}` : undefined;
        if (uri) result.content.push({ type: 'resource_link', uri, name: toolName === 'getWorkItem' ? String(args.workItemId) : String(args.documentName), mimeType: 'text/markdown' });
      }
      outcome = result.isError ? 'error' : 'success';
      } else {
        options.logger.error(`[ERROR] Unknown tool requested: ${toolName}`);
        result = { content: [{ type: 'text', text: `Error: Unknown tool requested: ${toolName}` }], isError: true };
        outcome = 'error';
      }
    };
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
    } else {
      // Normalize and validate before confirmation selection, so malformed flags
      // cannot turn a preview request into a write and virtual schemas are not
      // merely descriptive.
      const dryRun = normalizeDryRun(args.dry_run);
      if (dryRun !== undefined) callArgs.dry_run = dryRun;
      if (virtual) {
        const properties = virtual.inputSchema?.properties as Record<string, unknown> | undefined;
        const openSchema = properties === undefined || virtual.inputSchema.additionalProperties === true;
        const unknown = openSchema ? [] : Object.keys(callArgs).filter(key => !key.startsWith('_') && key !== 'dry_run' && !Object.hasOwn(properties, key));
        if (unknown.length) throw new Error(`Invalid arguments for tool '${toolName}': unknown argument(s) ${unknown.join(', ')}`);
        // dry_run is a shared control: strict schemas that do not declare it must not reject it.
        const schemaInput = Object.fromEntries(Object.entries(callArgs).filter(([key]) => !key.startsWith('_') && (key !== 'dry_run' || (properties !== undefined && Object.hasOwn(properties, key)))));
        let validated: Record<string, unknown>;
        try {
          validated = compileZodSchema(virtual.inputSchema).parse(schemaInput) as Record<string, unknown>;
        } catch (error) {
          if (error instanceof Error && error.name === 'ZodError') {
            const issues = (error as Error & { issues?: Array<{ path: PropertyKey[]; message: string }> }).issues ?? [];
            throw new Error(`Invalid arguments for tool '${toolName}': ${issues.map(issue => `${issue.path.join('.') || 'arguments'}: ${issue.message}`).join(', ')}`, { cause: error });
          }
          throw new Error(`Could not validate arguments for tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
        // Keep protocol metadata and the shared dry_run control available to
        // handlers, matching the generated executor's reserved-key behavior.
        Object.assign(callArgs, openSchema ? schemaInput : validated, Object.fromEntries(Object.entries(args).filter(([key]) => key.startsWith('_'))));
        if (dryRun !== undefined) callArgs.dry_run = dryRun;
      }
      const safePreview = dryRun === true && (generated?.inputSchema?.properties?.dry_run !== undefined || virtual?.dryRunSafe === true);
      if (decision.action === 'requireConfirmation' && !safePreview) {
        const confirmation = await requestDestructiveConfirmation(options.server, toolName, args, options.signal);
        if (confirmation !== 'accepted') {
          outcome = 'confirmation-required';
          const text = confirmation === 'fallback'
            ? 'This destructive tool requires confirmation; repeat the call with confirm: true; use dry_run: true first to preview.'
            : confirmation === 'declined' ? 'The destructive tool call was declined.' : 'The destructive tool call was cancelled.';
          result = { content: [{ type: 'text', text }], isError: true };
        } else {
          await execute();
        }
      } else {
        await execute();
      }
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
  if (options.markUntrusted && !result!.isError) {
    if (result!.structuredContent !== undefined) result!.structuredContent = annotatePolarionResult(result!.structuredContent, true) as Record<string, unknown>;
    result!.content = result!.content.map(item => item.type === 'text'
      ? { ...item, text: annotateToolText(item.text, options.markUntrusted) }
      : item);
  }
  // Upstream error bodies can echo user-authored content (titles, query fragments).
  if (options.markUntrusted && result!.isError && outcome === 'error' && generated) {
    result!.content = result!.content.map(item => item.type === 'text' ? { ...item, text: markUntrustedText(item.text) } : item);
  }
  // Virtual handlers and the marker annotation both run after the executor's
  // cap, so the cap is applied to the final text the client receives, errors included.
  const definition = virtual ?? generated;
  if (definition) {
    const maxChars = options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS;
    result!.content = result!.content.map(item => item.type === 'text'
      ? { ...item, text: capToolResponseText(item.text, maxChars, definition) }
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
  /** Shared across HTTP sessions to enforce a deployment-wide per-user budget. */
  rateLimiter?: ToolCallRateLimiter;
  /** Shared across HTTP sessions; keys remain scoped by caller and deployment. */
  metadataCache?: MetadataCache;
  /** Wrap user-authored Polarion strings in untrusted-content markers. */
  markUntrusted?: boolean;
  /** Current transport; local file uploads are restricted to stdio. Defaults to HTTP-safe. */
  transport?: 'stdio' | 'http';
}

/**
 * Builds a caller that runs tools through the same pipeline as MCP tools/call
 * (auth, rate limit, policy, confirmation, audit, marking) for transports with
 * no MCP client, such as the Custom GPT REST routes. With no client to prompt,
 * a destructive call needs `confirm: true` in its arguments.
 */
export function createToolCaller(options: PolarionServerOptions & { tools: ReadonlyMap<string, import('./types.js').McpToolDefinition> }):
  (name: string, args: Record<string, unknown>, signal?: AbortSignal) => Promise<CallToolResult> {
  const logger: PipelineLogger = options.logger ?? createLogger({ format: options.logFormat, level: options.logLevel });
  const apiBaseUrl = options.apiBaseUrl ?? API_BASE_URL;
  const extensions = { ...createDefaultExtensions(apiBaseUrl, options.confirmDestructive ?? false), ...options.extensions };
  const rateLimiter = options.rateLimiter ?? new ToolCallRateLimiter(options.rateLimitTools ?? 0, options.now);
  const noClient = { getClientCapabilities: () => undefined } as unknown as Server;
  return (name, args, signal) => callToolPipeline(name, args, {
    clientTools: options.tools, virtualTools: [], extensions,
    maxResponseChars: options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS,
    logger, signal, rateLimiter, markUntrusted: options.markUntrusted ?? false,
    telemetry: options.telemetry ?? NOOP_TELEMETRY, transport: 'http', server: noClient,
  });
}

export function createPolarionServer(options: PolarionServerOptions = {}): Server {
  const logger: PipelineLogger = options.logger ?? createLogger({ format: options.logFormat, level: options.logLevel });
  registerCompositeTools();
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
  const mode = process.env.MCP_MODE ?? 'full';
  if (mode !== 'full' && mode !== 'discover') throw new Error('MCP_MODE must be full or discover');
  const virtualTools = mode === 'discover' ? discoverVirtualTools(clientTools) : listVirtualTools(filter);
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
  const checkVersion = process.env.MCP_VERSION_CHECK?.trim().toLowerCase() === 'true'
    ? createVersionCheck({ apiBaseUrl, bearerToken: options.transport === 'stdio' ? process.env.BEARER_TOKEN : undefined, logger })
    : undefined;
  const extensions = { ...createDefaultExtensions(apiBaseUrl, options.confirmDestructive ?? false), ...options.extensions };
  const rateLimiter = options.rateLimiter ?? new ToolCallRateLimiter(options.rateLimitTools ?? 0, options.now);
  const completionsEnabled = /^(1|true|yes|on)$/i.test(process.env.MCP_COMPLETIONS ?? '');
  const metadataCache = options.metadataCache ?? new MetadataCache();
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},      // API operations (GET, POST, PATCH, DELETE endpoints)
        resources: {},  // Documentation and configuration files
        prompts: {},    // Pre-configured task templates
        ...(completionsEnabled ? { completions: {} } : {}),
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
  const listedTools = mode === 'discover' ? virtualTools.map(def => ({ name: def.name, title: def.title, description: def.description, inputSchema: sanitizeInputSchema(def.inputSchema), annotations: def.annotations })) : [
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
    checkVersion?.();
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
        transport: options.transport ?? 'http',
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
    const uri = request.params.uri;
    if (uri.startsWith('polarion://project/')) return await readProjectResource(uri, { clientTools, virtualTools, extensions, maxResponseChars: options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS, logger, rateLimiter, markUntrusted: options.markUntrusted ?? false, telemetry: options.telemetry ?? NOOP_TELEMETRY, transport: options.transport ?? 'http', server });
    return await readPolarionResource(request.params.uri);
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({ resourceTemplates: [
    ...(clientTools.has('getWorkItem') ? [{ uriTemplate: 'polarion://project/{projectId}/workitem/{workItemId}', name: 'Polarion Work Item', mimeType: 'text/markdown' }] : []),
    ...(clientTools.has('getDocument') ? [{ uriTemplate: 'polarion://project/{projectId}/document/{spaceId}/{documentName}', name: 'Polarion Document', mimeType: 'text/markdown' }] : []),
    ...(clientTools.has('getProject') ? [{ uriTemplate: 'polarion://project/{projectId}', name: 'Polarion project', mimeType: 'text/markdown' }] : []),
  ] }));

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

  if (completionsEnabled) server.setRequestHandler(CompleteRequestSchema, async request => {
    const { argument, context } = request.params;
    const projectId = context?.arguments?.projectId ?? '';
    const scope = callerCacheScope();
    const kind: MetadataKind | undefined = argument.name === 'projectId' ? 'projects'
      : argument.name === 'workItemType' || argument.name === 'type' ? 'work-item-types'
      : argument.name === 'status' ? 'statuses'
      : argument.name === 'enum' || argument.name === 'enumValue' ? 'enums'
      : argument.name === 'user' || argument.name === 'assignee' ? 'users' : undefined;
    let values: string[] = [];
    try {
      if (kind) {
        const fieldId = String(context?.arguments?.fieldId ?? (kind === 'work-item-types' ? 'type' : kind === 'statuses' ? 'status' : ''));
        const workItemType = String(context?.arguments?.workItemType ?? '');
        const cached = metadataCache.get(apiBaseUrl, scope, kind, projectId, fieldId, workItemType);
        if (cached) values = cached;
        else {
          const tool = kind === 'projects' ? 'getProjects' : kind === 'users' ? 'getUsers' : 'getAvailableEnumOptionsForWorkItemType';
          const args: Record<string, unknown> = kind === 'projects' || kind === 'users' ? {}
            : kind === 'work-item-types' ? { projectId, fieldId, type: '~' }
            : kind === 'statuses' ? { projectId, fieldId, type: context?.arguments?.workItemType ?? '~' }
            : kind === 'enums' ? { projectId, fieldId, type: context?.arguments?.workItemType ?? '~' }
            : { projectId, resourceType: 'workitems' };
          const result = await callToolPipeline(tool, args, { clientTools, virtualTools, extensions, maxResponseChars: options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS, logger, rateLimiter, markUntrusted: options.markUntrusted ?? false, telemetry: options.telemetry ?? NOOP_TELEMETRY, transport: options.transport ?? 'http', server });
          const raw = result.structuredContent ?? result.content?.map(item => item.type === 'text' ? item.text : '').join(' ') ?? '';
          let parsed: unknown = raw;
          if (typeof raw === 'string') { try { parsed = JSON.parse(raw); } catch { parsed = raw; } }
          values = extractCompletionValues(parsed, argument.name);
          metadataCache.set(apiBaseUrl, scope, kind, values, projectId, fieldId, workItemType);
        }
      }
    } catch { values = []; }
    const prefix = argument.value.toLowerCase();
    const matches = [...new Set(values)].filter(value => value.toLowerCase().includes(prefix)).slice(0, 100);
    return { completion: { values: matches, total: matches.length, isIncomplete: false } };
  });

  return server;
}

function extractCompletionValues(value: unknown, argument: string): string[] {
  const fields = argument === 'projectId' ? ['id'] : ['id', 'name', 'label', 'value'];
  const found = new Set<string>();
  const walk = (item: unknown) => {
    if (Array.isArray(item)) { item.forEach(walk); return; }
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    for (const field of fields) if (typeof record[field] === 'string' && (field !== 'id' || record.type !== undefined || argument === 'projectId')) found.add(record[field] as string);
    Object.values(record).forEach(walk);
  };
  walk(value);
  return [...found];
}

const MAX_DYNAMIC_RESOURCE_CHARS = 100_000;
async function readProjectResource(uri: string, pipelineOptions: ToolCallPipelineOptions) {
  let match = /^polarion:\/\/project\/([^/]+)\/workitem\/([^/]+)$/.exec(uri);
  let name: string; let args: Record<string, unknown>;
  if (match) { name = 'getWorkItem'; args = { projectId: decodePolarionIdentifier(match[1]), workItemId: decodePolarionIdentifier(match[2], true) }; }
  else if ((match = /^polarion:\/\/project\/([^/]+)\/document\/([^/]+)\/([^/]+)$/.exec(uri))) { name = 'getDocument'; args = { projectId: decodePolarionIdentifier(match[1]), spaceId: decodePolarionIdentifier(match[2]), documentName: decodePolarionIdentifier(match[3]) }; }
  else if ((match = /^polarion:\/\/project\/([^/]+)$/.exec(uri))) { name = 'getProject'; args = { projectId: decodePolarionIdentifier(match[1]) }; }
  else throw new Error(`Invalid Polarion resource URI: ${uri}`);
  const result = await callToolPipeline(name, args, pipelineOptions);
  if (result.isError) throw new Error(result.content.map(item => item.type === 'text' ? item.text : '').join('\n'));
  let data: unknown = result.structuredContent;
  if (!data) { const text = result.content.find(item => item.type === 'text'); if (text?.type === 'text') { try { data = JSON.parse(text.text); } catch { data = text.text; } } }
  const rendered = renderRichTextFieldsAsMarkdown(data);
  let text = `# ${name}\n\n${JSON.stringify(rendered, null, 2)}`;
  if (text.length > MAX_DYNAMIC_RESOURCE_CHARS) text = `${text.slice(0, MAX_DYNAMIC_RESOURCE_CHARS)}\n\n[Truncated]`;
  return { contents: [{ uri, mimeType: 'text/markdown', text }] };
}
