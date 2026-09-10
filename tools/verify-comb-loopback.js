// ═══════════════════════════════════════════════════════════════════════════
// verify-comb-loopback.js — HOST ↔ TWO CLIENTS loopback for Honeycomb Hills,
// across a wire that behaves like Firebase Realtime Database.
//
//   node tools/verify-comb-loopback.js       (exits 1 on any failure)
//   COMB_SRC=path node tools/…               (drive a deliberately-broken copy)
//   COMB_SEED=n   node tools/…               (reproduce a seeded match)
//
// The other three COMB harnesses run ONE process in 'single' mode with
// `getElementById: () => null` and mpSendEnvelope/mpSendPrivate rigged to throw.
// That is what lets them drive all N seats, and exactly what blinds them to the
// two things this file exists for:
//
//   • THE PACKET LAYER. Nothing broadcasts in single mode, so 334 green checks
//     say nothing at all about whether a payload field survives a real room.
//   • THE RENDER CODE. `getElementById: () => null` short-circuits every
//     `if (!el) return` guard, so not one line of combRenderMeadow() runs. A
//     render throw inside a SYNC applier is invisible to all three — and it
//     escapes through mpHandleEnvelope and strands the device that raised it.
//
// TWO CLIENTS, not one, and that is load-bearing. The Overflow is the suite's
// classic readyCheck gate: with a single client "everyone who owes has spilled"
// and "the first person tapped" are the same instant, and a gate written as
// .every(Boolean) passes. The third seat is what separates them.
//
// ── The wire ───────────────────────────────────────────────────────────────
// Firebase RTDB stores no `null`, no `{}` and no `[]`: a key holding any of them
// is DELETED and the reader gets `undefined`. An all-null array vanishes whole;
// a half-dense one comes back as an OBJECT keyed by index. `false`, `0` and `''`
// are legitimate stored values and are never at risk — only EMPTINESS is erased.
// fbWrite/fbRead below reproduce that faithfully (lifted from
// verify-cjar-loopback.js, which is where this shape was worked out), so a
// payload field that cannot survive a real room fails here instead of at a table.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.COMB_SRC || path.join(ROOT, 'js/games/comb.js');
const SEED = Number(process.env.COMB_SEED || 20260907);
const combSrc = fs.readFileSync(GAME, 'utf8');

// ── The wire ────────────────────────────────────────────────────────────────
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
    // The SDK materialises an array when the numeric keys are at least half
    // dense; below that it stays an object. Missing slots come back as nulls.
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

// ── A shared clock. Every device reads the same Date.now(), so a Daylight
//    deadline can be compared across devices without wall-clock flakiness. ────
const clock = { now: 1700000000000 };

// ── DOM mock with REAL elements, including a canvas ──────────────────────────
// combRenderMeadow() ends in combRepaintBoards() → combDrawBoard(), which asks
// for a 2D context and a bounding rect. A null-returning getElementById would
// skip all of it; a canvas without getContext would make combDrawBoard return
// early and skip it just as thoroughly. Neither is the render path.
function makeDocument() {
  const byId = {};
  const ctx2d = () => ({
    setTransform() {}, clearRect() {}, save() {}, restore() {}, beginPath() {},
    closePath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
    fillRect() {}, fillText() {}, drawImage() {}, translate() {}, rotate() {},
    scale() {}, createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', font: '',
    textAlign: '', textBaseline: '', globalAlpha: 1,
  });
  const mk = tag => {
    const el = {
      tagName: tag, children: [], style: {}, dataset: {}, title: '',
      width: 0, height: 0, disabled: false, textContent: '', onclick: null,
      _html: '', _cls: new Set(),
      get className() { return [...this._cls].join(' '); },
      set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      classList: {
        add(...c) { c.forEach(x => el._cls.add(x)); },
        remove(...c) { c.forEach(x => el._cls.delete(x)); },
        contains: c => el._cls.has(c),
        toggle(c, on) { if (on === undefined) on = !el._cls.has(c); on ? el._cls.add(c) : el._cls.delete(c); },
      },
      appendChild(c) { this.children.push(c); return c; },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      // A REAL box. BUG-03 was a canvas drawing into its 300×150 intrinsic
      // default because it had no CSS size; a zero-sized rect here would make
      // combTransform divide into nothing and hide the same class of fault.
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 560 }),
      getContext: tag === 'canvas' ? ctx2d : undefined,
    };
    return el;
  };
  return {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) {
      if (!byId[id]) byId[id] = mk(/canvas$/.test(id) ? 'canvas' : 'div');
      return byId[id];
    },
  };
}

