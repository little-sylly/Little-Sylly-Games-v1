// ═══════════════════════════════════════════════════════════════════════════
// verify-shp-loop.js — auto-plays random Counting Sheep matches headlessly, in
// 'single' mode (getElementById: () => null — no render code runs, no packets).
//
//   node tools/verify-shp-loop.js        (exits 1 on any failure)
//
// Regression net for the scoring rework (docs/new-game-tech-counting-sheep-scoring.md
// §11/§12). Chunk history:
//   chunk 2 — assertions 1, 2, 6, 7, 8 against pre-rework behaviour.
//   chunk 3 — shpAwake/shpDozed refactor (no-op; instrument numbers proved it).
//   chunk 4 — Herd revert, shpHostCrash/shpHostDoze/shpHostNightEnd/shpHostContinue/
//             shpHostGameover rebuilt per §6/§7. shpHostMoonLoss + the Jolt (nominally
//             chunk 5) landed in the SAME pass — shpHostCrash's router calls
//             shpHostMoonLoss unconditionally in Sylly mode, so a standalone chunk 4
//             would ReferenceError on the first Sylly-mode bust. Assertions 3, 4, 6, 7,
//             8 asserted in full, adapted to the REWORKED state model (shpNightEndInfo/
//             shpDozeNotice/shpDozed, not the old shpDeepSleepInfo/shpHostDeepSleep).
//   chunk 5 — closes assertion 5's fine-grained Jolt check and assertion 10 (the Wolf's
//             expiry). Two layers, because "immediately after a Jolt" is genuinely
//             non-deterministic in the wild: shpJolt's own redraw can legitimately pull
//             a fresh Wolf and re-trigger shpWolfActive/re-shrink the cap in the SAME
//             call — confirmed by forcing one to the front of the flock. That's correct,
//             pre-existing behaviour (identical to a normal deal drawing one), not a bug,
//             so it's not asserted as "stays false" during real random-match play.
//             Instead: testJoltIsolation() strips every Wolf from the deck first and
//             calls shpJolt directly, deterministically proving the RESET itself works
//             (Herd/ceiling/direction/other-hands byte-identical, ceiling included —
//             assertion 5's literal wording); the integration check inside runMatch()
//             asserts only what's universally true regardless of redraw luck (hand
//             length matches whatever cap it ended up at, nothing else moved).
//
// The driver calls the real host appliers directly (shpStartSession, shpHostPlayCard,
// shpHostPlayTwoCard, shpHostCrash, shpHostContinue, shpHostResolveDisrupt) with an
// explicit playerIdx — exactly the pattern verify-cjar-loop.js / verify-pko-loop.js
// use — so ONE process plays every seat through the unmodified shipped functions. It
// re-implements no rules: legal-move selection reuses shpLegalCards/shpHasSafePair/
// shpPairFinalBest from shp.js itself, not a reimplementation of legality.
//
// Gotcha (same as every vm-based harness in this repo): top-level `let`/`const` in a
// vm-evaluated script create lexical bindings, NOT properties on the context object,
// so shpHerd & friends are invisible from out here. The appended BRIDGE exposes them
// via getters (and a couple of setters) that close over the same script scope.
// `function` declarations (shpHostPlayCard, shpLegalCards, ...) DO land on the
// context object and are called directly.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Seeded PRNG (mulberry32) — both the sandbox's Math.random AND the driver's own
//    move-picking randomness are seeded, so a failing run is reproducible. Override
//    with SHP_SEED=<int> to explore a different sequence. ─────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = parseInt(process.env.SHP_SEED || '12345', 10);
const sandboxRand = mulberry32(SEED);
const driverRand  = mulberry32(SEED + 1);

