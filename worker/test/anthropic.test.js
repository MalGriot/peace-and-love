import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBotResponse, toAnthropicMessages, AnthropicError, MODEL } from '../src/anthropic.js';

test('toAnthropicMessages maps id/role/content to role/content pairs', () => {
  const result = toAnthropicMessages([
    { id: 'a1', role: 'user', content: 'do you do weddings?' },
  ]);
  assert.deepEqual(result, [{ role: 'user', content: 'do you do weddings?' }]);
});

test('toAnthropicMessages prepends quoted context when replyToId is set', () => {
  const result = toAnthropicMessages([
    { id: 'a1', role: 'assistant', content: 'What city is the event in?' },
    { id: 'a2', role: 'user', content: 'Queens', replyToId: 'a1' },
  ]);
  assert.equal(result[1].role, 'user');
  assert.match(result[1].content, /Replying to: "What city is the event in\?"/);
  assert.match(result[1].content, /Queens$/);
});

test('MODEL is the Haiku 4.5 model id', () => {
  assert.equal(MODEL, 'claude-haiku-4-5-20251001');
});

test('getBotResponse sends the respond tool forced and parses its result', async () => {
  let capturedBody;
  const fetchImpl = async (url, init) => {
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          { type: 'tool_use', name: 'respond', input: { text: 'Peace and love, what is good.' } },
        ],
      }),
    };
  };

  const result = await getBotResponse({
    apiKey: 'test-key',
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    fetchImpl,
  });

  assert.equal(capturedBody.model, MODEL);
  assert.equal(capturedBody.tool_choice.name, 'respond');
  assert.equal(capturedBody.tools[0].name, 'respond');
  assert.deepEqual(result, {
    text: 'Peace and love, what is good.',
    replyToId: null,
    reaction: null,
    offerContact: false,
  });
});

test('getBotResponse passes through replyToId, reaction, and offerContact when present', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        { type: 'tool_use', name: 'respond', input: { text: 'Bet.', replyToId: 'a1', reaction: '🙌🏾', offerContact: true } },
      ],
    }),
  });

  const result = await getBotResponse({ apiKey: 'k', systemPrompt: 's', messages: [{ id: 'a1', role: 'user', content: 'hi' }], fetchImpl });
  assert.deepEqual(result, { text: 'Bet.', replyToId: 'a1', reaction: '🙌🏾', offerContact: true });
});

test('getBotResponse throws AnthropicError on a non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'server exploded' });
  await assert.rejects(
    () => getBotResponse({ apiKey: 'k', systemPrompt: 's', messages: [{ id: 'a1', role: 'user', content: 'hi' }], fetchImpl }),
    AnthropicError
  );
});

test('getBotResponse nulls out a reaction outside the fixed 10-emoji set', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        { type: 'tool_use', name: 'respond', input: { text: 'Bet.', reaction: '🔥' } },
      ],
    }),
  });

  const result = await getBotResponse({ apiKey: 'k', systemPrompt: 's', messages: [{ id: 'a1', role: 'user', content: 'hi' }], fetchImpl });
  assert.equal(result.reaction, null);
});

test('getBotResponse throws AnthropicError when no respond tool call is present', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'oops' }] }) });
  await assert.rejects(
    () => getBotResponse({ apiKey: 'k', systemPrompt: 's', messages: [{ id: 'a1', role: 'user', content: 'hi' }], fetchImpl }),
    AnthropicError
  );
});
