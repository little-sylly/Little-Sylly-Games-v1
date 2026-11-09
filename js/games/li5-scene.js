// ═══════════════════════════════════════════════════════════════════════════
// li5-scene.js — Like I'm Five's world kit: the chalkboard (UI revamp pilot S2)
// Depends on: css/li5.css (classes), js/engine-intro.js (calls mount/beat/stop)
//
// Game-owned and PURE in the dyb-dice.js sense: inputs in, DOM out, reads no li5*
// state. Web Animations API only — no RAF, no timers — so reduced motion is the
// static tier (opts.reducedMotion → every write is instant). Pieces:
//   Li5Scene            { mount(el, opts), beat(i, text), stop() }  — the Intro board
//   li5Chalk(el, text)  write-on, word by word, in stepped clip-path
//   li5Duster(el)       wipe pass over el's box
//   li5Dust(el, x, y)   four-dot puff
//   li5TallySvg(n)      tally marks in groups of five (SVG string)
//   li5SlateTexture()   matte slate speckle, Canvas 2D once → cached data URL
// Every animating helper returns { finished: Promise, cancel() }.
// ═══════════════════════════════════════════════════════════════════════════

// ── Texture (made in code — no binary) ──────────────────────────────────────
let li5SlateUrl = null;
function li5SlateTexture() {
  if (li5SlateUrl !== null) return li5SlateUrl;
  li5SlateUrl = '';
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (!g) return li5SlateUrl;
    g.fillStyle = '#2f4a3c';
    g.fillRect(0, 0, 128, 128);
    // Deterministic speckle (no Math.random): same slate on every device.
    let s = 20261109;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 420; i++) {
      const light = rnd() > 0.45;
      g.fillStyle = light ? 'rgba(255,255,255,' + (0.02 + rnd() * 0.05).toFixed(3) + ')'
                          : 'rgba(0,0,0,' + (0.04 + rnd() * 0.08).toFixed(3) + ')';
      const r = 0.5 + rnd() * 1.4;
      g.fillRect(rnd() * 128, rnd() * 128, r, r);
    }
    // Faint ghost of old wipes: wide, low-alpha smears.
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(255,255,255,0.025)';
      g.fillRect(rnd() * 90, rnd() * 120, 30 + rnd() * 60, 3 + rnd() * 5);
    }
    li5SlateUrl = c.toDataURL('image/png');
  } catch (_) { li5SlateUrl = ''; }
  return li5SlateUrl;
}

// ── Animation plumbing ──────────────────────────────────────────────────────
function li5Done() { return { finished: Promise.resolve(), cancel() {} }; }

function li5Anim(el, keyframes, opts) {
  try {
    if (el && typeof el.animate === 'function') return el.animate(keyframes, opts);
  } catch (_) { /* fall through to static */ }
  return null;
}

// ── Chalk write-on ──────────────────────────────────────────────────────────
// Words become inline-block spans, each revealed left→right in steps(); the stagger
// follows reading order, so a wrapped line writes line by line. 0.5–0.8 s total.
function li5Chalk(el, text, opts) {
  const o = opts || {};
  if (!el) return li5Done();
  el.textContent = '';
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const spans = words.map((w, i) => {
    const sp = document.createElement('span');
    sp.className = 'li5-chalk-word';
    sp.textContent = w;
    el.appendChild(sp);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return sp;
  });
  if (o.reducedMotion || !words.length) return li5Done();
  const total = Math.min(800, Math.max(500, words.length * 55));
  const per = Math.max(90, total / Math.max(words.length, 1) * 1.6);
  const gap = words.length > 1 ? (total - per) / (words.length - 1) : 0;
  const anims = [];
  spans.forEach((sp, i) => {
    sp.style.clipPath = 'inset(0 100% 0 0)';
    const a = li5Anim(sp,
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: per, delay: Math.max(0, i * gap), easing: 'steps(6, end)', fill: 'forwards' });
    if (a) anims.push(a); else sp.style.clipPath = '';
  });
  if (!anims.length) return li5Done();
  const finished = Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => {
    spans.forEach(sp => { sp.style.clipPath = ''; });
  });
  return { finished, cancel() { anims.forEach(a => { try { a.cancel(); } catch (_) {} }); spans.forEach(sp => { sp.style.clipPath = ''; }); } };
}

