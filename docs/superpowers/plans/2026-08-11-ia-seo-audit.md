# IA / SEO / Shareability Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the SEO/shareability/copy gaps found in the audit of the 5-page Mal Griot trifold site (canonical URLs, structured data, per-page share images, and three copy bugs) without touching the site's IA, adding new pages, or wiring analytics.

**Architecture:** This is a static HTML site — no build step, no framework, no test runner. "Tests" in this plan are `grep`/`curl`/`xmllint`-style assertions against the committed files, plus a browser check for anything visual (crop framing, credibility-line placement). Every task ends with a `git commit`.

**Tech Stack:** Plain HTML/CSS/JS, `sips` (macOS built-in) for image cropping, `xmllint` (macOS built-in, via `/usr/bin/xmllint`) for sitemap validation.

## Global Constraints

- Site root for all absolute URLs: `https://sumtinels.github.io/mal-griot-trifold-website/` — copy this exactly, no trailing-slash inconsistencies.
- The confirmed real contact email is `yep.that.malcolm@gmail.com` — never reintroduce `hello@malgriot.com`.
- Analytics is explicitly out of scope for this plan.
- No new pages, routes, or IA changes — only the 5 existing pages (`index.html`, `voice.html`, `video.html`, `soundscapes.html`, `contact.html`) plus two new root files (`robots.txt`, `sitemap.xml`) and four new images under `img/og/`.
- All 5 pages currently share an identical `<head>` structure through line 14 (ending `<meta name="twitter:image" ...>`), immediately followed by `<link rel="icon" ...>` on line 15 — insertions in Tasks 2 and 3 go between those two lines, in every file.

---

### Task 1: `robots.txt` + `sitemap.xml`

**Files:**
- Create: `robots.txt`
- Create: `sitemap.xml`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing later tasks depend on — this task is self-contained.

- [ ] **Step 1: Create `robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://sumtinels.github.io/mal-griot-trifold-website/sitemap.xml
```

- [ ] **Step 2: Create `sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sumtinels.github.io/mal-griot-trifold-website/</loc>
    <lastmod>2026-08-11</lastmod>
  </url>
  <url>
    <loc>https://sumtinels.github.io/mal-griot-trifold-website/voice.html</loc>
    <lastmod>2026-08-11</lastmod>
  </url>
  <url>
    <loc>https://sumtinels.github.io/mal-griot-trifold-website/video.html</loc>
    <lastmod>2026-08-11</lastmod>
  </url>
  <url>
    <loc>https://sumtinels.github.io/mal-griot-trifold-website/soundscapes.html</loc>
    <lastmod>2026-08-11</lastmod>
  </url>
  <url>
    <loc>https://sumtinels.github.io/mal-griot-trifold-website/contact.html</loc>
    <lastmod>2026-08-11</lastmod>
  </url>
</urlset>
```

- [ ] **Step 3: Validate the sitemap is well-formed XML**

Run: `xmllint --noout sitemap.xml && echo VALID`
Expected: `VALID` printed, no error output.

- [ ] **Step 4: Verify robots.txt points at the sitemap**

Run: `grep -c "Sitemap: https://sumtinels.github.io/mal-griot-trifold-website/sitemap.xml" robots.txt`
Expected: `1`

- [ ] **Step 5: Commit**

```bash
git add robots.txt sitemap.xml
git commit -m "Add robots.txt and sitemap.xml"
```

---

### Task 2: Canonical tags on all 5 pages

**Files:**
- Modify: `index.html:14-15`
- Modify: `voice.html:14-15`
- Modify: `video.html:14-15`
- Modify: `soundscapes.html:14-15`
- Modify: `contact.html:14-15`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing later tasks depend on directly, but Task 3 inserts immediately after this task's new line in the same files — do this task first so Task 3's line numbers are predictable.

Each page gets one new line inserted between the existing `<meta name="twitter:image" ...>` line and `<link rel="icon" ...>` line, using that page's own `og:url` value (already present a few lines above) as the canonical href.

- [ ] **Step 1: Add canonical tag to `index.html`**

Insert after line 14 (`<meta name="twitter:image" content="https://sumtinels.github.io/mal-griot-trifold-website/img/og/share-black.png">`):

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/">
```

- [ ] **Step 2: Add canonical tag to `voice.html`**

Insert in the same position:

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/voice.html">
```

