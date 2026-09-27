// ═══════════════════════════════════════════════════════════════════════════
// verify-pko-loopback.js — HOST ↔ CLIENT loopback for Pecking Order, across a
// wire that behaves like Firebase Realtime Database.
//
//   node tools/verify-pko-loopback.js        (exits 1 on any failure)
//
// Built for client reconnect (SW v237). Every other PKO harness runs 'single' mode
// with `getElementById: () => null` — the shape that lets one process play every
// seat, and exactly the shape that cannot see a packet or run a line of render
// code. A rejoin is nothing BUT packets and render: a private snapshot, stripped
// of every Hoard but one, rebuilding a device that has nothing in memory.
//
// Pattern: tools/verify-cjar-loopback.js / verify-flw-loopback.js — a REAL WIRE
// (fbWrite/fbRead reproduce RTDB's erasure of null/{}/[]) and a mock DOM whose
// elements are real objects, so every render guard actually executes.
//
// Three seats: 0 = host (this process), 1 = a real client over the wire, 2 = a
// seat driven host-side whose private packets are recorded but never delivered.
// The engine half of reconnect (seats, presence, Away, the rejoin handshake) is
// proven in tools/verify-mp-reconnect.js; this proves PKO's half.
//
// PKO_SRC lets a deliberately-broken copy be driven through the same wire.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const pkoSrc   = fs.readFileSync(process.env.PKO_SRC || path.join(ROOT, 'js/games/pko.js'), 'utf8');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/pko-data.json'), 'utf8');

// ── The wire ───────────────────────────────────────────────────────────────
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
  function mk(tag) {
    const el = {
      tagName: tag, children: [], style: {}, dataset: {}, title: '',
      scrollLeft: 0, scrollWidth: 0, disabled: false,
      className: '', textContent: '',
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      appendChild(c) { this.children.push(c); return c; },
      append(...cs) { cs.forEach(c => this.children.push(c)); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
      scrollIntoView() {},
    };
    el.style.setProperty = function (k, v) { this[k] = v; };
    const classes = () => el.className.split(/\s+/).filter(Boolean);
    el.classList = {
      add(...cs)    { const s = new Set(classes()); cs.forEach(c => s.add(c)); el.className = [...s].join(' '); },
      remove(...cs) { const s = new Set(classes()); cs.forEach(c => s.delete(c)); el.className = [...s].join(' '); },
      contains: c   => classes().includes(c),
      toggle(c, force) {
        const has = classes().includes(c);
        const want = force === undefined ? !has : force;
        if (want) el.classList.add(c); else el.classList.remove(c);
        return want;
      },
    };
    return el;
  }
  return {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) { return byId[id] || (byId[id] = mk('div')); },
  };
}

// ── One device ────────────────────────────────────────────────────────────
const clock = { now: 1700000000000 };
const SOUNDS = ['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playStampede', 'playExit',
  'playWhoosh', 'playSonarPing', 'playClashWin', 'playUnchallenged', 'playSyllyOn', 'playSyllyOff',
  'playSuccess', 'playPoacher', 'playAbyssThud', 'playTick', 'playAlarm'];

