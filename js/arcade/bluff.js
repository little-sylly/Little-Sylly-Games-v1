// ═══════════════════════════════════════════════════════════════════════════
// bluff.js — ARCADE CABINET 07. BEYOND THE BLUFF: a Doodle Jump-style climb up
// a sea cliff built from giant stacked dice. The pips are the holds, dice tumble
// down as rockfall, and The Depths rise from below. Set in The Bluff's (`dyb`)
// world and voice. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//  - Prefix `bb`. Screen id: screen-arcade-bluff. DOM: #bb-stage (pointer
//    target, touch-action:none) wrapping #bb-canvas, plus #btn-bb-exit.
//  - engine.js resetToLobby() should call resetArcadeBluff() beside resetArcade().
//  - NO setTimeouts: every delayed effect is scheduled on bbClock via bbEvents.
//
// HOW IT PLAYS
//  - The climber hops on their own whenever they come down onto a pip.
//    Drag anywhere (finger or mouse) to steer: the climber moves as far as your
//    finger moves, so your thumb never covers them. Off one side = on at the
//    other. Arrow keys / A-D steer on desktop.
//  - The cliff is one die face per 10 m. The face decides the holds: a 6 is
//    easy, a 1 is a single hold. Low faces get commoner the higher you go —
//    like a Claim, the climb only ever gets bolder.
//  - PITCHES (Oct 2026 — the specials used to arrive at random, all by 200 m):
//    every 100 m is a ledge, THE OVERLOOK, a full-width shelf that's a
//    checkpoint (a die back in your cup, The Depths fall back). Each pitch
//    brings ONE new thing, with a banner and a coach line the first time:
//      1 THE OPENER      holds, RAISE (gold ring, big launch), plain rockfall
//      2 CALL THE BLUFF  BLUFF holds (pale and cracked — they crumble, no hop)
//      3 SLICK ROCK      SLICK holds (wet — a weak hop), Cracked dice (split in two)
//      4 LOADED          Loaded dice (big and fast), and a ROCKSLIDE mid-pitch
//      5 THE TEMPEST     gusts blow you sideways, Phantom dice (faint until close)
//      6 SNAKE EYES      Snake dice drift at you
//      7+ THE SUMMIT PUSH everything, and The Depths climb faster every pitch.
//  - Power-ups sit on some holds from pitch 2, like the spare dice: CHALK UP
//    (the next falling die bounces off you) and LOADED HOPS (every hop is big
//    for a few seconds).
//  - Rockfall: dice drop from above, flagged by a marker at the top of the
//    screen. A die that only just misses you is a CLOSE CALL.
//  - Lives are the dice in your cup (5). A rock hit or a plunge into The Depths
//    costs one; a plunge with dice left throws you back up. Spare dice sit on
//    some holds.
//  - Score is height in metres.
//  - The voice stays in The Bluff's climbing register (its identity doc: no
//    jokes that undercut the tension) — the announcer is loud, never silly.
//
// ROUTE GUARANTEE (so a run never dead-ends): a normal hop rises ~220 px and
// the biggest gap between rows is 185 px (a 1-face). Specials only go where a
// normal route still exists: BLUFF/SLICK only on faces 3+, SLICK only on the
// middle row (bottom→top row is reachable directly), BLUFF only on a middle-row
// pip or where its row has another real pip. Never two 1-faces in a row, and
// never a 1-face either side of a ledge (a 1-face's lone pip sits 270 px from
// the ledge's shelf — out of reach).
// ═══════════════════════════════════════════════════════════════════════════
const BB_W = 360, BB_H = 640;
const BB_TITLE = 'BEYOND THE BLUFF';
const BB_TOP_N = 5;

// Cliff geometry — world px, y grows UP from the foot of the cliff.
const BB_SEC = 270;                      // one die face of cliff per section
const BB_PX_PER_M = 27;                  // so one face = 10 m
const BB_FACE_X = 24, BB_FACE_W = 312;   // where each face sits across the screen
const BB_COL = [92, 180, 268];           // pip columns: left, centre, right
const BB_ROW = [50, 135, 220];           // pip rows within a section: bottom, middle, top
const BB_PIP_R = 22;
const BB_LAND_REACH = 30;                // how far off-centre you can still catch a pip

// Physics (px, seconds)
const BB_GRAV = 1600;
const BB_HOP_V = 840;                    // normal hop ≈ 220 px high
const BB_SLICK_V = 640;                  // slick hop ≈ 128 px
const BB_RAISE_V = 1250;                 // RAISE hop ≈ 488 px
const BB_RESCUE_V = 1150;                // thrown back up out of The Depths
const BB_DRAG_GAIN = 1.15;
const BB_KEY_SPEED = 300;
const BB_CAM_LEAD = 300;                 // climber rides this far above the screen bottom
const BB_CUP_MAX = 5;
const BB_INVULN = 1.4;

// Palette — The Bluff's warm rock-grey world, washed like the box art
const BB_INK = '#2A221B', BB_CHALK = '#F2EBDD', BB_ROCK = '#6B5744',
      BB_GOLD = '#E0A84A', BB_RED = '#E2574C', BB_DIM = '#A89A86',
      BB_SEA = '#3E7C8C', BB_SEA_DEEP = '#1F4652', BB_FOAM = '#E8F1F0';
const BB_TINTS = ['#E8E2D4', '#D9B98C', '#CFA25A', '#C27A5C', '#98A473', '#8C97A2']; // chalk sandstone ochre terracotta moss slate
const BB_WASH  = ['rgba(240,160,175,0.34)', 'rgba(140,200,212,0.34)', 'rgba(248,214,120,0.34)', 'rgba(190,170,225,0.30)'];
const BB_SKY_LO = [207, 227, 232], BB_SKY_HI = [36, 44, 74];  // sea mist → dusk with height

// Die pip layouts on a 3×3 grid: [col, row], row 0 = bottom.
const BB_FACE_PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

// Rockfall kinds unlock by pitch. Names shown the first time each appears.
const BB_KINDS  = ['cracked', 'loaded', 'phantom', 'snake'];
const BB_UNLOCK = [3, 4, 5, 6];
const BB_KIND_NAME = { cracked: 'CRACKED DICE!', loaded: 'LOADED DICE!', phantom: 'PHANTOM DICE!', snake: 'SNAKE EYES!' };

// ── Pitches ─────────────────────────────────────────────────────────────────
const BB_PITCH_SECS = 10;                // a ledge every 10 faces = 100 m
const BB_PITCHES = [
  { name: 'THE OPENER',     adds: null,      sub: 'CLIMB THE DICE, PIP BY PIP' },
  { name: 'CALL THE BLUFF', adds: 'bluff',   sub: 'NEW: BLUFF HOLDS' },
  { name: 'SLICK ROCK',     adds: 'slick',   sub: 'NEW: SLICK HOLDS · CRACKED DICE' },
  { name: 'LOADED',         adds: 'loaded',  sub: 'NEW: LOADED DICE · ROCKSLIDES' },
  { name: 'THE TEMPEST',    adds: 'tempest', sub: 'NEW: GUSTS · PHANTOM DICE' },
  { name: 'SNAKE EYES',     adds: 'snake',   sub: 'NEW: SNAKE EYES' },
];
const BB_SUMMIT_SUB = 'THE DEPTHS CLIMB FASTER';
const BB_ROCKS_FROM_M = 30;              // plain rockfall starts here
const BB_SLIDE_S = 4.2, BB_SLIDE_EVERY = 0.32, BB_SLIDE_WARN_S = 1.3;
const BB_GUST_WARN_S = 1.2, BB_GUST_S = 1.6, BB_GUST_PUSH = 125, BB_GUST_GAP = [5.5, 8.5];
const BB_LOADED_S = 6, BB_CHALK_S = 14;
const BB_NEAR_PX = 20;                   // a die passing this close (beyond the hit) is a CLOSE CALL
const BB_COACH_S = 4.8;
const BB_COACH = {
  start:   'Drag anywhere to steer. You hop on your own every time you land on a pip.',
  raise:   'A gold ring is a Raise. Land on it for a huge launch.',
  rock:    'Rockfall! The marker at the top shows where a die is coming down.',
  ledge:   'A ledge! The Depths fall back and you get a die back in your cup.',
  bluff:   'Pale, cracked pips are bluffs. They crumble when you land on them.',
  slick:   'Wet pips are slick. You only get a little hop off them.',
  loaded:  'Loaded dice are big and heavy, and they fall fast.',
  slide:   'Rockslide! Dice are pouring down. Keep moving and watch the markers.',
  tempest: 'The Tempest blows you sideways. Steer against the wind.',
  snake:   'Snake Eyes drift towards you as they fall. Keep moving.',
  cracked: 'Cracked dice split in two halfway down.',
  phantom: 'Phantom dice are faint until they get close to you.',
  chalk:   'Chalk Up! The next falling die bounces off you.',
  loadedhop: 'Loaded Hops! Every hop is a big one for a few seconds.',
  spare:   'A spare die! Grab it to put a die back in your cup.',
};
const BB_SAY_NEAR = ['CLOSE CALL', 'TOO CLOSE', 'NOT TODAY'];

