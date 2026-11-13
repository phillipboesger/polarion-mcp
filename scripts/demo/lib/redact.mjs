// Secret redaction for the transcript. The transcript is published, so a leaked token here is a real incident.

const SENSITIVE_KEY = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|bearer[-_]?token|token|password|passwd|secret|client[-_]?secret|pat)$/i;
export const REDACTED = '[REDACTED]';

/** Every textual form a token can take in a log line: raw, URL-encoded and base64 (Basic auth). */
export function secretVariants(secrets) {
  const out = new Set();
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < 4) continue;
    out.add(secret);
    out.add(encodeURIComponent(secret));
    out.add(Buffer.from(secret).toString('base64'));
    out.add(Buffer.from(secret).toString('base64url'));
  }
  // Longest first so a variant containing another is replaced whole.
  return [...out].sort((a, b) => b.length - a.length);
}

function scrubString(text, variants) {
  let result = text;
  for (const variant of variants) result = result.split(variant).join(REDACTED);
  // Bearer/Basic credentials that were not among the known secrets.
  return result.replace(/\b(Bearer|Basic)\s+(?!\[REDACTED\])[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`);
}

/** Deep copy with known secrets, sensitive keys and Bearer/Basic credentials replaced. */
export function redact(value, secrets = []) {
  const variants = secretVariants(secrets);
  const walk = (node) => {
    if (typeof node === 'string') return scrubString(node, variants);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([key, child]) => [
        scrubString(key, variants),
        SENSITIVE_KEY.test(key) && child != null && typeof child !== 'object' ? REDACTED : walk(child),
      ]));
    }
    return node;
  };
  return walk(value);
}

/** Throws if any secret variant is still present in the serialized transcript (last line of defense before writing). */
export function assertNoSecrets(serialized, secrets = []) {
  for (const variant of secretVariants(secrets)) {
    if (serialized.includes(variant)) throw new Error('Refusing to write transcript: a secret value is still present after redaction.');
  }
}
