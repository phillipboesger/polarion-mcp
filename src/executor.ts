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
import axios, { type AxiosRequestConfig } from "axios";
import FormData from "form-data";
import https from 'https';
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { JsonObject, McpToolDefinition } from "./types.js";
import { readArg, formatApiError, getZodSchemaFromJsonSchema } from "./utils.js";
import { API_BASE_URL, getBearerToken, shouldRejectUnauthorized } from "./config.js";
import { refreshPolarionConfig, getSdkDocumentation } from "./polarion.js";
import { acquireOAuth2Token } from "./auth.js";
import { MUTATING_METHODS, sendWithRetry, type SendWithRetryOpts } from "./httpClient.js";
import {
  checkWorkItemsEnumFields,
  checkResourceCustomFieldKeys,
  checkWorkItemUserReferences,
  splitWorkItemId,
  type WorkItemEnumCheckTarget,
  type CustomFieldKeyCheckTarget,
  type EnumGuardResult,
} from "./guards.js";
import { renderRichTextFieldsAsMarkdown } from "./markdown.js";

// Re-exported for backward compatibility -- tests and any external code that
// imported `sendWithRetry` from `executor.js` before it moved to `httpClient.js`.
export { sendWithRetry };

/**
 * Builds the enum-guard targets for a Work Item write tool, or `null` if
 * `definition` isn't one of the (small, explicit) set of tools the guard
 * covers. See `guards.ts` for what's validated and why.
 */
function buildWorkItemEnumTargets(
  definition: McpToolDefinition,
  validatedArgs: JsonObject,
  nameMap: Record<string, string>,
  requestBodyData: any
): WorkItemEnumCheckTarget[] | null {
  const method = definition.method.toLowerCase();
  const dataItems: unknown[] = Array.isArray(requestBodyData?.data)
    ? requestBodyData.data
    : requestBodyData?.data
      ? [requestBodyData.data]
      : [];
  if (dataItems.length === 0) return null;

  // patchWorkItem: single existing item, projectId + workItemId are path params.
  if (method === 'patch' && definition.pathTemplate === '/projects/{projectId}/workitems/{workItemId}') {
    const projectId = readArg(validatedArgs, 'projectId', nameMap);
    const workItemId = readArg(validatedArgs, 'workItemId', nameMap);
    const attributes = (dataItems[0] as any)?.attributes;
    const relationships = (dataItems[0] as any)?.relationships;
    if (typeof projectId !== 'string' || typeof workItemId !== 'string' || !attributes || typeof attributes !== 'object') return null;
    return [{ projectId, workItemId, attributes, relationships }];
  }

  // postWorkItems: bulk create, new items -- no workItemId yet, resolve options by attributes.type.
  if (method === 'post' && definition.pathTemplate === '/projects/{projectId}/workitems') {
    const projectId = readArg(validatedArgs, 'projectId', nameMap);
    if (typeof projectId !== 'string') return null;
    const targets: WorkItemEnumCheckTarget[] = [];
    for (const item of dataItems) {
      const attributes = (item as any)?.attributes;
      const relationships = (item as any)?.relationships;
      const type = attributes?.type;
      if (attributes && typeof attributes === 'object' && typeof type === 'string') {
        targets.push({ projectId, type, attributes, relationships });
      }
    }
    return targets.length > 0 ? targets : null;
  }

  // patchWorkItems (project-scoped) / patchAllWorkItems (global): bulk update of existing
  // items. Each item's `id` is the full "PROJECT/WORKITEMID" composite; fall back to the
  // tool's own `projectId` param (project-scoped variant only) if an id has no '/' in it.
  const isBulkPatch =
    (method === 'patch' && definition.pathTemplate === '/projects/{projectId}/workitems') ||
    (method === 'patch' && definition.pathTemplate === '/all/workitems');
  if (isBulkPatch) {
    const fallbackProjectId = readArg(validatedArgs, 'projectId', nameMap);
    const targets: WorkItemEnumCheckTarget[] = [];
    for (const item of dataItems) {
      const id = (item as any)?.id;
      const attributes = (item as any)?.attributes;
      const relationships = (item as any)?.relationships;
      if (typeof id !== 'string' || !attributes || typeof attributes !== 'object') continue;
      const split = splitWorkItemId(id, typeof fallbackProjectId === 'string' ? fallbackProjectId : undefined);
      if (split) targets.push({ projectId: split.projectId, workItemId: split.workItemId, attributes, relationships });
    }
    return targets.length > 0 ? targets : null;
  }

  return null;
}

