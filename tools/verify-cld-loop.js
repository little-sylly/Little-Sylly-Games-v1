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
// (the wire). This one owns everything physics.js deliberately does NOT: ring
// geometry (where a Drowned penguin seats), plugs, knock-back, displacement,
// Throw-or-Dive, The Thaw's
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
    CLD_W, CLD_H, CLD_THAW_STEP, CLD_PENGUIN_R, CLD_BERG_R,
    CLD_RING_COVER, CLD_SLIP_GAPS, CLD_SLIP_GAP_WIDTH, CLD_START_RING, CLD_MIN_POWER, CLD_V_MAX, CLD_R_STD,
    CLD_MIN_RADIUS_MULT, CLD_SIM_CAP_MS, CLD_FLOE_SIZE, CLD_ICE_MULT,
    CLD_SNOWBALL_R, CLD_SNOWBALL_SPEED, CLD_PLUG_OUT, CLD_BACK_OFFSET,
    CLD_HUNGER_EVERY, CLD_HUNGER_STEP,
  },
  fn: {
    cldFullSlideDist, cldDecel, cldMinRadius, cldSnowballForce, cldSnowballArrivalMs,
    cldStanding, cldPlayersAlive, cldNormAngle, cldRimPos, cldDistFromCentre,
    cldPlaceDrowned, cldSeatAt, cldKnockBack, cldSurfaceAt,
    cldApplyCommit, cldStartIceBath, cldBathRadius,
    cldPlaceBergs, cldProjectBergsToRim, cldBergInset,
    cldStartMatch, cldStartFloeOff, cldBuildSlideInputs, cldResolveSlide,
    cldThawStep, cldCheckWashout, cldResolveFloeOff, cldMatchWinner, cldSimParams,
    cldChunkR, cldSeatR, cldAngleOf, cldArcDist, cldSeatSpotFrom, cldRingAnchors, cldSeatSpot,
    cldHungerLevel, cldHungerMult, cldHungerRises,
  },
  rng(s) { return window.Physics.rng(s); },
  get penguins()    { return cldPenguins; },    set penguins(v)    { cldPenguins = v; },
  get bergs()       { return cldBergs; },       set bergs(v)       { cldBergs = v; },
  get commits()     { return cldCommits; },     set commits(v)     { cldCommits = v; },
  get radius()      { return cldFloeRadius; },  set radius(v)      { cldFloeRadius = v; },
  get playerCount() { return cldPlayerCount; }, set playerCount(v) { cldPlayerCount = v; },
  get fish()        { return cldFish; },        set fish(v)        { cldFish = v; },
  get stats()       { return cldMatchStats; },  set stats(v)       { cldMatchStats = v; },
  get slideNo()     { return cldSlideNo; },     set slideNo(v)     { cldSlideNo = v; },
  get floeOffNo()    { return cldFloeOffNo; },
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
function cldMid(a, b) { return a + ((b - a) / 2); }

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

// Every player holds — a legal, deliberate zero-power commit (§7).
function allHold() {
  return Array.from({ length: G.playerCount }, () => ({ aims: [], dive: null, snowball: null }));
}

// Aim one penguin straight out from the centre at full power.
function shoveOut(penguinId, power) {
  const p = pen(penguinId);
  const len = Math.hypot(p.x - CX, p.y - CY) || 1;
  return { penguinId: penguinId, dx: (p.x - CX) / len, dy: (p.y - CY) / len,
           power: power === undefined ? 1 : power };
}

