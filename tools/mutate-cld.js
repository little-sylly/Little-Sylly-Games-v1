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
const SRC  = { game: fs.readFileSync(GAME, 'utf8'), phys: fs.readFileSync(PHYS, 'utf8') };

// [name, which, [ [from, to], ... ]]
const M = [

['shunt-one-hop-only', 'game', [[
  'for (let h = 1; h <= Math.floor(N / 2); h++) {',
  'for (let h = 1; h <= 1; h++) {']]],

['shunt-ignores-free-count', 'game', [[
`    if (ccw === cw)      pick = cw;                    // the antipode, at h = N/2
    else if (fCw > fCcw) pick = cw;                    // prefer MORE free positions
    else if (fCcw > fCw) pick = ccw;
    else                 pick = (side > 0) ? cw : ccw; // tie (incl. both full) → travel direction`,
`    pick = (side > 0) ? cw : ccw;   // MUTANT: travel direction always wins`]]],

['shunt-default-anticlockwise', 'game', [[
  '  if (!(Math.abs(t) > speed * 1e-9)) return +1;',
  '  if (!(Math.abs(t) > speed * 1e-9)) return -1;']]],

['shunt-exact-zero-not-tolerance', 'game', [[
  '  if (!(Math.abs(t) > speed * 1e-9)) return +1;',
  '  if (t === 0) return +1;']]],

['shunt-silent-fallback', 'game', [[
  "  throw new Error('cldAssignBerth: the rim is full at '",
  "  return { berth: home, slot: 0, hops: -1 };\n  throw new Error('cldAssignBerth: the rim is full at '"]]],

['win-test-on-penguins', 'game', [[
`  const alive = Object.keys(owners).map(Number);
  if (alive.length !== 1) return { winnerIdx: -1, matchOver: false };`,
`  const alive = Object.keys(owners).map(Number);
  if (cldStanding().length !== 1) return { winnerIdx: -1, matchOver: false };`]]],

['washout-decided-before-thaw', 'game', [
 ['  const thaw = cldThawStep(rand);',
  '  const washoutEarly = cldCheckWashout();\n  const outcomeEarly = cldResolveFloeOff();\n  const thaw = cldThawStep(rand);'],
 ['  const washout = cldCheckWashout();\n  const outcome = cldResolveFloeOff();',
  '  const washout = washoutEarly;\n  const outcome = outcomeEarly;']]],

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
  '  cldPenguins.forEach(p => { if (p.drowned) cldSeatDrowned(p, p.berth, p.slot); });',
  '  // MUTANT: Drowned penguins left stranded off the new rim']]],

['thaw-strands-the-bergs', 'game', [[
  '  cldProjectBergsToRim();',
  '  // MUTANT: Bergs left stranded off the new rim']]],

['dive-shunts-instead-of-failing', 'game', [[
`  const slot = cldPickFreeSlot(t, rand);
  if (slot < 0) return false;              // full → stays put. This is not an error.`,
`  let slot = cldPickFreeSlot(t, rand);
  if (slot < 0) { const s = cldAssignBerth(p.x, p.y, 0, 0, rand); cldSeatDrowned(p, s.berth, s.slot); return true; }`]]],

['drowned-enter-the-sim-as-movable', 'game', [[
  "    kind: p.drowned ? 'drowned' : 'penguin',",
  "    kind: 'penguin',"]]],

['drowned-lose-their-restitution', 'game', [[
  "    kind: p.drowned ? 'drowned' : 'penguin',",
  "    kind: 'penguin', immovable: true,"]]],

['dive-resolves-after-the-slide', 'game', [
 ['  const input = cldBuildSlideInputs();\n  const res = window.Physics.simulate({',
  '  const res = window.Physics.simulate({'],
  ['  const dives = [];', '  const input = cldBuildSlideInputs();\n  const dives = [];']]],

['slot-pick-ignores-occupancy', 'game', [[
`  const free = [];
  for (let s = 0; s < CLD_BERTH_SLOTS; s++) if (!cldSlotTaken(berth, s)) free.push(s);
  if (!free.length) return -1;`,
`  const free = [];
  for (let s = 0; s < CLD_BERTH_SLOTS; s++) free.push(s);
  if (cldFreeSlots(berth) === 0) return -1;`]]],

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

['berth-count-tracks-penguins', 'game', [[
  '  cldBerthCount  = cldPlayerCount;      // fixed for the whole match — NEVER changes',
  '  cldBerthCount  = cldPeckOff ? cldPlayerCount * 2 : cldPlayerCount;']]],

['rng-warmup-removed', 'phys', [[
  '    for (let i = 0; i < 4; i++) step();',
  '    // MUTANT: no warm-up']]],
];

console.log('Cold Shoulder — planted-drift run');
console.log('='.repeat(58));
const rows = [];
for (const [name, which, edits] of M) {
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
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/verify-cld-loop.js')],
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
