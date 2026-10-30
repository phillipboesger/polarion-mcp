/**
 * Corporate proxy support for calls to Polarion.
 *
 * Honors HTTPS_PROXY / https_proxy and NO_PROXY / no_proxy for https:// targets
 * by tunnelling through the proxy with CONNECT. Plain http:// targets are not
 * proxied. Proxy credentials are never written to error messages.
 */

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import type { Duplex } from 'node:stream';

export interface ProxyConfig {
  url: URL;
  noProxy: string[];
}

/**
 * @param env - Environment to read; injectable for tests.
 * @returns The proxy to use, or undefined when none is configured or the URL is unusable.
 */
export function proxyFromEnv(env: NodeJS.ProcessEnv = process.env): ProxyConfig | undefined {
  const raw = (env.HTTPS_PROXY || env.https_proxy || '').trim();
  if (!raw || !URL.canParse(raw)) return undefined;
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  const noProxy = (env.NO_PROXY || env.no_proxy || '').split(',').map(entry => entry.trim().toLowerCase()).filter(Boolean);
  return { url, noProxy };
}

/**
 * @param host - Target hostname.
 * @param port - Target port.
 * @param noProxy - NO_PROXY entries: `*`, `host`, `.suffix`, `host:port`.
 * @returns True if the target must be reached directly.
 */
export function bypassesProxy(host: string, port: number, noProxy: readonly string[]): boolean {
  const name = host.toLowerCase();
  return noProxy.some(entry => {
    if (entry === '*') return true;
    const [entryHost, entryPort] = entry.split(/:(?=\d+$)/);
    if (entryPort && Number(entryPort) !== port) return false;
    const bare = entryHost.replace(/^\*?\./, '');
    return name === bare || name.endsWith(`.${bare}`);
  });
}

/** Message safe to show: never contains the proxy URL or its credentials. */
function describeProxy(proxy: ProxyConfig): string {
  return `${proxy.url.protocol}//${proxy.url.host}`;
}

/** Longest wait for the proxy to answer CONNECT. */
const CONNECT_TIMEOUT_MS = 30_000;

/** https.Agent that reaches the target through an HTTP CONNECT tunnel. */
export class ProxyTunnelAgent extends https.Agent {
  constructor(options: https.AgentOptions, private readonly proxy: ProxyConfig) {
    super(options);
  }

  // Node's Agent calls createConnection(options, callback) and accepts the socket via the callback.
  createConnection(options: tls.ConnectionOptions & { host?: string; port?: number | string }, callback: (err: Error | null, socket?: Duplex) => void): undefined {
    let done = false;
    const finish = (error: Error | null, socket?: Duplex) => {
      if (done) { socket?.destroy(); return; }
      done = true;
      callback(error, socket);
    };
    const host = options.host ?? 'localhost';
    const port = Number(options.port ?? 443);
    if (bypassesProxy(host, port, this.proxy.noProxy)) {
      finish(null, tls.connect({ ...options, host, port, servername: options.servername ?? host }));
      return undefined;
    }
    const { url } = this.proxy;
    const headers: Record<string, string> = { Host: `${host}:${port}` };
    if (url.username || url.password) {
      let credentials: string;
      try {
        credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
      } catch {
        finish(new Error(`Proxy ${describeProxy(this.proxy)} credentials in HTTPS_PROXY are not valid percent-encoding; encode special characters such as % as %25`));
        return undefined;
      }
      headers['Proxy-Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
    }
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request({
      host: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), method: 'CONNECT', path: `${host}:${port}`, headers,
    });
    request.setTimeout(CONNECT_TIMEOUT_MS, () => request.destroy(new Error(`timed out after ${CONNECT_TIMEOUT_MS / 1000}s`)));
    request.once('connect', (response, socket) => {
      request.setTimeout(0);
      if (response.statusCode !== 200) {
        socket.destroy();
        const hint = response.statusCode === 407 ? ' (proxy authentication required; check the credentials in HTTPS_PROXY)' : '';
        finish(new Error(`Proxy ${describeProxy(this.proxy)} refused the CONNECT tunnel: HTTP ${response.statusCode}${hint}`));
        return;
      }
      finish(null, tls.connect({ ...options, socket, servername: options.servername ?? host }));
    });
    request.once('error', error => finish(new Error(`Cannot reach proxy ${describeProxy(this.proxy)}: ${error.message}`)));
    request.end();
    return undefined;
  }
}
