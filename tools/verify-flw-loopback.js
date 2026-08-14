// ═══════════════════════════════════════════════════════════════════════════
// verify-flw-loopback.js — HOST ↔ CLIENT two-device loopback for Flawless,
// across a wire that behaves like Firebase Realtime Database.
//
//   node tools/verify-flw-loopback.js        (exits 1 on any failure)
//
// FLW had NO harness at all before this. Built on tools/verify-cjar-loopback.js,
// the only harness in the suite with the two properties that matter here:
//
//   - A REAL WIRE. fbWrite/fbRead reproduce Firebase RTDB's erasure behaviour —
//     no `null`, no `{}`, no `[]` survive a write. Piping mpSendEnvelope straight
//     into the other device's flwHandleEnvelope (as an early ad-hoc test would)
//     passes live JS references, so every empty collection survives a trip
//     Firebase would not have let it make.
//
//   - A RENDER-EXECUTING MOCK DOM. `getElementById: () => null` (what the three
//     'single'-mode harnesses in this suite use) short-circuits every
//     `if (!el) return` guard, so NO render code ever runs — a throw inside a
//     SYNC applier's render call is invisible to them. This harness's DOM mock
//     returns real elements with working classList/innerHTML, so a client-side
//     render throw (Task 1's exact bug shape — a card built with no carat) is
//     something this harness can actually see.
//
// FLW_SRC lets a deliberately-broken copy be driven through the same wire —
// see the render-seam section below for the assertion this is built to catch.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
const flwSrc = fs.readFileSync(process.env.FLW_SRC || path.join(ROOT, 'js/games/flw.js'), 'utf8');

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

