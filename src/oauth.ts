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
import https from 'node:https';
import axios from 'axios';
import type { Response } from 'express';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidGrantError, InvalidTokenError, ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { API_BASE_URL, shouldRejectUnauthorized } from './config.js';
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

/** How long the user has to complete the login page before the code dies. */
const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000;

/** How long an authorization code may be exchanged for a token. */
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

/**
 * Most login pages open at once. Opening one needs no credentials, so without
 * a cap a flood of authorize requests would grow memory for 10 minutes.
 */
const MAX_PENDING_LOGINS = 10_000;

/**
 * Result of asking Polarion about a PAT: accepted, rejected, or no answer
 * (network error, Polarion down) — the last must not end a login.
 */
export type TokenValidator = (token: string) => Promise<boolean | 'unavailable'>;

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
 * @returns True if Polarion accepted it, false if Polarion rejected it, or
 *   'unavailable' if Polarion gave no usable answer.
 */
export async function validatePolarionToken(token: string): Promise<boolean | 'unavailable'> {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { 'page[size]': 1 },
      httpsAgent: new https.Agent({ rejectUnauthorized: shouldRejectUnauthorized() }),
      timeout: 15_000,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300) return true;
    if (response.status === 401 || response.status === 403) return false;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Registry of the MCP clients that registered themselves via DCR.
 *
 * Stores nothing: the client id is the sealed registration, and a
 * confidential client's secret is derived from its id. ChatGPT registers once
 * per connection and never again, so a registration must outlive restarts.
 */
class SealedClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly sealer: Sealer) {}

  /**
   * @param clientId - The client id handed out at registration.
   * @returns The registered client, or undefined if this server never issued it.
   */
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const client = this.sealer.open<SealedClient>('c', clientId);
    return client ? this.withCredentials(client, clientId) : undefined;
  }

  /**
   * @param client - Client metadata sent by the MCP client.
   * @returns The registration, including the generated client id.
   */
  registerClient(client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>): OAuthClientInformationFull {
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
   * @param client - Sealed registration metadata.
   * @param clientId - Its sealed id.
   * @returns The full client, with a derived secret unless it is a public client.
   */
  private withCredentials(client: SealedClient, clientId: string): OAuthClientInformationFull {
    if (client.token_endpoint_auth_method === 'none') return { ...client, client_id: clientId };
    return { ...client, client_id: clientId, client_secret: this.sealer.derive(clientId), client_secret_expires_at: 0 };
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
 * Renders the login page.
 *
 * One field, one button, and a link to where the token is generated — the user
 * arrives here from their MCP client and needs to understand in one read what
 * is being asked for and why it is safe.
 *
 * @param loginId - Id of the pending login this form belongs to.
 * @param polarionUrl - Base URL of the Polarion instance, shown to the user.
 * @param clientName - Name of the MCP client that sent the user here.
 * @param error - Message to show after a rejected attempt.
 * @returns A complete HTML document.
 */
export function renderLoginPage(loginId: string, polarionUrl: string, clientName: string, error?: string): string {
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
  <p class="lede">${escapeHtml(clientName)} wants to work with Polarion as you.</p>
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
 * client. There is no revocation endpoint — a sealed token cannot be recalled;
 * revoking the PAT in Polarion ends the login at the next refresh.
 */
export class PolarionOAuthProvider implements OAuthServerProvider {
  private readonly clients: SealedClientsStore;
  private readonly pendingLogins = new Map<string, PendingLogin>();
  private readonly codes = new Map<string, AuthorizationCode>();

  /**
   * @param polarionUrl - Polarion base URL shown on the login page.
   * @param sealer - Seals client ids and tokens.
   * @param validateToken - Token check; injectable so tests need no Polarion.
   */
  constructor(
    private readonly polarionUrl: string,
    private readonly sealer: Sealer,
    private readonly validateToken: TokenValidator = validatePolarionToken
  ) {
    this.clients = new SealedClientsStore(sealer);
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
    this.beginLogin(
      {
        flow: 'mcp',
        clientId: client.client_id,
        clientName: client.client_name ?? 'This MCP client',
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        scopes: params.scopes ?? [POLARION_SCOPE],
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
    res.set('Cache-Control', 'no-store');
    res.send(renderLoginPage(loginId, this.polarionUrl, login.clientName));
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
  ): Promise<{ ok: true; redirectTo: string } | { ok: false; reason: string; pending?: { loginId: string; clientName: string } }> {
    const pending = this.pendingLogins.get(loginId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingLogins.delete(loginId);
      return { ok: false, reason: 'This login has expired. Start again from your MCP client.' };
    }
    const retry = { loginId, clientName: pending.clientName };
    if (!polarionToken.trim()) {
      return { ok: false, reason: 'Enter your Polarion Personal Access Token.', pending: retry };
    }
    const check = await this.validateToken(polarionToken.trim());
    if (check === 'unavailable') {
      return { ok: false, reason: 'Polarion could not be reached to check the token. Try again in a moment.', pending: retry };
    }
    if (!check) {
      return {
        ok: false,
        reason: 'Polarion did not accept that token. Check that you copied it completely and that it has not expired.',
        pending: retry,
      };
    }

    this.pendingLogins.delete(loginId);
    const code = randomBytes(24).toString('base64url');
    this.codes.set(code, { ...pending, polarionToken: polarionToken.trim(), expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS });

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
   * Renews a login. Re-checks the PAT with Polarion, so a revoked or expired
   * PAT ends the login here — that, not a timer, is what bounds it.
   *
   * @param clientId - The authenticated client presenting the refresh token.
   * @param refreshToken - The refresh token to redeem.
   * @returns A fresh pair of tokens, with the scopes of the original login;
   *   a scope sent with the refresh request is ignored.
   */
  async refresh(clientId: string, refreshToken: string): Promise<OAuthTokens> {
    const entry = this.sealer.open<RefreshPayload>('r', refreshToken);
    if (!entry || entry.c !== clientId) {
      throw new InvalidGrantError('Invalid refresh token');
    }
    const check = await this.validateToken(entry.p);
    if (check === 'unavailable') {
      // Not invalid_grant: that would make the client drop the login for good.
      throw new ServerError('Polarion could not be reached to renew the login; try again later');
    }
    if (!check) {
      throw new InvalidGrantError('Polarion no longer accepts the token behind this login');
    }
    return this.issue({ clientId, polarionToken: entry.p, scopes: entry.s, resource: entry.r });
  }

  /**
   * Mints a sealed access/refresh token pair bound to one Polarion token.
   *
   * @param login - Client, PAT, scopes and resource the tokens stand for.
   * @returns The OAuth token response.
   */
  private issue(login: { clientId: string; polarionToken: string; scopes: string[]; resource?: string }): OAuthTokens {
    const refresh: RefreshPayload = { c: login.clientId, p: login.polarionToken, s: login.scopes, r: login.resource };
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
