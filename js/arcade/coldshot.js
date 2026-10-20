// ═══════════════════════════════════════════════════════════════════════════
// coldshot.js — ARCADE CABINET 08. COLD SHOT: you're the one in the Drink now.
// Bobbing at the bottom of the screen, you lob snowballs at the smug penguins
// on the floe and knock them in. More keep hopping on, wave after wave — let
// the ice get too crowded and it sinks. Set in Cold Shoulder's (`cld`) world:
// the Drowned heckler with a Snowball, turned into the whole game. Procedural
// canvas art in the sticker's inked-watercolour look.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no gameplay
// harness (registration is checked by tools/verify-arcade.js once it lands).
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep),
// arcade.js (arcExitCabinet)
//  - Prefix `csh`. Screen id: screen-arcade-coldshot. DOM: #csh-stage (pointer
//    target, touch-action:none) wrapping #csh-canvas, plus #btn-csh-exit.
//  - Teardown is wired by the ARC_CABINETS entry's `stop` field (js/lobby/arcade.js), NOT by editing
//    engine.js — resetToLobby() iterates the registry and calls every stop().
//  - NO setTimeouts: every delayed effect is scheduled on cshClock via cshEvents.
//  - Own tiny physics (circles with mass, linear friction). It never touches
//    js/lib/physics.js or CldArt — a cabinet can't.
//
// HOW IT PLAYS
//  - Touch where you want to throw (the line points from you at your finger),
//    slide left/right to fine-tune and pull down for power — separate dials,
//    so pulling harder never moves the aim. Let go to throw. There's a short
//    re-pack between throws (let go early and it fires the moment it's packed).
//  - A Snowball shoves the first penguin it hits; shoved penguins slide and
//    skittle into others. Off the edge = into the Drink.
//  - Every plunge from ONE throw climbs the Dip ladder (×1, ×2, ×3…). Throws that
//    keep landing build a streak multiplier (up to ×4).
//  - WAVES every ~18 s, each bringing a new kind of penguin: Sliders (zip about
//    on their bellies), Chonks (heavy), Frosties (in an ice block — crack it
//    first), Jumpies (hop out of the way), Conga lines. Later waves throw in
//    two or three fish at once.
//  - FISH: every penguin rushes the nearest fish (line them up!). Whoever gets
//    it eats it and turns into a Chonk.
//  - SEAGULLS fly over carrying a power-up. Snowball the gull to grab it:
//    DOUBLE (two at once), SPREAD (three in a fan), BLIZZARD (hold to spray, no
//    re-pack), SNOWBOULDER (giant balls that plough through everyone). All timed.
//  - Power is a curve: a quick flick is a slow, soft lob; only a full wind-up
//    throws fast and shoves hard.
//  - ICE LOAD: at 8 penguins the floe creaks; stay full for 3 s and it sinks.
//  - Bergs rise on the rim in later waves: they bounce penguins back, and a
//    Snowball off a Berg is a BANK SHOT.
// ═══════════════════════════════════════════════════════════════════════════
const CSH_W = 360, CSH_H = 640;
const CSH_TITLE = 'COLD SHOT';
const CSH_TOP_N = 5;

// The floe and you (logical px)
const CSH_FX = 180, CSH_FY = 268, CSH_FR = 140;
const CSH_YOU_X = 180, CSH_YOU_Y = 556, CSH_YOU_R = 17;
const CSH_PR = 14, CSH_CHONK_R = 19, CSH_CHICK_R = 11;
const CSH_SLOTS = 24;                     // rim slots for Bergs (15° each)
const CSH_SLOT_A = Math.PI * 2 / CSH_SLOTS;

// Physics (px, seconds)
const CSH_STEP = 1 / 120;
const CSH_DECEL = 260;
const CSH_STOP_V = 16;
const CSH_E_PENG = 0.9, CSH_E_BERG = 0.75;
const CSH_BALL_R = 6, CSH_BOULDER_R = 14;
const CSH_BALL_V0 = 280, CSH_BALL_V1 = 900;     // throw speed, weakest → strongest
const CSH_SHOVE0 = 45, CSH_SHOVE1 = 360;        // shove a 1-mass penguin gets
// Power curve: a quick flick is a lob; only a full wind-up hits hard.
const CSH_POWER_CURVE = 1.6;
function cshPowerK(p) { return Math.pow(Math.max(0, Math.min(1, p)), CSH_POWER_CURVE); }
const CSH_MAX_PULL = 110, CSH_MIN_POWER = 0.12;
const CSH_AIM_SPAN = 180, CSH_AIM_MAX = 1.22;   // aim limit 70° off straight up; a 180 px slide sweeps that far
const CSH_RELOAD = 0.6, CSH_RELOAD_BLIZZ = 0.085;

// The run
const CSH_CAP = 8;
const CSH_SINK_T = 3.0;
const CSH_WAVE_LEN = 18;
const CSH_BASE = { waddler: 100, slider: 150, chonk: 250, frosty: 200, jumpy: 200, chick: 100 };
const CSH_WAVES = [
  { sub: 'WARM-UP WADDLE',     kinds: { waddler: 1 },                                                   gap: 2.7, fish: 1 },
  { sub: 'SLIPPERY CUSTOMERS', kinds: { waddler: 3, slider: 1 },                                        gap: 2.35, fish: 1 },
  { sub: 'CHONK SQUAD',        kinds: { waddler: 3, slider: 1, chonk: 1 },                              gap: 2.1, fish: 1, bergs: 3 },
  { sub: 'BRAIN FREEZE',       kinds: { waddler: 2, slider: 1, chonk: 1, frosty: 2 },                   gap: 1.95, fish: 2 },
  { sub: 'NOPE NOPE NOPE',     kinds: { waddler: 2, slider: 1, chonk: 1, frosty: 1, jumpy: 2 },         gap: 1.8, fish: 2, bergs: 3 },
  { sub: 'CONGA LINE!',        kinds: { waddler: 2, slider: 1, chonk: 1, frosty: 1, jumpy: 1, conga: 1 }, gap: 1.65, fish: 3 },
];
const CSH_WAVE_MORE = ['FISH FRENZY', 'PENGUIN PANDEMONIUM', 'FULL WADDLE', 'ICE ICE MAYHEM', 'THE BIG CHILL', 'HERE COMES EVERYONE'];
const CSH_POWERS = {
  double:   { label: 'DOUBLE TROUBLE!', name: 'DOUBLE',   col: '#FFC94A', time: 8 },
  spread:   { label: 'SPREAD ’EM!',     name: 'SPREAD',   col: '#FF8FB1', time: 8 },
  blizzard: { label: 'BLIZZARD!!',      name: 'BLIZZARD', col: '#7FE3FF', time: 4 },
  boulder:  { label: 'SNOWBOULDER!',    name: 'BOULDER',  col: '#FF9F5A', time: 6 },
};

// Palette — Cold Shoulder's glacier world, inked watercolour
const CSH_GLACIER = '#8ECAE6', CSH_ICE = '#F4FAFD', CSH_ICE_SH = '#CFE6F2',
      CSH_DRINK = '#2E5E7E', CSH_DRINK_D = '#1F4560', CSH_INK = '#1F2A36',
      CSH_CREAM = '#FFF6E5', CSH_BEAK = '#F4A259', CSH_BLUSH = '#F7A8B8',
      CSH_WHITE = '#FFFFFF', CSH_DIM = '#A9C6D6', CSH_RED = '#E63946',
      CSH_FISH = '#9FD3EA', CSH_GOLD = '#FFE08A';
const CSH_YOU = '#E63946';
const CSH_RIVALS = ['#00B4D8', '#52B788', '#9B5DE5', '#FFB703', '#F78C6B', '#5E81F4'];
const CSH_RAINBOW = ['#FF6B6B', '#FFC94A', '#7BE07B', '#7FE3FF', '#B28DFF', '#FF8FB1'];

// Words — barks, shouts, bubbles
const CSH_BARKS = ['Into the Drink!', 'See you at the bottom.', 'That’ll be cold.', 'Straight in.',
  'Off you pop.', 'Didn’t see that coming.', 'Well, that’s that.', 'Splash.'];
const CSH_OUCH = ['Oi!', 'Rude!', 'Not the face!', 'Hey!', 'Brr!', 'Cheeky!', 'Ow!', 'My feathers!'];
const CSH_DODGE = ['Nope!', 'Missed me!', 'Too slow!', 'Hup!'];
const CSH_TAUNT = ['Who’s dry now?', 'Enjoy the swim!', 'Payback!', 'Water’s lovely!', 'Shove THAT.'];
const CSH_SHOUT_DIP = {
  2: ['DOUBLE DIP!', 'TWO FOR ONE!'],
  3: ['TRIPLE DIP!', 'SPLASHTASTIC!', 'HAT TRICK!'],
  4: ['BIG DIP!', 'BRRRILLIANT!', 'FLOE-NOMENAL!', 'ABSOLUTE SCENES!'],
};
const CSH_SHOUT_ROLL = ['ON A ROLL!', 'ON FIRE… ON ICE!', 'UNSTOPPABLE!', 'COLD-BLOODED!'];
const CSH_SHOUT_DANGER = ['MAYDAY!', 'ABANDON FLOE!', 'IT’S GETTING CROWDED!'];
const CSH_COACH = {
  aim:  'Touch where you want to throw, pull down for power, let go. Knock them into the Drink!',
  load: 'Too many on the ice and it sinks. Keep the floe clear!',
  fish: 'Fish! They’ll all rush for it — line them up for a big dip.',
  gull: 'A seagull with a power-up! Snowball it to grab it.',
  berg: 'Bergs bounce penguins back. Bounce a Snowball off one for a Bank Shot.',
  frosty: 'Frosties are frozen in. Crack the ice first, then shove.',
};

const CSH_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  aimStep:   k => playSecretBeep(440 + k * 110),
  throw:     () => playSecretBeep(523),
  hit:       () => playSecretBeep(330),
  bump:      () => playSecretBeep(262),
  crack:     () => { playSecretBeep(1319); cshLater(50, () => playSecretBeep(880)); },
  plunge:    () => { playSecretBeep(523); cshLater(90, () => playSecretBeep(262)); },
  dip:       n => [659, 784, 988, 1175, 1319, 1568].slice(0, Math.min(6, n + 1)).forEach((f, k) => cshLater(k * 70, () => playSecretBeep(f))),
  hop:       () => playSecretBeep(392),
  dodge:     () => { playSecretBeep(587); cshLater(60, () => playSecretBeep(784)); },
  fish:      () => { playSecretBeep(880); cshLater(90, () => playSecretBeep(1175)); },
  nom:       () => { playSecretBeep(196); cshLater(110, () => playSecretBeep(165)); },
  gull:      () => { playSecretBeep(1568); cshLater(90, () => playSecretBeep(1319)); },
  power:     () => [784, 988, 1175, 1568].forEach((f, k) => cshLater(k * 60, () => playSecretBeep(f))),
  powerEnd:  () => { playSecretBeep(523); cshLater(90, () => playSecretBeep(392)); },
  berg:      () => playSecretBeep(196),
  bergBreak: () => { playSecretBeep(147); cshLater(80, () => playSecretBeep(110)); },
  creak:     () => { playSecretBeep(110); cshLater(120, () => playSecretBeep(98)); },
  wave:      () => [523, 659, 784, 1046, 784, 1046].forEach((f, k) => cshLater(k * 90, () => playSecretBeep(f))),
  sink:      () => [262, 220, 196, 165, 131].forEach((f, k) => cshLater(k * 150, () => playSecretBeep(f))),
};
const CSH_OVER_JINGLE = [523, 392, 330, 262];

// Layout rects (logical px)
const CSH_BTN_PLAY     = { x: 40,  y: 556, w: 280, h: 62 };
const CSH_SLOTS_UI = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const CSH_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const CSH_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const CSH_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

let cshCanvas = null, cshCtx = null;
let cshRafHandle = null, cshLastT = 0;
let cshState = 'attract';   // attract | playing | over | nameEntry | leaderboard
let cshClock = 0;           // ms of un-paused time
let cshEvents = [];         // [{ at, fn }] — replaces setTimeout
let cshParts = [];          // particles
let cshCallouts = [];       // small floating words
let cshBubbles = [];        // penguin speech bubbles
let cshShout = null;        // the announcer — one big line at a time
let cshBanner = null;       // the wave banner
let cshShake = 0, cshFlash = 0, cshFreeze = 0;
let cshScore = 0, cshScoreShown = 0, cshLastScore = 0, cshLastDip = 0, cshLastWave = 1;
let cshPtrId = null;        // the one pointer allowed to act
let cshPress = null;
let cshScores = [];         // session leaderboard — NOT cleared by teardown
let cshLastEntry = -1;
const CSH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let cshInitials = [0, 0, 0];
let cshCoachSeen = {};      // session-only: each coach line shows once

// Run state
let cshT = 0, cshWave = 1, cshWaveT = 0;
let cshPengs = [];
let cshBalls = [];
let cshThrows = {};
let cshThrowId = 0;
let cshFishes = [];
let cshGulls = [], cshGullT = 0;
let cshPower = null;        // { kind, t, max }
let cshRim = [];
let cshAim = null;          // { ax, ay, power, dx, dy, step }
let cshQueued = null;       // a throw let go during the re-pack
let cshReload = 0, cshYouThrowT = 0;
let cshSpawnT = 0, cshFishT = 0;
let cshSinkT = 0, cshSinking = 0, cshCreakT = 0, cshDangerSaid = false;
let cshStreak = 0, cshBestDip = 0;
let cshTimeScale = 1, cshSlowT = 0;
let cshGrooves = [], cshSplats = [], cshDeco = null, cshFlakes = [];
let cshCoach = null, cshCoachT = 0;
let cshDemoT = 0;
let cshOverT = 0, cshLastBump = 0;
let cshGrain = null, cshGrainPat = null, cshAimGhost = null;

// ── Lifecycle ────────────────────────────────────────────────────────────────
function cshStart() {
  cshCanvas = document.getElementById('csh-canvas');
  cshCtx = cshCanvas.getContext('2d');
  if (!cshGrain) cshMakeGrain();
  cshGrainPat = null;
  showScreen('screen-arcade-coldshot');
  cshResize();
  cshEnterState('attract');
}

function cshEnterState(next) {
  cshState = next;
  cshShake = 0; cshPress = null; cshAim = null; cshQueued = null;
  if (next === 'playing') cshNewGame(false);
  if (next === 'attract') cshNewGame(true);
  if (!cshRafHandle) { cshLastT = 0; cshRafHandle = requestAnimationFrame(cshLoop); }
}

