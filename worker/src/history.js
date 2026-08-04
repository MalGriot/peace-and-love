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
