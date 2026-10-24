import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { LookupFunction } from 'node:net';
import type { LookupAddress } from 'node:dns';
import type { VirtualTool, VirtualToolContext } from './virtual-tools.js';
import { registerVirtualTool } from './virtual-tools.js';
import { resolvePublicHost, type SsrfResolver } from './ssrf.js';

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export interface UploadConfig {
  roots?: string;
  maxBytes?: string;
  urlHosts?: string;
  allowHttp?: string;
}

export interface AttachmentFetchTestOptions {
  resolver?: SsrfResolver;
  allowPrivateIps?: boolean;
  timeoutMs?: number;
}

function envConfig(): UploadConfig {
  return { roots: process.env.MCP_UPLOAD_ROOTS, maxBytes: process.env.MCP_UPLOAD_MAX_BYTES, urlHosts: process.env.MCP_UPLOAD_URL_HOSTS, allowHttp: process.env.MCP_UPLOAD_ALLOW_HTTP };
}

function maxBytesFrom(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_MAX_BYTES;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error('MCP_UPLOAD_MAX_BYTES must be a positive integer');
  return parsed;
}

function parseHostAllowlist(value: string | undefined): Set<string> {
  return new Set((value ?? '').split(',').map(host => host.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean));
}

function safeFileName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.includes('/') || value.includes('\\') || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || value === '.' || value === '..') {
    throw new Error('fileName must be a non-empty filename without path separators or control characters');
  }
  return value;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

async function readLocalFile(filePath: unknown, rootsValue: string | undefined, maxBytes: number): Promise<{ bytes: Buffer; defaultName: string }> {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('filePath must be an absolute path');
  if (filePath.split(path.sep).includes('..')) throw new Error('filePath traversal is not allowed');
  const roots = (rootsValue ?? '').split(',').map(root => root.trim()).filter(Boolean);
  if (!roots.length) throw new Error('Local file upload is disabled; configure MCP_UPLOAD_ROOTS with one or more absolute directories');
  if (roots.some(root => !path.isAbsolute(root))) throw new Error('Every MCP_UPLOAD_ROOTS entry must be an absolute directory');
  const [resolvedFile, resolvedRoots] = await Promise.all([realpath(filePath), Promise.all(roots.map(root => realpath(root)))]);
  if (!resolvedRoots.some(root => inside(root, resolvedFile))) throw new Error('filePath is outside MCP_UPLOAD_ROOTS');
  const info = await stat(resolvedFile);
  if (!info.isFile()) throw new Error('filePath must refer to a regular file');
  if (info.size > maxBytes) throw new Error(`File exceeds the ${maxBytes}-byte upload limit`);
  return { bytes: await readBoundedFile(resolvedFile, maxBytes), defaultName: path.basename(resolvedFile) };
}

async function readBoundedFile(filePath: string, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  const handle = await open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  await new Promise<void>((resolve, reject) => {
    const stream = handle.createReadStream();
    stream.on('data', (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > maxBytes) { stream.destroy(new Error(`File exceeds the ${maxBytes}-byte upload limit`)); return; }
      chunks.push(bytes);
    });
    stream.once('error', reject);
    stream.once('end', resolve);
  });
  return Buffer.concat(chunks);
}

