// ═══════════════════════════════════════════════════════════════════════════
// asherplane.js — ARCADE CABINET 01. ASHERPLANE: a toy-bright vertical shmup.
// Fly a chunky little prop fighter over a scrolling sea of islands, shoot the
// Bandits, grab parachute crates, and beat a different boss at the end of each
// sky: MORNING → MIDDAY → SUNSET → NIGHT → TWILIGHT (the nightmare), and then
// the twilight never ends. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//  - Prefix `ap`. Screen id: screen-arcade-asherplane. DOM: #ap-stage (pointer
//    target, touch-action:none) wrapping #ap-canvas, plus #btn-ap-exit.
//  - Entry point apStart(); teardown is still called resetArcade() (the name the
//    real engine.js resetToLobby() already calls), and the session table is
//    still apLeaderboard — both kept from the v1 cabinet so this file is a
//    drop-in replacement. v1 (cars/trains/rockets) is in _archive/asherplane-classic.js.
//  - NO setTimeouts: every delayed effect is scheduled on apClock via apEvents.
//
// HOW IT PLAYS
//  - Drag anywhere to fly. The plane moves as far as your finger moves (it is
//    not glued under it), so your thumb never covers it. Arrows / WASD on desktop.
//  - You shoot all by yourself. Only the small glowing dot in the middle of the
//    plane can be hit — bullets that brush a wing miss, like every good shmup.
//  - CRATES float down on parachutes: POWER (guns, 5 levels), SHIELD (a bubble
//    that soaks one hit), WINGMEN (two helper planes for 15 s), KABOOM (clears
//    the sky), HEART (an extra life, max 5).
//  - GOLD STARS drop from every Bandit and drift to you when you're close.
//    Catch them in a row to build the STAR CHAIN multiplier (x2 at 10, up to
//    x5); a star that falls off the bottom breaks the chain.
//  - Get hit: lose a heart AND a power level, and enemy bullets fizzle out
//    (all of them; only the nearby ones in TWILIGHT). Three hearts to start.
//
// THE SKIES (AP_STAGES) — every sky is a clear step up: faster bullets, more
// of them, tougher Bandits, quicker waves, and one new Bandit type.
//   1 MORNING  Darts, Swooper formations, Bombers.    Boss: THE BIG BLIMP
//   2 MIDDAY   + Copters.                             Boss: THE BUZZ BROTHERS
//   3 SUNSET   + Divers.                              Boss: THE IRONCLAD
//   4 NIGHT    + Aces (strafe and burst-fire).        Boss: THE NIGHT OWL
//   5 TWILIGHT the nightmare. BANDITS BITE BACK: every Bandit you shoot down
//              lets off a ring of bullets. Lightning, fewer hearts, double
//              waves.                                 Boss: THE DREAD BARON
//   6+ TWILIGHT 2, 3, … — it never ends: all five bosses come back in turn,
//              harder every lap.
// THE BOSSES (AP_BOSS_DEFS) — each one plays differently:
//   BIG BLIMP     wide, slow; aimed bursts → bullet rings → turret sweeps.
//   BUZZ BROTHERS two giant copters criss-crossing; down one and the other
//                 one gets mad (faster, adds a spinning spray).
//   IRONCLAD      a battleship down on the sea — you fly right over it. Shoot
//                 its four turrets (one fires FLAK that bursts mid-air) to
//                 open the armoured bridge, then sink it.
//   NIGHT OWL     vanishes (only its eyes show) and swoops to a new spot; fires
//                 feather fans and a LASER BEAM straight down after a warning line.
//   DREAD BARON   a giant crimson triplane with three phases: twin guns →
//                 spiral + escort Aces → DREAD MODE (three-arm spiral).
//
// PLAY-TEST WARP: tap the ASHERPLANE title on the start screen to pick a
// starting sky (shown in pink). It sticks for the session. Delete
// apWarp / AP_TITLE_HIT to remove it.
// ═══════════════════════════════════════════════════════════════════════════
const AP_W = 360, AP_H = 640;
const AP_TITLE = 'ASHERPLANE';
const AP_TOP_N = 5;

// ── Tuning ───────────────────────────────────────────────────────────────────
const AP_DRAG_GAIN  = 1.25;    // finger px → plane px
const AP_KEY_SPEED  = 300;     // px/s on the keyboard
const AP_FIRE_S     = 0.12;    // auto-fire cadence
const AP_WING_FIRE_S = 0.2;
const AP_SHOT_SPEED = 720;
const AP_START_LIVES = 3, AP_MAX_LIVES = 5;
const AP_MAX_POWER  = 5;
const AP_INVULN_S   = 2.0;
const AP_HIT_R      = 6;       // the plane's hit core
const AP_GRAB_R     = 30;      // how close a crate/star has to be to collect it
const AP_MAGNET_R   = 95;      // stars inside this drift to you
const AP_STAGE_S    = 60;      // seconds of Bandits before each boss
const AP_WING_S     = 15;
const AP_SCROLL     = 70;      // sea scroll speed, px/s
const AP_MIN_X = 18, AP_MAX_X = AP_W - 18, AP_MIN_Y = 64, AP_MAX_Y = AP_H - 26;

// ── The skies. Every number steps up stage to stage — that's the difficulty.
//   hp: Bandit + boss toughness ×   shot: enemy bullet speed (px/s)
//   fire: enemy fire-rate ×          gap/gapMin: seconds between waves (start/floor)
//   dartShoot: chance a Dart fires   pool: wave weights   balloon: supply balloon gap [min,max] s
const AP_STAGES = [
  { name: 'MORNING',  tod: 0, boss: 'blimp',    hp: 1.0, shot: 165, fire: 1.0,  gap: 2.3,  gapMin: 1.3,  dartShoot: 0.2,
    pool: { darts: 4, swoop: 3, bomber: 1.4, copter: 0, divers: 0, ace: 0 }, balloon: [13, 18], fresh: null },
  { name: 'MIDDAY',   tod: 1, boss: 'buzz',     hp: 1.5, shot: 192, fire: 1.3,  gap: 1.9,  gapMin: 1.05, dartShoot: 0.4,
    pool: { darts: 4, swoop: 3, bomber: 1.6, copter: 2, divers: 0, ace: 0 }, balloon: [14, 19], fresh: 'COPTERS' },
  { name: 'SUNSET',   tod: 2, boss: 'ironclad', hp: 2.1, shot: 214, fire: 1.6,  gap: 1.6,  gapMin: 0.9,  dartShoot: 0.55,
    pool: { darts: 4, swoop: 3, bomber: 1.8, copter: 2, divers: 2.2, ace: 0 }, balloon: [15, 20], fresh: 'DIVERS' },
  { name: 'NIGHT',    tod: 3, boss: 'owl',      hp: 2.8, shot: 236, fire: 1.9,  gap: 1.35, gapMin: 0.8,  dartShoot: 0.7,
    pool: { darts: 4, swoop: 3, bomber: 1.8, copter: 2, divers: 2.2, ace: 1.8 }, balloon: [16, 21], fresh: 'ACES' },
  { name: 'TWILIGHT', tod: 4, boss: 'baron',    hp: 3.6, shot: 258, fire: 2.25, gap: 1.15, gapMin: 0.68, dartShoot: 0.85,
    pool: { darts: 4, swoop: 3, bomber: 2, copter: 2.2, divers: 2.4, ace: 2.4 }, balloon: [19, 25], fresh: null, nightmare: true },
];
const AP_BOSS_ORDER = ['blimp', 'buzz', 'ironclad', 'owl', 'baron'];

// Gun patterns per power level: [x offset, angle in degrees from straight up]
const AP_GUNS = [
  null,
  [[-5, 0], [5, 0]],
  [[-9, 0], [0, 0], [9, 0]],
  [[-8, 0], [0, 0], [8, 0], [-12, -9], [12, 9]],
  [[-10, 0], [-3, 0], [3, 0], [10, 0], [-12, -8], [12, 8], [-14, -16], [14, 16]],
  [[-12, 0], [-4, 0], [4, 0], [12, 0], [-12, -6], [12, 6], [-14, -13], [14, 13], [-16, -21], [16, 21]],
];

// Bandits. hp × the sky's hp multiplier (except the balloon). bite = revenge
// bullets it lets off in TWILIGHT.
const AP_FOES = {
  dart:    { r: 14, hp: 1,  pts: 50,  stars: 1, bite: 3 },
  swoop:   { r: 14, hp: 2,  pts: 80,  stars: 1, bite: 3 },
  diver:   { r: 13, hp: 3,  pts: 150, stars: 2, bite: 4 },
  ace:     { r: 15, hp: 6,  pts: 350, stars: 4, bite: 6 },
  copter:  { r: 20, hp: 10, pts: 300, stars: 4, bite: 8 },
  bomber:  { r: 28, hp: 18, pts: 450, stars: 6, bite: 8 },
  balloon: { r: 19, hp: 4,  pts: 100, stars: 0, bite: 0 },
};

// Crates. Icons are drawn in apDrawIcon.
const AP_DROPS = {
  power:  { label: 'POWER',   col: '#FF8A3D' },
  shield: { label: 'SHIELD',  col: '#3FB4F5' },
  wing:   { label: 'WINGMEN', col: '#4CC46E' },
  kaboom: { label: 'KABOOM',  col: '#E2574C' },
  heart:  { label: 'HEART',   col: '#F06FA8' },
};
const AP_DROP_ORDER = ['power', 'shield', 'wing', 'kaboom', 'heart'];

// ── Palette ──────────────────────────────────────────────────────────────────
const AP_INK = '#14213D', AP_CHALK = '#F8F4E8', AP_GOLD = '#FFC93C', AP_RED = '#E2574C',
      AP_DIM = '#9AB0C8', AP_BLUE = '#2E7FD4', AP_PINK = '#FF5C8A', AP_DUSK = '#E879F9';
const AP_PLAYER_COLS = { body: '#2E7FD4', wing: '#2366B0', trim: '#FFC93C', canopy: '#BDE8FF' };
const AP_WINGMAN_COLS = { body: '#4CC46E', wing: '#379A55', trim: '#FFC93C', canopy: '#DFFFE6' };
const AP_DART_COLS  = { body: '#E2574C', wing: '#B23E33', trim: '#2A2A35', canopy: '#FFE2A8' };
const AP_SWOOP_COLS = { body: '#F2A23A', wing: '#C97A1C', trim: '#3A2A20', canopy: '#FFF1C9' };
const AP_ACE_COLS   = { body: '#2A2A35', wing: '#1A1A22', trim: '#FFC93C', canopy: '#FF7A7A' };

// Time of day — one per sky. Colours are [r,g,b] so they can blend.
const AP_TIMES = [
  { name: 'MORNING', seaHi: [72, 178, 214], seaLo: [28, 110, 160], shallow: [130, 216, 226], sand: [246, 222, 164],
    grass: [98, 190, 102], grassDk: [58, 138, 74], cloud: [255, 255, 255], cloudDk: [206, 226, 240], shade: [12, 46, 80], glint: [255, 255, 255], cloudA: 0.82, gloom: 0 },
  { name: 'MIDDAY',  seaHi: [64, 196, 226], seaLo: [22, 128, 182], shallow: [156, 234, 236], sand: [252, 234, 184],
    grass: [112, 204, 100], grassDk: [64, 150, 70], cloud: [255, 255, 255], cloudDk: [214, 232, 244], shade: [8, 50, 86], glint: [255, 255, 255], cloudA: 0.85, gloom: 0 },
  { name: 'SUNSET',  seaHi: [234, 142, 98], seaLo: [112, 64, 114], shallow: [246, 186, 140], sand: [246, 198, 142],
    grass: [92, 150, 90], grassDk: [60, 104, 68], cloud: [255, 216, 198], cloudDk: [230, 162, 160], shade: [70, 24, 56], glint: [255, 232, 168], cloudA: 0.8, gloom: 0 },
  { name: 'NIGHT',   seaHi: [36, 58, 108], seaLo: [10, 18, 46], shallow: [64, 96, 140], sand: [134, 132, 156],
    grass: [46, 90, 78], grassDk: [28, 60, 54], cloud: [152, 168, 208], cloudDk: [104, 118, 160], shade: [0, 0, 18], glint: [206, 224, 255], cloudA: 0.55, gloom: 0.25 },
  { name: 'TWILIGHT', seaHi: [96, 40, 112], seaLo: [26, 6, 44], shallow: [150, 70, 150], sand: [168, 112, 150],
    grass: [84, 62, 120], grassDk: [50, 34, 82], cloud: [120, 82, 150], cloudDk: [62, 38, 86], shade: [12, 0, 24], glint: [255, 130, 210], cloudA: 0.72, gloom: 0.55 },
];

// ── Sound — moments mapped onto the NES-style beep. No per-shot sound: at
// 8 shots a second it grates.
const AP_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  pop:       () => playSecretBeep(330),
  boom:      () => { playSecretBeep(196); apLater(70, () => playSecretBeep(131)); },
  hit:       () => { playSecretBeep(147); apLater(90, () => playSecretBeep(110)); },
  shieldPop: () => { playSecretBeep(523); apLater(60, () => playSecretBeep(392)); },
  powerup:   () => { playSecretBeep(880); apLater(70, () => playSecretBeep(1175)); apLater(140, () => playSecretBeep(1568)); },
  kaboom:    () => [98, 82, 65].forEach((f, k) => apLater(k * 90, () => playSecretBeep(f))),
  warn:      () => { playSecretBeep(988); apLater(150, () => playSecretBeep(740)); },
  formation: () => { playSecretBeep(988); apLater(80, () => playSecretBeep(1319)); },
  bossDown:  () => [523, 659, 784, 1047, 1319].forEach((f, k) => apLater(k * 110, () => playSecretBeep(f))),
  stage:     () => [659, 880].forEach((f, k) => apLater(k * 120, () => playSecretBeep(f))),
  twilight:  () => [330, 311, 294, 262, 247].forEach((f, k) => apLater(k * 160, () => playSecretBeep(f))),
  phase:     () => [196, 233, 277].forEach((f, k) => apLater(k * 100, () => playSecretBeep(f))),
  laser:     () => { playSecretBeep(1760); apLater(60, () => playSecretBeep(1397)); },
  hoot:      () => { playSecretBeep(392); apLater(220, () => playSecretBeep(330)); },
  thunder:   () => { playSecretBeep(55); apLater(90, () => playSecretBeep(49)); },
  tink:      () => playSecretBeep(2093),
  splash:    () => { playSecretBeep(110); apLater(120, () => playSecretBeep(82)); },
};
const AP_STAR_PITCH = [1047, 1175, 1319, 1480, 1568];   // rises with the chain multiplier
const AP_OVER_JINGLE = [523, 392, 330, 262];

// ── Layout rects (logical px) ────────────────────────────────────────────────
const AP_BTN_PLAY     = { x: 40,  y: 418, w: 280, h: 64 };
const AP_TITLE_HIT    = { x: 40,  y: 96,  w: 280, h: 60 };   // the play-test warp
const AP_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const AP_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const AP_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const AP_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

// ── Runtime state ────────────────────────────────────────────────────────────
let apCanvas = null, apCtx = null;
let apRafHandle = null, apLastT = 0;
let apState = 'attract';   // attract | playing | over | nameEntry | leaderboard
let apClock = 0;           // ms of un-paused time
let apEvents = [];         // [{ at, fn }] — replaces setTimeout
let apParts = [];          // particles
let apCallouts = [];       // floating words
let apShake = 0;
let apFlash = null;        // { col, t, max } full-screen flash
let apScore = 0, apLastScore = 0, apLastStageName = '';
let apPtrId = null;        // the one pointer allowed to act
let apDragP = null;        // last finger point while flying
let apKeys = { left: false, right: false, up: false, down: false };
// Session leaderboard. Deliberately NOT cleared by resetArcade() — it survives
// trips to the lobby so two kids can compare scores across an afternoon.
let apLeaderboard = [];
let apLastEntry = -1;      // row to highlight on the leaderboard
const AP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let apInitials = [0, 0, 0];
let apWarp = 0;            // play-test: which sky a run starts in (session only)

// The run
let apPlayer = null;
let apShots = [];          // your bullets
let apFoes = [];
let apFoeShots = [];
let apDrops = [];          // parachute crates
let apStars = [];          // gold stars
let apBoss = null;
let apStage = 0, apStageT = 0;
let apLv = AP_STAGES[0];   // this sky's numbers (see apLvlFor)
let apPhase = 'waves';     // waves | warn | boss | clear
let apPhaseT = 0, apWaveT = 0, apBalloonT = 0;
let apChain = 0, apBestChain = 0, apTingT = 0;
let apForms = {}, apFormId = 0;
let apOverT = 0;
let apDemoFireT = 0;
let apBoltT = 0, apBolt = null;   // TWILIGHT lightning

// The sea
let apIslands = [], apClouds = [], apGlints = [];
let apTodFrom = 0, apTodTo = 0, apTodT = 1;
let apPal = null;          // the blended palette for this frame

function apStart() {
  apCanvas = document.getElementById('ap-canvas');
  apCtx = apCanvas.getContext('2d');
  if (!apIslands.length) apInitSea();
  showScreen('screen-arcade-asherplane');
  apResize();
  apEnterState('attract');
}

function apEnterState(next) {
  apState = next;
  if (next === 'playing') { apResetRun(); if (apWarp) apWarpTo(apWarp); else apStageBanner(); }
  if (next === 'attract') apResetRun();
  apShake = 0; apDragP = null;
  if (!apRafHandle) { apLastT = 0; apRafHandle = requestAnimationFrame(apLoop); }
}

function apLater(ms, fn) { apEvents.push({ at: apClock + ms, fn }); }

