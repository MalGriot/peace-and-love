// Shared chrome: injects nav + footer + chat widget markup so satellite pages
// stay in sync without a server-side include. Call renderChrome('music'|'wellness'|'contact').
function renderChrome(active) {
  const links = [
    ['music.html', 'Music', 'discography'],
    ['soundscapes.html', 'Soundscapes', 'wellness'],
    ['contact.html', 'Contact', 'contact'],
  ];
  const linkHtml = links
    .map(([href, label, key]) => `<a href="${href}"${key === active ? ' class="is-active"' : ''}>${label}</a>`)
    .join('');

  // Full site map for the staggered-menu nav panel — every page, in accordion order.
  const menuItems = [
    ['index.html', 'Home', 'home'],
    ['music.html', 'Music', 'discography'],
    ['performance.html', 'Performance', 'performance'],
    ['hosting.html', 'Hosting', 'hosting'],
    ['poetry.html', 'Poetry', 'poetry'],
    ['acting.html', 'Acting', 'acting'],
    ['voiceover.html', 'Voice Over', 'voiceover'],
    ['soundbaths.html', 'Sound Baths', 'soundbaths'],
    ['meditation.html', 'Meditation', 'meditation'],
    ['soundscapes.html', 'Soundscapes', 'wellness'],
    ['about.html', 'About', 'about'],
    ['press.html', 'Press', 'press'],
    ['contact.html', 'Contact', 'contact'],
  ];
  const menuItemHtml = menuItems
    .map(([href, label, key], i) => `
      <li class="sm-panel-itemWrap">
        <a class="sm-panel-item${key === active ? ' is-active' : ''}" href="${href}" style="--sm-delay:${(i * 0.045).toFixed(3)}s">
          <span class="sm-panel-itemLabel">${label}</span>
        </a>
      </li>`)
    .join('');

  const navHtml = `
    <div class="staggered-menu-wrapper">
      <header class="staggered-menu-header">
        <a href="index.html" class="sm-logo"><img src="img/brand/nav-mark-gold.png" alt="" class="sm-logo-img" width="22" height="22">Mal Griot</a>
        <button type="button" class="sm-toggle" aria-label="Open menu" aria-expanded="false">
          <span class="sm-toggle-text">Menu</span>
          <span class="sm-icon" aria-hidden="true">
            <span class="sm-icon-line"></span>
            <span class="sm-icon-line sm-icon-line-v"></span>
          </span>
        </button>
      </header>
      <aside class="staggered-menu-panel" aria-hidden="true">
        <button type="button" class="sm-panel-close" aria-label="Close menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
        </button>
        <ul class="sm-panel-list">${menuItemHtml}</ul>
        <div class="sm-socials">
          <h3 class="sm-socials-title">Socials</h3>
          <div class="sm-socials-list">
            <a href="https://instagram.com/yep.that.malcolm" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </aside>
      <div class="sm-backdrop"></div>
    </div>`;

  const footerHtml = `
    <footer class="site-footer">
      <div class="site-footer__top">
        <div>
          <div class="site-footer__mark">Mal Griot</div>
          <p class="site-footer__tagline">Music, performance and voice work — Queens, New York-rooted.</p>
        </div>
        <ul class="site-footer__links">${linkHtml}</ul>
        <div class="site-footer__social">
          <a href="https://instagram.com/yep.that.malcolm" target="_blank" rel="noopener" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
          <a href="https://open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS" target="_blank" rel="noopener" aria-label="Spotify"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.72-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg></a>
          <a href="https://soundcloud.com/mal-griot" target="_blank" rel="noopener" aria-label="SoundCloud"><svg width="15" height="15" viewBox="0 0 40 24" fill="currentColor"><path d="M1 12.6c-.1 0-.2.1-.2.2l-.6 3.4.6 3.3c.1.1.1.2.2.2s.2-.1.2-.2l.7-3.3-.7-3.4c0-.1-.1-.2-.2-.2zM4 11.4c-.1 0-.3.1-.3.3l-.5 4.5.5 4.4c0 .2.2.3.3.3s.3-.1.3-.3l.6-4.4-.6-4.5c0-.2-.2-.3-.3-.3zm3-1c-.2 0-.4.2-.4.4l-.5 5.4.5 5.2c0 .2.2.4.4.4s.4-.2.4-.4l.6-5.2-.6-5.4c0-.2-.2-.4-.4-.4zm3.2.4c-.2 0-.4.2-.4.4l-.4 5 .4 4.9c0 .3.2.5.4.5.2 0 .4-.2.4-.5l.5-4.9-.5-5c0-.2-.2-.4-.4-.4zm3.4-.7c-.3 0-.5.2-.5.5l-.4 5.6.4 4.8c0 .3.2.5.5.5.2 0 .5-.2.5-.5l.4-4.8-.4-5.6c0-.3-.3-.5-.5-.5zm3.5-.2c-.3 0-.5.2-.5.5l-.3 5.8.3 4.7c0 .3.2.5.5.5.2 0 .5-.2.5-.5l.4-4.7-.4-5.8c0-.3-.3-.5-.5-.5zm3.7 1.9c-.3 0-.6.3-.6.6l-.3 4 .3 4.6c0 .3.3.6.6.6.3 0 .5-.3.5-.6l.4-4.6-.4-4c0-.3-.2-.6-.5-.6zm2.9-2.6c-1.3 0-2.5.4-3.4 1.1-.2-4.7-4-8.5-8.8-8.5-1.1 0-2.2.2-3.2.6-.4.2-.5.3-.5.6v14.7c0 .3.3.6.6.6h15.3c3 0 5.5-2.4 5.5-5.4 0-3-2.5-5.7-5.5-5.7z"/></svg></a>
          <a href="https://www.linkedin.com/in/malgriot/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.064 2.064 0 110-4.128 2.064 2.064 0 010 4.128zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg></a>
          <a href="https://wa.me/917718816239" target="_blank" rel="noopener" aria-label="WhatsApp"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
          <a href="mailto:yep.that.malcolm@gmail.com" aria-label="Email"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 5.5A2.5 2.5 0 014.5 3h15A2.5 2.5 0 0122 5.5v13a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 18.5v-13zm2.2.3l7.8 6.3 7.8-6.3H4.2zM20 7.6l-7.5 6a1 1 0 01-1 0L4 7.6V18.5c0 .28.22.5.5.5h15a.5.5 0 00.5-.5V7.6z"/></svg></a>
        </div>
      </div>
      <div class="site-footer__bottom">
        <span>&copy; 2026 Mal Griot. All rights reserved.</span>
      </div>
    </footer>`;

  const navSlot = document.getElementById('chrome-nav');
  const footerSlot = document.getElementById('chrome-footer');
  const chatSlot = document.getElementById('chrome-chat');
  const playerSlot = document.getElementById('chrome-player');
  if (navSlot) navSlot.outerHTML = navHtml;
  if (footerSlot) footerSlot.outerHTML = footerHtml;
  if (chatSlot) chatSlot.outerHTML = chatWidgetHtml();

  // The mini-player only shows by default on pages with their own New Album
  // listening stage (Voice, and now the Music/discography page). On the
  // other satellite pages it stays out of the DOM entirely until the
  // visitor has pressed play at least once (tracked in localStorage) —
  // home (index.html) never gets it, since it doesn't call renderChrome at all.
  if (playerSlot) {
    let activated = false;
    try { activated = localStorage.getItem('griotPlayerActivated') === '1'; } catch (e) {}
    if (active === 'music' || active === 'discography' || activated) {
      playerSlot.outerHTML = playerHtml;
    } else {
      playerSlot.remove();
    }
  }
}

