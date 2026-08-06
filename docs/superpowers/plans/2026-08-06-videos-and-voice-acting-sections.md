# Videos & Performances + Voice Acting Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Videos & Performances" section (3 fixed YouTube embeds) directly below the About section, and a "Voice Acting" section (embedded Spotify show player) directly after it, on `music.html`.

**Architecture:** Single static HTML file (`music.html`) with inline `<style>` and `<script>` blocks — no build step, no test runner. This is a static marketing site; "tests" here mean visual/functional verification in a browser via the Browser preview tools, not automated unit tests.

**Tech Stack:** Plain HTML/CSS/vanilla JS, no frameworks. YouTube `youtube-nocookie.com` iframe embeds. Spotify `open.spotify.com/embed` iframe.

## Global Constraints
- Follow existing section markup pattern: `<span class="X__eyebrow">`, `<h2 class="X__title">`, optional `<p class="X__desc">`, content, then `<a class="btn btn-outline">` outbound CTA — copied verbatim from `.follow`/`.ytfeed` sections in `music.html`.
- Preserve existing site visual language (colors via CSS custom properties already defined elsewhere in the file: `--brass`, `--paper`, `--paper-dim`, `--paper-faint`).
- No new dependencies, no build tooling.

---

### Task 1: Repurpose `.ytfeed` into a static "Videos & Performances" 3-up grid, moved below About

**Files:**
- Modify: `music.html:376-416` (CSS: `.ytfeed` rules)
- Modify: `music.html:791-815` (HTML: remove old `.ytfeed` section from after `.follow`, insert new version directly after `</section>` that closes `.about`, i.e. after line 791)
- Modify: `music.html:1136-1220` (JS: remove the YouTube Data API fetch/carousel script — approximate line range, confirm by searching for the `ytfeed` comment block and its enclosing `<script>...</script>`)

**Interfaces:**
- Produces: a `<section class="videos" id="videos">` with three `.videos__card` iframe embeds. No JS dependency — later tasks don't consume anything from this one.

- [ ] **Step 1: Replace `.ytfeed` CSS block with `.videos` grid CSS**

Find the CSS block starting at `/* ---- ytfeed: youtube embedded video carousel ---- */` (music.html:376) and ending right before `/* ---- booking CTA ---- */` (music.html:418, i.e. through the `@media (max-width:600px){ .ytfeed__nav{display:none} }` block at line 414-416). Replace the entire block with:

```css
  /* ---- videos: fixed youtube embeds grid ---- */
  .videos{
    padding:20px clamp(20px,5vw,64px) 120px;text-align:center;
  }
  .videos__eyebrow{color:var(--brass);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
  .videos__title{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3vw,38px);margin:10px 0 34px}
  .videos__grid{
    display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1100px;margin:0 auto 30px;
  }
  .videos__card{
    aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:rgba(239,230,216,.06);
  }
  .videos__card iframe{width:100%;height:100%;border:0;display:block}
  @media (max-width:820px){
    .videos__grid{grid-template-columns:1fr}
  }
```

- [ ] **Step 2: Remove the old `.ytfeed` HTML section and insert the new `.videos` section below About**

Delete this block (music.html:805-815):

```html
<section class="ytfeed" id="ytfeed">
  <span class="ytfeed__eyebrow">On YouTube</span>
  <h2 class="ytfeed__title">Latest videos</h2>
  <div class="ytfeed__carousel" id="ytCarousel">
    <button type="button" class="ytfeed__nav ytfeed__nav--prev" id="ytPrev" aria-label="Previous video">&#8249;</button>
    <div class="ytfeed__track" id="ytTrack"></div>
    <button type="button" class="ytfeed__nav ytfeed__nav--next" id="ytNext" aria-label="Next video">&#8250;</button>
  </div>
  <div class="ytfeed__dots" id="ytDots"></div>
  <a href="https://www.youtube.com/@MalGriot" target="_blank" rel="noopener" class="btn btn-outline">Watch on YouTube</a>
</section>
```

Immediately after the `</section>` that closes `.about` (music.html:791, right before `<section class="follow">`), insert:

```html
<section class="videos" id="videos">
  <span class="videos__eyebrow">Watch</span>
  <h2 class="videos__title">Videos &amp; Performances</h2>
  <div class="videos__grid">
    <div class="videos__card"><iframe src="https://www.youtube-nocookie.com/embed/wBonF3kFFPU" title="Mal Griot video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
    <div class="videos__card"><iframe src="https://www.youtube-nocookie.com/embed/NkaRBHImjSo" title="Mal Griot video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
    <div class="videos__card"><iframe src="https://www.youtube-nocookie.com/embed/P9NWy271OAs" title="Mal Griot video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
  </div>
  <a href="https://www.youtube.com/@MalGriot" target="_blank" rel="noopener" class="btn btn-outline">Watch on YouTube</a>
</section>
```

- [ ] **Step 3: Remove the now-dead YouTube Data API fetch script**

Search `music.html` for the comment `/* ---- ytfeed: youtube embedded video carousel ---- */`'s companion script — the `<script>` block containing `YOUTUBE_API_KEY`, `YOUTUBE_HANDLE`, `MAX_VIDEOS`, and the `fetch(apiBase + 'channels?...` calls (originally around music.html:1136-1220, an IIFE `(function(){ ... })();`). Delete the entire `<script>...</script>` block containing this IIFE. Do not touch the adjacent `<script>` block that starts with the "Discography track popups" comment — that one stays.

- [ ] **Step 4: Verify in browser**

Use the Browser preview tools: `preview_start` with `{url: "file://<absolute path to music.html>"}`, then `read_page` to confirm a `Videos & Performances` heading appears directly below the About section's EPK/socials footer, with 3 embedded iframes in a row (or stacked on narrow viewport via `resize_window`). Confirm no `.ytfeed` or `ytCarousel` elements remain (`find` query for "ytfeed" should return nothing), and check `read_console_messages` for JS errors.

- [ ] **Step 5: Commit**

```bash
git add music.html
git commit -m "Move video section below About, replace auto-pull carousel with 3 fixed embeds"
```

---

### Task 2: Add "Voice Acting" section with embedded Spotify show player

**Files:**
- Modify: `music.html` (CSS: add new `.voiceacting` rules near the `.videos` rules added in Task 1)
- Modify: `music.html` (HTML: insert new section directly after the `.videos` section closes, before `<section class="follow">`)

**Interfaces:**
- Consumes: nothing from Task 1 (independent section, just adjacent in page order).
- Produces: `<section class="voiceacting" id="voiceacting">` — terminal task, nothing downstream depends on it.

- [ ] **Step 1: Add `.voiceacting` CSS**

Insert directly after the `.videos` CSS block added in Task 1 Step 1 (i.e. right before `/* ---- booking CTA ---- */`):

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

- [ ] **Step 2: Insert `.voiceacting` HTML section after `.videos`**

Directly after the `</section>` that closes the `.videos` section (added in Task 1 Step 2), before `<section class="follow">`, insert:

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

- [ ] **Step 3: Verify in browser**

Reload the page in the Browser preview. Confirm a "Voice Acting" section appears directly after "Videos & Performances" and before the Instagram "Follow along" section, with the Spotify embed rendering (check `read_network_requests` for a successful load of the `open.spotify.com/embed/show/...` iframe, and `read_console_messages` for errors).

- [ ] **Step 4: Commit**

```bash
git add music.html
git commit -m "Add Voice Acting section with embedded Spotify show player"
```
