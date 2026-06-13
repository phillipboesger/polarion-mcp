/**
 * MCP (Model Context Protocol) Server for Polarion REST API
 *
 * This is the main entry point for the MCP server that provides access to Polarion's REST API.
 * The server acts as a bridge between AI assistants and the Polarion ALM (Application Lifecycle Management) system.
 *
 * Key Concepts:
 * - MCP Server: A standardized interface for AI assistants to interact with external tools and resources
 * - Tools: API operations that can be invoked (e.g., create work item, get project info)
 * - Resources: Documentation and configuration data (e.g., SDK docs, project configs)
 * - Prompts: Pre-defined templates for common tasks
 *
 * Architecture:
 * - This file sets up the MCP server and registers request handlers
 * - Actual API calls are delegated to specialized modules (executor.ts, polarion.ts, etc.)
 * - Communication happens via stdio (standard input/output) using the MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import from our modular files
import { SERVER_NAME, SERVER_VERSION, API_BASE_URL } from './config.js';
import { sanitizeInputSchema } from './utils.js';
import { listPolarionResources, readPolarionResource, getPolarionPrompts, getPolarionPrompt } from './polarion.js';
import { toolDefinitionMap, securitySchemes } from './tools.js';
import { executeApiTool } from './executor.js';

/**
 * MCP Server instance
 *
 * The server is initialized with:
 * - name: Identifier for this server (from config.ts)
 * - version: Server version (from config.ts)
 * - capabilities: What features this server supports (tools, resources, prompts)
 */
const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, {
  capabilities: {
    tools: {},      // API operations (GET, POST, PATCH, DELETE endpoints)
    resources: {},  // Documentation and configuration files
    prompts: {}     // Pre-configured task templates
  }
});
/**
 * Request Handlers
 *
 * These handlers respond to requests from AI assistants via the MCP protocol.
 * Each handler is responsible for a specific type of operation:
 * - ListTools: Returns available API operations
 * - CallTool: Executes a specific API operation
 * - ListResources: Returns available documentation/configs
 * - ReadResource: Retrieves a specific resource
 * - ListPrompts: Returns available prompt templates
 * - GetPrompt: Retrieves a specific prompt template
 */

/**
 * Handler: List Available Tools
 *
 * This handler returns all available API operations to the AI assistant.
 *
 * Process Flow:
 * 1. Iterate through all tool definitions (from tools.ts)
 * 2. Sanitize input schemas to ensure MCP compliance
 *    - Property names must match pattern: [a-zA-Z0-9_.-]{1,64}
 *    - Invalid characters are replaced with underscores
 * 3. Build a name mapping (sanitized name -> original name) for later use
 * 4. Return the sanitized tool definitions
 *
 * Why sanitize?
 * - Some API parameter names use special characters (e.g., "page[size]")
 * - MCP protocol requires simpler naming conventions
 * - We maintain a mapping to restore original names during execution
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient = Array.from(toolDefinitionMap.values()).map(def => {
    // Sanitize the input schema and build name mapping
    const nameMap = {};
    const sanitizedSchema = sanitizeInputSchema(def.inputSchema, nameMap);

    // Store the name map in the definition for use during execution
    // This allows executeApiTool() to convert sanitized names back to original names
    def.nameMap = nameMap;

    return {
      name: def.name,
      description: def.description,
      inputSchema: sanitizedSchema
    };
  });
  return { tools: toolsForClient };
});
/**
 * Handler: Execute a Tool (API Call)
 *
 * This handler executes a specific API operation requested by the AI assistant.
 *
 * Process Flow:
 * 1. Extract tool name and arguments from the request
 * 2. Look up the tool definition in our map
 * 3. Validate that the tool exists
 * 4. Delegate to executeApiTool() which:
 *    - Validates arguments against schema
 *    - Applies authentication/security
 *    - Makes the HTTP request to Polarion
 *    - Returns formatted response
 *
 * Error Handling:
 * - Unknown tool names return an error message
 * - Execution errors are caught and formatted by executeApiTool()
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: toolArgs } = request.params;

  // Look up the tool definition
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`[ERROR] Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }

  // Execute the tool with:
  // - toolName: The name of the operation (e.g., "getWorkItem")
  // - toolDefinition: Complete definition including HTTP method, path, parameters
  // - toolArgs: Arguments provided by the AI assistant (may use sanitized names)
  // - securitySchemes: Available authentication methods
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});

/**
 * Handler: List Available Resources
 *
 * Returns all available documentation and configuration resources.
 * Resources include:
 * - Online SDK documentation (HTML)
 * - OpenAPI specifications (JSON)
 * - PDF guides (local copies for fast access)
 * - Project configurations (dynamically cached)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: listPolarionResources() };
});

/**
 * Handler: Read a Specific Resource
 *
 * Retrieves the content of a specific resource by URI.
 *
 * URI Format: polarion://category/resource-name
 * Examples:
 * - polarion://sdk/javadoc (online documentation)
 * - polarion://local/scripting-guide (local PDF file)
 * - polarion://config/myproject (cached project configuration)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await readPolarionResource(request.params.uri);
});

/**
 * Handler: List Available Prompts
 *
 * Returns pre-configured prompt templates for common tasks.
 * Prompts help AI assistants perform complex multi-step operations.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: getPolarionPrompts() };
});

/**
 * Handler: Get a Specific Prompt
 *
 * Retrieves a specific prompt template with optional arguments.
 * The prompt can be customized based on the provided arguments.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return getPolarionPrompt(name, args);
});
/**
 * Main function to start the server
 *
 * This function:
 * 1. Creates a stdio transport (communication channel via standard input/output)
 * 2. Connects the MCP server to this transport
 * 3. Logs startup information to stderr (stdout is reserved for MCP protocol)
 *
 * Why stdio?
 * - MCP protocol uses stdio for communication between AI assistants and servers
 * - Standard output (stdout) carries MCP messages
 * - Standard error (stderr) is used for logging and diagnostics
 * - This allows the server to run as a subprocess of an AI assistant
 */
async function main() {
  // Set up stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Info messages go to stderr in MCP (stdout is reserved for protocol)
    console.error(`[INFO] ${SERVER_NAME} MCP Server (v${SERVER_VERSION}) running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);
  }
  catch (error) {
    console.error("[ERROR] Error during server startup:", error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 *
 * Called when the server receives a termination signal (SIGINT or SIGTERM).
 * Ensures that the server shuts down cleanly and releases any resources.
 */
async function cleanup() {
  console.error("[INFO] Shutting down MCP server...");
  process.exit(0);
}

// Register signal handlers for graceful shutdown
// SIGINT: Sent when user presses Ctrl+C
// SIGTERM: Sent by system or process manager when requesting termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("[ERROR] Fatal error in main execution:", error);
  process.exit(1);
});
