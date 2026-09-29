// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-loopback.js — HOST ↔ TWO CLIENTS loopback for Cold Shoulder,
// across a wire that behaves like Firebase Realtime Database.
//
//   node tools/verify-cld-loopback.js         (exits 1 on any failure)
//   CLD_SRC=path node tools/…                 (drive a deliberately-broken copy
//                                              of cld.js through the same wire)
//   CLD_PHYS_SRC=path node tools/…            (same, for js/lib/physics.js)
//
// The third Cold Shoulder harness, and the only one that sees the packet layer.
// verify-cld-physics.js owns the sim and verify-cld-loop.js owns the rules; both
// run in ONE process in 'single' mode with `getElementById: () => null`, which is
// what lets one process play all N seats and exactly what blinds them to the wire
// and to every line of render code.
//
// Two things this harness must have, or it passes while the game is broken:
//
//   1. A WIRE. Piping mpSendEnvelope straight into the receiver's handler passes
//      live JS references, so every empty collection survives a trip Firebase
//      would not have let it make. fbWrite/fbRead below reproduce the real
//      behaviour, and § 1 asserts the wire itself before anything else runs.
//
//      Firebase RTDB stores no `null`, no `{}` and no `[]`. A key holding any of
//      them is DELETED and the reader gets `undefined`. An all-null array vanishes
//      whole; a half-dense one comes back as an OBJECT keyed by index. Cold
//      Shoulder broadcasts reset values on purpose, so this bites it repeatedly:
//      `events: []` on a collision-free Slide, `aftermath: []` on a Slide with no
//      surfacings, `bergs: []` with Ice Breaker off, `angle: null` while Standing,
//      `aims: []` from a Drowned player committing only a Dive.
//
//   2. A DOM OF REAL MOCK ELEMENTS. `getElementById: () => null` short-circuits
//      every `if (!el) return` guard, so no render code executes at all and a
//      render throw inside a SYNC applier is invisible. Here every applier's
//      render runs for real and a throw is recorded against the device.
//
// TWO clients, not one — because a two-device loopback cannot tell "the host
// broadcast to everyone" apart from "the host answered the sender". CLD_SLIDE_TALLY
// and CLD_SLIDE_RESOLVE both have to reach the seat that did not just submit.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');
const ART  = process.env.CLD_ART_SRC  || path.join(ROOT, 'js/games/cld-art.js');

const physSrc = fs.readFileSync(PHYS, 'utf8');
const gameSrc = fs.readFileSync(GAME, 'utf8');
const artSrc  = fs.readFileSync(ART, 'utf8');

// ── The wire ───────────────────────────────────────────────────────────────
// fbWrite = what Firebase actually persists. fbRead = what the SDK hands back.
// Scalars survive intact — 0, false and '' are all legitimate stored values; only
// null/undefined and containers left empty by them are dropped.
function fbWrite(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  const keys = Array.isArray(v) ? v.map((_, i) => String(i)) : Object.keys(v);
  keys.forEach(k => {
    const w = fbWrite(Array.isArray(v) ? v[Number(k)] : v[k]);
    if (w !== undefined) out[k] = w;
  });
  return Object.keys(out).length ? out : undefined;     // {} and [] are deletions
}

function fbRead(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  const keys = Object.keys(v);
  const numeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
  if (numeric) {
    const max = Math.max(...keys.map(Number));
    // The SDK materialises an array when the numeric keys are at least half dense;
    // below that it stays an object. Missing slots come back as null holes.
    if (keys.length * 2 > max + 1) {
      const arr = [];
      for (let i = 0; i <= max; i++) {
        arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      }
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}

const wire = env => {
  const stored = fbWrite(env);
  return stored === undefined ? undefined : fbRead(stored);
};

// ── DOM mock with REAL elements ────────────────────────────────────────────
function makeDocument() {
  const byId = {};
  const mk = tag => ({
    tagName: tag, children: [], style: {}, dataset: {},
    className: '', textContent: '', disabled: false, width: 0, height: 0,
    // innerHTML must be a real setter: `el.innerHTML = ''` is how cld's renderers
    // clear before repainting, and a plain property would let children accumulate.
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 420 }),
    // The result screen paints a penguin through the real render seam.
    getContext: () => ctx2d(),
    setAttribute() {}, getAttribute: () => null,
  });
  return {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) { return byId[id] || (byId[id] = mk('div')); },
    __byId: byId,
  };
}

// The render seam draws through CldArt.penguin, which builds the body as a
// Path2D and hands it to ctx.fill(path). No shape is inspected here — only that
// every call answers.
function Path2DStub() {}
Path2DStub.prototype.moveTo = function () {};
Path2DStub.prototype.lineTo = function () {};
Path2DStub.prototype.arc = function () {};
Path2DStub.prototype.ellipse = function () {};
Path2DStub.prototype.rect = function () {};
Path2DStub.prototype.closePath = function () {};
Path2DStub.prototype.quadraticCurveTo = function () {};
Path2DStub.prototype.bezierCurveTo = function () {};
Path2DStub.prototype.addPath = function () {};

// A canvas context that records nothing but answers every call — enough for
// cldRenderPenguin / cldDraw to execute end to end without throwing.
function ctx2d() {
  const noop = () => {};
  return {
    canvas: { width: 360, height: 420 },
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
    createPattern: () => ({}), arcTo() {}, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
  };
}

