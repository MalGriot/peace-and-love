# Mal Griot — Website

Static personal site for Mal Griot (vocalist / spoken-word artist / MC-host / voice actor, Queens-born). Plain HTML/CSS/JS — **no build step, no framework, no dependencies, no package.json.** Edit files directly and open in a browser.

## Files

| File | Page / role |
|---|---|
| `index.html` | Home — builds its own hero/nav inline, does **not** use `renderChrome` |
| `voice.html` | Voice page — hero photo carousel, listening stage, discography, about/EPK/socials, Instagram grid |
| `discography.html` | Discography page — hero with morph-slider background, full releases list (`.d-releases`) pulling live cover art the same way `voice.html` does, closing booking CTA |
| `video.html` | Video page (Griot Cuts) |
| `soundscapes.html` | Soundscapes page |
| `contact.html` | Contact page |
| `shared.css` | All shared styling: CSS custom properties, nav, footer, buttons, chat widget shell, mini-player |
| `shared.js` | `renderChrome(active)` — injects nav/footer/chat/mini-player; scroll state, mobile menu, chat toggle, mini-player wiring (`initMiniPlayer`) |
| `effects.css` | Mobile nav (hamburger/overlay menu) styling plus other visual-effect styles (morph slider, metallic paint, etc.) |
| `effects.js` | `initStaggeredMenu()` (mobile nav open/close, breakpoint-crossing safety) and other visual-effect behavior; loaded after `shared.js` on every chrome page |
| `img/` | Real photos: `hero-1.jpg`/`hero-2.jpg`/`hero-3.jpg` (hero carousel on `voice.html`), plus the original camera-named source JPEGs they were cropped from |

Run locally: open `index.html` directly, or `npx serve .`

## Shared chrome pattern

Every page except `index.html` has three empty slot elements in its markup:
```html
<div id="chrome-nav"></div>
<div id="chrome-footer"></div>
<div id="chrome-chat"></div>
```
and calls `renderChrome('<page-key>')` on load. `shared.js` replaces each slot's `outerHTML` with the nav/footer/chat markup, marking the link matching `active` with `.is-active`. Page keys used in the nav link list: `music`, `discography`, `cuts`, `wellness`, `contact` (mapped to `voice.html`, `discography.html`, `video.html`, `soundscapes.html`, `contact.html`).

A fourth optional slot, `<div id="chrome-player"></div>`, holds the persistent mini-player (SoundCloud playback controls). It's always injected on `music` (that's the discovery page); on the other three satellite pages it's only injected once the visitor has pressed play at least once, tracked via `localStorage.griotPlayerActivated`. `index.html` has no slot and never calls `renderChrome`, so the mini-player never appears there. `initMiniPlayer()` (in `shared.js`, called from the `DOMContentLoaded` listener) wires up the SoundCloud Widget API — it guards every element specific to `voice.html`'s listening stage (`#listenStage`, `#listenVinyl`, `#sleeveArt`, `#listenTracks`) so the same function works everywhere without erroring on pages that don't have them.

**Mini-player details:** shows the current track's album art (`#miniArt`), and a marquee title reading "Track Title — breathe love d e e p" (`#miniTitleTrack`, two duplicate `<span>`s for a seamless CSS-animation loop). The marquee only scrolls (`.is-scrolling` class) if the text actually overflows its box — short titles just sit still. A pulsing brass ring + "Press play to listen" / "Tap to listen" hint bubble (breakpoint-matched at 560px) shows on first load and dismisses after 6s or on first interaction.

**To add a new page**: copy the `<head>` + `shared.css`/`effects.css` links + slot divs + `shared.js`/`effects.js` script includes + `renderChrome('key')` call from `contact.html` (or `discography.html`) — the mobile nav's CSS/JS live in `effects.css`/`effects.js`, not `shared.css`/`shared.js`, so skipping them ships a page with a broken mobile nav. Then add `['your-page.html', 'Label', 'key']` to the `links` array in `shared.js` (top of file) so it appears in nav on every page.

## Design tokens (`shared.css` `:root`)

