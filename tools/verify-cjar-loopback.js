// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-loopback.js — HOST ↔ CLIENT two-device loopback for Cookie Jar,
// across a wire that behaves like Firebase Realtime Database.
//
//   node tools/verify-cjar-loopback.js        (exits 1 on any failure)
//
// The fifth tool impl-notes ML-01 asked for, plus the one thing the ad-hoc Task-15
// loopback did NOT have: a WIRE. That loopback piped the host's mpSendEnvelope
// straight into the client's cjarHandleEnvelope, so payloads travelled as live JS
// references and every empty collection survived the trip. Firebase does not work
// that way.
//
//   Firebase RTDB stores no `null`, no `{}` and no `[]`. A key whose value is any
//   of those is DELETED, and the SDK hands the reader back `undefined`. An array
//   whose entries are all null vanishes entirely; a sparse one comes back as an
//   OBJECT with numeric keys, not an array.
//
// cjar broadcasts reset values explicitly on purpose (FLW BUG-01), which is exactly
// what walks it into this: `seen: {}`, `trail: []`, `choices: [null,null,null,null]`
// and `counterTreat: null` are all reset values, and all four are erased in flight.
// fbWrite/fbRead below reproduce that faithfully, so a payload field that cannot
// survive a real room fails here instead of at the table.
//
// The other half of the point: the DOM is MOCKED WITH REAL ELEMENTS, not with
// `getElementById: () => null` like the other three harnesses. Those short-circuit
// every `if (!el) return` guard and so never execute a single line of render code —
// which is why a client-side render throw is invisible to all 222 of their checks.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/cjar-data.json'), 'utf8');
// CJAR_SRC lets a deliberately-broken copy be driven through the same wire, which
// is how the BUG-06 fix was proven to fail before it was proven to pass.
const cjarSrc  = fs.readFileSync(process.env.CJAR_SRC || path.join(ROOT, 'js/games/cjar.js'), 'utf8');

// ── The wire ───────────────────────────────────────────────────────────────────
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

