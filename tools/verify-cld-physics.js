// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-physics.js — asserts js/lib/physics.js against Cold Shoulder's
// tech spec §4A / §4B / §4D. Pure sim only: NO game rules, no Berths, no
// scoring, no DOM. Those belong to verify-cld-loop.js and verify-cld-loopback.js.
//
//   node tools/verify-cld-physics.js         (exits 1 on any failure)
//   CLD_PHYS_SRC=path node tools/…           (drive a different copy — proves a
//                                             broken build actually fails here)
//   CLD_SRC=path node tools/…                (same, for js/games/cld.js)
//
// It re-implements no physics: js/lib/physics.js is evaluated in a vm sandbox
// with a bare `window` stub, so every check runs against the shipped module.
//
// ── The Ice Conditions table lives in cld.js, and is READ from there ───────
// physics.js deliberately does NOT own Ice Conditions mapping (spec §4A), and
// for the whole of Stage 1 this harness owned it instead — there was no cld.js
// to put it in. Stage 2 moved it into js/games/cld.js verbatim, and this
// harness now imports it from there rather than keeping a second copy: a
// harness carrying its own arithmetic verifies its own arithmetic, not the
// shipped game's (cld-implementation-notes TG-01). Every value is still
// DERIVED from the closed form, never a literal — that is the whole point of
// §4B, and `cldMinRadius()` in particular must never be hard-coded.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC  = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');

const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });
const Physics = sandbox.window.Physics;

// ── Cold Shoulder constants — imported from the shipped cld.js (§4, §4B, §4D)
// cld.js declares them with `const`/`let`, so they are lexical globals of the
// vm context rather than properties of the sandbox object; a bridge script run
// in the same context is what hands them back.
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });
vm.runInContext(`globalThis.__cld = {
  CLD_V_MAX, CLD_R_STD, CLD_PENGUIN_R, CLD_BERG_R, CLD_SNOWBALL_R, CLD_SNOWBALL_SPEED,
  CLD_MIN_RADIUS_MULT, CLD_SIM_HZ, CLD_SAMPLE_HZ, CLD_SIM_CAP_MS, CLD_SUBSTEP_MS,
  CLD_ICE_MULT, CLD_FLOE_SIZE,
  cldFullSlideDist, cldDecel, cldMinRadius, cldSnowballForce, cldSnowballArrivalMs,
};`, sandbox, { filename: 'cld-bridge' });
const K = sandbox.__cld;

const CLD_V_MAX           = K.CLD_V_MAX;
const CLD_R_STD           = K.CLD_R_STD;
const CLD_PENGUIN_R       = K.CLD_PENGUIN_R;
const CLD_BERG_R          = K.CLD_BERG_R;
const CLD_SNOWBALL_R      = K.CLD_SNOWBALL_R;
const CLD_SNOWBALL_SPEED  = K.CLD_SNOWBALL_SPEED;
const CLD_MIN_RADIUS_MULT = K.CLD_MIN_RADIUS_MULT;
const CLD_SIM_HZ          = K.CLD_SIM_HZ;
const CLD_SAMPLE_HZ       = K.CLD_SAMPLE_HZ;
const CLD_SIM_CAP_MS      = K.CLD_SIM_CAP_MS;
const CLD_SUBSTEP_MS      = K.CLD_SUBSTEP_MS;

const CLD_ICE_MULT  = K.CLD_ICE_MULT;
const CLD_FLOE_SIZE = K.CLD_FLOE_SIZE;
const ICE_KEYS      = ['powder', 'slush', 'blackice'];

// Derived — never literals. §4B's three consequences all hang off these two.
const cldFullSlideDist = K.cldFullSlideDist;
const cldDecel         = K.cldDecel;
const cldMinRadius     = K.cldMinRadius;

// §4D — force is a fraction of full-power VELOCITY, never of slide distance.
const cldSnowballForce     = K.cldSnowballForce;
const cldSnowballArrivalMs = K.cldSnowballArrivalMs;

const baseParams = ice => ({
  decel:     cldDecel(ice),
  substepMs: CLD_SUBSTEP_MS,
  capMs:     CLD_SIM_CAP_MS,
  sampleHz:  CLD_SAMPLE_HZ,
});

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function close(label, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${expected} ±${tol}, got ${actual}`));
}
function ok(label, cond, detail) {
  if (!cond) failures++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}` +
    (cond ? '' : `\n          ${detail === undefined ? '(condition false)' : detail}`));
}
const section = t => console.log(`\n${t}`);

