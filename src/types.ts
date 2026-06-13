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
 * - nameMap: Mapping from sanitized parameter names to original names
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
  nameMap?: NameMap; // Mapping from sanitized keys to original keys
}

/**
 * Project configuration interface
 *
 * Represents cached configuration for a Polarion project.
 * This configuration helps validate work items and understand project structure.
 *
 * Properties:
 * - projectId: Unique identifier for the project
 * - workItemTypes: Available work item types (e.g., "task", "bug", "requirement")
 * - customFields: Custom fields for each work item type with their configuration
 * - workflows: Workflow definitions (states, transitions, permissions)
 * - enumerations: Enumeration values (statuses, priorities, severities, etc.)
 * - lastUpdated: ISO timestamp of when this configuration was last refreshed
 *
 * Usage:
 * This data is fetched from Polarion and cached in memory for fast access.
 * AI assistants can use it to:
 * - Validate work item data before creation
 * - Show available options for enumeration fields
 * - Understand custom field requirements
 */
export interface ProjectConfig {
  projectId: string;
  workItemTypes: string[];
  customFields: Record<string, Array<{ id: string, type: string, values?: string[] }>>;
  workflows: Record<string, any>;
  enumerations: Record<string, Array<{ id: string, name: string }>>;
  lastUpdated: string;
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
