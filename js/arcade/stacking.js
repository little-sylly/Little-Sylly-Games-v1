// ═══════════════════════════════════════════════════════════════════════════
// stacking.js — ARCADE CABINET 06. STACKING ORDER: Stack / Tower Bloxx with
// animals. An animal swings from a vine; tap to drop it onto the tower. Land it
// dead centre for a PERFECT, land it off-centre and the tower leans, lean too far
// and it all comes down. Bonus for stacking in pecking order (predator on prey).
// Set in the Pecking Order (pko) party game's world. Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//  - Prefix `sto`. Screen id: screen-arcade-stacking. DOM: #sto-stage (pointer
//    target, touch-action:none) wrapping #sto-canvas, plus #btn-sto-exit.
//  - engine.js resetToLobby() should call resetArcadeStacking() beside resetArcade().
//  - NO setTimeouts: every delayed effect is scheduled on stoClock via stoEvents.
//  - Oct 2026 additions: FEEDING FRENZY (three PERFECTs in a row: the vine
//    turns gold, PERFECTs pay double and the window widens until you miss
//    centre); HIGH WINDS from floor 15 (a gust, warned by an arrow and blowing
//    leaves, pushes whatever's FALLING sideways — drop upwind); hit-stop, a
//    zoom punch and a shockwave on every landing; animal noises; coach lines.
//
// World coordinates (used for the tower, falling animals, debris, particles):
//   x is logical px (180 = screen centre when the camera is at rest),
//   y points DOWN with 0 at the ground line, so the tower lives at negative y.
//   World → screen: sx = 180 + (x - 180 - stoCamX) * stoZoom
//                   sy = STO_GROUND_Y + (y + stoCamH) * stoZoom
//   The swinging animal, HUD, callouts and menus are drawn in screen space.
// ═══════════════════════════════════════════════════════════════════════════
const STO_W = 360, STO_H = 640;
const STO_TITLE = 'STACKING ORDER';          // alt name on the table: 'TOP OF THE FOOD CHAIN'
const STO_TOP_N = 5;

// ── Palette: Pecking Order's world (Land = ochre, Sea = teal, brand yellow-800 as accent)
const STO_BG = '#140E07', STO_INK = '#2B1A0A', STO_CREAM = '#FDF3DC', STO_OCHRE = '#E2A63B',
      STO_TEAL = '#2EC4B6', STO_BRAND = '#854D0E', STO_YELLOW = '#FDE68A', STO_GOLD = '#FFD54A',
      STO_GREY = '#A8A29E', STO_DIM = '#78716C', STO_RED = '#F87171', STO_GREEN = '#4ADE80';
const STO_LINE = 'rgba(43,26,10,0.55)';     // soft ink outline on every block
const STO_CONFETTI = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8', '#FDE68A'];

// ── Tuning (SOFT — change freely after play-testing) ──
const STO_GROUND_Y = 612;        // screen y of the ground line with the camera at rest
const STO_TOP_HOLD = 330;        // once the tower is tall, keep its top about here
const STO_FLOOR_PX = 46;         // average floor height, used for sky/cloud levels
const STO_PERFECT_PX = 5;        // |dx| ≤ this = PERFECT
const STO_LEAN_DIV = 420;        // lean += dx * weight / 420 ...
const STO_LEAN_HEIGHT = 12;      // ... × (1 + floors/12): taller towers tip easier (added after simulation)
const STO_RECOVER = 0.25;        // a PERFECT straightens 25% of the lean
const STO_RECOVER_STEADY = 0.40; // ... 40% once the perfect streak is 3+
const STO_RECOVER_ALPHA = 0.50;  // an ALPHA perfect clears half the lean
const STO_FLINCH = 0.05;         // NERVOUS! extra lean
const STO_BEND = 6.5;            // sideways px per floor at full lean (the visible tilt)
const STO_BEND_SPAN = 12;        // how many top floors visibly bend
const STO_GRAVITY = 2600;        // px/s² for a dropped animal
const STO_SPAWN_MS = 250;        // next animal swings in this long after a landing
const STO_ENTER_S = 0.2;         // the new animal pops onto the vine over this long
const STO_LIVES = 3;             // paw prints
const STO_ALPHA_EVERY = 10;      // every 10th animal is an ALPHA (golden rim)
const STO_RAMP_FLOORS = 40;      // swing reaches full speed/width at this floor
const STO_SWING_AMP = [70, 140], STO_SWING_PERIOD = [2.4, 1.3];
const STO_PECK_CHANCE = 0.25;    // chance the next animal is a predator of the one before it
const STO_REPEAT_CHANCE = 0.08, STO_REPEAT_TEASE = 0.35;   // same-species repeats (STAMPEDE! bait)
const STO_VINE_PIVOT_Y = -230, STO_VINE_LEN = 348;          // pendulum pivot sits above the screen
const STO_MILESTONES = { 10: 'THE WATERING HOLE', 25: 'THE HIERARCHY', 50: 'APEX PREDATOR' };
const STO_BOTTOM_FEEDER = 5;     // under this many floors → BOTTOM FEEDER
const STO_ROCK = { kind: 'rock', w: 160, h: 44 };
const STO_FRENZY_AT = 3;          // PERFECTs in a row that start a FEEDING FRENZY
const STO_FRENZY_PX = 8;          // the PERFECT window during a frenzy
const STO_WIND_FROM = 15;         // HIGH WINDS from this floor
const STO_WIND_WARN = 1.4, STO_WIND_S = 3.2, STO_WIND_GAP = [9, 14];   // seconds
const STO_WIND_PUSH = [70, 120];  // px/s sideways on a falling animal, floor 15 → floor 40
const STO_COACH_S = 4.6;
const STO_COACH = {
  start:   'Tap anywhere to drop the animal. Land it right in the middle of the one below!',
  perfect: 'PERFECT! A dead-centre landing straightens the tower a little.',
  lean:    'The tower is leaning! Land on the other side, or get a PERFECT to straighten it.',
  climb:   'Predator on prey climbs the order: bonus points. The NEXT box shows a ▲ when it can.',
  nervous: 'Prey on its predator gets nervous and makes the tower wobble.',
  frenzy:  'Feeding Frenzy! Keep landing PERFECTs for double points.',
  wind:    'Wind! It blows falling animals sideways. Drop a little upwind.',
  alpha:   'An Alpha! A PERFECT with it halves the lean.',
};
const STO_NOISE = {
  mouse: 'Squeak!', bee: 'Bzzz!', mongoose: 'Chirr!', eagle: 'Skree!', leopard: 'Rrrowr!', bear: 'Grr!',
  elephant: 'Toot!', fish: 'Blub!', octopus: 'Splorp!', seal: 'Arf!', stingray: 'Swish!', polarbear: 'Brr!', orca: 'Squee!',
};
const STO_STREAK_SHOUT = { 5: 'UNSTOPPABLE!', 8: 'KING OF THE JUNGLE!', 12: 'TOP OF THE FOOD CHAIN!', 16: 'APEX OF APEXES!' };

// ── The 13 animals (FIRM chain, SOFT sizes). w × h in px, weight scales lean.
const STO_ANIMALS = {
  mouse:     { name: 'Mouse',      track: 'land', w: 56,  h: 40, weight: 0.6, body: '#C9A26B', shade: '#9C7845' },
  bee:       { name: 'Bee',        track: 'land', w: 52,  h: 40, weight: 0.5, body: '#F2B630', shade: '#C98B12' },
  mongoose:  { name: 'Mongoose',   track: 'land', w: 76,  h: 40, weight: 0.8, body: '#B98A4A', shade: '#8E6430' },
  eagle:     { name: 'Eagle',      track: 'land', w: 76,  h: 48, weight: 0.8, body: '#7A4E26', shade: '#563517' },
  leopard:   { name: 'Leopard',    track: 'land', w: 88,  h: 48, weight: 1.0, body: '#E3A83A', shade: '#B98222' },
  bear:      { name: 'Bear',       track: 'land', w: 104, h: 56, weight: 1.3, body: '#8B5A2B', shade: '#653F1B' },
  elephant:  { name: 'Elephant',   track: 'land', w: 128, h: 60, weight: 1.6, body: '#B19A78', shade: '#8A7457' },
  fish:      { name: 'Fish',       track: 'sea',  w: 60,  h: 40, weight: 0.6, body: '#3CC1B5', shade: '#249487' },
  octopus:   { name: 'Octopus',    track: 'sea',  w: 80,  h: 48, weight: 0.9, body: '#D9473F', shade: '#A8322C' },   // red (Sam's call) — stands out from the teal sea animals
  seal:      { name: 'Seal',       track: 'sea',  w: 88,  h: 48, weight: 1.0, body: '#6F959A', shade: '#4F7175' },
  stingray:  { name: 'Stingray',   track: 'sea',  w: 100, h: 36, weight: 0.9, body: '#2E8A8F', shade: '#1E6468' },
  polarbear: { name: 'Polar Bear', track: 'sea',  w: 108, h: 56, weight: 1.4, body: '#F1F6F5', shade: '#C6DCDA' },
  orca:      { name: 'Orca',       track: 'sea',  w: 120, h: 52, weight: 1.5, body: '#15282C', shade: '#0B1A1D' },
};
// predator lookup: STO_BEATEN_BY[prey] = the animals that beat it (the suite game's real chain)
const STO_BEATEN_BY = {
  mouse: ['mongoose', 'eagle'],   mongoose: ['eagle', 'leopard'], leopard: ['bear'],
  eagle: [],                      bear: ['elephant'],             elephant: ['bee'],  bee: ['bear'],
  fish: ['octopus', 'mongoose', 'eagle'], octopus: ['seal'], seal: ['polarbear'],
  polarbear: ['orca'],            orca: ['stingray'],             stingray: ['orca'],
};
function stoBeats(a, b) { return !!STO_BEATEN_BY[b] && STO_BEATEN_BY[b].includes(a); }   // does a beat b?
const STO_BIG = ['elephant', 'orca', 'polarbear'];   // kept out of floors 1–5
const STO_BAG_WEIGHTS = { mouse: 3, bee: 2, mongoose: 2, eagle: 2, leopard: 2, bear: 2, elephant: 1,
                          fish: 3, octopus: 2, seal: 2, stingray: 2, polarbear: 1, orca: 1 };

// ── Sound map (all one-shot playSecretBeep blips; jingles are scheduled on the clock)
const STO_SOUND = {
  select:       () => playSecretBeep(660),
  highScore:    () => playSecretBeep(1046),
  drop:         () => playSecretBeep(330),
  landLight:    () => playSecretBeep(196),
  landHeavy:    () => playSecretBeep(130),
  perfect:      (streak) => playSecretBeep(Math.round(988 * Math.pow(2, Math.min(Math.max(streak - 1, 0), 12) / 12))),
  climb:        () => stoJingle([784, 1046], 110),
  nervous:      () => stoJingle([247, 233], 120),
  stampede:     () => stoJingle([392, 392, 523], 110),
  alphaAppear:  () => playSecretBeep(1568),
  alphaPerfect: () => stoJingle([1318, 1568], 100),
  miss:         () => playSecretBeep(147),
  leanWarn:     () => playSecretBeep(110),
  collapse:     () => stoJingle([392, 330, 262, 196, 147], 140),
  milestone:    () => stoJingle([523, 659, 784, 1046], 110),
  frenzy:       () => stoJingle([784, 988, 1175, 1568, 1976], 70),
  frenzyOver:   () => stoJingle([523, 392], 120),
  wind:         () => stoJingle([392, 349, 330, 294], 110),
};
const STO_OVER_JINGLE = [523, 392, 330, 262];   // used when the last paw print goes

// ── Layout rects (logical px)
const STO_BTN_PLAY     = { x: 40,  y: 448, w: 280, h: 64 };
const STO_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const STO_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const STO_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const STO_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

