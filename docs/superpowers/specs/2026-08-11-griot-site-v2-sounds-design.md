# Griot Site v2 — "The Sounds" Design

Date: 2026-08-11

## Purpose

Reframe the whole site around Mal Griot's sound work — music, performances, hosting, live looping, voice acting, poetry/spoken word, soundscapes, sound baths, and meditations. Video editing (Griot Cuts) moves off the homepage and out of the "sounds" narrative; it stays reachable in the persistent nav until it becomes its own separate site later.

## Current state (for reference)

The live site (`MAL GRIOT TRIFOLD WEBSITE/`) is a static HTML/CSS/JS site — no build step, no framework, no `package.json`. `index.html` is a 3-panel "trifold" home (Voice / Videos / Soundscapes) that expands the hovered panel via CSS flex + grayscale-to-color. `voice.html` bundles music, performances, VO, discography, and bio into one long page. `soundscapes.html` covers wellness content. `contact.html` is a working contact form (Web3Forms). Shared chrome (nav/footer/chat/mini-player) is injected by `shared.js`'s `renderChrome(pageKey)` on every page except `index.html`.

## Section 1: Information Architecture

New sitemap:

| Page | Status | Source |
|---|---|---|
| `index.html` (Home) | Rebuilt | Accordion gallery hub |
| `discography.html` | New | Split from `voice.html` (songs/releases/streaming) |
| `performances.html` | New | Split from `voice.html` (live show content) |
| `vo.html` | New | Split from `voice.html` (voice acting reel/bookings) |
| `poetry.html` | New | Written poetry / spoken word |
| `hosting.html` | New | MC/host work |
| `looping.html` | New | Live looping performance |
| `soundscapes.html` | Rebuilt | Ambient/instrumental sound design |
| `soundbaths.html` | New | Sound bath / Sonorium sessions |
| `meditations.html` | New | Guided meditation work |
| `about.html` | New | Bio, currently embedded in `voice.html` |
| `contact.html` | Kept as-is | Already built, already wired to email |
| `video.html` (Griot Cuts) | Kept, deprioritized | Stays in top nav only, off the home accordion |

`voice.html` retires once its content is fully redistributed to `discography.html`, `performances.html`, `vo.html`, and `about.html` (deleted from the working tree; preserved in git history).

**Nav model:** a persistent top nav (desktop: slim bar; mobile: full-screen Staggered Menu) reaches every page, including Contact and Griot Cuts. The home accordion is the primary *browse* surface for the 10 sound pages specifically — not the only way to reach any page.

## Section 2: Home Page

10 vertical strips, one per sound page, using an **Accordion Gallery** mechanic (same expand-on-interaction technique the current `index.html` panels already use — `flex-grow` + grayscale→color — generalized from 3 wide panels to 10 narrow strips):

