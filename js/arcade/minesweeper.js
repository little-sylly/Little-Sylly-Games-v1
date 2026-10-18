// ═══════════════════════════════════════════════════════════════════════════
// minesweeper.js — ARCADE CABINET 02. DEEP-SEA SWEEP: classic Minesweeper rules,
// reskinned into Deep-Sea Deploy's (`dsd`) world. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Prototype built standalone in /arcade; mirrors asherplane.js conventions so it
// can drop into the suite beside it.
//
// The reskin (Oct 2026) changed ONLY the look and the words — the board rules,
// timings, input and state machine are the play-tested classic, untouched.
//  - Closed squares are deep water (DSD's cyan-700); a dug square is swept
//    seabed sand. Mines are horned sea mines; flags are red marker BUOYS; DIG
//    is a sonar PING (with an echo and a sonar ring); the reset face is the
//    Captain. Board sizes are DSD's Sea States: CALM / TURBULENT / TEMPEST.
//  - Words borrow DSD's mission voice: MISSION DEBRIEF, DEPLOY AGAIN, ALL CLEAR.
//  - The attract screen's anchor-and-urchins sticker is a code redraw of the
//    DSD sticker art (watercolour anchor, chain, spiked urchins, white border).
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//
// Integration notes
//  - Prefix is `ms`. Screen id: screen-arcade-minesweeper. DOM: #ms-stage (the
//    pointer target, touch-action:none) wrapping #ms-canvas, plus #btn-ms-exit.
//  - engine.js resetToLobby() should call resetArcadeMinesweeper() alongside
//    resetArcade() (asherplane's teardown).
//  - There are NO setTimeouts in this file. Every delayed effect (the mine chain
//    reaction, the win jingle, press-and-hold) is scheduled against msClock and
//    run from the RAF loop, so cancelling the loop IS the whole teardown —
//    nothing can fire over the lobby after ✕.
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const MS_W = 360;
const MS_H = 640;

const MS_TITLE = 'DEEP-SEA SWEEP';   // working title — the one place to rename the cabinet

// ── Boards ───────────────────────────────────────────────────────────────────
// Sized for a portrait phone rather than copied from desktop Minesweeper
// (16×16 and 30×16 don't fit a 360-wide screen at a tappable size). 12 columns
// is the widest that still gives a ~28px square. Mine density tracks the
// classic three: ~12%, ~16%, ~20%. Labels are Deep-Sea Deploy's Sea States;
// the keys stay easy/medium/hard so nothing else had to change.
const MS_LEVELS = {
  easy:   { label: 'CALM',      cols: 9,  rows: 9,  mines: 10 },
  medium: { label: 'TURBULENT', cols: 10, rows: 14, mines: 22 },
  hard:   { label: 'TEMPEST',   cols: 12, rows: 17, mines: 40 },
};
const MS_LEVEL_KEYS = ['easy', 'medium', 'hard'];

// ── Tuning ───────────────────────────────────────────────────────────────────
const MS_HOLD_MS        = 380;   // press-and-hold does the OTHER action (dig ↔ flag)
const MS_HOLD_SHOW_MS   = 110;   // hold ring stays hidden this long so ordinary taps don't flicker it
const MS_DRAG_CANCEL    = 14;    // logical px a press may wander before it stops counting as a tap
const MS_RIPPLE_MS      = 16;    // per-ring delay as a flood fill spreads outward
const MS_POP_MS         = 140;   // how long a freshly revealed square takes to settle
const MS_PEEK_MS        = 220;   // a chord that doesn't add up flashes the squares it would have opened
const MS_CHAIN_DELAY_MS = 380;   // the hit mine goes off alone before the rest follow
const MS_CHAIN_STEP_MS  = 80;    // gap between chain-reaction pops…
const MS_CHAIN_MAX_MS   = 1500;  // …squeezed so HARD's 40 mines still finish in ~1.5s
const MS_LOST_HOLD_MS   = 450;   // after the last pop, before the wrong flags are revealed
const MS_BOOM_TEXT_MS   = 900;
const MS_WIN_BEAT_MS    = 1700;  // confetti beat on the cleared board before scores
const MS_TOP_N          = 5;
const MS_ECHO_MS        = 170;   // a ping's echo comes back off the seabed this much later
const MS_SONAR_MS       = 650;   // how long a sonar ring takes to spread and fade

// ── Palette — Deep-Sea Deploy's "Deep Trench" water over swept seabed sand ───
// MS_FOAM is the cabinet's UI ink (it was the arcade's phosphor green).
const MS_BG        = '#041B26';   // the deep — page base, and dark ink on light things
const MS_BG_TOP    = '#0A3A4C';   // the gradient's lit surface end
const MS_FOAM      = '#7DE3F0';
const MS_YELLOW    = '#FDE68A';
const MS_GREY      = '#9CC3CF';
const MS_DIM       = '#5B8796';
const MS_RED       = '#FB7185';   // coral
const MS_TILE      = '#0E7490';   // DSD brand cyan-700 — unswept water
const MS_TILE_HI   = '#3FB6CC';
const MS_TILE_LO   = '#06374A';
const MS_OPEN      = '#E8DCBC';   // swept seabed
const MS_OPEN_LINE = '#CDBB91';
const MS_SAND      = ['#EADFC0', '#E4D6B2', '#EEE4C9'];   // per-square watercolour variation
const MS_PANEL     = '#06283A';   // HUD counters
const MS_FRAME     = '#1B6F86';
// Index = the number on the square. Classic order (1 blue, 2 green, 3 red…),
// in deep inks so every one reads on the pale sand.
const MS_NUM_COLOURS = [null, '#1D4ED8', '#15803D', '#DC2626', '#3730A3',
                        '#9A3412', '#0E7490', '#111827', '#6B7280'];
const MS_CONFETTI = ['#7DE3F0', '#FDE68A', '#FB7185', '#F8FAFC', '#3FB6CC', '#C4B5FD'];
// The sticker art (attract screen) and the sea mine.
const MS_ANCHOR      = { fill: '#A9DDE8', shade: '#6FB3C8', line: '#2C4F63', glint: '#E6F7FB' };
const MS_URCHIN      = { body: '#8C7D6B', dark: '#5A4E42', spike: '#3E352D' };
const MS_MINE_BODY   = '#2F3A40';
const MS_MINE_HORN   = '#C9A227';   // brass-tipped horns
const MS_BUOY        = '#E5484D';

// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// AP_SOUND. Inherits isMuted and masterVolume for free.
const MS_SOUND = {
  // A sonar ping and its echo off the seabed ("ping… ping").
  dig:       () => { playSecretBeep(988);  msEcho(988); },
  open:      () => { playSecretBeep(1319); msEcho(1319); },   // a flood fill — a touch brighter than one square
  flag:      () => playSecretBeep(784),   // a buoy plops in
  unflag:    () => playSecretBeep(440),
  nope:      () => playSecretBeep(196),   // tapped a flag in DIG mode, or a chord that doesn't add up
  boom:      () => playSecretBeep(98),
  chain:     () => playSecretBeep(147),
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
};
const MS_WIN_JINGLE = [784, 988, 1175, 1568];

// ── Layout (logical px) ──────────────────────────────────────────────────────
const MS_HUD_MINES = { x: 12,  y: 12, w: 92, h: 44 };
const MS_HUD_FACE  = { x: 156, y: 10, w: 48, h: 48 };
const MS_HUD_TIME  = { x: 256, y: 12, w: 92, h: 44 };
const MS_BOARD_AREA = { x: 10, y: 72, w: 340, h: 488 };

const MS_BTN_DIG   = { x: 12,  y: 574, w: 112, h: 54 };
const MS_BTN_FLAG  = { x: 124, y: 574, w: 112, h: 54 };
const MS_BTN_MENU  = { x: 248, y: 574, w: 100, h: 54 };
const MS_BTN_AGAIN = { x: 12,  y: 574, w: 224, h: 54 };   // replaces DIG/FLAG once the run is over

