/**
 * REST surface over the MCP tools, for ChatGPT Custom GPT Actions.
 *
 * Shared by two servers that differ only in how a caller authenticates:
 * - `http-server.ts`: one static `HTTP_API_KEY`, Polarion calls run under the
 *   server-side `BEARER_TOKEN`.
 * - `mcp-http-server.ts`: an OAuth login per user (Custom GPT OAuth), Polarion
 *   calls run under that user's own PAT.
 *
 * Routes:
 * - GET /api/tools - List all available tools
 * - POST /api/tools/:toolName - Execute a specific tool
 * - GET /openapi.json - OpenAPI 3.1 spec with every tool
 * - GET /openapi-gpt.json - OpenAPI 3.1 spec with the Custom GPT subset
 */

import express, { type Request, type RequestHandler, type Response } from 'express';
import { executeApiTool } from './executor.js';
import { toolDefinitionMap, securitySchemes } from './tools.js';
import { enabledTools } from './tool-filter.js';
import { logSafe, redact, sanitizeInputSchema } from './utils.js';
import { SERVER_VERSION } from './config.js';
import { ESSENTIAL_GPT_TOOLS } from './gpt-tools.js';
import type { JsonObject } from './types.js';

/**
 * Builds the `servers` URL for the REST wrapper's OpenAPI specs.
 *
 * The specs are public, and a Custom GPT imports whatever URL they name, so the
 * request's Host header (anyone can send one, a cache may keep the answer) is
 * not trusted when the deployment knows its own address: `PUBLIC_URL`, or the
 * `RENDER_EXTERNAL_URL` Render sets. Without either, a plain `host[:port]` is
 * echoed (https, http for localhost) and anything else falls back to localhost.
 *
 * @param env - The environment to read the public URL from.
 * @param port - The port the server listens on, for the localhost fallback.
 * @returns A function giving the spec's server URL for a request.
 * @throws Error if `PUBLIC_URL` is not an http(s) origin.
 */
export function specServerUrl(env: NodeJS.ProcessEnv, port: number): (req: Request) => string {
  const source = env.PUBLIC_URL?.trim() ? 'PUBLIC_URL' : 'RENDER_EXTERNAL_URL';
  const configured = env.PUBLIC_URL?.trim() || env.RENDER_EXTERNAL_URL?.trim();
  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error(`${source} must be an http(s) URL such as https://mcp.example.org, got "${configured}"`);
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.search || url.hash) {
      throw new Error(`${source} must be an http(s) URL without credentials, query or fragment, got "${configured}"`);
    }
    return () => url.href.replace(/\/+$/, '');
  }
  return (req) => {
    const host = req.get('host');
    if (!host || !/^([A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(:\d{1,5})?$/.test(host)) return `http://localhost:${port}`;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host);
    return `${local ? 'http' : 'https'}://${host}`;
  };
}

/**
 * Options for {@link createRestToolsRouter}.
 */
export interface RestToolsOptions {
  /** Guards the tool routes; the OpenAPI specs stay public. */
  authenticate: RequestHandler;
  /** Base URL written into the specs' `servers` entry. */
  serverUrl: (req: Request) => string;
  /** The `bearerAuth` security scheme the specs advertise. */
  securityScheme: Record<string, unknown>;
  /** What a 401 means, as documented in the specs. */
  unauthorizedDescription: string;
  executeTool?: typeof executeApiTool;
  /** Maximum characters returned in a tool's text content. */
  maxResponseChars?: number;
}

/**
 * Builds the OpenAPI entry for one tool.
 *
 * @param name - Tool name.
 * @param unauthorizedDescription - Description of the 401 response.
 * @returns The `post` operation object.
 */
/**
 * @param text - A tool description.
 * @param max - Most characters allowed.
 * @returns The text, cut at the last sentence or word boundary that fits.
 */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sentence = cut.lastIndexOf('. ');
  return sentence > max / 2 ? cut.slice(0, sentence + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Custom GPT Actions refuse operation descriptions over 300 characters. */
const GPT_DESCRIPTION_LIMIT = 300;

function toolOperation(name: string, unauthorizedDescription: string, gpt = false) {
  const def = toolDefinitionMap.get(name)!;
  const sanitizedSchema = sanitizeInputSchema(def.inputSchema, {});
  return {
    post: {
      operationId: def.name,
      summary: gpt ? shorten(def.description, 120) : def.description,
      description: gpt ? shorten(def.description, GPT_DESCRIPTION_LIMIT) : `Execute the ${def.name} operation. ${def.description}`,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                arguments: sanitizedSchema
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Tool executed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', description: 'False if the tool reported an error; the reason is in result' },
                  tool: { type: 'string' },
                  result: { type: 'string' },
                  files: {
                    type: 'array',
                    description: 'Downloaded files (images, binaries), base64-encoded',
                    items: { type: 'object', properties: { mimeType: { type: 'string' }, base64: { type: 'string' } } }
                  },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        '401': {
          description: unauthorizedDescription
        },
        '404': {
          description: 'Tool not found'
        },
        '500': {
          description: 'Tool execution failed'
        }
      }
    }
  };
}