// Rim legality — the invariant every path in the game has to preserve (SW v243):
// a Standing penguin holds no seat; a Plugged one sits on the ring circle at its
// own angle overlapping nothing; a Knocked-back one bobs just outside the rim.
function rimLegal() {
  for (const p of G.penguins) {
    if (!p.drowned) { if (p.plug || p.angle !== null) return 'standing penguin holds a seat: ' + p.id; continue; }
    const want = p.plug ? G.radius + C.CLD_PLUG_OUT : G.radius + C.CLD_BACK_OFFSET;
    if (Math.abs(distC(p.x, p.y) - want) > 1e-6)
      return (p.plug ? 'plug off the seat circle: ' : 'knocked-back penguin off its drift line: ') + p.id;
    if (F.cldArcDist(Math.atan2(p.y - CY, p.x - CX), p.angle) > 1e-6) return 'Drowned penguin off its angle: ' + p.id;
    if (!p.plug) continue;
    for (const a of F.cldRingAnchors(p.id))
      if (Math.hypot(p.x - a.x, p.y - a.y) < C.CLD_PENGUIN_R + a.r - 1e-6) return 'plug ' + p.id + ' overlaps ' + a.id;
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
    // physics.js warms its xorshift up because raw first draws cluster near 0 for
    // small seeds, and every seeded pick in cld.js (Berg placement, slip gaps)
    // takes its FIRST draws. Pinned directly: the SW v243 Thaw sweep that used to
    // notice a cold generator cannot since plugs float clear of the chunks.
    const firsts = Array.from({ length: 40 }, (_, i) => G.rng(i + 1)());
    ok('Physics.rng: first draws spread across small seeds (the warm-up)',
      firsts.filter(v => v > 0.1).length >= 20, firsts.map(v => v.toFixed(3)).join(' '));
  }
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
  }
  {
    // §4B's table, recomputed from the closed form rather than copied.
    close('Powder full-power slide distance',   F.cldFullSlideDist('powder'),   119, 0.001);
    close('Slush full-power slide distance',    F.cldFullSlideDist('slush'),    170, 0.001);
    close('Black Ice full-power slide distance', F.cldFullSlideDist('blackice'), 238, 0.001);
    close('Powder minimum floe radius',    F.cldMinRadius('powder'),   59.5, 0.001);
    close('Slush minimum floe radius',     F.cldMinRadius('slush'),    85,   0.001);
    close('Black Ice minimum floe radius', F.cldMinRadius('blackice'), 119,  0.001);
    ok('the floor MOVES with Ice Conditions — Black Ice bottoms out on a bigger floe',
      F.cldMinRadius('blackice') > F.cldMinRadius('slush') &&
      F.cldMinRadius('slush') > F.cldMinRadius('powder'));
    ok('every Ice Conditions deceleration reproduces its own closed form',
      ['powder', 'slush', 'blackice'].every(i =>
        Math.abs((C.CLD_V_MAX * C.CLD_V_MAX) / (2 * F.cldDecel(i)) - F.cldFullSlideDist(i)) < 1e-9));
    G.ice = 'blackice';
    close('the derived helpers default to the LIVE Ice Conditions', F.cldMinRadius(), 119, 0.001);
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
    close('a Standard floe can roughly halve before it stops (170 → 85)',
      F.cldMinRadius('slush') / C.CLD_FLOE_SIZE.standard, 0.5, 1e-9);
  }

  section('The Thaw — who rides the rim inward, and who does not');
  {
    setup({ players: 4, sylly: true, iceBreaker: 3, seed: 4 });
    const drowned = G.penguins[0];
    const seat = F.cldSeatSpot(1.0, drowned.id);
    F.cldSeatAt(drowned, seat);
    const angleBefore = drowned.angle;
    const inner = G.penguins[1];
    inner.x = CX + 10; inner.y = CY;
    const outer = G.penguins[2];
    const to = G.radius - C.CLD_THAW_STEP;
    outer.x = CX + (to + 4); outer.y = CY;               // left outside the new rim

    const t = F.cldThawStep(G.rng(6));
    close('a Plugged penguin rides the seat circle inward', distC(drowned.x, drowned.y), G.radius + C.CLD_PLUG_OUT, 1e-9);
    close('…keeping its angle exactly',
      F.cldArcDist(Math.atan2(drowned.y - CY, drowned.x - CX), angleBefore), 0, 1e-9);
    ok('…still Plugged', drowned.plug === true);
    ok('a surviving Berg rides the rim inward too',
      G.bergs.length > 0 &&
      G.bergs.every(b => Math.abs(distC(b.x, b.y) - F.cldBergInset()) < 1e-9));
    ok('a Standing penguin comfortably inside is untouched',
      inner.drowned === false && inner.x === CX + 10);
    ok('a Standing penguin the ice ran out from under goes in', outer.drowned === true);
    check('…as its own thaw-drop beat', t.beats.some(b => b.type === 'thaw-drop' &&
      b.penguinId === outer.id), true);
    check('…followed by a surface beat', t.beats.some(b => b.type === 'surface' &&
      b.penguinId === outer.id), true);
    check('…and it counts as a plunge on the stat line',
      G.stats[outer.ownerIdx].plunges, 1);
    check('the rim stays legal after a thaw-drop', rimLegal(), null);
  }
  {
    // A thaw-drop is not through a gap — it surfaces at the free seat nearest
    // its own angle (spec §3.5). With no ring at all, that is its own angle.
    setup({ players: 6, sylly: true, iceBreaker: 0, seed: 8 });
    const to = G.radius - C.CLD_THAW_STEP;
    const dropper = G.penguins[0];
    const a = 0.7;
    dropper.x = CX + (to + 5) * Math.cos(a);
    dropper.y = CY + (to + 5) * Math.sin(a);
    F.cldThawStep(G.rng(21));
    ok('a thaw-drop on an open rim seats Plugged at its own angle',
      dropper.plug === true && F.cldArcDist(dropper.angle, a) < 1e-9);
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
    check('…one mid-Slide seat per penguin', tl.events.filter(e => e.type === 'seat').length, 3);
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
    // Peck Off: all four penguins in at once on the smallest ring.
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
    // The ring (SW v242): sized by coverage, 2–3 slip gaps a penguin fits
    // through, hairline cracks elsewhere, never overlapping — on every floe size.
    const ringGaps = () => {
      const inset = F.cldBergInset();
      const chunk = 2 * inset * Math.asin(C.CLD_BERG_R / inset);
      const ang = G.bergs.map(b => b.angle).sort((p, q) => p - q);
      return ang.map((x, i) => {
        const nx = i + 1 < ang.length ? ang[i + 1] : ang[0] + 2 * Math.PI;
        return (nx - x) * inset - chunk;
      });
    };
    let cover = true, slips = true, noStack = true, full = true, inside = true, cracks = true;
    ['roomy', 'standard', 'cramped'].forEach(size => {
      for (let seed = 30; seed < 42; seed++) {
        setup({ players: 4, iceBreaker: 3, seed: seed, floe: size });
        const inset = F.cldBergInset();
        const iceArc = G.bergs.length * 2 * inset * Math.asin(C.CLD_BERG_R / inset);
        const share = iceArc / (2 * Math.PI * inset);
        if (share < C.CLD_RING_COVER - 0.05 || share > C.CLD_RING_COVER + 0.001) cover = false;
        const gaps = ringGaps();
        const wide = gaps.filter(g => g >= 2 * C.CLD_PENGUIN_R * C.CLD_SLIP_GAP_WIDTH[0] - 1e-6);
        if (wide.length < C.CLD_SLIP_GAPS[0] || wide.length > C.CLD_SLIP_GAPS[1]) slips = false;
        if (gaps.some(g => g < -1e-6)) noStack = false;
        if (gaps.some(g => g > 1e-6 && g < 2 * C.CLD_PENGUIN_R * C.CLD_SLIP_GAP_WIDTH[0] - 1e-6
                        && g >= 2 * C.CLD_PENGUIN_R)) cracks = false;
        if (G.bergs.some(b => b.hits !== 3)) full = false;
        if (!G.bergs.every(b => Math.abs(distC(b.x, b.y) - inset) < 1e-9)) inside = false;
      }
    });
    ok('Ice Breaker on rings the floe at CLD_RING_COVER of its circumference (3 sizes × 12 seeds)', cover);
    ok('…with 2–3 slip gaps a penguin fits through', slips);
    ok('…every other gap a crack a penguin cannot fit through', cracks);
    ok('…never stacked on each other', noStack);
    ok('…each with its full hit capacity', full);
    ok('…all sitting just inside the rim', inside);

    // The Thaw calves the ring rather than piling it up.
    setup({ players: 4, iceBreaker: 3, seed: 33 });
    const before = G.bergs.length;
    G.radius = G.radius * 0.6;
    F.cldProjectBergsToRim();
    ok('a shrunken rim calves chunks off the ring', G.bergs.length < before);
    ok('…and what is left never overlaps', ringGaps().every(g => g > -0.02));
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

    // Since SW v243 the seed reaches ONE tie-break — the exactly-concentric
    // collision normal (the seeded Berth-slot pick is gone with the Berths) —
    // so only a Slide with two penguins stacked on one spot can show it. The
    // real claim is that the seed is wired into the sim at all.
    const variants = new Set();
    for (const sd of [102, 103, 104, 105, 106, 107, 108, 109]) {
      setup({ players: 2, iceBreaker: 0, seed: 24 });
      G.penguins.forEach(p => { p.x = CX + 10; p.y = CY; });   // exactly concentric
      G.commits = allHold();
      variants.add(JSON.stringify(F.cldResolveSlide(sd).final));
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
  section('Ring geometry — where a Drowned penguin seats (spec §3.1)');
  {
    setup({ players: 4, iceBreaker: 2, seed: 50 });
    const RC = G.radius - C.CLD_BERG_R;             // the chunk circle, measured directly
    const S  = G.radius + C.CLD_PLUG_OUT;           // the seat circle, measured directly
    const P = C.CLD_PENGUIN_R;
    const touching = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1e-6;

    check('with no anchors the spot is exactly the asked angle',
      Math.round(F.cldSeatSpotFrom([], 1.0).angle * 1e6), 1e6);

    let onCircle = true, clear = true, behind = false;
    for (let k = 0; k < 72; k++) {
      const s = F.cldSeatSpot(k * TAU / 72, null);
      if (!s) continue;
      const me = { x: s.x, y: s.y, r: P };
      if (Math.abs(Math.hypot(s.x - CX, s.y - CY) - S) > 1e-6) onCircle = false;
      if (!F.cldRingAnchors(null).every(a => touching(me, a))) clear = false;
      // Never behind a chunk: the seat's angle must be one a penguin could PASS
      // the chunk ring at (the ban taken at the chunk's own radius).
      G.bergs.forEach(b => {
        const half = 2 * Math.asin(Math.min(1, (b.r + P) / (2 * Math.hypot(b.x - CX, b.y - CY))));
        if (F.cldArcDist(s.angle, Math.atan2(b.y - CY, b.x - CX)) < half - 1e-9) behind = true;
      });
    }
    ok('every seat floats in the Drink, one body-radius past the edge', onCircle);
    ok('…overlapping no chunk and no plug', clear);
    ok('…and never behind a chunk — only where a penguin could get through', !behind);

    // After a shatter the gap is WIDE, so seats no longer snap to its centre —
    // this is where a ban taken at the wrong radius would let a plug creep in
    // behind the neighbouring chunks. Sweep again with three chunks gone.
    const keep = G.bergs;
    G.bergs = keep.filter((b, i) => i < 3 || i > 5);         // three neighbours gone: wider than the centring rule
    let behindWide = false, wideSeats = 0;
    for (let k = 0; k < 360; k++) {
      const s = F.cldSeatSpot(k * TAU / 360, null);
      if (!s) continue;
      wideSeats++;
      G.bergs.forEach(b => {
        const half = 2 * Math.asin(Math.min(1, (b.r + P) / (2 * Math.hypot(b.x - CX, b.y - CY))));
        if (F.cldArcDist(s.angle, Math.atan2(b.y - CY, b.x - CX)) < half - 1e-9) behindWide = true;
      });
    }
    G.bergs = keep;
    ok('beside a shattered chunk, no seat creeps in behind its neighbours', wideSeats > 0 && !behindWide);


    // A slip gap: narrow → the seat is the gap's centre, whatever the asked angle.
    const gapAngles = G.bergs.map(b => b.angle).sort((a, b) => a - b);
    const chunkHalf = Math.asin(C.CLD_BERG_R / RC);
    let centred = true, found = 0;
    gapAngles.forEach((a, i) => {
      const nx = i + 1 < gapAngles.length ? gapAngles[i + 1] : gapAngles[0] + TAU;
      const edgeGap = (nx - a - 2 * chunkHalf) * RC;
      if (edgeGap < 2 * P) return;                     // a crack, not a gap
      found++;
      const mid = cldMid(a, nx);
      const s1 = F.cldSeatSpot(a + chunkHalf + 0.01, null);
      const s2 = F.cldSeatSpot(nx - chunkHalf - 0.01, null);
      if (!s1 || !s2 || F.cldArcDist(s1.angle, mid) > 1e-6 || F.cldArcDist(s2.angle, mid) > 1e-6) centred = false;
    });
    ok('the generated ring has slip gaps', found >= 2);
    ok('…and a seat anywhere in a slip gap lands at its centre', centred);
  }
  {
    section('The seal — a floating plug holds its gap on every floe size (spec § 3.1)');
    // Hand-built worst case per floe size: two chunks with the WIDEST slip gap the
    // ring can generate, a plug floating at the gap's centre, and a penguin driven
    // at full power at every offset across the gap and every approach within ±60°.
    // Only a plunge THROUGH the gap counts — the mini world has open rim elsewhere.
    let sealed = true, worst = '';
    for (const size of ['roomy', 'standard', 'cramped']) {
      setup({ players: 3, iceBreaker: 3, floe: size, seed: 51 });
      const RC = G.radius - C.CLD_BERG_R, S = G.radius + C.CLD_PLUG_OUT;
      const widest = 2 * C.CLD_PENGUIN_R * C.CLD_SLIP_GAP_WIDTH[1];
      const half = Math.asin(C.CLD_BERG_R / RC);
      const a0 = 0, a1 = a0 + 2 * half + widest / RC, mid = (a0 + a1) / 2;
      const at = (a, r) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
      for (let off = -1; off <= 1.0001; off += 0.125) for (const tilt of [-1, -0.5, 0, 0.5, 1]) {
        const lane = mid + off * (a1 - a0) / 2, dir = lane + tilt * Math.PI / 3;
        const start = at(lane, RC - 60);
        const res = sandbox.window.Physics.simulate({
          world: { cx: CX, cy: CY, radius: G.radius },
          bodies: [{ id: 'p', x: start.x, y: start.y, r: C.CLD_PENGUIN_R },
                   Object.assign({ id: 'g0', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, at(a0, RC)),
                   Object.assign({ id: 'g1', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, at(a1, RC)),
                   // hits: 99 — this proves GEOMETRY (nobody squeezes past a floating plug).
                   // With the real one hit, a glancing blow knocks the plug back and the
                   // shover may follow it in: the one-contact rule, checked on its own below.
                   Object.assign({ id: 'd', r: C.CLD_PENGUIN_R, kind: 'drowned', hits: 99 }, at(mid, S))],
          impulses: [{ bodyId: 'p', vx: Math.cos(dir) * C.CLD_V_MAX, vy: Math.sin(dir) * C.CLD_V_MAX }],
          params: F.cldSimParams(), seed: 9 });
        const pl = res.events.find(e => e.type === 'plunge' && e.id === 'p');
        if (pl) {
          const pa = Math.atan2(pl.y - CY, pl.x - CX);
          if (pa >= a0 - 1e-9 && pa <= a1 + 1e-9) { sealed = false; worst = size + ' off ' + off + ' tilt ' + tilt; }
        }
      }
    }
    ok('a floating plug seals the widest slip gap on Roomy, Standard and Cramped, at every offset and angle', sealed, worst);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('The Slide — instant plugs, one-hit knock-back, displacement (spec §3.2–3.3)');
  {
    // Two penguins shoved at the SAME slip gap, one behind the other.
    setup({ players: 3, iceBreaker: 3, seed: 52 });
    const s = F.cldSeatSpot(0, null);                // centre of the nearest gap to angle 0
    const [p0, p1, p2] = G.penguins;
    const lane = (p, back) => { p.x = CX + (F.cldChunkR() - back) * Math.cos(s.angle); p.y = CY + (F.cldChunkR() - back) * Math.sin(s.angle); };
    lane(p0, 25); lane(p1, 70); p2.x = CX - 40; p2.y = CY;
    const cs = allHold();
    cs[0].aims.push({ penguinId: p0.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 0.7 });
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(301);
    ok('the first penguin plugged the gap mid-Slide', tl.events.some(e => e.type === 'seat' && e.id === p0.id));
    ok('…and the second rebounded off it instead of following it in',
      !tl.events.some(e => e.type === 'plunge' && e.id === p1.id));
    check('…the plug took that hit and is Knocked back', [pen(p0.id).drowned, pen(p0.id).plug], [true, false]);
    close('…bobbing outside its gap', Math.hypot(pen(p0.id).x - CX, pen(p0.id).y - CY),
      G.radius + C.CLD_BACK_OFFSET, 1e-6);
    ok('the timeline names its body order', Array.isArray(tl.bodyIds) && tl.bodyIds[0] === p0.id);
  }
  {
    // A plug is ENERGETIC (restitution > 1): whoever bounces off it travels further
    // than it arrived with — the "does not save you, shoves you back harder" rule.
    setup({ players: 3, iceBreaker: 0, seed: 54 });
    const [p0, p1, p2] = G.penguins;
    p0.drowned = true; p0.plug = true; p0.angle = 0; F.cldPlaceDrowned(p0);
    p1.x = CX; p1.y = CY; p2.x = CX; p2.y = CY - 60;
    const cs = allHold();
    cs[1].aims.push({ penguinId: p1.id, dx: 1, dy: 0, power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(303);
    const hit = tl.events.find(e => e.type === 'rebound' && e.id === p1.id && e.offId === p0.id);
    // hit.x/y is on the PLUG's surface; p1's centre starts one radius further out.
    const rest = hit ? Math.hypot(pen(p1.id).x - hit.x, pen(p1.id).y - hit.y) - C.CLD_PENGUIN_R : 0;
    const flat = hit ? hit.speed * hit.speed / (2 * F.cldDecel()) : Infinity;   // e = 1
    ok('a penguin bounces off a plug further than it arrived (restitution > 1)',
      !!hit && rest > 1.25 * flat, 'rest ' + rest.toFixed(1) + ' vs e=1 ' + flat.toFixed(1));
    // A plug seated BEFORE the Slide absorbs one hit too — not only one seated
    // mid-Slide (physics gives those hits: 1 itself). Since SW v245 plugs float
    // past the edge and can never overlap a chunk, so the overlap sweeps below no
    // longer catch a plug that never breaks; this does.
    check('…and a plug seated before the Slide takes that hit and is Knocked back',
      [pen(p0.id).drowned, pen(p0.id).plug], [true, false]);
  }
  {
    // Displacement: a Knocked-back penguin in the gap a new plunge seats into moves on.
    setup({ players: 3, iceBreaker: 3, seed: 53 });
    const [p0, p1, p2] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    p0.drowned = true; p0.plug = false; p0.angle = s.angle; F.cldPlaceDrowned(p0);   // knocked back, in that gap
    p1.x = CX + (F.cldChunkR() - 25) * Math.cos(s.angle); p1.y = CY + (F.cldChunkR() - 25) * Math.sin(s.angle);
    const cs = allHold();
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 0.7 });
    G.commits = cs;
    const tl = F.cldResolveSlide(302);
    ok('the new penguin plugged the gap', pen(p1.id).plug === true);
    const d = tl.aftermath.find(b => b.type === 'displace' && b.penguinId === p0.id);
    ok('…the knocked-back one was displaced, as its own beat', !!d);
    ok('…to a different free seat, Plugged again', pen(p0.id).plug === true && F.cldArcDist(pen(p0.id).angle, s.angle) > 1e-3);
  }
  {
    // Every arrival path keeps the ring legal: no plug overlaps a chunk or a plug.
    let legal = true;
    for (let seed = 60; seed < 90; seed++) {
      setup({ players: 3 + (seed % 6), iceBreaker: 1 + (seed % 3), seed: seed });
      for (let k = 0; k < 6; k++) {
        const cs = allHold();
        G.penguins.forEach(p => { if (!p.drowned) cs[p.ownerIdx].aims.push(shoveOut(p.id, 0.6 + 0.4 * ((seed + k) % 2))); });
        G.commits = cs;
        F.cldResolveSlide(seed * 31 + k);
        const plugs = G.penguins.filter(p => p.drowned && p.plug);
        plugs.forEach(p => {
          if (Math.abs(Math.hypot(p.x - CX, p.y - CY) - (G.radius + C.CLD_PLUG_OUT)) > 1e-6) legal = false;
          F.cldRingAnchors(p.id).forEach(a => {
            if (Math.hypot(p.x - a.x, p.y - a.y) < C.CLD_PENGUIN_R + a.r - 1e-6) legal = false;
          });
        });
        if (F.cldCheckWashout() || F.cldPlayersAlive() <= 1) break;
      }
    }
    ok('after every Slide of 30 random Floe-Offs, no plug overlaps anything on the ring', legal);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Throw or Dive (spec §3.4)');
  const knockBackAt = (p, a) => { p.drowned = true; p.plug = false; p.angle = a; F.cldPlaceDrowned(p); };
  {
    setup({ players: 3, iceBreaker: 3, seed: 70 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(Math.PI, null);
    knockBackAt(p0, s.angle - 0.30);          // nearer
    knockBackAt(p1, s.angle + 0.60);          // further
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].dive = { penguinId: p1.id, angle: s.angle };
    G.commits = cs;
    F.cldResolveSlide(401);
    close('two Dives at one spot: the CLOSER penguin takes it', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
    ok('…the other goes to the free seat nearest the target, Plugged',
      pen(p1.id).plug === true && F.cldArcDist(pen(p1.id).angle, s.angle) > 1e-3);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 71 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(Math.PI, null);
    knockBackAt(p1, s.angle - 0.30);          // same distance, seat 1
    knockBackAt(p0, s.angle + 0.30);          // same distance, seat 0 — wins the tie
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].dive = { penguinId: p1.id, angle: s.angle };
    G.commits = cs;
    F.cldResolveSlide(402);
    close('equal distances fall back to seat order', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 72 });
    const [p0] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    p0.drowned = true; p0.plug = true; p0.angle = s.angle; F.cldPlaceDrowned(p0);
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: Math.PI };
    G.commits = cs;
    F.cldResolveSlide(403);
    close('a PLUGGED penguin cannot Dive', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 73 });
    const [p0] = G.penguins;
    knockBackAt(p0, 0);
    check('host drops the Snowball when a commit also Dives',
      (F.cldApplyCommit(0, { aims: [], dive: { penguinId: p0.id, angle: 1 }, snowball: { x: 180, y: 180 } }, G.slideNo),
       G.commits[0].snowball), null);
    const tl = F.cldResolveSlide(404);
    ok('…so no Snowball lands that Slide', !tl.events.some(e => e.type === 'landing'));
  }
  {
    // Review Focus 5 — a Dive seals its gap before anyone slides at it.
    setup({ players: 3, iceBreaker: 3, seed: 74 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    knockBackAt(p0, s.angle + 1.0);
    p1.x = CX + (F.cldChunkR() - 30) * Math.cos(s.angle); p1.y = CY + (F.cldChunkR() - 30) * Math.sin(s.angle);
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(405);
    ok('a Dive is in place for the Slide it was committed with — the shove rebounds',
      !tl.events.some(e => e.type === 'plunge' && e.id === p1.id));
  }
  {
    // Review Focus 3 — The Thaw to its floor never leaves overlaps.
    let clean = true;
    for (let seed = 80; seed < 95; seed++) {
      setup({ players: 6, iceBreaker: 3, sylly: true, seed: seed });
      G.penguins.slice(0, 4).forEach((p, k) => { const sp = F.cldSeatSpot(k * TAU / 4, p.id); if (sp) { p.drowned = true; p.plug = true; p.angle = sp.angle; F.cldPlaceDrowned(p); } });
      for (let k = 0; k < 14; k++) {
        G.commits = allHold();
        F.cldResolveSlide(seed * 17 + k);
        const plugs = G.penguins.filter(p => p.drowned && p.plug);
        plugs.forEach(p => F.cldRingAnchors(p.id).forEach(a => {
          if (Math.hypot(p.x - a.x, p.y - a.y) < C.CLD_PENGUIN_R + a.r - 1e-6) clean = false;
        }));
        if (F.cldCheckWashout()) break;
      }
    }
    ok('The Thaw shrinking to its floor never leaves a plug overlapping a chunk or a plug', clean);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('The Ice Bath — a Washout becomes sudden death (spec §4)');
  {
    setup({ players: 4, iceBreaker: 2, seed: 90, fishToWin: 3 });
    const [p0, p1, p2, p3] = G.penguins;
    // p2, p3 already Drowned; p0 and p1 go in together this Slide.
    [p2, p3].forEach((p, k) => { const sp = F.cldSeatSpot(Math.PI + k, p.id); p.drowned = true; p.plug = true; p.angle = sp.angle; F.cldPlaceDrowned(p); });
    G.bergs = [];                               // make the edge open so both really go in
    const cs = allHold();
    cs[0].aims.push(shoveOut(p0.id, 1)); cs[1].aims.push(shoveOut(p1.id, 1));
    G.commits = cs;
    const fishBefore = JSON.stringify(G.fish);
    const floeOffBefore = G.floeOffNo;
    const tl = F.cldResolveSlide(501);
    check('a Washout names the bath: the penguins Standing going into the Slide',
      (tl.bathIds || []).slice().sort(), [p0.id, p1.id].sort());
    F.cldStartIceBath(tl.bathIds, 777);
    check('…no Fish awarded, same Floe-Off', [JSON.stringify(G.fish), G.floeOffNo], [fishBefore, floeOffBefore]);
    check('…the bath penguins are Standing again, the rest still Drowned',
      G.penguins.map(p => p.drowned), [false, false, true, true]);
    check('…on a ringless floe', G.bergs.length, 0);
    close('…sized to the bath', G.radius, F.cldBathRadius(2, 4), 1e-9);
    ok('…the Drowned re-seated Plugged on the new rim',
      [p2, p3].every(p => pen(p.id).plug && Math.abs(Math.hypot(pen(p.id).x - CX, pen(p.id).y - CY) - (G.radius + C.CLD_PLUG_OUT)) < 1e-6));
    ok('…and the floor holds', F.cldBathRadius(1, 8) >= 1.25 * F.cldMinRadius() - 1e-9);
  }
  {
    // Review Focus 2 — repeated baths shrink or hold, and always have ≥ 2 owners.
    let sane = true, ringless = true;
    for (let seed = 100; seed < 130; seed++) {
      setup({ players: 3 + (seed % 5), iceBreaker: 1, seed: seed });
      let last = G.penguins.length;
      for (let k = 0; k < 40; k++) {
        const cs = allHold();
        G.penguins.forEach(p => { if (!p.drowned) cs[p.ownerIdx].aims.push(shoveOut(p.id, 1)); });
        G.commits = cs;
        const tl = F.cldResolveSlide(seed * 101 + k);
        if (tl.bathIds) {
          const owners = new Set(tl.bathIds.map(id => pen(id).ownerIdx));
          if (tl.bathIds.length > last || owners.size < 2) sane = false;
          last = tl.bathIds.length;
          F.cldStartIceBath(tl.bathIds, seed + k);
          if (G.bergs.length) ringless = false;
        } else if (tl.floeOffOver) break;
      }
    }
    ok('every bath roster is ≥ 2 owners and never larger than the last', sane);
    ok('…and every bath starts ringless, whatever Ice Breaker the match uses', ringless);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Hunger — full power grows every few Slides (owner, 29 Sep 2026)');
  {
    // `played` = Slides already resolved this Floe-Off (the aiming-phase cldSlideNo).
    check('the constants: every 4 Slides, ×1.04 a step (tuned, DD-19)', [C.CLD_HUNGER_EVERY, C.CLD_HUNGER_STEP], [4, 1.04]);
    const K = C.CLD_HUNGER_STEP;
    check('levels by Slides played — 0 through 3 fed, then a step every 4',
      [0, 1, 3, 4, 7, 8, 11, 12].map(F.cldHungerLevel), [0, 0, 0, 1, 1, 2, 2, 3]);
    close('…the multiplier compounds (level 2 = step²)', F.cldHungerMult(8), K * K, 1e-12);
    check('…and is exactly 1 before the first step', F.cldHungerMult(3), 1);
    check('it RISES at the first Slide of each new level, never at the start',
      [0, 1, 4, 5, 8, 12].map(F.cldHungerRises), [false, false, true, false, true, true]);

    setup({ players: 3, seed: 21 });
    const aim = () => { const cs = allHold(); cs[2].aims.push({ penguinId: G.penguins[2].id, dx: 1, dy: 0, power: 0.5 }); return cs; };
    G.commits = aim();
    const speed = inp => Math.hypot(inp.impulses[0].vx, inp.impulses[0].vy);
    close('build defaults to the live count — a fresh Floe-Off launches at power × v_max',
      speed(F.cldBuildSlideInputs()), 0.5 * C.CLD_V_MAX, 1e-9);
    close('…after 4 Slides it launches one step faster', speed(F.cldBuildSlideInputs(4)), 0.5 * C.CLD_V_MAX * K, 1e-9);
    close('…after 8, two steps', speed(F.cldBuildSlideInputs(8)), 0.5 * C.CLD_V_MAX * K * K, 1e-9);

    const cs = allHold();
    cs[0].snowball = { x: G.penguins[0].x + 40, y: G.penguins[0].y };
    G.commits = cs;
    G.slideNo = 12;                                  // the live count too, however a build reads it
    close('a Snowball does NOT get hungry — its force stays a fraction of the base v_max',
      F.cldBuildSlideInputs(12).events[0].force, (0.40 + (0.20 - 0.40) * 40 / (2 * G.radius)) * C.CLD_V_MAX, 1e-9);
    G.slideNo = 0;

    // The real resolve path: a lone penguin slid toward the centre on an empty
    // ring. Decel is the base one, so reach grows as the square of the launch.
    const travel = played => {
      setup({ players: 2, seed: 5 });
      G.slideNo = played;
      const p = G.penguins[0], x0 = p.x, y0 = p.y;
      const cs2 = allHold();
      cs2[0].aims.push({ penguinId: p.id, dx: CX - x0, dy: CY - y0, power: 0.5 });
      G.commits = cs2;
      F.cldResolveSlide(77);
      return Math.hypot(p.x - x0, p.y - y0);
    };
    close('resolving the 5th Slide slides step² as far as the 1st (reach ∝ v²)',
      travel(4) / travel(0), K * K, 0.01);
    close('…and the 4th Slide is still fed', travel(3) / travel(0), 1, 1e-9);

    setup({ players: 3, seed: 21 });
    G.slideNo = 9;
    F.cldStartFloeOff(22);
    check('a Resurface resets Hunger (the count starts again)', F.cldHungerLevel(G.slideNo), 0);
    G.slideNo = 9;
    F.cldStartIceBath(['0-0', '1-0'], 23);
    check('…and so does an Ice Bath', F.cldHungerLevel(G.slideNo), 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Randomised sweep — rim legality across whole matches');
  {
    const rand = G.rng(SEED);
    let slides = 0, floeOffs = 0, washouts = 0, deepest = 0, seats = 0, knocks = 0;
    let legality = null, thrown = null, bumper = null;

    for (const players of [2, 3, 4, 5, 6, 7, 8]) {
      for (const sylly of [false, true]) {
        for (const peckOff of (players === 2 ? [false, true] : [false])) {
          setup({ players: players, sylly: sylly, peckOff: peckOff,
                  ice: ['powder', 'slush', 'blackice'][players % 3],
                  floe: ['roomy', 'standard', 'cramped'][players % 3],
                  iceBreaker: [0, 1, 2, 3][players % 4],
                  seed: Math.floor(rand() * 1e9) });
          for (let fo = 0; fo < 3; fo++) {
            if (fo > 0) F.cldStartFloeOff(Math.floor(rand() * 1e9));
            floeOffs++;
            for (let s = 0; s < 30; s++) {
              const cs = [];
              for (let i = 0; i < G.playerCount; i++) {
                const mine     = G.penguins.filter(p => p.ownerIdx === i);
                const standing = mine.filter(p => !p.drowned);
                const c = { aims: [], dive: null, snowball: null };
                standing.forEach(p => {
                  const ang = rand() * TAU;
                  c.aims.push({ penguinId: p.id, dx: Math.cos(ang), dy: Math.sin(ang),
                                power: 0.15 + rand() * 0.85 });
                });
                const back = mine.find(p => p.drowned && !p.plug);
                if (back && rand() < 0.5) c.dive = { penguinId: back.id, angle: rand() * TAU };
                else if (rand() < 0.3) {
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
              seats  += tl.events.filter(e => e.type === 'seat').length;
              knocks += tl.events.filter(e => e.type === 'knockback').length;
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

    ok('no Slide ever threw', thrown === null, thrown);
    check('no plug ever left the ring circle or overlapped a chunk or a plug, in any configuration',
      legality, null);
    check('and no Drowned penguin was ever moved by a Slide — a bumper, not a body in play',
      bumper, null);
    ok('the sweep genuinely exercised the loop',
      slides > 200 && floeOffs > 20 && washouts > 0 && seats > 0 && knocks > 0,
      `${slides} Slides, ${floeOffs} Floe-Offs, ${washouts} Washouts`);
    console.log(`        (${slides} Slides over ${floeOffs} Floe-Offs · ${washouts} Washouts · ` +
                `deepest rim ${deepest} Drowned · ${seats} seats · ${knocks} knock-backs)`);
  }

  console.log('\n' + '='.repeat(58));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
