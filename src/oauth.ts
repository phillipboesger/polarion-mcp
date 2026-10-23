/**
 * OAuth authorization server for the Streamable HTTP MCP transport.
 *
 * MCP clients that cannot be handed a token by hand — Claude.ai and ChatGPT
 * connectors, above all — expect to be sent through an OAuth login when a
 * request is unauthenticated. This module is that login: it registers clients
 * (DCR), shows a page where the user pastes their own Polarion Personal Access
 * Token, checks that token against Polarion, and only then issues tokens for
 * this MCP server. A second, PKCE-less flow serves ChatGPT Custom GPT Actions,
 * which authenticate as one preconfigured confidential client.
 *
 * Client ids, access tokens and refresh tokens are sealed (see `sealed.ts`):
 * the PAT travels inside them encrypted, so the server stores nothing and a
 * login survives restarts. It lasts as long as Polarion accepts the PAT — every
 * refresh re-checks it. Only the short-lived pieces (an open login page, an
 * unredeemed authorization code) live in memory.
 */

import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import https from 'node:https';
import axios from 'axios';
import type { Response } from 'express';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidClientMetadataError, InvalidGrantError, InvalidRequestError, InvalidTokenError, ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { redirectUriMatches } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';

import { API_BASE_URL, shouldRejectUnauthorized } from './config.js';
import { fetchClientMetadata, parseClientIdentifierUrl, type CimdClientMetadata, type CimdMetadataFetcher } from './cimd.js';
import { Sealer, safeEqual } from './sealed.js';

/** Scope advertised by this server; the PAT itself carries the real permissions. */
export const POLARION_SCOPE = 'polarion';

/** Path of the form target that receives the pasted Polarion token. */
export const LOGIN_PATH = '/polarion-login';

/**
 * How long an issued access token stays valid. Short, because a refresh is
 * silent and is where a revoked PAT is noticed.
 */
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const cimdRequestClientMemo = new AsyncLocalStorage<Map<string, OAuthClientInformationFull>>();

/** Reuses a prevalidated CIMD client throughout one authorization request. */
export function withCimdClientMemo(client: OAuthClientInformationFull, callback: () => void): void {
  cimdRequestClientMemo.run(new Map([[client.client_id, client]]), callback);
}

/** Default sliding refresh-token lifetime; deployments may override in seconds. */
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;

/** Maximum age of a refresh-token family, measured from its first issue. */
const REFRESH_TOKEN_FAMILY_TTL_SECONDS = 90 * 24 * 60 * 60;

/** How long the user has to complete the login page before the code dies. */
const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000;

/** How long an authorization code may be exchanged for a token. */
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

/**
 * Most login pages open at once. Opening one needs no credentials, so without
 * a cap a flood of authorize requests would grow memory for 10 minutes.
 */
const MAX_PENDING_LOGINS = 10_000;

