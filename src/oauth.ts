/**
 * OAuth authorization server for the Streamable HTTP MCP transport.
 *
 * MCP clients that cannot be handed a token by hand — Claude.ai connectors,
 * above all — expect to be sent through an OAuth login when a request is
 * unauthenticated. This module is that login: it registers clients (DCR),
 * shows a page where the user pastes their own Polarion Personal Access Token,
 * checks that token against Polarion, and only then issues an access token for
 * this MCP server.
 *
 * The access token this server hands out is a random opaque string; the PAT
 * behind it is held in memory, never written to disk and never sent to the
 * client. A restart drops every session, so the next request re-runs the login.
 * That is deliberate: no user's Polarion credential outlives the process.
 */

import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import https from 'node:https';
import axios from 'axios';
import type { Response } from 'express';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

import { API_BASE_URL, shouldRejectUnauthorized } from './config.js';

/** Scope advertised by this server; the PAT itself carries the real permissions. */
export const POLARION_SCOPE = 'polarion';

/** Path of the form target that receives the pasted Polarion token. */
export const LOGIN_PATH = '/polarion-login';

/** How long an issued access token stays valid. */
const ACCESS_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

/** How long the user has to complete the login page before the code dies. */
const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000;

/** How long an authorization code may be exchanged for a token. */
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

interface PendingLogin {
  clientId: string;
  redirectUri: string;
  state?: string;
  codeChallenge: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

interface AuthorizationCode extends PendingLogin {
  polarionToken: string;
}

interface IssuedToken {
  clientId: string;
  polarionToken: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

/**
 * Checks a Polarion Personal Access Token by making the cheapest authenticated
 * call the REST API offers: asking for a single project.
 *
 * @param token - The token the user pasted.
 * @returns True if Polarion accepted the token.
 */
export async function validatePolarionToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      params: { 'page[size]': 1 },
      httpsAgent: new https.Agent({ rejectUnauthorized: shouldRejectUnauthorized() }),
      timeout: 15_000,
      validateStatus: () => true,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns True if both strings are identical.
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * In-memory registry of the MCP clients that registered themselves via DCR.
 *
 * Registrations are as short-lived as the tokens: a restart makes clients
 * register again, which every MCP client does on its own.
 */
class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>();

  /**
   * @param clientId - The client id handed out at registration.
   * @returns The registered client, or undefined if this server never saw it.
   */
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }

