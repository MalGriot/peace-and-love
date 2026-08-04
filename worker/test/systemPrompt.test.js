import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_PROMPT } from '../src/systemPrompt.js';

test('SYSTEM_PROMPT identifies the bot as Mal speaking in first person', () => {
  assert.match(SYSTEM_PROMPT, /first person/i);
});

test('SYSTEM_PROMPT includes real site facts, not placeholders', () => {
  for (const fact of [
    'Queens, New York',
    'breathe love d e e p',
    'hello@malgriot.com',
    'soundcloud.com/mal-griot',
  ]) {
    assert.ok(SYSTEM_PROMPT.includes(fact), `expected SYSTEM_PROMPT to include "${fact}"`);
  }
});

test('SYSTEM_PROMPT states the no-en-dash rule using the literal character', () => {
  assert.ok(SYSTEM_PROMPT.includes('–'));
});

test('SYSTEM_PROMPT states the Peace and love framing', () => {
  assert.ok(SYSTEM_PROMPT.includes('Peace and love'));
});

test('SYSTEM_PROMPT caps hand emoji use at one per reply', () => {
  assert.match(SYSTEM_PROMPT, /at most one|only one|never more than one/i);
});

test('SYSTEM_PROMPT lists the fixed 10 hand emoji set', () => {
  for (const emoji of ['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾']) {
    assert.ok(SYSTEM_PROMPT.includes(emoji), `expected emoji ${emoji} in prompt`);
  }
});

test('SYSTEM_PROMPT forbids discussing personal life topics', () => {
  assert.match(SYSTEM_PROMPT, /child/i);
  assert.match(SYSTEM_PROMPT, /relationship/i);
});

test('SYSTEM_PROMPT forbids quoting rates or prices', () => {
  assert.match(SYSTEM_PROMPT, /rate|price|fee/i);
});

test('SYSTEM_PROMPT instructs a playful WhatsApp hand-off for unknown answers', () => {
  assert.match(SYSTEM_PROMPT, /whatsapp/i);
  assert.match(SYSTEM_PROMPT, /good question/i);
});

test('SYSTEM_PROMPT instructs a dry reply for off-topic chatter', () => {
  assert.match(SYSTEM_PROMPT, /o\.\.\.k|um\.\.\. sure|hmm\.\.\./i);
});

test('SYSTEM_PROMPT instructs use of the respond tool fields', () => {
  assert.match(SYSTEM_PROMPT, /respond/);
  assert.match(SYSTEM_PROMPT, /replyToId/);
  assert.match(SYSTEM_PROMPT, /reaction/);
  assert.match(SYSTEM_PROMPT, /offerContact/);
});
