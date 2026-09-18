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
 'shelfBoard0', 'shelfBoard1', 'shelfBoard2', 'sideTableTop', 'sideTableLeg2', 'couchArm', 'seat', 'window', 'curtain',
 'floorLampBase', 'floorLampStem', 'floorLampShade', 'printA', 'printAFace', 'printB', 'printBFace']
  .forEach(n => ok(roomNames.has(n), `room has ${n}`));
{
  let picks = 0; room.traverse(o => { if (o.userData.prmId) picks++; });
  eq(picks, 0, 'nothing in the room shell is a pick target');
  const rug = room.getObjectByName('rug'); ok(rug.receiveShadow, 'rug receives shadow');
  const floor = room.getObjectByName('floor'); ok(floor.receiveShadow, 'floor receives shadow');
  const R = room.userData.prmRoom;
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'tableX', 'tableZ', 'armTopY', 'seatTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
  // the re-block (spec 2026-09-19 § 3.1): a corner, not a hall
  ok(R.backZ > -1.8 && R.backZ < -1.3, `back wall is close (backZ ${R.backZ})`);
  ok(R.leftX > -1.9 && R.leftX < -1.3, `left wall is close (leftX ${R.leftX})`);
  ok(R.benchZ - R.tableZ > -1.3 && R.benchZ - R.tableZ < -0.7, `bench sits about a metre behind the table (${(R.tableZ - R.benchZ).toFixed(2)} m)`);
  ok(R.tableX > 0.2, `table is right of centre (tableX ${R.tableX})`);
  ok(R.seatTopY > R.tableTopY && R.seatTopY < R.armTopY, 'seat cushion sits between table top and arm top');
  const S = room.userData.prmShelf; eq(S.ys.length, 3, 'three shelf boards');
  room.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(room.getObjectByName('tableTop'));
  near(bb.max.y, R.tableTopY, 0.001, 'tableTop surface equals prmRoom.tableTopY');
  const arm = new THREE.Box3().setFromObject(room.getObjectByName('couchArm'));
  near(arm.max.y, R.armTopY, 0.002, 'couchArm top equals prmRoom.armTopY');
  const seat = new THREE.Box3().setFromObject(room.getObjectByName('seat'));
  near(seat.max.y, R.seatTopY, 0.002, 'seat top equals prmRoom.seatTopY');
  ok(seat.min.z > R.tableZ + 0.31 - 0.02, 'seat front does not run under the table');
  ok(arm.min.z < seat.min.z, 'the arm reaches ahead of the seat (a real couch arm)');
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

section('controller');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx);
  ok(built.controller, 'controller builds');
  eq(built.controller.userData.prmId, 'controller', 'controller group is the pick node');
  const roles = new Set(); built.controller.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roles.add(o.material.userData.prmRole); });
  ['shell', 'ears', 'buttons'].forEach(r => ok(roles.has(r), `controller carries a ${r} material`));
  const shellM = built.controller.getObjectByName('body').material;
  eq(shellM.color.getHexString(), '111111', 'shell takes design.shell');
  built.controller.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(built.controller); const s = new THREE.Vector3(); bb.getSize(s);
  ok(s.x > 0.12 && s.x < 0.22, `controller is hand-sized in metres (x ${s.x.toFixed(3)})`);
  near(bb.min.y, 0, 0.02, 'controller rests on its group origin (base at y≈0)');
}

