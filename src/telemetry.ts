export interface TelemetrySpan {
  end?(attributes?: Record<string, unknown>): void;
}

export interface TelemetryHooks {
  onSpanStart(input: { name: string; correlationId: string; tool: string }): TelemetrySpan | void;
  onSpanEnd(span: TelemetrySpan | void, input: { correlationId: string; tool: string; outcome: string; durationMs: number }): void;
}

/** No-op default; applications can bridge these callbacks to their telemetry SDK. */
export const NOOP_TELEMETRY: TelemetryHooks = {
  onSpanStart: () => undefined,
  onSpanEnd: () => undefined,
};
