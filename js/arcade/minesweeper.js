// ═══════════════════════════════════════════════════════════════════════════
// minesweeper.js — ARCADE CABINET 02. DEEP-SEA SWEEP: a Minesweeper dive,
// reskinned into Deep-Sea Deploy's (`dsd`) world. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep),
// arcade.js (arcExitCabinet)
//
// HOW IT PLAYS (the dive, Oct 2026 — was three separate sea-state boards)
//  - One run is a DIVE through sectors. Sweep every safe square of a sector and
//    you dive 100 m deeper onto a bigger, busier board. Score climbs all run;
//    everything is worth more the deeper you are (points × the sector number).
//  - The classic reading is untouched: numbers count the mines touching a
//    square, PING digs, a BUOY flags, tapping a number whose buoys add up opens
//    the rest (chord). The first ping of every sector is safe and opens a patch.
//  - HULL: three plates. Pinging a mine costs one plate (BREACH) and the dive
//    goes on; the third ends it. Running out of air costs one too.
//  - Each of the first six sectors brings ONE new thing, with a banner and a
//    coach line the first time: PEARLS (bonus squares), AIR (a gauge that
//    drains, topped up by every square you sweep), SONAR CHARGES (a glowing
//    square that buoys every mine near it), THE REEF (rock that shapes the
//    board), JAMMERS (static hides a number). Sector 7 on is THE TRENCH: all of
//    it, ragged walls closing in, two more mines every dive.
//  - Fairness promise (msPlaceMines): the first ping of a sector never hits a
//    mine and always opens its 3×3; a sonar charge is always safe to ping.
//
// Integration notes
//  - Prefix is `ms`. Screen id: screen-arcade-minesweeper. DOM: #ms-stage (the
//    pointer target, touch-action:none) wrapping #ms-canvas, plus #btn-ms-exit.
//  - Teardown is wired by the ARC_CABINETS entry's `stop` field (js/lobby/arcade.js).
//  - There are NO setTimeouts in this file. Every delayed effect (the mine chain
//    reaction, jingles, the stage tally, press-and-hold) is scheduled against
//    msClock and run from the RAF loop, so cancelling the loop IS the teardown.
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const MS_W = 360;
const MS_H = 640;

const MS_TITLE = 'DEEP-SEA SWEEP';   // the one place to rename the cabinet

// ── The dive ─────────────────────────────────────────────────────────────────
// One board per sector. Sized for a portrait phone: 12 columns is the widest
// that still gives a ~28 px square. `adds` is the one new thing the sector
// brings (msHas() switches it on for that sector and every one after).
const MS_STAGES = [
  { cols: 8,  rows: 10, mines: 10, name: 'THE SHALLOWS',   adds: null },
  { cols: 9,  rows: 11, mines: 13, name: 'PEARL BEDS',     adds: 'pearl' },
  { cols: 9,  rows: 12, mines: 16, name: 'RUNNING ON AIR', adds: 'air' },
  { cols: 10, rows: 13, mines: 20, name: 'SONAR CHARGES',  adds: 'sonar' },
  { cols: 10, rows: 14, mines: 21, name: 'THE REEF',       adds: 'reef' },
  { cols: 11, rows: 15, mines: 25, name: 'JAMMED SIGNALS', adds: 'jammer' },
];
const MS_ADDS = ['pearl', 'air', 'sonar', 'reef', 'jammer'];   // sector 2, 3, 4, 5, 6
const MS_TRENCH = { cols: 12, rows: 16, mines: 28, step: 2, cap: 40 };
const MS_TRENCH_NAMES = ['THE TRENCH', 'THE ABYSS', 'CRUSH DEPTH', 'THE DEEP DARK', 'BOTTOM OF THE MAP', 'HERE BE KRAKENS'];
const MS_ADD_BANNER = {
  pearl: 'NEW: PEARLS', air: 'NEW: AIR SUPPLY', sonar: 'NEW: SONAR CHARGES', reef: 'NEW: THE REEF', jammer: 'NEW: JAMMERS',
};

// ── Tuning ───────────────────────────────────────────────────────────────────
const MS_HOLD_MS        = 380;   // press-and-hold does the OTHER action (dig ↔ flag)
const MS_HOLD_SHOW_MS   = 110;   // hold ring stays hidden this long so ordinary taps don't flicker it
const MS_DRAG_CANCEL    = 14;    // logical px a press may wander before it stops counting as a tap
const MS_RIPPLE_MS      = 16;    // per-ring delay as a flood fill spreads outward
const MS_POP_MS         = 140;   // how long a freshly revealed square takes to settle
const MS_PEEK_MS        = 220;   // a chord that doesn't add up flashes the squares it would have opened
const MS_CHAIN_DELAY_MS = 380;   // the hit mine goes off alone before the rest follow
const MS_CHAIN_STEP_MS  = 80;    // gap between chain-reaction pops…
const MS_CHAIN_MAX_MS   = 1500;  // …squeezed so a big board still finishes in ~1.5s
const MS_LOST_HOLD_MS   = 450;   // after the last pop, before the wrong flags are revealed
const MS_LOST_BEAT_MS   = 1900;  // the wreck stays on screen this long before the scores
const MS_BOOM_TEXT_MS   = 900;
const MS_TOP_N          = 5;
const MS_ECHO_MS        = 170;   // a ping's echo comes back off the seabed this much later
const MS_SONAR_MS       = 650;   // how long a sonar ring takes to spread and fade
const MS_HULL           = 3;
const MS_AIR_MAX        = 100;
const MS_AIR_DRAIN      = 2.0;   // per second in sector 3…
const MS_AIR_DRAIN_STEP = 0.3;   // …this much more each sector after…
const MS_AIR_DRAIN_MAX  = 4.0;   // …up to this
const MS_AIR_PER_SQUARE = 0.8;   // every square swept pumps this much back in
const MS_AIR_LOW        = 25;    // below this the gauge flashes and gurgles
const MS_AIR_GASP       = 50;    // running dry costs a hull plate and refills to this
const MS_BIG_SWEEP      = 25;    // a ping that opens this many squares gets a shout
const MS_SONAR_REACH    = 2;     // a sonar charge buoys every mine within this many squares
const MS_PTS = { square: 10, pearl: 200, sonar: 100, buoy: 25, clear: 500, air: 5, clean: 300 };   // × sector number
const MS_TALLY_GAP_MS   = 320;
const MS_DIVE_MS        = 1700;  // the old board rises away, the new one comes up from the deep
const MS_BANNER_MS      = 2400;
const MS_COACH_MS       = 5000;

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
const MS_PEARL     = '#F4F1FF';
const MS_REEF      = ['#3D5A4F', '#4A6A5C', '#35514A'];
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

// Words — the coach box (once per session each) and the announcer.
const MS_COACH = {
  start:  'Tap a square to ping it. A number counts the mines touching it. Hold a square to drop a buoy on a mine.',
  pearl:  'Pearls hide under some squares. Sweep them up for bonus points.',
  air:    'Your air is running out! Every square you sweep pumps a little back in, so keep pinging.',
  sonar:  'A sonar charge is glowing. Ping it and every mine near it gets a buoy for free.',
  reef:   'The reef fills part of the sector. Rock is solid, and it never hides a mine.',
  jammer: 'Jammed! Static hides this number. Work it out from the squares around it.',
  hull:   'You hit a mine, but the hull held! Lose all three hull plates and the dive is over.',
  lowair: 'Air is low! Sweep squares quickly to refill your tank.',
};
const MS_SHOUT_SWEEP = ['BIG SWEEP!', 'CLEAR WATERS!', 'WHOOSH!', 'WIDE OPEN!'];
const MS_SHOUT_CLEAR = ['SECTOR CLEAR!', 'ALL CLEAR!', 'SWEPT CLEAN!', 'SHIP SHAPE!'];

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
  breach:    () => { playSecretBeep(98); msLater(110, () => playSecretBeep(131)); msLater(240, () => playSecretBeep(196)); },
  pearl:     () => { playSecretBeep(1568); msLater(70, () => playSecretBeep(2093)); },
  sweep:     () => [784, 988, 1175, 1568].forEach((f, k) => msLater(k * 60, () => playSecretBeep(f))),
  tally:     () => playSecretBeep(880),
  gurgle:    () => { playSecretBeep(175); msLater(90, () => playSecretBeep(147)); },
  gasp:      () => [131, 175, 262].forEach((f, k) => msLater(k * 90, () => playSecretBeep(f))),
  dive:      () => [659, 523, 440, 349, 294].forEach((f, k) => msLater(k * 120, () => playSecretBeep(f))),
  banner:    () => { playSecretBeep(523); msLater(110, () => playSecretBeep(784)); },
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
};
const MS_WIN_JINGLE = [784, 988, 1175, 1568];
const MS_OVER_JINGLE = [523, 392, 330, 262];

