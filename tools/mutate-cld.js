// ═════════════════════════════════════════════════════════════════════════
// mutate-cld.js — planted-drift runner for Cold Shoulder's verification harnesses.
//
//   node tools/mutate-cld.js            (exits 1 if any mutant SURVIVES)
//
// Every entry below is a small, PLAUSIBLE mis-implementation of one specced
// rule, written into a throwaway copy of js/games/cld.js or js/lib/physics.js
// and driven through tools/verify-cld-loop.js via CLD_SRC= / CLD_PHYS_SRC=.
//
// WHY THIS EXISTS. A green harness is a claim; this is the only thing that
// checks the claim. Five defects in this build (cld-impl-notes BUG-01..BUG-05)
// were invisible to 100+ passing checks and obvious to a single mutant — and
// two of those were defects in the HARNESS, which no amount of adding checks
// would have surfaced. A mutant that SURVIVES means the rule it broke is
// indistinguishable from its own absence: either it is untested, or it is dead
// code. Both are worth knowing, and only this tells you which.
//
// A mutant reported as CAUGHT (threw) crashed the harness rather than failing a
// named check. That still counts — but for the two shunt mutants it is the
// specced loud failure firing, not an accident.
//
// Re-run after touching cld.js, physics.js or verify-cld-loop.js. Add a mutant
// whenever a new rule lands: if nothing can tell the rule from its absence, the
// rule is not verified.
// ═════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const OUT  = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'cld-mutants-'));
fs.mkdirSync(OUT, { recursive: true });
const GAME = path.join(ROOT, 'js/games/cld.js');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
// Normalised to LF: core.autocrlf is on in this repo, and the multi-line anchors below
// would otherwise read as STALE on a CRLF checkout.
const SRC  = { game: fs.readFileSync(GAME, 'utf8').replace(/\r\n/g, '\n'),
               phys: fs.readFileSync(PHYS, 'utf8').replace(/\r\n/g, '\n') };

