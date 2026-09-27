// ═══════════════════════════════════════════════════════════════════════════
// tv.js — the TV layout (SW v231). Was the sandbox's lounge.js: it was called
// "the Lounge" until the 3D room took that name (owner, 25 Sep 2026). tv*
// functions, TV_* constants, TV_STATE. The pure half at the top is Node-tested
// by tools/verify-tv.js.
//
// Why its own file, and its own renderer:
//   lobby.js's lbSet() rebuilds every mount with innerHTML = ''. That is fine
//   for the phone — it has no live state below the DOM. The rail does: a
//   scrollLeft, a rAF handle, an in-flight smooth scroll and a drag. A rebuild
//   on every keycap tap would reset the rail to position zero mid-drift. So
//   TV mode builds its DOM ONCE per mount and patches in place after
//   (tvApply), and lobby.js's lbMountTVFull() is idempotent to suit.
//
// Live instances (production has one: #tv-app) are tracked in TV_INSTANCES; each owns its own rail scroll and rAF, and is
// torn down by tvDrop() — which lobby-host.js calls whenever another layout
// takes the screen — the § Timer Lifecycle rule (logic-engine.md) applied to
// a rAF and a clock interval, exactly as nt.js does for ntRafHandle.
//
// Shared with Shelves, never duplicated: lbState.count / .onePhone
// (the two filters ARE the phone's filters), lbWhyOut, lbSortByFit, lbGame,
// lbFitLine, lbRenderProfilePop, LB_NO_STICKER, lbEsc. Those all resolve at CALL
// time, which is what lets this file load before lobby.js.
// ═══════════════════════════════════════════════════════════════════════════

// ── TV mode's own state. The two FILTERS are not here — they live in
// lbState.count / lbState.onePhone, because they are the same two questions
// the phone asks and a player moving between layouts keeps their answer.
const TV_STATE = {
  shelf: null,        // open shelf id, or null for the picker
  sel: null,          // selected game id, or null for the boxed-set stack
  focus: 0,           // rail keyboard focus, an index into TV_ORDER
  spinning: false,    // Random Game tween in flight
  plainCta: false,    // #plaincta — flips all 20 Play labels to "Play"
};

// A fixed, designed shuffle — NOT games.js order. It spaces the brand hues so
// no two neighbouring boxes read as the same colour. Verified against games.js
// by verify-lounge.js, both directions.
const TV_ORDER = ['pko','li5','cjar','cld','gm','nat','flw','dsd','ygi','shp','bld','ss','frt','gth','dyb','jec','nt','comb','lttp','pass'];
// The empty pane's sticker pile — three silhouettes that read at a glance and
// never clash (round, long, upright). Fixed, not random, so screenshots compare.
const TV_PILE = ['cjar', 'frt', 'cld'];
const TV_ITEM = 166;                       // 150px box + 16px gap
const TV_COPIES = 5;                       // 5, not 3: a 1920 viewport must never see the seam
const TV_W = TV_ORDER.length * TV_ITEM;    // 3320 — one full list

// ── Colour: white ink on every brand fill, label by darkening ────────────────
// Ink on a brand fill is WHITE, always — the suite's locked button scheme
// (ui-style.md § Action Button Standard: brand fill + white ink, the four light
// brands included, contrast cost accepted by the owner). The sandbox's README § 6
// picked plum ink for pale fills by luminance, which put black text on FRT, COMB,
// CLD and YGI here and nowhere else in the app; it no longer governs (owner, 27 Sep
// 2026). Labels — brand-coloured TEXT on the white ground — are a separate axis and
// still darken pale brands toward plum (ui-style.md § Menu Title Treatment).
function tvLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function tvInk() { return '#FFFFFF'; }
// Fruit Salad is the one sanctioned exception: its label text is the literal
// #FFE500 (ui-style.md § Menu Title Treatment — a darkened yellow reads brown).
function tvLabel(hex) {
  if (hex.toUpperCase() === '#FFE500') return hex;
  return tvLum(hex) > 0.45 ? `color-mix(in oklab, ${hex} 70%, #2B1B45)` : hex;
}

// ── Deterministic per-game tilt and sway phase ──────────────────────────────
// Hash of the id, so a game's sticker sits at the same angle on every load and
// in every screenshot. Range +/-7deg (README § 5b).
function tvTilt(id) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 15) - 7) + 'deg';
}
function tvSwaySeed(id) {
  let h = 0; for (const ch of id) h = (h * 37 + ch.charCodeAt(0)) % 991;
  return (h % 140) / 100;
}

