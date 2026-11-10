#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// verify-eta-rules.js — ETA?'s rules engine, single-process.
// Evaluates the REAL js/games/eta-scene.js + js/games/eta.js in a vm (re-implements
// nothing) and asserts the spec's own numbers: the accuracy curve (maths doc §2),
// Sample 1 (Standard), Sample 2 + 2b (Backseat Drivers), the floor, the insurance
// cap, gear rounding, ranks, Dot's Double-Take, the curated deal over thousands of
// seeded draws, and a whole Shift driven seat by seat through the host appliers.
// Accepts ETA_SRC= (a broken copy must fail) and ETA_SEED=.
// Usage: node tools/verify-eta-rules.js
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC  = process.env.ETA_SRC || path.join(ROOT, 'js/games/eta.js');
const KIT  = path.join(ROOT, 'js/games/eta-scene.js');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eta-data.json'), 'utf8'));

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { if (c) { pass++; } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  — ' + JSON.stringify(extra) : '')); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${Math.round(a)}, want ${b} ±${tol}`);
const head = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));

function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ── The sandbox: null DOM (every render short-circuits on its own guard), captured timers ──
function makeSandbox() {
  const timers = [];
  const sb = {
    console, Math, JSON, Date, Number, String, Array, Object, Set, Map, Promise, isFinite, parseFloat,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {}, createElement: () => null },
    showScreen: () => {}, activeGameId: null,
    mpPlayerSlots: [], mpMyPlayerIdx: 0,
    mpSendEnvelope: () => { throw new Error('mpSendEnvelope in single mode'); },
    mpSendPrivate: () => { throw new Error('mpSendPrivate in single mode'); },
  };
  sb.window = sb;
  sb.window.syllyMultiplayerMode = 'single';
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(KIT, 'utf8'), sb, { filename: 'eta-scene.js' });
  vm.runInContext(fs.readFileSync(SRC, 'utf8') + '\n;globalThis.__eta = { get: n => eval(n), set: (n, v) => eval(n + " = v") };', sb, { filename: 'eta.js' });
  sb.__timers = timers;
  return sb;
}

const S = makeSandbox();
const E = S.__eta;

// ═══════════════════════════════════════════════════════════════════════════
head('1. Accuracy curve (maths doc §2)');
const m = 40000;
[[1.04, 40000, 0], [0.96, 40000, 0], [1.1, 39020, 20], [1.25, 36360, 20], [1.5, 32680, 20], [2, 27150, 20],
 [3, 19950, 20], [5, 12010, 20], [10, 3670, 20], [15, 590, 20], [18, 0, 0], [1 / 2, 27150, 20], [1 / 10, 3670, 20]]
  .forEach(([r, want, tol]) => near(S.etaAcc(r * 100, 100), want, tol, `${r}× off`));
ok(S.etaAcc(0, 100) === 0 && S.etaAcc(-5, 100) === 0, 'a non-positive ETA scores nothing');
ok(S.etaAcc(200, 100) === S.etaAcc(50, 100), 'judged on the ratio: 2× slow = 2× fast');
ok(S.etaAcc(10, 5) === S.etaAcc(2e6, 1e6), 'scale-free: 2× off on 5 min = 2× off on a long trip');

// ═══════════════════════════════════════════════════════════════════════════
head('2. Sample 1 — Standard, 4 couriers (brief §21)');
{
  const truths = [1200 / 250 * 60, 1200 / 4 * 60, 1200 / 6 * 60, 1200 / 28000 * 60];
  const logged = [300, 4 * 1440, 21 * 1440, 20];
  const sc = S.etaScoreRun({ n: 4, runs: 5, sylly: false, logged, truths, stamps: [1, 2, 1, 0], unreg: [false, false, false, false] });
  [43500, 26270, 26455, 6320].forEach((w, i) => near(sc.runTotals[i], w, 10, `Run total seat ${i}`));
  ok(JSON.stringify(sc.stampsIn) === '[1,2,1,0]', 'Stamps tallied (Ada 1, Boris 2, Chloe 1, Dev 0)', sc.stampsIn);
  ok(!sc.receipts.some(L => L.some(l => l.key === 'sweep')), 'no Sweep Bonus at 4 couriers');
  ok(sc.receipts[1].find(l => l.key === 'tips').km === 7000, 'Boris: 2 Stamps × 3,500');
  ok(sc.runTotals.every((t, i) => t === sc.receipts[i].reduce((a, l) => a + l.km, 0)), 'every receipt adds up');
}
{
  // Sweep: 5 couriers, everyone stamps seat 0 (seat 0 stamps seat 1).
  const sc = S.etaScoreRun({ n: 5, runs: 5, sylly: false, logged: [100, 100, 100, 100, 100], truths: [100, 100, 100, 100, 100], stamps: [1, 0, 0, 0, 0] });
  ok(sc.receipts[0].some(l => l.key === 'sweep' && l.km === 3000), 'Sweep Bonus at 5+: one extra tip (3,000)');
  const sc3 = S.etaScoreRun({ n: 3, runs: 5, sylly: false, logged: [100, 100, 100], truths: [100, 100, 100], stamps: [1, 0, 0] });
  ok(!sc3.receipts[0].some(l => l.key === 'sweep'), 'no Sweep at 3');
  const self = S.etaScoreRun({ n: 3, runs: 5, sylly: false, logged: [100, 100, 100], truths: [100, 100, 100], stamps: [0, 0, 0] });
  ok(self.stampsIn[0] === 2, 'a self-stamp in the input is ignored by the scorer');
}