section('tv');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx); const tv = built.tv; ok(tv, 'tv builds');
  const ids = {}; tv.traverse(o => { if (o.userData.prmId) ids[o.userData.prmId] = o; });
  ['tv-screen', 'tv-channel', 'tv-volume'].forEach(id => ok(ids[id], `tv has pick node ${id}`));
  ok(ids['tv-screen'].isMesh && ids['tv-screen'].geometry.type === 'SphereGeometry', 'the screen is a sphere section (curved glass)');
  ok(tv.getObjectByName('earL') && tv.getObjectByName('earR'), 'tv has two ears');
  const roles = {}; tv.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roles[o.material.userData.prmRole] = (roles[o.material.userData.prmRole] || 0) + 1; });
  ['shell', 'plate', 'ears', 'buttons'].forEach(r => ok(roles[r] > 0, `tv carries ${r}`));
  eq(tv.getObjectByName('earL').material.color.getHexString(), '333333', 'ears take design.ears');
  tv.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(tv);
  near(bb.min.y, 0, 0.005, 'tv rests on its origin'); ok(bb.max.y > 0.6 && bb.max.y < 0.9, `tv with ears is ${bb.max.y.toFixed(2)} tall`);
  ok(bb.max.x - bb.min.x < 0.75, 'tv fits its bench slot');
  // the screen faces +z: its centre is in front of the body's front face
  const sc = new THREE.Vector3(); ids['tv-screen'].getWorldPosition(sc);
  const body = new THREE.Box3().setFromObject(tv.getObjectByName('body'));
  ok(sc.z < body.max.z, 'screen sphere centre sits behind the front face (the slice bulges forward)');
  /* A viewer sitting in front of the telly must actually SEE the glass. The
     bezel shipped as a solid slab in the screen's own depth range and hid it
     completely — invisible to every name/role check, so this raycast is the
     one that holds the contract. */
  {
    const ray = new THREE.Raycaster();
    const target = new THREE.Vector3(); ids['tv-screen'].getWorldPosition(target);
    const glass = new THREE.Box3().setFromObject(ids['tv-screen']).getCenter(new THREE.Vector3());
    const eye = glass.clone().add(new THREE.Vector3(0, 0.02, 1.2));
    ray.set(eye, glass.clone().sub(eye).normalize());
    const meshes = []; tv.traverse(o => { if (o.isMesh) meshes.push(o); });
    const hit = ray.intersectObjects(meshes, false).filter(h => h.object.name !== 'screenGlow')[0];
    ok(hit && hit.object.name === 'screen', `looking at the telly you see the screen first (got ${hit ? hit.object.name : 'nothing'})`);
  }
}

section('jukebox-phone-binder');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx);
  ok(built.jukebox && built.phone && built.binder, 'jukebox, phone and binder build');
  const ids = {}; built.jukebox.traverse(o => { if (o.userData.prmId) ids[o.userData.prmId] = o; });
  ok(ids['jukebox-knob'] && ids['jukebox-record'], 'jukebox has knob + record pick nodes');
  ok(built.jukebox.getObjectByName('earL') && built.jukebox.getObjectByName('earR'), 'jukebox has ears');
  ok(built.jukebox.getObjectByName('earL').scale.y < built.jukebox.getObjectByName('earL').scale.x, 'jukebox ears are shorter and rounder than tall (distinct from the TV)');
  const jb = built.jukebox.userData.api; jb.setLabel('Hello'); jb.setPlaying(true);
  const q0 = ids['jukebox-record'].quaternion.clone(); ok(jb.tick(100, 0.1, false) === true, 'record turns while playing');
  ok(!ids['jukebox-record'].quaternion.equals(q0), 'record orientation changed'); ok(jb.tick(200, 0.1, true) === false, 'record still under reduced motion');
  jb.setPlaying(false); ok(jb.tick(300, 0.1, false) === false, 'record still when nothing plays');
  eq(built.phone.userData.prmId, 'phone', 'phone group is the pick node');
  const keys = []; built.phone.traverse(o => { if (/^key\d\d$/.test(o.name)) keys.push(o); }); eq(keys.length, 12, 'phone has a 3x4 keypad');
  ok(keys[0].material.userData.prmRole === 'buttons', 'keypad takes the buttons role');
  const b = built.binder, api = b.userData.api; eq(b.userData.prmId, 'binder', 'binder group is the pick node');
  const stickers = []; b.traverse(o => { if (o.isMesh && o.material.userData.prmImage) stickers.push(o); }); eq(stickers.length, 20, 'binder shows all 20 stickers');
  ok(b.getObjectByName('cover').material === lib.mats.yellow, 'cover is the fixed soft yellow (never the design)');
  let roleCount = 0; b.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roleCount++; }); eq(roleCount, 0, 'nothing on the binder follows the design');
  ok(!api.isOpen(), 'binder starts closed'); api.openCover(true); ok(api.isOpen(), 'openCover(instant) opens');
  ok(Math.abs(b.getObjectByName('hinge').rotation.z) > 2.5, 'cover flops back past 145°'); api.openCover(true); ok(!api.isOpen(), 'second call closes');
  eq(PrmProps.PRM_ACTIONS.binder.fallback, 'openCover', 'binder falls back to openCover when no openStickerbook is given');
  ok(typeof api[PrmProps.PRM_ACTIONS.binder.fallback] === 'function', 'the fallback names a real api method');
}

