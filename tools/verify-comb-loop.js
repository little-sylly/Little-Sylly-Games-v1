// ═══════════════════════════════════════════════════════════════════════════
// verify-comb-loop.js — Honeycomb Hills' MATCH AND TURN ENGINE, headlessly.
//
//   node tools/verify-comb-loop.js           (exits 1 on any failure)
//   COMB_SRC=path node tools/…               (drive a different copy of comb.js)
//   COMB_SEED=n   node tools/…               (reproduce a seeded match)
//
// Owns everything the other two do not: the deal, the opening snake draft and
// its anchor, the Scout Flight and production (including the Wasp's blocked hex
// and Limited Bounty's rationing), the seven — the Overflow gate and the Wasp's
// move and steal — End Turn and the own-turn-only win, Daylight, and the
// combSerialiseState() / combApplyState() round trip.
//
// ── The known blind spot ───────────────────────────────────────────────────
// One process, `getElementById: () => null`, `syllyMultiplayerMode = 'single'`.
// That is what lets it drive all N seats, and exactly what blinds it to the
// packet layer and every line of render code. mpSendEnvelope/mpSendPrivate
// THROW here — they are the tripwire proving the engine broadcasts nothing in
// single mode. The packet contract itself is the loopback's job, not this one's.
//
// Timers are FAKE and manual (see `clock` below): setTimeout/setInterval hand
// back real ids and park their callbacks, so a test fires the Scout Flight beat
// or the Daylight expiry deliberately rather than waiting on wall-clock time.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.COMB_SRC || path.join(ROOT, 'js/games/comb.js');
const SEED = Number(process.env.COMB_SEED || 20260907);

// ── A manual clock. Nothing fires on its own; a test fires it. ─────────────
const clock = {
  now: 1700000000000,
  timers: new Map(),
  next: 1,
  set(fn, ms, repeat) { const id = this.next++; this.timers.set(id, { fn, ms, repeat }); return id; },
  clear(id) { this.timers.delete(id); },
  fire(id) { const t = this.timers.get(id); if (!t) return false; if (!t.repeat) this.timers.delete(id); t.fn(); return true; },
  fireAll() { for (const id of Array.from(this.timers.keys())) this.fire(id); },
  count() { return this.timers.size; },
  reset() { this.timers.clear(); },
};

const sandbox = {
  console,
  window: { syllyMultiplayerMode: 'single', syllyDeviceUid: null },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {},
  Date: { now: () => clock.now },
  setTimeout:  (fn, ms) => clock.set(fn, ms, false),
  setInterval: (fn, ms) => clock.set(fn, ms, true),
  clearTimeout:  id => clock.clear(id),
  clearInterval: id => clock.clear(id),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
// Every play*() in the catalogue plus the one this game adds. combPlay()
// resolves through globalThis, so an unstubbed name would simply be silent —
// these are here so a MISSING call can be told apart from a silent one.
const sounds = [];
['playLaunch','playExit','playDone','playSuccess','playBoing','playWhoosh','playPillClick',
 'playTick','playAlarm','playStampede','playSonarPing','playHullThud','playPoacher',
 'playUnchallenged','playClashWin','playAccord'].forEach(n => { sandbox[n] = () => sounds.push(n); });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });

const BRIDGE = `
globalThis.__comb = {
  C: { COMB_RES, COMB_COSTS, COMB_LIMITS, COMB_TOPOLOGY, COMB_DECK_COUNT,
       COMB_HEX_YIELD, COMB_MARKERS, COMB_SUPPLY_EACH, COMB_FLIGHT_MS, COMB_RES_NAME,
       COMB_FLIGHT_SHORT_MS, COMB_FLIGHT_FULL_TURNS,
       COMB_FLIGHT_SPIN_F, COMB_FLIGHT_LAND_F, COMB_FLIGHT_FADE_F },
  fn: { combStartMatchLocal, combDealMatch, combBuildDeck, combBuildDraftOrder,
        combDraftNeeds, combDraftPlace, combDraftOpts, combGrantOpeningYield,
        combScoutFlight, combProduce, combProductionLine, combRationProduction,
        combFlightTotalMs, combFlightSpinMs,
        combReturnToSupply, combBeginSeven, combOverflowGateOpen, combSubmitOverflow,
        combEnterWaspMove, combWaspVictims, combWaspMove, combWaspSteal, combPickStolen,
        combBeginTurn, combEndTurn, combEnterActions, combFinishMatch,
        combStartDaylight, combStopDaylight, combDaylightExpire,
        combSerialiseState, combApplyState, combApplyPlace, combPlaceLegal,
        combRecomputeAchievements, combHandCounts, combHandCount, combCheckWin,
        combTruePoints, combPublicPoints, combStandings, combSetHand, combResetState,
        combTarget, combCarryLimit, combDaylightMs, combTendedBoard, combLocalIdx,
        combPostOffer, combRespondOffer, combSelectPartner, combCancelOffer,
        combOfferExpire, combOfferAudience, combOfferAccepters, combTradeStillValid,
        combBankTrade, combBankRate, combDrawFromSupply, combBuyInstinct,
        combPlayInstinct, combInstinctCounts, combSetInstinct, combBuild },
  get hexes()  { return combHexes; },   set hexes(v)  { combHexes = v; },
  get nodes()  { return combNodes; },   set nodes(v)  { combNodes = v; },
  get edges()  { return combEdges; },   set edges(v)  { combEdges = v; },
  get hands()  { return combHands; },   set hands(v)  { combHands = v; },
  get instinct(){ return combInstinct; },set instinct(v){ combInstinct = v; },
  get deck()   { return combDeck; },    set deck(v)   { combDeck = v; },
  get supply() { return combSupply; },  set supply(v) { combSupply = v; },
  get count()  { return combPlayerCount; }, set count(v) { combPlayerCount = v; },
  get names()  { return combPlayerNames; }, set names(v) { combPlayerNames = v; },
  get turn()   { return combTurn; },    set turn(v)   { combTurn = v; },
  get turnNo() { return combTurnNo; },  set turnNo(v) { combTurnNo = v; },
  get phase()  { return combPhase; },   set phase(v)  { combPhase = v; },
  get roll()   { return combRoll; },    set roll(v)   { combRoll = v; },
  get wasp()   { return combWaspHex; }, set wasp(v)   { combWaspHex = v; },
  get order()  { return combDraftOrder; }, set order(v) { combDraftOrder = v; },
  get step()   { return combDraftStep; },  set step(v)  { combDraftStep = v; },
  get anchor() { return combDraftAnchor; },set anchor(v){ combDraftAnchor = v; },
  get guards() { return combGuardsPlayed; },set guards(v){ combGuardsPlayed = v; },
  get chainLen(){ return combChainLen; },  set chainLen(v){ combChainLen = v; },
  get largest(){ return combLargestHolder; },  set largest(v){ combLargestHolder = v; },
  get fiercest(){ return combFiercestHolder; },set fiercest(v){ combFiercestHolder = v; },
  get log()    { return combLog; },     set log(v)    { combLog = v; },
  get stats()  { return combStats; },   set stats(v)  { combStats = v; },
  get owed()   { return combOverflowOwed; },  set owed(v)  { combOverflowOwed = v; },
  get ready()  { return combOverflowReady; }, set ready(v) { combOverflowReady = v; },
  get offer()  { return combOffer; },   set offer(v)  { combOffer = v; },
  get endTs()  { return combTurnEndTs; },set endTs(v) { combTurnEndTs = v; },
  get season() { return combSeason; },  set season(v) { combSeason = v; },
  get layout() { return combLayout; },  set layout(v) { combLayout = v; },
  get waspSet(){ return combWasp; },    set waspSet(v){ combWasp = v; },
  get overflow(){ return combOverflow; },set overflow(v){ combOverflow = v; },
  get bounty() { return combBounty; },  set bounty(v) { combBounty = v; },
  get daylight(){ return combDaylight; },set daylight(v){ combDaylight = v; },
  get mode()   { return combPlacementMode; }, set mode(v) { combPlacementMode = v; },
  get seed()   { return combBoardSeed; },
  get waggle() { return combWaggle; },  set waggle(v) { combWaggle = v; },
  get freeWalls() { return combFreeWalls; }, set freeWalls(v) { combFreeWalls = v; },
  get playedThis() { return combInstinctPlayedThisTurn; },
  set playedThis(v) { combInstinctPlayedThisTurn = v; },
  get daylightArmed() { return combDaylightArmed; },
};
`;
vm.runInContext(BRIDGE, sandbox, { filename: 'comb-loop-bridge' });
const G = sandbox.__comb, C = G.C, F = G.fn;
const T = C.COMB_TOPOLOGY;

