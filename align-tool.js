/* TEMPORARY dev tool - manual face-alignment UI for the home accordion.
   Activate with ?align=1 in the URL. Does nothing otherwise. Safe to delete when done. */
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('align') !== '1') return;

  const items = Array.from(document.querySelectorAll('.acc-item'));
  if (!items.length) return;

  const style = document.createElement('style');
  style.textContent = `
    .acc-item{pointer-events:none !important;}
    .acc-item__photo{transition:none !important;}
    .accordion.has-active .acc-item.is-active{flex:0 0 20vw !important;}
    .acc-item:hover .acc-item__photo{transform:none !important;}
    .acc-item__video{opacity:0 !important;}
    .acc-item__title,.acc-item__soon,.acc-item__indicator,.acc-item__mute{display:none !important;}
    .align-drag{position:absolute;inset:0;pointer-events:auto;cursor:grab;z-index:50;}
    .align-drag.dragging{cursor:grabbing;}
    .align-crosshair{position:absolute;width:18px;height:18px;left:calc(var(--ax,50%) - 9px);top:calc(var(--ay,50%) - 9px);
      border:1.5px solid #f4d59a;border-radius:50%;pointer-events:none;z-index:51;
      box-shadow:0 0 0 1px rgba(0,0,0,.6);}
    .align-crosshair::before,.align-crosshair::after{content:'';position:absolute;background:#f4d59a;}
    .align-crosshair::before{left:50%;top:-5px;width:1px;height:28px;transform:translateX(-50%);}
    .align-crosshair::after{top:50%;left:-5px;height:1px;width:28px;transform:translateY(-50%);}
    .align-panel{position:fixed;top:12px;right:12px;z-index:9999;background:#0b0a09;color:#f4d59a;
      font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;border:1px solid rgba(224,178,106,.4);
      border-radius:6px;padding:12px;width:260px;max-height:90vh;overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,.6);}
    .align-panel h3{margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#fff;}
    .align-row{display:flex;align-items:center;gap:6px;padding:5px 2px;border-top:1px solid rgba(255,255,255,.08);
      cursor:pointer;}
    .align-row.active{background:rgba(224,178,106,.14);}
    .align-row span.key{flex:1;text-transform:capitalize;}
    .align-row span.val{font-variant-numeric:tabular-nums;color:#fff;opacity:.75;font-size:10.5px;}
    .align-panel textarea{width:100%;height:130px;margin-top:8px;background:#151310;color:#f4d59a;
      border:1px solid rgba(224,178,106,.3);font:10px/1.4 monospace;padding:6px;box-sizing:border-box;}
    .align-panel button{background:#e0b26a;color:#0b0a09;border:none;border-radius:4px;padding:6px 10px;
      font-size:11px;cursor:pointer;margin-top:8px;}
    .align-panel button.secondary{background:transparent;color:#e0b26a;border:1px solid rgba(224,178,106,.4);margin-left:6px;}
    .align-hint{font-size:10.5px;color:rgba(255,255,255,.55);margin-top:6px;}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'align-panel';
  panel.innerHTML = `<h3 id="align-drag-handle">⠿ Align photos - off:hover</h3><div class="align-list"></div>
    <div class="align-hint">Drag a photo to slide it. Click a row, then use arrow keys to nudge (Shift = fine). Drag this title bar to move the panel out of the way.</div>
    <button id="align-copy">Copy CSS</button><button id="align-reset" class="secondary">Reset all</button>
    <textarea id="align-out" readonly placeholder="Copy output appears here…"></textarea>`;
  document.body.appendChild(panel);

  // panel is draggable by its title bar so it can be moved off any photo
  const handle = panel.querySelector('#align-drag-handle');
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  (function makePanelDraggable() {
    let dragging = false, startX = 0, startY = 0, startTop = 0, startLeft = 0;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.style.cursor = 'grabbing';
      handle.setPointerCapture(e.pointerId);
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startTop = rect.top;
      startLeft = rect.left;
      panel.style.right = 'auto';
      panel.style.top = startTop + 'px';
      panel.style.left = startLeft + 'px';
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = Math.min(window.innerWidth - 40, Math.max(0, startLeft + (e.clientX - startX)));
      const ny = Math.min(window.innerHeight - 40, Math.max(0, startTop + (e.clientY - startY)));
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      handle.style.cursor = 'grab';
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  })();

  const list = panel.querySelector('.align-list');
  let activeKey = null;
  const state = {};

  function parsePos(img) {
    const raw = img.style.objectPosition || getComputedStyle(img).objectPosition || '50% 50%';
    const parts = raw.split(' ').map((v) => parseFloat(v));
    return { x: isNaN(parts[0]) ? 50 : parts[0], y: isNaN(parts[1]) ? 50 : parts[1] };
  }

  function setActive(key, scrollClear) {
    if (activeKey && activeKey !== key) {
      const prevRow = list.querySelector(`.align-row[data-key="${activeKey}"]`);
      if (prevRow) prevRow.classList.remove('active');
    }
    activeKey = key;
    list.querySelector(`.align-row[data-key="${key}"]`).classList.add('active');
    if (scrollClear) {
      // the fixed panel covers the right ~280px of the screen - scroll the
      // item into the clear left portion so it can actually be dragged
      const accordion = document.getElementById('accordion');
      const item = state[key].item;
      const clearWidth = window.innerWidth - 300;
      const itemRect = item.getBoundingClientRect();
      const accRect = accordion.getBoundingClientRect();
      const targetLeft = accRect.left + clearWidth / 2 - itemRect.width / 2;
      accordion.scrollLeft += itemRect.left - targetLeft;
    }
  }

  function apply(key) {
    const s = state[key];
    const posStr = `${s.x.toFixed(2)}% ${s.y.toFixed(2)}%`;
    s.img.style.objectPosition = posStr;
    s.img.style.transformOrigin = posStr;
    s.crosshair.style.setProperty('--ax', s.x + '%');
    s.crosshair.style.setProperty('--ay', s.y + '%');
    list.querySelector(`.align-row[data-key="${key}"] .val`).textContent =
      `${s.x.toFixed(1)}% ${s.y.toFixed(1)}%`;
  }

  items.forEach((item) => {
    const key = item.dataset.key;
    const img = item.querySelector('.acc-item__photo');
    const pos = parsePos(img);

    const drag = document.createElement('div');
    drag.className = 'align-drag';
    item.appendChild(drag);

    const crosshair = document.createElement('div');
    crosshair.className = 'align-crosshair';
    item.appendChild(crosshair);

    state[key] = { img, item, crosshair, initial: { ...pos }, x: pos.x, y: pos.y };

    const row = document.createElement('div');
    row.className = 'align-row';
    row.dataset.key = key;
    row.innerHTML = `<span class="key">${key}</span><span class="val"></span>`;
    row.addEventListener('click', () => setActive(key, true));
    list.appendChild(row);

    apply(key);

    let dragging = false, startX = 0, startY = 0, startPos = null;

    drag.addEventListener('pointerdown', (e) => {
      dragging = true;
      drag.classList.add('dragging');
      drag.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      startPos = { x: state[key].x, y: state[key].y };
      setActive(key);
    });

    drag.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = item.getBoundingClientRect();
      const naturalW = img.naturalWidth || rect.width;
      const naturalH = img.naturalHeight || rect.height;
      const scale = Math.max(rect.width / naturalW, rect.height / naturalH);
      const overflowX = Math.max(1, naturalW * scale - rect.width);
      const overflowY = Math.max(1, naturalH * scale - rect.height);
      const dxPx = e.clientX - startX;
      const dyPx = e.clientY - startY;
      let nx = startPos.x - (100 * dxPx) / overflowX;
      let ny = startPos.y - (100 * dyPx) / overflowY;
      nx = Math.min(100, Math.max(0, nx));
      ny = Math.min(100, Math.max(0, ny));
      state[key].x = nx;
      state[key].y = ny;
      apply(key);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      drag.classList.remove('dragging');
      try { drag.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    drag.addEventListener('pointerup', endDrag);
    drag.addEventListener('pointercancel', endDrag);
  });

  document.addEventListener('keydown', (e) => {
    if (!activeKey) return;
    const step = e.shiftKey ? 0.2 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    const s = state[activeKey];
    s.x = Math.min(100, Math.max(0, s.x + dx));
    s.y = Math.min(100, Math.max(0, s.y + dy));
    apply(activeKey);
  });

  panel.querySelector('#align-copy').addEventListener('click', () => {
    const lines = Object.keys(state).map((key) => {
      const s = state[key];
      return `${key}: object-position:${s.x.toFixed(1)}% ${s.y.toFixed(1)}%;`;
    });
    const out = lines.join('\n');
    panel.querySelector('#align-out').value = out;
    if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
  });

  panel.querySelector('#align-reset').addEventListener('click', () => {
    Object.keys(state).forEach((key) => {
      const s = state[key];
      s.x = s.initial.x;
      s.y = s.initial.y;
      apply(key);
    });
  });
})();

/* ---- on:hover mode - activate with ?align=2 ----
   Edits transform-origin (the zoom anchor) while the photo is genuinely
   :hover-ed and zoomed in, so you see exactly what a visitor sees. */
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('align') !== '2') return;

  const items = Array.from(document.querySelectorAll('.acc-item'));
  if (!items.length) return;

  const style = document.createElement('style');
  style.textContent = `
    .acc-item__video{opacity:0 !important;}
    .acc-item.is-playing .acc-item__photo{opacity:1 !important;}
    .acc-item__title,.acc-item__soon,.acc-item__indicator,.acc-item__mute{display:none !important;}
    .align2-drag{position:absolute;inset:0;pointer-events:auto;cursor:grab;z-index:60;}
    .align2-drag.dragging{cursor:grabbing;}
    .align2-crosshair{position:absolute;width:18px;height:18px;left:calc(var(--ax,50%) - 9px);top:calc(var(--ay,50%) - 9px);
      border:1.5px solid #6ad0f4;border-radius:50%;pointer-events:none;z-index:61;
      box-shadow:0 0 0 1px rgba(0,0,0,.6);}
    .align2-crosshair::before,.align2-crosshair::after{content:'';position:absolute;background:#6ad0f4;}
    .align2-crosshair::before{left:50%;top:-5px;width:1px;height:28px;transform:translateX(-50%);}
    .align2-crosshair::after{top:50%;left:-5px;height:1px;width:28px;transform:translateY(-50%);}
    .align-panel{position:fixed;top:12px;right:12px;z-index:9999;background:#0b0a09;color:#6ad0f4;
      font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;border:1px solid rgba(106,208,244,.4);
      border-radius:6px;padding:12px;width:260px;max-height:90vh;overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,.6);}
    .align-panel h3{margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#fff;}
    .align-row{display:flex;align-items:center;gap:6px;padding:5px 2px;border-top:1px solid rgba(255,255,255,.08);
      cursor:pointer;}
    .align-row.active{background:rgba(106,208,244,.14);}
    .align-row span.key{flex:1;text-transform:capitalize;}
    .align-row span.val{font-variant-numeric:tabular-nums;color:#fff;opacity:.75;font-size:10.5px;}
    .align-panel textarea{width:100%;height:130px;margin-top:8px;background:#151310;color:#6ad0f4;
      border:1px solid rgba(106,208,244,.3);font:10px/1.4 monospace;padding:6px;box-sizing:border-box;}
    .align-panel button{background:#6ad0f4;color:#0b0a09;border:none;border-radius:4px;padding:6px 10px;
      font-size:11px;cursor:pointer;margin-top:8px;}
    .align-panel button.secondary{background:transparent;color:#6ad0f4;border:1px solid rgba(106,208,244,.4);margin-left:6px;}
    .align-hint{font-size:10.5px;color:rgba(255,255,255,.55);margin-top:6px;}
  `;
  document.head.appendChild(style);

  // per-item override rules - some hover states hardcode transform-origin
  // with !important in the base stylesheet, so a plain inline style can't
  // win. This tag is appended after everything else and always wins.
  const overrideStyle = document.createElement('style');
  document.head.appendChild(overrideStyle);

  const panel = document.createElement('div');
  panel.className = 'align-panel';
  panel.innerHTML = `<h3 id="align2-drag-handle">⠿ Align photos - on:hover</h3><div class="align-list"></div>
    <div class="align-hint">Hover a photo, then drag on it to move the zoom's focal point. Click a row, then use arrow keys to nudge (Shift = fine). Keep the cursor over the photo while dragging. Drag this title bar to move the panel.</div>
    <button id="align-copy">Copy CSS</button><button id="align-reset" class="secondary">Reset all</button>
    <textarea id="align-out" readonly placeholder="Copy output appears here…"></textarea>`;
  document.body.appendChild(panel);

  const handle = panel.querySelector('#align2-drag-handle');
  handle.style.cursor = 'grab';
  handle.style.userSelect = 'none';
  (function makePanelDraggable() {
    let dragging = false, startX = 0, startY = 0, startTop = 0, startLeft = 0;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.style.cursor = 'grabbing';
      handle.setPointerCapture(e.pointerId);
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startTop = rect.top;
      startLeft = rect.left;
      panel.style.right = 'auto';
      panel.style.top = startTop + 'px';
      panel.style.left = startLeft + 'px';
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = Math.min(window.innerWidth - 40, Math.max(0, startLeft + (e.clientX - startX)));
      const ny = Math.min(window.innerHeight - 40, Math.max(0, startTop + (e.clientY - startY)));
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      handle.style.cursor = 'grab';
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  })();

  const list = panel.querySelector('.align-list');
  let activeKey = null;
  const state = {};

  function parseOrigin(img) {
    const raw = img.style.transformOrigin || getComputedStyle(img).transformOrigin || '50% 50%';
    const parts = raw.split(' ').map((v) => parseFloat(v));
    return { x: isNaN(parts[0]) ? 50 : parts[0], y: isNaN(parts[1]) ? 50 : parts[1] };
  }

  function getScale(img) {
    const t = getComputedStyle(img).transform;
    if (!t || t === 'none') return 1;
    try {
      const m = new DOMMatrix(t);
      return Math.max(0.01, m.a);
    } catch (_) {
      return 1;
    }
  }

  function rebuildOverrides() {
    const lines = Object.keys(state).map((key) => {
      const s = state[key];
      return `.acc-item[data-key="${key}"]:hover .acc-item__photo{transform-origin:${s.x.toFixed(2)}% ${s.y.toFixed(2)}% !important;}`;
    });
    overrideStyle.textContent = lines.join('\n');
  }

  function setActive(key, scrollClear) {
    if (activeKey && activeKey !== key) {
      const prevRow = list.querySelector(`.align-row[data-key="${activeKey}"]`);
      if (prevRow) prevRow.classList.remove('active');
    }
    activeKey = key;
    list.querySelector(`.align-row[data-key="${key}"]`).classList.add('active');
    if (scrollClear) {
      const accordion = document.getElementById('accordion');
      const item = state[key].item;
      const clearWidth = window.innerWidth - 300;
      const itemRect = item.getBoundingClientRect();
      const accRect = accordion.getBoundingClientRect();
      const targetLeft = accRect.left + clearWidth / 2 - itemRect.width / 2;
      accordion.scrollLeft += itemRect.left - targetLeft;
    }
  }

  function apply(key) {
    const s = state[key];
    s.crosshair.style.setProperty('--ax', s.x + '%');
    s.crosshair.style.setProperty('--ay', s.y + '%');
    list.querySelector(`.align-row[data-key="${key}"] .val`).textContent =
      `${s.x.toFixed(1)}% ${s.y.toFixed(1)}%`;
    rebuildOverrides();
  }

  items.forEach((item) => {
    const key = item.dataset.key;
    const img = item.querySelector('.acc-item__photo');
    const origin = parseOrigin(img);

    const drag = document.createElement('div');
    drag.className = 'align2-drag';
    item.appendChild(drag);

    const crosshair = document.createElement('div');
    crosshair.className = 'align2-crosshair';
    item.appendChild(crosshair);

    state[key] = { img, item, crosshair, initial: { ...origin }, x: origin.x, y: origin.y };

    const row = document.createElement('div');
    row.className = 'align-row';
    row.dataset.key = key;
    row.innerHTML = `<span class="key">${key}</span><span class="val"></span>`;
    row.addEventListener('click', () => setActive(key, true));
    list.appendChild(row);

    apply(key);

    let dragging = false, startX = 0, startY = 0, startPos = null;

    drag.addEventListener('pointerdown', (e) => {
      dragging = true;
      drag.classList.add('dragging');
      drag.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      startPos = { x: state[key].x, y: state[key].y };
      setActive(key);
    });

    drag.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = item.getBoundingClientRect();
      const s = getScale(img);
      const denom = Math.max(0.25, s - 1);
      const dxPx = e.clientX - startX;
      const dyPx = e.clientY - startY;
      let nx = startPos.x + (100 * dxPx) / (denom * rect.width);
      let ny = startPos.y + (100 * dyPx) / (denom * rect.height);
      nx = Math.min(100, Math.max(0, nx));
      ny = Math.min(100, Math.max(0, ny));
      state[key].x = nx;
      state[key].y = ny;
      apply(key);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      drag.classList.remove('dragging');
      try { drag.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    drag.addEventListener('pointerup', endDrag);
    drag.addEventListener('pointercancel', endDrag);

    item.addEventListener('click', (e) => {
      if (dragging) e.preventDefault();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!activeKey) return;
    const step = e.shiftKey ? 0.2 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    const s = state[activeKey];
    s.x = Math.min(100, Math.max(0, s.x + dx));
    s.y = Math.min(100, Math.max(0, s.y + dy));
    apply(activeKey);
  });

  panel.querySelector('#align-copy').addEventListener('click', () => {
    const lines = Object.keys(state).map((key) => {
      const s = state[key];
      return `${key}: transform-origin:${s.x.toFixed(1)}% ${s.y.toFixed(1)}%;`;
    });
    const out = lines.join('\n');
    panel.querySelector('#align-out').value = out;
    if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
  });

  panel.querySelector('#align-reset').addEventListener('click', () => {
    Object.keys(state).forEach((key) => {
      const s = state[key];
      s.x = s.initial.x;
      s.y = s.initial.y;
      apply(key);
    });
  });
})();