// ── Engine state (same shape as every cabinet)
let stoCanvas = null, stoCtx = null;
let stoRafHandle = null, stoLastT = 0;
let stoState = 'attract';   // attract | playing | dying | over | nameEntry | leaderboard
let stoClock = 0;           // ms of un-paused time
let stoEvents = [];         // [{ at, fn }] — replaces setTimeout
let stoParts = [];          // particles ({ screen: true } ones are drawn in screen space)
let stoShake = 0;
let stoScore = 0, stoLastScore = 0, stoLastFloors = 0;
let stoPtrId = null;        // the one pointer allowed to act
let stoPress = null;
let stoScores = [];         // session leaderboard — NOT cleared by teardown
const STO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let stoInitials = [0, 0, 0];
let stoLastEntry = -1;      // leaderboard row to highlight

// ── Game state
let stoTower = [];          // [rock, floor1, floor2, …] each { kind, w, h, x, cy, age, nervous, seed, alpha }
let stoTowerH = 0;          // total stacked height in px (rock included)
let stoLean = 0, stoLeanVis = 0;   // −1…+1; the Vis copy eases toward the real one for drawing
let stoStreak = 0, stoPaws = STO_LIVES, stoDrops = 0;
let stoSwing = null;        // { kind, alpha, enter } — the animal on the vine
let stoNext = null;         // { kind, alpha } — shown in the NEXT bubble
let stoFall = null;         // the one animal currently falling
let stoTumblers = [], stoDebris = [];
let stoBag = [], stoPickHist = [], stoSpawnCount = 0;
let stoPhase = 0;           // pendulum phase (radians)
let stoCamX = 0, stoCamH = 0, stoZoom = 1;
let stoCallouts = [], stoPopups = [], stoBanner = null;
let stoCollapse = null, stoOverReason = '';
let stoLastWarn = 0, stoPawLostAt = -9999;
let stoFrenzy = false;
let stoWind = null;         // { dir, warnUntil, until, push } — a gust, stoClock ms
let stoNextWind = 0;
let stoFreeze = 0, stoFlash = 0, stoPunch = 0;   // hit-stop, a white flash, the zoom punch
let stoRings = [];          // landing shockwaves (world space): { x, y, w, age, life }
let stoBubbles = [];        // animal noises (world space): { text, x, y, age }
let stoCoach = null, stoCoachQ = [];
let stoCoachSeen = {};      // session-only, like the scores

// ── Scenery, generated once from a fixed seed so it's the same every run
function stoMulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const STO_SCENE = (() => {
  const r = stoMulberry(606);
  const stars = [], clouds = [], birds = [];
  for (let i = 0; i < 70; i++) stars.push({ x: r() * STO_W, y: r() * STO_H, s: r() < 0.2 ? 2.5 : 1.5, a: 0.5 + r() * 0.5, tw: 1 + r() * 3, ph: r() * 6 });
  // clouds start about floor 15 (parallax 0.5 → world y chosen so they scroll in on cue)
  for (let i = 0; i < 16; i++) clouds.push({ x: r() * 520 - 80, y: -820 - i * 80 - r() * 40, s: 0.7 + r() * 0.7, v: 4 + r() * 8 });
  for (let i = 0; i < 7; i++) birds.push({ x: r() * 460, y: -260 - i * 150 - r() * 60, v: 18 + r() * 22, ph: r() * 6 });
  return { stars, clouds, birds };
})();
// sky colour by height (in floors): savanna ochre → sky blue → clouds → dusk → starry night at 50
const STO_SKY = [[0, '#F4C877'], [5, '#A9D8EC'], [15, '#7CC0E8'], [30, '#5D9BDA'], [37, '#F2A27A'],
                 [43, '#7D4F9C'], [50, '#1D1E4A'], [60, '#0A0B22']].map(([l, c]) => [l, stoHexRgb(c)]);

// ═══════════════════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════════════════
function stoStart() {
  stoCanvas = document.getElementById('sto-canvas');
  stoCtx = stoCanvas.getContext('2d');
  showScreen('screen-arcade-stacking');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  stoResize();
  stoEnterState('attract');
}

function stoEnterState(next) {
  stoState = next;
  if (next === 'playing') stoNewGame();
  stoShake = 0; stoPress = null;
  if (!stoRafHandle) { stoLastT = 0; stoRafHandle = requestAnimationFrame(stoLoop); }
}

function stoNewGame() {
  stoScore = 0; stoParts = []; stoEvents = [];
  stoTower = [{ kind: 'rock', w: STO_ROCK.w, h: STO_ROCK.h, x: 180, cy: -STO_ROCK.h / 2, age: 9, nervous: 0, seed: 0, alpha: false }];
  stoTowerH = STO_ROCK.h;
  stoLean = 0; stoLeanVis = 0; stoStreak = 0; stoPaws = STO_LIVES; stoDrops = 0;
  stoSwing = null; stoFall = null; stoTumblers = []; stoDebris = [];
  stoBag = []; stoPickHist = []; stoSpawnCount = 0; stoPhase = -Math.PI / 2;
  stoCamX = 0; stoCamH = 0; stoZoom = 1;
  stoCallouts = []; stoPopups = []; stoBanner = null; stoCollapse = null; stoOverReason = '';
  stoLastWarn = 0; stoPawLostAt = -9999;
  stoFrenzy = false; stoWind = null; stoNextWind = 0; stoFreeze = 0; stoFlash = 0; stoPunch = 0;
  stoRings = []; stoBubbles = []; stoCoach = null; stoCoachQ = [];
  stoNext = stoPick(null, 1);
  stoSpawnSwing();
  stoQueueCoach('start');
}

function stoQueueCoach(key) { if (stoCoachSeen[key]) return; stoCoachSeen[key] = true; stoCoachQ.push(key); }

function stoLoop(now) {
  stoRafHandle = null;
  if (!stoLastT) stoLastT = now;
  const dt = Math.min((now - stoLastT) / 1000, 0.05);
  stoLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) stoUpdate(dt);
  stoDraw();
  if (!stoRafHandle) stoRafHandle = requestAnimationFrame(stoLoop);
}

function stoAt(ms, fn) { stoEvents.push({ at: stoClock + ms, fn }); }
function stoJingle(freqs, gap) { freqs.forEach((f, k) => stoAt(k * gap, () => playSecretBeep(f))); }

function stoUpdate(dt) {
  if (stoShake > 0) stoShake = Math.max(0, stoShake - dt);
  if (stoFlash > 0) stoFlash = Math.max(0, stoFlash - dt * 3);
  if (stoPunch > 0) stoPunch = Math.max(0, stoPunch - dt * 4);
  if (stoFreeze > 0) { stoFreeze -= dt; return; }   // hit-stop
  stoClock += dt * 1000;
  stoRings.forEach(r => { r.age += dt; }); stoRings = stoRings.filter(r => r.age < r.life);
  stoBubbles.forEach(b => { b.age += dt; }); stoBubbles = stoBubbles.filter(b => b.age < 1.0);
  if (stoCoach && stoClock > stoCoach.until) stoCoach = null;
  if (!stoCoach && stoCoachQ.length && stoState === 'playing') stoCoach = { text: STO_COACH[stoCoachQ.shift()], until: stoClock + STO_COACH_S * 1000 };
  stoParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.life -= dt; if (p.spin) p.rot += p.spin * dt; });
  stoParts = stoParts.filter(p => p.life > 0);
  if (stoEvents.length) {
    const due = stoEvents.filter(e => stoClock >= e.at);
    stoEvents  = stoEvents.filter(e => stoClock <  e.at);
    due.forEach(e => e.fn());
  }
  stoCallouts.forEach(c => { c.age += dt; });
  stoCallouts = stoCallouts.filter(c => c.age < c.life);
  stoPopups.forEach(p => { p.age += dt; });
  stoPopups = stoPopups.filter(p => p.age < 0.9);
  if (stoBanner) { stoBanner.age += dt; if (stoBanner.age > 1.8) stoBanner = null; }
  if (stoState === 'playing' || stoState === 'dying' || stoState === 'over') stoUpdateWorld(dt);
}

// ═══════════════════════════════════════════════════════════════════════════
// Game logic
// ═══════════════════════════════════════════════════════════════════════════
function stoFloors() { return Math.max(0, stoTower.length - 1); }
function stoRamp() { return Math.min(1, stoFloors() / STO_RAMP_FLOORS); }
function stoSwingAmp() { return STO_SWING_AMP[0] + (STO_SWING_AMP[1] - STO_SWING_AMP[0]) * stoRamp(); }
function stoSwingPeriod() { return STO_SWING_PERIOD[0] + (STO_SWING_PERIOD[1] - STO_SWING_PERIOD[0]) * stoRamp(); }

function stoToWorld(sx, sy) { return { x: (sx - 180) / stoZoom + 180 + stoCamX, y: (sy - STO_GROUND_Y) / stoZoom - stoCamH }; }

// How far floor i sits from straight, given a tower of `len` blocks. Only the top
// STO_BEND_SPAN floors bend, so the visible part always shows the lean.
function stoSpan(i, len) { return i - Math.max(0, len - 1 - STO_BEND_SPAN); }
function stoBendOffset(i, len) { const s = stoSpan(i, len); return s > 0 ? stoLeanVis * STO_BEND * s : 0; }
function stoSwayOffset(i, len) {
  const s = stoSpan(i, len);
  if (s <= 0) return 0;
  const amp = Math.min(4, 0.3 + stoFloors() * 0.06) + Math.abs(stoLeanVis) * 3;   // grows with height & lean
  return Math.sin(stoClock / 1000 * 2 * Math.PI / 2.6 + i * 0.12) * amp * s / STO_BEND_SPAN;
}
function stoFloorX(i, len = stoTower.length) { return stoTower[i].x + stoBendOffset(i, len) + stoSwayOffset(i, len); }
function stoTiltAngle() { return stoLeanVis * STO_BEND / STO_FLOOR_PX; }

// Where the vine and its animal are right now (screen space)
function stoSwingPos(kind) {
  const a = STO_ANIMALS[kind];
  const xOff = stoSwingAmp() * Math.sin(stoPhase);
  const fl = stoFloors();
  const bob = fl >= 20 ? Math.sin(stoClock / 1000 * 1.7) * 6 * Math.min(1, 0.2 + (fl - 20) / 20) : 0;
  const pivotY = STO_VINE_PIVOT_Y + bob, L = STO_VINE_LEN;
  const th = Math.asin(xOff / L);
  const endX = 180 + xOff, endY = pivotY + L * Math.cos(th);
  const d = a.h / 2 + 6;
  return { x: endX + Math.sin(th) * d, y: endY + Math.cos(th) * d, rot: -th, endX, endY, pivotY };
}

function stoRefillBag() {
  stoBag = [];
  Object.keys(STO_BAG_WEIGHTS).forEach(k => { for (let i = 0; i < STO_BAG_WEIGHTS[k]; i++) stoBag.push(k); });
  for (let i = stoBag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [stoBag[i], stoBag[j]] = [stoBag[j], stoBag[i]]; }
}

// Choose the animal that will follow `prev`. A weighted shuffle bag, plus a
// pecking-order nudge (a predator of prev) and the odd same-species repeat.
function stoPick(prev, targetFloor) {
  stoSpawnCount++;
  const alpha = stoSpawnCount % STO_ALPHA_EVERY === 0;
  const ok = k => !(targetFloor <= 5 && STO_BIG.includes(k));
  let kind = null;
  if (prev) {
    const preds = STO_BEATEN_BY[prev].filter(ok);
    if (preds.length && Math.random() < STO_PECK_CHANCE) kind = preds[Math.floor(Math.random() * preds.length)];
  }
  if (!kind && prev && ok(prev)) {
    const h = stoPickHist, n = h.length;
    const tease = n >= 2 && h[n - 2] === prev && !(n >= 3 && h[n - 3] === prev);   // two in a row → dangle a third
    if (Math.random() < (tease ? STO_REPEAT_TEASE : STO_REPEAT_CHANCE)) kind = prev;
  }
  for (let tries = 0; !kind && tries < 40; tries++) {
    if (!stoBag.length) stoRefillBag();
    const k = stoBag.pop();
    if (ok(k) && !(k === prev && Math.random() < 0.6)) kind = k; else stoBag.unshift(k);
  }
  kind = kind || 'mouse';
  stoPickHist.push(kind); if (stoPickHist.length > 4) stoPickHist.shift();
  return { kind, alpha };
}

