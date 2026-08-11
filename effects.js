// MAL GRIOT — shared effects module. Every init*() here follows the same
// guard idiom as initMiniPlayer() in shared.js: find the target markup,
// return early if it's not on this page, so effects.js can be safely
// included on every page without erroring where an effect isn't used.

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

// ---------- Gooey Nav ----------
// Injects an SVG goo filter (once, into <body>) plus a tracking blob behind
// .site-nav__links, and moves the blob to whichever link is hovered/focused.
// No-ops on pages without .site-nav__links (chrome not rendered / index.html).
function initGooeyNav() {
  const list = document.querySelector('.site-nav__links');
  if (!list) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!document.getElementById('gooey-nav-filter')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `
      <filter id="gooey-nav-filter">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/>
        <feColorMatrix in="blur" mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo"/>
      </filter>`;
    document.body.appendChild(svg);
  }

  const wrap = document.createElement('div');
  wrap.className = 'gooey-nav__wrap';
  wrap.innerHTML = '<div class="gooey-blob"></div>';
  list.appendChild(wrap);
  const blob = wrap.querySelector('.gooey-blob');

  function moveTo(link) {
    const listRect = list.getBoundingClientRect();
    const rect = link.getBoundingClientRect();
    blob.style.width = rect.width + 'px';
    blob.style.transform = `translateX(${rect.left - listRect.left}px)`;
    blob.classList.add('is-visible');
  }

  list.querySelectorAll('a').forEach((a) => {
    a.addEventListener('mouseenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  list.addEventListener('mouseleave', () => blob.classList.remove('is-visible'));
}

// ---------- Staggered Menu ----------
// Replaces the old plain slide-down toggle: opens .site-nav__links as a
// full-screen overlay (see effects.css) and closes it on link click or Esc.
function initStaggeredMenu() {
  const toggle = document.querySelector('.site-nav__toggle');
  const list = document.querySelector('.site-nav__links');
  if (!toggle || !list) return;

  function setOpen(open) {
    list.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => setOpen(!list.classList.contains('is-open')));
  list.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}
