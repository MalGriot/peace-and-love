// Chat widget behavior for the "Mal" chat. Split out of shared.js because
// shared.js already owns nav/footer/mini-player, and this widget alone runs
// to several hundred lines. Loaded on every page via <script src="chat.js">,
// right after shared.js. initChat() is called once from shared.js's
// DOMContentLoaded listener.

const CHAT_WORKER_URL = 'https://mal-griot-chat.malgriot.workers.dev/chat';
const CHAT_FETCH_TIMEOUT_MS = 15000;
const CHAT_STORAGE_KEY = 'malGriotChatState';

const CHAT_MAX_INPUT_LENGTH = 500;
const CHAT_MAX_SENT_HISTORY = 20;
const CHAT_TYPING_BASE_DELAY_MS = 500;
const CHAT_TYPING_PER_WORD_MS = 40;
const CHAT_TYPING_MAX_DELAY_MS = 2200;
const CHAT_REACTION_EMOJI = ['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾'];
const CHAT_MAX_VISITOR_MESSAGES = 10;
// A gap this long since the visitor's last message counts as a new
// conversation for rate-limit purposes: the 10-message cap resets and a
// disabled input re-enables, rather than staying locked for the rest of
// the tab session just because it was hit once, hours or days ago.
const CHAT_LIMIT_RESET_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHAT_LIMIT_REDIRECTS = [
  "We've covered a lot. Can we continue this conversation on WhatsApp?",
  "Actually, can we continue this conversation on WhatsApp? Hit me up from there.",
  "Let's keep going on WhatsApp from here.",
];

let chatMessages = [];
let chatNextId = 1;
let chatReplyTargetId = null;
let chatVisitorMessageCount = 0;
let chatTypingVisible = false;
let chatDisabled = false;
let chatIsOpen = false;
let chatLastMessageAt = 0;

function chatGenerateId() {
  return 'm' + (chatNextId++) + '-' + Date.now().toString(36);
}

// Persisted per-tab (not per-domain) so the conversation survives navigating
// between pages of this multi-page site, without leaking between visitors
// on a shared machine the way localStorage would.
function chatSaveState() {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
      messages: chatMessages,
      nextId: chatNextId,
      visitorMessageCount: chatVisitorMessageCount,
      disabled: chatDisabled,
      isOpen: chatIsOpen,
      lastMessageAt: chatLastMessageAt,
    }));
  } catch {
    // Storage unavailable (private browsing, quota) — chat just won't persist.
  }
}

function chatLoadState() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function chatEscapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escapes text and turns any bare URLs within it into clickable links,
// so message bubbles never leak raw HTML from user/bot text.
function chatLinkify(text) {
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    result += chatEscapeHtml(text.slice(lastIndex, match.index));
    let url = match[0];
    let trailing = '';
    const trailingMatch = url.match(/[.,;:!?)'"]+$/);
    if (trailingMatch) {
      trailing = trailingMatch[0];
      url = url.slice(0, -trailing.length);
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    result += `<a href="${chatEscapeHtml(href)}" target="_blank" rel="noopener noreferrer">${chatEscapeHtml(url)}</a>`;
    result += chatEscapeHtml(trailing);
    lastIndex = match.index + match[0].length;
  }
  result += chatEscapeHtml(text.slice(lastIndex));
  return result;
}

function chatTypingDelayMs(text) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length;
  const delay = CHAT_TYPING_BASE_DELAY_MS + wordCount * CHAT_TYPING_PER_WORD_MS;
  return Math.min(CHAT_TYPING_MAX_DELAY_MS, delay);
}

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
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    if (chatMessages[i].role === 'user') return chatMessages[i];
  }
  return null;
}

function chatOpen() {
  const chat = document.querySelector('.chat-widget');
  if (!chat) return;
  chat.classList.add('is-open');
  chatIsOpen = true;
  chatSaveState();
}

function initChat() {
  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  if (!chat || !chatBtn || !messagesEl || !form || !input) return;

  const saved = chatLoadState();
  if (saved) {
    chatMessages = Array.isArray(saved.messages) ? saved.messages : [];
    chatNextId = typeof saved.nextId === 'number' ? saved.nextId : chatNextId;
    chatVisitorMessageCount = typeof saved.visitorMessageCount === 'number' ? saved.visitorMessageCount : 0;
    chatLastMessageAt = typeof saved.lastMessageAt === 'number' ? saved.lastMessageAt : 0;

    const idleTooLong = chatLastMessageAt && Date.now() - chatLastMessageAt > CHAT_LIMIT_RESET_MS;
    if (idleTooLong) {
      chatVisitorMessageCount = 0;
    } else if (saved.disabled) {
      chatDisableInput();
    }
    if (saved.isOpen) chatOpen();
    chatRender();
  }

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

  chatBtn.addEventListener('click', () => {
    const opening = !chat.classList.contains('is-open');
    if (opening) {
      chatOpen();
    } else {
      chat.classList.remove('is-open');
      chatIsOpen = false;
      chatSaveState();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.disabled) return;
    const text = input.value.trim().slice(0, CHAT_MAX_INPUT_LENGTH);
    if (!text) return;
    input.value = '';
    chatSendUserMessage(text);
  });
}

function chatSendUserMessage(text) {
  const message = { id: chatGenerateId(), role: 'user', text, replyToId: chatReplyTargetId, reaction: null };
  chatMessages.push(message);
  chatCancelReply();
  chatVisitorMessageCount++;
  chatLastMessageAt = Date.now();
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
    messages: chatMessages.slice(-CHAT_MAX_SENT_HISTORY).map((m) => ({
      id: m.id,
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
      replyToId: m.replyToId || undefined,
    })),
  };

  const startedAt = Date.now();
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), CHAT_FETCH_TIMEOUT_MS);
  fetch(CHAT_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: timeoutController.signal,
  })
    .finally(() => clearTimeout(timeoutId))
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
        text: 'Something went sideways.',
        offerContact: true,
      });
    });
}