function stoSpawnSwing() {
  if (stoState !== 'playing' || stoSwing || stoFall) return;
  const cur = stoNext;
  stoSwing = { kind: cur.kind, alpha: cur.alpha, enter: 0 };
  stoNext = stoPick(cur.kind, stoFloors() + 2);
  if (cur.alpha) { STO_SOUND.alphaAppear(); stoQueueCoach('alpha'); }
}

function stoDrop() {
  if (stoState !== 'playing' || !stoSwing || stoFall || stoSwing.enter < 0.5) return;   // one at a time
  const s = stoSwing, a = STO_ANIMALS[s.kind], p = stoSwingPos(s.kind);
  const w = stoToWorld(p.x, p.y);
  stoFall = { kind: s.kind, alpha: s.alpha, w: a.w, h: a.h, x: w.x, y: w.y, vy: 0, rot: p.rot };   // straight down
  stoSwing = null; stoDrops++;
  STO_SOUND.drop();
}

function stoCallout(text, sub, color, size = 24) {
  const slot = stoCallouts.filter(c => c.age < 0.05).length;
  if (slot === 0) stoCallouts.forEach(c => { c.life = Math.min(c.life, c.age + 0.12); });   // clear the last drop's words fast
  stoCallouts.push({ text, sub, color, size, age: 0, life: 1.3, slot });
}

function stoLand(f) {
  stoFall = null;
  const n = stoTower.length, top = stoTower[n - 1];
  const topX = stoFloorX(n - 1);           // where the player SEES the top (lean + sway included)
  const dx = f.x - topX;
  if (Math.abs(dx) > top.w / 2) { stoMiss(f, dx, top); return; }   // exactly on the edge lands: ties go to the kid

  const a = STO_ANIMALS[f.kind];
  const perfect = Math.abs(dx) <= (stoFrenzy ? STO_FRENZY_PX : STO_PERFECT_PX);
  const landX = perfect ? topX : f.x;
  const floor = { kind: f.kind, alpha: f.alpha, w: a.w, h: a.h, x: 0, cy: -stoTowerH - a.h / 2, age: 0, nervous: 0, seed: Math.random() * 5000 };
  stoTower.push(floor);
  stoTowerH += a.h;
  floor.x = landX - stoBendOffset(n, n + 1) - stoSwayOffset(n, n + 1);   // stored "straight" x
  const floors = n;

  const below = top.kind === 'rock' ? null : top.kind;
  const climbing = !!below && stoBeats(f.kind, below);              // predator dropped on its prey
  const nervous = !!below && !climbing && stoBeats(below, f.kind);  // prey dropped on its predator

  let pts = 1, alphaPerfect = false, frenzyStart = false, frenzyEnd = false;
  if (perfect) {
    let rec = stoStreak >= 3 ? STO_RECOVER_STEADY : STO_RECOVER;
    if (f.alpha) { rec = Math.max(rec, STO_RECOVER_ALPHA); alphaPerfect = true; }
    stoLean *= 1 - rec;
    stoStreak++;
    pts += 2 + (alphaPerfect ? 5 : 0);
    if (stoFrenzy) pts *= 2;
    if (!stoFrenzy && stoStreak >= STO_FRENZY_AT) { stoFrenzy = true; frenzyStart = true; }
  } else {
    stoLean += dx * a.weight / STO_LEAN_DIV * (1 + floors / STO_LEAN_HEIGHT);
    stoStreak = 0;
    if (stoFrenzy) { stoFrenzy = false; frenzyEnd = true; }
  }
  // The impact: a shockwave, a zoom punch, and — on a PERFECT — the frame holds for a beat.
  stoRings.push({ x: landX, y: floor.cy + a.h / 2, w: a.w, age: 0, life: perfect ? 0.45 : 0.32, gold: perfect });
  stoPunch = Math.max(stoPunch, perfect ? 1 : 0.4 * a.weight);
  if (perfect) { stoFreeze = alphaPerfect ? 0.1 : 0.05; stoFlash = alphaPerfect ? 0.5 : 0.22; }
  if (nervous) {
    const s = Math.sign(dx) || Math.sign(stoLean) || (Math.random() < 0.5 ? -1 : 1);
    stoLean += s * STO_FLINCH;
    floor.nervous = 1;
  }

  (a.weight >= 1.2 ? STO_SOUND.landHeavy : STO_SOUND.landLight)();
  stoDust(landX, floor.cy + a.h / 2, a.w);
  if (a.weight >= 1.2) stoShake = Math.max(stoShake, 0.1);

  // Collapse beats everything else that drop would have earned (still counts the floor).
  if (Math.abs(stoLean) >= 1) { stoScore += 1; stoStartCollapse(Math.sign(stoLean)); return; }

  let run = 1;
  for (let i = stoTower.length - 2; i >= 1 && stoTower[i].kind === f.kind; i--) run++;
  const stampede = run >= 3 && run % 3 === 0;
  if (climbing) pts += 3;
  if (stampede) pts += 5;
  stoScore += pts;
  stoPopups.push({ x: landX, y: floor.cy - a.h / 2 - 10, text: '+' + pts, age: 0 });

  let delay = 70;
  if (perfect) {
    const sk = stoStreak;
    if (alphaPerfect) stoCallout('ALPHA!', 'PERFECT · LEAN HALVED', STO_GOLD, 28);
    else if (frenzyStart) stoCallout('FEEDING FRENZY!', 'PERFECTS PAY DOUBLE', STO_GOLD, 26);
    else if (STO_STREAK_SHOUT[sk]) stoCallout(STO_STREAK_SHOUT[sk], `PERFECT ×${sk}`, STO_GOLD, sk >= 12 ? 22 : 26);
    else stoCallout('PERFECT!' + (sk >= 2 ? ' ×' + sk : ''), stoFrenzy ? `FRENZY · +${pts}` : sk >= 3 ? 'STEADY PAWS' : '', STO_YELLOW);
    stoAt(delay, () => (alphaPerfect ? STO_SOUND.alphaPerfect() : STO_SOUND.perfect(sk)));
    if (frenzyStart) { stoAt(delay + 120, STO_SOUND.frenzy); stoConfetti(); stoQueueCoach('frenzy'); }
    stoSparkle(landX, floor.cy, alphaPerfect ? STO_GOLD : STO_YELLOW);
    stoQueueCoach('perfect');
    delay += 140;
  } else if (frenzyEnd) {
    stoCallout('FRENZY OVER', 'LAND IT DEAD CENTRE', STO_CREAM, 18);
    stoAt(delay, STO_SOUND.frenzyOver);
  }
  if (climbing) {
    stoCallout('CLIMBING THE ORDER!', `${a.name} beats ${STO_ANIMALS[below].name}`, STO_OCHRE, 21);
    stoAt(delay, STO_SOUND.climb); delay += 240;
    stoQueueCoach('climb');
  } else if (nervous) {
    stoCallout('NERVOUS!', `${STO_ANIMALS[below].name} beats ${a.name}`, STO_TEAL);
    stoAt(delay, STO_SOUND.nervous); delay += 260;
    stoQueueCoach('nervous');
  }
  if (perfect || climbing || nervous || a.weight >= 1.3) {   // the animal has something to say about it
    stoBubbles = stoBubbles.filter(b => b.age < 0.4).slice(-1);
    stoBubbles.push({ text: nervous ? 'Eep!' : STO_NOISE[f.kind] || '!', x: landX + a.w / 2 - 6, y: floor.cy - a.h / 2 - 8, age: 0 });
  }
  if (Math.abs(stoLean) > 0.55) stoQueueCoach('lean');
  if (stampede) {
    stoCallout('STAMPEDE!', `${run} IN A ROW`, STO_RED, 28);
    stoAt(delay, STO_SOUND.stampede); delay += 340;
    stoShake = Math.max(stoShake, 0.2);
  }
  if (STO_MILESTONES[floors]) {
    stoBanner = { text: STO_MILESTONES[floors], sub: `${floors} FLOORS`, age: 0 };
    stoAt(delay + 60, STO_SOUND.milestone);
    stoConfetti();
  }
  stoAt(STO_SPAWN_MS, stoSpawnSwing);
}

function stoMiss(f, dx, top) {
  stoPaws--; stoStreak = 0; stoPawLostAt = stoClock;
  stoFrenzy = false;
  STO_SOUND.miss();
  const touching = Math.abs(dx) <= top.w / 2 + f.w / 2;   // clipped the edge → tips off; else falls clean past
  const s = Math.sign(dx) || 1;
  stoTumblers.push({ kind: f.kind, alpha: f.alpha, w: f.w, h: f.h, x: f.x, y: f.y,
    vx: touching ? s * 160 : s * 15, vy: touching ? -140 : f.vy, rot: f.rot, vr: s * (touching ? 7 : 1.5), life: 2.6 });
  stoCallout('MISS!', stoPaws > 0 ? `${stoPaws} PAW${stoPaws === 1 ? '' : 'S'} LEFT` : 'NO PAWS LEFT', STO_RED);
  stoShake = Math.max(stoShake, 0.15);
  if (stoPaws <= 0) { stoState = 'dying'; stoOverReason = 'paws'; stoAt(1100, stoGameOver); return; }   // no collapse
  stoAt(STO_SPAWN_MS + 200, stoSpawnSwing);
}

function stoStartCollapse(dir) {
  stoState = 'dying'; stoOverReason = 'collapse'; stoSwing = null;
  const n = stoTower.length, tilt = stoTiltAngle();
  const pos = stoTower.map((f, i) => ({ x: stoFloorX(i, n), y: f.cy, rot: i > 0 && stoSpan(i, n) > 0 ? tilt : 0 }));
  dir = dir || 1;
  const f1 = stoTower[1];
  stoCollapse = { t: 0, dir, ang: 0, av: 0, broken: false, pos,
    pivotX: f1 ? pos[1].x + dir * f1.w / 2 : 180, pivotY: -STO_ROCK.h,           // tips over the base's edge
    zoomT: Math.min(1, (STO_GROUND_Y - 90) / (stoTowerH + 40)) };                // pull back to see it all
  STO_SOUND.collapse();
  stoShake = 0.3;
  stoAt(2700, stoGameOver);
}

function stoBreakTower() {
  const c = stoCollapse; c.broken = true;
  const cos = Math.cos(c.ang), sin = Math.sin(c.ang);
  for (let i = 1; i < stoTower.length; i++) {
    const f = stoTower[i], p = c.pos[i];
    const rx = p.x - c.pivotX, ry = p.y - c.pivotY;
    const x = c.pivotX + rx * cos - ry * sin, y = c.pivotY + rx * sin + ry * cos;
    let vx = -c.av * (y - c.pivotY), vy = c.av * (x - c.pivotX);    // keep the swing it had
    const sp = Math.hypot(vx, vy), cap = 700 / stoZoom;
    if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
    stoDebris.push({ kind: f.kind, alpha: f.alpha, w: f.w, h: f.h, x, y,
      vx: vx + (Math.random() - 0.5) * 90, vy: vy - Math.random() * 90,
      rot: c.ang + p.rot, vr: c.av * (0.6 + Math.random()) + (Math.random() - 0.5) * 5, landed: false });
  }
  stoShake = 0.35;
  STO_SOUND.landHeavy();
}

function stoGameOver() {
  stoLastScore = stoScore; stoLastFloors = stoFloors();
  stoState = 'over';
  stoCallouts = []; stoBanner = null;
  if (stoOverReason === 'paws') STO_OVER_JINGLE.forEach((f, k) => stoAt(150 + k * 140, () => playSecretBeep(f)));
  stoAt(2000, () => {
    if (stoQualifies(stoLastScore)) { stoInitials = [0, 0, 0]; STO_SOUND.highScore(); stoEnterState('nameEntry'); }
    else { stoLastEntry = -1; stoEnterState('leaderboard'); }
  });
}

