# IA / SEO / Shareability Audit — Design Spec

## Context

The user shared a "Direct-Link Architecture" document describing a much larger site (separate hubs for music, poetry, courses, membership, live events, commissions, voice-over, shop). That's a full platform, not a fit for the current 5-page trifold site (`index.html`, `voice.html`, `video.html`, `soundscapes.html`, `contact.html`) in one pass.

Decision: keep the current 5-page structure as-is. Audit it against the doc's stated principles — shareable URLs, SEO/OG metadata, clear CTAs, structured data — and fix concrete gaps found. No new pages, no IA restructure.

## Findings

Checked all 5 live pages (`home.html` is a legacy redirect stub, out of scope) against the doc's "Technical Expectations" and "clearly communicate: what / why / why Mal Griot / CTA / next step" principles.

| Page | Title/OG/Twitter meta | Canonical | JSON-LD | OG image | What/Why/Why-Mal/CTA/Next |
|---|---|---|---|---|---|
| `index.html` | ✅ present, page-specific | ❌ missing | ❌ missing | shared `share-black.png` | hub page, not held to full rubric |
| `voice.html` | ✅ present, page-specific | ❌ missing | ❌ missing | shared `share-black.png` | ✅ all five present |
| `video.html` | ✅ present, page-specific | ❌ missing | ❌ missing | shared `share-black.png` | ⚠️ no "why Mal Griot" credibility line |
| `soundscapes.html` | ✅ present, page-specific | ❌ missing | ❌ missing | shared `share-black.png` | ⚠️ no "why Mal Griot" credibility line |
| `contact.html` | ✅ present, page-specific | ❌ missing | ❌ missing | shared `share-black.png` | ⚠️ stale email + stale page-name reference |

Site-wide gaps: no `robots.txt`, no `sitemap.xml`, no structured data anywhere. Analytics was flagged but explicitly excluded from this pass by the user.

Two real bugs found on `contact.html` (not just gaps):
1. Displayed email is `hello@malgriot.com` — stale. The confirmed real address (used site-wide in memory/chat widget) is `yep.that.malcolm@gmail.com`.
2. FAQ heading and the message-form's subject dropdown still read **"Wellness + Coaching"** — leftover from before the page was renamed to **Soundscapes**.

## Design

### A) Canonical tags + `robots.txt` + `sitemap.xml`

Add one canonical tag per page, matching the `og:url` already on that page exactly:

```html
<link rel="canonical" href="https://sumtinels.github.io/mal-griot-trifold-website/PAGE">
```

(`index.html` canonical points at the site root, no `index.html` suffix, matching its existing `og:url`.)

New `robots.txt` at site root:

```
User-agent: *
Allow: /

Sitemap: https://sumtinels.github.io/mal-griot-trifold-website/sitemap.xml
```

New `sitemap.xml` at site root listing all 5 canonical URLs with `<lastmod>` set to the date of this change.

### B) Person JSON-LD

One `<script type="application/ld+json">` block, identical content, added to the `<head>` of all 5 pages (mirrors how OG tags are already duplicated per page rather than shared via `shared.js`, since `shared.js` only injects body chrome, not head metadata):

```json
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
```

### C) Per-page OG share images (1200×630)

Replace the shared `share-black.png` reference in `og:image`/`twitter:image` with a page-specific crop, generated once and committed to `img/og/`:

| Page | Source | Output |
|---|---|---|
| `index.html` | *(no change — keeps `share-black.png`)* | — |
| `voice.html` | `img/hero-1.jpg` (1800×1197, already the page's own hero photo) | `img/og/share-voice.png` |
| `video.html` | `img/GRIOT CUTS.png` (1280×769, the page's own hero graphic) | `img/og/share-video.png` |
| `soundscapes.html` | `img/1722241513419.jpg` (1280×853, the only photo already on the page) | `img/og/share-soundscapes.png` |
| `contact.html` | `img/PP_09334.JPG` (3936×2624, unused elsewhere on the site) | `img/og/share-contact.png` |

Crop to 1200×630 (center crop, adjusted per image to keep the subject framed) via `sips`. Update `og:image` and `twitter:image` on each respective page to point at its new file; leave `index.html` untouched.

### D) CTA/copy fixes

**`video.html`** — add one credibility line grounded in a musician's ear for rhythm, not a separately-claimed editing career: cutting is framed as the same instinct that shapes his music — pacing, sound, and color read as one continuous craft, not a bolt-on skill. Placed near the hero or services block, matching the page's existing tone.

**`soundscapes.html`** — add one credibility line. Per the user: this isn't a formal coaching business — it spans soundscapes, sound baths, sonorium sessions, and guided meditation, all carrying both therapeutic and artistic qualities. Line frames it as an artist's practice rather than a credentialed service: the same voice-as-instrument approach from his music, offered as a space for regulation and expression, not performance.

**`contact.html`**:
- Replace `hello@malgriot.com` with `yep.that.malcolm@gmail.com` (the confirmed real address; the `mailto:` link updates to match).
- Rename the FAQ heading "How does Wellness + Coaching work?" and its answer's reference, and the form's subject dropdown option, from **"Wellness + Coaching"** to **"Soundscapes"**.

**`index.html`, `voice.html`** — no changes; already meet the what/why/why-Mal/CTA/next-step bar.

## Out of scope

- Analytics (explicitly deferred by the user)
- Any new pages, routes, or the broader IA from the pasted architecture doc
- Rewriting `soundscapes.html`'s offerings list itself (sound baths / sonorium sessions aren't currently listed as distinct offerings there) — only the credibility line is in scope this pass
