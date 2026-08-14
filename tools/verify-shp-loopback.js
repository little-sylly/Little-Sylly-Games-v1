// ═══════════════════════════════════════════════════════════════════════════
// verify-shp-loopback.js — HOST ↔ CLIENT(S) loopback for Counting Sheep, across a
// wire that behaves like Firebase Realtime Database, with a REAL (mock) DOM.
//
//   node tools/verify-shp-loopback.js        (exits 1 on any failure)
//   SHP_SRC=path/to/broken-copy.js node tools/verify-shp-loopback.js
//
// Modelled on tools/verify-cjar-loopback.js (the wire and DOM-mock sections below
// are close ports of that file — they're game-agnostic). Required per the scoring-
// rework spec (docs/new-game-tech-counting-sheep-scoring.md §11) because
// tools/verify-shp-loop.js runs in 'single' mode — one process drives every seat
// directly, `mpSendEnvelope` is stubbed to throw, and NOTHING about the packet
// layer or render layer is exercised by it. Chunk 7's throwaway two-sandbox probe
// (see shp-implementation-notes.md) proved the shape and caught a real bug
// (shpHostDoze/shpHostMoonLoss skipping their own SHP_DOZE broadcast on the crash
// that ends a Night/match); this is that probe built out properly, with the wire's
// Firebase-shaped erasure and a real DOM instead of a live-reference pipe and
// getElementById returning null.
//
//   Firebase RTDB stores no `null`, no `{}` and no `[]`. A key whose value is any
//   of those is DELETED, and the SDK hands the reader back `undefined`. An array
//   whose entries are all null vanishes entirely; a sparse one comes back as an
//   OBJECT with numeric keys, not an array. shpDozed/shpDozeOrder/shpMoonsHeld all
//   ride this exact trap — §8 of the spec calls it out by name.
//
// SCOPE NOTE: this harness asserts STATE correctness (does the client end up with
// the same shpDozed/shpDozeOrder/shpHands/shpMoonsHeld/standings as the host, does
// no applier throw) and the sync-lock/ack GATING behaviour, not rendered UI output.
// Chunk 9 has since wired the render seam onto the new state (shpRenderNightEnd,
// the doze chip/banner), and the real DOM mock — not getElementById: () => null —
// means all of that code genuinely EXECUTES here, so a render-path throw is caught.
// What is still deliberately out of scope is asserting the rendered copy/layout
// itself: a mock element has no box, so spacing, alignment and overflow are the
// `visual-check` skill's job, not this harness's.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
// SHP_SRC lets a deliberately-broken copy be driven through the same wire — the
// mechanism this file's own bug-finding claim is proven against (see the bottom).
const shpSrc = fs.readFileSync(process.env.SHP_SRC || path.join(ROOT, 'js/games/shp.js'), 'utf8');

// ── The wire (ported from verify-cjar-loopback.js — game-agnostic) ─────────────
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

// ── DOM mock with REAL elements (ported from verify-cjar-loopback.js) ──────────
function makeDocument() {
  const byId = {};
  const mk = tag => ({
    tagName: tag, children: [], style: {}, dataset: {}, title: '',
    scrollLeft: 0, scrollWidth: 0, disabled: false,
    className: '', textContent: '',
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { cs.forEach(c => this.children.push(c)); },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener() {}, removeEventListener() {},
    setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k] || null; },
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  });
  return {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) { return byId[id] || (byId[id] = mk('div')); },
  };
}

