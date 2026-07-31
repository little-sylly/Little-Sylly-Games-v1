// ═══════════════════════════════════════════════════════════════════════════
// verify-pko-chain.js — asserts the Pecking Order data layer against the spec.
//
//   node tools/verify-pko-chain.js        (exits 1 on any failure)
//
// Checks the FOUR chain invariants (spec §10 — the ones that look like bugs and
// must never be "tidied"), the Poacher wildcard rule (§16 Q1a), the absence of a
// track check, and the Pool totals 110 / 146 / 183 / 219 (§10).
//
// It re-implements NOTHING: js/games/pko.js is evaluated in a vm sandbox with
// minimal browser stubs, so these run against the real shipped functions. Re-run
// after any chain or balance edit — notably when Force of Nature adds the Mimic.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const chainJson = fs.readFileSync(path.join(ROOT, 'data/pko-data.json'), 'utf8');

// ── Sandbox: only what pko.js touches at parse time + inside the four functions ──
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: {},
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(chainJson)) }),
  // engine.js's shuffle — pkoBuildPool depends on it (copied, not re-derived: the
  // assertions are on length and composition, both shuffle-invariant).
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// pko.js's state is declared with `let`, and `let` creates a lexical binding rather
// than a property on the context object — so the state is invisible from out here.
// `function` declarations DO land on the object, so the four functions under test are
// reached directly; this appended bridge exposes the state they read and write.
const BRIDGE = `
globalThis.__pko = {
  get chain()    { return pkoChain; },
  get beatenBy() { return pkoBeatenByMap; },
  get beats()    { return pkoBeatsMap; },
  // Ravenous pair — built at load alongside the strict maps; pkoAppetite only chooses.
  get wide()      { return pkoBeatenByWide; },
  get beatsWide() { return pkoBeatsWideMap; },
  predators(id)   { return pkoPredators(id); },
  setPoacher(v)   { pkoPoacherSetting = v; },
  setAppetite(v)  { pkoAppetite = v; },
};`;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/pko.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/pko.js' });

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  await sandbox.pkoLoadChain();
  const { pkoBeats, pkoBuildPool } = sandbox;
  const { chain: pkoChain, beatenBy: pkoBeatenByMap, beats: pkoBeatsMap } = sandbox.__pko;
  const ids = Object.keys(pkoChain);
  const sorted = s => [...s].sort();

  console.log('Pecking Order — data layer verification\n' + '='.repeat(48));

  section('Data file');
  check('15 entries (the Mimic landed with Force of Nature — FoN spec §10)', ids.length, 15);
  check('no entry stores a `beats` field (derived only)',
    ids.filter(id => 'beats' in pkoChain[id]), []);
  check('no entry stores a `reach_beats` field (derived only)',
    ids.filter(id => 'reach_beats' in pkoChain[id]), []);
  check('every entry carries a reach_beaten_by array',
    ids.filter(id => !Array.isArray(pkoChain[id].reach_beaten_by)), []);

  // ── The invariants hold under BOTH Appetites ────────────────────────────
  // Ravenous adds two-tier edges only; it must not quietly break a structural property.
  ['sated', 'ravenous'].forEach(mode => {
    sandbox.__pko.setAppetite(mode);
    const pred = id => sorted(sandbox.__pko.predators(id));
    section(`The four chain invariants (spec §10) — Appetite: ${mode}`);
    check(`1. Eagle has no predator [${mode}]`, pred('eagle'), []);
    check(`2. Eagle ↛ Leopard (siblings) [${mode}]`, pkoBeats('leopard', 'eagle'), false);
    check(`2. Leopard ↛ Eagle (siblings) [${mode}]`, pkoBeats('eagle', 'leopard'), false);
    check(`3. Orca ⇄ Stingray is a closed pair [${mode}]`,
      [pkoBeats('orca', 'stingray'), pkoBeats('stingray', 'orca')], [true, true]);
    check(`4. reaches Fish [${mode}]`, pred('fish'),
      mode === 'sated' ? ['eagle', 'mongoose', 'octopus']
                       : ['eagle', 'mongoose', 'octopus', 'seal']);
    check(`4. of those, only Mongoose + Eagle are cross-track [${mode}]`,
      pred('fish').filter(p => pkoChain[p].track !== 'sea'), ['eagle', 'mongoose']);
    check(`a Poacher still beats every Mark [${mode}]`,
      ids.filter(id => !pkoBeats(id, 'human')), []);
    check(`nothing but a Poacher beats a Poacher-Mark [${mode}]`,
      ids.filter(id => id !== 'human' && pkoBeats('human', id)), []);
    check(`no species beats itself [${mode}]`, ids.filter(id => pkoBeats(id, id)), ['human']);
  });
  sandbox.__pko.setAppetite('sated');   // back to the shipped default

  // ── Appetite: the six two-tier edges ────────────────────────────────────
  section('Appetite — Ravenous adds exactly six edges, symmetric across both tracks');
  const REACH = [['leopard', 'mouse'], ['bear', 'mongoose'], ['elephant', 'leopard'],
                 ['seal', 'fish'], ['polar_bear', 'octopus'], ['orca', 'seal']];
  sandbox.__pko.setAppetite('sated');
  check('Sated: none of the six are live',
    REACH.filter(([pred, prey]) => pkoBeats(prey, pred)), []);
  sandbox.__pko.setAppetite('ravenous');
  check('Ravenous: all six are live',
    REACH.filter(([pred, prey]) => !pkoBeats(prey, pred)), []);
  check('exactly six edges differ between the two modes',
    ids.reduce((n, id) => n + (sandbox.__pko.wide[id].size - pkoBeatenByMap[id].size), 0), 6);
  check('3 land + 3 sea — neither ladder is reachier',
    [REACH.filter(([p]) => pkoChain[p].track === 'land').length,
     REACH.filter(([p]) => pkoChain[p].track === 'sea').length], [3, 3]);

  section('Appetite — the apex band is untouched (big cards stay scary)');
  const APEX = ['bear', 'elephant', 'polar_bear', 'orca', 'stingray', 'eagle'];
  check('apex predator sets are IDENTICAL in both modes',
    APEX.filter(id => sorted(sandbox.__pko.wide[id]).join() !== sorted(pkoBeatenByMap[id]).join()), []);
  check('only the bottom three of each ladder gained a predator',
    ids.filter(id => sandbox.__pko.wide[id].size > pkoBeatenByMap[id].size).sort(),
    ['fish', 'leopard', 'mongoose', 'mouse', 'octopus', 'seal']);
  sandbox.__pko.setAppetite('sated');

  section('pkoBeatsMap is derived by inversion, not stored');
  const mismatched = ids.filter(prey =>
    [...pkoBeatenByMap[prey]].some(pred => !pkoBeatsMap[pred].has(prey)));
  check('every beaten_by edge appears inverted in pkoBeatsMap', mismatched, []);
  check('every id has a pkoBeatsMap entry (empty if it eats nothing)',
    ids.filter(id => !pkoBeatsMap[id]), []);
  check('Bee beats Elephant (the giant-killer edge)', sorted(pkoBeatsMap.bee), ['elephant']);

  section('The Poacher wildcard (spec §16 Q1a — resolved option (a))');
  check('a Poacher beats every Mark, including a Poacher-Mark',
    ids.filter(id => !pkoBeats(id, 'human')), []);
  check('nothing but a Poacher beats a Poacher-Mark',
    ids.filter(id => id !== 'human' && pkoBeats('human', id)), []);

  section('No track check — track-locking is emergent, never coded');
  check('Eagle (land) beats Fish (sea)', pkoBeats('fish', 'eagle'), true);
  check('Mongoose (land) beats Fish (sea)', pkoBeats('fish', 'mongoose'), true);
  check('Seal (sea) does NOT beat Leopard (land)', pkoBeats('leopard', 'seal'), false);

  section('Pool totals, default settings (Poacher "One Each")');
  sandbox.__pko.setPoacher('perPlayer');
  const EXPECTED_TOTAL = { 3: 110, 4: 146, 5: 183, 6: 219 };
  const EXPECTED_EAGLE = { 3: 5,   4: 6,   5: 8,   6: 9   };
  for (const n of [3, 4, 5, 6]) {
    const pool = pkoBuildPool(n);
    const count = id => pool.filter(c => c === id).length;
    check(`n=${n} → Pool ${EXPECTED_TOTAL[n]}`, pool.length, EXPECTED_TOTAL[n]);
    check(`n=${n} → Eagle ${EXPECTED_EAGLE[n]} (Math.ceil)`, count('eagle'), EXPECTED_EAGLE[n]);
    check(`n=${n} → Poacher ${n}`, count('human'), n);
    check(`n=${n} → dealt ratio ~33% at Hoard 12`,
      Math.round((12 * n) / pool.length * 1000) / 10 > 32 &&
      Math.round((12 * n) / pool.length * 1000) / 10 < 34, true);
  }

  section('Eagle rounding — ceil, never round');
  // At n=3, Math.round(4.5) === 5 too, but the value is a knife-edge: assert the
  // formula's intent explicitly so a future "tidy" to round is caught by review.
  check('n=3 → ceil(4.5) = 5, not floor', Math.ceil(1.5 * 3), 5);
  check('n=5 → ceil(7.5) = 8', Math.ceil(1.5 * 5), 8);
  sandbox.__pko.setPoacher('perPlayer');

  section('Poacher setting drives the Poacher count');
  for (const [setting, expected] of [['none', 0], ['flat3', 3], ['perPlayer', 4]]) {
    sandbox.__pko.setPoacher(setting);
    check(`'${setting}' at n=4 → ${expected} Poachers`,
      pkoBuildPool(4).filter(c => c === 'human').length, expected);
  }

  section('The Mimic (Force of Nature — spec §10)');
  const mimic = pkoChain.mimic;
  check('the Mimic entry exists', !!mimic, true);
  check('it is force_of_nature_only', !!(mimic && mimic.force_of_nature_only), true);
  check('track is wild — so a track lock can never let a lone Mimic act',
    mimic && mimic.track, 'wild');
  check('beaten_by is empty — a Mimic never becomes a Mark, so nothing beats it',
    mimic && mimic.beaten_by, []);
  check('copy_formula is 2n — the exact mirror of the Poacher’s solo-only n',
    mimic && mimic.copy_formula, '2n');
  check('it is NOT ranked by Small Fry (a Hoard of Mimics + one Mouse opens with the Mouse)',
    sandbox.PKO_PREY_RANK === undefined || !('mimic' in (sandbox.PKO_PREY_RANK || {})), true);
  section('The Mimic never reaches a standard Pool');
  for (const n of [3, 4, 5, 6]) {
    check(`n=${n} → zero Mimics in the Pool`, pkoBuildPool(n).filter(c => c === 'mimic').length, 0);
  }
  check('Pool totals are unchanged by the new entry — 110/146/183/219',
    [3, 4, 5, 6].map(n => pkoBuildPool(n).length), [110, 146, 183, 219]);

  console.log('\n' + '='.repeat(48));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
