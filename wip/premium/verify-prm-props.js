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
['wood', 'wallpaper', 'weave', 'boucle', 'quilt', 'plasticBump'].forEach(k => {
  const t = lib.tex[k](); ok(t && t.isTexture && t.wrapS === THREE.RepeatWrapping, `tex.${k} returns a repeating texture`);
});
['braid', 'braidBump'].forEach(k => ok(lib.tex[k]().isTexture, `tex.${k} returns a texture`));
/* Round 2's three new canvas helpers. The dial is their only caller today, so
   these are the checks that they stay drivable under the no-readback context. */
['motifBump'].forEach(k => {
  const t = lib.tex[k]();
  ok(t && t.isTexture && t.wrapS === THREE.RepeatWrapping, `tex.${k} returns a repeating texture`);
});
ok(lib.tex.spectrum(['#ff0000', '#00ff00']).isTexture, 'tex.spectrum returns a texture');
ok(lib.tex.spectrum([]).isTexture, 'tex.spectrum survives an empty colour list');
ok(lib.tex.textBump(['Little', 'Sylly']).isTexture, 'tex.textBump returns a texture');
ok(lib.tex.textBump(null).isTexture, 'tex.textBump survives a null caption');
{
  /* uvFit: a flat geometry's UVs come out of ExtrudeGeometry and ShapeGeometry
     in METRES, so a decal lands in one texel of the face unless they are
     refitted. Driven on a real shape, not a plane -- a plane already has 0..1. */
  const geo = lib.uvFit(new THREE.ShapeGeometry(lib.roundedRect(0.05, 0.03, 0.005), 8));
  const uv = geo.attributes.uv; let lo = 9, hi = -9;
  for (let i = 0; i < uv.count; i++) { lo = Math.min(lo, uv.getX(i), uv.getY(i)); hi = Math.max(hi, uv.getX(i), uv.getY(i)); }
  near(lo, 0, 1e-6, 'uvFit puts the face at u,v = 0'); near(hi, 1, 1e-6, 'and stretches it to 1');
  const bare = new THREE.BufferGeometry(); eq(lib.uvFit(bare), bare, 'uvFit is a no-op on a geometry with no uvs');
}
{
  /* A dead-straight vertical curve, so every claim below is about the SECTION
     and not about the bend. The scoop is the reason this helper exists at all —
     a circular tube (the old droopEar) read as a sausage on a stick. */
  const e = lib.bunnyEar([[0, 0, 0], [0, 0.10, 0], [0, 0.20, 0], [0, 0.30, 0]], { width: 0.058, thick: 0.070, scoop: 1.30 });
  ok(e.outer && e.outer.isBufferGeometry && e.inner && e.inner.isBufferGeometry, 'bunnyEar returns outer + inner geometries');
  ok(!!e.outer.attributes.normal && !!e.outer.attributes.uv, 'the swept ear carries normals and UVs (it can take a bump map)');
  const nrm = e.outer.attributes.normal.array;
  ok(!Array.prototype.some.call(nrm, v => Number.isNaN(v)), 'no NaN normals — the tip closes on a pole, not a degenerate ring');
  e.outer.computeBoundingBox(); const bb = e.outer.boundingBox;
  ok(Math.abs(bb.min.z) > bb.max.z * 2.5,
     `the ear's front is SCOOPED, not domed — back ${Math.abs(bb.min.z).toFixed(3)} vs front ${bb.max.z.toFixed(3)}`);
  const sz = new THREE.Vector3(); bb.getSize(sz);
  ok(sz.x > sz.z, `and it is broader across than through (x ${sz.x.toFixed(3)} vs z ${sz.z.toFixed(3)})`);
  near(e.tip.y, 0.30, 0.002, 'the tip lands on the end of the curve');
  ok(bb.max.y <= e.tip.y + 1e-6, 'and nothing overshoots it — the closure is a hemisphere, not a cap disc');
  /* The inner sheet is the SAME surface a hair proud, so it must sit inside the
     outer's footprint — a second lobe floating in the groove is the failure. */
  e.inner.computeBoundingBox();
  ok(e.inner.boundingBox.max.z <= bb.max.z + 0.003 && e.inner.boundingBox.min.x >= bb.min.x,
     'the inner-ear sheet hugs the groove rather than floating in front of it');
  ok(e.outer.attributes.position.count > 1500, `the ear is dense (${e.outer.attributes.position.count} verts)`);
  eq(e.flop, null, 'no flop pose unless one is asked for');
  eq(e.lengthFlop, null, 'and no second length to compare');
}
{
  /* The flop is a lerp between two poses of identical topology — that identity
     is the whole trick, so assert it rather than the look. */
  const straight = [[0, 0, 0], [0, 0.10, 0], [0, 0.20, 0], [0, 0.30, 0]];
  const folded   = [[0, 0, 0], [0, 0.10, 0], [0, 0.185, 0.04], [0.06, 0.21, 0.10]];
  const e = lib.bunnyEar(straight, { width: 0.058, thick: 0.070, scoop: 1.30, flop: folded });
  ok(e.flop && typeof e.flop.apply === 'function', 'opt.flop yields a flop.apply(k)');
  ok(e.tipFlop && e.tipFlop.y < e.tip.y, 'and a flopped tip below the upright one');
  ok(e.length > 0 && e.lengthFlop > 0, 'both spine lengths are reported, so a caller can check the fold does not stretch');
  const at0 = Float32Array.from(e.outer.attributes.position.array);
  ok(e.flop.apply(1) === true, 'apply(1) reports it moved something');
  const at1 = e.outer.attributes.position.array;
  ok(at1.some((v, i) => Math.abs(v - at0[i]) > 1e-4), 'and the vertices really moved');
  ok(e.flop.apply(1) === false, 'applying the same amount twice is a no-op (it is called every frame)');
  e.flop.apply(0);
  ok(!e.outer.attributes.position.array.some((v, i) => Math.abs(v - at0[i]) > 1e-5), 'apply(0) restores the upright pose exactly');
  const nrm = e.outer.attributes.normal.array;
  e.flop.apply(0.5);
  ok(!Array.prototype.some.call(nrm, v => Number.isNaN(v)), 'half way over, no NaN normals (the lerp renormalises)');
  let unit = true;
  for (let i = 0; i < nrm.length; i += 3) if (Math.abs(Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) - 1) > 1e-3) unit = false;
  ok(unit, 'and every normal is still unit length');
  e.flop.apply(0);
}
ok(lib.tex.label('Hello').isTexture, 'tex.label returns a texture');
ok(lib.tex.abstract(3).isTexture, 'tex.abstract returns a texture');
['birch', 'birchDark', 'floor', 'wall', 'rug', 'rugEdge', 'fabric', 'fabricPiping', 'cream', 'skirting', 'plum', 'black', 'chrome', 'brass', 'curtain', 'tieback', 'window', 'yellow', 'yellowDark', 'paper', 'sleeve', 'potCream', 'leaf', 'cattail', 'glass']
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
 'bench', 'benchBase', 'benchDrawerL', 'benchDrawerR', 'benchKnobL', 'benchKnobR', 'cubby', 'cubbyLid', 'shelfBack', 'shelfSideL', 'shelfSideR',
 'shelfBoard0', 'shelfBoard1', 'shelfBoard2', 'shelfTop', 'seatFront', 'seatLeft', 'seatRight',
 'backFront', 'backLeft', 'backRight', 'armLeft', 'armRight',
 'rugEdge', 'plant', 'window', 'windowFrame', 'windowPulls', 'windowBloom', 'windowShafts', 'curtainRod', 'curtainL', 'curtainR', 'tiebackL', 'tiebackR', 'tiebackHookL', 'tiebackHookR', 'sill', 'ledge', 'printA', 'printAFace', 'printB', 'printBFace', 'mugGroup', 'slippersGroup']
  .forEach(n => ok(roomNames.has(n), `room has ${n}`));
{
  const R = room.userData.prmRoom;
  let picks = 0; room.traverse(o => { if (o.userData.prmId) picks++; });
  eq(picks, 0, 'nothing in the room shell is a pick target');
  const rug = room.getObjectByName('rug'); ok(rug.receiveShadow, 'rug receives shadow');
  ok(rug.geometry.type === 'CylinderGeometry', 'rug is round');
  { const rb = new THREE.Box3().setFromObject(rug); near((rb.min.x + rb.max.x) / 2, R.tableX, 0.02, 'rug is centred under the table'); }
  ok(!roomNames.has('sideTableTop'), 'the side table is gone');
  const plant = room.getObjectByName('plant'); ok(plant && plant.isGroup, 'plant is a group on the shell');
  { const PP = plant.userData.prmPlant || {};
    ok(PP.blades >= 4, `plant has blades (${PP.blades})`); eq(PP.heads, 3, 'three cattail heads');
    ok(plant.getObjectByName('pot') && plant.getObjectByName('soil'), 'plant has a pot and soil');
    /* room pass, item 13: to the owner's render — four meshes (pot, soil, the green merged, the heads
       merged), the pot 1.55× as tall as it is wide, the plant 3.3 pot widths tall, the heads lilac and fuzzy */
    { plant.updateMatrixWorld(true);   // a part's box reads its parent's matrix: the plant's scale must be in it
      let meshes = 0; plant.traverse(o => { if (o.isMesh) meshes++; }); eq(meshes, 4, 'the plant is four meshes');
      ok(plant.getObjectByName('plantGreen') && plant.getObjectByName('cattails'), 'the green and the heads are each one merged mesh');
      const potB = new THREE.Box3().setFromObject(plant.getObjectByName('pot')), potW = potB.max.x - potB.min.x;
      // the yellow body stops 2 cm under the rim's top (the rim is 2.2 cm, lapped 2 mm over it)
      near((potB.max.y - potB.min.y + 0.02) / potW, 1.55, 0.08, 'the pot is tall, as in the render (≈1.55× its width with the rim)');
      const pb2 = new THREE.Box3().setFromObject(plant);
      near((pb2.max.y - pb2.min.y) / potW, 3.3, 0.2, 'the plant stands 3.3 pot widths tall');
      ok(pb2.max.x - plant.position.x > potW * 0.8, 'the right head hooks out past the pot');
      const hc = plant.getObjectByName('cattails').material.color; ok(hc.b > hc.g && hc.r > hc.g, 'the heads are lilac');
      ok(plant.getObjectByName('cattails').material.defines && plant.getObjectByName('cattails').material.defines.PRM_SHEEN, 'the heads carry the cloth sheen (their fuzz)'); }
    const pb = new THREE.Box3().setFromObject(plant);
    /* room pass, round 8: the plant left the window's old deep sill (the curtains ran through it) for a
       ledge on the BACK wall, just past the back curtain, as in the mockup */
    const lb = new THREE.Box3().setFromObject(room.getObjectByName('ledge'));
    near(pb.min.y, R.ledgeTopY, 0.01, 'plant rests on the ledge'); near(lb.max.y, R.ledgeTopY, 0.002, 'ledge top equals prmRoom.ledgeTopY');
    ok(lb.min.z >= R.backZ - 0.001 && lb.min.z < R.backZ + 0.01, 'the ledge is on the back wall');
    ok(pb.min.z > R.backZ && pb.min.x > lb.min.x - 0.02 && pb.max.x < lb.max.x + 0.02, 'plant sits over its ledge, not in the wall');
    ok(pb.max.y - pb.min.y > 0.16, 'the cattails stand tall enough to read as a silhouette');
    let painted = 0; plant.traverse(o => { if (o.isMesh && o.material.userData.prmRole) painted++; });
    eq(painted, 0, 'the plant is furniture - no design role'); }
  const floor = room.getObjectByName('floor'); ok(floor.receiveShadow, 'floor receives shadow');
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'tableX', 'tableZ', 'armTopY', 'seatTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
  // the re-block (spec 2026-09-19 § 3.1): a corner, not a hall
  ok(R.backZ > -1.8 && R.backZ < -1.3, `back wall is close (backZ ${R.backZ})`);
  ok(R.leftX > -1.9 && R.leftX < -1.3, `left wall is close (leftX ${R.leftX})`);
  ok(R.benchZ - R.tableZ > -1.3 && R.benchZ - R.tableZ < -0.7, `bench sits about a metre behind the table (${(R.tableZ - R.benchZ).toFixed(2)} m)`);
  ok(R.tableX > 0.2, `table is right of centre (tableX ${R.tableX})`);
  ok(R.seatTopY > R.tableTopY && R.seatTopY < R.armTopY, 'seat cushion sits between table top and arm top');
  const S = room.userData.prmShelf; eq(S.ys.length, 3, 'three shelf boards');
  ok(S.ys[2] < 1.25, `the top board is inside the frame (ys[2] ${S.ys[2]})`);
  ok(S.ys[0] < 0.55, `the lowest board is low enough to read (ys[0] ${S.ys[0]})`);
  { const unit = new THREE.Box3().setFromObject(room.getObjectByName('shelfSideL'));
    ok(unit.min.y < 0.05, 'the shelf unit stands on the floor');
    const bench = new THREE.Box3().setFromObject(room.getObjectByName('bench'));
    const gap = unit.min.x - bench.max.x;
    ok(gap > 0.15, `a visible gap between the shelf and the TV bench (${gap.toFixed(2)} m)`); }
  room.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(room.getObjectByName('tableTop'));
  near(bb.max.y, R.tableTopY, 0.001, 'tableTop surface equals prmRoom.tableTopY');
  const arm = new THREE.Box3().setFromObject(room.getObjectByName('armLeft'));
  near(arm.max.y, R.armTopY, 0.002, 'armLeft top equals prmRoom.armTopY');
  /* The U-shaped couch (owner, 19 Sep 2026, second pass): three runs wrapping the table left,
     front and right, so the wall-less right side is closed by the furniture itself. */
  const box = (n) => new THREE.Box3().setFromObject(room.getObjectByName(n));
  const seat = box('seatFront'), sL = box('seatLeft'), sR = box('seatRight');
  [['seatFront', seat], ['seatLeft', sL], ['seatRight', sR]].forEach(([n, b]) =>
    near(b.max.y, R.seatTopY, 0.002, n + ' top equals prmRoom.seatTopY'));
  ok(seat.min.z > R.tableZ + 0.31 - 0.02, 'the front run does not slide under the table');
  /* The bottom of frame crosses seat height at z = 0.72 from this camera, so a front run entirely
     nearer than that is invisible however big it is — which is how the first version shipped. */
  ok(seat.min.z < 0.68, 'the front run reaches back past the bottom of frame, so its length actually shows');
  ok(sL.max.x < R.tableX && sR.min.x > R.tableX, 'the two arms sit either side of the table');
  ok(sL.min.z < seat.min.z && sR.min.z < seat.min.z, 'both arms reach further back than the front run (a U, not an L)');
  ok(sL.max.z > seat.min.z && sR.max.z > seat.min.z, 'both arms meet the front run at their corners');
  ok(sR.min.x > R.tableX + 0.5, 'the right arm closes the wall-less side of the room');
  /* Every back must OVERLAP its seat, not merely meet it on a plane. Two moulded boxes sharing an
     exact face still read as separate objects, because each one's rounded edge curves away from the
     shared line and leaves a groove with the floor visible through it. Asserting intersection rather
     than adjacency is the whole lesson. */
  const bF = box('backFront'), bL = box('backLeft'), bR = box('backRight');
  const overlap = (a, b, axis) => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);
  ok(bF.intersectsBox(seat) && overlap(bF, seat, 'z') > 0.03, `the front back bites into the front seat (${overlap(bF, seat, 'z').toFixed(3)} m)`);
  ok(bL.intersectsBox(sL) && overlap(bL, sL, 'x') > 0.03, `the left back bites into the left seat (${overlap(bL, sL, 'x').toFixed(3)} m)`);
  ok(bR.intersectsBox(sR) && overlap(bR, sR, 'x') > 0.03, `the right back bites into the right seat (${overlap(bR, sR, 'x').toFixed(3)} m)`);
  [['backFront', bF, seat], ['backLeft', bL, sL], ['backRight', bR, sR]].forEach(([n, b, st]) => {
    ok(b.min.y < R.seatTopY - 0.05, n + ' drops below the seat top, the way a real back panel does');
    ok(b.max.y > R.seatTopY + 0.3, n + ' rises well above the seat');
    ok(overlap(b, st, 'y') > 0.05, n + ' and its seat share real height, not a single line');
  });
  [['armLeft', sL], ['armRight', sR]].forEach(([n, st]) => {
    const a = box(n);
    ok(a.intersectsBox(st) && overlap(a, st, 'z') > 0.03, n + ' bites into its seat too');
  });
  ok(box('armRight').max.y > R.seatTopY, 'the right arm caps the U\'s other open end');
  // the window is on the LEFT wall (spec 2026-09-19 § 3.2, D4); the curtains are drawn OPEN (room pass, round 8)
  ok(typeof R.sillTopY === 'number', 'prmRoom.sillTopY is a number');
  ok(!roomNames.has('floorLampShade') && !roomNames.has('floorLampStem'), 'the floor lamp is gone');
  const win = new THREE.Box3().setFromObject(room.getObjectByName('window'));
  ok(win.max.x - win.min.x < 0.05 && win.min.x < R.leftX + 0.05, 'window plane lies in the left wall');
  const cl = new THREE.Box3().setFromObject(room.getObjectByName('curtainL')), cr = new THREE.Box3().setFromObject(room.getObjectByName('curtainR'));
  ok(cl.max.y - cl.min.y > 1.8 && cr.max.y - cr.min.y > 1.8, 'both curtain halves stand tall');
  ok(cl.max.x < R.leftX + 0.3 && cr.max.x < R.leftX + 0.3, 'curtain hangs against the left wall');
  const sill = new THREE.Box3().setFromObject(room.getObjectByName('sill'));
  near(sill.max.y, R.sillTopY, 0.002, 'sill top equals prmRoom.sillTopY');
  ok(['curtainL', 'curtainR', 'tiebackL', 'tiebackR'].every(n => !room.getObjectByName(n).castShadow), 'curtains and tie-backs do not cast (the sun must reach the room through the linen)');
  ok(['curtainL', 'curtainR', 'tiebackL', 'tiebackR'].every(n => !room.getObjectByName(n).receiveShadow), 'nor receive: the one caster is behind them, so the VSM lookup was a third of their cost for nothing');
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
  ok(!PrmScene.prmEligible(1280, 720, true, true), 'prefers-reduced-data is not eligible at any size');
  ok(PrmScene.PRM_PRESETS.wide && PrmScene.PRM_PRESETS.portrait, 'both camera presets exist');

  /* The arrival floor (Scene B). It has NO size condition on purpose: a phone
     cannot stay in the lounge, but it can be shown the way out of one. */
  ok(PrmScene.prmCanArrive(true, false), 'a phone with a context can play the arrival beat');
  ok(!PrmScene.prmCanArrive(false, false), 'no WebGL cannot');
  ok(!PrmScene.prmCanArrive(true, true), 'and neither can a player who asked for reduced data');
  ok(PrmScene.prmArriveMs(false) > 300, 'the beat is a blocking choreography beat, not chrome feedback');
  ok(PrmScene.prmArriveMs(false) <= 2500, 'but it is a beat, not a wait');
  ok(PrmScene.prmArriveMs(true) < PrmScene.prmArriveMs(false), 'reduced motion skips the journey');
}

section('skipProps \u2014 the lean mount the arrival tier uses');
{
  /* Measured 21 Sep 2026: the controller is 87% of the prop build (859 ms of
     990 at CPU 4x). Skipping it is what makes the beat playable on the
     hardware it exists for \u2014 and it must be a real ABSENCE, not a hidden
     mesh, or every downstream lookup still pays for it. */
  const full = PrmProps.prmBuildAll(global.__prmCtx);
  const lean = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller'] }));
  ok(full.controller, 'the full mount builds the controller');
  eq(lean.controller, undefined, 'the lean mount does not build it at all');
  eq(Object.keys(lean).length, Object.keys(full).length - 1, 'and skips exactly one prop, not two');
  Object.keys(full).filter(k => k !== 'controller').forEach(k => ok(lean[k], `the lean mount still builds ${k}`));

  /* The clamshell is the beat's pan target, so the lean mount must keep it \u2014
     this is the check that would catch someone "optimising" further. */
  ok(lean.phone, 'the clamshell the beat pans to survives the lean mount');

  // A skipped id leaves no pick node, so activate() and the tab order both
  // drop it without anything downstream needing to know.
  eq(lean.controller, undefined, 'a skipped prop has no group to tag');
  ok(PrmProps.PRM_TAB_ORDER.filter(id => lean[id]).indexOf('controller') === -1,
     'and falls out of the keyboard order by the filter that is already there');
  ok(PrmProps.PRM_TAB_ORDER.filter(id => full[id]).indexOf('controller') !== -1,
     'while the full mount still offers it');

  // No skipProps must behave exactly as before.
  eq(Object.keys(PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: null }))).length,
     Object.keys(full).length, 'skipProps: null builds everything');
  eq(Object.keys(PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: [] }))).length,
     Object.keys(full).length, 'and so does an empty list');
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
  const eL = tv.getObjectByName('earL'), eR = tv.getObjectByName('earR'); ok(eL && eR, 'tv has two ears');
  /* The OUTER lobe takes `shell` — the same role as the boss and the cabinet it
     grows out of, which is most of what makes the root read as one continuous
     form — and the INLAY takes `ears` (owner, 23 Sep). A shade multiplier keeps
     the inlay distinct on a default palette that paints both roles the same. */
  { const inner = eL.getObjectByName('inner');
    ok(inner && inner.material.userData.prmRole === 'ears', 'the ear INLAY takes the ears role');
    ok(inner && inner.material.userData.prmShade < 1, 'and carries a shade, so it reads even when shell and ears match');
    const lit = new THREE.Color('#333333');
    ok(inner && inner.material.color.r < lit.r, 'the inlay renders darker than the raw role colour'); }
  ok(tv.getObjectByName('face'), 'the telly has a front face mass, not just a bezel');
  tv.updateMatrixWorld(true);
  /* The mockup's ears STAND UP and hook forward — they are not the first pass's
     droop down over the screen, and they stay inside the cabinet's width. */
  { const tipW = eL.userData.tipLocal.clone().applyMatrix4(eL.matrixWorld);
    const rootW = new THREE.Vector3(); eL.getWorldPosition(rootW);
    const earBox = new THREE.Box3().setFromObject(eL), bodyBox = new THREE.Box3().setFromObject(tv.getObjectByName('body'));
    /* "Its tip is its crown" within one ear-thickness: the hook's own tube is
       0.07 m thick, so the highest surface sits that far above the spine even
       on a perfectly upright ear. The first pass hung the tip a quarter of a
       metre below it. */
    ok(tipW.y > earBox.max.y - 0.09, 'the ear stands up: its tip IS its crown, not a droop below it');
    ok(tipW.y > bodyBox.max.y + 0.18, `and stands well proud of the cabinet (${(tipW.y - bodyBox.max.y).toFixed(2)} m)`);
    ok(Math.abs(tipW.z - rootW.z) < 0.04, 'the ear stands STRAIGHT — its tip is over its own root, not hooked forward');
    ok(tipW.x < rootW.x - 0.02, `the left ear splays outward as it rises (${(rootW.x - tipW.x).toFixed(3)} m)`);
    ok(earBox.min.x > bodyBox.min.x, 'but stays inside the cabinet width, as the reference has it'); }
  /* The pair reads as a V. Their ROOT flares meet under the shell's crown — the
     reference's top-down view has them touching there too — so the claim is
     about the tips, which is where the shape is actually seen. */
  { const tL = eL.userData.tipLocal.clone().applyMatrix4(eL.matrixWorld);
    const tR = eR.userData.tipLocal.clone().applyMatrix4(eR.matrixWorld);
    ok(tR.x - tL.x > 0.20, `the two tips splay well apart (${(tR.x - tL.x).toFixed(2)} m)`);
    near(tL.y, tR.y, 0.001, 'and the pair is symmetric'); }
  /* The idle flop: the RIGHT ear alone carries a second pose, and the api drives
     it. Everything here is the pure tier — the morph is a CPU lerp precisely so
     it can be driven and asserted under Node. */
  {
    ok(!eL.userData.tipFlopLocal, 'the left ear has no flop pose (only the right one flops)');
    ok(!!eR.userData.tipFlopLocal, 'the right ear carries one');
    const up = eR.userData.tipLocal, over = eR.userData.tipFlopLocal;
    ok(over.y < up.y - 0.08, 'the flopped tip drops well below the upright one');
    ok(over.x > up.x + 0.08, 'and folds OUTWARD, past where the upright tip stands');
    /* An ear folds; it does not stretch. The claim is about the spines' ARC
       LENGTH — straight-line distance from the root is supposed to shorten, that
       is what folding is — and getting this wrong makes the morph grow the ear
       as it goes over. */
    { const [a, b] = eR.userData.earSpans;
      near(b, a, 0.02, `the two spines run the same length (${a.toFixed(3)} vs ${b.toFixed(3)} m)`); }

    const api = tv.userData.api, geo = eR.geometry;
    const rig = tv.getObjectByName('rig'), foot0 = tv.getObjectByName('footPivot0');
    ok(rig && foot0, 'the telly rides on a rig, and each foot hangs from its own pivot');
    const snap = Float32Array.from(geo.attributes.position.array);

    /* Drive 60 s of idle and watch what actually happens. Three beats shuffled
       with random gaps means a short window can miss one by luck — which is
       exactly the kind of flake a fixed window would hide. */
    const seen = [], peak = { flop: 0, sway: 0, hop: 0 };
    let moved = false, prev = null, starts = [], t = 1000;
    for (let i = 0; i < 1200; i++) {
      api.tick(t += 50, 0.05, false);
      const b = api.currentBeat();
      if (b && b !== prev) { seen.push(b); starts.push(t); }
      prev = b;
      peak.flop = Math.max(peak.flop, api.flopAmount());
      peak.sway = Math.max(peak.sway, api.swayAmount());
      peak.hop = Math.max(peak.hop, api.hopAmount());
      if (api.flopAmount() > 0.5 && !moved) moved = geo.attributes.position.array.some((v, j) => Math.abs(v - snap[j]) > 1e-4);
    }
    ok(peak.flop > 0.99, `the ear flops all the way over (peak ${peak.flop.toFixed(2)})`);
    ok(peak.sway > 0.99, `the cabinet sways (peak ${peak.sway.toFixed(2)})`);
    ok(peak.hop > 0.9, `and hops (peak ${peak.hop.toFixed(2)})`);
    ok(moved, 'the flop actually moves vertices — the morph is wired, not just a counter');
    ok(geo.boundingBox && geo.boundingBox.max.x > up.x + 0.05,
       'the ear geometry is bounded over BOTH poses, so the flop cannot be culled away');

    /* "Not an exact loop" is the point of the beat, so it is worth asserting
       rather than trusting: no beat twice running, and the gaps genuinely vary. */
    ok(seen.length >= 8, `enough beats to judge the sequence (${seen.length} in 60 s)`);
    ok(!seen.some((b, i) => i > 0 && b === seen[i - 1]), 'no beat ever fires twice in a row');
    ok(new Set(seen).size === 3, 'and all three beats are in the rotation');
    { const gaps = starts.slice(1).map((v, i) => v - starts[i]);
      ok(new Set(gaps).size > 2, `the gaps between beats vary (${new Set(gaps).size} distinct)`); }

    /* Everything must come back to rest between beats, or the telly creeps. */
    ok(rig.rotation.z === 0 && rig.position.y === 0 && foot0.rotation.z === 0,
       'the rig and the feet are back at rest once a beat ends');

    /* Reduced motion: every beat frozen. Each is a LOOP whose end state is the
       telly as it already stands, so freezing loses no information. */
    let rPeak = 0; t = 1000;
    for (let i = 0; i < 1200; i++) {
      api.tick(t += 50, 0.05, true);
      rPeak = Math.max(rPeak, api.flopAmount(), api.swayAmount(), api.hopAmount());
    }
    eq(rPeak, 0, 'reduced motion: nothing flops, sways or hops');
    eq(rig.rotation.z, 0, 'and the cabinet never leaves upright');
    ok(api.tick(t += 50, 0.05, true) === false, 'the tick reports itself idle, so the loop can sleep');
  }
  const roles = {}; tv.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roles[o.material.userData.prmRole] = (roles[o.material.userData.prmRole] || 0) + 1; });
  ['shell', 'plate', 'ears', 'buttons'].forEach(r => ok(roles[r] > 0, `tv carries ${r}`));
  eq(tv.getObjectByName('earL').material.color.getHexString(), '111111', 'the outer lobe takes design.shell, matching its boss');
  { const boss = tv.getObjectByName('earBossL');
    ok(boss, 'each root has a boss to emerge from');
    eq(boss.material.userData.prmRole, 'shell', "and the boss shares the lobe's role, so the junction has no colour seam"); }
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