/**
 * Runs the Work Item-specific user-reference guard over `targets`, stopping
 * at the first failure. The enum-field guard (`checkWorkItemsEnumFields`) is
 * called directly at the STEP 7a call site instead of through a wrapper.
 * The custom-field-key guard sits BETWEEN these two steps in the actual
 * write flow but is resource-type-generic, not Work-Item-specific, so it's
 * built and run separately via
 * {@link buildCustomFieldKeyTargets}/`checkResourceCustomFieldKeys` -- that
 * split is what lets it also cover Documents, Plans, Collections, Test
 * Runs, and Test Records.
 */
async function runWorkItemUserReferenceGuard(
  targets: WorkItemEnumCheckTarget[],
  requestContext: { baseUrl: string; headers: Record<string, string>; rejectUnauthorized: boolean },
  sendOpts: SendWithRetryOpts | undefined
): Promise<EnumGuardResult> {
  for (const target of targets) {
    const userResult = await checkWorkItemUserReferences(target.relationships, requestContext, sendOpts);
    if (!userResult.ok) return userResult;
  }
  return { ok: true };
}

/** Human-readable resource-type label for custom-field-key guard error messages. */
const CUSTOM_FIELD_RESOURCE_LABELS: Record<string, string> = {
  workitems: 'Work Item',
  documents: 'Document',
  plans: 'Plan',
  collections: 'Collection',
  testruns: 'Test Run',
  testrecords: 'Test Record',
};

/**
 * One entry per custom-field-capable write tool: which resource type it
 * writes, and how to validate its custom field keys.
 * - `create`: bulk create (`data` is always an array for every `post*`
 *   tool here) -- validated project- and type-scoped, per item.
 * - `update-single`: one existing instance -- validated instance-scoped,
 *   using the tool's own already-resolved `urlPath` (no id-parsing needed).
 * - `update-bulk`: many existing instances by composite id in the body --
 *   validated instance-scoped per item, using `bulkInstancePath` to turn
 *   the item's own `"a/b/..."` id into the same instance path shape
 *   `update-single` would have used for that one item. `bulkIdSegments` is
 *   the expected split length; an id that doesn't match sets
 *   `unresolvedReason` on that item's target instead of skipping it, so an
 *   item with a candidate custom field but an unparsable id still fails
 *   closed rather than silently going unchecked.
 */
interface CustomFieldToolSpec {
  method: string;
  pathTemplate: string;
  resourceType: string;
  mode: 'create' | 'update-single' | 'update-bulk';
  /** Whether this resource type has a subtype concept (`attributes.type`, e.g. Work Item/Document/Test Run). False for Plan/Collection/Test Record -- their create lookup omits targetType, and `attributes.type` (if a custom field happened to be named that) is never misread as a subtype. */
  typed: boolean;
  bulkIdSegments?: number;
  bulkInstancePath?: (segments: string[]) => string;
}