let failures = 0, checks = 0;
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {}; Object.keys(v).sort().forEach(k => { o[k] = stable(v[k]); }); return o;
  }
  return v;
}
function check(label, got, want) {
  checks++;
  if (JSON.stringify(stable(got)) !== JSON.stringify(stable(want))) {
    failures++;
    console.log(`  FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  } else console.log(`  ok    ${label}`);
}
function ok(label, cond) { check(label, !!cond, true); }
function section(t) { console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`); }

// A fresh N-seat match on the Tended board, so every test names a hex it can
// predict. Wild is exercised separately by verify-comb-board.js.
function newMatch(n, opts) {
  opts = opts || {};
  clock.reset();
  sounds.length = 0;
  G.count = n; G.names = ['Ada', 'Bo', 'Cy', 'Di'].slice(0, n);
  G.layout   = opts.layout   || 'tended';
  G.season   = opts.season   || 'short';
  G.waspSet  = opts.wasp     || 'blocks';
  G.overflow = opts.overflow || 'off';
  G.bounty   = opts.bounty   || 'endless';
  G.daylight = opts.daylight || 'allday';
  F.combStartMatchLocal(opts.seed === undefined ? SEED : opts.seed);
}

// Walk the whole snake by placing, for each step, the first legal cell and then
// the first legal wall touching it. Returns the nodes each seat opened on.
function playDraft() {
  const opened = [];
  let guard = 0;
  while (G.phase === 'draft' && guard++ < 200) {
    const p = G.turn;
    const need = F.combDraftNeeds();
    if (need === 'cell') {
      const n = T.nodes.map((_, i) => i).find(i => F.combPlaceLegal('cell', i, p, F.combDraftOpts()).ok);
      opened.push({ p, node: n });
      F.combDraftPlace('cell', n, p);
    } else {
      const e = T.edgesOfNode[G.anchor].find(x => F.combPlaceLegal('wall', x, p, F.combDraftOpts()).ok);
      F.combDraftPlace('wall', e, p);
    }
  }
  return opened;
}

// Put exactly one structure of `level` for `p` on a hex, ignoring legality —
// production tests care about the payout, not about how the board got there.
function plant(hexIdx, p, level, slot) {
  const n = T.nodesOfHex[hexIdx][slot || 0];
  G.nodes[n] = { owner: p, level: level || 1 };
  return n;
}
function hexWithMarker(m) { return G.hexes.findIndex(h => h.marker === m && h.kind !== 'smoke'); }

// ══ 1. The deal ═══════════════════════════════════════════════════════════
section('Match start — one seed, one board, one deck');
newMatch(4);
check('19 hexes', G.hexes.length, 19);
check('54 nodes, all unowned', G.nodes.filter(n => n.owner === -1 && n.level === 0).length, 54);
check('72 edges, all unowned', G.edges.filter(e => e === -1).length, 72);
check('the Wasp starts on the Smoke Zone', G.hexes[G.wasp].kind, 'smoke');
check('25-card Instinct deck', G.deck.length, 25);
check('…with 14 Guard Bees', G.deck.filter(k => k === 'guard').length, 14);
check('…and 5 Golden Nectar', G.deck.filter(k => k === 'golden').length, 5);
check('supply is 5 × 19', G.supply, [19, 19, 19, 19, 19]);
check('every hand starts empty', G.hands, [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]);
check('nobody holds an achievement', [G.largest, G.fiercest], [-1, -1]);
check('phase is draft', G.phase, 'draft');
check('turn number has not started', G.turnNo, 0);

section('The snake — the last seat is compensated by two placements, not by turn order');
check('4 seats snake to 0,1,2,3,3,2,1,0', F.combBuildDraftOrder(4), [0,1,2,3,3,2,1,0]);
check('3 seats snake to 0,1,2,2,1,0',     F.combBuildDraftOrder(3), [0,1,2,2,1,0]);
check('the snake is 2 entries per seat',  F.combBuildDraftOrder(4).length, 8);
check('it opens on seat 0',  F.combBuildDraftOrder(4)[0], 0);
check('and closes on seat 0', F.combBuildDraftOrder(4)[7], 0);

section('The deal is a pure function of the seed');
newMatch(4, { seed: 12345 });
const boardA = JSON.stringify(G.hexes), deckA = JSON.stringify(G.deck);
newMatch(4, { seed: 12345 });
ok('the same seed deals the same board', JSON.stringify(G.hexes) === boardA);
ok('…and the same Instinct deck',        JSON.stringify(G.deck)  === deckA);
newMatch(4, { seed: 12345, layout: 'wild' });
const wildA = JSON.stringify(G.hexes);
newMatch(4, { seed: 12345, layout: 'wild' });
ok('Wild is seeded too — same seed, same wild board', JSON.stringify(G.hexes) === wildA);
ok('…and Wild is not the Tended board', wildA !== boardA);
ok('the deck is not correlated with the board stream',
   JSON.stringify(F.combBuildDeck(12345)) !== JSON.stringify(F.combBuildDeck(12346)));

// ══ 2. The opening draft ══════════════════════════════════════════════════
section('The draft — cell, then the wall that touches it');
newMatch(4);
check('the first placer owes a cell', F.combDraftNeeds(), 'cell');
check('a wall is refused while a cell is owed', F.combDraftPlace('wall', 0, 0).ok, false);
check('so is a placement by the wrong seat',    F.combDraftPlace('cell', 0, 1).ok, false);
ok('the first cell places', F.combDraftPlace('cell', 0, 0).ok);
check('…and the anchor is now that node', G.anchor, 0);
check('…so the next piece owed is a wall', F.combDraftNeeds(), 'wall');
check('…and the step has NOT advanced yet', G.step, 0);

// ⚠️ The anchor is the whole point: without it the opening wall lands anywhere
// empty and seeds a second network the player never has to reach.
const offEdges = T.nodesOfEdge
  .map((_, i) => i)
  .filter(e => T.nodesOfEdge[e][0] !== 0 && T.nodesOfEdge[e][1] !== 0 && G.edges[e] === -1);
check('a wall not touching the anchor is refused',
      F.combPlaceLegal('wall', offEdges[0], 0, F.combDraftOpts()).ok, false);
check('…with the reason a player can act on',
      F.combPlaceLegal('wall', offEdges[0], 0, F.combDraftOpts()).reason,
      'It has to touch the cell you just placed.');
const anchoredEdge = T.edgesOfNode[0][0];
ok('a wall touching the anchor is legal', F.combPlaceLegal('wall', anchoredEdge, 0, F.combDraftOpts()).ok);
ok('…and it places', F.combDraftPlace('wall', anchoredEdge, 0).ok);
check('the anchor clears', G.anchor, -1);
check('the step advances', G.step, 1);
check('and the turn passes to seat 1', G.turn, 1);
check('the opening placements cost nothing', G.hands[0], [0, 0, 0, 0, 0]);

// ⚠️ The applier RE-ARMS placement mode for the next piece, and the confirm
// handler must not undo that. Placing the opening cell left the real button
// handler clearing a mode the applier had just set, stranding the player on a
// lit board with no way to lay the wall — invisible to every harness that calls
// the applier directly, which is all three of them. Assert the applier's half
// here; the handler's half is a visual-check job (impl-notes BUG-05).
newMatch(4);
F.combDraftPlace('cell', 0, 0);
check('a placed draft cell arms the wall that follows it', G.mode, 'wall');
ok('…with only edges touching the anchor lit',
   T.edgesOfNode[0].length > 0 && G.mode === 'wall');
F.combDraftPlace('wall', T.edgesOfNode[0][0], 0);
check('a placed draft wall arms the NEXT seat, not this one', G.turn, 1);
check('…and that seat owes a cell', F.combDraftNeeds(), 'cell');

section('The draft runs to the end of the snake and hands over');
newMatch(4);
const opened = playDraft();
check('every seat opened twice', opened.length, 8);
check('the draft ends in the roll phase', G.phase, 'roll');
check('8 cells on the board', G.nodes.filter(n => n.level === 1).length, 8);
check('8 walls on the board',  G.edges.filter(e => e !== -1).length, 8);
check('the season opens on the seat the snake ended on', G.turn, 0);
check('and it is turn 1', G.turnNo, 1);
check('a Scout Flight beat is armed', clock.count() >= 1, true);

section('The second cell pays out — Catan’s opening yield');
newMatch(4);
playDraft();
const firstRound = G.hands.map(h => h.reduce((a, b) => a + b, 0));
ok('every seat opened with resources from its SECOND cell', firstRound.every(v => v > 0));
ok('and nobody opened with more than six', firstRound.every(v => v <= 6));
// The payout is one per PRODUCING hex the node touches — the Smoke Zone gives
// nothing, so a node on it pays less than its degree.
newMatch(4);
const smokeNode = T.nodesOfHex[G.wasp][0];
G.step = 4;                                   // the back half of the snake
const yieldRow = F.combGrantOpeningYield(0, smokeNode);
check('the Smoke Zone contributes nothing to the opening yield',
      yieldRow.reduce((a, b) => a + b, 0), T.hexesOfNode[smokeNode].length - 1);

// ══ 3. Production ═════════════════════════════════════════════════════════
section('The Scout Flight — production is public, hand contents are not');
newMatch(4);
G.phase = 'actions';
const h8 = hexWithMarker(8);
plant(h8, 0, 1, 0);
let prod = F.combProduce(8);
check('a Drone Cell on an 8 yields 1', prod[0][C.COMB_RES.indexOf(C.COMB_HEX_YIELD[G.hexes[h8].kind])], 1);
check('…and the resource lands in the hand', F.combHandCount(0), 1);
check('nobody else was paid', [prod[1], prod[2], prod[3]].every(r => r.every(v => !v)), true);

newMatch(4);
G.phase = 'actions';
plant(h8, 1, 2, 0);
prod = F.combProduce(8);
check('a Queen Dome yields 2', prod[1].reduce((a, b) => a + b, 0), 2);

newMatch(4);
G.phase = 'actions';
plant(h8, 0, 1, 0); plant(h8, 0, 1, 3);
prod = F.combProduce(8);
check('two structures on one hex stack', prod[0].reduce((a, b) => a + b, 0), 2);

newMatch(4);
G.phase = 'actions';
plant(h8, 0, 1, 0);
G.wasp = h8;
prod = F.combProduce(8);
check('the Wasp shuts its own hex down', prod[0].reduce((a, b) => a + b, 0), 0);

check('no Bloom Marker is a 7', C.COMB_MARKERS.indexOf(7), -1);
newMatch(4);
G.phase = 'actions';
plant(h8, 0, 1, 0);
check('a roll of 7 produces nothing anywhere',
      F.combProduce(7).every(r => r.every(v => !v)), true);

section('The Meadow’s Bounty — Limited rations, Endless never looks');
newMatch(4, { bounty: 'endless' });
G.supply = [0, 0, 0, 0, 0];
G.phase = 'actions';
plant(h8, 0, 1, 0);
check('Endless pays out of an empty supply', F.combProduce(8)[0].reduce((a, b) => a + b, 0), 1);

newMatch(4, { bounty: 'limited' });
G.phase = 'actions';
const ri8 = C.COMB_RES.indexOf(C.COMB_HEX_YIELD[G.hexes[h8].kind]);
plant(h8, 0, 1, 0);
G.supply[ri8] = 1;
check('one claimant takes what is left', F.combProduce(8)[0][ri8], 1);
check('…and the supply is drained', G.supply[ri8], 0);

newMatch(4, { bounty: 'limited' });
G.phase = 'actions';
plant(h8, 0, 1, 0); plant(h8, 1, 1, 3);
G.supply[ri8] = 1;
prod = F.combProduce(8);
check('two claimants and not enough: NOBODY is paid', [prod[0][ri8], prod[1][ri8]], [0, 0]);
check('…and the supply is untouched', G.supply[ri8], 1);

newMatch(4, { bounty: 'limited' });
const before = G.supply.slice();
G.hands[0] = [5, 5, 5, 5, 5];
G.nodes[0] = { owner: 0, level: 1 };
F.combApplyPlace('wall', T.edgesOfNode[0][0], 0, {});
check('a build returns its cost to the Meadow', G.supply, before.map((v, i) => v + C.COMB_COSTS.wall[i]));

// ══ 4. The seven ══════════════════════════════════════════════════════════
section('The Overflow — who owes, and the gate that must be asserted per mode');
newMatch(4, { overflow: 'off' });
G.hands[0] = [9, 9, 0, 0, 0];
G.phase = 'roll';
F.combBeginSeven();
check('The Overflow Off skips the spill entirely', G.phase, 'waspMove');

newMatch(4, { overflow: 'snug' });
check('Snug is a limit of 7', F.combCarryLimit(), 7);
G.hands = [[7,0,0,0,0], [8,0,0,0,0], [0,0,0,0,0], [5,4,0,0,0]];
G.phase = 'roll';
F.combBeginSeven();
check('exactly at the limit owes nothing', G.owed[0], 0);
check('one over owes half, rounded down', G.owed[1], 4);
check('an empty hand owes nothing', G.owed[2], 0);
check('nine owes four', G.owed[3], 4);
check('the phase is overflow', G.phase, 'overflow');
check('ready[] starts all-false at full seat length', G.ready, [false, false, false, false]);

// ⚠️ THE GATE, both ways. A plain .every(Boolean) would open on the first
// submission; the owed-aware form must NOT open until every OWING seat is in.
ok('the gate is shut before anybody submits', !F.combOverflowGateOpen());
check('a wrong-sized discard is refused with the count',
      F.combSubmitOverflow(1, [3, 0, 0, 0, 0]).reason, 'Pick exactly 4 to let go.');
// The COUNT is checked before the CONTENTS, deliberately: "pick exactly 4" is
// the more useful answer to a player who has picked three, and a right-sized
// pick of something they do not hold is the rarer mistake.
check('a right-sized discard of what you do not hold is refused',
      F.combSubmitOverflow(1, [0, 4, 0, 0, 0]).reason, 'You have not got that to give.');
ok('seat 1 submits', F.combSubmitOverflow(1, [4, 0, 0, 0, 0]).ok);
check('…and its hand is halved', G.hands[1], [4, 0, 0, 0, 0]);
ok('the gate is STILL shut with seat 3 outstanding', !F.combOverflowGateOpen());
check('the phase has not moved on', G.phase, 'overflow');
check('a second submission from the same seat is refused', F.combSubmitOverflow(1, [1,0,0,0,0]).ok, false);
ok('seat 3 submits', F.combSubmitOverflow(3, [3, 1, 0, 0, 0]).ok);
ok('now the gate opens', F.combOverflowGateOpen());
check('and the seven moves to the Wasp', G.phase, 'waspMove');

section('The Overflow gate when NOBODY owes — the vacuous-open trap');
newMatch(4, { overflow: 'snug' });
G.hands = [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]];
G.phase = 'roll';
F.combBeginSeven();
check('nobody over the limit means no overflow phase at all', G.phase, 'waspMove');
G.owed = [0, 0, 0, 0]; G.ready = [false, false, false, false];
ok('an all-zero owed[] leaves the gate vacuously OPEN, by design',
   F.combOverflowGateOpen());
