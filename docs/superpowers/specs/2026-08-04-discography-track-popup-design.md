# Discography track popup — design

Date: 2026-08-04
Status: Approved, ready for implementation plan

## Purpose

On the Music page (`music.html`), each Discography row currently links straight
out to Spotify or SoundCloud. The artist wants clicking a release to instead
reveal its tracklist and let visitors play tracks in-page, without ever
navigating away to the streaming platform.

## Scope

`music.html` only (`#releases` section). No changes to `index.html`,
`griot-cuts.html`, `wellness-coaching.html`, or `contact.html`. `shared.js` /
`shared.css` get the minimal additions needed to expose the mini-player's
pause control to the new code (see "Audio conflict" below); everything else
lives in `music.html`.

## Interaction pattern

Each `.release` row becomes a disclosure trigger. Clicking it does **not**
navigate — it expands an inline panel directly beneath that row, in place
(accordion-style), showing that release's tracklist and a player. Clicking
again (or clicking a different release) collapses it. The row's underlying
`href` is preserved and still rendered inside the expanded panel as a
"Open on Spotify/SoundCloud ↗" fallback link — if JS fails to init, the row
should still be a working external link (progressive enhancement is a nice
to have, not a hard requirement, since the click handler is what triggers the
expand/collapse; the fallback link inside the panel is the important part).

Only one release panel is open at a time — opening a new one closes whatever
was previously open.

All ten releases get this treatment, split by platform:

- **SoundCloud** (breathe love d e e p, TRULY HIGHER, Sun Burna, sumthn,
  PeRiOdYsSiUs): custom on-brand track list.
- **Spotify** (I Tried It, The Call of the Jungle, Free Fall, Helicopter Man,
  Toxic Baby): Spotify's own embed iframe.

## Visual design (shared shell, both platforms)

The expanded panel is styled identically regardless of platform, so the
disclosure reads as one consistent system across the whole list:

- Background: subtle Wine-tinted panel (`rgba(74,31,34,.18)`-ish over
  asphalt, consistent with the rest of the page's near-black ground) inset
  within the row's own bottom border, full width of the `.releases` column.
- Top accent: a 2px rule in that release's own `--release-accent` (already
  computed per-release from its cover art by the existing art-sampling
  script) — ties the panel back to the row that opened it.
- Open/close: height/opacity transition (existing `.release__credits`
  max-height pattern in this file is the precedent to follow), no layout
  jump.
- Padding and type scale match the rest of the page (Philosopher for any
  headings, Inter body, `--paper-dim` secondary text).

Inside the shell, the two platforms diverge:

### SoundCloud panel body

A track list built the same way `.listen__tracks` / the mini-player's track
tiles are already built in `shared.js` (`buildTracks`, `SC.Widget`
`getSounds()`), but laid out as horizontal rows instead of square tiles:
track number, title, a play/pause control per row. Clicking a row calls
`widget.skip(i)` + `widget.play()`, same as the existing `.listen__track`
click handler.

Playback is driven by the **same persistent SC widget iframe** (`#scFrame`)
and mini-player UI that already plays BLD — opening a SoundCloud release's
panel re-points that iframe's `url` param at the clicked release's
SoundCloud URL (via `widget.load()`), which:
- updates the mini-player's title/art/track list to the new release,
  reusing existing `activate()` / `buildTracks()` logic in `shared.js`,
- means transport controls (mini-player play/pause/next/prev) keep working
  for whichever release is currently loaded, exactly as they do today for
  BLD.

Because there is only one SC widget instance site-wide, only one SoundCloud
release can be "loaded" at a time — opening a different SoundCloud release's
panel (or the BLD stage) reloads the shared widget. This is expected and
matches "same player as BLD."

Closing a SoundCloud release's panel does **not** stop playback — the mini-
player is persistent by design (that's the point of reusing it), so audio
keeps going via the mini-player's own transport controls after the panel
collapses. This mirrors how BLD's stage already behaves.

### Spotify panel body

An `<iframe>` pointed at `open.spotify.com/embed/{track|album}/{id}`, where
`{track|album}` and `{id}` are parsed from the release's existing `href`
(regex against `open.spotify.com/(track|album)/([a-zA-Z0-9]+)`). Height:
~152px for a `track` embed, ~400px for an `album` embed (enough to show a
short EP's tracklist without internal scroll on most releases). No attempt
to reskin the embed's internals — it's a cross-origin iframe and Spotify's
own UI is the only legitimate source of that tracklist without a backend.

The iframe's `src` is only set when the panel opens (not present in the DOM
beforehand) and cleared when it closes, so audio actually stops rather than
continuing in a backgrounded iframe.

## Audio conflict handling

Only one thing should audibly play at a time:

- Opening any release panel (Spotify or SoundCloud) pauses the BLD
  mini-player if it's currently playing. `shared.js`'s `initMiniPlayer()`
  needs to expose a small pause hook (e.g. listen for a
  `griot:pause-mini-player` `CustomEvent` on `window`, call the existing
  `widget.pause()`) so `music.html`'s new code can request a pause without
  reaching into `shared.js` internals.
- Starting playback in one release's SoundCloud track list is already
  covered by "only one open panel at a time" plus "one shared SC widget" —
  there's no separate audio source to conflict with.
- A Spotify embed's own internal play button can't be intercepted (cross
  origin), so there's no way to detect "Spotify started playing" and pause
  the mini-player in response. Given that gap, opening *any* Spotify panel
  proactively pauses the mini-player up front (same event as above), which
  covers the common case (visitor was playing BLD, opens a Spotify release,
  BLD stops) even though a visitor pressing play on a second Spotify panel
  without closing the first can't be detected/prevented. This is an accepted
  limitation, not something to build around further.

## Accessibility

- Trigger rows get `aria-expanded` reflecting open state.
- Expanded panel gets a stable `id`, referenced by the trigger's
  `aria-controls`.
- No focus trap needed (it's inline content, not a true modal) — but moving
  focus into the panel on open is not required either, since the row itself
  remains focused after the click that opened it.

## Out of scope / explicitly not doing

- No true centered modal/dialog — rejected in favor of the inline
  accordion per the artist's direction.
- No backend, no Spotify Web API / OAuth token exchange, no server-stored
  tracklists for Spotify releases.
- No attempt to visually reskin the Spotify embed's internals.
- No changes to `index.html`'s hero, which doesn't call `renderChrome()` and
  has no mini-player.