// ── Layout (logical px) ──────────────────────────────────────────────────────
const MS_HUD_HULL  = { x: 12,  y: 10, w: 100, h: 46 };
const MS_HUD_FACE  = { x: 156, y: 9,  w: 48, h: 48 };
const MS_HUD_SCORE = { x: 248, y: 10, w: 100, h: 46 };
const MS_AIR_BAR   = { x: 12,  y: 78, w: 336, h: 7 };
const MS_BOARD_AREA = { x: 10, y: 92, w: 340, h: 472 };

const MS_BTN_DIG   = { x: 12,  y: 574, w: 112, h: 54 };
const MS_BTN_FLAG  = { x: 124, y: 574, w: 112, h: 54 };
const MS_BTN_MENU  = { x: 248, y: 574, w: 100, h: 54 };
const MS_BTN_PLAY  = { x: 40,  y: 430, w: 280, h: 72 };

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
let msState     = 'attract';   // attract | playing | cleared | diving | dying | lost | nameEntry | leaderboard
let msClock     = 0;           // ms of un-paused time. Every delayed effect is scheduled against this.

let msStage      = 1;      // the sector you're sweeping (1-based); depth = msStage × 100 m
let msCols       = 8;
let msRows       = 10;
let msMineCount  = 10;
let msCells      = [];     // flat, index = row * msCols + col
let msLayout     = { x: 0, y: 0, w: 0, h: 0, size: 0 };
let msMinesPlaced = false; // mines are laid on the first ping of a sector, never before
let msRevealed   = 0;
let msSafeTotal  = 0;      // squares to sweep: not a mine, not reef
let msFlags      = 0;      // buoys, the player's and the sonar's
let msBlown      = 0;      // mines set off this sector (each one cost a hull plate)
let msTimerOn    = false;  // the air only drains once the sector's first ping is in
let msMode       = 'dig';  // what a plain tap does: 'dig' | 'flag'
let msHull       = MS_HULL;
let msHullHitAt  = -1e9;
let msHullLostHere = false;
let msAir        = MS_AIR_MAX;
let msNextGurgle = 0;
let msScore      = 0;
let msScoreShown = 0;      // the HUD counter rolls up to msScore
let msLastScore  = 0;
let msLastDepth  = 0;
let msLoseKind   = 'mine'; // 'mine' | 'air'

let msParts    = [];
let msShake    = 0;        // seconds remaining
let msFreeze   = 0;        // hit-stop, seconds remaining: the world holds its breath
let msFlash    = 0;
let msEvents   = [];       // [{ at, fn }] — msClock-scheduled effects (replaces setTimeout)
let msChain    = [];       // [{ idx, at }] mines still to go off in the loss chain reaction
let msChainEndAt = 0;
let msHitIdx   = -1;       // the mine that ended the run
let msBoomAt   = 0;
let msLostAt   = 0;
let msWinAt    = 0;
let msTally    = [];       // the sector-clear bonus lines: [label, points, at]
let msDiveAt   = 0;
let msPrevBoard = null;    // the board you just cleared, rising away during the dive
let msBanner   = null;     // { at, n, name, adds }
let msShout    = null;     // the announcer — one big line at a time: { text, col, at, life, loud, tilt }
let msPops     = [];       // small floating words: { text, x, y, at, col, size }
let msPeekIdx  = -1;
let msPeekUntil = 0;
let msSonar    = [];       // [{ x, y, at, big, max }] sonar rings spreading from a ping
let msCoach    = null;     // { text, until }
let msCoachQ   = [];
let msCoachSeen = {};      // session-only, like the scores: each coach line shows once
let msLastTapY = 0;        // the coach box sits in whichever half the finger isn't

// The single pointer currently allowed to act on #ms-stage — null when free.
// A second finger is ignored entirely (same rule as asherplane's apPtrId).
let msPtrId = null;
// The live press on a board square: { idx, x, y, t0, holdable, fired, cancelled }.
// Squares act on RELEASE (so press-and-hold can exist); buttons act on press.
let msPress = null;

// Session leaderboard, highest first: { name, score, depth }. Deliberately NOT
// cleared by resetArcadeMinesweeper() — scores last the afternoon, not forever.
let msScores = [];
let msLastEntry = -1;

const MS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let msInitials = [0, 0, 0];

function msLater(ms, fn) { msEvents.push({ at: msClock + ms, fn }); }
function msRandInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function msPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function msHas(feature) { return msStage >= 2 + MS_ADDS.indexOf(feature); }
function msDepth(n = msStage) { return n * 100; }
function msFmt(n) { return Math.round(n).toLocaleString('en-AU'); }

function msStageDef(n) {
  if (n <= MS_STAGES.length) return MS_STAGES[n - 1];
  const k = n - MS_STAGES.length;
  return { cols: MS_TRENCH.cols, rows: MS_TRENCH.rows, name: MS_TRENCH_NAMES[(k - 1) % MS_TRENCH_NAMES.length], adds: null,
           mines: Math.min(MS_TRENCH.cap, MS_TRENCH.mines + (k - 1) * MS_TRENCH.step) };
}

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
  // reaction); clear it on every hop.
  msShake = 0; msFreeze = 0;
  msPress = null;
  if (!msRafHandle) { msLastT = 0; msRafHandle = requestAnimationFrame(msLoop); }
}

// A fresh dive: sector 1, full hull, score zero.
function msNewGame() {
  msStage = 1; msHull = MS_HULL; msScore = 0; msScoreShown = 0;
  msParts = []; msEvents = []; msPops = []; msShout = null; msFlash = 0;
  msCoach = null; msCoachQ = []; msPrevBoard = null;
  msHullHitAt = -1e9;
  msBuildStage();
  msBanner = { at: msClock + 150, n: 1, name: msStageDef(1).name, adds: null };
  MS_SOUND.banner();
  msQueueCoach('start');
}

// The board for sector msStage: reef first (so you can see it before you
// ping), mines on the first ping (so the first ping is always safe).
function msBuildStage() {
  const L = msStageDef(msStage);
  msCols = L.cols; msRows = L.rows; msMineCount = L.mines;
  msCells = Array.from({ length: msCols * msRows }, () => (
    { mine: false, n: 0, open: false, flag: false, revealAt: 0, boomAt: 0,
      rock: false, pearl: false, sonar: false, jam: false, det: false, auto: false }));
  if (msHas('reef')) msCarveReef();
  msMinesPlaced = false;
  msRevealed = 0; msFlags = 0; msBlown = 0;
  msSafeTotal = msCells.filter(c => !c.rock).length - msMineCount;
  msTimerOn  = false;
  msMode     = 'dig';   // a fresh board always starts digging — a kid who left it on FLAG would be baffled
  msChain    = [];
  msHitIdx   = -1;
  msPeekIdx  = -1;
  msSonar    = [];
  msHullLostHere = false;
  msAir      = MS_AIR_MAX;
  msNextGurgle = 0;
  msLayout   = msComputeLayout();
}

// Reef: rock bites out of the corners and a pillar or two inside. In the
// Trench the walls close in from both sides as well — less room every dive.
function msCarveReef() {
  const rock = (c, r) => { if (c >= 0 && c < msCols && r >= 0 && r < msRows) msCells[r * msCols + c].rock = true; };
  const bite = (cx, cy, dx, dy, n) => { for (let k = 0; k < n; k++) for (let j = 0; j < n - k; j++) rock(cx + dx * j, cy + dy * k); };
  bite(0, 0, 1, 1, msRandInt(1, 3));
  bite(msCols - 1, 0, -1, 1, msRandInt(1, 3));
  bite(0, msRows - 1, 1, -1, msRandInt(1, 3));
  bite(msCols - 1, msRows - 1, -1, -1, msRandInt(1, 3));
  const trench = msStage > MS_STAGES.length;
  for (let p = trench ? 2 : 1; p > 0; p--) {
    const c = msRandInt(2, msCols - 4), r = msRandInt(2, msRows - 4), w = msRandInt(1, 2), h = msRandInt(1, 3);
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) rock(c + dx, r + dy);
  }
  if (trench) {
    const ph = Math.random() * 6, deep = Math.min(1, (msStage - MS_STAGES.length) / 6);
    for (let r = 0; r < msRows; r++) {
      const L = Math.max(0, Math.round(0.6 + deep + Math.sin(r * 0.6 + ph) * 1.1));
      const R = Math.max(0, Math.round(0.6 + deep + Math.sin(r * 0.5 + ph * 1.7) * 1.1));
      for (let c = 0; c < L; c++) rock(c, r);
      for (let c = 0; c < R; c++) rock(msCols - 1 - c, r);
    }
  }
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
  // the stage, and the air must not drain while a child can't see it.
  const so     = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  if (!paused) msUpdate(dt);
  msDraw();
  if (!msRafHandle) msRafHandle = requestAnimationFrame(msLoop);
}

