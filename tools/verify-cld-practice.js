// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-practice.js — Cold Shoulder's cue, render model and Practice Arena.
//
//   node tools/verify-cld-practice.js          (exits 1 on any failure)
//   node tools/verify-cld-practice.js --tune   (drill tuner: prints ring seeds, asserts nothing)
//   CLD_SRC=path / CLD_PHYS_SRC=path           (drive a different copy — mutate-cld uses this)
//
// Loads physics.js + cld.js into ONE vm context with a mock DOM of real
// elements (the loopback's shape), so render and Arena UI code actually runs.
// mpSendEnvelope / mpSendPrivate are COUNTED — the Arena must never call them.
// Spec: docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md § 7.1.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PHYS = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');
const TUNE = process.argv.includes('--tune');

// ── Mock DOM (the verify-cld-loopback.js shape) ────────────────────────────
function ctx2d() {
  const noop = () => {};
  return {
    canvas: { width: 360, height: 360 },
    setTransform: noop, save: noop, restore: noop, translate: noop, rotate: noop,
    scale: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop, rect: noop,
    fill: noop, stroke: noop, clip: noop, clearRect: noop, fillRect: noop,
    strokeRect: noop, fillText: noop, strokeText: noop, drawImage: noop,
    setLineDash: noop, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
    textAlign: '', textBaseline: '', lineCap: '', lineJoin: '', shadowBlur: 0,
    shadowColor: '', filter: '',
  };
}
function makeDocument() {
  const byId = {};
  const mk = tag => {
    const el = {
      tagName: String(tag).toUpperCase(), id: '', style: {}, dataset: {}, children: [],
      textContent: '', className: '', disabled: false, scrollTop: 0,
      clientWidth: 320, clientHeight: 320, width: 0, height: 0, parentElement: null,
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      _cls: new Set(),
      classList: null,
      appendChild(c) { this.children.push(c); c.parentElement = this; return c; },
      append(...cs) { cs.forEach(c => this.appendChild(c)); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 320 }),
      getContext: () => ctx2d(),
      scrollIntoView() {},
      setAttribute() {}, getAttribute: () => null,
    };
    el.classList = {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      contains: c => el._cls.has(c),
      toggle: (c, on) => { const want = on === undefined ? !el._cls.has(c) : !!on;
                           if (want) el._cls.add(c); else el._cls.delete(c); return want; },
    };
    return el;
  };
  return {
    body: mk('body'), addEventListener() {}, createElement: mk,
    querySelectorAll: () => [], querySelector: () => null,
    getElementById(id) { if (!byId[id]) { byId[id] = mk('div'); byId[id].id = id; } return byId[id]; },
    __byId: byId,
  };
}
function Path2DStub() {}
['moveTo','lineTo','arc','ellipse','rect','closePath','quadraticCurveTo','bezierCurveTo','addPath']
  .forEach(k => { Path2DStub.prototype[k] = function () {}; });

// ── The sandbox ────────────────────────────────────────────────────────────
const sent = { envelope: 0, private: 0 };
const screens = [];
const S = {
  console, document: makeDocument(),
  window: { syllyMultiplayerMode: 'single', devicePixelRatio: 1, addEventListener() {},
            matchMedia: () => ({ matches: false }) },
  showScreen: id => screens.push(id),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playAbyssThud() {}, playHullThud() {}, playAlarm() {}, playSplash() {},
  playTick() {}, playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  mpSendEnvelope() { sent.envelope++; }, mpSendPrivate() { sent.private++; },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
  Path2D: Path2DStub,
};
S.globalThis = S;
S.window.window = S.window;
vm.createContext(S);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), S, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), S, { filename: GAME });

// Top-level let/const/function bindings are visible to later scripts in the
// same context, so plain evaluation reads and writes them — no bridge needed.
const G   = name => vm.runInContext(name, S);
const SET = (name, v) => { S.__v = v; vm.runInContext(name + ' = __v', S); };
const RUN = expr => vm.runInContext(expr, S);

