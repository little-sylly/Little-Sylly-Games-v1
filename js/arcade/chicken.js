// ═══════════════════════════════════════════════════════════════════════════
// chicken.js — ARCADE CABINET 03. Endless lane-hopper (Frogger lineage),
// procedural canvas art. "Why did the chicken cross the road?"
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Prototype built standalone in /arcade; mirrors minesweeper.js conventions so
// it can drop into the suite beside it.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//
// Integration notes
//  - Prefix is `ck`. Screen id: screen-arcade-chicken. DOM: #ck-stage (the
//    pointer target, touch-action:none) wrapping #ck-canvas, plus #btn-ck-exit.
//  - engine.js resetToLobby() should call resetArcadeChicken() alongside
//    resetArcade() and resetArcadeMinesweeper().
//  - There are NO setTimeouts in this file. Jingles and every other delayed
//    effect are scheduled against ckClock and run from the RAF loop, so
//    cancelling the loop IS the whole teardown.
//
// How the world works
//  - The world is a stack of 40px rows, row 0 is the start, rows go UP the
//    screen. Each row is one lane: grass (trees block you), road (cars squash
//    you), river (ride logs / lily pads or splash) or rail (a warning light,
//    then a very fast train).
//  - Rows are generated lazily just above the screen and dropped once they
//    fall off the bottom, so a run can go on forever.
//  - The camera follows the chicken forward and also creeps on its own once
//    the run starts. Dawdle until you drop off the bottom and the eagle gets you.
//  - Score = the furthest row reached.
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const CK_W = 360;
const CK_H = 640;
const CK_T = 40;              // one tile / one row
const CK_COLS = CK_W / CK_T;  // 9 columns

const CK_TITLE = 'OTHER SIDE';   // working title — the one place to rename the cabinet

// ── Tuning ───────────────────────────────────────────────────────────────────
const CK_HOP_MS        = 120;    // one hop, start to landing
const CK_FOLLOW_ROWS   = 4;      // the camera keeps the chicken this many rows above the bottom
const CK_CREEP_MIN     = 0.36;   // rows/sec the camera creeps on its own at the start…
const CK_CREEP_MAX     = 0.75;   // …rising to this by CK_RAMP_ROWS
const CK_RAMP_ROWS     = 250;    // difficulty is fully ramped by this row
const CK_EAGLE_LINE    = -0.3;   // chicken row minus camera row below this → eagle
const CK_SWIPE_PX      = 22;     // logical px of drag before a press counts as a swipe
const CK_LOG_EDGE      = 6;      // a log carrying you closer than this to the screen edge drops you in
const CK_WRAP          = 180;    // off-screen run-out each side; must be ≥ the longest item (4-tile log = 160)
const CK_RING          = CK_W + CK_WRAP * 2;   // lane items live on a loop this long
const CK_TRAIN_SPEED   = 1100;   // px/sec — you can't outrun it, only get off the tracks
const CK_TRAIN_WARN_MS = 1350;
const CK_DYING_MS      = 1600;   // death beat before scores
const CK_TOP_N         = 5;
const CK_CHICK_SCALE   = 1.15;   // the drawing is ~24px wide; this makes it fill its tile a bit more

// ── Palette ──────────────────────────────────────────────────────────────────
// Menus use the arcade's dark screen and green phosphor (same as ms/ap); the
// world itself is bright and toy-like so a kid can read every lane at a glance.
const CK_BG     = '#05070D';
const CK_GREEN  = '#4ADE80';
const CK_YELLOW = '#FDE68A';
const CK_GREY   = '#94A3B8';
const CK_DIM    = '#64748B';

const CK_GRASS_A    = '#8ED65E';
const CK_GRASS_B    = '#86CE56';
const CK_GRASS_EDGE = '#5E9E3B';   // the grass's front face where it drops to road/water/rail
const CK_ROAD       = '#5B6270';
const CK_CURB       = '#9CA3AF';
const CK_WATER      = '#3DA5F4';
const CK_WATER_HI   = '#86CBFA';
const CK_GRAVEL     = '#A39382';
const CK_SLEEPER    = '#6D4C33';
const CK_CAR_COLOURS = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8', '#F472B6', '#FB923C'];
const CK_FLOWERS     = ['#FDE68A', '#F9A8D4', '#FFFFFF', '#C4B5FD'];

// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// AP_SOUND / MS_SOUND. Inherits isMuted and masterVolume for free.
const CK_SOUND = {
  hop:       () => playSecretBeep(392),
  bump:      () => playSecretBeep(147),   // walked into a tree
  log:       () => playSecretBeep(262),   // landed on a log or pad
  milestone: () => playSecretBeep(988),   // every 25 rows
  squash:    () => playSecretBeep(110),
  splash:    () => playSecretBeep(196),
  train:     () => playSecretBeep(82),
  ding:      () => playSecretBeep(1318),  // level-crossing bell
  eagle:     () => playSecretBeep(1568),
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
};
const CK_OVER_JINGLE = [392, 330, 262];

// What the big word says for each way to go
const CK_DEATH_WORDS = { squash: 'SPLAT!', splash: 'SPLOOSH!', train: 'CHOO CHOO!', eagle: 'SNATCHED!' };

// ── Layout (logical px) ──────────────────────────────────────────────────────
const CK_BTN_PLAY     = { x: 40,  y: 540, w: 280, h: 64 };
const CK_SLOTS = [
  { x:  60, y: 300, w: 66, h: 84 },
  { x: 147, y: 300, w: 66, h: 84 },
  { x: 234, y: 300, w: 66, h: 84 },
];
const CK_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const CK_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const CK_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

// ── Runtime state ────────────────────────────────────────────────────────────
let ckCanvas = null;
let ckCtx    = null;
let ckRaf    = null;     // TIMER — cancel in every teardown (logic-engine.md)
let ckLastT  = 0;
let ckState  = 'attract';   // attract | playing | dying | nameEntry | leaderboard
let ckClock  = 0;           // ms of un-paused time. Every delayed effect is scheduled against this.

let ckRows   = new Map();   // row index → lane object
let ckGenTop = 0;           // highest row generated so far
let ckGen    = null;        // generator: { zone, left, k }
let ckCam    = 0;           // row index (float) sitting at the bottom edge of the screen
let ckCreeping = false;     // the camera only starts creeping after the first hop

let ckChick  = null;        // { row, x, face, hop, onLog, alive, bumpAt }
let ckQueued = null;        // one buffered hop, so fast tappers don't lose inputs mid-hop
let ckScore  = 0;
let ckLastScore = 0;
let ckScorePopAt = -1e9;
let ckFresh  = false;       // a run that hasn't hopped yet — PLAY reuses it instead of rebuilding
let ckDeath  = null;        // { kind, at, x, row }

let ckParts  = [];
let ckEvents = [];          // [{ at, fn }] — ckClock-scheduled effects (replaces setTimeout)
let ckShake  = 0;           // seconds remaining

// The single pointer currently allowed to act on #ck-stage — null when free.
// A second finger is ignored entirely (same rule as apPtrId / msPtrId).
let ckPtrId = null;
// The live press: { x, y, state, used }. A swipe hops as soon as it passes
// CK_SWIPE_PX; a press that never travelled that far is a tap, which hops
// forward on release. `state` is the ckState when the finger went down, so the
// press that tapped PLAY can't also hop the chicken.
let ckPress = null;

// Session leaderboard, highest first. Deliberately NOT cleared by
// resetArcadeChicken() — scores last the afternoon, not forever.
let ckBoard = [];

const CK_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let ckInitials = [0, 0, 0];