// ── One device ─────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  const sounds  = [];
  let seq = 0;

  const doc = makeDocument();
  const sandbox = {
    console,
    document: doc,
    window: {
      syllyMultiplayerMode: mode, isSecretMode: false, activeExpansionOverrides: null,
      devicePixelRatio: 1, addEventListener() {},
    },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    openSoundOverlay() {}, resetToLobby() { sandbox.__dissolved = true; },
    // Every play*() the audio map can reach, recorded so the beats can be asserted.
    playLaunch: () => sounds.push('launch'), playExit: () => sounds.push('exit'),
    playDone: () => sounds.push('done'), playSuccess: () => sounds.push('success'),
    playBoing: () => sounds.push('boing'), playWhoosh: () => sounds.push('whoosh'),
    playAbyssThud: () => sounds.push('abyssThud'), playHullThud: () => sounds.push('hullThud'),
    playAlarm: () => sounds.push('alarm'), playSplash: () => sounds.push('splash'),
    playTick: () => sounds.push('tick'), playPillClick: () => sounds.push('pill'),
    playSyllyOn() {}, playSyllyOff() {}, playResume() {}, playSonarPing() {},
    playStampede() {}, playUnchallenged() {}, playPoacher() {}, playClashWin() {},
    mpLockSync() { sandbox.__locked = true; }, mpUnlockSync() { sandbox.__locked = false; },
    mpNotifyPlayerLeft() { sandbox.__notifiedLeft = true; },
    mpReturnToLobby() { sandbox.__returned = true; },
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    Path2D: Path2DStub,
    __locked: false, __dissolved: false, __notifiedLeft: false, __returned: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors, __sounds: sounds,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(physSrc, sandbox, { filename: `physics.js (${name})` });
  vm.runInContext(artSrc, sandbox, { filename: `cld-art.js (${name})` });   // SW v246 — before cld.js, as in the page
  vm.runInContext(gameSrc, sandbox, { filename: `cld.js (${name})` });

  const BRIDGE = `
globalThis.__cld = {
  get penguins()   { return cldPenguins; },
  get bergs()      { return cldBergs; },
  get commits()    { return cldCommits; },
  get radius()     { return cldFloeRadius; },
  get fish()       { return cldFish; },
  get stats()      { return cldMatchStats; },
  get names()      { return cldPlayerNames; },
  get count()      { return cldPlayerCount; },
  get slideNo()    { return cldSlideNo; },
  get floeOffNo()  { return cldFloeOffNo; },
  get phase()      { return cldPhase; },
  get committed()  { return cldCommitted; },
  get introIdx()   { return cldIntroIdx; },
  get introMode()  { return cldIntroMode; },
  get timeline()   { return cldTimeline; },
  get sylly()      { return cldSyllyMode; },      set sylly(v)      { cldSyllyMode = v; },
  get peckOff()    { return cldPeckOff; },        set peckOff(v)    { cldPeckOff = v; },
  get iceBreaker() { return cldIceBreaker; },     set iceBreaker(v) { cldIceBreaker = v; },
  get fishToWin()  { return cldFishToWin; },      set fishToWin(v)  { cldFishToWin = v; },
  get ice()        { return cldIceConditions; },  set ice(v)        { cldIceConditions = v; },
  get floeSize()   { return cldFloeSize; },       set floeSize(v)   { cldFloeSize = v; },
  set touched(v)   { cldFloeSizeTouched = v; },
  get myAims()     { return cldMyAims; },
  get myDive()     { return cldMyDive; },
  get lastBodyIds() { return cldTimeline && cldTimeline.bodyIds; },
  get inBath()     { return cldInBath; },

  // Entry points, exactly as the engine and the UI call them.
  startMatch(names)   { cldStartMatchLocal(names); },
  standby()           { cldShowClientStandby(); },
  handle(env)         { cldHandleEnvelope(env); },
  showFloe()          { cldShowFloe(); },
  syncUI()            { cldSyncFloeUI(); },
  commit()            { cldCommit(); },
  resetState()        { cldResetState(); },

  // Arming an aim without a pointer: cldMyAims is what cldBuildMyCommit reads.
  arm(id, dx, dy, power) { cldMyAims = [{ penguinId: id, dx, dy, power }]; },
  dive(d)                { cldMyDive = d; },         // null | { penguinId, angle }
  mode(m)                { cldMyMode = m; },         // 'throw' | 'dive'
  snowball(x, y)         { cldMySnowball = { x, y }; },
  buildCommit()          { return cldBuildMyCommit(); },
  canCommit()            { return cldCanCommit(); },
  myIdx()                { return cldMyIdx(); },
  myPenguins()           { return cldMyPenguins().map(p => p.id); },

  // Host-side authority, driven directly for the rejection cases.
  applyCommit(i, c, s)   { return cldApplyCommit(i, c, s); },
  hostResolve()          { cldHostResolveSlide(); },
  floeOffPayload()       { return cldFloeOffStartPayload(); },
  wirePenguins(v)        { return cldWirePenguins(v); },
  wireCommit(c)          { return cldWireCommit(c); },

  // Rendered text, read back off the real mock elements.
  tally()      { return document.getElementById('cld-tally').textContent; },
  header()     { return document.getElementById('cld-floe-header').textContent; },
  commitBtn()  { var b = document.getElementById('btn-cld-commit');
                 return { text: b.textContent, disabled: b.disabled, cls: b.className,
                          display: b.style.display }; },
  introText()  { return { h: document.getElementById('cld-intro-heading').textContent,
                          s: document.getElementById('cld-intro-sub').textContent }; },
  resultText() { return { h: document.getElementById('cld-result-heading').textContent,
                          s: document.getElementById('cld-result-sub').textContent }; },
  scoreRows()  { return document.getElementById('cld-scoreboard-rows').children
                          .map(r => r.children[1].textContent); },
  nextBtn()    { return document.getElementById('btn-cld-next-floeoff').style.display; },
  waiting()    { return document.getElementById('cld-scoreboard-waiting').style.display; },
  podiumRows() { return document.getElementById('cld-podium').children
                          .map(r => ({ medal: r.children[0].children[0].textContent,
                                       name:  r.children[0].children[1].textContent })); },
};`;
  vm.runInContext(BRIDGE, sandbox, { filename: `cld-loopback-bridge (${name})` });
  return sandbox;
}

// ── Assertions ─────────────────────────────────────────────────────────────
let failures = 0;
// A crash anywhere is a FAILED RUN, not a broken harness. Without this, driving a
// deliberately-broken cld.js through CLD_SRC= ends the process mid-file and the
// checks after the crash are never reported at all — which reads as a harness bug
// rather than as the finding it is.
process.on('uncaughtException', e => {
  console.log('\n  FAIL  the run crashed before it finished\n          ' + e.stack);
  console.log('\n' + '='.repeat(70));
  console.log('FAILED — crashed after ' + failures + ' recorded failure(s)');
  process.exit(1);
});
function check(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  if (!good) failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function ok(label, cond, detail) {
  if (!cond) failures++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}` +
    (cond ? '' : `\n          ${detail === undefined ? '(condition false)' : detail}`));
}
const section = t => console.log(`\n${t}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('Cold Shoulder — host↔2 clients loopback over a Firebase-shaped wire');
console.log('='.repeat(70));

section('1. The wire itself — Firebase erasure, reproduced');
// `keep` is a sibling that always survives, so these assert the FIELD is erased
// rather than the whole envelope collapsing.
check('empty object is deleted',       wire({ a: {}, keep: 1 }),           { keep: 1 });
check('empty array is deleted',        wire({ a: [], keep: 1 }),           { keep: 1 });
check('all-null array is deleted',     wire({ a: [null, null], keep: 1 }), { keep: 1 });
check('null scalar is deleted',        wire({ a: null, keep: 1 }),         { keep: 1 });
check('0 survives',                    wire({ a: 0 }),                     { a: 0 });
check('false survives',                wire({ a: false }),                 { a: false });
check('-1 survives (winnerIdx)',       wire({ a: -1 }),                    { a: -1 });
check('dense array round-trips',       wire({ a: [1, 2, 3] }),             { a: [1, 2, 3] });
check('all-zero array round-trips',    wire({ a: [0, 0, 0, 0] }),          { a: [0, 0, 0, 0] });
check('all-false array round-trips',   wire({ a: [false, false] }),        { a: [false, false] });
// Half-dense is not dense enough — the SDK leaves it an object keyed by index,
// which is why cldWireArr/cldWireList must read v[i] rather than assume an array.
check('half-dense → object',           wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });
check('mostly-dense → array + holes',  wire({ a: ['w', 'x', null, 'y'] }),  { a: ['w', 'x', null, 'y'] });
// The exact shapes Cold Shoulder puts on the wire at their reset values.
check('a Standing penguin keeps 0-valued fields and rebuilds plug/angle/seq',
  wire({ p: { id: '0-0', ownerIdx: 0, x: 180, y: 108, drowned: false, plug: false, angle: null, seq: null } }),
  { p: { id: '0-0', ownerIdx: 0, x: 180, y: 108, drowned: false, plug: false } });
check('a Floe-Off-1 all-zero fish[] survives', wire({ fish: [0, 0, 0] }), { fish: [0, 0, 0] });
check('an all-zero stats[] survives',
  wire({ stats: [{ slidesStood: 0, plunges: 0 }, { slidesStood: 0, plunges: 0 }] }),
  { stats: [{ slidesStood: 0, plunges: 0 }, { slidesStood: 0, plunges: 0 }] });
check('a Drowned player’s aims: [] is erased, a Dive target survives',
  wire({ commit: { aims: [], dive: { penguinId: '1-0', angle: 0 }, snowball: null } }),
  { commit: { dive: { penguinId: '1-0', angle: 0 } } });
check('a zero-power HOLD aim survives (penguinId keeps it non-empty)',
  wire({ aims: [{ penguinId: '1-1', dx: 0, dy: 0, power: 0 }] }),
  { aims: [{ penguinId: '1-1', dx: 0, dy: 0, power: 0 }] });
// A samples row is a dense array of ints in the 30..330 band; it must survive
// verbatim, because interpolation indexes it POSITIONALLY and a filtered hole
// would silently shift every body after it.
check('a samples row round-trips positionally',
  wire({ s: [[180, 108, 231, 180], [174, 121, 228, 176]] }),
  { s: [[180, 108, 231, 180], [174, 121, 228, 176]] });

// ── Stand up the three devices ─────────────────────────────────────────────
const NAMES = ['Ali', 'Bec', 'Cam'];
const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));

const host = makeDevice('host',    'host',   0, SLOTS);
const c1   = makeDevice('client1', 'client', 1, SLOTS);
const c2   = makeDevice('client2', 'client', 2, SLOTS);
const DEV  = { host, c1, c2 };
const H = host.__cld, C1 = c1.__cld, C2 = c2.__cld;

