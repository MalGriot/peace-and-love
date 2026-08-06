# Griot Cuts Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `griot-cuts.html`'s hero as a two-slide video carousel (service reel + Sun Burna), fix the services marquee's content and seam bug, wire mute/mini-player interplay, and swap the placeholder portfolio grid for real Jungli content.

**Architecture:** Single-file page (`griot-cuts.html` holds its own `<style>`/`<script>`, matching every other page in this site — see `README.md`). One small addition to the shared `shared.js` mini-player widget (a new outgoing event). No build step, no framework, no package.json — this is a plain static site (`npx serve .` to preview).

**Tech Stack:** Plain HTML/CSS/JS, YouTube IFrame Player API (already used on this page), SoundCloud Widget API (already used by `shared.js`'s mini-player).

## Global Constraints

- No build step, no framework, no new dependencies — plain HTML/CSS/JS only, per this repo's `README.md`.
- Re-theme every color in `griot-cuts.html` off the real brand tokens already defined in `shared.css`'s `:root` (`--ink`, `--paper`, `--paper-dim`, `--brass`, `--gold`, `--velvet-deep`) — do not introduce new hues, except the page-local `--sun-teal` (`#3c6672`), which stays because it's load-bearing for the Sun Burna slide's H1 color and has no site-wide equivalent.
- "Brand Films" and "Trailers" must not appear anywhere in this page's copy (marquee or otherwise) — the user does not do that work.
- The existing hover-to-preview-silently / click-to-activate-with-sound / unmute-toggle video mechanic must be preserved exactly, just made to work per-slide instead of for a single hero video.
- This codebase has no automated test suite (confirmed: the only `test/` directory in the repo is under `worker/`, an unrelated Cloudflare Worker). Every task's "test" step in this plan is a manual verification pass in a real browser via the Browser preview tool — run the exact checks listed, don't skip them.

---

### Task 1: Add a `griot:mini-player-playing` event to the shared mini-player

**Files:**
- Modify: `shared.js` (inside `initMiniPlayer()`'s `boot()` function, the `SC.Widget.Events.PLAY` binding)

**Interfaces:**
- Consumes: nothing new
- Produces: a `window` `CustomEvent` named `griot:mini-player-playing`, dispatched every time the shared SoundCloud mini-player widget starts playing. No `detail` payload. Later tasks (Task 2) listen for this to mute the hero video when the visitor starts the mini-player.

This is a small, standalone, testable change: the shared mini-player currently has an *incoming* hook (`griot:pause-mini-player`, already used by Discography release panels) but no *outgoing* signal for "I just started playing." This task adds that signal. It's a no-op everywhere except pages that choose to listen for it.

- [ ] **Step 1: Locate the current PLAY binding**

Open `shared.js` and find this exact block inside `initMiniPlayer()`'s `boot()` function:

```js
    widget.bind(SC.Widget.Events.PLAY, () => {
      setPlaying(true);
      try { localStorage.setItem('griotPlayerActivated', '1'); } catch (e) {}
    });
```

- [ ] **Step 2: Add the dispatch**

Replace that block with:

```js
    widget.bind(SC.Widget.Events.PLAY, () => {
      setPlaying(true);
      try { localStorage.setItem('griotPlayerActivated', '1'); } catch (e) {}
      window.dispatchEvent(new CustomEvent('griot:mini-player-playing'));
    });
```

- [ ] **Step 3: Verify manually**

Run: `npx serve .` from the site root (`MAL GRIOT TRIFOLD WEBSITE/`), then open the printed local URL + `/music.html` in the Browser preview tool.

In the browser, run this in the JS console (via the browser tool's javascript_tool, for debugging only — this is a one-off check, not new product code):

```js
window.addEventListener('griot:mini-player-playing', () => console.log('GOT EVENT'));
```

Click the mini-player's play button. Expected: `GOT EVENT` appears in the console output (check via `read_console_messages`).

- [ ] **Step 4: Commit**

```bash
git add shared.js
git commit -m "Dispatch griot:mini-player-playing event when the shared mini-player starts"
```

---

### Task 2: Rebuild the hero as a two-slide video carousel

**Files:**
- Modify: `griot-cuts.html` (the `<style>` block's hero rules, the `<header class="g-hero">` markup, and the hero `<script>` block)

**Interfaces:**
- Consumes: `griot:mini-player-playing` (from Task 1) — mutes the active hero video slide when heard.
- Produces: dispatches `griot:pause-mini-player` (existing event already handled by `shared.js`) whenever a hero slide's video is unmuted/activated with sound.

This is the core task and is kept as one unit (markup + CSS + JS together) because the three are tightly coupled — new element IDs introduced in the markup are consumed immediately by the new JS, and splitting them would leave an intermediate state where the page's existing script points at IDs that no longer exist.

**Step 1: Replace the hero's CSS**

Find this block in `griot-cuts.html`'s `<style>` section (it runs from the `:root{...}` variables down through the `.g-hero__desc` rule):

```css
  :root{
    --leather-deep:#120d09;
    --leather-warm:#241811;
    --scar:#e8402f;
    --sun-gold:#f4a93b;
    --sun-amber:#e07a2c;
    --sun-teal:#3c6672;
  }
  body{background-color:var(--leather-deep);background-image:var(--stars-svg);background-repeat:repeat;background-attachment:fixed}

  .g-hero{
    position:relative;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:flex-end;
    overflow:hidden;background:var(--leather-deep);
  }
  .g-hero__poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(.1) contrast(1.1) brightness(.72) saturate(1.15);object-position:50% 38%;cursor:pointer;z-index:1;transition:opacity .5s ease}
  .g-hero.is-playing .g-hero__poster{pointer-events:none}
  .g-hero__video-wrap{position:absolute;inset:0;z-index:2;opacity:0;transition:opacity .8s ease;cursor:pointer}
  .g-hero.is-playing .g-hero__video-wrap{opacity:1;pointer-events:auto}
  .g-hero__video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}
  .g-hero__grain{position:absolute;inset:0;opacity:.5;mix-blend-mode:overlay;pointer-events:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
  .g-hero__scratch{position:absolute;inset:0;background:repeating-linear-gradient(115deg, rgba(255,255,255,.03) 0 1px, transparent 1px 90px);pointer-events:none}
  .g-hero__scrim{
    position:absolute;inset:0;pointer-events:none;transition:opacity .5s ease;
    background:
      linear-gradient(to top, rgba(8,5,2,.96) 0%, rgba(30,17,7,.62) 40%, rgba(224,122,44,.14) 68%, transparent 100%),
      radial-gradient(120% 80% at 20% 100%, rgba(244,169,59,.22), transparent 65%),
      radial-gradient(90% 70% at 100% 0%, rgba(60,102,114,.22), transparent 60%);
  }
  .g-hero.is-video-playing .g-hero__scrim{opacity:.4}
  .g-hero__inner{position:relative;z-index:2;padding:150px clamp(20px,5vw,64px) 64px;opacity:1;transform:translateY(0);transition:opacity .5s ease,transform .5s ease}
  .g-hero.is-video-playing .g-hero__inner{opacity:0;transform:translateY(10px);pointer-events:none}
  .g-hero__cta-row{display:flex;align-items:center;gap:14px}
  .g-hero__mute{
    display:flex;flex-shrink:0;align-items:center;justify-content:center;
    width:44px;height:44px;border-radius:50%;background:rgba(8,5,2,.6);border:1.5px solid rgba(239,230,216,.6);
    cursor:pointer;backdrop-filter:blur(2px);transition:transform .25s ease,background .25s ease;
  }
  .g-hero__mute:hover{transform:scale(1.08);background:rgba(224,122,44,.8);border-color:var(--sun-gold)}
  .g-hero__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--sun-gold);margin-bottom:16px;font-weight:600}
  .g-hero__title{
    font-family:var(--font-display);font-weight:600;font-size:clamp(52px,10vw,140px);line-height:.86;margin:0 0 20px;
    text-transform:uppercase;letter-spacing:-.01em;
    text-shadow:0 8px 40px rgba(0,0,0,.75), 0 2px 12px rgba(0,0,0,.85);
  }
  .g-hero__title em{font-style:normal;color:var(--sun-gold)}
  .g-hero__desc{font-size:15.5px;line-height:1.6;color:var(--paper-dim);max-width:42ch;margin-bottom:32px;text-shadow:0 2px 14px rgba(0,0,0,.7)}
```

Replace it with:

```css
  :root{
    --sun-teal:#3c6672;
  }
  body{background-color:var(--ink);background-image:var(--stars-svg);background-repeat:repeat;background-attachment:fixed}

  .g-hero{
    position:relative;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:flex-end;
    overflow:hidden;background:var(--ink);
    --hero-accent:var(--gold);
  }
  .g-hero__slides{position:absolute;inset:0;z-index:1}
  .g-hero__slide{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .6s ease}
  .g-hero__slide.is-active{opacity:1;pointer-events:auto}
  .g-hero__poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(.1) contrast(1.1) brightness(.72) saturate(1.15);cursor:pointer;transition:opacity .5s ease}
  .g-hero__slide.is-playing .g-hero__poster{pointer-events:none}
  .g-hero__video-wrap{position:absolute;inset:0;z-index:1;opacity:0;transition:opacity .8s ease;cursor:pointer}
  .g-hero__slide.is-playing .g-hero__video-wrap{opacity:1;pointer-events:auto}
  .g-hero__video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}
  .g-hero__grain{position:absolute;inset:0;opacity:.5;mix-blend-mode:overlay;pointer-events:none;z-index:2;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
  .g-hero__scratch{position:absolute;inset:0;background:repeating-linear-gradient(115deg, rgba(255,255,255,.03) 0 1px, transparent 1px 90px);pointer-events:none;z-index:2}
  .g-hero__scrim{
    position:absolute;inset:0;pointer-events:none;transition:opacity .5s ease;z-index:2;
    background:
      linear-gradient(to top, rgba(11,10,9,.96) 0%, rgba(11,10,9,.62) 40%, rgba(201,162,75,.14) 68%, transparent 100%),
      radial-gradient(120% 80% at 20% 100%, rgba(224,178,106,.18), transparent 65%),
      radial-gradient(90% 70% at 100% 0%, rgba(60,102,114,.22), transparent 60%);
  }
  .g-hero.is-video-playing .g-hero__scrim{opacity:.4}
  .g-hero__inner{position:relative;z-index:3;padding:150px clamp(20px,5vw,64px) 100px;opacity:1;transform:translateY(0);transition:opacity .5s ease,transform .5s ease}
  .g-hero.is-video-playing .g-hero__inner{opacity:0;transform:translateY(10px);pointer-events:none}
  .g-hero__cta-row{display:flex;align-items:center;gap:14px}
  .g-hero__mute{
    display:flex;flex-shrink:0;align-items:center;justify-content:center;
    width:44px;height:44px;border-radius:50%;background:rgba(11,10,9,.6);border:1.5px solid rgba(245,241,234,.6);
    cursor:pointer;backdrop-filter:blur(2px);transition:transform .25s ease,background .25s ease;
  }
  .g-hero__mute:hover{transform:scale(1.08);background:rgba(201,162,75,.8);border-color:var(--gold)}
  .g-hero__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;font-weight:600}
  .g-hero__title{
    font-family:var(--font-display);font-weight:600;font-size:clamp(52px,10vw,140px);line-height:.86;margin:0 0 14px;
    text-transform:uppercase;letter-spacing:-.01em;
    text-shadow:0 8px 40px rgba(0,0,0,.75), 0 2px 12px rgba(0,0,0,.85);
  }
  .g-hero__title em{font-style:normal;color:var(--hero-accent)}
  .g-hero__credit{font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--hero-accent);margin:0 0 18px;text-shadow:0 2px 14px rgba(0,0,0,.7)}
  .g-hero__desc{font-size:15.5px;line-height:1.6;color:var(--paper-dim);max-width:42ch;margin-bottom:32px;text-shadow:0 2px 14px rgba(0,0,0,.7)}
  .g-hero__dots{position:absolute;left:50%;bottom:96px;translate:-50% 0;z-index:4;display:flex;gap:9px}
  .g-hero__dot{width:8px;height:8px;padding:0;border-radius:999px;border:none;background:rgba(245,241,234,.28);cursor:pointer;transition:background .3s ease,transform .3s ease}
  .g-hero__dot.is-active{background:var(--gold);transform:scale(1.3)}
```

- [ ] **Step 2: Replace the marquee/portfolio/services/CTA color rules that referenced the old palette**

Find this block (still in `<style>`, right after the hero rules end):

```css
  /* kinetic marquee strip */
  .marquee{overflow:hidden;border-top:1px solid rgba(239,230,216,.12);border-bottom:1px solid rgba(239,230,216,.12);background:var(--leather-warm);padding:16px 0}
  .marquee__track{display:flex;gap:40px;white-space:nowrap;animation:scroll-left 22s linear infinite;width:max-content}
  .marquee__track span{font-family:var(--font-display);font-weight:600;font-size:20px;text-transform:uppercase;letter-spacing:.02em;color:var(--paper-dim)}
  .marquee__track span:nth-child(odd){color:var(--scar)}
  @keyframes scroll-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}

  /* portfolio grid */
  .portfolio{padding:100px clamp(20px,5vw,64px)}
  .portfolio__head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:44px;flex-wrap:wrap}
  .portfolio__head h2{font-family:var(--font-display);font-weight:600;text-transform:uppercase;font-size:clamp(28px,3.4vw,44px);margin:0}
  .portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  .p-card{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:2px}
  .p-card img{width:100%;height:100%;object-fit:cover;filter:grayscale(.35) contrast(1.1);transition:transform .5s ease,filter .5s ease}
  .p-card:hover img{transform:scale(1.06);filter:grayscale(0) contrast(1.1)}
  .p-card__scrim{position:absolute;inset:0;background:linear-gradient(to top, rgba(18,13,9,.9), transparent 60%)}
  .p-card__label{position:absolute;left:16px;bottom:14px;right:16px}
  .p-card__label .kind{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--scar);display:block;margin-bottom:4px;font-weight:600}
  .p-card__label .name{font-family:var(--font-display);font-weight:500;font-size:18px}
  @media (max-width:860px){.portfolio-grid{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:560px){.portfolio-grid{grid-template-columns:1fr}}

  /* services strip */
  .services{padding:0 clamp(20px,5vw,64px) 100px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(239,230,216,.1)}
  .service{background:var(--leather-deep);padding:36px 28px}
  .service .num{color:var(--scar);font-family:var(--font-display);font-weight:600;font-size:14px}
  .service h3{font-family:var(--font-display);font-weight:500;font-size:20px;margin:14px 0 10px}
  .service p{font-size:13.5px;color:var(--paper-dim);line-height:1.6;margin:0}
  @media (max-width:760px){.services{grid-template-columns:1fr}}

  .g-cta{padding:90px clamp(20px,5vw,64px);text-align:center;background:var(--leather-warm);border-top:1px solid rgba(239,230,216,.1)}
  .g-cta h2{font-family:var(--font-display);font-weight:600;text-transform:uppercase;font-size:clamp(30px,4.2vw,48px);margin:0 0 24px}
```

Replace it with (marquee's `animation-duration`/keyframe target now come from a `--marquee-shift` custom property set by JS in Task 3 — the `22s`/`-50%` hardcodes are removed here since Task 3 owns them; portfolio `.p-card` becomes an `<a>` so needs `text-decoration:none;color:inherit`; a "More on YouTube" link style is added to `.portfolio__head`; `--scar` red is replaced by `--brass`/`--gold`; `--leather-*` panels become `--ink`/`--velvet-deep`):

```css
  /* kinetic marquee strip */
  .marquee{overflow:hidden;border-top:1px solid rgba(245,241,234,.12);border-bottom:1px solid rgba(245,241,234,.12);background:rgba(0,0,0,.28);padding:16px 0}
  .marquee__track{display:flex;gap:40px;white-space:nowrap;width:max-content;animation:scroll-left linear infinite}
  .marquee__track span{font-family:var(--font-display);font-weight:600;font-size:20px;text-transform:uppercase;letter-spacing:.02em;color:var(--paper-dim)}
  .marquee__track span:nth-child(odd){color:var(--gold)}
  @keyframes scroll-left{from{transform:translateX(0)}to{transform:translateX(var(--marquee-shift, -50%))}}

  /* portfolio grid */
  .portfolio{padding:100px clamp(20px,5vw,64px)}
  .portfolio__head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:44px;flex-wrap:wrap}
  .portfolio__head h2{font-family:var(--font-display);font-weight:600;text-transform:uppercase;font-size:clamp(28px,3.4vw,44px);margin:0}
  .portfolio__head a{color:var(--gold);font-size:13px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid rgba(224,178,106,.4);padding-bottom:2px;transition:border-color .2s ease}
  .portfolio__head a:hover{border-color:var(--gold)}
  .portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  .p-card{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:2px;display:block;text-decoration:none;color:inherit}
  .p-card img{width:100%;height:100%;object-fit:cover;filter:grayscale(.35) contrast(1.1);transition:transform .5s ease,filter .5s ease}
  .p-card:hover img{transform:scale(1.06);filter:grayscale(0) contrast(1.1)}
  .p-card__scrim{position:absolute;inset:0;background:linear-gradient(to top, rgba(11,10,9,.9), transparent 60%)}
  .p-card__label{position:absolute;left:16px;bottom:14px;right:16px}
  .p-card__label .kind{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brass);display:block;margin-bottom:4px;font-weight:600}
  .p-card__label .name{font-family:var(--font-display);font-weight:500;font-size:18px}
  @media (max-width:860px){.portfolio-grid{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:560px){.portfolio-grid{grid-template-columns:1fr}}

  /* services strip */
  .services{padding:0 clamp(20px,5vw,64px) 100px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(245,241,234,.1)}
  .service{background:var(--ink);padding:36px 28px}
  .service .num{color:var(--brass);font-family:var(--font-display);font-weight:600;font-size:14px}
  .service h3{font-family:var(--font-display);font-weight:500;font-size:20px;margin:14px 0 10px}
  .service p{font-size:13.5px;color:var(--paper-dim);line-height:1.6;margin:0}
  @media (max-width:760px){.services{grid-template-columns:1fr}}

  .g-cta{padding:90px clamp(20px,5vw,64px);text-align:center;background:var(--velvet-deep);border-top:1px solid rgba(245,241,234,.1)}
  .g-cta h2{font-family:var(--font-display);font-weight:600;text-transform:uppercase;font-size:clamp(30px,4.2vw,48px);margin:0 0 24px}
```

- [ ] **Step 3: Replace the hero markup**

Find:

```html
<header class="g-hero" id="ghHero">
  <img class="g-hero__poster" id="ghPoster" src="https://img.youtube.com/vi/OQ0wqOBxscU/maxresdefault.jpg" alt="Sun Burna visualizer lyric video by Mal Griot">
  <div id="ghVideoWrap" class="g-hero__video-wrap"></div>
  <div class="g-hero__scratch"></div>
  <div class="g-hero__grain"></div>
  <div class="g-hero__scrim"></div>
  <div class="g-hero__inner">
    <span class="g-hero__eyebrow">Video Editing</span>
    <h1 class="g-hero__title">Griot<br><em>Cuts</em></h1>
    <p class="g-hero__desc">Story-first, kinetic edits — music videos, reels, and brand content cut with rhythm, not just trimmed.</p>
    <div class="g-hero__cta-row">
      <a href="#work" class="btn btn-light">See the Work</a>
      <button type="button" class="g-hero__mute" id="ghMute" aria-label="Unmute video">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      </button>
    </div>
  </div>
</header>
```

Replace it with:

```html
<header class="g-hero" id="ghHero">
  <div class="g-hero__slides" id="ghSlides"></div>
  <div class="g-hero__scratch"></div>
  <div class="g-hero__grain"></div>
  <div class="g-hero__scrim"></div>
  <div class="g-hero__inner">
    <span class="g-hero__eyebrow" id="ghEyebrow">Video Editing</span>
    <h1 class="g-hero__title" id="ghTitle">Griot<br><em>Cuts</em></h1>
    <p class="g-hero__credit" id="ghCredit" hidden></p>
    <p class="g-hero__desc" id="ghDesc">Precise, story-first cuts with retention-built pacing, color grading, and clean captions — edits made to be watched, not skipped.</p>
    <div class="g-hero__cta-row">
      <a href="#work" class="btn btn-light">See the Work</a>
      <button type="button" class="g-hero__mute" id="ghMute" aria-label="Unmute video">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      </button>
    </div>
  </div>
  <div class="g-hero__dots" id="ghDots"></div>
</header>
```

- [ ] **Step 4: Replace the hero script**

Find the entire hero-related script (everything from `renderChrome('cuts');` through the closing of the last `hero.addEventListener('click', ...)` block, right before `</script>`):

```js
  renderChrome('cuts');
  const hero = document.getElementById('ghHero');
  const poster = document.getElementById('ghPoster');
  const videoWrap = document.getElementById('ghVideoWrap');
  const muteBtn = document.getElementById('ghMute');

  var VIDEO_ID = 'OQ0wqOBxscU';
  var UPLOADS_PLAYLIST_ID = 'UU2ouYdd3qmP9vSvLpKD8-CQ'; // Mal Griot channel uploads (UC -> UU)

  var player = null;
  var apiReady = false;
  var activated = false; // true once the viewer has intentionally started playback with sound

  var iconUnmuted = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var iconMuted = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  muteBtn.innerHTML = iconMuted;

  function ensurePlayer(cb){
    if(player){ cb(); return; }
    videoWrap.innerHTML = '<div id="ghPlayerTarget"></div>';
    player = new YT.Player('ghPlayerTarget', {
      videoId: VIDEO_ID,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0, mute: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
        cc_load_policy: 0, iv_load_policy: 3
      },
      events: {
        onReady: function(){ cb(); },
        onStateChange: function(e){
          if(e.data === YT.PlayerState.PLAYING){
            hero.classList.add('is-video-playing');
            try{ player.unloadModule('captions'); }catch(err){}
          } else if(e.data === YT.PlayerState.PAUSED){
            hero.classList.remove('is-video-playing');
          } else if(e.data === YT.PlayerState.ENDED){
            hero.classList.remove('is-video-playing');
            if(activated){
              // hand off to more Mal Griot uploads instead of YouTube's suggestion grid
              player.loadPlaylist({ list: UPLOADS_PLAYLIST_ID, listType: 'playlist', index: 0 });
            } else {
              // loop the muted preview
              player.seekTo(0);
              player.playVideo();
            }
          }
        }
      }
    });
  }

  window.onYouTubeIframeAPIReady = function(){ apiReady = true; };
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  function previewOn(){
    if(activated || !apiReady) return;
    ensurePlayer(function(){
      player.mute();
      player.playVideo();
      hero.classList.add('is-playing');
    });
  }
  function previewOff(){
    if(activated) return;
    if(player){ player.pauseVideo(); }
    hero.classList.remove('is-playing');
  }

  hero.addEventListener('mouseenter', previewOn);
  hero.addEventListener('mouseleave', previewOff);

  function togglePlay(e){
    if(e){ e.stopPropagation(); }
    if(!apiReady) return;
    ensurePlayer(function(){
      if(!activated){
        activated = true;
        hero.classList.add('is-activated', 'is-playing');
        player.unMute();
        player.playVideo();
        muteBtn.innerHTML = iconUnmuted;
        muteBtn.setAttribute('aria-label','Mute video');
      } else if(player.getPlayerState() === YT.PlayerState.PLAYING){
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });
  }
  function toggleMute(e){
    if(e){ e.stopPropagation(); }
    if(!apiReady) return;
    if(!activated){ togglePlay(); return; }
    if(!player) return;
    if(player.isMuted()){
      player.unMute();
      muteBtn.innerHTML = iconUnmuted;
      muteBtn.setAttribute('aria-label','Mute video');
    } else {
      player.mute();
      muteBtn.innerHTML = iconMuted;
      muteBtn.setAttribute('aria-label','Unmute video');
    }
  }
  muteBtn.addEventListener('click', toggleMute);
  hero.addEventListener('click', function(e){
    if(e.target.closest('#ghMute, .g-hero__inner a')) return;
    togglePlay(e);
  });
```

Replace it with:

```js
  renderChrome('cuts');

  var HERO_SLIDES = [
    {
      videoId: 'Kjgp3adMSSY',
      poster: 'https://img.youtube.com/vi/Kjgp3adMSSY/hqdefault.jpg',
      alt: 'Griot Cuts video editing reel',
      eyebrow: 'Video Editing',
      titleHtml: 'Griot<br><em>Cuts</em>',
      credit: '',
      desc: 'Precise, story-first cuts with retention-built pacing, color grading, and clean captions — edits made to be watched, not skipped.',
      accent: 'var(--gold)',
      playlistId: null
    },
    {
      videoId: 'OQ0wqOBxscU',
      poster: 'https://img.youtube.com/vi/OQ0wqOBxscU/maxresdefault.jpg',
      alt: 'Sun Burna visualizer lyric video by Mal Griot',
      eyebrow: 'Self-Produced',
      titleHtml: 'Sun<br><em>Burna</em>',
      credit: 'Written · Shot · Edited · Mixed by Mal Griot',
      desc: 'A visualizer lyric video built entirely in-house — writing, footage, edit, and mix all under one roof.',
      accent: 'var(--sun-teal)',
      playlistId: 'UU2ouYdd3qmP9vSvLpKD8-CQ' // Mal Griot channel uploads (UC -> UU)
    }
  ];

  var hero = document.getElementById('ghHero');
  var slidesWrap = document.getElementById('ghSlides');
  var dotsWrap = document.getElementById('ghDots');
  var eyebrowEl = document.getElementById('ghEyebrow');
  var titleEl = document.getElementById('ghTitle');
  var creditEl = document.getElementById('ghCredit');
  var descEl = document.getElementById('ghDesc');
  var muteBtn = document.getElementById('ghMute');

  var iconUnmuted = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var iconMuted = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper,#efe6d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

  var slideIndex = 0;
  var apiReady = false;
  var slideTimer = null;
  var anyActivated = false; // stops autoplay for good once any slide's sound is turned on

  var slideState = HERO_SLIDES.map(function(){
    return { player: null, activated: false, el: null, videoWrap: null };
  });

  HERO_SLIDES.forEach(function(s, i){
    var el = document.createElement('div');
    el.className = 'g-hero__slide' + (i === 0 ? ' is-active' : '');
    el.innerHTML =
      '<img class="g-hero__poster" src="' + s.poster + '" alt="' + s.alt + '">' +
      '<div class="g-hero__video-wrap"></div>';
    slidesWrap.appendChild(el);
    slideState[i].el = el;
    slideState[i].videoWrap = el.querySelector('.g-hero__video-wrap');

    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'g-hero__dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', 'Show slide ' + (i + 1));
    dot.addEventListener('click', function(){ showSlide(i); });
    dotsWrap.appendChild(dot);

    el.addEventListener('mouseenter', function(){ previewOn(i); });
    el.addEventListener('mouseleave', function(){ previewOff(i); });
    el.addEventListener('click', function(e){
      if (i !== slideIndex) return;
      if (e.target.closest('#ghMute, .g-hero__inner a')) return;
      togglePlay(i, e);
    });
  });

  function applySlide(i){
    slideIndex = i;
    var s = HERO_SLIDES[i];
    Array.prototype.forEach.call(slidesWrap.children, function(el, idx){
      el.classList.toggle('is-active', idx === i);
    });
    Array.prototype.forEach.call(dotsWrap.children, function(el, idx){
      el.classList.toggle('is-active', idx === i);
    });
    hero.style.setProperty('--hero-accent', s.accent);
    eyebrowEl.textContent = s.eyebrow;
    titleEl.innerHTML = s.titleHtml;
    if (s.credit) { creditEl.textContent = s.credit; creditEl.hidden = false; }
    else { creditEl.hidden = true; }
    descEl.textContent = s.desc;
    syncMuteButton(i);
  }

  function showSlide(i){
    if (i === slideIndex) return;
    applySlide(i);
  }

  function nextSlide(){ showSlide((slideIndex + 1) % HERO_SLIDES.length); }
  function startTimer(){ if (anyActivated) return; slideTimer = setInterval(nextSlide, 5000); }
  function stopTimer(){ clearInterval(slideTimer); }

  hero.addEventListener('mouseenter', stopTimer);
  hero.addEventListener('mouseleave', startTimer);

  function ensurePlayer(i, cb){
    var st = slideState[i];
    if (st.player) { cb(); return; }
    st.videoWrap.innerHTML = '<div id="ghPlayerTarget-' + i + '"></div>';
    st.player = new YT.Player('ghPlayerTarget-' + i, {
      videoId: HERO_SLIDES[i].videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0, mute: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
        cc_load_policy: 0, iv_load_policy: 3
      },
      events: {
        onReady: function(){ cb(); },
        onStateChange: function(e){ onPlayerStateChange(i, e); }
      }
    });
  }

  function onPlayerStateChange(i, e){
    var st = slideState[i];
    if (e.data === YT.PlayerState.PLAYING){
      st.el.classList.add('is-playing');
      if (i === slideIndex) hero.classList.add('is-video-playing');
      try { st.player.unloadModule('captions'); } catch(err){}
    } else if (e.data === YT.PlayerState.PAUSED){
      st.el.classList.remove('is-playing');
      if (i === slideIndex) hero.classList.remove('is-video-playing');
    } else if (e.data === YT.PlayerState.ENDED){
      st.el.classList.remove('is-playing');
      if (i === slideIndex) hero.classList.remove('is-video-playing');
      if (st.activated){
        var s = HERO_SLIDES[i];
        if (s.playlistId) st.player.loadPlaylist({ list: s.playlistId, listType: 'playlist', index: 0 });
      } else {
        st.player.seekTo(0);
        st.player.playVideo();
      }
    }
  }

  window.onYouTubeIframeAPIReady = function(){ apiReady = true; };
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  function previewOn(i){
    var st = slideState[i];
    if (st.activated || !apiReady) return;
    ensurePlayer(i, function(){
      st.player.mute();
      st.player.playVideo();
    });
  }
  function previewOff(i){
    var st = slideState[i];
    if (st.activated) return;
    if (st.player) st.player.pauseVideo();
  }

  function syncMuteButton(i){
    var st = slideState[i];
    if (st.activated && st.player && !st.player.isMuted()){
      muteBtn.innerHTML = iconUnmuted;
      muteBtn.setAttribute('aria-label', 'Mute video');
    } else {
      muteBtn.innerHTML = iconMuted;
      muteBtn.setAttribute('aria-label', 'Unmute video');
    }
  }

  function togglePlay(i, e){
    if (e) e.stopPropagation();
    if (!apiReady) return;
    var st = slideState[i];
    ensurePlayer(i, function(){
      if (!st.activated){
        activate(i);
      } else if (st.player.getPlayerState() === YT.PlayerState.PLAYING){
        st.player.pauseVideo();
      } else {
        st.player.playVideo();
      }
    });
  }

  function activate(i){
    var st = slideState[i];
    st.activated = true;
    anyActivated = true;
    stopTimer();
    st.player.unMute();
    st.player.playVideo();
    syncMuteButton(i);
    window.dispatchEvent(new CustomEvent('griot:pause-mini-player'));
  }

  function toggleMute(e){
    if (e) e.stopPropagation();
    if (!apiReady) return;
    var st = slideState[slideIndex];
    if (!st.activated){ togglePlay(slideIndex, e); return; }
    if (!st.player) return;
    if (st.player.isMuted()){
      st.player.unMute();
      window.dispatchEvent(new CustomEvent('griot:pause-mini-player'));
    } else {
      st.player.mute();
    }
    syncMuteButton(slideIndex);
  }
  muteBtn.addEventListener('click', toggleMute);

  window.addEventListener('griot:mini-player-playing', function(){
    slideState.forEach(function(st){
      if (st.player && st.activated && !st.player.isMuted()){
        st.player.mute();
      }
    });
    syncMuteButton(slideIndex);
  });

  applySlide(0);
  startTimer();
```

- [ ] **Step 5: Verify manually**

Run: `npx serve .` from the site root, open `griot-cuts.html` in the Browser preview tool.

Check each of these with the browser tool (screenshot + read_page + computer clicks):
1. Slide 1 loads active: eyebrow "Video Editing", H1 "Griot Cuts" with "Cuts" in gold, two dots visible with the first one highlighted.
2. Hover the hero: the poster fades to a silently-playing preview of `Kjgp3adMSSY` within ~1s.
3. Move mouse away before clicking: the preview pauses (check via `read_console_messages` there's no error; visually the video freezes).
4. Click the hero: video unmutes and plays with sound, the mute button icon switches to "unmuted", the inner copy (title/desc/CTA) fades out, and the scrim dims.
5. Click the second dot: slide 2 becomes active, eyebrow now "Self-Produced", H1 "Sun Burna" in teal, and the credit line "Written · Shot · Edited · Mixed by Mal Griot" is visible.
6. Wait 5+ seconds without touching slide 1 or 2 while neither is activated: the hero auto-advances between slides.
7. Activate (click) either slide's video: wait 6+ seconds — confirm the hero no longer auto-advances (the active slide is unaffected by the timer).
8. With a slide's video unmuted, open `music.html` in a second tab of the same browser session isn't required — instead confirm in `griot-cuts.html` alone: unmuting a slide dispatches `griot:pause-mini-player` (add a temporary `window.addEventListener('griot:pause-mini-player', () => console.log('PAUSE MINI'))` via `javascript_tool`, click to unmute, confirm `PAUSE MINI` logs).
9. Simulate the mini-player starting: run `window.dispatchEvent(new CustomEvent('griot:mini-player-playing'))` via `javascript_tool` while a slide is unmuted and playing with sound — confirm the video mutes (mute button icon flips to "muted").

- [ ] **Step 6: Commit**

```bash
git add griot-cuts.html
git commit -m "Rebuild Griot Cuts hero as a two-slide video carousel with mini-player mute interplay"
```

---

### Task 3: Fix the marquee — real service list, seamless loop

**Files:**
- Modify: `griot-cuts.html` (marquee markup + a new `<script>` block)

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Replace the marquee markup**

Find:

```html
<div class="marquee">
  <div class="marquee__track">
    <span>Music Videos</span><span>Reels</span><span>Color Grading</span><span>Sound Design</span><span>Brand Films</span><span>Trailers</span>
    <span>Music Videos</span><span>Reels</span><span>Color Grading</span><span>Sound Design</span><span>Brand Films</span><span>Trailers</span>
  </div>
</div>
```

Replace it with:

```html
<div class="marquee">
  <div class="marquee__track" id="marqueeTrack"></div>
</div>
```

- [ ] **Step 2: Add the marquee script**

Add this new `<script>` block right after the existing hero `<script>` block (i.e., as its own `<script>...</script>`, still before `</body>`):

```html
<script>
(function(){
  var MARQUEE_ITEMS = [
    'Music Videos', 'Reels', 'Podcast Editing', 'Precise Cuts', 'High-Retention Pacing',
    'Color Grading', 'Audio Cleanup', 'Custom Captions', 'Animated Titles',
    'On-Brand Graphics', '4K Delivery', 'Thumbnails'
  ];
  var SPEED_PX_PER_SEC = 70;

  var track = document.getElementById('marqueeTrack');

  function appendSequence(){
    var frag = document.createDocumentFragment();
    MARQUEE_ITEMS.forEach(function(text){
      var span = document.createElement('span');
      span.textContent = text;
      frag.appendChild(span);
    });
    track.appendChild(frag);
  }

  appendSequence();
  var trackGap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
  // one "period" is the width of a single sequence PLUS the gap that will
  // sit between it and the next sequence once a second one is appended —
  // that gap isn't part of scrollWidth yet, so it's added explicitly. This
  // is what makes translateX(-period) land exactly on the next sequence's
  // start, with no dead space at the seam.
  var period = track.scrollWidth + trackGap;

  while (track.scrollWidth < window.innerWidth * 2) {
    appendSequence();
  }
  window.addEventListener('resize', function(){
    while (track.scrollWidth < window.innerWidth * 2 + period) {
      appendSequence();
    }
  });

  track.style.setProperty('--marquee-shift', '-' + period + 'px');
  track.style.animationDuration = (period / SPEED_PX_PER_SEC) + 's';
})();
</script>
```

- [ ] **Step 3: Verify manually**

With the local server still running from Task 2, reload `griot-cuts.html` in the Browser preview tool.

1. `read_page` or `get_page_text` the marquee strip: confirm "Brand Films" and "Trailers" do not appear anywhere, and "Music Videos", "Podcast Editing", "4K Delivery" etc. do.
2. Screenshot the marquee at two different moments a couple seconds apart: confirm it's scrolling continuously left with no visible blank gap at any point (the strip of text should always be full edge-to-edge).
3. Resize the browser window wider (`resize_window` to a large desktop width) and reload: confirm the marquee still has no blank gap immediately after load (this is the resize-safety check for the `while` loop in Step 2).
4. Watch one full scroll cycle (or check via `javascript_tool`: `document.getElementById('marqueeTrack').children.length` should be a multiple of 12, i.e. at least 2 full sequences) — confirms duplication happened correctly.

- [ ] **Step 4: Commit**

```bash
git add griot-cuts.html
git commit -m "Fix marquee content and seamless-loop seam bug on Griot Cuts page"
```

---

### Task 4: Swap the portfolio grid for real Jungli content

**Files:**
- Modify: `griot-cuts.html` (the `<section class="portfolio" id="work">` markup)

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Replace the portfolio section**

Find:

```html
<section class="portfolio" id="work">
  <div class="portfolio__head">
    <h2>Selected Cuts</h2>
    <span class="eyebrow" style="color:var(--paper-dim)">Placeholder stills — final reels swap in</span>
  </div>
  <div class="portfolio-grid">
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8102676/pexels-photo-8102676.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Music Video</span><span class="name">Night Session</span></div>
    </div>
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8100053/pexels-photo-8100053.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Brand Film</span><span class="name">Field Notes</span></div>
    </div>
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8102674/pexels-photo-8102674.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Color Grade</span><span class="name">Low Tide</span></div>
    </div>
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8100057/pexels-photo-8100057.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Reel</span><span class="name">Studio Time</span></div>
    </div>
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8100060/pexels-photo-8100060.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Trailer</span><span class="name">G R II O T</span></div>
    </div>
    <div class="p-card">
      <img src="https://images.pexels.com/photos/8100065/pexels-photo-8100065.jpeg?cs=tinysrgb&dpr=2&w=800" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Sound Design</span><span class="name">Afterglow</span></div>
    </div>
  </div>
</section>
```

Replace it with:

```html
<section class="portfolio" id="work">
  <div class="portfolio__head">
    <h2>Selected Cuts</h2>
    <a href="https://www.youtube.com/playlist?list=PLbPNLAe4otnoA1w8Gwik4HKF9Wgb0WoON" target="_blank" rel="noopener">More on YouTube</a>
  </div>
  <div class="portfolio-grid">
    <a class="p-card" href="https://www.youtube.com/watch?v=0jKuATSksNE" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/0jKuATSksNE/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Jungli Podcast</span><span class="name">Mayur — Creating the Nomad Scene</span></div>
    </a>
    <a class="p-card" href="https://www.youtube.com/watch?v=7o5KTmkmnKA" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/7o5KTmkmnKA/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Jungli Podcast</span><span class="name">Mansoor — Jungli's First Overlander</span></div>
    </a>
    <a class="p-card" href="https://www.youtube.com/watch?v=97xce3ehyHM" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/97xce3ehyHM/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Jungli Podcast</span><span class="name">Mal Griot — Rock Bottom Has A Basement</span></div>
    </a>
    <a class="p-card" href="https://www.youtube.com/watch?v=CLdsbFqlwO0" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/CLdsbFqlwO0/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Jungli Podcast</span><span class="name">The Wandering Naka's — The World Is My School</span></div>
    </a>
    <a class="p-card" href="https://www.youtube.com/watch?v=GEDmFw_3MlU" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/GEDmFw_3MlU/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Jungli Podcast</span><span class="name">Jake Gordon — Breath Is My Navigator</span></div>
    </a>
    <a class="p-card" href="https://www.youtube.com/watch?v=jitu5eI9ybg" target="_blank" rel="noopener">
      <img src="https://img.youtube.com/vi/jitu5eI9ybg/hqdefault.jpg" alt="">
      <div class="p-card__scrim"></div>
      <div class="p-card__label"><span class="kind">Reel</span><span class="name">Jungli — Before &amp; After</span></div>
    </a>
  </div>
</section>
```

- [ ] **Step 2: Verify manually**

With the local server still running, reload `griot-cuts.html` in the Browser preview tool.

1. Screenshot the portfolio grid: confirm 6 real YouTube thumbnails render (not broken images) and no Pexels stock photography remains.
2. `read_page` the section: confirm the "More on YouTube" link is present in `.portfolio__head` and every card's label reads either "Jungli Podcast" or "Reel" — no "Music Video", "Brand Film", "Trailer", "Color Grade", or "Sound Design" labels remain (those were the old placeholder categories).
3. Click one podcast card (via `computer`): confirm it opens the correct YouTube video in a new tab (check `tabs_context` for the new tab's URL).
4. Hover a card: confirm the image desaturation-to-color hover effect still works (screenshot before/after).

- [ ] **Step 3: Commit**

```bash
git add griot-cuts.html
git commit -m "Replace Griot Cuts portfolio placeholders with real Jungli podcast/reel content"
```

---

## Self-Review Notes

- **Spec coverage:** hero carousel (Task 2) ✓, marquee content + seam fix (Task 3) ✓, mini-player↔video mute interplay (Task 1 + Task 2 Step 4/5) ✓, portfolio real content (Task 4) ✓, brand re-theme (Task 2 Steps 1–2) ✓, "Brand Films"/"Trailers" removed (Task 3 Step 1, verified Task 3 Step 3) ✓.
- **Type/name consistency checked:** `griot:mini-player-playing` (Task 1 producer, Task 2 consumer) and `griot:pause-mini-player` (Task 2 producer, pre-existing `shared.js` consumer) match exactly across tasks. `HERO_SLIDES[i].accent` values (`'var(--gold)'`, `'var(--sun-teal)'`) match the CSS custom property names defined in Task 2 Step 1 (`--gold` from `shared.css`, `--sun-teal` redefined locally). `--marquee-shift` is set in Task 3's script and consumed by the `@keyframes scroll-left` rule written in Task 2 Step 2 — confirmed both use the exact same property name.
- **No placeholders remain** — every step has literal, complete code.
