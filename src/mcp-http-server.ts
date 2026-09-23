/**
 * Streamable HTTP MCP server for the Polarion REST API.
 *
 * Unlike `http-server.ts` (a plain REST wrapper for ChatGPT Custom GPT Actions),
 * this server speaks the real MCP **Streamable HTTP** transport. That is the
 * transport remote MCP clients use — including Claude.ai custom connectors — so
 * you can add `https://your-host/mcp` as a connector URL.
 *
 * Security:
 * - The deployment holds **no Polarion credentials**. Every `/mcp` request must
 *   send the caller's own Polarion Personal Access Token as
 *   `Authorization: Bearer <polarion-pat>`; that token is used verbatim for the
 *   upstream REST calls of that request, so Polarion itself authenticates and
 *   authorizes every action under the real user.
 * - Requests without a Bearer token are rejected with 401. An invalid token is
 *   rejected by Polarion (401/403 surfaced back to the client).
 * - With `MCP_PUBLIC_URL` set, an OAuth login issues sealed tokens instead
 *   (see `oauth.ts`); an expired or foreign one gets a 401 `invalid_token`.
 * - With `GPT_CLIENT_ID`/`GPT_CLIENT_SECRET` also set, ChatGPT Custom GPT
 *   Actions log in through `/gpt/authorize` + `/gpt/token` and call the REST
 *   tool routes (`/api/tools/*`) under the user's own PAT.
 * - Optionally enable DNS-rebinding protection by setting `MCP_ALLOWED_HOSTS`.
 *
 * Sessions are stateful: each MCP `initialize` creates a transport (with its own
 * server instance) keyed by an `mcp-session-id` that the client echoes back on
 * subsequent requests.
 */

import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { randomBytes } from 'node:crypto';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { OAuthError, ServerError, InvalidRequestError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { SERVER_NAME, SERVER_VERSION, API_BASE_URL, requestBearerToken, getPolarionBaseUrl } from './config.js';
import { createPolarionServer } from './server.js';
import { PolarionOAuthProvider, renderLoginPage, LOGIN_PATH, POLARION_SCOPE, type TokenValidator } from './oauth.js';
import { Sealer, isSealed, safeEqual } from './sealed.js';
import { createRestToolsRouter } from './rest-api.js';

dotenv.config();

const MCP_PATH = '/mcp';

/** Custom GPT Action endpoints; separate from the MCP ones because they skip PKCE. */
const GPT_AUTHORIZE_PATH = '/gpt/authorize';
const GPT_TOKEN_PATH = '/gpt/token';

/** Hosts ChatGPT sends Custom GPT OAuth callbacks from. */
const GPT_CALLBACK_HOSTS = new Set(['chatgpt.com', 'chat.openai.com']);

/**
 * @param value - A redirect URI from an authorize request.
 * @returns True if it is exactly a Custom GPT callback,
 *   `https://chatgpt.com/aip/<gpt-id>/oauth/callback` (or chat.openai.com).
 */
function isGptCallback(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && GPT_CALLBACK_HOSTS.has(url.hostname) && url.port === '' && !url.username
    && !url.password && url.search === '' && url.hash === '' && /^\/aip\/[A-Za-z0-9_-]+\/oauth\/callback$/.test(url.pathname);
}

/**
 * Reads client credentials sent as HTTP Basic (RFC 6749 section 2.3.1).
 *
 * @param header - The Authorization header, if any.
 * @returns The decoded id and secret, or undefined if there is no Basic header.
 */
function basicCredentials(header: string | undefined): { clientId: string; clientSecret: string } | undefined {
  const match = /^Basic\s+(\S+)$/i.exec(header ?? '');
  if (!match) return undefined;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon < 0) return undefined;
  try {
    return { clientId: decodeURIComponent(decoded.slice(0, colon)), clientSecret: decodeURIComponent(decoded.slice(colon + 1)) };
  } catch {
    return undefined;
  }
}

/**
 * Options for {@link createMcpHttpApp}.
 */