function stoUpdateWorld(dt) {
  stoLeanVis += (stoLean - stoLeanVis) * Math.min(1, dt * 8);
  if (stoState === 'playing') stoPhase += dt * 2 * Math.PI / stoSwingPeriod();
  for (const f of stoTower) { f.age += dt; if (f.nervous > 0) f.nervous = Math.max(0, f.nervous - dt); }
  if (stoSwing && stoSwing.enter < 1) stoSwing.enter = Math.min(1, stoSwing.enter + dt / STO_ENTER_S);

  if (stoState === 'playing') stoUpdateWind();
  if (stoFall) {
    const f = stoFall;
    f.vy += STO_GRAVITY * dt; f.y += f.vy * dt; f.rot *= Math.exp(-10 * dt);
    if (stoWind && stoClock >= stoWind.warnUntil) { f.x += stoWind.dir * stoWind.push * dt; f.rot += stoWind.dir * 0.6 * dt; }   // HIGH WINDS
    const topY = -stoTowerH;
    if (f.y + f.h / 2 >= topY) { f.y = topY - f.h / 2; stoLand(f); }
  }

  for (const t of stoTumblers) {
    t.vy += STO_GRAVITY * 0.8 * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vr * dt; t.life -= dt;
    if (t.y + t.h / 2 > 0 && t.vy > 0) { t.y = -t.h / 2; t.vy *= -0.3; t.vx *= 0.6; t.vr *= 0.5; }
  }
  stoTumblers = stoTumblers.filter(t => t.life > 0);

  if (stoState === 'playing') {
    const targetH = Math.max(0, stoTowerH - (STO_GROUND_Y - STO_TOP_HOLD));
    stoCamH += (targetH - stoCamH) * Math.min(1, dt * 4);
    const n = stoTower.length, top = stoTower[n - 1];
    const follow = Math.min(1, stoCamH / 200);                 // only drift sideways once the tower is tall
    const targetX = (top.x + stoBendOffset(n - 1, n) - 180) * follow;
    stoCamX += (targetX - stoCamX) * Math.min(1, dt * 3);
    if (Math.abs(stoLean) > 0.75 && stoClock - stoLastWarn >= 600) { stoLastWarn = stoClock; STO_SOUND.leanWarn(); }
  }

  if (stoCollapse) {
    const c = stoCollapse, k = Math.min(1, dt * 5);
    c.t += dt;
    stoZoom += (c.zoomT - stoZoom) * k; stoCamH += (0 - stoCamH) * k; stoCamX += (0 - stoCamX) * k;
    if (!c.broken) {
      if (c.t > 0.35) { c.av += c.dir * 2.6 * dt; c.ang += c.av * dt; }   // zoom out first, then it goes
      if (Math.abs(c.ang) > 0.42 || c.t > 1.5) stoBreakTower();
    }
  }
  const g = 1500 / stoZoom;
  for (const d of stoDebris) {
    d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
    if (d.y + d.h / 2 > 0 && d.vy > 0) {
      d.y = -d.h / 2; d.vy = Math.abs(d.vy) < 60 ? 0 : d.vy * -0.28; d.vx *= 0.65; d.vr *= 0.5;
      if (!d.landed) { d.landed = true; stoDust(d.x, 0, d.w); }
    }
    if (d.landed && d.y >= -d.h / 2 - 1) { d.vx *= Math.exp(-4 * dt); d.vr *= Math.exp(-4 * dt); }
  }
}

// HIGH WINDS, from floor 15: an arrow and blowing leaves first, then a gust
// that pushes whatever is falling. The swing and the tower are never pushed.
function stoUpdateWind() {
  const fl = stoFloors();
  if (fl < STO_WIND_FROM) return;
  if (!stoWind) {
    if (!stoNextWind) {
      stoNextWind = stoClock + 2500;
      stoBanner = { text: 'HIGH WINDS', sub: 'WIND BLOWS FALLING ANIMALS', age: 0 };
      stoAt(60, STO_SOUND.milestone);
      stoQueueCoach('wind');
    }
    if (stoClock < stoNextWind) return;
    const k = Math.min(1, (fl - STO_WIND_FROM) / 25);
    stoWind = { dir: Math.random() < 0.5 ? -1 : 1, warnUntil: stoClock + STO_WIND_WARN * 1000,
                until: stoClock + (STO_WIND_WARN + STO_WIND_S) * 1000,
                push: STO_WIND_PUSH[0] + (STO_WIND_PUSH[1] - STO_WIND_PUSH[0]) * k };
    STO_SOUND.wind();
    return;
  }
  if (Math.random() < 0.35) {   // leaves on the wind, so you can see which way it blows
    stoParts.push({ screen: true, x: stoWind.dir > 0 ? -8 : STO_W + 8, y: 120 + Math.random() * 360,
      vx: stoWind.dir * (stoClock < stoWind.warnUntil ? 160 : 320) * (0.7 + Math.random() * 0.6), vy: (Math.random() - 0.5) * 40,
      grav: 0, life: 1.6, max: 1.6, size: 5, color: Math.random() < 0.5 ? '#6FA046' : '#E2A63B', shape: 'rect', rot: Math.random() * 6, spin: 8 });
  }
  if (stoClock >= stoWind.until) {
    stoWind = null;
    stoNextWind = stoClock + (STO_WIND_GAP[0] + Math.random() * (STO_WIND_GAP[1] - STO_WIND_GAP[0])) * 1000;
  }
}

// High scores (higher is better)
function stoQualifies(s) { return stoScores.length < STO_TOP_N || s > stoScores[stoScores.length - 1].score; }
function stoSubmit(name, score, floors) {
  const entry = { name, score, floors };
  stoScores.push(entry);
  stoScores.sort((a, b) => b.score - a.score);
  stoScores = stoScores.slice(0, STO_TOP_N);
  stoLastEntry = stoScores.indexOf(entry);
}

// Particles
function stoDust(x, y, w) {
  for (let k = 0; k < 8; k++) {
    const s = k % 2 ? -1 : 1;
    stoParts.push({ x: x + s * w / 2 * (0.5 + Math.random() * 0.5), y, vx: s * (40 + Math.random() * 80), vy: -20 - Math.random() * 40,
      grav: 120, life: 0.45 + Math.random() * 0.2, max: 0.65, size: 3 + Math.random() * 3, color: '#F3E3C0', shape: 'dot' });
  }
}
function stoSparkle(x, y, color) {
  for (let k = 0; k < 12; k++) {
    const an = k / 12 * Math.PI * 2, sp = 90 + Math.random() * 60;
    stoParts.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, grav: 0, life: 0.5, max: 0.5, size: 4, color, shape: 'star', rot: 0, spin: 6 });
  }
}
function stoConfetti() {
  for (let k = 0; k < 40; k++) {
    stoParts.push({ screen: true, x: Math.random() * STO_W, y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120,
      grav: 90, life: 1.8, max: 1.8, size: 5, color: STO_CONFETTI[k % STO_CONFETTI.length], shape: 'rect', rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Drawing helpers
// ═══════════════════════════════════════════════════════════════════════════
function stoHexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function stoClamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function stoSkyAt(level) {
  const s = STO_SKY;
  if (level <= s[0][0]) return `rgb(${s[0][1].join(',')})`;
  for (let i = 1; i < s.length; i++) {
    if (level <= s[i][0]) {
      const t = (level - s[i - 1][0]) / (s[i][0] - s[i - 1][0]), A = s[i - 1][1], B = s[i][1];
      return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
    }
  }
  return `rgb(${s[s.length - 1][1].join(',')})`;
}
function stoRR(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function stoCircle(g, x, y, r, fill, outline) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill; g.fill();
  if (outline) { g.strokeStyle = STO_LINE; g.lineWidth = 2; g.stroke(); }
}
function stoEllipse(g, x, y, rx, ry, rot, fill, stroke, lw = 2) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function stoLine(g, x1, y1, x2, y2, color, lw) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = lw; g.stroke();
}
function stoPoly(g, pts, fill, stroke) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
}
// Bold text with a dark ink outline: readable over any sky colour
function stoText(g, str, x, y, size, color, align = 'center', outline = true) {
  g.font = `bold ${size}px monospace`; g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.22); g.strokeStyle = STO_INK; g.strokeText(str, x, y); }
  g.fillStyle = color; g.fillText(str, x, y);
  g.textBaseline = 'alphabetic';
}
function stoDrawButton(r, label, size = 22, color = STO_YELLOW) {
  const g = stoCtx;
  stoRR(g, r.x, r.y, r.w, r.h, 10);
  g.fillStyle = STO_INK; g.fill();
  g.strokeStyle = color; g.lineWidth = 3; g.stroke();
  stoText(g, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, color, 'center', false);
}
function stoStar(g, x, y, r, rot) {
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const an = rot + k * Math.PI / 4, rr = k % 2 ? r * 0.4 : r;
    g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
  }
  g.closePath(); g.fill();
}
function stoPaw(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath(); g.ellipse(x, y + 3 * s, 5.5 * s, 4.6 * s, 0, 0, Math.PI * 2); g.fill();
  [[-6, -3], [-2.2, -6.6], [2.2, -6.6], [6, -3]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, 2.3 * s, 0, Math.PI * 2); g.fill(); });
}

// ── Animal art. Each animal: a chunky body shape, ONE soft shade band (a nod to the
// suite's gouache), a soft ink outline, one or two bold signature features, and the
// same two-dot eyes. Drawn centred on (0,0); the caller translates/rotates.
function stoBodyPath(g, kind, w, h) {
  if (kind === 'octopus') {            // dome head; 3 round legs along the bottom, the 2 end legs curl up and out
    const sw = w / 5, base = h / 2 - 8, L = -w / 2, R = w / 2;
    g.beginPath(); g.moveTo(L, base - 4); g.lineTo(L, -h / 2 + 24);
    g.bezierCurveTo(L, -h / 2 - 4, R, -h / 2 - 4, R, -h / 2 + 24);   // big round head
    g.lineTo(R, base - 4);
    // right end leg: flares out, tip curls up, underside sweeps back in
    g.quadraticCurveTo(R + 2, base + 1, R + 8, base - 5);
    g.quadraticCurveTo(R + 12, base - 4, R + 9, base + 2);
    g.bezierCurveTo(R + 4, base + 9, R - sw * 0.6, base + 9, R - sw, base);
    for (let k = 1; k < 4; k++) g.arc(R - sw * (k + 0.5), base, sw / 2, 0, Math.PI, false);
    // left end leg (mirror)
    g.bezierCurveTo(L + sw * 0.6, base + 9, L - 4, base + 9, L - 9, base + 2);
    g.quadraticCurveTo(L - 12, base - 4, L - 8, base - 5);
    g.quadraticCurveTo(L - 2, base + 1, L, base - 4);
    g.closePath(); return;
  }
  if (kind === 'stingray') {           // flat diamond
    g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2 + 32, -h / 2); g.lineTo(w / 2 - 32, -h / 2);
    g.lineTo(w / 2, 0); g.lineTo(w / 2 - 32, h / 2); g.lineTo(-w / 2 + 32, h / 2); g.closePath(); return;
  }
  const r = { bee: h / 2 - 2, fish: h / 2, orca: h / 2, mouse: 15, mongoose: 16 }[kind] || 16;
  stoRR(g, -w / 2, -h / 2, w, h, r);
}

