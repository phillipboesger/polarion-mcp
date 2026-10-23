import test from 'node:test';
import assert from 'node:assert/strict';
import { NOOP_TELEMETRY } from '../src/telemetry.js';

test('no-op telemetry accepts span start and end without side effects', () => {
  const span = NOOP_TELEMETRY.onSpanStart({ name: 'tool.call', correlationId: 'id', tool: 'getProjects' }) ?? undefined;
  assert.equal(span, undefined);
  assert.equal(NOOP_TELEMETRY.onSpanEnd(span, { correlationId: 'id', tool: 'getProjects', outcome: 'success', durationMs: 0 }), undefined);
});
