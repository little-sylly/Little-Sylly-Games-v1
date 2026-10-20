// ═══════════════════════════════════════════════════════════════════════════
// arcade.js — the Arcade (SW v254): the cabinet registry and the room you pick
// one from. A place in the house like the jukebox — always open, no Konami, no
// unlock. Until SW v253 the arcade was a category inside Secret Mode's terminal;
// spec: docs/superpowers/specs/2026-10-18-arcade-room-design.md.
//
// ARC_CABINETS is the WHOLE registration. Every consumer iterates it — the
// room's list (arcRender), engine.js resetToLobby() (every stop()), and the
// keyboard-Konami guard in secret-mode.js — so a new cabinet is one entry here
// + one file in js/arcade/ and nothing else. Cabinets are NOT Sylly Games: no
// MP config, no identity doc, no Sylly Mode. `start`/`stop` are lazy arrows, so
// a cabinet's file may load after this one.
//
// The room is a lobby PLACE, not a layout: the router's arcadeOpen/arcadeClose
// (lobby-router.js) open and close it, and its ✕ goes back to the layout it was
// opened from. A cabinet's ✕ comes back HERE (arcExitCabinet), not to the lobby.
// One timer (the launch beat), cleared in arcStop() — resetToLobby() and
// arcClose() both call it (logic-engine.md § Timer Lifecycle).
//
// Depends on: engine.js (showScreen, playPillClick), secret-mode.js
// (playSecretBeep — the cabinets' own voice), lobby-host.js (lobbyDispatch).
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

const ARC_LAUNCH_MS = 260;   // the two-note "coin in" beat before the cabinet takes the screen
let arcSel = 0;              // highlighted row — memory only, survives leaving the room
let arcLaunchTimer = null;
let arcKeysBound = false;

function arcIsUp() {
  const el = document.getElementById('screen-arcade');
  return !!el && el.style.display !== 'none';
}

// The select list. Tap a row to highlight it, tap it again (or START) to play.
function arcRender() {
  const list = document.getElementById('arc-list');
  if (!list) return;
  list.innerHTML = '';
  ARC_CABINETS.forEach((cab, i) => {
    const row = document.createElement('button');
    row.className = 'arc-row' + (i === arcSel ? ' is-sel' : '');
    row.dataset.arcId = cab.id;
    row.style.setProperty('--arc-accent', cab.accent);
    row.setAttribute('aria-pressed', String(i === arcSel));
    row.innerHTML = `<span class="arc-num">${String(i + 1).padStart(2, '0')}</span><span class="arc-name"></span>`;
    row.querySelector('.arc-name').textContent = cab.label;
    row.addEventListener('click', () => (i === arcSel ? arcLaunch(cab.id) : arcSelect(i)));
    list.appendChild(row);
  });
  arcPaintSel();
}

function arcPaintSel() {
  const cab = ARC_CABINETS[arcSel];
  document.querySelectorAll('#arc-list .arc-row').forEach((r, i) => {
    r.classList.toggle('is-sel', i === arcSel);
    r.setAttribute('aria-pressed', String(i === arcSel));
  });
  const blurb = document.getElementById('arc-blurb');
  if (blurb && cab) blurb.textContent = cab.blurb;
  const row = document.querySelectorAll('#arc-list .arc-row')[arcSel];
  if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
}

function arcSelect(i) {
  const n = ARC_CABINETS.length;
  const next = ((i % n) + n) % n;
  if (next === arcSel) return;
  arcSel = next;
  playSecretBeep(660);
  arcPaintSel();
}

function arcLaunch(id) {
  const cab = ARC_CABINETS.find(c => c.id === id);
  if (!cab || arcLaunchTimer) return;   // a double-tap must not start it twice
  arcSel = ARC_CABINETS.indexOf(cab);
  playSecretBeep(523);
  arcLaunchTimer = setTimeout(() => {
    playSecretBeep(784);
    arcLaunchTimer = setTimeout(() => { arcLaunchTimer = null; cab.start(); }, ARC_LAUNCH_MS - 120);
  }, 120);
}

// Called by lobby-host.js when the router opens the room.
function arcOpen() {
  arcStop();
  showScreen('screen-arcade');
  arcRender();
  arcBindKeys();
}

// The router closed the room — lobbyPresent's showScreen takes it down.
function arcClose() { arcStop(); }

function arcStop() {
  if (arcLaunchTimer) { clearTimeout(arcLaunchTimer); arcLaunchTimer = null; }
}

// A cabinet's ✕: tear every cabinet down and walk back to the select screen.
// The router never left `arcade: true`, so nothing else needs telling.
function arcExitCabinet() {
  ARC_CABINETS.forEach(cab => { try { cab.stop(); } catch (_) {} });
  arcOpen();
}

// Desktop: ↑/↓ to move, Enter/Space to play, Escape to leave. Only while the
// room itself is up — a cabinet's own keys never reach here.
function arcBindKeys() {
  if (arcKeysBound) return;
  arcKeysBound = true;
  document.addEventListener('keydown', e => {
    if (!arcIsUp()) return;
    if (e.key === 'ArrowDown')      { e.preventDefault(); arcSelect(arcSel + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); arcSelect(arcSel - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); arcLaunch(ARC_CABINETS[arcSel].id); }
    else if (e.key === 'Escape')    { e.preventDefault(); lobbyDispatch({ t: 'arcadeClose' }); }
  });
}

document.getElementById('btn-arc-start').addEventListener('click', () => arcLaunch(ARC_CABINETS[arcSel].id));
document.getElementById('btn-arc-close').addEventListener('click', () => {
  playPillClick();
  lobbyDispatch({ t: 'arcadeClose' });
});