// ── Scenario helpers ──────────────────────────────────────────────────────
const W = R => ({ cx: 180, cy: 180, radius: R });
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const byId = (list, id) => list.find(f => f.id === id);
const evs  = (res, type) => res.events.filter(e => e.type === type);

// A single resting penguin, one max-force snowball straight through it from the
// centre outward. Returns how far the snowball alone carried it.
function snowballTravel(ice, R, startDist) {
  const px = 180 + startDist, py = 180;
  const res = Physics.simulate({
    world:   W(R),
    bodies:  [{ id: 'p', x: px, y: py, r: CLD_PENGUIN_R }],
    impulses: [],
    events:  [{ t: 0, type: 'snowball', x: px, y: py, radius: CLD_SNOWBALL_R,
                force: cldSnowballForce(0, 2 * R), from: { x: 180 - 50, y: 180 } }],
    params:  baseParams(ice),
    seed:    1234,
  });
  const f = byId(res.final, 'p');
  return { res, travel: dist(px, py, f.x, f.y), plunged: f.plunged };
}

(function () {
  console.log('Cold Shoulder — physics module verification\n' + '='.repeat(58));
  console.log(`source: ${path.relative(ROOT, SRC).replace(/\\/g, '/')}`);
  console.log('consts: ' + path.relative(ROOT, GAME).split(path.sep).join('/'));

  // ═══════════════════════════════════════════════════════════════════════
  section('Module surface');
  check('window.Physics exists', typeof Physics, 'object');
  check('Physics.simulate is a function', typeof Physics.simulate, 'function');
  check('Physics.rng is a function (seeded — callers must not roll their own)',
    typeof Physics.rng, 'function');
  ok('decel is required — no silent fallback hides a wiring mistake', (() => {
    try { Physics.simulate({ world: W(130), bodies: [], params: {} }); return false; }
    catch (_) { return true; }
  })());
  {
    // §4A's boundary is a property of the SOURCE, not of any one run — a stray
    // Date.now() or Math.random() would pass every behavioural check below on
    // the machine that wrote it and desync a real table. Checked mechanically.
    // The sole permitted `window` touch is the closing export assignment.
    const src = fs.readFileSync(SRC, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const banned = ['Math.random', 'Date.now', 'new Date', 'performance.now',
                    'document.', 'requestAnimationFrame', 'setTimeout', 'setInterval',
                    'localStorage', 'fetch('];
    check('no DOM, no clock, no bare Math.random() anywhere in the module',
      banned.filter(t => src.includes(t)), []);
    check('the only `window` reference is the export itself',
      (src.match(/window\./g) || []).length, 1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('§4B — Coulomb friction and the closed form d = v0^2 / (2a)');
  // The discrete velocity-first scheme UNDER-shoots the closed form by (N-1)/N.
  // Undershoot is the safe direction: every §4B invariant is computed FROM the
  // closed form, so measured ≤ theoretical always leaves margin.
  for (const ice of ICE_KEYS) {
    const D = cldFullSlideDist(ice);
    const res = Physics.simulate({
      world:   W(100000),                     // no rim — measuring pure travel
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'p', vx: CLD_V_MAX, vy: 0 }],
      params:  baseParams(ice),
      seed:    7,
    });
    const f = byId(res.final, 'p');
    const travelled = f.x - 180;
    close(`${ice}: a full-power Slide travels D = ${D.toFixed(0)}`, travelled, D, D * 0.01);
    ok(`${ice}: the scheme under-shoots the closed form (never over)`,
      travelled <= D, `travelled ${travelled} > D ${D}`);
    ok(`${ice}: it comes to rest inside the cap`, res.capped === false && f.vx === 0 && f.vy === 0,
      `capped=${res.capped} vx=${f.vx} vy=${f.vy}`);
  }
  close('Slush is calibrated so a full pull crosses about one Standard radius',
    cldFullSlideDist('slush') / CLD_R_STD, 1.0, 0.001);
  check('§4B table — full-power slide distances 91 / 130 / 182',
    ICE_KEYS.map(i => Math.round(cldFullSlideDist(i))), [91, 130, 182]);
  check('§4B table — minimum floe radii 46 / 65 / 91 (COMPUTED, never literals)',
    ICE_KEYS.map(i => Math.round(cldMinRadius(i))), [46, 65, 91]);
  ok('the floor moves WITH Ice Conditions — Black Ice bottoms out larger than Powder',
    cldMinRadius('blackice') > cldMinRadius('powder'));
  ok('The Thaw can roughly halve a Standard floe (130 → 65) before it stops',
    Math.abs(cldMinRadius('slush') / CLD_FLOE_SIZE.standard - 0.5) < 0.001);

  // ═══════════════════════════════════════════════════════════════════════
  section('Rest detection terminates');
  {
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'p', vx: 30, vy: 40 }],
      params:  baseParams('blackice'),        // the slipperiest — longest to stop
      seed:    3,
    });
    const f = byId(res.final, 'p');
    check('velocity is clamped to EXACTLY zero, not merely small', [f.vx, f.vy], [0, 0]);
    ok('the run ends well before the cap', res.capped === false && res.durationMs < CLD_SIM_CAP_MS,
      `capped=${res.capped} duration=${res.durationMs}`);
    const last = res.samples[res.samples.length - 1];
    const prev = res.samples[res.samples.length - 2];
    check('the final two sample frames are identical (nothing still creeping)', last, prev);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('The 5 s cap forces rest (enforced IN the sim, never by the caller)');
  {
    const res = Physics.simulate({
      world:   W(20000),                      // never reaches a rim
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'p', vx: 3000, vy: 0 }],   // ~34 s of glide at slush decel
      params:  baseParams('slush'),
      seed:    3,
    });
    check('the run reports itself capped', res.capped, true);
    check('duration is exactly the cap', res.durationMs, CLD_SIM_CAP_MS);
    check('sample count matches capMs at CLD_SAMPLE_HZ', res.samples.length,
      CLD_SIM_CAP_MS / (1000 / CLD_SAMPLE_HZ) + 1);
    const f = byId(res.final, 'p');
    check('a still-moving body is forced to rest at the cap', [f.vx, f.vy], [0, 0]);
    check('it did not plunge — the cap is a time bound, not a boundary event', f.plunged, false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('No tunnelling at maximum power');
  {
    // …through a penguin
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'a', x: 100, y: 180, r: CLD_PENGUIN_R },
                { id: 'b', x: 260, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'a', vx: CLD_V_MAX, vy: 0 }],
      params:  baseParams('blackice'),
      seed:    11,
    });
    const a = byId(res.final, 'a'), b = byId(res.final, 'b');
    ok('a full-power body registers a collision with a resting penguin',
      evs(res, 'collision').length >= 1, JSON.stringify(res.events));
    ok('it never passes through — the mover stays on its own side',
      a.x < b.x, `a.x=${a.x} b.x=${b.x}`);
    ok('and the pair is not left overlapping',
      dist(a.x, a.y, b.x, b.y) >= 2 * CLD_PENGUIN_R - 0.01,
      `gap=${dist(a.x, a.y, b.x, b.y)}`);
    ok('the struck penguin was moved (momentum actually transferred)', b.x > 260);
  }
  {
    // …through a Berg
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'a', x: 100, y: 180, r: CLD_PENGUIN_R },
                { id: 'g', x: 260, y: 180, r: CLD_BERG_R, kind: 'berg', hits: 3 }],
      impulses: [{ bodyId: 'a', vx: CLD_V_MAX, vy: 0 }],
      params:  baseParams('blackice'),
      seed:    11,
    });
    const a = byId(res.final, 'a'), g = byId(res.final, 'g');
    check('a full-power hit on a Berg is a rebound, not a pass-through',
      evs(res, 'rebound').map(e => e.off), ['berg']);
    ok('the mover stays on its own side of the Berg', a.x < g.x, `a.x=${a.x} g.x=${g.x}`);
    check('the Berg never moves (immovable)', [g.x, g.y], [260, 180]);
    check('the Berg took exactly one hit for one contact', g.hits, 2);
  }
  {
    // …through the rim
    const R = 110;
    const res = Physics.simulate({
      world:   W(R),
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'p', vx: CLD_V_MAX, vy: 0 }],
      params:  baseParams('blackice'),
      seed:    11,
    });
    const plunges = evs(res, 'plunge');
    check('one plunge event', plunges.length, 1);
    const d = dist(plunges[0].x, plunges[0].y, 180, 180);
    ok('the plunge is detected within one substep of the rim, not far beyond it',
      d > R && d <= R + CLD_V_MAX * (CLD_SUBSTEP_MS / 1000) + 0.5, `exit distance ${d}, R ${R}`);
    ok('the plunge carries a non-zero exit velocity (the shunt tie-break needs it)',
      Math.hypot(plunges[0].vx, plunges[0].vy) > 0);
    const f = byId(res.final, 'p');
    check('final[] agrees with the event', [f.plunged, f.exitVx === plunges[0].vx], [true, true]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Restitution asymmetry — drowned > 1 (energetic), Berg <= 1 (cushioned)');
  ok('default drownedRestitution > 1', Physics.DEFAULTS.drownedRestitution > 1,
    String(Physics.DEFAULTS.drownedRestitution));
  ok('default bergRestitution <= 1', Physics.DEFAULTS.bergRestitution <= 1,
    String(Physics.DEFAULTS.bergRestitution));
  {
    const run = kind => {
      const res = Physics.simulate({
        world:   W(100000),
        bodies:  [{ id: 'a', x: 160, y: 180, r: CLD_PENGUIN_R },
                  { id: 'x', x: 260, y: 180, r: CLD_PENGUIN_R, kind: kind,
                    hits: kind === 'berg' ? 9 : undefined }],
        impulses: [{ bodyId: 'a', vx: 120, vy: 0 }],
        params:  baseParams('blackice'),
        seed:    5,
      });
      const reb = evs(res, 'rebound')[0];
      const a = byId(res.final, 'a');
      // Travel back from the contact point is the observable form of restitution.
      return { impactSpeed: reb.speed, bounceBack: reb.x - a.x, anchor: byId(res.final, 'x') };
    };
    const dr = run('drowned'), bg = run('berg');
    ok('a Drowned penguin flings you back further than a Berg does',
      dr.bounceBack > bg.bounceBack, `drowned ${dr.bounceBack} vs berg ${bg.bounceBack}`);
    close('both were struck at the same speed (a fair comparison)',
      dr.impactSpeed, bg.impactSpeed, 0.001);
    check('neither anchor moves — immovable bodies are never displaced by de-overlap',
      [dr.anchor.x, dr.anchor.y, bg.anchor.x, bg.anchor.y], [260, 180, 260, 180]);
    // The inversion, stated as the sim sees it: e > 1 returns MORE speed than
    // arrived; e <= 1 returns less. This is the rim mechanic's entire arc.
    // Outgoing speed is recovered from how far the body coasts back — under
    // Coulomb friction v_out = sqrt(2 a d), the same closed form §4B rests on.
    const CONTACT_X = 260 - CLD_PENGUIN_R * 2;   // where the surfaces meet
    const bounce = kind => {
      const a = cldDecel('slush');
      const res = Physics.simulate({
        world:   W(100000),
        bodies:  [{ id: 'a', x: CONTACT_X - 1, y: 180, r: CLD_PENGUIN_R },
                  { id: 'x', x: 260, y: 180, r: CLD_PENGUIN_R, kind: kind, hits: 9 }],
        impulses: [{ bodyId: 'a', vx: 100, vy: 0 }],
        params:  baseParams('slush'),
        seed:    5,
      });
      const inSpeed = evs(res, 'rebound')[0].speed;
      const back    = CONTACT_X - byId(res.final, 'a').x;
      return { inSpeed: inSpeed, ratio: Math.sqrt(2 * a * back) / inSpeed };
    };
    const bDr = bounce('drowned'), bBg = bounce('berg');
    ok('off a Drowned penguin you leave FASTER than you arrived (e > 1)',
      bDr.ratio > 1, `ratio ${bDr.ratio.toFixed(3)}`);
    ok('off a Berg you leave SLOWER than you arrived (e <= 1)',
      bBg.ratio < 1, `ratio ${bBg.ratio.toFixed(3)}`);
    close('the drowned bounce matches drownedRestitution exactly',
      bDr.ratio, Physics.DEFAULTS.drownedRestitution, 0.02);
    close('the Berg bounce matches bergRestitution exactly',
      bBg.ratio, Physics.DEFAULTS.bergRestitution, 0.02);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('§4D — the Snowball distance-force curve (a VELOCITY fraction, §16 Q4)');
  {
    const maxRange = 2 * CLD_R_STD;
    close('point-blank force = 0.40 x v_max', cldSnowballForce(0, maxRange), 0.40 * CLD_V_MAX, 1e-9);
    close('max-range force = 0.20 x v_max', cldSnowballForce(maxRange, maxRange), 0.20 * CLD_V_MAX, 1e-9);
    close('half range = 0.30 x v_max (linear lerp)',
      cldSnowballForce(maxRange / 2, maxRange), 0.30 * CLD_V_MAX, 1e-9);
    ok('force falls monotonically with distance',
      [0, 60, 120, 180, 240, 260].every((d, i, arr) =>
        i === 0 || cldSnowballForce(d, maxRange) < cldSnowballForce(arr[i - 1], maxRange)));
    ok('a near throw lands before a far one (arrival = distance / speed)',
      cldSnowballArrivalMs(40) < cldSnowballArrivalMs(200));

    // Displacement must go as force^2 / (2a) — the signature of a velocity
    // impulse. If force were ever wired as a fraction of DISTANCE it would go
    // linearly instead, and this check is what catches it.
    const a = cldDecel('slush');
    for (const d of [0, maxRange / 2, maxRange]) {
      const F = cldSnowballForce(d, maxRange);
      const res = Physics.simulate({
        world:   W(100000),
        bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
        events:  [{ t: 0, type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                    force: F, from: { x: 100, y: 180 } }],
        params:  baseParams('slush'),
        seed:    9,
      });
      const travel = byId(res.final, 'p').x - 180;
      close(`throw at range ${Math.round(d)} carries the target F^2/(2a) = ${(F * F / (2 * a)).toFixed(1)}`,
        travel, F * F / (2 * a), Math.max(0.6, F * F / (2 * a) * 0.02));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('§4D — the per-throw invariant, every Ice Conditions x both radius extremes');
  // "A single Snowball, at any range, can never by itself push a RESTING
  // penguin off the floe." The measurable form is its reach across open ice:
  // 0.16 x D, which at the tightest legal floe (R = 0.5 x D) is 0.32 x R.
  // Were force a fraction of slide distance instead, it would be 0.80 x R.
  for (const ice of ICE_KEYS) {
    const D = cldFullSlideDist(ice);
    for (const [name, R] of [['tightest legal (The Thaw floor)', cldMinRadius(ice)],
                             ['roomiest', CLD_FLOE_SIZE.roomy]]) {
      const { travel } = snowballTravel(ice, R, 0);
      close(`${ice} @ ${name}: a max-force throw carries 0.16 x D = ${(0.16 * D).toFixed(1)}`,
        travel, 0.16 * D, Math.max(0.6, 0.16 * D * 0.02));
      ok(`${ice} @ ${name} R=${R.toFixed(0)}: reach is ${(travel / R).toFixed(2)} x R — under 0.35`,
        travel / R < 0.35, `ratio ${(travel / R).toFixed(3)}`);
      // The behavioural half: a penguin resting with more than that reach of ice
      // in front of it cannot be thrown in by one Snowball, from any range.
      const start = R - travel - 2;
      const { plunged } = snowballTravel(ice, R, start);
      check(`${ice} @ ${name}: a penguin resting ${(travel + 2).toFixed(0)} inboard survives a point-blank throw`,
        plunged, false);
    }
  }
  ok('at the tightest legal floe the reach is ~0.32 x R at EVERY Ice Conditions setting',
    ICE_KEYS.every(ice => {
      const R = cldMinRadius(ice);
      return Math.abs(snowballTravel(ice, R, 0).travel / R - 0.32) < 0.02;
    }));

  // ═══════════════════════════════════════════════════════════════════════
  section('§4D — scheduled, sequential landings: the race, never a sum');
  {
    // Two throws at the same spot. The near one lands first at full force; by
    // the time the far one arrives the target has gone and it hits open ice.
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      events:  [{ t: 800, type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(240, 260), from: { x: 40, y: 180 } },
                { t: 100, type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(0, 260), from: { x: 140, y: 180 } }],
      params:  baseParams('slush'),
      seed:    2,
    });
    const land = evs(res, 'landing');
    check('both throws resolve, in LANDING order — not input order', land.length, 2);
    ok('the earlier landing is first in the event list', land[0].t < land[1].t,
      `${land[0].t} vs ${land[1].t}`);
    check('the first throw connects', land[0].hit, 'penguin');
    check('the second finds empty ice — a race, not a stack', land[1].hit, null);

    // …and the displacement equals ONE throw's, proving nothing was summed.
    const solo = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      events:  [{ t: 100, type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(0, 260), from: { x: 140, y: 180 } }],
      params:  baseParams('slush'),
      seed:    2,
    });
    close('two throws at one spot move the target exactly as far as one did',
      byId(res.final, 'p').x, byId(solo.final, 'p').x, 1e-9);

    // The control: a second throw aimed where the target ACTUALLY is does land.
    const chase = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'p', x: 180, y: 180, r: CLD_PENGUIN_R }],
      events:  [{ t: 100, type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(0, 260), from: { x: 140, y: 180 } },
                { t: 800, type: 'snowball', x: byId(solo.final, 'p').x, y: 180,
                  radius: CLD_SNOWBALL_R, force: cldSnowballForce(0, 260),
                  from: { x: 140, y: 180 } }],
      params:  baseParams('slush'),
      seed:    2,
    });
    check('a throw led onto the target’s new position does connect',
      evs(chase, 'landing').map(e => e.hit), ['penguin', 'penguin']);
    ok('and it carries the target further than one throw alone',
      byId(chase.final, 'p').x > byId(solo.final, 'p').x);
  }
  {
    // Snowball x Drowned penguin: nothing at all. Snowball x Berg: one hit.
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'd', x: 180, y: 180, r: CLD_PENGUIN_R, kind: 'drowned' },
                { id: 'g', x: 300, y: 180, r: CLD_BERG_R, kind: 'berg', hits: 3 }],
      events:  [{ t: 0,  type: 'snowball', x: 180, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(0, 260), from: { x: 100, y: 180 } },
                { t: 50, type: 'snowball', x: 300, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(250, 260), from: { x: 100, y: 180 } }],
      params:  baseParams('slush'),
      seed:    4,
    });
    check('landings are classified by what they struck',
      evs(res, 'landing').map(e => e.hit), ['drowned', 'berg']);
    check('a Drowned penguin is unmoved by a Snowball — nothing at all',
      [byId(res.final, 'd').x, byId(res.final, 'd').y], [180, 180]);
    check('a Berg takes exactly one hit, regardless of range', byId(res.final, 'g').hits, 2);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Bergs — a shatter mid-sim opens that edge for the rest of the Slide');
  {
    // Identical Slide twice. The only difference is WHEN a Snowball clears the
    // guardrail: before the sliding penguin arrives, or after.
    const build = snowballT => ({
      world:   W(130),
      bodies:  [{ id: 'p', x: 200, y: 180, r: CLD_PENGUIN_R },
                { id: 'g', x: 280, y: 180, r: CLD_BERG_R, kind: 'berg', hits: 1 }],
      impulses: [{ bodyId: 'p', vx: CLD_V_MAX, vy: 0 }],
      events:  [{ t: snowballT, type: 'snowball', x: 280, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(200, 260), from: { x: 60, y: 180 } }],
      params:  baseParams('slush'),
      seed:    6,
    });
    const early = Physics.simulate(build(200));    // clears the Berg mid-slide
    const late  = Physics.simulate(build(2000));   // arrives long after the rebound

    check('early: the Berg shatters', evs(early, 'shatter').map(e => e.cause), ['snowball']);
    check('early: no rebound happened — the guardrail was already gone',
      evs(early, 'rebound').length, 0);
    check('early: the penguin slides on through and plunges',
      byId(early.final, 'p').plunged, true);

    check('late: the penguin rebounds off the intact Berg',
      evs(late, 'rebound').map(e => e.off), ['berg']);
    check('late: it does NOT plunge — the guardrail did its job',
      byId(late.final, 'p').plunged, false);
    const lateShatter = evs(late, 'shatter');
    check('late: that same contact empties the Berg (the saving hit still cushions)',
      [lateShatter.length, lateShatter[0] && lateShatter[0].cause], [1, 'collision']);
    ok('late: the shatter is timestamped at the rebound, not at the throw',
      lateShatter[0].t === evs(late, 'rebound')[0].t,
      `shatter ${lateShatter[0].t} vs rebound ${evs(late, 'rebound')[0].t}`);
    check('a shattered Berg reports itself in final[]',
      [byId(late.final, 'g').hits, byId(late.final, 'g').shattered], [0, true]);
  }
  {
    // One contact = one hit, however many substeps it spans. A dead-stop
    // penguin (restitution 0) parks against the Berg and stays overlapping for
    // the rest of the run; a far-future Snowball keeps the sim alive ~350 more
    // substeps. Charge per substep instead of per contact onset and this Berg
    // shatters within milliseconds.
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'a', x: 230, y: 180, r: CLD_PENGUIN_R, restitution: 0 },
                { id: 'g', x: 260, y: 180, r: CLD_BERG_R, kind: 'berg', hits: 3 }],
      impulses: [{ bodyId: 'a', vx: 60, vy: 0 }],
      events:  [{ t: 3000, type: 'snowball', x: 50, y: 50, radius: CLD_SNOWBALL_R,
                  force: 30, from: { x: 0, y: 0 } }],   // lands on open ice; just holds the clock
      params:  baseParams('powder'),
      seed:    8,
    });
    ok('the penguin really did come to rest touching the Berg',
      Math.abs(dist(byId(res.final, 'a').x, byId(res.final, 'a').y, 260, 180)
               - (CLD_PENGUIN_R + CLD_BERG_R)) < 0.5,
      `gap ${dist(byId(res.final, 'a').x, byId(res.final, 'a').y, 260, 180)}`);
    ok('the sim ran on long past the contact', res.durationMs >= 3000, String(res.durationMs));
    check('a long, resting contact still costs exactly one hit', byId(res.final, 'g').hits, 2);
    check('and never shatters it', evs(res, 'shatter').length, 0);
    check('one rebound, one hit — the pair is charged per CONTACT, not per substep',
      evs(res, 'rebound').filter(e => e.offId === 'g').length, 1);
  }
  {
    // Two SEPARATE approaches must cost two hits: the penguin rebounds off the
    // Berg, is Snowballed back into it, and rebounds again. This is the other
    // half of the same invariant — a hit is neither charged twice for one
    // contact nor missed for a second one.
    const res = Physics.simulate({
      world:   W(100000),
      bodies:  [{ id: 'a', x: 230, y: 180, r: CLD_PENGUIN_R },
                { id: 'g', x: 260, y: 180, r: CLD_BERG_R, kind: 'berg', hits: 3 }],
      impulses: [{ bodyId: 'a', vx: 80, vy: 0 }],
      events:  [{ t: 900, type: 'snowball', x: 224, y: 180, radius: CLD_SNOWBALL_R,
                  force: cldSnowballForce(0, 260), from: { x: 60, y: 180 } }],
      params:  baseParams('powder'),
      seed:    8,
    });
    check('a Snowball drives the penguin back into the Berg for a second rebound',
      evs(res, 'rebound').filter(e => e.offId === 'g').length, 2);
    check('two rebounds cost two hits', byId(res.final, 'g').hits, 1);
    check('rebounds off a Berg and hits taken stay one-to-one, always',
      3 - byId(res.final, 'g').hits, evs(res, 'rebound').filter(e => e.offId === 'g').length);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Boundary and immovability');
  {
    const res = Physics.simulate({
      world:   W(130),
      bodies:  [{ id: 'p', x: 200, y: 180, r: CLD_PENGUIN_R },
                { id: 'd', x: 180 + 128, y: 180, r: CLD_PENGUIN_R, kind: 'drowned' },
                { id: 'g', x: 180, y: 180 + 126, r: CLD_BERG_R, kind: 'berg', hits: 3 }],
      impulses: [{ bodyId: 'p', vx: 20, vy: 0 },
                 { bodyId: 'd', vx: 400, vy: 0 },   // must be ignored outright
                 { bodyId: 'g', vx: 400, vy: 0 }],
      params:  baseParams('slush'),
      seed:    10,
    });
    check('immovable bodies never move', [byId(res.final, 'd').x, byId(res.final, 'g').y], [308, 306]);
    // Refusing the impulse outright is not the same as refusing to integrate it:
    // a phantom velocity on an anchor would silently skew every `vrel` computed
    // against it, and the whole restitution asymmetry is read off `vrel`.
    check('and they carry no phantom velocity — the impulse is refused, not just unused',
      [byId(res.final, 'd').vx, byId(res.final, 'd').vy,
       byId(res.final, 'g').vx, byId(res.final, 'g').vy], [0, 0, 0, 0]);
    check('immovable bodies sitting ON the rim never plunge themselves',
      res.events.filter(e => e.type === 'plunge').length, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Timeline shape (the payload clients replay)');
  {
    const res = Physics.simulate({
      world:   W(130),
      bodies:  [{ id: 'a', x: 150, y: 180, r: CLD_PENGUIN_R },
                { id: 'b', x: 230, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'a', vx: CLD_V_MAX, vy: 0 }],
      params:  baseParams('slush'),
      seed:    12,
    });
    check('body order in every frame matches input order (2 bodies → 4 ints)',
      res.samples.every(f => f.length === 4), true);
    check('every sample coordinate is a quantised integer',
      res.samples.every(f => f.every(v => Number.isInteger(v))), true);
    check('frame 0 is the pre-Slide state', res.samples[0], [150, 180, 230, 180]);
    check('durationMs lands exactly on the sample grid',
      res.durationMs % (1000 / CLD_SAMPLE_HZ), 0);
    check('durationMs agrees with the frame count',
      res.durationMs, (res.samples.length - 1) * (1000 / CLD_SAMPLE_HZ));
    ok('every event falls within the timeline',
      res.events.every(e => e.t >= 0 && e.t <= res.durationMs),
      JSON.stringify(res.events.map(e => e.t)) + ` vs ${res.durationMs}`);
    ok('events are emitted in non-decreasing time order',
      res.events.every((e, i, arr) => i === 0 || e.t >= arr[i - 1].t));
    check('final[] carries one entry per body, in input order',
      res.final.map(f => f.id), ['a', 'b']);
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('Determinism — the whole model rests on it');
  {
    // A deliberately busy Slide: six penguins, two Drowned bumpers, two Bergs,
    // three scheduled Snowballs, collisions, a shatter and plunges.
    const busy = seed => ({
      world:   W(130),
      bodies:  [
        { id: 'p0', x: 180, y: 140, r: CLD_PENGUIN_R },
        { id: 'p1', x: 210, y: 165, r: CLD_PENGUIN_R },
        { id: 'p2', x: 205, y: 205, r: CLD_PENGUIN_R },
        { id: 'p3', x: 160, y: 215, r: CLD_PENGUIN_R },
        { id: 'p4', x: 145, y: 170, r: CLD_PENGUIN_R },
        { id: 'p5', x: 180, y: 185, r: CLD_PENGUIN_R },
        { id: 'd0', x: 180 + 127, y: 180,       r: CLD_PENGUIN_R, kind: 'drowned' },
        { id: 'd1', x: 180,       y: 180 - 127, r: CLD_PENGUIN_R, kind: 'drowned' },
        { id: 'g0', x: 180 - 105, y: 180,       r: CLD_BERG_R, kind: 'berg', hits: 1 },
        { id: 'g1', x: 180,       y: 180 + 105, r: CLD_BERG_R, kind: 'berg', hits: 3 },
      ],
      impulses: [
        { bodyId: 'p0', vx:  120, vy:   40 }, { bodyId: 'p1', vx:  -90, vy:   70 },
        { bodyId: 'p2', vx:  -60, vy: -110 }, { bodyId: 'p3', vx:  140, vy:  -30 },
        { bodyId: 'p4', vx:   50, vy:  130 }, { bodyId: 'p5', vx: -130, vy:  -50 },
      ],
      events: [
        { t: 120, type: 'snowball', x: 200, y: 160, radius: CLD_SNOWBALL_R,
          force: cldSnowballForce(60, 260), from: { x: 300, y: 100 } },
        { t: 340, type: 'snowball', x: 160, y: 210, radius: CLD_SNOWBALL_R,
          force: cldSnowballForce(180, 260), from: { x: 70, y: 290 } },
        { t: 900, type: 'snowball', x: 180 - 105, y: 180, radius: CLD_SNOWBALL_R,
          force: cldSnowballForce(220, 260), from: { x: 300, y: 180 } },
      ],
      params: baseParams('slush'),
      seed:   seed,
    });
    const a1 = JSON.stringify(Physics.simulate(busy(1)));
    const a2 = JSON.stringify(Physics.simulate(busy(1)));
    check('the same seed, run twice, is byte-identical', a1 === a2, true);

    let allSame = true;
    for (const s of [2, 7, 99, 0xDEADBEEF, 4294967295]) {
      if (JSON.stringify(Physics.simulate(busy(s))) !== a1) allSame = false;
      const r1 = JSON.stringify(Physics.simulate(busy(s)));
      const r2 = JSON.stringify(Physics.simulate(busy(s)));
      if (r1 !== r2) { allSame = false; }
    }
    check('every seed is self-consistent AND agrees — no hidden nondeterminism ' +
          'on a path that never draws a random number', allSame, true);

    const busyRes = Physics.simulate(busy(1));
    ok('the scenario is genuinely busy (collisions, rebounds, landings, a shatter, plunges)',
      ['collision', 'rebound', 'landing', 'shatter', 'plunge']
        .every(t => evs(busyRes, t).length > 0),
      JSON.stringify(['collision', 'rebound', 'landing', 'shatter', 'plunge']
        .map(t => t + ':' + evs(busyRes, t).length)));
    ok('and it still terminates inside the cap', busyRes.capped === false,
      `duration ${busyRes.durationMs}`);

    // Reordering the input event array must not change the outcome: landings are
    // sorted by t with a stable tie-break, so the wire's ordering is irrelevant.
    const shuffled = busy(1);
    shuffled.events = [shuffled.events[2], shuffled.events[0], shuffled.events[1]];
    check('the input order of scheduled events does not matter — only their t does',
      JSON.stringify(Physics.simulate(shuffled)) === a1, true);
  }
  {
    const r = Physics.rng(12345);
    const first = [r(), r(), r(), r()];
    const r2 = Physics.rng(12345);
    check('Physics.rng is reproducible from its seed', [r2(), r2(), r2(), r2()], first);
    ok('and stays inside [0,1)', first.every(v => v >= 0 && v < 1), JSON.stringify(first));
    const r3 = Physics.rng(12346);
    ok('a different seed gives a different stream', r3() !== first[0]);
  }

  console.log('\n' + '='.repeat(58));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