section('jukebox');
{
  /* Prop-quality round 3 (23 Sep 2026): the cat jukebox reshaped to the owner's
     mockup — an opaque tub with a framed WINDOW, ten records standing as spokes
     on a carousel, a superellipse head, cat ears on pads. Every geometric claim
     below is MEASURED off the built meshes with rays, never re-derived from the
     builder's constants (plan § 1: "a geometric assertion should measure the
     geometry"), and each of the three that could pass vacuously is run once
     against planted drift first. */
  const t0 = Date.now();
  const jb = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx,
    { skipProps: ['controller', 'tv', 'dial', 'phone', 'binder', 'lamp', 'shelfContents'] })).jukebox;
  jb.updateMatrixWorld(true);
  const J = (n) => jb.getObjectByName(n), V3 = THREE.Vector3;
  const roleOf = (n) => { const m = J(n); return m && m.material && m.material.userData.prmRole; };
  const ids = {}; jb.traverse(o => { if (o.userData.prmId) ids[o.userData.prmId] = o; });
  const api = jb.userData.api;

  /* ── the doors (owner, 23 Sep): "clicking the jukebox itself (anywhere) will
     be the door". The knob is gone; its id tags the whole body. */
  ok(ids['jukebox-knob'] && ids['jukebox-record'], 'the jukebox keeps both pick ids');
  eq(ids['jukebox-knob'].name, 'body', 'jukebox-knob tags the whole body');
  eq(ids['jukebox-record'].name, 'carousel', 'jukebox-record tags the record carousel');
  { let p = ids['jukebox-record'].parent; while (p && p !== ids['jukebox-knob']) p = p.parent;
    ok(p === ids['jukebox-knob'], 'the carousel rides inside the body, so hovering the body lifts the records with it'); }
  { let tagged = false; for (let p = J('glass'); p; p = p.parent) if (p.userData.prmId) tagged = true;
    ok(!tagged, 'the glass is no pick target — or every tap on a record would land on the glass in front of it'); }
  ok(J('glass').material.transparent && !J('glass').castShadow, 'the glass is see-through and casts no shadow');
  eq(J('knob'), undefined, 'there is no knob any more');

  /* ── the four colour sections, owner-mapped 23 Sep 2026 */
  [['base', 'shell'], ['wall', 'shell'], ['head', 'shell'],
   ['frame', 'plate'], ['ring', 'plate'], ['eyeL', 'plate'], ['eyeR', 'plate'], ['nose', 'plate'],
   ['earL', 'ears'], ['earR', 'ears'], ['earPadL', 'ears'], ['earPadR', 'ears'],
   ['faceplate', 'buttons']].forEach(([n, r]) => eq(roleOf(n), r, `${n} takes the ${r} role`));
  const inner = J('earL').getObjectByName('inner');
  ok(inner && inner.material.userData.prmRole === 'ears' && inner.material.userData.prmShade < 1,
     'the inner ear is the ears role a shade darker — two parts, one colour');
  ok(J('eyeL').material.userData.prmEmissive === true, 'the eyes glow in the face colour');
  const btns = []; jb.traverse(o => { if (/^button\d$/.test(o.name)) btns.push(o); });
  eq(btns.map(b => b.userData.kind).join(','), 'playpause,prev,next,down,up', 'five transport buttons, in the owner\'s order');
  ok(btns.every(b => !b.material.userData.prmRole && b.material.map), 'the buttons keep their own pastel faces (no role)');
  ok(!J('screen').material.userData.prmRole, 'the screen belongs to no role');
  /* One texture, repainted in place: an animated screen must re-upload a
     canvas, never mint a texture per frame. */
  const scrTex = J('screen').material.map;
  { const v0 = scrTex.version; api.setLabel('Cookie Jar');
    ok(scrTex.version > v0 && J('screen').material.map === scrTex, 'setLabel repaints the screen, in place');
    ok(J('screen').material.emissiveMap === scrTex, 'and the screen glows its own picture'); }

  /* ── the records: ten spokes, each a game's */
  const recs = api.records;
  eq(recs.length, 10, 'ten records on the carousel');
  eq(new Set(recs.map(r => r.userData.gameId)).size, 10, 'ten different games');
  ok(recs.every(r => { const g = GAMES.find(x => x.id === r.userData.gameId);
    return g && r.getObjectByName('label').material.color.getHexString() === g.brandHex.slice(1).toLowerCase(); }),
     'every label is its own game\'s brand colour');
  { const v = recs[3].getObjectByName('vinyl');
    const axis = new V3(0, 1, 0).applyQuaternion(v.getWorldQuaternion(new THREE.Quaternion()));
    const c = v.getWorldPosition(new V3()), radial = new V3(c.x, 0, c.z).normalize();
    ok(Math.abs(axis.dot(radial)) < 1e-6 && Math.abs(axis.y) < 1e-6, 'records stand as SPOKES — each one\'s axis is the tangent'); }

  const meshes = []; jb.traverse(o => { if (o.isMesh) meshes.push(o); });
  const inCarousel = (o) => { for (let n = o; n; n = n.parent) if (n === ids['jukebox-record']) return true; return false; };
  const fixed = meshes.filter(o => !inCarousel(o));
  const probe = new THREE.Raycaster();

  /* ── THE CORRIDOR IS CLEAR (the dial's check, ported — plan § 1: "no harness
     had ever measured a MOVING part against a FIXED one"). Each record is a disc
     in its own radial plane; every point of it travels a circle. Fire along
     that circle from thirteen points across the disc at every 3°, against every
     FIXED mesh — the glass and the column included. Rays, not vertices: a
     vertex sweep cannot see the middle of a triangle. */
  const v0 = recs[0].getObjectByName('vinyl'), c0 = v0.getWorldPosition(new V3());
  const RC = Math.hypot(c0.x, c0.z), YC = c0.y, RR = v0.geometry.parameters.radiusTop;
  const PTS = [[0, 0], [0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95],
               [0.6, 0.6], [0.6, -0.6], [-0.6, 0.6], [-0.6, -0.6], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]];
  /* k0..k1 limits the sweep to part of the ring — only the planted run uses it,
     to prove the check fires without paying for the whole circle twice. */
  function corridor(list, k0 = 0, k1 = 120) {
    const hit = new Set(), N = 120;
    for (let k = k0; k < k1; k++) {
      const a = (k / N) * Math.PI * 2, tangent = new V3(Math.cos(a), 0, -Math.sin(a));
      for (const [dr, dy] of PTS) {
        const r = RC + dr * RR;
        probe.set(new V3(Math.sin(a) * r, YC + dy * RR, Math.cos(a) * r), tangent);
        probe.far = (Math.PI * 2 * r) / N * 1.2;
        probe.intersectObjects(list, false).forEach(h => hit.add(h.object.name));
      }
    }
    probe.far = Infinity; return hit;
  }
  { const plant = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial());
    plant.name = 'planted'; plant.position.set(Math.sin(0.7) * RC, YC, Math.cos(0.7) * RC); plant.updateMatrixWorld(true);
    ok(corridor(fixed.concat([plant]), 8, 20).has('planted'), 'the corridor sweep can fire (a part planted in the path is found)'); }
  const blocked = corridor(fixed);
  ok(blocked.size === 0, `nothing fixed stands in the records' path (hit ${JSON.stringify([...blocked])})`);

  /* ── THE FRAME COVERS THE CUT. The wall's window is a hole with no edge
     faces; the frame is what hides it. So on a grid of rays fired straight in
     at the body, an OPENING must never sit right beside bare WALL — there is
     always frame between them. 4 mm grid against a 9 mm frame band: at least
     two frame samples across it wherever it is. */
  const skin = ['wall', 'frame', 'faceplate', 'screenLens', 'screen', 'ring', 'head', 'base'].map(J).concat(btns);
  function frameGap(aLo = -88, aHi = 88) {
    const R0 = 0.118, step = 0.004, cols = [], da = step / R0;
    let open = 0, bad = 0;
    for (let a = aLo * Math.PI / 180; a <= aHi * Math.PI / 180; a += da) {
      const col = [];
      for (let y = 0.052; y <= 0.178; y += step) {
        probe.set(new V3(Math.sin(a) * 0.2, y, Math.cos(a) * 0.2), new V3(-Math.sin(a), 0, -Math.cos(a)));
        const h = probe.intersectObjects(skin, false).find(x => x.distance < 0.2 - R0 + 0.012);
        const k = !h ? 'open' : h.object.name === 'wall' ? 'wall' : 'cover';
        if (k === 'open') open++; col.push(k);
      }
      cols.push(col);
    }
    for (let i = 0; i < cols.length; i++) for (let j = 0; j < cols[i].length; j++) {
      if (cols[i][j] !== 'open') continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const c = cols[i + di]; if (c && c[j + dj] === 'wall') bad++; });
    }
    return { open, bad };
  }
  { const f = J('frame'), r0 = f.rotation.y; f.rotation.y = r0 + 0.085; f.updateMatrixWorld(true);
    /* 10 mm toward +x, past the frame's 7 mm overlap, so the LEFT post uncovers
       the cut — only that side is swept. (A 6 mm nudge was tried first and the
       check rightly stayed quiet: the frame still covered the cut.) */
    ok(frameGap(-88, -66).bad > 0, 'the frame-gap check can fire (a frame nudged 10 mm off its window is caught)');
    f.rotation.y = r0; f.updateMatrixWorld(true); }
  const fg = frameGap();
  ok(fg.open > 200, `the window is a real opening (${fg.open} ray samples see straight in)`);
  eq(fg.bad, 0, 'and nowhere does an opening sit next to bare wall — the frame covers the cut all the way round');

  /* ── BEHIND THE WINDOW IS WALL (the dial's lesson: only a pure side view
     tells you a lid has no wall). Rays in at the axis from every angle round
     the back, at record height: every one meets the wall first. */
  { let solid = 0, total = 0;
    for (let d = 95; d <= 265; d += 5) for (const y of [0.07, 0.10, 0.13, 0.16]) {
      total++; const a = d * Math.PI / 180;
      probe.set(new V3(Math.sin(a) * 0.3, y, Math.cos(a) * 0.3), new V3(-Math.sin(a), 0, -Math.cos(a)));
      const h = probe.intersectObjects(fixed.filter(m => m.name !== 'glass'), false)[0];
      if (h && h.object.name === 'wall') solid++;
    }
    eq(solid, total, 'from the sides and back, the band is solid wall — the window is the front only'); }

  /* ── FROM THE COUCH YOU CAN SEE RECORDS. The room's own camera, relative to
     where the jukebox stands. */
  { const P = PrmProps.PRM_PLACES.jukebox.pos, cam = PrmScene.PRM_PRESETS.wide.pos;
    const eye = new V3(cam[0] - P[0], cam[1] - P[1], cam[2] - P[2]);
    const opaque = meshes.filter(m => m.name !== 'glass');
    const seen = recs.filter(r => { const l = r.getObjectByName('label'), c = l.getWorldPosition(new V3());
      probe.set(eye, c.clone().sub(eye).normalize()); const h = probe.intersectObjects(opaque, false)[0];
      return h && (h.object === l || h.object === r.getObjectByName('vinyl')); }).length;
    ok(seen >= 3, `from the couch, records show through the window (${seen} of 10 labels in sight)`); }

  /* ── proportions, measured */
  { const box = new THREE.Box3().setFromObject(jb), s = box.getSize(new V3());
    near(box.min.y, 0, 0.0005, 'it rests on its own origin');
    ok(s.y > 0.30 && s.y < 0.40, `a tabletop jukebox, not a cabinet (${(s.y * 1000).toFixed(0)} mm tall)`);
    const earTop = new THREE.Box3().setFromObject(J('earL')).max.y, headTop = new THREE.Box3().setFromObject(J('head')).max.y;
    ok(earTop > headTop + 0.02, 'the ears stand clear above the crown'); }

  /* ── motion: the carousel turns while music plays; a tap bops the prop */
  api.setPlaying(true);
  const q0 = ids['jukebox-record'].quaternion.clone();
  ok(api.tick(100, 0.1, false) === true, 'the carousel turns while playing');
  ok(!ids['jukebox-record'].quaternion.equals(q0), 'and its orientation changed');
  ok(api.tick(200, 0.1, true) === false, 'still under reduced motion');
  api.setPlaying(false); ok(api.tick(300, 0.1, false) === false, 'still when nothing plays');
  const rig = J('rig');
  ok(typeof api.bop === 'function', 'the body\'s dormant door has a bop to answer with');
  api.bop(false); api.tick(1000, 0.016, false); api.tick(1170, 0.016, false);
  ok(rig.position.y > 0.004, `a tap on the body hops the whole jukebox (${(rig.position.y * 1000).toFixed(1)} mm)`);
  api.tick(1400, 0.016, false); eq(rig.position.y, 0, 'and it lands exactly where it started');
  api.bop(true); ok(api.tick(1500, 0.016, true) === false && rig.position.y === 0, 'under reduced motion the bop does not travel');

  /* ── EVERY GAME ON TEN RECORDS (owner round 3b): "as long as it keeps
     spinning it can have the illusion of all the games". A record takes the
     next game each time it passes the back. The claim that matters is what the
     player SEES, so at every relabel a ray is fired from the couch at that
     label: it must be hidden. Two full turns, at the scene's own 50 ms step. */
  let now = 5000;
  { const P = PrmProps.PRM_PLACES.jukebox.pos, cam = PrmScene.PRM_PRESETS.wide.pos;
    const eye = new V3(cam[0] - P[0], cam[1] - P[1], cam[2] - P[2]);
    const visibleOpaque = () => { const out = []; jb.traverse(o => { if (o.isMesh && o.name !== 'glass' && o.visible) out.push(o); }); return out; };
    const car = ids['jukebox-record'], r0 = car.rotation.y, seen = new Set(recs.map(r => r.userData.gameId)), tv0 = scrTex.version;
    let changes = 0, exposed = 0, dup = 0;
    api.setPlaying(true);
    while (car.rotation.y - r0 < Math.PI * 4) {
      const before = recs.map(r => r.userData.gameId);
      now += 50; api.tick(now, 0.05, false);
      if (new Set(recs.map(r => r.userData.gameId)).size < recs.length) dup++;
      recs.forEach((r, i) => {
        if (r.userData.gameId === before[i]) return;
        changes++; seen.add(r.userData.gameId); jb.updateMatrixWorld(true);
        const l = r.getObjectByName('label'), c = l.getWorldPosition(new V3());
        probe.set(eye, c.clone().sub(eye).normalize());
        const h = probe.intersectObjects(visibleOpaque(), false)[0];
        if (h && (h.object === l || h.object === r.getObjectByName('vinyl'))) exposed++;
      });
    }
    api.setPlaying(false);
    ok(changes >= 18, `records take new games as the carousel turns (${changes} relabels in two turns)`);
    eq(exposed, 0, 'and never where the couch can see one change — only behind the back wall');
    eq(seen.size, GAMES.length, `two turns show every game in the box on ten records (${seen.size} of ${GAMES.length})`);
    eq(dup, 0, 'and no two records ever carry the same game at once');
    ok(scrTex.version - tv0 > 50, `the waveform moves while music plays (${scrTex.version - tv0} repaints)`);
  }

  /* ── THE IDLE (owner round 3b): smile, sing, roll. Each beat is posed, then
     asserted to come back to EXACTLY the resting prop — a beat that creeps is
     a jukebox that ends up somewhere else after an hour. */
  api.tick(now, 0, true);   // reduced motion drops whatever beat the spin left running
  const lensL = J('eyeL'), smileL = J('smileL'), base = J('base');
  api.startBeat('smile'); api.tick(20000, 0, false); api.tick(20800, 0, false);
  ok(smileL.visible && !lensL.visible, 'smile: mid-beat the eyes are happy closed arcs');
  api.tick(21800, 0, false);
  ok(!smileL.visible && lensL.visible && lensL.scale.y === 1, 'and they open again, exactly');
  api.startBeat('sing'); api.tick(30000, 0, false); api.tick(31500, 0, false);
  { const up = api.notes.filter(n => n.visible), mouth = J('mouth').getWorldPosition(new V3());
    ok(up.length >= 2, `sing: notes float out (${up.length} in the air)`);
    ok(up.every(n => n.position.y > mouth.y), 'and they rise from the mouth'); }
  api.tick(33100, 0, false);
  ok(api.notes.every(n => !n.visible), 'and every note is gone when the song ends');
  /* The roll is the one that can go wrong in a way nobody sees at rest: a
     rotation about the wrong point drives the base through the bench or lifts
     it off. Measured off the base's own vertices — a transformed bounding box
     over-reaches on a tilted cylinder. */
  { const pos = base.geometry.attributes.position, q = new V3(); let lo = Infinity, hi = -Infinity; const dirs = new Set();
    api.startBeat('roll'); api.tick(40000, 0, false);
    for (let e = 50; e <= 2600; e += 50) {
      api.tick(40000 + e, 0, false); jb.updateMatrixWorld(true);
      let m = Infinity; for (let i = 0; i < pos.count; i++) m = Math.min(m, q.fromBufferAttribute(pos, i).applyMatrix4(base.matrixWorld).y);
      lo = Math.min(lo, m); hi = Math.max(hi, m);
      const upv = new V3(0, 1, 0).applyQuaternion(J('rig').quaternion);
      if (Math.hypot(upv.x, upv.z) > 0.05) dirs.add(((Math.round(Math.atan2(upv.x, upv.z) / (Math.PI / 8)) % 16) + 16) % 16);
    }
    ok(lo > -0.0008 && hi < 0.0015, `roll: it stays ON the bench all the way round (lowest point ${(lo * 1000).toFixed(2)} to ${(hi * 1000).toFixed(2)} mm)`);
    ok(dirs.size >= 15, `and the lean travels right round the rim (${dirs.size} of 16 directions)`);
    const rq = J('rig').quaternion;
    ok(Math.abs(rq.w - 1) < 1e-12 && J('rig').position.length() < 1e-12, 'and it ends standing exactly where it started'); }
  /* the shuffle: seeded, never the same beat twice running, all three turn up */
  { api.tick(50000, 0, true);
    const order = [], v0 = scrTex.version; let t = 60000, last = null;
    for (let i = 0; i < 6000 && order.length < 12; i++) { t += 100; api.tick(t, 0.1, false); const b = api.currentBeat(); if (b && b !== last) order.push(b); last = b; }
    ok(order.length === 12, `the idle keeps going (${order.join(' ')})`);
    ok(order.every((b, i) => i === 0 || b !== order[i - 1]), 'never the same beat twice running');
    eq(new Set(order).size, 3, 'and all three beats turn up');
    eq(scrTex.version, v0, 'while nothing plays the screen sits still — no uploads');
    let moved = false;
    for (let i = 0; i < 300; i++) { t += 100; if (api.tick(t, 0.1, true) || api.currentBeat()) moved = true; }
    ok(!moved, 'reduced motion: no beat ever starts'); }
  console.log('  (jukebox section ' + (Date.now() - t0) + ' ms)');
}

section('jukebox-phone-binder');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx);
  ok(built.jukebox && built.phone && built.binder, 'jukebox, phone and binder build');
  eq(built.phone.userData.prmId, 'phone', 'phone group is the pick node');
  const keys = []; built.phone.traverse(o => { if (/^key\d\d$/.test(o.name)) keys.push(o); }); eq(keys.length, 12, 'phone has a 3x4 keypad');
  ok(keys[0].material.userData.prmRole === 'buttons', 'keypad takes the buttons role');
  const b = built.binder, api = b.userData.api; eq(b.userData.prmId, 'binder', 'binder group is the pick node');
  let roleCount = 0; b.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roleCount++; }); eq(roleCount, 0, 'nothing on the binder follows the design');
  eq(PrmProps.PRM_ACTIONS.binder.fallback, 'openCover', 'binder falls back to openCover when no openStickerbook is given');
  ok(typeof api[PrmProps.PRM_ACTIONS.binder.fallback] === 'function', 'the fallback names a real api method');
}

