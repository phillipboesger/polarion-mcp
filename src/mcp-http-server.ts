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
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Server as HttpServer } from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { randomBytes } from 'node:crypto';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { OAuthError, ServerError, InvalidRequestError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { SERVER_NAME, SERVER_VERSION, API_BASE_URL, requestBearerToken, getPolarionBaseUrl, callerCacheScope } from './config.js';
import { createPolarionServer } from './server.js';
import { PolarionOAuthProvider, renderLoginPage, parseRedirectAllowlist, setLoginPageHeaders, LOGIN_PATH, POLARION_SCOPE, type TokenValidator } from './oauth.js';
import { Sealer, isSealed, safeEqual } from './sealed.js';
import { createRestToolsRouter } from './rest-api.js';
import { bearerCredential } from './utils.js';

dotenv.config();

const MCP_PATH = '/mcp';

/** A session nobody used for this long is closed; the client re-initializes on the 404. */
const DEFAULT_SESSION_IDLE_MS = 60 * 60 * 1000;

/** Most sessions held at once; beyond it the least recently used one is dropped. */
const DEFAULT_MAX_SESSIONS = 1000;

/**
 * Most sessions one caller (token) holds. A caller over it loses its own
 * oldest session, so nobody can push other users' sessions out of the
 * global cap by opening sessions in a loop.
 */
const MAX_SESSIONS_PER_OWNER = 20;

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
  // RFC 6749 form-encodes the credentials before Base64, but many clients
  // send them raw; a raw '%' would make decodeURIComponent throw.
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  return { clientId: decode(decoded.slice(0, colon)), clientSecret: decode(decoded.slice(colon + 1)) };
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
  /** Idle time after which a session is closed. Default 1 h. */
  sessionIdleMs?: number;
  /** Most sessions held at once. Default 1000. */
  maxSessions?: number;
  /**
   * Redirect URIs dynamically registered clients may use, from
   * {@link parseRedirectAllowlist}. Empty or unset allows any.
   */
  allowedRedirectUris?: string[];
  /**
   * Express `trust proxy` setting, for running behind a reverse proxy: rate
   * limits then count per client (X-Forwarded-For) instead of one shared
   * counter for every user. Unset, the peer address is used.
   */
  trustProxy?: string | number;
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
  const { allowedHosts, publicUrl, validateToken, gptClient, trustProxy, allowedRedirectUris } = options;
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  // Parsed per route, after authentication, so anonymous callers cannot make
  // the server parse 10 MB bodies.
  const jsonBody = express.json({ limit: '10mb' });
  const sessionIdleMs = options.sessionIdleMs ?? DEFAULT_SESSION_IDLE_MS;
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;

  /**
   * Active sessions by MCP session id. A Map iterates in insertion order and
   * every use re-inserts its session, so the first entry is the least
   * recently used. `owner` is a hash of the caller's Polarion token: a session
   * id alone must not let another user end or hijack the stream of a session.
   */
  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; owner: string; lastSeen: number; openStreams: number }>();

  /**
   * @param id - Session id.
   * @param session - The session.
   */
  const closeSession = (id: string, session: { transport: StreamableHTTPServerTransport }): void => {
    void session.transport.close().catch(() => undefined);
    sessions.delete(id);
  };

  /**
   * @param sessionId - Session id from the request.
   * @returns The caller's live session, refreshed as most recently used; or
   *   undefined if it is unknown, expired, or belongs to someone else.
   */
  const useSession = (sessionId: string): StreamableHTTPServerTransport | undefined => {
    const session = sessions.get(sessionId);
    if (!session || session.owner !== callerCacheScope()) return undefined;
    if (session.openStreams === 0 && Date.now() - session.lastSeen > sessionIdleMs) {
      closeSession(sessionId, session);
      return undefined;
    }
    session.lastSeen = Date.now();
    sessions.delete(sessionId);
    sessions.set(sessionId, session);
    return session.transport;
  };

  /**
   * Closes idle sessions (an open SSE stream counts as activity), the given
   * owner's oldest sessions beyond its own cap, then the least recently used
   * sessions beyond the global cap.
   *
   * @param owner - Owner of a session just created, if any.
   */
  const evictSessions = (owner?: string): void => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.openStreams === 0 && now - session.lastSeen > sessionIdleMs) closeSession(id, session);
    }
    if (owner) {
      const own = [...sessions].filter(([, session]) => session.owner === owner);
      for (const [id, session] of own.slice(0, Math.max(0, own.length - MAX_SESSIONS_PER_OWNER))) closeSession(id, session);
    }
    for (const [id, session] of sessions) {
      if (sessions.size <= maxSessions) break;
      closeSession(id, session);
    }
  };
  const sweep = setInterval(() => evictSessions(), Math.min(sessionIdleMs, 60_000));
  sweep.unref();

  // OAuth login, for clients that cannot be handed a token by hand.
  const sealer = publicUrl ? new Sealer(options.tokenSecret ?? randomBytes(32).toString('base64url')) : undefined;
  const oauth = publicUrl && sealer ? new PolarionOAuthProvider(getPolarionBaseUrl(), sealer, validateToken, allowedRedirectUris) : undefined;
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
      setLoginPageHeaders(res);
      if (result.ok) {
        res.redirect(302, result.redirectTo);
        return;
      }
      if (result.pending) {
        res.status(400).send(renderLoginPage(result.pending.loginId, getPolarionBaseUrl(), result.pending.clientName, result.pending.returnTo, result.reason));
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
    const value = bearerCredential(req.get('authorization'));
    if (!value) {
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
      activeSessions: sessions.size,
    });
  });

  /**
   * Answers a request for a session this process does not know, e.g. one from
   * before a restart. The MCP spec requires 404 here: it is the only status
   * that makes a client drop the session id and initialize a new one.
   *
   * @param res - Outgoing response.
   */
  const sessionNotFound = (res: Response): void => {
    res.status(404).json(jsonRpcError('Session not found'));
  };

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
    if (!sessionId) {
      res.status(400).json(jsonRpcError('Missing session ID'));
      return;
    }
    const transport = useSession(sessionId);
    if (!transport) {
      sessionNotFound(res);
      return;
    }
    const session = sessions.get(sessionId);
    if (req.method === 'GET' && session) {
      // A client that only listens on the SSE stream is still using the session.
      session.openStreams++;
      res.on('close', () => {
        session.openStreams--;
        session.lastSeen = Date.now();
      });
    }
    await transport.handleRequest(req, res);
  };

  // POST: initialize a new session, or dispatch into an existing one.
  app.post(MCP_PATH, requireBearer, jsonBody, async (req: Request, res: Response) => {
    const sessionId = req.header('mcp-session-id');
    const existing = sessionId ? useSession(sessionId) : undefined;
    let transport: StreamableHTTPServerTransport;

    if (existing) {
      transport = existing;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const owner = callerCacheScope();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, owner, lastSeen: Date.now(), openStreams: 0 });
          evictSessions(owner);
        },
        ...(allowedHosts && allowedHosts.length > 0
          ? { enableDnsRebindingProtection: true, allowedHosts }
          : {}),
      });

      transport.onclose = () => {
        if (transport.sessionId && sessions.get(transport.sessionId)?.transport === transport) {
          sessions.delete(transport.sessionId);
        }
      };

      const server = createPolarionServer();
      await server.connect(transport);
    } else if (sessionId) {
      sessionNotFound(res);
      return;
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
    clearInterval(sweep);
    await Promise.all([...sessions.values()].map(s => s.transport.close().catch(() => undefined)));
    sessions.clear();
  };

  // Last: malformed JSON and other errors get a JSON-RPC error, never
  // Express's HTML page with a stack trace and server paths.
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const status = (error as { status?: number })?.status;
    const clientError = typeof status === 'number' && status >= 400 && status < 500;
    if (!clientError) console.error('[ERROR] Unhandled request error:', error);
    const message = status === 413 ? 'Request body too large' : status === 400 ? 'Bad Request: the body is not valid JSON' : 'Bad Request';
    res.status(clientError ? status : 500).json(jsonRpcError(clientError ? message : 'Internal server error'));
  });

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
    const credential = bearerCredential(req.get('authorization'));
    const pat = credential ? oauth.polarionTokenFor(credential) : undefined;
    if (!pat) {
      res.set('WWW-Authenticate', bearerChallenge(credential ? 'The access token is invalid or expired' : undefined));
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
 * Parses `MCP_PUBLIC_URL`. The OAuth endpoints, metadata and login form live
 * at the root of the host, so a base URL with a path cannot work.
 *
 * @param value - The raw environment value.
 * @returns The URL, or undefined when unset.
 * @throws Error for a URL with a path.
 */
export function parsePublicUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.pathname !== '/') {
    throw new Error(`MCP_PUBLIC_URL must be the origin without a path (got ${value}); serve the server at the root of its own host or subdomain`);
  }
  return url;
}