section('lamp-shelf');
{
  const man = global.__prmCtx.lampPanels.manifest;
  const slots = PrmProps.prmLampSlots(man); eq(slots.length, man.panels.length * man.rows, 'slots = panels × rows');
  eq(slots[0].id, 'laughing', 'slot 0 is the first panel'); eq(slots[8].id, 'frustrated', 'slot 8 is the ninth panel');
  const two = PrmProps.prmLampSlots(Object.assign({}, man, { rows: 2 })); eq(two.length, 18, 'two rows double the slots'); eq(two[9].id, 'laughing', 'the second row repeats from the start');
  const built = PrmProps.prmBuildAll(global.__prmCtx); const lamp = built.lamp; ok(lamp, 'lamp builds'); eq(lamp.userData.prmId, 'lamp', 'lamp group is the pick node');
  const films = []; lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) films.push(o.material.userData.prmImage); });
  eq(films.length, 9, 'nine film materials tagged with images');
  ok(films.every(u => u.startsWith(global.__prmCtx.lampPanels.base)), 'every film url comes from the lamp base');
  ok(films.every(u => man.panels.some(p => u.endsWith(p.image))), 'no film url outside the manifest');
  lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) ok(o.material.userData.prmEmissiveMap === true, 'portraits are lit from inside (emissiveMap flag)'); });
  const spin = lamp.getObjectByName('spinGroup'); const r0 = spin.rotation.y; const api = lamp.userData.api;
  ok(api.tick(100, 0.1, false) === true, 'lamp idles (active)'); ok(spin.rotation.y > r0, 'idle rotation advances');
  const r1 = spin.rotation.y; api.tick(200, 0.1, true); eq(spin.rotation.y, r1, 'no rotation under reduced motion');
  api.flick(4); api.tick(300, 0.1, false); ok(spin.rotation.y - r1 > 0.2, 'a flick spins it hard');
  const shelf = built.shelfContents; ok(shelf, 'shelf contents build');
  let books = 0, trinkets = 0, picks = 0; shelf.traverse(o => { if (/^book\d+$/.test(o.name)) books++; if (/^trinket-/.test(o.name)) trinkets++; if (o.userData.prmId) picks++; });
  eq(books, 10, 'ten books'); eq(trinkets, 5, 'five unlocked trinkets'); eq(picks, 0, 'nothing on the shelf is interactive');
  const locked = PrmProps.prmBuildShelf(lib, PrmProps.PRM_TRINKETS_V1.map((t, i) => Object.assign({}, t, { unlocked: i !== 2 })), GAMES, room.userData.prmShelf);
  let t2 = 0; locked.traverse(o => { if (/^trinket-/.test(o.name)) t2++; }); eq(t2, 4, 'a locked trinket leaves its slot empty');
  const S = room.userData.prmShelf; shelf.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(shelf);
  ok(bb.min.x > S.x - S.w / 2 - 0.01 && bb.max.x < S.x + S.w / 2 + 0.01, 'shelf contents stay inside the shelf width');
}

