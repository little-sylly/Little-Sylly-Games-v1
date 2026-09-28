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
  section('C. The view');
  const doc = S.document;
  const box = doc.createElement('div'); box.clientWidth = 320; box.clientHeight = 480;
  const cv  = doc.createElement('canvas'); box.appendChild(cv);
  cv.getBoundingClientRect = () => ({ left: 10, top: 20, width: 320, height: 480 });
  const v = RUN('cldMakeView')(cv);
  RUN('cldResize')(v);
  const VF = G('CLD_VIEW_FIT');
  ok('scale fits CLD_VIEW_FIT to the short axis', near(v.scale, 320 / VF, 1e-9), String(v.scale));
  ok('the long axis is centred', near(v.offY, (480 - 360 * v.scale) / 2, 1e-9));
  const c = RUN('cldToLogical')(v, { clientX: 10 + v.offX + 180 * v.scale, clientY: 20 + v.offY + 180 * v.scale });
  ok('cldToLogical inverts the fit (centre → 180,180)', near(c.x, 180, 1e-6) && near(c.y, 180, 1e-6), JSON.stringify(c));
  const v2 = RUN('cldMakeView')(doc.createElement('canvas'));
  ok('two views are independent objects', v2 !== v && v2.scale === 1);
  ok('the old view globals are gone', RUN("typeof cldViewScale === 'undefined' && typeof cldCanvas === 'undefined'"));
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
  const pen = (id, owner, x, y) => ({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null });
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

// ── Report (keep LAST in the file) ─────────────────────────────────────────
if (!TUNE) {
  console.log('\n' + '='.repeat(70));
  console.log(failures ? `${failures} CHECK(S) FAILED` : `ALL CHECKS PASSED (${passes})`);
  process.exit(failures ? 1 : 0);
}
