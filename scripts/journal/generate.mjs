#!/usr/bin/env node
// GRIOT Journal — weekly entry generator.
//
// Reads journal-data/*.json (the editable source libraries), curates one
// entry, writes a permanent page under journal/<slug>/, regenerates the
// journal/index.html archive, and appends the new URL to sitemap.xml.
//
// Run manually with:  node scripts/journal/generate.mjs
// Add --dry-run to curate + write the reflection without touching any files.
//
// Writing uses the Anthropic API when ANTHROPIC_API_KEY is set (the real
// weekly path, wired up in .github/workflows/griot-journal.yml). Without a
// key it falls back to a plain, honest template — no invented material
// either way — so the pipeline still runs end to end for local testing.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'journal-data');
const JOURNAL_DIR = path.join(ROOT, 'journal');
const DRY_RUN = process.argv.includes('--dry-run');

const readJSON = (name) => JSON.parse(readFileSync(path.join(DATA, name), 'utf8'));
const writeJSON = (name, data) => writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2) + '\n');

const config = readJSON('config.json');
const quotes = readJSON('quotes.json');
const albums = readJSON('albums.json');
const photos = readJSON('photos.json');
const instagram = readJSON('instagram.json');
const pinterest = readJSON('pinterest.json');
const state = readJSON('state.json');
const log = readJSON('log.json');

// ---------- 1. Read the site's real current playlist (about.html) ----------
// Reuses the existing "Currently On Repeat" widget rather than building a
// second playlist system. Parses the static .release rows' data attributes.
function readCurrentPlaylist() {
  const aboutHtml = readFileSync(path.join(ROOT, 'about.html'), 'utf8');
  const rowRe = /<div class="release reveal" data-yt="([^"]+)" data-title="([^"]+)" data-artist="([^"]+)"/g;
  const tracks = [];
  let m;
  while ((m = rowRe.exec(aboutHtml))) {
    tracks.push({ yt: m[1], title: decodeHtml(m[2]), artist: decodeHtml(m[3]) });
  }
  return tracks;
}
function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ---------- 2. Controlled-randomness selection helpers ----------
function usedRecord(bucket, id) {
  return state.used[bucket][id];
}
function markUsed(bucket, id) {
  const rec = state.used[bucket][id] || { count: 0, lastEntryIndex: -999 };
  rec.count += 1;
  rec.lastEntryIndex = state.entry_count;
  state.used[bucket][id] = rec;
}
function scoreItem(bucket, id, bonusTags, itemTags) {
  const rec = usedRecord(bucket, id);
  const usedCount = rec ? rec.count : 0;
  const gap = rec ? Math.min(state.entry_count - rec.lastEntryIndex, 20) : 25;
  let score = 40 - usedCount * 15 + gap + Math.random() * 12;
  if (bonusTags && itemTags) {
    const overlap = itemTags.filter((t) => bonusTags.includes(t)).length;
    score += overlap * 6;
  }
  return score;
}
function pickOne(bucket, pool, { bonusTags } = {}) {
  if (!pool.length) return null;
  const scored = pool.map((item) => ({ item, score: scoreItem(bucket, item.id, bonusTags, item.tags) }));
  scored.sort((a, b) => b.score - a.score);
  // Weighted pick among the top few, so it's not always the single "best" score.
  const top = scored.slice(0, Math.min(3, scored.length));
  const pick = top[Math.floor(Math.random() * top.length)];
  return pick.item;
}
function chance(p) {
  return Math.random() < p;
}

// ---------- 3. Curate the week's combination ----------
function curateEntry() {
  const quote = pickOne('quotes', quotes);
  const theme = quote ? quote.tags : [];

  const recentThemeOverlap = (tags) =>
    state.recent_themes.flat().some((t) => tags.includes(t));

  let photo = null;
  if (chance(0.75)) photo = pickOne('photos', photos, { bonusTags: theme });

  let album = null;
  if (chance(0.35)) album = pickOne('albums', albums, { bonusTags: theme });

  const playlist = readCurrentPlaylist();
  let song = null;
  if (playlist.length && chance(0.5)) {
    const withIds = playlist.map((t) => ({ ...t, id: `song-${t.yt}` }));
    song = pickOne('songs', withIds, { bonusTags: theme });
  }

  let igPost = null;
  if (instagram.length && chance(0.4)) igPost = pickOne('instagram', instagram, { bonusTags: theme });

  let pin = null;
  if (pinterest.length && chance(0.3)) pin = pickOne('pinterest', pinterest, { bonusTags: theme });

  // Vary away from recent themes: if every recent entry shares a tag with
  // this one and we have another quote candidate available, try once more.
  if (recentThemeOverlap(theme) && quotes.length > 1 && chance(0.6)) {
    const alt = pickOne('quotes', quotes.filter((q) => q.id !== quote.id));
    if (alt) return curateWith(alt, photo, album, song, igPost, pin, playlist);
  }

  return curateWith(quote, photo, album, song, igPost, pin, playlist);
}
function curateWith(quote, photo, album, song, igPost, pin, playlist) {
  return { quote, photo, album, song, igPost, pin, playlist };
}

