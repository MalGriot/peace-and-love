import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://sumtinels.github.io';

async function withStubbedFetch(response, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test('OPTIONS preflight returns CORS headers with no body', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN },
  });
  const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('unknown routes return 404', async () => {
  const request = new Request('https://worker.example/nope', { method: 'GET', headers: { Origin: ORIGIN } });
  const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
  assert.equal(response.status, 404);
});

test('a disallowed origin is rejected with 403', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
  });
  const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
  assert.equal(response.status, 403);
});

test('invalid JSON body returns 400', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: '{not json',
  });
  const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
  assert.equal(response.status, 400);
});

test('an invalid message history returns 400 with an error message', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  });
  const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok(body.error);
});

test('a valid request returns the respond tool result as JSON with CORS headers', async () => {
  const fakeAnthropicResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: 'tool_use', name: 'respond', input: { text: 'Peace and love, what is good.' } }],
    }),
  };
  await withStubbedFetch(fakeAnthropicResponse, async () => {
    const request = new Request('https://worker.example/chat', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
    });
    const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    const body = await response.json();
    assert.deepEqual(body, { text: 'Peace and love, what is good.', replyToId: null, reaction: null, offerContact: false });
  });
});

test('an upstream Anthropic error returns 502', async () => {
  const failingResponse = { ok: false, status: 500, text: async () => 'boom' };
  await withStubbedFetch(failingResponse, async () => {
    const request = new Request('https://worker.example/chat', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
    });
    const response = await worker.fetch(request, { ANTHROPIC_API_KEY: 'test' });
    assert.equal(response.status, 502);
  });
});