// The "Mal" chat widget markup — used by renderChrome() on every satellite
// page and directly by index.html (which has no nav/footer, so it doesn't
// call renderChrome() at all). All interactive behavior lives in chat.js's
// initChat(), wired up from this file's DOMContentLoaded listener below.
function chatWidgetHtml() {
  return `
    <div class="chat-widget" id="chat">
      <button type="button" class="chat-widget__btn" id="chatBtn" aria-label="Open chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <div class="chat-widget__panel">
        <div class="chat-widget__header">
          <img class="chat-widget__avatar" src="img/about.jpg" alt="Mal Griot">
          <div>
            <p class="chat-widget__title">Mal</p>
            <p class="chat-widget__status" id="chatStatus">
              <span class="status-dot" id="chatStatusDot"></span>
              <span id="chatStatusText">Online</span>
            </p>
          </div>
        </div>
        <div class="chat-widget__messages" id="chatMessages"></div>
        <div class="chat-widget__reply-preview" id="chatReplyPreview" hidden>
          <span id="chatReplyPreviewText"></span>
          <button type="button" class="chat-widget__reply-cancel" id="chatReplyCancel" aria-label="Cancel reply">&times;</button>
        </div>
        <form class="chat-widget__form" id="chatForm">
          <input class="chat-widget__input" id="chatInput" type="text" maxlength="500" placeholder="Say something..." autocomplete="off">
          <button type="submit" class="chat-widget__send" aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>`;
}

