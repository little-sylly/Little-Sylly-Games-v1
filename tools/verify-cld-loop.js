// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-loop.js — drives Cold Shoulder's RULES LAYER headlessly.
//
//   node tools/verify-cld-loop.js            (exits 1 on any failure)
//   CLD_SRC=path node tools/…                (drive a different copy of cld.js —
//                                             proves a broken build fails here)
//   CLD_PHYS_SRC=path node tools/…           (same, for js/lib/physics.js)
//   CLD_LOOP_SEED=n node tools/…             (reseed the randomised sweep)
//
// Companion to verify-cld-physics.js (the sim) and, later, verify-cld-loopback.js
// (the wire). This one owns everything physics.js deliberately does NOT: Berth
// geometry, Berth assignment and the multi-hop shunt, Dive legality, The Thaw's
// radius schedule, Washout detection, and Fish scoring (spec §4B/§4C/§6/§12).
//
// It re-implements no rules. js/lib/physics.js and js/games/cld.js are both
// evaluated in ONE vm context with a bare `window` stub, and a bridge script run
// in that same context hands their lexical globals back — cld.js declares its
// state with `let`/`const`, so nothing lands on the sandbox object by itself.
//
// Sandbox rules, same as the other 'single'-mode harnesses: no DOM to speak of,
// and mpSendEnvelope/mpSendPrivate THROW so a leaked broadcast fails loudly.
// The Stage-2 rules layer has no MP surface at all; those stubs are the tripwire
// that says so, and they are what Stage 5 will start exercising for real.
//
// ── The known blind spot ───────────────────────────────────────────────────
// Everything below runs in ONE process with `getElementById: () => null`. That
// is what lets one process play all N seats, and exactly what blinds it to the
// packet layer and to every line of render code. The loopback harness (Stage 5)
// is what covers that; a green run here proves the rules, not the game.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT  = path.join(__dirname, '..');
const PHYS  = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME  = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');
const SEED  = Number(process.env.CLD_LOOP_SEED || 20260903);

const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {}, setTimeout: () => 0, clearTimeout() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playAbyssThud() {}, playHullThud() {}, playAlarm() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called from the Stage-2 rules layer'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called from the Stage-2 rules layer'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });

const BRIDGE = `
globalThis.__cld = {
  C: {
    CLD_W, CLD_H, CLD_BERTH_SLOTS, CLD_THAW_STEP, CLD_PENGUIN_R, CLD_BERG_R,
    CLD_BERG_COUNT, CLD_START_RING, CLD_MIN_POWER, CLD_V_MAX, CLD_R_STD,
    CLD_MIN_RADIUS_MULT, CLD_SIM_CAP_MS, CLD_FLOE_SIZE, CLD_ICE_MULT,
    CLD_SNOWBALL_R, CLD_SNOWBALL_SPEED,
  },
  fn: {
    cldFullSlideDist, cldDecel, cldMinRadius, cldSnowballForce, cldSnowballArrivalMs,
    cldStanding, cldPlayersAlive, cldNormAngle, cldBerthArc, cldBerthOfAngle,
    cldSlotAngle, cldRimPos, cldDistFromCentre, cldSlotTaken, cldFreeSlots,
    cldPickFreeSlot, cldShuntSide, cldAssignBerth, cldSeatDrowned,
    cldDiveTarget, cldDiveAvailable, cldApplyDive,
    cldPlaceBergs, cldProjectBergsToRim, cldBergInset,
    cldStartMatch, cldStartFloeOff, cldBuildSlideInputs, cldResolveSlide,
    cldThawStep, cldCheckWashout, cldResolveFloeOff, cldMatchWinner, cldSimParams,
  },
  rng(s) { return window.Physics.rng(s); },
  get penguins()    { return cldPenguins; },    set penguins(v)    { cldPenguins = v; },
  get bergs()       { return cldBergs; },       set bergs(v)       { cldBergs = v; },
  get commits()     { return cldCommits; },     set commits(v)     { cldCommits = v; },
  get radius()      { return cldFloeRadius; },  set radius(v)      { cldFloeRadius = v; },
  get berthCount()  { return cldBerthCount; },  set berthCount(v)  { cldBerthCount = v; },
  get playerCount() { return cldPlayerCount; }, set playerCount(v) { cldPlayerCount = v; },
  get fish()        { return cldFish; },        set fish(v)        { cldFish = v; },
  get stats()       { return cldMatchStats; },  set stats(v)       { cldMatchStats = v; },
  get slideNo()     { return cldSlideNo; },     get floeOffNo()    { return cldFloeOffNo; },
  get timeline()    { return cldTimeline; },
  get ice()         { return cldIceConditions; }, set ice(v)        { cldIceConditions = v; },
  get floe()        { return cldFloeSize; },      set floe(v)       { cldFloeSize = v; },
  get sylly()       { return cldSyllyMode; },     set sylly(v)      { cldSyllyMode = v; },
  get peckOff()     { return cldPeckOff; },       set peckOff(v)    { cldPeckOff = v; },
  get fishToWin()   { return cldFishToWin; },     set fishToWin(v)  { cldFishToWin = v; },
  get iceBreaker()  { return cldIceBreaker; },    set iceBreaker(v) { cldIceBreaker = v; },
};
`;
vm.runInContext(BRIDGE, sandbox, { filename: 'cld-loop-bridge' });
const G = sandbox.__cld;
const C = G.C, F = G.fn;

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  if (!good) failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function close(label, actual, expected, tol) {
  const good = Math.abs(actual - expected) <= tol;
  if (!good) failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          expected ${expected} ±${tol}, got ${actual}`));
}
function ok(label, cond, detail) {
  if (!cond) failures++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}` +
    (cond ? '' : `\n          ${detail === undefined ? '(condition false)' : detail}`));
}
function throws(label, fn, matcher) {
  let msg = null;
  try { fn(); } catch (e) { msg = e.message; }
  const good = msg !== null && (!matcher || msg.includes(matcher));
  if (!good) failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          ${msg === null ? 'nothing was thrown' : 'threw: ' + msg}`));
}
const section = t => console.log(`\n${t}`);

// ── Scenario helpers ──────────────────────────────────────────────────────
const CX = 180, CY = 180, TAU = Math.PI * 2;
const distC = (x, y) => Math.hypot(x - CX, y - CY);
const pen   = id => G.penguins.find(p => p.id === id);

// Seat a match + a fresh Floe-Off through the real shipped entry points.
function setup(o) {
  o = o || {};
  G.ice        = o.ice        || 'slush';
  G.floe       = o.floe       || 'standard';
  G.sylly      = !!o.sylly;
  G.peckOff    = !!o.peckOff;
  G.fishToWin  = o.fishToWin  === undefined ? 3 : o.fishToWin;
  G.iceBreaker = o.iceBreaker === undefined ? 0 : o.iceBreaker;
  const n = o.players || 4;
  F.cldStartMatch(Array.from({ length: n }, (_, i) => 'P' + i));
  F.cldStartFloeOff(o.seed === undefined ? 1 : o.seed);
}

// Build a synthetic rim directly: `occ` maps berth index → how many of its
// slots are taken (slots 0..k-1). Used for the shunt cases, where the point is
// to pin the SEARCH, not to reach the state through play.
function rimState(N, occ, radius) {
  G.playerCount = N;
  G.berthCount  = N;
  G.radius      = radius === undefined ? 130 : radius;
  G.fish        = new Array(N).fill(0);
  G.stats       = Array.from({ length: N }, () => ({ slidesStood: 0, plunges: 0 }));
  const pens = [];
  let k = 0;
  Object.keys(occ).forEach(b => {
    for (let s = 0; s < occ[b]; s++) {
      pens.push({ id: 'd' + (k++), ownerIdx: 0, x: 0, y: 0,
                  drowned: true, berth: Number(b), slot: s });
    }
  });
  G.penguins = pens;
  pens.forEach(p => F.cldSeatDrowned(p, p.berth, p.slot));
}

// A point just outside the rim, in the middle of Berth b's arc.
function exitInBerth(b, N) {
  const a = (TAU / N) * (b + 0.5);
  const R = G.radius + 3;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), angle: a };
}

// A velocity tangential to the rim at `angle`. sign +1 = clockwise (increasing
// Berth index), −1 = anticlockwise. Matches cldShuntSide's convention.
function tangentVel(angle, sign, mag) {
  const m = mag === undefined ? 50 : mag;
  return { vx: -Math.sin(angle) * m * sign, vy: Math.cos(angle) * m * sign };
}

// Every player holds — a legal, deliberate zero-power commit (§7).
function allHold() {
  return Array.from({ length: G.playerCount }, () => ({ aims: [], dive: 0, snowball: null }));
}

// Aim one penguin straight out from the centre at full power.
function shoveOut(penguinId, power) {
  const p = pen(penguinId);
  const len = Math.hypot(p.x - CX, p.y - CY) || 1;
  return { penguinId: penguinId, dx: (p.x - CX) / len, dy: (p.y - CY) / len,
           power: power === undefined ? 1 : power };
}

// Rim legality — the invariant every path in the game has to preserve.
function rimLegal() {
  const seen = new Set();
  for (const p of G.penguins) {
    if (!p.drowned) { if (p.berth !== null || p.slot !== null) return 'standing penguin holds a Berth'; continue; }
    if (!(p.berth >= 0 && p.berth < G.berthCount)) return 'berth out of range: ' + p.berth;
    if (!(p.slot >= 0 && p.slot < C.CLD_BERTH_SLOTS)) return 'slot out of range: ' + p.slot;
    const key = p.berth + ':' + p.slot;
    if (seen.has(key)) return 'two penguins share position ' + key;
    seen.add(key);
    // Exact slot geometry, not just "somewhere on the rim" — being on the rim
    // at the wrong angle is how a Drowned penguin silently leaves its Berth.
    const seat = F.cldRimPos(F.cldSlotAngle(p.berth, p.slot));
    if (Math.abs(p.x - seat.x) > 1e-6 || Math.abs(p.y - seat.y) > 1e-6)
      return 'Drowned penguin off its Berth slot: ' + p.id;
    if (Math.abs(distC(p.x, p.y) - G.radius) > 1e-6) return 'Drowned penguin off the rim: ' + p.id;
  }
  return null;
}

(function () {
  console.log('Cold Shoulder — rules layer verification\n' + '='.repeat(58));
  console.log('game:   ' + path.relative(ROOT, GAME).split(path.sep).join('/'));
  console.log('sim:    ' + path.relative(ROOT, PHYS).split(path.sep).join('/'));
  console.log('seed:   ' + SEED);

  // ═══════════════════════════════════════════════════════════════════════
  section('Constants — the Ice Conditions table now lives in cld.js (TG-01)');
  {
    const physSrc = fs.readFileSync(path.join(ROOT, 'tools/verify-cld-physics.js'), 'utf8');
    ok('verify-cld-physics.js reads cld.js rather than keeping its own copy',
      physSrc.includes('CLD_SRC') && physSrc.includes("js/games/cld.js"));
    ok('…and declares no literal Ice Conditions constants of its own',
      !/^const CLD_(V_MAX|R_STD|MIN_RADIUS_MULT)\s*=\s*[0-9]/m.test(physSrc) &&
      !/^const CLD_ICE_MULT\s*=\s*\{/m.test(physSrc));

    const src = fs.readFileSync(GAME, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    // Scoped to the RULES LAYER, not the whole file. Until Stage 4 the two were the
    // same thing, so a whole-file grep said what it meant. The UI layer below the
    // Stage 4 marker legitimately draws unseeded randoms for PRESENTATION — which
    // intro flavour line to show, which plunge bark to float — and neither reaches
    // game state. What must never happen is an unseeded draw in code that DECIDES
    // anything, and all of that is above the marker. Both Slide seeds are
    // Date.now()-derived and travel into Physics.rng, so determinism is unaffected.
    const rulesSrc = src.split('const CLD_INTRO_FLAVOUR')[0];
    ok('…and the Stage 4 boundary was found, so the rules layer is really isolated',
      rulesSrc.length < src.length);
    check('resolution never draws an unseeded random number', rulesSrc.includes('Math.random'), false);
    ok('the shunt has no "nowhere left to put them" fallback — it throws instead',
      /throw new Error\('cldAssignBerth/.test(src) && !/nowhere/i.test(src.replace(/§4C[^\n]*/g, '')));
  }
  {
    // §4B's table, recomputed from the closed form rather than copied.
    close('Powder full-power slide distance',   F.cldFullSlideDist('powder'),   91,  0.001);
    close('Slush full-power slide distance',    F.cldFullSlideDist('slush'),    130, 0.001);
    close('Black Ice full-power slide distance', F.cldFullSlideDist('blackice'), 182, 0.001);
    close('Powder minimum floe radius',    F.cldMinRadius('powder'),   45.5, 0.001);
    close('Slush minimum floe radius',     F.cldMinRadius('slush'),    65,   0.001);
    close('Black Ice minimum floe radius', F.cldMinRadius('blackice'), 91,   0.001);
    ok('the floor MOVES with Ice Conditions — Black Ice bottoms out on a bigger floe',
      F.cldMinRadius('blackice') > F.cldMinRadius('slush') &&
      F.cldMinRadius('slush') > F.cldMinRadius('powder'));
    ok('every Ice Conditions deceleration reproduces its own closed form',
      ['powder', 'slush', 'blackice'].every(i =>
        Math.abs((C.CLD_V_MAX * C.CLD_V_MAX) / (2 * F.cldDecel(i)) - F.cldFullSlideDist(i)) < 1e-9));
    G.ice = 'blackice';
    close('the derived helpers default to the LIVE Ice Conditions', F.cldMinRadius(), 91, 0.001);
    G.ice = 'slush';
  }
  {
    // §4D's force curve, stated independently. Asserting cldSnowballForce()
    // against itself proves nothing — these are the spec's own numbers.
    close('a point-blank Snowball is 40% of full-power VELOCITY',
      F.cldSnowballForce(0, 200), 0.40 * C.CLD_V_MAX, 1e-9);
    close('a max-range Snowball is 20%',
      F.cldSnowballForce(200, 200), 0.20 * C.CLD_V_MAX, 1e-9);
    close('the curve is linear in distance between them',
      F.cldSnowballForce(100, 200), 0.30 * C.CLD_V_MAX, 1e-9);
    close('…and clamps beyond max range',
      F.cldSnowballForce(500, 200), 0.20 * C.CLD_V_MAX, 1e-9);
    ok('force is a fraction of VELOCITY, not of slide distance — so it must not ' +
       'move when Ice Conditions do', (() => {
      G.ice = 'powder';   const a = F.cldSnowballForce(50, 200);
      G.ice = 'blackice'; const b = F.cldSnowballForce(50, 200);
      G.ice = 'slush';    return a === b;
    })());
    close('flight time is distance / CLD_SNOWBALL_SPEED — one second\'s worth of ' +
      'distance takes exactly one second, whatever the constant is set to',
      F.cldSnowballArrivalMs(C.CLD_SNOWBALL_SPEED), 1000, 1e-9);
  }
  {
    // The capacity invariant §4C leans on. Stated there as "the rim can never be
    // full everywhere"; at CLD_BERTH_SLOTS = 2 it is stronger than that — total
    // rim capacity exceeds the TOTAL penguin count, in every mode.
    ok('a Berth holds at least 2 slots — §4C lets two Drowned penguins share one',
      C.CLD_BERTH_SLOTS >= 2, 'CLD_BERTH_SLOTS = ' + C.CLD_BERTH_SLOTS);
    let held = true, worst = '';
    for (let n = 2; n <= 8; n++) {
      const cap = n * C.CLD_BERTH_SLOTS;
      if (cap < n) { held = false; worst = n + ' players'; }
    }
    const peckCap = 2 * C.CLD_BERTH_SLOTS;
    if (peckCap < 4) { held = false; worst = 'Peck Off'; }
    ok('rim capacity exceeds the penguin count at every player count, Peck Off included',
      held, 'first failure at ' + worst);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Berth geometry (§4C)');
  {
    G.berthCount = 8; G.radius = 130;
    check('angle 0 is Berth 0',            F.cldBerthOfAngle(0), 0);
    check('just below the first boundary stays in Berth 0',
      F.cldBerthOfAngle(TAU / 8 - 1e-9), 0);
    check('the boundary itself belongs to the NEXT Berth — the arc is half-open',
      F.cldBerthOfAngle(TAU / 8), 1);
    check('just below a full turn is the last Berth', F.cldBerthOfAngle(TAU - 1e-9), 7);
    check('a full turn wraps back to Berth 0', F.cldBerthOfAngle(TAU), 0);
    check('a negative angle wraps the same way', F.cldBerthOfAngle(-1e-9), 7);
    ok('every slot angle lands inside its own Berth arc', (() => {
      for (let b = 0; b < 8; b++)
        for (let s = 0; s < C.CLD_BERTH_SLOTS; s++)
          if (F.cldBerthOfAngle(F.cldSlotAngle(b, s)) !== b) return false;
      return true;
    })());
    ok('the slots inside one Berth are distinct and evenly spaced', (() => {
      const arc = TAU / 8, gap = arc / C.CLD_BERTH_SLOTS;
      for (let s = 1; s < C.CLD_BERTH_SLOTS; s++)
        if (Math.abs((F.cldSlotAngle(3, s) - F.cldSlotAngle(3, s - 1)) - gap) > 1e-9) return false;
      return true;
    })());
    const rp = F.cldRimPos(0.7);
    close('cldRimPos puts a body exactly on the rim', distC(rp.x, rp.y), 130, 1e-9);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('The multi-hop shunt (§4C) — home Berth');
  {
    rimState(6, {});
    const e = exitInBerth(2, 6);
    const spot = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7));
    check('an empty home Berth takes the penguin, no hops', [spot.berth, spot.hops], [2, 0]);
    ok('and the slot it picked is a real one',
      spot.slot >= 0 && spot.slot < C.CLD_BERTH_SLOTS);
  }
  {
    rimState(6, { 2: 1 });
    const e = exitInBerth(2, 6);
    const spot = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7));
    check('a half-full home Berth still takes it — two Drowned may share a Berth',
      [spot.berth, spot.hops], [2, 0]);
    check('…in the free slot, never the taken one', spot.slot, 1);
  }
  {
    // The seeded pick is a real pick: over many seeds both free slots come up.
    rimState(6, {});
    const e = exitInBerth(0, 6);
    const picked = new Set();
    for (let s = 1; s <= 40; s++) picked.add(F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(s)).slot);
    check('the free-slot pick is seeded, not fixed', picked.size, C.CLD_BERTH_SLOTS);
    check('the same seed picks the same slot every time',
      F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(11)).slot,
      F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(11)).slot);
  }

  section('The multi-hop shunt — stepping outward');
  {
    rimState(6, { 0: 2 });
    const e = exitInBerth(0, 6);
    const spot = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7));
    check('a full home Berth hops one step', spot.hops, 1);
    ok('to a neighbour', spot.berth === 1 || spot.berth === 5, 'berth ' + spot.berth);
  }
  {
    // Prefer MORE free positions — this outranks the travel direction entirely.
    rimState(6, { 0: 2, 1: 2, 5: 1 });
    const e = exitInBerth(0, 6);
    const cw = tangentVel(e.angle, +1);
    const spot = F.cldAssignBerth(e.x, e.y, cw.vx, cw.vy, G.rng(7));
    check('the emptier neighbour wins even against the travel direction',
      [spot.berth, spot.hops], [5, 1]);
  }
  {
    // A tie at h = 1 (both full) → h = 2, where both are equally free → the
    // travel direction decides.
    rimState(6, { 5: 2, 0: 2, 1: 2 });
    const e = exitInBerth(0, 6);
    const cw  = tangentVel(e.angle, +1);
    const ccw = tangentVel(e.angle, -1);
    check('a clockwise exit shunts clockwise',
      F.cldAssignBerth(e.x, e.y, cw.vx, cw.vy, G.rng(7)).berth, 2);
    check('an anticlockwise exit shunts anticlockwise',
      F.cldAssignBerth(e.x, e.y, ccw.vx, ccw.vy, G.rng(7)).berth, 4);
    const zero = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7));
    check('a ZERO-velocity exit defaults CLOCKWISE — the thaw-drop case',
      [zero.berth, zero.hops], [2, 2]);
    check('cldShuntSide agrees on its own: no sideways component → clockwise',
      F.cldShuntSide(e.angle, 0, 0), 1);
    const radial = { vx: Math.cos(e.angle) * 90, vy: Math.sin(e.angle) * 90 };
    check('a dead-straight radial exit also defaults CLOCKWISE',
      F.cldAssignBerth(e.x, e.y, radial.vx, radial.vy, G.rng(7)).berth, 2);
  }
  {
    // ── The ≥3-hop case §4C calls for ──────────────────────────────────────
    // Five consecutive full Berths. Note this is BEYOND legal rim density at
    // CLD_BERTH_SLOTS = 2 (it needs 10 Drowned penguins, and 8 players field 8),
    // so it is asserted against the function directly. The deepest hop real play
    // can reach is 2 — see the Round E case below and the impl notes.
    rimState(8, { 2: 2, 3: 2, 4: 2, 5: 2, 6: 2 });
    const e = exitInBerth(4, 8);
    const zero = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7));
    check('a four-deep block of full Berths forces THREE hops', zero.hops, 3);
    check('…resolving clockwise on a zero-velocity exit', zero.berth, 7);
    const ccw = tangentVel(e.angle, -1);
    const other = F.cldAssignBerth(e.x, e.y, ccw.vx, ccw.vy, G.rng(7));
    check('…and anticlockwise the other way, still three hops', [other.berth, other.hops], [1, 3]);
  }
  {
    // ── Brief Round E, exactly as described, and REACHABLE ─────────────────
    // 8 players, The Thaw well advanced: Berths 3/4/5 full and Berth 2 holding
    // one. Seven Drowned — the eighth penguin plunging into Berth 4 resolves
    // to 6 because 6 has more free room than 2.
    rimState(8, { 2: 1, 3: 2, 4: 2, 5: 2 }, 70);
    const e = exitInBerth(4, 8);
    const spot = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(3));
    check('brief Round E resolves to Berth 6', spot.berth, 6);
    check('…two hops out, because 6 is emptier than 2', spot.hops, 2);
    ok('…and the state it needed is legal: 7 Drowned of 8 penguins',
      G.penguins.filter(p => p.drowned).length === 7);
  }
  {
    // The loud failure §4C demands in place of a silent fallback.
    rimState(3, { 0: 2, 1: 2, 2: 2 });
    const e = exitInBerth(1, 3);
    throws('a genuinely full rim fails LOUDLY — no silent fallback placement',
      () => F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(7)), 'the rim is full');
  }
  {
    // Coverage: the search must be able to reach every Berth on the ring.
    let allReached = true;
    for (const N of [2, 3, 4, 5, 6, 7, 8]) {
      const occ = {};
      for (let b = 0; b < N; b++) occ[b] = C.CLD_BERTH_SLOTS;
      for (let b = 0; b < N; b++) {
        occ[b] = C.CLD_BERTH_SLOTS - 1;          // leave exactly one slot open
        rimState(N, occ);
        const e = exitInBerth(0, N);
        const got = F.cldAssignBerth(e.x, e.y, 0, 0, G.rng(5));
        if (got.berth !== b) allReached = false;
        occ[b] = C.CLD_BERTH_SLOTS;
      }
    }
    ok('the shunt reaches EVERY Berth on the ring, at every player count', allReached);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Dive (§4C) — voluntary, one step, allowed to fail');
  {
    rimState(6, { 0: 1 });
    const p = G.penguins[0];
    ok('a free neighbour is available clockwise',      F.cldDiveAvailable(p, +1));
    ok('and anticlockwise',                            F.cldDiveAvailable(p, -1));
    check('the clockwise target is the next Berth up', F.cldDiveTarget(p, +1), 1);
    check('the anticlockwise target wraps',            F.cldDiveTarget(p, -1), 5);
    const moved = F.cldApplyDive(p, +1, G.rng(9));
    ok('the Dive lands', moved);
    check('…in the target Berth', p.berth, 1);
    close('…and exactly on the rim', distC(p.x, p.y), G.radius, 1e-9);
  }
  {
    rimState(6, { 0: 1, 1: 2, 5: 2 });
    const p = G.penguins.find(q => q.berth === 0);
    ok('a full target reads as unavailable while aiming', !F.cldDiveAvailable(p, +1));
    const before = { berth: p.berth, slot: p.slot, x: p.x, y: p.y };
    const moved = F.cldApplyDive(p, +1, G.rng(9));
    ok('a Dive into a full Berth FAILS rather than shunting', moved === false);
    check('…and the penguin stays exactly where it was',
      [p.berth, p.slot, p.x, p.y], [before.berth, before.slot, before.x, before.y]);
  }
  {
    rimState(6, { 0: 1 });
    const p = G.penguins[0];
    ok('a zero direction is not a Dive', F.cldApplyDive(p, 0, G.rng(9)) === false);
    const standing = { id: 's', ownerIdx: 1, x: CX, y: CY, drowned: false, berth: null, slot: null };
    G.penguins.push(standing);
    ok('a Standing penguin cannot Dive', F.cldDiveAvailable(standing, +1) === false);
  }
  {
    // A Dive resolves BEFORE the Slide, so the moved bumper is already in the
    // sim's opening frame.
    setup({ players: 4, seed: 5 });
    const victim = G.penguins[0];
    victim.drowned = true;
    F.cldSeatDrowned(victim, 0, 0);
    const cs = allHold();
    cs.forEach((c, i) => {
      G.penguins.filter(p => p.ownerIdx === i && !p.drowned)
                .forEach(p => c.aims.push({ penguinId: p.id, dx: 1, dy: 0, power: 0 }));
    });
    cs[victim.ownerIdx].dive = +1;
    G.commits = cs;
    const tl = F.cldResolveSlide(31);
    check('the Dive is recorded on the timeline', tl.dives.length, 1);
    ok('…and it moved',  tl.dives[0].moved === true);
    check('…to the next Berth', victim.berth, 1);
    // Compare frame 0 against the Berth slot's OWN geometry, not against the
    // penguin's post-resolve x/y — those two can be stale together, and were.
    const idx = G.penguins.findIndex(p => p.id === victim.id);
    const seat = F.cldRimPos(F.cldSlotAngle(victim.berth, victim.slot));
    check('…and frame 0 of the Slide already shows it in the new Berth',
      [tl.samples[0][idx * 2], tl.samples[0][idx * 2 + 1]],
      [Math.round(seat.x), Math.round(seat.y)]);
    check('…and the Slide never dragged it back off its slot',
      [victim.x, victim.y], [seat.x, seat.y]);
    check('…with every Drowned penguin still on its own Berth geometry', rimLegal(), null);
  }

  {
    // A Drowned penguin is a BUMPER. It must go into the sim immovable, or a
    // hard enough shove pushes it off its own Berth — and if it crosses the rim
    // it "plunges" a second time, which no rule in the game has a meaning for.
    setup({ players: 4, seed: 41 });
    const anchor = G.penguins[0];
    anchor.drowned = true;
    F.cldSeatDrowned(anchor, 0, 0);
    const seat = { x: anchor.x, y: anchor.y };
    // Put a shover directly inboard of it and fire it straight out.
    const ang = Math.atan2(anchor.y - CY, anchor.x - CX);
    const shover = G.penguins[1];
    shover.x = CX + (G.radius - 60) * Math.cos(ang);
    shover.y = CY + (G.radius - 60) * Math.sin(ang);
    const cs = allHold();
    cs[shover.ownerIdx].aims.push({ penguinId: shover.id,
      dx: Math.cos(ang), dy: Math.sin(ang), power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(42);
    const fa = tl.final.find(f => f.id === anchor.id);
    ok('a Slide fires straight into the Drowned penguin',
      tl.events.some(e => e.type === 'rebound' && e.offId === anchor.id));
    check('…and it does not budge', [anchor.x, anchor.y], [seat.x, seat.y]);
    check('…carries no velocity out of the Slide', [fa.vx, fa.vy], [0, 0]);
    ok('…and never "plunges" a second time', fa.plunged === false);
    check('…so the rim is still legal', rimLegal(), null);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('The Thaw (§4B/§12) — schedule and floor');
  {
    setup({ players: 4, sylly: false, seed: 2 });
    const before = G.radius;
    const t = F.cldThawStep(G.rng(1));
    check('Sylly Mode OFF: no Thaw step at all', t, null);
    check('…and the floe does not move', G.radius, before);
  }
  {
    setup({ players: 4, sylly: true, floe: 'standard', seed: 2 });
    check('a Floe-Off starts at the Floe Size radius', G.radius, C.CLD_FLOE_SIZE.standard);
    const t1 = F.cldThawStep(G.rng(1));
    check('one Thaw step sheds exactly CLD_THAW_STEP',
      G.radius, C.CLD_FLOE_SIZE.standard - C.CLD_THAW_STEP);
    check('…and says so in its beat', t1.beats[0].type, 'thaw');
    check('…carrying the new radius for playback', t1.beats[0].newRadius, G.radius);
    ok('…and reports that it shrank', t1.shrunk === true);
  }
  {
    for (const ice of ['powder', 'slush', 'blackice']) {
      setup({ players: 4, sylly: true, ice: ice, seed: 2 });
      let steps = 0;
      while (steps < 400) {
        const before = G.radius;
        F.cldThawStep(G.rng(steps + 1));
        steps++;
        if (G.radius === before) break;
      }
      close(`${ice}: The Thaw floors exactly at the computed minimum radius`,
        G.radius, F.cldMinRadius(ice), 1e-9);
      const t = F.cldThawStep(G.rng(99));
      ok(`${ice}: a further step cannot go below the floor`,
        G.radius >= F.cldMinRadius(ice) - 1e-9 && t.shrunk === false,
        'radius ' + G.radius);
    }
  }
  {
    setup({ players: 4, sylly: true, ice: 'slush', seed: 2 });
    close('a Standard floe can roughly halve before it stops (130 → 65)',
      F.cldMinRadius('slush') / C.CLD_FLOE_SIZE.standard, 0.5, 1e-9);
  }

  section('The Thaw — who rides the rim inward, and who does not');
  {
    setup({ players: 4, sylly: true, iceBreaker: 3, seed: 4 });
    const drowned = G.penguins[0];
    drowned.drowned = true;
    F.cldSeatDrowned(drowned, 2, 0);
    const angleBefore = Math.atan2(drowned.y - CY, drowned.x - CX);
    const inner = G.penguins[1];
    inner.x = CX + 10; inner.y = CY;
    const outer = G.penguins[2];
    const to = G.radius - C.CLD_THAW_STEP;
    outer.x = CX + (to + 4); outer.y = CY;               // left outside the new rim

    const t = F.cldThawStep(G.rng(6));
    close('a Drowned penguin rides the rim inward', distC(drowned.x, drowned.y), G.radius, 1e-9);
    close('…keeping its angle exactly',
      Math.atan2(drowned.y - CY, drowned.x - CX), angleBefore, 1e-9);
    check('…and its Berth and slot',  [drowned.berth, drowned.slot], [2, 0]);
    check('the Berth COUNT never changes', G.berthCount, 4);
    ok('a surviving Berg rides the rim inward too',
      G.bergs.length > 0 &&
      G.bergs.every(b => Math.abs(distC(b.x, b.y) - F.cldBergInset()) < 1e-9));
    ok('a Standing penguin comfortably inside is untouched',
      inner.drowned === false && inner.x === CX + 10);
    ok('a Standing penguin the ice ran out from under plunges', outer.drowned === true);
    check('…as its own thaw-drop beat', t.beats.some(b => b.type === 'thaw-drop' &&
      b.penguinId === outer.id), true);
    check('…followed by a surface beat', t.beats.some(b => b.type === 'surface' &&
      b.penguinId === outer.id), true);
    check('…and it counts as a plunge on the stat line',
      G.stats[outer.ownerIdx].plunges, 1);
    check('the rim stays legal after a thaw-drop', rimLegal(), null);
  }
  {
    // The only zero-velocity plunge in the game — §12 asks for it by name.
    setup({ players: 6, sylly: true, seed: 8 });
    const to = G.radius - C.CLD_THAW_STEP;
    const dropper = G.penguins[0];
    const a = (TAU / 6) * 0.5;                    // dead centre of Berth 0
    dropper.x = CX + (to + 5) * Math.cos(a);
    dropper.y = CY + (to + 5) * Math.sin(a);
    // Fill Berth 0 and both its neighbours so the drop has to shunt.
    const fillers = G.penguins.slice(1, 6);
    [[0, 0], [0, 1], [5, 0], [5, 1], [1, 0]].forEach((bs, i) => {
      fillers[i].drowned = true;
      F.cldSeatDrowned(fillers[i], bs[0], bs[1]);
    });
    F.cldThawStep(G.rng(21));
    check('a thaw-drop shunts CLOCKWISE — zero exit velocity, so the default applies',
      dropper.berth, 1);
    check('the rim stays legal', rimLegal(), null);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Washout (§6) — after a Slide AND after a Thaw step');
  {
    setup({ players: 3, sylly: false, ice: 'slush', floe: 'standard', fishToWin: 3, seed: 12 });
    const cs = allHold();
    cs.forEach((c, i) => {
      G.penguins.filter(p => p.ownerIdx === i).forEach(p => c.aims.push(shoveOut(p.id, 1)));
    });
    G.commits = cs;
    const tl = F.cldResolveSlide(77);
    ok('every penguin sliding straight off is a Washout', tl.washout === true,
      'standing ' + F.cldStanding().length);
    check('…the Floe-Off is over', tl.floeOffOver, true);
    check('…with no winner', tl.winnerIdx, -1);
    check('…and nobody scores a Fish', G.fish, [0, 0, 0]);
    check('…while every plunger still surfaced legally', rimLegal(), null);
    check('…one surface beat per penguin', tl.aftermath.filter(b => b.type === 'surface').length, 3);
  }
  {
    // A Washout the SLIDE cannot see: everyone survives the Slide, and the Thaw
    // step that follows takes the last of the ice out from under them.
    setup({ players: 3, sylly: true, ice: 'slush', seed: 12 });
    G.radius = F.cldMinRadius('slush') + C.CLD_THAW_STEP;      // one step from the floor
    const to = F.cldMinRadius('slush');
    G.penguins.forEach((p, i) => {
      const a = (TAU / 3) * i;
      p.x = CX + (to + 3) * Math.cos(a);
      p.y = CY + (to + 3) * Math.sin(a);
    });
    G.commits = allHold();
    const tl = F.cldResolveSlide(78);
    check('the Slide itself plunged nobody',
      tl.events.filter(e => e.type === 'plunge').length, 0);
    ok('but the Thaw step drops everyone left', tl.washout === true,
      'standing ' + F.cldStanding().length);
    check('…so Washout detection ran AFTER the Thaw, not only after the Slide',
      tl.aftermath.filter(b => b.type === 'thaw-drop').length, 3);
    check('…and still nobody scores', G.fish, [0, 0, 0]);
  }
  {
    // The other Thaw ending: it drops all but one, and that player wins.
    setup({ players: 3, sylly: true, ice: 'slush', fishToWin: 3, seed: 12 });
    G.radius = F.cldMinRadius('slush') + C.CLD_THAW_STEP;
    const to = F.cldMinRadius('slush');
    G.penguins[0].x = CX; G.penguins[0].y = CY;                 // safe in the middle
    [1, 2].forEach((i, k) => {
      const a = (TAU / 3) * (k + 1);
      G.penguins[i].x = CX + (to + 3) * Math.cos(a);
      G.penguins[i].y = CY + (to + 3) * Math.sin(a);
    });
    G.commits = allHold();
    const tl = F.cldResolveSlide(79);
    ok('a Thaw step can END a Floe-Off', tl.floeOffOver === true && tl.washout === false);
    check('…awarding the Fish to the last player standing', tl.winnerIdx, 0);
    check('…on the Fish tally', G.fish, [1, 0, 0]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Fish scoring and the win test (§6)');
  {
    setup({ players: 4, fishToWin: 3, seed: 15 });
    const cs = allHold();
    [1, 2, 3].forEach(i => {
      G.penguins.filter(p => p.ownerIdx === i).forEach(p => cs[i].aims.push(shoveOut(p.id, 1)));
    });
    G.commits = cs;
    const tl = F.cldResolveSlide(80);
    check('the last player Standing takes the Floe-Off', tl.winnerIdx, 0);
    check('…and exactly one Fish', G.fish, [1, 0, 0, 0]);
    check('…the match is not over at 1 of 3', tl.matchOver, false);
    check('…and rebounding rivals in earns nothing extra',
      G.fish.reduce((a, b) => a + b, 0), 1);
  }
  {
    setup({ players: 4, fishToWin: 1, seed: 15 });
    const cs = allHold();
    [1, 2, 3].forEach(i => {
      G.penguins.filter(p => p.ownerIdx === i).forEach(p => cs[i].aims.push(shoveOut(p.id, 1)));
    });
    G.commits = cs;
    const tl = F.cldResolveSlide(81);
    ok('Fish to Win = 1 terminates the match on the first Floe-Off', tl.matchOver === true);
    check('…and cldMatchWinner names them', F.cldMatchWinner(), 0);
  }
  {
    setup({ players: 3, fishToWin: 3, seed: 15 });
    G.fish = [2, 0, 0];
    const cs = allHold();
    [1, 2].forEach(i => {
      G.penguins.filter(p => p.ownerIdx === i).forEach(p => cs[i].aims.push(shoveOut(p.id, 1)));
    });
    G.commits = cs;
    const tl = F.cldResolveSlide(82);
    ok('the third Fish ends the match', tl.matchOver === true && G.fish[0] === 3);
  }

  {
    setup({ players: 4, fishToWin: 3, seed: 16 });
    const before = G.fish.slice();
    const r = F.cldResolveFloeOff();
    check('the scorer is a NO-OP while two or more players are alive',
      [r.winnerIdx, r.matchOver], [-1, false]);
    check('…and awards nothing', G.fish, before);
    G.penguins.slice(1).forEach(p => { p.drowned = true; });
    const r2 = F.cldResolveFloeOff();
    check('…but awards the moment exactly one is left', [r2.winnerIdx, G.fish[0]], [0, 1]);
    G.penguins.forEach(p => { p.drowned = true; });
    const r3 = F.cldResolveFloeOff();
    check('…and awards NOTHING when nobody is left — the Washout case',
      [r3.winnerIdx, G.fish[0]], [-1, 1]);
  }

  section('Peck Off — the win test is on PLAYERS, not penguins');
  {
    setup({ players: 2, peckOff: true, fishToWin: 3, seed: 17 });
    check('Peck Off fields two penguins each', G.penguins.length, 4);
    check('…and the Berth count still equals the PLAYER count', G.berthCount, 2);
    check('every penguin id is owner-scoped', G.penguins.map(p => p.id).sort(),
      ['0-0', '0-1', '1-0', '1-1']);

    const cs = allHold();
    cs[0].aims.push(shoveOut('0-0', 1));
    G.commits = cs;
    const tl1 = F.cldResolveSlide(90);
    check('one of a player\'s two penguins going in plunges only that penguin',
      F.cldStanding().length, 3);
    check('…both players are still alive', F.cldPlayersAlive(), 2);
    ok('…so the Floe-Off is NOT over — the penguin-count test would have ended it here',
      tl1.floeOffOver === false);

    const cs2 = allHold();
    cs2[0].aims.push(shoveOut('0-1', 1));
    G.commits = cs2;
    const tl2 = F.cldResolveSlide(91);
    check('the player\'s LAST penguin going in ends it', tl2.floeOffOver, true);
    check('…in favour of the other player', tl2.winnerIdx, 1);
    check('…and the rim held all of it', rimLegal(), null);
  }
  {
    // Peck Off is the tightest rim in the game: 2 Berths, 4 penguins.
    setup({ players: 2, peckOff: true, seed: 18 });
    const cs = allHold();
    G.penguins.forEach(p => cs[p.ownerIdx].aims.push(shoveOut(p.id, 1)));
    G.commits = cs;
    const tl = F.cldResolveSlide(92);
    ok('all four penguins can go in at once without exhausting the rim',
      tl.washout === true && rimLegal() === null,
      'legality: ' + rimLegal());
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Slide resolution — inputs, Bergs and determinism');
  {
    setup({ players: 4, iceBreaker: 0, seed: 20 });
    check('Ice Breaker Off places no Bergs', G.bergs.length, 0);
    setup({ players: 4, iceBreaker: 3, seed: 20 });
    check('Ice Breaker on places Bergs', G.bergs.length, C.CLD_BERG_COUNT);
    check('…each with its full hit capacity', G.bergs.map(b => b.hits),
      new Array(C.CLD_BERG_COUNT).fill(3));
    ok('…all sitting just inside the rim',
      G.bergs.every(b => Math.abs(distC(b.x, b.y) - F.cldBergInset()) < 1e-9));
    ok('…and never stacked on each other',
      G.bergs.every((b, i) => G.bergs.every((o, j) =>
        i === j || Math.hypot(b.x - o.x, b.y - o.y) > 2 * C.CLD_BERG_R)));
  }
  {
    setup({ players: 3, seed: 21 });
    const cs = allHold();
    cs[0].aims.push({ penguinId: G.penguins[0].id, dx: 1, dy: 0, power: 0 });
    cs[1].aims.push({ penguinId: G.penguins[1].id, dx: 0, dy: 0, power: 1 });
    cs[2].aims.push({ penguinId: G.penguins[2].id, dx: 1, dy: 0, power: 0.5 });
    G.commits = cs;
    const inp = F.cldBuildSlideInputs();
    check('a zero-power HOLD contributes no impulse and is not an error',
      inp.impulses.length, 1);
    check('…the one real aim launches at power × v_max',
      Math.round(Math.hypot(inp.impulses[0].vx, inp.impulses[0].vy)),
      Math.round(0.5 * C.CLD_V_MAX));
    check('body order is penguins first, then Bergs',
      inp.bodies.map(b => b.kind), ['penguin', 'penguin', 'penguin']);
  }
  {
    setup({ players: 3, seed: 22 });
    const src = G.penguins[0];
    const target = { x: src.x + 40, y: src.y };
    const cs = allHold();
    cs[0].snowball = target;
    G.commits = cs;
    const inp = F.cldBuildSlideInputs();
    check('a Snowball becomes ONE scheduled event, never a summed impulse',
      [inp.events.length, inp.impulses.length], [1, 0]);
    close('…arriving at distance / flight speed', inp.events[0].t,
      F.cldSnowballArrivalMs(40), 1e-9);
    close('…at the distance-curve force', inp.events[0].force,
      F.cldSnowballForce(40, 2 * G.radius), 1e-9);
    check('…carrying the ball\'s own radius, so the contact test is ' +
      'r_ball + r_penguin and not a point',
      [inp.events[0].radius, inp.events[0].radius > 0],
      [C.CLD_SNOWBALL_R, true]);
    check('…thrown from the committing player\'s own penguin',
      [inp.events[0].from.x, inp.events[0].from.y], [src.x, src.y]);
  }
  {
    setup({ players: 4, iceBreaker: 1, seed: 23 });
    // Park a one-hit Berg right where a penguin is about to be shoved.
    const p = G.penguins[0];
    const a = Math.atan2(p.y - CY, p.x - CX);
    G.bergs = [{ id: 'berg-0', x: CX + F.cldBergInset() * Math.cos(a),
                 y: CY + F.cldBergInset() * Math.sin(a),
                 r: C.CLD_BERG_R, hits: 1, angle: a }];
    const cs = allHold();
    cs[p.ownerIdx].aims.push(shoveOut(p.id, 1));
    G.commits = cs;
    const tl = F.cldResolveSlide(93);
    ok('the Berg took the hit that emptied it', tl.events.some(e => e.type === 'shatter'));
    check('…and a shattered Berg is gone from the floe', G.bergs.length, 0);
  }
  {
    setup({ players: 5, sylly: true, iceBreaker: 3, seed: 24 });
    const cs = allHold();
    G.penguins.forEach(p => cs[p.ownerIdx].aims.push(shoveOut(p.id, 0.9)));
    cs[0].snowball = { x: CX + 20, y: CY + 20 };
    G.commits = cs;
    const a = JSON.stringify(F.cldResolveSlide(101));

    setup({ players: 5, sylly: true, iceBreaker: 3, seed: 24 });
    const cs2 = allHold();
    G.penguins.forEach(p => cs2[p.ownerIdx].aims.push(shoveOut(p.id, 0.9)));
    cs2[0].snowball = { x: CX + 20, y: CY + 20 };
    G.commits = cs2;
    const b = JSON.stringify(F.cldResolveSlide(101));
    check('the same Floe-Off, commits and seed resolve byte-identically', a === b, true);

    // The seed only reaches the tie-breaks — Berth-slot picks and the
    // exactly-concentric collision normal — so ANY single pair of seeds can
    // legitimately agree. Asserting one pair differs is a coin flip; asserting
    // the seed is wired in at all is the real claim.
    const variants = new Set([a]);
    for (const sd of [102, 103, 104, 105, 106, 107, 108, 109]) {
      setup({ players: 5, sylly: true, iceBreaker: 3, seed: 24 });
      const cs3 = allHold();
      G.penguins.forEach(p => cs3[p.ownerIdx].aims.push(shoveOut(p.id, 0.9)));
      cs3[0].snowball = { x: CX + 20, y: CY + 20 };
      G.commits = cs3;
      variants.add(JSON.stringify(F.cldResolveSlide(sd)));
    }
    ok('…and the resolution seed genuinely reaches the tie-breaks',
      variants.size > 1, 'all 9 seeds resolved identically');
  }
  {
    setup({ players: 4, seed: 25 });
    G.commits = allHold();
    F.cldResolveSlide(110);
    check('commits are cleared after every Slide',
      G.commits, [null, null, null, null]);
    check('…and the Slide counter advanced', G.slideNo, 1);
    check('every Standing player banked a stood Slide',
      G.stats.map(s => s.slidesStood), [1, 1, 1, 1]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Randomised sweep — rim legality across whole matches');
  {
    const rand = G.rng(SEED);
    let slides = 0, floeOffs = 0, washouts = 0, maxHops = 0, deepest = 0;
    let legality = null, thrown = null, bumper = null;

    for (const players of [2, 3, 4, 5, 6, 7, 8]) {
      for (const sylly of [false, true]) {
        for (const peckOff of (players === 2 ? [false, true] : [false])) {
          setup({ players: players, sylly: sylly, peckOff: peckOff,
                  ice: ['powder', 'slush', 'blackice'][players % 3],
                  floe: ['roomy', 'standard', 'cramped'][players % 3],
                  iceBreaker: [0, 1, 3][players % 3],
                  seed: Math.floor(rand() * 1e9) });
          for (let fo = 0; fo < 3; fo++) {
            if (fo > 0) F.cldStartFloeOff(Math.floor(rand() * 1e9));
            floeOffs++;
            for (let s = 0; s < 30; s++) {
              const cs = [];
              for (let i = 0; i < G.playerCount; i++) {
                const mine     = G.penguins.filter(p => p.ownerIdx === i);
                const standing = mine.filter(p => !p.drowned);
                const c = { aims: [], dive: 0, snowball: null };
                standing.forEach(p => {
                  const ang = rand() * TAU;
                  c.aims.push({ penguinId: p.id, dx: Math.cos(ang), dy: Math.sin(ang),
                                power: 0.15 + rand() * 0.85 });
                });
                if (!standing.length && mine.length) c.dive = rand() < 0.5 ? -1 : 1;
                if (rand() < 0.3) {
                  const t = rand() * TAU, rr = rand() * G.radius;
                  c.snowball = { x: CX + rr * Math.cos(t), y: CY + rr * Math.sin(t) };
                }
                cs.push(c);
              }
              G.commits = cs;
              const wasDrowned = new Set(G.penguins.filter(p => p.drowned).map(p => p.id));
              let tl;
              try { tl = F.cldResolveSlide(Math.floor(rand() * 1e9)); }
              catch (e) { thrown = e.message; break; }
              slides++;
              tl.final.forEach(f => {
                if (!wasDrowned.has(f.id)) return;
                if ((f.plunged || f.vx !== 0 || f.vy !== 0) && !bumper)
                  bumper = `${players}p: Drowned penguin ${f.id} moved during a Slide`;
              });
              tl.aftermath.forEach(b => {
                if (b.type === 'surface') { maxHops = Math.max(maxHops, b.hops); }
              });
              deepest = Math.max(deepest, G.penguins.filter(p => p.drowned).length);
              const bad = rimLegal();
              if (bad && !legality) legality = `${players}p sylly=${sylly} peck=${peckOff}: ${bad}`;
              if (tl.washout) washouts++;
              if (tl.floeOffOver) break;
            }
            if (thrown) break;
          }
          if (thrown) break;
        }
        if (thrown) break;
      }
      if (thrown) break;
    }

    ok('no legal Slide ever needed the shunt\'s loud-failure branch', thrown === null, thrown);
    check('no two Drowned penguins ever shared a Berth position, in any configuration',
      legality, null);
    check('and no Drowned penguin was ever moved by a Slide — a bumper, not a body in play',
      bumper, null);
    ok('the sweep genuinely exercised the loop',
      slides > 200 && floeOffs > 20 && washouts > 0,
      `${slides} Slides, ${floeOffs} Floe-Offs, ${washouts} Washouts`);
    console.log(`        (${slides} Slides over ${floeOffs} Floe-Offs · ${washouts} Washouts · ` +
                `deepest rim ${deepest} Drowned · deepest shunt ${maxHops} hop(s))`);
    ok('the deepest shunt legal play reached is within the search\'s reach',
      maxHops <= Math.floor(8 / 2), 'maxHops ' + maxHops);
  }

  console.log('\n' + '='.repeat(58));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
