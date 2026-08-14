// MAL GRIOT — vanilla port of react-bits MorphSlider, adapted to slide
// between YouTube videos instead of static images. Deliberately a classic
// script, NOT type="module" (see warp-text.js for why file:// pages need
// this). vendor/ogl.js exposes window.OGL the same way. gsap and the
// YouTube IFrame API are loaded from CDN via <script src> in performance.html.
//
// The WebGL canvas morphs between each video's thumbnail (img.youtube.com
// supports CORS, so thumbnails can be read into a texture). A real YT.Player
// iframe can't be fed into WebGL cross-origin, so instead: once a transition
// settles on a slide, that slide's YouTube player fades in on top of the
// canvas and plays; during a transition the players are hidden and the
// canvas alone morphs between thumbnails.
//
// Initializes every .morph-slider element on the page, reading video IDs
// and transition props from its data-* attributes.

(function () {
  const { Renderer, Triangle, Program, Mesh, Texture } = window.OGL;

  const TRANSITIONS = { melt: 0, ripple: 1, shear: 2, swirl: 3 };

  const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const fragmentShader = `
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
  float rA = res.x / max(res.y, 1.0);
  float iA = img.x / max(img.y, 1.0);
  vec2 s = vec2(1.0);
  float ratio = rA / max(iA, 0.0001);
  if (ratio > 1.0) {
    s.y = 1.0 / ratio;
  } else {
    s.x = ratio;
  }
  return (uv - 0.5) * s + 0.5;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float env = sin(p * PI);

  vec2 uv = vUv;

  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
  uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;

  vec2 uvC = uv;
  vec2 uvN = uv;
  float m = smoothstep(0.0, 1.0, p);

  if (uReduce < 0.5) {
    if (uMode == 3) {
      vec2 c = uv - 0.5;
      float r = length(c);
      float ang = env * uIntensity * 3.5 * (1.0 - r);
      uvC = rot(ang) * c + 0.5;
      uvN = rot(-ang) * c + 0.5;
      m = smoothstep(0.0, 1.0, p);
    } else if (uMode == 1) {
      float d = distance(uv, uPointer);
      float ring = p * 1.6;
      float wave = sin((d - ring) * 30.0) * env;
      vec2 dir = normalize(uv - uPointer + 1e-4);
      vec2 disp = dir * wave * uIntensity * 0.25;
      uvC = uv + disp;
      uvN = uv + disp * 0.6;
      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
    } else if (uMode == 2) {
      float slices = 14.0;
      float row = floor(uv.y * slices);
      float rnd = hash11(row);
      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
      uvC = uv + disp;
      uvN = uv + disp;
      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
    } else {
      float nn = fbm(uv * uScale + uTime * 0.03);
      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
      vec2 g = vec2(nn, warp) - 0.5;
      uvC = uv + g * uIntensity * 0.5 * p;
      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
      m = smoothstep(nn - 0.15, nn + 0.15, p);
    }
  }

  vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
  vec2 sN = coverUV(uvN, uResolution, uNextSize);

  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

  vec3 colC = vec3(
    texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
    texture2D(tCurrent, sC).g,
    texture2D(tCurrent, sC - vec2(ca, 0.0)).b
  );
  vec3 colN = vec3(
    texture2D(tNext, sN + vec2(ca, 0.0)).r,
    texture2D(tNext, sN).g,
    texture2D(tNext, sN - vec2(ca, 0.0)).b
  );

  vec3 col = mix(colC, colN, m);

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col = mix(col, uOverlay, (1.0 - vig) * 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`;

  function makeFallbackTexture(gl) {
    const size = 4;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = 24;
      data[i * 4 + 1] = 24;
      data[i * 4 + 2] = 28;
      data[i * 4 + 3] = 255;
    }
    return new Texture(gl, { image: data, width: size, height: size, generateMipmaps: false });
  }

  function hexToRgb(hex) {
    let h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  class MorphEngine {
    constructor(container, { items, startIndex, reducedMotion, options, onIndexChange, onBusyChange, dprCap }) {
      this.container = container;
      this.items = items;
      this.options = options;
      this.onIndexChange = onIndexChange;
      this.onBusyChange = onBusyChange;
      this.reducedMotion = reducedMotion;

      this.current = startIndex;
      this.animating = false;
      this.dragging = false;
      this.dragDir = 0;
      this.shownIndex = startIndex;
      this.tween = null;

      this.renderer = new Renderer({
        alpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, dprCap)
      });
      this.gl = this.renderer.gl;
      this.gl.clearColor(0.05, 0.05, 0.06, 1);

      this.canvas = this.gl.canvas;
      this.canvas.className = 'morph-slider-canvas';
      container.appendChild(this.canvas);

      this.geometry = new Triangle(this.gl);

      this.textures = this.items.map(() => makeFallbackTexture(this.gl));
      this.sizes = this.items.map(() => [1, 1]);

      const opts = this.options;
      this.program = new Program(this.gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          tCurrent: { value: this.textures[this.current] },
          tNext: { value: this.textures[this.current] },
          uResolution: { value: [1, 1] },
          uCurrentSize: { value: this.sizes[this.current] },
          uNextSize: { value: this.sizes[this.current] },
          uProgress: { value: 0 },
          uDir: { value: 1 },
          uMode: { value: TRANSITIONS[opts.transition] ?? 0 },
          uIntensity: { value: opts.intensity },
          uScale: { value: opts.scale },
          uAberration: { value: opts.aberration },
          uDrift: { value: opts.drift },
          uTime: { value: 0 },
          uReduce: { value: reducedMotion ? 1 : 0 },
          uPointer: { value: [0.5, 0.5] },
          uOverlay: { value: hexToRgb(opts.overlayColor) }
        }
      });

      this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });

      this.boundContextLost = this.onContextLost.bind(this);
      this.canvas.addEventListener('webglcontextlost', this.boundContextLost, false);

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
      this.resize();

      this.loadTextures();

      this.boundLoop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.boundLoop);
    }

    loadTextures() {
      this.items.forEach((item, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.image;
        img.onload = () => {
          const texture = new Texture(this.gl, { generateMipmaps: false });
          texture.image = img;
          this.textures[index] = texture;
          this.sizes[index] = [img.naturalWidth || 1, img.naturalHeight || 1];
          if (index === this.current) {
            this.program.uniforms.tCurrent.value = texture;
            this.program.uniforms.uCurrentSize.value = this.sizes[index];
          }
        };
        img.onerror = () => {};
      });
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      this.renderer.setSize(w, h);
      this.program.uniforms.uResolution.value = [this.gl.canvas.width, this.gl.canvas.height];
    }

    loop(t) {
      this.program.uniforms.uTime.value = t * 0.001;
      this.renderer.render({ scene: this.mesh });
      this.raf = requestAnimationFrame(this.boundLoop);
    }

    wrap(i) {
      const n = this.items.length;
      return ((i % n) + n) % n;
    }

    prepareNext(dir) {
      const target = this.wrap(this.current + dir);
      this.program.uniforms.tCurrent.value = this.textures[this.current];
      this.program.uniforms.uCurrentSize.value = this.sizes[this.current];
      this.program.uniforms.tNext.value = this.textures[target];
      this.program.uniforms.uNextSize.value = this.sizes[target];
      this.program.uniforms.uDir.value = dir;
      return target;
    }

    goTo(dir) {
      if (this.animating || this.dragging || this.items.length < 2) return;
      const opts = this.options;
      if (!opts.loop) {
        const raw = this.current + dir;
        if (raw < 0 || raw > this.items.length - 1) return;
      }
      const target = this.prepareNext(dir);
      this.animating = true;
      if (this.onBusyChange) this.onBusyChange(true);
      this.announce(target);
      const duration = this.reducedMotion ? Math.min(opts.duration, 0.4) : opts.duration;
      this.tween = gsap.fromTo(
        this.program.uniforms.uProgress,
        { value: 0 },
        {
          value: 1,
          duration,
          ease: opts.ease,
          onComplete: () => this.commit(target)
        }
      );
    }

    announce(index) {
      if (index === this.shownIndex) return;
      this.shownIndex = index;
      if (this.onIndexChange) this.onIndexChange(index);
    }

    commit(target) {
      this.current = target;
      this.program.uniforms.tCurrent.value = this.textures[target];
      this.program.uniforms.uCurrentSize.value = this.sizes[target];
      this.program.uniforms.uProgress.value = 0;
      this.animating = false;
      this.tween = null;
      this.announce(target);
      if (this.onBusyChange) this.onBusyChange(false);
    }

    next() { this.goTo(1); }
    prev() { this.goTo(-1); }

    setPointer(x, y) {
      this.program.uniforms.uPointer.value = [x, y];
    }

    beginDrag() {
      if (this.animating || this.items.length < 2) return false;
      this.dragging = true;
      this.dragDir = 0;
      if (this.onBusyChange) this.onBusyChange(true);
      return true;
    }

    drag(ndx) {
      if (!this.dragging) return;
      const opts = this.options;
      const dir = ndx < 0 ? 1 : -1;
      if (!opts.loop) {
        const raw = this.current + dir;
        if (raw < 0 || raw > this.items.length - 1) {
          this.program.uniforms.uProgress.value = 0;
          return;
        }
      }
      if (dir !== this.dragDir) {
        this.dragDir = dir;
        this.prepareNext(dir);
      }
      const progress = Math.min(Math.abs(ndx), 1);
      this.program.uniforms.uProgress.value = progress;
      this.announce(progress > 0.5 ? this.wrap(this.current + dir) : this.current);
    }

    endDrag() {
      if (!this.dragging) return;
      this.dragging = false;
      const p = this.program.uniforms.uProgress.value;
      if (this.dragDir === 0) {
        if (this.onBusyChange) this.onBusyChange(false);
        return;
      }
      const target = this.wrap(this.current + this.dragDir);
      const duration = this.reducedMotion ? 0.3 : 0.5;
      this.animating = true;
      if (p > 0.4) {
        this.announce(target);
        this.tween = gsap.to(this.program.uniforms.uProgress, {
          value: 1,
          duration,
          ease: 'power2.out',
          onComplete: () => this.commit(target)
        });
      } else {
        this.announce(this.current);
        this.tween = gsap.to(this.program.uniforms.uProgress, {
          value: 0,
          duration,
          ease: 'power2.out',
          onComplete: () => {
            this.animating = false;
            this.tween = null;
            if (this.onBusyChange) this.onBusyChange(false);
          }
        });
      }
    }

    onContextLost(e) {
      e.preventDefault();
      cancelAnimationFrame(this.raf);
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      if (this.tween) this.tween.kill();
      this.resizeObserver.disconnect();
      this.canvas.removeEventListener('webglcontextlost', this.boundContextLost);
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  function thumbnailFor(id) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  function initSlider(root) {
    const videoIds = (root.dataset.videos || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!videoIds.length) return;

    const items = videoIds.map(id => ({ image: thumbnailFor(id), videoId: id }));

    const options = {
      transition: root.dataset.transition || 'melt',
      duration: parseFloat(root.dataset.duration || '1.1'),
      ease: root.dataset.ease || 'power2.inOut',
      intensity: parseFloat(root.dataset.intensity || '0.55'),
      scale: parseFloat(root.dataset.scale || '2.4'),
      aberration: parseFloat(root.dataset.aberration || '0.35'),
      drift: parseFloat(root.dataset.drift || '0.4'),
      overlayColor: root.dataset.overlayColor || '#000000',
      loop: root.dataset.loop !== 'false'
    };
    const autoplaySlides = root.dataset.autoplay === 'true';
    const autoplayDelay = parseFloat(root.dataset.autoplayDelay || '4');

    const stage = root.querySelector('.morph-slider-stage');
    const videoLayer = root.querySelector('.morph-slider-videos');
    const dotsWrap = root.querySelector('.morph-slider-indicators');
    const prevBtn = root.querySelector('[data-action="prev"]');
    const nextBtn = root.querySelector('[data-action="next"]');
    const unmuteBtn = root.querySelector('.morph-slider-unmute');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let index = 0;
    let muted = true;
    const players = new Array(items.length).fill(null);
    const playerWraps = [];

    items.forEach((item, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'morph-slider-video';
      wrap.dataset.index = String(i);
      const mount = document.createElement('div');
      mount.id = `morph-yt-${root.id || 'slider'}-${i}`;
      wrap.appendChild(mount);
      videoLayer.appendChild(wrap);
      playerWraps.push(wrap);
    });

    let dots = [];
    if (dotsWrap) {
      dots = items.map((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'morph-slider-dot' + (i === 0 ? ' is-active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-label', `Go to video ${i + 1}`);
        btn.addEventListener('click', () => {
          if (!engine || i === index) return;
          engine.goTo(i > index ? 1 : -1);
        });
        dotsWrap.appendChild(btn);
        return btn;
      });
    }

    function updateDots() {
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    function playerFor(i) {
      if (players[i] || typeof YT === 'undefined' || !YT.Player) return players[i];
      players[i] = new YT.Player(playerWraps[i].firstChild, {
        videoId: items[i].videoId,
        playerVars: {
          autoplay: 0,
          mute: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1
        },
        events: {
          onStateChange: e => {
            if (e.data === YT.PlayerState.ENDED) engine.next();
          }
        }
      });
      return players[i];
    }

    function showActiveVideo() {
      playerWraps.forEach((wrap, i) => wrap.classList.toggle('is-active', i === index));
      const p = playerFor(index);
      if (p && typeof p.playVideo === 'function') {
        if (muted && typeof p.mute === 'function') p.mute();
        try { p.playVideo(); } catch (e) {}
      }
      players.forEach((p2, i) => {
        if (i !== index && p2 && typeof p2.pauseVideo === 'function') {
          try { p2.pauseVideo(); } catch (e) {}
        }
      });
    }

    function hideVideos() {
      playerWraps.forEach(wrap => wrap.classList.remove('is-active'));
      players.forEach(p => {
        if (p && typeof p.pauseVideo === 'function') {
          try { p.pauseVideo(); } catch (e) {}
        }
      });
    }

    const engine = new MorphEngine(stage, {
      items,
      startIndex: 0,
      reducedMotion,
      dprCap: 2,
      options,
      onIndexChange: newIndex => {
        index = newIndex;
        updateDots();
      },
      onBusyChange: busy => {
        if (busy) hideVideos();
        else showActiveVideo();
      }
    });

    function ready() {
      showActiveVideo();
    }
    if (typeof YT !== 'undefined' && YT.Player) {
      ready();
    } else {
      window.__morphSliderReady = window.__morphSliderReady || [];
      window.__morphSliderReady.push(ready);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => engine.prev());
    if (nextBtn) nextBtn.addEventListener('click', () => engine.next());

    if (unmuteBtn) {
      unmuteBtn.addEventListener('click', () => {
        muted = !muted;
        const p = players[index];
        if (p) {
          if (muted && typeof p.mute === 'function') p.mute();
          else if (typeof p.unMute === 'function') p.unMute();
        }
        unmuteBtn.textContent = muted ? 'Unmute' : 'Mute';
      });
    }

    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); engine.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); engine.prev(); }
    });

    let startX = 0;
    let width = 1;
    let active = false;
    stage.addEventListener('pointerdown', e => {
      const rect = stage.getBoundingClientRect();
      width = rect.width || 1;
      startX = e.clientX;
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      engine.setPointer(px, 1 - py);
      active = engine.beginDrag();
      if (active && stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    stage.addEventListener('pointermove', e => {
      if (!active) return;
      engine.drag((e.clientX - startX) / width);
    });
    const onUp = () => {
      if (!active) return;
      active = false;
      engine.endDrag();
    };
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    if (autoplaySlides) {
      let hovering = false;
      root.addEventListener('mouseenter', () => { hovering = true; });
      root.addEventListener('mouseleave', () => { hovering = false; });
      setInterval(() => {
        if (!hovering) engine.next();
      }, Math.max(autoplayDelay, 1) * 1000);
    }
  }

  function bootAll() {
    document.querySelectorAll('.morph-slider').forEach(initSlider);
  }

  window.onYouTubeIframeAPIReady = function () {
    (window.__morphSliderReady || []).forEach(fn => fn());
    window.__morphSliderReady = [];
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();
