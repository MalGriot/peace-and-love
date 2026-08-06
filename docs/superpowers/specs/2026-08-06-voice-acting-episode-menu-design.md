# Voice Acting section — curated episode menu — design

## Context
The Voice Acting section (`voice.html`, `.voiceacting`, ~line 791) currently embeds the entire Spotify show as one iframe (`open.spotify.com/embed/show/10nz3fJyuAt0Fqfywa0sel`). The user wants a curated ordering of specific episodes instead of relying on Spotify's own show-page ordering, and wants the section copy to reflect that the work isn't just voice acting — sound design, production, and mixing/mastering are part of it too.

## Goal
Replace the single show embed with a numbered menu of 8 specific episodes (fixed order below), where clicking a menu row swaps an active embed panel to that episode. Update the section copy.

## Decision: static curated list (not a live Spotify API pull)
A live pull of the full show's episode list (curated 8 first, remainder auto-pulled after) would require the Cloudflare Worker to call Spotify's Web API via the Client Credentials grant, which needs a Spotify Developer app (Client ID/Secret) that only the user can create. The user chose the static option: ship today with exactly these 8 episodes, in this order. More can be added later by editing the HTML.

## Curated order (episode IDs, extracted from the given URLs)
1. `5tVNpRmJm0OrSzmsptOX3I`
2. `4psJl3vaX8GtkM8QJoAb8C`
3. `6KNe4ukjVtNR4bJxAMViyF`
4. `2eoPYvtIhHT83Rc2s2j2Yp`
5. `0DaAdU8CAHbNVThKLN2X6u`
6. `4G3UQpzi6k5SxBzrmGnhbQ`
7. `2BZHLoK4I8eKWW2Agm0ETW`
8. `6jSP2VBUT2JjN9VUassgOb`

## Design

### Markup
- `.voiceacting` section keeps its eyebrow/title, but the description gains a line mentioning sound design, production, and mixing/mastering (not just voice acting).
- Replace the single `<iframe>` with:
  - `.voiceacting__player` — one `<iframe>` whose `src` starts pointed at episode 1's embed URL (`https://open.spotify.com/embed/episode/5tVNpRmJm0OrSzmsptOX3I`).
  - `.voiceacting__menu` — an ordered list (`<ol>`) of 8 `<button class="voiceacting__item">` rows, one per episode, each carrying `data-episode-id` and a numbered label (`Episode 1`, etc., replaced by the real title once fetched). The first row starts with an `is-active` class.
- "Listen on Spotify" outbound button unchanged (still links to the full show).

### Behavior (new inline `<script>` block, same file)
- On click, a menu row: sets the player iframe's `src` to `https://open.spotify.com/embed/episode/<id>`, moves the `is-active` class to the clicked row, does not reload the page.
- On load, for each menu row, fetch `https://open.spotify.com/oembed?url=https://open.spotify.com/episode/<id>` (same public, no-auth oEmbed endpoint already used elsewhere in this file for release art/titles) and if the response has a `title`, replace that row's label text with it. On fetch failure, leave the "Episode N" fallback label in place. This mirrors the existing `pullArt` pattern in the file — same fetch/catch shape, no new library or technique introduced.

### Styling
- `.voiceacting__layout` — flex row (menu left, player right) on wide viewports, stacked (player above menu) on narrow viewports — consistent with the site's existing `@media (max-width: ...)` stacking breakpoints used elsewhere (e.g. `.videos__grid`, `.release`).
- `.voiceacting__item.is-active` gets the site's brass accent treatment (`var(--brass)`), matching how active/hover states are styled elsewhere (`.about-carousel__dot.is-active`, `.ytfeed__dot.is-active` equivalents).

## Out of scope
- Live Spotify API pull of the full show's remaining episodes (explicitly deferred; static list only for now).
- Per-episode custom artwork (Spotify's own embed art is used, as already decided in the prior design for this section).