// ── The rail's arithmetic ────────────────────────────────────────────────────
// Keep scrollLeft inside the middle copies so the ends are never on screen.
function tvWrap(sl) {
  if (sl < TV_W * 1.5) return sl + TV_W;
  if (sl > TV_W * 3.5) return sl - TV_W;
  return sl;
}
// Which of the 5 copies of `idx` is nearest where we already are. Without
// this, selecting index 0 while sitting on index 19 hauls the rail backwards
// past all 20 boxes — the visible "yank" README § 7.5 warns about.
function tvNearestCopy(sl, idx) {
  let best = 0, bestDist = Infinity;
  for (let c = 0; c < TV_COPIES; c++) {
    const d = Math.abs((c * TV_ORDER.length + idx) * TV_ITEM - sl);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// ── Copy helpers ─────────────────────────────────────────────────────────────
// The pane heading is two-toned: everything but the last word in plum, the
// last word in the game's label colour (ui-style.md § Menu Title Treatment).
function tvSplitName(name) {
  const w = name.split(' ');
  return w.length > 1 ? { a: w.slice(0, -1).join(' ') + ' ', b: w[w.length - 1] } : { a: '', b: name };
}

// ── Which stickers each shelf tile fans ──────────────────────────────────────
// Games sit on several shelves, so "the first three of each" shows the same
// early-catalogue faces over and over (14 different of 17 slots at 20 games).
// Instead: every shelf fans `n` of its OWN games, preferring the ones no other
// fan has used yet, then the ones on the FEWEST shelves (a game only this shelf
// has is spent here, leaving shared ones free for the others). Smallest
// shelves choose first — they have the fewest options — and remaining ties
// keep catalogue order, so the result is deterministic (same tiles on every
// load and screenshot) and rebalances itself as the catalogue grows.
function tvShelfFans(shelves, gamesOf, n = 3) {
  const used = new Map(), reach = new Map(), out = {};
  const order = shelves.map((s, i) => ({ s, i, g: gamesOf(s.id) }));
  for (const { g } of order) for (const x of g) reach.set(x.id, (reach.get(x.id) || 0) + 1);
  order.sort((a, b) => a.g.length - b.g.length || a.i - b.i);
  for (const { s, g } of order) {
    const pick = g.slice().sort((a, b) =>
      (used.get(a.id) || 0) - (used.get(b.id) || 0) || reach.get(a.id) - reach.get(b.id)).slice(0, n);
    for (const x of pick) used.set(x.id, (used.get(x.id) || 0) + 1);
    out[s.id] = pick;
  }
  return out;
}

// The controller's showcase pose in TV: turned ~26° toward the speech bubble
// and tipped ~13° to show its top — it faces the question it is asking, and
// its far grip tucks behind the panel. Radians; controller.js springs home to
// it (ctlMount's `pose`) exactly as other layouts spring home to face-on.
const TV_CTL_POSE = { yaw: 0.45, pitch: 0.22 };

// ── The JS half of the reduced-motion contract ───────────────────────────────
// css/styles.css's global block zeroes animation/transition durations and CSS
// scroll-behavior. It reaches NONE of: the rail's rAF drift, scrollTo's
// explicit {behavior:'smooth'} (a JS option that overrides the CSS property),
// or the Random spin's own 1800 ms tween. Each checks this itself. Reference
// shape: combReducedMotion(), js/games/comb.js:1309.
function tvReduced() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

// ── Instances ────────────────────────────────────────────────────────────────
// Two mounts can be live at once (index.html's Pane 3 and, separately,
// tv.html) and each needs its OWN rail scroll and rAF. A module-level
// singleton would have them fighting over one handle, so the instance hangs
// off its container and every apply walks the list.
const TV_INSTANCES = [];

function tvMount(container, hostClass) {
  const live = container.__tv;
  if (live && live.root.isConnected) { tvApply(live); return live; }
  if (live) tvDrop(container);
  container.innerHTML = '';
  const host = document.createElement('div');
  host.className = hostClass;
  const inst = tvBuild();
  host.appendChild(inst.root);
  container.appendChild(host);
  container.__tv = inst;
  inst.container = container;
  TV_INSTANCES.push(inst);
  // A reload or a re-mount mid-spin would otherwise leave spinning === true
  // and freeze the drift for good (README § 7.7's "guard the spin flag").
  if (TV_STATE.spinning) TV_STATE.spinning = false;
  tvWatchMotion();
  tvApply(inst);
  tvStartClock(inst);
  tvBindRail(inst);
  tvStartDrift(inst);
  return inst;
}

function tvDrop(container) {
  const inst = container && container.__tv;
  if (!inst) return;
  if (inst.raf) { cancelAnimationFrame(inst.raf); inst.raf = null; }
  if (inst.spinRaf) { cancelAnimationFrame(inst.spinRaf); inst.spinRaf = null; }
  if (inst.clock) { clearInterval(inst.clock); inst.clock = null; }
  if (inst.snapT) { clearTimeout(inst.snapT); inst.snapT = null; }
  if (inst.animT) { clearTimeout(inst.animT); inst.animT = null; }
  const i = TV_INSTANCES.indexOf(inst);
  if (i >= 0) TV_INSTANCES.splice(i, 1);
  delete container.__tv;
}

// Prune first: an instance whose root left the document is a leaked rAF.
function tvApplyAll() {
  for (const inst of TV_INSTANCES.slice()) {
    if (!inst.root.isConnected) { tvDrop(inst.container); continue; }
    tvApply(inst);
  }
}

// TV-only state (shelf, selection, spin). A FILTER change goes through
// lbSet() instead, so Shelves reflects it too — the mounts are
// idempotent now, so lbSet's calls land here as a patch, not a rebuild.
function tvSet(patch) {
  Object.assign(TV_STATE, patch);
  tvApplyAll();
}

// ── Build: the whole tree, once per mount. Everything that ever changes is
// stashed on inst.els so tvApply() can patch it without touching innerHTML.
function tvBuild() {
  const inst = {
    root: null, els: {}, sl: 0, raf: null, spinRaf: null, clock: null, snapT: null, animT: null,
    pauseUntil: 0, hovering: false, dragging: false, animating: false,
    bound: false, positioned: false, suppressClick: false,
    swollen: [], swellSl: null, swellSel: null, lastF: null, waveAt: 0,
  };
  const root = document.createElement('div');
  root.className = 'lb-tv lb-lounge';        // .lb-tv for the palette + button reset;
  const inn = document.createElement('div'); //  .lb-lounge so the .lb-tv-browse zoom rules never apply
  inn.className = 'lb-lg-in';
  root.appendChild(inn);
  inst.root = root;

  inn.appendChild(tvBuildHeader(inst));
  inn.appendChild(tvBuildBody(inst));
  inn.appendChild(tvBuildRail(inst));
  tvBuildPick(inst);
  tvBuildShelf(inst);
  return inst;
}

// ── Header: wordmark · clock · tools pill ────────────────────────────────────
// The wordmark is the live-text lockup Shelves and Classic carry (.sylly-wordmark,
// SW v238) — stacked, extruded, sparkled — sized to sit inside the bar. It
// replaced a one-line "Little Sylly" + pink pill that predated the lockup.
function tvBuildHeader(inst) {
  const h = document.createElement('div');
  h.className = 'lb-lg-head';
  h.innerHTML = `
    <div class="sylly-wordmark lb-lg-mark" role="img" aria-label="Little Sylly Games">
      <span class="sylly-wordmark-a" aria-hidden="true">Little Sylly</span><span class="sylly-wordmark-b" aria-hidden="true">Games</span>
    </div>
    <div class="lb-lg-clock" role="timer" aria-live="off">
      <span class="lb-lg-date"><span class="lb-lg-date-d"></span><span class="lb-lg-date-m"></span></span>
      <span class="lb-lg-flips" aria-hidden="true">
        ${[0, 1].map(i => tvFlipTile('h' + i)).join('')}<span class="lb-lg-colon"><i></i><i></i></span>${[0, 1].map(i => tvFlipTile('m' + i)).join('')}
        <span class="lb-lg-ampm"></span>
      </span>
      <button class="lb-lg-hour" hidden></button>
    </div>
    <div class="lb-lg-tools">
      <button class="lb-lg-tool is-sound" title="Sound" aria-label="Sound">🔊</button>
      <button class="lb-lg-tool is-jukebox" data-lobby-place="jukebox" title="Jukebox" aria-label="Jukebox">🎵</button>
      <button class="lb-lg-tool is-stickers" data-lobby-place="stickers" title="Stickers" aria-label="Stickers" hidden>📒</button>
      <div class="lb-lg-modes" role="tablist" aria-label="Lobby layout"></div>
    </div>`;
  inst.els.clock = h.querySelector('.lb-lg-clock');
  inst.els.hour = h.querySelector('.lb-lg-hour');
  inst.els.hour.addEventListener('click', () => { const id = inst.els.hour.dataset.id; if (id) tvSelect(id); });
  inst.els.placeStickers = h.querySelector('.is-stickers');

  /* Sound opens the app's one sound overlay. The trophy is gone for v1 — the
     stickerbook's own layout icon is deferred (spec § 6.1, § 13). */
  h.querySelector('.lb-lg-tool.is-sound').addEventListener('click', () => openSoundOverlay());

  // The rooms' doors — same two places as Shelves/Classic (DD-49), TV's own
  // compact icon idiom rather than their labelled row (TV keeps its own
  // header). Dispatches through lobbyOpenPlace like every other place button,
  // so it obeys the same router-only rule and the same "absent, not dimmed"
  // gate on Stickers — see tvApply's repaint of .is-stickers' hidden state.
  h.querySelectorAll('[data-lobby-place]').forEach(b =>
    b.addEventListener('click', () => lobbyOpenPlace(b.dataset.lobbyPlace)));

  // The layout switcher, rendered from LOBBY_LAYOUTS like every other. TV is
  // the current mode; a layout this device may not use is absent, not dimmed.
  const modes = h.querySelector('.lb-lg-modes');
  for (const v of LobbyRouter.LOBBY_LAYOUTS) {
    const on = v.id === 'tv';
    if (!on && typeof lobbyOffered === 'function' && !lobbyOffered(v.id)) continue;
    const b = document.createElement('button');
    b.className = 'lb-lg-mode' + (on ? ' is-on' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.title = v.label;
    b.setAttribute('aria-label', v.label);
    b.innerHTML = `<span class="lb-lg-mode-ico" aria-hidden="true">${v.ico}</span>${on ? v.label : ''}`;
    if (!on) b.addEventListener('click', () => lobbyGo(v.id));
    modes.appendChild(b);
  }
  return h;
}

// Re-render every 30s, per README § 3. It is an interval on the instance, so
// tvDrop() clears it — § Timer Lifecycle.
//
// Locale is pinned to en-AU rather than left to the browser's. Two reasons:
// the mock's "Thu, Sep 17 · 10:09 AM" is a US machine's rendering of the
// shape, and this suite is Australian English by rule (CLAUDE.md § Token
// Hygiene) — an Australian lounge reads "Thu, 17 Sep · 11:45 am". Pinning it
// also makes the header deterministic, so a screenshot taken on any machine
// is comparable. The day/month ORDER is the locale's; the shape (weekday,
// date · time) is the spec's.
function tvClockText(d) {
  const day = d.toLocaleDateString('en-AU', { weekday: 'short' });
  const date = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).replace('Sept', 'Sep');
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(/\s+/g, ' ');
  return `${day}, ${date} · ${time}`;
}
// ── The flip clock ───────────────────────────────────────────────────────────
// The time on split-flap tiles, the date as a quiet label beside it. A tile is
// four halves: the resting top and bottom, and two flaps that only exist while
// it turns — the old top folding down (0 → -90°) and then the new bottom
// folding into place (90° → 0). Only a digit that CHANGED flips, so a minute
// tick turns one tile and the hour turns two or three: the clock stays still
// for 59 seconds of every 60. Transform only; the global reduced-motion block
// collapses the flip to nothing and `animationend` still lands the new digit.
function tvFlipTile(key) {
  return `<span class="lb-lg-fd" data-k="${key}">
    <span class="lb-lg-fd-h lb-lg-fd-top"><b></b></span><span class="lb-lg-fd-h lb-lg-fd-bot"><b></b></span>
    <span class="lb-lg-fd-h lb-lg-fd-top lb-lg-fd-f1"><b></b></span><span class="lb-lg-fd-h lb-lg-fd-bot lb-lg-fd-f2"><b></b></span>
  </span>`;
}
function tvFlipTo(tile, v) {
  const [top, bot, f1, f2] = tile.children;
  const old = tile.dataset.v;
  if (old === v) return;
  tile.dataset.v = v;
  tile.classList.toggle('is-blank', v === '');
  if (old === undefined) {                               // first paint: no flip
    top.firstChild.textContent = bot.firstChild.textContent = v;
    return;
  }
  top.firstChild.textContent = v;          // the new top waits behind the falling flap
  f1.firstChild.textContent = old;         // the old top falls...
  f2.firstChild.textContent = v;           // ...and the new bottom swings down over the old one
  tile.classList.remove('is-flip');
  void tile.offsetWidth;
  tile.classList.add('is-flip');
  f2.addEventListener('animationend', () => {
    bot.firstChild.textContent = tile.dataset.v;
    tile.classList.remove('is-flip');
  }, { once: true });
}
// ── The game of the hour ─────────────────────────────────────────────────────
// For the first minute of every hour a small sticker pops up beside the clock —
// a different game each hour, walking TV_ORDER — and tapping it picks that game.
// A cuckoo, not a notification: it asks nothing and is gone at :01.
function tvHourGame(d) { return d.getMinutes() === 0 ? TV_ORDER[d.getHours() % TV_ORDER.length] : null; }
function tvPaintHour(inst, d) {
  const btn = inst.els.hour, id = tvHourGame(d);
  if ((btn.dataset.id || null) === id) return;
  btn.hidden = !id;
  btn.dataset.id = id || '';
  if (!id) { btn.innerHTML = ''; return; }
  const g = lbGame(id);
  btn.title = `Game of the hour: ${g.gameName}`;
  btn.setAttribute('aria-label', `Game of the hour: ${g.gameName}`);
  btn.innerHTML = tvSticker(g, 'lb-lg-hour-art');
}
function tvStartClock(inst) {
  const clock = inst.els.clock;
  const tiles = {};
  clock.querySelectorAll('.lb-lg-fd').forEach(t => { tiles[t.dataset.k] = t; });
  const paint = (at) => {
    const d = at || new Date();
    tvPaintHour(inst, d);
    clock.setAttribute('aria-label', tvClockText(d));
    clock.querySelector('.lb-lg-date-d').textContent = d.toLocaleDateString('en-AU', { weekday: 'short' });
    clock.querySelector('.lb-lg-date-m').textContent = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).replace('Sept', 'Sep');
    const h = String(d.getHours() % 12 || 12), m = String(d.getMinutes()).padStart(2, '0');
    tvFlipTo(tiles.h0, h.length === 2 ? h[0] : '');     // 12-hour, no leading zero: 7:41, 12:05
    tvFlipTo(tiles.h1, h[h.length - 1]);
    tvFlipTo(tiles.m0, m[0]);
    tvFlipTo(tiles.m1, m[1]);
    clock.querySelector('.lb-lg-ampm').textContent = d.getHours() < 12 ? 'am' : 'pm';
  };
  // Wake just after each minute boundary, so the flip lands ON the minute. A
  // self-rescheduling timeout rather than an interval; tvDrop's clearInterval
  // clears it too (timeouts and intervals share one id pool, per the HTML spec).
  const next = () => { paint(); inst.clock = setTimeout(next, 60050 - Date.now() % 60000); };
  inst.paintClock = paint;             // a date in, for the harness (the hour sticker at :00)
  next();
}

// ── Body: controller | speech-bubble panel | reserved pane ───────────────────
function tvBuildBody(inst) {
  const body = document.createElement('div');
  body.className = 'lb-lg-body';

  // Left: the controller — the ornament slot (js/controller.js ctlMountOrnament
  // moves the one live canvas here), asking the question. "You" opens the same
  // nickname popover as Shelves', in place.
  const left = document.createElement('div');
  left.className = 'lb-lg-left';
  // The stage: a halo behind and a plinth underneath, so the controller reads
  // as the figurine on display rather than a render dropped on the page. Pure
  // decoration, and static — nothing here moves, so reduced motion needs nothing.
  left.innerHTML = `
    <div class="lb-lg-stage">
      <span class="lb-lg-halo" aria-hidden="true"></span>
      <span class="lb-lg-plinth" aria-hidden="true"></span>
      <span class="lb-lg-ctl ctl-ornament" id="tv-controller" role="button" tabindex="0" aria-label="Your controller — tap to customise"></span>
    </div>
    <div class="lb-lg-you-wrap">
      <button class="lb-lg-you" aria-haspopup="dialog" aria-expanded="false">You ▾</button>
    </div>`;
  const youWrap = left.querySelector('.lb-lg-you-wrap');
  const youBtn = left.querySelector('.lb-lg-you');
  youBtn.addEventListener('click', () => {
    const pop = youWrap.querySelector('.lb-you-pop');
    if (pop) pop.remove();
    else { youWrap.insertAdjacentHTML('beforeend', lbRenderProfilePop()); lbWireProfilePop(youWrap); }
    youBtn.setAttribute('aria-expanded', String(!pop));
  });
  inst.els.left = left;
  body.appendChild(left);

  // Middle: the speech bubble. Two states in ONE card (README § 5) — the
  // picker and the open shelf are siblings toggled by hidden, never a
  // rebuild, so the card's geometry never flickers between them.
  const panel = document.createElement('div');
  panel.className = 'lb-lg-panel';
  panel.innerHTML = `
    <span class="lb-lg-tail" aria-hidden="true"></span>
    <div class="lb-lg-pick"></div>
    <div class="lb-lg-shelf" hidden></div>`;
  inst.els.panel = panel;
  inst.els.pick = panel.querySelector('.lb-lg-pick');
  inst.els.shelfView = panel.querySelector('.lb-lg-shelf');
  body.appendChild(panel);

  // Right: ALWAYS reserved (README § 6) — the column never appears or
  // disappears, only its two children swap, so the middle column's width
  // never moves under the player's eye mid-decision.
  const pane = document.createElement('div');
  pane.className = 'lb-lg-pane-slot';
  // The empty state: a small pile of real stickers, not three flat coloured
  // lids — the games themselves are the most inviting thing we have.
  pane.innerHTML = `
    <div class="lb-lg-empty">
      <div class="lb-lg-pile" aria-hidden="true">
        ${TV_PILE.map((id, i) => {
          const g = lbGame(id);
          return g ? `<span class="lb-lg-pile-s" style="--pile-i:${i}">${tvSticker(g, 'lb-lg-pile-art')}</span>` : '';
        }).join('')}
      </div>
      <div class="lb-lg-empty-text">
        <p class="lb-lg-empty-h">20 games in the box</p>
        <p class="lb-lg-empty-s">Pick a shelf, or take one off the rail below — it lands here.</p>
      </div>
    </div>
    <div class="lb-lg-card" hidden></div>`;
  inst.els.paneEmpty = pane.querySelector('.lb-lg-empty');
  inst.els.paneCard = pane.querySelector('.lb-lg-card');
  body.appendChild(pane);
  return body;
}

// ── The one patch entry. Everything below repaints THROUGH this. ─────────────
function tvApply(inst) {
  // Jukebox is always offered; Stickers is absent until the sticker manifest
  // has loaded (lobbyPlaceOffered) — repainted here because lobbyPaintPlaces()
  // scopes its own query to #screen-lobby and never sees TV's own buttons.
  if (inst.els.placeStickers) {
    inst.els.placeStickers.hidden = !(typeof lobbyPlaceOffered === 'function' && lobbyPlaceOffered('stickers'));
  }
  const open = !!TV_STATE.shelf;
  inst.els.pick.hidden = open;
  inst.els.shelfView.hidden = !open;
  if (open) tvPaintShelf(inst); else tvPaintPick(inst);
  inst.els.paneEmpty.hidden = !!TV_STATE.sel;
  inst.els.paneCard.hidden = !TV_STATE.sel;
  if (TV_STATE.sel) tvPaintCard(inst);
  tvPaintRail(inst);
}

// ═══ Panel ═══════════════════════════════════════════════════════════════════

const TV_COUNTS = ['any', 2, 3, 4, 5, 6, 7, 8];

// The die-cut sticker, or Bailed's fallback. One helper for all three surfaces
// (shelf well, detail pane, rail box) so the Bailed path can never be right in
// two of them and missing in the third. README § 9: the fallback is the
// shipped phone treatment; used by any game in LB_NO_STICKER (none since bld.png).
function tvSticker(g, cls) {
  if (LB_NO_STICKER.has(g.id)) {
    return `<span class="${cls} lb-lg-disc" aria-hidden="true">${g.emoji}</span>`;
  }
  return `<span class="${cls} lb-lg-art" aria-hidden="true"
    style="--gs-tilt:${tvTilt(g.id)}; background-image:url(data/stickers/${g.id}.png)"></span>`;
}

// ── Panel state A: the shelf picker (README § 5a) ───────────────────────────
function tvBuildPick(inst) {
  const el = inst.els.pick;
  el.innerHTML = `
    <p class="lb-lg-ask">What are we playing today?</p>
    <div class="lb-lg-filters">
      <div class="lb-lg-filter">
        <p class="lb-lg-flabel">How many of you</p>
        <div class="lb-lg-keys lb-lg-keys-count"></div>
      </div>
      <div class="lb-lg-filter lb-lg-filter-phones">
        <p class="lb-lg-flabel">Phones</p>
        <div class="lb-lg-keys lb-lg-keys-phone"></div>
      </div>
    </div>
    <p class="lb-lg-count"></p>
    <div class="lb-lg-pills"></div>`;
  inst.els.keysCount = el.querySelector('.lb-lg-keys-count');
  inst.els.keysPhone = el.querySelector('.lb-lg-keys-phone');
  inst.els.countLine = el.querySelector('.lb-lg-count');
  inst.els.pills = el.querySelector('.lb-lg-pills');

  for (const c of TV_COUNTS) {
    const b = document.createElement('button');
    b.className = 'lb-lg-key';
    b.dataset.count = String(c);
    b.textContent = c === 'any' ? 'Any' : (c === 8 ? '8+' : String(c));
    b.addEventListener('click', () => lbSet({ count: c === 'any' ? null : c }));
    inst.els.keysCount.appendChild(b);
  }
  for (const p of [{ label: 'One phone', one: true }, { label: 'A phone each', one: false }]) {
    const b = document.createElement('button');
    b.className = 'lb-lg-key lb-lg-key-phone';
    b.dataset.one = String(p.one);
    b.textContent = p.label;
    b.addEventListener('click', () => lbSet({ onePhone: p.one }));
    inst.els.keysPhone.appendChild(b);
  }

  // Six shelf tiles, each fanning the first three of its games' stickers — the
  // TV cousin of Shelves' brand stacks, so a shelf shows what is ON it rather
  // than only its name. Pre-tilted in the MARKUP, not by a script, so the field
  // still reads as slapped-on stickers with motion reduced (README § 8). The
  // grid wraps and the tilts cycle by index, so a seventh shelf costs nothing.
  // Below a narrow panel the fan gives way to the emoji disc (CSS, tvpanel).
  const ROT = [-1.5, 1.2, -1, 1.5, -1.2, 1];
  const fans = tvShelfFans(LB_SHELVES, lbShelfGames);
  LB_SHELVES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'lb-lg-pill';
    b.dataset.shelf = s.id;
    b.title = s.label;
    b.style.setProperty('--pill-rot', `${ROT[i % 6]}deg`);
    const fan = fans[s.id];
    b.innerHTML = `
      <span class="lb-lg-pill-fan" aria-hidden="true">${fan.map((g, j) =>
        `<span class="lb-lg-fan-s" data-id="${g.id}" style="--fan-i:${j}">${tvSticker(g, 'lb-lg-fan-art')}</span>`).join('')}</span>
      <span class="lb-lg-pill-disc"><span class="lb-lg-pill-emoji" style="animation-delay:${(i * 0.24).toFixed(2)}s">${s.emoji}</span></span>
      <span class="lb-lg-pill-text">
        <span class="lb-lg-pill-name"><span class="lb-lg-pill-ico" aria-hidden="true">${s.emoji}</span>${s.label}</span>
        <span class="lb-lg-pill-count"></span>
      </span>`;
    b.addEventListener('click', () => tvOpenShelf(s.id));
    inst.els.pills.appendChild(b);
  });
}