section('contracts');
{
  const A = PrmProps.PRM_ACTIONS, built = PrmProps.prmBuildAll(global.__prmCtx);
  const ids = new Set(); Object.values(built).forEach(g => g.traverse(o => { if (o.userData.prmId) ids.add(o.userData.prmId); }));
  Object.keys(A).forEach(id => ok(ids.has(id), `action id "${id}" exists as a pick node`));
  ids.forEach(id => ok(A[id], `pick node "${id}" has an action`));
  const HOST = new Set(['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher', 'openStickerbook', 'music.next']);
  Object.entries(A).forEach(([id, a]) => ok(a.local || HOST.has(a.callback), `"${id}" names a host callback or a local api`));
  ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'].forEach(cb => ok(Object.values(A).some(a => a.callback === cb), `required callback ${cb} is reachable from a prop`));
  eq(Object.values(A).filter(a => a.optional).length, 1, 'exactly one optional action (the binder)');
  PrmProps.PRM_TAB_ORDER.forEach(id => ok(ids.has(id), `tab order id "${id}" exists`));
  // footprints: each prop, placed, sits inside its surface's region (spec § 14 check 1)
  const place = (id) => { const g = built[id], p = PrmProps.PRM_PLACES[id]; g.position.set(...p.pos); if (p.rot) g.rotation.set(...p.rot); g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
  const inside = (bb, r) => bb.min.x >= r.x[0] && bb.max.x <= r.x[1] && bb.min.z >= r.z[0] && bb.max.z <= r.z[1] && bb.min.y >= r.y[0] - 0.01;
  const R = room.userData.prmRoom;
  const REGIONS = {
    tv:        { x: [R.tableX - 1.30, R.tableX - 0.50], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    jukebox:   { x: [R.tableX - 0.30, R.tableX + 0.30], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    dial:      { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    binder:    { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    phone:     { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    controller:{ x: [-1.05, -0.35], z: [ 0.30,  1.10], y: [R.armTopY, 1.0] },
    lamp:      { x: [-1.95, -1.45], z: [-2.35, -1.85], y: [R.sideTableTopY, 1.0] },
  };
  Object.entries(REGIONS).forEach(([id, r]) => { const bb = place(id); ok(inside(bb, r), `${id} sits inside its surface region (x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)}, z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)}, y ${bb.min.y.toFixed(2)})`); });
  // table props must not overlap each other
  const boxes = ['dial', 'binder', 'phone'].map(id => [id, new THREE.Box3().setFromObject(built[id])]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) ok(!boxes[i][1].intersectsBox(boxes[j][1]), `${boxes[i][0]} and ${boxes[j][0]} do not overlap`);
  // design purity across the whole prop set (spec § 14 check 2)
  const root = new THREE.Group(); Object.values(built).forEach(g => root.add(g));
  const snap = () => { const m = new Map(); root.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(mat => m.set(mat, mat.color.getHex())); }); return m; };
  const d0 = Object.assign({}, global.__prmCtx.design), before = snap();
  PrmLib.prmApplyDesign(root, Object.assign({}, d0, { ears: '#abcdef' }));
  const after = snap(); let earsChanged = 0, othersChanged = 0;
  before.forEach((hex, mat) => { if (after.get(mat) !== hex) { if (mat.userData.prmRole === 'ears') earsChanged++; else othersChanged++; } });
  /* Counted per MATERIAL, not per mesh: each eared prop shares one ear
     material across its two ears, so the TV, the jukebox and the controller
     are three, not six. Assert every ear material present repaints, and that
     all three eared props are actually there. */
  const earMats = new Set(); root.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.userData.prmRole === 'ears') earMats.add(m); }); });
  ok(earMats.size >= 3, `three props carry ears — TV, jukebox, controller (${earMats.size} ear materials)`);
  eq(earsChanged, earMats.size, `changing design.ears repaints every ear material (${earsChanged} of ${earMats.size})`);
  eq(othersChanged, 0, 'and nothing else');
  const noRole = []; root.traverse(o => { if (o.isMesh && o.material.userData.prmRole && !['shell', 'plate', 'ears', 'buttons'].includes(o.material.userData.prmRole)) noRole.push(o.name); });
  eq(noRole.length, 0, 'every tagged role is one of the four');
}