// Persistent mini-player markup — injected into the #chrome-player slot on
// the music page always, and on the other satellite pages only once the
// visitor has activated it (see renderChrome above). Never appears on
// index.html, which has no slot and never calls renderChrome.
const playerHtml = `
  <div class="mini-player" id="miniPlayer">
    <div class="mini-player__hint" id="miniHint"></div>
    <button type="button" class="mini-player__skip" id="miniPrev" aria-label="Previous track">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6L10 12l10 6z"/></svg>
    </button>
    <button type="button" class="mini-player__toggle" id="miniToggle" aria-label="Play or pause">
      <svg id="miniIconPlay" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <svg id="miniIconPause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
    </button>
    <img class="mini-player__art" id="miniArt" alt="">
    <div class="mini-player__info">
      <div class="mini-player__title-stack">
        <div class="mini-player__title-plain" id="miniTitlePlain">breathe love d e e p</div>
        <div class="mini-player__title-mask">
          <div class="mini-player__title-track" id="miniTitleTrack">
            <span id="miniTitle">breathe love d e e p</span>
            <span aria-hidden="true" id="miniTitleDup">breathe love d e e p</span>
          </div>
        </div>
      </div>
      <div class="mini-player__artist">Mal Griot</div>
    </div>
    <button type="button" class="mini-player__skip" id="miniNext" aria-label="Next track">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 6l10 6-10 6z"/></svg>
    </button>
  </div>
  <iframe id="scFrame" class="sc-widget" scrolling="no" frameborder="no" allow="autoplay"
    src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fmal-griot%2Fsets%2Fbreathelovedeep&auto_play=false&show_artwork=true">
  </iframe>`;