// ═══════════════════════════════════════════════════════════════════════════
head('3. Sample 2 — Backseat Drivers, Earth to the Moon (brief §21)');
const moonT = [384400 / 50 * 60, 384400 / 120 * 60, 384400 / 140 * 60, 384400 / 900 * 60];
const corr = [{ target: 2, mult: 2 }, { target: 2, mult: 2 }, { target: 0, mult: 1.25 }, { target: 2, mult: 2.5 }];
{
  const logged = [240 * 1440, 120 * 1440, 40 * 1440, 21 * 1440];
  const sc = S.etaScoreRun({ n: 4, runs: 5, sylly: true, logged, truths: moonT, unreg: [true, true, true, false], corrections: corr });
  const line = (i, k) => ((sc.receipts[i].find(l => l.key === k) || {}).km) || 0;
  near(line(0, 'acc'), 35020, 30, 'Ada accuracy');   near(line(0, 'det'), -400, 20, 'Ada detour'); near(line(0, 'ins'), 290, 10, 'Ada insurance');
  near(line(1, 'acc'), 38790, 30, 'Boris accuracy'); near(line(1, 'det'), -400, 20, 'Boris detour');
  near(line(2, 'acc'), 20760, 30, 'Chloe accuracy'); near(line(2, 'nav'), 3700, 20, 'Chloe Navigation Assist'); near(line(2, 'ins'), 3000, 10, 'Chloe insurance');
  near(line(3, 'acc'), 37550, 30, 'Dev accuracy');   near(line(3, 'det'), -530, 20, 'Dev detour');
  [38910, 42380, 31460, 37020].forEach((w, i) => near(sc.runTotals[i], w, 40, `Run total seat ${i}`));
  ok(line(0, 'hazard') === 4000 && line(3, 'hazard') === 0, 'Hazard Pay only for Unregistered Rides');
  ok(sc.banners[2] === 'spin', 'Chloe: SPIN-OUT', sc.banners);
  ok(sc.banners[0] === 'back', "Ada: Chloe's ×1.25 gained 4,620 and landed within 1.25× — Back on Course (brief §6 rule)", sc.banners[0]);
  near(sc.finals[2], 400 * 1440, 1, 'Chloe revised: 40 days × 10 = 400 days');
  ok(sc.receipts[2].find(l => l.key === 'acc').km === line(2, 'acc') && Math.abs(line(2, 'acc') - 20760) < 40, "the target's own accuracy uses the Logged ETA");
}
{
  // Sample 2b — the same pile-on on a good estimate.
  const logged = [240 * 1440, 120 * 1440, 80 * 1440, 21 * 1440];
  const sc = S.etaScoreRun({ n: 4, runs: 5, sylly: true, logged, truths: moonT, unreg: [true, true, true, false], corrections: corr });
  const det = i => -((sc.receipts[i].find(l => l.key === 'det') || {}).km || 0);
  near(S.etaAcc(logged[2], moonT[2]), 33630, 30, 'Chloe 80 days scores ~33,630');
  near(det(0) - 0, 3140 + 0, 60, 'Ada pays ~3,140 (her own Detour on the carpet push is 0 here? see below)');
  near(det(3), 4150, 40, 'Dev pays ~4,150 (the ×2.5 pushed hardest)');
  near(det(1), 3140, 40, 'Boris pays ~3,140');
}
{
  // Back on Course: two ×2 corrections on a 4× too-fast ETA land within 1.25×.
  const sc = S.etaScoreRun({ n: 3, runs: 5, sylly: true, logged: [100, 50, 100], truths: [100, 200, 100], unreg: [false, false, false],
    corrections: [{ target: 1, mult: 2 }, null, { target: 1, mult: 2 }] });
  ok(sc.banners[1] === 'back', 'Back on Course: a big gain landing within 1.25×', sc.banners);
}
{
  // Insurance cap + the floor.
  const sc = S.etaScoreRun({ n: 3, runs: 5, sylly: true, logged: [100, 100, 100], truths: [100, 100, 100], unreg: [false, false, false],
    corrections: [{ target: 1, mult: 10 }, null, { target: 1, mult: 10 }] });
  ok(sc.receipts[1].find(l => l.key === 'ins').km === 4000, 'Insurance Payout capped at 4,000');
  const fl = S.etaScoreRun({ n: 3, runs: 5, sylly: true, logged: [1, 100, 100], truths: [100, 100, 100], unreg: [false, false, false],
    corrections: [{ target: 1, mult: 10 }, null, null] });
  ok(fl.runTotals[0] === 0 && fl.receipts[0].some(l => l.key === 'floor'), 'a negative Run hits the floor, and the receipt says so', fl.receipts[0]);
  const ho = S.etaScoreRun({ n: 3, runs: 5, sylly: true, logged: [100, 100, 100], truths: [100, 200, 100], unreg: [false, false, false],
    corrections: [{ target: 1, mult: 1 }, null, null] });
  ok(!ho.receipts[1].some(l => l.key === 'ins'), 'a ×1 correction is Hands off — no Insurance');
}

