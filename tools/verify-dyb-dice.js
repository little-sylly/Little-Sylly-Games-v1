// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-dice.js — asserts The Bluff's die render seam.
//
//   node tools/verify-dyb-dice.js        (exits 1 on any failure)
//
// Covers the Tempest asset seam (spec docs/superpowers/specs/2026-08-01-dyb-
// tempest-asset-seam-design.md): the `specials` manifest block, the engine frame
// contract and its per-type opt-out, the reserved `blank` key, and the leak guard
// that stops a concealed phantom's real face reaching the DOM.
//
// It re-implements NOTHING: js/lib/art.js and js/games/dyb.js are evaluated in a
// vm sandbox, so these run against the real shipped resolver and the real render
// seam. The two art tiers are supplied as fixture manifests, exactly as a real
// pack would supply them.
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

for (const fn of ['assetFace', 'dybDieHTML', 'assetSpecial', 'assetSpecialFrame']) {
  if (typeof sandbox[fn] !== 'function') {
    console.error(`FATAL: ${fn} is not defined after load — the harness cannot run.`);
    process.exit(1);
  }
}
const { dybDieHTML } = sandbox;

// ── Fixtures — set the two art tiers exactly as the loaders would ──────────
function setSkin(assets) { sandbox.window.activeAssetPack = assets ? { id: 'testskin', assets } : null; }
function setCore(assets) { sandbox.window.coreArt = assets ? { dyb: { id: 'dyb', assets } } : {}; }
function noArt() { setSkin(null); setCore(null); }

const FACES_FIXTURE = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  back: 'back.svg',
};

// A skin that also covers special dice. Deliberately partial: loaded has 3 but
// not 4, snake opts out of the engine frame, phantom has `blank` but no faces.
const FACES_PLUS_SPECIALS = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  back: 'back.svg',
  specials: {
    loaded:  { '3': 'l3.svg' },
    snake:   { '2': 's2.svg', frame: false },
    slick:   { '5': 'k5.svg' },
    phantom: { blank: 'ghost.svg' },
    cracked: { blank: 'broken.svg' },
  },
};