section('binder');
{
  /* Prop round 5 (owner's mockup, 23 Sep 2026). Everything is measured off the
     built meshes; userData.prmBinder is read only for the table-height and
     thickness NAMES, never to re-derive a position (plan § 1). */
  const t0 = Date.now();
  const fresh = () => PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller', 'tv', 'jukebox', 'dial', 'phone', 'lamp', 'shelfContents'] })).binder;
  const b = fresh(), api = b.userData.api, D = b.userData.prmBinder, list = global.__prmCtx.stickers.list;
  const box = o => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o); };
  /* r128's setFromObject transforms each mesh's bounding BOX, so a turning
     half-disc reports its box corner, R(√2 − 1) below the table, mid-swing. The
     lowest point of a mesh is always a vertex, so a vertex sweep is exact. */
  const lowY = o => { o.updateWorldMatrix(true, true); let m = Infinity; const vv = new THREE.Vector3();
    o.traverse(n => { if (!n.isMesh) return; const p = n.geometry.attributes.position; for (let i = 0; i < p.count; i++) { vv.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); if (vv.y < m) m = vv.y; } }); return m; };
  const part = n => b.getObjectByName(n);
  ['backCover', 'backPiping', 'pages', 'sleevePage', 'sleeveFilm', 'hinge', 'spineRig', 'cover', 'quilt', 'piping', 'spine', 'tray', 'trayRim']
    .forEach(n => ok(part(n), `binder has its ${n}`));
  let tris = 0, meshes = 0; b.traverse(o => { if (o.isMesh) { meshes++; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } });
  console.log(`  (binder: ${meshes} meshes, ${Math.round(tris)} triangles)`);
  ok(tris > 20000, `the binder is past greybox density (${Math.round(tris)} triangles)`);
  const bumped = new Set(); b.traverse(o => { if (o.isMesh && o.material.bumpMap) bumped.add(o.material); });
  ok(bumped.size >= 3, `quilt, board and cord carry bump maps (${bumped.size} bumped materials)`);
  ok(part('quilt').material.map && part('quilt').material.bumpMap, 'the quilt has both a drawn face and its relief');

  // the stickers: one material per sticker, shared by its pocket and its tray copy
  const imgMats = new Set(); b.traverse(o => { if (o.isMesh && o.material.userData.prmImage) imgMats.add(o.material); });
  eq(imgMats.size, list.length, 'one image material per sticker in the manifest');
  ok([...imgMats].every(m => m.userData.prmImage.startsWith(global.__prmCtx.stickers.base)), 'every sticker url comes from the sticker base');
  const pockets = [], trays = []; b.traverse(o => { if (/^pocket-/.test(o.name)) pockets.push(o); if (/^tray-/.test(o.name)) trays.push(o); });
  eq(pockets.length, 4, 'the top page has four pockets'); eq(trays.length, list.length, 'every sticker can wait in the tray');
  ok(pockets.every(p => p.material === part('tray-' + p.userData.stickerId).material), 'a pocket and its tray copy share the one material');

  // closed: shut, and a real book — covers overhang the pages, the quilt sits on top of them
  ok(!api.isOpen() && api.angle() === 0, 'binder starts closed');
  { const pg = box(part('pages')), bc = box(part('backCover')), cv = box(part('cover')), q = box(part('quilt')), bb = box(b);
    ok(bc.min.x <= pg.min.x && bc.max.x >= pg.max.x + 0.003 && bc.min.z <= pg.min.z - 0.003 && bc.max.z >= pg.max.z + 0.003, 'the back cover overhangs the pages at the fore-edge, head and tail');
    ok(cv.max.x >= pg.max.x + 0.003, 'so does the front cover');
    ok(pg.min.y >= bc.max.y - 1e-4 && pg.max.y <= cv.min.y + 1e-4, 'the page block sits between the covers, touching neither inside');
    ok(q.min.y >= cv.max.y - 0.0005, 'the quilt rides on the front cover');
    ok(q.max.y - q.min.y > 0.002, `the quilt actually puffs (${((q.max.y - q.min.y) * 1000).toFixed(1)} mm of relief)`);
    ok(lowY(b) >= -1e-4, 'closed, nothing is below the table');
    ok(Math.abs((bb.max.x - bb.min.x) - D.W) < 0.008 && Math.abs((bb.max.z - bb.min.z) - D.H) < 0.008, `closed footprint is the book (${(bb.max.x - bb.min.x).toFixed(3)} × ${(bb.max.z - bb.min.z).toFixed(3)} m)`);
    const pgEdge = box(part('pages')); ok(pgEdge.max.x > box(part('spine')).max.x + 0.1, 'the page block runs out to the fore-edge'); }

  // the swing: never into the table, and the cover lands flat on it
  { let t = 0; const pr = api.open(); let resolved = false; pr.then(() => { resolved = true; });
    let lowest = Infinity;
    for (let i = 0; i <= 80; i++) { api.tick(t); lowest = Math.min(lowest, lowY(b)); t += 12; }
    ok(lowest >= -0.0005, `nothing goes below the table at any point of the swing (lowest ${(lowest * 1000).toFixed(2)} mm)`);
    ok(api.isOpen() && Math.abs(api.angle() - Math.PI) < 1e-6, 'the swing ends fully open');
    Promise.resolve().then(() => ok(resolved, 'open() resolves once the cover has landed')); }
  { const cv = box(part('cover')), sp = box(part('spine')), pg = box(part('pages'));
    { const lo = lowY(part('hinge')); ok(lo >= -0.0002 && lo < 0.0008, `open, the front cover rests on the table on its quilt (lowest point ${(lo * 1000).toFixed(2)} mm)`); }
    ok(cv.max.x <= pg.min.x + 0.001, 'open, the front cover lies to the LEFT of the pages');
    { const lo = lowY(part('spine')); ok(Math.abs(lo) < 0.0005, `open, the spine's round rests on the table (bottom at ${(lo * 1000).toFixed(2)} mm)`); }
    ok(Math.abs(part('spineRig').rotation.z - Math.PI / 2) < 1e-6, 'the spine turns half as far as the cover');
    const trayB = box(part('tray')), stick = trays.filter(o => o.visible);
    ok(stick.length > 0 && stick.every(o => box(o).min.y > trayB.max.y), 'open, the tray stickers lie on top of the tray');
    /* The decal lesson (plan § 1): a face-down decal turned over with its
       cover reads upside down unless it was built pre-turned. Its normal must
       face up, and its image-up must point AWAY from the couch (−z), which is
       what "upright" means to someone looking down from the couch. */
    const up = new THREE.Vector3(), nrm = new THREE.Vector3();
    stick.forEach(o => { nrm.set(0, 0, 1).transformDirection(o.matrixWorld); up.set(0, 1, 0).transformDirection(o.matrixWorld);
      ok(nrm.y > 0.99 && up.z < -0.9, `tray sticker ${o.userData.stickerId} faces up and reads upright from the couch`); });
    pockets.forEach(o => { nrm.set(0, 0, 1).transformDirection(o.matrixWorld); up.set(0, 1, 0).transformDirection(o.matrixWorld);
      ok(nrm.y > 0.99 && up.z < -0.99, `pocket sticker ${o.userData.stickerId} faces up and reads upright`); });
    const film = box(part('sleeveFilm')), page = box(part('sleevePage'));
    ok(pockets.every(o => { const pb = box(o); return pb.min.y > page.max.y && pb.max.y < film.min.y; }), 'pocket stickers sit between the page and its clear film');
    const fp = api.focusPose();
    ok(isFinite(fp.point.x) && fp.normal.y > 0.8 && fp.normal.z > 0.2 && fp.w > D.W && fp.h >= D.H, 'focusPose: the spread, looked at from above and toward the couch');
    const bb = box(b); ok(fp.point.x > bb.min.x && fp.point.x < bb.max.x, 'focusPose points inside the open spread'); }

  // close / reset / abandon
  api.close(); ok(!api.isOpen() && api.angle() === 0 && part('spineRig').rotation.z === 0, 'close() shuts at once, spine included');
  api.open({ instant: true }); ok(api.isOpen() && Math.abs(api.angle() - Math.PI) < 1e-9, 'open({ instant }) is the end state, no journey');
  api.reset(); ok(!api.isOpen() && api.angle() === 0, 'reset() leaves it shut');
  { let fired = false; api.open().then(() => { fired = true; }); api.tick(0); api.tick(100); api.close();
    for (let t = 200; t < 2000; t += 50) api.tick(t);
    Promise.resolve().then(() => ok(!fired && !api.isOpen(), 'an open abandoned by close() never resolves')); }
  { api.openCover(true); ok(api.isOpen(), 'openCover(instant) opens (the no-stickerbook fallback)'); api.openCover(true); ok(!api.isOpen() && api.angle() === 0, 'and a second call shuts it');
    api.openCover(false); let t = 0; for (let i = 0; i < 80; i++) { api.tick(t); t += 12; } ok(Math.abs(api.angle() - Math.PI) < 1e-6, 'openCover animated reaches fully open'); api.close(); }

  // the collection: what the shell says is placed and waiting
  { const c0 = api.collection(); ok(c0.placed.length === 4 && c0.tray.length === 3, 'a host that never says shows a demo collection, not an empty book');
    const ids = list.map(s => s.id);
    api.setCollection({ placed: [ids[1], 'nope'], tray: [ids[5], ids[6], ids[7], ids[8], 'nope'] });
    eq(pockets.filter(o => o.visible).map(o => o.userData.stickerId).join(), ids[1], 'only the placed sticker shows in its pocket');
    eq(trays.filter(o => o.visible).length, 3, 'the tray shows at most three');
    eq(api.collection().tray.join(), [ids[5], ids[6], ids[7]].join(), 'the tray shows the first three in the order given; unknown ids are dropped');
    ok(!part('tray-' + ids[8]).visible, 'a fourth tray sticker waits unseen');
    api.setCollection({}); ok(pockets.every(o => !o.visible) && trays.every(o => !o.visible), 'an empty collection is an empty book');
    const tb = box(part('tray')); api.setCollection({ tray: [ids[0], ids[1], ids[2]] });
    ok(trays.filter(o => o.visible).every(o => { const ob = box(o); return ob.min.x >= tb.min.x - 0.004 && ob.max.x <= tb.max.x + 0.004 && ob.min.z >= tb.min.z - 0.004 && ob.max.z <= tb.max.z + 0.004; }), 'every tray slot lies inside the tray');
    const bb = fresh(); ok(bb.userData.api.collection().tray.length === 3, 'building it twice is the same demo'); }
  { const none = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { stickers: { base: '', list: [] }, skipProps: ['controller', 'tv', 'jukebox', 'dial', 'phone', 'lamp', 'shelfContents'] })).binder;
    let n = 0; none.traverse(o => { if (o.isMesh && o.material.userData.prmImage) n++; });
    ok(n === 0 && none.userData.api.collection().placed.length === 0, 'no sticker manifest: an empty book, no throw'); }
  // the door (spec 2026-09-23 § 4): flip, push in, the stickerbook — or the old cover flip without one
  { const a = PrmProps.PRM_ACTIONS.binder;
    eq(a.callback, 'openStickerbook', 'the binder is the stickerbook door');
    ok(a.optional === true && a.fallback === 'openCover', 'still optional, with the cover flip as its fallback');
    ok(typeof api[a.open] === 'function', `its action names a real api method to open it (${a.open})`);
    eq(a.pushIn, 'binder', 'and pushes in on the binder itself — which says where its spread is');
    Object.entries(PrmProps.PRM_ACTIONS).forEach(([id, act]) => { if (!act.open) return;
      const owner = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller'] }))[act.prop || id];
      ok(owner && typeof owner.userData.api[act.open] === 'function', `every "open" action (${id}) names a real api method on its prop`); });
    const Sfx = require(path.join(ROOT, 'wip/premium/prm-sfx.js'));
    ok(Sfx.PRM_SFX_VOICES && Sfx.PRM_SFX_VOICES.indexOf('binderOpen') !== -1, 'prm-sfx has a binderOpen voice');
    ok(Sfx.PRM_SFX_VOICES.indexOf('phoneOpen') !== -1, 'and still the phone\'s'); }

  /* ── THE IDLE (owner, 23 Sep 2026): two beats, weighted, not shuffled —
     a common PEEK (the cover lifts a little, a small gold glow leaks out) and a
     rare REVEAL (it opens right up: a big glow, god-rays, rising gold sparkles).
     75 / 25. Measured off the built transients, every beat ending at rest. */
  { const bb = fresh(), a = bb.userData.api, pp = n => bb.getObjectByName(n);
    ok(typeof a.startBeat === 'function' && typeof a.currentBeat === 'function', 'the binder exposes startBeat / currentBeat like the other idles');
    ['glow', 'rays', 'sparkles', 'bokeh'].forEach(n => ok(pp(n), `the binder has its ${n} transient`));
    const page = pp('sleevePage').material;
    const glowK = () => pp('glow').visible ? pp('glow').material.opacity * pp('glow').scale.x : 0;
    const lit = o => { if (!o.visible) return 0; const c = o.geometry.attributes.color; let s = 0; for (let i = 0; i < c.count; i++) s += c.getW(i); return s; };   // motes fade by alpha
    const glowSize = () => pp('glow').visible && pp('glow').material.opacity > 0.2 ? pp('glow').scale.x : 0;
    const atRest = () => a.angle() === 0 && pp('spineRig').rotation.z === 0 && !pp('glow').visible && !pp('rays').visible
      && !pp('sparkles').visible && !pp('bokeh').visible && page.emissiveIntensity === 0 && !a.isOpen();
    ok(atRest(), 'built at rest: shut, nothing glowing');
    ok(a.startBeat('nope') === false, 'an unknown beat is refused');

    // the peek: a small lift and a small glow, no sparkles, no rays
    { ok(a.startBeat('peek'), 'startBeat("peek")'); let t = 50000, maxA = 0, maxG = 0, spark = 0, rays = false, lowest = Infinity, open = false;
      a.tick(t, 0.016, false);
      for (let e = 0; e < 6000 && a.currentBeat(); e += 25) { t += 25; a.tick(t, 0.025, false);
        maxA = Math.max(maxA, a.angle()); maxG = Math.max(maxG, glowSize()); spark += lit(pp('sparkles')) + lit(pp('bokeh')); if (pp('rays').visible) rays = true; if (a.isOpen()) open = true;
        if (e % 200 === 0) lowest = Math.min(lowest, lowY(bb)); }
      ok(maxA > 0.15 && maxA < 0.6, `the peek lifts the cover a little (${(maxA * 180 / Math.PI).toFixed(0)}°)`);
      ok(maxG > 0, 'and a gold glow leaks out of the gap'); a.__peekGlow = maxG;
      ok(spark === 0 && !rays, 'the peek has no sparkles and no rays — those are the rare beat\'s');
      ok(!open, 'a beat never marks the binder open — that is the door\'s state, not the idle\'s');
      ok(lowest >= -0.0005, `the peek never goes into the table (lowest ${(lowest * 1000).toFixed(2)} mm)`);
      ok(a.currentBeat() === null && atRest(), 'the peek ends exactly at rest'); }

    // the reveal: fully open, a bigger glow, rays and rising sparkles, then shut again
    { ok(a.startBeat('reveal'), 'startBeat("reveal")'); let t = 60000, maxA = 0, maxG = 0, sawSpark = false, sawBokeh = false, sawRays = false, lowest = Infinity, open = false, rise = -Infinity, pageGlow = 0;
      a.tick(t, 0.016, false); const top = box(pp('pages')).max.y;
      for (let e = 0; e < 8000 && a.currentBeat(); e += 25) { t += 25; a.tick(t, 0.025, false);
        maxA = Math.max(maxA, a.angle()); maxG = Math.max(maxG, glowSize()); pageGlow = Math.max(pageGlow, page.emissiveIntensity);
        if (lit(pp('sparkles')) > 0) sawSpark = true; if (lit(pp('bokeh')) > 0) sawBokeh = true; if (pp('rays').visible && pp('rays').material.opacity > 0.05) sawRays = true; if (a.isOpen()) open = true;
        if (lit(pp('sparkles')) > 0) { const s = pp('sparkles'), pos = s.geometry.attributes.position, col = s.geometry.attributes.color, v = new THREE.Vector3(); bb.updateMatrixWorld(true);
          for (let i = 0; i < pos.count; i++) if (col.getW(i) > 0.05) rise = Math.max(rise, v.fromBufferAttribute(pos, i).applyMatrix4(s.matrixWorld).y - top); }
        if (e % 200 === 0) lowest = Math.min(lowest, lowY(bb)); }
      ok(Math.abs(maxA - Math.PI) < 0.02, `the reveal opens the binder right up (${(maxA * 180 / Math.PI).toFixed(0)}°)`);
      ok(maxG > 2 * a.__peekGlow, `with a glow over twice the size of the peek's (${maxG.toFixed(3)} vs ${a.__peekGlow.toFixed(3)})`);
      ok(pageGlow > 0.25, `the pages themselves light up (emissive ${pageGlow.toFixed(2)})`);
      ok(sawRays && sawSpark && sawBokeh, 'god-rays, sparkles and soft bokeh all play');
      ok(rise > 0.08, `the sparkles drift up well clear of the pages (${(rise * 1000).toFixed(0)} mm)`);
      ok(!open, 'the reveal never marks the binder open');
      ok(lowest >= -0.0005, `the reveal never goes into the table (lowest ${(lowest * 1000).toFixed(2)} mm)`);
      ok(a.currentBeat() === null && atRest(), 'the reveal ends exactly at rest — shut, dark, every sparkle gone'); }

    // at rest the transients add nothing to the box the hover and the arrival read
    { const bx = box(bb), b0 = box(fresh());
      ok(bx.min.distanceTo(b0.min) < 1e-6 && bx.max.distanceTo(b0.max) < 1e-6, `after a reveal the bounding box is the closed book's again (top ${(bx.max.y * 1000).toFixed(1)} mm)`); }

    // the odds: 75 / 25 over a long idle, every beat back at rest
    { const seq = []; let t = 100000, prev = null, restOK = true, gaps = [], endT = null;
      for (let i = 0; i < 12000; i++) { t += 50; a.tick(t, 0.05, false); const cb = a.currentBeat();
        if (cb && cb !== prev) { seq.push(cb); if (endT !== null) gaps.push(t - endT); }
        if (!cb && prev) { endT = t; if (!atRest()) restOK = false; }
        prev = cb; }
      const rev = seq.filter(s => s === 'reveal').length / seq.length;
      ok(seq.length >= 40, `enough beats to judge the odds (${seq.length} in 10 min)`);
      ok(rev > 0.15 && rev < 0.35, `about one in four is the reveal (${(rev * 100).toFixed(0)}%)`);
      ok(new Set(gaps).size > 5, `the gaps between beats vary (${new Set(gaps).size} distinct)`);
      ok(restOK, 'every beat of a long idle ends exactly at rest'); }

    // a tap mid-beat: the door takes over from where the cover is, the glow fades out
    { a.startBeat('reveal'); let t = 200000; a.tick(t, 0.016, false); t += 1500; a.tick(t, 0.016, false);
      const before = a.angle(), g0 = glowK(); let res = false; a.open().then(() => { res = true; });
      ok(a.currentBeat() === null, 'open() cancels the beat'); t += 16; a.tick(t, 0.016, false);
      ok(Math.abs(a.angle() - before) < 0.1, `and the swing starts from where the cover was (${before.toFixed(2)} → ${a.angle().toFixed(2)} rad)`);
      t += 16; a.tick(t, 0.016, false);   // the fade's clock starts on the first frame after the tap
      { const g1 = glowK(); ok(g1 > 0 && g1 < g0, `two frames after the tap the glow is still there, dimming (${g0.toFixed(3)} → ${g1.toFixed(3)})`); }
      for (let i = 0; i < 25; i++) { t += 16; a.tick(t, 0.016, false); }
      ok(!pp('glow').visible && !pp('rays').visible && lit(pp('sparkles')) + lit(pp('bokeh')) === 0 && page.emissiveIntensity === 0, 'and gone within the fade (~0.4 s)');
      for (let i = 0; i < 60; i++) { t += 16; a.tick(t, 0.016, false); }   // let the door's swing land before its promise is checked
      ok(!pp('glow').visible && !pp('rays').visible && lit(pp('sparkles')) + lit(pp('bokeh')) === 0 && page.emissiveIntensity === 0, 'the beat\'s glow and sparkles fade out under the door, not snap off at the tap');
      Promise.resolve().then(() => ok(res, 'and the door\'s open() still resolves'));
      let beats = 0; for (let i = 0; i < 1200; i++) { t += 50; a.tick(t, 0.05, false); if (a.currentBeat()) beats++; }
      eq(beats, 0, 'no idle beat while it is open'); ok(a.startBeat('peek') === false, 'and startBeat refuses while open');
      a.close(); ok(atRest(), 'close() is rest'); }

    // reduced motion: nothing starts, the loop is never kept awake
    { const r2 = fresh().userData.api; let any = false; for (let t = 0; t < 60000; t += 50) if (r2.tick(t, 0.05, true) || r2.currentBeat()) any = true;
      ok(!any, 'reduced motion: no beat ever starts and the loop is never kept awake'); }

    // the transients are looks, never picks or shadows
    ['glow', 'rays', 'sparkles', 'bokeh'].forEach(n => { const o = pp(n); ok(!o.castShadow && o.material.depthWrite === false, `${n} is light: no shadow, no depth write`); });
    ['glow', 'rays'].forEach(n => ok(pp(n).material.blending === THREE.AdditiveBlending, `${n} is additive`));
    ['sparkles', 'bokeh'].forEach(n => { const m = pp(n).material, c = pp(n).geometry.attributes.color;
      ok(m.blending === THREE.NormalBlending && m.vertexAlpha === true && c.itemSize === 4, `${n} is alpha-blended with alpha per point, so it reads gold on a light table`);
      ok(c.getX(0) > 0.9 && c.getZ(0) < 0.6, `${n} is gold, not white`); });
    { let tris = 0; bb.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      ok(tris < 120000, `with its transients, still under 120k triangles (${Math.round(tris)})`); } }
  console.log('  (binder section ' + (Date.now() - t0) + ' ms)');
}

section('phone');
{
  /* Prop round 4 (owner, 23 Sep 2026): the clamshell rests CLOSED and a tap
     flips it open. Everything measured here is read off the built meshes —
     the barrel's box gives the axis, the lower half's box gives the deck —
     never re-derived from the builder's constants (plan § 1). */
  const t0 = Date.now();
  const P = PrmProps, built = P.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller', 'tv', 'jukebox', 'dial', 'binder', 'lamp', 'shelfContents'] }));
  const ph = built.phone, api = ph.userData.api, hinge = ph.getObjectByName('hinge');
  ph.updateMatrixWorld(true);
  const box = (name) => new THREE.Box3().setFromObject(ph.getObjectByName(name));
  const underHinge = (o) => { for (let n = o; n; n = n.parent) if (n === hinge) return true; return false; };
  const lidMeshes = [], fixedMeshes = [];
  ph.traverse(o => { if (o.isMesh && o.name !== 'envelope') (underHinge(o) ? lidMeshes : fixedMeshes).push(o); });

  // ── structure and colour sections
  eq(ph.userData.prmId, 'phone', 'the phone group is the pick node');
  ok(!api.isOpen() && api.lidAngle() === 0, 'it rests CLOSED');
  eq(api.backlight(), 0, 'with the backlight off');
  let keys = 0, legends = 0; ph.traverse(o => { if (/^key\d\d$/.test(o.name)) keys++; if (/^legend\d\d$/.test(o.name)) legends++; });
  eq(keys, 12, 'twelve keys'); eq(legends, 12, 'and a legend on each');
  { const cells = new Set(); ph.traverse(o => { if (/^legend\d\d$/.test(o.name)) { const uv = o.geometry.attributes.uv; cells.add(uv.getX(0).toFixed(3) + ',' + uv.getY(0).toFixed(3)); } });
    eq(cells.size, 12, 'each legend reads its own cell of the atlas'); }
  const role = (n) => ph.getObjectByName(n).material.userData.prmRole;
  ['lower', 'lid', 'barrel', 'knuckleL', 'knuckleR'].forEach(n => eq(role(n), 'shell', `${n} is shell`));
  ['bezel', 'ok', 'softKeyL', 'cameraRing'].forEach(n => eq(role(n), 'plate', `${n} is plate`));
  ['badge', 'volumeUp', 'volumeDown'].forEach(n => eq(role(n), 'ears', `${n} is ears — the S is the one mark visible while it rests closed`));
  ['key00', 'key32', 'deck', 'dpad'].forEach(n => eq(role(n), 'buttons', `${n} is buttons`));
  ok(!role('screen'), 'the LCD follows no role');

  // ── CLEARANCE IS A SUM: closed, the lowest thing hanging off the lid clears the tallest thing on the deck
  const DECK = ['deck', 'dpad', 'ok', 'softKeyL', 'softKeyR', 'call', 'end'].concat(Array.from({ length: 12 }, (_, i) => 'key' + Math.floor(i / 3) + (i % 3)));
  const deckTop = Math.max(...DECK.map(n => box(n).max.y));
  const lidLow = Math.min(...['bezel', 'screen', 'earpiece'].map(n => box(n).min.y));
  ok(lidLow - deckTop >= 0.0002, `closed, the bezel clears the keys by ${((lidLow - deckTop) * 1000).toFixed(2)} mm (want ≥ 0.2)`);
  const lowerB = box('lower'), TL = lowerB.max.y;
  const deckB = new THREE.Box3(); DECK.forEach(n => deckB.union(box(n)));

  /* ── THE FLIP NEVER GOES THROUGH THE PHONE. Rays, not vertices (plan § 1):
     an extruded lid has vertices only on its outline, and its big faces are
     exactly what would pass through the barrel or the keys unseen.
       · UP from the underside of the lower half, over its whole footprint:
         the first lid surface above is never inside the lower half — and over
         the deck's own footprint, never below the deck's top. (Two claims, not
         one: the knuckles SIT on the lower half at the sides, turning in place,
         so over there the lid legitimately comes down to the top face.)
       · OUT from the barrel's axis, radially: nothing of the lid inside it.
     Swept from shut to past fully open, so the flip's overshoot is covered. */
  const barrelB = box('barrel'), AX = barrelB.getCenter(new THREE.Vector3()), RB = (barrelB.max.y - barrelB.min.y) / 2, BH = (barrelB.max.x - barrelB.min.x) / 2;
  const dbl = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  function sweepFails(maxDeg, step = 2) {
    const saved = lidMeshes.map(m => m.material); lidMeshes.forEach(m => { m.material = dbl; });
    const rc = new THREE.Raycaster(); let low = 0, inBody = 0, inBarrel = 0, worst = Infinity;
    for (let deg = 0; deg <= maxDeg; deg += step) {
      hinge.rotation.x = -deg * Math.PI / 180; ph.updateMatrixWorld(true);
      for (let x = lowerB.min.x + 0.003; x < lowerB.max.x - 0.002; x += 0.004)
        for (let z = lowerB.min.z + 0.003; z < lowerB.max.z - 0.002; z += 0.004) {
          rc.set(new THREE.Vector3(x, 0.0002, z), new THREE.Vector3(0, 1, 0)); rc.far = 0.2;
          const h = rc.intersectObjects(lidMeshes, false)[0];
          if (!h) continue;
          if (h.point.y < TL - 0.00005) inBody++;
          if (x > deckB.min.x && x < deckB.max.x && z > deckB.min.z && z < deckB.max.z) { worst = Math.min(worst, h.point.y); if (h.point.y < deckTop) low++; }
        }
      for (let x = -BH + 0.001; x <= BH - 0.001; x += (2 * BH - 0.002) / 6)
        for (let k = 0; k < 36; k++) {
          const a = k * Math.PI / 18; rc.set(new THREE.Vector3(x, AX.y, AX.z), new THREE.Vector3(0, Math.sin(a), Math.cos(a))); rc.far = RB - 0.0002;
          if (rc.intersectObjects(lidMeshes, false).length) inBarrel++;
        }
    }
    lidMeshes.forEach((m, i) => { m.material = saved[i]; });
    hinge.rotation.x = 0; ph.updateMatrixWorld(true);
    return { low, inBody, inBarrel, worst };
  }
  const OPEN = P.PRM_PHONE_OPEN_DEG;
  { const s = sweepFails(OPEN + 10);
    eq(s.inBody, 0, 'through the whole flip the lid never enters the lower half');
    eq(s.low, 0, `nor, over the keys and the control deck, dips below their tops (lowest lid surface there: ${((s.worst - TL) * 1000).toFixed(2)} mm above the deck)`);
    eq(s.inBarrel, 0, 'and never passes through the barrel it turns round'); }
  /* Planted drift, well past the 0.4 mm designed in: sink the axis 3 mm and
     both checks must fire, or they prove nothing (DD-22 § 6). */
  { const y0 = hinge.position.y; hinge.position.y -= 0.003; const s = sweepFails(OPEN + 10, 10); hinge.position.y = y0; ph.updateMatrixWorld(true);
    ok(s.low > 0 && s.inBody > 0, `planted: an axis 3 mm low is caught by both deck-ray claims (${s.low} over the keys, ${s.inBody} inside the body)`);
}
  { const z0 = hinge.position.z; hinge.position.z += 0.004; const s = sweepFails(OPEN + 10, 10); hinge.position.z = z0; ph.updateMatrixWorld(true);
    ok(s.inBarrel > 0, `planted: a lid slid 4 mm off its axis is caught by the barrel rays (${s.inBarrel} hits)`); }

  // ── the flip itself
  const lidMax = { v: 0 };
  { const p = api.open({ ms: 480 }); let resolved = false; p.then(() => { resolved = true; });
    ok(api.isOpen(), 'open() marks it open at once, so no idle beat can start under the flip');
    let t = 1000; api.tick(t, 0.016, false);
    for (let i = 0; i < 40; i++) { t += 16; api.tick(t, 0.016, false); lidMax.v = Math.max(lidMax.v, api.lidAngle()); }
    Promise.resolve().then(() => ok(resolved, 'open() resolves once the flip and the backlight are done — the scene waits on it'));
    near(api.lidAngle() * 180 / Math.PI, OPEN, 0.01, 'the flip ends fully open');
    ok(lidMax.v * 180 / Math.PI <= OPEN + 10, `its overshoot stays inside the swept range (${(lidMax.v * 180 / Math.PI).toFixed(1)}°)`);
    eq(api.backlight(), 1, 'and the backlight is up'); }
  { let beats = 0, t = 5000; for (let i = 0; i < 400; i++) { t += 50; api.tick(t, 0.05, false); if (api.currentBeat()) beats++; }
    eq(beats, 0, 'no idle beat while it is open'); }

  /* The push-in's claim: from a camera on the screen's normal, the screen is
     what you see — no lip, knuckle or bezel between it and the lens. */
  { ph.updateMatrixWorld(true); const pose = api.focusPose(), scr = ph.getObjectByName('screen');
    ok(pose.normal.y > 0.5 && pose.normal.z > 0.2, `open, the screen faces up and toward the couch (normal ${pose.normal.toArray().map(v => v.toFixed(2)).join(', ')})`);
    const all = []; ph.traverse(o => { if (o.isMesh && o.visible) all.push(o); });
    let blocked = 0;
    [[0, 0], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]].forEach(([u, v]) => {
      const q = scr.localToWorld(new THREE.Vector3(u * pose.w, 0, -v * pose.h));
      const from = q.clone().addScaledVector(pose.normal, 0.12), rc = new THREE.Raycaster(from, pose.normal.clone().negate(), 0, 0.2);
      const h = rc.intersectObjects(all, false)[0]; if (!h || h.object !== scr) blocked++;
    });
    eq(blocked, 0, 'from the push-in camera the screen is unobstructed, centre and all four corners'); }

  // ── the open phone still fits the table, and hits nothing on it
  { const all = PrmProps.prmBuildAll(global.__prmCtx), R = room.userData.prmRoom;
    const place = (id) => { const g = all[id], p = PrmProps.PRM_PLACES[id]; g.position.set(...p.pos); if (p.rot) g.rotation.set(...p.rot); g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
    all.phone.userData.api.open({ instant: true });
    const pb = place('phone');
    ok(pb.min.x >= R.tableX - 0.57 && pb.max.x <= R.tableX + 0.57 && pb.min.z >= R.tableZ - 0.33 && pb.max.z <= R.tableZ + 0.33, 'OPEN, the phone still sits on the table');
    ['dial', 'binder'].forEach(id => ok(!pb.intersectsBox(place(id)), `and its open lid does not reach the ${id}`)); }

  // close / reset / instant
  api.close(); ok(!api.isOpen() && api.lidAngle() === 0 && api.backlight() === 0, 'close() shuts it and puts the light out');
  api.open({ instant: true }); near(api.lidAngle() * 180 / Math.PI, OPEN, 1e-6, 'open({ instant }) is the end state, no journey (reduced motion)');
  api.reset(); ok(!api.isOpen() && api.lidAngle() === 0, 'reset() is what resetView calls: the room walked back into rests closed');
  { let fired = false; api.open({ ms: 480 }).then(() => { fired = true; }); api.tick(1, 0.016, false); api.close();
    for (let t = 2; t < 2000; t += 50) api.tick(t, 0.05, false);
    Promise.resolve().then(() => ok(!fired, 'an abandoned flip never resolves, so a door the scene gave up on cannot fire later')); }

  // ── the idle: three beats, shuffled, never the same twice, all ending at rest
  { api.close(); const seq = []; let t = 100000, prev = null, restOK = true, lowY = Infinity, sawEnv = false, sawShake = false, sawFlash = false, clapMax = 0;
    const lower = ph.getObjectByName('lower'), pos = lower.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < 2400; i++) {
      t += 50; api.tick(t, 0.05, false); const b = api.currentBeat();
      if (b && b !== prev) seq.push(b);
      if (!b && prev) { ph.updateMatrixWorld(true);
        if (api.tiltAmount() !== 0 || api.hopAmount() !== 0 || api.lidAngle() !== 0 || ph.getObjectByName('shake').rotation.y !== 0 || ph.getObjectByName('envelope').visible) restOK = false; }
      if (b === 'snap') { ph.updateMatrixWorld(true); for (let k = 0; k < pos.count; k += 7) lowY = Math.min(lowY, v.fromBufferAttribute(pos, k).applyMatrix4(lower.matrixWorld).y); }
      if (b === 'buzz') { if (ph.getObjectByName('envelope').visible) sawEnv = true; if (ph.getObjectByName('shake').rotation.y !== 0) sawShake = true; if (ph.getObjectByName('flash').material.emissiveIntensity > 0) sawFlash = true; }
      if (b === 'clap') clapMax = Math.max(clapMax, api.lidAngle());
      prev = b;
    }
    ok(['buzz', 'snap', 'clap'].every(n => seq.includes(n)), `all three beats play in two minutes (${seq.length}: ${seq.join(' ')})`);
    ok(seq.every((b, i) => i === 0 || b !== seq[i - 1]), 'never the same beat twice running');
    ok(restOK, 'every beat ends exactly at rest — lid shut, flat, still, no envelope');
    ok(lowY > -0.0004, `rearing up for the photo rolls on the near edge, never into the table (lowest point ${(lowY * 1000).toFixed(2)} mm)`);
    ok(sawShake && sawFlash && sawEnv, 'the buzz shakes, pulses the light and sends an envelope up');
    ok(clapMax > 0.8 && clapMax < OPEN * Math.PI / 180, `the clap opens part way (${(clapMax * 180 / Math.PI).toFixed(0)}°) — inside the swept range`); }
  { const r2 = P.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller', 'tv', 'jukebox', 'dial', 'binder', 'lamp', 'shelfContents'] })).phone.userData.api;
    let any = false; for (let t = 0; t < 60000; t += 50) if (r2.tick(t, 0.05, true) || r2.currentBeat()) any = true;
    ok(!any, 'reduced motion: no beat ever starts and the loop is never kept awake'); }

  // ── the transients never widen the box the arrival beat and the hover read
  { api.close(); ph.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(ph), stack = box('barrel').max.y;
    ok(b.max.y <= stack + 0.0005, `at rest the envelope and flare add nothing to the bounding box (top ${(b.max.y * 1000).toFixed(1)} mm)`); }

  // ── the ears colour reaches the screen's mascot, and only a change to it repaints
  { const tex = ph.getObjectByName('screen').material.map, v0 = tex.version;
    api.onDesign(Object.assign({}, global.__prmCtx.design, { shell: '#010101' })); eq(tex.version, v0, 'a shell change does not repaint the screen');
    api.onDesign(Object.assign({}, global.__prmCtx.design, { ears: '#abcdef' })); ok(tex.version > v0, 'an ears change repaints the mascot'); }

  // ── the door
  { const a = P.PRM_ACTIONS.phone;
    eq(a.callback, 'enterShelves', 'the phone is still the Shelves door');
    ok(typeof api[a.open] === 'function', `its action names a real api method to open it (${a.open})`);
    eq(a.pushIn, 'phone', 'and pushes in on the phone itself — which says where its screen is');
    ok(!a.fade, 'it no longer fades straight out'); }

  // ── density
  { let tris = 0, meshes = 0; ph.traverse(o => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    ok(tris < 120000, `${meshes} meshes, ${Math.round(tris)} triangles — detailed for the push-in, under 120k`); }
  console.log('  (phone section ' + (Date.now() - t0) + ' ms)');
}