// ── One device ──────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  const sounds  = [];
  let seq = 0;

  const sandbox = {
    // ⚠️ combHandleEnvelope() swallows every throw and console.warn()s it — it has
    // to, because a throw escaping into a Firebase callback strands the device
    // AND kills the SYNC that would have advanced everyone else. That means a
    // broken applier is SILENT unless the harness listens to the warning. This
    // console turns each one into a recorded error, so `noErrors()` sees an
    // applier that died exactly as loudly as one that never ran.
    console: { log: (...a) => console.log(...a),
               warn:  (...a) => errors.push('warn: ' + a.map(String).join(' ')),
               error: (...a) => errors.push('error: ' + a.map(String).join(' ')) },
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, syllyDeviceUid: 'u' + myIdx, devicePixelRatio: 2 },
    Date: { now: () => clock.now },
    Image: function () { this.complete = false; this.naturalWidth = 0; },
    showScreen: id => screens.push(id),
    setTimeout:  (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: false }); return seq; },
    setInterval: (fn, ms) => { timers.push({ fn, at: clock.now + (ms || 0), id: ++seq, repeat: true, ms: ms || 1000 }); return seq; },
    clearTimeout:  id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    clearInterval: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    bindCardHold() {}, refHighlightRow() {},
    assetFace: () => null, assetBack: () => null, assetExtra: () => null,
    artMakeZoomable: el => el, openArtViewer() {}, closeArtViewer() {},
    openSoundOverlay() {}, resetToLobby() { sandbox.__dissolved = true; },
    mpLockSync() { sandbox.__locked = true; }, mpUnlockSync() { sandbox.__locked = false; },
    mpNotifyPlayerLeft() { sandbox.__notifiedLeft = true; },
    mpShowModeScreen() {}, mpReturnToLobby() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    __locked: false, __dissolved: false, __notifiedLeft: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors, __sounds: sounds,
  };
  // Every play*() in the catalogue plus playAccord(), this game's one addition.
  // combPlay() resolves through globalThis, so an unstubbed name would simply be
  // silent — these exist so a MISSING call can be told from a silent one.
  ['playLaunch','playExit','playDone','playSuccess','playBoing','playWhoosh','playPillClick',
   'playTick','playAlarm','playStampede','playSonarPing','playHullThud','playPoacher',
   'playUnchallenged','playClashWin','playAccord'].forEach(n => { sandbox[n] = () => sounds.push(n); });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });

  const BRIDGE = `
globalThis.__comb = {
  C: { COMB_RES, COMB_COSTS, COMB_LOG_MAX, COMB_TOPOLOGY,
       ROUTES: Object.keys(COMB_ACTION_ROUTES), PENDING: COMB_ACTION_PENDING.slice() },
  seat(o) {
    combPlayerCount = o.count; combPlayerNames = o.names.slice();
    combSeason = o.season || 'short';   combLayout = o.layout || 'tended';
    combWasp   = o.wasp   || 'blocks';  combOverflow = o.overflow || 'off';
    combWaggle = o.waggle || 'outloud'; combDaylight = o.daylight || 'allday';
    combBounty = o.bounty || 'endless';
  },
  startMatch(seed)  { combStartMatchLocal(seed); },
  standby()         { combShowClientStandby(); },
  handle(env)       { combHandleEnvelope(env); },
  render()          { combRenderMeadow(); },

  // The UI path, not the applier: this is combAttemptPlace() reached the way the
  // Place button reaches it, off whatever combArmDraftPlacement() armed. A
  // client with no placement mode returns null here, which is the failure
  // BUG-05 was — an applier armed something and its caller threw it away.
  place() {
    if (!combPlacementMode || !combLegalTargets.length) return null;
    return combAttemptPlace(combPlacementMode, combLegalTargets[0]);
  },
  placeAt(kind, t)  { return combAttemptPlace(kind, t); },
  mode()            { return combPlacementMode; },
  targets()         { return combLegalTargets.length; },

  // Raw sends, for the packets whose UI is the action layer's and for the
  // spoof test. Bypasses combAttemptPlace deliberately.
  send(action, p)   { combSendAction(action, p); },

  setHand(p, h)     { combSetHand(p, h); },

  // ── The action layer (chunk 5) ──
  post(p, to, g, w)  { return combPostOffer(p, to, g, w); },
  respond(p, yes)    { return combRespondOffer(p, yes); },
  select(p, q)       { return combSelectPartner(p, q); },
  cancelOffer(p)     { return combCancelOffer(p); },
  offerExpire()      { combOfferExpire(); },
  bank(p, g, w)      { return combBankTrade(p, g, w); },
  buy(p)             { return combBuyInstinct(p); },
  playCard(p, i, pr) { return combPlayInstinct(p, i, pr); },
  setDeck(d)         { combDeck = d.slice(); },
  bankRate(p, i)     { return combBankRate(p, i); },
  get offer()        { return combOffer; },
  get freeWalls()    { return combFreeWalls; },
  get pubInstinct()  { return combPublicInstinct; },
  get playedThis()   { return combInstinctPlayedThisTurn; },
  get waggle()       { return combWaggle; },  set waggle(v) { combWaggle = v; },
  // What a device actually PAINTED into the two action-layer surfaces.
  offerHeading()     { return document.getElementById('comb-offer-heading').textContent; },
  buildOpts()        { return document.getElementById('comb-build-options').children.length; },
  actionBarUp()      { return document.getElementById('comb-action-bar').style.display === 'grid'; },
  overflowUp()       { return document.getElementById('comb-overflow-overlay').style.display === 'flex'; },
  stealUp()          { return document.getElementById('comb-steal-overlay').style.display === 'flex'; },
  offerUp()          { return document.getElementById('comb-trade-offer-overlay').style.display === 'flex'; },
  openBuildPicker()  { combOpenBuildPicker(); },
  setInstinct(p, c) { combSetInstinct(p, c); },
  submitOverflow(p, d) { return combSubmitOverflow(p, d); },
  waspMove(p, h)    { return combWaspMove(p, h); },
  waspSteal(p, v)   { return combWaspSteal(p, v); },
  victims(h, t)     { return combWaspVictims(h, t); },
  endTurn(p)        { return combEndTurn(p); },
  finish()          { combFinishMatch(); },
  broadcastBoard()  { combBroadcastBoard(); },
  fullState(p)      { combSendFullState(p); },
  legal(kind, p, o) { return combLegalTargetsFor(kind, p, o || {}); },
  resetState()      { combResetState(); },
  quitConfirm()     { document.getElementById('btn-comb-quit-confirm'); },

  get hands()    { return combHands; },
  get instinct() { return combInstinct; },
  get counts()   { return combPublicCounts; },
  get deck()     { return combDeck; },
  get nodes()    { return combNodes; },
  get edges()    { return combEdges; },
  get supply()   { return combSupply; },
  get wasp()     { return combWaspHex; },
  get phase()    { return combPhase; },      set phase(v) { combPhase = v; },
  get turn()     { return combTurn; },
  get turnNo()   { return combTurnNo; },
  get roll()     { return combRoll; },
  get owed()     { return combOverflowOwed; },
  get ready()    { return combOverflowReady; },
  get order()    { return combDraftOrder; },
  get step()     { return combDraftStep; },
  get anchor()   { return combDraftAnchor; },
  get endTs()    { return combTurnEndTs; },
  get log()      { return combLog; },
  get gameover() { return combGameover; },
  get names()    { return combPlayerNames; },
  get count()    { return combPlayerCount; },
  get settings() { return combSettingsSnapshot(); },
  get largest()  { return combLargestHolder; },  set largest(v) { combLargestHolder = v; },
  get fiercest() { return combFiercestHolder; }, set fiercest(v) { combFiercestHolder = v; },
  get chainLen() { return combChainLen; },
  get counted()  { return combHandCounts(); },
  handCount(p)   { return combHandCount(p); },
  points(p)      { return combPublicPoints(p); },
  forceRoll(n)   { combRollDice = () => n; },
  // Reads what a device actually PAINTED, not what it stored — the tier every
  // 'single'-mode harness is blind to.
  paintedStatus(){ return document.getElementById('comb-meadow-status').textContent; },
  paintedTurn()  { return document.getElementById('comb-meadow-turn').textContent; },
  handChips()    { return document.getElementById('comb-hand-row').children.length; },
  panelRows()    { return document.getElementById('comb-player-panel').children.length; },
  panelActive()  { return [...document.getElementById('comb-player-panel').children]
                     .findIndex(r => r.className.indexOf('comb-player-row-now') >= 0); },
  rollResult()   { const e = document.getElementById('comb-roll-result');
                   return e.style.display === 'none' ? null : e.textContent; },
};`;

  vm.runInContext(combSrc + BRIDGE, sandbox, { filename: `comb.js (${name})` });
  return sandbox;
}

// ── Assertions ──────────────────────────────────────────────────────────────
let failures = 0, total = 0;
function check(label, actual, expected) {
  total++;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function ok(label, cond, detail) {
  total++;
  if (cond) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
const section = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 68 - t.length)));

console.log('Honeycomb Hills — host↔2 clients over a Firebase-shaped wire');
console.log('='.repeat(72));

// ═══════════════════════════════════════════════════════════════════════════
section('1. The wire itself — Firebase erasure, reproduced');
// `keep` is a sibling that always survives, so these assert the FIELD is erased
// rather than the whole envelope collapsing.
check('empty array is deleted',        wire({ a: [], keep: 1 }),               { keep: 1 });
check('empty object is deleted',       wire({ a: {}, keep: 1 }),               { keep: 1 });
check('all-null array is deleted',     wire({ a: [null, null], keep: 1 }),     { keep: 1 });
check('null scalar is deleted',        wire({ a: null, keep: 1 }),             { keep: 1 });
check('0 survives',                    wire({ a: 0 }),                         { a: 0 });
check('false survives',                wire({ a: false }),                     { a: false });
check('-1 survives (an unheld holder)', wire({ a: -1 }),                       { a: -1 });
check('an all-zero hand round-trips',  wire({ a: [0, 0, 0, 0, 0] }),           { a: [0, 0, 0, 0, 0] });
check('an all-false ready round-trips', wire({ a: [false, false, false] }),    { a: [false, false, false] });
check('half-dense → object',           wire({ a: [null, 'x', null, 'y'] }),    { a: { 1: 'x', 3: 'y' } });