// Wires the mini-player up once its markup exists in the DOM (on every page).
// Guards every element that's specific to the voice.html listening stage
// (#listenVinyl, #sleeveArt, #listenTracks, #listenStage) since they don't
// exist on the other pages — the player still works there, just without
// those extra visuals.
function initMiniPlayer() {
  const miniPlayer = document.getElementById('miniPlayer');
  if (!miniPlayer) return;

  const miniToggle = document.getElementById('miniToggle');
  const miniTitle = document.getElementById('miniTitle');
  const miniTitleDup = document.getElementById('miniTitleDup');
  const miniTitleTrack = document.getElementById('miniTitleTrack');
  const miniTitlePlain = document.getElementById('miniTitlePlain');
  const miniArt = document.getElementById('miniArt');
  const miniIconPlay = document.getElementById('miniIconPlay');
  const miniIconPause = document.getElementById('miniIconPause');
  const miniHint = document.getElementById('miniHint');
  const vinyl = document.getElementById('listenVinyl');
  const vinylLabel = document.getElementById('listenVinylLabel');
  const sleeveArt = document.getElementById('sleeveArt');
  if (sleeveArt) sleeveArt.crossOrigin = 'anonymous';
  const tracksWrap = document.getElementById('listenTracks');
  const stage = document.getElementById('listenStage');
  const iframe = document.getElementById('scFrame');
  let sounds = [];
  let currentIndex = 0;
  let currentlyPlaying = false;
  let albumArtFallback = null;
  // Set whenever a non-SoundCloud source (currently: a Spotify release panel)
  // takes over the mini-player — see window.griotMiniPlayer below. While set,
  // the transport buttons drive that source instead of the SC widget.
  let externalSource = null;
  const miniNextBtn = document.getElementById('miniNext');
  const miniPrevBtn = document.getElementById('miniPrev');

  let currentReleaseName = 'breathe love d e e p';
  // The "New Album" hero stage (sleeve art, vinyl, its own tile row) always
  // stays pinned to breathe love d e e p, even while a different release is
  // loaded into this same shared widget from a Discography panel — only the
  // mini-player (title/art/transport) follows whatever's actually playing.
  const BLD_URL = 'https://soundcloud.com/mal-griot/sets/breathelovedeep';
  let isBLDActive = true;
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d');

  function tintDiscFromArt(el, img) {
    try {
      sampleCanvas.width = 1;
      sampleCanvas.height = 1;
      sampleCtx.drawImage(img, 0, 0, 1, 1);
      const d = sampleCtx.getImageData(0, 0, 1, 1).data;
      const r = d[0], g = d[1], b = d[2];
      const dark = `rgb(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.35)})`;
      const light = `rgb(${Math.round(Math.min(255, r * 0.7 + 40))},${Math.round(Math.min(255, g * 0.7 + 40))},${Math.round(Math.min(255, b * 0.7 + 40))})`;
      el.style.setProperty('--disc-a', dark);
      el.style.setProperty('--disc-b', light);
    } catch (e) {
      // Tainted canvas (CORS) or decode failure — leave the default teal tint.
    }
  }

  function dismissHint() {
    if (miniHint) miniHint.classList.remove('is-visible');
    miniPlayer.classList.remove('is-pulsing');
  }

  function setPlaying(isPlaying) {
    currentlyPlaying = isPlaying;
    miniIconPlay.style.display = isPlaying ? 'none' : 'block';
    miniIconPause.style.display = isPlaying ? 'block' : 'none';
    // The hero vinyl and its 10 track discs only ever spin for breathe love
    // d e e p itself — if a Discography release (SoundCloud, via isBLDActive,
    // or Spotify, via externalSource) is what's actually playing, BLD's own
    // visuals stay in their base/paused state instead of following along.
    const bldPlaying = isPlaying && isBLDActive && !externalSource;
    if (stage) stage.classList.toggle('is-playing', bldPlaying);
    if (tracksWrap) {
      const activeTile = tracksWrap.querySelector('.listen__track.is-active');
      if (activeTile) activeTile.classList.toggle('is-playing', bldPlaying);
    }
    if (isPlaying) dismissHint();
  }

  function activate(index) {
    currentIndex = index;
    const s = sounds[index];
    if (!s) return;
    const title = s.title || currentReleaseName;
    // "breathe love d e e p" is always one phrase — never let "d e e p" split
    // across a wrap or marquee boundary, so it's wrapped in a no-wrap span.
    const marqueeHtml = `${title}  —  <span class="nb">${currentReleaseName}</span>`;
    miniTitle.innerHTML = marqueeHtml;
    if (miniTitleDup) miniTitleDup.innerHTML = marqueeHtml;
    if (miniTitlePlain) miniTitlePlain.textContent = title;
    if (miniTitleTrack) {
      // Only run the marquee if the text actually overflows its box — a
      // short title just sits still instead of scrolling for no reason.
      miniTitleTrack.classList.remove('is-scrolling');
      const checkOverflow = () => {
        const mask = miniTitleTrack.parentElement;
        const firstSpan = miniTitleTrack.firstElementChild;
        const overflowing = firstSpan.scrollWidth > mask.clientWidth;
        miniTitleTrack.classList.toggle('is-scrolling', overflowing);
      };
      requestAnimationFrame(checkOverflow);
      // The web font can finish loading (and reflow the text wider) after that
      // first check runs, so re-check once fonts are actually ready too.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(checkOverflow);
      }
    }
    const art = s.artwork_url || (s.user && s.user.avatar_url) || albumArtFallback;
    const bigArt = art ? art.replace('-large', '-t500x500') : null;
    if (isBLDActive && sleeveArt && bigArt) {
      sleeveArt.src = bigArt;
      if (vinylLabel) vinylLabel.src = bigArt;
      if (vinyl) {
        const applyVinylTint = () => tintDiscFromArt(vinyl, sleeveArt);
        if (sleeveArt.complete && sleeveArt.naturalWidth) applyVinylTint();
        else sleeveArt.addEventListener('load', applyVinylTint, { once: true });
      }
    }
    if (miniArt && bigArt) miniArt.src = bigArt;
    if (isBLDActive && tracksWrap) {
      Array.prototype.forEach.call(tracksWrap.children, (el, i) => {
        const active = i === index;
        el.classList.toggle('is-active', active);
        el.classList.toggle('is-playing', active && currentlyPlaying);
      });
    }
  }

  function buildTracks(widget) {
    // Only the BLD hero stage's own tile row rebuilds from the loaded
    // sounds — while a Discography release is active it stays exactly as
    // BLD last left it (its own click handlers still point at BLD's sounds).
    if (!tracksWrap || !isBLDActive) return;
    tracksWrap.innerHTML = '';
    albumArtFallback = sounds.map((s) => s.artwork_url || (s.user && s.user.avatar_url)).find(Boolean) || null;
    sounds.forEach((s, i) => {
      const tile = document.createElement('div');
      tile.className = 'listen__track';
      const art = s.artwork_url || (s.user && s.user.avatar_url) || albumArtFallback;
      const thumb = art ? art.replace('-large', '-t200x200') : null;
      const trackTitle = s.title || `Track ${i + 1}`;
      tile.innerHTML =
        '<div class="listen__track-disc"><div class="listen__track-disc-spin">' +
        (thumb ? `<img class="listen__track-disc-label" src="${thumb}" alt="">` : '') +
        '<span class="listen__track-disc-hole"></span></div></div>' +
        (thumb ? `<img class="listen__track-art" src="${thumb}" alt="${trackTitle}" crossorigin="anonymous">` : '') +
        `<span class="num">${String(i + 1).padStart(2, '0')}</span>` +
        `<span class="listen__track-tip">${trackTitle}</span>`;
      tile.setAttribute('tabindex', '0');
      const artImg = tile.querySelector('.listen__track-art');
      if (artImg) {
        const apply = () => tintDiscFromArt(tile, artImg);
        if (artImg.complete && artImg.naturalWidth) apply();
        else artImg.addEventListener('load', apply, { once: true });
      }
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        // A Discography release may have since taken over this shared widget
        // — these indexes only make sense against BLD's own sounds, so make
        // sure BLD is actually reloaded (via the same public event Discography
        // panels use) before skipping into it, so the mini-player's title/art
        // and this tile row itself get fully re-synced too, not just the audio.
        if (isBLDActive) {
          widget.skip(i);
          widget.play();
          return;
        }
        const onReady = () => {
          window.removeEventListener('griot:release-ready', onReady);
          widget.skip(i);
          widget.play();
        };
        window.addEventListener('griot:release-ready', onReady);
        window.dispatchEvent(new CustomEvent('griot:load-release', { detail: { url: BLD_URL, title: 'breathe love d e e p' } }));
      });
      tracksWrap.appendChild(tile);
    });
  }

  function boot() {
    const widget = SC.Widget(iframe);

    function togglePlay() {
      widget.isPaused((paused) => {
        if (paused) { widget.play(); } else { widget.pause(); }
      });
    }

    // The widget can return artwork_url/avatar as null for tracks further
    // down the playlist on early getSounds() calls, before their metadata
    // has fully hydrated — poll a few times, spaced out, until every sound
    // has art (or give up and keep the album-cover fallback). Hoisted out of
    // the READY binding so it can also run as the callback of widget.load()
    // (READY only fires once, on the widget's first boot — it does not
    // re-fire when a different release is loaded into the same widget).
    function refreshTracks() {
      let attempts = 0;
      function attempt() {
        widget.getSounds((list) => {
          sounds = list || [];
          buildTracks(widget);
          activate(currentIndex);
          window.dispatchEvent(new CustomEvent('griot:release-ready', { detail: { sounds } }));
          attempts++;
          const allHydrated = sounds.length && sounds.every((s) => s.artwork_url || (s.user && s.user.avatar_url));
          if (!allHydrated && attempts < 5) setTimeout(attempt, 1500);
        });
      }
      attempt();
    }

    widget.bind(SC.Widget.Events.READY, refreshTracks);
    widget.bind(SC.Widget.Events.PLAY, () => {
      setPlaying(true);
      try { localStorage.setItem('griotPlayerActivated', '1'); } catch (e) {}
      window.dispatchEvent(new CustomEvent('griot:mini-player-playing'));
    });
    widget.bind(SC.Widget.Events.PAUSE, () => setPlaying(false));
    widget.bind(SC.Widget.Events.FINISH, () => setPlaying(false));
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, () => {
      widget.getCurrentSoundIndex((i) => { if (i !== currentIndex) activate(i); });
    });

    // Hooks for external code (the Discography section's release panels) to
    // drive this same shared widget without reaching into this closure.
    window.addEventListener('griot:pause-mini-player', () => {
      widget.pause();
    });
    window.addEventListener('griot:load-release', (e) => {
      if (!e.detail || !e.detail.url) return;
      currentReleaseName = e.detail.title || currentReleaseName;
      currentIndex = 0;
      isBLDActive = e.detail.url === BLD_URL;
      widget.load(e.detail.url, { show_artwork: true, callback: refreshTracks });
    });
    window.addEventListener('griot:play-track-index', (e) => {
      if (!e.detail || !Number.isInteger(e.detail.index)) return;
      if (e.detail.index < 0 || e.detail.index >= sounds.length) return;
      widget.skip(e.detail.index);
      widget.play();
    });

    miniToggle.addEventListener('click', () => {
      if (externalSource) { externalSource.onToggle(); return; }
      togglePlay();
    });
    miniNextBtn.addEventListener('click', () => {
      if (externalSource) { if (externalSource.onNext) externalSource.onNext(); return; }
      widget.next();
    });
    miniPrevBtn.addEventListener('click', () => {
      if (externalSource) { if (externalSource.onPrev) externalSource.onPrev(); return; }
      widget.prev();
    });

    if (stage) {
      stage.addEventListener('click', togglePlay);
      stage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          togglePlay();
        }
      });
    }
  }

  if (window.SC && window.SC.Widget) {
    boot();
  } else {
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = boot;
    document.head.appendChild(script);
  }

  miniPlayer.classList.add('is-visible', 'is-pulsing');
  if (miniHint) {
    const isMobile = window.matchMedia('(max-width:560px)').matches;
    miniHint.textContent = isMobile ? 'Tap to listen' : 'Press play to listen';
    requestAnimationFrame(() => miniHint.classList.add('is-visible'));
    setTimeout(dismissHint, 6000);
  }
  miniPlayer.addEventListener('click', dismissHint, { once: true });

  initMiniPlayerDrag(miniPlayer);

  // Public hook for non-SoundCloud sources (currently: Spotify release
  // panels, see music.html) to take over the mini-player's display and
  // transport controls. The SC widget itself is paused separately via the
  // existing griot:pause-mini-player event before this is called.
  window.griotMiniPlayer = {
    setExternal(source) {
      externalSource = source;
      miniTitle.innerHTML = source.title;
      if (miniTitleDup) miniTitleDup.innerHTML = source.title;
      if (miniTitlePlain) miniTitlePlain.textContent = source.title;
      if (miniTitleTrack) {
        miniTitleTrack.classList.remove('is-scrolling');
        requestAnimationFrame(() => {
          const mask = miniTitleTrack.parentElement;
          const firstSpan = miniTitleTrack.firstElementChild;
          miniTitleTrack.classList.toggle('is-scrolling', firstSpan.scrollWidth > mask.clientWidth);
        });
      }
      if (miniArt && source.art) miniArt.src = source.art;
      miniNextBtn.style.visibility = source.onNext ? '' : 'hidden';
      miniPrevBtn.style.visibility = source.onPrev ? '' : 'hidden';
      setPlaying(!!source.isPlaying);
      miniPlayer.classList.add('is-visible');
      dismissHint();
    },
    updateExternalPlaying(isPlaying) {
      if (!externalSource) return;
      setPlaying(isPlaying);
    },
    clearExternal() {
      if (!externalSource) return;
      externalSource = null;
      miniNextBtn.style.visibility = '';
      miniPrevBtn.style.visibility = '';
      activate(currentIndex);
      setPlaying(false);
    },
    isExternalActive() {
      return !!externalSource;
    }
  };
}

