import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolCallRateLimiter } from '../src/tool-rate-limit.js';

test('tool limiter keeps users independent and expires calls after one minute', () => {
  let now = 10_000;
  const limiter = new ToolCallRateLimiter(2, () => now);
  assert.equal(limiter.check('user-a'), undefined);
  assert.equal(limiter.check('user-a'), undefined);
  assert.equal(limiter.check('user-a'), 60);
  assert.equal(limiter.check('user-b'), undefined);
  now += 60_001;
  assert.equal(limiter.check('user-a'), undefined);
});

test('tool limiter is off at zero by default', () => {
  const limiter = new ToolCallRateLimiter(0, () => 123);
  for (let i = 0; i < 20; i++) assert.equal(limiter.check('same-user'), undefined);
});
