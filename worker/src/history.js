export const MAX_HISTORY_MESSAGES = 20;

// The 500-char cap mirrors the frontend's maxlength on the visitor's own
// input box, so it should only constrain user messages. Assistant replies
// are bounded by max_tokens: 400 in the Anthropic call (~1600 chars), so
// they get a higher ceiling comfortably above that.
export const MAX_USER_CONTENT_LENGTH = 500;
export const MAX_ASSISTANT_CONTENT_LENGTH = 2000;

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
    const maxLength = m.role === 'user' ? MAX_USER_CONTENT_LENGTH : MAX_ASSISTANT_CONTENT_LENGTH;
    if (m.content.length > maxLength) {
      throw new ValidationError(`message content exceeds ${maxLength} characters`);
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
