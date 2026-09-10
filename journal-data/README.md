# GRIOT Journal — source libraries

This folder is the entire configuration surface for the autonomous weekly
Journal. Edit these files to feed the system; never edit `scripts/journal/generate.mjs`
just to change content, schedule, or location.

| File | What it holds |
|---|---|
| `config.json` | Publish schedule, current location (kept out of visible page text), word-count/quality rules, banned-cliche list, and the tag → internal-link map. |
| `quotes.json` | Mal Griot's own quotes / poem fragments / lines. Primary source. `text` is reproduced verbatim — never edited, paraphrased, or reworded by the generator. |
| `albums.json` | Back-catalogue releases: title, year, artwork, description, tags, streaming links. |
| `photos.json` | Journal's photo pool — real photographs of Mal Griot, each with accurate `alt` text. |
| `instagram.json` | Instagram posts available to reference. Leave the array empty if none are ready — the generator skips this source cleanly. |
| `pinterest.json` | Pinterest boards/tags usable as a visual reference. Leave empty to skip. |
| `state.json` | Auto-managed. Tracks what's been used (for repetition control) and recent themes. Do not hand-edit unless resetting the rotation. |
| `log.json` | Auto-managed. Permanent machine-readable record of every published entry. |

## Adding source material

- **Quotes/poems**: append objects to `quotes.json` — `{ "id", "text", "source", "type": "quote"|"poem-fragment"|"line", "tags": [...] }`. `text` must be the exact wording; never invent one.
- **Albums**: append to `albums.json` following the existing shape.
- **Photos**: drop the file in `../img/journal/` (or reuse an existing `img/` photo) and add `{ "id", "file", "alt", "tags": [...] }` to `photos.json`.
- **Instagram**: `{ "id", "url", "caption", "tags": [...] }`.
- **Pinterest**: `{ "id", "board_or_tag", "url", "description", "tags": [...] }` — only include boards/pins you have the right to reference; the generator links out rather than rehosting the image.

## Configuration

Open `config.json`:

- `publish.day` / `publish.hour_utc` — when the GitHub Action fires (also update `.github/workflows/griot-journal.yml`'s cron if you change this).
- `location` — current city/country/lat/lon, used only for structured data + geo meta, never printed as visible text.
- `internal_links` — tag → { url, label } map used for the "1-3 relevant pages" the generator links to.