// Only the live numbers repaint. The keycaps, pills and their tilts are built
// once — a filter tap must not re-slap the sticker field.
function tvPaintPick(inst) {
  const c = lbState.count;
  for (const b of inst.els.keysCount.children) {
    const v = b.dataset.count;
    // The 8 key is "8+", so it also holds for the phone stepper's 9 and 10.
    const on = v === 'any' ? c == null : (+v === 8 ? c >= 8 : c === +v);
    b.classList.toggle('is-on', !!on);
    b.setAttribute('aria-pressed', String(!!on));
  }
  for (const b of inst.els.keysPhone.children) {
    const on = (b.dataset.one === 'true') === lbState.onePhone;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  inst.els.countLine.textContent = lbFitLine();
  const active = lbState.count != null || lbState.onePhone;
  for (const b of inst.els.pills.children) {
    const games = lbShelfGames(b.dataset.shelf);
    const fit = games.filter(g => !lbWhyOut(g)).length;
    b.querySelector('.lb-lg-pill-count').textContent =
      active ? `${fit} of ${games.length} fit` : `${games.length} games`;
    // The fan answers the filters too: a sticker that doesn't fit greys out,
    // the same treatment the open shelf's well gives it.
    for (const f of b.querySelectorAll('.lb-lg-fan-s')) f.classList.toggle('is-out', !!lbWhyOut(lbGame(f.dataset.id)));
  }
}

// ── Panel state B: a shelf, open in the SAME card (README § 5b) ─────────────
function tvBuildShelf(inst) {
  const el = inst.els.shelfView;
  el.innerHTML = `
    <div class="lb-lg-shead">
      <button class="lb-lg-back">← Shelves</button>
      <div class="lb-lg-stitle">
        <span class="lb-lg-semoji"></span>
        <p class="lb-lg-sname"></p>
        <p class="lb-lg-scount"></p>
      </div>
      <span class="lb-lg-sspacer"></span>
    </div>
    <div class="lb-lg-well"></div>`;
  el.querySelector('.lb-lg-back').addEventListener('click', () => tvSet({ shelf: null, sel: null }));
  inst.els.sEmoji = el.querySelector('.lb-lg-semoji');
  inst.els.sName = el.querySelector('.lb-lg-sname');
  inst.els.sCount = el.querySelector('.lb-lg-scount');
  inst.els.well = el.querySelector('.lb-lg-well');
}

// The well IS rebuilt on repaint — its content is a different set of games per
// shelf and the sway phases are per-game, so there is nothing stable to patch.
// It is ~8 nodes and never animates during a rebuild.
function tvPaintShelf(inst) {
  const s = LB_SHELVES.find(x => x.id === TV_STATE.shelf);
  if (!s) return;
  const games = lbSortByFit(lbShelfGames(s.id));
  const fit = games.filter(g => !lbWhyOut(g)).length;
  const active = lbState.count != null || lbState.onePhone;
  inst.els.sEmoji.textContent = s.emoji;
  inst.els.sName.textContent = s.label;
  inst.els.sCount.textContent = active ? `${fit} of ${games.length} fit` : `${games.length} games`;

  inst.els.well.innerHTML = '';
  for (const g of games) {
    const why = lbWhyOut(g);
    const b = document.createElement('button');
    b.className = 'lb-lg-gs' + (why ? ' is-out' : '') + (TV_STATE.sel === g.id ? ' is-sel' : '');
    b.title = g.gameName;
    b.setAttribute('aria-pressed', String(TV_STATE.sel === g.id));
    b.setAttribute('aria-label', `${g.gameName}${why ? ' — ' + why : ''}`);
    b.style.setProperty('--gs-brand', g.brandHex);
    b.innerHTML = `
      <span class="lb-lg-blob" aria-hidden="true"></span>
      <span class="lb-lg-gs-art" style="animation-delay:${tvSwaySeed(g.id)}s">${tvSticker(g, 'lb-lg-gs-sticker')}</span>
      <span class="lb-lg-tag" style="${why ? '' : `background:${g.brandHex};color:${tvInk(g.brandHex)}`}">${why ? why : lbEsc(g.gameName)}</span>`;
    b.addEventListener('click', () => tvSelect(g.id));
    inst.els.well.appendChild(b);
  }
}

// Opening a shelf lands on a RANDOM game from it — owner decision, 17 Sep
// 2026 (README § 9 lists "its first game instead" as the open alternative; it
// was closed in favour of random). Fitting games only, unless none fit.
function tvOpenShelf(shelfId) {
  const games = lbShelfGames(shelfId);
  const pool = games.filter(g => !lbWhyOut(g));
  const from = pool.length ? pool : games;
  const pick = from[Math.floor(Math.random() * from.length)];
  tvSet({ shelf: shelfId, sel: pick.id });
  tvScrollToId(pick.id);
}

// Selecting from anywhere — a shelf sticker or a rail box. Both centre the
// rail on it (README § 7.5).
// `fromRoll` marks a pick Random Game made, so its button can say what landed;
// any other pick (a rail box, a shelf sticker) clears that.
function tvSelect(id, fromRoll) {
  for (const inst of TV_INSTANCES) inst.lastRoll = fromRoll ? id : null;
  const g = lbGame(id);
  tvSet({ sel: id, shelf: TV_STATE.shelf || (g && g.shelves[0]) || null });
  tvScrollToId(id);
}

// ═══ Detail pane ═════════════════════════════════════════════════════════════

// No chips and no reason line: the shipped .dc.html has both the chip
// <sc-for> and the reason <sc-if> bodies emptied (owner, 17 Sep 2026 —
// README § 6's chip sentence is stale), and § 6 names the reason's two homes
// as the shelf well and under the rail boxes. The players/phones the chips
// used to carry now ride the selected rail box's extended tab instead.
function tvPaintCard(inst) {
  const g = lbGame(TV_STATE.sel);
  if (!g) return;
  const ink = tvInk(g.brandHex), label = tvLabel(g.brandHex), name = tvSplitName(g.gameName);
  const cta = TV_STATE.plainCta ? 'Play' : g.playCtaLabel;
  const sylly = g.syllyModeName
    ? `<span class="lb-lg-sy-k" style="color:${label}">✨ Sylly Mode</span> · ${lbEsc(g.syllyModeName)}`
    : `<span class="lb-lg-sy-k" style="color:${label}">✨ Sylly Mode</span> · Not this one — its own settings carry the dial.`;

  // The band is the hero: it GROWS into whatever height the pane has spare
  // (flex, capped), and the sticker scales with it — so the room a tall
  // screen gives the pane goes to the game's art, not to white space above
  // the CTA. At 900×500 it shrinks to a strip and the body scrolls, as before.
  inst.els.paneCard.style.setProperty('--card-brand', g.brandHex);
  inst.els.paneCard.innerHTML = `
    <div class="lb-lg-band" style="background-color:${g.brandHex}">
      <span class="lb-lg-band-glow" aria-hidden="true"></span>
      <button class="lb-lg-x" title="Close" aria-label="Close">✕</button>
      ${tvSticker(g, 'lb-lg-hang')}
    </div>
    <div class="lb-lg-cbody">
      <h2 class="lb-lg-ct"><span>${lbEsc(name.a)}</span><span style="color:${label}">${lbEsc(name.b)}</span></h2>
      <p class="lb-lg-cp">${lbEsc(g.pitch)}</p>
      <div class="lb-lg-steps">
        <p class="lb-lg-slabel" style="color:${label}">How it goes</p>
        ${g.howItGoes.map((t, i) => `
          <div class="lb-lg-step">
            <span class="lb-lg-sn" style="background:${g.brandHex};color:${ink}">${i + 1}</span>
            <p>${lbEsc(t)}</p>
          </div>`).join('')}
      </div>
      <p class="lb-lg-sy">${sylly}</p>
    </div>
    <div class="lb-lg-cfoot">
      <button class="lb-lg-play" style="background-color:${g.brandHex};color:${ink}">${lbEsc(cta)}</button>
    </div>`;
  inst.els.paneCard.querySelector('.lb-lg-x')
    .addEventListener('click', () => tvSet({ sel: null }));
  inst.els.paneCard.querySelector('.lb-lg-play')
    .addEventListener('click', () => lobbyLaunch(g.id));
}

// ═══ The rail ════════════════════════════════════════════════════════════════
// 5 concatenated copies of ORDER, not 3: at 1920 the visible window is wide
// enough that a 3-copy loop shows the seam at the wrap point (README § 7.2).
// The list is built ONCE; tvPaintRail() patches the 100 items in place, which
// is what lets scrollLeft, the rAF and an in-flight smooth scroll survive a
// filter change.
function tvBuildRail(inst) {
  const wrap = document.createElement('div');
  wrap.className = 'lb-lg-railwrap';

  // Random Game — the Workshop's Randomise All in daylight: an SVG die, the
  // label over a live line, and ONE dot. At rest the dot is a wheel of every
  // brand; while the rail spins it takes the colour of whichever box is passing
  // the centre (tvSpin), so it shuffles in time with the rail; on landing it
  // bursts into the rolled game's colour and the line says what came up.
  const spin = document.createElement('button');
  spin.className = 'lb-lg-spin';
  spin.innerHTML = `
    <span class="lb-lg-spin-die" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="8.2" cy="8.2" r="1.7"/><circle cx="15.8" cy="8.2" r="1.7"/><circle cx="12" cy="12" r="1.7"/>
        <circle cx="8.2" cy="15.8" r="1.7"/><circle cx="15.8" cy="15.8" r="1.7"/>
      </svg>
    </span>
    <span class="lb-lg-spin-txt"><span class="lb-lg-spin-lbl">Random Game</span><span class="lb-lg-spin-sub"></span></span>
    <span class="lb-lg-spin-dot" aria-hidden="true"></span>`;
  spin.addEventListener('click', () => tvSpin(inst));
  inst.els.spin = spin;
  inst.els.spinSub = spin.querySelector('.lb-lg-spin-sub');
  inst.els.spinDot = spin.querySelector('.lb-lg-spin-dot');
  inst.els.spinDot.style.setProperty('--wheel', `conic-gradient(${TV_ORDER.map((id, i) => `${lbGame(id).brandHex} ${i * 18}deg ${(i + 1) * 18}deg`).join(', ')})`);
  wrap.appendChild(spin);

  const rail = document.createElement('div');
  rail.className = 'lb-lg-rail';
  rail.tabIndex = 0;
  rail.setAttribute('role', 'listbox');
  rail.setAttribute('aria-label', 'All 20 games');
  inst.els.boxes = [];
  for (let c = 0; c < TV_COPIES; c++) {
    TV_ORDER.forEach((id, i) => {
      const g = lbGame(id);
      const item = document.createElement('div');
      item.className = 'lb-lg-item';        // the TRANSFORM GROUP — jumpIn/reBounce ride here
      item.dataset.id = id;
      item.dataset.idx = String(i);
      item.innerHTML = `
        <div class="lb-lg-boxwrap">
          <span class="lb-lg-tab" aria-hidden="true">${lbEsc(lbPlayersText(g))} · ${lbEsc(lbPhoneText(g))}</span>
          <button class="lb-lg-box" style="background-color:${g.brandHex}" role="option"
            title="${lbEsc(g.gameName)}"
            aria-label="${lbEsc(g.gameName)}, ${lbEsc(lbPlayersText(g))} players, ${lbEsc(lbPhoneText(g))}">
            ${tvSticker(g, 'lb-lg-bsticker')}
            <span class="lb-lg-bname" style="color:${tvInk(g.brandHex)}">${lbEsc(g.gameName)}</span>
          </button>
        </div>
        <span class="lb-lg-reason"></span>`;
      item.querySelector('.lb-lg-box').addEventListener('click', () => {
        if (inst.suppressClick || TV_STATE.spinning) return;
        tvPause(inst);
        tvSelect(id);
      });
      inst.els.boxes.push(item);
      rail.appendChild(item);
    });
  }
  inst.els.rail = rail;
  wrap.appendChild(rail);
  inst.els.railwrap = wrap;
  return wrap;
}

// Patch, never rebuild. 100 items, four attributes each.
function tvPaintRail(inst) {
  if (!inst.els.boxes) return;
  for (const item of inst.els.boxes) {
    const g = lbGame(item.dataset.id);
    const why = lbWhyOut(g);
    const sel = TV_STATE.sel === g.id;
    item.classList.toggle('is-out', !!why);
    item.classList.toggle('is-sel', sel);
    const reason = item.querySelector('.lb-lg-reason');
    if (reason.textContent !== (why || '')) reason.textContent = why || '';
    item.querySelector('.lb-lg-box').setAttribute('aria-selected', String(sel));
  }
  inst.els.spin.classList.toggle('is-spinning', !!TV_STATE.spinning);
  // The line under Random Game: what the roll draws from (fitting games, or all
  // 20 when none fit) — or, while a rolled game is still the pick, what landed.
  const fits = TV_ORDER.filter(id => !lbWhyOut(lbGame(id)));
  // The line and dot tell what the LAST roll gave while it is still the pick;
  // anything else (a hand-picked game, a closed pane) puts the wheel back.
  const rolled = !TV_STATE.spinning && inst.lastRoll && TV_STATE.sel === inst.lastRoll ? lbGame(inst.lastRoll) : null;
  const sub = rolled ? `landed on ${rolled.gameName}`
    : fits.length && fits.length < TV_ORDER.length ? `from ${fits.length} that fit` : `from all ${TV_ORDER.length}`;
  if (inst.els.spinSub.textContent !== sub) inst.els.spinSub.textContent = sub;
  inst.els.spin.setAttribute('aria-label', `Random Game, ${sub}`);
  if (!TV_STATE.spinning) {
    inst.els.spinDot.classList.toggle('is-rolled', !!rolled);
    inst.els.spinDot.style.backgroundColor = rolled ? rolled.brandHex : '';
  }
}

// One-shot: land in the middle of the five copies so there is a full list of
// headroom on both sides before the first wrap is needed.
//
// If a game is ALREADY selected when the rail first lays out — the hash
// seeded one, or a shelf was opened before the rail existed — land on it
// rather than on index 0. Directly, not through tvSnapTo: the first frame is
// not a transition the player made, and smooth-scrolling it would look like
// the rail was already moving before they touched anything.
function tvPositionRail(inst) {
  const el = inst.els.rail;
  if (!el || inst.positioned) return;
  if (el.scrollWidth < TV_COPIES * TV_W) return;   // still laying out
  inst.positioned = true;
  const idx = TV_STATE.sel ? TV_ORDER.indexOf(TV_STATE.sel) : -1;
  el.scrollLeft = (2 * TV_ORDER.length + Math.max(0, idx)) * TV_ITEM;
  inst.sl = el.scrollLeft;
}

// ── Drift ────────────────────────────────────────────────────────────────────
// Continuous, ~0.38px/frame rightwards. The rAF runs for the instance's whole
// life and gates itself — starting and stopping a loop on every hover would
// drop frames at the hand-off. Cancelled in tvDrop(), which is § Timer
// Lifecycle applied to a rAF (a rAF is a timer; cf. nt.js's ntRafHandle).
function tvDriftActive(inst) {
  return inst.positioned
    && !tvReduced()                 // the CSS block cannot reach a rAF — README § 8
    && !inst.dragging && !inst.animating && !inst.hovering
    && !TV_STATE.spinning && !TV_STATE.sel     // a pick freezes the rail so it stays findable
    && performance.now() >= inst.pauseUntil;
}

function tvStartDrift(inst) {
  const step = () => {
    inst.raf = requestAnimationFrame(step);
    const el = inst.els.rail;
    if (!el) return;
    tvPositionRail(inst);
    tvSwell(inst);
    if (!tvDriftActive(inst)) { inst.sl = null; inst.lastF = null; return; }
    // Re-sync if anything else moved the scroll since the last frame (a snap,
    // a wheel); otherwise accumulate sub-pixel travel ourselves, because
    // scrollLeft rounds and 0.38px/frame would floor to zero.
    if (inst.sl == null || Math.abs(inst.sl - el.scrollLeft) > 2) inst.sl = el.scrollLeft;
    inst.sl += 0.38;
    el.scrollLeft = inst.sl;
    // A box has just reached dead centre when floor(sl / pitch) ticks up by ONE.
    // Exactly one: the loop's wrap moves scrollLeft by a whole list (±20), and a
    // hop there would be a box that never crossed anything.
    const f = Math.floor(inst.sl / TV_ITEM);
    if (inst.lastF != null && f === inst.lastF + 1) tvAsk(inst, f);
    inst.lastF = f;
    const now = performance.now();
    if (!inst.waveAt) inst.waveAt = now;                    // the first wave comes a full gap after the drift starts
    else if (now - inst.waveAt > TV_WAVE_GAP_MS) { inst.waveAt = now; tvWave(inst); }
  };
  inst.raf = requestAnimationFrame(step);
}

// ── The centre swell ─────────────────────────────────────────────────────────
// Whichever box is nearest the middle rises a little and grows a touch, easing
// off with distance (a Gaussian over item units) — so the rail always has a
// "this one?" in the slot, drifting, dragged or wheeled alike. Written as the
// individual `translate`/`scale` properties on .lb-lg-boxwrap, NOT `transform`:
// they compose with the hop's transform keyframes on the same element, and
// with .is-sel's lift on .lb-lg-box inside it, without either overwriting the
// other. Position-derived and applied every frame the scroll moved, so it is
// cheap (≤4 boxes) and never lags the rail.
//
// Off with a selection (the pick has its own lift and bounce, and the rail is
// frozen), during a spin (a blur of boxes rising and falling reads as noise),
// and under reduced motion — the swell only ever shows while things travel.
const TV_SWELL_PX = 10, TV_SWELL_SCALE = 0.05, TV_SWELL_SPREAD = 0.35;
function tvSwell(inst) {
  const el = inst.els.rail;
  if (!inst.positioned) return;
  const sl = el.scrollLeft, sel = TV_STATE.sel, off = tvReduced() || !!sel || TV_STATE.spinning;
  if (sl === inst.swellSl && sel === inst.swellSel && !(off && inst.swollen.length)) return;
  inst.swellSl = sl; inst.swellSel = sel;
  for (const w of inst.swollen) { w.style.translate = ''; w.style.scale = ''; }
  inst.swollen = [];
  if (off) return;
  const c = sl / TV_ITEM, base = Math.floor(c);
  for (let i = base - 1; i <= base + 2; i++) {
    const item = inst.els.boxes[i];
    if (!item) continue;
    const d = i - c, k = Math.exp(-(d * d) / TV_SWELL_SPREAD);
    if (k < 0.02) continue;
    const w = item.firstElementChild;           // .lb-lg-boxwrap
    w.style.translate = `0 ${(-TV_SWELL_PX * k).toFixed(2)}px`;
    w.style.scale = (1 + TV_SWELL_SCALE * k).toFixed(4);
    inst.swollen.push(w);
  }
}

// ── The wave — the stickers hop out of their boxes, one after another ────────
// Every ~9 s of drifting, a ripple runs left to right along the visible boxes:
// each sticker jumps, flips its tilt at the top and lands (lb-stickerwave on
// .lb-lg-bsticker — the sticker, not the box, so it composes with the swell
// and the hop, which ride .lb-lg-boxwrap). Drift-only, like the hop, so never
// with a pick, a drag, a spin or reduced motion. Staggered by animation-delay,
// so one pass costs ~15 class toggles and no timers.
const TV_WAVE_GAP_MS = 9000, TV_WAVE_STEP_MS = 70;
function tvWave(inst) {
  const el = inst.els.rail;
  const pos = Math.round(el.scrollLeft / TV_ITEM), k = Math.ceil(el.clientWidth / TV_ITEM / 2) + 1;
  for (let i = pos - k; i <= pos + k; i++) {
    const item = inst.els.boxes[i];
    const st = item && item.querySelector('.lb-lg-bsticker');
    if (!st) continue;
    st.classList.remove('is-wave');
    void st.offsetWidth;
    st.style.animationDelay = ((i - pos + k) * TV_WAVE_STEP_MS) + 'ms';
    st.classList.add('is-wave');
    st.addEventListener('animationend', () => { st.classList.remove('is-wave'); st.style.animationDelay = ''; }, { once: true });
  }
}

// ── The glance — the controller looks at the box you are pointing at ─────────
// Turns toward the box (further left or right of the controller, more turn,
// capped) and leans forward to look down at the rail — through controller.js's
// ctlGlance, which rides the home spring, so it eases there and back and does
// nothing under reduced motion. Pointer only: a drag or a touch pan has no hover.
function tvGlance(item) {
  if (typeof ctlGlance !== 'function') return;
  if (!item) { ctlGlance(0, 0); return; }
  const slot = document.getElementById('tv-controller');
  if (!slot) return;
  const c = slot.getBoundingClientRect(), b = item.getBoundingClientRect();
  const dx = (b.left + b.width / 2) - (c.left + c.width * 0.42);   // the model sits left of the slot's centre
  ctlGlance(Math.max(-0.35, Math.min(0.5, dx / 1400)), 0.16);
}

// ── "Pick me!" — a little hop as a drifting box reaches the middle ───────────
// Drift-only (tvStartDrift calls it), so never during a drag, a spin, a
// selection or reduced motion — tvDriftActive already excludes all four. At
// ~23 px/s a box arrives every ~7 s: a cadence, not a fidget. Re-triggered by
// the class + reflow pattern (logic-engine.md § Animation Re-trigger Pattern).
function tvAsk(inst, pos) {
  const item = inst.els.boxes[pos];
  if (!item) return;
  const w = item.firstElementChild;
  w.classList.remove('is-ask');
  void w.offsetWidth;
  w.classList.add('is-ask');
  w.addEventListener('animationend', () => w.classList.remove('is-ask'), { once: true });
}

function tvPause(inst, ms) { inst.pauseUntil = performance.now() + (ms || 2600); }

// ── Input ────────────────────────────────────────────────────────────────────
function tvBindRail(inst) {
  const el = inst.els.rail;
  if (!el || inst.bound) return;
  inst.bound = true;
  el.addEventListener('scroll', () => tvOnScroll(inst), { passive: true });
  el.addEventListener('mouseenter', () => { inst.hovering = true; });
  el.addEventListener('mouseleave', () => { inst.hovering = false; inst.glanceAt = null; tvGlance(null); });
  // The controller glances at the box under the pointer (tvGlance).
  el.addEventListener('mouseover', e => {
    const item = e.target.closest && e.target.closest('.lb-lg-item');
    if (!item || item === inst.glanceAt) return;
    inst.glanceAt = item;
    tvGlance(item);
  });

  // Vertical wheel maps to horizontal — a trackpad or a mouse over the rail
  // should move the rail, not fight the page (which cannot scroll anyway).
  el.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || TV_STATE.spinning) return;
    e.preventDefault();
    tvPositionRail(inst);
    tvPause(inst);
    el.scrollLeft += e.deltaY * 1.4;
    tvQueueSnap(inst);
  }, { passive: false });

  // Drag. Touch is left to the browser's own momentum pan (touch-action:
  // pan-x) — hijacking it with pointer maths feels worse than native.
  let sx = 0, ssl = 0, drag = false, moved = false;
  el.addEventListener('pointerdown', e => {
    tvPositionRail(inst);
    tvPause(inst);
    if (e.pointerType === 'touch' || TV_STATE.spinning) return;
    drag = true; moved = false; sx = e.clientX; ssl = el.scrollLeft;
    inst.dragging = true; el.style.cursor = 'grabbing';
  });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) moved = true;         // 4px threshold: a drag is not a click
    el.scrollLeft = ssl - dx;
  });
  const up = () => {
    if (!drag) return;
    drag = false; inst.dragging = false; el.style.cursor = 'grab';
    if (moved) { inst.suppressClick = true; setTimeout(() => { inst.suppressClick = false; }, 60); }
    tvQueueSnap(inst);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);

  // One tab stop; arrows move, Enter/Space selects. This is also how a TV
  // remote drives the rail (README § 7.8).
  el.addEventListener('keydown', e => {
    if (TV_STATE.spinning) return;
    const pos = Math.round(el.scrollLeft / TV_ITEM);
    if (e.key === 'ArrowRight') { e.preventDefault(); tvSnapTo(inst, pos + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); tvSnapTo(inst, pos - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tvSelect(TV_ORDER[TV_STATE.focus]); }
  });
}

