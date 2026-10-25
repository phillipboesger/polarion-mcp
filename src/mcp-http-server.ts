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

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Server as HttpServer } from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { randomBytes } from 'node:crypto';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { OAuthError, ServerError, InvalidRequestError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { SERVER_NAME, SERVER_VERSION, API_BASE_URL, configurationWarnings, requestBearerToken, getPolarionBaseUrl, callerCacheScope, tokenScope, configuredToolsets } from './config.js';
import { createPolarionServer, createToolCaller } from './server.js';
import { parseFlag, type ToolFilter } from './tool-filter.js';
import { enabledTools, filterTools } from './tool-filter.js';
import type { McpToolDefinition } from './types.js';
import { parseToolsetNames, TOOLSET_NAMES, type ToolsetName } from './toolsets.js';
import { DEFAULT_MAX_RESPONSE_CHARS, parseMaxResponseChars } from './executor.js';
import { PolarionOAuthProvider, validatePolarionToken, renderLoginPage, parseRedirectAllowlist, isCimdClientIdentifier, REDIRECT_PRESET_URIS, setLoginPageHeaders, withCimdClientMemo, LOGIN_PATH, POLARION_SCOPE, type TokenValidator } from './oauth.js';
import { fetchClientMetadata, type CimdMetadataFetcher } from './cimd.js';
import { Sealer, isSealed, safeEqual } from './sealed.js';
import { createRestToolsRouter } from './rest-api.js';
import { bearerCredential, parseTrustProxy } from './utils.js';
import type { PolarionExtensions } from './extensions.js';
import type { LogFormat, LogLevel } from './logger.js';
import type { TelemetryHooks } from './telemetry.js';
import { ToolCallRateLimiter } from './tool-rate-limit.js';
import { MetadataCache } from './metadata-cache.js';
export { parseTrustProxy } from './utils.js';

dotenv.config({ quiet: true });

const MCP_PATH = '/mcp';
const DEFAULT_ALLOWED_ORIGINS = ['https://claude.ai', 'https://chatgpt.com', 'https://chat.openai.com'];

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
const ORIGIN_PROTECTED_PATHS = new Set([
  MCP_PATH,
  '/authorize', '/token', '/register', '/revoke', LOGIN_PATH,
  '/.well-known/oauth-authorization-server',
  GPT_AUTHORIZE_PATH, GPT_TOKEN_PATH,
]);

/** Hosts ChatGPT sends Custom GPT OAuth callbacks from. */
const GPT_CALLBACK_HOSTS = new Set(['chatgpt.com', 'chat.openai.com']);
const CIMD_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** @returns Whether a callback uses a host for which the SDK relaxes port matching. */
function isCimdLoopbackRedirect(value: unknown): boolean {
  if (typeof value !== 'string' || !URL.canParse(value)) return false;
  return CIMD_LOOPBACK_HOSTS.has(new URL(value).hostname);
}

/** Builds an opaque failed-PAT limiter key without retaining the credential. */
export function patFailureRateLimitKey(ip: string, token: string): string {
  return `${ipKeyGenerator(ip)}:${tokenScope(token)}`;
}

/** Hashes the normalized caller address and OAuth client id to keep limiter keys fixed-size. */
export function tokenRateLimitKey(ip: string, clientId: string): string {
  return createHash('sha256').update(`${ipKeyGenerator(ip)}\0${clientId}`).digest('hex');
}

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
  /** Deployment-wide toolset allowlist. Request selectors can only narrow it. */
  allowedToolsets?: readonly ToolsetName[];
  /** Maximum characters returned in tool text content. */
  maxResponseChars?: number;
  /** Calls per user per rolling minute; zero disables the limiter. */
  rateLimitTools?: number;
  /** Mark user-authored Polarion response fields as untrusted. */
  markUntrusted?: boolean;
  logFormat?: LogFormat;
  logLevel?: LogLevel;
  telemetry?: TelemetryHooks;
  /** Enable the default confirmation policy for destructive and bulk calls. */
  confirmDestructive?: boolean;
  /** Injected policy, audit, authentication, and instance seams. */
  extensions?: Partial<PolarionExtensions>;
  /** Polarion REST API base URL captured by the entry point. */
  apiBaseUrl?: string;
  /** Logger shared with synthetic tool handlers. */
  logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
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
  /** Older secrets tried only when opening sealed OAuth values. */
  previousTokenSecrets?: string[];
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
   * {@link parseRedirectAllowlist}. Empty or unset allows any when no presets
   * are configured.
   */
  allowedRedirectUris?: string[];
  /** Named redirect allowlist presets from MCP_ALLOWED_REDIRECT_PRESETS. */
  allowedRedirectPresets?: string[];
  /** Enable OAuth Client ID Metadata Documents. Defaults to false. */
  cimdEnabled?: boolean;
  /** Client metadata fetcher; injectable for tests. */
  fetchClientMetadata?: CimdMetadataFetcher;
  /**
   * Express `trust proxy` setting, for running behind a reverse proxy: rate
   * limits then count per client (X-Forwarded-For) instead of one shared
   * counter for every user. Unset, the peer address is used.
   */
  trustProxy?: string | number;
  /** Browser origins allowed to call MCP and OAuth endpoints; unset uses Claude.ai and ChatGPT. */
  allowedOrigins?: string[];
  /** Dynamic OAuth registrations allowed per hour. Defaults to 100. */
  registerRateLimit?: number;
  /** Failed OAuth token requests allowed per IP per 15 minutes. Defaults to 500. */
  tokenIpRateLimit?: number;
  /** Sliding refresh-token lifetime in seconds. Defaults to 14 days. */
  refreshTokenTtlSeconds?: number;
}