function cshNewGame(demo) {
  cshT = 0; cshWave = 1; cshWaveT = 0;
  cshScore = 0; cshScoreShown = 0; cshStreak = 0; cshBestDip = 0;
  cshEvents = []; cshParts = []; cshCallouts = []; cshBubbles = []; cshShout = null; cshBanner = null;
  cshBalls = []; cshThrows = {}; cshPengs = []; cshFishes = []; cshGulls = []; cshPower = null;
  cshGrooves = []; cshSplats = [];
  cshRim = new Array(CSH_SLOTS).fill(null);
  cshReload = 0; cshYouThrowT = 0; cshSinkT = 0; cshSinking = 0; cshCreakT = 0; cshDangerSaid = false;
  cshTimeScale = 1; cshSlowT = 0; cshCoach = null; cshAimGhost = null; cshQueued = null;
  cshFlash = 0; cshFreeze = 0;
  cshSpawnT = demo ? 0.5 : 2.4; cshFishT = demo ? 6 : 16; cshGullT = demo ? 4 : 9;
  cshDemoT = 1.6;
  cshDeco = cshMakeDeco(Math.random);
  cshMakeFlakes();
  [[-0.42, -0.45], [0.38, -0.2], [0.02, 0.18]].forEach(([fx, fy], k) => {
    const p = cshMakePeng(CSH_FX + fx * CSH_FR, CSH_FY + fy * CSH_FR, 'waddler', k);
    p.state = 'sleep';
    cshPengs.push(p);
  });
  if (!demo) {
    cshBanner = { t: 0, wave: 1, sub: CSH_WAVES[0].sub };
    if (!cshCoachSeen.aim) { cshCoachSeen.aim = true; cshShowCoach('aim'); }
  }
}

function cshLater(ms, fn) { cshEvents.push({ at: cshClock + ms, fn }); }
function cshPick(a) { return a[Math.floor(Math.random() * a.length)]; }

function cshMakeDeco(rnd) {
  const d = { mounds: [], cracks: [], drifts: [], floes: [], glints: [], waves: [] };
  for (let k = 0; k < 7; k++) d.mounds.push({ a: rnd() * 6.283, d: rnd() * 0.72, s: 0.16 + rnd() * 0.2 });
  for (let k = 0; k < 4; k++) {
    let a = rnd() * 6.283, r = 0.25 + rnd() * 0.6;
    const pts = [[Math.cos(a) * r, Math.sin(a) * r]];
    for (let j = 0; j < 4; j++) { a += (rnd() - 0.5) * 0.9; r += (rnd() - 0.3) * 0.12; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    d.cracks.push(pts);
  }
  for (let k = 0; k < 4; k++) d.drifts.push({ a: rnd() * 6.283, d: 0.3 + rnd() * 0.55, len: 0.3 + rnd() * 0.4 });
  for (let k = 0; k < 4; k++) d.floes.push({ x: rnd() * CSH_W, y: rnd() * CSH_H, s: 8 + rnd() * 12, sp: 3 + rnd() * 5, seed: rnd() });
  for (let k = 0; k < 28; k++) d.glints.push({ x: rnd() * CSH_W, y: rnd() * CSH_H, len: 4 + rnd() * 9, ph: rnd() * 6.283, sp: 4 + rnd() * 6 });
  for (let k = 0; k < 18; k++) d.waves.push({ x: rnd() * CSH_W, y: rnd() * CSH_H, w: 10 + rnd() * 14, ph: rnd() * 6.283 });
  return d;
}

function cshMakeFlakes() {
  cshFlakes = [];
  for (let k = 0; k < 90; k++) cshFlakes.push({ x: Math.random() * CSH_W, y: Math.random() * CSH_H, r: 0.8 + Math.random() * 1.8, sp: 14 + Math.random() * 22, ph: Math.random() * 6.283, heavy: k >= 30 });
}

function cshMakePeng(x, y, kind, colIdx) {
  const r = kind === 'chonk' ? CSH_CHONK_R : kind === 'chick' ? CSH_CHICK_R : CSH_PR;
  return { kind, x, y, vx: 0, vy: 0, r, m: kind === 'chonk' ? 2.3 : kind === 'chick' ? 0.7 : 1,
    col: CSH_RIVALS[(colIdx === undefined ? Math.floor(Math.random() * CSH_RIVALS.length) : colIdx) % CSH_RIVALS.length],
    state: 'walk', t: Math.random() * 10, wob: Math.random() * 6.283, tx: x, ty: y, idle: Math.random() * 1.5,
    speed: kind === 'slider' ? 72 : kind === 'jumpy' ? 30 : 18 + Math.random() * 10,
    throwId: 0, squash: 0, shock: 0, dizzy: 0, shell: kind === 'frosty' ? 1 : 0, dodgeCD: 0, dodge: null,
    follow: null, hopT: 0, hx: x, hy: y, ang: 0, pt: 0, splashed: false, swim: 0, trail: null, fast: false, sleepy: false };
}

// ── Loop ─────────────────────────────────────────────────────────────────────
function cshLoop(now) {
  cshRafHandle = null;
  if (!cshLastT) cshLastT = now;
  const dt = Math.min((now - cshLastT) / 1000, 0.05);
  cshLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) cshUpdate(dt);
  cshDraw();
  if (!cshRafHandle) cshRafHandle = requestAnimationFrame(cshLoop);
}

function cshUpdate(dt) {
  cshClock += dt * 1000;
  if (cshShake > 0) cshShake = Math.max(0, cshShake - dt);
  if (cshFlash > 0) cshFlash = Math.max(0, cshFlash - dt * 2.5);
  cshScoreShown += (cshScore - cshScoreShown) * Math.min(1, dt * 9);
  if (Math.abs(cshScore - cshScoreShown) < 1) cshScoreShown = cshScore;
  cshCallouts.forEach(c => { c.life -= dt; c.y -= 16 * dt; });
  cshCallouts = cshCallouts.filter(c => c.life > 0);
  cshBubbles.forEach(b => { b.life -= dt; b.y -= 6 * dt; });
  cshBubbles = cshBubbles.filter(b => b.life > 0);
  if (cshShout) { cshShout.t += dt; if (cshShout.t > cshShout.life) cshShout = null; }
  if (cshBanner) { cshBanner.t += dt; if (cshBanner.t > 2.2) cshBanner = null; }
  if (cshCoach) { cshCoachT -= dt; if (cshCoachT <= 0) cshCoach = null; }
  const blizz = cshPower && cshPower.kind === 'blizzard';
  cshFlakes.forEach(f => {
    if (f.heavy && !blizz) return;
    f.y += f.sp * (blizz ? 4 : 1) * dt; f.x += (Math.sin(cshClock / 900 + f.ph) * 8 + (blizz ? 70 : 0)) * dt;
    if (f.y > CSH_H + 4) { f.y = -4; f.x = Math.random() * CSH_W; }
    if (f.x > CSH_W + 4) f.x = -4;
  });

  if (cshEvents.length) {
    const due = cshEvents.filter(e => cshClock >= e.at);
    cshEvents  = cshEvents.filter(e => cshClock <  e.at);
    due.forEach(e => e.fn());
  }

  if (cshFreeze > 0) { cshFreeze -= dt; return; }     // hit-stop: the world holds its breath
  if (cshSlowT > 0) { cshSlowT -= dt; cshTimeScale = 0.35; if (cshSlowT <= 0) cshTimeScale = 1; }
  const sdt = dt * cshTimeScale;

  cshParts.forEach(p => {
    p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += (p.grav || 0) * sdt; p.life -= sdt;
    if (p.vr) p.r += p.vr * sdt;
    if (p.spin) p.rot += p.spin * sdt;
  });
  cshParts = cshParts.filter(p => p.life > 0);

  if (cshState === 'attract' || cshState === 'playing') cshUpdateRun(dt, sdt);
  else if (cshState === 'over') { cshOverT += dt; cshUpdateWorld(sdt); }
}

function cshWaveDef(n) {
  if (n <= CSH_WAVES.length) return CSH_WAVES[n - 1];
  const last = CSH_WAVES[CSH_WAVES.length - 1];
  return { sub: CSH_WAVE_MORE[(n - CSH_WAVES.length - 1) % CSH_WAVE_MORE.length], kinds: last.kinds,
    gap: Math.max(0.6, last.gap - (n - CSH_WAVES.length) * 0.16), fish: 3, bergs: n % 2 ? 2 : 0 };
}

function cshUpdateRun(dt, sdt) {
  const demo = cshState === 'attract';
  if (cshSinking > 0) {
    cshSinking += dt;
    cshUpdateWorld(sdt);
    if (cshSinking > 1.6 && cshState === 'playing') cshGameOver();
    return;
  }
  cshT += sdt;
  const wasReady = cshReload <= 0;
  cshReload = Math.max(0, cshReload - sdt);
  if (cshYouThrowT > 0) cshYouThrowT -= sdt;
  if (!wasReady && cshReload <= 0 && !demo && cshQueued) {
    const q = cshQueued; cshQueued = null; cshThrow(q.dx, q.dy, q.power);
  }
  if (cshPower) {
    cshPower.t -= sdt;
    if (cshPower.t <= 0) { cshPower = null; if (!demo) { CSH_SOUND.powerEnd(); cshCallout('POWER’S GONE', CSH_YOU_X, CSH_YOU_Y - 60, CSH_DIM, 13, 1); } }
  }
  // BLIZZARD: hold and spray
  if (!demo && cshPower && cshPower.kind === 'blizzard' && cshAim && cshAim.power >= CSH_MIN_POWER && cshReload <= 0) {
    cshThrow(cshAim.dx, cshAim.dy, Math.max(0.7, cshAim.power));
  }

  if (!demo) {
    cshWaveT += sdt;
    if (cshWaveT >= CSH_WAVE_LEN) cshNextWave();
  }
  const wd = cshWaveDef(cshWave);
  cshSpawnT -= sdt;
  if (cshSpawnT <= 0) {
    if (!demo || cshOnFloe() < 4) cshSpawn(demo ? { waddler: 3, slider: 1 } : wd.kinds);
    cshSpawnT = demo ? 1.8 : wd.gap * (0.8 + Math.random() * 0.4);
  }
  cshFishT -= sdt;
  if (cshFishT <= 0 && !cshFishes.length) { cshDropFish(demo ? 1 : wd.fish); cshFishT = 14 + Math.random() * 6; }
  cshGullT -= sdt;
  if (cshGullT <= 0) { cshSpawnGull(); cshGullT = demo ? 7 : 15 + Math.random() * 6; }

  if (demo) {
    cshDemoT -= sdt;
    if (cshDemoT <= 0 && cshReload <= 0) { cshDemoThrow(); cshDemoT = 1.1 + Math.random() * 0.8; }
  }

  cshUpdateWorld(sdt);

  const load = cshOnFloe();
  if (!demo && load >= 6 && !cshCoachSeen.load) { cshCoachSeen.load = true; cshShowCoach('load'); }
  if (!demo && load >= CSH_CAP - 1 && !cshDangerSaid) { cshDangerSaid = true; cshSay(cshPick(CSH_SHOUT_DANGER), CSH_RED, 1.0); }
  if (load <= CSH_CAP - 3) cshDangerSaid = false;
  if (load >= CSH_CAP && !demo) {
    cshSinkT += sdt;
    cshCreakT -= sdt;
    if (cshCreakT <= 0) {
      cshCreakT = 1;
      CSH_SOUND.creak(); cshShake = Math.max(cshShake, 0.2);
      cshCallout('CREAK!', CSH_FX, CSH_FY - CSH_FR - 4, CSH_RED, 22, 0.9);
    }
    if (cshSinkT >= CSH_SINK_T) cshSink();
  } else { cshSinkT = Math.max(0, cshSinkT - sdt * 1.5); cshCreakT = 0; }
}

function cshNextWave() {
  cshWave++; cshWaveT = 0;
  const wd = cshWaveDef(cshWave);
  cshBanner = { t: 0, wave: cshWave, sub: wd.sub };
  const bonus = 250 * (cshWave - 1);
  cshScore += bonus;
  cshCallout('WAVE BONUS +' + bonus, CSH_W / 2, 470, CSH_GOLD, 15, 1.6);
  CSH_SOUND.wave();
  if (wd.bergs) cshLater(1400, () => { if (cshState === 'playing') cshRaiseBergs(wd.bergs); });
  if (cshWave % 2 === 0) cshLater(1800, () => { if (cshState === 'playing' && !cshGulls.length) { cshSpawnGull(); cshGullT = Math.max(cshGullT, 10); } });
  if (wd.kinds.frosty && !cshCoachSeen.frosty) cshLater(2400, () => { if (!cshCoachSeen.frosty) { cshCoachSeen.frosty = true; cshShowCoach('frosty'); } });
}

function cshOnFloe() {
  return cshPengs.filter(p => (p.state === 'hop' && p.hopT >= 0) || cshOnIce(p)).length;
}
function cshOnIce(p) { return p.state === 'walk' || p.state === 'slide' || p.state === 'sleep' || p.state === 'dizzy'; }

function cshPickKind(kinds) {
  const ks = Object.keys(kinds), tot = ks.reduce((a, k) => a + kinds[k], 0);
  let r = Math.random() * tot;
  for (const k of ks) { r -= kinds[k]; if (r <= 0) return k; }
  return ks[0];
}

function cshSpawn(kinds) {
  const a = (150 + Math.random() * 240) * Math.PI / 180;    // never from your side
  const kind = cshPickKind(kinds);
  const hx = CSH_FX + Math.cos(a) * (CSH_FR + 30), hy = CSH_FY + Math.sin(a) * (CSH_FR + 30);
  const lx = CSH_FX + Math.cos(a) * (CSH_FR - 26), ly = CSH_FY + Math.sin(a) * (CSH_FR - 26);
  if (kind === 'conga') {                                  // a leader and three chicks, in a line
    const col = Math.floor(Math.random() * CSH_RIVALS.length);
    let prev = null;
    for (let k = 0; k < 4; k++) {
      const p = cshMakePeng(lx, ly, k ? 'chick' : 'waddler', col + k);
      p.state = 'hop'; p.hopT = -k * 0.35; p.ang = a; p.hx = hx; p.hy = hy;
      p.follow = prev; p.speed = 26;
      cshPengs.push(p); prev = p;
    }
    if (cshState === 'playing') cshSay('CONGA LINE!', CSH_GOLD, 1.0, true);
  } else {
    const p = cshMakePeng(lx, ly, kind);
    p.state = 'hop'; p.hopT = 0; p.ang = a; p.hx = hx; p.hy = hy;
    if (cshState !== 'attract' && kind === 'waddler' && Math.random() < 0.12) p.sleepy = true;
    cshPengs.push(p);
  }
  cshSplash(hx, hy, 0.6);
  if (cshState === 'playing') CSH_SOUND.hop();
}

function cshDropFish(n) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, d = Math.random() * CSH_FR * 0.5;
    const x = CSH_FX + Math.cos(a) * d, y = CSH_FY + Math.sin(a) * d;
    cshFishes.push({ x, y, vx: 0, vy: 0, state: 'land', t: -k * 0.2, fromX: x + (Math.random() - 0.5) * 140, fromY: CSH_FY - CSH_FR - 70 });
  }
  if (cshState === 'playing') {
    CSH_SOUND.fish();
    cshSay(n > 1 ? (n > 2 ? 'FISH STORM!' : 'DOUBLE FISH!') : 'FISH!', CSH_GOLD, 0.9);
    if (!cshCoachSeen.fish) { cshCoachSeen.fish = true; cshShowCoach('fish'); }
  }
}

