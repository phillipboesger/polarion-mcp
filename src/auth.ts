/**
 * OAuth2 authentication and token management
 *
 * This module handles OAuth2 authentication for the Polarion REST API.
 *
 * Key Features:
 * - Automatic token acquisition using client credentials
 * - Token caching to minimize authentication requests
 * - Automatic token refresh before expiration
 * - Support for multiple OAuth2 flows (client credentials, password)
 *
 * OAuth2 Flow:
 * 1. Client provides credentials (client ID, client secret)
 * 2. Request token from OAuth2 provider
 * 3. Receive access token with expiration time
 * 4. Cache token for reuse
 * 5. Automatically refresh before expiration
 *
 * Environment Variables:
 * - OAUTH_CLIENT_ID_SCHEMENAME: OAuth client ID
 * - OAUTH_CLIENT_SECRET_SCHEMENAME: OAuth client secret
 * - OAUTH_SCOPES_SCHEMENAME: Space-separated list of scopes (optional)
 */

import axios from 'axios';

/**
 * Acquires an OAuth2 token using client credentials flow
 *
 * This function handles the complete OAuth2 token acquisition process:
 * 1. Validates that required credentials are available
 * 2. Checks if a valid cached token exists
 * 3. If needed, requests a new token from the OAuth2 provider
 * 4. Caches the token for future use
 * 5. Returns the access token
 *
 * @param schemeName - Name of the security scheme (used for env variable lookup)
 * @param scheme - OAuth2 security scheme configuration from OpenAPI spec
 * @returns Acquired access token, or null if unable to acquire
 */
export async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
  try {
    // Check if we have the necessary credentials from environment variables
    const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
    const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
    const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];

    if (!clientId || !clientSecret) {
      console.error(`[ERROR] Missing client credentials for OAuth2 scheme '${schemeName}'`);
      return null;
    }

    // Initialize token cache if needed
    // The cache is stored globally to persist across multiple requests
    if (typeof global.__oauthTokenCache === 'undefined') {
      global.__oauthTokenCache = {};
    }

    // Check if we have a cached token that hasn't expired yet
    const cacheKey = `${schemeName}_${clientId}`;
    const cachedToken = global.__oauthTokenCache[cacheKey];
    const now = Date.now();

    if (cachedToken && cachedToken.expiresAt > now) {
      // Token is still valid, return it
      console.error(`[INFO] Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
      return cachedToken.token;
    }

    // Determine token URL based on flow type
    // OAuth2 supports multiple flows - we need to find which one is configured
    let tokenUrl = '';
    if (scheme.flows?.clientCredentials?.tokenUrl) {
      // Client Credentials Flow: App authenticates as itself
      tokenUrl = scheme.flows.clientCredentials.tokenUrl;
      console.error(`[INFO] Using client credentials flow for '${schemeName}'`);
    } else if (scheme.flows?.password?.tokenUrl) {
      // Password Flow: App authenticates with username/password
      tokenUrl = scheme.flows.password.tokenUrl;
      console.error(`[INFO] Using password flow for '${schemeName}'`);
    } else {
      console.error(`[ERROR] No supported OAuth2 flow found for '${schemeName}'`);
      return null;
    }

    // Prepare the token request
    // OAuth2 token requests use application/x-www-form-urlencoded format
    let formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');

    // Add scopes if specified
    // Scopes define what permissions the token will have
    if (scopes) {
      formData.append('scope', scopes);
    }

    console.error(`[INFO] Requesting OAuth2 token from ${tokenUrl}`);

    // Make the token request
    // Authentication uses Basic Auth with client credentials
    const response = await axios({
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Basic Auth: base64(clientId:clientSecret)
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      data: formData.toString()
    });

    // Process the response
    if (response.data?.access_token) {
      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // Default to 1 hour

      // Cache the token with expiration time
      // We expire the token 1 minute early to avoid edge cases
      global.__oauthTokenCache[cacheKey] = {
        token,
        expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
      };

      console.error(`[INFO] Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
      return token;
    } else {
      console.error(`[ERROR] Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
      return null;
    }
  } catch (error: unknown) {
    // Handle and log any errors during token acquisition
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
    return null;
  }
}