// Host → wire → BOTH clients. Every send is recorded so ordering can be asserted.
const sent = [];        // cleared between sections, for local ordering checks
const allSent = [];     // never cleared — the whole session's traffic
host.mpSendEnvelope = env => {
  const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
  sent.push(onWire.payload.action);
  allSent.push({ type: onWire.type, action: onWire.payload.action, payload: onWire.payload });
  [[c1, C1], [c2, C2]].forEach(([dev, br]) => {
    try { br.handle(onWire); }
    catch (e) { dev.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  });
};
// The host must NEVER write the private channel in this game — every private
// packet in Cold Shoulder travels client → host.
host.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };

// Client → wire → host. A client's ONLY outbound packet is the private commit.
const privateSends = [];
const publicFromClients = [];
[[c1, 'u1'], [c2, 'u2']].forEach(([dev, uid]) => {
  dev.mpSendPrivate = (target, env) => {
    const onWire = wire({ ...env, originId: uid, timestamp: Date.now() });
    privateSends.push({ from: uid, to: target, action: onWire.payload.action, env: onWire });
    try { H.handle(onWire); }
    catch (e) { host.__errors.push(`private ${onWire.payload.action}: ${e.message}`); }
  };
  dev.mpSendEnvelope = env => {
    // Recorded, not thrown: a commit leaking onto the PUBLIC channel is the one
    // failure this whole harness exists to catch, and it must be reported as a
    // failed check rather than as an exception inside a click handler.
    publicFromClients.push({ from: uid, action: env.payload && env.payload.action });
  };
});

const lastScreen = dev => dev.__screens[dev.__screens.length - 1];
// Fire the earliest pending timer on a device (the intro auto-advance, the
// result dwell, the Washout beat).
function step(dev) {
  if (!dev.__timers.length) return false;
  dev.__timers.sort((a, b) => a.at - b.at);
  const t = dev.__timers.shift();
  try { t.fn(); } catch (e) { dev.__errors.push(`timer: ${e.message}`); }
  return true;
}
const stepAll = () => { [host, c1, c2].forEach(step); };
// Fire exactly the timers pending at entry, in order — never the ones those
// callbacks arm in turn, which is what makes "did this device broadcast when its
// timer fired" a bounded question.
function drainPending(dev) {
  const pending = dev.__timers.slice().sort((a, b) => a.at - b.at);
  dev.__timers = dev.__timers.filter(t => !pending.includes(t));
  pending.forEach(t => { try { t.fn(); } catch (e) { dev.__errors.push('timer: ' + e.message); } });
  return pending.length;
}
// Playback is driven by rAF in the app; here it is pumped directly, in the same
// ms budget the real loop clamps to (50 ms/frame max).
function playback(dev, br) {
  let guard = 0;
  try {
    vm.runInContext('cldAdvancePlayback(50);', dev);
    while (br.phase === 'resolving' && guard++ < 4000) vm.runInContext('cldAdvancePlayback(50);', dev);
  } catch (e) {
    // Recorded, never rethrown. A render or applier throw during playback is
    // exactly the class of defect this harness exists to surface, and it has to
    // arrive as a failed check rather than as a stack trace that stops the run.
    dev.__errors.push('playback: ' + e.message);
  }
  return guard;
}
const errs = () => [host.__errors, c1.__errors, c2.__errors].flat();

section('1b. Cold Shoulder’s own normalisers rebuild what the wire erased (SW v243)');
check('…a Standing penguin reads back plug/angle/seq as false / null / null, never undefined',
  (() => { const p = H.wirePenguins([{ id: '0-0', ownerIdx: 0, x: 1, y: 2, drowned: false }])[0];
           return [p.plug, p.angle, p.seq]; })(), [false, null, null]);
check('dive: null is erased in flight and rebuilt as null',
  H.wireCommit((wire({ c: { aims: [], dive: null, snowball: null } }) || {}).c || {}).dive, null);
check('a Dive survives as { penguinId, angle }, angle 0 included',
  H.wireCommit({ aims: [], dive: { penguinId: '1-0', angle: 0 }, snowball: null }).dive,
  { penguinId: '1-0', angle: 0 });

// ═══════════════════════════════════════════════════════════════════════════
section('2. Match start — the clients follow the host onto the ice');
C1.standby(); C2.standby();
check('client 1 parks on the Floe-Off intro', lastScreen(c1), 'screen-cld-floeoff-intro');
check('…in standby mode, with no auto-advance armed', [C1.introMode, c1.__timers.length], ['standby', 0]);
check('…and its heading says so', C1.introText().h, 'Standing by…');

H.iceBreaker = 3; H.fishToWin = 3; H.touched = true; H.floeSize = 'standard';
H.startMatch(NAMES);
check('the host broadcast exactly one packet', sent, ['CLD_FLOEOFF_START']);
check('…and it is the Floe-Off start', sent[0], 'CLD_FLOEOFF_START');
check('no client wrote the public channel', publicFromClients, []);
check('nothing threw on any device', errs(), []);

check('every device agrees on the roster',
  [H.names, C1.names, C2.names], [NAMES, NAMES, NAMES]);
check('every device agrees on the floe radius',
  [H.radius, C1.radius, C2.radius], [H.radius, H.radius, H.radius]);
check('every device agrees on the penguins',
  [C1.penguins, C2.penguins], [H.penguins, H.penguins]);
check('every device agrees on the Bergs',
  [C1.bergs, C2.bergs], [H.bergs, H.bergs]);
// The two fields §11 flags as erasable at their reset value.
check('Floe-Off 1 fish[] survived as all-zero', [C1.fish, C2.fish], [[0, 0, 0], [0, 0, 0]]);
check('match-start stats[] survived as all-zero', C1.stats,
  [{ slidesStood: 0, plunges: 0 }, { slidesStood: 0, plunges: 0 }, { slidesStood: 0, plunges: 0 }]);
check('the flavour line is host-picked, not per-device',
  [C1.introIdx, C2.introIdx], [H.introIdx, H.introIdx]);
check('…so all three read the same intro sentence',
  [C1.introText().s, C2.introText().s], [H.introText().s, H.introText().s]);
check('the clients left standby for the real intro',
  [C1.introMode, C2.introMode], ['intro', 'intro']);
check('…with the auto-advance now armed on every device',
  [host.__timers.length, c1.__timers.length, c2.__timers.length], [1, 1, 1]);

section('3. Onto the floe');
stepAll();
check('all three devices reached the floe',
  [lastScreen(host), lastScreen(c1), lastScreen(c2)],
  ['screen-cld-floe', 'screen-cld-floe', 'screen-cld-floe']);
check('the tally starts at zero and names nobody', H.tally(), '0 of 3 locked in');
check('…identically on both clients', [C1.tally(), C2.tally()], ['0 of 3 locked in', '0 of 3 locked in']);

section('4. The private commit path, end to end');
// Client 1 commits first. Aims are ARMED locally, exactly as a drag would leave them.
C1.arm(C1.myPenguins()[0], 1, 0, 0.8);
C1.commit();
check('the client wrote the PRIVATE channel, once', privateSends.length, 1);
// Guarded: if the commit went out publicly instead, privateSends is EMPTY and an
// unguarded index would end the run with a TypeError rather than a finding.
const firstPriv = privateSends[0] || { to: null, action: null, env: {} };
check('…addressed to the host’s uid, not broadcast', firstPriv.to, 'u0');
check('…as an ACTION named CLD_COMMIT',
  [firstPriv.env.type, firstPriv.action], ['ACTION', 'CLD_COMMIT']);
check('the aim NEVER touched the public channel', publicFromClients, []);
check('…and the sync lock greyed the client’s CTA', c1.__locked, true);
check('the host recorded seat 1 and nobody else',
  H.commits.map(c => c === null ? null : 'set'), [null, 'set', null]);
check('the aim survived the wire intact', (H.commits[1] || {}).aims,
  [{ penguinId: '1-0', dx: 1, dy: 0, power: 0.8 }]);
check('the host broadcast a tally', sent.slice(1), ['CLD_SLIDE_TALLY']);