// ── Small helpers ────────────────────────────────────────────────────────────
function ckRandInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function ckClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ckPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function ckDifficulty(r) { return ckClamp(r / CK_RAMP_ROWS, 0, 1); }
function ckColX(col) { return col * CK_T + CK_T / 2; }
function ckXCol(x) { return Math.round((x - CK_T / 2) / CK_T); }

function ckWeighted(opts) {
  const total = opts.reduce((s, o) => s + o[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of opts) { r -= w; if (r <= 0) return v; }
  return opts[opts.length - 1][0];
}

function ckShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Darken (f < 1) or lighten (f > 1) a #rrggbb colour.
function ckShade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => ckClamp(Math.round(((n >> s) & 255) * f), 0, 255);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ── Entry ────────────────────────────────────────────────────────────────────
function ckStart() {
  ckCanvas = document.getElementById('ck-canvas');
  ckCtx    = ckCanvas.getContext('2d');
  showScreen('screen-arcade-chicken');
  ckResize();
  ckEnterState('attract');
}

function ckEnterState(next) {
  // The attract screen shows a live, fresh world; PLAY then just starts
  // hopping in it, so there's no jump between menu and game.
  if (next === 'attract') ckNewRun();
  if (next === 'playing' && !ckFresh) ckNewRun();
  ckState  = next;
  // Only the death beat shakes; a state change can arrive mid-shake.
  ckShake  = 0;
  ckQueued = null;
  if (!ckRaf) { ckLastT = 0; ckRaf = requestAnimationFrame(ckLoop); }
}

function ckNewRun() {
  ckRows   = new Map();
  ckGen    = { zone: 'start', left: 0, k: 0 };
  ckGenTop = -10;
  ckCam    = -CK_FOLLOW_ROWS;
  ckChick  = { row: 0, x: ckColX(4), face: 'up', hop: null, onLog: false, alive: true, bumpAt: -1e9 };
  ckQueued = null;
  ckScore  = 0;
  ckScorePopAt = -1e9;
  ckCreeping = false;
  ckDeath  = null;
  ckParts  = [];
  ckEvents = [];
  ckFresh  = true;
  ckEnsureRows();
}

// ── World generation ─────────────────────────────────────────────────────────
// Rows come in zones (a run of grass, a run of road…). Zones never repeat
// back to back, so there's always a change of rhythm.
function ckEnsureRows() {
  const top = Math.ceil(ckCam + CK_H / CK_T) + 3;
  while (ckGenTop < top) {
    ckGenTop++;
    ckRows.set(ckGenTop, ckMakeRow(ckGenTop));
  }
  for (const r of ckRows.keys()) if (r < ckCam - 3) ckRows.delete(r);
}

function ckMakeRow(r) {
  if (r <= 2) return ckGrassRow(r, r <= -2 ? 'wall' : r === -1 ? 'back' : 'start');
  if (ckGen.left <= 0) ckPickZone(r);
  const k = ckGen.k++;
  ckGen.left--;
  if (ckGen.zone === 'road')  return ckRoadRow(r);
  if (ckGen.zone === 'river') return ckRiverRow(r, k);
  if (ckGen.zone === 'rail')  return ckRailRow(r);
  return ckGrassRow(r, 'normal');
}

function ckPickZone(r) {
  const d = ckDifficulty(r), prev = ckGen.zone;
  let zone;
  if (prev === 'start') {
    zone = 'road';
  } else {
    const opts = [];
    if (prev !== 'grass') opts.push(['grass', 4 - d * 1.6]);
    if (prev !== 'road')  opts.push(['road', 3.5]);
    if (prev !== 'river') opts.push(['river', 2 + d]);
    if (prev !== 'rail' && r > 15) opts.push(['rail', 0.7 + d * 0.7]);
    zone = ckWeighted(opts);
  }
  let len;
  if (prev === 'start')        len = 2;   // a gentle first road
  else if (zone === 'grass')   len = ckRandInt(1, d < 0.5 ? 3 : 2);
  else if (zone === 'road')    len = ckRandInt(1, 2 + Math.round(d * 3));
  else if (zone === 'river')   len = ckRandInt(1, 2 + Math.round(d * 2));
  else                         len = ckRandInt(1, d > 0.4 ? 2 : 1);
  ckGen = { zone, left: len, k: 0 };
}

// Grass. Trees block a hop. To guarantee a way through any stack of grass
// rows, each row carries a pathCol, and the cells between the previous
// row's pathCol and this one's are kept clear — so there's always a walk
// from one row's path to the next. Lily-pad rows hand on a pad's column the
// same way. After a road, rail or log lane the chicken can line up anywhere,
// so no promise is needed.
function ckGrassRow(r, mode) {
  const trees = new Array(CK_COLS).fill(false);
  const kinds = Array.from({ length: CK_COLS }, () => ckRandInt(0, 3));   // 0 bush · 1 tree · 2 tall · 3 rock
  let pathCol = 4;
  if (mode === 'wall') {
    trees.fill(true);
    for (let c = 0; c < CK_COLS; c++) kinds[c] = ckRandInt(1, 2);   // a proper forest behind the start
  } else if (mode === 'back') {
    trees[0] = trees[1] = trees[7] = trees[8] = true;
  } else if (mode === 'start') {
    trees[0] = trees[8] = true;
  } else {
    const prev = ckRows.get(r - 1);
    const prevPath = prev && (prev.type === 'grass' || prev.lily) ? prev.pathCol : null;
    const d = ckDifficulty(r);
    pathCol = prevPath === null ? ckRandInt(0, CK_COLS - 1)
                                : ckClamp(prevPath + ckRandInt(-2, 2), 0, CK_COLS - 1);
    const n = ckRandInt(1, 3 + Math.round(d));
    for (let k = 0; k < n; k++) trees[ckRandInt(0, CK_COLS - 1)] = true;
    const lo = prevPath === null ? pathCol : Math.min(prevPath, pathCol);
    const hi = prevPath === null ? pathCol : Math.max(prevPath, pathCol);
    for (let c = lo; c <= hi; c++) trees[c] = false;
  }
  const decor = [];
  for (let k = ckRandInt(0, 3); k > 0; k--) {
    decor.push({ x: ckRandInt(4, CK_W - 8), y: ckRandInt(6, 30), c: ckPick(CK_FLOWERS) });
  }
  return { r, type: 'grass', trees, kinds, pathCol, decor };
}

// Lays items round a loop of CK_RING px: picks items until they'd fill it at
// the average gap, then shares the leftover space out as random gaps that are
// never smaller than minGap. Spacing is fixed for the lane's life because
// everything in a lane moves at one speed and wraps by exactly CK_RING.
function ckRingItems(make, minGap, avgGap) {
  const items = [];
  let used = 0;
  for (;;) {
    const it = make();
    if (items.length && used + it.w + avgGap > CK_RING) break;
    items.push(it);
    used += it.w + avgGap;
  }
  const free = CK_RING - items.reduce((s, it) => s + it.w, 0);
  const spare = Math.max(0, free - items.length * minGap);
  const weights = items.map(() => 0.6 + Math.random() * 0.8);
  const wsum = weights.reduce((s, w) => s + w, 0);
  let cur = Math.random() * CK_RING;
  items.forEach((it, i) => {
    it.x = (cur % CK_RING) - CK_WRAP;
    cur += it.w + minGap + spare * weights[i] / wsum;
  });
  return items;
}

function ckRoadRow(r) {
  const d = ckDifficulty(r);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const truckLane = Math.random() < 0.3;
  const speed = (45 + d * 95) * (0.8 + Math.random() * 0.5) * (truckLane ? 0.75 : 1);
  const items = ckRingItems(() => {
    const truck = truckLane && Math.random() < 0.7;
    const colour = ckPick(CK_CAR_COLOURS);
    return { w: truck ? 96 : 56, kind: truck ? 'truck' : 'car', colour,
             dark: ckShade(colour, 0.68), light: ckShade(colour, 1.18) };
  }, 90 - d * 20, 190 - d * 70);
  return { r, type: 'road', dir, speed, items };
}

// River. Consecutive log lanes flow opposite ways. A lily-pad lane (still
// pads, no current) can only follow a log lane — never the first lane of a
// river, and never two in a row, because still pads that don't line up would
// be a dead end.
function ckRiverRow(r, k) {
  const prev = ckRows.get(r - 1);
  const d = ckDifficulty(r);
  if (k > 0 && prev && prev.type === 'river' && !prev.lily && Math.random() < 0.35) {
    const cols = ckShuffle([...Array(CK_COLS).keys()]).slice(0, ckRandInt(3, 5));
    const items = cols.map(c => ({ x: c * CK_T, w: CK_T, kind: 'pad', flower: Math.random() < 0.3 }));
    return { r, type: 'river', lily: true, dir: 0, speed: 0, items, pathCol: cols[0] };
  }
  const dir = prev && prev.type === 'river' && prev.dir ? -prev.dir : (Math.random() < 0.5 ? -1 : 1);
  const speed = (32 + d * 48) * (0.85 + Math.random() * 0.35);
  const maxLen = d < 0.5 ? 4 : 3;
  const items = ckRingItems(() => {
    const len = ckRandInt(2, maxLen);
    return { w: len * CK_T, kind: 'log' };
  }, 30, 60 + d * 50);
  return { r, type: 'river', lily: false, dir, speed, items };
}

function ckRailRow(r) {
  return { r, type: 'rail', dir: Math.random() < 0.5 ? -1 : 1,
           phase: 'wait', t: 1500 + Math.random() * 4500, dingT: 0,
           trainX: 0, trainW: 0, trainN: 0 };
}

// ── Loop ─────────────────────────────────────────────────────────────────────
function ckLoop(now) {
  ckRaf = null;
  if (!ckLastT) ckLastT = now;
  const dt = Math.min((now - ckLastT) / 1000, 0.05);   // a backgrounded tab can't bank time
  ckLastT = now;

  // Freeze behind the global sound overlay, same as asherplane — it covers
  // the stage, and nothing should run over a child who can't see it.
  const so     = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  if (!paused) ckUpdate(dt);
  ckDraw();
  if (!ckRaf) ckRaf = requestAnimationFrame(ckLoop);
}

function ckUpdate(dt) {
  const ms = dt * 1000;
  ckClock += ms;
  if (ckShake > 0) ckShake = Math.max(0, ckShake - dt);

  for (const row of ckRows.values()) ckUpdateRow(row, dt);

  if (ckState === 'playing') {
    ckUpdateChick(dt);
    if (ckState === 'playing') ckUpdateCamera(dt);
    ckEnsureRows();
  }

  if (ckState === 'dying' && ckClock - ckDeath.at >= CK_DYING_MS) ckAfterDeath();

  ckParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.spin) p.rot += p.spin * dt;
    if (p.grow) p.r += p.grow * dt;
    p.life -= dt;
  });
  ckParts = ckParts.filter(p => p.life > 0);

  if (ckEvents.length) {
    const due = ckEvents.filter(e => ckClock >= e.at);
    ckEvents  = ckEvents.filter(e => ckClock <  e.at);
    due.forEach(e => e.fn());
  }
}

