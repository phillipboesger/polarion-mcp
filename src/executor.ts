/**
 * API tool execution logic
 *
 * This module contains the core logic for executing API operations.
 * It handles the complete request lifecycle:
 * 1. Argument validation
 * 2. URL and parameter construction
 * 3. Authentication and security
 * 4. HTTP request execution
 * 5. Response formatting
 * 6. Error handling
 *
 * Key Concepts:
 * - Tool: A single API operation (e.g., "getWorkItem")
 * - Definition: Complete specification of the operation (method, path, params, security)
 * - Arguments: Parameters provided by the AI assistant
 * - Security Schemes: Authentication methods (Bearer, OAuth2, API Key, Basic Auth)
 */

import { ZodError } from "zod";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import https from 'https';
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { JsonObject, McpToolDefinition } from "./types.js";
import { readArg, formatApiError, getZodSchemaFromJsonSchema } from "./utils.js";
import { API_BASE_URL, getBearerToken, shouldRejectUnauthorized } from "./config.js";
import { refreshPolarionConfig, getSdkDocumentation } from "./polarion.js";
import { acquireOAuth2Token } from "./auth.js";

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * ~3 req/s, matching Polarion's low burst tolerance observed in production.
 */
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 350;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
let lastRequestAt = 0;

async function paceRequest(minIntervalMs: number): Promise<void> {
  const wait = minIntervalMs - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/**
 * Sends an HTTP request via axios (or an injected client), applying
 * process-wide request pacing and retry-with-backoff on 429/5xx responses.
 *
 * `opts` is the seam tests use to inject a fake `httpClient` and near-zero
 * `minIntervalMs`/`initialBackoffMs` so retry tests run in milliseconds. The
 * production call site (`executeApiTool`) uses all defaults.
 */
export async function sendWithRetry(
  config: AxiosRequestConfig,
  opts: {
    httpClient?: (c: AxiosRequestConfig) => Promise<AxiosResponse>;
    maxRetries?: number;
    initialBackoffMs?: number;
    minIntervalMs?: number;
  } = {},
  attempt = 1
): Promise<AxiosResponse> {
  const {
    httpClient = axios,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
    minIntervalMs = DEFAULT_MIN_REQUEST_INTERVAL_MS,
  } = opts;
  await paceRequest(minIntervalMs);
  lastRequestAt = Date.now();
  try {
    return await httpClient(config);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      (error.response.status === 429 || error.response.status >= 500) &&
      attempt <= maxRetries
    ) {
      await new Promise((r) => setTimeout(r, initialBackoffMs * 2 ** (attempt - 1)));
      return sendWithRetry(config, opts, attempt + 1);
    }
    throw error;
  }
}

/**
 * Execute an API tool (main entry point for API operations)
 *
 * This is the main orchestrator function that:
 * 1. Validates input arguments against JSON Schema
 * 2. Constructs the HTTP request (URL, headers, body)
 * 3. Applies authentication/security
 * 4. Executes the request
 * 5. Formats the response
 *
 * @param toolName - Name of the tool to execute (e.g., "getWorkItem")
 * @param definition - Complete tool definition from OpenAPI spec
 * @param toolArgs - Arguments provided by AI assistant (may use sanitized names)
 * @param allSecuritySchemes - Available authentication methods from OpenAPI spec
 * @param sendOpts - Forwarded to {@link sendWithRetry}; production call sites omit this
 *   and get the real axios client with production pacing/retry defaults. Tests use it
 *   to inject a fake httpClient and near-zero pacing/backoff.
 * @returns Formatted API response or error message
 */
