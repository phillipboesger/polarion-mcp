/**
 * Utility functions for the MCP Polarion REST server
 *
 * This module provides helper functions for:
 * - Schema sanitization (making OpenAPI schemas MCP-compatible)
 * - Parameter name conversion (handling special characters)
 * - Error formatting (creating user-friendly error messages)
 * - Schema validation (converting JSON Schema to Zod for runtime checks)
 *
 * These utilities are used throughout the application to handle edge cases
 * and ensure compatibility between different systems (OpenAPI, MCP, TypeScript).
 */

import { type AxiosError } from 'axios';
import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import type { NameMap } from './types.js';

/**
 * MCP property name validation pattern
 *
 * MCP protocol requires property names to:
 * - Start with a letter or number
 * - Contain only letters, numbers, underscores, dots, or hyphens
 * - Be 1-64 characters long
 *
 * Pattern: [a-zA-Z0-9_.-]{1,64}
 */
const INPUT_KEY_RE = /^[a-zA-Z0-9_.-]{1,64}$/;

/**
 * Sanitizes a property key to match MCP requirements
 *
 * This function:
 * 1. Replaces invalid characters with underscores
 * 2. Truncates to 64 characters maximum
 *
 * Examples:
 * - "page[size]" -> "page_size_"
 * - "content-type" -> "content-type" (already valid)
 * - "a.very.long.property.name.that.exceeds.64.characters..." -> "a.very.long.property.name.that.exceeds.64.characters.that.exc"
 *
 * @param k - The original key to sanitize
 * @returns The sanitized key
 */
export const sanitizeKey = (k: string) => k.replace(/[^\w.-]/g, "_").slice(0, 64);

/**
 * Sanitizes input schema to ensure all property keys match MCP requirements
 * Builds a mapping from sanitized keys to original keys
 *
 * This function recursively processes a JSON Schema and:
 * 1. Identifies properties with invalid names
 * 2. Sanitizes them using sanitizeKey()
 * 3. Records the mapping in nameMap for later use
 * 4. Recursively processes nested schemas
 *
 * Why is this needed?
 * - OpenAPI specs may use bracket notation: "page[size]", "fields[workitems]"
 * - MCP protocol requires simpler names: "page_size_", "fields_workitems_"
 * - We need to map between these representations
 *
 * The nameMap is later used to convert sanitized names back to original names
 * when making actual API calls.
 *
 * @param schema - The JSON Schema to sanitize
 * @param nameMap - Object to store sanitized -> original key mappings
 * @returns The sanitized schema
 */
export function sanitizeInputSchema(schema: any, nameMap: NameMap = {}): any {
  if (!schema || typeof schema !== "object") return schema;

  // Clone the schema to avoid mutating the original
  const copy: any = Array.isArray(schema)
    ? schema.map((s) => sanitizeInputSchema(s, nameMap))
    : { ...schema };

  // Sanitize object property keys
  if (copy.type === "object" && copy.properties && typeof copy.properties === "object") {
    const nextProps: Record<string, any> = {};
    for (const [key, val] of Object.entries(copy.properties)) {
      const safeKey = INPUT_KEY_RE.test(key) ? key : sanitizeKey(key);
      // Record the mapping if the key was changed
      if (safeKey !== key) nameMap[safeKey] = key;
      // Recursively sanitize nested schemas
      nextProps[safeKey] = sanitizeInputSchema(val, nameMap);
    }
    copy.properties = nextProps;
  }

  // Recurse into common schema containers
  for (const k of ["items", "additionalProperties"]) {
    if (copy[k]) copy[k] = sanitizeInputSchema(copy[k], nameMap);
  }
  for (const k of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(copy[k])) copy[k] = copy[k].map((s: any) => sanitizeInputSchema(s, nameMap));
  }

  return copy;
}

/**
 * Converts an HTTP parameter name to a safe input key
 *
 * Checks if the parameter name already matches MCP requirements.
 * If not, sanitizes it.
 *
 * @param name - The parameter name from the OpenAPI spec
 * @returns The safe version of the name
 */
export const paramToSafeInputKey = (name: string) => (INPUT_KEY_RE.test(name) ? name : sanitizeKey(name));

