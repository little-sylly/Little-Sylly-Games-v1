// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-deck.js — asserts Cookie Jar's DATA layer headlessly.
//
//   node tools/verify-cjar-deck.js        (exits 1 on any failure)
//
// Covers data/cjar-data.json's schema and cjarBuildDeck()'s composition under
// every setting: Snack Friendly float, the Treat schedule at both match lengths,
// the three Treat carry/discard rules, and House Rules burn/on-guard/high-alert
// across a full match.
//
// Why it exists: cjar is MDLM-only, so the deck builder is unreachable from a
// single browser. Without this the first Raid ever dealt is also the first time
// the code runs. It re-implements no rules — every assertion runs against the
// real js/games/cjar.js.
//
// Two sandbox rules that earn their keep:
//   • setTimeout is CAPTURED, never fired — an auto-advance being *scheduled*
//     becomes an assertion in its own right, and nothing races the test.
//   • mpSendEnvelope / mpSendPrivate THROW rather than no-op, so a broadcast
//     leaking into 'single' mode fails loudly instead of passing silently.
//
// The vm gotcha: `let` in a vm-evaluated script creates a lexical binding, NOT a
// property on the context object, so cjarDeck & friends are invisible from out
// here. The appended bridge exposes them. `function` declarations DO land on the
// object, which is why the builders are callable directly.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const dataPath = path.join(ROOT, 'data/cjar-data.json');
const dataJson = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : '{}';

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: {
    addEventListener() {}, getElementById: () => null, querySelectorAll: () => [],
    // Minimal element factory — enough for cjarRenderCard, which is the only DOM
    // this tool exercises. Deliberately not a DOM shim; if a future seam needs more
    // than className/style/dataset/textContent/appendChild, that is a signal the
    // seam is doing too much, not that this factory should grow.
    createElement: tag => ({
      tagName: tag.toUpperCase(), className: '', style: { cssText: '' },
      dataset: {}, textContent: '', children: [],
      appendChild(c) { this.children.push(c); return c; },
    }),
  },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
  // Deterministic stand-in for engine.js's pure shuffle — identity, so every deck
  // build is reproducible. See plan Delta 1: cjar reassigns, never mutates in place.
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
  playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
  playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  assetFace: () => null, assetBack: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__cjar = {
  get deck()        { return cjarDeck; },
  get data()        { return CJAR_DATA; },
  get familyCopies(){ return cjarFamilyCopies; },
  get carried()     { return cjarTreatsCarried; },
  get live()        { return cjarTreatsLive; },
  get highAlert()   { return cjarHighAlertId; },
  get crumbs()      { return cjarCrumbs; },
  get raidNo()      { return cjarRaidNo; },
  consts: { DD_CUT: CJAR_DD_CUT, DD_START_STASH: CJAR_DD_START_STASH,
            DECISION_TIMES: CJAR_DECISION_TIMES, REVEAL_MS: CJAR_REVEAL_MS,
            FLIP_ANIM_MS: CJAR_FLIP_ANIM_MS,
            INTERSTITIAL_MS: CJAR_INTERSTITIAL_MS, GRACE_MS: CJAR_TIMEOUT_GRACE_MS,
            DOB_STEAL: CJAR_DD_DOB_STEAL, DOB_BACKFIRE: CJAR_DD_DOB_BACKFIRE,
            TAKE_LOSS: CJAR_DD_TAKE_LOSS, DEBT_CAP: CJAR_DD_DEBT_CAP },
  // Seats a Raid directly so each scenario is deterministic — no dealing.
  seat(o) {
    cjarPlayerCount   = o.players;
    cjarPlayerNames   = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode     = !!o.sylly;
    cjarSnackFriendly = o.snack  || 'off';
    cjarHouseRules    = o.house  || 'burn';
    cjarMatchLength   = o.length || 5;
    cjarRaidNo        = o.raidNo || 1;
    cjarFamilyCopies  = o.familyCopies || { mum:3, dad:3, big:3, grandma:3, pet:3 };
    cjarTreatsCarried = o.carried || [];
    cjarTreatsLive    = o.live || CJAR_DATA.treats.map(t => t.id);
    cjarHighAlertId   = o.highAlertId === undefined ? null : o.highAlertId;
    cjarCrumbs = 0; cjarSeen = {}; cjarCounterTreat = null; cjarTrail = [];
  },
  build() { cjarDeck = cjarBuildDeck(); return cjarDeck; },
  setDeck(d) { cjarDeck = d; },
  tier(v) { return cjarCookieTier(v); },
  artKey(c) { return cjarArtKey(c); },
  scheduled() { return cjarScheduledTreat(); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

// ── Assertion harness ─────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  console.log('Cookie Jar — data layer verification\n' + '='.repeat(48));
  const C = sandbox.__cjar;

  section('Constants match spec §4');
  // Decision Time is a SETTING now (playtest round 1 found 15 s too short). 'norush'
  // MUST stay null — a number here would silently re-arm the auto-resolve.
  check('Blitz window',          C.consts.DECISION_TIMES.blitz,    10000);
  check('Standard window',       C.consts.DECISION_TIMES.standard, 20000);
  check('No Rush has NO window', C.consts.DECISION_TIMES.norush,   null);
  check('CJAR_TIMEOUT_GRACE_MS', C.consts.GRACE_MS,        1500);
  // 3000 → 1200 (DD-19): the outcome dwell shrank once CJAR_FLIP_ANIM_MS carved a
  // separate 2100 ms reveal-choreography window out of the old budget.
  check('CJAR_REVEAL_MS',        C.consts.REVEAL_MS,       1200);
  // Load-bearing in FOUR places (cjarBeginFlipAnim's handover, cjarOpenDecisionWindow's
  // deadline maths, both host and client bust-path setTimeouts) — the constants block
  // asserted everything around it by exact value except this one. DD-19.
  check('CJAR_FLIP_ANIM_MS',     C.consts.FLIP_ANIM_MS,    2100);
  check('CJAR_INTERSTITIAL_MS',  C.consts.INTERSTITIAL_MS, 5000);
  check('CJAR_DD_CUT',           C.consts.DD_CUT,          10);
  check('CJAR_DD_START_STASH',   C.consts.DD_START_STASH,  5);
  check('CJAR_DD_DOB_STEAL',     C.consts.DOB_STEAL,       2);
  check('CJAR_DD_DOB_BACKFIRE',  C.consts.DOB_BACKFIRE,    2);
  check('CJAR_DD_DEBT_CAP',      C.consts.DEBT_CAP,        6);
  check('CJAR_DD_TAKE_LOSS',     C.consts.TAKE_LOSS, { favourite: 0, neutral: 2, watcher: 4 });

  await sandbox.cjarLoadData();
  const D = C.data;

  section('data/cjar-data.json schema');
  check('15 cookie values',      D.cookieValues.length, 15);
  check('cookie values total 124', D.cookieValues.reduce((a, b) => a + b, 0), 124);
  check('three tiers',           Object.keys(D.cookieTiers).sort(), ['batch','handful','mountain']);
  check('tier bands are contiguous 1-17',
    [D.cookieTiers.handful.min, D.cookieTiers.handful.max,
     D.cookieTiers.batch.min,   D.cookieTiers.batch.max,
     D.cookieTiers.mountain.min, D.cookieTiers.mountain.max], [1, 5, 6, 12, 13, 17]);
  check('every cookie value falls in a tier',
    D.cookieValues.every(v => Object.values(D.cookieTiers).some(t => v >= t.min && v <= t.max)), true);

  check('five family ids', D.family.map(f => f.id).sort(), ['big','dad','grandma','mum','pet']);
  check('every family starts at 3 copies', D.family.every(f => f.copies === 3), true);
  // 4 lines minimum so a 5-Raid match never repeats the same line every time.
  check('every family has >=4 warn lines', D.family.every(f => f.warn.length >= 4), true);
  check('every family has >=4 bust lines', D.family.every(f => f.bust.length >= 4), true);
  check('no duplicate warn lines', D.family.every(f => new Set(f.warn).size === f.warn.length), true);
  check('no duplicate bust lines', D.family.every(f => new Set(f.bust).size === f.bust.length), true);

  check('five treats', D.treats.length, 5);
  check('three special @5', D.treats.filter(t => t.tier === 'special' && t.points === 5).length, 3);
  check('two super @10',   D.treats.filter(t => t.tier === 'super'   && t.points === 10).length, 2);

  check('quick-snack schedule is 3 long', D.treatSchedule['3'].length, 3);
  check('full-feast schedule is 5 long',  D.treatSchedule['5'].length, 5);
  // The Super Special must land on the FINAL Raid at either length — this is the
  // whole reason the schedule is data and not length-branching logic in the plugin.
  const superIds = D.treats.filter(t => t.tier === 'super').map(t => t.id);
  check('quick-snack ends on a super', superIds.includes(D.treatSchedule['3'][2]), true);
  check('full-feast ends on a super',  superIds.includes(D.treatSchedule['5'][4]), true);
  check('schedules reference real treat ids',
    ['3','5'].every(k => D.treatSchedule[k].every(id => D.treats.some(t => t.id === id))), true);

  section('Australian English in flavour copy');
  const allCopy = D.family.flatMap(f => [...f.warn, ...f.bust]).join(' ').toLowerCase();
  check('no US spellings', /\b(color|flavor|organize|recognize|mom)\b/.test(allCopy), false);

  section('Card factories and the art key');
  check('cookie tier bands', [C.tier(1), C.tier(5), C.tier(6), C.tier(12), C.tier(13), C.tier(17)],
    ['handful','handful','batch','batch','mountain','mountain']);
  // 15 cookie values collapse onto 3 tier assets — the number is a text overlay,
  // never its own asset. 14 keys total.
  check('cookie art key is the tier',   C.artKey({ type:'cookie', value: 9 }),          'cookie-batch');
  check('family art key',               C.artKey({ type:'family', id: 'mum' }),         'family-mum');
  check('treat art key',                C.artKey({ type:'treat',  id: 'macarons' }),    'treat-macarons');
  const allKeys = new Set([
    ...D.cookieValues.map(v => C.artKey({ type:'cookie', value: v })),
    ...D.family.map(f => C.artKey({ type:'family', id: f.id })),
    ...D.treats.map(t => C.artKey({ type:'treat',  id: t.id })),
  ]);
  // 3 tiers + 5 families + 5 treats = 13 FACES. The spec says "14 keys"; that count
  // folds in the card back, which is the manifest's separate `back` field and not a
  // face key at all (plan Delta 4). 13 faces + 1 back = 14 images.
  check('exactly 13 distinct art keys', allKeys.size, 13);

  section('Base deck composition');
  C.seat({ players: 4, snack: 'off', house: 'burn', length: 5, raidNo: 1 });
  let deck = C.build();
  check('15 family + 15 cookie + 1 treat', deck.length, 31);
  check('15 cookies',      deck.filter(c => c.type === 'cookie').length, 15);
  check('15 family cards', deck.filter(c => c.type === 'family').length, 15);
  check('1 treat',         deck.filter(c => c.type === 'treat').length,  1);
  check('raid 1 treat is the scheduled one', deck.find(c => c.type === 'treat').id, 'shortbread');
  check('treat card is hydrated', (t => [t.points, t.tier])(deck.find(c => c.type === 'treat')), [5, 'special']);

  section('Snack Friendly FLOATS, never prepends');
  // Prepending would add a 16th cookie and silently change the odds on every
  // other flip for the rest of the Raid. The count must stay at 15.
  C.seat({ players: 4, snack: 'safe', length: 5, raidNo: 1 });
  deck = C.build();
  check('safe: still 15 cookies',  deck.filter(c => c.type === 'cookie').length, 15);
  check('safe: still 31 cards',    deck.length, 31);
  check('safe: card 1 is a cookie', deck[0].type, 'cookie');
  C.seat({ players: 4, snack: 'warmup', length: 5, raidNo: 1 });
  deck = C.build();
  check('warmup: still 15 cookies', deck.filter(c => c.type === 'cookie').length, 15);
  check('warmup: cards 1-2 are cookies', [deck[0].type, deck[1].type], ['cookie','cookie']);

  section('Treat schedule across both match lengths');
  const sched = len => [1,2,3,4,5].slice(0, len).map(n => {
    C.seat({ players: 4, length: len, raidNo: n });
    return C.scheduled();
  });
  check('quick snack (3)', sched(3), ['shortbread','redvelvet','brownies']);
  check('full feast (5)',  sched(5), ['shortbread','redvelvet','macadamia','macarons','brownies']);

  section('Carried treats join the next Raid');
  C.seat({ players: 4, length: 5, raidNo: 2, carried: ['shortbread'] });
  deck = C.build();
  check('carried + scheduled both present',
    deck.filter(c => c.type === 'treat').map(c => c.id).sort(), ['redvelvet','shortbread']);

  section('House Rules mutate the live family copies');
  C.seat({ players: 4, house: 'burn', length: 5, raidNo: 2,
           familyCopies: { mum:2, dad:3, big:3, grandma:3, pet:3 } });
  deck = C.build();
  check('burnt Mum contributes only 2', deck.filter(c => c.type === 'family' && c.id === 'mum').length, 2);
  check('14 family cards total',        deck.filter(c => c.type === 'family').length, 14);
  C.seat({ players: 4, house: 'high-alert', length: 5, raidNo: 2,
           familyCopies: { mum:2, dad:4, big:3, grandma:3, pet:3 } });
  deck = C.build();
  check('high-alert Dad contributes 4', deck.filter(c => c.type === 'family' && c.id === 'dad').length, 4);

  section('Sylly deck: cut to 10, THEN the Treat');
  C.seat({ players: 4, sylly: true, length: 5, raidNo: 3 });
  deck = C.build();
  check('11 cards', deck.length, 11);
  // The Treat is added AFTER the cut so it is always in play — a Treat that could
  // be cut away would make the whole Sylly Treat-priority rule dead most Raids.
  check('exactly 1 treat', deck.filter(c => c.type === 'treat').length, 1);
  check('treat is raid 3 scheduled', deck.find(c => c.type === 'treat').id, 'macadamia');
  // House Rules is hidden in Sylly, so the pool is the FULL 15+15 every Raid —
  // nothing ever burns, regardless of what cjarFamilyCopies happens to hold.
  C.seat({ players: 4, sylly: true, length: 5, raidNo: 3,
           familyCopies: { mum:1, dad:1, big:1, grandma:1, pet:1 } });
  check('sylly ignores burnt copies', C.build().length, 11);

  section('cjarRenderCard — the one seam all card DOM goes through');
  let node = sandbox.cjarRenderCard({ type:'cookie', value: 9 });
  check('hero by default',    node.className.includes('cjar-card-hero'), true);
  check('no asset class when art is absent', node.className.includes('cjar-card-asset'), false);
  node = sandbox.cjarRenderCard({ type:'cookie', value: 9 }, { size: 'thumb' });
  check('thumb size',   node.className.includes('cjar-card-thumb'), true);
  node = sandbox.cjarRenderCard({ type:'treat', id:'macarons', points:10, tier:'super' }, { size: 'counter' });
  check('counter size', node.className.includes('cjar-card-counter'), true);
  node = sandbox.cjarRenderCard(null, { faceDown: true });
  check('face down',    node.className.includes('cjar-card-back'), true);

  section('cjarRenderCard resolves art through assetFace, keyed by art key');
  const asked = [];
  sandbox.assetFace = (kind, id) => { asked.push([kind, id]); return 'data/art/cjar/img/x.jpg'; };
  node = sandbox.cjarRenderCard({ type:'cookie', value: 15 });
  check('asked for kind cjar + tier key', asked[0], ['cjar', 'cookie-mountain']);
  check('renders as an asset',            node.className.includes('cjar-card-asset'), true);
  check('background-image set',           node.style.cssText.includes('background-image'), true);
  // The value overlay MUST survive the asset branch — it is the whole reason 15
  // cookie values can share 3 tier assets. Without it the art is ambiguous.
  check('value overlay survives the asset branch',
    node.children.some(c => c.className === 'cjar-card-value' && c.textContent === '15'), true);
  sandbox.assetBack = () => 'data/art/cjar/img/back.jpg';
  node = sandbox.cjarRenderCard(null, { faceDown: true });
  check('back uses assetBack', node.style.cssText.includes('back.jpg'), true);
  sandbox.assetFace = () => null; sandbox.assetBack = () => null;   // restore

  section('Core art manifest covers every art key');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/art/cjar/pack.json'), 'utf8'));
  check('kind is cjar',   manifest.assets.kind, 'cjar');
  check('marked core',    manifest.core, true);
  check('13 faces',       Object.keys(manifest.assets.faces).length, 13);
  check('has a back',     typeof manifest.assets.back, 'string');
  check('faces match the 13 derived art keys',
    Object.keys(manifest.assets.faces).sort(), [...allKeys].sort());
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/art/registry.json'), 'utf8'));
  check('cjar is in the core-art registry', reg.includes('cjar'), true);
  // Core art is PRECACHED, never in the Terminal — the whole difference from a skin.
  const packReg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
  check('cjar is NOT a skin pack', packReg.includes('cjar'), false);

  console.log(`\n${'='.repeat(48)}`);
  console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
