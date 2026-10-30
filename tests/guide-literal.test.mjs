// Guide-literal tests: take each local snippet from docs/clients.json, parse it the way its client
// would, start exactly the documented command/args/env and talk MCP to it against a stub Polarion.
// The only substitutions are the documented placeholders and `npx -y polarion-mcp` -> this checkout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { manifest, PAT, parseLocal, fromCli, fromToml, startStub, userStub, run } from './lib/guide-literal.mjs';

const localClients = manifest.clients.filter(client => !client.local.reason);

test('every local client has a parseable snippet that starts the server and returns the user (stub)', async t => {
  assert.ok(localClients.length >= 8);
  for (const client of localClients) {
    await t.test(client.id, async () => {
      const stub = await startStub(userStub);
      try {
        const { tools, result, text } = await run(parseLocal(client), `http://127.0.0.1:${stub.port}/polarion/rest/v1`);
        assert.ok(tools.some(tool => tool.name === 'getCurrentUser'));
        assert.notEqual(result.isError, true, text);
        assert.match(text, /stub-user/);
        assert.deepEqual(stub.seen.at(-1), { url: '/polarion/rest/v1/user', authorization: `Bearer ${PAT}` });
      } finally { await stub.stop(); }
    });
  }
});

test('the Codex config.toml alternative starts the same server', async () => {
  const codex = manifest.clients.find(client => client.id === 'codex-cli');
  assert.deepEqual(fromToml(codex.local.snippet), fromCli(codex.local.snippet));
});

test('failures show the symptoms the guides tell people to look for', async () => {
  const entryConfig = parseLocal(manifest.clients.find(client => client.id === 'generic-stdio'));
  const stub = await startStub(userStub);
  try {
    const wrongPat = await run(entryConfig, `http://127.0.0.1:${stub.port}/polarion/rest/v1`, 'wrong-pat');
    assert.equal(wrongPat.result.isError, true);
    assert.match(wrongPat.text, /401|did not accept/i);
  } finally { await stub.stop(); }
  const missing = await startStub((_req, res) => { res.statusCode = 404; res.end('Not Found'); });
  try {
    const rest = await run(entryConfig, `http://127.0.0.1:${missing.port}/polarion/rest/v1`);
    assert.equal(rest.result.isError, true);
    assert.match(rest.text, /404/);
  } finally { await missing.stop(); }
  const closed = await startStub(userStub);
  const deadPort = closed.port;
  await closed.stop();
  const wrongUrl = await run(entryConfig, `http://127.0.0.1:${deadPort}/polarion/rest/v1`);
  assert.equal(wrongUrl.result.isError, true);
  assert.match(wrongUrl.text, /503|could not be reached|ECONNREFUSED/i);
});
