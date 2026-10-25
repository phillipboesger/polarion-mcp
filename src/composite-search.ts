import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerVirtualTool, type VirtualTool, type VirtualToolContext } from './virtual-tools.js';

const staticFields = new Set([
  'id', 'type', 'title', 'description', 'status', 'resolution', 'severity', 'priority',
  'assignee', 'assignee.id', 'author', 'author.id', 'created', 'updated', 'dueDate',
  'plannedStart', 'plannedEnd', 'resolvedOn', 'outlineNumber', 'initialEstimate', 'remainingEstimate', 'timeSpent',
]);
const fieldCache = new Map<string, { fields: Set<string>; expires: number }>();
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 500;
let cacheClock: () => number = Date.now;
const luceneSpecial = new Set('+-!(){}[]^"~*?:\\/|&');

export function escapeLuceneValue(value: string): string {
  return [...value].map(char => luceneSpecial.has(char) ? `\\${char}` : char).join('');
}

function fieldNames(value: unknown): Set<string> {
  const output = new Set(staticFields);
  const add = (name: unknown) => { if (typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name)) output.add(name); };
  const visit = (entry: unknown, parentKey = '') => {
    if (Array.isArray(entry)) { for (const item of entry) visit(item, parentKey); return; }
    if (!entry || typeof entry !== 'object') return;
    const item = entry as Record<string, unknown>;
    add(typeof item.id === 'string' ? item.id : item.name);
    if (parentKey === 'attributes' || parentKey === 'relationships') for (const key of Object.keys(item)) add(key);
    for (const [key, child] of Object.entries(item)) visit(child, key);
  };
  visit(value);
  return output;
}

function cacheKey(projectId: string, ctx: VirtualToolContext): string {
  return JSON.stringify([ctx.apiBaseUrl, ctx.userScope ?? 'anonymous', projectId]);
}

async function workItemFields(projectId: string | undefined, ctx: VirtualToolContext): Promise<Set<string>> {
  if (!projectId) return new Set(staticFields);
  const key = cacheKey(projectId, ctx);
  const cached = fieldCache.get(key);
  if (cached && cached.expires > cacheClock()) {
    fieldCache.delete(key);
    fieldCache.set(key, cached);
    return cached.fields;
  }
  if (cached) fieldCache.delete(key);
  // The project-level metadata operation is the REST equivalent of the
  // work-item-specific metadata operation (which requires an item ID).
  const result = await ctx.callPolarionTool('getProjectFieldsMetadata', { projectId, resourceType: 'workitems' });
  const metadata = (result.structuredContent as Record<string, unknown> | undefined)?.data;
  if (!result.isError && metadata !== null && typeof metadata === 'object') {
    const fields = fieldNames(metadata);
    fieldCache.set(key, { fields, expires: cacheClock() + CACHE_TTL_MS });
    while (fieldCache.size > CACHE_MAX_ENTRIES) fieldCache.delete(fieldCache.keys().next().value!);
    return fields;
  }
  return new Set(staticFields);
}

export function lintLuceneQuery(query: string, knownFields: ReadonlySet<string> = staticFields): string[] {
  const warnings: string[] = [];
  let quoted = false;
  let escaped = false;
  let parens = 0;
  for (const char of query) {
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === '(') parens++;
    else if (!quoted && char === ')') parens--;
  }
  if (quoted) warnings.push('Unbalanced quotation marks.');
  if (parens !== 0) warnings.push('Unbalanced parentheses.');
  const fields = [...query.matchAll(/(?:^|\s|\()([A-Za-z_][A-Za-z0-9_.-]*):/g)].map(match => match[1]);
  for (const field of fields) if (!knownFields.has(field)) warnings.push(`Unknown field: ${field}`);
  if (/\b(?:AND|OR|NOT)\s*$/i.test(query) || /^\s*(?:AND|OR|NOT)\b/i.test(query) || /\b(?:AND|OR)\s+(?:AND|OR)\b/i.test(query)) {
    warnings.push('Suspicious boolean operator placement.');
  }
  if (/[-+](?:AND|OR|NOT)\b/i.test(query)) warnings.push('Suspicious escaped operator.');
  return [...new Set(warnings)];
}

