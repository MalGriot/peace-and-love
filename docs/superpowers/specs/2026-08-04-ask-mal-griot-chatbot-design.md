# Ask Mal Griot — chatbot design

Status: approved
Date: 2026-08-04

## Problem

The site's chat widget (`.chat-widget` in `shared.css`, markup in `shared.js`'s `chatHtml`) is shell-only — bubble opens a panel that just says "The assistant is warming up." No backend exists anywhere in this repo; it's a plain static site (no build step, no package.json) hosted on GitHub Pages at `https://sumtinels.github.io/mal-griot-trifold-website/`.

## Goal

Wire up a real, in-character chatbot ("Mal") that:
- Answers FAQs about Mal Griot using real site content (bio, music/discography, wellness coaching, EPK, socials) — never invents facts or links.
- Speaks in first person, in Mal Griot's warm MC/spoken-word voice.
- Qualifies booking inquiries (event type, date, city/venue) and routes them to `contact.html` and/or WhatsApp (`+91 77188 16239`) — never quotes rates (none are published).
- Respects hard content boundaries (below).

## Content boundaries

- **Off-limits**: personal life topics — his child, relationships.
- **Allowed with context**: his sexuality, if a visitor raises it — acknowledged, not volunteered unprompted.
- **No rates**: booking questions get qualifying questions + a redirect offering both `contact.html` and WhatsApp, never a number.
- **No fabrication**: all facts, links, and socials come verbatim from the real site copy assembled into the system prompt; if something isn't known, the bot says so and offers the same contact/WhatsApp redirect.
- **Never use an en dash ("–") anywhere in generated text.** Use a comma, period, or separate sentence instead. This is a hard style rule enforced in the system prompt, not a suggestion.
- **Opens and closes conversationally with "Peace and love"**: greets with a "Peace and love, ..." opener (e.g. "Peace and love, what's good", "Peace and love, what's up", "Peace and love, I'm listening") and, when a visitor thanks him or the conversation wraps up, responds in kind (e.g. "Peace and love, no problem, let's get it started"). Varies the exact phrase rather than repeating the same line every time.
- **At most one hand emoji per message** (from the fixed reaction set below, e.g. 🙌🏾), used naturally where it fits — never more than one, never forced into every message.

## Architecture

Two independently-deployed pieces:

1. **Frontend** — stays on GitHub Pages, unchanged hosting. `shared.js`'s `chatHtml` panel is upgraded from a static message to a real conversational UI (see "Widget UI"). A small script in `shared.js` manages an in-memory (per page load, not persisted) message history array and POSTs it to the backend on each turn.

2. **Backend** — new `worker/` directory in this repo: a single Cloudflare Worker (`worker/src/index.js` + `worker/wrangler.toml`) that:
   - Holds `ANTHROPIC_API_KEY` as a Worker secret (`wrangler secret put ANTHROPIC_API_KEY`) — never shipped to the browser.
   - Exposes one endpoint, `POST /chat`, accepting `{ messages: [{id, role, content, replyToId?}, ...] }` (capped server-side to the last ~10 exchanges; each message carries a stable client-generated `id` so replies and reactions can reference it).
   - Calls the Anthropic Messages API with model `claude-haiku-4-5-20251001`, a system prompt built from real site copy + the content boundaries above, and a single tool definition (`respond`) so the model returns structured output instead of free text alone:
     - `text` (string, required): the reply, following the content boundaries (no en dash, at most one hand emoji, "Peace and love" framing where natural).
     - `replyToId` (string, optional): the `id` of a specific earlier visitor message this reply is threaded to — used especially when the visitor sent more than one message in a row, so the bot can address the right one.
     - `reaction` (string, optional): one emoji from the fixed 10-emoji set (below) to react to the visitor's message with, when a reaction fits better than words.
     - `offerContact` (boolean, optional): set when the reply should end with a contact hand-off — booking inquiries, rate questions, or anything the bot doesn't have a real answer for.
   - Returns `{ text, replyToId, reaction, offerContact }` (all but `text` nullable/omittable) as JSON.
   - The model never emits raw links or HTML in `text` — `offerContact` is a flag, not a place to paste a URL. The frontend is what turns `offerContact: true` into the two actual buttons (see Widget UI), so a link can't be malformed, hallucinated, or used to inject arbitrary markup into a bubble.
   - CORS restricted to `https://sumtinels.github.io` (plus `http://localhost:*`/`127.0.0.1:*` for local testing).
   - Deployed independently via `wrangler deploy` — no coupling to the GitHub Pages deploy. The deployed Worker URL is hardcoded as a constant near the top of `shared.js` (same pattern as the existing `YOUTUBE_API_KEY` placeholder), documented in the README for future updates.

