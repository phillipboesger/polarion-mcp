import { newQuickJSWASMModule, shouldInterruptAfterDeadline, type QuickJSContext, type QuickJSHandle, type QuickJSWASMModule } from 'quickjs-emscripten';

export interface SandboxLimits {
  timeoutMs: number;
  memoryBytes: number;
  maxStackBytes: number;
  maxHostCalls: number;
  maxLogBytes: number;
  maxResultBytes: number;
}
export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  timeoutMs: 30_000,
  memoryBytes: 64 * 1024 * 1024,
  maxStackBytes: 512 * 1024,
  maxHostCalls: 100,
  maxLogBytes: 8 * 1024,
  maxResultBytes: 256 * 1024,
};
export type HostFunction = (args: unknown) => Promise<unknown>;
export interface SandboxResult {
  ok: boolean;
  value?: unknown;
  error?: { message: string };
  logs: string;
  hostCalls: number;
  truncated: boolean;
}

let modulePromise: Promise<QuickJSWASMModule> | undefined;
const loadModule = (): Promise<QuickJSWASMModule> => (modulePromise ??= newQuickJSWASMModule());

/** Never let host paths or stack frames cross into a result: keep the first line only and cap its length. */
function cleanMessage(value: unknown): string {
  const raw = typeof value === 'string' ? value : value instanceof Error ? value.message : 'Unknown error';
  const line = raw.split('\n').find(part => part.trim() && !/^\s*at\s/.test(part)) ?? 'Unknown error';
  return line.replace(/(?:[A-Za-z]:)?(?:\/[\w.@-]+){2,}/g, '<path>').slice(0, 500);
}
function dumpError(vm: QuickJSContext, handle: QuickJSHandle): string {
  // Read the message property directly: vm.dump() calls the sandbox's JSON.stringify, which untrusted code can replace.
  if (vm.typeof(handle) === 'string') return cleanMessage(vm.getString(handle));
  if (vm.typeof(handle) !== 'object') return 'Sandbox error';
  const message = vm.getProp(handle, 'message');
  try { return vm.typeof(message) === 'string' ? cleanMessage(vm.getString(message)) : 'Sandbox error'; } finally { message.dispose(); }
}

// Runs before untrusted code. `__host`/`__log` are the only bridge; both are removed from the global afterwards.
// Arguments and results cross as JSON strings, so host code only ever sees plain data parsed on the host side.
const bootstrap = (names: string[]): string => `
(() => {
  const host = globalThis.__host; const log = globalThis.__log;
  delete globalThis.__host; delete globalThis.__log;
  const stringify = JSON.stringify; const parse = JSON.parse;
  const api = {};
  for (const name of ${JSON.stringify(names)}) {
    api[name] = async (args) => {
      const text = stringify(args === undefined ? {} : args);
      const reply = await host(name, text === undefined ? '{}' : text);
      return reply === '' ? undefined : parse(reply);
    };
  }
  Object.defineProperty(globalThis, '__ser', { value: (v) => stringify(v), writable: false, configurable: false });
  Object.defineProperty(globalThis, 'polarion', { value: Object.freeze(api), writable: false, configurable: false });
  const fmt = (value) => { if (typeof value === 'string') return value; try { const text = stringify(value); return text === undefined ? String(value) : text; } catch { return String(value); } };
  const write = (...parts) => log(parts.map(fmt).join(' '));
  Object.defineProperty(globalThis, 'console', { value: Object.freeze({ log: write, info: write, warn: write, error: write }), writable: false, configurable: false });
})();
`;

/**
 * Runs `code` (the body of an async function) in a fresh QuickJS WASM context.
 * The sandbox sees only `polarion.<name>(args)` and `console`; no fs, network, process, timers or modules.
 */