// Nudged down from the classic layout to make room for the anchor sticker.
const MS_BTN_LEVEL = {
  easy:   { x: 40, y: 352, w: 280, h: 62 },
  medium: { x: 40, y: 424, w: 280, h: 62 },
  hard:   { x: 40, y: 496, w: 280, h: 62 },
};

const MS_SLOTS = [
  { x:  60, y: 300, w: 66, h: 84 },
  { x: 147, y: 300, w: 66, h: 84 },
  { x: 234, y: 300, w: 66, h: 84 },
];
const MS_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const MS_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const MS_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

// ── Runtime state ────────────────────────────────────────────────────────────
let msCanvas    = null;
let msCtx       = null;
let msRafHandle = null;   // TIMER — cancel in every teardown (logic-engine.md)
let msLastT     = 0;
let msState     = 'attract';   // attract | playing | dying | lost | won | nameEntry | leaderboard
let msClock     = 0;           // ms of un-paused time. Every delayed effect is scheduled against this.

let msLevelKey   = 'easy';
let msCols       = 9;
let msRows       = 9;
let msMineCount  = 10;
let msCells      = [];     // flat, index = row * msCols + col
let msLayout     = { x: 0, y: 0, w: 0, h: 0, size: 0 };
let msMinesPlaced = false; // mines are laid on the first dig, never before — the first dig is always safe
let msRevealed   = 0;
let msFlags      = 0;
let msElapsed    = 0;      // the run clock, ms. Starts on the first dig.
let msTimerOn    = false;
let msLastTime   = 0;      // the finishing time of the last cleared board
let msMode       = 'dig';  // what a plain tap does: 'dig' | 'flag'

let msParts    = [];
let msShake    = 0;        // seconds remaining
let msEvents   = [];       // [{ at, fn }] — msClock-scheduled effects (replaces setTimeout)
let msChain    = [];       // [{ idx, at }] mines still to go off in the loss chain reaction
let msChainEndAt = 0;
let msHitIdx   = -1;       // the mine that ended the run
let msBoomAt   = 0;
let msWinAt    = 0;
let msPeekIdx  = -1;
let msPeekUntil = 0;
let msSonar    = [];       // [{ x, y, at, big }] sonar rings spreading from a ping

// The single pointer currently allowed to act on #ms-stage — null when free.
// A second finger is ignored entirely (same rule as asherplane's apPtrId).
let msPtrId = null;
// The live press on a board square: { idx, x, y, t0, holdable, fired, cancelled }.
// Squares act on RELEASE (so press-and-hold can exist); buttons act on press.
let msPress = null;

// Session leaderboards, one per board size, fastest first. Deliberately NOT
// cleared by resetArcadeMinesweeper() — scores last the afternoon, not forever.
let msBoards = { easy: [], medium: [], hard: [] };

const MS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let msInitials = [0, 0, 0];

// ── Entry ────────────────────────────────────────────────────────────────────
function msStart() {
  msCanvas = document.getElementById('ms-canvas');
  msCtx    = msCanvas.getContext('2d');
  showScreen('screen-arcade-minesweeper');
  msResize();
  msEnterState('attract');
}

function msEnterState(next) {
  msState = next;
  if (next === 'playing') msNewGame();
  // A state change can arrive mid-shake (MENU tapped during the chain
  // reaction); only the chain reaction shakes, so clear it on every hop.
  msShake = 0;
  msPress = null;
  if (!msRafHandle) { msLastT = 0; msRafHandle = requestAnimationFrame(msLoop); }
}

function msNewGame() {
  const L = MS_LEVELS[msLevelKey];
  msCols = L.cols; msRows = L.rows; msMineCount = L.mines;
  msCells = Array.from({ length: msCols * msRows }, () => (
    { mine: false, n: 0, open: false, flag: false, revealAt: 0, boomAt: 0 }));
  msMinesPlaced = false;
  msRevealed = 0;
  msFlags    = 0;
  msElapsed  = 0;
  msTimerOn  = false;
  msMode     = 'dig';   // a fresh board always starts digging — a kid who left it on FLAG would be baffled
  msParts    = [];
  msEvents   = [];
  msChain    = [];
  msHitIdx   = -1;
  msPeekIdx  = -1;
  msSonar    = [];
  msLayout   = msComputeLayout();
}

// Largest whole-pixel square that fits the board area, board centred in it.
function msComputeLayout() {
  const A = MS_BOARD_AREA;
  const size = Math.floor(Math.min(A.w / msCols, A.h / msRows));
  const w = size * msCols, h = size * msRows;
  return { size, w, h, x: Math.round(A.x + (A.w - w) / 2), y: Math.round(A.y + (A.h - h) / 2) };
}

// ── Loop ─────────────────────────────────────────────────────────────────────
function msLoop(now) {
  msRafHandle = null;
  if (!msLastT) msLastT = now;
  const dt = Math.min((now - msLastT) / 1000, 0.05);   // a backgrounded tab can't bank time
  msLastT = now;

  // Freeze behind the global sound overlay, same as asherplane — it covers
  // the stage, and the run clock must not tick while a child can't see it.
  const so     = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  if (!paused) msUpdate(dt);
  msDraw();
  if (!msRafHandle) msRafHandle = requestAnimationFrame(msLoop);
}

function msUpdate(dt) {
  const step = dt * 1000;
  msClock += step;
  if (msState === 'playing' && msTimerOn) msElapsed = Math.min(msElapsed + step, 999999);
  if (msShake > 0) msShake = Math.max(0, msShake - dt);

  msParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    if (p.spin) p.rot += p.spin * dt;
    p.life -= dt;
  });
  msParts = msParts.filter(p => p.life > 0);
  if (msSonar.length) msSonar = msSonar.filter(r => msClock - r.at < MS_SONAR_MS);

  if (msEvents.length) {
    const due = msEvents.filter(e => msClock >= e.at);
    msEvents  = msEvents.filter(e => msClock <  e.at);
    due.forEach(e => e.fn());
  }

  // Press-and-hold: once a still finger has been down long enough, do the
  // other action right away (the finger is still down — its release is then
  // ignored because press.fired is set).
  const p = msPress;
  if (msState === 'playing' && p && p.holdable && !p.fired && !p.cancelled &&
      msClock - p.t0 >= MS_HOLD_MS) {
    p.fired = true;
    msAct(p.idx, msMode === 'dig' ? 'flag' : 'dig');
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* iOS has no vibrate */ }
  }

  if (msState === 'dying') {
    while (msChain.length && msClock >= msChain[0].at) {
      const { idx } = msChain.shift();
      msPopMine(idx, msChain.length);
    }
    if (!msChain.length && msClock >= msChainEndAt) msEnterState('lost');
  }

  if (msState === 'won' && msClock - msWinAt >= MS_WIN_BEAT_MS) msAfterWin();
}

// ── Board logic ──────────────────────────────────────────────────────────────
function msNeighbours(idx) {
  const c = idx % msCols, r = Math.floor(idx / msCols), out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < msRows && cc >= 0 && cc < msCols) out.push(rr * msCols + cc);
    }
  }
  return out;
}