// ═══════════════════════════════════════════════════════════════════════════
head('4. Gear Ratio (hidden), ranks, formatting');
{
  const sc = S.etaScoreRun({ n: 4, runs: 3, sylly: false, logged: [300, 5760, 30240, 20], truths: [288, 18000, 12000, 2.5714], stamps: [1, 2, 1, 0] });
  ok(sc.receipts.every(L => L.every(l => l.km % 10 === 0)), 'every geared line rounds to 10 km');
  ok(sc.runTotals.every((t, i) => t === sc.receipts[i].reduce((a, l) => a + l.km, 0)), 'the receipt adds up after gearing (Short Shift)');
  near(sc.runTotals[0], 43500 * 5 / 3, 20, 'Short Shift gears ×1.667');
  ok(S.etaGeared(10000, 7) === 7140, 'Long Shift gears ×0.714 (10,000 → 7,140)');
}
ok(S.etaRankIdx(0) === 0 && S.etaRankIdx(24999) === 0 && S.etaRankIdx(25000) === 1 && S.etaRankIdx(194999) === 6 && S.etaRankIdx(500000) === 7, 'rank thresholds');
ok(E.get('ETA_RANKS')[7].name === "Dot's Favourite" && E.get('ETA_RANKS')[0].name === 'Work-Experience Kid', 'the grounded rank ladder');
ok(S.etaDur(288) === '4.8 hrs' && S.etaDur(18000) === '12.5 days' && S.etaDur(1200 / 28000 * 60) === '2.6 min', 'friendly durations (brief Sample 1)', [S.etaDur(288), S.etaDur(18000)]);
ok(/years$/.test(S.etaDur(525960 * 5000)) && /million years$/.test(S.etaDur(525960 * 3e6)), 'very large durations stay in words');
ok(/^4,000 hours — about .+\. Lock it in\?$/.test(S.etaDoubleTakeText(4000, 'hr', 1, 240000)), "Dot's Double-Take repeats the entry in other words (brief §14 B)", S.etaDoubleTakeText(4000, 'hr', 1, 240000));
ok(S.etaDoubleTakeText(30, 'day', 1, 43200).startsWith('30 days'), 'the Double-Take repeats the unit the courier picked');
ok(S.etaToMinutes(2.5, 'hr', 1) === 150 && S.etaToMinutes(3, 'yr', 1e6) === 3 * 525960 * 1e6 && S.etaToMinutes(0, 'hr', 1) === null, 'the Time Dial converts to minutes');
const v1 = S.etaVerdict(300, 288), v2 = S.etaVerdict(5760, 18000), v3 = S.etaVerdict(30240, 12000);
ok(v1.kind === 'dead' && v2.kind === 'fast' && v2.top === '×3.1' && v3.kind === 'slow', 'verdicts: dead on / ×3.1 too fast / too slow', [v1, v2, v3]);