Rationale: GitHub Pages cannot execute server code, so the API key can't live client-side without being exposed. A Cloudflare Worker is the smallest possible add-on — one file, generous free tier, no server to maintain — and keeps the static site's hosting untouched.

## Widget UI

Reuses the existing bubble/toggle exactly as-is (`.chat-widget__btn`, `.chat-widget.is-open` class toggle already wired in `shared.js`). The panel (`.chat-widget__panel`) is restructured into:

### Header

- Avatar: a circular headshot (`img/about.jpg`) at the header's left, ~32px.
- Title: **"Mal"** (not "Ask Mal Griot").
- Status line, directly under the title: a small pulsing green dot + **"Online"** at rest. While waiting on a reply, the dot disappears and the text swaps to **"typing..."** — this status-line swap is a second, header-level typing signal in addition to the inline typing bubble in the message list (below); both appear together while a reply is pending.

### Message list

Scrollable, capped height. Bot bubbles left-aligned (each with the small avatar beside it), visitor bubbles right-aligned in brass, matching the site's ink/paper/brass tokens. Opens with a canned in-character greeting rendered client-side (no API call for the first line), styled like the rest: "Peace and love, ..." opener.

**Typing indicator**: when the visitor sends a message, an actual three-dot bubble (Instagram-DM style) is appended to the message list at the bottom, in the exact spot the next bot bubble will render, alongside the header status-line swap described above. Even once the API response has already arrived, the reply is held briefly so the pause reads as natural — duration scales with reply length (a base delay + a small per-word increment), capped at a short maximum so it never feels sluggish.

