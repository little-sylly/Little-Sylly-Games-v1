// ═══════════════════════════════════════════════════════════════════════════
// eta-scene.js — ETA?'s world kit: E.T.A. Couriers, the Clipboard direction.
// Depends on: css/eta.css (classes), js/engine-intro.js (calls EtaScene.mount/beat/stop)
//
// Game-owned and PURE in the li5-scene.js sense: inputs in, DOM out, reads no eta*
// game state. Pieces:
//   etaFmtInt(n), etaDur(minutes)          number + friendly-duration formatting
//   etaRenderBadge(mode, {unreg,size})     THE render seam for the Ride mode badge
//   etaNoteInto(el, a, b)                  Dot's note ("FROM DOT · DEPOT MANAGER")
//   etaDocketInto(root, d, {compact,…})    the job docket (letterhead, URGENT, fields)
//   etaMakeBoard(root, {onRowTap})         the Run Sheet: time-lapse, shoves, Proof
//   EtaScene { mount, beat, stop }         the Intro: the dock at dawn, Dot, the door
// Boards: docs/new-ideas/eta/for archive/boards/depot-directions/{Main,Intro}.dc.html (the
// source of truth for every value and timing below).
// ═══════════════════════════════════════════════════════════════════════════

// ── Formatting ──────────────────────────────────────────────────────────────
function etaFmtInt(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// One decimal under 100 ("12.5 days", brief Sample 1), whole numbers above ("167 days").
function etaNum(x) { return x < 100 ? String(Math.round(x * 10) / 10) : etaFmtInt(x); }

// Minutes → friendly words, covering a few seconds to billions of years (board dur()).
function etaDur(min) {
  if (!(min > 0)) return '—';
  if (min < 1) return etaNum(min * 60) + ' sec';
  if (min < 60) return etaNum(min) + ' min';
  const h = min / 60;
  if (h < 48) return etaNum(h) + (h < 1.05 ? ' hr' : ' hrs');
  const d = h / 24;
  if (d < 60) return etaNum(d) + ' days';
  const mo = d / 30.44;
  if (mo < 24) return etaNum(mo) + ' months';
  const y = d / 365.25;
  if (y < 1e6) return etaNum(y) + ' years';
  if (y < 1e9) return etaNum(y / 1e6) + ' million years';
  return etaNum(y / 1e9) + ' billion years';
}

function etaKitEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function etaKitReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

// ── The render seam: the Ride mode badge (spec §10) ─────────────────────────
// The ONLY place a badge is built — Run Sheet rows, the Ride card, the tally, the
// how-to. A skin (asset kind 'eta-badge', id = the mode) needs no logic change.
const ETA_BADGE_SVG = {
  land:  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="#22201B" stroke-width="1.8"/><circle cx="8" cy="8" r="1.8" fill="#EA580C"/><path d="M8 2.5 V6 M8 10 V13.5 M2.5 8 H6 M10 8 H13.5" fill="none" stroke="#22201B" stroke-width="1.3"/></svg>',
  air:   '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8.5 L14.5 2.5 L10.5 14 L7.8 9.8 Z" fill="#EA580C" stroke="#22201B" stroke-width="1.3" stroke-linejoin="round"/><path d="M7.8 9.8 L14.5 2.5" fill="none" stroke="#22201B" stroke-width="1.1"/></svg>',
  sea:   '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6 C3.5 4, 5 8, 8 6 S12.5 4, 14.5 6" fill="none" stroke="#1F4FA6" stroke-width="1.8" stroke-linecap="round"/><path d="M1.5 10.5 C3.5 8.5, 5 12.5, 8 10.5 S12.5 8.5, 14.5 10.5" fill="none" stroke="#22201B" stroke-width="1.8" stroke-linecap="round"/></svg>',
  space: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="#EA580C" stroke="#22201B" stroke-width="1.3"/><ellipse cx="8" cy="8" rx="7.2" ry="2.4" fill="none" stroke="#22201B" stroke-width="1.3" transform="rotate(-20 8 8)"/></svg>',
};
const ETA_MODE_LABEL = { land: 'Land', sea: 'Sea', air: 'Air', space: 'Space' };

function etaRenderBadge(mode, opts) {
  opts = opts || {};
  const m = ETA_BADGE_SVG[mode] ? mode : 'land';
  const size = opts.size || 28;
  const el = document.createElement('span');
  el.className = 'eta-badge' + (opts.unreg ? ' is-unreg' : '');
  el.style.width = el.style.height = size + 'px';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${ETA_MODE_LABEL[m]}${opts.unreg ? ', unregistered' : ''}`);
  const url = (typeof assetFace === 'function') && assetFace('eta-badge', m);
  if (url) {
    el.classList.add('eta-badge-asset');
    el.style.backgroundImage = `url("${url}")`;
    return el;
  }
  el.innerHTML = `<span class="eta-badge-face">${ETA_BADGE_SVG[m]}</span>`;
  return el;
}

// ── Dot's note ──────────────────────────────────────────────────────────────
function etaNoteInto(el, a, b, opts) {
  if (!el) return;
  const anim = !(opts && opts.instant) && !etaKitReduced();
  el.innerHTML = `<span class="eta-note-from">FROM DOT · DEPOT MANAGER</span>`
    + `<span class="eta-note-a${anim ? ' eta-type-a' : ''}">${etaKitEsc(a || '')}</span>`
    + (b ? `<span class="eta-note-b eta-mark${anim ? ' eta-type-b' : ''}">${etaKitEsc(b)}</span>` : '');
}

// ── Letterhead (shared by the docket and the board) ─────────────────────────
function etaLetterheadHtml(runLabel, jobNo) {
  return `<div class="eta-lh">
      <div class="eta-lh-co"><span class="eta-sten eta-lh-name">E.T.A.</span>
        <span class="eta-lh-motto">EVERY THING, ANYWHERE.</span><span class="eta-mark eta-lh-ev">Eventually.</span></div>
      <div class="eta-jobbox"><span class="eta-jobbox-run" data-eta-run>${etaKitEsc(runLabel || '')}</span>
        <span class="eta-sten eta-jobbox-no" data-eta-job>${etaKitEsc(jobNo || '')}</span></div>
    </div>`;
}

// ── The job docket ──────────────────────────────────────────────────────────
// d: { runLabel, jobNo, route: { headline, km|null, briefing[], offMap }, flavour }
function etaDocketInto(root, d, opts) {
  if (!root) return;
  opts = opts || {};
  const compact = !!opts.compact;
  const anim = !opts.reducedMotion && !compact;
  const r = d.route || {};
  const off = !!r.offMap;
  const dist = r.km > 0 ? `≈ ${etaFmtInt(r.km)} KM` : 'GPS OFF — your guess';
  const lines = (r.briefing || []).map(l => `<li>${etaKitEsc(l)}</li>`).join('');
  root.innerHTML = `<div class="eta-clip eta-docket${compact ? ' is-compact' : ''}${anim ? ' is-anim' : ''}${off ? ' is-offmap' : ''}">
      ${compact ? `<div class="eta-docket-mini"><span>${etaKitEsc(d.runLabel || '')}</span><span class="eta-sten">${etaKitEsc(d.jobNo || '')}</span></div>`
                : etaLetterheadHtml(d.runLabel, d.jobNo) + '<span class="eta-urgent eta-sten">URGENT</span>'}
      <div class="eta-hv${anim ? ' eta-sheen-loop' : ''}"></div>
      ${off ? '<div class="eta-gpslost"><span aria-hidden="true">📡</span> GPS Signal Lost…</div>' : ''}
      <div class="eta-field eta-f1"><b>ROUTE</b><span class="eta-dots"></span><b class="eta-field-val">${etaKitEsc(r.headline || '')}</b></div>
      <div class="eta-field eta-f2"><b>DISTANCE</b><span class="eta-dots"></span><b class="eta-field-val">${etaKitEsc(dist)}</b></div>
      <div class="eta-briefing eta-f3"><span class="eta-briefing-label">DISPATCH BRIEFING</span><ul>${lines}</ul></div>
      ${compact ? '' : '<div class="eta-note eta-f4" data-eta-note></div>'}
    </div>`;
  if (!compact) etaNoteInto(root.querySelector('[data-eta-note]'), d.flavour || 'Righto, next job.', 'Lock in your ETAs. No peeking at Rides.', { instant: !anim });
}

// ═══════════════════════════════════════════════════════════════════════════
// The Run Sheet board
// ═══════════════════════════════════════════════════════════════════════════
const ETA_LANDMARKS = [
  { v: 1, label: '1 MIN' }, { v: 60, label: '1 HR' }, { v: 1440, label: '1 DAY' }, { v: 10080, label: '1 WK' },
  { v: 43830, label: '1 MO' }, { v: 525960, label: '1 YR' }, { v: 5259600, label: '10 YR' },
  { v: 52596000, label: '100 YR' }, { v: 525960000, label: '1K YR' }, { v: 5259600000, label: '10K YR' },
  { v: 52596000000, label: '100K YR' }, { v: 525960000000, label: '1M YR' },
];
const ETA_SWEEP_MS = 4600;   // board: the time-lapse sweep at speed 1

// The axis for a set of values (minutes): padded to the landmarks either side.
// Before Proof it is fed Logged (+ Revised) ETAs ONLY — the truths would leak.
function etaScaleFor(values) {
  const vs = values.filter(v => v > 0);
  if (!vs.length) return { lo: 1, hi: 525960 };
  const mn = Math.min(...vs), mx = Math.max(...vs);
  let lo = mn / 2, hi = mx * 2;
  const below = ETA_LANDMARKS.filter(l => l.v <= lo).pop();
  const above = ETA_LANDMARKS.find(l => l.v >= hi);
  if (below) lo = below.v; else lo = Math.max(lo, 0.05);
  if (above) hi = above.v;
  if (hi / lo < 30) { lo = lo / 3; hi = hi * 3; }
  return { lo, hi };
}
function etaScalePos(sc, v) { return Math.max(0, Math.min(1, Math.log(v / sc.lo) / Math.log(sc.hi / sc.lo))); }

function etaMakeBoard(root, opts) {
  opts = opts || {};
  const B = { root, rows: [], sc: { lo: 1, hi: 525960 }, reduced: false, revealed: false, timers: [], iv: null, queue: [], done: null,
              selectable: null, selected: -1, stamped: -1, ghost: -1, ghostMult: 1, mine: -1 };
  root.innerHTML = `<div class="eta-clip eta-board">
      <div class="eta-clamp" aria-hidden="true"><span></span></div>
      <div data-eta-lh>${etaLetterheadHtml('', '')}</div>
      <div class="eta-hv eta-sheen-loop" data-eta-band></div>
      <div class="eta-sheet-head"><span class="eta-sten">THE RUN SHEET</span><span class="eta-ticker"><span data-eta-ticker>0 min</span><i class="eta-caret"></i></span></div>
      <div class="eta-sheet-body"><div class="eta-ticks" data-eta-ticks></div><div class="eta-rows" data-eta-rows></div></div>
      <div class="eta-note" data-eta-note></div>
      <div class="eta-fx" data-eta-fx aria-hidden="true"></div>
    </div>`;
  const $ = s => root.querySelector(s);
  const clip = $('.eta-board'), ticker = $('[data-eta-ticker]'), ticksEl = $('[data-eta-ticks]'),
        rowsEl = $('[data-eta-rows]'), noteEl = $('[data-eta-note]'), fx = $('[data-eta-fx]');

  rowsEl.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('[data-eta-row]');
    if (!btn || btn.disabled) return;
    const i = Number(btn.dataset.etaRow);
    if (B.selectable && B.selectable(i) && typeof opts.onRowTap === 'function') opts.onRowTap(i);
  });

  // ── timeline (the board's play/settle: every event has an instant form) ──
  function clearTL() {
    B.timers.forEach(h => clearTimeout(h)); B.timers = [];
    if (B.iv) { clearInterval(B.iv); B.iv = null; }
  }
  function finish() {
    clearTL();
    B.queue = [];
    const d = B.done; B.done = null;
    if (d) d();
  }
  function play(events, done) {
    clearTL();
    B.queue = events.slice().sort((a, b) => a.at - b.at);
    B.done = done;
    if (B.reduced) { B.queue.forEach(ev => { ev.fired = true; ev.fn(true); }); finish(); return; }
    B.queue.forEach(ev => {
      // WHY: board choreography — each beat lands at its board time; skip() runs them all instantly.
      B.timers.push(setTimeout(() => {
        if (ev.fired) return;
        ev.fired = true;
        try { ev.fn(false); } catch (e) { console.warn('[eta board]', e); }
        if (B.queue.every(x => x.fired)) finish();
      }, ev.at));
    });
  }
  B.skip = function () {
    if (!B.queue.length) return;
    clearTL();
    B.queue.forEach(ev => { if (!ev.fired) { ev.fired = true; try { ev.fn(true); } catch (e) { console.warn('[eta board]', e); } } });
    finish();
  };
  B.isPlaying = () => B.queue.some(ev => !ev.fired);
  B.stop = function () { clearTL(); B.queue = []; B.done = null; };
  B.setReduced = v => { B.reduced = !!v; clip.classList.toggle('is-reduced', B.reduced); };

  // ── axis ──
  function paintTicks(lit) {
    const sc = B.sc;
    let last = -1, k = 0;
    ticksEl.innerHTML = ETA_LANDMARKS.filter(l => l.v >= sc.lo && l.v <= sc.hi).map(l => {
      const p = etaScalePos(sc, l.v);
      if (last >= 0 && p - last < 0.1) return '';
      last = p;
      const low = (k++ % 2) ? ' is-low' : '';   // board: labels alternate between two rows
      // End labels anchor inward so "100K YR" never hangs off the paper.
      const edge = p > 0.9 ? ' is-end' : p < 0.06 ? ' is-start' : '';
      return `<span class="eta-tick${lit ? ' is-lit' : ''}${edge}${low}" data-p="${p}" style="left:${(p * 100).toFixed(2)}%"><i>${l.label}</i></span>`;
    }).join('');
  }
  function litTicks(clock) {
    ticksEl.querySelectorAll('.eta-tick').forEach(t => { if (Number(t.dataset.p) <= clock + 0.002) t.classList.add('is-lit'); });
  }

  // ── rows ──
  function pct(v) { return (etaScalePos(B.sc, v) * 100).toFixed(2) + '%'; }
  function setT(el, prop, val, ms, ease) {
    el.style.transition = ms ? `${prop} ${ms}ms ${ease || 'linear'}` : 'none';
    el.style[prop] = val;
  }
  function placeEnd(R, v, ms, ease) {
    const p = etaScalePos(B.sc, v);
    setT(R.tape, 'width', (p * 100).toFixed(2) + '%', ms, ease);
    setT(R.rider, 'left', (p * 100).toFixed(2) + '%', ms, ease);
    R.tag.textContent = etaDur(v);
    R.tag.classList.toggle('is-in', p > 0.62);
    R.tag.style.left = p > 0.62 ? '' : `calc(${(p * 100).toFixed(2)}% + 17px)`;
    R.tag.style.right = p > 0.62 ? `calc(${(100 - p * 100).toFixed(2)}% + 17px)` : '';
    R.end = v;
  }

  B.setHeader = function (h) {
    const run = $('[data-eta-run]'), job = $('[data-eta-job]');
    if (run) run.textContent = h.runLabel || '';
    if (job) job.textContent = h.jobNo || '';
  };
  B.setNote = (a, b) => etaNoteInto(noteEl, a, b, { instant: B.reduced });

  B.setRows = function (rows, o) {
    B.stop();
    fx.innerHTML = '';
    clip.classList.remove('eta-jolt');
    B.revealed = false;
    B.mine = o && o.mine >= 0 ? o.mine : -1;
    B.sc = etaScaleFor(rows.map(r => r.logged));
    rowsEl.innerHTML = '';
    B.rows = rows.map((r, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'eta-row' + (i === B.mine ? ' is-mine' : '');
      el.dataset.etaRow = String(i);
      el.setAttribute('aria-label', `${r.name}, ${r.ride}`);
      el.innerHTML = `<span class="eta-row-name eta-sten">${etaKitEsc(r.name)}${i === B.mine ? ' <i>(you)</i>' : ''}</span>
        <span class="eta-row-ride">${etaKitEsc(r.ride)}</span>
        <span class="eta-row-km eta-mark"></span>
        <span class="eta-vstamp"><b class="eta-sten"></b><small></small></span>
        <span class="eta-mystamp" aria-hidden="true">STAMPED</span>
        <span class="eta-track">
          <span class="eta-ghost"></span><span class="eta-myghost"></span>
          <span class="eta-tape eta-hv"></span>
          <span class="eta-gap"></span><span class="eta-dropline"></span>
          <span class="eta-parcel"><i></i><b></b></span><span class="eta-puff"></span>
          <span class="eta-star">★</span>
          <span class="eta-rider"><span class="eta-rider-mv"></span></span>
          <span class="eta-tag"></span>
          <span class="eta-banner eta-sten"></span>
          <span class="eta-amend eta-mark"></span>
        </span>`;
      rowsEl.appendChild(el);
      const q = s => el.querySelector(s);
      const R = { el, data: r, logged: r.logged, end: null, truth: null,
        tape: q('.eta-tape'), rider: q('.eta-rider'), tag: q('.eta-tag'), ghost: q('.eta-ghost'), myghost: q('.eta-myghost'),
        gap: q('.eta-gap'), drop: q('.eta-dropline'), parcel: q('.eta-parcel'), puff: q('.eta-puff'), star: q('.eta-star'),
        vst: q('.eta-vstamp'), km: q('.eta-row-km'), banner: q('.eta-banner'), amend: q('.eta-amend'), ride: q('.eta-row-ride') };
      const badge = etaRenderBadge(r.mode, { unreg: r.unreg, size: 28 });
      R.rider.firstElementChild.appendChild(badge);
      R.rider.firstElementChild.classList.add('eta-mv-' + (r.mode || 'land'));
      setT(R.tape, 'width', '0%');
      setT(R.rider, 'left', '0%');
      if (!(r.logged > 0)) { el.classList.add('is-noeta'); R.tag.textContent = 'No ETA'; R.tag.classList.add('is-shown'); R.rider.style.display = 'none'; }
      return R;
    });
    paintTicks(false);
    ticker.textContent = etaDur(B.sc.lo);
    B.setSelectable(null);
  };

  // ── selection, my Stamp, my ghost (local only — never another seat's) ──
  B.setSelectable = function (fn) {
    B.selectable = fn;
    B.rows.forEach((R, i) => {
      const can = !!(fn && fn(i));
      R.el.classList.toggle('is-selectable', can);
      R.el.disabled = !can;
    });
  };
  B.setSelected = function (i) { B.selected = i; B.rows.forEach((R, k) => R.el.classList.toggle('is-selected', k === i)); };
  B.setStamped = function (i) { B.stamped = i; B.rows.forEach((R, k) => R.el.classList.toggle('is-stamped', k === i)); };
  B.setGhost = function (i, mult) {
    B.rows.forEach((R, k) => {
      const on = k === i && R.logged > 0 && Math.abs(mult - 1) > 1e-9;
      R.myghost.style.display = on ? 'block' : 'none';
      if (on) {
        const a = etaScalePos(B.sc, R.logged), b = etaScalePos(B.sc, R.logged * mult);
        R.myghost.style.left = (Math.min(a, b) * 100).toFixed(2) + '%';
        R.myghost.style.width = (Math.abs(b - a) * 100).toFixed(2) + '%';
        R.myghost.classList.toggle('is-up', b > a);
      }
    });
  };

  // ── the time-lapse reveal ──
  B.settleReveal = function () {
    if (B.revealed) return;
    B.revealed = true;
    B.rows.forEach(R => { if (R.logged > 0) { placeEnd(R, R.logged, 0); R.tag.classList.add('is-shown'); } });
    paintTicks(true);
    ticker.textContent = 'ALL LOGGED';
  };
  B.reveal = function (done) {
    if (B.revealed) { if (done) done(); return; }
    const S = 300, SW = ETA_SWEEP_MS;
    const ev = [];
    ev.push({ at: S, fn: inst => {
      if (inst) return;
      const t0 = Date.now();
      B.rows.forEach(R => {
        if (!(R.logged > 0)) return;
        const p = etaScalePos(B.sc, R.logged);
        void R.tape.offsetWidth;
        placeEnd(R, R.logged, Math.max(1, p * SW), 'linear');
        R.tag.classList.remove('is-shown');
        R.rider.firstElementChild.classList.add('is-moving');
      });
      // WHY: the ticker counts up the log scale in step with the strips (board runClock).
      B.iv = setInterval(() => {
        const f = Math.min(1, (Date.now() - t0) / SW);
        ticker.textContent = etaDur(B.sc.lo * Math.pow(B.sc.hi / B.sc.lo, f));
        litTicks(f);
        if (f >= 1 && B.iv) { clearInterval(B.iv); B.iv = null; }
      }, 50);
    } });
    B.rows.forEach(R => {
      if (!(R.logged > 0)) return;
      const p = etaScalePos(B.sc, R.logged);
      ev.push({ at: S + p * SW + 20, fn: inst => {
        if (inst) return;
        R.rider.firstElementChild.classList.remove('is-moving');
        R.tag.classList.add('is-shown');
        etaKitRetrigger(R.tape, 'eta-thunk');
        etaKitRetrigger(R.rider.firstElementChild, 'eta-skid');
        if (typeof playSliderTick === 'function') playSliderTick();
      } });
    });
    ev.push({ at: S + SW + 350, fn: () => {
      B.rows.forEach(R => R.rider.firstElementChild.classList.remove('is-moving'));
      B.settleReveal();
    } });
    play(ev, done);
  };

  // ── Sylly: the Corrections reveal (red-pen amendments shove the tapes) ──
  B.shove = function (list, revised, done) {
    B.settleReveal();
    const vals = B.rows.map((R, i) => [R.logged, revised[i]]).flat();
    const ev = [];
    const step = 900;
    ev.push({ at: 0, fn: inst => { refit(vals, inst ? 0 : 350); } });
    const cur = B.rows.map(R => R.logged);
    list.forEach((c, k) => {
      const R = B.rows[c.to];
      if (!R || !(R.logged > 0)) return;
      cur[c.to] = cur[c.to] * c.mult;
      const to = cur[c.to];
      ev.push({ at: 450 + k * step, fn: inst => {
        R.ghost.style.display = 'block';
        R.ghost.style.width = pct(R.logged);
        const lab = c.mult >= 1 ? `×${etaKitTrim(c.mult)}` : `÷${etaKitTrim(1 / c.mult)}`;
        R.amend.textContent = (R.amend.textContent ? R.amend.textContent + ' ' : '') + lab;
        R.amend.title = c.from ? `${c.from}: ${lab}` : lab;
        R.amend.style.left = pct(to);
        if (!inst) etaKitRetrigger(R.amend, 'eta-chip');
        placeEnd(R, to, inst ? 0 : 460, 'cubic-bezier(.3,1.5,.5,1)');
        if (!inst && typeof playWhoosh === 'function') playWhoosh();
      } });
    });
    ev.push({ at: 450 + list.length * step + 300, fn: () => {} });
    play(ev, done);
  };

  function refit(values, ms) {
    B.sc = etaScaleFor(values);
    B.rows.forEach(R => {
      if (R.end > 0) placeEnd(R, R.end, ms, 'ease-out');
      if (R.logged > 0 && R.ghost.style.display === 'block') setT(R.ghost, 'width', pct(R.logged), ms, 'ease-out');
    });
    paintTicks(true);
  }

  // ── Proof of Delivery ──
  // rows[i]: { truth, verdict:{top,bot,kind}, kmLabel, banner:'spin'|'back'|null, fact, quip }
  B.proof = function (prow, best, done) {
    B.settleReveal();
    const ev = [];
    const vals = B.rows.map((R, i) => [R.logged, R.end, prow[i] && prow[i].truth]).flat();
    ev.push({ at: 0, fn: inst => { refit(vals, inst ? 0 : 400); } });
    const P = 450;
    ev.push({ at: P, fn: inst => {
      if (inst) return;
      const s = document.createElement('div');
      s.className = 'eta-bigstamp eta-anim-bigstamp';
      s.innerHTML = '<span class="eta-sten">PROOF OF</span><span class="eta-sten">DELIVERY</span><small>★ E.T.A. DEPOT ★</small>';
      fx.appendChild(s);
      etaKitRetrigger(clip, 'eta-jolt');
      if (typeof playAbyssThud === 'function') playAbyssThud();
      // WHY: the big stamp clears itself after its 1.75 s keyframe; skip removes it too.
      B.timers.push(setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, 1800));
    } });
    const Q = P + 1800, step = 1350;
    B.rows.forEach((R, i) => {
      const pr = prow[i];
      if (!pr) return;
      R.truth = pr.truth;
      const b = Q + i * step;
      ev.push({ at: b, fn: inst => {
        if (!(pr.truth > 0)) return;
        R.parcel.style.left = pct(pr.truth); R.drop.style.left = pct(pr.truth); R.puff.style.left = pct(pr.truth);
        R.el.classList.add('s-parcel');
        if (!inst) {
          etaKitRetrigger(R.parcel, 'eta-anim-drop'); etaKitRetrigger(R.puff, 'eta-anim-puff');
          if (typeof playHullThud === 'function') playHullThud();
          B.setNote(pr.fact, pr.quip);
        }
      } });
      ev.push({ at: b + 520, fn: () => {
        if (!(pr.truth > 0) || !(R.logged > 0)) return;
        const a = etaScalePos(B.sc, R.logged), t = etaScalePos(B.sc, pr.truth);
        if (pr.verdict.kind === 'dead') { R.el.classList.add('s-bull'); R.star.style.left = pct(pr.truth); return; }
        R.gap.style.left = (Math.min(a, t) * 100).toFixed(2) + '%';
        R.gap.style.width = (Math.max(0.6, Math.abs(t - a) * 100)).toFixed(2) + '%';
        R.gap.classList.toggle('is-fast', pr.verdict.kind === 'fast' || (pr.verdict.kind === 'close' && R.logged < pr.truth));
        R.gap.style.transformOrigin = t > a ? 'left center' : 'right center';
        R.el.classList.add('s-gap');
      } });
      ev.push({ at: b + 700, fn: inst => {
        R.vst.querySelector('b').textContent = pr.verdict.top;
        R.vst.querySelector('small').textContent = pr.verdict.bot;
        R.vst.className = `eta-vstamp is-${pr.verdict.kind}`;
        R.el.classList.add('s-stamp');
        if (!inst) etaKitRetrigger(R.vst, 'eta-anim-stamp');
        if (pr.banner) {
          R.banner.textContent = pr.banner === 'spin' ? 'SPIN-OUT' : 'BACK ON COURSE';
          R.banner.className = `eta-banner eta-sten is-${pr.banner}`;
          R.el.classList.add('s-banner');
          if (!inst) {
            etaKitRetrigger(R.banner, pr.banner === 'spin' ? 'eta-anim-spin' : 'eta-anim-back');
            const snd = pr.banner === 'spin' ? 'playSplash' : 'playClashWin';
            if (typeof window[snd] === 'function') window[snd]();
          }
        } else if (!inst && pr.verdict.kind === 'dead' && typeof playClashWin === 'function') playClashWin();
      } });
      ev.push({ at: b + 1100, fn: inst => {
        R.km.textContent = pr.kmLabel;
        R.el.classList.add('s-km');
        if (!inst) etaKitRetrigger(R.km, 'eta-chip');
      } });
    });
    ev.push({ at: Q + B.rows.length * step + 200, fn: inst => {
      noteEl.innerHTML = `<span class="eta-note-from">FROM DOT · DEPOT MANAGER</span>
        <div class="eta-signoff"><div><span class="eta-signoff-head">RECEIVED IN GOOD ORDER</span>
        <span class="eta-mark eta-signoff-best">${best ? `Bullseye: ${etaKitEsc(best.name)} · ${etaKitEsc(best.km)}` : "No bullseyes. Paperwork's paperwork."}</span></div>
        <svg class="eta-sig${inst ? '' : ' eta-anim-sign'}" viewBox="0 0 104 40" aria-hidden="true"><path d="M6 30 C10 8, 22 6, 20 22 C18 34, 6 34, 10 22 C14 12, 28 14, 30 26 C32 34, 40 30, 42 20 C44 12, 50 14, 50 24 C50 32, 58 30, 62 18 L64 10 M58 18 L70 16 C76 16, 78 26, 86 24 S98 14, 100 22" fill="none" stroke="#1F4FA6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
      if (best && !inst) confetti(B.rows.findIndex(R => R.el.classList.contains('s-bull')));
    } });
    play(ev, done);
  };

  function confetti(i) {
    const R = B.rows[i];
    if (!R) return;
    const cr = clip.getBoundingClientRect(), pr = R.parcel.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'eta-confetti';
    box.style.left = (pr.left - cr.left + pr.width / 2) + 'px';
    box.style.top = (pr.top - cr.top) + 'px';
    const cols = ['#FF6A13', '#C42A1E', '#1F4FA6', '#C99459', '#D9DEE3'];
    for (let j = 0; j < 24; j++) {
      const s = document.createElement('i');
      const dot = j % 3 === 0;
      s.className = 'eta-cf eta-cf' + (j % 8);
      s.style.background = cols[j % 5];
      s.style.width = (dot ? 6 : 10) + 'px'; s.style.height = (dot ? 6 : 5) + 'px';
      s.style.borderRadius = dot ? '50%' : '1px';
      s.style.animationDelay = ((j % 4) * 70) + 'ms';
      box.appendChild(s);
    }
    fx.appendChild(box);
    // WHY: confetti is a one-shot 1.6 s keyframe; remove the nodes after it.
    B.timers.push(setTimeout(() => { if (box.parentNode) box.parentNode.removeChild(box); }, 1900));
  }

  return B;
}

