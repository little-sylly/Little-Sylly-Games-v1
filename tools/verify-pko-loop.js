// ═══════════════════════════════════════════════════════════════════════════
// verify-pko-loop.js — drives a full Pecking Order turn loop headlessly.
//
//   node tools/verify-pko-loop.js        (exits 1 on any failure)
//
// Companion to verify-pko-chain.js: that one asserts the DATA layer (the chain
// and the Pool arithmetic), this one asserts the TURN LOOP — Stake → Challenge →
// Stampede → Retreat → Unchallenged → Clash end → Match end, plus every rejection
// path in the host's re-validation.
//
// Why it exists: the loop otherwise needs three devices and a live Firebase room
// to exercise at all, so the first Challenge ever played would also be the first
// time the code ran. The host appliers take an explicit playerIdx and, in 'single'
// mode, skip every broadcast — so ONE process can play all four seats through the
// real shipped functions. It re-implements no rules; every assertion runs against
// js/games/pko.js itself.
//
// Gotcha (same as the chain tool): `let` in a vm-evaluated script creates a lexical
// binding, NOT a property on the context object, so pkoMarks & friends are invisible
// from out here. The appended bridge exposes them. `function` declarations DO land on
// the object, which is why the appliers are callable directly.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const chainJson = fs.readFileSync(path.join(ROOT, 'data/pko-data.json'), 'utf8');