section('lamp-shelf');
{
  const man = global.__prmCtx.lampPanels.manifest;
  const slots = PrmProps.prmLampSlots(man); eq(slots.length, man.panels.length * man.rows, 'slots = panels × rows');
  eq(slots[0].id, 'laughing', 'slot 0 is the first panel'); eq(slots[8].id, 'frustrated', 'slot 8 is the ninth panel');
  const two = PrmProps.prmLampSlots(Object.assign({}, man, { rows: 2 })); eq(two.length, 18, 'two rows double the slots'); eq(two[9].id, 'laughing', 'the second row repeats from the start');
  const built = PrmProps.prmBuildAll(global.__prmCtx); const lamp = built.lamp; ok(lamp, 'lamp builds'); eq(lamp.userData.prmId, 'lamp', 'lamp group is the pick node');
  const films = []; lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) films.push(o.material.userData.prmImage); });
  eq(films.length, man.panels.length, 'one film mesh per panel');
  ok(films.every(u => u.startsWith(global.__prmCtx.lampPanels.base)), 'every film url comes from the lamp base');
  ok(films.every(u => man.panels.some(p => u.endsWith(p.image))), 'no film url outside the manifest');
  lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) ok(o.material.userData.prmEmissiveMap === true, 'portraits are lit from inside (emissiveMap flag)'); });
  const spin = lamp.getObjectByName('spinGroup'); const r0 = spin.rotation.y; const api = lamp.userData.api;
  ok(api.tick(100, 0.1, false) === true, 'lamp idles (active)'); ok(spin.rotation.y > r0, 'idle rotation advances');
  const r1 = spin.rotation.y; api.tick(200, 0.1, true); eq(spin.rotation.y, r1, 'no rotation under reduced motion');
  api.flick(4); api.tick(300, 0.1, false); ok(spin.rotation.y - r1 > 0.2, 'a flick spins it hard');
  /* Prop round 6 (23 Sep 2026): the mockup's shape, and two idle beats over the spin. */
  { const L = lamp.userData.prmLamp, n = man.panels.length, T = PrmProps.PRM_LAMP_TIERS;
    { let tris = 0, meshes = 0, bumped = 0; lamp.traverse(o => { if (o.isMesh) { meshes++; if (o.material.bumpMap) bumped++; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } });
      console.log(`  (lamp: ${meshes} meshes, ${Math.round(tris)} triangles, ${bumped} bumped)`); }
    eq(T, 2, 'two tiers of photos');
    ['base', 'tube', 'tubeBrass', 'tubeBody', 'rig', 'spinGroup', 'cage', 'cards', 'clips'].forEach(nm => ok(lamp.getObjectByName(nm), 'the lamp has its ' + nm));
    /* The lamp's cost is its DRAW CALLS (measured: 66 meshes took the live lounge from ~1.5 to ~1.1 fps
       under SwiftShader and failed visual-shell every run). Budget: no more than the greybox's 28. */
    { let drawn = 0; lamp.traverse(o => { if ((o.isMesh || o.isSprite) && o.visible) drawn++; }); ok(drawn <= 28, 'at rest the lamp draws no more meshes than the greybox did (' + drawn + ', budget 28)'); }
    { const fm = []; lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) fm.push(o); });
      ok(fm.every(o => o.geometry.attributes.position.count === 4 * T && o.geometry.attributes.uv), 'each portrait mesh carries a quad per tier, with its uvs'); }
    ok(lamp.getObjectByName('rig').getObjectByName('spinGroup') === spin, 'the cage turns inside the rig the jiggle shakes');
    ok(!spin.getObjectByName('base') && !spin.getObjectByName('tube'), 'only the cage turns — the puck and the tube stand still');
    let photos = 0; spin.traverse(o => { if (/^photo-\d-\d+$/.test(o.name)) photos++; });
    const cardsM = lamp.getObjectByName('cards');
    eq(photos, n * T, 'one hanging pivot per photo'); eq(cardsM.geometry.attributes.position.count, 24 * n * T, 'a card frame for every photo');
    eq(lamp.getObjectByName('clips').geometry.attributes.position.count, L.CLIP_V * n * T, 'and a clip for every photo');
    ok(cardsM.castShadow, 'the cards cast (the sun throws them)'); ok(!lamp.getObjectByName('clips').castShadow, 'the clips do not');
    eq(L.RODS, 2 * n, 'a rod for every photo: 2n');
    /* the lower tier is turned so no portrait hangs straight under itself */
    const ang = o => Math.atan2(o.position.x, o.position.z), img = pv => pv.userData.image;
    const up = [], lo = []; spin.children.forEach(o => { if (/^photo-0-/.test(o.name)) up.push(o); if (/^photo-1-/.test(o.name)) lo.push(o); });
    ok(lo.every(p => { const q = up.reduce((b, u) => { const d = Math.abs(Math.atan2(Math.sin(ang(u) - ang(p)), Math.cos(ang(u) - ang(p)))); return d < b.d ? { d, u } : b; }, { d: 9 }).u; return img(q) !== img(p); }), 'no portrait hangs straight under itself');
    ok(lo.every(p => Math.hypot(p.position.x, p.position.z) < Math.hypot(up[0].position.x, up[0].position.z)), 'the lower tier hangs inside the upper');
    // the light, at rest: present, dark, shrunk — and NOT a shadow caster (visual-prm: a second caster costs every frame)
    const fillL = lamp.getObjectByName('lampFill'), glowS = lamp.getObjectByName('lampGlow'), poolM = lamp.getObjectByName('lampPool');
    ok(fillL && fillL.isPointLight, 'a point light for the spill'); ok(glowS && glowS.isSprite, 'a halo sprite'); ok(poolM && poolM.isMesh, 'a light pool for the wall');
    { const lights = []; lamp.traverse(o => { if (o.isLight) lights.push(o); }); eq(lights.filter(l => l.castShadow).length, 0, 'no light in the lamp casts — the room keeps its one caster, the sun'); }
    eq(fillL.intensity, 0, 'at rest the spill is dark');
    [glowS, poolM].forEach(o => { ok(!o.visible && o.scale.x <= 0.001, o.name + ' rests shrunk to nothing'); ok(Math.hypot(o.position.x, o.position.z) < 0.03, o.name + ' rests inside the tube (Box3 counts invisible meshes)');
      const rc = []; o.raycast(new THREE.Raycaster(), rc); eq(rc.length, 0, o.name + ' is never a pick target'); });
    ok(!poolM.castShadow && !poolM.receiveShadow, 'the pool neither casts nor receives');
    ok(poolM.material.blending === THREE.CustomBlending && poolM.material.blendSrc === THREE.DstColorFactor && poolM.material.blendDst === THREE.OneFactor, 'the pool lights the wood in its own colour (dst × (1 + src)), never additive');
    eq(api.lightLevel(), 0, 'the lamp rests OFF');
    // light beat: on in the middle, gone after — a shadow pass only while lit
    const rest0 = []; spin.children.forEach(o => { if (/^photo-/.test(o.name)) rest0.push([o, o.rotation.x, o.rotation.z]); });
    const tubeM = lamp.getObjectByName('tubeBody').material, tubeRest = tubeM.emissiveIntensity;
    ok(!api.startBeat('nope'), 'an unknown beat is refused');
    ok(api.startBeat('light'), 'startBeat light'); api.tick(10000, 0, false); api.tick(11200, 0, false);
    ok(api.lightLevel() > 0.9 && fillL.intensity > 0, 'mid-beat: the lamp is on');
    ok(tubeM.emissiveIntensity > tubeRest + 1, 'the tube glows'); ok(glowS.visible && glowS.scale.x > 0.1, 'the halo is up');
    ok(poolM.visible && poolM.scale.x === 1, 'the pool is up');
    { const sh = api.poolShapes(), L = lamp.userData.prmLamp;
      ok(sh.cards > 0 && sh.cards < n * T, 'the pool holds the back photos\' shadows, not the front ones (' + sh.cards + ' of ' + n * T + ')');
      ok(sh.rods > 0 && sh.rods < L.RODS, 'and the back rods\' (' + sh.rods + ' of ' + L.RODS + ')');
      /* placed in the room, the pool lies ON the shelf's back panel, inside the bay the lamp stands in */
      const pl = PrmProps.PRM_PLACES.lamp.pos, R = room.userData.prmRoom, S = room.userData.prmShelf; lamp.position.set(pl[0], pl[1], pl[2]); lamp.updateMatrixWorld(true);
      const pb = new THREE.Box3().setFromObject(poolM);
      ok(pb.min.z > R.backZ + 0.01 && pb.max.z < R.backZ + 0.01 + 0.003, 'the pool lies on the back panel\'s face (z ' + pb.min.z.toFixed(4) + ')');
      ok(pb.min.x >= S.x - S.w / 2 + S.side / 2 && pb.max.x <= S.x + S.w / 2 - S.side / 2, 'between the shelf\'s sides');
      ok(pb.min.y >= S.ys[0] && pb.max.y <= S.ys[1] - 0.01, 'between the lamp\'s board and the one above');
      lamp.position.set(0, 0, 0); lamp.updateMatrixWorld(true);
      const v0 = poolM.material.map.version; spin.rotation.y += 0.3; api.tick(11300, 0.016, false); ok(poolM.material.map.version > v0, 'the pool is redrawn as the cage turns'); }
    api.tick(13100, 0, false); eq(api.currentBeat(), null, 'the light beat ends'); eq(fillL.intensity, 0, 'and switches off');
    ok(!glowS.visible && glowS.scale.x <= 0.001 && !poolM.visible && poolM.scale.x <= 0.001 && tubeM.emissiveIntensity === tubeRest, 'halo, pool and tube back at rest');
    // jiggle: outward only, clear of the back panel, and back exactly to rest
    { const pl = PrmProps.PRM_PLACES.lamp.pos, R = room.userData.prmRoom; lamp.position.set(pl[0], pl[1], pl[2]); lamp.rotation.set(0, 0, 0);
      /* a vertex sweep, not Box3: a merged ring's box turned with the cage reports a corner the cards never reach (DD-24 § 3) */
      const cp = cardsM.geometry.attributes.position, wv = new THREE.Vector3();
      const cardsMinZ = () => { let m = 9; for (let i = 0; i < cp.count; i++) { wv.fromBufferAttribute(cp, i).applyMatrix4(cardsM.matrixWorld); if (wv.z < m) m = wv.z; } return m; };
      const pose0 = cp.array.slice();
      let inward = 0, moved = 0, minZ = 9; ok(api.startBeat('jiggle'), 'startBeat jiggle'); api.tick(20000, 0, false);
      for (let e = 0; e < 2000; e += 25) {
        for (let turn = 0; turn < 4; turn++) {   // the cage turns under the swing: the worst case at every quarter
          spin.rotation.y = turn * Math.PI / 2 + e * 0.001; api.tick(20000 + e, 0, false); lamp.updateMatrixWorld(true);
          rest0.forEach(([o, x]) => { if (o.rotation.x > x + 1e-9) inward++; if (Math.abs(o.rotation.x - x) > 0.05) moved++; });
          minZ = Math.min(minZ, cardsMinZ());
        }
      }
      eq(inward, 0, 'every photo swings OUT only (inward is the rods)'); ok(moved > 0, 'and they really swing');
      ok(minZ > R.backZ + 0.01 + 0.004, "a swinging photo never reaches the shelf's back panel (min z " + minZ.toFixed(3) + ')');
      api.tick(22100, 0, false); eq(api.currentBeat(), null, 'the jiggle ends');
      ok(rest0.every(([o, x, z]) => o.rotation.x === x && o.rotation.z === z), 'every photo back exactly at rest');
      ok(cp.array.every((v, i) => Math.abs(v - pose0[i]) < 1e-6), 'and the drawn cards with them (the merged mesh is re-posed, not left mid-swing)');
      const rig = lamp.getObjectByName('rig'); ok(rig.position.x === 0 && rig.rotation.z === 0 && rig.rotation.x === 0, 'the rig back exactly at rest');
      lamp.position.set(0, 0, 0); lamp.updateMatrixWorld(true); }
    // reduced motion mid-beat: rest, off, idle
    api.startBeat('light'); api.tick(30000, 0, false); api.tick(31000, 0, false); ok(api.lightLevel() > 0, '(lit before the reduced-motion check)');
    ok(api.tick(31100, 0.1, true) === false, 'reduced motion: the lamp idles'); eq(api.lightLevel(), 0, 'reduced motion: the light is off'); ok(!poolM.visible, 'and the pool is down'); eq(api.currentBeat(), null, 'reduced motion: no beat');
    // the schedule: both beats, weighted to the jiggle, never the light twice running
    { const f = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { skipProps: ['controller', 'tv', 'jukebox', 'dial', 'phone', 'binder', 'shelfContents'] })).lamp.userData.api;
      const seq = []; let prev = null; for (let t = 0; t < 900000; t += 50) { f.tick(t, 0.05, false); const b = f.currentBeat(); if (b && b !== prev) seq.push(b); prev = b; }
      const nl = seq.filter(b => b === 'light').length, nj = seq.length - nl;
      ok(seq.length > 60, 'beats keep coming (' + seq.length + ' in 15 min)'); ok(nl > 0 && nj > nl, 'both beats, more jiggles than lights (' + nj + '/' + nl + ')');
      ok(seq.every((b, i) => !(b === 'light' && seq[i - 1] === 'light')), 'never the light twice running'); }
    // hold: a frozen pose for a screenshot of the live room
    { const s0 = spin.rotation.y; ok(api.hold('light', 1200), 'hold a beat'); api.tick(40000, 0.1, false); api.tick(45000, 0.1, false);
      ok(api.lightLevel() > 0.9, 'held lit'); eq(spin.rotation.y, s0, 'the cage stands still while held'); eq(api.currentBeat(), null, 'a hold is not a running beat');
      ok(!api.hold(null), 'let go'); eq(api.lightLevel(), 0, 'letting go rests it'); }
    // an empty manifest still builds a lamp
    { const e = PrmProps.prmBuildAll(Object.assign({}, global.__prmCtx, { lampPanels: { base: 'y/', manifest: {} }, skipProps: ['controller', 'tv', 'jukebox', 'dial', 'phone', 'binder', 'shelfContents'] })).lamp;
      let f = 0; e.traverse(o => { if (o.isMesh && o.material.userData.prmImage) f++; }); eq(f, 0, 'no manifest, no photos'); eq(e.userData.prmLamp.RODS, 18, 'and still a full cage'); }
  }
  /* the shelf's dressing (room pass, item 15): books and toys on the two boards above the lamp,
     in two merged meshes, looks only */
  const shelf = built.shelfContents; ok(shelf, 'shelf dressing builds');
  { const SS = room.userData.prmShelf, D = shelf.userData.prmShelfDressing; let picks = 0, lights = 0, glow = 0; const meshes = [];
    shelf.traverse(o => { if (o.userData.prmId) picks++; if (o.isLight) lights++; if (o.isMesh) { meshes.push(o.name); if (o.material.emissive && o.material.emissive.getHex() !== 0) glow++; } });
    eq(picks, 0, 'nothing on the shelf is interactive'); eq(lights + glow, 0, 'nothing on the shelf lights (owner: no lamps)');
    eq(meshes.sort().join(','), 'shelfBooks,shelfToys', 'two meshes, one per finish');
    ok(shelf.getObjectByName('shelfBooks').material === lib.mats.shelfBooks && shelf.getObjectByName('shelfToys').material === lib.mats.shelfToys, 'each on its shared material');
    const ids = D.items.map(r => r.id);
    ['books-middle', 'rocket', 'stack', 'brontosaurus', 'blocks', 'books-top', 'elephant', 'globe', 'duck', 'penguin', 'turtle'].forEach(id => ok(ids.includes(id), `the ${id} is on the shelf`));
    ok(ids.filter(id => D.items.find(r => r.id === id).bay === 0).length >= 5 && ids.filter(id => D.items.find(r => r.id === id).bay === 1).length >= 5, 'both boards are dressed');
    // every item stands in its bay: across the inner width, within the board's depth, on the board, under the one above
    const bx = [SS.x - SS.inner, SS.x + SS.inner], bz = [SS.z - SS.d / 2 + 0.01, SS.z + SS.d / 2 - 0.004];
    D.items.forEach(r => {
      const top = D.bays[r.bay], ceil = D.ceils[r.bay];
      ok(r.min[0] >= bx[0] && r.max[0] <= bx[1], `${r.id} is inside the bay's width (x ${r.min[0].toFixed(3)}..${r.max[0].toFixed(3)})`);
      ok(r.min[2] >= bz[0] && r.max[2] <= bz[1], `${r.id} is inside the board's depth (z ${(r.min[2] - SS.z).toFixed(3)}..${(r.max[2] - SS.z).toFixed(3)})`);
      ok(r.min[1] >= top - 0.002, `${r.id} does not sink into its board`);
      ok(r.max[1] <= ceil - 0.004, `${r.id} clears the board above (${((ceil - r.max[1]) * 100).toFixed(1)} cm)`);
    });
    near(D.items.find(r => r.id === 'books-middle').min[1], D.bays[0], 0.002, 'the books stand ON the middle board');
    near(D.items.find(r => r.id === 'brontosaurus').min[1], D.items.find(r => r.id === 'stack').max[1], 0.004, 'the brontosaurus stands on the stack');
    // nothing on a board passes through its neighbour (the dinosaur rides the stack, so it is checked against the rest only)
    const clash = []; D.items.forEach((a, i) => D.items.slice(i + 1).forEach(b => {
      if (a.bay !== b.bay || [a.id, b.id].sort().join() === 'brontosaurus,stack') return;
      if (a.max[0] - 0.002 > b.min[0] && b.max[0] - 0.002 > a.min[0] && a.max[1] > b.min[1] && b.max[1] > a.min[1]) clash.push(a.id + '/' + b.id);
    })); eq(clash.join(', '), '', 'no two things on a board overlap');
    near(PrmProps.PRM_PLACES.lamp.pos[1], SS.ys[0] + 0.01, 0.02, 'the photo lamp keeps the LOWEST board, where it reads');
    // the bay's darkness is baked: the same dressing built with no bay term comes out lighter
    const sum = (g) => { let t = 0; g.traverse(o => { if (o.isMesh) o.geometry.attributes.color.array.forEach(v => { t += v; }); }); return t; };
    const flat = PrmProps.prmBuildShelf(lib, Object.assign({}, SS, { cav: () => 1 }));
    ok(sum(shelf) < 0.95 * sum(flat), `the bay's darkness is baked into the dressing (${(sum(shelf) / sum(flat)).toFixed(2)} of unshaded)`);
    let hi = 0; shelf.traverse(o => { if (o.isMesh) o.geometry.attributes.color.array.forEach(v => { hi = Math.max(hi, v); }); }); ok(hi <= 1, 'no vertex colour over 1');
    eq(PrmProps.prmBuildShelf(lib, null).children.length, 0, 'a mount with no room (the review sheet) builds an empty shelf');
    let tris = 0; shelf.traverse(o => { if (o.isMesh) tris += o.geometry.index.count / 3; });
    console.log(`  (shelf dressing: ${D.items.length} items, ${tris} triangles)`);
    ok(tris < 16000, `inside its budget (${tris} triangles)`); }
}

