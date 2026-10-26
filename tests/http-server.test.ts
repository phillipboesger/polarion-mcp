import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import { copyFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { createHttpApp } from "../src/http-server.js"
import { enabledTools } from "../src/tool-filter.js"

test("REST wrapper hides internal errors, redacts logged credentials, and rate limits per forwarded client", async () => {
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => { errors.push(args) }
  const app = createHttpApp({
    apiKey: "test-key",
    env: { TRUST_PROXY: "1" },
    port: 3000,
    trustProxy: 1,
    rateLimit: { windowMs: 60_000, limit: 1 },
    executeTool: async () => { throw new Error("secret Authorization: Bearer leaked-token") },
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const enabledToolName = enabledTools.keys().next().value as string
    const first = await fetch(`${url}/api/tools/${enabledToolName}`, { method: "POST", headers: { Authorization: "Bearer test-key", "content-type": "application/json" }, body: JSON.stringify({ arguments: {} }) })
    assert.equal(first.status, 500)
    const body = await first.json() as { message?: string }
    assert.equal(body.message, "Tool execution failed")
    assert.doesNotMatch(JSON.stringify(body), /secret Authorization|leaked-token/)
    assert.doesNotMatch(JSON.stringify(errors), /leaked-token/)
    const second = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.10" } })
    assert.equal(second.status, 200)
    const third = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.11" } })
    assert.equal(third.status, 200)
    const fourth = await fetch(`${url}/api/tools`, { headers: { Authorization: "Bearer test-key", "x-forwarded-for": "198.51.100.10" } })
    assert.equal(fourth.status, 429)
    assert.match(fourth.headers.get("content-type") ?? "", /application\/json/)
    assert.equal((await fourth.json() as { error: string }).error, "Too many requests")
  } finally { console.error = originalError; await new Promise<void>(resolve => server.close(() => resolve())) }
})

test("built REST wrapper listens when invoked as http-server.js and copied index.js", async () => {
  const temp = await mkdtemp(join(tmpdir(), "polarion-http-wrapper-"))
  const indexPath = resolve(process.cwd(), "build/index.js")
  const backupPath = join(temp, "previous-index.js")
  const wrapperPath = resolve(process.cwd(), "build/http-server.js")
  await copyFile(indexPath, backupPath)
  const portServer = createServer()
  await new Promise<void>(resolve => portServer.listen(0, "127.0.0.1", resolve))
  const port = (portServer.address() as AddressInfo).port
  await new Promise<void>(resolve => portServer.close(() => resolve()))
  try {
    for (const entry of [wrapperPath, indexPath]) {
      if (entry === indexPath) await copyFile(wrapperPath, indexPath)
      const child = spawn(process.execPath, [entry], { env: { ...process.env, HTTP_API_KEY: "test-key", API_BASE_URL: "https://polarion.example", PORT: String(port) }, stdio: "ignore" })
      try {
        let listening = false
        for (let attempt = 0; attempt < 50 && !listening; attempt++) {
          if (child.exitCode !== null) break
          try {
            const response = await fetch(`http://127.0.0.1:${port}/health`)
            listening = response.ok
          } catch { await new Promise(resolve => setTimeout(resolve, 40)) }
        }
        assert.equal(listening, true, `${entry} should listen`)
      } finally {
        if (child.exitCode === null) {
          child.kill("SIGTERM")
          await new Promise<void>(resolve => child.once("exit", () => resolve()))
        }
      }
    }
  } finally {
    await copyFile(backupPath, indexPath)
    await rm(temp, { recursive: true, force: true })
  }
})

test("REST wrapper only sends CORS headers to configured origins", async () => {
  const app = createHttpApp({ apiKey: "test-key", env: { HTTP_CORS_ORIGINS: "https://allowed.example" }, port: 3000 })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`
    const allowed = await fetch(url, { headers: { Origin: "https://allowed.example" } })
    const denied = await fetch(url, { headers: { Origin: "https://denied.example" } })
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://allowed.example")
    assert.equal(denied.headers.get("access-control-allow-origin"), null)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test("REST wrapper returns a truncated tool result as parseable JSON text", async () => {
  const envelope = { truncated: true, totalChars: 10_000, preview: "{\"data\":", hint: "Narrow the query to shrink the response." }
  const app = createHttpApp({
    apiKey: "test-key",
    env: {},
    port: 3000,
    executeTool: async () => ({ content: [{ type: "text", text: JSON.stringify(envelope) }] }),
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>(resolve => server.once("listening", resolve))
  try {
    const toolName = enabledTools.keys().next().value as string
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/${toolName}`, {
      method: "POST",
      headers: { Authorization: "Bearer test-key", "content-type": "application/json" },
      body: JSON.stringify({ arguments: {} }),
    })
    const body = await response.json() as { result: string }
    assert.deepEqual(JSON.parse(body.result), envelope)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('REST tool route collects list pages through the shared wrapper over actual HTTP', async () => {
  const app = createHttpApp({
    apiKey: 'paging-key', env: {}, port: 3000,
    executeTool: async (name, _definition, args) => {
      const page = Number(args.page_number_ ?? 1);
      const body = { data: [{ id: `PRJ/WI-${page}` }], links: { next: page < 5 ? `http://localhost:9999/polarion/rest/v1/projects/PRJ/workitems?page[number]=${page + 1}` : undefined }, meta: { totalCount: 5 } };
      return { content: [{ type: 'text', text: `API Response (Status: 200):\n${JSON.stringify(body)}` }], structuredContent: body };
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/getWorkItems`;
    const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer paging-key', 'content-type': 'application/json' }, body: JSON.stringify({ arguments: { projectId: 'PRJ', page_size_: 1, max_items: 5 } }) });
    assert.equal(response.status, 200);
    const body = await response.json() as { success: boolean; result: string };
    assert.equal(body.success, true);
    const payload = JSON.parse(body.result.split('\n').slice(1).join('\n'));
    assert.deepEqual(payload.data.map((item: { id: string }) => item.id), ['PRJ/WI-1', 'PRJ/WI-2', 'PRJ/WI-3', 'PRJ/WI-4', 'PRJ/WI-5']);
    assert.equal(payload.meta.totalCount, 5);
    assert.equal('next' in (payload.links ?? {}), false);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
});

test('REST route aborts an in-flight upstream page when the client disconnects', async () => {
  let upstreamSignal: AbortSignal | undefined;
  let upstreamStarted!: () => void;
  const started = new Promise<void>(resolve => { upstreamStarted = resolve; });
  const app = createHttpApp({
    apiKey: 'abort-key', env: {}, port: 3000,
    executeTool: (_name, _definition, _args, _schemes, sendOpts) => new Promise((_resolve, reject) => {
      upstreamSignal = sendOpts?.signal;
      upstreamSignal?.addEventListener('abort', () => reject(new Error('aborted')));
      upstreamStarted();
    }),
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/getWorkItems`;
    const controller = new AbortController();
    const request = fetch(url, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: 'Bearer abort-key', 'content-type': 'application/json' },
      body: JSON.stringify({ arguments: { projectId: 'PRJ', page_size_: 1, max_items: 5 } }),
    }).catch(() => undefined);
    await started;
    controller.abort();
    await request;
    for (let attempt = 0; attempt < 50 && !upstreamSignal?.aborted; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(upstreamSignal?.aborted, true, 'the upstream page request must be cancelled with the client');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('REST maps invalid pagination arguments to 400 with the reason', async () => {
  const app = createHttpApp({ apiKey: 'paging-key', env: {}, port: 3000, executeTool: async () => { throw new Error('must not run'); } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/getWorkItems`;
    for (const args of [{ projectId: 'PRJ', max_items: 0 }, { projectId: 'PRJ', page_size_: 500, max_items: 5 }]) {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer paging-key', 'content-type': 'application/json' }, body: JSON.stringify({ arguments: args }) });
      assert.equal(response.status, 400);
      const body = await response.json() as { success: boolean; message: string };
      assert.equal(body.success, false);
      assert.match(body.message, /max_items|page_size_/);
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
});

test('repeated wrong API keys are throttled before authentication', async () => {
  const app = createHttpApp({ apiKey: 'right-key', env: {}, port: 3000, rateLimit: { limit: 2, windowMs: 60_000 } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools`;
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await fetch(url, { headers: { Authorization: 'Bearer wrong' } })).status);
    assert.deepEqual(statuses, [401, 401, 429, 429]);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
});

test('tool errors do not count against the failed-key throttle', async () => {
  const app = createHttpApp({ apiKey: 'right-key', env: {}, port: 3000, rateLimit: { limit: 100, windowMs: 60_000 }, executeTool: async () => { throw new Error('boom'); } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const tool = enabledTools.keys().next().value as string;
    for (let i = 0; i < 25; i++) {
      assert.equal((await fetch(`${base}/api/tools/${tool}`, { method: 'POST', headers: { Authorization: 'Bearer right-key', 'content-type': 'application/json' }, body: JSON.stringify({ arguments: {} }) })).status, 500);
      assert.equal((await fetch(`${base}/api/tools/doesNotExist`, { method: 'POST', headers: { Authorization: 'Bearer right-key', 'content-type': 'application/json' }, body: '{}' })).status, 404);
    }
    assert.equal((await fetch(`${base}/api/tools`, { headers: { Authorization: 'Bearer right-key' } })).status, 200);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
});
