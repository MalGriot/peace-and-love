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
