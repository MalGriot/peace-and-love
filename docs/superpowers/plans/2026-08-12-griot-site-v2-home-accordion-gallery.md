# Home Accordion Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `index.html`'s current 3-panel "trifold" home with a 9-strip Accordion Gallery — one strip per sound category — using real photos and copy, wired to each category's final URL even though 8 of the 9 destination pages don't exist yet (they're built in later, per-page plans).

**Architecture:** Two new reusable effects join the existing `effects.css`/`effects.js` module: `initSilk()` (a lightweight canvas ambient background wash) and `initAccordionGallery()` (the expand-on-interact strip mechanic — hover-expand on desktop, tap-to-expand on touch, same function handling both via a `matchMedia('(hover: hover)')` check). `index.html` is rebuilt to use them, keeping its existing bespoke chrome (centered logo mark + social-icon bar) rather than switching to the shared `site-nav`, with two new links added to that bar (About, Videos) so Home stays a real entry point to every part of the site. A new closing CTA band (About / Contact) sits below the gallery, which means Home moves from a fixed, non-scrolling `100vh` layout to a normal scrolling page.

**Tech Stack:** Plain HTML/CSS/JS, no build step, no framework — matches the existing site exactly.

## Global Constraints

- No build step, no bundler, no npm dependency, no framework — hand-rolled vanilla CSS/JS only.
- Every new `init*()` function in `effects.js` must no-op safely (return early) when its target markup isn't present on the current page, matching the existing `initMiniPlayer()`/`initGooeyNav()`/`initStaggeredMenu()` guard pattern.
- Preserve every other existing page's current behavior — this plan only modifies `index.html`, `effects.css`, and `effects.js`. It does not touch `voice.html`, `video.html`, `soundscapes.html`, `contact.html`, `discography.html`, `shared.css`, or `shared.js`.
- Palette/type tokens must come from `shared.css`'s existing `:root` (`--ink`, `--paper`, `--paper-dim`, `--paper-faint`, `--brass`, `--gold`, `--font-display`, `--font-body`) — no new colors or fonts introduced. Where a canvas effect needs a literal RGB value (canvas `fillStyle` can't read CSS custom properties), the literal must match an existing token's real value exactly, with a comment saying which token it mirrors.
- Reduced-motion: `initSilk()`'s animation loop and any new CSS transition/animation must respect `prefers-reduced-motion: reduce`.
- The 9 strips link to their category's **final** planned filename (`performances.html`, `vo.html`, `poetry.html`, `hosting.html`, `looping.html`, `soundscapes.html`, `soundbaths.html`, `meditations.html`, `discography.html`) — per the user's explicit choice, 8 of these are expected to 404 until their own future plan builds them. This is intentional, not a bug to fix in this plan.
- About is **not** one of the 9 accordion strips — it's reached via the extended home-bar and the closing CTA band only, per the approved design (this resolves an inconsistency in the original design spec, confirmed with the user before writing this plan).
- Per-strip "preview of that page's own signature animation" (mentioned in the original design spec's Section 4) is explicitly out of scope for this plan — 8 of the 9 destination pages don't have a signature animation built yet. Strips use the proven grayscale→color photo reveal only. Revisit once more sound pages exist.
- Real photos only, sourced from the existing `img/` folder — no stock imagery, no invented content. Exact filenames and their strip assignment (confirmed by viewing each photo):

| Strip | Image file |
|---|---|
| Discography | `img/PP_09334.JPG` |
| Performances | `img/MalGriot Nivid Queendom Roland 17th May 2026 by Abhishek Gupta-20260517-1850-0897.JPG` |
| VO | `img/DSC00868.jpg` |
| Poetry | `img/KGL Aug 3 2024_Marko_198.jpg` |
| Hosting | `img/PP_09402.JPG` |
| Looping | `img/hero-3.jpg` |
| Soundscapes | `img/1722241513419.jpg` |
| Sound Baths | `img/about.jpg` |
| Meditations | `img/1722241513433.jpg` |

---

## File Structure

| File | Responsibility |
|---|---|
| `effects.css` (modify, append) | Adds Silk background CSS and Accordion Gallery CSS (generic strip mechanic: flex-grow hover-expand on desktop, height-expand tap-accordion on mobile). |
| `effects.js` (modify, append) | Adds `initSilk(canvas)` and `initAccordionGallery()`. |
| `index.html` (modify, full rebuild of the `<body>` content and its inline `<style>`/`<script>`) | The Home page: bespoke chrome (logo mark + extended social/link bar), the 9-strip gallery, closing CTA band. |

---

### Task 1: Silk background effect

**Files:**
- Modify: `effects.css` (append)
- Modify: `effects.js` (append)

**Interfaces:**
- Produces: `initSilk(root)` — takes an optional canvas element (defaults to `document.querySelector('.silk-bg')`), no-ops if not found. Draws a slow-drifting, low-opacity gradient-blob wash via `requestAnimationFrame`, sized to the canvas's own CSS box (resizes on `window.resize`).

- [ ] **Step 1: Append the Silk CSS to `effects.css`**

```css
/* ---------- Silk (ambient drifting-gradient background wash) ----------
   A low-opacity canvas sits behind page content, painting slow-moving
   soft-edged gradient blobs. Purely decorative — pointer-events:none, and
   initSilk() no-ops (never starts the animation loop) under
   prefers-reduced-motion. */
.silk-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
```

- [ ] **Step 2: Append `initSilk()` to `effects.js`**

```js
// ---------- Silk ----------
// Canvas-based ambient background: three soft radial-gradient blobs drift
// slowly in independent orbits. Colors are literal RGB because canvas
// fillStyle can't read CSS custom properties — each one mirrors an existing
// shared.css token exactly (see the comment on each blob).
function initSilk(root) {
  const canvas = root || document.querySelector('.silk-bg');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const BLOBS = [
    { color: 'rgba(201,138,69,0.10)', r: 0.55, speed: 0.00012, phase: 0 },   // mirrors --brass: #c98a45
    { color: 'rgba(224,178,106,0.08)', r: 0.40, speed: 0.00009, phase: 2.1 }, // mirrors --gold: #e0b26a
    { color: 'rgba(201,138,69,0.06)', r: 0.60, speed: 0.00015, phase: 4.2 },  // mirrors --brass: #c98a45
  ];

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(t) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    BLOBS.forEach((b) => {
      const x = w * (0.5 + 0.35 * Math.sin(t * b.speed + b.phase));
      const y = h * (0.5 + 0.35 * Math.cos(t * b.speed * 1.3 + b.phase));
      const r = Math.max(w, h) * b.r;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
```

- [ ] **Step 3: Verify in a scratch test page**

Create a temporary local file (not committed) to check the effect renders before it's wired into `index.html` in Task 4:

```bash
cd "MAL GRIOT TRIFOLD WEBSITE"
cat > /tmp/silk-test.html <<'EOF'
<!DOCTYPE html><html><head>
<link rel="stylesheet" href="effects.css">
<style>body{margin:0;background:#12100f}.wrap{position:relative;width:100vw;height:100vh}</style>
</head><body>
<div class="wrap"><canvas class="silk-bg"></canvas></div>
<script src="effects.js"></script>
<script>initSilk();</script>
</body></html>
EOF
cp /tmp/silk-test.html ./silk-test.html
npx serve . -l 4173
```

Open `http://localhost:4173/silk-test.html` in the browser tool. Confirm via screenshot that soft brass/gold gradient blobs are visible and drifting (take two screenshots ~3 seconds apart and confirm the blob positions differ). Check `read_console_messages` for zero errors. Then delete the scratch file:

```bash
rm "MAL GRIOT TRIFOLD WEBSITE/silk-test.html"
```

- [ ] **Step 4: Commit**

```bash
git add effects.css effects.js
git commit -m "Add Silk ambient background effect"
```

---

### Task 2: Accordion Gallery mechanic (desktop + mobile)

**Files:**
- Modify: `effects.css` (append)
- Modify: `effects.js` (append)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `initAccordionGallery()` — no-arg function, no-ops if `.accordion-gallery` isn't found. Wires both the desktop hover-expand and mobile tap-to-expand behavior via a single `matchMedia('(hover: hover) and (pointer: fine)')` branch, so one function serves both — no separate mobile init needed.

- [ ] **Step 1: Append the Accordion Gallery CSS to `effects.css`**

```css
/* ---------- Accordion Gallery (expand-on-interact strip gallery) ----------
   Desktop (hover-capable pointer): strips sit side by side, flex .6 by
   default; hovering one grows it to flex 2.2 via initAccordionGallery()
   toggling .is-active, and reveals full color + copy. Below 900px width,
   strips stack top-to-bottom and collapse/expand by height instead of
   flex — tapping a collapsed strip expands it (classic vertical accordion);
   tapping the same, already-open strip lets the tap follow through as a
   real navigation. */
.accordion-gallery{position:relative;display:flex;width:100%;overflow:hidden}
.accordion-strip{
  position:relative;flex:.6;height:100%;overflow:hidden;display:block;
  text-decoration:none;cursor:pointer;
  transition:flex .6s cubic-bezier(.22,.9,.3,1);
}
.accordion-gallery.has-hover .accordion-strip.is-active{flex:2.2}

.accordion-strip__photo{
  position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  filter:grayscale(1) brightness(.6);
  transition:filter .5s ease,transform 8s ease;
}
.accordion-gallery.has-hover .accordion-strip.is-active .accordion-strip__photo{filter:grayscale(0) brightness(1)}
.accordion-strip:hover .accordion-strip__photo{transform:scale(1.04)}

.accordion-strip__scrim{
  position:absolute;inset:0;z-index:1;
  background:linear-gradient(to top, rgba(8,7,6,.94) 0%, rgba(8,7,6,.5) 34%, rgba(8,7,6,.08) 62%);
}

.accordion-strip__content{
  position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;
  padding:24px 18px 40px;
}
.accordion-strip__eyebrow{
  font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85);
  margin-bottom:8px;white-space:nowrap;
  opacity:0;transform:translateY(6px);transition:opacity .35s ease,transform .35s ease;
}
.accordion-strip.is-active .accordion-strip__eyebrow{opacity:1;transform:translateY(0)}
.accordion-strip__title{
  font-family:var(--font-display);font-weight:400;font-size:clamp(16px,2.2vw,26px);color:#fff;
  line-height:1.05;margin:0 0 6px;white-space:nowrap;text-shadow:0 2px 10px rgba(0,0,0,.6);
}
.accordion-strip__desc{
  font-size:12px;color:rgba(255,255,255,.88);max-width:24ch;line-height:1.5;
  max-height:0;opacity:0;overflow:hidden;transition:max-height .4s ease,opacity .3s ease;
}
.accordion-strip.is-active .accordion-strip__desc{max-height:70px;opacity:1}

@media (max-width:900px){
  .accordion-gallery{flex-direction:column}
  .accordion-strip{flex:none !important;height:84px;transition:height .5s ease}
  .accordion-strip.is-active{height:280px}
  .accordion-strip__content{padding:16px 18px}
  .accordion-strip.is-active .accordion-strip__content{padding:20px 18px 28px}
  .accordion-strip__eyebrow{opacity:1;transform:none}
  .accordion-strip__title{font-size:18px;white-space:normal}
  .accordion-strip__desc{opacity:0}
  .accordion-strip.is-active .accordion-strip__desc{max-height:70px;opacity:1}
}

@media (prefers-reduced-motion: reduce){
  .accordion-strip,.accordion-strip__photo,.accordion-strip__eyebrow,.accordion-strip__desc{transition:none}
}
```

- [ ] **Step 2: Append `initAccordionGallery()` to `effects.js`**

```js
// ---------- Accordion Gallery ----------
// Desktop (hover-capable pointer): hovering a strip grows it via flex and
// reveals full color; mouseleave collapses it back. Touch/no-hover: tapping
// a collapsed strip expands it in place (preventing that tap's navigation);
// tapping an already-open strip lets the tap navigate through normally.
// No-ops without .accordion-gallery or with no .accordion-strip children.
function initAccordionGallery() {
  const gallery = document.querySelector('.accordion-gallery');
  if (!gallery) return;
  const strips = gallery.querySelectorAll('.accordion-strip');
  if (!strips.length) return;

  const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (isHoverCapable) {
    strips.forEach((strip) => {
      strip.addEventListener('mouseenter', () => {
        gallery.classList.add('has-hover');
        strips.forEach((s) => s.classList.remove('is-active'));
        strip.classList.add('is-active');
      });
      strip.addEventListener('mouseleave', () => {
        gallery.classList.remove('has-hover');
        strip.classList.remove('is-active');
      });
    });
  } else {
    strips.forEach((strip) => {
      strip.addEventListener('click', (e) => {
        const alreadyOpen = strip.classList.contains('is-active');
        if (alreadyOpen) return;
        e.preventDefault();
        strips.forEach((s) => s.classList.remove('is-active'));
        strip.classList.add('is-active');
      });
    });
  }
}
```

- [ ] **Step 3: Verify in a scratch test page**

```bash
cd "MAL GRIOT TRIFOLD WEBSITE"
cat > ./accordion-test.html <<'EOF'
<!DOCTYPE html><html><head>
<link rel="stylesheet" href="effects.css">
<style>html,body{margin:0;height:100%;background:#12100f}.wrap{width:100vw;height:100vh}</style>
</head><body>
<div class="wrap">
  <div class="accordion-gallery" id="gallery">
    <a class="accordion-strip" href="#a">
      <img class="accordion-strip__photo" src="img/PP_09334.JPG">
      <div class="accordion-strip__scrim"></div>
      <div class="accordion-strip__content">
        <span class="accordion-strip__eyebrow">Test</span>
        <span class="accordion-strip__title">Strip A</span>
        <span class="accordion-strip__desc">Description A</span>
      </div>
    </a>
    <a class="accordion-strip" href="#b">
      <img class="accordion-strip__photo" src="img/hero-3.jpg">
      <div class="accordion-strip__scrim"></div>
      <div class="accordion-strip__content">
        <span class="accordion-strip__eyebrow">Test</span>
        <span class="accordion-strip__title">Strip B</span>
        <span class="accordion-strip__desc">Description B</span>
      </div>
    </a>
  </div>
</div>
<script src="effects.js"></script>
<script>initAccordionGallery();</script>
</body></html>
EOF
npx serve . -l 4173
```

Open `http://localhost:4173/accordion-test.html`. Desktop: hover Strip A, screenshot (confirm it's grown wider and in full color, Strip B stayed narrow/grayscale); move to Strip B, screenshot (confirm it swapped). `resize_window` to `mobile`: screenshot (confirm strips stack, both collapsed to ~84px); tap Strip A once (confirm it expands to ~280px tall, in color, without navigating — URL stays the same); tap Strip A again (confirm it navigates, URL becomes `...#a`). Check `read_console_messages` for zero errors throughout. Then delete the scratch file:

```bash
rm "MAL GRIOT TRIFOLD WEBSITE/accordion-test.html"
```

- [ ] **Step 4: Commit**

```bash
git add effects.css effects.js
git commit -m "Add Accordion Gallery mechanic (desktop hover-expand, mobile tap-to-expand)"
```

---

### Task 3: Rebuild `index.html`

**Files:**
- Modify: `index.html` (full rewrite of `<style>`, `<body>`, and the bottom `<script>` block; `<head>`'s existing meta/OG/JSON-LD tags stay as-is except for two new stylesheet/script includes)

**Interfaces:**
- Consumes: `initSilk()` and `initAccordionGallery()` from `effects.js` (Tasks 1-2); `chatWidgetHtml()` from `shared.js` (already used by `index.html` today, unchanged); `initScrollReveal()` from `effects.js` (already exists from an earlier plan) for the `.reveal` no-JS-fallback pattern already established on `contact.html`/`discography.html`.
- Produces: nothing consumed by a later task in this plan (last task before the smoke test).

- [ ] **Step 1: Read the current `index.html` in full before editing**

The file currently has: a fixed, non-scrolling `100vh` layout (`html,body{height:100%;overflow:hidden}`), a centered `.home-mark` logo overlay, a `.home-bar` row (social icons + a "Contact" text link), and a 3-panel `.panels` flex row with per-panel hover-video-preview logic. This task replaces the `.panels` section with the 9-strip `.accordion-gallery`, extends `.home-bar`, adds a closing CTA band below the gallery, and — because the CTA band needs room below the fold — removes the fixed/non-scrolling layout in favor of a normal scrolling page. The `.home-mark`, `.home-bar` link icons (Instagram/Spotify/SoundCloud/LinkedIn/WhatsApp/Email), the JSON-LD block, and all `<head>` meta/OG tags are unchanged — only add the two new stylesheet/script includes below.

- [ ] **Step 2: Add `effects.css`/`effects.js` includes to `<head>`, plus the no-JS-fallback class-setter script**

Right after the existing `<meta charset="UTF-8">` line, add (matching the pattern already used on `contact.html`/`discography.html`):

```html
<script>document.documentElement.className+=' js';</script>
```

Right after the existing `<link rel="stylesheet" href="shared.css">` line, add:

```html
<link rel="stylesheet" href="effects.css">
```

- [ ] **Step 3: Replace the `<style>` block**

Replace the entire existing `<style>...</style>` block in `<head>` with:

```html
<style>
  .home{position:relative;width:100%}

  .home-hero{position:relative;width:100vw;height:100vh;height:100svh;overflow:hidden}

  .home-mark{
    position:absolute;top:clamp(18px,3vh,32px);left:50%;transform:translateX(-50%);
    z-index:20;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:auto;
    cursor:default;transition:transform .4s ease;
  }
  .home-mark:hover{transform:translateX(-50%) scale(1.12)}
  .home-mark__row{display:flex;align-items:center;gap:8px}
  .home-mark__icon{width:22px;height:22px;filter:drop-shadow(0 2px 10px rgba(0,0,0,.5))}
  .home-mark:hover .home-mark__icon{animation:record-spin 1.6s linear infinite}
  @keyframes record-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  .home-mark__name{font-family:var(--font-display);font-size:clamp(16px,2vw,20px);letter-spacing:.16em;text-transform:uppercase;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.8),0 6px 22px rgba(0,0,0,.6)}
  .home-mark__sub{font-family:var(--font-body);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.85);text-shadow:0 1px 3px rgba(0,0,0,.9),0 4px 14px rgba(0,0,0,.6)}
  .home-mark::before{
    content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:calc(100% + 36px);height:calc(100% + 20px);
    background:radial-gradient(ellipse at center, rgba(0,0,0,.42) 0%, rgba(0,0,0,0) 72%);
    z-index:-1;pointer-events:none;
  }

  .home-bar{
    position:absolute;z-index:20;bottom:clamp(20px,4vh,40px);left:50%;transform:translateX(-50%);
    display:flex;align-items:center;gap:clamp(16px,2.2vw,26px);
  }
  .home-bar a{
    position:relative;display:flex;align-items:center;justify-content:center;
    color:var(--gold);text-decoration:none;
    filter:drop-shadow(0 2px 8px rgba(0,0,0,.6));
    transition:color .2s ease,transform .3s cubic-bezier(.34,1.56,.64,1);
  }
  .home-bar a svg{width:19px;height:19px;display:block}
  .home-bar a:hover{color:#f4d59a;transform:translateY(-4px) scale(1.14)}
  .home-bar a.home-bar__link{
    font-family:var(--font-body);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  }
  .home-bar a[data-tip]::after{
    content:attr(data-tip);position:absolute;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%) translateY(4px);
    white-space:nowrap;background:#0b0a09;color:var(--gold);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    padding:7px 13px;border-radius:3px;border:1px solid rgba(224,178,106,.35);
    opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;
    font-family:var(--font-body);
  }
  .home-bar a[data-tip]::before{
    content:'';position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
    border:5px solid transparent;border-top-color:#0b0a09;
    opacity:0;pointer-events:none;transition:opacity .25s ease;
  }
  .home-bar a[data-tip]:hover::after{opacity:1;transform:translateX(-50%) translateY(0)}
  .home-bar a[data-tip]:hover::before{opacity:1}

  .home-cta{padding:100px clamp(20px,5vw,64px);text-align:center}
  .home-cta__inner{max-width:640px;margin:0 auto;background:#1c1815;border:1px solid rgba(239,230,216,.1);border-radius:20px;padding:56px 32px}
  .home-cta h2{font-family:var(--font-display);font-weight:400;font-size:clamp(24px,3.2vw,34px);margin:0 0 14px;color:var(--paper)}
  .home-cta p{color:var(--paper-dim);margin:0 0 28px}
  .home-cta__row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}

  @media (max-width:900px){
    .home-mark{top:22px}
    .home-mark__sub{display:none}
    .home-bar{
      bottom:16px;left:16px;right:16px;transform:none;
      justify-content:center;flex-wrap:wrap;row-gap:10px;gap:14px;
    }
    .home-bar a svg{width:17px;height:17px}
    .home-bar a[data-tip]::after,.home-bar a[data-tip]::before{display:none}
  }
</style>
```

Note what's deliberately **removed** from the old block: the `html,body{height:100%;overflow:hidden}` fixed-viewport rule (Home now scrolls normally), and every `.panel*` rule (superseded by the shared `.accordion-strip*` classes in `effects.css`, Task 2).

- [ ] **Step 4: Replace the `<body>` content**

Replace everything from `<div class="home">` through the closing `</div>` before the first `<script>` tag with:

```html
<div class="home">
  <section class="home-hero">
    <canvas class="silk-bg"></canvas>

    <div class="home-mark">
      <span class="home-mark__row">
        <img src="img/brand/nav-mark-gold.png" alt="" class="home-mark__icon">
        <span class="home-mark__name">Mal Griot</span>
      </span>
      <span class="home-mark__sub">Sounds, spoken and sung</span>
    </div>

    <div class="home-bar">
      <a href="https://instagram.com/yep.that.malcolm" target="_blank" rel="noopener" aria-label="Instagram" data-tip="Instagram">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.014-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.014 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.898 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.898-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.165 1.051-.36 2.221-.421 1.275-.045 1.65-.06 4.859-.06zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
      </a>
      <a href="https://open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS" target="_blank" rel="noopener" aria-label="Spotify" data-tip="Spotify">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.72-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
      </a>
      <a href="https://soundcloud.com/mal-griot" target="_blank" rel="noopener" aria-label="SoundCloud" data-tip="SoundCloud">
        <svg viewBox="0 0 40 24" fill="currentColor"><path d="M1 12.6c-.1 0-.2.1-.2.2l-.6 3.4.6 3.3c.1.1.1.2.2.2s.2-.1.2-.2l.7-3.3-.7-3.4c0-.1-.1-.2-.2-.2zM4 11.4c-.1 0-.3.1-.3.3l-.5 4.5.5 4.4c0 .2.2.3.3.3s.3-.1.3-.3l.6-4.4-.6-4.5c0-.2-.2-.3-.3-.3zm3-1c-.2 0-.4.2-.4.4l-.5 5.4.5 5.2c0 .2.2.4.4.4s.4-.2.4-.4l.6-5.2-.6-5.4c0-.2-.2-.4-.4-.4zm3.2.4c-.2 0-.4.2-.4.4l-.4 5 .4 4.9c0 .3.2.5.4.5.2 0 .4-.2.4-.5l.5-4.9-.5-5c0-.2-.2-.4-.4-.4zm3.4-.7c-.3 0-.5.2-.5.5l-.4 5.6.4 4.8c0 .3.2.5.5.5.2 0 .5-.2.5-.5l.4-4.8-.4-5.6c0-.3-.3-.5-.5-.5zm3.5-.2c-.3 0-.5.2-.5.5l-.3 5.8.3 4.7c0 .3.2.5.5.5.2 0 .5-.2.5-.5l.4-4.7-.4-5.8c0-.3-.3-.5-.5-.5zm3.7 1.9c-.3 0-.6.3-.6.6l-.3 4 .3 4.6c0 .3.3.6.6.6.3 0 .5-.3.5-.6l.4-4.6-.4-4c0-.3-.2-.6-.5-.6zm2.9-2.6c-1.3 0-2.5.4-3.4 1.1-.2-4.7-4-8.5-8.8-8.5-1.1 0-2.2.2-3.2.6-.4.2-.5.3-.5.6v14.7c0 .3.3.6.6.6h15.3c3 0 5.5-2.4 5.5-5.4 0-3-2.5-5.7-5.5-5.7z"/></svg>
      </a>
      <a href="https://www.linkedin.com/in/malgriot/" target="_blank" rel="noopener" aria-label="LinkedIn" data-tip="LinkedIn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.064 2.064 0 110-4.128 2.064 2.064 0 010 4.128zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>
      </a>
      <a href="https://wa.me/917718816239" target="_blank" rel="noopener" aria-label="WhatsApp" data-tip="WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <a href="mailto:yep.that.malcolm@gmail.com" aria-label="Email" data-tip="Email">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 5.5A2.5 2.5 0 014.5 3h15A2.5 2.5 0 0122 5.5v13a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 18.5v-13zm2.2.3l7.8 6.3 7.8-6.3H4.2zM20 7.6l-7.5 6a1 1 0 01-1 0L4 7.6V18.5c0 .28.22.5.5.5h15a.5.5 0 00.5-.5V7.6z"/></svg>
      </a>
      <a href="about.html" class="home-bar__link">About</a>
      <a href="video.html" class="home-bar__link">Videos</a>
      <a href="contact.html" class="home-bar__link">Contact</a>
    </div>

    <div class="accordion-gallery" id="gallery">

      <a href="discography.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/PP_09334.JPG" alt="Mal Griot performing live" style="object-position:32% 44%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Singer · Songwriter</span>
          <span class="accordion-strip__title">Discography</span>
          <span class="accordion-strip__desc">Afro-house, funk and soul — the songs, live and streaming.</span>
        </div>
      </a>

      <a href="performances.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/MalGriot Nivid Queendom Roland 17th May 2026 by Abhishek Gupta-20260517-1850-0897.JPG" alt="Mal Griot performing live with a full band" style="object-position:50% 40%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Live</span>
          <span class="accordion-strip__title">Performances</span>
          <span class="accordion-strip__desc">Full-band sets and stripped-down rooms, wherever the sound needs to land.</span>
        </div>
      </a>

      <a href="vo.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/DSC00868.jpg" alt="Mal Griot, character portrait" style="object-position:40% 30%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Voice Acting</span>
          <span class="accordion-strip__title">VO</span>
          <span class="accordion-strip__desc">Character voice, narration, and reads that carry a story.</span>
        </div>
      </a>

      <a href="poetry.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/KGL Aug 3 2024_Marko_198.jpg" alt="Mal Griot performing spoken word on stage" style="object-position:45% 30%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Spoken Word</span>
          <span class="accordion-strip__title">Poetry</span>
          <span class="accordion-strip__desc">Words built for the room, not the page.</span>
        </div>
      </a>

      <a href="hosting.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/PP_09402.JPG" alt="Mal Griot hosting on a theater stage" style="object-position:55% 40%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">MC · Host</span>
          <span class="accordion-strip__title">Hosting</span>
          <span class="accordion-strip__desc">Holding a room, running a night, keeping the energy honest.</span>
        </div>
      </a>

      <a href="looping.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/hero-3.jpg" alt="Mal Griot seated among a wall of loop pedals" style="object-position:61% 27%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Live Looping</span>
          <span class="accordion-strip__title">Looping</span>
          <span class="accordion-strip__desc">Layers built in real time, one pedal at a time.</span>
        </div>
      </a>

      <a href="soundscapes.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/1722241513419.jpg" alt="Mal Griot, quiet portrait" style="object-position:37% 18%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Sound Design</span>
          <span class="accordion-strip__title">Soundscapes</span>
          <span class="accordion-strip__desc">Ambient and instrumental work made to sit inside a space.</span>
        </div>
      </a>

      <a href="soundbaths.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/about.jpg" alt="Mal Griot, eyes closed, close portrait" style="object-position:50% 30%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Sonorium Sessions</span>
          <span class="accordion-strip__title">Sound Baths</span>
          <span class="accordion-strip__desc">Resonant, guided sessions for the body to settle into.</span>
        </div>
      </a>

      <a href="meditations.html" class="accordion-strip reveal">
        <img class="accordion-strip__photo" src="img/1722241513433.jpg" alt="Mal Griot, seated, hands together" style="object-position:50% 25%">
        <div class="accordion-strip__scrim"></div>
        <div class="accordion-strip__content">
          <span class="accordion-strip__eyebrow">Guided Practice</span>
          <span class="accordion-strip__title">Meditations</span>
          <span class="accordion-strip__desc">Voice-led stillness, paced to breath.</span>
        </div>
      </a>

    </div>
  </section>

  <section class="home-cta reveal">
    <div class="home-cta__inner">
      <h2>The story behind the sounds.</h2>
      <p>Queens-born, Auroville-based — vocalist, spoken-word artist, MC/host, and voice actor. One voice, a lot of rooms.</p>
      <div class="home-cta__row">
        <a href="about.html" class="btn btn-light">Read the Story</a>
        <a href="contact.html" class="btn btn-outline">Get in Touch</a>
      </div>
    </div>
  </section>

  <div id="chrome-chat"></div>
</div>
```

- [ ] **Step 5: Replace the bottom `<script>` block**

Replace the entire final `<script>...</script>` block (the one currently containing the panel hover/mute logic) with:

```html
<script src="shared.js"></script>
<script src="chat.js"></script>
<script src="effects.js"></script>
<script>
  document.getElementById('chrome-chat').outerHTML = chatWidgetHtml();
  initSilk();
  initAccordionGallery();
  initScrollReveal();
</script>
```

Note: `initScrollReveal()` is called explicitly here (not left to `shared.js`'s sitewide `DOMContentLoaded` listener) because `index.html` doesn't call `renderChrome()` and its own inline script runs its setup directly — matching how this same page already directly calls `chatWidgetHtml()` itself instead of going through `renderChrome()`. `initGooeyNav()` and `initStaggeredMenu()` will also fire from `shared.js`'s listener now that `effects.js` is loaded, but both no-op safely since `index.html` has no `.site-nav` markup (unchanged from before this plan).

- [ ] **Step 6: Verify in browser — desktop**

Serve the site and open `http://localhost:4173/index.html` (or `/`). Check:
- `read_console_messages` — zero errors.
- Screenshot: confirm the Silk background is visible behind the gallery (soft brass/gold drift), the logo mark is centered at top, and 9 strips are visible in a row, grayscale by default.
- Hover the "Discography" strip: screenshot, confirm it grows and turns full color; hover "Looping": screenshot, confirm it swapped.
- Confirm the "About" and "Videos" links now appear in the home-bar alongside the existing social icons and "Contact".
- Scroll down: confirm the closing CTA band ("The story behind the sounds.") appears below the gallery, with working "Read the Story" (→ `about.html`, expected 404 for now) and "Get in Touch" (→ `contact.html`, must work) buttons.
- Click "Discography": confirm real navigation to `discography.html` (must work — this is the one real destination among the 9).

- [ ] **Step 7: Verify in browser — mobile**

`resize_window` to `mobile` preset, reload. Screenshot: confirm strips stack vertically, each collapsed to a short bar showing eyebrow + title. Tap "Discography" once: confirm it expands (taller, full color, description visible) without navigating. Tap it again: confirm it navigates to `discography.html`. Scroll to confirm the home-bar's extra links and the closing CTA band both render sanely at mobile width (no horizontal overflow — check via `javascript_tool`: `document.documentElement.scrollWidth <= window.innerWidth`).

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Rebuild index.html as a 9-strip Accordion Gallery"
```

---

### Task 4: Sitewide smoke test

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full sitewide smoke test in browser**

With the static server running, visit `index.html`, `voice.html`, `video.html`, `soundscapes.html`, `contact.html`, and `discography.html` in turn. For each: `read_console_messages` (expect zero errors — the 9 dead-link strips on Home are expected 404s on click-through, not console errors on page load), confirm nav/chrome renders correctly, and confirm nothing on the other 5 pages regressed (they weren't touched by this plan, but `index.html`'s own inline script no longer references the old `.panels` DOM, so this step exists to catch anything unexpectedly shared). Confirm `sitemap.xml`'s existing root-URL entry still matches `index.html`'s content (no change needed there — the URL itself didn't change, only the page's content).

- [ ] **Step 2: Commit** (only if Step 1 surfaces a fix)

If everything is clean, there's nothing to commit for this task — it's a verification-only gate, matching the closing task pattern already used in the previous plan (`docs/superpowers/plans/2026-08-11-griot-site-v2-foundation-and-discography.md`, Task 6).

---

## Self-Review

**Spec coverage:** Implements Section 2 of the approved design spec (Accordion Gallery, desktop + mobile behavior, Silk background) using the corrected strip count (9, not 10 — About excluded, confirmed with the user) and the user's explicit choices: build all 9 strips now pointing at final URLs (accepting 8 dead links until their own plans build them), keep Home's bespoke chrome rather than switching to the shared `site-nav`. Section 4's "per-strip signature-animation preview" is explicitly deferred (documented in Global Constraints) since 8 of 9 target pages don't have one built yet.

**Placeholder scan:** No TBD/TODO markers. All 9 strips use real photos (verified by viewing each one) and original, tone-matched copy — not invented facts, positioning copy in the site's existing voice.

**Type/signature consistency:** `initSilk(root)` and `initAccordionGallery()` both follow the same no-arg-or-optional-element, early-return-on-missing-markup convention already established by every other `effects.js` function (`initScrollReveal`, `initGooeyNav`, `initStaggeredMenu`, `initMorphSlider`, `initMetallicPaint`). `initAccordionGallery()`'s CSS class contract (`.accordion-gallery`, `.accordion-strip`, `.has-hover`, `.is-active`) is used identically in Task 2's CSS, Task 2's scratch-test markup, and Task 3's real `index.html` markup.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-12-griot-site-v2-home-accordion-gallery.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