// The numbers for sky n. Past TWILIGHT it keeps TWILIGHT's rules and gets
// harder every lap, with the bosses coming back in turn.
function apLvlFor(n) {
  if (n < AP_STAGES.length) return AP_STAGES[n];
  const lap = n - AP_STAGES.length + 1, base = AP_STAGES[AP_STAGES.length - 1];
  return Object.assign({}, base, {
    boss: AP_BOSS_ORDER[n % AP_BOSS_ORDER.length],
    hp: base.hp * (1 + 0.3 * lap), shot: Math.min(330, base.shot + 16 * lap), fire: base.fire * (1 + 0.15 * lap),
    gap: Math.max(0.8, base.gap - 0.08 * lap), gapMin: Math.max(0.5, base.gapMin - 0.04 * lap), lap,
  });
}
function apStageName(n) {
  const L = apLvlFor(n);
  return L.lap ? 'TWILIGHT ' + (L.lap + 1) : L.name;
}

function apResetRun() {
  apShots = []; apFoes = []; apFoeShots = []; apDrops = []; apStars = [];
  apParts = []; apCallouts = []; apEvents = []; apFlash = null;
  apBoss = null; apStage = 0; apLv = apLvlFor(0); apStageT = 0; apPhase = 'waves'; apPhaseT = 0;
  apWaveT = 1.2; apBalloonT = 9;
  apChain = 0; apBestChain = 0; apTingT = 0;
  apForms = {}; apOverT = 0; apScore = 0;
  apBoltT = 6; apBolt = null;
  apTodFrom = apTodTo = 0; apTodT = 1;
  apPlayer = {
    x: AP_W / 2, y: AP_H - 120, bank: 0, bankTo: 0,
    power: 1, lives: AP_START_LIVES, invuln: 0, shield: false,
    wingT: 0, fireT: 0.3, wingFireT: 0,
    wingL: { x: AP_W / 2 - 36, y: AP_H - 100 }, wingR: { x: AP_W / 2 + 36, y: AP_H - 100 },
    fallT: 0, spin: 0, gone: false,
  };
}

// Play-test warp: start in a later sky with guns to match.
function apWarpTo(n) {
  apStage = n; apLv = apLvlFor(n);
  apTodFrom = apTodTo = apLv.tod; apTodT = 1;
  apPlayer.power = Math.min(AP_MAX_POWER, 1 + n);
  apStageBanner();
}

// ── Small helpers ────────────────────────────────────────────────────────────
const apRand = (a, b) => a + Math.random() * (b - a);
const apPick = arr => arr[Math.floor(Math.random() * arr.length)];
const apClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function apMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function apRgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
function apFoeHp(kind) {
  const base = AP_FOES[kind].hp;
  return kind === 'balloon' ? base : Math.max(1, Math.round(base * apLv.hp));
}
function apShotSpeed() { return apLv.shot; }
function apChainMul() { return 1 + Math.min(4, Math.floor(apChain / 10)); }
function apScoreInt() { return Math.floor(apScore); }
function apPad(n) { return String(Math.floor(n)).padStart(7, '0'); }

// ── Loop ─────────────────────────────────────────────────────────────────────
function apLoop(now) {
  apRafHandle = null;
  if (!apLastT) apLastT = now;
  // Clamp dt so a backgrounded tab can't teleport everything on the way back.
  const dt = Math.min((now - apLastT) / 1000, 0.05);
  apLastT = now;
  // The global sound overlay covers the stage completely: freeze behind it.
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) apUpdate(dt);
  apDraw();
  if (!apRafHandle) apRafHandle = requestAnimationFrame(apLoop);
}

function apUpdate(dt) {
  apClock += dt * 1000;
  if (apShake > 0) apShake = Math.max(0, apShake - dt);
  if (apFlash) { apFlash.t -= dt; if (apFlash.t <= 0) apFlash = null; }
  if (apBolt) { apBolt.t -= dt; if (apBolt.t <= 0) apBolt = null; }
  if (apTingT > 0) apTingT -= dt;
  if (apTodT < 1) apTodT = Math.min(1, apTodT + dt / 3);
  apUpdateSea(dt);
  apParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt;
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.grow) p.r += p.grow * dt;
    if (p.spin) p.a += p.spin * dt;
    p.life -= dt;
  });
  apParts = apParts.filter(p => p.life > 0);
  apCallouts.forEach(c => { c.y -= (c.rise || 24) * dt; c.life -= dt; });
  apCallouts = apCallouts.filter(c => c.life > 0);
  if (apEvents.length) {
    const due = apEvents.filter(e => apClock >= e.at);
    apEvents  = apEvents.filter(e => apClock <  e.at);
    due.forEach(e => e.fn());
  }
  if (apState === 'playing') apUpdatePlaying(dt);
  else if (apState === 'over') apUpdateOver(dt);
  else if (apState === 'attract') apUpdateDemo(dt);
}

// The attract screen: a demo plane weaves along the bottom, firing.
function apUpdateDemo(dt) {
  const P = apPlayer;
  const nx = AP_W / 2 + 110 * Math.sin(apClock / 1100);
  P.bank = apClamp((nx - P.x) / (dt || 1) / 140, -1, 1);
  P.x = nx; P.y = 592 + 5 * Math.sin(apClock / 520);
  apDemoFireT -= dt;
  if (apDemoFireT <= 0) { apDemoFireT = 0.18; apShots.push({ x: P.x - 5, y: P.y - 18, vx: 0, vy: -AP_SHOT_SPEED }, { x: P.x + 5, y: P.y - 18, vx: 0, vy: -AP_SHOT_SPEED }); }
  apMoveShots(dt);
}

function apMoveShots(dt) {
  apShots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; });
  apShots = apShots.filter(s => s.y > -20 && s.x > -20 && s.x < AP_W + 20 && !s.dead);
}

// ── The sea, islands and clouds ──────────────────────────────────────────────
function apInitSea() {
  apIslands = []; apClouds = []; apGlints = [];
  for (let k = 0; k < 3; k++) apIslands.push(apMakeIsland(-60 + k * 260 + apRand(0, 80)));
  for (let k = 0; k < 4; k++) apClouds.push(apMakeCloud(k * 180 - 40 + apRand(0, 60)));
  for (let k = 0; k < 28; k++) apGlints.push({ x: apRand(0, AP_W), y: apRand(0, AP_H), w: apRand(6, 14), ph: apRand(0, 6) });
}

function apMakeIsland(y) {
  const r = apRand(30, 66);
  const pts = []; for (let k = 0; k < 11; k++) pts.push(apRand(0.78, 1.14));
  const trees = [];
  const n = Math.round(r / 11);
  for (let k = 0; k < n; k++) {
    const a = apRand(0, Math.PI * 2), d = apRand(0, r * 0.5);
    trees.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: apRand(5, 9), palm: Math.random() < 0.4, rot: apRand(0, 6) });
  }
  return { x: apRand(-10, AP_W + 10), y, r, pts, trees };
}

function apMakeCloud(y) {
  const puffs = [], n = 4 + Math.floor(apRand(0, 4));
  for (let k = 0; k < n; k++) puffs.push({ dx: apRand(-46, 46), dy: apRand(-16, 16), r: apRand(14, 28) });
  return { x: apRand(10, AP_W - 10), y, puffs, sp: AP_SCROLL * 1.7 + apRand(0, 24) };
}

function apUpdateSea(dt) {
  const sp = apState !== 'over' || apOverT < 3 ? AP_SCROLL : AP_SCROLL * 0.5;
  apIslands.forEach((is, k) => {
    is.y += sp * dt;
    if (is.y - is.r * 1.5 > AP_H) apIslands[k] = apMakeIsland(-is.r * 1.6 - apRand(40, 220));
  });
  apClouds.forEach((c, k) => {
    c.y += c.sp * (sp / AP_SCROLL) * dt;
    if (c.y - 80 > AP_H) apClouds[k] = apMakeCloud(-90 - apRand(0, 160));
  });
  apGlints.forEach(gl => { gl.y += sp * dt; if (gl.y > AP_H + 10) { gl.y = -10; gl.x = apRand(0, AP_W); } });
}

// ── Playing ──────────────────────────────────────────────────────────────────
function apUpdatePlaying(dt) {
  const P = apPlayer;
  const kx = (apKeys.right ? 1 : 0) - (apKeys.left ? 1 : 0);
  const ky = (apKeys.down ? 1 : 0) - (apKeys.up ? 1 : 0);
  if (kx || ky) {
    P.x += kx * AP_KEY_SPEED * dt; P.y += ky * AP_KEY_SPEED * dt;
    if (kx) P.bankTo = kx;
  }
  P.x = apClamp(P.x, AP_MIN_X, AP_MAX_X); P.y = apClamp(P.y, AP_MIN_Y, AP_MAX_Y);
  P.bank += (P.bankTo - P.bank) * Math.min(1, dt * 12);
  P.bankTo *= Math.max(0, 1 - dt * 7);
  if (P.invuln > 0) P.invuln = Math.max(0, P.invuln - dt);
  if (P.wingT > 0) {
    P.wingT = Math.max(0, P.wingT - dt);
    if (P.wingT === 0) apCallout('WINGMEN HOME', P.x, P.y - 40, 12, AP_DIM);
  }
  // Wingmen ease into formation beside you
  const ease = Math.min(1, dt * 8);
  P.wingL.x += (P.x - 36 - P.wingL.x) * ease; P.wingL.y += (P.y + 16 - P.wingL.y) * ease;
  P.wingR.x += (P.x + 36 - P.wingR.x) * ease; P.wingR.y += (P.y + 16 - P.wingR.y) * ease;

  // Auto-fire
  P.fireT -= dt;
  if (P.fireT <= 0) { P.fireT += AP_FIRE_S; apFire(); }
  if (P.wingT > 0) {
    P.wingFireT -= dt;
    if (P.wingFireT <= 0) {
      P.wingFireT += AP_WING_FIRE_S;
      apShots.push({ x: P.wingL.x, y: P.wingL.y - 12, vx: 0, vy: -AP_SHOT_SPEED, wing: true });
      apShots.push({ x: P.wingR.x, y: P.wingR.y - 12, vx: 0, vy: -AP_SHOT_SPEED, wing: true });
    }
  }
  apMoveShots(dt);

  // TWILIGHT lightning — pure atmosphere, it never hurts you
  if (apLv.nightmare) {
    apBoltT -= dt;
    if (apBoltT <= 0) {
      apBoltT = apRand(4, 9);
      const pts = []; let x = apRand(40, AP_W - 40), y = -10;
      while (y < AP_H * 0.6) { pts.push([x, y]); x += apRand(-34, 34); y += apRand(30, 60); }
      apBolt = { pts, t: 0.22 };
      apFlash = { col: '230,215,255', t: 0.16, max: 0.16 };
      AP_SOUND.thunder();
    }
  }

  apDirector(dt);
  apUpdateWorld(dt, true);
  apCollide();
}

// Everything that keeps moving after the run ends too (the 'over' beat).
function apUpdateWorld(dt, live) {
  apFoes.forEach(f => apUpdateFoe(f, dt, live));
  apFoes = apFoes.filter(f => {
    if (f.dead) return false;
    if (f.t < 0) return true;
    const out = f.y > AP_H + 70 || f.y < -140 || f.x < -90 || f.x > AP_W + 90;
    if (out && f.form && apForms[f.form]) apForms[f.form].broken = true;
    return !out;
  });
  if (apBoss) apUpdateBoss(dt, live);
  apFoeShots.forEach(s => {
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.fuse !== undefined) {                 // FLAK: bursts mid-air into a ring
      s.fuse -= dt;
      if (s.fuse <= 0) {
        s.gone = true;
        apRing(s.x, s.y, '#FFB37A', 6, 120);
        const off = apRand(0, 1);
        for (let k = 0; k < 8; k++) apFoeShot(s.x, s.y, off + k * Math.PI / 4, apShotSpeed() * 0.6);
      }
    }
  });
  apFoeShots = apFoeShots.filter(s => !s.gone && s.y > -20 && s.y < AP_H + 20 && s.x > -20 && s.x < AP_W + 20);

  apDrops.forEach(d => { d.t += dt; d.y += d.vy * dt; d.x = d.x0 + 16 * Math.sin(d.t * 1.8); });
  apDrops = apDrops.filter(d => d.y < AP_H + 40);

  const P = apPlayer;
  const pull = live && (apPhase === 'clear');
  apStars.forEach(s => {
    s.spin += dt * 6;
    const dx = P.x - s.x, dy = P.y - s.y, d = Math.hypot(dx, dy) || 1;
    if (live && (d < AP_MAGNET_R || pull)) {
      const sp = pull ? 520 : 380;
      s.vx += (dx / d * sp - s.vx) * Math.min(1, dt * 7);
      s.vy += (dy / d * sp - s.vy) * Math.min(1, dt * 7);
    } else {
      s.vx *= Math.max(0, 1 - dt * 2.5);
      s.vy += (95 - s.vy) * Math.min(1, dt * 2);
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
  });
  apStars = apStars.filter(s => {
    if (s.y < AP_H + 14) return true;
    if (live) {
      if (apChain >= 5) apCallout('CHAIN BROKEN', apClamp(s.x, 60, AP_W - 60), AP_H - 40, 12, AP_DIM);
      apChain = 0;
    }
    return false;
  });
}

function apFire() {
  const P = apPlayer;
  for (const [dx, deg] of AP_GUNS[P.power]) {
    const a = deg * Math.PI / 180;
    apShots.push({ x: P.x + dx, y: P.y - 16, vx: Math.sin(a) * AP_SHOT_SPEED, vy: -Math.cos(a) * AP_SHOT_SPEED });
  }
}

// ── The director: waves, then the boss ───────────────────────────────────────
function apDirector(dt) {
  if (apPhase === 'waves') {
    apStageT += dt;
    apWaveT -= dt;
    if (apWaveT <= 0) {
      apSpawnWave();
      if (apLv.nightmare && Math.random() < 0.3) apSpawnWave();   // TWILIGHT: double waves
      apWaveT = Math.max(apLv.gapMin, apLv.gap - apStageT * 0.012);
    }
    apBalloonT -= dt;
    if (apBalloonT <= 0) { apSpawnBalloon(); apBalloonT = apRand(apLv.balloon[0], apLv.balloon[1]); }
    if (apStageT >= AP_STAGE_S) {
      apPhase = 'warn'; apPhaseT = 0;
      AP_SOUND.warn(); apLater(700, AP_SOUND.warn); apLater(1400, AP_SOUND.warn);
    }
  } else if (apPhase === 'warn') {
    apPhaseT += dt;
    if (apPhaseT >= 3.2) { apPhase = 'boss'; apPhaseT = 0; apSpawnBoss(); }
  } else if (apPhase === 'boss') {
    apPhaseT += dt;
    // a supply balloon now and then so a long fight isn't hopeless
    apBalloonT -= dt;
    if (apBalloonT <= 0) { apSpawnBalloon(); apBalloonT = apRand(apLv.balloon[0] + 3, apLv.balloon[1] + 4); }
  } else if (apPhase === 'clear') {
    apPhaseT += dt;
    if (apPhaseT >= 4.5) {
      apStage += 1; apLv = apLvlFor(apStage); apStageT = 0; apPhase = 'waves'; apWaveT = 1.5;
      apStageBanner();
    }
  }
}

function apStageBanner() {
  const L = apLv;
  if (L.nightmare && !L.lap) {
    AP_SOUND.twilight();
    apCallout('TWILIGHT', AP_W / 2, 246, 38, AP_DUSK, 3, 6);
    apCallout('BANDITS BITE BACK!', AP_W / 2, 286, 15, AP_PINK, 3, 6);
  } else if (L.lap) {
    AP_SOUND.twilight();
    apCallout(apStageName(apStage), AP_W / 2, 246, 32, AP_DUSK, 3, 6);
    apCallout('IT NEVER ENDS...', AP_W / 2, 284, 14, AP_CHALK, 3, 6);
  } else {
    AP_SOUND.stage();
    apCallout('STAGE ' + (apStage + 1), AP_W / 2, 246, 30, AP_GOLD, 2.4, 6);
    apCallout(L.name, AP_W / 2, 280, 16, AP_CHALK, 2.4, 6);
    if (L.fresh) apCallout('NEW BANDITS: ' + L.fresh, AP_W / 2, 306, 12, AP_PINK, 2.4, 6);
  }
}

function apSpawnWave() {
  const s = apStage, t = apStageT, pool = apLv.pool;
  const heavies = apFoes.filter(f => f.kind === 'bomber' || f.kind === 'copter' || f.kind === 'ace').length;
  const heavyOk = heavies < 2 + Math.floor(s / 2);
  const w = {
    darts:  pool.darts,
    swoop:  (t > 6 || s > 0) ? pool.swoop : 0,
    bomber: heavyOk && (t > 12 || s > 0) ? pool.bomber : 0,
    copter: heavyOk ? pool.copter : 0,
    divers: pool.divers,
    ace:    heavyOk ? pool.ace : 0,
  };
  let sum = 0; for (const k in w) sum += w[k];
  let r = Math.random() * sum, kind = 'darts';
  for (const k in w) { r -= w[k]; if (r <= 0 && w[k] > 0) { kind = k; break; } }
  if (kind === 'darts') apSpawnDarts();
  else if (kind === 'swoop') apSpawnSwoop();
  else if (kind === 'bomber') apSpawnBomber();
  else if (kind === 'copter') apSpawnCopter();
  else if (kind === 'ace') apSpawnAce();
  else apSpawnDivers();
}

function apNewFoe(kind, x, y, extra) {
  const f = Object.assign({ kind, x, y, t: 0, hp: apFoeHp(kind), r: AP_FOES[kind].r, flash: 0, ang: Math.PI }, extra);
  f.maxHp = f.hp;
  apFoes.push(f);
  return f;
}