- [ ] **Step 3: Add canonical tag to `video.html`**

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/video.html">
```

- [ ] **Step 4: Add canonical tag to `soundscapes.html`**

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/soundscapes.html">
```

- [ ] **Step 5: Add canonical tag to `contact.html`**

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/contact.html">
```

- [ ] **Step 6: Verify every page has exactly one canonical tag matching its own `og:url`**

Run:
```bash
for f in index.html voice.html video.html soundscapes.html contact.html; do
  og=$(grep -o 'og:url" content="[^"]*"' "$f" | sed 's/og:url" content="//;s/"$//')
  can=$(grep -o 'canonical" href="[^"]*"' "$f" | sed 's/canonical" href="//;s/"$//')
  [ "$og" = "$can" ] && echo "$f OK" || echo "$f MISMATCH: og=$og canonical=$can"
done
```
Expected: `index.html OK`, `voice.html OK`, `video.html OK`, `soundscapes.html OK`, `contact.html OK` — no `MISMATCH` lines.

- [ ] **Step 7: Commit**

```bash
git add index.html voice.html video.html soundscapes.html contact.html
git commit -m "Add canonical tags to all pages"
```

---

### Task 3: Person JSON-LD on all 5 pages

**Files:**
- Modify: `index.html` (head, after the canonical tag added in Task 2)
- Modify: `voice.html` (head, same position)
- Modify: `video.html` (head, same position)
- Modify: `soundscapes.html` (head, same position)
- Modify: `contact.html` (head, same position)

**Interfaces:**
- Consumes: the canonical `<link>` tag added in Task 2 (this task's snippet is inserted immediately after it, before `<link rel="icon" ...>`).
- Produces: nothing later tasks depend on.

The exact same JSON-LD block goes into all 5 pages, unchanged:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Mal Griot",
  "alternateName": "MAL GRIOT",
  "jobTitle": "Vocalist, Spoken-Word Artist, MC/Host, Voice Actor",
  "url": "https://sumtinels.github.io/mal-griot-trifold-website/",
  "image": "https://sumtinels.github.io/mal-griot-trifold-website/img/og/share-black.png",
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
```

- [ ] **Step 1: Insert the block into `index.html`**, immediately after the `<link rel="canonical" ...>` line added in Task 2, before `<link rel="icon" ...>`.

- [ ] **Step 2: Insert the identical block into `voice.html`**, same position.

- [ ] **Step 3: Insert the identical block into `video.html`**, same position.

- [ ] **Step 4: Insert the identical block into `soundscapes.html`**, same position.

- [ ] **Step 5: Insert the identical block into `contact.html`**, same position.

- [ ] **Step 6: Verify the JSON-LD is valid JSON on every page**

Run:
```bash
for f in index.html voice.html video.html soundscapes.html contact.html; do
  python3 -c "
import re, json, sys
html = open('$f').read()
m = re.search(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.S)
json.loads(m.group(1))
print('$f OK')
"
done
```
Expected: `index.html OK`, `voice.html OK`, `video.html OK`, `soundscapes.html OK`, `contact.html OK` — no traceback.

- [ ] **Step 7: Verify `sameAs` count is 9 on every page**

Run: `for f in index.html voice.html video.html soundscapes.html contact.html; do echo "$f: $(grep -c 'https://' <(sed -n '/"sameAs"/,/\]/p' "$f"))"; done`
Expected: every line reads `<file>: 9`.

- [ ] **Step 8: Commit**

```bash
git add index.html voice.html video.html soundscapes.html contact.html
git commit -m "Add Person JSON-LD structured data to all pages"
```

---

### Task 4: Per-page OG share images

**Files:**
- Create: `img/og/share-voice.png`
- Create: `img/og/share-video.png`
- Create: `img/og/share-soundscapes.png`
- Create: `img/og/share-contact.png`
- Modify: `voice.html` (the two `img/og/share-black.png` references in `og:image`/`twitter:image`)
- Modify: `video.html` (same two references)
- Modify: `soundscapes.html` (same two references)
- Modify: `contact.html` (same two references)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

`index.html` is NOT touched in this task — it keeps `share-black.png` per the spec.

Each crop uses a two-step `sips` pipeline: resize so the image covers 1200×630 (computed per source image below), then center-crop to exactly 1200×630. Source dimensions were confirmed with `sips -g pixelWidth -g pixelHeight` during design; resize targets below are pre-computed from those dimensions — do not recompute.

