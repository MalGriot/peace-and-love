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
