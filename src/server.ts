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
import { securitySchemes } from './tools.js';
import { enabledTools, filterTools, omitOutputSchema, type ToolFilter } from './tool-filter.js';
import { executeApiTool } from './executor.js';
import { lenientOutputSchema } from './output-schema.js';

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
function toolsForClient(tools: ReadonlyMap<string, import('./types.js').McpToolDefinition>): object[] {
  return [...tools.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: sanitizeInputSchema(def.inputSchema),
    ...(def.annotations ? { annotations: def.annotations } : {}),
    ...(def.outputSchema && !omitOutputSchema ? { outputSchema: lenientOutputSchema(def.outputSchema) } : {}),
  }));
}

export function createPolarionServer(filter: ToolFilter = {}): Server {
  const clientTools = filterTools(enabledTools, filter).tools;
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
  const listedTools = toolsForClient(clientTools);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listedTools as any[] }));

  /**
   * Handler: Execute a Tool (API Call).
   *
   * Looks up the requested tool and delegates execution (validation, auth, HTTP
   * call, response formatting) to {@link executeApiTool}.
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const toolDefinition = clientTools.get(toolName);
    if (!toolDefinition) {
      console.error(`[ERROR] Unknown tool requested: ${toolName}`);
      return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }], isError: true };
    }
    return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
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