const BB_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  hop:       () => playSecretBeep(440),
  slick:     () => playSecretBeep(330),
  raise:     () => { playSecretBeep(784); bbLater(70, () => playSecretBeep(1175)); },
  bluff:     () => { playSecretBeep(220); bbLater(80, () => playSecretBeep(165)); },
  hit:       () => playSecretBeep(147),
  plunge:    () => { playSecretBeep(196); bbLater(120, () => playSecretBeep(131)); },
  pickup:    () => { playSecretBeep(880); bbLater(80, () => playSecretBeep(1319)); },
  warn:      () => { playSecretBeep(988); bbLater(110, () => playSecretBeep(988)); },
  milestone: () => [784, 988, 1175, 1568].forEach((f, k) => bbLater(k * 90, () => playSecretBeep(f))),
  ledge:     () => [523, 659, 784, 1047, 1319].forEach((f, k) => bbLater(k * 100, () => playSecretBeep(f))),
  near:      () => { playSecretBeep(1319); bbLater(60, () => playSecretBeep(880)); },
  chalk:     () => { playSecretBeep(1568); bbLater(90, () => playSecretBeep(1175)); },
  power:     () => [880, 1175, 1568, 2093].forEach((f, k) => bbLater(k * 70, () => playSecretBeep(f))),
  rumble:    () => [98, 87, 98, 82].forEach((f, k) => bbLater(k * 140, () => playSecretBeep(f))),
  gust:      () => { playSecretBeep(330); bbLater(120, () => playSecretBeep(294)); bbLater(240, () => playSecretBeep(262)); },
  depths:    () => { playSecretBeep(147); bbLater(200, () => playSecretBeep(139)); },
};
const BB_OVER_JINGLE = [523, 392, 330, 262];

// Layout rects (logical px)
const BB_BTN_PLAY     = { x: 40,  y: 410, w: 280, h: 64 };
const BB_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const BB_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const BB_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const BB_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

let bbCanvas = null, bbCtx = null;
let bbRafHandle = null, bbLastT = 0;
let bbState = 'attract';   // attract | playing | over | nameEntry | leaderboard
let bbClock = 0;           // ms of un-paused time
let bbEvents = [];         // [{ at, fn }] — replaces setTimeout
let bbParts = [];          // particles, world coords
let bbCallouts = [];       // floating words, screen coords
let bbShake = 0;
let bbScore = 0, bbLastScore = 0;
let bbPtrId = null;        // the one pointer allowed to act
let bbPress = null;
let bbDragX = null;        // last finger x while steering
let bbKeys = { left: false, right: false };
let bbScores = [];         // session leaderboard — NOT cleared by teardown
let bbLastEntry = -1;      // row to highlight on the leaderboard
const BB_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let bbInitials = [0, 0, 0];

// The run
let bbPlayer = null;       // { x, y (feet), vy, face }
let bbCamY = 0;            // world y at the bottom edge of the screen
let bbSeaY = 0;            // world y of The Depths' surface
let bbSecs = [];           // cliff sections, index i covers [i*SEC, (i+1)*SEC)
let bbRocks = [];
let bbRockT = 0;
let bbCup = BB_CUP_MAX, bbCupFlash = 0;
let bbInvuln = 0;
let bbMaxY = 0, bbBeatBest = false;
let bbSeen = {};
let bbOverT = 0, bbSunk = false;
// Pitches, surges, power-ups and the announcer
let bbPitch = 1;
let bbSlide = null;        // { warnAt, from, until, next } — a ROCKSLIDE, mid-pitch from pitch 4
let bbSlideDone = 0;       // the last pitch that had its rockslide
let bbGust = null;         // { dir, warnUntil, until } — a Tempest gust
let bbNextGust = 0;        // bbClock ms
let bbShield = false, bbShieldUntil = 0;
let bbLoadedUntil = 0;     // bbClock ms
let bbFreeze = 0, bbFlash = 0;
let bbShout = null;        // one big line at a time: { text, col, at, life }
let bbBanner = null;       // { at, n, name, sub }
let bbCoach = null, bbCoachQ = [];
let bbCoachSeen = {};      // session-only, like the scores
let bbLastNear = -1e9, bbLastDepthsWarn = -1e9;

function bbStart() {
  bbCanvas = document.getElementById('bb-canvas');
  bbCtx = bbCanvas.getContext('2d');
  showScreen('screen-arcade-bluff');
  bbResize();
  bbEnterState('attract');
}

function bbEnterState(next) {
  bbState = next;
  if (next === 'playing') bbNewGame();
  if (next === 'attract') bbResetRun();
  bbShake = 0; bbPress = null; bbDragX = null;
  if (!bbRafHandle) { bbLastT = 0; bbRafHandle = requestAnimationFrame(bbLoop); }
}

function bbNewGame() { bbResetRun(); bbBeginClimb(); }

// A fresh cliff and climber. Also used behind the attract screen.
function bbResetRun() {
  bbSecs = []; bbRocks = []; bbParts = []; bbCallouts = []; bbEvents = [];
  bbCamY = 0; bbMaxY = BB_ROW[1]; bbScore = 0;
  bbPlayer = { x: BB_COL[1], y: BB_ROW[1], vy: BB_HOP_V, face: 1 };
  bbCup = BB_CUP_MAX; bbCupFlash = 0; bbInvuln = 0;
  bbRockT = 2.5; bbBeatBest = false; bbSeen = {};
  bbOverT = 0; bbSunk = false;
  bbPitch = 1; bbSlide = null; bbSlideDone = 0; bbGust = null; bbNextGust = 0;
  bbShield = false; bbShieldUntil = 0; bbLoadedUntil = 0; bbFreeze = 0; bbFlash = 0;
  bbShout = null; bbBanner = null; bbCoach = null; bbCoachQ = [];
  bbLastNear = -1e9; bbLastDepthsWarn = -1e9;
  bbEnsureSections();
  bbSeaY = bbCamY + 18;
}

// The start of a climb: the first pitch's banner and the steering coach line.
function bbBeginClimb() {
  bbBanner = { at: bbClock + 200, n: 1, name: BB_PITCHES[0].name, sub: BB_PITCHES[0].sub };
  bbQueueCoach('start');
}
function bbPitchDef(n) { return n <= BB_PITCHES.length ? BB_PITCHES[n - 1] : { name: 'THE SUMMIT PUSH', adds: null, sub: BB_SUMMIT_SUB }; }
function bbPitchOf(sectionIndex) { return Math.floor(sectionIndex / BB_PITCH_SECS) + 1; }
function bbQueueCoach(key) { if (bbCoachSeen[key]) return; bbCoachSeen[key] = true; bbCoachQ.push(key); }
function bbSay(text, col, life) { bbShout = { text, col, at: bbClock, life }; }

function bbLater(ms, fn) { bbEvents.push({ at: bbClock + ms, fn }); }

// ── The cliff ────────────────────────────────────────────────────────────────
function bbEnsureSections() {
  while (bbSecs.length * BB_SEC < bbCamY + BB_H + BB_SEC * 2) bbSecs.push(bbMakeSection(bbSecs.length));
}

function bbPickWeighted(w) {
  let sum = 0; w.forEach(v => { sum += v; });
  let r = Math.random() * sum;
  for (let k = 0; k < w.length; k++) { r -= w[k]; if (r <= 0 && w[k] > 0) return k; }
  return w.length - 1;
}

function bbMakeSection(i) {
  const prev = bbSecs[i - 1];
  const d = Math.min(1, i / 40);                     // difficulty 0 → 1 over the first 400 m
  const pitch = bbPitchOf(i);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let tint = pick(BB_TINTS);
  if (prev && tint === prev.tint) tint = BB_TINTS[(BB_TINTS.indexOf(tint) + 1) % BB_TINTS.length];
  const wash = [0, 1].map(() => ({ x: Math.random(), y: Math.random(), r: 120 + Math.random() * 90, col: pick(BB_WASH) }));
  const strata = [0, 1, 2, 3].map(k => ({ y: 0.14 + k * 0.23 + Math.random() * 0.08, a: (Math.random() - 0.5) * 22, b: (Math.random() - 0.5) * 10 }));
  const cx = 0.2 + Math.random() * 0.6;
  const crack = [[cx, 0]];
  for (let k = 1; k <= 4; k++) crack.push([cx + (Math.random() - 0.5) * 0.12, k * (0.07 + Math.random() * 0.05)]);
  if (i > 0 && i % BB_PITCH_SECS === 0) {            // THE OVERLOOK: a full-width ledge, the start of a new pitch
    const holds = [{ x: BB_W / 2, y: i * BB_SEC + BB_ROW[1], row: 1, kind: 'ledge', gone: false, landT: -1e9, pitch }];
    return { i, face: 0, ledge: true, holds, pickup: null, power: null, tint: BB_TINTS[0], wash, strata, crack };
  }
  let face;
  if (i === 0) face = 5;                             // start: a centre pip right under you
  else if (i === 1) face = 6;
  else {
    const early = [0, 0, 1, 3, 4, 6], late = [3, 5, 5, 4, 2, 1];
    const w = early.map((e, k) => e + (late[k] - e) * d);
    if (d < 0.15 || (prev && prev.face === 1)) w[0] = 0;   // never two single-hold faces in a row
    const k = i % BB_PITCH_SECS;
    if (k === 1 || k === BB_PITCH_SECS - 1) w[0] = 0;      // nor either side of a ledge (see ROUTE GUARANTEE)
    face = bbPickWeighted(w) + 1;
  }
  const mirror = (face === 2 || face === 3) && Math.random() < 0.5;
  const base = i * BB_SEC;
  const holds = BB_FACE_PIPS[face].map(([c, r]) => ({
    x: BB_COL[mirror ? 2 - c : c], y: base + BB_ROW[r], row: r, kind: 'rock', gone: false, landT: -1e9,
  }));

  // BLUFF hold (fake, crumbles) — from pitch 2. See ROUTE GUARANTEE at the top.
  if (pitch >= 2 && face >= 3 && Math.random() < 0.15 + 0.25 * d) {
    const ok = holds.filter(h => h.row === 1 || holds.some(o => o !== h && o.row === h.row));
    if (ok.length) pick(ok).kind = 'fake';
  }
  // SLICK hold (weak hop) — from pitch 3, middle row only.
  if (pitch >= 3 && face >= 3 && Math.random() < 0.12 + 0.2 * d) {
    const ok = holds.filter(h => h.row === 1 && h.kind === 'rock');
    if (ok.length) pick(ok).kind = 'slick';
  }
  // RAISE hold (big launch).
  if (i >= 2 && Math.random() < 0.08) {
    const ok = holds.filter(h => h.kind === 'rock');
    if (ok.length) pick(ok).kind = 'raise';
  }
  // A spare die resting above a real hold — or, from pitch 2, a power-up.
  let pickup = null, power = null;
  const real = holds.filter(h => h.kind === 'rock' || h.kind === 'raise');
  if (i >= 4 && real.length && Math.random() < 0.09) {
    const h = pick(real); pickup = { x: h.x, y: h.y + 48, taken: false };
  } else if (pitch >= 2 && real.length && Math.random() < 0.07) {
    const h = pick(real); power = { x: h.x, y: h.y + 50, taken: false, kind: Math.random() < 0.5 ? 'chalk' : 'loaded' };
  }
  return { i, face, holds, pickup, power, tint, wash, strata, crack };
}

