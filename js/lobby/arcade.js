// ═══════════════════════════════════════════════════════════════════════════
// arcade.js — the Arcade (SW v254): the cabinet registry and the room you pick
// one from. A place in the house like the jukebox — always open, no Konami, no
// unlock. Until SW v253 the arcade was a category inside Secret Mode's terminal;
// spec: docs/superpowers/specs/2026-10-18-arcade-room-design.md.
//
// ARC_CABINETS is the WHOLE registration. Every consumer iterates it — the
// room's row (arcRender), engine.js resetToLobby() (every stop()), and the
// keyboard-Konami guard in secret-mode.js — so a new cabinet is one entry here
// + one file in js/arcade/ and nothing else. Cabinets are NOT Sylly Games: no
// MP config, no identity doc, no Sylly Mode. `start`/`stop` are lazy arrows, so
// a cabinet's file may load after this one.
//
// The room is a lobby PLACE, not a layout: the router's arcadeOpen/arcadeClose
// (lobby-router.js) open and close it, and its ✕ goes back to the layout it was
// opened from. A cabinet's ✕ comes back HERE (arcExitCabinet), not to the lobby.
//
// SW v257 — the "Arcade Floor" (spec § 3.1). The room is a row of little
// cabinets, one per game, painted in the player's saved controller colours
// (shell / plate / ears / buttons — the same roles the Lounge's props wear).
// The row is a native scroll-snap strip; whichever cabinet crosses its centre is
// the selection, reported by an IntersectionObserver — so there is no RAF loop
// and no scroll timer. One timer (the launch beat), cleared in arcStop() —
// resetToLobby() and arcClose() both call it (logic-engine.md § Timer Lifecycle).
//
// Depends on: engine.js (showScreen, playPillClick), secret-mode.js
// (playSecretBeep — the cabinets' own voice), lobby-host.js (lobbyDispatch),
// controller.js (ctlReadDesign — optional; the factory lilac is the fallback).
// ═══════════════════════════════════════════════════════════════════════════

const ARC_CABINETS = [
  { id: 'asherplane',  label: 'ASHERPLANE',       screen: 'screen-arcade-asherplane',
    start: () => apStart(),  stop: () => resetArcade(),
    blurb: 'Fly over the islands, shoot the Bandits, beat the boss.', accent: '#3fa9ff' },
  { id: 'minesweeper', label: 'DEEP-SEA SWEEP',   screen: 'screen-arcade-minesweeper',
    start: () => msStart(),  stop: () => resetArcadeMinesweeper(),
    blurb: 'Sweep the sea floor. Mind the mines.', accent: '#22d3ee' },
  { id: 'chicken',     label: 'OTHER SIDE',       screen: 'screen-arcade-chicken',
    start: () => ckStart(),  stop: () => resetArcadeChicken(),
    blurb: 'Why did the chicken cross the road? Find out.', accent: '#c8f04a' },
  { id: 'slice',       label: 'CHOP SALAD',       screen: 'screen-arcade-slice',
    start: () => slStart(),  stop: () => resetArcadeSlice(),
    blurb: 'Swipe the fruit. Skip the bombs.', accent: '#ffe500' },
  { id: 'cookiejar',   label: 'COOKIE JAR',       screen: 'screen-arcade-cookiejar',
    start: () => hjStart(),  stop: () => resetArcadeCookieJar(),
    blurb: 'Hold to grab cookies. Let go before anyone looks.', accent: '#d9925a' },
  { id: 'stacking',    label: 'STACKING ORDER',   screen: 'screen-arcade-stacking',
    start: () => stoStart(), stop: () => resetArcadeStacking(),
    blurb: 'Drop the animals. Build the tower. Don’t let it lean.', accent: '#ff8a4c' },
  { id: 'bluff',       label: 'BEYOND THE BLUFF', screen: 'screen-arcade-bluff',
    start: () => bbStart(),  stop: () => resetArcadeBluff(),
    blurb: 'Climb the dice cliff before The Depths catch you.', accent: '#ff6a86' },
  { id: 'coldshot',    label: 'COLD SHOT',        screen: 'screen-arcade-coldshot',
    start: () => cshStart(), stop: () => resetArcadeColdShot(),
    blurb: 'Snowball the smug penguins off the floe. Don’t let it sink.', accent: '#8ecae6' },
  { id: 'traceroute',  label: 'TRACE ROUTE',      screen: 'screen-arcade-traceroute',
    start: () => trcStart(), stop: () => resetArcadeTraceRoute(),
    blurb: 'Swipe the signal through the Node. Find the Egress.', accent: '#34d399' },
];