G.ready = [];
ok('…but an EMPTY ready[] is shut, not vacuously open', !F.combOverflowGateOpen());

section('The Wasp — the steal is a consequence of the MOVE, not of the roll');
newMatch(4, { wasp: 'blocks' });
const hA = hexWithMarker(9);
plant(hA, 1, 1, 0);
G.hands[1] = [3, 0, 0, 0, 0];
G.phase = 'waspMove';
G.turn = 0;
check('a hex the Wasp already sits on is refused',
      F.combWaspMove(0, G.wasp).reason, 'The Wasp is already there.');
let res = F.combWaspMove(0, hA);
ok('the move lands', res.ok);
check('Blocks Only never enters the steal', G.phase, 'actions');
check('the landing is counted', G.stats.waspLandings, 1);

newMatch(4, { wasp: 'steals' });
plant(hA, 1, 1, 0);
plant(hA, 0, 1, 2);            // the mover's own cell — never a victim
plant(hA, 2, 1, 4);            // empty-handed — nothing to take
G.hands[1] = [3, 0, 0, 0, 0];
G.hands[2] = [0, 0, 0, 0, 0];
// ⚠️ The mover is given a FULL hand on purpose. With an empty one the mover
// would be excluded by the empty-hand guard and the "never your own victim"
// rule would be indistinguishable from its own absence — a mutant proved
// exactly that (impl-notes BUG-02 is this same mistake on the tie rule).
G.hands[0] = [4, 0, 0, 0, 0];
G.phase = 'waspMove'; G.turn = 0;
res = F.combWaspMove(0, hA);
check('only the neighbour with something to take is a victim', res.victims, [1]);
check('the mover is never their own victim, even holding plenty',
      F.combWaspVictims(hA, 0).indexOf(0), -1);
