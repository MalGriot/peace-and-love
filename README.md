# Mal Griot — Website

Static personal site for Mal Griot (vocalist / spoken-word artist / MC-host / voice actor, Queens-born). Plain HTML/CSS/JS — **no build step, no framework, no dependencies, no package.json.** Edit files directly and open in a browser.

## Files

| File | Page / role |
|---|---|
| `index.html` | Home — full-bleed video/photo accordion linking to every section page. Builds its own hero inline; does **not** call `renderChrome` |
| `home.html` | SEO stub only — meta-refreshes straight to `./` (so `home.html` and root resolve to the same canonical URL) |
| `releases.html` | Discography — hero, full releases list pulling live cover art via oEmbed, hardcoded YouTube video embeds, booking CTA |
| `live-sets.html` | Live Sets — performance/booking page |
| `hosting.html` | Hosting/MC page |
| `poetry.html` | Poetry — book promo, "Clips & Audio" flowing-menu player with per-piece synced lyrics panel |
| `acting.html` | Acting — reel, selected frames, representation, measurements |
| `voiceover.html` | Voice Over — leads with the *Forget Me Not* audiobook (Audible), narration reel |
| `wellness.html` | Wellness — sound baths, meditation, soundscapes, downloadable audio tracks |
| `about.html` | About — bio, Jungli podcast clip, socials |
| `press.html` | Press & Updates |
| `contact.html` | Contact — booking form, FAQ |
| `shared.css` | All shared styling: CSS custom properties (incl. light/dark theme tokens), staggered nav menu, footer, buttons, chat widget shell, mini-player |
| `shared.js` | `renderChrome(active)` — injects nav/footer/chat/mini-player; scroll state, staggered mobile menu, chat toggle, mini-player wiring (`initMiniPlayer`) |
| `effects.css` / `effects.js` | Visual-effect styles/behavior (morph slider, metallic paint, staggered-menu open/close, etc.), loaded after `shared.js` on every chrome page |
| `chat.js` | "Mal" chat widget behavior — state, rendering, reactions, reply threading, the Cloudflare Worker call |
| `worker/` | Cloudflare Worker backing the chat widget — separate Node project, see `worker/README.md` |
| `epk/` | Electronic press kit (`Mal-Griot-EPK.pdf` + its source) |
| `img/`, `video/` | Real photos and hover-preview video clips used across pages |

Run locally: open `index.html` directly, or `npx serve .`

## Shared chrome pattern

Every page except `index.html` and `home.html` has three empty slot elements in its markup:
```html
<div id="chrome-nav"></div>
<div id="chrome-footer"></div>
<div id="chrome-chat"></div>
```
and calls `renderChrome('<page-key>')` on load. `shared.js` replaces each slot's `outerHTML` with the nav/footer/chat markup. The nav itself is a full-screen staggered menu (`sm-panel-item` list) covering every page in accordion order — not a simple top-bar link list — built from the `menuItems` array near the top of `renderChrome()` in `shared.js`. Page keys currently in use: `home`, `discography`, `performance`, `hosting`, `poetry`, `acting`, `voiceover`, `wellness`, `about`, `press`, `contact`.

A fourth optional slot, `<div id="chrome-player"></div>`, holds the persistent mini-player (SoundCloud playback controls). It's always injected on the discography page (`active === 'discography'`); on other pages it only appears once the visitor has pressed play at least once, tracked via `localStorage.griotPlayerActivated`. `initMiniPlayer()` (in `shared.js`) wires up the SoundCloud Widget API.

**Mini-player details:** shows the current track's album art (`#miniArt`), and a marquee title reading "Track Title — breathe love d e e p" (`#miniTitleTrack`, two duplicate `<span>`s for a seamless CSS-animation loop). The marquee only scrolls (`.is-scrolling` class) if the text actually overflows its box — short titles just sit still. A pulsing brass ring + "Press play to listen" / "Tap to listen" hint bubble (breakpoint-matched at 560px) shows on first load and dismisses after 6s or on first interaction.