function chatDisableInput() {
  chatDisabled = true;
  const input = document.getElementById('chatInput');
  const form = document.getElementById('chatForm');
  if (input) {
    input.disabled = true;
    input.placeholder = 'Continue on WhatsApp';
  }
  if (form) form.classList.add('is-disabled');
  chatSaveState();
}

// The model occasionally leaks one of its own JSON field names/values into
// the "text" field itself (e.g. a reply literally ending in "offerContact:
// true.") instead of only setting the real JSON field. Strip anything
// shaped like that back out before it ever reaches the chat bubble.
// Mal has no phone number in his facts, but the model occasionally invents
// one anyway (hallucinated digits, sometimes dressed up as a WhatsApp
// number). Strip anything shaped like a phone number out of bot replies —
// the real WhatsApp button already renders itself via offerContact, so a
// visitor never needs the bot to type digits.
function chatStripPhoneNumbers(text) {
  return text.replace(/\+?\d[\d\-.\s()]{5,}\d/g, (match) => {
    return (match.match(/\d/g) || []).length >= 7 ? '' : match;
  });
}

function chatStripLeakedFields(text) {
  let cleaned = chatStripPhoneNumbers(text)
    .replace(/\(?\b(offerContact|replyToId|reaction)\s*[:=]\s*("[^"]*"|'[^']*'|true|false|[^\s).,]+)\)?[.,]?/gi, '')
    .replace(/:\s*(?=[,.!?]|$)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
  // A phone number stripped out from inside parentheses, e.g. "(987) 654-3210",
  // can leave one side of the pair behind — drop all parens once unbalanced
  // rather than try to guess which one is now orphaned.
  const opens = (cleaned.match(/\(/g) || []).length;
  const closes = (cleaned.match(/\)/g) || []).length;
  if (opens !== closes) cleaned = cleaned.replace(/[()]/g, '');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function chatAppendBotMessage(data) {
  if (data.reaction) {
    const replyTarget = data.replyToId && chatFindMessage(data.replyToId);
    const target = (replyTarget && replyTarget.role === 'user' && replyTarget) || chatLastUserMessage();
    if (target) target.reaction = data.reaction;
  }

  // The bot's very first message in a session always opens with "Peace and
  // love!" — guaranteed here rather than left purely to the model, since
  // there's no more canned client-side greeting to fall back on. Every
  // message after that has any "peace and love" the model slips in
  // stripped back out, since the phrase is meant to open the conversation
  // once, not recur throughout it.
  const isFirstBotMessage = !chatMessages.some((m) => m.role === 'bot');
  let text = chatStripLeakedFields(data.text) || data.text;
  if (isFirstBotMessage) {
    if (!/^peace and love!?/i.test(text.trim())) text = `Peace and love! ${text}`;
  } else {
    text = text.replace(/,?\s*peace and love[,!.]?\s*/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!text) text = data.text;
  }

  chatMessages.push({
    id: chatGenerateId(),
    role: 'bot',
    text,
    replyToId: data.replyToId || null,
    reaction: null,
    offerContact: !!data.offerContact,
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

function chatBuildTypingRow() {
  const row = document.createElement('div');
  row.className = 'msg-row msg-row--bot';
  row.id = 'chatTypingRow';
  row.innerHTML =
    '<img class="msg-row__avatar" src="img/about.jpg" alt="">' +
    '<div class="msg-wrap"><div class="msg--typing"><span></span><span></span><span></span></div></div>';
  return row;
}

function chatShowTyping() {
  const messagesEl = document.getElementById('chatMessages');
  chatTypingVisible = true;
  if (!messagesEl || document.getElementById('chatTypingRow')) return;
  messagesEl.appendChild(chatBuildTypingRow());
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function chatHideTyping() {
  chatTypingVisible = false;
  const row = document.getElementById('chatTypingRow');
  if (row) row.remove();
}

function chatRender() {
  const messagesEl = document.getElementById('chatMessages');
  if (!messagesEl) return;
  chatClosePicker();
  messagesEl.innerHTML = chatMessages.map(chatRenderRow).join('');
  if (chatTypingVisible) messagesEl.appendChild(chatBuildTypingRow());
  messagesEl.scrollTop = messagesEl.scrollHeight;
  chatSaveState();
}

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
  const bubbleHtml = `
      <div class="msg-wrap">
        <div class="msg msg--${isBot ? 'bot' : 'user'}">${quoteHtml}${chatLinkify(message.text)}</div>
        ${reactionHtml}
      </div>`;
  const controlsHtml = `
      <div class="msg-controls">
        <button type="button" data-chat-react title="React">🙂</button>
        <button type="button" data-chat-reply title="Reply">↩</button>
      </div>`;
  // Controls hug the inner side of each bubble: right of bot messages
  // (bot is left-aligned), left of the visitor's own messages (which are
  // right-aligned) — so DOM order is swapped per role, not just CSS.
  return `
    <div class="msg-row msg-row--${isBot ? 'bot' : 'user'}" data-message-id="${message.id}">
      ${isBot ? '<img class="msg-row__avatar" src="img/about.jpg" alt="">' : ''}
      ${isBot ? bubbleHtml + controlsHtml : controlsHtml + bubbleHtml}
    </div>
    ${contactHtml}`;
}