// ── DOM mock with REAL elements — classList and innerHTML actually mutate ──
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
function makeDevice(name, mode, myIdx, uid, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  let seq = 0;

  const sandbox = {
    console,
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, syllyDeviceUid: uid, isSecretMode: false, activeExpansionOverrides: null },
    shuffle: a => a.slice(), // deals go through the harness's own testShuffle() override
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: Date.now() + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    playLaunch() {}, playExit() {}, playPillClick() {}, playDone() {}, playTick() {},
    playSyllyOn() {}, playSyllyOff() {}, playWhoosh() {}, playAlarm() {}, playSuccess() {},
    // Art is truthy here on purpose — the seam's placard-after-art-branch fix (Task 1)
    // only shows up when a face URL actually resolves. A null-asset stub would let a
    // broken copy that returns early in the art branch pass silently.
    assetFace: () => 'mock://gem-face.jpg', assetBack: () => 'mock://gem-back.jpg',
    artMakeZoomable: (el, src) => { if (el && src) el.className += ' art-zoomable'; return el; },
    openArtViewer() {}, closeArtViewer() {},
    // engine.js's shared Tap-Hold Reference helpers (flwBindCardHold/flwRenderGems
    // delegate to these) — no-ops here. This harness does not fire DOM events and
    // its mock querySelector always returns null, so there is nothing real for
    // refHighlightRow to do; the point is just that calling it never throws.
    bindCardHold() {}, refHighlightRow() {},
    mpLockSync() {}, mpUnlockSync() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __dissolved: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const BRIDGE = `
globalThis.__flw = {
  get hands()        { return flwHands; },
  get exposed()       { return flwExposed; },
  get ledger()       { return flwLedgerCounts; },
  get vaultCount()    { return flwPublicVaultCount; },
  get myHand()       { return flwMyHand; },
  get myDrawn()      { return flwMyDrawn; },
  get activePlayer()  { return flwActivePlayer; },
  get tokens()       { return flwTokens; },
  get lastResult()    { return flwLastResult; },
  get names()        { return flwPlayerNames; },
  get drawnCard()     { return flwDrawnCard; },
  get deck()         { return flwDeck; },
  get playerCount()   { return flwPlayerCount; },
  seat(o) { flwPlayerCount = o.players; flwPlayerNames = o.names; },
  startSession()             { flwStartSession(); },
  handle(env)                { flwHandleEnvelope(env); },
  submitPlay(g, t, gs)       { flwSubmitPlay(g, t, gs); },
  hostPlay(idx, g, t, gs)    { flwHostEntryPlay(idx, { gemId: g, targetIdx: t, guessId: gs }); },
  endShowing(reason)         { flwEndShowing(reason); },
  expose(idx)                { flwExpose(idx); },
  resetState()               { flwResetState(); },
  renderGems()                { flwRenderGems(); },
  gemRows()                   { return document.getElementById('flw-gems-body').children.length; },
  renderCard(gemId, opts)     { return flwRenderCard(gemId, opts || {}); },
  // Task 6 — [placard][card][card][placard] on your turn, [placard][card] off-turn.
  handRowShape() {
    const kids = document.getElementById('flw-hand-row').children;
    return kids.map(k => /(^| )flw-placard( |$)/.test(k.className || '') ? 'placard' : 'wrap');
  },
  get ledgerMode() { return flwLedgerMode; },
  setLedgerMode(v) { flwLedgerMode = v; },
  // Mirrors mpSerialiseSettings/SETTINGS_SYNC's 'flw' case (engine-multiplayer.js)
  // exactly — this harness loads only flw.js, so the real serialiser/deserialiser
  // pair isn't reachable through the wire; these two reproduce their contract.
  serialiseSettings() {
    return { flwLedgerMode, flwTokenMode, flwCustomTarget, flwTurnTimer, flwBurnSetting, flwSyllyMode };
  },
  applySettings(s) {
    if (s.flwLedgerMode   !== undefined) flwLedgerMode   = s.flwLedgerMode;
    if (s.flwTokenMode    !== undefined) flwTokenMode    = s.flwTokenMode;
    if (s.flwCustomTarget !== undefined) flwCustomTarget = s.flwCustomTarget;
    if (s.flwTurnTimer    !== undefined) flwTurnTimer    = s.flwTurnTimer;
    if (s.flwBurnSetting  !== undefined) flwBurnSetting  = s.flwBurnSetting;
    if (s.flwSyllyMode    !== undefined) flwSyllyMode    = s.flwSyllyMode;
  },
};`;

  vm.runInContext(flwSrc + BRIDGE, sandbox, { filename: `flw.js (${name})` });
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
// Wraps a block that calls real game code directly (not through the wire's own
// try/catch in mpSendEnvelope/mpSendPrivate) so a broken copy fails as a clean
// FAIL line instead of an uncaught exception that skips every check after it.
function safe(label, fn) {
  try { fn(); } catch (e) { failures++; console.log(`  FAIL  ${label}\n          threw: ${e.message}`); }
}

(() => {
  console.log('Flawless — host↔client loopback over a Firebase-shaped wire\n' + '='.repeat(62));

  section('The wire itself — Firebase erasure, reproduced');
  check('empty object is deleted',      wire({ a: {}, keep: 1 }),            { keep: 1 });
  check('empty array is deleted',       wire({ a: [], keep: 1 }),            { keep: 1 });
  check('all-null array is deleted',    wire({ a: [null, null], keep: 1 }),  { keep: 1 });
  check('null scalar is deleted',       wire({ a: null, keep: 1 }),          { keep: 1 });
  check('0 survives',                   wire({ a: 0 }),             { a: 0 });
  check('false survives',               wire({ a: false }),         { a: false });
  check('empty string survives',        wire({ a: '' }),            { a: '' });
  check('dense array round-trips',      wire({ a: [1, 2, 3] }),     { a: [1, 2, 3] });
  check('half-dense → object',          wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });

  // ── Render seam sanity (Task 1) ─────────────────────────────────────────
  // The old bug: the asset branch returned before the carat placard was ever
  // built, so any gem with resolved art rendered with NO carat at all. This is
  // the assertion the FLW_SRC verification step (see this task's plan entry)
  // is meant to prove fails against a copy that reintroduces the early return.
  section('Render seam — the carat placard survives both the art AND fallback branch');
  const probe = makeDevice('probe', 'single', 0, 'u0', []);
  const P = probe.__flw;
  const findCarat = el => (el.children || []).find(c => c.className === 'flw-carat');

  safe('art-branch card renders and carries a carat placard', () => {
    const artCard = P.renderCard(7, { size: 'md' });
    check('art-branch card carries .flw-card',      /(^| )flw-card( |$)/.test(artCard.className), true);
    check('art-branch card carries its size class', /(^| )flw-card-md( |$)/.test(artCard.className), true);
    const artCarat = findCarat(artCard);
    check('art-branch card HAS a carat placard', !!artCarat, true);
    check('  carat text is the gem id',           artCarat && artCarat.textContent, 7);
  });

  // Re-point the sandbox's own `assetFace` global to nothing — flw.js reads
  // `typeof assetFace === 'function' && assetFace(...)` fresh on every call.
  vm.runInContext('assetFace = null;', probe); // no asset resolves → fallback branch
  safe('fallback-branch card renders and carries a carat placard', () => {
    const fallbackCard = P.renderCard(3, { size: 'sm' });
    check('fallback-branch card also carries .flw-card-fallback', /(^| )flw-card-fallback( |$)/.test(fallbackCard.className), true);
    const fallbackCarat = findCarat(fallbackCard);
    check('fallback-branch card ALSO has a carat placard', !!fallbackCarat, true);
    check('  carat text is the gem id',                    fallbackCarat && fallbackCarat.textContent, 3);
  });

  safe('a back has no placard and states apply', () => {
    const backCard = P.renderCard(5, { faceDown: true, size: 'lg' });
    check('a back has no placard (no gem identity to show)', findCarat(backCard), undefined);
    check('selected → .flw-card-sel', /flw-card-sel/.test(P.renderCard(1, { selected: true }).className), true);
    check('dimmed → .flw-card-dim',   /flw-card-dim/.test(P.renderCard(1, { dimmed: true }).className), true);
  });

  section('The Gems gallery renders all ten rows without throwing');
  safe('flwRenderGems runs to completion', () => {
    P.renderGems();
    check('gallery rendered exactly 10 gem rows (+1 intro line)', P.gemRows(), 11);
  });

  // ── Stand up the two devices ────────────────────────────────────────────
  // 3 players: seat 0 = host (this device), seat 1 = client (this device, the
  // real wire), seat 2 = a bot seat driven host-side via hostPlay() directly —
  // the same shape verify-cjar-loopback.js uses for its non-client seats.
  const NAMES = ['Ali', 'Bec', 'Cam'];
  const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));

  const host   = makeDevice('host',   'host',   0, 'u0', SLOTS);
  const client = makeDevice('client', 'client', 1, 'u1', SLOTS);
  const H = host.__flw, C = client.__flw;

  // A deterministic deal: burn a Quartz, deal Obsidian/Jade/Diamond to seats 0/1/2,
  // then draw a second Jade for seat 0's opening turn — every one of those five gems
  // is untargeted, so the very first turn needs no target-selection logic at all.
  // The remaining sixteen cards are left in FLW_DECK's natural (post-take) order —
  // their identity is never asserted on, only their count.
  vm.runInContext(`
    shuffle = function (flat) {
      const pool = flat.slice();
      const take = v => { const i = pool.indexOf(v); pool.splice(i, 1); return v; };
      return [take(1), take(0), take(4), take(9), take(4)].concat(pool);
    };
  `, host);

  const sent = [];
  host.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    sent.push(onWire.payload.action);
    try { C.handle(onWire); } catch (e) { client.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host.mpSendPrivate = (uid, env) => {
    if (uid !== 'u1') return; // only our one real client listens
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C.handle(onWire); } catch (e) { client.__errors.push(`private ${onWire.payload.action}: ${e.message}`); }
  };
  client.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H.handle(onWire); } catch (e) { host.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  client.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };

  const lastScreen = dev => dev.__screens[dev.__screens.length - 1];

  // ── Deal a Showing ───────────────────────────────────────────────────────
  section('Deal a Showing — the client follows the host to the table');
  H.seat({ players: 3, names: NAMES });
  safe('flwStartSession runs to completion', () => H.startSession());
  check('FLW_SHOWING_START was sent',   sent.includes('FLW_SHOWING_START'), true);
  check('no client exception',          client.__errors, []);
  check('client is at the table',       lastScreen(client), 'screen-flw-table');
  check('client took the roster',       C.names, NAMES);
  check('vault count agrees',           C.vaultCount, H.vaultCount);
  check('exposed agrees',               C.exposed, H.exposed);
  check('ledger agrees',                C.ledger, H.ledger);
  check('active player agrees',         C.activePlayer, H.activePlayer);
  check('active player is seat 0',      H.activePlayer, 0);

  section("The client's private FLW_HAND arrives");
  check('client holds its own Showpiece, not anyone else\'s', C.myHand, H.hands[1]);
  check('client Showpiece is the dealt Jade',                  C.myHand, 4);
  check('host dealt itself Obsidian',                          H.hands[0], 0);
  check('host drew Jade for its own opening turn',              H.drawnCard, 4);
  check('off-turn hand row is [placard, card] (Task 6 shape)', C.handRowShape(), ['placard', 'wrap']);

  // ── A full turn resolves ────────────────────────────────────────────────
  section('A full turn resolves — no applier throws, render executes on both devices');
  safe('the play resolves without throwing', () => H.submitPlay(0, -1, null)); // seat 0 (host) plays Obsidian — untargeted, no effect branch
  check('FLW_RESOLVE was sent',    sent.includes('FLW_RESOLVE'), true);
  check('no client exception',     client.__errors, []);
  check('no host exception',       host.__errors, []);
  check('turn advanced to seat 1', H.activePlayer, 1);
  check('client followed the turn advance', C.activePlayer, 1);
  check('client is still at the table',      lastScreen(client), 'screen-flw-table');
  check('vault count still agrees',          C.vaultCount, H.vaultCount);
  check('ledger now shows one Obsidian discarded', C.ledger[0], 1);
  check('ledger agrees host/client',         C.ledger, H.ledger);
  check('FLW_TURN_START was sent',           sent.includes('FLW_TURN_START'), true);
  check('client received its private draw over the wire, not a guess', C.myDrawn, H.drawnCard);
  check('client Showpiece is unchanged (not its turn to place yet)', C.myHand, 4);
  check('on-turn hand row is [placard, card, card, placard] (Task 6 shape)',
        C.handRowShape(), ['placard', 'wrap', 'wrap', 'placard']);

  // ── FLW_SHOWING_END reaches the client and the result screen renders ────
  section('FLW_SHOWING_END (vaultlock) reaches the client and the result screen renders');
  safe('flwEndShowing runs to completion', () => H.endShowing('vaultlock'));
  check('FLW_SHOWING_END was sent',        sent.includes('FLW_SHOWING_END'), true);
  check('no client exception',             client.__errors, []);
  check('host shows the Showing result',   lastScreen(host), 'screen-flw-showing-result');
  check('client shows the Showing result', lastScreen(client), 'screen-flw-showing-result');
  check('vaultlock reveal.length === aliveCount (3)', H.lastResult.reveal.length, 3);
  check('client received the same reveal', C.lastResult.reveal.length, H.lastResult.reveal.length);
  check('tokens agree',                    C.tokens, H.tokens);
  const resultBody = client.document.getElementById('flw-showing-result-body');
  check('client actually rendered the reveal cards (not just stored the payload)',
        resultBody.children.length > 0, true);

  // ── Task 3 — laststanding also reveals, and it's exactly one entry ───────
  section('FLW_SHOWING_END (laststanding) reveals the lone survivor’s gem too');
  safe('expose the other two seats', () => { H.expose(1); H.expose(2); });
  safe('flwEndShowing(laststanding) runs to completion', () => H.endShowing('laststanding'));
  check('FLW_SHOWING_END was sent again',        sent.filter(a => a === 'FLW_SHOWING_END').length, 2);
  check('no client exception',                   client.__errors, []);
  check('laststanding reveal is exactly one entry — the survivor’s own gem', H.lastResult.reveal.length, 1);
  check('  and it is seat 0’s',                                              H.lastResult.reveal[0].idx, 0);
  check('client received the same single-entry reveal', C.lastResult.reveal, H.lastResult.reveal);
  check('a game-ending or Showing-result screen rendered on the client',
        ['screen-flw-showing-result', 'screen-flw-gameover'].includes(lastScreen(client)), true);
  // Whichever screen it landed on, its OWN body got the reveal cards — this is
  // the bug Task 3 actually fixes: flwShowGameover used to render nothing but
  // the medal table, so a match-ending laststanding Showing never showed the
  // final gem at all.
  const finalBodyId = lastScreen(client) === 'screen-flw-gameover' ? 'flw-gameover-body' : 'flw-showing-result-body';
  const finalBody = client.document.getElementById(finalBodyId);
  check('client rendered the final reveal card on whichever screen it landed on',
        finalBody.children.length > 0, true);

  // ── Task 7 — flwLedgerMode settings sync, all three values ──────────────
  section('SETTINGS_SYNC carries flwLedgerMode — all three values, not just one');
  ['tally', 'discards', 'off'].forEach(mode => {
    H.setLedgerMode(mode);
    const onWire = wire({ type: 'LOBBY', payload: { action: 'SETTINGS_SYNC', gameSettings: H.serialiseSettings() },
                           originId: 'u0', timestamp: Date.now() });
    C.applySettings(onWire.payload.gameSettings);
    check(`client's flwLedgerMode becomes '${mode}'`, C.ledgerMode, mode);
  });

  console.log('\n' + '='.repeat(62));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