// Lays the mines AFTER the first dig, keeping that square and its eight
// neighbours clear — so the first dig is never a mine AND always opens a
// patch to work from, instead of a lone number to guess around.
function msPlaceMines(safeIdx) {
  const safe = new Set([safeIdx, ...msNeighbours(safeIdx)]);
  const pool = [];
  for (let i = 0; i < msCells.length; i++) if (!safe.has(i)) pool.push(i);
  for (let k = 0; k < msMineCount; k++) {               // partial Fisher–Yates
    const j = k + Math.floor(Math.random() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    msCells[pool[k]].mine = true;
  }
  msCells.forEach((cell, i) => {
    cell.n = msNeighbours(i).reduce((n, j) => n + (msCells[j].mine ? 1 : 0), 0);
  });
  msMinesPlaced = true;
}

// The one place a board square is acted on — taps, holds and right-clicks all
// route here. An open number always chords, whatever the mode.
function msAct(idx, action) {
  const cell = msCells[idx];
  if (cell.open) { msChord(idx); return; }
  if (action === 'flag') { msToggleFlag(idx); return; }
  if (cell.flag) { MS_SOUND.nope(); return; }   // a flag protects its square — lift it first
  msDig(idx);
}

function msToggleFlag(idx) {
  const cell = msCells[idx];
  cell.flag = !cell.flag;
  msFlags += cell.flag ? 1 : -1;
  cell.flag ? MS_SOUND.flag() : MS_SOUND.unflag();
}

function msDig(idx) {
  if (!msMinesPlaced) { msPlaceMines(idx); msTimerOn = true; }
  if (msCells[idx].mine) { msLose(idx); return; }
  const opened = msFlood(idx);
  opened > 1 ? MS_SOUND.open() : MS_SOUND.dig();
  msPing(idx, opened > 1);
  msCheckWin();
}

// A sonar ring spreading out from a square — bigger when the ping opened a patch.
function msPing(idx, big) {
  const { cx, cy } = msCellCentre(idx);
  msSonar.push({ x: cx, y: cy, at: msClock, big });
}

// The echo half of a ping, on the game clock like every other delayed effect.
function msEcho(freq) {
  msEvents.push({ at: msClock + MS_ECHO_MS, fn: () => playSecretBeep(freq) });
}

// Opens `start` and, through any blank (0) squares, everything connected to
// it. Breadth-first so each square's ring distance from the tap is known —
// that distance staggers revealAt, which is the ripple you see.
function msFlood(start) {
  if (msCells[start].open) return 0;
  const queue = [start], depth = [0];
  msOpenCell(start, 0);
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], d = depth[q];
    if (msCells[i].n !== 0) continue;
    for (const j of msNeighbours(i)) {
      const c = msCells[j];
      if (c.open || c.flag || c.mine) continue;
      msOpenCell(j, d + 1);
      queue.push(j); depth.push(d + 1);
    }
  }
  return queue.length;
}

function msOpenCell(i, ring) {
  const c = msCells[i];
  c.open = true;
  c.revealAt = msClock + ring * MS_RIPPLE_MS;
  msRevealed++;
}

// Chord: tapping an open number whose flags already add up opens every other
// neighbour in one go. If the flags were wrong, that's a mine — fair's fair.
function msChord(idx) {
  const c = msCells[idx];
  if (c.n === 0) return;
  const nb = msNeighbours(idx);
  const flags = nb.reduce((n, j) => n + (msCells[j].flag ? 1 : 0), 0);
  const closed = nb.filter(j => !msCells[j].open && !msCells[j].flag);
  if (!closed.length) return;
  if (flags !== c.n) {
    msPeekIdx = idx;
    msPeekUntil = msClock + MS_PEEK_MS;
    MS_SOUND.nope();
    return;
  }
  let hit = -1, opened = 0;
  for (const j of closed) {
    if (msCells[j].open) continue;   // an earlier flood in this same chord already got it
    if (msCells[j].mine) { if (hit < 0) hit = j; continue; }
    opened += msFlood(j);
  }
  if (hit >= 0) { msLose(hit); return; }
  if (opened) { MS_SOUND.open(); msPing(idx, true); msCheckWin(); }
}

function msCheckWin() {
  if (msRevealed === msCols * msRows - msMineCount) msWin();
}

function msLose(hitIdx) {
  msTimerOn = false;
  msHitIdx  = hitIdx;
  msBoomAt  = msClock;
  const hit = msCells[hitIdx];
  hit.open = true;
  hit.boomAt = msClock;
  MS_SOUND.boom();
  msShake = 0.45;
  const { cx, cy } = msCellCentre(hitIdx);
  msBurst(cx, cy, ['#F97316', '#FDE68A', '#F8FAFC', '#7DE3F0'], 26, 60, 220);   // flash + white water
  msBubbles(cx, cy, 14);

  // Every other unflagged mine goes off, nearest first, so the explosion
  // visibly spreads out from the square that was tapped. Correct flags hold.
  const hc = hitIdx % msCols, hr = Math.floor(hitIdx / msCols);
  const rest = [];
  msCells.forEach((c, i) => { if (c.mine && !c.flag && i !== hitIdx) rest.push(i); });
  const d2 = i => (i % msCols - hc) ** 2 + (Math.floor(i / msCols) - hr) ** 2;
  rest.sort((a, b) => d2(a) - d2(b));
  const gap = Math.min(MS_CHAIN_STEP_MS, MS_CHAIN_MAX_MS / Math.max(1, rest.length));
  msChain = rest.map((idx, k) => ({ idx, at: msClock + MS_CHAIN_DELAY_MS + k * gap }));
  msChainEndAt = msClock + MS_CHAIN_DELAY_MS + rest.length * gap + MS_LOST_HOLD_MS;

  // Deliberately NOT msEnterState(): that zeroes msShake, and the shake is
  // the point of this state. The RAF loop is already running.
  msState = 'dying';
  msPress = null;
}

function msPopMine(idx, remaining) {
  const c = msCells[idx];
  c.open = true;
  c.boomAt = msClock;
  const { cx, cy } = msCellCentre(idx);
  msBurst(cx, cy, ['#F97316', '#F8FAFC'], 8, 30, 140);
  msBubbles(cx, cy, 4);
  msShake = Math.max(msShake, 0.12);
  if (remaining % 2 === 0) MS_SOUND.chain();   // every pop beeping at once is mush
}

function msWin() {
  msTimerOn  = false;
  msLastTime = msElapsed;
  msWinAt    = msClock;
  // Classic courtesy: flag every mine the player didn't bother to.
  msCells.forEach(c => { if (c.mine && !c.flag) { c.flag = true; msFlags++; } });
  MS_WIN_JINGLE.forEach((f, k) => msEvents.push({ at: msClock + 80 + k * 110, fn: () => playSecretBeep(f) }));
  msConfetti();
  msEvents.push({ at: msClock + 450, fn: msConfetti });
  msState = 'won';
  msPress = null;
}

function msAfterWin() {
  if (msQualifies(msLevelKey, msLastTime)) {
    msInitials = [0, 0, 0];
    MS_SOUND.highScore();
    msEnterState('nameEntry');
  } else {
    msEnterState('leaderboard');
  }
}

// ── Particles ────────────────────────────────────────────────────────────────
function msBurst(x, y, colours, n, sMin, sMax) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = sMin + Math.random() * (sMax - sMin);
    msParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                   life: 0.4 + Math.random() * 0.3, max: 0.7,
                   colour: colours[Math.floor(Math.random() * colours.length)] });
  }
}

// Bubbles boil up from a mine that went off. Negative gravity: they rise and
// speed up, drawn as little rings (see msDrawParts).
function msBubbles(x, y, n) {
  for (let i = 0; i < n; i++) {
    msParts.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10,
                   vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 60, grav: -140,
                   life: 0.9 + Math.random() * 0.7, max: 1.6, bub: true,
                   r: 2 + Math.random() * 3.5, colour: 'rgba(230,247,251,0.9)' });
  }
}

function msConfetti() {
  for (let i = 0; i < 70; i++) {
    msParts.push({
      x: Math.random() * MS_W, y: -10 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 160, grav: 220,
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 12,
      life: 1.6 + Math.random() * 0.8, max: 2.4, conf: true,
      colour: MS_CONFETTI[Math.floor(Math.random() * MS_CONFETTI.length)],
    });
  }
}

// ── Session leaderboard — fastest first ──────────────────────────────────────
function msQualifies(key, time) {
  const b = msBoards[key];
  if (b.length < MS_TOP_N) return true;
  return time < b[b.length - 1].time;
}

function msSubmitTime(key, name, time) {
  const b = msBoards[key];
  b.push({ name, time });
  b.sort((a, c) => a.time - c.time);
  msBoards[key] = b.slice(0, MS_TOP_N);
}

function msFmtTime(ms) { return (ms / 1000).toFixed(1) + 's'; }

// ── Geometry helpers ─────────────────────────────────────────────────────────
function msCellCentre(idx) {
  const s = msLayout.size;
  return { cx: msLayout.x + (idx % msCols) * s + s / 2,
           cy: msLayout.y + Math.floor(idx / msCols) * s + s / 2 };
}