- **Desktop:** strips sit side by side, grayscale by default, equal width. Hovering one expands it (flex-grow), reveals full color, an eyebrow label + title, and that page's signature hero animation plays as a preview inside the expanded strip. Click navigates to the page.
- **Mobile:** rotates 90° — strips stack top-to-bottom instead of side-by-side. Tapping one expands it in place (classic vertical accordion); tapping another collapses the current one and expands the new one. No hover dependency.
- **Background:** a subtle Silk flowing-gradient wash behind the gallery, low opacity, doesn't compete with the strip photos.
- **About and Contact:** not part of the 10-strip sound gallery (they aren't "sounds") — reachable via the persistent nav, plus a small closing CTA band under the gallery ("Read the story" → About, "Get in touch" → Contact).

## Section 3: Shared Page Template

Every one of the 10 sound pages follows the same skeleton:

1. **Chrome** — existing `renderChrome()` pattern (nav/footer/chat), extended to register all new page keys in `shared.js`'s `links` array.
2. **Hero** — full-bleed photo/video, page title, one-line positioning statement, that page's signature animation (Section 4).
3. **Content body** — 2-4 sections sized to the page's material (e.g. Discography: release grid; Performances: photo/video wall + past-shows list; VO: demo reel + range description; Hosting: event-type list + testimonials; Poetry: kinetic-typography excerpts). Shared visual language (brass accent, Fraunces headings) throughout; the signature animation varies per page.
4. **CTA band** — booking/contact push (→ `contact.html`) and, where applicable, a "hear it" push to the relevant SoundCloud/Spotify link.

This generalizes `voice.html`'s existing structure (hero → listening stage → discography → about → CTA) into a named, reusable template rather than inventing a new pattern per page.

## Section 4: Animation / Effects Mapping

Effects are hand-rolled in vanilla CSS/JS (see Section 5) rather than adopted as React components, and used deliberately — global chrome gets a few, each page gets one signature moment, everything shares the same baseline scroll motion.

**Global (all pages):**
- **Gooey Nav** — desktop nav link hover (liquid blob merge)
- **Staggered Menu** — mobile full-screen nav, replaces current mobile menu
- **Scroll Reveal** — baseline fade/rise-in for content sections (effects-palette version of the existing `.reveal` behavior)

**Home:** Accordion Gallery (strips) + Silk (background wash) — Section 2.

**Per sound page:**

| Page | Signature effect | Why |
|---|---|---|
| Discography | Morph Slider (album art) + Metallic Paint (title) | Covers blend like a crossfade between tracks; gold shimmer matches the brass motif |
| Performances | Drift Wall (live photo wall) + Scroll Expand (hero) | Parallax gig photography; hero image grows on arrival |
| VO | Rotating Text (hero: "warm. gravel. narrator. villain.") | Voice range as cycling words |
| Poetry / Spoken Word | Warp Text + Text Loop | Kinetic typography — the words are the visual |
| Hosting | Specular Button (CTA) + Line Sidebar (run-of-show/event list) | Stage-light sheen on booking button; animated list for event types |
| Looping | Ripple Distortion + Particles (layers building) | Loop pedal = echo/ripple; particles stacking = layers building live |
| Soundscapes | Liquid Ether (background) + Dot Field (texture) | Ambient, ever-shifting, matches instrumental work |
| Sound Baths / Sonorium | Fluid Glass (hero orb) | Resonant glass-lens distortion reads like a singing bowl |
| Meditations | Silk (slow background) + Scroll Float | Slow, breathing motion — content drifts in, doesn't snap |
| About | Profile Card (tilt bio card) + Magic Bento (press/skills grid) | Personal, tactile bio card; bento grid for credentials/highlights |

Reserved, not pre-committed (available if a page needs a second touch during build): Elastic Slider, Fuzzy Text, Stroke Text, Curved Input, Flowing Card.

## Section 5: Content & Technical Approach

**Content sourcing:**
- Reused as-is: existing photos in `img/` (several already shot but unused — `about-*.jpg`, `DSC*`, `PP_*`, `hero-*`, etc.), the EPK PDF, real socials/contact links, discography data currently in `voice.html`.
- Redistributed: `voice.html`'s bio → About; discography section → Discography; performance copy/photos → Performances; VO-specific material → VO.
- Net-new pages (Poetry, Hosting, Looping, Soundscapes, Sound Baths, Meditations): draft copy written in the site's existing voice/tone using what's already known, but content specific to these practices (poetry excerpts, testimonials, session details, actual offerings) is placeholder text clearly marked for Mal to replace — never invented facts presented as real.

**Technical approach:**
- All effects hand-rolled in vanilla CSS/JS as reusable, named modules added to `shared.css`/`shared.js` (e.g. a `driftWall()` initializer, a `.gooey-nav` CSS treatment) — each page includes the markup and calls the relevant init, no per-page reinvention. No build step, no framework, no dependencies added — matches the site's existing architecture.
- `shared.js`'s `links` array grows from 4 keys to 12 (10 sound pages + video + contact); `renderChrome` logic is otherwise unchanged.
- Each new page is a new HTML file following the Section 3 template, using the existing `<head>` / slot-div / `renderChrome()` boilerplate already documented in the README.
- `voice.html` is deleted once its content is fully redistributed.

## Out of scope

- The video/Griot Cuts standalone site — future work, not part of this spec.
- Actual React/reactbits.dev components or a build pipeline — explicitly rejected in favor of hand-rolled vanilla equivalents.
- Final copy for the six net-new practice pages (Poetry, Hosting, Looping, Soundscapes, Sound Baths, Meditations) — ships as placeholder, needs Mal's input before launch.
