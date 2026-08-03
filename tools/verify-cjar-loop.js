// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-loop.js — drives Cookie Jar's BASE-GAME turn loop headlessly.
//
//   node tools/verify-cjar-loop.js        (exits 1 on any failure)
//
// Companion to verify-cjar-deck.js (data layer) and verify-cjar-dd.js (Sylly).
// This one asserts resolution: cjarSplit's remainders, the solo-leaver jackpot,
// the multi-leaver Crumb split, every Treat claim rule, the bust, spectators,
// cjarAllIn() with a departed seat, deck exhaustion, and the match tie-break.
//
// Why it exists: cjar is MDLM-only, so this loop needs four devices and a live
// Firebase room to reach at all. The appliers take an explicit playerIdx and skip
// every broadcast in 'single' mode, so ONE process plays all N seats through the
// real shipped functions. It re-implements no rules.
//
// Sandbox rules, same as the deck tool: setTimeout is CAPTURED not fired, and
// mpSendEnvelope/mpSendPrivate THROW so a leaked broadcast fails loudly.
// Math.random is injected and driven by __rand so House Rules' High Alert draw
// is deterministic rather than flaky.
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
  get data()      { return CJAR_DATA; },
  get stashes()   { return cjarStashes; },
  get totals()    { return cjarRaidTotals; },
  get active()    { return cjarActive; },
  get crumbs()    { return cjarCrumbs; },
  get treat()     { return cjarCounterTreat; },
  get treatsWon() { return cjarTreatsWon; },
  get live()      { return cjarTreatsLive; },
  get copies()    { return cjarFamilyCopies; },
  get highAlert() { return cjarHighAlertId; },
  get seen()      { return cjarSeen; },
  get deck()      { return cjarDeck; },
  get history()   { return cjarRaidHistory; },
  get ready()     { return cjarReadyCheck; },
  get carried()   { return cjarTreatsCarried; },
  get raidNo()    { return cjarRaidNo; },
  get card()      { return cjarCard; },
  get flipSeq()   { return cjarFlipSeq; },
  // Seats a Raid mid-flight so each scenario is deterministic — no dealing.
  seat(o) {
    cjarPlayerCount   = o.players;
    cjarPlayerNames   = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode     = !!o.sylly;
    cjarSnackFriendly = o.snack  || 'off';
    cjarHouseRules    = o.house  || 'burn';
    cjarMatchLength   = o.length || 5;
    cjarOpenBook      = o.openBook === undefined ? true : o.openBook;
    cjarRaidNo        = o.raidNo || 1;
    cjarStashes       = o.stashes    || new Array(o.players).fill(0);
    cjarRaidTotals    = o.totals     || new Array(o.players).fill(0);
    cjarActive        = o.active     || new Array(o.players).fill(true);
    cjarTreatsWon     = o.treatsWon  || new Array(o.players).fill(0);
    cjarCrumbs        = o.crumbs || 0;
    cjarCounterTreat  = o.treat || null;
    cjarFamilyCopies  = o.copies || { mum:3, dad:3, big:3, grandma:3, pet:3 };
    cjarTreatsLive    = o.live || CJAR_DATA.treats.map(t => t.id);
    cjarTreatsCarried = o.carried || [];
    cjarHighAlertId   = null;
    cjarSeen = o.seen || {}; cjarTrail = []; cjarRaidHistory = o.history || [];
    cjarChoices = new Array(o.players).fill(null);
    cjarReadyCheck = new Array(o.players).fill(false);
    cjarCrumbDebt = new Array(o.players).fill(0);
    cjarDeck = o.deck || [];
    cjarFlipSeq = 0; cjarCard = null;
  },
  split(total, heads) { return cjarSplit(total, heads); },
  sneak(leavers)      { return cjarResolveSneak(leavers); },
  bust(familyId)      { return cjarResolveBust(familyId); },
  choose(list)        { cjarChoices = list; },
  cjarSeatsChoosing(a)    { return cjarSeatsChoosing(a); },
  allIn()             { return cjarAllIn(); },
  markReady(i)        { cjarReadyCheck[i] = true; },
  activeCount()       { return cjarActiveCount(); },
  setTreat(id)        { cjarCounterTreat = cjarTreatCard(id); },
  // cjarStartRaid() clears this, but calling it here would also rebuild the deck and
  // assign affinities. The flavour section needs a Raid-fresh pool and nothing else.
  resetLines()        { cjarLinesUsed = {}; },
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
  console.log('Cookie Jar — base-game loop verification\n' + '='.repeat(48));

  section('cjarSplit — every remainder reaches Crumbs, and only through here');
  C.seat({ players: 4 });
  check('9 among 4 → 2 each',       C.split(9, 4), 2);
  check('  remainder 1 to Crumbs',  C.crumbs, 1);
  check('17 among 4 → 4 each',      C.split(17, 4), 4);
  check('  Crumbs accumulate',      C.crumbs, 2);
  check('exact division adds none', [C.split(8, 4), C.crumbs], [2, 2]);
  // headCount 0 happens when the last active player leaves on the same flip a
  // Cookie card resolves — the whole value must land in Crumbs, not vanish.
  check('0 heads → all to Crumbs',  [C.split(6, 0), C.crumbs], [0, 8]);

  section('Solo leaver takes the lot');
  C.seat({ players: 4, totals: [10, 4, 4, 4], crumbs: 7 });
  C.sneak([0]);
  check('banks total + ALL Crumbs', C.stashes, [17, 0, 0, 0]);
  check('Crumb pool emptied',       C.crumbs, 0);
  check('Raid total cleared',       C.totals[0], 0);
  check('now inactive',             C.active, [false, true, true, true]);

  section('Solo leaver is the ONLY way to claim a Treat');
  C.seat({ players: 4, totals: [10, 0, 0, 0], crumbs: 0 });
  C.setTreat('macarons');
  C.sneak([0]);
  check('Treat points added',   C.stashes[0], 20);
  check('Treat tally',          C.treatsWon, [1, 0, 0, 0]);
  check('counter cleared',      C.treat, null);

  section('Two leavers split Crumbs and never claim the Treat');
  C.seat({ players: 4, totals: [10, 6, 0, 0], crumbs: 7 });
  C.setTreat('macarons');
  C.sneak([0, 1]);
  // 7 Crumbs / 2 = 3 each, remainder 1 stays as Crumbs. The pool MUST be drained
  // before the split or cjarSplit's remainder double-counts into itself.
  check('each gets total + 3',   [C.stashes[0], C.stashes[1]], [13, 9]);
  check('remainder 1 stays',     C.crumbs, 1);
  check('Treat untouched',       C.treat !== null, true);
  check('no Treat tally',        C.treatsWon, [0, 0, 0, 0]);
  check('both inactive',         C.active, [false, false, true, true]);

  section('BUSTED — Raid totals only, Cookie Stashes untouched');
  C.seat({ players: 4, stashes: [30, 20, 10, 5], totals: [8, 8, 0, 8], active: [true, true, false, true] });
  C.bust('mum');
  check('every active total zeroed', C.totals, [0, 0, 0, 0]);
  check('Cookie Stashes survive',    C.stashes, [30, 20, 10, 5]);
  check('everyone now inactive',     C.active, [false, false, false, false]);

  section('BUSTED discards a revealed Treat permanently');
  C.seat({ players: 4, totals: [8, 8, 8, 8] });
  C.setTreat('macarons');
  C.bust('mum');
  check('counter cleared',            C.treat, null);
  check('removed from live treats',   C.live.includes('macarons'), false);

  section('House Rules — Standard Burn');
  C.seat({ players: 4, house: 'burn' });
  C.bust('mum');
  check('Mum drops to 2 copies', C.copies.mum, 2);
  check('nobody escalates',      C.highAlert, null);

  section('House Rules — On Guard (nothing burns)');
  C.seat({ players: 4, house: 'on-guard' });
  C.bust('mum');
  check('Mum stays at 3', C.copies.mum, 3);
  check('no escalation',  C.highAlert, null);

  section('House Rules — High Alert (burn AND escalate)');
  C.seat({ players: 4, house: 'high-alert' });
  sandbox.__rand = 0.5;                       // picks the middle of the live pool
  C.bust('mum');
  check('the busting family still burns', C.copies.mum, 2);
  check('someone escalated',              C.highAlert !== null, true);
  check('escalated family has 4 copies',  C.copies[C.highAlert], 4);
  check('alarm-worthy escalation is a real id',
    ['mum','dad','big','grandma','pet'].includes(C.highAlert), true);
  // Delta 6: re-picking the busting family would cancel the burn (3→2→3) and make
  // High Alert a no-op that Raid. This assertion is the whole rule.
  check('escalation never re-picks the busting family', C.highAlert !== 'mum', true);

  section('cjarAllIn gates on ACTIVE seats only');
  // .every(Boolean) here would freeze the Raid forever the moment P1 Sneaks Out.
  C.seat({ players: 4, active: [true, false, true, true] });
  C.markReady(0); C.markReady(2);
  check('not all active seats in yet', C.allIn(), false);
  C.markReady(3);
  check('departed seat does not block', C.allIn(), true);
  check('  and it never submitted',     C.ready, [true, false, true, true]);

  section('cjarAllIn in Sylly needs EVERY seat, not a vacuous empty-array true');
  // cjarActive is empty in Dibber Dobber and [].every() === true, so the base-game
  // form made cjarAllIn() always true — the host resolved on the first tap and seats
  // 2..N never chose. Found by a two-device loopback; invisible to the DD harness,
  // which calls cjarResolveFlipDD directly and never routes through this gate. BUG-05.
  // active: [] mirrors what cjarStartRaid's Sylly branch actually does. seat() would
  // otherwise fill it with `true`s, and the base-game form would then also demand all
  // four seats — so the test would pass without ever exercising the Sylly branch.
  C.seat({ players: 4, sylly: true, active: [] });
  check('sylly: cjarActive is empty',  C.active, []);
  check('nobody in yet → false',       C.allIn(), false);
  C.markReady(0); C.markReady(1); C.markReady(2);
  check('three of four in → still false', C.allIn(), false);
  C.markReady(3);
  check('all four in → true',          C.allIn(), true);

  section('cjarSeatsChoosing');
  C.seat({ players: 5 });
  C.choose(['take', 'sneak', 'take', null, 'sneak']);
  check('takers',  C.cjarSeatsChoosing('take'),  [0, 2]);
  check('sneaks',  C.cjarSeatsChoosing('sneak'), [1, 4]);
  check('unknown action → empty', C.cjarSeatsChoosing('dob'), []);

  section('Card reveal — a Cookie splits among ACTIVE players immediately');
  // The card's effect lands BEFORE anyone chooses (Delta 3). If it landed after,
  // a player who could see a bust card coming would Sneak Out for free.
  C.seat({ players: 4, deck: [{ type:'cookie', value: 9 }] });
  let r = sandbox.cjarApplyCardEffect();
  check('not a bust',            r.busted, false);
  check('9 / 4 = 2 each',        C.totals, [2, 2, 2, 2]);
  check('remainder 1 to Crumbs', C.crumbs, 1);
  check('card is on the table',  C.card.value, 9);
  check('deck popped',           C.deck.length, 0);

  section('Card reveal — a departed seat gets no share');
  C.seat({ players: 4, active: [true, false, true, true], deck: [{ type:'cookie', value: 9 }] });
  sandbox.cjarApplyCardEffect();
  check('9 / 3 = 3 each, spectator skipped', C.totals, [3, 0, 3, 3]);
  check('no remainder',                      C.crumbs, 0);

  section('Card reveal — first Caught! is a scare, second is a BUST');
  C.seat({ players: 4, totals: [5, 5, 5, 5], deck: [{ type:'family', id:'mum' }, { type:'family', id:'mum' }] });
  r = sandbox.cjarApplyCardEffect();
  check('first Mum does not bust', r.busted, false);
  check('  she is now seen',       C.seen.mum, 1);
  check('  nobody loses anything', C.totals, [5, 5, 5, 5]);
  r = sandbox.cjarApplyCardEffect();
  check('second Mum busts',        r.busted, true);
  check('  names the family',      r.bustFamilyId, 'mum');
  check('  Raid totals wiped',     C.totals, [0, 0, 0, 0]);

  section('Card reveal — a different family does not compound');
  C.seat({ players: 4, deck: [{ type:'family', id:'mum' }, { type:'family', id:'dad' }] });
  sandbox.cjarApplyCardEffect();
  check('second family, first sighting', sandbox.cjarApplyCardEffect().busted, false);
  check('both seen once',                [C.seen.mum, C.seen.dad], [1, 1]);

  section('Card reveal — a Treat sits on the counter, unclaimed');
  C.seat({ players: 4, deck: [{ type:'treat', id:'macarons', points:10, tier:'super' }] });
  sandbox.cjarApplyCardEffect();
  check('on the counter', C.treat.id, 'macarons');
  check('nobody scored',  C.stashes, [0, 0, 0, 0]);

  section('cjarApplyChoice — stale flipSeq is dropped (the PKO BUG-01 class)');
  C.seat({ players: 4, deck: [{ type:'cookie', value: 8 }] });
  sandbox.cjarApplyCardEffect();
  const seq = C.flipSeq;
  check('current seq accepted',  sandbox.cjarApplyChoice(0, 'take', seq), true);
  check('repeat rejected',       sandbox.cjarApplyChoice(0, 'sneak', seq), false);
  check('  first choice stands', C.ready[0], true);
  check('stale seq rejected',    sandbox.cjarApplyChoice(1, 'take', seq - 1), false);
  check('  seat 1 still open',   C.ready[1], false);
  C.seat({ players: 4, active: [true, false, true, true] });
  check('inactive seat rejected', sandbox.cjarApplyChoice(1, 'take', C.flipSeq), false);

  section('cjarResolveFlip — nobody leaves, Raid continues');
  C.seat({ players: 4, totals: [6, 6, 6, 6], deck: [{ type:'cookie', value: 4 }] });
  C.choose(['take', 'take', 'take', 'take']);
  r = sandbox.cjarResolveFlip(['take', 'take', 'take', 'take']);
  check('no deltas',        r.deltas, [0, 0, 0, 0]);
  check('Raid continues',   r.raidEnded, false);
  check('everyone still in', C.active, [true, true, true, true]);

  section('cjarResolveFlip — the last player out ends the Raid');
  C.seat({ players: 4, totals: [6, 3, 3, 3], active: [true, false, false, false], crumbs: 5 });
  r = sandbox.cjarResolveFlip(['sneak', null, null, null]);
  check('banked total + all Crumbs', C.stashes[0], 11);
  check('delta reported',            r.deltas[0], 11);
  check('Raid ended',                r.raidEnded, true);

  section('Deck exhaustion with players still in resolves as a group exit (D-04)');
  C.seat({ players: 4, totals: [10, 6, 4, 0], active: [true, true, true, false], crumbs: 7, deck: [] });
  C.setTreat('macarons');
  r = sandbox.cjarResolveFlip(['take', 'take', 'take', null]);
  check('three-way Crumb split of 7 → 2 each', [C.stashes[0], C.stashes[1], C.stashes[2]], [12, 8, 6]);
  check('remainder discarded, pool empty',     C.crumbs, 0);
  check('counter Treat discarded, unclaimed',  C.treat, null);
  check('nobody won a Treat',                  C.treatsWon, [0, 0, 0, 0]);
  check('Raid ended',                          r.raidEnded, true);

  section('Deck exhaustion with ONE player in is a genuine solo exit');
  // Pinned deliberately: cjarResolveSneak's solo branch runs, so the last player
  // standing DOES claim the Treat. Falls out of D-04's "run cjarResolveSneak(allActive)".
  C.seat({ players: 4, totals: [10, 0, 0, 0], active: [true, false, false, false], crumbs: 3, deck: [] });
  C.setTreat('macarons');
  sandbox.cjarResolveFlip(['take', null, null, null]);
  check('solo keeps total + Crumbs + Treat', C.stashes[0], 23);
  check('and the Treat tally',               C.treatsWon[0], 1);

  section('cjarFlavourLine draws without replacement within a Raid');
  C.seat({ players: 4 });
  // MANDATORY. The family-card sections above already consumed 2 of Mum's 4 warn
  // lines, so without this the 4 draws below straddle a pool reset and the
  // distinctness claim is false — it survives only because __rand is still pinned at
  // 0.5 from the High Alert section. Measured: under real randomness that variant
  // fails 83% of the time; on a Raid-fresh pool it holds at every seed tested.
  C.resetLines();
  const warns = new Set();
  for (let k = 0; k < 4; k++) warns.add(sandbox.cjarFlavourLine('mum', 'warn'));
  check('four distinct warn lines', warns.size, 4);
  // Real membership assertion. The plan shipped `data ? true : true` here, which is
  // vacuous — the loop bridge had no `data` getter, so it passed unconditionally and
  // read as coverage that did not exist. Getter added; this now checks what it says.
  check('all real Mum lines',
    [...warns].every(l => C.data.family.find(f => f.id === 'mum').warn.includes(l)), true);
  check('pool exhausted → still returns a line',
    typeof sandbox.cjarFlavourLine('mum', 'warn'), 'string');

  section('Match start seeds the table');
  // Seated DIRTY on purpose. seat() primes stashes/treatsWon/copies to the very values
  // asserted below, so seating clean would let a do-nothing cjarStartMatch pass four of
  // these five checks — they would be testing seat(), not the function under test.
  // Every value here is deliberately wrong so only a real reset can satisfy the section.
  C.seat({ players: 4, sylly: false, raidNo: 4,
           stashes: [9, 9, 9, 9], treatsWon: [7, 7, 7, 7],
           copies: { mum:1, dad:1, big:1, grandma:1, pet:1 },
           carried: ['macarons'], live: ['macarons'] });
  sandbox.cjarStartMatch();
  check('Cookie Stashes start at zero',  C.stashes, [0, 0, 0, 0]);
  check('Treat tallies start at zero',   C.treatsWon, [0, 0, 0, 0]);
  check('family copies fresh',           C.copies, { mum:3, dad:3, big:3, grandma:3, pet:3 });
  check('Raid 1 is open',                C.raidNo, 1);
  check('deck dealt',                    C.deck.length > 0, true);
  check('carried treats cleared',        C.carried, []);
  check('all five treats live again',    C.live.length, 5);

  section('Sylly seeds 5 cookies ONCE per match, never per Raid');
  C.seat({ players: 4, sylly: true, stashes: [9, 9, 9, 9] });
  sandbox.cjarStartMatch();
  check('everyone starts on 5', C.stashes, [5, 5, 5, 5]);
  const afterRaid1 = C.stashes.slice();
  sandbox.cjarStartRaid();
  check('Raid 2 grants nothing more', C.stashes, afterRaid1);

  section('Tie-break — highest total wins');
  C.seat({ players: 4, stashes: [30, 45, 12, 45], treatsWon: [0, 1, 0, 0] });
  check('most cookies, Treats break the tie', sandbox.cjarRanks(), [3, 1, 4, 2]);

  section('Tie-break — equal totals AND equal Treats share a rank');
  C.seat({ players: 4, stashes: [50, 30, 30, 10], treatsWon: [0, 1, 1, 0] });
  // Shared 2nd twice, then 4th — "3rd" is skipped (PKO precedent).
  check('shared rank, next skipped', sandbox.cjarRanks(), [1, 2, 2, 4]);
  check('Red-Handed is the single last', sandbox.cjarRedHanded(), [3]);

  section('Red-Handed can be shared');
  C.seat({ players: 4, stashes: [50, 40, 10, 10], treatsWon: [0, 0, 2, 2] });
  check('two on the bottom rank', sandbox.cjarRedHanded(), [2, 3]);

  section('Red-Handed — an all-square match has no last place');
  // Found by driving a full 3-Raid match: everyone tied on 3 cookies, so max(ranks)
  // equalled min(ranks) and every seat rendered as BOTH Top Cookie Thief and
  // Red-Handed. Joint winners are fine; a joint wooden spoon for the winners is not.
  C.seat({ players: 4, stashes: [3, 3, 3, 3], treatsWon: [0, 0, 0, 0] });
  check('everyone joint 1st',   sandbox.cjarRanks(), [1, 1, 1, 1]);
  check('nobody is Red-Handed', sandbox.cjarRedHanded(), []);
  // A genuine shared last place must still report, so the guard is not too broad.
  C.seat({ players: 4, stashes: [9, 9, 2, 2], treatsWon: [0, 0, 0, 0] });
  check('shared last still reports', sandbox.cjarRedHanded(), [2, 3]);

  section('Rank labels');
  check('ordinals', [1,2,3,4,5,6,7,8].map(n => sandbox.cjarRankLabel(n)),
    ['1st','2nd','3rd','4th','5th','6th','7th','8th']);

  section('A full 3-Raid match banks a history row per Raid');
  C.seat({ players: 4, sylly: false, length: 3 });
  sandbox.cjarStartMatch();
  for (let raid = 1; raid <= 3; raid++) {
    if (raid > 1) sandbox.cjarStartRaid();
    let guard = 0;
    while (guard++ < 200) {
      const eff = sandbox.cjarApplyCardEffect();
      if (eff.busted) break;
      if (!C.card) break;
      const res = sandbox.cjarResolveFlip(new Array(4).fill('take'));
      if (res.raidEnded) break;
    }
    sandbox.cjarEndRaid('deckout');
  }
  check('three history rows', C.history.length, 3);
  check('every row has one entry per player', C.history.every(r => r.length === 4), true);
  check('no negative bank', C.history.every(r => r.every(v => v >= 0)), true);
  check('ranks cover every seat', sandbox.cjarRanks().length, 4);

  console.log(`\n${'='.repeat(48)}`);
  console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