function ckRowVisible(r) { return r >= ckCam - 1 && r <= ckCam + CK_H / CK_T; }

// Sounds from the world (bells, trains) only play during a run — the attract
// screen behind the menu should be seen, not heard.
function ckWorldAudible() { return ckState === 'playing' || ckState === 'dying'; }

function ckUpdateRow(row, dt) {
  if (row.items && row.speed) {
    const v = row.dir * row.speed * dt;
    for (const it of row.items) {
      it.x += v;
      if (it.x > CK_W + CK_WRAP) it.x -= CK_RING;
      if (it.x + it.w < -CK_WRAP) it.x += CK_RING;
    }
  }
  if (row.type !== 'rail') return;
  const ms = dt * 1000;
  if (row.phase === 'wait') {
    row.t -= ms;
    if (row.t <= 0) { row.phase = 'warn'; row.t = CK_TRAIN_WARN_MS; row.dingT = 0; }
  } else if (row.phase === 'warn') {
    row.t -= ms;
    row.dingT -= ms;
    if (row.dingT <= 0) {
      row.dingT = 260;
      if (ckWorldAudible() && ckRowVisible(row.r)) CK_SOUND.ding();
    }
    if (row.t <= 0) {
      row.phase  = 'pass';
      row.trainN = ckRandInt(3, 6);
      row.trainW = 70 + row.trainN * 80;
      row.trainX = row.dir > 0 ? -row.trainW : CK_W;
      if (ckWorldAudible() && ckRowVisible(row.r)) CK_SOUND.train();
    }
  } else {
    row.trainX += row.dir * CK_TRAIN_SPEED * dt;
    if (row.dir > 0 ? row.trainX > CK_W : row.trainX + row.trainW < 0) {
      row.phase = 'wait';
      row.t = 2500 + Math.random() * 5000;
    }
  }
}

// ── The chicken ──────────────────────────────────────────────────────────────
// Where the chicken is right now, mid-hop included.
function ckChickPos() {
  const c = ckChick, h = c.hop;
  if (!h) return { row: c.row, vr: c.row, x: c.x, lift: 0 };
  const t = Math.min(1, h.t);
  return { row: t < 0.5 ? h.fromRow : h.toRow,          // which lane it can be hit in
           vr: h.fromRow + (h.toRow - h.fromRow) * t,   // where it's drawn
           x: h.fromX + (h.toX - h.fromX) * t,
           lift: Math.sin(Math.PI * t) * 10 };
}

function ckTryHop(dir) {
  const c = ckChick;
  if (ckState !== 'playing' || !c.alive) return;
  if (c.hop) { ckQueued = dir; return; }
  c.face = dir;
  const toRow = c.row + (dir === 'up' ? 1 : dir === 'down' ? -1 : 0);
  let toX = c.x + (dir === 'left' ? -CK_T : dir === 'right' ? CK_T : 0);
  const dest = ckRows.get(toRow);
  if (!dest) return;
  if (dest.type === 'river') {
    // Over water the chicken keeps its exact x — logs don't sit on the grid.
    if (toX < 10 || toX > CK_W - 10) { ckBump(); return; }
  } else {
    // On land it snaps back onto the grid, which is how you step off a log.
    const col = ckXCol(toX);
    if (col < 0 || col >= CK_COLS) { ckBump(); return; }
    if (dest.type === 'grass' && dest.trees[col]) { ckBump(); return; }
    toX = ckColX(col);
  }
  c.hop   = { fromRow: c.row, toRow, fromX: c.x, toX, t: 0 };
  c.onLog = false;
  ckFresh = false;
  ckCreeping = true;
  CK_SOUND.hop();
}

function ckBump() {
  ckChick.bumpAt = ckClock;
  CK_SOUND.bump();
}

