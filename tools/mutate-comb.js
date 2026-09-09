// ═════════════════════════════════════════════════════════════════════════
// mutate-comb.js — planted-drift runner for Honeycomb Hills' harnesses.
//
//   node tools/mutate-comb.js           (exits 1 if any mutant SURVIVES)
//
// Every entry below is a small, PLAUSIBLE mis-implementation of one specced
// rule, written into a throwaway copy of js/games/comb.js and driven through
// the three harnesses via COMB_SRC=. A mutant is CAUGHT if any of them goes red.
//
// WHY THIS EXISTS (impl-notes TG-04). A green harness is a claim; this is the
// only thing that checks it. COMB's rules harness reached 111 passing checks
// while failing to cover spec §6's headline rule — the tie transfer the spec
// names in bold — and a fifteen-minute mutation run is what found that (BUG-02).
// A mutant that SURVIVES means the rule it broke is indistinguishable from its
// own absence: either it is untested or it is dead code, and only this tells
// you which.
//
// Add a mutant whenever a new rule lands. The rules worth planting are the ones
// the SPEC names by name — those are the ones a harness is most likely to have
// gone green around rather than through.
// ═════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const OUT  = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'comb-mutants-'));
fs.mkdirSync(OUT, { recursive: true });
const GAME = path.join(ROOT, 'js/games/comb.js');
const SRC  = fs.readFileSync(GAME, 'utf8');
const HARNESSES = ['tools/verify-comb-board.js', 'tools/verify-comb-rules.js',
                   'tools/verify-comb-loop.js', 'tools/verify-comb-loopback.js'];