function apSpawnDarts() {
  const n = 3 + Math.floor(apRand(0, 3 + Math.min(apStage, 3)));
  const style = apPick(['row', 'column', 'scatter']);
  const vy = 150 + apRand(0, 40) + Math.min(apStage, 6) * 20;
  const cx = apRand(70, AP_W - 70);
  for (let k = 0; k < n; k++) {
    let x, y;
    if (style === 'row') { x = AP_W / 2 + (k - (n - 1) / 2) * Math.min(60, 300 / n); y = -24 - Math.abs(k - (n - 1) / 2) * 22; }
    else if (style === 'column') { x = cx; y = -24 - k * 46; }
    else { x = apRand(30, AP_W - 30); y = -24 - k * 60; }
    apNewFoe('dart', x, y, { x0: x, vy, wob: style === 'scatter' ? apRand(10, 30) : 0, ph: apRand(0, 6),
      shoots: Math.random() < apLv.dartShoot, fired: false, fireY: apRand(90, 280) });
  }
}

function apSpawnSwoop() {
  const id = ++apFormId, n = 5;
  const path = apPick(['snake', 'sweep']);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const sweepY = apRand(70, 170);
  apForms[id] = { left: n, broken: false };
  for (let k = 0; k < n; k++) {
    // From MIDDAY on, some Swoopers take one aimed shot on the way past.
    const f = apNewFoe('swoop', -200, -200, { form: id, path, dir, sweepY, sp: 1 + Math.min(apStage, 6) * 0.1,
      shoots: apStage >= 1 && Math.random() < 0.18 * apLv.fire, fired: false, fireAt: apRand(0.8, 1.6) });
    f.t = -k * 0.3;   // queued: they enter one after another
  }
}

function apSpawnBomber() {
  apNewFoe('bomber', apRand(70, AP_W - 70), -44, { vy: 36 + Math.min(apStage, 6) * 5, fireT: 1.4 / apLv.fire });
}

function apSpawnCopter() {
  const cx = apRand(110, AP_W - 110);
  apNewFoe('copter', cx, -30, { cx, ty: apRand(95, 160), stay: 9, dir: Math.random() < 0.5 ? 1 : -1, fireT: 1.6 / apLv.fire });
}

function apSpawnDivers() {
  const n = apStage >= 3 ? 3 : 2;
  for (let k = 0; k < n; k++) {
    const x = AP_W * (k + 1) / (n + 1) + apRand(-20, 20);
    apNewFoe('diver', x, -26 - k * 20, { ty: apRand(70, 120), mode: 'in', vx: 0, vy: 0 });
  }
}

function apSpawnAce(x) {
  const cx = x || apRand(120, AP_W - 120);
  apNewFoe('ace', cx, -30, { cx, ty: apRand(90, 150), stay: 8, dir: Math.random() < 0.5 ? 1 : -1, fireT: 1.2, burst: 0, burstT: 0, vy: 0 });
}

function apSpawnBalloon() {
  const x = apRand(60, AP_W - 60);
  apNewFoe('balloon', x, -36, { x0: x, vy: 42, gores: apPick([['#E2574C', '#F8F4E8'], ['#3FB4F5', '#FFC93C'], ['#9B5DE5', '#F8F4E8'], ['#4CC46E', '#FFC93C']]) });
}