/**
 * Reads an argument value by checking both safe and original parameter names
 *
 * This function handles the complexity of parameter name mapping:
 * 1. First checks the sanitized name (what MCP clients use)
 * 2. Then checks if there's a mapping to an original name
 * 3. Finally falls back to the original HTTP parameter name
 *
 * Why three checks?
 * - AI assistants provide arguments using sanitized names
 * - The nameMap translates sanitized -> original
 * - Some parameters might not have been sanitized (already valid)
 *
 * Example:
 * - httpParamName: "page[size]"
 * - safe: "page_size_"
 * - nameMap: { "page_size_": "page[size]" }
 * - args: { "page_size_": 10 }
 * - Returns: 10
 *
 * @param args - Arguments provided by the AI assistant
 * @param httpParamName - Original parameter name from OpenAPI spec
 * @param nameMap - Mapping from sanitized to original names
 * @returns The argument value, or undefined if not found
 */
export function readArg(args: Record<string, unknown>, httpParamName: string, nameMap: NameMap): unknown {
  const safe = paramToSafeInputKey(httpParamName);
  return args[safe] ?? args[nameMap[safe]] ?? args[httpParamName];
}

/**
 * Formats API errors for better readability
 *
 * Axios errors can be complex and contain lots of technical details.
 * This function extracts the most important information and formats it
 * in a user-friendly way.
 *
 * Error Types:
 * 1. Response errors: Server returned an error status (4xx, 5xx)
 * 2. Network errors: No response received (connection timeout, DNS failure)
 * 3. Request setup errors: Error occurred before sending request
 *
 * @param error - Axios error object
 * @returns Formatted, human-readable error message
 */
export function formatApiError(error: AxiosError): string {
  let message = 'API request failed.';

  if (error.response) {
    // Server responded with an error status
    message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
    const responseData = error.response.data;
    const MAX_LEN = 200;

    if (typeof responseData === 'string') {
      // Truncate long error messages
      message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`;
    }
    else if (responseData) {
      try {
        const jsonString = JSON.stringify(responseData);
        message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`;
      } catch {
        message += 'Response: [Could not serialize data]';
      }
    }
    else {
      message += 'No response body received.';
    }
  } else if (error.request) {
    // Request was made but no response received
    message = 'API Network Error: No response received from server.';
    if (error.code) message += ` (Code: ${error.code})`;
  } else {
    // Error occurred setting up the request
    message += `API Request Setup Error: ${error.message}`;
  }

  return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 *
 * This function is critical for ensuring type safety at runtime:
 *
 * Flow:
 * 1. Take a JSON Schema (from OpenAPI spec)
 * 2. Convert it to Zod schema code (string)
 * 3. Evaluate the code to create actual Zod schema
 * 4. Use that schema to validate incoming arguments
 *
 * Why Zod?
 * - JSON Schema is a specification, not executable code
 * - Zod provides runtime validation with TypeScript integration
 * - Validates that AI-provided arguments match expected types
 * - Provides clear error messages for validation failures
 *
 * Security Note:
 * - Uses eval() which is normally dangerous
 * - Safe here because we control the input (our own OpenAPI spec)
 * - Never use with user-provided code
 *
 * @param jsonSchema - JSON Schema object from OpenAPI specification
 * @param toolName - Name of the tool (for error reporting)
 * @returns Zod schema for runtime validation
 */
export function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
  if (typeof jsonSchema !== 'object' || jsonSchema === null) {
    // Invalid schema, return a permissive schema
    return z.object({}).passthrough();
  }

  try {
    // Convert JSON Schema to Zod schema code
    const zodSchemaString = jsonSchemaToZod(jsonSchema);

    // Evaluate the code to create actual schema
    // This is safe because we control the input
    const zodSchema = eval(zodSchemaString);

    if (typeof zodSchema?.parse !== 'function') {
      throw new Error('Eval did not produce a valid Zod schema.');
    }

    return zodSchema as z.ZodTypeAny;
  } catch (err: any) {
    console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
    // Fall back to permissive schema that accepts anything
    return z.object({}).passthrough();
  }
}
