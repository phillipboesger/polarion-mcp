/** SSRF-safe retrieval and bounded caching for OAuth Client ID Metadata Documents. */

import { lookup as dnsLookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { LookupFunction } from 'node:net';
import ipaddr from 'ipaddr.js';

const MAX_DOCUMENT_BYTES = 64 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export interface CimdClientMetadata {
  client_id: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none';
  client_name?: string;
}

export type CimdMetadataFetcher = (clientId: string) => Promise<CimdClientMetadata>;

export type CimdResolver = (hostname: string) => Promise<readonly LookupAddress[]>;

/**
 * Test seams are explicit arguments and are never populated from environment
 * configuration. Production must use the defaults and validate every address.
 */
export interface CimdFetchOptions {
  resolver?: CimdResolver;
  /** Test-only: permits private addresses for a local HTTPS fixture. */
  testOnlyAllowPrivateIps?: boolean;
  /** Test-only CA used to trust the local HTTPS fixture certificate. */
  testOnlyCa?: string | Buffer;
  /** Test-only socket remap; the validated client identifier still uses port 443. */
  testOnlyConnectPort?: number;
  /** Test-only shorter deadline for timeout tests; production default is 5 s. */
  testOnlyTimeoutMs?: number;
}

interface FetchResult {
  metadata: CimdClientMetadata;
  cacheTtlMs: number;
}

interface CacheEntry {
  metadata: CimdClientMetadata;
  expiresAt: number;
}

/** Checks whether an address is safe to connect to as a public Internet host. */
export function isPublicCimdAddress(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address.replace(/^\[|\]$/g, ''));
    if (parsed.kind() === 'ipv6') {
      const ipv6 = parsed as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
    }
    // ipaddr.js uses real byte parsing and marks special-purpose ranges (private,
    // loopback, link-local, CGNAT, multicast, unspecified and reserved) separately.
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

/** Validates a CIMD URL before DNS lookup or network access. */
export function parseClientIdentifierUrl(clientId: string): URL {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    throw new Error('Invalid client identifier URL');
  }
  if (url.protocol !== 'https:' || (url.port !== '' && url.port !== '443') || url.username || url.password || url.hash) {
    throw new Error('Client identifier URL must use HTTPS on port 443 without userinfo or a fragment');
  }
  return url;
}

/** Fetches and validates one metadata document without caching it. */
export async function fetchClientMetadataDocument(clientId: string, options: CimdFetchOptions = {}): Promise<CimdClientMetadata> {
  return (await fetchDocument(clientId, options)).metadata;
}

