import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOrderTotals, formatEnabled } from '../src/config.js';

test('pdf order has no shipping regardless of country', () => {
  const t = computeOrderTotals({ format: 'pdf', country: 'United States' });
  assert.equal(t.shipping, 0);
  assert.equal(t.total, t.subtotal);
});

test('physical order to India uses domestic shipping', () => {
  const t = computeOrderTotals({ format: 'physical', country: 'India' });
  assert.equal(t.shipping, 80);
});

test('physical order outside India uses international shipping', () => {
  const t = computeOrderTotals({ format: 'physical', country: 'Canada' });
  assert.equal(t.shipping, 1500);
});

test('signed flag is ignored when signed copies are disabled', () => {
  const t = computeOrderTotals({ format: 'physical', country: 'India', signed: true });
  assert.equal(t.signed, false);
});

test('signed flag is ignored for pdf-only orders even if true', () => {
  const t = computeOrderTotals({ format: 'pdf', country: 'India', signed: true });
  assert.equal(t.signed, false);
});

test('invalid format throws rather than silently pricing as zero', () => {
  assert.throws(() => computeOrderTotals({ format: 'nope', country: 'India' }));
});

test('formatEnabled reflects BOOK_CONFIG flags', () => {
  assert.equal(formatEnabled('pdf'), true);
  assert.equal(formatEnabled('unknown'), false);
});
