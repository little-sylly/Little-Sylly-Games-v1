// ═══════════════════════════════════════════════════════════════════════════
// comb.js — Honeycomb Hills (game 20). Hex-and-resource engine-builder on a
// 19-hex meadow: gather, trade, build a comb, grow the strongest hive.
// MDLM-only, host-authoritative. NO Sylly Mode (a suite first — spec §12).
//
// Depends on: js/lib/physics.js (window.Physics.rng — the seeded xorshift32
//                                stream, reused rather than re-implemented),
//             js/lib/art.js    (assetFace / assetBack / assetExtra),
//             engine.js        (showScreen, play*, activeGameId, resetToLobby,
//                               bindCardHold, refHighlightRow),
//             engine-multiplayer.js (mpSendEnvelope, mpSendPrivate,
//                               mpNotifyPlayerLeft, mpPlayerSlots)
//
// Spec: docs/new-game-tech-honeycomb-hills.md (CONFIRMED 6 Sep 2026).
//       That document is the source of truth, NOT the Phase 1 brief.
//
// ── STAGE 2 OF 5 (Protocol B skeleton-first build order) ───────────────────
// This file currently holds the SCAFFOLD ONLY: the content constants (pure
// transcription from spec §6/§10), every state variable from spec §4, and
// named-but-empty functions for every screen transition, seam and rule.
// There is deliberately NO game logic, NO DOM writing, NO canvas and NO
// multiplayer in it yet.
//
//   Step 2 (here) — state + constants + empty functions. Gate: loads clean.
//   Step 3        — flow verification: wire showScreen() routing only.
//   Step 4        — exit routing: quit overlay, post-game ✕, Back to the Box.
//   Step 5        — logic injection, one screen at a time, in flow order.
//
// Two rules from the spec that constrain how EVERY later function is written,
// stated here because they are cheap now and expensive to retrofit:
//
//  1. combSetHand() / combSetInstinct() are the ONLY writers of combHands[p]
//     and combInstinct[p]. All seven hand-mutation paths (production, trade
//     in, trade out, build, buy, the Wasp's steal, the Overflow) route
//     through them, which is what makes the private repair packet inheritable
//     by a path added later. Spec §11.
//  2. Appliers take an explicit playerIdx and skip every broadcast in
//     'single' mode, so one process can drive all N seats. An applier that
//     reads mpMyPlayerIdx internally cannot be harnessed at all. Spec §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Content constants (spec §6 costs, §10 board + deck) ────────────────────
// Resource index order is [resin, wax, pollen, nectar, jelly] EVERYWHERE — in
// costs, hands, supply, trade offers and discard payloads. Never re-order.
const COMB_RES = ['resin', 'wax', 'pollen', 'nectar', 'jelly'];

// One constant, three readers: affordability highlighting, the build applier,
// and the How-to "The Comb" tab (spec §6, single-source arithmetic rule).
const COMB_COSTS = {
  wall: [1, 1, 0, 0, 0],   // 1 Resin + 1 Wax
  cell: [1, 1, 1, 1, 0],   // 1 Resin + 1 Wax + 1 Pollen + 1 Nectar
  dome: [0, 0, 0, 2, 3],   // 2 Nectar + 3 Royal Jelly
  instinct: [0, 0, 1, 1, 1], // 1 Pollen + 1 Nectar + 1 Royal Jelly
};
const COMB_LIMITS = { wall: 15, cell: 5, dome: 4 };

// Keyed by Season so both of the brief's balance fallbacks are a one-line
// edit rather than a hunt (spec §6, §16 Q-B — shipping un-tuned by decision).
const COMB_ACHIEVEMENT = {
  short: { points: 2, minChain: 5, minGuards: 3 },  // fallback 1: points -> 1
  full:  { points: 2, minChain: 5, minGuards: 3 },  // fallback 2: minChain -> 6, minGuards -> 4
};