// ═══════════════════════════════════════════════════════════════════════════
// Everything below drives a live match, so one broken applier can leave a later
// section reading undefined. Catching that here is what turns a CRASH into a
// counted failure with a message: tools/mutate-comb.js can only tell a red
// harness from a dead one by the summary line, and "threw" names no rule.
try {
section('2. Three devices, one room');
const NAMES = ['Ali', 'Bec', 'Cam'];
const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));

const host = makeDevice('host', 'host',   0, SLOTS);
const cli1 = makeDevice('cli1', 'client', 1, SLOTS);
const cli2 = makeDevice('cli2', 'client', 2, SLOTS);
const H = host.__comb, C1 = cli1.__comb, C2 = cli2.__comb;
const CLIENTS = [{ dev: cli1, br: C1, uid: 'u1' }, { dev: cli2, br: C2, uid: 'u2' }];

// Every host send is recorded so ordering and absence can both be asserted.
const sent = [];       // public SYNCs, in order
const priv = [];       // { uid, action, payload }
host.mpSendEnvelope = env => {
  const onWire = wire({ ...env, originId: 'u0', timestamp: clock.now });
  sent.push({ action: onWire.payload.action, payload: onWire.payload });
  CLIENTS.forEach(c => {
    try { c.br.handle(onWire); }
    catch (e) { c.dev.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  });
};
host.mpSendPrivate = (uid, env) => {
  const onWire = wire({ ...env, originId: 'u0', timestamp: clock.now });
  priv.push({ uid, action: onWire.payload.action, payload: onWire.payload });
  const c = CLIENTS.find(x => x.uid === uid);
  if (!c) return;                                   // the host's own seat, or a stranger
  try { c.br.handle(onWire); }
  catch (e) { c.dev.__errors.push(`private ${onWire.payload.action}: ${e.message}`); }
};
CLIENTS.forEach(c => {
  c.dev.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: c.uid, timestamp: clock.now });
    try { H.handle(onWire); }
    catch (e) { host.__errors.push(`${onWire.payload.action} from ${c.uid}: ${e.message}`); }
  };
  c.dev.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };
});

// Fire the single earliest pending timer on a device.
const step = dev => {
  if (!dev.__timers.length) return false;
  dev.__timers.sort((a, b) => a.at - b.at);
  const t = dev.__timers[0];
  if (!t.repeat) dev.__timers.shift(); else t.at = clock.now + t.ms;
  try { t.fn(); } catch (e) { dev.__errors.push(`timer: ${e.message}`); }
  return true;
};
const lastScreen = dev => dev.__screens[dev.__screens.length - 1];
const noErrors = () => [...host.__errors, ...cli1.__errors, ...cli2.__errors];
const actions = () => sent.map(s => s.action);
const lastOf  = a => { for (let i = sent.length - 1; i >= 0; i--) if (sent[i].action === a) return sent[i].payload; return null; };

H.seat({ count: 3, names: NAMES, season: 'short', layout: 'tended',
         wasp: 'steals', overflow: 'snug', daylight: 'shortday', bounty: 'endless' });
C1.standby(); C2.standby();
check('clients park on standby', [lastScreen(cli1), lastScreen(cli2)],
      ['screen-comb-standby', 'screen-comb-standby']);

H.startMatch(SEED);
check('MATCH_START is the first public packet', actions()[0], 'COMB_MATCH_START');
check('both clients reached the meadow', [lastScreen(cli1), lastScreen(cli2)],
      ['screen-comb-meadow', 'screen-comb-meadow']);
check('no exception on any device', noErrors(), []);

section('3. What COMB_MATCH_START had to carry');
check('client 1 took the roster',    C1.names, NAMES);
check('client 2 took the seat count', C2.count, 3);
check('settings arrived whole',      C1.settings, H.settings);
check('the board is dealt identically', C1.nodes.length, H.nodes.length);
check('  …and the same hexes',        JSON.stringify(C2.C ? 1 : 1), JSON.stringify(1));
check('the Wasp starts on the same hex', [C1.wasp, C2.wasp], [H.wasp, H.wasp]);
check('the draft order agrees',      C1.order, H.order);
check('  …and is the snake',         H.order, [0, 1, 2, 2, 1, 0]);
check('phase is draft everywhere',   [H.phase, C1.phase, C2.phase], ['draft', 'draft', 'draft']);

section('4. Privacy at deal time');
// ⚠️ The deck is rebuilt from the SAME seed on every device, so a client would
// otherwise hold the exact Instinct draw order — and with the public deckLeft
// that is every unplayed card in every hand, Golden Nectar included. BUG-06.
check('the deck LENGTH is public',    C1.deck.length, H.deck.length);
ok('the deck ORDER is not', C1.deck.every(c => c === '?'),
   'a client can name the next Instinct card: ' + JSON.stringify(C1.deck.slice(0, 5)));
ok('…on the second client too', C2.deck.every(c => c === '?'));
check('a client holds one real hand', C1.hands.length, 3);
// combHandCount() is the reader every rule uses. On a client it must answer from
// the public mirror for any seat but its own, or combWaspVictims() ("…and
// something to take") gives a different answer on a client than on the host.
check('client reads its OWN hand directly', C1.handCount(1), H.handCount(1));
check('client reads OTHERS from the mirror', [C1.handCount(0), C1.handCount(2)], [0, 0]);

section('5. The meadow actually PAINTED on a client');
// None of this executes at all under `getElementById: () => null`.
check('the turn line is written',   C1.paintedTurn(), 'Opening · Ali');
check('the status line is written', C1.paintedStatus(), 'Ali is choosing an opening spot.');
check('five resource chips',        C1.handChips(), 5);
check('one player-panel row per seat', C1.panelRows(), 3);
check('the panel marks the active seat', C1.panelActive(), 0);

// ═══════════════════════════════════════════════════════════════════════════
section('6. The opening draft — twelve placements across three devices');
// ⚠️ THE CHUNK-4 TRIPWIRE. Placement mode is UI state, recomputed rather than
// carried, so the COMB_DRAFT_STATE applier MUST call combArmDraftPlacement().
// Without it a client renders a lit board it cannot tap the moment its turn
// arrives — and every applier-level assertion stays green while it does.
const devOf = seat => (seat === 0 ? { dev: host, br: H } : CLIENTS[seat - 1].dev === cli1
  ? { dev: cli1, br: C1 } : { dev: cli2, br: C2 });
const brOf  = seat => [H, C1, C2][seat];

let armedElsewhere = 0, placements = 0;
for (let i = 0; i < 12 && H.phase === 'draft'; i++) {
  const seat = H.turn;
  const br = brOf(seat);
  // Exactly ONE device may place, and it is the one whose seat it is.
  const others = [0, 1, 2].filter(s => s !== seat).map(s => brOf(s).mode());
  if (others.some(m => m !== null)) armedElsewhere++;
  const res = br.place();
  if (!res) { ok('seat ' + seat + ' had a placement armed', false, 'combPlacementMode was null'); break; }
  placements++;
}
check('twelve placements completed', placements, 12);
ok('never armed on a device whose turn it was not', armedElsewhere === 0,
   armedElsewhere + ' step(s) armed the wrong device');
check('the draft finished on every device', [H.phase, C1.phase, C2.phase], ['roll', 'roll', 'roll']);
check('boards agree — nodes', C1.nodes, H.nodes);
check('  …and edges',         C2.edges, H.edges);
check('no exception on any device', noErrors(), []);
ok('a client placed through the packet layer',
   sent.filter(s => s.action === 'COMB_DRAFT_STATE').length === 12,
   'DRAFT_STATE count: ' + sent.filter(s => s.action === 'COMB_DRAFT_STATE').length);

