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
import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt } from './polarion.js';
import { toolDefinitionMap, securitySchemes } from './tools.js';
import { executeApiTool } from './executor.js';

/**
 * Creates a new, fully-configured Polarion MCP server.
 *
 * Registers handlers for tools (list/call), resources (list/read), and prompts
 * (list/get). A fresh instance should be created per transport connection; for
 * the Streamable HTTP transport that means one instance per session.
 *
 * @returns A {@link Server} ready to be connected to any MCP transport.
 */
export function createPolarionServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},      // API operations (GET, POST, PATCH, DELETE endpoints)
        resources: {},  // Documentation and configuration files
        prompts: {},    // Pre-configured task templates
      },
    },
  );

  /**
   * Handler: List Available Tools.
   *
   * Sanitizes each tool's input schema so property names are MCP-safe and
   * records the sanitized -> original name mapping used later during execution.
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsForClient = Array.from(toolDefinitionMap.values()).map(def => {
      const nameMap = {};
      const sanitizedSchema = sanitizeInputSchema(def.inputSchema, nameMap);
      def.nameMap = nameMap;
      return {
        name: def.name,
        description: def.description,
        inputSchema: sanitizedSchema,
      };
    });
    return { tools: toolsForClient };
  });

  /**
   * Handler: Execute a Tool (API Call).
   *
   * Looks up the requested tool and delegates execution (validation, auth, HTTP
   * call, response formatting) to {@link executeApiTool}.
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const toolDefinition = toolDefinitionMap.get(toolName);
    if (!toolDefinition) {
      console.error(`[ERROR] Unknown tool requested: ${toolName}`);
      return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
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
