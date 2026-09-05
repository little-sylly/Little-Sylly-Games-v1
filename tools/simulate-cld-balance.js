// ═══════════════════════════════════════════════════════════════════════════
// simulate-cld-balance.js — balance instrument for Cold Shoulder (spec §15).
//
//   node tools/simulate-cld-balance.js [floeOffsPerConfig]   (default 120)
//   CLD_SEED=n            reproducibility (default 20260903)
//   CLD_SRC= / CLD_PHYS_SRC=   drive a different copy of either file
//
// It ASSERTS NOTHING and always exits 0. A balance reading is a tuning signal,
// not a contract — a flaky exit code would make the build lie. Read the report.
//
// ── What it measures (§15's list) ──────────────────────────────────────────
//   • Slides per Floe-Off            — is a Floe-Off the right length?
//   • Plunges per Slide              — is the floe emptying at the right rate?
//   • Snowball race-miss rate        — §4D's stated proof-number
//   • Slides to first Berg shatter   — is Ice Breaker doing anything?
//   • Leader-punishment rate         — §6's claim, measured instead of assumed
// across 3–8 players, all three Ice Conditions, both Thaw states.
//
// ── The five [Stage-3 tunable] constants it exists to resolve ──────────────
//   CLD_V_MAX · CLD_SNOWBALL_R · CLD_SNOWBALL_SPEED · CLD_THAW_STEP ·
//   CLD_BERG_COUNT   (+ a read on CLD_MIN_RADIUS_MULT, brief §19's third item)
// § F prints a verdict line per constant, each naming the number behind it.
//
// ── The honest caveat, stated up front ─────────────────────────────────────
// Cold Shoulder's whole tension is a SOCIAL read — who is ganging up on whom,
// under blind simultaneous commit. A bot has none of that. So this tool does
// NOT predict play; it measures the MECHANICAL response of the rules to a
// stated policy. That is why § E runs three policies side by side rather than
// one "realistic" one: the useful number is the spread, not any absolute.
//
// The bots live entirely in this file. Nothing here is a rule, and nothing
// here may migrate into js/games/cld.js.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');
const SEED = Number(process.env.CLD_SEED || 20260903);

// --probe <preset> runs ONE config and prints a single JSON line. It exists so
// the tool can sweep a `const` it cannot reach from inside its own process:
// § G patches js/games/cld.js into a temp file, re-spawns this script with
// CLD_SRC= pointing at it, and reads the line back. Same mechanism as
// tools/mutate-cld.js — the constant under test is always the SHIPPED one at
// the top of the report, and only § G ever sees a patched copy.
const ARGV   = process.argv.slice(2);
const PROBE  = ARGV.indexOf('--probe') >= 0 ? ARGV[ARGV.indexOf('--probe') + 1] : null;
const RUNS   = parseInt(ARGV.filter(a => /^[0-9]+$/.test(a))[0], 10) || (PROBE ? 90 : 120);

const sandbox = {
  console: { log() {}, warn() {} },
  window: {},
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {}, setTimeout: () => 0, clearTimeout() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playAbyssThud() {}, playHullThud() {}, playAlarm() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called from the rules layer'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called from the rules layer'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });

// cld.js declares everything with const/let, so nothing lands on the sandbox
// object by itself. Same bridge trick as the two verify-* harnesses.
vm.runInContext(`globalThis.__cld = {
  C: { CLD_W, CLD_H, CLD_PENGUIN_R, CLD_BERG_R, CLD_BERG_COUNT, CLD_BERTH_SLOTS,
       CLD_THAW_STEP, CLD_START_RING, CLD_MIN_POWER, CLD_V_MAX, CLD_R_STD,
       CLD_SNOWBALL_R, CLD_SNOWBALL_SPEED, CLD_MIN_RADIUS_MULT, CLD_SIM_CAP_MS,
       CLD_SAMPLE_HZ, CLD_FLOE_SIZE, CLD_ICE_MULT },
  fn: { cldFullSlideDist, cldDecel, cldMinRadius, cldSnowballForce, cldSnowballArrivalMs,
        cldStanding, cldPlayersAlive, cldDistFromCentre, cldStartMatch, cldStartFloeOff,
        cldResolveSlide, cldMatchWinner },
  rng(s) { return window.Physics.rng(s); },
  get penguins()   { return cldPenguins; },
  get bergs()      { return cldBergs; },
  set commits(v)   { cldCommits = v; },
  get radius()     { return cldFloeRadius; },
  get fish()       { return cldFish; },
  set ice(v)       { cldIceConditions = v; },
  set floe(v)      { cldFloeSize = v; },
  set sylly(v)     { cldSyllyMode = v; },
  set peckOff(v)   { cldPeckOff = v; },
  set fishToWin(v) { cldFishToWin = v; },
  set iceBreaker(v){ cldIceBreaker = v; },
};`, sandbox, { filename: 'cld-balance-bridge' });

const G = sandbox.__cld, C = G.C, F = G.fn;
const SAMPLE_MS = 1000 / C.CLD_SAMPLE_HZ;

// ── Small stats bag ───────────────────────────────────────────────────────
function Acc() { return { v: [] }; }
Acc.mean = a => a.v.length ? a.v.reduce((s, x) => s + x, 0) / a.v.length : 0;
Acc.q    = (a, p) => {
  if (!a.v.length) return 0;
  const s = a.v.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
Acc.max  = a => a.v.length ? Math.max.apply(null, a.v) : 0;
const f1 = x => x.toFixed(1);
const f2 = x => x.toFixed(2);
const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '   —  ';

// ═══════════════════════════════════════════════════════════════════════════
// The bots. Not rules — a stated policy, so § E's spread means something.
// ═══════════════════════════════════════════════════════════════════════════
const AIM = { sharp: 0.05, normal: 0.18, loose: 0.32 };   // radians, 1σ

// Sum-of-three-uniforms — near-Gaussian, bounded, and cheap. Bounded matters:
// a true Gaussian tail occasionally aims a bot at nothing, which would show up
// in the whiff rate and be read as a Snowball problem.
function gauss(rand) { return (rand() + rand() + rand() - 1.5) * 2; }

function rivals(me) { return F.cldStanding().filter(p => p.ownerIdx !== me); }
function nearest(from, list) {
  let best = null, bd = Infinity;
  list.forEach(p => {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bd) { bd = d; best = p; }
  });
  return best;
}

