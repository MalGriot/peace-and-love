import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signDownloadToken, verifyDownloadToken } from '../src/tokens.js';

const secret = 'test-secret-do-not-use-in-prod';

test('a freshly signed token verifies and returns its payload', async () => {
  const token = await signDownloadToken({ orderId: 'order-1', expiresAt: Date.now() + 60000, secret });
  const payload = await verifyDownloadToken(token, secret);
  assert.equal(payload.orderId, 'order-1');
});

test('an expired token is rejected', async () => {
  const token = await signDownloadToken({ orderId: 'order-1', expiresAt: Date.now() - 1000, secret });
  const payload = await verifyDownloadToken(token, secret);
  assert.equal(payload, null);
});

test('a token signed with the wrong secret is rejected', async () => {
  const token = await signDownloadToken({ orderId: 'order-1', expiresAt: Date.now() + 60000, secret });
  const payload = await verifyDownloadToken(token, 'wrong-secret');
  assert.equal(payload, null);
});

test('a tampered payload is rejected', async () => {
  const token = await signDownloadToken({ orderId: 'order-1', expiresAt: Date.now() + 60000, secret });
  const [, sig] = token.split('.');
  const forged = `${Buffer.from(JSON.stringify({ orderId: 'order-2', expiresAt: Date.now() + 60000 })).toString('base64url')}.${sig}`;
  const payload = await verifyDownloadToken(forged, secret);
  assert.equal(payload, null);
});

test('garbage input does not throw', async () => {
  assert.equal(await verifyDownloadToken('not-a-token', secret), null);
  assert.equal(await verifyDownloadToken('', secret), null);
  assert.equal(await verifyDownloadToken(undefined, secret), null);
});