// Aimed shots from (x, y) at the player, with a fan of extra angles in degrees.
function apAimShots(x, y, spreads, speed, kind) {
  const base = Math.atan2(apPlayer.y - y, apPlayer.x - x);
  spreads.forEach(d => apFoeShot(x, y, base + d * Math.PI / 180, speed, kind));
}
function apFoeShot(x, y, a, speed, kind) {
  const s = { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  if (kind) s.kind = kind;
  apFoeShots.push(s);
  return s;
}

function apUpdateFoe(f, dt, live) {
  f.t += dt;
  if (f.flash > 0) f.flash -= dt;
  if (f.t < 0) return;                         // still queued off-screen
  const px = f.x, py = f.y;
  const onScreen = f.y > 10 && f.y < AP_H * 0.72;
  const F = apLv.fire;
  switch (f.kind) {
    case 'dart':
      f.y += f.vy * dt;
      f.x = f.x0 + f.wob * Math.sin(f.t * 3 + f.ph);
      if (live && f.shoots && !f.fired && f.y > f.fireY) { f.fired = true; apAimShots(f.x, f.y + 12, [0], apShotSpeed()); }
      break;
    case 'swoop': {
      const t = f.t * f.sp;
      if (f.path === 'snake') { f.x = AP_W / 2 + f.dir * 115 * Math.sin(t * 1.8); f.y = -24 + 150 * t; }
      else { f.x = (f.dir > 0 ? -24 : AP_W + 24) + f.dir * 175 * t; f.y = f.sweepY + 30 * t + 16 * Math.sin(t * 4); }
      if (live && f.shoots && !f.fired && f.t > f.fireAt && onScreen) { f.fired = true; apAimShots(f.x, f.y, [0], apShotSpeed()); }
      break;
    }
    case 'bomber':
      f.y += f.vy * dt;
      f.fireT -= dt;
      if (live && f.fireT <= 0 && onScreen) {
        f.fireT = 2 / F;
        apAimShots(f.x, f.y + 20, apStage >= 1 ? (apStage >= 3 ? [-20, -10, 0, 10, 20] : [-12, 0, 12]) : [0], apShotSpeed());
      }
      break;
    case 'copter':
      if (f.t < 1.6) f.y += (f.ty - f.y) * Math.min(1, dt * 2.5);
      else if (f.t < f.stay) f.x = f.cx + f.dir * 95 * Math.sin((f.t - 1.6) * 0.9);
      else f.y -= 90 * dt;
      f.fireT -= dt;
      if (live && f.fireT <= 0 && f.t > 1.6 && f.t < f.stay) {
        f.fireT = 2.2 / F;
        const fan = apStage >= 2 ? [-40, -20, 0, 20, 40] : [-25, 0, 25];
        fan.forEach(d => apFoeShot(f.x, f.y + 16, Math.PI / 2 + d * Math.PI / 180, apShotSpeed() * 0.95));
      }
      break;
    case 'diver':
      if (f.mode === 'in') { f.y += (f.ty - f.y) * Math.min(1, dt * 3); if (f.t > 1.1) f.mode = 'aim'; }
      else if (f.mode === 'aim') {
        if (f.t > 1.75) {
          const dx = apPlayer.x - f.x, dy = apPlayer.y - f.y, d = Math.hypot(dx, dy) || 1;
          const sp = 340 + Math.min(apStage, 6) * 30;
          f.vx = dx / d * sp; f.vy = dy / d * sp; f.mode = 'dash';
        }
      } else { f.x += f.vx * dt; f.y += f.vy * dt; }
      break;
    case 'ace':                                  // strafes along the top, fires 3-round bursts, then dives out
      if (f.t < 1.4) f.y += (f.ty - f.y) * Math.min(1, dt * 2.5);
      else if (f.t < f.stay) f.x = apClamp(f.cx + f.dir * 120 * Math.sin((f.t - 1.4) * 1.2), 24, AP_W - 24);
      else { f.vy += 500 * dt; f.y += f.vy * dt; }
      if (live && f.t > 1.4 && f.t < f.stay) {
        f.fireT -= dt;
        if (f.fireT <= 0 && f.burst === 0) { f.burst = 3; f.burstT = 0; f.fireT = 2.4 / F; }
        if (f.burst > 0) {
          f.burstT -= dt;
          if (f.burstT <= 0) { f.burst -= 1; f.burstT = 0.11; apAimShots(f.x, f.y + 14, [0], apShotSpeed() * 1.1); }
        }
      }
      break;
    case 'balloon':
      f.y += f.vy * dt;
      f.x = f.x0 + 18 * Math.sin(f.t * 1.3);
      break;
  }
  // face the way it's moving (darts/bombers/copters always look down)
  if (f.kind === 'swoop' || (f.kind === 'diver' && f.mode === 'dash')) {
    const vx = f.x - px, vy = f.y - py;
    if (Math.abs(vx) + Math.abs(vy) > 0.01) f.ang = Math.atan2(vx, -vy);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Bosses. Each entry in AP_BOSS_DEFS supplies:
//   name / short / busted   words for the warning, HUD bar and the win
//   init(b, mul)            set hp (× the sky's hp) and anything it needs
//   place(b)                optional: position sub-parts (runs every frame)
//   update(b, dt, live)     movement + attacks once it has arrived
//   hit(b, x, y)            → { p } (the thing with hp), { armor: true } (sparks, no damage), or null
//   body(b, x, y)           → true if the player at (x, y) is touching it
//   targets(b)              what a KABOOM can damage
//   span(b)                 { x, y, rx, ry } — where the death explosions go
//   draw(g, b) / shadow(g, b, colour)
// Multi-part bosses keep b.parts; b.hp is always the total, for the HUD bar.
// ═══════════════════════════════════════════════════════════════════════════
const AP_BLIMP_RX = 120, AP_BLIMP_RY = 40;

function apEllipseHit(x, y, cx, cy, rx, ry) { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; }
function apTurnTo(cur, want, k) {
  let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * k;
}
function apAngleTo(x, y) { return Math.atan2(apPlayer.y - y, apPlayer.x - x); }

const AP_BOSS_DEFS = {
  // ── 1. THE BIG BLIMP ──────────────────────────────────────────────────────
  blimp: {
    name: 'THE BIG BLIMP', short: 'BIG BLIMP', busted: 'BLIMP BUSTED!',
    init(b, mul) { b.hp = Math.round(360 * mul); b.ty = 126; b.ringOff = 0; b.sweepK = 0; b.aim = [Math.PI / 2, Math.PI / 2]; },
    turrets(b) { return [{ x: b.x - 78, y: b.y - 2 }, { x: b.x + 64, y: b.y - 2 }]; },
    update(b, dt, live) {
      b.x = AP_W / 2 + 62 * Math.sin((b.t - b.t0) * 0.55);
      const tur = this.turrets(b);
      if (b.pat !== 2) tur.forEach((p, k) => { b.aim[k] = apTurnTo(b.aim[k], apAngleTo(p.x, p.y), Math.min(1, dt * 4)); });
      const angry = b.hp < b.maxHp * 0.5;
      if (angry && Math.random() < dt * 7) apSmoke(b.x + apRand(-90, 90), b.y + apRand(-25, 25), 1);
      if (!live) return;
      b.patT += dt;
      if (b.patT > 5.2) { b.patT = 0; b.pat = (b.pat + 1) % 3; b.fireT = 0.9; }
      b.fireT -= dt * apLv.fire * (angry ? 1.25 : 1);
      if (b.fireT > 0) return;
      const sp = apShotSpeed();
      if (b.pat === 0) {                          // aimed bursts from the belly cannon
        apAimShots(b.x, b.y + 38, apStage >= 2 ? [-24, -12, 0, 12, 24] : [-14, 0, 14], sp * 1.05);
        b.fireT = 0.8;
      } else if (b.pat === 1) {                   // a ring, turning a little each time
        const n = 10 + 2 * Math.min(apStage, 4);
        b.ringOff += 0.27;
        for (let k = 0; k < n; k++) apFoeShot(b.x, b.y + 8, b.ringOff + k * Math.PI * 2 / n, sp * 0.8);
        b.fireT = 1.15;
      } else {                                    // the two turrets sweep back and forth
        b.sweepK ^= 1;
        const p = tur[b.sweepK];
        const a = Math.PI / 2 + 0.95 * Math.sin(b.patT * 2.2 + b.sweepK * Math.PI);
        b.aim[b.sweepK] = a;
        apFoeShot(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, a, sp * 1.05);
        b.fireT = 0.15;
      }
    },
    hit(b, x, y) { return apEllipseHit(x, y, b.x, b.y, AP_BLIMP_RX + 2, AP_BLIMP_RY + 2) ? { p: b } : null; },
    body(b, x, y) { return apEllipseHit(x, y, b.x, b.y, AP_BLIMP_RX - 6, AP_BLIMP_RY - 6); },
    targets(b) { return [b]; },
    span(b) { return { x: b.x, y: b.y, rx: 105, ry: 30 }; },
    shadow(g, b, sc) { g.fillStyle = sc; g.beginPath(); g.ellipse(b.x + 24, b.y + 48, AP_BLIMP_RX, AP_BLIMP_RY, 0, 0, Math.PI * 2); g.fill(); },
    draw(g, b) { apDrawBlimp(g, b); },
  },

  // ── 2. THE BUZZ BROTHERS ──────────────────────────────────────────────────
  buzz: {
    name: 'THE BUZZ BROTHERS', short: 'BUZZ BROS', busted: 'BROTHERS GROUNDED!',
    init(b, mul) {
      const hp = Math.round(170 * mul);
      b.ty = 150; b.spin = 0; b.k = 0; b.spd = 0.8;
      b.parts = [-1, 1].map(side => ({ side, hp, maxHp: hp, flash: 0, dead: false, x: AP_W / 2 + side * 95, y: -60, rot: 0,
                                       body: side < 0 ? '#F28C28' : '#2BA8C8', dark: side < 0 ? '#C0661A' : '#1D7C96' }));
      b.hp = hp * 2;
    },
    place(b) {
      const a = b.entered ? (b.t - b.t0) * b.spd : 0;
      b.parts.forEach(p => { if (p.dead) return; p.x = AP_W / 2 + p.side * 95 * Math.cos(a); p.y = b.y + p.side * 40 * Math.sin(2 * a); });
    },
    update(b, dt, live) {
      // spd changes when one goes down; keep the phase smooth by re-basing t0
      const alive = b.parts.filter(p => !p.dead);
      const want = alive.length === 1 ? 1.25 : 0.8;
      if (want !== b.spd) { const a = (b.t - b.t0) * b.spd; b.spd = want; b.t0 = b.t - a / want; }
      this.place(b);
      if (!live) return;
      const mad = alive.length === 1;
      b.patT += dt;
      if (b.patT > 4.5) { b.patT = 0; b.pat = (b.pat + 1) % 3; b.fireT = 0.7; }
      b.fireT -= dt * apLv.fire * (mad ? 1.3 : 1);
      const sp = apShotSpeed();
      if (mad) {                                  // the angry one adds a spinning spray
        b.spinT = (b.spinT || 0) - dt * apLv.fire;
        if (b.spinT <= 0) { b.spinT = 0.11; b.spin += 0.47; apFoeShot(alive[0].x, alive[0].y, b.spin, sp * 0.75); apFoeShot(alive[0].x, alive[0].y, b.spin + Math.PI, sp * 0.75); }
      }
      if (b.fireT > 0) return;
      b.k = (b.k + 1) % alive.length;
      const p = alive[b.k];
      if (b.pat === 0) {                          // downward fans, taking turns
        const n = apStage >= 3 ? 7 : 5;
        for (let i = 0; i < n; i++) apFoeShot(p.x, p.y + 20, Math.PI / 2 + (i - (n - 1) / 2) * 0.2, sp * 0.95);
        b.fireT = 0.85;
      } else if (b.pat === 1) {                   // crossfire: aimed shots from each side in turn
        apAimShots(p.x, p.y + 10, [0], sp * 1.15);
        b.fireT = 0.14;
      } else {                                    // rotor wash: rings
        const n = 10 + 2 * Math.min(apStage, 4), off = apRand(0, 1);
        for (let i = 0; i < n; i++) apFoeShot(p.x, p.y, off + i * Math.PI * 2 / n, sp * 0.75);
        b.fireT = 1.0;
      }
    },
    partDown(b, p) {
      apExplode(p.x, p.y, 3); AP_SOUND.boom(); apShake = 0.4;
      b.lastX = p.x; b.lastY = p.y;
      for (let k = 0; k < 8; k++) apSpawnStar(p.x, p.y);
      if (b.parts.some(q => !q.dead)) {
        apCallout('ONE DOWN!', p.x, p.y - 30, 18, AP_GOLD, 1.4);
        apCallout("THE OTHER ONE'S MAD!", AP_W / 2, 300, 14, AP_PINK, 1.8, 6);
        AP_SOUND.phase();
      }
    },
    hit(b, x, y) { for (const p of b.parts) if (!p.dead && Math.hypot(x - p.x, y - p.y) < 30) return { p }; return null; },
    body(b, x, y) { return b.parts.some(p => !p.dead && Math.hypot(x - p.x, y - p.y) < 22 + AP_HIT_R); },
    targets(b) { return b.parts.filter(p => !p.dead); },
    span(b) { return { x: b.lastX || b.x, y: b.lastY || b.y, rx: 30, ry: 30 }; },
    shadow(g, b, sc) { g.fillStyle = sc; b.parts.forEach(p => { if (!p.dead) { g.beginPath(); g.ellipse(p.x + 20, p.y + 34, 24, 28, 0, 0, Math.PI * 2); g.fill(); } }); },
    draw(g, b) {
      b.parts.forEach(p => {
        if (p.dead) return;
        const mad = b.parts.some(q => q.dead);
        apDrawCopterAt(g, p.x, p.y, 1.8, p.body, p.dark, mad);
        if (p.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(p.x, p.y, 24, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(10,18,36,0.6)'; g.fillRect(p.x - 26, p.y - 62, 52, 5);
        g.fillStyle = mad ? AP_RED : AP_GOLD; g.fillRect(p.x - 26, p.y - 62, 52 * p.hp / p.maxHp, 5);
      });
    },
  },

  // ── 3. THE IRONCLAD ───────────────────────────────────────────────────────
  // Down on the sea, so it can't ram you, and shots that miss its turrets fly
  // straight past. The bridge is armoured until all four turrets are gone.
  ironclad: {
    name: 'THE IRONCLAD', short: 'IRONCLAD', busted: 'IRONCLAD SUNK!', sinks: true,
    init(b, mul) {
      const th = Math.round(55 * mul);
      b.ty = 215; b.y = -220; b.exposed = false; b.spin = 0;
      b.parts = [
        { kind: 'flak', oy: -112, hp: th, maxHp: th, flash: 0, dead: false, aim: Math.PI / 2, fireT: 1.0 },
        { kind: 'twin', oy: -52,  hp: th, maxHp: th, flash: 0, dead: false, aim: Math.PI / 2, fireT: 1.6 },
        { kind: 'twin', oy: 52,   hp: th, maxHp: th, flash: 0, dead: false, aim: Math.PI / 2, fireT: 0.8 },
        { kind: 'gat',  oy: 112,  hp: th, maxHp: th, flash: 0, dead: false, aim: Math.PI / 2, fireT: 2.0 },
        { kind: 'bridge', oy: 0, hp: Math.round(180 * mul), maxHp: Math.round(180 * mul), flash: 0, dead: false, fireT: 1.5 },
      ];
      b.hp = b.parts.reduce((s, p) => s + p.hp, 0);
    },
    place(b) { b.parts.forEach(p => { p.x = b.x; p.y = b.y + p.oy; }); },
    update(b, dt, live) {
      b.x = AP_W / 2 + 60 * Math.sin((b.t - b.t0) * 0.35);
      this.place(b);
      const sp = apShotSpeed(), F = apLv.fire;
      for (const p of b.parts) {
        if (p.dead) continue;
        if (p.kind !== 'bridge' && p.kind !== 'gat') p.aim = apTurnTo(p.aim, apAngleTo(p.x, p.y), Math.min(1, dt * 3));
        if (!live) continue;
        if (p.kind === 'bridge' && !b.exposed) continue;
        p.fireT -= dt * F;
        if (p.kind === 'gat') {                   // stern gatling sweeps side to side
          p.aim = Math.PI / 2 + 0.85 * Math.sin((b.t - b.t0) * 1.5);
          if (p.fireT <= 0) { p.fireT = 0.14; apFoeShot(p.x + Math.cos(p.aim) * 16, p.y + Math.sin(p.aim) * 16, p.aim, sp); }
        } else if (p.kind === 'twin' && p.fireT <= 0) {   // two side-by-side aimed shots
          p.fireT = 1.5;
          const nx = -Math.sin(p.aim) * 5, ny = Math.cos(p.aim) * 5;
          apFoeShot(p.x + nx + Math.cos(p.aim) * 18, p.y + ny + Math.sin(p.aim) * 18, p.aim, sp * 1.05);
          apFoeShot(p.x - nx + Math.cos(p.aim) * 18, p.y - ny + Math.sin(p.aim) * 18, p.aim, sp * 1.05);
        } else if (p.kind === 'flak' && p.fireT <= 0) {   // a FLAK shell that bursts near you
          p.fireT = 2.2;
          const d = Math.hypot(apPlayer.x - p.x, apPlayer.y - p.y), v = sp * 0.85;
          const s = apFoeShot(p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18, p.aim, v, 'flak');
          s.fuse = apClamp(d / v * 0.75, 0.5, 1.8);
        } else if (p.kind === 'bridge') {           // exposed bridge: twin spiral + aimed fans
          b.spinT = (b.spinT || 0) - dt * F;
          if (b.spinT <= 0) { b.spinT = 0.1; b.spin += 0.31; apFoeShot(p.x, p.y, b.spin, sp * 0.7); apFoeShot(p.x, p.y, b.spin + Math.PI, sp * 0.7); }
          if (p.fireT <= 0) { p.fireT = 1.6; apAimShots(p.x, p.y, [-24, -12, 0, 12, 24], sp); }
        }
      }
    },
    partDown(b, p) {
      apExplode(p.x, p.y, 2); AP_SOUND.boom();
      if (p.kind === 'bridge') return;
      apScore += 300; apCallout('TURRET DOWN  +300', p.x, p.y - 20, 12, AP_GOLD, 1.1);
      for (let k = 0; k < 3; k++) apSpawnStar(p.x, p.y);
      if (!b.exposed && b.parts.every(q => q.kind === 'bridge' || q.dead)) {
        b.exposed = true;
        apCallout('BRIDGE EXPOSED!', AP_W / 2, 330, 18, AP_PINK, 1.8, 6);
        AP_SOUND.phase();
      }
    },
    hit(b, x, y) {
      for (const p of b.parts) {
        if (p.dead) continue;
        // Shuttered, the bridge can't be hit — shots fly over it to the turrets behind.
        if (p.kind === 'bridge') { if (b.exposed && Math.abs(x - p.x) < 24 && Math.abs(y - p.y) < 22) return { p }; }
        else if (Math.hypot(x - p.x, y - p.y) < 17) return { p };
      }
      return null;
    },
    body() { return false; },
    targets(b) { return b.parts.filter(p => !p.dead && (p.kind !== 'bridge' || b.exposed)); },
    span(b) { return { x: b.x, y: b.y, rx: 34, ry: 130 }; },
    shadow() {},
    draw(g, b) { apDrawIronclad(g, b); },
  },

  // ── 4. THE NIGHT OWL ──────────────────────────────────────────────────────
  // attack (feather fans + laser beam) → vanish → hidden (only eyes, glides to a
  // new spot; can't be hit) → appear (HOO HOO! ring) → attack …
  owl: {
    name: 'THE NIGHT OWL', short: 'NIGHT OWL', busted: 'OWL OUTFOXED!',
    init(b, mul) { b.hp = Math.round(380 * mul); b.ty = 140; b.vis = 1; b.mode = 'attack'; b.modeT = 0; b.beams = []; b.tx = AP_W / 2; b.fanT = 1; },
    update(b, dt, live) {
      b.modeT += dt;
      b.x += (b.tx + (b.mode === 'attack' ? 22 * Math.sin(b.t * 1.4) : 0) - b.x) * Math.min(1, dt * (b.mode === 'hidden' ? 2.2 : 3));
      const angry = b.hp < b.maxHp * 0.5, sp = apShotSpeed();
      // beams: warn (thin line) → fire (wide column) → gone
      b.beams.forEach(bm => {
        bm.t += dt;
        if (bm.st === 'warn' && bm.t > 0.9) { bm.st = 'fire'; bm.t = 0; AP_SOUND.laser(); apShake = Math.max(apShake, 0.2); }
        else if (bm.st === 'fire' && bm.t > 0.65) bm.st = 'done';
      });
      b.beams = b.beams.filter(bm => bm.st !== 'done');
      if (b.mode === 'attack') {
        b.vis = Math.min(1, b.vis + dt * 3);
        if (live) {
          b.fanT -= dt * apLv.fire;
          if (b.fanT <= 0) {                       // a fan of feathers
            b.fanT = 1.15;
            const n = angry ? 9 : 7;
            for (let i = 0; i < n; i++) apFoeShot(b.x, b.y + 20, Math.PI / 2 + (i - (n - 1) / 2) * 0.17, sp * 0.9, 'feather');
          }
          if (!b.beamed1 && b.modeT > 1.0) { b.beamed1 = true; b.beams.push({ x: apPlayer.x, st: 'warn', t: 0 }); }
          if (angry && !b.beamed2 && b.modeT > 2.4) { b.beamed2 = true; b.beams.push({ x: apPlayer.x, st: 'warn', t: 0 }); }
        }
        if (b.modeT > (angry ? 4.6 : 4.2) && !b.beams.length) { b.mode = 'vanish'; b.modeT = 0; }
      } else if (b.mode === 'vanish') {
        b.vis = Math.max(0, b.vis - dt * 2.2);
        if (b.modeT > 0.5) { b.mode = 'hidden'; b.modeT = 0; let nx; do { nx = apRand(90, AP_W - 90); } while (Math.abs(nx - b.x) < 70); b.tx = nx; }
      } else if (b.mode === 'hidden') {
        b.vis = 0;
        if (b.modeT > 1.2) { b.mode = 'appear'; b.modeT = 0; }
      } else if (b.mode === 'appear') {
        b.vis = Math.min(1, b.vis + dt * 2.2);
        if (b.modeT > 0.5) {
          b.mode = 'attack'; b.modeT = 0; b.beamed1 = b.beamed2 = false; b.fanT = 0.5;
          if (live) {
            AP_SOUND.hoot(); apCallout('HOO HOO!', b.x, b.y - 40, 15, AP_GOLD, 1);
            const n = 12 + 2 * Math.min(apStage, 4), off = apRand(0, 1);
            for (let i = 0; i < n; i++) apFoeShot(b.x, b.y, off + i * Math.PI * 2 / n, sp * 0.7, 'feather');
          }
        }
      }
    },
    beamHits(b, x, y) { return b.beams.some(bm => bm.st === 'fire' && Math.abs(x - bm.x) < 22 + AP_HIT_R && y > b.y); },
    hit(b, x, y) { return b.vis > 0.5 && (apEllipseHit(x, y, b.x, b.y - 2, 112, 22) || Math.hypot(x - b.x, y - b.y) < 30) ? { p: b } : null; },
    body(b, x, y) { return b.vis > 0.5 && (apEllipseHit(x, y, b.x, b.y - 2, 100, 14) || Math.hypot(x - b.x, y - b.y) < 22 + AP_HIT_R); },
    targets(b) { return b.vis > 0.5 ? [b] : []; },
    span(b) { return { x: b.x, y: b.y, rx: 90, ry: 20 }; },
    shadow(g, b, sc) { if (b.vis < 0.05) return; g.globalAlpha = b.vis; g.fillStyle = sc; g.beginPath(); g.ellipse(b.x + 24, b.y + 46, 110, 22, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; },
    draw(g, b) { apDrawOwl(g, b); },
  },

  // ── 5. THE DREAD BARON ────────────────────────────────────────────────────
  baron: {
    name: 'THE DREAD BARON', short: 'DREAD BARON', busted: 'THE BARON IS DOWN!',
    init(b, mul) { b.hp = Math.round(680 * mul); b.ty = 150; b.phase = 1; b.spin = 0; b.dirSpin = 1; b.gunK = 0; b.burst = 0; b.fanT = 2; b.pause = 0; b.spawnT = 5; },
    update(b, dt, live) {
      b.x = AP_W / 2 + 105 * Math.sin((b.t - b.t0) * (b.phase === 3 ? 0.85 : 0.6));
      const r = b.hp / b.maxHp;
      if (b.phase === 1 && r < 0.66) this.toPhase(b, 2);
      else if (b.phase === 2 && r < 0.33) this.toPhase(b, 3);
      if (b.phase === 3 && Math.random() < dt * 8) apSmoke(b.x + apRand(-80, 80), b.y + apRand(-30, 10), 1);
      if (!live) return;
      if (b.pause > 0) { b.pause -= dt; return; }
      const F = apLv.fire, sp = apShotSpeed();
      if (b.phase === 1) {
        // twin guns: bursts of six alternating shots, then a breather
        b.fireT -= dt * F;
        if (b.fireT <= 0) {
          if (b.burst <= 0) { b.burst = 6; }
          b.gunK ^= 1; b.burst -= 1;
          apAimShots(b.x + (b.gunK ? 28 : -28), b.y + 48, [0], sp * 1.15);
          b.fireT = b.burst > 0 ? 0.1 : 0.9;
        }
        b.fanT -= dt * F;
        if (b.fanT <= 0) { b.fanT = 2.6; for (let i = 0; i < 9; i++) apFoeShot(b.x, b.y + 40, Math.PI / 2 + (i - 4) * 0.26, sp * 0.85); }
      } else {
        // spiral arms from the nose: two in phase 2, three (reversing) in DREAD MODE
        const arms = b.phase === 2 ? 2 : 3;
        b.spinT = (b.spinT || 0) - dt * F;
        if (b.spinT <= 0) {
          b.spinT = b.phase === 2 ? 0.085 : 0.08;
          b.spin += 0.23 * b.dirSpin;
          for (let k = 0; k < arms; k++) apFoeShot(b.x, b.y + 30, b.spin + k * Math.PI * 2 / arms, sp * (b.phase === 2 ? 0.68 : 0.74));
        }
        if (b.phase === 3) { b.revT = (b.revT || 0) + dt; if (b.revT > 2.5) { b.revT = 0; b.dirSpin *= -1; } }
        b.fanT -= dt * F;
        if (b.fanT <= 0) { b.fanT = b.phase === 2 ? 1.5 : 1.25; apAimShots(b.x, b.y + 48, b.phase === 2 ? [-14, 0, 14] : [-24, -12, 0, 12, 24], sp * 1.05); }
        b.spawnT -= dt;
        if (b.spawnT <= 0) {                        // calls in escorts
          b.spawnT = b.phase === 2 ? 9 : 7;
          if (b.phase === 2) { apSpawnAce(70); apSpawnAce(AP_W - 70); } else apSpawnDivers();
        }
      }
    },
    toPhase(b, n) {
      b.phase = n; b.pause = 1.3; b.spawnT = 0.6; b.fanT = 1.5;
      apFizzleShots();
      apShake = 0.5; AP_SOUND.phase();
      apFlash = { col: '226,87,76', t: 0.3, max: 0.3 };
      if (n === 2) apCallout('THE BARON IS ANGRY!', AP_W / 2, 300, 18, AP_PINK, 2, 6);
      else apCallout('DREAD MODE!', AP_W / 2, 300, 28, AP_RED, 2.2, 6);
    },
    hit(b, x, y) { return (apEllipseHit(x, y, b.x, b.y - 12, 118, 26) || apEllipseHit(x, y, b.x, b.y - 18, 22, 64)) ? { p: b } : null; },
    body(b, x, y) { return apEllipseHit(x, y, b.x, b.y - 12, 108, 18) || apEllipseHit(x, y, b.x, b.y - 18, 14, 56); },
    targets(b) { return [b]; },
    span(b) { return { x: b.x, y: b.y - 12, rx: 100, ry: 30 }; },
    shadow(g, b, sc) { apDrawBaron(g, b, sc, b.x + 26, b.y + 50); },
    draw(g, b) { apDrawBaron(g, b, null, b.x, b.y); },
  },
};

function apSpawnBoss() {
  const kind = apLv.boss, def = AP_BOSS_DEFS[kind];
  const b = { kind, x: AP_W / 2, y: -100, t: 0, t0: 0, entered: false, dying: false, dieT: 0, flash: 0, fireT: 1.2, pat: 0, patT: 0 };
  def.init(b, apLv.hp);
  b.maxHp = b.hp;
  apBoss = b;
}

function apUpdateBoss(dt, live) {
  const b = apBoss, def = AP_BOSS_DEFS[b.kind];
  b.t += dt;
  if (b.flash > 0) b.flash -= dt;
  if (b.parts) b.parts.forEach(p => { if (p.flash > 0) p.flash -= dt; });
  if (b.dying) {
    b.dieT += dt;
    if (def.sinks) b.y += 8 * dt;
    else { b.y += 24 * dt; b.x += Math.sin(b.dieT * 9) * 30 * dt; }
    if (def.place) def.place(b);
    const sp = def.span(b);
    if (Math.random() < dt * 30) apSmoke(sp.x + apRand(-sp.rx, sp.rx), sp.y + apRand(-sp.ry, sp.ry), 1.4);
    return;
  }
  if (!b.entered) {
    b.y += (b.ty - b.y) * Math.min(1, dt * 1.3);
    if (def.place) def.place(b);
    if (b.y > b.ty - 5) { b.entered = true; b.t0 = b.t; }
    return;
  }
  def.update.call(def, b, dt, live);
}

// ── Collisions ───────────────────────────────────────────────────────────────
function apCollide() {
  const P = apPlayer;
  const bossDef = apBoss && AP_BOSS_DEFS[apBoss.kind];
  const bossLive = apBoss && apBoss.entered && !apBoss.dying;
  // your shots vs Bandits and the boss
  for (const s of apShots) {
    if (s.dead) continue;
    for (const f of apFoes) {
      if (f.t < 0 || f.dead) continue;
      const dx = s.x - f.x, dy = s.y - f.y, r = f.r + 4;
      if (dx * dx + dy * dy > r * r) continue;
      s.dead = true;
      apDamageFoe(f, 1, s.x, s.y);
      break;
    }
    if (s.dead || !bossLive || apBoss.dying) continue;
    const h = bossDef.hit(apBoss, s.x, s.y);
    if (h) { s.dead = true; apDamageBoss(h, 1, s.x, s.y); }
  }
  apShots = apShots.filter(s => !s.dead);

  // Crates are collected after the filter: a KABOOM can drop new crates, which
  // must not be lost by being pushed into the array mid-filter.
  const got = [];
  apDrops = apDrops.filter(d => {
    if (Math.hypot(d.x - P.x, d.y - P.y) > AP_GRAB_R + 4) return true;
    got.push(d);
    return false;
  });
  got.forEach(d => apCollect(d.kind, d.x, d.y));
  apStars = apStars.filter(s => {
    if (Math.hypot(s.x - P.x, s.y - P.y) > AP_GRAB_R - 6) return true;
    apChain += 1; apBestChain = Math.max(apBestChain, apChain);
    apScore += 10 * apChainMul();
    if (apChain % 10 === 0 && apChain <= 40) apCallout('STAR CHAIN x' + apChainMul(), P.x, P.y - 46, 15, AP_GOLD, 1.1);
    if (apTingT <= 0) { playSecretBeep(AP_STAR_PITCH[apChainMul() - 1]); apTingT = 0.07; }
    apSparkle(s.x, s.y, AP_GOLD, 4);
    return false;
  });

  if (P.invuln > 0) return;
  // enemy bullets
  const rr = AP_HIT_R + 5;
  for (const s of apFoeShots) {
    const dx = s.x - P.x, dy = s.y - P.y;
    if (dx * dx + dy * dy <= rr * rr) { s.gone = true; apPlayerHit(); return; }
  }
  // ramming a Bandit (it comes off worse)
  for (const f of apFoes) {
    if (f.t < 0 || f.dead || f.kind === 'balloon') continue;
    const dx = f.x - P.x, dy = f.y - P.y, r = f.r * 0.8 + AP_HIT_R;
    if (dx * dx + dy * dy <= r * r) { apDamageFoe(f, 12, f.x, f.y); apPlayerHit(); return; }
  }
  if (bossLive) {
    if (bossDef.body(apBoss, P.x, P.y)) { apPlayerHit(); return; }
    if (bossDef.beamHits && bossDef.beamHits(apBoss, P.x, P.y)) { apPlayerHit(); return; }
  }
}

function apDamageFoe(f, dmg, x, y, noBite) {
  f.hp -= dmg;
  f.flash = 0.08;
  if (f.hp > 0) { apSparkle(x, y, '#FFF2B0', 2); return; }
  f.dead = true;
  const st = AP_FOES[f.kind];
  apScore += st.pts;
  const big = f.kind === 'bomber' || f.kind === 'copter' || f.kind === 'ace';
  if (f.kind === 'balloon') {
    apPop(f);
    apSpawnDrop(f.x, f.y);
    apCallout('SUPPLIES!', f.x, f.y - 20, 13, AP_CHALK);
    AP_SOUND.pop();
  } else {
    apExplode(f.x, f.y, big ? 2 : 1);
    if (big) AP_SOUND.boom(); else AP_SOUND.pop();
    apCallout('+' + st.pts, f.x, f.y - 10, big ? 14 : 11, big ? AP_GOLD : AP_CHALK, 0.7);
    for (let k = 0; k < st.stars; k++) apSpawnStar(f.x, f.y);
    if (f.kind === 'bomber' && Math.random() < 0.5) apSpawnDrop(f.x, f.y);
    if ((f.kind === 'copter' || f.kind === 'ace') && Math.random() < 0.3) apSpawnDrop(f.x, f.y);
    // TWILIGHT: Bandits bite back — a ring of slow bullets as they go down.
    // Not when they're already right on top of you, and not from a KABOOM.
    if (apLv.nightmare && !noBite && apState === 'playing' && f.y < apPlayer.y - 70) {
      const n = st.bite, off = apRand(0, 1), sp = apShotSpeed() * 0.55;
      for (let k = 0; k < n; k++) apFoeShot(f.x, f.y, off + k * Math.PI * 2 / n, sp);
    }
  }
  if (f.form && apForms[f.form]) {
    const fm = apForms[f.form];
    fm.left -= 1;
    if (fm.left === 0) {
      if (!fm.broken) {
        apScore += 500;
        apCallout('FORMATION!  +500', apClamp(f.x, 90, AP_W - 90), f.y - 30, 16, AP_GOLD, 1.3);
        AP_SOUND.formation();
        apSpawnDrop(apClamp(f.x, 40, AP_W - 40), Math.max(f.y, 40));
      }
      delete apForms[f.form];
    }
  }
}

function apDamageBoss(h, dmg, x, y) {
  const b = apBoss;
  if (!b || b.dying) return;
  const def = AP_BOSS_DEFS[b.kind];
  if (h.armor) {                                  // armour: sparks and a tink, no damage
    if (Math.random() < 0.35) { apSparkle(x, y, '#C8CDD6', 2); if (apTingT <= 0) { AP_SOUND.tink(); apTingT = 0.12; } }
    return;
  }
  const p = h.p;
  p.hp -= dmg; p.flash = 0.06;
  apScore += 5 * dmg;
  if (Math.random() < 0.5) apSparkle(x, y, '#FFF2B0', 2);
  if (p !== b) {
    if (p.hp <= 0 && !p.dead) { p.hp = 0; p.dead = true; if (def.partDown) def.partDown(b, p); }
    b.hp = b.parts.reduce((s, q) => s + Math.max(0, q.hp), 0);
  }
  if (b.hp <= 0) apBossDefeated();
}

function apBossDefeated() {
  const b = apBoss, def = AP_BOSS_DEFS[b.kind];
  b.hp = 0; b.dying = true; b.dieT = 0;
  if (b.beams) b.beams = [];
  if (b.kind === 'owl') b.vis = 1;
  const bonus = 5000 * (apStage + 1);
  apScore += bonus;
  apFizzleShots();
  apCallout(def.busted, AP_W / 2, 250, def.busted.length > 14 ? 24 : 30, AP_GOLD, 2.6, 6);
  apCallout('+' + bonus, AP_W / 2, 288, 18, AP_CHALK, 2.6, 6);
  apShake = 0.5;
  for (let k = 0; k < 14; k++) apLater(k * 150, () => {
    if (apBoss !== b) return;
    const sp = def.span(b);
    apExplode(sp.x + apRand(-sp.rx, sp.rx), sp.y + apRand(-sp.ry, sp.ry), 1);
    if (k % 3 === 0) AP_SOUND.boom();
  });
  apLater(2300, () => {
    if (apBoss !== b) return;
    const sp = def.span(b);
    apExplode(sp.x, sp.y, 4); apShake = 0.7;
    apFlash = { col: '255,255,255', t: 0.35, max: 0.35 };
    AP_SOUND.bossDown();
    const cy = apClamp(sp.y, 60, 400);
    for (let k = 0; k < 30; k++) apSpawnStar(sp.x + apRand(-90, 90), cy + apRand(-20, 20));
    apSpawnDrop(sp.x - 40, cy, 'power');
    apSpawnDrop(sp.x + 40, cy, apPlayer.lives < AP_MAX_LIVES ? 'heart' : 'shield');
    apBoss = null;
    apPhase = 'clear'; apPhaseT = 0;
    apTodFrom = apLv.tod; apTodTo = apLvlFor(apStage + 1).tod; apTodT = 0;
  });
}

function apPlayerHit() {
  const P = apPlayer;
  if (P.shield) {
    P.shield = false; P.invuln = 1.0;
    AP_SOUND.shieldPop();
    apRing(P.x, P.y, '#9BDCFF', 26, 160);
    apSparkle(P.x, P.y, '#9BDCFF', 14);
    apCallout('SHIELD POP!', P.x, P.y - 44, 14, '#9BDCFF');
    apFizzleShots(P.x, P.y, 140);
    return;
  }
  P.lives -= 1;
  P.power = Math.max(1, P.power - 1);
  P.invuln = AP_INVULN_S;
  apShake = 0.4;
  apFlash = { col: '226,87,76', t: 0.25, max: 0.25 };
  AP_SOUND.hit();
  apExplode(P.x, P.y, 1);
  if (apLv.nightmare) apFizzleShots(P.x, P.y, 170); else apFizzleShots();
  if (P.lives <= 0) { apGameOver(); return; }
  apCallout('OOPS!', P.x, P.y - 44, 18, AP_RED);
}

// Enemy bullets fizzle into puffs — on a hit, a shield pop (nearby only), or a KABOOM.
function apFizzleShots(x, y, radius) {
  apFoeShots = apFoeShots.filter(s => {
    if (radius && Math.hypot(s.x - x, s.y - y) > radius) return true;
    apParts.push({ type: 'smoke', x: s.x, y: s.y, vx: 0, vy: -10, r: 3, grow: 14, life: 0.35, max: 0.35, col: '255,255,255' });
    return false;
  });
}

// ── Crates ───────────────────────────────────────────────────────────────────
function apSpawnDrop(x, y, kind) {
  apDrops.push({ kind: kind || apPickDrop(), x0: apClamp(x, 30, AP_W - 30), x, y: Math.max(y, -10), vy: 52, t: Math.random() * 3 });
}

function apPickDrop() {
  const P = apPlayer;
  const w = {
    power:  P.power < AP_MAX_POWER ? 5 : 1,
    shield: P.shield ? 0.5 : 2,
    wing:   P.wingT > 3 ? 0.5 : 2,
    kaboom: 1.3,
    heart:  P.lives < AP_MAX_LIVES ? (P.lives <= 1 ? 2.5 : 0.8) * (apLv.nightmare ? 0.4 : 1) : 0,
  };
  let sum = 0; for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k of AP_DROP_ORDER) { r -= w[k]; if (r <= 0 && w[k] > 0) return k; }
  return 'power';
}

function apCollect(kind, x, y) {
  const P = apPlayer;
  AP_SOUND.powerup();
  apSparkle(x, y, AP_DROPS[kind].col, 12);
  apRing(x, y, AP_DROPS[kind].col, 14, 120);
  let text = AP_DROPS[kind].label + '!';
  if (kind === 'power') {
    if (P.power < AP_MAX_POWER) { P.power += 1; text = P.power === AP_MAX_POWER ? 'MAX POWER!' : 'POWER UP!'; }
    else { apScore += 1000; text = 'MAXED! +1000'; }
  } else if (kind === 'shield') {
    if (P.shield) { apScore += 500; text = 'SHIELD +500'; }
    P.shield = true;
  } else if (kind === 'wing') {
    if (P.wingT <= 0) { P.wingL.x = P.x - 36; P.wingL.y = P.y + 70; P.wingR.x = P.x + 36; P.wingR.y = P.y + 70; }
    P.wingT = AP_WING_S;
  } else if (kind === 'kaboom') {
    apKaboom(); text = 'KABOOM!';
  } else if (kind === 'heart') {
    P.lives = Math.min(AP_MAX_LIVES, P.lives + 1); text = 'EXTRA LIFE!';
  }
  apCallout(text, apClamp(P.x, 80, AP_W - 80), P.y - 48, 17, AP_DROPS[kind].col, 1.2);
}

function apKaboom() {
  const P = apPlayer;
  AP_SOUND.kaboom();
  apFlash = { col: '255,255,255', t: 0.5, max: 0.5 };
  apShake = 0.5;
  apRing(P.x, P.y, '#FFE08A', 20, 700);
  apRing(P.x, P.y, '#FFFFFF', 10, 520);
  apFizzleShots();
  apFoes.forEach(f => { if (f.t >= 0 && !f.dead && f.y > -20 && f.kind !== 'balloon') apDamageFoe(f, 25, f.x, f.y, true); });
  if (apBoss && apBoss.entered && !apBoss.dying) {
    const ts = AP_BOSS_DEFS[apBoss.kind].targets(apBoss);
    const each = Math.max(10, Math.round(40 / Math.max(1, ts.length)));
    ts.forEach(p => apDamageBoss({ p }, each, p.x || apBoss.x, p.y || apBoss.y));
  }
}

function apSpawnStar(x, y) {
  apStars.push({ x, y, vx: apRand(-80, 80), vy: apRand(-110, -30), spin: apRand(0, 6) });
}

// ── Particles ────────────────────────────────────────────────────────────────
function apSparkle(x, y, col, n) {
  for (let k = 0; k < n; k++) {
    const a = apRand(0, Math.PI * 2), s = apRand(40, 150);
    apParts.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: apRand(0.25, 0.5), max: 0.5, col, drag: 3 });
  }
}
function apRing(x, y, col, r, grow) { apParts.push({ type: 'ring', x, y, vx: 0, vy: 0, r, grow, life: 0.45, max: 0.45, col }); }
function apSmoke(x, y, size) {
  apParts.push({ type: 'smoke', x, y, vx: apRand(-10, 10), vy: apRand(-30, -10), r: 5 * size, grow: 18 * size, life: 0.8, max: 0.8, col: '70,70,80' });
}
function apExplode(x, y, size) {
  apParts.push({ type: 'flash', x, y, vx: 0, vy: 0, r: 16 * size, life: 0.12, max: 0.12 });
  apRing(x, y, '#FFE08A', 8 * size, 140 * size);
  const cols = ['#FFE08A', '#FF9F43', '#E2574C', '#FFFFFF'];
  for (let k = 0; k < 10 + 6 * size; k++) {
    const a = apRand(0, Math.PI * 2), s = apRand(60, 180) * (0.7 + size * 0.3);
    apParts.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: apRand(0.3, 0.6), max: 0.6, col: apPick(cols), drag: 2.5 });
  }
  for (let k = 0; k < 3 + 2 * size; k++) {
    apParts.push({ type: 'smoke', x: x + apRand(-8, 8) * size, y: y + apRand(-8, 8) * size, vx: apRand(-20, 20), vy: apRand(-20, 20) + AP_SCROLL * 0.5,
      r: 6 * size, grow: 22 * size, life: apRand(0.5, 0.9), max: 0.9, col: '60,60,70' });
  }
  for (let k = 0; k < 2 + size; k++) {
    const a = apRand(0, Math.PI * 2), s = apRand(60, 140);
    apParts.push({ type: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: 0, spin: apRand(-12, 12), life: 0.7, max: 0.7, col: '#3A3A44', drag: 1.5 });
  }
}
function apPop(f) {                              // a balloon going pop
  apRing(f.x, f.y, f.gores[0], 12, 200);
  for (let k = 0; k < 14; k++) {
    const a = apRand(0, Math.PI * 2), s = apRand(60, 160);
    apParts.push({ type: 'debris', x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: 0, spin: apRand(-10, 10), life: 0.6, max: 0.6, col: f.gores[k % 2], drag: 2 });
  }
}
function apCallout(text, x, y, size, col, life = 1, rise = 24) {
  apCallouts.push({ text, x: apClamp(x, 50, AP_W - 50), y: apClamp(y, 84, AP_H - 30), size, col, life, max: life, rise });
}

// ── Game over ────────────────────────────────────────────────────────────────
function apGameOver() {
  apLastScore = apScoreInt();
  apLastStageName = apStageName(apStage);
  apState = 'over'; apOverT = 0;
  apPlayer.fallT = 0; apPlayer.spin = 0; apPlayer.gone = false;
  AP_OVER_JINGLE.forEach((f, k) => apLater(400 + k * 150, () => playSecretBeep(f)));
  apLater(2600, () => {
    if (apState !== 'over') return;
    if (apQualifies(apLastScore)) { apInitials = [0, 0, 0]; AP_SOUND.highScore(); apEnterState('nameEntry'); }
    else { apLastEntry = -1; apEnterState('leaderboard'); }
  });
}

function apUpdateOver(dt) {
  apOverT += dt;
  const P = apPlayer;
  if (!P.gone) {                                 // spiral down into the sea
    P.fallT += dt; P.spin += dt * 7; P.y += 34 * dt;
    if (Math.random() < dt * 25) apSmoke(P.x + apRand(-4, 4), P.y + apRand(-4, 4), 0.7);
    if (P.fallT >= 1.3) {
      P.gone = true;
      AP_SOUND.splash();
      apRing(P.x, P.y, '#FFFFFF', 6, 90);
      apRing(P.x, P.y, '#BFEFFF', 4, 60);
      for (let k = 0; k < 18; k++) {
        const a = apRand(0, Math.PI * 2), s = apRand(30, 110);
        apParts.push({ type: 'spark', x: P.x, y: P.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: apRand(0.3, 0.6), max: 0.6, col: '#E8FBFF', drag: 3 });
      }
    }
  }
  apMoveShots(dt);
  apUpdateWorld(dt, false);
}

// ── High scores ──────────────────────────────────────────────────────────────
function apQualifies(score) {
  if (score <= 0) return false;
  return apLeaderboard.length < AP_TOP_N || score > apLeaderboard[apLeaderboard.length - 1].score;
}
function apSubmitScore(name, score) {
  const entry = { name, score };
  apLeaderboard.push(entry);
  apLeaderboard.sort((a, b) => b.score - a.score);
  apLeaderboard = apLeaderboard.slice(0, AP_TOP_N);
  apLastEntry = apLeaderboard.indexOf(entry);
}

// ═══════════════════════════════════════════════════════════════════════════
// Drawing
// ═══════════════════════════════════════════════════════════════════════════
function apRoundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function apText(g, s, x, y, size, col, align = 'center', outline = false) {
  g.font = `bold ${size}px monospace`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.24); g.strokeStyle = 'rgba(10,18,36,0.85)'; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
  g.textBaseline = 'alphabetic';
}

