# Ask Mal Griot — chatbot design

Status: approved
Date: 2026-08-04

## Problem

The site's chat widget (`.chat-widget` in `shared.css`, markup in `shared.js`'s `chatHtml`) is shell-only — bubble opens a panel that just says "The assistant is warming up." No backend exists anywhere in this repo; it's a plain static site (no build step, no package.json) hosted on GitHub Pages at `https://sumtinels.github.io/mal-griot-trifold-website/`.

## Goal

Wire up a real, in-character chatbot ("Ask MAL GRIOT") that:
- Answers FAQs about Mal Griot using real site content (bio, music/discography, wellness coaching, EPK, socials) — never invents facts or links.
- Speaks in first person, in Mal Griot's warm MC/spoken-word voice.
- Qualifies booking inquiries (event type, date, city/venue) and routes them to `contact.html` — never quotes rates (none are published).
- Respects hard content boundaries (below).

## Content boundaries

- **Off-limits**: personal life topics — his child, relationships.
- **Allowed with context**: his sexuality, if a visitor raises it — acknowledged, not volunteered unprompted.
- **No rates**: booking questions get qualifying questions + a redirect to `contact.html`, never a number.
- **No fabrication**: all facts, links, and socials come verbatim from the real site copy assembled into the system prompt; if something isn't known, the bot says so and points to `contact.html`.

## Architecture

Two independently-deployed pieces:

1. **Frontend** — stays on GitHub Pages, unchanged hosting. `shared.js`'s `chatHtml` panel is upgraded from a static message to a real conversational UI (see "Widget UI"). A small script in `shared.js` manages an in-memory (per page load, not persisted) message history array and POSTs it to the backend on each turn.

2. **Backend** — new `worker/` directory in this repo: a single Cloudflare Worker (`worker/src/index.js` + `worker/wrangler.toml`) that:
   - Holds `ANTHROPIC_API_KEY` as a Worker secret (`wrangler secret put ANTHROPIC_API_KEY`) — never shipped to the browser.
   - Exposes one endpoint, `POST /chat`, accepting `{ messages: [{role, content}, ...] }` (capped server-side to the last ~10 exchanges), calls the Anthropic Messages API with model `claude-haiku-4-5-20251001` and a system prompt built from real site copy + the content boundaries above, and returns `{ reply: string }`.
   - CORS restricted to `https://sumtinels.github.io` (plus `http://localhost:*`/`127.0.0.1:*` for local testing).
   - Deployed independently via `wrangler deploy` — no coupling to the GitHub Pages deploy. The deployed Worker URL is hardcoded as a constant near the top of `shared.js` (same pattern as the existing `YOUTUBE_API_KEY` placeholder), documented in the README for future updates.

Rationale: GitHub Pages cannot execute server code, so the API key can't live client-side without being exposed. A Cloudflare Worker is the smallest possible add-on — one file, generous free tier, no server to maintain — and keeps the static site's hosting untouched.

## Widget UI

Reuses the existing bubble/toggle exactly as-is (`.chat-widget__btn`, `.chat-widget.is-open` class toggle already wired in `shared.js`). The panel (`.chat-widget__panel`) is restructured into:

- **Header**: title "Ask MAL GRIOT" + a small status subline (e.g. "Usually replies in a beat").
- **Message list** (scrollable, capped height): bot bubbles left-aligned, visitor bubbles right-aligned in brass, matching the site's ink/paper/brass tokens. Opens with a canned in-character greeting rendered client-side (no API call for the first line).
- **Typing indicator**: a three-dot bubble (Instagram-DM style) shown after the visitor sends a message and before the bot's reply renders — even once the API response has already arrived, the reply is held briefly so the pause reads as natural. Duration scales with reply length (roughly a base delay + a small per-word increment), capped at a short maximum so it never feels sluggish.
- **Input row**: pill text input (`maxlength` enforced client-side, e.g. 500 chars) + circular send button matching the existing button style.
- **Error handling**: if the fetch to the Worker fails or errors, the bot bubble shows a graceful fallback ("Something went sideways — reach out directly on the contact page") linking to `contact.html`, rather than going silent.

Mockup approved during design (opened-state layout, spacing, bubble styling, input/send affordance) — implementation should match it closely; exact copy/spacing can be refined during build.

## Data flow

1. Visitor opens the widget → sees canned greeting (client-side only, no request).
2. Visitor sends a message → appended to in-memory history → typing indicator shown → `POST` to the Worker's `/chat` with the capped history.
3. Worker calls Anthropic with the assembled system prompt + history → returns `{ reply }`.
4. Frontend waits out the length-scaled minimum delay (if the response arrived faster than that), then hides the typing indicator and renders the bot bubble.
5. On navigation to another page, history resets (no persistence) — acceptable for an MVP FAQ/concierge widget.

## Testing / verification

UI feature — verified by hand in the browser preview, not automated tests:
- Real conversation round-trip (send → typing indicator → reply).
- Booking flow: confirms qualifying questions, confirms no rate is ever quoted, confirms redirect to `contact.html`.
- Boundary check: personal-life question is deflected; a sexuality question (if asked) is acknowledged appropriately.
- Error path: Worker unreachable → fallback message renders.
- Mobile width: panel fits viewport, doesn't overflow.

## Out of scope

- Persisting chat history across page loads/navigation.
- Rate limiting beyond input length caps + capped history (Cloudflare dashboard-level rate limiting can be added later as an operational follow-up, not part of this build).
- Publishing real booking rates (none exist yet).
- Live Instagram/other feeds — unrelated, already addressed elsewhere in the README.
