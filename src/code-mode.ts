import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { runInSandbox, type HostFunction, type SandboxLimits } from './code-sandbox.js';
import { sanitizeInputSchema } from './utils.js';
import type { VirtualTool } from './virtual-tools.js';

/** One callable operation in the Code Mode SDK (a generated tool or a composite). */
export interface SdkOperation {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  readOnly: boolean;
  /** True when the operation accepts dry_run, so a dry-run execute can preview it. */
  dryRunCapable: boolean;
  toolset?: string;
}

export interface CodeModeConfig {
  /** When false, write operations are neither listed nor callable. */
  writes: boolean;
  maxWriteCalls: number;
  limits?: Partial<SandboxLimits>;
}

const MAX_DEPTH = 3;
const MAX_PROPS = 40;
const IDENT = /^[A-Za-z_$][\w$]*$/;

/** Renders a JSON schema as a compact TypeScript type. Unknown shapes degrade to `unknown`. */
export function schemaToType(schema: any, depth = 0): string {
  if (!schema || typeof schema !== 'object') return 'unknown';
  if (Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.length <= 12) return schema.enum.map((v: unknown) => JSON.stringify(v)).join(' | ');
  const variants = schema.oneOf ?? schema.anyOf;
  if (Array.isArray(variants) && variants.length > 0) return [...new Set(variants.map((v: any) => schemaToType(v, depth)))].join(' | ');
  const type = Array.isArray(schema.type) ? schema.type : [schema.type];
  const parts = type.map((t: string | undefined) => {
    switch (t) {
      case 'string': return 'string';
      case 'integer': case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'null': return 'null';
      case 'array': return `${wrap(schemaToType(schema.items, depth + 1))}[]`;
      case 'object': case undefined: return objectType(schema, depth);
      default: return 'unknown';
    }
  });
  return [...new Set(parts)].join(' | ');
}
const wrap = (type: string): string => /[|{]/.test(type) && !type.startsWith('{') ? `(${type})` : type;

function objectType(schema: any, depth: number): string {
  const props = schema.properties && typeof schema.properties === 'object' ? Object.entries<any>(schema.properties) : [];
  if (props.length === 0) return schema.additionalProperties && typeof schema.additionalProperties === 'object'
    ? `Record<string, ${schemaToType(schema.additionalProperties, depth + 1)}>` : 'Record<string, unknown>';
  if (depth >= MAX_DEPTH) return 'Record<string, unknown>';
  const required = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
  const shown = props.slice(0, MAX_PROPS).map(([key, value]) => {
    const name = IDENT.test(key) ? key : JSON.stringify(key);
    return `${name}${required.has(key) ? '' : '?'}: ${schemaToType(value, depth + 1)}`;
  });
  if (props.length > MAX_PROPS) shown.push('[key: string]: unknown');
  return `{ ${shown.join('; ')} }`;
}

/** Retains complete sentences, including recommendations for alternative operations. */
export function summarizeDescription(text: string, max = 240): string {
  const clean = text.replace(/\(\s*the\s+same\s+as\s+the\s+corresponding\s+java\s+api\s+method\s*\.\s*\)/gi, '').trim();
  const sentences: string[] = [];
  let start = 0;
  let inCode = false;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '`') inCode = !inCode;
    if (!inCode && /[.!?]/.test(clean[i]) && /\s/.test(clean[i + 1] ?? '') && !/(?:e\.g|i\.e)\.$/i.test(clean.slice(start, i + 1))) {
      const next = clean.slice(i + 1).match(/^\s+([A-Z`])/);
      if (next) { sentences.push(clean.slice(start, i + 1).trim()); start = i + 1; }
    }
  }
  if (clean.slice(start).trim()) sentences.push(clean.slice(start).trim());
  const selected: string[] = [];
  for (const sentence of sentences) {
    if ((selected.join(' ').length + (selected.length ? 1 : 0) + sentence.length) > max) break;
    selected.push(sentence);
  }
  if (!selected.length && sentences.length) {
    const prefix = sentences[0].slice(0, Math.max(0, max - 1));
    selected.push((prefix.replace(/\s+\S*$/, '') || prefix).trimEnd() + '…');
  }
  const alternative = sentences.find(sentence => /use `[^`]+` instead/i.test(sentence));
  if (alternative && !selected.includes(alternative)) {
    if (alternative === sentences[0] && selected[0]?.endsWith('…')) selected[0] = alternative;
    else selected.push(alternative);
  }
  return selected.join(' ');
}

/** TypeScript declaration the model reads from `search`. */
export function declarationFor(op: SdkOperation): string {
  const args = schemaToType(op.inputSchema);
  const doc = summarizeDescription(op.description).replace(/\*\//g, '* /');
  const flags = op.readOnly ? '' : ' [write]';
  return `/** ${doc}${flags} */\npolarion.${op.name}(args: ${args === 'Record<string, unknown>' ? '{}' : args}): Promise<any>;`;
}

/** Builds SDK operations from the deployment-filtered tools. Input schemas use the MCP-safe property names the pipeline accepts. */
export function buildSdk(
  tools: ReadonlyMap<string, { name: string; description: string; inputSchema: any; annotations?: { readOnlyHint?: boolean } }>,
  composites: readonly VirtualTool[],
  config: Pick<CodeModeConfig, 'writes'>,
  toolsetsOf: (name: string) => string,
  schemaOf: (def: { name: string; inputSchema: any }) => any,
): SdkOperation[] {
  const ops: SdkOperation[] = [];
  for (const def of tools.values()) {
    const schema = schemaOf(def);
    const readOnly = def.annotations?.readOnlyHint === true;
    ops.push({ name: def.name, description: def.description, inputSchema: schema, readOnly, dryRunCapable: schema?.properties?.dry_run !== undefined, toolset: toolsetsOf(def.name) });
  }
  for (const tool of composites) {
    ops.push({
      name: tool.name, description: tool.description, inputSchema: sanitizeInputSchema(tool.inputSchema),
      readOnly: tool.annotations?.readOnlyHint === true, dryRunCapable: tool.dryRunSafe === true, toolset: 'composites',
    });
  }
  return ops.filter(op => config.writes || op.readOnly);
}

function rank(ops: readonly SdkOperation[], query: string, toolset: string | undefined, limit: number): SdkOperation[] {
  const terms = [...query.toLowerCase().matchAll(/[a-z0-9]+/g)].map(m => m[0]);
  const scored = ops.map(op => {
    const name = op.name.toLowerCase();
    const haystack = `${name} ${op.description} ${op.toolset ?? ''}`.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (name === term ? 5 : name.includes(term) ? 3 : haystack.includes(term) ? 1 : 0), 0);
    // Composites are the friendliest entry points, so they win ties.
    return { op, score: score + (op.toolset === 'composites' && score > 0 ? 1 : 0) };
  }).filter(row => (terms.length === 0 || row.score > 0) && (!toolset || row.op.toolset === toolset));
  return scored.sort((a, b) => b.score - a.score || a.op.name.localeCompare(b.op.name)).slice(0, limit).map(row => row.op);
}

export const CODE_MODE_INSTRUCTIONS = [
  'Code Mode: this server exposes two tools. `search` finds Polarion operations and returns TypeScript declarations; `execute` runs JavaScript that calls them.',
  'Inside `execute`, call `await polarion.<operation>({...})` (the declarations from `search`), use plain JavaScript to loop, filter and join, `return` a small JSON value, and use console.log sparingly.',
  'Search first (pass `detail` with operation names when a summary is not enough), then write one script that does the whole task. Writes honour dry_run, read-only mode, validation and read-back verification exactly as direct tool calls do; run with dry_run: true first.',
].join(' ');

/** The two tools shown to the client in code mode. `execute` is dispatched by the pipeline (it needs the full call pipeline), so its handler only guards direct misuse. */
export function codeModeTools(ops: readonly SdkOperation[], config: CodeModeConfig): VirtualTool[] {
  const writeNote = config.writes ? '' : ' This deployment is read-only for Code Mode: write operations are not available.';
  const search: VirtualTool = {
    name: 'search', title: 'Search Polarion operations', toolset: 'composites',
    description: `Find Polarion operations by keyword and get their TypeScript declarations for use inside \`execute\`. Returns at most ${'`limit`'} matches (default 8, maximum 25). Use \`offset\` for paging and \`detail\` with operation names for full descriptions.`,
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Keywords, e.g. "trace links" or "create work item".' }, toolset: { type: 'string', description: 'Optional toolset filter, e.g. composites.' }, limit: { type: 'number', default: 8, description: 'Matches per page, 1 to 25.' }, offset: { type: 'number', default: 0, description: 'Skip this many matches; the result names the next offset when more remain.' }, detail: { type: 'array', items: { type: 'string' }, description: 'Operation names, e.g. ["patchWorkItem"]: returns each declaration with its full description instead of a search.' } } },
    annotations: { readOnlyHint: true },
    handler: ({ query = '', toolset, limit = 8, offset = 0, detail }) => {
      if (Array.isArray(detail) && detail.length > 0) {
        const output = detail.map(name => {
          const op = ops.find(item => item.name === name);
          return op ? `${declarationFor(op)}\n/* ${op.description.replace(/\*\//g, '* /')} */` : `// unknown operation: ${String(name)}`;
        }).join('\n\n');
        return { content: [{ type: 'text' as const, text: output }] };
      }
      const pageSize = Math.max(1, Math.min(25, Math.floor(Number(limit) || (Number(limit) === 0 ? 1 : 8))));
      const start = Math.max(0, Math.floor(Number(offset) || 0));
      const all = rank(ops, String(query), typeof toolset === 'string' ? toolset : undefined, ops.length);
      const matches = all.slice(start, start + pageSize);
      if (matches.length === 0 && all.length > 0) return { content: [{ type: 'text' as const, text: `No more matches: "${String(query)}" has ${all.length}, offset ${start} is past the end.` }] };
      if (matches.length === 0) return { content: [{ type: 'text' as const, text: `No operations match "${String(query)}". ${ops.length} operations are available; try broader keywords.` }] };
      const more = all.length - start - matches.length;
      return { content: [{ type: 'text' as const, text: matches.map(declarationFor).join('\n\n') + (more > 0 ? `\n// ${more} more matches: call search again with offset: ${start + matches.length}` : '') }] };
    },
  };
  const execute: VirtualTool = {
    name: 'execute', title: 'Run Polarion script', toolset: 'composites', dryRunSafe: true,
    description: `Run JavaScript in an isolated sandbox. The only API is \`polarion.<operation>(args)\` (see \`search\`) and console.log. The code is the body of an async function: use await, return a JSON value. Limits: ${Math.round((config.limits?.timeoutMs ?? 30_000) / 1000)} s, ${config.maxWriteCalls} write calls. With dry_run: true every write is previewed, not performed.${writeNote}`,
    inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Body of an async function, e.g. const r = await polarion.getProjects({}); return r.data.length;' }, dry_run: { type: 'boolean', description: 'Preview all writes without performing them.' } }, required: ['code'] },
    annotations: { readOnlyHint: !config.writes, destructiveHint: config.writes, openWorldHint: true },
    handler: (args, ctx) => ctx.callTool
      ? runExecute(args, ops, config, (name, callArgs) => ctx.callTool!(name, callArgs), ctx.signal)
      : { content: [{ type: 'text' as const, text: 'Error: execute needs the server pipeline' }], isError: true },
  };
  return [search, execute];
}

function unwrap(result: CallToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const text = result.content.filter(item => item.type === 'text').map(item => (item as { text: string }).text).join('\n');
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * Runs `execute`. Every `polarion.<op>` call goes through `callTool`, which is the full tool pipeline
 * (policy, rate limit, guards, verification, marking, audit), so the sandbox gains no privilege.
 */
export async function runExecute(
  args: Record<string, unknown>,
  ops: readonly SdkOperation[],
  config: CodeModeConfig,
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>,
  signal?: AbortSignal,
): Promise<CallToolResult> {
  const code = typeof args.code === 'string' ? args.code : '';
  if (!code.trim()) return { content: [{ type: 'text', text: 'Error: code is required' }], isError: true };
  const dryRun = args.dry_run === true;
  let writeCalls = 0;
  const inFlight = new Set<Promise<unknown>>();
  const host: Record<string, HostFunction> = {};
  for (const op of ops) {
    host[op.name] = (callArgs) => {
      const running = hostCall(op, callArgs);
      inFlight.add(running);
      void running.finally(() => inFlight.delete(running)).catch(() => undefined);
      return running;
    };
    const hostCall = async (op: SdkOperation, callArgs: unknown): Promise<unknown> => {
      const input = { ...(callArgs as Record<string, unknown>) };
      // Confirmation is the human's decision (elicitation); code can not grant it.
      delete input.confirm;
      if (!op.readOnly) {
        if (!config.writes) throw new Error(`${op.name} is a write operation and Code Mode writes are disabled`);
        if (dryRun && !op.dryRunCapable) throw new Error(`${op.name} does not support dry_run, so it is blocked in a dry-run execute`);
        writeCalls += 1;
        if (writeCalls > config.maxWriteCalls) throw new Error(`Write call limit of ${config.maxWriteCalls} exceeded`);
        if (dryRun) input.dry_run = true;
      }
      const result = await callTool(op.name, input);
      if (result.isError) {
        const text = result.content.filter(item => item.type === 'text').map(item => (item as { text: string }).text).join(' ');
        throw new Error(text || `${op.name} failed`);
      }
      return unwrap(result);
    };
  }
  const outcome = await runInSandbox(code, host, { limits: config.limits, signal });
  // Calls the script started but did not await keep running in the pipeline; wait for them so the counts and the result are final.
  if (inFlight.size > 0) {
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([Promise.allSettled([...inFlight]), new Promise(resolve => { timer = setTimeout(resolve, 15_000); })]);
    clearTimeout(timer);
  }
  const payload = {
    ...(outcome.ok ? { result: outcome.value === undefined ? null : outcome.value } : { error: outcome.error?.message ?? 'Execution failed' }),
    ...(outcome.logs ? { logs: outcome.logs } : {}),
    host_calls: outcome.hostCalls,
    ...(inFlight.size > 0 ? { pending_calls: inFlight.size } : {}),
    write_calls: writeCalls,
    ...(dryRun ? { dry_run: true } : {}),
    ...(outcome.truncated ? { truncated: true } : {}),
  };
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], ...(outcome.ok ? {} : { isError: true }) };
}
