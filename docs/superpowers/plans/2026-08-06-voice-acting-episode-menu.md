# Voice Acting Episode Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Spotify show embed in the Voice Acting section (`voice.html`) with a numbered menu of 8 curated episodes; clicking a row swaps the active embed. Update the section copy to mention sound design, production, and mixing/mastering.

**Architecture:** Static HTML/CSS/vanilla JS, no build step. Verification via the Browser preview tools (accessibility tree + console), not a test runner.

**Tech Stack:** Plain HTML/CSS/JS. Spotify `open.spotify.com/embed/episode/<id>` iframes. Spotify's public oEmbed endpoint for title fetch (same technique already used in this file's `pullArt` function).

## Global Constraints
- Match existing section markup/copy patterns in `voice.html` (eyebrow/title/desc + `btn btn-outline` CTA).
- No new dependencies, no build tooling, no backend calls beyond the existing public oEmbed pattern.

---

### Task 1: Curated episode menu + player markup, styling, and behavior

**Files:**
- Modify: `voice.html` (CSS: extend the `/* ---- voiceacting: spotify show embed ---- */` block, ~line 393-403)
- Modify: `voice.html` (HTML: replace the `.voiceacting` section body, ~line 791-799)
- Modify: `voice.html` (JS: add a new `<script>` block near the existing oEmbed `pullArt` script, or extend it)

**Interfaces:**
- Produces: `.voiceacting__layout` containing `.voiceacting__player iframe#vaPlayer` and `.voiceacting__menu` with 8 `button.voiceacting__item[data-episode-id]` rows. Self-contained — nothing else in the page depends on these names.

- [ ] **Step 1: Replace `.voiceacting` CSS**

Replace (`voice.html` lines 393-403):

```css
  /* ---- voiceacting: spotify show embed ---- */
  .voiceacting{
    padding:20px clamp(20px,5vw,64px) 120px;text-align:center;
  }
  .voiceacting__eyebrow{color:var(--brass);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
  .voiceacting__title{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3vw,38px);margin:10px 0 14px}
  .voiceacting__desc{font-size:15px;color:var(--paper-dim);max-width:48ch;margin:0 auto 30px}
  .voiceacting__embed{
    max-width:760px;margin:0 auto 24px;border-radius:12px;overflow:hidden;
  }
  .voiceacting__embed iframe{width:100%;border:0;display:block}
```

with:

```css
  /* ---- voiceacting: curated episode menu + player ---- */
  .voiceacting{
    padding:20px clamp(20px,5vw,64px) 120px;text-align:center;
  }
  .voiceacting__eyebrow{color:var(--brass);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
  .voiceacting__title{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3vw,38px);margin:10px 0 14px}
  .voiceacting__desc{font-size:15px;color:var(--paper-dim);max-width:60ch;margin:0 auto 30px}
  .voiceacting__layout{
    display:flex;gap:24px;max-width:900px;margin:0 auto 24px;text-align:left;align-items:flex-start;
  }
  .voiceacting__player{
    flex:1 1 55%;border-radius:12px;overflow:hidden;position:sticky;top:20px;
  }
  .voiceacting__player iframe{width:100%;border:0;display:block}
  .voiceacting__menu{
    flex:1 1 45%;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;
    max-height:352px;overflow-y:auto;
  }
  .voiceacting__item{
    display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 14px;
    border:1px solid rgba(239,230,216,.14);border-radius:8px;background:transparent;color:var(--paper-dim);
    font-size:14px;cursor:pointer;transition:border-color .2s,color .2s,background .2s;
  }
  .voiceacting__item:hover{border-color:var(--brass);color:var(--paper)}
  .voiceacting__item.is-active{border-color:var(--brass);background:rgba(201,162,75,.08);color:var(--paper)}
  .voiceacting__item__num{color:var(--brass);font-family:var(--font-display);flex:none;width:1.6em}
  @media (max-width:700px){
    .voiceacting__layout{flex-direction:column}
    .voiceacting__player{position:static;width:100%}
    .voiceacting__menu{max-height:none}
  }
```

- [ ] **Step 2: Replace `.voiceacting` HTML section body**

Replace (`voice.html` lines 791-799):

```html
<section class="voiceacting" id="voiceacting">
  <span class="voiceacting__eyebrow">Voice Acting</span>
  <h2 class="voiceacting__title">Character voice &amp; narration</h2>
  <p class="voiceacting__desc">Clips from the podcast and voice acting work — press play below.</p>
  <div class="voiceacting__embed">
    <iframe src="https://open.spotify.com/embed/show/10nz3fJyuAt0Fqfywa0sel" width="100%" height="352" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Voice acting — Spotify show"></iframe>
  </div>
  <a href="https://open.spotify.com/show/10nz3fJyuAt0Fqfywa0sel" target="_blank" rel="noopener" class="btn btn-outline">Listen on Spotify</a>
</section>
```