const STO_DRAW = {
  mouse: {
    eyes: [[-8, -4], [8, -4]],
    back(g, a, w, h) {
      g.strokeStyle = '#D98F8F'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(w / 2 - 6, 8); g.bezierCurveTo(w / 2 + 12, 12, w / 2 + 18, -6, w / 2 + 8, -14); g.stroke();
      for (const s of [-1, 1]) { stoCircle(g, s * 14, -h / 2 + 1, 11.5, a.body, true); stoCircle(g, s * 14, -h / 2 + 1, 6.5, '#F2A7A7'); }
    },
    front(g) {
      stoCircle(g, 0, 6, 3.8, '#E57F8F');
      for (const s of [-1, 1]) { stoLine(g, s * 5, 7, s * 20, 4, STO_LINE, 1.3); stoLine(g, s * 5, 9, s * 20, 12, STO_LINE, 1.3); }
    },
  },
  bee: {
    eyes: [[-17, -3], [-8, -3]],
    back(g, a, w, h) {
      stoEllipse(g, -1, -h / 2 - 6, 8, 12, -0.5, 'rgba(236,248,255,0.92)', 'rgba(60,90,110,0.6)', 1.5);
      stoEllipse(g, 11, -h / 2 - 6, 8, 12, 0.5, 'rgba(236,248,255,0.92)', 'rgba(60,90,110,0.6)', 1.5);
      stoLine(g, -17, -h / 2 + 6, -22, -h / 2 - 7, STO_INK, 2); stoCircle(g, -22, -h / 2 - 7, 2.6, STO_INK);
      stoLine(g, -10, -h / 2 + 4, -11, -h / 2 - 9, STO_INK, 2); stoCircle(g, -11, -h / 2 - 9, 2.6, STO_INK);
      stoPoly(g, [[w / 2 - 3, -4], [w / 2 + 8, 0], [w / 2 - 3, 4]], STO_INK);
    },
    clip(g, a, w, h) { g.fillStyle = '#3A2410'; g.fillRect(-1, -h, 8, 2 * h); g.fillRect(13, -h, 7, 2 * h); },
    front(g) { g.beginPath(); g.arc(-12, 5, 4, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = STO_INK; g.lineWidth = 1.6; g.stroke(); },
  },
  mongoose: {
    eyes: [[-24, -6], [-15, -6]],
    back(g, a, w, h) {
      for (let k = 6; k >= 0; k--) {     // ringed tail curling up off the back
        const t = k / 6;
        stoCircle(g, w / 2 - 8 + t * 26, 6 - t * t * 24, 8.5 - t * 3.5, k % 2 ? '#4A3218' : a.body, true);
      }
      stoCircle(g, -w / 2 + 20, -h / 2 + 2, 6, a.body, true);
    },
    front(g, a, w) {
      stoPoly(g, [[-w / 2 + 6, -11], [-w / 2 - 12, 1], [-w / 2 + 6, 11]], a.body, STO_LINE);
      g.fillStyle = a.body; g.fillRect(-w / 2 + 2, -9, 6, 18);
      stoCircle(g, -w / 2 - 11, 1, 3.6, STO_INK);
    },
  },
  eagle: {
    eyes: [[-27, -11], [-18, -11]],
    clip(g, a, w, h) {
      stoEllipse(g, 12, 4, 25, 15, -0.12, '#57361A');                     // folded wing
      g.strokeStyle = '#3E250F'; g.lineWidth = 2;
      [[2, 12], [12, 14], [22, 12]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, Math.PI); g.stroke(); });
      stoCircle(g, -w / 2 + 14, -h / 2 + 12, 22, '#F5EEDC');               // white head
    },
    front(g, a, w) {
      g.beginPath(); g.moveTo(-w / 2 + 4, -15); g.quadraticCurveTo(-w / 2 - 12, -16, -w / 2 - 13, -3);  // hooked beak
      g.quadraticCurveTo(-w / 2 - 8, -7, -w / 2 - 4, -6); g.lineTo(-w / 2 + 4, -5); g.closePath();
      g.fillStyle = '#F6B93B'; g.fill(); g.strokeStyle = '#9A6312'; g.lineWidth = 1.6; g.stroke();
      stoLine(g, -w / 2 + 7, -19, -w / 2 + 25, -15, STO_INK, 2.6);      // fierce brow
    },
  },
  leopard: {
    eyes: [[-32, -7], [-21, -7]],
    back(g, a, w, h) {
      g.beginPath(); g.moveTo(w / 2 - 6, 4); g.bezierCurveTo(w / 2 + 16, 6, w / 2 + 18, -16, w / 2 + 8, -20);
      g.strokeStyle = STO_LINE; g.lineWidth = 9; g.stroke(); g.strokeStyle = a.body; g.lineWidth = 6; g.stroke();
      stoCircle(g, w / 2 + 8, -20, 4.5, '#4A2A0C');
      stoCircle(g, -w / 2 + 14, -h / 2 + 1, 7, a.body, true); stoCircle(g, -w / 2 + 30, -h / 2 + 1, 7, a.body, true);
    },
    clip(g) {
      [[-4, -12], [12, -3], [28, -13], [4, 9], [22, 10], [36, 0], [-14, 3], [42, -15]].forEach(([x, y]) => {
        stoCircle(g, x, y, 5, '#4A2A0C'); stoCircle(g, x + 0.5, y + 0.5, 2.2, '#C98A22');
      });
    },
    front(g, a, w) {
      stoEllipse(g, -w / 2 + 17, 7, 11, 7, 0, '#F7DDA0');
      stoEllipse(g, -w / 2 + 13, 3, 3.6, 2.6, 0, '#3A2208');
    },
  },
  bear: {
    eyes: [[-15, -9], [15, -9]], eyeR: 3.8,
    back(g, a, w, h) { for (const s of [-1, 1]) { stoCircle(g, s * 30, -h / 2 + 3, 13, a.body, true); stoCircle(g, s * 30, -h / 2 + 3, 7, '#C48B54'); } },
    front(g) {
      stoEllipse(g, 0, 9, 20, 13, 0, '#C9955E');
      stoEllipse(g, 0, 3, 7, 5, 0, STO_INK);
      stoLine(g, 0, 7, 0, 13, STO_INK, 1.6);
    },
  },
  elephant: {
    eyes: [[-44, -12], [-34, -12]],
    back(g, a, w) { stoLine(g, w / 2 - 4, 0, w / 2 + 8, 14, STO_INK, 2.5); stoCircle(g, w / 2 + 9, 16, 3.5, STO_INK); },
    front(g, a, w) {
      stoEllipse(g, 2, -1, 22, 24, 0, '#9C8565', STO_LINE);                      // big ear flap
      stoEllipse(g, 4, 0, 13, 15, 0, 'rgba(217,169,160,0.55)');
      g.beginPath(); g.moveTo(-w / 2 + 12, 14); g.quadraticCurveTo(-w / 2 + 2, 22, -w / 2 - 4, 17);
      g.strokeStyle = '#FFF6E0'; g.lineWidth = 4; g.stroke();                     // tusk
      g.beginPath(); g.moveTo(-w / 2 + 12, -6); g.quadraticCurveTo(-w / 2 - 12, -4, -w / 2 - 12, 14);
      g.quadraticCurveTo(-w / 2 - 12, 24, -w / 2 - 3, 22);                         // trunk
      g.strokeStyle = STO_LINE; g.lineWidth = 15; g.stroke(); g.strokeStyle = a.body; g.lineWidth = 12; g.stroke();
      [[-w / 2 - 10, 2], [-w / 2 - 12, 9], [-w / 2 - 11, 16]].forEach(([x, y]) => stoLine(g, x - 4, y, x + 4, y, 'rgba(43,26,10,0.35)', 1.3));
    },
  },
  fish: {
    eyes: [[-19, -5], [-11, -5]],
    back(g, a, w, h) {
      stoPoly(g, [[w / 2 - 6, 0], [w / 2 + 14, -14], [w / 2 + 10, 0], [w / 2 + 14, 14]], a.shade, STO_LINE);
      stoPoly(g, [[-6, -h / 2 + 3], [4, -h / 2 - 9], [14, -h / 2 + 3]], a.shade, STO_LINE);
    },
    clip(g, a, w, h) { g.fillStyle = '#B7F5EC'; g.fillRect(2, -h, 8, 2 * h); },
    front(g, a, w) { stoCircle(g, -w / 2 + 4, 5, 2.2, STO_INK); },
  },
  octopus: {
    eyes: [[-10, -6], [10, -6]], eyeR: 4.2,
    // No tail, no side arms: just the row of legs along the bottom, with the two
    // end legs curling up and out (the curl is in stoBodyPath).
    front(g, a, w, h) {
      const sw = w / 5;
      for (let k = 0; k < 5; k++) stoCircle(g, w / 2 - sw * (k + 0.5), h / 2 - 4, 2.6, '#F7B9AE');
      stoEllipse(g, -14, -h / 2 + 10, 8, 4, -0.2, 'rgba(255,255,255,0.28)');
    },
  },
  seal: {
    eyes: [[-31, -10], [-19, -10]], eyeR: 4.3,
    back(g, a, w) { stoPoly(g, [[w / 2 - 8, 2], [w / 2 + 14, -10], [w / 2 + 8, 4], [w / 2 + 14, 16]], a.shade, STO_LINE); },
    front(g, a, w) {
      stoEllipse(g, 6, 13, 13, 6, 0.45, a.shade);                                     // flipper
      stoCircle(g, -w / 2 + 12, 5, 7, '#B9D0D1'); stoCircle(g, -w / 2 + 21, 5, 7, '#B9D0D1');
      stoEllipse(g, -w / 2 + 16, 0, 4.5, 3.2, 0, STO_INK);
      for (let k = 0; k < 3; k++) {                                                   // whiskers
        stoLine(g, -w / 2 + 9, 3 + k * 3, -w / 2 - 10, -3 + k * 7, STO_INK, 1.3);
        stoLine(g, -w / 2 + 24, 3 + k * 3, -w / 2 + 38, 0 + k * 6, STO_INK, 1.3);
      }
    },
  },
  stingray: {
    eyes: [[-8, -6], [8, -6]], eyeR: 3.4,
    back(g, a, w) {
      g.beginPath(); g.moveTo(w / 2 - 6, 0); g.quadraticCurveTo(w / 2 + 20, 6, w / 2 + 38, 0);
      g.strokeStyle = STO_INK; g.lineWidth = 3; g.stroke();
      stoPoly(g, [[w / 2 + 20, 1], [w / 2 + 28, -4], [w / 2 + 26, 5]], STO_INK);
    },
    clip(g) { [[22, -6], [32, 4], [-28, 3], [14, 8], [-18, 8], [0, 10]].forEach(([x, y]) => stoCircle(g, x, y, 3, '#7FD1CF')); },
    front(g) { g.beginPath(); g.arc(0, 2, 5, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = STO_INK; g.lineWidth = 1.6; g.stroke(); },
  },
  polarbear: {
    eyes: [[-14, -9], [14, -9]], eyeR: 3.8,
    back(g, a, w, h) { for (const s of [-1, 1]) { stoCircle(g, s * 28, -h / 2 + 4, 9, a.body, true); stoCircle(g, s * 28, -h / 2 + 4, 4.5, '#D5E6E4'); } },
    front(g) {
      stoEllipse(g, 0, 9, 19, 12, 0, '#E1ECEB', 'rgba(43,26,10,0.25)', 1.5);
      stoEllipse(g, 0, 4, 6.5, 4.5, 0, '#1B1209');
      stoLine(g, 0, 8, 0, 13, '#1B1209', 1.5);
    },
  },
  orca: {
    eyes: [[-46, -6], [-37, -6]], eyeCol: '#F4F7F7',
    back(g, a, w, h) {
      g.beginPath(); g.moveTo(-2, -h / 2 + 4); g.quadraticCurveTo(6, -h / 2 - 10, 12, -h / 2 - 24);   // dorsal fin
      g.quadraticCurveTo(16, -h / 2 - 6, 28, -h / 2 + 4); g.closePath();
      g.fillStyle = a.body; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.stroke();
      stoPoly(g, [[w / 2 - 8, 0], [w / 2 + 14, -13], [w / 2 + 8, 0], [w / 2 + 14, 13]], a.body);
    },
    clip(g, a, w, h) {
      stoEllipse(g, -16, h / 2 - 1, 40, 14, 0, '#F4F7F7');                  // white belly
      stoEllipse(g, -w / 2 + 40, -9, 11, 5.5, -0.15, '#F4F7F7');            // eye patch
    },
  },
};