const CUSTOM_FIELD_TOOL_SPECS: CustomFieldToolSpec[] = [
  { method: 'post', pathTemplate: '/projects/{projectId}/workitems', resourceType: 'workitems', mode: 'create', typed: true },
  { method: 'patch', pathTemplate: '/projects/{projectId}/workitems/{workItemId}', resourceType: 'workitems', mode: 'update-single', typed: true },
  {
    method: 'patch', pathTemplate: '/projects/{projectId}/workitems', resourceType: 'workitems', mode: 'update-bulk', typed: true, bulkIdSegments: 2,
    bulkInstancePath: (s) => `/projects/${encodeURIComponent(s[0])}/workitems/${encodeURIComponent(s[1])}`,
  },
  {
    method: 'patch', pathTemplate: '/all/workitems', resourceType: 'workitems', mode: 'update-bulk', typed: true, bulkIdSegments: 2,
    bulkInstancePath: (s) => `/projects/${encodeURIComponent(s[0])}/workitems/${encodeURIComponent(s[1])}`,
  },
  { method: 'post', pathTemplate: '/projects/{projectId}/spaces/{spaceId}/documents', resourceType: 'documents', mode: 'create', typed: true },
  { method: 'patch', pathTemplate: '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}', resourceType: 'documents', mode: 'update-single', typed: true },
  { method: 'post', pathTemplate: '/projects/{projectId}/plans', resourceType: 'plans', mode: 'create', typed: false },
  { method: 'patch', pathTemplate: '/projects/{projectId}/plans/{planId}', resourceType: 'plans', mode: 'update-single', typed: false },
  { method: 'post', pathTemplate: '/projects/{projectId}/collections', resourceType: 'collections', mode: 'create', typed: false },
  { method: 'patch', pathTemplate: '/projects/{projectId}/collections/{collectionId}', resourceType: 'collections', mode: 'update-single', typed: false },
  { method: 'post', pathTemplate: '/projects/{projectId}/testruns', resourceType: 'testruns', mode: 'create', typed: true },
  { method: 'patch', pathTemplate: '/projects/{projectId}/testruns/{testRunId}', resourceType: 'testruns', mode: 'update-single', typed: true },
  {
    method: 'patch', pathTemplate: '/projects/{projectId}/testruns', resourceType: 'testruns', mode: 'update-bulk', typed: true, bulkIdSegments: 2,
    bulkInstancePath: (s) => `/projects/${encodeURIComponent(s[0])}/testruns/${encodeURIComponent(s[1])}`,
  },
  { method: 'post', pathTemplate: '/projects/{projectId}/testruns/{testRunId}/testrecords', resourceType: 'testrecords', mode: 'create', typed: false },
  {
    method: 'patch', pathTemplate: '/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}',
    resourceType: 'testrecords', mode: 'update-single', typed: false,
  },
  {
    method: 'patch', pathTemplate: '/projects/{projectId}/testruns/{testRunId}/testrecords', resourceType: 'testrecords', mode: 'update-bulk', typed: false, bulkIdSegments: 5,
    bulkInstancePath: (s) =>
      `/projects/${encodeURIComponent(s[0])}/testruns/${encodeURIComponent(s[1])}/testrecords/${encodeURIComponent(s[2])}/${encodeURIComponent(s[3])}/${encodeURIComponent(s[4])}`,
  },
];

// Exported so a test can assert every entry resolves to a real generated tool
// with a matching method/pathTemplate -- src/tools.ts is regenerated from
// Polarion's OpenAPI spec (npm run regenerate), and a future spec change to
// any of these paths would otherwise silently disable custom-field-key
// protection for that tool with an all-green test suite.
export { CUSTOM_FIELD_TOOL_SPECS };

/**
 * Builds the custom-field-key guard targets for a write tool, or `null` if
 * `definition` isn't one of the tools {@link CUSTOM_FIELD_TOOL_SPECS} covers.
 * `urlPath` is the tool's already-resolved request path (path params
 * substituted, computed earlier in STEP 3) -- reused directly as the
 * instance path for `update-single` tools, so no separate id-parsing is
 * needed for the single-item case.
 */
function buildCustomFieldKeyTargets(
  definition: McpToolDefinition,
  validatedArgs: JsonObject,
  nameMap: Record<string, string>,
  requestBodyData: any,
  urlPath: string
): CustomFieldKeyCheckTarget[] | null {
  const method = definition.method.toLowerCase();
  const spec = CUSTOM_FIELD_TOOL_SPECS.find((s) => s.method === method && s.pathTemplate === definition.pathTemplate);
  if (!spec) return null;

  const dataItems: unknown[] = Array.isArray(requestBodyData?.data)
    ? requestBodyData.data
    : requestBodyData?.data
      ? [requestBodyData.data]
      : [];
  if (dataItems.length === 0) return null;

  const label = CUSTOM_FIELD_RESOURCE_LABELS[spec.resourceType] ?? spec.resourceType;

  if (spec.mode === 'create') {
    const projectId = readArg(validatedArgs, 'projectId', nameMap);
    if (typeof projectId !== 'string') return null;
    const targets: CustomFieldKeyCheckTarget[] = [];
    for (const item of dataItems) {
      const attributes = (item as any)?.attributes;
      if (!attributes || typeof attributes !== 'object') continue;
      const type = spec.typed && typeof attributes.type === 'string' ? attributes.type : undefined;
      targets.push({
        resourceType: spec.resourceType,
        projectId,
        type,
        attributes,
        scopeLabel: type ? `a new '${type}' ${label} in ${projectId}` : `a new ${label} in ${projectId}`,
      });
    }
    return targets.length > 0 ? targets : null;
  }

  if (spec.mode === 'update-single') {
    const attributes = (dataItems[0] as any)?.attributes;
    if (!attributes || typeof attributes !== 'object') return null;
    return [{
      resourceType: spec.resourceType,
      attributes,
      instancePath: urlPath,
      scopeLabel: `${label} '${urlPath}'`,
    }];
  }

  // update-bulk: resolve each item's own instance path from its composite id.
  // Work Items get the same "PROJECT/WORKITEMID (or bare id, falling back to
  // the tool's own projectId)" handling as the enum guard (splitWorkItemId),
  // so the two guards agree on which items are resolvable instead of one
  // silently covering an item the other doesn't. An id that still can't be
  // resolved sets `unresolvedReason` instead of being skipped -- the target
  // is still built (unless attributes itself is unusable), so the guard
  // fails closed rather than silently omitting that item's validation.
  const bulkFallbackProjectId = spec.resourceType === 'workitems' ? readArg(validatedArgs, 'projectId', nameMap) : undefined;
  const targets: CustomFieldKeyCheckTarget[] = [];
  for (const item of dataItems) {
    const id = (item as any)?.id;
    const attributes = (item as any)?.attributes;
    if (typeof id !== 'string' || !attributes || typeof attributes !== 'object') continue;

    let instancePath: string | undefined;
    if (spec.resourceType === 'workitems') {
      const split = splitWorkItemId(id, typeof bulkFallbackProjectId === 'string' ? bulkFallbackProjectId : undefined);
      if (split) instancePath = `/projects/${encodeURIComponent(split.projectId)}/workitems/${encodeURIComponent(split.workItemId)}`;
    } else {
      const segments = id.split('/');
      if (segments.length === spec.bulkIdSegments) instancePath = spec.bulkInstancePath!(segments);
    }

    targets.push({
      resourceType: spec.resourceType,
      attributes,
      instancePath,
      unresolvedReason: instancePath
        ? undefined
        : `Cannot resolve ${label} '${id}' to validate its custom field keys -- unexpected id format. Refusing the write rather than silently skipping validation for this item.`,
      scopeLabel: `${label} '${id}'`,
    });
  }
  return targets.length > 0 ? targets : null;
}