// ── Loop ─────────────────────────────────────────────────────────────────────
function bbLoop(now) {
  bbRafHandle = null;
  if (!bbLastT) bbLastT = now;
  const dt = Math.min((now - bbLastT) / 1000, 0.05);
  bbLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) bbUpdate(dt);
  bbDraw();
  if (!bbRafHandle) bbRafHandle = requestAnimationFrame(bbLoop);
}

function bbUpdate(dt) {
  if (bbShake > 0) bbShake = Math.max(0, bbShake - dt);
  if (bbFlash > 0) bbFlash = Math.max(0, bbFlash - dt * 2.5);
  if (bbFreeze > 0) { bbFreeze -= dt; return; }   // hit-stop
  bbClock += dt * 1000;
  if (bbCupFlash > 0) bbCupFlash = Math.max(0, bbCupFlash - dt);
  if (bbShout && bbClock - bbShout.at > bbShout.life * 1000) bbShout = null;
  if (bbBanner && bbClock - bbBanner.at > 2400) bbBanner = null;
  if (bbCoach && bbClock > bbCoach.until) bbCoach = null;
  if (!bbCoach && bbCoachQ.length && bbState === 'playing') bbCoach = { text: BB_COACH[bbCoachQ.shift()], until: bbClock + BB_COACH_S * 1000 };
  bbParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.grav || 0) * dt; p.life -= dt; });
  bbParts = bbParts.filter(p => p.life > 0);
  bbCallouts.forEach(c => { c.y -= 26 * dt; c.life -= dt; });
  bbCallouts = bbCallouts.filter(c => c.life > 0);
  if (bbEvents.length) {
    const due = bbEvents.filter(e => bbClock >= e.at);
    bbEvents  = bbEvents.filter(e => bbClock <  e.at);
    due.forEach(e => e.fn());
  }
  if (bbState === 'playing') bbUpdatePlaying(dt);
  else if (bbState === 'over') bbUpdateOver(dt);
  if (bbState === 'playing' || bbState === 'over') bbUpdateRocks(dt);
}

function bbWrap(x) { return ((x % BB_W) + BB_W) % BB_W; }
function bbMetres() { return Math.max(0, Math.floor((bbMaxY - BB_ROW[1]) / BB_PX_PER_M)); }

function bbUpdatePlaying(dt) {
  const p = bbPlayer;
  const k = (bbKeys.right ? 1 : 0) - (bbKeys.left ? 1 : 0);
  if (k) { p.x += k * BB_KEY_SPEED * dt; p.face = k; }
  p.x = bbWrap(p.x);

  const prevY = p.y;
  p.vy -= BB_GRAV * dt;
  p.y += p.vy * dt;
  if (p.vy < 0) bbCheckLanding(prevY);

  bbCamY = Math.max(bbCamY, p.y - BB_CAM_LEAD);     // the camera only ever climbs
  bbEnsureSections();
  if (!bbCoachSeen.raise) {                          // the first gold ring on screen gets its coach line
    const i0 = Math.floor(bbCamY / BB_SEC);
    for (let i = i0; i < i0 + 3; i++) {
      const s = bbSecs[i];
      if (s && s.holds.some(h => h.kind === 'raise' && bbSY(h.y) > 80 && bbSY(h.y) < 520)) bbQueueCoach('raise');
    }
  }

  // Height, beating the session best
  bbMaxY = Math.max(bbMaxY, p.y);
  bbScore = bbMetres();
  if (!bbBeatBest && bbScores.length && bbScore > bbScores[0].score) {
    bbBeatBest = true;
    bbSay('NEW HEIGHT', BB_CHALK, 1.6);
    BB_SOUND.milestone();
  }

  // Spare dice and power-ups
  const i0 = Math.floor(p.y / BB_SEC);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const s = bbSecs[i];
    if (!s) continue;
    const near = pk => pk && !pk.taken && Math.abs(p.x - pk.x) < 26 && Math.abs(p.y + 15 - pk.y) < 30;
    if (near(s.pickup)) {
      const pk = s.pickup;
      pk.taken = true;
      BB_SOUND.pickup();
      bbSparkle(pk.x, pk.y, BB_GOLD, 10);
      if (bbCup < BB_CUP_MAX) { bbCup++; bbCallout('+1 DIE', pk.x, bbSY(pk.y) - 20, BB_GOLD, 20, 1.0); }
      else bbCallout('FULL CUP', pk.x, bbSY(pk.y) - 20, BB_CHALK, 16, 0.9);
    }
    if (near(s.power)) bbTakePower(s.power);
    if (s.pickup && !s.pickup.taken && bbSY(s.pickup.y) > 80 && bbSY(s.pickup.y) < 560) bbQueueCoach('spare');
  }

  // The Depths creep up once you're off the ground — faster every pitch — and never sit far below the screen.
  if (bbScore >= 6) bbSeaY += Math.min(55 + bbPitch * 4, 14 + bbScore * 0.06 + (bbPitch - 1) * 2.5) * dt;
  bbSeaY = Math.max(bbSeaY, bbCamY + 18);
  if (p.y < bbSeaY - 6) { bbPlunge(); if (bbState !== 'playing') return; }
  if (p.y - bbSeaY < 110 && p.vy < 0 && bbClock - bbLastDepthsWarn > 6000 && bbScore > 20) {
    bbLastDepthsWarn = bbClock;
    bbSay('THE DEPTHS ARE RISING', '#9CCAD4', 1.3);
    BB_SOUND.depths();
  }

  // Rockfall — plus, from pitch 4, one ROCKSLIDE half-way up each pitch
  if (bbScore >= BB_ROCKS_FROM_M) {
    bbRockT -= dt;
    if (bbRockT <= 0) {
      bbSpawnRock();
      bbRockT = Math.max(0.85, 2.6 - bbScore * 0.006) * (0.75 + Math.random() * 0.5);
    }
  }
  bbUpdateSlide(dt);
  bbUpdateGust(dt);
  if (bbShield && bbClock > bbShieldUntil) bbShield = false;
  if (bbInvuln > 0) bbInvuln = Math.max(0, bbInvuln - dt);
}

function bbTakePower(pw) {
  pw.taken = true;
  BB_SOUND.power();
  bbSparkle(pw.x, pw.y, pw.kind === 'chalk' ? BB_CHALK : BB_GOLD, 16);
  bbFlash = 0.25;
  if (pw.kind === 'chalk') {
    bbShield = true; bbShieldUntil = bbClock + BB_CHALK_S * 1000;
    bbSay('CHALK UP', BB_CHALK, 1.2); bbQueueCoach('chalk');
  } else {
    bbLoadedUntil = bbClock + BB_LOADED_S * 1000;
    bbSay('LOADED HOPS', BB_GOLD, 1.2); bbQueueCoach('loadedhop');
  }
}

// A ROCKSLIDE: warned, then a few seconds of dice pouring down.
function bbUpdateSlide(dt) {
  const mid = (bbPitch - 1) * BB_PITCH_SECS + 5;
  if (!bbSlide && bbPitch >= 4 && bbSlideDone < bbPitch && bbMaxY >= mid * BB_SEC) {
    bbSlideDone = bbPitch;
    bbSlide = { warnUntil: bbClock + BB_SLIDE_WARN_S * 1000, until: bbClock + (BB_SLIDE_WARN_S + BB_SLIDE_S) * 1000, next: 0 };
    bbSay('ROCKSLIDE!', BB_RED, 1.4);
    BB_SOUND.rumble();
    bbQueueCoach('slide');
  }
  if (!bbSlide) return;
  if (bbClock >= bbSlide.until) { bbSlide = null; return; }
  if (bbClock < bbSlide.warnUntil) { bbShake = Math.max(bbShake, 0.05); return; }
  bbShake = Math.max(bbShake, 0.08);
  bbSlide.next -= dt;
  if (bbSlide.next <= 0) { bbSlide.next = BB_SLIDE_EVERY * (0.7 + Math.random() * 0.6); bbSpawnRock(true); }
}

// The Tempest's gusts, from pitch 5: streaks and an arrow first, then a push.
function bbUpdateGust(dt) {
  if (bbPitch < 5) return;
  if (!bbGust) {
    if (!bbNextGust) bbNextGust = bbClock + 3000;
    if (bbClock >= bbNextGust) {
      bbGust = { dir: Math.random() < 0.5 ? -1 : 1, warnUntil: bbClock + BB_GUST_WARN_S * 1000, until: bbClock + (BB_GUST_WARN_S + BB_GUST_S) * 1000 };
      BB_SOUND.gust();
      bbQueueCoach('tempest');
    }
    return;
  }
  if (bbClock >= bbGust.until) {
    bbGust = null;
    bbNextGust = bbClock + (BB_GUST_GAP[0] + Math.random() * (BB_GUST_GAP[1] - BB_GUST_GAP[0])) * 1000;
    return;
  }
  if (bbClock >= bbGust.warnUntil) bbPlayer.x = bbWrap(bbPlayer.x + bbGust.dir * BB_GUST_PUSH * dt);
  if (Math.random() < 0.5) {   // the wind you can see
    bbParts.push({ x: bbGust.dir > 0 ? -10 : BB_W + 10, y: bbCamY + 60 + Math.random() * (BB_H - 120),
      vx: bbGust.dir * (420 + Math.random() * 200), vy: 0, grav: 0, life: 0.9, max: 0.9, col: 'rgba(242,235,221,0.7)', size: 2, streak: true });
  }
}