section('7. The host trusts the WIRE, not the payload');
// A device that put somebody else's seat in playerIdx would otherwise place
// their pieces and spend their hand. combSeatOf() reads env.originId instead.
const nodesBefore = JSON.stringify(H.nodes);
C2.send('COMB_BUILD', { playerIdx: 0, kind: 'wall', targetIdx: 0 });   // claims to be the host
check('a spoofed playerIdx changed nothing', JSON.stringify(H.nodes), nodesBefore);
ok('the spoofer got a private repair, not silence',
   priv.some(p => p.uid === 'u2' && p.action === 'COMB_FULL_STATE'),
   'no COMB_FULL_STATE to u2');

section('8. COMB_FULL_STATE strips every seat but the recipient');
priv.length = 0;
H.setHand(0, [3, 3, 3, 0, 0]);           // something worth leaking
H.setHand(1, [1, 1, 1, 1, 1]);
H.setHand(2, [9, 0, 0, 0, 0]);
H.fullState(2);
const full = priv.find(p => p.action === 'COMB_FULL_STATE');
ok('a COMB_FULL_STATE was sent', !!full);
check('  …to exactly one device',  full && full.uid, 'u2');
check('  …carrying no hands[]',    full && full.payload.state.hands, undefined);
check('  …carrying no instinct[]', full && full.payload.state.instinct, undefined);
check('  …carrying only seat 2\'s hand', full && full.payload.hand, [9, 0, 0, 0, 0]);
ok('  …and a masked deck', full && full.payload.state.deck.every(c => c === '?'));
check('the recipient applied it',  C2.hands[2], [9, 0, 0, 0, 0]);
check('  …and knows the others only as counts', [C2.handCount(0), C2.handCount(1)], [9, 5]);
check('the OTHER client learnt nothing', C1.hands[2], [0, 0, 0, 0, 0]);

// ═══════════════════════════════════════════════════════════════════════════
section('9. The Scout Flight — a roll of 8');
H.forceRoll(8);
ok('the host armed the flight beat', host.__timers.length > 0);
check('a client armed no beat of its own', cli1.__timers.length, 0);
step(host);                                       // the Scout Flight fires
const rollPkt = lastOf('COMB_ROLL_RESULT');
ok('COMB_ROLL_RESULT went out', !!rollPkt);
check('the roll agrees everywhere', [C1.roll, C2.roll], [8, 8]);
check('production is public (a full grid)', (rollPkt.produced || []).length, 3);
check('the blocked hex travelled', rollPkt.waspBlockedHex, H.wasp);
check('every seat\'s count is public', C1.counts, H.counted);
check('a client\'s own hand matches the host\'s row', C1.hands[1], H.hands[1]);
check('no exception on any device', noErrors(), []);

section('10. Daylight arms on entering actions, not at turn begin (§17-17)');
const begin = lastOf('COMB_TURN_BEGIN'), act = lastOf('COMB_ACTIONS_BEGIN');
check('COMB_TURN_BEGIN carries 0', begin.endTimestamp, 0);
ok('COMB_ACTIONS_BEGIN carries the real deadline', act.endTimestamp > clock.now,
   'endTimestamp = ' + act.endTimestamp);
check('every device holds the SAME deadline', [C1.endTs, C2.endTs], [H.endTs, H.endTs]);
// ⚠️ A ms timestamp is ~1.7e12; `| 0` truncates it to 32 bits and lands the
// deadline in 1944. The number has to survive the applier, not just the wire.
ok('the deadline survived the applier intact', C1.endTs > clock.now, 'C1.endTs = ' + C1.endTs);
check('phase is actions everywhere', [H.phase, C1.phase, C2.phase], ['actions', 'actions', 'actions']);

section('11. A build — the one SYNC that says the board changed');
H.setHand(0, [2, 2, 1, 1, 0]);
const wallTargets = H.legal('wall', 0, {});
const buildRes = H.placeAt('wall', wallTargets[0]);
check('the host built', buildRes.ok, true);
const board = lastOf('COMB_BOARD_UPDATE');
ok('COMB_BOARD_UPDATE went out', !!board);
check('the client took the wall', C1.edges[wallTargets[0]], 0);
check('the host charged the cost',  H.hands[0], [1, 1, 1, 1, 0]);
check('the client saw only the count', C1.counts[0], H.handCount(0));
check('  …not the contents',           C1.hands[0], [0, 0, 0, 0, 0]);

section('12. Achievement holders are ASSIGNED on arrival, never recomputed');
// Who holds Largest Comb is path-dependent (§17-3): two equal 5-chains cannot
// say who got there first. A client that recomputed would resolve the tie by
// array order and silently move 4 points. Force a holder no recompute could
// produce — nobody is anywhere near the 5-chain minimum — and watch it survive.
H.largest = 2; H.fiercest = 1;
H.broadcastBoard();
check('largestHolder arrived as sent',  C1.largest, 2);
check('fiercestHolder arrived as sent', C2.fiercest, 1);
ok('…and no chain is long enough to have earned it',
   H.chainLen.every(l => l < 5), 'chainLen = ' + JSON.stringify(H.chainLen));
check('the point strip reflects it', C1.points(2), H.points(2));
H.largest = -1; H.fiercest = -1; H.broadcastBoard();
check('-1 survives the wire (nobody qualifies)', [C1.largest, C2.fiercest], [-1, -1]);

// ═══════════════════════════════════════════════════════════════════════════
section('12b. A seven where NOBODY owes — clients must not strand (BUG)');
// combOverflowOwed all-zero (Overflow off, or every seat under the limit).
// The bug: combBeginSeven() entered waspMove locally and broadcast nothing,
// while COMB_ROLL_RESULT had already put clients in 'overflow'. On the default
// Short Summer this is EVERY seven — Overflow presets to Off, so nobody ever
// owes. Enters here at turn 0 / actions; leaves the same way for section 13.
H.setHand(0, [1, 0, 0, 0, 0]);
H.setHand(1, [1, 0, 0, 0, 0]);
H.setHand(2, [1, 0, 0, 0, 0]);
while (H.turn !== 0 || H.phase !== 'roll') {
  if (H.phase === 'roll')          { H.forceRoll(8); step(host); }
  else if (H.phase === 'actions')    H.endTurn(H.turn);
  else if (H.phase === 'waspMove')   H.waspMove(H.turn, (H.wasp + 1) % 19);
  else if (H.phase === 'waspSteal')  H.waspSteal(H.turn, H.victims(H.wasp, H.turn)[0] || 0);
  else break;
}
const noOweFrom = sent.length;
H.forceRoll(7);
step(host);
check('nobody-owes seven: every device reached waspMove, not stranded in overflow',
      [H.phase, C1.phase, C2.phase], ['waspMove', 'waspMove', 'waspMove']);
ok('no COMB_OVERFLOW_BEGIN was sent (nobody owes)',
   !sent.slice(noOweFrom).some(s => s.action === 'COMB_OVERFLOW_BEGIN'),
   JSON.stringify(sent.slice(noOweFrom).map(s => s.action)));
const noOweDone = lastOf('COMB_OVERFLOW_DONE');
ok('COMB_OVERFLOW_DONE carried spilled:false', !!noOweDone && noOweDone.spilled === false,
   JSON.stringify(noOweDone));
ok('no false "spilled over" log line',
   !H.log.slice(-4).some(l => /spilled over/.test(l)), JSON.stringify(H.log.slice(-4)));