**To add a new page**: copy the `<head>` + `shared.css`/`effects.css` links + slot divs + `shared.js`/`effects.js` script includes + `renderChrome('key')` call from an existing satellite page (e.g. `contact.html`) — the mobile nav's CSS/JS live in `effects.css`/`effects.js`, not `shared.css`/`shared.js`, so skipping them ships a page with a broken mobile nav. Then add the page to both the `menuItems` array in `shared.js` and `index.html`'s home accordion.

## Theme (light/dark)

The site supports a manual light/dark override on top of `prefers-color-scheme`, persisted in `localStorage.griotTheme`. Every chrome page has an inline head script (before any stylesheet) that reads `griotTheme` and sets `data-theme="light"|"dark"` on `<html>` to avoid a flash of the wrong theme. Toggle UI and the rest of the logic live in `shared.js`/`shared.css`.

## Design tokens (`shared.css` `:root`)

- `--ink` / `--paper` / `--paper-dim` / `--paper-faint` (near-black/off-white, flipped under dark theme) `--brass` (accent)
- Fonts: `--font-display: 'Philosopher', Georgia, serif` (headings), `--font-body: 'Inter', sans-serif` (body) — loaded via Google Fonts
- Buttons: `.btn-light` (paper bg/ink text), `.btn-outline` (transparent, paper border); some pages define their own page-scoped variants (e.g. `.btn-brass` in `wellness.html`)

Check `shared.css`'s `:root` block directly for current hex values — they've changed more than once and are easy to get stale here.

## Chat widget

The chat widget ("Mal", bottom-right bubble) is a real chatbot, not a shell. Markup lives in `shared.js`'s `chatWidgetHtml()` (used by `renderChrome()` on every satellite page, and directly by `index.html` since it has no nav/footer); all interactive behavior (state, rendering, reactions, reply threading, the Worker call) lives in `chat.js`, loaded on every page right after `shared.js`. Styling is in `shared.css` alongside the rest of the shared chrome.

The bot is backed by a small Cloudflare Worker in `worker/` (a separate Node project with its own `package.json`) that calls Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, free up to 10,000 neurons/day) via its `AI` binding, requesting structured JSON output and returning `{ text, replyToId, reaction, offerContact }`. No separate API key to manage — auth rides on the Cloudflare account used to deploy. `CHAT_WORKER_URL` near the top of `chat.js` already points at the deployed Worker; see `worker/README.md` for local dev and redeployment (`wrangler dev` / `wrangler deploy`) if it ever needs to move.

The bot speaks in character as Mal Griot: greets and signs off with "Peace and love", never uses an en dash, uses at most one hand emoji per reply (from a fixed 10-emoji brown-skin-tone set), never discusses his personal life (child, relationships), and never states a rate. A visitor gets 10 messages per conversation; the 10th is intercepted client-side with a WhatsApp redirect and the input then disables. Booking, pricing, unknown-answer, and limit-reached replies all hand off to both the contact page and WhatsApp via buttons rendered under the reply. Full design rationale: `docs/superpowers/specs/2026-08-04-ask-mal-griot-chatbot-design.md`.

## Live embeds

There's no live YouTube-feed carousel — that was scrapped. Video appears two ways instead:
- Individual clips embedded with real, hardcoded `youtube-nocookie.com/embed/<id>` iframes (e.g. `about.html`'s Jungli Podcast clip, `releases.html`'s Sun Burna visualizer), no API key involved.
- `releases.html`/`about.html` pull each release's real cover art live from SoundCloud's/Spotify's public oEmbed endpoints (both CORS-open, no API key needed), falling back to the stock placeholder already in the `<img>` tag if the fetch fails.

**Instagram feed:** intentionally *not* live — Instagram's public oEmbed is gone, Basic Display API is dead, and the only official path left (Graph API) needs a linked Facebook Page plus app review, real backend infra this static site doesn't have. Unofficial scraping was considered and rejected (ToS risk to the real account for a cosmetic feature). Instagram links are plain profile links instead, site-wide.

Copyright line in footer is hardcoded `© 2026 Mal Griot` — update yearly or make dynamic if this persists past 2026.