/**
 * Returns a JSON-RPC error body for transport-level failures.
 *
 * @param message - Human-readable error message.
 * @returns A JSON-RPC 2.0 error envelope with a null id.
 */
function jsonRpcError(message: string, code = -32000) {
  return { jsonrpc: '2.0' as const, error: { code, message }, id: null };
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
  const { allowedHosts, publicUrl, validateToken, gptClient, trustProxy, allowedRedirectUris, maxResponseChars } = options;
  const allowedPresets = parseRedirectAllowlist(undefined, options.allowedRedirectPresets);
  const effectiveAllowedRedirectUris = [...(allowedRedirectUris ?? []), ...allowedPresets];
  const allowedToolsets = options.allowedToolsets ?? TOOLSET_NAMES;
  const cimdEnabled = options.cimdEnabled ?? false;
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  const allowedOrigins = options.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;
  const corsMiddleware = cors({
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Last-Event-ID', 'mcp-session-id', 'mcp-protocol-version', 'X-MCP-Toolsets', 'X-MCP-Readonly'],
    exposedHeaders: ['mcp-session-id', 'mcp-protocol-version', 'www-authenticate'],
    optionsSuccessStatus: 204,
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path.toLowerCase().replace(/\/+$/, '') || '/';
    const isOAuthMetadata = path.startsWith('/.well-known/oauth-protected-resource');
    const isMcpRequestPath = path === MCP_PATH || path.startsWith(`${MCP_PATH}/`);
    if (!ORIGIN_PROTECTED_PATHS.has(path) && !isOAuthMetadata && !isMcpRequestPath) return next();

    const origin = req.get('origin');
    if (!origin) return next();
    const requestHost = req.get('host')?.toLowerCase();
    const requestHostIsConfigured = Boolean(requestHost && allowedHosts?.some(host => host.toLowerCase() === requestHost));
    let configuredRequestOrigin: string | undefined;
    if (requestHostIsConfigured) {
      try {
        configuredRequestOrigin = new URL(`${req.protocol}://${requestHost}`).origin;
      } catch {
        // A malformed configured Host is not an origin to trust.
      }
    }
    if (!allowedOrigins.includes(origin) && origin !== publicUrl?.origin && origin !== configuredRequestOrigin) {
      if (isMcpRequestPath) res.status(403).json(jsonRpcError('Origin is not allowed'));
      else res.status(403).json({ error: 'origin_not_allowed' });
      return;
    }

    // The SDK's OAuth routes use wildcard CORS internally. Keep their response
    // header aligned with this origin check instead of widening the allowlist.
    const setHeader = res.setHeader.bind(res);
    res.setHeader = ((name: string, value: string | number | readonly string[]) => {
      if (name.toLowerCase() === 'access-control-allow-origin') value = origin;
      return setHeader(name, value);
    }) as Response['setHeader'];
    corsMiddleware(req, res, next);
  });
  // Parsed per route, after authentication, so anonymous callers cannot make
  // the server parse 10 MB bodies.
  const jsonBody = express.json({ limit: '10mb' });
  const checkToken: TokenValidator = validateToken ?? validatePolarionToken;
  const sessionIdleMs = options.sessionIdleMs ?? DEFAULT_SESSION_IDLE_MS;
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
  // These instances are app-wide so opening additional MCP sessions cannot
  // multiply a caller's tool-call budget or fragment metadata cache entries.
  const rateLimiter = new ToolCallRateLimiter(options.rateLimitTools ?? 0);
  const metadataCache = new MetadataCache();

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
  const sealer = publicUrl
    ? new Sealer(options.tokenSecret ?? randomBytes(32).toString('base64url'), API_BASE_URL, options.previousTokenSecrets)
    : undefined;
  const resourceAudience = publicUrl ? new URL(MCP_PATH, publicUrl).href : undefined;
  const oauth = publicUrl && sealer
    ? new PolarionOAuthProvider(getPolarionBaseUrl(), sealer, checkToken, effectiveAllowedRedirectUris, options.refreshTokenTtlSeconds, resourceAudience, cimdEnabled, options.fetchClientMetadata ?? fetchClientMetadata)
    : undefined;
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

    const tokenIpLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.tokenIpRateLimit ?? 500,
      skipSuccessfulRequests: true,
      keyGenerator: req => ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? ''),
      validate: { keyGeneratorIpFallback: false },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many token requests from this IP' }),
    });
    const tokenClientLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      skipSuccessfulRequests: true,
      keyGenerator: req => {
        const basic = basicCredentials(req.get('authorization'));
        const clientId = basic?.clientId ?? String(req.body?.client_id ?? '');
        return tokenRateLimitKey(req.ip ?? req.socket.remoteAddress ?? '', clientId);
      },
      validate: { keyGeneratorIpFallback: false },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many token requests' }),
    });
    // The SDK token endpoint only reads client credentials from the body;
    // move HTTP Basic credentials there so client_secret_basic clients work.
    // The SDK's own urlencoded parser then sees a consumed stream and keeps this body.
    app.post('/token', express.urlencoded({ extended: false }), tokenIpLimit, tokenClientLimit, async (req: Request, res: Response, next: NextFunction) => {
      const basic = basicCredentials(req.get('authorization'));
      if (basic) {
        if (isCimdClientIdentifier(basic.clientId)) {
          res.set('WWW-Authenticate', 'Basic realm="MCP OAuth"');
          res.status(401).json({ error: 'invalid_client', error_description: 'CIMD clients cannot use shared client secrets' });
          return;
        }
        const client = await oauth.clientsStore.getClient(basic.clientId);
        const matches = constantTimeSecretEqual(basic.clientSecret, client?.client_secret ?? '');
        if (!client || client.token_endpoint_auth_method !== 'client_secret_basic' || !matches) {
          res.set('WWW-Authenticate', 'Basic realm="MCP OAuth"');
          res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
          return;
        }
        req.body = { ...req.body, client_id: basic.clientId, client_secret: basic.clientSecret };
      }
      next();
    });
    // The SDK metadata omits Basic even though the token shim supports it; augment its JSON response.
    app.use('/.well-known/oauth-authorization-server', (_req: Request, res: Response, next: NextFunction) => {
      const sendJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (body && typeof body === 'object') {
          const metadata = body as Record<string, unknown>;
          const methods = metadata.token_endpoint_auth_methods_supported;
          body = {
            ...metadata,
            ...(Array.isArray(methods) ? { token_endpoint_auth_methods_supported: [...new Set([...methods, 'client_secret_basic'])] } : {}),
            client_id_metadata_document_supported: cimdEnabled,
          };
        }
        return sendJson(body);
      }) as Response['json'];
      next();
    });
    if (cimdEnabled) {
      // CIMD uses exact redirect string matching. The SDK permits alternate
      // loopback ports for native registrations, so enforce the document's
      // literal URI before its router applies the broader RFC 8252 rule. Keep
      // metadata fetching behind a limit because this check precedes the SDK's.
      const cimdAuthorizeLimit = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        skip: req => {
          const params = req.method === 'GET' ? req.query : req.body;
          return typeof params?.client_id !== 'string' || !isCimdClientIdentifier(params.client_id) || !isCimdLoopbackRedirect(params?.redirect_uri);
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many CIMD authorization requests' }),
      });
      app.use('/authorize', express.urlencoded({ extended: false }), cimdAuthorizeLimit, async (req: Request, res: Response, next: NextFunction) => {
        const params = req.method === 'GET' ? req.query : req.body;
        const clientId = params?.client_id;
        const redirectUri = params?.redirect_uri;
        if (typeof clientId !== 'string' || !isCimdClientIdentifier(clientId) || typeof redirectUri !== 'string' || !isCimdLoopbackRedirect(redirectUri)) {
          next();
          return;
        }
        const client = await oauth.clientsStore.getClient(clientId);
        if (!client) {
          res.status(400).json({ error: 'invalid_client', error_description: 'Invalid client_id' });
          return;
        }
        if (!client.redirect_uris.includes(redirectUri)) {
          res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri must exactly match the CIMD document' });
          return;
        }
        withCimdClientMemo(client, next);
      });
    }
    app.use(
      mcpAuthRouter({
        provider: oauth,
        issuerUrl: publicUrl,
        resourceServerUrl: new URL(MCP_PATH, publicUrl),
        resourceName: SERVER_NAME,
        clientRegistrationOptions: {
          rateLimit: {
            windowMs: 60 * 60 * 1000,
            limit: options.registerRateLimit ?? 100,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many client registrations' }),
          },
        },
        // The custom pre-auth limiters above include Basic credentials and
        // skip successful exchanges; the SDK's default limiter would count
        // successes and impose a second, conflicting budget.
        tokenOptions: { rateLimit: false },
        scopesSupported: [POLARION_SCOPE],
      })
    );

    // The login page posts here: check the pasted token, then hand the client
    // back to its redirect URI.
    // Each attempt is a PAT check against Polarion, so it gets the SDK's /token limit.
    const loginPatLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      keyGenerator: req => patFailureRateLimitKey(req.ip ?? req.socket.remoteAddress ?? '', String(req.body?.token ?? '')),
      validate: { keyGeneratorIpFallback: false },
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many failed Personal Access Token checks' }),
    });
    const loginIpLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many failed Personal Access Token checks from this IP' }),
    });
    app.post(LOGIN_PATH, express.urlencoded({ extended: false }), loginIpLimit, loginPatLimit, async (req: Request, res: Response) => {
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
  // Each unknown token costs a request to Polarion: failures count, successes do not.
  // "Successful" means Polarion accepted the PAT, whatever the MCP request then answers: a valid user
  // with a stale session id gets a 404 and must not be counted.
  const patFailureLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    keyGenerator: req => patFailureRateLimitKey(req.ip ?? req.socket.remoteAddress ?? '', bearerCredential(req.get('authorization')) ?? ''),
    validate: { keyGeneratorIpFallback: false },
    skip: req => isCachedValidPat(bearerCredential(req.get('authorization')) ?? ''),
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => res.locals.patAccepted === true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json(jsonRpcError('Too many failed Personal Access Token checks')),
  });
  const patIpFailureLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    skip: req => isCachedValidPat(bearerCredential(req.get('authorization')) ?? ''),
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => res.locals.patAccepted === true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json(jsonRpcError('Too many failed Personal Access Token checks from this IP')),
  });

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
      if (oauth.audienceFor(value) !== resourceAudience) {
        res.set('WWW-Authenticate', bearerChallenge('The access token is for a different resource'));
        res.status(401).json(jsonRpcError('Unauthorized: the access token is for a different resource'));
        return;
      }
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
    // A Polarion PAT sent directly. Only a token Polarion accepts may open a
    // session: otherwise anyone could fill the session table with made-up
    // tokens and push every real user's session out.
    const sessionId = req.header('mcp-session-id');
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (session && session.owner === tokenScope(value)) {
      requestBearerToken.run(value, next);
      return;
    }
    patIpFailureLimit(req, res, () => patFailureLimit(req, res, () => {
      void checkDirectPat(value).then(failure => {
        if (!failure) {
          res.locals.patAccepted = true;
          requestBearerToken.run(value, next);
          return;
        }
        if (failure.status === 401 && resourceMetadataUrl) {
          res.set('WWW-Authenticate', bearerChallenge('The access token is invalid or expired'));
        }
        res.status(failure.status).json(jsonRpcError(failure.message));
      }).catch(() => {
        res.status(503).json(jsonRpcError('Polarion could not be reached to check the token. Try again in a moment.'));
      });
    }));
  };

  /** Polarion PATs accepted in the last minute, by token hash. */
  const acceptedPats = new Map<string, number>();
  const PAT_CACHE_MS = 60_000;
  function isCachedValidPat(pat: string): boolean {
    return (acceptedPats.get(tokenScope(pat)) ?? 0) > Date.now();
  }

  /**
   * @param pat - A Polarion PAT sent as the Bearer token.
   * @returns Undefined if Polarion accepts it, else the status and message to answer with.
   */
  const checkDirectPat = async (pat: string): Promise<{ status: number; message: string } | undefined> => {
    const key = tokenScope(pat);
    const now = Date.now();
    if ((acceptedPats.get(key) ?? 0) > now) return undefined;
    const check = await checkToken(pat);
    if (check === true) {
      if (acceptedPats.size >= 1000) acceptedPats.clear();
      acceptedPats.set(key, now + PAT_CACHE_MS);
      return undefined;
    }
    if (check === 'unavailable') return { status: 503, message: 'Polarion could not be reached to check the token. Try again in a moment.' };
    if (check === 'forbidden') return { status: 403, message: 'Polarion recognized the token but denied access. Ask your Polarion administrator.' };
    return { status: 401, message: 'Unauthorized: Polarion did not accept this token' };
  };

  if (oauth && publicUrl && gptClient) {
    mountCustomGpt(app, oauth, publicUrl, gptClient, bearerChallenge, options.tokenIpRateLimit ?? 500, maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS,
      // The deployment's toolset allowlist applies to REST like it does to MCP sessions.
      filterTools(enabledTools, { toolsets: [...allowedToolsets] }).tools,
      // REST shares the deployment-wide limiter and the same policy, confirmation and audit pipeline.
      { rateLimitTools: options.rateLimitTools, rateLimiter, markUntrusted: options.markUntrusted, logFormat: options.logFormat, logLevel: options.logLevel, telemetry: options.telemetry, confirmDestructive: options.confirmDestructive, extensions: options.extensions, apiBaseUrl: options.apiBaseUrl ?? API_BASE_URL, logger: options.logger });
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
   * Parses request selectors for validation and computes a deployment-bounded
   * filter. A session only consumes this value during initialization.
   *
   * @param req - Incoming MCP request.
   * @returns The tool filter to bind to a newly initialized session.
   * @throws Error when a selector is unknown or malformed.
   */
  const requestToolFilter = (req: Request): ToolFilter => {
    const pathToolsets = req.params.toolsets;
    const headerToolsets = req.get('X-MCP-Toolsets');
    const pathSelection = pathToolsets === undefined ? undefined : parseToolsetNames(Array.isArray(pathToolsets) ? pathToolsets.join(',') : pathToolsets, 'MCP path');
    const headerSelection = headerToolsets === undefined ? undefined : parseToolsetNames(headerToolsets, 'X-MCP-Toolsets');
    const requested = pathSelection && headerSelection
      ? pathSelection.filter(name => headerSelection.includes(name))
      : pathSelection ?? headerSelection;
    const allowed = new Set(allowedToolsets);
    return {
      toolsets: requested ? requested.filter(name => allowed.has(name)) : [...allowed],
      readOnly: parseFlag('X-MCP-Readonly', req.get('X-MCP-Readonly')),
    };
  };

  /** Reject invalid selectors while leaving existing session filters immutable. */
  const validateToolSelectors = (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.locals.toolFilter = requestToolFilter(req);
      next();
    } catch (error) {
      res.status(400).json(jsonRpcError(error instanceof Error ? error.message : 'Invalid toolset selector', -32602));
    }
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
  app.post([MCP_PATH, `${MCP_PATH}/:toolsets`], requireBearer, validateToolSelectors, jsonBody, async (req: Request, res: Response) => {
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

      const server = createPolarionServer({ transport: 'http', filter: res.locals.toolFilter as ToolFilter, maxResponseChars: options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS, rateLimitTools: options.rateLimitTools, rateLimiter, metadataCache, markUntrusted: options.markUntrusted, logFormat: options.logFormat, logLevel: options.logLevel, telemetry: options.telemetry, confirmDestructive: options.confirmDestructive, extensions: options.extensions, apiBaseUrl: options.apiBaseUrl ?? API_BASE_URL, logger: options.logger });
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

  app.get([MCP_PATH, `${MCP_PATH}/:toolsets`], requireBearer, validateToolSelectors, handleSessionRequest);
  app.delete([MCP_PATH, `${MCP_PATH}/:toolsets`], requireBearer, validateToolSelectors, handleSessionRequest);

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
  bearerChallenge: (error?: string) => string,
  tokenIpRateLimit: number,
  maxResponseChars: number,
  restTools: ReadonlyMap<string, McpToolDefinition>,
  pipelineOptions: Omit<Parameters<typeof createToolCaller>[0], 'tools' | 'maxResponseChars'>
): void {
  // Same limits the SDK applies to its own /authorize and /token.
  const authorizeLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many authorization requests' }),
  });
  const tokenLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    skipSuccessfulRequests: true,
    keyGenerator: req => tokenRateLimitKey(req.ip ?? req.socket.remoteAddress ?? '', String(req.body?.client_id || gptClient.clientId)),
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many token requests' }),
  });
  const tokenIpLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: tokenIpRateLimit,
    skipSuccessfulRequests: true,
    keyGenerator: req => ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? ''),
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'too_many_requests', error_description: 'Too many token requests from this IP' }),
  });

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

  app.post(GPT_TOKEN_PATH, express.urlencoded({ extended: false }), tokenIpLimit, tokenLimit, async (req: Request, res: Response) => {
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
    if (!pat || !credential || oauth.audienceFor(credential) !== new URL(MCP_PATH, publicUrl).href) {
      res.set('WWW-Authenticate', bearerChallenge(credential ? 'The access token is invalid or expired' : undefined));
      res.status(401).json({ success: false, error: 'Authentication required', message: 'Log in through the GPT again.' });
      return;
    }
    requestBearerToken.run(pat, next);
  };

  app.use(createRestToolsRouter({
    authenticate,
    tools: restTools,
    callTool: createToolCaller({ ...pipelineOptions, tools: restTools, maxResponseChars }),
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
    maxResponseChars,
  }));
}