// Makes the mini-player draggable and snaps it to the nearest of six docks
// (top/bottom x left/center/right) on release. Docks stay clear of the site
// nav (top clearance) and the chat widget (extra clearance on bottom-right)
// so the player never sits on top of either. The chosen dock persists in
// localStorage so it stays put across page loads.
function initMiniPlayerDrag(miniPlayer) {
  const EDGE = 24;
  const TOP_CLEARANCE = 86;
  const CHAT_CLEARANCE = 104;
  const ANCHORS = ['bottom-center', 'top-center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

  function place(anchor) {
    // Explicitly "auto" (not "") every offset that this anchor doesn't use —
    // clearing to "" falls back to the stylesheet's own left/bottom defaults,
    // which left both an inline and a stylesheet offset active on the same
    // axis at once and stretched the pill across the gap between them.
    miniPlayer.style.left = miniPlayer.style.right = miniPlayer.style.top = miniPlayer.style.bottom = 'auto';
    miniPlayer.style.translate = '0 0';
    if (anchor === 'bottom-center') {
      miniPlayer.style.left = '50%'; miniPlayer.style.bottom = EDGE + 'px'; miniPlayer.style.translate = '-50% 0';
    } else if (anchor === 'top-center') {
      miniPlayer.style.left = '50%'; miniPlayer.style.top = TOP_CLEARANCE + 'px'; miniPlayer.style.translate = '-50% 0';
    } else if (anchor === 'top-left') {
      miniPlayer.style.left = EDGE + 'px'; miniPlayer.style.top = TOP_CLEARANCE + 'px';
    } else if (anchor === 'top-right') {
      miniPlayer.style.right = EDGE + 'px'; miniPlayer.style.top = TOP_CLEARANCE + 'px';
    } else if (anchor === 'bottom-left') {
      miniPlayer.style.left = EDGE + 'px'; miniPlayer.style.bottom = EDGE + 'px';
    } else if (anchor === 'bottom-right') {
      miniPlayer.style.right = CHAT_CLEARANCE + 'px'; miniPlayer.style.bottom = EDGE + 'px';
    }
    miniPlayer.dataset.anchor = anchor;
  }

  let anchor = 'bottom-center';
  try {
    const saved = localStorage.getItem('griotPlayerAnchor');
    if (saved && ANCHORS.indexOf(saved) !== -1) anchor = saved;
  } catch (e) {}
  place(anchor);

  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0, originLeft = 0, originTop = 0;

  miniPlayer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const rect = miniPlayer.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    originLeft = rect.left; originTop = rect.top;
    dragging = true; moved = false;
    miniPlayer.setPointerCapture(e.pointerId);
    miniPlayer.classList.add('is-dragging');
  });

  miniPlayer.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    if (!moved) return;
    miniPlayer.style.left = (originLeft + dx) + 'px';
    miniPlayer.style.top = (originTop + dy) + 'px';
    miniPlayer.style.right = miniPlayer.style.bottom = 'auto';
    miniPlayer.style.translate = '0 0';
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    miniPlayer.classList.remove('is-dragging');
    if (!moved) return;

    const rect = miniPlayer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const horiz = cx < window.innerWidth / 3 ? 'left' : cx > (window.innerWidth * 2) / 3 ? 'right' : 'center';
    const vert = cy < window.innerHeight / 2 ? 'top' : 'bottom';
    anchor = vert + '-' + horiz;
    if (ANCHORS.indexOf(anchor) === -1) anchor = 'bottom-center';
    place(anchor);
    try { localStorage.setItem('griotPlayerAnchor', anchor); } catch (e) {}
  }

  miniPlayer.addEventListener('pointerup', endDrag);
  miniPlayer.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', () => place(anchor));
}