section('dial');
global.__prmAsync = true;
{
  const TAU = Math.PI * 2, n = 20, slot = TAU / n;
  const p = PrmProps.prmSpinPlan(n, 0.3, 5);
  eq(p.targetIdx, 5, 'plan keeps the target'); eq(p.durationMs, 1800, 'plan is 1800 ms');
  ok(p.endRot > 0.3 + 3 * TAU, 'plan spins at least three full turns forward');
  const wrap = a => ((a % TAU) + TAU) % TAU;
  near(wrap(p.endRot), wrap(-5 * slot), 1e-9, 'end rotation puts cartridge 5 at the front');
  const p2 = PrmProps.prmSpinPlan(n, -5 * slot, 5); ok(p2.endRot > -5 * slot + 3 * TAU, 'already-at-target still spins forward a full turn, never zero');
  const built = PrmProps.prmBuildAll(global.__prmCtx); const dial = built.dial; ok(dial, 'dial builds');
  eq(dial.userData.prmId, 'dial', 'dial group is the pick node');
  const carts = []; dial.traverse(o => { if (o.userData.gameId) carts.push(o); });
  eq(carts.length, 20, 'dial holds exactly 20 cartridges');
  eq(new Set(carts.map(c => c.userData.gameId)).size, 20, 'one cartridge per game id');
  GAMES.forEach(g => ok(carts.some(c => c.userData.gameId === g.id), `cartridge for ${g.id}`));
  const urls = []; dial.traverse(o => { if (o.isMesh && o.material.userData.prmImage) urls.push(o.material.userData.prmImage); });
  eq(urls.length, 20, '20 label materials tagged with an image url');
  ok(urls.every(u => u.startsWith(global.__prmCtx.stickers.base)), 'every label url comes from the sticker base');
  const bodyOf = carts[3].getObjectByName('cartBody'); eq(bodyOf.material.color.getHexString(), GAMES[3].brandHex.slice(1).toLowerCase(), 'cartridge takes its game brand hex');
  const ring = dial.getObjectByName('ring'); eq(ring.material.userData.prmRole, 'buttons', 'ring glow is the buttons role'); ok(ring.material.userData.prmEmissive, 'ring emissive follows the design');
  const api = dial.userData.api; let calls = 0; const rand = () => { calls++; return 0.37; };   // → index 7
  let resolved = null; api.spin(rand, { instant: false }).then(id => resolved = id);
  ok(api.isSpinning(), 'spinning after spin()'); api.spin(rand); ok(calls === 1, 'a second spin() while running is a no-op (same promise)');
  let t = 1000; for (let i = 0; i <= 40; i++) api.tick(t += 50, 0.05, false);   // 2000 ms of ticks > 1800 ms tween
  // the resolution is a microtask; the rest of this section runs after it, then finish() prints the summary
  Promise.resolve().then(() => {
    api.tick(3060, 0.05, true); api.tick(3300, 0.05, true);   // let the 200 ms rise tween finish (tweens tick even under reduced motion)
    eq(resolved, GAMES[7].id, 'spin resolves to the rand-chosen game'); ok(!api.isSpinning(), 'not spinning after the tween ends');
    near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-7 * slot), 1e-6, 'spinner rests with cartridge 7 at the front');
    ok(carts[7].position.y > carts[6].position.y + 0.01, 'the chosen cartridge is risen');
    const r0 = dial.getObjectByName('spinner').rotation.y; api.tick(3350, 0.05, true); eq(dial.getObjectByName('spinner').rotation.y, r0, 'no drift under reduced motion');
    api.pauseDrift(0, 3350); api.tick(3400, 0.05, false); ok(dial.getObjectByName('spinner').rotation.y > r0, 'drift resumes when not reduced');
    let instant = null; api.spin(() => 0.12, { instant: true }).then(id => instant = id);   // → index 2
    ok(!api.isSpinning(), 'an instant spin is never "spinning"');
    Promise.resolve().then(() => { eq(instant, GAMES[2].id, 'instant spin resolves to the chosen game'); near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-2 * slot), 1e-9, 'instant spin puts the cartridge at the front'); finish(); });
  });
}

// Later tasks append their sections above this line.
function finish() { console.log(`
${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
if (!global.__prmAsync) finish();
