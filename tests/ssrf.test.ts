import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIpAddress, resolvePublicHost } from '../src/ssrf.js';

test('public IP classification handles public, mapped, invalid, private, link-local and reserved addresses', () => {
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('2001:4860:4860::8888'), true);
  assert.equal(isPublicIpAddress('::ffff:127.0.0.1'), false);
  assert.equal(isPublicIpAddress('10.0.0.1'), false);
  assert.equal(isPublicIpAddress('169.254.169.254'), false);
  assert.equal(isPublicIpAddress('2001:db8::1'), false);
  assert.equal(isPublicIpAddress('nope'), false);
});

test('host resolution pins literals, validates resolver results, and allows test-only private fixture addresses', async () => {
  assert.deepEqual(await resolvePublicHost(new URL('https://8.8.8.8/')), [{ address: '8.8.8.8', family: 4 }]);
  assert.deepEqual(await resolvePublicHost(new URL('https://fixture.example/'), async () => [{ address: '8.8.4.4', family: 4 }]), [{ address: '8.8.4.4', family: 4 }]);
  await assert.rejects(resolvePublicHost(new URL('https://fixture.example/'), async () => []), /no addresses/);
  await assert.rejects(resolvePublicHost(new URL('https://fixture.example/'), async () => [{ address: 'bad', family: 4 }]), /invalid IP/);
  await assert.rejects(resolvePublicHost(new URL('https://fixture.example/'), async () => [{ address: '127.0.0.1', family: 4 }]), /non-public/);
  assert.deepEqual(await resolvePublicHost(new URL('https://fixture.example/'), async () => [{ address: '127.0.0.1', family: 4 }], true), [{ address: '127.0.0.1', family: 4 }]);
});
