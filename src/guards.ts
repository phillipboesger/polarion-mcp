/**
 * Fail-closed pre-write validation ("guards") for Work Item writes.
 *
 * Three independent checks, run in sequence by `executor.ts` (first failure
 * blocks the write, remaining checks are skipped):
 *
 * 1. **Enum fields** (`checkWorkItemEnumFields`/`checkWorkItemsEnumFields`) --
 *    `status`/`severity`/`priority`/`resolution` against Polarion's
 *    `getAvailableOptions` action. Two lookup modes, confirmed against the
 *    REST API User Guide's worked examples: instance-scoped for existing
 *    items (`patchWorkItem`, `patchWorkItems`, `patchAllWorkItems`), or
 *    type-scoped for not-yet-existing items (`postWorkItems`).
 * 2. **Custom field keys** (`checkResourceCustomFieldKeys`) -- any
 *    `attributes` key that isn't a standard field against Polarion's
 *    `getFieldsMetadata` action. Covers every custom-field-capable resource
 *    type (Work Items, Documents, Plans, Collections, Test Runs, Test
 *    Records), on BOTH create and update: create uses the project- and
 *    type-scoped lookup (`getProjectFieldsMetadata`); update uses the
 *    instance-scoped lookup (`getFieldsMetadataFor<Type>`, e.g.
 *    `getFieldsMetadataForWorkItem`) against the item's own resolved path,
 *    which needs no type at all -- this is what makes update coverage
 *    possible without first fetching the item to learn its type. The
 *    response shape is confirmed live against a stock Polarion 2606
 *    instance: a single object keyed by field id (`{data: {attributes:
 *    {fieldId: {...}}}}`), NOT the `{data: [{id, ...}]}` JSON:API list
 *    shape `getAvailableOptions` uses -- Polarion's own "actions" endpoints
 *    don't share one response convention. Fails closed (empty result set)
 *    if a lookup can't be completed at all, rather than silently passing
 *    everything through.
 * 3. **User references** (`checkWorkItemUserReferences`) -- every user id
 *    in `relationships.assignee`/`votes`/`watches` against `getUser`,
 *    across all 4 covered write tools.
 *
 * Deliberately NOT covered (documented, not silently dropped -- see
 * docs/usage.md):
 * - `categories` -- Polarion exposes no standalone `categories` resource
 *   endpoint to check existence against (confirmed absent from the
 *   generated tool set); would need a different, unconfirmed mechanism.
 * - `module` (the owning Document) and `linkedRevisions` -- existence is
 *   checkable in principle (`getDocument`/`getRevision` both exist), but
 *   their JSON:API ids need extra parsing this pass didn't build out.
 * - Custom field *values* (only *keys* are checked).
 *
 * Fail-closed: if a check itself can't be completed (network error, auth
 * failure, unexpected response shape), the write is refused rather than
 * let through. For a bulk write, the *first* target that fails validation
 * blocks the entire batch (Polarion's bulk endpoints are all-or-nothing per
 * request anyway).
 */

import axios, { type AxiosRequestConfig } from 'axios';
import https from 'https';
import { sendWithRetry, type SendWithRetryOpts } from './httpClient.js';
import { formatApiError } from './utils.js';

const STANDARD_WORK_ITEM_ENUM_FIELDS = ['status', 'severity', 'priority', 'resolution'] as const;

/** How long a field's valid-options list is trusted before re-fetching. */
const DEFAULT_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  options: Set<string>;
  expiresAt: number;
}

// Exported only for tests to reset/inspect between cases; not part of the public guard API.
export const _optionsCache = new Map<string, CacheEntry>();

/**
 * Extracts option ids from a `getAvailableOptions`/`getCurrentOptions`
 * response body: `{data: [{id, ...}, ...]}` (confirmed shape per the REST
 * API User Guide's enumeration examples).
 */
