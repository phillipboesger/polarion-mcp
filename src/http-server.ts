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
import rateLimit from 'express-rate-limit';
import { enabledTools } from './tool-filter.js';
import { SERVER_NAME, SERVER_VERSION, API_BASE_URL, configurationWarnings } from './config.js';
import { ESSENTIAL_GPT_TOOLS } from './gpt-tools.js';
import { createRestToolsRouter, specServerUrl, type RestToolsOptions } from './rest-api.js';
import { safeEqual } from './sealed.js';
import { bearerCredential } from './utils.js';
import type { Express } from 'express';

export interface HttpAppOptions {
  apiKey: string;
  env: NodeJS.ProcessEnv;
  port: number;
  rateLimit?: { windowMs: number; limit: number };
  executeTool?: RestToolsOptions['executeTool'];
}

/**
 * Authentication Middleware
 * Validates the Bearer token from Authorization header
 */
const authenticateRequest = (apiKey: string) => (req: Request, res: Response, next: Function) => {
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

  const token = bearerCredential(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication scheme',
      message: 'Expected Bearer token. Use: Authorization: Bearer YOUR_API_KEY',
      timestamp: new Date().toISOString()
    });
  }

  if (!safeEqual(token, apiKey)) {
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

export function createHttpApp(options: HttpAppOptions): Express {
const app = express();
const origins = (options.env.HTTP_CORS_ORIGINS ?? 'https://chat.openai.com,https://chatgpt.com').split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
app.use(authenticateRequest(options.apiKey));
const limiter = rateLimit({ windowMs: options.rateLimit?.windowMs ?? 15 * 60_000, limit: options.rateLimit?.limit ?? 100, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ success: false, error: 'Too many requests', message: 'Rate limit exceeded' }) });
app.use('/api', limiter);

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: SERVER_NAME,
    version: SERVER_VERSION,
    timestamp: new Date().toISOString()
  });
});

app.use(createRestToolsRouter({
  // Already enforced app-wide above.
  authenticate: (_req, _res, next) => next(),
  serverUrl: specServerUrl(options.env, options.port),
  securityScheme: {
    type: 'http',
    scheme: 'bearer',
    description: 'API Key for HTTP server authentication. Configure this in your Custom GPT settings.'
  },
  unauthorizedDescription: 'Authentication failed - invalid or missing API key',
  executeTool: options.executeTool
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
      'GET /openapi.json',
      'GET /openapi-gpt.json'
    ]
  });
});

/**
 * Error handler
 */
app.use((err: Error & { status?: number }, req: Request, res: Response, _next: Function) => {
  // Malformed or oversized JSON is the caller's fault: 400/413, not a 500.
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.status === 413 ? 'Request body too large' : 'Bad Request', message: 'The body is not valid JSON or too large' });
    return;
  }
  const safeMessage = String(err?.message ?? err).replace(/(authorization\s*:\s*bearer\s+)\S+/ig, '$1[REDACTED]').replace(/\bBearer\s+\S+/ig, 'Bearer [REDACTED]').replace(/\b(?:pat|token|secret)[=: ]+[^\s,;]+/ig, '[REDACTED]');
  console.error('[ERROR] Unhandled error:', safeMessage);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

return app;
}

/**
 * Start the server
 */
const startHttpServer = (env: NodeJS.ProcessEnv) => {
dotenv.config();
const PORT = env.PORT || env.HTTP_PORT || 3000;
const HTTP_API_KEY = env.HTTP_API_KEY;
if (!HTTP_API_KEY) throw new Error('HTTP_API_KEY is required');
const app = createHttpApp({ apiKey: HTTP_API_KEY, env, port: Number(PORT) });
const server = app.listen(PORT, () => {
  console.log(`[INFO] Polarion MCP HTTP Server v${SERVER_VERSION} running on port ${PORT}`);
  console.log(`[INFO] API Base URL: ${API_BASE_URL}`);
  for (const warning of configurationWarnings(env, { needsToken: true })) console.log(`[WARN] ${warning}`);
  console.log(`[INFO] Available tools: ${enabledTools.size}`);
  console.log(`[INFO] Essential GPT tools: ${ESSENTIAL_GPT_TOOLS.filter(name => enabledTools.has(name)).length}`);
  console.log(`[INFO] Endpoints:`);
  console.log(`       - Health: http://localhost:${PORT}/health`);
  console.log(`       - Tools:  http://localhost:${PORT}/api/tools`);
  console.log(`       - OpenAPI (Full): http://localhost:${PORT}/openapi.json`);
  console.log(`       - OpenAPI (GPT):  http://localhost:${PORT}/openapi-gpt.json`);
});

// Node closes idle connections after 5 s; a proxy that reuses one at that moment gets a 502.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

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
};

if (process.argv[1]?.endsWith('/http-server.js') || process.argv[1]?.endsWith('http-server.js')) {
  try { startHttpServer(process.env); } catch (error) { console.error('[ERROR]', error); process.exitCode = 1; }
}
