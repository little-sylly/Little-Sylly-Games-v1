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

section('lib');
const PrmLib = require(path.join(ROOT, 'wip/premium/prm-lib.js'));
const lib = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals });
ok(lib.THREE === THREE, 'lib carries the injected THREE');
{
  const g = lib.moulded(0.6, 0.4, 0.3, 0.05);
  g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  near(s.x, 0.6, 0.002, 'moulded width'); near(s.y, 0.4, 0.002, 'moulded height'); near(s.z, 0.3, 0.002, 'moulded depth');
  const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
  near(c.length(), 0, 0.002, 'moulded geometry is centred');
  ok(!!g.attributes.normal, 'moulded geometry has normals');
}
{
  const g = lib.extrude(lib.roundedRect(0.2, 0.2, 0.02), 0.1, 0.01, { center: false });
  g.computeBoundingBox();
  near(g.boundingBox.min.z, -0.01, 0.002, 'extrude with center:false keeps the shape origin (bevel below z=0)');
}
['wood', 'wallpaper', 'weave', 'boucle', 'quilt'].forEach(k => {
  const t = lib.tex[k](); ok(t && t.isTexture && t.wrapS === THREE.RepeatWrapping, `tex.${k} returns a repeating texture`);
});
ok(lib.tex.label('Hello').isTexture, 'tex.label returns a texture');
ok(lib.tex.abstract(3).isTexture, 'tex.abstract returns a texture');
['birch', 'birchDark', 'floor', 'wall', 'rug', 'fabric', 'cream', 'skirting', 'plum', 'black', 'chrome', 'brass', 'curtain', 'window', 'shade', 'yellow', 'yellowDark', 'paper', 'sleeve']
  .forEach(k => ok(lib.mats[k] && lib.mats[k].isMaterial, `mats.${k} exists`));
ok(lib.mats.emissive('#ff0000', 2).emissiveIntensity === 2, 'mats.emissive takes an intensity');
{
  const m = lib.role('ears', '#112233'); eq(m.userData.prmRole, 'ears', 'role() tags the material');
  eq(m.color.getHexString(), '112233', 'role() sets the colour');
  const root = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.role('shell', '#000000'));
  const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.role('ears', '#000000'));
  const c = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.mats.cream);
  root.add(a, b, c);
  const n = PrmLib.prmApplyDesign(root, { shell: '#aaaaaa', plate: '#bbbbbb', ears: '#cccccc', buttons: '#dddddd' });
  eq(n, 2, 'applyDesign repaints exactly the role-tagged meshes');
  eq(a.material.color.getHexString(), 'aaaaaa', 'shell follows design.shell');
  eq(b.material.color.getHexString(), 'cccccc', 'ears follow design.ears');
  eq(c.material.color.getHexString(), lib.mats.cream.color.getHexString(), 'untagged material untouched');
  const before = c.material.color.getHex();
  PrmLib.prmApplyDesign(root, { shell: '#aaaaaa', plate: '#bbbbbb', ears: '#123456', buttons: '#dddddd' });
  eq(b.material.color.getHexString(), '123456', 'changing one role changes that role');
  eq(a.material.color.getHexString(), 'aaaaaa', 'and no other role');
  eq(c.material.color.getHex(), before, 'and nothing untagged');
}

section('room');
const PrmRoom = require(path.join(ROOT, 'wip/premium/prm-room.js'));
const room = PrmRoom.prmBuildRoom(lib);
eq(room.name, 'room', 'room group is named');
const roomNames = new Set(); room.traverse(o => { if (o.name) roomNames.add(o.name); });
['wallBack', 'wallLeft', 'skirtingBack', 'skirtingLeft', 'cornice', 'floor', 'rug', 'tableTop', 'tableLeg0', 'tableLeg3',
 'bench', 'benchDrawerL', 'benchDrawerR', 'benchKnobL', 'benchKnobR', 'deck', 'deckKey3', 'shelfBack', 'shelfSideL', 'shelfSideR',
 'shelfBoard0', 'shelfBoard1', 'shelfBoard2', 'sideTableTop', 'sideTableLeg2', 'couchArm', 'window', 'curtain',
 'floorLampBase', 'floorLampStem', 'floorLampShade', 'printA', 'printAFace', 'printB', 'printBFace']
  .forEach(n => ok(roomNames.has(n), `room has ${n}`));
{
  let picks = 0; room.traverse(o => { if (o.userData.prmId) picks++; });
  eq(picks, 0, 'nothing in the room shell is a pick target');
  const rug = room.getObjectByName('rug'); ok(rug.receiveShadow, 'rug receives shadow');
  const floor = room.getObjectByName('floor'); ok(floor.receiveShadow, 'floor receives shadow');
  const R = room.userData.prmRoom;
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'armTopY', 'sideTableTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
  const S = room.userData.prmShelf; eq(S.ys.length, 3, 'three shelf boards');
  room.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(room.getObjectByName('tableTop'));
  near(bb.max.y, R.tableTopY, 0.001, 'tableTop surface equals prmRoom.tableTopY');
  const arm = new THREE.Box3().setFromObject(room.getObjectByName('couchArm'));
  near(arm.max.y, R.armTopY, 0.002, 'couchArm top equals prmRoom.armTopY');
  const cur = room.getObjectByName('curtain'); const cb = new THREE.Box3().setFromObject(cur);
  ok(cb.max.y - cb.min.y > 2.0, 'curtain is tall (extruded vertically, not lying flat)');
}