// ── Sandbox ───────────────────────────────────────────────────────────────
// getElementById returns null throughout, so every render function short-circuits
// on its own guard — the loop runs with no DOM and no stubbed markup to drift.
const screens = [];
const timers  = [];                       // setTimeout is captured, never fired on its
                                          // own: the Unchallenged interstitial's 2.5 s
                                          // advance is stepped manually by the test.
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(chainJson)) }),
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {},
  // Audio + multiplayer surface the loop touches. mpSendEnvelope must never be
  // reached in 'single' mode — if one slips through, this throws rather than passing.
  playLaunch() {}, playBoing() {}, playWhoosh() {}, playDone() {}, playPillClick() {},
  playSyllyOn() {}, playSyllyOff() {}, playStampede() {}, playUnchallenged() {},
  playPoacher() {}, playClashWin() {}, playSuccess() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [],
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__pko = {
  get marks()       { return pkoMarks; },
  get owner()       { return pkoMarkOwnerIdx; },
  get turn()        { return pkoTurnIdx; },
  get retreated()   { return pkoRetreatedSince; },
  get hoards()      { return pkoHoards; },
  get counts()      { return pkoHoardCounts; },
  get scores()      { return pkoScores; },
  get history()     { return pkoClashHistory; },
  get leader()      { return pkoLeaderIdx; },
  get encounter()   { return pkoEncounterNum; },
  get watering()    { return pkoWateringHole; },
  // Batch records { enc, cards } — flattened for the conservation census.
  get wateringFlat(){ return pkoWateringHole.flatMap(b => b.cards); },
  get holeCount()   { return pkoHoleCount(); },
  get reserve()     { return pkoReserve; },
  get trail()       { return pkoTrail; },
  get draft()       { return pkoDraft; },
  // Seats the table directly instead of dealing, so every scenario is deterministic.
  seat(o) {
    pkoPlayerCount = o.hoards.length;
    pkoPlayerNames = o.hoards.map((_, i) => 'P' + i);
    pkoHoards      = o.hoards.map(h => [...h]);
    pkoHoardCounts = pkoHoards.map(h => h.length);
    pkoMarks          = [...(o.marks || [])];
    pkoMarkOwnerIdx   = o.owner === undefined ? -1 : o.owner;
    pkoTurnIdx        = o.turn  || 0;
    pkoRetreatedSince = o.retreated || new Array(pkoPlayerCount).fill(false);
    pkoScores         = o.scores || new Array(pkoPlayerCount).fill(0);
    pkoClashHistory = []; pkoWateringHole = []; pkoReserve = o.reserve || [];
    pkoTrail = []; pkoEncounterNum = 1; pkoClashNum = 1; pkoLeaderIdx = 0;
    // seat() lands on Clash 1 / Encounter 1, which is exactly when Small Fry bites — so it
    // defaults OFF here and each Small Fry scenario opts in explicitly.
    pkoStartSmall = o.startSmall || 'off';
    pkoMyHoard = pkoHoards[0];
  },
  set(k, v) {
    if (k === 'clashTarget') pkoClashTarget = v;
    if (k === 'scavenge')    pkoScavenge    = v;
    if (k === 'marks')       pkoMarks       = [...v];
    if (k === 'myHoard')     pkoMyHoard     = [...v];
    if (k === 'startSmall')  pkoStartSmall  = v;
    if (k === 'encounter')   pkoEncounterNum = v;
    if (k === 'clash')       pkoClashNum    = v;
  },
  canStampede() { return pkoCanStampede(); },
  // Appetite is a settings-level rules variant, so the loop must prove the HOST's
  // re-validation honours it — not just that the builder highlights differently.
  setAppetite(v) { pkoAppetite = v; },
  answers(mark, cards) { return pkoAnswers(mark, cards); },
  // The TABLE fan's answer path (BUG-05 lived here, not in the appliers). Every render call
  // it makes is DOM-guarded, so the real function runs unmodified against a null document.
  tapAnswer(id) {
    const grp = pkoGroupHoard(pkoSortHoard(pkoMyHoard)).find(g => g.id === id);
    if (!grp) return 'NO_GROUP';
    pkoCycleAnswerGroup(grp);
    return this.draftIds();
  },
  draftIds() {
    const s = pkoSortHoard(pkoMyHoard);
    return pkoDraft.map(g => g.map(p => s[p]));
  },
  draftComplete() { return pkoDraftComplete(); },
  armDraft() { pkoDraft = pkoMarks.map(() => []); },
};`;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/pko.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/pko.js' });

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
  await sandbox.pkoLoadChain();
  const P = sandbox.__pko;
  const { pkoApplyStake, pkoApplyChallenge, pkoApplyStampede, pkoApplyRetreat,
          pkoResolveClash } = sandbox;

  console.log('Pecking Order — turn loop verification\n' + '='.repeat(48));

  // ══ 1. Stake ════════════════════════════════════════════════════════════
  section('Stake opens the Encounter');
  P.seat({
    hoards: [['mouse', 'mouse', 'bee'], ['mongoose', 'eagle', 'fish'],
             ['leopard', 'human', 'bear'], ['eagle', 'elephant', 'bear']],
    turn: 0,
  });
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('two Staked cards become two SEPARATE Marks', P.marks, ['mouse', 'mouse']);
  check('the Staker owns the board', P.owner, 0);
  check('Staked cards leave the Hoard', P.hoards[0], ['bee']);
  check('public Hoard count follows', P.counts, [1, 3, 3, 3]);
  check('turn passes clockwise, skipping the owner', P.turn, 1);
  check('nobody has Retreated since the board changed', P.retreated, [false, false, false, false]);

  section('Stake rejections leave the board untouched');
  P.seat({ hoards: [['mouse', 'bee'], ['eagle'], ['bear'], ['fish']], turn: 0 });
  pkoApplyStake(0, { cards: ['mouse', 'bee'] });
  check('mixed species is refused', P.marks, []);
  pkoApplyStake(0, { cards: ['leopard'] });
  check('a card not in the Hoard is refused', P.marks, []);
  pkoApplyStake(1, { cards: ['eagle'] });
  check('out of turn is refused', P.marks, []);
  P.seat({ hoards: [['human', 'mouse'], ['eagle'], ['bear'], ['fish']], turn: 0 });
  pkoApplyStake(0, { cards: ['human'] });
  check('a Poacher cannot be Staked as an animal', P.marks, []);

  // ══ 2. Challenge ════════════════════════════════════════════════════════
  section('Challenge answers every Mark, one card per Mark');
  P.seat({
    hoards: [['bee'], ['mongoose', 'eagle', 'fish'], ['leopard', 'human', 'bear'], ['eagle', 'elephant']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('the Challenge becomes the new board', P.marks, ['mongoose', 'eagle']);
  check('the challenger owns it', P.owner, 1);
  check('the played cards leave the Hoard', P.hoards[1], ['fish']);
  check('the answered Marks go to the Watering Hole', P.wateringFlat, ['mouse', 'mouse']);
  check('board width is unchanged — a Challenge sheds exactly what it beat',
    P.marks.length, 2);
  check('turn passes clockwise from the new owner', P.turn, 2);

  section('Challenge rejections — the host re-validates every slot');
  const reseat = () => P.seat({
    hoards: [['bee'], ['mongoose', 'eagle'], ['bear', 'bear', 'human'], ['eagle', 'elephant']],
    marks: ['mongoose', 'eagle'], owner: 0, turn: 2,
  });
  reseat(); pkoApplyChallenge(2, { assignments: [['bear'], ['bear']] });
  check('a card that beats neither Mark is refused', P.marks, ['mongoose', 'eagle']);
  reseat(); pkoApplyChallenge(2, { assignments: [['bear']] });
  check('too few cards for the board is refused', P.marks, ['mongoose', 'eagle']);
  reseat(); pkoApplyChallenge(2, { assignments: [['bear'], ['bear'], ['human']] });
  check('too many cards is refused', P.marks, ['mongoose', 'eagle']);
  reseat(); pkoApplyChallenge(2, { assignments: [['leopard'], ['human']] });
  check('a card not held is refused', P.marks, ['mongoose', 'eagle']);
  reseat(); pkoApplyChallenge(3, { assignments: [['eagle'], ['elephant']] });
  check('out of turn is refused', P.marks, ['mongoose', 'eagle']);
  reseat(); pkoApplyChallenge(2, { assignments: [null, ['human']] });
  check('an unfilled slot is refused', P.marks, ['mongoose', 'eagle']);

  section('Slot ORDER is load-bearing — right cards, wrong slots is illegal');
  // Leopard beats Mongoose and Bear beats Leopard, but neither answers the OTHER slot.
  P.seat({
    hoards: [['bee'], ['fish'], ['leopard', 'bear'], ['eagle']],
    marks: ['mongoose', 'leopard'], owner: 0, turn: 2,
  });
  pkoApplyChallenge(2, { assignments: [['bear'], ['leopard']] });
  check('swapped assignments are refused', P.marks, ['mongoose', 'leopard']);
  pkoApplyChallenge(2, { assignments: [['leopard'], ['bear']] });
  check('the same two cards in the right slots succeed', P.marks, ['leopard', 'bear']);

  // ══ 3. The Poacher (spec §16 Q1a — resolved option (a)) ═════════════════
  section('The Poacher wins any one Mark — and becomes an unbeatable Mark');
  P.seat({
    hoards: [['bee'], ['fish'], ['leopard', 'human', 'bear'], ['eagle', 'bear', 'elephant']],
    marks: ['mongoose', 'eagle'], owner: 0, turn: 2,
  });
  pkoApplyChallenge(2, { assignments: [['leopard'], ['human']] });
  check('a Poacher answers the Eagle nothing else can beat', P.marks, ['leopard', 'human']);
  pkoApplyChallenge(3, { assignments: [['bear'], ['elephant']] });
  check('nothing in the chain answers the Poacher-Mark', P.marks, ['leopard', 'human']);
  check('…so the Hoard that tried is untouched', P.hoards[3], ['eagle', 'bear', 'elephant']);

  // ══ 4. Retreat and the response window ══════════════════════════════════
  section('Retreat is not a lock-out — a board change forgives every Retreat');
  P.seat({
    hoards: [['bee', 'bee'], ['mongoose', 'eagle'], ['mongoose', 'eagle', 'bear'], ['eagle', 'elephant']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyRetreat(1);
  check('the Retreater is flagged', P.retreated, [false, true, false, false]);
  check('turn skips them', P.turn, 2);
  pkoApplyChallenge(2, { assignments: [['mongoose'], ['eagle']] });
  check('a successful Challenge clears every Retreat flag',
    P.retreated, [false, false, false, false]);
  check('the window restarts clockwise from the new owner', P.turn, 3);

  section('Encounter ends when everyone but the owner has Retreated');
  P.seat({
    hoards: [['bee', 'bee'], ['fish'], ['octopus'], ['seal']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyRetreat(1); pkoApplyRetreat(2);
  check('two of three Retreats does not end it', screens.includes('screen-pko-unchallenged'), false);
  pkoApplyRetreat(3);
  check('the third ends the Encounter', screens.pop(), 'screen-pko-unchallenged');
  check('the board owner takes it and leads next', P.leader, 0);
  check('the winning board goes to the Watering Hole', P.wateringFlat, ['mouse', 'mouse']);
  check('the board is cleared immediately, not on the timer', P.marks, []);
  check('the host scheduled the 2.5 s auto-advance', timers[timers.length - 1].ms, 2500);

  // A client that tapped Retreat just before the Encounter closed still has an ACTION
  // in flight. It must be dropped, not resolve the Encounter a second time.
  const timerCount = timers.length;
  pkoApplyRetreat(3);
  check('a late Retreat after the Encounter closed is dropped',
    [P.wateringFlat, timers.length], [['mouse', 'mouse'], timerCount]);
  timers.pop().fn();                                        // step the interstitial
  check('the next Encounter opens with an empty board', P.marks, []);
  check('…led by the Unchallenged winner', P.turn, 0);
  check('…and the Encounter counter advanced', P.encounter, 2);

  section('Scavenge draws one from the Reserve on Retreat');
  P.set('scavenge', true);
  P.seat({
    hoards: [['bee', 'bee'], ['fish'], ['octopus'], ['seal']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1, reserve: ['bear', 'orca'],
  });
  pkoApplyRetreat(1);
  check('the Retreater gains a card', P.hoards[1], ['fish', 'bear']);
  check('…taken off the Reserve', P.reserve, ['orca']);
  check('…and the public count reflects it', P.counts[1], 2);
  P.set('scavenge', false);

  // ══ 5. Stampede ═════════════════════════════════════════════════════════
  section('Stampede takes the board and returns it one Mark wider');
  P.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'mouse', 'fish'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('N+1 SEPARATE single-card Marks, never a stack', P.marks, ['mouse', 'mouse', 'mouse']);
  check('the stampeder owns the board', P.owner, 1);
  check('N+1 copies leave the Hoard', P.hoards[1], ['fish']);
  check('the old board goes to the Watering Hole', P.wateringFlat, ['mouse', 'mouse']);

  section('Stampede rejections');
  const restamp = () => P.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'mouse', 'human'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  restamp(); pkoApplyStampede(1, { species: 'mouse', count: 2 });
  check('matching the board width is not enough — needs N+1', P.marks, ['mouse', 'mouse']);
  restamp(); pkoApplyStampede(1, { species: 'mouse', count: 4 });
  check('more than N+1 is refused', P.marks, ['mouse', 'mouse']);
  restamp(); pkoApplyStampede(1, { species: 'fish', count: 3 });
  check('a different species is refused', P.marks, ['mouse', 'mouse']);
  restamp(); pkoApplyStampede(2, { species: 'mouse', count: 3 });
  check('out of turn is refused', P.marks, ['mouse', 'mouse']);
  // A Poacher can neither be the Stampede species nor pad the threshold.
  P.seat({
    hoards: [['bee'], ['human', 'human', 'human'], ['leopard'], ['eagle']],
    marks: ['human', 'human'], owner: 0, turn: 1,
  });
  pkoApplyStampede(1, { species: 'human', count: 3 });
  check('you cannot Stampede Poachers', P.marks, ['human', 'human']);
  P.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'human'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('a Poacher cannot pad the threshold', P.marks, ['mouse', 'mouse']);
  // A mixed board is not Stampede-able at all.
  P.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'mouse'], ['leopard'], ['eagle']],
    marks: ['mouse', 'fish'], owner: 0, turn: 1,
  });
  pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('a mixed board is refused', P.marks, ['mouse', 'fish']);

  section('pkoCanStampede gates the button from the same rules');
  P.seat({ hoards: [['mouse', 'mouse', 'mouse'], ['bee'], ['fish'], ['eagle']],
           marks: ['mouse', 'mouse'], owner: 1, turn: 0 });
  P.set('myHoard', ['mouse', 'mouse', 'mouse']);
  check('3 copies against a 2-wide board → offered', P.canStampede(), true);
  P.set('myHoard', ['mouse', 'mouse']);
  check('2 copies against a 2-wide board → hidden', P.canStampede(), false);
  P.set('myHoard', ['mouse', 'mouse', 'human']);
  check('a Poacher does not make up the shortfall', P.canStampede(), false);
  P.set('marks', ['mouse', 'fish']); P.set('myHoard', ['mouse', 'mouse', 'mouse']);
  check('mixed board → hidden', P.canStampede(), false);
  P.set('marks', ['human', 'human']); P.set('myHoard', ['human', 'human', 'human']);
  check('Poacher board → hidden', P.canStampede(), false);

  // ══ 6. Clash and Match end ══════════════════════════════════════════════
  section('Emptying your Hoard ends the Clash immediately (§6)');
  P.set('clashTarget', 3);
  P.seat({
    hoards: [['bee'], ['mongoose', 'eagle'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('the emptying player scores', P.scores, [0, 1, 0, 0]);
  check('one row per Clash in the history grid', P.history, [[0, 1, 0, 0]]);
  check('the Clash winner leads the next one', P.leader, 1);
  check('the Encounter does NOT resolve — scoring pre-empts it',
    P.retreated, [false, false, false, false]);
  check('the clash-result screen is shown', screens.pop(), 'screen-pko-clash-result');

  section('Emptying on a Stake scores identically');
  P.seat({ hoards: [['mouse', 'mouse'], ['bee'], ['fish'], ['eagle']], turn: 0 });
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('a Stake that empties the Hoard takes the Clash', P.scores, [1, 0, 0, 0]);

  section('Emptying on a Stampede scores identically');
  P.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'mouse'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1,
  });
  pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('a Stampede that empties the Hoard takes the Clash', P.scores, [0, 1, 0, 0]);

  section('Reaching the target ends the Match');
  P.set('clashTarget', 3);
  P.seat({
    hoards: [['bee'], ['mongoose', 'eagle'], ['leopard'], ['eagle']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1, scores: [1, 2, 0, 0],
  });
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('the winning score reaches the target', P.scores, [1, 3, 0, 0]);
  check('the Hierarchy is shown, not the clash result', screens.pop(), 'screen-pko-hierarchy');

  section('Exactly one point enters the game per Clash');
  check('a single Clash produced a single point',
    P.history[P.history.length - 1].reduce((a, b) => a + b, 0), 1);

  // ══ 7. Termination ══════════════════════════════════════════════════════
  section('The loop terminates — a full Encounter, played out');
  P.seat({
    hoards: [['mouse', 'mouse', 'bee', 'bee'], ['mongoose', 'eagle', 'fish', 'fish'],
             ['leopard', 'human', 'octopus', 'octopus'], ['eagle', 'elephant', 'seal', 'seal']],
    turn: 0, scores: [0, 0, 0, 0],
  });
  let guard = 0;
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });               // board: mouse, mouse
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });  // both beat mouse
  pkoApplyChallenge(2, { assignments: [['leopard'], ['human']] });   // leopard>mongoose, Poacher>eagle
  // The board is now [leopard, Poacher] — the Poacher-Mark is unanswerable, so the
  // only legal move left for everyone else is Retreat. This is the terminating case.
  while (P.marks.length && guard++ < 20) pkoApplyRetreat(P.turn);
  check('repeated Retreats close the Encounter, never loop', P.marks.length > 0, false);
  check('…within the player count, not by exhaustion', guard, 3);
  check('the last board owner leads next', P.leader, 2);
  check('the Trail logged every action in order',
    P.trail.map(t => t.text.split(' ')[1].replace('.', '')),
    ['Staked', 'Challenged', 'Challenged', 'Retreated', 'Retreated', 'Retreated', 'went']);

  // ══ 8. Small Fry — the opener rule ══════════════════════════════════════
  // Enforced in three places (tap, client submit, host re-validation); only the host's
  // re-validation is reachable headlessly, and it is the one that actually decides.
  section('Small Fry — Match Start');
  const smallFry = (o) => P.seat({
    hoards: [['leopard', 'mouse', 'bee'], ['fish'], ['seal'], ['orca']],
    turn: 0, ...o,
  });

  smallFry({ startSmall: 'match' });
  pkoApplyStake(0, { cards: ['leopard'] });
  check('a non-smallest opener is rejected', P.marks, []);
  pkoApplyStake(0, { cards: ['bee'] });
  check('an unranked specialty card cannot open either', P.marks, []);
  pkoApplyStake(0, { cards: ['mouse'] });
  check('the smallest animal opens', P.marks, ['mouse']);

  section('Small Fry — scope');
  smallFry({ startSmall: 'match' });
  P.set('encounter', 2);
  pkoApplyStake(0, { cards: ['leopard'] });
  check('Match Start does not bite on Encounter 2', P.marks, ['leopard']);

  smallFry({ startSmall: 'clash' });
  P.set('encounter', 2);
  pkoApplyStake(0, { cards: ['leopard'] });
  check('Every Clash does not bite on Encounter 2 either', P.marks, ['leopard']);

  smallFry({ startSmall: 'clash' });
  P.set('clash', 4);
  pkoApplyStake(0, { cards: ['leopard'] });
  check('Every Clash still bites on a later Clash opener', P.marks, []);

  smallFry({ startSmall: 'match' });
  P.set('clash', 4);
  pkoApplyStake(0, { cards: ['leopard'] });
  check('Match Start does NOT bite on a later Clash', P.marks, ['leopard']);

  smallFry({ startSmall: 'off' });
  pkoApplyStake(0, { cards: ['leopard'] });
  check('Off never constrains the opener', P.marks, ['leopard']);

  section('Small Fry — ranking edge cases');
  // Land and sea are parallel ladders, so Mouse and Fish are both rank 1.
  P.seat({ hoards: [['mouse', 'fish', 'bear'], ['orca'], ['seal'], ['bee']],
           turn: 0, startSmall: 'match' });
  pkoApplyStake(0, { cards: ['fish'] });
  check('Fish opens as readily as Mouse — both are rank 1', P.marks, ['fish']);

  // A Hoard of nothing but unranked cards must still be able to open.
  P.seat({ hoards: [['bee', 'eagle', 'stingray'], ['orca'], ['seal'], ['mouse']],
           turn: 0, startSmall: 'match' });
  pkoApplyStake(0, { cards: ['eagle'] });
  check('an all-specialty Hoard can still open (no deadlock)', P.marks, ['eagle']);

  // Quantity is never constrained — only species.
  P.seat({ hoards: [['mouse', 'mouse', 'leopard'], ['orca'], ['seal'], ['bee']],
           turn: 0, startSmall: 'match' });
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('Small Fry constrains species, never quantity', P.marks, ['mouse', 'mouse']);

  // ══ 9. Card conservation ════════════════════════════════════════════════
  // Every card is in exactly one place: a Hoard, the board, the Reserve, or the Watering
  // Hole. BUG-02 was a mirror desync this invariant is the general guard against — a card
  // that leaves a Hoard without arriving anywhere shows up here as a missing card.
  section('Cards are conserved across a full Encounter');
  const census = () => [...P.hoards.flat(), ...P.marks, ...P.reserve, ...P.wateringFlat].sort();
  P.seat({
    hoards: [['mouse', 'mouse', 'bee', 'bee'], ['mongoose', 'eagle', 'fish', 'fish'],
             ['leopard', 'human', 'octopus', 'octopus'], ['eagle', 'elephant', 'seal', 'seal']],
    turn: 0, reserve: ['bear', 'orca'],
  });
  const before = census();
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('conserved after a Stake', census(), before);
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('conserved after a Challenge', census(), before);
  pkoApplyChallenge(2, { assignments: [['leopard'], ['human']] });
  check('conserved after a second Challenge', census(), before);
  let g2 = 0;
  while (P.marks.length && g2++ < 20) pkoApplyRetreat(P.turn);
  check('conserved after the Encounter closes', census(), before);
  // Three boards were spent, two cards each: the Staked mice (buried by the first
  // Challenge), that Challenge's pair (buried by the second), and the final board.
  check('…and every spent board landed in the Watering Hole', P.wateringFlat.length, 6);
  check('…leaving nothing on the field', P.marks.length, 0);
  check('…grouped as one batch record per spent board', P.watering.length, 3);
  check('…each batch tagged with its Encounter', P.watering.every(b => b.enc === 1), true);

  // ══ 10. Swarm — the per-slot mini-Stampede ══════════════════════════════
  // Restored in the one-card-per-Mark form: a Swarm's two cards become two SEPARATE
  // Marks, so a slot never holds depth and the v6 "how deep is a swarmed slot?"
  // ambiguity that cut this mechanic cannot arise.
  section('Swarm — two of a Mark\'s own species answer it');
  P.seat({ hoards: [['fish', 'bee'], ['fish', 'fish', 'bee'], ['octopus', 'bee']], turn: 0 });
  pkoApplyStake(0, { cards: ['fish'] });
  check('a lone Fish is the board', P.marks, ['fish']);
  pkoApplyChallenge(1, { assignments: [['fish', 'fish']] });
  check('2 × Fish answer a Fish Mark', P.marks, ['fish', 'fish']);
  check('…and each becomes a Mark of its own (board one wider)', P.marks.length, 2);
  check('…both cards left the Swarmer\'s Hoard', P.hoards[1], ['bee']);
  check('the Swarmer owns the board', P.owner, 1);

  section('Swarm — mixed with an ordinary answer in one Challenge');
  P.seat({ hoards: [['mouse', 'mouse', 'bee'], ['mongoose', 'mouse', 'mouse', 'bee'], ['bee']], turn: 0 });
  pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['mouse', 'mouse']] });
  check('one Mark beaten, one Swarmed', P.marks, ['mongoose', 'mouse', 'mouse']);
  check('…sheds THREE cards against a two-wide board', P.hoards[1], ['bee']);
  check('…the board grew by exactly the number of Swarms', P.marks.length, 3);

  section('Swarm — every rejection path');
  const reseatSwarm = () => {
    P.seat({ hoards: [['fish'], ['fish', 'fish', 'fish', 'mongoose', 'human'], ['bee']], turn: 0 });
    pkoApplyStake(0, { cards: ['fish'] });
  };
  reseatSwarm(); pkoApplyChallenge(1, { assignments: [['fish', 'fish', 'fish']] });
  check('three on one slot is refused — a Swarm is exactly 2', P.marks, ['fish']);
  reseatSwarm(); pkoApplyChallenge(1, { assignments: [['fish', 'mongoose']] });
  check('a mismatched pair is refused — must be the Mark\'s own species', P.marks, ['fish']);
  reseatSwarm(); pkoApplyChallenge(1, { assignments: [['fish', 'human']] });
  check('a Poacher cannot pad a Swarm (solo-only, brief v6)', P.marks, ['fish']);
  reseatSwarm(); pkoApplyChallenge(1, { assignments: [['human', 'human']] });
  check('a Poacher pair is not a Swarm either', P.marks, ['fish']);
  P.seat({ hoards: [['fish', 'bee'], ['fish', 'bee'], ['bee']], turn: 0 });
  pkoApplyStake(0, { cards: ['fish'] });
  pkoApplyChallenge(1, { assignments: [['fish', 'fish']] });
  check('claiming 2 while holding 1 is refused by pkoHoldsAll', P.marks, ['fish']);

  section('Swarm — a Poacher-Mark cannot be Swarmed');
  P.seat({ hoards: [['bee'], ['human', 'human', 'bee'], ['bee']], turn: 1, marks: ['human'], owner: 0 });
  pkoApplyChallenge(1, { assignments: [['human', 'human']] });
  check('two Poachers do NOT Swarm a Poacher-Mark', P.marks, ['human']);

  section('Swarm — cards stay conserved');
  P.seat({ hoards: [['mouse', 'mouse', 'bee'], ['mouse', 'mouse', 'bee'], ['bee', 'bee']], turn: 0 });
  const swarmCensus = () => [...P.hoards.flat(), ...P.marks, ...P.reserve, ...P.wateringFlat].sort();
  const swarmBefore = swarmCensus();
  pkoApplyStake(0, { cards: ['mouse'] });
  pkoApplyChallenge(1, { assignments: [['mouse', 'mouse']] });
  check('conserved across a Swarm', swarmCensus(), swarmBefore);

  // ══ 11. Appetite — the two-tier reach setting ═══════════════════════════
  section('Appetite gates host re-validation, not just the UI');
  const twoTier = () => {
    P.seat({ hoards: [['mouse', 'bee'], ['leopard', 'bee'], ['bee']], turn: 0 });
    pkoApplyStake(0, { cards: ['mouse'] });
    pkoApplyChallenge(1, { assignments: [['leopard']] });
  };
  P.setAppetite('sated');    twoTier();
  check('Sated: Leopard does NOT answer a Mouse', P.marks, ['mouse']);
  P.setAppetite('ravenous'); twoTier();
  check('Ravenous: Leopard DOES answer a Mouse', P.marks, ['leopard']);
  P.setAppetite('sated');    // leave the sandbox on the shipped default

  // ══ 12. Tapping an answer from the TABLE fan (BUG-05) ═══════════════════
  // v146 ran this path through pkoStakeSel, which carries the Stake's "one species only"
  // refusal — so a mixed answer was impossible from the table while the builder accepted it.
  // The table now drives pkoDraft through the builder's own pkoAutoFillSlot.
  section('Table fan — a MIXED answer, the case that was broken');
  const seatFish = () => {
    P.seat({ hoards: [['fish', 'fish', 'fish'], ['mongoose', 'mongoose', 'octopus'], ['bee']], turn: 1 });
    P.set('marks', ['fish', 'fish', 'fish']);
    P.set('myHoard', ['mongoose', 'mongoose', 'octopus']);
    P.armDraft();
  };
  seatFish();
  P.tapAnswer('mongoose'); P.tapAnswer('mongoose'); P.tapAnswer('octopus');
  check('Mongoose, Mongoose, Octopus answers three Fish',
    P.draftIds(), [['mongoose'], ['mongoose'], ['octopus']]);
  check('…and the draft is complete', P.draftComplete(), true);

  seatFish();
  P.tapAnswer('octopus'); P.tapAnswer('mongoose'); P.tapAnswer('mongoose');
  check('the REVERSE order works too (Octopus first)',
    P.draftIds(), [['octopus'], ['mongoose'], ['mongoose']]);
  check('…and the draft is complete', P.draftComplete(), true);

  section('Table fan — tap cycle wraps like the Stake\'s');
  seatFish();
  P.tapAnswer('mongoose'); P.tapAnswer('mongoose');
  check('both copies committed', P.draftIds(), [['mongoose'], ['mongoose'], []]);
  P.tapAnswer('mongoose');
  check('one more tap releases the WHOLE species', P.draftIds(), [[], [], []]);

  section('Table fan — Swarms are reachable from the table too');
  P.seat({ hoards: [['fish'], ['fish', 'fish', 'bee'], ['bee']], turn: 1 });
  P.set('marks', ['fish']); P.set('myHoard', ['fish', 'fish', 'bee']); P.armDraft();
  P.tapAnswer('fish');
  check('one Fish is half a Swarm, not an answer', P.draftComplete(), false);
  P.tapAnswer('fish');
  check('the second Fish completes it', P.draftIds(), [['fish', 'fish']]);
  check('…and the draft is complete', P.draftComplete(), true);

  section('Table fan — an illegal card is refused, draft untouched');
  P.seat({ hoards: [['fish', 'fish', 'fish'], ['bee', 'bee'], ['bee']], turn: 1 });
  P.set('marks', ['fish', 'fish', 'fish']); P.set('myHoard', ['bee', 'bee']); P.armDraft();
  P.tapAnswer('bee');
  check('a Bee cannot answer a Fish — nothing is committed', P.draftIds(), [[], [], []]);

  // A mixed answer must also survive the host's re-validation, not just the builder.
  section('A mixed answer is accepted by the host applier');
  P.seat({ hoards: [['fish', 'fish', 'fish', 'bee'], ['mongoose', 'mongoose', 'octopus'], ['bee']], turn: 0 });
  pkoApplyStake(0, { cards: ['fish', 'fish', 'fish'] });
  pkoApplyChallenge(1, { assignments: [['mongoose'], ['mongoose'], ['octopus']] });
  check('three Fish answered by two Mongooses and an Octopus',
    P.marks, ['mongoose', 'mongoose', 'octopus']);
  check('…all three cards left the Hoard', P.hoards[1], []);

  section('Joint Clash resolution (FoN §6 — Extinction can empty several Hoards)');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 0] });
  P.set('clashTarget', 3);
  pkoResolveClash([1, 3]);
  check('every winner scores', P.scores, [0, 1, 0, 1]);
  check('one history row, multiple 1s', P.history, [[0, 1, 0, 1]]);
  check('the next opener is one OF the winners', [1, 3].includes(P.leader), true);
  check('the clash-result screen is shown', screens.pop(), 'screen-pko-clash-result');

  section('Joint Match end — they all win together (brief §4)');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 2, 0, 2] });
  P.set('clashTarget', 3);
  pkoResolveClash([1, 3]);
  check('both cross the target on the same Clash', P.scores, [0, 3, 0, 3]);
  check('the Hierarchy is shown, not the clash result', screens.pop(), 'screen-pko-hierarchy');

  section('Next opener among joint winners prefers the most Match points');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 4] });
  P.set('clashTarget', 99);
  pkoResolveClash([1, 3]);
  check('the winner with more Match points opens the next Clash', P.leader, 3);

  section('A single winner is unchanged — the array is the only difference');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 0] });
  P.set('clashTarget', 99);
  pkoResolveClash([2]);
  check('one winner scores once', P.scores, [0, 0, 1, 0]);
  check('the single winner leads the next Clash', P.leader, 2);
  check('history row has exactly one 1', P.history, [[0, 0, 1, 0]]);

  console.log('\n' + '='.repeat(48));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