const screens = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  // Real Fisher-Yates over the SANDBOX's own seeded random — shpBuildFlock/shpResolveCard's
  // 'shuffle' kind both need genuine shuffling for the invariants to mean anything.
  shuffle: a => {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(sandbox.Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  showScreen: id => screens.push(id),
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playBoing() {}, playDone() {}, playExit() {}, playLaunch() {}, playPillClick() {},
  playSuccess() {}, playSyllyOff() {}, playSyllyOn() {}, playTick() {}, playWhoosh() {},
  assetFace: () => null, assetBack: () => null, assetExtra: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpMyPlayerIdx: 0,
};
sandbox.Math = Object.create(Math);
sandbox.Math.random = () => sandboxRand();
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__shp = {
  get herd()         { return shpHerd; },
  get ceiling()       { return shpCeiling; },
  get moons()         { return shpMoonsHeld; },
  get moonsToWin()    { return shpMoonsToWin; },
  get eliminated()    { return shpEliminated; },
  get elimOrder()     { return shpElimOrder; },
  get dozed()         { return shpDozed; },
  get dozeOrder()     { return shpDozeOrder; },
  get dozeNotice()    { return shpDozeNotice; },
  get nightEndInfo()  { return shpNightEndInfo; },
  get standings()     { return shpGameStandings; },
  get winner()        { return shpGameWinner; },
  get active()        { return shpActivePlayer; },
  get hands()         { return shpHands; },
  get handCap()       { return shpHandCap; },
  get wolfActive()    { return shpWolfActive; },
  get direction()     { return shpDirection; },
  get flock()         { return shpFlock; },
  get discard()       { return shpDiscard; },
  get stuckIdx()      { return shpStuckIdx; },
  get ghostPending()  { return shpGhostPending; },
  get forcedCards()   { return shpForcedCards; },
  get sylly()         { return shpSyllyMode; },
  get playerCount()   { return shpPlayerCount; },
  get nightNum()      { return shpNightNum; },
  get phase()         { return shpPhase; },
  get handSize()      { return shpHandSize; },
  get deckTotal()     { return Object.values(SHP_DECK_COUNTS).reduce((s, n) => s + n, 0); },
  seat(n) {
    shpPlayerCount = n;
    shpPlayerNames = Array.from({ length: n }, (_, i) => 'P' + i);
  },
  setSettings(o) {
    shpHandSize    = o.handSize;
    shpMoons       = o.moons;
    shpMoonsToWin  = o.moonsToWin;
    shpDreamAccel  = o.dreamAccel;
    shpSyllyMode   = o.sylly;
  },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/shp.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/shp.js' });

const S = sandbox.__shp;

let failures = 0;
function check(label, cond, detail) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` + (ok || !detail ? '' : `\n          ${detail}`));
}

// ── Legal-move selection — reuses the game's own legality functions, picks
//    randomly among whatever they say is legal. No rules reimplemented here. ──
function pickMove(idx) {
  const hand = S.hands[idx] || [];
  if (S.forcedCards === 2 && hand.length >= 2) {
    const pairs = [];
    for (let a = 0; a < hand.length; a++)
      for (let b = 0; b < hand.length; b++)
        if (a !== b && sandbox.shpPairFinalBest(idx, a, b) <= S.ceiling) pairs.push([a, b]);
    if (!pairs.length) return null;
    return { two: pairs[Math.floor(driverRand() * pairs.length)] };
  }
  const legal = sandbox.shpLegalCards(idx);
  if (!legal.length) return null;
  return { single: legal[Math.floor(driverRand() * legal.length)] };
}

// ── Deck-conservation check (assertion 8), id-13 (Fogged Dream, a phantom card never
//    part of the 80-card base pool) counted and excluded separately. Doze/Jolt hand
//    discards (§3.1c/§3.1a) both route through shpDiscard, so they're covered here
//    for free — no change needed from chunk 2's version. ──────────────────────────
function deckConservationOk() {
  const strip13 = arr => arr.filter(id => id !== 13).length;
  let total = strip13(S.flock) + strip13(S.discard);
  for (const h of S.hands) total += strip13(h);
  return total === S.deckTotal;
}

// One turn/step of the state machine. Priority order matches the real UI's own gating:
// a Night-end summary (normal mode) or a stuck-player hold or a nightmare pick all
// block ordinary play until resolved. Sylly mode has NO "info showing" gate mid-match
// (§2) — a crash just resolves and advances straight to the next player.
function step() {
  if (S.nightEndInfo)  { sandbox.shpHostContinue(); return; }
  if (S.stuckIdx >= 0)  { sandbox.shpHostCrash(S.stuckIdx, 'stuck', null); return; }
  if (S.ghostPending)   { sandbox.shpHostResolveDisrupt(Math.floor(driverRand() * 3)); return; }
  const idx = S.active;
  const mv = pickMove(idx);
  if (!mv) throw new Error(`player ${idx} has no legal move but shpStuckIdx was not set`);
  if (mv.two) sandbox.shpHostPlayTwoCard(idx, mv.two[0], mv.two[1]);
  else        sandbox.shpHostPlayCard(idx, mv.single);
}

// 6 players + 7 Moons + Sylly Mode legitimately needs ~4000 turns (confirmed by hand at a
// 200,000-turn ceiling — it terminates at ~4003, not an infinite loop). This ceiling is set
// with comfortable headroom above that, not tuned to the exact worst case seen so far.
const TURN_CEILING = 10000;

function runMatch(opts) {
  S.seat(opts.players);
  S.setSettings(opts);
  sandbox.shpStartSession();
  let turns = 0;
  const allSeats = Array.from({ length: opts.players }, (_, i) => i);

  let moonsAtNightStart = S.moons.slice();  // assertion 4 — reset whenever a new Night is dealt
  let lastNightNum = S.nightNum;
  let prevMoons = S.moons.slice();          // assertion 4/5 — monotonicity, checked every turn

  while (S.winner < 0) {
    turns++;
    if (turns > TURN_CEILING) return { ok: false, reason: 'no termination within ' + TURN_CEILING + ' turns', turns };

    // Assertion 2 (Herd <= ceiling) only holds on a LIVE Climb turn in NORMAL mode:
    //  - a just-crashed Herd is legitimately over ceiling until the crash resolves —
    //    skip while a Night-end summary/stuck hold/ghost-pick is being resolved.
    //  - the Plunge's falling ceiling (shpPlungeTick) can squeeze below an already-legal
    //    Herd between turns — the documented "endgame squeeze" (spec §13 risk 2),
    //    resolved by the next player's own play or a bust, not a bug. Excluded by the
    //    phase==='climb' scoping (Plunge always has phase 'plunge').
    //  - Sylly Climb specifically: Cold Feet can push the Herd past 99 with no bust/
    //    Plunge-entry check on that path at all — confirmed intentional by spec §3.
    if (!S.nightEndInfo && S.stuckIdx < 0 && !S.ghostPending && !S.sylly && S.phase === 'climb' && S.herd > S.ceiling) {
      return { ok: false, reason: `Herd ${S.herd} > ceiling ${S.ceiling}`, turns };
    }
    if (!deckConservationOk()) return { ok: false, reason: 'deck conservation violated (assertion 8)', turns };

    // Assertion 4 (normal mode): shpEliminated is all-false for the whole match.
    if (!opts.sylly && S.eliminated.some(Boolean)) {
      return { ok: false, reason: 'shpEliminated set in normal mode (assertion 4)', turns };
    }
    // Assertion 5: shpDozed must stay all-false in Sylly — the two arrays are mode-disjoint
    // by construction (§2).
    if (opts.sylly && S.dozed.some(Boolean)) {
      return { ok: false, reason: 'shpDozed set in Sylly mode (assertion 5, mode-disjoint §2)', turns };
    }

    // Assertion 4/5 monotonicity, checked every turn: Moons only ever move ONE direction
    // per mode — up in normal (Night wins), down in Sylly (crashes).
    for (let i = 0; i < opts.players; i++) {
      if (!opts.sylly && S.moons[i] < prevMoons[i]) {
        return { ok: false, reason: `player ${i} Moons decreased in normal mode (assertion 4)`, turns };
      }
      if (opts.sylly && S.moons[i] > prevMoons[i]) {
        return { ok: false, reason: `player ${i} Moons increased in Sylly mode (assertion 5)`, turns };
      }
    }
    prevMoons = S.moons.slice();

    if (S.nightNum !== lastNightNum) {
      moonsAtNightStart = S.moons.slice();
      lastNightNum = S.nightNum;
      // Assertion 10's "shpWolfActive is all-false immediately after every shpDealNight" is NOT
      // checked here as a blanket post-deal invariant: shpDealNight's own per-player loop resets
      // shpWolfActive[i] = false BEFORE calling shpDrawUp(i), and that SAME draw-up can legitimately
      // pull a fresh Wolf card, re-setting it true within the same deal — confirmed by a standalone
      // probe (a redeal genuinely drew a Wolf at turn 42 of a real run here). This is pre-existing,
      // documented behaviour (the "Wolf draw-trap" fix in the Bug Index above), not something this
      // rework changed, and asserting the opposite produced a false failure. What IS this rework's
      // own claim — a Jolt resets a Wolf-shrunk cap — is checked below (integration) and in
      // testJoltIsolation (strict, unit-level).
    }

    const activeBefore     = S.active;
    const herdBeforePlay   = S.herd;
    const directionBefore  = S.direction;
    const dozeNoticeBefore = S.dozeNotice;
    const nightEndBefore   = S.nightEndInfo;
    // Deep snapshot of every hand — cheap at these match lengths/player counts, and it's what lets
    // the post-Jolt check below (assertion 5) confirm every OTHER hand is untouched.
    const handsBefore = S.hands.map(h => h.slice());

    step();

    // Assertion 3 (revert) — general, both modes: a FRESH 'busted' dozeNotice (reference
    // changed, not just mutated — shpHostDoze/shpHostMoonLoss always assign a new object)
    // means the Herd must be back to exactly what it was before that play.
    if (S.dozeNotice && S.dozeNotice !== dozeNoticeBefore && S.dozeNotice.reason === 'busted') {
      if (S.herd !== herdBeforePlay) {
        return { ok: false, reason: `Herd not reverted after busted crash (assertion 3): was ${herdBeforePlay}, now ${S.herd}`, turns };
      }
    }

    // Assertion 5/10 (Sylly, integration level) — a FRESH dozeNotice for a crasher who is still
    // NOT eliminated means a Jolt just ran (shpHostMoonLoss's other branch is elimination, which
    // has no hand to Jolt). Verify what's UNIVERSALLY true in the wild — the Jolt's RESET itself
    // (shpWolfActive[i] = false; shpHandCap[i] = shpHandSize; BEFORE the redraw) is not directly
    // observable here, because shpDrawUp's redraw can legitimately pull a fresh Wolf and re-trigger
    // both flags in the SAME call — confirmed by a standalone probe forcing a Wolf to the front of
    // the flock. That is pre-existing, correct behaviour (identical to a normal deal drawing a
    // Wolf), not a bug, so it is not asserted as "stays false" here. What IS unconditionally true
    // regardless of redraw luck — hand length matches whatever the (possibly re-shrunk) cap ended up
    // being, and nothing outside the crasher's own hand moved — is asserted below. The strict,
    // deterministic "the reset itself works" claim (assertion 10's literal wording, ceiling
    // included) is tested in isolation instead — see testJoltIsolation, which strips Wolves from the
    // deck first so the redraw can't confound the result.
    if (opts.sylly && S.dozeNotice && S.dozeNotice !== dozeNoticeBefore && !S.eliminated[activeBefore]) {
      const crasher = activeBefore;
      if (S.hands[crasher].length !== S.handCap[crasher]) {
        return { ok: false, reason: `Jolt hand length !== cap (assertion 5): ${S.hands[crasher].length} vs ${S.handCap[crasher]}`, turns };
      }
      if (S.herd !== herdBeforePlay) {
        return { ok: false, reason: `Jolt did not leave the Herd byte-identical (assertion 5): was ${herdBeforePlay}, now ${S.herd}`, turns };
      }
      if (S.direction !== directionBefore) {
        return { ok: false, reason: `Jolt did not leave direction byte-identical (assertion 5)`, turns };
      }
      for (let i = 0; i < opts.players; i++) {
        if (i === crasher) continue;
        if (JSON.stringify(S.hands[i]) !== JSON.stringify(handsBefore[i])) {
          return { ok: false, reason: `Jolt touched another player's hand (assertion 5): player ${i}`, turns };
        }
      }
    }

    // Assertion 6 (normal mode) — a FRESH Night-end: [winner, ...dozeOrder.reversed()]
    // must be a permutation of every seat, and the winner's Moons must be up by exactly
    // 1 from the start of that Night, with nobody else's Moons moved.
    if (!nightEndBefore && S.nightEndInfo) {
      const info = S.nightEndInfo;
      const orderSorted = info.order.slice().sort((a, b) => a - b);
      if (JSON.stringify(orderSorted) !== JSON.stringify(allSeats)) {
        return { ok: false, reason: `Night-end finishing order not a permutation (assertion 6): ${JSON.stringify(info.order)}`, turns };
      }
      for (let i = 0; i < opts.players; i++) {
        const expected = moonsAtNightStart[i] + (i === info.winner ? 1 : 0);
        if (S.moons[i] !== expected) {
          return { ok: false, reason: `Night-end Moons mismatch (assertion 4): player ${i} expected ${expected}, got ${S.moons[i]}`, turns };
        }
      }
    }
  }

  // Assertion 7 — final standings: a permutation of every seat, sorted by Moons descending.
  const standingsSorted = S.standings.slice().sort((a, b) => a - b);
  if (JSON.stringify(standingsSorted) !== JSON.stringify(allSeats)) {
    return { ok: false, reason: 'final standings not a permutation (assertion 7)', turns, standings: S.standings };
  }
  for (let k = 1; k < S.standings.length; k++) {
    if (S.moons[S.standings[k]] > S.moons[S.standings[k - 1]]) {
      return { ok: false, reason: 'final standings not sorted by Moons descending (assertion 7)', turns, standings: S.standings, moons: S.moons };
    }
  }
  if (opts.sylly) {
    // Sylly's exact shape is unchanged from pre-rework: [winner, ...elimOrder.reversed()].
    const expected = [S.winner].concat(S.elimOrder.slice().reverse());
    if (JSON.stringify(S.standings) !== JSON.stringify(expected)) {
      return { ok: false, reason: 'Sylly standings != [winner, ...elimOrder.reversed()] (assertion 7)', turns, standings: S.standings, expected };
    }
    // Assertion 5: Sylly never redeals, so shpNightNum stays 1 for the whole match.
    if (S.nightNum !== 1) {
      return { ok: false, reason: `shpNightNum !== 1 at Sylly match end (assertion 5): ${S.nightNum}`, turns };
    }
  } else {
    // Assertion 4: the match ends on the first turn any player reaches shpMoonsToWin.
    if (S.moons[S.winner] < S.moonsToWin) {
      return { ok: false, reason: `winner's Moons (${S.moons[S.winner]}) below shpMoonsToWin (${S.moonsToWin}) at match end (assertion 4)`, turns };
    }
  }

  return { ok: true, turns };
}