section('props-core');
const PrmProps = require(path.join(ROOT, 'wip/premium/prm-props.js'));
ok(PrmProps.PRM_ACTIONS && typeof PrmProps.PRM_ACTIONS === 'object', 'PRM_ACTIONS exists');
ok(Array.isArray(PrmProps.PRM_TAB_ORDER) && PrmProps.PRM_TAB_ORDER[0] === 'tv-screen', 'PRM_TAB_ORDER starts at the TV');
{
  const m = PrmProps.prmMotion(); const seen = [];
  m.add(0, 10, 100, PrmProps.prmEaseOutCubic, v => seen.push(v), () => seen.push('done'));
  ok(m.tick(1000) === true, 'motion active on first tick'); ok(m.tick(1050) === true, 'still active mid-way');
  ok(m.tick(1100) === false, 'finished at ms'); eq(seen[seen.length - 1], 'done', 'onDone fires once at the end');
  near(seen[seen.length - 2], 10, 1e-9, 'final value is the target');
  near(PrmProps.prmEaseOutCubic(0), 0, 1e-9, 'easeOutCubic(0)'); near(PrmProps.prmEaseOutCubic(1), 1, 1e-9, 'easeOutCubic(1)');
  near(PrmProps.prmEaseOutBack(1), 1, 1e-9, 'easeOutBack(1)'); ok(PrmProps.prmEaseOutBack(0.7) > 1, 'easeOutBack overshoots');
}
{
  const at = PrmProps.prmAttract(makeCanvas, GAMES);
  at.draw(0); at.draw(3.5); eq(at.frames(), 2, 'attract counts frames'); ok(at.canvas.width === 512, 'attract canvas is 512 wide');
}
{
  const ctx = { lib, design: { shell: '#111111', plate: '#222222', ears: '#333333', buttons: '#444444' }, games: GAMES,
    stickers: { base: 'data/stickers/', list: GAMES.map(g => ({ id: g.id, image: g.id + '.png', unlocked: true })) },
    lampPanels: { base: 'lamp images/', manifest: require(path.join(ROOT, 'wip/premium/lamp images/manifest.json')) },
    ControllerBody: CB, attractTexture: null, roomData: room.userData };
  const built = PrmProps.prmBuildAll(ctx);
  ok(built && typeof built === 'object', 'prmBuildAll returns an object (empty until builders register)');
  global.__prmCtx = ctx;   // later sections reuse it
}

section('scene-pure');
const PrmScene = require(path.join(ROOT, 'wip/premium/prm-scene.js'));
{
  const good = { games: GAMES, stickers: { base: '', list: [] }, design: {}, lampPanels: { base: '', manifest: { panels: [] } }, music: { keys: [], nowPlaying: () => null, playFor: () => {} },
    enterTV() {}, enterShelves() {}, openWorkshop() {}, openSound() {}, openSwitcher() {} };
  ok(PrmScene.prmValidateHost(good) === true, 'a complete host validates');
  ok(PrmScene.prmValidateHost(Object.assign({}, good, { openStickerbook() {} })) === true, 'openStickerbook is accepted when given');
  let threw = false; try { PrmScene.prmValidateHost(Object.assign({}, good, { enterTV: undefined })); } catch (e) { threw = /enterTV/.test(e.message); }
  ok(threw, 'a missing required callback throws naming it');
  threw = false; try { PrmScene.prmValidateHost(Object.assign({}, good, { openStickerbook: 'nope' })); } catch (e) { threw = true; }
  ok(threw, 'a non-function openStickerbook throws');
  ok(PrmScene.prmEligible(1280, 720, true), 'eligible at 1280x720 with WebGL');
  ok(!PrmScene.prmEligible(390, 844, true), 'a portrait phone is not eligible');
  ok(!PrmScene.prmEligible(1280, 720, false), 'no WebGL is not eligible');
  ok(PrmScene.PRM_PRESETS.wide && PrmScene.PRM_PRESETS.portrait, 'both camera presets exist');
}

// Later tasks append their sections above this line.
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
