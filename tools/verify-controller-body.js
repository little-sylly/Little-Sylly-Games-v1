// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-body.js — proves the vendored Three and the de-duplicated
// geometry module both load and produce the geometry the atlas painter assumes.
//
//   node tools/verify-controller-body.js        (exits 1 on any failure)
//
// This is a LOAD and CONTRACT check, not a rendering check. It exists because
// js/controller.js reads geo.userData fields by name — minx/maxx/miny/maxy for
// the atlas map, poly for the faceplate outline — and a silently-renamed field
// would surface as a controller painted with its faceplate in the wrong place,
// which no other check in this project would catch.
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
}

global.window = global;
const THREE = require(path.join(ROOT, 'js/lib/three.min.js'));
require(path.join(ROOT, 'js/lib/controller-body.js'));
const CB = global.window.ControllerBody;

console.log('── Three.js vendored build ──');
ok(!!THREE, 'THREE loads under Node');
ok(THREE.REVISION === '128', 'revision is r128, got ' + THREE.REVISION);

console.log('── ControllerBody namespace ──');
['buildBody', 'buildControls', 'buildEars', 'buildShoulder', 'smoothNormals']
  .forEach(fn => ok(typeof CB[fn] === 'function', 'ControllerBody.' + fn + ' is a function'));

console.log('── Geometry contract ──');
const t0 = Date.now();
const geo = CB.buildBody(THREE, {});
const buildMs = Date.now() - t0;
console.log('  buildBody took ' + buildMs + ' ms under Node');

ok(!!geo && !!geo.attributes && !!geo.attributes.position, 'buildBody returns a geometry with positions');
const U = geo.userData;
['minx', 'maxx', 'miny', 'maxy', 'poly', 'RIM', 'FRONT_H', 'BACK_H', 'roll']
  .forEach(k => ok(U[k] !== undefined, 'geo.userData.' + k + ' is present'));
ok(U.maxx > U.minx && U.maxy > U.miny, 'the body bounding box is non-degenerate');
ok(Array.isArray(U.poly) && U.poly.length > 32,
   'geo.userData.poly is a polyline of real length, got ' + (U.poly && U.poly.length));
ok(U.poly.every(p => typeof p.x === 'number' && typeof p.y === 'number'),
   'every poly point is {x, y}');

console.log('── Controls contract ──');
const controls = CB.buildControls(THREE, geo);
ok(!!controls && !!controls.group, 'buildControls returns a group');
ok(Array.isArray(controls.pressables) && controls.pressables.length > 0,
   'buildControls returns a non-empty pressables list');

// The Konami adapter in js/controller.js switches on these exact mesh names.
// Renaming one in body.js would silently stop the code from being enterable.
const names = [];
controls.group.traverse(o => { if (o.name) names.push(o.name); });
['D-pad', 'Face A', 'Face B', 'Start', 'Select']
  .forEach(n => ok(names.indexOf(n) >= 0, 'a mesh named "' + n + '" exists'));

const dpad = [];
controls.group.traverse(o => { if (o.name === 'D-pad') dpad.push(o); });
ok(dpad.length === 1 && dpad[0].userData.rocker === true,
   'the D-pad is flagged userData.rocker (the four cardinals depend on it)');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