const ARC_LAUNCH_MS    = 480;   // the coin beat: INSERT COIN flashes, two notes, then the cabinet takes the screen
const ARC_COIN_NOTE_MS = 180;   // when the second note lands inside it
const ARC_TICKS_MAX    = 12;    // past this many cabinets the strip's ticks become one scrubber rail
const ARC_ROLES = ['shell', 'plate', 'ears', 'buttons'];   // controller.js CTL_GROUPS

/* One cabinet, front-on: the bear's ears on the panda's one-piece body. Glow
   first, then ears, then body — positioned siblings paint in DOM order, so the
   ears sit behind the hood and the accent pool sits behind everything. */
const ARC_MACHINE_HTML =
  '<span class="arc-m-glow"></span>' +
  '<span class="arc-m-ear is-l"></span><span class="arc-m-ear is-r"></span>' +
  '<span class="arc-m-body">' +
    '<span class="arc-m-marq"><span class="arc-m-marq-text"></span></span>' +
    '<span class="arc-m-bezel"><span class="arc-crt">' +
      '<span class="arc-crt-num"></span>' +
      '<span class="arc-crt-title"></span>' +
      '<span class="arc-crt-blurb"></span>' +
      '<span class="arc-crt-press">Press start</span>' +
      '<span class="arc-crt-coin">Insert coin</span>' +
    '</span></span>' +
    '<span class="arc-m-deck"><span class="arc-m-stick"></span><span class="arc-m-btns"><i></i><i></i><i></i><i></i></span></span>' +
    '<span class="arc-m-door"><span class="arc-m-slot"></span><span class="arc-m-lamp"></span></span>' +
  '</span>';

let arcSel = 0;              // the centred cabinet — memory only, survives leaving the room
let arcLaunchTimer = null;
let arcKeysBound = false;
let arcObserver = null;      // IntersectionObserver on the row — whichever cabinet crosses the centre is selected
let arcScrubbing = false;    // a pointer is down on the position strip
let arcScrubDragged = false; // …and has moved, so the row follows instantly rather than gliding

function arcIsUp() {
  const el = document.getElementById('screen-arcade');
  return !!el && el.style.display !== 'none';
}

function arcPad(n) { return String(n).padStart(2, '0'); }

/* The global reduced-motion block reaches CSS only; a smooth scrollTo() is JS
   and would still glide (ui-style.md § Motion Standard). */
function arcReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

// The cabinets wear the player's controller: the same four roles as the Lounge's props.
function arcPaintPalette() {
  const room = document.getElementById('screen-arcade');
  if (!room || typeof ctlReadDesign !== 'function') return;   // the CSS defaults are the factory lilac
  const d = ctlReadDesign();
  ARC_ROLES.forEach(k => { if (d[k]) room.style.setProperty('--arc-' + k, d[k]); });
}

// The row. Tap a side cabinet to centre it; tap the centred one (or START) to play.
function arcRender() {
  const track = document.getElementById('arc-list');
  if (!track) return;
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  track.innerHTML = '';
  const n = ARC_CABINETS.length;
  ARC_CABINETS.forEach((cab, i) => {
    const m = document.createElement('button');
    m.className = 'arc-row';
    m.dataset.arcId = cab.id;
    m.style.setProperty('--arc-accent', cab.accent);
    m.setAttribute('aria-label', `${cab.label}, ${i + 1} of ${n}`);
    m.innerHTML = ARC_MACHINE_HTML;
    m.querySelector('.arc-m-marq-text').textContent = cab.label;
    m.querySelector('.arc-crt-num').textContent = arcPad(i + 1);
    m.querySelector('.arc-crt-title').textContent = cab.label;
    m.querySelector('.arc-crt-blurb').textContent = cab.blurb;
    m.addEventListener('click', () => (i === arcSel ? arcLaunch(cab.id) : arcSelect(i)));
    track.appendChild(m);
  });
  arcRenderStrip();
  arcPaintSel();
  arcCentre(false);
  arcWatchCentre(track);
}

