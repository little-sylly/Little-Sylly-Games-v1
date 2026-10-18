// ═══════════════════════════════════════════════════════════════════════════
// board.js — the Board, the phone's lobby layout (SW v250; was the Shelves).
// bd* functions, BD_* constants, BD_STATE. The pure half at the top is Node-
// tested by tools/verify-board.js. Spec:
// docs/superpowers/specs/2026-10-18-shelves-board-design.md.
//
// The 20 games are die-cut stickers on one sheet, with washi-tape shelf tabs.
// Tapping a sticker peels it off into a HELD CARD on a swipe rail; the card's
// back carries what the old bottom sheet did. A glass dock at the bottom holds
// the two rooms' doors, Random, Sound and Layout.
//
// Why a patch-in-place renderer (the reason tv.js gives): lbSet()'s
// rebuild-everything would destroy the board's FLIP, the rail's scrollLeft and
// any sticker in flight on every stepper tap. So the Board builds its DOM ONCE
// per mount (bdMount) and only bdPaint() touches it afterwards.
//
// Timer Lifecycle (logic-engine.md): every timeout lives in bdTimers, the one
// rAF in bdRaf, every WAAPI flight in bdFlights. bdDrop() clears all three — it
// runs when another layout takes the screen and when a game is launched
// (lobby-host.js). Reduced motion is checked in JS (bdReduced) for every flight,
// FLIP, scroll follow and riffle: the global CSS block reaches none of them.
//
// Shared with TV, never duplicated: lbState.count / .onePhone (one filter state
// for both layouts), lbWhyOut, lbFitLine, lbSheetBodyInner, lbGame,
// lbShelfGames, lbPlayersText, lbPhoneText, LB_SHELVES, LB_NO_STICKER,
// lbRenderProfilePop / lbWireProfilePop, lbEsc; tvTilt, tvLabel. All resolve at
// CALL time.
// ═══════════════════════════════════════════════════════════════════════════

// ── The pure half (tools/verify-board.js) ────────────────────────────────────
// Every helper takes the games and the fit rule as arguments, so the harness can
// drive them without a DOM or lbState.

// The board's order for one tab: the games on it, catalogue (GAMES) order kept,
// the fitting ones first and the rest after as ghosts (A1). Tab 'all' is every
// game. `whyOut(g)` is lbWhyOut's shape: a reason string, or null when it fits.
function bdOrder(games, tab, whyOut) {
  const fit = [], out = [];
  for (const g of games) {
    if (tab !== 'all' && !(g.shelves || []).includes(tab)) continue;
    (whyOut(g) ? out : fit).push(g);
  }
  return { fit, out };
}

// The swipe rail: the fitting games on the tab, in the board's order. A game
// that does not fit is never on the rail (D6) — the board's ghosts say why.
function bdRail(games, tab, whyOut) {
  return bdOrder(games, tab, whyOut).fit;
}

// Random's pick, made BEFORE the show (the choreography decorates a decided
// result). `rand` is injected — Math.random in the page, a seeded stream in
// the harness. Clamped, so a rand() of exactly 1 can never index past the end.
function bdPick(pool, rand) {
  if (!pool || !pool.length) return null;
  const i = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[i];
}

// The small count on a tape. Unfiltered: how many games the shelf holds (the
// All tape already says it in its name, so it carries nothing). Filtered: how
// many of them fit, as fit/total (All: "N fit").
function bdTabCount(games, tab, whyOut, filtered) {
  const o = bdOrder(games, tab, whyOut);
  const total = o.fit.length + o.out.length;
  if (tab === 'all') return filtered ? `${o.fit.length} fit` : '';
  return filtered ? `${o.fit.length}/${total}` : `${total}`;
}

// ═══ The page half ═══════════════════════════════════════════════════════════

// Memory only, reset on mount. `held` is the id of the card at the centre of
// the rail while the held layer is up, else null.
const BD_STATE = { tab: 'all', held: null, rolling: false };

// Moments → existing synthesised sounds (the CJAR_SOUND / DYB_SOUND pattern). No
// new audio function, and Play makes no Board sound: the game's own lobby
// button, clicked by lobbyLaunch, already does.
const BD_SOUND = {
  peel:    'playWhoosh',
  putBack: 'playPillClick',
  flip:    'playPillClick',
  tab:     'playPillClick',
  hop:     'playTick',
  land:    'playSuccess',
};

// Pastel washi tape, one per tab. None of them sits near a brand colour, so a
// tape never reads as a game.
const BD_TAPE = { all: '#FFE1EE', talk: '#DCEBFF', bluff: '#FFE6CC', 'guess-draw': '#E3F7D9', cards: '#EFE2FF', luck: '#FFF3B8', board: '#D9F3F0' };
const BD_TAPE_ROT = [-2, 1.5, -1, 2, -1.5, 1, -2];

const BD_FLIP_MS = 280;       // the board's reorder
const BD_PEEL_MS = 480;       // sticker → card
const BD_PUTBACK_MS = 420;    // card → sticker
const BD_RIFFLE_MS = 1300;    // Random while holding
const BD_HOPS = 9;            // Random's ring hops on the board, 100 → 244 ms apart
const BD_SWIPE_PUT_PX = 100;  // a downward drag this far puts the card back

