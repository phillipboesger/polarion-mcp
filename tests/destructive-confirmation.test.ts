import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createPolarionServer } from '../src/server.js';
import { registerVirtualTool } from '../src/virtual-tools.js';

async function invoke(options: { confirmDestructive?: boolean; capabilities?: Record<string, unknown>; action?: 'accept' | 'decline' | 'cancel'; name?: string; annotations?: Record<string, boolean>; args?: Record<string, unknown> }) {
  let calls = 0;
  let confirmationMessage = '';
  const name = options.name ?? 'confirm_probe';
  const unregister = registerVirtualTool({
    name, title: name, description: 'test', inputSchema: { type: 'object' }, annotations: options.annotations,
    toolset: 'composites', handler: args => { calls++; assert.equal('confirm' in args, false); return { content: [{ type: 'text', text: 'executed' }] }; },
  });
  const server = createPolarionServer({ filter: { toolsets: ['composites'] }, confirmDestructive: options.confirmDestructive });
  const client = new Client({ name: 'confirmation-test', version: '1' }, { capabilities: options.capabilities as never });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  if (options.capabilities?.elicitation) {
    client.setRequestHandler(ElicitRequestSchema, async request => { confirmationMessage = request.params.message; return { action: options.action ?? 'accept', content: { confirm: options.action !== 'decline' } }; });
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = await client.callTool({ name, arguments: options.args ?? {} });
    return { result, calls, confirmationMessage };
  } finally {
    await Promise.all([client.close(), server.close()]);
    unregister();
  }
}

test('elicitation accept executes and decline/cancel never execute', async () => {
  const caps = { elicitation: { form: {} } };
  const accepted = await invoke({ confirmDestructive: true, capabilities: caps, name: 'delete_probe' });
  assert.equal(accepted.calls, 1);
  assert.equal(accepted.result.isError, undefined);
  const declined = await invoke({ confirmDestructive: true, capabilities: caps, action: 'decline', name: 'delete_probe' });
  assert.equal(declined.calls, 0);
  assert.match((declined.result.content as Array<{ text: string }>)[0].text, /declined/);
  const cancelled = await invoke({ confirmDestructive: true, capabilities: caps, action: 'cancel', name: 'patchAll_probe' });
  assert.equal(cancelled.calls, 0);
  assert.match((cancelled.result.content as Array<{ text: string }>)[0].text, /cancelled/);
});

test('clients without elicitation can confirm in one step and receive preview guidance', async () => {
  const blocked = await invoke({ confirmDestructive: true, capabilities: {}, name: 'bulk_probe' });
  assert.equal(blocked.calls, 0);
  assert.equal(blocked.result.isError, true);
  assert.equal((blocked.result.content as Array<{ text: string }>)[0].text, 'This destructive tool requires confirmation; repeat the call with confirm: true; use dry_run: true first to preview.');
  const confirmed = await invoke({ confirmDestructive: true, capabilities: {}, name: 'bulk_probe', args: { confirm: true } });
  assert.equal(confirmed.calls, 1);
});

test('dry_run on a destructive virtual tool without preview support still requires confirmation', async () => {
  const result = await invoke({ confirmDestructive: true, capabilities: {}, name: 'bulk_probe', args: { dry_run: true } });
  assert.equal(result.calls, 0);
  assert.equal(result.result.isError, true);
});

test('confirmation summary preserves path keys and redacts credential keys', async () => {
  const result = await invoke({ confirmDestructive: true, capabilities: { elicitation: { form: {} } }, name: 'delete_probe', args: { path: '/projects/P', pat: 'sensitive-pat', accessToken: 'sensitive-token' } });
  assert.match(result.confirmationMessage, /"path":"\/projects\/P"/);
  assert.match(result.confirmationMessage, /"pat":"\[REDACTED\]"/);
  assert.match(result.confirmationMessage, /"accessToken":"\[REDACTED\]"/);
  assert.equal(result.confirmationMessage.includes('sensitive-'), false);
});

test('read-only tools never prompt and the flag-off default preserves execution', async () => {
  const readOnly = await invoke({ confirmDestructive: true, capabilities: { elicitation: { form: {} } }, name: 'bulk_read', annotations: { readOnlyHint: true } });
  assert.equal(readOnly.calls, 1);
  assert.equal(readOnly.result.isError, undefined);
  const disabled = await invoke({ confirmDestructive: false, capabilities: {}, name: 'delete_legacy' });
  assert.equal(disabled.calls, 1);
  assert.equal(disabled.result.isError, undefined);
});
