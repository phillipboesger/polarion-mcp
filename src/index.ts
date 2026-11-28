#!/usr/bin/env node
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

import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { SERVER_NAME, SERVER_VERSION, API_BASE_URL, configurationWarnings, flagOn, parseProtocolEra } from './config.js';
import { createPolarionServer } from './server.js';
import { parseMaxResponseChars } from './executor.js';
import { writeLimitsFromEnv } from './write-verification.js';
import { parseLogSetting } from './logger.js';
import { parseProfile } from './profile.js';
import { toolFilterWarnings } from './tool-filter.js';
import { registerCompositeTools } from './composite-search.js';
import { listVirtualTools } from './virtual-tools.js';

class GuardedStdioTransport extends StdioServerTransport {
  constructor(private readonly legacyOnly: boolean) { super(); }

  override async start(): Promise<void> {
    const dispatch = this.onmessage;
    this.onmessage = message => {
      if ('method' in message && 'id' in message) {
        const meta = 'params' in message && message.params && typeof message.params === 'object' ? message.params._meta : undefined;
        const modern = meta && typeof meta === 'object' && 'io.modelcontextprotocol/protocolVersion' in meta;
        if (message.method === 'subscriptions/listen' || (this.legacyOnly && modern)) {
          void this.send({ jsonrpc: '2.0', id: message.id, error: { code: message.method === 'subscriptions/listen' ? -32601 : -32600, message: message.method === 'subscriptions/listen' ? 'Method not found' : 'Unsupported protocol version' } });
          return;
        }
      }
      dispatch?.(message);
    };
    await super.start();
  }
}

function parseToolRateLimit(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
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
    parseProfile(process.env);
    registerCompositeTools();
    for (const warning of toolFilterWarnings(listVirtualTools())) console.error(`[WARN] ${warning}`);
    const maxResponseChars = parseMaxResponseChars(process.env.MCP_MAX_RESPONSE_CHARS);
    const protocolEra = parseProtocolEra(process.env.MCP_PROTOCOL_ERA);
    const serverOptions = { ...parseLogSetting(process.env.MCP_LOG), transport: 'stdio', maxResponseChars, verifyWrites: process.env.MCP_VERIFY_WRITES?.trim().toLowerCase() !== 'false', writeLimits: writeLimitsFromEnv(process.env), rateLimitTools: parseToolRateLimit(process.env.MCP_RATE_LIMIT_TOOLS), markUntrusted: flagOn(process.env.MCP_MARK_UNTRUSTED), confirmDestructive: flagOn(process.env.MCP_CONFIRM_DESTRUCTIVE), apiBaseUrl: API_BASE_URL } as const;
    if (protocolEra === 'legacy') {
      await createPolarionServer(serverOptions).connect(new GuardedStdioTransport(true));
    } else {
      serveStdio(context => createPolarionServer({ ...serverOptions, protocolEra: context.era }), { transport: new GuardedStdioTransport(false) });
    }

    // Info messages go to stderr in MCP (stdout is reserved for protocol)
    console.error(`[INFO] ${SERVER_NAME} MCP Server ${SERVER_VERSION} running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);
    for (const warning of configurationWarnings(process.env, { needsToken: true })) console.error(`[WARN] ${warning}`);
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