// The tally is a COUNT. Nothing in the packet can name a player.
const tallyEnv = (() => {
  let captured = null;
  const real = host.mpSendEnvelope;
  host.mpSendEnvelope = env => { captured = env; real(env); };
  C2.arm(C2.myPenguins()[0], -1, 0, 0.6);
  C2.commit();
  host.mpSendEnvelope = real;
  // Guarded the same way: if the commit never reached the host, no tally is sent
  // and an unguarded read here would end the run instead of reporting it.
  return captured || { payload: {} };
})();
check('the tally carries a count and a total, and no name',
  Object.keys(tallyEnv.payload).sort(), ['action', 'locked', 'slideNo', 'total']);
ok('…and no player name appears anywhere in it',
  !NAMES.some(n => JSON.stringify(tallyEnv.payload).includes(n)),
  JSON.stringify(tallyEnv.payload));
check('the tally reached the seat that did NOT submit', C1.tally(), '2 of 3 locked in');
check('…and the submitting seat too', C2.tally(), '2 of 3 locked in');
check('a committed client’s CTA becomes a waiting label',
  [C1.commitBtn().text, C1.commitBtn().disabled], ['Locked in — waiting on 1', true]);

section('5. A duplicate commit is REJECTED, never applied');
// mpSendPrivate bypasses mpSendEnvelope's sync-lock backstop, so a double-tap
// genuinely puts two packets on the wire. The host is the only authority.
const before = JSON.stringify(H.commits[1]);
const dupe = { ...firstPriv.env, type: 'ACTION' };
dupe.payload = { ...dupe.payload, commit: { aims: [{ penguinId: '1-0', dx: -1, dy: 0, power: 1 }], dive: null } };
H.handle(dupe);
check('the host kept the FIRST commit', JSON.stringify(H.commits[1]), before);
check('…and sent no extra tally for it', sent.filter(a => a === 'CLD_SLIDE_TALLY').length, 2);
check('a commit tagged with a stale Slide is rejected',
  H.applyCommit(0, { aims: [], dive: null, snowball: null }, 99), false);
check('a commit from an unknown sender is rejected',
  H.applyCommit(-1, { aims: [], dive: null, snowball: null }, H.slideNo), false);
check('…and neither of those changed the array',
  H.commits.map(c => c === null ? null : 'set'), [null, 'set', 'set']);
check('the gate is still shut with one seat outstanding', H.phase, 'aiming');

section('6. The gate closes, the host resolves, the clients replay');
check('the host has not committed yet', H.commits[0], null);
H.arm(H.myPenguins()[0], 0, 1, 0.9);
H.commit();
// cldResolveSlide() clears cldCommits, so the host's own slot cannot be read back
// afterwards — the observable property is that its own tap closed the gate while
// the host put no ACTION on the wire at all. A self-sent ACTION would have been
// dropped by the originId === syllyDeviceUid dedup guard and the Slide would hang.
check('the host never sent an ACTION — its own slot went in directly',
  allSent.filter(e => e.type === 'ACTION'), []);
check('…and its own tap closed the gate', sent[sent.length - 1], 'CLD_SLIDE_RESOLVE');
check('every packet the host has ever sent is a SYNC',
  [...new Set(allSent.map(e => e.type))], ['SYNC']);
check('nothing threw on any device', errs(), []);
check('every device is in playback',
  [H.phase, C1.phase, C2.phase], ['resolving', 'resolving', 'resolving']);
check('the resolve released the clients’ sync locks', [c1.__locked, c2.__locked], [false, false]);

// Guarded like the packet reads above: on a build where the gate never closes
// there is no timeline at all, and that must report as failed checks rather than
// end the run four sections early.
const NO_TL = { samples: [] };
const H_TL = H.timeline || NO_TL, C1_TL = C1.timeline || NO_TL;
check('the host replays a timeline built from its OWN broadcast payload',
  H_TL.post !== undefined, true);
check('host and client timelines are byte-identical',
  JSON.stringify(C1_TL), JSON.stringify(H_TL));
check('…and so are both clients’', JSON.stringify(C2.timeline), JSON.stringify(C1_TL));
ok('the timeline carries samples', H_TL.samples.length > 0, 'samples=' + H_TL.samples.length);
ok('no commit-derived intention field appears in the timeline',
  H_TL.dives === undefined && H_TL.aims === undefined && H_TL.commits === undefined,
  Object.keys(H_TL).join(','));

// Pump every device's playback to completion, in lockstep.
[[host, H], [c1, C1], [c2, C2]].forEach(([dev, br]) => playback(dev, br));
check('nothing threw during playback on any device', errs(), []);
check('every device left playback', [H.phase, C1.phase, C2.phase].map(p => p !== 'resolving'),
  [true, true, true]);
check('the resolved rim is identical on every device',
  [JSON.stringify(C1.penguins), JSON.stringify(C2.penguins)],
  [JSON.stringify(H.penguins), JSON.stringify(H.penguins)]);
check('…as are the Bergs', JSON.stringify(C1.bergs), JSON.stringify(H.bergs));
check('…the Fish', [C1.fish, C2.fish], [H.fish, H.fish]);
check('…the match stats', JSON.stringify(C1.stats), JSON.stringify(H.stats));
check('…and the Slide counter', [C1.slideNo, C2.slideNo], [H.slideNo, H.slideNo]);
check('the commits array was cleared on every device',
  [H.commits.every(c => c === null), C1.commits.every(c => c === null)], [true, true]);

section('7. A collision-free Slide — the empty events[] round trip');
// Straight to the rim from a standing start with nothing in the way: the Slide
// produces a plunge but no penguin-on-penguin collision. What matters is that
// whatever list ends up EMPTY is rebuilt rather than applied as undefined.
{
  const emptyTl = { samples: [[1, 2]], events: [], aftermath: [], durationMs: 0,
                    slideNo: 9, radius: 130, washout: false, floeOffOver: false,
                    winnerIdx: -1, matchOver: false };
  let payload;
  vm.runInContext('globalThis.__probe = cldTimelinePayload(' + JSON.stringify(emptyTl) + ');', host);
  payload = host.__probe;
  const onWire = wire({ type: 'SYNC', payload, originId: 'u0', timestamp: Date.now() });
  check('events[] and aftermath[] are ERASED in flight',
    [onWire.payload.events, onWire.payload.aftermath], [undefined, undefined]);
  let rebuilt;
  vm.runInContext('globalThis.__probe2 = cldTimelineFromPayload(' +
    JSON.stringify(onWire.payload) + ');', c1);
  rebuilt = c1.__probe2;
  check('…and rebuilt as real empty arrays on receipt',
    [rebuilt.events, rebuilt.aftermath], [[], []]);
  check('…with the rest of the timeline intact',
    [rebuilt.slideNo, rebuilt.durationMs, rebuilt.winnerIdx, rebuilt.washout],
    [9, 0, -1, false]);
  check('a samples row survived positionally', rebuilt.samples, [[1, 2]]);
}

section('8. Ice Breaker Off — an empty bergs[] round trip');
{
  const h2 = makeDevice('host2', 'host', 0, SLOTS);
  h2.mpSendEnvelope = () => {};
  h2.__cld.iceBreaker = 0; h2.__cld.touched = true;
  h2.__cld.startMatch(NAMES);
  check('the host placed no Bergs', h2.__cld.bergs, []);
  let payload;
  vm.runInContext('globalThis.__probe = cldFloeOffStartPayload();', h2);
  payload = h2.__probe;
  const onWire = wire({ type: 'SYNC', payload, originId: 'u0', timestamp: Date.now() });
  check('bergs[] is ERASED in flight', onWire.payload.bergs, undefined);
  const cc = makeDevice('client3', 'client', 1, SLOTS);
  cc.mpSendPrivate = () => {}; cc.mpSendEnvelope = () => {};
  cc.__cld.handle(onWire);
  check('…and rebuilt as a real empty array', cc.__cld.bergs, []);
  check('…without throwing', cc.__errors, []);
  check('a Standing penguin’s plug/angle/seq came back as false / null / null, not undefined',
    cc.__cld.penguins.every(p => p.plug === false && p.angle === null && p.seq === null), true);
}

