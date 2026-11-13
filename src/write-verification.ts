/**
 * Read-back verification of successful Polarion writes.
 *
 * A write that Polarion accepted must never turn into an error just because the
 * stored value looks different: Polarion normalizes rich text, recomputes
 * workflow and revision fields and trims whitespace. Only a plain value that
 * is clearly absent or different on read-back (typically a custom field that
 * was silently dropped) is a hard mismatch. Everything ambiguous is
 * `uncertain`, a warning that keeps the result successful.
 */

import { parseUploadMaxBytes } from './utils.js';

export const DEFAULT_VERIFY_MAX_ITEMS = 10;

/** Limits applied to writes; read once at startup and injected, never read from the environment per call. */
export interface WriteLimits {
  /** Maximum items read back for one bulk write. */
  verifyMaxItems?: number;
  /** Maximum decoded attachment size in bytes. */
  uploadMaxBytes?: number;
}

/** Parses `MCP_VERIFY_MAX_ITEMS`: a positive integer, otherwise the default. */
export function parseVerifyMaxItems(value: string | undefined): number {
  const parsed = Number(value);
  return value?.trim() && Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_VERIFY_MAX_ITEMS;
}

/** Reads the write limits from the entry-point environment; an invalid `MCP_UPLOAD_MAX_BYTES` throws, as it does in `upload_attachment`. */
export function writeLimitsFromEnv(env: NodeJS.ProcessEnv): WriteLimits {
  return { verifyMaxItems: parseVerifyMaxItems(env.MCP_VERIFY_MAX_ITEMS), uploadMaxBytes: parseUploadMaxBytes(env.MCP_UPLOAD_MAX_BYTES) };
}

export type VerificationStatus = 'verified' | 'mismatch' | 'uncertain' | 'skipped';

export interface VerificationFinding { field: string; sent: unknown; actual: unknown }

export interface WriteVerification {
  status: VerificationStatus;
  /** Plain values that were clearly dropped or changed. The only status reported as an error. */
  mismatches: VerificationFinding[];
  /** Differences Polarion may have caused by normalizing or recomputing. */
  uncertain: VerificationFinding[];
  /** Items or parts that were not verified, each with its reason. */
  skipped?: Array<{ item?: string; reason: string }>;
  reason?: string;
}

export const BEYOND_LIMIT_REASON = 'beyond verify limit';
export const RELATIONSHIPS_REASON = 'relationships not verified';
export const UNCERTAIN_NOTE = 'Polarion may have normalized or recomputed these fields. Re-read the item if the exact value matters.';

/** A resource to read back: its label (empty for a single write), URL and what was sent. */
export interface VerifyTarget {
  label: string;
  url?: string;
  attributes?: unknown;
  hasRelationships?: boolean;
  /** Why this target cannot be read back, when its identity could not be resolved. */
  problem?: string;
}

/** Routes with a read-back implementation: work item create/patch, plural patch, document patch. */
export function isVerifiableRoute(definition: { method: string; pathTemplate: string }): boolean {
  const method = definition.method.toLowerCase();
  const route = definition.pathTemplate;
  if (method === 'patch') {
    return route === '/projects/{projectId}/workitems/{workItemId}'
      || route === '/projects/{projectId}/spaces/{spaceId}/documents/{documentName}'
      || route === '/projects/{projectId}/workitems'
      || route === '/all/workitems';
  }
  return method === 'post' && route === '/projects/{projectId}/workitems';
}

/** The tool's input schema, with the `verify` switch added only when its route has a read-back implementation. */
export function withVerifyProperty(definition: { method: string; pathTemplate: string; inputSchema: any }): any {
  if (!isVerifiableRoute(definition)) return definition.inputSchema;
  return { ...definition.inputSchema, properties: { ...definition.inputSchema.properties, verify: { type: 'boolean', description: 'Set false to skip write verification.' } } };
}

// ---- Value comparison ----

type Outcome = 'verified' | 'uncertain' | 'mismatch';
type RichText = { type: string; value: string };

/** Computed or workflow-driven: Polarion may legitimately change what was sent. */
const SOFT_ATTRIBUTES = new Set([
  'status', 'workflowAction', 'resolution', 'created', 'updated', 'author', 'updatedBy', 'revision', 'id', 'outlineNumber',
]);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isRichText = (value: unknown): value is RichText => isObject(value) && typeof value.type === 'string' && /^text\//i.test(value.type) && typeof value.value === 'string';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const BLOCK_TAGS = new Set(['p', 'div', 'br', 'li', 'ul', 'ol', 'tr', 'td', 'th', 'table', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (match, decimal?: string, hex?: string, name?: string) => {
    const code = decimal ? Number(decimal) : hex ? Number.parseInt(hex, 16) : undefined;
    if (code !== undefined) return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    return ENTITIES[name!.toLowerCase()] ?? match;
  });
}

