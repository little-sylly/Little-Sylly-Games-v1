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
const TV_ITEM = 166;                       // 150px box + 16px gap
const TV_COPIES = 5;                       // 5, not 3: a 1920 viewport must never see the seam
const TV_W = TV_ORDER.length * TV_ITEM;    // 3320 — one full list

// ── Colour: ink by luminance, label by darkening ─────────────────────────────
// README § 6: "Ink on brand fills is chosen by luminance (>0.3 -> #2B1B45,
// else white); label colours are the brand hex darkened toward plum when too
// pale for white ground." Same principle as ui-style.md § Menu Title
// Treatment — except there the app takes white ink on the four light brands
// by owner direction; here the brand fill is a big flat band, not a button,
// and the mock's own rule governs.
function tvLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function tvInk(hex) { return tvLum(hex) > 0.3 ? '#2B1B45' : '#FFFFFF'; }
function tvLabel(hex) { return tvLum(hex) > 0.45 ? `color-mix(in oklab, ${hex} 70%, #2B1B45)` : hex; }

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
// The wordmark is the HORIZONTAL variant README § 3 asks for — text, not the
// stacked assets/logo.png lockup, which does not fit a 64px bar. § 9 lists
// building a real horizontal asset as an open item.
function tvBuildHeader(inst) {
  const h = document.createElement('div');
  h.className = 'lb-lg-head';
  h.innerHTML = `
    <div class="lb-lg-mark">
      <span class="lb-lg-mark-a">Little Sylly</span><span class="lb-lg-mark-b">Games</span>
    </div>
    <p class="lb-lg-clock"></p>
    <div class="lb-lg-tools">
      <button class="lb-lg-tool is-sound" title="Sound" aria-label="Sound">🔊</button>
      <div class="lb-lg-modes" role="tablist" aria-label="Lobby layout"></div>
    </div>`;
  inst.els.clock = h.querySelector('.lb-lg-clock');

  /* Sound opens the app's one sound overlay. The trophy is gone for v1 — the
     stickerbook's own layout icon is deferred (spec § 6.1, § 13). */
  h.querySelector('.lb-lg-tool.is-sound').addEventListener('click', () => openSoundOverlay());

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
function tvStartClock(inst) {
  const paint = () => { inst.els.clock.textContent = tvClockText(new Date()); };
  paint();
  inst.clock = setInterval(paint, 30000);
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
  left.innerHTML = `
    <span class="lb-lg-ctl ctl-ornament" id="tv-controller" role="button" tabindex="0" aria-label="Your controller — tap to customise"></span>
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
  pane.innerHTML = `
    <div class="lb-lg-empty">
      <div class="lb-lg-stack" aria-hidden="true">
        <span class="lb-lg-lid lb-lg-lid-1"></span>
        <span class="lb-lg-lid lb-lg-lid-2"></span>
        <span class="lb-lg-lid lb-lg-lid-3"></span>
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
// shipped phone treatment and must stay until bld.png exists.
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

  // Six sticker pills. Pre-tilted and offset in the MARKUP, not by a script,
  // so the field still reads as slapped-on stickers with motion reduced
  // (README § 8). The field wraps and the rotations cycle by index, so a
  // seventh shelf costs nothing — do not hand-place these.
  const ROT = [-3, 2.5, -2, 3, -2.5, 2], OFF = [0, 7, -5, 5, -3, 6];
  LB_SHELVES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'lb-lg-pill';
    b.dataset.shelf = s.id;
    b.title = s.label;
    b.style.setProperty('--pill-rot', `${ROT[i % 6]}deg`);
    b.style.setProperty('--pill-off', `${OFF[i % 6]}px`);
    b.innerHTML = `
      <span class="lb-lg-pill-disc"><span class="lb-lg-pill-emoji" style="animation-delay:${(i * 0.24).toFixed(2)}s">${s.emoji}</span></span>
      <span class="lb-lg-pill-text">
        <span class="lb-lg-pill-name">${s.label}</span>
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
function tvSelect(id) {
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

  inst.els.paneCard.innerHTML = `
    <div class="lb-lg-band" style="background-color:${g.brandHex}">
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

  const spin = document.createElement('button');
  spin.className = 'lb-lg-spin';
  spin.innerHTML = `<span class="lb-lg-spin-ico" aria-hidden="true">🎲</span>Random Game`;
  spin.addEventListener('click', () => tvSpin(inst));
  inst.els.spin = spin;
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
    if (!tvDriftActive(inst)) { inst.sl = null; return; }
    // Re-sync if anything else moved the scroll since the last frame (a snap,
    // a wheel); otherwise accumulate sub-pixel travel ourselves, because
    // scrollLeft rounds and 0.38px/frame would floor to zero.
    if (inst.sl == null || Math.abs(inst.sl - el.scrollLeft) > 2) inst.sl = el.scrollLeft;
    inst.sl += 0.38;
    el.scrollLeft = inst.sl;
  };
  inst.raf = requestAnimationFrame(step);
}

function tvPause(inst, ms) { inst.pauseUntil = performance.now() + (ms || 2600); }

// ── Input ────────────────────────────────────────────────────────────────────
function tvBindRail(inst) {
  const el = inst.els.rail;
  if (!el || inst.bound) return;
  inst.bound = true;
  el.addEventListener('scroll', () => tvOnScroll(inst), { passive: true });
  el.addEventListener('mouseenter', () => { inst.hovering = true; });
  el.addEventListener('mouseleave', () => { inst.hovering = false; });

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
    tvSelect(target.id);
    return;
  }

  const from = el.scrollLeft, t0 = performance.now(), dur = 1800;
  inst.animating = true;
  tvSet({ spinning: true });
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.scrollLeft = from + (to - from) * e;
    if (t < 1) { inst.spinRaf = requestAnimationFrame(step); return; }
    // Land back in the middle copies so the loop window is intact, then select.
    el.scrollLeft = to - TV_W;
    inst.sl = el.scrollLeft;
    inst.animating = false;
    inst.spinRaf = null;
    tvSet({ spinning: false });        // the guard clears on the SAME frame the tween ends
    tvSelect(target.id);
  };
  inst.spinRaf = requestAnimationFrame(step);
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
  TV_STATE, TV_ORDER, TV_ITEM, TV_COPIES, TV_W,
  tvLum, tvInk, tvLabel, tvTilt, tvSwaySeed, tvWrap, tvNearestCopy, tvSplitName, tvReduced,
};
if (typeof window !== 'undefined') window.TV_STATE = TV_STATE;