section('9. A Drowned player commits a Dive and nothing else');
{
  const hd = makeDevice('host4', 'host', 0, SLOTS);
  const cd = makeDevice('client4', 'client', 1, SLOTS);
  const relay = [];
  hd.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    relay.push(w.payload.action);
    try { cd.__cld.handle(w); } catch (e) { cd.__errors.push(e.message); }
  };
  hd.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };
  cd.mpSendEnvelope = env => { publicFromClients.push({ from: 'u1', action: env.payload.action }); };
  let sentPriv = null;
  cd.mpSendPrivate = (to, env) => {
    sentPriv = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { hd.__cld.handle(sentPriv); } catch (e) { hd.__errors.push(e.message); }
  };
  hd.__cld.touched = true; hd.__cld.startMatch(NAMES);
  step(hd); step(cd);
  // Knock client 1's penguin back — on the host AND that client, as a Slide would
  // have — then let it commit a Dive with no aims and no Snowball.
  const knock = "var p = cldPenguins[1]; p.drowned = true; p.plug = false; p.angle = 0.5; cldPlaceDrowned(p);";
  vm.runInContext(knock, hd);
  vm.runInContext(knock + ' cldSyncFloeUI();', cd);
  cd.__cld.mode('dive');
  cd.__cld.dive({ penguinId: '1-0', angle: 2.0 });
  check('a Knocked-back player can commit with no aims at all', cd.__cld.canCommit(), true);
  check('…and its commit is the Dive and nothing else',
    cd.__cld.buildCommit(), { aims: [], dive: { penguinId: '1-0', angle: 2.0 }, snowball: null });
  cd.__cld.commit();
  check('…sent on the private channel', sentPriv !== null, true);
  const wireCommit = ((sentPriv || {}).payload || {}).commit;
  check('aims: [] and snowball: null were ERASED in flight',
    [wireCommit === undefined, (wireCommit || {}).aims, (wireCommit || {}).snowball],
    [false, undefined, undefined]);
  check('…and the host rebuilt them',
    hd.__cld.commits[1], { aims: [], dive: { penguinId: '1-0', angle: 2.0 }, snowball: null });
  check('the Dive target survived', (hd.__cld.commits[1] || {}).dive, { penguinId: '1-0', angle: 2.0 });
  check('nothing threw', [hd.__errors, cd.__errors].flat(), []);
}

section('9b. Switching Dive → Throw before Lock It In sends only the Throw (Review Focus 1)');
{
  // A client whose only penguin is Knocked back — the section-9 setup, without a relay.
  function makeClientWithKnockedBack() {
    const hk = makeDevice('host8', 'host', 0, SLOTS);
    const d  = makeDevice('client8', 'client', 1, SLOTS);
    hk.mpSendEnvelope = env => { try { d.__cld.handle(wire({ ...env, originId: 'u0', timestamp: Date.now() })); } catch (e) { d.__errors.push(e.message); } };
    hk.mpSendPrivate = () => {}; d.mpSendPrivate = () => {}; d.mpSendEnvelope = () => {};
    hk.__cld.touched = true; hk.__cld.startMatch(NAMES);
    step(hk); step(d);
    vm.runInContext("var p = cldPenguins[1]; p.drowned = true; p.plug = false; p.angle = 0.5; cldPlaceDrowned(p); cldSyncFloeUI();", d);
    return d;
  }
  const d = makeClientWithKnockedBack();
  d.__cld.mode('dive'); d.__cld.dive({ penguinId: '1-0', angle: 2 });
  d.__cld.mode('throw'); vm.runInContext('cldMySnowball = { x: 180, y: 180 };', d);
  check('the commit carries the Snowball and no Dive',
    [d.__cld.buildCommit().dive, !!d.__cld.buildCommit().snowball], [null, true]);
  d.__cld.mode('dive');
  check('…and switching back to Dive drops the Snowball', d.__cld.buildCommit().snowball, null);
  check('nothing threw', d.__errors, []);
}

section('10. Peck Off — the room bounds, and the zero-power HOLD');
{
  const hp = makeDevice('host5', 'host', 0, SLOTS.slice(0, 2));
  const cp = makeDevice('client5', 'client', 1, SLOTS.slice(0, 2));
  const relay = [];
  hp.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    relay.push(w.payload.action);
    try { cp.__cld.handle(w); } catch (e) { cp.__errors.push(e.message); }
  };
  hp.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };
  let priv = null;
  cp.mpSendPrivate = (to, env) => {
    priv = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { hp.__cld.handle(priv); } catch (e) { hp.__errors.push(e.message); }
  };
  cp.mpSendEnvelope = env => { publicFromClients.push({ from: 'u1', action: env.payload.action }); };
  hp.__cld.peckOff = true; hp.__cld.touched = true; hp.__cld.iceBreaker = 0;
  hp.__cld.startMatch(NAMES.slice(0, 2));
  check('each player got two penguins', hp.__cld.penguins.length, 4);
  check('…and the client agrees', cp.__cld.penguins.length, 4);
  step(hp); step(cp);
  // Arm ONE of the two; the other must default to a deliberate zero-power hold.
  cp.__cld.arm('1-0', 1, 0, 0.7);
  const built = cp.__cld.buildCommit();
  check('the un-armed penguin defaults to a zero-power HOLD', built.aims.length, 2);
  ok('…which is a real aim entry, not an omission',
    built.aims.some(a => a.penguinId === '1-1' && a.power === 0), JSON.stringify(built.aims));
  cp.__cld.commit();
  check('the HOLD survived the wire (its penguinId keeps the object non-empty)',
    hp.__cld.commits[1].aims.find(a => a.penguinId === '1-1'),
    { penguinId: '1-1', dx: 0, dy: 0, power: 0 });
  check('nothing threw', [hp.__errors, cp.__errors].flat(), []);
}

section('11. Sylly Mode — a Thaw step crosses the wire whole');
{
  const hs = makeDevice('host6', 'host', 0, SLOTS);
  const cs = makeDevice('client6', 'client', 1, SLOTS);
  const relay = [];
  hs.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    relay.push(w.payload);
    try { cs.__cld.handle(w); } catch (e) { cs.__errors.push(e.message); }
  };
  hs.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };
  cs.mpSendPrivate = (to, env) => {
    const w = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { hs.__cld.handle(w); } catch (e) { hs.__errors.push(e.message); }
  };
  cs.mpSendEnvelope = () => {};
  hs.__cld.sylly = true; hs.__cld.touched = true; hs.__cld.iceBreaker = 0;
  hs.__cld.startMatch(NAMES);
  step(hs); step(cs);
  const r0 = hs.__cld.radius;
  // Every seat commits a real Slide; the host resolves and the Thaw appends.
  hs.__cld.arm('0-0', 1, 0, 0.9);
  vm.runInContext('cldCommits[1] = { aims: [], dive: null, snowball: null };' +
                  'cldCommits[2] = { aims: [], dive: null, snowball: null };', hs);
  hs.__cld.commit();
  const tl = relay[relay.length - 1];
  ok('the aftermath carries a thaw beat',
    (tl.aftermath || []).some(b => b.type === 'thaw'), JSON.stringify(tl.aftermath));
  check('…and the packet’s radius is the post-Thaw one', tl.radius < r0, true);
  playback(hs, hs.__cld); playback(cs, cs.__cld);
  check('host and client agree on the contracted radius', cs.__cld.radius, hs.__cld.radius);
  check('…and on the rim', JSON.stringify(cs.__cld.penguins), JSON.stringify(hs.__cld.penguins));
  check('nothing threw', [hs.__errors, cs.__errors].flat(), []);
}