function msCellAt(p) {
  const L = msLayout;
  if (p.x < L.x || p.y < L.y || p.x >= L.x + L.w || p.y >= L.y + L.h) return -1;
  return Math.floor((p.y - L.y) / L.size) * msCols + Math.floor((p.x - L.x) / L.size);
}

// Which closed squares should draw "pushed in" this frame: the square under
// a digging finger, or the closed neighbours of a number being pressed or
// peeked (the classic chord preview).
function msPressedSet() {
  const set = new Set();
  const addClosedNeighbours = idx => msNeighbours(idx).forEach(j => {
    if (!msCells[j].open && !msCells[j].flag) set.add(j);
  });
  const p = msPress;
  if (msState === 'playing' && p && !p.cancelled && !p.fired) {
    const c = msCells[p.idx];
    if (!c.open) { if (msMode === 'dig' && !c.flag) set.add(p.idx); }
    else if (c.n > 0) addClosedNeighbours(p.idx);
  }
  if (msPeekIdx >= 0 && msClock < msPeekUntil) addClosedNeighbours(msPeekIdx);
  return set;
}

// ── Drawing ──────────────────────────────────────────────────────────────────
function msDraw() {
  const g = msCtx;
  g.save();
  if (msShake > 0) {
    g.translate((Math.random() - 0.5) * 8 * msShake * 6,
                (Math.random() - 0.5) * 8 * msShake * 6);
  }
  msDrawSea();

  if (msState === 'attract') {
    msDrawAttract();
  } else if (msState === 'nameEntry') {
    msDrawNameEntry();
  } else if (msState === 'leaderboard') {
    msDrawLeaderboard();
  } else {
    const pressed = msPressedSet();
    msDrawBoard(pressed);
    msDrawSonar();
    msDrawHud(pressed.size > 0);
    msDrawBottomBar();
    msDrawHoldRing();
    msDrawParts();
    if (msState === 'dying' || msState === 'lost') msDrawBoomText();
    if (msState === 'won') msDrawWinBanner();
  }
  g.restore();
}

// ── The sea behind everything ────────────────────────────────────────────────
// A deep gradient, slow light shafts from the surface, and bubbles that rise
// forever. All of it is worked out from msClock each frame — no state to keep,
// nothing to tear down. The bubble table is fixed "random" so it never jumps.
const MS_AMBIENT = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 97 + 23) % MS_W,
  phase: (i * 211) % MS_H,
  speed: 12 + (i * 37) % 22,
  r: 1.5 + ((i * 13) % 4) * 0.8,
  sway: 3 + (i * 7) % 6,
}));

function msDrawSea() {
  const g = msCtx, t = msClock / 1000;
  const grad = g.createLinearGradient(0, 0, 0, MS_H);
  grad.addColorStop(0, MS_BG_TOP);
  grad.addColorStop(0.55, MS_BG);
  grad.addColorStop(1, '#020D13');
  g.fillStyle = grad;
  g.fillRect(-20, -20, MS_W + 40, MS_H + 40);

  g.save();
  g.globalAlpha = 0.06;
  g.fillStyle = '#BFF3FA';
  [[30, 70], [150, 46], [250, 84]].forEach(([x, w], k) => {
    const d = Math.sin(t * 0.3 + k * 2) * 14;
    g.beginPath();
    g.moveTo(x + d, -20);
    g.lineTo(x + w + d, -20);
    g.lineTo(x + w * 0.4 + d + 120, MS_H * 0.75);
    g.lineTo(x + d + 80, MS_H * 0.75);
    g.closePath();
    g.fill();
  });
  g.restore();

  g.strokeStyle = 'rgba(190,240,250,0.32)';
  g.lineWidth = 1;
  MS_AMBIENT.forEach(b => {
    const y = MS_H + 20 - ((b.phase + t * b.speed) % (MS_H + 40));
    const x = b.x + Math.sin(t * 1.3 + b.phase) * b.sway;
    g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.stroke();
  });
}

// ── The board ────────────────────────────────────────────────────────────────
function msDrawBoard(pressed) {
  const g = msCtx, L = msLayout, s = L.size;
  g.fillStyle = 'rgba(2,13,19,0.6)';               // a dark well for the board to sit in
  g.fillRect(L.x - 6, L.y - 6, L.w + 12, L.h + 12);
  g.strokeStyle = MS_FRAME;
  g.lineWidth = 2;
  g.strokeRect(L.x - 3, L.y - 3, L.w + 6, L.h + 6);
  const over = msState === 'lost';

  for (let i = 0; i < msCells.length; i++) {
    const cell = msCells[i];
    const x = L.x + (i % msCols) * s, y = L.y + Math.floor(i / msCols) * s;
    const cx = x + s / 2, cy = y + s / 2;

    if (!cell.open || msClock < cell.revealAt) {
      msDrawTile(x, y, s, pressed.has(i), i);
      if (cell.flag) {
        msDrawBuoy(cx, cy, s, null, i);
        if (over && !cell.mine) msDrawCross(x, y, s);   // that buoy was wrong
      }
      continue;
    }

    if (cell.mine) {
      const age = msClock - cell.boomAt;
      msDrawOpen(x, y, s, i === msHitIdx ? '#DC2626' : '#7F1D1D');
      const k = age < MS_POP_MS ? 1.6 - 0.6 * (age / MS_POP_MS) : 1;   // lands big, settles
      msDrawMine(cx, cy, s, k);
      continue;
    }

    msDrawOpen(x, y, s, null, i);
    if (cell.n) {
      const age = msClock - cell.revealAt;
      const k = age < MS_POP_MS ? 0.5 + 0.5 * (age / MS_POP_MS) : 1;
      msDrawNumber(cx, cy, s, cell.n, k);
    }
  }
}

// Unswept water. Raised square: the dark base shows through as the
// bottom-right shadow, the light bevel is the top-left polygon, the face sits
// on top, and a little wave crest says "water" rather than "button".
// i < 0 (the HUD face's backing tile) skips the wave.
function msDrawTile(x, y, s, pressed, i = -1) {
  const g = msCtx;
  if (pressed) { msDrawOpen(x, y, s, null, i); return; }
  const b = Math.max(2, Math.round(s * 0.1));
  g.fillStyle = MS_TILE_LO;
  g.fillRect(x, y, s, s);
  g.fillStyle = MS_TILE_HI;
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x + s - b, y + b);
  g.lineTo(x + b, y + b); g.lineTo(x + b, y + s - b); g.lineTo(x, y + s);
  g.closePath(); g.fill();
  g.fillStyle = MS_TILE;
  g.fillRect(x + b, y + b, s - 2 * b, s - 2 * b);
  if (i < 0) return;
  const wx = x + s * 0.26, ww = s * 0.48;
  const wy = y + s * (0.4 + (i * 7 % 3) * 0.1);   // crests sit at three heights so the board isn't a grid of ticks
  g.strokeStyle = 'rgba(200,245,252,0.32)';
  g.lineWidth = Math.max(1, s * 0.05);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(wx, wy);
  g.quadraticCurveTo(wx + ww * 0.25, wy - s * 0.08, wx + ww * 0.5, wy);
  g.quadraticCurveTo(wx + ww * 0.75, wy + s * 0.08, wx + ww, wy);
  g.stroke();
  g.lineCap = 'butt';
}