function makeDevice(name, mode, myIdx, uid, slots) {
  const timers = [], screens = [], errors = [];
  let seq = 0;
  const sandbox = {
    console,
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, syllyDeviceUid: uid, isSecretMode: false, activeExpansionOverrides: null },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
    // engine.js's Fisher–Yates — a real deal, not an identity stub.
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    assetFace: () => null, assetBack: () => null,
    artMakeZoomable: (el, src) => { if (el && src) el.className += ' art-zoomable'; return el; },
    openArtViewer() {}, closeArtViewer() {},
    bindCardHold() {}, refHighlightRow() {},
    mpLockSync() {}, mpUnlockSync() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __clock: clock, __dissolved: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors,
  };
  SOUNDS.forEach(s => { sandbox[s] = () => {}; });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('Date.now = () => __clock.now;', sandbox);

  const BRIDGE = `
globalThis.__pko = {
  get chain()        { return pkoChain; },
  get hoards()       { return pkoHoards; },
  get myHoard()      { return pkoMyHoard; },
  get counts()       { return pkoHoardCounts; },
  get ready()        { return pkoHoardReady; },
  get marks()        { return pkoMarks; },
  get owner()        { return pkoMarkOwnerIdx; },
  get turn()         { return pkoTurnIdx; },
  get leader()       { return pkoLeaderIdx; },
  get scores()       { return pkoScores; },
  get clashNum()     { return pkoClashNum; },
  get history()      { return pkoClashHistory; },
  get trail()        { return pkoTrail; },
  get hole()         { return pkoWateringHole; },
  get encounter()    { return pkoEncounterNum; },
  get retreated()    { return pkoRetreatedSince; },
  get event()        { return pkoEvent; },
  get stage()        { return pkoStage; },
  get pending()      { return pkoCarrionPending; },
  get carrionArmed() { return pkoCarrionTimer !== null; },
  get names()        { return pkoPlayerNames; },
  seat(o) {
    pkoPlayerCount = o.players; pkoPlayerNames = o.names;
    pkoStartSmall = 'off'; pkoSyllyMode = false; pkoScavenge = false;
  },
  start()            { return pkoStartSession(); },
  // Exactly what MP_GAME_CONFIGS.pko.onPassThePhone runs on a client.
  passThePhone()     { pkoPlayerCount = mpPlayerSlots.length; pkoPlayerNames = mpPlayerSlots.map(p => p.nickname);
                       pkoLoadChain(); pkoShowClientStandby(); },
  applyReady(i)      { pkoApplyReady(i); },
  submitReady()      { pkoSubmitReady(); },
  applyStake(i, cs)  { pkoApplyStake(i, { cards: cs }); },
  applyRetreat(i)    { pkoApplyRetreat(i); },
  setLeader(i)       { pkoLeaderIdx = i; },
  setEvent(e)        { pkoEvent = e; },
  openCarrion(i, sp) { pkoOpenCarrion(i, sp); },
  resolveClash(ws)   { pkoResolveClash(ws); },
  handle(env)        { pkoHandleEnvelope(env); },
  rcPause()          { pkoReconnectPause(); },
  rcResume()         { pkoReconnectResume(); },
  fullState(i)       { pkoSendFullState(i); },
  overlayUp(id)      { return document.getElementById(id).style.display === 'flex'; },
  el(id)             { return document.getElementById(id); },
};`;
  vm.runInContext(pkoSrc + BRIDGE, sandbox, { filename: `pko.js (${name})` });
  return sandbox;
}

// ── Assertions ────────────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
function safe(label, fn) {
  try { fn(); } catch (e) { failures++; console.log(`  FAIL  ${label}\n          threw: ${e.message}`); }
}
const flush = () => new Promise(r => setImmediate(r));