const HEALTH_RESPONSE = {
  '200': {
    description: 'API is healthy',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            server: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};

/**
 * Builds the router serving the tool routes and both OpenAPI specs.
 *
 * @param options - Authentication and spec details of the hosting server.
 * @returns An Express router to mount at the root.
 */
export function createRestToolsRouter(options: RestToolsOptions): express.Router {
  const { authenticate, serverUrl, securityScheme, unauthorizedDescription } = options;
  const router = express.Router();
  const executeTool = options.executeTool ?? executeApiTool;

  /**
   * List all available tools
   * Returns tool names, descriptions, and input schemas
   */
  router.get('/api/tools', authenticate, (req: Request, res: Response) => {
    const tools = Array.from(enabledTools.values()).map(def => {
      const nameMap = {};
      const sanitizedSchema = sanitizeInputSchema(def.inputSchema, nameMap);

      return {
        name: def.name,
        description: def.description,
        inputSchema: sanitizedSchema,
        method: def.method,
        path: def.pathTemplate
      };
    });

    res.json({
      tools,
      count: tools.length
    });
  });

  /**
   * Execute a specific tool
   * POST /api/tools/:toolName
   * Body: { "arguments": { ... } }
   */
  router.post('/api/tools/:toolName', authenticate, express.json({ limit: '10mb' }), async (req: Request, res: Response) => {
    // Express 5 types route params as string | string[]; a single :toolName is always a string.
    const toolName = String(req.params.toolName);
    const toolArgs: JsonObject = req.body?.arguments || req.body || {};

    try {
      // Look up the tool definition
      const toolDefinition = enabledTools.get(toolName);

      if (!toolDefinition) {
        return res.status(404).json({
          error: 'Tool not found',
          message: `Unknown tool: ${toolName}`,
          availableTools: `/api/tools`
        });
      }

      // Execute the tool
      const result = await executeTool(toolName, toolDefinition, toolArgs, securitySchemes, undefined, options.maxResponseChars);

      // Extract text content from MCP response format
      const textContent = result.content
        .filter(item => item.type === 'text')
        .map(item => 'text' in item ? item.text : '')
        .join('\n');

      // Downloaded files (MCP image / embedded resource content) as base64.
      const files = result.content.flatMap(item => {
        if (item.type === 'image') return [{ mimeType: item.mimeType, base64: item.data }];
        if (item.type === 'resource' && 'blob' in item.resource) return [{ mimeType: item.resource.mimeType, base64: item.resource.blob }];
        return [];
      });

      res.json({
        success: !result.isError,
        tool: toolName,
        result: textContent,
        ...(files.length > 0 ? { files } : {}),
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      const detail = redact(String(error instanceof Error ? error.message : error));
      console.error("[ERROR] Error executing tool '%s': %s", logSafe(toolName), logSafe(detail));

      res.status(500).json({
        success: false,
        error: 'Tool execution failed',
        message: 'Tool execution failed',
        tool: toolName,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Generate FULL OpenAPI 3.1 specification (every exposed tool)
   * This may exceed Custom GPT's 30 operation limit
   */
  router.get('/openapi.json', (req: Request, res: Response) => {
    const paths: Record<string, unknown> = {
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Check if the API is running',
          responses: HEALTH_RESPONSE
        }
      },
      '/api/tools': {
        get: {
          summary: 'List all tools',
          description: 'Get a list of all available Polarion API tools',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of tools',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      tools: {
                        type: 'array',
                        items: { type: 'object' }
                      },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            },
            '401': {
              description: unauthorizedDescription
            }
          }
        }
      }
    };

    // Add each tool as a separate endpoint
    for (const name of enabledTools.keys()) {
      paths[`/api/tools/${name}`] = toolOperation(name, unauthorizedDescription);
    }

    res.json({
      openapi: '3.1.0',
      info: {
        title: 'Polarion REST API via MCP',
        version: SERVER_VERSION,
        description: `HTTP REST API wrapper for Polarion MCP Server. Provides access to ${enabledTools.size} Polarion API operations.`
      },
      servers: [{ url: serverUrl(req), description: 'Polarion MCP HTTP Server' }],
      paths,
      components: { schemas: {}, securitySchemes: { bearerAuth: securityScheme } },
      security: [{ bearerAuth: [] }]
    });
  });

  /**
   * Generate Custom GPT compatible OpenAPI 3.1 specification
   * Limited to 30 most essential operations to comply with Custom GPT limits
   */
  router.get('/openapi-gpt.json', (req: Request, res: Response) => {
    // Tools only: a GPT Action holds at most 30 operations, /health included.
    const paths: Record<string, unknown> = {};

    // Add only essential tools (max 30 for Custom GPT)
    let toolCount = 0;
    for (const toolName of ESSENTIAL_GPT_TOOLS) {
      if (!enabledTools.has(toolName)) {
        // A tool switched off by the tool filter is left out on purpose.
        if (!toolDefinitionMap.has(toolName)) console.error(`[WARNING] Essential tool '${toolName}' not found in toolDefinitionMap`);
        continue;
      }
      paths[`/api/tools/${toolName}`] = toolOperation(toolName, unauthorizedDescription, true);
      toolCount++;
    }

    res.json({
      openapi: '3.1.0',
      info: {
        title: 'Polarion REST API via MCP (Custom GPT)',
        version: SERVER_VERSION,
        description: `HTTP REST API wrapper for Polarion MCP Server. Custom GPT compatible version with ${toolCount} essential operations (max 30 allowed).`
      },
      servers: [{ url: serverUrl(req), description: 'Polarion MCP HTTP Server' }],
      paths,
      components: { schemas: {}, securitySchemes: { bearerAuth: securityScheme } },
      security: [{ bearerAuth: [] }]
    });
  });

  return router;
}
