// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-dice.js — asserts The Bluff's procedural dice (SW v241).
//
//   node tools/verify-dyb-dice.js        (exits 1 on any failure)
//
// Covers js/games/dyb-dice.js — sets, colour maths, recipe, markup, the Phantom
// leak guard, the cube — the three DYB diceSet skin packs, the art.js resolver
// (assetDiceSet), and dyb.js's render seam (dybDieHTML) over the recipe.
//
// It re-implements NOTHING: js/lib/art.js, js/games/dyb-dice.js and
// js/games/dyb.js are evaluated in a vm sandbox, so these run against the real
// shipped code. The pack manifests are read from data/packs/ as shipped.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Sandbox ────────────────────────────────────────────────────────────────
// A permissive element stub: every property read returns the stub itself and it
// is callable, so dyb.js's top-level DOM wiring chains without throwing.
const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; },
  set() { return true; },
  apply() { return elStub; },
});

const sandbox = {
  console,
  document: {
    addEventListener() {},
    getElementById:   () => elStub,
    querySelector:    () => elStub,
    querySelectorAll: () => [],
    createElement:    () => elStub,
    body: elStub,
  },
  window: {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame() {},
  // art.js calls this at load; an empty registry leaves window.coreArt = {}.
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // Function declarations are hoisted and bound before any statement runs, so the
  // functions under test exist even if top-level DOM wiring throws under stubs.
  try {
    vm.runInContext(src, sandbox, { filename: rel });
  } catch (err) {
    console.log(`  note: ${rel} threw at top level under stubs (${err.message}) —`
      + ' hoisted function declarations are still bound');
  }
}
load('js/lib/art.js');
load('js/games/dyb-dice.js');
load('js/games/dyb.js');

for (const fn of ['assetDiceSet', 'dybDieHTML', 'dybDieRecipe', 'dybDieMarkup']) {
  if (typeof sandbox[fn] !== 'function') {
    console.error(`FATAL: ${fn} is not defined after load — the harness cannot run.`);
    process.exit(1);
  }
}

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`
    + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

// ═══ The procedural dice layer (dyb-dice.js) ═══════════════════════════════
const Sx = sandbox;
// A script-level const is NOT a property of the global object — read constants through the context.
const Rx = src => vm.runInContext(src, sandbox);
const SETS = ['rocky', 'classic'].map(k => Rx('DYB_DICE_SETS')[k]);
const FACES = [1, 2, 3, 4, 5, 6];

section('Built-in sets are valid');
SETS.forEach(s => check(`${s.id} validates`, Sx.dybValidateDiceSet(s), []));
check('a set needs exactly 8 tints', Sx.dybValidateDiceSet({ ...SETS[0], tints: SETS[0].tints.slice(0, 7) }).length > 0, true);
check('a tint needs a #rrggbb body', Sx.dybValidateDiceSet({ ...SETS[0], tints: SETS[0].tints.map((t, i) => i ? t : { body: 'red' }) }).length > 0, true);
check('an unknown finish is rejected', Sx.dybValidateDiceSet({ ...SETS[0], finish: 'neon' }).length > 0, true);

section('Pips contrast on every tint of every built-in set (≥ 3:1)');
SETS.forEach(s => s.tints.forEach((t, i) => {
  const ratio = Sx.dybContrast(Sx.dybPipFor(t), t.body);
  check(`${s.id} tint ${i} (${t.name}) pip contrast ${ratio.toFixed(2)}`, ratio >= 3, true);
}));

section('Recipes are deterministic and complete');
{
  let bad = 0; const keys = new Set(); let count = 0;
  for (const s of SETS) for (let tint = 0; tint < 8; tint++) for (const face of FACES)
    for (const type of ['standard', 'loaded', 'slick', 'cracked', 'snake']) {
      const a = JSON.stringify(Sx.dybDieRecipe({ set: s, tint, face, type }));
      const b = JSON.stringify(Sx.dybDieRecipe({ set: s, tint, face, type }));
      const r = JSON.parse(a);
      if (a !== b || JSON.stringify(r.positions) !== JSON.stringify(Rx('DYB_PIP_LAYOUTS')[face])) bad++;
      keys.add(r.key); count++;
    }
  check('same input → same recipe, pips at the layout for the face', bad, 0);
  check('every distinct die has a distinct key', keys.size, count);
}
check('markup draws exactly `face` pips', FACES.map(f =>
  (Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f }), 40).match(/class="dyb-pip /g) || []).length), FACES);
check('markup opens with the replace-prefix contract', Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: 3 }), 40).startsWith('<div class="dyb-die '), true);

section('Tempest forms read through form, not colour');
const rec = (type, extra = {}) => Sx.dybDieRecipe({ set: SETS[0], tint: 4, face: 4, type, ...extra });
check('Loaded → bronze pips', rec('loaded').pipStyle, 'bronze');
check('Snake → serpent pips', rec('snake').pipStyle, 'serpent');
check('Cracked → fissure, faded', [rec('cracked').overlays, rec('cracked').faded], [['fissure'], true]);
check('Slick → sheen', rec('slick').overlays, ['sheen']);
check('Slick unpicked → sheen + pick badge', rec('slick', { state: 'unpicked' }).overlays, ['sheen', 'pick-badge']);
check('Phantom revealed → the mist lifts', rec('phantom').overlays, ['mist-lift']);
check('Phantom revealed with a Loaded core → mist lifts, bronze underneath', [rec('phantom', { secondary: 'loaded' }).overlays, rec('phantom', { secondary: 'loaded' }).pipStyle], [['mist-lift'], 'bronze']);
check('the body keeps the owner tint whatever the type', ['loaded', 'snake', 'cracked', 'slick'].map(t => rec(t).body), Array(4).fill(SETS[0].tints[4].body));

section('THE LEAK GUARD — a concealed Phantom carries no face');
{
  const r = Sx.dybDieRecipe({ set: SETS[0], tint: 2, face: 6, type: 'phantom', secondary: 'loaded', state: 'concealed' });
  check('face is null, no pip positions, no form', [r.face, r.positions, r.form], [null, [], null]);
  const marks = new Set();
  for (const face of FACES) for (const sec of [null, 'loaded', 'slick', 'cracked', 'snake'])
    marks.add(Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 2, face, type: 'phantom', secondary: sec, state: 'concealed' }), 40));
  check('markup is byte-identical for every face and every hidden secondary', marks.size, 1);
}

section('dybActiveSet — skin first, Rocky otherwise');
// A function-declared global cannot be deleted, so save and restore it — from
// Task 5 on, art.js defines the real assetDiceSet and later sections need it.
const realAssetDiceSet = Sx.assetDiceSet;
Sx.assetDiceSet = () => null;
check('no skin → Rocky', Sx.dybActiveSet().id, 'rocky');
Sx.assetDiceSet = () => ({ ...SETS[1], id: 'test-skin' });
check('a valid skin set wins', Sx.dybActiveSet().id, 'test-skin');
Sx.assetDiceSet = () => ({ label: 'broken' });
check('an invalid skin set falls back to Rocky', Sx.dybActiveSet().id, 'rocky');
Sx.assetDiceSet = realAssetDiceSet;

section('Dice-set skin packs');
{
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
  const dybPacks = reg.map(id => ({ id, m: JSON.parse(fs.readFileSync(path.join(ROOT, `data/packs/${id}/pack.json`), 'utf8')) }))
    .filter(p => p.m.assets && p.m.assets.kind === 'dyb');
  check('the three DYB packs are registered', dybPacks.map(p => p.id).sort(), ['classic-dice', 'deep-ocean-dice', 'sea-cliff-dice']);
  dybPacks.forEach(p => {
    check(`${p.id}: diceSet validates`, Sx.dybValidateDiceSet(p.m.assets.diceSet), []);
    check(`${p.id}: no image maps left`, ['faces', 'back', 'specials', 'basePath'].filter(k => k in p.m.assets), []);
    check(`${p.id}: the folder holds only pack.json`, fs.readdirSync(path.join(ROOT, `data/packs/${p.id}`)), ['pack.json']);
    p.m.assets.diceSet.tints.forEach((t, i) => {
      const ratio = Sx.dybContrast(Sx.dybPipFor(t), t.body);
      check(`${p.id} tint ${i} (${t.name}) pip contrast ${ratio.toFixed(2)} ≥ 3`, ratio >= 3, true);
    });
  });
  Sx.window.activeAssetPack = { id: 'sea-cliff-dice', assets: dybPacks.find(p => p.id === 'sea-cliff-dice').m.assets };
  check('assetDiceSet resolves the active skin', Sx.assetDiceSet('dyb').label, dybPacks.find(p => p.id === 'sea-cliff-dice').m.assets.diceSet.label);
  check('…and nothing for another kind', Sx.assetDiceSet('pko'), null);
  Sx.window.activeAssetPack = null;
  check('no skin → null', Sx.assetDiceSet('dyb'), null);
}

section('dybDieHTML — the game seam over the recipe');
Sx.mpMyPlayerIdx = 0;
vm.runInContext('dybSeatNumbers = [2, 1, 3];', sandbox);
check('dybTintFor follows the seat (seat 2 → tint 1)', Sx.dybTintFor(0), 1);
check('dybTintFor falls back to the index with no seats', (vm.runInContext('dybSeatNumbers = [];', sandbox), Sx.dybTintFor(3)), 3);
{
  const seen = new Set();
  for (const f of FACES) seen.add(Sx.dybDieHTML(f, 'phantom', -1, 0, true, 'loaded', 2));
  check('owner view (dieIdx 0): a Phantom is identical for every face', seen.size, 1);
  const spect = new Set();
  for (const f of FACES) spect.add(Sx.dybDieHTML(f, 'phantom', -1, -2, true, 'snake', 2));
  check('spectator view (dieIdx -2): identical for every face', spect.size, 1);
}
check('reveal view (dieIdx -1) shows the face', (Sx.dybDieHTML(5, 'phantom', -1, -1, true, null, 2).match(/class="dyb-pip /g) || []).length, 5);
check('a Phantom+Slick reveals its locked face', (Sx.dybDieHTML(2, 'phantom', 6, -1, true, 'slick', 2).match(/class="dyb-pip /g) || []).length, 6);
check('an unpicked Slick carries the pick badge', Sx.dybDieHTML(3, 'slick', 3, 0, false).includes('dyb-ov-pick'), true);
check('no id attribute is emitted', /\sid="/.test(Sx.dybDieHTML(3, 'standard', -1, 0)), false);
check('Sm is 38 px', Sx.dybDieHTMLSm(4).includes('--dyb-s:38px'), true);
check('the replace-prefix contract holds', Sx.dybDieHTML(4, 'standard', -1).startsWith('<div class="dyb-die '), true);
check('dybEsc neutralises markup', Sx.dybEsc(`<b>"Sam" & 'Jo'</b>`), '&lt;b&gt;&quot;Sam&quot; &amp; &#39;Jo&#39;&lt;/b&gt;');
check('art.js no longer exports assetSpecial', typeof Sx.assetSpecial, 'undefined');

section('The cube');
{
  const rf = f => Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f });
  const m = Sx.dybCubeMarkup(rf, 4, 44);
  check('six faces', (m.match(/class="dyb-cube-face /g) || []).length, 6);
  check('lands on the face asked for', m.includes('data-land="4"'), true);
  const hidden = f => Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f, type: 'phantom', state: 'concealed' });
  const hm = Sx.dybCubeMarkup(hidden, 1, 44);
  check('a concealed Phantom cube: all six faces identical', new Set(hm.match(/<div class="dyb-cube-face [^"]*">[\s\S]*?<\/div><\/div>/g).map(s => s.replace(/dyb-cube-f\d/, ''))).size, 1);
  check('every landing transform names rotateX and rotateY (so transitions interpolate)',
        FACES.every(f => /rotateX\(/.test(Rx('DYB_CUBE_LAND')[f]) && /rotateY\(/.test(Rx('DYB_CUBE_LAND')[f])), true);
}
check('dybReducedMotion is false without matchMedia', Sx.dybReducedMotion(), false);

section('The cup');
{
  const plain = Sx.dybCupMarkup(SETS[0]), placed = Sx.dybCupMarkup(SETS[0], 'width:64px;height:74px');
  check('one style attribute, extra style merged into it (a second one is silently dropped)',
        [(plain.match(/ style="/g) || []).length, (placed.match(/ style="/g) || []).length, /--dyb-cup:[^"]*width:64px/.test(placed)], [1, 1, true]);
}

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