function tvOnScroll(inst) {
  const el = inst.els.rail;
  if (!el) return;
  // Never wrap mid-drag or mid-animation: moving scrollLeft by a whole W
  // under a smooth scroll makes the browser re-target and the rail lurches.
  if (!inst.animating && !inst.dragging) {
    const w = tvWrap(el.scrollLeft);
    if (w !== el.scrollLeft) { el.scrollLeft = w; inst.sl = w; }
  }
  const n = TV_ORDER.length;
  const i = ((Math.round(el.scrollLeft / TV_ITEM) % n) + n) % n;
  if (i !== TV_STATE.focus) TV_STATE.focus = i;     // not tvSet — focus never needs a repaint
  if (!inst.dragging && !inst.animating && !tvDriftActive(inst)) tvQueueSnap(inst);
}

// ── Snap ─────────────────────────────────────────────────────────────────────
function tvQueueSnap(inst) {
  clearTimeout(inst.snapT);
  inst.snapT = setTimeout(() => {
    if (inst.els.rail) tvSnapTo(inst, Math.round(inst.els.rail.scrollLeft / TV_ITEM));
  }, 140);
}

function tvSnapTo(inst, pos) {
  const el = inst.els.rail;
  if (!el || TV_STATE.spinning) return;
  tvPositionRail(inst);
  tvPause(inst, 1400);
  const target = pos * TV_ITEM;
  if (Math.abs(el.scrollLeft - target) < 1) return;
  // README § 8: scrollTo's explicit {behavior:'smooth'} OVERRIDES the CSS
  // scroll-behavior the global reduced-motion block sets, so the check is
  // here, not in the stylesheet. Frozen, the snap still lands — it just
  // arrives instead of travelling.
  if (tvReduced()) { el.scrollLeft = target; inst.sl = target; return; }
  inst.animating = true;
  clearTimeout(inst.animT);
  el.scrollTo({ left: target, behavior: 'smooth' });
  inst.animT = setTimeout(() => { inst.animating = false; }, 450);
}