function stoDrawAnimal(g, kind, o = {}) {
  const a = STO_ANIMALS[kind], w = a.w, h = a.h, D = STO_DRAW[kind];
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (D.back) D.back(g, a, w, h);
  stoBodyPath(g, kind, w, h);
  g.fillStyle = a.body; g.fill();
  g.save();
  stoBodyPath(g, kind, w, h); g.clip();
  g.globalAlpha = 0.55; g.fillStyle = a.shade; g.fillRect(-w / 2 - 4, h * 0.18, w + 8, h); g.globalAlpha = 1;   // shade band
  if (D.clip) D.clip(g, a, w, h);
  g.restore();
  stoBodyPath(g, kind, w, h); g.strokeStyle = STO_LINE; g.lineWidth = 2; g.stroke();
  if (D.front) D.front(g, a, w, h);
  // the same two-dot eyes on everyone (they blink now and then, and go wide when nervous)
  const er = (D.eyeR || 3.3) * (o.nervous ? 1.3 : 1), ec = D.eyeCol || '#1B1209';
  const blink = !o.nervous && o.seed !== undefined && ((stoClock + o.seed) % 3600) < 110;
  for (const [x, y] of D.eyes) {
    if (blink) { stoLine(g, x - er, y, x + er, y, ec, 2); continue; }
    if (o.nervous) stoCircle(g, x, y, er + 1.6, '#FFFFFF');
    stoCircle(g, x, y, er, ec);
    stoCircle(g, x - er * 0.35, y - er * 0.35, Math.max(0.9, er * 0.3), ec === '#1B1209' ? '#FFFFFF' : '#1B1209');
  }
  if (o.nervous) {   // sweat drop
    g.beginPath(); g.moveTo(w / 2 - 8, -h / 2 - 10); g.quadraticCurveTo(w / 2 - 2, -h / 2 - 2, w / 2 - 8, -h / 2);
    g.quadraticCurveTo(w / 2 - 14, -h / 2 - 2, w / 2 - 8, -h / 2 - 10); g.fillStyle = '#9ADCF0'; g.fill();
  }
  if (o.alpha) {     // ALPHA: golden rim + twinkles
    stoBodyPath(g, kind, w, h); g.strokeStyle = STO_GOLD; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#FFF4C2';
    for (let k = 0; k < 3; k++) {
      const t = stoClock / 1000 * 2 + k * 2.1, s = Math.max(0, Math.sin(t)) * 5;
      if (s > 0.5) stoStar(g, Math.cos(k * 2.4) * (w / 2 + 4), Math.sin(k * 1.7) * (h / 2 + 2) - 4, s, t);
    }
  }
  g.restore();
}

function stoDrawRock(g, x, cy) {
  const w = STO_ROCK.w, h = STO_ROCK.h;
  g.save(); g.translate(x, cy); g.lineJoin = 'round';
  const path = () => {
    g.beginPath(); g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2 + 4, -h / 2 + 12); g.quadraticCurveTo(-w / 2 + 8, -h / 2, -w / 2 + 24, -h / 2);
    g.lineTo(w / 2 - 22, -h / 2); g.quadraticCurveTo(w / 2 - 6, -h / 2 + 1, w / 2 - 3, -h / 2 + 14); g.lineTo(w / 2, h / 2); g.closePath();
  };
  path(); g.fillStyle = '#8E7E6E'; g.fill();
  g.save(); path(); g.clip(); g.globalAlpha = 0.6; g.fillStyle = '#6C5E51'; g.fillRect(-w / 2, 4, w, h); g.restore();
  stoLine(g, -w / 2 + 24, -h / 2 + 3, w / 2 - 22, -h / 2 + 3, '#B3A392', 3);
  stoLine(g, -30, -6, -22, 6, 'rgba(43,26,10,0.35)', 2); stoLine(g, 34, -10, 42, 2, 'rgba(43,26,10,0.35)', 2);
  path(); g.strokeStyle = STO_LINE; g.lineWidth = 2; g.stroke();
  g.restore();
}

// ── Scenery in world space (parallax: things further away scroll slower)
function stoAcacia(g, x, y, s, color) {
  g.fillStyle = color;
  g.fillRect(x - 3 * s, y - 40 * s, 6 * s, 40 * s);
  g.beginPath(); g.ellipse(x, y - 44 * s, 34 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x - 14 * s, y - 50 * s, 18 * s, 6 * s, 0, 0, Math.PI * 2); g.fill();
}
function stoDrawScenery(g, night) {
  const camH = stoCamH, t = stoClock / 1000;
  // far hills + acacias (parallax 0.4)
  const hy = -camH * 0.6;
  g.fillStyle = '#D9A85E';
  g.beginPath(); g.moveTo(-400, hy + 4);
  for (let x = -400; x <= 760; x += 40) g.lineTo(x, hy - 14 - 10 * Math.sin(x * 0.013) - 6 * Math.sin(x * 0.041));
  g.lineTo(760, hy + 4); g.closePath(); g.fill();
  stoAcacia(g, 46, hy - 8, 0.9, '#9B7740'); stoAcacia(g, 318, hy - 4, 0.6, '#A8844A');
  // clouds (parallax 0.5)
  g.globalAlpha = 1 - night * 0.75;
  for (const c of STO_SCENE.clouds) {
    const y = c.y - camH * 0.5;
    const sy = STO_GROUND_Y + (y + camH) * stoZoom;
    if (sy < -60 || sy > STO_H + 60) continue;
    const x = ((c.x + t * c.v) % 520 + 520) % 520 - 80 + stoCamX * 0.5;
    g.fillStyle = '#FFFFFF';
    [[0, 0, 22], [20, 4, 18], [-20, 5, 16], [8, -10, 16]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * c.s, y + dy * c.s, r * c.s, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = 'rgba(160,190,215,0.45)'; g.fillRect(x - 34 * c.s, y + 10 * c.s, 68 * c.s, 6 * c.s);
  }
  g.globalAlpha = 1;
  // birds (parallax 0.75)
  if (night < 0.6) {
    g.strokeStyle = 'rgba(59,42,26,0.65)'; g.lineWidth = 2;
    for (const b of STO_SCENE.birds) {
      const y = b.y - camH * 0.25, x = ((b.x + t * b.v) % 460 + 460) % 460 - 50 + stoCamX * 0.75, f = 3 + 2.5 * Math.sin(t * 9 + b.ph);
      g.beginPath(); g.moveTo(x - 7, y - f); g.quadraticCurveTo(x - 3, y - f, x, y); g.quadraticCurveTo(x + 3, y - f, x + 7, y - f); g.stroke();
    }
  }
  // the ground and the watering hole (parallax 1)
  g.fillStyle = '#B07B37'; g.fillRect(-600, 0, 1560, 1400);
  g.fillStyle = '#9A6A2E'; for (let x = -300; x < 700; x += 53) g.fillRect(x, 22 + (x * 7 % 30), 18, 4);
  g.fillStyle = '#8C9A3C'; g.fillRect(-600, 0, 1560, 5);
  g.strokeStyle = '#7C8A30'; g.lineWidth = 2;
  for (let x = -260; x < 640; x += 37) { g.beginPath(); g.moveTo(x, 1); g.lineTo(x - 3, -7); g.moveTo(x + 2, 1); g.lineTo(x + 4, -9); g.moveTo(x + 4, 1); g.lineTo(x + 9, -6); g.stroke(); }
}
function stoDrawPond(g, x) {
  stoEllipse(g, x, 9, 108, 8, 0, '#4FB3D9');
  stoEllipse(g, x - 26, 7, 40, 2.2, 0, '#9ADCF0');
}

// ═══════════════════════════════════════════════════════════════════════════
// Draw by state
// ═══════════════════════════════════════════════════════════════════════════
function stoDraw() {
  const g = stoCtx;
  g.fillStyle = STO_BG; g.fillRect(0, 0, STO_W, STO_H);
  g.save();
  if (stoShake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  if (stoState === 'attract') stoDrawAttract(g);
  else if (stoState === 'nameEntry') stoDrawNameEntry(g);
  else if (stoState === 'leaderboard') stoDrawLeaderboard(g);
  else {
    const pk = 1 + 0.03 * stoPunch;                // the zoom punch on a landing
    g.save(); g.translate(180, 330); g.scale(pk, pk); g.translate(-180, -330);
    stoDrawWorld(g);
    stoDrawSwing(g);
    g.restore();
    stoDrawMoods(g);
    stoDrawBanner(g);
    stoDrawCallouts(g);
    stoDrawHud(g);
    stoDrawCoach(g);
    if (stoState === 'over') stoDrawOver(g);
  }
  stoDrawParts(g, true);
  g.restore();
  if (stoFlash > 0) { g.fillStyle = `rgba(255,247,214,${(stoFlash * 0.5).toFixed(3)})`; g.fillRect(0, 0, STO_W, STO_H); }
}

// FEEDING FRENZY's golden edges, and HIGH WINDS' arrows on the side the gust comes from.
function stoDrawMoods(g) {
  if (stoFrenzy && stoState === 'playing') {
    const p = 0.5 + 0.5 * Math.sin(stoClock / 90);
    g.lineWidth = 8 + 5 * p; g.strokeStyle = `rgba(255,213,74,${(0.35 + 0.3 * p).toFixed(3)})`;
    g.strokeRect(0, 108, STO_W, STO_H - 108);
  }
  if (stoWind && stoState === 'playing') {
    const warn = stoClock < stoWind.warnUntil, d = stoWind.dir, x0 = d > 0 ? 24 : STO_W - 24;
    g.globalAlpha = warn ? 0.55 + 0.45 * Math.sin(stoClock / 70) : 0.75;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < 3; k++) {
      const x = x0 + d * k * 18, s = ((stoClock / 240) % 1) * d * 6;
      [[STO_INK, 8], [STO_CREAM, 4]].forEach(([col, w]) => {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(x - d * 7 + s, 196); g.lineTo(x + d * 6 + s, 210); g.lineTo(x - d * 7 + s, 224); g.stroke();
      });
    }
    g.lineCap = 'butt';
    stoText(g, warn ? 'WIND!' : 'WIND', x0 + d * 18, 242, 13, STO_CREAM);
    g.globalAlpha = 1;
  }
}

// The coach box: low on the screen, over the savanna floor, below the swing.
function stoDrawCoach(g) {
  if (!stoCoach || stoState !== 'playing') return;
  g.font = 'bold 12px monospace';
  const words = stoCoach.text.split(' '), lines = [];
  let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 296 && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line);
  const h = lines.length * 17 + 16, y = STO_H - h - 12;
  g.globalAlpha = stoClamp((stoCoach.until - stoClock) / 400, 0, 1);
  stoRR(g, 18, y, 324, h, 12); g.fillStyle = 'rgba(253,243,220,0.96)'; g.fill();
  g.strokeStyle = STO_OCHRE; g.lineWidth = 2.5; g.stroke();
  lines.forEach((l, i) => stoText(g, l, 180, y + 16 + i * 17, 12, STO_INK, 'center', false));
  g.globalAlpha = 1;
}

function stoLevelAtScreenY(y) { return (stoCamH + (STO_GROUND_Y - y) / stoZoom) / STO_FLOOR_PX; }

function stoDrawWorld(g) {
  // sky gradient that tells the height story
  const grd = g.createLinearGradient(0, STO_H, 0, 0);
  for (let k = 0; k <= 4; k++) grd.addColorStop(k / 4, stoSkyAt(stoLevelAtScreenY(STO_H * (1 - k / 4))));
  g.fillStyle = grd; g.fillRect(0, 0, STO_W, STO_H);
  const night = stoClamp((stoLevelAtScreenY(0) - 40) / 12, 0, 1);
  if (night > 0) {
    g.fillStyle = '#FFFFFF';
    for (const s of STO_SCENE.stars) {
      g.globalAlpha = night * s.a * (0.6 + 0.4 * Math.sin(stoClock / 1000 * s.tw + s.ph));
      g.fillRect(s.x, (s.y + stoCamH * 0.04) % STO_H, s.s, s.s);
    }
    g.globalAlpha = 1;
  }

  g.save();
  g.translate(180, STO_GROUND_Y); g.scale(stoZoom, stoZoom); g.translate(-180 - stoCamX, stoCamH);
  stoDrawScenery(g, night);
  stoDrawTower(g);
  stoDrawPond(g, stoTower.length ? stoTower[0].x : 180);
  const drawBody = (b, fade) => {
    g.save(); g.globalAlpha = fade; g.translate(b.x, b.y); g.rotate(b.rot);
    stoDrawAnimal(g, b.kind, { alpha: b.alpha }); g.restore();
  };
  for (const d of stoDebris) drawBody(d, 1);
  for (const t of stoTumblers) drawBody(t, Math.min(1, t.life / 0.5));
  if (stoFall) drawBody(stoFall, 1);
  stoDrawParts(g, false);
  for (const r of stoRings) {   // landing shockwaves
    const k = r.age / r.life;
    g.globalAlpha = (1 - k) * 0.8;
    stoEllipse(g, r.x, r.y, r.w * (0.6 + k * 0.9), 6 + k * 10, 0, null, r.gold ? STO_GOLD : STO_CREAM, 4 * (1 - k) + 1);
  }
  g.globalAlpha = 1;
  for (const b of stoBubbles) {  // what the animal had to say
    const s = Math.min(1, b.age / 0.1);
    g.save(); g.translate(b.x, b.y - b.age * 14); g.scale(s, s);
    g.globalAlpha = stoClamp((1 - b.age) / 0.3, 0, 1);
    g.font = 'bold 12px monospace';
    const w = g.measureText(b.text).width + 14;
    stoRR(g, -w / 2, -11, w, 22, 10); g.fillStyle = '#FFFFFF'; g.fill(); g.strokeStyle = STO_INK; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(-w / 2 + 8, 10); g.lineTo(-w / 2 + 2, 18); g.lineTo(-w / 2 + 14, 10); g.fillStyle = '#FFFFFF'; g.fill();
    stoText(g, b.text, 0, 1, 12, STO_INK, 'center', false);
    g.restore();
  }
  g.globalAlpha = 1;
  for (const p of stoPopups) {
    g.globalAlpha = 1 - p.age / 0.9;
    stoText(g, p.text, p.x, p.y - p.age * 40, 15, STO_YELLOW);
  }
  g.globalAlpha = 1;
  g.restore();
}