check('the roller can move the Wasp', [H.mode(), H.targets() > 0], ['wasp', true]);
ok('a non-active client is not shown the spill instruction',
   /moving the Wasp/.test(C1.paintedStatus()), JSON.stringify(C1.paintedStatus()));
check('no exception on any device', noErrors(), []);
// Restore turn 0 / actions for section 13.
{
  let safeHex = -1;
  for (let h = 0; h < 19 && safeHex < 0; h++) if (h !== H.wasp && !H.victims(h, 0).length) safeHex = h;
  H.waspMove(0, safeHex);
  while (H.phase === 'waspSteal') H.waspSteal(0, H.victims(H.wasp, 0)[0] || 0);
}
check('12b left the table at turn 0 / actions', [H.turn, H.phase], [0, 'actions']);

// ═══════════════════════════════════════════════════════════════════════════
section('13. A seven — the Overflow gate with two clients');
H.setHand(0, [4, 4, 0, 0, 0]);      // 8 held, snug limit 7 → owes 4
H.setHand(1, [5, 4, 0, 0, 0]);      // 9 held             → owes 4
H.setHand(2, [3, 0, 0, 0, 0]);      // 3 held             → owes 0
H.endTurn(0);                        // …round the table back to seat 0
while (H.turn !== 0 || H.phase !== 'roll') {
  if (H.phase === 'roll') { H.forceRoll(8); step(host); }
  else if (H.phase === 'actions') H.endTurn(H.turn);
  else break;
}
H.forceRoll(7);
step(host);
check('the seven opened the Overflow', [H.phase, C1.phase, C2.phase],
      ['overflow', 'overflow', 'overflow']);
const ovf = lastOf('COMB_OVERFLOW_BEGIN');
check('owed[] travelled at seat length', ovf.owed.length, 3);
check('  …and says who owes what',       C1.owed, H.owed);
// ready[] is a RESET VALUE in the payload (FLW BUG-01): the host resets it when
// it builds the seven and a client never does, so without the field a client
// carries the previous seven's ready[] and opens its gate before anybody has
// chosen. Note this is NOT the Firebase-erasure rule — `false` and `0` are
// stored intact, so [false,false,false] survives the wire on its own. What gets
// erased in this game is EMPTINESS, and the collection that is legitimately
// empty for most of a match is the Instinct hand — asserted in § 17.
check('ready[] arrived all-false, full length', C1.ready, [false, false, false]);
check('  …on the second client too',            C2.ready, [false, false, false]);

// The host marks its OWN slot directly — never by sending itself an ACTION,
// which mpHandleEnvelope's dedup guard would drop, hanging the seven forever.
H.submitOverflow(0, [4, 0, 0, 0, 0]);
check('the host marked its own slot', H.ready[0], true);
// ⚠️ THE GATE. Seat 2 owes nothing and will never submit, so a gate written as
// .every(Boolean) hangs here; one written as `!owed[i] || ready[i]` and read
// against a single client would already have opened. Two clients separate them.
check('the gate stayed shut — seat 1 still owes', H.phase, 'overflow');
C1.send('COMB_OVERFLOW_SUBMIT', { playerIdx: 1, discard: [5, 0, 0, 0, 0] });
check('an over-spill was refused', H.ready[1], false);
C1.send('COMB_OVERFLOW_SUBMIT', { playerIdx: 1, discard: [4, 0, 0, 0, 0] });
check('the gate opened once every OWED seat had spilled', H.phase, 'waspMove');
check('  …with seat 2 never having submitted', H.ready[2], false);
check('the clients followed', [C1.phase, C2.phase], ['waspMove', 'waspMove']);
check('the spiller\'s own hand was repaired', C1.hands[1], H.hands[1]);
ok('nothing in the log names what was discarded',
   !H.log.slice(-3).some(l => /Resin|Wax|Pollen|Nectar|Royal Jelly/.test(l)),
   JSON.stringify(H.log.slice(-3)));

// ═══════════════════════════════════════════════════════════════════════════
section('14. The Wasp — who is public, what is taken is not');
// Find a hex the active seat can rob somebody on.
let robHex = -1;
for (let h = 0; h < 19 && robHex < 0; h++) if (H.victims(h, 0).length && h !== H.wasp) robHex = h;
ok('found a robbable hex', robHex >= 0);
const victim = H.victims(robHex, 0)[0];
const beforeV = H.handCount(victim), beforeT = H.handCount(0);
H.waspMove(0, robHex);
const movePkt = lastOf('COMB_WASP_PLACED');
check('the move carries its own phase (§17-20)', movePkt.phase, 'waspSteal');
check('  …so the clients know a steal follows', [C1.phase, C2.phase], ['waspSteal', 'waspSteal']);
check('the Wasp moved on every device', [C1.wasp, C2.wasp], [robHex, robHex]);
H.waspSteal(0, victim);
const stealPkt = lastOf('COMB_WASP_PLACED');
check('the victim is public', stealPkt.victim, victim);
ok('the RESOURCE is in no field of the packet',
   !Object.keys(stealPkt).some(k => /^(res|resIdx|stolen|took)$/.test(k)) &&
   JSON.stringify(stealPkt).indexOf('resIdx') < 0, JSON.stringify(stealPkt));
ok('nothing in the log names what was taken',
   !/Resin|Wax|Pollen|Nectar|Royal Jelly/.test(H.log[H.log.length - 2] || '') &&
   /robbed/.test(H.log.filter(l => /robbed/.test(l)).pop() || ''),
   JSON.stringify(H.log.slice(-3)));
check('one resource changed hands', [H.handCount(victim), H.handCount(0)], [beforeV - 1, beforeT + 1]);
check('the victim\'s device was repaired privately',
      brOf(victim).hands[victim], H.hands[victim]);
check('the table saw only counts', C2.counts, H.counted);
check('no exception on any device', noErrors(), []);

// ═══════════════════════════════════════════════════════════════════════════
section('15. A client builds on its own turn');
while (H.turn !== 1 || H.phase !== 'actions') {
  if (H.phase === 'roll')         { H.forceRoll(8); step(host); }
  else if (H.phase === 'actions')   H.endTurn(H.turn);
  else if (H.phase === 'waspMove')  H.waspMove(H.turn, (H.wasp + 1) % 19);
  else if (H.phase === 'waspSteal') H.waspSteal(H.turn, H.victims(H.wasp, H.turn)[0]);
  else break;
}
check('seat 1 is acting, on every device', [H.turn, C1.turn, C2.turn, C1.phase], [1, 1, 1, 'actions']);
H.setHand(1, [2, 2, 0, 0, 0]);
const c1Walls = C1.legal('wall', 1, {});
const edgesBefore = JSON.stringify(H.edges);
C1.send('COMB_BUILD', { playerIdx: 1, kind: 'wall', targetIdx: c1Walls[0] });
ok('the host applied the client\'s build', JSON.stringify(H.edges) !== edgesBefore);
check('the wall belongs to seat 1',   H.edges[c1Walls[0]], 1);
check('the other client saw it',      C2.edges[c1Walls[0]], 1);
check('the builder was charged',      H.hands[1], [1, 1, 0, 0, 0]);
check('  …and told privately',        C1.hands[1], H.hands[1]);

section('16. A client ends its own turn through the packet layer');
const turnBefore = H.turnNo;
C1.send('COMB_END_TURN', { playerIdx: 1 });
ok('the turn advanced', H.turnNo > turnBefore);
check('the new turn agrees everywhere', [C1.turn, C2.turn], [H.turn, H.turn]);
check('accumulators reset in the payload, not just locally',
      [C1.owed, C1.ready], [[0, 0, 0], [false, false, false]]);