// ── Isolated Jolt unit test (assertion 5's strict form, chunk 5) ───────────────────
// The integration-level check inside runMatch() deliberately excludes the ceiling from its
// byte-identical comparison, because shpPlungeTick legitimately moves it in the SAME turn,
// immediately after the Jolt — a different, expected mechanism. To honour assertion 5's literal
// wording ("Herd/ceiling/direction/other hands byte-identical"), call shpJolt directly, in
// isolation, with NO shpPlungeTick in the call stack at all — this is the only way to test the
// Jolt's own promise about the ceiling specifically.
function testJoltIsolation() {
  S.seat(3);
  S.setSettings({ players: 3, sylly: true, handSize: 4, moons: 5, moonsToWin: 2, dreamAccel: true });
  sandbox.shpStartSession();

  // Strip every Wolf (id 12) from the flock and discard first. shpJolt's redraw can legitimately
  // pull a fresh Wolf and re-trigger shpWolfActive/shrink the cap again — confirmed by a standalone
  // probe forcing one to the front of the flock — which is correct, pre-existing behaviour but would
  // make THIS test flaky (it would fail whenever the redraw happened to hit one). Removing them is
  // what isolates "does the reset itself work" from "did the redraw get unlucky", which is the
  // actual thing assertion 10 is claiming.
  S.flock.splice(0, S.flock.length, ...S.flock.filter(id => id !== 12));
  S.discard.splice(0, S.discard.length, ...S.discard.filter(id => id !== 12));

  const target = 1;
  // Simulate an already Wolf-shrunk player mid-Night (a realistic pre-Jolt state, §3.1(b)):
  // cap reduced, wolf flag set, hand truncated to the shrunk cap.
  S.wolfActive[target] = true;
  S.handCap[target] = S.handSize - 1;
  S.hands[target].length = S.handCap[target];

  const herdBefore = S.herd, ceilingBefore = S.ceiling, directionBefore = S.direction;
  const otherHandsBefore = S.hands.map((h, i) => (i === target ? null : h.slice()));

  sandbox.shpJolt(target);

  return [
    ['Jolt resets shpHandCap to shpHandSize', S.handCap[target] === S.handSize],
    ['Jolt clears shpWolfActive', S.wolfActive[target] === false],
    ['Jolt redraws the hand up to the (reset) cap', S.hands[target].length === S.handCap[target]],
    ['Jolt leaves the Herd byte-identical', S.herd === herdBefore],
    ['Jolt leaves the ceiling byte-identical', S.ceiling === ceilingBefore],
    ['Jolt leaves direction byte-identical', S.direction === directionBefore],
    ['Jolt leaves every OTHER hand byte-identical', S.hands.every((h, i) =>
      i === target || JSON.stringify(h) === JSON.stringify(otherHandsBefore[i]))],
  ];
}