| Page | Source | Resize to (W H) | Then crop to |
|---|---|---|---|
| `voice.html` | `img/hero-1.jpg` (1800×1197) | 1200×798 | 1200×630 |
| `video.html` | `img/GRIOT CUTS.png` (1280×769) | 1200×721 | 1200×630 |
| `soundscapes.html` | `img/1722241513419.jpg` (1280×853) | 1200×800 | 1200×630 |
| `contact.html` | `img/PP_09334.JPG` (3936×2624) | 1200×800 | 1200×630 |

- [ ] **Step 1: Generate `img/og/share-voice.png`**

```bash
sips -z 798 1200 "img/hero-1.jpg" --out "img/og/.tmp-voice.png"
sips -c 630 1200 "img/og/.tmp-voice.png" --out "img/og/share-voice.png"
rm "img/og/.tmp-voice.png"
```

- [ ] **Step 2: Generate `img/og/share-video.png`**

```bash
sips -z 721 1200 "img/GRIOT CUTS.png" --out "img/og/.tmp-video.png"
sips -c 630 1200 "img/og/.tmp-video.png" --out "img/og/share-video.png"
rm "img/og/.tmp-video.png"
```

- [ ] **Step 3: Generate `img/og/share-soundscapes.png`**

```bash
sips -z 800 1200 "img/1722241513419.jpg" --out "img/og/.tmp-soundscapes.png"
sips -c 630 1200 "img/og/.tmp-soundscapes.png" --out "img/og/share-soundscapes.png"
rm "img/og/.tmp-soundscapes.png"
```

- [ ] **Step 4: Generate `img/og/share-contact.png`**

```bash
sips -z 800 1200 "img/PP_09334.JPG" --out "img/og/.tmp-contact.png"
sips -c 630 1200 "img/og/.tmp-contact.png" --out "img/og/share-contact.png"
rm "img/og/.tmp-contact.png"
```

- [ ] **Step 5: Verify all four outputs are exactly 1200×630**

Run:
```bash
for f in share-voice share-video share-soundscapes share-contact; do
  sips -g pixelWidth -g pixelHeight "img/og/$f.png" | tail -2
done
```
Expected: every file reports `pixelWidth: 1200` and `pixelHeight: 630`.

- [ ] **Step 6: Update `voice.html`'s `og:image` and `twitter:image` to `img/og/share-voice.png`**

Both lines currently read:
```html
<meta property="og:image" content="https://sumtinels.github.io/mal-griot-trifold-website/img/og/share-black.png">
```
and
```html
<meta name="twitter:image" content="https://sumtinels.github.io/mal-griot-trifold-website/img/og/share-black.png">
```
Change `share-black.png` to `share-voice.png` in both.

- [ ] **Step 7: Update `video.html`'s `og:image` and `twitter:image` to `img/og/share-video.png`**, same substitution pattern.

- [ ] **Step 8: Update `soundscapes.html`'s `og:image` and `twitter:image` to `img/og/share-soundscapes.png`**, same substitution pattern.

- [ ] **Step 9: Update `contact.html`'s `og:image` and `twitter:image` to `img/og/share-contact.png`**, same substitution pattern.

- [ ] **Step 10: Verify `index.html` is untouched and the other four point at their new images**

Run:
```bash
grep -c "share-black.png" index.html
grep -c "share-voice.png" voice.html
grep -c "share-video.png" video.html
grep -c "share-soundscapes.png" soundscapes.html
grep -c "share-contact.png" contact.html
```
Expected: `2`, `2`, `2`, `2`, `2` (each file has exactly the `og:image` and `twitter:image` line matching).

- [ ] **Step 11: Visual check — open each updated page and confirm the crop looks right**

Start the site's dev server (`.claude/launch.json` config `mal-griot-trifold`), navigate to each of `voice.html`, `video.html`, `soundscapes.html`, `contact.html`, and open `img/og/share-<page>.png` directly in the browser to confirm no awkward cropping (e.g. a face cut off, a logo clipped). If any crop looks wrong, adjust that image's resize/crop numbers in Steps 1–4 and regenerate just that one file.

- [ ] **Step 12: Commit**

```bash
git add img/og/share-voice.png img/og/share-video.png img/og/share-soundscapes.png img/og/share-contact.png voice.html video.html soundscapes.html contact.html
git commit -m "Add per-page OG share images for voice, video, soundscapes, contact"
```

---

### Task 5: `video.html` credibility line

**Files:**
- Modify: `video.html:120`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Extend the hero description paragraph**