export interface McpHttpAppOptions {
  /** Optional allow-list of Host header values enabling DNS-rebinding protection. */
  allowedHosts?: string[];
  /**
   * Public HTTPS base URL of this deployment. Setting it turns on the OAuth
   * login flow, which is how clients that cannot be handed a token by hand
   * (Claude.ai connectors) authenticate. Without it the server only accepts a
   * Polarion PAT sent directly as the Bearer token.
   */
  publicUrl?: URL;
  /**
   * Secret that seals the OAuth client ids and tokens. Keep it stable across
   * restarts and instances, or every login ends. Unset, a random one is used.
   */
  tokenSecret?: string;
  /** Preconfigured OAuth client for ChatGPT Custom GPT Actions; needs `publicUrl`. */
  gptClient?: { clientId: string; clientSecret: string };
  /** Token check used by the login page; injectable so tests need no Polarion. */
  validateToken?: TokenValidator;
}

/**
 * Returns a JSON-RPC error body for transport-level failures.
 *
 * @param message - Human-readable error message.
 * @returns A JSON-RPC 2.0 error envelope with a null id.
 */
function jsonRpcError(message: string) {
  return { jsonrpc: '2.0' as const, error: { code: -32000, message }, id: null };
}

/**
 * Builds the Express application that serves the MCP Streamable HTTP transport.
 *
 * The returned object exposes the app plus a `closeAllSessions` helper so callers
 * (and tests) can shut active transports down cleanly.
 *
 * @param options - Bearer token and optional DNS-rebinding allow-list.
 * @returns The configured app and a session-cleanup function.
 */