// Swept seabed. Each square gets one of three sand tints (fixed per square)
// so the cleared area has a soft, washed look instead of a flat fill.
function msDrawOpen(x, y, s, bg, i = -1) {
  const g = msCtx;
  g.fillStyle = bg || (i >= 0 ? MS_SAND[(i * 5 + Math.floor(i / 3)) % 3] : MS_OPEN);
  g.fillRect(x, y, s, s);
  g.strokeStyle = bg ? 'rgba(0,0,0,0.25)' : MS_OPEN_LINE;
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

function msDrawNumber(cx, cy, s, n, k) {
  const g = msCtx;
  g.fillStyle = MS_NUM_COLOURS[n];
  g.font = `bold ${Math.round(s * 0.62 * k)}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), cx, cy + s * 0.04);
  g.textBaseline = 'alphabetic';
}

// A horned sea mine: dark ball, a belt seam, seven brass-tipped horns and a
// stub of mooring chain underneath. Sized from the square, k = pop scale.
function msDrawMine(cx, cy, s, k = 1) {
  const g = msCtx, r = s * 0.22 * k;
  g.lineCap = 'round';
  g.strokeStyle = '#1B2226';
  g.lineWidth = Math.max(1.5, r * 0.2);
  g.beginPath(); g.moveTo(cx, cy + r * 0.9); g.lineTo(cx, cy + r * 1.6); g.stroke();
  for (let a = 0; a < 8; a++) {
    if (a === 4) continue;                       // straight down is where the chain goes
    const t = a * Math.PI / 4 - Math.PI / 2, cos = Math.cos(t), sin = Math.sin(t);
    g.strokeStyle = MS_MINE_BODY;
    g.lineWidth = Math.max(2, r * 0.32);
    g.beginPath();
    g.moveTo(cx + cos * r * 0.7, cy + sin * r * 0.7);
    g.lineTo(cx + cos * r * 1.35, cy + sin * r * 1.35);
    g.stroke();
    g.fillStyle = MS_MINE_HORN;
    g.beginPath(); g.arc(cx + cos * r * 1.42, cy + sin * r * 1.42, Math.max(1.2, r * 0.2), 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'butt';
  g.fillStyle = MS_MINE_BODY;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#55666E';
  g.lineWidth = Math.max(1, r * 0.12);
  g.beginPath(); g.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.38, r * 0.24, 0, Math.PI * 2); g.fill();
}

// A red marker buoy bobbing on a ripple — this cabinet's flag. Squat and round
// on purpose: the old flag had to fight not to read as the digit "1", and a
// dome with a band can't be mistaken for any number. `ink` draws it in one
// colour with no bob (for the button). `i` staggers the bob so buoys don't
// move in lockstep.
function msDrawBuoy(cx, cy, s, ink, i = 0) {
  const g = msCtx;
  const y = cy + (ink ? 0 : Math.sin(msClock / 380 + i * 1.7) * s * 0.035);
  const w = s * 0.27, top = y - s * 0.2, base = y + s * 0.12;
  const dome = () => {
    g.beginPath();
    g.moveTo(cx - w, base);
    g.quadraticCurveTo(cx - w, top, cx, top);
    g.quadraticCurveTo(cx + w, top, cx + w, base);
    g.closePath();
  };
  // mast and its light
  g.fillStyle = ink || '#1F2937';
  const mw = Math.max(2, s * 0.06);
  g.fillRect(cx - mw / 2, y - s * 0.38, mw, s * 0.2);
  g.fillStyle = ink || MS_YELLOW;
  g.beginPath(); g.arc(cx, y - s * 0.38, Math.max(1.6, s * 0.07), 0, Math.PI * 2); g.fill();
  // the float, with a white band across it
  g.fillStyle = ink || MS_BUOY;
  dome(); g.fill();
  if (!ink) {
    g.save();
    dome(); g.clip();
    g.fillStyle = '#F8FAFC';
    g.fillRect(cx - w, y - s * 0.07, w * 2, s * 0.08);
    g.restore();
  }
  // the ripple it sits in
  g.strokeStyle = ink || 'rgba(225,248,252,0.9)';
  g.lineWidth = Math.max(1.5, s * 0.06);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - s * 0.37, base + s * 0.07);
  g.quadraticCurveTo(cx, base + s * 0.17, cx + s * 0.37, base + s * 0.07);
  g.stroke();
  g.lineCap = 'butt';
}

function msDrawCross(x, y, s) {
  const g = msCtx, m = s * 0.18;
  g.strokeStyle = MS_YELLOW;
  g.lineWidth = Math.max(2, s * 0.09);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x + m, y + m);     g.lineTo(x + s - m, y + s - m);
  g.moveTo(x + s - m, y + m); g.lineTo(x + m, y + s - m);
  g.stroke();
  g.lineCap = 'butt';
}

// A sonar ping: a dot with three arcs spreading right. For the PING button.
function msDrawPingIcon(cx, cy, sz, ink) {
  const g = msCtx, ox = cx - sz * 0.32;
  g.fillStyle = ink;
  g.beginPath(); g.arc(ox, cy, Math.max(2.5, sz * 0.11), 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (let k = 1; k <= 3; k++) {
    g.beginPath(); g.arc(ox, cy, sz * 0.22 * k, -0.75, 0.75); g.stroke();
  }
  g.lineCap = 'butt';
}

// Sonar rings spreading from a ping, clipped to the board. Two-tone (dark
// under light) so a ring reads over both the pale sand and the teal water.
function msDrawSonar() {
  if (!msSonar.length) return;
  const g = msCtx, L = msLayout;
  g.save();
  g.beginPath(); g.rect(L.x, L.y, L.w, L.h); g.clip();
  const ring = (x, y, rad, a) => {
    g.globalAlpha = a;
    g.strokeStyle = 'rgba(6,55,74,0.9)'; g.lineWidth = 3.5;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = MS_FOAM; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
  };
  msSonar.forEach(r => {
    const t = (msClock - r.at) / MS_SONAR_MS;
    if (t < 0 || t >= 1) return;
    const max = r.big ? 150 : 70;
    ring(r.x, r.y, 6 + max * t, (1 - t) * 0.75);
    if (t > 0.22) ring(r.x, r.y, 6 + max * (t - 0.22), (1 - t) * 0.4);
  });
  g.restore();
}

// ── The Captain (the reset button) ───────────────────────────────────────────
// smile | oh (a finger is down) | dead | cool (won). The face sits low in the
// tile to leave room for the peaked cap.
function msDrawFace(cx, cy, r, mood) {
  const g = msCtx;
  const fr = r * 0.86, fy = cy + r * 0.22;
  g.fillStyle = MS_YELLOW;
  g.beginPath(); g.arc(cx, fy, fr, 0, Math.PI * 2); g.fill();
  g.strokeStyle = MS_BG;
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = MS_BG;

  const ey = fy - fr * 0.08;
  if (mood === 'dead') {
    const e = fr * 0.16;
    [-1, 1].forEach(sd => {
      const ex = cx + sd * fr * 0.36;
      g.beginPath();
      g.moveTo(ex - e, ey - e); g.lineTo(ex + e, ey + e);
      g.moveTo(ex + e, ey - e); g.lineTo(ex - e, ey + e);
      g.stroke();
    });
    g.beginPath(); g.arc(cx, fy + fr * 0.78, fr * 0.34, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
  } else if (mood === 'cool') {
    g.fillRect(cx - fr * 0.75, ey - fr * 0.12, fr * 1.5, fr * 0.12);
    g.fillRect(cx - fr * 0.66, ey - fr * 0.12, fr * 0.56, fr * 0.34);
    g.fillRect(cx + fr * 0.10, ey - fr * 0.12, fr * 0.56, fr * 0.34);
    g.beginPath(); g.arc(cx, fy + fr * 0.2, fr * 0.42, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  } else {
    g.beginPath(); g.arc(cx - fr * 0.36, ey, fr * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + fr * 0.36, ey, fr * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath();
    if (mood === 'oh') g.arc(cx, fy + fr * 0.45, fr * 0.16, 0, Math.PI * 2);
    else               g.arc(cx, fy + fr * 0.12, fr * 0.46, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  }

  // Captain's cap: white crown, navy band, a peak over the eyes, brass badge.
  g.fillStyle = '#F8FAFC';
  g.strokeStyle = MS_BG;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx - fr * 0.95, fy - fr * 0.5);
  g.lineTo(cx - fr * 1.12, fy - fr * 1.02);
  g.quadraticCurveTo(cx, fy - fr * 1.5, cx + fr * 1.12, fy - fr * 1.02);
  g.lineTo(cx + fr * 0.95, fy - fr * 0.5);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#0F2A3A';
  g.fillRect(cx - fr * 0.97, fy - fr * 0.7, fr * 1.94, fr * 0.24);
  g.beginPath(); g.ellipse(cx, fy - fr * 0.47, fr * 0.92, fr * 0.17, 0, 0, Math.PI); g.fill();
  g.fillStyle = MS_MINE_HORN;
  g.beginPath(); g.arc(cx, fy - fr * 0.98, fr * 0.15, 0, Math.PI * 2); g.fill();
}

// ── HUD and buttons ──────────────────────────────────────────────────────────
function msDrawHud(fingerDown) {
  const left = msMineCount - msFlags;
  const mines = left < 0 ? '-' + String(-left).padStart(2, '0') : String(left).padStart(3, '0');
  msDrawCounter(MS_HUD_MINES, 'MINES', mines, MS_RED);
  msDrawCounter(MS_HUD_TIME, 'TIME', String(Math.min(999, Math.floor(msElapsed / 1000))).padStart(3, '0'), MS_FOAM);

  const f = MS_HUD_FACE;
  const mood = (msState === 'dying' || msState === 'lost') ? 'dead'
             : msState === 'won' ? 'cool'
             : fingerDown ? 'oh' : 'smile';
  msDrawTile(f.x, f.y, f.w, false);
  msDrawFace(f.x + f.w / 2, f.y + f.h / 2, 16, mood);
}

function msDrawCounter(r, label, value, colour) {
  const g = msCtx;
  g.fillStyle = MS_PANEL;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = MS_FRAME;
  g.lineWidth = 2;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = MS_DIM;
  g.font = '9px monospace';
  g.textAlign = 'left';
  g.fillText(label, r.x + 8, r.y + 13);
  g.fillStyle = colour;
  g.font = 'bold 22px monospace';
  g.textAlign = 'right';
  g.fillText(value, r.x + r.w - 8, r.y + 37);
}

function msDrawBottomBar() {
  if (msState === 'playing') {
    msDrawSegment(MS_BTN_DIG,  'PING', msMode === 'dig',  'ping');
    msDrawSegment(MS_BTN_FLAG, 'BUOY', msMode === 'flag', 'buoy');
    msDrawButton(MS_BTN_MENU, 'MENU', 18);
  } else if (msState === 'dying' || msState === 'lost') {
    msDrawButton(MS_BTN_AGAIN, 'DEPLOY AGAIN', 20);
    msDrawButton(MS_BTN_MENU,  'MENU',  18);
  }
}

// One half of the PING | BUOY switch. The lit half is what a plain tap does.
function msDrawSegment(r, label, active, icon) {
  const g = msCtx;
  g.fillStyle = active ? MS_FOAM : 'rgba(4,27,38,0.7)';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = MS_FOAM;
  g.lineWidth = 3;
  g.strokeRect(r.x, r.y, r.w, r.h);
  const ink = active ? MS_BG : MS_FOAM;
  const cy = r.y + r.h / 2;
  if (icon === 'buoy') msDrawBuoy(r.x + 29, cy + 2, 40, ink);
  else                 msDrawPingIcon(r.x + 30, cy, 30, ink);
  g.fillStyle = ink;
  g.font = 'bold 18px monospace';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(label, r.x + 54, cy + 1);
  g.textBaseline = 'alphabetic';
}

function msDrawButton(r, label, size = 22) {
  const g = msCtx;
  g.fillStyle = 'rgba(4,27,38,0.7)';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = MS_FOAM;
  g.lineWidth = 3;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = MS_FOAM;
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}

// A ring that fills around a held square; when it closes, the other action
// fires. Coral = about to drop a buoy, foam = about to ping. Drawn wider than
// the square so it shows around a fingertip.
function msDrawHoldRing() {
  const p = msPress;
  if (msState !== 'playing' || !p || !p.holdable || p.fired || p.cancelled) return;
  const held = msClock - p.t0;
  if (held < MS_HOLD_SHOW_MS) return;
  const t = Math.min(1, (held - MS_HOLD_SHOW_MS) / (MS_HOLD_MS - MS_HOLD_SHOW_MS));
  const { cx, cy } = msCellCentre(p.idx);
  const g = msCtx;
  g.strokeStyle = msMode === 'dig' ? MS_RED : MS_FOAM;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, Math.max(30, msLayout.size * 0.9), -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
  g.stroke();
}

function msDrawParts() {
  const g = msCtx;
  msParts.forEach(p => {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    if (p.bub) {
      g.strokeStyle = p.colour;
      g.lineWidth = 1.3;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke();
      return;
    }
    g.fillStyle = p.colour;
    if (p.conf) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillRect(-4, -2, 8, 4);
      g.restore();
    } else {
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  });
  g.globalAlpha = 1;
}

function msDrawBoomText() {
  const age = msClock - msBoomAt;
  if (age >= MS_BOOM_TEXT_MS) return;
  const g = msCtx, t = age / MS_BOOM_TEXT_MS;
  const cy = msLayout.y + msLayout.h / 2;
  g.save();
  g.globalAlpha = 1 - t * t;
  g.translate(MS_W / 2, cy);
  g.scale(1 + t * 0.5, 1 + t * 0.5);
  g.font = 'bold 56px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.lineJoin = 'round';   // mitred joins throw spikes off the letters
  g.strokeStyle = '#7C2D12';
  g.strokeText('SPLOOSH!', 0, 0);
  g.fillStyle = MS_YELLOW;
  g.fillText('SPLOOSH!', 0, 0);
  g.restore();
}

function msDrawWinBanner() {
  if (msClock - msWinAt < 250) return;   // let the last ripple land first
  const g = msCtx;
  const cy = msLayout.y + msLayout.h / 2;
  g.fillStyle = 'rgba(4,27,38,0.86)';
  g.fillRect(0, cy - 56, MS_W, 112);
  g.textAlign = 'center';
  g.fillStyle = MS_YELLOW;
  g.font = 'bold 36px monospace';
  g.fillText('ALL CLEAR!', MS_W / 2, cy - 6);
  g.fillStyle = MS_FOAM;
  g.font = 'bold 20px monospace';
  g.fillText(msFmtTime(msLastTime), MS_W / 2, cy + 30);
}

// ── The anchor sticker (attract screen) ──────────────────────────────────────
// A code redraw of the Deep-Sea Deploy sticker: a pale watercolour anchor
// with a chain draped off its ring and three spiked urchins, inside a white
// die-cut border. Drawn in layers — shadow, white border, dark ink outline,
// colour — each layer the same shapes at a narrower width, which is what makes
// the outline and border hug the art. Local units ≈ px at scale 1.
const MS_CHAIN_LINKS = (() => {
  const P0 = [-8, -58], C = [-100, -30], P2 = [-60, 32], n = 11, out = [];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, u = 1 - t;
    const x = u * u * P0[0] + 2 * u * t * C[0] + t * t * P2[0];
    const y = u * u * P0[1] + 2 * u * t * C[1] + t * t * P2[1];
    const dx = 2 * u * (C[0] - P0[0]) + 2 * t * (P2[0] - C[0]);
    const dy = 2 * u * (C[1] - P0[1]) + 2 * t * (P2[1] - C[1]);
    out.push({ x, y, a: Math.atan2(dy, dx), flat: k % 2 === 0 });
  }
  return out;
})();
const MS_STICKER_URCHINS = [ { x: 17, y: -8, r: 10 }, { x: -60, y: 42, r: 11 }, { x: 62, y: 32, r: 10 } ];

function msDrawAnchorSticker(cx, cy, k, rot) {
  const g = msCtx;
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(k, k);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.save(); g.translate(2, 5); msAnchorLayer('rgba(0,0,0,0.3)', 12, true); g.restore();   // drop shadow
  msAnchorLayer('#F8FAFC', 12, true);          // white die-cut border
  msAnchorLayer(MS_ANCHOR.line, 3, false);      // ink outline
  msAnchorLayer(null, 0, false);                // colour

  // Shading: a cool shadow down the right of the shank and under the arms,
  // a bright glint down the left — the watercolour "wet edge".
  g.strokeStyle = MS_ANCHOR.shade; g.lineWidth = 3;
  g.beginPath(); g.moveTo(3, -36); g.lineTo(3, 46); g.stroke();
  g.beginPath(); g.moveTo(-40, 20); g.quadraticCurveTo(0, 94, 40, 20); g.stroke();
  g.strokeStyle = MS_ANCHOR.glint; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-2.5, -34); g.lineTo(-2.5, 38); g.stroke();
  g.beginPath(); g.arc(0, -62, 11, Math.PI * 0.9, Math.PI * 1.45); g.stroke();

  // The stock (cross-bar) goes on last so it sits in front of the shank.
  const stock = (col, w) => {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(-30, -44); g.lineTo(30, -44); g.stroke();
  };
  stock(MS_ANCHOR.line, 16);
  stock(MS_ANCHOR.fill, 13);
  g.strokeStyle = MS_ANCHOR.shade; g.lineWidth = 2;
  [-21, 21].forEach(x => { g.beginPath(); g.moveTo(x, -50); g.lineTo(x, -38); g.stroke(); });   // the end bands
  g.strokeStyle = MS_ANCHOR.glint; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-26, -47); g.lineTo(26, -47); g.stroke();

  MS_STICKER_URCHINS.forEach(u => msDrawUrchin(u.x, u.y, u.r));
  g.restore();
}

// One layer of the sticker. col = one colour for everything (shadow, border,
// outline); null = the real colours. extra widens every stroke. border = also
// lay down the stock and the urchins' footprints, which only the outer layers
// need (in the colour layers they're drawn on top, last).
function msAnchorLayer(col, extra, border) {
  const g = msCtx;
  const ac = col || MS_ANCHOR.fill;
  MS_CHAIN_LINKS.forEach(l => {                     // the chain, behind the anchor
    g.save();
    g.translate(l.x, l.y);
    g.rotate(l.a);
    g.strokeStyle = col || '#7FA9BC';
    g.lineWidth = 2.6 + extra;
    g.beginPath(); g.ellipse(0, 0, 7, l.flat ? 3.8 : 1.4, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  });
  const line = (w, path) => { g.strokeStyle = ac; g.lineWidth = w + extra; g.beginPath(); path(); g.stroke(); };
  line(6,  () => g.arc(0, -62, 11, 0, Math.PI * 2));                          // ring
  line(11, () => { g.moveTo(0, -50); g.lineTo(0, 52); });                     // shank
  line(10, () => { g.moveTo(-46, 14); g.quadraticCurveTo(0, 90, 46, 14); });  // arms
  g.fillStyle = ac;
  g.strokeStyle = ac;
  g.lineWidth = extra || 1;
  const poly = pts => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fill();
    if (extra) g.stroke();
  };
  poly([[-50, -10], [-61, 22], [-34, 20]]);   // left fluke
  poly([[50, -10], [61, 22], [34, 20]]);      // right fluke
  poly([[-7, 50], [7, 50], [0, 66]]);         // crown
  if (border) {
    line(13, () => { g.moveTo(-30, -44); g.lineTo(30, -44); });
    g.fillStyle = ac;
    MS_STICKER_URCHINS.forEach(u => { g.beginPath(); g.arc(u.x, u.y, u.r * 1.45 + extra * 0.5, 0, Math.PI * 2); g.fill(); });
  }
}

// A spiked urchin, like the ones on the sticker: a ring of long and short
// dark spines around a round grey-brown body.
function msDrawUrchin(x, y, r) {
  const g = msCtx, n = 24;
  g.strokeStyle = MS_URCHIN.spike;
  g.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + (k % 2) * 0.08;
    const len = r * (k % 2 ? 1.4 : 1.68);
    g.lineWidth = k % 2 ? 1 : 1.4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  g.fillStyle = MS_URCHIN.body;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = MS_URCHIN.dark;                         // shaded lower-right
  g.beginPath(); g.arc(x + r * 0.22, y + r * 0.22, r * 0.78, 0, Math.PI * 2); g.fill();
  g.fillStyle = MS_URCHIN.body;
  g.beginPath(); g.arc(x - r * 0.12, y - r * 0.12, r * 0.72, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.arc(x - r * 0.35, y - r * 0.38, r * 0.22, 0, Math.PI * 2); g.fill();
  g.strokeStyle = MS_URCHIN.spike; g.lineWidth = 1.2;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.lineCap = 'butt';
}

// ── Menus ────────────────────────────────────────────────────────────────────
function msDrawAttract() {
  const g = msCtx;
  msDrawAnchorSticker(MS_W / 2, 100, 0.92, -0.42);

  g.textAlign = 'center';
  g.fillStyle = MS_FOAM;
  g.font = 'bold 30px monospace';
  g.fillText(MS_TITLE, MS_W / 2, 214);
  g.fillStyle = MS_DIM;
  g.font = '10px monospace';
  g.fillText('A DEEP-SEA DEPLOY MISSION', MS_W / 2, 232);

  // A five-square strip that shows the whole game at a glance:
  // a number, a buoy, a mine that went off, another number, unswept water.
  const s = 34, x0 = MS_W / 2 - s * 2.5, y0 = 244;
  msDrawOpen(x0, y0, s, null, 0);           msDrawNumber(x0 + s / 2, y0 + s / 2, s, 1, 1);
  msDrawTile(x0 + s, y0, s, false, 1);      msDrawBuoy(x0 + s * 1.5, y0 + s / 2, s, null, 1);
  msDrawOpen(x0 + s * 2, y0, s, '#DC2626'); msDrawMine(x0 + s * 2.5, y0 + s / 2, s);
  msDrawOpen(x0 + s * 3, y0, s, null, 2);   msDrawNumber(x0 + s * 3.5, y0 + s / 2, s, 2, 1);
  msDrawTile(x0 + s * 4, y0, s, false, 4);

  g.textAlign = 'center';
  g.fillStyle = MS_FOAM;
  g.font = '12px monospace';
  g.fillText('TAP TO PING  ·  HOLD TO DROP A BUOY', MS_W / 2, 300);
  g.fillText('NUMBERS COUNT THE MINES NEXT DOOR', MS_W / 2, 318);
  g.fillStyle = MS_GREY;
  g.font = '11px monospace';
  g.fillText('PICK A SEA STATE', MS_W / 2, 342);

  MS_LEVEL_KEYS.forEach(key => {
    const r = MS_BTN_LEVEL[key], L = MS_LEVELS[key], best = msBoards[key][0];
    g.fillStyle = 'rgba(4,27,38,0.7)';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = MS_FOAM;
    g.lineWidth = 3;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.textAlign = 'left';
    g.fillStyle = MS_FOAM;
    g.font = 'bold 22px monospace';
    g.fillText(L.label, r.x + 18, r.y + 29);
    g.fillStyle = MS_GREY;
    g.font = '11px monospace';
    g.fillText(`${L.cols}×${L.rows} · ${L.mines} MINES`, r.x + 18, r.y + 48);
    g.textAlign = 'right';
    g.fillStyle = MS_DIM;
    g.font = '9px monospace';
    g.fillText('BEST', r.x + r.w - 16, r.y + 23);
    g.fillStyle = best ? MS_YELLOW : MS_DIM;
    g.font = 'bold 16px monospace';
    g.fillText(best ? msFmtTime(best.time) : '--', r.x + r.w - 16, r.y + 44);
  });
}

function msDrawNameEntry() {
  const g = msCtx;
  g.textAlign = 'center';
  g.fillStyle = MS_YELLOW;
  g.font = 'bold 24px monospace';
  g.fillText('NEW RECORD, CAPTAIN!', MS_W / 2, 160);
  g.fillStyle = MS_FOAM;
  g.font = 'bold 34px monospace';
  g.fillText(msFmtTime(msLastTime), MS_W / 2, 208);
  g.fillStyle = MS_GREY;
  g.font = '12px monospace';
  g.fillText('SEA STATE: ' + MS_LEVELS[msLevelKey].label, MS_W / 2, 234);
  g.fillStyle = MS_FOAM;
  g.fillText('TAP A LETTER TO CHANGE IT', MS_W / 2, 270);
  MS_SLOTS.forEach((r, i) => {
    g.fillStyle = 'rgba(4,27,38,0.7)';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = MS_FOAM;
    g.lineWidth = 3;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.fillStyle = MS_FOAM;
    g.font = 'bold 44px monospace';
    g.textBaseline = 'middle';
    g.fillText(MS_ALPHABET[msInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2);
    g.textBaseline = 'alphabetic';
  });
  msDrawButton(MS_BTN_OK, 'OK');
}

function msDrawLeaderboard() {
  const g = msCtx, board = msBoards[msLevelKey];
  g.textAlign = 'center';
  g.fillStyle = MS_FOAM;
  g.font = 'bold 24px monospace';
  g.fillText('MISSION DEBRIEF', MS_W / 2, 118);
  g.fillStyle = MS_GREY;
  g.font = '13px monospace';
  g.fillText('SEA STATE: ' + MS_LEVELS[msLevelKey].label, MS_W / 2, 144);
  g.fillText(`THIS RUN: ${msFmtTime(msLastTime)}`, MS_W / 2, 168);
  if (board.length === 0) {
    g.fillStyle = MS_DIM;
    g.font = '14px monospace';
    g.fillText('NO TIMES LOGGED', MS_W / 2, 250);
  }
  g.font = 'bold 20px monospace';
  board.forEach((e, i) => {
    const y = 222 + i * 40;
    g.fillStyle = i === 0 ? MS_YELLOW : MS_FOAM;
    g.textAlign = 'left';
    g.fillText(`${i + 1}. ${e.name}`, 70, y);
    g.textAlign = 'right';
    g.fillText(msFmtTime(e.time), MS_W - 70, y);
  });
  msDrawButton(MS_BTN_LB_AGAIN, 'DEPLOY AGAIN', 20);
  msDrawButton(MS_BTN_LB_MENU, 'MENU', 18);
}

// ── Input ────────────────────────────────────────────────────────────────────
function msToLogical(e) {
  const r = msCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * MS_W / r.width,
           y: (e.clientY - r.top)  * MS_H / r.height };
}

function msHit(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Buttons fire on press (like asherplane). Board squares fire on RELEASE, so a
// held finger can become a flag instead — msPress carries the square between.
function msOnDown(p) {
  if (msState === 'attract') {
    for (const key of MS_LEVEL_KEYS) {
      if (!msHit(MS_BTN_LEVEL[key], p)) continue;
      MS_SOUND.select();
      msLevelKey = key;
      msEnterState('playing');
      return;
    }
    return;
  }

  if (msState === 'playing' || msState === 'dying' || msState === 'lost') {
    if (msHit(MS_HUD_FACE, p) || (msState !== 'playing' && msHit(MS_BTN_AGAIN, p))) {
      MS_SOUND.select();
      msEnterState('playing');
      return;
    }
    if (msHit(MS_BTN_MENU, p)) { MS_SOUND.select(); msEnterState('attract'); return; }
    if (msState !== 'playing') return;
    if (msHit(MS_BTN_DIG, p))  { if (msMode !== 'dig')  { msMode = 'dig';  MS_SOUND.select(); } return; }
    if (msHit(MS_BTN_FLAG, p)) { if (msMode !== 'flag') { msMode = 'flag'; MS_SOUND.select(); } return; }
    const idx = msCellAt(p);
    if (idx < 0) return;
    msPress = { idx, x: p.x, y: p.y, t0: msClock,
                holdable: !msCells[idx].open, fired: false, cancelled: false };
    return;
  }

  if (msState === 'nameEntry') {
    for (let i = 0; i < MS_SLOTS.length; i++) {
      if (!msHit(MS_SLOTS[i], p)) continue;
      msInitials[i] = (msInitials[i] + 1) % MS_ALPHABET.length;
      MS_SOUND.select();
      return;
    }
    if (msHit(MS_BTN_OK, p)) {
      MS_SOUND.select();
      msSubmitTime(msLevelKey, msInitials.map(i => MS_ALPHABET[i]).join(''), msLastTime);
      msEnterState('leaderboard');
    }
    return;
  }

  if (msState === 'leaderboard') {
    if (msHit(MS_BTN_LB_AGAIN, p)) { MS_SOUND.select(); msEnterState('playing'); return; }
    if (msHit(MS_BTN_LB_MENU, p))  { MS_SOUND.select(); msEnterState('attract'); }
  }
}

function msStagePointer(e, phase) {
  if (phase === 'down') {
    if (msPtrId !== null) return;              // stage already claimed by another finger
    msPtrId = e.pointerId;
    const p = msToLogical(e);
    // Desktop: right-click drops a buoy (flags) straight away, no hold needed.
    if (e.button === 2) {
      if (msState === 'playing') {
        const idx = msCellAt(p);
        if (idx >= 0 && !msCells[idx].open) msAct(idx, 'flag');
      }
      return;
    }
    msOnDown(p);
    return;
  }

  if (e.pointerId !== msPtrId) return;         // not the pointer we claimed — ignore

  if (phase === 'move') {
    const press = msPress;
    if (!press || press.cancelled) return;
    const p = msToLogical(e);
    if (Math.hypot(p.x - press.x, p.y - press.y) > MS_DRAG_CANCEL) press.cancelled = true;
    return;
  }

  // up / cancel — release the stage first, whatever happens next
  msPtrId = null;
  const press = msPress;
  msPress = null;
  if (phase !== 'up' || !press || press.cancelled || press.fired) return;
  if (msState === 'playing') msAct(press.idx, msMode);
}

(function msBindInput() {
  const stage = document.getElementById('ms-stage');
  stage.addEventListener('pointerdown',       e => { stage.setPointerCapture(e.pointerId); msStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',       e => { if (e.buttons) msStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',         e => msStagePointer(e, 'up'));
  stage.addEventListener('pointercancel',     e => msStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => msStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',       e => e.preventDefault());   // right-click is BUOY, not a menu

  const visible = () => document.getElementById('screen-arcade-minesweeper').style.display !== 'none';

  document.addEventListener('keydown', e => {
    if (!visible() || msState !== 'playing') return;
    if (e.key === 'f' || e.key === 'F' || e.key === 'b' || e.key === 'B' || e.key === ' ') {   // F/B/space flip PING ↔ BUOY
      e.preventDefault();
      msMode = msMode === 'dig' ? 'flag' : 'dig';
      MS_SOUND.select();
    }
  });

  document.getElementById('btn-ms-exit').addEventListener('click', () => {
    resetArcadeMinesweeper();
    arcExitCabinet();   // back to the Arcade room (SW v254)
  });

  // A child WILL put the iPad down mid-board. Stop the loop (which also stops
  // the run clock — msElapsed only advances inside msUpdate) and drop any
  // half-finished press, since its pointerup may never arrive.
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (msRafHandle) { cancelAnimationFrame(msRafHandle); msRafHandle = null; }
      msPress = null;
      msPtrId = null;
    } else if (!msRafHandle) {
      msLastT = 0;
      msRafHandle = requestAnimationFrame(msLoop);
    }
  });
})();

// Same approach as apResize: fit the fixed 360×640 logical canvas into its
// container, backing store at (CSS scale × devicePixelRatio) so it stays sharp.
function msResize() {
  if (!msCanvas) return;
  const box   = msCanvas.parentElement;
  const scale = Math.min(box.clientWidth / MS_W, box.clientHeight / MS_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  msCanvas.style.width  = Math.floor(MS_W * scale) + 'px';
  msCanvas.style.height = Math.floor(MS_H * scale) + 'px';
  msCanvas.width        = Math.floor(MS_W * scale * dpr);
  msCanvas.height       = Math.floor(MS_H * scale * dpr);
  msCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// Called from engine.js resetToLobby() (add it beside resetArcade()).
function resetArcadeMinesweeper() {
  if (msRafHandle) { cancelAnimationFrame(msRafHandle); msRafHandle = null; }
  msState   = 'attract';
  msPress   = null;
  msPtrId   = null;
  msEvents  = [];
  msChain   = [];
  msTimerOn = false;
  msShake   = 0;
  msParts   = [];
  msSonar   = [];
  // msBoards is NOT cleared — see the declaration above.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-minesweeper').style.display !== 'none') msResize();
});