function textResult(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

function stringArray(value: unknown, name: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${name} must be an array of strings`);
  return value as string[];
}

export function buildWorkItemQuery(args: Record<string, unknown>, knownFields: ReadonlySet<string>): string {
  const clauses: string[] = [];
  const add = (field: string, value: string) => {
    if (!knownFields.has(field)) throw new Error(`Unknown work item field: ${field}`);
    clauses.push(`${field}:"${escapeLuceneValue(value)}"`);
  };
  const addAlternatives = (field: string, values: string[]) => {
    if (values.length === 1) add(field, values[0]);
    else if (values.length > 1) {
      if (!knownFields.has(field)) throw new Error(`Unknown work item field: ${field}`);
      clauses.push(`(${values.map(value => `${field}:"${escapeLuceneValue(value)}"`).join(' OR ')})`);
    }
  };
  addAlternatives('type', stringArray(args.types, 'types'));
  addAlternatives('status', stringArray(args.statuses, 'statuses'));
  if (typeof args.assignee === 'string' && args.assignee) add('assignee.id', args.assignee);
  if (typeof args.text === 'string' && args.text) {
    const escaped = escapeLuceneValue(args.text);
    clauses.push(`(title:"${escaped}" OR description:"${escaped}")`);
  }
  if (Array.isArray(args.filters)) {
    for (const item of args.filters) {
      if (!item || typeof item !== 'object') throw new Error('filters must contain {field, value} objects');
      const filter = item as Record<string, unknown>;
      if (typeof filter.field !== 'string' || typeof filter.value !== 'string') throw new Error('Each filter requires string field and value');
      add(filter.field, filter.value);
    }
  }
  for (const [arg, field] of [['createdAfter', 'created'], ['updatedAfter', 'updated']] as const) {
    if (args[arg] !== undefined) {
      if (typeof args[arg] !== 'string' || Number.isNaN(Date.parse(args[arg] as string))) throw new Error(`${arg} must be a valid date string`);
      clauses.push(`${field}:["${escapeLuceneValue(args[arg] as string)}" TO *]`);
    }
  }
  return clauses.join(' AND ');
}

function pageSize(args: Record<string, unknown>): number | undefined {
  const value = args.page_size ?? args.max_items;
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 1000) throw new Error('page_size and max_items must be integers from 1 to 1000');
  return value as number;
}

const searchTool: VirtualTool = {
  name: 'search_work_items', title: 'Search Work Items',
  description: 'Search work items with structured filters. Values are escaped and quoted into a Lucene query; the result includes that query for reuse.',
  toolset: 'composites', annotations: { readOnlyHint: true },
  inputSchema: { type: 'object', properties: {
    projectId: { type: 'string' }, types: { type: 'array', items: { type: 'string' } }, statuses: { type: 'array', items: { type: 'string' } },
    assignee: { type: 'string' }, text: { type: 'string' }, filters: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, value: { type: 'string' } }, required: ['field', 'value'], additionalProperties: false } },
    createdAfter: { type: 'string' }, updatedAfter: { type: 'string' }, sort: { type: 'string' }, page_size: { type: 'integer', minimum: 1, maximum: 1000 }, max_items: { type: 'integer', minimum: 1, maximum: 1000 },
  } },
  async handler(args, ctx) {
    const fields = await workItemFields(typeof args.projectId === 'string' ? args.projectId : undefined, ctx);
    const query = buildWorkItemQuery(args, fields);
    let sort: string | undefined;
    if (typeof args.sort === 'string') {
      const desc = args.sort.startsWith('-');
      const name = desc ? args.sort.slice(1) : args.sort;
      if (!fields.has(name)) throw new Error(`Unknown sort field: ${name}`);
      sort = `${desc ? '-' : ''}${name}`;
    }
    const limit = pageSize(args);
    const toolName = typeof args.projectId === 'string' ? 'getWorkItems' : 'getAllWorkItems';
    const callArgs: Record<string, unknown> = {
      ...(query ? { query } : {}),
      ...(args.fields && typeof args.fields === 'object' ? { fields: args.fields } : { fields: { workitems: 'type,title,status,created,updated' } }),
      ...(sort ? { sort } : {}), ...(limit ? { page_size_: limit } : {}), ...(args.max_items ? { max_items: args.max_items } : {}),
    };
    if (typeof args.projectId === 'string') callArgs.projectId = args.projectId;
    const result = await ctx.callPolarionTool(toolName, callArgs);
    if (result.isError) return result;
    const source = result.structuredContent as Record<string, unknown> | undefined;
    const data = source?.data;
    const items = Array.isArray(data) ? data.map(item => {
      if (!item || typeof item !== 'object') return item;
      const resource = item as Record<string, unknown>;
      const attrs = resource.attributes && typeof resource.attributes === 'object' ? resource.attributes as Record<string, unknown> : {};
      const concise: Record<string, unknown> = { id: resource.id };
      for (const key of ['type', 'title', 'status', 'created', 'updated']) if (attrs[key] !== undefined) concise[key] = attrs[key];
      if (resource.type !== undefined) concise.resourceType = resource.type;
      return concise;
    }) : result.content;
    return textResult({ query, results: items,
      ...(source?.links !== undefined ? { links: source.links } : {}),
      ...(source?.meta && typeof source.meta === 'object' && (source.meta as Record<string, unknown>).totalCount !== undefined
        ? { totalCount: (source.meta as Record<string, unknown>).totalCount } : {}),
      ...(source?.truncated === true ? { truncated: true } : {}),
    });
  },
};

const lintTool: VirtualTool = {
  name: 'lint_query', title: 'Lint Lucene Query',
  description: 'Check a Lucene query for unknown work-item fields, unbalanced quotes or parentheses, and suspicious boolean operators. This tool never executes the query.',
  toolset: 'composites', annotations: { readOnlyHint: true },
  inputSchema: { type: 'object', properties: { query: { type: 'string' }, projectId: { type: 'string' } }, required: ['query'], additionalProperties: false },
  async handler(args, ctx) {
    if (typeof args.query !== 'string') throw new Error('query must be a string');
    const fields = await workItemFields(typeof args.projectId === 'string' ? args.projectId : undefined, ctx);
    return textResult({ query: args.query, warnings: lintLuceneQuery(args.query, fields), executed: false });
  },
};

type EntityRef = { type: 'workitem' | 'document' | 'page' | 'testrun' | 'plan'; projectId: string; id: string; spaceId?: string };
const safePart = '[^/?#&]+';
const routes: Array<{ regex: RegExp; type: EntityRef['type']; id: (m: RegExpExecArray, url: URL) => string; space?: (m: RegExpExecArray) => string }> = [
  { regex: new RegExp(`/workitem\\?id=(${safePart})`, 'i'), type: 'workitem', id: m => m[1] },
  { regex: new RegExp(`/workitem/(${safePart})`, 'i'), type: 'workitem', id: m => m[1] },
  { regex: /\/document\?doc=([^?#&]+)/i, type: 'document', id: m => m[1] },
  { regex: new RegExp(`/document\\?id=(${safePart})`, 'i'), type: 'document', id: m => m[1] },
  { regex: new RegExp(`/document/(${safePart})`, 'i'), type: 'document', id: m => m[1] },
  { regex: new RegExp(`/(?:testrun|testRun)\\?id=(${safePart})`, 'i'), type: 'testrun', id: m => m[1] },
  { regex: new RegExp(`/testruns?/(${safePart})`, 'i'), type: 'testrun', id: m => m[1] },
  { regex: new RegExp(`/plan\\?id=(${safePart})`, 'i'), type: 'plan', id: m => m[1] },
  { regex: new RegExp(`/plans?/(${safePart})`, 'i'), type: 'plan', id: m => m[1] },
  { regex: new RegExp(`/wiki/(${safePart})/(${safePart})`, 'i'), type: 'page', id: m => m[2], space: m => m[1] },
  { regex: new RegExp(`/pages?/(${safePart})`, 'i'), type: 'page', id: m => m[1] },
];

export function parsePolarionUrl(input: string, apiBaseUrl: string): EntityRef {
  let base: URL;
  let url: URL;
  try { base = new URL(apiBaseUrl); url = new URL(input); } catch { throw new Error('Malformed Polarion URL or API base URL'); }
  if (url.origin !== base.origin) throw new Error('URL host does not match the configured Polarion API host');
  const path = url.pathname;
  const routeText = `${path}${url.hash}${url.search}`;
  const projectMatch = /(?:^|\/)project\/([^/?#]+)/i.exec(routeText) ?? /\/projects\/([^/?#]+)/i.exec(routeText);
  if (!projectMatch) throw new Error('Polarion URL does not include a project');
  for (const route of routes) {
    const match = route.regex.exec(routeText);
    if (!match) continue;
    const rawId = route.id(match, url);
    let id: string;
    let spaceId = route.space ? decodePolarionIdentifier(route.space(match)) : route.type === 'document' && url.searchParams.has('space') ? validateDecodedPolarionIdentifier(url.searchParams.get('space')!) : undefined;
    if (route.type === 'document' && rawId.includes('/')) {
      const parts = rawId.split('/');
      if (parts.length !== 2 || parts.some(part => !part)) throw new Error('Malformed document URL identifier');
      [spaceId, id] = parts.map(part => decodePolarionIdentifier(part));
    } else if (route.type === 'document') {
      let decoded: string;
      try { decoded = decodeURIComponent(rawId); } catch { throw new Error('Malformed Polarion entity ID'); }
      if (decoded.includes('/')) {
        const parts = decoded.split('/');
        if (parts.length !== 2 || parts.some(part => !part)) throw new Error('Malformed document URL identifier');
        [spaceId, id] = parts.map(part => validateDecodedPolarionIdentifier(part));
      } else id = validateDecodedPolarionIdentifier(decoded);
    } else id = decodePolarionIdentifier(rawId, route.type === 'workitem');
    if (route.type === 'document' && id.includes('/')) {
      const parts = id.split('/');
      if (parts.length !== 2 || parts.some(part => !part)) throw new Error('Malformed document URL identifier');
      [spaceId, id] = parts.map(part => decodePolarionIdentifier(part));
    }
    if (!id) throw new Error('Malformed Polarion entity ID');
    return { type: route.type, projectId: decodePolarionIdentifier(projectMatch[1]), id, ...(spaceId ? { spaceId } : {}) };
  }
  throw new Error('Unsupported or malformed Polarion entity URL');
}

/** Decode a Polarion URL segment exactly once and reject path traversal or separators. */
export function decodePolarionIdentifier(value: string, allowProjectWorkItemId = false): string {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error('Malformed Polarion entity ID'); }
  return validateDecodedPolarionIdentifier(decoded, allowProjectWorkItemId);
}

function validateDecodedPolarionIdentifier(decoded: string, allowProjectWorkItemId = false): string {
  const parts = decoded.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))
    || (parts.length > 1 && !(allowProjectWorkItemId && parts.length === 2))) throw new Error('Malformed Polarion entity ID');
  return decoded;
}

const resolveTool: VirtualTool = {
  name: 'resolve_polarion_url', title: 'Resolve Polarion URL',
  description: 'Resolve a same-host Polarion work item, document, page, test run, or plan URL to its entity identifiers. Set fetch to retrieve the entity.',
  toolset: 'composites', annotations: { readOnlyHint: true },
  inputSchema: { type: 'object', properties: { url: { type: 'string' }, fetch: { type: 'boolean' } }, required: ['url'], additionalProperties: false },
  async handler(args, ctx) {
    if (typeof args.url !== 'string') throw new Error('url must be a string');
    const entity = parsePolarionUrl(args.url, ctx.apiBaseUrl);
    if (args.fetch !== true) return textResult(entity);
    const calls: Record<EntityRef['type'], { name: string; args: Record<string, unknown> }> = {
      workitem: { name: 'getWorkItem', args: { projectId: entity.projectId, workItemId: entity.id } },
      document: { name: 'getDocument', args: { projectId: entity.projectId, spaceId: entity.spaceId ?? '_default', documentName: entity.id } },
      page: { name: 'getPage', args: { projectId: entity.projectId, spaceId: entity.spaceId ?? '_default', pageName: entity.id } },
      testrun: { name: 'getTestRun', args: { projectId: entity.projectId, testRunId: entity.id } },
      plan: { name: 'getPlan', args: { projectId: entity.projectId, planId: entity.id } },
    };
    const call = calls[entity.type];
    const result = await ctx.callPolarionTool(call.name, call.args);
    return result.isError ? result : textResult({ ...entity, entity: result.structuredContent ?? result.content });
  },
};

let unregister: (() => void)[] = [];
export function registerCompositeTools(): void {
  if (unregister.length) return;
  unregister = [searchTool, lintTool, resolveTool].map(tool => registerVirtualTool(tool));
}
export function clearCompositeToolsForTests(): void { unregister.splice(0).forEach(remove => remove()); fieldCache.clear(); cacheClock = Date.now; }

/** Isolated clock seam for cache expiry tests. */
export function setCompositeSearchClockForTests(clock: () => number): void { cacheClock = clock; }

export const compositeTools = [searchTool, lintTool, resolveTool] as const;