/** Compares secrets through fixed-size digests so timingSafeEqual always sees equal-length input. */
function constantTimeSecretEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash('sha256').update(actual).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
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
 * Starts the Streamable HTTP MCP server using environment configuration.
 *
 * Required env: `API_BASE_URL`. Optional: `MCP_PUBLIC_URL` (enables the OAuth
 * login flow), `MCP_TOKEN_SECRET` (keeps logins valid across restarts),
 * `GPT_CLIENT_ID` + `GPT_CLIENT_SECRET` (enable Custom GPT Actions),
 * `MCP_HTTP_PORT` (or `HTTP_PORT`), `MCP_HTTP_HOST`, `MCP_ALLOWED_HOSTS`
 * (comma-separated), `TRUST_PROXY` (e.g. "loopback" behind a same-host proxy),
 * `MCP_ALLOWED_REDIRECT_PREFIXES` (comma-separated OAuth redirect URI allowlist),
 * `MCP_ALLOWED_REDIRECT_PRESETS` (comma-separated client presets: claude, chatgpt,
 * vscode, cursor, copilot-studio, gemini, loopback),
 * `MCP_CIMD_ENABLED` (`true` enables Client ID Metadata Documents; default false),
 * `MCP_SESSION_IDLE_MINUTES` (default 60), `MCP_MAX_SESSIONS` (default 1000). No Polarion credentials are read here — each client
 * brings its own Polarion PAT.
 *
 * @returns The underlying Node HTTP server once it is listening.
 */