// ── DOM mock with REAL elements ───────────────────────────────────────────────
function makeDocument() {
  const byId = {};
  const mk = tag => ({
    tagName: tag, children: [], style: {}, dataset: {}, title: '',
    scrollLeft: 0, scrollWidth: 0, disabled: false,
    className: '', textContent: '',
    // innerHTML MUST be a real setter: `el.innerHTML = ''` is how every cjar renderer
    // clears before repainting, and a plain property would let children accumulate
    // across renders — which silently turns "4 standings rows" into 12 and makes every
    // count assertion in this file meaningless.
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener() {}, removeEventListener() {},
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

// ── One device ────────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  let seq = 0;

  const sandbox = {
    console,
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, isSecretMode: false, activeExpansionOverrides: null },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
    // The real Fisher–Yates from engine.js:470 — the identity stub the other three
    // harnesses use would deal a family-first deck that busts on flip 2 every time.
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: Date.now() + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
    playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
    playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
    playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
    assetFace: () => null, assetBack: () => null,
    mpLockSync() {}, mpUnlockSync() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __dissolved: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const BRIDGE = `
globalThis.__cjar = {
  get data()       { return CJAR_DATA; },
  get stashes()    { return cjarStashes; },
  get totals()     { return cjarRaidTotals; },
  get active()     { return cjarActive; },
  get seen()       { return cjarSeen; },
  get trail()      { return cjarTrail; },
  get choices()    { return cjarChoices; },
  get ready()      { return cjarReadyCheck; },
  get crumbs()     { return cjarCrumbs; },
  get debt()       { return cjarCrumbDebt; },
  get treat()      { return cjarCounterTreat; },
  get treatsWon()  { return cjarTreatsWon; },
  get copies()     { return cjarFamilyCopies; },
  get highAlert()  { return cjarHighAlertId; },
  get card()       { return cjarCard; },
  get flipSeq()    { return cjarFlipSeq; },
  get phase()      { return cjarTablePhase; },
  get raidNo()     { return cjarRaidNo; },
  get names()      { return cjarPlayerNames; },
  get count()      { return cjarPlayerCount; },
  get sylly()      { return cjarSyllyMode; },
  get favourite()  { return cjarMyFavourite; },
  get history()    { return cjarRaidHistory; },
  get deck()       { return cjarDeck; },
  get decisionTime() { return cjarDecisionTime; },
  get windowMs()     { return cjarWindowMs; },
  get endTs()        { return cjarEndTimestamp; },
  seat(o) {
    cjarPlayerCount   = o.players;
    cjarPlayerNames   = o.names;
    cjarSyllyMode     = !!o.sylly;
    cjarSnackFriendly = o.snack || 'off';
    cjarHouseRules    = o.house || 'burn';
    cjarMatchLength   = o.length || 3;
    cjarOpenBook      = o.openBook !== false;
    cjarDecisionTime  = o.time || 'standard';
  },
  openCards()        { cjarOpenCards(); },
  // Counts REAL card thumbs only — the empty-state placeholder (round 2) shares the
  // strip but carries no 'cjar-card' token (only 'cjar-card-thumb cjar-placeholder-dashed'),
  // same distinction galleryTiles() below already draws.
  stageThumbs() {
    const isCard = c => /(^| )cjar-card( |$)/.test(c || '');
    return document.getElementById('cjar-trail-strip').children.filter(c => isCard(c.className)).length;
  },
  stagePlaceholder() {
    const kids = document.getElementById('cjar-trail-strip').children;
    return kids.length === 1 && /cjar-placeholder-dashed/.test(kids[0].className || '');
  },
  standingsRows()    { return document.getElementById('cjar-reveal-rows').children.length; },
  flipAnim()     { return cjarFlipAnim; },
  animMs()       { return CJAR_FLIP_ANIM_MS; },
  controlsIdle() { return /cjar-controls-idle/.test(document.getElementById('cjar-controls').className); },
  heroFaceDown() {
    const kids = document.getElementById('cjar-table-hero').children;
    return kids.length === 1 && /cjar-card-back/.test(kids[0].className || '');
  },
  stageLabel() { return document.getElementById('cjar-stage-label-now').textContent; },
  controlLabels() {
    return document.getElementById('cjar-controls').children
      .filter(c => c.tagName === 'button').map(c => c.textContent);
  },
  grabsCaption() { return document.getElementById('cjar-grabs-caption').textContent; },
  crumbsValue()  { return document.getElementById('cjar-crumbs-value').textContent; },
  pillTexts(i) {
    const row = document.getElementById('cjar-reveal-rows').children[i];
    if (!row) return null;
    const out = [];
    const walk = el => {
      if (/cjar-pill-/.test(el.className || '')) out.push(el.textContent);
      (el.children || []).forEach(walk);
    };
    (row.children || []).forEach(walk);
    return out;
  },
  deckBacks() {
    let n = 0;
    const walk = el => { if (/cjar-card-back/.test(el.className || '')) n++;
                         (el.children || []).forEach(walk); };
    (document.getElementById('cjar-deck-badge').children || []).forEach(walk);
    return n;
  },
  timerHidden()      { return document.getElementById('cjar-timer-bar').style.display === 'none'; },
  // Counts CARDS, not card parts: .cjar-card-value / -emoji / -name are children of a
  // card and also match a naive 'cjar-card' substring test.
  galleryTiles()     {
    let n = 0;
    const isCard = c => /(^| )cjar-card( |$)/.test(c) || /(^| )cjar-card-back( |$)/.test(c);
    const walk = el => { if (isCard(el.className || '')) n++;
                         (el.children || []).forEach(walk); };
    walk(document.getElementById('cjar-cards-body'));
    return n;
  },
  // Reads which how-to body is showing, so the tab switch is asserted rather than
  // assumed. 'rules' and 'cards' are siblings; exactly one is ever display:flex.
  howToTab() {
    const rules = document.getElementById('cjar-how-to-body').style.display;
    const cards = document.getElementById('cjar-how-to-cards').style.display;
    return cards === 'flex' && rules === 'none' ? 'cards'
         : rules === 'flex' && cards === 'none' ? 'rules' : 'broken';
  },
  openHowTo(tab)        { cjarOpenHowTo(tab); },
  startMatch()          { cjarStartMatch(); },
  standby()             { cjarShowClientStandby(); },
  submit(c)             { cjarSubmitChoice(c); },
  applyChoice(i, c)     { return cjarApplyChoice(i, c, cjarFlipSeq); },
  allIn()               { return cjarAllIn(); },
  resolve()             { cjarHostResolveFlip(); },
  handle(env)           { cjarHandleEnvelope(env); },
  renderTable()         { cjarRenderTable(); },
};`;

  vm.runInContext(cjarSrc + BRIDGE, sandbox, { filename: `cjar.js (${name})` });
  return sandbox;
}

// ── Assertions ────────────────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  console.log('Cookie Jar — host↔client loopback over a Firebase-shaped wire\n' + '='.repeat(62));

  section('The wire itself — Firebase erasure, reproduced');
  // `keep` is a sibling that always survives, so these assert the FIELD is erased
  // rather than the whole envelope collapsing.
  check('empty object is deleted',      wire({ a: {}, keep: 1 }),            { keep: 1 });
  check('empty array is deleted',       wire({ a: [], keep: 1 }),            { keep: 1 });
  check('all-null array is deleted',    wire({ a: [null, null], keep: 1 }),  { keep: 1 });
  check('null scalar is deleted',       wire({ a: null, keep: 1 }),          { keep: 1 });
  check('0 survives',                   wire({ a: 0 }),             { a: 0 });
  check('false survives',               wire({ a: false }),         { a: false });
  check('empty string survives',        wire({ a: '' }),            { a: '' });
  check('dense array round-trips',      wire({ a: [1, 2, 3] }),     { a: [1, 2, 3] });
  check('all-zero array round-trips',   wire({ a: [0, 0, 0, 0] }),  { a: [0, 0, 0, 0] });
  check('all-false array round-trips',  wire({ a: [false, false] }), { a: [false, false] });
  // Half-dense is NOT dense enough — the SDK leaves it an object keyed by index,
  // which is why cjarWireArr must read `v[i]` rather than assume an array.
  check('half-dense → object',          wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });
  check('mostly-dense → array + holes', wire({ a: ['w', 'x', null, 'y'] }),  { a: ['w', 'x', null, 'y'] });
  check('very sparse → object',         wire({ a: [null, null, null, null, null, null, 'z'] }), { a: { 6: 'z' } });

  // ── Stand up the two devices ───────────────────────────────────────────────
  const NAMES = ['Ali', 'Bec', 'Cam', 'Dee'];
  const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));

  const host   = makeDevice('host',   'host',   0, SLOTS);
  const client = makeDevice('client', 'client', 1, SLOTS);
  await host.cjarLoadData();
  await client.cjarLoadData();

  const H = host.__cjar, C = client.__cjar;

  // Host → wire → client. Every send is recorded so ordering can be asserted.
  const sent = [];
  host.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    sent.push(onWire.payload.action);
    try { C.handle(onWire); }
    catch (e) { client.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host.mpSendPrivate = (uid, env) => {
    if (uid !== 'u1') return;                       // only our one client listens
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C.handle(onWire); }
    catch (e) { client.__errors.push(`private ${onWire.payload.action}: ${e.message}`); }
  };
  // Client → wire → host.
  client.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H.handle(onWire); }
    catch (e) { host.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  client.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };

  // Fire exactly ONE pending timer — the earliest. Draining them all would also
  // fire cjarOpenDecisionWindow's auto-resolve timeout, which plays the whole Raid
  // on the fallback choice and never exercises a real submission.
  const step = dev => {
    if (!dev.__timers.length) return false;
    dev.__timers.sort((a, b) => a.at - b.at);
    const t = dev.__timers.shift();
    try { t.fn(); } catch (e) { dev.__errors.push(`timer: ${e.message}`); }
    return true;
  };
  const lastScreen = dev => dev.__screens[dev.__screens.length - 1];

  // One turn of the real loop: if the table is open and waiting on choices, make
  // them; otherwise let the next interstitial / reveal dwell elapse.
  const turn = (dev, bridge, pick) => {
    if (lastScreen(dev) === 'screen-cjar-table' && bridge.phase === 'deciding') {
      for (let i = 0; i < 4; i++) if (!bridge.ready[i]) bridge.applyChoice(i, pick(i));
      if (bridge.allIn()) bridge.resolve();
      return true;
    }
    if (lastScreen(dev) === 'screen-cjar-raid-summary') { hostNextRaid(dev); return true; }
    return step(dev);
  };

  // ── Base game ──────────────────────────────────────────────────────────────
  section('Base game — the client follows the host off the Raid intro');
  H.seat({ players: 4, names: NAMES, snack: 'warmup', length: 3 });
  C.standby();
  check('client parks on the Raid intro', lastScreen(client), 'screen-cjar-raid-intro');

  H.startMatch();
  check('MATCH_START then RAID_START', sent.slice(0, 2), ['CJAR_MATCH_START', 'CJAR_RAID_START']);
  check('client took the roster',      C.names, NAMES);
  check('client shows the Raid intro', lastScreen(client), 'screen-cjar-raid-intro');
  check('client raid number',          C.raidNo, 1);

  // Reset values that Firebase erases — these must arrive usable, not undefined.
  section('The reset values survive the wire (or are rebuilt on arrival)');
  check('cjarSeen is an object',   typeof C.seen === 'object' && C.seen !== null, true);
  check('cjarTrail is an array',   Array.isArray(C.trail), true);
  check('cjarChoices is an array', Array.isArray(C.choices), true);
  check('  and is seat-length',    (C.choices || []).length, 4);
  check('cjarReadyCheck is array', Array.isArray(C.ready), true);
  check('  and is seat-length',    (C.ready || []).length, 4);
  check('cjarActive is an array',  Array.isArray(C.active), true);
  check('crumbDebt is an array',   Array.isArray(C.debt), true);
  check('counterTreat is null',    C.treat, null);
  check('no client exception yet', client.__errors, []);

  section('First flip — the client must reach the table');
  step(host);                                     // interstitial dwell → cjarHostNextFlip
  check('host opened the table',   lastScreen(host), 'screen-cjar-table');
  check('FLIP_START was sent',     sent.includes('CJAR_FLIP_START'), true);
  check('client applied it clean', client.__errors, []);
  check('CLIENT REACHED THE TABLE', lastScreen(client), 'screen-cjar-table');
  check('client can decide',       C.phase, 'deciding');
  check('base-game button labels', C.controlLabels(), ['Reach In Again', 'Sneak Out']);
  check('grabs caption, base game', C.grabsCaption(), 'Sneak out alone and you take the lot.');
  check('crumbs render as a count',  /^\d+$/.test(C.crumbsValue()), true);
  check('deck renders as a stack, not one card', C.deckBacks(), 3);
  check('base row shows both pills', (C.pillTexts(0) || []).length, 2);
  check('  stashed pill wording',    /stashed$/.test((C.pillTexts(0) || [])[0] || ''), true);
  check('  at-risk pill wording',    /at risk$/.test((C.pillTexts(0) || [])[1] || ''), true);
  check('client sees the card',    C.card && C.card.type, host.__cjar.card.type);
  check('client deck count',       (C.deck || []).length, H.deck.length);

  section('The reveal window owns the stage before the clock starts');
  check('host is animating',            H.flipAnim(), true);
  check('client is animating too',      C.flipAnim(), true);
  check('client controls are inert',    C.controlsIdle(), true);
  check('a tap during the animation is dropped', (() => {
    const before = H.ready.slice();
    C.submit('take');
    return JSON.stringify(H.ready) === JSON.stringify(before);
  })(), true);
  // `endTs` is a bridge GETTER (not a method — see the existing `H4.endTs` usage
  // below), so it is read as a property here, not called.
  check('deadline includes the animation',
        H.endTs - Date.now() > H.animMs(), true);
  check('card is face-up while animating', C.heroFaceDown(), false);
  check('label reads just revealed',       C.stageLabel(), 'just revealed');

  // Let the reveal choreography hand over on BOTH devices before any real submission —
  // cjarSubmitChoice is now guarded by cjarFlipAnim (Step 6), and each device runs its
  // own independent animation timer.
  step(host);
  step(client);
  check('card is face-down while deciding', C.heroFaceDown(), true);
  check('label reads next out of the jar',  C.stageLabel(), 'next out of the jar');

  section('A choice travels client → host and back');
  C.submit('take');
  check('host recorded seat 1',    H.ready[1], true);
  check('client is waiting',       C.phase, 'waiting');
  H.applyChoice(2, 'take');
  H.applyChoice(3, 'sneak');
  check('not all in yet',          H.allIn(), false);
  host.__cjar.submit('take');                     // the host's own seat, applied directly
  check('all four in',             H.ready.every(Boolean), true);
  check('RESOLVE was broadcast',   sent.includes('CJAR_FLIP_RESOLVE'), true);
  check('client applied resolve',  client.__errors, []);
  check('client is revealing',     C.phase, 'revealing');
  check('stashes agree',           C.stashes, H.stashes);
  check('raid totals agree',       C.totals, H.totals);
  check('active seats agree',      C.active, H.active);
  check('trail agrees',            (C.trail || []).length, H.trail.length);

  section('Drive the Raid to its end — every packet, every render');
  let guard = 0;
  while (lastScreen(host) !== 'screen-cjar-raid-summary'
      && lastScreen(host) !== 'screen-cjar-gameover' && guard++ < 120) {
    // Seat 1 is the real client device and submits over the wire; the other three
    // are driven host-side, the way the ML-01 loopback did it.
    if (lastScreen(host) === 'screen-cjar-table' && C.phase === 'deciding') C.submit('take');
    if (!turn(host, H, () => 'take')) break;
  }
  check('host finished the Raid',  ['screen-cjar-raid-summary', 'screen-cjar-gameover'].includes(lastScreen(host)), true);
  check('client followed it',      lastScreen(client), lastScreen(host));
  check('no client exceptions',    client.__errors, []);
  check('no host exceptions',      host.__errors, []);
  check('stashes still agree',     C.stashes, H.stashes);
  check('raid history agrees',     C.history, H.history);
  check('family copies agree',     C.copies, H.copies);
  check('high alert agrees',       C.highAlert, H.highAlert);

  // ── Dibber Dobber ──────────────────────────────────────────────────────────
  section('Dibber Dobber — blind commit across the wire (Delta 7)');
  const host2   = makeDevice('host2',   'host',   0, SLOTS);
  const client2 = makeDevice('client2', 'client', 1, SLOTS);
  await host2.cjarLoadData();
  await client2.cjarLoadData();
  const H2 = host2.__cjar, C2 = client2.__cjar;
  const sent2 = [];
  host2.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    sent2.push(onWire.payload.action);
    try { C2.handle(onWire); } catch (e) { client2.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host2.mpSendPrivate = (uid, env) => {
    if (uid !== 'u1') return;
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C2.handle(onWire); } catch (e) { client2.__errors.push(`private: ${e.message}`); }
  };
  client2.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H2.handle(onWire); } catch (e) { host2.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };

  H2.seat({ players: 4, names: NAMES, sylly: true, length: 3 });
  C2.standby();
  H2.startMatch();
  // Flip 1's card is guaranteed a cookie (never Caught!) even though the commit is
  // still fully blind — this is the ONLY harness with a real shuffle, so it's the one
  // place that can prove cjarFloatCookies(deck, 1) actually landed a cookie at index 0
  // rather than the identity-shuffle stub the other three harnesses use, which would
  // never surface a family-first deck as a false pass.
  check('flip 1 is never Caught! (blind, but not punishing)', H2.deck[0].type, 'cookie');
  check('client knows it is Sylly',   C2.sylly, true);
  check('affinity arrived privately', typeof C2.favourite === 'string', true);
  check('DD seeds 5 each',            C2.stashes, [5, 5, 5, 5]);
  check('no client exception',        client2.__errors, []);

  step(host2);
  check('CLIENT REACHED THE TABLE', lastScreen(client2), 'screen-cjar-table');
  check('window is blind',          C2.card, null);
  check('client can decide',        C2.phase, 'deciding');
  // Sylly reveals AFTER choices lock, so its blind window has nothing to animate and
  // must NOT pay CJAR_FLIP_ANIM_MS on top of windowMs the way the base game's does —
  // the inverse of "deadline includes the animation" above (spec §6, Finding 2).
  check('Sylly deadline does NOT pay the animation twice',
        H2.endTs - Date.now() <= H2.windowMs, true);
  check('Sylly is not animating at window-open', C2.flipAnim(), false);
  check('Sylly row shows one pill only', (C2.pillTexts(0) || []).length, 1);
  check('Sylly button labels',      C2.controlLabels(), ['Reach In', 'Play Innocent', 'Dob']);
  check('grabs caption, Sylly', C2.grabsCaption(), 'Play innocent alone and the pile is yours.');

  C2.submit('innocent');
  check('one seat in, not all',     H2.allIn(), false);
  for (let i = 0; i < 4; i++) if (!H2.ready[i]) H2.applyChoice(i, 'take');
  check('all four in',              H2.ready.every(Boolean), true);
  if (H2.allIn()) H2.resolve();
  check('exactly one RESOLVE',      sent2.filter(a => a === 'CJAR_FLIP_RESOLVE').length, 1);
  check('client learned the card',  C2.card !== null && C2.card !== undefined, true);
  check('  and it matches the host', C2.card, H2.card);
  check('stashes agree',            C2.stashes, H2.stashes);
  check('debt agrees',              C2.debt, H2.debt);
  check('no client exception',      client2.__errors, []);

  section('Drive a full Dibber Dobber match');
  guard = 0;
  while (lastScreen(host2) !== 'screen-cjar-gameover' && guard++ < 400) {
    if (lastScreen(host2) === 'screen-cjar-table' && C2.phase === 'deciding') C2.submit('innocent');
    if (!turn(host2, H2, i => ['take', 'innocent', 'dob'][i % 3])) break;
  }
  check('host reached the end',   lastScreen(host2), 'screen-cjar-gameover');
  check('client reached the end', lastScreen(client2), 'screen-cjar-gameover');
  check('no client exceptions',   client2.__errors, []);
  check('no host exceptions',     host2.__errors, []);
  check('final stashes agree',    C2.stashes, H2.stashes);
  check('history agrees',         C2.history, H2.history);

  // ── Decision Time + the rebuilt stage ──────────────────────────────────────
  section('No Rush — the window has no deadline and no auto-resolve');
  const host4   = makeDevice('host4',   'host',   0, SLOTS);
  const client4 = makeDevice('client4', 'client', 1, SLOTS);
  await host4.cjarLoadData();
  await client4.cjarLoadData();
  const H4 = host4.__cjar, C4 = client4.__cjar;
  host4.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C4.handle(onWire); } catch (e) { client4.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host4.mpSendPrivate = () => {};
  client4.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H4.handle(onWire); } catch (e) { host4.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };

  H4.seat({ players: 4, names: NAMES, snack: 'warmup', length: 3, time: 'norush' });
  C4.standby();
  H4.startMatch();
  check('setting crossed the wire', C4.decisionTime, 'norush');
  step(host4);                                    // interstitial → first flip
  check('client is at the table',   lastScreen(client4), 'screen-cjar-table');
  check('host set NO deadline',     H4.endTs, 0);
  check('no window length',         H4.windowMs, null);
  // Both devices' reveal choreography must hand over before checking the SETTLED
  // state — cjarStartTimer (the thing that hides the bar) is now inside the
  // deferred half of cjarBeginFlipAnim, not the FLIP_START applier itself.
  step(host4);
  step(client4);
  check('client hid the timer bar', C4.timerHidden(), true);
  // The auto-resolve timer is the ONLY thing that should be absent. If it were still
  // armed, No Rush would silently resolve on the fallback choice after 20 s. The
  // reveal-choreography timer has already been consumed by the step() above.
  check('no auto-resolve is armed', host4.__timers.length, 0);
  check('and nothing resolved',     H4.ready.every(Boolean), false);
  C4.submit('take');
  for (let i = 0; i < 4; i++) if (!H4.ready[i]) H4.applyChoice(i, 'take');
  check('everyone in resolves it',  H4.allIn(), true);
  H4.resolve();
  check('client applied it',        client4.__errors, []);
  check('stashes agree',            C4.stashes, H4.stashes);

  section('Blitz carries its own length, and a client scales against the HOST clock');
  const host5 = makeDevice('host5', 'host', 0, SLOTS);
  const client5 = makeDevice('client5', 'client', 1, SLOTS);
  await host5.cjarLoadData(); await client5.cjarLoadData();
  const H5 = host5.__cjar, C5 = client5.__cjar;
  host5.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C5.handle(onWire); } catch (e) { client5.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host5.mpSendPrivate = () => {};
  client5.mpSendEnvelope = () => {};
  H5.seat({ players: 4, names: NAMES, snack: 'warmup', length: 3, time: 'blitz' });
  C5.seat({ players: 4, names: NAMES, snack: 'warmup', length: 3, time: 'norush' });  // wrong on purpose
  C5.standby();
  H5.startMatch();
  check('MATCH_START corrects it',  C5.decisionTime, 'blitz');
  step(host5);
  check('host window is 10 s',      H5.windowMs, 10000);
  check('client took the host\'s',  C5.windowMs, 10000);
  check('client shows the bar',     C5.timerHidden(), false);
  check('auto-resolve IS armed',    host5.__timers.length > 0, true);

  section('The stage row draws each card exactly ONCE');
  // The whole point of the rebuild: the newest card is the stage card, and the trail
  // holds only what has moved on. Drawing it in both places is what made the biggest
  // element look like the card under decision.
  check('one card out, trail empty', C5.stageThumbs(), 0);
  check('  empty trail shows a placeholder, not dead space', C5.stagePlaceholder(), true);
  check('  but a card IS on stage',  C5.card !== null, true);
  for (let i = 0; i < 4; i++) if (!H5.ready[i]) H5.applyChoice(i, 'take');
  H5.resolve();
  step(host5);                                    // reveal dwell → second flip
  check('two out, one thumb',        C5.stageThumbs(), 1);
  check('standings render always',   C5.standingsRows(), 4);

  section('A spectator device is still animating when RESOLVE lands (Finding 1)');
  // client5's own local flip-2 animation (started when FLIP_START above landed) was
  // never stepped, so it is genuinely still running — exactly the "client whose packet
  // arrived late can still be animating when RESOLVE arrives" scenario. Seat 1 sneaks
  // out on this very flip (a spectator from the next flip on), but the bug under test
  // does not depend on that: it is about cjarCancelFlipAnim running UNCONDITIONALLY at
  // the top of the resolve path, not only inside the Sylly branch.
  check('client5 is still animating, unstepped', C5.flipAnim(), true);
  // client5 also carries its OWN never-fired raid-intro interstitial handle (a
  // pre-existing, unrelated timer — cjarShowRaidIntro schedules one on every device,
  // including a client whose onDone is a no-op) — so the assertion below is a DELTA,
  // not an absolute count, to isolate the anim handle from that unrelated one.
  const client5TimersBeforeResolve = client5.__timers.length;
  for (let i = 0; i < 4; i++) if (!H5.ready[i]) H5.applyChoice(i, i === 1 ? 'sneak' : 'take');
  check('all four in', H5.allIn(), true);
  H5.resolve();
  check('client applied resolve clean', client5.__errors, []);
  check('the stale animation was cancelled, not left running', C5.flipAnim(), false);
  // The decisive check: a base-game resolve schedules NO new timer of its own, so the
  // ONLY change to client5's timer queue should be the stale anim handle disappearing.
  // Pre-fix it would have survived (delta 0) and later fired mid-'revealing', painting
  // the bar against the just-closed deadline.
  check('no lingering timer to later paint a stale bar',
        client5.__timers.length, client5TimersBeforeResolve - 1);

  section('The card gallery is a How to Play TAB, and builds with no match running');
  const solo = makeDevice('solo', 'single', 0, SLOTS);
  await solo.cjarLoadData();
  solo.__cjar.seat({ players: 4, names: NAMES });
  // Drive the REAL entry point, not the builder underneath it — the gallery moved from
  // its own overlay into a tab, and the tab switch is the part that can now break.
  solo.__cjar.openHowTo('rules');
  check('opens on the rules tab',     solo.__cjar.howToTab(), 'rules');
  solo.__cjar.openHowTo('cards');
  check('menu route lands on cards',  solo.__cjar.howToTab(), 'cards');
  // 3 cookie tiers + 5 family + 5 treats + 1 back = 14, which is exactly the number of
  // art files shipped. If a manifest key is ever added without a gallery tile, this
  // number stops matching and the offline check stops being trustworthy.
  check('14 tiles, one per art file', solo.__cjar.galleryTiles(), 14);
  check('gallery threw nothing',      solo.__errors, []);

  // ── The new floor ──────────────────────────────────────────────────────────
  // getMinPlayers dropped 4 → 3 (owner call, 3 Aug 2026). Nothing in the deck, the
  // bust odds or the affinity draw is player-count dependent, but the SEAT-LENGTH
  // rebuild in every applier is — cjarWireArr is handed cjarPlayerCount, so a wrong
  // count would silently truncate or pad every array on the client.
  section('Three players — the new lobby minimum, end to end');
  const NAMES3 = ['Ali', 'Bec', 'Cam'];
  const SLOTS3 = NAMES3.map((n, i) => ({ uid: 'u' + i, nickname: n }));
  const host3   = makeDevice('host3',   'host',   0, SLOTS3);
  const client3 = makeDevice('client3', 'client', 1, SLOTS3);
  await host3.cjarLoadData();
  await client3.cjarLoadData();
  const H3 = host3.__cjar, C3 = client3.__cjar;
  host3.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C3.handle(onWire); } catch (e) { client3.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host3.mpSendPrivate = () => {};
  client3.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H3.handle(onWire); } catch (e) { host3.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };

  H3.seat({ players: 3, names: NAMES3, snack: 'warmup', length: 3 });
  C3.standby();
  H3.startMatch();
  check('client seat count is 3',  C3.count, 3);
  check('arrays are 3 long',       [C3.stashes.length, C3.choices.length, C3.ready.length], [3, 3, 3]);
  step(host3);
  check('client reached the table', lastScreen(client3), 'screen-cjar-table');

  guard = 0;
  while (lastScreen(host3) !== 'screen-cjar-gameover' && guard++ < 400) {
    if (lastScreen(host3) === 'screen-cjar-table' && C3.phase === 'deciding') C3.submit('take');
    if (lastScreen(host3) === 'screen-cjar-table' && H3.phase === 'deciding') {
      for (let i = 0; i < 3; i++) if (!H3.ready[i]) H3.applyChoice(i, i === 2 ? 'sneak' : 'take');
      if (H3.allIn()) H3.resolve();
      continue;
    }
    if (lastScreen(host3) === 'screen-cjar-raid-summary') { hostNextRaid(host3); continue; }
    if (!step(host3)) break;
  }
  check('3-player match finished',  lastScreen(host3), 'screen-cjar-gameover');
  check('client followed it',       lastScreen(client3), 'screen-cjar-gameover');
  check('no client exceptions',     client3.__errors, []);
  check('no host exceptions',       host3.__errors, []);
  check('final stashes agree',      C3.stashes, H3.stashes);
  check('  and are 3 long',         C3.stashes.length, 3);
  check('history rows are 3 wide',  C3.history.every(r => r.length === 3), true);

  section('A client leaving dissolves the match');
  client2.mpSendEnvelope({ type: 'ACTION', payload: { action: 'CJAR_PLAYER_LEFT' } });
  check('host tore the room down', host2.__dissolved, true);

  console.log('\n' + '='.repeat(62));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();

// The host advances a Raid from the summary screen exactly the way the
// btn-cjar-next-raid listener does — same four calls, same order.
function hostNextRaid(dev) {
  vm.runInContext(
    'cjarStartRaid(); cjarBroadcastRaidStart(); cjarSendAffinities(); cjarShowRaidIntro(() => cjarHostNextFlip());',
    dev
  );
}