(async () => {
  console.log('Pecking Order — host↔client loopback over a Firebase-shaped wire\n' + '='.repeat(66));

  section('The wire itself — Firebase erasure, reproduced');
  check('empty array is deleted',    wire({ a: [], keep: 1 }),           { keep: 1 });
  check('null scalar is deleted',    wire({ a: null, keep: 1 }),         { keep: 1 });
  check('-1 survives',               wire({ a: -1 }),                    { a: -1 });
  check('all-false array survives',  wire({ a: [false, false] }),        { a: [false, false] });
  check('half-dense → object',       wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });

  // ── Stand up the room ─────────────────────────────────────────────────────
  const NAMES = ['Ali', 'Bec', 'Cam'];
  const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));
  const host = makeDevice('host', 'host', 0, 'u0', SLOTS);
  const H = host.__pko;
  let dev = null, C = null;                         // the CURRENT seat-1 device
  const sent = [], priv = [];
  host.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u0', timestamp: clock.now });
    sent.push(w.payload.action);
    try { C.handle(w); } catch (e) { dev.__errors.push(`${w.payload.action}: ${e.message}`); }
  };
  host.mpSendPrivate = (uid, env) => {
    const w = wire({ ...env, originId: 'u0', timestamp: clock.now });
    priv.push({ uid, payload: w.payload });
    if (uid !== 'u1') return;                       // seat 2's private packets are recorded, never delivered
    try { C.handle(w); } catch (e) { dev.__errors.push(`private ${w.payload.action}: ${e.message}`); }
  };
  // A seat-1 device with NOTHING in memory, through the real client onPassThePhone.
  const seat1 = name => {
    const d = makeDevice(name, 'client', 1, 'u1', SLOTS);
    d.mpSendEnvelope = env => {
      const w = wire({ ...env, originId: 'u1', timestamp: clock.now });
      try { H.handle(w); } catch (e) { host.__errors.push(`${w.payload.action}: ${e.message}`); }
    };
    d.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };
    dev = d; C = d.__pko;
    C.passThePhone();
    return d;
  };
  const lastScreen = d => d.__screens[d.__screens.length - 1];
  const errors = () => [...host.__errors, ...dev.__errors];
  // Fire every timer a device holds (interstitials, the Carrion backstop).
  const drain = d => { let g = 0; while (d.__timers.length && g++ < 50) { d.__timers.sort((a, b) => a.at - b.at);
    const t = d.__timers.shift(); try { t.fn(); } catch (e) { d.__errors.push(`timer: ${e.message}`); } } };
  const publicOf = b => ({ counts: b.counts, marks: b.marks, owner: b.owner, turn: b.turn, leader: b.leader,
    scores: b.scores, clashNum: b.clashNum, encounter: b.encounter, retreated: b.retreated,
    trail: b.trail.length, hole: b.hole.length });

  section('A normal deal — the client follows the host, holding only its own Hoard');
  H.seat({ players: 3, names: NAMES });
  const cli = seat1('cli');
  await flush();
  check('the client parks on the deal screen', lastScreen(cli), 'screen-pko-hoard');
  await H.start();
  check('PKO_CLASH_BEGIN went out', sent.includes('PKO_CLASH_BEGIN'), true);
  check('the client holds exactly its own Hoard', C.myHoard, H.hoards[1]);
  check('seat 2\'s Hoard went only to seat 2', priv.filter(x => x.payload.action === 'PKO_HAND').map(x => x.uid), ['u1', 'u2']);
  check('no exception on either device', errors(), []);

  section('Reconnect — seat 1 reloads on the deal screen, before it is ready');
  H.rcPause();
  const cli2 = seat1('cli2');
  check('the rebuilt device starts with no chain data, like a reloaded phone', C.chain, null);
  H.rcResume();
  priv.length = 0;
  H.fullState(1);
  await flush();                                    // the snapshot waited for the chain
  const snap = (priv.find(x => x.payload.action === 'PKO_FULL_STATE') || {}).payload || {};
  check('one PKO_FULL_STATE, to seat 1 only', priv.map(x => x.uid), ['u1']);
  check('  …carrying no other Hoard and no Reserve',
        ['hoards', 'reserve', 'hands'].filter(k => k in snap), []);
  check('  …and seat 1\'s hand is the only card list in it', snap.hand, H.hoards[1]);
  check('the rebuilt device loaded the chain itself', C.chain !== null, true);
  check('  …and is on the deal screen holding its own Hoard', [lastScreen(cli2), C.myHoard], ['screen-pko-hoard', H.hoards[1]]);
  check('  …with its Ready button up', C.el('btn-pko-hoard-ready').style.display, 'flex');
  // A render before the chain lands draws bare ids — and nothing re-renders when it does.
  const faces = [];
  const walk = el => { if (/pko-card-emoji/.test(el.className || '')) faces.push(el.textContent); (el.children || []).forEach(walk); };
  walk(C.el('pko-hoard-fan'));
  check('  …its cards drawn WITH the chain (an emoji on every face, not a bare id)',
        faces.length === H.hoards[1].length && faces.every(Boolean), true);
  H.setLeader(1);                                   // seat 1 opens the first Encounter
  H.applyReady(0); H.applyReady(2);
  C.submitReady();
  check('its Ready reached the host and the Encounter opened', [H.ready, H.stage], [[true, true, true], 'table']);
  check('no exception on either device', errors(), []);

  section('Reconnect — seat 1 reloads at the table on its own turn, and plays');
  check('it is seat 1\'s turn to Stake', [H.turn, H.marks.length], [1, 0]);
  H.rcPause();
  drain(host);                                      // nothing the host holds acts for seat 1
  check('the table still waits on seat 1', [H.turn, H.marks.length], [1, 0]);
  const cli3 = seat1('cli3');
  H.rcResume();
  H.fullState(1);
  await flush();
  check('the rebuilt device is at the table', lastScreen(cli3), 'screen-pko-table');
  check('  …holding exactly its own Hoard', C.myHoard, H.hoards[1]);
  check('host and rebuilt client agree on everything public', publicOf(C), publicOf(H));
  const stakeCard = C.myHoard.find(id => id !== 'human' && id !== 'mimic');
  safe('the rebuilt device Stakes a card from its own hand', () =>
    dev.mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_STAKE', cards: [stakeCard] } }));
  check('the host accepted it', [H.marks, H.owner], [[stakeCard], 1]);
  check('  …and the client followed the board', C.marks, H.marks);
  check('  …with its hand repaired privately', C.myHoard, H.hoards[1]);
  check('no exception on either device', errors(), []);

  section('Reconnect — pause freezes the Carrion window; a rejoin gets it back');
  // Force of Nature's Carrion, staged directly: the host holds the window open for the
  // Challenger (seat 1) over two of the beaten Marks.
  H.setEvent('carrion');
  const spoils = H.hoards[0].slice(0, 2);
  H.openCarrion(1, spoils);
  check('the window is open, on the host\'s backstop timer', [!!H.pending, H.carrionArmed], [true, true]);
  H.rcPause();
  check('pause stopped the backstop', H.carrionArmed, false);
  clock.now += 5 * 60000;
  drain(host);
  check('nothing picked for the absent Challenger', !!H.pending, true);
  sent.length = 0;
  H.rcResume();
  check('resume reopened the window for everyone', sent, ['PKO_CARRION_OPEN']);
  check('  …with a fresh backstop', H.carrionArmed, true);
  // Built AFTER resume on purpose: that public PKO_CARRION_OPEN can beat the engine's
  // private ACCEPT to the rejoiner and be dropped there. The snapshot must re-arm it alone.
  const cli4 = seat1('cli4');
  H.fullState(1);
  await flush();
  check('the rebuilt Challenger has the Carrion window open', C.overlayUp('pko-carrion-overlay'), true);
  check('  …with its Take button', C.el('btn-pko-carrion-take').style.display, 'flex');
  safe('the rebuilt Challenger takes the lot', () => {
    vm.runInContext('pkoCarrionSel = [0, 1]; pkoSubmitCarrion();', cli4);
  });
  check('the host resolved it', H.pending, null);
  check('  …and the kept cards are in seat 1\'s Hoard, on both devices',
        [spoils.every(id => H.hoards[1].includes(id)), C.myHoard], [true, H.hoards[1]]);
  check('no exception on either device', errors(), []);

  section('Reconnect — a Carrion window that OPENS mid-pause arms no clock');
  H.rcPause();
  H.openCarrion(1, H.hoards[0].slice(0, 1));          // a Challenge already in flight when the seat dropped
  check('the window is open but untimed', [!!H.pending, H.carrionArmed], [true, false]);
  H.rcResume();
  check('resume timed it', H.carrionArmed, true);
  vm.runInContext('pkoResolveCarrion(1, []);', host);   // leave it all — back to a plain board
  check('no exception on either device', errors(), []);

  section('Reconnect — a rejoin on the Clash result lands on the Clash result');
  H.setEvent(null);
  H.resolveClash([0]);
  check('the host is between Clashes', H.stage, 'clashResult');
  const cli5 = seat1('cli5');
  H.fullState(1);
  await flush();
  check('the rebuilt device is on the Clash result', lastScreen(cli5), 'screen-pko-clash-result');
  check('  …waiting for the host, not holding its button', C.el('btn-pko-next-clash').style.display, 'none');
  check('  …with the score the host has', [C.scores, C.history], [H.scores, H.history]);
  check('no exception on either device', errors(), []);

  console.log('\n' + '='.repeat(66));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