  /**
   * @param client - Client metadata sent by the MCP client.
   * @returns The stored registration, including the generated client id.
   */
  registerClient(client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>): OAuthClientInformationFull {
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    this.clients.set(registered.client_id, registered);
    return registered;
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
  <footer>Your token stays in this server's memory for this session only. It is never stored on disk and never sent to ${escapeHtml(clientName)}. Everything you do runs under your own Polarion account and permissions.</footer>
</main>
</body>
</html>`;
}

/**
 * OAuth provider that authenticates a user by the Polarion token they paste.
 *
 * The pieces it keeps in memory are all short-lived: pending logins (the open
 * login page), authorization codes (seconds), and issued tokens (hours).
 */
export class PolarionOAuthProvider implements OAuthServerProvider {
  private readonly clients = new InMemoryClientsStore();
  private readonly pendingLogins = new Map<string, PendingLogin>();
  private readonly codes = new Map<string, AuthorizationCode>();
  private readonly tokens = new Map<string, IssuedToken>();
  private readonly refreshTokens = new Map<string, IssuedToken>();

  /**
   * @param polarionUrl - Polarion base URL shown on the login page.
   * @param validateToken - Token check; injectable so tests need no Polarion.
   */
  constructor(
    private readonly polarionUrl: string,
    private readonly validateToken: (token: string) => Promise<boolean> = validatePolarionToken
  ) {}

  /** @returns The registry of dynamically registered MCP clients. */
  get clientsStore(): OAuthRegisteredClientsStore {
    return this.clients;
  }

  /**
   * Starts the login: shows the page instead of redirecting to another server.
   *
   * @param client - The MCP client asking for authorization.
   * @param params - Redirect URI, PKCE challenge, state and scopes.
   * @param res - Response to render the login page into.
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    this.sweep();
    const loginId = randomBytes(24).toString('base64url');
    this.pendingLogins.set(loginId, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      state: params.state,
      codeChallenge: params.codeChallenge,
      scopes: params.scopes ?? [POLARION_SCOPE],
      resource: params.resource?.href,
      expiresAt: Date.now() + PENDING_LOGIN_TTL_MS,
    });
    res.set('Cache-Control', 'no-store');
    res.send(renderLoginPage(loginId, this.polarionUrl, client.client_name ?? 'This MCP client'));
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
    if (!polarionToken.trim()) {
      return { ok: false, reason: 'Enter your Polarion Personal Access Token.', pending: { loginId, clientName: this.clientName(pending.clientId) } };
    }
    if (!(await this.validateToken(polarionToken.trim()))) {
      return {
        ok: false,
        reason: 'Polarion did not accept that token. Check that you copied it completely and that it has not expired.',
        pending: { loginId, clientName: this.clientName(pending.clientId) },
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
   * @param clientId - A registered client id.
   * @returns The client's display name, or a neutral fallback.
   */
  private clientName(clientId: string): string {
    return this.clients.getClient(clientId)?.client_name ?? 'This MCP client';
  }

  /**
   * @param client - The client exchanging the code.
   * @param authorizationCode - The code issued after a successful login.
   * @returns The PKCE challenge recorded when the login began.
   */
  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const entry = this.codes.get(authorizationCode);
    if (!entry || entry.expiresAt < Date.now() || entry.clientId !== client.client_id) {
      throw new Error('Invalid authorization code');
    }
    return entry.codeChallenge;
  }

  /**
   * Exchanges a one-time authorization code for tokens.
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
    const entry = this.codes.get(authorizationCode);
    this.codes.delete(authorizationCode);
    if (!entry || entry.expiresAt < Date.now() || entry.clientId !== client.client_id) {
      throw new Error('Invalid authorization code');
    }
    if (redirectUri !== undefined && !safeEqual(redirectUri, entry.redirectUri)) {
      throw new Error('Redirect URI does not match the authorization request');
    }
    return this.issue(entry.clientId, entry.polarionToken, entry.scopes, entry.resource);
  }

  /**
   * Exchanges a refresh token for a new access token.
   *
   * @param client - The client presenting the refresh token.
   * @param refreshToken - The refresh token to redeem.
   * @param scopes - Optional narrowed scopes; ignored, this server has one.
   * @returns A fresh pair of tokens.
   */
  async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[]): Promise<OAuthTokens> {
    const entry = this.refreshTokens.get(refreshToken);
    this.refreshTokens.delete(refreshToken);
    if (!entry || entry.clientId !== client.client_id) {
      throw new Error('Invalid refresh token');
    }
    return this.issue(entry.clientId, entry.polarionToken, scopes?.length ? scopes : entry.scopes, entry.resource);
  }

  /**
   * Mints an access/refresh token pair bound to one Polarion token.
   *
   * @param clientId - Client the tokens belong to.
   * @param polarionToken - The user's Polarion PAT.
   * @param scopes - Scopes to record on the token.
   * @param resource - RFC 8707 resource the token is valid for.
   * @returns The OAuth token response.
   */
  private issue(clientId: string, polarionToken: string, scopes: string[], resource?: string): OAuthTokens {
    this.sweep();
    const accessToken = randomBytes(32).toString('base64url');
    const refreshToken = randomBytes(32).toString('base64url');
    const record: IssuedToken = { clientId, polarionToken, scopes, resource, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS };
    this.tokens.set(accessToken, record);
    this.refreshTokens.set(refreshToken, record);
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: scopes.join(' '),
      refresh_token: refreshToken,
    };
  }

  /**
   * Verifies an access token this server issued.
   *
   * @param token - The bearer token from the request.
   * @returns Auth info; the Polarion PAT rides along in `extra`.
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = this.tokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      this.tokens.delete(token);
      throw new Error('Invalid or expired access token');
    }
    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      ...(record.resource ? { resource: new URL(record.resource) } : {}),
      extra: { polarionToken: record.polarionToken },
    };
  }

  /**
   * Looks up the Polarion token behind an access token, without throwing.
   *
   * @param token - A bearer value that may or may not be one of ours.
   * @returns The Polarion PAT, or undefined if this is not an issued token.
   */
  polarionTokenFor(token: string): string | undefined {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return undefined;
    }
    return record.polarionToken;
  }

  /**
   * Revokes an issued access or refresh token.
   *
   * @param _client - The client asking for revocation.
   * @param request - Carries the token to revoke.
   */
  async revokeToken(_client: OAuthClientInformationFull, request: { token: string }): Promise<void> {
    this.tokens.delete(request.token);
    this.refreshTokens.delete(request.token);
  }

  /** Drops everything that has expired, so memory tracks live sessions only. */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.pendingLogins) if (entry.expiresAt < now) this.pendingLogins.delete(key);
    for (const [key, entry] of this.codes) if (entry.expiresAt < now) this.codes.delete(key);
    for (const [key, entry] of this.tokens) if (entry.expiresAt < now) this.tokens.delete(key);
    for (const [key, entry] of this.refreshTokens) if (entry.expiresAt < now) this.refreshTokens.delete(key);
  }
}