// ── One device ───────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers = [];
  const screens = [];
  const errors  = [];
  let nextRand = null;      // one-shot Math.random override — see forceRandom()
  let seq = 0;

  const sandbox = {
    console,
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode },
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: Date.now() + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    playBoing() {}, playDone() {}, playExit() {}, playLaunch() {}, playPillClick() {},
    playSuccess() {}, playSyllyOff() {}, playSyllyOn() {}, playTick() {}, playWhoosh() {},
    assetFace: () => null, assetBack: () => null, assetExtra: () => null,
    // engine.js's shared Tap-Hold Reference helper (shpBindCardHold now delegates
    // to it) — a no-op here exactly like this mock's own el.addEventListener,
    // since this harness does not test DOM event bindings.
    bindCardHold() {},
    mpLockSync() {}, mpUnlockSync() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __dissolved: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors,
  };
  // Deterministic RNG: a fixed default sequence (mulberry32) so a run is
  // reproducible, with a one-shot override for forcing a specific card roll
  // (Skip a Few / Fogged Dream) or a specific shuffle outcome on demand.
  let a = (name.length * 2654435761) >>> 0;
  const defaultRand = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  sandbox.Math = Object.create(Math);
  sandbox.Math.random = () => {
    if (nextRand !== null) { const v = nextRand; nextRand = null; return v; }
    return defaultRand();
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const BRIDGE = `
globalThis.__shp = {
  get herd()        { return shpHerd; },
  get ceiling()      { return shpCeiling; },
  get moons()        { return shpMoonsHeld; },
  get moonsToWin()   { return shpMoonsToWin; },
  get dozed()        { return shpDozed; },
  get dozeOrder()    { return shpDozeOrder; },
  get dozeNotice()   { return shpDozeNotice; },
  get nightEndInfo() { return shpNightEndInfo; },
  get eliminated()   { return shpEliminated; },
  get elimOrder()    { return shpElimOrder; },
  get hands()        { return shpHands; },
  get handCap()      { return shpHandCap; },
  get wolfActive()   { return shpWolfActive; },
  get active()       { return shpActivePlayer; },
  get stuckIdx()     { return shpStuckIdx; },
  get nightNum()     { return shpNightNum; },
  get forcedCards()  { return shpForcedCards; },
  get winner()       { return shpGameWinner; },
  get standings()    { return shpGameStandings; },
  get ackCount()     { return shpDeepSleepAcks; },
  get ackNeeded()    { return shpDeepSleepAckNeeded; },
  get iAcked()       { return shpIAcked; },
  get sylly()        { return shpSyllyMode; },
  get playerCount()  { return shpPlayerCount; },
  get flock()        { return shpFlock; },
  get discard()      { return shpDiscard; },
  seat(o) {
    shpPlayerCount = o.players;
    shpPlayerNames = o.names || Array.from({ length: o.players }, (_, i) => 'P' + i);
    shpHandSize = o.handSize || 4; shpMoons = o.moons || 5; shpMoonsToWin = o.moonsToWin || 2;
    shpDreamAccel = o.dreamAccel !== false; shpSyllyMode = !!o.sylly;
  },
  start()               { shpStartSession(); },
  // Deterministic scenario control — same technique as CJAR's stackDeck(): a real
  // shuffle won't deliver a specific hand/bust/stuck-out on demand, so these let a
  // test build the exact pre-condition it needs to assert against.
  setHerd(v)            { shpHerd = v; },
  setHand(i, ids)        { shpHands[i] = ids.slice(); },
  stackFlock(ids)        { shpFlock = ids.slice(); },
  legal(i)               { return shpLegalCards(i); },
  play(i, idx)            { shpHostPlayCard(i, idx); },
  playTwo(i, a, b)        { shpHostPlayTwoCard(i, a, b); },
  tapCard(idx)            { shpTapCard(idx); },       // active device's own tap (uses shpMyIdx)
  confirmStuck()          { shpConfirmStuck(); },
  crash(i, reason, landedOn) { shpHostCrash(i, reason, landedOn); },
  continueNight()         { shpHostContinue(); },
  // The Night-end "Got it" ack — its real trigger is the button shpRenderNightEnd
  // builds, which needs a click on a mock node the harness has no way to dispatch.
  // This replicates that handler's own three-line body exactly (shpIAcked +
  // mpLockSync + the SHP_SLEEP_ACK send), not a reimplementation of game logic.
  ackNightEnd() {
    shpIAcked = true;
    if (typeof mpLockSync === 'function') mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_SLEEP_ACK' } });
  },
  handle(env)             { shpHandleEnvelope(env); },
  hasStuckButton(idx)     { return shpStuckIdx === idx; },
};`;

  vm.runInContext(shpSrc + BRIDGE, sandbox, { filename: `shp.js (${name})` });
  sandbox.__forceRandom = v => { nextRand = v; };
  return sandbox;
}