/**
 * Drops everything from a `<` to the next `>` in a single pass (a nested `<` stays inside the tag, an
 * unclosed tag is dropped), and emits a space for block-level tags so words do not run together.
 */
function stripTags(text: string): string {
  let out = '';
  let tag: string | undefined;
  for (const char of text) {
    if (tag === undefined) {
      if (char === '<') tag = '';
      else out += char;
    } else if (char === '>') {
      if (BLOCK_TAGS.has(/^\/?\s*([a-z][a-z0-9]*)/i.exec(tag)?.[1]?.toLowerCase() ?? '')) out += ' ';
      tag = undefined;
    } else tag += char;
  }
  return out;
}

/**
 * Text content of a rich text value, for comparison only: tags are stripped first and entities are decoded
 * once afterwards, so encoded text is never re-parsed as markup. Remaining angle brackets (stray, nested or
 * decoded from entities) are removed, so the result can never contain `<` or `>`.
 */
export function richTextContent(value: string, type: string | undefined): string {
  const text = type && /html/i.test(type) ? decodeEntities(stripTags(value)) : value;
  return text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

function textOf(value: unknown): string | undefined {
  if (isRichText(value)) return richTextContent(value.value, value.type);
  return typeof value === 'string' ? value : undefined;
}

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;
const DAY_MS = 86_400_000;

/** Dates are equal when their date parts are at most one day apart, which absorbs time zone shifts. */
function sameDate(left: string, right: string): boolean {
  const day = (value: string) => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
  return Math.abs(day(left) - day(right)) <= DAY_MS;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return isRichText(value) && richTextContent(value.value, value.type) === '';
}

/** Enum values come back as `{id}` objects (or lists of them) while writes send the bare id. */
function unwrap(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unwrap);
  if (isObject(value) && !isRichText(value) && (typeof value.id === 'string' || typeof value.id === 'number')) return value.id;
  return value;
}

const isNumeric = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
const isBooleanLike = (value: unknown): boolean => typeof value === 'boolean' || (typeof value === 'string' && /^(?:true|false)$/i.test(value.trim()));
const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

function equivalent(sent: unknown, actual: unknown): boolean {
  if (isRichText(sent) || isRichText(actual)) {
    const left = textOf(sent);
    const right = textOf(actual);
    return left !== undefined && right !== undefined && richTextContent(left, undefined) === richTextContent(right, undefined);
  }
  if (Array.isArray(sent) || Array.isArray(actual)) {
    if (!Array.isArray(sent) || !Array.isArray(actual) || sent.length !== actual.length) return false;
    const unmatched = [...actual];
    return sent.every(value => {
      const index = unmatched.findIndex(candidate => equivalent(value, candidate));
      if (index < 0) return false;
      unmatched.splice(index, 1);
      return true;
    });
  }
  if (isObject(sent) && isObject(actual)) {
    return Object.keys(sent).every(key => Object.hasOwn(actual, key) && equivalent(sent[key], actual[key]));
  }
  if (isNumeric(sent) && isNumeric(actual)) return Number(sent) === Number(actual);
  if (typeof sent === 'string' && typeof actual === 'string') {
    const left = collapse(sent);
    const right = collapse(actual);
    return left === right || (DATE_LIKE.test(left) && DATE_LIKE.test(right) && sameDate(left, right));
  }
  if (typeof sent === 'boolean' && isBooleanLike(actual)) return String(actual).trim().toLowerCase() === String(sent);
  if (typeof actual === 'boolean' && isBooleanLike(sent)) return String(sent).trim().toLowerCase() === String(actual);
  return sent === actual;
}

/** A plain scalar, or a list of them: a value whose absence on read-back is not explained by normalization. */
function isPlainValue(value: unknown): boolean {
  const scalar = (item: unknown) => ['string', 'number', 'boolean'].includes(typeof item);
  return scalar(value) || (Array.isArray(value) && value.every(scalar));
}

/**
 * Classifies a difference that is present on both sides. Only two values of the same simple kind (string,
 * number, boolean) that clearly differ are a mismatch; a changed type, case-only change, truncation or
 * anything nested is uncertain.
 */