function requestOnce(url: URL, addresses: readonly LookupAddress[], deadline: number, limit: number): Promise<{ status: number; location?: string; bytes: Buffer }> {
  return new Promise((resolve, reject) => {
    const requestFn = url.protocol === 'https:' ? https.request : http.request;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, addresses.map(({ address, family }) => ({ address, family })));
      else callback(null, addresses[0].address, addresses[0].family);
    };
    let settled = false;
    const finish = (error?: Error, result?: { status: number; location?: string; bytes: Buffer }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(result!);
    };
    const req = requestFn(url, { method: 'GET', headers: { accept: '*/*' }, agent: false, lookup: pinnedLookup, ...(url.protocol === 'https:' ? { servername: url.hostname } : {}) }, (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;
      const length = Number(res.headers['content-length']);
      if (Number.isFinite(length) && length > limit) { res.destroy(); finish(new Error(`URL response exceeds the ${limit}-byte upload limit`)); return; }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer | string) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += data.length;
        if (size > limit) { res.destroy(); finish(new Error(`URL response exceeds the ${limit}-byte upload limit`)); return; }
        chunks.push(data);
      });
      res.once('error', error => finish(error));
      res.once('end', () => finish(undefined, { status, location: res.headers.location, bytes: Buffer.concat(chunks) }));
    });
    const timer = setTimeout(() => req.destroy(new Error('URL download timed out after 15 seconds')), Math.max(1, deadline - Date.now()));
    timer.unref();
    req.once('error', error => finish(error));
    req.end();
  });
}

/** Fetches a URL with per-hop allowlist and public-address validation, bounded redirects and size. */
export async function fetchAttachmentUrl(rawUrl: string, config: UploadConfig = envConfig(), testOptions: AttachmentFetchTestOptions = {}): Promise<{ bytes: Buffer; defaultName: string }> {
  const allowedHosts = parseHostAllowlist(config.urlHosts);
  if (!allowedHosts.size) throw new Error('URL upload is disabled; configure MCP_UPLOAD_URL_HOSTS with allowed hostnames');
  const allowHttp = config.allowHttp?.trim().toLowerCase() === 'true';
  const maxBytes = maxBytesFrom(config.maxBytes);
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('url must be a valid absolute URL'); }
  const deadline = Date.now() + (testOptions.timeoutMs ?? FETCH_TIMEOUT_MS);
  for (let redirects = 0; ; redirects++) {
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) throw new Error('URL upload requires HTTPS (HTTP requires MCP_UPLOAD_ALLOW_HTTP=true)');
    if (url.username || url.password || url.hash) throw new Error('URL must not contain credentials or a fragment');
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!allowedHosts.has(hostname)) throw new Error('URL host is not in MCP_UPLOAD_URL_HOSTS');
    const addresses = await withDeadline(testOptions.allowPrivateIps
      ? resolveHostForTest(url, testOptions.resolver)
      : resolvePublicHost(url, testOptions.resolver), deadline);
    const response = await requestOnce(url, addresses, deadline, maxBytes);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location) throw new Error('URL redirect did not include a Location header');
      if (redirects >= MAX_REDIRECTS) throw new Error('URL redirect limit of 3 was exceeded');
      try { url = new URL(response.location, url); } catch { throw new Error('URL redirect target is invalid'); }
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`URL download returned HTTP ${response.status}`);
    return { bytes: response.bytes, defaultName: path.basename(decodeURIComponent(url.pathname)) || 'upload' };
  }
}

function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new Error('URL download timed out after 15 seconds'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('URL download timed out after 15 seconds')), remaining);
    timer.unref();
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error instanceof Error ? error : new Error('URL host validation failed')); });
  });
}

async function resolveHostForTest(url: URL, resolver?: SsrfResolver): Promise<readonly LookupAddress[]> {
  const { lookup } = await import('node:dns/promises');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const ipaddr = await import('ipaddr.js');
  if (ipaddr.default.isValid(host)) return [{ address: host, family: ipaddr.default.parse(host).kind() === 'ipv6' ? 6 : 4 }];
  return resolver ? resolver(host) : lookup(host, { all: true, verbatim: true });
}