function ckLand() {
  const c = ckChick, h = c.hop;
  c.hop = null;
  c.row = h.toRow;
  c.x   = h.toX;
  const row = ckRows.get(c.row);
  if (row && row.type === 'river') {
    // A few px of grace either end of a log — near enough is good enough.
    const it = row.items.find(it => c.x >= it.x - 4 && c.x <= it.x + it.w + 4);
    if (!it) { ckDie('splash'); return; }
    const n = Math.round(it.w / CK_T);
    const slot = ckClamp(Math.floor((c.x - it.x) / CK_T), 0, n - 1);
    c.x = it.x + slot * CK_T + CK_T / 2;   // settle onto the middle of a log section
    c.onLog = row.speed > 0;
    CK_SOUND.log();
  }
  if (c.row > ckScore) {
    ckScore = c.row;
    ckScorePopAt = ckClock;
    if (ckScore % 25 === 0) CK_SOUND.milestone();
  }
  if (ckQueued) {
    const q = ckQueued;
    ckQueued = null;
    ckTryHop(q);
  }
}

function ckUpdateChick(dt) {
  const c = ckChick;
  if (c.hop) {
    c.hop.t += dt * 1000 / CK_HOP_MS;
    if (c.hop.t >= 1) { ckLand(); if (!c.alive) return; }
  } else if (c.onLog) {
    const row = ckRows.get(c.row);
    c.x += row.dir * row.speed * dt;
    if (c.x < CK_LOG_EDGE || c.x > CK_W - CK_LOG_EDGE) { ckDie('splash'); return; }
  }
  ckCheckHit();
}

function ckCheckHit() {
  const p = ckChickPos();
  const row = ckRows.get(p.row);
  if (!row) return;
  const L = p.x - 11, R = p.x + 11;   // the chicken's body, a little forgiving
  if (row.type === 'road') {
    for (const it of row.items) {
      if (R > it.x + 3 && L < it.x + it.w - 3) { ckDie('squash'); return; }
    }
  } else if (row.type === 'rail' && row.phase === 'pass') {
    if (R > row.trainX && L < row.trainX + row.trainW) ckDie('train');
  }
}

function ckCreepRate() {
  return CK_CREEP_MIN + (CK_CREEP_MAX - CK_CREEP_MIN) * ckDifficulty(ckScore);
}

function ckUpdateCamera(dt) {
  const p = ckChickPos();
  const target = p.vr - CK_FOLLOW_ROWS;
  if (target > ckCam) ckCam += (target - ckCam) * Math.min(1, dt * 5);
  if (ckCreeping) ckCam += ckCreepRate() * dt;
  if (p.vr - ckCam < CK_EAGLE_LINE) ckDie('eagle');
}

function ckDie(kind) {
  const c = ckChick, p = ckChickPos();
  c.alive = false;
  c.hop   = null;
  c.onLog = false;
  c.row   = p.row;
  c.x     = p.x;
  ckDeath = { kind, at: ckClock, x: p.x, vr: p.vr };
  ckLastScore = ckScore;
  ckQueued = null;
  ckPress  = null;

  const cx = p.x, cy = ckRowTop(p.vr) + CK_T / 2;
  if (kind === 'squash') {
    CK_SOUND.squash();
    ckShake = 0.25;
    ckFeathers(cx, cy, 10);
  } else if (kind === 'train') {
    CK_SOUND.train();
    ckShake = 0.45;
    ckFeathers(cx, cy, 26);
  } else if (kind === 'splash') {
    CK_SOUND.splash();
    ckEvents.push({ at: ckClock + 110, fn: () => playSecretBeep(147) });
    ckSplash(cx, cy);
  } else {
    CK_SOUND.eagle();
    ckEvents.push({ at: ckClock + 480, fn: () => { CK_SOUND.eagle(); ckFeathers(cx, cy, 8); } });
  }
  CK_OVER_JINGLE.forEach((f, k) => ckEvents.push({ at: ckClock + 650 + k * 140, fn: () => playSecretBeep(f) }));

  // Deliberately NOT ckEnterState(): that zeroes ckShake, and the shake is
  // the point of this state. The RAF loop is already running.
  ckState = 'dying';
}

function ckAfterDeath() {
  if (ckQualifies(ckLastScore)) {
    ckInitials = [0, 0, 0];
    CK_SOUND.highScore();
    ckEnterState('nameEntry');
  } else {
    ckEnterState('leaderboard');
  }
}

// ── Particles ────────────────────────────────────────────────────────────────
function ckFeathers(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 140;
    ckParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, grav: 60, drag: 2.2,
                   rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 8,
                   life: 0.9 + Math.random() * 0.6, max: 1.5, kind: 'feather',
                   colour: Math.random() < 0.8 ? '#FFFFFF' : '#E7E5E4' });
  }
}

function ckSplash(x, y) {
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * (0.1 + Math.random() * 0.8), s = 60 + Math.random() * 120;
    ckParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 420,
                   life: 0.5 + Math.random() * 0.3, max: 0.8, kind: 'drop',
                   colour: Math.random() < 0.5 ? '#FFFFFF' : CK_WATER_HI });
  }
  [0, 0.15].forEach(delay => ckParts.push({ x, y: y + 4, vx: 0, vy: 0, r: 4 - delay * 20, grow: 46,
                                            life: 0.8 - delay, max: 0.8, kind: 'ring' }));
}

// ── Session leaderboard — highest first ──────────────────────────────────────
function ckQualifies(score) {
  if (score <= 0) return false;
  if (ckBoard.length < CK_TOP_N) return true;
  return score > ckBoard[ckBoard.length - 1].score;
}

function ckSubmitScore(name, score) {
  ckBoard.push({ name, score });
  ckBoard.sort((a, b) => b.score - a.score);
  ckBoard = ckBoard.slice(0, CK_TOP_N);
}

// ── Drawing ──────────────────────────────────────────────────────────────────
// Top pixel of a row on screen. Rounding (a − k·40) rounds every row by the
// same amount, so neighbouring rows never open a hairline gap.
function ckRowTop(r) { return Math.round(CK_H - (r - ckCam + 1) * CK_T); }

function ckDraw() {
  const g = ckCtx;
  g.save();
  if (ckShake > 0) {
    g.translate((Math.random() - 0.5) * 48 * ckShake, (Math.random() - 0.5) * 48 * ckShake);
  }
  g.fillStyle = CK_BG;
  g.fillRect(-30, -30, CK_W + 60, CK_H + 60);

  ckDrawWorld();
  ckDrawParts();

  if (ckState === 'attract') {
    ckDrawAttract();
  } else if (ckState === 'playing' || ckState === 'dying') {
    ckDrawHud();
    if (ckState === 'dying') ckDrawDeathText();
  } else {
    g.fillStyle = 'rgba(5,7,13,0.86)';
    g.fillRect(-30, -30, CK_W + 60, CK_H + 60);
    if (ckState === 'nameEntry') ckDrawNameEntry();
    else ckDrawLeaderboard();
  }
  g.restore();
}

function ckDrawWorld() {
  const lo = Math.floor(ckCam) - 1;
  const hi = Math.ceil(ckCam + CK_H / CK_T) + 1;
  // Ground first, every row…
  for (let r = lo; r <= hi; r++) {
    const row = ckRows.get(r);
    if (row) ckDrawGround(row, ckRowTop(r));
  }
  // …then everything with height, from the top of the screen down, so a
  // nearer (lower) object overlaps the row behind it.
  const p = ckChickPos();
  const chickRow = Math.round(p.vr);
  for (let r = hi; r >= lo; r--) {
    const row = ckRows.get(r);
    if (!row) continue;
    const y = ckRowTop(r);
    const flat = !ckChick.alive && ckDeath && ckDeath.kind === 'squash';
    if (r === chickRow && flat) ckDrawChickenNow(p);   // under the car that got it
    ckDrawObjects(row, y);
    if (r === chickRow && !flat) ckDrawChickenNow(p);
  }
  if (ckDeath && ckDeath.kind === 'eagle') ckDrawEagleScene();
}