- `--ink: #0b0a09` (near-black bg), `--paper: #f5f1ea` (off-white text), `--paper-dim`/`--paper-faint` (translucent variants), `--brass: #c9a24b` (accent)
- Fonts: `--font-display: 'Fraunces', serif` (headings), `--font-body: 'Inter', sans-serif` (body) — loaded via Google Fonts `@import` at the top of `shared.css`
- Buttons: `.btn-light` (paper bg/ink text), `.btn-outline` (transparent, paper border)

## `voice.html` structure

1. **Hero** (`.m-hero`) — rotates through 3 real photos (`img/hero-*.jpg`) every 5s, crossfading over 2.8s. Each slide has its own text alignment (left/center/right, collapses to left on mobile), description, and CTA button (`#heroCta`): slide 1 "Book a Show" → `contact.html`, slide 2 "Watch the Videos" → `video.html`, slide 3 "Ask Griot Anything" → opens the chat widget. Dots (`#heroDots`) jump to a slide and reset the rotation timer. Hovering the hero pauses rotation and slow-zooms the active photo (`.is-paused`).
2. **Listening stage** (`.listen`) — the *breathe love d e e p* sleeve (`#listenStage`): hovering slides a teal vinyl record out from behind the cover with a tilt; clicking plays the album via the SoundCloud Widget API. Below it, a 10-tile track grid (`#listenTracks`, built by `buildTracks()` in `shared.js`) — each tile is its own mini vinyl-reveal: hovering pops a color-matched spinning record up out of the tile, and the cover art grows slightly. The currently-playing track keeps a gold outline (`.is-active`) **and** its record stays revealed and spinning continuously, not just on hover.
3. **Discography** (`.releases`) — 10 real releases, each linking to its real SoundCloud or Spotify URL. Album art is pulled live via oEmbed (see below), and each row has the same reveal motif: **Albums** slide out a vinyl record color-matched to that release's own art (sampled live via a 1×1 canvas draw — see `tintDiscFromArt`/`tintVinylFromArt`); **EPs** slide out a CD — same size as the vinyl record (112px desktop / 80px mobile), holographic rainbow-silver gradient, with a small circular art label in the center (36% size, like a printed CD sticker) rather than full-bleed artwork. (A full-bleed-art / thinner-rim / smaller-CD variant was tried and reverted — this vinyl-matched size and small center label is the current, intentional design.) Release titles brighten on hover to a per-release accent color sampled live from that release's own art (see "Discography hover accents" below); collab releases also reveal a `.release__credits` line (co-artist(s), Mal Griot always listed first, and label) beneath the type line on hover — set only on rows with a confirmed credit, verified against each release's real Spotify/SoundCloud page rather than assumed.
4. **About** (`.about`) — short bio, "Request the EPK" (→ `contact.html`, no PDF yet), and a "Listen & Follow" icon row: Instagram, Spotify, SoundCloud, Apple Music, YouTube Music, Amazon Music, and TIDAL — every confirmed real artist page, sourced from `linktr.ee/MalGriotMUSIC` and each platform's own search (Apple/Amazon/TIDAL/YouTube Music artist pages aren't on the Linktree, so those were tracked down directly). No Bandcamp yet — the only Bandcamp link on the Linktree is under a different handle (`shaktibalu`) for a one-off collab, not a Mal Griot storefront; add a real icon once there's an actual Mal Griot Bandcamp page.
5. **Follow along** (`.follow`) — a simple card linking out to the real Instagram profile (`@yep.that.malcolm`). No live feed — see "Instagram feed" below for why.
6. **On YouTube** (`.ytfeed`) — live embedded carousel (swipe/scroll-snap + prev/next arrows + dots) of the latest uploads (videos + Shorts) from `youtube.com/@MalGriot`, pulled client-side via the YouTube Data API v3 and rendered as real playable `youtube-nocookie.com` iframes, not thumbnails. See "YouTube feed setup" below.
7. Booking CTA (`.m-cta`) → `contact.html`.