function cshSpawnGull() {
  const left = Math.random() < 0.5, kinds = Object.keys(CSH_POWERS);
  const y = 140 + Math.random() * 230;
  cshGulls.push({ x: left ? -30 : CSH_W + 30, y, vx: (left ? 1 : -1) * (58 + Math.random() * 18), t: 0, kind: cshPick(kinds), hit: false, wob: Math.random() * 6 });
  if (cshState === 'playing') {
    CSH_SOUND.gull();
    if (!cshCoachSeen.gull) { cshCoachSeen.gull = true; cshShowCoach('gull'); }
  }
}

function cshRaiseBergs(n) {
  const free = [];
  for (let s = 0; s < CSH_SLOTS; s++) {
    const a = (s + 0.5) * CSH_SLOT_A * 180 / Math.PI;
    if (!cshRim[s] && !(a > 35 && a < 145)) free.push(s);
  }
  for (let k = 0; k < n && free.length; k++) {
    const s = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    cshRim[s] = { hp: 3, maxHp: 3, rise: 0, seed: Math.random(), size: 0.9 + Math.random() * 0.2 };
  }
  CSH_SOUND.berg();
  cshShake = Math.max(cshShake, 0.25);
  cshSay('BERGS!', CSH_WHITE, 0.8);
  if (!cshCoachSeen.berg) { cshCoachSeen.berg = true; cshShowCoach('berg'); }
}

function cshShowCoach(k) { cshCoach = CSH_COACH[k]; cshCoachT = 5; }

function cshDemoThrow() {
  if (cshGulls.length && Math.random() < 0.5) {
    const g = cshGulls[0], dx = g.x + g.vx * 0.45 - CSH_YOU_X, dy = g.y - CSH_YOU_Y, l = Math.hypot(dx, dy);
    if (dy < -60) { cshThrow(dx / l, dy / l, 1); return; }
  }
  const live = cshPengs.filter(p => p.state === 'walk' || p.state === 'sleep');
  if (!live.length) return;
  const p = cshPick(live);
  const dx = p.x - CSH_YOU_X, dy = p.y - CSH_YOU_Y, l = Math.hypot(dx, dy);
  cshThrow(dx / l, dy / l, 0.75 + Math.random() * 0.25);
}

// ── Throwing ─────────────────────────────────────────────────────────────────
function cshThrow(dx, dy, power) {
  const id = ++cshThrowId;
  const kind = cshPower ? cshPower.kind : null;
  const v = CSH_BALL_V0 + (CSH_BALL_V1 - CSH_BALL_V0) * cshPowerK(power);
  const sx = CSH_YOU_X + dx * 20, sy = CSH_YOU_Y - 18 + dy * 10;
  const ball = (ang, ox, oy, big) => {
    const c = Math.cos(ang), s = Math.sin(ang), bx = dx * c - dy * s, by = dx * s + dy * c;
    cshBalls.push({ x: sx + ox, y: sy + oy, vx: bx * v * (big ? 0.8 : 1), vy: by * v * (big ? 0.8 : 1), power, id,
      bounced: false, t: 0, r: big ? CSH_BOULDER_R : CSH_BALL_R, big: !!big, hitSet: big ? [] : null });
  };
  if (kind === 'double') { ball(0, -dy * 9, dx * 9); ball(0, dy * 9, -dx * 9); }
  else if (kind === 'spread') { ball(-0.22, 0, 0); ball(0, 0, 0); ball(0.22, 0, 0); }
  else if (kind === 'boulder') ball(0, 0, 0, true);
  else ball(0, 0, 0);
  cshThrows[id] = { plunges: 0, live: true };
  cshReload = kind === 'blizzard' ? CSH_RELOAD_BLIZZ : CSH_RELOAD;
  cshYouThrowT = 0.22;
  cshPuff(sx, sy, kind === 'boulder' ? 12 : 4, [CSH_WHITE, CSH_ICE_SH]);
  if (cshState === 'playing') CSH_SOUND.throw();
}

function cshFinishThrow(id) {
  const th = cshThrows[id];
  if (!th || !th.live) return;
  th.live = false;
  delete cshThrows[id];
  if (cshState !== 'playing' || cshSinking) return;
  if (cshPower && cshPower.kind === 'blizzard') return;        // a spray doesn't make or break a streak
  if (th.plunges > 0) {
    cshStreak++;
    if (cshStreak % 3 === 0) cshSay(CSH_SHOUT_ROLL[Math.min(CSH_SHOUT_ROLL.length - 1, cshStreak / 3 - 1)] + ' ×' + cshStreakMul(), CSH_GOLD, 1.0);
  } else if (!th.gull) {                                         // grabbing a power-up keeps a streak alive
    if (cshStreak >= 3) cshCallout('streak lost', CSH_YOU_X, CSH_YOU_Y - 56, CSH_DIM, 12, 1);
    cshStreak = 0;
  }
}
function cshStreakMul() { return Math.min(4, 1 + Math.floor(cshStreak / 3)); }

// ── World update (physics, walking, plunges) ─────────────────────────────────
function cshUpdateWorld(sdt) {
  let acc = sdt;
  while (acc > 1e-6) { const h = Math.min(CSH_STEP, acc); cshStep(h); acc -= h; }
  cshPengs.forEach(p => {
    p.t += sdt;
    if (p.squash > 0) p.squash -= sdt;
    if (p.shock > 0) p.shock -= sdt;
    if (p.dodgeCD > 0) p.dodgeCD -= sdt;
    if (p.state === 'hop') {
      const before = p.hopT;
      p.hopT += sdt / 0.55;
      if (before < 0 && p.hopT >= 0) cshSplash(p.hx, p.hy, 0.5);
      if (p.hopT >= 1) { p.state = p.sleepy ? 'sleep' : 'walk'; p.idle = 0.3; p.squash = 0.14; }
    } else if (p.state === 'dizzy') {
      p.dizzy -= sdt;
      if (p.dizzy <= 0) { p.state = 'walk'; p.idle = 0.4; }
    } else if (p.state === 'plunge') {
      p.pt += sdt / 0.55;
      if (p.pt >= 0.55 && !p.splashed) {
        p.splashed = true;
        const q = cshRimPoint(p.ang, p.r * 0.6);
        cshSplash(q.x, q.y, 1.2);
        if (cshState === 'playing') CSH_SOUND.plunge();
      }
      if (p.pt >= 1) { p.state = 'swim'; p.swim = 0; const q = cshRimPoint(p.ang, p.r * 0.6); p.x = q.x; p.y = q.y; }
    } else if (p.state === 'swim') {
      p.swim += sdt;
      p.x += Math.cos(p.ang) * 22 * sdt; p.y += Math.sin(p.ang) * 22 * sdt;
    }
  });
  cshPengs = cshPengs.filter(p => p.state !== 'swim' || p.swim < 1.8);
  cshFishes.forEach(f => {
    if (f.state === 'land') {
      f.t += sdt / 0.6;
      if (f.t >= 1) { f.state = 'rest'; cshPuff(f.x, f.y, 6, [CSH_WHITE, CSH_ICE_SH]); }
    } else if (f.state === 'gone') f.t += sdt;
  });
  cshFishes = cshFishes.filter(f => f.state !== 'gone' || f.t < 0.6);
  cshGulls.forEach(gl => {
    gl.t += sdt;
    if (gl.hit) { gl.x += gl.vx * 2.2 * sdt; gl.y -= 160 * sdt; }
    else { gl.x += gl.vx * sdt; gl.y += Math.sin(gl.t * 2 + gl.wob) * 12 * sdt; }
  });
  cshGulls = cshGulls.filter(gl => gl.x > -60 && gl.x < CSH_W + 60 && gl.y > -60);
  cshRim.forEach(b => { if (b && b.rise < 1) b.rise = Math.min(1, b.rise + sdt * 2.5); });
  Object.keys(cshThrows).forEach(k => {
    const id = +k;
    if (cshBalls.some(b => b.id === id)) return;
    if (cshPengs.some(p => p.throwId === id && (p.state === 'slide' || p.state === 'plunge'))) return;
    cshFinishThrow(id);
  });
}

function cshRimPoint(a, off) {
  return { x: CSH_FX + Math.cos(a) * (CSH_FR + off), y: CSH_FY + Math.sin(a) * (CSH_FR + off) };
}
function cshSlotAt(a) { const t = Math.PI * 2; return Math.floor((((a % t) + t) % t) / CSH_SLOT_A) % CSH_SLOTS; }
function cshLiveFish() { return cshFishes.filter(f => f.state === 'rest' || f.state === 'slide'); }

function cshStep(h) {
  // Snowballs
  for (const b of cshBalls) {
    b.x += b.vx * h; b.y += b.vy * h; b.t += h;
    if (b.t % 0.03 < h && cshParts.length < 200) cshPart({ x: b.x, y: b.y - 12, vx: 0, vy: 0, life: 0.25, max: 0.25, r: b.big ? 4 : 1.8, col: CSH_WHITE, type: 'dot' });
    for (const gl of cshGulls) {                         // a seagull? it's up in the air, so it's checked first
      if (gl.hit) continue;
      if (Math.hypot(gl.x - b.x, gl.y - 6 - b.y) < 20 + b.r) { cshGrabGull(gl, b); if (!b.big) b.dead = true; break; }
    }
    if (b.dead) continue;
    const dx = b.x - CSH_FX, dy = b.y - CSH_FY, d = Math.hypot(dx, dy);
    if (Math.abs(d - (CSH_FR + 3)) < 9) {                // a Berg bounces it back in — a Bank Shot
      const s = cshSlotAt(Math.atan2(dy, dx)), berg = cshRim[s];
      const nx = dx / d, ny = dy / d, vr = b.vx * nx + b.vy * ny;
      if (berg && berg.rise >= 1 && vr > 0) {
        b.vx -= 2 * vr * nx; b.vy -= 2 * vr * ny; b.bounced = true;
        b.x = CSH_FX + nx * (CSH_FR - 7); b.y = CSH_FY + ny * (CSH_FR - 7);
        cshHitBerg(s, b.big ? 3 : 1);
        cshStars(b.x, b.y, 4);
      }
    }
    for (const p of cshPengs) {
      if (!cshOnIce(p)) continue;
      if (b.hitSet && b.hitSet.includes(p)) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + b.r) { cshBallHit(b, p); if (!b.big) break; }
    }
    if (!b.dead) {
      for (const f of cshLiveFish()) {
        if (Math.hypot(f.x - b.x, f.y - b.y) < 10 + b.r) {
          const l = Math.hypot(b.vx, b.vy) || 1, sh = CSH_SHOVE0 + (CSH_SHOVE1 - CSH_SHOVE0) * cshPowerK(b.power);
          f.vx += b.vx / l * sh * 1.2; f.vy += b.vy / l * sh * 1.2; f.state = 'slide';
          cshPuff(b.x, b.y, 8, [CSH_WHITE, CSH_ICE_SH]);
          if (!b.big) { b.dead = true; break; }
        }
      }
    }
    if (b.x < -30 || b.x > CSH_W + 30 || b.y < -30 || b.y > CSH_H + 30 || b.t > 3) b.dead = true;
  }
  cshBalls = cshBalls.filter(b => !b.dead);

  const ice = cshPengs.filter(cshOnIce);
  const fishes = cshLiveFish();
  // Walking
  for (const p of ice) {
    if (p.state !== 'walk') continue;
    if (p.dodge) {                                         // Jumpy's side-hop
      const k = Math.min(1, h / Math.max(0.001, p.dodge.t));
      p.x += (p.dodge.x - p.x) * k; p.y += (p.dodge.y - p.y) * k; p.dodge.t -= h;
      if (p.dodge.t <= 0) p.dodge = null;
      continue;
    }
    let tx = p.tx, ty = p.ty, sp = p.speed, stopAt = 3;
    let fish = null;
    if (fishes.length) {
      let bd = 1e9;
      fishes.forEach(f => { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; fish = f; } });
    }
    if (p.follow && !cshOnIce(p.follow) && p.follow.state !== 'hop') p.follow = null;
    if (fish) { tx = fish.x; ty = fish.y; sp = p.speed * 2.2 + 12; p.idle = 0; }
    else if (p.follow && cshOnIce(p.follow)) { tx = p.follow.x; ty = p.follow.y; stopAt = p.r + p.follow.r + 5; sp = Math.max(p.speed, p.follow.speed + 4); }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d < stopAt) {
      p.idle -= h;
      if (p.idle <= 0 && !p.follow) {
        const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * CSH_FR * 0.7;
        p.tx = CSH_FX + Math.cos(a) * rr; p.ty = CSH_FY + Math.sin(a) * rr;
        p.idle = p.kind === 'slider' ? 0.2 : 0.4 + Math.random() * 1.6;
      }
    } else { const st = Math.min(d - stopAt + 0.01, sp * h); p.x += dx / d * st; p.y += dy / d * st; p.mdx = dx / d; p.mdy = dy / d; }
    if (fish && fish.state === 'rest' && Math.hypot(fish.x - p.x, fish.y - p.y) < p.r + 7) cshEat(p, fish);
    if (p.kind === 'jumpy' && p.dodgeCD <= 0) {            // Jumpies see snowballs coming
      for (const b of cshBalls) {
        const rx = p.x - b.x, ry = p.y - b.y, sp2 = Math.hypot(b.vx, b.vy) || 1;
        const ux = b.vx / sp2, uy = b.vy / sp2, along = rx * ux + ry * uy, perp = Math.abs(rx * uy - ry * ux);
        if (along > 0 && along < 85 && perp < p.r + b.r + 4) {
          const side = (rx * uy - ry * ux) >= 0 ? 1 : -1;
          let nx = p.x + uy * side * 30, ny = p.y - ux * side * 30;
          const dd = Math.hypot(nx - CSH_FX, ny - CSH_FY), lim = CSH_FR - p.r - 4;
          if (dd > lim) { nx = CSH_FX + (nx - CSH_FX) / dd * lim; ny = CSH_FY + (ny - CSH_FY) / dd * lim; }
          p.dodge = { x: nx, y: ny, t: 0.16 }; p.dodgeCD = 2.2; p.squash = 0.12;
          if (cshState === 'playing') { cshBubble(cshPick(CSH_DODGE), p.x, p.y - p.r * 3.2); CSH_SOUND.dodge(); }
          break;
        }
      }
    }
  }
  // Sliding
  for (const p of ice) if (p.state === 'slide') { p.x += p.vx * h; p.y += p.vy * h; }
  for (const f of fishes) {
    if (f.state !== 'slide') continue;
    f.x += f.vx * h; f.y += f.vy * h;
    const s = Math.hypot(f.vx, f.vy), ns = Math.max(0, s - CSH_DECEL * 0.8 * h);
    if (s > 0) { f.vx *= ns / s; f.vy *= ns / s; }
    if (ns < 8) f.state = 'rest';
    if (Math.hypot(f.x - CSH_FX, f.y - CSH_FY) > CSH_FR) {
      const a = Math.atan2(f.y - CSH_FY, f.x - CSH_FX), q = cshRimPoint(a, 4);
      cshSplash(q.x, q.y, 0.6);
      if (cshState === 'playing') cshCallout('Fish overboard.', q.x, q.y - 30, CSH_WHITE, 13, 1.2);
      f.state = 'gone'; f.t = 0;
    }
  }
  // Collisions
  for (let i = 0; i < ice.length; i++) {
    for (let j = i + 1; j < ice.length; j++) {
      const a = ice[i], b = ice[j];
      if (!cshOnIce(a) || !cshOnIce(b)) continue;
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const R = a.r + b.r;
      if (d >= R) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d, ov = R - d;
      const ia = 1 / a.m, ib = 1 / b.m;
      a.x -= nx * ov * ia / (ia + ib); a.y -= ny * ov * ia / (ia + ib);
      b.x += nx * ov * ib / (ia + ib); b.y += ny * ov * ib / (ia + ib);
      const avx = a.state === 'slide' ? a.vx : 0, avy = a.state === 'slide' ? a.vy : 0;
      const bvx = b.state === 'slide' ? b.vx : 0, bvy = b.state === 'slide' ? b.vy : 0;
      const rel = (avx - bvx) * nx + (avy - bvy) * ny;
      if (rel > 20) {
        const jj = (1 + CSH_E_PENG) * rel / (ia + ib);
        a.vx = avx - jj * ia * nx; a.vy = avy - jj * ia * ny;
        b.vx = bvx + jj * ib * nx; b.vy = bvy + jj * ib * ny;
        [a, b].forEach(p => {
          if (Math.hypot(p.vx, p.vy) > 30) {
            if (p.shell > 0) { p.shell = 0; cshShards(p.x, p.y - p.r, 10); }   // a hard knock cracks a Frosty too
            cshStartSlide(p);
          }
        });
        const id = a.throwId || b.throwId;
        if (id) { a.throwId = a.throwId || id; b.throwId = b.throwId || id; }
        a.squash = b.squash = 0.14; a.shock = b.shock = 0.5;
        cshPuff(a.x + nx * a.r, a.y + ny * a.r, Math.min(9, 3 + rel / 50), [CSH_WHITE, CSH_ICE_SH]);
        cshStars(a.x + nx * a.r, a.y + ny * a.r - 10, 3);
        if (cshClock - cshLastBump > 70 && cshState === 'playing') { cshLastBump = cshClock; CSH_SOUND.bump(); }
      }
    }
  }
  // Rim + friction
  for (const p of ice) {
    if (!cshOnIce(p)) continue;
    const dx = p.x - CSH_FX, dy = p.y - CSH_FY, d = Math.hypot(dx, dy);
    if (p.state === 'slide') {
      const s = Math.hypot(p.vx, p.vy);
      if (s > 0) { const ns = Math.max(0, s - CSH_DECEL * h); p.vx *= ns / s; p.vy *= ns / s; }
      if (s > 150) p.fast = true;
      if (p.trail && s > 60) { const l = p.trail[p.trail.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) > 7) p.trail.push({ x: p.x, y: p.y }); }
      if (d > CSH_FR - p.r * 0.8) {
        const s2 = cshSlotAt(Math.atan2(dy, dx)), berg = cshRim[s2];
        const nx = dx / d, ny = dy / d, vr = p.vx * nx + p.vy * ny;
        if (berg && berg.rise >= 1) {
          const lim = CSH_FR - p.r * 0.8;
          p.x = CSH_FX + nx * lim; p.y = CSH_FY + ny * lim;
          if (vr > 0) {
            p.vx -= (1 + CSH_E_BERG) * vr * nx; p.vy -= (1 + CSH_E_BERG) * vr * ny; p.squash = 0.14;
            if (vr > 40) { cshHitBerg(s2, 1); if (cshState === 'playing') cshCallout('Boing!', p.x, p.y - 30, CSH_WHITE, 16, 0.7); }
          }
        } else if (d > CSH_FR) { cshPlunge(p, Math.atan2(dy, dx)); continue; }
      }
      if (Math.hypot(p.vx, p.vy) < CSH_STOP_V) {
        p.vx = p.vy = 0; p.state = 'dizzy'; p.dizzy = 0.7;
        if (p.fast) cshPuff(p.x, p.y + 4, 6, [CSH_WHITE, CSH_ICE_SH]);
        p.fast = false;
        if (p.trail && p.trail.length > 1) cshGrooves.push(p.trail);
        while (cshGrooves.length > 30) cshGrooves.shift();
        p.trail = null; p.throwId = 0;
        p.tx = p.x; p.ty = p.y;
      }
    } else {
      const lim = CSH_FR - p.r - 3;
      if (d > lim) { p.x = CSH_FX + dx / d * lim; p.y = CSH_FY + dy / d * lim; if (p.kind === 'slider') p.idle = 0; }
    }
  }
}