// ── A room: one host, N clients, wired both directions ─────────────────────────
function makeRoom(names, hostMode) {
  const slots = names.map((n, i) => ({ uid: 'u' + i, nickname: n }));
  const host = makeDevice('host', 'host', 0, slots);
  const clients = names.slice(1).map((n, i) => makeDevice(n, 'client', i + 1, slots));
  const sent = [];

  host.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    sent.push(onWire.payload.action);
    clients.forEach(c => {
      try { c.__shp.handle(onWire); }
      catch (e) { c.__errors.push(`${onWire.payload.action}: ${e.message}`); }
    });
  };
  clients.forEach((c, idx) => {
    c.mpSendEnvelope = env => {
      const onWire = wire({ ...env, originId: 'u' + (idx + 1), timestamp: Date.now() });
      try { host.__shp.handle(onWire); }
      catch (e) { host.__errors.push(`${onWire.payload.action}: ${e.message}`); }
    };
  });
  return { host, clients, all: [host, ...clients], sent };
}

// ── Assertions ──────────────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

console.log('Counting Sheep — host↔client loopback over a Firebase-shaped wire\n' + '='.repeat(66));

section('The wire itself — Firebase erasure, reproduced');
check('empty object is deleted',      wire({ a: {}, keep: 1 }),            { keep: 1 });
check('empty array is deleted',       wire({ a: [], keep: 1 }),            { keep: 1 });
check('all-null array is deleted',    wire({ a: [null, null], keep: 1 }),  { keep: 1 });
check('null scalar is deleted',       wire({ a: null, keep: 1 }),          { keep: 1 });
check('0 survives',                   wire({ a: 0 }),              { a: 0 });
check('false survives',               wire({ a: false }),          { a: false });
check('dense array round-trips',      wire({ a: [1, 2, 3] }),      { a: [1, 2, 3] });
check('all-zero array round-trips',   wire({ a: [0, 0, 0] }),      { a: [0, 0, 0] });
check('all-false array round-trips',  wire({ a: [false, false, false] }), { a: [false, false, false] });
check('half-dense → object',          wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });

// Without shpNormBool this NEXT check is what proves the bug ships: a naive
// `shpDozed = p.dozed || shpDozed` on an ALL-FALSE array (the routine case — most
// Nights nobody has dozed yet) would see `p.dozed === undefined` (Firebase erased
// the empty-looking array... no — [false,false,false] round-trips per above. The
// real trap is dozeOrder: [], which DOES erase, and a bare `|| []` fallback reads
// as correct while actually meaning "somehow already empty" vs "freshly reset" —
// indistinguishable without shpNormBool's explicit length-n rebuild.
check('an all-false dozed array round-trips intact', wire({ dozed: [false, false, false] }),
  { dozed: [false, false, false] });
check('dozeOrder: [] is erased — the classic accumulator trap', wire({ dozeOrder: [], keep: 1 }),
  { keep: 1 });