const BD_DIE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`;

let bdEls = null;        // the mounted tree's live nodes; null until bdMount
let bdTimers = [];       // every pending timeout (bdLater) — bdDrop clears them all
let bdRaf = null;        // the one rAF: the rail's scroll follow, or the riffle
let bdFlights = [];      // running WAAPI animations — bdDrop cancels them
let bdCards = [];        // the rail's cards, in rail order
let bdCur = -1;          // index of the centred card
let bdFlying = false;    // a peel or put-back is in the air
let bdSeq = 0;           // bumped by bdDrop: a callback from before it is stale
let bdKeysBound = false;

// ── Small helpers ────────────────────────────────────────────────────────────
function bdReduced() { return typeof tvReduced === 'function' && tvReduced(); }
function bdLater(fn, ms) {
  const seq = bdSeq;
  const id = setTimeout(() => {
    const i = bdTimers.indexOf(id); if (i >= 0) bdTimers.splice(i, 1);
    if (seq === bdSeq) fn();
  }, ms);
  bdTimers.push(id);
  return id;
}
/* Every WAAPI run goes through here so bdDrop can cancel it. onfinish never
   fires for a cancelled animation, so a dropped flight's `done` never runs. */
function bdAnimate(el, frames, opts, done) {
  if (!el || !el.animate) { if (done) done(); return null; }
  const a = el.animate(frames, opts);
  const forget = () => { const i = bdFlights.indexOf(a); if (i >= 0) bdFlights.splice(i, 1); };
  bdFlights.push(a);
  a.onfinish = () => { forget(); if (done) done(); };
  a.oncancel = forget;
  return a;
}
function bdSound(k) {
  const f = BD_SOUND[k];
  try { if (f && typeof window[f] === 'function') window[f](); } catch (_) {}
}
function bdFiltered() { return lbState.count != null || lbState.onePhone; }
function bdHeldOpen() { return !!(bdEls && !bdEls.held.hidden); }
function bdCell(id) { return bdEls ? bdEls.cells.get(id) : null; }
function bdShelfLabels(g) { return LB_SHELVES.filter(s => g.shelves.includes(s.id)).map(s => s.label).join(' · '); }

// The sticker art, or its fallback: the emoji on a brand disc. data/stickers/ is
// runtime-cached, so offline before the first fetch an image can fail — the
// onerror swaps in the disc, never a broken-image icon.
function bdDisc(g, cls) { return `<span class="${cls} bd-disc" style="--g:${g.brandHex}" aria-hidden="true">${g.emoji}</span>`; }
function bdArt(g, cls) {
  if (LB_NO_STICKER.has(g.id)) return bdDisc(g, cls);
  return `<img class="${cls} bd-art" src="data/stickers/${g.id}.png" alt="" draggable="false" data-id="${g.id}" data-cls="${cls}" onload="bdArtLoad(this)" onerror="bdArtFail(this)">`;
}
// A ghost's dashed outline should hug the sticker, not a square: stickers are
// die-cut crops of every aspect with uneven transparent margins, so a fixed box
// sat loose round the tall ones (Bailed). On load, find the opaque bounding box
// of the image on a tiny canvas and place the outline round exactly that, mapped
// into the art box (object-fit: contain, centred). Falls back to a centred
// proportional box when the canvas can't be read.
function bdArtLoad(img) {
  const cell = img.closest && img.closest('.bd-st');
  if (!cell || !img.naturalWidth || !img.naturalHeight) return;
  const ar = img.naturalWidth / img.naturalHeight;
  const dw = ar >= 1 ? 1 : ar, dh = ar >= 1 ? 1 / ar : 1;      // the image's share of the art box
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
  try {
    const W = 48, H = Math.max(8, Math.round(W / ar)), c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    let mnx = W, mny = H, mxx = -1, mxy = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
    if (mxx >= 0) { x0 = mnx / W; x1 = (mxx + 1) / W; y0 = mny / H; y1 = (mxy + 1) / H; }
  } catch (_) {}
  const pad = 0.04;                                              // breathing room round the sticker, in art-box units
  const l = 0.5 + (x0 - 0.5) * dw - pad, t = 0.5 + (y0 - 0.5) * dh - pad;
  const w = (x1 - x0) * dw + pad * 2, h = (y1 - y0) * dh + pad * 2;
  const pct = (v) => (v * 100).toFixed(1) + '%';
  cell.style.setProperty('--ol', pct(l)); cell.style.setProperty('--ot', pct(t));
  cell.style.setProperty('--ow', pct(w)); cell.style.setProperty('--oh', pct(h));
  // The sticker turns about the art box's centre; so must its outline, or an
  // off-centre sticker drifts out of it by the tilt.
  cell.style.setProperty('--ox', pct((0.5 - l) / w)); cell.style.setProperty('--oy', pct((0.5 - t) / h));
}
function bdArtFail(img) {
  const g = lbGame(img.dataset.id);
  if (g && img.parentNode) img.outerHTML = bdDisc(g, img.dataset.cls || '');
}

// ── Mount: the whole tree, once ──────────────────────────────────────────────
function bdMount(root) {
  if (!root) return;
  if (bdEls && bdEls.container === root && bdEls.root.isConnected) { bdPaint(); return; }
  bdDrop();
  root.innerHTML = '';
  BD_STATE.tab = 'all'; BD_STATE.held = null; BD_STATE.rolling = false;

  const el = document.createElement('div');
  el.className = 'lb-phone bd';
  el.innerHTML = `
    <div class="bd-scroll">
      <header class="bd-head">
        <h1 class="sylly-wordmark bd-mark"><span class="sylly-wordmark-a">Little Sylly</span><span class="sylly-wordmark-b">Games</span></h1>
        <div class="bd-head-right">
          <div class="lb-you-wrap bd-you">
            <span class="lb-you-mount ctl-ornament" id="shelves-controller" role="button" tabindex="0"
              aria-label="Your controller — tap to customise"></span>
            <button class="lb-you-label lb-press" id="lb-you-label" aria-haspopup="dialog" aria-expanded="false">
              <span id="lb-you-label-text"></span><span class="lb-you-chev" aria-hidden="true">▾</span>
            </button>
          </div>
          <button class="bd-sound lb-press" aria-label="Sound — hold to mute"><span class="btn-open-sound" aria-hidden="true">${typeof isMuted !== 'undefined' && isMuted ? '🔇' : '🔊'}</span></button>
        </div>
      </header>
      <section class="bd-intro">
        <h2 class="bd-ask">What are we <em>playing</em> today?</h2>
        <div class="bd-who">
          <div class="bd-step" role="group" aria-label="How many of you">
            <button class="bd-key bd-key-sq bd-minus" aria-label="Fewer players">−</button>
            <div class="bd-step-val"><small>Players</small><b></b></div>
            <button class="bd-key bd-key-sq bd-plus" aria-label="More players">+</button>
          </div>
          <button class="bd-key bd-onephone" aria-pressed="false"><span aria-hidden="true">📱</span>One phone</button>
        </div>
        <p class="bd-fit"><span class="bd-fit-text" aria-live="polite"></span><button class="bd-clear">Clear</button></p>
      </section>
      <nav class="bd-tapes" aria-label="Shelves"></nav>
      <div class="bd-sheet" role="list"></div>
      <div class="bd-note" hidden><p>Nothing on this tab fits your group.</p><button class="bd-clear">Clear</button></div>
    </div>
    <div class="bd-held" hidden role="dialog" aria-modal="true" aria-label="Game cards">
      <div class="bd-scrim"></div>
      <div class="bd-top">
        <button class="bd-home lb-press">← Board</button>
        <span class="bd-hint">Swipe down to put it back</span>
        <span class="bd-count"></span>
      </div>
      <div class="bd-rail"></div>
      <div class="bd-dots" aria-label="Jump to a game"></div>
    </div>
    <nav class="bd-dock" aria-label="Around the house">
      <button class="bd-dock-btn" data-lobby-place="jukebox"><span class="bd-ico" aria-hidden="true">🎵</span><span class="bd-lbl">Jukebox</span></button>
      <button class="bd-dock-btn" data-lobby-place="stickers" hidden><span class="bd-ico" aria-hidden="true">📒</span><span class="bd-lbl">Stickers</span></button>
      <button class="bd-die" aria-label="Random game">${BD_DIE}<span class="bd-die-lbl" aria-hidden="true">Random</span></button>
      <button class="bd-dock-btn" data-lobby-place="arcade"><span class="bd-ico" aria-hidden="true">🕹️</span><span class="bd-lbl">Arcade</span></button>
      <button class="bd-dock-btn bd-layout" aria-label="Change layout"><span class="bd-ico" aria-hidden="true">🏷️</span><span class="bd-lbl">Layout</span></button>
    </nav>`;
  root.appendChild(el);

  const q = (s) => el.querySelector(s);
  bdEls = {
    container: root, root: el, scroll: q('.bd-scroll'), sheet: q('.bd-sheet'), tapes: q('.bd-tapes'),
    note: q('.bd-note'), youWrap: q('.bd-you'), youBtn: q('#lb-you-label'),
    minus: q('.bd-minus'), plus: q('.bd-plus'), stepVal: q('.bd-step-val b'), onePhone: q('.bd-onephone'),
    fitText: q('.bd-fit-text'), fitClear: q('.bd-fit .bd-clear'),
    held: q('.bd-held'), rail: q('.bd-rail'), dots: q('.bd-dots'), count: q('.bd-count'),
    dock: q('.bd-dock'), die: q('.bd-die'), cells: new Map(),
  };

  // Header
  bdEls.youBtn.addEventListener('click', () => lbSet({ profileOpen: !lbState.profileOpen }));

  // Who's playing — the same lbState TV's keycaps write, through lbSet.
  bdEls.minus.addEventListener('click', () => lbSet({ count: lbState.count == null || lbState.count <= 2 ? null : lbState.count - 1 }));
  bdEls.plus.addEventListener('click', () => lbSet({ count: lbState.count == null ? 2 : Math.min(10, lbState.count + 1) }));
  bdEls.onePhone.addEventListener('click', () => lbSet({ onePhone: !lbState.onePhone }));
  el.querySelectorAll('.bd-clear').forEach(b => b.addEventListener('click', () => lbSet({ count: null, onePhone: false })));

  // The tapes
  [{ id: 'all', label: `All ${GAMES.length}` }, ...LB_SHELVES].forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'bd-tape';
    b.dataset.tab = s.id;
    b.style.setProperty('--t', BD_TAPE[s.id] || '#EEE');
    b.style.setProperty('--r', `${BD_TAPE_ROT[i % BD_TAPE_ROT.length]}deg`);
    b.innerHTML = `<span>${s.label}</span><small></small>`;
    b.addEventListener('click', () => bdSetTab(s.id));
    bdEls.tapes.appendChild(b);
  });

  // The sheet: one sticker per game, built once and reordered in place.
  GAMES.forEach((g, i) => {
    const c = document.createElement('button');
    c.className = 'bd-st';
    c.setAttribute('role', 'listitem');
    c.dataset.id = g.id;
    c.style.setProperty('--g', g.brandHex);
    c.style.setProperty('--tilt', tvTilt(g.id));
    c.style.setProperty('--i', String(i));
    c.innerHTML = `<span class="bd-st-art"><span class="bd-st-tilt">${bdArt(g, 'bd-st-img')}</span></span>
      <span class="bd-st-name">${g.gameName}</span><span class="bd-st-why"></span>`;
    c.addEventListener('click', () => bdTapSticker(g.id));
    bdEls.cells.set(g.id, c);
    bdEls.sheet.appendChild(c);
  });

  // The held layer
  q('.bd-home').addEventListener('click', () => bdPutBack());
  bdEls.rail.addEventListener('click', (e) => { if (e.target === bdEls.rail) bdPutBack(); });
  bdEls.rail.addEventListener('scroll', () => {
    if (!bdRaf && !BD_STATE.rolling) bdRaf = requestAnimationFrame(() => { bdRaf = null; bdFollow(); });
  }, { passive: true });
  bdBindSwipeDown();

  // The dock
  bdEls.dock.querySelectorAll('[data-lobby-place]').forEach(b => b.addEventListener('click', () => {
    bdDrop();
    lobbyOpenPlace(b.dataset.lobbyPlace);
  }));
  bdEls.die.addEventListener('click', bdRandom);
  bdBindSound(q('.bd-sound'));
  q('.bd-layout').addEventListener('click', () => lobbyDispatch({ t: 'openSwitcher' }));

  if (!bdKeysBound) { bdKeysBound = true; document.addEventListener('keydown', bdOnKey); }

  // The stickers slap on once per mount — from where they already sit (the
  // keyframe starts at their resting state, so nothing waits invisible).
  if (!bdReduced()) {
    bdEls.sheet.classList.add('is-fresh');
    bdLater(() => bdEls && bdEls.sheet.classList.remove('is-fresh'), 30 * GAMES.length + 500);
  }
  bdPaint();
  // The ornament goes into #shelves-controller from lobbyPresent, straight after.
}

/* engine.js binds tap and 500 ms hold on every .btn-open-sound at BOOT; this
   button is rendered after it, so it is wired here the same way. The icon span
   carries .btn-open-sound only so toggleMute() keeps its emoji in sync — it
   rewrites that span's textContent, which is why the label sits outside it. */
function bdBindSound(btn) {
  let held = false;
  bindCardHold(btn, () => {
    held = true;
    toggleMute();
    playSliderTick(isMuted ? 15 : 70);
  }, 500);
  btn.addEventListener('click', () => {
    if (held) { held = false; return; }
    playPillClick();
    openSoundOverlay();
  });
}

// ── Paint: everything the filters, the tab and the places can change ────────
function bdPaint() {
  if (!bdEls) return;
  const E = bdEls, c = lbState.count, filtered = bdFiltered();

  // Header
  document.getElementById('lb-you-label-text').textContent = lbGetNickname() || 'You';
  const pop = E.youWrap.querySelector('.lb-you-pop');
  if (lbState.profileOpen && !pop) { E.youWrap.insertAdjacentHTML('beforeend', lbRenderProfilePop()); lbWireProfilePop(E.youWrap); }
  if (!lbState.profileOpen && pop) pop.remove();
  E.youBtn.setAttribute('aria-expanded', String(!!lbState.profileOpen));
  E.youBtn.querySelector('.lb-you-chev').textContent = lbState.profileOpen ? '▴' : '▾';

  // Who's playing
  E.stepVal.textContent = c == null ? 'Any' : c >= 10 ? '10+' : String(c);
  E.minus.disabled = c == null;
  E.plus.disabled = c === 10;
  E.onePhone.classList.toggle('is-on', lbState.onePhone);
  E.onePhone.setAttribute('aria-pressed', String(lbState.onePhone));
  if (E.fitText.textContent !== lbFitLine()) E.fitText.textContent = lbFitLine();
  E.fitClear.hidden = !filtered;

  // Tapes
  for (const t of E.tapes.children) {
    const on = t.dataset.tab === BD_STATE.tab;
    t.classList.toggle('is-on', on);
    t.setAttribute('aria-pressed', String(on));
    t.querySelector('small').textContent = bdTabCount(GAMES, t.dataset.tab, lbWhyOut, filtered);
    // The rail only shows part of the list on a narrow column: keep the chosen tape in view.
    if (on && E.tapes.scrollWidth > E.tapes.clientWidth) {
      const left = t.offsetLeft - (E.tapes.clientWidth - t.offsetWidth) / 2;
      E.tapes.scrollTo({ left, behavior: bdReduced() || !E.tapes.dataset.ready ? 'auto' : 'smooth' });
      E.tapes.dataset.ready = '1';
    }
  }

  // The sheet, FLIPped into its new order (transform only, 280 ms).
  const { fit, out } = bdOrder(GAMES, BD_STATE.tab, lbWhyOut);
  const animate = !bdReduced() && typeof lobbyIsUp === 'function' && lobbyIsUp('shelves');
  const first = new Map();
  if (animate) for (const [id, cell] of E.cells) if (!cell.hidden) first.set(id, cell.getBoundingClientRect());
  const shown = new Set(fit.concat(out).map(g => g.id));
  for (const [id, cell] of E.cells) cell.hidden = !shown.has(id);
  const want = fit.concat(out).map(g => E.cells.get(g.id));
  for (const [id, cell] of E.cells) if (!shown.has(id)) want.push(cell);
  const now = [...E.sheet.children];
  if (want.some((cell, i) => now[i] !== cell)) for (const cell of want) E.sheet.appendChild(cell);
  for (const g of fit.concat(out)) {
    const cell = E.cells.get(g.id), why = lbWhyOut(g);
    cell.classList.toggle('is-out', !!why);
    cell.querySelector('.bd-st-why').textContent = why || '';
    cell.setAttribute('aria-label', why ? `${g.gameName} — ${why}` : `${g.gameName}, ${lbPlayersText(g)} players, ${lbPhoneText(g)}`);
    if (why) cell.setAttribute('aria-disabled', 'true'); else cell.removeAttribute('aria-disabled');
    const a = first.get(g.id);
    if (a) {
      const b = cell.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) bdAnimate(cell, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: BD_FLIP_MS, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  E.note.hidden = fit.length > 0;

  // Random: dimmed — but still there — when nothing on this tab fits.
  const pool = bdRail(GAMES, BD_STATE.tab, lbWhyOut);
  E.die.classList.toggle('is-off', !pool.length);
  if (pool.length) E.die.removeAttribute('aria-disabled'); else E.die.setAttribute('aria-disabled', 'true');

  // The dock's doors: absent, not dimmed, until this device may open them.
  E.dock.querySelectorAll('[data-lobby-place]').forEach(b => {
    b.hidden = !(typeof lobbyPlaceOffered !== 'function' || lobbyPlaceOffered(b.dataset.lobbyPlace));
  });

  // A held card that has left the rail goes home first; a rail whose members
  // changed is rebuilt around the card still held.
  if (bdHeldOpen() && !bdFlying) {
    const ids = pool.map(g => g.id);
    if (!ids.includes(BD_STATE.held)) bdPutBack({ instant: true });
    else if (ids.join() !== bdCards.map(x => x.dataset.id).join()) {
      bdBuildRail(pool);
      bdGoTo(ids.indexOf(BD_STATE.held), false);
      bdSetCur(ids.indexOf(BD_STATE.held));
      bdFollow();
    }
  }
}

function bdSetTab(id) {
  if (BD_STATE.tab === id || BD_STATE.rolling) return;
  bdClosePop();
  BD_STATE.tab = id;
  bdSound('tab');
  bdPaint();
}
function bdClosePop() { if (lbState.profileOpen) lbSet({ profileOpen: false }); }

function bdTapSticker(id) {
  if (BD_STATE.rolling || bdFlying || bdHeldOpen()) return;
  const cell = bdCell(id);
  if (lbWhyOut(lbGame(id))) {
    // Inert but answerable: the reason is already printed on it; it wobbles.
    const art = cell.querySelector('.bd-st-art');
    art.classList.remove('is-wobble'); void art.offsetWidth; art.classList.add('is-wobble');
    return;
  }
  bdHold(id);
}

// ── The held card ────────────────────────────────────────────────────────────
function bdCardMarkup(g) {
  const meta = [`<span>👥 ${lbPlayersText(g)}</span>`, `<span>📱 ${lbOnePhone(g) ? 'One phone' : 'Phone each'}</span>`];
  if (g.minutes) meta.push(`<span class="bd-c-min">⏱️ ${g.minutes.replace(/ \(.*?\)/g, '')}</span>`);
  return `
    <div class="bd-flipper">
      <div class="bd-face bd-front">
        <span class="bd-c-stk"><span class="bd-c-tilt">${bdArt(g, 'bd-c-img')}</span></span>
        <p class="bd-c-eyebrow">${bdShelfLabels(g)}</p>
        <h2 class="bd-c-name">${g.gameName}</h2>
        <p class="bd-c-pitch">${g.pitch}</p>
        <div class="bd-c-meta">${meta.join('')}</div>
        <div class="bd-c-row">
          <button class="bd-c-play">${g.playCtaLabel}</button>
          <button class="bd-c-flip" aria-label="How ${lbEsc(g.gameName)} goes">How it<br>goes ↻</button>
        </div>
      </div>
      <div class="bd-face bd-back" aria-hidden="true">
        <div class="bd-b-head"><span class="bd-b-ghost" aria-hidden="true"></span><h3 class="bd-b-name">${g.gameName}</h3><button class="bd-b-turn">Tap to turn ↻</button></div>
        <div class="bd-b-body">${lbSheetBodyInner(g)}</div>
      </div>
    </div>`;
}

/* Rebuilt (never reordered) whenever the held set changes: Chrome's scroll-snap
   keeps the previously snapped child in view when children move, so a
   reordered rail appears not to have moved at all (spec § 6). */
function bdBuildRail(games) {
  const E = bdEls;
  E.rail.innerHTML = ''; E.dots.innerHTML = '';
  E.rail.scrollLeft = 0;
  bdCur = -1;
  bdCards = games.map((g, i) => {
    const card = document.createElement('article');
    card.className = 'bd-card';
    card.dataset.id = g.id;
    card.setAttribute('aria-label', g.gameName);
    card.style.setProperty('--g', g.brandHex);
    card.style.setProperty('--g-label', tvLabel(g.brandHex));
    card.style.setProperty('--tilt', tvTilt(g.id));
    card.innerHTML = bdCardMarkup(g);
    // A peeking neighbour comes to the centre first — its Play never fires from a
    // peek. The centre is re-read NOW (bdFollow), not trusted from the last frame:
    // a busy phone can deliver a tap before the rail's scroll follow has run.
    card.addEventListener('click', (e) => {
      bdFollow();
      if (bdCards[bdCur] === card) return;
      e.stopPropagation(); e.preventDefault();
      bdGoTo(bdCards.indexOf(card), true);
    }, true);
    card.querySelector('.bd-c-play').addEventListener('click', () => lobbyLaunch(g.id));
    card.querySelector('.bd-c-flip').addEventListener('click', () => bdFlip(card, true));
    const back = card.querySelector('.bd-back');
    back.addEventListener('click', () => bdFlip(card, false));
    bdSetFaceInert(card, false);
    E.rail.appendChild(card);
    const d = document.createElement('button');
    d.style.setProperty('--g', g.brandHex);
    d.setAttribute('aria-label', g.gameName);
    d.innerHTML = '<i></i>';
    d.addEventListener('click', () => bdGoTo(i, true));
    E.dots.appendChild(d);
    return card;
  });
}
function bdSetFaceInert(card, flipped) {
  const front = card.querySelector('.bd-front'), back = card.querySelector('.bd-back');
  front.setAttribute('aria-hidden', String(flipped)); back.setAttribute('aria-hidden', String(!flipped));
  front.inert = flipped; back.inert = !flipped;
}
// `quiet`: turned back by something else (a swipe away, a put-back) — no sound,
// and focus stays where the player is.
function bdFlip(card, on, quiet) {
  if (!card || card.classList.contains('is-flip') === on) return;
  card.classList.toggle('is-flip', on);
  bdSetFaceInert(card, on);
  if (on) card.querySelector('.bd-back').scrollTop = 0;
  if (quiet) return;
  bdSound('flip');
  const f = card.querySelector(on ? '.bd-b-turn' : '.bd-c-flip');
  if (f) f.focus({ preventScroll: true });
}

// Flat follow: a touch of tilt, drop and shrink by distance from the centre —
// nothing 3D (it must not read as TV's rail). Written only for cards within ±2
// of centre; the rest are reset once. offsetLeft ignores transforms, so this
// reads no layout it just wrote.
function bdFollow() {
  if (!bdEls || !bdCards.length) return;
  const rail = bdEls.rail, mid = rail.scrollLeft + rail.clientWidth / 2, flat = bdReduced();
  let best = -1, bestD = Infinity;
  bdCards.forEach((c, i) => {
    const d = (c.offsetLeft + c.offsetWidth / 2 - mid) / (c.offsetWidth || 1), ad = Math.abs(d);
    if (ad < bestD) { bestD = ad; best = i; }
    if (!flat && ad <= 2) {
      const a = Math.min(ad, 1.5);
      c.style.transform = `rotate(${(d * 4).toFixed(2)}deg) translateY(${(a * 12).toFixed(1)}px) scale(${(1 - a * 0.08).toFixed(3)})`;
      c.dataset.far = '';
    } else if (c.dataset.far !== '1') { c.style.transform = ''; c.dataset.far = '1'; }
  });
  if (best >= 0 && best !== bdCur) bdSetCur(best);
}
function bdSetCur(i) {
  const E = bdEls, card = bdCards[i];
  if (!card) return;
  if (bdCards[bdCur] && bdCur !== i) bdFlip(bdCards[bdCur], false, true);   // swiping away turns a flipped card back
  bdCur = i;
  const g = lbGame(card.dataset.id);
  BD_STATE.held = g.id;
  bdCards.forEach((c, k) => c.classList.toggle('is-cur', k === i));
  [...E.dots.children].forEach((d, k) => d.classList.toggle('is-cur', k === i));
  E.held.style.setProperty('--cur', g.brandHex);
  E.count.textContent = `${i + 1} of ${bdCards.length}`;
  for (const [id, cell] of E.cells) cell.classList.toggle('is-lifted', id === g.id);
}
function bdGoTo(i, smooth) {
  const c = bdCards[i]; if (!c) return;
  const left = c.offsetLeft - (bdEls.rail.clientWidth - c.offsetWidth) / 2;
  if (smooth && !bdReduced()) bdEls.rail.scrollTo({ left, behavior: 'smooth' });
  else { bdEls.rail.scrollLeft = left; bdFollow(); }
}

// The flying copy of a sticker: a fixed box at `from`, carrying a clone of the
// art (its own tilt included). Every keyframe has the same function list, so the
// curl in the middle interpolates instead of snapping.
function bdFlyer(artEl, from) {
  const f = document.createElement('span');
  f.className = 'bd-fly';
  f.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
  const clone = artEl.cloneNode(true);
  clone.removeAttribute('style');
  f.style.setProperty('--tilt', getComputedStyle(artEl).getPropertyValue('--tilt'));
  f.appendChild(clone);
  bdEls.root.appendChild(f);
  return f;
}
function bdFlightFrames(from, to) {
  const dx = to.left - from.left, dy = to.top - from.top, s = from.width ? to.width / from.width : 1;
  const f = (x, y, rx, k) => `translate(${x}px, ${y}px) perspective(500px) rotateX(${rx}deg) scale(${k})`;
  return [
    { transform: f(0, 0, 0, 1) },
    { transform: f(dx * 0.35, dy * 0.35 - 40, 24, 1 + (s - 1) * 0.5), offset: 0.35 },
    { transform: f(dx, dy, 0, s) },
  ];
}

/* The peel: a flying copy lifts off the slot and lands in the card's sticker
   spot while the card scales up from 0.9. `fromRandom` lands with a slap, the
   brand burst and the land sound. */
function bdHold(id, opts) {
  opts = opts || {};
  if (!bdEls || bdFlying) return;
  const pool = bdRail(GAMES, BD_STATE.tab, lbWhyOut), i = pool.findIndex(g => g.id === id);
  if (i < 0) return;
  bdClosePop();
  const E = bdEls, cell = bdCell(id);
  bdBuildRail(pool);
  E.held.hidden = false;
  E.root.classList.add('is-held');
  bdGoTo(i, false);
  bdSetCur(i);
  const card = bdCards[i], front = card.querySelector('.bd-front');
  void E.held.offsetWidth;                 // the layer's first style, so the scrim fades in
  E.held.classList.add('is-on');
  bdSound('peel');

  const land = () => {
    bdFlying = false;
    card.classList.remove('is-waiting');
    if (opts.fromRandom) bdLand(card);
    else bdSlap(card);
    if (opts.fromRandom) { BD_STATE.rolling = false; E.die.classList.remove('is-rolling'); }
  };
  const play = card.querySelector('.bd-c-play');
  if (bdReduced() || !cell) { play.focus({ preventScroll: true }); land(); return; }

  bdFlying = true;
  card.classList.add('is-waiting');
  const from = cell.querySelector('.bd-st-art').getBoundingClientRect();
  const to = card.querySelector('.bd-c-stk').getBoundingClientRect();
  bdAnimate(front, [{ opacity: 0, transform: 'scale(0.9) translateY(16px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
  const fly = bdFlyer(cell.querySelector('.bd-st-tilt'), from);
  bdAnimate(fly, bdFlightFrames(from, to), { duration: BD_PEEL_MS, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }, () => { fly.remove(); land(); });
  play.focus({ preventScroll: true });
}
function bdSlap(card) {
  if (bdReduced()) return;
  const stk = card.querySelector('.bd-c-stk');
  bdAnimate(stk, [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 440, easing: 'cubic-bezier(0.2, 1.7, 0.4, 1)' });
}
// Random's landing: the slap, a 14-piece burst of the box's brand colours, the
// land sound. Reduced motion keeps the sound and drops everything that travels.
function bdLand(card) {
  bdSound('land');
  if (bdReduced()) return;
  bdSlap(card);
  const b = document.createElement('span');
  b.className = 'bd-burst';
  b.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2, r = 80 + Math.random() * 50;
    const i = document.createElement('i');
    i.style.setProperty('--c', GAMES[(k * 3) % GAMES.length].brandHex);
    i.style.setProperty('--x', `${(Math.cos(a) * r).toFixed(1)}px`);
    i.style.setProperty('--y', `${(Math.sin(a) * r).toFixed(1)}px`);
    b.appendChild(i);
  }
  card.querySelector('.bd-front').appendChild(b);
  bdLater(() => b.remove(), 760);
}

/* Put back the card held NOW (not the one opened) into its own slot. The board
   scrolls that slot into view first, invisibly behind the scrim. `instant`
   closes with no flight and no sound (bdDrop, a filter change). */
function bdPutBack(opts) {
  opts = opts || {};
  if (!bdHeldOpen() || (bdFlying && !opts.instant)) return;
  const E = bdEls, card = bdCards[bdCur], id = card ? card.dataset.id : BD_STATE.held, cell = bdCell(id);
  if (card) bdFlip(card, false, true);
  if (cell && cell.scrollIntoView) cell.scrollIntoView({ block: 'center' });
  if (opts.instant || bdReduced() || !card || !cell) {
    bdCloseHeld();
    if (!opts.instant) { bdSound('putBack'); if (cell) cell.focus({ preventScroll: true }); }
    return;
  }
  bdFlying = true;
  bdSound('putBack');
  const from = card.querySelector('.bd-c-stk').getBoundingClientRect();
  const to = cell.querySelector('.bd-st-art').getBoundingClientRect();
  const fly = bdFlyer(card.querySelector('.bd-c-tilt'), from);
  card.classList.add('is-waiting');
  E.held.classList.remove('is-on');
  E.held.classList.add('is-leaving');
  bdAnimate(fly, bdFlightFrames(from, to), { duration: BD_PUTBACK_MS, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }, () => {
    fly.remove();
    bdFlying = false;
    bdCloseHeld();
    bdAnimate(cell.querySelector('.bd-st-art'), [{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(0.2, 1.6, 0.4, 1)' });
    cell.focus({ preventScroll: true });
  });
}
function bdCloseHeld() {
  if (!bdEls) return;
  const E = bdEls;
  E.held.hidden = true;
  E.held.classList.remove('is-on', 'is-leaving');
  E.rail.style.transform = ''; E.rail.style.opacity = ''; E.rail.style.scrollSnapType = '';
  E.rail.innerHTML = ''; E.dots.innerHTML = '';
  E.root.classList.remove('is-held');
  bdCards = []; bdCur = -1; BD_STATE.held = null;
  for (const cell of E.cells.values()) cell.classList.remove('is-lifted');
}

// Swipe down anywhere on the rail to put it back. touch-action: pan-x (CSS)
// leaves vertical drags to us; a horizontal one is the browser's scroll and
// arrives here as pointercancel.
function bdBindSwipeDown() {
  const rail = bdEls.rail;
  let drag = null;
  rail.addEventListener('pointerdown', e => { if (!bdFlying && !BD_STATE.rolling) drag = { x: e.clientX, y: e.clientY, on: false }; });
  rail.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && dy > 10 && dy > Math.abs(dx) * 1.3) { drag.on = true; rail.classList.add('is-drag'); }
    if (drag.on) { rail.style.transform = `translateY(${Math.max(0, dy) * 0.7}px)`; rail.style.opacity = String(1 - Math.min(Math.max(dy, 0), 300) / 600); }
  });
  const end = e => {
    if (!drag) return;
    const was = drag.on, dy = e.clientY - drag.y;
    drag = null;
    rail.classList.remove('is-drag');
    if (!was) return;
    if (e.type === 'pointerup' && dy > BD_SWIPE_PUT_PX) { rail.style.transform = ''; rail.style.opacity = ''; bdPutBack(); return; }
    rail.classList.add('is-settle');
    rail.style.transform = ''; rail.style.opacity = '';
    bdLater(() => rail.classList.remove('is-settle'), 280);
  };
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
}

function bdOnKey(e) {
  if (!bdHeldOpen() || typeof lobbyIsUp !== 'function' || !lobbyIsUp('shelves')) return;
  const snd = document.getElementById('sound-overlay');
  if (snd && snd.style.display === 'flex') return;
  if (e.key === 'Escape') { e.preventDefault(); bdPutBack(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); bdGoTo(Math.min(bdCards.length - 1, bdCur + 1), true); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); bdGoTo(Math.max(0, bdCur - 1), true); }
}

// ── Random (D4 — the middle ground) ──────────────────────────────────────────
// The pick is made FIRST (bdPick); everything after is decoration on a decided
// result. From the board: the fitting stickers jiggle while a ring hops between
// them and lands on the pick, which then peels into the held card. Already
// holding: the rail riffles out and eases back onto the pick.
function bdRandom() {
  if (!bdEls || BD_STATE.rolling || bdFlying) return;
  const pool = bdRail(GAMES, BD_STATE.tab, lbWhyOut);
  const pick = bdPick(pool, Math.random);
  if (!pick) return;
  bdClosePop();
  if (bdHeldOpen()) { bdRiffle(pick.id); return; }
  if (bdReduced()) { BD_STATE.rolling = true; bdHold(pick.id, { fromRandom: true }); return; }

  const E = bdEls, target = bdCell(pick.id), live = pool.map(g => bdCell(g.id));
  BD_STATE.rolling = true;
  E.die.classList.add('is-rolling');
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  E.sheet.classList.add('is-rolling');
  let last = null;
  const hop = (k) => {
    const c = k === BD_HOPS - 1 ? target : live[Math.floor(Math.random() * live.length)];
    if (last) last.classList.remove('is-hot');
    c.classList.add('is-hot'); last = c;
    bdSound('hop');
    const gap = 100 + k * 18;
    if (k < BD_HOPS - 1) { bdLater(() => hop(k + 1), gap); return; }
    bdLater(() => {
      E.sheet.classList.remove('is-rolling');
      bdLater(() => { target.classList.remove('is-hot'); bdHold(pick.id, { fromRandom: true }); }, 280);
    }, gap);
  };
  hop(0);
}
function bdRiffle(id) {
  const E = bdEls, i = bdCards.findIndex(c => c.dataset.id === id);
  if (i < 0) return;
  const card = bdCards[i];
  const finish = () => {
    bdRaf = null;
    E.rail.style.scrollSnapType = '';
    bdGoTo(i, false);
    bdSetCur(i);
    bdLand(card);
    BD_STATE.rolling = false;
    E.die.classList.remove('is-rolling');
  };
  BD_STATE.rolling = true;
  E.die.classList.add('is-rolling');
  if (bdCards[bdCur]) bdFlip(bdCards[bdCur], false, true);
  if (bdReduced()) { finish(); return; }
  E.rail.style.scrollSnapType = 'none';
  const from = E.rail.scrollLeft, far = from < E.rail.scrollWidth / 2 ? E.rail.scrollWidth : 0;
  const to = card.offsetLeft - (E.rail.clientWidth - card.offsetWidth) / 2;
  const t0 = performance.now();
  if (bdRaf) cancelAnimationFrame(bdRaf);
  const step = (t) => {
    const p = Math.min(1, (t - t0) / BD_RIFFLE_MS), e = 1 - Math.pow(1 - p, 3);
    E.rail.scrollLeft = e < 0.45 ? from + (far - from) * (e / 0.45) : far + (to - far) * ((e - 0.45) / 0.55);
    bdFollow();
    if (p < 1) bdRaf = requestAnimationFrame(step); else finish();
  };
  bdRaf = requestAnimationFrame(step);
}

// ── Drop: stop everything the Board has running ──────────────────────────────
// Leaving the layout, launching a game, opening a room. Idempotent, and safe
// before a mount. The DOM stays — a return re-presents the same tree, closed.
function bdDrop() {
  bdSeq++;
  for (const id of bdTimers) clearTimeout(id);
  bdTimers = [];
  if (bdRaf) { cancelAnimationFrame(bdRaf); bdRaf = null; }
  for (const a of bdFlights.slice()) { try { a.cancel(); } catch (_) {} }
  bdFlights = [];
  bdFlying = false;
  BD_STATE.rolling = false;
  if (!bdEls) return;
  bdEls.root.querySelectorAll('.bd-fly, .bd-burst').forEach(n => n.remove());
  bdEls.sheet.classList.remove('is-rolling', 'is-fresh');
  bdEls.die.classList.remove('is-rolling');
  for (const cell of bdEls.cells.values()) cell.classList.remove('is-hot');
  if (bdHeldOpen()) bdPutBack({ instant: true });
}

if (typeof module !== 'undefined') module.exports = { bdOrder, bdRail, bdPick, bdTabCount };
