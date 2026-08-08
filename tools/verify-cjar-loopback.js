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
  // Review Fix 2 — the client's bust-path setTimeout is now tracked in cjarRevealHandle
  // (previously bare, so nothing could ever clear it). Exposed as a NULL/non-null
  // presence check rather than a raw handle object, which is all a bridge getter can
  // usefully compare with JSON.stringify.
  get revealHandle() { return cjarRevealHandle !== null ? 'armed' : null; },
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
  // DD-27 — taps a trail thumb by index. .onclick is a plain property (not
  // addEventListener, which this DOM mock no-ops), so it's directly callable.
  tapTrailCard(i) {
    const el = document.getElementById('cjar-trail-strip').children[i];
    if (el && typeof el.onclick === 'function') el.onclick();
  },
  cardViewOpen()      { return document.getElementById('cjar-card-view-overlay').style.display === 'flex'; },
  cardViewName()      { return document.getElementById('cjar-card-view-name').textContent; },
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
  tokenCount()       { return document.getElementById('cjar-delta-layer').children.length; },
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
  headerCols() {
    const head = document.getElementById('cjar-reveal-header');
    return head.style.display === 'none' ? null : head.children.map(c => c.textContent);
  },
  statusText(i) {
    const row = document.getElementById('cjar-reveal-rows').children[i];
    if (!row || !row.children[3]) return null;
    return row.children[3].textContent;
  },
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
  // Deals a real shuffle will not deliver on demand — a bust needs the same family
  // card twice, so the test stacks the deck deliberately rather than waiting for one.
  stackDeck(cards)   { cjarDeck = cards.map(c => c.type === 'family' ? cjarFamilyCard(c.id)
                                                                    : cjarCookieCard(c.value)); },
  hostNextFlip()     { cjarHostNextFlip(); },
  seen2(id)          { return cjarSeen[id]; },
  // DD-30 — the podium IS built with createElement/appendChild (a real mock element
  // tree), so child traversal works. The history grid is built as a raw HTML STRING
  // (innerHTML=), and this mock's innerHTML setter only stores the string and clears
  // .children — it does NOT parse it — so history-grid checks below read the string.
  podiumMedal(i) {
    const row = document.getElementById('cjar-podium').children[i];
    const slot = row && row.children[0] && row.children[0].children[0];
    return slot ? slot.textContent : null;
  },
  // Tie-tolerant version of podiumMedal — a REAL shuffle can put more than one seat on
  // the same rank (a tie for 2nd bumps what would've been "row 3" up a slot), so DOM
  // row INDEX never reliably maps to a specific rank. This reads each row's own medal
  // AND its own rendered rank label (the label span's leading "Nth" text, produced by
  // cjarRankLabel) side by side, so the caller can verify medal-matches-its-own-rank
  // for every row regardless of how ties fell in this run.
  podiumRows() {
    const pod = document.getElementById('cjar-podium');
    return pod.children.map(row => {
      const left = row.children[0];
      return { medal: left.children[0].textContent, label: left.children[1].textContent };
    });
  },
  // Renders the history grid off a CALLER-SUPPLIED history array instead of the real
  // match's, to test the colMax/tiedCount highlight computation in cjarShowGameover
  // deterministically rather than hoping a short real match happens to produce a
  // non-tied Raid column. Restores the real cjarRaidHistory and re-renders it
  // immediately after, so every check that runs after this one still sees the actual
  // match's state (podium, grid, and the history getter all untouched from outside).
  gameoverWithHistory(fake) {
    const orig = cjarRaidHistory;
    cjarRaidHistory = fake;
    cjarShowGameover();
    const html = document.getElementById('cjar-history-grid').innerHTML;
    cjarRaidHistory = orig;
    cjarShowGameover();
    return html;
  },
  historyHTML() { return document.getElementById('cjar-history-grid').innerHTML; },
  resetState()       { cjarResetState(); },
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
  // Flip 1 is ALREADY guaranteed a cookie here — `snack: 'warmup'` makes
  // cjarBuildDeck() call cjarFloatCookies(deck, 2), floating two cookies to the top
  // before the Raid 1 Treat is dealt in — so findIndex returns 0 and the `i > 0`
  // guard below is a no-op today. Belt-and-braces, not load-bearing: it re-asserts
  // the same guarantee directly (same vm.runInContext technique hostNextRaid() uses)
  // so the payout-beat check below stays true even if this section's seat config
  // ever changes out from under warmup's guarantee.
  vm.runInContext(
    "{ const i = cjarDeck.findIndex(c => c.type === 'cookie'); " +
    "  if (i > 0) cjarDeck.unshift(cjarDeck.splice(i, 1)[0]); }",
    host
  );
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
  check('header shows 5 columns',    (C.headerCols() || []).length, 5);
  check('header column order',       C.headerCols(),
        ['Rank', 'Player', 'Stashed', 'Status', 'At Risk']);
  check('all four seats Still In',   [0,1,2,3].map(i => C.statusText(i)),
        ['Still In', 'Still In', 'Still In', 'Still In']);
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

  section('The payout beat throws the ACTUAL split, not a guess (DD-20 review fix)');
  // cjarBeginFlipAnim now arms TWO timers, payout (1800 ms) then handover (3200 ms) —
  // step() only ever fires the earliest pending one, so this is the payout beat on
  // its own, before the handover below. Flip 1 is guaranteed a cookie (warmup floats
  // two to the top, re-asserted above), and all four seats are active on Raid 1's
  // first flip, so the exact token count is knowable — an "at least one" assertion
  // would not have caught cjarFlyTokens being handed the wrong divisor.
  const flip1Value    = H.card.value;
  const flip1Heads    = 4;                          // every seat is active pre-departure
  const flip1Expected = flip1Heads + (flip1Value % flip1Heads !== 0 ? 1 : 0);
  step(host);
  step(client);
  check('host threw the exact split token count',   H.tokenCount(), flip1Expected);
  check('client threw the exact split token count', C.tokenCount(), flip1Expected);

  // Let the reveal choreography hand over on BOTH devices before any real submission —
  // cjarSubmitChoice is now guarded by cjarFlipAnim (Step 6), and each device runs its
  // own independent animation timer. The payout beat above already consumed each
  // device's first (1800 ms) timer, so this fires the second (3200 ms) one.
  step(host);
  step(client);
  check('card is face-down while deciding', C.heroFaceDown(), true);
  check('label reads Next from Jar',        C.stageLabel(), 'Next from Jar');

  section('Trail cards open a full-illustration popup on tap (DD-27)');
  check('card view starts closed', C.cardViewOpen(), false);
  C.tapTrailCard(0);
  check('card view opens',         C.cardViewOpen(), true);
  check('card view has a name',    (C.cardViewName() || '').length > 0, true);

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

  // DD-28 — seat 3's departure only shows in the STANDINGS format (the 5-column grid);
  // the render right after resolve is the 'revealing' outcome-line format, which has no
  // Status column (only 2 children per row). Drive to the next flip's 'deciding' phase —
  // the next point the standings render at all — with the same turn() helper the raid
  // loop below uses, then assert before handing off to that loop. The loop stops the
  // instant C.phase flips to 'deciding', so turn() is never called while H.phase is
  // 'deciding' too — flip 2's choices are never auto-filled by this.
  let departGuard = 0;
  while (C.phase !== 'deciding' && departGuard++ < 20) turn(host, H, () => 'take');
  // Standings rows are sorted by RANK (cjarRanks(), by stash descending), not by seat
  // index — and seat 3's solo sneak-out banks its share immediately, while the three
  // seats still in the Raid sit on 0 stash until it ends. That puts seat 3 in first
  // place, i.e. DOM row 0, not row 3 — confirmed via C.stashes here: [0, 0, 0, 5].
  check('exactly one seat reads Snuck Out',
        [0, 1, 2, 3].map(i => C.statusText(i)).filter(s => s === 'Snuck Out').length, 1);
  check('the departed seat (now rank 1, row 0) reads Snuck Out', C.statusText(0), 'Snuck Out');

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

  section('The bust card gets the same flip beat as every other card');
  // A FRESH device pair — the base game's `host`/`client` above just finished Raid 1
  // via a mid-raid BUST (see the screens leading up to the raid-summary check), which
  // leaves cjarActive all FALSE (cjarResolveBust clears every seat). Reusing `host`/
  // `client` here would mean cjarActiveCount() === 0 before a single choice is even
  // made, so cjarResolveFlip's raidEnded (= cjarActiveCount() === 0) fires on the
  // FIRST card's resolve and ends the Raid right there — the second flip (the actual
  // bust under test) never happens. seat()+startMatch() gives real active players and
  // an empty cjarSeen; stackDeck then overrides the real shuffle before either device
  // ever looks at a card.
  const host6   = makeDevice('host6',   'host',   0, SLOTS);
  const client6 = makeDevice('client6', 'client', 1, SLOTS);
  await host6.cjarLoadData();
  await client6.cjarLoadData();
  const H6 = host6.__cjar, C6 = client6.__cjar;
  host6.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C6.handle(onWire); } catch (e) { client6.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host6.mpSendPrivate = (uid, env) => {
    if (uid !== 'u1') return;
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C6.handle(onWire); } catch (e) { client6.__errors.push(`private: ${e.message}`); }
  };
  client6.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H6.handle(onWire); } catch (e) { host6.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  client6.mpSendPrivate = () => { throw new Error('a client must never write the private channel'); };

  H6.seat({ players: 4, names: NAMES, length: 3 });
  C6.standby();
  H6.startMatch();
  H6.stackDeck([{ type: 'family', id: 'mum' }, { type: 'family', id: 'mum' }]);
  H6.hostNextFlip();                                  // first mum — a warning, opens a window
  check('first sighting warns only', H6.seen2('mum'), 1);
  step(host6);                                        // let the choreography hand over
  for (let i = 0; i < 4; i++) H6.applyChoice(i, 'take');
  H6.resolve();
  step(host6);                                        // outcome dwell → cjarHostNextFlip
                                                        // (2nd flip is the same 'mum' — busts)
  check('bust opened the table, not the verdict',
        host6.__screens[host6.__screens.length - 1], 'screen-cjar-table');
  check('and the card is face-up for it', H6.flipAnim(), true);
  // cjarBeginFlipAnim(false) queues its own payout beat (1800 ms, a no-op for a family
  // card) AHEAD of the animation handle it shares cjarRevealHandle's deadline with —
  // both land at CJAR_FLIP_ANIM_MS, but the payout beat was queued first (Task 7), so
  // it drains first. step() only ever fires the EARLIEST pending timer, so three
  // drains — not one — are what actually walks the clock from "table" to "verdict".
  step(host6);                                        // the bust card's own payout beat
  step(host6);                                        // cjarAnimHandle — the flip settles
  step(host6);                                        // cjarRevealHandle → cjarShowBusted
  check('THEN the verdict',
        host6.__screens[host6.__screens.length - 1], 'screen-cjar-busted');
  // The client runs the identical three-timer choreography on its OWN queue — it was
  // never advanced by the host's step() calls above, only by the packets that arrived
  // synchronously when the host broadcast the warning and then the bust.
  step(client6); step(client6); step(client6);
  check('client saw the same order',
        client6.__screens.slice(-2), ['screen-cjar-table', 'screen-cjar-busted']);
  check('no exception on either device', [host6.__errors, client6.__errors], [[], []]);

  section('A mid-window quit clears the client bust timeout, not just the host one (review Fix 2)');
  // Same stacked-deck bust as above, on a FRESH pair — but the client is left exactly
  // where it lands when the bust RESOLVE arrives (nothing stepped since) and a quit /
  // HOST_END_GAME is simulated right there. Pre-fix this timeout was a bare, untracked
  // setTimeout: nothing in cjarResetState (or any quit path) could ever clear it, so a
  // client that quit inside this 3200 ms window still had cjarShowBusted fire later —
  // sound, showScreen, and a fresh 5 s interstitial — against a screen the app had
  // already torn down.
  const host9   = makeDevice('host9',   'host',   0, SLOTS);
  const client9 = makeDevice('client9', 'client', 1, SLOTS);
  await host9.cjarLoadData(); await client9.cjarLoadData();
  const H9 = host9.__cjar, C9 = client9.__cjar;
  host9.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C9.handle(onWire); } catch (e) { client9.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host9.mpSendPrivate = () => {};
  client9.mpSendEnvelope = () => {};

  H9.seat({ players: 4, names: NAMES, length: 3 });
  C9.standby();
  H9.startMatch();
  H9.stackDeck([{ type: 'family', id: 'mum' }, { type: 'family', id: 'mum' }]);
  H9.hostNextFlip();                                  // first mum — a warning
  step(host9);                                        // let the choreography hand over
  for (let i = 0; i < 4; i++) H9.applyChoice(i, 'take');
  H9.resolve();
  step(host9);           // outcome dwell → cjarHostNextFlip → 2nd 'mum' busts → RESOLVE lands
  check('client9 has the bust RESOLVE, window still open',
        lastScreen(client9), 'screen-cjar-table');
  check('the bust timeout is now a TRACKED handle, armed', C9.revealHandle, 'armed');
  C9.resetState();                                    // simulated quit / HOST_END_GAME
  check('resetState cleared it', C9.revealHandle, null);
  // Drain whatever is left on client9's queue (its own choreography timers, plus the
  // never-fired raid-intro interstitial — all cleared by the same resetState call).
  // The point under test: NONE of it can now walk the screen to screen-cjar-busted.
  let guard9 = 0;
  while (step(client9) && guard9++ < 10) {}
  check('no post-quit transition to screen-cjar-busted',
        lastScreen(client9), 'screen-cjar-table');
  check('no exception on client9', client9.__errors, []);

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
  // The header text list is unchanged in Sylly Mode — only the CONTENT of the
  // Status/At Risk cells is empty (DD-28, cjarRenderRevealRows Step 3).
  check('Sylly header has no Status/At Risk', C2.headerCols(),
        ['Rank', 'Player', 'Stashed', 'Status', 'At Risk']);
  check('Sylly Status cell is empty',         C2.statusText(0), '');
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

  section('Dibber Dobber payout beat: the actual split, not cjarPlayerCount (DD-20 review fix)');
  // Seats 0, 2 and 3 took, seat 1 played innocent, nobody dobbed — the "takers only"
  // branch of cjarResolveFlipDD, which divides by takers.length (3), never by
  // cjarPlayerCount (4). The scare-off then sweeps any remainder to the lone
  // innocent, but that is a step further downstream than this beat models — the
  // beat only needs to match cjarResolveFlipDD's OWN divisor, which the review
  // fix is about. cjarBeginFlipAnim(false) was armed synchronously inside
  // H2.resolve() above, so its payout timer is still pending on both devices.
  //
  // cjarHostResolveFlip already called cjarFlyDelta for each device's OWN seat delta
  // (a pre-existing, separate feature sharing this same #cjar-delta-layer) before
  // cjarBeginFlipAnim(false) even armed the payout timer — clear the layer on both
  // devices first so this assertion isolates the payout beat's own tokens rather
  // than the sum of the two unrelated features.
  vm.runInContext("document.getElementById('cjar-delta-layer').innerHTML = '';", host2);
  vm.runInContext("document.getElementById('cjar-delta-layer').innerHTML = '';", client2);
  const ddValue    = H2.card.value;
  const ddHeads    = 3;                              // takers = seats 0, 2, 3
  const ddExpected = ddHeads + (ddValue % ddHeads !== 0 ? 1 : 0);
  step(host2);
  step(client2);
  check('host2 threw the exact split token count',   H2.tokenCount(), ddExpected);
  check('client2 threw the exact split token count', C2.tokenCount(), ddExpected);

  section('Dibber Dobber all-innocent flip: scare-off sweeps to seats, not left (review Fix 3)');
  // cjarResolveFlipDD's scare-off runs LAST and, with no Dobber present, drains the
  // WHOLE Crumb pool — this card's value plus anything already sitting there —
  // straight back out to the innocents. It never stays in the pile. Pre-fix the
  // payout beat's "dobbers-only or all-innocent" branch threw a single token LEFT
  // to the Crumb pile instead, showing the opposite of what actually happens.
  const host7   = makeDevice('host7',   'host',   0, SLOTS);
  const client7 = makeDevice('client7', 'client', 1, SLOTS);
  await host7.cjarLoadData(); await client7.cjarLoadData();
  const H7 = host7.__cjar, C7 = client7.__cjar;
  host7.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C7.handle(onWire); } catch (e) { client7.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host7.mpSendPrivate = (uid, env) => {
    if (uid !== 'u1') return;
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C7.handle(onWire); } catch (e) { client7.__errors.push(`private: ${e.message}`); }
  };
  client7.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u1', timestamp: Date.now() });
    try { H7.handle(onWire); } catch (e) { host7.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };

  H7.seat({ players: 4, names: NAMES, sylly: true, length: 3 });
  C7.standby();
  H7.startMatch();
  check('flip 1 is a cookie (blind float)', H7.deck[0].type, 'cookie');
  step(host7);
  check('client7 reached the table', lastScreen(client7), 'screen-cjar-table');

  for (let i = 0; i < 4; i++) H7.applyChoice(i, 'innocent');   // nobody takes, nobody dobs
  check('all four in', H7.allIn(), true);
  H7.resolve();
  vm.runInContext("document.getElementById('cjar-delta-layer').innerHTML = '';", host7);
  vm.runInContext("document.getElementById('cjar-delta-layer').innerHTML = '';", client7);
  step(host7);
  step(client7);
  check('host7: one token per innocent, none left to Crumbs',   H7.tokenCount(), 4);
  check('client7: one token per innocent, none left to Crumbs', C7.tokenCount(), 4);
  // Review Fix 2's second half — a mid-flight quit hides the screen via display:none,
  // which suppresses animationend, so the tokens just thrown above would otherwise be
  // orphaned in the DOM forever. cjarResetState now empties #cjar-delta-layer directly.
  check('tokens still on screen before the quit', C7.tokenCount() > 0, true);
  C7.resetState();
  check('resetState empties the token layer', C7.tokenCount(), 0);

  section('Drive a full Dibber Dobber match');
  guard = 0;
  while (lastScreen(host2) !== 'screen-cjar-gameover' && guard++ < 400) {
    if (lastScreen(host2) === 'screen-cjar-table' && C2.phase === 'deciding') C2.submit('innocent');
    if (!turn(host2, H2, i => ['take', 'innocent', 'dob'][i % 3])) break;
  }
  check('host reached the end',   lastScreen(host2), 'screen-cjar-gameover');
  check('client reached the end', lastScreen(client2), 'screen-cjar-gameover');
  // DD-30 podium check, made TIE-TOLERANT: a real shuffle can tie two seats on the same
  // rank (cjarRanks() gives both the same number), which shifts every row below the tie
  // up a DOM index — so "row 3 is blank" was an assumption about a specific match's
  // shuffle, not an invariant. Read every row's own rendered rank alongside its own
  // medal instead, and assert the medal-to-rank mapping holds for EVERY row, however
  // the ties fell this run.
  const podiumRowsOk = C2.podiumRows().every(row => {
    const m = /^(\d+)/.exec(row.label);
    const rank = m ? parseInt(m[1], 10) : NaN;
    const expected = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    return row.medal === expected;
  });
  check('every podium row\'s medal matches its own rendered rank (tie-tolerant)',
        podiumRowsOk, true);
  // The raid-history top-scorer highlight adds `cjar-label` to exactly the winning
  // cell(s) in a Raid column. A LIVE match's real history may or may not contain a
  // non-tied Raid across a short match (this section runs a 3-Raid match) — that
  // flaked roughly 1 in 20 runs, so test the colMax/tiedCount HIGHLIGHT LOGIC directly
  // against a crafted history with a known non-tied winner in two columns and a known
  // all-tied third column, via the gameoverWithHistory() bridge (restores the real
  // history + re-renders it immediately after, so later checks are unaffected).
  const fakeHistory = [[5, 3, 3, 2], [2, 2, 2, 2], [8, 1, 1, 1]];
  const fakeHtml = C2.gameoverWithHistory(fakeHistory);
  const highlightCount = (fakeHtml.match(/cjar-label/g) || []).length;
  check('raid-history highlight fires for exactly the two non-tied columns\' winners',
        highlightCount, 2);
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
  // deferred half of cjarBeginFlipAnim, not the FLIP_START applier itself. Each
  // device now carries TWO choreography timers (payout at 1800 ms, handover at
  // 3200 ms), so draining both takes two step() calls apiece.
  step(host4); step(host4);
  step(client4); step(client4);
  check('client hid the timer bar', C4.timerHidden(), true);
  // The auto-resolve timer is the ONLY thing that should be absent. If it were still
  // armed, No Rush would silently resolve on the fallback choice after 20 s. The
  // reveal-choreography timers (payout + handover) have already been consumed above.
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
  // client5's OWN flip-2 animation is still mid-flight here (never stepped — the next
  // section depends on that), so this reads the SAME under the pre-fix formula too
  // (cjarCard truthy is sufficient there, and flipAnim is ALSO true right now). It is
  // not the discriminating moment for review Fix 1 — see the dedicated section below,
  // which drives a device fully through its own handover to actually exercise it.
  check('two out, one thumb, mid-flip', C5.stageThumbs(), 1);
  check('standings render always',      C5.standingsRows(), 4);

  section('The card joins the strip at the SETTLE handover, not before (review Fix 1)');
  // DD-18/DD-19: the reveal choreography owns the hero for CJAR_FLIP_ANIM_MS, then
  // hands over — hero goes face-down, and the card that was just revealed belongs in
  // the history strip from that instant on ("nothing is drawn twice"). Pre-fix,
  // cjarRenderTrailStrip's exclusion gate was `cjarCard ? … : cards` — true for the
  // WHOLE decision window, not just the animation — so the card was excluded from the
  // strip AND (once the animation ended) no longer shown in the face-down hero either:
  // reachable only via the trail overlay, for as long as the decision window stayed
  // open. This device pair is driven fully through its own handover to catch exactly
  // that gap, which the assertion above (still mid-animation) cannot see.
  const host8   = makeDevice('host8',   'host',   0, SLOTS);
  const client8 = makeDevice('client8', 'client', 1, SLOTS);
  await host8.cjarLoadData(); await client8.cjarLoadData();
  const H8 = host8.__cjar, C8 = client8.__cjar;
  host8.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    try { C8.handle(onWire); } catch (e) { client8.__errors.push(`${onWire.payload.action}: ${e.message}`); }
  };
  host8.mpSendPrivate = () => {};
  client8.mpSendEnvelope = () => {};
  H8.seat({ players: 4, names: NAMES, snack: 'warmup', length: 3, time: 'norush' });
  C8.standby();
  H8.startMatch();
  step(host8);                                     // interstitial → first flip
  check('client8 reached the table',              lastScreen(client8), 'screen-cjar-table');
  check('mid-flip: card excluded from the strip', C8.stageThumbs(), 0);
  check('mid-flip: hero shows it face-up',        C8.heroFaceDown(), false);
  step(client8); step(client8);                     // client8's own payout + handover beats
  check('handover done: hero goes face-down',     C8.heroFaceDown(), true);
  check('handover done: card now IN the strip',   C8.stageThumbs(), 1);

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
  // not an absolute count, to isolate the anim handles from that unrelated one.
  const client5TimersBeforeResolve = client5.__timers.length;
  for (let i = 0; i < 4; i++) if (!H5.ready[i]) H5.applyChoice(i, i === 1 ? 'sneak' : 'take');
  check('all four in', H5.allIn(), true);
  H5.resolve();
  check('client applied resolve clean', client5.__errors, []);
  check('the stale animation was cancelled, not left running', C5.flipAnim(), false);
  // The decisive check: a base-game resolve schedules NO new timer of its own, so the
  // ONLY change to client5's timer queue should be the stale choreography handles
  // disappearing — now TWO of them (payout + handover), not one, since
  // cjarCancelFlipAnim clears cjarPayoutHandle alongside cjarAnimHandle (Task 7).
  // Pre-fix it would have survived (delta 0) and later fired mid-'revealing', painting
  // the bar against the just-closed deadline.
  check('no lingering timer to later paint a stale bar',
        client5.__timers.length, client5TimersBeforeResolve - 2);

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
