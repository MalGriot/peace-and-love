import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders, isAllowedOrigin } from '../src/cors.js';

test('isAllowedOrigin allows the production GitHub Pages origin', () => {
  assert.equal(isAllowedOrigin('https://malgriot.github.io'), true);
});

test('isAllowedOrigin allows localhost on any port', () => {
  assert.equal(isAllowedOrigin('http://localhost:5500'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:8080'), true);
});

test('isAllowedOrigin rejects an unrelated origin', () => {
  assert.equal(isAllowedOrigin('https://evil.example.com'), false);
});

test('isAllowedOrigin rejects a missing origin', () => {
  assert.equal(isAllowedOrigin(undefined), false);
  assert.equal(isAllowedOrigin(''), false);
});

test('corsHeaders sets Access-Control-Allow-Origin for an allowed origin', () => {
  const headers = corsHeaders('https://malgriot.github.io');
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://malgriot.github.io');
  assert.equal(headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('corsHeaders omits Access-Control-Allow-Origin for a disallowed origin', () => {
  const headers = corsHeaders('https://evil.example.com');
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});