function etaKitTrim(x) { return x >= 10 ? String(Math.round(x)) : String(Math.round(x * 100) / 100); }
function etaKitRetrigger(el, cls) {
  if (!el || !el.classList) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ═══════════════════════════════════════════════════════════════════════════
// The Intro — Dot's toolbox talk on the loading dock at dawn (Intro.dc.html)
// ═══════════════════════════════════════════════════════════════════════════
const EtaScene = (() => {
  let root = null, raf = 0, timers = [];
  const later = (fn, ms) => { const h = setTimeout(fn, ms); timers.push(h); return h; };

  const DOCK_SVG = `<svg class="eta-dock" viewBox="0 0 375 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="etaSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2A44"/><stop offset=".45" stop-color="#4A4E6B"/><stop offset="1" stop-color="#E9895A"/></linearGradient>
      <radialGradient id="etaSun"><stop offset="0" stop-color="#FFD9A0"/><stop offset="1" stop-color="#FFAA5A" stop-opacity="0"/></radialGradient>
      <pattern id="etaDoor" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="5" fill="#A4A9AF"/><rect y="5" width="12" height="3" fill="#7C8187"/><rect y="8" width="12" height="4" fill="#9399A0"/></pattern>
      <pattern id="etaHaz" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#FFC21A"/><rect x="5" width="5" height="10" fill="#22201B"/></pattern>
      <clipPath id="etaBay"><rect x="34" y="82" width="307" height="218"/></clipPath>
    </defs>
    <rect width="375" height="300" fill="url(#etaSky)"/>
    <circle class="eta-sun" cx="295" cy="270" r="45" fill="url(#etaSun)"/>
    <rect x="0" y="60" width="375" height="22" fill="#3A3C41"/><rect x="0" y="79" width="375" height="3" fill="#1C1D20"/>
    <text x="187.5" y="75" text-anchor="middle" class="eta-sten" font-size="13" fill="#FF6A13" letter-spacing="1">E.T.A. DEPOT · DOCK 3</text>
    <rect x="0" y="82" width="34" height="218" fill="#3A3C41"/><rect x="341" y="82" width="34" height="218" fill="#3A3C41"/>
    <g clip-path="url(#etaBay)">
      <rect x="34" y="82" width="307" height="218" fill="#33302A"/>
      <rect x="34" y="152" width="307" height="4" fill="#5A4D3A"/><rect x="34" y="232" width="307" height="4" fill="#5A4D3A"/>
      <path d="M48 152 q0 -40 36 -40 q36 0 36 40 z" fill="#5E6B55"/>
      <rect x="54" y="128" width="58" height="8" fill="url(#etaHaz)" transform="rotate(-6 83 132)"/>
      <text x="58" y="146" class="eta-sten" font-size="7" fill="#FFC21A" transform="rotate(-6 70 144)">NO REGO</text>
      <path d="M258 152 q0 -36 31 -36 q31 0 31 36 z" fill="#6E5A7A"/>
      <rect x="134" y="186" width="70" height="14" rx="7" fill="#A13A52" stroke="#E2B54A" stroke-width="2" transform="rotate(-4 169 193)"/>
      <g fill="none" stroke="#B9BCC1" stroke-width="2.5" stroke-linejoin="round" transform="translate(234 194)"><path d="M2 4 H10 L16 26 H46 L51 10 H13"/><path d="M16 26 L18 32 H44"/><circle cx="21" cy="36" r="3" fill="#B9BCC1"/><circle cx="41" cy="36" r="3" fill="#B9BCC1"/></g>
      <g transform="translate(304 174)" fill="none" stroke-linecap="round"><path d="M1 3 H13" stroke="#B9BCC1" stroke-width="2.5"/><path d="M7 3 V44" stroke="#B9BCC1" stroke-width="2"/><path d="M2 38 H12" stroke="#FF6A13" stroke-width="2.5"/><path d="M7 44 L4 47 L10 50 L4 53 L7 56 V60" stroke="#B9BCC1" stroke-width="1.6"/></g>
      <circle class="eta-mote" cx="150" cy="200" r="1.6" fill="#FFD9A0"/><circle class="eta-mote eta-mote2" cx="220" cy="230" r="1.2" fill="#FFD9A0"/><circle class="eta-mote eta-mote3" cx="100" cy="240" r="1.2" fill="#FFD9A0"/>
    </g>
    <rect x="0" y="262" width="375" height="38" fill="#5A5D62"/>
    <g transform="translate(152 228)"><rect width="70" height="40" fill="#A97D4D" stroke="#6E4E2C" stroke-width="2"/><path d="M20 0 V40 M42 0 V40" stroke="#6E4E2C" stroke-width="2"/><text x="7" y="25" class="eta-sten" font-size="9" fill="#3E2A16">FRAGILE</text></g>
    <g class="eta-dot" transform="translate(157 120)">
      <g class="eta-dot-body">
        <rect x="17" y="82" width="10" height="28" rx="2" fill="#2E3F5E"/><rect x="33" y="82" width="10" height="28" rx="2" fill="#2E3F5E"/>
        <rect x="14" y="106" width="14" height="6" rx="2" fill="#1C1D20"/><rect x="32" y="106" width="14" height="6" rx="2" fill="#1C1D20"/>
        <rect x="10" y="38" width="40" height="50" rx="10" fill="#E5DABE"/>
        <rect x="10" y="38" width="13" height="50" rx="6" fill="#FF6A13"/><rect x="37" y="38" width="13" height="50" rx="6" fill="#FF6A13"/>
        <rect x="10" y="66" width="13" height="8" fill="#E7EBEE"/><rect x="37" y="66" width="13" height="8" fill="#E7EBEE"/>
        <rect x="44" y="42" width="7" height="32" rx="3.5" fill="#E9B98E" transform="rotate(-20 47.5 42)"/>
        <g transform="rotate(-10 11 67)"><rect x="0" y="54" width="22" height="26" rx="2" fill="#C99459" stroke="#6E4E2C" stroke-width="2"/><rect x="6" y="50" width="8" height="5" rx="2" fill="#8D9299"/><rect x="3" y="59" width="12" height="14" fill="#FFFCF3"/></g>
        <g class="eta-dot-arm"><rect x="6" y="42" width="7" height="26" rx="3.5" fill="#E9B98E"/></g>
        <rect x="25" y="30" width="10" height="10" fill="#E9B98E"/>
        <circle cx="30" cy="18" r="16" fill="#E9B98E"/>
        <path d="M10 14 q0 -18 20 -18 q20 0 20 18 v-4 h-40 z" fill="#8A8F98"/>
        <ellipse cx="12.5" cy="11" rx="4.5" ry="7" fill="#8A8F98"/><ellipse cx="47.5" cy="11" rx="4.5" ry="7" fill="#8A8F98"/>
        <rect x="45" y="0" width="3" height="16" rx="1" fill="#1F4FA6" transform="rotate(30 46.5 8)"/>
        <rect x="20" y="16" width="8" height="6" rx="2" fill="none" stroke="#22201B" stroke-width="1.5"/><rect x="31" y="16" width="8" height="6" rx="2" fill="none" stroke="#22201B" stroke-width="1.5"/>
        <rect x="28" y="18" width="3" height="1.5" fill="#22201B"/>
        <path class="eta-dot-mouth" d="M26 25 h8 v1 a4 3 0 0 1 -8 0 z" fill="#7A3A2A"/>
      </g>
    </g>
    <g class="eta-door">
      <rect x="0" y="0" width="375" height="262" fill="url(#etaDoor)"/>
      <rect x="0" y="250" width="375" height="12" fill="#FF6A13"/><rect x="0" y="254" width="375" height="4" fill="#E7EBEE"/>
      <g transform="translate(117 98)"><rect width="141" height="64" fill="rgba(28,29,32,.88)" stroke="#FF6A13" stroke-width="3"/>
        <text x="70.5" y="30" text-anchor="middle" class="eta-sten" font-size="27" fill="#FF6A13">E.T.A.</text>
        <text x="70.5" y="44" text-anchor="middle" class="eta-sten" font-size="9.5" fill="#F1EEE6" letter-spacing=".8">EVERY THING, ANYWHERE.</text>
        <text x="70.5" y="57" text-anchor="middle" font-size="10.5" font-style="italic" font-weight="700" fill="#FFD23F">Eventually.</text></g>
    </g>
  </svg>`;

  function frameWatch() {
    // The automatic static tier (ui-revamp § 4): ~30 frames; a slow phone pauses the loops.
    const ts = [];
    let last = 0;
    const tick = t => {
      if (!root) return;
      if (last) ts.push(t - last);
      last = t;
      if (ts.length < 30) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      const med = ts.slice().sort((a, b) => a - b)[Math.floor(ts.length / 2)];
      if (med > 22) root.classList.add('eta-static');
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);
  }

  return {
    mount(el, opts) {
      this.stop();
      opts = opts || {};
      root = document.createElement('div');
      root.className = 'eta-intro' + (opts.reducedMotion ? ' is-reduced' : '');
      root.innerHTML = DOCK_SVG + `<div class="eta-intro-board"><div class="eta-hv"></div>
        <div class="eta-intro-head"><span data-eta-intro-head>TOOLBOX TALK</span><span class="eta-intro-dots" data-eta-intro-dots></span></div>
        <div class="eta-intro-line" data-eta-intro-line><span class="eta-sten eta-intro-who">DOT · DEPOT MANAGER</span><span class="eta-intro-text" data-eta-intro-text></span></div></div>`;
      el.innerHTML = '';
      el.appendChild(root);
      if (opts.reducedMotion) root.classList.add('door-up');
      // WHY: the roller door goes up just after mount (board: 500 ms, 1.2 s roll).
      else later(() => { if (root) root.classList.add('door-up'); }, 400);
      if (!opts.reducedMotion) frameWatch();
    },
    beat(i, text) {
      if (!root) return;
      const head = root.querySelector('[data-eta-intro-head]');
      const line = root.querySelector('[data-eta-intro-text]');
      const dots = root.querySelector('[data-eta-intro-dots]');
      root.classList.toggle('is-talking', i >= 0);
      root.classList.add('door-up');
      if (i >= 0) {
        if (head) head.textContent = 'TOOLBOX TALK';
        if (line) { line.textContent = text || ''; etaKitRetrigger(line, 'eta-type-line'); }
        if (dots) dots.innerHTML = [0, 1, 2, 3].map(k => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
      } else {
        if (head) head.textContent = 'ROLL CALL';
        if (line) { line.textContent = 'Sign the timesheet, love.'; line.classList.remove('eta-type-line'); }
        if (dots) dots.innerHTML = '';
      }
    },
    stop() {
      timers.forEach(h => clearTimeout(h));
      timers = [];
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      raf = 0;
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null;
    },
  };
})();