// ---------- 4. Internal links (1-3, chosen from theme tags) ----------
function pickInternalLinks(theme) {
  const map = config.internal_links;
  const matches = Object.keys(map).filter((tag) => theme.includes(tag));
  const links = [];
  const seen = new Set();
  for (const tag of matches) {
    const l = map[tag];
    if (!seen.has(l.url)) {
      links.push(l);
      seen.add(l.url);
    }
    if (links.length >= 3) break;
  }
  if (!links.length) links.push(config.internal_links.about);
  return links.slice(0, 3);
}

// ---------- 5. Writing: Anthropic API, with a grounded fallback ----------
async function writeReflection(selection) {
  const { quote, photo, album, song } = selection;
  const material = [
    quote ? `A line of Mal Griot's own writing (already published on the site, verbatim): "${quote.text}"` : null,
    photo ? `A real photo of Mal Griot in the entry: ${photo.alt}` : null,
    album ? `An older release being resurfaced: "${album.title}" (${album.year}) — ${album.description}` : null,
    song ? `A song currently in rotation on Mal's own listening: "${song.title}" by ${song.artist}` : null,
  ].filter(Boolean).join('\n');

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(material, config.writing);
    } catch (err) {
      console.error('Anthropic call failed, falling back to template:', err.message);
    }
  }
  return fallbackReflection(selection);
}

async function callAnthropic(material, rules) {
  const system = `You write short journal reflections in Mal Griot's voice for his personal site's Journal section.
Mal Griot is a Queens, New York-born vocalist, spoken-word artist, MC/host, and voice actor based in India, working across Afro-house, funk, and soul.

Ground rules, no exceptions:
- Write ONLY a reflection paragraph reacting to the material given below. Do not repeat the quote verbatim — it is displayed separately on the page.
- Never invent events, performances, collaborations, clients, locations, or dates. If the material doesn't support an idea, don't reach for it.
- ${rules.min_words}-${rules.max_words} words. Shorter is fine if the material calls for it.
- Personal, poetic, intelligent, concise, culturally aware, occasionally playful, human, unforced.
- Avoid these clichés entirely: ${rules.banned_phrases.join(', ')}.
- No headings, no markdown, plain prose paragraph(s) only.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.JOURNAL_MODEL || 'claude-sonnet-5',
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: `This week's material:\n${material}\n\nWrite the reflection now.` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.map((b) => b.text).join('').trim();
}

function fallbackReflection(selection) {
  const { photo, album, song } = selection;
  const parts = [];
  if (photo) parts.push(`A frame from the archive this week, nothing staged about it.`);
  if (album) parts.push(`Back to "${album.title}" (${album.year}) for a minute — still holds up.`);
  if (song) parts.push(`"${song.title}" by ${song.artist} has been on repeat.`);
  parts.push(`Some weeks the work speaks for itself.`);
  return parts.join(' ');
}

// ---------- 6. Validation (word count, clichés, link/asset existence) ----------
function validate(text, links, photo) {
  const words = text.trim().split(/\s+/).length;
  const problems = [];
  if (words < config.writing.min_words * 0.5) problems.push(`too short (${words} words)`);
  if (words > config.writing.max_words * 1.4) problems.push(`too long (${words} words)`);
  const lower = text.toLowerCase();
  for (const phrase of config.writing.banned_phrases) {
    if (lower.includes(phrase.toLowerCase())) problems.push(`contains banned phrase "${phrase}"`);
  }
  for (const l of links) {
    if (!existsSync(path.join(ROOT, l.url))) problems.push(`internal link target missing: ${l.url}`);
  }
  if (photo && !existsSync(path.join(ROOT, photo.file))) problems.push(`photo file missing: ${photo.file}`);
  return problems;
}

