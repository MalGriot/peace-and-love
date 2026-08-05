// Shared chrome: injects nav + footer + chat widget markup so satellite pages
// stay in sync without a server-side include. Call renderChrome('music'|'cuts'|'wellness'|'contact').
function renderChrome(active) {
  const links = [
    ['music.html', 'Music', 'music'],
    ['griot-cuts.html', 'Griot Cuts', 'cuts'],
    ['wellness-coaching.html', 'Wellness + Coaching', 'wellness'],
    ['contact.html', 'Contact', 'contact'],
  ];
  const linkHtml = links
    .map(([href, label, key]) => `<a href="${href}"${key === active ? ' class="is-active"' : ''}>${label}</a>`)
    .join('');

  const navHtml = `
    <nav class="site-nav">
      <a href="index.html" class="site-nav__mark"><img src="img/brand/nav-mark-gold.png" alt="" class="site-nav__mark-icon" width="22" height="22">Mal Griot</a>
      <ul class="site-nav__links">${linkHtml}</ul>
      <button type="button" class="site-nav__toggle" aria-label="Menu" aria-expanded="false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </nav>`;

  const footerHtml = `
    <footer class="site-footer">
      <div class="site-footer__top">
        <div>
          <div class="site-footer__mark">Mal Griot</div>
          <p class="site-footer__tagline">Music, video and voice work — Queens, New York-rooted.</p>
        </div>
        <ul class="site-footer__links">${linkHtml}</ul>
        <div class="site-footer__social">
          <a href="https://instagram.com/yep.that.malcolm" target="_blank" rel="noopener" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
          <a href="https://open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS" target="_blank" rel="noopener" aria-label="Spotify"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M7 10.5c3-1 7-.6 9.5.9M7.5 13.6c2.4-.8 5.6-.4 7.6.8M8 16.4c1.9-.6 4.3-.3 5.9.6"/></svg></a>
          <a href="https://soundcloud.com/mal-griot" target="_blank" rel="noopener" aria-label="SoundCloud"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15v-3M6 16v-6M9 16.5v-8M12 16.5V7.5a3 3 0 0 1 5-2.2M12 16.5h7a3 3 0 0 0 0-6 4 4 0 0 0-3-1.8"/></svg></a>
        </div>
      </div>
      <div class="site-footer__bottom">
        <span>&copy; 2026 Mal Griot. All rights reserved.</span>
      </div>
    </footer>`;

  const chatHtml = `
    <div class="chat-widget" id="chat">
      <button type="button" class="chat-widget__btn" id="chatBtn" aria-label="Open chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <div class="chat-widget__panel">
        <p class="chat-widget__title">Ask MAL GRIOT</p>
        <p class="chat-widget__body">The assistant is warming up — check back soon. For now, reach out directly via the contact page.</p>
      </div>
    </div>`;

  const navSlot = document.getElementById('chrome-nav');
  const footerSlot = document.getElementById('chrome-footer');
  const chatSlot = document.getElementById('chrome-chat');
  const playerSlot = document.getElementById('chrome-player');
  if (navSlot) navSlot.outerHTML = navHtml;
  if (footerSlot) footerSlot.outerHTML = footerHtml;
  if (chatSlot) chatSlot.outerHTML = chatHtml;

  // The mini-player only shows on the music page by default. On the other
  // satellite pages it stays out of the DOM entirely until the visitor has
  // pressed play at least once (tracked in localStorage) — home (index.html)
  // never gets it, since it doesn't call renderChrome at all.
  if (playerSlot) {
    let activated = false;
    try { activated = localStorage.getItem('griotPlayerActivated') === '1'; } catch (e) {}
    if (active === 'music' || activated) {
      playerSlot.outerHTML = playerHtml;
    } else {
      playerSlot.remove();
    }
  }
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
// Guards every element that's specific to the music.html listening stage
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

  let currentReleaseName = 'breathe love d e e p';
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
    if (stage) stage.classList.toggle('is-playing', isPlaying);
    if (tracksWrap) {
      const activeTile = tracksWrap.querySelector('.listen__track.is-active');
      if (activeTile) activeTile.classList.toggle('is-playing', isPlaying);
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
    if (sleeveArt && bigArt) {
      sleeveArt.src = bigArt;
      if (vinylLabel) vinylLabel.src = bigArt;
      if (vinyl) {
        const applyVinylTint = () => tintDiscFromArt(vinyl, sleeveArt);
        if (sleeveArt.complete && sleeveArt.naturalWidth) applyVinylTint();
        else sleeveArt.addEventListener('load', applyVinylTint, { once: true });
      }
    }
    if (miniArt && bigArt) miniArt.src = bigArt;
    if (tracksWrap) {
      Array.prototype.forEach.call(tracksWrap.children, (el, i) => {
        const active = i === index;
        el.classList.toggle('is-active', active);
        el.classList.toggle('is-playing', active && currentlyPlaying);
      });
    }
  }

  function buildTracks(widget) {
    if (!tracksWrap) return;
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
        widget.skip(i);
        widget.play();
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
      widget.load(e.detail.url, { show_artwork: true, callback: refreshTracks });
    });
    window.addEventListener('griot:play-track-index', (e) => {
      if (!e.detail || !Number.isInteger(e.detail.index)) return;
      if (e.detail.index < 0 || e.detail.index >= sounds.length) return;
      widget.skip(e.detail.index);
      widget.play();
    });

    miniToggle.addEventListener('click', togglePlay);
    document.getElementById('miniNext').addEventListener('click', () => widget.next());
    document.getElementById('miniPrev').addEventListener('click', () => widget.prev());

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

// Shared chrome behavior: nav scroll state, mobile menu, chat widget shell toggle.
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const toggle = document.querySelector('.site-nav__toggle');
  const links = document.querySelector('.site-nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('is-open'))
    );
  }

  const chat = document.querySelector('.chat-widget');
  const chatBtn = document.querySelector('.chat-widget__btn');
  if (chat && chatBtn) {
    chatBtn.addEventListener('click', () => chat.classList.toggle('is-open'));
  }

  initMiniPlayer();
  initAnimatedFavicon();
});

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
