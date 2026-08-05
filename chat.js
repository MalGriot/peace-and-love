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
const CHAT_REACTION_EMOJI = ['🙌🏾', '🫶🏾', '👌🏾', '🤘🏾', '🙏🏾', '💪🏾', '👍🏾', '🤝🏾', '👊🏾', '🤙🏾'];
const CHAT_GREETINGS = [
  "Peace and love, what's good. Ask me about the music, the coaching work, or what it takes to book me.",
  "Peace and love, what's up. Music, Griot Cuts, wellness coaching, or booking, I'm listening.",
  "Peace and love, I'm listening. What do you want to know?",
];

let chatMessages = [];
let chatNextId = 1;
let chatReplyTargetId = null;

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

function initChat() {
  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
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
        text: 'Something went sideways.',
        offerContact: true,
      });
    });
}

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
  chatClosePicker();
  messagesEl.innerHTML = chatMessages.map(chatRenderRow).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
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