export function createMcpHttpApp(options: McpHttpAppOptions = {}): {
  app: express.Express;
  closeAllSessions: () => Promise<void>;
} {
  const { allowedHosts, publicUrl, validateToken, gptClient } = options;
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Active transports keyed by MCP session id.
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // OAuth login, for clients that cannot be handed a token by hand.
  const sealer = publicUrl ? new Sealer(options.tokenSecret ?? randomBytes(32).toString('base64url')) : undefined;
  const oauth = publicUrl && sealer ? new PolarionOAuthProvider(getPolarionBaseUrl(), sealer, validateToken) : undefined;
  const resourceMetadataUrl = publicUrl ? getOAuthProtectedResourceMetadataUrl(new URL(MCP_PATH, publicUrl)) : undefined;

  /**
   * @param error - Present when a token was sent but is not (or no longer) valid.
   * @returns The `WWW-Authenticate` value that sends a client to the login.
   */
  const bearerChallenge = (error?: string): string => {
    const parts = error ? [`error="invalid_token"`, `error_description="${error}"`] : [];
    parts.push(`resource_metadata="${resourceMetadataUrl}"`);
    return `Bearer ${parts.join(', ')}`;
  };

  if (oauth && publicUrl) {
    // ChatGPT looks for the protected-resource metadata at the root path first.
    // Rewrites the URL for mcpAuthRouter below, so it must stay registered before it.
    app.get('/.well-known/oauth-protected-resource', (req: Request, _res: Response, next: NextFunction) => {
      req.url = new URL(resourceMetadataUrl as string).pathname;
      next();
    });

    // The SDK token endpoint only reads client credentials from the body;
    // move HTTP Basic credentials there so client_secret_basic clients work.
    // The SDK's own urlencoded parser then sees a consumed stream and keeps this body.
    app.post('/token', express.urlencoded({ extended: false }), (req: Request, _res: Response, next: NextFunction) => {
      const basic = basicCredentials(req.get('authorization'));
      if (basic) req.body = { ...req.body, client_id: basic.clientId, client_secret: basic.clientSecret };
      next();
    });

    app.use(
      mcpAuthRouter({
        provider: oauth,
        issuerUrl: publicUrl,
        resourceServerUrl: new URL(MCP_PATH, publicUrl),
        resourceName: SERVER_NAME,
        scopesSupported: [POLARION_SCOPE],
      })
    );

    // The login page posts here: check the pasted token, then hand the client
    // back to its redirect URI.
    // Each attempt is a PAT check against Polarion, so it gets the SDK's /token limit.
    const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
    app.post(LOGIN_PATH, loginLimit, express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
      const loginId = String(req.body?.login_id ?? '');
      const token = String(req.body?.token ?? '');
      const result = await oauth.completeLogin(loginId, token);
      res.set('Cache-Control', 'no-store');
      if (result.ok) {
        res.redirect(302, result.redirectTo);
        return;
      }
      if (result.pending) {
        res.status(400).send(renderLoginPage(result.pending.loginId, getPolarionBaseUrl(), result.pending.clientName, result.reason));
        return;
      }
      // No pending login left to retry into — the form would post into nothing.
      res.status(400).type('text/plain').send(result.reason);
    });
  }

  /**
   * Resolves the Polarion token for this request and binds it to the call chain.
   *
   * Two ways in, both ending at one Polarion PAT:
   * - a token this server issued through the OAuth login, which it maps back
   *   to the PAT the user pasted, and
   * - a Polarion PAT sent directly, for clients configured by hand (curl, VS
   *   Code Copilot). The server keeps no credentials either way.
   *
   * A request without a Bearer token gets a 401 that points at this server's
   * protected-resource metadata, which is what makes a client such as Claude.ai
   * start the login flow instead of just failing.
   *
   * @param req - Incoming request.
   * @param res - Outgoing response.
   * @param next - Next middleware in the chain.
   * @returns Nothing; either runs the chain with the token bound or sends a 401.
   */
  const requireBearer = (req: Request, res: Response, next: NextFunction): void => {
    const header = req.get('authorization') ?? '';
    const [scheme, ...rest] = header.split(' ');
    const value = rest.join(' ').trim();
    if (scheme !== 'Bearer' || !value) {
      if (resourceMetadataUrl) {
        res.set('WWW-Authenticate', bearerChallenge());
      }
      res.status(401).json(jsonRpcError('Unauthorized: log in, or send your Polarion Personal Access Token as "Authorization: Bearer <token>"'));
      return;
    }
    if (oauth && isSealed(value)) {
      const pat = oauth.polarionTokenFor(value);
      if (!pat) {
        // A 401, not a pass-through to Polarion, is what makes the client refresh or log in again.
        res.set('WWW-Authenticate', bearerChallenge('The access token is invalid or expired'));
        res.status(401).json(jsonRpcError('Unauthorized: the access token is invalid or expired'));
        return;
      }
      requestBearerToken.run(pat, next);
      return;
    }
    requestBearerToken.run(value, next);
  };

  if (oauth && publicUrl && gptClient) {
    mountCustomGpt(app, oauth, publicUrl, gptClient, bearerChallenge);
  }

  // Health check (no auth) for load balancers and quick verification.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      transport: 'streamable-http',
      apiBaseUrl: API_BASE_URL,
      activeSessions: Object.keys(transports).length,
    });
  });

  /**
   * Handles MCP requests on an existing session (GET for the SSE stream, DELETE
   * to terminate the session).
   *
   * @param req - Incoming request carrying the `mcp-session-id` header.
   * @param res - Outgoing response.
   * @returns A promise that resolves once the transport has handled the request.
   */
  const handleSessionRequest = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.header('mcp-session-id');
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json(jsonRpcError('Invalid or missing session ID'));
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  };

  // POST: initialize a new session, or dispatch into an existing one.
  app.post(MCP_PATH, requireBearer, async (req: Request, res: Response) => {
    const sessionId = req.header('mcp-session-id');
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
        ...(allowedHosts && allowedHosts.length > 0
          ? { enableDnsRebindingProtection: true, allowedHosts }
          : {}),
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      const server = createPolarionServer();
      await server.connect(transport);
    } else {
      res.status(400).json(jsonRpcError('Bad Request: no valid session ID provided'));
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  app.get(MCP_PATH, requireBearer, handleSessionRequest);
  app.delete(MCP_PATH, requireBearer, handleSessionRequest);

  /**
   * Closes every active transport. Used on shutdown and by tests.
   *
   * @returns A promise that resolves once all transports are closed.
   */
  const closeAllSessions = async (): Promise<void> => {
    await Promise.all(Object.values(transports).map(t => t.close().catch(() => undefined)));
  };

  return { app, closeAllSessions };
}

/**
 * Mounts the ChatGPT Custom GPT Action login and the REST tool routes.
 *
 * Custom GPT Actions do OAuth as one preconfigured confidential client (the id
 * and secret entered in the GPT editor) and send no PKCE. They get their own
 * authorize/token endpoints so that a code from this flow can never be
 * redeemed without the client secret, and a PKCE code never without PKCE.
 *
 * @param app - The Express app.
 * @param oauth - The OAuth provider shared with the MCP login.
 * @param publicUrl - Public base URL, written into the OpenAPI spec.
 * @param gptClient - The Custom GPT's client id and secret.
 * @param bearerChallenge - Builds the `WWW-Authenticate` value for a 401.
 */
function mountCustomGpt(
  app: express.Express,
  oauth: PolarionOAuthProvider,
  publicUrl: URL,
  gptClient: { clientId: string; clientSecret: string },
  bearerChallenge: (error?: string) => string
): void {
  // Same limits the SDK applies to its own /authorize and /token.
  const authorizeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
  const tokenLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

  app.get(GPT_AUTHORIZE_PATH, authorizeLimit, (req: Request, res: Response) => {
    const param = (name: string) => (typeof req.query[name] === 'string' ? (req.query[name] as string) : '');
    const redirectUri = param('redirect_uri');
    // Errors are shown, never redirected: the redirect URI is not trusted until checked.
    if (!safeEqual(param('client_id'), gptClient.clientId)) {
      res.status(400).type('text/plain').send('Unknown client_id.');
      return;
    }
    if (!isGptCallback(redirectUri)) {
      res.status(400).type('text/plain').send('redirect_uri must be a ChatGPT Custom GPT callback (https://chatgpt.com/aip/<gpt-id>/oauth/callback).');
      return;
    }
    if (param('response_type') !== 'code' || !param('state')) {
      res.status(400).type('text/plain').send('Expected response_type=code and a state parameter.');
      return;
    }
    oauth.authorizeGpt(gptClient.clientId, redirectUri, param('state'), res);
  });

  app.post(GPT_TOKEN_PATH, tokenLimit, express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const credentials = basicCredentials(req.get('authorization')) ?? { clientId: body.client_id ?? '', clientSecret: body.client_secret ?? '' };
    if (!safeEqual(credentials.clientId, gptClient.clientId) || !safeEqual(credentials.clientSecret, gptClient.clientSecret)) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
      return;
    }
    try {
      if (body.grant_type === 'authorization_code') {
        if (!body.code || !body.redirect_uri) throw new InvalidRequestError('code and redirect_uri are required');
        res.json(oauth.exchangeGptCode(gptClient.clientId, body.code, body.redirect_uri));
        return;
      }
      if (body.grant_type === 'refresh_token') {
        if (!body.refresh_token) throw new InvalidRequestError('refresh_token is required');
        res.json(await oauth.refresh(gptClient.clientId, body.refresh_token));
        return;
      }
      res.status(400).json({ error: 'unsupported_grant_type' });
    } catch (error) {
      const oauthError = error instanceof OAuthError ? error : new ServerError('Internal Server Error');
      res.status(oauthError instanceof ServerError ? 500 : 400).json(oauthError.toResponseObject());
    }
  });

  const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const [scheme, ...rest] = (req.get('authorization') ?? '').split(' ');
    const pat = scheme === 'Bearer' ? oauth.polarionTokenFor(rest.join(' ').trim()) : undefined;
    if (!pat) {
      res.set('WWW-Authenticate', bearerChallenge(scheme === 'Bearer' ? 'The access token is invalid or expired' : undefined));
      res.status(401).json({ success: false, error: 'Authentication required', message: 'Log in through the GPT again.' });
      return;
    }
    requestBearerToken.run(pat, next);
  };

  app.use(createRestToolsRouter({
    authenticate,
    serverUrl: () => publicUrl.href.replace(/\/$/, ''),
    securityScheme: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: new URL(GPT_AUTHORIZE_PATH, publicUrl).href,
          tokenUrl: new URL(GPT_TOKEN_PATH, publicUrl).href,
          scopes: { [POLARION_SCOPE]: 'Act in Polarion as the signed-in user' },
        },
      },
    },
    unauthorizedDescription: 'Not logged in, or the login expired',
  }));
}