/** Accept the RFC 8707 resource with or without its single trailing slash. */
function normalizeResource(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Result of asking Polarion about a PAT: accepted, rejected (401), known but
 * without access (403, e.g. no license or REST permission), or no answer
 * (network error, Polarion down) — the last must not end a login.
 */
export type TokenCheck = boolean | 'forbidden' | 'unavailable';

export type TokenValidator = (token: string) => Promise<TokenCheck>;

/** Which token endpoint may redeem a code: the PKCE one, or the Custom GPT one. */
type Flow = 'mcp' | 'gpt';

interface PendingLogin {
  flow: Flow;
  clientId: string;
  clientName: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

interface AuthorizationCode extends PendingLogin {
  polarionToken: string;
  /** Set once the PKCE challenge was handed out; see challengeForAuthorizationCode. */
  challenged?: boolean;
}

/** Sealed inside a refresh token. */
interface RefreshPayload {
  /** Client id the token was issued to. */
  c: string;
  /** The user's Polarion PAT. */
  p: string;
  /** Scopes. */
  s: string[];
  /** RFC 8707 resource. */
  r?: string;
  /** Issue time of this refresh token, in epoch seconds. */
  iat: number;
  /** Start time of its refresh-token family, in epoch seconds. */
  fiat: number;
  /** Expiration of this refresh token, in epoch seconds. */
  exp: number;
  /** Canonical protected resource this token was issued for. */
  aud: string;
}

/** Sealed inside an access token. */
interface AccessPayload extends RefreshPayload {
  /** Expiry, epoch milliseconds. */
  e: number;
}

/** Client metadata sealed into a DCR client id. */
type SealedClient = Omit<OAuthClientInformationFull, 'client_id' | 'client_secret' | 'client_secret_expires_at'>;

/**
 * Checks a Polarion Personal Access Token by making the cheapest authenticated
 * call the REST API offers: asking for a single project.
 *
 * @param token - The token to check.
 * @returns True if Polarion accepted it, false if it rejected it, 'forbidden'
 *   if it knows the token but denies access, or 'unavailable' if Polarion gave
 *   no usable answer.
 */
export async function validatePolarionToken(token: string): Promise<TokenCheck> {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { 'page[size]': 1 },
      httpsAgent: new https.Agent({ rejectUnauthorized: shouldRejectUnauthorized() }),
      timeout: 15_000,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300) return true;
    // Why Polarion refused (status and its own error detail), never the token:
    // without it a 403 on the login page is indistinguishable from a typo.
    const detail = String(response.data?.errors?.[0]?.detail ?? response.data?.errors?.[0]?.title ?? '')
      .replace(/\s+/g, ' ').slice(0, 200);
    console.error(`[WARN] Polarion token check failed: HTTP ${response.status}${detail ? ` - ${detail}` : ''}`);
    if (response.status === 401) return false;
    if (response.status === 403) return 'forbidden';
    return 'unavailable';
  } catch (error) {
    console.error(`[WARN] Polarion token check failed: ${error instanceof Error ? error.message : String(error)}`);
    return 'unavailable';
  }
}

/** Hosts whose redirect URIs may use any port (RFC 8252 section 7.3). */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type RedirectPresetName = 'claude' | 'chatgpt' | 'vscode' | 'cursor' | 'copilot-studio' | 'gemini' | 'loopback';

/**
 * Verified literal callback URIs from docs/clients.json. Entries that are
 * generated per installation or not verified stay empty and fail closed.
 */
export const REDIRECT_PRESET_URIS = {
  claude: ['https://claude.ai/api/mcp/auth_callback'],
  chatgpt: [],
  vscode: [],
  cursor: ['https://www.cursor.com/agents/mcp/oauth/callback', 'http://localhost:8787/callback'],
  'copilot-studio': [],
  gemini: [],
  loopback: [],
} as const satisfies Readonly<Record<RedirectPresetName, readonly string[]>>;

const LOOPBACK_PRESET = 'urn:polarion-mcp:loopback-any-port';
const DENY_ALL_PRESET = 'urn:polarion-mcp:deny-all';

/**
 * Parses the URI allowlist and expands named redirect presets.
 *
 * @param value - Comma-separated entries. One ending in "/" is a prefix,
 *   any other must match exactly (a loopback one on any port).
 * @param presets - Recognized client presets from `MCP_ALLOWED_REDIRECT_PRESETS`.
 * @returns The entries, prefixes normalized; empty when both settings are unset.
 * @throws Error for an entry that is not an absolute URL.
 */
export function parseRedirectAllowlist(value: string | undefined, presets: readonly string[] = []): string[] {
  const entries = (value ?? '').split(',').map(entry => entry.trim()).filter(Boolean).map(entry => {
    if (!URL.canParse(entry)) throw new Error(`Redirect URI allowlist entry is not an absolute URL: ${entry}`);
    return entry.endsWith('/') ? loopbackAnyPort(new URL(entry)).href : entry;
  });
  const knownPresets = new Set<string>(Object.keys(REDIRECT_PRESET_URIS));
  let hasLoopbackPreset = false;
  for (const preset of presets) {
    if (!knownPresets.has(preset)) continue;
    if (preset === 'loopback') hasLoopbackPreset = true;
    else entries.push(...REDIRECT_PRESET_URIS[preset as Exclude<RedirectPresetName, 'loopback'>]);
  }
  if (hasLoopbackPreset) entries.push(LOOPBACK_PRESET);
  // A configured preset list must never accidentally turn into the historical
  // empty-list allow-all mode, including when all names are unknown or a
  // known client has no verified fixed callback yet.
  if (presets.length > 0 && entries.length === 0) entries.push(DENY_ALL_PRESET);
  return entries;
}

