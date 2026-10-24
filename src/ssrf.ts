import { lookup as dnsLookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import ipaddr from 'ipaddr.js';

const EXTRA_DENYLIST_CIDRS: Array<[ipaddr.IPv4 | ipaddr.IPv6, number]> = [
  '198.18.0.0/15', '192.31.196.0/24', '192.52.193.0/24', '192.175.48.0/24',
  '192.0.0.0/24', '192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24', '240.0.0.0/4',
  '64:ff9b:1::/48', '100::/64', '2001:10::/28', '2001:20::/28', '5f00::/16',
  '2620:4f:8000::/48', '3fff::/20', '2001:db8::/32',
].map(cidr => ipaddr.parseCIDR(cidr));

export type SsrfResolver = (hostname: string) => Promise<readonly LookupAddress[]>;

/** Returns whether a parsed IP address is globally routable and outside reserved ranges. */
export function isPublicIpAddress(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address.replace(/^\[|\]$/g, ''));
    if (parsed.kind() === 'ipv6') {
      const ipv6 = parsed as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
    }
    if (parsed.range() !== 'unicast') return false;
    return !EXTRA_DENYLIST_CIDRS.some(([network, prefix]) => {
      if (parsed.kind() !== network.kind()) return false;
      return parsed.kind() === 'ipv4'
        ? (parsed as ipaddr.IPv4).match(network as ipaddr.IPv4, prefix)
        : (parsed as ipaddr.IPv6).match(network as ipaddr.IPv6, prefix);
    });
  } catch {
    return false;
  }
}

/** Resolves a URL host and rejects it unless every returned address is public. */
export async function resolvePublicHost(url: URL, resolver: SsrfResolver = host => dnsLookup(host, { all: true, verbatim: true }), allowPrivate = false): Promise<readonly LookupAddress[]> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = ipaddr.isValid(hostname)
    ? [{ address: hostname, family: ipaddr.parse(hostname).kind() === 'ipv6' ? 6 : 4 }]
    : await resolver(hostname);
  if (addresses.length === 0) throw new Error('URL hostname resolved to no addresses');
  for (const entry of addresses) {
    if (!ipaddr.isValid(entry.address)) throw new Error('URL hostname resolved to an invalid IP address');
    if (!allowPrivate && !isPublicIpAddress(entry.address)) throw new Error('URL hostname resolved to a non-public address');
  }
  return addresses;
}