// Bring a game to the rail's centre in EVERY live instance. Picking the copy
// nearest where that instance already sits is the whole point: selecting the
// first game while parked on the last would otherwise haul the rail backwards
// past all 20 boxes (README § 7.5).
function tvScrollToId(id) {
  const idx = TV_ORDER.indexOf(id);
  if (idx < 0) return;
  for (const inst of TV_INSTANCES) {
    if (!inst.els.rail) continue;
    tvPositionRail(inst);
    if (!inst.positioned) continue;
    const copy = tvNearestCopy(inst.els.rail.scrollLeft, idx);
    tvSnapTo(inst, copy * TV_ORDER.length + idx);
  }
}

// ── Random Game (README § 7.7) ───────────────────────────────────────────────
// Spins 1800ms on an ease-out cubic to a game drawn from those that FIT the
// current filters — falling back to all 20 when nothing fits, because a dice
// button that refuses to roll is worse than one that offers you a game you'd
// have to move a filter for.
function tvSpin(inst) {
  const el = inst.els.rail;
  if (!el || TV_STATE.spinning) return;
  tvPositionRail(inst);
  if (!inst.positioned) return;

  // Normalise into copy 2 first so `to` (copy 4) is always FORWARD of `from`
  // — a spin that runs backwards reads as a mistake, not a roll.
  while (el.scrollLeft >= 3 * TV_W) el.scrollLeft -= TV_W;
  while (el.scrollLeft < 2 * TV_W) el.scrollLeft += TV_W;

  const all = TV_ORDER.map((id, i) => ({ id, i }));
  const fits = all.filter(x => !lbWhyOut(lbGame(x.id)));
  const pool = fits.length ? fits : all;
  const target = pool[Math.floor(Math.random() * pool.length)];
  const to = (4 * TV_ORDER.length + target.i) * TV_ITEM;

  // Reduced motion: the OUTCOME is the information, the spin is the journey.
  // Land on it and select it — don't drop the feature (README § 8).
  if (tvReduced()) {
    el.scrollLeft = to - TV_W;
    inst.sl = el.scrollLeft;
    tvSelect(target.id, true);
    tvDotLand(inst);
    return;
  }

  const from = el.scrollLeft, t0 = performance.now(), dur = 1800;
  inst.animating = true;
  tvSet({ spinning: true });
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.scrollLeft = from + (to - from) * e;
    // The dot shuffles with the rail: the colour of the box at centre, this frame.
    const n = TV_ORDER.length, at = ((Math.round(el.scrollLeft / TV_ITEM) % n) + n) % n;
    if (at !== inst.dotAt) { inst.dotAt = at; inst.els.spinDot.style.backgroundColor = lbGame(TV_ORDER[at]).brandHex; }
    if (t < 1) { inst.spinRaf = requestAnimationFrame(step); return; }
    // Land back in the middle copies so the loop window is intact, then select.
    el.scrollLeft = to - TV_W;
    inst.sl = el.scrollLeft;
    inst.animating = false;
    inst.spinRaf = null;
    inst.dotAt = null;
    tvSet({ spinning: false });        // the guard clears on the SAME frame the tween ends
    tvSelect(target.id, true);
    tvDotLand(inst);
  };
  inst.spinRaf = requestAnimationFrame(step);
}