function ckDrawGround(row, y) {
  const g = ckCtx;
  if (row.type === 'grass') {
    g.fillStyle = row.r % 2 ? CK_GRASS_A : CK_GRASS_B;
    g.fillRect(0, y, CK_W, CK_T);
    g.fillStyle = 'rgba(0,0,0,0.035)';
    for (let c = (row.r & 1); c < CK_COLS; c += 2) g.fillRect(c * CK_T, y, CK_T, CK_T);
    row.decor.forEach(f => {
      g.fillStyle = f.c;
      g.fillRect(f.x, y + f.y, 3, 3);
      g.fillStyle = '#5E9E3B';
      g.fillRect(f.x + 1, y + f.y + 3, 1, 3);
    });
    const below = ckRows.get(row.r - 1);
    if (below && below.type !== 'grass') {   // grass sits a step above everything else
      g.fillStyle = CK_GRASS_EDGE;
      g.fillRect(0, y + CK_T - 5, CK_W, 5);
    }
  } else if (row.type === 'road') {
    g.fillStyle = CK_ROAD;
    g.fillRect(0, y, CK_W, CK_T);
    const above = ckRows.get(row.r + 1), below = ckRows.get(row.r - 1);
    if (above && above.type === 'road') {
      g.fillStyle = '#E5E7EB';
      for (let x = 10; x < CK_W; x += 40) g.fillRect(x, y - 1, 20, 3);
    } else {
      g.fillStyle = CK_CURB;
      g.fillRect(0, y, CK_W, 3);
    }
    if (!below || below.type !== 'road') {
      g.fillStyle = CK_CURB;
      g.fillRect(0, y + CK_T - 3, CK_W, 3);
    }
  } else if (row.type === 'river') {
    g.fillStyle = CK_WATER;
    g.fillRect(0, y, CK_W, CK_T);
    // Flow streaks drift with the current, so you can see which way a lane runs.
    g.fillStyle = CK_WATER_HI;
    const drift = row.speed ? ckClock * 0.001 * row.speed * row.dir * 0.6 : 0;
    for (let i = 0; i < 5; i++) {
      const base = (i * 83 + row.r * 37) % CK_W;
      const sx = ((base + drift) % CK_W + CK_W) % CK_W;
      g.fillRect(sx, y + (i % 2 ? 11 : 27), 16, 2);
    }
  } else if (row.type === 'rail') {
    g.fillStyle = CK_GRAVEL;
    g.fillRect(0, y, CK_W, CK_T);
    g.fillStyle = CK_SLEEPER;
    for (let x = 5; x < CK_W; x += 20) g.fillRect(x, y + 5, 9, 30);
    g.fillStyle = '#64748B';
    g.fillRect(0, y + 13, CK_W, 2);
    g.fillRect(0, y + 29, CK_W, 2);
    g.fillStyle = '#E2E8F0';
    g.fillRect(0, y + 10, CK_W, 3);
    g.fillRect(0, y + 26, CK_W, 3);
  }
}

function ckDrawObjects(row, y) {
  if (row.type === 'grass') {
    for (let c = 0; c < CK_COLS; c++) if (row.trees[c]) ckDrawTree(c * CK_T, y, row.kinds[c]);
  } else if (row.type === 'road') {
    row.items.forEach(it => {
      if (it.x > CK_W || it.x + it.w < 0) return;
      if (it.kind === 'truck') ckDrawTruck(it, y, row.dir);
      else ckDrawCar(it, y, row.dir);
    });
  } else if (row.type === 'river') {
    row.items.forEach(it => {
      if (it.x > CK_W || it.x + it.w < 0) return;
      if (it.kind === 'pad') ckDrawPad(it, y);
      else ckDrawLog(it, y);
    });
  } else if (row.type === 'rail') {
    ckDrawSignal(row, y);
    if (row.phase === 'pass') ckDrawTrain(row, y);
  }
}

// Chunky toy trees: a top face and a darker front face give them height.
function ckDrawTree(x, y, kind) {
  const g = ckCtx;
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fillRect(x + 5, y + 24, 30, 12);
  if (kind === 3) {                                         // rock
    g.fillStyle = '#6B7280'; g.fillRect(x + 8, y + 20, 24, 12);
    g.fillStyle = '#A1A1AA'; g.fillRect(x + 8, y + 9, 24, 13);
    g.fillStyle = '#D4D4D8'; g.fillRect(x + 11, y + 11, 8, 4);
    return;
  }
  if (kind === 0) {                                         // bush
    g.fillStyle = '#2F7D32'; g.fillRect(x + 5, y + 20, 30, 12);
    g.fillStyle = '#47A84B'; g.fillRect(x + 5, y + 6, 30, 16);
    g.fillStyle = '#6CC46F'; g.fillRect(x + 9, y + 9, 8, 5);
    return;
  }
  g.fillStyle = '#7C4A2D'; g.fillRect(x + 16, y + 20, 8, 14);   // trunk
  if (kind === 1) {                                         // tree
    g.fillStyle = '#2C7A36'; g.fillRect(x + 4, y + 8, 32, 14);
    g.fillStyle = '#3FA34D'; g.fillRect(x + 4, y - 10, 32, 20);
    g.fillStyle = '#62C46E'; g.fillRect(x + 8, y - 7, 10, 6);
  } else {                                                  // tall tree, two tiers
    g.fillStyle = '#25692F'; g.fillRect(x + 4, y + 6, 32, 14);
    g.fillStyle = '#34914A'; g.fillRect(x + 4, y - 8, 32, 16);
    g.fillStyle = '#2C7A36'; g.fillRect(x + 9, y - 12, 22, 6);
    g.fillStyle = '#3FA34D'; g.fillRect(x + 9, y - 26, 22, 16);
    g.fillStyle = '#62C46E'; g.fillRect(x + 12, y - 23, 7, 5);
  }
}

function ckDrawCar(it, y, dir) {
  const g = ckCtx, x = Math.round(it.x), w = it.w;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x + 3, y + 30, w - 6, 7);
  g.fillStyle = '#111827';
  g.fillRect(x + 7, y + 27, 11, 7);
  g.fillRect(x + w - 18, y + 27, 11, 7);
  g.fillStyle = it.dark;  g.fillRect(x, y + 20, w, 11);      // side
  g.fillStyle = it.colour; g.fillRect(x, y + 7, w, 15);      // top
  // Cabin sits a little back from the bonnet.
  const cw = Math.round(w * 0.48);
  const cx = Math.round(x + (w - cw) / 2 - dir * 4);
  g.fillStyle = '#334155'; g.fillRect(cx, y + 2, cw, 20);
  g.fillStyle = it.light;  g.fillRect(cx + 5, y + 1, cw - 10, 14);
  g.fillStyle = '#93C5FD';
  g.fillRect(dir > 0 ? cx + cw - 4 : cx, y + 4, 4, 16);     // windscreen faces the way it drives
  const fx = dir > 0 ? x + w - 3 : x, bx = dir > 0 ? x : x + w - 3;
  g.fillStyle = '#FEF08A'; g.fillRect(fx, y + 21, 3, 4); g.fillRect(fx, y + 9, 3, 4);
  g.fillStyle = '#EF4444'; g.fillRect(bx, y + 21, 3, 4);
}