// [name, which, [ [from, to], ... ]]
const M = [

['win-test-on-penguins', 'game', [[
`  const alive = Object.keys(owners).map(Number);
  if (alive.length !== 1) return { winnerIdx: -1, matchOver: false };`,
`  const alive = Object.keys(owners).map(Number);
  if (cldStanding().length !== 1) return { winnerIdx: -1, matchOver: false };`]]],

['washout-decided-before-thaw', 'game', [
 ['  const thaw = cldThawStep(rand);',
  '  const washoutEarly = cldCheckWashout();\n  const outcomeEarly = cldResolveFloeOff();\n  const thaw = cldThawStep(rand);'],
 ['  const washout = cldCheckWashout();', '  const washout = washoutEarly;'],
 ['  const outcome = cldResolveFloeOff();', '  const outcome = outcomeEarly;']]],

['washout-blind-to-the-thaw', 'game', [[
  '  const washout = cldCheckWashout();',
  '  const washout = cldCheckWashout() && !cldSyllyMode;']]],

['thaw-floor-hardcoded', 'game', [[
  '  const to   = Math.max(cldMinRadius(), cldFloeRadius - CLD_THAW_STEP);',
  '  const to   = Math.max(65, cldFloeRadius - CLD_THAW_STEP);']]],

['thaw-pushes-standing-inward', 'game', [[
  '  const dropped = cldStanding().filter(p => cldDistFromCentre(p.x, p.y) > to);',
`  cldStanding().forEach(p => {
    const d = cldDistFromCentre(p.x, p.y);
    if (d > to) { p.x = CLD_W / 2 + (p.x - CLD_W / 2) * to / d;
                  p.y = CLD_H / 2 + (p.y - CLD_H / 2) * to / d; }
  });
  const dropped = cldStanding().filter(p => cldDistFromCentre(p.x, p.y) > to);`]]],

['thaw-strands-the-drowned', 'game', [[
  '  cldPenguins.forEach(p => { if (p.drowned) cldPlaceDrowned(p); });',
  '  // MUTANT: Drowned penguins left stranded off the new rim']]],

['thaw-strands-the-bergs', 'game', [[
  '  cldProjectBergsToRim();',
  '  // MUTANT: Bergs left stranded off the new rim']]],

['drowned-enter-the-sim-as-movable', 'game', [[
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }",
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'penguin' }"]]],

['drowned-lose-their-restitution', 'game', [[
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }",
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'penguin', immovable: true, hits: 1 }"]]],

['dive-resolves-after-the-slide', 'game', [
 ['  const dives = cldResolveDives();\n', '  const dives = [];\n'],
 ['  const standingAfterSlide = cldStanding().map(p => p.id);',
  '  cldResolveDives();\n  const standingAfterSlide = cldStanding().map(p => p.id);']]],

['fish-awarded-on-washout', 'game', [[
`  const alive = Object.keys(owners).map(Number);
  if (alive.length !== 1) return { winnerIdx: -1, matchOver: false };

  const w = alive[0];`,
`  const alive = Object.keys(owners).map(Number);
  if (alive.length > 1) return { winnerIdx: -1, matchOver: false };

  const w = alive.length ? alive[0] : 0;`]]],

['fish-to-win-off-by-one', 'game', [[
  '  return { winnerIdx: w, matchOver: cldFish[w] >= cldFishToWin };',
  '  return { winnerIdx: w, matchOver: cldFish[w] > cldFishToWin };']]],

['snowball-force-of-slide-distance', 'game', [[
  '  return (0.40 + (0.20 - 0.40) * Math.min(1, dist / maxRange)) * CLD_V_MAX;',
  '  return (0.40 + (0.20 - 0.40) * Math.min(1, dist / maxRange)) * cldFullSlideDist();']]],

['snowball-force-flat', 'game', [[
  '  return (0.40 + (0.20 - 0.40) * Math.min(1, dist / maxRange)) * CLD_V_MAX;',
  '  return 0.40 * CLD_V_MAX;']]],

// ── Stage 3: the two Snowball constants moved (r 4→8, speed 260→600) and the
// flight-time check was restated to pin units rather than the old literal.
// These three prove the restated check still bites, and that the ball's radius
// and the arrival SCHEDULE are both load-bearing at the new values.
['snowball-arrival-halved', 'game', [[
  'function cldSnowballArrivalMs(dist) { return (dist / CLD_SNOWBALL_SPEED) * 1000; }',
  'function cldSnowballArrivalMs(dist) { return (dist / CLD_SNOWBALL_SPEED) * 500; }']]],

['snowball-arrival-is-instant', 'game', [[
  'function cldSnowballArrivalMs(dist) { return (dist / CLD_SNOWBALL_SPEED) * 1000; }',
  'function cldSnowballArrivalMs(dist) { return 0; }']]],

['snowball-radius-dropped-from-the-event', 'game', [[
  'radius: CLD_SNOWBALL_R,',
  'radius: 0,']]],

// ── SW v243: plugs, Throw-or-Dive and the Ice Bath ─────────────────────────
['plug-seats-on-the-ice', 'game', [[
  'function cldSeatR()  { return cldFloeRadius + CLD_PLUG_OUT; }',
  'function cldSeatR()  { return cldChunkR(); }']]],

['chunk-ban-taken-at-the-seat-circle', 'game', [[
  '    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * cldDistFromCentre(q.x, q.y))));',
  '    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * S)));']]],

['plug-never-centres', 'game', [[
  '    if (widthUnits < CLD_CENTRE_GAP_DIAM * 2 * CLD_PENGUIN_R) t = (s + e) / 2;',
  '    if (false) t = (s + e) / 2;']]],

['plug-absorbs-forever', 'game', [[
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }",
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned' }"]]],

['no-instant-plug', 'game', [[
  '    params:   Object.assign(cldSimParams(), { seatOnPlunge: cldSeatOnPlunge }),',
  '    params:   cldSimParams(),']]],

['no-displacement', 'game', [[
  '      cldDisplaceFrom(p, aftermath);',
  '      /* MUTANT: no displacement */']]],

['dive-furthest-wins', 'game', [[
  '  want.sort((a, b) => { const d = a.dist - b.dist; return Math.abs(d) > 0.01 ? d : a.seat - b.seat; });',
  '  want.sort((a, b) => { const d = b.dist - a.dist; return Math.abs(d) > 0.01 ? d : a.seat - b.seat; });']]],

['plugged-may-dive', 'game', [[
  '    const p = cldPenguins.find(q => q.id === c.dive.penguinId && q.ownerIdx === i && q.drowned && !q.plug);',
  '    const p = cldPenguins.find(q => q.id === c.dive.penguinId && q.ownerIdx === i && q.drowned);']]],

['throw-and-dive-both', 'game', [[
  '  if (commit && commit.dive && commit.snowball) commit = Object.assign({}, commit, { snowball: null });',
  '  /* MUTANT: both allowed */']]],

['bath-includes-everyone', 'game', [[
  '  const bathIds = washout ? (standingAfterSlide.length ? standingAfterSlide : standingBefore) : null;',
  '  const bathIds = washout ? cldPenguins.map(p => p.id) : null;']]],

['bath-keeps-the-ring', 'game', [[
  '  cldBergs      = [];\n  cldFloeRadius = cldBathRadius(',
  '  cldFloeRadius = cldBathRadius(']]],

['anchor-never-breaks', 'phys', [[
  '              if (anchor.hits !== null) {',
  "              if (anchor.kind === 'berg') {"]]],

['rng-warmup-removed', 'phys', [[
  '    for (let i = 0; i < 4; i++) step();',
  '    // MUTANT: no warm-up']]],

// ── SW v244: the cue and the Arena's swap (verify-cld-practice.js) ──────────
['cue-dead-zone-removed', 'game', [[
  '  if (dist >= CLD_CUE_DEAD) dir = { x: ex / dist, y: ey / dist };',
  '  if (dist > 0) dir = { x: ex / dist, y: ey / dist };']], 'practice'],

['a-tap-arms-an-aim', 'game', [[
  '  if (Math.hypot(now.x - down.x, now.y - down.y) * scale < CLD_CUE_TAP_PX) return null;',
  '  // MUTANT: a tap arms']], 'practice'],

['swap-never-restores-live', 'game', [[
`  try { return fn(); }
  finally {
    cldPrSwapDepth--;
    cldPrFloe = cldSwapOut();
    cldSwapIn(live);
  }`,
`  const r = fn();
  cldPrSwapDepth--;
  cldPrFloe = cldSwapOut();
  return r;`]], 'practice'],

['swap-misses-a-global', 'game', [
  ['    phase: cldPhase, powerLock: cldPowerLock,', '    phase: cldPhase,'],
  ['  cldPhase = s.phase; cldPowerLock = s.powerLock;', '  cldPhase = s.phase;']], 'practice'],
];

// Which harness a mutant is aimed at. The rules/sim mutants above run the loop
// harness; the SW v244 cue / swap mutants at the end of M are claims about
// verify-cld-practice.
const HARNESS = { loop: 'tools/verify-cld-loop.js', practice: 'tools/verify-cld-practice.js' };

console.log('Cold Shoulder — planted-drift run');
console.log('='.repeat(58));
const rows = [];
for (const [name, which, edits, harness] of M) {
  let src = SRC[which], missed = false;
  for (const [from, to] of edits) {
    if (src.indexOf(from) < 0) { missed = true; break; }
    src = src.replace(from, to);
  }
  if (missed) { rows.push([name, 'PATCH-MISS', '-']); continue; }
  const file = path.join(OUT, name + (which === 'game' ? '.cld.js' : '.phys.js'));
  fs.writeFileSync(file, src);
  const env = Object.assign({}, process.env);
  env[which === 'game' ? 'CLD_SRC' : 'CLD_PHYS_SRC'] = file;
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, HARNESS[harness || 'loop'])],
                         { env, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) CHECK\(S\) FAILED/);
  const crashed = r.status !== 0 && !m;
  rows.push([name, m ? 'CAUGHT' : (crashed ? 'CAUGHT (threw)' : 'SURVIVED'),
             m ? m[1] : (crashed ? 'crash' : '0')]);
}
let bad = 0;
for (const [n, v, c] of rows) {
  if (v.indexOf('CAUGHT') !== 0) bad++;
  console.log(`  ${v.padEnd(16)} ${String(c).padStart(5)} failed check(s)   ${n}`);
}
console.log(bad === 0 ? `\nAll ${rows.length} mutants caught.` : `\n${bad} of ${rows.length} MUTANT(S) SURVIVED`);
process.exit(bad === 0 ? 0 : 1);
