/**
 * Configuration constants for the MCP Polarion REST server
 *
 * This file centralizes all configuration settings, including:
 * - Server identification (name and version)
 * - API endpoint configuration
 * - Authentication settings
 *
 * Environment Variables:
 * - API_BASE_URL: Base URL for the Polarion REST API (must point at your own instance)
 * - BEARER_TOKEN: Authentication token for API requests
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load environment variables from .env file
// This allows configuration without modifying code
dotenv.config({ quiet: true });

/**
 * Server configuration
 * These values identify this MCP server to AI assistants
 */
export const SERVER_NAME = "polarion-rest-api";

/**
 * @returns The version in this package's package.json, found by walking up
 *   from the compiled module (build/ and build-tests/src/ sit at different depths).
 */
function packageVersion(): string {
  for (let dir = dirname(fileURLToPath(import.meta.url)); dir !== dirname(dir); dir = dirname(dir)) {
    const file = join(dir, 'package.json');
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === 'polarion-mcp' && pkg.version) return pkg.version;
  }
  return '0.0.0';
}

/** Reported in serverInfo and /health, so a deployment shows which build runs. */
export const SERVER_VERSION = packageVersion();

/**
 * API Base URL - configurable via environment variable
 *
 * This is the root URL for all Polarion REST API requests.
 * Default: placeholder host (https://polarion.example.com/polarion/rest/v1)
 *
 * You MUST set the API_BASE_URL environment variable to your own instance:
 * export API_BASE_URL="https://your-polarion-server.com/polarion/rest/v1"
 */
// No trailing slash: every request path starts with one, and "//projects" is not "/projects".
export const API_BASE_URL = (process.env.API_BASE_URL?.trim() || "https://polarion.example.com/polarion/rest/v1").replace(/\/+$/, "");

/**
 * Problems with the environment that would otherwise only show up as a failing
 * tool call. The server still starts: a catalogue scan (tools/list) needs
 * neither a Polarion nor a token.
 *
 * @param env - The environment to check.
 * @param options.needsToken - Whether this deployment holds the token itself
 *   (stdio, REST wrapper) rather than getting one per request (Streamable HTTP).
 * @returns One line per problem, empty when the configuration is complete.
 */
export function configurationWarnings(env: NodeJS.ProcessEnv, options: { needsToken: boolean }): string[] {
  const warnings: string[] = [];
  if (!env.API_BASE_URL?.trim()) {
    warnings.push('API_BASE_URL is not set: calls go to the placeholder https://polarion.example.com/polarion/rest/v1. Set it to your Polarion REST base URL.');
  }
  if (options.needsToken && !env.BEARER_TOKEN?.trim()) {
    warnings.push('BEARER_TOKEN is not set: every tool call is refused until it holds a Polarion Personal Access Token.');
  }
  warnings.push(...deprecatedConfigWarnings(env));
  return warnings;
}

/** Settings that no longer exist: ignored at startup, with a note on what applies now (never the value). */
const REMOVED_SETTINGS: Record<string, string> = {
  MCP_TOOLSETS: 'NOT enforced any more: use MCP_TOOLS to restrict operations and MCP_READ_ONLY=true to block writes.',
  MCP_OMIT_OUTPUT_SCHEMA: 'tools/list holds two tools in the default Code Mode, so output schemas no longer matter.',
  MCP_COMPLETIONS: 'argument completions were removed.',
  MCP_RESOURCE_LINKS: 'resource links were removed.',
  MCP_VERSION_CHECK: 'the Polarion version check was removed.',
  MCP_VERIFY_MAX_ITEMS: 'the value is fixed at 10 items read back per bulk write.',
  MCP_RATE_LIMIT_REGISTER: 'the value is fixed at 100 registrations per IP per hour.',
  MCP_RATE_LIMIT_TOKEN_IP: 'the value is fixed at 500 failed token requests per IP per 15 minutes.',
  MCP_SESSION_IDLE_MINUTES: 'the value is fixed at 60 minutes.',
  MCP_MAX_SESSIONS: 'the value is fixed at 1000 sessions.',
  MCP_REFRESH_TOKEN_TTL: 'the value is fixed at 14 days.',
  MCP_LOG_FORMAT: 'use MCP_LOG, for example MCP_LOG=json,debug.',
  MCP_LOG_LEVEL: 'use MCP_LOG, for example MCP_LOG=json,debug.',
  MCP_CODE_MODE_WRITES: 'NOT enforced any more: use MCP_TOOLS to restrict operations and MCP_READ_ONLY=true to block writes.',
};