section('contracts');
{
  const A = PrmProps.PRM_ACTIONS, built = PrmProps.prmBuildAll(global.__prmCtx);
  const ids = new Set(); Object.values(built).forEach(g => g.traverse(o => { if (o.userData.prmId) ids.add(o.userData.prmId); }));
  Object.keys(A).forEach(id => ok(ids.has(id), `action id "${id}" exists as a pick node`));
  ids.forEach(id => ok(A[id], `pick node "${id}" has an action`));
  const HOST = new Set(['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher', 'openStickerbook', 'openJukebox', 'music.next']);
  Object.entries(A).forEach(([id, a]) => ok(a.local || HOST.has(a.callback), `"${id}" names a host callback or a local api`));
  ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'].forEach(cb => ok(Object.values(A).some(a => a.callback === cb), `required callback ${cb} is reachable from a prop`));
  eq(Object.values(A).filter(a => a.optional).length, 2, 'exactly two optional actions (the binder and the jukebox knob)');
  PrmProps.PRM_TAB_ORDER.forEach(id => ok(ids.has(id), `tab order id "${id}" exists`));
  // footprints: each prop, placed, sits inside its surface's region (spec § 14 check 1)
  const place = (id) => { const g = built[id], p = PrmProps.PRM_PLACES[id]; g.position.set(...p.pos); if (p.rot) g.rotation.set(...p.rot); g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
  const inside = (bb, r) => bb.min.x >= r.x[0] && bb.max.x <= r.x[1] && bb.min.z >= r.z[0] && bb.max.z <= r.z[1] && bb.min.y >= r.y[0] - 0.01;
  const R = room.userData.prmRoom, S = room.userData.prmShelf;
  const REGIONS = {
    tv:        { x: [R.tableX - 0.60, R.tableX + 0.30], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    jukebox:   { x: [R.tableX - 1.50, R.tableX - 0.60], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    dial:      { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    binder:    { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    phone:     { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    controller:{ x: [-0.85, -0.15], z: [ 0.02,  0.60], y: [R.seatTopY, 1.0] },
    lamp:      { x: [S.x - 0.30, S.x + 0.30], z: [R.backZ, R.backZ + 0.32], y: [S.ys[0], 1.0] },
  };
  Object.entries(REGIONS).forEach(([id, r]) => { const bb = place(id); ok(inside(bb, r), `${id} sits inside its surface region (x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)}, z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)}, y ${bb.min.y.toFixed(2)})`); });
  { const pa = new THREE.Box3().setFromObject(room.getObjectByName('printA'));
    const pb2 = new THREE.Box3().setFromObject(room.getObjectByName('printB'));
    const jbX = PrmProps.PRM_PLACES.jukebox.pos[0], tvX = PrmProps.PRM_PLACES.tv.pos[0];
    [pa, pb2].forEach((b, i) => ok(Math.abs((b.min.x + b.max.x) / 2 - jbX) < Math.abs((b.min.x + b.max.x) / 2 - tvX),
      'print ' + (i ? 'B' : 'A') + ' hangs over the jukebox, not the telly')); }
  // the telly is the focus: centred horizontally, the jukebox left of it (owner, 19 Sep 2026)
  { const tvB = place('tv'), jbB = place('jukebox');
    const tvMid = (tvB.min.x + tvB.max.x) / 2, jbMid = (jbB.min.x + jbB.max.x) / 2;
    ok(Math.abs(tvMid - 0.16) < 0.18, `the telly sits on the camera view axis (mid x ${tvMid.toFixed(2)})`);
    ok(jbMid < tvMid - 0.5, 'the jukebox sits well to the left of the telly'); }
  { const ph = new THREE.Box3().setFromObject(built['phone']);
    ok(Math.abs((ph.min.x + ph.max.x) / 2 - R.tableX) < 0.22, 'the phone sits near the middle of the table (the Shelves door)'); }
  // table props must not overlap each other
  const boxes = ['dial', 'binder', 'phone'].map(id => [id, new THREE.Box3().setFromObject(built[id])]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) ok(!boxes[i][1].intersectsBox(boxes[j][1]), `${boxes[i][0]} and ${boxes[j][0]} do not overlap`);
  /* The koala mug (room pass, round 4) shares the table with three doors. It must clear each of them
     at rest AND opened — the binder's cover swings out and the phone's lid rises — by a hand's gap,
     so it never sits in a tap target's box or under a moving part. */
  { room.updateMatrixWorld(true);
    const mb = new THREE.Box3().setFromObject(room.getObjectByName('mugGroup')).expandByScalar(0.02);
    boxes.forEach(([id, b]) => ok(!mb.intersectsBox(b), `the mug clears the ${id} at rest by 2 cm`));
    built.binder.userData.api.open({ instant: true }); built.phone.userData.api.open({ instant: true });
    ['binder', 'phone'].forEach(id => { const b = place(id); ok(!mb.intersectsBox(b), `and clears the OPEN ${id} too`); });
    built.binder.userData.api.close(); built.phone.userData.api.close(); }
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

section('shell-doors');
{
  const A = PrmProps.PRM_ACTIONS;
  const S = require(path.join(ROOT, 'wip/premium/prm-scene.js'));

  // W4 — the knob is a dormant door to the undecided karaoke/jukebox feature,
  // not the sound overlay it was wrongly pointed at.
  eq(A['jukebox-knob'].callback, 'openJukebox', 'the jukebox knob names openJukebox');
  ok(A['jukebox-knob'].optional === true, 'the jukebox knob is optional');
  /* Prop round 3 (owner, 23 Sep 2026): the knob is gone and the id tags the
     jukebox's whole body, so it can no longer turn — tweenTurn would spin the
     entire cabinet. It answers with the prop's own bop instead, and `prop`
     names whose api that is, because the pick id is not the prop id. */
  ok(!A['jukebox-knob'].turn, 'the jukebox door does not turn — it is the whole body now');
  eq(A['jukebox-knob'].fallback, 'bop', "it answers a tap with the prop's bop");
  eq(A['jukebox-knob'].prop, 'jukebox', 'and names the prop that owns that bop');
  eq(Object.values(A).filter(a => a.callback === 'openSound').length, 1, 'openSound survives at exactly one site');
  eq(A['tv-volume'].callback, 'openSound', "and that site is the telly's volume dial");

  // A dormant door may never be silent.
  Object.entries(A).filter(([, a]) => a.optional).forEach(([id, a]) => {
    ok(a.turn || a.spin || a.pushIn || a.fallback,
       `optional door "${id}" answers a tap (turn/spin/pushIn or a named fallback)`);
  });

  // The optional-function contract, generalised off the hardcoded openStickerbook name.
  /* Optional EFFECTS are a separate list from optional DOORS: a door has a
     destination and must answer a tap, an effect has neither. sfx is the room's
     audio hook -- absent means silence, which is a legitimate host. */
  ok(Array.isArray(S.PRM_EFFECT_FUNCS), 'prm-scene exports PRM_EFFECT_FUNCS');
  ok(S.PRM_EFFECT_FUNCS.includes('sfx'), 'sfx is an optional effect');
  S.PRM_EFFECT_FUNCS.forEach(k => ok(S.PRM_OPTIONAL_FUNCS.indexOf(k) === -1, `${k} is not listed as a dormant door`));
  ok(Array.isArray(S.PRM_OPTIONAL_FUNCS), 'prm-scene exports PRM_OPTIONAL_FUNCS');
  ok(S.PRM_OPTIONAL_FUNCS.includes('openStickerbook'), 'openStickerbook is optional');
  ok(S.PRM_OPTIONAL_FUNCS.includes('openJukebox'), 'openJukebox is optional');
  ok(Array.isArray(S.PRM_FUNCS) && S.PRM_FUNCS.length === 5, 'prm-scene exports PRM_FUNCS (5 callables)');
  S.PRM_OPTIONAL_FUNCS.forEach(k => ok(!S.PRM_REQUIRED.includes(k), `PRM_REQUIRED does not contain ${k}`));

  const base = { games: GAMES, stickers: {}, design: {}, lampPanels: {}, music: {},
                 enterTV() {}, enterShelves() {}, openWorkshop() {}, openSound() {}, openSwitcher() {} };
  S.PRM_OPTIONAL_FUNCS.concat(S.PRM_EFFECT_FUNCS).forEach(k => {
    ok(S.prmValidateHost(Object.assign({}, base)) === true, `a host with no ${k} is accepted`);
    ok(S.prmValidateHost(Object.assign({}, base, { [k]: () => {} })) === true, `a host with ${k} as a function is accepted`);
    let threw = false;
    try { S.prmValidateHost(Object.assign({}, base, { [k]: 'nope' })); } catch (_) { threw = true; }
    ok(threw, `a host with ${k} as a non-function is rejected`);
  });
}

/* Room pass round 1: the contact shade's pure contract. It is shading, so nothing here says how
   dark is right; what it pins are the rules that were each a visible bug once — a box never shades
   itself, a lifted prop shades its own footprint, rounding never reaches under a flat prop — and
   that every r128 chunk the injection hooks actually exists (a missed anchor fails silently). */
section('contact-shade');
{
  const cs = PrmLib.prmContactShade(THREE);
  ok(typeof cs.occlusion === 'function' && cs.MAX === 12, 'prmContactShade is exported, capped at 12 boxes');
  const B = { c: [0, 0.25, 0], h: [0.5, 0.25, 0.3], r: 0.3, s: 0.55 };   // a 1 m bench-ish box standing on the floor
  const up = [0, 1, 0], occ = (p, n = up, b = [B]) => cs.occlusion(p, n, b);
  eq(occ([3, 0, 3]), 1, 'a point out of every reach is unshaded');
  eq(occ([0.1, 0.5, 0]), 1, "a point ON the box's own top face is never shaded by it (nothing shades itself)");
  const at = (dx) => occ([0.5 + dx, 0, 0]);
  ok(at(0.02) < 0.85, `the floor right beside its base is in contact shade (${at(0.02).toFixed(3)})`);
  ok(at(0.02) < at(0.15) && at(0.15) < 1, 'the halo fades with distance');
  eq(at(0.31), 1, 'and is gone past its reach');
  ok(occ([0.52, 0.1, 0], [1, 0, 0]) > occ([0.52, 0.1, 0], [-1, 0, 0]), 'a surface facing away from the box is shaded less than one facing it');
  // the footprint bug: a prop resting on a surface
  const flat = { c: [0, 0.4815, 0], h: [0.08, 0.0075, 0.05], r: 0.07, s: 0.45 };   // a controller-ish slab lifted 4 mm off y=0.47
  ok(cs.occlusion([0, 0.47, 0], up, [flat]) < 0.6, 'a LIFTED prop shades the surface under its own footprint');
  const flatR = Object.assign({}, flat, { k: 0.8 * 0.05 });
  const under = cs.occlusion([0, 0.47, 0], up, [flatR]), corner = cs.occlusion([0.079, 0.47, 0.049], up, [flatR]);
  ok(under < 0.6, `plan rounding never reaches under a flat prop — its footprint stays shaded (${under.toFixed(3)})`);
  ok(corner > under, 'and the AABB corner, outside the rounded footprint, is shaded less than the middle');
  const bx = cs.box([new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.4))], 0.1, 0.5, 0.004, 0.8);
  near(bx.c[1] - bx.h[1], -0.046, 1e-6, "box(): `lift` raises the occluder's floor");
  near(bx.k, 0.08, 1e-6, 'box(): rounding is a fraction of the smaller plan half-size');
  // the room's seams: corner darker than an edge, an edge darker than open floor
  const R = { backZ: -1.55, leftX: -1.6, ceilY: 3.2 };
  const seam = (p) => cs.seams(p, R);
  ok(seam([-1.6, 0, -1.55]) < seam([0, 0, -1.55]) && seam([0, 0, -1.55]) < seam([0, 0, 0]), 'seams: corner < edge < open floor');
  eq(seam([0.5, 0, 0.5]), 1, 'open floor carries no seam term');
  // the bake
  const plane = { axis: 'xz', u: [-1.6, 2.8], v: [-1.55, 2.0], at: 0.006, n: up };
  const t = cs.bake(plane, [B], R, 32, 24), px = (i, j) => t.image.data[(j * 32 + i) * 4];
  ok(t.isDataTexture && t.image.width === 32 && t.image.height === 24 && t.image.data.length === 32 * 24 * 4, 'bake returns a w×h RGBA DataTexture');
  ok(px(0, 0) < px(31, 23), 'the bake is darkest in the back-left corner and lightest out in the room');
  eq(t.generateMipmaps, false, 'the bake builds no mipmaps (a data texture of a soft term needs none)');
  // injection: every chunk it hooks must exist in the vendored r128 standard shader
  const inject = (m) => { const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; m.onBeforeCompile(sh); return sh; };
  const boxes = Array.from({ length: 15 }, (_, i) => ({ c: [i, 0, 0], h: [0.1, 0.1, 0.1], r: 0.1, s: 0.5 }));
  const mb = cs.patchBoxes(new THREE.MeshStandardMaterial(), boxes), shb = inject(mb);
  eq(mb.defines.PRM_AO_BOXES, 12, 'patchBoxes caps a long list at MAX');
  eq(shb.uniforms.uPrmBoxC.value.length, 12, 'and uploads exactly that many boxes');
  ok(/vPrmW = \(modelMatrix/.test(shb.vertexShader), 'vertex: the world-position varying is written (project_vertex hooked)');
  ok(/float prmAo = prmContact\(\)/.test(shb.fragmentShader), 'fragment: the term is applied (aomap_fragment hooked)');
  ok(/uPrmSat\), 0\.0\)/.test(shb.fragmentShader), 'fragment: the room grade runs after tone mapping (tonemapping_fragment hooked)');
  ok(/uniform vec4 uPrmBoxC\[PRM_AO_BOXES\]/.test(shb.fragmentShader), 'fragment: the box uniforms are declared (common hooked)');
  const mp = cs.patchPlane(new THREE.MeshStandardMaterial(), plane, t), shp = inject(mp);
  eq(mp.defines.PRM_AO_AXES, 'vPrmW.xz', 'patchPlane maps a floor by world xz');
  ok(shp.uniforms.uPrmAoMap.value === t && /texture2D\(uPrmAoMap/.test(shp.fragmentShader), 'a plane reads its own bake');
  ok(shp.uniforms.uPrmAoDirect === shb.uniforms.uPrmAoDirect, 'every patched material shares one set of tuning uniforms');
}

/* The room pass, round 2 (24 Sep 2026): the couch is upholstered — pillows (every edge rounded,
   faces that swell), merged per named piece, piping on the seams, and a bouclé sampled triplanar in
   object space. Structure and contracts only; how it looks is the screenshot gate's. */
section('upholstery');
{
  // the pillow: a rounded box of exactly the asked size, swelling only where told
  const P = PrmLib.prmPillow(THREE, 0.6, 0.2, 0.4, 0.05, {}, CB.smoothNormals);
  P.computeBoundingBox(); const pb = P.boundingBox;
  near(pb.max.x - pb.min.x, 0.6, 1e-4, 'pillow: width is what was asked'); near(pb.max.y - pb.min.y, 0.2, 1e-4, 'pillow: height');
  near(pb.max.z - pb.min.z, 0.4, 1e-4, 'pillow: depth');
  const pp = P.attributes.position, pn = P.attributes.normal;
  { let out = true, unit = true, rounded = true;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
      if (x * pn.getX(i) + y * pn.getY(i) + z * pn.getZ(i) <= 0) out = false;
      if (Math.abs(Math.hypot(pn.getX(i), pn.getY(i), pn.getZ(i)) - 1) > 1e-3) unit = false;
      // every vertex lies ON the rounded box: its SDF is zero
      const q = [Math.max(Math.abs(x) - 0.25, 0), Math.max(Math.abs(y) - 0.05, 0), Math.max(Math.abs(z) - 0.15, 0)];
      if (Math.abs(Math.hypot(...q) - 0.05) > 1e-4) rounded = false;
    }
    ok(out, 'pillow: every normal points outward'); ok(unit, 'pillow: normals are unit length');
    ok(rounded, 'pillow: every vertex lies on the rounded box — EVERY edge is rounded, not just an extrusion\'s profile'); }
  const Pf = PrmLib.prmPillow(THREE, 0.6, 0.2, 0.4, 0.05, { puff: { '+y': 0.03 } }, CB.smoothNormals);
  Pf.computeBoundingBox();
  near(Pf.boundingBox.max.y, 0.13, 1e-4, 'pillow: a +y puff swells the top by its amount at the centre');
  near(Pf.boundingBox.min.y, -0.1, 1e-4, 'and nothing else moves');
  near(Pf.boundingBox.max.x, 0.3, 1e-4, 'the puff falls to nothing at the rounded edges (the width holds)');
  // the seam: a cord ON the rounded edge, 45° round it, outward-facing on every face
  ['+y', '-y', '+x', '-x', '+z', '-z'].forEach(face => {
    const S = [0.3, 0.1, 0.2], r = 0.05, rad = 0.0045, G = PrmLib.prmSeam(THREE, S, r, face, rad);
    const a = G.attributes.position; let on = true, vol = 0;
    for (let i = 0; i < a.count; i++) {
      const q = [Math.max(Math.abs(a.getX(i)) - 0.25, 0), Math.max(Math.abs(a.getY(i)) - 0.05, 0), Math.max(Math.abs(a.getZ(i)) - 0.15, 0)];
      if (Math.abs(Math.hypot(...q) - r) > rad + 1e-4) on = false;
    }
    const ix = G.index.array, v = (k) => [a.getX(k), a.getY(k), a.getZ(k)];
    for (let t = 0; t < ix.length; t += 3) { const [p, q, s] = [v(ix[t]), v(ix[t + 1]), v(ix[t + 2])];
      vol += p[0] * (q[1] * s[2] - q[2] * s[1]) - p[1] * (q[0] * s[2] - q[2] * s[0]) + p[2] * (q[0] * s[1] - q[1] * s[0]); }
    ok(on, `seam ${face}: the cord sits on the pillow's rounded edge (within its own radius)`);
    ok(vol > 0, `seam ${face}: the cord is wound outward (a mirrored axis mapping turns it inside out)`);
  });
  // the fabric: triplanar, no UV bump to smear, and every hook lands in the vendored r128 shader
  const fab = lib.mats.fabric;
  ok(!fab.bumpMap, 'fabric carries no UV bumpMap (extrude UVs smear on the bevel — the old sand streaks)');
  eq(fab.defines && fab.defines.PRM_BOUCLE, 1, 'fabric is the bouclé program (a define, so its cache key is its own)');
  ok(fab.userData.prmBoucle.uPrmBoucleMap.value.isTexture, 'fabric samples a bouclé height texture');
  const compile = (m) => { const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; m.onBeforeCompile(sh); return sh; };
  const sb = compile(fab);
  ok(/vPrmBO = transformed; vPrmBN = objectNormal;/.test(sb.vertexShader), 'vertex: the object-space position and normal are passed (begin_vertex hooked)');
  ok(/prmBH = vec3\(h0,/.test(sb.fragmentShader), 'fragment: the height is sampled before lighting (color_fragment hooked)');
  ok(/normal = prmBouclePerturb\(-vViewPosition/.test(sb.fragmentShader), 'fragment: the relief perturbs the normal (normal_fragment_maps hooked)');
  ok(/totalEmissiveRadiance \+= uPrmBoucleRim/.test(sb.fragmentShader), 'fragment: the window rim is added (aomap_fragment hooked)');
  ok(!/texture2D\(uPrmBoucleMap, vUv/.test(sb.fragmentShader), 'the bouclé never reads vUv — triplanar only');
  /* The chain: the contact shade patches the fabric AFTER the bouclé did. Its inject used to
     REPLACE onBeforeCompile, which would drop the bouclé silently — no error, just a plain couch. */
  const both = PrmLib.prmContactShade(THREE).patchBoxes(PrmLib.prmBoucle(THREE, new THREE.MeshStandardMaterial(), lib.tex.boucle()), [{ c: [0, 0, 0], h: [1, 1, 1], r: 0.3, s: 0.5 }]);
  const sc = compile(both);
  ok(/prmBoucleAt/.test(sc.fragmentShader) && /float prmAo = prmContact\(\)/.test(sc.fragmentShader), 'contact shade CHAINS onto the bouclé — both survive in one program');
  ok(sc.fragmentShader.indexOf('float prmAo = prmContact()') < sc.fragmentShader.indexOf('rimAo = prmAo'), 'and the rim reads the contact term after it is computed');
  ok(sc.uniforms.uPrmBoucleMap && sc.uniforms.uPrmBoxC, 'and both sets of uniforms are bound');
  // the couch: nine meshes, cushions separate, the controller resting on a crowned cushion
  const couchMeshes = []; room.traverse(o => { if (o.isMesh && (o.material === lib.mats.fabric || o.material === lib.mats.fabricPiping)) couchMeshes.push(o.name); });
  eq(couchMeshes.length, 9, `the couch draws as nine meshes, parts merged per named piece (${couchMeshes.join(', ')})`);
  eq(room.getObjectByName('seatFront').userData.prmCushions, 3, 'the front run carries three separate seat cushions');
  eq(room.getObjectByName('seatLeft').userData.prmCushions, 1, 'the left run carries its own cushion');
  eq(room.getObjectByName('seatRight').userData.prmCushions, 1, 'and so does the right');
  const piping = room.getObjectByName('couchPiping');
  ok(piping && piping.material === lib.mats.fabricPiping && !piping.castShadow, 'the piping is one mesh, its own material, and casts nothing');
  { const R = room.userData.prmRoom, seatL = room.getObjectByName('seatLeft'), pl = PrmProps.PRM_PLACES.controller.pos;
    room.updateMatrixWorld(true);
    const hit = new THREE.Raycaster(new THREE.Vector3(pl[0], 1, pl[2]), new THREE.Vector3(0, -1, 0)).intersectObject(seatL)[0];
    ok(hit && hit.point.y > R.seatTopY - 0.012 && hit.point.y <= R.seatTopY + 1e-4,
       `the cushion under the controller is at seat height, so it neither floats nor sinks (${hit ? hit.point.y.toFixed(4) : 'no hit'})`); }
}

section('grain');
{
  // the table's wood: object-space grain, a lacquer coat, and the owner's honey tone held
  const wood = lib.mats.walnut, gu = wood.userData.prmGrain;
  ok(!wood.map && !wood.bumpMap, 'the table wood carries no UV map or bump (the rounded top\'s UVs smear on its edges)');
  eq(wood.defines && wood.defines.PRM_GRAIN, 1, 'the table wood is the grain program (a define, so its cache key is its own)');
  ok(wood.isMeshPhysicalMaterial && wood.clearcoat > 0, 'the table wood is lacquered (a clearcoat over the grain)');
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const got = hex(gu.uPrmGrainMap.value.userData.prmMean), want = hex('#9a6a43');
  ok(got.every((v, i) => Math.abs(v - want[i]) <= 2), `the grain tile's mean is the table's honey tone — the owner kept it (got ${gu.uPrmGrainMap.value.userData.prmMean})`);
  const compile = (m) => { const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader }; m.onBeforeCompile(sh); return sh; };
  const sg = compile(wood);
  ok(/vPrmGO = transformed; vPrmGN = objectNormal;/.test(sg.vertexShader), 'vertex: the object-space position and normal are passed (begin_vertex hooked)');
  ok(/diffuseColor\.rgb \*= sRGBToLinear/.test(sg.fragmentShader), 'fragment: the grain is the albedo (color_fragment hooked)');
  ok(/roughnessFactor = min\(1\.0, roughnessFactor \+ uPrmGrainRough/.test(sg.fragmentShader), 'fragment: the grain breaks the highlight (roughnessmap_fragment hooked)');
  ok(/normal = prmGrainPerturb\(-vViewPosition/.test(sg.fragmentShader), 'fragment: the relief perturbs the normal (normal_fragment_maps hooked)');
  ok(!/texture2D\(uPrmGrainMap, vUv/.test(sg.fragmentShader), 'the grain never reads vUv — object space only');
  const both = compile(PrmLib.prmContactShade(THREE).patchBoxes(PrmLib.prmGrain(THREE, new THREE.MeshPhysicalMaterial({ clearcoat: 0.5 }), lib.tex.grain()), [{ c: [0, 0, 0], h: [1, 1, 1], r: 0.3, s: 0.5 }]));
  ok(/prmGrainAt/.test(both.fragmentShader) && /float prmAo = prmContact\(\)/.test(both.fragmentShader) && both.uniforms.uPrmGrainMap && both.uniforms.uPrmBoxC,
     'the contact shade CHAINS onto the grain — both survive in one program, both uniform sets bound');
  // and the other order: the grain must chain too, or patching an already-shaded material drops the shade
  const rev = compile(PrmLib.prmGrain(THREE, PrmLib.prmContactShade(THREE).patchBoxes(new THREE.MeshPhysicalMaterial(), [{ c: [0, 0, 0], h: [1, 1, 1], r: 0.3, s: 0.5 }]), lib.tex.grain()));
  ok(/prmGrainAt/.test(rev.fragmentShader) && /float prmAo = prmContact\(\)/.test(rev.fragmentShader), 'the grain CHAINS onto an already-shaded material as well');
  // the legs: built along x (the grain axis) and stood up by the mesh; they taper, and they reach floor and top
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(room.getObjectByName('tableTop'));
  [0, 1, 2, 3].forEach(i => {
    const leg = room.getObjectByName('tableLeg' + i), g = leg.geometry; g.computeBoundingBox();
    const lb = g.boundingBox, wb = new THREE.Box3().setFromObject(leg), p = g.attributes.position;
    let foot = 0, head = 0;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = Math.abs(p.getZ(k)); if (x < lb.min.x + 1e-4) foot = Math.max(foot, z); if (x > lb.max.x - 1e-4) head = Math.max(head, z); }
    ok(leg.material === wood && lb.max.x - lb.min.x > 4 * (lb.max.y - lb.min.y) && wb.max.y - wb.min.y > 4 * (wb.max.x - wb.min.x),
       `tableLeg${i}: long along OBJECT x, standing in the world — its grain runs down the leg`);
    ok(foot > 0 && foot < head * 0.8, `tableLeg${i}: tapers to the foot (${(2 * foot).toFixed(3)} m at the floor, ${(2 * head).toFixed(3)} m under the top)`);
    ok(Math.abs(wb.min.y - R.floorY) < 1e-3 && wb.max.y > top.max.y - 0.06 && wb.max.y <= top.max.y - 0.049, `tableLeg${i}: stands on the floor and meets the top's underside`);
  });
}

/* The room pass, round 6 (24 Sep 2026): the wallpaper. Its contracts, not its looks: the walls' UVs
   are metres, so the one tile prints the same size on both (the old 0..1 UVs squeezed the 4 m side
   wall 30% narrower than the 5.6 m back one), and the print runs on round the corner. */
/* The braided rug (room pass, item 11): banded multi-colour ropes where it was a two-tone bullseye.
   The grade was tuned on the old rug, so its disc tone is held; the bump is the same field. */
section('rug');
{
  const rug = lib.mats.rug, t = rug.map, u = t.userData;
  ok(u.prmRings >= 30, `the ropes are rug-thin: ${u.prmRings} rings across 0.88 m (the old rug had 22)`);
  ok(rug.bumpMap === u.prmBump, 'the rug carries the braid\'s own height field as its bump');
  ok(t.encoding === THREE.sRGBEncoding && rug.bumpMap.encoding === THREE.LinearEncoding, 'the braid is colour (sRGB), the bump is data (linear)');
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), dm = hex(u.prmMean).map((c, i) => Math.abs(c - hex('#966b4c')[i]));
  ok(Math.max(...dm) <= 3, `the rug's disc mean stays on the tone the grade was tuned on (${u.prmMean} vs #966b4c)`);
  ok(lib.mats.rugEdge.color.getHexString() === u.prmEdge.slice(1), `the rope edge takes the outer ring's colour (${u.prmEdge})`);
  ok(lib.tex.braid() === t, 'the braid is built once: the rug and its edge share one field');
}

section('wallpaper');
{
  const R = room.userData.prmRoom, wall = lib.mats.wall, t = wall.map, u = t.userData;
  const [TW, TH] = u.prmTile;
  ok(TW > 0.5 && TH > 0.5, `the tile is measured in metres (${TW} × ${TH} m)`);
  near(t.repeat.x, 1 / TW, 1e-9, 'repeat is one tile per TW metres across'); near(t.repeat.y, 1 / TH, 1e-9, 'and per TH metres up');
  ok(wall.bumpMap === u.prmBump, 'the wall carries the tile\'s own paper-grain bump');
  ok(!!wall.bumpMap && wall.bumpMap.repeat.equals(t.repeat), 'the bump shares the print\'s tile (r128 samples it through the map\'s uvTransform anyway)');
  ok(t.encoding === THREE.sRGBEncoding && !!wall.bumpMap && wall.bumpMap.encoding === THREE.LinearEncoding, 'the print is colour (sRGB), the bump is data (linear)');
  eq(u.prmStars, 11, 'the star sampler placed every star it was asked for (it gives up silently after 4000 tries)');
  // the room's grade and fill were tuned (round 1) on the old paper, whose mean was #f6cdaf: the new print must not shift it
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), dm = hex(u.prmMean).map((c, i) => Math.abs(c - hex('#f6cdaf')[i]));
  ok(Math.max(...dm) <= 3, `the paper's mean stays on the tone the grade was tuned on (${u.prmMean} vs #f6cdaf)`);
  ok(u.prmInk > 0.01 && u.prmInk < 0.08, `the print is sparse, as the mockup's is (${(u.prmInk * 100).toFixed(1)}% of the tile under ink)`);
  /* UVs against WORLD position, per wall: fit u and v along the wall's own axes from its vertices. A metre of
     wall must be a metre of UV on both, v must be the height above the floor, and at the corner the two u's meet. */
  room.updateMatrixWorld(true);
  const fit = (name, axis) => {
    const m = room.getObjectByName(name), pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv, p = new THREE.Vector3(), s = [];
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); s.push({ a: p[axis], y: p.y, u: uv.getX(i), v: uv.getY(i) }); }
    const lo = s.reduce((a, b) => (b.a < a.a ? b : a)), hi = s.reduce((a, b) => (b.a > a.a ? b : a)), bot = s.reduce((a, b) => (b.y < a.y ? b : a)), top = s.reduce((a, b) => (b.y > a.y ? b : a));
    const du = (hi.u - lo.u) / (hi.a - lo.a);
    return { du, dv: (top.v - bot.v) / (top.y - bot.y), v0: bot.v - bot.y * (top.v - bot.v) / (top.y - bot.y), at: x => lo.u + (x - lo.a) * du };
  };
  const back = fit('wallBack', 'x'), side = fit('wallLeft', 'z');
  near(Math.abs(back.du), 1, 1e-6, 'the back wall runs one UV unit per metre along it');
  near(Math.abs(side.du), 1, 1e-6, 'and so does the side wall, so the print is the same size on both');
  near(back.dv, 1, 1e-6, 'one UV unit per metre up the back wall'); near(side.dv, 1, 1e-6, 'and up the side wall');
  near(back.v0, 0, 1e-6, 'v is the height above the floor on the back wall'); near(side.v0, 0, 1e-6, 'and on the side wall');
  near(back.at(R.leftX), side.at(R.backZ), 1e-6, `the print is continuous round the corner (u ${back.at(R.leftX).toFixed(3)} on both walls)`);
  ok(back.du > 0 && side.du < 0, 'u runs away from the corner along the back wall and toward it down the side wall (a sheet folded round the corner, not mirrored)');
}

/* The room pass, round 5 (24 Sep 2026, revised to the owner's oak media-unit reference): the TV bench.
   Structure and the carcass's contracts; how it looks is the screenshot gate's. */
section('bench');
{
  const R = room.userData.prmRoom, B = room.userData.prmBench; room.updateMatrixWorld(true);
  const get = (n) => room.getObjectByName(n), box = (n) => new THREE.Box3().setFromObject(get(n));
  const oak = lib.mats.oak, gu = oak.userData.prmGrain;
  ['bench', 'benchBase', 'benchDrawerL', 'benchDrawerR'].forEach(n => ok(get(n).material === oak, `${n} is oak`));
  ok(oak.defines && oak.defines.PRM_GRAIN === 1 && !oak.map && !oak.clearcoat, 'the oak is the object-space grain program, satin (no UV map, no clearcoat)');
  ok(1 / gu.uPrmGrainTile.value.x >= B.W, `one grain tile spans the whole bench, so its figure never repeats along the front (${(1 / gu.uPrmGrainTile.value.x).toFixed(2)} m >= ${B.W} m)`);
  // oak is vertexColors (the bay's baked cavity), so every oak geometry must carry colours or it renders black
  ['bench', 'benchBase', 'benchDrawerL', 'benchDrawerR'].forEach(n => {
    const c = get(n).geometry.attributes.color;
    ok(oak.vertexColors && c && c.count === get(n).geometry.attributes.position.count, `${n} carries a colour per vertex (the oak is vertexColors)`);
  });
  // the top is benchTopY (the telly and jukebox rest on it); the base's legs reach the floor
  const bb = box('bench'), base = box('benchBase');
  near(bb.max.y, R.benchTopY, 0.001, 'the bench top is prmRoom.benchTopY');
  near(base.min.y, R.floorY, 0.001, 'the legs stand on the floor');
  ok(base.max.y > B.Y0 - 0.004, 'and the rails meet the carcass, no gap under it');
  // the bay: open at the front, darker at the back — the baked cavity, since the contact shade skips its own box
  { const g = get('bench').geometry, p = g.attributes.position, c = g.attributes.color; let mouth = 1, back = 1, outside = 1;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), v = c.getX(i);
      if (Math.abs(x) < B.CW / 2 - 0.01 && y > B.Y0 + B.PANEL && y < B.TOP0 - 0.01) { if (z > B.D / 2 - 0.02) mouth = Math.min(mouth, v); if (z < -B.D / 2 + 0.02) back = Math.min(back, v); }
      if (Math.abs(x) > B.CW / 2 + 0.02 || y > R.benchTopY - 0.001) outside = Math.min(outside, v);
    }
    ok(back < 0.6 && mouth > 0.9, `the bay darkens from its mouth to its back (${mouth.toFixed(2)} -> ${back.toFixed(2)})`);
    eq(outside, 1, 'and nothing outside the bay is tinted'); }
  // each front: flush over its carcass with a reveal, and its pull in front of it and inside it
  ['L', 'R'].forEach(s => {
    const d = box('benchDrawer' + s), k = box('benchKnob' + s), face = R.benchZ + B.D / 2;
    near(d.max.z, face, 0.001, `benchDrawer${s}: its face is flush with the bay floor's edge`);
    ok(d.min.y > B.Y0 && d.max.y < B.TOP0 && d.min.x > bb.min.x && d.max.x < bb.max.x, `benchDrawer${s} sits inside the carcass, a reveal all round`);
    ok(k.min.z >= d.max.z - 0.001 && k.max.z - d.max.z < 0.05, `benchKnob${s} stands off its front, a pull's depth (${((k.max.z - d.max.z) * 1000).toFixed(0)} mm)`);
    ok(k.min.x > d.min.x && k.max.x < d.max.x && k.min.y > d.min.y && k.max.y < d.max.y, `benchKnob${s} lies inside its front's outline`);
    ok(!get('benchKnob' + s).castShadow && !get('benchDrawer' + s).castShadow, `benchKnob${s} and its front cast nothing (the carcass does)`);
  });
  // the acorn: a lathe whose normals face out, a darker cap over a brass nut
  { const g = get('benchKnobR').geometry, A = g.userData.prmAcorn, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    let cz = 0; for (let i = 0; i < A.nLathe; i++) cz += p.getZ(i); cz /= A.nLathe;
    let out = 0, bad = 0, nut = 0, cap = 0, nN = 0, nC = 0;
    for (let i = 0; i < A.nLathe; i++) {
      const x = p.getX(i), z = p.getZ(i) - cz, r = Math.hypot(x, z), j = i % A.points;
      if (r > 0.006 && j > 1 && j < A.capAt - 1) { if ((n.getX(i) * x + n.getZ(i) * z) / r > 0.3) out++; else bad++; }
      const l = c.getX(i) + c.getY(i) + c.getZ(i); if (j < A.capAt) { nut += l; nN++; } else { cap += l; nC++; }
    }
    ok(out > 50 && bad === 0, `the acorn's nut faces out (${out} ok, ${bad} not)`);
    ok(cap / nC < 0.7 * (nut / nN), 'its cap is darker than its nut (vertex colours)'); }
  // the bay's contents rest on the bay floor, inside the opening — reachable by the eye
  /* Room pass, item 14 (25 Sep 2026): the Play-Max 2000 on the shelf and the floppy-disk box under it,
     to the owner's two renders. One opaque mesh (text from a small atlas) and the box's smoked lid. */
  { const cb = box('cubby'), lb = box('cubbyLid'), O = B.open, K = B.diskBox, cub = get('cubby'), lid = get('cubbyLid');
    const g = cub.geometry, p = g.attributes.position, uv = g.attributes.uv, A = lib.mats.cubby.map && lib.mats.cubby.map.userData.prmAtlas;
    near(cb.min.y, O.y[0], 0.002, 'the disk box rests on the bay floor');
    ok(cb.min.x > O.x[0] && cb.max.x < O.x[1] && cb.max.y < O.y[1] && cb.min.z > O.z[0] && cb.max.z < O.z[1], 'the deck and the disk box sit inside the open bay');
    ok(lb.min.x > O.x[0] && lb.max.x < O.x[1] && lb.min.z > O.z[0] && lb.max.z < O.z[1] && lb.max.y < B.SHELF_Y - 0.009 - 0.01, `the lid is inside the bay and clears the shelf over it (${((B.SHELF_Y - 0.009 - lb.max.y) * 1000).toFixed(0)} mm)`);
    { let lo = 1; for (let i = 0; i < p.count; i++) if (p.getY(i) > B.SHELF_Y) lo = Math.min(lo, p.getY(i));
      near(lo, B.SHELF_Y + 0.009, 0.001, 'the deck stands on the shelf'); }
    ok(cub.material === lib.mats.cubby && g.attributes.color && uv && uv.count === p.count, 'one mesh: a colour and a uv per vertex');
    const m = lid.material;
    ok(m === lib.mats.diskLid && m.transparent && m.opacity < 0.8 && !m.depthWrite && !lid.castShadow, 'the lid is smoked acrylic: see-through, writes no depth, casts nothing');
    // the atlas carries only text: the deck's name and a label per disk; every other vertex samples its white block
    ok(A && A.white[0] > 0.02 && A.white[0] < 0.23 && A.white[1] > 0.52 && A.white[1] < 0.98, 'the white texel sits well inside the atlas\'s white block (no bleed at a mip edge)');
    const inR = (r, u, v) => u >= r[0] - 1e-6 && u <= r[2] + 1e-6 && v >= r[1] - 1e-6 && v <= r[3] + 1e-6;
    let white = 0, name = 0, labels = 0, stray = 0, outside = 0; const q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (Math.abs(u - A.white[0]) < 1e-6 && Math.abs(v - A.white[1]) < 1e-6) white++;
      else if (inR(A.playMax, u, v)) name++;
      else if (A.disks.some(r => inR(r, u, v))) { labels++; q.fromBufferAttribute(p, i); cub.localToWorld(q); if (!lb.containsPoint(q)) outside++; }
      else stray++;
    }
    ok(name === 4 && labels === 4 * K.N && stray === 0, `the decals are the name and ${K.N} disk labels; nothing else samples the text (${name}, ${labels}, ${stray} stray)`);
    eq(outside, 0, 'every disk label is under the lid');
    ok(typeof A.panel === 'string' && A.panel[0] === '#', 'the deck panel\'s colour is the atlas\'s label ground (one value, no seam)'); }
  /* nothing sealed inside the stand: the cassette deck once sat inside the old solid body, unseen,
     for a round. Anything within the carcass's box must be within the open bay. */
  { const inner = bb.clone().expandByScalar(-0.005), O = B.open, hid = [];
    const bay = new THREE.Box3(new THREE.Vector3(O.x[0], O.y[0] - 0.002, O.z[0]), new THREE.Vector3(O.x[1], O.y[1], O.z[1] + 0.001));
    room.traverse(o => {
      if (!o.isMesh || ['bench', 'benchDrawerL', 'benchDrawerR'].includes(o.name)) return;
      const b = new THREE.Box3().setFromObject(o); if (inner.containsBox(b) && !bay.containsBox(b)) hid.push(o.name);
    });
    eq(hid.join(','), '', 'no mesh is sealed inside the bench, where no camera can see it'); }
  // the contact pass: the oak, the pulls and the bay's contents take the wood's boxes and the room grade
  { const lib2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), room2 = PrmRoom.prmBuildRoom(lib2); room2.updateMatrixWorld(true);
    const had = global.PrmLib; global.PrmLib = PrmLib;
    PrmScene.prmContactPass(THREE, lib2, room2, {});
    if (had === undefined) delete global.PrmLib; else global.PrmLib = had;
    ['oak', 'acorn', 'cubby', 'diskLid'].forEach(k => { const ao = lib2.mats[k].userData.prmAo; ok(ao && ao.mode === 'boxes' && ao.count === lib2.mats.walnut.userData.prmAo.count, `${k} takes the wood's contact boxes and the room grade`); }); }
  { let tris = 0, meshes = 0; const per = [];
    ['bench', 'benchBase', 'benchDrawerL', 'benchDrawerR', 'benchKnobL', 'benchKnobR', 'cubby', 'cubbyLid'].forEach(n => { const g = get(n).geometry; meshes++; tris += g.index.count / 3; per.push(n + " " + g.index.count / 3); });
    console.log(`  (bench: ${meshes} meshes, ${Math.round(tris)} triangles: ${per.join(", ")})`); ok(tris < 15000, `a piece of furniture, not a hero prop (${Math.round(tris)} triangles)`); }
}