console.log('Counting Sheep — turn-loop verification (post scoring-rework chunk 5)\n' + '='.repeat(72));
console.log(`Seed: ${SEED}\n`);

console.log('Assertion 5 (strict form) — shpJolt in isolation:');
testJoltIsolation().forEach(([label, cond]) => check('  ' + label, cond));
console.log('');

const stats = {}; // playerCount -> { matches, turns[] }
const MATCHES_PER_COMBO = 6;
let matchNo = 0;

for (const players of [2, 3, 4, 5, 6]) {
  for (const sylly of [false, true]) {
    for (let m = 0; m < MATCHES_PER_COMBO; m++) {
      matchNo++;
      const opts = {
        players,
        sylly,
        handSize:   [3, 4, 5][m % 3],
        moons:      [3, 5, 7][(m + 1) % 3],     // Sylly starting lives — irrelevant in normal mode
        moonsToWin: [1, 2, 3][m % 3],           // normal mode target — irrelevant in Sylly mode
        dreamAccel: (m % 2 === 0),
      };
      const label = `match ${matchNo}: players=${players} sylly=${sylly} hand=${opts.handSize} moons=${opts.moons} moonsToWin=${opts.moonsToWin} accel=${opts.dreamAccel}`;
      let result;
      try {
        result = runMatch(opts);
      } catch (e) {
        result = { ok: false, reason: e.message };
      }
      check(label, result.ok, result.ok ? null :
        `${result.reason}` + (result.turns ? ` (turn ${result.turns})` : '') +
        (result.standings ? `\n          standings ${JSON.stringify(result.standings)}` +
          (result.expected ? ` expected ${JSON.stringify(result.expected)}` : '') +
          (result.moons ? ` moons ${JSON.stringify(result.moons)}` : '') : ''));
      if (result.ok) {
        stats[players] = stats[players] || { matches: 0, turns: [] };
        stats[players].matches++;
        stats[players].turns.push(result.turns);
      }
    }
  }
}

console.log('\nInstrument (not an assertion) — turns per match by player count:');
Object.keys(stats).sort((a, b) => a - b).forEach(n => {
  const turns = stats[n].turns.slice().sort((a, b) => a - b);
  const mean = turns.reduce((s, t) => s + t, 0) / turns.length;
  const p95 = turns[Math.min(turns.length - 1, Math.floor(turns.length * 0.95))];
  console.log(`  ${n} players — ${stats[n].matches} matches, mean ${mean.toFixed(1)} turns, p95 ${p95} turns`);
});

console.log('\n' + '='.repeat(72));
console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
