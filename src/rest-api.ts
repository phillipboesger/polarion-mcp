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
import { sanitizeInputSchema } from './utils.js';
import { SERVER_VERSION } from './config.js';
import { ESSENTIAL_GPT_TOOLS } from './gpt-tools.js';
import type { JsonObject } from './types.js';

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
}

/**
 * Builds the OpenAPI entry for one tool.
 *
 * @param name - Tool name.
 * @param unauthorizedDescription - Description of the 401 response.
 * @returns The `post` operation object.
 */
function toolOperation(name: string, unauthorizedDescription: string) {
  const def = toolDefinitionMap.get(name)!;
  const sanitizedSchema = sanitizeInputSchema(def.inputSchema, {});
  return {
    post: {
      operationId: def.name,
      summary: def.description,
      description: `Execute the ${def.name} operation. ${def.description}`,
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
                  success: { type: 'boolean' },
                  tool: { type: 'string' },
                  result: { type: 'string' },
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

  /**
   * List all available tools
   * Returns tool names, descriptions, and input schemas
   */
  router.get('/api/tools', authenticate, (req: Request, res: Response) => {
    const tools = Array.from(toolDefinitionMap.values()).map(def => {
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
  router.post('/api/tools/:toolName', authenticate, async (req: Request, res: Response) => {
    // Express 5 types route params as string | string[]; a single :toolName is always a string.
    const toolName = String(req.params.toolName);
    const toolArgs: JsonObject = req.body?.arguments || req.body || {};

    try {
      // Look up the tool definition
      const toolDefinition = toolDefinitionMap.get(toolName);

      if (!toolDefinition) {
        return res.status(404).json({
          error: 'Tool not found',
          message: `Unknown tool: ${toolName}`,
          availableTools: `/api/tools`
        });
      }

      // Sanitize the input schema and build name mapping
      const nameMap = {};
      sanitizeInputSchema(toolDefinition.inputSchema, nameMap);
      toolDefinition.nameMap = nameMap;

      // Execute the tool
      const result = await executeApiTool(toolName, toolDefinition, toolArgs, securitySchemes);

      // Extract text content from MCP response format
      const textContent = result.content
        .filter(item => item.type === 'text')
        .map(item => 'text' in item ? item.text : '')
        .join('\n');

      // Return result
      res.json({
        success: true,
        tool: toolName,
        result: textContent,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error(`[ERROR] Error executing tool '${toolName}':`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      res.status(500).json({
        success: false,
        error: 'Tool execution failed',
        message: errorMessage,
        tool: toolName,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Generate FULL OpenAPI 3.1 specification (all 210+ tools)
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
    for (const name of toolDefinitionMap.keys()) {
      paths[`/api/tools/${name}`] = toolOperation(name, unauthorizedDescription);
    }

    res.json({
      openapi: '3.1.0',
      info: {
        title: 'Polarion REST API via MCP',
        version: SERVER_VERSION,
        description: `HTTP REST API wrapper for Polarion MCP Server. Provides access to ${toolDefinitionMap.size} Polarion API operations.`
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
    const paths: Record<string, unknown> = {
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Check if the API is running',
          operationId: 'health',
          responses: HEALTH_RESPONSE
        }
      }
    };

    // Add only essential tools (max 30 for Custom GPT)
    let toolCount = 0;
    for (const toolName of ESSENTIAL_GPT_TOOLS) {
      if (!toolDefinitionMap.has(toolName)) {
        console.error(`[WARNING] Essential tool '${toolName}' not found in toolDefinitionMap`);
        continue;
      }
      paths[`/api/tools/${toolName}`] = toolOperation(toolName, unauthorizedDescription);
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