**Reactions** (both directions — visitor can react to any message, and the bot can react to the visitor's):
- A reaction trigger (🙂) and a reply trigger (↩) sit immediately beside each bubble, hugging its edge, vertically centered against the bubble's full height. Both are hidden until the message is hovered (or tapped, on touch).
- Clicking 🙂 opens a picker: a 2×5 grid of 10 brown-skin-tone hand emojis — 🙌🏾 🫶🏾 👌🏾 🤘🏾 🙏🏾 💪🏾 👍🏾 🤝🏾 👊🏾 🤙🏾. The picker always renders horizontally centered within the chat panel (never anchored to the trigger's own horizontal position, so it can never be clipped by the panel's left/right edge) and flips to open above or below the trigger depending on how close that message is to the top/bottom of the visible scroll area, so it always stays fully inside the panel. Hovering an emoji (in the picker, or the 🙂 trigger itself) scales it up slightly with a soft brass-tinted circle behind it, matching the site's brand accent.
- Selecting an emoji closes the picker immediately and renders that emoji as a small badge at the bottom of the bubble: **bottom-right corner for the bot's messages, bottom-left corner (just inside the corner) for the visitor's own messages.**
- The bot can also attach a reaction to a visitor's message (via the `reaction` field returned from the Worker, see Architecture) — rendered the same way, at the visitor bubble's bottom-left.

**Reply threading** (both directions, IG/WhatsApp-style):
- Clicking ↩ on any message marks it as the active reply target: a dismissible preview bar ("Replying to Griot: \"...\"" / "Replying to you: \"...\"") appears directly above the input, and the next message the visitor sends carries a quoted snippet of the target message rendered inside its own bubble.
- The visitor's outgoing message includes the target's `id` as `replyToId` when POSTed to the Worker, so the bot has that context.
- The bot can likewise thread its own reply back to a specific one of the visitor's messages via the `replyToId` field it returns — this matters especially when the visitor sends two or more messages in a row before the bot answers, so the reply visibly threads to the right one instead of reading as addressed to the most recent message by default.

### Contact hand-off

When a bot reply has `offerContact: true`, two small pill buttons render directly beneath that bubble, matching the site's existing `.btn-light`/`.btn-outline` styling:
- **"Contact page"** → `contact.html`
- **"WhatsApp"** → `https://wa.me/917718816239` (opens in a new tab, `target="_blank" rel="noopener"`)

Both options are always offered together (booking, rates, or anything else the bot hands off), so the visitor picks whichever they prefer rather than the bot guessing.

### Input row

Pill text input (`maxlength` enforced client-side, e.g. 500 chars) + circular send button matching the existing button style. When a reply target is active, the dismissible quote-preview bar sits directly above this row.

### Error handling

If the fetch to the Worker fails or errors, the bot bubble shows a graceful fallback ("Something went sideways, reach out directly on the contact page" — no en dash) linking to `contact.html`, rather than going silent.

A working reference mockup (static HTML, not shipped) was iterated live during design to validate this layout — avatar placement, header status states, hover controls, centered/flip-aware picker, reaction badge placement, and reply-threading — before writing it up here.

## Data flow

1. Visitor opens the widget → sees canned greeting (client-side only, no request).
2. Visitor sends a message (optionally with `replyToId` if replying to a specific earlier message) → appended to in-memory history, each message keyed by a client-generated `id` → header status swaps to "typing..." and an inline typing bubble is appended → `POST` to the Worker's `/chat` with the capped history.
3. Worker calls Anthropic (via the `respond` tool) with the assembled system prompt + history → returns `{ text, replyToId, reaction, offerContact }`.
4. Frontend waits out the length-scaled minimum delay (if the response arrived faster than that), then removes the typing bubble, restores the header to "Online", and renders the bot bubble — quoting the target message inline if `replyToId` is set, attaching `reaction` to the relevant visitor message if set, and appending the "Contact page" / "WhatsApp" button pair beneath the bubble if `offerContact` is true.
5. Selecting an emoji from a message's reaction picker (either party) closes the picker and attaches that badge to the message locally — reactions are a client-side/UI affordance except when the bot itself originates one via step 4.
6. On navigation to another page, history resets (no persistence) — acceptable for an MVP FAQ/concierge widget.

## Testing / verification

UI feature — verified by hand in the browser preview, not automated tests:
- Real conversation round-trip (send → typing indicator + header status swap → reply).
- Booking flow: confirms qualifying questions, confirms no rate is ever quoted, confirms both "Contact page" and "WhatsApp" buttons render together when `offerContact` fires.
- Boundary check: personal-life question is deflected; a sexuality question (if asked) is acknowledged appropriately; no en dash ever appears in bot output; at most one hand emoji per message; "Peace and love" opener/closer shows up naturally.
- Reactions: opening the picker on messages near the top and bottom of the scroll area confirms it flips above/below and stays horizontally centered/clamped inside the panel at every scroll position; selecting an emoji renders it on the correct corner (bot → bottom-right, visitor → bottom-left); the bot's own `reaction` field renders correctly on a visitor message.
- Reply threading: replying to an older message shows the quoted snippet correctly; sending two visitor messages in a row and confirming the bot's `replyToId` threads to the intended one.
- Error path: Worker unreachable → fallback message renders.
- Mobile width: panel fits viewport, doesn't overflow.

## Out of scope

- Persisting chat history, reactions, or reply threads across page loads/navigation.
- Rate limiting beyond input length caps + capped history (Cloudflare dashboard-level rate limiting can be added later as an operational follow-up, not part of this build).
- Publishing real booking rates (none exist yet).
- Live Instagram/other feeds — unrelated, already addressed elsewhere in the README.
