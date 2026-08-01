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
load('js/games/dyb.js');

for (const fn of ['assetFace', 'dybDieHTML']) {
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

const FACES = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  back: 'back.svg',
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
// NOTE: these calls use the CURRENT 7-parameter signature
//   dybDieHTML(val, type, slickFace, visible, dieIdx, isSlickAssigned, phantomSecondary)
// Task 3 drops the dead `visible` parameter and updates every call below.

section('Characterisation — no art pack loaded');
noArt();
check('standard 4 → pip grid, no image',
  [hasClass(dybDieHTML(4, 'standard', -1, true), 'dyb-die'), imgUrl(dybDieHTML(4, 'standard', -1, true))],
  [true, null]);
check('standard 4 → 4 pips',
  (dybDieHTML(4, 'standard', -1, true).match(/dyb-pip/g) || []).length, 4);
check('loaded 3 → amber glow class + amber pips',
  [hasClass(dybDieHTML(3, 'loaded', -1, true), 'dyb-die-loaded'),
   dybDieHTML(3, 'loaded', -1, true).includes('bg-amber-700')],
  [true, true]);
check('snake 2 → snake classes',
  [hasClass(dybDieHTML(2, 'snake', -1, true), 'dyb-die-snake'),
   dybDieHTML(2, 'snake', -1, true).includes('dyb-pip-snake')],
  [true, true]);
check('cracked → ✕ glyph', glyphText(dybDieHTML(5, 'cracked', -1, true)), '✕');
check('phantom in hand → ? glyph (real face never rendered)',
  [glyphText(dybDieHTML(6, 'phantom', -1, true, 0)),
   dybDieHTML(6, 'phantom', -1, true, 0).includes('dyb-pip')],
  ['?', false]);
check('phantom spectator (dieIdx -2) → ? glyph',
  glyphText(dybDieHTML(6, 'phantom', -1, true, -2)), '?');
check('phantom revealed pure → indigo pips, no glyph',
  [glyphText(dybDieHTML(6, 'phantom', -1, true, -1)),
   dybDieHTML(6, 'phantom', -1, true, -1).includes('bg-indigo-400')],
  [null, true]);
check('phantom + loaded compound → both loaded class and ring',
  [hasClass(dybDieHTML(3, 'phantom', -1, true, -1, true, 'loaded'), 'dyb-die-loaded'),
   hasClass(dybDieHTML(3, 'phantom', -1, true, -1, true, 'loaded'), 'dyb-die-phantom-ring')],
  [true, true]);
check('slick unassigned → "4*" glyph + cursor-pointer',
  [glyphText(dybDieHTML(9, 'slick', 4, true, 0, false)),
   hasClass(dybDieHTML(9, 'slick', 4, true, 0, false), 'cursor-pointer')],
  ['4*', true]);
check('slick assigned → pips at the ASSIGNED face, not the roll',
  (dybDieHTML(9, 'slick', 2, true, 0, true).match(/dyb-pip/g) || []).length, 2);

section('Characterisation — skin with faces only (the shipped seam)');
setSkin(FACES);
check('standard 4 → skin image, edge-to-edge asset class',
  [imgUrl(dybDieHTML(4, 'standard', -1, true)),
   hasClass(dybDieHTML(4, 'standard', -1, true), 'dyb-die-asset')],
  ['data/packs/testskin/img/4.svg', true]);
check('loaded 3 → still pips today (this is what the plan changes)',
  imgUrl(dybDieHTML(3, 'loaded', -1, true)), null);
check('cup back → skin back image',
  imgUrl(sandbox.dybDieBackHTML()), 'data/packs/testskin/img/back.svg');

section('Characterisation — id attribute and replace-prefix contracts');
check('dieIdx >= 0 emits an id attribute',
  dybDieHTML(4, 'standard', -1, true, 2).startsWith('<div id="dyb-die-2" class="dyb-die '), true);
check('dieIdx -1 emits the bare prefix dyb.js:1025 string-replaces on',
  dybDieHTML(4, 'standard', -1, true, -1).startsWith('<div class="dyb-die '), true);
check('dybDieHTMLSm injects the sm class via that same prefix',
  hasClass(sandbox.dybDieHTMLSm(4), 'dyb-die-sm'), true);

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