function cshStartSlide(p) {
  if (p.state !== 'slide') { p.state = 'slide'; p.trail = [{ x: p.x, y: p.y }]; }
  p.sleepy = false; p.dodge = null; p.follow = null;
}

function cshBallHit(b, p) {
  const l = Math.hypot(b.vx, b.vy) || 1;
  if (b.hitSet) b.hitSet.push(p); else b.dead = true;
  cshPuff(b.x, b.y, b.big ? 16 : 10, [CSH_WHITE, CSH_ICE_SH]);
  if (p.shell > 0 && !b.big) {                            // a Frosty: crack the ice first
    p.shell--;
    cshShards(p.x, p.y - p.r, 14);
    p.squash = 0.2; p.shock = 0.6;
    if (cshState === 'playing') { CSH_SOUND.crack(); cshCallout('CRACK!', p.x, p.y - p.r * 3.4, CSH_GLACIER, 18, 0.8); }
    return;
  }
  if (p.shell > 0) { p.shell = 0; cshShards(p.x, p.y - p.r, 14); }
  const sh = (CSH_SHOVE0 + (CSH_SHOVE1 - CSH_SHOVE0) * cshPowerK(b.power)) * (b.big ? 1.35 : 1) / p.m;
  const vx0 = p.state === 'slide' ? p.vx : 0, vy0 = p.state === 'slide' ? p.vy : 0;
  p.vx = vx0 + b.vx / l * sh; p.vy = vy0 + b.vy / l * sh;
  cshStartSlide(p);
  p.throwId = b.id; p.shock = 0.6; p.squash = 0.14;
  if (b.bounced && cshState === 'playing') { cshAddScore(100, p.x, p.y - 50); cshSay('BANK SHOT!', CSH_GLACIER, 0.9); }
  cshSplats.push({ x: b.x, y: b.y, s: (b.big ? 9 : 4) + Math.random() * 3 });
  while (cshSplats.length > 14) cshSplats.shift();
  if (cshState === 'playing') {
    CSH_SOUND.hit();
    if (Math.random() < 0.4) cshBubble(cshPick(CSH_OUCH), p.x, p.y - p.r * 3.2);
  }
}

function cshGrabGull(gl, b) {
  gl.hit = true;
  cshStars(gl.x, gl.y, 8);
  cshPuff(gl.x, gl.y, 12, [CSH_WHITE, '#D9DDE2']);
  const th = cshThrows[b.id];
  if (th) th.gull = true;
  if (cshState !== 'playing') return;
  const pw = CSH_POWERS[gl.kind];
  cshPower = { kind: gl.kind, t: pw.time, max: pw.time };
  cshReload = 0; cshQueued = null;
  cshBubble('SQUAWK!', gl.x, gl.y - 26);
  cshSay(pw.label, pw.col, 1.2, true);
  cshFlash = Math.max(cshFlash, 0.35);
  CSH_SOUND.power();
  cshScore += 50;
}

function cshEat(p, fish) {
  fish.state = 'gone'; fish.t = 0;
  if (p.kind !== 'chonk') { p.kind = 'chonk'; p.r = CSH_CHONK_R; p.m = 2.3; p.speed = Math.min(p.speed, 22); p.shell = 0; }
  p.squash = 0.3;
  cshPuff(p.x, p.y - 10, 8, [CSH_FISH, CSH_WHITE]);
  if (cshState === 'playing') { cshBubble('NOM.', p.x, p.y - p.r * 3.2); CSH_SOUND.nom(); }
}

function cshHitBerg(s, dmg) {
  const b = cshRim[s];
  if (!b) return;
  b.hp -= dmg;
  const q = cshRimPoint((s + 0.5) * CSH_SLOT_A, 2);
  if (b.hp <= 0) {
    cshRim[s] = null;
    cshShards(q.x, q.y, 12);
    if (cshState === 'playing') CSH_SOUND.bergBreak();
  } else {
    cshShards(q.x, q.y, 4);
    if (cshState === 'playing') CSH_SOUND.berg();
  }
}

function cshPlunge(p, ang) {
  p.state = 'plunge'; p.pt = 0; p.ang = ang; p.splashed = false;
  p.fx = p.x; p.fy = p.y; p.vx = p.vy = 0; p.shock = 1;
  if (p.trail && p.trail.length > 1) cshGrooves.push(p.trail);
  p.trail = null;
  if (cshState !== 'playing') return;
  cshCallout(cshPick(CSH_BARKS), p.x, p.y - 34, CSH_WHITE, 12, 1.1);
  const th = cshThrows[p.throwId];
  let dip = 1;
  if (th) { th.plunges++; dip = th.plunges; }
  cshBestDip = Math.max(cshBestDip, dip);
  const pts = CSH_BASE[p.kind] * dip * cshStreakMul();
  cshAddScore(pts, p.x, p.y - 14);
  if (dip >= 2) {
    const lines = CSH_SHOUT_DIP[Math.min(4, dip)];
    cshSay(cshPick(lines) + (dip >= 4 ? ' ×' + dip : ''), CSH_WHITE, 1.1, dip >= 3);
    CSH_SOUND.dip(dip);
    cshFreeze = 0.06;
    cshFlash = Math.max(cshFlash, 0.15 + dip * 0.06);
    cshShake = Math.max(cshShake, 0.12 + dip * 0.05);
    if (Math.random() < 0.6) cshLater(500, () => { if (cshState === 'playing') cshBubble(cshPick(CSH_TAUNT), CSH_YOU_X, CSH_YOU_Y - 46); });
  }
  if (dip >= 3) { cshSlowT = 0.7; cshConfetti(CSH_W / 2, 170, 24 + dip * 6); }
}

function cshAddScore(pts, x, y) {
  cshScore += pts;
  cshCallout('+' + pts, x, y, CSH_GOLD, pts >= 400 ? 19 : 15, 0.9);
}

function cshSink() {
  cshSinking = 0.001;
  cshAim = null; cshCoach = null; cshQueued = null;
  CSH_SOUND.sink();
  cshShake = 0.7; cshFlash = 0.4;
  cshSay('FLOE’S SUNK!', CSH_RED, 1.6, true);
  cshPengs.forEach((p, k) => {
    if (!cshOnIce(p) && p.state !== 'hop') return;
    cshLater(150 + k * 90, () => {
      if (cshOnIce(p) || p.state === 'hop') { const a = Math.atan2(p.y - CSH_FY, p.x - CSH_FX); p.state = 'plunge'; p.pt = 0; p.ang = a; p.splashed = false; p.fx = p.x; p.fy = p.y; p.shock = 1; }
    });
  });
}

function cshGameOver() {
  cshLastScore = cshScore; cshLastDip = cshBestDip; cshLastWave = cshWave;
  cshState = 'over'; cshOverT = 0; cshAim = null; cshCoach = null; cshPower = null;
  CSH_OVER_JINGLE.forEach((f, k) => cshLater(300 + k * 140, () => playSecretBeep(f)));
  cshLater(2300, () => {
    if (cshState !== 'over') return;
    if (cshQualifies(cshLastScore)) { cshInitials = [0, 0, 0]; CSH_SOUND.highScore(); cshEnterStateKeep('nameEntry'); }
    else { cshLastEntry = -1; cshEnterStateKeep('leaderboard'); }
  });
}
function cshEnterStateKeep(next) {
  cshState = next; cshShake = 0; cshPress = null; cshAim = null;
  if (!cshRafHandle) { cshLastT = 0; cshRafHandle = requestAnimationFrame(cshLoop); }
}

function cshQualifies(s) { return s > 0 && (cshScores.length < CSH_TOP_N || s > cshScores[cshScores.length - 1].score); }
function cshSubmit(name, score, dip, wave) {
  const e = { name, score, dip, wave };
  cshScores.push(e);
  cshScores.sort((a, b) => b.score - a.score);
  cshScores = cshScores.slice(0, CSH_TOP_N);
  cshLastEntry = cshScores.indexOf(e);
}

// ── Particles, callouts, bubbles, the announcer ─────────────────────────────
function cshPart(p) { if (cshParts.length < 300) cshParts.push(p); }
function cshPuff(x, y, n, cols) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, s = 20 + Math.random() * 60;
    cshPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 10, life: 0.45, max: 0.45,
      r: 1.5 + Math.random() * 2.5, col: cols[k % cols.length], type: 'dot' });
  }
}
function cshSplash(x, y, size) {
  cshPart({ x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, r: 6, vr: 60 * size, col: CSH_WHITE, type: 'ring' });
  cshPart({ x, y, vx: 0, vy: 0, life: 0.9, max: 0.9, r: 3, vr: 40 * size, col: CSH_ICE_SH, type: 'ring' });
  for (let k = 0; k < Math.round(16 * size); k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = (60 + Math.random() * 130) * size;
    cshPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 420, life: 0.65, max: 0.65,
      r: 1.5 + Math.random() * 2.8, col: k % 3 ? CSH_WHITE : CSH_ICE_SH, type: 'dot' });
  }
}
function cshShards(x, y, n) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, s = 40 + Math.random() * 90;
    cshPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, grav: 260, life: 0.7, max: 0.7,
      r: 2 + Math.random() * 3, col: k % 2 ? CSH_WHITE : CSH_ICE_SH, type: 'shard', rot: Math.random() * 6, spin: (Math.random() - 0.5) * 12 });
  }
}
function cshStars(x, y, n) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.283, s = 50 + Math.random() * 30;
    cshPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, r: 3.5, col: CSH_GOLD, type: 'star', rot: 0, spin: 6 });
  }
}
function cshConfetti(x, y, n) {
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, s = 120 + Math.random() * 220;
    cshPart({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 380, life: 1.4, max: 1.4,
      r: 3 + Math.random() * 2, col: k % 5 === 0 ? CSH_FISH : cshPick(CSH_RAINBOW), type: k % 5 === 0 ? 'fish' : 'confetti', rot: Math.random() * 6, spin: (Math.random() - 0.5) * 16 });
  }
}
function cshCallout(text, x, y, col, size, life) {
  while (cshCallouts.some(c => Math.abs(c.y - y) < size && Math.abs(c.x - x) < 110 && c.life > c.max - 0.5)) y -= size + 4;
  cshCallouts.push({ text, x: Math.max(80, Math.min(CSH_W - 80, x)), y, col, size, life, max: life });
}
function cshBubble(text, x, y) {
  if (cshBubbles.length > 4) cshBubbles.shift();
  cshBubbles.push({ text, x: Math.max(50, Math.min(CSH_W - 50, x)), y: Math.max(70, y), life: 1.1, max: 1.1 });
}
// The announcer: one big line at a time; a louder line cuts in
function cshSay(text, col, life, loud) {
  if (cshShout && cshShout.loud && !loud && cshShout.t < 0.5) return;
  cshShout = { text, col, life: life || 1, t: 0, loud: !!loud, tilt: (Math.random() - 0.5) * 0.16 };
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
const CSH_RGB = {};
function cshRgb(hex) {
  if (!CSH_RGB[hex]) CSH_RGB[hex] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return CSH_RGB[hex];
}
function cshMix(a, b, t) {
  const A = cshRgb(a), B = cshRgb(b);
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
}
function cshEllipse(g, x, y, rx, ry, rot) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
}
function cshRoundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function cshText(g, s, x, y, size, col, align = 'center', outline = 0) {
  g.font = `bold ${size}px monospace`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineWidth = outline; g.lineJoin = 'round'; g.strokeStyle = CSH_INK; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
  g.textBaseline = 'alphabetic';
}
function cshWrap(g, s, maxW, size) {
  g.font = `bold ${size}px monospace`;
  const words = s.split(' '), lines = [];
  let line = '';
  words.forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  if (line) lines.push(line);
  return lines;
}

function cshMakeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const v = 150 + Math.random() * 100;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v + 10;
    img.data[i * 4 + 3] = Math.random() < 0.5 ? Math.random() * 46 : 0;
  }
  x.putImageData(img, 0, 0);
  cshGrain = c;
}

// ── The penguin (one primitive for every pose) ──────────────────────────────
// x,y = footprint centre; r = footprint radius.
function cshPenguin(g, x, y, r, col, o = {}) {
  const pose = o.pose || 'idle', t = o.t || 0, face = o.face || 'happy', wob = o.wob || 0;
  const light = cshMix(col, '#FFFFFF', 0.4), dark = cshMix(col, CSH_INK, 0.32), mask = cshMix(col, '#FFFFFF', 0.8);
  const baseAlpha = o.alpha !== undefined ? o.alpha : 1;
  g.save(); g.translate(x, y);
  if (o.scale !== undefined) g.scale(o.scale, o.scale);
  g.globalAlpha = baseAlpha;
  if (pose === 'slide') { cshPenguinSlide(g, r, col, light, dark, o); g.restore(); return; }
  const water = pose === 'bob';
  if (!water) { g.fillStyle = 'rgba(31,42,54,0.2)'; cshEllipse(g, 0, r * 0.12, r * 1.1, r * 0.48); g.fill(); }
  if (water) {
    g.save();
    g.beginPath(); g.rect(-r * 4, -r * 6, r * 8, r * 6 + r * 0.05); g.clip();
    g.translate(0, r * (o.sink !== undefined ? o.sink : 1.0) + Math.sin(t * 3 + wob) * r * 0.08);
  }
  let sx = 1, sy = 1 + Math.sin(t * 2.6 + wob) * 0.035, rot = 0;
  if (pose === 'squash') { sx = 1.18; sy = 0.8; }
  if (pose === 'plunge') rot = o.spin || 0;
  if (o.walk) rot += Math.sin(t * (o.fastWalk ? 18 : 11) + wob) * 0.11;
  if (o.lean) rot += o.lean;
  if (water) rot += Math.sin(t * 2 + wob) * 0.08;
  if (o.chonk) sx *= 1.12;
  g.rotate(rot); g.scale(sx, sy);
  const H = r * 2.35, by = -H * 0.46, my = by - H * 0.2;
  g.lineJoin = 'round';
  g.fillStyle = CSH_BEAK; g.strokeStyle = CSH_INK; g.lineWidth = 1.2;
  [-1, 1].forEach(sd => {
    const lift = o.walk ? Math.max(0, Math.sin(t * (o.fastWalk ? 18 : 11) + wob + (sd > 0 ? Math.PI : 0))) * r * 0.12 : 0;
    cshEllipse(g, sd * r * 0.42, -r * 0.06 - lift, r * 0.34, r * 0.17); g.fill(); g.stroke();
  });
  const up = pose === 'plunge' ? -2.2 : 0;
  [-1, 1].forEach(sd => {
    let fl = up || 0.22;
    if (o.throwUp && sd === 1) fl = -2.3;
    if (o.flap) fl = -0.6 - Math.abs(Math.sin(t * 18)) * 1.2;
    if (o.armsUp) fl = -1.6 - Math.sin(t * 10) * 0.3;
    g.save(); g.translate(sd * r * 0.88, by - H * 0.08); g.rotate(sd * fl);
    g.fillStyle = dark; cshEllipse(g, sd * r * 0.06, H * 0.17, r * 0.24, H * 0.24, sd * 0.25); g.fill();
    g.strokeStyle = CSH_INK; g.lineWidth = 1.6; g.stroke();
    g.restore();
  });
  const grd = g.createRadialGradient(-r * 0.35, by - H * 0.18, r * 0.2, 0, by, H * 0.62);
  grd.addColorStop(0, light); grd.addColorStop(0.5, col); grd.addColorStop(1, dark);
  g.fillStyle = grd; cshEllipse(g, 0, by, r, H * 0.5); g.fill();
  g.strokeStyle = CSH_INK; g.lineWidth = 2; g.stroke();
  g.fillStyle = CSH_CREAM; cshEllipse(g, 0, by + H * 0.13, r * 0.64 * (o.chonk ? 1.12 : 1), H * 0.32); g.fill();
  g.fillStyle = mask; cshEllipse(g, 0, my, r * 0.68, r * 0.5); g.fill();
  g.fillStyle = CSH_BLUSH; g.globalAlpha = baseAlpha * 0.6;
  cshEllipse(g, -r * 0.46, my + r * 0.18, r * 0.13, r * 0.09); g.fill();
  cshEllipse(g, r * 0.46, my + r * 0.18, r * 0.13, r * 0.09); g.fill();
  g.globalAlpha = baseAlpha;
  cshFace(g, face, r, my, o.look);
  g.fillStyle = CSH_BEAK; g.beginPath();
  g.moveTo(-r * 0.2, my + r * 0.1); g.lineTo(r * 0.2, my + r * 0.1); g.lineTo(0, my + r * 0.42); g.closePath();
  g.fill(); g.strokeStyle = CSH_INK; g.lineWidth = 1.2; g.stroke();
  if (o.springs) {                                    // a Jumpy's coiled-up tuft
    g.strokeStyle = CSH_INK; g.lineWidth = 1.5; g.beginPath();
    for (let k = 0; k <= 8; k++) { const yy = by - H * 0.5 - k * 1.6, xx = Math.sin(k * 1.6 + t * 6) * 2.5; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  if (o.ball) {
    g.fillStyle = CSH_WHITE; g.strokeStyle = CSH_INK; g.lineWidth = 1.4;
    g.beginPath(); g.arc(r * 1.25, by - H * 0.42, r * (o.ballBig ? 0.62 : 0.38), 0, 6.283); g.fill(); g.stroke();
  }
  if (water) {
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    const w = 1 + Math.sin(t * 3 + wob) * 0.06;
    cshEllipse(g, 0, 0, r * 1.25 * w, r * 0.38); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    cshEllipse(g, 0, 0, r * 1.7 * w, r * 0.55); g.stroke();
  }
  g.restore();
}

function cshFace(g, face, r, my, look) {
  const ex = r * 0.27, ey = my - r * 0.06;
  const lx = look !== undefined ? Math.cos(look) * r * 0.07 : 0, ly = look !== undefined ? Math.sin(look) * r * 0.05 : 0;
  g.fillStyle = CSH_INK; g.strokeStyle = CSH_INK; g.lineCap = 'round';
  const brows = (inner, outer, w) => {
    g.lineWidth = w;
    [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(sd * (ex + r * 0.17), ey - r * outer); g.lineTo(sd * (ex - r * 0.12), ey - r * inner); g.stroke(); });
  };
  if (face === 'shock') {
    [-1, 1].forEach(sd => {
      g.fillStyle = CSH_WHITE; cshEllipse(g, sd * ex, ey, r * 0.17, r * 0.19); g.fill();
      g.lineWidth = 1.2; g.stroke();
      g.fillStyle = CSH_INK; cshEllipse(g, sd * ex + lx * 0.5, ey + ly * 0.5, r * 0.07, r * 0.07); g.fill();
    });
  } else if (face === 'focus') {
    g.lineWidth = r * 0.11;
    [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(sd * ex - r * 0.1 + lx, ey + ly); g.lineTo(sd * ex + r * 0.1 + lx, ey + ly); g.stroke(); });
    brows(0.2, 0.3, 1.4);
  } else if (face === 'dizzy') {
    g.lineWidth = 1.4;
    [-1, 1].forEach(sd => {
      g.beginPath(); g.moveTo(sd * ex - r * 0.1, ey - r * 0.1); g.lineTo(sd * ex + r * 0.1, ey + r * 0.1);
      g.moveTo(sd * ex + r * 0.1, ey - r * 0.1); g.lineTo(sd * ex - r * 0.1, ey + r * 0.1); g.stroke();
    });
  } else if (face === 'sleep') {
    g.lineWidth = 1.5;
    [-1, 1].forEach(sd => { g.beginPath(); g.arc(sd * ex, ey - r * 0.04, r * 0.1, 0.2, Math.PI - 0.2); g.stroke(); });
  } else if (face === 'glee') {
    g.lineWidth = 1.6;
    [-1, 1].forEach(sd => { g.beginPath(); g.arc(sd * ex, ey + r * 0.04, r * 0.1, Math.PI + 0.3, -0.3); g.stroke(); });
  } else {
    [-1, 1].forEach(sd => {
      g.fillStyle = CSH_INK; cshEllipse(g, sd * ex + lx, ey + ly, r * 0.09, r * 0.11); g.fill();
      g.fillStyle = CSH_WHITE; cshEllipse(g, sd * ex + lx - r * 0.03, ey + ly - r * 0.04, r * 0.03, r * 0.03); g.fill();
    });
    if (face === 'smug') brows(0.24, 0.16, 1.5);
    if (face === 'grumpy') brows(0.15, 0.3, 1.6);
    if (face === 'hungry') brows(0.1, 0.34, 2.2);
  }
}

function cshPenguinSlide(g, r, col, light, dark, o) {
  g.rotate(o.dir || 0);
  g.fillStyle = 'rgba(31,42,54,0.2)'; cshEllipse(g, 0, r * 0.25, r * 1.45, r * 0.7); g.fill();
  g.fillStyle = CSH_BEAK; g.strokeStyle = CSH_INK; g.lineWidth = 1.2;
  [-1, 1].forEach(sd => { cshEllipse(g, -r * 1.3, sd * r * 0.28, r * 0.28, r * 0.14); g.fill(); g.stroke(); });
  [-1, 1].forEach(sd => {
    g.fillStyle = dark; cshEllipse(g, -r * 0.2, sd * r * 0.82, r * 0.5, r * 0.18, sd * -0.35); g.fill();
    g.lineWidth = 1.5; g.stroke();
  });
  const grd = g.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.15, 0, 0, r * 1.4);
  grd.addColorStop(0, light); grd.addColorStop(0.55, col); grd.addColorStop(1, dark);
  g.fillStyle = grd; cshEllipse(g, 0, 0, r * 1.32, r * 0.8); g.fill();
  g.strokeStyle = CSH_INK; g.lineWidth = 2; g.stroke();
  g.fillStyle = dark; cshEllipse(g, r * 0.95, 0, r * 0.5, r * 0.52); g.fill(); g.lineWidth = 1.6; g.stroke();
  g.fillStyle = CSH_BEAK; g.beginPath();
  g.moveTo(r * 1.35, -r * 0.14); g.lineTo(r * 1.72, 0); g.lineTo(r * 1.35, r * 0.14); g.closePath(); g.fill();
  g.lineWidth = 1.1; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.lineCap = 'round';
  [-0.5, 0, 0.5].forEach((k, i) => {
    const l = r * (0.6 + (i % 2) * 0.4);
    g.beginPath(); g.moveTo(-r * 1.6, k * r); g.lineTo(-r * 1.6 - l, k * r); g.stroke();
  });
}

function cshIceBlock(g, x, y, r) {                    // a Frosty's ice cube
  const w = r * 2.7, h = r * 3.3;
  g.save(); g.translate(x, y - h * 0.42);
  cshRoundRect(g, -w / 2, -h / 2, w, h, 6);
  g.fillStyle = 'rgba(190,230,248,0.5)'; g.fill();
  g.strokeStyle = 'rgba(31,42,54,0.55)'; g.lineWidth = 1.6; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-w / 2 + 5, -h / 2 + 8); g.lineTo(-w / 2 + 5, -h / 2 + 20); g.stroke();
  g.beginPath(); g.moveTo(-w / 2 + 9, -h / 2 + 5); g.lineTo(-w / 2 + 16, -h / 2 + 5); g.stroke();
  g.restore();
}

function cshFishIcon(g, x, y, s, col, rot) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.fillStyle = col; g.strokeStyle = CSH_INK; g.lineWidth = 1.4; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-s * 0.7, 0); g.lineTo(-s * 1.4, -s * 0.55); g.lineTo(-s * 1.4, s * 0.55); g.closePath(); g.fill(); g.stroke();
  cshEllipse(g, 0, 0, s, s * 0.55); g.fill(); g.stroke();
  g.fillStyle = CSH_INK; cshEllipse(g, s * 0.45, -s * 0.1, s * 0.12, s * 0.12); g.fill();
  g.restore();
}

// Power-up badges, drawn (never emoji)
function cshPowerIcon(g, kind, x, y, s) {
  const pw = CSH_POWERS[kind];
  g.save(); g.translate(x, y);
  g.fillStyle = pw.col; g.strokeStyle = CSH_INK; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, s, 0, 6.283); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; cshEllipse(g, -s * 0.3, -s * 0.38, s * 0.42, s * 0.24, -0.4); g.fill();
  const ball = (bx, by, br) => { g.fillStyle = CSH_WHITE; g.strokeStyle = CSH_INK; g.lineWidth = 1.3; g.beginPath(); g.arc(bx, by, br, 0, 6.283); g.fill(); g.stroke(); };
  if (kind === 'double') { ball(-s * 0.3, s * 0.05, s * 0.3); ball(s * 0.3, s * 0.05, s * 0.3); }
  else if (kind === 'spread') { ball(-s * 0.45, s * 0.25, s * 0.22); ball(0, -s * 0.2, s * 0.22); ball(s * 0.45, s * 0.25, s * 0.22); }
  else if (kind === 'boulder') ball(0, 0, s * 0.55);
  else {                                                // a snowflake
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? CSH_WHITE : CSH_INK; g.lineWidth = pass ? 2 : 3.6; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(-Math.cos(a) * s * 0.6, -Math.sin(a) * s * 0.6); g.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6); g.stroke(); }
    }
  }
  g.restore();
}