/**
 * Starts the Streamable HTTP MCP server using environment configuration.
 *
 * Required env: `API_BASE_URL`. Optional: `MCP_PUBLIC_URL` (enables the OAuth
 * login flow), `MCP_TOKEN_SECRET` (keeps logins valid across restarts),
 * `GPT_CLIENT_ID` + `GPT_CLIENT_SECRET` (enable Custom GPT Actions),
 * `MCP_HTTP_PORT` (or `HTTP_PORT`), `MCP_HTTP_HOST`, `MCP_ALLOWED_HOSTS`
 * (comma-separated). No Polarion credentials are read here — each client
 * brings its own Polarion PAT.
 *
 * @returns The underlying Node HTTP server once it is listening.
 */
export function startMcpHttpServer(): HttpServer {
  const port = Number(process.env.MCP_HTTP_PORT || process.env.HTTP_PORT || 3000);
  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  const publicUrl = process.env.MCP_PUBLIC_URL ? new URL(process.env.MCP_PUBLIC_URL) : undefined;
  const tokenSecret = process.env.MCP_TOKEN_SECRET || undefined;
  const gptClient = process.env.GPT_CLIENT_ID && process.env.GPT_CLIENT_SECRET
    ? { clientId: process.env.GPT_CLIENT_ID, clientSecret: process.env.GPT_CLIENT_SECRET }
    : undefined;

  const { app, closeAllSessions } = createMcpHttpApp({ allowedHosts, publicUrl, tokenSecret, gptClient });

  // Behind a TLS reverse proxy, set MCP_HTTP_HOST=127.0.0.1 so the plaintext
  // port — over which clients send their Polarion PAT — is never public.
  const host = process.env.MCP_HTTP_HOST || '0.0.0.0';

  const httpServer = app.listen(port, host, () => {
    console.log(`[INFO] ${SERVER_NAME} MCP Streamable HTTP server ${SERVER_VERSION} listening on port ${port}`);
    console.log(`[INFO] MCP endpoint: http://localhost:${port}${MCP_PATH} (send your Polarion PAT as Bearer token)`);
    console.log(`[INFO] Health:       http://localhost:${port}/health`);
    console.log(`[INFO] Proxying Polarion API at ${API_BASE_URL}`);
    if (publicUrl) {
      console.log(`[INFO] OAuth login enabled at ${new URL('/authorize', publicUrl).href}`);
      if (!tokenSecret) {
        console.log('[WARN] MCP_TOKEN_SECRET is not set: every login and client registration ends when the server restarts.');
      }
      if (gptClient) {
        console.log(`[INFO] Custom GPT OAuth enabled: authorize ${new URL(GPT_AUTHORIZE_PATH, publicUrl).href}, token ${new URL(GPT_TOKEN_PATH, publicUrl).href}`);
      }
    } else {
      console.log('[WARN] MCP_PUBLIC_URL is not set: no OAuth login, clients must send a Polarion PAT themselves.');
    }
    if (allowedHosts.length === 0) {
      console.log('[WARN] DNS-rebinding protection is OFF. Set MCP_ALLOWED_HOSTS to enable it.');
    }
  });

  const shutdown = () => {
    console.log('\n[INFO] Shutting down MCP Streamable HTTP server...');
    void closeAllSessions().finally(() => {
      httpServer.close(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return httpServer;
}

// Auto-start when executed directly (node build/mcp-http-server.js), but not when imported by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  startMcpHttpServer();
}