function attachmentToolInput(target: Record<string, unknown>, fileName: string, title: unknown, bytes: Buffer): { tool: string; args: Record<string, unknown> } {
  const type = target.type;
  let tool: string;
  let pathArgs: Record<string, unknown>;
  let resourceType: string;
  if (type === 'work_item') { tool = 'postWorkItemAttachments'; resourceType = 'workitem_attachments'; pathArgs = { projectId: target.projectId, workItemId: target.id }; }
  else if (type === 'test_run') { tool = 'postTestRunAttachments'; resourceType = 'testrun_attachments'; pathArgs = { projectId: target.projectId, testRunId: target.id }; }
  else if (type === 'document') { tool = 'postDocumentItemAttachments'; resourceType = 'document_attachments'; pathArgs = { projectId: target.projectId, spaceId: target.spaceId, documentName: target.id }; }
  else if (type === 'page') { tool = 'postPageAttachments'; resourceType = 'page_attachments'; pathArgs = { projectId: target.projectId, spaceId: target.spaceId, pageName: target.id }; }
  else throw new Error('target.type must be work_item, test_run, document, or page');
  for (const [key, value] of Object.entries(pathArgs)) if (typeof value !== 'string' || !value) throw new Error(`target.${key} is required for ${String(type)}`);
  const attributes: Record<string, unknown> = { fileName };
  if (typeof title === 'string' && title.length) attributes.title = title;
  return { tool, args: { ...pathArgs, requestBody: { resource: { data: [{ type: resourceType, lid: '1', attributes }] }, files: [bytes.toString('base64')] } } };
}

export function createUploadAttachmentTool(configProvider: () => UploadConfig = envConfig, fetchOptions: AttachmentFetchTestOptions = {}): VirtualTool {
  return {
    name: 'upload_attachment', title: 'Upload attachment', toolset: 'composites',
    description: 'Uploads one file from an allowed local path (stdio only) or an allowlisted URL to a Polarion work item, test run, document, or page. Use dry_run to preview the file name, size, and SHA-256 without uploading.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {
    target: { type: 'object', additionalProperties: false, properties: {
      type: { type: 'string', enum: ['work_item', 'test_run', 'document', 'page'] }, projectId: { type: 'string' }, id: { type: 'string' }, spaceId: { type: 'string' },
    }, required: ['type', 'projectId', 'id'], description: 'Polarion reference. Documents and pages also require spaceId.' },
    filePath: { type: 'string', description: 'Absolute local path. Available only on stdio when MCP_UPLOAD_ROOTS is configured.' },
    url: { type: 'string', description: 'HTTPS URL on a hostname listed in MCP_UPLOAD_URL_HOSTS.' },
    fileName: { type: 'string' }, title: { type: 'string' }, dry_run: { type: 'boolean', default: false },
    }, required: ['target'] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async handler(args, ctx: VirtualToolContext) {
    try {
      const hasPath = args.filePath !== undefined;
      const hasUrl = args.url !== undefined;
      if (hasPath === hasUrl) throw new Error('Provide exactly one of filePath or url');
      if (!args.target || typeof args.target !== 'object' || Array.isArray(args.target)) throw new Error('target must be an object');
      const config = configProvider();
      const maxBytes = maxBytesFrom(config.maxBytes);
      let file: { bytes: Buffer; defaultName: string };
      if (hasPath) {
        if (ctx.transport !== 'stdio') throw new Error('filePath uploads are available only on the stdio transport; remote servers cannot read your local disk');
        file = await readLocalFile(args.filePath, config.roots, maxBytes);
      } else {
        file = await fetchAttachmentUrl(String(args.url), config, fetchOptions);
      }
      const fileName = safeFileName(args.fileName) ?? file.defaultName;
      const sha256 = createHash('sha256').update(file.bytes).digest('hex');
      const request = attachmentToolInput(args.target as Record<string, unknown>, fileName, args.title, file.bytes);
      if (args.dry_run === true) return { content: [{ type: 'text', text: JSON.stringify({ wouldUpload: true, fileName, size: file.bytes.length, sha256, target: args.target }) }] };
      return await ctx.callPolarionTool(request.tool, request.args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attachment upload failed';
      ctx.logger.warn(`upload_attachment failed: ${message}`);
      return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
    }
    },
  };
}

export const uploadAttachment = createUploadAttachmentTool();

registerVirtualTool(uploadAttachment);