/* Native scroll-snap does the swiping; this only reports where it settled.
   The root margin shrinks the row to a 2% band down its middle, so exactly one
   cabinet can be "in view" — the one under the centre line. */
function arcWatchCentre(track) {
  if (typeof IntersectionObserver !== 'function') return;
  arcObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const i = Array.prototype.indexOf.call(track.children, e.target);
      if (i >= 0 && i !== arcSel) { arcSel = i; playSecretBeep(660); arcPaintSel(); }
    });
  }, { root: track, rootMargin: '0px -49% 0px -49%', threshold: 0 });
  Array.prototype.forEach.call(track.children, m => arcObserver.observe(m));
}

// Scroll the selected cabinet to the middle of the row.
function arcCentre(smooth) {
  const track = document.getElementById('arc-list');
  const m = track && track.children[arcSel];
  if (!m) return;
  const left = m.offsetLeft + m.offsetWidth / 2 - track.clientWidth / 2;
  if (smooth && !arcReducedMotion() && typeof track.scrollTo === 'function') track.scrollTo({ left, behavior: 'smooth' });
  else track.scrollLeft = left;
}

/* The position strip: one tick per cabinet, or one rail + thumb past
   ARC_TICKS_MAX — a single control either way, so 20 cabinets never mean 20
   sub-44px targets. Tap anywhere to jump, drag to scrub. */
function arcRenderStrip() {
  const s = document.getElementById('arc-scrub');
  if (!s) return;
  const n = ARC_CABINETS.length;
  const rail = n > ARC_TICKS_MAX;
  s.classList.toggle('is-rail', rail);
  s.innerHTML = rail ? '<b class="arc-thumb"></b>' : '<i></i>'.repeat(n);
  s.style.setProperty('--arc-n', n);
  s.setAttribute('aria-valuemin', '1');
  s.setAttribute('aria-valuemax', String(n));
}

function arcPaintSel() {
  const cab = ARC_CABINETS[arcSel];
  if (!cab) return;
  const n = ARC_CABINETS.length;
  const room = document.getElementById('screen-arcade');
  if (room) room.style.setProperty('--arc-accent', cab.accent);   // START, the strip and the floor pool
  document.querySelectorAll('#arc-list .arc-row').forEach((m, i) => {
    m.classList.toggle('is-sel', i === arcSel);
    m.setAttribute('aria-current', String(i === arcSel));
  });
  document.querySelectorAll('#arc-scrub i').forEach((t, i) => t.classList.toggle('is-on', i === arcSel));
  const s = document.getElementById('arc-scrub');
  if (s) {
    s.style.setProperty('--arc-i', arcSel);
    s.setAttribute('aria-valuenow', String(arcSel + 1));
    s.setAttribute('aria-valuetext', `${cab.label}, ${arcSel + 1} of ${n}`);
  }
  const count = document.getElementById('arc-count');
  if (count) count.textContent = `${arcPad(arcSel + 1)} / ${arcPad(n)}`;
  const blurb = document.getElementById('arc-blurb');
  if (blurb) blurb.textContent = `${cab.label}. ${cab.blurb}`;
}

// A row, not a ring: the ends stop rather than wrap.
function arcSelect(i, smooth = true) {
  const next = Math.max(0, Math.min(ARC_CABINETS.length - 1, i));
  if (next === arcSel) return;
  arcSel = next;
  playSecretBeep(660);
  arcPaintSel();
  arcCentre(smooth);
}