/* The room pass, item 12 (25 Sep 2026): the bookshelf unit brought up to the table's and the stand's
   finish. Structure and contracts; how it looks is the screenshot gate's. */
section('bookshelf');
{
  const R = room.userData.prmRoom, S = room.userData.prmShelf; room.updateMatrixWorld(true);
  const get = (n) => room.getObjectByName(n), box = (n) => new THREE.Box3().setFromObject(get(n));
  const NAMES = ['shelfBack', 'shelfSideL', 'shelfSideR', 'shelfBoard0', 'shelfBoard1', 'shelfBoard2', 'shelfBoardBase', 'shelfTop'];
  const bg = lib.mats.birchGrain;
  ok(bg && bg.defines && bg.defines.PRM_GRAIN === 1 && !bg.map && !bg.clearcoat && bg.vertexColors, 'the shelf wood is the object-space grain program: satin, no UV map, vertexColors');
  ok(bg.onBeforeCompile.toString() === lib.mats.oak.onBeforeCompile.toString() && bg.type === lib.mats.oak.type, 'and the same program as the oak, so it compiles nothing new');
  NAMES.forEach(n => {
    const m = get(n), c = m && m.geometry.attributes.color;
    ok(m && m.material === bg && c && c.count === m.geometry.attributes.position.count, `${n} is birch, with a colour per vertex (vertexColors renders black without)`);
  });
  // the lamp draws its pool on the back's face: it must stay at backZ + 0.01
  near(box('shelfBack').max.z, R.backZ + 0.01, 0.0005, "the back's face is where the lamp's pool is drawn (backZ + 0.01)");
  { const g = get('shelfBack').geometry, n = g.attributes.normal, p = g.attributes.position, q = get('shelfBack').quaternion, v = new THREE.Vector3();
    let away = 0, zs = new Set();
    for (let i = 0; i < n.count; i++) { if (v.fromBufferAttribute(n, i).applyQuaternion(q).z < 0.99) away++; zs.add(p.getZ(i).toFixed(4)); }
    eq(away, 0, 'every vertex of the back faces the room, square on');
    eq(zs.size, 1, 'the back is ONE flat panel, no board seams (owner: planks were too busy)'); }
  // the contents rest on the boards: each board's top is ys + 0.01, and the sides stand on the floor
  S.ys.forEach((y, i) => near(box('shelfBoard' + i).max.y, y + 0.01, 0.001, `shelfBoard${i}'s top is ys[${i}] + 0.01, where its contents stand`));
  ['L', 'R'].forEach(s => { const b = box('shelfSide' + s);
    near(b.min.y, R.floorY, 0.001, `shelfSide${s} stands on the floor`); ok(b.max.y > box('shelfTop').min.y, `shelfSide${s} runs up into the top, no gap under it`);
    ok(Math.abs(get('shelfSide' + s).rotation.z - Math.PI / 2) < 1e-6, `shelfSide${s} is built lying along x and stood up, so its grain runs up it`); });
  { const t = box('shelfTop'); ok(t.max.z - (S.z + S.d / 2) > 0.015 && t.min.z >= R.backZ - 0.001, 'the top stands 2 cm proud of the front and stops at the wall'); }
  /* To the owner's mockup: a BASE board low down, the lamp on the board above it (second from the
     bottom), and under the base only a short gap to the floor — no apron — between the legs, kept open
     and empty (owner, 25 Sep 2026). */
  { const U = S.under, base = box('shelfBoardBase');
    near(base.max.y, S.baseY, 0.001, 'the base board\'s top is prmShelf.baseY');
    ok(S.baseY > 0.07 && S.baseY < 0.13, `the base board sits low, as the mockup's does (top at ${(S.baseY * 100).toFixed(1)} cm)`);
    ok(base.max.y < S.ys[0] && PrmProps.PRM_PLACES.lamp.pos[1] > S.ys[0], 'the lamp stands on the SECOND board from the bottom, the base below it');
    ok(U && U.y[0] === R.floorY && Math.abs(U.y[1] - base.min.y) < 1e-6, 'prmShelf.under runs from the floor to the base board');
    ok(U.y[1] > 0.06 && U.y[1] < 0.1, `the gap is short, as in the mockup (${(U.y[1] * 100).toFixed(1)} cm)`);
    ok(!get('shelfPlinth'), 'no apron under the base: the gap is open');
    const space = new THREE.Box3(new THREE.Vector3(U.x[0] + 0.002, U.y[0] + 0.002, U.z[0] + 0.002), new THREE.Vector3(U.x[1] - 0.002, U.y[1] - 0.002, U.z[1]));
    const inside = []; room.traverse(o => { if (o.isMesh && space.intersectsBox(new THREE.Box3().setFromObject(o)) && !['floor', 'wallBack', 'rug', 'skirtingBack'].includes(o.name)) inside.push(o.name); });   // skirtingBack's box spans its gap; its vertices are checked below
    eq(inside.join(','), '', 'nothing stands in the open space under the lowest board'); }
  // the skirting stands proud of the shelf's back, so it must stop at the sides, not show through the bottom bay
  { const g = get('skirtingBack').geometry, pp = g.attributes.position, L = box('shelfSideL').max.x, Rr = box('shelfSideR').min.x; let inside = 0;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) + get('skirtingBack').position.x; if (x > L + 0.001 && x < Rr - 0.001) inside++; }
    eq(inside, 0, 'the back skirting stops at the shelf\'s sides'); }
  // the baked cavity: the contact shade skips its own box, so the bays' darkness lives in the colours
  { const m = get('shelfBoard1'), g = m.geometry, p = g.attributes.position, c = g.attributes.color, n = g.attributes.normal; let mouth = 0, back = 1;
    for (let i = 0; i < p.count; i++) { if (n.getY(i) < 0.9) continue;   // its top face only
      const wz = p.getZ(i) + m.position.z - S.z; if (wz > S.d / 2 - 0.02) mouth = Math.max(mouth, c.getX(i)); if (wz < -S.d / 2 + 0.02) back = Math.min(back, c.getX(i)); }
    ok(mouth > 0.8 && back < 0.65, `a board's top darkens from the mouth to the back (${mouth.toFixed(2)} -> ${back.toFixed(2)})`); }
  { const g = get('shelfTop').geometry, c = g.attributes.color, n = g.attributes.normal; let up = 1, under = 1;
    for (let i = 0; i < c.count; i++) { if (n.getY(i) > 0.9) up = Math.min(up, c.getX(i)); if (n.getY(i) < -0.9) under = Math.min(under, c.getX(i)); }
    eq(up, 1, "the top's upper face is outside the bays, untinted");
    ok(under < 0.6, `its underside is the upper bay's ceiling, dark at the back (${under.toFixed(2)})`); }
  { const m = get('shelfSideR'), g = m.geometry, n = g.attributes.normal, c = g.attributes.color, q = m.quaternion, v = new THREE.Vector3(); let outer = 1, inner = 1;
    for (let i = 0; i < n.count; i++) { const nx = v.fromBufferAttribute(n, i).applyQuaternion(q).x; if (nx > 0.9) outer = Math.min(outer, c.getX(i)); if (nx < -0.9) inner = Math.min(inner, c.getX(i)); }
    eq(outer, 1, "a side's outer face is untinted"); ok(inner < 0.7, `and its inner face darkens into the bays (${inner.toFixed(2)})`); }
  // the contact pass: the birch takes the wood's boxes and the room grade, as the oak does
  { const lib2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), room2 = PrmRoom.prmBuildRoom(lib2); room2.updateMatrixWorld(true);
    const had = global.PrmLib; global.PrmLib = PrmLib;
    PrmScene.prmContactPass(THREE, lib2, room2, {});
    if (had === undefined) delete global.PrmLib; else global.PrmLib = had;
    const ao = lib2.mats.birchGrain.userData.prmAo; ok(ao && ao.mode === 'boxes' && ao.count === lib2.mats.oak.userData.prmAo.count, "the birch takes the wood's contact boxes and the room grade");
    ['shelfBooks', 'shelfToys'].forEach(k => eq(lib2.mats[k].userData.prmAo && lib2.mats[k].userData.prmAo.mode, 'grade', `the shelf's ${k === 'shelfBooks' ? 'books' : 'toys'} take the room grade and no box loop (their bay is baked)`)); }
  { let tris = 0; const per = []; NAMES.forEach(n => { const k = get(n).geometry.index.count / 3; tris += k; per.push(n + ' ' + k); });
    console.log(`  (bookshelf: ${NAMES.length} meshes, ${tris} triangles: ${per.join(', ')})`);
    ok(tris < 8000, `inside its measured budget (${tris} triangles; 13.3k cost +4.6% held-state, 5.6k +2.7%)`); }
}

/* The room pass, round 4 (24 Sep 2026): the koala mug. Structure, placement, and the steam's motion
   contract — it moves only on frames already being drawn and stands still under reduced motion.
   How it looks is the screenshot gate's. */
section('mug');
{
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const g = room.getObjectByName('mugGroup'), M = g.userData.prmMug, get = (n) => g.getObjectByName(n);
  ['mug', 'mugFace', 'mugBlush', 'mugCoffee', 'mugSteam'].forEach(n => ok(get(n) && get(n).isMesh, `the mug has ${n}`));
  let meshes = 0, painted = 0, picks = 0; g.traverse(o => { if (o.isMesh) { meshes++; if (o.material.userData.prmRole) painted++; } if (o.userData.prmId) picks++; });
  eq(meshes, 5, 'the mug draws as five meshes (body, handle and ears merged into one glaze)');
  eq(painted, 0, 'the mug is furniture - no design role'); eq(picks, 0, 'and no pick target');
  // it rests on the table, inside its top, in the hero zone's free corner
  const wb = new THREE.Box3().setFromObject(g);
  near(wb.min.y, R.tableTopY, 0.001, 'the mug rests on the table top');
  ok(wb.min.x > R.tableX - 0.55 + 0.03 && wb.max.x < R.tableX + 0.55 - 0.03 && wb.min.z > R.tableZ - 0.31 + 0.03 && wb.max.z < R.tableZ + 0.31 - 0.03,
     `and sits inside it, 3 cm clear of every edge (x ${wb.min.x.toFixed(3)}..${wb.max.x.toFixed(3)}, z ${wb.min.z.toFixed(3)}..${wb.max.z.toFixed(3)})`);
  // the lathe: outer wall faces out, inner wall faces the cavity (the profile's order decides it)
  { const bg = get('mug').geometry, p = bg.attributes.position, n = bg.attributes.normal; let oOk = 0, oBad = 0, iOk = 0, iBad = 0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (x > 0 || y < 0.02 || y > 0.075) continue;   // the handle is on +x and the ears above the rim
      const d = (n.getX(i) * x + n.getZ(i) * z) / r;
      if (Math.abs(r - M.rOut(y)) < 1e-4) { if (d > 0.5) oOk++; else oBad++; } else if (Math.abs(r - M.rIn(y)) < 1e-4) { if (d < -0.5) iOk++; else iBad++; }
    }
    ok(oOk > 100 && oBad === 0, `the outer wall's normals face out (${oOk} ok, ${oBad} not)`);
    ok(iOk > 100 && iBad === 0, `the inner wall's normals face the cavity (${iOk} ok, ${iBad} not)`); }
  // the handle is on +x and nothing juts from the face side; the ears stand proud of the rim
  { const bb = get('mug').geometry; bb.computeBoundingBox(); const b = bb.boundingBox;
    ok(b.max.x > M.rim + 0.02, `the handle stands out on +x (${(b.max.x - M.rim).toFixed(3)} m past the rim)`);
    ok(b.min.x > -M.rim - 0.012, 'nothing but an ear sticks out on the face-left side');
    ok(b.max.y > M.H + 0.02, `the koala ears stand above the rim (${(b.max.y - M.H).toFixed(3)} m)`); eq(M.ears, 2, 'two ears');
    const fb = get('mugFace').geometry; fb.computeBoundingBox();
    ok(fb.boundingBox.min.z > 0.02, 'the face (nose and eyes) is on the +z side, toward the couch');
    ok(fb.boundingBox.max.y < M.H && fb.boundingBox.min.y > 0.02, 'and on the wall, between foot and rim'); }
  // the coffee fills to just under the rim, tucked a hair into the wall so no gap shows
  ok(M.coffeeR > M.innerAtCoffee && M.coffeeR - M.innerAtCoffee < 0.0015, `the coffee meets the inner wall (overlap ${((M.coffeeR - M.innerAtCoffee) * 1000).toFixed(2)} mm)`);
  ok(M.coffeeY < M.H - 0.008 && M.coffeeY > M.H * 0.7, 'and sits below the rim, most of the way up');
  { const c = get('mugCoffee').geometry.attributes.color, p = get('mugCoffee').geometry.attributes.position; let mid = -1, edge = -1;
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); if (r < 1e-6) mid = i; else if (edge < 0) edge = i; }
    ok(mid >= 0 && c.getX(mid) < c.getX(edge), 'its crema: darker in the middle, lighter at the edge (vertex colours)'); }
  // shadows: the glazed body casts; the small parts and the steam do not
  ok(get('mug').castShadow, 'the mug body casts');
  ['mugFace', 'mugBlush', 'mugCoffee', 'mugSteam'].forEach(n => ok(!get(n).castShadow, `${n} casts nothing`));
  // the steam: a see-through billboard, and a motion contract
  { const s = get('mugSteam'), m = s.material, u = M.steam;
    ok(m.transparent && m.depthWrite === false && !s.receiveShadow, 'the steam is transparent, writes no depth, and receives no shadow');
    ok(/viewMatrix\[0\]\[0\]/.test(m.vertexShader) && !m.map, 'it is a billboard drawn in its own shader — no texture');
    const t0 = u.uTime.value;
    const ret = room.userData.prmTick(12345, false);
    near(u.uTime.value, 12.345, 1e-9, 'the room tick drives the steam from the frame time');
    eq(ret, undefined, 'and returns nothing: the steam never asks for a frame of its own');
    room.userData.prmTick(5000, true); const r1 = u.uTime.value; room.userData.prmTick(9000, true);
    ok(u.uTime.value === r1 && r1 === t0, 'under reduced motion it stands still, in the same pose it was built in');
    ok(s.visible && m.uniforms.uOpacity.value > 0, 'and is still there: reduced motion loses the journey, not the steam'); }
  // the contact pass, on a fresh lib and room (it patches shared materials)
  { const lib2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), room2 = PrmRoom.prmBuildRoom(lib2); room2.updateMatrixWorld(true);
    const had = global.PrmLib; global.PrmLib = PrmLib;
    const out = PrmScene.prmContactPass(THREE, lib2, room2, {});
    if (had === undefined) delete global.PrmLib; else global.PrmLib = had;
    ['mugGlaze', 'mugInk', 'mugBlush', 'coffee'].forEach(k => {
      const ao = lib2.mats[k].userData.prmAo;
      ok(ao && ao.mode === 'boxes' && ao.count === 1, `${k} takes the room grade and ONE contact box (the table top)`);
    });
    ok(out.boxes > 0 && lib2.mats.walnut.userData.prmAo.count === 4, 'the table wood counts the mug as an occluder (table, bench, shelf, mug)');
    ok(lib2.mats.walnut.userData.prmAo.count <= PrmLib.prmContactShade(THREE).MAX, 'still inside the 12-box cap'); }
  { let tris = 0; g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    console.log(`  (mug: ${meshes} meshes, ${Math.round(tris)} triangles)`); ok(tris < 15000, `a table ornament, not a hero prop (${Math.round(tris)} triangles)`); }
}

/* The room pass, item 10 (25 Sep 2026): the puppy slippers. Contracts: two meshes for the pair, on the
   rug, clear of each other, the couch and the table's legs, SEEN from the wide preset (the strip they
   stand in is ~20 cm wide — the couch on one side, the table's overhang on the other), and the rug
   darker under each foot. How they look is the screenshot gate's. */