// `vindictive` sends everyone after whoever currently leads on Fish. It is not
// a prediction — it is the upper bound on how much a table CAN punish a leader
// if it decides to, which is the only half of §6's claim a bot can measure.
function pickTarget(me, from, policy) {
  const rs = rivals(me);
  if (!rs.length) return null;
  if (policy === 'vindictive') {
    const fish = G.fish, top = Math.max.apply(null, fish);
    const leaders = rs.filter(p => fish[p.ownerIdx] === top && top > 0);
    if (leaders.length) return nearest(from, leaders);
  }
  return nearest(from, rs);
}

function botCommit(i, rand, policy, aimSigma, pSnow) {
  const mine = F.cldStanding().filter(p => p.ownerIdx === i);
  const D    = F.cldFullSlideDist();
  const aims = [];

  mine.forEach(p => {
    const t = pickTarget(i, p, policy);
    if (!t) return;                                  // nobody to shove — hold
    const dist = Math.hypot(t.x - p.x, t.y - p.y);
    const ang  = Math.atan2(t.y - p.y, t.x - p.x) + gauss(rand) * aimSigma;
    // Push THROUGH the target, not up to it. Distance goes as power², so the
    // power for a given travel distance is sqrt(d / D).
    const want = dist * (1.35 + rand() * 0.55);
    const pow  = Math.max(C.CLD_MIN_POWER, Math.min(1, Math.sqrt(want / D)));
    aims.push({ penguinId: p.id, dx: Math.cos(ang), dy: Math.sin(ang), power: pow });
  });

  let dive = 0;
  const drowned = G.penguins.find(p => p.ownerIdx === i && p.drowned);
  if (drowned && rand() < 0.25) dive = rand() < 0.5 ? -1 : +1;

  // Naive throw: at the target's position RIGHT NOW. § D measures what a
  // perfectly-leading throw would have done instead; the gap between them is
  // the Snowball's skill ceiling.
  let snowball = null, intent = null;
  if (rand() < (pSnow === undefined ? 0.5 : pSnow)) {
    const src = mine[0] || G.penguins.find(p => p.ownerIdx === i);
    const t   = src ? pickTarget(i, src, policy) : null;
    if (t) { snowball = { x: t.x, y: t.y }; intent = { x: t.x, y: t.y, id: t.id }; }
  }
  return { commit: { aims: aims, dive: dive, snowball: snowball }, intent: intent };
}

// ═══════════════════════════════════════════════════════════════════════════
// Driver
// ═══════════════════════════════════════════════════════════════════════════
const SLIDE_CAP = 60;   // a Floe-Off longer than this is a stall, not a game

function newMetrics() {
  return {
    floeOffs: 0, washouts: 0, stalls: 0,
    slides: Acc(), plunges: Acc(), duration: Acc(), capped: 0, slideCount: 0,
    endRadius: Acc(), floorHits: 0, thawDrops: 0,
    balls: 0, struck: 0, bystander: 0, whiff: 0,
    contested: 0, raceMiss: 0,
    arrivalFrac: Acc(), rebounds: 0, shatters: 0, firstShatter: Acc(), withShatter: 0,
    maxHops: 0, paths: [],
  };
}

// `onSlide(tl, ids)` lets § D harvest ball-free sampled paths from the same
// driver the sweep uses, rather than a second, divergent copy of it.
function runFloeOff(m, seed, rand, policy, sigmaFor, pSnow, onSlide) {
  F.cldStartFloeOff(seed);
  m.floeOffs++;
  const floor = F.cldMinRadius();
  let sawShatter = false;

  const finish = (s, tl) => {
    m.slides.v.push(s);
    if (tl) {
      m.endRadius.v.push(tl.radius);
      if (tl.radius <= floor + 1e-6) m.floorHits++;
    }
  };

  for (let s = 1; s <= SLIDE_CAP; s++) {
    const intents = [], commits = [];
    for (let i = 0; i < sigmaFor.length; i++) {
      const b = botCommit(i, rand, policy, sigmaFor[i], pSnow);
      commits.push(b.commit);
      if (b.intent) intents.push(b.intent);
    }
    G.commits = commits;

    const pre = G.penguins.map(p => ({ id: p.id, owner: p.ownerIdx, drowned: p.drowned }));
    const tl  = F.cldResolveSlide(seed * 131 + s);
    m.slideCount++;
    m.duration.v.push(tl.durationMs);
    if (tl.durationMs >= C.CLD_SIM_CAP_MS) m.capped++;
    if (onSlide) onSlide(tl, pre);

    m.plunges.v.push(tl.events.filter(e => e.type === 'plunge').length);
    m.rebounds += tl.events.filter(e => e.type === 'rebound').length;
    const sh = tl.events.filter(e => e.type === 'shatter').length;
    m.shatters += sh;
    if (sh && !sawShatter) { sawShatter = true; m.withShatter++; m.firstShatter.v.push(s); }
    tl.aftermath.forEach(a => {
      if (a.type === 'surface' && a.hops > m.maxHops) m.maxHops = a.hops;
      if (a.type === 'thaw-drop') m.thawDrops++;
    });

    // ── Snowball scoring ─────────────────────────────────────────────────
    // Two DIFFERENT numbers live here and must not be conflated:
    //
    //   whiff  — the ball found open ice. Dominated by the target's own
    //            Slide motion (every impulse lands at t=0, so a throw aimed
    //            at where someone IS is aimed at where they are about to
    //            stop being). That is a naive-throw reading, not §4D's.
    //
    //   race   — §4D's actual definition: a throw at a target that an
    //            EARLIER landing already struck, which then found open ice.
    //            Denominator is contested throws only.
    const landings = tl.events.filter(e => e.type === 'landing').sort((a, b) => a.t - b.t);
    const movedByBall = {};
    landings.forEach(L => {
      m.balls++;
      const want = intents.find(q => Math.abs(q.x - L.x) < 1e-9 && Math.abs(q.y - L.y) < 1e-9);
      m.arrivalFrac.v.push(tl.durationMs ? L.t / tl.durationMs : 0);
      const contested = !!(want && movedByBall[want.id]);
      if (contested) m.contested++;
      if (L.hit === 'penguin') {
        if (want && L.id === want.id) m.struck++; else m.bystander++;
        movedByBall[L.id] = true;
      } else if (L.hit === null) {
        m.whiff++;
        if (contested) m.raceMiss++;
      } else {
        m.bystander++;                              // berg / drowned — rare
      }
    });

    if (tl.washout)     { m.washouts++; finish(s, tl); return null; }
    if (tl.floeOffOver) { finish(s, tl); return tl.winnerIdx; }
  }
  m.stalls++;
  finish(SLIDE_CAP, null);
  return null;
}