export async function executeApiTool(
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: JsonObject,
  allSecuritySchemes: Record<string, any>,
  sendOpts?: Parameters<typeof sendWithRetry>[1]
): Promise<CallToolResult> {
  // Special handling for refresh_polarion_config tool
  // This tool doesn't make an API call, it fetches and caches project configuration
  if (toolName === "refresh_polarion_config") {
    return await refreshPolarionConfig(toolArgs as { projectId: string });
  }

  // Special handling for get_sdk_documentation tool
  // This tool serves SDK PDF files from the local sdk/ directory
  if (toolName === "get_sdk_documentation") {
    return await getSdkDocumentation(toolArgs as { documentId?: string });
  }

  try {
    // ===== STEP 0: Strip dry_run before validation =====
    // Always stripped, regardless of whether the regenerated schema already
    // advertises `dry_run` — so Zod validation never rejects it during any
    // transition period, and it never leaks into `validatedArgs` sent to Polarion.
    const isMutating = MUTATING_METHODS.has(definition.method.toLowerCase());
    const argsForValidation: JsonObject = (typeof toolArgs === 'object' && toolArgs !== null) ? { ...toolArgs } : {};
    const dryRun = argsForValidation.dry_run === true;
    delete argsForValidation.dry_run;

    // ===== STEP 1: Validate Arguments =====
    // Use Zod schema to ensure arguments match expected types
    let validatedArgs: JsonObject;
    try {
      const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
      validatedArgs = zodSchema.parse(argsForValidation);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        // Format Zod validation errors for readability
        const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
        return { content: [{ type: 'text', text: validationErrorMessage }] };
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
      }
    }

    // ===== STEP 2: Prepare Request Components =====
    let urlPath = definition.pathTemplate; // e.g., "/projects/{projectId}/workitems/{workItemId}"
    const queryParams: Record<string, any> = {}; // e.g., { "page[size]": 10 }
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Get the name map for this tool (maps sanitized keys back to original keys)
    // This allows us to convert "page_size_" back to "page[size]"
    const nameMap = definition.nameMap || {};

    // ===== STEP 3: Apply Parameters to Request =====
    // Process each parameter according to its type:
    // - path: Replace {paramName} in URL with value
    // - query: Add to URL query string
    // - header: Add to HTTP headers
    definition.executionParameters.forEach((param) => {
      // Read the argument value (handles name mapping)
      const value = readArg(validatedArgs, param.name, nameMap);

      // 🔧 FILTER OUT INVALID VALUES
      // Custom GPT sometimes sends empty strings, 'HEAD', or other invalid values for optional parameters
      // We skip these to avoid API errors
      if (typeof value !== 'undefined' && value !== null) {
        // Skip empty strings for optional parameters
        if (value === '' && param.in === 'query') {
          console.error(`[WARN] Skipping empty value for optional parameter '${param.name}'`);
          return;
        }

        // Skip invalid revision values (HEAD, empty string, etc.)
        if (param.name === 'revision' && (value === '' || value === 'HEAD' || value === 'head')) {
          console.error(`[WARN] Skipping invalid revision value: '${value}'`);
          return;
        }

        if (param.in === 'path') {
          // Path parameters: Replace placeholder in URL
          // Example: "/projects/{projectId}" -> "/projects/myproject"
          urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
        }
        else if (param.in === 'query') {
          // Query parameters: Add to query string
          // Special handling for "fields" parameter which uses bracket notation
          if (param.name === 'fields' && typeof value === 'object' && value) {
            // Convert { workitems: "id,title" } to fields[workitems]=id,title
            for (const [k, val] of Object.entries(value as Record<string, string>)) {
              queryParams[`fields[${k}]`] = val;
            }
          } else {
            queryParams[param.name] = value;
          }
        }
        else if (param.in === 'header') {
          // Header parameters: Add to HTTP headers
          // Header names are converted to lowercase per HTTP specification
          headers[param.name.toLowerCase()] = String(value);
        }
      }
    });

    // Ensure all path parameters are resolved
    // If any {placeholders} remain, we're missing a required parameter
    if (urlPath.includes('{')) {
      throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }

    // Construct the full URL
    // Combine base URL (from config) with the path we built
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // ===== STEP 4: Handle Request Body =====
    const requestBody = readArg(validatedArgs, 'requestBody', nameMap);
    if (definition.requestBodyContentType && typeof requestBody !== 'undefined') {
      requestBodyData = requestBody;
      headers['content-type'] = definition.requestBodyContentType;
    }

    // ===== STEP 5: Apply Security/Authentication =====
    // Security requirements are defined in OpenAPI spec
    // Format: [ { "schemeA": [], "schemeB": ["scope1"] }, { "schemeC": [] } ]
    // Meaning: (schemeA AND schemeB) OR schemeC
    //
    // We try each requirement group until we find one where all schemes are available
    const appliedSecurity = definition.securityRequirements?.find(req => {
      // Check if all schemes in this requirement are available
      return Object.entries(req).every(([schemeName, scopesArray]) => {
        const scheme = allSecuritySchemes[schemeName];
        if (!scheme) return false;

        // API Key security (can be in header, query, or cookie)
        if (scheme.type === 'apiKey') {
          return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        }

        // HTTP security (Basic or Bearer authentication)
        if (scheme.type === 'http') {
          if (scheme.scheme?.toLowerCase() === 'bearer') {
            // Bearer Token: Check for scheme-specific token first, then generic
            // Env vars: BEARER_TOKEN_SCHEMENAME or BEARER_TOKEN
            return !!(process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] || getBearerToken());
          }
          else if (scheme.scheme?.toLowerCase() === 'basic') {
            // Basic Auth: Requires both username and password
            // Env vars: BASIC_USERNAME_SCHEMENAME and BASIC_PASSWORD_SCHEMENAME
            return !!process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
              !!process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
          }
        }

        // OAuth2 security (more complex, supports auto token acquisition)
        if (scheme.type === 'oauth2') {
          // Check for pre-existing token
          if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
            return true;
          }

          // Check for client credentials for auto-acquisition
          // If we have client ID and secret, we can automatically get a token
          if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
            process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
            // Verify we have a supported flow (client credentials or password)
            if (scheme.flows?.clientCredentials || scheme.flows?.password) {
              return true;
            }
          }

          return false;
        }

        // OpenID Connect security
        if (scheme.type === 'openIdConnect') {
          return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        }

        return false;
      });
    });

    // ===== STEP 6: Actually Apply the Security =====
    // If we found matching security scheme(s), apply them to the request
    if (appliedSecurity) {
      // Apply each security scheme from this requirement (combined with AND)
      for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
        const scheme = allSecuritySchemes[schemeName];

        // API Key security
        if (scheme?.type === 'apiKey') {
          const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
          if (apiKey) {
            if (scheme.in === 'header') {
              headers[scheme.name.toLowerCase()] = apiKey;
              console.error(`[INFO] Applied API key '${schemeName}' in header '${scheme.name}'`);
            }
            else if (scheme.in === 'query') {
              queryParams[scheme.name] = apiKey;
              console.error(`[INFO] Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
            }
            else if (scheme.in === 'cookie') {
              // Add the cookie, preserving other cookies if they exist
              headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
              console.error(`[INFO] Applied API key '${schemeName}' in cookie '${scheme.name}'`);
            }
          }
        }
        // HTTP security (Bearer or Basic)
        else if (scheme?.type === 'http') {
          if (scheme.scheme?.toLowerCase() === 'bearer') {
            // Check for scheme-specific token first, then fall back to generic BEARER_TOKEN
            const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] || getBearerToken();
            if (token) {
              headers['authorization'] = `Bearer ${token}`;
              console.error(`[INFO] Applied Bearer token for '${schemeName}'`);
            }
          }
          else if (scheme.scheme?.toLowerCase() === 'basic') {
            const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            if (username && password) {
              headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
              console.error(`[INFO] Applied Basic authentication for '${schemeName}'`);
            }
          }
        }
        // OAuth2 security
        else if (scheme?.type === 'oauth2') {
          // First try to use a pre-provided token
          let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

          // If no token but we have client credentials, try to acquire a token
          if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
            console.error(`[INFO] Attempting to acquire OAuth token for '${schemeName}'`);
            token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
          }

          // Apply token if available
          if (token) {
            headers['authorization'] = `Bearer ${token}`;
            console.error(`[INFO] Applied OAuth2 token for '${schemeName}'`);

            // List the scopes that were requested, if any
            const scopes = scopesArray as string[];
            if (scopes && scopes.length > 0) {
              console.error(`[INFO] Requested scopes: ${scopes.join(', ')}`);
            }
          }
        }
        // OpenID Connect
        else if (scheme?.type === 'openIdConnect') {
          const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
          if (token) {
            headers['authorization'] = `Bearer ${token}`;
            console.error(`[INFO] Applied OpenID Connect token for '${schemeName}'`);

            // List the scopes that were requested, if any
            const scopes = scopesArray as string[];
            if (scopes && scopes.length > 0) {
              console.error(`[INFO] Requested scopes: ${scopes.join(', ')}`);
            }
          }
        }
      }
    }
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
      // Generate a readable representation of the security requirements
      const securityRequirementsString = definition.securityRequirements
        .map(req => {
          const parts = Object.entries(req)
            .map(([name, scopesArray]) => {
              const scopes = scopesArray as string[];
              if (scopes.length === 0) return name;
              return `${name} (scopes: ${scopes.join(', ')})`;
            })
            .join(' AND ');
          return `[${parts}]`;
        })
        .join(' OR ');

      console.error(`[WARN] Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }

    // ===== STEP 7: Execute the HTTP Request =====
    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(), // GET, POST, PATCH, DELETE, etc.
      url: requestUrl,
      params: queryParams, // Query string parameters
      headers: headers, // HTTP headers (including auth)
      ...(requestBodyData !== undefined && { data: requestBodyData }), // Request body (if applicable)
      httpsAgent: new https.Agent({
        rejectUnauthorized: shouldRejectUnauthorized()
      }),
    };

    // dry_run on a mutating tool: return a preview of the request that would
    // be sent, without calling Polarion. GET tools ignore dry_run entirely
    // and always execute live (there's nothing unsafe to preview).
    if (dryRun && isMutating) {
      const redactedHeaders = { ...headers };
      if ('authorization' in redactedHeaders) redactedHeaders.authorization = '[REDACTED]';
      const preview = {
        method: config.method,
        url: config.url,
        headers: redactedHeaders,
        body: requestBodyData,
      };
      return {
        content: [
          {
            type: 'text',
            text: `Dry run — no request was sent to Polarion. Preview:\n${JSON.stringify(preview, null, 2)}`
          }
        ],
      };
    }

    // Log request info to stderr (doesn't affect MCP output)
    // All console.error() calls go to stderr, which is for logging
    // MCP protocol messages go to stdout
    console.error(`[INFO] Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Execute the request with pacing + retry-with-backoff on 429/5xx
    const response = await sendWithRetry(config, sendOpts);

    // ===== STEP 8: Format the Response =====
    let responseText = '';
    // Axios header values are loosely typed (string | number | AxiosHeaders | ...),
    // so coerce to string before normalizing.
    const contentType = String(response.headers['content-type'] ?? '').toLowerCase();

    // Handle JSON responses (most common for REST APIs)
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
      try {
        // Pretty-print JSON with 2-space indentation
        responseText = JSON.stringify(response.data, null, 2);
      } catch (e) {
        responseText = "[Stringify Error]";
      }
    }
    // Handle string responses (text/plain, text/html, etc.)
    else if (typeof response.data === 'string') {
      responseText = response.data;
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) {
      responseText = String(response.data);
    }
    // Handle empty responses
    else {
      responseText = `(Status: ${response.status} - No body content)`;
    }

    // ===== STEP 9: Return Formatted Response =====
    return {
      content: [
        {
          type: "text",
          text: `API Response (Status: ${response.status}):\n${responseText}`
        }
      ],
    };

  } catch (error: unknown) {
    // ===== Error Handling =====
    // Catch and format any errors that occur during execution
    let errorMessage: string;

    // Format Axios errors specially (network errors, API errors, etc.)
    if (axios.isAxiosError(error)) {
      errorMessage = formatApiError(error);
    }
    // Handle standard JavaScript errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Handle unexpected error types (shouldn't happen, but be defensive)
    else {
      errorMessage = 'Unexpected error: ' + String(error);
    }

    // Log error to stderr (for debugging)
    console.error(`[ERROR] Error during execution of tool '${toolName}':`, errorMessage);

    // Return error message to AI assistant
    return { content: [{ type: "text", text: errorMessage }] };
  }
}