// The 19 (q,r) axial pairs, row-major (spec §10).
const COMB_AXIAL = [
  [0, -2], [1, -2], [2, -2],
  [-1, -1], [0, -1], [1, -1], [2, -1],
  [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
  [-2, 1], [-1, 1], [0, 1], [1, 1],
  [-2, 2], [-1, 2], [0, 2],
];

// Outer ring (12) -> inner ring (6) -> centre. Catan's standard spiral, which
// is what guarantees the 6/8 separation in the Tended layout.
const COMB_SPIRAL = [0, 1, 2, 6, 11, 15, 18, 17, 16, 12, 7, 3, 4, 5, 10, 14, 13, 8, 9];

// The Tended layout — the fixed, balanced arrangement (spec §10). All four
// invariants are verified there and re-checked by tools/verify-comb-board.js:
// no 6/8 contact, no same-kind triple, correct marker multiset, pips = 58.
const COMB_TENDED_KIND = [
  'rock', 'grove', 'clover', 'grove', 'blossom', 'blossom', 'nursery',
  'blossom', 'clover', 'smoke', 'grove', 'rock', 'nursery', 'rock',
  'grove', 'clover', 'clover', 'blossom', 'nursery',
];
const COMB_TENDED_MARKER = [
  5, 2, 6, 10, 9, 4, 3, 8, 11, 0, 5, 8, 4, 3, 6, 10, 11, 12, 9,
];  // 0 == the Smoke Zone, which never carries a Bloom Marker.

// Hex kind -> the resource it yields (null for the Smoke Zone). Spec §10.
const COMB_HEX_YIELD = {
  grove: 'resin', rock: 'wax', blossom: 'pollen',
  clover: 'nectar', nursery: 'jelly', smoke: null,
};
const COMB_HEX_COUNT = { grove: 4, blossom: 4, clover: 4, rock: 3, nursery: 3, smoke: 1 };

// 18 Bloom Markers: one each of 2 and 12, two each of 3-6 and 8-11. No 7.
const COMB_MARKERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// The 25-card Instinct deck (spec §10).
const COMB_DECK_COUNT = { guard: 14, golden: 5, rush: 2, bloom: 2, pheromone: 2 };

// One map, naming a MOMENT and pointing it at an existing play*(), following
// PKO's PKO_EVENT_SOUND and CJAR's CJAR_SOUND. Keeping it beside the events
// means a moment's identity and its voice cannot drift apart. Spec §9.
// playAccord() is the ONE new function this game adds to the catalogue.
const COMB_SOUND = {
  scoutFlight: 'playWhoosh',
  bloomYours:  'playUnchallenged',
  waspRolled:  'playBoing',
  waspLands:   'playHullThud',
  waspStealsFromYou: 'playPoacher',
  overflowDone: 'playWhoosh',
  buildWall:   'playPillClick',
  buildCell:   'playSuccess',
  buildDome:   'playClashWin',
  tradeArrives: 'playSonarPing',
  tradeAccepted: 'playAccord',      // [NEW] — spec §9
  tradeFailed: 'playBoing',
  achievementMoves: 'playStampede',
  instinctBought: 'playDone',
  daylightTick: 'playTick',
  daylightOver: 'playAlarm',
  win:         'playClashWin',
};

// ── Settings (persist between play-agains; locked at match start) ───────────
let combSeason   = 'short';    // 'short' | 'full'              — The Season
let combLayout   = 'wild';     // 'wild'  | 'tended'            — The Meadow
let combWasp     = 'blocks';   // 'blocks'| 'steals'            — The Wasp
let combOverflow = 'off';      // 'off'   | 'snug' | 'roomy'    — The Overflow
let combWaggle   = 'outloud';  // 'outloud' | 'full'            — The Waggle Dance
let combDaylight = 'allday';   // 'allday'| 'longday' | 'shortday'
let combBounty   = 'endless';  // 'endless' | 'limited'         — The Meadow's Bounty
// NO combSyllyMode — spec §12 / §17-1. This is deliberate, not an omission.

// ── Roster (from the lobby; persists across play-agains) ───────────────────
let combPlayerCount = 0;
let combPlayerNames = [];      // from mpPlayerSlots[i].nickname — never .name

// ── MATCH state — authoritative. This group IS combSerialiseState(). ───────
let combHexes        = [];     // 19 × { kind, marker }
let combNodes        = [];     // 54 × { owner, level }  level: 0 none|1 cell|2 dome
let combEdges        = [];     // 72 × owner (playerIdx | -1)
let combWaspHex      = -1;     // hex index; starts on the Smoke Zone
let combHands        = [];     // N × [5] — PRIVATE. Write ONLY via combSetHand()
let combInstinct     = [];     // N × [{kind,boughtTurn,played}] — PRIVATE until played
let combDeck         = [];     // remaining Instinct kinds, shuffled — host-authoritative
let combSupply       = [];     // 5 counts; only consulted when combBounty === 'limited'
let combTurn         = 0;      // active playerIdx
let combTurnNo       = 0;      // increments forever; the Season Log key
let combPhase        = 'draft';// draft|roll|overflow|waspMove|waspSteal|actions|gameover-pending
let combRoll         = null;   // 2..12, or null before the first cast
let combGuardsPlayed = [];     // N × int — Guard Bees played
let combLargestHolder  = -1;   // playerIdx | -1 ── AUTHORITATIVE, never recomputed (§4)
let combFiercestHolder = -1;   // playerIdx | -1 ── AUTHORITATIVE, never recomputed (§4)
let combDraftOrder   = [];     // the snake sequence of playerIdx
let combDraftStep    = 0;      // index into combDraftOrder
let combInstinctPlayedThisTurn = false;
let combLog          = [];     // Season Log — privacy-bounded (§11)
let combStats        = { scoutFlights: 0, waspLandings: 0 };
let combBoardSeed    = 0;      // the host's deal seed; in the payload so a client deals identically

// ── Round state (one Scout Flight) ────────────────────────────────────────
let combOverflowOwed  = [];    // N × int — how many each player must discard this 7
let combOverflowReady = [];    // N × bool — the readyCheck matrix (§11)

// ── Turn state (one player's turn) ────────────────────────────────────────
let combOffer      = null;     // { from,to,give[5],want[5],responses[],expiresAt } | null
let combOfferTimer = null;     // setTimeout handle — the 10 s auto-decline
let combTurnEndTs  = 0;        // Daylight endTimestamp, 0 when All Day
let combTurnTimer  = null;     // setInterval handle

// ── UI state (never serialised, never in a packet) ────────────────────────
let combPlacementMode = null;  // null | 'wall' | 'cell' | 'dome' | 'wasp'
let combLegalTargets  = [];    // recomputed on entering placement mode
let combPendingTarget = null;  // nearest-snap preview awaiting commit (§2)
let combMapOpen       = false; // is comb-map-overlay up?
let combZoom = 1, combPanX = 0, combPanY = 0;  // MAP OVERLAY ONLY. The inline
                               // board is always fit-to-view and holds NO viewport (§2).
let combRafHandle = null;      // the Sun Compass / board animation loop
let combHowtoTab  = 'rules';
let combChainLen  = [];        // DERIVED cache — recomputed, never trusted

// ── Derived helpers (spec §4) ─────────────────────────────────────────────
function combTarget()      { return combSeason === 'full' ? 10 : 7; }
function combCarryLimit()  { return { off: Infinity, snug: 7, roomy: 9 }[combOverflow]; }
function combDaylightMs()  { return { allday: 0, longday: 90000, shortday: 60000 }[combDaylight]; }
function combIsMyTurn()    { return combTurn === (typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0); }
function combHandCount(p)  { return (combHands[p] || []).reduce((a, b) => a + b, 0); }
function combAchievement() { return COMB_ACHIEVEMENT[combSeason]; }

// ── Board / topology (Step 5) ─────────────────────────────────────────────
// combBuildTopology() MUST dedupe corners with Math.round(x * 1000), NEVER
// x.toFixed(3) — toFixed emits "-0.000" for three corners on this layout and
// yields 56 nodes / 72->76 edges instead of 54/72. Measured; spec §10.
function combBuildTopology() { /* Step 5 */ }
function combDealBoard(seed) { /* Step 5 */ }
function combTendedBoard()   { /* Step 5 */ }

// ── Rules (Step 5) ────────────────────────────────────────────────────────
function combPublicPoints(p) { /* Step 5 */ }
function combTruePoints(p)   { /* Step 5 */ }
function combLongestChain(p) { /* Step 5 */ }
function combRecomputeAchievements() { /* Step 5 — the SINGLE resolution point */ }
function combCheckWin()      { /* Step 5 — active player's own turn ONLY */ }
function combAttemptPlace(kind, targetIdx) { /* Step 5 — the ONE placement path */ }
function combTradeStillValid(offer, partnerIdx) { /* Step 5 — re-validate, never escrow */ }

// ── The two private-collection writers (spec §11) ─────────────────────────
// The ONLY place combHands[p] is written. All seven mutation paths route here,
// so a path added later inherits the private repair for free. A function that
// writes combHands[p] directly silently desyncs that device for the whole match.
function combSetHand(p, hand) { /* Step 5 */ }
function combSetInstinct(p, cards) { /* Step 5 */ }

// ── Render seams (Step 5) — never build these primitives anywhere else ────
function combRenderHex(kind, opts)      { /* Step 5 — assetFace('comb-hex', kind) */ }
function combRenderResource(kind, opts) { /* Step 5 — assetFace('comb-res', kind) */ }
function combRenderInstinct(kind, opts) { /* Step 5 — assetFace('comb-instinct', kind) */ }
function combRenderPiece(kind, playerIdx) { /* Step 5 — assetFace('comb-piece', kind) */ }

// ── Screen transitions + rendering (Steps 3-5) ────────────────────────────
function combShowMenu()          { /* Step 3 */ }
function combShowClientStandby() { /* Step 3 */ }
function combShowMeadow()        { /* Step 3 */ }
function combShowGameover()      { /* Step 3 */ }
function combStartMatchLocal()   { /* Step 5 — host entry from onPassThePhone */ }
// The ONLY function that writes to screen-comb-meadow. It sets EVERY element
// every time, including ones the current phase does not use (spec §3).
function combRenderMeadow()      { /* Step 5 */ }
// Pure: draws current state into the canvas it is HANDED. Called by
// combRenderMeadow() for the inline board and by comb-map-overlay for its
// own. There is no second board renderer (spec §2).
function combDrawBoard(canvasEl, viewport) { /* Step 5 */ }

// ── Overlays (Steps 4-5) ──────────────────────────────────────────────────
function combSyncSettingsUI() { /* Step 5 — repaints ALL THREE preset cards */ }
function combOpenHowTo(tab, highlightId) { /* Step 5 */ }
function combShowTip(emoji, heading, lines) { /* Step 5 */ }
function combOpenMap()  { /* Step 5 — the 🔍 magnifier, z-[75] */ }
function combCloseMap() { /* Step 5 */ }

// ── Multiplayer (Step 5) ──────────────────────────────────────────────────
function combHandleEnvelope(env) { /* Step 5 — 15 ACTION + 15 SYNC handlers */ }
function combSerialiseState()    { /* Step 5 — exactly the MATCH group above */ }
function combApplyState(s)       { /* Step 5 */ }
// Firebase erases every EMPTY value, so a payload's reset values are exactly
// the ones that never arrive. Both halves are required: send the reset value
// explicitly AND rebuild it on receipt. Never assign a raw p.x collection.
function combWireArr(v, len, fill) {
  const out = [];
  for (let i = 0; i < len; i++) out.push((v && v[i] !== undefined && v[i] !== null) ? v[i] : fill);
  return out;
}

// ── Teardown ──────────────────────────────────────────────────────────────
// Called by engine.js resetToLobby(). Owns all THREE live handles — the RAF
// included (logic-engine.md § Timer Lifecycle: a RAF is a timer, and a live
// one repaints against the next screen's state). Settings are NOT reset here.
function combResetState() {
  if (combTurnTimer)  { clearInterval(combTurnTimer);       combTurnTimer  = null; }
  if (combOfferTimer) { clearTimeout(combOfferTimer);       combOfferTimer = null; }
  if (combRafHandle)  { cancelAnimationFrame(combRafHandle); combRafHandle = null; }

  combHexes = []; combNodes = []; combEdges = []; combHands = []; combInstinct = [];
  combDeck = []; combSupply = []; combLog = []; combOffer = null;
  combWaspHex = -1; combTurn = 0; combTurnNo = 0; combPhase = 'draft'; combRoll = null;
  combLargestHolder = -1; combFiercestHolder = -1;
  combDraftOrder = []; combDraftStep = 0; combGuardsPlayed = []; combChainLen = [];
  combOverflowOwed = []; combOverflowReady = []; combInstinctPlayedThisTurn = false;
  combTurnEndTs = 0;
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  combMapOpen = false; combZoom = 1; combPanX = 0; combPanY = 0;
  combStats = { scoutFlights: 0, waspLandings: 0 };
}

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Sound-button re-wiring (new games only). This game's markup is added at
  // the end of index.html, AFTER the <script> block, so engine.js's top-level
  // parse-time querySelectorAll cannot reach it. FRT is the reference.
  document.querySelectorAll(
    '#screen-comb-menu .btn-open-sound, #screen-comb-standby .btn-open-sound, ' +
    '#screen-comb-meadow .btn-open-sound, #screen-comb-gameover .btn-open-sound'
  ).forEach(btn => btn.addEventListener('click', openSoundOverlay));

  // Step 3 wires the lobby button, the four menu buttons and screen routing.
  // Step 4 wires the exit paths. Nothing else is bound yet.
});
