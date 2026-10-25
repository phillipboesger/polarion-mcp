export const MAX_AUTO_PAGES = 20;
export const MAX_AUTO_ITEMS = 1000;
export const MAX_AUTO_PAGE_SIZE = 100;

export interface JsonApiPage {
  data?: unknown[];
  included?: unknown[];
  links?: { next?: string | null; [key: string]: unknown };
  meta?: { totalCount?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface PaginationResult<T extends JsonApiPage> {
  response: T;
  pagesFetched: number;
  truncated: boolean;
}

/** Merge JSON:API list pages until the item, page, or server-provided limit is reached. */
export async function paginate<T extends JsonApiPage>(
  initial: T,
  maxItems: number,
  fetchNext: (nextLink: string) => Promise<T>,
  maxPages = MAX_AUTO_PAGES,
  signal?: AbortSignal,
): Promise<PaginationResult<T>> {
  const limit = Math.max(1, Math.min(MAX_AUTO_ITEMS, Math.floor(maxItems)));
  const pageLimit = Math.max(1, Math.min(MAX_AUTO_PAGES, Math.floor(maxPages)));
  const merged: JsonApiPage = { ...initial, data: [...(Array.isArray(initial.data) ? initial.data : [])] };
  if (Array.isArray(initial.included)) merged.included = [...initial.included];
  let next = initial.links?.next ?? undefined;
  let pagesFetched = 1;
  let truncated = false;
  if ((merged.data as unknown[]).length > limit) {
    merged.data = (merged.data as unknown[]).slice(0, limit);
    truncated = true;
  }
  while (next && !truncated) {
    if (signal?.aborted) { truncated = true; break; }
    if ((merged.data as unknown[]).length >= limit || pagesFetched >= pageLimit) {
      truncated = true;
      break;
    }
    const page = await fetchNext(next);
    pagesFetched++;
    const remaining = limit - (merged.data as unknown[]).length;
    const items = Array.isArray(page.data) ? page.data : [];
    (merged.data as unknown[]).push(...items.slice(0, remaining));
    if (Array.isArray(page.included)) {
      if (!Array.isArray(merged.included)) merged.included = [];
      (merged.included as unknown[]).push(...page.included);
    }
    if (page.meta?.totalCount !== undefined && merged.meta?.totalCount === undefined) {
      merged.meta = { ...page.meta, ...merged.meta };
    }
    next = page.links?.next ?? undefined;
    merged.links = { ...merged.links, ...page.links };
    if (items.length > remaining) truncated = true;
  }
  if (next && ((merged.data as unknown[]).length >= limit || pagesFetched >= pageLimit)) truncated = true;
  if (next === undefined) {
    if (merged.links) delete merged.links.next;
  } else if (merged.links) {
    merged.links.next = next;
  }
  if (truncated) merged.truncated = true;
  return { response: merged as T, pagesFetched, truncated };
}

/** Extracts the next page number from an untrusted API link without following its host/path. */
export function pageNumberFromLink(nextLink: string, baseUrl: string, fallback?: number): number | undefined {
  try {
    const url = new URL(nextLink, baseUrl);
    const value = url.searchParams.get('page[number]') ?? url.searchParams.get('page_number');
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}
