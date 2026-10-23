import { randomUUID } from 'node:crypto';
import { redact } from './utils.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'text' | 'json';
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface ToolCallLog {
  correlationId: string;
  tool: string;
  outcome: string;
  durationMs: number;
  msg?: string;
  secrets?: readonly string[];
}

export interface PipelineLogger extends Pick<Console, LogLevel> {
  toolCall?(entry: ToolCallLog): void;
}

export function scrubLogMessage(message: string, secrets: readonly string[] = []): string {
  let safe = message;
  for (const secret of secrets) if (secret.length > 0) safe = safe.split(secret).join('[REDACTED]');
  return redact(safe)
    .replace(/\b(?:mcp_(?:at|rt)_|sealed:)[A-Za-z0-9._~-]+/gi, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[REDACTED]');
}

/** Writes logs to stderr so stdio MCP protocol messages remain on stdout. */
export function createLogger(options: { format?: LogFormat; level?: LogLevel; write?: (line: string) => void; now?: () => Date } = {}): PipelineLogger {
  const format = options.format ?? 'text';
  const level = options.level ?? 'info';
  const write = options.write ?? ((line: string) => process.stderr.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const emit = (entry: { level: LogLevel; msg: string; correlationId?: string; tool?: string; outcome?: string; durationMs?: number; secrets?: readonly string[] }) => {
    if (ORDER[entry.level] < ORDER[level]) return;
    const msg = scrubLogMessage(entry.msg, entry.secrets);
    if (format === 'json') {
      write(JSON.stringify({ ts: now().toISOString(), level: entry.level, msg, correlationId: entry.correlationId, tool: entry.tool, outcome: entry.outcome, durationMs: entry.durationMs }));
    } else {
      write(`[${entry.level.toUpperCase()}] ${msg}`);
    }
  };
  const logger: PipelineLogger = {
    debug: (...args) => emit({ level: 'debug', msg: args.map(String).join(' ') }),
    info: (...args) => emit({ level: 'info', msg: args.map(String).join(' ') }),
    warn: (...args) => emit({ level: 'warn', msg: args.map(String).join(' ') }),
    error: (...args) => emit({ level: 'error', msg: args.map(String).join(' ') }),
    toolCall: entry => { if (format === 'json') emit({ level: 'info', ...entry, msg: entry.msg ?? 'Tool call completed' }); },
  };
  return logger;
}

export function correlationIdFrom(value: string | undefined): string {
  return value && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value) ? value : randomUUID();
}
