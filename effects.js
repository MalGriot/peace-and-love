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

// ---------- Scroll Float ----------
// react-bits ScrollReveal, ported to vanilla JS against the real gsap +
// ScrollTrigger (loaded via CDN <script> tags on pages that use it — no
// bundler needed). Splits each .scroll-float element's text into per-word
// spans, then scrubs container rotation and per-word opacity/blur directly
// off scroll position, matching the original component's animation 1:1.
// Reads props from data-* attributes (see the table in the react-bits docs):
// data-base-opacity, data-base-rotation, data-blur-strength,
// data-enable-blur="false", data-rotation-end, data-word-animation-end,
// data-float-distance (px each word rises as it reveals, default 20).
function initScrollFloat() {
  const els = document.querySelectorAll('.scroll-float');
  if (!els.length) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  els.forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((word) => `<span class="word" style="display:inline-block">${word}</span>`).join(' ');
    const wordEls = el.querySelectorAll('.word');

    // Elements choreographed by a page's own hand-built GSAP timeline (e.g.
    // music.html's pinned hero sequence) opt out here via data-manual-float
    // — they still get split into .word spans above, just not this generic
    // scroll-triggered reveal, so the two don't fight over the same props.
    if (reduceMotion || el.dataset.manualFloat === 'true') return;

    const baseOpacity = parseFloat(el.dataset.baseOpacity ?? '0.1');
    const baseRotation = parseFloat(el.dataset.baseRotation ?? '3');
    const blurStrength = parseFloat(el.dataset.blurStrength ?? '4');
    const enableBlur = el.dataset.enableBlur !== 'false';
    const rotationEnd = el.dataset.rotationEnd || 'bottom bottom';
    const wordAnimationEnd = el.dataset.wordAnimationEnd || 'bottom bottom';
    const floatDistance = parseFloat(el.dataset.floatDistance ?? '20');

    gsap.fromTo(
      el,
      { transformOrigin: '0% 50%', rotate: baseRotation, y: 60 },
      {
        ease: 'none',
        rotate: 0,
        y: 0,
        scrollTrigger: { trigger: el, start: 'top bottom', end: rotationEnd, scrub: true }
      }
    );

    gsap.fromTo(
      wordEls,
      { opacity: baseOpacity, willChange: 'opacity' },
      {
        ease: 'none',
        opacity: 1,
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top bottom-=20%', end: wordAnimationEnd, scrub: true }
      }
    );

    if (floatDistance) {
      gsap.fromTo(
        wordEls,
        { y: floatDistance, willChange: 'transform' },
        {
          ease: 'none',
          y: 0,
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top bottom-=20%', end: wordAnimationEnd, scrub: true }
        }
      );
    }

    if (enableBlur) {
      gsap.fromTo(
        wordEls,
        { filter: `blur(${blurStrength}px)` },
        {
          ease: 'none',
          filter: 'blur(0px)',
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top bottom-=20%', end: wordAnimationEnd, scrub: true }
        }
      );
    }
  });
}

// ---------- Variable Proximity ----------
// react-bits VariableProximity, ported to vanilla JS. Splits each
// .variable-proximity element's text into per-character spans (per-word,
// where a .scroll-float pass already produced .word spans, so wrapping stays
// intact) and interpolates each character's font-variation-settings toward
// data-to-font-variation-settings the closer the pointer sits to it, falling
// back to data-from-font-variation-settings at rest. Requires a variable
// font on the element (shared.css loads Inter as wght 100..900).
// Reads data-radius (px, default 80), data-from-font-variation-settings
// (default "'wght' 400"), data-to-font-variation-settings (default "'wght' 900").
function initVariableProximity() {
  const els = document.querySelectorAll('.variable-proximity');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function parseSettings(str) {
    return str.split(',').map((part) => {
      const m = part.trim().match(/'(\w{4})'\s+([\d.]+)/);
      return m ? { axis: m[1], value: parseFloat(m[2]) } : null;
    }).filter(Boolean);
  }

  els.forEach((el) => {
    const radius = parseFloat(el.dataset.radius ?? '80');
    const fromVals = parseSettings(el.dataset.fromFontVariationSettings || "'wght' 400");
    const toVals = parseSettings(el.dataset.toFontVariationSettings || "'wght' 900");

    const wordEls = el.querySelectorAll(':scope > .word');
    const containers = wordEls.length ? Array.from(wordEls) : [el];
    containers.forEach((container) => {
      const text = container.textContent;
      container.innerHTML = text
        .split('')
        .map((ch) => `<span class="char" style="display:inline-block">${ch === ' ' ? '&nbsp;' : ch}</span>`)
        .join('');
    });
    const charEls = el.querySelectorAll('.char');
    if (!charEls.length) return;

    // Heavier weights render wider glyphs, so without this a character
    // swelling toward data-to-font-variation-settings pushes everything
    // after it sideways — shifting words, and occasionally bumping one to
    // the next line. Pin each char to a fixed, center-aligned box sized for
    // its widest instance (measured once fonts are actually loaded, so the
    // measurement isn't taken against a fallback font) so weight changes
    // stay visually contained instead of reflowing the paragraph.
    function lockCharWidths() {
      const fromFVS = fromVals.map((f) => `'${f.axis}' ${f.value}`).join(', ');
      const toFVS = toVals.map((f) => `'${f.axis}' ${f.value}`).join(', ');
      charEls.forEach((c) => {
        c.style.textAlign = 'center';
        c.style.fontVariationSettings = fromFVS;
        const wFrom = c.getBoundingClientRect().width;
        c.style.fontVariationSettings = toFVS;
        const wTo = c.getBoundingClientRect().width;
        c.style.width = Math.max(wFrom, wTo) + 'px';
        c.style.fontVariationSettings = fromFVS;
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockCharWidths);
    } else {
      lockCharWidths();
    }

    let mouseX = -9999;
    let mouseY = -9999;
    let raf = null;

    function update() {
      raf = null;
      charEls.forEach((c) => {
        const rect = c.getBoundingClientRect();
        const dx = mouseX - (rect.left + rect.width / 2);
        const dy = mouseY - (rect.top + rect.height / 2);
        const t = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
        c.style.fontVariationSettings = fromVals
          .map((f, i) => `'${f.axis}' ${f.value + (toVals[i].value - f.value) * t}`)
          .join(', ');
      });
    }

    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!raf) raf = requestAnimationFrame(update);
      },
      { passive: true }
    );
  });
}

// ---------- Morph Slider ----------
// Reads comma-separated image URLs from data-slides on the container,
// builds one absolutely-positioned .morph-slider__slide per image, and
// crossfades between them on a fixed interval. No-ops without .morph-slider.
function initMorphSlider(root) {
  const el = root || document.querySelector('.morph-slider');
  if (!el) return;
  const urls = (el.dataset.slides || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!urls.length) return;

  el.innerHTML = '';
  urls.forEach((url) => {
    const slide = document.createElement('div');
    slide.className = 'morph-slider__slide';
    slide.style.backgroundImage = `url("${url}")`;
    el.appendChild(slide);
  });
  const slides = el.querySelectorAll('.morph-slider__slide');
  slides[0].classList.add('is-active');
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let i = 0;
  setInterval(() => {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
  }, 3200);
}

// ---------- Metallic Paint ----------
// Adds the shimmering gradient-text class to the given element (or every
// [data-metallic-paint] element found). No-ops if none are present.
function initMetallicPaint(root) {
  const els = root ? [root] : document.querySelectorAll('[data-metallic-paint]');
  els.forEach((el) => el.classList.add('metallic-paint'));
}
