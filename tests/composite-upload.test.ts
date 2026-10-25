import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import type { VirtualToolContext } from '../src/virtual-tools.js';
import { createUploadAttachmentTool, fetchAttachmentUrl } from '../src/composite-upload.js';

const target = { type: 'work_item', projectId: 'P', id: 'WI-1' };
function context(transport: 'stdio' | 'http', calls: Array<{ name: string; args: Record<string, unknown> }> = []): VirtualToolContext {
  return { transport, callPolarionTool: async (name, args) => { calls.push({ name, args }); return { content: [{ type: 'text', text: 'uploaded' }] }; }, signal: new AbortController().signal, apiBaseUrl: 'https://polarion.test', logger: { debug() {}, info() {}, warn() {}, error() {} }, reportProgress: async () => undefined };
}
async function tempDir() { return mkdtemp(path.join(tmpdir(), 'polarion-upload-')); }
async function localServer(handler: http.RequestListener) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = (server.address() as AddressInfo).port;
  return { server, url: `http://localhost:${port}/file.bin`, close: async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}

test('upload_attachment reads an allowed file and calls the expected multipart tool without requiring prompt base64', async () => {
  const dir = await tempDir();
  try {
    const file = path.join(dir, 'a.txt'); await writeFile(file, 'hello');
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const tool = createUploadAttachmentTool(() => ({ roots: dir }));
    const result = await tool.handler({ target, filePath: file, title: 'Spec' }, context('stdio', calls));
    assert.equal(calls.length, 1); assert.equal(calls[0].name, 'postWorkItemAttachments');
    const body = calls[0].args.requestBody as { resource: { data: Array<{ type: string; lid?: string; attributes: Record<string, unknown> }> }; files: string[] };
    assert.equal(body.resource.data[0].type, 'workitem_attachments'); assert.equal(body.resource.data[0].attributes.fileName, 'a.txt');
    assert.equal(body.resource.data[0].lid, undefined);
    assert.equal(body.resource.data[0].attributes.title, 'Spec'); assert.equal(Buffer.from(body.files[0], 'base64').toString(), 'hello');
    assert.equal((result.content[0] as { text: string }).text, 'uploaded');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('URL mode downloads from a local fixture and uploads its bytes', async () => {
  const fixture = await localServer((_req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end('from-url'); });
  try {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const tool = createUploadAttachmentTool(() => ({ urlHosts: 'localhost', allowHttp: 'true' }), { allowPrivateIps: true, resolver: async () => [{ address: '127.0.0.1', family: 4 }] });
    await tool.handler({ target, url: fixture.url }, context('http', calls));
    assert.equal(calls.length, 1); assert.equal(calls[0].name, 'postWorkItemAttachments');
    const body = calls[0].args.requestBody as { files: string[]; resource: { data: Array<{ attributes: { fileName: string } }> } };
    assert.equal(Buffer.from(body.files[0], 'base64').toString(), 'from-url'); assert.equal(body.resource.data[0].attributes.fileName, 'file.bin');
  } finally { await fixture.close(); }
});

test('dry_run returns name, byte length, and SHA-256 without calling Polarion', async () => {
  const dir = await tempDir();
  try {
    const file = path.join(dir, 'a.txt'); await writeFile(file, 'hello');
    const calls: unknown[] = [];
    const result = await createUploadAttachmentTool(() => ({ roots: dir })).handler({ target, filePath: file, dry_run: true }, context('stdio', calls as never));
    assert.equal(calls.length, 0); assert.match((result.content[0] as { text: string }).text, /"size":5/); assert.match((result.content[0] as { text: string }).text, /2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upload target is validated before attempting to read the source', async () => {
  const tool = createUploadAttachmentTool(() => ({}));
  const result = await tool.handler({ target: { type: 'document', projectId: 'P', id: 'D' }, filePath: '/missing/file' }, context('stdio'));
  assert.equal(result.isError, true);
  assert.match((result.content[0] as { text: string }).text, /target\.spaceId is required/);
});

test('upload_attachment preserves upstream API errors', async () => {
  const dir = await tempDir();
  try {
    const file = path.join(dir, 'a.txt'); await writeFile(file, 'hello');
    const tool = createUploadAttachmentTool(() => ({ roots: dir }));
    const ctx = context('stdio');
    ctx.callPolarionTool = async () => ({ isError: true, content: [{ type: 'text', text: 'upload failed' }] });
    const result = await tool.handler({ target, filePath: file }, ctx);
    assert.equal(result.isError, true);
    assert.match((result.content[0] as { text: string }).text, /upload failed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('maps supported attachment targets to the matching existing multipart operations', async () => {
  const dir = await tempDir();
  try {
    const file = path.join(dir, 'a.bin'); await writeFile(file, 'x');
    const cases = [
      [{ type: 'test_run', projectId: 'P', id: 'TR-1' }, 'postTestRunAttachments', 'testRunId'],
      [{ type: 'document', projectId: 'P', spaceId: 'S', id: 'DOC-1' }, 'postDocumentItemAttachments', 'documentName'],
      [{ type: 'page', projectId: 'P', spaceId: 'S', id: 'PAGE-1' }, 'postPageAttachments', 'pageName'],
    ] as const;
    for (const [targetRef, expectedTool, expectedArg] of cases) {
      const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
      await createUploadAttachmentTool(() => ({ roots: dir })).handler({ target: targetRef, filePath: file }, context('stdio', calls));
      assert.equal(calls[0].name, expectedTool); assert.equal(calls[0].args[expectedArg], targetRef.id);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file path mode is off by default and rejects HTTP transport', async () => {
  const dir = await tempDir(); const file = path.join(dir, 'a'); await writeFile(file, 'x');
  try {
    const disabled = await createUploadAttachmentTool(() => ({})).handler({ target, filePath: file }, context('stdio'));
    assert.match((disabled.content[0] as { text: string }).text, /disabled/);
    const remote = await createUploadAttachmentTool(() => ({ roots: dir })).handler({ target, filePath: file }, context('http'));
    assert.match((remote.content[0] as { text: string }).text, /only on the stdio transport/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file path validation rejects relative paths, traversal, outside-root, directories, symlink escapes, and oversize files', async () => {
  const root = await tempDir(); const outside = await tempDir();
  const prefixEscape = path.join(path.dirname(root), `${path.basename(root).toUpperCase()}-escape`);
  try {
    const file = path.join(root, 'file'); await writeFile(file, '12345');
    const dir = path.join(root, 'directory'); await mkdir(dir);
    const outsideFile = path.join(outside, 'secret'); await writeFile(outsideFile, 'x');
    await mkdir(prefixEscape);
    const prefixEscapeFile = path.join(prefixEscape, 'secret'); await writeFile(prefixEscapeFile, 'x');
    await symlink(outsideFile, path.join(root, 'escape'));
    const invoke = (filePath: string, maxBytes?: string) => createUploadAttachmentTool(() => ({ roots: root, maxBytes })).handler({ target, filePath }, context('stdio'));
    for (const [value, pattern] of [['relative', /absolute/], [`${root}/../secret`, /traversal/], [outsideFile, /outside/], [prefixEscapeFile, /outside/], [dir, /regular file/], [path.join(root, 'escape'), /outside/]] as const) {
      const result = await invoke(value); assert.equal(result.isError, true); assert.match((result.content[0] as { text: string }).text, pattern);
    }
    const missing = await invoke(path.join(outside, 'does-not-exist')); const present = await invoke(outsideFile);
    assert.equal((missing.content[0] as { text: string }).text, (present.content[0] as { text: string }).text);
    const large = await invoke(file, '4'); assert.match((large.content[0] as { text: string }).text, /exceeds/);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); await rm(prefixEscape, { recursive: true, force: true }); }
});

test('URL allowlist, scheme, and redirects are checked on every hop', async () => {
  const fixture = await localServer((_req, res) => { res.writeHead(302, { location: 'http://127.0.0.1/private' }); res.end(); });
  try {
    await assert.rejects(fetchAttachmentUrl('http://localhost/file', {}), /disabled/);
    await assert.rejects(fetchAttachmentUrl('http://localhost/file', { urlHosts: 'localhost' }), /HTTPS/);
    await assert.rejects(fetchAttachmentUrl('https://example.com/a', { urlHosts: 'other.example' }), /not in/);
    await assert.rejects(fetchAttachmentUrl(fixture.url, { urlHosts: 'localhost', allowHttp: 'true' }, { allowPrivateIps: true, resolver: async () => [{ address: '127.0.0.1', family: 4 }] }), /not in/);
    await assert.rejects(fetchAttachmentUrl('http://127.0.0.1/', { urlHosts: '127.0.0.1', allowHttp: 'true' }), /non-public/);
    await assert.rejects(fetchAttachmentUrl('http://2130706433/', { urlHosts: '127.0.0.1', allowHttp: 'true' }), /non-public/);
  } finally { await fixture.close(); }
});

test('URL retrieval rejects private IPv4, IPv6 loopback, link-local, redirect loops, oversize streams, and timeouts', async () => {
  for (const address of ['127.0.0.1', '[::1]', '169.254.169.254']) {
    await assert.rejects(fetchAttachmentUrl(`https://${address}/x`, { urlHosts: address }), /non-public/);
  }
  const loop = await localServer((_req, res) => { res.writeHead(302, { location: '/loop' }); res.end(); });
  const big = await localServer((_req, res) => { res.writeHead(200); res.write(Buffer.alloc(20)); res.end(); });
  const slow = await localServer((_req, res) => { setTimeout(() => res.end('late'), 100); });
  const testOptions = { allowPrivateIps: true, resolver: async () => [{ address: '127.0.0.1', family: 4 }] };
  try {
    const cfg = { urlHosts: 'localhost', allowHttp: 'true' };
    await assert.rejects(fetchAttachmentUrl(loop.url, cfg, testOptions), /redirect limit/);
    await assert.rejects(fetchAttachmentUrl(big.url, { ...cfg, maxBytes: '10' }, testOptions), /exceeds/);
    await assert.rejects(fetchAttachmentUrl(slow.url, cfg, { ...testOptions, timeoutMs: 20 }), /timed out/);
  } finally { await loop.close(); await big.close(); await slow.close(); }
});

test('URL responses require successful status and reject credential-bearing URLs', async () => {
  const fixture = await localServer((_req, res) => { res.writeHead(404); res.end('no'); });
  try {
    const cfg = { urlHosts: 'localhost', allowHttp: 'true' };
    await assert.rejects(fetchAttachmentUrl(fixture.url, cfg, { allowPrivateIps: true, resolver: async () => [{ address: '127.0.0.1', family: 4 }] }), /HTTP 404/);
    await assert.rejects(fetchAttachmentUrl('http://user:pass@localhost/a', cfg), /credentials/);
  } finally { await fixture.close(); }
});
