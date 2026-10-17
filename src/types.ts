/**
 * TypeScript type definitions for the MCP Polarion REST server
 *
 * This file defines all custom types and interfaces used throughout the application.
 * TypeScript types provide:
 * - Compile-time type safety
 * - Better IDE autocomplete and IntelliSense
 * - Self-documenting code
 * - Easier refactoring
 *
 * Key Type Categories:
 * - JSON types: For API request/response data
 * - MCP types: For tool and resource definitions
 * - Polarion types: For project configurations
 * - Cache types: For OAuth token management
 */

/**
 * Type definition for JSON objects
 *
 * This is a flexible type that represents any valid JSON object.
 * Used for API payloads and arguments that can have any structure.
 *
 * Example:
 * const workItem: JsonObject = {
 *   id: "PROJ-123",
 *   type: "task",
 *   title: "Fix bug"
 * };
 */
export type JsonObject = Record<string, any>;

/**
 * Type for name mapping (safe key -> original key)
 *
 * Maps sanitized property names to their original names.
 * This is needed because:
 * - MCP protocol requires simple property names [a-zA-Z0-9_.-]{1,64}
 * - OpenAPI specs may use complex names like "page[size]"
 * - We sanitize names for MCP, then map them back for API calls
 *
 * Example:
 * {
 *   "page_size": "page[size]",
 *   "page_number": "page[number]"
 * }
 */
export type NameMap = Record<string, string>;

/**
 * MCP tool behavioral hints, per the Model Context Protocol spec's
 * `ToolAnnotations`. These are structured signals for MCP clients (and
 * quality scanners) about side effects, so they don't have to be inferred
 * from free-text descriptions alone.
 *
 * - readOnlyHint: tool does not modify Polarion state (GET operations)
 * - destructiveHint: tool may delete/irreversibly remove data
 * - idempotentHint: calling the tool repeatedly with the same arguments
 *   has no additional effect beyond the first call
 * - openWorldHint: tool interacts with an external system (always true
 *   here — every tool calls the Polarion REST API)
 */
export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Interface for MCP Tool Definition
 *
 * Defines the complete structure of an API tool that can be invoked via MCP.
 * Each tool represents a single API operation (e.g., GET /projects/{id}).
 *
 * Properties:
 * - name: Unique identifier for the tool (e.g., "getWorkItem")
 * - description: Human-readable explanation of what the tool does
 * - inputSchema: JSON Schema defining required/optional parameters
 * - method: HTTP method (GET, POST, PATCH, DELETE, etc.)
 * - pathTemplate: URL path with parameter placeholders (e.g., "/projects/{projectId}")
 * - executionParameters: List of parameters and where they go (path, query, header)
 * - requestBodyContentType: MIME type for request body (if applicable)
 * - securityRequirements: Authentication methods required for this operation
 * - annotations: Behavioral hints (read-only, destructive, idempotent, open-world)
 * - outputSchema: JSON Schema for the tool's success response body, derived from the
 *   Polarion OpenAPI spec's response definition (absent for operations with no JSON
 *   body, e.g. most `204 No Content` deletes)
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  method: string;
  pathTemplate: string;
  executionParameters: { name: string, in: string }[];
  requestBodyContentType?: string;
  securityRequirements: any[];
  annotations?: McpToolAnnotations;
  outputSchema?: any;
}

/**
 * Token cache entry type
 *
 * Represents a cached OAuth2 access token with its expiration time.
 *
 * Properties:
 * - token: The actual access token string
 * - expiresAt: Timestamp (in milliseconds) when the token expires
 *
 * Note: Tokens are expired 1 minute early to avoid edge cases
 * where a token expires between validation and use.
 */
export interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

/**
 * Global type augmentation for OAuth token cache
 *
 * This extends the global namespace to include our token cache.
 * The cache is stored globally so tokens can be reused across multiple requests.
 *
 * Why global?
 * - Tokens should persist for the lifetime of the server process
 * - Multiple API calls can share the same token
 * - Reduces authentication overhead
 *
 * Structure:
 * - Key: "${schemeName}_${clientId}"
 * - Value: TokenCacheEntry with token and expiration
 */
declare global {
  var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}
