import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('cloud instructions distinguish real Polarion URLs from local development networking', () => {
  const guide = readFileSync('docs/guides/server-docker.md', 'utf8');
  const sections = guide.split(/^### /m).filter(section => section.includes('host.docker.internal'));
  assert.equal(sections.length, 1);
  assert.match(sections[0], /^[^\n]*development only/i);
  assert.match(sections[0], /ALLOWED_HOSTS/);
  const urls = [...guide.matchAll(/https:\/\/[^\s`"<>]+/g)].map(match => new URL(match[0]));
  assert.ok(urls.some(url => url.hostname === 'polarion.mycompany.com' && url.pathname === '/polarion/rest/v1'));
  assert.doesNotMatch(guide, /Skip this on your own laptop/);
  for (const file of ['docs/clients.json', 'docs/configuration.md', 'docs/deployment.md', 'docs/guides/server-docker.md']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /POLARION_ALLOWED_HOSTS/);
  }
});

test('the documented container probe accepts metadata and rejects SSO, redirects and failures', async () => {
  const docs = readFileSync('docs/troubleshooting.md', 'utf8');
  const code = /docker exec -i polarion-mcp node --input-type=module -e '\r?\n([\s\S]*?)\r?\n'/.exec(docs)?.[1];
  assert.ok(code, 'the published Node probe must be executable');
  const secret = 'private-probe-test-pat';
  let mode = 'metadata';
  let loginRequests = 0;
  const server = createServer((req, res) => {
    if (req.url === '/login') { loginRequests++; res.end('<html>SSO</html>'); return; }
    assert.equal(req.headers.authorization, `Bearer ${secret}`);
    if (mode === 'redirect') { res.writeHead(302, { location: '/login' }).end(); return; }
    if (mode === 'html') { res.writeHead(200, { 'content-type': 'text/html' }).end('<html>SSO</html>'); return; }
    res.writeHead(mode === 'metadata' ? 200 : Number(mode), { 'content-type': 'application/json' });
    res.end(JSON.stringify(mode === 'metadata' ? { data: { type: 'metadata', id: 'metadata' } } : { errors: [{ detail: secret }] }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    for (mode of ['metadata', 'html', 'redirect', '400', '401', '403', '404', '503']) {
      const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
        env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${server.address().port}/polarion/rest/v1/` },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.stdin.end(secret);
      const [exitCode] = await once(child, 'close');
      assert.equal(exitCode, mode === 'metadata' ? 0 : 1, `${mode}: ${output}`);
      assert.doesNotMatch(output, new RegExp(secret));
      assert.match(output, /Polarion metadata HTTP/);
    }
    assert.equal(loginRequests, 0, 'the PAT must not be forwarded to an SSO redirect');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