function ckDrawTruck(it, y, dir) {
  const g = ckCtx, x = Math.round(it.x), w = it.w;
  const cabW = 28, cabX = dir > 0 ? x + w - cabW : x, boxX = dir > 0 ? x : x + cabW + 2;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x + 3, y + 30, w - 6, 7);
  g.fillStyle = '#111827';
  [x + 6, x + 22, x + w - 18].forEach(wx => g.fillRect(wx, y + 27, 11, 7));
  // box
  g.fillStyle = '#9CA3AF'; g.fillRect(boxX, y + 18, w - cabW - 2, 13);
  g.fillStyle = '#E5E7EB'; g.fillRect(boxX, y - 2, w - cabW - 2, 22);
  g.fillStyle = it.colour; g.fillRect(boxX, y + 22, w - cabW - 2, 3);
  // cab
  g.fillStyle = it.dark;   g.fillRect(cabX, y + 20, cabW, 11);
  g.fillStyle = it.colour; g.fillRect(cabX, y + 5, cabW, 17);
  g.fillStyle = '#93C5FD'; g.fillRect(dir > 0 ? cabX + cabW - 7 : cabX + 3, y + 7, 4, 13);
  g.fillStyle = '#FEF08A'; g.fillRect(dir > 0 ? cabX + cabW - 3 : cabX, y + 21, 3, 4);
}

function ckDrawLog(it, y) {
  const g = ckCtx, x = Math.round(it.x), w = it.w;
  g.fillStyle = 'rgba(8,47,73,0.28)'; g.fillRect(x + 3, y + 30, w - 6, 5);
  g.fillStyle = '#6B3F1F'; g.fillRect(x + 2, y + 20, w - 4, 10);
  g.fillStyle = '#9A6033'; g.fillRect(x + 2, y + 6, w - 4, 15);
  g.fillStyle = '#7C4A26';
  for (let bx = x + 12; bx < x + w - 20; bx += 26) g.fillRect(bx, y + 11, 12, 2);
  for (let bx = x + 24; bx < x + w - 14; bx += 26) g.fillRect(bx, y + 16, 8, 2);
  [x + 2, x + w - 9].forEach(ex => {
    g.fillStyle = '#D9A066'; g.fillRect(ex, y + 6, 7, 24);
    g.fillStyle = '#B07A45'; g.fillRect(ex + 2, y + 13, 3, 9);
  });
}

