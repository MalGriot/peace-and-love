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