with:

```html
<section class="voiceacting" id="voiceacting">
  <span class="voiceacting__eyebrow">Voice Acting</span>
  <h2 class="voiceacting__title">Character voice &amp; narration</h2>
  <p class="voiceacting__desc">Clips from the podcast and voice acting work. Also behind the boards: sound design, production, and mixing &amp; mastering.</p>
  <div class="voiceacting__layout">
    <div class="voiceacting__player">
      <iframe id="vaPlayer" src="https://open.spotify.com/embed/episode/5tVNpRmJm0OrSzmsptOX3I" width="100%" height="352" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Voice acting — now playing"></iframe>
    </div>
    <ol class="voiceacting__menu" id="vaMenu">
      <li><button type="button" class="voiceacting__item is-active" data-episode-id="5tVNpRmJm0OrSzmsptOX3I"><span class="voiceacting__item__num">1</span><span class="voiceacting__item__label">Episode 1</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="4psJl3vaX8GtkM8QJoAb8C"><span class="voiceacting__item__num">2</span><span class="voiceacting__item__label">Episode 2</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="6KNe4ukjVtNR4bJxAMViyF"><span class="voiceacting__item__num">3</span><span class="voiceacting__item__label">Episode 3</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="2eoPYvtIhHT83Rc2s2j2Yp"><span class="voiceacting__item__num">4</span><span class="voiceacting__item__label">Episode 4</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="0DaAdU8CAHbNVThKLN2X6u"><span class="voiceacting__item__num">5</span><span class="voiceacting__item__label">Episode 5</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="4G3UQpzi6k5SxBzrmGnhbQ"><span class="voiceacting__item__num">6</span><span class="voiceacting__item__label">Episode 6</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="2BZHLoK4I8eKWW2Agm0ETW"><span class="voiceacting__item__num">7</span><span class="voiceacting__item__label">Episode 7</span></button></li>
      <li><button type="button" class="voiceacting__item" data-episode-id="6jSP2VBUT2JjN9VUassgOb"><span class="voiceacting__item__num">8</span><span class="voiceacting__item__label">Episode 8</span></button></li>
    </ol>
  </div>
  <a href="https://open.spotify.com/show/10nz3fJyuAt0Fqfywa0sel" target="_blank" rel="noopener" class="btn btn-outline">Listen on Spotify</a>
</section>
```

- [ ] **Step 3: Add the menu-click and title-fetch script**

Add a new `<script>` block immediately before the closing `</body>` tag's script group (right after the existing oEmbed `pullArt` `<script>...</script>` block that ends with `pullArt('.release[href*="open.spotify.com"]', ...)` and `})();` — insert as a sibling block, do not merge into it):

```html
<script>
(function(){
  var player = document.getElementById('vaPlayer');
  var menu = document.getElementById('vaMenu');
  if(!player || !menu) return;

  menu.querySelectorAll('.voiceacting__item').forEach(function(item){
    item.addEventListener('click', function(){
      var id = item.getAttribute('data-episode-id');
      player.src = 'https://open.spotify.com/embed/episode/' + id;
      menu.querySelectorAll('.voiceacting__item').forEach(function(el){
        el.classList.toggle('is-active', el === item);
      });
    });

    var id = item.getAttribute('data-episode-id');
    var label = item.querySelector('.voiceacting__item__label');
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/episode/' + id))
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(data && data.title) label.textContent = data.title;
      })
      .catch(function(){});
  });
})();
</script>
```

- [ ] **Step 4: Verify in browser**

Start the Browser preview on `voice.html`, `read_page` to confirm: the menu shows 8 rows (numbered, later replaced by real titles once the oEmbed fetches resolve), the player iframe's `src` starts on episode 1. Use `computer` to click the 3rd menu row via its `ref`, then re-run `read_page`/`javascript_tool` to confirm `#vaPlayer`'s `src` now contains `6KNe4ukjVtNR4bJxAMViyF` and the 3rd row carries `is-active`. Check `read_console_messages` for errors and `read_network_requests` for the oEmbed fetches succeeding (200s) or failing gracefully.

- [ ] **Step 5: Commit**

```bash
git add voice.html
git commit -m "Replace Voice Acting show embed with curated 8-episode menu"
```
