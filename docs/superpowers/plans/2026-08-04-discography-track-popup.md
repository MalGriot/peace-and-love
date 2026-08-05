# Discography Track Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a Discography row on `music.html` expands an inline panel beneath it with a playable tracklist, instead of navigating to Spotify/SoundCloud.

**Architecture:** SoundCloud releases reuse the site's existing single shared SC Widget instance (the same one that drives the "breathe love d e e p" mini-player) — clicking a SoundCloud release re-points that widget at the new release and renders its tracks as rows inside the panel. Spotify releases embed Spotify's own iframe widget (`open.spotify.com/embed/...`) inside the same panel shell, since Spotify has no public, no-auth way to expose per-track playback or even a tracklist to custom code. Both panel types share one accordion open/close mechanism (only one panel open at a time) and pause the mini-player when opened.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, no test framework. This is a static site opened via `file://` or served as static files — "tests" in this plan are manual browser verification steps run through the Claude Browser pane (`navigate`, `computer`, `javascript_tool`, `read_console_messages`), not an automated test suite. There is no existing automated test infrastructure in this repo to extend.

## Global Constraints

- Scope is `music.html` (+ the shared `shared.js` hooks it needs). No changes to `index.html`, `griot-cuts.html`, `wellness-coaching.html`, `contact.html`.
- Only one release panel open at a time; opening a new one closes whatever was open.
- Every release row's original `href` must keep working as a real link if JS fails (progressive enhancement) — until a row's `parseRelease()` recognizes its platform, its click is never intercepted.
- Opening any release panel (SoundCloud or Spotify) pauses the BLD mini-player via a `griot:pause-mini-player` `CustomEvent` on `window`.
- Closing a SoundCloud panel does **not** stop mini-player playback (it's persistent by design). Closing a Spotify panel **does** stop its audio (the iframe `src` is reset).
- Spotify embed heights: `152px` for a `track` embed, `400px` for an `album` embed.
- No backend, no Spotify Web API / OAuth, no server-stored tracklists, no reskinning the Spotify iframe's internals.
- Panel visual shell (background, accent border, open/close transition) is identical for both platforms — only the body content differs.

---

### Task 1: `shared.js` — expose mini-player hooks for external callers

**Files:**
- Modify: `shared.js:137` (the `ALBUM_NAME` constant), `shared.js:178-182` (inside `activate()`), `shared.js:249-299` (inside `boot()`, including the `refresh()` function)

**Interfaces:**
- Consumes: nothing new (uses the existing `widget` variable already in scope inside `boot()`)
- Produces (for `music.html`'s script to consume in later tasks):
  - `window` `CustomEvent` **`griot:pause-mini-player`** (no detail) — pauses the shared SC widget.
  - `window` `CustomEvent` **`griot:load-release`** (detail: `{ url: string, title: string }`) — reloads the shared SC widget with a different SoundCloud URL and updates the mini-player's displayed release name.
  - `window` `CustomEvent` **`griot:play-track-index`** (detail: `{ index: number }`) — skips the shared SC widget to that track index and plays it.
  - `window` `CustomEvent` **`griot:release-ready`** (detail: `{ sounds: Array }`) — dispatched every time the widget's track list is (re)hydrated, whether from the initial page load or a `griot:load-release` reload. `sounds` is the same array shape already used internally by `buildTracks()` (each item has `.title`, `.artwork_url`, `.user.avatar_url`).

This task has no visual UI of its own — it's verified by dispatching the events manually from the browser console against the *existing* BLD player, before any Discography markup depends on them.

- [ ] **Step 1: Replace the hardcoded album name with a mutable one**

In `shared.js`, find:

```js
  const ALBUM_NAME = 'breathe love d e e p';
```

Replace with:

```js
  let currentReleaseName = 'breathe love d e e p';
```

- [ ] **Step 2: Update `activate()` to use the mutable name**

Find (inside `activate()`):

```js
    const title = s.title || ALBUM_NAME;
    // "breathe love d e e p" is always one phrase — never let "d e e p" split
    // across a wrap or marquee boundary, so it's wrapped in a no-wrap span.
    const marqueeHtml = `${title}  —  <span class="nb">${ALBUM_NAME}</span>`;
```

Replace with:

```js
    const title = s.title || currentReleaseName;
    // "breathe love d e e p" is always one phrase — never let "d e e p" split
    // across a wrap or marquee boundary, so it's wrapped in a no-wrap span.
    const marqueeHtml = `${title}  —  <span class="nb">${currentReleaseName}</span>`;
```

- [ ] **Step 3: Hoist the refresh logic out of the READY callback, and dispatch `griot:release-ready` from it**

**Correction (discovered during implementation):** `SC.Widget.Events.READY` fires only once, on the widget's first boot. A later `widget.load(url, options)` call to swap in a different release does not re-fire `READY`. The Widget API's `.load()` instead accepts a `callback` option, invoked once the new sound has loaded — so `refresh` must be hoisted out of the `READY` binding into its own function so both the initial `READY` binding and every future `.load()` call can invoke it.

Find (inside `boot()`):

```js
    widget.bind(SC.Widget.Events.READY, () => {
      // The widget can return artwork_url/avatar as null for tracks further
      // down the playlist on early getSounds() calls, before their metadata
      // has fully hydrated — poll a few times, spaced out, until every sound
      // has art (or we give up and just keep the album-cover fallback).
      let attempts = 0;
      function refresh() {
        widget.getSounds((list) => {
          sounds = list || [];
          buildTracks(widget);
          activate(currentIndex);
          attempts++;
          const allHydrated = sounds.length && sounds.every((s) => s.artwork_url || (s.user && s.user.avatar_url));
          if (!allHydrated && attempts < 5) setTimeout(refresh, 1500);
        });
      }
      refresh();
    });
```

Replace with:

```js
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
```

- [ ] **Step 4: Add the three inbound event listeners**

Find (inside `boot()`, right after the `widget.bind(SC.Widget.Events.READY, refreshTracks);` line you just added, followed by the existing `PLAY`/`PAUSE`/`FINISH`/`PLAY_PROGRESS` bindings and `miniToggle.addEventListener`):

```js
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, () => {
      widget.getCurrentSoundIndex((i) => { if (i !== currentIndex) activate(i); });
    });

    miniToggle.addEventListener('click', togglePlay);
```

Replace with:

```js
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
      if (!e.detail || typeof e.detail.index !== 'number') return;
      widget.skip(e.detail.index);
      widget.play();
    });

    miniToggle.addEventListener('click', togglePlay);
```

- [ ] **Step 5: Verify against the live page**

Run:

```
mcp__Claude_Browser__navigate { url: "file:///Users/malcolm/Documents/CLAUDE CODE/MAL GRIOT TRIFOLD WEBSITE/music.html" }
```

Wait ~2s for the SC widget to boot, then run via `javascript_tool`:

```js
document.getElementById('miniTitle').innerHTML
```

Expected: contains `breathe love d e e p` (unchanged baseline behavior).

Start playback with a real click (autoplay policies block programmatic `.play()`):

```
mcp__Claude_Browser__computer { action: "left_click", ref: <ref for #miniToggle from read_page> }
```

Wait ~1.5s, then check:

```js
document.getElementById('miniIconPause').style.display
```

Expected: `"block"` (playing).

Now dispatch the pause hook:

```js
window.dispatchEvent(new CustomEvent('griot:pause-mini-player'));
```

Check again:

```js
document.getElementById('miniIconPause').style.display
```

Expected: `"none"` (paused).

Now dispatch a release swap:

```js
window.dispatchEvent(new CustomEvent('griot:load-release', { detail: { url: 'https://soundcloud.com/mal-griot/sets/truly-higher', title: 'TRULY HIGHER' } }));
```

Wait ~2.5s (widget reload + `getSounds` round trip), then check:

```js
document.getElementById('miniTitle').innerHTML
```

Expected: contains `TRULY HIGHER` (not `breathe love d e e p`).

Now dispatch a track jump:

```js
window.dispatchEvent(new CustomEvent('griot:play-track-index', { detail: { index: 1 } }));
```

Wait ~1s, then check:

```js
document.querySelectorAll('#listenTracks .listen__track')[1].classList.contains('is-active')
```

Expected: `true`.

Finally, check the console for errors:

```
mcp__Claude_Browser__read_console_messages { onlyErrors: true }
```

Expected: empty (or only unrelated, pre-existing warnings — e.g. the YouTube API key placeholder).

- [ ] **Step 6: Commit**

```bash
git add shared.js
git commit -m "Expose mini-player hooks (pause/load-release/play-track-index/release-ready) for external callers"
```

---

### Task 2: `music.html` — accordion shell + SoundCloud release panels

**Files:**
- Modify: `music.html:411` (insert new CSS immediately before the `</style>` closing tag)
- Modify: `music.html:1073-1074` (insert a new `<script>` block between the existing third inline `<script>`'s closing tag and `<script src="shared.js"></script>`)

**Interfaces:**
- Consumes: `griot:pause-mini-player`, `griot:load-release`, `griot:play-track-index`, `griot:release-ready` from Task 1.
- Produces (for Task 3 to extend):
  - `parseRelease(href)` — returns `{ platform: 'soundcloud', url }` or `null`. Task 3 extends this to also return `{ platform: 'spotify', kind, id, url }`.
  - `openPanel(anchor, panel, info)` — Task 3 adds an `else if (info.platform === 'spotify')` branch.
  - `closeActivePanel()` — Task 3 adds iframe-src cleanup to it.
  - Module-level state `activePanel` / `activeAnchor` / `releaseReadyHandler` that Task 3's Spotify branch also touches.

This task makes the 5 SoundCloud releases (breathe love d e e p is not a Discography row and is unaffected; TRULY HIGHER, Sun Burna, sumthn, PeRiOdYsSiUs, plus... note "breathe love d e e p" **is** also a Discography row per the existing markup) fully interactive. The 5 Spotify rows are untouched by `parseRelease` in this task and so keep navigating normally — verified explicitly below as a regression check.

- [ ] **Step 1: Add the panel CSS**

In `music.html`, find the line immediately before the closing `</style>` tag (currently `music.html:410`, the closing brace of `.ytfeed__nav:disabled:hover{...}`'s neighboring rule block — insert right before line 411's `</style>`):

```html
  .m-cta h2{font-family:var(--font-display);font-weight:400;font-size:clamp(28px,4vw,44px);margin:0 0 24px}
</style>
```

Replace with:

```html
  .m-cta h2{font-family:var(--font-display);font-weight:400;font-size:clamp(28px,4vw,44px);margin:0 0 24px}

  /* ---- discography track popups (accordion, one open at a time) ---- */
  .release__panel{
    max-height:0;opacity:0;overflow:hidden;margin-top:0;
    transition:max-height .4s ease,opacity .3s ease,margin-top .4s ease;
  }
  .release__panel.is-open{max-height:600px;opacity:1;margin-top:26px}
  .release__panel-inner{
    border-top:2px solid var(--release-accent, var(--brass));
    background:rgba(74,31,34,.18);border-radius:8px;
    padding:22px clamp(16px,3vw,28px);
  }
  .release__tracks{list-style:none;margin:0;padding:0}
  .release__track-row{
    display:flex;align-items:center;gap:14px;padding:10px 4px;width:100%;
    border:none;border-bottom:1px solid rgba(239,230,216,.08);
    background:none;text-align:left;cursor:pointer;
    color:var(--paper);font-family:var(--font-body);
    transition:color .2s ease;
  }
  .release__track-row:last-child{border-bottom:none}
  .release__track-row:hover,
  .release__track-row.is-active{color:var(--release-accent, var(--brass))}
  .release__track-row .num{font-size:11px;color:var(--paper-dim);width:22px;flex:none}
  .release__track-row .title{flex:1;font-size:14px;min-width:0}
  .release__track-row .play-ico{flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center}
  .release__panel-loading{font-size:13px;color:var(--paper-dim);padding:8px 4px}
  .release__panel-embed{width:100%;border:none;border-radius:6px;display:block}
  .release__panel-fallback{margin-top:16px}
</style>
```

- [ ] **Step 2: Add the disclosure + SoundCloud panel script**

In `music.html`, find:

```html
      track.addEventListener('scroll', updateNav);
    })
    .catch(function(){});
})();
</script>
<script src="shared.js"></script>
```

Replace with:

```html
      track.addEventListener('scroll', updateNav);
    })
    .catch(function(){});
})();
</script>
<script>
(function(){
  // Discography track popups: click a release row to expand an inline
  // panel beneath it with a tracklist/player, instead of leaving the site.
  // SoundCloud releases play through the same shared mini-player widget
  // that drives the "breathe love d e e p" stage above (see shared.js).
  // Spotify support is added in a later pass.

  var activePanel = null;          // currently open .release__panel, or null
  var activeAnchor = null;         // its trigger <a class="release">
  var releaseReadyHandler = null;  // bound only while a SoundCloud panel is open

  function parseRelease(href){
    if(href.indexOf('soundcloud.com') !== -1){
      return { platform: 'soundcloud', url: href };
    }
    return null;
  }

  function closeActivePanel(){
    if(!activePanel) return;
    activePanel.classList.remove('is-open');
    activeAnchor.setAttribute('aria-expanded', 'false');
    if(releaseReadyHandler){
      window.removeEventListener('griot:release-ready', releaseReadyHandler);
      releaseReadyHandler = null;
    }
    activePanel = null;
    activeAnchor = null;
  }

  function buildSoundCloudPanel(panel, releaseUrl, releaseTitle){
    panel.innerHTML =
      '<div class="release__panel-inner">' +
        '<div class="release__panel-loading">Loading tracklist…</div>' +
        '<ul class="release__tracks" hidden></ul>' +
        '<a class="btn btn-outline release__panel-fallback" href="' + releaseUrl + '" target="_blank" rel="noopener">Open on SoundCloud &#8599;</a>' +
      '</div>';

    window.dispatchEvent(new CustomEvent('griot:pause-mini-player'));
    window.dispatchEvent(new CustomEvent('griot:load-release', { detail: { url: releaseUrl, title: releaseTitle } }));

    var loading = panel.querySelector('.release__panel-loading');
    var list = panel.querySelector('.release__tracks');

    releaseReadyHandler = function(e){
      var sounds = (e.detail && e.detail.sounds) || [];
      if(!sounds.length) return;
      loading.hidden = true;
      list.hidden = false;
      list.innerHTML = '';
      sounds.forEach(function(s, i){
        var li = document.createElement('li');
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'release__track-row';
        row.innerHTML =
          '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="title">' + (s.title || 'Track ' + (i + 1)) + '</span>' +
          '<span class="play-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>';
        row.addEventListener('click', function(){
          window.dispatchEvent(new CustomEvent('griot:play-track-index', { detail: { index: i } }));
        });
        li.appendChild(row);
        list.appendChild(li);
      });
    };
    window.addEventListener('griot:release-ready', releaseReadyHandler);
  }

  function openPanel(anchor, panel, info){
    var accent = getComputedStyle(anchor).getPropertyValue('--release-accent').trim();
    if(accent) panel.style.setProperty('--release-accent', accent);

    if(info.platform === 'soundcloud'){
      var titleEl = anchor.querySelector('.release__title');
      buildSoundCloudPanel(panel, info.url, titleEl ? titleEl.textContent.trim() : '');
    }

    panel.classList.add('is-open');
    anchor.setAttribute('aria-expanded', 'true');
    activePanel = panel;
    activeAnchor = anchor;
  }

  document.querySelectorAll('.release').forEach(function(anchor, idx){
    var info = parseRelease(anchor.getAttribute('href'));
    if(!info) return; // not a recognized platform yet — leave it as a normal link

    var panel = document.createElement('div');
    panel.className = 'release__panel';
    panel.id = 'release-panel-' + idx;
    anchor.insertAdjacentElement('afterend', panel);
    anchor.setAttribute('aria-expanded', 'false');
    anchor.setAttribute('aria-controls', panel.id);

    anchor.addEventListener('click', function(e){
      e.preventDefault();
      var wasOpen = activePanel === panel;
      closeActivePanel();
      if(!wasOpen) openPanel(anchor, panel, info);
    });
  });
})();
</script>
<script src="shared.js"></script>
```

- [ ] **Step 3: Verify SoundCloud releases**

Navigate to `music.html` (fresh load), then use `read_page` to find the "TRULY HIGHER" release row's ref, and click it:

```
mcp__Claude_Browser__computer { action: "left_click", ref: <TRULY HIGHER row ref> }
```

Check:

```js
document.querySelector('a[href*="truly-higher"]').getAttribute('aria-expanded')
```

Expected: `"true"`.

```js
document.querySelector('a[href*="truly-higher"]').nextElementSibling.classList.contains('is-open')
```

Expected: `true`.

Wait ~2.5s for tracks to hydrate, then:

```js
document.querySelector('a[href*="truly-higher"]').nextElementSibling.querySelectorAll('.release__track-row').length
```

Expected: greater than `0`.

Click a track row (find its ref via `read_page`, or click via `javascript_tool`: `document.querySelectorAll('a[href*="truly-higher"] + .release__panel .release__track-row')[0].click()`), wait ~1.5s, then:

```js
document.getElementById('miniTitle').innerHTML
```

Expected: contains `TRULY HIGHER`.

- [ ] **Step 4: Verify single-open-at-a-time**

With the TRULY HIGHER panel still open, click the "Sun Burna" row. Then check:

```js
[
  document.querySelector('a[href*="truly-higher"]').getAttribute('aria-expanded'),
  document.querySelector('a[href*="sun-burna"]').getAttribute('aria-expanded')
]
```

Expected: `["false", "true"]`.

- [ ] **Step 5: Verify Spotify rows are untouched (regression check)**

```js
document.querySelector('a[href*="open.spotify.com/track/5uvEb58GBUWOo8bfxhCy8v"]').hasAttribute('aria-expanded')
```

Expected: `false` — confirms `parseRelease()` correctly ignored it and the click handler was never attached, so it remains a plain link (Task 3 changes this).

- [ ] **Step 6: Check console for errors**

```
mcp__Claude_Browser__read_console_messages { onlyErrors: true }
```

Expected: empty (aside from pre-existing unrelated warnings).

- [ ] **Step 7: Commit**

```bash
git add music.html
git commit -m "Add accordion track panels for SoundCloud discography releases"
```

---

### Task 3: `music.html` — Spotify release panels + full cross-platform regression

**Files:**
- Modify: `music.html` (the same `<script>` block added in Task 2, Step 2 — three targeted edits inside it)

**Interfaces:**
- Consumes: `parseRelease`, `openPanel`, `closeActivePanel`, `activePanel`/`activeAnchor` module state from Task 2.
- Produces: nothing new for later tasks — this completes the feature.

- [ ] **Step 1: Extend `parseRelease` to recognize Spotify links**

Find:

```js
  function parseRelease(href){
    if(href.indexOf('soundcloud.com') !== -1){
      return { platform: 'soundcloud', url: href };
    }
    return null;
  }
```

Replace with:

```js
  function parseRelease(href){
    if(href.indexOf('soundcloud.com') !== -1){
      return { platform: 'soundcloud', url: href };
    }
    var sp = href.match(/open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/);
    if(sp){
      return { platform: 'spotify', kind: sp[1], id: sp[2], url: href };
    }
    return null;
  }
```

- [ ] **Step 2: Add `buildSpotifyPanel` and wire it into `openPanel`**

Find:

```js
  function openPanel(anchor, panel, info){
    var accent = getComputedStyle(anchor).getPropertyValue('--release-accent').trim();
    if(accent) panel.style.setProperty('--release-accent', accent);

    if(info.platform === 'soundcloud'){
      var titleEl = anchor.querySelector('.release__title');
      buildSoundCloudPanel(panel, info.url, titleEl ? titleEl.textContent.trim() : '');
    }

    panel.classList.add('is-open');
    anchor.setAttribute('aria-expanded', 'true');
    activePanel = panel;
    activeAnchor = anchor;
  }
```

Replace with:

```js
  function buildSpotifyPanel(panel, info){
    var height = info.kind === 'track' ? 152 : 400;
    panel.innerHTML =
      '<div class="release__panel-inner">' +
        '<iframe class="release__panel-embed" style="height:' + height + 'px" ' +
          'src="https://open.spotify.com/embed/' + info.kind + '/' + info.id + '?utm_source=generator&theme=0" ' +
          'frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
        '<a class="btn btn-outline release__panel-fallback" href="' + info.url + '" target="_blank" rel="noopener">Open on Spotify &#8599;</a>' +
      '</div>';
  }

  function openPanel(anchor, panel, info){
    var accent = getComputedStyle(anchor).getPropertyValue('--release-accent').trim();
    if(accent) panel.style.setProperty('--release-accent', accent);

    if(info.platform === 'soundcloud'){
      var titleEl = anchor.querySelector('.release__title');
      buildSoundCloudPanel(panel, info.url, titleEl ? titleEl.textContent.trim() : '');
    } else if(info.platform === 'spotify'){
      window.dispatchEvent(new CustomEvent('griot:pause-mini-player'));
      buildSpotifyPanel(panel, info);
    }

    panel.classList.add('is-open');
    anchor.setAttribute('aria-expanded', 'true');
    activePanel = panel;
    activeAnchor = anchor;
  }
```

- [ ] **Step 3: Stop Spotify audio on close**

Find:

```js
  function closeActivePanel(){
    if(!activePanel) return;
    activePanel.classList.remove('is-open');
    activeAnchor.setAttribute('aria-expanded', 'false');
    if(releaseReadyHandler){
      window.removeEventListener('griot:release-ready', releaseReadyHandler);
      releaseReadyHandler = null;
    }
    activePanel = null;
    activeAnchor = null;
  }
```

Replace with:

```js
  function closeActivePanel(){
    if(!activePanel) return;
    activePanel.classList.remove('is-open');
    activeAnchor.setAttribute('aria-expanded', 'false');
    if(releaseReadyHandler){
      window.removeEventListener('griot:release-ready', releaseReadyHandler);
      releaseReadyHandler = null;
    }
    var iframe = activePanel.querySelector('.release__panel-embed');
    if(iframe) iframe.src = 'about:blank';
    activePanel = null;
    activeAnchor = null;
  }
```

- [ ] **Step 4: Verify Spotify track and album embeds**

Navigate to `music.html` fresh, click "I Tried It" (a `track` link), then check:

```js
var f = document.querySelector('a[href*="5uvEb58GBUWOo8bfxhCy8v"]').nextElementSibling.querySelector('.release__panel-embed');
[f.src, f.style.height]
```

Expected: `["https://open.spotify.com/embed/track/5uvEb58GBUWOo8bfxhCy8v?utm_source=generator&theme=0", "152px"]`.

Click "Toxic Baby" (an `album` link), then check:

```js
var f = document.querySelector('a[href*="6oilUaIrr7oAbkiXLKc00h"]').nextElementSibling.querySelector('.release__panel-embed');
[f.src, f.style.height]
```

Expected: `["https://open.spotify.com/embed/album/6oilUaIrr7oAbkiXLKc00h?utm_source=generator&theme=0", "400px"]`.

- [ ] **Step 5: Verify Spotify panel pauses the mini-player**

Fresh navigate. Click the mini-player's play toggle (real click) to start BLD, wait ~1.5s, confirm:

```js
document.getElementById('miniIconPause').style.display
```

Expected: `"block"`.

Click a Spotify release row ("Free Fall"), then check:

```js
document.getElementById('miniIconPause').style.display
```

Expected: `"none"` (mini-player paused).

- [ ] **Step 6: Verify closing a Spotify panel stops its audio, and mixed-platform switching works**

With "Free Fall" open, click "Helicopter Man" (a different Spotify release). Check the Free Fall iframe was cleared:

```js
document.querySelector('a[href*="0mG2qACRHS8sHoyiniieFp"]').nextElementSibling.querySelector('.release__panel-embed').src
```

Expected: `"about:blank"`.

Then click "TRULY HIGHER" (a SoundCloud release). Check Helicopter Man's iframe was cleared and TRULY HIGHER's panel opened:

```js
[
  document.querySelector('a[href*="3u1kmOSbXQtWsYg3q8KFMj"]').nextElementSibling.querySelector('.release__panel-embed').src,
  document.querySelector('a[href*="truly-higher"]').getAttribute('aria-expanded')
]
```

Expected: `["about:blank", "true"]`.

- [ ] **Step 7: Full walkthrough of all 10 releases**

Fresh navigate. In sequence, click every release row in the Discography section (all 10: breathe love d e e p, I Tried It, The Call of the Jungle, Free Fall, Helicopter Man, Toxic Baby, TRULY HIGHER, Sun Burna, sumthn, PeRiOdYsSiUs). After each click, confirm via `javascript_tool` that exactly one `.release__panel` has the `is-open` class:

```js
document.querySelectorAll('.release__panel.is-open').length
```

Expected: `1` after every click in the sequence (never `0` while a panel should be open, never `2+`).

Then check the console once more:

```
mcp__Claude_Browser__read_console_messages { onlyErrors: true }
```

Expected: empty (aside from pre-existing unrelated warnings).

Take a final screenshot for a visual sanity check of one SoundCloud panel and one Spotify panel open (in two separate screenshots, since only one panel is open at a time):

```
mcp__Claude_Browser__computer { action: "screenshot" }
```

- [ ] **Step 8: Commit**

```bash
git add music.html
git commit -m "Add Spotify embed panels for discography releases; pause mini-player on open"
```

---