/**
 * @param env - Environment to inspect.
 * @returns One warning per removed setting that is set, naming what applies now.
 */
export function deprecatedConfigWarnings(env: NodeJS.ProcessEnv): string[] {
  const warnings = Object.entries(REMOVED_SETTINGS)
    .filter(([name]) => env[name]?.trim())
    .map(([name, hint]) => `${name} is no longer supported and is ignored: ${hint}`);
  const schemeVars = Object.keys(env).filter(name => /^(API_KEY|BEARER_TOKEN|BASIC_USERNAME|BASIC_PASSWORD|OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET|OAUTH_SCOPES|OAUTH_TOKEN|OPENID_TOKEN)_.+/.test(name) && env[name]?.trim());
  for (const name of schemeVars) warnings.push(`${name} is no longer supported and is ignored: Polarion uses one token, set BEARER_TOKEN (stdio, REST wrapper) or send it as a Bearer header (HTTP).`);
  const mode = env.MCP_MODE?.trim();
  if (mode === 'auto' || mode === 'discover') warnings.push(`MCP_MODE=${mode} is no longer supported and runs as "code" (the default). Set MCP_MODE=full only if your client cannot approve the execute tool.`);
  return warnings;
}

/**
 * Per-request Polarion token, set by the Streamable HTTP transport.
 *
 * In HTTP mode every MCP client authenticates with its *own* Polarion Personal
 * Access Token (`Authorization: Bearer <PAT>`), so the deployment itself holds
 * no credentials. The token travels through the async call chain in this store
 * instead of being threaded through every executor/guard signature.
 */
export const requestBearerToken = new AsyncLocalStorage<string>();

/**
 * Get the Bearer token for the current Polarion REST call.
 *
 * Resolution order:
 * 1. The token of the MCP request currently being served (HTTP mode).
 * 2. The `BEARER_TOKEN` environment variable (stdio mode, single-user setups).
 *
 * How to obtain a Bearer token:
 * 1. Log in to your Polarion instance
 * 2. Navigate to your user profile settings
 * 3. Generate a Personal Access Token (PAT)
 *
 * @returns The bearer token if available, undefined otherwise
 */
export function getBearerToken(): string | undefined {
  return requestBearerToken.getStore() ?? process.env.BEARER_TOKEN;
}

/**
 * Fingerprint of the identity behind the current request, for cache keys.
 *
 * Caches that hold data fetched from Polarion must be keyed by *who* fetched
 * it. Different callers have different permissions, so a shared entry would
 * hand user B data that Polarion only authorized for user A. The token itself
 * never appears in the key.
 *
 * @returns A short, stable, non-reversible id of the current caller.
 */
export function callerCacheScope(): string {
  return tokenScope(getBearerToken());
}

/**
 * @param token - A Polarion token, if any.
 * @returns A stable, non-reversible 128-bit cache identifier.
 */
export function tokenScope(token: string | undefined): string {
  return token ? createHash('sha256').update(token).digest('hex').slice(0, 32) : 'no-token';
}

/**
 * Get SSL certificate verification setting from environment
 *
 * By default, Node.js validates SSL certificates. For internal servers
 * with self-signed certificates, you may need to disable this verification.
 *
 * WARNING: Only disable SSL verification for trusted internal servers.
 * This makes connections vulnerable to man-in-the-middle attacks.
 *
 * To disable SSL verification, set: export NODE_TLS_REJECT_UNAUTHORIZED="0"
 *
 * @returns false if SSL verification should be disabled, true otherwise
 */
export function shouldRejectUnauthorized(): boolean {
  return process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
}

/**
 * Get base Polarion URL (without /rest/v1)
 *
 * This extracts the base Polarion URL from the API_BASE_URL.
 * For example: "https://polarion.example.com/polarion/rest/v1"
 * becomes: "https://polarion.example.com/polarion"
 *
 * @returns The base Polarion URL
 */
export function getPolarionBaseUrl(): string {
  // Remove /rest/v1 from the end of API_BASE_URL
  return API_BASE_URL.replace(/\/rest\/v1\/?$/, '');
}

/** Parses an on/off environment value. `1`, `true`, `yes` and `on` (any case) are on; anything else, including unset, is off. */
export function flagOn(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? '');
}