// ---------- 7. Slug + date ----------
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function makeSlug(quote, dateStr) {
  const words = (quote ? quote.text : 'notes').split(/\s+/).slice(0, 4).join(' ');
  let base = `${dateStr}-${slugify(words)}`;
  let slug = base;
  let n = 2;
  while (log.some((e) => e.slug === slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

// ---------- 8. HTML rendering ----------
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Photo filenames in journal-data/photos.json can contain spaces (real
// export filenames like "WhatsApp Image ....jpeg") — encode each path
// segment so they're valid inside href/src/meta-content URLs.
function encodeUrlPath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

function renderEntry({ slug, dateStr, reflection, selection, links, prev, next }) {
  const { quote, photo, album, song, igPost, pin } = selection;
  const base = config.site.base_url;
  const url = `${base}journal/${slug}/`;
  const title = quote ? truncate(quote.text, 60) : 'Notebook';
  const seoTitle = `${title} | GRIOT Journal`;
  const description = truncate(reflection, 155);
  const ogImage = photo ? `${base}${encodeUrlPath(photo.file)}` : `${base}${config.site.default_og_image}`;

  const tags = Array.from(new Set([...(quote?.tags || []), ...(album?.tags || [])])).slice(0, 6);

  const photoBlock = photo ? `
  <figure class="jr-photo">
    <img src="../../${encodeUrlPath(photo.file)}" alt="${escapeHtml(photo.alt)}" loading="lazy">
  </figure>` : '';

  const quoteBlock = quote ? `
  <blockquote class="jr-quote">
    <p>&ldquo;${escapeHtml(quote.text)}&rdquo;</p>
    <cite>Mal Griot</cite>
  </blockquote>` : '';

  const albumBlock = album ? `
  <div class="jr-album">
    <img class="jr-album__art" src="${escapeHtml(album.artwork)}" alt="${escapeHtml(album.title)} album artwork" loading="lazy">
    <div class="jr-album__meta">
      <span class="jr-album__eyebrow">From the catalog &mdash; ${escapeHtml(album.year)}</span>
      <h3>${escapeHtml(album.title)}</h3>
      <p>${escapeHtml(album.description)}</p>
      <a href="../../${escapeHtml(album.internal_link)}" class="jr-album__link">Hear it on Releases &rarr;</a>
    </div>
  </div>` : '';

  const songBlock = song ? `
  <div class="jr-song">
    <span class="jr-song__eyebrow">On repeat this week</span>
    <p class="jr-song__title">${escapeHtml(song.title)} <span class="jr-song__artist">&mdash; ${escapeHtml(song.artist)}</span></p>
  </div>` : '';

  const igBlock = igPost ? `
  <p class="jr-ig"><a href="${escapeHtml(igPost.url)}" target="_blank" rel="noopener">A moment from Instagram &rarr;</a></p>` : '';

  const pinBlock = pin ? `
  <p class="jr-pin">Visual reference: <a href="${escapeHtml(pin.url)}" target="_blank" rel="noopener">${escapeHtml(pin.description || pin.board_or_tag)}</a> <span class="jr-pin__src">(via Pinterest)</span></p>` : '';

  const linksBlock = links.map((l) => `<a href="../../${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`).join(' &middot; ');

  const prevNext = `
  <nav class="jr-prevnext">
    ${prev ? `<a href="../${escapeHtml(prev.slug)}/index.html" class="jr-prevnext__prev">&larr; ${escapeHtml(prev.title)}</a>` : '<span></span>'}
    <a href="../index.html" class="jr-prevnext__archive">Journal Archive</a>
    ${next ? `<a href="../${escapeHtml(next.slug)}/index.html" class="jr-prevnext__next">${escapeHtml(next.title)} &rarr;</a>` : '<span></span>'}
  </nav>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    headline: title,
    author: { '@type': 'Person', name: 'Mal Griot', url: base },
    datePublished: dateStr,
    dateModified: dateStr,
    url,
    image: ogImage,
    description,
    keywords: tags.join(', '),
    spatialCoverage: {
      '@type': 'Place',
      name: `${config.location.city}, ${config.location.country}`,
      geo: { '@type': 'GeoCoordinates', latitude: config.location.lat, longitude: config.location.lon },
    },
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'GRIOT Journal', url: `${base}journal/` },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script>(function(){try{var t=localStorage.getItem('griotTheme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(seoTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="Mal Griot">
<meta property="article:published_time" content="${dateStr}">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta name="geo.placename" content="${escapeHtml(config.location.city + ', ' + config.location.country)}">
<meta name="geo.position" content="${config.location.lat};${config.location.lon}">
<meta name="ICBM" content="${config.location.lat}, ${config.location.lon}">
<link rel="canonical" href="${escapeHtml(url)}">
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
<link rel="icon" href="../../img/brand/favicon.ico">
<link rel="apple-touch-icon" href="../../img/brand/apple-touch-icon.png">
<link rel="stylesheet" href="../../shared.css">
<link rel="stylesheet" href="../journal.css">
</head>
<body class="jr-body">

<div id="chrome-nav"></div>

<article class="jr-entry">
  <header class="jr-entry__head">
    <span class="jr-eyebrow">GRIOT Journal &middot; ${formatDate(dateStr)}</span>
  </header>
${photoBlock}
${quoteBlock}
  <div class="jr-reflection">
    ${reflection.split(/\n\n+/).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n    ')}
  </div>
${albumBlock}
${songBlock}
${igBlock}
${pinBlock}
  <p class="jr-links">${linksBlock}</p>
${prevNext}
</article>

<div id="chrome-footer"></div>
<div id="chrome-chat"></div>
<div id="chrome-player"></div>

<script src="../../shared.js"></script>
<script src="../../chat.js"></script>
<script>renderChrome('journal', '../../');</script>
</body>
</html>
`;
}

function truncate(s, n) {
  s = s.trim();
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function renderArchive(entries) {
  const base = config.site.base_url;
  const items = entries.slice().reverse().map((e) => `
    <a class="jr-arc__item" href="${escapeHtml(e.slug)}/index.html">
      ${e.photo ? `<img class="jr-arc__img" src="../${encodeUrlPath(e.photo)}" alt="" loading="lazy">` : '<span class="jr-arc__img jr-arc__img--none"></span>'}
      <div class="jr-arc__body">
        <span class="jr-arc__date">${formatDate(e.date)}</span>
        <h2 class="jr-arc__title">${escapeHtml(e.title)}</h2>
        <p class="jr-arc__excerpt">${escapeHtml(e.excerpt)}</p>
      </div>
    </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script>(function(){try{var t=localStorage.getItem('griotTheme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Journal | Mal Griot</title>
<meta name="description" content="A living scrapbook: photographs, poem fragments, old releases, and whatever's on repeat this week, from Mal Griot.">
<meta property="og:title" content="Journal | Mal Griot">
<meta property="og:description" content="A living scrapbook: photographs, poem fragments, old releases, and whatever's on repeat this week.">
<meta property="og:image" content="${base}${config.site.default_og_image}">
<meta property="og:url" content="${base}journal/">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${base}${config.site.default_og_image}">
<link rel="canonical" href="${base}journal/">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWorkSeries",
  "name": "GRIOT Journal",
  "author": {"@type": "Person", "name": "Mal Griot"},
  "url": "${base}journal/"
}
</script>
<link rel="icon" href="../img/brand/favicon.ico">
<link rel="apple-touch-icon" href="../img/brand/apple-touch-icon.png">
<link rel="stylesheet" href="../shared.css">
<link rel="stylesheet" href="journal.css">
</head>
<body class="jr-body">

<div id="chrome-nav"></div>

<section class="jr-hero">
  <span class="jr-eyebrow">Notebook</span>
  <h1 class="jr-hero__title">Journal</h1>
  <p class="jr-hero__desc">A living scrapbook, not a blog: photographs, fragments, old records resurfacing, whatever won't leave the room this week.</p>
</section>

<section class="jr-archive">
${items || '<p class="jr-arc__empty">The first entry is still warm. Check back soon.</p>'}
</section>

<div id="chrome-footer"></div>
<div id="chrome-chat"></div>
<div id="chrome-player"></div>

<script src="../shared.js"></script>
<script src="../chat.js"></script>
<script>renderChrome('journal', '../');</script>
</body>
</html>
`;
}

// ---------- 9. Sitemap ----------
function updateSitemap(newUrl, dateStr) {
  const file = path.join(ROOT, 'sitemap.xml');
  let xml = readFileSync(file, 'utf8');
  if (xml.includes(`<loc>${newUrl}</loc>`)) return;
  const entry = `  <url>\n    <loc>${newUrl}</loc>\n    <lastmod>${dateStr}</lastmod>\n  </url>\n`;
  if (!xml.includes(`<loc>${config.site.base_url}journal/</loc>`)) {
    xml = xml.replace('</urlset>', `  <url>\n    <loc>${config.site.base_url}journal/</loc>\n    <lastmod>${dateStr}</lastmod>\n  </url>\n</urlset>`);
  }
  xml = xml.replace('</urlset>', entry + '</urlset>');
  writeFileSync(file, xml);
}

// ---------- 10. Main ----------
async function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const selection = curateEntry();
  const theme = selection.quote ? selection.quote.tags : [];
  const links = pickInternalLinks(theme);

  let reflection = await writeReflection(selection);
  let problems = validate(reflection, links, selection.photo);
  let attempts = 0;
  while (problems.length && attempts < 2 && process.env.ANTHROPIC_API_KEY) {
    console.error('Validation failed, regenerating:', problems.join('; '));
    reflection = await writeReflection(selection);
    problems = validate(reflection, links, selection.photo);
    attempts += 1;
  }
  if (problems.length) {
    console.error('Falling back to template reflection after failed validation:', problems.join('; '));
    reflection = fallbackReflection(selection);
  }

  const slug = makeSlug(selection.quote, dateStr);
  const title = selection.quote ? truncate(selection.quote.text, 70) : 'Notebook entry';
  const excerpt = truncate(reflection, 140);

  console.log(`Curated entry "${slug}":`);
  console.log(`  quote:  ${selection.quote ? selection.quote.id : '(none)'}`);
  console.log(`  photo:  ${selection.photo ? selection.photo.id : '(none)'}`);
  console.log(`  album:  ${selection.album ? selection.album.id : '(none)'}`);
  console.log(`  song:   ${selection.song ? selection.song.title : '(none)'}`);
  console.log(`  links:  ${links.map((l) => l.url).join(', ')}`);
  console.log('---\n' + reflection + '\n---');

  if (DRY_RUN) {
    console.log('(dry run — no files written)');
    return;
  }

  const prev = log[log.length - 1] || null;
  const entryHtml = renderEntry({ slug, dateStr, reflection, selection, links, prev, next: null });

  const entryDir = path.join(JOURNAL_DIR, slug);
  mkdirSync(entryDir, { recursive: true });
  writeFileSync(path.join(entryDir, 'index.html'), entryHtml);

  // Patch the previous entry's "next" link now that this one exists.
  if (prev) {
    const prevFile = path.join(JOURNAL_DIR, prev.slug, 'index.html');
    if (existsSync(prevFile)) {
      let prevHtml = readFileSync(prevFile, 'utf8');
      prevHtml = prevHtml.replace(
        '<a href="../index.html" class="jr-prevnext__archive">Journal Archive</a>\n    ',
        `<a href="../index.html" class="jr-prevnext__archive">Journal Archive</a>\n    <a href="../${slug}/index.html" class="jr-prevnext__next">${escapeHtml(title)} &rarr;</a>`
      );
      writeFileSync(prevFile, prevHtml);
    }
  }

  // Mark usage + append to log.
  if (selection.quote) markUsed('quotes', selection.quote.id);
  if (selection.photo) markUsed('photos', selection.photo.id);
  if (selection.album) markUsed('albums', selection.album.id);
  if (selection.song) markUsed('songs', selection.song.id);
  if (selection.igPost) markUsed('instagram', selection.igPost.id);
  if (selection.pin) markUsed('pinterest', selection.pin.id);
  state.recent_themes.push(theme);
  if (state.recent_themes.length > config.repetition.recent_theme_window) state.recent_themes.shift();
  state.entry_count += 1;

  const logEntry = {
    id: slug,
    slug,
    date: dateStr,
    url: `${config.site.base_url}journal/${slug}/`,
    title,
    excerpt,
    photo: selection.photo ? selection.photo.file : null,
    quote_id: selection.quote ? selection.quote.id : null,
    album_id: selection.album ? selection.album.id : null,
    song: selection.song ? { title: selection.song.title, artist: selection.song.artist, yt: selection.song.yt } : null,
    instagram_id: selection.igPost ? selection.igPost.id : null,
    pinterest_id: selection.pin ? selection.pin.id : null,
    location: `${config.location.city}, ${config.location.country}`,
    tags: theme,
    status: 'published',
  };
  log.push(logEntry);

  writeJSON('state.json', state);
  writeJSON('log.json', log);

  writeFileSync(path.join(JOURNAL_DIR, 'index.html'), renderArchive(log));
  updateSitemap(logEntry.url, dateStr);

  console.log(`\nPublished: journal/${slug}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