// ═══════════════════════════════════════════════════════════════════════════
head('5. The curated deal + the route draw (seeded)');
{
  const rng = seeded(Number(process.env.ETA_SEED) || 20261110);
  let bad = 0, dup = 0, unreg = 0, spread = 0, deals = 0;
  for (let t = 0; t < 3000; t++) {
    const n = 3 + Math.floor(rng() * 6), sylly = rng() < 0.5;
    const range = ['local', 'mixed', 'cosmic'][Math.floor(rng() * 3)];
    const route = S.etaDrawRoute(DATA, { range, used: [], seats: n, sylly, offMap: rng() < 0.5 }, rng);
    if (!route) { bad++; continue; }
    const rides = S.etaDealRun(DATA, route, n, { sylly }, rng);
    deals++;
    if (rides.length !== n) bad++;
    if (new Set(rides.map(d => d.id)).size !== n) dup++;
    if (!sylly && rides.some(d => d.unregistered)) unreg++;
    rides.forEach(d => { const tt = S.etaTruth(route, d); if (tt < DATA.window.minMinutes || tt > DATA.window.maxMinutes) bad++; });
    const sp = rides.map(d => S.etaSpeedFor(route, d)).sort((a, b) => a - b);
    if (sp[sp.length - 1] / sp[0] < 10) spread++;
  }
  ok(deals === 3000 && bad === 0, 'every deal: one Ride per seat, every truth inside the answerable window', { deals, bad });
  ok(dup === 0, 'no Ride twice in one Run');
  ok(unreg === 0, 'Unregistered Rides only in Backseat Drivers');
  ok(spread / deals < 0.05, 'drawn for spread: fastest ÷ slowest ≥ 10× in ≥ 95% of Runs', spread / deals);
}
{
  ['local', 'mixed', 'cosmic'].forEach(range => {
    const rng = seeded(7);
    const used = [];
    for (let r = 0; r < 7; r++) { const rt = S.etaDrawRoute(DATA, { range, used, seats: 8, sylly: false, offMap: false }, rng); used.push(rt.id); }
    ok(new Set(used).size === 7, `${range}: a 7-Run Shift at 8 couriers never repeats a Route`, used);
    const bad = used.map(id => DATA.routes.find(x => x.id === id)).filter(rt => !S.etaRangeHas(range, rt) || rt.offMap);
    ok(!bad.length, `${range}: every Route is in Range and on the map`);
  });
  const rng = seeded(11);
  let off = 0;
  for (let t = 0; t < 2000; t++) if (S.etaDrawRoute(DATA, { range: 'mixed', used: [], seats: 5, sylly: true, offMap: true }, rng).offMap) off++;
  ok(off > 350 && off < 650, 'Off the Map: about 1 Route in 4', off / 2000);
  // Rides held earlier this Shift are avoided where possible.
  const r2 = seeded(5), route = DATA.routes.find(x => x.id === 'italy');
  let repeats = 0;
  for (let t = 0; t < 500; t++) {
    const first = S.etaDealRun(DATA, route, 4, { sylly: false }, r2);
    const second = S.etaDealRun(DATA, route, 4, { sylly: false, used: first.map(d => [d.id]) }, r2);
    second.forEach((d, i) => { if (d.id === first[i].id) repeats++; });
  }
  ok(repeats / 2000 < 0.05, 'a courier rarely gets the same Ride twice in a Shift', repeats / 2000);
  const hint = S.etaBuildBriefing(route, [DATA.rides.find(d => d.id === 'carpet'), DATA.rides.find(d => d.id === 'heli')]);
  ok(hint.includes('Wind speeds perfect for a gentle ride.') && hint[0] === route.briefing[0], "an Unregistered Ride's hint joins the shared Briefing");
}

