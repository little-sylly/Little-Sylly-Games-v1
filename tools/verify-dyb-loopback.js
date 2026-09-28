// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-loopback.js — HOST ↔ 2 CLIENTS for The Bluff, over a wire that
// behaves like Firebase Realtime Database, with a mock DOM of real objects so
// every render path (table, shake, The Overlook) actually executes.
//
//   node tools/verify-dyb-loopback.js           (exits 1 on any failure)
//   DYB_SEED=7 node tools/verify-dyb-loopback.js
//   DYB_SRC=path/to/broken-dyb.js node tools/verify-dyb-loopback.js
//
// Pattern: tools/verify-pko-loopback.js. What it proves: no applier throws on
// any device across a whole match (Tempest on, an elimination, a Slick picked
// after the roll); every device agrees on claim, count and loser; no ACTIVE
// client holds another hand in state before DYB_SHOWDOWN (the wire itself is
// not private — DYB_SPIRIT_SHAKE broadcasts rolls for The Depths).
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const diceSrc = fs.readFileSync(path.join(ROOT, 'js/games/dyb-dice.js'), 'utf8');
const dybSrc  = fs.readFileSync(process.env.DYB_SRC || path.join(ROOT, 'js/games/dyb.js'), 'utf8');
const SEED = parseInt(process.env.DYB_SEED || '1', 10);

// ── The wire ───────────────────────────────────────────────────────────────
function fbWrite(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  const keys = Array.isArray(v) ? v.map((_, i) => String(i)) : Object.keys(v);
  keys.forEach(k => { const w = fbWrite(Array.isArray(v) ? v[Number(k)] : v[k]); if (w !== undefined) out[k] = w; });
  return Object.keys(out).length ? out : undefined;
}
function fbRead(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  const keys = Object.keys(v);
  const numeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
  if (numeric) {
    const max = Math.max(...keys.map(Number));
    if (keys.length * 2 > max + 1) {
      const arr = [];
      for (let i = 0; i <= max; i++) arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}
const wire = env => { const s = fbWrite(env); return s === undefined ? undefined : fbRead(s); };

// ── Mock DOM with real elements ────────────────────────────────────────────
function makeDocument() {
  const byId = {};
  function mk(tag) {
    const el = {
      tagName: tag, children: [], style: {}, dataset: {}, className: '', textContent: '', disabled: false,
      _html: '', get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); this.children = []; },
      appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [], firstElementChild: null,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }), contains: () => true,
    };
    const classes = () => el.className.split(/\s+/).filter(Boolean);
    el.classList = {
      add(...cs) { const s = new Set(classes()); cs.forEach(c => s.add(c)); el.className = [...s].join(' '); },
      remove(...cs) { const s = new Set(classes()); cs.forEach(c => s.delete(c)); el.className = [...s].join(' '); },
      contains: c => classes().includes(c),
    };
    return el;
  }
  return { body: mk('body'), addEventListener() {}, createElement: mk, querySelectorAll: () => [], querySelector: () => null,
           getElementById(id) { return byId[id] || (byId[id] = mk('div')); } };
}

// ── One device ─────────────────────────────────────────────────────────────
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function makeDevice(name, mode, myIdx, uid, slots, seed) {
  const timers = [], screens = [], errors = [];
  let seq = 0;
  const sandbox = {
    console: { log() {}, warn: (...a) => errors.push('warn: ' + a.join(' ')), error: (...a) => errors.push('error: ' + a.join(' ')) },
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, syllyDeviceUid: uid },
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(sandbox.__rand() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, ms: ms || 0, id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    bindCardHold() {}, refHighlightRow() {}, assetDiceSet: () => null,
    mpLockSync() {}, mpUnlockSync() {}, mpReturnToLobby() {}, mpShowModeScreen() {}, openSoundOverlay() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __name: name, __screens: screens, __timers: timers, __errors: errors, __rand: seeded(seed),
  };
  ['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick', 'playSuccess',
   'playSyllyOn', 'playSyllyOff', 'playSliderTick'].forEach(s => { sandbox[s] = () => {}; });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('Math.random = () => __rand();', sandbox);
  const BRIDGE = `
globalThis.__dyb = {
  get claim()    { return { qty: dybCurrentQty, face: dybCurrentFace }; },
  get bidder()   { return dybCurrentBidderIdx; },
  get active()   { return dybActivePlayers.slice(); },
  get dice()     { return dybDiceInHand.slice(); },
  get allRolls() { return dybAllRolls; },
  get allSlicks(){ return dybAllSlickFaces; },
  get myRoll()   { return dybMyRoll.slice(); },
  get myTypes()  { return dybSpecialTypes.slice(); },
  seat(o) { dybPlayerCount = o.names.length; dybPlayerNames = o.names.slice(); dybStartingHand = o.start;
            dybWildcardsStyle = o.wild; dybSyllyMode = o.sylly; dybSyllyIntensity = 10; dybFootholdsMode = false; },
  showSeating() { dybShowSeating(); },
  startGame()   { dybStartGame(); },
  roll()        { dybDoRoll(); },
  submit()      { dybSubmitRoll(); },
  pickSlick(i, f) { dybAssignSlickFace(i, f); },
  act(a, d)     { dybTableAct(a, d || {}); },
  next()        { dybAdvanceFromShowdown(); },
  handle(env)   { dybHandleEnvelope(env); },
  el(id)        { return document.getElementById(id); },
};`;
  vm.runInContext(diceSrc, sandbox, { filename: `dyb-dice.js (${name})` });
  vm.runInContext(dybSrc + BRIDGE, sandbox, { filename: `dyb.js (${name})` });
  return sandbox;
}

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
function drain(d) {
  let g = 0;
  while (d.__timers.length && g++ < 5000) {
    d.__timers.sort((a, b) => a.ms - b.ms || a.id - b.id);
    const t = d.__timers.shift();
    try { t.fn(); } catch (e) { d.__errors.push(`timer: ${e.message}`); }
  }
}

