import test from 'node:test';
import assert from 'node:assert/strict';
import { runInSandbox, type SandboxLimits } from '../src/code-sandbox.js';

const fast: Partial<SandboxLimits> = { timeoutMs: 1500, memoryBytes: 16 * 1024 * 1024 };
const run = (code: string, host: Record<string, (a: unknown) => Promise<unknown>> = {}, limits: Partial<SandboxLimits> = {}, signal?: AbortSignal) =>
  runInSandbox(code, host, { limits: { ...fast, ...limits }, signal });

test('runs async code against host functions and returns JSON', async () => {
  const seen: unknown[] = [];
  const result = await run('const a = await polarion.getWorkItem({ id: "X-1" }); return { title: a.title, n: 2 + 3 };', {
    getWorkItem: async args => { seen.push(args); return { title: 'T' }; },
  });
  assert.equal(result.ok, true, result.error?.message);
  assert.deepEqual(result.value, { title: 'T', n: 5 });
  assert.deepEqual(seen, [{ id: 'X-1' }]);
  assert.equal(result.hostCalls, 1);
});

test('captures and caps console output', async () => {
  const result = await run('console.log("hi", {a: 1}); console.error("bad"); return 1;');
  assert.equal(result.logs, 'hi {"a":1}\nbad');
  const big = await run('for (let i = 0; i < 1000; i++) console.log("x".repeat(100)); return 1;', {}, { maxLogBytes: 200 });
  assert.ok(big.logs.length < 260 && big.logs.includes('[logs truncated]'));
});

test('infinite loop times out and the next run still works', async () => {
  const result = await run('while (true) {}', {}, { timeoutMs: 300 });
  assert.equal(result.ok, false);
  assert.match(result.error!.message, /timed out/i);
  assert.equal((await run('return 7;')).value, 7);
});

test('memory bomb and deep recursion fail cleanly', async () => {
  const bomb = await run('let s = "x"; while (true) { s = s + s; }', {}, { memoryBytes: 8 * 1024 * 1024 });
  assert.equal(bomb.ok, false);
  const arr = await run('const a = []; while (true) a.push(new Array(10000).fill(1));', {}, { memoryBytes: 8 * 1024 * 1024 });
  assert.equal(arr.ok, false);
  const deep = await run('const f = n => f(n + 1) + 1; return f(0);');
  assert.equal(deep.ok, false);
});

test('huge results are truncated', async () => {
  const result = await run('return "y".repeat(100000);', {}, { maxResultBytes: 1000 });
  assert.equal(result.ok, true);
  assert.equal(result.truncated, true);
  assert.ok(String(result.value).length <= 1000);
});

test('no ambient capabilities', async () => {
  const result = await run('return [typeof require, typeof process, typeof fetch, typeof setTimeout, typeof module, typeof Buffer, typeof XMLHttpRequest];');
  assert.deepEqual(result.value, new Array(7).fill('undefined'));
  assert.equal((await run('return await import("fs");')).ok, false);
});

test('eval, Function and constructor chains stay inside the sandbox', async () => {
  const probes = [
    'return typeof eval("process");',
    'return new Function("return process")();',
    'return (function(){ return this; }).constructor("return process")();',
    'return globalThis.constructor.constructor("return require")();',
    'return typeof [].constructor.constructor("return globalThis.process")();',
  ];
  for (const probe of probes) {
    const result = await run(probe);
    const text = JSON.stringify(result);
    assert.ok(!result.ok || /undefined/.test(text), `probe reached host: ${probe} -> ${text}`);
  }
});

test('sandbox mutation cannot change the bridge or leak across runs', async () => {
  const calls: unknown[] = [];
  const host = { ping: async (args: unknown) => { calls.push(args); return 'pong'; } };
  const poisoned = await run(`
    try { polarion.ping = () => 'evil'; } catch {}
    Object.prototype.toJSON = () => 'poison';
    JSON.stringify = () => 'poison';
    globalThis.leak = 42;
    return await polarion.ping({ a: 1 });`, host);
  // Poisoning JSON output only corrupts the sandbox's own arguments; the host refuses them (fail closed).
  assert.equal(poisoned.ok, false);
  assert.match(poisoned.error!.message, /Arguments must be an object/);
  const next = await run('return [typeof leak, Object.prototype.toJSON === undefined, await polarion.ping({ b: 2 })];', host);
  assert.deepEqual(next.value, ['undefined', true, 'pong']);
  assert.deepEqual(calls, [{ b: 2 }]);
});