/** Creates a bounded, URL-keyed metadata cache around the SSRF-safe fetcher. */
export function createCimdMetadataFetcher(options: CimdFetchOptions = {}): CimdMetadataFetcher {
  const cache = new Map<string, CacheEntry>();
  return async (clientId: string): Promise<CimdClientMetadata> => {
    const cached = cache.get(clientId);
    if (cached && cached.expiresAt > Date.now()) {
      cache.delete(clientId);
      cache.set(clientId, cached);
      return cached.metadata;
    }
    if (cached) cache.delete(clientId);

    const result = await fetchDocument(clientId, options);
    if (result.cacheTtlMs > 0) {
      cache.set(clientId, { metadata: result.metadata, expiresAt: Date.now() + result.cacheTtlMs });
      while (cache.size > MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
    return result.metadata;
  };
}

const defaultCimdMetadataFetcher = createCimdMetadataFetcher();

/** Shared production fetcher; its cache contains no authorization or user state. */
export const fetchClientMetadata: CimdMetadataFetcher = defaultCimdMetadataFetcher;

async function fetchDocument(clientId: string, options: CimdFetchOptions): Promise<FetchResult> {
  const url = parseClientIdentifierUrl(clientId);
  const timeoutMs = options.testOnlyTimeoutMs ?? FETCH_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const resolved = await withDeadline(
    ipaddr.isValid(hostname)
      ? Promise.resolve([{ address: hostname, family: ipaddr.parse(hostname).kind() === 'ipv6' ? 6 : 4 }])
      : (options.resolver ?? (host => dnsLookup(host, { all: true, verbatim: true })))(hostname),
    deadline
  );
  if (resolved.length === 0) throw new Error('Client identifier hostname resolved to no addresses');
  for (const entry of resolved) {
    if (!ipaddr.isValid(entry.address)) throw new Error('Client identifier hostname resolved to an invalid IP address');
    if (!options.testOnlyAllowPrivateIps && !isPublicCimdAddress(entry.address)) {
      throw new Error('Client identifier hostname resolved to a non-public address');
    }
  }

  const response = await requestDocument(url, resolved, deadline, options.testOnlyCa, options.testOnlyConnectPort);
  if (response.statusCode !== 200) {
    throw new Error(response.statusCode >= 300 && response.statusCode < 400
      ? 'Client metadata redirects are not followed'
      : `Client metadata fetch must return HTTP 200 (received ${response.statusCode})`);
  }
  const contentType = response.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new Error('Client metadata content-type must be application/json');
  if (response.body.length > MAX_DOCUMENT_BYTES) throw new Error('Client metadata document exceeds the 64 KiB limit');

  let value: unknown;
  try {
    value = JSON.parse(response.body.toString('utf8')) as unknown;
  } catch {
    throw new Error('Client metadata document is not valid JSON');
  }
  const metadata = validateMetadata(value, clientId);
  return { metadata, cacheTtlMs: cacheLifetime(response.headers['cache-control']) };
}

interface CimdResponse {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

function requestDocument(url: URL, addresses: readonly LookupAddress[], deadline: number, ca?: string | Buffer, connectPort?: number): Promise<CimdResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => request.destroy(new Error('Client metadata fetch timed out')), Math.max(1, deadline - Date.now()));
    timer.unref();

    const pinnedLookup: LookupFunction = (_hostname, lookupOptions, callback) => {
      const selected = addresses[0];
      if (lookupOptions.all) {
        callback(null, addresses.map(({ address, family }) => ({ address, family })));
      } else {
        callback(null, selected.address, selected.family);
      }
    };
    const request = https.request(url, {
      method: 'GET',
      ...(connectPort ? { port: connectPort } : {}),
      headers: { accept: 'application/json' },
      agent: false,
      lookup: pinnedLookup,
      ...(ca ? { ca } : {}),
    }, response => {
      const statusCode = response.statusCode ?? 0;
      const length = Number(response.headers['content-length']);
      if (Number.isFinite(length) && length > MAX_DOCUMENT_BYTES) {
        response.destroy();
        finishReject(new Error('Client metadata document exceeds the 64 KiB limit'));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_DOCUMENT_BYTES) {
          response.destroy();
          finishReject(new Error('Client metadata document exceeds the 64 KiB limit'));
          return;
        }
        chunks.push(buffer);
      });
      response.once('error', error => finishReject(error));
      response.once('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ statusCode, headers: response.headers, body: Buffer.concat(chunks) });
      });
    });
    request.once('error', error => finishReject(error));
    request.end();
  });
}

function validateMetadata(value: unknown, clientId: string): CimdClientMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Client metadata document must be a JSON object');
  const document = value as Record<string, unknown>;
  if (document.client_id !== clientId) throw new Error('Client metadata client_id must exactly match the requested URL');
  if (!Array.isArray(document.redirect_uris) || document.redirect_uris.length === 0
    || document.redirect_uris.some(uri => typeof uri !== 'string' || !URL.canParse(uri))) {
    throw new Error('Client metadata redirect_uris must contain one or more absolute URLs');
  }
  if (document.client_secret !== undefined || document.client_secret_expires_at !== undefined) {
    throw new Error('Client metadata must not contain client_secret or client_secret_expires_at');
  }
  const authMethod = document.token_endpoint_auth_method ?? 'none';
  if (authMethod !== 'none') throw new Error('Client metadata token_endpoint_auth_method is unsupported');
  if (document.client_name !== undefined && typeof document.client_name !== 'string') {
    throw new Error('Client metadata client_name must be a string');
  }
  return {
    client_id: clientId,
    redirect_uris: document.redirect_uris as string[],
    token_endpoint_auth_method: 'none',
    ...(typeof document.client_name === 'string' ? { client_name: document.client_name } : {}),
  };
}

function cacheLifetime(header: string | string[] | undefined): number {
  const value = Array.isArray(header) ? header.join(',') : header ?? '';
  if (/\b(?:no-store|no-cache)\b/i.test(value)) return 0;
  const maxAge = /(?:^|,)\s*max-age\s*=\s*"?(\d+)"?/i.exec(value);
  if (!maxAge) return DEFAULT_CACHE_TTL_MS;
  return Math.min(Number(maxAge[1]) * 1000, MAX_CACHE_TTL_MS);
}

async function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Client metadata fetch timed out');
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Client metadata fetch timed out')), remaining);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