/** @returns Whether this identifier uses CIMD's HTTPS URL form. */
export function isCimdClientIdentifier(clientId: string): boolean {
  try {
    return new URL(clientId).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param url - A parsed URL; modified in place.
 * @returns The URL, without its port if it is a loopback one.
 */
function loopbackAnyPort(url: URL): URL {
  if (LOOPBACK_HOSTS.has(url.hostname)) url.port = '';
  return url;
}

/**
 * Checks a redirect URI against the allowlist. A prefix is compared with the
 * normalized URI, so "../" or "%2e%2e" cannot climb out of it.
 *
 * @param uri - A redirect URI a client registered.
 * @param allowlist - Entries from {@link parseRedirectAllowlist}; empty allows all.
 * @returns True if the URI may be used.
 */
export function isRedirectAllowed(uri: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return true;
  if (!URL.canParse(uri)) return false;
  const parsed = new URL(uri);
  const normalized = loopbackAnyPort(new URL(uri)).href;
  return allowlist.some(entry => {
    if (entry === DENY_ALL_PRESET) return false;
    if (entry === LOOPBACK_PRESET) {
      return parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname)
        && !parsed.username && !parsed.password && !parsed.hash;
    }
    return entry.endsWith('/') ? normalized.startsWith(entry) : redirectUriMatches(uri, entry);
  });
}

/**
 * Registry of the MCP clients that registered themselves via DCR.
 *
 * Stores nothing: the client id is the sealed registration, and a
 * confidential client's secret is derived from its id. ChatGPT registers once
 * per connection and never again, so a registration must outlive restarts.
 *
 * Registration is open to anyone, so without a redirect allowlist anyone can
 * register their own callback and send a user a genuine login link that hands
 * the authorization code (and so the user's Polarion access) to them.
 */
class SealedClientsStore implements OAuthRegisteredClientsStore {
  /**
   * @param sealer - Seals and opens client ids.
   * @param redirectAllowlist - Allowed redirect URIs; empty allows any.
   * @param cimdEnabled - Whether HTTPS client identifier URLs may be fetched.
   * @param metadataFetcher - SSRF-guarded client metadata fetcher.
   */
  constructor(
    private readonly sealer: Sealer,
    private readonly redirectAllowlist: readonly string[],
    private readonly cimdEnabled = false,
    private readonly metadataFetcher: CimdMetadataFetcher = fetchClientMetadata
  ) {}

  /**
   * @param clientId - The client id handed out at registration.
   * @returns The registered client, or undefined if this server never issued
   *   it or its redirect URIs are no longer allowed.
   */
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    if (isCimdClientIdentifier(clientId)) {
      const requestMemo = cimdRequestClientMemo.getStore()?.get(clientId);
      if (requestMemo) return requestMemo;
      if (!this.cimdEnabled) return undefined;
      try {
        parseClientIdentifierUrl(clientId);
        const metadata: CimdClientMetadata = await this.metadataFetcher(clientId);
        if (metadata.client_id !== clientId || !this.redirectsAllowed(metadata.redirect_uris)) return undefined;
        return {
          client_id: clientId,
          client_id_issued_at: 0,
          redirect_uris: metadata.redirect_uris,
          token_endpoint_auth_method: 'none',
          ...(metadata.client_name ? { client_name: metadata.client_name } : {}),
        };
      } catch {
        // A failed or invalid metadata fetch is an invalid client, not a server error.
        return undefined;
      }
    }
    const client = this.sealer.open<SealedClient>('c', clientId);
    // A sealed registration never expires, so one issued before the allowlist was set is checked again here.
    if (!client || !this.redirectsAllowed(client.redirect_uris)) return undefined;
    return this.withCredentials(client, clientId);
  }

  /**
   * @param client - Client metadata sent by the MCP client.
   * @returns The registration, including the generated client id.
   * @throws InvalidClientMetadataError if a redirect URI is not on the allowlist.
   */
  registerClient(client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>): OAuthClientInformationFull {
    if (!this.redirectsAllowed(client.redirect_uris)) {
      // JSON-quoted and capped: both values come from the unauthenticated registration request.
      const name = JSON.stringify(client.client_name ?? '').slice(0, 100);
      const uris = JSON.stringify(client.redirect_uris).slice(0, 300);
      console.error(`[WARN] Refused client registration ${name}: redirect URIs ${uris} not on the allowlist`);
      throw new InvalidClientMetadataError('redirect_uri is not allowed by this server');
    }
    const metadata: SealedClient = {
      redirect_uris: client.redirect_uris,
      client_name: client.client_name,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      grant_types: client.grant_types,
      response_types: client.response_types,
      scope: client.scope,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    return this.withCredentials(metadata, this.sealer.seal('c', metadata));
  }

  /**
   * @param uris - A client's redirect URIs.
   * @returns True if there is at least one and every one is allowed. A client
   *   without a callback cannot complete a login, so it is not worth a registration.
   */
  private redirectsAllowed(uris: readonly string[]): boolean {
    return uris.length > 0 && uris.every(uri => isRedirectAllowed(String(uri), this.redirectAllowlist));
  }

  /**
   * @param client - Sealed registration metadata.
   * @param clientId - Its sealed id.
   * @returns The full client, with a derived secret unless it is a public client.
   */
  private withCredentials(client: SealedClient, clientId: string): OAuthClientInformationFull {
    if (client.token_endpoint_auth_method === 'none') return { ...client, client_id: clientId };
    return { ...client, client_id: clientId, client_secret: this.sealer.derive(clientId, clientId), client_secret_expires_at: 0 };
  }
}

/**
 * Escapes a value for safe interpolation into HTML text or an attribute.
 *
 * @param value - Untrusted text, e.g. an OAuth parameter from the client.
 * @returns The value with HTML-significant characters replaced.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Headers for every login page response: never cached, never framed (a
 * framing page could hide the "sends you back to" warning).
 *
 * @param res - The response.
 */
export function setLoginPageHeaders(res: Response): void {
  res.set('Cache-Control', 'no-store');
  res.set('X-Frame-Options', 'DENY');
  res.set('Content-Security-Policy', "frame-ancestors 'none'");
}

/**
 * Renders the login page.
 *
 * One field, one button, and a link to where the token is generated — the user
 * arrives here from their MCP client and needs to understand in one read what
 * is being asked for and why it is safe.
 *
 * @param loginId - Id of the pending login this form belongs to.
 * @param polarionUrl - Base URL of the Polarion instance, shown to the user.
 * @param clientName - Name of the MCP client that sent the user here.
 * @param returnTo - Host the login hands its result to. The client name is
 *   whatever the client registered with; this is where the access really goes.
 * @param error - Message to show after a rejected attempt.
 * @returns A complete HTML document.
 */
export function renderLoginPage(loginId: string, polarionUrl: string, clientName: string, returnTo: string, error?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Connect to Polarion</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f4f5f7;
    --card: #ffffff;
    --text: #14161a;
    --muted: #5c6270;
    --line: #d8dce4;
    --accent: #0b5fff;
    --accent-text: #ffffff;
    --error-bg: #fdeceb;
    --error-line: #e5484d;
    --error-text: #9b1c20;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0e1014;
      --card: #171a21;
      --text: #eceef2;
      --muted: #9aa1ad;
      --line: #2a2f3a;
      --accent: #4d8dff;
      --accent-text: #0b1020;
      --error-bg: #2a1416;
      --error-line: #e5484d;
      --error-text: #ff9ea1;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  main {
    width: 100%;
    max-width: 26rem;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 28px;
  }
  h1 { margin: 0 0 6px; font-size: 1.25rem; letter-spacing: -0.01em; }
  p.lede { margin: 0 0 20px; color: var(--muted); }
  label { display: block; font-weight: 600; margin-bottom: 6px; }
  input[type="password"] {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  input[type="password"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  button {
    width: 100%;
    margin-top: 16px;
    padding: 11px 14px;
    border: 0;
    border-radius: 9px;
    background: var(--accent);
    color: var(--accent-text);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover { filter: brightness(1.07); }
  button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  .hint { margin: 10px 0 0; font-size: 0.85rem; color: var(--muted); }
  .hint a { color: inherit; }
  .error {
    margin: 0 0 16px;
    padding: 10px 12px;
    border: 1px solid var(--error-line);
    border-radius: 8px;
    background: var(--error-bg);
    color: var(--error-text);
  }
  footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>Connect to Polarion</h1>
  <p class="lede">${escapeHtml(clientName)} wants to work with Polarion as you. Connecting sends you back to <strong>${escapeHtml(returnTo)}</strong>; continue only if that is where you came from.</p>
  ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
  <form method="post" action="${LOGIN_PATH}">
    <input type="hidden" name="login_id" value="${escapeHtml(loginId)}">
    <label for="token">Personal Access Token</label>
    <input id="token" name="token" type="password" autocomplete="off" autofocus required
           spellcheck="false" placeholder="paste your Polarion token">
    <p class="hint">Create one in Polarion under <em>My Account &rsaquo; Personal Access Tokens</em> at
      <a href="${escapeHtml(polarionUrl)}" target="_blank" rel="noreferrer">${escapeHtml(polarionUrl)}</a>.</p>
    <button type="submit">Connect</button>
  </form>
  <footer>This server never stores your token. ${escapeHtml(clientName)} only receives it encrypted, in a form only this server can read, so you stay connected until the token expires or you revoke it in Polarion. Everything you do runs under your own Polarion account and permissions.</footer>
</main>
</body>
</html>`;
}

/**
 * OAuth provider that authenticates a user by the Polarion token they paste.
 *
 * In memory it keeps only what lasts minutes: open login pages and unredeemed
 * authorization codes. Registrations and tokens are sealed and held by the
 * client. There is no token revocation endpoint: revoke the PAT in Polarion
 * (direct PAT validation has a 60-second acceptance cache) or rotate the server
 * secret to invalidate every sealed token.
 */
export class PolarionOAuthProvider implements OAuthServerProvider {
  private readonly clients: SealedClientsStore;
  private readonly pendingLogins = new Map<string, PendingLogin>();
  private readonly codes = new Map<string, AuthorizationCode>();

  /**
   * @param polarionUrl - Polarion base URL shown on the login page.
   * @param sealer - Seals client ids and tokens.
   * @param validateToken - Token check; injectable so tests need no Polarion.
   * @param redirectAllowlist - Redirect URIs registered clients may use; empty allows any.
   * @param refreshTokenTtlSeconds - Sliding refresh-token lifetime in seconds.
   * @param resourceAudience - Canonical protected-resource URL for issued tokens.
   * @param cimdEnabled - Whether HTTPS client identifier URLs may be fetched.
   * @param metadataFetcher - SSRF-guarded metadata fetcher; injectable for tests.
   */
  constructor(
    private readonly polarionUrl: string,
    private readonly sealer: Sealer,
    private readonly validateToken: TokenValidator = validatePolarionToken,
    redirectAllowlist: readonly string[] = [],
    private readonly refreshTokenTtlSeconds = DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
    private readonly resourceAudience?: string,
    cimdEnabled = false,
    metadataFetcher: CimdMetadataFetcher = fetchClientMetadata
  ) {
    this.clients = new SealedClientsStore(sealer, redirectAllowlist, cimdEnabled, metadataFetcher);
  }

  /** @returns The registry of dynamically registered MCP clients. */
  get clientsStore(): OAuthRegisteredClientsStore {
    return this.clients;
  }

  /**
   * Starts the MCP (PKCE) login: shows the page instead of redirecting to
   * another server.
   *
   * @param client - The MCP client asking for authorization.
   * @param params - Redirect URI, PKCE challenge, state and scopes.
   * @param res - Response to render the login page into.
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    if (params.resource && this.resourceAudience
      && normalizeResource(params.resource.href) !== normalizeResource(this.resourceAudience)) {
      throw new InvalidRequestError('The requested resource does not match this MCP server');
    }
    const supportedScopes = params.scopes?.filter(scope => scope === POLARION_SCOPE) ?? [];
    this.beginLogin(
      {
        flow: 'mcp',
        clientId: client.client_id,
        clientName: client.client_name ?? 'This MCP client',
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        // The SDK passes [] when the client asks for no scope.
        scopes: supportedScopes.length ? supportedScopes : [POLARION_SCOPE],
        resource: params.resource?.href,
      },
      res
    );
  }

  /**
   * Starts the Custom GPT login. The caller has already checked the client and
   * redirect URI; this flow has no PKCE, so its code is only redeemable at the
   * GPT token endpoint, which requires the client secret.
   *
   * @param clientId - The preconfigured Custom GPT client id.
   * @param redirectUri - The GPT's verified OAuth callback.
   * @param state - State to echo back to ChatGPT.
   * @param res - Response to render the login page into.
   */
  authorizeGpt(clientId: string, redirectUri: string, state: string, res: Response): void {
    this.beginLogin({ flow: 'gpt', clientId, clientName: 'ChatGPT', redirectUri, state, scopes: [POLARION_SCOPE] }, res);
  }

  /**
   * @param login - The login being started, without its expiry.
   * @param res - Response to render the login page into.
   */
  private beginLogin(login: Omit<PendingLogin, 'expiresAt'>, res: Response): void {
    this.sweep();
    if (this.pendingLogins.size >= MAX_PENDING_LOGINS) {
      // Maps iterate in insertion order: drop the oldest open login.
      this.pendingLogins.delete(this.pendingLogins.keys().next().value as string);
    }
    const loginId = randomBytes(24).toString('base64url');
    this.pendingLogins.set(loginId, { ...login, expiresAt: Date.now() + PENDING_LOGIN_TTL_MS });
    setLoginPageHeaders(res);
    res.send(renderLoginPage(loginId, this.polarionUrl, login.clientName, new URL(login.redirectUri).host));
  }

  /**
   * Completes the login page: checks the pasted token with Polarion and, on
   * success, turns the pending login into an authorization code.
   *
   * @param loginId - Id carried by the login form.
   * @param polarionToken - The token the user pasted.
   * @returns Where to send the user next, or what went wrong.
   */
  async completeLogin(
    loginId: string,
    polarionToken: string
  ): Promise<{ ok: true; redirectTo: string } | { ok: false; reason: string; pending?: { loginId: string; clientName: string; returnTo: string } }> {
    const pending = this.pendingLogins.get(loginId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingLogins.delete(loginId);
      return { ok: false, reason: 'This login has expired. Start again from your MCP client.' };
    }
    const retry = { loginId, clientName: pending.clientName, returnTo: new URL(pending.redirectUri).host };
    // A PAT has no whitespace; a line break picked up while copying would
    // otherwise make Apache answer 400, shown as "could not be reached".
    polarionToken = polarionToken.replace(/\s+/g, '');
    if (!polarionToken) {
      return { ok: false, reason: 'Enter your Polarion Personal Access Token.', pending: retry };
    }
    const check = await this.validateToken(polarionToken);
    if (check === 'unavailable') {
      return { ok: false, reason: 'Polarion could not be reached to check the token. Try again in a moment.', pending: retry };
    }
    if (check === 'forbidden') {
      return {
        ok: false,
        reason: 'Polarion recognized the token but denied access (HTTP 403). Your account may lack a license or the permission to use the REST API; ask your Polarion administrator. A new token will not help.',
        pending: retry,
      };
    }
    if (check !== true) {
      return {
        ok: false,
        reason: 'Polarion did not accept that token. Check that you copied it completely and that it has not expired.',
        pending: retry,
      };
    }

    this.pendingLogins.delete(loginId);
    const code = randomBytes(24).toString('base64url');
    this.codes.set(code, { ...pending, polarionToken, expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS });

    const target = new URL(pending.redirectUri);
    target.searchParams.set('code', code);
    if (pending.state) target.searchParams.set('state', pending.state);
    return { ok: true, redirectTo: target.href };
  }

  /**
   * @param client - The client exchanging the code.
   * @param authorizationCode - The code issued after a successful login.
   * @returns The PKCE challenge recorded when the login began.
   */
  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const entry = this.codes.get(authorizationCode);
    if (!entry || entry.flow !== 'mcp' || !entry.codeChallenge || entry.expiresAt < Date.now() || entry.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid authorization code');
    }
    // The SDK checks the verifier after this returns and calls exchangeAuthorizationCode
    // (which consumes the code) only if it matches. A code can be challenged once, so a
    // wrong verifier burns it instead of leaving it open for further guesses.
    if (entry.challenged) {
      this.codes.delete(authorizationCode);
      throw new InvalidGrantError('Invalid authorization code');
    }
    entry.challenged = true;
    return entry.codeChallenge;
  }

  /**
   * Exchanges a one-time MCP (PKCE) authorization code for tokens.
   *
   * @param client - The client presenting the code.
   * @param authorizationCode - The code to redeem.
   * @param _codeVerifier - PKCE verifier, already checked by the SDK handler.
   * @param redirectUri - Redirect URI to match against the login.
   * @returns The issued access and refresh tokens.
   */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string
  ): Promise<OAuthTokens> {
    const entry = this.redeem(authorizationCode, 'mcp', client.client_id);
    // Optional: a client that sent none at /authorize was given its single registered one (SDK), so
    // the stored value cannot tell "omitted" from "sent".
    if (redirectUri !== undefined && !safeEqual(redirectUri, entry.redirectUri)) {
      throw new InvalidGrantError('Redirect URI does not match the authorization request');
    }
    return this.issue(entry);
  }

  /**
   * Exchanges a one-time Custom GPT authorization code for tokens. The caller
   * has already authenticated the client with its secret.
   *
   * @param clientId - The authenticated Custom GPT client id.
   * @param authorizationCode - The code to redeem.
   * @param redirectUri - Must equal the callback the login was started with.
   * @returns The issued access and refresh tokens.
   */
  exchangeGptCode(clientId: string, authorizationCode: string, redirectUri: string): OAuthTokens {
    const entry = this.redeem(authorizationCode, 'gpt', clientId);
    if (!safeEqual(redirectUri, entry.redirectUri)) {
      throw new InvalidGrantError('Redirect URI does not match the authorization request');
    }
    return this.issue(entry);
  }

  /**
   * Consumes a code; it is gone whether or not the exchange succeeds.
   *
   * @param authorizationCode - The code to redeem.
   * @param flow - The flow whose token endpoint is redeeming it.
   * @param clientId - The client presenting it.
   * @returns The login the code stands for.
   */
  private redeem(authorizationCode: string, flow: Flow, clientId: string): AuthorizationCode {
    const entry = this.codes.get(authorizationCode);
    this.codes.delete(authorizationCode);
    if (!entry || entry.flow !== flow || entry.expiresAt < Date.now() || entry.clientId !== clientId) {
      throw new InvalidGrantError('Invalid authorization code');
    }
    return entry;
  }

  /**
   * Exchanges a refresh token for new tokens (MCP token endpoint).
   *
   * @param client - The client presenting the refresh token.
   * @param refreshToken - The refresh token to redeem.
   * @returns A fresh pair of tokens.
   */
  async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
    return this.refresh(client.client_id, refreshToken);
  }

  /**
   * Renews a login. Re-checks the PAT with Polarion, so revoking the PAT there
   * ends the login at refresh. Direct PAT checks in the HTTP layer use a 60 s
   * acceptance cache; rotating the server secret invalidates every sealed token.
   *
   * @param clientId - The authenticated client presenting the refresh token.
   * @param refreshToken - The refresh token to redeem.
   * @returns A fresh pair of tokens, with the scopes of the original login;
   *   a scope sent with the refresh request is ignored.
   */
  async refresh(clientId: string, refreshToken: string): Promise<OAuthTokens> {
    // Rotation is stateless: an older refresh token remains usable until its own exp (within the 90-day family cap).
    // Detecting reuse and revoking prior tokens would require server-side token-family state.
    const entry = this.sealer.open<RefreshPayload>('r', refreshToken);
    const now = Math.floor(Date.now() / 1000);
    if (!entry || entry.c !== clientId || (this.resourceAudience !== undefined && entry.aud !== this.resourceAudience)
      || !Number.isFinite(entry.iat) || !Number.isFinite(entry.fiat)
      || !Number.isFinite(entry.exp) || now >= entry.exp
      || now >= entry.fiat + REFRESH_TOKEN_FAMILY_TTL_SECONDS) {
      throw new InvalidGrantError('Invalid refresh token');
    }
    const check = await this.validateToken(entry.p);
    if (check === 'unavailable') {
      // Not invalid_grant: that would make the client drop the login for good.
      throw new ServerError('Polarion could not be reached to renew the login; try again later');
    }
    // Strictly true: 'forbidden' is a truthy string and must end the login too.
    if (check !== true) {
      throw new InvalidGrantError('Polarion no longer accepts the token behind this login');
    }
    return this.issue({ clientId, polarionToken: entry.p, scopes: entry.s, resource: entry.r }, entry.fiat);
  }

  /**
   * Mints a sealed access/refresh token pair bound to one Polarion token.
   *
   * @param login - Client, PAT, scopes and resource the tokens stand for.
   * @returns The OAuth token response.
   */
  private issue(
    login: { clientId: string; polarionToken: string; scopes: string[]; resource?: string },
    familyIssuedAt?: number
  ): OAuthTokens {
    const iat = Math.floor(Date.now() / 1000);
    const fiat = familyIssuedAt ?? iat;
    const refresh: RefreshPayload = {
      c: login.clientId,
      p: login.polarionToken,
      s: login.scopes,
      r: login.resource,
      aud: this.resourceAudience ?? login.resource ?? '',
      iat,
      fiat,
      exp: Math.min(iat + this.refreshTokenTtlSeconds, fiat + REFRESH_TOKEN_FAMILY_TTL_SECONDS),
    };
    return {
      access_token: this.sealer.seal('a', { ...refresh, e: Date.now() + ACCESS_TOKEN_TTL_MS } satisfies AccessPayload),
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: login.scopes.join(' '),
      refresh_token: this.sealer.seal('r', refresh),
    };
  }

  /**
   * Verifies an access token this server issued.
   *
   * @param token - The bearer token from the request.
   * @returns Auth info; the Polarion PAT rides along in `extra`.
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const entry = this.openAccessToken(token);
    if (!entry) throw new InvalidTokenError('Invalid or expired access token');
    return {
      token,
      clientId: entry.c,
      scopes: entry.s,
      expiresAt: Math.floor(entry.e / 1000),
      ...(entry.r ? { resource: new URL(entry.r) } : {}),
      extra: { polarionToken: entry.p },
    };
  }

  /**
   * Looks up the Polarion token behind an access token, without throwing.
   *
   * @param token - A sealed access token.
   * @returns The Polarion PAT, or undefined if the token is invalid or expired.
   */
  polarionTokenFor(token: string): string | undefined {
    return this.openAccessToken(token)?.p;
  }

  /**
   * @param token - A sealed access token.
   * @returns The protected resource this access token was issued for.
   */
  audienceFor(token: string): string | undefined {
    return this.openAccessToken(token)?.aud;
  }

  /**
   * @param token - A sealed access token.
   * @returns Its payload if it is genuine and unexpired.
   */
  private openAccessToken(token: string): AccessPayload | undefined {
    const entry = this.sealer.open<AccessPayload>('a', token);
    return entry && entry.e > Date.now() ? entry : undefined;
  }

  /** Drops expired logins and codes, so memory tracks live logins only. */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.pendingLogins) if (entry.expiresAt < now) this.pendingLogins.delete(key);
    for (const [key, entry] of this.codes) if (entry.expiresAt < now) this.codes.delete(key);
  }
}
