// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-dd.js — asserts Cookie Jar's SYLLY MODE (Dibber Dobber) headlessly.
//
//   node tools/verify-cjar-dd.js        (exits 1 on any failure)
//
// Third of three: verify-cjar-deck.js (data), verify-cjar-loop.js (base game),
// this one (Dibber Dobber). Covers the two ledger primitives and Crumb Debt, all
// three card types against every action combination, the scare-off, Treat priority
// and the per-Raid affinities.
//
// Why it exists: Dibber Dobber is structurally a different game from the base —
// no cjarActive, no cjarRaidTotals, no bust, nobody leaves — so none of the base
// harness's coverage carries over. And like the rest of cjar it is MDLM-only, so
// without this the rules would first execute on four real devices.
//
// Sandbox rules, same as the other two: setTimeout is CAPTURED not fired, and
// mpSendEnvelope/mpSendPrivate THROW so a leaked broadcast fails loudly.
// Math.random is injected and driven by __rand so the affinity draw is
// deterministic rather than flaky.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/cjar-data.json'), 'utf8');

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
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
  __rand: 0,
};
sandbox.Math = Object.create(Math);
sandbox.Math.random = () => sandbox.__rand;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__cjar = {
  get stashes()  { return cjarStashes; },
  get crumbs()   { return cjarCrumbs; },
  get debt()     { return cjarCrumbDebt; },
  get treat()    { return cjarCounterTreat; },
  get treatsWon(){ return cjarTreatsWon; },
  get fav()      { return cjarFavourite; },
  get watch()    { return cjarWatcher; },
  get card()     { return cjarCard; },
  seat(o) {
    cjarPlayerCount = o.players;
    cjarPlayerNames = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode   = true;
    cjarMatchLength = o.length || 5;
    cjarRaidNo      = o.raidNo || 1;
    cjarStashes     = o.stashes   || new Array(o.players).fill(10);
    cjarTreatsWon   = o.treatsWon || new Array(o.players).fill(0);
    cjarCrumbDebt   = o.debt      || new Array(o.players).fill(0);
    cjarFavourite   = o.fav   || new Array(o.players).fill(null);
    cjarWatcher     = o.watch || new Array(o.players).fill(null);
    cjarCrumbs      = o.crumbs || 0;
    cjarCounterTreat = null;
    cjarChoices = new Array(o.players).fill('innocent');
    cjarReadyCheck = new Array(o.players).fill(false);
    cjarActive = []; cjarRaidTotals = []; cjarTrail = []; cjarLinesUsed = {};
    cjarDeck = []; cjarSeen = {};
  },
  gain(i, n) { cjarDDGain(i, n); },
  pay(i, n)  { cjarDDPay(i, n); },
  // Puts a card on the table and resolves the given choices in one call.
  play(card, choices) {
    cjarCard = card;
    if (card && card.type === 'treat') cjarCounterTreat = card;
    cjarChoices = choices;
    const lines = new Array(cjarPlayerCount).fill('');
    return { ended: cjarResolveFlipDD(lines), lines };
  },
  setTreat(id) { cjarCounterTreat = cjarTreatCard(id); },
  assign() { cjarAssignAffinities(); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  await sandbox.cjarLoadData();
  const C = sandbox.__cjar;
  console.log('Cookie Jar — Dibber Dobber verification\n' + '='.repeat(48));

  section('The ledger primitives — nothing touches cjarStashes directly');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.pay(0, 4);
  check('paid into Crumbs', [C.stashes[0], C.crumbs], [6, 4]);
  check('no debt',          C.debt[0], 0);

  section('An unpayable loss becomes Crumb Debt');
  C.seat({ players: 4, stashes: [1, 10, 10, 10] });
  C.pay(0, 4);
  check('paid what it could',  [C.stashes[0], C.crumbs], [0, 1]);
  check('shortfall becomes debt', C.debt[0], 3);
  check('never negative',      C.stashes[0] >= 0, true);

  section('Debt is repaid out of the next gain, into Crumbs');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [3, 0, 0, 0] });
  C.gain(0, 5);
  check('3 repaid, 2 kept',   C.stashes[0], 2);
  check('repayment fed Crumbs', C.crumbs, 3);
  check('debt cleared',       C.debt[0], 0);
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [5, 0, 0, 0] });
  C.gain(0, 2);
  check('partial repayment',  [C.stashes[0], C.debt[0], C.crumbs], [0, 3, 2]);

  section('Crumb Debt is capped so a young player can always dig out');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [5, 0, 0, 0] });
  C.pay(0, 4);
  check('capped at 6', C.debt[0], 6);
  C.pay(0, 4);
  check('further shortfall absorbed, not tracked', C.debt[0], 6);

  section('Cookie card — takers split it');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 9 }, ['take', 'take', 'innocent', 'innocent']);
  // 9 / 2 takers = 4 each, remainder 1 to Crumbs; then the scare-off pays the two
  // Innocents that same 1 (splits to 0 each, remainder 1 back to Crumbs).
  check('takers get 4 each', [C.stashes[0], C.stashes[1]], [4, 4]);
  check('innocents absorb what they can', [C.stashes[2], C.stashes[3]], [0, 0]);
  check('Crumbs hold the indivisible remainder', C.crumbs, 1);

  section('Cookie card — a Dobber steals from the takers');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 9 }, ['take', 'take', 'dob', 'innocent']);
  check('1 dobber steals 2',      C.stashes[2], 2);
  check('takers split the rest (7/2)', [C.stashes[0], C.stashes[1]], [3, 3]);
  // A Dobber's presence denies the Innocents the pile on BOTH card types.
  check('scare-off denied — innocent gets nothing', C.stashes[3], 0);
  check('remainder sits in Crumbs untouched',       C.crumbs, 1);

  section('Dob steal is capped at the card value');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 3 }, ['take', 'dob', 'dob', 'innocent']);
  check('2 dobbers want 4, card is 3', C.stashes[1] + C.stashes[2], 2); // 3/2 = 1 each, rem 1
  check('taker gets nothing left',     C.stashes[0], 0);

  section('Only Dobbers, no takers — the accusation backfires');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.play({ type:'cookie', value: 9 }, ['dob', 'dob', 'innocent', 'innocent']);
  check('each dobber pays 2',   [C.stashes[0], C.stashes[1]], [8, 8]);
  check('card value unclaimed → Crumbs, plus the 4 paid', C.crumbs, 13);
  check('scare-off denied by the Dobbers', [C.stashes[2], C.stashes[3]], [10, 10]);

  section('Everyone plays innocent — they absorb their own contribution');
  // Ordering is load-bearing: the card value goes to Crumbs FIRST, then scare-off
  // runs, so an all-innocent flip immediately splits what it just created.
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 8 }, ['innocent', 'innocent', 'innocent', 'innocent']);
  check('8 / 4 = 2 each', C.stashes, [2, 2, 2, 2]);
  check('pool emptied',   C.crumbs, 0);

  section('Caught! card — no bust, and your own choice decides your fate');
  C.seat({ players: 4, stashes: [10, 10, 10, 10],
           fav:   ['mum',  null,  null,   null],
           watch: [null,  'mum',  null,   null] });
  C.play({ type:'family', id:'mum' }, ['take', 'take', 'take', 'innocent']);
  check('Favourite looks away — costs 0', C.stashes[0], 10);
  check('Watcher costs double — 4',       C.stashes[1], 6);
  check('neutral costs 2',                C.stashes[2], 8);
  check('the innocent sweeps the pile',   C.stashes[3], 16);
  check('pool emptied by the scare-off',  C.crumbs, 0);

  section('Caught! card — a Dob ALWAYS backfires');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.play({ type:'family', id:'mum' }, ['dob', 'dob', 'innocent', 'innocent']);
  check('both dobbers pay 2',       [C.stashes[0], C.stashes[1]], [8, 8]);
  check('innocents denied the pile', [C.stashes[2], C.stashes[3]], [10, 10]);
  check('the 4 sits in Crumbs',      C.crumbs, 4);

  section('Treat — priority Take > Dob > Play Innocent, evaluated IN ORDER');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'dob', 'innocent', 'innocent']);
  check('the sole taker wins it', C.stashes[0], 10);
  check('Treat tally',            C.treatsWon, [1, 0, 0, 0]);
  check('counter cleared',        C.treat, null);

  section('Treat — a sole Dobber beats a sole Innocent');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'take', 'dob', 'innocent']);
  // Two takers means no sole taker, so priority falls to the sole Dobber — even
  // though there is also exactly one Innocent. Higher priority wins outright.
  check('sole dobber takes it', C.stashes[2], 10);
  check('sole innocent gets nothing from the Treat', C.stashes[3] < 10, true);

  section('Treat — nobody uniquely solo, so it re-contests next flip');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'take', 'innocent', 'innocent']);
  check('still on the counter', C.treat && C.treat.id, 'macarons');
  check('nobody scored it',     C.treatsWon, [0, 0, 0, 0]);

  section('Treat is re-contested on a LATER flip while it sits');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.setTreat('macarons');
  C.play({ type:'cookie', value: 4 }, ['take', 'innocent', 'innocent', 'innocent']);
  check('sole taker claims the sitting Treat', C.stashes[0] >= 10, true);
  check('counter cleared',                     C.treat, null);

  section('A player at zero stays in and can still win');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [4, 0, 0, 0] });
  C.play({ type:'cookie', value: 12 }, ['innocent', 'take', 'take', 'take']);
  check('never goes negative', C.stashes.every(s => s >= 0), true);

  section('Affinities — Favourite and Watcher are always different');
  let clash = 0;
  for (let n = 0; n < 200; n++) {
    sandbox.__rand = (n % 97) / 97;
    C.seat({ players: 6 });
    C.assign();
    for (let i = 0; i < 6; i++) if (C.fav[i] === C.watch[i]) clash++;
  }
  check('never the same family member', clash, 0);
  C.seat({ players: 5 });
  C.assign();
  check('one Favourite per seat', C.fav.filter(Boolean).length, 5);
  check('one Watcher per seat',   C.watch.filter(Boolean).length, 5);
  check('all are real family ids',
    C.fav.concat(C.watch).every(id => ['mum','dad','big','grandma','pet'].includes(id)), true);

  console.log(`\n${'='.repeat(48)}`);
  console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
