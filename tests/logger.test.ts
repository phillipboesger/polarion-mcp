import test from 'node:test';
import assert from 'node:assert/strict';
import { correlationIdFrom, createLogger, scrubLogMessage } from '../src/logger.js';

test('JSON tool logs include correlation and outcome fields and scrub credentials', () => {
  const lines: string[] = [];
  const logger = createLogger({ format: 'json', level: 'debug', write: line => lines.push(line), now: () => new Date('2026-01-02T03:04:05.000Z') });
  logger.toolCall?.({ correlationId: 'req-1', tool: 'deleteThing', outcome: 'error', durationMs: 12, msg: 'Bearer pat-value failed sealed:sealed-value', secrets: ['pat-value'] });
  const row = JSON.parse(lines[0]);
  assert.deepEqual(row, { ts: '2026-01-02T03:04:05.000Z', level: 'info', msg: 'Bearer [REDACTED] failed [REDACTED]', correlationId: 'req-1', tool: 'deleteThing', outcome: 'error', durationMs: 12 });
  assert.equal(lines.join('').includes('pat-value'), false);
  assert.equal(lines.join('').includes('sealed-value'), false);
});

test('text mode preserves compact current-style log output and level filtering', () => {
  const lines: string[] = [];
  const logger = createLogger({ format: 'text', level: 'warn', write: line => lines.push(line) });
  logger.info('hidden');
  logger.warn('PAT=secret-value');
  logger.toolCall?.({ correlationId: 'x', tool: 't', outcome: 'success', durationMs: 1 });
  assert.deepEqual(lines, ['[WARN] [REDACTED]']);
});

test('correlation IDs accept only bounded safe header values', () => {
  assert.equal(correlationIdFrom('client.req-1:ok'), 'client.req-1:ok');
  assert.match(correlationIdFrom('bad id'), /^[0-9a-f-]{36}$/);
  assert.match(correlationIdFrom('x'.repeat(129)), /^[0-9a-f-]{36}$/);
  assert.doesNotMatch(scrubLogMessage('authorization Bearer a-secret-token'), /a-secret-token/);
});