// Staggered-menu nav: hamburger toggle opens a slide-in panel listing every
// page, with a react-bits-style staggered entrance handled via CSS transition
// delays (--sm-delay, set per item in renderChrome's menuItemHtml).
function initStaggeredMenu() {
  const wrapper = document.querySelector('.staggered-menu-wrapper');
  if (!wrapper) return;
  const toggle = wrapper.querySelector('.sm-toggle');
  const toggleText = wrapper.querySelector('.sm-toggle-text');
  const panel = wrapper.querySelector('.staggered-menu-panel');
  const backdrop = wrapper.querySelector('.sm-backdrop');
  const closeBtn = wrapper.querySelector('.sm-panel-close');

  function setOpen(open) {
    wrapper.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggleText.textContent = open ? 'Close' : 'Menu';
    panel.setAttribute('aria-hidden', String(!open));
  }

  toggle.addEventListener('click', () => setOpen(!wrapper.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  closeBtn.addEventListener('click', () => setOpen(false));
  panel.querySelectorAll('.sm-panel-item').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// react-bits LineSidebar, adapted: cursor-proximity effect for the nav panel
// list. Each .sm-panel-item gets a --effect (0..1) custom property, eased
// toward a target with frame-rate-independent exponential smoothing so
// color/shift/marker all move together. Target is the item's proximity to
// the pointer's Y position, held at 1 for the current page's item.
function initLineSidebarEffect() {
  const list = document.querySelector('.sm-panel-list');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('.sm-panel-item'));
  if (!items.length) return;

  const PROXIMITY_RADIUS = 110;
  const SMOOTHING_MS = 70;
  const smooth = p => p * p * (3 - 2 * p);

  const targets = items.map(() => 0);
  const current = items.map((el) => (el.classList.contains('is-active') ? 1 : 0));
  let raf = null;
  let last = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.exp(-dt / (Math.max(SMOOTHING_MS, 1) / 1000));
    let moving = false;
    items.forEach((el, i) => {
      const target = Math.max(targets[i], el.classList.contains('is-active') ? 1 : 0);
      const cur = current[i];
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      current[i] = settled ? target : next;
      el.style.setProperty('--effect', current[i].toFixed(4));
      if (!settled) moving = true;
    });
    raf = moving ? requestAnimationFrame(frame) : null;
  }

  function startLoop() {
    // Only kick off a fresh rAF chain if nothing is running — pointermove
    // fires far more often than paint, so cancel+restart here would keep
    // wiping out frame() before it ever executes, leaving --effect frozen
    // until the pointer stops moving. Once running, frame() reads the
    // latest targets itself on every tick.
    if (raf != null) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  list.addEventListener('pointermove', (e) => {
    const listRect = list.getBoundingClientRect();
    const pointerY = e.clientY - listRect.top;
    items.forEach((el, i) => {
      // getBoundingClientRect (not offsetTop) so the item's position is
      // measured in the same coordinate space as pointerY above — offsetTop
      // is relative to the nearest positioned ancestor, which here is the
      // fixed-position .staggered-menu-panel, not this list, and double-counts
      // the panel's top padding.
      const itemRect = el.getBoundingClientRect();
      const center = (itemRect.top - listRect.top) + itemRect.height / 2;
      const distance = Math.abs(pointerY - center);
      targets[i] = smooth(Math.max(0, 1 - distance / PROXIMITY_RADIUS));
    });
    startLoop();
  });

  list.addEventListener('pointerleave', () => {
    targets.fill(0);
    startLoop();
  });
}

// Shared chrome behavior: mobile menu, chat widget shell toggle.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initStaggeredMenu === 'function') initStaggeredMenu();
  if (typeof initLineSidebarEffect === 'function') initLineSidebarEffect();

  initChat();
  initMiniPlayer();
  initAnimatedFavicon();
  initEmberField();
  if (typeof initScrollReveal === 'function') initScrollReveal();
  if (typeof initScrollFloat === 'function') initScrollFloat();
  if (typeof initVariableProximity === 'function') initVariableProximity();
});

