/**
 * Fail-closed pre-write validation ("guards").
 *
 * Validates the standard Polarion Work Item enum fields (`status`,
 * `severity`, `priority`, `resolution`) against Polarion's own
 * `getAvailableOptions` action before a write is sent -- so a typo'd enum
 * value is rejected locally with a clear message instead of either failing
 * cryptically server-side, or (worse) being silently accepted as an unknown
 * value on field types that don't validate strictly.
 *
 * Two lookup modes, matching the two ways `getAvailableOptions` can be
 * scoped (confirmed against the REST API User Guide's worked examples):
 * - **Instance-scoped**: an existing Work Item (`patchWorkItem`,
 *   `patchWorkItems`, `patchAllWorkItems`) -- options are resolved for that
 *   specific item via `/workitems/{workItemId}/fields/{field}/actions/getAvailableOptions`.
 * - **Type-scoped**: a not-yet-existing Work Item being created
 *   (`postWorkItems`) -- options are resolved for the given `type` via
 *   `/workitems/fields/{field}/actions/getAvailableOptions?type={type}`,
 *   since there's no instance yet to scope by.
 *
 * Deliberately NOT covered (documented, not silently dropped -- see
 * docs/usage.md):
 * - Custom fields, categories, or link/relationship targets.
 * - Any resource other than Work Items (Documents, Test Runs, Plans, ...).
 *
 * Fail-closed: if the availability check itself can't be completed (network
 * error, auth failure, unexpected response shape), the write is refused
 * rather than let through -- an unvalidated enum value can persist as a
 * silent "ghost" that's invisible in the UI and never errors again. For a
 * bulk write, the *first* target that fails validation blocks the entire
 * batch (Polarion's bulk endpoints are all-or-nothing per request anyway).
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