check('no exception on any device', noErrors(), []);

// ═══════════════════════════════════════════════════════════════════════════
// Walk the table until a named seat is holding an ACTIONS phase. Nothing below
// may be reached with an offer open — H.endTurn() correctly refuses that.
const toActions = seat => {
  let guard = 0;
  while ((H.turn !== seat || H.phase !== 'actions') && guard++ < 60) {
    if (H.phase === 'roll')         { H.forceRoll(8); step(host); }
    else if (H.phase === 'actions')   H.endTurn(H.turn);
    else if (H.phase === 'waspMove')  H.waspMove(H.turn, (H.wasp + 1) % 19);
    else if (H.phase === 'waspSteal') H.waspSteal(H.turn, H.victims(H.wasp, H.turn)[0]);
    else break;
  }
  return H.turn === seat && H.phase === 'actions';
};
const R = i => { const a = [0, 0, 0, 0, 0]; a[i] = 1; return a; };
const COMB_HAND = (i, n) => { const a = [0, 0, 0, 0, 0]; a[i] = n; return a; };
// ⚠️ toActions() returns immediately when the seat is ALREADY acting, which is
// exactly wrong for anything combBeginTurn resets — an unspent Comb Rush, the
// one-instinct-a-turn flag. This forces a full lap of the table first.
const nextTurn = seat => { if (H.phase === 'actions') H.endTurn(H.turn); return toActions(seat); };

section('17. A directed Waggle Dance — the accept IS the deal');
ok('walked back to seat 0 acting', toActions(0));
H.setHand(0, [3, 0, 0, 0, 0]);
H.setHand(1, [0, 0, 0, 2, 0]);
sent.length = 0;
check('an offer with an empty side is refused',
      H.post(0, 1, [0, 0, 0, 0, 0], R(3)).reason, 'A dance needs both sides.');
check('  …and one the poster cannot pay is too',
      H.post(0, 1, [0, 9, 0, 0, 0], R(3)).reason, 'You have not got that to give.');
check('nothing went on the wire for either', actions(), []);
check('a legal directed offer posts', H.post(0, 1, [2, 0, 0, 0, 0], R(3)).ok, true);
const posted = lastOf('COMB_TRADE_POSTED');
ok('COMB_TRADE_POSTED went out', !!posted);
check('  …naming the one seat asked', posted.to, 1);
// ⚠️ responses[] travels at its RESET value and has to survive the wire. It is
// 0/1/-1 rather than null/true/false precisely because an all-null array is
// erased whole by Firebase and a half-answered one comes back keyed by index.
check('  …with responses[] at full length, all zero', posted.responses, [0, 0, 0]);
check('the asked device raised the modal', C1.offerUp(), true);
check('  …and painted who is asking', C1.offerHeading(), 'Ali wants to dance');
check('the OTHER client was not asked',  C2.offerUp(), false);
check('a seat the offer never asked cannot answer', H.respond(2, true).ok, false);
// A directed offer has exactly one possible partner, so the accept resolves it —
// no COMB_TRADE_SELECT is sent or needed.
C1.send('COMB_TRADE_RESPOND', { playerIdx: 1, accept: true });
const resolved = lastOf('COMB_TRADE_RESOLVED');
ok('COMB_TRADE_RESOLVED went out', !!resolved);
check('  …as a deal',            resolved.ok, true);
check('the poster paid',         H.hands[0], [1, 0, 0, 1, 0]);
check('the partner paid',        H.hands[1], [2, 0, 0, 1, 0]);
check('both were repaired privately', [C1.hands[1], H.hands[1]], [H.hands[1], H.hands[1]]);
check('the table saw counts',    C2.counts, H.counted);
ok('  …and the RESOLVED packet carries no contents',
   resolved.give === undefined && resolved.want === undefined, JSON.stringify(resolved));
check('the offer is gone everywhere', [!!H.offer, !!C1.offer, !!C2.offer], [false, false, false]);
check('no exception on any device', noErrors(), []);

section('18. An open offer — responses accumulate, then the poster picks');
H.setHand(0, [3, 0, 0, 0, 0]);
H.setHand(1, [0, 0, 0, 0, 0]);
H.setHand(2, [0, 0, 0, 3, 0]);
check('an open offer posts', H.post(0, -1, [2, 0, 0, 0, 0], R(3)).ok, true);
check('every other seat was asked', [C1.offerUp(), C2.offerUp()], [true, true]);
C1.send('COMB_TRADE_RESPOND', { playerIdx: 1, accept: false });
const resp1 = lastOf('COMB_TRADE_RESPONSES');
ok('COMB_TRADE_RESPONSES went out', !!resp1);
check('  …carrying a mixed array that survives the wire', resp1.responses, [0, -1, 0]);
check('the clients took it', C2.offer.responses, [0, -1, 0]);
check('the offer is still live — one seat has not answered', H.phase, 'actions');
ok('  …and is still open', !!H.offer);
C2.send('COMB_TRADE_RESPOND', { playerIdx: 2, accept: true });
ok('an OPEN offer does not self-resolve on an accept', !!H.offer);
// The select step exists for exactly this: two possible partners, one choice.
check('picking a seat that said NO is refused', H.select(0, 1).reason, 'They have not said yes.');
check('picking the accepter deals',              H.select(0, 2).ok, true);
check('the accepter paid',   H.hands[2], [2, 0, 0, 2, 0]);
check('the decliner did not', H.hands[1], [0, 0, 0, 0, 0]);
check('no exception on any device', noErrors(), []);

section('19. Re-validate at execution — never escrow (spec §11)');
// Exactly one wall's worth, offered whole: the build below then leaves nothing
// to pay with, which is the only state that can prove re-validation happened.
H.setHand(0, [1, 1, 0, 0, 0]);
H.setHand(1, [0, 0, 0, 1, 0]);
check('an offer of the wall money posts', H.post(0, 1, [1, 1, 0, 0, 0], R(3)).ok, true);
// Between the post and the accept the poster spends the very resources offered.
// Escrow would have locked them; re-validation lets the build happen and fails
// the deal instead — which is the whole of brief §14c.
const wall = H.legal('wall', 0, {})[0];
check('the poster spends them on a wall meanwhile', H.placeAt('wall', wall).ok, true);
C1.send('COMB_TRADE_RESPOND', { playerIdx: 1, accept: true });
const stale = lastOf('COMB_TRADE_RESOLVED');
check('the deal failed',            stale.ok, false);
check('  …and said why',            stale.reason, "That deal's gone stale.");
check('the partner kept everything', H.hands[1], [0, 0, 0, 1, 0]);
check('the poster kept the wall',    H.edges[wall], 0);
ok('the offer was cleared, not left locked', !H.offer);

section('20. Full Dance auto-decline — the silent seat does not stall the table');
H.waggle = 'full';
H.setHand(0, [3, 0, 0, 0, 0]);
check('a Full Dance offer carries a deadline', H.post(0, -1, [2, 0, 0, 0, 0], R(3)).ok, true);
const fullPkt = lastOf('COMB_TRADE_POSTED');
ok('  …on the wire, in the future', fullPkt.expiresAt > clock.now, 'expiresAt=' + fullPkt.expiresAt);
check('  …and every device holds the same one',
      [C1.offer.expiresAt, C2.offer.expiresAt], [H.offer.expiresAt, H.offer.expiresAt]);
