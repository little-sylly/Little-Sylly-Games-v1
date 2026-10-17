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
//  - Special holds: RAISE (gold ring, big launch), BLUFF (pale and cracked —
//    it crumbles, no hop), SLICK (wet sheen — a weak hop).
//  - Rockfall: dice drop from above, flagged by a marker at the top of the
//    screen. Later kinds borrow The Tempest's looks: Cracked (splits in two),
//    Loaded (big and fast), Phantom (faint until close), Snake (drifts at you).
//  - Lives are the dice in your cup (5). A rock hit or a plunge into The Depths
//    costs one; a plunge with dice left throws you back up. Spare dice sit on
//    some holds.
//  - Score is height in metres.
//
// ROUTE GUARANTEE (so a run never dead-ends): a normal hop rises ~220 px and
// the biggest gap between rows is 185 px (a 1-face). Specials only go where a
// normal route still exists: BLUFF/SLICK only on faces 3+, SLICK only on the
// middle row (bottom→top row is reachable directly), BLUFF only on a middle-row
// pip or where its row has another real pip. Never two 1-faces in a row.
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

// Rockfall kinds unlock by height (metres). Names shown the first time each appears.
const BB_KINDS  = ['cracked', 'loaded', 'phantom', 'snake'];
const BB_UNLOCK = [50, 100, 150, 200];
const BB_KIND_NAME = { cracked: 'CRACKED DICE!', loaded: 'LOADED DICE!', phantom: 'PHANTOM DICE!', snake: 'SNAKE EYES!' };

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
let bbMaxY = 0, bbNextMilestone = 100, bbBeatBest = false;
let bbSeen = {};
let bbOverT = 0, bbSunk = false;

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

function bbNewGame() { bbResetRun(); }

// A fresh cliff and climber. Also used behind the attract screen.
function bbResetRun() {
  bbSecs = []; bbRocks = []; bbParts = []; bbCallouts = []; bbEvents = [];
  bbCamY = 0; bbMaxY = BB_ROW[1]; bbScore = 0;
  bbPlayer = { x: BB_COL[1], y: BB_ROW[1], vy: BB_HOP_V, face: 1 };
  bbCup = BB_CUP_MAX; bbCupFlash = 0; bbInvuln = 0;
  bbRockT = 2.5; bbNextMilestone = 100; bbBeatBest = false; bbSeen = {};
  bbOverT = 0; bbSunk = false;
  bbEnsureSections();
  bbSeaY = bbCamY + 18;
}

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
  let face;
  if (i === 0) face = 5;                             // start: a centre pip right under you
  else if (i === 1) face = 6;
  else {
    const early = [0, 0, 1, 3, 4, 6], late = [3, 5, 5, 4, 2, 1];
    const w = early.map((e, k) => e + (late[k] - e) * d);
    if (d < 0.15 || (prev && prev.face === 1)) w[0] = 0;   // never two single-hold faces in a row
    face = bbPickWeighted(w) + 1;
  }
  const mirror = (face === 2 || face === 3) && Math.random() < 0.5;
  const base = i * BB_SEC;
  const holds = BB_FACE_PIPS[face].map(([c, r]) => ({
    x: BB_COL[mirror ? 2 - c : c], y: base + BB_ROW[r], row: r, kind: 'rock', gone: false, landT: -1e9,
  }));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // BLUFF hold (fake, crumbles) — see ROUTE GUARANTEE at the top.
  if (i >= 5 && face >= 3 && Math.random() < 0.15 + 0.25 * d) {
    const ok = holds.filter(h => h.row === 1 || holds.some(o => o !== h && o.row === h.row));
    if (ok.length) pick(ok).kind = 'fake';
  }
  // SLICK hold (weak hop) — middle row only.
  if (i >= 8 && face >= 3 && Math.random() < 0.12 + 0.2 * d) {
    const ok = holds.filter(h => h.row === 1 && h.kind === 'rock');
    if (ok.length) pick(ok).kind = 'slick';
  }
  // RAISE hold (big launch).
  if (i >= 2 && Math.random() < 0.08) {
    const ok = holds.filter(h => h.kind === 'rock');
    if (ok.length) pick(ok).kind = 'raise';
  }
  // A spare die resting above a real hold.
  let pickup = null;
  if (i >= 4 && Math.random() < 0.09) {
    const ok = holds.filter(h => h.kind === 'rock' || h.kind === 'raise');
    if (ok.length) { const h = pick(ok); pickup = { x: h.x, y: h.y + 48, taken: false }; }
  }

  let tint = pick(BB_TINTS);
  if (prev && tint === prev.tint) tint = BB_TINTS[(BB_TINTS.indexOf(tint) + 1) % BB_TINTS.length];
  const wash = [0, 1].map(() => ({ x: Math.random(), y: Math.random(), r: 120 + Math.random() * 90, col: pick(BB_WASH) }));
  const strata = [0, 1, 2, 3].map(k => ({ y: 0.14 + k * 0.23 + Math.random() * 0.08, a: (Math.random() - 0.5) * 22, b: (Math.random() - 0.5) * 10 }));
  const cx = 0.2 + Math.random() * 0.6;
  const crack = [[cx, 0]];
  for (let k = 1; k <= 4; k++) crack.push([cx + (Math.random() - 0.5) * 0.12, k * (0.07 + Math.random() * 0.05)]);
  return { i, face, holds, pickup, tint, wash, strata, crack };
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
  bbClock += dt * 1000;
  if (bbShake > 0) bbShake = Math.max(0, bbShake - dt);
  if (bbCupFlash > 0) bbCupFlash = Math.max(0, bbCupFlash - dt);
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

  // Height, milestones, beating the session best
  bbMaxY = Math.max(bbMaxY, p.y);
  bbScore = bbMetres();
  if (bbScore >= bbNextMilestone) {
    bbCallout(bbNextMilestone + ' M', BB_W / 2, 150, BB_GOLD, 40, 1.6);
    BB_SOUND.milestone();
    bbNextMilestone += 100;
  }
  if (!bbBeatBest && bbScores.length && bbScore > bbScores[0].score) {
    bbBeatBest = true;
    bbCallout('NEW HEIGHT', BB_W / 2, 200, BB_CHALK, 26, 1.6);
  }

  // Spare dice
  const i0 = Math.floor(p.y / BB_SEC);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const s = bbSecs[i];
    if (!s || !s.pickup || s.pickup.taken) continue;
    const pk = s.pickup;
    if (Math.abs(p.x - pk.x) < 24 && Math.abs(p.y + 15 - pk.y) < 28) {
      pk.taken = true;
      BB_SOUND.pickup();
      bbSparkle(pk.x, pk.y, BB_GOLD, 10);
      if (bbCup < BB_CUP_MAX) { bbCup++; bbCallout('+1 DIE', pk.x, bbSY(pk.y) - 20, BB_GOLD, 20, 1.0); }
      else bbCallout('FULL CUP', pk.x, bbSY(pk.y) - 20, BB_CHALK, 16, 0.9);
    }
  }

  // The Depths creep up once you're off the ground, and never sit far below the screen.
  if (bbScore >= 6) bbSeaY += Math.min(55, 14 + bbScore * 0.06) * dt;
  bbSeaY = Math.max(bbSeaY, bbCamY + 18);
  if (p.y < bbSeaY - 6) { bbPlunge(); if (bbState !== 'playing') return; }

  // Rockfall
  if (bbScore >= 8) {
    bbRockT -= dt;
    if (bbRockT <= 0) {
      bbSpawnRock(bbScore);
      bbRockT = Math.max(0.85, 2.6 - bbScore * 0.006) * (0.75 + Math.random() * 0.5);
    }
  }
  if (bbInvuln > 0) bbInvuln = Math.max(0, bbInvuln - dt);
}