/**
 * Polarion's multipart/form-data endpoints (attachments, icons, avatar,
 * Word/Excel import) each expect a different set of form field names, but the
 * OpenAPI generator collapses them all into a single JSON-string `requestBody`
 * param (see docs/openapi-and-generation.md), documented per-tool in plain
 * English (e.g. "Attachment metadata and file data", "'file' ... and
 * 'parameters'"). This parses that JSON and maps its top-level keys onto real
 * multipart fields using the field names Polarion's spec actually uses (verified
 * against the official OpenAPI spec's per-operation `multipart/form-data` schemas):
 * - "resource"/"parameters": JSON object metadata -> a JSON part.
 * - "files": an array of base64-encoded file contents -> one binary part per entry
 *   (all `post*Attachments`/`postGlobalIcons`/`postProjectIcons` bulk-create tools).
 * - "file"/"content": a single base64-encoded file content -> one binary part
 *   ("file" for `importWordDocument`/`importExcelTestResults`; "content" for every
 *   `patch*Attachment` replace-content tool and `updateAvatar`).
 * - anything else: strings pass through as plain fields, objects/arrays as JSON parts.
 */
function buildMultipartFormData(requestBody: unknown): FormData {
  let parsed: unknown = requestBody;
  if (typeof requestBody === 'string') {
    try {
      parsed = JSON.parse(requestBody);
    } catch {
      throw new Error(
        'requestBody for a multipart/form-data tool must be a JSON string, e.g. ' +
        '\'{"resource":{"data":[{"type":"...","attributes":{"fileName":"..."}}]},"files":["<base64>"]}\''
      );
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('requestBody for a multipart/form-data tool must decode to a JSON object of form field names');
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(parsed as JsonObject)) {
    if (value === undefined || value === null) continue;

    if ((key === 'resource' || key === 'parameters') && typeof value === 'object') {
      form.append(key, JSON.stringify(value), { contentType: 'application/json' });
    } else if (key === 'files' && Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item !== 'string') {
          throw new Error(`requestBody.files[${index}] must be a base64-encoded string, got ${typeof item}`);
        }
        form.append('files', Buffer.from(item, 'base64'), { filename: `file-${index}` });
      });
    } else if ((key === 'file' || key === 'content') && typeof value === 'string') {
      form.append(key, Buffer.from(value, 'base64'), { filename: key });
    } else if (typeof value === 'string') {
      form.append(key, value);
    } else {
      form.append(key, JSON.stringify(value), { contentType: 'application/json' });
    }
  }
  return form;
}

/**
 * Stand-in for the dry_run preview when the real request body is a FormData
 * stream (JSON.stringify on it yields `{}`, hiding everything useful). Mirrors
 * the fields buildMultipartFormData() would send, but replaces base64 file
 * payloads with their decoded byte length so previews stay short and never
 * echo raw binary data back to the caller.
 */
