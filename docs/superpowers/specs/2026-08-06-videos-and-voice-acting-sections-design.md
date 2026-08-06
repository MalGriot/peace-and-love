# Videos & Performances + Voice Acting sections — design

## Context
`music.html` currently has an About section (`.about`, ~line 732) followed by a Follow/Instagram section, then a `ytfeed` section that auto-pulls the channel's latest uploads via the YouTube Data API (requires an API key that's currently a placeholder, so it renders empty in production).

## Goal
Add two new sections to `music.html`:
1. A **Videos & Performances** section directly below About, showing 3 hand-picked YouTube embeds (music videos / performance footage).
2. A **Voice Acting** section showing an embedded Spotify podcast show player, so visitors can browse/play voice-acting clips/episodes.

## Design

### 1. Videos & Performances section
- Repurpose the existing `.ytfeed` section: remove it from its current position (after Follow) and move it directly below `.about`.
- Replace the carousel + YouTube Data API fetch logic with a static 3-up grid of fixed `youtube-nocookie.com/embed/<id>` iframes, one per video:
  - `wBonF3kFFPU`
  - `NkaRBHImjSo`
  - `P9NWy271OAs`
- Remove the now-unused `YOUTUBE_API_KEY`/`YOUTUBE_HANDLE`/`MAX_VIDEOS` fetch script, the carousel nav buttons (prev/next), and the dots — no longer needed for a fixed 3-item grid.
- Keep the section heading pattern (eyebrow + title) and the "Watch on YouTube" outbound button.
- Reuse/adapt existing `.ytfeed` CSS for the card/iframe styling, simplified from carousel-track to a responsive grid (3 columns desktop, stacking on narrow viewports, consistent with the site's existing responsive breakpoints).

### 2. Voice Acting section
- New section placed immediately after the Videos & Performances section, before the Follow (Instagram) section.
- Header pattern matches other sections: eyebrow ("Voice Acting"), title, short description.
- Embeds the Spotify show player: `https://open.spotify.com/embed/show/10nz3fJyuAt0Fqfywa0sel` in an iframe (Spotify's standard embed dimensions/attributes: `allow="encrypted-media"`, lazy loading).
- "Listen on Spotify" outbound button linking to `https://open.spotify.com/show/10nz3fJyuAt0Fqfywa0sel`, matching the CTA pattern used for Instagram/YouTube.
- No custom art needed — the Spotify embed supplies its own per-episode artwork.

### Page order after change
Listen → Releases → About → **Videos & Performances** → **Voice Acting** → Follow (Instagram) → CTA → Footer.

## Out of scope
- Custom per-clip art/cards for voice acting (explicitly declined in favor of the Spotify embed).
- Auto-pulling "latest uploads" behavior (replaced by fixed hand-picked videos).