function msUpdate(dt) {
  if (msShake > 0) msShake = Math.max(0, msShake - dt);
  if (msFlash > 0) msFlash = Math.max(0, msFlash - dt * 2.2);
  if (msFreeze > 0) { msFreeze -= dt; return; }       // hit-stop
  const step = dt * 1000;
  msClock += step;
  msScoreShown += (msScore - msScoreShown) * Math.min(1, dt * 8);
  if (Math.abs(msScore - msScoreShown) < 1) msScoreShown = msScore;

  msParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    if (p.spin) p.rot += p.spin * dt;
    if (p.home && p.life < p.max * 0.6) { p.vx += (p.home.x - p.x) * 6 * dt; p.vy += (p.home.y - p.y) * 6 * dt; }
    p.life -= dt;
  });
  msParts = msParts.filter(p => p.life > 0);
  if (msSonar.length) msSonar = msSonar.filter(r => msClock - r.at < MS_SONAR_MS);
  msPops = msPops.filter(p => msClock - p.at < 900);
  if (msShout && msClock - msShout.at > msShout.life) msShout = null;
  if (msBanner && msClock - msBanner.at > MS_BANNER_MS) msBanner = null;
  if (msCoach && msClock > msCoach.until) msCoach = null;
  if (!msCoach && msCoachQ.length && (msState === 'playing' || msState === 'diving')) msShowCoach(msCoachQ.shift());

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

  if (msState === 'playing' && msTimerOn && msHas('air')) msUpdateAir(dt);

  if (msState === 'dying') {
    while (msChain.length && msClock >= msChain[0].at) {
      const { idx } = msChain.shift();
      msPopMine(idx, msChain.length);
    }
    if (!msChain.length && msClock >= msChainEndAt) { msState = 'lost'; msLostAt = msClock; msOverJingle(); }
  }
  if (msState === 'lost' && msClock - msLostAt >= MS_LOST_BEAT_MS) msAfterLose();
  if (msState === 'diving' && msClock - msDiveAt >= MS_DIVE_MS) { msState = 'playing'; msPrevBoard = null; }
}

function msUpdateAir(dt) {
  const drain = Math.min(MS_AIR_DRAIN_MAX, MS_AIR_DRAIN + MS_AIR_DRAIN_STEP * (msStage - 3));
  msAir = Math.max(0, msAir - drain * dt);
  if (msAir < MS_AIR_LOW) {
    if (!msCoachSeen.lowair) msQueueCoach('lowair');
    if (msClock >= msNextGurgle) { MS_SOUND.gurgle(); msNextGurgle = msClock + 900; }
  }
  if (msAir <= 0) msOutOfAir();
}

// ── Board logic ──────────────────────────────────────────────────────────────
// Neighbours that are part of the sea floor — reef rock is never one.
function msNeighbours(idx, reach = 1) {
  const c = idx % msCols, r = Math.floor(idx / msCols), out = [];
  for (let dr = -reach; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < msRows && cc >= 0 && cc < msCols && !msCells[rr * msCols + cc].rock) out.push(rr * msCols + cc);
    }
  }
  return out;
}

// Lays the mines AFTER the first ping, keeping that square and its eight
// neighbours clear — so the first ping is never a mine AND always opens a
// patch to work from, instead of a lone number to guess around.
function msPlaceMines(safeIdx) {
  const safe = new Set([safeIdx, ...msNeighbours(safeIdx)]);
  const pool = [];
  for (let i = 0; i < msCells.length; i++) if (!safe.has(i) && !msCells[i].rock) pool.push(i);
  msMineCount = Math.min(msMineCount, pool.length - 1);
  msSafeTotal = msCells.filter(c => !c.rock).length - msMineCount;
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

// Pearls, sonar charges and jammers go on squares the first ping didn't open,
// so there's always something left to find.
function msPlaceExtras() {
  const closed = [];
  msCells.forEach((c, i) => { if (!c.mine && !c.rock && !c.open) closed.push(i); });
  const take = (n, ok = () => true) => {
    const out = [];
    for (let tries = 0; out.length < n && tries < 200; tries++) {
      const i = msPick(closed);
      if (i === undefined) break;
      const c = msCells[i];
      if (!c.pearl && !c.sonar && !c.jam && ok(c, i)) out.push(i);
    }
    return out;
  };
  if (msHas('pearl')) take(Math.min(6, 2 + Math.floor(msStage / 2))).forEach(i => { msCells[i].pearl = true; });
  if (msHas('sonar')) {
    take(msStage >= 7 ? 2 : 1, c => c.n > 0).forEach(i => { msCells[i].sonar = true; });
    msQueueCoach('sonar');
  }
  if (msHas('jammer')) take(msStage > MS_STAGES.length ? 3 : 2, c => c.n > 0).forEach(i => { msCells[i].jam = true; });
}

// The one place a board square is acted on — taps, holds and right-clicks all
// route here. An open number always chords, whatever the mode.
function msAct(idx, action) {
  const cell = msCells[idx];
  if (cell.rock) return;
  if (cell.open) { msChord(idx); return; }
  if (action === 'flag') { msToggleFlag(idx); return; }
  if (cell.flag) { MS_SOUND.nope(); return; }   // a flag protects its square — lift it first
  msDig(idx);
}

function msToggleFlag(idx) {
  const cell = msCells[idx];
  cell.flag = !cell.flag;
  cell.auto = false;
  msFlags += cell.flag ? 1 : -1;
  cell.flag ? MS_SOUND.flag() : MS_SOUND.unflag();
}

function msDig(idx) {
  let first = false;
  if (!msMinesPlaced) { msPlaceMines(idx); msTimerOn = true; first = true; }
  if (msCells[idx].mine) { msHitMine(idx); return; }
  const opened = msFlood(idx);
  if (first) msPlaceExtras();
  opened > 1 ? MS_SOUND.open() : MS_SOUND.dig();
  msPing(idx, opened > 1);
  if (opened >= MS_BIG_SWEEP) msBigSweep(opened);
  msCheckWin();
}

function msBigSweep(n) {
  msSay(msPick(MS_SHOUT_SWEEP), MS_FOAM, 1000, false);
  MS_SOUND.sweep();
  msShake = Math.max(msShake, 0.08);
}

// A sonar ring spreading out from a square — bigger when the ping opened a patch.
function msPing(idx, big) {
  const { cx, cy } = msCellCentre(idx);
  msSonar.push({ x: cx, y: cy, at: msClock, big, max: big ? 150 : 70 });
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
  msScore += MS_PTS.square * msStage;
  if (msHas('air')) msAir = Math.min(MS_AIR_MAX, msAir + MS_AIR_PER_SQUARE);
  const wait = c.revealAt - msClock;
  if (c.pearl) msLater(wait + 40, () => msGotPearl(i));
  if (c.sonar) msLater(wait + 60, () => msSonarSweep(i));
  if (c.jam && !msCoachSeen.jammer) msLater(wait + 200, () => msQueueCoach('jammer'));
}

function msGotPearl(i) {
  if (msState !== 'playing' && msState !== 'cleared') return;
  const { cx, cy } = msCellCentre(i);
  const pts = MS_PTS.pearl * msStage;
  msScore += pts;
  MS_SOUND.pearl();
  msPop('+' + msFmt(pts), cx, cy - 10, MS_PEARL, 16);
  for (let k = 0; k < 10; k++) {   // sparkles that home in on the score
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 80;
    msParts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, max: 0.8, star: true,
                   colour: k % 2 ? MS_PEARL : MS_YELLOW, home: { x: MS_HUD_SCORE.x + 50, y: MS_HUD_SCORE.y + 30 } });
  }
  if (!msCoachSeen.pearl) msQueueCoach('pearl');
}