test('host receives plain data even from hostile argument objects', async () => {
  const seen: unknown[] = [];
  const host = { echo: async (a: unknown) => { seen.push(a); return 1; } };
  const result = await run('await polarion.echo({ toJSON() { return { safe: true }; } }); return 1;', host);
  assert.equal(result.ok, true);
  assert.deepEqual(seen, [{ safe: true }]);
  assert.equal(Object.getPrototypeOf(seen[0]), Object.prototype);
  const bad = await run('const o = {}; o.self = o; await polarion.echo(o); return 1;', host);
  assert.equal(bad.ok, false);
});

test('host call flood stops at the limit', async () => {
  const result = await run('for (let i = 0; i < 200; i++) await polarion.noop({}); return "done";', { noop: async () => 1 }, { maxHostCalls: 100 });
  assert.equal(result.ok, false);
  assert.match(result.error!.message, /limit/i);
  assert.equal(result.hostCalls, 101);
});

test('abort signal stops a pending host call', async () => {
  const controller = new AbortController();
  const slow = run('await polarion.slow({}); return 1;', { slow: () => new Promise(() => {}) }, { timeoutMs: 10_000 }, controller.signal);
  setTimeout(() => controller.abort(), 100);
  const result = await slow;
  assert.equal(result.ok, false);
  assert.match(result.error!.message, /aborted/i);
});

test('host errors are plain messages without stacks or paths', async () => {
  const result = await run('await polarion.boom({}); return 1;', {
    boom: async () => { const e = new Error('upstream failed at /Users/someone/secret/file.ts:12'); e.stack = 'Error: x\n    at /Users/someone/secret/file.ts:12:3'; throw e; },
  });
  assert.equal(result.ok, false);
  assert.ok(!/\/Users\//.test(result.error!.message));
  assert.ok(!/\n\s*at /.test(result.error!.message));
  assert.match(result.error!.message, /upstream failed/);
});

test('sandbox errors can be caught inside and unknown functions are refused', async () => {
  const caught = await run('try { await polarion.nope({}); } catch (e) { return String(e.message); }');
  assert.match(String(caught.value), /not a function|Unknown function/);
  assert.equal((await run('throw new Error("boom");')).error?.message, 'boom');
  assert.equal((await run('return polarion.__proto__ === undefined ? 1 : 2;')).ok, true);
});

test('non-serializable returns fail cleanly', async () => {
  assert.equal((await run('return () => 1;')).ok, false);
  assert.equal((await run('return 10n;')).ok, false);
  assert.equal((await run('const o = {}; o.o = o; return o;')).ok, false);
  assert.equal((await run('return;')).value, undefined);
});

test('each run is isolated and syntax errors are reported', async () => {
  assert.equal((await run('globalThis.state = 1; return 1;')).ok, true);
  assert.equal((await run('return typeof state;')).value, 'undefined');
  const syntax = await run('return (;');
  assert.equal(syntax.ok, false);
  assert.ok(syntax.error!.message.length > 0);
});

test('wrapper breakout cannot return a non-string or hide a timeout', async () => {
  const breakout = await runInSandbox('}); return {a:1}; (async()=>{', {})
  assert.equal(breakout.ok, false)
  assert.match(breakout.error?.message ?? '', /not JSON-serializable/)
  const loop = await runInSandbox('}); return {toString(){ while(true){} }}; (async()=>{', {}, { limits: { timeoutMs: 300 } })
  assert.equal(loop.ok, false)
})

test('an oversized host reply is rejected instead of crossing the bridge', async () => {
  const result = await runInSandbox('return await polarion.big({})', { big: async () => 'x'.repeat(2000) }, { limits: { maxResultBytes: 1000 } })
  assert.equal(result.ok, false)
  assert.match(result.error?.message ?? '', /too large/)
})