function bbCheckLanding(prevY) {
  const p = bbPlayer;
  const i0 = Math.floor(p.y / BB_SEC);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const s = bbSecs[i];
    if (!s) continue;
    for (const h of s.holds) {
      if (h.gone) continue;
      const reach = h.kind === 'ledge' ? BB_FACE_W / 2 + 8 : BB_LAND_REACH;   // a ledge is the whole width of the face
      if (prevY >= h.y && p.y <= h.y && Math.abs(p.x - h.x) <= reach) { bbLand(h); return; }
    }
  }
}

function bbLand(h) {
  const p = bbPlayer;
  if (h.kind === 'fake') {                        // it was a bluff — crumbles, you keep falling
    h.gone = true;
    BB_SOUND.bluff();
    bbBurst(h.x, h.y, [BB_INK, '#5A4A3C', BB_DIM], 12, 160, 700);
    bbCallout('BLUFF!', h.x, bbSY(h.y) - 30, BB_RED, 22, 0.9);
    return;
  }
  p.y = h.y; h.landT = bbClock;
  const loaded = bbClock < bbLoadedUntil;
  if (h.kind === 'ledge') {
    p.vy = BB_HOP_V;
    BB_SOUND.hop();
    bbBurst(p.x, h.y, [BB_CHALK, BB_DIM], 10, 120, 400);
    if (!h.reached) { h.reached = true; bbReachPitch(h.pitch); }
  } else if (h.kind === 'raise') {
    p.vy = BB_RAISE_V;
    BB_SOUND.raise();
    bbSparkle(h.x, h.y, BB_GOLD, 14);
    bbCallout('RAISE!', h.x, bbSY(h.y) - 34, BB_GOLD, 24, 0.9);
  } else if (h.kind === 'slick' && !loaded) {
    p.vy = BB_SLICK_V;
    BB_SOUND.slick();
    bbBurst(h.x, h.y, ['#BFE3EC', BB_FOAM], 6, 90, 400);
    bbCallout('SLICK', h.x, bbSY(h.y) - 30, '#BFE3EC', 18, 0.7);
  } else if (loaded) {                             // LOADED HOPS: every hop is a big one
    p.vy = BB_RAISE_V * 0.82;
    BB_SOUND.raise();
    bbSparkle(h.x, h.y, BB_GOLD, 8);
  } else {
    p.vy = BB_HOP_V;
    BB_SOUND.hop();
    bbBurst(h.x, h.y, [BB_CHALK], 4, 70, 300);
  }
}

// THE OVERLOOK: a new pitch. The banner, its coach line, a die back, and The Depths fall away.
function bbReachPitch(n) {
  bbPitch = n;
  const P = bbPitchDef(n);
  bbBanner = { at: bbClock, n, name: P.name, sub: P.sub };
  BB_SOUND.ledge();
  bbFlash = 0.4;
  bbShake = Math.max(bbShake, 0.15);
  bbSparkle(BB_W / 2, bbPlayer.y, BB_GOLD, 22);
  bbSeaY = Math.max(bbCamY + 18, bbSeaY - 220);
  if (bbCup < BB_CUP_MAX) { bbCup++; bbCallout('+1 DIE', bbPlayer.x, bbSY(bbPlayer.y) - 50, BB_GOLD, 20, 1.1); }
  bbQueueCoach('ledge');
  if (P.adds) bbQueueCoach(P.adds);
}

function bbPlunge() {
  const p = bbPlayer;
  bbSplash(p.x);
  BB_SOUND.plunge();
  bbLoseDie('plunge');
  if (bbState !== 'playing') return;              // that was the last die
  p.y = bbSeaY + 4; p.vy = BB_RESCUE_V;
  bbInvuln = BB_INVULN;
  bbSeaY = Math.max(bbCamY + 18, bbSeaY - 60);    // The Depths fall back a little
  bbCallout('THE PLUNGE', BB_W / 2, 260, BB_FOAM, 26, 1.2);
}

function bbLoseDie(cause) {
  bbCup = Math.max(0, bbCup - 1);
  bbCupFlash = 0.7;
  bbShake = 0.35;
  if (bbCup <= 0) bbGameOver(cause);
}

// ── Rockfall ─────────────────────────────────────────────────────────────────
function bbSpawnRock(slide = false) {
  const m = bbScore;
  const pool = BB_KINDS.filter((k, n) => bbPitch >= BB_UNLOCK[n]);
  const kind = (!pool.length || slide || Math.random() < 0.45) ? 'plain' : pool[Math.floor(Math.random() * pool.length)];
  const size = kind === 'loaded' ? 50 : 36;
  const speed = Math.min(360, 170 + m * 0.6) * (kind === 'loaded' ? 1.55 : 1) * (slide ? 1.15 : 1);
  const x = Math.random() < (slide ? 0.3 : 0.5)
    ? Math.max(30, Math.min(330, bbPlayer.x + (Math.random() - 0.5) * 120))   // half aim near you
    : 30 + Math.random() * 300;
  if (!bbSeen.any) { bbSeen.any = true; bbQueueCoach('rock'); }
  bbRocks.push({
    kind, x, y: 0, vx: 0, vy: -speed, size,
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 4,
    face: kind === 'snake' ? 2 : 1 + Math.floor(Math.random() * 6),
    warn: 0.9, split: false, dead: false,
  });
  if (kind !== 'plain' && !bbSeen[kind]) {
    bbSeen[kind] = true;
    BB_SOUND.warn();
    bbCallout(BB_KIND_NAME[kind], BB_W / 2, 110, BB_GOLD, 22, 1.8);
    if (BB_COACH[kind]) bbQueueCoach(kind);
  }
}

function bbUpdateRocks(dt) {
  const p = bbPlayer;
  const born = [];
  for (const r of bbRocks) {
    if (r.warn > 0) {                              // still only a marker at the top
      r.warn -= dt;
      if (r.warn <= 0) r.y = bbCamY + BB_H + r.size;
      continue;
    }
    if (r.kind === 'snake' && bbState === 'playing') {
      r.vx += Math.sign(p.x - r.x) * 90 * dt;
      r.vx = Math.max(-70, Math.min(70, r.vx));
    }
    r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
    if (r.kind === 'cracked' && !r.split && r.y < bbCamY + 430) {   // splits apart mid-fall
      r.split = true; r.dead = true;
      bbBurst(r.x, r.y, ['#D3C4A6', BB_INK], 6, 80, 400);
      playSecretBeep(262);
      [-1, 1].forEach(sd => born.push({ ...r, kind: 'half', size: 24, vx: sd * 80, vr: sd * 5, dead: false }));
      continue;
    }
    if (bbState === 'playing' && bbInvuln <= 0 && !r.bounced) {
      const dx = p.x - r.x, dy = (p.y + 15) - r.y, reach = r.size * 0.42 + 11;
      const d2 = dx * dx + dy * dy;
      if (d2 < reach * reach) {
        if (bbShield) {                            // CHALK UP: it bounces off
          bbShield = false;
          r.bounced = true; r.vy = 260; r.vx = (r.x < p.x ? -1 : 1) * 220; r.vr *= 3;
          BB_SOUND.chalk();
          bbBurst(p.x, p.y + 15, [BB_CHALK, '#FFFFFF'], 16, 220, 500);
          bbCallout('CHALKED!', p.x, bbSY(p.y) - 50, BB_CHALK, 22, 0.9);
          bbInvuln = 0.5;
          continue;
        }
        r.dead = true;
        bbBurst(r.x, r.y, ['#DCD0BA', BB_INK, BB_DIM], 12, 200, 600);
        BB_SOUND.hit();
        bbFreeze = 0.08; bbFlash = 0.45;
        bbLoseDie('rock');
        if (bbState === 'playing') {
          bbInvuln = BB_INVULN;
          bbCallout('-1 DIE', p.x, bbSY(p.y) - 50, BB_RED, 22, 0.9);
        }
        continue;
      }
      // a CLOSE CALL: it went right past you
      if (!r.near && r.y < p.y + 15 && d2 < (reach + BB_NEAR_PX) * (reach + BB_NEAR_PX) && bbClock - bbLastNear > 1500) {
        r.near = true; bbLastNear = bbClock;
        BB_SOUND.near();
        bbCallout(BB_SAY_NEAR[Math.floor(Math.random() * BB_SAY_NEAR.length)], p.x, bbSY(p.y) - 56, BB_CHALK, 16, 0.8);
      }
    }
    if (r.y < bbCamY - 80 || r.y > bbCamY + BB_H + 240 || r.x < -60 || r.x > BB_W + 60) r.dead = true;
  }
  bbRocks = bbRocks.filter(r => !r.dead).concat(born);
}

// ── Game over ────────────────────────────────────────────────────────────────
function bbUpdateOver(dt) {
  bbOverT += dt;
  const p = bbPlayer;
  if (!bbSunk) {                                  // knocked off the face, tumbling into The Depths
    p.vy -= BB_GRAV * dt; p.y += p.vy * dt;
    if (p.y < bbSeaY - 6) { bbSunk = true; bbSplash(p.x); BB_SOUND.plunge(); }
  }
}

