/**
 * Fail-closed pre-write validation ("guards").
 *
 * v1 scope: validates the standard Polarion Work Item enum fields
 * (`status`, `severity`, `priority`, `resolution`) on a *single* Work Item
 * update (`patchWorkItem`) against Polarion's own `getAvailableOptions`
 * action before the write is sent -- so a typo'd enum value is rejected
 * locally with a clear message instead of either failing cryptically
 * server-side, or (worse) being silently accepted as an unknown value on
 * field types that don't validate strictly.
 *
 * Deliberately NOT covered (documented, not silently dropped -- see
 * docs/usage.md and the PR this shipped in):
 * - Bulk/create work item writes (`postWorkItems`, `patchWorkItems`,
 *   `patchAllWorkItems`) -- `getAvailableOptions` needs to know the Work
 *   Item's *type* to resolve options for a not-yet-existing item, which
 *   isn't reliably available for bulk payloads without deeper schema work.
 * - Custom fields, categories, or link/relationship targets.
 * - Any resource other than Work Items (Documents, Test Runs, Plans, ...).
 *
 * Fail-closed: if the availability check itself can't be completed (network
 * error, auth failure, unexpected response shape), the write is refused
 * rather than let through -- an unvalidated enum value can persist as a
 * silent "ghost" that's invisible in the UI and never errors again.
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

function cacheKey(baseUrl: string, projectId: string, workItemId: string, field: string): string {
  return `${baseUrl}::${projectId}/${workItemId}::${field}`;
}

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

/**
 * Validates `attributes`' standard enum fields (status/severity/priority/
 * resolution) for an *existing* Work Item against Polarion's
 * `getAvailableOptions` action, with a short-lived in-memory cache per
 * (baseUrl, project, work item, field).
 *
 * Fields not present in `attributes`, or not strings, are skipped (nothing
 * to validate). A field whose lookup fails entirely blocks the write
 * (fail-closed); a field whose lookup succeeds but doesn't contain the
 * given value also blocks the write, listing the valid options.
 */
export async function checkWorkItemEnumFields(
  projectId: string,
  workItemId: string,
  attributes: Record<string, unknown>,
  requestContext: EnumGuardRequestContext,
  sendOpts: SendWithRetryOpts = {},
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
): Promise<EnumGuardResult> {
  for (const field of STANDARD_WORK_ITEM_ENUM_FIELDS) {
    const value = attributes[field];
    if (typeof value !== 'string' || value === '') continue;

    const key = cacheKey(requestContext.baseUrl, projectId, workItemId, field);
    const cached = _optionsCache.get(key);
    let options: Set<string>;

    if (cached && cached.expiresAt > Date.now()) {
      options = cached.options;
    } else {
      const url = `${requestContext.baseUrl}/projects/${encodeURIComponent(projectId)}/workitems/${encodeURIComponent(workItemId)}/fields/${encodeURIComponent(field)}/actions/getAvailableOptions`;
      const config: AxiosRequestConfig = {
        method: 'GET',
        url,
        headers: requestContext.headers,
        httpsAgent: new https.Agent({ rejectUnauthorized: requestContext.rejectUnauthorized }),
      };
      try {
        const response = await sendWithRetry(config, sendOpts);
        options = new Set(extractOptionIds(response.data));
        _optionsCache.set(key, { options, expiresAt: Date.now() + cacheTtlMs });
      } catch (error) {
        const detail = axios.isAxiosError(error) ? formatApiError(error) : error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          reason:
            `Cannot validate '${field}' options for Work Item ${projectId}/${workItemId}: ${detail}. ` +
            `Refusing the write -- an unvalidated enum value can persist as a silent, invisible ghost. ` +
            `Retry once Polarion is reachable, or omit '${field}' from this update.`,
        };
      }
    }

    if (!options.has(value)) {
      const optionList = options.size > 0 ? [...options].join(', ') : '(none returned -- this field may not be a validated enumeration)';
      return {
        ok: false,
        reason: `'${field}' value '${value}' is not a valid option for Work Item ${projectId}/${workItemId}. Valid options: ${optionList}.`,
      };
    }
  }

  return { ok: true };
}