// [name, [ [from, to], ... ]]
const M = [

// ── spec §6: "Both transfers use > and never >=. That is the whole of Q18's
//    tie rule." Two mutants, because the guard is deliberately doubled (DD-03)
//    and neither half alone can be shown to matter.
['tie-transfers-to-a-tied-challenger', [
 ['  if ((scores[holder] || 0) === best) return holder;   // the incumbent keeps a tie',
  '  // MUTANT: the incumbent no longer keeps a tie'],
 ['  if (leaders.length === 1) return leaders[0];         // beaten outright -> transfer',
  '  if (leaders.length >= 1) return leaders[0];          // MUTANT: >= not ===']]],

['tie-both-guards-removed', [
 ['  if ((scores[holder] || 0) === best) return holder;   // the incumbent keeps a tie',
  '  // MUTANT'],
 ['  if (leaders.length === 1) return leaders[0];         // beaten outright -> transfer',
  '  return leaders[0];                                   // MUTANT']]],

// ── spec §6: an incumbent beaten by TWO players at once keeps it.
['tie-two-challengers-take-it', [[
  `  // Beaten by TWO players at once: no single challenger beat them outright, so`,
  `  return leaders[0];   // MUTANT: the lowest-numbered of two challengers takes it
  // Beaten by TWO players at once: no single challenger beat them outright, so`]]],

// ── spec §11: "the readyCheck gate — assert it per mode". [].every() is true.
['overflow-gate-plain-every', [[
  '  return combOverflowReady.every((r, i) => (combOverflowOwed[i] | 0) === 0 || r);',
  '  return combOverflowReady.every(Boolean);   // MUTANT']]],

['overflow-gate-open-on-first-tap', [[
  '  return combOverflowReady.every((r, i) => (combOverflowOwed[i] | 0) === 0 || r);',
  '  return combOverflowReady.some(Boolean);    // MUTANT']]],

// ── spec §11: combApplyState must NOT let the recompute change the two
//    restored holders. "the one subtle bit."
['restore-lets-the-board-decide-the-holder', [[
  `    combLargestHolder  = (typeof s.largestHolder  === 'number') ? s.largestHolder  : -1;
    combFiercestHolder = (typeof s.fiercestHolder === 'number') ? s.fiercestHolder : -1;`,
  '    // MUTANT: the recompute keeps whatever it decided']]],

// ── spec §4: the two holders are AUTHORITATIVE state, so they must serialise.
// The `draftOrder` line is an ANCHOR, not decoration: chunk 4's
// combBroadcastBoard() sends the same two fields at the same indent, and without
// it this mutant patched the PACKET instead of the snapshot, left the snapshot
// intact and survived. See impl-notes ML-02.
['snapshot-drops-the-holders', [[
  `    largestHolder: combLargestHolder,
    fiercestHolder: combFiercestHolder,
    draftOrder: combDraftOrder.slice(),`,
  '    draftOrder: combDraftOrder.slice(),   // MUTANT: holders treated as derived']]],

// ── spec §6/§10: the Wasp shuts its own hex down.
['wasp-does-not-block-production', [[
  '    if (h === combWaspHex) continue;                    // the Wasp shuts its hex down',
  '    // MUTANT: the Wasp blocks nothing']]],

// ── spec §5: "Hold more than 7 and a 7 costs you HALF."
['overflow-takes-everything', [[
  '      if (held > limit) combOverflowOwed[p] = Math.floor(held / 2);',
  '      if (held > limit) combOverflowOwed[p] = held;   // MUTANT']]],

['overflow-rounds-up', [[
  '      if (held > limit) combOverflowOwed[p] = Math.floor(held / 2);',
  '      if (held > limit) combOverflowOwed[p] = Math.ceil(held / 2);   // MUTANT']]],

['overflow-bites-at-the-limit-not-over-it', [[
  '      if (held > limit) combOverflowOwed[p] = Math.floor(held / 2);',
  '      if (held >= limit) combOverflowOwed[p] = Math.floor(held / 2);   // MUTANT']]],

// ── spec §6: a Queen Dome collects double.
['dome-collects-single', [[
  '      produced[nd.owner][ri] += nd.level;               // a Cell 1, a Dome 2',
  '      produced[nd.owner][ri] += 1;                      // MUTANT']]],

// ── spec §6: the win is checked ONLY on the active player's own turn.
['win-checked-for-everybody', [[
  '  if (combCheckWin()) { combFinishMatch(); return { ok: true, won: true }; }',
  `  for (let p = 0; p < combPlayerCount; p++) {
    if (combTruePoints(p) >= combTarget()) { combFinishMatch(); return { ok: true, won: true }; }
  }   // MUTANT: any seat can win on anybody's turn`]]],

// ── spec §6: Golden Nectar is hidden and counts only in the true score.
['golden-nectar-shows-in-public-points', [[
  '  const hidden = (combInstinct[p] || []).filter(c => c.kind === \'golden\').length;\n  return combPublicPoints(p) + hidden;',
  '  return combPublicPoints(p);   // MUTANT']]],

// ── Catan's opening payout belongs to the SECOND cell only.
['opening-yield-on-both-cells', [[
  '    if (combDraftStep >= combPlayerCount) combGrantOpeningYield(playerIdx, targetIdx);',
  '    combGrantOpeningYield(playerIdx, targetIdx);   // MUTANT']]],

['opening-yield-never-paid', [[
  '    if (combDraftStep >= combPlayerCount) combGrantOpeningYield(playerIdx, targetIdx);',
  '    // MUTANT: no opening payout at all']]],

// ── The opening wall must touch the cell just placed (§7's exemption is for
//    the CELL only). Without it a draft wall seeds a disconnected network.
['draft-wall-lands-anywhere', [[
  `    if (typeof opts.anchor !== 'number' || opts.anchor < 0) return { ok: true };
    const ends = COMB_TOPOLOGY.nodesOfEdge[e];
    if (ends[0] === opts.anchor || ends[1] === opts.anchor) return { ok: true };
    return { ok: false, reason: 'It has to touch the cell you just placed.' };`,
  '    return { ok: true };   // MUTANT']]],

// ── The snake is the last seat's whole compensation.
['draft-order-not-a-snake', [[
  '  return fwd.concat(fwd.slice().reverse());',
  '  return fwd.concat(fwd);   // MUTANT: two forward laps, no snake']]],

// ── spec §10: the Meadow's Bounty, Limited — Catan's shortage rule.
['rationing-pays-partial-to-everyone', [[
  '    else for (let p = 0; p < combPlayerCount; p++) produced[p][i] = 0;',
  '    else { combSupply[i] = 0; }   // MUTANT: everyone keeps their claim']]],

['spent-resources-never-return', [[
  '      combReturnToSupply(cost);                // a no-op unless Bounty is Limited',
  '      // MUTANT: the Meadow never gets its resources back']]],

// ── spec §11: the log must never name what a steal took.
['log-names-the-stolen-resource', [[
  "  combLogAppend('The Wasp robbed ' + combName(victimIdx) + '.');",
  "  combLogAppend('The Wasp robbed ' + combName(victimIdx) + ' of a ' + (ri >= 0 ? COMB_RES_NAME[COMB_RES[ri]] : 'nothing') + '.');   // MUTANT: leak"]]],

// ── The Wasp's draw is over HOLDINGS, not over resource kinds.
['steal-draws-uniformly-over-kinds', [[
  `  let k = Math.floor(combRandom() * total);
  for (let i = 0; i < hand.length; i++) { k -= (hand[i] | 0); if (k < 0) return i; }`,
  `  const held = [];
  for (let i = 0; i < hand.length; i++) if (hand[i] > 0) held.push(i);
  return held[Math.floor(combRandom() * held.length)];   // MUTANT`]]],

// ── The mover is never their own victim, and an empty hand is not a victim.
['wasp-robs-the-mover-too', [[
  '    if (nd.owner === thief) continue;',
  '    // MUTANT: the mover can rob themselves']]],

['wasp-robs-an-empty-hand', [[
  '    if (combHandCount(nd.owner) < 1) continue;',
  '    // MUTANT: an empty-handed neighbour is offered as a target']]],

// ── The deal must be a pure function of the seed, on both layouts.
// Math.random(), NOT Date.now(): the board harness proves the deal is seeded by
// dealing twice and comparing, and two deals inside one millisecond give
// Date.now() the same answer — so this mutant survived about two runs in five
// while looking like a solid catch. A mutant that only sometimes dies is worse
// than none: it turns the suite's own green into a coin toss. See ML-04.
['deal-is-not-seeded', [[
  '  const rand = window.Physics.rng(seed);',
  '  const rand = window.Physics.rng((Math.random() * 0x7FFFFFFF) >>> 0);   // MUTANT']]],

// ── Daylight is host-owned; a client that acts on expiry ends a second turn.
['clients-act-on-daylight-expiry', [[
  "  if (!combIsAuthority() || combPhase !== 'actions') { combRenderMeadow(); return; }",
  "  if (combPhase !== 'actions') { combRenderMeadow(); return; }   // MUTANT"]]],

// ── Daylight is armed on entering ACTIONS, not at turn begin — or three other
//    people's Overflow taps eat the active player's clock.
['daylight-armed-at-turn-begin', [[
  `    endTimestamp: 0,                       // armed on entering 'actions', see above`,
  '    endTimestamp: (combStartDaylight(), combTurnEndTs),   // MUTANT']]],

// ── End Turn must refuse while a dance is open (spec §7).
['end-turn-abandons-an-open-offer', [[
  "  if (combOffer) return { ok: false, reason: 'Finish the dance first.' };",
  '  // MUTANT: End Turn walks away from an open offer']]],

// ══════════════════════════════════════════════════════════════════════════
// THE PACKET LAYER (Step 5 chunk 4). Every mutant below is invisible to the
// three 'single'-mode harnesses BY CONSTRUCTION — nothing broadcasts in single
// mode — so each of these is a claim about verify-comb-loopback.js and nothing
// else. If one of them is ever caught by loop/rules/board instead, that harness
// has grown a packet dependency it should not have.
// ══════════════════════════════════════════════════════════════════════════

// ── The chunk's own bug (BUG-07): broadcast the turn before advancing it and
//    the next placer never learns it is their go.
['draft-state-carries-the-outgoing-turn', [[
  `  const finished = combDraftAnchor < 0 && combDraftStep >= combDraftOrder.length;
  if (!finished && combDraftAnchor < 0) combTurn = combDraftOrder[combDraftStep];`,
  `  const finished = combDraftAnchor < 0 && combDraftStep >= combDraftOrder.length;
  // MUTANT: the turn advances AFTER the broadcast`],
 [`  if (finished) {
    combDraftFinish();
  } else {
    combArmDraftPlacement();`,
  `  if (finished) {
    combDraftFinish();
  } else {
    if (combDraftAnchor < 0) combTurn = combDraftOrder[combDraftStep];   // MUTANT
    combArmDraftPlacement();`]]],

// ── The stated must-not-miss: the applier re-arms placement, or a client is
//    left looking at a lit board it cannot tap (BUG-05 one layer out).
['draft-applier-does-not-rearm-placement', [[
  `      combApplyCounts(p);
      combArmDraftPlacement();
      combRenderMeadow();`,
  `      combApplyCounts(p);
      // MUTANT: the client never arms placement for its own turn
      combRenderMeadow();`]]],

// ── spec §11: the host trusts the WIRE's originId, never the payload's seat.
['host-trusts-the-payload-playerIdx', [[
  '  const seat = combSeatOf(originId);',
  '  const seat = (typeof p.playerIdx === "number") ? p.playerIdx : combSeatOf(originId);   // MUTANT']]],

// ── spec §11: COMB_FULL_STATE must strip every seat but the recipient's.
['full-state-leaks-every-hand', [[
  '  delete state.hands;',
  '  // MUTANT: every seat\'s hand goes on the wire']]],

// ── BUG-06: the deck is seed-derived, so an unmasked client holds the draw
//    order — and with the public deckLeft, everybody\'s Golden Nectar.
['client-keeps-the-real-deck-order', [[
  "      combDeck = new Array(combDeck.length).fill('?');",
  '      // MUTANT: the client keeps the real Instinct order']]],

// ── §17-17 / DD-05: the Daylight deadline is the host\'s number, applied whole.
['client-truncates-the-daylight-deadline', [[
  '  combTurnEndTs = Number(ts) || 0;',
  '  combTurnEndTs = ts | 0;   // MUTANT: 32-bit truncation lands the deadline in 1944']]],

// ── §17-3 / DD-03: the holders are restored, never recomputed. A recompute
//    resolves a tie by array order and silently moves 4 points.
['client-recomputes-the-holders', [[
  `      combLargestHolder  = (typeof p.largestHolder  === 'number') ? p.largestHolder  : -1;
      combFiercestHolder = (typeof p.fiercestHolder === 'number') ? p.fiercestHolder : -1;
      combRenderMeadow();
      return;

    // ── The Season Log`,
  `      combRecomputeAchievements();   // MUTANT: derived, not restored
      combRenderMeadow();
      return;

    // ── The Season Log`]]],

// ── logic-engine.md § Firebase erases every EMPTY value. NOT ready[] or owed[]:
//    `false` and `0` are stored intact, so [false,false,false] survives the wire
//    on its own and a mutant against those two is unkillable — the first attempt
//    here was exactly that, and it SURVIVED (impl-notes ML-03). The collection in
//    this game that is legitimately EMPTY, for most of a match and for every
//    player, is the Instinct hand: `cards: []` is deleted in flight. TWO edits,
//    because the applier and combSetInstinct() each defend it independently.
['instinct-sync-assigns-the-payload-raw', [
 ['      combSetInstinct(combLocalIdx(), (p.cards || []).filter(Boolean));',
  '      combSetInstinct(combLocalIdx(), p.cards);   // MUTANT'],
 ['  combInstinct[p] = (cards || []).map(c => ({',
  '  combInstinct[p] = cards.map(c => ({   // MUTANT']]],

// ── spec §11: the Wasp's move carries its own phase, because whether a steal
//    follows turns on hand CONTENTS, which never travel publicly (§17-20).
['wasp-move-omits-its-phase', [[
  "    phase: victims.length ? 'waspSteal' : 'actions',",
  '    // MUTANT: the clients must guess whether a steal follows']]],

// ── spec §11: a build during 'actions' has to tell the table.
['a-build-tells-nobody', [[
  '  combBroadcastBoard();\n  return { ok: true };\n}',
  '  // MUTANT: no COMB_BOARD_UPDATE\n  return { ok: true };\n}']]],

// ── spec §11: the private repair carries the WHOLE hand, never a delta, so a
//    dropped packet self-corrects on the next mutation.
['private-repair-sends-a-count-not-the-hand', [[
  "  combSendPrivateRepair(p, 'COMB_HAND_SYNC', { hand: combHands[p] });",
  "  combSendPrivateRepair(p, 'COMB_HAND_SYNC', { hand: [combHandCount(p), 0, 0, 0, 0] });   // MUTANT"]]],

// ── spec §11: the steal's RESOURCE is host-only knowledge.
['the-steal-broadcasts-what-it-took', [[
  `  combBroadcast('COMB_WASP_PLACED', {
    hexIdx: combWaspHex, thief: playerIdx, victim: victimIdx, handCounts: combHandCounts(),
    phase: 'actions',
  });`,
  `  combBroadcast('COMB_WASP_PLACED', {
    hexIdx: combWaspHex, thief: playerIdx, victim: victimIdx, handCounts: combHandCounts(),
    phase: 'actions', resIdx: ri,   // MUTANT: the table learns what was taken
  });`]]],

// ══════════════════════════════════════════════════════════════════════════
// THE ACTION LAYER (Step 5 chunk 5). The Waggle Dance, the Meadow's rates and
// the Instinct deck. Rule mutants below are caught by verify-comb-loop.js
// (arithmetic and turn resets) or verify-comb-loopback.js (anything that has
// to reach a second device); packet mutants are the loopback's alone.
// ══════════════════════════════════════════════════════════════════════════

// ── spec §11 / brief §14c: re-validate at execution, never escrow. The headline
//    rule of this whole layer, so it gets both halves planted separately.
['trade-executes-without-revalidating', [[
  '  if (!combTradeStillValid(offer, b)) {',
  '  if (false) {   // MUTANT: the offer is trusted at execution']]],

['trade-revalidates-only-the-poster', [[
  '  if (!combCanAfford(partnerIdx, offer.want)) return false;',
  '  // MUTANT: the accepter is never re-checked']]],

// ── A trade is a MOVE, not a mint: what one side gives, the other receives.
['trade-pays-the-partner-without-charging-them', [[
  `    ha[i] += offer.want[i] - offer.give[i];
    hb[i] += offer.give[i] - offer.want[i];`,
  `    ha[i] += offer.want[i] - offer.give[i];
    hb[i] += offer.give[i];   // MUTANT: the partner keeps their side too`]]],

// ── §7: an offer needs both sides, and the poster must be able to pay it.
['offer-with-an-empty-side-is-allowed', [[
  "  if (!g.some(v => v) || !w.some(v => v)) return { ok: false, reason: 'A dance needs both sides.' };",
  '  // MUTANT: a one-sided dance posts']]],

// ── A DIRECTED offer asks one seat; an OPEN one asks the table. Collapsing the
//    two lets three people answer a deal that was struck with one.
['directed-offer-asks-the-whole-table', [[
  '    if (combOffer.to >= 0 && p !== combOffer.to) continue;',
  '    // MUTANT: everybody is asked, whoever the offer named']]],

// ── An OPEN offer must NOT self-resolve on the first accept — that is the whole
//    reason COMB_TRADE_SELECT exists.
['open-offer-deals-with-the-first-yes', [[
  '  if (accept && combOffer.to >= 0) return combExecuteTrade(playerIdx);',
  '  if (accept) return combExecuteTrade(playerIdx);   // MUTANT: no select step']]],

// ── …and the poster may only pick somebody who actually said yes.
['poster-can-pick-a-decliner', [[
  "  if (combOfferAccepters().indexOf(partnerIdx) < 0) return { ok: false, reason: 'They have not said yes.' };",
  '  // MUTANT: anybody can be picked']]],

['anyone-can-call-off-the-dance', [[
  `function combCancelOffer(playerIdx) {
  if (!combOffer) return { ok: false, reason: null };
  if (playerIdx !== combOffer.from) return { ok: false, reason: null };`,
  `function combCancelOffer(playerIdx) {
  if (!combOffer) return { ok: false, reason: null };
  // MUTANT: any seat can withdraw somebody else's offer`]]],

// ── §8: Full Dance's 10 s auto-decline. A seat that never answered has declined;
//    an offer somebody ACCEPTED survives its own deadline for the poster to pick.
['expiry-throws-away-an-accepted-dance', [[
  "  if (!combOfferAccepters().length) { combOfferAbandon('Nobody took the dance.'); return; }",
  "  combOfferAbandon('Nobody took the dance.'); return;   // MUTANT: the deadline kills it regardless"]]],

// ── §10: the Meadow's rate is 4:1, better at a Trade Blossom you have REACHED.
['bank-charges-one-whatever-the-rate', [[
  '  hand[giveIdx] -= rate;',
  '  hand[giveIdx] -= 1;   // MUTANT: the rate is displayed but not charged']]],

['bank-ignores-the-trade-blossoms', [[
  `    if (port.kind === kind) rate = Math.min(rate, port.rate);
    else if (port.kind === 'any') rate = Math.min(rate, port.rate);`,
  '    // MUTANT: every rate is the 4:1 baseline']]],

['bank-rate-does-not-need-a-structure-on-the-port', [[
  '    const reached = port.nodes.some(n => combNodes[n] && combNodes[n].owner === p && combNodes[n].level > 0);',
  '    const reached = true;   // MUTANT: every port counts as reached']]],

// ── §10: one Instinct a turn, never the turn it was bought, never Golden Nectar.
['two-instincts-a-turn', [[
  "  if (combInstinctPlayedThisTurn) return { ok: false, reason: 'One instinct a turn.' };",
  '  // MUTANT: play as many as you hold']]],

['instinct-playable-the-turn-it-was-bought', [[
  `  if (card.boughtTurn === combTurnNo) return { ok: false, reason: "That one's still settling in." };`,
  '  // MUTANT: a card bought this turn plays immediately']]],

['golden-nectar-is-playable', [[
  `  if (card.kind === 'golden') return { ok: false, reason: null };`,
  '  // MUTANT: the score card is an action card']]],

// ── A refused effect must cost NOTHING. Spending the card before validating the
//    params eats both the card and the turn's single play on a typo.
['instinct-is-spent-before-its-params-are-checked', [
 [`  const prm = params || {};
  let picks = null, resIdx = -1;`,
  `  const prm = params || {};
  // MUTANT: spent first, validated second
  combSetInstinct(playerIdx, cards.map((c, i) =>
    (i === cardIdx ? { kind: c.kind, boughtTurn: c.boughtTurn, played: true } : c)));
  combInstinctPlayedThisTurn = true;
  let picks = null, resIdx = -1;`]]],

// ── §10: Comb Rush is TWO free walls, and an unspent one does not carry.
['comb-rush-grants-one-wall', [[
  '    combFreeWalls += 2;',
  '    combFreeWalls += 1;   // MUTANT']]],

['comb-rush-walls-carry-to-the-next-turn', [[
  '  combFreeWalls     = 0;                 // an unspent Comb Rush does not carry',
  '  // MUTANT: free walls accumulate across turns']]],

['comb-rush-wall-is-charged-anyway', [[
  '  const res = combApplyPlace(kind, targetIdx, playerIdx, free ? { free: true } : {});',
  '  const res = combApplyPlace(kind, targetIdx, playerIdx, {});   // MUTANT: never free']]],

// ── §10: Pheromone Dominance takes from every OTHER player, and creates nothing.
['pheromone-takes-from-the-player-too', [[
  '      if (q === playerIdx) continue;',
  '      // MUTANT: the player is robbed alongside everybody else']]],

['pheromone-leaves-a-copy-behind', [[
  `      h[resIdx] = 0;
      combSetHand(q, h);`,
  '      combSetHand(q, h);   // MUTANT: the resource is copied, not moved']]],

// ── §10: Spring Bloom takes exactly two.
['spring-bloom-takes-one', [[
  '    picks.forEach(i => { want[i] += 1; });',
  '    want[picks[0]] += 1;   // MUTANT: only the first pick is honoured']]],

// ── §5/§10: Limited Bounty means the meadow can genuinely run dry.
['limited-bounty-mints-what-it-has-not-got', [[
  `    if (combBounty !== 'limited') { got[i] = asked; continue; }`,
  '    got[i] = asked; continue;   // MUTANT: the meadow never runs out']]],

// ── §6: an Instinct card costs 1 Pollen + 1 Nectar + 1 Royal Jelly.
['buying-an-instinct-card-is-free', [[
  `  for (let i = 0; i < COMB_RES.length; i++) hand[i] -= COMB_COSTS.instinct[i];
  combSetHand(playerIdx, hand);
  combReturnToSupply(COMB_COSTS.instinct);`,
  '  // MUTANT: the card costs nothing']]],

// ── §17-17 / DD-05, one layer out: Daylight is armed once a TURN. A Guard Bee
//    sends the turn to waspMove and back through combEnterActions(), so without
//    the flag an Instinct card hands the active player a fresh sixty seconds.
['daylight-rearms-every-time-actions-begins', [[
  '  if (!combDaylightArmed) { combDaylightArmed = true; combStartDaylight(); }',
  '  combStartDaylight();   // MUTANT: every return to actions is a new clock']]],

// ══════════════════════════════════════════════════════════════════════════
// THE ACTION LAYER'S PACKETS — loopback-only by construction.
//
// ⚠️ NOT PLANTED, and the reason matters (impl-notes ML-03, third time): a
// mutant removing `responses:` from COMB_TRADE_POSTED is UNKILLABLE, because
// combWireArr's fill for that field is 0 and 0 is also its reset value. The
// rebuild and the erasure produce the same array. A test whose subject is safe
// for a second reason proves nothing, so it is left out rather than left green.
// ══════════════════════════════════════════════════════════════════════════

// ── BUG-06 again, at the buy: naming the card in a PUBLIC packet undoes the deck
//    masking entirely — with deckLeft public, one known draw is one known hand.
['instinct-bought-names-the-card', [[
  `  combBroadcast('COMB_INSTINCT_BOUGHT', {
    playerIdx, deckLeft: combDeck.length,`,
  `  combBroadcast('COMB_INSTINCT_BOUGHT', {
    playerIdx, kind, deckLeft: combDeck.length,   // MUTANT: the table learns the draw`]]],

['client-rebuilds-the-real-deck-on-a-buy', [[
  "      combDeck = new Array(Math.max(0, p.deckLeft | 0)).fill('?');",
  '      combDeck = combBuildDeck(combBoardSeed).slice(0, Math.max(0, p.deckLeft | 0));   // MUTANT']]],

// ── The RESOLVED packet says WHO dealt, never what changed hands. The contents
//    were public in the offer; repeating them here is how a later privacy change
//    to COMB_TRADE_POSTED would silently fail to cover the resolution.
['trade-resolved-repeats-the-contents', [[
  `  combBroadcast('COMB_TRADE_RESOLVED', {
    a, b, ok: true, reason: '', handCounts: combHandCounts(),
  });`,
  `  combBroadcast('COMB_TRADE_RESOLVED', {
    a, b, ok: true, reason: '', handCounts: combHandCounts(),
    give: offer.give, want: offer.want,   // MUTANT
  });`]]],

// ── A Guard Bee moves the turn to the Wasp on EVERY device, and the phase has to
//    travel with it — the same rule COMB_WASP_PLACED already carries (§17-20).
['instinct-played-omits-its-phase', [[
  '    playerIdx, kind: card.kind, effect, phase: nextPhase,',
  '    playerIdx, kind: card.kind, effect,   // MUTANT: the clients must guess']]],

// ── The Fiercest Guard tally is not derivable from the board.
['guard-tally-never-reaches-the-clients', [[
  '    effect.guardsPlayed = combGuardsPlayed.slice();',
  '    // MUTANT: the tally stays host-side']]],

// ── The free-wall counter's ONE carrier. It has to be COMB_BOARD_UPDATE, because
//    a client must see the counter go DOWN as each wall is spent.
['board-update-drops-the-free-wall-counter', [[
  `    supply: combSupply.slice(),
    freeWalls: combFreeWalls,`,
  '    supply: combSupply.slice(),   // MUTANT: the counter never travels']]],
];

