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
// data-enable-blur="false", data-rotation-end, data-word-animation-end.
function initScrollFloat() {
  const els = document.querySelectorAll('.scroll-float');
  if (!els.length) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  els.forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((word) => `<span class="word">${word}</span>`).join(' ');
    const wordEls = el.querySelectorAll('.word');

    if (reduceMotion) return;

    const baseOpacity = parseFloat(el.dataset.baseOpacity ?? '0.1');
    const baseRotation = parseFloat(el.dataset.baseRotation ?? '3');
    const blurStrength = parseFloat(el.dataset.blurStrength ?? '4');
    const enableBlur = el.dataset.enableBlur !== 'false';
    const rotationEnd = el.dataset.rotationEnd || 'bottom bottom';
    const wordAnimationEnd = el.dataset.wordAnimationEnd || 'bottom bottom';

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
