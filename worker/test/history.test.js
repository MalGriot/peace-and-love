import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMessages, capHistory, ValidationError, MAX_HISTORY_MESSAGES } from '../src/history.js';

test('validateMessages accepts a well-formed history ending in a user message', () => {
  assert.doesNotThrow(() => validateMessages([
    { id: 'a1', role: 'user', content: 'hello' },
  ]));
});

test('validateMessages rejects a non-array', () => {
  assert.throws(() => validateMessages(null), ValidationError);
  assert.throws(() => validateMessages('nope'), ValidationError);
});

test('validateMessages rejects an empty array', () => {
  assert.throws(() => validateMessages([]), ValidationError);
});

test('validateMessages rejects a message missing an id', () => {
  assert.throws(() => validateMessages([{ role: 'user', content: 'hi' }]), ValidationError);
});

test('validateMessages rejects an invalid role', () => {
  assert.throws(() => validateMessages([{ id: 'a1', role: 'system', content: 'hi' }]), ValidationError);
});

test('validateMessages rejects empty content', () => {
  assert.throws(() => validateMessages([{ id: 'a1', role: 'user', content: '' }]), ValidationError);
});

test('validateMessages rejects content over 500 characters', () => {
  assert.throws(() => validateMessages([{ id: 'a1', role: 'user', content: 'x'.repeat(501) }]), ValidationError);
});

test('validateMessages rejects a non-string replyToId', () => {
  assert.throws(() => validateMessages([{ id: 'a1', role: 'user', content: 'hi', replyToId: 5 }]), ValidationError);
});

test('validateMessages requires the last message to be from the user', () => {
  assert.throws(() => validateMessages([
    { id: 'a1', role: 'user', content: 'hi' },
    { id: 'a2', role: 'assistant', content: 'yo' },
  ]), ValidationError);
});

test('capHistory returns the array unchanged when under the cap', () => {
  const messages = [{ id: 'a1', role: 'user', content: 'hi' }];
  assert.equal(capHistory(messages, 5), messages);
});

test('capHistory keeps only the most recent messages when over the cap', () => {
  const messages = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, role: 'user', content: `msg ${i}` }));
  const capped = capHistory(messages, 2);
  assert.deepEqual(capped.map((m) => m.id), ['a3', 'a4']);
});

test('MAX_HISTORY_MESSAGES defaults to 20 (about 10 exchanges)', () => {
  assert.equal(MAX_HISTORY_MESSAGES, 20);
});