/**
 * Parses `TRUST_PROXY`: a hop count, or what Express accepts as a string
 * ("loopback", or a comma-separated list of addresses/subnets).
 *
 * @param value - The raw environment value.
 * @returns The `trust proxy` setting, or undefined to leave it off.
 * @throws Error for "true", which would trust any X-Forwarded-For a client sends.
 */
export function parseTrustProxy(value: string | undefined): string | number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'false') return undefined;
  if (trimmed === 'true') {
    throw new Error('TRUST_PROXY=true trusts any X-Forwarded-For a client sends; use "loopback", a hop count or the proxy address');
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

/**
 * Starts the Streamable HTTP MCP server using environment configuration.
 *
 * Required env: `API_BASE_URL`. Optional: `MCP_PUBLIC_URL` (enables the OAuth
 * login flow), `MCP_TOKEN_SECRET` (keeps logins valid across restarts),
 * `GPT_CLIENT_ID` + `GPT_CLIENT_SECRET` (enable Custom GPT Actions),
 * `MCP_HTTP_PORT` (or `HTTP_PORT`), `MCP_HTTP_HOST`, `MCP_ALLOWED_HOSTS`
 * (comma-separated), `TRUST_PROXY` (e.g. "loopback" behind a same-host proxy),
 * `MCP_ALLOWED_REDIRECT_PREFIXES` (comma-separated OAuth redirect URI allowlist),
 * `MCP_SESSION_IDLE_MINUTES` (default 60), `MCP_MAX_SESSIONS` (default 1000). No Polarion credentials are read here — each client
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
  const publicUrl = parsePublicUrl(process.env.MCP_PUBLIC_URL);
  const tokenSecret = process.env.MCP_TOKEN_SECRET || undefined;
  const gptClient = process.env.GPT_CLIENT_ID && process.env.GPT_CLIENT_SECRET
    ? { clientId: process.env.GPT_CLIENT_ID, clientSecret: process.env.GPT_CLIENT_SECRET }
    : undefined;

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  const idleMinutes = Number(process.env.MCP_SESSION_IDLE_MINUTES);
  const sessionIdleMs = idleMinutes > 0 ? idleMinutes * 60_000 : undefined;
  const maxSessions = Number(process.env.MCP_MAX_SESSIONS) > 0 ? Number(process.env.MCP_MAX_SESSIONS) : undefined;
  const allowedRedirectUris = parseRedirectAllowlist(process.env.MCP_ALLOWED_REDIRECT_PREFIXES);

  const { app, closeAllSessions } = createMcpHttpApp({
    allowedHosts, publicUrl, tokenSecret, gptClient, trustProxy, allowedRedirectUris, sessionIdleMs, maxSessions,
  });

  // Behind a TLS reverse proxy, set MCP_HTTP_HOST=127.0.0.1 so the plaintext
  // port — over which clients send their Polarion PAT — is never public.
  const host = process.env.MCP_HTTP_HOST || '0.0.0.0';

  const httpServer = app.listen(port, host, () => {
    console.log(`[INFO] ${SERVER_NAME} MCP Streamable HTTP server v${SERVER_VERSION} listening on port ${port}`);
    console.log(`[INFO] MCP endpoint: http://localhost:${port}${MCP_PATH} (send your Polarion PAT as Bearer token)`);
    console.log(`[INFO] Health:       http://localhost:${port}/health`);
    console.log(`[INFO] Proxying Polarion API at ${API_BASE_URL}`);
    if (publicUrl) {
      console.log(`[INFO] OAuth login enabled at ${new URL('/authorize', publicUrl).href}`);
      if (!tokenSecret) {
        console.log('[WARN] MCP_TOKEN_SECRET is not set: every login and client registration ends when the server restarts.');
      }
      if (allowedRedirectUris.length > 0) {
        console.log(`[INFO] OAuth redirect URIs limited to: ${allowedRedirectUris.join(', ')}`);
      } else {
        console.log('[WARN] MCP_ALLOWED_REDIRECT_PREFIXES is not set: any client may register any redirect URI.');
      }
      if (gptClient) {
        console.log(`[INFO] Custom GPT OAuth enabled: authorize ${new URL(GPT_AUTHORIZE_PATH, publicUrl).href}, token ${new URL(GPT_TOKEN_PATH, publicUrl).href}`);
      }
    } else {
      console.log('[WARN] MCP_PUBLIC_URL is not set: no OAuth login, clients must send a Polarion PAT themselves.');
    }
    if (trustProxy !== undefined) {
      console.log(`[INFO] Trusting X-Forwarded-For from: ${trustProxy}`);
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
// Compared as resolved file URLs: a plain string match fails for paths with
// spaces or symlinks, and the server then exits without ever listening.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  startMcpHttpServer();
}
