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
import { toolDefinitionMap } from './tools.js';
import { SERVER_NAME, SERVER_VERSION, API_BASE_URL } from './config.js';
import { ESSENTIAL_GPT_TOOLS } from './gpt-tools.js';
import { createRestToolsRouter } from './rest-api.js';

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

app.use(createRestToolsRouter({
  // Already enforced app-wide above.
  authenticate: (_req, _res, next) => next(),
  serverUrl: (req) => `https://${req.get('host') || `localhost:${PORT}`}`,
  securityScheme: {
    type: 'http',
    scheme: 'bearer',
    description: 'API Key for HTTP server authentication. Configure this in your Custom GPT settings.'
  },
  unauthorizedDescription: 'Authentication failed - invalid or missing API key'
}));

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