section('slippers');
{
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const g = room.getObjectByName('slippersGroup'), D = g.userData.prmSlippers, get = (n) => g.getObjectByName(n);
  ['slippers', 'slipperFace'].forEach(n => ok(get(n) && get(n).isMesh, `the pair has ${n}`));
  let meshes = 0, painted = 0, picks = 0, tris = 0;
  g.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.index.count / 3; if (o.material.userData.prmRole) painted++; } if (o.userData.prmId) picks++; });
  eq(meshes, 2, 'the pair draws as two meshes (the plush, and the nose and eyes)'); eq(D.pairs, 2, 'a pair');
  eq(painted, 0, 'the slippers are furniture - no design role'); eq(picks, 0, 'and no pick target');
  ok(get('slippers').castShadow && !get('slipperFace').castShadow, 'the plush casts; the nose and eyes do not');
  ok(get('slippers').material === lib.mats.slipper && get('slippers').material.vertexColors, 'the plush is one vertex-coloured material');
  // on the rug, wholly inside it (clear of its rope edge), flat on its top
  const wb = new THREE.Box3().setFromObject(g);
  near(wb.min.y, R.rugTopY, 0.0005, 'the slippers stand on the rug top');
  near(R.rugTopY, new THREE.Box3().setFromObject(room.getObjectByName('rug')).max.y, 1e-6, 'and the rug top is where the rug is');
  const rug = room.getObjectByName('rug').position;
  D.feet.forEach((f, k) => ok(f.every(([x, z]) => Math.hypot(x - rug.x, z - rug.z) < 0.88 - 0.03), `slipper ${k + 1} is on the rug, 3 cm inside its edge`));
  // clear of each other: no outline point of one inside the other's outline grown by 1 cm
  const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - zi) / (zj - zi) + xi) c = !c; } return c; };
  const grow = (poly, m) => { const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length, cz = poly.reduce((a, q) => a + q[1], 0) / poly.length;
    return poly.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz); return [cx + (x - cx) * (d + m) / d, cz + (z - cz) * (d + m) / d]; }); };
  ok(!D.feet[1].some(q => inPoly(q, grow(D.feet[0], 0.01))) && !D.feet[0].some(q => inPoly(q, grow(D.feet[1], 0.01))), 'the two footprints stand at least 1 cm apart');
  // clear of the couch and the table's legs (whole slipper, ears and all)
  const boxes = D.boxes.map(b => new THREE.Box3(new THREE.Vector3(...b.min), new THREE.Vector3(...b.max)));
  /* The couch, by its own vertices at slipper height: its box is set by the seat cushion 26 cm up,
     which stands proud of the base the slippers actually sit beside. */
  { const s = room.getObjectByName('seatLeft'), sp = s.geometry.attributes.position, v = new THREE.Vector3(); let front = -9;
    for (let i = 0; i < sp.count; i++) { v.fromBufferAttribute(sp, i).applyMatrix4(s.matrixWorld); if (v.y < 0.12) front = Math.max(front, v.x); }
    /* Stepped out of on that couch (owner, 25 Sep 2026): heels AT its base, not touching it; toes away
       from it; the two side by side, not one ahead of the other. */
    boxes.forEach((b, k) => ok(b.min.x > front + 0.004 && b.min.x < front + 0.03, `slipper ${k + 1}'s heel is at the left couch's base, not in it (${((b.min.x - front) * 1000).toFixed(0)} mm clear)`));
    D.pose.forEach((q, k) => ok(Math.sin(q.yaw) > 0.85, `slipper ${k + 1} points away from the couch, into the room (${(90 - q.yaw * 180 / Math.PI).toFixed(0)}° off square)`));
    const [a, b] = D.pose, dir = [(Math.sin(a.yaw) + Math.sin(b.yaw)) / 2, (Math.cos(a.yaw) + Math.cos(b.yaw)) / 2], dx = b.x - a.x, dz = b.z - a.z;
    ok(Math.abs(a.yaw - b.yaw) < 0.3, `the pair lies near parallel (splayed ${((b.yaw - a.yaw) * 180 / Math.PI).toFixed(0)}°)`);
    /* Side by side, not one ahead: both HEELS level against the couch. (Not "no stagger along the pair's
       line" — turned toward the camera with both heels at the couch, the near one always sits a little
       ahead along its own line, and that is how a pair stepped out of looks.) */
    const heel = (q) => { const h = PrmRoom.PRM_SLIPPER.L / 2 * (q.scale || 1); return [q.x - h * Math.sin(q.yaw), q.z - h * Math.cos(q.yaw)]; };
    const [ha, hb] = [heel(a), heel(b)];
    ok(Math.abs(ha[0] - hb[0]) < 0.015, `side by side: the heels are level against the couch (${((ha[0] - hb[0]) * 1000).toFixed(0)} mm apart in depth)`);
    ok(dx * dir[0] + dz * dir[1] < 0.08, 'and neither is a step ahead of the other');
    ok(Math.hypot(dx, dz) < 0.15, `and together (${(Math.hypot(dx, dz) * 100).toFixed(1)} cm between centres)`); }
  // their floppy ears hang past their own sides: neither may land on the other slipper, nor on the other's ear
  { const p = get('slippers').geometry.attributes.position;
    /* By the builder's record of each ear's vertex range — not by colour (the eye patch is painted in
       the ear's colour) and not by nearest centre (an inner ear hangs nearly half way to its neighbour). */
    eq(D.ears.map(e => e.length).join(','), '2,2', 'the builder records two ears per slipper');
    const E = D.ears.map(list => { const out = []; list.forEach(([s, n]) => { for (let i = s; i < s + n; i++) out.push([p.getX(i), p.getY(i), p.getZ(i)]); }); return out; });
    ok(E[0].length > 100 && E[1].length > 100, 'both slippers have their ears');
    ok(!E[0].some(q => inPoly([q[0], q[2]], grow(D.feet[1], 0.003))) && !E[1].some(q => inPoly([q[0], q[2]], grow(D.feet[0], 0.003))), 'no ear hangs over the other slipper');
    let dmin = 9; for (const u of E[0]) for (const v of E[1]) dmin = Math.min(dmin, Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]));
    ok(dmin > 0.004, `and the two inner ears do not meet (${(dmin * 1000).toFixed(0)} mm apart)`); }
  [0, 1, 2, 3].forEach(i => { const lb = new THREE.Box3().setFromObject(room.getObjectByName('tableLeg' + i)).expandByScalar(0.01);
    ok(boxes.every(b => !b.intersectsBox(lb)), `both slippers clear table leg ${i} by 1 cm`); });
  // the body faces out: every sole-bottom vertex looks down
  { const bg = get('slippers').geometry, p = bg.attributes.position, n = bg.attributes.normal; let down = 0, bad = 0;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - R.rugTopY) < 1e-5) { if (n.getY(i) < -0.9) down++; else bad++; }
    ok(down > 200 && bad === 0, `the sole's underside faces down (${down} ok, ${bad} not)`); }
  // the colours: a dark sole band under a pale plush, a lining in the heel, chocolate ears that droop
  { const bg = get('slippers').geometry, p = bg.attributes.position, c = bg.attributes.color, lum = (i) => 0.3 * c.getX(i) + 0.59 * c.getY(i) + 0.11 * c.getZ(i);
    const ear = new THREE.Color('#4a2c20'), lining = new THREE.Color('#dfa29c'); let sole = [0, 0], crown = [0, 0], earY = [1, -1], lin = 0;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) - R.rugTopY;
      if (y < 0.008) { sole[0] += lum(i); sole[1]++; } else if (y > 0.07) { crown[0] += lum(i); crown[1]++; }
      if (D.ears.some(list => list.some(([s, n]) => i >= s && i < s + n))) { earY[0] = Math.min(earY[0], y); earY[1] = Math.max(earY[1], y); }
      if (c.getX(i) > c.getY(i) * 1.12 && c.getX(i) <= lining.r + 1e-6 && y < 0.03 && y > 0.015) lin++;
    }
    ok(sole[0] / sole[1] < 0.5 * crown[0] / crown[1], `the sole band is dark under a pale plush (luma ${(sole[0] / sole[1]).toFixed(2)} vs ${(crown[0] / crown[1]).toFixed(2)})`);
    ok(lin > 50, `the open heel shows a pink lining on its footbed (${lin} vertices)`);
    ok(earY[1] - earY[0] > 0.03 && earY[0] > 0.005, `the ears flop: they fall ${((earY[1] - earY[0]) * 100).toFixed(1)} cm and stop short of the rug`); }
  // seen: from the wide preset, every nose and eye is in frame and nothing stands in front of it
  { const pr = PrmScene.PRM_PRESETS.wide, cam = new THREE.PerspectiveCamera(pr.fov, 16 / 9, 0.05, 20);
    cam.position.set(...pr.pos); cam.lookAt(...pr.look); cam.updateMatrixWorld(true);
    const occ = []; room.traverse(o => { if (o.isMesh && o.material && !o.material.transparent && o !== get('slipperFace')) occ.push(o); });
    const rc = new THREE.Raycaster(), parts = D.features.map(a => new THREE.Vector3(...a));
    eq(parts.length, 6, 'the builder records a nose and two eyes per slipper');
    let seen = 0; parts.forEach(v => {
      const ndc = v.clone().project(cam); if (Math.abs(ndc.x) > 0.98 || Math.abs(ndc.y) > 0.98) return;
      const d = v.clone().sub(cam.position), L = d.length(); rc.set(cam.position, d.normalize()); rc.far = L - 0.004;
      if (rc.intersectObjects(occ, false).length === 0) seen++;
    });
    eq(seen, 6, 'from the wide preset, both noses and all four eyes are in frame and unoccluded'); }
  // the contact pass, on a fresh lib: the grade on both materials, and a darker rug under each foot
  { const pass = (strip) => { const l2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), r2 = PrmRoom.prmBuildRoom(l2);
      if (strip) r2.remove(r2.getObjectByName('slippersGroup')); r2.updateMatrixWorld(true);
      const had = global.PrmLib; global.PrmLib = PrmLib; const out = PrmScene.prmContactPass(THREE, l2, r2, {});
      if (had === undefined) delete global.PrmLib; else global.PrmLib = had; return { out, l2 }; };
    const a = pass(false), b = pass(true);
    eq(a.out.boxes - b.out.boxes, 2, 'the floor bake counts one box per slipper, not one round the pair');
    ['slipper', 'slipperInk'].forEach(k => ok(a.l2.mats[k].defines && a.l2.mats[k].defines.PRM_GRADE_ONLY === 1, `${k} takes the room grade, and no box loop`));
    const tex = (m, x, z) => { const im = m.image, i = Math.floor((x - R.leftX) / (2.8 - R.leftX) * im.width), j = Math.floor((z - R.backZ) / (2.0 - R.backZ) * im.height); return im.data[(j * im.width + i) * 4]; };
    D.pose.forEach((q, k) => { const with_ = tex(a.out.maps.floor, q.x, q.z), without = tex(b.out.maps.floor, q.x, q.z);
      ok(with_ < without - 10, `the rug darkens under slipper ${k + 1} (${without} → ${with_})`); }); }
  console.log(`  (slippers: ${meshes} meshes, ${Math.round(tris)} triangles)`); ok(tris < 30000, `a floor ornament, not a hero prop (${Math.round(tris)} triangles for the pair)`);
}

/* The room pass, round 7 (24 Sep 2026): the throw cushions. Contracts only — one mesh on one atlas,
   each cushion resting on the seat and touching what it leans on, and none of them in the way of a
   door. How they look is the screenshot gate's. */
section('cushions');
{
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const m = room.getObjectByName('cushions'), L = m && m.userData.prmCushions;
  ok(m && m.isMesh && m.material === lib.mats.cushion, 'the cushions are ONE mesh, on their own material');
  const tex = lib.mats.cushion.map;
  ok(tex && tex.isTexture && tex.userData.prmCells === 4, 'on one atlas of four cells');
  ok(lib.mats.cushion.vertexColors, 'their contact shade is baked into vertex colours');
  ok(m.castShadow, 'they cast (the sun is still the only caster light)');
  eq(L.length, 4, 'four cushions');
  eq(new Set(L.map(c => c.cell)).size, 4, 'each on its own atlas cell, so all four designs are used');
  ok(L.some(c => c.shape === 'round') && L.some(c => c.shape === 'square'), 'a round one among the squares');
  ok(!L.some(c => c.cell === 'face'), 'no face cushion (owner, 24 Sep 2026)');
  L.forEach((c, i) => { if (c.leansOn) { const j = L.findIndex(b => b.id === c.leansOn); ok(j >= 0 && j < i && L[j].side === c.side, `${c.id} leans on ${c.leansOn}, built before it, in the same corner`); } });
  const g = m.geometry, P = g.attributes.position, UV = g.attributes.uv, C = g.attributes.color;
  ok(g.attributes.normal && UV && C && UV.count === P.count && C.count === P.count, 'position, normal, uv and colour all present, one per vertex');
  eq(L.reduce((a, c) => a + c.verts, 0), P.count, 'the list accounts for every vertex, in order');
  // each cushion's UVs stay inside its own cell of the atlas
  const CELL = { star: 0, round: 1, sprig: 2, stripe: 3 };
  let off = 0; const ranges = {};
  L.forEach(c => {
    const k = CELL[c.cell], u0 = (k % 2) * 0.5, v0 = Math.floor(k / 2) * 0.5; let inside = true;
    for (let i = off; i < off + c.verts; i++) { const u = UV.getX(i), v = UV.getY(i); if (u < u0 - 1e-6 || u > u0 + 0.5 + 1e-6 || v < v0 - 1e-6 || v > v0 + 0.5 + 1e-6) inside = false; }
    ok(inside, `${c.id}: every UV lies inside its own atlas cell`);
    ranges[c.id] = [off, off + c.verts]; off += c.verts;
  });
  let cLo = 1, cHi = 0; for (let i = 0; i < C.count; i++) { cLo = Math.min(cLo, C.getX(i)); cHi = Math.max(cHi, C.getX(i)); }
  ok(cHi <= 1 && cLo > 0.15 && cLo < 0.8, `the baked shade darkens where they touch, and never to black (${cLo.toFixed(3)}..${cHi.toFixed(3)})`);
  const pts = (id) => { const [a, b] = ranges[id], out = []; for (let i = a; i < b; i++) out.push([P.getX(i), P.getY(i), P.getZ(i)]); return out; };
  /* They SIT, measured against the couch's REAL surfaces (raycast), not a plane: the seat is crowned
     and the backs swell, and a flat plane at a back's corner let the lumbar sink 1.7 cm into its swell
     further along. Every 5th vertex: never more than ~1 cm into the seat or the back (a cushion is
     soft, so a little); and each cushion's lowest point is ON the seat, not floating above it. */
  const surf = (mesh, from, dir) => { const h = new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...dir)).intersectObjects([].concat(mesh))[0]; return h ? h.point : null; };
  /* the seat under a side's cushions is its own run AND the front run (the round sits where they meet);
     a ray that falls through the 1 cm seam between two seat cushions to the base is a seam, not a seat */
  const seatHit = (meshes, p) => { const h = surf(meshes, [p[0], 1.5, p[2]], [0, -1, 0]); return h && h.y > R.seatTopY - 0.1 ? h : null; };
  L.forEach(c => {
    const A = pts(c.id), seat = [room.getObjectByName(c.side === 'left' ? 'seatLeft' : 'seatRight'), room.getObjectByName('seatFront')], back = room.getObjectByName(c.side === 'left' ? 'backLeft' : 'backRight');
    const sx = c.side === 'left' ? 1 : -1, xIn = c.side === 'left' ? 0.5 : 0.8;   // a point well inside the room, to cast at the back from
    let intoSeat = 0, intoBack = 0, low = A[0];
    for (let i = 0; i < A.length; i += 5) {
      const p = A[i]; if (p[1] < low[1]) low = p;
      const hs = seatHit(seat, p); if (hs) intoSeat = Math.max(intoSeat, hs.y - p[1]);
      const hb = surf(back, [xIn, p[1], p[2]], [-sx, 0, 0]); if (hb) intoBack = Math.max(intoBack, sx * (hb.x - p[0]));
    }
    ok(intoSeat > -0.003, `${c.id} touches the seat somewhere — it does not float (${(intoSeat * 100).toFixed(1)} cm in, at its deepest)`);
    ok(intoSeat < 0.022, `${c.id} sinks into the seat no more than a soft cushion does (${(intoSeat * 100).toFixed(1)} cm at worst)`);
    ok(intoBack < 0.012, `${c.id} never digs into the back (${(intoBack * 100).toFixed(1)} cm at worst)`);
    /* and no part of the foot hangs over a DROP: under any downward-facing point near the foot, the seat is
       never more than 1.5 cm below the cushion's own lowest point. (A round resting on its rim rises away from
       it by its own shape — that is air it has always had; the lumbar's corner over the front roll was not.) */
    let hang = 0; const lowY = Math.min(...A.map(p => p[1])), NY = g.attributes.normal, i0 = ranges[c.id][0];
    const seamZ = new THREE.Box3().setFromObject(room.getObjectByName('seatFront')).min.z;   // where a side run meets the front run
    for (let i = 0; i < A.length; i += 5) { const p = A[i]; if (p[1] > lowY + 0.03 || NY.getY(i0 + i) > -0.3) continue;
      if (Math.abs(p[2] - seamZ) < 0.085) continue;   // a cushion across that seam BRIDGES the dip where both seat cushions round off (their 7 cm edge radius + the gap)
      const hs = seatHit(seat, p); if (hs) hang = Math.max(hang, lowY - hs.y); }
    ok(hang < 0.015, `${c.id}'s foot follows the seat down — no part of it hangs over a drop (${(hang * 100).toFixed(1)} cm at worst)`);
  });
  // the cloth sheen chains with the contact shade: both survive in one program
  { const m2 = PrmLib.prmContactShade(THREE).patchBoxes(PrmLib.prmSheen(THREE, new THREE.MeshStandardMaterial()), [{ c: [0, 0, 0], h: [1, 1, 1], r: 0.3, s: 0.5 }]);
    const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; m2.onBeforeCompile(sh);
    ok(/prmSh = 1\.0 \+ uPrmSheen/.test(sh.fragmentShader) && /float prmAo = prmContact\(\)/.test(sh.fragmentShader) && !!sh.uniforms.uPrmSheen, "the cushions' cloth sheen and the contact shade both survive in one program");
    ok(lib.mats.cushion.defines.PRM_SHEEN === 1, 'the cushion material is the sheen program'); }
  // they keep their stuffing: settling dents a cushion, it never empties or turns one inside out
  L.forEach(c => ok(c.vol0 > 0 && c.vol / c.vol0 > 0.8, `${c.id} keeps its stuffing through the settle (${(100 * c.vol / c.vol0).toFixed(0)}% of its posed volume, ${(c.vol * 1000).toFixed(1)} L)`));
  // one lies flat on the seat, face up, like a cushion to sit on (owner, 24 Sep 2026): its face looks at the ceiling
  L.filter(c => c.lies).forEach(c => { const A = pts(c.id), ys = A.map(p => p[1]), span = Math.max(...ys) - Math.min(...ys);
    ok(span < 0.25, `${c.id} lies flat — it is no taller than it is thick, give or take its stuffing (${(span * 100).toFixed(1)} cm)`); });
  // the rear one of each corner leans on its back; each front one touches the one it leans on
  const backFace = (side) => { const b = new THREE.Box3().setFromObject(room.getObjectByName(side === 'left' ? 'backLeft' : 'backRight')); return side === 'left' ? b.max.x : b.min.x; };
  L.filter(c => !c.leansOn && !c.lies).forEach(c => {
    const bx = backFace(c.side), gap = Math.min(...pts(c.id).map(p => c.side === 'left' ? p[0] - bx : bx - p[0]));
    ok(gap < 0.02, `${c.id} leans against the ${c.side} back (closest ${(gap * 100).toFixed(1)} cm from its face)`);
  });
  L.filter(c => c.leansOn).forEach(c => {
    const A = pts(c.id), B = pts(c.leansOn); let d = Infinity;
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) { const dx = A[i][0] - B[j][0], dy = A[i][1] - B[j][1], dz = A[i][2] - B[j][2]; d = Math.min(d, dx * dx + dy * dy + dz * dz); }
    d = Math.sqrt(d);
    ok(d < 0.012, `${c.id} actually touches ${c.leansOn} (${(d * 100).toFixed(2)} cm)`);
  });
  // inside the couch's side runs, and clear of the controller's patch of seat
  const sL = new THREE.Box3().setFromObject(room.getObjectByName('seatLeft')), sR = new THREE.Box3().setFromObject(room.getObjectByName('seatRight'));
  const sF = new THREE.Box3().setFromObject(room.getObjectByName('seatFront'));
  L.forEach(c => { const s = (c.side === 'left' ? sL : sR).clone().union(new THREE.Box3(new THREE.Vector3(sF.min.x, sF.min.y, sF.min.z), new THREE.Vector3(sF.max.x, sF.max.y, sF.max.z))), A = pts(c.id);
    ok(A.every(p => p[0] > s.min.x - 0.02 && p[0] < s.max.x + 0.02 && p[2] > s.min.z - 0.02 && p[2] < s.max.z + 0.02), `${c.id} stays over the seat: its own side run, or the front run it meets`); });
  // the real controller, at its real place: a hand's gap (4 cm, in plan) between it and every cushion
  const pad = PrmProps.PRM_BUILDERS.controller(global.__prmCtx), pl = PrmProps.PRM_PLACES.controller;
  pad.position.set(...pl.pos); pad.rotation.set(...pl.rot); pad.updateMatrixWorld(true);
  { const cb = new THREE.Box3().setFromObject(pad); let d = Infinity;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); d = Math.min(d, Math.hypot(Math.max(cb.min.x - x, 0, x - cb.max.x), Math.max(cb.min.z - z, 0, z - cb.max.z))); }
    ok(d > 0.04, `no cushion crowds the controller on the seat (${(d * 100).toFixed(1)} cm clear of its box, in plan)`); }
  // where the camera can see them, and in the way of nothing it looks at
  const W = PrmScene.PRM_PRESETS.wide, cam = new THREE.PerspectiveCamera(W.fov, 16 / 9, 0.05, 30);
  cam.position.set(...W.pos); cam.lookAt(...W.look); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  L.forEach(c => { const A = pts(c.id), mid = A.reduce((a, p) => [a[0] + p[0] / A.length, a[1] + p[1] / A.length, a[2] + p[2] / A.length], [0, 0, 0]);
    const v = new THREE.Vector3(...mid).project(cam); ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1, `${c.id} is in the wide frame (ndc ${v.x.toFixed(2)}, ${v.y.toFixed(2)})`); });
  const eye = new THREE.Vector3(...W.pos);
  { const cb = new THREE.Box3().setFromObject(pad); let blocked = 0, n = 0;
    for (let i = 0; i <= 4; i++) for (let k = 0; k <= 4; k++) { const to = new THREE.Vector3(cb.min.x + (cb.max.x - cb.min.x) * i / 4, cb.max.y, cb.min.z + (cb.max.z - cb.min.z) * k / 4), dir = to.clone().sub(eye), len = dir.length(); n++;
      if (new THREE.Raycaster(eye, dir.normalize(), 0, len - 0.005).intersectObject(m)[0]) blocked++; }
    eq(blocked, 0, `no cushion covers any part of the controller from the wide camera (25 rays over its top)`); }
  Object.keys(PrmProps.PRM_PLACES).forEach(id => {
    const p = PrmProps.PRM_PLACES[id].pos, to = new THREE.Vector3(p[0], p[1] + 0.04, p[2]), dir = to.clone().sub(eye), len = dir.length();
    const hit = new THREE.Raycaster(eye, dir.normalize(), 0, len).intersectObject(m)[0];
    ok(!hit, `no cushion stands between the wide camera and the ${id}`);
  });
  // the contact pass: two cluster boxes on the fabric, inside its cap; the cushions take the grade
  { const lib2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), room2 = PrmRoom.prmBuildRoom(lib2); room2.updateMatrixWorld(true);
    PrmScene.prmContactPass(THREE, lib2, room2, { controller: pad });
    /* no cushion casts a box on the couch: one box round a diagonal pair drew a hard-edged rectangle on the
       back panel beside it, the owner's "indents" (DD-32 § 7c) */
    eq(lib2.mats.fabric.userData.prmAo.count, 9, 'the fabric carries the couch and the controller slot, and NO cushion box: 9');
    ok(lib2.mats.fabric.userData.prmAo.count <= PrmLib.prmContactShade(THREE).MAX, 'inside the 12-box cap');
    eq(lib2.mats.cushion.userData.prmAo && lib2.mats.cushion.userData.prmAo.mode, 'grade', 'the cushions take the room grade and no box loop (their contact is baked)');
    { const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; lib2.mats.cushion.onBeforeCompile(sh);
      ok(/uPrmSat\), 0\.0\)/.test(sh.fragmentShader) && /prmSh = 1\.0 \+ uPrmSheen/.test(sh.fragmentShader) && !/prmContact\(\)/.test(sh.fragmentShader), 'the grade and the sheen survive in one program, with no contact loop'); } }
  console.log(`  (cushions: 1 mesh, ${P.count} verts, ${g.index.count / 3} triangles)`);
}