function cshDrawGull(g, gl) {
  const t = gl.t, flap = Math.sin(t * (gl.hit ? 26 : 9) + gl.wob), dir = gl.vx > 0 ? 1 : -1;
  g.fillStyle = 'rgba(31,42,54,0.18)'; cshEllipse(g, gl.x, gl.y + 48, 16, 4); g.fill();
  if (!gl.hit) {                                        // the power-up it's carrying
    g.strokeStyle = CSH_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(gl.x, gl.y + 4); g.lineTo(gl.x, gl.y + 14); g.stroke();
    cshPowerIcon(g, gl.kind, gl.x, gl.y + 24, 11 + Math.sin(t * 6) * 0.8);
  }
  g.save(); g.translate(gl.x, gl.y); g.scale(dir, 1);
  g.fillStyle = '#C9D2DA'; g.strokeStyle = CSH_INK; g.lineWidth = 1.5; g.lineJoin = 'round';
  [-1, 1].forEach(sd => {
    g.beginPath(); g.moveTo(-4, -2); g.quadraticCurveTo(-2 + sd * 2, -14 * flap * sd - 4, -22, -10 * flap * sd - 6); g.lineTo(-6, 3); g.closePath();
    g.fill(); g.stroke();
  });
  g.fillStyle = CSH_WHITE; cshEllipse(g, 0, 0, 13, 7); g.fill(); g.stroke();
  cshEllipse(g, 11, -5, 6, 5.5); g.fill(); g.stroke();
  g.fillStyle = '#F2B134'; g.beginPath(); g.moveTo(16, -5); g.lineTo(23, -3); g.lineTo(16, -2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = CSH_INK;
  if (gl.hit) { g.lineWidth = 1.2; g.beginPath(); g.moveTo(11, -8); g.lineTo(14, -5); g.moveTo(14, -8); g.lineTo(11, -5); g.stroke(); }
  else { g.beginPath(); g.arc(13, -6, 1.3, 0, 6.283); g.fill(); }
  g.fillStyle = '#C9D2DA'; g.beginPath(); g.moveTo(-12, -2); g.lineTo(-19, 0); g.lineTo(-12, 3); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// ── Scene ────────────────────────────────────────────────────────────────────
function cshDrawWater(g) {
  const grd = g.createLinearGradient(0, 0, 0, CSH_H);
  grd.addColorStop(0, '#5B93B2'); grd.addColorStop(0.35, CSH_DRINK); grd.addColorStop(1, CSH_DRINK_D);
  g.fillStyle = grd; g.fillRect(-40, -40, CSH_W + 80, CSH_H + 80);
  const sun = g.createRadialGradient(270, 20, 10, 270, 20, 260);
  sun.addColorStop(0, 'rgba(255,240,210,0.35)'); sun.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = sun; g.fillRect(0, 0, CSH_W, CSH_H);
  const tt = cshClock / 1000, d = cshDeco;
  if (!d) return;
  g.lineCap = 'round';
  d.waves.forEach(w => {
    const x = (w.x + tt * 4) % (CSH_W + 40) - 20, y = w.y + Math.sin(tt + w.ph) * 3;
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - w.w / 2, y); g.quadraticCurveTo(x, y - 5, x + w.w / 2, y); g.stroke();
  });
  d.glints.forEach(s => {
    const a = 0.12 + 0.3 * Math.max(0, Math.sin(tt * 1.6 + s.ph));
    const x = (s.x + tt * s.sp) % (CSH_W + 20) - 10;
    g.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, s.y); g.lineTo(x + s.len, s.y); g.stroke();
  });
  d.floes.forEach(f => {
    const x = (f.x + tt * f.sp) % (CSH_W + 60) - 30;
    if (Math.hypot(x - CSH_FX, f.y - CSH_FY) < CSH_FR + 40 || Math.hypot(x - CSH_YOU_X, f.y - CSH_YOU_Y) < 50) return;
    g.fillStyle = 'rgba(15,40,60,0.3)'; cshEllipse(g, x + 2, f.y + 4, f.s * 1.3, f.s * 0.7); g.fill();
    g.fillStyle = '#E6F3FA'; cshEllipse(g, x, f.y, f.s * 1.3, f.s * 0.7, f.seed); g.fill();
  });
}

function cshDrawFloe(g) {
  const r = CSH_FR, cx = CSH_FX, d = cshDeco, tt = cshClock / 1000;
  const sinkK = Math.min(1, cshSinking / 1.4);
  const cy = CSH_FY + sinkK * 10;
  const load = Math.min(1, cshOnFloe() / CSH_CAP);
  const creak = cshSinkT > 0 ? Math.sin(cshClock / 50) * cshSinkT * 0.8 : 0;
  g.save(); g.translate(creak, 0);
  g.fillStyle = 'rgba(12,36,56,0.35)'; g.beginPath(); g.arc(cx + 4, cy + 10, r + 10, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3; g.beginPath();
  for (let k = 0; k <= 72; k++) {
    const a = k / 72 * 6.283, rr = r + 9 + Math.sin(a * 7 + tt * 2) * 2 + Math.sin(a * 13 - tt * 3) * 1.2;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    k ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
  g.fillStyle = '#B9D9EA'; g.beginPath(); g.arc(cx, cy + 6 * (1 - load * 0.6), r, 0, 6.283); g.fill();
  const grd = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.7, CSH_ICE); grd.addColorStop(1, '#DDEFF8');
  g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip();
  d.mounds.forEach(m => {
    const mx = cx + Math.cos(m.a) * m.d * r, my = cy + Math.sin(m.a) * m.d * r, s = m.s * r;
    g.fillStyle = 'rgba(150,195,220,0.22)'; cshEllipse(g, mx + s * 0.25, my + s * 0.3, s, s * 0.7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; cshEllipse(g, mx, my, s, s * 0.7); g.fill();
  });
  g.strokeStyle = 'rgba(170,205,225,0.55)'; g.lineWidth = 2; g.lineCap = 'round';
  d.drifts.forEach(dr => { g.beginPath(); g.arc(cx, cy, dr.d * r, dr.a, dr.a + dr.len); g.stroke(); });
  cshGrooves.forEach(tr => {
    g.strokeStyle = 'rgba(140,185,212,0.38)'; g.lineWidth = 8; g.lineJoin = 'round';
    g.beginPath(); tr.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 2;
    g.beginPath(); tr.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
  });
  cshSplats.forEach(s => {
    g.fillStyle = 'rgba(160,200,222,0.45)'; cshEllipse(g, s.x + 1, s.y + 1.5, s.s * 1.1, s.s * 0.7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; cshEllipse(g, s.x, s.y, s.s, s.s * 0.62); g.fill();
    cshEllipse(g, s.x + s.s * 0.9, s.y - s.s * 0.3, s.s * 0.3, s.s * 0.22); g.fill();
  });
  g.strokeStyle = 'rgba(31,42,54,0.17)'; g.lineWidth = 1.2;
  d.cracks.forEach(pts => { g.beginPath(); pts.forEach((p, i) => { const px = cx + p[0] * r, py = cy + p[1] * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); });
  const wash = 4 + load * 20 + sinkK * 120;
  g.strokeStyle = `rgba(46,94,126,${(0.18 + load * 0.3 + sinkK * 0.5).toFixed(3)})`; g.lineWidth = wash * 2;
  g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
  if (cshSinkT > 0) {
    g.strokeStyle = `rgba(31,42,54,${(0.25 + cshSinkT / CSH_SINK_T * 0.5).toFixed(3)})`; g.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + 0.3, len = r * (0.25 + cshSinkT / CSH_SINK_T * 0.6);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.lineTo(cx + Math.cos(a + 0.12) * (r - len * 0.5), cy + Math.sin(a + 0.12) * (r - len * 0.5));
      g.lineTo(cx + Math.cos(a - 0.05) * (r - len), cy + Math.sin(a - 0.05) * (r - len)); g.stroke();
    }
  }
  g.restore();
  g.strokeStyle = 'rgba(31,42,54,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
  g.restore();
}

function cshDrawBergs(g) {
  for (let s = 0; s < CSH_SLOTS; s++) {
    const b = cshRim[s];
    if (!b) continue;
    const a = (s + 0.5) * CSH_SLOT_A, r = CSH_FR;
    const k = 1 - Math.pow(1 - b.rise, 3);
    const arc = CSH_SLOT_A * r * 0.95 * b.size, depth = 16 * b.size * k;
    if (depth < 1) continue;
    const px = CSH_FX + Math.cos(a) * (r + 2), py = CSH_FY + Math.sin(a) * (r + 2);
    const rot = a + Math.PI / 2;
    g.save(); g.translate(px, py + 4); g.rotate(rot);
    cshRoundRect(g, -arc / 2, -depth / 2, arc, depth, 4); g.fillStyle = '#9EC7DD'; g.fill();
    g.restore();
    g.save(); g.translate(px, py); g.rotate(rot);
    cshRoundRect(g, -arc / 2, -depth / 2, arc, depth, 4);
    const gr = g.createLinearGradient(0, -depth / 2, 0, depth / 2);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#D6EAF4');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(31,42,54,0.5)'; g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-arc / 2 + 4, -depth / 2 + 3); g.lineTo(arc / 2 - 6, -depth / 2 + 3); g.stroke();
    const dmg = b.maxHp - b.hp;
    if (dmg > 0) {
      g.strokeStyle = CSH_INK; g.lineWidth = 1.2; g.globalAlpha = 0.6;
      for (let c = 0; c < dmg; c++) {
        const ox = (b.seed - 0.5) * arc * 0.5 + c * 7 - 3;
        g.beginPath(); g.moveTo(ox, -depth / 2); g.lineTo(ox + 3, -2); g.lineTo(ox - 2, 2); g.lineTo(ox + 2, depth / 2); g.stroke();
      }
      g.globalAlpha = 1;
    }
    g.restore();
  }
}

function cshPengPose(p) {
  const o = { t: p.t, wob: p.wob, face: 'smug', pose: 'idle', chonk: p.kind === 'chonk', springs: p.kind === 'jumpy' };
  if (p.state === 'swim') { o.pose = 'bob'; o.face = 'grumpy'; o.alpha = Math.max(0, 1 - p.swim / 1.8); return o; }
  if (p.state === 'plunge') { o.pose = 'plunge'; o.face = 'shock'; o.spin = (Math.cos(p.ang) < 0 ? -1 : 1) * p.pt * 1.6; return o; }
  if (p.state === 'hop') { o.face = 'glee'; o.flap = true; return o; }
  if (p.state === 'slide') {
    if (Math.hypot(p.vx, p.vy) > 90) { o.pose = 'slide'; o.dir = Math.atan2(p.vy, p.vx); return o; }
    o.face = 'shock';
  }
  if (p.state === 'sleep') { o.face = 'sleep'; return o; }
  if (p.state === 'dizzy') { o.face = 'dizzy'; o.lean = Math.sin(p.t * 9) * 0.12; return o; }
  if (p.state === 'walk') {
    const hungry = cshLiveFish().length > 0;
    const moving = hungry || Math.hypot(p.tx - p.x, p.ty - p.y) > 3 || !!p.follow;
    if (p.kind === 'slider' && moving && p.mdx !== undefined) { o.pose = 'slide'; o.dir = Math.atan2(p.mdy, p.mdx); return o; }
    o.walk = moving; o.fastWalk = hungry;
    if (hungry) o.face = 'hungry';
    else if (p.kind === 'chick' || p.follow) { o.face = 'glee'; o.armsUp = true; }
    else o.look = Math.atan2(CSH_YOU_Y - p.y, CSH_YOU_X - p.x);
  }
  if (p.squash > 0) o.pose = 'squash';
  if (p.shock > 0) o.face = 'shock';
  return o;
}

function cshDrawPenguins(g) {
  const list = [];
  cshPengs.forEach(p => {
    if (p.state === 'hop' && p.hopT < 0) return;
    let x = p.x, y = p.y;
    const extra = {};
    if (p.state === 'hop') {
      const e = Math.min(1, p.hopT);
      x = p.hx + (p.x - p.hx) * e; y = p.hy + (p.y - p.hy) * e - Math.sin(e * Math.PI) * 30;
    }
    if (p.state === 'plunge') {
      const e = Math.min(1, p.pt / 0.55), to = cshRimPoint(p.ang, p.r * 0.6);
      if (p.pt < 0.55) { x = p.fx + (to.x - p.fx) * e; y = p.fy + (to.y - p.fy) * e - Math.sin(e * Math.PI) * 18; extra.scale = 1 - e * 0.15; }
      else { x = to.x; y = to.y; extra.pose = 'bob'; extra.face = 'shock'; extra.alpha = Math.min(1, (p.pt - 0.6) / 0.3); }
    }
    list.push({ p, x, y, extra });
  });
  list.sort((a, b) => a.y - b.y);
  const hungry = cshLiveFish().some(f => f.state === 'rest');
  list.forEach(({ p, x, y, extra }) => {
    if (extra.alpha !== undefined && extra.alpha <= 0) return;
    const o = Object.assign(cshPengPose(p), extra);
    cshPenguin(g, x, y, p.r, p.col, o);
    if (p.shell > 0 && (cshOnIce(p) || p.state === 'hop')) cshIceBlock(g, x, y, p.r);
    if (p.state === 'sleep') {
      for (let k = 0; k < 2; k++) {
        const ph = (p.t * 0.6 + k * 0.5) % 1;
        g.globalAlpha = Math.sin(ph * Math.PI);
        cshText(g, 'z', x + 12 + ph * 10, y - p.r * 2.7 - ph * 16, 10 + k * 3, CSH_INK);
      }
      g.globalAlpha = 1;
    }
    if (p.state === 'walk' && hungry) {
      cshFishIcon(g, x - 4, y - p.r * 3.1, 4, CSH_FISH);
      cshText(g, '!', x + 6, y - p.r * 3.1, 11, CSH_RED, 'center', 3);
    }
  });
}

function cshDrawFish(g) {
  const tt = cshClock / 1000;
  cshFishes.forEach((f, k) => {
    if (f.state === 'gone' || f.t < 0) return;
    if (f.state === 'land') {
      const e = Math.min(1, f.t), x = f.fromX + (f.x - f.fromX) * e, y = f.fromY + (f.y - f.fromY) * e - Math.sin(e * Math.PI) * 50;
      cshFishIcon(g, x, y, 10, CSH_FISH, e * 9);
      return;
    }
    g.fillStyle = 'rgba(31,42,54,0.2)'; cshEllipse(g, f.x, f.y + 5, 10, 3.5); g.fill();
    const flop = Math.sin(tt * 14 + k) * 0.35, hop = Math.abs(Math.sin(tt * 7 + k)) * 4;
    cshFishIcon(g, f.x, f.y - hop, 10, CSH_FISH, flop);
  });
}

function cshDrawYou(g) {
  const t = cshClock / 1000;
  const aiming = cshAim && cshAim.power > 0.02;
  const o = { pose: 'bob', t, wob: 0, face: aiming ? 'focus' : 'grumpy', sink: 0.72 };
  if (aiming) { o.throwUp = true; o.look = Math.atan2(cshAim.dy, cshAim.dx); }
  if (cshYouThrowT > 0) o.throwUp = true;
  const live = cshState === 'playing' || cshState === 'attract';
  o.ball = cshReload <= 0 && cshYouThrowT <= 0 && cshSinking === 0 && live;
  o.ballBig = !!(cshPower && cshPower.kind === 'boulder');
  if (cshPower && live) {                                 // powered up: a glow in the power's colour
    const col = CSH_POWERS[cshPower.kind].col;
    g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 10);
    const gr = g.createRadialGradient(CSH_YOU_X, CSH_YOU_Y - 8, 4, CSH_YOU_X, CSH_YOU_Y - 8, 46);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(CSH_YOU_X - 50, CSH_YOU_Y - 60, 100, 100); g.restore();
  }
  cshPenguin(g, CSH_YOU_X, CSH_YOU_Y, CSH_YOU_R, CSH_YOU, o);
  if (cshState === 'playing' && cshReload > 0 && !(cshPower && cshPower.kind === 'blizzard')) {   // re-pack ring
    const k = 1 - cshReload / CSH_RELOAD, bx = CSH_YOU_X + 22, by = CSH_YOU_Y - 30;
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, 7, 0, 6.283); g.stroke();
    g.strokeStyle = CSH_WHITE; g.beginPath(); g.arc(bx, by, 7, -Math.PI / 2, -Math.PI / 2 + k * 6.283); g.stroke();
  }
}

function cshDrawAim(g) {
  cshAimGhost = null;
  if (!cshAim) return;                                    // shown from the first touch, starting straight up
  const dx = cshAim.dx, dy = cshAim.dy;
  const sx = CSH_YOU_X + dx * 20, sy = CSH_YOU_Y - 18;
  let hitT = 900, hitP = null;
  cshPengs.forEach(p => {
    if (!cshOnIce(p)) return;
    const fx = sx - p.x, fy = sy - p.y, R = p.r + CSH_BALL_R;
    const b = fx * dx + fy * dy, c = fx * fx + fy * fy - R * R, disc = b * b - c;
    if (disc < 0) return;
    const t = -b - Math.sqrt(disc);
    if (t > 0 && t < hitT) { hitT = t; hitP = p; }
  });
  const len = hitP ? hitT : Math.min(520, 160 + cshAim.power * 360);
  const offs = cshPower && cshPower.kind === 'spread' ? [-0.22, 0, 0.22] : [0];
  const col = cshPower ? CSH_POWERS[cshPower.kind].col : CSH_WHITE;
  offs.forEach(off => {
    const c = Math.cos(off), s = Math.sin(off), ldx = dx * c - dy * s, ldy = dx * s + dy * c;
    const L = off ? Math.min(len, 260) : len;
    const ex = sx + ldx * L, ey = sy + ldy * L;
    g.setLineDash([2, 7]); g.lineCap = 'round';
    g.strokeStyle = CSH_INK; g.globalAlpha = off ? 0.3 : 0.6; g.lineWidth = 6;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.globalAlpha = off ? 0.6 : 1; g.strokeStyle = col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
  });
  if (hitP) cshAimGhost = { p: hitP, dx, dy, power: cshAim.power };
}

function cshDrawAimGhost(g) {
  const a = cshAimGhost;
  if (!a) return;
  const p = a.p, L = 18 + a.power * 34;
  g.strokeStyle = CSH_GOLD; g.lineWidth = 2.5; g.setLineDash([4, 4]);
  g.beginPath(); g.arc(p.x, p.y - p.r * 1.1, p.r * 1.45, 0, 6.283); g.stroke(); g.setLineDash([]);
  const x = p.x + a.dx * p.r, y = p.y + a.dy * p.r, ex = x + a.dx * L, ey = y + a.dy * L;
  g.strokeStyle = CSH_INK; g.lineWidth = 5; g.globalAlpha = 0.4;
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); g.globalAlpha = 1;
  g.strokeStyle = CSH_GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  const px = -a.dy, py = a.dx;
  g.fillStyle = CSH_GOLD; g.strokeStyle = CSH_INK; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(ex + a.dx * 9, ey + a.dy * 9); g.lineTo(ex + px * 7, ey + py * 7); g.lineTo(ex - px * 7, ey - py * 7); g.closePath(); g.fill(); g.stroke();
}