check('the phase waits on the steal', G.phase, 'waspSteal');
check('robbing somebody the Wasp cannot reach is refused',
      F.combWaspSteal(0, 3).reason, 'The Wasp cannot reach them.');
const stole = F.combWaspSteal(0, 1);
ok('the steal resolves', stole.ok);
check('exactly one resource moved', [F.combHandCount(0), F.combHandCount(1)], [5, 2]);
check('and the turn opens', G.phase, 'actions');

section('The Wasp’s draw is over HOLDINGS, not over resource kinds');
newMatch(4, { wasp: 'steals', seed: 4242 });
G.hands[1] = [40, 0, 0, 0, 1];   // 40 Resin, 1 Jelly
const drawn = { 0: 0, 4: 0 };
for (let i = 0; i < 200; i++) { const k = F.combPickStolen(1); if (drawn[k] !== undefined) drawn[k]++; }
ok('Resin is drawn far more often than Jelly at 40:1', drawn[0] > drawn[4] * 5);
ok('…and Jelly is still reachable', drawn[4] >= 0);
G.hands[1] = [0, 0, 0, 0, 0];
check('an empty hand yields no draw', F.combPickStolen(1), -1);

// ══ 5. The turn ═══════════════════════════════════════════════════════════
section('End Turn — and the win that is only ever checked on your own turn');
newMatch(4);
G.phase = 'actions'; G.turn = 1; G.turnNo = 5;
check('a seat that is not active cannot end the turn', F.combEndTurn(2).ok, false);
ok('the active seat can', F.combEndTurn(1).ok);
check('the turn passes to seat 2', G.turn, 2);
check('the turn number advances', G.turnNo, 6);
check('the new turn is back in the roll phase', G.phase, 'roll');