section('11b. Plugs, knock-backs and the Ice Bath agree on every device (SW v243)');
{
  // Host + 2 clients over the wire, every Standing penguin shoved out at full
  // power every Slide, until a Slide both seats a plug mid-sim AND washes out.
  // Every Slide on the way is checked for agreement, so any knock-back the ring
  // produces crosses the wire under the same assertion.
  const seed = Number(process.env.CLD_SEED || 20260928);
  function makeRoom() {
    const h = makeDevice('host7', 'host', 0, SLOTS);
    const a = makeDevice('client7a', 'client', 1, SLOTS);
    const b = makeDevice('client7b', 'client', 2, SLOTS);
    h.mpSendEnvelope = env => {
      const w = wire({ ...env, originId: 'u0', timestamp: Date.now() });
      [a, b].forEach(d => { try { d.__cld.handle(w); } catch (e) { d.__errors.push(e.message); } });
    };
    h.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };
    [[a, 'u1'], [b, 'u2']].forEach(([d, uid]) => {
      d.mpSendPrivate = (to, env) => {
        const w = wire({ ...env, originId: uid, timestamp: Date.now() });
        try { h.__cld.handle(w); } catch (e) { h.__errors.push(e.message); }
      };
      d.mpSendEnvelope = env => { publicFromClients.push({ from: uid, action: env.payload.action }); };
    });
    return { host: h, c1: a, c2: b, all: [h, a, b] };
  }
  const room = makeRoom();
  const roomErrs = () => room.all.map(d => d.__errors).flat();
  // A seeded Floe-Off, re-broadcast so the clients hold the same one.
  function freshFloeOff(k) {
    vm.runInContext('cldStartFloeOff(' + (seed + k) + '); mpSendEnvelope({ type: "SYNC", payload: cldFloeOffStartPayload() }); cldShowFloe();', room.host);
    room.all.forEach(d => { d.__timers.length = 0; });
    [room.c1, room.c2].forEach(d => d.__cld.showFloe());
  }
  const post = d => JSON.stringify(d.__cld.penguins.map(p => [p.id, p.drowned, p.plug, Math.round(p.x), Math.round(p.y)]));
  function runUntil(pred, maxSlides) {
    let fo = 1, agreed = true, knocks = 0;
    for (let n = 0; n < maxSlides; n++) {
      room.all.forEach(d => {
        const br = d.__cld;
        const mine = br.penguins.filter(p => p.ownerIdx === br.myIdx() && !p.drowned);
        if (mine.length) {
          const p = mine[0], len = Math.hypot(p.x - 180, p.y - 180) || 1;
          br.arm(p.id, (p.x - 180) / len, (p.y - 180) / len, 1);
        }
        br.commit();
      });
      const tl = room.host.__cld.timeline;
      if (!tl) return { hit: false, agreed: false, knocks };
      room.all.forEach(d => playback(d, d.__cld));
      if (post(room.c1) !== post(room.host) || post(room.c2) !== post(room.host)) agreed = false;
      knocks += tl.events.filter(e => e.type === 'knockback').length;
      if (pred(tl)) return { hit: true, agreed, knocks, tl };
      if (tl.floeOffOver) freshFloeOff(++fo);
    }
    return { hit: false, agreed, knocks };
  }
  // A deterministic knock-back first, on an open rim and Black Ice (the long
  // slide): seat 1 goes in and plugs, then seat 0 slides straight at the plug.
  function slideWith(aimFor) {
    room.all.forEach(d => {
      const br = d.__cld;
      const mine = br.penguins.filter(p => p.ownerIdx === br.myIdx() && !p.drowned);
      if (mine.length) { const a = aimFor(br.myIdx(), mine[0]); br.arm(mine[0].id, a[0], a[1], a[2]); }
      br.commit();
    });
    const tl = room.host.__cld.timeline;
    room.all.forEach(d => playback(d, d.__cld));
    return tl || { events: [] };
  }
  const unit = (dx, dy, pw) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l, pw]; };
  const nudgeIn = p => unit(180 - p.x, 180 - p.y, 0.1);
  room.host.__cld.iceBreaker = 0; room.host.__cld.ice = 'blackice'; room.host.__cld.touched = true;
  room.host.__cld.startMatch(NAMES);
  freshFloeOff(0);
  slideWith((i, p) => i === 1 ? unit(p.x - 180, p.y - 180, 1) : nudgeIn(p));
  const plugA = room.host.__cld.penguins.find(p => p.ownerIdx === 1);
  ok('seat 1 went in and plugged mid-Slide', plugA.drowned && plugA.plug);
  const tlK = slideWith((i, p) => i === 0 ? unit(plugA.x - p.x, plugA.y - p.y, 1) : nudgeIn(p));
  ok('seat 0 slid into the plug and knocked it back',
    tlK.events.some(e => e.type === 'knockback' && e.id === plugA.id && e.by === '0-0'),
    JSON.stringify(tlK.events.filter(e => e.type !== 'collision')));
  check('every device agrees the plug is Knocked back, and where',
    [post(room.c1), post(room.c2)], [post(room.host), post(room.host)]);
  ok('…Knocked back on the clients too', room.c1.__cld.penguins.find(p => p.id === plugA.id).plug === false);

  room.host.__cld.iceBreaker = 1; room.host.__cld.ice = 'slush';
  freshFloeOff(1);
  const run = runUntil(tl => tl.events.some(e => e.type === 'seat') && tl.washout, 60);
  ok('a Slide seated a plug mid-sim and washed out', run.hit, 'not reached in 60 Slides');
  check('every device held the same plugs after every Slide on the way', run.agreed, true);
  check('host and both clients hold the same plugs after the washout Slide',
    [post(room.c1), post(room.c2)], [post(room.host), post(room.host)]);
  check('every device replayed the same body order',
    [room.c1.__cld.lastBodyIds, room.c2.__cld.lastBodyIds].map(String),
    [String(room.host.__cld.lastBodyIds), String(room.host.__cld.lastBodyIds)]);
  console.log('        (' + run.knocks + ' knock-back(s) crossed the wire on the way)');
  // Past CLD_WASHOUT_MS: clients park on standby, then the host authors the bath.
  const noBefore = room.host.__cld.floeOffNo;
  drainPending(room.c1); drainPending(room.c2); drainPending(room.host);
  check('every device is in the Ice Bath on the same radius',
    [room.c1.__cld.inBath, room.c2.__cld.inBath, room.c1.__cld.radius === room.host.__cld.radius],
    [true, true, true]);
  check('…and the Floe-Off number did not advance',
    [room.c1.__cld.floeOffNo, room.c2.__cld.floeOffNo, room.host.__cld.floeOffNo], [noBefore, noBefore, noBefore]);
  check('…on an identical rim', [post(room.c1), post(room.c2)], [post(room.host), post(room.host)]);
  check('nothing threw in this room', roomErrs(), []);

  // ── Hunger (SW v245) rides NO packet field: each device reads its own Slide
  // count. Four quiet Slides on a fresh floe; the fourth must put HUNGRY! up on
  // all three devices, and the guide's reach must agree everywhere after it.
  freshFloeOff(6);
  const floatText = d => ((d.document.getElementById('cld-float-layer').children[0]) || {}).textContent || '';
  const beatUp = d => vm.runInContext('Date.now() < cldHungerBeatUntil', d);
  const quiet = [];
  for (let k = 0; k < 4; k++) {
    slideWith((i, p) => nudgeIn(p));
    quiet.push(room.all.map(beatUp));
  }
  check('three quiet Slides raise no beat anywhere', quiet.slice(0, 3), [[false, false, false], [false, false, false], [false, false, false]]);
  check('the fourth puts the beat up on host AND both clients', quiet[3], [true, true, true]);
  check('…with HUNGRY! in every device’s float layer', room.all.map(floatText), ['HUNGRY!', 'HUNGRY!', 'HUNGRY!']);
  const reachOf = d => vm.runInContext('cldFloeModel().reach', d);
  check('…and the aim guide’s reach is the same hungry reach on every device',
    room.all.map(d => Math.round(reachOf(d) * 1000)), room.all.map(() => Math.round(reachOf(room.host) * 1000)));
  ok('…longer than a fed Floe-Off’s', reachOf(room.c1) > vm.runInContext("cldFullSlideDist() * 1.0001", room.c1));
  check('nothing threw on the way', roomErrs(), []);
}