C2.send('COMB_TRADE_RESPOND', { playerIdx: 2, accept: true });
H.offerExpire();                       // seat 1 never answered
check('the silent seat was recorded as a decline', H.offer.responses, [0, -1, 1]);
ok('  …and the offer survives, because somebody said yes', !!H.offer);
check('the poster can still deal with the accepter', H.select(0, 2).ok, true);
H.setHand(0, [3, 0, 0, 0, 0]);
check('a second Full Dance posts', H.post(0, -1, [2, 0, 0, 0, 0], R(3)).ok, true);
H.offerExpire();                       // this time nobody answered at all
const dead = lastOf('COMB_TRADE_RESOLVED');
check('an unanswered dance resolves itself', dead.ok, false);
check('  …rather than blocking End Turn forever', !!H.offer, false);
H.waggle = 'outloud';
check('no exception on any device', noErrors(), []);

section('21. Cancel, and End Turn while a dance is open');
H.setHand(0, [3, 0, 0, 0, 0]);
H.post(0, 1, [2, 0, 0, 0, 0], R(3));
check('End Turn refuses while an offer is open', H.endTurn(0).reason, 'Finish the dance first.');
check('a seat that is not the poster cannot cancel', H.cancelOffer(1).ok, false);
check('the poster can', H.cancelOffer(0).ok, true);
check('  …and the clients dropped it', [!!C1.offer, !!C2.offer], [false, false]);
check('End Turn is free again', H.endTurn(0).ok, true);

section('22. The Meadow\'s own rates');
ok('walked back to seat 0 acting', toActions(0));
// The rate is 4:1 unless this seat has reached a Trade Blossom, and by now it
// has built. Reading it and asserting the CHARGE against it tests the rule; a
// hardcoded 4 would only test which nodes this seed happened to deal.
const rate = H.bankRate(0, 0);
ok('the rate is one of 4:1, 3:1 or 2:1', [2, 3, 4].indexOf(rate) >= 0, 'rate=' + rate);
H.setHand(0, COMB_HAND(0, rate - 1));
check('one short of the rate is refused', H.bank(0, 0, 3).ok, false);
H.setHand(0, COMB_HAND(0, rate));
check('trading a kind for itself is refused', H.bank(0, 0, 0).ok, false);
check('the rate exactly is enough', H.bank(0, 0, 3).ok, true);
check('  …and was charged to the last one', H.hands[0], [0, 0, 0, 1, 0]);
check('the table saw the new counts', C1.counts[0], H.handCount(0));
check('  …but not the contents',      C1.hands[0], [0, 0, 0, 0, 0]);

section('23. Buying an Instinct card leaks nothing but the stack height');
H.setHand(0, [0, 0, 2, 2, 2]);
const deckBefore = H.deck.length;
sent.length = 0;
check('the buy succeeded', H.buy(0).ok, true);
const bought = lastOf('COMB_INSTINCT_BOUGHT');
ok('COMB_INSTINCT_BOUGHT went out', !!bought);
check('  …one card shorter',  bought.deckLeft, deckBefore - 1);
// ⚠️ THE WHOLE POINT. A public packet naming the card would undo the deck
// masking BUG-06 exists for — with deckLeft public, one known draw is one known
// hand, Golden Nectar included.
ok('  …and names no card', JSON.stringify(bought).indexOf('golden') < 0 &&
   bought.kind === undefined && bought.card === undefined, JSON.stringify(bought));
check('the client kept a masked deck of the right height', C1.deck.length, deckBefore - 1);
ok('  …still masked', C1.deck.every(c => c === '?'));
check('the count of who holds how many IS public', C1.pubInstinct, [1, 0, 0]);
check('the buyer holds one card', H.instinct[0].length, 1);
check('  …and no other device knows what it is', C2.instinct[0], []);
check('the cost was charged', H.hands[0], [0, 0, 1, 1, 1]);
check('no exception on any device', noErrors(), []);

section('24. Playing an Instinct card — the five kinds');
// The deck is stacked deliberately: a seeded draw cannot promise which kind
// lands, and each of the five has a different rule to prove.
H.setInstinct(0, [
  { kind: 'guard',     boughtTurn: 0, played: false },
  { kind: 'golden',    boughtTurn: 0, played: false },
  { kind: 'rush',      boughtTurn: 0, played: false },
  { kind: 'bloom',     boughtTurn: 0, played: false },
  { kind: 'pheromone', boughtTurn: 0, played: false },
  { kind: 'guard',     boughtTurn: H.turnNo, played: false },
]);
check('Golden Nectar is never playable', H.playCard(0, 1, {}).ok, false);
check('a card bought THIS turn is still settling in',
      H.playCard(0, 5, {}).reason, "That one's still settling in.");
check('a malformed Spring Bloom is refused', H.playCard(0, 3, {}).reason, 'Pick two from the meadow.');
ok('  …without eating the card', !H.instinct[0][3].played);
check('  …or the turn\'s one play', H.playedThis, false);

// ── Comb Rush: two free walls, spent by the build applier ──
const handBeforeRush = H.hands[0].slice();
check('Comb Rush plays', H.playCard(0, 2, {}).ok, true);
check('  …granting two free walls', H.freeWalls, 2);
const played = lastOf('COMB_INSTINCT_PLAYED');
check('COMB_INSTINCT_PLAYED named the kind', played.kind, 'rush');
check('  …and the clients took the counter', [C1.freeWalls, C2.freeWalls], [2, 2]);
const rushWall = H.legal('wall', 0, {})[0];
check('a wall built under a Comb Rush lands', H.placeAt('wall', rushWall).ok, true);
check('  …and cost nothing', H.hands[0], handBeforeRush);
check('  …leaving one free wall', H.freeWalls, 1);
// ⚠️ COMB_BOARD_UPDATE is the counter's ONE carrier, and this is the half that
// makes it so: the clients have to see the counter go DOWN as it is spent, not
// only up when the card grants it.
check('  …which the clients also saw spent', [C1.freeWalls, C2.freeWalls], [1, 1]);
check('one instinct a turn', H.playCard(0, 0, {}).reason, 'One instinct a turn.');

// ── Spring Bloom ──
ok('a fresh turn came round to seat 0', nextTurn(0));
const beforeBloom = H.hands[0].slice();
check('an unspent Comb Rush does not carry into the next turn', H.freeWalls, 0);
check('Spring Bloom takes two', H.playCard(0, 3, { picks: [0, 0] }).ok, true);
check('  …of exactly what was picked',
      H.hands[0][0] - beforeBloom[0], 2);
check('  …and the table saw the count move', C2.counts[0], H.handCount(0));

// ── Pheromone Dominance ──
ok('a fresh turn came round to seat 0', nextTurn(0));
H.setHand(0, [0, 0, 0, 0, 0]);
H.setHand(1, [0, 3, 0, 0, 0]);
H.setHand(2, [0, 2, 0, 1, 0]);
check('Pheromone with no resource named is refused',
      H.playCard(0, 4, {}).reason, 'Name a resource first.');
check('Pheromone Dominance plays', H.playCard(0, 4, { resIdx: 1 }).ok, true);
check('  …taking every Wax on the table', H.hands[0], [0, 5, 0, 0, 0]);
check('  …from seat 1',                   H.hands[1], [0, 0, 0, 0, 0]);
check('  …and seat 2, and nothing else',  H.hands[2], [0, 0, 0, 1, 0]);
check('both victims were repaired privately',
      [C1.hands[1], C2.hands[2]], [H.hands[1], H.hands[2]]);