section('curtains');
{
  /* Room pass, round 8 (24 Sep 2026): paw-print linen, drawn OPEN, each half gathered by a tie-back.
     The owner's defect: the old deep sill stood 28 cm into the room and both halves ran straight
     through it. So the checks here are about what the cloth TOUCHES, vertex by vertex. */
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const get = (n) => room.getObjectByName(n);
  const verts = (m) => { const a = m.geometry.attributes.position, v = new THREE.Vector3(), out = []; for (let i = 0; i < a.count; i++) out.push(v.fromBufferAttribute(a, i).clone().applyMatrix4(m.matrixWorld)); return out; };
  const halves = ['curtainL', 'curtainR'].map(get), ties = ['tiebackL', 'tiebackR'].map(get);
  const cloth = halves.map(verts), bands = ties.map(verts);
  // the physics: nothing the cloth or a band passes through. Each solid's Box3, 2 mm of grace.
  const inside = (b, p) => p.x > b.min.x + 0.002 && p.x < b.max.x - 0.002 && p.y > b.min.y + 0.002 && p.y < b.max.y - 0.002 && p.z > b.min.z + 0.002 && p.z < b.max.z - 0.002;
  /* Vertices alone miss a THIN solid: away from the tie the cloth's rows are 4 cm apart and the sill is
     2.8 cm thick, so an 11 cm sill passed between two rows (a planted defect found it, round 8b). So each
     vertical edge of the cloth, row to row, is walked through the box too (a ray's slab test). */
  const edgeThrough = (h, b) => {
    const g = h.geometry.userData.prmGrid, a = h.geometry.attributes.position, n = g.nu + 1, bb = b.clone().expandByScalar(-0.002);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), hit = new THREE.Vector3(), ray = new THREE.Ray();
    for (let j = 0; j < g.ys.length - 1; j++) for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(a, j * n + i).applyMatrix4(h.matrixWorld); q.fromBufferAttribute(a, (j + 1) * n + i).applyMatrix4(h.matrixWorld);
      ray.set(p, q.clone().sub(p).normalize());
      if (ray.intersectBox(bb, hit) && hit.distanceTo(p) <= p.distanceTo(q)) return true;
    }
    return false;
  };
  ['sill', 'windowFrame', 'ledge', 'curtainRod', 'plant'].forEach(n => {
    const b = new THREE.Box3().setFromObject(get(n));
    ok(cloth.every(vs => vs.every(p => !inside(b, p))) && halves.every(h => !edgeThrough(h, b)), `no curtain vertex or edge passes through the ${n}`);
    ok(bands.every(vs => vs.every(p => !inside(b, p))), `no tie-back passes through the ${n}`);
  });
  ok(cloth.every(vs => vs.every(p => p.x > R.leftX + 0.005)), 'no curtain vertex passes through the wall');
  ok(cloth[0].every(p => p.z > R.backZ + 0.005), 'the back half clears the back wall');
  { const fl = new THREE.Box3().setFromObject(get('floor')); ok(cloth.every(vs => vs.every(p => p.y > fl.max.y)), 'the hems clear the floor'); }
  // hung from the rod: each half's top sits just under it, within its run
  const rod = new THREE.Box3().setFromObject(get('curtainRod'));
  halves.forEach(h => { const b = new THREE.Box3().setFromObject(h); ok(b.max.y < rod.min.y && b.max.y > rod.min.y - 0.05, `${h.name} hangs from the rod`);
    ok(b.min.z > rod.min.z - 0.001 && b.max.z < rod.max.z + 0.001, `${h.name} stays within the rod's run`); });
  // drawn OPEN: at the tie, the glass between the two bundles is clear
  const win = new THREE.Box3().setFromObject(get('window')), yT = halves[0].userData.prmTie.y;
  const at = (vs) => vs.filter(p => Math.abs(p.y - yT) < 0.01);
  const zBack = Math.max(...at(cloth[0]).map(p => p.z)), zFront = Math.min(...at(cloth[1]).map(p => p.z));
  ok(zFront - zBack > 0.8 * (win.max.z - win.min.z), `drawn open: at the tie, ${((zFront - zBack) * 100).toFixed(0)} cm of the ${((win.max.z - win.min.z) * 100).toFixed(0)} cm glass is clear`);
  ok(yT > win.min.y && yT < win.min.y + 0.4 * (win.max.y - win.min.y), 'the tie sits in the lower part of the window, as the mockup\'s');
  // the pinch: under the band every point is INSIDE its ellipse (the band holds the cloth, never cuts it)
  halves.forEach((h, i) => {
    const t = h.userData.prmTie, o = h.position;
    let worst = 0; cloth[i].forEach(p => { if (Math.abs(p.y - t.y) > t.h / 2) return;
      worst = Math.max(worst, Math.hypot((p.x - o.x - t.xc) / t.rx, ((p.z - o.z) * t.dir - t.ac) / t.ra)); });
    ok(worst > 0.6 && worst < 0.9, `${h.name}: the band gathers the cloth and holds it inside (worst q ${worst.toFixed(2)})`);
    const w = h.geometry.userData.prmGrid, sp = (y) => w.span[w.ys.findIndex(v => v >= y)];
    ok(sp(t.y) < 0.4 * sp(1.9) && sp(t.y) < 0.4 * sp(0.1), `${h.name}: pinched at the tie (${(sp(t.y) * 100).toFixed(1)} cm, against ${(sp(1.9) * 100).toFixed(0)} at the rod and ${(sp(0.1) * 100).toFixed(0)} at the hem)`);
  });
  /* folds: no flank steeper than a slope of ~3 away from the band. Past that it stands edge-on, and the
     cloth sheen drew a hairline down every one (measured: sheen off, the streaks vanished). */
  { const h = halves[0], g = h.geometry.userData.prmGrid, a = h.geometry.attributes.position; let worst = 0;
    g.ys.forEach((y, j) => { if (Math.abs(y - g.yTie) < 0.25) return;
      for (let i = 0; i < g.nu; i++) { const p = j * (g.nu + 1) + i, dx = a.getX(p + 1) - a.getX(p), dz = Math.abs(a.getZ(p + 1) - a.getZ(p)); if (dz > 1e-6) worst = Math.max(worst, Math.abs(dx) / dz); } });
    ok(worst < 3.6, `fold flanks stay off edge-on (steepest ${worst.toFixed(2)})`); }
  // the material: linen in metres, paws, opaque, both faces cloth, the cushions' sheen, cavity baked
  const m = lib.mats.curtain, t = m.map, u = t.userData;
  ok(halves.every(h => h.material === m) && ties.every(b => b.material === lib.mats.tieback), 'both halves on the linen, both bands on their own material');
  ok(u.prmTile[0] < 1 && u.prmTile[1] < 1, `the linen tile is in metres (${u.prmTile.join(' × ')} m)`);
  near(t.repeat.x, 1 / u.prmTile[0], 1e-9, 'repeat is one tile per its width');
  ok(u.prmPaws >= 10, `paw prints scattered on it (${u.prmPaws})`); ok(u.prmInk > 0.01 && u.prmInk < 0.1, `and sparse (${(u.prmInk * 100).toFixed(1)}% of the cloth)`);
  { const c = new THREE.Color(u.prmMean), b = new THREE.Color('#efe3d0'); ok(Math.abs(c.r - b.r) < 0.06 && Math.abs(c.g - b.g) < 0.06 && Math.abs(c.b - b.b) < 0.08, `the linen stays cream (${u.prmMean})`); }
  { const uvs = halves[0].geometry.attributes.uv; let mx = 0; for (let i = 0; i < uvs.count; i++) mx = Math.max(mx, uvs.getX(i)); ok(mx > 0.8 && mx < 1.1, `UVs are metres of FLAT cloth, so a fold never stretches a paw (${mx.toFixed(2)} m)`); }
  ok(!m.transparent && m.side === THREE.DoubleSide && m.vertexColors, 'opaque, cloth on both faces, the fold cavity baked in vertex colours');
  ok(m.userData.prmSheen && lib.mats.tieback.userData.prmSheen, 'the linen and the bands carry the cloth sheen');
  { const lib2 = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals }), room2 = PrmRoom.prmBuildRoom(lib2); room2.updateMatrixWorld(true);
    PrmScene.prmContactPass(THREE, lib2, room2, {});
    ['curtain', 'tieback'].forEach(k => eq(lib2.mats[k].userData.prmAo && lib2.mats[k].userData.prmAo.mode, 'grade', `the ${k} takes the room grade and no box loop`));
    const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; lib2.mats.curtain.onBeforeCompile(sh);
    ok(/uPrmSat\), 0\.0\)/.test(sh.fragmentShader) && /prmSh = 1\.0 \+ uPrmSheen/.test(sh.fragmentShader), 'the grade and the sheen survive in one program'); }
  const tris = halves.concat(ties).reduce((n, o) => n + o.geometry.index.count / 3, 0);
  console.log(`  (curtains: 2 halves + 2 bands, ${tris} triangles)`);
}

section('window');
{
  /* Room pass, round 8b (24 Sep 2026): the glass was a flat warm plane ("solid grey/white", owner).
     It now looks the garden up by the DIRECTION of each view ray (prmWindowView), so the checks are
     about that lookup: that its ray is the real one, and that no preset ever sees past the painting's
     edge, where the clamp would draw streaks. */
  const R = room.userData.prmRoom; room.updateMatrixWorld(true);
  const glass = room.getObjectByName('window'), m = glass.material, V = m.map.userData.prmView, O = glass.userData.prmOpening;
  ok(m.isMeshBasicMaterial && m.toneMapped === false, 'the glass is unlit and not tone-mapped: the painted daylight is the colour');
  ok(Array.isArray(V) && V.length === 4 && V[0] < V[1] && V[2] < V[3], `the garden carries its view box (az ${V[0]}..${V[1]}, el ${V[2]}..${V[3]})`);
  { const u = m.userData.prmView.uPrmView.value; ok(u.x === V[0] && u.y === V[1] && u.z === V[2] && u.w === V[3], 'the shader reads the texture\'s own view box'); }
  // the program: the ray from the view matrix, never cameraPosition (r128 leaves it (0,0,0) on a basic material)
  { const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader }; m.onBeforeCompile(sh);
    ok(/vPrmRay = vec3\(dot\(viewMatrix\[0\]\.xyz, mvPosition\.xyz\)/.test(sh.vertexShader), 'vertex: the ray is the view-space position turned back by the view rotation');
    ok(/normalize\(vPrmRay\)/.test(sh.fragmentShader) && !/cameraPosition/.test(sh.fragmentShader.split('#include <map_fragment>').join('')), 'fragment: the lookup uses that ray, and nothing reads cameraPosition');
    ok(!/#include <map_fragment>/.test(sh.fragmentShader), 'fragment: the UV lookup is replaced, not added to'); }
  // the ray the vertex shader builds IS world position minus the eye, for an arbitrary camera
  { const cam = new THREE.PerspectiveCamera(50, 1.5, 0.05, 30); cam.position.set(0.3, 1.1, 0.8); cam.lookAt(-1.2, 0.9, -1.1); cam.updateMatrixWorld(true);
    const V4 = cam.matrixWorldInverse.elements, p = new THREE.Vector3(-1.597, 1.43, -1.2), mv = p.clone().applyMatrix4(cam.matrixWorldInverse);
    const col = (i) => new THREE.Vector3(V4[i * 4], V4[i * 4 + 1], V4[i * 4 + 2]), ray = new THREE.Vector3(col(0).dot(mv), col(1).dot(mv), col(2).dot(mv));
    ok(ray.distanceTo(p.clone().sub(cam.position)) < 1e-6, 'the transposed view rotation returns the true world-space ray'); }
  // every preset, through the whole opening, over the parallax's reach, looks INSIDE the painting
  { const az = (d) => Math.atan2(d.z, -d.x), el = (d) => d.y / Math.hypot(d.x, d.z), pad = 0.02;
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    Object.values(PrmScene.PRM_PRESETS).forEach(pr => [-0.05, 0, 0.05].forEach(dx => [-0.05, 0, 0.05].forEach(dy => {
      const eye = new THREE.Vector3(pr.pos[0] + dx, pr.pos[1] + dy, pr.pos[2]);
      for (let i = 0; i <= 8; i++) for (let k = 0; k <= 8; k++) {
        const d = new THREE.Vector3(R.leftX, O.y[0] + (O.y[1] - O.y[0]) * k / 8, O.z[0] + (O.z[1] - O.z[0]) * i / 8).sub(eye);
        lo = [Math.min(lo[0], az(d)), Math.min(lo[1], el(d))]; hi = [Math.max(hi[0], az(d)), Math.max(hi[1], el(d))];
      } })));
    ok(lo[0] > V[0] + pad && hi[0] < V[1] - pad, `the presets look out between ${lo[0].toFixed(2)} and ${hi[0].toFixed(2)} rad, inside the painted ${V[0]}..${V[1]}`);
    ok(lo[1] > V[2] + pad && hi[1] < V[3] - pad, `and between ${lo[1].toFixed(2)} and ${hi[1].toFixed(2)} of elevation, inside ${V[2]}..${V[3]}`);
    const sun = m.map.userData.prmSun; ok(sun[0] > V[0] && sun[0] < V[1] && sun[0] < 0, 'the sun is painted toward the back wall, where the presets look'); }
  // the joinery: the glass runs under the sash, the sill is the glass's foot and stands proud of the casing
  { const g = new THREE.Box3().setFromObject(glass), f = new THREE.Box3().setFromObject(room.getObjectByName('windowFrame')), s = new THREE.Box3().setFromObject(room.getObjectByName('sill'));
    ok(g.min.z < O.z[0] - 0.01 && g.max.z > O.z[1] + 0.01 && g.min.y < O.y[0] - 0.01 && g.max.y > O.y[1] + 0.01, 'the glass laps past the opening on all four sides (no edge shows at the sash)');
    near(R.sillTopY, O.y[0], 1e-6, 'the sill\'s top is the glass\'s foot');
    ok(s.max.x > f.max.x + 0.01, `the sill's nose stands ${((s.max.x - f.max.x) * 100).toFixed(1)} cm proud of the casing`);
    ok(s.min.z < f.min.z && s.max.z > f.max.z, 'and runs past it each side'); }
  { const rod = new THREE.Box3().setFromObject(room.getObjectByName('curtainRod'));
    ok(rod.min.z >= R.backZ - 1e-6, 'the rod ends on the back wall\'s socket, never through it'); }
  /* Item 9, the window light: a bloom sheet and a shaft box, both additive light over the room's one
     pass. What the eye can't check: the box's winding, and that the beam starts on the opening and
     lands on the pool the sun spot lights (prm-scene aims the spot at R.sunPool; visual-prm holds that). */
  { const bloom = room.getObjectByName('windowBloom'), shafts = room.getObjectByName('windowShafts');
    [bloom, shafts].forEach(o => ok(o && o.material.blending === THREE.AdditiveBlending && o.material.depthWrite === false && !o.castShadow && !o.receiveShadow && !o.userData.prmId,
      `${o && o.name} is additive light: no depth write, no shadow either way, no pick target`));
    const Minv = shafts.material.uniforms.uInv.value, M = Minv.clone().invert();
    ok(M.determinant() > 0, 'the shaft box keeps its winding (a mirrored box culls its near faces and draws the far ones, cut by whatever stands in the beam)');
    const at = (a, b, l) => new THREE.Vector3(a, b, l).applyMatrix4(M);
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => at(a, b, 0));
    ok(corners.every(c => Math.abs(c.x - R.leftX) < 1e-6 && [O.z[0], O.z[1]].some(z => Math.abs(c.z - z) < 1e-6) && [O.y[0], O.y[1]].some(y => Math.abs(c.y - y) < 1e-6)),
      'the beam starts on the window\'s opening, corner for corner');
    const p0 = at(0.5, 0.5, 0), dir = at(0.5, 0.5, 1).sub(p0), pool = new THREE.Vector3(...R.sunPool);
    const miss = pool.clone().sub(p0).cross(dir.clone().normalize()).length();
    ok(miss < 0.005, `and its axis runs through the sun's pool (misses by ${(miss * 100).toFixed(2)} cm)`);
    ok(pool.clone().sub(p0).dot(dir) / dir.lengthSq() < 1, 'which lies inside the beam\'s length');
    const s = m.map.userData.prmSun, sd = new THREE.Vector3(-Math.cos(s[0]), s[1], Math.sin(s[0])).normalize();
    ok(bloom.material.uniforms.uSun.value.distanceTo(sd) < 1e-9, 'the bloom flares at the sun the garden paints, not a second one'); }
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
  /* -- round 2, 23 Sep 2026. The four colour sections the owner mapped. The
     `ring` that used to be the buttons role is gone: the rim strip now carries
     the twenty games' own colours and belongs to NO role, and `buttons` moved
     to the centre star. Assert the mapping, because a role landing on the wrong
     part is invisible until someone picks a colour. */
  const roleOf = (name) => { const m = dial.getObjectByName(name); return m && m.material && m.material.userData.prmRole; };
  [['base', 'shell'], ['skirtBand', 'shell'], ['collar', 'shell'], ['lid', 'shell'],
   ['hub0', 'shell'], ['buttonCap', 'shell'], ['jamb0', 'shell'], ['jamb1', 'shell'],
   ['rib0', 'plate'], ['rib1', 'plate'], ['rib2', 'plate'], ['hood', 'plate'], ['housingBase', 'plate'],
   ['deck', 'ears'],
   ['star', 'buttons'], ['starText', 'buttons'], ['housingBump', 'buttons']].forEach(([name, role]) =>
    eq(roleOf(name), role, `${name} takes the ${role} role`));
  eq(carts[0].getObjectByName('cartRail').material.userData.prmRole, 'ears', 'a slot rail belongs to the disc that holds it');
  eq(dial.getObjectByName('ring'), undefined, 'the old single-colour RGB ring is gone');
  const neon = dial.getObjectByName('neonRing');
  ok(neon && !neon.material.userData.prmRole, 'the rim strip belongs to no design role -- it carries the games own colours');
  ok(neon.material.map === neon.material.emissiveMap, 'the strip uses one spectrum as both map and emissiveMap');
  eq(neon.material.emissive.getHexString(), 'ffffff', 'and a white emissive, or the map would be tinted away');
  /* Every cartridge's holder glows in ITS game's hex -- the same idea one slot
     at a time. This is also the check that the slot lights survive setNeon. */
  const glow3 = carts[3].getObjectByName('cartGlow');
  eq(glow3.material.emissive.getHexString(), GAMES[3].brandHex.slice(1).toLowerCase(), "a slot light is its own game colour");

  /* THE LID IS THE ROUND'S WHOLE POINT, so its geometry gets a real claim: a
     little more than two thirds of the ring covered, and the cartridges CLEAR
     the underside. A lid that fouls the carousel, and one that leaves the count
     countable, are the two ways this reshape could be silently wrong. */
  const lidB = new THREE.Box3().setFromObject(dial.getObjectByName('lid'));
  const cartB = new THREE.Box3().setFromObject(carts[0]);
  ok(cartB.max.y < lidB.min.y, `a cartridge clears the lid (${cartB.max.y.toFixed(4)} < ${lidB.min.y.toFixed(4)})`);
  /* The mouth, measured off the LID, not off a copy of its angles. A check
     that re-derives the opening from hardcoded degrees is a check that agrees
     with itself: widen the mouth in the builder and it would still pass. So
     this fires a ray straight up from each cartridge and asks whether the lid
     is actually there -- which is the claim, in the terms the player sees it. */
  dial.updateMatrixWorld(true);
  const lidMeshes = []; dial.getObjectByName('lid').traverse(o => { if (o.isMesh) lidMeshes.push(o); });
  const up = new THREE.Raycaster(); up.ray.direction.set(0, 1, 0);
  const under = carts.filter(c => {
    const w = new THREE.Vector3(); c.getWorldPosition(w);
    up.ray.origin.set(w.x, w.y + 0.002, w.z);
    return up.intersectObjects(lidMeshes, false).length > 0;
  }).length;
  ok(under >= 13 && under <= 15, `the lid hides most of the ring at rest (${under} of 20 with lid overhead)`);
  ok(under < carts.length, 'and the mouth is a real opening -- some cartridges have nothing above them');
  /* The collar is what makes the lid a lid -- without it the same cartridges are
     in plain sight through a 32 mm band of open air, from every seat in the room. */
  const collarB = new THREE.Box3().setFromObject(dial.getObjectByName('collar'));
  ok(collarB.max.y >= lidB.min.y - 0.001, 'the collar wall reaches the lid, closing the ring');
  ok(collarB.min.y < cartB.min.y + 0.010, 'and comes down past the deck, so there is no gap under it');

  /* ── THE CORRIDOR IS CLEAR. The carousel sweeps an annular band, and the only
     FIXED parts allowed to reach into it are the two slot mouths, which exist to
     be passed through. Everything else in there is a part the cartridges grind
     against — which is exactly what the display housing was doing since the
     greybox: a solid wedge standing across 60° of the ring, with cards passing
     straight through it. No harness could see it, because none of them had ever
     measured a moving part against a fixed one. Vertices, not boxes: a jamb's
     bounding box is mostly its own aperture. */
  const CART_R = Math.hypot(carts[0].position.x, carts[0].position.z);
  const bandLo = cartB.min.y + 0.001, bandHi = cartB.max.y - 0.001;
  const fixed = [];
  dial.traverse(o => {
    if (!o.isMesh) return;
    for (let n = o; n; n = n.parent) if (n.name === 'spinner') return;   // the carousel is not in its own way
    fixed.push(o);
  });
  /* RAYCAST, not vertex sampling. The first version of this read every fixed
     mesh's vertices and asked whether any sat in the band — and it missed the
     housing bug completely, because ExtrudeGeometry puts vertices only on the
     OUTLINE: a wedge running from r 0.096 to 0.205 has nothing at all at 0.130,
     and its intruding material is the interior of two very large triangles.
     Rays hit triangles. Fire one along the direction of travel at every degree,
     at both ends of the card's depth and at two heights, and anything standing
     in the way is hit whether or not a vertex happens to be there. */
  const sweep = new THREE.Raycaster(); sweep.far = (Math.PI * 2 * CART_R) / 120 * 1.2;
  const hits = new Set();
  for (let k = 0; k < 120; k++) {
    const ang = (k / 120) * Math.PI * 2;
    const tangent = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
    for (const dr of [-0.0028, 0, 0.0028]) for (const y of [bandLo + 0.001, (bandLo + bandHi) / 2, bandHi - 0.001]) {
      const r = CART_R + dr;
      sweep.ray.origin.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
      sweep.ray.direction.copy(tangent);
      sweep.intersectObjects(fixed, false).forEach(h => hits.add(h.object.name));
    }
  }
  ok(hits.size === 0, `nothing fixed stands in the carousel's path (hit ${JSON.stringify([...hits])})`);

  /* ── AND THE SLOT MOUTHS ARE DOORWAYS. The sweep above is satisfied by having
     no walls at all, so the jambs get the complementary claim, which is the one
     that says "opening": each has material across the corridor's radius, and
     material at the cartridges' height, and NONE where those two overlap. A
     solid panel fails the third; a panel that misses the ring fails the first;
     a decorative lintel fails the second. */
  const spans = (name) => {
    const m = dial.getObjectByName(name); if (!m) return null;
    const pos = m.geometry.attributes.position; const q = new THREE.Vector3();
    let inR = 0, inY = 0, both = 0;
    for (let i = 0; i < pos.count; i++) {
      q.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld);
      const onRing = Math.abs(Math.hypot(q.x, q.z) - CART_R) < 0.010;
      const atCard = q.y >= bandLo && q.y <= bandHi;
      if (onRing) inR++; if (atCard) inY++; if (onRing && atCard) both++;
    }
    return { inR, inY, both };
  };
  ['jamb0', 'jamb1'].forEach(name => {
    const sp = spans(name);
    ok(sp, `${name} exists — a slot mouth at each end of the opening`);
    ok(sp && sp.inR > 0, `${name} reaches across the cartridge ring`);
    ok(sp && sp.inY > 0, `${name} stands at the cartridges' own height`);
    ok(sp && sp.both === 0, `${name} is a doorway, not a wall (${sp ? sp.both : '?'} vertices in the corridor)`);
  });

  /* Flatter, and the cards sit deeper in their holders (owner, round 2b). Both
     are claims about proportion, so both are measured rather than asserted from
     the constants that produced them. */
  const whole = new THREE.Box3().setFromObject(dial), wsz = new THREE.Vector3(); whole.getSize(wsz);
  ok(wsz.y / Math.max(wsz.x, wsz.z) < 0.26, `the prop reads flat (${(wsz.y * 1000).toFixed(0)} mm tall on ${(wsz.x * 1000).toFixed(0)} mm across)`);
  const railB = new THREE.Box3().setFromObject(carts[0].getObjectByName('cartRail'));
  ok(railB.max.y - cartB.min.y >= 0.008, `a third of the card is inside its holder (${((railB.max.y - cartB.min.y) * 1000).toFixed(1)} mm buried)`);

  const api = dial.userData.api; let calls = 0; const rand = () => { calls++; return 0.37; };

  /* The readout starts DARK and stays dark until a game is loaded (owner, round
     2). Blank is genuinely blank -- no texture, no glow -- so that is two
     claims, not one. */
  const disp = dial.getObjectByName('display');
  eq(disp.material.emissiveIntensity, 0, 'the readout is off before a spin');
  eq(disp.material.map, null, 'and carries no label texture');
  api.setDisplay('Cookie Jar');
  ok(disp.material.emissiveIntensity > 0 && !!disp.material.map, 'setDisplay lights it and gives it a label');
  api.setDisplay(''); eq(disp.material.emissiveIntensity, 0, 'and an empty string puts it back out');

  /* The centre button. A press is a MOTION on the button group, and it returns
     to exactly zero -- a button that creeps is one that ends up inside the lid
     after a few spins. */
  const btn = dial.getObjectByName('button');
  eq(btn.position.y, 0, 'the button rests at zero');
  api.press(false); api.tick(500, 0.016, false); api.tick(560, 0.016, false);
  ok(btn.position.y < -0.001, 'a press indents it');
  for (let i = 0; i < 40; i++) api.tick(600 + i * 20, 0.02, false);
  near(btn.position.y, 0, 1e-9, 'and it returns to exactly zero');
  api.press(true); eq(btn.position.y, 0, 'under reduced motion the press is skipped, not shortened');
  const neonRest = neon.material.emissiveIntensity;
  let resolved = null; api.spin(rand, { instant: false }).then(id => resolved = id);
  ok(api.isSpinning(), 'spinning after spin()'); api.spin(rand); ok(calls === 1, 'a second spin() while running is a no-op (same promise)');
  /* Sampled MID-SPIN. Reading it after the whole 2 s of ticks catches the
     settle tween already halfway home, which passed by a hair and would have
     started failing on any change to the spin's length -- an assertion that
     only just holds is one that will fire for the wrong reason later. */
  let t = 1000, neonPeak = 0;
  for (let i = 0; i <= 40; i++) { api.tick(t += 50, 0.05, false); if (t < 2600) neonPeak = Math.max(neonPeak, neon.material.emissiveIntensity); }
  ok(neonPeak > neonRest * 2.5, `the strip is noticeably brighter while it spins (${neonPeak.toFixed(2)} against ${neonRest})`);
  // the resolution is a microtask; the rest of this section runs after it, then finish() prints the summary
  Promise.resolve().then(() => {
    api.tick(3060, 0.05, true); api.tick(3300, 0.05, true);   // let the 200 ms rise tween finish (tweens tick even under reduced motion)
    eq(resolved, GAMES[7].id, 'spin resolves to the rand-chosen game'); ok(!api.isSpinning(), 'not spinning after the tween ends');
    near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-7 * slot), 1e-6, 'spinner rests with cartridge 7 at the front');
    ok(carts[7].position.y > carts[6].position.y + 0.006, 'the chosen cartridge is risen');
    const r0 = dial.getObjectByName('spinner').rotation.y; api.tick(3350, 0.05, true); eq(dial.getObjectByName('spinner').rotation.y, r0, 'no drift under reduced motion');
    api.pauseDrift(0, 3350); api.tick(3400, 0.05, false); ok(dial.getObjectByName('spinner').rotation.y > r0, 'drift resumes when not reduced');
    for (let i = 0; i < 30; i++) api.tick(3400 + i * 30, 0.03, false);
    near(neon.material.emissiveIntensity, neonRest, 1e-6, 'and settles back to its resting level once a game is chosen');
    let instant = null; api.spin(() => 0.12, { instant: true }).then(id => instant = id);   // → index 2
    ok(!api.isSpinning(), 'an instant spin is never "spinning"');
    Promise.resolve().then(() => { eq(instant, GAMES[2].id, 'instant spin resolves to the chosen game'); near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-2 * slot), 1e-9, 'instant spin puts the cartridge at the front'); finish(); });
  });
}

// Later tasks append their sections above this line.
function finish() { console.log(`
${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
if (!global.__prmAsync) finish();