// ── Dust puff ───────────────────────────────────────────────────────────────
function li5Dust(el, x, y, opts) {
  if (!el || (opts && opts.reducedMotion)) return li5Done();
  const dots = [];
  const anims = [];
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('span');
    d.className = 'li5-dust';
    d.style.left = ((x == null ? 20 : x) + (i - 1.5) * 7) + 'px';
    d.style.top = ((y == null ? 20 : y) + (i % 2) * 4) + 'px';
    el.appendChild(d);
    dots.push(d);
    const a = li5Anim(d,
      [{ opacity: 0.7, transform: 'translateY(0) scale(0.6)' }, { opacity: 0, transform: 'translateY(-14px) scale(1.4)' }],
      { duration: 450, delay: i * 40, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    if (a) anims.push(a);
  }
  const clean = () => dots.forEach(d => { if (d.parentNode) d.parentNode.removeChild(d); });
  if (!anims.length) { clean(); return li5Done(); }
  const finished = Promise.all(anims.map(a => a.finished.catch(() => {}))).then(clean);
  return { finished, cancel() { anims.forEach(a => { try { a.cancel(); } catch (_) {} }); clean(); } };
}

// ── Duster wipe ─────────────────────────────────────────────────────────────
// A felt duster slides across el's box (its host must be position:relative); the
// text under it fades as it passes. Resolves with the text already cleared.
function li5Duster(el, opts) {
  const o = opts || {};
  if (!el) return li5Done();
  const ms = o.duration || 450;
  const clear = () => { el.textContent = ''; el.style.opacity = ''; };
  if (o.reducedMotion) { clear(); return li5Done(); }
  const host = el.parentNode;
  const d = document.createElement('span');
  d.className = 'li5-duster';
  d.setAttribute('aria-hidden', 'true');
  if (host) host.appendChild(d);
  const aD = li5Anim(d,
    [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }],
    { duration: ms, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
  const aT = li5Anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, delay: ms * 0.15, easing: 'linear', fill: 'forwards' });
  const anims = [aD, aT].filter(Boolean);
  const drop = () => { if (d.parentNode) d.parentNode.removeChild(d); };
  if (!anims.length) { drop(); clear(); return li5Done(); }
  const finished = Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => {
    anims.forEach(a => { try { a.cancel(); } catch (_) {} });
    drop(); clear();
  });
  return { finished, cancel() { anims.forEach(a => { try { a.cancel(); } catch (_) {} }); drop(); clear(); } };
}

// ── Tally marks ─────────────────────────────────────────────────────────────
// n strokes in groups of five (four uprights + a strike). Pure string; the paths carry
// pathLength=1 so CSS (.li5-tally path) can draw them with stroke-dashoffset.
function li5TallySvg(n) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  if (!count) return '<svg class="li5-tally" viewBox="0 0 8 24" width="8" height="24" aria-label="0"></svg>';
  const groups = Math.ceil(count / 5);
  const gw = 34;
  let body = '';
  for (let g = 0; g < groups; g++) {
    const inG = Math.min(5, count - g * 5);
    const x0 = g * gw + 4;
    for (let k = 0; k < Math.min(inG, 4); k++) {
      const x = x0 + k * 6;
      body += '<path pathLength="1" d="M' + x + ' 3 L' + x + ' 21"/>';
    }
    if (inG === 5) body += '<path pathLength="1" d="M' + (x0 - 3) + ' 18 L' + (x0 + 24) + ' 6"/>';
  }
  const w = groups * gw - 4;
  return '<svg class="li5-tally" viewBox="0 0 ' + w + ' 24" width="' + w + '" height="24" role="img" aria-label="' + count + '">' + body + '</svg>';
}

// ── The Intro scene ─────────────────────────────────────────────────────────
const Li5Scene = (function () {
  let host = null, board = null, textEl = null, tagEl = null, reduced = false;
  let token = 0, live = null, lastBeat = null;

  function cancelLive() { if (live) { try { live.cancel(); } catch (_) {} live = null; } }

  function setTag(t) { if (tagEl) tagEl.textContent = t; }

  function dustAtEnd() {
    if (!board || !textEl) return;
    const b = board.getBoundingClientRect();
    const t = textEl.getBoundingClientRect();
    li5Dust(board, Math.min(b.width - 30, Math.max(20, t.left - b.left + Math.min(t.width, 200))), Math.max(10, t.bottom - b.top - 4), { reducedMotion: reduced });
  }

  // Wipe what's there (not on the first line), then write `text`.
  function show(text, tag, wipe) {
    const my = ++token;
    cancelLive();
    const write = () => {
      if (my !== token || !textEl) return;
      setTag(tag);
      live = li5Chalk(textEl, text, { reducedMotion: reduced });
      dustAtEnd();
    };
    if (wipe && !reduced && textEl && textEl.textContent) {
      live = li5Duster(textEl, { reducedMotion: reduced });
      live.finished.then(write);
    } else {
      if (textEl) { textEl.textContent = ''; textEl.style.opacity = ''; }
      write();
    }
  }

  return {
    mount(el, opts) {
      this.stop();
      host = el;
      reduced = !!(opts && opts.reducedMotion);
      el.innerHTML = '';
      board = document.createElement('div');
      board.className = 'li5-board';
      const tex = li5SlateTexture();
      if (tex) board.style.backgroundImage = 'url(' + tex + ')';
      tagEl = document.createElement('p');
      tagEl.className = 'li5-tag';
      tagEl.textContent = 'Lesson 1';
      textEl = document.createElement('p');
      textEl.className = 'li5-chalk';
      textEl.setAttribute('aria-hidden', 'true');       // the narrator line carries the text for screen readers
      const tray = document.createElement('div');
      tray.className = 'li5-tray';
      tray.setAttribute('aria-hidden', 'true');
      tray.innerHTML = '<span class="li5-stick"></span><span class="li5-stick li5-stick-pink"></span><span class="li5-eraser"></span>';
      board.appendChild(tagEl);
      board.appendChild(textEl);
      board.appendChild(tray);
      el.appendChild(board);
      lastBeat = null;
    },
    beat(i, text) {
      if (!board) return;
      const first = lastBeat === null;
      lastBeat = i;
      if (i < 0) show('Groups', 'Lesson 1', !first);  // the lesson's over: wipe and chalk the Line-up's heading
      else show(text, 'Lesson 1', i > 0);
    },
    stop() {
      token++;
      cancelLive();
      if (host) host.innerHTML = '';
      host = board = textEl = tagEl = null;
      lastBeat = null;
    },
  };
})();