function bbCheckLanding(prevY) {
  const p = bbPlayer;
  const i0 = Math.floor(p.y / BB_SEC);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const s = bbSecs[i];
    if (!s) continue;
    for (const h of s.holds) {
      if (h.gone) continue;
      if (prevY >= h.y && p.y <= h.y && Math.abs(p.x - h.x) <= BB_LAND_REACH) { bbLand(h); return; }
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
  if (h.kind === 'raise') {
    p.vy = BB_RAISE_V;
    BB_SOUND.raise();
    bbSparkle(h.x, h.y, BB_GOLD, 14);
    bbCallout('RAISE!', h.x, bbSY(h.y) - 34, BB_GOLD, 24, 0.9);
  } else if (h.kind === 'slick') {
    p.vy = BB_SLICK_V;
    BB_SOUND.slick();
    bbBurst(h.x, h.y, ['#BFE3EC', BB_FOAM], 6, 90, 400);
    bbCallout('SLICK', h.x, bbSY(h.y) - 30, '#BFE3EC', 18, 0.7);
  } else {
    p.vy = BB_HOP_V;
    BB_SOUND.hop();
    bbBurst(h.x, h.y, [BB_CHALK], 4, 70, 300);
  }
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
function bbSpawnRock(m) {
  const pool = BB_KINDS.filter((k, n) => m >= BB_UNLOCK[n]);
  const kind = (!pool.length || Math.random() < 0.45) ? 'plain' : pool[Math.floor(Math.random() * pool.length)];
  const size = kind === 'loaded' ? 50 : 36;
  const speed = Math.min(360, 170 + m * 0.6) * (kind === 'loaded' ? 1.55 : 1);
  const x = Math.random() < 0.5
    ? Math.max(30, Math.min(330, bbPlayer.x + (Math.random() - 0.5) * 120))   // half aim near you
    : 30 + Math.random() * 300;
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
    if (bbState === 'playing' && bbInvuln <= 0) {
      const dx = p.x - r.x, dy = (p.y + 15) - r.y, reach = r.size * 0.42 + 11;
      if (dx * dx + dy * dy < reach * reach) {
        r.dead = true;
        bbBurst(r.x, r.y, ['#DCD0BA', BB_INK, BB_DIM], 12, 200, 600);
        BB_SOUND.hit();
        bbLoseDie('rock');
        if (bbState === 'playing') {
          bbInvuln = BB_INVULN;
          bbCallout('-1 DIE', p.x, bbSY(p.y) - 50, BB_RED, 22, 0.9);
        }
        continue;
      }
    }
    if (r.y < bbCamY - 80 || r.x < -60 || r.x > BB_W + 60) r.dead = true;
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
    else g.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;
  g.restore();

  if (live) bbRocks.forEach(r => { if (r.warn > 0) bbDrawWarning(g, r); });
  for (const c of bbCallouts) {
    g.globalAlpha = Math.max(0, Math.min(1, c.life / 0.3));
    bbText(g, c.text, c.x, c.y, c.size, c.col, 'center', true);
  }
  g.globalAlpha = 1;
  if (live) bbDrawHud(g);

  if (bbState === 'attract') bbDrawAttract(g);
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
  bbText(g, 'DRAG TO STEER', BB_W / 2, 376, 17, BB_CHALK);
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
  document.getElementById('btn-bb-exit').addEventListener('click', () => { resetArcadeBluff(); resetToLobby(); });
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
  // bbScores is NOT cleared — session high scores survive the lobby.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-bluff').style.display !== 'none') bbResize();
});
