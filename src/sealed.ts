/**
 * Sealed (encrypted, self-contained) tokens for the OAuth login.
 *
 * Everything the login hands out — client ids, access tokens, refresh tokens —
 * is an AES-256-GCM encrypted payload under a server secret, so none of it has
 * to be remembered by the server. That is what lets a login survive a restart
 * and lets ChatGPT keep the client id it registered once. The client holds the
 * sealed value but cannot read or alter it; the kind is bound in as associated
 * data, so an access token can never be opened as a refresh token or client id.
 */

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Marks a bearer value as one of ours; everything else is treated as a Polarion PAT. */
export const SEALED_PREFIX = 'pmcp1.';

/** Shortest secret accepted, so the derived key is not guessable. */
export const MIN_SECRET_LENGTH = 32;

export type SealedKind = 'c' | 'a' | 'r';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * @param value - A bearer value.
 * @returns True if the value has the shape of a token this server sealed.
 */
export function isSealed(value: string): boolean {
  return value.startsWith(SEALED_PREFIX);
}

/**
 * Seals and opens payloads under one server secret.
 */
export class Sealer {
  private readonly keys: Array<{ key: Buffer; macKey: Buffer }>;

  /**
   * @param secret - Current server secret; at least {@link MIN_SECRET_LENGTH} characters.
   * @param aadContext - Deployment identity bound into every sealed value.
   * @param previousSecrets - Older keys accepted for opening only.
   */
  constructor(secret: string, private readonly aadContext = '', previousSecrets: readonly string[] = []) {
    for (const candidate of [secret, ...previousSecrets]) {
      if (candidate.length < MIN_SECRET_LENGTH) {
        throw new Error(`MCP_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`);
      }
    }
    this.keys = [...new Set([secret, ...previousSecrets])].map(candidate => ({
      key: createHash('sha256').update(`seal:${candidate}`).digest(),
      macKey: createHash('sha256').update(`mac:${candidate}`).digest(),
    }));
  }

  /**
   * @param kind - What the payload is; bound into the ciphertext.
   * @param payload - JSON-serializable content.
   * @returns `pmcp1.<kind>.<base64url(iv | tag | ciphertext)>`.
   */
  seal(kind: SealedKind, payload: object): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.keys[0].key, iv);
    cipher.setAAD(this.aad(kind));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return `${SEALED_PREFIX}${kind}.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')}`;
  }

  /**
   * @param kind - The kind the value must have been sealed as.
   * @param value - A sealed value from a client.
   * @returns The payload, or undefined if the value is foreign, tampered with,
   *   of another kind, or sealed under a different secret.
   */
  open<T>(kind: SealedKind, value: string): T | undefined {
    const head = `${SEALED_PREFIX}${kind}.`;
    if (!value.startsWith(head)) return undefined;
    const raw = Buffer.from(value.slice(head.length), 'base64url');
    if (raw.length <= IV_BYTES + TAG_BYTES) return undefined;
    for (const candidate of this.keys) {
      const opened = this.openWithKey<T>(kind, raw, candidate.key);
      if (opened !== undefined) return opened;
    }
    return undefined;
  }

  /**
   * Derives a stable secret from a public value, e.g. a client secret from its
   * client id, so it never has to be stored.
   *
   * @param value - The public value.
   * @returns A base64url HMAC of the value.
   */
  derive(value: string, sealedValue?: string): string {
    const key = sealedValue ? this.keyForSealedValue('c', sealedValue) : undefined;
    return createHmac('sha256', (key ?? this.keys[0]).macKey).update(value).digest('base64url');
  }

  private aad(kind: SealedKind): Buffer {
    return Buffer.from(this.aadContext ? `${kind}:${this.aadContext}` : kind);
  }

  private openWithKey<T>(kind: SealedKind, raw: Buffer, key: Buffer): T | undefined {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES));
      decipher.setAAD(this.aad(kind));
      decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
      const plain = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
      return JSON.parse(plain.toString('utf8')) as T;
    } catch {
      return undefined;
    }
  }

  private keyForSealedValue(kind: SealedKind, value: string): { key: Buffer; macKey: Buffer } | undefined {
    const head = `${SEALED_PREFIX}${kind}.`;
    if (!value.startsWith(head)) return undefined;
    const raw = Buffer.from(value.slice(head.length), 'base64url');
    if (raw.length <= IV_BYTES + TAG_BYTES) return undefined;
    return this.keys.find(candidate => this.openWithKey(kind, raw, candidate.key) !== undefined);
  }
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns True if both strings are identical.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
