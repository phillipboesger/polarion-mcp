/**
 * MCP (Model Context Protocol) Server for Polarion REST API — stdio entry point.
 *
 * This is the entry point for the local (stdio) MCP server. It builds the shared
 * Polarion server via {@link createPolarionServer} and connects it to a stdio
 * transport, so MCP-aware clients (Claude Code, Claude Desktop, VS Code) can
 * launch it as a subprocess.
 *
 * For the remote HTTPS transport (e.g. Claude.ai custom connectors), see
 * src/mcp-http-server.ts. Both entry points share the exact same tools,
 * resources, and prompts from src/server.ts.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { SERVER_NAME, SERVER_VERSION, API_BASE_URL } from './config.js';
import { createPolarionServer } from './server.js';

/**
 * Builds the Polarion MCP server and serves it over stdio.
 *
 * MCP protocol messages travel on stdout, so all diagnostics are written to
 * stderr. Exits the process with a non-zero code if startup fails.
 *
 * @returns A promise that resolves once the transport is connected.
 */
async function main(): Promise<void> {
  try {
    const server = createPolarionServer();
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
 * Logs a shutdown message and exits cleanly on SIGINT/SIGTERM.
 *
 * @returns Never returns; terminates the process.
 */
function cleanup(): void {
  console.error("[INFO] Shutting down MCP server...");
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch((error) => {
  console.error("[ERROR] Fatal error in main execution:", error);
  process.exit(1);
});
