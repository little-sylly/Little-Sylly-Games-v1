// verify-prm-props.js — the pure tier of the Premium lounge (wip/premium/prm-*.js).
// Drives every builder under Node with the vendored Three and a stub canvas, so a
// geometry or contract slip is caught before a pixel exists. Sections are added
// task by task. Run: node wip/premium/verify-prm-props.js   (exits 1 on any failure)
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} — got ${a}, want ${b} ±${tol}`);

// A 2D context that accepts every call and returns itself, so texture code runs
// under Node without drawing. Anything that READS a context value (measureText,
// getImageData) is deliberately unsupported — builders must not depend on one.
const ctxProxy = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? undefined : ctxProxy),
  set: () => true,
  apply: () => ctxProxy,
});
const makeCanvas = (w, h) => ({ width: w, height: h, getContext: () => ctxProxy });

global.window = global;
const THREE = require(path.join(ROOT, 'js/lib/three.min.js'));
require(path.join(ROOT, 'js/lib/controller-body.js'));
const CB = global.window.ControllerBody;
const { GAMES } = require(path.join(ROOT, 'wip/lobby-lab/games.js'));

// The purity trap, armed AFTER the vendored Three has loaded (it may probe
// `document` at load time; the prm-* modules must never): any builder touching
// the DOM throws here.
const forbid = (name) => { Object.defineProperty(global, name, { get() { throw new Error('builder touched ' + name); }, configurable: true }); };
forbid('document'); forbid('localStorage');

section('load');
ok(THREE.REVISION === '128', 'Three r128 loads under Node');
ok(typeof CB.buildEars === 'function', 'ControllerBody present');
eq(GAMES.length, 20, 'games.js holds 20 games');

// Later tasks append their sections above this line.
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