section('12. Floe-Off end, the scoreboard, and the next Resurface');
// Drive the main room to a Floe-Off win by drowning everyone but seat 0.
{
  // Seat 0 is put back on its feet in the middle first: the main room's ring is
  // seeded from Date.now(), so § 6's shove occasionally finds a slip gap and
  // this scenario would otherwise open with nobody Standing (a rare flake).
  vm.runInContext(`
    cldPenguins.forEach(function (p) {
      if (p.ownerIdx === 0) { p.drowned = false; p.plug = false; p.angle = null; p.seq = null;
                              p.x = 180; p.y = 180; return; }
      if (p.drowned) return;
      p.drowned = true; p.plug = true;
      p.angle = cldSeatSpot(Math.atan2(p.y - 180, p.x - 180), p.id).angle; cldPlaceDrowned(p);
    });
  `, host);
  H.showFloe();
  H.arm('0-0', 0, -1, 0.2);
  vm.runInContext('cldCommits[1] = { aims: [], dive: null, snowball: null };' +
                  'cldCommits[2] = { aims: [], dive: null, snowball: null };', host);
  H.commit();
  const tl = H.timeline;
  check('the Floe-Off ended on this Slide', tl.floeOffOver, true);
  check('…with seat 0 the winner', tl.winnerIdx, 0);
  [[host, H], [c1, C1], [c2, C2]].forEach(([dev, br]) => playback(dev, br));
  check('every device landed on the result screen',
    [lastScreen(host), lastScreen(c1), lastScreen(c2)],
    ['screen-cld-result', 'screen-cld-result', 'screen-cld-result']);
  check('every device shows the same winner line',
    [C1.resultText().h, C2.resultText().h], [H.resultText().h, H.resultText().h]);
  check('…naming the winner from the synced roster', H.resultText().h, 'Ali is the last one dry.');
  check('the Fish landed identically everywhere', [C1.fish, C2.fish], [H.fish, H.fish]);
  ok('…and it really was awarded', H.fish[0] === 1, JSON.stringify(H.fish));
  stepAll();
  check('every device moved to the scoreboard',
    [lastScreen(host), lastScreen(c1), lastScreen(c2)],
    ['screen-cld-scoreboard', 'screen-cld-scoreboard', 'screen-cld-scoreboard']);
  check('the scoreboard rows agree', [C1.scoreRows(), C2.scoreRows()], [H.scoreRows(), H.scoreRows()]);
  check('the Resurface CTA is host-only', [H.nextBtn(), C1.nextBtn()], ['flex', 'none']);
  check('…and the clients see the waiting line instead',
    [H.waiting(), C1.waiting()], ['none', 'block']);
  check('nothing threw', errs(), []);

  // The host taps Resurface.
  const beforeFloeOff = H.floeOffNo;
  sent.length = 0;
  vm.runInContext('cldStartFloeOffLocal();', host);
  check('the host broadcast a fresh Floe-Off start', sent, ['CLD_FLOEOFF_START']);
  check('the Floe-Off number advanced everywhere',
    [H.floeOffNo, C1.floeOffNo, C2.floeOffNo],
    [beforeFloeOff + 1, beforeFloeOff + 1, beforeFloeOff + 1]);
  check('the Slide counter reset IN the payload, on the clients too',
    [C1.slideNo, C2.slideNo], [0, 0]);
  check('the Fish carried forward rather than resetting', C1.fish, H.fish);
  check('every rim is fresh and identical',
    [JSON.stringify(C1.penguins), JSON.stringify(C2.penguins)],
    [JSON.stringify(H.penguins), JSON.stringify(H.penguins)]);
  check('nobody is Drowned on the new floe', H.penguins.every(p => !p.drowned), true);
  check('nothing threw', errs(), []);
}

section('12b. Washout — the Ice Bath is host-authored, on every device');
{
  // A Washout reached deterministically through the Thaw rather than through a
  // lucky Slide: seat 2 is already Drowned, seats 0 and 1 sit one unit inside
  // the rim, and the shrink takes both in. It exercises the one path a
  // Slide-only scenario cannot — cldCheckWashout() firing AFTER the Thaw step
  // (spec §12) — and since SW v243 the bath roster that path hands over: the
  // two penguins the melt took, never the one already in the water.
  // Drain the intro auto-advance each device armed at the end of § 12.
  [host, c1, c2].forEach(d => { d.__timers.length = 0; });
  vm.runInContext(`
    cldSyllyMode = true;
    cldBergs = [];
    cldPenguins.forEach(function (p) {
      if (p.ownerIdx !== 2 || p.drowned) return;
      p.drowned = true; p.plug = true;
      p.angle = cldSeatSpot(Math.atan2(p.y - 180, p.x - 180), p.id).angle; cldPlaceDrowned(p);
    });
    cldPenguins.filter(function (p) { return !p.drowned; }).forEach(function (p, k) {
      var a = k === 0 ? -Math.PI / 2 : Math.PI / 2;
      p.x = 180 + (cldFloeRadius - 1) * Math.cos(a); p.y = 180 + (cldFloeRadius - 1) * Math.sin(a);
    });
    cldCommits = [{ aims: [], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }];
  `, host);
  H.showFloe();
  vm.runInContext('cldHostResolveSlide();', host);
  check('the Slide resolved as a Washout', H.timeline.washout, true);
  check('…and awarded no Fish', H.timeline.winnerIdx, -1);
  const fishBefore = JSON.stringify(H.fish);
  [[host, H], [c1, C1], [c2, C2]].forEach(([dev, br]) => playback(dev, br));
  check('every device held the Washout beat',
    [H.phase, C1.phase, C2.phase], ['washout', 'washout', 'washout']);
  check('…and nobody was awarded a Fish for it', JSON.stringify(C1.fish), fishBefore);
  check('the clients agree the floe is empty',
    [C1.penguins.every(p => p.drowned), C2.penguins.every(p => p.drowned)], [true, true]);
  check('nothing threw', errs(), []);

  const armed = [host.__timers.length, c1.__timers.length, c2.__timers.length];
  check('every device armed the same Washout beat', [armed[1], armed[2]], [armed[0], armed[0]]);
  ok('…and it really did arm one', armed[0] > 0, 'armed=' + armed[0]);
  const sentAfterResolve = allSent.length;
  drainPending(c1); drainPending(c2);
  check('the clients broadcast nothing when their timers fired', allSent.length, sentAfterResolve);
  check('…and parked on standby instead of seeding their own bath',
    [C1.introMode, C2.introMode], ['standby', 'standby']);
  check('…with no auto-advance armed, so they cannot march past it',
    [c1.__timers.length, c2.__timers.length], [0, 0]);
  const floeOffBefore = H.floeOffNo;
  drainPending(host);
  check('the host’s timer authored the Ice Bath', allSent.length, sentAfterResolve + 1);
  const bathPkt = allSent[allSent.length - 1];
  check('…as a Floe-Off start flagged bath', [bathPkt.action, bathPkt.payload.bath], ['CLD_FLOEOFF_START', true]);
  check('the Floe-Off number did NOT advance — same Floe-Off, same Fish',
    [H.floeOffNo, C1.floeOffNo, C2.floeOffNo], [floeOffBefore, floeOffBefore, floeOffBefore]);
  check('every device is in the bath, on the floe',
    [H.inBath, C1.inBath, C2.inBath, lastScreen(c1), lastScreen(c2)],
    [true, true, true, 'screen-cld-floe', 'screen-cld-floe']);
  check('…on an identical rim',
    [JSON.stringify(C1.penguins), JSON.stringify(C2.penguins)],
    [JSON.stringify(H.penguins), JSON.stringify(H.penguins)]);
  check('…with exactly the two melted penguins Standing again',
    H.penguins.filter(p => !p.drowned).map(p => p.ownerIdx).sort(), [0, 1]);
  check('…ringless', [H.bergs, C1.bergs], [[], []]);
  check('…with the Fish untouched by the Washout', JSON.stringify(C1.fish), fishBefore);
  check('nothing threw', errs(), []);
  vm.runInContext('cldSyllyMode = false;', host);
}