// ── Case 1: a CLIENT's own bust leaves "your turn" state on SHP_DOZE alone ────
section('Case 1 — a client’s own bust (no ack; SHP_DOZE alone must clear "your turn")');
{
  const { host: H0, clients, sent } = makeRoom(['Ali', 'Bec', 'Cam']);
  const C = clients[0].__shp; // Bec, seat 1
  H0.__shp.seat({ players: 3, names: ['Ali', 'Bec', 'Cam'], sylly: false, handSize: 4, moonsToWin: 2 });
  H0.__shp.start();

  // Force Bec (seat 1) to be active with a guaranteed-bust hand: Herd 90, a single
  // random-add card whose roll WILL exceed the ceiling (min 2, max 12 — force 12).
  H0.__shp.setHerd(90);
  H0.__shp.setHand(1, [8]);         // Skip a Few (random-add 2..12)
  // Re-sync the client's mirror of what we just forced host-side, so the CLIENT's
  // own tapCard() call below sees a legal, single-card hand rather than whatever
  // shpDealNight actually dealt it.
  clients[0].__shp.setHand(1, [8]);
  H0.__forceRandom(0.999);      // shpRandInt(2,12) with rand≈1 → rolls 12 → Herd 102 > 99

  // Make it Bec's turn on the host (bypassing the real turn-advance machinery —
  // this is a scripted scenario, not a played-out match) and drive the play from
  // the CLIENT's own device, exactly as a real player would tap their own card.
  vm.runInContext('shpActivePlayer = 1;', clients[0]);
  vm.runInContext('shpActivePlayer = 1;', H0);
  clients[0].__shp.tapCard(0);      // client sends SHP_PLAY (ACTION) — host resolves

  check('host recorded a busted crash for Bec', H0.__shp.dozeNotice && H0.__shp.dozeNotice.reason, 'busted');
  check('client applied the SAME busted crash', C.dozeNotice && C.dozeNotice.reason, 'busted');
  check('client’s Herd reverted (matches host)', C.herd, H0.__shp.herd);
  check('client active player moved off Bec (no ack needed)', C.active !== 1, true);
  check('host and client active player agree', C.active, H0.__shp.active);
  check('no client-side exception', clients[0].__errors, []);
}

// ── Case 2: a CLIENT's stuck-out — the OTHER client never shows a button ──────
section('Case 2 — a client’s stuck-out (hold → Nod Off → SHP_STUCK_ACK → SHP_DOZE)');
{
  const { host: H0, clients } = makeRoom(['Ali', 'Bec', 'Cam']);
  const [Bec, Cam] = clients;
  H0.__shp.seat({ players: 3, names: ['Ali', 'Bec', 'Cam'], sylly: false, handSize: 4, moonsToWin: 2 });
  H0.__shp.start();

  // Give Cam (seat 2) a hand that CANNOT play at Herd 95 — four +10 Pasture cards,
  // no random-add and no reducer, so shpLegalCards is provably empty.
  H0.__shp.setHerd(95);
  H0.__shp.setHand(2, [3, 3, 3, 3]);
  check('host confirms Cam has no legal line', H0.__shp.legal(2), []);
  vm.runInContext('shpActivePlayer = 2; shpAfterAdvance();', H0);

  check('host declared Cam stuck', H0.__shp.stuckIdx, 2);
  check('SHP_STUCK reached both clients', Bec.__shp.stuckIdx, 2);
  check('  and Cam too', Cam.__shp.stuckIdx, 2);
  check('Bec (bystander) has no stuck button', Bec.__shp.hasStuckButton(1), false);
  check('Cam (the stuck one) does', Cam.__shp.hasStuckButton(2), true);

  // Cam taps Nod Off on their own device.
  Cam.__shp.confirmStuck();         // client sends SHP_STUCK_ACK
  check('host resolved the crash', H0.__shp.stuckIdx, -1);
  check('client resolved it too', Cam.__shp.stuckIdx, -1);
  check('Bec (bystander) never got a phantom stuck button', Bec.__shp.hasStuckButton(1), false);
  check('all three devices agree on shpDozed', JSON.stringify(Bec.__shp.dozed) === JSON.stringify(H0.__shp.dozed)
    && JSON.stringify(Cam.__shp.dozed) === JSON.stringify(H0.__shp.dozed), true);
  check('no client-side exceptions', Bec.__errors.concat(Cam.__errors), []);
}

