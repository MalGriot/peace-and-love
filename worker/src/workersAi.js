// Cloudflare Workers AI is free (10,000 neurons/day, no card required, no
// separate API key — auth rides on the Worker's own `env.AI` binding
// declared in wrangler.toml). Traded off against Anthropic: no forced
// tool-choice API, so we lean on JSON Mode (response_format: json_schema)
// instead, and a 70B open model is a weaker instruction-follower than
// Claude, so the persona's hard rules carry a little less certainty.
export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Must match CHAT_REACTION_EMOJI in chat.js — the fixed hand-emoji set the
// model is allowed to react with. Anything else the model returns is dropped.
export const REACTION_EMOJI_SET = new Set(['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾']);

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    replyToId: { type: 'string' },
    reaction: { type: 'string' },
    offerContact: { type: 'boolean' },
  },
  required: ['text'],
};

export class WorkersAiError extends Error {}

export function toWorkersAiMessages(systemPrompt, messages) {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const rest = messages.map((m) => {
    let content = m.content;
    if (m.replyToId && byId.has(m.replyToId)) {
      const target = byId.get(m.replyToId);
      content = `[Replying to: "${target.content}"] ${content}`;
    }
    // Only visitor messages carry an id prefix: the model's replyToId always
    // threads to a visitor message (see systemPrompt.js), never to one of
    // its own earlier replies, so assistant turns don't need one.
    if (m.role === 'user') {
      content = `[id:${m.id}] ${content}`;
    }
    return { role: m.role, content };
  });
  return [{ role: 'system', content: systemPrompt }, ...rest];
}

// Workers AI's JSON Mode response shape isn't fully pinned down in public
// docs at the time of writing — some responses land the parsed object
// directly on `.response`, others return it as a JSON string. Handle both
// rather than assuming one.
function extractJson(result) {
  const raw = result && Object.prototype.hasOwnProperty.call(result, 'response') ? result.response : result;
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export async function getBotResponse({ ai, systemPrompt, messages, runImpl }) {
  const run = runImpl || ((model, options) => ai.run(model, options));

  let result;
  try {
    result = await run(MODEL, {
      messages: toWorkersAiMessages(systemPrompt, messages),
      response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
    });
  } catch (err) {
    throw new WorkersAiError(`Workers AI request failed: ${err.message || err}`);
  }

  const input = extractJson(result);
  if (!input || typeof input.text !== 'string' || input.text.length === 0) {
    throw new WorkersAiError('Workers AI response did not include valid JSON with a text field');
  }

  // The model can only thread to a real visitor message from this
  // conversation — never a hallucinated id, and never one of its own
  // earlier replies (assistant ids are never exposed to it in the first
  // place, see toWorkersAiMessages).
  const validUserIds = new Set(messages.filter((m) => m.role === 'user').map((m) => m.id));
  const replyToId = typeof input.replyToId === 'string' && validUserIds.has(input.replyToId) ? input.replyToId : null;

  return {
    text: input.text,
    replyToId,
    reaction: typeof input.reaction === 'string' && REACTION_EMOJI_SET.has(input.reaction) ? input.reaction : null,
    offerContact: input.offerContact === true,
  };
}
