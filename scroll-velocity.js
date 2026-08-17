// MAL GRIOT — vanilla port of react-bits ScrollVelocity.
// Usage: <div class="sv-wrap"><div class="sv-row" data-base-speed="-40"
// data-text="AFRO-HOUSE">...</div></div> — one seed item is duplicated
// until the row is at least 3x its own width (so the loop never shows a
// gap), then translated on a plain rAF loop. Idle speed comes from
// data-base-speed (px/sec, sign sets direction); scrolling adds a
// velocity-proportional boost, clamped, that decays back to idle.
(function () {
  function initRow(row) {
    var text = row.dataset.text || '';
    if (!text) return;

    function buildItems(count) {
      row.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var span = document.createElement('span');
        span.className = 'sv-item';
        span.textContent = text;
        row.appendChild(span);
      }
    }

    var setWidth = 0;
    function measure() {
      buildItems(1);
      var oneWidth = row.children[0].getBoundingClientRect().width || 200;
      setWidth = oneWidth;
      var rowBox = row.parentElement.getBoundingClientRect().width || window.innerWidth;
      // The row wraps by translating one seed-width at a time (see tick()),
      // which only looks seamless if there's always at least a full
      // viewport of content still ahead after any wrap — i.e. total row
      // width needs to clear rowBox + one seed-width. Two spare copies on
      // top of that is a cheap safety margin against measurement rounding.
      var needed = Math.max(3, Math.ceil(rowBox / oneWidth) + 2);
      buildItems(needed);
    }
    measure();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });

    row.__mgSetWidth = function () { return setWidth; };
  }

  function init() {
    var wraps = document.querySelectorAll('.sv-wrap');
    if (!wraps.length) return;

    var rows = [];
    wraps.forEach(function (wrap) {
      wrap.querySelectorAll('.sv-row').forEach(function (row) {
        initRow(row);
        rows.push({
          el: row,
          base: parseFloat(row.dataset.baseSpeed) || -30,
          x: 0
        });
      });
    });
    if (!rows.length) return;

    var lastScrollY = window.scrollY || window.pageYOffset || 0;
    var velocity = 0; // signed, px/frame-ish
    var lastTs = null;

    window.addEventListener('scroll', function () {
      var y = window.scrollY || window.pageYOffset || 0;
      velocity = y - lastScrollY;
      lastScrollY = y;
    }, { passive: true });

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    function tick(ts) {
      if (lastTs == null) lastTs = ts;
      var dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      velocity *= 0.92; // decay the scroll impulse back toward idle
      var boost = Math.max(-260, Math.min(260, velocity * 6));

      rows.forEach(function (r) {
        // Idle speed plus a boost that always pushes the row a little
        // faster in its own direction while the page is scrolling.
        var dir = r.base < 0 ? -1 : 1;
        var pxPerSec = Math.abs(r.base) + Math.abs(boost);
        r.x += dir * pxPerSec * dt;

        // Rendered items only exist in the positive-local-x direction (item0
        // at [0,w), item1 at [w,2w), ...), so the visible window (which
        // spans local [-r.x, -r.x+rowBox]) only ever lands on real content
        // when r.x stays within (-w, 0] — true for BOTH scroll directions.
        // A rightward row (dir > 0, r.x climbing toward positive) would
        // otherwise walk the window into negative local space, where
        // nothing is rendered, and just go blank instead of looping.
        var w = r.el.__mgSetWidth ? r.el.__mgSetWidth() : 0;
        if (w > 0) {
          while (r.x > 0) r.x -= w;
          while (r.x <= -w) r.x += w;
        }
        r.el.style.transform = 'translateX(' + r.x + 'px)';
      });

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