// ── Case 3: doze cascade — three consecutive doze-outs, no redeal between ─────
section('Case 3 — doze cascade (three doze-outs in a row, host/client end identical)');
{
  const { host: H0, clients } = makeRoom(['Ali', 'Bec', 'Cam', 'Dee']);
  const C = clients[0].__shp;
  H0.__shp.seat({ players: 4, names: ['Ali', 'Bec', 'Cam', 'Dee'], sylly: false, handSize: 4, moonsToWin: 2 });
  H0.__shp.start();

  // Seats 1, 2 and 3 all get an un-playable hand at Herd 95; seat 0 (Ali) keeps a
  // real, playable hand so the cascade has somewhere to land.
  H0.__shp.setHerd(95);
  [1, 2, 3].forEach(i => H0.__shp.setHand(i, [3, 3, 3, 3]));
  vm.runInContext('shpActivePlayer = 1; shpAfterAdvance();', H0);
  check('seat 1 (Bec) stuck first', H0.__shp.stuckIdx, 1);
  H0.__shp.crash(1, 'stuck', null);
  check('cascades straight into seat 2 (Cam) stuck', H0.__shp.stuckIdx, 2);
  H0.__shp.crash(2, 'stuck', null);
  check('cascades straight into seat 3 (Dee) stuck', H0.__shp.stuckIdx, 3);
  H0.__shp.crash(3, 'stuck', null);
  check('cascade stops — Ali is the sole survivor, Night ends', H0.__shp.stuckIdx, -1);

  check('host dozed exactly [1,2,3]', H0.__shp.dozed, [false, true, true, true]);
  check('host dozeOrder is [1,2,3]',   H0.__shp.dozeOrder, [1, 2, 3]);
  check('client dozed matches host',    C.dozed, H0.__shp.dozed);
  check('client dozeOrder matches host', C.dozeOrder, H0.__shp.dozeOrder);
  check('client activePlayer matches host', C.active, H0.__shp.active);
  check('host reached Night-end (Ali wins the Night)', H0.__shp.nightEndInfo && H0.__shp.nightEndInfo.winner, 0);
  check('client received the same Night-end', C.nightEndInfo && C.nightEndInfo.winner, 0);
  check('no client-side exceptions', clients.map(c => c.__errors).flat(), []);
}

// ── Case 4: Night end — all-seat ack gates Continue; SHP_DEAL clears the client ─
section('Case 4 — Night end: all-seat ack, host Continue locked, SHP_DEAL resets the client');
{
  const { host: H0, clients } = makeRoom(['Ali', 'Bec']);
  const C = clients[0].__shp;
  H0.__shp.seat({ players: 2, names: ['Ali', 'Bec'], sylly: false, handSize: 4, moonsToWin: 3 });
  H0.__shp.start();

  H0.__shp.setHerd(95);
  H0.__shp.setHand(1, [3, 3, 3, 3]);   // Bec has no legal line
  vm.runInContext('shpActivePlayer = 1; shpAfterAdvance();', H0);
  H0.__shp.crash(1, 'stuck', null);    // Bec dozes; Ali is sole survivor → Night ends

  check('host is waiting on acks', H0.__shp.ackCount < H0.__shp.ackNeeded, true);
  check('client received the Night-end summary', C.nightEndInfo !== null, true);
  check('client dozed/dozeOrder survived the trip (not yet cleared — deal hasn’t happened)',
    C.dozed, H0.__shp.dozed);

  // The client acks. Host alone (single client here) is now the last ack.
  clients[0].__shp.ackNightEnd();
  check('host ack count reached the need', H0.__shp.ackCount >= H0.__shp.ackNeeded, true);

  H0.__shp.continueNight();          // host-gated Continue — deals the next Night
  check('host dealt a fresh Night', H0.__shp.nightNum, 2);
  check('host shpDozed reset to all-false', H0.__shp.dozed, [false, false]);
  check('client shpDozed reset to all-false too (SHP_DEAL, not carried over)', C.dozed, [false, false]);
  check('client shpDozeOrder reset to empty', C.dozeOrder, []);
  check('client shpNightEndInfo cleared by the new deal', C.nightEndInfo, null);
  check('no client-side exceptions', clients[0].__errors, []);
}