// The landing burst — the dot pops to the rolled colour and a ring rings out.
// CSS animation (class + reflow re-trigger), so reduced motion collapses it.
function tvDotLand(inst) {
  // ...and the chosen box rings out on the rail in its own colour, the same
  // burst as the dot's, so the eye goes from the button to the box.
  const box = inst.els.boxes && inst.els.boxes[Math.round(inst.els.rail.scrollLeft / TV_ITEM)];
  const wrap = box && box.querySelector('.lb-lg-box');   // the box itself: it carries the pick's lift
  if (wrap) {
    wrap.style.setProperty('--ring', lbGame(box.dataset.id).brandHex);
    wrap.classList.remove('is-ring');
    void wrap.offsetWidth;
    wrap.classList.add('is-ring');
    setTimeout(() => wrap.classList.remove('is-ring'), 900);
  }
  const d = inst.els.spinDot;
  d.classList.remove('is-land');
  void d.offsetWidth;
  d.classList.add('is-land');
  d.addEventListener('animationend', () => d.classList.remove('is-land'), { once: true });
}

// ── The JS half of reduced motion, part two: react to a LIVE change ─────────
// The preference can flip while the page is open — a DevTools emulation
// toggle, or the OS setting on a real device. Without this the drift stays
// frozen (or stays running) until a reload, which makes the setting look
// broken and makes verification unreliable. One listener for the document,
// not one per instance.
let tvMotionWatched = false;
function tvWatchMotion() {
  if (tvMotionWatched) return;
  tvMotionWatched = true;
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      for (const inst of TV_INSTANCES) {
        inst.sl = null;                 // the drift re-reads scrollLeft on its next active frame
        if (tvReduced() && inst.animT) { clearTimeout(inst.animT); inst.animT = null; inst.animating = false; }
      }
      tvApplyAll();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);     // Safari < 14
  } catch (_) {}
}

if (typeof module !== 'undefined') module.exports = {
  TV_STATE, TV_ORDER, TV_ITEM, TV_COPIES, TV_W, TV_CTL_POSE,
  tvLum, tvInk, tvLabel, tvTilt, tvSwaySeed, tvWrap, tvNearestCopy, tvSplitName, tvReduced, tvShelfFans,
};
if (typeof window !== 'undefined') window.TV_STATE = TV_STATE;
