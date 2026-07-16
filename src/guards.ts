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
 * 2. **Custom field keys** (`checkWorkItemCustomFieldKeys`) -- any
 *    `attributes` key that isn't a standard Work Item field against
 *    `getProjectFieldsMetadata`. Scoped to `postWorkItems` (create) only --
 *    see that function's doc for why updates aren't covered. The response
 *    shape this reads is **not individually confirmed** (no worked guide
 *    example for this endpoint) -- inferred from the JSON:API `{data:
 *    [{id}]}` convention every other "actions" GET endpoint in this codebase
 *    follows without exception; fails closed (empty result set) rather than
 *    silently passing everything through if that assumption turns out wrong.
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
 * - Custom field *values* (only *keys* are checked) and custom field keys
 *   on update tools (`patchWorkItem` et al.).
 * - Any resource other than Work Items (Documents, Test Runs, Plans, ...).
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
// Custom field key validation (postWorkItems / create only)
// ===========================================================================

/** Attribute keys `openapi-mcp-generator` puts in every Work Item's `attributes` schema -- anything else is a custom field. */
const STANDARD_WORK_ITEM_ATTRIBUTE_KEYS = new Set([
  'type', 'title', 'status', 'severity', 'priority', 'resolution', 'description',
  'dueDate', 'hyperlinks', 'initialEstimate', 'remainingEstimate', 'resolvedOn', 'timeSpent',
]);

interface FieldKeyCacheEntry {
  keys: Set<string>;
  expiresAt: number;
}

// Exported only for tests to reset/inspect between cases; not part of the public guard API.
export const _fieldKeyCache = new Map<string, FieldKeyCacheEntry>();

/**
 * Extracts field ids from a `getFieldsMetadata` response. **Not individually
 * confirmed** against a worked guide example (unlike `getAvailableOptions`)
 * -- inferred from the JSON:API `{data: [{id, ...}]}` convention every other
 * "actions" GET endpoint in this codebase follows without exception. If
 * Polarion's real shape differs, this returns an empty set, which fails
 * closed (see `checkWorkItemCustomFieldKeys`) rather than silently passing
 * everything through.
 */
function extractFieldIds(responseData: unknown): string[] {
  return extractOptionIds(responseData);
}

/**
 * Validates that every non-standard key in `attributes` (i.e. every
 * candidate custom field) is a real field for `type` in `projectId`, per
 * `getProjectFieldsMetadata` (`resourceType=workitems&targetType={type}`).
 * Scoped to Work Item *creation* only (`postWorkItems`) -- an *update*
 * (`patchWorkItem` et al.) doesn't reliably know the item's type without an
 * extra round-trip to fetch it first, which isn't done here; see
 * docs/usage.md for this as an explicit, documented scope boundary.
 *
 * Fail-closed: an unresolvable metadata lookup refuses the write, same as
 * the enum guard.
 */
export async function checkWorkItemCustomFieldKeys(
  projectId: string,
  type: string,
  attributes: Record<string, unknown>,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  const candidateKeys = Object.keys(attributes).filter((k) => !STANDARD_WORK_ITEM_ATTRIBUTE_KEYS.has(k));
  if (candidateKeys.length === 0) return { ok: true };

  const cacheKey = `${requestContext.baseUrl}::${projectId}::fields::workitems::${type}`;
  const cached = _fieldKeyCache.get(cacheKey);
  let fieldIds: Set<string>;

  if (cached && cached.expiresAt > Date.now()) {
    fieldIds = cached.keys;
  } else {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${requestContext.baseUrl}/projects/${encodeURIComponent(projectId)}/actions/getFieldsMetadata`,
      params: { resourceType: 'workitems', targetType: type },
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
            `Cannot verify custom field keys (${candidateKeys.join(', ')}) for a new '${type}' Work Item in ${projectId}: ` +
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
          `Cannot validate custom field keys for a new '${type}' Work Item in ${projectId}: ${detail}. ` +
          `Refusing the write -- an unknown key persists silently, invisible to the UI. ` +
          `Retry once Polarion is reachable.`,
      };
    }
  }

  const unknownKeys = candidateKeys.filter((k) => !fieldIds.has(k));
  if (unknownKeys.length > 0) {
    return {
      ok: false,
      reason:
        `Unknown field key(s) ${unknownKeys.join(', ')} for a new '${type}' Work Item in ${projectId}. ` +
        `Known custom fields: ${[...fieldIds].join(', ') || '(none)'}.`,
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