export async function runInSandbox(
  code: string,
  hostFunctions: Record<string, HostFunction>,
  opts: { limits?: Partial<SandboxLimits>; signal?: AbortSignal } = {},
): Promise<SandboxResult> {
  const limits: SandboxLimits = { ...DEFAULT_SANDBOX_LIMITS, ...opts.limits };
  const quickjs = await loadModule();
  const runtime = quickjs.newRuntime();
  const vm = runtime.newContext();
  const deadline = Date.now() + limits.timeoutMs;
  let logs = '';
  let logTruncated = false;
  let hostCalls = 0;
  const pending = new Set<{ dispose(): void; alive: boolean }>();
  const result: SandboxResult = { ok: false, logs: '', hostCalls: 0, truncated: false };
  try {
    runtime.setMemoryLimit(limits.memoryBytes);
    runtime.setMaxStackSize(limits.maxStackBytes);
    runtime.setInterruptHandler(shouldInterruptAfterDeadline(deadline));

    const logFn = vm.newFunction('__log', textHandle => {
      const text = String(vm.getString(textHandle));
      if (logTruncated) return;
      const next = logs ? `${logs}\n${text}` : text;
      if (next.length > limits.maxLogBytes) { logs = next.slice(0, limits.maxLogBytes); logTruncated = true; } else logs = next;
    });
    vm.setProp(vm.global, '__log', logFn);
    logFn.dispose();

    const hostFn = vm.newFunction('__host', (nameHandle, argsHandle) => {
      const name = vm.getString(nameHandle);
      const argsText = vm.getString(argsHandle);
      const deferred = vm.newPromise();
      pending.add(deferred);
      const reject = (message: string): void => {
        if (!deferred.alive) return;
        const error = vm.newError(message);
        deferred.reject(error);
        error.dispose();
      };
      hostCalls += 1;
      const fn = Object.hasOwn(hostFunctions, name) ? hostFunctions[name] : undefined;
      if (hostCalls > limits.maxHostCalls) reject(`Host call limit of ${limits.maxHostCalls} exceeded`);
      else if (!fn) reject(`Unknown function: ${name}`);
      else {
        let parsed: unknown;
        try { parsed = JSON.parse(argsText); } catch { reject('Arguments must be JSON-serializable'); }
        if (parsed !== undefined && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) { reject('Arguments must be an object'); parsed = undefined; }
        if (parsed !== undefined) {
          Promise.resolve().then(() => fn(parsed)).then(value => {
            if (!deferred.alive) return;
            const text = value === undefined ? '' : JSON.stringify(value);
            const handle = vm.newString(text ?? '');
            deferred.resolve(handle);
            handle.dispose();
          }, (error: unknown) => reject(cleanMessage(error)));
        }
      }
      return deferred.handle;
    });
    vm.setProp(vm.global, '__host', hostFn);
    hostFn.dispose();

    const boot = vm.evalCode(bootstrap(Object.keys(hostFunctions)));
    if (boot.error) { result.error = { message: dumpError(vm, boot.error) }; boot.error.dispose(); return result; }
    boot.value.dispose();

    // The wrapper serializes inside the sandbox, so only a JSON string ever leaves it.
    const wrapped = `(async () => {
      const __value = await (async () => {\n${code}\n})();
      if (typeof __value === 'function' || typeof __value === 'symbol') throw new Error('Result is not JSON-serializable');
      return __value === undefined ? '' : __ser(__value);
    })()`;
    const started = vm.evalCode(wrapped, 'sandbox.js');
    if (started.error) { result.error = { message: dumpError(vm, started.error) }; started.error.dispose(); return result; }

    let settled: { error?: string; text?: string } | undefined;
    const promiseHandle = started.value;
    void vm.resolvePromise(promiseHandle).then(outcome => {
      if (outcome.error) { settled = { error: dumpError(vm, outcome.error) }; outcome.error.dispose(); }
      else { settled = { text: String(vm.getString(outcome.value)) }; outcome.value.dispose(); }
    });
    promiseHandle.dispose();

    const abortError = (): string | undefined => opts.signal?.aborted ? 'Execution aborted' : Date.now() > deadline ? 'Execution timed out' : undefined;
    while (!settled) {
      const stop = abortError();
      if (stop) { settled = { error: stop }; break; }
      const jobs = runtime.executePendingJobs();
      if (jobs.error) { settled = { error: dumpError(vm, jobs.error) }; jobs.error.dispose(); break; }
      if (!settled) await new Promise(resolve => setImmediate(resolve));
    }

    if (settled.error !== undefined) {
      result.error = { message: /interrupted/i.test(settled.error) ? 'Execution timed out' : settled.error };
    } else {
      const text = settled.text ?? '';
      if (text.length > limits.maxResultBytes) {
        result.truncated = true;
        result.value = `${text.slice(0, limits.maxResultBytes)}`;
      } else {
        result.value = text === '' ? undefined : JSON.parse(text);
      }
      result.ok = true;
    }
    return result;
  } catch (error) {
    result.error = { message: cleanMessage(error) };
    return result;
  } finally {
    result.logs = logTruncated ? `${logs}\n[logs truncated]` : logs;
    result.hostCalls = hostCalls;
    for (const deferred of pending) if (deferred.alive) deferred.dispose();
    try { vm.dispose(); runtime.dispose(); } catch { /* A leaked handle after an interrupt must not mask the result. */ }
  }
}