function configure(o) {
  G.ice = o.ice; G.floe = o.floe || 'standard'; G.sylly = !!o.sylly;
  G.peckOff = false; G.fishToWin = o.fishToWin || 999;
  G.iceBreaker = o.iceBreaker === undefined ? 3 : o.iceBreaker;
}

function sweepConfig(o) {
  const m = newMetrics();
  configure(o);
  F.cldStartMatch(Array.from({ length: o.players }, (_, i) => 'P' + i));
  const rand = G.rng(SEED ^ (o.players * 7919) ^ (o.ice.length * 104729) ^ (o.sylly ? 15485863 : 0));
  const sig  = new Array(o.players).fill(AIM.normal);
  for (let r = 0; r < RUNS; r++) runFloeOff(m, SEED + r * 977 + o.players * 31, rand, 'neutral', sig);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// Probe mode — one config, one JSON line, no report. § G's worker.
// ═══════════════════════════════════════════════════════════════════════════
const PRESETS = {
  //                players ice      sylly  iceBreaker  pSnow
  bergs: { players: 5, ice: 'slush', sylly: false, iceBreaker: 3, pSnow: 0.0 },
  thaw:  { players: 5, ice: 'slush', sylly: true,  iceBreaker: 3, pSnow: 0.0 },
  balls: { players: 5, ice: 'slush', sylly: false, iceBreaker: 0, pSnow: 0.8 },
};
if (PROBE) {
  const o = PRESETS[PROBE];
  if (!o) { console.log(JSON.stringify({ error: 'unknown preset ' + PROBE })); process.exit(0); }
  const m = newMetrics();
  configure(o);
  F.cldStartMatch(Array.from({ length: o.players }, (_, i) => 'P' + i));
  const rand = G.rng(SEED ^ 0xC0FFEE);
  const sig  = new Array(o.players).fill(AIM.normal);
  for (let r = 0; r < RUNS; r++) runFloeOff(m, SEED + r * 977, rand, 'neutral', sig, o.pSnow);
  console.log(JSON.stringify({
    bergCount: C.CLD_BERG_COUNT, thawStep: C.CLD_THAW_STEP,
    ballR: C.CLD_SNOWBALL_R, ballSpeed: C.CLD_SNOWBALL_SPEED, vMax: C.CLD_V_MAX,
    slides: Acc.mean(m.slides), slidesP90: Acc.q(m.slides, 0.9),
    plunges: Acc.mean(m.plunges), washout: m.washouts / Math.max(1, m.floeOffs),
    stalls: m.stalls, floeOffs: m.floeOffs, slideCount: m.slideCount,
    rebounds: m.rebounds / Math.max(1, m.slideCount),
    shatters: m.shatters / Math.max(1, m.floeOffs),
    firstShatter: Acc.mean(m.firstShatter), withShatter: m.withShatter / Math.max(1, m.floeOffs),
    balls: m.balls, struck: m.struck / Math.max(1, m.balls), whiff: m.whiff / Math.max(1, m.balls),
    bystander: m.bystander / Math.max(1, m.balls),
    contested: m.contested, raceMiss: m.raceMiss / Math.max(1, m.contested),
    floorHits: m.floorHits / Math.max(1, m.floeOffs),
    thawDrops: m.thawDrops / Math.max(1, m.slideCount),
    durMean: Acc.mean(m.duration), durP90: Acc.q(m.duration, 0.9),
  }));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Report
// ═══════════════════════════════════════════════════════════════════════════
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
console.log('');
console.log('═'.repeat(78));
console.log('  Cold Shoulder — balance instrument   (asserts nothing, always exits 0)');
console.log(`  rules ${rel(GAME)}   physics ${rel(PHYS)}`);
console.log(`  CLD_SEED=${SEED}   ${RUNS} Floe-Offs per config`);
console.log('═'.repeat(78));

// ── § A. Derived geometry — pure arithmetic, no sim ───────────────────────
console.log('\n§ A  DERIVED GEOMETRY (§4B recomputed from the shipped constants)\n');
console.log('  ice        a (decel)   D=v²/2a   min R=0.5D   full slide t=2D/v   Thaw slides 130→floor');
['powder', 'slush', 'blackice'].forEach(ice => {
  const D = F.cldFullSlideDist(ice), a = F.cldDecel(ice), mr = F.cldMinRadius(ice);
  const steps = Math.ceil((C.CLD_FLOE_SIZE.standard - mr) / C.CLD_THAW_STEP);
  console.log(`  ${ice.padEnd(10)} ${f1(a).padStart(8)} ${f1(D).padStart(9)} ${f1(mr).padStart(11)} ` +
              `${(f2(2 * D / C.CLD_V_MAX) + ' s').padStart(17)} ${String(Math.max(0, steps)).padStart(22)}`);
});
console.log('\n  Thaw reach by Floe Size (slush):');
Object.keys(C.CLD_FLOE_SIZE).forEach(k => {
  const r0 = C.CLD_FLOE_SIZE[k], mr = F.cldMinRadius('slush');
  console.log(`    ${k.padEnd(9)} ${r0} → ${f1(mr)}   ${Math.ceil((r0 - mr) / C.CLD_THAW_STEP)} slides to bottom out` +
              `   (${f1(100 * (1 - mr / r0))}% of the radius shed)`);
});
console.log('\n  Snowball force curve (§4D), standard floe, maxRange = 2R = 260:');
[0, 65, 130, 195, 260].forEach(d => {
  const fr = F.cldSnowballForce(d, 260);
  console.log(`    ${String(d).padStart(3)} units  →  ${f1(fr).padStart(5)} u/s ` +
              `(${f1(100 * fr / C.CLD_V_MAX)}% of v_max)   arrives ${f1(F.cldSnowballArrivalMs(d)).padStart(6)} ms   ` +
              `its own push carries ${f1(Math.pow(fr / C.CLD_V_MAX, 2) * F.cldFullSlideDist('slush'))} units`);
});

// ── § B. Main sweep ───────────────────────────────────────────────────────
console.log('\n\n§ B  MAIN SWEEP — 3–8 players × 3 Ice Conditions × Thaw off/on   (Ice Breaker 3)\n');
console.log('  N ice       thaw | slides/FO  med p90 max | plunge/sl | wash  | dur ms  p90  cap | balls  hit  whiff | race-miss | shatter@   %FO | hop');
console.log('  ' + '─'.repeat(134));
const sweep = [];
for (let n = 3; n <= 8; n++) {
  for (const ice of ['powder', 'slush', 'blackice']) {
    for (const sylly of [false, true]) {
      const m = sweepConfig({ players: n, ice: ice, sylly: sylly });
      sweep.push({ n: n, ice: ice, sylly: sylly, m: m });
      console.log(
        `  ${n} ${ice.padEnd(9)} ${(sylly ? 'ON ' : 'off')} |` +
        `${f1(Acc.mean(m.slides)).padStart(9)} ${String(Acc.q(m.slides, 0.5)).padStart(4)} ` +
        `${String(Acc.q(m.slides, 0.9)).padStart(3)} ${String(Acc.max(m.slides)).padStart(3)} |` +
        `${f2(Acc.mean(m.plunges)).padStart(10)} |${pc(m.washouts, m.floeOffs).padStart(6)} |` +
        `${String(Math.round(Acc.mean(m.duration))).padStart(8)} ${String(Math.round(Acc.q(m.duration, 0.9))).padStart(4)} ` +
        `${pc(m.capped, m.slideCount).padStart(5)} |` +
        `${String(m.balls).padStart(6)} ${pc(m.struck, m.balls).padStart(5)} ${pc(m.whiff, m.balls).padStart(6)} |` +
        `${(pc(m.raceMiss, m.contested) + ' /' + m.contested).padStart(10)} |` +
        `${(m.withShatter ? f1(Acc.mean(m.firstShatter)) : '  —').padStart(8)} ${pc(m.withShatter, m.floeOffs).padStart(6)} |` +
        `${String(m.maxHops).padStart(4)}`);
    }
  }
}

function roll(pred) {
  const t = newMetrics();
  sweep.filter(pred).forEach(s => {
    const m = s.m;
    ['slides', 'plunges', 'duration', 'endRadius', 'firstShatter', 'arrivalFrac']
      .forEach(k => { t[k].v = t[k].v.concat(m[k].v); });
    ['floeOffs', 'washouts', 'stalls', 'capped', 'slideCount', 'floorHits', 'thawDrops', 'balls',
     'struck', 'bystander', 'whiff', 'contested', 'raceMiss', 'rebounds', 'shatters', 'withShatter']
      .forEach(k => { t[k] += m[k]; });
    if (m.maxHops > t.maxHops) t.maxHops = m.maxHops;
  });
  return t;
}
const ALL = roll(() => true), THAW_ON = roll(s => s.sylly), THAW_OFF = roll(s => !s.sylly);

console.log('\n  Totals: ' + ALL.floeOffs + ' Floe-Offs · ' + ALL.slideCount + ' Slides · ' +
            ALL.balls + ' Snowballs · ' + ALL.stalls + ' stalls · deepest shunt ' + ALL.maxHops + ' hop(s)');
console.log('  Thaw OFF  slides/FO ' + f2(Acc.mean(THAW_OFF.slides)) + '  p90 ' + Acc.q(THAW_OFF.slides, 0.9) +
            '   washout ' + pc(THAW_OFF.washouts, THAW_OFF.floeOffs));
console.log('  Thaw ON   slides/FO ' + f2(Acc.mean(THAW_ON.slides)) + '  p90 ' + Acc.q(THAW_ON.slides, 0.9) +
            '   washout ' + pc(THAW_ON.washouts, THAW_ON.floeOffs) +
            '   thaw-drops ' + THAW_ON.thawDrops + '   floor reached in ' +
            pc(THAW_ON.floorHits, THAW_ON.floeOffs) + ' of Floe-Offs');
console.log('  By Ice Conditions (slides/FO): ' + ['powder', 'slush', 'blackice']
  .map(i => i + ' ' + f2(Acc.mean(roll(s => s.ice === i).slides))).join('  ·  '));

// ── § C. Ice Breaker panel ────────────────────────────────────────────────
console.log('\n\n§ C  ICE BREAKER — what the Bergs are actually doing   (5 players, slush, Thaw off)\n');
console.log('  hits/Berg | rebounds/slide | shatters/FO | 1st shatter | FOs with a shatter | slides/FO | plunge/sl');
console.log('  ' + '─'.repeat(104));
[0, 1, 3].forEach(ib => {
  const m = newMetrics();
  configure({ players: 5, ice: 'slush', sylly: false, iceBreaker: ib });
  F.cldStartMatch(['A', 'B', 'C', 'D', 'E']);
  const rand = G.rng(SEED ^ 0x1CEB4 ^ ib);
  const sig = new Array(5).fill(AIM.normal);
  for (let r = 0; r < RUNS; r++) runFloeOff(m, SEED + r * 613 + ib, rand, 'neutral', sig);
  console.log(
    `  ${(ib === 0 ? 'Off' : String(ib)).padStart(9)} |${f2(m.rebounds / Math.max(1, m.slideCount)).padStart(15)} |` +
    `${f2(m.shatters / Math.max(1, m.floeOffs)).padStart(12)} |` +
    `${(m.withShatter ? f1(Acc.mean(m.firstShatter)) : '  —').padStart(12)} |` +
    `${pc(m.withShatter, m.floeOffs).padStart(19)} |${f2(Acc.mean(m.slides)).padStart(10)} |` +
    `${f2(Acc.mean(m.plunges)).padStart(10)}`);
});
console.log(`\n  (CLD_BERG_COUNT = ${C.CLD_BERG_COUNT} Bergs on the rim, inset by CLD_BERG_R.` +
            ` Ice Breaker is the per-Berg HIT CAPACITY, not the count.)`);

// ═══════════════════════════════════════════════════════════════════════════
// § D. Snowball reach — the two constants brief §19 assigned to this tool.
//
// Measured as a COUNTERFACTUAL on ball-free sampled paths: play Slides with no
// Snowballs at all, keep every Standing penguin's sampled path, then ask of
// each candidate (speed × radius) whether a throw would have connected. That
// is exactly right for a FIRST throw — the ball being scored is the one thing
// that wasn't in the sim — and it sweeps a grid the `const`s cannot be swept
// over from inside one process.
//
// Three aim policies, because the naive one is not the whole story:
//   naive  — throw where the target is at commit time. Every impulse lands at
//            t = 0, so this aims at where they are about to stop being.
//   half   — lead by half the true amount: a player who knows to lead and
//            guesses how much. The realistic middle, and the one that says
//            whether the mechanic is learnable.
//   dwell  — for a PERFECT lead, the span of arrival times that would still
//            have connected. A perfect lead hits by construction (it is
//            defined as the target's position at arrival), so its hit rate is
//            a tautology and is deliberately not reported. What is worth
//            knowing is how much slack that perfect point carries — in ms of
//            timing error, which is what a player is actually estimating.
//
// §4D's race-miss number is NOT here: it needs real balls in a real sim, and
// lives in § B, where the denominator is contested throws only.
//
// Drowned penguins are excluded from both ends of a pair. They cannot be moved
// (§4D: a Snowball does nothing to one) and never move, so including them
// would inflate every hit rate with throws that are not a real option.
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n\n§ D  SNOWBALL REACH — counterfactual grid on ball-free paths   (5 players, Thaw off)\n');

const SPEEDS = [130, 260, 400, 600, 900, 1400];
const RADII  = [4, 8, 12, 16];
const grid   = {};             // `${speed}|${radius}` -> hit counters
SPEEDS.forEach(s => RADII.forEach(r => { grid[s + '|' + r] = { nH: 0, hH: 0, n: 0 }; }));
const dwell = {};              // speed -> Acc of ms
SPEEDS.forEach(s => { dwell[s] = Acc(); });
let parkedHit = 0, parkedN = 0;
const leadDist = Acc(), throwDist = Acc(), travelled = Acc();

['powder', 'slush', 'blackice'].forEach(ice => {
  const m = newMetrics();
  configure({ players: 5, ice: ice, sylly: false, iceBreaker: 0 });
  F.cldStartMatch(['A', 'B', 'C', 'D', 'E']);
  const rand = G.rng(SEED ^ 0x5B0 ^ ice.length);
  const sig  = new Array(5).fill(AIM.normal);

  const onSlide = (tl, pre) => {
    const S = tl.samples;
    if (!S || S.length < 2) return;
    const posAt = (idx, tMs) => {
      const k = Math.max(0, Math.min(S.length - 1, Math.round(tMs / SAMPLE_MS)));
      return { x: S[k][2 * idx], y: S[k][2 * idx + 1] };
    };
    const live = [];
    pre.forEach((p, idx) => {
      if (p.drowned) return;                       // not a target, not a thrower
      const s0 = posAt(idx, 0);
      let peak = 0;
      for (let fr = 0; fr < S.length; fr++) {
        const q = posAt(idx, fr * SAMPLE_MS);
        const d = Math.hypot(q.x - s0.x, q.y - s0.y);
        if (d > peak) peak = d;
      }
      live.push({ idx: idx, owner: p.owner, x0: s0.x, y0: s0.y, travel: peak });
    });
    if (live.length < 2) return;

    for (let k = 0; k < 4; k++) {
      const src = live[Math.floor(rand() * live.length)];
      const tgt = live[Math.floor(rand() * live.length)];
      if (!src || !tgt || src.idx === tgt.idx || src.owner === tgt.owner) continue;
      travelled.v.push(tgt.travel);
      throwDist.v.push(Math.hypot(tgt.x0 - src.x0, tgt.y0 - src.y0));

      SPEEDS.forEach(sp => {
        const arrival = aim => (Math.hypot(aim.x - src.x0, aim.y - src.y0) / sp) * 1000;

        // naive
        const naive = { x: tgt.x0, y: tgt.y0 };
        const pN = posAt(tgt.idx, arrival(naive));
        const errN = Math.hypot(pN.x - naive.x, pN.y - naive.y);

        // perfect lead — fixed point of (aim -> arrival -> position -> aim)
        let lead = { x: tgt.x0, y: tgt.y0 };
        for (let it = 0; it < 4; it++) lead = posAt(tgt.idx, arrival(lead));

        // half lead — the realistic middle
        const half = { x: (tgt.x0 + lead.x) / 2, y: (tgt.y0 + lead.y) / 2 };
        const pH = posAt(tgt.idx, arrival(half));
        const errH = Math.hypot(pH.x - half.x, pH.y - half.y);

        if (sp === C.CLD_SNOWBALL_SPEED) {
          leadDist.v.push(Math.hypot(lead.x - tgt.x0, lead.y - tgt.y0));
          if (tgt.travel < 20) { parkedN++; if (errN <= C.CLD_SNOWBALL_R + C.CLD_PENGUIN_R) parkedHit++; }
        }

        // dwell: how many ms of arrival-time error the perfect point tolerates
        const contact = C.CLD_SNOWBALL_R + C.CLD_PENGUIN_R;
        let ms = 0;
        for (let f = 0; f < S.length; f++) {
          const q = posAt(tgt.idx, f * SAMPLE_MS);
          if (Math.hypot(q.x - lead.x, q.y - lead.y) <= contact) ms += SAMPLE_MS;
        }
        dwell[sp].v.push(ms);

        RADII.forEach(r => {
          const g = grid[sp + '|' + r];
          g.n++;
          if (errN <= r + C.CLD_PENGUIN_R) g.nH++;
          if (errH <= r + C.CLD_PENGUIN_R) g.hH++;
        });
      });
    }
  };

  for (let r = 0; r < RUNS; r++) runFloeOff(m, SEED + r * 331 + ice.length, rand, 'neutral', sig, 0, onSlide);
});

console.log('  hit rate by CLD_SNOWBALL_SPEED × CLD_SNOWBALL_R   (naive aim / half lead)\n');
console.log('  speed |' + RADII.map(r => ('r=' + r).padStart(16)).join('') + '  | dwell at perfect lead');
console.log('  ' + '─'.repeat(10 + RADII.length * 16 + 24));
SPEEDS.forEach(sp => {
  const row = RADII.map(r => {
    const g = grid[sp + '|' + r];
    return (pc(g.nH, g.n) + ' / ' + pc(g.hH, g.n)).padStart(16);
  }).join('');
  console.log(`  ${String(sp).padStart(5)} |${row}  |${(Math.round(Acc.mean(dwell[sp])) + ' ms').padStart(11)}` +
              (sp === C.CLD_SNOWBALL_SPEED ? '   ← shipped' : ''));
});
const shipCell = grid[C.CLD_SNOWBALL_SPEED + '|' + C.CLD_SNOWBALL_R];
console.log(`\n  shipped cell: speed ${C.CLD_SNOWBALL_SPEED}, r ${C.CLD_SNOWBALL_R} ` +
            `(contact ${C.CLD_SNOWBALL_R + C.CLD_PENGUIN_R} units) → naive ${pc(shipCell.nH, shipCell.n)}, ` +
            `half lead ${pc(shipCell.hH, shipCell.n)}, dwell ${Math.round(Acc.mean(dwell[C.CLD_SNOWBALL_SPEED]))} ms`);
console.log(`  a target travels ${f1(Acc.mean(travelled))} units in a Slide (p90 ${f1(Acc.q(travelled, 0.9))}); ` +
            `a perfect lead sits ${f1(Acc.mean(leadDist))} ahead of it (p90 ${f1(Acc.q(leadDist, 0.9))})`);
console.log(`  a throw covers ${f1(Acc.mean(throwDist))} units on average — ` +
            `${f1(Acc.mean(throwDist) / C.CLD_SNOWBALL_SPEED * 1000)} ms in the air at the shipped speed`);
console.log(`  against a target that never left its spot (peak drift <20 units): naive hits ` +
            `${pc(parkedHit, parkedN)} of ${parkedN} throws`);

// ── § E. Leader punishment ────────────────────────────────────────────────
// §6 claims "blind simultaneous commit stops a strong aimer running away with
// it". Two independent halves, measured separately:
//   1. can a table that DECIDES to gang up actually cost the leader?  (policy)
//   2. does a better aimer run away with the match?                   (skill)
console.log('\n\n§ E  LEADER PUNISHMENT & SKILL HEADROOM   (5 players, slush, Fish-to-Win 3)\n');

function runMatches(o) {
  configure({ players: o.players, ice: 'slush', sylly: o.sylly, fishToWin: 3 });
  const rand = G.rng(SEED ^ o.tag);
  const sig  = new Array(o.players).fill(AIM.normal);
  if (o.sharp !== undefined) { sig.fill(AIM.loose); sig[o.sharp] = AIM.sharp; }
  let leaderChances = 0, leaderHeld = 0;
  const seatWins = new Array(o.players).fill(0);
  const m = newMetrics();
  for (let r = 0; r < o.matches; r++) {
    F.cldStartMatch(Array.from({ length: o.players }, (_, i) => 'P' + i));
    for (let fo = 0; fo < 60; fo++) {
      const fish = G.fish.slice(), top = Math.max.apply(null, fish);
      const leader = (top > 0 && fish.filter(x => x === top).length === 1) ? fish.indexOf(top) : -1;
      const w = runFloeOff(m, SEED + r * 7717 + fo * 97 + o.tag, rand, o.policy, sig);
      if (leader >= 0) { leaderChances++; if (w === leader) leaderHeld++; }
      const mw = F.cldMatchWinner();
      if (mw >= 0) { seatWins[mw]++; break; }
    }
  }
  return { leaderChances, leaderHeld, seatWins, m };
}

const MATCHES = Math.max(60, Math.round(RUNS * 0.6));
console.log('  policy       | leader took the next Floe-Off | baseline | punishment delta | slides/FO');
console.log('  ' + '─'.repeat(92));
[['neutral', false], ['vindictive', false]].forEach(([policy], i) => {
  const r = runMatches({ players: 5, sylly: false, policy: policy, matches: MATCHES, tag: 0xA11 + i });
  const held = r.leaderChances ? r.leaderHeld / r.leaderChances : 0;
  console.log(`  ${policy.padEnd(12)} | ${(pc(r.leaderHeld, r.leaderChances) + '  (' + r.leaderHeld + '/' + r.leaderChances + ')').padStart(28)} |` +
              `${'20.0%'.padStart(9)} |${((held - 0.2 >= 0 ? '+' : '') + f1(100 * (held - 0.2)) + ' pts').padStart(17)} |` +
              `${f2(Acc.mean(r.m.slides)).padStart(10)}`);
});
console.log('\n  Under The Thaw (Sylly Mode on), same table:');
[['neutral'], ['vindictive']].forEach(([policy], i) => {
  const r = runMatches({ players: 5, sylly: true, policy: policy, matches: MATCHES, tag: 0x7B0 + i });
  const held = r.leaderChances ? r.leaderHeld / r.leaderChances : 0;
  console.log(`    ${policy.padEnd(12)} leader took ${pc(r.leaderHeld, r.leaderChances)}   ` +
              `delta ${(held - 0.2 >= 0 ? '+' : '') + f1(100 * (held - 0.2))} pts   slides/FO ${f2(Acc.mean(r.m.slides))}`);
});

console.log('\n  Skill headroom — one sharp aimer (σ 0.05 rad) against four loose ones (σ 0.32):');
// The second half of §6's claim. Neutral targeting says whether a better aimer
// runs away; vindictive targeting says whether the TABLE can stop one. Both
// are needed — blind commit alone stops nothing if nobody chooses to aim at
// the person who is winning.
['neutral', 'vindictive'].forEach((policy, i) => {
  const r = runMatches({ players: 5, sylly: false, policy: policy, sharp: 0, matches: MATCHES, tag: 0x5A2 + i });
  const sw = r.seatWins, tot = sw.reduce((a, x) => a + x, 0);
  console.log(`    vs a ${policy.padEnd(10)} table: seat 0 (sharp) took ${pc(sw[0], tot)} of ${tot} matches` +
              `   ·   baseline 20.0%   ·   loose seats ${sw.slice(1).map(x => pc(x, tot)).join(' ')}`);
});


// ═══════════════════════════════════════════════════════════════════════════
// § G. Constant sweep — the only honest way to compare `const` values.
//
// CLD_BERG_COUNT, CLD_THAW_STEP, CLD_SNOWBALL_R and CLD_SNOWBALL_SPEED are
// `const` in cld.js, so no bridge setter can move them and nothing measured in
// this process can speak about an alternative value. § G patches a copy of
// js/games/cld.js per candidate, re-spawns this script in --probe mode against
// it with CLD_SRC=, and reads one JSON line back. Same mechanism as
// tools/mutate-cld.js. The shipped value is always in the table, marked.
// ═══════════════════════════════════════════════════════════════════════════
const cp = require('child_process');
const os = require('os');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cld-balance-'));
const GAME_SRC = fs.readFileSync(GAME, 'utf8');

function probe(preset, constName, value, runs) {
  // No backslash escapes in this pattern on purpose: this file has been written
  // through a shell heredoc more than once and \s does not survive that — the
  // regex silently became `const X s*=s*` and every sweep row read ERROR while
  // the tool still exited 0. A space class says the same thing and cannot be
  // unescaped into a literal 's'.
  const re = new RegExp('(const ' + constName + '[ ]*=[ ]*)([0-9.]+)');
  if (!re.test(GAME_SRC)) return { error: 'no such const: ' + constName };
  const file = path.join(TMP, constName + '-' + value + '.js');
  fs.writeFileSync(file, GAME_SRC.replace(re, '$1' + value));
  const env = Object.assign({}, process.env, { CLD_SRC: file });
  const r = cp.spawnSync(process.execPath,
    [__filename, '--probe', preset, String(runs)], { env: env, encoding: 'utf8' });
  const line = (r.stdout || '').trim().split('\n').pop();
  try { return JSON.parse(line); } catch (e) { return { error: (r.stderr || 'no output').slice(0, 120) }; }
}

const SWEEP_RUNS = Math.max(40, Math.round(RUNS * 0.6));
console.log(`\n\n§ G  CONSTANT SWEEP — patched copies of cld.js, ${SWEEP_RUNS} Floe-Offs each\n`);

console.log('  CLD_BERG_COUNT   (5 players, slush, Thaw off, Ice Breaker 3, no Snowballs)');
console.log('    value | rebounds/sl | shatters/FO | 1st shatter | %FO shattered | plunge/sl | slides/FO');
console.log('    ' + '─'.repeat(88));
[1, 2, 3, 4, 6].forEach(v => {
  const r = probe('bergs', 'CLD_BERG_COUNT', v, SWEEP_RUNS);
  if (r.error) return console.log(`    ${String(v).padStart(5)} | ERROR ${r.error}`);
  console.log(`    ${String(v).padStart(5)} |${f2(r.rebounds).padStart(12)} |${f2(r.shatters).padStart(12)} |` +
              `${(r.withShatter ? f1(r.firstShatter) : '  —').padStart(12)} |${(f1(100 * r.withShatter) + '%').padStart(14)} |` +
              `${f2(r.plunges).padStart(10)} |${f2(r.slides).padStart(10)}` +
              (v === C.CLD_BERG_COUNT ? '   ← shipped' : ''));
});

console.log('\n  CLD_THAW_STEP   (5 players, slush, Thaw ON, no Snowballs)');
console.log('    value | slides to floor | slides/FO  p90 | floor reached | thaw-drops/sl | washout');
console.log('    ' + '─'.repeat(88));
[4, 6, 8, 12, 16, 24].forEach(v => {
  const r = probe('thaw', 'CLD_THAW_STEP', v, SWEEP_RUNS);
  if (r.error) return console.log(`    ${String(v).padStart(5)} | ERROR ${r.error}`);
  const toFloor = Math.ceil((C.CLD_FLOE_SIZE.standard - F.cldMinRadius('slush')) / v);
  console.log(`    ${String(v).padStart(5)} |${String(toFloor).padStart(16)} |${f2(r.slides).padStart(11)} ` +
              `${String(r.slidesP90).padStart(4)} |${(f1(100 * r.floorHits) + '%').padStart(14)} |` +
              `${f2(r.thawDrops).padStart(14)} |${(f1(100 * r.washout) + '%').padStart(8)}` +
              (v === C.CLD_THAW_STEP ? '   ← shipped' : ''));
});

console.log('\n  CLD_SNOWBALL_R × CLD_SNOWBALL_SPEED — in-play, with real balls racing each other');
console.log('    (5 players, slush, Thaw off, no Bergs, 80% throw rate)');
console.log('    r  speed | balls | struck | bystnd | open ice | race-miss / contested | plunge/sl | slides/FO');
console.log('    ' + '─'.repeat(96));
[[4, 260], [8, 260], [12, 260], [4, 600], [8, 600], [4, 1400]].forEach(([r0, sp]) => {
  const file = path.join(TMP, 'ball-' + r0 + '-' + sp + '.js');
  let src = GAME_SRC.replace(/(const CLD_SNOWBALL_R[ ]*=[ ]*)([0-9]+)/, '$1' + r0)
                    .replace(/(const CLD_SNOWBALL_SPEED[ ]*=[ ]*)([0-9]+)/, '$1' + sp);
  fs.writeFileSync(file, src);
  const env = Object.assign({}, process.env, { CLD_SRC: file });
  const out = cp.spawnSync(process.execPath, [__filename, '--probe', 'balls', String(SWEEP_RUNS)],
                           { env: env, encoding: 'utf8' });
  let d; try { d = JSON.parse((out.stdout || '').trim().split('\n').pop()); }
  catch (e) { return console.log(`    ${r0} ${sp} | ERROR ${(out.stderr || '').slice(0, 100)}`); }
  const ship = (d.ballR === C.CLD_SNOWBALL_R && d.ballSpeed === C.CLD_SNOWBALL_SPEED) ? '   ← shipped' : '';
  console.log(`    ${String(d.ballR).padStart(2)} ${String(d.ballSpeed).padStart(5)} |` +
              `${String(d.balls).padStart(6)} |${(f1(100 * d.struck) + '%').padStart(7)} |` +
              `${(f1(100 * d.bystander) + '%').padStart(7)} |` +
              `${(f1(100 * d.whiff) + '%').padStart(9)} |` +
              `${(f1(100 * d.raceMiss) + '% / ' + d.contested).padStart(22)} |` +
              `${f2(d.plunges).padStart(10)} |${f2(d.slides).padStart(10)}${ship}`);
});
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

// ── § F. Verdicts ─────────────────────────────────────────────────────────
console.log('\n\n§ F  THE FIVE [Stage-3 tunable] CONSTANTS — the number behind each\n');
const dur = ALL.duration, bf = ALL.arrivalFrac;
const thawSteps = Math.ceil((C.CLD_FLOE_SIZE.standard - F.cldMinRadius('slush')) / C.CLD_THAW_STEP);
const shipped = grid[C.CLD_SNOWBALL_SPEED + '|' + C.CLD_SNOWBALL_R];
const shipDwell = Math.round(Acc.mean(dwell[C.CLD_SNOWBALL_SPEED]));

function verdict(name, value, reading) {
  console.log(`  ${name} = ${value}`);
  console.log(`      ${reading}\n`);
}
verdict('CLD_V_MAX', C.CLD_V_MAX,
  `Slide playback mean ${Math.round(Acc.mean(dur))} ms, p90 ${Math.round(Acc.q(dur, 0.9))} ms, ` +
  `p99 ${Math.round(Acc.q(dur, 0.99))} ms; ${pc(ALL.capped, ALL.slideCount)} of Slides hit the ` +
  `${C.CLD_SIM_CAP_MS} ms cap. v_max cancels out of D = v²/2a, so it sets DURATION only, never reach.`);
verdict('CLD_SNOWBALL_SPEED', C.CLD_SNOWBALL_SPEED,
  `Balls arrive ${f1(100 * Acc.mean(bf))}% through a Slide on average (p10 ${f1(100 * Acc.q(bf, 0.1))}%, ` +
  `p90 ${f1(100 * Acc.q(bf, 0.9))}%). Naive throws connect ${pc(shipped.nH, shipped.n)}, ` +
  `half leads ${pc(shipped.hH, shipped.n)}, and a perfect lead carries ${shipDwell} ms of timing ` +
  `slack — see § D's grid and § G's in-play rows for the alternatives.`);
verdict('CLD_SNOWBALL_R', C.CLD_SNOWBALL_R,
  `Contact test is r_ball + r_penguin = ${C.CLD_SNOWBALL_R + C.CLD_PENGUIN_R} units. In play: struck ` +
  `${pc(ALL.struck, ALL.balls)}, bystander ${pc(ALL.bystander, ALL.balls)}, open ice ${pc(ALL.whiff, ALL.balls)}. ` +
  `§4D race-miss ${pc(ALL.raceMiss, ALL.contested)} of ${ALL.contested} contested throws.`);
verdict('CLD_THAW_STEP', C.CLD_THAW_STEP,
  `${thawSteps} Slides to bottom out a Standard floe at slush, against a measured ` +
  `${f2(Acc.mean(THAW_ON.slides))} Slides/Floe-Off under the Thaw (p90 ${Acc.q(THAW_ON.slides, 0.9)}). ` +
  `Floor reached in ${pc(THAW_ON.floorHits, THAW_ON.floeOffs)} of Floe-Offs; ${THAW_ON.thawDrops} thaw-drops ` +
  `over ${THAW_ON.slideCount} Slides. The Thaw cuts a Floe-Off from ${f2(Acc.mean(THAW_OFF.slides))} to ` +
  `${f2(Acc.mean(THAW_ON.slides))} Slides.`);
verdict('CLD_BERG_COUNT', C.CLD_BERG_COUNT,
  `At Ice Breaker 3: ${f2(ALL.rebounds / Math.max(1, ALL.slideCount))} rebounds/Slide, ` +
  `${pc(ALL.withShatter, ALL.floeOffs)} of Floe-Offs see a Berg shatter, first at Slide ` +
  `${ALL.withShatter ? f1(Acc.mean(ALL.firstShatter)) : 'n/a'}. § C has the Off/1/3 comparison.`);
console.log(`  CLD_MIN_RADIUS_MULT = ${C.CLD_MIN_RADIUS_MULT}   (brief §19's third open value)`);
console.log(`      Floor is ${f1(F.cldMinRadius('powder'))} / ${f1(F.cldMinRadius('slush'))} / ` +
            `${f1(F.cldMinRadius('blackice'))} at powder / slush / blackice. Reached in ` +
            `${pc(THAW_ON.floorHits, THAW_ON.floeOffs)} of Thaw Floe-Offs.\n`);
console.log('  Overall: ' + f2(Acc.mean(ALL.slides)) + ' Slides/Floe-Off · ' + f2(Acc.mean(ALL.plunges)) +
            ' plunges/Slide · ' + pc(ALL.washouts, ALL.floeOffs) + ' Washouts · ' +
            pc(ALL.stalls, ALL.floeOffs) + ' stalls\n');
process.exit(0);