// ── Assertions ─────────────────────────────────────────────────────────────
let failures = 0, passes = 0;
process.on('uncaughtException', e => {
  console.log('\n  FAIL  the run crashed before it finished\n          ' + e.stack);
  console.log('\n' + '='.repeat(70) + '\n' + (failures + 1) + ' CHECK(S) FAILED');
  process.exit(1);
});
function check(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  good ? passes++ : failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function ok(label, cond, detail) {
  cond ? passes++ : failures++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}` + (cond || !detail ? '' : `\n          ${detail}`));
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }
function section(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length))); }

// ═══════════════════════════════════════════════════════════════════════════
// A. The cue (spec § 2.1–2.2)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('A. The cue');
  const cue = o => RUN('cldCueAim')(o);
  const P = { x: 180, y: 180 };
  const PULL = G('CLD_CUE_PULL_PX'), DEAD = G('CLD_CUE_DEAD');

  // Finger 80 units LEFT of the penguin → the shot goes RIGHT (+x).
  let a = cue({ down: { x: 100, y: 180 }, now: { x: 100, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('touch-down is power 0', a && a.power === 0, JSON.stringify(a));
  ok('the shot goes away from the finger (+x)', a && near(a.dx, 1) && near(a.dy, 0), JSON.stringify(a));

  for (const scale of [0.87, 2.0]) {
    a = cue({ down: { x: 100, y: 180 }, now: { x: 100 - PULL / scale, y: 180 }, penguin: P, scale, lock: null, lastDir: null });
    ok(`a pull of ${PULL} CSS px is full power at scale ${scale}`, a && near(a.power, 1, 1e-9), JSON.stringify(a));
  }
  a = cue({ down: { x: 100, y: 180 }, now: { x: 100 - 48, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('half the pull is half power', a && near(a.power, 0.5, 1e-9), JSON.stringify(a));

  // Swing: same radius (80) round the penguin, 60° away → power unchanged.
  const th = Math.PI - Math.PI / 3;
  a = cue({ down: { x: 100, y: 180 }, now: { x: 180 + 80 * Math.cos(th), y: 180 + 80 * Math.sin(th) },
            penguin: P, scale: 1, lock: null, lastDir: null });
  ok('a pure swing keeps power at 0', a && near(a.power, 0, 1e-9), JSON.stringify(a));
  ok('a swing turns the aim', a && !near(a.dy, 0, 1e-3));

  a = cue({ down: { x: 100, y: 180 }, now: { x: 140, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('pushing in past touch-down is power 0, never negative', a && a.power === 0, JSON.stringify(a));

  const held = { x: 0, y: -1 };
  a = cue({ down: { x: 100, y: 180 }, now: { x: 180 + DEAD / 2, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: held });
  ok('inside the dead zone the direction holds', a && near(a.dx, 0) && near(a.dy, -1), JSON.stringify(a));
  a = cue({ down: { x: 181, y: 180 }, now: { x: 182, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  check('inside the dead zone with no direction yet → null', a, null);

  a = cue({ down: { x: 100, y: 180 }, now: { x: 20, y: 180 }, penguin: P, scale: 1, lock: 0.4, lastDir: null });
  ok('a locked bar holds power while the pull changes', a && near(a.power, 0.4), JSON.stringify(a));

  // Review Focus 1 — touch-down ON the penguin, pull straight out: the old slingshot still works.
  a = cue({ down: { x: 180, y: 180 }, now: { x: 180 - 60, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('touch-down on the penguin, pull left → shot right with power', a && near(a.dx, 1) && a.power > 0.5, JSON.stringify(a));
}

// ═══════════════════════════════════════════════════════════════════════════
// B. The aim guide (spec § 2.3)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('B. The aim guide');
  const guide = (m, a) => RUN('cldAimGuide')(m, a);
  const R = G('CLD_PENGUIN_R'), STUB = G('CLD_GUIDE_STUB');
  const me = { id: '0-0', x: 120, y: 180, drowned: false, plug: false };
  const base = extra => Object.assign({ penguins: [me], bergs: [], radius: 130, reach: 130 }, extra);
  const aimR = { penguinId: '0-0', dx: 1, dy: 0, power: 1 };

  // Head-on: a penguin 60 ahead.
  let g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: false, plug: false }] }), aimR);
  check('head-on: first contact is a penguin', g && g.kind, 'penguin');
  ok('the ghost sits one diameter short of the struck penguin', g && g.ghost && near(g.ghost.x, 180 - 2 * R, 2) && near(g.ghost.y, 180, 1e-6),
     JSON.stringify(g && g.ghost));
  ok('the stub is exactly CLD_GUIDE_STUB long', g && g.stub && near(Math.hypot(g.stub.x2 - g.stub.x1, g.stub.y2 - g.stub.y1), STUB, 1e-6));
  ok('head-on: the stub carries straight on (+x)', g && g.stub && near(g.stub.y2, 180, 1e-6) && g.stub.x2 > g.stub.x1);

  // Oblique: the struck penguin sits 12 below the line → it is pushed down-right,
  // along the centre line ghost → struck, never along the aim.
  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 192, drowned: false, plug: false }] }), aimR);
  ok('oblique: the stub follows the centre line, not the aim', g && g.stub && g.stub.y2 > g.stub.y1 + 1,
     JSON.stringify(g && g.stub));

  g = guide(base({ bergs: [{ x: 200, y: 180, r: 16 }] }), aimR);
  ok('a Berg: ghost only, no stub', g && g.kind === 'berg' && g.ghost && g.stub === null, JSON.stringify(g));

  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: true, plug: true }] }), aimR);
  ok('a plug: ghost only, no stub', g && g.kind === 'plug' && g.stub === null, JSON.stringify(g));

  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: true, plug: false }] }), aimR);
  ok('a Knocked-back penguin is not a body — no contact', g && g.kind !== 'penguin' && g.kind !== 'plug', JSON.stringify(g));

  g = guide(base({}), { penguinId: '0-0', dx: 1, dy: 0, power: 0.3 });
  ok('nothing in reach: no ghost, the line ends at reach × power', g && g.ghost === null && near(g.end.x, 120 + 130 * 0.3, 2),
     JSON.stringify(g));

  g = guide(base({}), { penguinId: '0-0', dx: -1, dy: 0, power: 1 });
  ok('heading off the floe: kind rim, ghost at the lip, no stub', g && g.kind === 'rim' && g.ghost && g.stub === null &&
     Math.hypot(g.ghost.x - 180, g.ghost.y - 180) <= 130, JSON.stringify(g));
}

// ═══════════════════════════════════════════════════════════════════════════
// C. The view (spec § 4.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('C. The view and the camera');
  const doc = S.document;
  const box = doc.createElement('div'); box.clientWidth = 320; box.clientHeight = 480;
  const cv  = doc.createElement('canvas'); box.appendChild(cv);
  cv.getBoundingClientRect = () => ({ left: 10, top: 20, width: 320, height: 480 });
  const v = RUN('cldMakeView')(cv);
  RUN('cldResize')(v);
  const FIT = RUN('cldViewFit')(G('CLD_R_STD'));
  ok('at zoom 1 the floe and its outer margin fit the short axis', near(v.scale, 320 / FIT, 1e-9), String(v.scale));
  ok('the floe centre sits at the box centre', near(v.offX + 180 * v.scale, 160, 1e-9) && near(v.offY + 180 * v.scale, 240, 1e-9));
  const round = (x, y) => { const c = RUN('cldToLogical')(v, { clientX: 10 + v.offX + x * v.scale, clientY: 20 + v.offY + y * v.scale });
                            return near(c.x, x, 1e-6) && near(c.y, y, 1e-6); };
  ok('cldToLogical inverts the transform at zoom 1', round(180, 180) && round(40, 300));
  v.cam.x = 220; v.cam.y = 150; v.cam.z = 1.7; RUN('cldCamApply')(v);
  ok('…and at any camera position and zoom', round(220, 150) && round(-20, 400) && near(v.scale, 1.7 * v.base, 1e-9));
  // Review Focus 1 — a resize keeps the camera.
  RUN('cldResize')(v);
  ok('a resize keeps the camera where it was (no snap to the overview)', near(v.cam.x, 220) && near(v.cam.z, 1.7) && round(220, 150));
  // Review Focus 3 — Roomy's outermost Knocked-back penguin is on screen at zoom 1.
  RUN('cldCamFrame')(v, G('CLD_FLOE_SIZE').roomy);
  const edge = 180 + G('CLD_FLOE_SIZE').roomy + G('CLD_BACK_OFFSET') + G('CLD_PENGUIN_R');
  ok('Roomy at zoom 1: the furthest Knocked-back penguin is inside the box',
     v.offX + edge * v.scale <= v.box.x + v.box.w + 1e-6 && v.offX + (360 - edge) * v.scale >= v.box.x - 1e-6);
  RUN('cldCamFrame')(v, G('CLD_R_STD'));
  const two = RUN('cldCamFit')([{ x: 150, y: 180 }, { x: 210, y: 180 }], 90, v.box, v.base, 1.25, 170);
  ok('cldCamFit centres on the points and caps the zoom', near(two.x, 180) && near(two.y, 180) && two.z >= 1 && two.z <= 1.25);
  const far = RUN('cldCamFit')([{ x: 400, y: 180 }, { x: 420, y: 180 }], 10, v.box, v.base, 2, 170);
  ok('…and never lets the centre wander past CLD_CAM_CENTRE_LIM × radius',
     near(Math.hypot(far.x - 180, far.y - 180), G('CLD_CAM_CENTRE_LIM') * 170, 1e-6));
  RUN('cldCamOverview')(v, true);
  const t = { x: 230, y: 180, z: 1.14 };
  RUN('cldCamStep')(v, 0.5, t, false);
  ok('the overview holds for CLD_CAM_OVERVIEW_S', near(v.cam.tx, 180) && near(v.cam.x, 180));
  RUN('cldCamStep')(v, 0.4, t, false);
  ok('…then the camera eases toward its target rather than jumping', v.cam.x > 180 && v.cam.x < 230);
  const x0 = v.cam.x;
  RUN('cldCamStep')(v, 0.5, { x: 100, y: 100, z: 2 }, true);
  ok('the camera never moves while a finger is down', near(v.cam.x, x0) && near(v.cam.tx, 230));
  S.window.matchMedia = () => ({ matches: true });
  RUN('cldCamStep')(v, 0.016, t, false);
  ok('reduced motion: the camera cuts straight to its target', near(v.cam.x, 230) && near(v.cam.z, 1.14));
  S.window.matchMedia = () => ({ matches: false });
  const pe = (id, x, y, ts) => ({ pointerId: id, clientX: x, clientY: y, timeStamp: ts || 0 });
  ok('one finger is never the camera', RUN('cldCamPointer')(v, pe(1, 100, 100, 1000), 'down') === false);
  ok('a second finger starts a pinch and takes manual control',
     RUN('cldCamPointer')(v, pe(2, 200, 100, 1010), 'down') === true && v.cam.manual === true);
  const z0 = v.cam.z;
  RUN('cldCamPointer')(v, pe(2, 300, 100), 'move');
  ok('spreading the fingers zooms in', v.cam.z > z0);
  ok('lifting one finger of a pinch is still the camera’s', RUN('cldCamPointer')(v, pe(2, 300, 100), 'up') === true);
  ok('…and lifting the last one never reaches the aim', RUN('cldCamPointer')(v, pe(1, 100, 100), 'up') === false && v.pinch === null);
  RUN('cldCamStep')(v, 1, t, false);
  ok('manual control holds against the auto camera', !near(v.cam.tx, 230));
  RUN('cldCamPointer')(v, pe(3, 50, 50, 5000), 'down'); RUN('cldCamPointer')(v, pe(3, 50, 50), 'up');
  RUN('cldCamPointer')(v, pe(4, 52, 51, 5200), 'down'); RUN('cldCamPointer')(v, pe(4, 52, 51), 'up');
  ok('a double-tap hands the camera back to auto', v.cam.manual === false);
  const v2 = RUN('cldMakeView')(doc.createElement('canvas'));
  ok('two views are independent objects, each with its own camera', v2 !== v && v2.cam !== v.cam && v2.scale === 1);
  ok('CLD_VIEW_FIT is gone — the fit is per floe', RUN("typeof CLD_VIEW_FIT === 'undefined'"));
}

// ═══════════════════════════════════════════════════════════════════════════
// D. The render model (spec § 4.2)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('D. The render model');
  const pen = (id, owner, x, y, extra) => Object.assign({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null }, extra || {});

  // Pure penguin picking (Peck Off — Review Focus 5).
  const A = pen('0-0', 0, 100, 180), B = pen('0-1', 0, 260, 180);
  const pick = (st, pt, aims) => RUN('cldPickPenguin')(st, pt, aims);
  check('a touch on a penguin picks it', pick([A, B], { x: 262, y: 181 }, []).id, '0-1');
  check('an anywhere-touch picks the first unarmed', pick([A, B], { x: 180, y: 40 }, [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]).id, '0-1');
  check('both armed → the most recently aimed', pick([A, B], { x: 180, y: 40 },
        [{ penguinId: '0-1', dx: 1, dy: 0, power: 0.5 }, { penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]).id, '0-0');

  // Live model.
  SET('cldPenguins', [pen('0-0', 0, 140, 180), pen('1-0', 1, 220, 180), pen('2-0', 2, 180, 60, { drowned: true, plug: true, angle: 0 })]);
  SET('cldBergs', []); SET('cldFloeRadius', 130); SET('cldIceConditions', 'slush'); SET('cldIceBreaker', 2);
  SET('cldPhase', 'aiming'); SET('cldMyMode', 'throw'); SET('cldMySnowball', null); SET('cldMyDive', null);
  SET('cldDragging', false);
  SET('cldMyAims', [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.6 }]);
  let m = RUN('cldFloeModel()');
  check('three penguins in the model', m.penguins.length, 3);
  ok('mine is flagged me', m.penguins[0].me === true && m.penguins[1].me === false);
  ok('the armed penguin faces along its aim', near(m.penguins[0].facing, 0, 1e-9));
  check('a plug is drawn bob, not dim', [m.penguins[2].state, m.penguins[2].dim], ['bob', false]);
  check('the armed aim is in m.aims as mine, not live', m.aims.map(a => [a.penguinId, a.live, a.rival]), [['0-0', false, false]]);
  ok('reach is the full-power slide distance', near(m.reach, RUN("cldFullSlideDist('slush')")));
  check('one Standing penguin of mine → no selection ring', m.penguins.filter(p => p.selected).length, 0);
  ok('the model carries no live-state references (a copy)', m.penguins[0] !== G('cldPenguins')[0]);

  // Rendering executes end to end on a mock view, rival aim + guide included.
  const box = S.document.createElement('div'); box.clientWidth = 320; box.clientHeight = 320;
  const cv = S.document.createElement('canvas'); box.appendChild(cv);
  const v = RUN('cldMakeView')(cv); RUN('cldResize')(v);
  m.aims.push({ penguinId: '1-0', dx: -1, dy: 0, power: 1, live: false, rival: true });
  m.assist = true;
  let threw = null;
  try { RUN('cldDraw')(v, m); } catch (e) { threw = e; }
  ok('cldDraw(view, m) renders without throwing', threw === null, threw && threw.stack);
  ok('cldDraw reads no live globals: an empty live floe still draws the model', (() => {
    SET('cldPenguins', []); SET('cldFloeRadius', 0);
    try { RUN('cldDraw')(v, m); return true; } catch (e) { return false; }
  })());
  ok('the old aim/facing helpers are gone',
     RUN("typeof cldDrawAim === 'undefined' && typeof cldDrawOneAim === 'undefined' && typeof cldFacingOf === 'undefined'"));
}

// ═══════════════════════════════════════════════════════════════════════════
// E. The live gesture (spec § 2.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('E. The live gesture');
  const pen = (id, owner, x, y, extra) => Object.assign({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null }, extra || {});
  const box = S.document.createElement('div'); box.clientWidth = 320; box.clientHeight = 320;
  const cv = S.document.createElement('canvas'); box.appendChild(cv);
  const view = RUN('cldMakeView')(cv); RUN('cldResize')(view); SET('cldView', view);
  const ev = (x, y) => ({ clientX: view.offX + x * view.scale, clientY: view.offY + y * view.scale, pointerId: 1 });
  const down = (x, y) => RUN('cldPointerDown')(ev(x, y));
  const move = (x, y) => RUN('cldPointerMove')(ev(x, y));
  const up   = (x, y) => RUN('cldPointerUp')(ev(x, y));
  const PULL = G('CLD_CUE_PULL_PX');
  const fresh = pens => {
    SET('cldPenguins', pens); SET('cldPhase', 'aiming'); SET('cldMyMode', 'throw');
    SET('cldMyAims', []); SET('cldPowerLock', null); SET('cldPtrId', null); SET('cldDragging', false);
    SET('cldMySnowball', null); SET('cldMyDive', null);
  };

  fresh([pen('0-0', 0, 140, 180), pen('1-0', 1, 260, 180)]);
  down(60, 180); move(60 - PULL / view.scale, 180);
  const m = RUN('cldFloeModel()');
  check('mid-drag: my penguin leans', m.penguins.find(p => p.id === '0-0').state, 'lean');
  ok('mid-drag: the live aim is in the model', m.aims.some(a => a.live && a.penguinId === '0-0'));
  up(60 - PULL / view.scale, 180);
  let aims = G('cldMyAims');
  ok('a full pull from anywhere arms a full-power shot away from the finger',
     aims.length === 1 && near(aims[0].dx, 1) && near(aims[0].dy, 0) && near(aims[0].power, 1, 1e-6), JSON.stringify(aims));
  check('the armed aim carries exactly the four wire fields', Object.keys(aims[0]).sort(), ['dx', 'dy', 'penguinId', 'power']);

  // Review Focus 2 — a tap after arming changes nothing, with or without a locked bar.
  const before = JSON.stringify(G('cldMyAims'));
  down(60, 100); up(60, 100);
  check('a plain tap keeps the armed aim', JSON.stringify(G('cldMyAims')), before);
  SET('cldPowerLock', 0.4);
  down(60, 100); up(60, 100);
  check('a tap with the bar locked keeps the armed aim too', JSON.stringify(G('cldMyAims')), before);

  down(60, 180); move(60, 100); up(60, 100);
  aims = G('cldMyAims');
  ok('locked: a drag re-aims at the locked power', aims.length === 1 && near(aims[0].power, 0.4) && aims[0].dy > 0.5, JSON.stringify(aims));
  SET('cldPowerLock', null);

  // Review Focus 5 — Peck Off: an anywhere-touch goes to the first unarmed penguin.
  fresh([pen('0-0', 0, 100, 180), pen('0-1', 0, 260, 180)]);
  SET('cldMyAims', [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]);
  down(180, 40); move(180, 40 - PULL / view.scale); up(180, 40 - PULL / view.scale);
  check('Peck Off: an anywhere-touch arms the unarmed penguin', G('cldMyAims').map(a => a.penguinId), ['0-0', '0-1']);
  down(102, 181); move(102, 181 + 60); up(102, 181 + 60);
  ok('Peck Off: touching a penguin re-aims that one', G('cldMyAims').slice(-1)[0].penguinId === '0-0');

  // A second finger mid-aim is the camera: the aim is dropped, never armed.
  fresh([pen('0-0', 0, 140, 180), pen('1-0', 1, 260, 180)]);
  down(60, 180); move(60 - PULL / view.scale, 180);
  RUN('cldPointerDown')({ clientX: 5, clientY: 5, pointerId: 2 });
  ok('a second finger cancels the aim without arming it', G('cldDragging') === false && G('cldMyAims').length === 0);
  RUN('cldPointerUp')({ clientX: 5, clientY: 5, pointerId: 2 });
  up(60 - PULL / view.scale, 180);
  check('…and lifting both fingers arms nothing', G('cldMyAims').length, 0);
  // Review Focus 5 — a second finger during a Drowned player's Snowball tap.
  fresh([pen('0-0', 0, 140, 180, { drowned: true, plug: true, angle: 0 }), pen('1-0', 1, 260, 180)]);
  SET('cldFloeRadius', 130);
  let threw2 = null;
  try {
    down(170, 170);
    RUN('cldPointerDown')({ clientX: 7, clientY: 7, pointerId: 2 });
    RUN('cldPointerUp')({ clientX: 7, clientY: 7, pointerId: 2 });
    up(170, 170);
  } catch (e) { threw2 = e; }
  ok('a second finger during a Snowball tap never throws', threw2 === null, threw2 && threw2.stack);
  ok('…and never moves the target', !!G('cldMySnowball') && near(G('cldMySnowball').x, 170, 1e-6));
  SET('cldMySnowball', null);
  fresh([pen('0-0', 0, 100, 180), pen('0-1', 0, 260, 180)]);

  SET('cldPhase', 'resolving');
  const n = G('cldMyAims').length;
  down(60, 180); move(20, 180); up(20, 180);
  check('no aiming while the Slide resolves', G('cldMyAims').length, n);
  SET('cldPhase', 'aiming');
}

// ═══════════════════════════════════════════════════════════════════════════
// F. The replay split (spec § 5.3)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('F. The replay split');
  RUN("cldIceBreaker = 2; cldSyllyMode = false; cldPeckOff = false; cldFloeSize = 'standard'; cldIceConditions = 'slush'");
  RUN("cldStartMatch(['You', 'Sylvia', 'Sam']); cldStartFloeOff(7);");
  // Penguin 0 shoved straight at penguin 1 — there will be a collision to hear.
  RUN(`(() => {
    const a = cldPenguins[0], b = cldPenguins[1];
    cldCommits = [{ aims: [{ penguinId: a.id, dx: b.x - a.x, dy: b.y - a.y, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
  })()`);
  const tl = RUN('cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(11)))');
  const heard = [];
  S.__hooks = { sfx: m => heard.push(m), bark: () => heard.push('bark') };
  const screensBefore = screens.length, phaseBefore = G('cldPhase');
  RUN('cldArmPlayback')(tl);
  let r, guard = 0;
  do { r = RUN('cldStepPlayback(50, __hooks)'); } while (r === 'playing' && guard++ < 4000);
  check('the replay steps to done', r, 'done');
  check('stepping never shows a screen', screens.length, screensBefore);
  check('stepping never changes the phase', G('cldPhase'), phaseBefore);
  check('every event was walked', G('cldPlaybackEventPtr'), tl.events.length);
  heard.length = 0;
  RUN("cldPlayEvent({ type: 'plunge', id: 'nobody' }, __hooks)");
  check('a plunge sounds and barks through the hooks — never the live float layer', heard, ['plunge', 'bark']);
  SET('cldTimeline', null);
  check('no timeline → idle', RUN('cldStepPlayback(50, __hooks)'), 'idle');
  ok('the bark line comes from the pool', G('CLD_PLUNGE_BARKS').includes(RUN('cldBarkLine()')));
}

// ═══════════════════════════════════════════════════════════════════════════
// G. The swap (spec § 5.1, § 7.1 check 9(a))
// ═══════════════════════════════════════════════════════════════════════════
// Every top-level `let` in cld.js, read from the SOURCE — so a global added
// tomorrow is covered without anyone remembering to add it here.
function declaredLets() {
  const src = fs.readFileSync(GAME, 'utf8');
  const out = [];
  src.replace(/^let\s+([^;]+);/gm, (_, decl) => {
    decl.split(',').forEach(part => { const m = part.trim().match(/^(cld\w+)\s*(=|$)/); if (m) out.push(m[1]); });
    return '';
  });
  return out;
}
function safeJSON(v) {
  const seen = new WeakSet();
  return JSON.stringify(v, (k, x) => {
    if (typeof x === 'function') return '<fn>';
    if (x && typeof x === 'object') {
      if (typeof x.getContext === 'function' || x.tagName) return '<el>';
      if (seen.has(x)) return '<cycle>';
      seen.add(x);
    }
    return x;
  });
}
// The LIVE game's state: every declared let except the Arena's own (cldPr*).
function liveSnapshot() {
  const snap = {};
  declaredLets().filter(n => !/^cldPr/.test(n)).forEach(n => {
    let v; try { v = G(n); } catch (_) { v = '<tdz>'; }
    snap[n] = safeJSON(v);
  });
  return snap;
}
function diffSnap(a, b) { return Object.keys(a).filter(k => a[k] !== b[k]); }

if (!TUNE) {
  section('G. The swap');
  const lets = declaredLets();
  const swapSrc = RUN('cldSwapOut').toString();
  const exempt  = G('CLD_SWAP_EXEMPT');
  const swapped = n => new RegExp('\\b' + n + '\\b').test(swapSrc);
  const unclassified = lets.filter(n => !swapped(n) && !exempt.includes(n));
  const both = lets.filter(n => swapped(n) && exempt.includes(n));
  check('every top-level let is swapped or exempt', unclassified, []);
  check('no let is both swapped and exempt', both, []);

  // The live match from section F is still loaded. Run a whole Arena Slide.
  const before = liveSnapshot();
  const n = RUN(`cldArenaRun(() => {
    cldStartFloeOff(5);
    cldCommits = [{ aims: [{ penguinId: '0-0', dx: 1, dy: 0, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
    cldResolveSlide(9);
    return cldPenguins.length;
  })`);
  check('the Arena Slide ran on the Arena record', [n, G('cldPrFloe').slideNo], [3, 1]);
  check('the live game is byte-identical after an Arena Slide', diffSnap(before, liveSnapshot()), []);

  let threw = false;
  try { RUN("cldArenaRun(() => { cldPenguins = []; throw new Error('boom'); })"); } catch (_) { threw = true; }
  ok('a throw inside the swap propagates', threw);
  check('…and the live game is still restored', diffSnap(before, liveSnapshot()), []);
  check('…and the swap depth is back to 0', G('cldPrSwapDepth'), 0);

  const inner = RUN('cldArenaRun(() => cldArenaRun(() => cldSlideNo))');
  check('a nested call never double-swaps (sees the Arena record)', inner, 1);
  check('…and still leaves the live game alone', diffSnap(before, liveSnapshot()), []);
}

// ═══════════════════════════════════════════════════════════════════════════
// H. The drills (spec § 6.3–6.4; § 7.1 checks 3–6) — and `--tune`
// ═══════════════════════════════════════════════════════════════════════════
const HOLD = { aims: [], dive: null, snowball: null };
const arena = expr => RUN('cldArenaRun(() => ' + expr + ')');
const meNow = () => arena("cldPenguins.find(p => p.id === '0-0')");
function playOut() { let g = 0; while (G('cldPrUi').playing && g++ < 4000) RUN('cldPrTick(50)'); }
function resolveWith(commit) { S.__c = commit; RUN('cldPrResolve(__c)'); playOut(); }
function aimAt(angle, power) {
  return { aims: [{ penguinId: '0-0', dx: Math.cos(angle), dy: Math.sin(angle), power }], dive: null, snowball: null };
}
function load(key, keep) { RUN(`cldPrLoadDrill('${key}', ${!!keep})`); }
function startClean() {
  return arena(`(() => {
    for (const p of cldPenguins) {
      for (const b of cldBergs) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + CLD_PENGUIN_R) return false;
      for (const q of cldPenguins) if (q !== p && Math.hypot(p.x - q.x, p.y - q.y) < 2 * CLD_PENGUIN_R) return false;
    }
    return true; })()`);
}
// The drills' opening claims (spec § 3.4) — what --tune searches ring seeds for.
function collided(events, a, b) { return events.some(e => e.type === 'collision' && ((e.a === a && e.b === b) || (e.a === b && e.b === a))); }
function claimHolds(key) {
  load(key);
  if (key === 'crossfire') { resolveWith(HOLD); return arena('cldTimeline.events').some(e => e.type === 'collision' && (e.a === '0-0' || e.b === '0-0')); }
  if (key === 'headon') {
    resolveWith(HOLD);
    const ev = arena('cldTimeline.events');
    if (!collided(ev, '0-0', '1-0') && !collided(ev, '0-0', '2-0')) return false;
    for (let k = 0; k < 2 && !meNow().drowned; k++) resolveWith(HOLD);
    return !!meNow().drowned;
  }
  if (key === 'edge') { resolveWith(HOLD); if (meNow().drowned) return true; resolveWith(HOLD); return !!meNow().drowned; }
  return false;
}
function counters(key) {
  const found = [];
  for (let k = 0; k < 36; k++) for (const pw of [0.3, 0.5, 0.7, 0.9, 1]) {
    load(key); resolveWith(aimAt(k * Math.PI / 18, pw));
    if (!meNow().drowned) found.push([k * 10, pw]);
  }
  return found;
}

if (TUNE) {
  // Prints, per drill, the first ring seed at which every opening claim holds.
  // Paste the numbers into CLD_PR_DRILLS. Asserts nothing.
  const drills = G('CLD_PR_DRILLS');
  for (const key of Object.keys(drills)) {
    let hit = null;
    for (let seed = 1; seed <= 4000 && hit === null; seed++) {
      RUN(`CLD_PR_DRILLS['${key}'].ringSeed = ${seed}`);
      load(key);
      if (!startClean() || !claimHolds(key) || !counters(key).length) continue;
      hit = seed;
    }
    console.log(`${key.padEnd(10)} ringSeed: ${hit === null ? 'NONE in 1..4000 — move \`place\` and re-run' : hit}`);
  }
  process.exit(0);
}

if (!TUNE) {
  section('H. The drills and their plans');
  const keys = Object.keys(G('CLD_PR_DRILLS'));
  check('three drills, in order', keys, ['headon', 'crossfire', 'edge']);
  check('each drill is a plan both bots follow', keys.map(k => G('CLD_PR_DRILLS')[k].plan), ['headon', 'crossfire', 'edge']);
  const plans = () => G('cldPrUi').plans;
  const bot = i => arena(`cldPenguins.find(p => p.ownerIdx === ${i})`);
  const aimsAt = (i, tgt) => { const a = plans()[i].aims[0], b = bot(i);
    return !!a && near(Math.atan2(a.dy, a.dx), Math.atan2(tgt.y - b.y, tgt.x - b.x), 1e-9); };
  keys.forEach(key => {
    load(key);
    ok(`${key}: nobody starts overlapping a chunk or a penguin`, startClean());
    ok(`${key}: the opening claim holds`, claimHolds(key));
    ok(`${key}: at least one counter keeps you Standing`, counters(key).length > 0, 'none of 180 aims');
    load(key); resolveWith(aimAt(0.3, 0.8)); const t1 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    load(key); resolveWith(aimAt(0.3, 0.8)); const t2 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    ok(`${key}: the same aim meets the same plan — a byte-identical Slide`, t1 === t2);
  });

  load('headon');
  ok('Head-on: BOTH bots shove straight at You, full power',
     [1, 2].every(i => aimsAt(i, meNow()) && near(plans()[i].aims[0].power, 1)));
  arena("(() => { const me = cldPenguins.find(p => p.id === '0-0'); cldSeatAt(me, cldSeatSpot(0, me.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('Head-on: they keep coming when you are a plug', [1, 2].every(i => aimsAt(i, meNow())));
  arena("cldKnockBack(cldPenguins.find(p => p.id === '0-0'))");
  RUN('cldPrRefreshPlans()');
  ok('…and when you are knocked back', [1, 2].every(i => aimsAt(i, meNow())));

  load('crossfire');
  // The drill starts You ON the line between them, where "at the other bot" and
  // "at You" point the same way — so step You off it before asking who they want.
  arena("(() => { const me = cldPenguins.find(p => p.id === '0-0'); me.x = CLD_W / 2; me.y = CLD_H / 2 - 50; })()");
  RUN('cldPrRefreshPlans()');
  ok('Crossfire: each bot shoves at the other, not at You',
     aimsAt(1, bot(2)) && aimsAt(2, bot(1)) && !aimsAt(1, meNow()) &&
     near(plans()[1].aims[0].power, 0.95) && near(plans()[2].aims[0].power, 0.8));

  load('headon');
  arena("(() => { const b = cldPenguins.find(p => p.ownerIdx === 1); cldSeatAt(b, cldSeatSpot(Math.PI, b.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('a Drowned bot throws a Snowball at its Standing target instead',
     plans()[1].aims.length === 0 && !!plans()[1].snowball && near(plans()[1].snowball.x, meNow().x) && near(plans()[1].snowball.y, meNow().y));
  arena("(() => { const me = cldPenguins.find(p => p.id === '0-0'); cldSeatAt(me, cldSeatSpot(Math.PI / 2, me.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('…and holds when its target is in the Drink too', plans()[1].aims.length === 0 && plans()[1].snowball === null);

  // Edge: the cut sends you toward a gap (spec § 3.4: within 25° when you hold still).
  load('edge');
  const start = meNow();
  const toGap = arena(`(() => { const s = cldSeatSpot(cldAngleOf(${start.x}, ${start.y}), null);
    const g = cldRimPos(s.angle, cldFloeRadius); return Math.atan2(g.y - ${start.y}, g.x - ${start.x}); })()`);
  resolveWith(HOLD);
  const after = meNow();
  const moved = Math.atan2(after.y - start.y, after.x - start.x);
  const off = Math.abs(((moved - toGap + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  ok('Edge: holding still, the cut sends you toward the nearest gap', after.drowned || off < 25 * Math.PI / 180,
     'off by ' + (off * 180 / Math.PI).toFixed(1) + '°');

  S.window.matchMedia = () => ({ matches: true });
  load('headon'); S.__c = HOLD; RUN('cldPrResolve(__c)');
  ok('reduced motion: the Slide is finished the moment it is committed', G('cldPrUi').playing === false);
  S.window.matchMedia = () => ({ matches: false });

  // ── 9(b)/9(c): a LIVE replay is mid-flight; Arena Slides run between its steps.
  section('H2. Isolation under a live replay');
  S.__forbidden = [];
  ['cldBeginPlayback', 'cldEndPlayback', 'cldAdvancePlayback', 'cldShowFloe', 'cldSyncFloeUI',
   'cldHostResolveSlide', 'cldStartIceBathLocal', 'cldShowResult', 'cldFloatBark', 'cldFloatText']
    .forEach(fn => RUN(`(() => { const o = ${fn}; ${fn} = function () {
      if (cldPrSwapDepth > 0) __forbidden.push('${fn}'); return o.apply(this, arguments); }; })()`));
  const realShow = S.showScreen;
  S.showScreen = id => { if (G('cldPrSwapDepth') > 0) S.__forbidden.push('showScreen'); realShow(id); };

  RUN(`(() => {
    cldStartFloeOff(21);
    const a = cldPenguins[0], b = cldPenguins[1];
    cldCommits = [{ aims: [{ penguinId: a.id, dx: b.x - a.x, dy: b.y - a.y, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
    cldBeginPlayback(cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(33))));
    cldAdvancePlayback(200);
  })()`);
  check('the live replay is mid-flight', G('cldPhase'), 'resolving');
  const sent0 = sent.envelope + sent.private;
  let drift = [];
  const order = ['headon', 'crossfire', 'edge'];
  for (let i = 0; i < 20; i++) {
    const before = liveSnapshot();
    load(order[i % 3]);
    resolveWith(aimAt(i * 0.7, 0.4 + (i % 5) * 0.12));
    drift = drift.concat(diffSnap(before, liveSnapshot()));
    if (G('cldPhase') === 'resolving') RUN('cldAdvancePlayback(50)');   // Review Focus 3
  }
  check('20 Arena Slides between live replay steps leave the live game untouched', [...new Set(drift)], []);
  check('nothing on the "may not" list ran inside the swap', S.__forbidden, []);
  check('the Arena sent nothing', sent.envelope + sent.private - sent0, 0);
  S.showScreen = realShow;
}

// ═══════════════════════════════════════════════════════════════════════════
// H3. Rounds play to a natural end (spec § 3.4)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('H3. Rounds play to a natural end');
  // Four scripted players. Each returns MY commit for Slide k.
  const angleTo = expr => arena(`(() => { const me = cldPenguins.find(p => p.id === '0-0'); if (me.drowned) return null;
    const t = ${expr}; return t ? Math.atan2(t.y - me.y, t.x - me.x) : null; })()`);
  const POLICIES = {
    hold:    () => HOLD,
    random:  k => aimAt((k * 2.39996) % (2 * Math.PI), 0.35 + (k % 5) * 0.15),
    nearest: () => { const a = angleTo(`cldPenguins.filter(p => p.ownerIdx !== 0 && !p.drowned)
                       .sort((p, q) => Math.hypot(p.x - me.x, p.y - me.y) - Math.hypot(q.x - me.x, q.y - me.y))[0]`);
                     return a === null ? HOLD : aimAt(a, 0.8); },
    centre:  () => { const a = angleTo('({ x: CLD_W / 2, y: CLD_H / 2 })'); return a === null ? HOLD : aimAt(a, 0.5); },
  };
  const cap = G('CLD_PR_SLIDE_CAP');
  let worst = 0, allEnded = true, draws = [];
  for (const key of ['headon', 'crossfire', 'edge']) for (const name of Object.keys(POLICIES)) {
    load(key);
    let k = 0;
    while (!G('cldPrUi').end && k < cap + 5) { resolveWith(POLICIES[name](k)); k++; }
    const end = G('cldPrUi').end;
    if (!end) allEnded = false;
    if (end && end.draw) draws.push(key + '/' + name);
    worst = Math.max(worst, k);
  }
  ok('every drill ends against every scripted player', allEnded);
  check('…and none of them reaches the draw cap', draws, []);
  ok('…the longest took ' + worst + ' Slides, well inside the cap of ' + cap, worst < cap * 0.75);

  // A Washout starts the REAL Ice Bath in the Arena and the round carries on.
  load('headon');
  arena("(() => { cldTimeline = { washout: true, bathIds: cldPenguins.map(p => p.id), floeOffOver: false, winnerIdx: -1 }; })()");
  RUN('cldPrUi.before = cldArenaRun(() => cldPenguins.map(p => ({ id: p.id, drowned: false, plug: false })))');
  RUN('cldPrUi.playing = true'); RUN('cldPrSlideDone()');
  ok('a Washout starts the real Ice Bath in the Arena', arena('cldInBath') === true && G('cldPrUi').end === null);
  check('…and the coach says so', G('cldPrUi').coach.key, 'bath');

  // The cap: a drill with cap 1 is decided after one quiet Slide.
  load('crossfire');
  RUN('CLD_PR_DRILLS.crossfire.cap = 1');
  resolveWith(aimAt(Math.PI / 2, 0.08));
  const e1 = G('cldPrUi').end;
  RUN('delete CLD_PR_DRILLS.crossfire.cap');
  ok('the cap calls a still-running round a draw', !!e1 && (e1.draw === true || e1.winner >= 0));
}

// ═══════════════════════════════════════════════════════════════════════════
// I. The coach (spec § 3.5)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('I. The coach');
  const C = G('CLD_PR_COACH');
  const start = d => RUN('cldPrCoachStart')(d || 'headon');
  const step = (s, ...evs) => evs.reduce((acc, e) => RUN('cldPrCoach')(acc, e), s);
  const view = s => RUN('cldPrCoachView')(s);
  const D = x => Object.assign({ type: 'slideDone' }, x || {});
  let s = start('headon');
  check('opens on the drill’s plan plus how to aim, Slide 1, ring on the stage',
    [view(s).line, view(s).step, view(s).ring], [C['intro.headon'] + ' ' + C.aim, 'Slide 1', 'stage']);
  s = step(s, { type: 'armed' });
  check('the first arm teaches the lock, ring on Power', [view(s).line, view(s).ring], [C.armed, 'power']);
  s = step(s, { type: 'locked' });
  check('locked → ring on Lock It In', view(s).ring, 'commit');
  s = step(s, { type: 'committed' }, D());
  check('a quiet first Slide → "Same plan every Slide", Slide 2', [view(s).line, view(s).step], [C.again, 'Slide 2']);
  check('a later arm never repeats the lock tip', view(step(s, { type: 'armed' })).line, C.again);
  check('going in', view(step(s, D({ meIn: true }))).line, C.meIn);
  check('knocked back outranks going in, ring on Dive',
    [view(step(s, D({ meIn: true, meKnocked: true }))).line, view(step(s, D({ meKnocked: true }))).ring], [C.meKnocked, 'dive']);
  check('a bot going in is named', view(step(s, D({ botIn: 'Sylvia' }))).line, C.botIn.replace('{Name}', 'Sylvia'));
  check('a Washout → the Ice Bath line', view(step(s, D({ bath: true, meIn: true }))).line, C.bath);
  check('you win', view(step(s, D({ winner: 0 }))).line, C.win);
  check('a bot wins, by name', view(step(s, D({ winner: 2, winnerName: 'Sam' }))).line, C.lose.replace('{Name}', 'Sam'));
  check('the cap is a draw', view(step(s, D({ draw: true }))).line, C.draw);
  check('an ending rings Practice again', view(step(s, D({ winner: 0 }))).ring, 'again');
  const loaded = step(step(start('headon'), { type: 'armed' }), { type: 'load', drill: 'edge' });
  check('a new drill shows its own plan, and never re-teaches an arm you already did',
    [view(loaded).line, view(loaded).step], [C['intro.edge'], 'Slide 1']);
  const frozen = start(); step(frozen, { type: 'armed' });
  check('the reducer never mutates its input', frozen.armedOnce, false);
  ok('every coach line is set and emoji-free', Object.values(C)
     .every(l => typeof l === 'string' && l.length > 10 && !/\p{Extended_Pictographic}/u.test(l)));
  check('exactly the spec’s thirteen lines', Object.keys(C).sort(),
    ['again', 'aim', 'armed', 'bath', 'botIn', 'draw', 'intro.crossfire', 'intro.edge', 'intro.headon', 'lose', 'meIn', 'meKnocked', 'win']);
}

// ═══════════════════════════════════════════════════════════════════════════
// J. The tabs (spec § 6.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('J. The tabs');
  const $ = id => S.document.getElementById(id);
  const shown = () => ['rules', 'practice', 'cast'].filter(t => $('cld-howto-body-' + t).style.display === 'flex');
  RUN("cldSetHowtoTab('practice')"); check('Practice shows only its own body', shown(), ['practice']);
  RUN("cldSetHowtoTab('cast')");     check('The Cast shows only its own body', shown(), ['cast']);
  RUN("cldSetHowtoTab('rules')");    check('The Rules shows only its own body', shown(), ['rules']);
  ok('The Floe sandbox is gone', RUN("['cldHowtoSeed','cldHowtoShove','cldHowtoSettle','cldHowtoDrawFloe']" +
     ".every(n => { try { eval(n); return false; } catch (_) { return true; } })"));
  ok('its constants are gone too', RUN("typeof CLD_HOWTO_RADIUS === 'undefined' && typeof CLD_HOWTO_N === 'undefined'"));
  const html = fs.readFileSync(path.join(ROOT, 'src/screens/cld.html'), 'utf8');
  ok('the markup has the three tabs and no Floe tab',
     /data-cld-howto-tab="practice"/.test(html) && /data-cld-howto-tab="cast"/.test(html) &&
     !/data-cld-howto-tab="floe"/.test(html) && !/cld-howto-floe-canvas/.test(html));
  ok('How to Play step 2 teaches the cue', /Pull back to aim, like a pool cue/.test(html) && !/like a slingshot/.test(html));
}

// ═══════════════════════════════════════════════════════════════════════════
// K. The Arena on screen (spec § 6.2, § 6.6; D4, D5)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('K. The Arena on screen');
  const $ = id => S.document.getElementById(id);
  const sentAtStart = sent.envelope + sent.private;
  let rafSeq = 100;
  S.requestAnimationFrame = () => ++rafSeq;
  S.cancelAnimationFrame = () => {};
  const stage = $('cld-pr-stage'), canvas = $('cld-pr-canvas');
  canvas.parentElement = stage; stage.clientWidth = 0; stage.clientHeight = 0;
  RUN('cldResetState()');

  // Review Focus 4 — a hidden stage has no box; Practice sizes it on SHOW.
  RUN("cldSetHowtoTab('practice')");
  ok('a zero-size stage is left unsized', G('cldPrView') && G('cldPrView').scale === 1);
  RUN("cldSetHowtoTab('rules')");
  check('tab-away stops the Arena loop', G('cldPrRaf'), null);
  stage.clientWidth = 300; stage.clientHeight = 300;
  RUN("cldSetHowtoTab('practice')");
  ok('the canvas is sized and framed on the Arena floe when Practice is shown',
     near(G('cldPrView').base, 300 / RUN('cldViewFit(CLD_R_STD)'), 1e-9) && near(G('cldPrView').cam.z, 1, 1e-9));
  ok('the Arena loop runs while Practice shows', !!G('cldPrRaf'));
  check('it opens on Head-on, Slide 1', [G('cldPrUi').drill, $('cld-pr-coach-step').textContent], ['headon', 'Slide 1']);
  ok('the soft ring is on the stage', stage.classList.contains('cld-pr-ring'));
  check('Lock It In waits for an aim', $('btn-cld-pr-commit').disabled, true);
  const v = G('cldPrView');
  const ev = (x, y) => ({ clientX: v.offX + x * v.scale, clientY: v.offY + y * v.scale, pointerId: 7 });
  const you = arena("cldPenguins.find(p => p.id === '0-0')");
  const fx = you.x + 60, fy = you.y, PULL = G('CLD_CUE_PULL_PX');
  RUN('cldPrPointerDown')(ev(fx, fy));
  RUN('cldPrPointerMove')(ev(fx + PULL / v.scale, fy));
  RUN('cldPrPointerUp')(ev(fx + PULL / v.scale, fy));
  const aim = G('cldPrUi').aim;
  ok('a full pull on the Arena stage arms a full-power shot away from the finger',
     aim && near(aim.dx, -1) && near(aim.power, 1, 1e-6), JSON.stringify(aim));
  check('the coach teaches the lock and rings Power',
    [$('cld-pr-coach-line').textContent, $('btn-cld-pr-power').classList.contains('cld-pr-ring')], [G('CLD_PR_COACH').armed, true]);
  RUN("cldPrAction('power')");
  ok('Power locks and the ring moves to Lock It In', near(G('cldPrUi').lock, 1, 1e-6) && $('btn-cld-pr-commit').classList.contains('cld-pr-ring'));
  RUN("cldPrAction('cta')");
  check('committing starts the Slide', [G('cldPrUi').playing, $('btn-cld-pr-commit').textContent], [true, 'Sliding…']);
  // Review Focus 4 — the end card never shows while a Slide is still playing.
  RUN('CLD_PR_DRILLS.headon.cap = 1');
  let sawEndWhilePlaying = false, g = 0;
  while (G('cldPrUi').playing && g++ < 4000) {
    RUN('cldPrLoop')(1000 + g * 50);
    if (G('cldPrUi').playing && $('cld-pr-end').style.display === 'flex') sawEndWhilePlaying = true;
  }
  RUN('delete CLD_PR_DRILLS.headon.cap');
  ok('the loop plays the Slide out', !G('cldPrUi').playing);
  ok('the end card never showed while the Slide played', !sawEndWhilePlaying);
  check('with the round over, the end card shows the coach’s last line',
    [$('cld-pr-end').style.display, $('cld-pr-end-line').textContent, $('btn-cld-pr-commit').style.display],
    ['flex', $('cld-pr-coach-line').textContent, 'none']);
  RUN("cldPrAction('again')");
  check('Practice again: the same drill, a fresh floe', [G('cldPrUi').drill, G('cldPrUi').slides, G('cldPrUi').end, $('cld-pr-end').style.display],
        ['headon', 0, null, 'none']);
  RUN("cldPrAction('restart')");
  check('Start over resets the drill and your aim', [G('cldPrUi').slides, G('cldPrUi').aim], [0, null]);
  RUN("cldPrAction('drill', 'edge')");
  check('a drill pill switches and shows its plan', [G('cldPrUi').drill, $('cld-pr-coach-line').textContent], ['edge', G('CLD_PR_COACH')['intro.edge']]);

  // In the Drink: the Throw · Dive row, a Snowball tap, the amber reason.
  load('headon');
  for (let k = 0; k < 4 && !meNow().drowned && !G('cldPrUi').end; k++) resolveWith(HOLD);
  RUN('cldPrSyncUI()');
  if (meNow().drowned && !G('cldPrUi').end) {
    check('in the Drink: the Throw · Dive row shows', $('cld-pr-drowned-row').style.display, 'flex');
    check('…and Lock It In is always open to you', $('btn-cld-pr-commit').disabled, false);
    const sy = arena("cldPenguins.find(p => p.id === '1-0')");
    RUN('cldPrPointerDown')(ev(sy.x, sy.y)); RUN('cldPrPointerUp')(ev(sy.x, sy.y));
    ok('a tap aims a Snowball', !!G('cldPrUi').snowball);
    if (meNow().plug) {
      RUN("cldPrAction('mode', 'dive')");
      check('Plugged: Dive is refused, with the amber reason', [G('cldPrUi').mode, $('cld-pr-dive-reason').textContent],
            ['throw', 'You can Dive once you’re knocked back.']);
    }
  } else ok('Head-on puts you in the Drink within four still Slides', false, 'retune Head-on (Task 5 Step 4)');

  RUN('cldResetState()');
  check('cldResetState clears the Arena', [G('cldPrUi'), G('cldPrRaf'), G('cldPrFloe')], [null, null, null]);
  check('the Arena sent nothing, start to finish', sent.envelope + sent.private - sentAtStart, 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// L. Folded-in minors and the Arena's own camera
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('L. Folded-in minors and the Arena’s own camera');
  const $ = id => S.document.getElementById(id);
  const stage = $('cld-pr-stage'), canvas = $('cld-pr-canvas');
  canvas.parentElement = stage; stage.clientWidth = 300; stage.clientHeight = 300;
  RUN('cldResetState()');
  RUN('cldAimAssist = true'); RUN("cldSetHowtoTab('practice')");
  RUN("cldSetHowtoTab('rules')"); RUN('cldAimAssist = false'); RUN("cldSetHowtoTab('practice')");
  check('the Arena reads Aim Assist on every open', arena('cldAimAssist'), false);
  RUN('cldAimAssist = true');
  const c0 = G('cldPrClock');
  S.window.matchMedia = () => ({ matches: true });
  RUN('cldPrLoop')(5000); RUN('cldPrLoop')(5050);
  check('under reduced motion the Arena’s idle clock stands still', G('cldPrClock'), c0);
  S.window.matchMedia = () => ({ matches: false });
  RUN('cldResetState()');
}

// ── Report (keep LAST in the file) ─────────────────────────────────────────
if (!TUNE) {
  console.log('\n' + '='.repeat(70));
  console.log(failures ? `${failures} CHECK(S) FAILED` : `ALL CHECKS PASSED (${passes})`);
  process.exit(failures ? 1 : 0);
}