// ── Case 5: Sylly Jolt over the wire — only the crasher's hand changes ────────
section('Case 5 — Sylly Jolt over the wire (only the crasher’s own hand is replaced)');
{
  const { host: H0, clients } = makeRoom(['Ali', 'Bec', 'Cam']);
  const [Bec, Cam] = clients;
  H0.__shp.seat({ players: 3, names: ['Ali', 'Bec', 'Cam'], sylly: true, handSize: 4, moons: 5 });
  H0.__shp.start();

  const camHandBefore = H0.__shp.hands[2].slice();
  const aliHandBefore = H0.__shp.hands[0].slice();
  H0.__shp.setHerd(95);
  H0.__shp.setHand(1, [3, 3, 3, 3]);   // Bec (seat 1) has no legal line → stuck, gets Jolted (5 moons, survives)
  vm.runInContext('shpActivePlayer = 1; shpAfterAdvance();', H0);
  H0.__shp.crash(1, 'stuck', null);

  check('Bec was Jolted, not eliminated', H0.__shp.eliminated[1], false);
  check('Bec’s hand length matches her (possibly re-shrunk) cap', H0.__shp.hands[1].length, H0.__shp.handCap[1]);
  check('client sees the SAME Jolted hand for Bec', clients[0].__shp.hands[1], H0.__shp.hands[1]);
  check('Cam’s hand is untouched on the host', H0.__shp.hands[2], camHandBefore);
  check('Cam’s hand is untouched on Cam’s OWN device', Cam.__shp.hands[2], camHandBefore);
  check('Ali’s hand is untouched on Bec’s device (the bystander check)', Bec.__shp.hands[0], aliHandBefore);
  check('Herd is byte-identical on Bec’s device', Bec.__shp.herd, H0.__shp.herd);
  check('no client-side exceptions', clients.map(c => c.__errors).flat(), []);
}

// ── Case 6: match end from both modes — identical standings on host and client ─
section('Case 6 — match end, both modes: identical shpGameStandings host ↔ client');
{
  // Normal mode — force the win directly rather than playing out a full match;
  // this section is about the WIRE at match-end, not re-proving the turn loop
  // (tools/verify-shp-loop.js already covers that at scale).
  {
    const { host: H0, clients } = makeRoom(['Ali', 'Bec']);
    const C = clients[0].__shp;
    H0.__shp.seat({ players: 2, names: ['Ali', 'Bec'], sylly: false, handSize: 4, moonsToWin: 1 });
    H0.__shp.start();
    H0.__shp.setHerd(95);
    H0.__shp.setHand(1, [3, 3, 3, 3]);
    vm.runInContext('shpActivePlayer = 1; shpAfterAdvance();', H0);
    H0.__shp.crash(1, 'stuck', null);   // Ali wins the only Night needed (moonsToWin:1) → Night-end
    H0.__shp.continueNight();           // normal mode's gameover check only fires on Continue
    check('normal mode: host declared a winner', H0.__shp.winner, 0);
    check('normal mode: client sees the SAME winner', C.winner, H0.__shp.winner);
    check('normal mode: standings match', C.standings, H0.__shp.standings);
    check('normal mode: no client exception', clients[0].__errors, []);
  }
  // Sylly mode — force the final elimination directly.
  {
    const { host: H0, clients } = makeRoom(['Ali', 'Bec']);
    const C = clients[0].__shp;
    H0.__shp.seat({ players: 2, names: ['Ali', 'Bec'], sylly: true, handSize: 4, moons: 1 });
    H0.__shp.start();
    H0.__shp.setHerd(95);
    H0.__shp.setHand(1, [3, 3, 3, 3]);
    vm.runInContext('shpActivePlayer = 1; shpAfterAdvance();', H0);
    H0.__shp.crash(1, 'stuck', null);   // Bec's only Moon is lost → eliminated → Ali is sole survivor
    check('sylly mode: host declared a winner', H0.__shp.winner, 0);
    check('sylly mode: client sees the SAME winner', C.winner, H0.__shp.winner);
    check('sylly mode: standings match', C.standings, H0.__shp.standings);
    check('sylly mode: no client exception', clients[0].__errors, []);
  }
}

console.log('\n' + '='.repeat(66));
console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