function summarizeMultipartForPreview(requestBody: unknown): unknown {
  let parsed: unknown = requestBody;
  if (typeof requestBody === 'string') {
    try {
      parsed = JSON.parse(requestBody);
    } catch {
      return requestBody;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;

  const summary: JsonObject = {};
  for (const [key, value] of Object.entries(parsed as JsonObject)) {
    if (key === 'files' && Array.isArray(value)) {
      summary[key] = value.map((item) =>
        typeof item === 'string' ? `<binary, ${Buffer.from(item, 'base64').length} bytes>` : item
      );
    } else if ((key === 'file' || key === 'content') && typeof value === 'string') {
      summary[key] = `<binary, ${Buffer.from(value, 'base64').length} bytes>`;
    } else {
      summary[key] = value;
    }
  }
  return summary;
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
 * @param sendOpts - Forwarded to {@link sendWithRetry} (and to the enum guard's own
 *   lookups); production call sites omit this and get the real axios client with
 *   production pacing/retry defaults. Tests use it to inject a fake httpClient and
 *   near-zero pacing/backoff/delays.
 * @returns Formatted API response or error message
 */
export async function executeApiTool(
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: JsonObject,
  allSecuritySchemes: Record<string, any>,
  sendOpts?: SendWithRetryOpts
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
    let dryRunBodyPreview: unknown;
    if (definition.requestBodyContentType && typeof requestBody !== 'undefined') {
      if (definition.requestBodyContentType === 'multipart/form-data') {
        // Build a real multipart body with a boundary instead of sending the raw
        // JSON string with a bare "multipart/form-data" Content-Type (see #5) --
        // Polarion's parser can't make sense of that and rejects it with a
        // content-less 400 before any JSON:API validation runs.
        const form = buildMultipartFormData(requestBody);
        requestBodyData = form;
        Object.assign(headers, form.getHeaders());
        dryRunBodyPreview = summarizeMultipartForPreview(requestBody);
      } else {
        requestBodyData = requestBody;
        headers['content-type'] = definition.requestBodyContentType;
        dryRunBodyPreview = requestBodyData;
      }
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
        body: dryRunBodyPreview,
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

    // ===== STEP 7a: Pre-write guards (fail-closed validation) =====
    // Three independent checks, in this order (first failure blocks the write):
    // 1. Enum fields -- Work Item write tools only (patchWorkItem, postWorkItems,
    //    patchWorkItems, patchAllWorkItems).
    // 2. Custom field keys -- every custom-field-capable resource type's create
    //    AND update tools (Work Items, Documents, Plans, Collections, Test Runs,
    //    Test Records).
    // 3. User references (assignee/votes/watches) -- Work Item write tools only.
    // See guards.ts for exactly what's validated and what's an explicit,
    // documented follow-up (categories, module/linkedRevisions existence).
    const guardRequestContext = { baseUrl: API_BASE_URL, headers, rejectUnauthorized: shouldRejectUnauthorized() };

    const enumTargets = buildWorkItemEnumTargets(definition, validatedArgs, nameMap, requestBodyData);
    if (enumTargets) {
      const enumResult = await checkWorkItemsEnumFields(enumTargets, guardRequestContext, sendOpts);
      if (!enumResult.ok) {
        return { content: [{ type: 'text', text: `Write refused: ${enumResult.reason}` }] };
      }
    }

    const customFieldKeyTargets = buildCustomFieldKeyTargets(definition, validatedArgs, nameMap, requestBodyData, urlPath);
    if (customFieldKeyTargets) {
      for (const target of customFieldKeyTargets) {
        const fieldKeyResult = await checkResourceCustomFieldKeys(target, guardRequestContext, sendOpts);
        if (!fieldKeyResult.ok) {
          return { content: [{ type: 'text', text: `Write refused: ${fieldKeyResult.reason}` }] };
        }
      }
    }

    if (enumTargets) {
      const userResult = await runWorkItemUserReferenceGuard(enumTargets, guardRequestContext, sendOpts);
      if (!userResult.ok) {
        return { content: [{ type: 'text', text: `Write refused: ${userResult.reason}` }] };
      }
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
        // Add a `value_markdown` sibling to every rich-text ({type:"text/html", value})
        // field so the model gets readable Markdown alongside the raw HTML, without
        // losing or altering anything in the original response.
        const renderedData = renderRichTextFieldsAsMarkdown(response.data);
        // Pretty-print JSON with 2-space indentation
        responseText = JSON.stringify(renderedData, null, 2);
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