function stoDrawTower(g) {
  const n = stoTower.length, c = stoCollapse;
  if (!n) return;
  stoDrawRock(g, stoTower[0].x, stoTower[0].cy);
  if (c && c.broken) return;
  const tilt = stoTiltAngle(), cos = c ? Math.cos(c.ang) : 1, sin = c ? Math.sin(c.ang) : 0;
  for (let i = 1; i < n; i++) {
    const f = stoTower[i];
    const sy = STO_GROUND_Y + (f.cy + stoCamH) * stoZoom;
    if (sy < -120 || sy > STO_H + 120) continue;          // off screen
    g.save();
    if (c) {   // rigid topple around the base edge
      const p = c.pos[i], rx = p.x - c.pivotX, ry = p.y - c.pivotY;
      g.translate(c.pivotX + rx * cos - ry * sin, c.pivotY + rx * sin + ry * cos);
      g.rotate(p.rot + c.ang);
    } else {
      let x = stoFloorX(i, n);
      if (f.nervous > 0) x += Math.sin(stoClock * 0.09 + i) * 2.4 * f.nervous;    // shiver
      const sq = f.age < 0.18 ? (1 - f.age / 0.18) * 0.14 : 0;                     // landing squash
      g.translate(x, f.cy + f.h / 2);
      g.rotate(stoSpan(i, n) > 0 ? tilt : 0);
      g.scale(1 + sq, 1 - sq);
      g.translate(0, -f.h / 2);
    }
    stoDrawAnimal(g, f.kind, { alpha: f.alpha, nervous: f.nervous > 0, seed: f.seed });
    g.restore();
  }
}

function stoDrawSwing(g) {
  if (stoState !== 'playing') return;
  const kind = stoSwing ? stoSwing.kind : null;
  const p = stoSwingPos(kind || 'mouse');
  // the vine (always swinging, even while empty)
  g.save(); g.lineCap = 'round';
  g.beginPath(); g.moveTo(180, p.pivotY); g.quadraticCurveTo((180 + p.endX) / 2 + 6, (p.pivotY + p.endY) / 2, p.endX, p.endY);
  g.strokeStyle = stoFrenzy ? '#8A6A12' : '#2F5E28'; g.lineWidth = 6; g.stroke();
  g.strokeStyle = stoFrenzy ? STO_GOLD : '#4C8A3F'; g.lineWidth = 3.5; g.stroke();   // a FEEDING FRENZY turns the vine gold
  for (const t of [0.62, 0.74, 0.86]) {
    const x = 180 + (p.endX - 180) * t, y = p.pivotY + (p.endY - p.pivotY) * t;
    if (y < 0) continue;
    stoEllipse(g, x + 6, y, 7, 3.5, 0.6, '#5FA046');
    stoEllipse(g, x - 6, y + 8, 7, 3.5, -0.6, '#5FA046');
  }
  stoCircle(g, p.endX, p.endY, 4, '#2F5E28');
  g.restore();
  if (!stoSwing) return;
  const e = stoSwing.enter, pop = e < 1 ? 0.3 + 0.7 * e + Math.sin(e * Math.PI) * 0.25 : 1;
  g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(pop, pop);
  stoDrawAnimal(g, stoSwing.kind, { alpha: stoSwing.alpha, seed: 777 });
  g.restore();
  if (stoDrops === 0) {   // the only instruction a kid needs
    g.globalAlpha = 0.75 + 0.25 * Math.sin(stoClock / 180);
    stoText(g, 'TAP TO DROP', 180, 252, 24, STO_CREAM);
    g.globalAlpha = 1;
  }
}

function stoDrawHud(g) {
  g.fillStyle = 'rgba(20,14,7,0.55)'; g.fillRect(0, 0, STO_W, 106);
  g.fillStyle = 'rgba(226,166,59,0.55)'; g.fillRect(0, 106, STO_W, 2);
  stoText(g, `${stoScore} PTS`, 16, 34, 18, STO_CREAM, 'left', false);
  stoText(g, `FLOOR ${stoFloors()}`, 180, 34, 18, STO_YELLOW, 'center', false);
  if (stoFrenzy) stoText(g, 'FRENZY ×2', 180, 54, 11, STO_GOLD, 'center', false);
  for (let k = 0; k < STO_LIVES; k++) {
    const alive = k < stoPaws, lostNow = k === stoPaws && stoClock - stoPawLostAt < 500;
    const s = lostNow ? 1.1 + 0.5 * (1 - (stoClock - stoPawLostAt) / 500) : 1.1;
    stoPaw(g, 274 + k * 28, 32, s, alive ? STO_OCHRE : lostNow ? STO_RED : 'rgba(168,162,158,0.35)');
  }
  // lean meter: a spirit level, green → yellow → red
  const m = { x: 16, y: 70, w: 128, h: 20 }, L = stoClamp(stoLeanVis, -1, 1), aL = Math.abs(L);
  stoRR(g, m.x, m.y, m.w, m.h, 10); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
  g.save(); stoRR(g, m.x, m.y, m.w, m.h, 10); g.clip();
  g.fillStyle = 'rgba(248,113,113,0.35)'; g.fillRect(m.x, m.y, m.w * 0.125, m.h); g.fillRect(m.x + m.w * 0.875, m.y, m.w * 0.125, m.h);
  g.restore();
  stoRR(g, m.x, m.y, m.w, m.h, 10); g.strokeStyle = STO_CREAM; g.lineWidth = 2; g.stroke();
  stoLine(g, m.x + m.w / 2, m.y + 3, m.x + m.w / 2, m.y + m.h - 3, 'rgba(253,243,220,0.6)', 2);
  const col = aL < 0.45 ? STO_GREEN : aL < 0.75 ? STO_YELLOW : STO_RED;
  const br = aL > 0.75 ? 7 + Math.sin(stoClock / 70) * 1.5 : 7;
  stoCircle(g, m.x + m.w / 2 + L * (m.w / 2 - 10), m.y + m.h / 2, br, col);
  stoText(g, 'LEAN', m.x + m.w + 8, m.y + m.h / 2 + 1, 11, aL > 0.75 ? STO_RED : STO_GREY, 'left', false);
  // NEXT preview
  if (stoNext) {
    const b = { x: 262, y: 62, w: 84, h: 38 };
    stoText(g, 'NEXT', b.x - 6, b.y + b.h / 2 + 1, 11, STO_GREY, 'right', false);
    stoRR(g, b.x, b.y, b.w, b.h, 10); g.fillStyle = 'rgba(253,243,220,0.12)'; g.fill();
    g.strokeStyle = stoNext.alpha ? STO_GOLD : STO_CREAM; g.lineWidth = 2; g.stroke();
    const a = STO_ANIMALS[stoNext.kind], s = Math.min(62 / (a.w + 22), 30 / (a.h + 12));
    g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2 + 2); g.scale(s, s);
    stoDrawAnimal(g, stoNext.kind, { alpha: stoNext.alpha });
    g.restore();
    const cur = stoSwing ? stoSwing.kind : stoFall ? stoFall.kind : null;
    if (cur && stoBeats(stoNext.kind, cur)) {   // a little ▲ when NEXT can climb onto what's coming down now
      stoPoly(g, [[b.x + b.w - 4, b.y - 6], [b.x + b.w + 4, b.y + 6], [b.x + b.w - 12, b.y + 6]], STO_OCHRE, STO_INK);
    }
  }
}

function stoDrawCallouts(g) {
  for (const c of stoCallouts) {
    const t = c.age, a = t > c.life - 0.3 ? (c.life - t) / 0.3 : 1;
    const pop = t < 0.12 ? 0.6 + 0.4 * (t / 0.12) : t < 0.25 ? 1 + 0.12 * (1 - (t - 0.12) / 0.13) : 1;
    g.save(); g.globalAlpha = stoClamp(a, 0, 1);
    g.translate(180, 290 - c.slot * 48 - t * 18); g.scale(pop, pop);
    stoText(g, c.text, 0, 0, c.size, c.color);
    if (c.sub) stoText(g, c.sub, 0, c.size * 0.5 + 12, 13, STO_CREAM);
    g.restore();
  }
}

function stoDrawBanner(g) {
  if (!stoBanner) return;
  const t = stoBanner.age;
  const off = t < 0.2 ? (1 - t / 0.2) * STO_W : t > 1.55 ? -(t - 1.55) / 0.25 * STO_W : 0;
  g.save(); g.translate(off, 0);
  g.fillStyle = 'rgba(133,77,14,0.92)'; g.fillRect(0, 404, STO_W, 64);
  g.fillStyle = STO_GOLD; g.fillRect(0, 404, STO_W, 3); g.fillRect(0, 465, STO_W, 3);
  stoText(g, stoBanner.text, 180, 428, stoBanner.text.length > 14 ? 22 : 26, STO_CREAM);
  stoText(g, stoBanner.sub, 180, 452, 12, STO_YELLOW, 'center', false);
  g.restore();
}

function stoDrawOver(g) {
  const bf = stoLastFloors < STO_BOTTOM_FEEDER, apex = stoLastFloors >= 50;
  g.fillStyle = 'rgba(20,14,7,0.72)'; g.fillRect(0, 190, STO_W, 176);
  g.fillStyle = STO_OCHRE; g.fillRect(0, 190, STO_W, 2); g.fillRect(0, 364, STO_W, 2);
  if (apex) stoText(g, 'APEX PREDATOR', 180, 214, 16, STO_GOLD);
  stoText(g, bf ? 'BOTTOM FEEDER' : `${stoLastFloors} FLOORS`, 180, 250, bf ? 30 : 38, bf ? STO_TEAL : STO_YELLOW);
  stoText(g, stoOverReason === 'collapse' ? 'THE TOWER TOPPLED!' : 'OUT OF PAW PRINTS!', 180, 292, 14, STO_CREAM);
  stoText(g, bf ? `${stoLastScore} PTS · ${stoLastFloors} FLOOR${stoLastFloors === 1 ? '' : 'S'}` : `${stoLastScore} PTS`, 180, 330, 22, STO_OCHRE);
}

