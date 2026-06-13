/**
 * HTTP REST API Server for Polarion MCP
 * 
 * This server exposes the MCP tools via HTTP REST API, making them accessible
 * to Custom GPTs and other HTTP clients.
 * 
 * Architecture:
 * - Reuses all existing logic from executor.ts
 * - Exposes tools as POST /api/tools/:toolName
 * - Provides OpenAPI spec at GET /openapi.json
 * - Supports CORS for browser-based clients
 * 
 * Endpoints:
 * - GET /health - Health check
 * - GET /api/tools - List all available tools
 * - POST /api/tools/:toolName - Execute a specific tool
 * - GET /openapi.json - OpenAPI 3.0 specification
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executeApiTool } from './executor.js';
import { toolDefinitionMap, securitySchemes } from './tools.js';
import { sanitizeInputSchema } from './utils.js';
import { SERVER_NAME, SERVER_VERSION, API_BASE_URL } from './config.js';
import { ESSENTIAL_GPT_TOOLS } from './gpt-tools.js';
import type { JsonObject } from './types.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.HTTP_PORT || 3000;
const HTTP_API_KEY = process.env.HTTP_API_KEY;

// Security check
if (!HTTP_API_KEY) {
  console.error('[ERROR] HTTP_API_KEY is not set in .env file');
  console.error('[ERROR] Please set HTTP_API_KEY to protect your HTTP endpoints');
  console.error('[ERROR] Generate one with: openssl rand -hex 32');
  process.exit(1);
}

/**
 * Authentication Middleware
 * Validates the Bearer token from Authorization header
 */
const authenticateRequest = (req: Request, res: Response, next: Function) => {
  // Skip auth for health check and OpenAPI spec endpoints
  if (req.path === '/health' || req.path === '/openapi.json' || req.path === '/openapi-gpt.json') {
    return next();
  }

  const authHeader = req.get('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Missing Authorization header. Expected: Authorization: Bearer YOUR_API_KEY',
      timestamp: new Date().toISOString()
    });
  }

  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication scheme',
      message: 'Expected Bearer token. Use: Authorization: Bearer YOUR_API_KEY',
      timestamp: new Date().toISOString()
    });
  }

  if (token !== HTTP_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
      timestamp: new Date().toISOString()
    });
  }

  // Authentication successful
  next();
};

// Middleware
app.use(cors()); // Enable CORS for Custom GPT access
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies
app.use(authenticateRequest); // Authenticate all requests (except health/openapi)

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: SERVER_NAME,
    version: SERVER_VERSION,
    apiBaseUrl: API_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

/**
 * List all available tools
 * Returns tool names, descriptions, and input schemas
 */
app.get('/api/tools', (req: Request, res: Response) => {
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
app.post('/api/tools/:toolName', async (req: Request, res: Response) => {
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
    const sanitizedSchema = sanitizeInputSchema(toolDefinition.inputSchema, nameMap);
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
 * Generate FULL OpenAPI 3.0 specification (all 210+ tools)
 * This may exceed Custom GPT's 30 operation limit
 */
app.get('/openapi.json', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${PORT}`;
  
  // Build paths object with all tools
  const paths: Record<string, any> = {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API is running',
        responses: {
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
        }
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
            description: 'Authentication failed - invalid or missing API key'
          }
        }
      }
    }
  };

  // Add each tool as a separate endpoint
  Array.from(toolDefinitionMap.values()).forEach(def => {
    const nameMap = {};
    const sanitizedSchema = sanitizeInputSchema(def.inputSchema, nameMap);
    
    paths[`/api/tools/${def.name}`] = {
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
            description: 'Authentication failed - invalid or missing API key'
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
  });

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Polarion REST API via MCP',
      version: SERVER_VERSION,
      description: `HTTP REST API wrapper for Polarion MCP Server. Provides access to ${toolDefinitionMap.size} Polarion API operations.`
    },
    servers: [
      {
        url: `https://${host}`,
        description: 'Polarion MCP HTTP Server'
      }
    ],
    paths,
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API Key for HTTP server authentication. Get this from your server administrator.'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  };

  res.json(openApiSpec);
});

/**
 * Generate Custom GPT compatible OpenAPI 3.0 specification
 * Limited to 30 most essential operations to comply with Custom GPT limits
 */
app.get('/openapi-gpt.json', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${PORT}`;
  
  // Build paths object with essential tools only
  const paths: Record<string, any> = {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API is running',
        operationId: 'health',
        responses: {
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
        }
      }
    }
  };

  // Add only essential tools (max 30 for Custom GPT)
  let toolCount = 0;
  for (const toolName of ESSENTIAL_GPT_TOOLS) {
    const def = toolDefinitionMap.get(toolName);
    if (!def) {
      console.error(`[WARNING] Essential tool '${toolName}' not found in toolDefinitionMap`);
      continue;
    }

    const nameMap = {};
    const sanitizedSchema = sanitizeInputSchema(def.inputSchema, nameMap);
    
    paths[`/api/tools/${def.name}`] = {
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
            description: 'Authentication failed - invalid or missing API key'
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
    toolCount++;
  }

  const gptOpenApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Polarion REST API via MCP (Custom GPT)',
      version: SERVER_VERSION,
      description: `HTTP REST API wrapper for Polarion MCP Server. Custom GPT compatible version with ${toolCount} essential operations (max 30 allowed).`
    },
    servers: [
      {
        url: `https://${host}`,
        description: 'Polarion MCP HTTP Server'
      }
    ],
    paths,
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API Key for HTTP server authentication. Configure this in your Custom GPT settings.'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  };

  res.json(gptOpenApiSpec);
});

/**
 * Catch-all for undefined routes
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /api/tools',
      'POST /api/tools/:toolName',
      'GET /openapi.json'
    ]
  });
});

/**
 * Error handler
 */
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('[ERROR] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

/**
 * Start the server
 */
const server = app.listen(PORT, () => {
  console.log(`[INFO] Polarion MCP HTTP Server v${SERVER_VERSION} running on port ${PORT}`);
  console.log(`[INFO] API Base URL: ${API_BASE_URL}`);
  console.log(`[INFO] Available tools: ${toolDefinitionMap.size}`);
  console.log(`[INFO] Essential GPT tools: ${ESSENTIAL_GPT_TOOLS.length}`);
  console.log(`[INFO] Endpoints:`);
  console.log(`       - Health: http://localhost:${PORT}/health`);
  console.log(`       - Tools:  http://localhost:${PORT}/api/tools`);
  console.log(`       - OpenAPI (Full): http://localhost:${PORT}/openapi.json`);
  console.log(`       - OpenAPI (GPT):  http://localhost:${PORT}/openapi-gpt.json`);
});

/**
 * Graceful shutdown
 */
const shutdown = () => {
  console.log('\n[INFO] Shutting down HTTP server...');
  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