Current line 120:
```html
    <p class="g-hero__desc" id="ghDesc">Precise, story-first cuts with retention-built pacing, color grading, and clean captions — edits made to be watched, not skipped.</p>
```

Replace with:
```html
    <p class="g-hero__desc" id="ghDesc">Precise, story-first cuts with retention-built pacing, color grading, and clean captions — edits made to be watched, not skipped. Cut with a musician's ear — the same instinct for rhythm and space that shapes the songs, just aimed at picture instead of sound.</p>
```

- [ ] **Step 2: Verify the new sentence is present**

Run: `grep -c "the same instinct for rhythm and space" video.html`
Expected: `1`

- [ ] **Step 3: Visual check**

Open `video.html` in the browser preview and confirm the hero paragraph still fits its layout without visually breaking (no overflow, no awkward wrap at the eyebrow/title area). Screenshot if unsure.

- [ ] **Step 4: Commit**

```bash
git add video.html
git commit -m "Add credibility line to Griot Cuts hero"
```

---

### Task 6: `soundscapes.html` credibility line

**Files:**
- Modify: `soundscapes.html:101`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Extend the hero description paragraph**

Current line 101:
```html
      <p class="w-hero__desc">Sound facilitation and songwriting coaching that use the voice as an instrument for regulation and expression — not performance.</p>
```

Replace with:
```html
      <p class="w-hero__desc">Sound facilitation and songwriting coaching that use the voice as an instrument for regulation and expression — not performance. Sound baths, sonorium sessions, guided meditation, and songwriting all draw on the same practice — an artist's ear for the voice, carrying both therapeutic and creative qualities.</p>
```

- [ ] **Step 2: Verify the new sentence is present**

Run: `grep -c "sonorium sessions, guided meditation" soundscapes.html`
Expected: `1`

- [ ] **Step 3: Visual check**

Open `soundscapes.html` in the browser preview and confirm the hero paragraph still fits next to the hero photo without breaking the two-column layout (`.w-hero__grid`). Screenshot if unsure.

- [ ] **Step 4: Commit**

```bash
git add soundscapes.html
git commit -m "Add credibility line to Soundscapes hero"
```

---

### Task 7: `contact.html` fixes — real email + Soundscapes rename

**Files:**
- Modify: `contact.html:75` (email)
- Modify: `contact.html:96` (form dropdown option)
- Modify: `contact.html:128-129` (FAQ heading + answer)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Fix the stale email**

Current line 75:
```html
        <li><a href="mailto:hello@malgriot.com"><span class="k">Email</span> hello@malgriot.com</a></li>
```

Replace with:
```html
        <li><a href="mailto:yep.that.malcolm@gmail.com"><span class="k">Email</span> yep.that.malcolm@gmail.com</a></li>
```

- [ ] **Step 2: Rename the form dropdown option**

Current line 96:
```html
          <option>Wellness + Coaching</option>
```

Replace with:
```html
          <option>Soundscapes</option>
```

- [ ] **Step 3: Rename the FAQ heading**

Current line 128:
```html
        <button class="faq-q" type="button">How does Wellness + Coaching work?<span class="plus"></span></button>
```

Replace with:
```html
        <button class="faq-q" type="button">How does Soundscapes work?<span class="plus"></span></button>
```

(Leave the FAQ answer text on line 129 as-is — it already reads generically: "Sessions run one-on-one, remote by default. Mention it in the form and you'll get the intake details and available times.")

- [ ] **Step 4: Verify no stale references remain**

Run:
```bash
grep -c "hello@malgriot.com" contact.html; grep -c "Wellness + Coaching" contact.html; grep -c "yep.that.malcolm@gmail.com" contact.html
```
Expected output, in order: `0`, `0`, `1` (`grep -c` counts matching lines; both the `mailto:` href and the visible text sit on line 75, so that's one matching line).

- [ ] **Step 5: Commit**

```bash
git add contact.html
git commit -m "Fix stale contact email and rename Wellness + Coaching to Soundscapes"
```

---

## Final Verification

- [ ] **Step 1: Confirm all 7 tasks are committed**

Run: `git log --oneline -7`
Expected: 7 commits, one per task above, topmost being the Task 7 commit.

- [ ] **Step 2: Full-site smoke check**

Start the `mal-griot-trifold` dev server, load each of the 5 pages in the browser, and confirm no console errors (`read_console_messages`) and no broken images (the 4 new OG images and the existing site images all load).