function bbGameOver(cause) {
  bbLastScore = bbScore;
  bbState = 'over';
  bbOverT = 0; bbDragX = null; bbInvuln = 0;
  bbCoach = null; bbCoachQ = []; bbBanner = null; bbSlide = null; bbGust = null; bbShield = false; bbLoadedUntil = 0;
  bbSunk = cause === 'plunge';
  if (!bbSunk) bbPlayer.vy = 380;
  BB_OVER_JINGLE.forEach((f, k) => bbLater(500 + k * 150, () => playSecretBeep(f)));
  bbLater(2100, () => {
    if (bbQualifies(bbLastScore)) { bbInitials = [0, 0, 0]; BB_SOUND.highScore(); bbEnterState('nameEntry'); }
    else { bbLastEntry = -1; bbEnterState('leaderboard'); }
  });
}

// High scores (higher is better)
function bbQualifies(s) { return s > 0 && (bbScores.length < BB_TOP_N || s > bbScores[bbScores.length - 1].score); }
function bbSubmit(name, score) {
  const entry = { name, score };
  bbScores.push(entry);
  bbScores.sort((a, b) => b.score - a.score);
  bbScores = bbScores.slice(0, BB_TOP_N);
  bbLastEntry = bbScores.indexOf(entry);
}

// ── Effects ──────────────────────────────────────────────────────────────────
function bbBurst(x, y, cols, n, speed, ms) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
    bbParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + speed * 0.4, grav: 900,
      life: ms / 1000 * (0.6 + Math.random() * 0.4), max: ms / 1000, col: cols[k % cols.length], size: 3 + Math.random() * 3 });
  }
}
function bbSparkle(x, y, col, n) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    bbParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 0, life: 0.6, max: 0.6, col, size: 3, star: true });
  }
}
function bbSplash(x) {
  for (let k = 0; k < 18; k++) {
    bbParts.push({ x: x + (Math.random() - 0.5) * 30, y: bbSeaY, vx: (Math.random() - 0.5) * 160, vy: 200 + Math.random() * 260,
      grav: 900, life: 0.9, max: 0.9, col: k % 2 ? BB_FOAM : '#9CCAD4', size: 3 + Math.random() * 4 });
  }
}
function bbCallout(text, x, y, col, size, life) {
  // Step down past any fresh callout already sitting in the same spot
  while (bbCallouts.some(c => Math.abs(c.y - y) < size && Math.abs(c.x - x) < 120 && c.life > c.max - 0.6)) y += size + 6;
  bbCallouts.push({ text, x: Math.max(70, Math.min(BB_W - 70, x)), y, col, size, life, max: life });
}

// ── Drawing ──────────────────────────────────────────────────────────────────
function bbSY(worldY) { return BB_H - (worldY - bbCamY); }

function bbMix(a, b, t) {
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
}

function bbRoundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function bbText(g, s, x, y, size, col, align = 'center', outline = false) {
  g.font = `bold ${size}px monospace`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = BB_INK; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
  g.textBaseline = 'alphabetic';
}

