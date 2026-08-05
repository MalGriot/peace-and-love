import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://sumtinels.github.io';

function fakeEnv(runImpl) {
  return { AI: { run: runImpl || (async () => ({ response: { text: 'Peace and love, what is good.' } })) } };
}

test('OPTIONS preflight returns CORS headers with no body', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN },
  });
  const response = await worker.fetch(request, fakeEnv());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('unknown routes return 404', async () => {
  const request = new Request('https://worker.example/nope', { method: 'GET', headers: { Origin: ORIGIN } });
  const response = await worker.fetch(request, fakeEnv());
  assert.equal(response.status, 404);
});

test('a disallowed origin is rejected with 403', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
  });
  const response = await worker.fetch(request, fakeEnv());
  assert.equal(response.status, 403);
});

test('invalid JSON body returns 400', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: '{not json',
  });
  const response = await worker.fetch(request, fakeEnv());
  assert.equal(response.status, 400);
});

test('an invalid message history returns 400 with an error message', async () => {
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  });
  const response = await worker.fetch(request, fakeEnv());
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok(body.error);
});

test('a valid request returns the Workers AI result as JSON with CORS headers', async () => {
  const env = fakeEnv(async () => ({ response: { text: 'Peace and love, what is good.' } }));
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const body = await response.json();
  assert.deepEqual(body, { text: 'Peace and love, what is good.', replyToId: null, reaction: null, offerContact: false });
});

test('an upstream Workers AI error returns 502', async () => {
  const env = fakeEnv(async () => {
    throw new Error('boom');
  });
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 502);
});

test('a malformed (schema-violating) Workers AI response also returns 502 with CORS headers', async () => {
  const env = fakeEnv(async () => ({ response: { reaction: '🙌🏾' } })); // no text field
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ id: 'a1', role: 'user', content: 'hi' }] }),
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('a leading assistant message (e.g. left over after capHistory trims to the tail) is dropped before being sent to Workers AI', async () => {
  let capturedMessages;
  const env = fakeEnv(async (model, options) => {
    capturedMessages = options.messages;
    return { response: { text: 'Peace and love.' } };
  });
  const request = new Request('https://worker.example/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { id: 'greet1', role: 'assistant', content: "Peace and love, what's good." },
        { id: 'a1', role: 'user', content: 'hi' },
      ],
    }),
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.ok(capturedMessages, 'expected the Worker to have called env.AI.run with captured messages');
  // Index 0 is the injected system prompt message; index 1 is the first
  // conversation turn, which must be the user message, not the leading
  // assistant one.
  assert.equal(capturedMessages[0].role, 'system');
  assert.equal(capturedMessages[1].role, 'user');
  assert.equal(capturedMessages.length, 2);
});