// A core-art tier used to prove per-key fallthrough from the skin.
const CORE_SPECIALS = {
  kind: 'dyb', basePath: 'img/',
  faces: { '4': 'core4.svg' },
  specials: { loaded: { '4': 'coreL4.svg' } },
};

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`
    + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

// Class list of the OUTER die div (the first class attribute in the string).
function classesOf(html) {
  const m = html.match(/class="([^"]*)"/);
  return m ? m[1].split(/\s+/).filter(Boolean).sort() : [];
}
function hasClass(html, cls) { return classesOf(html).includes(cls); }
function imgUrl(html) {
  const m = html.match(/background-image:url\('([^']*)'\)/);
  return m ? m[1] : null;
}
// The glyph span's text. Excludes pip spans (empty) and the framed-art span
// (which carries a style attribute straight after its class).
function glyphText(html) {
  const m = html.match(/<span class="(?!dyb-pip|dyb-die-art)[^"]*">([^<]+)<\/span>/);
  return m ? m[1] : null;
}

// ═══ Characterisation — today's behaviour, locked in before anything changes ═══
// NOTE: the signature is
//   dybDieHTML(val, type, slickFace, dieIdx, isSlickAssigned, phantomSecondary)

section('Characterisation — no art pack loaded');
noArt();
check('standard 4 → pip grid, no image',
  [hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die'), imgUrl(dybDieHTML(4, 'standard', -1))],
  [true, null]);
check('standard 4 → 4 pips',
  (dybDieHTML(4, 'standard', -1).match(/dyb-pip/g) || []).length, 4);
check('loaded 3 → amber glow class + amber pips',
  [hasClass(dybDieHTML(3, 'loaded', -1), 'dyb-die-loaded'),
   dybDieHTML(3, 'loaded', -1).includes('bg-amber-700')],
  [true, true]);
check('snake 2 → snake classes',
  [hasClass(dybDieHTML(2, 'snake', -1), 'dyb-die-snake'),
   dybDieHTML(2, 'snake', -1).includes('dyb-pip-snake')],
  [true, true]);
check('cracked → ✕ glyph', glyphText(dybDieHTML(5, 'cracked', -1)), '✕');
check('phantom in hand → ? glyph (real face never rendered)',
  [glyphText(dybDieHTML(6, 'phantom', -1, 0)),
   dybDieHTML(6, 'phantom', -1, 0).includes('dyb-pip')],
  ['?', false]);
check('phantom spectator (dieIdx -2) → ? glyph',
  glyphText(dybDieHTML(6, 'phantom', -1, -2)), '?');
check('phantom revealed pure → indigo pips, no glyph',
  [glyphText(dybDieHTML(6, 'phantom', -1, -1)),
   dybDieHTML(6, 'phantom', -1, -1).includes('bg-indigo-400')],
  [null, true]);
check('phantom + loaded compound → both loaded class and ring',
  [hasClass(dybDieHTML(3, 'phantom', -1, -1, true, 'loaded'), 'dyb-die-loaded'),
   hasClass(dybDieHTML(3, 'phantom', -1, -1, true, 'loaded'), 'dyb-die-phantom-ring')],
  [true, true]);
check('slick unassigned → "4*" glyph + cursor-pointer',
  [glyphText(dybDieHTML(9, 'slick', 4, 0, false)),
   hasClass(dybDieHTML(9, 'slick', 4, 0, false), 'cursor-pointer')],
  ['4*', true]);
check('slick assigned → pips at the ASSIGNED face, not the roll',
  (dybDieHTML(9, 'slick', 2, 0, true).match(/dyb-pip/g) || []).length, 2);

section('Characterisation — skin with faces only (the shipped seam)');
setSkin(FACES_FIXTURE);
check('standard 4 → skin image, edge-to-edge asset class',
  [imgUrl(dybDieHTML(4, 'standard', -1)),
   hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die-asset')],
  ['data/packs/testskin/img/4.svg', true]);
check('loaded 3, skin has standard faces only → falls back to STANDARD face art, framed',
  [imgUrl(dybDieHTML(3, 'loaded', -1)), hasClass(dybDieHTML(3, 'loaded', -1), 'dyb-die-framed')],
  ['data/packs/testskin/img/3.svg', true]);
check('cup back → skin back image',
  imgUrl(sandbox.dybDieBackHTML()), 'data/packs/testskin/img/back.svg');

section('Characterisation — id attribute and replace-prefix contracts');
check('dieIdx >= 0 emits an id attribute',
  dybDieHTML(4, 'standard', -1, 2).startsWith('<div id="dyb-die-2" class="dyb-die '), true);
check('dieIdx -1 emits the bare prefix dyb.js:1025 string-replaces on',
  dybDieHTML(4, 'standard', -1, -1).startsWith('<div class="dyb-die '), true);
check('dybDieHTMLSm injects the sm class via that same prefix',
  hasClass(sandbox.dybDieHTMLSm(4), 'dyb-die-sm'), true);

section('Resolver — assetSpecial / assetSpecialFrame');
const { assetSpecial, assetSpecialFrame } = sandbox;

noArt();
check('no tiers → null', assetSpecial('dyb', 'loaded', 3), null);
check('no tiers → frame defaults true', assetSpecialFrame('dyb', 'loaded'), true);

setSkin(FACES_FIXTURE);
check('skin without a specials block → null', assetSpecial('dyb', 'loaded', 3), null);
check('skin without a specials block → frame true', assetSpecialFrame('dyb', 'loaded'), true);

setSkin(FACES_PLUS_SPECIALS);
check('skin covers loaded 3', assetSpecial('dyb', 'loaded', 3), 'data/packs/testskin/img/l3.svg');
check('skin does not cover loaded 4', assetSpecial('dyb', 'loaded', 4), null);
check('skin covers the blank key', assetSpecial('dyb', 'phantom', 'blank'), 'data/packs/testskin/img/ghost.svg');
check('unknown type → null', assetSpecial('dyb', 'nosuchtype', 3), null);
check('"frame" is not addressable as an id', assetSpecial('dyb', 'snake', 'frame'), null);
check('frame defaults true when unset', assetSpecialFrame('dyb', 'loaded'), true);
check('frame false when the type opts out', assetSpecialFrame('dyb', 'snake'), false);
check('opt-out does not leak to other types', assetSpecialFrame('dyb', 'slick'), true);

setSkin(FACES_PLUS_SPECIALS); setCore(CORE_SPECIALS);
check('skin wins over core for a covered key', assetSpecial('dyb', 'loaded', 3), 'data/packs/testskin/img/l3.svg');
check('per-key fallthrough to core for an uncovered key', assetSpecial('dyb', 'loaded', 4), 'data/art/dyb/img/coreL4.svg');

setSkin(null); setCore(CORE_SPECIALS);
check('core tier alone resolves', assetSpecial('dyb', 'loaded', 4), 'data/art/dyb/img/coreL4.svg');
check('core tier, uncovered key → null', assetSpecial('dyb', 'snake', 4), null);
check('wrong kind → null', assetSpecial('frt', 'loaded', 4), null);

section('Seam — special faces draw pack art inside the engine frame');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const loaded3 = dybDieHTML(3, 'loaded', -1);
check('loaded 3, skin covers it → framed art, not pips',
  [imgUrl(loaded3), hasClass(loaded3, 'dyb-die-framed'), loaded3.includes('dyb-pip')],
  ['data/packs/testskin/img/l3.svg', true, false]);
check('loaded 3 keeps its amber type class', hasClass(loaded3, 'dyb-die-loaded'), true);
check('framed art lives in an inner span', loaded3.includes('<span class="dyb-die-art"'), true);
check('framed dice never use the edge-to-edge asset class',
  hasClass(loaded3, 'dyb-die-asset'), false);

const loaded4 = dybDieHTML(4, 'loaded', -1);
check('loaded 4, skin lacks it → falls back to the STANDARD face art',
  imgUrl(loaded4), 'data/packs/testskin/img/4.svg');
check('...and is still framed, so the type stays legible',
  [hasClass(loaded4, 'dyb-die-framed'), hasClass(loaded4, 'dyb-die-loaded')],
  [true, true]);

const snake2 = dybDieHTML(2, 'snake', -1);
check('snake opted out of the frame → edge-to-edge asset class',
  [imgUrl(snake2), hasClass(snake2, 'dyb-die-asset'), hasClass(snake2, 'dyb-die-framed')],
  ['data/packs/testskin/img/s2.svg', true, false]);
check('opted-out die drops the engine type chrome',
  hasClass(snake2, 'dyb-die-snake'), false);

const snake5 = dybDieHTML(5, 'snake', -1);
check('SAFETY RULE — opt-out + uncovered face → frame draws anyway',
  [imgUrl(snake5), hasClass(snake5, 'dyb-die-framed'), hasClass(snake5, 'dyb-die-snake')],
  ['data/packs/testskin/img/5.svg', true, true]);

const slick5 = dybDieHTML(9, 'slick', 5, 0, true);
check('assigned slick resolves on the ASSIGNED face, not the roll',
  imgUrl(slick5), 'data/packs/testskin/img/k5.svg');

const phantomRevealed = dybDieHTML(1, 'phantom', -1, -1);
check('revealed pure phantom falls back to the standard face, framed',
  [imgUrl(phantomRevealed), hasClass(phantomRevealed, 'dyb-die-framed')],
  ['data/packs/testskin/img/1.svg', true]);

section('Seam — standard faces and the cup back are unchanged');
check('standard 4 still edge-to-edge, never framed',
  [hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die-asset'),
   hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die-framed')],
  [true, false]);
check('cup back still edge-to-edge',
  [imgUrl(sandbox.dybDieBackHTML()), hasClass(sandbox.dybDieBackHTML(), 'dyb-die-asset')],
  ['data/packs/testskin/img/back.svg', true]);

section('Seam — a pack with no art at all still renders pips');
noArt();
check('loaded 3 with no tiers → pips, amber, no image',
  [imgUrl(dybDieHTML(3, 'loaded', -1)),
   dybDieHTML(3, 'loaded', -1).includes('bg-amber-700'),
   hasClass(dybDieHTML(3, 'loaded', -1), 'dyb-die-framed')],
  [null, true, false]);

section('Blank keys — faceless dice, and the leak guard');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const ghost = dybDieHTML(6, 'phantom', -1, 0);
check('concealed phantom uses the blank image, not the ? glyph',
  [imgUrl(ghost), glyphText(ghost)],
  ['data/packs/testskin/img/ghost.svg', null]);
check('concealed phantom art is framed and keeps its type class',
  [hasClass(ghost, 'dyb-die-framed'), hasClass(ghost, 'dyb-die-phantom')],
  [true, true]);
check('concealed phantom leaks no face: no pips, no digit',
  [ghost.includes('dyb-pip'), /[1-6]\.svg/.test(ghost)],
  [false, false]);

const ghostSpec = dybDieHTML(6, 'phantom', -1, -2);
check('spectator view is concealed the same way',
  [imgUrl(ghostSpec), glyphText(ghostSpec)],
  ['data/packs/testskin/img/ghost.svg', null]);

const crackedArt = dybDieHTML(5, 'cracked', -1);
check('cracked uses its blank image instead of the ✕ glyph',
  [imgUrl(crackedArt), glyphText(crackedArt)],
  ['data/packs/testskin/img/broken.svg', null]);

// ── THE LEAK GUARD ────────────────────────────────────────────────────────
// A pack that supplies phantom FACE art but no `blank` must fall back to the
// ? glyph — never to assetFace(val), which would render the concealed value.
// If anyone ever "simplifies" the two fallback chains in dybDieHTML into one,
// this is the check that fails.
const LEAKY = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  specials: { phantom: { '6': 'ph6.svg' }, cracked: { '5': 'cr5.svg' } },
};
setSkin(LEAKY);
const noLeak = dybDieHTML(6, 'phantom', -1, 0);
check('LEAK GUARD — phantom face art but no blank → ? glyph, no image',
  [glyphText(noLeak), imgUrl(noLeak)], ['?', null]);
check('LEAK GUARD — the concealed value 6 appears nowhere in the markup',
  /6/.test(noLeak.replace(/dyb-die-\d+/g, '')), false);
check('LEAK GUARD — cracked with no blank → ✕ glyph, no image',
  [glyphText(dybDieHTML(5, 'cracked', -1)), imgUrl(dybDieHTML(5, 'cracked', -1))],
  ['✕', null]);

section('Unassigned slick is never skinnable');
setSkin(FACES_PLUS_SPECIALS);
const unassigned = dybDieHTML(9, 'slick', 4, 0, false);
check('unassigned slick keeps its live "4*" glyph and takes no art',
  [glyphText(unassigned), imgUrl(unassigned), hasClass(unassigned, 'cursor-pointer')],
  ['4*', null, true]);

section('Compound phantom — secondary art, phantom keeps its ring');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const pLoaded = dybDieHTML(3, 'phantom', -1, -1, true, 'loaded');
check('phantom+loaded resolves the LOADED art',
  imgUrl(pLoaded), 'data/packs/testskin/img/l3.svg');
check('phantom+loaded keeps the ring and the loaded chrome',
  [hasClass(pLoaded, 'dyb-die-phantom-ring'), hasClass(pLoaded, 'dyb-die-loaded'),
   hasClass(pLoaded, 'dyb-die-framed')],
  [true, true, true]);

const pSlick = dybDieHTML(9, 'phantom', 5, -1, true, 'slick');
check('phantom+slick resolves on the ASSIGNED face, not the roll',
  imgUrl(pSlick), 'data/packs/testskin/img/k5.svg');
check('phantom+slick keeps the ring', hasClass(pSlick, 'dyb-die-phantom-ring'), true);

const pCracked = dybDieHTML(4, 'phantom', -1, -1, true, 'cracked');
check('phantom+cracked resolves the cracked blank image, no face leaked',
  [imgUrl(pCracked), pCracked.includes('4.svg')],
  ['data/packs/testskin/img/broken.svg', false]);
check('phantom+cracked keeps the ring', hasClass(pCracked, 'dyb-die-phantom-ring'), true);

// snake opted out of its frame in FACES_PLUS_SPECIALS — the ring must survive it.
const pSnake = dybDieHTML(2, 'phantom', -1, -1, true, 'snake');
check('phantom+snake resolves the SNAKE art', imgUrl(pSnake), 'data/packs/testskin/img/s2.svg');
check('RING SURVIVES OPT-OUT — secondary frame:false does not suppress phantom\'s ring',
  [hasClass(pSnake, 'dyb-die-phantom-ring'), hasClass(pSnake, 'dyb-die-framed'),
   hasClass(pSnake, 'dyb-die-snake')],
  [true, false, false]);

section('Compound phantom — no art pack, chrome unchanged');
noArt();
const bareSnake = dybDieHTML(2, 'phantom', -1, -1, true, 'snake');
check('phantom+snake with no art → snake chrome, ring, diamond pips',
  [hasClass(bareSnake, 'dyb-die-snake'), hasClass(bareSnake, 'dyb-die-phantom-ring'),
   bareSnake.includes('dyb-pip-snake')],
  [true, true, true]);
const bareCracked = dybDieHTML(4, 'phantom', -1, -1, true, 'cracked');
check('phantom+cracked with no art → ✕ glyph plus the ring',
  [glyphText(bareCracked), hasClass(bareCracked, 'dyb-die-phantom-ring')],
  ['✕', true]);

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

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
