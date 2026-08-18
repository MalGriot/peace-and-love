import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBotResponse, toWorkersAiMessages, WorkersAiError, MODEL } from '../src/workersAi.js';

test('toWorkersAiMessages puts the system prompt first, then prefixes user messages with an [id:...] tag', () => {
  const result = toWorkersAiMessages('SYSTEM', [
    { id: 'a1', role: 'user', content: 'do you do weddings?' },
  ]);
  assert.deepEqual(result, [
    { role: 'system', content: 'SYSTEM' },
    { role: 'user', content: '[id:a1] do you do weddings?' },
  ]);
});

test('toWorkersAiMessages does not prefix assistant messages with an id tag', () => {
  const result = toWorkersAiMessages('SYSTEM', [
    { id: 'a1', role: 'assistant', content: 'Peace and love! What is good.' },
  ]);
  assert.equal(result[1].content, 'Peace and love! What is good.');
});

test('toWorkersAiMessages prepends quoted context when replyToId is set', () => {
  const result = toWorkersAiMessages('SYSTEM', [
    { id: 'a1', role: 'assistant', content: 'What city is the event in?' },
    { id: 'a2', role: 'user', content: 'Queens', replyToId: 'a1' },
  ]);
  const userMessage = result[2];
  assert.equal(userMessage.role, 'user');
  assert.match(userMessage.content, /Replying to: "What city is the event in\?"/);
  assert.match(userMessage.content, /Queens$/);
  assert.match(userMessage.content, /^\[id:a2\]/);
});

test('MODEL is a Workers AI model id', () => {
  assert.equal(MODEL, '@cf/meta/llama-3.1-8b-instruct-fast');
});

test('getBotResponse calls env.AI.run with the model and JSON schema response format', async () => {
  let capturedModel;
  let capturedOptions;
  const runImpl = async (model, options) => {
    capturedModel = model;
    capturedOptions = options;
    return { response: { text: 'Peace and love, what is good.' } };
  };

  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    runImpl,
  });

  assert.equal(capturedModel, MODEL);
  assert.equal(capturedOptions.response_format.type, 'json_schema');
  assert.deepEqual(capturedOptions.response_format.json_schema.required, ['text']);
  assert.deepEqual(result, { text: 'Peace and love, what is good.', replyToId: null, reaction: null, offerContact: false });
});

test('getBotResponse parses a JSON string response (not just a pre-parsed object)', async () => {
  const runImpl = async () => ({ response: JSON.stringify({ text: 'Bet.' }) });
  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    runImpl,
  });
  assert.equal(result.text, 'Bet.');
});

test('getBotResponse passes through a valid replyToId, reaction, and offerContact', async () => {
  const runImpl = async () => ({
    response: { text: 'Bet.', replyToId: 'a1', reaction: '🙌🏾', offerContact: true },
  });
  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    runImpl,
  });
  assert.deepEqual(result, { text: 'Bet.', replyToId: 'a1', reaction: '🙌🏾', offerContact: true });
});

test('getBotResponse nulls out a reaction outside the fixed 10-emoji set', async () => {
  const runImpl = async () => ({ response: { text: 'Bet.', reaction: '🔥' } });
  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    runImpl,
  });
  assert.equal(result.reaction, null);
});

test('getBotResponse nulls out a replyToId that does not match a real user message', async () => {
  const runImpl = async () => ({ response: { text: 'Bet.', replyToId: 'made-up-id' } });
  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [{ id: 'a1', role: 'user', content: 'hi' }],
    runImpl,
  });
  assert.equal(result.replyToId, null);
});

test('getBotResponse nulls out a replyToId that points at an assistant message rather than a user one', async () => {
  const runImpl = async () => ({ response: { text: 'Bet.', replyToId: 'bot1' } });
  const result = await getBotResponse({
    systemPrompt: 'SYSTEM',
    messages: [
      { id: 'bot1', role: 'assistant', content: 'Peace and love! What is good.' },
      { id: 'a1', role: 'user', content: 'hi' },
    ],
    runImpl,
  });
  assert.equal(result.replyToId, null);
});

test('getBotResponse throws WorkersAiError when the run call itself rejects', async () => {
  const runImpl = async () => {
    throw new Error('binding unavailable');
  };
  await assert.rejects(
    () => getBotResponse({ systemPrompt: 'SYSTEM', messages: [{ id: 'a1', role: 'user', content: 'hi' }], runImpl }),
    WorkersAiError
  );
});

test('getBotResponse throws WorkersAiError when the response has no usable text', async () => {
  const runImpl = async () => ({ response: { reaction: '🙌🏾' } });
  await assert.rejects(
    () => getBotResponse({ systemPrompt: 'SYSTEM', messages: [{ id: 'a1', role: 'user', content: 'hi' }], runImpl }),
    WorkersAiError
  );
});

test('getBotResponse throws WorkersAiError when the response is unparseable garbage', async () => {
  const runImpl = async () => ({ response: 'not json at all' });
  await assert.rejects(
    () => getBotResponse({ systemPrompt: 'SYSTEM', messages: [{ id: 'a1', role: 'user', content: 'hi' }], runImpl }),
    WorkersAiError
  );
});