function bbDraw() {
  const g = bbCtx;
  const alt = Math.min(1, bbCamY / (400 * BB_PX_PER_M));
  g.fillStyle = bbMix(BB_SKY_LO, BB_SKY_HI, alt);
  g.fillRect(0, 0, BB_W, BB_H);
  bbDrawStars(g, alt);

  g.save();
  if (bbShake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  for (const s of bbSecs) bbDrawSection(g, s);
  const live = bbState === 'playing' || bbState === 'over';
  if (live) {
    bbRocks.forEach(r => { if (r.warn <= 0) bbDrawRock(g, r); });
    if (!bbSunk) bbDrawClimber(g);
  }
  if (bbState === 'attract') {                    // a little demo climber hopping on the start pip
    const t = (bbClock / 1000) % (2 * BB_HOP_V / BB_GRAV);
    const y = BB_ROW[1] + BB_HOP_V * t - 0.5 * BB_GRAV * t * t;
    bbDrawClimberAt(g, BB_COL[1], bbSY(y), 1, t < BB_HOP_V / BB_GRAV);
  }
  bbDrawSea(g);
  for (const p of bbParts) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
    g.fillStyle = p.col;
    const sx = p.x, sy = bbSY(p.y);
    if (p.star) { g.fillRect(sx - p.size, sy - 0.75, p.size * 2, 1.5); g.fillRect(sx - 0.75, sy - p.size, 1.5, p.size * 2); }
    else if (p.streak) g.fillRect(sx - 12, sy - 0.75, 24, 1.5);
    else g.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;
  g.restore();

  if (live) {
    bbDrawDanger(g);
    bbRocks.forEach(r => { if (r.warn > 0) bbDrawWarning(g, r); });
  }
  for (const c of bbCallouts) {
    g.globalAlpha = Math.max(0, Math.min(1, c.life / 0.3));
    bbText(g, c.text, c.x, c.y, c.size, c.col, 'center', true);
  }
  g.globalAlpha = 1;
  if (live) {
    bbDrawShout(g);
    bbDrawBanner(g);
    bbDrawCoach(g);
    bbDrawHud(g);
  }
  if (bbFlash > 0) { g.fillStyle = `rgba(255,248,235,${(bbFlash * 0.5).toFixed(3)})`; g.fillRect(0, 0, BB_W, BB_H); }

  if (bbState === 'attract') { if (!bbPreviewing) bbDrawAttract(g); }   // the Arcade Floor's preview shows the scene, not the card
  else if (bbState === 'over') bbDrawOver(g);
  else if (bbState === 'nameEntry') bbDrawNameEntry(g);
  else if (bbState === 'leaderboard') bbDrawLeaderboard(g);
}

function bbDrawStars(g, alt) {
  if (alt < 0.4) return;
  g.fillStyle = BB_CHALK;
  g.globalAlpha = (alt - 0.4) / 0.6;
  for (let k = 0; k < 28; k++) {
    const x = k % 2 ? 4 + (k * 7) % 16 : BB_W - 20 + (k * 5) % 16;
    const y = ((k * 97) + bbCamY * 0.15) % BB_H;
    g.fillRect(x, y, 2, 2);
  }
  g.globalAlpha = 1;
}

function bbDrawSection(g, s) {
  const top = bbSY(s.i * BB_SEC + BB_SEC - 5), bot = bbSY(s.i * BB_SEC + 5);
  if (bot < -10 || top > BB_H + 10) return;
  if (s.ledge) { bbDrawLedge(g, s); return; }
  const x = BB_FACE_X, w = BB_FACE_W, y = top, h = bot - top;
  // drop shadow gives the die some bulk against the sky
  bbRoundRect(g, x + 5, y + 5, w, h, 28); g.fillStyle = 'rgba(42,34,27,0.32)'; g.fill();
  g.save();
  bbRoundRect(g, x, y, w, h, 28); g.fillStyle = s.tint; g.fill(); g.clip();
  for (const b of s.wash) {                       // soft watercolour washes, like the box art
    const cx = x + b.x * w, cy = y + b.y * h;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    gr.addColorStop(0, b.col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  g.strokeStyle = 'rgba(42,34,27,0.13)'; g.lineWidth = 2;   // rock strata
  for (const st of s.strata) {
    const ly = y + st.y * h;
    g.beginPath(); g.moveTo(x, ly);
    g.bezierCurveTo(x + w * 0.33, ly + st.a, x + w * 0.66, ly - st.a, x + w, ly + st.b);
    g.stroke();
  }
  g.strokeStyle = 'rgba(42,34,27,0.28)'; g.lineWidth = 1.5;  // a hairline crack
  g.beginPath();
  s.crack.forEach(([cx, cy], k) => { const px = x + cx * w, py = y + cy * h; if (k) g.lineTo(px, py); else g.moveTo(px, py); });
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, 6);  // lit top edge
  g.restore();
  bbRoundRect(g, x, y, w, h, 28); g.strokeStyle = 'rgba(42,34,27,0.55)'; g.lineWidth = 2.5; g.stroke();

  for (const hd of s.holds) bbDrawPip(g, hd.x, bbSY(hd.y), hd);
  if (s.pickup && !s.pickup.taken) {
    const bob = Math.sin(bbClock / 260 + s.i) * 3;
    const px = s.pickup.x, py = bbSY(s.pickup.y) + bob;
    g.globalAlpha = 0.35 + 0.15 * Math.sin(bbClock / 200);
    g.fillStyle = BB_GOLD; g.beginPath(); g.arc(px, py, 17, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    bbDrawDie(g, px, py, 20, 0.2, 5, 'pickup', 1);
  }
  if (s.power && !s.power.taken) bbDrawPower(g, s.power, s.i);
}

// A power-up resting on a hold: CHALK UP is a chalk bag, LOADED HOPS a gold die with studs.
function bbDrawPower(g, pw, i) {
  const bob = Math.sin(bbClock / 240 + i) * 3, x = pw.x, y = bbSY(pw.y) + bob;
  const col = pw.kind === 'chalk' ? BB_CHALK : BB_GOLD;
  g.globalAlpha = 0.3 + 0.2 * Math.sin(bbClock / 170);
  g.fillStyle = col; g.beginPath(); g.arc(x, y, 21, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = col; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, 18 + (bbClock / 40) % 8, 0, Math.PI * 2); g.stroke();
  if (pw.kind === 'chalk') {
    bbRoundRect(g, x - 9, y - 8, 18, 18, 5); g.fillStyle = '#E8E2D4'; g.fill();
    g.strokeStyle = BB_INK; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#FFFFFF'; g.fillRect(x - 10, y - 12, 20, 5);
    g.fillStyle = BB_RED; g.fillRect(x - 9, y + 2, 18, 3);
  } else {
    bbDrawDie(g, x, y, 20, -0.25, 6, 'loaded', 1);
  }
}

// THE OVERLOOK: a stone shelf right across the cliff, with the height carved into it.
function bbDrawLedge(g, s) {
  const hold = s.holds[0], sy = bbSY(hold.y);
  const reached = hold.reached;
  // the wall behind it: a darker band of plain rock
  const top = bbSY(s.i * BB_SEC + BB_SEC - 5), bot = bbSY(s.i * BB_SEC + 5);
  bbRoundRect(g, BB_FACE_X + 5, top + 5, BB_FACE_W, bot - top, 28); g.fillStyle = 'rgba(42,34,27,0.32)'; g.fill();
  bbRoundRect(g, BB_FACE_X, top, BB_FACE_W, bot - top, 28); g.fillStyle = '#8C7B66'; g.fill();
  g.strokeStyle = 'rgba(42,34,27,0.55)'; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = 'rgba(42,34,27,0.18)'; g.lineWidth = 2;
  for (const st of s.strata) {
    const ly = top + st.y * (bot - top);
    g.beginPath(); g.moveTo(BB_FACE_X, ly); g.bezierCurveTo(BB_FACE_X + 100, ly + st.a, BB_FACE_X + 210, ly - st.a, BB_FACE_X + BB_FACE_W, ly + st.b); g.stroke();
  }
  // the shelf
  const sq = bbClock - hold.landT < 150 ? 3 * (1 - (bbClock - hold.landT) / 150) : 0;
  g.fillStyle = 'rgba(42,34,27,0.35)'; g.fillRect(BB_FACE_X - 6, sy + 4 + sq, BB_FACE_W + 12, 26);
  bbRoundRect(g, BB_FACE_X - 8, sy - 2 + sq, BB_FACE_W + 16, 24, 8); g.fillStyle = '#C9B79C'; g.fill();
  g.strokeStyle = BB_INK; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(BB_FACE_X, sy + sq, BB_FACE_W, 4);
  bbText(g, `THE OVERLOOK · ${(hold.pitch - 1) * 100} M`, BB_W / 2, sy + 12 + sq, 11, BB_INK);
  // a summit flag at the right-hand end, lit once you've reached it
  const fx = BB_FACE_X + BB_FACE_W - 18, fy = sy - 2;
  g.strokeStyle = BB_INK; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 46); g.stroke();
  const wave = Math.sin(bbClock / 180) * 4;
  g.fillStyle = reached ? BB_GOLD : BB_RED;
  g.beginPath(); g.moveTo(fx, fy - 46); g.lineTo(fx + 26, fy - 40 + wave); g.lineTo(fx, fy - 30); g.closePath(); g.fill();
}

// Danger on the screen's edges: the rockslide's warning band, the Tempest's
// arrows before a gust, The Depths' red glow when they're right under you.
function bbDrawDanger(g) {
  if (bbSlide) {
    const warn = bbClock < bbSlide.warnUntil, on = Math.floor(bbClock / 120) % 2;
    g.fillStyle = `rgba(226,87,76,${warn ? (on ? 0.5 : 0.2) : 0.28})`;
    g.fillRect(0, 40, BB_W, 8);
    if (warn) bbText(g, 'ROCKSLIDE INCOMING', BB_W / 2, 64, 14, BB_RED, 'center', true);
  }
  if (bbGust) {
    const warn = bbClock < bbGust.warnUntil, a = warn ? 0.5 + 0.5 * Math.sin(bbClock / 70) : 0.6;
    g.globalAlpha = a;
    const d = bbGust.dir, x0 = d > 0 ? 26 : BB_W - 26;   // chevrons on the side the wind comes from, pointing where it blows
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < 3; k++) {
      const x = x0 + d * k * 20, slide = ((bbClock / 260) % 1) * d * 6;
      [[BB_INK, 8], [BB_CHALK, 4]].forEach(([col, w]) => {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(x - d * 8 + slide, 284); g.lineTo(x + d * 6 + slide, 300); g.lineTo(x - d * 8 + slide, 316); g.stroke();
      });
    }
    g.lineCap = 'butt';
    if (warn) bbText(g, 'GUST', x0 + d * 20, 336, 14, BB_CHALK, 'center', true);
    g.globalAlpha = 1;
  }
  const gap = bbPlayer.y - bbSeaY;
  if (bbState === 'playing' && gap < 140) {
    const k = Math.max(0, 1 - gap / 140) * (0.6 + 0.4 * Math.sin(bbClock / 110));
    const gr = g.createLinearGradient(0, BB_H, 0, BB_H - 180);
    gr.addColorStop(0, `rgba(226,87,76,${(0.45 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(226,87,76,0)');
    g.fillStyle = gr; g.fillRect(0, BB_H - 180, BB_W, 180);
  }
}

// The announcer: one big line at a time, in the climbing register.
function bbDrawShout(g) {
  const s = bbShout;
  if (!s || (bbBanner && bbClock >= bbBanner.at)) return;
  const t = (bbClock - s.at) / 1000, pop = t < 0.14 ? 1.6 - (t / 0.14) * 0.6 : 1;
  g.save();
  g.globalAlpha = t > s.life - 0.25 ? Math.max(0, (s.life - t) / 0.25) : 1;
  g.translate(BB_W / 2, 160); g.scale(pop, pop);
  g.font = `bold ${s.text.length > 14 ? 24 : 32}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 10; g.strokeStyle = 'rgba(20,16,12,0.5)'; g.strokeText(s.text, 3, 4);
  g.lineWidth = 7; g.strokeStyle = BB_INK; g.strokeText(s.text, 0, 0);
  g.fillStyle = s.col; g.fillText(s.text, 0, 0);
  g.restore();
  g.textBaseline = 'alphabetic';
}

// "PITCH 2 · 100 M" sweeping across the cliff, with what this pitch brings.
function bbDrawBanner(g) {
  const b = bbBanner;
  if (!b || bbClock < b.at) return;
  const t = (bbClock - b.at) / 1000;
  const inK = 1 - Math.pow(1 - Math.min(1, t / 0.3), 3), outK = t > 2.0 ? Math.min(1, (t - 2.0) / 0.4) : 0;
  const x = (1 - inK) * -BB_W + outK * outK * BB_W;
  g.save(); g.translate(x, 176); g.rotate(-0.04);
  g.fillStyle = 'rgba(36,29,23,0.92)'; g.fillRect(-40, -46, BB_W + 80, 92);
  g.fillStyle = BB_GOLD; g.fillRect(-40, -46, BB_W + 80, 4); g.fillRect(-40, 42, BB_W + 80, 4);
  bbText(g, `PITCH ${b.n} · ${(b.n - 1) * 100} M`, BB_W / 2, -18, 15, BB_DIM, 'center', true);
  bbText(g, b.name, BB_W / 2, 6, b.name.length > 13 ? 24 : 30, BB_CHALK, 'center', true);
  bbText(g, b.sub, BB_W / 2, 32, 11, BB_GOLD, 'center', true);
  g.restore();
}

// The coach box: low on the screen, below the climber and away from the markers.
function bbDrawCoach(g) {
  if (!bbCoach) return;
  g.font = 'bold 12px monospace';
  const words = bbCoach.text.split(' '), lines = [];
  let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 290 && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line);
  const h = lines.length * 17 + 18, y = BB_H - h - 18;
  g.globalAlpha = Math.max(0, Math.min(1, (bbCoach.until - bbClock) / 400));
  bbRoundRect(g, 22, y, 316, h, 12); g.fillStyle = 'rgba(242,235,221,0.95)'; g.fill();
  g.strokeStyle = BB_GOLD; g.lineWidth = 2.5; g.stroke();
  lines.forEach((l, i) => bbText(g, l, BB_W / 2, y + 17 + i * 17, 12, BB_INK));
  g.globalAlpha = 1;
}

function bbDrawPip(g, x, y, h) {
  const r = BB_PIP_R;
  if (h.gone) {                                   // the scar a crumbled bluff leaves
    g.strokeStyle = 'rgba(42,34,27,0.25)'; g.lineWidth = 2;
    g.setLineDash([4, 4]); g.beginPath(); g.arc(x, y, r - 4, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    return;
  }
  const since = bbClock - h.landT;
  const sq = since < 150 ? 1 - 0.22 * (1 - since / 150) : 1;    // pressed flat when you push off
  g.fillStyle = 'rgba(255,255,255,0.42)';         // light catching the lower lip of the hole
  g.beginPath(); g.ellipse(x, y + 3, r + 2, (r + 2) * sq, 0, 0, Math.PI * 2); g.fill();
  if (h.kind === 'fake') {                        // the tell: pale and shallow, with cracks
    g.fillStyle = 'rgba(42,34,27,0.42)';
    g.beginPath(); g.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(42,34,27,0.7)'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - r + 4, y - 6); g.lineTo(x - 4, y + 2); g.lineTo(x + 3, y - 4); g.lineTo(x + r - 3, y + 5);
    g.moveTo(x - 4, y + 2); g.lineTo(x - 2, y + r - 3);
    g.stroke();
    return;
  }
  g.fillStyle = BB_INK;
  g.beginPath(); g.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#120E0A';
  g.beginPath(); g.ellipse(x, y - 4, r * 0.7, r * 0.58 * sq, 0, 0, Math.PI * 2); g.fill();
  if (h.kind === 'slick') {                       // wet sheen and a drip
    g.strokeStyle = 'rgba(200,236,245,0.95)'; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, r - 5, Math.PI * 1.1, Math.PI * 1.65); g.stroke();
    g.strokeStyle = 'rgba(160,215,230,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r + 1, 0, Math.PI * 2); g.stroke();
    const dy = (bbClock / 18 + x) % 26;
    g.fillStyle = 'rgba(190,230,240,0.9)';
    g.beginPath(); g.arc(x + 6, y + r + 2 + dy, 2.5, 0, Math.PI * 2); g.fill();
  } else if (h.kind === 'raise') {                // gold ring and an up-chevron
    g.strokeStyle = BB_GOLD; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, r + 2, 0, Math.PI * 2); g.stroke();
    const lift = Math.sin(bbClock / 160) * 2;
    g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 8, y + 4 - lift); g.lineTo(x, y - 5 - lift); g.lineTo(x + 8, y + 4 - lift); g.stroke();
    g.lineCap = 'butt';
  }
}

