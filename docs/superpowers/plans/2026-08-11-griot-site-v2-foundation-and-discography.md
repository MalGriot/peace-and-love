# Griot Site v2 — Foundation & Discography Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the reusable vanilla-JS/CSS effects module (Scroll Reveal, Gooey Nav, Staggered Menu) that every future page in the v2 redesign will depend on, and build one complete sound page — Discography — end to end as proof the shared-page-template pattern works before repeating it for the other nine sound pages.

**Architecture:** Two new shared files, `effects.css` and `effects.js`, sit alongside the existing `shared.css`/`shared.js` pair and follow the exact same idiom already established by `initMiniPlayer()` in `shared.js`: every `init*()` function guards on `document.getElementById(...)` / `document.querySelector(...)` returning null, so the same script can be safely `<script src="effects.js">`-included on every page (present and future) without erroring on pages that don't have a given effect's markup. `discography.html` is a new page built on the existing per-page pattern (`<head>` boilerplate + slot divs + `renderChrome()`, copied from `contact.html`) with its own `<style>` block, consuming `effects.js` for its two new signature effects (Morph Slider, Metallic Paint) plus the sitewide baseline (Scroll Reveal, Gooey Nav, Staggered Menu).

**Tech Stack:** Plain HTML/CSS/JS, no build step, no framework, no dependencies — matches the existing site exactly. No test runner exists in this repo (confirmed: no test files anywhere in the tree), so "tests" in this plan are scripted browser-verification steps (load the page, check `read_console_messages` for errors, check `read_page`/screenshot for the expected DOM/visual state) rather than an automated test suite — the same verification method already used to build every existing page in this project.

## Global Constraints

- No build step, no bundler, no npm dependency, no framework — hand-rolled vanilla CSS/JS only (per the approved design spec, Section 5).
- Every new `init*()` function in `effects.js` must no-op safely (return early) when its target markup isn't present on the current page, matching the existing `initMiniPlayer()` guard pattern in `shared.js:141-143`.
- Preserve every existing page's current behavior — this plan does not modify `voice.html`, `soundscapes.html`, `video.html`, or `index.html`. It only adds `discography.html` and extends `shared.js`'s `links` array with one new entry.
- Palette/type tokens must come from `shared.css`'s existing `:root` (`--ink`, `--paper`, `--paper-dim`, `--paper-faint`, `--brass`, `--gold`, `--font-display`, `--font-body`) — no new colors or fonts introduced.
- Discography content (titles, release URLs, types, credits, years) must exactly match the real data already live in `voice.html:557-774` — no invented releases, no altered URLs.
- Reduced-motion: any animation loop (Morph Slider auto-advance, Metallic Paint shimmer, ember-style effects) must respect `prefers-reduced-motion: reduce`, matching the existing pattern at `shared.js:526`.

---

## File Structure