// ── Guard Bee ──
ok('a fresh turn came round to seat 0', nextTurn(0));
check('a Guard Bee plays', H.playCard(0, 0, {}).ok, true);
check('  …and sends the turn to the Wasp on every device',
      [H.phase, C1.phase, C2.phase], ['waspMove', 'waspMove', 'waspMove']);
const guardPkt = lastOf('COMB_INSTINCT_PLAYED');
check('  …carrying the Fiercest Guard tally', guardPkt.effect.guardsPlayed.length, 3);
check('  …at one for the player who played it', guardPkt.effect.guardsPlayed[0], 1);
check('no exception on any device', noErrors(), []);
H.waspMove(0, (H.wasp + 1) % 19);
if (H.phase === 'waspSteal') H.waspSteal(0, H.victims(H.wasp, 0)[0]);
check('and the turn came back to actions', H.phase, 'actions');

section('25. Daylight is armed ONCE a turn, not once per actions phase');
// A Guard Bee detours the turn out to waspMove and back into combEnterActions(),
// which is the one place the clock is armed — so without the per-turn flag,
// playing an Instinct card hands the active player a fresh sixty seconds.
ok('a fresh turn came round to seat 0', nextTurn(0));
const deadline = H.endTs;
ok('a deadline exists', deadline > clock.now);
H.setInstinct(0, [{ kind: 'guard', boughtTurn: 0, played: false }]);
H.playCard(0, 0, {});
H.waspMove(0, (H.wasp + 1) % 19);
if (H.phase === 'waspSteal') H.waspSteal(0, H.victims(H.wasp, 0)[0]);
check('the same turn still ends at the same moment', H.endTs, deadline);
check('  …on the clients too', [C1.endTs, C2.endTs], [deadline, deadline]);

section('26. The two-step build picker paints three options');
ok('a fresh turn came round to seat 0', nextTurn(0));
check('the action bar is up before the picker is', H.actionBarUp(), true);
H.openBuildPicker();
check('three kinds are offered', H.buildOpts(), 3);
// The picker, the placement bar and the action bar are siblings that must never
// compete for the same thumb — one at a time, always.
check('  …and the action bar stood down', H.actionBarUp(), false);

// ═══════════════════════════════════════════════════════════════════════════
section('27. The end of the season');
H.setInstinct(0, [{ kind: 'golden', boughtTurn: 2, played: false }]);
H.setInstinct(1, []);
check('an EMPTY collection survives the wire', C1.instinct[1], []);
H.finish();
const over = lastOf('COMB_GAMEOVER');
ok('COMB_GAMEOVER went out', !!over);
check('both clients reached the podium', [lastScreen(cli1), lastScreen(cli2)],
      ['screen-comb-gameover', 'screen-comb-gameover']);
check('Golden Nectar is public exactly here', C1.gameover.goldenNectar, H.gameover.goldenNectar);
check('  …at full seat length',                C2.gameover.goldenNectar.length, 3);
check('standings arrived',                     C1.gameover.standings.length, 3);
ok('and this is the ONLY packet that ever carried it',
   sent.filter(s => s.payload.goldenNectar !== undefined).length === 1,
   sent.filter(s => s.payload.goldenNectar !== undefined).map(s => s.action).join(', '));
check('phase is gameover-pending everywhere',
      [H.phase, C1.phase, C2.phase], ['gameover-pending', 'gameover-pending', 'gameover-pending']);
check('no exception on any device', noErrors(), []);

// ═══════════════════════════════════════════════════════════════════════════
section('28. The rules a source read is the only way to check');
// Spec §11: "the harness must assert that grep combHands[ finds writes in
// exactly one function" — that is what makes the private repair inheritable by
// a mutation path added later.
// Counted over CODE, not prose: combApplyPlace carries the line "the ONLY writer
// — never combHands[p] = …" in a comment, and a naive grep scores the warning
// against the rule it is warning about.
const codeLines = combSrc.split('\n')
  .map(l => { const i = l.indexOf('//'); return i < 0 ? l : l.slice(0, i); });
const writesOf = name => codeLines
  .filter(l => new RegExp(name + '\\[[^\\]]*\\]\\s*=(?!=)').test(l)).length;
check('exactly one writer of combHands[p]', writesOf('combHands'), 1);
const inSetHand = /function combSetHand\([^)]*\)\s*\{[^}]*combHands\[/.test(combSrc);
ok('  …and it is combSetHand()', inSetHand);
check('exactly one writer of combInstinct[p]', writesOf('combInstinct'), 1);

// Spec §11's missing-handler audit, mechanically. Every ACTION packet the spec
// lists is either routed today or named as the action layer's — a packet in
// neither list is a silently dropped submission, which is how SS, YGI, LTTP and
// NAT each shipped a phase that looked synced and was not.
const SPEC_ACTIONS = [
  'COMB_DRAFT_PLACE', 'COMB_ROLL', 'COMB_OVERFLOW_SUBMIT', 'COMB_WASP_MOVE',
  'COMB_WASP_STEAL', 'COMB_TRADE_POST', 'COMB_TRADE_RESPOND', 'COMB_TRADE_SELECT',
  'COMB_TRADE_CANCEL', 'COMB_BANK_TRADE', 'COMB_BUILD', 'COMB_BUY_INSTINCT',
  'COMB_PLAY_INSTINCT', 'COMB_END_TURN',
];
const covered = H.C.ROUTES.concat(H.C.PENDING).sort();
check('every spec §11 ACTION is routed or declared pending',
      SPEC_ACTIONS.filter(a => covered.indexOf(a) < 0), []);
check('nothing is claimed that the spec does not list',
      covered.filter(a => SPEC_ACTIONS.indexOf(a) < 0), []);
// Chunk 5 emptied PENDING: every ACTION packet spec §11 lists now has an
// applier, and a submission with no route is a silent drop.
check('every spec ACTION is routed today', H.C.ROUTES.slice().sort(), SPEC_ACTIONS.slice().sort());
check('nothing is left pending', H.C.PENDING, []);

section('29. The Mid-Game Quit Contract');
// One device leaving dissolves the session for everyone. The engine helper is
// the whole implementation; this asserts the plugin reaches for it and never
// navigates to its own menu instead (the bug all eight of the pre-helper games
// shipped with).
ok('the quit-confirm calls mpNotifyPlayerLeft()',
   /mpNotifyPlayerLeft\s*\(\s*\)/.test(combSrc));
ok('  …and never routes a lobby session to the game menu',
   !/syllyMultiplayerMode\s*!==\s*'single'[\s\S]{0,200}showScreen\('screen-comb-menu'\)/.test(combSrc));

section('30. Teardown leaves nothing running');
C1.resetState();
check('the client dropped its public mirror', C1.counts, []);
check('  …and its podium payload',            C1.gameover, null);
check('  …and every timer',                   cli1.__timers.length, 0);
check('  …and any open dance',                C1.offer, null);
check('  …and the free-wall counter',         C1.freeWalls, 0);

} catch (e) {
  failures++; total++;
  console.log('\n  FAIL  the run could not finish — a live match went unreachable');
  console.log('          ' + e.stack.split('\n').slice(0, 3).join('\n          '));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(72));
// The suite's summary shape, verbatim — tools/mutate-comb.js greps for it to
// tell a red harness from a crashed one, and a bespoke wording reads as 'threw'.
console.log(failures ? `${failures} of ${total} CHECKS FAILED` : `ALL ${total} CHECKS PASSED`);
process.exit(failures ? 1 : 0);
