// MAL GRIOT - vanilla port of react-bits FlowingMenu. Classic script (not
// type="module"), matching morph-slider.js/warp-text.js - this site is
// tested by opening the HTML directly, not always via a server. gsap is
// loaded from CDN via <script src> ahead of this file; if it's missing on a
// given page the marquee reveal just no-ops and the row still works as a
// plain button.
//
// Source behavior (react-bits): on mouseenter/mouseleave, a colored band
// slides in from whichever edge (top/bottom) the cursor is closer to, and a
// row of duplicated title+image pairs scrolls sideways underneath it on an
// infinite loop. This port drives the same two GSAP timelines but sizes the
// marquee against the row's own width instead of the viewport, since here
// it's one item in an inline content list rather than a full-bleed nav.
//
// Usage: give each row a .po-flow__item wrapping a .po-flow__link (the
// visible title/meta) and a .po-flow__marquee > .po-flow__marquee-inner-wrap
// > .po-flow__marquee-inner containing one seed .po-flow__marquee-part
// (a <span> with the label text, plus an optional .po-flow__marquee-img
// with a data-bg image URL). This script fills in the repeated copies.

(function () {
  function distSq(x, y, x2, y2) {
    var dx = x - x2, dy = y - y2;
    return dx * dx + dy * dy;
  }

  function closestEdge(mouseX, mouseY, width, height) {
    var topDist = distSq(mouseX, mouseY, width / 2, 0);
    var bottomDist = distSq(mouseX, mouseY, width / 2, height);
    return topDist < bottomDist ? 'top' : 'bottom';
  }

  function initItem(item) {
    var marquee = item.querySelector('.po-flow__marquee');
    var inner = item.querySelector('.po-flow__marquee-inner');
    var seed = inner && inner.querySelector('.po-flow__marquee-part');
    if (!marquee || !inner || !seed) return;

    var text = (seed.querySelector('span') || {}).textContent || '';
    var imgEl = seed.querySelector('.po-flow__marquee-img');
    var img = imgEl ? imgEl.dataset.bg : '';
    var speed = parseFloat(item.dataset.speed) || 16;
    var tween = null;

    function buildParts(count) {
      inner.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var part = document.createElement('div');
        part.className = 'po-flow__marquee-part';
        var span = document.createElement('span');
        span.textContent = text;
        part.appendChild(span);
        if (img) {
          var im = document.createElement('div');
          im.className = 'po-flow__marquee-img';
          im.style.backgroundImage = 'url(' + img + ')';
          part.appendChild(im);
        }
        inner.appendChild(part);
      }
    }

    function setup() {
      var rowWidth = item.getBoundingClientRect().width || 600;
      buildParts(2);
      var partWidth = inner.querySelector('.po-flow__marquee-part').getBoundingClientRect().width || 200;
      var needed = Math.max(4, Math.ceil((rowWidth * 2) / partWidth) + 2);
      buildParts(needed);
      partWidth = inner.querySelector('.po-flow__marquee-part').getBoundingClientRect().width || 200;

      if (tween) tween.kill();
      if (typeof gsap === 'undefined') return;
      tween = gsap.to(inner, { x: -partWidth, duration: speed, ease: 'none', repeat: -1 });
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 150);
    });
    setTimeout(setup, 50);

    if (typeof gsap === 'undefined') return;
    var animDefaults = { duration: 0.6, ease: 'expo.out' };

    function pointer(ev) {
      var rect = item.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top, w: rect.width, h: rect.height };
    }

    item.addEventListener('mouseenter', function (ev) {
      var p = pointer(ev);
      var edge = closestEdge(p.x, p.y, p.w, p.h);
      gsap.timeline({ defaults: animDefaults })
        .set(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
        .set(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0)
        .to([marquee, inner], { y: '0%' }, 0);
    });

    item.addEventListener('mouseleave', function (ev) {
      var p = pointer(ev);
      var edge = closestEdge(p.x, p.y, p.w, p.h);
      gsap.timeline({ defaults: animDefaults })
        .to(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
        .to(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0);
    });
  }

  function init() {
    var items = document.querySelectorAll('.po-flow__item');
    for (var i = 0; i < items.length; i++) initItem(items[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