| File | Responsibility |
|---|---|
| `effects.css` (new) | All CSS for the shared effects: `.reveal` states, Gooey Nav blob/filter, Staggered Menu overlay + stagger delays, Morph Slider crossfade, Metallic Paint shimmer. |
| `effects.js` (new) | All JS for the shared effects: `initScrollReveal()`, `initGooeyNav()`, `initStaggeredMenu()`, `initMorphSlider(el)`, `initMetallicPaint(el)`. Each is called from a page's own bottom `<script>` block (or, for the two sitewide ones, from `shared.js`'s existing `DOMContentLoaded` listener). |
| `shared.js` (modify) | `links` array gets one new entry (`discography.html`); `DOMContentLoaded` listener gains two calls: `initScrollReveal()` and `initGooeyNav()`. The existing simple mobile-toggle block (lines 504-514) is replaced by a call to `initStaggeredMenu()`. |
| `shared.css` (modify) | Mobile nav rule block (`@media (max-width:760px)` at lines 109-121) is replaced — the old slide-down becomes the new full-screen Staggered Menu overlay (moved into `effects.css` instead, so this file's diff is just removing the superseded rules). |
| `discography.html` (new) | The Discography sound page: hero (Morph Slider of album covers + Metallic Paint title) + release grid (10 real releases, oEmbed cover art) + CTA band. Built on the `contact.html` boilerplate pattern. |
| `sitemap.xml` (modify) | Add a `<url>` entry for `discography.html`, matching the existing entries' format. |

---

### Task 1: Scroll Reveal baseline (`effects.css` + `effects.js` scaffold)

**Files:**
- Create: `effects.css`
- Create: `effects.js`
- Modify: `shared.js:496-520` (add two script includes' worth of init calls to the existing `DOMContentLoaded` listener)
- Modify: `contact.html` (temporary manual smoke-test target — add `.reveal` to two existing elements, verify, this is not left in as a permanent change beyond what's needed to prove the mechanism works; if you'd rather not touch `contact.html` at all, verify instead directly against `discography.html` once Task 5 exists — but Task 1 must be independently verifiable, so use `contact.html`'s existing `.c-title` and `.c-form` as the two reveal targets for this task's verification only, and leave that markup change in place since a subtle fade-in on those elements is a harmless, on-brand improvement to an existing page)

**Interfaces:**
- Produces: `initScrollReveal()` — no-arg function, finds all `.reveal` elements in the document, adds `.is-in` when 15% visible via `IntersectionObserver`, unobserves after first trigger. Any future page adds `class="reveal"` to an element and it participates automatically once `effects.js` is loaded and `initScrollReveal()` has run.

- [ ] **Step 1: Create `effects.css` with the `.reveal` states**

```css
/* MAL GRIOT — shared effects module: Scroll Reveal, Gooey Nav, Staggered
   Menu, and per-page signature effects (Morph Slider, Metallic Paint, ...).
   Loaded via <script src="effects.js"> after shared.js on every page that
   uses any of these; each effect's init() no-ops if its markup isn't present. */

.reveal{
  opacity:0;
  transform:translateY(16px);
  transition:opacity .7s ease, transform .7s ease;
}
.reveal.is-in{opacity:1;transform:translateY(0)}

@media (prefers-reduced-motion: reduce){
  .reveal{opacity:1;transform:none;transition:none}
}
```

- [ ] **Step 2: Create `effects.js` with `initScrollReveal()`**

```js
// MAL GRIOT — shared effects module. Every init*() here follows the same
// guard idiom as initMiniPlayer() in shared.js: find the target markup,
// return early if it's not on this page, so effects.js can be safely
// included on every page without erroring where an effect isn't used.

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}
```

- [ ] **Step 3: Wire `effects.css`/`effects.js` into `contact.html` and call `initScrollReveal()`**

In `contact.html`, add the stylesheet link right after the existing `shared.css` link (line 40):

```html
<link rel="stylesheet" href="shared.css">
<link rel="stylesheet" href="effects.css">
```

Add `class="reveal"` to the two verification targets — the `<h1 class="c-title">` (line 99) becomes:

```html
<h1 class="c-title reveal">Reach Out</h1>
```

and the `<form class="c-form" id="contactForm">` (line 108) becomes:

```html
<form class="c-form reveal" id="contactForm">
```

Add the script include and init call right after the existing `shared.js`/`chat.js`/`renderChrome` scripts (after line 179):

```html
<script src="shared.js"></script>
<script src="chat.js"></script>
<script src="effects.js"></script>
<script>renderChrome('contact');</script>
<script>initScrollReveal();</script>
```

- [ ] **Step 4: Verify in browser**

Start a static server and open `contact.html`:

```bash
cd "MAL GRIOT TRIFOLD WEBSITE" && npx serve . -l 4173
```

Open `http://localhost:4173/contact.html` in the browser tool. Check `read_console_messages` — expect zero errors. Reload the page and confirm via `computer` screenshot or `read_page` that the "Reach Out" heading and the form fade/slide into view shortly after load rather than being visible instantly (visible confirmation: take a screenshot within the first ~100ms of navigation if possible, otherwise confirm the `.is-in` class is present on both elements after load via `javascript_tool`: `document.querySelector('.c-title').classList.contains('is-in')` should return `true`).

- [ ] **Step 5: Commit**

```bash
git add effects.css effects.js contact.html
git commit -m "Add Scroll Reveal effect as the shared effects module baseline"
```

---

### Task 2: Gooey Nav (desktop nav link hover)

**Files:**
- Modify: `effects.css` (append Gooey Nav styles)
- Modify: `effects.js` (append `initGooeyNav()`)
- Modify: `shared.js:496-520` (call `initGooeyNav()` from the existing `DOMContentLoaded` listener, guarded so it only runs where `effects.js` is loaded)
- Modify: `contact.html` (add `effects.js` script include + call `initGooeyNav()`, alongside the Task 1 wiring)

**Interfaces:**
- Consumes: the existing `.site-nav__links` markup rendered by `renderChrome()` in `shared.js:14-21` (a `<ul class="site-nav__links">` of `<a>` tags) — no markup changes to `shared.js`'s `navHtml` template are needed; `initGooeyNav()` augments the rendered nav at runtime.
- Produces: `initGooeyNav()` — no-arg function, no-ops if `.site-nav__links` isn't found (matches pages without chrome, e.g. `index.html`).

- [ ] **Step 1: Append the Gooey Nav CSS to `effects.css`**

```css
/* ---------- Gooey Nav (desktop nav-link hover) ----------
   A blurred, high-contrast blob (.gooey-blob) tracks the hovered link's
   bounding box and is rendered through an SVG "goo" filter (feGaussianBlur
   + feColorMatrix contrast boost) so its edges visually merge with the pill
   highlight sitting underneath the active link, rather than looking like a
   separate rectangle. Desktop only — .site-nav__links collapses to the
   full-screen Staggered Menu below 760px (see Task 3), where this blob
   never appears. */
.site-nav__links{position:relative}
.gooey-nav__wrap{position:absolute;inset:-14px -10px;pointer-events:none;filter:url(#gooey-nav-filter);z-index:-1}
.gooey-blob{
  position:absolute;top:0;left:0;height:100%;border-radius:999px;
  background:rgba(201,138,69,.28);
  opacity:0;
  transition:transform .35s cubic-bezier(.22,.9,.3,1), width .35s cubic-bezier(.22,.9,.3,1), opacity .2s ease;
}
.gooey-blob.is-visible{opacity:1}

@media (max-width:760px){
  .gooey-nav__wrap{display:none}
}
```

- [ ] **Step 2: Append `initGooeyNav()` to `effects.js`**

```js
// ---------- Gooey Nav ----------
// Injects an SVG goo filter (once, into <body>) plus a tracking blob behind
// .site-nav__links, and moves the blob to whichever link is hovered/focused.
// No-ops on pages without .site-nav__links (chrome not rendered / index.html).
function initGooeyNav() {
  const list = document.querySelector('.site-nav__links');
  if (!list) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!document.getElementById('gooey-nav-filter')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `
      <filter id="gooey-nav-filter">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/>
        <feColorMatrix in="blur" mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo"/>
      </filter>`;
    document.body.appendChild(svg);
  }

  const wrap = document.createElement('div');
  wrap.className = 'gooey-nav__wrap';
  wrap.innerHTML = '<div class="gooey-blob"></div>';
  list.appendChild(wrap);
  const blob = wrap.querySelector('.gooey-blob');

  function moveTo(link) {
    const listRect = list.getBoundingClientRect();
    const rect = link.getBoundingClientRect();
    blob.style.width = rect.width + 'px';
    blob.style.transform = `translateX(${rect.left - listRect.left}px)`;
    blob.classList.add('is-visible');
  }

  list.querySelectorAll('a').forEach((a) => {
    a.addEventListener('mouseenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  list.addEventListener('mouseleave', () => blob.classList.remove('is-visible'));
}
```

- [ ] **Step 3: Wire the call site**

In `shared.js`, inside the existing `DOMContentLoaded` listener (around line 516-519), add the call next to the other init calls:

```js
  initChat();
  initMiniPlayer();
  initAnimatedFavicon();
  initEmberField();
  if (typeof initGooeyNav === 'function') initGooeyNav();
  if (typeof initScrollReveal === 'function') initScrollReveal();
```

(The `typeof` guard means pages that don't include `effects.js` — none currently, but this keeps `shared.js` from throwing if a future page omits it — simply skip both calls.) Since this now calls `initScrollReveal()` from `shared.js` itself, remove the redundant standalone `<script>initScrollReveal();</script>` call added to `contact.html` in Task 1 Step 3 — `renderChrome()` plus `shared.js`'s own `DOMContentLoaded` listener now covers it on every page that includes both `shared.js` and `effects.js`, which is simpler than each page calling it separately.

- [ ] **Step 4: Verify in browser**

Reload `http://localhost:4173/contact.html`. Use `read_page` to get `ref`s for two nav links, then `computer` `hover` over the first, screenshot, then `hover` over the second and screenshot — confirm the blurred blob visibly moves and resizes between the two links. Check `read_console_messages` for zero errors.

- [ ] **Step 5: Commit**

```bash
git add effects.css effects.js shared.js contact.html
git commit -m "Add Gooey Nav hover effect to the desktop nav"
```

---

### Task 3: Staggered Menu (mobile full-screen nav)

**Files:**
- Modify: `shared.css:109-121` (delete the existing mobile slide-down rule block — superseded)
- Modify: `effects.css` (append the Staggered Menu overlay + per-link stagger-delay rules)
- Modify: `effects.js` (append `initStaggeredMenu()`)
- Modify: `shared.js:504-514` (replace the existing simple toggle listener with a call to `initStaggeredMenu()`)

**Interfaces:**
- Consumes: `.site-nav__toggle` button and `.site-nav__links` list, both already rendered by `renderChrome()` (`shared.js:14-21`) — no markup changes.
- Produces: `initStaggeredMenu()` — no-arg function, no-ops if `.site-nav__toggle` isn't found.

- [ ] **Step 1: Delete the superseded mobile nav CSS from `shared.css`**

Remove lines 109-121 (the `@media (max-width:760px){ .site-nav__links{...} ... }` block) from `shared.css` entirely — replaced by Step 2 below in `effects.css`.

- [ ] **Step 2: Append the Staggered Menu CSS to `effects.css`**

```css
/* ---------- Staggered Menu (mobile full-screen nav) ----------
   Below 760px, .site-nav__links becomes a full-screen overlay. Opening it
   (via .is-open on the list, toggled by initStaggeredMenu()) staggers each
   link in with an increasing transition-delay per nth-child, rather than
   the whole list appearing at once. */
@media (max-width:760px){
  .site-nav__toggle{display:block;z-index:101}
  .site-nav__links{
    position:fixed;inset:0;
    background:rgba(8,7,6,.98);
    display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px;
    opacity:0;pointer-events:none;
    transition:opacity .3s ease;
  }
  .site-nav__links.is-open{opacity:1;pointer-events:auto}
  .site-nav__links a{
    font-size:20px;
    opacity:0;transform:translateY(18px);
    transition:opacity .4s ease, transform .4s ease;
    transition-delay:0s;
  }
  .site-nav__links.is-open a{opacity:1;transform:translateY(0)}
  .site-nav__links.is-open a:nth-child(1){transition-delay:.05s}
  .site-nav__links.is-open a:nth-child(2){transition-delay:.1s}
  .site-nav__links.is-open a:nth-child(3){transition-delay:.15s}
  .site-nav__links.is-open a:nth-child(4){transition-delay:.2s}
  .site-nav__links.is-open a:nth-child(5){transition-delay:.25s}
}

@media (max-width:760px) and (prefers-reduced-motion: reduce){
  .site-nav__links,.site-nav__links a{transition:none}
}
```

- [ ] **Step 3: Append `initStaggeredMenu()` to `effects.js`**

```js
// ---------- Staggered Menu ----------
// Replaces the old plain slide-down toggle: opens .site-nav__links as a
// full-screen overlay (see effects.css) and closes it on link click or Esc.
function initStaggeredMenu() {
  const toggle = document.querySelector('.site-nav__toggle');
  const list = document.querySelector('.site-nav__links');
  if (!toggle || !list) return;

  function setOpen(open) {
    list.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => setOpen(!list.classList.contains('is-open')));
  list.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}
```

- [ ] **Step 4: Replace the old toggle wiring in `shared.js`**

Replace the existing block at `shared.js:504-514`:

```js
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
```

with:

```js
  if (typeof initStaggeredMenu === 'function') initStaggeredMenu();
```

- [ ] **Step 5: Verify in browser**

`resize_window` to the `mobile` preset, reload `http://localhost:4173/contact.html`. Screenshot — confirm the hamburger toggle is visible and the link list is not. `computer` `left_click` the toggle, screenshot — confirm a full-screen dark overlay appears with nav links staggered in (visibly offset opacity/position if captured mid-transition, fully visible after). Click a link (e.g. "Contact" itself, or navigate to it) and confirm the overlay closes / navigation occurs. Check `read_console_messages` for zero errors. Resize back to `desktop` preset afterward and confirm the desktop nav (including the Task 2 Gooey blob) still works.

- [ ] **Step 6: Commit**

```bash
git add shared.css effects.css effects.js shared.js
git commit -m "Replace mobile nav slide-down with full-screen Staggered Menu"
```

---

### Task 4: Register `discography.html` in the shared nav

**Files:**
- Modify: `shared.js:4-9` (the `links` array inside `renderChrome()`)

**Interfaces:**
- Consumes: nothing new.
- Produces: nav/footer link list now includes Discography, so both `renderChrome()` call sites (all satellite pages) and the soon-to-exist `discography.html` share one source of truth.

- [ ] **Step 1: Add the new entry**

In `shared.js`, change:

```js
  const links = [
    ['voice.html', 'Voice', 'music'],
    ['video.html', 'Video', 'cuts'],
    ['soundscapes.html', 'Soundscapes', 'wellness'],
    ['contact.html', 'Contact', 'contact'],
  ];
```

to:

```js
  const links = [
    ['voice.html', 'Voice', 'music'],
    ['discography.html', 'Discography', 'discography'],
    ['video.html', 'Video', 'cuts'],
    ['soundscapes.html', 'Soundscapes', 'wellness'],
    ['contact.html', 'Contact', 'contact'],
  ];
```

(This grows the desktop nav to 5 items and the Staggered Menu CSS from Task 3 already covers up to 5 `nth-child` stagger delays, so no further CSS change is needed. A later plan, once `about.html` and the Home accordion rebuild land, will revisit this array and trim it down per the design spec's nav model — out of scope here.)

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:4173/contact.html`. `read_page` and confirm a "Discography" link now appears in both the nav and footer link lists, pointing at `discography.html` (which 404s until Task 5 — that's expected and fine at this checkpoint).

- [ ] **Step 3: Commit**

```bash
git add shared.js
git commit -m "Register discography.html in the shared nav/footer link list"
```

---

### Task 5: Build `discography.html`

**Files:**
- Create: `discography.html`
- Modify: `effects.css` (append Morph Slider + Metallic Paint styles)
- Modify: `effects.js` (append `initMorphSlider()` + `initMetallicPaint()`)

**Interfaces:**
- Consumes: `renderChrome('discography')` from `shared.js`; `initScrollReveal()`, `initGooeyNav()`, `initStaggeredMenu()` from `effects.js` (all already wired sitewide via `shared.js`'s `DOMContentLoaded` listener as of Task 2/3); `chatWidgetHtml()` from `shared.js` (via the `#chrome-chat` slot, same as every other satellite page).
- Produces: `initMorphSlider(el)` — takes a container element with `data-slides` (comma-separated image URLs), crossfades between them on an interval. `initMetallicPaint(el)` — takes a heading element, adds the shimmer class/animation.

- [ ] **Step 1: Append Morph Slider CSS to `effects.css`**

```css
/* ---------- Morph Slider (Discography hero: album-cover crossfade) ---------- */
.morph-slider{position:relative;width:100%;height:100%;overflow:hidden;border-radius:18px}
.morph-slider__slide{
  position:absolute;inset:0;background-size:cover;background-position:center;
  opacity:0;transform:scale(1.06);
  transition:opacity 1.4s ease, transform 6s ease;
}
.morph-slider__slide.is-active{opacity:1;transform:scale(1)}

@media (prefers-reduced-motion: reduce){
  .morph-slider__slide{transition:opacity .3s ease}
}
```

- [ ] **Step 2: Append Metallic Paint CSS to `effects.css`**

```css
/* ---------- Metallic Paint (shimmering gold page-title sheen) ---------- */
.metallic-paint{
  background:linear-gradient(100deg, var(--brass) 20%, var(--gold) 40%, #fff6df 50%, var(--gold) 60%, var(--brass) 80%);
  background-size:220% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:metallic-sheen 5s ease-in-out infinite;
}
@keyframes metallic-sheen{
  0%{background-position:0% 50%}
  100%{background-position:220% 50%}
}
@media (prefers-reduced-motion: reduce){
  .metallic-paint{animation:none;background-position:60% 50%}
}
```

- [ ] **Step 3: Append `initMorphSlider()` and `initMetallicPaint()` to `effects.js`**

```js
// ---------- Morph Slider ----------
// Reads comma-separated image URLs from data-slides on the container,
// builds one absolutely-positioned .morph-slider__slide per image, and
// crossfades between them on a fixed interval. No-ops without .morph-slider.
function initMorphSlider(root) {
  const el = root || document.querySelector('.morph-slider');
  if (!el) return;
  const urls = (el.dataset.slides || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!urls.length) return;

  el.innerHTML = '';
  urls.forEach((url) => {
    const slide = document.createElement('div');
    slide.className = 'morph-slider__slide';
    slide.style.backgroundImage = `url("${url}")`;
    el.appendChild(slide);
  });
  const slides = el.querySelectorAll('.morph-slider__slide');
  slides[0].classList.add('is-active');
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let i = 0;
  setInterval(() => {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
  }, 3200);
}

// ---------- Metallic Paint ----------
// Adds the shimmering gradient-text class to the given element (or every
// [data-metallic-paint] element found). No-ops if none are present.
function initMetallicPaint(root) {
  const els = root ? [root] : document.querySelectorAll('[data-metallic-paint]');
  els.forEach((el) => el.classList.add('metallic-paint'));
}
```

- [ ] **Step 4: Create `discography.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Discography — Mal Griot</title>
<meta name="description" content="Mal Griot's discography — albums and EPs across SoundCloud and Spotify.">
<meta property="og:title" content="Discography — Mal Griot">
<meta property="og:description" content="Mal Griot's discography — albums and EPs across SoundCloud and Spotify.">
<meta property="og:image" content="https://malgriot.github.io/peace-and-love/img/og/share-contact.png">
<meta property="og:url" content="https://malgriot.github.io/peace-and-love/discography.html">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://malgriot.github.io/peace-and-love/img/og/share-contact.png">
<link rel="canonical" href="https://malgriot.github.io/peace-and-love/discography.html">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Mal Griot",
  "alternateName": "MAL GRIOT",
  "jobTitle": "Vocalist, Spoken-Word Artist, MC/Host, Voice Actor",
  "url": "https://malgriot.github.io/peace-and-love/",
  "image": "https://malgriot.github.io/peace-and-love/img/og/share-contact.png",
  "sameAs": [
    "https://instagram.com/yep.that.malcolm",
    "https://www.linkedin.com/in/malgriot/",
    "https://open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS",
    "https://soundcloud.com/mal-griot",
    "https://music.apple.com/us/artist/mal-griot/1773454818",
    "https://music.youtube.com/channel/UC2ouYdd3qmP9vSvLpKD8-CQ",
    "https://music.amazon.com/artists/B0DTP5MFVP/mal-griot",
    "https://tidal.com/artist/53475605",
    "https://www.youtube.com/@MalGriot"
  ]
}
</script>
<link rel="icon" href="img/brand/favicon.ico">
<link rel="apple-touch-icon" href="img/brand/apple-touch-icon.png">
<link rel="stylesheet" href="shared.css">
<link rel="stylesheet" href="effects.css">
<style>
  .d-hero{min-height:70vh;display:flex;align-items:center;padding:130px clamp(20px,5vw,64px) 60px}
  .d-hero__grid{width:100%;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 340px;gap:56px;align-items:center}
  .d-eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--brass);margin-bottom:16px;display:block}
  .d-title{font-family:var(--font-display);font-weight:400;font-size:clamp(40px,6vw,72px);margin:0 0 20px}
  .d-desc{font-size:15.5px;line-height:1.7;color:var(--paper-dim);max-width:46ch}
  .d-hero__art{width:100%;aspect-ratio:1/1}
  @media (max-width:900px){.d-hero__grid{grid-template-columns:1fr}.d-hero__art{max-width:320px;margin:0 auto}}

  .d-releases{padding:20px clamp(20px,5vw,64px) 100px;max-width:1200px;margin:0 auto}
  .d-releases__head{padding:40px 0 30px;border-bottom:1px solid rgba(239,230,216,.1)}
  .d-releases__head h2{font-family:var(--font-display);font-weight:400;font-size:clamp(24px,2.6vw,32px);margin:0}
  .d-release{
    display:grid;grid-template-columns:56px 64px 1fr auto;align-items:center;gap:18px;
    padding:20px 4px;border-bottom:1px solid rgba(239,230,216,.08);
    text-decoration:none;color:inherit;
  }
  .d-release__year{font-family:var(--font-display);font-size:14px;color:var(--paper-dim)}
  .d-release__art{width:64px;height:64px;border-radius:8px;object-fit:cover;background:rgba(239,230,216,.06)}
  .d-release__title{font-family:var(--font-display);font-weight:400;font-size:clamp(17px,2vw,22px);margin:0 0 4px;transition:color .25s ease}
  .d-release:hover .d-release__title{color:var(--brass)}
  .d-release__meta{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--paper-dim)}
  .d-release__credits{font-size:12px;color:var(--paper-faint);margin-top:2px}
  .d-release__play{color:var(--paper-dim);flex-shrink:0}
  .d-release:hover .d-release__play{color:var(--brass)}
  @media (max-width:640px){
    .d-release{grid-template-columns:40px 48px 1fr;grid-template-areas:"year art title" "year art title";gap:12px}
    .d-release__play{display:none}
  }

  .d-cta{padding:0 clamp(20px,5vw,64px) 120px;max-width:1200px;margin:0 auto;text-align:center}
  .d-cta__inner{background:#1c1815;border:1px solid rgba(239,230,216,.1);border-radius:20px;padding:56px 32px}
  .d-cta h2{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3.4vw,36px);margin:0 0 14px}
  .d-cta p{color:var(--paper-dim);margin:0 0 28px}
  .d-cta__row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
</style>
</head>
<body>

<div id="chrome-nav"></div>

<section class="d-hero">
  <div class="d-hero__grid">
    <div class="reveal">
      <span class="d-eyebrow">Discography</span>
      <h1 class="d-title" data-metallic-paint>Ten releases, one throughline.</h1>
      <p class="d-desc">Afro-house, funk, and soul across SoundCloud and Spotify — solo work and collaborations with producers and labels around the world.</p>
    </div>
    <div class="d-hero__art reveal">
      <div class="morph-slider" data-slides="https://images.pexels.com/photos/9257184/pexels-photo-9257184.jpeg?cs=tinysrgb&dpr=2&w=600,https://images.pexels.com/photos/13532875/pexels-photo-13532875.jpeg?cs=tinysrgb&dpr=2&w=600,https://images.pexels.com/photos/9258252/pexels-photo-9258252.jpeg?cs=tinysrgb&dpr=2&w=600,https://images.pexels.com/photos/16944874/pexels-photo-16944874/free-photo-of-vinyl-records-collection.jpeg?cs=tinysrgb&dpr=2&w=600"></div>
    </div>
  </div>
</section>

<section class="d-releases">
  <div class="d-releases__head reveal"><h2>All Releases</h2></div>

  <a class="d-release reveal" href="https://soundcloud.com/mal-griot/sets/breathelovedeep" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title"><span class="nb">breathe love d e e p</span></h3>
      <span class="d-release__meta">Album · SoundCloud</span>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://open.spotify.com/track/5uvEb58GBUWOo8bfxhCy8v" target="_blank" rel="noopener">
    <span class="d-release__year">2025</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">I Tried It</h3>
      <span class="d-release__meta">Album · Spotify</span>
      <div class="d-release__credits">Mal Griot &amp; Unnayanaa — Wind Horse Records</div>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://open.spotify.com/album/2IHKGSoXq9EUbaomNYdG88" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">The Call of the Jungle (Overmind)</h3>
      <span class="d-release__meta">EP · Spotify</span>
      <div class="d-release__credits">Mal Griot &amp; Diveakssh Schae — Diveakssh Schae Records</div>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://open.spotify.com/album/0mG2qACRHS8sHoyiniieFp" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">Free Fall</h3>
      <span class="d-release__meta">EP · Spotify</span>
      <div class="d-release__credits">Mal Griot &amp; Stalvart John — Dynamite Disco Club</div>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://open.spotify.com/track/3u1kmOSbXQtWsYg3q8KFMj" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">Helicopter Man</h3>
      <span class="d-release__meta">EP · Spotify</span>
      <div class="d-release__credits">Mal Griot &amp; Deep Dawn — Hangar 18 Studio</div>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://open.spotify.com/album/6oilUaIrr7oAbkiXLKc00h" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">Toxic Baby</h3>
      <span class="d-release__meta">EP · Spotify</span>
      <div class="d-release__credits">Mal Griot &amp; Deep Dawn — Hangar 18 Studio</div>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://soundcloud.com/mal-griot/sets/truly-higher" target="_blank" rel="noopener">
    <span class="d-release__year">2025</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">Truly Higher</h3>
      <span class="d-release__meta">EP · SoundCloud</span>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://soundcloud.com/mal-griot/sets/sun-burna" target="_blank" rel="noopener">
    <span class="d-release__year">2026</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">Sun Burna</h3>
      <span class="d-release__meta">EP · SoundCloud</span>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://soundcloud.com/mal-griot/sets/sumthn" target="_blank" rel="noopener">
    <span class="d-release__year">2025</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">sumthn</h3>
      <span class="d-release__meta">EP · SoundCloud</span>
    </div>
    <span class="d-release__play">▶</span>
  </a>

  <a class="d-release reveal" href="https://soundcloud.com/mal-griot/sets/periodyssius" target="_blank" rel="noopener">
    <span class="d-release__year">2025</span>
    <img class="d-release__art" alt="" data-oembed-art>
    <div>
      <h3 class="d-release__title">PeRiOdYsSiUs</h3>
      <span class="d-release__meta">Album · SoundCloud</span>
    </div>
    <span class="d-release__play">▶</span>
  </a>
</section>

<section class="d-cta reveal">
  <div class="d-cta__inner">
    <h2>Hear it, or book the voice behind it.</h2>
    <p>Stream everything above, or get in touch about a session or a show.</p>
    <div class="d-cta__row">
      <a href="https://soundcloud.com/mal-griot" target="_blank" rel="noopener" class="btn btn-light">Open on SoundCloud</a>
      <a href="contact.html" class="btn btn-outline">Get in Touch</a>
    </div>
  </div>
</section>

<div id="chrome-footer"></div>
<div id="chrome-chat"></div>
<div id="chrome-player"></div>

<script src="shared.js"></script>
<script src="chat.js"></script>
<script src="effects.js"></script>
<script>renderChrome('discography');</script>
<script>
  initMorphSlider();
  initMetallicPaint();

  // Pull real cover art for each release the same way voice.html does
  // (soundcloud.com/oembed and open.spotify.com/oembed are both CORS-open,
  // no API key needed): fall back silently to no image if the fetch fails.
  document.querySelectorAll('.d-release[data-oembed-art], .d-release').forEach((link) => {
    const img = link.querySelector('[data-oembed-art]');
    if (!img) return;
    const isSoundCloud = link.href.indexOf('soundcloud.com') !== -1;
    const base = isSoundCloud
      ? 'https://soundcloud.com/oembed?format=json&url='
      : 'https://open.spotify.com/oembed?url=';
    fetch(base + encodeURIComponent(link.href))
      .then((res) => res.json())
      .then((data) => {
        if (data && data.thumbnail_url) img.src = data.thumbnail_url;
      })
      .catch(() => {});
  });
</script>
</body>
</html>
```

- [ ] **Step 5: Verify in browser**

Reload the server if needed and open `http://localhost:4173/discography.html`. Check:
- `read_console_messages` — zero errors.
- `read_network_requests` filtered to `oembed` — confirm requests to `soundcloud.com/oembed` and `open.spotify.com/oembed` return 200s and the release rows populate real cover art (screenshot to confirm images aren't broken/blank).
- The hero title reads with a visible gold shimmer sweep (screenshot; a static screenshot may only catch one frame of the sweep, so also confirm via `javascript_tool`: `getComputedStyle(document.querySelector('.d-title')).webkitBackgroundClip === 'text'`).
- The hero art panel crossfades between at least two of the four `data-slides` images if you wait ~4 seconds between two screenshots.
- `resize_window` to `mobile`, confirm the release grid collapses to the 3-column compact layout and nothing overflows horizontally.
- Click "Get in Touch" and confirm it navigates to `contact.html`.
- Confirm the nav shows "Discography" as the active link (`.is-active` class, per `read_page`).

- [ ] **Step 6: Commit**

```bash
git add discography.html effects.css effects.js
git commit -m "Add discography.html — the first sound page on the shared template"
```

---

### Task 6: Sitemap + final sitewide smoke test

**Files:**
- Modify: `sitemap.xml` (add the `discography.html` entry, matching existing entries' format)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks — this is the plan's closing verification task.

- [ ] **Step 1: Read the existing `sitemap.xml` entry format and add one for `discography.html`**

Open `sitemap.xml`, find the `<url>` entry for `contact.html`, and add an equivalent entry for `discography.html` immediately after it, matching the same `<lastmod>`/`<changefreq>`/`<priority>` conventions already used by the other satellite pages (do not invent a different priority tier — copy the existing satellite-page values exactly).

- [ ] **Step 2: Full sitewide smoke test in browser**

With the static server still running, visit each of `index.html`, `voice.html`, `video.html`, `soundscapes.html`, `contact.html`, and `discography.html` in turn. For each: `read_console_messages` (expect zero errors), confirm the nav renders (desktop) and the Staggered Menu opens/closes correctly (mobile preset), and confirm the mini-player still appears/behaves per its existing rules (visible by default only on `voice.html`, or on any page once activated via `localStorage`). This confirms Tasks 1-5 didn't regress any existing page.

- [ ] **Step 3: Commit**

```bash
git add sitemap.xml
git commit -m "Add discography.html to sitemap.xml"
```

---

## Self-Review

**Spec coverage:** This plan implements the "Foundation" slice of the approved design spec (Section 4's Gooey Nav, Staggered Menu, Scroll Reveal) plus one full sound page on the Section 3 template (Section 4's Discography row: Morph Slider + Metallic Paint), using the real Section 5 content-sourcing rule (Discography data taken verbatim from `voice.html`). It intentionally does not cover: the other nine sound pages, the Home accordion gallery rebuild, the nav trim to About/Cuts/Contact, or `voice.html` retirement — all explicitly deferred to follow-up plans per the phasing decision made before writing this plan (the full 1400-line `voice.html` split and the accordion-gallery home rebuild are each substantial enough to warrant their own reviewable plan).

**Placeholder scan:** No TBD/TODO markers. All copy is either real (release titles/URLs/credits/years, sourced verbatim from `voice.html`) or clearly-scoped original copy for the new hero/CTA sections (not presented as fact — it's positioning copy, not a claim about specific bookings/testimonials).

**Type/signature consistency:** `initScrollReveal()`, `initGooeyNav()`, `initStaggeredMenu()` are all no-arg and called identically from `shared.js`'s `DOMContentLoaded` listener (Tasks 1-3). `initMorphSlider(root)` and `initMetallicPaint(root)` both accept an optional element and fall back to a `document.querySelector`/`querySelectorAll` default, matching each other's calling convention in Task 5's inline script.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-griot-site-v2-foundation-and-discography.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