function bbDrawDie(g, cx, cy, s, rot, face, kind, alpha) {
  g.save();
  g.translate(cx, cy); g.rotate(rot); g.globalAlpha = alpha;
  const body = { cracked: '#D3C4A6', half: '#D3C4A6', loaded: '#CDB894', phantom: '#E4ECF0',
                 snake: '#D8CBB2', pickup: BB_CHALK, hud: BB_CHALK }[kind] || '#DCD0BA';
  bbRoundRect(g, -s / 2, -s / 2, s, s, s * 0.22);
  g.fillStyle = body; g.fill();
  g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = BB_INK; g.stroke();
  const off = s * 0.27;
  const pr = s * (kind === 'loaded' ? 0.11 : 0.085);
  for (const [c, r] of BB_FACE_PIPS[face]) {
    const px = (c - 1) * off, py = (1 - r) * off;
    g.fillStyle = kind === 'loaded' ? '#A8722A' : kind === 'snake' ? BB_RED : BB_INK;
    g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    if (kind === 'loaded') { g.fillStyle = '#F2CF8A'; g.beginPath(); g.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.35, 0, Math.PI * 2); g.fill(); }
    if (kind === 'snake') { g.fillStyle = BB_INK; g.fillRect(px - 1, py - pr * 0.8, 2, pr * 1.6); }
  }
  if (kind === 'cracked' || kind === 'half') {    // the fissure
    g.strokeStyle = BB_INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-s * 0.1, -s / 2); g.lineTo(s * 0.06, -s * 0.15); g.lineTo(-s * 0.08, s * 0.12); g.lineTo(s * 0.05, s / 2); g.stroke();
  }
  g.restore();
}

function bbDrawRock(g, r) {
  const sx = r.x, sy = bbSY(r.y);
  let alpha = 1;
  if (r.kind === 'phantom') {                     // faint until it's close to you
    const dx = bbPlayer.x - r.x, dy = bbPlayer.y + 15 - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    alpha = dist > 220 ? 0.16 : 0.16 + 0.84 * (1 - dist / 220);
    g.fillStyle = 'rgba(232,241,240,0.25)';
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.arc(sx + Math.sin(bbClock / 300 + k * 2) * 14, sy + Math.cos(bbClock / 340 + k) * 10, 16, 0, Math.PI * 2); g.fill();
    }
  }
  // A dark halo so falling dice stand out against even the palest face
  g.globalAlpha = alpha * 0.45;
  g.fillStyle = BB_INK;
  g.beginPath(); g.arc(sx + 3, sy + 4, r.size * 0.68, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  bbDrawDie(g, sx, sy, r.size, r.rot, r.face, r.kind, alpha);
}

function bbDrawWarning(g, r) {
  const x = Math.max(16, Math.min(BB_W - 16, r.x)), y = 58;
  const pulse = 0.5 + 0.5 * Math.sin(bbClock / 70);
  g.globalAlpha = 0.55 + 0.45 * pulse;
  g.fillStyle = r.kind === 'phantom' ? '#9CCAD4' : r.kind === 'loaded' ? BB_GOLD : BB_RED;
  g.beginPath(); g.moveTo(x - 13, y - 10); g.lineTo(x + 13, y - 10); g.lineTo(x, y + 12); g.closePath(); g.fill();
  g.globalAlpha = 1;
  bbText(g, r.kind === 'phantom' ? '?' : '!', x, y - 3, 14, BB_CHALK);
}

function bbDrawClimber(g) {
  const p = bbPlayer;
  if (bbInvuln > 0 && Math.floor(bbClock / 90) % 2 === 0) return;   // blink while recovering
  const sy = bbSY(p.y), rising = p.vy > 0;
  if (bbShield) {                                  // CHALK UP: a ring of chalk dust
    g.strokeStyle = `rgba(242,235,221,${(0.55 + 0.3 * Math.sin(bbClock / 120)).toFixed(3)})`; g.lineWidth = 3;
    g.beginPath(); g.arc(p.x, sy - 18, 24, 0, Math.PI * 2); g.stroke();
  }
  if (bbClock < bbLoadedUntil) {                   // LOADED HOPS: a gold glow and sparks off the boots
    g.fillStyle = 'rgba(224,168,74,0.28)'; g.beginPath(); g.arc(p.x, sy - 16, 22, 0, Math.PI * 2); g.fill();
    if (Math.random() < 0.4) bbParts.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y, vx: (Math.random() - 0.5) * 40, vy: -60, grav: 0, life: 0.4, max: 0.4, col: BB_GOLD, size: 3, star: true });
  }
  bbDrawClimberAt(g, p.x, sy, p.face, rising);
  if (p.x < 20) bbDrawClimberAt(g, p.x + BB_W, sy, p.face, rising);     // wrap-around ghost
  if (p.x > BB_W - 20) bbDrawClimberAt(g, p.x - BB_W, sy, p.face, rising);
}

// A tiny climber, feet at (x, y) in screen px. f = facing (±1).
function bbDrawClimberAt(g, x, y, f, rising) {
  g.save();
  g.translate(x, y); g.scale(f >= 0 ? 1.15 : -1.15, 1.15);
  g.lineCap = 'round';
  g.strokeStyle = '#3B3A4A'; g.lineWidth = 4;     // legs: tucked going up, spread coming down
  g.beginPath();
  if (rising) { g.moveTo(-2, -12); g.lineTo(-4, -2); g.moveTo(3, -12); g.lineTo(5, -4); }
  else { g.moveTo(-2, -12); g.lineTo(-7, -1); g.moveTo(3, -12); g.lineTo(8, -1); }
  g.stroke();
  g.fillStyle = '#3E5C76'; bbRoundRect(g, -11, -27, 7, 13, 2); g.fill();   // backpack
  g.fillStyle = BB_RED; bbRoundRect(g, -6, -27, 13, 16, 4); g.fill();      // jacket
  g.strokeStyle = BB_RED; g.lineWidth = 3.5;                                // arms
  g.beginPath();
  if (rising) { g.moveTo(5, -24); g.lineTo(9, -35); g.moveTo(-4, -24); g.lineTo(-7, -16); }
  else { g.moveTo(5, -24); g.lineTo(11, -33); g.moveTo(-4, -24); g.lineTo(-10, -33); }
  g.stroke();
  g.fillStyle = '#F2C9A0'; g.beginPath(); g.arc(1, -32, 6, 0, Math.PI * 2); g.fill();   // face
  g.fillStyle = '#F5C542'; g.beginPath(); g.arc(1, -33.5, 6.6, Math.PI, Math.PI * 2); g.fill();  // helmet
  g.fillRect(-6, -34, 14, 2);
  g.restore();
  g.lineCap = 'butt';
}

function bbDrawSea(g) {
  const sy = bbSY(bbSeaY);
  if (sy > BB_H + 24) return;
  const t = bbClock / 1000;
  const wave = (x, o) => sy + o - 6 * Math.sin(x * 0.045 + t * 2.2) - 4 * Math.sin(x * 0.11 - t * 3.1);
  g.beginPath(); g.moveTo(0, BB_H);
  for (let x = 0; x <= BB_W; x += 12) g.lineTo(x, wave(x, 0));
  g.lineTo(BB_W, BB_H); g.closePath();
  const gr = g.createLinearGradient(0, sy - 10, 0, BB_H);
  gr.addColorStop(0, BB_SEA); gr.addColorStop(1, BB_SEA_DEEP);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = BB_FOAM; g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x <= BB_W; x += 12) { const wy = wave(x, 0); if (x) g.lineTo(x, wy); else g.moveTo(x, wy); }
  g.stroke();
  g.globalAlpha = 0.45; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= BB_W; x += 12) { const wy = wave(x + 40, 12); if (x) g.lineTo(x, wy); else g.moveTo(x, wy); }
  g.stroke();
  g.globalAlpha = 1;
}

function bbDrawHud(g) {
  g.fillStyle = 'rgba(30,24,19,0.62)';
  g.fillRect(0, 0, BB_W, 40);
  bbText(g, bbScore + ' M', 12, 21, 20, BB_CHALK, 'left');
  bbText(g, 'PITCH ' + bbPitch, 98, 15, 10, BB_DIM, 'left');
  const tags = [];
  if (bbShield) tags.push(['CHALK', BB_CHALK]);
  if (bbClock < bbLoadedUntil) tags.push([`LOADED ${Math.ceil((bbLoadedUntil - bbClock) / 1000)}`, BB_GOLD]);
  tags.forEach(([t, c], k) => bbText(g, t, 98 + k * 52, 29, 10, c, 'left'));
  for (let k = 0; k < BB_CUP_MAX; k++) {           // your cup: one die per life
    const cx = BB_W - 18 - (BB_CUP_MAX - 1 - k) * 24;
    if (k < bbCup) bbDrawDie(g, cx, 20, 18, 0, k + 1, 'hud', 1);
    else {
      g.globalAlpha = k === bbCup && bbCupFlash > 0 && Math.floor(bbClock / 100) % 2 ? 1 : 0.5;
      bbRoundRect(g, cx - 9, 11, 18, 18, 4);
      g.strokeStyle = k === bbCup && bbCupFlash > 0 ? BB_RED : BB_DIM; g.lineWidth = 2; g.stroke();
      g.globalAlpha = 1;
    }
  }
}

function bbPanel(g, x, y, w, h) {
  bbRoundRect(g, x, y, w, h, 14);
  g.fillStyle = 'rgba(36,29,23,0.96)'; g.fill();
  g.strokeStyle = BB_GOLD; g.lineWidth = 3; g.stroke();
}