function ckDrawPad(it, y) {
  const g = ckCtx, cx = it.x + CK_T / 2, cy = y + CK_T / 2;
  g.fillStyle = '#2F7D32';
  g.beginPath(); g.arc(cx, cy + 2, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#58B947';
  g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
  g.fillStyle = CK_WATER;   // the notch
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 16, cy - 6); g.lineTo(cx + 16, cy + 5); g.closePath(); g.fill();
  if (it.flower) {
    g.fillStyle = '#F9A8D4';
    g.beginPath(); g.arc(cx - 6, cy - 5, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FDE68A'; g.fillRect(cx - 7, cy - 6, 2, 2);
  }
}

// The level-crossing light at the left of a rail lane. It flashes during the
// warning — a kid's cue to get off the tracks.
function ckDrawSignal(row, y) {
  const g = ckCtx;
  const flashing = row.phase === 'warn' || row.phase === 'pass';
  const on = Math.floor(ckClock / 200) % 2;
  if (flashing) {   // the whole crossing pulses red, so the warning reads from anywhere
    g.fillStyle = on ? 'rgba(239,68,68,0.34)' : 'rgba(239,68,68,0.14)';
    g.fillRect(0, y, CK_W, CK_T);
  }
  g.fillStyle = '#1E293B'; g.fillRect(15, y + 2, 4, 10);   // post
  g.fillStyle = '#334155'; g.fillRect(3, y - 12, 28, 15);   // lamp board
  g.fillStyle = flashing && on ? '#EF4444' : '#475569';
  g.beginPath(); g.arc(10, y - 4, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = flashing && !on ? '#EF4444' : '#475569';
  g.beginPath(); g.arc(24, y - 4, 5, 0, Math.PI * 2); g.fill();
}

function ckDrawTrain(row, y) {
  const g = ckCtx;
  // Segments left to right; the locomotive is always at the leading end.
  const segs = [];
  for (let i = 0; i < row.trainN; i++) segs.push({ w: 74, loco: false });
  if (row.dir > 0) segs.push({ w: 70, loco: true }); else segs.unshift({ w: 70, loco: true });
  let sx = Math.round(row.trainX);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(sx, y + 31, row.trainW, 6);
  segs.forEach(s => {
    if (sx < CK_W && sx + s.w > 0) {
      if (s.loco) {
        g.fillStyle = '#7F1D1D'; g.fillRect(sx, y + 20, s.w, 13);
        g.fillStyle = '#DC2626'; g.fillRect(sx, y - 2, s.w, 23);
        g.fillStyle = '#FDE68A'; g.fillRect(sx, y + 24, s.w, 3);
        g.fillStyle = '#1E293B'; g.fillRect(row.dir > 0 ? sx + s.w - 16 : sx + 4, y + 1, 12, 17);
        g.fillStyle = '#FEF08A'; g.fillRect(row.dir > 0 ? sx + s.w - 3 : sx, y + 22, 3, 6);
      } else {
        g.fillStyle = '#475569'; g.fillRect(sx, y + 20, s.w, 13);
        g.fillStyle = '#E2E8F0'; g.fillRect(sx, y - 2, s.w, 23);
        g.fillStyle = '#1E293B';
        for (let wx = sx + 8; wx < sx + s.w - 10; wx += 16) g.fillRect(wx, y + 23, 9, 6);
        g.fillStyle = '#2563EB'; g.fillRect(sx, y + 8, s.w, 4);
      }
    }
    sx += s.w + 6;
  });
}

// Facing: up = from behind, down = face on, left/right = profile.
// sx/sy squash the whole bird (squat before a hop, flat after a car).
function ckDrawChicken(cx, cy, face, sx = 1, sy = 1) {
  const g = ckCtx;
  g.save();
  g.translate(Math.round(cx), Math.round(cy));
  if (face === 'right') g.scale(-1, 1);
  g.scale(sx * CK_CHICK_SCALE, sy * CK_CHICK_SCALE);
  g.fillStyle = '#F59E0B';                                    // feet
  g.fillRect(-8, 11, 5, 4); g.fillRect(3, 11, 5, 4);
  g.fillStyle = '#D6D3D1'; g.fillRect(-12, 0, 24, 12);        // front face
  g.fillStyle = '#FFFFFF'; g.fillRect(-12, -12, 24, 14);      // top
  if (face === 'up' || face === 'down') {
    g.fillStyle = '#E7E5E4';                                  // wings
    g.fillRect(-14, -4, 3, 10); g.fillRect(11, -4, 3, 10);
    g.fillStyle = '#EF4444'; g.fillRect(-3, -16, 6, 5);       // comb
    if (face === 'down') {
      g.fillStyle = '#111827';
      g.fillRect(-7, -6, 3, 3); g.fillRect(4, -6, 3, 3);
      g.fillStyle = '#F59E0B'; g.fillRect(-3, -2, 6, 5);
      g.fillStyle = '#EF4444'; g.fillRect(-1, 3, 3, 3);       // wattle
    } else {
      g.fillStyle = '#E7E5E4'; g.fillRect(-4, 7, 8, 5);       // tail
    }
  } else {   // 'left' — 'right' is the same drawing mirrored
    g.fillStyle = '#EF4444'; g.fillRect(-9, -16, 8, 5);
    g.fillStyle = '#F59E0B'; g.fillRect(-17, -6, 6, 4);
    g.fillStyle = '#EF4444'; g.fillRect(-13, -2, 3, 4);
    g.fillStyle = '#111827'; g.fillRect(-8, -8, 3, 3);
    g.fillStyle = '#E7E5E4'; g.fillRect(-1, -3, 10, 7);       // wing
    g.fillStyle = '#FFFFFF'; g.fillRect(10, -16, 5, 7);       // tail up
  }
  g.restore();
}

function ckDrawChickenNow(p) {
  const c = ckChick, g = ckCtx;
  const y = ckRowTop(p.vr);
  if (!c.alive) {
    const k = ckDeath.kind;
    if (k === 'squash') ckDrawChicken(p.x, y + 28, c.face, 1.45, 0.28);
    return;   // splash and train leave nothing behind; the eagle scene draws its own
  }
  const groundY = y + CK_T / 2 + 2;
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(p.x, y + 34, 11 * (1 - p.lift / 30), 4, 0, 0, Math.PI * 2);
  g.fill();
  let bx = p.x, by = groundY - p.lift, sx = 1, sy = 1;
  // A finger is down → the chicken crouches, ready to spring.
  if (ckState === 'playing' && ckPress && ckPress.state === 'playing' && !ckPress.used && !c.hop) {
    sx = 1.1; sy = 0.84; by += 2;
  }
  const bump = ckClock - ckChick.bumpAt;
  if (bump < 90) {   // walked into a tree: a little nudge that way and back
    const k = Math.sin(Math.PI * bump / 90) * 3;
    bx += c.face === 'left' ? -k : c.face === 'right' ? k : 0;
    by += c.face === 'up' ? -k : c.face === 'down' ? k : 0;
  }
  ckDrawChicken(bx, by, c.face, sx, sy);
}

// The eagle drops onto the chicken, grabs it, and climbs off the top.
function ckDrawEagleScene() {
  const e = ckClock - ckDeath.at;
  const x = ckDeath.x;
  const cy = ckRowTop(ckDeath.vr) + CK_T / 2;
  const DOWN = 480, UP = 800;
  let y, carrying = false;
  if (e < DOWN) {
    const t = e / DOWN;
    y = -70 + (cy + 70) * (1 - (1 - t) * (1 - t));
    ckDrawChicken(x, cy, ckChick.face);
  } else {
    const t = Math.min(1, (e - DOWN) / UP);
    y = cy - (cy + 140) * t * t;
    carrying = true;
  }
  if (carrying) ckDrawChicken(x, y + 22, 'down', 0.9, 0.9);
  ckDrawEagle(x, y, Math.sin(ckClock / 60));
}

function ckDrawEagle(x, y, flap) {
  const g = ckCtx;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath(); g.ellipse(0, 40, 40, 8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5B3A1E';
  [-1, 1].forEach(s => {
    g.beginPath();
    g.moveTo(s * 6, -6);
    g.lineTo(s * 50, -18 - flap * 10);
    g.lineTo(s * 44, -2 - flap * 4);
    g.lineTo(s * 30, 4);
    g.lineTo(s * 6, 8);
    g.closePath(); g.fill();
  });
  g.fillStyle = '#7A4B26'; g.fillRect(-9, -16, 18, 28);        // body
  g.fillStyle = '#F8FAFC'; g.fillRect(-7, -24, 14, 9);         // tail
  g.fillStyle = '#F8FAFC'; g.fillRect(-7, 10, 14, 10);         // head
  g.fillStyle = '#111827'; g.fillRect(-5, 13, 2, 2); g.fillRect(3, 13, 2, 2);
  g.fillStyle = '#F59E0B'; g.fillRect(-3, 19, 6, 5);           // beak
  g.restore();
}

function ckDrawParts() {
  const g = ckCtx;
  ckParts.forEach(p => {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    if (p.kind === 'ring') {
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, Math.PI * 2); g.stroke();
    } else if (p.kind === 'feather') {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.colour;
      g.beginPath(); g.ellipse(0, 0, 6, 2.5, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    } else {
      g.fillStyle = p.colour;
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  });
  g.globalAlpha = 1;
}

// White text with a dark outline reads on grass, road and water alike.
function ckOutlined(text, x, y, font, fill, align = 'left', lw = 6) {
  const g = ckCtx;
  g.font = font;
  g.textAlign = align;
  g.lineJoin = 'round';
  g.lineWidth = lw;
  g.strokeStyle = CK_BG;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

function ckDrawHud() {
  const g = ckCtx;
  const pop = Math.max(0, 1 - (ckClock - ckScorePopAt) / 180);
  g.save();
  g.translate(16, 50);
  g.scale(1 + pop * 0.18, 1 + pop * 0.18);
  ckOutlined(String(ckScore), 0, 0, 'bold 40px monospace', '#FFFFFF');
  g.restore();
  const best = ckBoard[0];
  if (best) ckOutlined('TOP ' + Math.max(best.score, ckScore), CK_W - 14, 32, 'bold 14px monospace', CK_YELLOW, 'right', 5);
  if (ckState === 'playing' && ckFresh) {
    ckOutlined('TAP TO HOP', CK_W / 2, 600, 'bold 16px monospace', '#FFFFFF', 'center', 5);
  }
}

function ckDrawDeathText() {
  const g = ckCtx, age = ckClock - ckDeath.at;
  const word = CK_DEATH_WORDS[ckDeath.kind];
  const t = Math.min(1, age / 220);
  g.save();
  g.translate(CK_W / 2, 280);
  g.scale(0.6 + 0.4 * t, 0.6 + 0.4 * t);
  g.textBaseline = 'middle';
  ckOutlined(word, 0, 0, `bold ${word.length > 8 ? 40 : 52}px monospace`, CK_YELLOW, 'center', 8);
  g.restore();
  g.textBaseline = 'alphabetic';
  if (age > 500) {
    ckOutlined('SCORE ' + ckLastScore, CK_W / 2, 336, 'bold 22px monospace', '#FFFFFF', 'center', 6);
  }
}

function ckDrawButton(r, label, size = 22, solid = false) {
  const g = ckCtx;
  g.fillStyle = solid ? 'rgba(5,7,13,0.88)' : 'transparent';
  if (solid) g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = CK_GREEN;
  g.lineWidth = 3;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = CK_GREEN;
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}

function ckDrawAttract() {
  const g = ckCtx;
  g.fillStyle = 'rgba(5,7,13,0.84)';
  g.fillRect(20, 56, 320, 214);
  g.strokeStyle = CK_GREEN;
  g.lineWidth = 3;
  g.strokeRect(20, 56, 320, 214);

  g.textAlign = 'center';
  g.fillStyle = CK_GREY;
  g.font = '13px monospace';
  g.fillText('WHY DID THE CHICKEN', CK_W / 2, 92);
  g.fillText('CROSS THE ROAD?', CK_W / 2, 110);
  g.fillStyle = CK_YELLOW;
  g.font = 'bold 15px monospace';
  g.fillText('TO GET TO THE', CK_W / 2, 146);
  g.fillStyle = CK_GREEN;
  g.font = 'bold 40px monospace';
  g.fillText(CK_TITLE, CK_W / 2, 188);
  g.font = '12px monospace';
  g.fillText('TAP TO HOP  ·  SWIPE TO TURN', CK_W / 2, 222);
  const best = ckBoard[0];
  g.fillStyle = best ? CK_YELLOW : CK_DIM;
  g.fillText(best ? `BEST ${best.score} · ${best.name}` : 'NO SCORES YET', CK_W / 2, 248);

  ckDrawButton(CK_BTN_PLAY, 'PLAY', 28, true);
}

function ckDrawNameEntry() {
  const g = ckCtx;
  g.textAlign = 'center';
  g.fillStyle = CK_YELLOW;
  g.font = 'bold 26px monospace';
  g.fillText('NEW HIGH SCORE!', CK_W / 2, 160);
  g.fillStyle = CK_GREEN;
  g.font = 'bold 40px monospace';
  g.fillText(String(ckLastScore), CK_W / 2, 214);
  g.fillStyle = CK_GREEN;
  g.font = '12px monospace';
  g.fillText('TAP A LETTER TO CHANGE IT', CK_W / 2, 270);
  CK_SLOTS.forEach((r, i) => {
    g.strokeStyle = CK_GREEN;
    g.lineWidth = 3;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.fillStyle = CK_GREEN;
    g.font = 'bold 44px monospace';
    g.textBaseline = 'middle';
    g.fillText(CK_ALPHABET[ckInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2);
    g.textBaseline = 'alphabetic';
  });
  ckDrawButton(CK_BTN_OK, 'OK');
}

function ckDrawLeaderboard() {
  const g = ckCtx;
  g.textAlign = 'center';
  g.fillStyle = CK_GREEN;
  g.font = 'bold 24px monospace';
  g.fillText('HIGH SCORES', CK_W / 2, 118);
  g.fillStyle = CK_GREY;
  g.font = '13px monospace';
  g.fillText(`THIS RUN: ${ckLastScore}`, CK_W / 2, 150);
  if (ckBoard.length === 0) {
    g.fillStyle = '#334155';
    g.font = '14px monospace';
    g.fillText('NO SCORES YET', CK_W / 2, 250);
  }
  g.font = 'bold 20px monospace';
  ckBoard.forEach((e, i) => {
    const y = 214 + i * 40;
    g.fillStyle = i === 0 ? CK_YELLOW : CK_GREEN;
    g.textAlign = 'left';
    g.fillText(`${i + 1}. ${e.name}`, 70, y);
    g.textAlign = 'right';
    g.fillText(String(e.score), CK_W - 70, y);
  });
  ckDrawButton(CK_BTN_LB_AGAIN, 'PLAY AGAIN', 20);
  ckDrawButton(CK_BTN_LB_MENU, 'MENU', 18);
}

// ── Input ────────────────────────────────────────────────────────────────────
function ckToLogical(e) {
  const r = ckCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * CK_W / r.width,
           y: (e.clientY - r.top)  * CK_H / r.height };
}

function ckHit(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Menu buttons fire on press (like asherplane/minesweeper). In play, the
// whole screen is the control pad — see ckStagePointer.
function ckOnDown(p) {
  if (ckState === 'attract') {
    if (ckHit(CK_BTN_PLAY, p)) { CK_SOUND.select(); ckEnterState('playing'); }
    return;
  }
  if (ckState === 'nameEntry') {
    for (let i = 0; i < CK_SLOTS.length; i++) {
      if (!ckHit(CK_SLOTS[i], p)) continue;
      ckInitials[i] = (ckInitials[i] + 1) % CK_ALPHABET.length;
      CK_SOUND.select();
      return;
    }
    if (ckHit(CK_BTN_OK, p)) {
      CK_SOUND.select();
      ckSubmitScore(ckInitials.map(i => CK_ALPHABET[i]).join(''), ckLastScore);
      ckEnterState('leaderboard');
    }
    return;
  }
  if (ckState === 'leaderboard') {
    if (ckHit(CK_BTN_LB_AGAIN, p)) { CK_SOUND.select(); ckEnterState('playing'); return; }
    if (ckHit(CK_BTN_LB_MENU, p))  { CK_SOUND.select(); ckEnterState('attract'); }
  }
}

function ckStagePointer(e, phase) {
  if (phase === 'down') {
    if (ckPtrId !== null) return;              // stage already claimed by another finger
    ckPtrId = e.pointerId;
    const p = ckToLogical(e);
    ckPress = { x: p.x, y: p.y, state: ckState, used: false };
    ckOnDown(p);
    return;
  }

  if (e.pointerId !== ckPtrId) return;         // not the pointer we claimed — ignore

  if (phase === 'move') {
    const pr = ckPress;
    if (!pr || pr.used || pr.state !== 'playing') return;
    const p = ckToLogical(e);
    const dx = p.x - pr.x, dy = p.y - pr.y;
    if (Math.hypot(dx, dy) < CK_SWIPE_PX) return;
    pr.used = true;   // a swipe hops the moment it's recognised, not on release
    ckTryHop(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
    return;
  }

  // up / cancel — release the stage first, whatever happens next
  ckPtrId = null;
  const pr = ckPress;
  ckPress = null;
  if (phase !== 'up' || !pr || pr.used || pr.state !== 'playing') return;
  ckTryHop('up');                              // a plain tap hops forward
}

(function ckBindInput() {
  const stage = document.getElementById('ck-stage');
  stage.addEventListener('pointerdown',       e => { stage.setPointerCapture(e.pointerId); ckStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',       e => { if (e.buttons) ckStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',         e => ckStagePointer(e, 'up'));
  stage.addEventListener('pointercancel',     e => ckStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => ckStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',       e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-chicken').style.display !== 'none';

  const KEYS = { ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up',
                 ArrowDown: 'down', s: 'down', S: 'down',
                 ArrowLeft: 'left', a: 'left', A: 'left',
                 ArrowRight: 'right', d: 'right', D: 'right' };
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (ckState === 'attract' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      CK_SOUND.select();
      ckEnterState('playing');
      return;
    }
    if (ckState !== 'playing' || !KEYS[e.key]) return;
    e.preventDefault();
    if (e.repeat) return;   // holding a key shouldn't machine-gun hops
    ckTryHop(KEYS[e.key]);
  });

  document.getElementById('btn-ck-exit').addEventListener('click', () => {
    resetArcadeChicken();
    arcExitCabinet();   // back to the Arcade room (SW v254)
  });

  // A child WILL put the iPad down mid-run. Stop the loop (the world and the
  // camera only move inside ckUpdate, so the run is frozen, not lost) and drop
  // any half-finished press, since its pointerup may never arrive.
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      ckRaf = null;
      ckPress = null;
      ckPtrId = null;
    } else if (!ckRaf) {
      ckLastT = 0;
      ckRaf = requestAnimationFrame(ckLoop);
    }
  });
})();

// Same approach as apResize/msResize: fit the fixed 360×640 logical canvas
// into its container, backing store at (CSS scale × devicePixelRatio).
function ckResize() {
  if (!ckCanvas) return;
  const box   = ckCanvas.parentElement;
  const scale = Math.min(box.clientWidth / CK_W, box.clientHeight / CK_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  ckCanvas.style.width  = Math.floor(CK_W * scale) + 'px';
  ckCanvas.style.height = Math.floor(CK_H * scale) + 'px';
  ckCanvas.width        = Math.floor(CK_W * scale * dpr);
  ckCanvas.height       = Math.floor(CK_H * scale * dpr);
  ckCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// Called from engine.js resetToLobby() (add it beside resetArcade()).
function resetArcadeChicken() {
  if (ckRaf) { cancelAnimationFrame(ckRaf); ckRaf = null; }
  ckState  = 'attract';
  ckPress  = null;
  ckPtrId  = null;
  ckQueued = null;
  ckEvents = [];
  ckParts  = [];
  ckShake  = 0;
  // ckBoard is NOT cleared — see the declaration above.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-chicken').style.display !== 'none') ckResize();
});
