import { corsHeaders, isAllowedOrigin } from './cors.js';
import { validateMessages, capHistory, ValidationError } from './history.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { getBotResponse } from './anthropic.js';

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

    // Anthropic requires the first message in a conversation to have role
    // "user". Both a leading greeting appended client-side and capHistory
    // itself (once history exceeds the cap) can produce a leading
    // non-user message, so trim it here regardless of source.
    const firstUserIndex = capped.findIndex((m) => m.role === 'user');
    const trimmed = firstUserIndex === -1 ? [] : capped.slice(firstUserIndex);

    try {
      const result = await getBotResponse({
        apiKey: env.ANTHROPIC_API_KEY,
        systemPrompt: SYSTEM_PROMPT,
        messages: trimmed,
      });
      return jsonResponse(result, 200, origin);
    } catch (err) {
      return jsonResponse({ error: 'Upstream error' }, 502, origin);
    }
  },
};
