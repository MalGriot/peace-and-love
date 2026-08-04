# Ask Mal Griot Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the shell-only "Ask Mal Griot" chat widget up to a real, in-character chatbot backed by Claude, with reactions, reply-threading, a WhatsApp/contact hand-off, and a hard 10-message conversation cap.

**Architecture:** A new, independently-deployed Cloudflare Worker (`worker/`) holds the Anthropic API key server-side and exposes one `POST /chat` endpoint that calls Claude via a forced `respond` tool call, returning structured `{ text, replyToId, reaction, offerContact }`. The static site (unchanged GitHub Pages hosting) gets its chat behavior split into a new `chat.js` file (loaded after `shared.js` on every page) that owns all widget state, rendering, and the fetch call to the Worker; `shared.js` keeps owning the widget's markup generation and the toggle wiring hand-off.

**Tech Stack:** Cloudflare Workers (`wrangler`), vanilla JS/HTML/CSS (no framework, no bundler, matching the existing site), Node's built-in `node:test` runner for the Worker's unit tests, Anthropic Messages API (`claude-haiku-4-5-20251001`) with tool use.

## Global Constraints

- Model: `claude-haiku-4-5-20251001` — do not substitute another model.
- CORS allow-list: `https://sumtinels.github.io`, plus `http://localhost:*` and `http://127.0.0.1:*` for local testing. No other origins.
- WhatsApp number: `+91 77188 16239` → link `https://wa.me/917718816239`.
- Never emit an en dash (`–`) in bot-generated text; this is enforced via the system prompt, not post-processing.
- At most one hand emoji per bot reply, only from this fixed 10-emoji set: 🙌🏾 🫶🏾 👌🏾 🤘🏾 🙏🏾 💪🏾 👍🏾 🤝🏾 👊🏾 🤙🏾.
- Bot opens/closes conversationally with "Peace and love" (varied wording, never the exact same line every time).
- Bot never fabricates facts, links, prices, or availability — only real site content goes into the system prompt.
- Server-side history cap: last 20 messages (~10 exchanges) sent to Anthropic per request, regardless of client behavior.
- Client-side visitor message cap: exactly 10 visitor messages per session; the 10th is intercepted client-side (no Worker call) with a canned WhatsApp redirect, then the input is disabled. This cap resets on page reload/navigation (chat history is never persisted).
- Client-side input `maxlength`: 500 characters.
- No build step, no bundler, no npm dependencies for the static site itself (existing project convention, stated in the site's own README) — `chat.js`/`shared.js`/`shared.css` are plain files loaded directly by the browser. The `worker/` directory is a separate, independent Node project and may have its own `package.json`/dependencies (`wrangler`) without violating this.
- Frontend tasks are verified by hand in a real browser (per the design spec's own "Testing / verification" section) — do not introduce a JS test framework for the static site. Worker tasks use Node's built-in `node --test` (Node >=20 required for the worker's dev tooling).
- Full design rationale: `docs/superpowers/specs/2026-08-04-ask-mal-griot-chatbot-design.md`.

---

## File Structure

```
worker/                          # new, independent Node project (not part of the static site)
  package.json
  wrangler.toml
  .gitignore
  .dev.vars.example
  README.md
  src/
    cors.js                      # origin allow-list + CORS header helper
    history.js                   # message validation + history capping
    systemPrompt.js              # the persona system prompt (real site facts + hard rules)
    anthropic.js                 # Anthropic Messages API client (respond tool)
    index.js                     # Worker entrypoint: routing, validation, wiring
  test/
    cors.test.js
    history.test.js
    systemPrompt.test.js
    anthropic.test.js
    index.test.js

chat.js                          # NEW: all chat widget behavior (state, rendering, network, reactions, replies, limit)
shared.js                        # MODIFIED: chatHtml inline template extracted into chatWidgetHtml()
shared.css                       # MODIFIED: chat widget styling expanded (header/messages/reactions/replies/contact CTAs)
index.html                       # MODIFIED: hardcoded chat markup replaced with the shared chrome-chat slot
music.html, griot-cuts.html,     # MODIFIED: add <script src="chat.js"> after <script src="shared.js">
  wellness-coaching.html,
  contact.html
README.md                        # MODIFIED: replace the "shell-only" chat paragraph with real docs
```

---

## Task 1: Worker scaffold + CORS module

**Files:**
- Create: `worker/package.json`
- Create: `worker/wrangler.toml`
- Create: `worker/.gitignore`
- Create: `worker/.dev.vars.example`
- Create: `worker/src/cors.js`
- Test: `worker/test/cors.test.js`

**Interfaces:**
- Produces: `isAllowedOrigin(origin): boolean`, `corsHeaders(origin): Record<string,string>` — consumed by Task 5 (`worker/src/index.js`).

- [ ] **Step 1: Create the worker directory and `package.json`**

```json
{
  "name": "mal-griot-chat-worker",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test test/"
  },
  "devDependencies": {
    "wrangler": "^3.90.0"
  }
}
```

- [ ] **Step 2: Create `worker/wrangler.toml`**

```toml
name = "mal-griot-chat"
main = "src/index.js"
compatibility_date = "2026-08-01"
```

- [ ] **Step 3: Create `worker/.gitignore`**

```
node_modules/
.wrangler/
.dev.vars
```

- [ ] **Step 4: Create `worker/.dev.vars.example`**

```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

- [ ] **Step 5: Install dependencies**

Run: `cd worker && npm install`
Expected: `node_modules/` created, `wrangler` installed, no errors.

- [ ] **Step 6: Write the failing test**

Create `worker/test/cors.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders, isAllowedOrigin } from '../src/cors.js';

test('isAllowedOrigin allows the production GitHub Pages origin', () => {
  assert.equal(isAllowedOrigin('https://sumtinels.github.io'), true);
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
  const headers = corsHeaders('https://sumtinels.github.io');
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://sumtinels.github.io');
  assert.equal(headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('corsHeaders omits Access-Control-Allow-Origin for a disallowed origin', () => {
  const headers = corsHeaders('https://evil.example.com');
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `cd worker && npm test`
Expected: FAIL — `Cannot find module '../src/cors.js'`

- [ ] **Step 8: Implement `worker/src/cors.js`**

```js
const ALLOWED_ORIGINS = new Set(['https://sumtinels.github.io']);

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd worker && npm test`
Expected: PASS (6 tests)

- [ ] **Step 10: Commit**

```bash
git add worker/package.json worker/wrangler.toml worker/.gitignore worker/.dev.vars.example worker/src/cors.js worker/test/cors.test.js
git commit -m "Scaffold Cloudflare Worker project with CORS module"
```

---

## Task 2: History validation/capping module

**Files:**
- Create: `worker/src/history.js`
- Test: `worker/test/history.test.js`

**Interfaces:**
- Produces: `MAX_HISTORY_MESSAGES: number`, `ValidationError` (class extends Error), `validateMessages(messages): void` (throws `ValidationError`), `capHistory(messages, max = MAX_HISTORY_MESSAGES): array` — consumed by Task 5 (`worker/src/index.js`).

- [ ] **Step 1: Write the failing test**

Create `worker/test/history.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd worker && npm test`
Expected: FAIL — `Cannot find module '../src/history.js'`

- [ ] **Step 3: Implement `worker/src/history.js`**

```js
export const MAX_HISTORY_MESSAGES = 20;

export class ValidationError extends Error {}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('messages must be a non-empty array');
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      throw new ValidationError('each message must be an object');
    }
    if (typeof m.id !== 'string' || m.id.length === 0) {
      throw new ValidationError('each message must have a non-empty string id');
    }
    if (m.role !== 'user' && m.role !== 'assistant') {
      throw new ValidationError('message role must be "user" or "assistant"');
    }
    if (typeof m.content !== 'string' || m.content.length === 0) {
      throw new ValidationError('message content must be a non-empty string');
    }
    if (m.content.length > 500) {
      throw new ValidationError('message content exceeds 500 characters');
    }
    if (m.replyToId !== undefined && m.replyToId !== null && typeof m.replyToId !== 'string') {
      throw new ValidationError('replyToId must be a string, null, or omitted');
    }
  }
  const last = messages[messages.length - 1];
  if (last.role !== 'user') {
    throw new ValidationError('the last message must be from the user');
  }
}

export function capHistory(messages, max = MAX_HISTORY_MESSAGES) {
  if (messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd worker && npm test`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/history.js worker/test/history.test.js
git commit -m "Add history validation and capping module to chat worker"
```

---

## Task 3: System prompt module

**Files:**
- Create: `worker/src/systemPrompt.js`
- Test: `worker/test/systemPrompt.test.js`

**Interfaces:**
- Produces: `SYSTEM_PROMPT: string` — consumed by Task 5 (`worker/src/index.js`).

- [ ] **Step 1: Write the failing test**

Create `worker/test/systemPrompt.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd worker && npm test`
Expected: FAIL — `Cannot find module '../src/systemPrompt.js'`

- [ ] **Step 3: Implement `worker/src/systemPrompt.js`**

```js
export const SYSTEM_PROMPT = `You are "Mal", speaking as Mal Griot in first person on his website's chat widget. You ARE Mal Griot, never a third-party assistant describing him.

REAL FACTS ABOUT YOU (use only these; never invent facts, links, prices, or availability):
- Born and raised in Queens, New York, on soul records and church harmonies. Vocalist, spoken-word artist, MC/host, and voice actor, based in India. Work spans Afro-house, funk, and soul, most recently the album "breathe love d e e p".
- Music: soundcloud.com/mal-griot, open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS, music.apple.com/us/artist/mal-griot/1773454818, music.youtube.com/channel/UC2ouYdd3qmP9vSvLpKD8-CQ, music.amazon.com/artists/B0DTP5MFVP/mal-griot, tidal.com/artist/53475605.
- Instagram: instagram.com/yep.that.malcolm.
- Email: hello@malgriot.com.
- Griot Cuts (video editing service): performance and narrative cuts built to a track's rhythm, fast punchy vertical edits for release rollouts and brand accounts, and grading and mix passes that match footage to a track's texture.
- Wellness + Coaching, "two ways to find your voice": (1) sound facilitation, one on one and group sessions using voice and singing bowls to calm the nervous system and open the breath; (2) coaching, guided sessions for writers and vocalists working through blocks, tone, and finding an authentic voice; (3) small group sessions blending both for teams, retreats, and creative communities. Sessions run one on one, remote by default.
- An electronic press kit (bio, photos, rider) is available as a PDF, linked from the contact page.
- Typical response time to inquiries is 1 to 2 business days; time-sensitive requests (a booking date closing in, a deadline on a cut) should say so.
- For a booking inquiry, the useful details are date, city or venue, and the shape of the set (live vocals, MC/host, spoken word), plus a rough budget if they have one.
- For a Griot Cuts inquiry, the useful details are a link to the raw footage, the platform it is for (Reels, YouTube, etc.), and any reference cuts they like the feel of.
- For a voice acting inquiry (character voice, narration, host/MC reads), the useful details are the brief or script and a deadline; pricing comes back with the reply.
- Remote work (voice, mixing, coaching) runs on any timezone; travel for live dates gets sorted case by case once the details are in.

HARD RULES, NEVER BREAK THESE:
1. Never use an en dash ("–") anywhere in your reply. Use a comma, a period, or a new sentence instead.
2. Open and close conversationally with "Peace and love": greet with a line like "Peace and love, what's good", "Peace and love, what's up", "Peace and love, I'm listening" (vary it, don't repeat the same one every time); when someone thanks you or wraps up, answer in kind, e.g. "Peace and love, no problem, let's get it started."
3. Use at most one hand emoji per reply, and only when it fits naturally, never zero, never more than one, never forced. Only choose from this set: 🙌🏾 🫶🏾 👌🏾 🤘🏾 🙏🏾 💪🏾 👍🏾 🤝🏾 👊🏾 🤙🏾.
4. Never discuss your personal life: your child, or your relationships. If asked, deflect warmly and steer back to music, coaching, or booking.
5. Your sexuality can be acknowledged with context if a visitor brings it up directly. Never volunteer it unprompted.
6. Never state or imply a rate, price, or fee for anything. If asked for pricing, qualify what you can from the facts above and set offerContact to true.
7. Never invent a fact, link, price, availability date, or detail that isn't listed above. If you don't know, say so plainly and set offerContact to true.
8. When you genuinely don't know the answer to something, or it's outside what you're told here, respond briefly and playfully instead of guessing, for example "Ooh, good question, let me get back to you on that, can you text it to me on WhatsApp?" (vary the wording each time) and set offerContact to true.
9. If the visitor is just making chatter, testing you, or not really asking anything, respond briefly and dryly instead of writing a full reply, for example "o...k?", "um... sure?", or "hmm...".

TOOL USE: Always answer by calling the "respond" tool, never plain text. Set "text" to your reply. Set "replyToId" to the id of a specific earlier visitor message you're addressing, when the visitor has sent more than one message in a row and you're answering an earlier one specifically. Set "reaction" to one emoji from the set above if a reaction fits better than or alongside words. Set "offerContact" to true whenever you're handing off: booking inquiries, pricing questions, or anything you don't have a real answer for.`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd worker && npm test`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/systemPrompt.js worker/test/systemPrompt.test.js
git commit -m "Add Mal Griot persona system prompt module to chat worker"
```

---

## Task 4: Anthropic client module

**Files:**
- Create: `worker/src/anthropic.js`
- Test: `worker/test/anthropic.test.js`

**Interfaces:**
- Consumes: nothing internal (pure module; takes `apiKey`/`systemPrompt`/`messages`/`fetchImpl` as arguments).
- Produces: `MODEL: string`, `AnthropicError` (class extends Error), `toAnthropicMessages(messages): array`, `getBotResponse({ apiKey, systemPrompt, messages, fetchImpl }): Promise<{ text, replyToId, reaction, offerContact }>` — consumed by Task 5 (`worker/src/index.js`).

- [ ] **Step 1: Write the failing test**

Create `worker/test/anthropic.test.js`:

```js
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

test('getBotResponse throws AnthropicError when no respond tool call is present', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'oops' }] }) });
  await assert.rejects(
    () => getBotResponse({ apiKey: 'k', systemPrompt: 's', messages: [{ id: 'a1', role: 'user', content: 'hi' }], fetchImpl }),
    AnthropicError
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd worker && npm test`
Expected: FAIL — `Cannot find module '../src/anthropic.js'`

- [ ] **Step 3: Implement `worker/src/anthropic.js`**

```js
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-haiku-4-5-20251001';

const RESPOND_TOOL = {
  name: 'respond',
  description: "Send Mal's reply to the visitor.",
  input_schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: "Mal's reply text." },
      replyToId: { type: 'string', description: 'id of a specific earlier visitor message this reply addresses, if threading to one specifically.' },
      reaction: { type: 'string', description: 'One emoji from the fixed hand-emoji set to react with, if a reaction fits.' },
      offerContact: { type: 'boolean', description: 'true when this reply should end with a contact/WhatsApp hand-off.' },
    },
    required: ['text'],
  },
};

export class AnthropicError extends Error {}

export function toAnthropicMessages(messages) {
  const byId = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => {
    let content = m.content;
    if (m.replyToId && byId.has(m.replyToId)) {
      const target = byId.get(m.replyToId);
      content = `[Replying to: "${target.content}"] ${content}`;
    }
    return { role: m.role, content };
  });
}

export async function getBotResponse({ apiKey, systemPrompt, messages, fetchImpl = fetch }) {
  const response = await fetchImpl(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
      tools: [RESPOND_TOOL],
      tool_choice: { type: 'tool', name: 'respond' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AnthropicError(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const toolUse = (data.content || []).find((block) => block.type === 'tool_use' && block.name === 'respond');
  if (!toolUse) {
    throw new AnthropicError('Anthropic response did not include a respond tool call');
  }

  const input = toolUse.input || {};
  if (typeof input.text !== 'string' || input.text.length === 0) {
    throw new AnthropicError('respond tool call missing text');
  }

  return {
    text: input.text,
    replyToId: typeof input.replyToId === 'string' ? input.replyToId : null,
    reaction: typeof input.reaction === 'string' ? input.reaction : null,
    offerContact: input.offerContact === true,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd worker && npm test`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/anthropic.js worker/test/anthropic.test.js
git commit -m "Add Anthropic client module with forced respond tool call"
```

---

## Task 5: Worker entrypoint + worker README

**Files:**
- Create: `worker/src/index.js`
- Create: `worker/README.md`
- Test: `worker/test/index.test.js`

**Interfaces:**
- Consumes: `corsHeaders`, `isAllowedOrigin` (Task 1); `validateMessages`, `capHistory`, `ValidationError` (Task 2); `SYSTEM_PROMPT` (Task 3); `getBotResponse`, `AnthropicError` (Task 4).
- Produces: default export `{ fetch(request, env) }` — this is the deployed Worker, consumed by the frontend's `chat.js` (Task 8) via HTTP.

- [ ] **Step 1: Write the failing test**

Create `worker/test/index.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd worker && npm test`
Expected: FAIL — `Cannot find module '../src/index.js'`

- [ ] **Step 3: Implement `worker/src/index.js`**

```js
import { corsHeaders, isAllowedOrigin } from './cors.js';
import { validateMessages, capHistory, ValidationError } from './history.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { getBotResponse, AnthropicError } from './anthropic.js';

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, 404, origin);
    }

    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    try {
      validateMessages(body.messages);
    } catch (err) {
      if (err instanceof ValidationError) {
        return jsonResponse({ error: err.message }, 400, origin);
      }
      throw err;
    }

    const capped = capHistory(body.messages);

    try {
      const result = await getBotResponse({
        apiKey: env.ANTHROPIC_API_KEY,
        systemPrompt: SYSTEM_PROMPT,
        messages: capped,
      });
      return jsonResponse(result, 200, origin);
    } catch (err) {
      if (err instanceof AnthropicError) {
        return jsonResponse({ error: 'Upstream error' }, 502, origin);
      }
      throw err;
    }
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd worker && npm test`
Expected: PASS (7 tests)

- [ ] **Step 5: Write `worker/README.md`**

```markdown
# Mal Griot chat worker

A small Cloudflare Worker that holds the Anthropic API key server-side and
answers `POST /chat` for the "Mal" chat widget on the main site. Deployed
independently of the static site (which stays on GitHub Pages).

## Local development

    npm install
    cp .dev.vars.example .dev.vars   # then paste in a real Anthropic API key
    npm run dev

This starts `wrangler dev`, usually on `http://127.0.0.1:8787`. Test it:

    curl -X POST http://127.0.0.1:8787/chat \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:5500" \
      -d '{"messages":[{"id":"a1","role":"user","content":"do you do weddings?"}]}'

Point the frontend at this local URL by temporarily setting `CHAT_WORKER_URL`
in `chat.js` (repo root) to `http://127.0.0.1:8787/chat` while testing locally.

## Tests

    npm test

Runs Node's built-in test runner over `test/`. No live API calls are made;
Anthropic responses are stubbed.

## Deploying

    npx wrangler login
    npx wrangler secret put ANTHROPIC_API_KEY   # paste the real key when prompted
    npm run deploy

After the first deploy, `wrangler` prints the Worker's URL (something like
`https://mal-griot-chat.<your-subdomain>.workers.dev`). Copy the full URL
with `/chat` appended into `CHAT_WORKER_URL` near the top of `chat.js` in
the repo root, then commit and push that change so the live site points at
the deployed Worker.
```

- [ ] **Step 6: Manually verify the Worker boots for real**

Run: `cd worker && npm run dev`
Expected: `wrangler dev` starts without errors and prints a local URL (e.g. `http://127.0.0.1:8787`). In another terminal, run the `curl` command from the README above (with a real key in `.dev.vars`). Expected: a `200` response with `{"text": "...", "replyToId": null, "reaction": ..., "offerContact": ...}` where `text` reads like Mal Griot answering a wedding-booking question in character. Stop the dev server (Ctrl+C) when done.

- [ ] **Step 7: Commit**

```bash
git add worker/src/index.js worker/test/index.test.js worker/README.md
git commit -m "Add chat worker entrypoint with routing, validation, and CORS"
```

---

## Task 6: Chat widget markup + header UI + base CSS + chat.js scaffold

**Files:**
- Create: `chat.js`
- Modify: `shared.js:42-59` (extract `chatHtml` into `chatWidgetHtml()`; simplify `DOMContentLoaded`'s chat-toggle block)
- Modify: `shared.css:128-147` (replace the shell-only panel rules with the new header/messages/form skeleton)
- Modify: `index.html:184`, `music.html:1074`, `griot-cuts.html:163`, `wellness-coaching.html:151`, `contact.html:140` (add `<script src="chat.js"></script>` after each page's `<script src="shared.js"></script>`)

**Interfaces:**
- Produces: `chatWidgetHtml(): string` (global function in `shared.js`) — consumed by Task 7 (`index.html`) and internally by `renderChrome()`.
- Produces: `initChat(): void` (global function in `chat.js`) — consumed by `shared.js`'s `DOMContentLoaded` listener.
- Produces CSS classes: `.chat-widget__header`, `.chat-widget__avatar`, `.chat-widget__status`, `.status-dot`, `.chat-widget__messages`, `.msg-row`, `.msg-row--bot`, `.msg-row--user`, `.msg-wrap`, `.msg`, `.msg--bot`, `.msg--user`, `.msg--typing`, `.chat-widget__reply-preview`, `.chat-widget__reply-cancel`, `.chat-widget__form`, `.chat-widget__input`, `.chat-widget__send` — consumed by Task 8 onward.

- [ ] **Step 1: Add `<script src="chat.js">` to every page**

In each of `index.html`, `music.html`, `griot-cuts.html`, `wellness-coaching.html`, `contact.html`, find:

```html
<script src="shared.js"></script>
```

and change it to:

```html
<script src="shared.js"></script>
<script src="chat.js"></script>
```

(This string is unique per file, so a simple find-and-replace in each of the 5 files is safe.)

- [ ] **Step 2: Create `chat.js` with a minimal `initChat()`**

```js
// Chat widget behavior for the "Mal" chat. Split out of shared.js because
// shared.js already owns nav/footer/mini-player, and this widget alone runs
// to several hundred lines. Loaded on every page via <script src="chat.js">,
// right after shared.js. initChat() is called once from shared.js's
// DOMContentLoaded listener.
function initChat() {
  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  if (!chat || !chatBtn) return;

  chatBtn.addEventListener('click', () => chat.classList.toggle('is-open'));
}
```

- [ ] **Step 3: Extract `chatWidgetHtml()` in `shared.js` and simplify the toggle wiring**

In `shared.js`, find:

```js
  const chatHtml = `
    <div class="chat-widget" id="chat">
      <button type="button" class="chat-widget__btn" id="chatBtn" aria-label="Open chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <div class="chat-widget__panel">
        <p class="chat-widget__title">Ask MAL GRIOT</p>
        <p class="chat-widget__body">The assistant is warming up — check back soon. For now, reach out directly via the contact page.</p>
      </div>
    </div>`;

  const navSlot = document.getElementById('chrome-nav');
  const footerSlot = document.getElementById('chrome-footer');
  const chatSlot = document.getElementById('chrome-chat');
  const playerSlot = document.getElementById('chrome-player');
  if (navSlot) navSlot.outerHTML = navHtml;
  if (footerSlot) footerSlot.outerHTML = footerHtml;
  if (chatSlot) chatSlot.outerHTML = chatHtml;
```

and replace it with:

```js
  const navSlot = document.getElementById('chrome-nav');
  const footerSlot = document.getElementById('chrome-footer');
  const chatSlot = document.getElementById('chrome-chat');
  const playerSlot = document.getElementById('chrome-player');
  if (navSlot) navSlot.outerHTML = navHtml;
  if (footerSlot) footerSlot.outerHTML = footerHtml;
  if (chatSlot) chatSlot.outerHTML = chatWidgetHtml();
```

Then, immediately after the closing `}` of the `renderChrome` function (right before the `const playerHtml = ...` comment block), add the new function:

```js
// The "Mal" chat widget markup — used by renderChrome() on every satellite
// page and directly by index.html (which has no nav/footer, so it doesn't
// call renderChrome() at all). All interactive behavior lives in chat.js's
// initChat(), wired up from this file's DOMContentLoaded listener below.
function chatWidgetHtml() {
  return `
    <div class="chat-widget" id="chat">
      <button type="button" class="chat-widget__btn" id="chatBtn" aria-label="Open chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <div class="chat-widget__panel">
        <div class="chat-widget__header">
          <img class="chat-widget__avatar" src="img/about.jpg" alt="Mal Griot">
          <div>
            <p class="chat-widget__title">Mal</p>
            <p class="chat-widget__status" id="chatStatus">
              <span class="status-dot" id="chatStatusDot"></span>
              <span id="chatStatusText">Online</span>
            </p>
          </div>
        </div>
        <div class="chat-widget__messages" id="chatMessages"></div>
        <div class="chat-widget__reply-preview" id="chatReplyPreview" hidden>
          <span id="chatReplyPreviewText"></span>
          <button type="button" class="chat-widget__reply-cancel" id="chatReplyCancel" aria-label="Cancel reply">&times;</button>
        </div>
        <form class="chat-widget__form" id="chatForm">
          <input class="chat-widget__input" id="chatInput" type="text" maxlength="500" placeholder="Say something..." autocomplete="off">
          <button type="submit" class="chat-widget__send" aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>`;
}
```

Finally, in the `DOMContentLoaded` listener near the bottom of `shared.js`, find:

```js
  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  if (chat && chatBtn) {
    chatBtn.addEventListener('click', () => chat.classList.toggle('is-open'));
  }

  initMiniPlayer();
```

and replace it with:

```js
  initChat();
  initMiniPlayer();
```

- [ ] **Step 4: Replace the shell-only CSS in `shared.css`**

Find:

```css
.chat-widget__panel{
  position:absolute;bottom:70px;right:0;width:300px;
  background:#1c1815;border:1px solid rgba(239,230,216,.12);border-radius:16px;
  padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.5);
  opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;
  transition:opacity .2s ease,transform .2s ease;
}
.chat-widget.is-open .chat-widget__panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.chat-widget__title{font-family:var(--font-display);font-size:15px;margin:0 0 6px}
.chat-widget__body{font-size:12.5px;color:var(--paper-dim);line-height:1.5;margin:0}
```

and replace it with:

```css
.chat-widget__panel{
  position:absolute;bottom:70px;right:0;width:320px;max-width:calc(100vw - 32px);
  background:#1c1815;border:1px solid rgba(239,230,216,.12);border-radius:16px;
  padding:0;box-shadow:0 20px 50px rgba(0,0,0,.5);
  opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;
  transition:opacity .2s ease,transform .2s ease;
  display:flex;flex-direction:column;overflow:hidden;
}
.chat-widget.is-open .chat-widget__panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}

.chat-widget__header{display:flex;align-items:center;gap:10px;padding:14px 18px 12px;border-bottom:1px solid rgba(239,230,216,.1)}
.chat-widget__avatar{width:32px;height:32px;border-radius:999px;object-fit:cover;border:1px solid rgba(239,230,216,.2);flex-shrink:0}
.chat-widget__title{font-family:var(--font-display);font-size:15px;margin:0}
.chat-widget__status{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--paper-dim);margin:2px 0 0;letter-spacing:.02em}
.status-dot{width:6px;height:6px;border-radius:999px;background:#4caf50;animation:mg-status-pulse 2.4s infinite ease-in-out}
.status-dot[hidden]{display:none}
@keyframes mg-status-pulse{0%,100%{opacity:1}50%{opacity:.35}}

.chat-widget__messages{position:relative;padding:14px 18px;display:flex;flex-direction:column;gap:16px;max-height:360px;overflow-y:auto}

.msg-row{display:flex;gap:8px;align-items:center;position:relative}
.msg-row--user{justify-content:flex-end}
.msg-row__avatar{width:22px;height:22px;border-radius:999px;object-fit:cover;flex-shrink:0}
.msg-wrap{position:relative;max-width:78%}
.msg{font-size:13px;line-height:1.5}
.msg--bot{background:rgba(239,230,216,.06);border:1px solid rgba(239,230,216,.1);color:var(--paper);padding:9px 12px;border-radius:12px 12px 12px 3px}
.msg--user{background:var(--brass);color:#12100f;padding:9px 12px;border-radius:12px 12px 3px 12px;font-weight:500}

.msg--typing{display:flex;gap:4px;padding:10px 12px;background:rgba(239,230,216,.06);border:1px solid rgba(239,230,216,.1);border-radius:12px 12px 12px 3px}
.msg--typing span{width:5px;height:5px;border-radius:999px;background:var(--paper-dim);animation:mg-typing-blink 1.2s infinite ease-in-out}
.msg--typing span:nth-child(2){animation-delay:.2s}
.msg--typing span:nth-child(3){animation-delay:.4s}
@keyframes mg-typing-blink{0%,100%{opacity:.25}40%{opacity:1}}

.chat-widget__reply-preview{display:none;align-items:center;justify-content:space-between;gap:8px;padding:6px 14px;margin:0 14px;background:rgba(239,230,216,.06);border:1px solid rgba(239,230,216,.12);border-radius:8px 8px 0 0;border-bottom:none;font-size:11px;color:var(--paper-dim)}
.chat-widget__reply-preview:not([hidden]){display:flex}
.chat-widget__reply-cancel{background:none;border:none;color:var(--paper-dim);cursor:pointer;font-size:14px;line-height:1;padding:0}

.chat-widget__form{display:flex;gap:8px;padding:12px 14px 14px;border-top:1px solid rgba(239,230,216,.1)}
.chat-widget__input{flex:1;background:rgba(239,230,216,.06);border:1px solid rgba(239,230,216,.14);border-radius:999px;padding:9px 14px;color:var(--paper);font-family:var(--font-body);font-size:12.5px;outline:none}
.chat-widget__input::placeholder{color:var(--paper-faint)}
.chat-widget__send{width:36px;height:36px;border-radius:999px;border:none;cursor:pointer;background:var(--brass);color:#12100f;display:flex;align-items:center;justify-content:center;flex-shrink:0}
```

- [ ] **Step 5: Manually verify in the browser**

Run: `npx serve .` (or `python3 -m http.server`) from the repo root, then open `contact.html` in a browser.
Expected: clicking the bottom-right chat bubble opens a panel showing your headshot, "Mal", and a pulsing green dot next to "Online", above an empty message area and a working text input + send button. No console errors. Click the bubble again to confirm it still closes. Repeat on `music.html`, `griot-cuts.html`, and `wellness-coaching.html`.

- [ ] **Step 6: Commit**

```bash
git add chat.js shared.js shared.css index.html music.html griot-cuts.html wellness-coaching.html contact.html
git commit -m "Add chat widget header UI and split chat behavior into chat.js"
```

---

## Task 7: Fix index.html to use the shared chat markup (DRY)

**Files:**
- Modify: `index.html:173-186`

**Interfaces:**
- Consumes: `chatWidgetHtml()` (Task 6, `shared.js`).

`index.html` currently hardcodes its own copy of the old chat widget markup instead of using the `chrome-chat` slot the other four pages use, so it silently went stale when Task 6 changed `chatWidgetHtml()`. This task brings it in line with the rest of the site.

- [ ] **Step 1: Replace the hardcoded widget with the shared slot**

In `index.html`, find:

```html
  <div class="chat-widget" id="chat">
    <button type="button" class="chat-widget__btn" id="chatBtn" aria-label="Open chat">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>
    <div class="chat-widget__panel">
      <p class="chat-widget__title">Ask MAL GRIOT</p>
      <p class="chat-widget__body">The assistant is warming up — check back soon. For now, reach out directly via the contact page.</p>
    </div>
  </div>
</div>

<script src="shared.js"></script>
<script src="chat.js"></script>
<script>
  const panels = document.getElementById('panels');
```

and replace it with:

```html
  <div id="chrome-chat"></div>
</div>

<script src="shared.js"></script>
<script src="chat.js"></script>
<script>
  document.getElementById('chrome-chat').outerHTML = chatWidgetHtml();

  const panels = document.getElementById('panels');
```

- [ ] **Step 2: Manually verify**

Open `index.html` in a browser. Expected: the chat bubble appears in the same bottom-right position, opens the same header/panel as the other pages, and there are no duplicate elements or console errors. Open DevTools → Elements and confirm `#chrome-chat` has been replaced by the full widget markup at runtime.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "De-duplicate chat widget markup on index.html"
```

---

## Task 8: chat.js core — state, rendering, send flow, typing timing, error fallback

**Files:**
- Modify: `chat.js` (replace Task 6's minimal `initChat()` with the full core implementation)

**Interfaces:**
- Consumes: DOM elements from `chatWidgetHtml()` (Task 6): `#chatMessages`, `#chatForm`, `#chatInput`, `#chatStatusDot`, `#chatStatusText`.
- Produces: `chatMessages: array` (module-level state), `chatGenerateId()`, `chatEscapeHtml(str)`, `chatTypingDelayMs(text)`, `chatFindMessage(id)`, `chatSendUserMessage(text)`, `chatAppendBotMessage(data)`, `chatSetStatus(state)`, `chatShowTyping()`, `chatHideTyping()`, `chatRender()`, `chatRenderRow(message)` — all consumed/extended by Tasks 9-12.

This task requires `CHAT_WORKER_URL` to point at a running Worker to test end to end. Follow `worker/README.md` to run `npm run dev` in `worker/` with a real `ANTHROPIC_API_KEY` in `.dev.vars` before doing Step 3 below, and temporarily set `CHAT_WORKER_URL` to `http://127.0.0.1:8787/chat`.

- [ ] **Step 1: Replace `chat.js` with the core implementation**

Replace the entire contents of `chat.js` with:

```js
// Chat widget behavior for the "Mal" chat. Split out of shared.js because
// shared.js already owns nav/footer/mini-player, and this widget alone runs
// to several hundred lines. Loaded on every page via <script src="chat.js">,
// right after shared.js. initChat() is called once from shared.js's
// DOMContentLoaded listener.

// Update this after `wrangler deploy` (see worker/README.md) — same
// placeholder-then-fill pattern as YOUTUBE_API_KEY in music.html.
const CHAT_WORKER_URL = 'https://mal-griot-chat.YOUR-SUBDOMAIN.workers.dev/chat';

const CHAT_MAX_INPUT_LENGTH = 500;
const CHAT_MAX_SENT_HISTORY = 20;
const CHAT_TYPING_BASE_DELAY_MS = 500;
const CHAT_TYPING_PER_WORD_MS = 40;
const CHAT_TYPING_MAX_DELAY_MS = 2200;
const CHAT_GREETINGS = [
  "Peace and love, what's good. Ask me about the music, the coaching work, or what it takes to book me.",
  "Peace and love, what's up. Music, Griot Cuts, wellness coaching, or booking, I'm listening.",
  "Peace and love, I'm listening. What do you want to know?",
];

let chatMessages = [];
let chatNextId = 1;

function chatGenerateId() {
  return 'm' + (chatNextId++) + '-' + Date.now().toString(36);
}

function chatEscapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function chatTypingDelayMs(text) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length;
  const delay = CHAT_TYPING_BASE_DELAY_MS + wordCount * CHAT_TYPING_PER_WORD_MS;
  return Math.min(CHAT_TYPING_MAX_DELAY_MS, delay);
}

function chatFindMessage(id) {
  return chatMessages.find((m) => m.id === id) || null;
}

function initChat() {
  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  chatBtn.addEventListener('click', () => {
    const opening = !chat.classList.contains('is-open');
    chat.classList.toggle('is-open');
    if (opening && chatMessages.length === 0) {
      chatAppendBotMessage({ text: CHAT_GREETINGS[Math.floor(Math.random() * CHAT_GREETINGS.length)] });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, CHAT_MAX_INPUT_LENGTH);
    if (!text) return;
    input.value = '';
    chatSendUserMessage(text);
  });
}

function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: null, reaction: null };
  chatMessages.push(message);
  chatRender();
  chatSetStatus('typing');
  chatShowTyping();

  const payload = {
    messages: chatMessages.slice(-CHAT_MAX_SENT_HISTORY).map((m) => ({
      id: m.id,
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    })),
  };

  const startedAt = Date.now();
  fetch(CHAT_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) throw new Error('Worker responded with ' + res.status);
      return res.json();
    })
    .then((data) => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, chatTypingDelayMs(data.text) - elapsed);
      setTimeout(() => {
        chatHideTyping();
        chatSetStatus('online');
        chatAppendBotMessage(data);
      }, remaining);
    })
    .catch(() => {
      chatHideTyping();
      chatSetStatus('online');
      chatAppendBotMessage({
        text: 'Something went sideways, reach out directly on the contact page.',
      });
    });
}

function chatAppendBotMessage(data) {
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: null,
    reaction: null,
  });
  chatRender();
}

function chatSetStatus(state) {
  const dot = document.getElementById('chatStatusDot');
  const text = document.getElementById('chatStatusText');
  if (!dot || !text) return;
  if (state === 'typing') {
    dot.hidden = true;
    text.textContent = 'typing...';
  } else {
    dot.hidden = false;
    text.textContent = 'Online';
  }
}

function chatShowTyping() {
  const messagesEl = document.getElementById('chatMessages');
  if (!messagesEl || document.getElementById('chatTypingRow')) return;
  const row = document.createElement('div');
  row.className = 'msg-row msg-row--bot';
  row.id = 'chatTypingRow';
  row.innerHTML =
    '<img class="msg-row__avatar" src="img/about.jpg" alt="">' +
    '<div class="msg-wrap"><div class="msg--typing"><span></span><span></span><span></span></div></div>';
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function chatHideTyping() {
  const row = document.getElementById('chatTypingRow');
  if (row) row.remove();
}

function chatRender() {
  const messagesEl = document.getElementById('chatMessages');
  if (!messagesEl) return;
  messagesEl.innerHTML = chatMessages.map(chatRenderRow).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${chatEscapeHtml(message.text)}</div>
      </div>
    </div>`;
}
```

- [ ] **Step 2: Manually verify the basic chat works**

With the Worker running locally (`cd worker && npm run dev`) and `CHAT_WORKER_URL` in `chat.js` temporarily set to `http://127.0.0.1:8787/chat`, open `contact.html` (served via `npx serve .` or similar, not `file://`, so `fetch` isn't blocked by CORS-on-file weirdness) in a browser.

Expected:
1. Clicking the bubble shows a "Peace and love..." greeting.
2. Typing "do you do weddings?" and pressing Enter shows your message, then the header status swaps to "typing..." (dot disappears) and a three-dot bubble appears at the bottom of the list.
3. After a short pause, the typing bubble is replaced by Mal's real reply, and the header goes back to the pulsing-dot "Online" state.
4. Reloading the page clears the conversation back to empty (greeting only shows again on next open).
5. Stop the worker dev server, send another message: expect the typing indicator to show, then the "Something went sideways..." fallback message to appear instead of an error or a stuck state.

Revert `CHAT_WORKER_URL` back to the placeholder value afterward (it gets its real value once Task 5's Worker is actually deployed, per `worker/README.md`).

- [ ] **Step 3: Commit**

```bash
git add chat.js
git commit -m "Implement core chat send flow with typing indicator and error fallback"
```

---

## Task 9: Reactions

**Files:**
- Modify: `chat.js` (add reaction state/functions, wire the delegated click listener, extend `chatRenderRow`)
- Modify: `shared.css` (add hover controls, picker, and reaction badge styles)

**Interfaces:**
- Consumes: `chatMessages`, `chatFindMessage`, `chatRender` (Task 8).
- Produces: `CHAT_REACTION_EMOJI: array`, `chatTogglePicker(messageId)`, `chatClosePicker()`, `chatSetReaction(messageId, emoji)`, `chatLastUserMessage()` — the last is consumed and extended by Task 10.

- [ ] **Step 1: Add the reaction emoji constant**

In `chat.js`, find:

```js
const CHAT_TYPING_MAX_DELAY_MS = 2200;
const CHAT_GREETINGS = [
```

and replace it with:

```js
const CHAT_TYPING_MAX_DELAY_MS = 2200;
const CHAT_REACTION_EMOJI = ['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾'];
const CHAT_GREETINGS = [
```

- [ ] **Step 2: Add the picker and reaction functions**

Find:

```js
function chatFindMessage(id) {
  return chatMessages.find((m) => m.id === id) || null;
}

function initChat() {
```

and replace it with:

```js
function chatFindMessage(id) {
  return chatMessages.find((m) => m.id === id) || null;
}

// The picker always centers horizontally inside the message list (see the
// .emoji-picker CSS) so it can never be clipped by the panel's edges; the
// only thing computed here is whether it opens above or below its row.
function chatTogglePicker(messageId) {
  const row = document.querySelector(`.msg-row[data-message-id="${messageId}"]`);
  if (!row) return;
  const alreadyOpen = row.querySelector('.emoji-picker');
  chatClosePicker();
  if (alreadyOpen) return;

  const messagesEl = document.getElementById('chatMessages');
  const rowRect = row.getBoundingClientRect();
  const listRect = messagesEl.getBoundingClientRect();
  const spaceBelow = listRect.bottom - rowRect.bottom;
  const openBelow = spaceBelow > 140;

  const picker = document.createElement('div');
  picker.className = 'emoji-picker ' + (openBelow ? 'picker-below' : 'picker-above');
  picker.innerHTML = CHAT_REACTION_EMOJI
    .map((emoji) => `<button type="button" data-chat-emoji="${emoji}">${emoji}</button>`)
    .join('');
  row.appendChild(picker);
}

function chatClosePicker() {
  document.querySelectorAll('.emoji-picker').forEach((el) => el.remove());
}

function chatSetReaction(messageId, emoji) {
  const message = chatFindMessage(messageId);
  if (!message) return;
  message.reaction = emoji;
  chatClosePicker();
  chatRender();
}

function chatLastUserMessage() {
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    if (chatMessages[i].role === 'user') return chatMessages[i];
  }
  return null;
}

function initChat() {
```

- [ ] **Step 3: Wire the delegated click listener**

Find:

```js
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  chatBtn.addEventListener('click', () => {
```

and replace it with:

```js
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  messagesEl.addEventListener('click', (e) => {
    const reactBtn = e.target.closest('[data-chat-react]');
    const emojiBtn = e.target.closest('[data-chat-emoji]');
    if (reactBtn) {
      chatTogglePicker(reactBtn.closest('.msg-row').dataset.messageId);
      return;
    }
    if (emojiBtn) {
      const row = emojiBtn.closest('.msg-row');
      chatSetReaction(row.dataset.messageId, emojiBtn.dataset.chatEmoji);
      return;
    }
  });

  chatBtn.addEventListener('click', () => {
```

- [ ] **Step 4: Close the picker on every re-render**

Find:

```js
function chatRender() {
  const messagesEl = document.getElementById('chatMessages');
  if (!messagesEl) return;
  messagesEl.innerHTML = chatMessages.map(chatRenderRow).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
```

and replace it with:

```js
function chatRender() {
  const messagesEl = document.getElementById('chatMessages');
  if (!messagesEl) return;
  chatClosePicker();
  messagesEl.innerHTML = chatMessages.map(chatRenderRow).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
```

- [ ] **Step 5: Render the react button and reaction badge**

Find:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${chatEscapeHtml(message.text)}</div>
      </div>
    </div>`;
}
```

and replace it with:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  const reactionHtml = message.reaction ? `<div class="reaction-chip">${message.reaction}</div>` : '';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${chatEscapeHtml(message.text)}</div>
        ${reactionHtml}
      </div>
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
      </div>
    </div>`;
}
```

- [ ] **Step 6: Have the bot's own reaction land on the visitor's message**

Find:

```js
function chatAppendBotMessage(data) {
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: null,
    reaction: null,
  });
  chatRender();
}
```

and replace it with:

```js
function chatAppendBotMessage(data) {
  if (data.reaction) {
    const target = chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: null,
    reaction: null,
  });
  chatRender();
}
```

- [ ] **Step 7: Add the CSS**

Append to `shared.css`, after the block added in Task 6:

```css
.msg-controls{display:flex;gap:3px;opacity:0;transition:opacity .12s ease;flex-shrink:0}
.msg-row:hover .msg-controls{opacity:1}
.msg-controls button{
  width:22px;height:22px;border-radius:999px;border:1px solid rgba(239,230,216,.18);
  background:#1c1815;color:var(--paper-dim);font-size:11px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:transform .12s ease, background .12s ease;
}
.msg-controls button:hover{transform:scale(1.15);background:rgba(201,138,69,.22)}

.reaction-chip{position:absolute;bottom:-11px;background:#1c1815;border:1px solid rgba(239,230,216,.2);border-radius:999px;font-size:11px;padding:1px 5px;line-height:1.5}
.msg-row--bot .reaction-chip{right:2px}
.msg-row--user .reaction-chip{left:2px}

.emoji-picker{
  position:absolute;left:50%;transform:translateX(-50%);
  background:#1c1815;border:1px solid rgba(239,230,216,.16);border-radius:12px;
  padding:8px;box-shadow:0 12px 30px rgba(0,0,0,.5);
  display:grid;grid-template-columns:repeat(5,1fr);gap:4px;z-index:5;
  width:max-content;
}
.emoji-picker.picker-below{top:32px}
.emoji-picker.picker-above{bottom:32px}
.emoji-picker button{
  width:26px;height:26px;border:none;background:transparent;border-radius:999px;
  font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:transform .12s ease, background .12s ease;
}
.emoji-picker button:hover{transform:scale(1.2);background:rgba(201,138,69,.22)}
```

- [ ] **Step 8: Manually verify**

Reload the chat widget in the browser (Worker running locally as in Task 8). Send a couple of messages so both a bot bubble and a user bubble exist. Hover the bot bubble: a 🙂 button fades in, vertically centered beside it. Click it: a 2x5 emoji grid opens, horizontally centered inside the panel (not clipped by either edge), positioned below the bubble since it's near the top of the list. Hover an emoji: it scales up with a soft brass circle behind it. Click one: the picker closes and the emoji appears as a small badge at the bottom-right corner of that bot bubble. Repeat on a user bubble: the badge should land at the bottom-left corner instead. Scroll so a bubble sits near the bottom of the visible list and open its picker: it should now open above the bubble instead of below, still centered and fully visible.

- [ ] **Step 9: Commit**

```bash
git add chat.js shared.css
git commit -m "Add reactions with a centered, flip-aware emoji picker"
```

---

## Task 10: Reply threading

**Files:**
- Modify: `chat.js` (add reply state/functions, wire reply button + cancel button, extend send flow and rendering)
- Modify: `shared.css` (add quoted-message styling)

**Interfaces:**
- Consumes: `chatFindMessage`, `chatLastUserMessage` (Task 9), `chatMessages` (Task 8).
- Produces: `chatReplyTargetId` (module-level state), `chatSnippet(text)`, `chatStartReply(messageId)`, `chatCancelReply()`.

- [ ] **Step 1: Add reply target state**

Find:

```js
let chatMessages = [];
let chatNextId = 1;
```

and replace it with:

```js
let chatMessages = [];
let chatNextId = 1;
let chatReplyTargetId = null;
```

- [ ] **Step 2: Add the reply functions**

Find:

```js
function chatSetReaction(messageId, emoji) {
  const message = chatFindMessage(messageId);
  if (!message) return;
  message.reaction = emoji;
  chatClosePicker();
  chatRender();
}

function chatLastUserMessage() {
```

and replace it with:

```js
function chatSetReaction(messageId, emoji) {
  const message = chatFindMessage(messageId);
  if (!message) return;
  message.reaction = emoji;
  chatClosePicker();
  chatRender();
}

function chatSnippet(text) {
  const clean = String(text).trim();
  return clean.length > 40 ? clean.slice(0, 40) + '...' : clean;
}

function chatStartReply(messageId) {
  const target = chatFindMessage(messageId);
  if (!target) return;
  chatReplyTargetId = messageId;
  const preview = document.getElementById('chatReplyPreview');
  const previewText = document.getElementById('chatReplyPreviewText');
  if (preview && previewText) {
    const who = target.role === 'bot' ? 'Griot' : 'you';
    previewText.textContent = `Replying to ${who}: "${chatSnippet(target.text)}"`;
    preview.hidden = false;
  }
  chatClosePicker();
}

function chatCancelReply() {
  chatReplyTargetId = null;
  const preview = document.getElementById('chatReplyPreview');
  if (preview) preview.hidden = true;
}

function chatLastUserMessage() {
```

- [ ] **Step 3: Wire the reply button and the cancel button**

Find:

```js
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  messagesEl.addEventListener('click', (e) => {
    const reactBtn = e.target.closest('[data-chat-react]');
    const emojiBtn = e.target.closest('[data-chat-emoji]');
    if (reactBtn) {
      chatTogglePicker(reactBtn.closest('.msg-row').dataset.messageId);
      return;
    }
    if (emojiBtn) {
      const row = emojiBtn.closest('.msg-row');
      chatSetReaction(row.dataset.messageId, emojiBtn.dataset.chatEmoji);
      return;
    }
  });
```

and replace it with:

```js
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  const replyCancel = document.getElementById('chatReplyCancel');
  if (replyCancel) replyCancel.addEventListener('click', () => chatCancelReply());

  messagesEl.addEventListener('click', (e) => {
    const reactBtn = e.target.closest('[data-chat-react]');
    const replyBtn = e.target.closest('[data-chat-reply]');
    const emojiBtn = e.target.closest('[data-chat-emoji]');
    if (reactBtn) {
      chatTogglePicker(reactBtn.closest('.msg-row').dataset.messageId);
      return;
    }
    if (replyBtn) {
      chatStartReply(replyBtn.closest('.msg-row').dataset.messageId);
      return;
    }
    if (emojiBtn) {
      const row = emojiBtn.closest('.msg-row');
      chatSetReaction(row.dataset.messageId, emojiBtn.dataset.chatEmoji);
      return;
    }
  });
```

- [ ] **Step 4: Include `replyToId` when sending, and clear the reply target after sending**

Find:

```js
function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: null, reaction: null };
  chatMessages.push(message);
  chatRender();
  chatSetStatus('typing');
  chatShowTyping();

  const payload = {
    messages: chatMessages.slice(-CHAT_MAX_SENT_HISTORY).map((m) => ({
      id: m.id,
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    })),
  };
```

and replace it with:

```js
function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: chatReplyTargetId, reaction: null };
  chatMessages.push(message);
  chatCancelReply();
  chatRender();
  chatSetStatus('typing');
  chatShowTyping();

  const payload = {
    messages: chatMessages.slice(-CHAT_MAX_SENT_HISTORY).map((m) => ({
      id: m.id,
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
      replyToId: m.replyToId || undefined,
    })),
  };
```

- [ ] **Step 5: Let the bot thread its own reply**

Find:

```js
function chatAppendBotMessage(data) {
  if (data.reaction) {
    const target = chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: null,
    reaction: null,
  });
  chatRender();
}
```

and replace it with:

```js
function chatAppendBotMessage(data) {
  if (data.reaction) {
    const target = (data.replyToId && chatFindMessage(data.replyToId)) || chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: data.replyToId || null,
    reaction: null,
  });
  chatRender();
}
```

- [ ] **Step 6: Render the quoted snippet and the reply button**

Find:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  const reactionHtml = message.reaction ? `<div class="reaction-chip">${message.reaction}</div>` : '';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${chatEscapeHtml(message.text)}</div>
        ${reactionHtml}
      </div>
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
      </div>
    </div>`;
}
```

and replace it with:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  const quoted = message.replyToId ? chatFindMessage(message.replyToId) : null;
  const quoteHtml = quoted
    ? `<div class="msg-quote">Replying to ${quoted.role === 'bot' ? 'Griot' : 'you'}: "${chatEscapeHtml(chatSnippet(quoted.text))}"</div>`
    : '';
  const reactionHtml = message.reaction ? `<div class="reaction-chip">${message.reaction}</div>` : '';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${quoteHtml}${chatEscapeHtml(message.text)}</div>
        ${reactionHtml}
      </div>
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
        <button type="button" data-chat-reply title="Reply">↩</button>
      </div>
    </div>`;
}
```

- [ ] **Step 7: Add the CSS**

Append to `shared.css`:

```css
.msg-quote{font-size:11px;color:var(--paper-dim);border-left:2px solid var(--brass);padding:3px 8px;margin-bottom:6px;background:rgba(0,0,0,.15);border-radius:4px}
.msg--user .msg-quote{color:rgba(18,16,15,.6);border-left-color:#12100f;background:rgba(18,16,15,.08)}
```

- [ ] **Step 8: Manually verify**

Reload the widget. Send a message, hover it, click the ↩ button: a preview bar reading `Replying to you: "..."` appears above the input. Type a follow-up and send it: the new message renders with the quoted snippet inside its own bubble, and the preview bar clears. Reply to a bot bubble the same way and confirm it reads `Replying to Griot: "..."`. To confirm the bot's own threading without waiting on a specific model response, open the browser console and run `chatAppendBotMessage({text: 'test threaded reply', replyToId: chatMessages[0].id})`, then confirm it renders quoting `chatMessages[0]` correctly.

- [ ] **Step 9: Commit**

```bash
git add chat.js shared.css
git commit -m "Add IG/WhatsApp-style reply threading in both directions"
```

---

## Task 11: Contact hand-off buttons

**Files:**
- Modify: `chat.js` (render CTA buttons when `offerContact` is set; mark the error fallback as an `offerContact` case)
- Modify: `shared.css` (small styling for the CTA row)

**Interfaces:**
- Consumes: `chatRenderRow`, `chatAppendBotMessage` (Task 10).

- [ ] **Step 1: Track `offerContact` on bot messages**

Find:

```js
function chatAppendBotMessage(data) {
  if (data.reaction) {
    const target = (data.replyToId && chatFindMessage(data.replyToId)) || chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: data.replyToId || null,
    reaction: null,
  });
  chatRender();
}
```

and replace it with:

```js
function chatAppendBotMessage(data) {
  if (data.reaction) {
    const target = (data.replyToId && chatFindMessage(data.replyToId)) || chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }
  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text: data.text,
    replyToId: data.replyToId || null,
    reaction: null,
    offerContact: !!data.offerContact,
  });
  chatRender();
}
```

- [ ] **Step 2: Make the network-error fallback offer contact too**

Find:

```js
    .catch(() => {
      chatHideTyping();
      chatSetStatus('online');
      chatAppendBotMessage({
        text: 'Something went sideways, reach out directly on the contact page.',
      });
    });
```

and replace it with:

```js
    .catch(() => {
      chatHideTyping();
      chatSetStatus('online');
      chatAppendBotMessage({
        text: 'Something went sideways.',
        offerContact: true,
      });
    });
```

- [ ] **Step 3: Render the CTA buttons**

Find:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  const quoted = message.replyToId ? chatFindMessage(message.replyToId) : null;
  const quoteHtml = quoted
    ? `<div class="msg-quote">Replying to ${quoted.role === 'bot' ? 'Griot' : 'you'}: "${chatEscapeHtml(chatSnippet(quoted.text))}"</div>`
    : '';
  const reactionHtml = message.reaction ? `<div class="reaction-chip">${message.reaction}</div>` : '';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${quoteHtml}${chatEscapeHtml(message.text)}</div>
        ${reactionHtml}
      </div>
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
        <button type="button" data-chat-reply title="Reply">↩</button>
      </div>
    </div>`;
}
```

and replace it with:

```js
function chatRenderRow(message) {
  const isBot = message.role === 'bot';
  const quoted = message.replyToId ? chatFindMessage(message.replyToId) : null;
  const quoteHtml = quoted
    ? `<div class="msg-quote">Replying to ${quoted.role === 'bot' ? 'Griot' : 'you'}: "${chatEscapeHtml(chatSnippet(quoted.text))}"</div>`
    : '';
  const reactionHtml = message.reaction ? `<div class="reaction-chip">${message.reaction}</div>` : '';
  const contactHtml = message.offerContact
    ? `<div class="chat-widget__contact-ctas">
        <a class="btn btn-light" href="contact.html">Contact page</a>
        <a class="btn btn-outline" href="https://wa.me/917718816239" target="_blank" rel="noopener">WhatsApp</a>
      </div>`
    : '';
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${quoteHtml}${chatEscapeHtml(message.text)}</div>
        ${reactionHtml}
      </div>
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
        <button type="button" data-chat-reply title="Reply">↩</button>
      </div>
    </div>
    ${contactHtml}`;
}
```

- [ ] **Step 4: Add the CSS**

Append to `shared.css`:

```css
.chat-widget__contact-ctas{display:flex;gap:8px;margin:4px 0 0 30px}
.chat-widget__contact-ctas .btn{padding:8px 16px;font-size:10.5px;letter-spacing:.06em}
```

- [ ] **Step 5: Manually verify**

Reload the widget with the Worker running. Ask something like "what do you charge for a wedding?" and confirm the reply renders with "Contact page" and "WhatsApp" buttons beneath it, that "Contact page" is a normal same-tab link to `contact.html`, and "WhatsApp" opens `https://wa.me/917718816239` in a new tab. Then stop the Worker and send another message: confirm the fallback message also shows both buttons.

- [ ] **Step 6: Commit**

```bash
git add chat.js shared.css
git commit -m "Add Contact page and WhatsApp hand-off buttons"
```

---

## Task 12: 10-message limit enforcement

**Files:**
- Modify: `chat.js` (count visitor messages, intercept the 10th, disable input)
- Modify: `shared.css` (disabled-state styling)

**Interfaces:**
- Consumes: `chatSendUserMessage`, `chatAppendBotMessage`, `chatTypingDelayMs` (Task 8-11).

- [ ] **Step 1: Add the limit constant, redirect copy, and counter**

Find:

```js
const CHAT_GREETINGS = [
  "Peace and love, what's good. Ask me about the music, the coaching work, or what it takes to book me.",
  "Peace and love, what's up. Music, Griot Cuts, wellness coaching, or booking, I'm listening.",
  "Peace and love, I'm listening. What do you want to know?",
];
```

and replace it with:

```js
const CHAT_GREETINGS = [
  "Peace and love, what's good. Ask me about the music, the coaching work, or what it takes to book me.",
  "Peace and love, what's up. Music, Griot Cuts, wellness coaching, or booking, I'm listening.",
  "Peace and love, I'm listening. What do you want to know?",
];
const CHAT_MAX_VISITOR_MESSAGES = 10;
const CHAT_LIMIT_REDIRECTS = [
  "Peace and love, we've covered a lot. Can we continue this conversation on WhatsApp?",
  "Actually, can we continue this conversation on WhatsApp? Hit me up from there.",
  "Peace and love, let's keep going on WhatsApp from here.",
];
```

Find:

```js
let chatMessages = [];
let chatNextId = 1;
let chatReplyTargetId = null;
```

and replace it with:

```js
let chatMessages = [];
let chatNextId = 1;
let chatReplyTargetId = null;
let chatVisitorMessageCount = 0;
```

- [ ] **Step 2: Intercept the 10th message before any Worker call**

Find:

```js
function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: chatReplyTargetId, reaction: null };
  chatMessages.push(message);
  chatCancelReply();
  chatRender();
  chatSetStatus('typing');
  chatShowTyping();

  const payload = {
```

and replace it with:

```js
function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: chatReplyTargetId, reaction: null };
  chatMessages.push(message);
  chatCancelReply();
  chatVisitorMessageCount++;
  chatRender();

  if (chatVisitorMessageCount >= CHAT_MAX_VISITOR_MESSAGES) {
    chatSetStatus('typing');
    chatShowTyping();
    const redirectText = CHAT_LIMIT_REDIRECTS[Math.floor(Math.random() * CHAT_LIMIT_REDIRECTS.length)];
    setTimeout(() => {
      chatHideTyping();
      chatSetStatus('online');
      chatAppendBotMessage({ text: redirectText, offerContact: true });
      chatDisableInput();
    }, chatTypingDelayMs(redirectText));
    return;
  }

  chatSetStatus('typing');
  chatShowTyping();

  const payload = {
```

- [ ] **Step 3: Add `chatDisableInput()` and guard the submit handler**

Find:

```js
function chatAppendBotMessage(data) {
```

and insert immediately before it:

```js
function chatDisableInput() {
  const input = document.getElementById('chatInput');
  const form = document.getElementById('chatForm');
  if (input) {
    input.disabled = true;
    input.placeholder = 'Continue on WhatsApp';
  }
  if (form) form.classList.add('is-disabled');
}

function chatAppendBotMessage(data) {
```

Find:

```js
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, CHAT_MAX_INPUT_LENGTH);
    if (!text) return;
    input.value = '';
    chatSendUserMessage(text);
  });
```

and replace it with:

```js
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.disabled) return;
    const text = input.value.trim().slice(0, CHAT_MAX_INPUT_LENGTH);
    if (!text) return;
    input.value = '';
    chatSendUserMessage(text);
  });
```

- [ ] **Step 4: Add the CSS**

Append to `shared.css`:

```css
.chat-widget__form.is-disabled .chat-widget__send{opacity:.4;pointer-events:none}
.chat-widget__input:disabled{opacity:.5;cursor:not-allowed}
```

- [ ] **Step 5: Manually verify**

Reload the widget. Send 9 short messages (any content, e.g. "hi" nine times) and confirm each gets a normal reply. Send a 10th: confirm no network request fires for it (check the Network tab, or just watch that the typing delay for the 10th doesn't correspond to a real fetch), the reply is one of the canned WhatsApp lines with the "Contact page" / "WhatsApp" buttons beneath it, and the input becomes disabled with the placeholder "Continue on WhatsApp". Confirm the send button is visually dimmed and pressing Enter in the disabled input does nothing.

- [ ] **Step 6: Commit**

```bash
git add chat.js shared.css
git commit -m "Cap visitor messages at 10 with a client-side WhatsApp redirect"
```

---

## Task 13: Update README documentation

**Files:**
- Modify: `README.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Replace the stale "shell-only" paragraph**

In `README.md`, find:

```
The chat widget (bottom-right bubble, `.chat-widget` in `shared.css`, markup in `shared.js`'s `chatHtml`) is **shell-only** — the panel just shows a static "warming up" message. Comment in `shared.css` explicitly flags it: "Phase 2 wires logic." No backend, no assistant wired up yet.
```

and replace it with:

```
The chat widget ("Mal", bottom-right bubble) is a real chatbot, not a shell. Markup lives in `shared.js`'s `chatWidgetHtml()` (used by `renderChrome()` on every satellite page, and directly by `index.html` since it has no nav/footer); all interactive behavior (state, rendering, reactions, reply threading, the Worker call) lives in `chat.js`, loaded on every page right after `shared.js`. Styling is in `shared.css` alongside the rest of the shared chrome.

The bot is backed by a small Cloudflare Worker in `worker/` (a separate Node project with its own `package.json`) that holds the Anthropic API key server-side and calls Claude (`claude-haiku-4-5-20251001`) via a forced `respond` tool call, returning `{ text, replyToId, reaction, offerContact }`. See `worker/README.md` for local dev and deployment (`wrangler dev` / `wrangler secret put ANTHROPIC_API_KEY` / `wrangler deploy`). After deploying, update `CHAT_WORKER_URL` near the top of `chat.js` to the deployed Worker's URL, same placeholder-then-fill pattern as `YOUTUBE_API_KEY` below.

The bot speaks in character as Mal Griot: greets and signs off with "Peace and love", never uses an en dash, uses at most one hand emoji per reply (from a fixed 10-emoji brown-skin-tone set), never discusses his personal life (child, relationships), and never states a rate. A visitor gets 10 messages per conversation; the 10th is intercepted client-side with a WhatsApp redirect and the input then disables. Booking, pricing, unknown-answer, and limit-reached replies all hand off to both the contact page and WhatsApp (+91 77188 16239) via buttons rendered under the reply. Full design rationale: `docs/superpowers/specs/2026-08-04-ask-mal-griot-chatbot-design.md`.
```

- [ ] **Step 2: Manually verify**

Read the updated section top to bottom and confirm it matches what actually shipped: no references to the old `chatHtml`/"warming up" copy, file names match (`chat.js`, `chatWidgetHtml()`, `worker/`), and the WhatsApp number/model name are correct.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document the chat worker and Mal chatbot in the site README"
```

---

## Self-Review Notes

**Spec coverage:** every section of `docs/superpowers/specs/2026-08-04-ask-mal-griot-chatbot-design.md` maps to a task — Architecture → Tasks 1-5; Header/Message list/Typing → Task 6, 8; Reactions → Task 9; Reply threading → Task 10; Contact hand-off → Task 11; Message limit → Task 12; Content boundaries (en dash, Peace and love, one emoji, personal-life deflection, playful unknown-answer, dry off-topic reply) → Task 3's `SYSTEM_PROMPT` and its tests; index.html DRY fix (an in-scope cleanup surfaced while mapping the file structure, not in the original spec text but required for `chatWidgetHtml()` to be a single source of truth) → Task 7; README → Task 13.

**Type/name consistency check performed:** `chatFindMessage`, `chatRender`, `chatRenderRow`, `chatAppendBotMessage`, `chatSendUserMessage`, `CHAT_REACTION_EMOJI`, `chatLastUserMessage`, `chatSnippet`, `chatStartReply`, `chatCancelReply`, `chatTogglePicker`, `chatClosePicker`, `chatSetReaction`, `chatDisableInput`, `chatTypingDelayMs`, `chatEscapeHtml`, `chatGenerateId` are each defined once and referenced with the same name and signature in every later task that touches them. Worker-side: `corsHeaders`/`isAllowedOrigin` (Task 1), `validateMessages`/`capHistory`/`ValidationError`/`MAX_HISTORY_MESSAGES` (Task 2), `SYSTEM_PROMPT` (Task 3), `getBotResponse`/`AnthropicError`/`toAnthropicMessages`/`MODEL` (Task 4) all match their Task 5 import sites exactly.
