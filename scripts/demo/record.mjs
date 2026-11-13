#!/usr/bin/env node
// Runs the scripted demo steps against the built MCP server (stdio) and writes out/transcript.json.
// Tool traffic is recorded as it happened; only the user/assistant text comes from lib/steps.mjs.
//
//   POLARION_BASE_URL=http://localhost POLARION_TOKEN=... node scripts/demo/record.mjs [--i-know]
//   node scripts/demo/record.mjs --mock
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CAPTION, DEMO, OUT_DIR, REPO_ROOT, assertLocalTarget, isMain, parseArgs, restBase } from './lib/common.mjs';
import { assertNoSecrets, redact } from './lib/redact.mjs';
import { startMockPolarion } from './lib/mock-polarion.mjs';
import { LIVEDOC_SEC, END_CARD_SEC, buildSteps } from './lib/steps.mjs';

const MOCK_TOKEN = 'mock-token-not-a-secret-0000';

/**
 * Executes the steps and returns the (redacted) transcript object.
 * @param {{ apiBaseUrl: string, token: string, mode: 'mock'|'live', project?: string, entry?: string, timeoutMs?: number }} options
 */
export async function recordTranscript({ apiBaseUrl, token, mode, project = DEMO.project, entry = path.join(REPO_ROOT, 'build', 'index.js'), timeoutMs = 60_000 }) {
  if (!fs.existsSync(entry)) throw new Error(`Built server not found at ${entry}. Run "npm run build" first.`);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    // Minimal environment: the server must not inherit unrelated secrets from the shell.
    env: { PATH: process.env.PATH ?? '', API_BASE_URL: apiBaseUrl, BEARER_TOKEN: token },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'polarion-mcp-demo-recorder', version: '1' }, { capabilities: {} });
  await client.connect(transport);
  const info = client.getServerVersion();
  const steps = [];
  try {
    for (const step of buildSteps(project)) {
      if (step.kind !== 'tool') {
        steps.push({ kind: step.kind, holdSec: step.holdSec, text: step.text });
        continue;
      }
      const started = Date.now();
      let result;
      try {
        const response = await client.callTool({ name: step.tool, arguments: step.args }, undefined, { timeout: timeoutMs });
        result = { isError: Boolean(response.isError), content: response.content ?? [], ...(response.structuredContent ? { structuredContent: response.structuredContent } : {}) };
      } catch (error) {
        result = { isError: true, thrown: error instanceof Error ? error.message : String(error), content: [] };
      }
      steps.push({ kind: 'tool', holdSec: step.holdSec, label: step.label, tool: step.tool, args: step.args, durationMs: Date.now() - started, result });
    }
  } finally {
    await client.close();
  }
  const transcript = {
    schema: 1,
    mode,
    caption: CAPTION,
    generatedAt: new Date().toISOString(),
    server: { name: info?.name ?? 'polarion-mcp', version: info?.version ?? 'unknown' },
    project,
    liveDocSec: LIVEDOC_SEC,
    endCardSec: END_CARD_SEC,
    steps,
  };
  return redact(transcript, [token]);
}

/** Writes the transcript, refusing to if the token survived redaction. */
export function writeTranscript(transcript, outDir, secrets) {
  const serialized = `${JSON.stringify(transcript, null, 2)}\n`;
  assertNoSecrets(serialized, secrets);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'transcript.json');
  fs.writeFileSync(file, serialized);
  return file;
}

function assertTranscriptHealthy(transcript) {
  const tools = transcript.steps.filter(step => step.kind === 'tool');
  const failed = tools.filter(step => step.result.thrown);
  if (failed.length) throw new Error(`Tool call failed: ${failed[0].tool}: ${failed[0].result.thrown}`);
  const write = tools.find(step => step.label === 'write');
  if (!write || write.result.isError) throw new Error(`The real write step failed; the transcript would not show a verified write. First content: ${JSON.stringify(write?.result.content?.[0]?.text ?? '').slice(0, 300)}`);
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(values.out ?? OUT_DIR);
  const mock = flags.has('mock');
  let server;
  let apiBaseUrl;
  let token;
  if (mock) {
    token = MOCK_TOKEN;
    server = await startMockPolarion({ token, project: values.project ?? DEMO.project });
    apiBaseUrl = server.baseUrl;
  } else {
    const baseUrl = process.env.POLARION_BASE_URL;
    token = process.env.POLARION_TOKEN ?? process.env.BEARER_TOKEN ?? '';
    if (!baseUrl || !token) throw new Error('Set POLARION_BASE_URL (e.g. http://localhost) and POLARION_TOKEN, or pass --mock.');
    assertLocalTarget(baseUrl, flags.has('i-know'));
    apiBaseUrl = restBase(baseUrl);
  }
  try {
    const transcript = await recordTranscript({ apiBaseUrl, token, mode: mock ? 'mock' : 'live', project: values.project ?? DEMO.project, timeoutMs: values.timeout ? Number(values.timeout) : undefined });
    assertTranscriptHealthy(transcript);
    const file = writeTranscript(transcript, outDir, [token]);
    console.log(`Wrote ${path.relative(process.cwd(), file)} (${transcript.mode}, ${transcript.steps.filter(s => s.kind === 'tool').length} tool calls)`);
  } finally {
    await server?.close();
  }
}

if (isMain(import.meta.url)) {
  main().catch(error => { console.error(`record: ${error.message}`); process.exit(1); });
}