function stoDrawParts(g, screen) {
  for (const p of stoParts) {
    if (!!p.screen !== screen) continue;
    g.globalAlpha = stoClamp(p.life / p.max, 0, 1);
    g.fillStyle = p.color;
    if (p.shape === 'star') stoStar(g, p.x, p.y, p.size, p.rot);
    else if (p.shape === 'rect') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore(); }
    else { g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
}

// ── Attract: a little scene showing the food chain stacked up the right way
const STO_DEMO = ['mouse', 'mongoose', 'leopard', 'bear', 'elephant'];   // each beats the one below
function stoDrawAttract(g) {
  const t = stoClock / 1000, GY = 404, S = 0.62;
  const grd = g.createLinearGradient(0, GY, 0, 0);
  grd.addColorStop(0, '#F4C877'); grd.addColorStop(0.45, '#A9D8EC'); grd.addColorStop(1, '#6FB4E0');
  g.fillStyle = grd; g.fillRect(0, 0, STO_W, GY + 2);
  g.save(); g.translate(180, GY); g.scale(S, S); g.translate(-180, 0);
  const keepH = stoCamH, keepX = stoCamX; stoCamH = 0; stoCamX = 0;
  stoDrawScenery(g, 0);
  stoCamH = keepH; stoCamX = keepX;
  stoDrawRock(g, 180, -STO_ROCK.h / 2);
  let y = -STO_ROCK.h;
  STO_DEMO.forEach((k, i) => {
    const a = STO_ANIMALS[k];
    g.save(); g.translate(180 + Math.sin(t * 2.1 + i * 0.4) * (i + 1) * 1.3, y - a.h / 2); g.rotate(Math.sin(t * 2.1 + i * 0.4) * 0.015 * (i + 1));
    stoDrawAnimal(g, k, { seed: i * 900 });
    g.restore();
    y -= a.h;
  });
  stoDrawPond(g, 180);
  // a Bee swinging in — Bee beats Elephant, so it's about to climb the order
  const xOff = 90 * Math.sin(t * 2 * Math.PI / 2.4), pivY = -1000, L = 610, th = Math.asin(xOff / L);
  const ex = 180 + xOff, ey = pivY + L * Math.cos(th);
  g.beginPath(); g.moveTo(180, pivY); g.lineTo(ex, ey); g.strokeStyle = '#2F5E28'; g.lineWidth = 7; g.stroke();
  g.strokeStyle = '#4C8A3F'; g.lineWidth = 4; g.stroke();
  g.save(); g.translate(ex + Math.sin(th) * 28, ey + Math.cos(th) * 28); g.rotate(-th);
  stoDrawAnimal(g, 'bee', { alpha: true, seed: 300 });
  g.restore();
  g.restore();
  if (stoPreviewing) return;   // the Arcade Floor's preview: the tower and the Bee, none of the words or the button

  stoText(g, STO_TITLE, 180, 72, STO_TITLE.length > 16 ? 26 : 34, STO_YELLOW);
  stoText(g, 'Know the food chain. Become the Apex.', 180, 112, 13, STO_CREAM);
  stoDrawButton(STO_BTN_PLAY, 'ENTER THE WILD', 22, STO_YELLOW);
  stoText(g, 'TAP TO DROP · LAND IT DEAD CENTRE', 180, 538, 12, STO_CREAM);
  stoText(g, 'PREDATOR ON PREY = BONUS', 180, 560, 12, STO_CREAM);
  if (stoScores.length) stoText(g, `TOP OF THE HIERARCHY: ${stoScores[0].name} ${stoScores[0].score}`, 180, 600, 12, STO_YELLOW);
}

// Dark savanna-at-night backdrop for the menus
function stoDrawMenuBackdrop(g) {
  const grd = g.createLinearGradient(0, 0, 0, STO_H);
  grd.addColorStop(0, '#0E1024'); grd.addColorStop(0.7, '#2A1A10'); grd.addColorStop(1, '#3A2412');
  g.fillStyle = grd; g.fillRect(0, 0, STO_W, STO_H);
  g.fillStyle = '#FFFFFF';
  STO_SCENE.stars.forEach((s, i) => { if (s.y < 380) { g.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(stoClock / 1000 * s.tw + s.ph)); g.fillRect(s.x, s.y, s.s, s.s); } });
  g.globalAlpha = 1;
  g.fillStyle = '#1C120A';
  g.beginPath(); g.moveTo(0, STO_H);
  for (let x = 0; x <= STO_W; x += 20) g.lineTo(x, 600 - 10 * Math.sin(x * 0.02) - 5 * Math.sin(x * 0.07));
  g.lineTo(STO_W, STO_H); g.closePath(); g.fill();
  stoAcacia(g, 300, 604, 1, '#1C120A');
}

function stoDrawNameEntry(g) {
  stoDrawMenuBackdrop(g);
  stoText(g, 'YOU MADE', 180, 120, 20, STO_CREAM);
  stoText(g, 'THE HIERARCHY!', 180, 154, 30, STO_YELLOW);
  stoText(g, `${stoLastScore} PTS · ${stoLastFloors} FLOOR${stoLastFloors === 1 ? '' : 'S'}`, 180, 204, 16, STO_OCHRE);
  stoText(g, 'TAP A LETTER TO CHANGE IT', 180, 270, 12, STO_GREY, 'center', false);
  STO_SLOTS.forEach((r, i) => {
    stoRR(g, r.x, r.y, r.w, r.h, 10); g.fillStyle = STO_INK; g.fill();
    g.strokeStyle = STO_OCHRE; g.lineWidth = 3; g.stroke();
    stoText(g, STO_ALPHABET[stoInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, STO_CREAM, 'center', false);
  });
  stoDrawButton(STO_BTN_OK, 'OK', 24, STO_YELLOW);
}

function stoDrawLeaderboard(g) {
  stoDrawMenuBackdrop(g);
  stoText(g, 'THE HIERARCHY', 180, 78, 30, STO_YELLOW);
  stoText(g, 'TOP 5 THIS SESSION', 180, 110, 12, STO_GREY, 'center', false);
  for (let i = 0; i < STO_TOP_N; i++) {
    const y = 140 + i * 64, e = stoScores[i], me = i === stoLastEntry;
    stoRR(g, 24, y, 312, 52, 10);
    g.fillStyle = me ? 'rgba(226,166,59,0.25)' : 'rgba(253,243,220,0.06)'; g.fill();
    if (me) { g.strokeStyle = STO_OCHRE; g.lineWidth = 2; g.stroke(); }
    stoText(g, String(i + 1), 46, y + 27, 20, i === 0 ? STO_GOLD : STO_OCHRE, 'center', false);
    if (e) {
      stoText(g, e.name, 72, y + 27, 22, STO_CREAM, 'left', false);
      stoText(g, `${e.score}`, 318, y + 19, 20, STO_YELLOW, 'right', false);
      stoText(g, `${e.floors} FLOOR${e.floors === 1 ? '' : 'S'}`, 318, y + 38, 10, STO_GREY, 'right', false);
    } else stoText(g, '---', 72, y + 27, 22, STO_DIM, 'left', false);
  }
  stoText(g, `LAST RUN: ${stoLastScore} PTS · ${stoLastFloors} FLOOR${stoLastFloors === 1 ? '' : 'S'}`, 180, 480, 12, STO_GREY, 'center', false);
  stoDrawButton(STO_BTN_LB_AGAIN, 'AGAIN', 22, STO_YELLOW);
  stoDrawButton(STO_BTN_LB_MENU, 'MENU', 20, STO_CREAM);
}

// ═══════════════════════════════════════════════════════════════════════════
// Input
// ═══════════════════════════════════════════════════════════════════════════
function stoToLogical(e) {
  const r = stoCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * STO_W / r.width, y: (e.clientY - r.top) * STO_H / r.height };
}
function stoHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function stoSubmitInitials() {
  STO_SOUND.select();
  stoSubmit(stoInitials.map(i => STO_ALPHABET[i]).join(''), stoLastScore, stoLastFloors);
  stoEnterState('leaderboard');
}

function stoOnDown(p) {
  if (stoState === 'attract') { if (stoHit(STO_BTN_PLAY, p)) { STO_SOUND.select(); stoEnterState('playing'); } return; }
  if (stoState === 'playing') { stoDrop(); return; }     // tap anywhere drops
  if (stoState === 'nameEntry') {
    for (let i = 0; i < STO_SLOTS.length; i++) {
      if (stoHit(STO_SLOTS[i], p)) { stoInitials[i] = (stoInitials[i] + 1) % 26; STO_SOUND.select(); return; }
    }
    if (stoHit(STO_BTN_OK, p)) stoSubmitInitials();
    return;
  }
  if (stoState === 'leaderboard') {
    if (stoHit(STO_BTN_LB_AGAIN, p)) { STO_SOUND.select(); stoEnterState('playing'); return; }
    if (stoHit(STO_BTN_LB_MENU, p))  { STO_SOUND.select(); stoEnterState('attract'); }
  }
  // dying / over: taps ignored so nobody skips the topple by accident
}

function stoStagePointer(e, phase) {
  if (phase === 'down') {
    if (stoPtrId !== null) return;           // second finger ignored
    stoPtrId = e.pointerId;
    stoOnDown(stoToLogical(e));
    return;
  }
  if (e.pointerId !== stoPtrId) return;
  if (phase === 'move') return;              // no drags in this cabinet
  stoPtrId = null; stoPress = null;          // up / cancel
}

(function stoBindInput() {
  const stage = document.getElementById('sto-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); stoStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) stoStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => stoStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => stoStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => stoStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-stacking').style.display !== 'none';
  document.addEventListener('keydown', e => {   // desktop bonus: Space / Enter
    if (!visible() || !stoCanvas) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    if (stoState === 'playing') stoDrop();
    else if (stoState === 'attract' || stoState === 'leaderboard') { STO_SOUND.select(); stoEnterState('playing'); }
    else if (stoState === 'nameEntry') stoSubmitInitials();
  });
  document.getElementById('btn-sto-exit').addEventListener('click', () => { resetArcadeStacking(); arcExitCabinet(); });
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) { if (stoRafHandle) { cancelAnimationFrame(stoRafHandle); stoRafHandle = null; } stoPress = null; stoPtrId = null; }
    else if (!stoRafHandle && stoCtx) { stoLastT = 0; stoRafHandle = requestAnimationFrame(stoLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function stoResize() {
  if (!stoCanvas) return;
  const box = stoCanvas.parentElement;
  const scale = Math.min(box.clientWidth / STO_W, box.clientHeight / STO_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stoCanvas.style.width  = Math.floor(STO_W * scale) + 'px';
  stoCanvas.style.height = Math.floor(STO_H * scale) + 'px';
  stoCanvas.width  = Math.floor(STO_W * scale * dpr);
  stoCanvas.height = Math.floor(STO_H * scale * dpr);
  stoCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function resetArcadeStacking() {
  if (stoRafHandle) { cancelAnimationFrame(stoRafHandle); stoRafHandle = null; }
  stoState = 'attract'; stoPress = null; stoPtrId = null;
  stoEvents = []; stoParts = []; stoShake = 0;
  stoSwing = null; stoFall = null; stoTumblers = []; stoDebris = []; stoCollapse = null;
  stoCallouts = []; stoPopups = []; stoBanner = null;
  stoFreeze = 0; stoFlash = 0; stoPunch = 0; stoRings = []; stoBubbles = []; stoCoach = null; stoCoachQ = [];
  stoWind = null; stoFrenzy = false;
  // stoScores and stoCoachSeen are NOT cleared — session state survives the lobby.
}

// ── The Arcade Floor's preview (SW v259) ─────────────────────────────────────
// js/lobby/arcade.js drives it: begin() borrows the room's canvas, step()/draw()
// run the attract scene with its card off, end() hands everything back — the
// next stoStart() takes its own canvas again. No RAF of its own here.
let stoPreviewing = false;
function stoPreview() {
  return {
    w: STO_W, h: STO_H, fy: 0.45,   // the tower on its rock, the Bee swinging in
    begin(canvas, ctx) {
      resetArcadeStacking(); stoCanvas = canvas; stoCtx = ctx; stoPreviewing = true;
      stoEnterState('attract');
      if (stoRafHandle) { cancelAnimationFrame(stoRafHandle); stoRafHandle = null; }
    },
    step: (dt) => stoUpdate(dt),
    draw: () => stoDraw(),
    end() { resetArcadeStacking(); stoPreviewing = false; stoCanvas = null; stoCtx = null; },
  };
}
// The session board's top score, for the room's HI line — null until someone has played.
function stoBest() { return stoScores.length ? stoScores[0].score.toLocaleString('en-AU') : null; }

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-stacking').style.display !== 'none') stoResize();
});