function extractOptionIds(responseData: unknown): string[] {
  if (!responseData || typeof responseData !== 'object') return [];
  const data = (responseData as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => (entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string');
}

export interface EnumGuardRequestContext {
  baseUrl: string;
  headers: Record<string, string>;
  rejectUnauthorized: boolean;
}

export type EnumGuardResult = { ok: true } | { ok: false; reason: string };

/** One Work Item to validate: either an existing item (`workItemId` set) or a new one (`type` set). */
export interface WorkItemEnumCheckTarget {
  projectId: string;
  /** Set for an existing item -- resolves options via the instance-scoped endpoint. */
  workItemId?: string;
  /** Set for a not-yet-existing item -- resolves options via the type-scoped endpoint. */
  type?: string;
  attributes: Record<string, unknown>;
  /** JSON:API relationships object, if the write includes one -- consumed by checkWorkItemUserReferences. */
  relationships?: Record<string, unknown>;
}

async function fetchOptions(
  target: WorkItemEnumCheckTarget,
  field: string,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts,
  cacheTtlMs: number
): Promise<{ options: Set<string> } | { error: string }> {
  const scope = target.workItemId ? `${target.projectId}/${target.workItemId}` : `${target.projectId}::type=${target.type}`;
  const cacheKey = `${requestContext.baseUrl}::${scope}::${field}`;
  const cached = _optionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { options: cached.options };
  }

  const config: AxiosRequestConfig = target.workItemId
    ? {
        method: 'GET',
        url: `${requestContext.baseUrl}/projects/${encodeURIComponent(target.projectId)}/workitems/${encodeURIComponent(target.workItemId)}/fields/${encodeURIComponent(field)}/actions/getAvailableOptions`,
        headers: requestContext.headers,
        httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
      }
    : {
        method: 'GET',
        url: `${requestContext.baseUrl}/projects/${encodeURIComponent(target.projectId)}/workitems/fields/${encodeURIComponent(field)}/actions/getAvailableOptions`,
        params: { type: target.type },
        headers: requestContext.headers,
        httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
      };

  try {
    const response = await sendWithRetry(config, sendOpts);
    const options = new Set(extractOptionIds(response.data));
    _optionsCache.set(cacheKey, { options, expiresAt: Date.now() + cacheTtlMs });
    return { options };
  } catch (error) {
    const detail = axios.isAxiosError(error) ? formatApiError(error) : error instanceof Error ? error.message : String(error);
    return { error: detail };
  }
}

async function checkOneTarget(
  target: WorkItemEnumCheckTarget,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts,
  cacheTtlMs: number
): Promise<EnumGuardResult> {
  const scopeLabel = target.workItemId ? `Work Item ${target.projectId}/${target.workItemId}` : `a new '${target.type}' Work Item in ${target.projectId}`;

  for (const field of STANDARD_WORK_ITEM_ENUM_FIELDS) {
    const value = target.attributes[field];
    if (typeof value !== 'string' || value === '') continue;

    const result = await fetchOptions(target, field, requestContext, sendOpts, cacheTtlMs);
    if ('error' in result) {
      return {
        ok: false,
        reason:
          `Cannot validate '${field}' options for ${scopeLabel}: ${result.error}. ` +
          `Refusing the write -- an unvalidated enum value can persist as a silent, invisible ghost. ` +
          `Retry once Polarion is reachable, or omit '${field}' from this write.`,
      };
    }

    if (!result.options.has(value)) {
      const optionList = result.options.size > 0 ? [...result.options].join(', ') : '(none returned -- this field may not be a validated enumeration)';
      return {
        ok: false,
        reason: `'${field}' value '${value}' is not a valid option for ${scopeLabel}. Valid options: ${optionList}.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Validates a single existing Work Item's enum attributes (`patchWorkItem`).
 * Thin wrapper over {@link checkWorkItemsEnumFields} for the common single-item case.
 */
export async function checkWorkItemEnumFields(
  projectId: string,
  workItemId: string,
  attributes: Record<string, unknown>,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  return checkWorkItemsEnumFields([{ projectId, workItemId, attributes }], requestContext, sendOpts, cacheTtlMs);
}

/**
 * Validates enum attributes across one or more Work Item targets (bulk
 * create/update). Stops and returns the first failing target's reason --
 * Polarion's bulk endpoints are all-or-nothing per request, so there's no
 * value in continuing to validate the rest once one target is refused.
 */
export async function checkWorkItemsEnumFields(
  targets: WorkItemEnumCheckTarget[],
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  for (const target of targets) {
    const result = await checkOneTarget(target, requestContext, sendOpts, cacheTtlMs);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ===========================================================================
// Custom field key validation (all custom-field-capable resource types,
// create AND update)
// ===========================================================================

/**
 * Attribute keys `openapi-mcp-generator` puts in every generated tool schema
 * for a resource type (union of its create + update tool schemas) -- any
 * other `attributes` key is a candidate custom field. Extracted
 * programmatically from `src/tools.ts`'s generated `inputSchema`s
 * (2026-09-04), not hand-maintained by eye.
 */
const STANDARD_ATTRIBUTE_KEYS: Record<string, Set<string>> = {
  workitems: new Set([
    'type', 'title', 'status', 'severity', 'priority', 'resolution', 'description',
    'dueDate', 'hyperlinks', 'initialEstimate', 'remainingEstimate', 'resolvedOn', 'timeSpent',
  ]),
  documents: new Set([
    'autoSuspect', 'homePageContent', 'moduleName', 'outlineNumbering', 'renderingLayouts',
    'status', 'structureLinkRole', 'title', 'type', 'usesOutlineNumbering',
  ]),
  plans: new Set([
    'allowedTypes', 'calculationType', 'capacity', 'color', 'defaultEstimate', 'description',
    'dueDate', 'estimationField', 'finishedOn', 'homePageContent', 'id', 'isTemplate', 'name',
    'previousTimeSpent', 'prioritizationField', 'sortOrder', 'startDate', 'startedOn', 'status',
    'useReportFromTemplate',
  ]),
  collections: new Set(['description', 'id', 'name']),
  testruns: new Set([
    'finishedOn', 'groupId', 'homePageContent', 'id', 'idPrefix', 'isTemplate', 'keepInHistory',
    'query', 'selectTestCasesBy', 'status', 'title', 'type', 'useReportFromTemplate',
  ]),
  testrecords: new Set(['comment', 'duration', 'executed', 'result', 'testCaseRevision']),
};

interface FieldKeyCacheEntry {
  keys: Set<string>;
  expiresAt: number;
}

// Exported only for tests to reset/inspect between cases; not part of the public guard API.
export const _fieldKeyCache = new Map<string, FieldKeyCacheEntry>();

/**
 * Extracts field ids from a `getFieldsMetadata` response. Confirmed live
 * against a stock Polarion 2606 instance: unlike `getAvailableOptions`
 * (`{data: [{id, ...}]}`, a JSON:API list), `getFieldsMetadata` returns a
 * single object whose `attributes` is a map keyed by field id --
 * `{data: {attributes: {title: {...}, myCustomField: {...}, ...}}}`. Field
 * ids are the map's own keys, not an `id` property on each entry.
 *
 * Was previously delegating to `extractOptionIds` (list shape) -- always
 * returned `[]` for this object shape, failing closed on every custom field.
 */
function extractFieldIds(responseData: unknown): string[] {
  if (!responseData || typeof responseData !== 'object') return [];
  const data = (responseData as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const attributes = (data as { attributes?: unknown }).attributes;
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return [];
  return Object.keys(attributes);
}

/**
 * One resource instance (update) or prospective instance (create) to
 * validate custom field keys for. Exactly one of `instancePath` (update) or
 * `projectId` (create) must be set -- see {@link checkResourceCustomFieldKeys}.
 */
export interface CustomFieldKeyCheckTarget {
  /** Polarion's own `resourceType` id for `getFieldsMetadata` -- a key of {@link STANDARD_ATTRIBUTE_KEYS}. */
  resourceType: string;
  attributes: Record<string, unknown>;
  /** Human-readable label for error messages, e.g. "Document 'p/_default/MyDoc'" or "a new 'task' Work Item in p". */
  scopeLabel: string;
  /** Create only: the target project. Resolves fields via the project- and type-scoped lookup. */
  projectId?: string;
  /** Create only: the item's subtype, if its resource type has one (Work Item/Document/Test Run). Omit for a typeless resource (Plan/Collection/Test Record) -- the lookup then covers the type-less field set. */
  type?: string;
  /** Update only: the already-resolved REST path to the existing instance (e.g. `/projects/p/workitems/WI-1`). Resolves fields via the instance-scoped lookup, so an update never needs to learn the item's type first. */
  instancePath?: string;
  /**
   * Set instead of `instancePath`/`projectId` when the target's identity
   * couldn't be resolved at all (e.g. a bulk-update item whose composite
   * `id` doesn't match the expected format) -- refuses the write
   * immediately with this reason, without attempting a lookup, rather than
   * silently skipping validation for that item.
   */
  unresolvedReason?: string;
}

/**
 * Validates that every non-standard key in a target's `attributes` (i.e.
 * every candidate custom field) is a real field for that resource, per
 * Polarion's `getFieldsMetadata` action -- project- and type-scoped for a
 * create (`target.projectId`/`target.type`), instance-scoped for an update
 * (`target.instancePath`). The instance-scoped lookup only needs the
 * item's own id, not its type, which is what lets update coverage exist at
 * all without an extra "fetch the item first to learn its type" round-trip.
 *
 * Fail-closed: an unresolvable metadata lookup refuses the write, same as
 * the enum guard.
 */
export async function checkResourceCustomFieldKeys(
  target: CustomFieldKeyCheckTarget,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  const standardKeys = STANDARD_ATTRIBUTE_KEYS[target.resourceType];
  if (!standardKeys) {
    // Only reachable if a caller passes a resourceType outside the fixed,
    // internally-controlled set in STANDARD_ATTRIBUTE_KEYS -- fail loud
    // rather than silently treating every attribute as a candidate custom
    // field (or worse, none).
    return { ok: false, reason: `Internal error: unknown resourceType '${target.resourceType}' for ${target.scopeLabel}.` };
  }
  const candidateKeys = Object.keys(target.attributes).filter((k) => !standardKeys.has(k));
  if (candidateKeys.length === 0) return { ok: true };

  if (target.unresolvedReason) {
    return { ok: false, reason: target.unresolvedReason };
  }

  const cacheKey = target.instancePath
    ? `${requestContext.baseUrl}::instance::${target.instancePath}`
    : `${requestContext.baseUrl}::${target.projectId}::fields::${target.resourceType}::${target.type ?? '~'}`;
  const cached = _fieldKeyCache.get(cacheKey);
  let fieldIds: Set<string>;

  if (cached && cached.expiresAt > Date.now()) {
    fieldIds = cached.keys;
  } else {
    const config: AxiosRequestConfig = target.instancePath
      ? {
          method: 'GET',
          url: `${requestContext.baseUrl}${target.instancePath}/actions/getFieldsMetadata`,
          headers: requestContext.headers,
          httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
        }
      : {
          method: 'GET',
          url: `${requestContext.baseUrl}/projects/${encodeURIComponent(target.projectId!)}/actions/getFieldsMetadata`,
          params: { resourceType: target.resourceType, targetType: target.type ?? '~' },
          headers: requestContext.headers,
          httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
        };
    try {
      const response = await sendWithRetry(config, sendOpts);
      fieldIds = new Set(extractFieldIds(response.data));
      if (fieldIds.size === 0) {
        return {
          ok: false,
          reason:
            `Cannot verify custom field keys (${candidateKeys.join(', ')}) for ${target.scopeLabel}: ` +
            `the field metadata lookup returned no fields. Refusing the write -- an unknown key persists silently, ` +
            `invisible to the UI. Ask the user to confirm these field ids exist for this type.`,
        };
      }
      _fieldKeyCache.set(cacheKey, { keys: fieldIds, expiresAt: Date.now() + cacheTtlMs });
    } catch (error) {
      const detail = axios.isAxiosError(error) ? formatApiError(error) : error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        reason:
          `Cannot validate custom field keys for ${target.scopeLabel}: ${detail}. ` +
          `Refusing the write -- an unknown key persists silently, invisible to the UI. ` +
          `Retry once Polarion is reachable.`,
      };
    }
  }

  const unknownKeys = candidateKeys.filter((k) => !fieldIds.has(k));
  if (unknownKeys.length > 0) {
    // fieldIds includes every field getFieldsMetadata returns -- OOTB fields
    // (title, status, ...) as well as custom ones -- so filter back down to
    // non-standard keys before presenting them as "custom fields".
    const knownCustomFields = [...fieldIds].filter((k) => !standardKeys.has(k));
    return {
      ok: false,
      reason:
        `Unknown field key(s) ${unknownKeys.join(', ')} for ${target.scopeLabel}. ` +
        `Known custom fields: ${knownCustomFields.join(', ') || '(none)'}.`,
    };
  }

  return { ok: true };
}

// ===========================================================================
// Relationship target existence checks (assignee / votes / watches -> users)
// ===========================================================================

interface UserExistsCacheEntry {
  exists: boolean;
  expiresAt: number;
}

// Exported only for tests to reset/inspect between cases; not part of the public guard API.
export const _userExistsCache = new Map<string, UserExistsCacheEntry>();

/** Pulls `{type:"users", id}` ids out of a JSON:API relationship's `data` (single object or array). */
function extractUserIds(relationshipData: unknown): string[] {
  const entries = Array.isArray(relationshipData) ? relationshipData : relationshipData ? [relationshipData] : [];
  return entries
    .map((e) => (e && typeof e === 'object' ? (e as { id?: unknown; type?: unknown }) : null))
    .filter((e): e is { id: string; type: string } => !!e && e.type === 'users' && typeof e.id === 'string')
    .map((e) => e.id);
}

/**
 * Validates that every user referenced in `relationships.assignee`/`votes`/
 * `watches` (confirmed relationship names per the generated Work Item
 * schema) actually exists, via `getUser`. Distinguishes a confirmed-missing
 * user (404 -> a real, specific rejection) from an unresolvable lookup
 * (network/auth error -> fail-closed, same reasoning as the other guards).
 * Existence is cached (positives only -- a user that doesn't exist yet
 * might be created later, so a miss is never cached as a permanent no).
 */
export async function checkWorkItemUserReferences(
  relationships: Record<string, unknown> | undefined,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  if (!relationships) return { ok: true };

  const userIds = new Set<string>();
  for (const key of ['assignee', 'votes', 'watches']) {
    const rel = (relationships as Record<string, unknown>)[key] as { data?: unknown } | undefined;
    if (rel?.data) for (const id of extractUserIds(rel.data)) userIds.add(id);
  }
  if (userIds.size === 0) return { ok: true };

  for (const userId of userIds) {
    const cacheKey = `${requestContext.baseUrl}::${userId}`;
    const cached = _userExistsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (!cached.exists) return { ok: false, reason: `User '${userId}' does not exist.` };
      continue;
    }

    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${requestContext.baseUrl}/users/${encodeURIComponent(userId)}`,
      headers: requestContext.headers,
      httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
    };
    try {
      await sendWithRetry(config, sendOpts);
      _userExistsCache.set(cacheKey, { exists: true, expiresAt: Date.now() + cacheTtlMs });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        _userExistsCache.set(cacheKey, { exists: false, expiresAt: Date.now() + cacheTtlMs });
        return { ok: false, reason: `User '${userId}' does not exist. Refusing the write.` };
      }
      const detail = axios.isAxiosError(error) ? formatApiError(error) : error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        reason: `Cannot confirm User '${userId}' exists: ${detail}. Refusing the write -- an unresolvable reference persists silently. Retry once Polarion is reachable.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Splits a JSON:API Work Item id into its project and work-item parts.
 * Bulk endpoints (`patchWorkItems`, `patchAllWorkItems`, `deleteWorkItems`)
 * use the full composite form (`"PROJECT/WORKITEMID"`, confirmed via the
 * REST API guide's PATCH examples) even when a `projectId` path/body param
 * is also present. Falls back to `fallbackProjectId` + the raw id when no
 * `/` separator is present (defensive; not expected in practice).
 */
export function splitWorkItemId(id: string, fallbackProjectId?: string): { projectId: string; workItemId: string } | null {
  const slash = id.indexOf('/');
  if (slash > 0 && slash < id.length - 1) {
    return { projectId: id.slice(0, slash), workItemId: id.slice(slash + 1) };
  }
  if (fallbackProjectId) {
    return { projectId: fallbackProjectId, workItemId: id };
  }
  return null;
}