function cshDrawBalls(g) {
  cshBalls.forEach(b => {
    const h = 10 + Math.sin(Math.min(1, b.t * 2.2) * Math.PI) * 10;
    g.fillStyle = 'rgba(31,42,54,0.22)'; cshEllipse(g, b.x, b.y + 3, b.r * 0.9, b.r * 0.35); g.fill();
    g.fillStyle = CSH_WHITE; g.strokeStyle = CSH_INK; g.lineWidth = b.big ? 2 : 1.4;
    g.beginPath(); g.arc(b.x, b.y - h, b.r, 0, 6.283); g.fill(); g.stroke();
    if (b.big) {
      g.fillStyle = 'rgba(160,200,222,0.6)'; cshEllipse(g, b.x + 3, b.y - h + 4, 5, 3); g.fill();
      cshEllipse(g, b.x - 4, b.y - h - 2, 3, 2); g.fill();
    }
  });
}

function cshDrawParts(g) {
  cshParts.forEach(p => {
    const a = Math.max(0, p.life / p.max);
    g.globalAlpha = a;
    if (p.type === 'ring') {
      g.strokeStyle = p.col; g.lineWidth = 2.5; cshEllipse(g, p.x, p.y, p.r, p.r * 0.45); g.stroke();
    } else if (p.type === 'shard') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillStyle = p.col; g.strokeStyle = 'rgba(31,42,54,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-p.r, -p.r * 0.6); g.lineTo(p.r, -p.r * 0.2); g.lineTo(0, p.r); g.closePath(); g.fill(); g.stroke();
      g.restore();
    } else if (p.type === 'star') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col;
      g.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? p.r * 0.45 : p.r, aa = k / 10 * 6.283; k ? g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : g.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      g.closePath(); g.fill(); g.restore();
    } else if (p.type === 'confetti') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col;
      g.fillRect(-p.r, -p.r * 0.45, p.r * 2, Math.max(0.6, p.r * 0.9 * Math.abs(Math.cos(p.rot * 2)))); g.restore();
    } else if (p.type === 'fish') {
      cshFishIcon(g, p.x, p.y, 5, CSH_FISH, p.rot);
    } else {
      g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
  });
  g.globalAlpha = 1;
}

function cshDrawCallouts(g) {
  cshCallouts.forEach(c => {
    const age = c.max - c.life;
    g.globalAlpha = Math.min(1, c.life / 0.35);
    const pop = age < 0.12 ? 0.7 + age / 0.12 * 0.3 : 1;
    cshText(g, c.text, c.x, c.y, Math.round(c.size * pop), c.col, 'center', Math.max(4, c.size / 4.5));
  });
  g.globalAlpha = 1;
}

function cshDrawBubbles(g) {
  cshBubbles.forEach(b => {
    const age = b.max - b.life, pop = age < 0.1 ? 0.6 + age * 4 : 1;
    g.save(); g.globalAlpha = Math.min(1, b.life / 0.25); g.translate(b.x, b.y); g.scale(pop, pop);
    g.font = 'bold 11px monospace';
    const w = g.measureText(b.text).width + 14, h = 20;
    cshRoundRect(g, -w / 2, -h / 2, w, h, 8);
    g.fillStyle = CSH_WHITE; g.fill(); g.strokeStyle = CSH_INK; g.lineWidth = 1.6; g.stroke();
    g.beginPath(); g.moveTo(-4, h / 2 - 1); g.lineTo(0, h / 2 + 6); g.lineTo(4, h / 2 - 1); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = CSH_WHITE; g.fillRect(-4, h / 2 - 2.5, 8, 2.2);
    cshText(g, b.text, 0, 0.5, 11, CSH_INK);
    g.restore();
  });
}

function cshDrawFlakes(g) {
  const blizz = cshPower && cshPower.kind === 'blizzard';
  g.fillStyle = 'rgba(255,255,255,0.8)';
  cshFlakes.forEach(f => {
    if (f.heavy && !blizz) return;
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
  });
}

function cshDraw() {
  const g = cshCtx;
  g.fillStyle = CSH_DRINK; g.fillRect(0, 0, CSH_W, CSH_H);
  g.save();
  if (cshShake > 0) { const k = Math.min(1, cshShake * 4) * 5; g.translate((Math.random() - 0.5) * k * 2, (Math.random() - 0.5) * k * 2); }
  cshDrawWater(g);
  cshDrawFloe(g);
  cshDrawBergs(g);
  cshDrawFish(g);
  cshDrawAim(g);
  cshDrawPenguins(g);
  cshDrawAimGhost(g);
  cshDrawYou(g);
  cshDrawBalls(g);
  cshGulls.forEach(gl => cshDrawGull(g, gl));
  cshDrawParts(g);
  cshDrawFlakes(g);
  cshDrawCallouts(g);
  cshDrawBubbles(g);
  g.restore();
  if (!cshGrainPat && cshGrain) cshGrainPat = g.createPattern(cshGrain, 'repeat');
  if (cshGrainPat) {
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55;
    g.fillStyle = cshGrainPat; g.fillRect(0, 0, CSH_W, CSH_H); g.restore();
  }
  const danger = cshState === 'playing' ? Math.min(1, cshSinkT / CSH_SINK_T) : 0;
  const vg = g.createRadialGradient(CSH_W / 2, CSH_H * 0.45, CSH_H * 0.3, CSH_W / 2, CSH_H * 0.45, CSH_H * 0.75);
  vg.addColorStop(0, 'rgba(10,25,40,0)');
  vg.addColorStop(1, danger > 0 ? `rgba(200,30,40,${(0.3 + danger * 0.35 + Math.sin(cshClock / 120) * 0.1).toFixed(3)})` : 'rgba(10,25,40,0.35)');
  g.fillStyle = vg; g.fillRect(0, 0, CSH_W, CSH_H);
  if (cshFlash > 0) { g.fillStyle = `rgba(255,255,255,${(cshFlash * 0.6).toFixed(3)})`; g.fillRect(0, 0, CSH_W, CSH_H); }

  if (cshState === 'attract') cshDrawAttract(g);
  else if (cshState === 'playing' || cshState === 'over') {
    cshDrawHud(g);
    if (cshState === 'playing') { cshDrawBottom(g); cshDrawBanner(g); }
    cshDrawShout(g);
    if (cshState === 'over') cshDrawOver(g);
  }
  else if (cshState === 'nameEntry') cshDrawNameEntry(g);
  else if (cshState === 'leaderboard') cshDrawLeaderboard(g);
}

// ── HUD + screens ────────────────────────────────────────────────────────────
function cshDrawHud(g) {
  g.fillStyle = 'rgba(20,34,48,0.62)'; g.fillRect(0, 0, CSH_W, 54);
  g.fillStyle = 'rgba(142,202,230,0.5)'; g.fillRect(0, 54, CSH_W, 1.5);
  const bump = cshScore - cshScoreShown > 1 ? 1.08 : 1;
  cshText(g, String(Math.round(cshScoreShown)), 14, 22, Math.round(26 * bump), CSH_WHITE, 'left', 5);
  cshText(g, 'WAVE ' + cshWave, 14, 44, 10, CSH_GLACIER, 'left');
  const mul = cshStreakMul();
  if (mul > 1) {
    const pulse = 1 + Math.sin(cshClock / 90) * 0.05;
    g.save(); g.translate(94, 44); g.scale(pulse, pulse);
    cshRoundRect(g, -26, -7, 52, 14, 7); g.fillStyle = CSH_GOLD; g.fill(); g.strokeStyle = CSH_INK; g.lineWidth = 1.2; g.stroke();
    cshText(g, 'ROLL ×' + mul, 0, 0.5, 9, CSH_INK);
    g.restore();
  }
  if (cshPower) {                                         // the power-up, in the middle
    const pw = CSH_POWERS[cshPower.kind];
    cshPowerIcon(g, cshPower.kind, 148, 26, 12);
    cshText(g, pw.name, 166, 19, 10, pw.col, 'left', 3);
    const k = Math.max(0, cshPower.t / cshPower.max);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(166, 28, 50, 5);
    g.fillStyle = pw.col; g.fillRect(166, 28, 50 * k, 5);
  }
  const load = cshOnFloe(), danger = load >= CSH_CAP - 1;
  cshText(g, 'ICE LOAD', CSH_W - 14, 15, 10, danger ? CSH_RED : CSH_DIM, 'right');
  for (let k = 0; k < CSH_CAP; k++) {
    const x = CSH_W - 18 - (CSH_CAP - 1 - k) * 15, y = 36;
    const on = k < load;
    const flash = on && danger && Math.floor(cshClock / 160) % 2;
    g.fillStyle = on ? (flash ? CSH_RED : (load >= CSH_CAP ? CSH_RED : k >= 5 ? '#FFB703' : CSH_GLACIER)) : 'rgba(255,255,255,0.12)';
    cshEllipse(g, x, y, 6, 7); g.fill();
    g.strokeStyle = on ? CSH_INK : 'rgba(255,255,255,0.3)'; g.lineWidth = 1.4; g.stroke();
    if (on) { g.fillStyle = CSH_CREAM; cshEllipse(g, x, y + 2, 3.4, 4.2); g.fill(); }
  }
  if (cshSinkT > 0) {
    const k = Math.min(1, cshSinkT / CSH_SINK_T);
    g.fillStyle = CSH_RED; g.fillRect(CSH_W - 133, 50, 119 * k, 3);
  }
}

function cshDrawBottom(g) {
  if (cshCoach) {
    const lines = cshWrap(g, cshCoach, 296, 12), h = lines.length * 17 + 18, y = 64;
    g.globalAlpha = Math.min(1, cshCoachT / 0.4);
    cshRoundRect(g, 20, y, 320, h, 12);
    g.fillStyle = 'rgba(255,255,255,0.93)'; g.fill();
    g.strokeStyle = CSH_GLACIER; g.lineWidth = 2.5; g.stroke();
    lines.forEach((l, i) => cshText(g, l, CSH_W / 2, y + 17 + i * 17, 12, CSH_INK));
    g.globalAlpha = 1;
  }
  if (cshAim) {
    const p = cshAim.power, x = 70, y = 616, w = 220, h = 10;
    cshRoundRect(g, x, y, w, h, 5); g.fillStyle = 'rgba(20,34,48,0.55)'; g.fill();
    if (p > 0) { cshRoundRect(g, x, y, Math.max(h, w * p), h, 5); g.fillStyle = p < CSH_MIN_POWER ? '#7F96A6' : cshMix(CSH_GLACIER, CSH_RED, Math.max(0, (p - 0.6) / 0.4)); g.fill(); }
    cshRoundRect(g, x, y, w, h, 5); g.strokeStyle = p >= 0.95 ? CSH_GOLD : 'rgba(255,255,255,0.7)'; g.lineWidth = p >= 0.95 ? 2.5 : 1.5; g.stroke();
    // how hard it'll land: a flick is a lob, only a full wind-up really shoves
    if (p >= CSH_MIN_POWER) {
      const full = p >= 0.95, pulse = full ? 1 + Math.sin(cshClock / 70) * 0.08 : 1;
      const label = full ? 'FULL POWER!' : p >= 0.6 ? 'STRONG' : p >= 0.3 ? 'MEDIUM' : 'LOB';
      cshText(g, label, CSH_W / 2, y - 12, Math.round((full ? 13 : 11) * pulse), full ? CSH_GOLD : CSH_WHITE, 'center', 3);
    }
  }
}