function apBlendPal() {
  const a = AP_TIMES[apTodFrom], b = AP_TIMES[apTodTo], t = apTodT;
  const out = {};
  for (const k in a) {
    if (k === 'name') out[k] = b.name;
    else if (typeof a[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * t;
    else out[k] = apMix(a[k], b[k], t);
  }
  return out;
}

function apDraw() {
  const g = apCtx;
  apPal = apBlendPal();
  g.save();
  if (apShake > 0) g.translate((Math.random() - 0.5) * 14 * apShake, (Math.random() - 0.5) * 14 * apShake);
  apDrawSea(g);

  const live = apState === 'playing' || apState === 'over';
  // The Ironclad sails on the sea: under the clouds and the shadows
  if (live && apBoss && apBoss.kind === 'ironclad') AP_BOSS_DEFS.ironclad.draw(g, apBoss);
  if (live) apDrawShadows(g);
  apDrawClouds(g);                               // low clouds: the planes fly above them
  if (live) {
    apStars.forEach(s => apDrawStar(g, s.x, s.y, 8, s.spin));
    apDrops.forEach(d => apDrawCrate(g, d));
    apFoes.forEach(f => { if (f.t >= 0) apDrawFoe(g, f); });
    if (apBoss && apBoss.kind !== 'ironclad') AP_BOSS_DEFS[apBoss.kind].draw(g, apBoss);
    if (apBoss && apBoss.beams) apDrawBeams(g, apBoss);
  }
  apDrawShots(g);
  if (live || apState === 'attract') apDrawPlayer(g);
  apDrawParts(g);
  if (live) apFoeShots.forEach(s => apDrawFoeShot(g, s));
  if (apBolt) apDrawBolt(g);
  if (live && apPhase === 'warn') apDrawWarning(g);
  for (const c of apCallouts) {
    g.globalAlpha = Math.max(0, Math.min(1, c.life / 0.3));
    apText(g, c.text, c.x, c.y, c.size, c.col, 'center', true);
  }
  g.globalAlpha = 1;
  if (live) apDrawHud(g);
  g.restore();

  if (apFlash) { g.fillStyle = `rgba(${apFlash.col},${0.55 * apFlash.t / apFlash.max})`; g.fillRect(0, 0, AP_W, AP_H); }
  if (apState === 'attract') apDrawAttract(g);
  else if (apState === 'over') apDrawOver(g);
  else if (apState === 'nameEntry') apDrawNameEntry(g);
  else if (apState === 'leaderboard') apDrawLeaderboard(g);
}

// ── The sea ──────────────────────────────────────────────────────────────────
function apDrawSea(g) {
  const P = apPal;
  const gr = g.createLinearGradient(0, 0, 0, AP_H);
  gr.addColorStop(0, apRgb(P.seaHi)); gr.addColorStop(1, apRgb(P.seaLo));
  g.fillStyle = gr; g.fillRect(-20, -20, AP_W + 40, AP_H + 40);
  // little wave glints
  g.strokeStyle = apRgb(P.glint, 0.28); g.lineWidth = 2; g.lineCap = 'round';
  for (const gl of apGlints) {
    const w = gl.w * (0.6 + 0.4 * Math.sin(apClock / 600 + gl.ph));
    g.beginPath(); g.moveTo(gl.x - w, gl.y); g.quadraticCurveTo(gl.x, gl.y - 4, gl.x + w, gl.y); g.stroke();
  }
  g.lineCap = 'butt';
  for (const is of apIslands) apDrawIsland(g, is);
  // cloud shadows on the water
  g.fillStyle = apRgb(P.shade, 0.08);
  for (const c of apClouds) for (const p of c.puffs) { g.beginPath(); g.arc(c.x + p.dx + 34, c.y + p.dy + 60, p.r, 0, Math.PI * 2); g.fill(); }
  // night and twilight close in at the edges
  if (P.gloom > 0.01) {
    const v = g.createRadialGradient(AP_W / 2, AP_H * 0.55, 140, AP_W / 2, AP_H * 0.55, 460);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(8,0,20,${P.gloom})`);
    g.fillStyle = v; g.fillRect(0, 0, AP_W, AP_H);
  }
}

function apIslandPath(g, is, scale) {
  g.beginPath();
  const n = is.pts.length;
  for (let k = 0; k <= n; k++) {
    const a = (k % n) / n * Math.PI * 2, r = is.r * is.pts[k % n] * scale;
    const px = is.x + Math.cos(a) * r, py = is.y + Math.sin(a) * r * 0.82;
    if (k === 0) g.moveTo(px, py);
    else {
      const pa = ((k - 0.5) / n) * Math.PI * 2, pr = is.r * scale * (is.pts[(k - 1) % n] + is.pts[k % n]) / 2 * 1.05;
      g.quadraticCurveTo(is.x + Math.cos(pa) * pr, is.y + Math.sin(pa) * pr * 0.82, px, py);
    }
  }
  g.closePath();
}

function apDrawIsland(g, is) {
  if (is.y + is.r * 1.5 < -10 || is.y - is.r * 1.5 > AP_H + 10) return;
  const P = apPal;
  apIslandPath(g, is, 1.42); g.fillStyle = apRgb(P.shallow, 0.55); g.fill();   // shallows
  apIslandPath(g, is, 1.12); g.fillStyle = apRgb(P.sand); g.fill();            // beach
  apIslandPath(g, is, 0.86); g.fillStyle = apRgb(P.grassDk); g.fill();
  apIslandPath(g, is, 0.78); g.fillStyle = apRgb(P.grass); g.fill();
  for (const t of is.trees) {
    const x = is.x + t.x, y = is.y + t.y * 0.82;
    g.fillStyle = apRgb(P.shade, 0.22);
    g.beginPath(); g.arc(x + 3, y + 4, t.r, 0, Math.PI * 2); g.fill();
    if (t.palm) {                                // palm: a star of fronds
      g.fillStyle = apRgb(P.grassDk);
      for (let k = 0; k < 5; k++) {
        const a = t.rot + k * Math.PI * 2 / 5;
        g.beginPath(); g.ellipse(x + Math.cos(a) * t.r * 0.6, y + Math.sin(a) * t.r * 0.6, t.r * 0.75, t.r * 0.3, a, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = apRgb(P.sand); g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = apRgb(P.grassDk); g.beginPath(); g.arc(x, y, t.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = apRgb(apMix(P.grass, [255, 255, 255], 0.18)); g.beginPath(); g.arc(x - t.r * 0.3, y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2); g.fill();
    }
  }
}

function apDrawClouds(g) {
  const P = apPal;
  g.globalAlpha = P.cloudA;
  for (const c of apClouds) {
    if (c.y < -90 || c.y > AP_H + 90) continue;
    g.fillStyle = apRgb(P.cloudDk);
    for (const p of c.puffs) { g.beginPath(); g.arc(c.x + p.dx, c.y + p.dy + 5, p.r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = apRgb(P.cloud);
    for (const p of c.puffs) { g.beginPath(); g.arc(c.x + p.dx, c.y + p.dy, p.r * 0.94, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
}

function apDrawBolt(g) {
  const a = Math.min(1, apBolt.t / 0.1);
  g.lineCap = 'round'; g.lineJoin = 'round';
  [[9, `rgba(232,121,249,${0.35 * a})`], [3, `rgba(255,255,255,${a})`]].forEach(([w, col]) => {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); apBolt.pts.forEach(([x, y], k) => { if (k) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  });
  g.lineCap = 'butt'; g.lineJoin = 'miter';
}

// Drop shadows on the water sell the height — the plane is up here, the sea down there.
function apDrawShadows(g) {
  const sc = apRgb(apPal.shade, 0.26);
  const P = apPlayer;
  if (apState === 'playing' || (apState === 'over' && !P.gone)) {
    const s = apState === 'over' ? Math.max(0.3, 1 - P.fallT * 0.55) : 1;
    const off = apState === 'over' ? 26 * s : 26;
    apDrawPlane(g, P.x + off * 0.6, P.y + off, { s, ang: P.spin, shadow: sc });
  }
  if (apPlayer.wingT > 0 && apState === 'playing') {
    apDrawPlane(g, P.wingL.x + 16, P.wingL.y + 26, { s: 0.62, shadow: sc });
    apDrawPlane(g, P.wingR.x + 16, P.wingR.y + 26, { s: 0.62, shadow: sc });
  }
  for (const f of apFoes) {
    if (f.t < 0) continue;
    const x = f.x + 16, y = f.y + 26;
    if (f.kind === 'dart') apDrawPlane(g, x, y, { s: 0.9, ang: f.ang, shadow: sc });
    else if (f.kind === 'swoop') apDrawPlane(g, x, y, { s: 0.85, ang: f.ang, shadow: sc });
    else if (f.kind === 'ace') apDrawPlane(g, x, y, { s: 1.05, ang: f.ang, shadow: sc });
    else if (f.kind === 'diver') apDrawDiver(g, x, y, f.ang, sc);
    else if (f.kind === 'bomber') apDrawBomber(g, x, y, sc);
    else { g.fillStyle = sc; g.beginPath(); g.ellipse(x, y, f.r, f.r * 0.9, 0, 0, Math.PI * 2); g.fill(); }
  }
  if (apBoss) AP_BOSS_DEFS[apBoss.kind].shadow(g, apBoss, apRgb(apPal.shade, 0.2));
}

// ── Planes ───────────────────────────────────────────────────────────────────
// A chunky toy prop fighter, nose up at ang 0. o = { s, ang, bank, cols, shadow, guns }
function apDrawPlane(g, x, y, o) {
  const s = o.s || 1, c = o.cols || AP_PLAYER_COLS, sh = o.shadow, bank = o.bank || 0;
  g.save();
  g.translate(x, y); g.rotate(o.ang || 0); g.scale(s * (1 - 0.2 * Math.abs(bank)), s);
  const fill = col => { g.fillStyle = sh || col; };
  fill(c.wing); apRoundRect(g, -19, -2, 38, 10, 5); g.fill();                 // main wing
  fill(c.wing); apRoundRect(g, -9, 12, 18, 6, 3); g.fill();                   // tailplane
  fill(c.body); g.beginPath(); g.ellipse(0, 2, 6, 16.5, 0, 0, Math.PI * 2); g.fill();   // fuselage
  if (!sh) {
    g.fillStyle = c.trim;                                                     // wing tips + nose
    apRoundRect(g, -19, -2, 6, 10, 4); g.fill(); apRoundRect(g, 13, -2, 6, 10, 4); g.fill();
    g.beginPath(); g.arc(0, -13, 4.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(-1.3, 11, 2.6, 9);           // tail fin
    if (bank) {                                                               // the low wing goes darker
      g.fillStyle = 'rgba(0,0,0,0.2)';
      if (bank > 0) g.fillRect(2, -2, 17, 10); else g.fillRect(-19, -2, 17, 10);
    }
    for (let k = 0; k < (o.guns || 0); k++) {                                 // gun pods grow with POWER
      const gx = [9, -9, 14, -14][k] || 0;
      g.fillStyle = '#2B3648'; g.fillRect(gx - 1.5, -6, 3, 7);
    }
    g.fillStyle = c.canopy; g.beginPath(); g.ellipse(0, -3, 3.3, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-1, -5, 1.1, 2, 0, 0, Math.PI * 2); g.fill();
    // propeller: a blur disc plus two blades seen edge-on
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(0, -17, 10, 2.2, 0, 0, Math.PI * 2); g.fill();
    const pa = apClock / 22;
    g.strokeStyle = 'rgba(40,40,50,0.75)'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath();
    const l1 = 10 * Math.cos(pa), l2 = 10 * Math.cos(pa + Math.PI / 2);
    g.moveTo(-l1, -17); g.lineTo(l1, -17); g.moveTo(-l2, -17); g.lineTo(l2, -17);
    g.stroke(); g.lineCap = 'butt';
  }
  g.restore();
}

function apDrawPlayer(g) {
  const P = apPlayer;
  if (!P || P.gone) return;
  if (apState === 'over') {
    apDrawPlane(g, P.x, P.y, { s: Math.max(0.3, 1 - P.fallT * 0.55), ang: P.spin, guns: 0 });
    return;
  }
  const blink = P.invuln > 0 && Math.floor(apClock / 80) % 2 === 0;
  if (P.wingT > 0 && apState === 'playing' && !(P.wingT < 3 && Math.floor(apClock / 120) % 2 === 0)) {
    apDrawPlane(g, P.wingL.x, P.wingL.y, { s: 0.62, cols: AP_WINGMAN_COLS, bank: P.bank });
    apDrawPlane(g, P.wingR.x, P.wingR.y, { s: 0.62, cols: AP_WINGMAN_COLS, bank: P.bank });
  }
  if (P.power === AP_MAX_POWER && apState === 'playing') {                    // max power glow
    g.fillStyle = `rgba(255,201,60,${0.16 + 0.1 * Math.sin(apClock / 120)})`;
    g.beginPath(); g.arc(P.x, P.y, 28, 0, Math.PI * 2); g.fill();
  }
  if (!blink) {
    apDrawPlane(g, P.x, P.y, { bank: P.bank, guns: Math.min(4, P.power - 1) });
    if (apState === 'playing') {                                              // the hit core
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(P.x, P.y + 2, 3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = AP_PINK; g.lineWidth = 1.5; g.beginPath(); g.arc(P.x, P.y + 2, 3.5, 0, Math.PI * 2); g.stroke();
    }
  }
  if (P.shield && apState === 'playing') {
    const t = apClock / 1000;
    g.fillStyle = 'rgba(120,205,255,0.16)'; g.beginPath(); g.arc(P.x, P.y, 26, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160,225,255,0.85)'; g.lineWidth = 2.5; g.beginPath(); g.arc(P.x, P.y, 26, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.arc(P.x, P.y, 21, t * 2, t * 2 + 0.9); g.stroke(); g.lineCap = 'butt';
  }
}

function apDrawShots(g) {
  g.lineCap = 'round';
  for (const s of apShots) {
    const len = 0.016;
    g.strokeStyle = s.wing ? '#B8F5C8' : '#FFE08A'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * len, s.y - s.vy * len); g.stroke();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * len * 0.7, s.y - s.vy * len * 0.7); g.stroke();
  }
  g.lineCap = 'butt';
}

function apDrawFoeShot(g, s) {
  if (s.kind === 'feather') {                    // the Night Owl's feathers
    const a = Math.atan2(s.vy, s.vx);
    g.save(); g.translate(s.x, s.y); g.rotate(a);
    g.fillStyle = 'rgba(201,182,255,0.4)'; g.beginPath(); g.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#C9B6FF'; g.beginPath(); g.ellipse(0, 0, 8, 3.6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke();
    g.restore();
    return;
  }
  if (s.kind === 'flak') {                       // a FLAK shell: dark with a blinking band
    const on = Math.floor(apClock / 80) % 2 === 0;
    g.fillStyle = 'rgba(255,140,60,0.35)'; g.beginPath(); g.arc(s.x, s.y, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2B2B33'; g.beginPath(); g.arc(s.x, s.y, 6.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = on ? '#FFB37A' : '#E2574C'; g.lineWidth = 2.2; g.beginPath(); g.arc(s.x, s.y, 4, 0, Math.PI * 2); g.stroke();
    return;
  }
  const pulse = 1 + 0.15 * Math.sin(apClock / 60 + s.x);
  g.fillStyle = 'rgba(255,92,138,0.35)'; g.beginPath(); g.arc(s.x, s.y, 7.5 * pulse, 0, Math.PI * 2); g.fill();
  g.fillStyle = AP_PINK; g.beginPath(); g.arc(s.x, s.y, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(s.x, s.y, 2.6, 0, Math.PI * 2); g.fill();
}

// ── Bandits ──────────────────────────────────────────────────────────────────
function apDrawFoe(g, f) {
  if (f.kind === 'dart') apDrawPlane(g, f.x, f.y, { s: 0.9, ang: f.ang, cols: AP_DART_COLS });
  else if (f.kind === 'swoop') apDrawPlane(g, f.x, f.y, { s: 0.85, ang: f.ang, cols: AP_SWOOP_COLS });
  else if (f.kind === 'ace') {
    apDrawPlane(g, f.x, f.y, { s: 1.05, ang: f.ang, cols: AP_ACE_COLS });
    if (f.burst > 0) { g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(f.x, f.y + 20, 3 + Math.random() * 2, 0, Math.PI * 2); g.fill(); }
  }
  else if (f.kind === 'diver') {
    if (f.mode === 'aim' && Math.floor(apClock / 90) % 2 === 0) {           // the tell before the dash
      g.strokeStyle = AP_PINK; g.lineWidth = 2.5; g.beginPath(); g.arc(f.x, f.y, 20, 0, Math.PI * 2); g.stroke();
      apText(g, '!', f.x, f.y - 28, 16, AP_PINK, 'center', true);
    }
    apDrawDiver(g, f.x, f.y, f.ang, null);
  }
  else if (f.kind === 'bomber') apDrawBomber(g, f.x, f.y, null);
  else if (f.kind === 'copter') apDrawCopterAt(g, f.x, f.y, 1, '#2BA88A', '#156B58', false);
  else if (f.kind === 'balloon') apDrawBalloon(g, f);
  if (f.flash > 0) {                             // took a hit but survived
    g.fillStyle = `rgba(255,255,255,${0.6 * f.flash / 0.08})`;
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill();
  }
  if ((f.kind === 'bomber' || f.kind === 'copter' || f.kind === 'ace') && f.hp < f.maxHp) {   // a little health bar
    const w = f.r * 1.6;
    g.fillStyle = 'rgba(10,18,36,0.6)'; g.fillRect(f.x - w / 2, f.y - f.r - 10, w, 4);
    g.fillStyle = AP_GOLD; g.fillRect(f.x - w / 2, f.y - f.r - 10, w * f.hp / f.maxHp, 4);
  }
}

// A magenta delta-wing jet.
function apDrawDiver(g, x, y, ang, sh) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = sh || '#C23F9A';
  g.beginPath(); g.moveTo(0, -16); g.lineTo(14, 10); g.lineTo(4, 7); g.lineTo(0, 13); g.lineTo(-4, 7); g.lineTo(-14, 10); g.closePath(); g.fill();
  if (!sh) {
    g.fillStyle = '#E36BC0'; g.beginPath(); g.moveTo(0, -16); g.lineTo(5, 4); g.lineTo(-5, 4); g.closePath(); g.fill();
    g.fillStyle = '#FFE2F4'; g.beginPath(); g.ellipse(0, -4, 2.2, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFB347'; g.beginPath(); g.arc(0, 14, 2.5 + Math.random() * 1.5, 0, Math.PI * 2); g.fill();   // afterburner
  }
  g.restore();
}

// A big olive twin-engine bomber, nose down.
function apDrawBomber(g, x, y, sh) {
  g.save(); g.translate(x, y); g.rotate(Math.PI);
  const fill = col => { g.fillStyle = sh || col; };
  fill('#5E6B42'); apRoundRect(g, -40, -4, 80, 14, 7); g.fill();          // wings
  fill('#5E6B42'); apRoundRect(g, -15, 20, 30, 8, 4); g.fill();           // tailplane
  fill('#7C8B5A'); g.beginPath(); g.ellipse(0, 4, 9, 26, 0, 0, Math.PI * 2); g.fill();   // fuselage
  fill('#6B7A4C'); apRoundRect(g, -27, -12, 10, 22, 5); g.fill(); apRoundRect(g, 17, -12, 10, 22, 5); g.fill();   // engines
  if (!sh) {
    g.fillStyle = '#C9B26A'; g.fillRect(-40, 1, 6, 6); g.fillRect(34, 1, 6, 6);
    g.fillStyle = '#BFE4F0'; g.beginPath(); g.ellipse(0, -14, 4.5, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-1.5, 18, 3, 12);
    const pa = apClock / 20;
    g.strokeStyle = 'rgba(30,30,30,0.75)'; g.lineWidth = 2;
    [-22, 22].forEach(ex => {
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(ex, -14, 9, 2, 0, 0, Math.PI * 2); g.fill();
      const l = 9 * Math.cos(pa + ex);
      g.beginPath(); g.moveTo(ex - l, -14); g.lineTo(ex + l, -14); g.stroke();
    });
  }
  g.restore();
}

// A top-down helicopter facing you. s = scale; mad = red-eyed (Buzz Brothers).
function apDrawCopterAt(g, x, y, s, body, dark, mad) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = body; g.fillRect(-2.5, -30, 5, 26);                           // tail boom (points up — it faces you)
  g.fillStyle = dark; g.fillRect(-7, -32, 14, 4);
  g.strokeStyle = '#3A3A44'; g.lineWidth = 2;                                 // skids
  g.beginPath(); g.moveTo(-12, -8); g.lineTo(-12, 14); g.moveTo(12, -8); g.lineTo(12, 14); g.stroke();
  g.fillStyle = body; g.beginPath(); g.ellipse(0, 2, 12, 16, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = mad ? '#FF8A8A' : '#C8FFF0'; g.beginPath(); g.ellipse(0, 9, 8, 7, 0, 0, Math.PI); g.fill();   // glass nose
  if (s > 1.2) {                                                              // the brothers' grumpy eyebrows
    g.strokeStyle = '#1E222B'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-6, mad ? 8 : 9.5); g.lineTo(-2, 10.5); g.moveTo(6, mad ? 8 : 9.5); g.lineTo(2, 10.5); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();   // rotor disc
  const a = apClock / (mad ? 28 : 40);
  g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(-Math.cos(a) * 30, -Math.sin(a) * 30);
  g.moveTo(Math.cos(a + 1.57) * 30, Math.sin(a + 1.57) * 30); g.lineTo(-Math.cos(a + 1.57) * 30, -Math.sin(a + 1.57) * 30);
  g.stroke(); g.lineCap = 'butt';
  g.fillStyle = '#3A3A44'; g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill();
  g.restore();
}

// A supply balloon seen from above: striped gores, with its crate peeking out below.
function apDrawBalloon(g, f) {
  const x = f.x, y = f.y, r = f.r;
  g.strokeStyle = 'rgba(60,40,30,0.7)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - 8, y + 10); g.lineTo(x - 6, y + 22); g.moveTo(x + 8, y + 10); g.lineTo(x + 6, y + 22); g.stroke();
  g.fillStyle = '#B07A45'; g.fillRect(x - 7, y + 20, 14, 10);
  g.strokeStyle = '#7A5230'; g.lineWidth = 1.5; g.strokeRect(x - 7, y + 20, 14, 10);
  for (let k = 0; k < 8; k++) {
    g.fillStyle = f.gores[k % 2];
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, k * Math.PI / 4 + f.t * 0.3, (k + 1) * Math.PI / 4 + f.t * 0.3); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7A5230'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
}

// ── Boss art ─────────────────────────────────────────────────────────────────
function apDrawBlimp(g, b) {
  g.save(); g.translate(b.x, b.y);
  if (b.dying) g.rotate(Math.sin(b.dieT * 3) * 0.06 + b.dieT * 0.03);
  const RX = AP_BLIMP_RX, RY = AP_BLIMP_RY;
  g.fillStyle = '#B23E33';                                                    // tail fins (right end)
  g.beginPath(); g.moveTo(80, -20); g.lineTo(124, -58); g.lineTo(130, -48); g.lineTo(112, -14); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(80, 20); g.lineTo(124, 58); g.lineTo(130, 48); g.lineTo(112, 14); g.closePath(); g.fill();
  [-40, 30].forEach(ex => {                                                   // engine pods with props
    [-1, 1].forEach(side => {
      const ey = side * (RY * Math.sqrt(1 - (ex / RX) ** 2) + 6);
      g.fillStyle = '#4A5060'; g.fillRect(ex - 2, side > 0 ? ey - 10 : ey, 4, 10);
      g.fillStyle = '#5A6070'; apRoundRect(g, ex - 10, ey - 5, 20, 10, 5); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(ex - 13, ey, 2, 8, 0, 0, Math.PI * 2); g.fill();
      const l = 8 * Math.cos(apClock / 25 + ex);
      g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - 13, ey - l); g.lineTo(ex - 13, ey + l); g.stroke();
    });
  });
  const hg = g.createLinearGradient(0, -RY, 0, RY);
  hg.addColorStop(0, '#E9EEF4'); hg.addColorStop(0.55, '#B9C3CF'); hg.addColorStop(1, '#8792A1');
  g.save();
  g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2); g.fillStyle = hg; g.fill(); g.clip();
  g.strokeStyle = 'rgba(70,80,95,0.25)'; g.lineWidth = 2;                   // panel seams
  for (let x = -90; x <= 90; x += 30) { g.beginPath(); g.moveTo(x, -RY); g.quadraticCurveTo(x + 6, 0, x, RY); g.stroke(); }
  g.fillStyle = '#E2574C'; g.beginPath(); g.arc(-RX + 2, 0, 30, 0, Math.PI * 2); g.fill();   // red nose cap
  g.fillStyle = '#E2574C'; g.fillRect(-RX, 22, RX * 2, 7);                   // belly stripe
  g.restore();
  g.strokeStyle = 'rgba(40,48,60,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2); g.stroke();
  if (b.flash > 0 || (b.dying && Math.floor(apClock / 70) % 2 === 0)) {     // hit flash (under the lettering)
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2); g.fill();
  }
  apText(g, 'BIG BLIMP', -6, -10, 17, AP_RED, 'center', false);
  g.fillStyle = '#3A3F4C'; apRoundRect(g, -12, 30, 24, 14, 5); g.fill();    // belly cannon
  g.fillStyle = '#1E222B'; g.fillRect(-4, 40, 8, 8);
  [[-78, -2], [64, -2]].forEach(([tx, ty], k) => {                            // turrets that track you
    g.save(); g.translate(tx, ty); g.rotate(b.aim[k]);
    g.fillStyle = '#2B303B'; g.fillRect(0, -3, 20, 6);
    g.restore();
    g.fillStyle = '#4A5160'; g.beginPath(); g.arc(tx, ty, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6B7385'; g.beginPath(); g.arc(tx - 3, ty - 3, 4, 0, Math.PI * 2); g.fill();
  });
  g.restore();
}

// A battleship seen from above, bow up (it keeps pace with you), wake trailing down.
function apDrawIronclad(g, b) {
  g.save(); g.translate(b.x, b.y);
  if (b.dying) { g.rotate(b.dieT * 0.05); g.globalAlpha = Math.max(0.25, 1 - b.dieT * 0.25); }
  const foam = Math.sin(apClock / 200) * 4;
  const wk = g.createLinearGradient(0, 140, 0, 330);                         // wake
  wk.addColorStop(0, 'rgba(255,255,255,0.55)'); wk.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = wk;
  g.beginPath(); g.moveTo(-40, 140); g.lineTo(40, 140); g.lineTo(96 + foam, 330); g.lineTo(-96 - foam, 330); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 3;                  // bow wave
  g.beginPath(); g.moveTo(-6, -168); g.quadraticCurveTo(-46, -130, -62 - foam, -86); g.moveTo(6, -168); g.quadraticCurveTo(46, -130, 62 + foam, -86); g.stroke();
  const hull = s => {
    g.beginPath(); g.moveTo(0, -170 * s); g.quadraticCurveTo(46 * s, -120 * s, 46 * s, -80 * s); g.lineTo(46 * s, 130 * s);
    g.quadraticCurveTo(46 * s, 156 * s, 0, 158 * s); g.quadraticCurveTo(-46 * s, 156 * s, -46 * s, 130 * s); g.lineTo(-46 * s, -80 * s);
    g.quadraticCurveTo(-46 * s, -120 * s, 0, -170 * s); g.closePath();
  };
  hull(1); g.fillStyle = '#3F4654'; g.fill();
  g.save(); hull(0.86); g.fillStyle = '#B08F64'; g.fill(); g.clip();         // wooden deck
  g.strokeStyle = 'rgba(80,56,32,0.25)'; g.lineWidth = 1;
  for (let x = -40; x <= 40; x += 8) { g.beginPath(); g.moveTo(x, -170); g.lineTo(x, 160); g.stroke(); }
  g.restore();
  // the bridge
  const br = b.parts[4];
  apRoundRect(g, -26, -24, 52, 48, 8); g.fillStyle = '#6B7280'; g.fill();
  apRoundRect(g, -20, -18, 40, 36, 6); g.fillStyle = '#9CA3AF'; g.fill();
  if (!br.dead) {
    if (!b.exposed) {                                                         // shutters down
      g.fillStyle = '#4B5260'; g.fillRect(-18, -16, 36, 32);
      g.strokeStyle = '#2E333D'; g.lineWidth = 2;
      for (let yy = -12; yy <= 12; yy += 6) { g.beginPath(); g.moveTo(-18, yy); g.lineTo(18, yy); g.stroke(); }
    } else {                                                                  // the glowing core
      const p = 0.6 + 0.4 * Math.sin(apClock / 90);
      g.fillStyle = `rgba(226,87,76,${0.45 * p})`; g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#E2574C'; g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFE2C8'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    }
    if (br.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-24, -22, 48, 44); }
  }
  // turrets
  for (const p of b.parts) {
    if (p.kind === 'bridge') continue;
    const ty = p.oy;
    if (p.dead) {
      g.fillStyle = '#1E1E24'; g.beginPath(); g.arc(0, ty, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4A3A2A'; g.lineWidth = 2; g.beginPath(); g.arc(0, ty, 15, 0, Math.PI * 2); g.stroke();
      continue;
    }
    g.save(); g.translate(0, ty); g.rotate(p.aim);
    g.fillStyle = '#2B303B';
    if (p.kind === 'twin') { g.fillRect(4, -6, 20, 4); g.fillRect(4, 2, 20, 4); }
    else if (p.kind === 'flak') g.fillRect(4, -4.5, 22, 9);
    else { g.fillRect(4, -5, 17, 3); g.fillRect(4, -1.5, 19, 3); g.fillRect(4, 2, 17, 3); }
    g.restore();
    g.fillStyle = p.kind === 'flak' ? '#7A4A3A' : '#4B5563'; g.beginPath(); g.arc(0, ty, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6B7385'; g.beginPath(); g.arc(-4, ty - 4, 5, 0, Math.PI * 2); g.fill();
    if (p.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(0, ty, 15, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(10,18,36,0.6)'; g.fillRect(-14, ty + 18, 28, 3);       // turret health
    g.fillStyle = AP_GOLD; g.fillRect(-14, ty + 18, 28 * p.hp / p.maxHp, 3);
  }
  g.restore();
}

// A stealth flying-wing with an owl's face. Fades out; the eyes never do.
function apDrawOwl(g, b) {
  const vis = b.vis;
  g.save(); g.translate(b.x, b.y);
  if (vis > 0.02) {
    g.globalAlpha = vis;
    g.fillStyle = '#2E3550';
    g.beginPath();
    g.moveTo(0, 30);
    g.lineTo(116, -4); g.lineTo(104, -18); g.lineTo(84, -8); g.lineTo(66, -22); g.lineTo(46, -10); g.lineTo(26, -28); g.lineTo(0, -20);
    g.lineTo(-26, -28); g.lineTo(-46, -10); g.lineTo(-66, -22); g.lineTo(-84, -8); g.lineTo(-104, -18); g.lineTo(-116, -4);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(140,155,200,0.35)'; g.lineWidth = 1.5;               // feather lines
    for (let k = 1; k <= 4; k++) { g.beginPath(); g.moveTo(k * 22, -6 + k); g.lineTo(k * 20, 18 - k * 4); g.moveTo(-k * 22, -6 + k); g.lineTo(-k * 20, 18 - k * 4); g.stroke(); }
    g.fillStyle = '#3B4466'; g.beginPath(); g.ellipse(0, 0, 32, 28, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4A5578';
    g.beginPath(); g.moveTo(-28, -14); g.lineTo(-22, -36); g.lineTo(-12, -20); g.closePath(); g.fill();   // ear tufts
    g.beginPath(); g.moveTo(28, -14); g.lineTo(22, -36); g.lineTo(12, -20); g.closePath(); g.fill();
    g.fillStyle = '#E8A33A'; g.beginPath(); g.moveTo(-5, 8); g.lineTo(5, 8); g.lineTo(0, 18); g.closePath(); g.fill();   // beak
    if (b.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(0, 0, 34, 30, 0, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
  const dx = apClamp((apPlayer.x - b.x) / 60, -3, 3), dy = apClamp((apPlayer.y - b.y) / 120, -2, 3);
  [-13, 13].forEach(ex => {
    g.fillStyle = 'rgba(255,210,60,0.3)'; g.beginPath(); g.arc(ex, -2, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFD23C'; g.beginPath(); g.arc(ex, -2, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#14141C'; g.beginPath(); g.arc(ex + dx, -2 + dy, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex + dx - 2, -4 + dy, 1.6, 0, Math.PI * 2); g.fill();
  });
  g.restore();
}

function apDrawBeams(g, b) {
  for (const bm of b.beams) {
    const top = b.y + 22;
    if (bm.st === 'warn') {                                                   // a thin warning line
      const on = Math.floor(apClock / 70) % 2 === 0;
      g.strokeStyle = on ? 'rgba(255,92,138,0.9)' : 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
      g.setLineDash([10, 8]); g.beginPath(); g.moveTo(bm.x, top); g.lineTo(bm.x, AP_H); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,92,138,0.12)'; g.fillRect(bm.x - 22, top, 44, AP_H - top);
      if (on) apText(g, '!', bm.x, AP_H - 40, 22, AP_PINK, 'center', true);
    } else {
      const w = 22 * Math.min(1, bm.t / 0.08) * (bm.t > 0.5 ? (0.65 - bm.t) / 0.15 : 1);
      const gr = g.createLinearGradient(bm.x - w * 1.6, 0, bm.x + w * 1.6, 0);
      gr.addColorStop(0, 'rgba(232,121,249,0)'); gr.addColorStop(0.3, 'rgba(232,121,249,0.7)');
      gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(232,121,249,0.7)'); gr.addColorStop(1, 'rgba(232,121,249,0)');
      g.fillStyle = gr; g.fillRect(bm.x - w * 1.6, top, w * 3.2, AP_H - top);
    }
  }
}

// A giant crimson triplane, nose down, with a gold crown on its wings.
// sh = shadow colour (draws a silhouette at x, y instead).
function apDrawBaron(g, b, sh, x, y) {
  g.save(); g.translate(x, y); g.rotate(Math.PI);
  if (b.dying) g.rotate(Math.sin(b.dieT * 4) * 0.08);
  g.scale(2.2, 2.2);
  const dread = b.phase === 3;
  const fill = col => { g.fillStyle = sh || col; };
  fill(dread ? '#4A0F14' : '#6E1717'); apRoundRect(g, -46, 9, 92, 10, 5); g.fill();     // lower wing
  fill(dread ? '#5E1218' : '#8F1F1F'); apRoundRect(g, -50, 2, 100, 10, 5); g.fill();    // middle wing
  fill(dread ? '#8C1C22' : '#C0392B'); apRoundRect(g, -54, -6, 108, 12, 6); g.fill();   // top wing
  fill('#8F1F1F'); apRoundRect(g, -16, 30, 32, 8, 4); g.fill();                         // tailplane
  fill(dread ? '#8C1C22' : '#B03030'); g.beginPath(); g.ellipse(0, 10, 9, 30, 0, 0, Math.PI * 2); g.fill();   // fuselage
  if (!sh) {
    g.fillStyle = '#2B1A14';                                                  // struts
    [-38, -20, 20, 38].forEach(sx => g.fillRect(sx - 1, -5, 2, 10));
    [-34, 34].forEach(cx => {                                                 // gold crowns
      g.fillStyle = AP_GOLD;
      // spikes toward +y: the plane is drawn nose-down, so they end up pointing up on screen
      g.beginPath(); g.moveTo(cx - 6, -3); g.lineTo(cx - 6, 3); g.lineTo(cx - 3, 0); g.lineTo(cx, 4); g.lineTo(cx + 3, 0); g.lineTo(cx + 6, 3); g.lineTo(cx + 6, -3); g.closePath(); g.fill();
    });
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-1.2, 28, 2.4, 12);          // tail fin
    g.fillStyle = '#5A3A22'; g.beginPath(); g.arc(0, 10, 4.5, 0, Math.PI * 2); g.fill();   // pilot's leather helmet
    g.fillStyle = '#A8D8F0'; g.fillRect(-3.5, 6, 3, 2); g.fillRect(0.5, 6, 3, 2);        // goggles
    g.strokeStyle = '#F8F4E8'; g.lineWidth = 2; g.lineCap = 'round';          // a scarf flapping in the wind
    const w = Math.sin(apClock / 90) * 2;
    g.beginPath(); g.moveTo(2, 13); g.quadraticCurveTo(6 + w, 18, 3 - w, 24); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#2B2B33'; g.beginPath(); g.arc(0, -18, 8, 0, Math.PI * 2); g.fill();  // engine cowling
    g.fillStyle = '#C9A24A'; g.beginPath(); g.arc(0, -22, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(0, -25, 20, 3, 0, 0, Math.PI * 2); g.fill();
    const pa = apClock / 18, l1 = 20 * Math.cos(pa), l2 = 20 * Math.cos(pa + Math.PI / 2);
    g.strokeStyle = 'rgba(40,30,30,0.8)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-l1, -25); g.lineTo(l1, -25); g.moveTo(-l2, -25); g.lineTo(l2, -25); g.stroke();
    if (b.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.18)'; apRoundRect(g, -54, -6, 108, 25, 6); g.fill(); }
  }
  g.restore();
}

// ── Crates, stars, icons ─────────────────────────────────────────────────────
function apDrawCrate(g, d) {
  const x = d.x, y = d.y, col = AP_DROPS[d.kind].col;
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1;                   // parachute canopy above the crate
  g.beginPath(); g.moveTo(x - 13, y - 22); g.lineTo(x - 10, y - 9); g.moveTo(x + 13, y - 22); g.lineTo(x + 10, y - 9); g.stroke();
  for (let k = 0; k < 4; k++) {
    g.fillStyle = k % 2 ? '#FFFFFF' : col;
    g.beginPath(); g.moveTo(x, y - 24); g.arc(x, y - 24, 16, Math.PI + k * Math.PI / 4, Math.PI + (k + 1) * Math.PI / 4); g.closePath(); g.fill();
  }
  const pulse = 0.5 + 0.5 * Math.sin(apClock / 150 + d.t);                    // grab-me pulse
  g.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * pulse})`; g.lineWidth = 2.5;
  g.beginPath(); g.arc(x, y, 19 + pulse * 3, 0, Math.PI * 2); g.stroke();
  apRoundRect(g, x - 13, y - 13, 26, 26, 6); g.fillStyle = col; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.stroke();
  apDrawIcon(g, d.kind, x, y, 1);
}

function apDrawIcon(g, kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#FFFFFF'; g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'power') {
    g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(-7, 0); g.lineTo(0, -7); g.lineTo(7, 0); g.moveTo(-7, 7); g.lineTo(0, 0); g.lineTo(7, 7); g.stroke();
  } else if (kind === 'shield') {
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(-2.5, -2.5, 2.2, 0, Math.PI * 2); g.fill();
  } else if (kind === 'wing') {
    [-5, 5].forEach(px => { g.beginPath(); g.moveTo(px, -7); g.lineTo(px + 5, 5); g.lineTo(px, 2); g.lineTo(px - 5, 5); g.closePath(); g.fill(); });
  } else if (kind === 'kaboom') {
    g.beginPath(); g.arc(-1, 2, 7, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2; g.beginPath(); g.moveTo(3, -4); g.quadraticCurveTo(6, -9, 9, -7); g.stroke();
    g.fillStyle = AP_GOLD; g.beginPath(); g.arc(9, -8, 2.4, 0, Math.PI * 2); g.fill();
  } else if (kind === 'heart') {
    apHeartPath(g, 0, 1, 8); g.fill();
  }
  g.restore();
}

function apHeartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.75);
  g.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.6, y - s * 1.05, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 0.6, y - s * 1.05, x + s * 1.2, y - s * 0.1, x, y + s * 0.75);
  g.closePath();
}