newMatch(4);
G.phase = 'actions'; G.turn = 0;
G.offer = { from: 0, to: 1, give: [1,0,0,0,0], want: [0,1,0,0,0], responses: [] };
check('an open dance blocks End Turn', F.combEndTurn(0).reason, 'Finish the dance first.');
G.offer = null;
ok('clearing it unblocks', F.combEndTurn(0).ok);

newMatch(4);
G.phase = 'actions';
// Seat 2 is on the target; seat 0 is the one ending its turn.
for (let i = 0; i < 7; i++) G.nodes[T.nodes.length - 1 - i * 2] = { owner: 2, level: 1 };
check('seat 2 is at the target', F.combTruePoints(2) >= F.combTarget(), true);
G.turn = 0;
const r0 = F.combEndTurn(0);
check('ending seat 0’s turn does NOT win it for seat 2', r0.won, false);
check('…and the match carries on', G.phase, 'roll');
G.phase = 'actions'; G.turn = 2;
const r2 = F.combEndTurn(2);
check('seat 2 ending its OWN turn wins', r2.won, true);
check('…and the season is over', G.phase, 'gameover-pending');

section('Standings and the one moment Golden Nectar becomes public');
newMatch(4);
G.nodes[0] = { owner: 1, level: 2 };
F.combSetHand(1, [0,0,0,0,0]);
G.instinct[1] = [{ kind: 'golden', boughtTurn: 1, played: false },
                 { kind: 'guard',  boughtTurn: 1, played: false }];
check('Golden Nectar is invisible in public points', F.combPublicPoints(1), 2);
check('…and counts in the true score',               F.combTruePoints(1), 3);
check('standings sort by TRUE points', F.combStandings()[0].idx, 1);

// ══ 6. Daylight ═══════════════════════════════════════════════════════════
section('Daylight — host-owned, armed when the actions phase begins');
newMatch(4, { daylight: 'allday' });
check('All Day is no clock at all', F.combDaylightMs(), 0);
G.phase = 'roll'; G.turn = 0;
F.combEnterActions();
check('…so no end timestamp is set', G.endTs, 0);

newMatch(4, { daylight: 'shortday' });
check('Short Day is 60 s', F.combDaylightMs(), 60000);
G.phase = 'roll'; G.turn = 0;
clock.reset();
F.combEnterActions();
check('the clock is armed on entering actions', G.endTs, clock.now + 60000);
check('…and a ticking interval exists', clock.count(), 1);
// ⚠️ Not at turn begin: three other people's Overflow taps must not eat the
// active player's clock, so COMB_TURN_BEGIN carries 0 and ACTIONS_BEGIN carries
// the real timestamp.
F.combBeginTurn(1);
check('turn begin does NOT arm the clock', G.endTs, 0);

newMatch(4, { daylight: 'shortday' });
G.phase = 'actions'; G.turn = 2; G.turnNo = 9;
F.combStartDaylight();
F.combDaylightExpire();
check('expiry ends the turn', G.turn, 3);
check('…and stops the clock', G.endTs, 0);
check('…leaving no interval behind', Array.from(clock.timers.values()).filter(t => t.repeat).length, 0);

newMatch(4, { daylight: 'shortday' });
G.phase = 'actions'; G.turn = 2;
sandbox.window.syllyMultiplayerMode = 'client';
F.combStartDaylight();
F.combDaylightExpire();
check('a CLIENT never acts on expiry — it only renders the countdown', G.turn, 2);
sandbox.window.syllyMultiplayerMode = 'single';

section('Timer lifecycle — every handle is owned by the teardown');
newMatch(4, { daylight: 'shortday' });
G.phase = 'roll'; G.turn = 0;
F.combEnterActions();
F.combBeginTurn(1);                       // arms the Scout Flight beat too
ok('handles are live before teardown', clock.count() > 0);
F.combResetState();
check('combResetState() clears every one of them', clock.count(), 0);

// ══ 7. The Season Log ═════════════════════════════════════════════════════
section('The Season Log — a public record, and the leak it must not be');
newMatch(4, { wasp: 'steals', overflow: 'snug' });
playDraft();
G.phase = 'waspMove'; G.turn = 0;
plant(hA, 1, 1, 0);
F.combSetHand(1, [0, 0, 0, 3, 0]);        // seat 1 holds ONLY Nectar
F.combWaspMove(0, hA);
F.combWaspSteal(0, 1);
const stealLines = G.log.filter(l => /robbed/.test(l));
check('the steal is logged once', stealLines.length, 1);
ok('…naming the victim', /Bo/.test(stealLines[0]));
// ⚠️ Seat 1 held ONLY Nectar, so the theft is deducible from any resource name
// on that line. This is the log's single most likely leak.
ok('…and naming NO resource', !C.COMB_RES.some(k => stealLines[0].indexOf(C.COMB_RES_NAME[k]) !== -1));