console.log(`The Bluff — host ↔ 2 clients loopback (seed ${SEED})\n` + '='.repeat(56));

section('The wire itself');
check('an empty array is deleted', wire({ a: [], keep: 1 }), { keep: 1 });
// Firebase's own rule: a numeric-keyed node comes back as an array only when more than
// half its slots are present — holes as null; sparser than that, an object.
check('a mostly-full holey array stays an array, holes as null', wire({ a: [[1], undefined, [3]] }), { a: [[1], null, [3]] });
check('a sparse holey array becomes an object', wire({ a: [[1], undefined, undefined, [4]] }), { a: { 0: [1], 3: [4] } });

const NAMES = ['Ali <i>', 'Bec', 'Cam'];
const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));
const host = makeDevice('host', 'host', 0, 'u0', SLOTS, SEED * 101);
const c1   = makeDevice('c1', 'client', 1, 'u1', SLOTS, SEED * 101 + 1);
const c2   = makeDevice('c2', 'client', 2, 'u2', SLOTS, SEED * 101 + 2);
const devs = [host, c1, c2];
const D = i => devs[i].__dyb;
const sent = [];
host.mpSendEnvelope = env => {
  const w = wire({ ...env, originId: 'u0', timestamp: 0 });
  sent.push(w.payload);
  [c1, c2].forEach(c => { try { c.__dyb.handle(w); } catch (e) { c.__errors.push(`${w.payload.action}: ${e.message}`); } });
};
[c1, c2].forEach((c, k) => {
  c.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u' + (k + 1), timestamp: 0 });
    try { host.__dyb.handle(w); } catch (e) { host.__errors.push(`${w.payload.action}: ${e.message}`); }
  };
});
const errors = () => devs.flatMap(d => d.__errors.map(e => `${d.__name}: ${e}`));
const last = d => d.__screens[d.__screens.length - 1];
// A device's OWN action (a tap on its screen) can throw too — record it against that
// device and carry on, so one bad path cannot hide every later check.
const on = (i, fn) => { try { fn(D(i)); } catch (e) { devs[i].__errors.push('own action: ' + e.message); } };

section('A full match — Tempest on, two dice each, until one climber is left');
D(0).seat({ names: NAMES, start: 2, wild: 'classic', sylly: true });
on(0, d => d.showSeating());
on(0, d => d.startGame());
let over = false, shakes = 0, slickChecked = false;
while (!over && shakes++ < 12) {
  const active = D(0).active;
  check(`shake ${shakes}: every active device is on the shake screen`, active.map(i => last(devs[i])), active.map(() => 'screen-dyb-shake'));
  active.forEach(i => { on(i, d => d.roll()); on(i, d => d.submit()); });
  check(`shake ${shakes}: active devices reached the table`, active.map(i => last(devs[i])), active.map(() => 'screen-dyb-table'));
  // Review Focus 4 — a Slick picked AFTER the roll was submitted reaches the host
  active.filter(i => i !== 0).forEach(i => {
    const j = D(i).myTypes.indexOf('slick');
    if (j >= 0 && !slickChecked) {
      on(i, d => d.pickSlick(j, 6));
      check('a Slick picked after submitting reaches the host', D(0).allSlicks[i][j], 6);
      slickChecked = true;
    }
  });
  check(`shake ${shakes}: no active client holds another hand before The Overlook`,
        active.filter(i => i !== 0).map(i => (Array.isArray(D(i).allRolls) ? D(i).allRolls : Object.keys(D(i).allRolls)).length), active.filter(i => i !== 0).map(() => 0));
  on(D(0).bidder, d => d.act('climb'));
  check(`shake ${shakes}: every device agrees on the claim`, active.map(i => D(i).claim), active.map(() => D(0).claim));
  on(D(0).bidder, d => d.act('call'));
  const sd = sent.filter(p => p.action === 'DYB_SHOWDOWN').pop();
  devs.forEach(drain);
  check(`shake ${shakes}: every device counted ${sd.real}`, devs.map(d => d.__dyb.el('dyb-showdown-real').textContent), devs.map(() => `Real count: ${sd.real}`));
  check(`shake ${shakes}: every device reached the same verdict`, devs.map(d => d.__dyb.el('dyb-showdown-verdict').textContent),
        devs.map(() => (sd.real >= sd.claimed ? 'CLAIM HOLDS' : 'BLUFF CALLED')));
  const revealHtml = host.__dyb.el('dyb-showdown-hands').innerHTML;
  check(`shake ${shakes}: names reach the reveal escaped`,
        [revealHtml.includes('Ali <i>'), active.includes(0) ? revealHtml.includes('Ali &lt;i&gt;') : true], [false, true]);
  over = sent.some(p => p.action === 'DYB_GAMEOVER');
  if (!over) {
    on(0, d => d.next());
    const out = [0, 1, 2].filter(i => !D(0).active.includes(i));
    out.filter(i => i !== 0).forEach(i => check(`an eliminated client (seat ${i}) watches from The Depths`, last(devs[i]), 'screen-dyb-spirit-board'));
  }
}
check('the match ended on The Summit', over, true);
check('every device shows The Summit', devs.map(last), devs.map(() => 'screen-dyb-gameover'));
check('no exception or warning on any device', errors(), []);

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