function classifyDifference(sent: unknown, actual: unknown): Outcome {
  const scalar = (value: unknown) => ['string', 'number', 'boolean'].includes(typeof value);
  if (!scalar(sent) || !scalar(actual)) return 'uncertain';
  if (typeof sent === 'boolean' || typeof actual === 'boolean') return isBooleanLike(sent) && isBooleanLike(actual) ? 'mismatch' : 'uncertain';
  if (isNumeric(sent) && isNumeric(actual)) return 'mismatch';
  if (typeof sent === 'string' && typeof actual === 'string') {
    const left = collapse(sent).toLowerCase();
    const right = collapse(actual).toLowerCase();
    if (left === right) return 'uncertain';
    if (left && right && (left.startsWith(right) || right.startsWith(left))) return 'uncertain';
    return 'mismatch';
  }
  return 'uncertain';
}

/**
 * Classifies one attribute: what was sent against what the read-back returned.
 * A hard mismatch needs either a non-empty plain value that is absent on read-back (the silent drop) or
 * two values of the same simple kind that clearly differ.
 */
export function compareAttribute(field: string, rawSent: unknown, rawActual: unknown): Outcome {
  const sent = unwrap(rawSent);
  const actual = unwrap(rawActual);
  if (isEmpty(sent)) return isEmpty(actual) ? 'verified' : 'uncertain';
  if (equivalent(sent, actual)) return 'verified';
  if (SOFT_ATTRIBUTES.has(field) || isRichText(sent) || isRichText(actual)) return 'uncertain';
  if (actual === undefined || actual === null) return isPlainValue(sent) && sent !== false && sent !== 0 ? 'mismatch' : 'uncertain';
  return classifyDifference(sent, actual);
}

// ---- Orchestration ----

/**
 * Reads back at most `maxItems` targets and classifies every attribute sent.
 *
 * @param read - Returns the attributes of a target, or throws with a printable message.
 * @returns The overall verification: mismatch beats uncertain beats verified; skipped when nothing could be checked.
 */
export async function verifyTargets(
  targets: readonly VerifyTarget[],
  read: (target: VerifyTarget) => Promise<Record<string, unknown>>,
  maxItems: number,
): Promise<WriteVerification> {
  const mismatches: VerificationFinding[] = [];
  const uncertain: VerificationFinding[] = [];
  const skipped: Array<{ item?: string; reason: string }> = [];
  let checked = 0;
  const skip = (target: VerifyTarget, reason: string) => skipped.push({ ...(target.label ? { item: target.label } : {}), reason });

  for (const [index, target] of targets.entries()) {
    if (index >= maxItems) { skip(target, BEYOND_LIMIT_REASON); continue; }
    if (target.hasRelationships) skip(target, RELATIONSHIPS_REASON);
    if (target.problem) { skip(target, target.problem); continue; }
    const sent = isObject(target.attributes) ? Object.entries(target.attributes) : [];
    if (!sent.length) {
      if (!target.hasRelationships) skip(target, 'no attributes to verify');
      continue;
    }
    let actual: Record<string, unknown>;
    try { actual = await read(target); }
    catch (error) { skip(target, `Read-back failed: ${error instanceof Error ? error.message : 'unknown error'}`); continue; }
    checked++;
    for (const [field, value] of sent) {
      const outcome = compareAttribute(field, value, actual[field]);
      if (outcome === 'verified') continue;
      const finding = { field: target.label ? `${target.label}.${field}` : field, sent: value, actual: actual[field] ?? null };
      (outcome === 'mismatch' ? mismatches : uncertain).push(finding);
    }
  }

  const status: VerificationStatus = mismatches.length ? 'mismatch' : uncertain.length ? 'uncertain' : checked ? 'verified' : 'skipped';
  const beyond = skipped.filter(item => item.reason === BEYOND_LIMIT_REASON).length;
  const reason = status === 'skipped'
    ? [...new Set(skipped.map(item => item.reason))].join('; ')
    : beyond ? `Verified ${checked} of ${targets.length} items; the rest are ${BEYOND_LIMIT_REASON} (MCP_VERIFY_MAX_ITEMS).` : undefined;
  return { status, mismatches, uncertain, ...(skipped.length ? { skipped } : {}), ...(reason ? { reason } : {}) };
}

/** The sentence added to a result whose verification found something to report. */
export function verificationMessage(verification: WriteVerification): string | undefined {
  const list = (items: VerificationFinding[]) => items.map(item => item.field).join(', ');
  if (verification.status === 'mismatch') return `The write was accepted by Polarion but not applied for fields: ${list(verification.mismatches)}.`;
  if (verification.status === 'uncertain') return `The write succeeded, but these fields differ on read-back: ${list(verification.uncertain)}. ${UNCERTAIN_NOTE}`;
  return undefined;
}