newMatch(4, { overflow: 'snug' });
G.hands = [[0,0,0,0,8],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
G.phase = 'roll';
F.combBeginSeven();
F.combSubmitOverflow(0, [0, 0, 0, 0, 4]);
ok('an Overflow discard names no resource anywhere in the log',
   !G.log.some(l => C.COMB_RES.some(k => l.indexOf(C.COMB_RES_NAME[k]) !== -1 && /spill|let go/i.test(l))));

section('A full seeded match leaks nothing through the log');
newMatch(4, { wasp: 'steals', overflow: 'snug', seed: 777 });
playDraft();
for (let t = 0; t < 120 && G.phase !== 'gameover-pending'; t++) {
  if (G.phase === 'roll') { F.combScoutFlight(G.turn); continue; }
  if (G.phase === 'overflow') {
    for (let p = 0; p < 4; p++) {
      if (!G.owed[p] || G.ready[p]) continue;
      const d = [0, 0, 0, 0, 0];
      let left = G.owed[p];
      for (let i = 0; i < 5 && left; i++) { const take = Math.min(left, G.hands[p][i]); d[i] = take; left -= take; }
      F.combSubmitOverflow(p, d);
    }
    continue;
  }
  if (G.phase === 'waspMove')  { F.combWaspMove(G.turn, (G.wasp + 1) % 19); continue; }
  if (G.phase === 'waspSteal') { F.combWaspSteal(G.turn, F.combWaspVictims(G.wasp, G.turn)[0]); continue; }
  if (G.phase === 'actions')   { F.combEndTurn(G.turn); continue; }
  break;
}
ok('the match ran a long way', G.turnNo > 20);
check('every Scout Flight was counted', G.stats.scoutFlights, G.turnNo);
const badLines = G.log.filter(l => /robbed|spilled/.test(l) &&
  C.COMB_RES.some(k => l.indexOf(C.COMB_RES_NAME[k]) !== -1));
check('no steal or spill line names a resource', badLines, []);
ok('the log is capped, not unbounded', G.log.length <= 200);

// ══ 8. Serialise / apply ══════════════════════════════════════════════════
// ══ The action layer (Step 5 chunk 5) ═════════════════════════════════════
// The loopback proves these appliers across a wire; these prove the ARITHMETIC,
// which a packet test cannot see: what a trade conserves, what the Meadow's
// stock does under Limited Bounty, and what a turn resets.

// Total resources held by the table — the invariant a player-to-player trade
// must leave untouched, and the one a Pheromone must leave untouched too.
function tableTotal() {
  let t = 0;
  for (let p = 0; p < G.count; p++) for (const v of (G.hands[p] || [])) t += v | 0;
  return t;
}
// Land seat 0 in a fresh actions phase with a known hand.
function actingSeat0(hand) {
  G.phase = 'actions'; G.turn = 0;
  G.offer = null; G.freeWalls = 0; G.playedThis = false;
  for (let p = 0; p < G.count; p++) F.combSetHand(p, [0, 0, 0, 0, 0]);
  if (hand) F.combSetHand(0, hand);
}

section('The Waggle Dance — a trade moves resources without creating any');
newMatch(3);
playDraft();
actingSeat0([3, 0, 0, 0, 0]);
F.combSetHand(1, [0, 0, 0, 2, 0]);
const totalBefore = tableTotal();
check('a directed offer posts', F.combPostOffer(0, 1, [2, 0, 0, 0, 0], [0, 0, 0, 1, 0]).ok, true);
check('the audience is exactly the one seat asked', F.combOfferAudience(), [1]);
check('an accept from the asked seat deals', F.combRespondOffer(1, true).ok, true);
check('seat 0 gave two and took one', G.hands[0], [1, 0, 0, 1, 0]);
check('seat 1 took two and gave one', G.hands[1], [2, 0, 0, 1, 0]);
// ⚠️ A trade is a MOVE, not a mint. Resin left the poster and arrived at the
// partner; nothing entered or left the table.
check('the table holds exactly what it held', tableTotal(), totalBefore);
ok('the offer is closed', G.offer === null);

section('An open offer asks everybody, and only an accepter can be picked');
actingSeat0([3, 0, 0, 0, 0]);
F.combSetHand(2, [0, 0, 0, 2, 0]);
F.combPostOffer(0, -1, [2, 0, 0, 0, 0], [0, 0, 0, 1, 0]);
check('the audience is every other seat', F.combOfferAudience(), [1, 2]);
F.combRespondOffer(1, false);
F.combRespondOffer(2, true);
check('only the accepter is selectable', F.combOfferAccepters(), [2]);
check('picking the decliner is refused', F.combSelectPartner(0, 1).reason, 'They have not said yes.');
check('picking a seat that never answered is too', F.combSelectPartner(0, 0).ok, false);
check('picking the accepter deals', F.combSelectPartner(0, 2).ok, true);
check('the decliner is untouched', G.hands[1], [0, 0, 0, 0, 0]);

section('Re-validate at execution — the offer is never escrowed');
actingSeat0([1, 1, 0, 0, 0]);
F.combSetHand(1, [0, 0, 0, 1, 0]);
F.combPostOffer(0, 1, [1, 1, 0, 0, 0], [0, 0, 0, 1, 0]);
// The poster's resources were NOT locked away by posting — that is the whole of
// brief §14c, and it is what makes this build legal.
const e0 = F.combPlaceLegal ? G.edges.findIndex((v, i) => F.combPlaceLegal('wall', i, 0, {}).ok) : -1;
check('the poster can still spend what they offered', F.combBuild(0, 'wall', e0).ok, true);
check('  …and the deal then fails rather than half-happening',
      F.combRespondOffer(1, true).reason, "That deal's gone stale.");
check('the partner kept everything', G.hands[1], [0, 0, 0, 1, 0]);
ok('and no resource is locked anywhere', G.offer === null);

section('Full Dance expiry — an unanswered dance resolves itself');
G.waggle = 'full';
actingSeat0([3, 0, 0, 0, 0]);
F.combPostOffer(0, -1, [2, 0, 0, 0, 0], [0, 0, 0, 1, 0]);
ok('a deadline was set', G.offer.expiresAt > 0);
F.combOfferExpire();
ok('nobody answered, so the offer is gone', G.offer === null);
check('and the poster still holds their side', G.hands[0], [3, 0, 0, 0, 0]);
actingSeat0([3, 0, 0, 0, 0]);
F.combSetHand(2, [0, 0, 0, 2, 0]);
F.combPostOffer(0, -1, [2, 0, 0, 0, 0], [0, 0, 0, 1, 0]);
F.combRespondOffer(2, true);
F.combOfferExpire();
// The timer's job was the STALL, not the choice: with an accepter in hand the
// offer survives and the poster picks from a now-complete set of answers.
ok('an offer somebody accepted survives its own deadline', G.offer !== null);
check('  …with the silent seat recorded as a decline', G.offer.responses[1], -1);
G.waggle = 'outloud';

section("The Meadow's rates — and what Limited Bounty does to them");
newMatch(3, { bounty: 'limited' });
playDraft();
actingSeat0(null);
const rate0 = F.combBankRate(0, 0);
F.combSetHand(0, [rate0 - 1, 0, 0, 0, 0]);
check('one short of the rate is refused', F.combBankTrade(0, 0, 3).ok, false);
F.combSetHand(0, [rate0, 0, 0, 0, 0]);
const supplyBefore = G.supply.slice();
check('the rate exactly is enough', F.combBankTrade(0, 0, 3).ok, true);
check('  …charged to the last one', G.hands[0], [0, 0, 0, 1, 0]);
// The Meadow is a closed system under Limited Bounty: what you hand over goes
// back on the pile, and what you take comes off it.
check('the meadow took back exactly the rate', G.supply[0] - supplyBefore[0], rate0);
check('  …and paid out exactly one',           supplyBefore[3] - G.supply[3], 1);
G.supply[1] = 0;
F.combSetHand(0, [rate0, 0, 0, 0, 0]);
check('a dry meadow cannot pay', F.combBankTrade(0, 0, 1).reason, 'The meadow has none of that left.');
check('  …and charged nothing for refusing', G.hands[0], [rate0, 0, 0, 0, 0]);

section('Buying an Instinct card');
newMatch(3, { bounty: 'limited' });
playDraft();
actingSeat0([0, 0, 1, 1, 1]);
const deckBefore = G.deck.length, supplyPollen = G.supply[2];
check('the buy succeeds', F.combBuyInstinct(0).ok, true);
check('the deck is one shorter', G.deck.length, deckBefore - 1);
check('the buyer holds one card',  G.instinct[0].length, 1);
check('  …stamped with the turn it was bought', G.instinct[0][0].boughtTurn, G.turnNo);
check('the cost was charged',      G.hands[0], [0, 0, 0, 0, 0]);
check('  …and went back to the meadow', G.supply[2] - supplyPollen, 1);
check('the public count is one for the buyer', F.combInstinctCounts(), [1, 0, 0]);
F.combSetHand(0, [0, 0, 1, 1, 1]);
G.deck = [];
check('an empty deck refuses', F.combBuyInstinct(0).reason, 'The instinct deck is empty.');

section('Playing an Instinct card — one a turn, never the turn you bought it');
newMatch(3);
playDraft();
actingSeat0([0, 0, 0, 0, 0]);
F.combSetInstinct(0, [
  { kind: 'guard',     boughtTurn: 0, played: false },
  { kind: 'golden',    boughtTurn: 0, played: false },
  { kind: 'rush',      boughtTurn: 0, played: false },
  { kind: 'bloom',     boughtTurn: 0, played: false },
  { kind: 'pheromone', boughtTurn: 0, played: false },
  { kind: 'rush',      boughtTurn: G.turnNo, played: false },
]);
check('Golden Nectar is never playable', F.combPlayInstinct(0, 1, {}).ok, false);
ok('  …and is not spent by the attempt', !G.instinct[0][1].played);
check('a card bought this turn is refused',
      F.combPlayInstinct(0, 5, {}).reason, "That one's still settling in.");
check('a malformed Spring Bloom is refused',
      F.combPlayInstinct(0, 3, {}).reason, 'Pick two from the meadow.');
// ⚠️ A refused effect must cost NOTHING. Spending the card first and validating
// second would eat both the card and the turn's single play on a typo.
ok('  …without eating the card',        !G.instinct[0][3].played);
ok('  …or the turn\'s one play',        !G.playedThis);
check('Spring Bloom with two picks plays', F.combPlayInstinct(0, 3, { picks: [1, 4] }).ok, true);
check('  …taking exactly those two',       G.hands[0], [0, 1, 0, 0, 1]);
check('one instinct a turn', F.combPlayInstinct(0, 2, {}).reason, 'One instinct a turn.');

section('Comb Rush — two free walls, and they do not carry');
newMatch(3);
playDraft();
actingSeat0([0, 0, 0, 0, 0]);
F.combSetInstinct(0, [{ kind: 'rush', boughtTurn: 0, played: false }]);
check('Comb Rush plays with an empty hand', F.combPlayInstinct(0, 0, {}).ok, true);
check('  …granting two', G.freeWalls, 2);
const w1 = G.edges.findIndex((v, i) => F.combPlaceLegal('wall', i, 0, {}).ok);
check('a wall lands with nothing in hand', F.combBuild(0, 'wall', w1).ok, true);
check('  …costing nothing',                G.hands[0], [0, 0, 0, 0, 0]);
check('  …and spending one of the two',    G.freeWalls, 1);
F.combBeginTurn(1);
check('an unspent free wall does not carry into the next turn', G.freeWalls, 0);

section('Pheromone Dominance moves everything, and creates nothing');
newMatch(3);
playDraft();
actingSeat0([0, 1, 0, 0, 0]);
F.combSetHand(1, [0, 3, 0, 1, 0]);
F.combSetHand(2, [0, 2, 0, 0, 0]);
F.combSetInstinct(0, [{ kind: 'pheromone', boughtTurn: 0, played: false }]);
const pheroTotal = tableTotal();
check('naming no resource is refused',
      F.combPlayInstinct(0, 0, {}).reason, 'Name a resource first.');
check('naming one plays', F.combPlayInstinct(0, 0, { resIdx: 1 }).ok, true);
check('every Wax on the table is now the players', G.hands[0], [0, 6, 0, 0, 0]);
check('  …and only Wax moved',                     G.hands[1], [0, 0, 0, 1, 0]);
check('the table total is unchanged',              tableTotal(), pheroTotal);

section('Daylight is armed once a TURN, not once per actions phase');
newMatch(3, { daylight: 'shortday' });
playDraft();
F.combBeginTurn(0);
G.phase = 'actions'; G.roll = 8;
F.combEnterActions();
const armedAt = G.endTs;
ok('a deadline exists', armedAt > 0);
ok('and is flagged as armed', G.daylightArmed);
// A Guard Bee sends the turn out to waspMove and back through combEnterActions().
// Without the per-turn flag that hands the active player a fresh sixty seconds.
F.combEnterWaspMove();
F.combEnterActions();
check('re-entering actions does not restart the clock', G.endTs, armedAt);
F.combBeginTurn(1);
ok('a new turn re-arms it', !G.daylightArmed || G.endTs !== armedAt);

section('combSerialiseState() — exactly the Match group, nothing derived');
newMatch(4, { wasp: 'steals' });
playDraft();
F.combScoutFlight(G.turn);
const snap = F.combSerialiseState();
const KEYS = ['boardSeed','hexes','nodes','edges','waspHex','hands','instinct','deck','supply',
              'turn','turnNo','phase','roll','guardsPlayed','largestHolder','fiercestHolder',
              'draftOrder','draftStep','draftAnchor','instinctPlayedThisTurn','log','stats',
              // Chunk 5: an unspent Comb Rush is authoritative state, not derived.
              // Nothing on the board and nothing in a hand says two free walls are
              // still owed, so a snapshot without it restores a different position.
              'freeWalls'];
check('the snapshot carries exactly the Match group', Object.keys(snap).sort(), KEYS.slice().sort());
['chainLen','points','zoom','panX','placementMode','legalTargets','pendingTarget','howtoTab','rng']
  .forEach(k => ok(`…and NOT the derived/presentation field "${k}"`, !(k in snap)));

section('combApplyState() — a round trip is the identity');
const beforeSnap = JSON.stringify(stable(snap));
F.combResetState();
G.count = 4; G.names = ['Ada', 'Bo', 'Cy', 'Di'];
F.combApplyState(JSON.parse(JSON.stringify(snap)));
check('serialise -> apply -> serialise is a fixed point',
      JSON.stringify(stable(F.combSerialiseState())), beforeSnap);
ok('the derived chain cache was rebuilt', G.chainLen.length === 4);

section('⚠️ A restored holder is RESTORED, never recomputed');
// Two equal 5-chains: the board cannot tell you who got there first, so a
// recompute is a coin flip worth 4 points. Seat 2 is the incumbent, and seat 2
// is deliberately NOT the lowest-numbered leader (comb BUG-02's lesson).
newMatch(4);
G.phase = 'actions';
// A greedy walk dead-ends the moment it reaches a node whose free edges are
// gone, so it retries from every start until it actually gets a run of five —
// and rolls back the partial run each time, or the second seat inherits the
// first seat s leftovers and the tie under test never happens.
function runOfFive(p) {
  for (let start = 0; start < T.nodes.length; start++) {
    const laid = []; let node = start; const seen = new Set();
    for (let i = 0; i < 5; i++) {
      const e = T.edgesOfNode[node].find(x => !seen.has(x) && G.edges[x] === -1);
      if (e === undefined) break;
      seen.add(e); G.edges[e] = p; laid.push(e);
      const [a, b] = T.nodesOfEdge[e]; node = (a === node) ? b : a;
    }
    if (laid.length === 5) return laid;
    laid.forEach(e => { G.edges[e] = -1; });
  }
  return [];
}
check("seat 1 gets a run of five", runOfFive(1).length, 5);
check("seat 2 gets one too",       runOfFive(2).length, 5);
G.largest = 2; G.fiercest = -1;
F.combRecomputeAchievements();
check('both seats reach 5', [G.chainLen[1], G.chainLen[2]], [5, 5]);
check('the incumbent keeps a tie in the live game', G.largest, 2);
const tieSnap = F.combSerialiseState();
check('…and the snapshot carries the holder, not the board', tieSnap.largestHolder, 2);
F.combResetState();
G.count = 4; G.names = ['Ada', 'Bo', 'Cy', 'Di'];
F.combApplyState(JSON.parse(JSON.stringify(tieSnap)));
check('a restore keeps seat 2 as holder, NOT the lowest-numbered leader', G.largest, 2);
check('…and the chain cache still rebuilt correctly', [G.chainLen[1], G.chainLen[2]], [5, 5]);
// The mirror: had the recompute been allowed to decide, an incumbent of -1
// with two tied leaders would also have to stay -1.
tieSnap.largestHolder = -1;
F.combApplyState(JSON.parse(JSON.stringify(tieSnap)));
check('a restored "Unclaimed" survives the recompute too', G.largest, -1);

section('Firebase-shaped emptiness survives an apply');
const empty = F.combSerialiseState();
delete empty.log; delete empty.deck; delete empty.hands; delete empty.supply;
empty.guardsPlayed = undefined;
F.combApplyState(empty);
check('an erased log rebuilds as []',        G.log, []);
check('an erased hands[] rebuilds full-length and empty',
      G.hands, [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]);
check('an erased supply rebuilds to 5 zeroes', G.supply, [0, 0, 0, 0, 0]);
check('an erased guardsPlayed rebuilds full-length', G.guards, [0, 0, 0, 0]);

// ══ 8b. The Sun Compass beat ══════════════════════════════════════════════
// Presentation is not this harness's job and none of the motion is asserted
// here. The BUDGET is, because it is a rule and not a look: Appendix B3's whole
// finding is that this beat fires 60–80 times a match, so a total that drifts
// past the ceiling costs minutes of a season while looking fine on one roll.
// Nothing on screen would report it and no reviewer would catch it by eye.
section('The Scout Flight beat stays inside its budget');
check('the three parts are the whole beat and nothing more',
      C.COMB_FLIGHT_SPIN_F + C.COMB_FLIGHT_LAND_F + C.COMB_FLIGHT_FADE_F, 1);
ok('the opening beat is inside spec §2\u2019s 800–1200 ms',
   C.COMB_FLIGHT_MS >= 800 && C.COMB_FLIGHT_MS <= 1200);
ok('the shortened one is shorter, and still long enough to read',
   C.COMB_FLIGHT_SHORT_MS < C.COMB_FLIGHT_MS && C.COMB_FLIGHT_SHORT_MS >= 400);

newMatch(3);
playDraft();
G.turnNo = 1;
check('flight 1 gets the full flourish', F.combFlightTotalMs(), C.COMB_FLIGHT_MS);
G.turnNo = C.COMB_FLIGHT_FULL_TURNS;
check('…and so does the last of the opening ones', F.combFlightTotalMs(), C.COMB_FLIGHT_MS);
G.turnNo = C.COMB_FLIGHT_FULL_TURNS + 1;
check('the very next one is the short beat', F.combFlightTotalMs(), C.COMB_FLIGHT_SHORT_MS);
G.turnNo = 80;
check('…and it stays short for the rest of a long season',
      F.combFlightTotalMs(), C.COMB_FLIGHT_SHORT_MS);
// The spin is the only DEAD slice — the land and fade play over a board the
// player can already act on — so it is the half the budget really constrains.
ok('the blind spin is only part of the beat, never the whole of it',
   F.combFlightSpinMs() > 0 && F.combFlightSpinMs() < F.combFlightTotalMs());

// ══ 9. Silence ════════════════════════════════════════════════════════════
section('Silence — mpSendEnvelope/mpSendPrivate would THROW if called');
newMatch(3, { wasp: 'steals', overflow: 'snug', daylight: 'shortday', bounty: 'limited' });
playDraft();
F.combScoutFlight(G.turn);
if (G.phase === 'actions') F.combEndTurn(G.turn);
ok('a whole deal, draft, flight and turn broadcast nothing in single mode', true);
check('…and a 3-seat match is a 6-step snake', G.order.length, 6);

console.log(`\n${'='.repeat(70)}`);
if (failures) { console.log(`${failures} of ${checks} CHECKS FAILED`); process.exit(1); }
console.log(`ALL ${checks} CHECKS PASSED`);
