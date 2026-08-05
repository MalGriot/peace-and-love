const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-haiku-4-5-20251001';

// Must match CHAT_REACTION_EMOJI in chat.js — the fixed hand-emoji set the
// model is allowed to react with. Anything else the model returns is dropped.
export const REACTION_EMOJI_SET = new Set(['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾']);

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
    // Only visitor messages carry an id prefix: the model's replyToId always
    // threads to a visitor message (see systemPrompt.js), never to one of
    // its own earlier replies, so assistant turns don't need one.
    if (m.role === 'user') {
      content = `[id:${m.id}] ${content}`;
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

  // The model can only thread to a real visitor message from this
  // conversation — never a hallucinated id, and never one of its own
  // earlier replies (assistant ids are never exposed to it in the first
  // place, see toAnthropicMessages).
  const validUserIds = new Set(messages.filter((m) => m.role === 'user').map((m) => m.id));
  const replyToId = typeof input.replyToId === 'string' && validUserIds.has(input.replyToId) ? input.replyToId : null;

  return {
    text: input.text,
    replyToId,
    reaction: typeof input.reaction === 'string' && REACTION_EMOJI_SET.has(input.reaction) ? input.reaction : null,
    offerContact: input.offerContact === true,
  };
}
