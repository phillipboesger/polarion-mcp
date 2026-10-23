import { createHash } from 'node:crypto';

/** In-memory sliding-window limiter for MCP tool calls. */
export class ToolCallRateLimiter {
  private readonly calls = new Map<string, number[]>();

  constructor(private readonly limit: number, private readonly now: () => number = Date.now) {}

  /** Returns the retry delay in seconds when limited, otherwise records the call. */
  check(identity: string): number | undefined {
    if (this.limit <= 0) return undefined;
    const key = createHash('sha256').update(identity).digest('hex');
    const current = this.now();
    const cutoff = current - 60_000;
    const active = (this.calls.get(key) ?? []).filter(timestamp => timestamp > cutoff);
    if (active.length >= this.limit) {
      this.calls.set(key, active);
      return Math.max(1, Math.ceil((active[0] + 60_000 - current) / 1000));
    }
    active.push(current);
    this.calls.set(key, active);
    return undefined;
  }
}