function apStarPath(g, x, y, r, sx) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr * sx, py = y + Math.sin(a) * rr;
    if (k) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}

function apDrawStar(g, x, y, r, spin) {
  const sx = Math.max(0.2, Math.abs(Math.cos(spin)));
  apStarPath(g, x, y, r + 1.5, sx); g.fillStyle = '#8A5A00'; g.fill();
  apStarPath(g, x, y, r, sx); g.fillStyle = AP_GOLD; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - r * 0.2 * sx, y - r * 0.25, r * 0.22, 0, Math.PI * 2); g.fill();
}

function apDrawParts(g) {
  for (const p of apParts) {
    const a = Math.max(0, p.life / p.max);
    if (p.type === 'spark') { g.globalAlpha = a; g.fillStyle = p.col; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
    else if (p.type === 'smoke') { g.fillStyle = `rgba(${p.col},${0.5 * a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }
    else if (p.type === 'ring') { g.globalAlpha = a; g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke(); }
    else if (p.type === 'flash') { g.fillStyle = `rgba(255,250,220,${a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }
    else if (p.type === 'debris') {
      g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.fillStyle = p.col; g.fillRect(-3, -1.5, 6, 3); g.restore();
    }
  }
  g.globalAlpha = 1;
}

// ── HUD & banners ────────────────────────────────────────────────────────────
function apDrawHud(g) {
  const P = apPlayer;
  g.fillStyle = apLv.nightmare ? 'rgba(40,10,52,0.7)' : 'rgba(14,26,48,0.62)'; g.fillRect(0, 0, AP_W, 42);
  apText(g, apPad(apScore), 10, 15, 17, AP_CHALK, 'left');
  for (let k = 0; k < AP_MAX_POWER; k++) {                                    // power pips
    g.fillStyle = k < P.power ? '#FF8A3D' : 'rgba(255,255,255,0.18)';
    apRoundRect(g, 10 + k * 15, 30, 12, 5, 2); g.fill();
  }
  apText(g, 'PWR', 89, 33, 9, AP_DIM, 'left');
  const mul = apChainMul();                                                   // star chain
  apDrawStar(g, 168, 16, 8, 0);
  apText(g, 'x' + mul, 180, 16, 15, mul > 1 ? AP_GOLD : AP_DIM, 'left');
  apText(g, apStageName(apStage), 168, 33, 9, apLv.nightmare ? AP_DUSK : AP_DIM, 'center');
  for (let k = 0; k < AP_MAX_LIVES; k++) {                                    // hearts
    const hx = AP_W - 16 - k * 21;
    if (k >= Math.max(P.lives, AP_START_LIVES)) continue;
    apHeartPath(g, hx, 20, 8);
    g.fillStyle = k < P.lives ? '#F06FA8' : 'rgba(255,255,255,0.16)'; g.fill();
  }
  if (P.wingT > 0 && apState === 'playing') {                                 // wingmen timer
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(AP_W - 96, 34, 86, 4);
    g.fillStyle = '#4CC46E'; g.fillRect(AP_W - 96, 34, 86 * P.wingT / AP_WING_S, 4);
  }
  if (apBoss && apBoss.entered && !apBoss.dying) {                            // the boss's health
    g.fillStyle = 'rgba(14,26,48,0.62)'; g.fillRect(0, 42, AP_W, 22);
    apText(g, AP_BOSS_DEFS[apBoss.kind].short, 10, 53, 11, AP_RED, 'left');
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(100, 48, 250, 10);
    g.fillStyle = apBoss.hp < apBoss.maxHp * 0.5 ? AP_RED : AP_GOLD;
    g.fillRect(100, 48, 250 * apBoss.hp / apBoss.maxHp, 10);
    if (apBoss.kind === 'baron') [0.66, 0.33].forEach(t => { g.fillStyle = AP_CHALK; g.fillRect(100 + 250 * t - 1, 46, 2, 14); });
  }
}

function apDrawWarning(g) {
  const on = Math.floor(apPhaseT * 4) % 2 === 0;
  const def = AP_BOSS_DEFS[apLv.boss];
  g.save();
  g.fillStyle = 'rgba(14,26,48,0.75)'; g.fillRect(0, 262, AP_W, 84);
  g.beginPath(); g.rect(0, 262, AP_W, 84); g.clip();
  g.fillStyle = apLv.nightmare ? 'rgba(232,121,249,0.9)' : 'rgba(255,201,60,0.9)';
  const off = (apClock / 30) % 40;
  [262, 336].forEach(by => {
    for (let x = -40 + off; x < AP_W + 40; x += 40) { g.beginPath(); g.moveTo(x, by); g.lineTo(x + 20, by); g.lineTo(x + 10, by + 10); g.lineTo(x - 10, by + 10); g.closePath(); g.fill(); }
  });
  g.restore();
  if (on) apText(g, 'WARNING!', AP_W / 2, 294, 32, AP_RED, 'center', true);
  apText(g, def.name + ' INBOUND', AP_W / 2, 322, 13, AP_CHALK, 'center', true);
}

function apPanel(g, x, y, w, h) {
  apRoundRect(g, x, y, w, h, 16);
  g.fillStyle = 'rgba(14,26,48,0.93)'; g.fill();
  g.strokeStyle = AP_GOLD; g.lineWidth = 3; g.stroke();
}

function apDrawButton(r, label, size = 22) {
  const g = apCtx;
  apRoundRect(g, r.x, r.y, r.w, r.h, 12);
  g.fillStyle = 'rgba(255,201,60,0.16)'; g.fill();
  g.strokeStyle = AP_GOLD; g.lineWidth = 3; g.stroke();
  apText(g, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, AP_GOLD);
}

function apDrawAttract(g) {
  apPanel(g, 24, 70, 312, 452);
  apText(g, 'ASHER', AP_W / 2 - 52, 126, 40, AP_CHALK);
  apText(g, 'PLANE', AP_W / 2 + 64, 126, 40, AP_GOLD);
  if (apWarp) apText(g, 'WARP: START IN ' + AP_STAGES[apWarp].name, AP_W / 2, 164, 13, AP_PINK);
  else apText(g, 'FIVE BOSSES. THEN TWILIGHT.', AP_W / 2, 164, 13, AP_DIM);
  apText(g, 'GRAB THE CRATES', AP_W / 2, 204, 12, AP_DIM);
  AP_DROP_ORDER.forEach((k, n) => {
    const x = 52 + n * 64, y = 244;
    apRoundRect(g, x - 15, y - 15, 30, 30, 7); g.fillStyle = AP_DROPS[k].col; g.fill();
    apDrawIcon(g, k, x, y, 1.1);
    apText(g, AP_DROPS[k].label, x, y + 30, 10, AP_CHALK);
  });
  apDrawStar(g, 96, 318, 9, apClock / 300);
  apText(g, 'CATCH STARS IN A ROW', 112, 318, 12, AP_GOLD, 'left');
  apText(g, 'DRAG ANYWHERE TO FLY', AP_W / 2, 358, 17, AP_CHALK);
  apText(g, 'YOU SHOOT ALL BY YOURSELF', AP_W / 2, 384, 12, AP_DIM);
  apDrawButton(AP_BTN_PLAY, 'TAKE OFF', 26);
  if (apLeaderboard.length) apText(g, 'BEST  ' + apPad(apLeaderboard[0].score), AP_W / 2, 504, 14, AP_DIM);
}

function apDrawOver(g) {
  if (apOverT < 0.6) return;
  const a = Math.min(1, (apOverT - 0.6) / 0.4);
  g.fillStyle = `rgba(10,18,36,${0.5 * a})`; g.fillRect(0, 0, AP_W, AP_H);
  g.globalAlpha = a;
  apText(g, 'MAYDAY!', AP_W / 2, 250, 46, AP_RED, 'center', true);
  apText(g, 'SPLASHDOWN IN ' + apLastStageName, AP_W / 2, 292, 13, AP_CHALK, 'center', true);
  apText(g, apPad(apLastScore), AP_W / 2, 346, 36, AP_GOLD, 'center', true);
  if (apBestChain >= 10) apText(g, 'BEST STAR CHAIN ' + apBestChain, AP_W / 2, 384, 13, AP_CHALK, 'center', true);
  g.globalAlpha = 1;
}

function apDrawNameEntry(g) {
  apPanel(g, 24, 120, 312, 400);
  apText(g, 'ACE PILOT!', AP_W / 2, 168, 30, AP_GOLD);
  apText(g, apPad(apLastScore), AP_W / 2, 212, 28, AP_CHALK);
  apText(g, 'PAINT YOUR CALL SIGN', AP_W / 2, 262, 14, AP_DIM);
  AP_SLOTS.forEach((r, k) => {
    apRoundRect(g, r.x, r.y, r.w, r.h, 8);
    g.fillStyle = 'rgba(248,244,232,0.08)'; g.fill();
    g.strokeStyle = AP_GOLD; g.lineWidth = 3; g.stroke();
    apText(g, AP_ALPHABET[apInitials[k]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, AP_CHALK);
  });
  apText(g, 'TAP A LETTER TO CHANGE IT', AP_W / 2, 406, 12, AP_DIM);
  apDrawButton(AP_BTN_OK, 'DONE');
}

function apDrawLeaderboard(g) {
  apPanel(g, 14, 96, 332, 516);
  apText(g, 'TOP ACES', AP_W / 2, 146, 30, AP_GOLD);
  apText(g, 'BEST FLIGHTS TODAY', AP_W / 2, 176, 13, AP_DIM);
  for (let k = 0; k < AP_TOP_N; k++) {
    const y = 222 + k * 46, e = apLeaderboard[k];
    const col = k === apLastEntry ? AP_GOLD : e ? AP_CHALK : AP_DIM;
    apText(g, String(k + 1), 44, y, 20, col, 'left');
    apText(g, e ? e.name : '---', 78, y, 22, col, 'left');
    apText(g, e ? apPad(e.score) : '', 318, y, 20, col, 'right');
  }
  apText(g, 'THIS FLIGHT  ' + apPad(apLastScore), AP_W / 2, 470, 15, AP_CHALK);
  apDrawButton(AP_BTN_LB_AGAIN, 'FLY AGAIN', 20);
  apDrawButton(AP_BTN_LB_MENU, 'MENU', 20);
}

// ═══════════════════════════════════════════════════════════════════════════
// Input
// ═══════════════════════════════════════════════════════════════════════════
function apToLogical(e) {
  const r = apCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * AP_W / r.width, y: (e.clientY - r.top) * AP_H / r.height };
}
function apHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function apSubmitInitials() {
  AP_SOUND.select();
  apSubmitScore(apInitials.map(i => AP_ALPHABET[i]).join(''), apLastScore);
  apEnterState('leaderboard');
}

// Buttons fire on press. In play, a press just starts a drag.
function apOnDown(p) {
  if (apState === 'attract') {
    if (apHit(AP_BTN_PLAY, p)) { AP_SOUND.select(); apEnterState('playing'); return; }
    if (apHit(AP_TITLE_HIT, p)) { apWarp = (apWarp + 1) % AP_STAGES.length; AP_SOUND.select(); }   // play-test warp
    return;
  }
  if (apState === 'playing') { apDragP = p; return; }
  if (apState === 'nameEntry') {
    for (let i = 0; i < AP_SLOTS.length; i++) {
      if (apHit(AP_SLOTS[i], p)) { apInitials[i] = (apInitials[i] + 1) % 26; AP_SOUND.select(); return; }
    }
    if (apHit(AP_BTN_OK, p)) apSubmitInitials();
    return;
  }
  if (apState === 'leaderboard') {
    if (apHit(AP_BTN_LB_AGAIN, p)) { AP_SOUND.select(); apEnterState('playing'); return; }
    if (apHit(AP_BTN_LB_MENU, p))  { AP_SOUND.select(); apEnterState('attract'); }
  }
}

// Only one pointer at a time: a second finger is ignored entirely. A finger
// that tapped TAKE OFF doesn't steer until it lifts and presses again (apDragP
// is only set by a press that lands while already playing).
function apStagePointer(e, phase) {
  if (phase === 'down') {
    if (apPtrId !== null) return;
    apPtrId = e.pointerId;
    apOnDown(apToLogical(e));
    return;
  }
  if (e.pointerId !== apPtrId) return;
  if (phase === 'move') {
    if (apState !== 'playing' || !apDragP) return;
    const p = apToLogical(e), P = apPlayer;
    const dx = p.x - apDragP.x, dy = p.y - apDragP.y;
    P.x = apClamp(P.x + dx * AP_DRAG_GAIN, AP_MIN_X, AP_MAX_X);
    P.y = apClamp(P.y + dy * AP_DRAG_GAIN, AP_MIN_Y, AP_MAX_Y);
    P.bankTo = apClamp(P.bankTo + dx * 0.12, -1, 1);
    apDragP = p;
    return;
  }
  apPtrId = null; apDragP = null;                 // up / cancel
}

(function apBindInput() {
  const stage = document.getElementById('ap-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); apStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) apStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => apStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => apStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => apStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-asherplane').style.display !== 'none';
  const setKey = (e, on) => {
    const k = e.key;
    if (k === 'ArrowLeft'  || k === 'a' || k === 'A') { apKeys.left = on; return true; }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { apKeys.right = on; return true; }
    if (k === 'ArrowUp'    || k === 'w' || k === 'W') { apKeys.up = on; return true; }
    if (k === 'ArrowDown'  || k === 's' || k === 'S') { apKeys.down = on; return true; }
    return false;
  };
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (setKey(e, true)) { e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (apState === 'attract' || apState === 'leaderboard') { AP_SOUND.select(); apEnterState('playing'); }
      else if (apState === 'nameEntry') apSubmitInitials();
    }
  });
  document.addEventListener('keyup', e => { setKey(e, false); });
  document.getElementById('btn-ap-exit').addEventListener('click', () => { resetArcade(); arcExitCabinet(); });
  // A child WILL put the iPad down mid-run: stop the loop while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
      apPtrId = null; apDragP = null; apKeys.left = apKeys.right = apKeys.up = apKeys.down = false;
    } else if (!apRafHandle) { apLastT = 0; apRafHandle = requestAnimationFrame(apLoop); }
  });
})();

// Fit the fixed 360x640 logical canvas into its box, with a backing store at
// (CSS scale × devicePixelRatio) so it stays crisp on an iPad.
function apResize() {
  if (!apCanvas) return;
  const box = apCanvas.parentElement;
  const scale = Math.min(box.clientWidth / AP_W, box.clientHeight / AP_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  apCanvas.style.width  = Math.floor(AP_W * scale) + 'px';
  apCanvas.style.height = Math.floor(AP_H * scale) + 'px';
  apCanvas.width  = Math.floor(AP_W * scale * dpr);
  apCanvas.height = Math.floor(AP_H * scale * dpr);
  apCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// Called from engine.js resetToLobby() (the name is kept from v1).
function resetArcade() {
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
  apState = 'attract'; apPtrId = null; apDragP = null;
  apKeys.left = apKeys.right = apKeys.up = apKeys.down = false;
  apEvents = []; apParts = []; apCallouts = []; apShake = 0; apFlash = null; apBolt = null;
  apShots = []; apFoes = []; apFoeShots = []; apDrops = []; apStars = []; apBoss = null;
  // apLeaderboard is NOT cleared — session high scores survive the lobby.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') apResize();
});