// A sonar charge: every mine within reach gets a buoy, for free.
function msSonarSweep(i) {
  if (msState !== 'playing' && msState !== 'cleared') return;
  const { cx, cy } = msCellCentre(i);
  let n = 0;
  msNeighbours(i, MS_SONAR_REACH).forEach(j => {
    const c = msCells[j];
    if (c.mine && !c.flag && !c.det) { c.flag = true; c.auto = true; msFlags++; n++; }
  });
  const pts = MS_PTS.sonar * msStage;
  msScore += pts;
  msSonar.push({ x: cx, y: cy, at: msClock, big: true, max: 230 });
  msSonar.push({ x: cx, y: cy, at: msClock + 120, big: true, max: 230 });
  MS_SOUND.sweep();
  msSay('SONAR SWEEP!', MS_FOAM, 1100, true);
  msPop(n ? `${n} MINE${n === 1 ? '' : 'S'} MARKED` : 'ALL CLEAR NEARBY', cx, cy - 16, MS_YELLOW, 14);
  msFlash = Math.max(msFlash, 0.25);
}

// Chord: tapping an open number whose buoys already add up opens every other
// neighbour in one go. A mine that already went off counts as found. If the
// buoys were wrong, that's a mine — fair's fair.
function msChord(idx) {
  const c = msCells[idx];
  if (c.n === 0 || c.mine) return;
  if (c.jam) { MS_SOUND.nope(); return; }        // you can't chord a number you can't read
  const nb = msNeighbours(idx);
  const flags = nb.reduce((n, j) => n + (msCells[j].flag || msCells[j].det ? 1 : 0), 0);
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
  if (opened) { MS_SOUND.open(); msPing(idx, true); if (opened >= MS_BIG_SWEEP) msBigSweep(opened); }
  if (hit >= 0) { msHitMine(hit); return; }
  if (opened) msCheckWin();
}

function msCheckWin() {
  if (msState === 'playing' && msRevealed >= msSafeTotal) msWin();
}

// A mine went off. The hull takes it — unless it was the last plate.
function msHitMine(idx) {
  const cell = msCells[idx];
  cell.open = true; cell.det = true; cell.boomAt = msClock;
  msHull--; msBlown++;
  msHullHitAt = msClock; msHullLostHere = true;
  if (msHull <= 0) { msLose(idx, 'mine'); return; }
  MS_SOUND.breach();
  msShake = 0.4; msFreeze = 0.09; msFlash = 0.55;
  const { cx, cy } = msCellCentre(idx);
  msBurst(cx, cy, ['#F97316', '#FDE68A', '#F8FAFC', '#7DE3F0'], 22, 60, 220);
  msBubbles(cx, cy, 12);
  msSay('HULL BREACH!', MS_RED, 1200, true);
  msPop(msHull === 1 ? 'LAST HULL PLATE!' : msHull + ' HULL PLATES LEFT', MS_W / 2, MS_BOARD_AREA.y + 70, MS_YELLOW, 15);
  msQueueCoach('hull');
  msCheckWin();   // a chord can sweep the last safe square in the same tap that hit this mine
}

function msOutOfAir() {
  msHull--;
  msHullHitAt = msClock; msHullLostHere = true;
  if (msHull <= 0) { msLose(-1, 'air'); return; }
  msAir = MS_AIR_GASP;
  MS_SOUND.gasp();
  msShake = 0.25; msFlash = 0.4;
  msBubbles(MS_W / 2, MS_BOARD_AREA.y + MS_BOARD_AREA.h / 2, 24);
  msSay('OUT OF AIR!', MS_RED, 1200, true);
  msPop('EMERGENCY TANK · HULL -1', MS_W / 2, MS_BOARD_AREA.y + 70, MS_YELLOW, 14);
}

// The dive is over. hitIdx is the mine that did it (−1 when the air ran out).
function msLose(hitIdx, kind) {
  msTimerOn = false;
  msLoseKind = kind;
  msHitIdx  = hitIdx;
  msBoomAt  = msClock;
  msLastScore = msScore; msLastDepth = msDepth();
  msCoach = null; msCoachQ = [];
  MS_SOUND.boom();
  msShake = 0.45; msFlash = 0.6;
  let hc = Math.floor(msCols / 2), hr = Math.floor(msRows / 2);
  if (hitIdx >= 0) {
    const hit = msCells[hitIdx];
    hit.open = true;
    hit.boomAt = msClock;
    const { cx, cy } = msCellCentre(hitIdx);
    msBurst(cx, cy, ['#F97316', '#FDE68A', '#F8FAFC', '#7DE3F0'], 26, 60, 220);   // flash + white water
    msBubbles(cx, cy, 14);
    hc = hitIdx % msCols; hr = Math.floor(hitIdx / msCols);
  } else {
    msBubbles(MS_W / 2, MS_BOARD_AREA.y + MS_BOARD_AREA.h / 2, 30);
  }

  // Every other unflagged mine goes off, nearest first, so the explosion
  // visibly spreads out from the square that was tapped. Correct flags hold.
  const rest = [];
  msCells.forEach((c, i) => { if (c.mine && !c.flag && !c.det && i !== hitIdx) rest.push(i); });
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

function msOverJingle() {
  MS_OVER_JINGLE.forEach((f, k) => msLater(150 + k * 140, () => playSecretBeep(f)));
}

function msAfterLose() {
  if (msQualifies(msLastScore)) {
    msInitials = [0, 0, 0];
    MS_SOUND.highScore();
    msEnterState('nameEntry');
  } else {
    msLastEntry = -1;
    msEnterState('leaderboard');
  }
}

// Sector clear: the tally, then the dive.
function msWin() {
  msTimerOn  = false;
  msWinAt    = msClock;
  const n = msStage;
  // Buoys the player laid on real mines earn a bonus; then the classic
  // courtesy — every mine still hiding gets a buoy.
  let buoys = 0;
  msCells.forEach(c => {
    if (c.mine && c.flag && !c.auto) buoys++;
    if (c.mine && !c.flag && !c.det) { c.flag = true; msFlags++; }
  });
  msTally = [['SECTOR CLEAR', MS_PTS.clear * n]];
  if (buoys) msTally.push([`BUOYS ×${buoys}`, MS_PTS.buoy * buoys * n]);
  if (msHas('air')) msTally.push(['AIR IN THE TANK', Math.floor(msAir) * MS_PTS.air * n]);
  if (!msHullLostHere) msTally.push(['NO DAMAGE', MS_PTS.clean * n]);
  msTally.forEach((t, k) => {
    t[2] = msClock + 450 + k * MS_TALLY_GAP_MS;
    msLater(450 + k * MS_TALLY_GAP_MS, () => { msScore += t[1]; MS_SOUND.tally(); });
  });
  MS_WIN_JINGLE.forEach((f, k) => msLater(80 + k * 110, () => playSecretBeep(f)));
  msConfetti();
  msLater(450, msConfetti);
  msSay(msPick(MS_SHOUT_CLEAR), MS_YELLOW, 1300, true);
  msFlash = 0.35;
  msState = 'cleared';
  msPress = null;
  msLater(450 + msTally.length * MS_TALLY_GAP_MS + 1100, msBeginDive);
}

// The board you cleared rises away; the next sector comes up from below.
function msBeginDive() {
  if (msState !== 'cleared') return;
  msPrevBoard = { cells: msCells, cols: msCols, rows: msRows, layout: msLayout };
  msStage++;
  msBuildStage();
  msState = 'diving';
  msDiveAt = msClock;
  msShout = null;
  msCoach = null;   // a line still waiting was about the sector just left — let it come back next time
  msCoachQ.forEach(k => { delete msCoachSeen[k]; });
  msCoachQ = [];
  MS_SOUND.dive();
  const L = msStageDef(msStage);
  msBanner = { at: msClock + MS_DIVE_MS * 0.55, n: msStage, name: L.name, adds: L.adds };
  msLater(MS_DIVE_MS * 0.55, MS_SOUND.banner);
  if (L.adds && L.adds !== 'sonar') msQueueCoach(L.adds);   // the sonar coach waits until a charge actually glows
  for (let k = 0; k < 26; k++) {   // bubbles streaming up past the window
    msParts.push({ x: Math.random() * MS_W, y: MS_H + Math.random() * 120, vx: (Math.random() - 0.5) * 30,
                   vy: -220 - Math.random() * 260, life: 1.6, max: 1.6, bub: true, r: 2 + Math.random() * 4,
                   colour: 'rgba(230,247,251,0.85)' });
  }
}

// ── The announcer, pops and the coach ────────────────────────────────────────
function msSay(text, col, life, loud) {
  if (msShout && msShout.loud && !loud && msClock - msShout.at < 500) return;   // a loud line isn't cut off by a quiet one
  msShout = { text, col, at: msClock, life, loud: !!loud, tilt: (Math.random() - 0.5) * 0.14 };
}
function msPop(text, x, y, col, size) {
  msPops.push({ text, x: Math.max(70, Math.min(MS_W - 70, x)), y, at: msClock, col, size });
}
function msQueueCoach(key) {
  if (msCoachSeen[key]) return;
  msCoachSeen[key] = true;
  msCoachQ.push(key);
}
function msShowCoach(key) { msCoach = { text: MS_COACH[key], until: msClock + MS_COACH_MS }; }

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

// ── Session leaderboard — highest first ──────────────────────────────────────
function msQualifies(score) {
  if (score <= 0) return false;
  if (msScores.length < MS_TOP_N) return true;
  return score > msScores[msScores.length - 1].score;
}

function msSubmitScore(name, score, depth) {
  const entry = { name, score, depth };
  msScores.push(entry);
  msScores.sort((a, b) => b.score - a.score);
  msScores = msScores.slice(0, MS_TOP_N);
  msLastEntry = msScores.indexOf(entry);
}

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
  if (msState === 'playing' && p && !p.cancelled && !p.fired && msCells[p.idx] && !msCells[p.idx].rock) {
    const c = msCells[p.idx];
    if (!c.open) { if (msMode === 'dig' && !c.flag) set.add(p.idx); }
    else if (c.n > 0 && !c.mine && !c.jam) addClosedNeighbours(p.idx);
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
    if (msState === 'diving') msDrawDive();
    else {
      const pressed = msPressedSet();
      msDrawBoard(pressed);
      msDrawSonar();
      msDrawHoldRing();
    }
    msDrawHud();
    msDrawBottomBar();
    msDrawParts();
    msDrawPops();
    msDrawBanner();
    msDrawShout();
    msDrawCoach();
    if (msState === 'cleared') msDrawTally();
    if (msState === 'dying' || msState === 'lost') msDrawBoomText();
  }
  if (msFlash > 0) { g.fillStyle = `rgba(255,255,255,${(msFlash * 0.5).toFixed(3)})`; g.fillRect(-20, -20, MS_W + 40, MS_H + 40); }
  g.restore();
}