function bbDrawButton(r, label, size = 22) {
  const g = bbCtx;
  g.fillStyle = 'rgba(224,168,74,0.14)'; g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = BB_GOLD; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
  bbText(g, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, BB_GOLD);
}

function bbDrawAttract(g) {
  bbPanel(g, 24, 96, 312, 428);
  bbText(g, 'BEYOND THE', BB_W / 2, 146, 24, BB_CHALK);
  bbText(g, 'BLUFF', BB_W / 2, 194, 52, BB_GOLD);
  bbText(g, 'CLIMB THE DICE, PIP BY PIP', BB_W / 2, 240, 13, BB_DIM);
  // A legend kids can read at a glance
  [['rock', 'HOLD'], ['raise', 'RAISE'], ['fake', 'BLUFF']].forEach(([kind, label], n) => {
    const x = 90 + n * 90;
    bbRoundRect(g, x - 30, 264, 60, 56, 10); g.fillStyle = BB_TINTS[1]; g.fill();
    bbDrawPip(g, x, 292, { kind, gone: false, landT: -1e9 });
    bbText(g, label, x, 336, 13, kind === 'fake' ? BB_RED : kind === 'raise' ? BB_GOLD : BB_CHALK);
  });
  bbText(g, 'DRAG TO STEER', BB_W / 2, 366, 17, BB_CHALK);
  bbText(g, 'A LEDGE EVERY 100 M · SOMETHING NEW ON EACH PITCH', BB_W / 2, 390, 9, BB_DIM);
  bbDrawButton(BB_BTN_PLAY, 'CLIMB', 26);
  if (bbScores.length) bbText(g, 'BEST  ' + bbScores[0].score + ' M', BB_W / 2, 502, 15, BB_DIM);
}

function bbDrawOver(g) {
  if (bbOverT < 0.4) return;
  g.fillStyle = 'rgba(20,16,12,0.45)'; g.fillRect(0, 0, BB_W, BB_H);
  bbText(g, 'INTO THE DEPTHS', BB_W / 2, 270, 26, BB_GOLD, 'center', true);
  bbText(g, bbLastScore + ' M', BB_W / 2, 330, 48, BB_CHALK, 'center', true);
}

function bbDrawNameEntry(g) {
  bbPanel(g, 24, 120, 312, 400);
  bbText(g, 'A NEW HEIGHT', BB_W / 2, 170, 26, BB_GOLD);
  bbText(g, bbLastScore + ' M', BB_W / 2, 212, 30, BB_CHALK);
  bbText(g, 'SIGN THE LOG', BB_W / 2, 262, 15, BB_DIM);
  BB_SLOTS.forEach((r, k) => {
    g.fillStyle = 'rgba(242,235,221,0.08)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = BB_GOLD; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
    bbText(g, BB_ALPHABET[bbInitials[k]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, BB_CHALK);
  });
  bbText(g, 'TAP A LETTER TO CHANGE IT', BB_W / 2, 406, 12, BB_DIM);
  bbDrawButton(BB_BTN_OK, 'SIGN');
}

function bbDrawLeaderboard(g) {
  bbPanel(g, 14, 96, 332, 516);
  bbText(g, 'THE ASCENT', BB_W / 2, 146, 28, BB_GOLD);
  bbText(g, 'HIGHEST CLIMBS', BB_W / 2, 174, 13, BB_DIM);
  for (let k = 0; k < BB_TOP_N; k++) {
    const y = 222 + k * 46, e = bbScores[k];
    const col = k === bbLastEntry ? BB_GOLD : e ? BB_CHALK : BB_DIM;
    bbText(g, String(k + 1), 56, y, 20, col, 'left');
    bbText(g, e ? e.name : '---', 96, y, 22, col, 'left');
    bbText(g, e ? e.score + ' M' : '', 304, y, 22, col, 'right');
  }
  bbText(g, 'THIS CLIMB  ' + bbLastScore + ' M', BB_W / 2, 470, 16, BB_CHALK);
  bbDrawButton(BB_BTN_LB_AGAIN, 'CLIMB AGAIN', 20);
  bbDrawButton(BB_BTN_LB_MENU, 'MENU', 20);
}

// ── Input ────────────────────────────────────────────────────────────────────
function bbToLogical(e) {
  const r = bbCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * BB_W / r.width, y: (e.clientY - r.top) * BB_H / r.height };
}
function bbHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function bbSubmitInitials() {
  BB_SOUND.select();
  bbSubmit(bbInitials.map(i => BB_ALPHABET[i]).join(''), bbLastScore);
  bbEnterState('leaderboard');
}

function bbOnDown(p) {
  if (bbState === 'attract') { if (bbHit(BB_BTN_PLAY, p)) { BB_SOUND.select(); bbEnterState('playing'); } return; }
  if (bbState === 'playing') { bbDragX = p.x; return; }
  if (bbState === 'nameEntry') {
    for (let i = 0; i < BB_SLOTS.length; i++) {
      if (bbHit(BB_SLOTS[i], p)) { bbInitials[i] = (bbInitials[i] + 1) % 26; BB_SOUND.select(); return; }
    }
    if (bbHit(BB_BTN_OK, p)) bbSubmitInitials();
    return;
  }
  if (bbState === 'leaderboard') {
    if (bbHit(BB_BTN_LB_AGAIN, p)) { BB_SOUND.select(); bbEnterState('playing'); return; }
    if (bbHit(BB_BTN_LB_MENU, p))  { BB_SOUND.select(); bbEnterState('attract'); }
  }
}

function bbStagePointer(e, phase) {
  if (phase === 'down') {
    if (bbPtrId !== null) return;               // second finger ignored
    bbPtrId = e.pointerId;
    bbOnDown(bbToLogical(e));
    return;
  }
  if (e.pointerId !== bbPtrId) return;
  if (phase === 'move') {                       // steering: the climber follows your finger's movement
    if (bbState !== 'playing' || bbDragX === null) return;
    const x = bbToLogical(e).x, dx = x - bbDragX;
    bbPlayer.x = bbWrap(bbPlayer.x + dx * BB_DRAG_GAIN);
    if (Math.abs(dx) > 0.5) bbPlayer.face = Math.sign(dx);
    bbDragX = x;
    return;
  }
  bbPtrId = null; bbPress = null; bbDragX = null;   // up / cancel
}

(function bbBindInput() {
  const stage = document.getElementById('bb-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); bbStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) bbStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => bbStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => bbStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => bbStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-bluff').style.display !== 'none';
  const setKey = (e, on) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { bbKeys.left = on; return true; }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { bbKeys.right = on; return true; }
    return false;
  };
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (setKey(e, true)) { e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (bbState === 'attract' || bbState === 'leaderboard') { BB_SOUND.select(); bbEnterState('playing'); }
      else if (bbState === 'nameEntry') bbSubmitInitials();
    }
  });
  document.addEventListener('keyup', e => { setKey(e, false); });
  document.getElementById('btn-bb-exit').addEventListener('click', () => { resetArcadeBluff(); arcExitCabinet(); });
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (bbRafHandle) { cancelAnimationFrame(bbRafHandle); bbRafHandle = null; }
      bbPress = null; bbPtrId = null; bbDragX = null; bbKeys.left = bbKeys.right = false;
    } else if (!bbRafHandle) { bbLastT = 0; bbRafHandle = requestAnimationFrame(bbLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function bbResize() {
  if (!bbCanvas) return;
  const box = bbCanvas.parentElement;
  const scale = Math.min(box.clientWidth / BB_W, box.clientHeight / BB_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  bbCanvas.style.width  = Math.floor(BB_W * scale) + 'px';
  bbCanvas.style.height = Math.floor(BB_H * scale) + 'px';
  bbCanvas.width  = Math.floor(BB_W * scale * dpr);
  bbCanvas.height = Math.floor(BB_H * scale * dpr);
  bbCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function resetArcadeBluff() {
  if (bbRafHandle) { cancelAnimationFrame(bbRafHandle); bbRafHandle = null; }
  bbState = 'attract'; bbPress = null; bbPtrId = null; bbDragX = null;
  bbKeys.left = bbKeys.right = false;
  bbEvents = []; bbParts = []; bbCallouts = []; bbRocks = []; bbShake = 0;
  bbFreeze = 0; bbFlash = 0; bbShout = null; bbBanner = null; bbCoach = null; bbCoachQ = [];
  bbSlide = null; bbGust = null;
  // bbScores and bbCoachSeen are NOT cleared — session state survives the lobby.
}

// ── The Arcade Floor's preview (SW v259) ─────────────────────────────────────
// js/lobby/arcade.js drives it: begin() borrows the room's canvas, step()/draw()
// run the attract scene with its card off, end() hands everything back — the
// next bbStart() takes its own canvas again. No RAF of its own here.
let bbPreviewing = false;
function bbPreview() {
  return {
    w: BB_W, h: BB_H, fy: 0.9,   // the cliff's foot: the demo climber on its start pip, the sea under it
    begin(canvas, ctx) {
      resetArcadeBluff(); bbCanvas = canvas; bbCtx = ctx; bbPreviewing = true;
      bbEnterState('attract');
      if (bbRafHandle) { cancelAnimationFrame(bbRafHandle); bbRafHandle = null; }
    },
    step: (dt) => bbUpdate(dt),
    draw: () => bbDraw(),
    end() { resetArcadeBluff(); bbPreviewing = false; bbCanvas = null; bbCtx = null; },
  };
}
// The session board's top score, for the room's HI line — null until someone has played.
function bbBest() { return bbScores.length ? bbScores[0].score.toLocaleString('en-AU') + ' M' : null; }

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-bluff').style.display !== 'none') bbResize();
});
