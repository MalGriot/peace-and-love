// MAL GRIOT - vanilla port of react-bits DriftWall.
// Markup: .dw-grid > .dw-tile[data-video] > .dw-tile__media > img + video,
// plus a .dw-tile__label with a .dw-tile__timer ring (same SVG shape as the
// homepage accordion's timer). On hover, the ring fills over VIDEO_DELAY;
// if the pointer is still there when it completes, the video swaps in and
// plays muted/looped. Leaving early cancels the timer and resets the ring.
// Each tile also gets a randomized float phase/amplitude via inline CSS
// vars so the idle drift-wall.css animation looks organic, not synced.
(function () {
  var VIDEO_DELAY = 2200;
  var TIMER_CIRCUMFERENCE = 56.5; // 2 * PI * r(9)

  function init() {
    var tiles = document.querySelectorAll('.dw-tile');
    if (!tiles.length) return;

    tiles.forEach(function (tile, i) {
      tile.style.setProperty('--dw-delay', (i * 0.6) + 's');
      tile.style.setProperty('--dw-drift', (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 3) + 'px');

      var video = tile.querySelector('video');
      var timerProgress = tile.querySelector('.dw-timer-progress');
      var playTimer = null;
      var ringFrame = null;

      function resetRing() {
        if (!timerProgress) return;
        cancelAnimationFrame(ringFrame);
        timerProgress.style.strokeDashoffset = TIMER_CIRCUMFERENCE;
      }

      function runRing() {
        if (!timerProgress) return;
        var start = performance.now();
        function step(now) {
          var progress = Math.min(1, (now - start) / VIDEO_DELAY);
          timerProgress.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - progress));
          if (progress < 1) ringFrame = requestAnimationFrame(step);
        }
        cancelAnimationFrame(ringFrame);
        ringFrame = requestAnimationFrame(step);
      }

      tile.addEventListener('mouseenter', function () {
        if (!video) return;
        tile.classList.add('is-active');
        clearTimeout(playTimer);
        resetRing();
        runRing();
        playTimer = setTimeout(function () {
          tile.classList.add('is-playing');
          video.currentTime = 0;
          video.play().catch(function () {});
        }, VIDEO_DELAY);
      });

      tile.addEventListener('mouseleave', function () {
        tile.classList.remove('is-active', 'is-playing');
        clearTimeout(playTimer);
        if (video) { video.pause(); }
        resetRing();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