// ── The sea behind everything ────────────────────────────────────────────────
// A deep gradient, slow light shafts from the surface, and bubbles that rise
// forever. It darkens as the dive goes deeper; past 300 m little glowing
// specks drift in the dark. All of it is worked out from msClock each frame —
// no state to keep, nothing to tear down. The tables are fixed "random".
const MS_AMBIENT = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 97 + 23) % MS_W,
  phase: (i * 211) % MS_H,
  speed: 12 + (i * 37) % 22,
  r: 1.5 + ((i * 13) % 4) * 0.8,
  sway: 3 + (i * 7) % 6,
}));
const MS_GLOW = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 131 + 41) % MS_W, y: (i * 173 + 17) % MS_H, ph: i * 0.9, r: 1.2 + (i % 3) * 0.7,
  col: ['#7DE3F0', '#C4B5FD', '#86EFAC'][i % 3],
}));

function msMixHex(a, b, t) {
  const A = [1, 3, 5].map(k => parseInt(a.slice(k, k + 2), 16)), B = [1, 3, 5].map(k => parseInt(b.slice(k, k + 2), 16));
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
}

// How deep the water looks: 0 at the surface, 1 in the dark. Eases over the dive.
function msDarkness() {
  let n = msState === 'attract' ? 1 : msStage;
  if (msState === 'diving') n = msStage - 1 + Math.min(1, (msClock - msDiveAt) / MS_DIVE_MS);
  return Math.min(1, Math.max(0, (n - 1) / 8));
}

function msDrawSea() {
  const g = msCtx, t = msClock / 1000, dark = msDarkness();
  const grad = g.createLinearGradient(0, 0, 0, MS_H);
  grad.addColorStop(0, msMixHex(MS_BG_TOP, '#06121F', dark));
  grad.addColorStop(0.55, msMixHex(MS_BG, '#020A12', dark));
  grad.addColorStop(1, '#020D13');
  g.fillStyle = grad;
  g.fillRect(-20, -20, MS_W + 40, MS_H + 40);

  g.save();
  g.globalAlpha = 0.06 * (1 - dark * 0.85);
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

  if (dark > 0.3) {   // the deep glows
    MS_GLOW.forEach(s => {
      const a = (dark - 0.3) / 0.7 * (0.35 + 0.35 * Math.sin(t * 1.4 + s.ph));
      g.globalAlpha = Math.max(0, a);
      g.fillStyle = s.col;
      const x = (s.x + Math.sin(t * 0.4 + s.ph) * 10 + MS_W) % MS_W, y = (s.y - t * 6 + MS_H * 4) % MS_H;
      g.beginPath(); g.arc(x, y, s.r, 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1;
  }

  g.strokeStyle = 'rgba(190,240,250,0.32)';
  g.lineWidth = 1;
  MS_AMBIENT.forEach(b => {
    const y = MS_H + 20 - ((b.phase + t * b.speed) % (MS_H + 40));
    const x = b.x + Math.sin(t * 1.3 + b.phase) * b.sway;
    g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.stroke();
  });
}

// During the dive: the cleared board rises away, the new one comes up after
// it, and the depth reading ticks over between them.
function msDrawDive() {
  const g = msCtx, k = Math.min(1, (msClock - msDiveAt) / MS_DIVE_MS);
  const e = k * k * (3 - 2 * k);
  const keep = { cells: msCells, cols: msCols, rows: msRows, layout: msLayout };
  g.save();
  g.beginPath(); g.rect(0, MS_BOARD_AREA.y - 8, MS_W, MS_BOARD_AREA.h + 14); g.clip();   // the porthole: boards never cross the HUD
  if (msPrevBoard) {
    msBoardSwap(msPrevBoard);
    g.save(); g.translate(0, -e * 620); msDrawBoard(new Set()); g.restore();
    msBoardSwap(keep);
  }
  g.save(); g.translate(0, (1 - e) * 620); msDrawBoard(new Set()); g.restore();
  const from = msDepth(msStage - 1), to = msDepth(msStage);
  const m = Math.round(from + (to - from) * e);
  g.textAlign = 'center';
  g.globalAlpha = Math.sin(k * Math.PI);
  g.lineJoin = 'round';
  g.font = 'bold 54px monospace';
  g.lineWidth = 8; g.strokeStyle = MS_BG; g.strokeText(m + ' M', MS_W / 2, 330);
  g.fillStyle = MS_FOAM; g.fillText(m + ' M', MS_W / 2, 330);
  g.font = 'bold 14px monospace';
  g.fillStyle = MS_GREY; g.fillText('DIVING…', MS_W / 2, 360);
  g.globalAlpha = 1;
  g.restore();
}
function msBoardSwap(b) { msCells = b.cells; msCols = b.cols; msRows = b.rows; msLayout = b.layout; return b; }

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

    if (cell.rock) { msDrawReef(x, y, s, i); continue; }

    if (!cell.open || msClock < cell.revealAt) {
      msDrawTile(x, y, s, pressed.has(i), i);
      if (cell.sonar && msMinesPlaced) msDrawSonarCharge(cx, cy, s);
      if (cell.flag) {
        msDrawBuoy(cx, cy, s, null, i);
        if (over && !cell.mine) msDrawCross(x, y, s);   // that buoy was wrong
      }
      continue;
    }

    if (cell.mine) {
      const age = msClock - cell.boomAt;
      msDrawOpen(x, y, s, i === msHitIdx ? '#DC2626' : cell.det ? '#B4532A' : '#7F1D1D');
      const k = age < MS_POP_MS ? 1.6 - 0.6 * (age / MS_POP_MS) : 1;   // lands big, settles
      msDrawMine(cx, cy, s, k);
      continue;
    }

    msDrawOpen(x, y, s, null, i);
    if (cell.pearl) msDrawShell(cx, cy, s, msClock - cell.revealAt);
    if (cell.jam && cell.n) { msDrawJammed(x, y, s, i); continue; }
    if (cell.n) {
      const age = msClock - cell.revealAt;
      const k = age < MS_POP_MS ? 0.5 + 0.5 * (age / MS_POP_MS) : 1;
      msDrawNumber(cx, cy, s, cell.n, k);
    }
  }
}

// Reef rock: a dark stony lump with a coral sprig, so the board's edge has a shape.
function msDrawReef(x, y, s, i) {
  const g = msCtx;
  g.fillStyle = MS_REEF[(i * 7 + Math.floor(i / 5)) % 3];
  g.fillRect(x, y, s, s);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.arc(x + s * 0.62, y + s * 0.66, s * 0.26, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath(); g.arc(x + s * 0.35, y + s * 0.32, s * 0.22, 0, Math.PI * 2); g.fill();
  if (i % 3 === 0) {   // a coral sprig on every third rock
    g.strokeStyle = ['#FB7185', '#F59E0B', '#C4B5FD'][i % 9 / 3 | 0];
    g.lineWidth = Math.max(1.5, s * 0.07); g.lineCap = 'round';
    const bx = x + s * 0.3, by = y + s * 0.85;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - s * 0.4);
    g.moveTo(bx, by - s * 0.2); g.lineTo(bx + s * 0.16, by - s * 0.38);
    g.moveTo(bx, by - s * 0.28); g.lineTo(bx - s * 0.12, by - s * 0.44); g.stroke();
    g.lineCap = 'butt';
  }
}

// A sonar charge waiting under the water: a pulsing ring, always safe to ping.
function msDrawSonarCharge(cx, cy, s) {
  const g = msCtx, k = (msClock % 1100) / 1100;
  g.strokeStyle = `rgba(253,230,138,${(0.9 - k * 0.8).toFixed(3)})`;
  g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, s * (0.18 + k * 0.42), 0, Math.PI * 2); g.stroke();
  g.fillStyle = MS_YELLOW;
  g.beginPath(); g.arc(cx, cy, Math.max(2, s * 0.1), 0, Math.PI * 2); g.fill();
}

