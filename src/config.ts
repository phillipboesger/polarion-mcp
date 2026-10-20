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
dotenv.config();

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
 * Get the Bearer token for a named OpenAPI security scheme.
 *
 * The token of the current request always wins: a `BEARER_TOKEN_<SCHEME>`
 * variable left in the environment must never silently take over an HTTP
 * request and make it act as somebody else in Polarion's audit trail. The
 * scheme-specific variable is a fallback for credential-holding modes (stdio,
 * REST wrapper) only.
 *
 * @param schemeName - Security scheme name from the OpenAPI document.
 * @returns The bearer token if available, undefined otherwise
 */
export function getBearerTokenForScheme(schemeName: string): string | undefined {
  const requestToken = requestBearerToken.getStore();
  if (requestToken) return requestToken;
  const envName = `BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  return process.env[envName] || process.env.BEARER_TOKEN;
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
  const token = getBearerToken();
  return token ? createHash('sha256').update(token).digest('hex').slice(0, 16) : 'no-token';
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