section('13. A client never authors a Resurface');
{
  const beforeNo = C1.floeOffNo;
  const beforePenguins = JSON.stringify(C1.penguins);
  vm.runInContext('cldStartFloeOffLocal();', c1);
  check('the client’s own Resurface path is a no-op', C1.floeOffNo, beforeNo);
  check('…and it seeded no penguins of its own', JSON.stringify(C1.penguins), beforePenguins);
  const beforeCommits = JSON.stringify(H.commits);
  const beforeSlide   = C1.slideNo;
  const beforeTl      = JSON.stringify(C1.timeline);
  const beforeSent    = allSent.length;
  vm.runInContext('cldHostResolveSlide();', c1);
  check('a client can never resolve a Slide — its Slide counter did not move',
    C1.slideNo, beforeSlide);
  check('…nor did it build a timeline of its own', JSON.stringify(C1.timeline), beforeTl);
  check('…and it broadcast nothing', allSent.length, beforeSent);
  check('…and the host was untouched', JSON.stringify(H.commits), beforeCommits);
  check('a client rejects a commit even applied directly',
    C1.applyCommit(0, { aims: [], dive: null, snowball: null }, C1.slideNo), false);

  // ── The host must ignore a SYNC it authored ──────────────────────────────
  // The engine's originId === syllyDeviceUid dedup guard already stops delivery
  // in a real room, so without this the guard inside cldHandleEnvelope would be
  // indistinguishable from its own absence — the dead-latch shape of BUG-01. The
  // payload is deliberately DOCTORED: replaying the host's real one would rebuild
  // identical state and the check would pass vacuously either way.
  const bogus = { ...H.floeOffPayload(), floeOffNo: 99, radius: 42, flavourIdx: 3 };
  const noBefore = H.floeOffNo, radiusBefore = H.radius, introBefore = H.introIdx;
  H.handle(wire({ type: 'SYNC', payload: bogus, originId: 'u0', timestamp: Date.now() }));
  check('the host ignores a SYNC it authored, even a doctored one',
    [H.floeOffNo, H.radius, H.introIdx], [noBefore, radiusBefore, introBefore]);
  // …and the same packet DOES move a client, so the check above is about the
  // host's guard rather than about the packet being inert.
  const c1NoBefore = C1.floeOffNo;
  C1.handle(wire({ type: 'SYNC', payload: bogus, originId: 'u0', timestamp: Date.now() }));
  check('…while the identical packet moves a client', [C1.floeOffNo, C1.radius], [99, 42]);
  ok('…which it would not have done without the packet', c1NoBefore !== 99, 'was ' + c1NoBefore);
}

section('14. The Mid-Game Quit Contract');
{
  // The engine helper, not a per-game CLD_PLAYER_LEFT packet. The quit-confirm
  // handler is wired in index.html's DOMContentLoaded block, which never fires in
  // a vm; the contract is asserted on the source instead, the same way
  // tools/verify-mp-configs.js § 6 does.
  const src = fs.readFileSync(GAME, 'utf8');
  ok('the quit-confirm handler calls mpNotifyPlayerLeft()',
     /mpNotifyPlayerLeft\s*\(\s*\)/.test(src));
  ok('…and then resetToLobby(), never the game menu',
     /mpNotifyPlayerLeft\(\);\s*\n\s*resetToLobby\(\);/.test(src));
  ok('no per-game CLD_PLAYER_LEFT packet was added', !/CLD_PLAYER_LEFT/.test(src));
  ok('play-again in a lobby session returns to the lobby', /mpReturnToLobby\(\);\s*return;/.test(src));
  ok('the commit CTA carries btn-mp-action', /btn-mp-action/.test(src));
  ok('the commit is sent with mpSendPrivate, never mpSendEnvelope',
     /mpSendPrivate\(cldHostUid\(\)/.test(src));
  // A regex over the source cannot express this: cldBroadcastTally legitimately
  // reads cldCommits to derive a COUNT. What must be true is about the PAYLOADS —
  // no intention field ever left the host, under any key, at any depth.
  const FORBIDDEN = ['commits', 'commit', 'aims', 'aim', 'dive', 'snowball', 'power', 'dx', 'dy'];
  const leaked = [];
  const walk = (v, trail) => {
    if (!v || typeof v !== 'object') return;
    Object.keys(v).forEach(k => {
      if (FORBIDDEN.includes(k)) leaked.push(trail + '.' + k);
      walk(v[k], trail + '.' + k);
    });
  };
  allSent.forEach(e => walk(e.payload, e.action));
  check('no intention field ever left the host, at any depth', leaked, []);
  ok('…across a session that really did broadcast', allSent.length > 3, 'sent=' + allSent.length);
}

section('15. Teardown');
{
  H.resetState(); C1.resetState();
  check('the host cleared its floe', [H.penguins, H.bergs, H.commits], [[], [], []]);
  check('…and its match state', [H.fish, H.stats, H.floeOffNo], [[], [], 0]);
  check('the client did too', [C1.penguins, C1.commits, C1.fish], [[], [], []]);
}

section('16. Nothing leaked to the public channel, all session');
check('no client ever wrote a public envelope', publicFromClients, []);
check('the host only ever sent the three specced SYNC packets',
  [...new Set(allSent.map(e => e.action))].sort(),
  ['CLD_FLOEOFF_START', 'CLD_SLIDE_RESOLVE', 'CLD_SLIDE_TALLY']);
check('…and never an ACTION or a LOBBY packet',
  [...new Set(allSent.map(e => e.type))], ['SYNC']);
check('no device recorded an error', errs(), []);

section('17. Two bot seats beside a human client (SW v247)');
{
  const BNAMES = ['Ali', 'Bec', 'Sylvia 🤖', 'Sam 🤖'];
  const BSLOTS = [{ uid: 'u0', nickname: 'Ali' }, { uid: 'u1', nickname: 'Bec' },
                  { uid: 'bot:0', nickname: 'Sylvia', bot: { difficulty: 'medium' } },
                  { uid: 'bot:1', nickname: 'Sam', bot: { difficulty: 'medium' } }];
  const bh = makeDevice('bothost', 'host', 0, BSLOTS), bc = makeDevice('botclient', 'client', 1, BSLOTS);
  const BH = bh.__cld, BC = bc.__cld;
  const prompts = [], botSent = [];
  bh.mpBotsPrompt = tag => prompts.push(tag);
  bh.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    botSent.push(onWire.payload.action);
    try { BC.handle(onWire); } catch (e) { bc.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  bh.mpSendPrivate = () => { throw new Error('the host wrote the private channel'); };
  bc.mpSendPrivate = (target, env) => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { BH.handle(onWire); } catch (e) { bh.__errors.push(`private: ${e.message}`); }
  };
  bc.mpSendEnvelope = () => {};
  const botMove = i => vm.runInContext(
    `cldBotSubmit(${i}, cldBotDecide(cldBotView(${i}), 'medium', window.Physics.rng(${i})), cldSlideNo)`, bh);

  BC.standby();
  BH.iceBreaker = 0; BH.fishToWin = 3; BH.touched = true; BH.floeSize = 'standard';
  BH.startMatch(BNAMES);
  check('the client learned the 🤖 names over the wire', BC.names, BNAMES);
  [bh, bc].forEach(step);                                  // intro → floe
  check('the host prompted its bots as the Slide opened', prompts, [0]);
  check('…and the client never does', typeof bc.mpBotsPrompt, 'undefined');

  BC.arm(BC.myPenguins()[0], 1, 0, 0.6); BC.commit();
  check('the human client is in; the bots are not yet', BH.commits.map(c => c !== null), [false, true, false, false]);
  check('a bot move lands through cldBotSubmit', botMove(2), true);
  check('…and the same seat cannot move twice', botMove(2), false);
  check('the tally counts bot commits', BC.tally(), BH.tally());
  BH.arm(BH.myPenguins()[0], -1, 0, 0.5); BH.commit();     // the host moves (a hold cannot commit)
  botMove(3);
  check('everyone in → the host resolved', BH.phase, 'resolving');
  check('the client got the same Slide', BC.timeline && BC.timeline.bodyIds, BH.lastBodyIds);
  playback(bh, BH); playback(bc, BC);
  check('host and client agree on the penguins after the Slide', BC.penguins, BH.penguins);
  check('the next Slide prompted the bots again', prompts, [0, 1]);
  check('a move for the resolved Slide is refused',
        vm.runInContext(`cldBotSubmit(2, { aims: [], dive: null, snowball: null }, 0)`, bh), false);
  check('no errors on either device', [...bh.__errors, ...bc.__errors], []);
}

console.log('\n' + '='.repeat(70));
console.log(failures ? 'FAILED — ' + failures + ' check(s)' : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