// Where a pearl was: it pops up and away, and leaves an open shell behind.
function msDrawShell(cx, cy, s, age) {
  const g = msCtx;
  g.fillStyle = 'rgba(214,180,140,0.55)';
  g.beginPath(); g.ellipse(cx + s * 0.22, cy + s * 0.25, s * 0.17, s * 0.1, 0, 0, Math.PI * 2); g.fill();
  if (age < 0 || age > 700) return;
  const t = age / 700;
  g.globalAlpha = 1 - t;
  g.fillStyle = MS_PEARL;
  g.beginPath(); g.arc(cx, cy - t * s * 0.8, s * 0.2 * (1 + t * 0.5), 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF';
  g.beginPath(); g.arc(cx - s * 0.06, cy - t * s * 0.8 - s * 0.07, s * 0.06, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

// A jammed number: static where the digit should be, and a "?".
function msDrawJammed(x, y, s, i) {
  const g = msCtx;
  const f = Math.floor(msClock / 90);
  for (let k = 0; k < 6; k++) {
    const yy = y + s * (0.18 + ((k * 37 + f * 13 + i) % 64) / 100);
    g.fillStyle = k % 2 ? 'rgba(17,24,39,0.35)' : 'rgba(255,255,255,0.55)';
    g.fillRect(x + s * 0.15, yy, s * 0.7, Math.max(1, s * 0.05));
  }
  g.fillStyle = '#6B7280';
  g.font = `bold ${Math.round(s * 0.56)}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('?', x + s / 2 + (f % 3 - 1), y + s / 2 + s * 0.04);
  g.textBaseline = 'alphabetic';
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
    const max = r.max || (r.big ? 150 : 70);
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
function msDrawHud() {
  const g = msCtx;
  // HULL: three plates; the one just lost flashes red
  const H = MS_HUD_HULL;
  msDrawPanel(H, 'HULL');
  for (let k = 0; k < MS_HULL; k++) {
    const on = k < msHull, lostNow = k === msHull && msClock - msHullHitAt < 700;
    msDrawPlate(H.x + 22 + k * 28, H.y + 30, on, lostNow && Math.floor(msClock / 90) % 2 === 0);
  }
  // SCORE: rolls up
  const S = MS_HUD_SCORE;
  msDrawPanel(S, 'SCORE');
  const txt = msFmt(msScoreShown);
  g.fillStyle = MS_YELLOW;
  g.font = `bold ${txt.length > 7 ? 16 : txt.length > 5 ? 19 : 22}px monospace`;
  g.textAlign = 'right';
  g.fillText(txt, S.x + S.w - 8, S.y + 37);

  const f = MS_HUD_FACE;
  const mood = (msState === 'dying' || msState === 'lost') ? 'dead'
             : msState === 'cleared' || msState === 'diving' ? 'cool'
             : msClock - msHullHitAt < 900 ? 'oh'
             : msPress && !msPress.cancelled ? 'oh' : 'smile';
  msDrawTile(f.x, f.y, f.w, false);
  msDrawFace(f.x + f.w / 2, f.y + f.h / 2, 16, mood);

  // depth and mines-to-find, under the Captain
  const left = msMineCount - msFlags - msBlown;
  g.textAlign = 'center';
  g.font = 'bold 11px monospace';
  g.fillStyle = MS_GREY;
  g.fillText(`${msDepth()} M  ·  MINES ${msMinesPlaced ? left : msMineCount}`, MS_W / 2, 72);

  if (msHas('air')) msDrawAir();
}

function msDrawPanel(r, label) {
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
}

// One hull plate: a riveted shield.
function msDrawPlate(cx, cy, on, flash) {
  const g = msCtx;
  g.beginPath();
  g.moveTo(cx - 10, cy - 9); g.lineTo(cx + 10, cy - 9); g.lineTo(cx + 10, cy + 1);
  g.quadraticCurveTo(cx + 9, cy + 8, cx, cy + 11); g.quadraticCurveTo(cx - 9, cy + 8, cx - 10, cy + 1);
  g.closePath();
  g.fillStyle = flash ? MS_RED : on ? MS_FOAM : 'rgba(125,227,240,0.12)';
  g.fill();
  g.strokeStyle = on || flash ? MS_BG : 'rgba(125,227,240,0.35)';
  g.lineWidth = 1.5; g.stroke();
  if (on) {
    g.fillStyle = MS_BG;
    [[-6, -5], [6, -5], [0, 5]].forEach(([dx, dy]) => { g.beginPath(); g.arc(cx + dx, cy + dy, 1.4, 0, Math.PI * 2); g.fill(); });
  }
}

// The air gauge: foam when full, yellow when it's getting low, red and
// flashing when it's nearly gone.
function msDrawAir() {
  const g = msCtx, A = MS_AIR_BAR, k = msAir / MS_AIR_MAX;
  const low = msAir < MS_AIR_LOW, flash = low && Math.floor(msClock / 220) % 2 === 0;
  g.fillStyle = 'rgba(2,13,19,0.7)';
  g.fillRect(A.x, A.y, A.w, A.h);
  g.fillStyle = low ? (flash ? '#FFFFFF' : MS_RED) : k < 0.5 ? MS_YELLOW : MS_FOAM;
  g.fillRect(A.x, A.y, A.w * k, A.h);
  g.strokeStyle = low ? MS_RED : MS_FRAME;
  g.lineWidth = 1.5;
  g.strokeRect(A.x, A.y, A.w, A.h);
  if (!msTimerOn && msState === 'playing') {   // before the first ping, the tank isn't open yet
    g.fillStyle = MS_DIM; g.font = '8px monospace'; g.textAlign = 'right';
    g.fillText('AIR · FIRST PING OPENS THE TANK', A.x + A.w, A.y - 2);
  }
}

function msDrawBottomBar() {
  if (msState === 'playing') {
    msDrawSegment(MS_BTN_DIG,  'PING', msMode === 'dig',  'ping');
    msDrawSegment(MS_BTN_FLAG, 'BUOY', msMode === 'flag', 'buoy');
  }
  msDrawButton(MS_BTN_MENU, 'MENU', 18);
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
    if (p.star) {
      g.fillRect(p.x - 3, p.y - 0.75, 6, 1.5); g.fillRect(p.x - 0.75, p.y - 3, 1.5, 6);
    } else if (p.conf) {
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

// Outlined text: reads over sand, water and reef alike.
function msOutlined(text, x, y, size, fill, lw = 6) {
  const g = msCtx;
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center';
  g.lineJoin = 'round';
  g.lineWidth = lw; g.strokeStyle = MS_BG; g.strokeText(text, x, y);
  g.fillStyle = fill; g.fillText(text, x, y);
}

function msDrawPops() {
  const g = msCtx;
  msPops.forEach(p => {
    const t = (msClock - p.at) / 900;
    g.globalAlpha = Math.max(0, 1 - t * t);
    msOutlined(p.text, p.x, p.y - t * 28, p.size, p.col, 5);
  });
  g.globalAlpha = 1;
}

// The announcer: one big line at a time, popping in over the board.
function msDrawShout() {
  const s = msShout;
  if (!s || msBanner) return;
  const g = msCtx, t = msClock - s.at;
  const pop = t < 140 ? 1.6 - (t / 140) * 0.6 : 1;
  g.save();
  g.globalAlpha = t > s.life - 250 ? Math.max(0, (s.life - t) / 250) : 1;
  g.translate(MS_W / 2, MS_BOARD_AREA.y + 120);
  g.rotate(s.tilt);
  g.scale(pop, pop);
  g.font = `bold ${s.text.length > 12 ? 30 : 36}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 10; g.strokeStyle = 'rgba(2,13,19,0.55)'; g.strokeText(s.text, 3, 4);
  g.lineWidth = 8; g.strokeStyle = MS_BG; g.strokeText(s.text, 0, 0);
  g.fillStyle = s.loud && Math.floor(msClock / 90) % 2 ? '#FFFFFF' : s.col;
  g.fillText(s.text, 0, 0);
  g.restore();
  g.textBaseline = 'alphabetic';
}

// "SECTOR 3 · 300 M" sweeping across, with the sector's name and what's new.
function msDrawBanner() {
  const b = msBanner;
  if (!b || msClock < b.at) return;
  const g = msCtx, t = (msClock - b.at) / 1000;
  const inK = 1 - Math.pow(1 - Math.min(1, t / 0.3), 3), outK = t > 2.0 ? Math.min(1, (t - 2.0) / 0.4) : 0;
  const x = (1 - inK) * -MS_W + outK * outK * MS_W, y = MS_BOARD_AREA.y + 190;
  g.save(); g.translate(x, y); g.rotate(-0.04);
  g.fillStyle = 'rgba(4,27,38,0.93)'; g.fillRect(-40, -48, MS_W + 80, 96);
  g.fillStyle = MS_FOAM; g.fillRect(-40, -48, MS_W + 80, 4); g.fillRect(-40, 44, MS_W + 80, 4);
  g.fillStyle = 'rgba(125,227,240,0.08)';
  for (let k = 0; k < 13; k++) g.fillRect(-40 + k * 40 + ((t * 120) % 40), -44, 18, 88);
  msOutlined(`SECTOR ${b.n} · ${msDepth(b.n)} M`, MS_W / 2, -14, 26, '#FFFFFF', 6);
  msOutlined(b.name, MS_W / 2, 14, 17, MS_YELLOW, 4);
  if (b.adds) msOutlined(MS_ADD_BANNER[b.adds], MS_W / 2, 36, 12, MS_FOAM, 3);
  g.restore();
}

// The coach box: one plain sentence or two, in whichever half of the board
// the finger isn't in, for five seconds.
function msDrawCoach() {
  if (!msCoach) return;
  const g = msCtx;
  const lines = msWrap(msCoach.text, 300, 12), h = lines.length * 17 + 18;
  const top = msLastTapY > MS_BOARD_AREA.y + MS_BOARD_AREA.h / 2;
  const y = top ? MS_BOARD_AREA.y + 6 : MS_BOARD_AREA.y + MS_BOARD_AREA.h - h - 6;
  g.globalAlpha = Math.min(1, (msCoach.until - msClock) / 400);
  g.fillStyle = 'rgba(232,220,188,0.96)';
  g.fillRect(20, y, 320, h);
  g.strokeStyle = MS_FOAM; g.lineWidth = 2.5; g.strokeRect(20, y, 320, h);
  g.fillStyle = MS_BG; g.font = 'bold 12px monospace'; g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, MS_W / 2, y + 21 + i * 17));
  g.globalAlpha = 1;
}

function msWrap(text, maxW, size) {
  const g = msCtx;
  g.font = `bold ${size}px monospace`;
  const out = [];
  let line = '';
  text.split(' ').forEach(w => {
    const tryLine = line ? line + ' ' + w : w;
    if (g.measureText(tryLine).width > maxW && line) { out.push(line); line = w; } else line = tryLine;
  });
  if (line) out.push(line);
  return out;
}

// The sector tally: each bonus line slides in as its points land.
function msDrawTally() {
  const g = msCtx;
  const shown = msTally.filter(t => msClock >= t[2]);
  if (!shown.length) return;
  const y0 = MS_BOARD_AREA.y + 190, h = 36 + shown.length * 26;
  g.fillStyle = 'rgba(4,27,38,0.9)';
  g.fillRect(30, y0, 300, h);
  g.strokeStyle = MS_FOAM; g.lineWidth = 2.5; g.strokeRect(30, y0, 300, h);
  shown.forEach((t, k) => {
    const age = msClock - t[2], slide = Math.max(0, 1 - age / 160) * 30;
    const y = y0 + 30 + k * 26;
    g.font = 'bold 15px monospace';
    g.textAlign = 'left'; g.fillStyle = MS_GREY; g.fillText(t[0], 46 - slide, y);
    g.textAlign = 'right'; g.fillStyle = MS_YELLOW; g.fillText('+' + msFmt(t[1]), 314 + slide, y);
  });
}

function msDrawBoomText() {
  const age = msClock - msBoomAt;
  const g = msCtx;
  if (age < MS_BOOM_TEXT_MS) {
    const t = age / MS_BOOM_TEXT_MS;
    const cy = msLayout.y + msLayout.h / 2;
    const word = msLoseKind === 'air' ? 'GLUG GLUG!' : 'SPLOOSH!';
    g.save();
    g.globalAlpha = 1 - t * t;
    g.translate(MS_W / 2, cy);
    g.scale(1 + t * 0.5, 1 + t * 0.5);
    g.font = `bold ${word.length > 8 ? 46 : 56}px monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.lineJoin = 'round';   // mitred joins throw spikes off the letters
    g.strokeStyle = '#7C2D12';
    g.strokeText(word, 0, 0);
    g.fillStyle = MS_YELLOW;
    g.fillText(word, 0, 0);
    g.restore();
    g.textBaseline = 'alphabetic';
  }
  if (msState === 'lost') {   // the mission card over the wreck
    const k = Math.min(1, (msClock - msLostAt) / 250), cy = MS_BOARD_AREA.y + 200;
    g.globalAlpha = k;
    g.fillStyle = 'rgba(4,27,38,0.9)'; g.fillRect(0, cy - 58, MS_W, 116);
    g.fillStyle = MS_RED; g.fillRect(0, cy - 58, MS_W, 3); g.fillRect(0, cy + 55, MS_W, 3);
    msOutlined('MISSION OVER', MS_W / 2, cy - 22, 30, MS_YELLOW, 6);
    msOutlined(`${msFmt(msLastScore)} PTS`, MS_W / 2, cy + 12, 24, '#FFFFFF', 5);
    msOutlined(`REACHED ${msLastDepth} M`, MS_W / 2, cy + 38, 13, MS_FOAM, 4);
    g.globalAlpha = 1;
  }
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

  // the Arcade Floor's preview (msPreviewing) keeps the sticker and the strip, none of the words or buttons
  if (!msPreviewing) {
    g.textAlign = 'center';
    g.fillStyle = MS_FOAM;
    g.font = 'bold 30px monospace';
    g.fillText(MS_TITLE, MS_W / 2, 214);
    g.fillStyle = MS_DIM;
    g.font = '10px monospace';
    g.fillText('A DEEP-SEA DEPLOY MISSION', MS_W / 2, 232);
  }

  // A five-square strip that shows the whole game at a glance:
  // a number, a buoy, a mine that went off, another number, unswept water.
  const s = 34, x0 = MS_W / 2 - s * 2.5, y0 = 244;
  msDrawOpen(x0, y0, s, null, 0);           msDrawNumber(x0 + s / 2, y0 + s / 2, s, 1, 1);
  msDrawTile(x0 + s, y0, s, false, 1);      msDrawBuoy(x0 + s * 1.5, y0 + s / 2, s, null, 1);
  msDrawOpen(x0 + s * 2, y0, s, '#DC2626'); msDrawMine(x0 + s * 2.5, y0 + s / 2, s);
  msDrawOpen(x0 + s * 3, y0, s, null, 2);   msDrawNumber(x0 + s * 3.5, y0 + s / 2, s, 2, 1);
  msDrawTile(x0 + s * 4, y0, s, false, 4);
  if (msPreviewing) return;

  g.textAlign = 'center';
  g.fillStyle = MS_FOAM;
  g.font = '12px monospace';
  g.fillText('TAP TO PING  ·  HOLD TO DROP A BUOY', MS_W / 2, 304);
  g.fillText('NUMBERS COUNT THE MINES NEXT DOOR', MS_W / 2, 322);
  g.fillStyle = MS_YELLOW;
  g.font = 'bold 13px monospace';
  g.fillText('SWEEP A SECTOR · DIVE DEEPER', MS_W / 2, 352);
  g.fillStyle = MS_GREY;
  g.font = '11px monospace';
  g.fillText('THREE HULL PLATES · HOW DEEP CAN YOU GO?', MS_W / 2, 372);
  // a row of what's waiting down there
  const icons = [['PEARLS', 200], ['AIR', 300], ['SONAR', 400], ['REEF', 500], ['JAMMERS', 600]];
  g.font = '9px monospace'; g.fillStyle = MS_DIM;
  g.fillText(icons.map(([n, m]) => `${n} ${m}`).join(' · '), MS_W / 2, 398);

  const r = MS_BTN_PLAY, pulse = 1 + Math.sin(msClock / 260) * 0.02;
  g.save();
  g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(pulse, pulse); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
  g.fillStyle = MS_FOAM;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = MS_BG; g.font = 'bold 30px monospace'; g.textBaseline = 'middle';
  g.fillText('DIVE  ▼', r.x + r.w / 2, r.y + r.h / 2 + 2);
  g.textBaseline = 'alphabetic';
  g.restore();

  const best = msScores[0];
  g.fillStyle = best ? MS_YELLOW : MS_DIM;
  g.font = 'bold 13px monospace';
  g.fillText(best ? `BEST ${msFmt(best.score)} · ${best.name} · ${best.depth} M` : 'NO DIVES LOGGED YET', MS_W / 2, 540);
}

function msDrawNameEntry() {
  const g = msCtx;
  g.textAlign = 'center';
  g.fillStyle = MS_YELLOW;
  g.font = 'bold 24px monospace';
  g.fillText('NEW RECORD, CAPTAIN!', MS_W / 2, 160);
  g.fillStyle = MS_FOAM;
  g.font = 'bold 34px monospace';
  g.fillText(msFmt(msLastScore), MS_W / 2, 208);
  g.fillStyle = MS_GREY;
  g.font = '12px monospace';
  g.fillText(`REACHED ${msLastDepth} M`, MS_W / 2, 234);
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
  const g = msCtx;
  g.textAlign = 'center';
  g.fillStyle = MS_FOAM;
  g.font = 'bold 24px monospace';
  g.fillText('MISSION DEBRIEF', MS_W / 2, 118);
  g.fillStyle = MS_GREY;
  g.font = '13px monospace';
  g.fillText(`THIS DIVE: ${msFmt(msLastScore)} · ${msLastDepth} M`, MS_W / 2, 150);
  if (msScores.length === 0) {
    g.fillStyle = MS_DIM;
    g.font = '14px monospace';
    g.fillText('NO DIVES LOGGED', MS_W / 2, 250);
  }
  msScores.forEach((e, i) => {
    const y = 214 + i * 50, me = i === msLastEntry;
    if (me) { g.fillStyle = 'rgba(125,227,240,0.12)'; g.fillRect(40, y - 26, 280, 42); }
    g.fillStyle = i === 0 ? MS_YELLOW : MS_FOAM;
    g.font = 'bold 20px monospace';
    g.textAlign = 'left';
    g.fillText(`${i + 1}. ${e.name}`, 56, y);
    g.textAlign = 'right';
    g.fillText(msFmt(e.score), MS_W - 56, y);
    g.fillStyle = MS_DIM; g.font = '10px monospace';
    g.fillText(`${e.depth} M`, MS_W - 56, y + 13);
  });
  msDrawButton(MS_BTN_LB_AGAIN, 'DIVE AGAIN', 20);
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
    if (msHit(MS_BTN_PLAY, p)) { MS_SOUND.select(); msEnterState('playing'); }
    return;
  }

  if (['playing', 'cleared', 'diving', 'dying', 'lost'].includes(msState)) {
    if (msHit(MS_BTN_MENU, p)) { MS_SOUND.select(); msEnterState('attract'); return; }
    if (msState === 'lost') { msAfterLose(); return; }   // tap the wreck to skip to the scores
    if (msState !== 'playing') return;
    if (msHit(MS_BTN_DIG, p))  { if (msMode !== 'dig')  { msMode = 'dig';  MS_SOUND.select(); } return; }
    if (msHit(MS_BTN_FLAG, p)) { if (msMode !== 'flag') { msMode = 'flag'; MS_SOUND.select(); } return; }
    const idx = msCellAt(p);
    if (idx < 0 || msCells[idx].rock) return;
    msLastTapY = p.y;
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
    if (msHit(MS_BTN_OK, p)) msConfirmName();
    return;
  }

  if (msState === 'leaderboard') {
    if (msHit(MS_BTN_LB_AGAIN, p)) { MS_SOUND.select(); msEnterState('playing'); return; }
    if (msHit(MS_BTN_LB_MENU, p))  { MS_SOUND.select(); msEnterState('attract'); }
  }
}

function msConfirmName() {
  MS_SOUND.select();
  msSubmitScore(msInitials.map(i => MS_ALPHABET[i]).join(''), msLastScore, msLastDepth);
  msEnterState('leaderboard');
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
        if (idx >= 0 && !msCells[idx].open && !msCells[idx].rock) msAct(idx, 'flag');
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
    if (!visible()) return;
    if (msState === 'attract' && e.key === 'Enter') { e.preventDefault(); MS_SOUND.select(); msEnterState('playing'); return; }
    if (msState === 'nameEntry' && e.key === 'Enter') { e.preventDefault(); msConfirmName(); return; }
    if (msState !== 'playing') return;
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
  // the air — it only drains inside msUpdate) and drop any half-finished
  // press, since its pointerup may never arrive.
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

// The ARC_CABINETS entry's stop() — resetToLobby() and the ✕ both call it.
function resetArcadeMinesweeper() {
  if (msRafHandle) { cancelAnimationFrame(msRafHandle); msRafHandle = null; }
  msState   = 'attract';
  msPress   = null;
  msPtrId   = null;
  msEvents  = [];
  msChain   = [];
  msTimerOn = false;
  msShake   = 0;
  msFreeze  = 0;
  msFlash   = 0;
  msParts   = [];
  msSonar   = [];
  msPops    = [];
  msShout   = null;
  msBanner  = null;
  msCoach   = null;
  msCoachQ  = [];
  msPrevBoard = null;
  // msScores and msCoachSeen are NOT cleared — see their declarations above.
}

// ── The Arcade Floor's preview (SW v259) ─────────────────────────────────────
// js/lobby/arcade.js drives it: begin() borrows the room's canvas, step()/draw()
// run the attract scene with its card off, end() hands everything back — the
// next msStart() takes its own canvas again. No RAF of its own here.
let msPreviewing = false;
function msPreview() {
  return {
    w: MS_W, h: MS_H, fy: 0.15,   // the anchor sticker and the five-square strip over the sea
    begin(canvas, ctx) {
      resetArcadeMinesweeper(); msCanvas = canvas; msCtx = ctx; msPreviewing = true;
      msEnterState('attract');
      if (msRafHandle) { cancelAnimationFrame(msRafHandle); msRafHandle = null; }
    },
    step: (dt) => msUpdate(dt),
    draw: () => msDraw(),
    end() { resetArcadeMinesweeper(); msPreviewing = false; msCanvas = null; msCtx = null; },
  };
}
// The session board's top score, for the room's HI line — null until someone has played.
function msBest() { return msScores.length ? msScores[0].score.toLocaleString('en-AU') : null; }

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-minesweeper').style.display !== 'none') msResize();
});
