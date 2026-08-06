# Griot Cuts page redesign

Date: 2026-08-06
Page: `griot-cuts.html`

## Goal

Turn the Griot Cuts (video editing) page from a single-video hero + placeholder
portfolio into a page that actually shows the work: a two-slide video hero
(service reel + the self-produced Sun Burna piece), an accurate services
marquee, and a portfolio grid pulling real Jungli content instead of stock
photography.

## 1. Hero — two-slide video carousel

Replaces the current single `.g-hero` (static poster + one YouTube preview)
with a carousel modeled on `music.html`'s `m-hero` (dots, autoplay timer,
pause-on-hover, per-slide copy/alignment), but each slide keeps the existing
`griot-cuts.html` hover-preview mechanic (silent autoplay on hover, click to
activate with sound, unmute toggle) rather than `m-hero`'s static crossfading
images.

**Slide 1 — Video Editing (CTA slide)**
- Video: `Kjgp3adMSSY` ("Griot Cuts: Professional Video Editing for Creators,
  Coaches & Entrepreneurs")
- Thumbnail is high-contrast grayscale with a yellow "CUTS" wordmark accent
- Eyebrow: "Video Editing"
- H1 color: `--gold` (#e0b26a) — warm accent pops against the grayscale still
  and echoes the thumbnail's yellow accent
- Desc: one tight sentence pulling from the user's service list (precise
  cuts, retention pacing, color grade, captions) — not a bullet dump
- CTA: "See the Work" → `#work`

**Slide 2 — Sun Burna**
- Video: `OQ0wqOBxscU` (existing hero video, already wired to the Mal Griot
  uploads playlist hand-off on ENDED)
- Thumbnail is a warm orange/gold sunset gradient over teal ocean
- Eyebrow: "Self-Produced"
- H1 color: `--sun-teal` (#3c6672, already defined on this page) — teal is
  orange's complement, reads clean against the warm background
- H1: "Sun Burna"
- Credit line under the H1 (not a caption, part of the title copy — this is
  entirely the user's own production top to bottom): "Written · Shot ·
  Edited · Mixed by Mal Griot"
- CTA: "See the Work" → `#work`

**Mechanics**
- Dots (2) switch slides; clicking advances/retreats like `m-hero`
- Autoplay timer (5s) advances slides, paused on hover — same pattern as
  `m-hero` — but stops permanently once a visitor activates sound on either
  slide's video (`activated` flag), so an in-progress video never gets cut
  off by an automatic slide change
- Whole hero section (scrim gradients, dots, marquee, service cards, CTA
  button) is re-themed off the site's real brand tokens already defined in
  `shared.css` (`--brass`, `--gold`, `--paper`, `--paper-dim`, `--ink`)
  instead of the page-local `leather-*`/`scar`/`sun-*` palette. `--sun-teal`
  is kept as a page-local accent since it's load-bearing for the Sun Burna
  slide's H1 and has no site-wide equivalent.

## 2. Marquee

**Content** (drops Brand Films / Trailers, adds the rest of what the user
actually does): Music Videos, Reels, Podcast Editing, Precise Cuts,
High-Retention Pacing, Color Grading, Audio Cleanup, Custom Captions,
Animated Titles, On-Brand Graphics, 4K Delivery, Thumbnails.

**Seamless-loop fix.** The current bug (a visible gap at the "Trailers →
Music Videos" seam) comes from hand-duplicating the item list once and
sliding exactly -50% — that only tiles cleanly if both halves render to
identical widths, which is fragile by hand and breaks at some viewport
widths/font-load timings. Fix: render the marquee from the JS array, then
clone the full sequence at runtime (in a loop) until the track's rendered
width exceeds 2x the viewport width, and animate by exactly one
sequence-width rather than a hardcoded -50%. This guarantees no blank seam
at any screen size and enough distance between repeats of the same word that
two copies are never onscreen at once.

## 3. Mini-player / hero-video mute interplay

- **Unmuting a hero video pauses the mini-player**: the existing
  `griot:pause-mini-player` event (already listened for in `shared.js`,
  currently dispatched by Discography release panels) gets dispatched from
  the hero's unmute/activate handler too.
- **Playing the mini-player mutes the active hero video**: `shared.js`
  currently has no outgoing event when SoundCloud playback starts. Add one
  dispatch — `griot:mini-player-playing` — inside the existing
  `SC.Widget.Events.PLAY` binding in `initMiniPlayer()`. This is a no-op on
  every other page; `griot-cuts.html` is the only current listener, and it
  mutes whichever hero video is currently active/unmuted.

## 4. Portfolio grid

Layout unchanged (existing 3-col responsive `.portfolio-grid`, confirmed
good). Content swaps from Pexels stock placeholders to real work:

- 5 cards from the Jungli podcast playlist
  (`PLbPNLAe4otnoA1w8Gwik4HKF9Wgb0WoON`), e.g. Mayur — "Creating the Nomad
  Scene in India," Mansoor — "Jungli's First Overlander," Mal Griot — "Rock
  Bottom Has A Basement," plus two more from the same playlist
- 1 card: the Jungli Instagram reel before/after sample
  (`jitu5eI9ybg`) from the Griot Cuts channel
- Thumbnails pulled from YouTube (`img.youtube.com/vi/<id>/hqdefault.jpg`),
  each card links out to the video
- Section head gets a "More on YouTube" link pointing at the full playlist,
  instead of trying to cram all 12 podcast episodes into the grid — more
  entries (including the separate non-Jungli YouTube content the user
  mentioned) land later once provided

## Out of scope

- Services strip (3-card "Music Videos / Social & Reels / Color & Sound")
  and closing CTA section are untouched — not flagged by the user
- No new YouTube content beyond what's listed above; the user said more
  will come later