// ═══════════════════════════════════════════════════════════════════════════
head('6. A whole Shift through the host appliers (single process, every seat)');
function runShift(sylly, runs, n) {
  const sb = makeSandbox();
  const X = sb.__eta;
  X.set('etaData', DATA);
  X.set('etaRng', seeded(99 + n));
  X.set('etaShiftLength', runs);
  X.set('etaSyllyMode', sylly);
  X.set('etaPlayerNames', Array.from({ length: n }, (_, i) => 'P' + i));
  sb.etaStartShift();
  const rng = seeded(1234 + n);
  for (let r = 1; r <= runs; r++) {
    ok(X.get('etaRun') === r && X.get('etaHostPhase') === 'log', `${sylly ? 'Sylly' : 'Std'} n=${n}: Run ${r} opens in the log phase`);
    const truths = X.get('etaRunTruths');
    ok(truths.length === n && truths.every(t => t > 0), 'host holds a truth per seat');
    ok(!sb.etaApplyLog(0, r - 1, 100), 'a stale Run is dropped');
    ok(sb.etaApplyLog(0, r, truths[0] * Math.exp((rng() - 0.5) * 2)), 'seat 0 logs');
    ok(!sb.etaApplyLog(0, r, 7), 'a second log from the same seat is dropped while the phase is open');
    ok(!sb.etaApplyLog(1, r, Infinity) && !sb.etaApplyLog(1, r, -3), 'an impossible ETA is refused');
    for (let i = 1; i < n; i++) ok(sb.etaApplyLog(i, r, truths[i] * Math.exp((rng() - 0.5) * 2)), `seat ${i} logs`);
    ok(!sb.etaApplyLog(0, r, 5), 'a second log from one seat is dropped');
    ok(X.get('etaHostPhase') === 'social' && X.get('etaSheetRows').length === n, 'all logged → the Run Sheet opens');
    if (!sylly) {
      ok(!sb.etaApplyStamp(0, r, 0), 'no self-stamp');
      for (let i = 0; i < n; i++) sb.etaApplyStamp(i, r, (i + 1) % n);
      ok(!sb.etaApplyCorrection(0, r, 1, 2), 'no Course Correction in Standard');
    } else {
      ok(!sb.etaApplyStamp(0, r, 1), 'no Stamp in Backseat Drivers');
      ok(!sb.etaApplyCorrection(0, r, 0, 2), 'no correcting yourself');
      for (let i = 0; i < n; i++) sb.etaApplyCorrection(i, r, i % 2 ? -1 : (i + 1) % n, 1.5 + rng() * 2);
      ok(X.get('etaCorrList').length === Math.ceil(n / 2), 'Corrections listed (Hands off excluded)');
    }
    const P = X.get('etaProof');
    ok(P && P.run === r && P.truths.length === n, 'the Proof of Delivery resolves');
    ok(P.totals.every((t, i) => t >= 0), 'no negative Shift totals');
    sb.etaHostNext();
  }
  const end = X.get('etaShiftEnd');
  ok(end && end.winners.length >= 1, 'End of Shift: Courier of the Month named');
  ok(X.get('etaHistory').length === runs, 'the history holds every Run');
  const routes = X.get('etaUsedRoutes');
  ok(new Set(routes).size === routes.length, 'no Route repeats in the Shift');
  return { sb, X };
}
runShift(false, 5, 4);
runShift(true, 5, 5);
runShift(false, 3, 8);
runShift(true, 7, 3);
{
  // Stalls: the timer is SCHEDULED once all but one are in, and firing it resolves.
  const sb = makeSandbox(); const X = sb.__eta;
  X.set('etaData', DATA); X.set('etaRng', seeded(3)); X.set('etaPlayerNames', ['A', 'B', 'C', 'D']);
  sb.etaStartShift();
  const before = sb.__timers.length;
  [0, 1, 2].forEach(i => sb.etaApplyLog(i, 1, 100));
  const st = sb.__timers.slice(before).find(t => t.ms === 60000);
  ok(!!st, 'log stall: 60 s countdown armed with one courier left');
  st.fn();
  ok(X.get('etaHostPhase') === 'social' && X.get('etaSheetRows')[3].logged === null, 'log stall expiry: the straggler has No ETA');
  ok(!sb.etaApplyCorrection(0, 1, 3, 2), 'a No-ETA courier cannot be corrected (Standard anyway refuses)');
  [0, 1, 2].forEach(i => sb.etaApplyStamp(i, 1, 3));
  const st2 = sb.__timers.find(t => t.ms === 30000);
  ok(!!st2, 'stamp stall: 30 s countdown armed with one courier left');
  st2.fn();
  const P = X.get('etaProof');
  ok(P && P.stampsIn[3] === 3, 'stall expiry resolves; the straggler gave no Stamp');
  ok(P.receipts[3][0].label === 'Accuracy (no ETA)' && P.receipts[3][0].km === 0, 'No ETA scores no Accuracy');
}
{
  // Ending the Shift — tied winners share.
  const end = S.etaComputeEnd(['A', 'B', 'C'], [100, 100, 50], [], false);
  ok(JSON.stringify(end.winners) === '[0,1]', 'a tie shares Courier of the Month', end.winners);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70));
if (fail) { console.log(`FAILED — ${fail} check(s) (${pass} passed)`); process.exit(1); }
console.log(`ALL ${pass} CHECKS PASSED`);