// Rising ember/ash field: small points that drift upward and flicker in
// brightness, like cinder rising off a fire, replacing the flat static star
// scatter with something alive. Skips entirely under reduced-motion.
function initEmberField() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const field = document.createElement('div');
  field.className = 'ember-field';
  field.setAttribute('aria-hidden', 'true');

  const count = window.innerWidth < 700 ? 26 : 48;
  for (let i = 0; i < count; i++) {
    const ember = document.createElement('span');
    ember.className = 'ember' + (Math.random() < 0.35 ? ' ember--paper' : '');

    const size = (Math.random() * 2 + 0.6).toFixed(2);
    const left = (Math.random() * 100).toFixed(2);
    const riseDuration = (Math.random() * 16 + 14).toFixed(1);
    const riseDelay = (-Math.random() * riseDuration).toFixed(1);
    const sparkleDuration = (Math.random() * 3 + 1.8).toFixed(1);
    const sparkleDelay = (-Math.random() * sparkleDuration).toFixed(1);
    const drift = (Math.random() * 80 - 40).toFixed(0);
    const opMax = (Math.random() * 0.4 + 0.5).toFixed(2);

    ember.style.cssText = `
      left:${left}%;
      width:${size}px;height:${size}px;
      --ember-drift:${drift}px;
      --ember-op-min:.08;
      --ember-op-max:${opMax};
      animation-duration:${riseDuration}s, ${sparkleDuration}s;
      animation-delay:${riseDelay}s, ${sparkleDelay}s;
    `;
    field.appendChild(ember);
  }

  document.body.prepend(field);
}

// Spins the gold mark in the browser tab by redrawing it to a canvas each
// frame and swapping the favicon <link> href for the resulting data URL.
function initAnimatedFavicon() {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const mark = new Image();
  mark.src = 'img/brand/favicon-256.png';

  let angle = 0;
  let lastDraw = 0;
  const degreesPerSecond = 60;
  const frameInterval = 1000 / 24;

  function draw(now) {
    if (!document.hidden && now - lastDraw >= frameInterval) {
      const delta = lastDraw ? now - lastDraw : 0;
      angle = (angle + (degreesPerSecond * delta) / 1000) % 360;
      lastDraw = now;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(mark, -size / 2, -size / 2, size, size);
      ctx.restore();

      link.href = canvas.toDataURL('image/png');
    }
    requestAnimationFrame(draw);
  }

  mark.onload = () => requestAnimationFrame(draw);
}
