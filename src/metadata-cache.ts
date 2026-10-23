export type MetadataKind = 'projects' | 'work-item-types' | 'statuses' | 'users' | 'enums';
export interface MetadataCacheOptions { ttlMs?: number; maxEntries?: number; now?: () => number }
interface Entry { expiresAt: number; values: string[] }

/** Small bounded cache; deployment and caller scope are part of every key. */
export class MetadataCache {
  private readonly entries = new Map<string, Entry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  constructor(options: MetadataCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60_000;
    this.maxEntries = options.maxEntries ?? 500;
    this.now = options.now ?? Date.now;
  }
  get(deployment: string, userScope: string, kind: MetadataKind, projectId = ''): string[] | undefined {
    const key = this.key(deployment, userScope, kind, projectId);
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= this.now()) { this.entries.delete(key); return undefined; }
    this.entries.delete(key); this.entries.set(key, entry);
    return [...entry.values];
  }
  set(deployment: string, userScope: string, kind: MetadataKind, values: string[], projectId = ''): void {
    const key = this.key(deployment, userScope, kind, projectId);
    this.entries.delete(key);
    this.entries.set(key, { values: [...values], expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
  }
  private key(deployment: string, scope: string, kind: MetadataKind, project: string) { return JSON.stringify([deployment, scope, kind, project]); }
}