**Album art, pulled live, not stock:** `voice.html` fetches each release's real cover from SoundCloud's or Spotify's public oEmbed endpoint (`soundcloud.com/oembed?format=json&url=...` / `open.spotify.com/oembed?url=...`, both CORS-open, no API key needed) and swaps it into `.release__art` on load, per release `href`. Falls back to the stock placeholder already in the `<img>` tag if the fetch fails (offline, private track, etc.) — see the inline `<script>` near the bottom of `voice.html`, after the hero-carousel script. "Overmind" is intentionally a single discography row using its **Spotify** URL/art (titled "The Call of the Jungle (Overmind)" there) even though it also exists on SoundCloud, because SoundCloud has no artwork uploaded for that track yet.

## Chat widget

The chat widget ("Mal", bottom-right bubble) is a real chatbot, not a shell. Markup lives in `shared.js`'s `chatWidgetHtml()` (used by `renderChrome()` on every satellite page, and directly by `index.html` since it has no nav/footer); all interactive behavior (state, rendering, reactions, reply threading, the Worker call) lives in `chat.js`, loaded on every page right after `shared.js`. Styling is in `shared.css` alongside the rest of the shared chrome.

The bot is backed by a small Cloudflare Worker in `worker/` (a separate Node project with its own `package.json`) that calls Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, free up to 10,000 neurons/day) via its `AI` binding, requesting structured JSON output and returning `{ text, replyToId, reaction, offerContact }`. No separate API key to manage — auth rides on the Cloudflare account used to deploy. See `worker/README.md` for local dev and deployment (`wrangler dev` / `wrangler deploy`). After deploying, update `CHAT_WORKER_URL` near the top of `chat.js` to the deployed Worker's URL, same placeholder-then-fill pattern as `YOUTUBE_API_KEY` below.

The bot speaks in character as Mal Griot: greets and signs off with "Peace and love", never uses an en dash, uses at most one hand emoji per reply (from a fixed 10-emoji brown-skin-tone set), never discusses his personal life (child, relationships), and never states a rate. A visitor gets 10 messages per conversation; the 10th is intercepted client-side with a WhatsApp redirect and the input then disables. Booking, pricing, unknown-answer, and limit-reached replies all hand off to both the contact page and WhatsApp (+91 77188 16239) via buttons rendered under the reply. Full design rationale: `docs/superpowers/specs/2026-08-04-ask-mal-griot-chatbot-design.md`.

Instagram (`instagram.com/yep.that.malcolm`), Spotify (`open.spotify.com/artist/61bgVlMQw2S0t6d8mVPVIS`), and SoundCloud (`soundcloud.com/mal-griot`) links are all real, site-wide.

The EPK (electronic press kit) on `voice.html` (`.about`) now links directly to the real PDF at `epk/Mal-Griot-EPK.pdf` via a `download` attribute button.

**Instagram feed:** intentionally *not* live. Instagram's public oEmbed is gone and Basic Display API is dead; the only official path left is the Graph API, which requires the Instagram account to be linked to a Facebook Page plus app review and OAuth token refresh — real backend infra this static site doesn't have. Unofficial scraping was considered and rejected: it violates Instagram's ToS and risks rate-limiting or flagging the real artist account for a cosmetic feature. The "Follow along" section is deliberately just a clean card + button pointing at `instagram.com/yep.that.malcolm`.

**YouTube feed setup:** the "On YouTube" grid (`.ytfeed`) needs a browser API key to go live — it ships with `YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY'` as a placeholder in the inline `<script>` near the bottom of `voice.html`, and the grid just stays empty (button still works) until that's replaced. To get one:
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or reuse one) and enable **YouTube Data API v3**.
2. Create an API key under **APIs & Services → Credentials**.
3. **Restrict the key** to "HTTP referrers" and add this site's domain (e.g. `malgriot.com/*`) — required since the key lives in client-side JS.
4. Paste the key into `YOUTUBE_API_KEY` in `voice.html`.

Free tier (10,000 quota units/day) is far more than a low-traffic personal site needs — each page load costs ~2 units. No OAuth, no Facebook dependency, no ongoing cost.

Copyright line in footer is hardcoded `© 2026 Mal Griot` — update yearly or make dynamic if this persists past 2026.