export function startMcpHttpServer(options: { logger?: Pick<Console, 'warn'> } = {}): HttpServer {
  const port = Number(process.env.MCP_HTTP_PORT || process.env.PORT || process.env.HTTP_PORT || 3000);
  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  const configuredAllowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const publicUrl = parsePublicUrl(process.env.MCP_PUBLIC_URL);
  const tokenSecret = process.env.MCP_TOKEN_SECRET || undefined;
  const previousTokenSecrets = (process.env.MCP_TOKEN_SECRET_PREVIOUS || '').split(',').map(secret => secret.trim()).filter(Boolean);
  const gptClient = process.env.GPT_CLIENT_ID && process.env.GPT_CLIENT_SECRET
    ? { clientId: process.env.GPT_CLIENT_ID, clientSecret: process.env.GPT_CLIENT_SECRET }
    : undefined;

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (publicUrl && trustProxy === undefined) {
    (options.logger ?? console).warn('[SECURITY WARNING] MCP_PUBLIC_URL is set while TRUST_PROXY is unset. Behind a reverse proxy, rate limits see one shared IP and can lock out users; set TRUST_PROXY to the trusted proxy hop count or address.');
  }
  const idleMinutes = Number(process.env.MCP_SESSION_IDLE_MINUTES);
  const sessionIdleMs = idleMinutes > 0 ? idleMinutes * 60_000 : undefined;
  const maxSessions = Number(process.env.MCP_MAX_SESSIONS) > 0 ? Number(process.env.MCP_MAX_SESSIONS) : undefined;
  const configuredRegisterLimit = Number(process.env.MCP_RATE_LIMIT_REGISTER);
  const registerRateLimit = Number.isInteger(configuredRegisterLimit) && configuredRegisterLimit > 0 ? configuredRegisterLimit : 100;
  const configuredTokenIpLimit = Number(process.env.MCP_RATE_LIMIT_TOKEN_IP);
  const tokenIpRateLimit = Number.isInteger(configuredTokenIpLimit) && configuredTokenIpLimit > 0 ? configuredTokenIpLimit : 500;
  const configuredRefreshTokenTtl = Number(process.env.MCP_REFRESH_TOKEN_TTL);
  const refreshTokenTtlSeconds = Number.isInteger(configuredRefreshTokenTtl) && configuredRefreshTokenTtl > 0
    ? configuredRefreshTokenTtl
    : 14 * 24 * 60 * 60;
  const allowedRedirectUris = parseRedirectAllowlist(process.env.MCP_ALLOWED_REDIRECT_PREFIXES);
  const allowedRedirectPresets = (process.env.MCP_ALLOWED_REDIRECT_PRESETS ?? '').split(',').map(preset => preset.trim()).filter(Boolean);
  const cimdEnabled = process.env.MCP_CIMD_ENABLED?.trim().toLowerCase() === 'true';
  const knownRedirectPresets = new Set(Object.keys(REDIRECT_PRESET_URIS));
  for (const preset of allowedRedirectPresets) {
    if (!knownRedirectPresets.has(preset)) (options.logger ?? console).warn(`[WARN] Ignoring unknown MCP_ALLOWED_REDIRECT_PRESETS entry: ${preset}`);
  }
  const allowedToolsets = configuredToolsets(process.env);
  const maxResponseChars = parseMaxResponseChars(process.env.MCP_MAX_RESPONSE_CHARS);
  const configuredToolRateLimit = Number(process.env.MCP_RATE_LIMIT_TOOLS ?? 0);
  const rateLimitTools = Number.isSafeInteger(configuredToolRateLimit) && configuredToolRateLimit >= 0 ? configuredToolRateLimit : 0;
  const markUntrusted = process.env.MCP_MARK_UNTRUSTED?.trim().toLowerCase() === 'true';
  const logFormat = process.env.MCP_LOG_FORMAT?.trim().toLowerCase() === 'json' ? 'json' : 'text';
  const configuredLogLevel = process.env.MCP_LOG_LEVEL?.trim().toLowerCase();
  const logLevel = ['debug', 'info', 'warn', 'error'].includes(configuredLogLevel ?? '') ? configuredLogLevel as LogLevel : 'info';
  const confirmDestructive = process.env.MCP_CONFIRM_DESTRUCTIVE?.trim().toLowerCase() === 'true';

  const { app, closeAllSessions } = createMcpHttpApp({
    allowedHosts, publicUrl, tokenSecret, previousTokenSecrets, gptClient, trustProxy, allowedOrigins: configuredAllowedOrigins.length ? configuredAllowedOrigins : undefined, allowedRedirectUris, allowedRedirectPresets, allowedToolsets, cimdEnabled, sessionIdleMs, maxSessions, maxResponseChars, rateLimitTools, markUntrusted, logFormat, logLevel, confirmDestructive, registerRateLimit, tokenIpRateLimit, refreshTokenTtlSeconds, apiBaseUrl: API_BASE_URL,
  });

  // Behind a TLS reverse proxy, set MCP_HTTP_HOST=127.0.0.1 so the plaintext
  // port — over which clients send their Polarion PAT — is never public.
  const host = process.env.MCP_HTTP_HOST || '0.0.0.0';

  const httpServer = app.listen(port, host, () => {
    console.log(`[INFO] ${SERVER_NAME} MCP Streamable HTTP server v${SERVER_VERSION} listening on port ${port}`);
    console.log(`[INFO] MCP endpoint: http://localhost:${port}${MCP_PATH} (send your Polarion PAT as Bearer token)`);
    console.log(`[INFO] Health:       http://localhost:${port}/health`);
    console.log(`[INFO] Proxying Polarion API at ${API_BASE_URL}`);
    for (const warning of configurationWarnings(process.env, { needsToken: false })) console.log(`[WARN] ${warning}`);
    if (publicUrl) {
      console.log(`[INFO] OAuth login enabled at ${new URL('/authorize', publicUrl).href}`);
      if (!tokenSecret) {
        console.log('[WARN] MCP_TOKEN_SECRET is not set: every login and client registration ends when the server restarts.');
      }
      if (allowedRedirectUris.length > 0 || allowedRedirectPresets.length > 0) {
        if (allowedRedirectUris.length > 0) console.log(`[INFO] OAuth redirect URIs limited to: ${allowedRedirectUris.join(', ')}`);
        if (allowedRedirectPresets.length > 0) console.log(`[INFO] OAuth redirect presets configured: ${allowedRedirectPresets.join(', ')}`);
      } else {
        console.log('[WARN] MCP_ALLOWED_REDIRECT_PREFIXES is not set: any client may register any redirect URI.');
      }
      if (cimdEnabled) console.log('[INFO] OAuth Client ID Metadata Documents are enabled.');
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

  // Node closes idle connections after 5 s; a proxy that reuses one at that moment gets a 502.
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;

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