console.log('Honeycomb Hills — planted-drift run');
console.log('='.repeat(70));
const rows = [];
for (const [name, edits] of M) {
  let src = SRC, missed = false, ambiguous = false;
  for (const [from, to] of edits) {
    if (src.indexOf(from) < 0) { missed = true; break; }
    // ⚠️ An AMBIGUOUS anchor is worse than a missing one: .replace() silently takes
    // the first match, so the mutant patches whichever copy comes first in the file
    // and reports SURVIVED for a rule that was never actually broken. That is what
    // happened to snapshot-drops-the-holders the moment chunk 4 added a second
    // largestHolder/fiercestHolder pair. Fail loudly instead.
    if (src.indexOf(from) !== src.lastIndexOf(from)) { ambiguous = true; break; }
    src = src.replace(from, to);
  }
  if (missed)    { rows.push([name, 'PATCH-MISS',  '-']); continue; }
  if (ambiguous) { rows.push([name, 'PATCH-AMBIG', 'anchor matches more than one site']); continue; }
  const file = path.join(OUT, name + '.comb.js');
  fs.writeFileSync(file, src);
  const env = Object.assign({}, process.env, { COMB_SRC: file });
  let verdict = 'SURVIVED', detail = '0', killers = [];
  for (const h of HARNESSES) {
    const r = cp.spawnSync(process.execPath, [path.join(ROOT, h)], { env, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    const m = out.match(/(\d+) of \d+ CHECKS FAILED/);
    if (m) killers.push(path.basename(h).replace('verify-comb-', '').replace('.js', '') + ':' + m[1]);
    else if (r.status !== 0) killers.push(path.basename(h).replace('verify-comb-', '').replace('.js', '') + ':threw');
  }
  if (killers.length) { verdict = 'CAUGHT'; detail = killers.join(' '); }
  rows.push([name, verdict, detail]);
}
let bad = 0;
for (const [n, v, c] of rows) {
  if (v !== 'CAUGHT') bad++;
  console.log(`  ${v.padEnd(11)} ${n.padEnd(42)} ${c}`);
}
console.log(bad === 0 ? `\nAll ${rows.length} mutants caught.` : `\n${bad} of ${rows.length} MUTANT(S) SURVIVED`);
process.exit(bad === 0 ? 0 : 1);