function cshDrawBanner(g) {
  const b = cshBanner;
  if (!b) return;
  const t = b.t, inK = 1 - Math.pow(1 - Math.min(1, t / 0.3), 3), outK = t > 1.8 ? Math.min(1, (t - 1.8) / 0.4) : 0;
  const x = (1 - inK) * -CSH_W - outK * outK * CSH_W * -1, y = 214;
  g.save(); g.translate(x, y); g.rotate(-0.05);
  g.fillStyle = 'rgba(20,34,48,0.9)'; g.fillRect(-40, -40, CSH_W + 80, 80);
  g.fillStyle = CSH_GLACIER; g.fillRect(-40, -40, CSH_W + 80, 4); g.fillRect(-40, 36, CSH_W + 80, 4);
  g.fillStyle = 'rgba(142,202,230,0.12)';
  for (let k = 0; k < 13; k++) g.fillRect(-40 + k * 40 + ((t * 120) % 40), -36, 18, 72);
  cshText(g, 'WAVE ' + b.wave, CSH_W / 2, -10, 36, CSH_WHITE, 'center', 7);
  cshText(g, b.sub, CSH_W / 2, 22, 15, CSH_GOLD, 'center', 4);
  g.restore();
}

function cshDrawShout(g) {
  const s = cshShout;
  if (!s || cshBanner) return;
  const t = s.t, pop = t < 0.14 ? 1.7 - (t / 0.14) * 0.7 : 1 + Math.sin(t * 12) * 0.03 * (1 - t / s.life);
  const a = t > s.life - 0.25 ? Math.max(0, (s.life - t) / 0.25) : 1;
  const size = s.text.length > 16 ? 22 : s.text.length > 12 ? 27 : 32;
  g.save(); g.globalAlpha = a; g.translate(CSH_W / 2, 150); g.rotate(s.tilt); g.scale(pop, pop);
  g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 10; g.strokeStyle = 'rgba(10,20,30,0.45)'; g.strokeText(s.text, 3, 4);
  g.lineWidth = 8; g.strokeStyle = CSH_INK; g.strokeText(s.text, 0, 0);
  if (s.loud) {                                          // loud lines get the rainbow
    const w = g.measureText(s.text).width;
    let x = -w / 2;
    g.textAlign = 'left';
    [...s.text].forEach((ch, i) => {
      g.fillStyle = CSH_RAINBOW[(i + Math.floor(cshClock / 80)) % CSH_RAINBOW.length];
      g.fillText(ch, x, 0); x += g.measureText(ch).width;
    });
  } else { g.fillStyle = s.col; g.fillText(s.text, 0, 0); }
  g.restore();
  g.textBaseline = 'alphabetic';
}

function cshPanel(g, x, y, w, h) {
  cshRoundRect(g, x, y, w, h, 16);
  g.fillStyle = 'rgba(22,38,54,0.95)'; g.fill();
  g.strokeStyle = CSH_GLACIER; g.lineWidth = 3; g.stroke();
}

function cshDrawButton(r, label, size = 22) {
  const g = cshCtx;
  cshRoundRect(g, r.x, r.y, r.w, r.h, 12);
  g.fillStyle = 'rgba(142,202,230,0.2)'; g.fill();
  g.strokeStyle = CSH_GLACIER; g.lineWidth = 3; g.stroke();
  cshText(g, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, CSH_WHITE, 'center', 4);
}

function cshDrawAttract(g) {
  const t = cshClock / 1000;
  g.fillStyle = 'rgba(12,26,40,0.35)'; g.fillRect(0, 0, CSH_W, CSH_H);
  g.save(); g.translate(CSH_W / 2, 196); g.rotate(-0.05 + Math.sin(t * 1.2) * 0.012);
  const bob = Math.sin(t * 2.4) * 3;
  cshText(g, 'COLD', -4, -28 + bob, 62, CSH_WHITE, 'center', 10);
  cshText(g, 'SHOT', 8, 32 - bob, 62, CSH_GLACIER, 'center', 10);
  g.restore();
  cshText(g, 'They shoved you in. Get even.', CSH_W / 2, 280, 14, CSH_WHITE, 'center', 4);
  const kinds = Object.keys(CSH_POWERS);
  kinds.forEach((k, i) => {
    const x = 63 + i * 78, y = 420 + Math.sin(t * 3 + i) * 2;
    cshPowerIcon(g, k, x, y, 13);
    cshText(g, CSH_POWERS[k].name, x, y + 23, 9, CSH_WHITE, 'center', 3);
  });
  cshText(g, 'SNOWBALL THE GULLS FOR POWER-UPS', CSH_W / 2, 468, 10, CSH_GOLD, 'center', 3);
  cshText(g, 'TOUCH TO AIM · PULL DOWN · LET GO', CSH_W / 2, 490, 10, CSH_WHITE, 'center', 3);
  const pulse = 1 + Math.sin(t * 5) * 0.03, cx = CSH_BTN_PLAY.x + CSH_BTN_PLAY.w / 2, cy = CSH_BTN_PLAY.y + CSH_BTN_PLAY.h / 2;
  g.save(); g.translate(cx, cy); g.scale(pulse, pulse); g.translate(-cx, -cy);
  cshDrawButton(CSH_BTN_PLAY, 'GET EVEN', 26);
  g.restore();
  if (cshScores.length) cshText(g, 'BEST  ' + cshScores[0].score, CSH_W / 2, 630, 12, CSH_DIM, 'center', 3);
}

function cshDrawOver(g) {
  if (cshOverT < 0.3) return;
  g.fillStyle = 'rgba(12,26,40,0.5)'; g.fillRect(0, 0, CSH_W, CSH_H);
  cshText(g, 'FLOE’S SUNK.', CSH_W / 2, 230, 30, CSH_WHITE, 'center', 6);
  cshText(g, 'Everyone back to the water.', CSH_W / 2, 266, 14, CSH_ICE_SH, 'center', 4);
  cshText(g, String(cshLastScore), CSH_W / 2, 330, 52, CSH_GOLD, 'center', 8);
  cshText(g, 'REACHED WAVE ' + cshLastWave + (cshLastDip >= 2 ? '  ·  BIGGEST DIP ×' + cshLastDip : ''), CSH_W / 2, 378, 12, CSH_WHITE, 'center', 4);
}

function cshDrawNameEntry(g) {
  cshPanel(g, 24, 120, 312, 400);
  cshText(g, 'TOP HECKLER!', CSH_W / 2, 168, 28, CSH_GLACIER, 'center', 5);
  cshText(g, String(cshLastScore), CSH_W / 2, 212, 30, CSH_GOLD);
  cshText(g, 'SIGN THE ICE', CSH_W / 2, 262, 15, CSH_DIM);
  CSH_SLOTS_UI.forEach((r, k) => {
    cshRoundRect(g, r.x, r.y, r.w, r.h, 10);
    g.fillStyle = 'rgba(244,250,253,0.08)'; g.fill();
    g.strokeStyle = CSH_GLACIER; g.lineWidth = 3; g.stroke();
    cshText(g, CSH_ALPHABET[cshInitials[k]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, CSH_WHITE);
  });
  cshText(g, 'TAP A LETTER TO CHANGE IT', CSH_W / 2, 406, 12, CSH_DIM);
  cshDrawButton(CSH_BTN_OK, 'SIGN');
}

function cshDrawLeaderboard(g) {
  cshPanel(g, 14, 96, 332, 516);
  cshText(g, 'THE HECKLERS', CSH_W / 2, 144, 28, CSH_GLACIER, 'center', 5);
  cshText(g, 'BEST SHOTS FROM THE DRINK', CSH_W / 2, 174, 12, CSH_DIM);
  for (let k = 0; k < CSH_TOP_N; k++) {
    const y = 222 + k * 46, e = cshScores[k];
    const col = k === cshLastEntry ? CSH_GOLD : e ? CSH_WHITE : CSH_DIM;
    cshText(g, String(k + 1), 36, y, 20, col, 'left');
    cshText(g, e ? e.name : '---', 62, y, 22, col, 'left');
    if (e) cshText(g, 'W' + e.wave + (e.dip >= 2 ? ' ×' + e.dip : ''), 164, y, 11, CSH_GLACIER, 'left');
    if (e) cshText(g, String(e.score), 324, y, 22, col, 'right');
  }
  cshText(g, 'THIS RUN  ' + cshLastScore, CSH_W / 2, 470, 16, CSH_WHITE);
  cshDrawButton(CSH_BTN_LB_AGAIN, 'ANOTHER GO', 18);
  cshDrawButton(CSH_BTN_LB_MENU, 'WADDLE OFF', 14);
}

// ── Input ────────────────────────────────────────────────────────────────────
function cshToLogical(e) {
  const r = cshCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * CSH_W / r.width, y: (e.clientY - r.top) * CSH_H / r.height };
}
function cshHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function cshSubmitInitials() {
  CSH_SOUND.select();
  cshSubmit(cshInitials.map(i => CSH_ALPHABET[i]).join(''), cshLastScore, cshLastDip, cshLastWave);
  cshEnterStateKeep('leaderboard');
}

function cshOnDown(p) {
  if (cshState === 'attract') { if (cshHit(CSH_BTN_PLAY, p)) { CSH_SOUND.select(); cshEnterState('playing'); } return; }
  if (cshState === 'playing') {
    if (!cshSinking) {
      // Where you touch sets the starting aim: the line points from your penguin at your finger
      const base = Math.max(-CSH_AIM_MAX, Math.min(CSH_AIM_MAX, Math.atan2(p.x - CSH_YOU_X, Math.max(1, CSH_YOU_Y - 18 - p.y))));
      cshAim = { ax: p.x, ay: p.y, base, power: 0, dx: Math.sin(base), dy: -Math.cos(base), step: 0 };
    }
    return;
  }
  if (cshState === 'nameEntry') {
    for (let i = 0; i < CSH_SLOTS_UI.length; i++) {
      if (cshHit(CSH_SLOTS_UI[i], p)) { cshInitials[i] = (cshInitials[i] + 1) % 26; CSH_SOUND.select(); return; }
    }
    if (cshHit(CSH_BTN_OK, p)) cshSubmitInitials();
    return;
  }
  if (cshState === 'leaderboard') {
    if (cshHit(CSH_BTN_LB_AGAIN, p)) { CSH_SOUND.select(); cshEnterState('playing'); return; }
    if (cshHit(CSH_BTN_LB_MENU, p))  { CSH_SOUND.select(); cshEnterState('attract'); }
  }
}

function cshOnMove(p) {
  if (cshState !== 'playing' || !cshAim) return;
  // Two separate dials from where you touched: sideways fine-tunes the aim,
  // downward only adds power — so pulling harder never swings the aim.
  const side = p.x - cshAim.ax, down = Math.max(0, p.y - cshAim.ay);
  cshAim.power = Math.min(1, down / CSH_MAX_PULL);
  const a = Math.max(-CSH_AIM_MAX, Math.min(CSH_AIM_MAX, cshAim.base + side / CSH_AIM_SPAN * CSH_AIM_MAX));
  cshAim.dx = Math.sin(a); cshAim.dy = -Math.cos(a);
  const step = Math.floor(cshAim.power * 5);
  if (step !== cshAim.step) { if (step > cshAim.step) CSH_SOUND.aimStep(step); cshAim.step = step; }
}

function cshOnUp() {
  const a = cshAim;
  cshAim = null;
  if (cshState !== 'playing' || !a || cshSinking) return;
  if (a.power < CSH_MIN_POWER) return;
  if (cshPower && cshPower.kind === 'blizzard') return;        // the spray already did the work
  if (cshReload > 0) { cshQueued = { dx: a.dx, dy: a.dy, power: a.power }; return; }   // fires the moment it's packed
  cshThrow(a.dx, a.dy, a.power);
}

function cshStagePointer(e, phase) {
  if (phase === 'down') {
    if (cshPtrId !== null) return;                 // second finger ignored
    cshPtrId = e.pointerId;
    cshOnDown(cshToLogical(e));
    return;
  }
  if (e.pointerId !== cshPtrId) return;
  if (phase === 'move') { cshOnMove(cshToLogical(e)); return; }
  if (phase === 'up') cshOnUp(); else cshAim = null;   // a cancel never throws
  cshPtrId = null; cshPress = null;
}

(function cshBindInput() {
  const stage = document.getElementById('csh-stage');
  stage.addEventListener('pointerdown',  e => { stage.setPointerCapture(e.pointerId); cshStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) cshStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => cshStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => cshStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => { if (e.pointerId === cshPtrId) cshStagePointer(e, 'cancel'); });
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-coldshot').style.display !== 'none';
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (cshState === 'attract' || cshState === 'leaderboard') { CSH_SOUND.select(); cshEnterState('playing'); }
      else if (cshState === 'nameEntry') cshSubmitInitials();
    }
  });
  document.getElementById('btn-csh-exit').addEventListener('click', () => { resetArcadeColdShot(); arcExitCabinet(); });   // back to the Arcade room
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (cshRafHandle) { cancelAnimationFrame(cshRafHandle); cshRafHandle = null; }
      cshPress = null; cshPtrId = null; cshAim = null;
    } else if (!cshRafHandle) { cshLastT = 0; cshRafHandle = requestAnimationFrame(cshLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function cshResize() {
  if (!cshCanvas) return;
  const box = cshCanvas.parentElement;
  const scale = Math.min(box.clientWidth / CSH_W, box.clientHeight / CSH_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cshCanvas.style.width  = Math.floor(CSH_W * scale) + 'px';
  cshCanvas.style.height = Math.floor(CSH_H * scale) + 'px';
  cshCanvas.width  = Math.floor(CSH_W * scale * dpr);
  cshCanvas.height = Math.floor(CSH_H * scale * dpr);
  cshCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  cshGrainPat = null;
}

function resetArcadeColdShot() {
  if (cshRafHandle) { cancelAnimationFrame(cshRafHandle); cshRafHandle = null; }
  cshState = 'attract'; cshPress = null; cshPtrId = null; cshAim = null; cshQueued = null;
  cshEvents = []; cshParts = []; cshCallouts = []; cshBubbles = []; cshBalls = []; cshThrows = {}; cshShake = 0;
  cshTimeScale = 1; cshSlowT = 0; cshCoach = null; cshSinking = 0; cshSinkT = 0; cshFreeze = 0; cshFlash = 0;
  cshShout = null; cshBanner = null; cshPower = null; cshGulls = [];
  // cshScores is NOT cleared — session high scores survive the lobby.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-coldshot').style.display !== 'none') cshResize();
});