function arcScrubAt(e) {
  const s = document.getElementById('arc-scrub');
  const r = s.getBoundingClientRect();
  if (!r.width) return;
  arcSelect(Math.floor(((e.clientX - r.left) / r.width) * ARC_CABINETS.length), !arcScrubDragged);
}

function arcLaunch(id) {
  const cab = ARC_CABINETS.find(c => c.id === id);
  if (!cab || arcLaunchTimer) return;   // a double-tap must not start it twice
  const i = ARC_CABINETS.indexOf(cab);
  if (i !== arcSel) { arcSel = i; arcPaintSel(); arcCentre(false); }
  const m = document.querySelectorAll('#arc-list .arc-row')[i];
  if (m) m.classList.add('is-coin');   // the screen flashes INSERT COIN
  playSecretBeep(523);
  arcLaunchTimer = setTimeout(() => {
    playSecretBeep(784);
    arcLaunchTimer = setTimeout(() => { arcLaunchTimer = null; cab.start(); }, ARC_LAUNCH_MS - ARC_COIN_NOTE_MS);
  }, ARC_COIN_NOTE_MS);
}

// Called by lobby-host.js when the router opens the room.
function arcOpen() {
  arcStop();
  arcPaintPalette();
  showScreen('screen-arcade');
  arcRender();
  arcBindKeys();
}

// The router closed the room — lobbyPresent's showScreen takes it down.
function arcClose() { arcStop(); }

function arcStop() {
  if (arcLaunchTimer) { clearTimeout(arcLaunchTimer); arcLaunchTimer = null; }
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  arcScrubbing = false;
  document.querySelectorAll('#arc-list .is-coin').forEach(m => m.classList.remove('is-coin'));
}

// A cabinet's ✕: tear every cabinet down and walk back to the select screen.
// The router never left `arcade: true`, so nothing else needs telling.
function arcExitCabinet() {
  ARC_CABINETS.forEach(cab => { try { cab.stop(); } catch (_) {} });
  arcOpen();
}

// Desktop: ←/→ (and ↑/↓) to move, Enter/Space to play, Escape to leave. Only
// while the room itself is up — a cabinet's own keys never reach here.
function arcBindKeys() {
  if (arcKeysBound) return;
  arcKeysBound = true;
  document.addEventListener('keydown', e => {
    if (!arcIsUp()) return;
    const so = document.getElementById('sound-overlay');
    if (so && so.style.display && so.style.display !== 'none') return;   // the sound sheet keeps its own keys
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown')    { e.preventDefault(); arcSelect(arcSel + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp')  { e.preventDefault(); arcSelect(arcSel - 1); }
    else if (k === 'Enter' || k === ' ') {
      const a = document.activeElement;
      // 🔊 and ✕ keep their own Enter; a cabinet or START plays the centred cabinet.
      if (a && a.tagName === 'BUTTON' && !a.classList.contains('arc-row') && a.id !== 'btn-arc-start') return;
      e.preventDefault(); arcLaunch(ARC_CABINETS[arcSel].id);
    }
    else if (k === 'Escape') { e.preventDefault(); lobbyDispatch({ t: 'arcadeClose' }); }
  });
}

document.getElementById('btn-arc-start').addEventListener('click', () => arcLaunch(ARC_CABINETS[arcSel].id));
document.getElementById('btn-arc-close').addEventListener('click', () => {
  playPillClick();
  lobbyDispatch({ t: 'arcadeClose' });
});
(function arcBindScrub() {
  const s = document.getElementById('arc-scrub');
  s.addEventListener('pointerdown', e => {
    e.preventDefault();   // a tap is not a focus — the keyboard ring stays for the keyboard
    arcScrubbing = true; arcScrubDragged = false;
    try { s.setPointerCapture(e.pointerId); } catch (_) {}
    arcScrubAt(e);
  });
  s.addEventListener('pointermove', e => { if (!arcScrubbing) return; arcScrubDragged = true; arcScrubAt(e); });
  const end = () => { arcScrubbing = false; arcScrubDragged = false; };
  s.addEventListener('pointerup', end);
  s.addEventListener('pointercancel', end);
})();
