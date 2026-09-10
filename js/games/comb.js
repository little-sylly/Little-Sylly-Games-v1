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
// ── COMPLETE — shipped SW v225, phase-41 gate closed 10 Sep 2026 ───────────
// Built Protocol B skeleton-first (state+constants -> routing -> exit routing
// -> logic injection). All of Step 5 has landed: the board and its five render
// seams, the match/turn engine, the packet layer, the action layer, settings +
// the gameover podium, core art (v223) and the Sun Compass flight (v224).
// Identity doc: docs/game-identities/comb.md. Impl notes:
// docs/implementation-notes/comb-implementation-notes.md.
//
// Verify after touching this file: rules/appliers -> verify-comb-loop.js +
// mutate-comb.js (run it 3-5x, not once); anything packet- or render-shaped ->
// verify-comb-loopback.js; the topology or a seam -> all five.
//
// Two rules from the spec that constrain how EVERY function here is written,
// stated at the top because they are cheap to keep and expensive to retrofit:
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

// Display names, separated from the ids ON PURPOSE (spec §10 / §17-13). The
// owner's art renamed two kinds on 7 Sep 2026 — blossom "Blossom Meadow" ->
// "Pollen Meadow", clover "Clover Patch" -> "Sunflower Patch" — and NOTHING
// else moved: packets, the topology, the harness and COMB_TENDED_KIND all key
// off the id. A skin changes what a hex looks like and what it is called; it
// never changes that 'clover' yields Nectar.
const COMB_HEX_NAME = {
  grove:   'Sapling Grove',
  blossom: 'Pollen Meadow',
  clover:  'Sunflower Patch',
  rock:    'Sunlit Rock',
  nursery: 'Nursery Cell',
  smoke:   'The Smoke Zone',
};

// Resource display names + the SHAPE each icon must carry. Shape is a required
// property, not decoration: colour alone fails under deuteranopia, and the
// first art pass drew Resin and Nectar as the same droplet in adjacent hues
// (spec §10, §17-15). Resin is angular precisely so it cannot be confused
// with Nectar, whatever the palette does later.
const COMB_RES_NAME  = { resin:'Resin', wax:'Wax', pollen:'Pollen', nectar:'Nectar', jelly:'Royal Jelly' };
const COMB_RES_SHAPE = { resin:'shard', wax:'hexagon', pollen:'sphere', nectar:'droplet', jelly:'dome' };
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
  instinctPlayed: 'playUnchallenged',
  instinctGuard: 'playSonarPing',   // a Guard Bee summons the Wasp
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
let combDraftAnchor  = -1;     // the draft cell this step's wall must touch, -1 between steps
let combInstinctPlayedThisTurn = false;
let combFreeWalls    = 0;      // unspent Comb Rush walls — the ACTIVE seat's only
let combLog          = [];     // Season Log — privacy-bounded (§11)
let combStats        = { scoutFlights: 0, waspLandings: 0 };
let combBoardSeed    = 0;      // the host's deal seed; in the payload so a client deals identically

// ── Round state (one Scout Flight) ────────────────────────────────────────
let combOverflowOwed  = [];    // N × int — how many each player must discard this 7
let combOverflowReady = [];    // N × bool — the readyCheck matrix (§11)

// ── The public mirror of every hand (chunk 4) ─────────────────────────────
// A client holds ONE real hand — its own — because that is the whole point of
// the private channel. Every SYNC that changes anybody's holdings carries a
// handCounts[] instead, and this is where it lands. combHandCount() reads it
// for any seat but this device's, which is what makes combWaspVictims() (an
// "…and something to take" test) give the same answer on a client as on the
// host. NOT serialised: on the host it is derivable from combHands.
let combPublicCounts = [];     // N × int — counts only, never contents
let combPublicInstinct = [];   // N × int — UNPLAYED Instinct cards, count never kind
let combGameover     = null;   // the COMB_GAMEOVER payload, kept for the podium

// ── Turn state (one player's turn) ────────────────────────────────────────
let combOffer      = null;     // { from,to,give[5],want[5],responses[],expiresAt } | null
let combOfferTimer = null;     // setTimeout handle — the 10 s auto-decline
let combTurnEndTs  = 0;        // Daylight endTimestamp, 0 when All Day
let combTurnTimer  = null;     // setInterval handle
let combDaylightArmed = false; // armed once per turn — see combEnterActions()
let combFlightTimer = null;    // setTimeout handle — the host's blind-spin window
let combFlightView  = null;    // the die in the air — { el, face, layer, t0, ... } | null.
                               // UI only, never serialised (see combStartFlight)

// ── UI state (never serialised, never in a packet) ────────────────────────
let combPlacementMode = null;  // null | 'wall' | 'cell' | 'dome' | 'wasp'
let combLegalTargets  = [];    // recomputed on entering placement mode
let combPendingTarget = null;  // nearest-snap preview awaiting commit (§2)
let combMapOpen       = false; // is comb-map-overlay up?
let combMapScrollTo   = null;  // 'stats' when the map was opened from the player
                               // strip — the render scrolls its stats zone in
let combZoom = 1, combPanX = 0, combPanY = 0;  // MAP OVERLAY ONLY. The inline
                               // board is always fit-to-view and holds NO viewport (§2).
let combRafHandle = null;      // the Sun Compass / board animation loop
let combLastProduced = null;   // N×5 grid from the last Scout Flight — public
                               // (COMB_ROLL_RESULT.produced), drives the player
                               // panel's per-round take column. Cleared at cast.
let combHowtoTab  = 'rules';
let combBuildPickerOpen = false;  // step 1 of the two-step build (spec §7)
let combChainLen  = [];        // DERIVED cache — recomputed, never trusted

// ── Host-local, never serialised and never in a packet ────────────────────
let combRng   = null;          // the authority's seeded stream (flight + steal)
let combQuiet = false;         // true while combApplyState() restores — suppresses
                               // the sound and log line an achievement transfer
                               // would otherwise announce for a RESTORE

// The Season presets The Wasp and The Overflow (spec §5) — a PLAIN preset,
// neither of ui-style.md's named mutually-exclusive/superseded patterns:
// nothing dims, no amber reason line. Tapping The Wasp or The Overflow
// directly must NOT call this or touch combSeason — only their own pill
// handler sets those two variables alone.
function combApplySeasonPreset(value) {
  combSeason   = value;
  combWasp     = (value === 'full') ? 'steals' : 'blocks';
  combOverflow = (value === 'full') ? 'snug'   : 'off';
}

// ── Derived helpers (spec §4) ─────────────────────────────────────────────
function combTarget()      { return combSeason === 'full' ? 10 : 7; }
function combCarryLimit()  { return { off: Infinity, snug: 7, roomy: 9 }[combOverflow]; }
function combDaylightMs()  { return { allday: 0, longday: 90000, shortday: 60000 }[combDaylight]; }
function combIsMyTurn()    { return combTurn === combLocalIdx(); }
// A client's combHands[] holds a real hand for ITS OWN seat only — every other
// seat sits at the [0,0,0,0,0] combDealMatch() gave it and is never repaired,
// because contents never travel publicly. The public count is the only truth
// this device has about anybody else, so read it rather than a zeroed hand.
function combHandCount(p)  {
  if (window.syllyMultiplayerMode === 'client' && p !== combLocalIdx()) return combPublicCounts[p] | 0;
  return (combHands[p] || []).reduce((a, b) => a + b, 0);
}
function combAchievement() { return COMB_ACHIEVEMENT[combSeason]; }

// ── Board / topology (Step 5) ─────────────────────────────────────────────
// combBuildTopology() MUST dedupe corners with Math.round(x * 1000), NEVER
// x.toFixed(3) — toFixed emits "-0.000" for three corners on this layout and
// yields 56 nodes / 72->76 edges instead of 54/72. Measured; spec §10.
//
// PURE. No DOM, no globals read, no Math.random. Same output every call on every
// device — which is what lets the harness call it directly, and what lets a node
// id travel in a packet and mean the same thing on the other end.
function combBuildTopology() {
  const SQ3 = Math.sqrt(3);
  const nodeKey = new Map();          // "x|y" -> provisional index
  const rawNodes = [];                // { x, y }
  const hexCorners = [];              // [19][6] provisional node indices

  // 1. Six corners per hex, pointy-top, unit circumradius.
  for (let h = 0; h < COMB_AXIAL.length; h++) {
    const [q, r] = COMB_AXIAL[h];
    const cx = SQ3 * (q + r / 2);
    const cy = 1.5 * r;
    const corners = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 180) * (60 * k - 30);
      const x = cx + Math.cos(a);
      const y = cy + Math.sin(a);
      // 2. ⚠️ Math.round, NEVER toFixed. (-0).toFixed(3) is "-0.000" but
      //    String(Math.round(-1e-16)) is "0" — that difference IS the fix.
      const key = Math.round(x * 1000) + '|' + Math.round(y * 1000);
      let idx = nodeKey.get(key);
      if (idx === undefined) {
        idx = rawNodes.length;
        nodeKey.set(key, idx);
        rawNodes.push({ x, y });
      }
      corners.push(idx);
    }
    hexCorners.push(corners);
  }

  // 3. Sort by (y, then x) and re-index. The sort is the STABILITY GUARANTEE the
  //    packet layer depends on — insertion order varies with COMB_AXIAL's shape,
  //    a sorted order does not.
  const order = rawNodes.map((n, i) => i).sort((a, b) => {
    const dy = rawNodes[a].y - rawNodes[b].y;
    if (Math.abs(dy) > 1e-9) return dy;
    return rawNodes[a].x - rawNodes[b].x;
  });
  const remap = new Array(rawNodes.length);
  order.forEach((oldIdx, newIdx) => { remap[oldIdx] = newIdx; });
  const nodes = order.map(oldIdx => ({ x: rawNodes[oldIdx].x, y: rawNodes[oldIdx].y }));

  const nodesOfHex = hexCorners.map(c => c.map(i => remap[i]));

  // 4. Six consecutive corner pairs per hex -> edges, deduped by sorted pair.
  const edgeKey = new Map();
  const nodesOfEdge = [];
  for (const corners of nodesOfHex) {
    for (let k = 0; k < 6; k++) {
      const a = corners[k], b = corners[(k + 1) % 6];
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const key = lo + '|' + hi;
      if (!edgeKey.has(key)) { edgeKey.set(key, nodesOfEdge.length); nodesOfEdge.push([lo, hi]); }
    }
  }
  // Sort edges by (min node, max node) — same stability reasoning as the nodes.
  const eOrder = nodesOfEdge.map((e, i) => i).sort((a, b) =>
    (nodesOfEdge[a][0] - nodesOfEdge[b][0]) || (nodesOfEdge[a][1] - nodesOfEdge[b][1]));
  const sortedEdges = eOrder.map(i => nodesOfEdge[i]);

  // 5. Emit the reverse indices every rule reads.
  const hexesOfNode = nodes.map(() => []);
  nodesOfHex.forEach((corners, h) => corners.forEach(n => {
    if (!hexesOfNode[n].includes(h)) hexesOfNode[n].push(h);
  }));
  const edgesOfNode = nodes.map(() => []);
  const neighboursOfNode = nodes.map(() => []);
  sortedEdges.forEach(([a, b], e) => {
    edgesOfNode[a].push(e); edgesOfNode[b].push(e);
    if (!neighboursOfNode[a].includes(b)) neighboursOfNode[a].push(b);
    if (!neighboursOfNode[b].includes(a)) neighboursOfNode[b].push(a);
  });
  const edgesOfHex = nodesOfHex.map(corners => {
    const out = [];
    for (let k = 0; k < 6; k++) {
      const a = corners[k], b = corners[(k + 1) % 6];
      const e = sortedEdges.findIndex(([x, y]) => x === Math.min(a, b) && y === Math.max(a, b));
      out.push(e);
    }
    return out;
  });

  return { nodes, nodesOfHex, edgesOfHex, hexesOfNode, edgesOfNode,
           nodesOfEdge: sortedEdges, neighboursOfNode,
           ports: combBuildPorts(nodes, hexesOfNode, neighboursOfNode) };
}

// Nine Trade Blossoms on fixed coastal node pairs. Spec §10 fixes the COUNT and
// the rates (4 generic 3:1, 5 specific 2:1) and says the set is part of the
// topology and never shuffles — but it does not enumerate the pairs, so they are
// DERIVED here: walk the rim cycle, then take every other adjacent pair, evenly
// spaced. Deterministic and stable, which is all the packet layer needs.
function combBuildPorts(nodes, hexesOfNode, neighboursOfNode) {
  // A coastal node touches fewer than 3 hexes. The rim is a single cycle through
  // them; walk it by always stepping to an unvisited coastal neighbour.
  const coastal = [];
  for (let n = 0; n < nodes.length; n++) if (hexesOfNode[n].length < 3) coastal.push(n);
  const isCoastal = new Set(coastal);
  const cycle = [coastal[0]];
  const seen = new Set([coastal[0]]);
  while (true) {
    const cur = cycle[cycle.length - 1];
    const next = neighboursOfNode[cur].find(m => isCoastal.has(m) && !seen.has(m));
    if (next === undefined) break;
    cycle.push(next); seen.add(next);
  }
  // 30 rim nodes -> 9 ports at a stride of 3, each covering one adjacent pair.
  const KINDS = ['any', 'any', 'any', 'any', 'resin', 'wax', 'pollen', 'nectar', 'jelly'];
  const ports = [];
  const stride = Math.floor(cycle.length / KINDS.length);
  for (let i = 0; i < KINDS.length; i++) {
    const a = cycle[(i * stride) % cycle.length];
    const b = cycle[(i * stride + 1) % cycle.length];
    ports.push({ kind: KINDS[i], rate: KINDS[i] === 'any' ? 3 : 2, nodes: [a, b] });
  }
  return ports;
}

// The fixed, balanced arrangement (spec §10). Guaranteed legal, which is what
// makes it the Wild deal's fallback as well as a setting in its own right.
function combTendedBoard() {
  return COMB_TENDED_KIND.map((kind, h) => ({
    kind,
    marker: COMB_TENDED_MARKER[h] || 0,   // 0 == the Smoke Zone, no Bloom Marker
  }));
}

// Wild: shuffle kinds over 19 hexes and markers over the 18 producing ones,
// rejecting any layout where a 6 touches an 8. Bounded at 200 attempts, then
// falls back to Tended. Seeded, so every device deals the identical board from
// COMB_MATCH_START's combBoardSeed rather than the host broadcasting 19 hexes.
function combDealBoard(seed) {
  if (combLayout === 'tended') return combTendedBoard();
  // window.Physics, never a bare `Physics` — physics.js publishes onto `window`,
  // and in a vm sandbox (every harness) a bare reference is simply not defined.
  // cld.js's window.Physics.rng(seed) is the suite idiom; follow it exactly.
  const rand = window.Physics.rng(seed);
  const topo = COMB_TOPOLOGY;

  const kindPool = [];
  for (const k in COMB_HEX_COUNT) for (let i = 0; i < COMB_HEX_COUNT[k]; i++) kindPool.push(k);

  for (let attempt = 0; attempt < 200; attempt++) {
    const kinds = combShuffle(kindPool.slice(), rand);
    const markerPool = combShuffle(COMB_MARKERS.slice(), rand);
    const hexes = [];
    let mi = 0;
    for (let h = 0; h < 19; h++) {
      hexes.push({ kind: kinds[h], marker: kinds[h] === 'smoke' ? 0 : markerPool[mi++] });
    }
    if (combLayoutLegal(hexes, topo)) return hexes;
  }
  return combTendedBoard();
}

// Two hexes are adjacent when they share an EDGE — i.e. two nodes, not one. A
// shared single corner is a touch, not an adjacency, and using the corner test
// would reject far more layouts than Catan's rule does.
function combHexesAdjacent(a, b, topo) {
  const A = topo.nodesOfHex[a], B = topo.nodesOfHex[b];
  let shared = 0;
  for (const n of A) if (B.includes(n)) shared++;
  return shared === 2;
}

function combLayoutLegal(hexes, topo) {
  for (let a = 0; a < hexes.length; a++) {
    const ma = hexes[a].marker;
    if (ma !== 6 && ma !== 8) continue;
    for (let b = a + 1; b < hexes.length; b++) {
      const mb = hexes[b].marker;
      if (mb !== 6 && mb !== 8) continue;
      if (combHexesAdjacent(a, b, topo)) return false;   // 6-6, 8-8 and 6-8 all rejected
    }
  }
  return true;
}

// Fisher-Yates against the seeded stream. Never Array.sort(() => rand() - 0.5),
// which is neither uniform nor stable across engines.
function combShuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// Built once at load. Pure, so this is a constant in everything but the keyword.
const COMB_TOPOLOGY = combBuildTopology();

// ── Rules (Step 5) ────────────────────────────────────────────────────────

// What the table can see: structures on the board plus the two achievements.
// Golden Nectar is deliberately absent — that is the whole of the endgame beat.
function combPublicPoints(p) {
  let pts = 0;
  for (const nd of combNodes) if (nd.owner === p) pts += nd.level;   // cell 1, dome 2
  const A = combAchievement();
  if (combLargestHolder  === p) pts += A.points;
  if (combFiercestHolder === p) pts += A.points;
  return pts;
}

// What actually wins. The ONLY function the win check may read (spec §6).
function combTruePoints(p) {
  const hidden = (combInstinct[p] || []).filter(c => c.kind === 'golden').length;
  return combPublicPoints(p) + hidden;
}

// Catan's rule unmodified: the longest SIMPLE PATH through p's wall graph, where
// a node carrying ANOTHER player's structure is not traversable.
//
// Visited set is over EDGES, not nodes — a chain may legally revisit a node in a
// branching network, and tracking nodes would under-count those.
//
// Exponential in theory, bounded by 15 walls per player in practice (a few
// thousand steps, well under a millisecond). Do not optimise this prematurely.
function combLongestChain(p) {
  const T = COMB_TOPOLOGY;
  const adj = new Map();                       // node -> [edge]
  for (let e = 0; e < combEdges.length; e++) {
    if (combEdges[e] !== p) continue;
    const [a, b] = T.nodesOfEdge[e];
    if (!adj.has(a)) adj.set(a, []); adj.get(a).push(e);
    if (!adj.has(b)) adj.set(b, []); adj.get(b).push(e);
  }
  if (!adj.size) return 0;

  // The PRUNE, and it is the whole of §4c's "cut". Doing it as a graph property
  // rather than a special case is what makes an opponent cutting your chain fall
  // out for free instead of needing its own code path.
  const blocked = n => {
    const nd = combNodes[n];
    return !!nd && nd.level > 0 && nd.owner !== p && nd.owner !== -1;
  };

  let best = 0;
  const usedEdge = new Set();
  function dfs(node, count) {
    if (count > best) best = count;
    // An edge may END at an opponent's structure; it may not continue THROUGH it.
    if (blocked(node)) return;
    const out = adj.get(node);
    if (!out) return;
    for (const e of out) {
      if (usedEdge.has(e)) continue;
      usedEdge.add(e);
      const [a, b] = T.nodesOfEdge[e];
      dfs(a === node ? b : a, count + 1);
      usedEdge.delete(e);
    }
  }
  // Every node touching one of p's walls is a candidate start. A path that would
  // start AT a blocked node and run outward is the same path found from its far
  // end, so returning early there loses nothing.
  for (const node of adj.keys()) dfs(node, 0);
  return best;
}

// THE single resolution point (spec §6). Called after every wall placement, every
// Drone Cell placement — own OR opposing, which is what makes a cut register —
// and every Guard Bee play. Never duplicated at three call sites.
function combRecomputeAchievements() {
  const A = combAchievement();
  const prevL = combLargestHolder, prevF = combFiercestHolder;
  for (let p = 0; p < combPlayerCount; p++) combChainLen[p] = combLongestChain(p);
  combLargestHolder  = combResolveHolder(combChainLen,      combLargestHolder,  A.minChain);
  combFiercestHolder = combResolveHolder(combGuardsPlayed,  combFiercestHolder, A.minGuards);
  // ANNOUNCING here rather than at the three call sites is the same
  // single-resolution-point rule that owns the comparison itself: a transfer
  // resolved in one place and announced in three drifts on the fourth caller.
  // Every device hears it, because losing an achievement is information you
  // need and it can happen on somebody else's turn (spec §9).
  if (!combQuiet) {
    if (combLargestHolder  !== prevL) combAnnounceAchievement('Largest Comb', combLargestHolder);
    if (combFiercestHolder !== prevF) combAnnounceAchievement('Fiercest Guard', combFiercestHolder);
  }
  return { largestFrom: prevL,  largestTo:  combLargestHolder,
           fiercestFrom: prevF, fiercestTo: combFiercestHolder };
}

// -1 is a legitimate, displayable state — "nobody has qualified yet", which a
// cut can produce as easily as an opening can (spec §6 tie-break rule 2).
function combAnnounceAchievement(label, holder) {
  combPlay('achievementMoves');
  combLogAppend(holder < 0 ? label + ' \u2192 Unclaimed.' : label + ' \u2192 ' + combName(holder) + '.');
}

// One shape, two achievements. Both transfers use `>`, NEVER `>=` — that is the
// whole of Q18's tie rule, and it is why the holders are stored rather than
// recomputed (two equal 5-chains cannot tell you who got there first).
function combResolveHolder(scores, holder, minimum) {
  let best = -Infinity;
  for (let p = 0; p < combPlayerCount; p++) best = Math.max(best, scores[p] || 0);
  if (best < minimum) return -1;                       // nobody qualifies (a cut can do this)
  const leaders = [];
  for (let p = 0; p < combPlayerCount; p++) if ((scores[p] || 0) === best) leaders.push(p);
  if (holder === -1) return leaders.length === 1 ? leaders[0] : -1;
  // ⚠️ The next two lines are DELIBERATELY redundant — either one alone
  // implements the tie rule correctly, and a mutation run (7 Sep 2026) confirmed
  // no single edit to either can change an answer. Do NOT "simplify" this by
  // deleting the first: on its own that is harmless, but combined with a later
  // slip of `===` to `>=` on the second it silently hands the card to the
  // lowest-numbered leader on every tie. Belt and braces, on purpose.
  if ((scores[holder] || 0) === best) return holder;   // the incumbent keeps a tie
  if (leaders.length === 1) return leaders[0];         // beaten outright -> transfer
  // Beaten by TWO players at once: no single challenger beat them outright, so
  // the incumbent keeps it. The one genuinely ambiguous case in Catan's own
  // rules, settled here deliberately and asserted in the harness (spec §6).
  return holder;
}

// Called ONLY at the end of an action taken on the active player's OWN turn.
// Losing Largest Comb on someone else's turn can drop you below the target;
// gaining it there does NOT win you the match (brief §5's "he's on 9, someone
// break his road" moment, and it is load-bearing).
function combCheckWin() {
  return combTruePoints(combTurn) >= combTarget();
}

// ── Affordability and the two private-collection reads ────────────────────
function combCanAfford(p, cost) {
  const hand = combHands[p] || [];
  for (let i = 0; i < COMB_RES.length; i++) if ((hand[i] || 0) < cost[i]) return false;
  return true;
}
function combPieceCount(p, kind) {
  if (kind === 'wall') return combEdges.filter(o => o === p).length;
  if (kind === 'cell') return combNodes.filter(n => n.owner === p && n.level === 1).length;
  if (kind === 'dome') return combNodes.filter(n => n.owner === p && n.level === 2).length;
  return 0;
}
// A Drone Cell upgraded to a Queen Dome no longer counts against the 5-cell cap
// (it is a dome now), which is why the caps are counted by CURRENT level rather
// than by how many were ever built.
function combAtPieceLimit(p, kind) {
  return COMB_LIMITS[kind] !== undefined && combPieceCount(p, kind) >= COMB_LIMITS[kind];
}

// The Meadow's rate for one resource: 4:1 baseline, 3:1 on any generic Trade
// Blossom reached, 2:1 on that resource's own. Reached == a structure of p's on
// either of the port's two nodes.
function combBankRate(p, resIdx) {
  const kind = COMB_RES[resIdx];
  let rate = 4;
  for (const port of COMB_TOPOLOGY.ports) {
    const reached = port.nodes.some(n => combNodes[n] && combNodes[n].owner === p && combNodes[n].level > 0);
    if (!reached) continue;
    if (port.kind === kind) rate = Math.min(rate, port.rate);
    else if (port.kind === 'any') rate = Math.min(rate, port.rate);
  }
  return rate;
}

// ── Placement legality (spec §7) ──────────────────────────────────────────
// Each returns { ok } or { ok:false, reason } — the reason IS the tip copy, so a
// dimmed target stays tappable for its explanation rather than going silent.
// Silent non-response is the wrong behaviour: the Distance Rule is the single
// most-missed rule in the game and a player learns it from being told.

function combNodeTouchesOwn(p, n) {
  return COMB_TOPOLOGY.edgesOfNode[n].some(e => combEdges[e] === p);
}

function combWallLegal(p, e, opts) {
  if (combEdges[e] !== -1) return { ok: false, reason: null };          // never lights up
  // The OPENING wall must touch the cell just placed — Catan's rule, and the
  // reason the draft passes an anchor rather than a blanket exemption. Without
  // it a draft wall lands anywhere empty and seeds a second, disconnected
  // network the player never has to reach. §7 lists the draft exemption for the
  // CELL only; the wall's connectivity was never exempted.
  if (opts && opts.draft) {
    if (typeof opts.anchor !== 'number' || opts.anchor < 0) return { ok: true };
    const ends = COMB_TOPOLOGY.nodesOfEdge[e];
    if (ends[0] === opts.anchor || ends[1] === opts.anchor) return { ok: true };
    return { ok: false, reason: 'It has to touch the cell you just placed.' };
  }
  const [a, b] = COMB_TOPOLOGY.nodesOfEdge[e];
  // Connects to your own network through either endpoint — your own structure
  // there, or one of your own walls, provided an opponent's building does not
  // sit on that node (Catan: you cannot build THROUGH someone else's town).
  for (const n of [a, b]) {
    const nd = combNodes[n];
    if (nd && nd.level > 0 && nd.owner === p) return { ok: true };
    const blockedHere = nd && nd.level > 0 && nd.owner !== p && nd.owner !== -1;
    if (!blockedHere && combNodeTouchesOwn(p, n)) return { ok: true };
  }
  return { ok: false, reason: 'Nothing of yours reaches here yet.' };
}

function combCellLegal(p, n, opts) {
  if (combNodes[n] && combNodes[n].level > 0) return { ok: false, reason: null };
  // THE DISTANCE RULE — no neighbouring node may hold ANY structure, including
  // your own. The single most-missed rule in the game (spec §7 / brief §18).
  for (const m of COMB_TOPOLOGY.neighboursOfNode[n]) {
    if (combNodes[m] && combNodes[m].level > 0) {
      return { ok: false, reason: 'Too close to the comb next door.' };
    }
  }
  // The two opening placements are free AND unconnected — that exemption is the
  // only reason the draft can put a first cell anywhere.
  if (opts && opts.draft) return { ok: true };
  if (!combNodeTouchesOwn(p, n)) return { ok: false, reason: 'Nothing of yours reaches here yet.' };
  return { ok: true };
}

function combDomeLegal(p, n) {
  const nd = combNodes[n];
  if (!nd || nd.owner !== p || nd.level !== 1) return { ok: false, reason: null };
  return { ok: true };
}

function combWaspLegal(h) {
  if (h === combWaspHex) return { ok: false, reason: 'The Wasp is already there.' };
  if (h < 0 || h >= combHexes.length) return { ok: false, reason: null };
  return { ok: true };
}

// One predicate, every caller: legality checking, the applier and the
// affordability highlighting all route through this (single-source rule).
function combPlaceLegal(kind, targetIdx, playerIdx, opts) {
  const p = playerIdx;
  if (kind === 'wall') return combWallLegal(p, targetIdx, opts);
  if (kind === 'cell') return combCellLegal(p, targetIdx, opts);
  if (kind === 'dome') return combDomeLegal(p, targetIdx);
  if (kind === 'wasp') return combWaspLegal(targetIdx);
  return { ok: false, reason: null };
}

// Every legal target for a kind — what placement mode lights up, and what the
// nearest-target snap picks from (spec §2). Never a hit-test over all 54/72.
function combLegalTargetsFor(kind, playerIdx, opts) {
  const out = [];
  const n = kind === 'wall' ? combEdges.length
          : kind === 'wasp' ? combHexes.length
          : combNodes.length;
  for (let i = 0; i < n; i++) if (combPlaceLegal(kind, i, playerIdx, opts).ok) out.push(i);
  return out;
}

// ── The ONE placement path (spec §15) ─────────────────────────────────────
// Explicit playerIdx and no broadcast in 'single' mode, so one process can drive
// all N seats. An applier that read mpMyPlayerIdx internally could not be
// harnessed at all.
function combApplyPlace(kind, targetIdx, playerIdx, opts) {
  opts = opts || {};
  const p = playerIdx;
  // The piece limit is checked BEFORE target legality on purpose. At the limit no
  // target is placeable anywhere, so the limit is the dominant reason and the
  // more useful message — and §7 lists it as a rejection of the build OPTION,
  // one level above the target. Checking legality first would answer a player at
  // 15 walls with "nothing of yours reaches here yet", which is true but useless.
  if (kind !== 'wasp' && combAtPieceLimit(p, kind)) {
    return { ok: false, reason: 'Your colony has no more to give.' };
  }
  const legal = combPlaceLegal(kind, targetIdx, p, opts);
  if (!legal.ok) return { ok: false, reason: legal.reason };

  if (kind !== 'wasp') {
    if (!opts.free) {
      const cost = COMB_COSTS[kind];
      if (!combCanAfford(p, cost)) return { ok: false, reason: null };
      const hand = (combHands[p] || []).slice();
      for (let i = 0; i < COMB_RES.length; i++) hand[i] -= cost[i];
      combSetHand(p, hand);                    // the ONLY writer — never combHands[p] = …
      combReturnToSupply(cost);                // a no-op unless Bounty is Limited
    }
  }

  if (kind === 'wall')      combEdges[targetIdx] = p;
  else if (kind === 'cell') combNodes[targetIdx] = { owner: p, level: 1 };
  else if (kind === 'dome') combNodes[targetIdx] = { owner: p, level: 2 };
  else if (kind === 'wasp') { combWaspHex = targetIdx; combStats.waspLandings++; }

  // A Drone Cell can CUT someone else's chain, so the recompute runs on cells
  // and walls alike — and on an opponent's cell, not just your own (spec §4c).
  if (kind === 'wall' || kind === 'cell') combRecomputeAchievements();
  return { ok: true };
}

// The UI-facing wrapper the board and the map overlay both call (spec §2: one
// placement function, so the magnifier cannot become a second source of truth).
// THE interceptor (logic-engine.md § Interceptor Pattern). A client never
// mutates match state — it asks and waits for the SYNC that answers — and the
// host runs the same three appliers a client's ACTION routes to, so there is one
// implementation of each rule rather than a host copy and a client copy.
function combAttemptPlace(kind, targetIdx) {
  if (window.syllyMultiplayerMode === 'client') {
    const me = combLocalIdx();
    if (combPhase === 'draft') combSendAction('COMB_DRAFT_PLACE', { playerIdx: me, kind, targetIdx });
    else if (kind === 'wasp')  combSendAction('COMB_WASP_MOVE',   { playerIdx: me, hexIdx: targetIdx });
    else                       combSendAction('COMB_BUILD',       { playerIdx: me, kind, targetIdx });
    return { ok: true, sent: true };          // `sent` — nothing changed HERE yet
  }
  if (combPhase === 'draft') return combDraftPlace(kind, targetIdx, combTurn);
  if (kind === 'wasp')       return combWaspMove(combTurn, targetIdx);
  return combBuild(combTurn, kind, targetIdx);
}

// Re-validate at execution, NEVER escrow (brief §14c). Escrow needs an unlock
// path for every abandonment route — timeout, cancel, turn end, disconnect, host
// change — and each one missed is a permanently locked resource that a player
// finds, not a harness. One check, no cleanup paths, no leaks.
function combTradeStillValid(offer, partnerIdx) {
  if (!offer) return false;
  if (!combCanAfford(offer.from, offer.give)) return false;
  if (!combCanAfford(partnerIdx, offer.want)) return false;
  return true;
}

// ── The two private-collection writers (spec §11) ─────────────────────────
// The ONLY place combHands[p] is written. All seven mutation paths route here,
// so a path added later inherits the private repair for free. A function that
// writes combHands[p] directly silently desyncs that device for the whole match.
function combSetHand(p, hand) {
  combHands[p] = COMB_RES.map((_, i) => Math.max(0, hand[i] | 0));
  combSendPrivateRepair(p, 'COMB_HAND_SYNC', { hand: combHands[p] });
}
function combSetInstinct(p, cards) {
  combInstinct[p] = (cards || []).map(c => ({
    kind: c.kind, boughtTurn: c.boughtTurn | 0, played: !!c.played,
  }));
  combSendPrivateRepair(p, 'COMB_INSTINCT_SYNC', { cards: combInstinct[p] });
}

// The private repair packet, in ONE place. Putting the send inside the single
// function where the collection changes — rather than once per applier — is what
// makes a mutation path added later inherit it for free (logic-engine.md
// § Private hands need a private REPAIR packet; PKO's PKO_HAND_SYNC is the
// reference). Two rules it obeys: send the WHOLE collection, never a delta, so a
// dropped packet self-corrects on the next mutation; and skip entirely in
// 'single' mode so one process can drive all N seats.
function combSendPrivateRepair(p, action, payload) {
  if (window.syllyMultiplayerMode !== 'host') return;   // only the host mirrors
  const slot = (typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots) ? mpPlayerSlots[p] : null;
  if (!slot || !slot.uid) return;
  if (slot.uid === window.syllyDeviceUid) return;       // the host already has it
  try { mpSendPrivate(slot.uid, { type: 'SYNC', payload: Object.assign({ action }, payload) }); }
  catch (_) { /* a private-channel failure must never strand the host mid-turn */ }
}

// ══════════════════════════════════════════════════════════════════════════
// ── The match engine (Step 5, chunk 3) ────────────────────────────────────
// Match start, the snake draft, the Scout Flight and production, the Wasp and
// the Overflow, End Turn, and the state snapshot.
//
// FOUR RULES HOLD EVERYWHERE BELOW, and between them they are what lets one
// harness process drive all N seats:
//   1. Every applier takes an EXPLICIT playerIdx. None reads mpMyPlayerIdx to
//      decide WHO acted — only ever to decide what THIS device hears or shows.
//   2. Nothing broadcasts unless this device is the host. combBroadcast() and
//      combSendPrivateRepair() both return early otherwise, which is why the
//      rules harness can make mpSendEnvelope/mpSendPrivate throw and stay green.
//   3. combSetHand() / combSetInstinct() are the ONLY writers of the two
//      private collections. Every path below routes through them and inherits
//      the private repair packet for free (spec §11).
//   4. Every applier returns { ok, reason } — never a bare boolean, never a
//      throw. A throw inside mpHandleEnvelope strands the device that raised it
//      AND kills the SYNC that would have advanced everyone else.
// ══════════════════════════════════════════════════════════════════════════

// ── The Sun Compass: the Scout Flight beat ────────────────────────
// Appendix B3's arithmetic is the binding constraint here, not the technique:
// this fires 60–80 times a match, so a cinematic 3 s die would cost 3–4 minutes
// of a 25-minute season. The WHOLE beat is budgeted at 800–1200 ms (spec §2),
// and B3's "shorten it after the first few rolls" is the short total below.
// ⚠️ Only the SPIN slice is dead time. The state lands WITH the face, and the
// land+fade play out over a board the player is already free to act on.
const COMB_FLIGHT_MS       = 1050;  // the whole beat, the opening flights
const COMB_FLIGHT_SHORT_MS = 600;   // from the 4th flight on
const COMB_FLIGHT_FULL_TURNS = 3;   // how many flights get the full flourish
// The beat's three parts as FRACTIONS of whichever total is in force, so the
// short flight is the same motion scaled rather than a second set of numbers.
const COMB_FLIGHT_SPIN_F = 0.50;    // blind — the roll does not exist on ANY device yet
const COMB_FLIGHT_LAND_F = 0.30;    // decelerating onto the face, the number fading in
const COMB_FLIGHT_FADE_F = 0.20;    // the compass lifts away; the status line keeps the number
const COMB_FLIGHT_SPINS  = 3.4;     // full rotations across the blind spin
const COMB_FLIGHT_BOB_PX = 5;       // the hover while it is still in the air
const COMB_SUPPLY_EACH = 19;     // per resource; only read when Bounty is Limited
const COMB_LOG_MAX     = 200;    // the Season Log is a scrollback, not a ledger
const COMB_OFFER_MS    = 10000;  // Full Dance's auto-decline (spec §8)

// This device may resolve. Host and single both do; a client only ever renders
// what it is told. Every "the host decides" branch in the file asks this.
function combIsAuthority() { return window.syllyMultiplayerMode !== 'client'; }

// Which seat this DEVICE is. Never used to decide who acted — see rule 1.
function combLocalIdx() {
  return (typeof mpMyPlayerIdx === 'number' && mpMyPlayerIdx >= 0) ? mpMyPlayerIdx : 0;
}

function combName(p) {
  return combPlayerNames[p] || COMB_PLAYER_LABEL[p] || ('Player ' + (p + 1));
}

// The public half of every hand — a count, never a content. Handed to every
// SYNC that changes anybody's holdings, which is most of them.
function combHandCounts() {
  const out = [];
  for (let p = 0; p < combPlayerCount; p++) out.push(combHandCount(p));
  return out;
}

// The ONE public send site. Mirrors combSendPrivateRepair's shape on purpose:
// two functions, two channels, and no third place in the file that touches
// Firebase. The RECEIVE half is combHandleEnvelope, at the bottom of the file.
function combBroadcast(action, payload) {
  if (window.syllyMultiplayerMode !== 'host') return;
  try { mpSendEnvelope({ type: 'SYNC', payload: Object.assign({ action }, payload) }); }
  catch (_) { /* a broadcast failure must never strand the host mid-turn */ }
}

// The CLIENT half of the same send site — one function per direction, and still
// no third place in this file that touches Firebase. A client never mutates
// match state: it asks, and waits for the SYNC that answers.
//
// mpLockSync() is what stops a double-tap becoming two placements. The engine's
// correctness layer drops every ACTION but the one that lock authorised, so the
// second tap is discarded at the send choke point rather than by anything here.
function combSendAction(action, payload) {
  if (window.syllyMultiplayerMode !== 'client') return;
  try { mpLockSync(); } catch (_) {}
  try { mpSendEnvelope({ type: 'ACTION', payload: Object.assign({ action }, payload) }); }
  catch (_) { /* the SYNC never arrives; the 8 s lock timeout releases the UI */ }
}

// Who SENT an envelope, from the wire's own originId — never from the payload.
// payload.playerIdx travels because spec §11's table says it does and because it
// reads well in a log, but the host must not trust it: a device that sets it to
// somebody else's seat would otherwise place their pieces and spend their hand.
// -1 means "not a seated player", and the host drops the envelope.
function combSeatOf(originId) {
  if (!originId) return -1;
  const slots = (typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots) ? mpPlayerSlots : [];
  for (let i = 0; i < slots.length; i++) if (slots[i] && slots[i].uid === originId) return i;
  return -1;
}

// Audio through ONE resolver, for two reasons that both matter. It keeps
// COMB_SOUND the single map from moment to voice (spec §9), and it means a
// catalogue function that does not exist yet — playAccord() is the game's one
// new sound — degrades to silence instead of a ReferenceError inside a Firebase
// callback. The harness sandbox stubs nine play*() functions, not twenty.
function combPlay(moment) {
  const fn = COMB_SOUND[moment];
  if (!fn) return;
  const f = (typeof globalThis !== 'undefined') ? globalThis[fn] : null;
  if (typeof f === 'function') { try { f(); } catch (_) {} }
}

// ⚠️ THE SEASON LOG IS BUILT FROM PUBLIC FACTS ONLY (spec §11). A log is the
// classic place hidden information leaks after the fact, and the leak is easy:
// the host has everybody's hand in front of it. The structural guard is that
// every line below is composed from a value that also travels in a public SYNC —
// production is public, a steal's VICTIM is public, what the steal TOOK is not.
// Never log a resource name attributable to a steal or an Overflow discard.
function combLogAppend(line) {
  if (!line) return;
  combLog.push(line);
  if (combLog.length > COMB_LOG_MAX) combLog.splice(0, combLog.length - COMB_LOG_MAX);
  combBroadcast('COMB_LOG_APPEND', { line });
}

// ── Match start ───────────────────────────────────────────────────────────

// The Instinct deck, shuffled from the match seed on a stream DELIBERATELY
// offset from the board's. The same seed must give the same deck on every
// device — that is what lets COMB_MATCH_START carry a number instead of 25
// cards — but drawing it from the same stream position would correlate the deck
// order with the board layout for no reason.
function combBuildDeck(seed) {
  const rand = window.Physics.rng((seed ^ 0x9E3779B9) >>> 0);
  const deck = [];
  for (const k in COMB_DECK_COUNT) for (let i = 0; i < COMB_DECK_COUNT[k]; i++) deck.push(k);
  return combShuffle(deck, rand);
}

// The snake: 0,1,…,N-1 then N-1,…,1,0. Two entries per player, each entry one
// Drone Cell followed by one Comb Wall. This is the whole of the compensation
// the last seat gets for going last, which is why turn order is simply the
// lobby's seat order and showWhoFirst() is not used (spec §2).
function combBuildDraftOrder(n) {
  const fwd = [];
  for (let i = 0; i < n; i++) fwd.push(i);
  return fwd.concat(fwd.slice().reverse());
}

// The host's one seeded stream, for the Scout Flight and the Wasp's draw.
// NOT serialised, and that is deliberate: only the authority ever draws from
// it, and every result it produces travels as an explicit value in a packet. A
// late-joining client needs the answers, never the generator.
function combRandom() {
  if (!combRng) combRng = window.Physics.rng((combBoardSeed ^ 0x5BF03635) >>> 0);
  return combRng();
}

function combRollDice() {
  return (1 + Math.floor(combRandom() * 6)) + (1 + Math.floor(combRandom() * 6));
}

// Deal a whole match from a seed. Pure with respect to the network: host and
// client both call this with the same seed and settings and get byte-identical
// boards, which is why COMB_MATCH_START carries a number rather than 19 hexes.
function combDealMatch(seed) {
  const N = combPlayerCount || 0;
  combBoardSeed = (seed >>> 0) || 1;
  combRng       = null;                    // re-derived from the new seed on first draw
  combHexes     = combDealBoard(combBoardSeed);
  combWaspHex   = combHexes.findIndex(h => h.kind === 'smoke');
  combNodes     = Array.from({ length: COMB_TOPOLOGY.nodes.length }, () => ({ owner: -1, level: 0 }));
  combEdges     = new Array(COMB_TOPOLOGY.nodesOfEdge.length).fill(-1);
  combDeck      = combBuildDeck(combBoardSeed);
  combSupply    = COMB_RES.map(() => COMB_SUPPLY_EACH);

  combHands = []; combInstinct = [];
  for (let p = 0; p < N; p++) { combSetHand(p, [0, 0, 0, 0, 0]); combSetInstinct(p, []); }

  combGuardsPlayed   = new Array(N).fill(0);
  combChainLen       = new Array(N).fill(0);
  combLargestHolder  = -1;
  combFiercestHolder = -1;
  combDraftOrder     = combBuildDraftOrder(N);
  combDraftStep      = 0;
  combDraftAnchor    = -1;
  combTurn           = combDraftOrder[0] || 0;
  combTurnNo         = 0;
  combPhase          = 'draft';
  combRoll           = null;
  combInstinctPlayedThisTurn = false;
  combFreeWalls      = 0;
  combDaylightArmed  = false;
  combPublicInstinct = new Array(N).fill(0);
  combLog            = [];
  combStats          = { scoutFlights: 0, waspLandings: 0 };
  combOverflowOwed   = new Array(N).fill(0);
  combOverflowReady  = new Array(N).fill(false);
  combClearOffer();
  combStopDaylight();
  combStopFlight();
}

// Host entry from onPassThePhone, and from New Season. The roster is already
// populated by then — MDLM-only, so there is no setup screen to collect it.
function combStartMatchLocal(seed) {
  if (!combPlayerCount) {
    combPlayerCount = (typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots && mpPlayerSlots.length)
      ? mpPlayerSlots.length : Math.max(3, combPlayerNames.length || 3);
  }
  const s = (typeof seed === 'number') ? seed : ((Date.now() ^ (Math.random() * 0x7FFFFFFF)) >>> 0);
  combDealMatch(s);
  // Settings are locked at match start, so they travel ONCE, here — every later
  // packet assumes both ends already agree about the Season, the Wasp and the
  // carry limit. Names ride along because a client's mpPlayerSlots order is the
  // lobby's, and this is the moment the two are pinned together.
  combBroadcast('COMB_MATCH_START', {
    settings: combSettingsSnapshot(),
    boardSeed: combBoardSeed,
    names: combPlayerNames.slice(),
    draftOrder: combDraftOrder.slice(),
    turn: combTurn,
    phase: combPhase,
  });
  combLogAppend('The meadow is laid out. Place your opening cells.');
  combShowMeadow();
  combArmDraftPlacement();
  combRenderMeadow();
}

function combSettingsSnapshot() {
  return { season: combSeason, layout: combLayout, wasp: combWasp, overflow: combOverflow,
           waggle: combWaggle, daylight: combDaylight, bounty: combBounty };
}

// ── The opening snake draft ───────────────────────────────────────────────

// Which piece the current placer owes. Derived from combDraftAnchor rather than
// stored separately: the anchor is set the moment a draft cell lands and cleared
// the moment its wall does, so it already IS the sub-step — and one variable
// cannot disagree with itself the way two can.
function combDraftNeeds() {
  if (combPhase !== 'draft') return null;
  return combDraftAnchor >= 0 ? 'wall' : 'cell';
}

// The opts every draft placement is checked against. `anchor` is what makes the
// opening wall touch the cell just placed instead of landing anywhere empty on
// the board — see combWallLegal.
function combDraftOpts() {
  return { free: true, draft: true, anchor: combDraftAnchor };
}

// Catan's opening payout: the SECOND cell of the snake pays out immediately from
// every hex it touches. Spec §10 names the snake and stops there, but without
// this every player opens with an empty hand and the first lap is N dead turns —
// the rule exists precisely to stop that. Logged as a clarification.
function combGrantOpeningYield(p, node) {
  const delta = [0, 0, 0, 0, 0];
  for (const h of COMB_TOPOLOGY.hexesOfNode[node]) {
    const hex = combHexes[h];
    const res = hex && COMB_HEX_YIELD[hex.kind];
    if (!res) continue;                                  // the Smoke Zone yields nothing
    delta[COMB_RES.indexOf(res)] += 1;
  }
  if (!delta.some(v => v)) return delta;
  if (combBounty === 'limited') {
    for (let i = 0; i < COMB_RES.length; i++) {
      const take = Math.min(delta[i], combSupply[i] | 0);
      delta[i] = take; combSupply[i] -= take;
    }
  }
  const hand = (combHands[p] || [0, 0, 0, 0, 0]).slice();
  for (let i = 0; i < COMB_RES.length; i++) hand[i] += delta[i];
  combSetHand(p, hand);
  return delta;
}

// One draft placement — a cell, then its wall. Explicit playerIdx: the host
// calls this for its own tap AND for a client's COMB_DRAFT_PLACE, and neither
// path may read mpMyPlayerIdx to work out who placed.
function combDraftPlace(kind, targetIdx, playerIdx) {
  if (combPhase !== 'draft')  return { ok: false, reason: null };
  if (playerIdx !== combTurn) return { ok: false, reason: null };
  const need = combDraftNeeds();
  if (kind !== need) return { ok: false, reason: null };

  const res = combApplyPlace(kind, targetIdx, playerIdx, combDraftOpts());
  if (!res.ok) return res;

  if (kind === 'cell') {
    combPlay('buildCell');
    combDraftAnchor = targetIdx;
    // The payout belongs to the SECOND cell — i.e. the back half of the snake.
    if (combDraftStep >= combPlayerCount) combGrantOpeningYield(playerIdx, targetIdx);
    combLogAppend(combName(playerIdx) + ' settled a Drone Cell.');
  } else {
    combPlay('buildWall');
    combDraftAnchor = -1;
    combDraftStep++;
    combLogAppend(combName(playerIdx) + ' laid a Comb Wall.');
  }

  // ⚠️ THE TURN ADVANCES BEFORE THE BROADCAST, not after. This packet is the
  // only thing that tells the next placer it is their go, and combTurn is still
  // the OUTGOING seat until the line below runs — so broadcasting first sends
  // every device the turn that has just finished. The next client then fails its
  // own `playerIdx !== combTurn` guard, arms nothing, and the draft stalls on
  // step 2 with every applier-level assertion still green. Found by
  // verify-comb-loopback.js; see impl-notes BUG-07.
  const finished = combDraftAnchor < 0 && combDraftStep >= combDraftOrder.length;
  if (!finished && combDraftAnchor < 0) combTurn = combDraftOrder[combDraftStep];

  combBroadcast('COMB_DRAFT_STATE', {
    nodes: combNodes.map(n => ({ owner: n.owner, level: n.level })),
    edges: combEdges.slice(),
    draftStep: combDraftStep,
    draftAnchor: combDraftAnchor,
    handCounts: combHandCounts(),
    turn: combTurn,
    phase: combPhase,
  });

  if (finished) {
    combDraftFinish();
  } else {
    combArmDraftPlacement();
    combRenderMeadow();
  }
  return { ok: true };
}

// The snake ends on the first seat (…,1,0), so that seat opens the season —
// standard, and the reason the last seat's compensation is two placements back
// to back rather than the first turn.
function combDraftFinish() {
  combDraftAnchor = -1;
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  combTurnNo = 0;
  combLogAppend('The opening is set. The season begins.');
  combBeginTurn(combDraftOrder[combDraftOrder.length - 1] || 0);
}

// Arms placement mode for THIS device when the draft is waiting on it. Pure UI
// state — never serialised, never in a packet — so it is recomputed from match
// state rather than carried, and a client arms itself off the same
// COMB_DRAFT_STATE everyone else renders.
function combArmDraftPlacement() {
  if (combPhase !== 'draft' || !combIsMyTurn()) {
    combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
    return;
  }
  const need = combDraftNeeds();
  combPlacementMode = need;
  combLegalTargets  = combLegalTargetsFor(need, combTurn, combDraftOpts());
  combPendingTarget = null;
}

// ── The Scout Flight and production ───────────────────────────────────────

// Resources leaving a hand go back to the Meadow. A no-op on Endless, where
// combSupply is never read at all — but it has to be here, or Limited drains to
// empty over a match and quietly stops paying anybody.
function combReturnToSupply(delta) {
  if (combBounty !== 'limited' || !combSupply.length) return;
  for (let i = 0; i < COMB_RES.length; i++) combSupply[i] += (delta[i] | 0);
}

// Catan's shortage rule, unmodified: when the Meadow cannot pay everyone owed a
// resource, NOBODY gets that resource — unless exactly one player is owed it, in
// which case they take what is left. Any other reading needs a rule for who goes
// short, and there isn't one.
function combRationProduction(produced) {
  for (let i = 0; i < COMB_RES.length; i++) {
    let demand = 0, claimants = 0, only = -1;
    for (let p = 0; p < combPlayerCount; p++) {
      if (produced[p][i] > 0) { demand += produced[p][i]; claimants++; only = p; }
    }
    if (!demand) continue;
    const left = combSupply[i] | 0;
    if (demand <= left) { combSupply[i] = left - demand; continue; }
    if (claimants === 1) { produced[only][i] = left; combSupply[i] = 0; }
    else for (let p = 0; p < combPlayerCount; p++) produced[p][i] = 0;
  }
}

// Who gets what on this Scout Flight. Returns the full N×5 grid — production is
// PUBLIC (it is in Catan, and the whole table watches every roll for it), which
// is a different thing from a hand's contents being public. They are not.
function combProduce(roll) {
  const N = combPlayerCount;
  const produced = Array.from({ length: N }, () => [0, 0, 0, 0, 0]);
  for (let h = 0; h < combHexes.length; h++) {
    const hex = combHexes[h];
    if (!hex || hex.marker !== roll) continue;
    if (h === combWaspHex) continue;                    // the Wasp shuts its hex down
    const res = COMB_HEX_YIELD[hex.kind];
    if (!res) continue;
    const ri = COMB_RES.indexOf(res);
    for (const n of COMB_TOPOLOGY.nodesOfHex[h]) {
      const nd = combNodes[n];
      if (!nd || nd.level < 1 || nd.owner < 0 || nd.owner >= N) continue;
      produced[nd.owner][ri] += nd.level;               // a Cell 1, a Dome 2
    }
  }
  if (combBounty === 'limited') combRationProduction(produced);
  for (let p = 0; p < N; p++) {
    if (!produced[p].some(v => v)) continue;
    const hand = (combHands[p] || [0, 0, 0, 0, 0]).slice();
    for (let i = 0; i < COMB_RES.length; i++) hand[i] += produced[p][i];
    combSetHand(p, hand);
  }
  return produced;
}

// "Maya +1 Wax; Priya +1 Wax, +1 Pollen." Composed from the SAME grid that goes
// out in COMB_ROLL_RESULT, which is what makes the privacy boundary structural:
// a value not in a public SYNC cannot reach the log (spec §11).
function combProductionLine(produced) {
  const parts = [];
  for (let p = 0; p < combPlayerCount; p++) {
    const bits = [];
    for (let i = 0; i < COMB_RES.length; i++) {
      if (produced[p][i]) bits.push('+' + produced[p][i] + ' ' + COMB_RES_NAME[COMB_RES[i]]);
    }
    if (bits.length) parts.push(combName(p) + ' ' + bits.join(', '));
  }
  return parts.length ? parts.join('; ') + '.' : 'Nothing bloomed.';
}

// The flight is AUTOMATIC. There is no cast button anywhere in the markup,
// because spec §2 makes the flight animation the turn's opening beat (800–1200 ms,
// tap to skip) rather than a decision — and §11 puts the roll on the host "for
// whoever is active", so a client's device never has to ask for it either.
function combArmScoutFlight() {
  combStopFlight();
  if (!combIsAuthority()) return;
  combFlightTimer = setTimeout(() => {
    combFlightTimer = null;
    combScoutFlight(combTurn);
  }, combFlightSpinMs());
}

// Clears BOTH halves of the beat — the host's pending roll and the die in the
// air. Every teardown § Timer Lifecycle asks for already calls this one function
// (the quit-confirm handler, combResetState() via resetToLobby(), combBeginTurn,
// combFinishMatch, and the TURN_BEGIN/GAMEOVER appliers), so folding the RAF in
// here is what gets the animation all three of them without a new call site.
function combStopFlight() {
  if (combFlightTimer) { clearTimeout(combFlightTimer); combFlightTimer = null; }
  combStopFlightAnim();
}

// ── The Sun Compass ───────────────────────────────────────────
// A PRESENTATION OF A DECIDED RESULT, never a simulation (Appendix B1): the host
// picks the face and every device — the host included — only ever shows it. That
// is also what settles the technique: there is nothing to simulate, so the die is
// one DOM node whose transform this loop writes, and no library is involved.
//
// The beat has three parts, and the middle one is the join with the packet layer:
//
//   COMB_TURN_BEGIN  -> combStartFlight()   die appears, spins BLIND (no number
//                                           exists yet on ANY device)
//   COMB_ROLL_RESULT -> combLandFlight(n)   decelerate onto the face, number in
//                                           — board and hands land WITH it
//                         (fade)            the compass lifts away
//
// The host's blind spin is combFlightSpinMs() of dead air it was already
// spending (that setTimeout used to sit there showing nothing); a client's is
// however far apart the two packets arrive, which is the same figure plus
// jitter. A slow ROLL_RESULT must read as "still in the air" rather than as a die
// stopped on nothing — which is why the spin LOOPS instead of running out.
function combFlightTotalMs() {
  return combTurnNo <= COMB_FLIGHT_FULL_TURNS ? COMB_FLIGHT_MS : COMB_FLIGHT_SHORT_MS;
}
function combFlightSpinMs() { return Math.round(combFlightTotalMs() * COMB_FLIGHT_SPIN_F); }

// performance.now() where it exists, Date.now() otherwise — a headless sandbox
// stubs Date and not performance, and this runs once per flight even there.
function combNow() {
  return (typeof performance !== 'undefined' && performance && performance.now)
    ? performance.now() : Date.now();
}

// ⚠️ A RAF bypasses the global prefers-reduced-motion block completely: that
// block zeroes CSS durations, and nothing in it reaches a loop writing transforms
// by hand (ui-style.md § Motion Standard). So the check is explicit here, and it
// honours what the standard actually asks for — nothing travels. The die still
// appears and still reveals the number; it simply never moves.
function combReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function combStartFlight() {
  combStopFlightAnim();
  // A new cast — clear last round's takes so the player panel shows "—" during
  // the spin, then the fresh yield on land. Runs even on a headless device.
  combLastProduced = null;
  const layer = document.getElementById('comb-float-layer');
  // No layer or no RAF means a headless harness, or a screen that is not up: the
  // beat is skipped and the roll still resolves. The animation is never
  // load-bearing for state — that is the whole point of it being a presentation.
  if (!layer || typeof requestAnimationFrame !== 'function') return;
  const total = combFlightTotalMs();
  const el = combRenderDie({});
  layer.appendChild(el);
  // The LAYER keeps pointer-events:none for its whole life — it is inset-0 over
  // the board, and a live one would eat every board tap and sit on the magnifier
  // for a second of every turn. The DIE carries pointer-events:auto instead
  // (css/styles.css), and the tap bubbles from it up to the one listener on the
  // layer: a hit target only where there is something to hit, and no per-die
  // binding 60–80 times a match. That is the whole of tap-to-skip (Appendix B3).
  combFlightView = {
    el, layer, face: el.combFaceEl || null,
    t0: combNow(), landAt: 0, roll: null, spinRot: 0, landRot: 0,
    spinMs: Math.round(total * COMB_FLIGHT_SPIN_F),
    landMs: Math.round(total * COMB_FLIGHT_LAND_F),
    fadeMs: Math.round(total * COMB_FLIGHT_FADE_F),
    still: combReducedMotion(),
  };
  // The whoosh belongs to the CAST, not to the result — it is the sound of the
  // die going up. A skipped flight is therefore silent, which is correct.
  combPlay('scoutFlight');
  combFlightPaint(0);
  combRafHandle = requestAnimationFrame(combFlightTick);
}

// Called from BOTH halves of the roll — the host's combScoutFlight() and the
// client's COMB_ROLL_RESULT applier — at the same point: the moment combRoll is
// set. A no-op when nothing is flying, which covers a skipped flight, a headless
// run, and a device that was not on the meadow when the turn began.
function combLandFlight(roll) {
  const v = combFlightView;
  if (!v || v.roll !== null) return;
  v.roll    = roll;
  v.landAt  = combNow();
  v.landRot = v.spinRot;
  if (v.face) v.face.textContent = String(roll);
}

// Tap anywhere on the live layer. Skips THIS flight only — the next turn's plays
// in full (owner call, 10 Sep 2026). A tap during the blind spin cannot reveal a
// number that does not exist yet, so it simply takes the die away; the result
// then arrives in the status line the instant it exists, which is the honest
// meaning of "skip" here. combLandFlight() no-ops afterwards on its own, so this
// needs no flag of its own.
function combSkipFlight() {
  if (!combFlightView) return;
  combStopFlightAnim();
}

function combStopFlightAnim() {
  if (combRafHandle && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(combRafHandle);
  combRafHandle = null;
  const v = combFlightView;
  combFlightView = null;
  if (!v) return;
  // removeChild off the layer we kept, NOT el.parentNode — a mock element has no
  // parentNode, and the die would silently pile up in the harness's layer.
  try { if (v.layer && v.el) v.layer.removeChild(v.el); } catch (_) {}
}

function combFlightTick() {
  const v = combFlightView;
  if (!v) { combRafHandle = null; return; }
  const done = combFlightPaint(combNow() - (v.roll === null ? v.t0 : v.landAt));
  if (done) { combStopFlightAnim(); return; }
  combRafHandle = requestAnimationFrame(combFlightTick);
}

// One frame. Returns true when the beat is over. Writes ONLY transform and
// opacity — both composited, so this holds a frame budget on the mid-range phone
// that is most of this suite's audience (§ Motion Standard).
function combFlightPaint(elapsed) {
  const v = combFlightView;
  if (!v || !v.el) return true;
  let rot = 0, lift = 0, scale = 1, opacity = 1, faceOp = 0;

  if (v.roll === null) {
    // BLIND SPIN — loops, and is left only when the packet lands.
    const t = Math.max(0, elapsed) / Math.max(1, v.spinMs);
    v.spinRot = t * COMB_FLIGHT_SPINS * 360;
    rot     = v.spinRot;
    lift    = -Math.sin(t * Math.PI * 2) * COMB_FLIGHT_BOB_PX;
    // The cast: up to full size across the first fifth of the spin, and never
    // from scale(0) — that pops (§ Motion Standard).
    const cast = Math.min(1, t / 0.2);
    scale   = 0.82 + 0.18 * cast;
    opacity = cast;
  } else if (elapsed < v.landMs) {
    // LAND — ease-out onto the next whole turn so it always stops upright, with a
    // damped overshoot for the weight of it arriving. The face crosses in over the
    // first 60%, while the board and the hand row are updating underneath.
    const t  = elapsed / v.landMs;
    const e  = 1 - Math.pow(1 - t, 3);
    const to = Math.ceil(v.landRot / 360) * 360;
    rot     = v.landRot + (to - v.landRot) * e;
    scale   = 1 + 0.13 * Math.sin(t * Math.PI) * (1 - t * 0.5);
    faceOp  = Math.min(1, t / 0.6);
  } else if (elapsed < v.landMs + v.fadeMs) {
    // FADE — the compass lifts away. The number is not lost with it: the status
    // line has carried it since the moment the packet landed.
    const t = (elapsed - v.landMs) / v.fadeMs;
    rot     = Math.ceil(v.landRot / 360) * 360;
    lift    = -16 * t;
    scale   = 1 - 0.16 * t;
    opacity = 1 - t;
    faceOp  = 1;
  } else {
    return true;
  }

  if (v.still) { rot = 0; lift = 0; scale = 1; }   // reduced motion: nothing travels
  v.el.style.opacity   = String(opacity);
  v.el.style.transform = 'translateY(' + lift.toFixed(2) + 'px) rotate('
    + rot.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
  if (v.face) v.face.style.opacity = String(faceOp);
  return false;
}

function combScoutFlight(playerIdx) {
  if (combPhase !== 'roll')   return { ok: false, reason: null };
  if (playerIdx !== combTurn) return { ok: false, reason: null };
  // ⚠️ The TIMER only, never combStopFlight() — the die is in the air right now
  // and this is the function that lands it. combStopFlight() would take it away
  // one line before combLandFlight() puts the face on it.
  if (combFlightTimer) { clearTimeout(combFlightTimer); combFlightTimer = null; }

  const roll = combRollDice();
  combRoll = roll;
  combStats.scoutFlights++;
  // The whoosh already played at the cast (combStartFlight); this is the landing.
  combLandFlight(roll);
  combLogAppend('Turn ' + combTurnNo + ' — ' + combName(playerIdx) + ' rolled ' + roll + '.');

  if (roll === 7) {
    combPlay('waspRolled');
    // No phase in this packet — combBeginSeven() decides and broadcasts the one
    // real outcome (COMB_OVERFLOW_BEGIN if a discard is owed, COMB_OVERFLOW_DONE
    // otherwise). Claiming 'overflow' here stranded every client on a 7 where
    // nobody owed, which on the default Short Summer is every 7.
    combLastProduced = combZeroGrid();
    combBroadcast('COMB_ROLL_RESULT', {
      roll, seven: true, handCounts: combHandCounts(),
      produced: combZeroGrid(), waspBlockedHex: combWaspHex,
    });
    combBeginSeven();
    return { ok: true, roll, produced: null };
  }

  const produced = combProduce(roll);
  combLastProduced = produced.map(r => r.slice());
  combLogAppend(combProductionLine(produced));
  // Silence when nothing of yours bloomed is deliberate — absence is the
  // information, and a sound on every roll on every device is 60–80 of them.
  const mineRow = produced[combLocalIdx()];
  if (mineRow && mineRow.some(v => v)) combPlay('bloomYours');
  combBroadcast('COMB_ROLL_RESULT', {
    roll, phase: 'actions', handCounts: combHandCounts(),
    produced: produced.map(r => r.slice()), waspBlockedHex: combWaspHex,
  });
  combEnterActions();
  return { ok: true, roll, produced };
}

// An all-zero N×5 grid, sent EXPLICITLY on a 7 rather than omitted. Firebase
// deletes a key holding [] or an all-null array, so an omitted grid and a
// legitimately empty one are indistinguishable on the far end — and a receiver
// that keeps last round's grid paints last round's production (spec §11).
function combZeroGrid() {
  return Array.from({ length: combPlayerCount }, () => [0, 0, 0, 0, 0]);
}

// ── The seven: the Overflow, then the Wasp ────────────────────────────────

function combBeginSeven() {
  const limit = combCarryLimit();
  combOverflowOwed  = new Array(combPlayerCount).fill(0);
  combOverflowReady = new Array(combPlayerCount).fill(false);
  if (limit !== Infinity) {
    for (let p = 0; p < combPlayerCount; p++) {
      const held = combHandCount(p);
      if (held > limit) combOverflowOwed[p] = Math.floor(held / 2);
    }
  }
  if (!combOverflowOwed.some(v => v > 0)) {
    // No discard is owed (Overflow off, or every seat under the limit). Clients
    // are sitting on a transient "seven" beat off COMB_ROLL_RESULT; this is the
    // packet that moves them on. Without it they strand in 'overflow' forever
    // while the host plays on from 'waspMove'.
    combBroadcast('COMB_OVERFLOW_DONE', {
      spilled: false, phase: 'waspMove', handCounts: combHandCounts(),
    });
    combEnterWaspMove();
    return;
  }
  combPhase = 'overflow';
  // ⚠️ ready[] travels at its all-false RESET value, explicitly. It is exactly
  // the field Firebase erases, and a client that keeps the previous seven's
  // ready[] opens its gate before anybody has chosen (spec §11).
  combBroadcast('COMB_OVERFLOW_BEGIN', {
    owed:  combOverflowOwed.slice(),
    ready: combOverflowReady.slice(),
  });
  combRenderMeadow();
}

// ⚠️ THE GATE. [].every() is true, and combOverflowReady is only ever set for
// players who OWE — so a plain .every(Boolean) opens on the first tap while
// three people are still choosing, while this form is vacuously open in a game
// with no owed[] at all. CJAR BUG-05 is this bug in the other direction. Both
// shapes are wrong in the other mode: assert it PER MODE, never once.
function combOverflowGateOpen() {
  if (!combOverflowReady.length) return false;
  return combOverflowReady.every((r, i) => (combOverflowOwed[i] | 0) === 0 || r);
}

// The host marks its OWN slot by calling this directly from its confirm handler —
// never by sending itself an ACTION. mpHandleEnvelope drops every envelope whose
// originId is this device, so a self-sent ACTION means the host's slot is never
// set and the seven hangs forever (logic-engine.md § Host readyCheck).
function combSubmitOverflow(playerIdx, discard) {
  if (combPhase !== 'overflow') return { ok: false, reason: null };
  if (combOverflowReady[playerIdx]) return { ok: false, reason: null };   // no double-spill
  const owed = combOverflowOwed[playerIdx] | 0;
  const d = combWireArr(discard, COMB_RES.length, 0).map(v => Math.max(0, v | 0));
  if (d.reduce((a, b) => a + b, 0) !== owed) {
    return { ok: false, reason: 'Pick exactly ' + owed + ' to let go.' };
  }
  const hand = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice();
  for (let i = 0; i < COMB_RES.length; i++) {
    if (d[i] > (hand[i] | 0)) return { ok: false, reason: 'You have not got that to give.' };
  }
  for (let i = 0; i < COMB_RES.length; i++) hand[i] -= d[i];
  combSetHand(playerIdx, hand);
  combReturnToSupply(d);
  combOverflowReady[playerIdx] = true;
  // ⚠️ NEVER log what was discarded — that is a hand's contents by another name.
  if (combOverflowGateOpen()) combOverflowResolve();
  else combRenderMeadow();
  return { ok: true };
}

function combOverflowResolve() {
  combPlay('overflowDone');
  combLogAppend('The hive spilled over.');
  combBroadcast('COMB_OVERFLOW_DONE', {
    handCounts: combHandCounts(), phase: 'waspMove', spilled: true,
  });
  combEnterWaspMove();
}

function combEnterWaspMove() {
  combPhase = 'waspMove';
  combPlacementMode = null; combPendingTarget = null; combLegalTargets = [];
  if (combIsMyTurn()) {
    combPlacementMode = 'wasp';
    combLegalTargets  = combLegalTargetsFor('wasp', combTurn, {});
  }
  combRenderMeadow();
}

// Who the Wasp can rob on a hex: anyone but the mover with a structure touching
// it AND something to take. An empty-handed neighbour is not a victim — offering
// them as a target is a tap that resolves to nothing.
function combWaspVictims(hexIdx, thief) {
  const out = [];
  const nodes = COMB_TOPOLOGY.nodesOfHex[hexIdx] || [];
  for (const n of nodes) {
    const nd = combNodes[n];
    if (!nd || nd.level < 1 || nd.owner < 0) continue;
    if (nd.owner === thief) continue;
    if (combHandCount(nd.owner) < 1) continue;
    if (out.indexOf(nd.owner) === -1) out.push(nd.owner);
  }
  return out;
}

// Reached from a seven AND from a Guard Bee played out of the actions phase —
// which is brief §4d's finding that the steal is a consequence of the MOVE, not
// of the roll, and the reason waspMove/waspSteal are phases rather than inline
// code inside the roll handler.
function combWaspMove(playerIdx, hexIdx) {
  if (combPhase !== 'waspMove') return { ok: false, reason: null };
  if (playerIdx !== combTurn)   return { ok: false, reason: null };
  const res = combApplyPlace('wasp', hexIdx, playerIdx, {});
  if (!res.ok) return res;

  combPlay('waspLands');
  combLogAppend(combName(playerIdx) + ' moved the Wasp.');

  const victims = (combWasp === 'steals') ? combWaspVictims(hexIdx, playerIdx) : [];
  // The phase travels WITH the move (§17-20). Whether a steal follows turns on
  // whether an adjacent player is holding ANYTHING — hand contents, the one
  // thing the public channel never carries. A client could approximate it from
  // handCounts[], and that approximation would drift the first time the victim
  // rule grows a condition. One authority, one answer.
  combBroadcast('COMB_WASP_PLACED', {
    hexIdx, thief: playerIdx, victim: -1, handCounts: combHandCounts(),
    phase: victims.length ? 'waspSteal' : 'actions',
  });

  if (victims.length) {
    combPhase = 'waspSteal';
    combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
    combRenderMeadow();
    return { ok: true, victims };
  }
  combEnterActions();
  return { ok: true, victims: [] };
}

// A uniform draw over the victim's actual HOLDINGS, so someone sitting on four
// Wax and one Nectar loses Wax four times as often. Catan's "draw one card at
// random", not "pick a resource kind at random" — and the difference is the
// whole reason hoarding one resource is risky.
//
// ⚠️ HOST-ONLY KNOWLEDGE. The return value never enters a public SYNC and never
// reaches the log. Both devices learn their own hand from the private repair.
function combPickStolen(victimIdx) {
  const hand = combHands[victimIdx] || [];
  let total = 0;
  for (let i = 0; i < hand.length; i++) total += (hand[i] | 0);
  if (total < 1) return -1;
  let k = Math.floor(combRandom() * total);
  for (let i = 0; i < hand.length; i++) { k -= (hand[i] | 0); if (k < 0) return i; }
  for (let i = 0; i < hand.length; i++) if (hand[i] > 0) return i;   // float guard
  return -1;
}

function combWaspSteal(playerIdx, victimIdx) {
  if (combPhase !== 'waspSteal') return { ok: false, reason: null };
  if (playerIdx !== combTurn)    return { ok: false, reason: null };
  if (combWaspVictims(combWaspHex, playerIdx).indexOf(victimIdx) === -1) {
    return { ok: false, reason: 'The Wasp cannot reach them.' };
  }
  const ri = combPickStolen(victimIdx);
  if (ri >= 0) {
    const vh = (combHands[victimIdx] || [0, 0, 0, 0, 0]).slice(); vh[ri] -= 1;
    const th = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice(); th[ri] += 1;
    combSetHand(victimIdx, vh);
    combSetHand(playerIdx, th);
  }
  // Only the robbed device hears it — the sting is information the victim needs
  // and the table does not (spec §9).
  if (combLocalIdx() === victimIdx) combPlay('waspStealsFromYou');
  // ⚠️ WHO is public, WHAT is not. This line is the log's single most likely
  // leak and it names no resource on purpose (spec §11).
  combLogAppend('The Wasp robbed ' + combName(victimIdx) + '.');
  combBroadcast('COMB_WASP_PLACED', {
    hexIdx: combWaspHex, thief: playerIdx, victim: victimIdx, handCounts: combHandCounts(),
    phase: 'actions',
  });
  combEnterActions();
  return { ok: true, resIdx: ri };
}

// ── The turn ──────────────────────────────────────────────────────────────

function combEnterActions() {
  combPhase = 'actions';
  combPlacementMode = null; combPendingTarget = null; combLegalTargets = [];
  // ⚠️ ONCE PER TURN. A Guard Bee sends the turn out to waspMove and back, and
  // this is the only place the clock is armed — so without the flag, playing an
  // Instinct card would hand the active player a fresh 60 seconds. The flag is
  // the only honest test: combTurnEndTs is 0 both before arming AND under All
  // Day, so it cannot tell "not yet" from "no clock at all".
  if (!combDaylightArmed) { combDaylightArmed = true; combStartDaylight(); }
  // Daylight is armed HERE, not at turn begin, and the timestamp is broadcast
  // from the same place it is computed. logic-engine.md § Host-gate screens
  // before timed phases: the host computes endTimestamp at the moment the timed
  // phase begins, never earlier in the flow. Arming it at turn begin would let
  // three other people's Overflow taps eat the active player's clock — and would
  // put the same field in the three separate packets that all reach 'actions'.
  combBroadcast('COMB_ACTIONS_BEGIN', {
    playerIdx: combTurn, endTimestamp: combTurnEndTs, phase: 'actions',
  });
  combRenderMeadow();
}

function combBeginTurn(playerIdx) {
  combStopDaylight();
  combStopFlight();
  combClearOffer();
  combTurn   = playerIdx;
  combTurnNo += 1;
  combPhase  = 'roll';
  combRoll   = null;
  combInstinctPlayedThisTurn = false;
  combDaylightArmed = false;             // re-armed on entering 'actions'
  combFreeWalls     = 0;                 // an unspent Comb Rush does not carry
  combBuildPickerOpen = false;
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  // Accumulators reset LOCALLY and IN THE PAYLOAD, both. The host resets when it
  // builds the turn; a client never does, so it carries the last seven's owed[]
  // forward until a field overwrites it — and the reset value is exactly the one
  // Firebase erases in flight. Both halves are required (logic-engine.md).
  combOverflowOwed  = new Array(combPlayerCount).fill(0);
  combOverflowReady = new Array(combPlayerCount).fill(false);
  combBroadcast('COMB_TURN_BEGIN', {
    turnNo: combTurnNo, playerIdx: combTurn,
    endTimestamp: 0,                       // armed on entering 'actions', see above
    phase: combPhase, instinctPlayedThisTurn: false,
    owed: combOverflowOwed.slice(), ready: combOverflowReady.slice(),
    handCounts: combHandCounts(),
  });
  combRenderMeadow();
  // Cast, then arm. Both halves of the beat start here on the host; a client
  // starts its own from the COMB_TURN_BEGIN applier, at the same point in the
  // same order, so the two devices are showing the same thing.
  combStartFlight();
  combArmScoutFlight();
}

function combEndTurn(playerIdx) {
  if (combPhase !== 'actions') return { ok: false, reason: null };
  if (playerIdx !== combTurn)  return { ok: false, reason: null };
  if (combOffer) return { ok: false, reason: 'Finish the dance first.' };
  // The win is checked at the end of an action taken on the active player's OWN
  // turn and nowhere else (spec §6). Losing Largest Comb on somebody else's turn
  // can drop you below the target; gaining it there does not win you the match.
  if (combCheckWin()) { combFinishMatch(); return { ok: true, won: true }; }
  combBeginTurn((combTurn + 1) % combPlayerCount);
  return { ok: true, won: false };
}

function combClearOffer() {
  if (combOfferTimer) { clearTimeout(combOfferTimer); combOfferTimer = null; }
  combOffer = null;
}

// ── Building on your own turn ─────────────────────────────────────────────

// The non-draft build. combApplyPlace() owns legality, the piece caps, the cost
// deduction and the achievement recompute; this owns the things that only make
// sense once a build has SUCCEEDED — the voice, the log line, and the one SYNC
// that tells the table the board changed.
//
// It exists because COMB_BOARD_UPDATE had no send site: the draft broadcasts
// COMB_DRAFT_STATE and the Wasp broadcasts COMB_WASP_PLACED, but a build made
// during 'actions' went through combApplyPlace and told nobody. Splitting it out
// also gives the COMB_BUILD packet exactly one applier to call, which is what
// keeps a client's build and the host's own identical.
function combBuild(playerIdx, kind, targetIdx) {
  if (combPhase !== 'actions')  return { ok: false, reason: null };
  if (playerIdx !== combTurn)   return { ok: false, reason: null };
  if (kind !== 'wall' && kind !== 'cell' && kind !== 'dome') return { ok: false, reason: null };

  // A Comb Rush pays for the next two walls. Spending the counter here rather
  // than inside combApplyPlace keeps the placement applier ignorant of Instinct
  // cards, and keeps "free" out of the DRAFT path, which has its own exemption.
  const free = (kind === 'wall' && combFreeWalls > 0);
  const res = combApplyPlace(kind, targetIdx, playerIdx, free ? { free: true } : {});
  if (!res.ok) return res;
  if (free) combFreeWalls -= 1;

  combPlay(kind === 'wall' ? 'buildWall' : kind === 'cell' ? 'buildCell' : 'buildDome');
  combLogAppend(combName(playerIdx) + ' built a ' + COMB_PIECE_NAME[kind] + '.');
  combBroadcastBoard();
  return { ok: true };
}

const COMB_PIECE_NAME = { wall: 'Comb Wall', cell: 'Drone Cell', dome: 'Queen Dome' };

// Everything a device needs to redraw the board and the point strip after a
// build, a bank trade or a played Instinct card — counts, never contents.
//
// ⚠️ largestHolder / fiercestHolder are SENT, not recomputed on arrival. Who
// holds Largest Comb is path-dependent (§17-3): two equal 5-chains cannot tell
// you who got there first, so a client that recomputed would hand 4 points to
// whichever seat happens to sort first. chainLen[] travels beside them because
// it is a cache, and a cache is cheaper to send than to rebuild on every seat.
function combBroadcastBoard() {
  const points = [];
  for (let p = 0; p < combPlayerCount; p++) points.push(combPublicPoints(p));
  combBroadcast('COMB_BOARD_UPDATE', {
    nodes: combNodes.map(n => ({ owner: n.owner, level: n.level })),
    edges: combEdges.slice(),
    handCounts: combHandCounts(),
    chainLen: combChainLen.slice(),
    largestHolder: combLargestHolder,
    fiercestHolder: combFiercestHolder,
    points,
    supply: combSupply.slice(),
    freeWalls: combFreeWalls,
  });
}


// ══════════════════════════════════════════════════════════════════════════
// ── The action layer (Step 5, chunk 5) ────────────────────────────────────
// The Waggle Dance, the Meadow's own rates, and the Instinct deck — the seven
// ACTION packets spec §11 declares and chunk 4 listed in COMB_ACTION_PENDING.
//
// The same four rules as the match engine hold here (explicit playerIdx, no
// broadcast off the host, combSetHand/combSetInstinct are the only writers,
// { ok, reason } never a throw), plus one that is this layer's alone:
//
//   ⚠️ RE-VALIDATE, NEVER ESCROW (spec §11 / brief §14c). Between posting an
//      offer and executing it the poster can build with the very resources they
//      offered — and so can the accepter. Escrow would need an unlock path for
//      every abandonment route (timeout, cancel, turn end, Daylight, disconnect,
//      the host quitting) and each one missed is a permanently locked resource
//      found by a player rather than by a harness. One check, at the moment the
//      deal is struck, and no cleanup paths at all.
// ══════════════════════════════════════════════════════════════════════════

// ── The Waggle Dance ──────────────────────────────────────────────────────
//
// TWO SHAPES, ONE OFFER. `to >= 0` is a DIRECTED offer — the deal was sorted out
// loud and only that seat is asked, so their accept IS the deal and a select
// step would be a second tap with no decision in it. `to === -1` is an OPEN
// offer: every other seat answers, the responses accumulate, and the poster then
// picks among whoever said yes. That is COMB_TRADE_SELECT's only reason to
// exist, and it is why the spec's table carries both packets.
//
// ⚠️ responses[] is 0 / 1 / -1, NOT null / true / false. An all-null array is
// erased whole by Firebase and a half-answered one comes back as an object keyed
// by index; `0` is a stored value and [0,0,0] round-trips intact. The reset
// value has to survive the wire, because it travels at exactly that value in
// COMB_TRADE_POSTED (spec §11).
const COMB_RESP_NONE = 0, COMB_RESP_YES = 1, COMB_RESP_NO = -1;

function combNormAmounts(v) {
  return COMB_RES.map((_, i) => Math.max(0, (v && v[i]) | 0));
}

// Who this offer is actually asking. A directed offer asks one seat; an open one
// asks everybody but the poster. ONE reader, so the expiry sweep, the
// all-answered test and the responder guard cannot disagree about the audience.
function combOfferAudience() {
  if (!combOffer) return [];
  const out = [];
  for (let p = 0; p < combPlayerCount; p++) {
    if (p === combOffer.from) continue;
    if (combOffer.to >= 0 && p !== combOffer.to) continue;
    out.push(p);
  }
  return out;
}
function combOfferAllAnswered() {
  if (!combOffer) return false;
  return combOfferAudience().every(p => combOffer.responses[p] !== COMB_RESP_NONE);
}
function combOfferAccepters() {
  if (!combOffer) return [];
  return combOfferAudience().filter(p => combOffer.responses[p] === COMB_RESP_YES);
}

function combPostOffer(playerIdx, to, give, want) {
  if (combPhase !== 'actions') return { ok: false, reason: null };
  if (playerIdx !== combTurn)  return { ok: false, reason: null };
  if (combOffer) return { ok: false, reason: 'One dance at a time.' };
  const g = combNormAmounts(give), w = combNormAmounts(want);
  if (!g.some(v => v) || !w.some(v => v)) return { ok: false, reason: 'A dance needs both sides.' };
  if (!combCanAfford(playerIdx, g)) return { ok: false, reason: 'You have not got that to give.' };
  const t = (typeof to === 'number' && to >= 0 && to < combPlayerCount && to !== playerIdx) ? to : -1;

  combClearOffer();                          // defensive: never stack two timers
  combOffer = {
    from: playerIdx, to: t, give: g, want: w,
    responses: new Array(combPlayerCount).fill(COMB_RESP_NONE),
    expiresAt: 0,
  };
  // The 10 s auto-decline is FULL DANCE only (spec §8) and is HOST-OWNED, exactly
  // like Daylight: the authority computes the deadline and is the only device
  // that acts on it. A client renders the same countdown off the same timestamp
  // and does nothing when it reaches zero — two devices firing the expiry would
  // resolve one offer twice.
  if (combWaggle === 'full' && combIsAuthority()) {
    combOffer.expiresAt = Date.now() + COMB_OFFER_MS;
    combOfferTimer = setTimeout(combOfferExpire, COMB_OFFER_MS);
  }
  combPlay('tradeArrives');
  combLogAppend(combName(playerIdx) + ' started a Waggle Dance.');
  // An offer is a public announcement, and its contents being on the public
  // channel is the point of making one — it says what the poster is willing to
  // part with, never what else they are holding.
  combBroadcast('COMB_TRADE_POSTED', {
    from: playerIdx, to: t, give: g.slice(), want: w.slice(),
    expiresAt: combOffer.expiresAt,
    responses: combOffer.responses.slice(),   // at its reset value, explicitly
  });
  combRenderMeadow();
  return { ok: true };
}

function combRespondOffer(playerIdx, accept) {
  if (!combOffer) return { ok: false, reason: null };
  if (combOfferAudience().indexOf(playerIdx) < 0) return { ok: false, reason: null };
  if (combOffer.responses[playerIdx] !== COMB_RESP_NONE) return { ok: false, reason: null };
  combOffer.responses[playerIdx] = accept ? COMB_RESP_YES : COMB_RESP_NO;

  // A directed offer has exactly one possible partner: the accept IS the deal.
  if (accept && combOffer.to >= 0) return combExecuteTrade(playerIdx);

  combBroadcast('COMB_TRADE_RESPONSES', { responses: combOffer.responses.slice() });
  // Everyone has answered and nobody said yes — resolve it here rather than leave
  // a dead offer sitting there blocking End Turn until Daylight runs out.
  if (combOfferAllAnswered() && !combOfferAccepters().length) {
    return combOfferAbandon('Nobody took the dance.');
  }
  combRenderMeadow();
  return { ok: true };
}

function combSelectPartner(playerIdx, partnerIdx) {
  if (!combOffer) return { ok: false, reason: null };
  if (playerIdx !== combOffer.from) return { ok: false, reason: null };
  if (combOfferAccepters().indexOf(partnerIdx) < 0) return { ok: false, reason: 'They have not said yes.' };
  return combExecuteTrade(partnerIdx);
}

function combCancelOffer(playerIdx) {
  if (!combOffer) return { ok: false, reason: null };
  if (playerIdx !== combOffer.from) return { ok: false, reason: null };
  return combOfferAbandon('The dance was called off.');
}

// Every way an offer ends WITHOUT a trade, in one place — declined by everyone,
// timed out, or called off. One send site for the failure half of
// COMB_TRADE_RESOLVED means a route added later cannot forget to tell the table.
function combOfferAbandon(reason) {
  if (!combOffer) return { ok: false, reason: null };
  const from = combOffer.from;
  combClearOffer();
  combPlay('tradeFailed');
  combLogAppend(combName(from) + ' found no partner.');
  combBroadcast('COMB_TRADE_RESOLVED', {
    a: from, b: -1, ok: false, reason, handCounts: combHandCounts(),
  });
  combRenderMeadow();
  return { ok: true, abandoned: true };
}

// HOST ONLY — armed in combPostOffer under Full Dance. A seat that has not
// answered when the music stops has declined: one silent player must not stall
// the table. If somebody DID accept, the offer stays open and the poster picks
// from a now-complete set of answers; the timer's job was the stall, not the
// choice.
function combOfferExpire() {
  combOfferTimer = null;
  if (!combOffer) return;
  combOfferAudience().forEach(p => {
    if (combOffer.responses[p] === COMB_RESP_NONE) combOffer.responses[p] = COMB_RESP_NO;
  });
  if (!combOfferAccepters().length) { combOfferAbandon('Nobody took the dance.'); return; }
  combOffer.expiresAt = 0;
  combBroadcast('COMB_TRADE_RESPONSES', { responses: combOffer.responses.slice() });
  combRenderMeadow();
}

// THE one place resources move between two players. Both sides are re-validated
// HERE and nowhere else (spec §11): the poster may have spent their give since
// posting, and the accepter may have spent their want since accepting.
function combExecuteTrade(partnerIdx) {
  const offer = combOffer;
  if (!offer) return { ok: false, reason: null };
  const a = offer.from, b = partnerIdx;
  if (!combTradeStillValid(offer, b)) {
    combClearOffer();
    combPlay('tradeFailed');
    combLogAppend('A dance fell through.');
    combBroadcast('COMB_TRADE_RESOLVED', {
      a, b, ok: false, reason: "That deal's gone stale.", handCounts: combHandCounts(),
    });
    combRenderMeadow();
    return { ok: false, reason: "That deal's gone stale." };
  }
  const ha = (combHands[a] || [0, 0, 0, 0, 0]).slice();
  const hb = (combHands[b] || [0, 0, 0, 0, 0]).slice();
  for (let i = 0; i < COMB_RES.length; i++) {
    ha[i] += offer.want[i] - offer.give[i];
    hb[i] += offer.give[i] - offer.want[i];
  }
  combSetHand(a, ha);
  combSetHand(b, hb);
  combClearOffer();
  combPlay('tradeAccepted');
  combLogAppend(combName(a) + ' and ' + combName(b) + ' struck a deal.');
  combBroadcast('COMB_TRADE_RESOLVED', {
    a, b, ok: true, reason: '', handCounts: combHandCounts(),
  });
  combRenderMeadow();
  return { ok: true, a, b };
}

// ── The Meadow's own rates ────────────────────────────────────────────────
// No negotiating and no waiting. The rate comes from combBankRate(), which is
// also what the rate rows render, so the price shown and the price charged are
// one number rather than two that can drift.
function combBankTrade(playerIdx, giveIdx, wantIdx) {
  if (combPhase !== 'actions') return { ok: false, reason: null };
  if (playerIdx !== combTurn)  return { ok: false, reason: null };
  if (!(giveIdx >= 0 && giveIdx < COMB_RES.length)) return { ok: false, reason: null };
  if (!(wantIdx >= 0 && wantIdx < COMB_RES.length)) return { ok: false, reason: null };
  if (giveIdx === wantIdx) return { ok: false, reason: null };
  const rate = combBankRate(playerIdx, giveIdx);
  const hand = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice();
  if ((hand[giveIdx] | 0) < rate) return { ok: false, reason: null };   // §7: the row is dimmed
  // Limited Bounty means the meadow can genuinely be out of what you are asking
  // for. combDrawFromSupply returns what it could actually pay, so a dry meadow
  // refuses the trade rather than minting a resource the board does not have.
  const got = combDrawFromSupply(COMB_RES.map((_, i) => (i === wantIdx ? 1 : 0)));
  if (!got[wantIdx]) return { ok: false, reason: 'The meadow has none of that left.' };
  hand[giveIdx] -= rate;
  hand[wantIdx] += 1;
  combSetHand(playerIdx, hand);
  combReturnToSupply(COMB_RES.map((_, i) => (i === giveIdx ? rate : 0)));
  combPlay('tradeAccepted');
  // Contentless on purpose. A bank trade's resources are arguably public, but the
  // log's structural guard is "composed only from a value that also travels in a
  // public SYNC" — and COMB_BOARD_UPDATE carries counts, never kinds.
  combLogAppend(combName(playerIdx) + ' traded with the meadow.');
  combBroadcastBoard();
  combRenderMeadow();
  return { ok: true, rate };
}

// The Meadow's stock, for the two things that take FROM it: a bank trade and a
// Spring Bloom. The inverse of combReturnToSupply, and it can come up short —
// Limited Bounty means the meadow really does run dry.
function combDrawFromSupply(want) {
  const got = COMB_RES.map(() => 0);
  for (let i = 0; i < COMB_RES.length; i++) {
    const asked = want[i] | 0;
    if (asked <= 0) continue;
    if (combBounty !== 'limited') { got[i] = asked; continue; }
    const have = Math.max(0, combSupply[i] | 0);
    got[i] = Math.min(asked, have);
    combSupply[i] = have - got[i];
  }
  return got;
}

// ── The Instinct deck ─────────────────────────────────────────────────────

// The public half of the Instinct collections — how many UNPLAYED cards each
// seat holds. A count, never a kind: what is in a collection is the whole thing
// the private channel exists to protect, and Golden Nectar is why.
function combInstinctCounts() {
  const out = [];
  for (let p = 0; p < combPlayerCount; p++) {
    out.push((combInstinct[p] || []).filter(c => !c.played).length);
  }
  return out;
}

function combBuyInstinct(playerIdx) {
  if (combPhase !== 'actions') return { ok: false, reason: null };
  if (playerIdx !== combTurn)  return { ok: false, reason: null };
  if (!combDeck.length) return { ok: false, reason: 'The instinct deck is empty.' };
  if (!combCanAfford(playerIdx, COMB_COSTS.instinct)) return { ok: false, reason: null };

  const hand = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice();
  for (let i = 0; i < COMB_RES.length; i++) hand[i] -= COMB_COSTS.instinct[i];
  combSetHand(playerIdx, hand);
  combReturnToSupply(COMB_COSTS.instinct);

  const kind = combDeck.pop();
  combSetInstinct(playerIdx, (combInstinct[playerIdx] || []).concat([
    { kind, boughtTurn: combTurnNo, played: false },
  ]));
  combPlay('instinctBought');
  // ⚠️ The KIND is in no public field of anything below. The buyer learns what
  // they drew from the private COMB_INSTINCT_SYNC that combSetInstinct() has
  // already sent them; the table learns only that the stack got shorter.
  combLogAppend(combName(playerIdx) + ' followed an instinct.');
  combBroadcast('COMB_INSTINCT_BOUGHT', {
    playerIdx, deckLeft: combDeck.length,
    instinctCounts: combInstinctCounts(), handCounts: combHandCounts(),
  });
  combRenderMeadow();
  return { ok: true, kind };
}

// One card a turn, never the turn it was bought, and never Golden Nectar.
//
// ⚠️ VALIDATE THE PARAMS BEFORE SPENDING THE CARD. A Spring Bloom played with a
// malformed pick, or a Pheromone with no resource named, must not consume the
// card AND the turn's one play — a device that sent a bad payload gets a private
// COMB_FULL_STATE and can try again with the card still in hand.
function combPlayInstinct(playerIdx, cardIdx, params) {
  if (combPhase !== 'actions') return { ok: false, reason: null };
  if (playerIdx !== combTurn)  return { ok: false, reason: null };
  if (combInstinctPlayedThisTurn) return { ok: false, reason: 'One instinct a turn.' };
  const cards = combInstinct[playerIdx] || [];
  const card = cards[cardIdx];
  if (!card || card.played) return { ok: false, reason: null };
  // Golden Nectar has no play affordance anywhere in the UI (spec §7). This is
  // the packet-layer half of the same rule, for a payload that names it anyway.
  if (card.kind === 'golden') return { ok: false, reason: null };
  if (card.boughtTurn === combTurnNo) return { ok: false, reason: "That one's still settling in." };

  const prm = params || {};
  let picks = null, resIdx = -1;
  if (card.kind === 'bloom') {
    picks = combWireArr(prm.picks, 2, -1).map(v => v | 0);
    if (picks.some(i => i < 0 || i >= COMB_RES.length)) {
      return { ok: false, reason: 'Pick two from the meadow.' };
    }
  }
  if (card.kind === 'pheromone') {
    resIdx = (typeof prm.resIdx === 'number') ? (prm.resIdx | 0) : -1;
    if (resIdx < 0 || resIdx >= COMB_RES.length) return { ok: false, reason: 'Name a resource first.' };
  }

  // Spent. Everything below this line is already validated, so the card and the
  // turn's one play are never consumed by an effect that then refuses.
  combSetInstinct(playerIdx, cards.map((c, i) =>
    (i === cardIdx ? { kind: c.kind, boughtTurn: c.boughtTurn, played: true } : c)));
  combInstinctPlayedThisTurn = true;

  const effect = { kind: card.kind };
  let nextPhase = 'actions';

  if (card.kind === 'guard') {
    combGuardsPlayed[playerIdx] = (combGuardsPlayed[playerIdx] | 0) + 1;
    combRecomputeAchievements();
    effect.guardsPlayed = combGuardsPlayed.slice();
    nextPhase = 'waspMove';
  } else if (card.kind === 'rush') {
    // Two Comb Walls, free and immediately. Held as a counter the build applier
    // spends rather than as two forced placements: a player with nowhere legal to
    // put the second wall is not stuck, and combBeginTurn drops whatever is left.
    combFreeWalls += 2;
    // NOT carried in effect{}: COMB_BOARD_UPDATE, right behind this packet, is
    // the counter's one carrier — it has to be, because a client must also see
    // the counter go DOWN as each free wall is spent.
  } else if (card.kind === 'bloom') {
    const want = COMB_RES.map(() => 0);
    picks.forEach(i => { want[i] += 1; });
    const got = combDrawFromSupply(want);
    const hand = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice();
    for (let i = 0; i < COMB_RES.length; i++) hand[i] += got[i];
    combSetHand(playerIdx, hand);
    effect.took = got.reduce((a, b) => a + b, 0);
  } else if (card.kind === 'pheromone') {
    // Public by construction: every other player watches their own hand shrink,
    // so naming the resource is not a leak — it IS the card.
    let moved = 0;
    const mine = (combHands[playerIdx] || [0, 0, 0, 0, 0]).slice();
    for (let q = 0; q < combPlayerCount; q++) {
      if (q === playerIdx) continue;
      const h = (combHands[q] || [0, 0, 0, 0, 0]).slice();
      const take = h[resIdx] | 0;
      if (!take) continue;
      h[resIdx] = 0;
      combSetHand(q, h);
      mine[resIdx] += take;
      moved += take;
    }
    combSetHand(playerIdx, mine);
    effect.resIdx = resIdx;
    effect.moved  = moved;
  }

  combPlay(card.kind === 'guard' ? 'instinctGuard' : 'instinctPlayed');
  combLogAppend(combName(playerIdx) + ' played ' + COMB_INSTINCT_NAME[card.kind] + '.');
  combBroadcast('COMB_INSTINCT_PLAYED', {
    playerIdx, kind: card.kind, effect, phase: nextPhase,
    instinctCounts: combInstinctCounts(), handCounts: combHandCounts(),
  });
  // The board packet carries the holders, the chains, the points and the supply.
  // A Guard Bee can move Fiercest Guard and a Spring Bloom can drain the meadow,
  // and neither is something a client may re-derive (§17-3).
  combBroadcastBoard();

  if (nextPhase === 'waspMove') { combEnterWaspMove(); return { ok: true, kind: card.kind }; }
  combRenderMeadow();
  return { ok: true, kind: card.kind };
}

// ── Daylight ──────────────────────────────────────────────────────────────
// Host-owned: the authority computes endTimestamp and is the only device that
// ACTS on expiry. A client renders the same countdown off the same timestamp and
// does nothing when it hits zero (spec §11; GTH's GTH_PHASE2_BEGIN is the suite
// reference). Two devices both firing the expiry would end two turns.

// The AUTHORITY computes the deadline. Two entry points, one body, so the
// client's countdown can never be a second computation of the same number.
function combStartDaylight() {
  const ms = combDaylightMs();
  combStartDaylightAt(ms ? Date.now() + ms : 0);   // All Day: no clock, no timer
}

// A client arms the SAME deadline the host sent in COMB_ACTIONS_BEGIN rather
// than adding combDaylightMs() to its own clock — two devices starting a
// 60-second turn a packet apart would otherwise disagree by that packet.
function combStartDaylightAt(ts) {
  combStopDaylight();
  // ⚠️ Number(), never `| 0`. A ms timestamp is ~1.7e12 and `| 0` truncates it to
  // 32 bits — 1700000060000 comes back as -806989216, a deadline in 1944.
  combTurnEndTs = Number(ts) || 0;
  if (!combTurnEndTs) return;
  combTurnTimer = setInterval(combDaylightTick, 1000);
}

function combStopDaylight() {
  if (combTurnTimer) { clearInterval(combTurnTimer); combTurnTimer = null; }
  combTurnEndTs = 0;
}

function combDaylightTick() {
  if (!combTurnEndTs) { combStopDaylight(); return; }
  const left = combTurnEndTs - Date.now();
  if (left <= 0) { combDaylightExpire(); return; }
  if (left <= 10000 && combLocalIdx() === combTurn) combPlay('daylightTick');
  if (combPhase === 'actions') combRenderMeadow();
}

function combDaylightExpire() {
  combStopDaylight();
  combPlay('daylightOver');
  if (!combIsAuthority() || combPhase !== 'actions') { combRenderMeadow(); return; }
  combClearOffer();                          // an open offer must not block the auto-end
  combLogAppend(combName(combTurn) + ' ran out of daylight.');
  combEndTurn(combTurn);
}

// ── The end of the season ─────────────────────────────────────────────────

function combStandings() {
  const rows = [];
  for (let p = 0; p < combPlayerCount; p++) {
    rows.push({ idx: p, name: combName(p),
                publicPoints: combPublicPoints(p), truePoints: combTruePoints(p) });
  }
  rows.sort((a, b) => b.truePoints - a.truePoints || a.idx - b.idx);
  return rows;
}

function combGoldenCounts() {
  const out = [];
  for (let p = 0; p < combPlayerCount; p++) {
    out.push((combInstinct[p] || []).filter(c => c.kind === 'golden').length);
  }
  return out;
}

function combFinishMatch() {
  combStopDaylight();
  combStopFlight();
  combClearOffer();
  combPhase = 'gameover-pending';
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  combPlay('win');
  combLogAppend(combName(combTurn) + ' finished the season on ' + combTruePoints(combTurn) + '.');
  // ⚠️ THE ONE MOMENT hidden information becomes public (spec §11). Every
  // player's Golden Nectar count travels here and nowhere else in the match —
  // and even here, no hand contents and no unplayed Instinct kinds.
  combGameover = {
    standings: combStandings(),
    goldenNectar: combGoldenCounts(),
    stats: { scoutFlights: combStats.scoutFlights, waspLandings: combStats.waspLandings },
    largestHolder: combLargestHolder, fiercestHolder: combFiercestHolder,
  };
  combBroadcast('COMB_GAMEOVER', combGameover);
  combShowGameover();
}

// ── Palette ───────────────────────────────────────────────────────────────
// Player index -> colour, from the mockups. Two of the four collide with ground
// they sit on (green on the three green-based hexes, gold on Sunlit Rock's
// amber) — closed NOT by reworking the palette but by one rule applied to every
// piece: a dark contour plus a light top rim (spec §10). A consistent outline
// separates all four player colours from all six hex kinds at once, which is
// what a per-colour fix cannot do.
const COMB_PLAYER_COLOUR = ['#F0A500', '#2E6DB4', '#3E8E41', '#C0392B']; // gold blue green red
const COMB_PLAYER_LABEL  = ['Gold', 'Blue', 'Green', 'Red'];
const COMB_PIECE_INK     = '#2B2118';   // the dark contour, every piece
const COMB_PIECE_RIM     = 'rgba(255,255,255,0.55)';

// Each kind gets its OWN base tone. In the first mockup pass grove, blossom and
// clover all sat on green; production resolves BY HEX KIND, so misreading one
// costs a player resources they were owed (spec §10 / §17-13). These are the
// canvas fallback tones — real art overrides them through the seam.
const COMB_HEX_BASE = {
  grove:   '#4A7C3F',   // deep green — the one kind that keeps green
  blossom: '#B2568E',   // pollen pink
  clover:  '#E0B830',   // sunflower yellow
  rock:    '#B98A52',   // honey amber, darker than clover so the two separate
  nursery: '#7B4FA8',   // iridescent purple
  smoke:   '#7A736C',   // muted grey-brown
};
const COMB_HEX_WALL = {   // the extruded side, always a shade under the top face
  grove: '#31562A', blossom: '#7B3A62', clover: '#A07F14',
  rock: '#8A6537', nursery: '#553577', smoke: '#564F49',
};
const COMB_RES_COLOUR = {
  resin: '#B5651D', wax: '#F5E6C8', pollen: '#E87DB0', nectar: '#FFC72C', jelly: '#8E5BC4',
};
const COMB_INSTINCT_NAME = {
  guard: 'Guard Bee', golden: 'Golden Nectar', rush: 'Comb Rush',
  bloom: 'Spring Bloom', pheromone: 'Pheromone Dominance',
};
const COMB_INSTINCT_TEXT = {
  guard:     'Move the Wasp, and rob someone touching its new hex. Counts toward Fiercest Guard.',
  golden:    'One hidden Hive Point. Never played — it just counts at the end.',
  rush:      'Build two Comb Walls, free, right now.',
  bloom:     'Take any two resources from the Meadow.',
  pheromone: 'Name a resource. Every other player hands you all of theirs.',
};
const COMB_INSTINCT_EMOJI = {
  guard: '\u{1F41D}', golden: '\u{1F36F}', rush: '\u{1F3D7}️',
  bloom: '\u{1F33B}', pheromone: '\u{1F4A8}',
};
const COMB_RES_EMOJI = {
  resin: '\u{1F536}', wax: '⬢', pollen: '\u{1F338}', nectar: '\u{1F4A7}', jelly: '\u{1F7E3}',
};

// ── Render seams (Step 5) — never build these primitives anywhere else ────
// Seam contract, all four: ask assetFace first, fall back to a drawn face. A
// bypass is unskinnable AND invisible to the How-to gallery, which is what makes
// the gallery double as the offline install check (DYB's old cup-die bypass is
// the cautionary case).

function combRenderHex(kind, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  const url = (typeof assetFace === 'function') && assetFace('comb-hex', kind);
  if (url) {
    el.className = 'comb-hex-tile comb-hex-asset';
    el.style.backgroundImage = 'url("' + url + '")';
  } else {
    el.className = 'comb-hex-tile';
    el.style.background = COMB_HEX_BASE[kind] || '#8A8A8A';
    el.innerHTML = '<span class="comb-hex-emoji">' + (COMB_HEX_EMOJI[kind] || '') + '</span>';
  }
  if (opts.label !== false) {
    const nm = document.createElement('span');
    nm.className = 'comb-hex-name';
    nm.textContent = COMB_HEX_NAME[kind] || kind;
    el.appendChild(nm);
  }
  el.dataset.combRefId = kind;
  return el;
}

// FOUR surfaces — hand, cost line, trade offer, discard picker — so this is the
// seam most likely to drift if any one of them is built inline. Shape is a
// REQUIRED property, not decoration: colour alone fails under deuteranopia, and
// the first art pass drew Resin and Nectar as the same droplet in adjacent hues
// (spec §10 / §17-15).
function combRenderResource(kind, opts) {
  opts = opts || {};
  const el = document.createElement('span');
  const url = (typeof assetFace === 'function') && assetFace('comb-res', kind);
  // .small is the gameplay size (hand row, live cost previews). .big/.cost are
  // How-to-gallery-only — see css/styles.css: a reference list has none of the
  // "five chips share a build's row" space pressure gameplay does, and needs to
  // actually show the shape at a glance.
  el.className = 'comb-res-chip'
    + (opts.small ? ' comb-res-small' : '')
    + (opts.big ? ' comb-res-big' : '')
    + (opts.cost ? ' comb-res-cost' : '');
  if (url) {
    const img = document.createElement('span');
    img.className = 'comb-res-icon comb-res-asset';
    img.style.backgroundImage = 'url("' + url + '")';
    el.appendChild(img);
  } else {
    const ic = document.createElement('span');
    // The shape class is what carries the accessibility guarantee — never drop
    // it in favour of colour alone.
    ic.className = 'comb-res-icon comb-res-shape-' + (COMB_RES_SHAPE[kind] || 'sphere');
    ic.style.background = COMB_RES_COLOUR[kind] || '#999';
    ic.textContent = '';
    el.appendChild(ic);
  }
  if (opts.count !== undefined) {
    const c = document.createElement('span');
    c.className = 'comb-res-count';
    c.textContent = String(opts.count);
    el.appendChild(c);
  }
  if (opts.label) {
    const n = document.createElement('span');
    n.className = 'comb-res-name';
    n.textContent = COMB_RES_NAME[kind] || kind;
    el.appendChild(n);
  }
  el.dataset.combRefId = kind;
  el.title = COMB_RES_NAME[kind] || kind;
  return el;
}

function combRenderInstinct(kind, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  if (opts.faceDown) {
    const back = (typeof assetBack === 'function') && assetBack('comb-instinct');
    el.className = back ? 'comb-card comb-card-asset' : 'comb-card comb-card-back';
    if (back) el.style.backgroundImage = 'url("' + back + '")';
    return el;
  }
  const url = (typeof assetFace === 'function') && assetFace('comb-instinct', kind);
  if (url) {
    el.className = 'comb-card comb-card-asset';
    el.style.backgroundImage = 'url("' + url + '")';
  } else {
    el.className = 'comb-card comb-card-' + kind;
    el.innerHTML =
      '<span class="comb-card-emoji">' + (COMB_INSTINCT_EMOJI[kind] || '') + '</span>' +
      '<span class="comb-card-name">' + (COMB_INSTINCT_NAME[kind] || kind) + '</span>';
  }
  el.dataset.combRefId = kind;
  return el;
}

// The ONE seam with two asset sets: `comb-piece` is the simplified 30 px board
// set, `comb-piece-hero` the ornate gallery set, resolved when opts.hero is set.
// Same ids in both, so the gallery and the board can never disagree about WHAT a
// piece is — only how much detail it shows.
function combRenderPiece(kind, playerIdx, opts) {
  opts = opts || {};
  const el = document.createElement('span');
  const id = kind + '-' + playerIdx;
  const url = (typeof assetFace === 'function') &&
              assetFace(opts.hero ? 'comb-piece-hero' : 'comb-piece', id);
  // .comb-piece-hero is its own SQUARE box (css/styles.css) and must come
  // after comb-piece-<kind> in the class list so it overrides wall's thin
  // strip / cell-dome's hex clip regardless of rule order (two classes beats one).
  const heroCls = opts.hero ? ' comb-piece-hero' : '';
  if (url) {
    el.className = 'comb-piece comb-piece-asset comb-piece-' + kind + heroCls;
    el.style.backgroundImage = 'url("' + url + '")';
  } else {
    el.className = 'comb-piece comb-piece-' + kind + heroCls;
    el.style.background = COMB_PLAYER_COLOUR[playerIdx] || '#888';
    el.style.borderColor = COMB_PIECE_INK;   // the dark contour, every piece
  }
  el.dataset.combRefId = id;
  return el;
}

// The FIFTH seam: the Sun Compass, the 2d6 die the game casts each turn. Its
// two ids live in one `comb-die` pack — `die` is blank and ships in the roll,
// `die-numbered` carries engraved faces and is the How-to reference tile. The
// number is a DOM child this seam appends, never painted into the art, for the
// same reason as the pogs and CJAR's cookie values: the game already knows it,
// and a baked digit cannot be skinned or localised
// (art-authoring-guide.md § "Don't paint in text the game already draws").
// ⚠️ The face element is stashed on the node as `.combFaceEl` rather than found
// again with querySelector — a mock DOM's querySelector returns null, and the
// flight loop must not depend on one to write the number it just revealed.
function combRenderDie(opts) {
  opts = opts || {};
  const id  = opts.numbered ? 'die-numbered' : 'die';
  const el  = document.createElement('div');
  const url = (typeof assetExtra === 'function') && assetExtra('comb-die', id);
  if (url) {
    el.className = 'comb-die comb-die-asset';
    el.style.backgroundImage = 'url("' + url + '")';
  } else {
    // The fallback is a drawn orb, not an emoji: a die is the one primitive
    // whose whole job is to be a round thing that spins, and 🎲 is a cube.
    el.className = 'comb-die comb-die-drawn';
  }
  if (opts.hero) el.classList.add('comb-die-hero');
  const face = document.createElement('span');
  face.className = 'comb-die-face';
  face.textContent = (opts.face === undefined || opts.face === null) ? '' : String(opts.face);
  el.appendChild(face);
  el.combFaceEl = face;
  el.dataset.combRefId = id;
  return el;
}

const COMB_HEX_EMOJI = {
  grove: '\u{1F332}', blossom: '\u{1F338}', clover: '\u{1F33B}',
  rock: '\u{1FAA8}', nursery: '\u{1F36F}', smoke: '\u{1F32B}️',
};

// ── Screen transitions + rendering ────────────────────────────────────────
// The navigation half was settled before any of it depended on match state
// existing, which is why these stayed thin: combShowMeadow hands off to
// combRenderMeadow, and combShowGameover renders a payload built elsewhere.
function combShowMenu()          { showScreen('screen-comb-menu'); }
function combShowClientStandby() { showScreen('screen-comb-standby'); }
function combShowMeadow()        { showScreen('screen-comb-meadow'); }
// The Hive is Thriving — podium + Golden Nectar reveal + stats (spec §3/§6).
// combGameover is fully populated (standings, goldenNectar, stats, both
// achievement holders) by combFinishMatch() on the host and by the
// COMB_GAMEOVER applier on every client BEFORE this is ever called, so
// there is nothing here but rendering it.
function combShowGameover() {
  const g = combGameover;
  if (g) {
    const winner = g.standings[0];
    combSet('comb-go-sub', winner
      ? (winner.name + ' brought the strongest hive home.')
      : '');

    const pod = combClear('comb-podium');
    if (pod) {
      g.standings.forEach((row, rank) => {
        const top = rank === 0;
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm '
          + (top ? 'bg-[#FCE9A8]' : 'bg-white');
        const left = document.createElement('span');
        left.className = 'flex items-center gap-2 text-sm font-semibold text-stone-800';
        // DD-30 pattern (ui-style § Gameover podium rank icons) — a medal in a
        // FIXED-WIDTH slot on every row, blank past 3rd, so every row's text
        // lines up regardless of rank.
        const medal = document.createElement('span');
        medal.className = 'comb-medal-slot';
        medal.textContent = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
        const label = document.createElement('span');
        label.textContent = row.name;
        left.appendChild(medal); left.appendChild(label);

        const right = document.createElement('span');
        right.className = 'text-sm font-bold text-stone-600';
        const nectar = g.goldenNectar[row.idx] || 0;
        // The reveal: truePoints already carries the hidden Golden Nectar, but
        // naming the count is the whole point of the beat (spec §17's "the one
        // beat this screen must land").
        right.textContent = row.truePoints + ' Hive Point' + (row.truePoints === 1 ? '' : 's')
          + (nectar ? ` (${nectar} Golden Nectar)` : '');
        div.appendChild(left); div.appendChild(right);
        pod.appendChild(div);
      });
    }

    const stats = combClear('comb-go-stats');
    if (stats) {
      const addLine = t => {
        const p = document.createElement('p');
        p.className = 'text-stone-400 text-xs text-center';
        p.textContent = t;
        stats.appendChild(p);
      };
      addLine(g.stats.scoutFlights + ' Scout Flight' + (g.stats.scoutFlights === 1 ? '' : 's') + ' cast this season.');
      if (g.stats.waspLandings) addLine('The Wasp landed ' + g.stats.waspLandings + ' time' + (g.stats.waspLandings === 1 ? '' : 's') + '.');
      addLine('Largest Comb — ' + (g.largestHolder >= 0 ? combName(g.largestHolder) : 'Unclaimed'));
      addLine('Fiercest Guard — ' + (g.fiercestHolder >= 0 ? combName(g.fiercestHolder) : 'Unclaimed'));
    }
  }
  showScreen('screen-comb-gameover');
}
// ── Small DOM helpers, so "sets every element every time" stays cheap ─────
function combSet(id, text)  { const el = document.getElementById(id); if (el) el.textContent = text; }
function combShow(id, on, disp) { const el = document.getElementById(id); if (el) el.style.display = on ? (disp || 'flex') : 'none'; }
function combEnable(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.disabled = !on;
  el.classList.toggle('comb-btn-off', !on);
}
function combClear(id) { const el = document.getElementById(id); if (el) el.innerHTML = ''; return el; }

// ⚠️ THE ONLY function that writes to screen-comb-meadow, and it sets EVERY
// element EVERY time — including the ones the current phase does not use, which
// it sets to '' or display:none rather than leaving alone. Seven phases share
// this one screen; "leaving the rest alone" would mean showing whatever the
// previous phase last wrote (spec §3, the SHP stale-status-line lesson).
// Phase-specific work goes in pure helpers that RETURN content to this function,
// never in functions that write to the DOM themselves.
function combRenderMeadow() {
  const me = combLocalIdx();
  const mine = combIsMyTurn();
  const names = combPlayerNames;

  // ── Header ──
  const turnName = combName(combTurn);
  combSet('comb-meadow-turn', combPhase === 'draft'
    ? `Opening · ${turnName}`
    : `Turn ${combTurnNo} · ${turnName}`);
  // Points + achievement marks moved off the cramped header line onto the board:
  // the player panel (top) and the player strip (bottom), with the full table
  // in the map overlay.

  // ── Status line: one sentence per phase, always written ──
  combSet('comb-meadow-status', combStatusLine(mine, turnName));

  // ── Daylight ──
  const dayOn = combDaylightMs() > 0 && combPhase === 'actions' && combTurnEndTs > 0;
  combShow('comb-daylight', dayOn, 'block');
  combSet('comb-daylight', dayOn ? combDaylightText() : '');

  // ── Hand row — always repainted from combHands[me], never appended to ──
  const row = combClear('comb-hand-row');
  if (row) {
    const hand = combHands[me] || [0, 0, 0, 0, 0];
    COMB_RES.forEach((kind, i) => {
      const chip = combRenderResource(kind, { count: hand[i], small: true });
      chip.classList.toggle('comb-res-zero', !hand[i]);
      if (typeof bindCardHold === 'function') {
        bindCardHold(chip, () => combOpenHowTo('comb', kind));
      }
      row.appendChild(chip);
    });
    const total = combHandCount(me);
    const limit = combCarryLimit();
    // The carry limit only bites on a 7, so it is shown as a warning, never a block.
    if (limit !== Infinity && total > limit) {
      const warn = document.createElement('span');
      warn.className = 'comb-carry-warn';
      warn.textContent = `${total}/${limit}`;
      warn.title = 'Over the limit — a 7 costs you half.';
      row.appendChild(warn);
    }
  }

  // ── Instinct button ──
  const myCards = (combInstinct[me] || []).filter(c => !c.played);
  combSet('btn-comb-instinct', `Instinct ${myCards.length}`);
  combEnable('btn-comb-instinct', myCards.length > 0);

  // ── Placement bar — visible only in placement mode, cleared otherwise ──
  const placing = !!combPlacementMode;
  combShow('comb-place-bar', placing);
  combSet('comb-place-hint', placing ? combPlaceHint() : '');
  combEnable('btn-comb-place-confirm', placing && combPendingTarget !== null);

  // ── Action bar — hidden while placing OR picking, so the three never compete ──
  combShow('comb-action-bar', !placing && !combBuildPickerOpen, 'grid');
  const acting = mine && combPhase === 'actions' && !placing && !combBuildPickerOpen;
  combEnable('btn-comb-build',    acting && combAnyBuildAffordable(me));
  combEnable('btn-comb-buy',      acting && combCanAfford(me, COMB_COSTS.instinct) && combDeck.length > 0);
  // Live while your own offer is open: that is the poster's way back to the
  // answer board, and the only route to COMB_TRADE_SELECT.
  combEnable('btn-comb-waggle',   acting);
  combSet('btn-comb-waggle', combOffer && combOffer.from === me ? 'The Dance' : 'Waggle Dance');
  combEnable('btn-comb-end-turn', acting && !combOffer);

  // ── Top zone — player panel (was the turn-order dots), persistent roll
  //    result, probability ruler. All float over the board stage's top
  //    letterbox; NOT the Sun Compass (the 2d6 die, its own seam). ──
  combRenderPlayerPanel();
  combRenderRollResult();
  combRenderProbRuler();
  combRenderPlayerStrip();

  // ── The build picker — step 1 of two, and the action bar's sibling ──
  combShow('comb-build-picker', combBuildPickerOpen, 'flex');
  if (combBuildPickerOpen) combRenderBuildPicker();

  // ── Phase-driven overlays ──
  combSyncActionOverlays();

  // ── The board itself ──
  combRepaintBoards();
}

// The three overlays a PHASE opens rather than a tap — the Overflow, the Wasp's
// victim picker, and the Waggle answer board. Driven from the one renderer so
// that host, client and single-device all reach them by the same path, and so
// that a phase leaving them behind closes them.
//
// ⚠️ Each is opened only when it is NOT already up. combOpenOverflow() resets the
// discard picker, and re-running it on every repaint would wipe a selection
// mid-tap — the renderer runs on every packet, not only on phase changes.
function combSyncActionOverlays() {
  const up = id => { const el = document.getElementById(id); return !!(el && el.style.display === 'flex'); };
  const me = combLocalIdx();

  const owes = combPhase === 'overflow' &&
               (combOverflowOwed[me] | 0) > 0 && !combOverflowReady[me];
  if (owes && !up('comb-overflow-overlay')) combOpenOverflow();
  if (!owes && up('comb-overflow-overlay')) combShow('comb-overflow-overlay', false);

  const stealing = combPhase === 'waspSteal' && combIsMyTurn();
  if (stealing && !up('comb-steal-overlay')) combOpenSteal();
  if (!stealing && up('comb-steal-overlay')) combShow('comb-steal-overlay', false);

  // The answer board has nothing left to answer once the offer is gone. The
  // BUILDER half of the same overlay is a different surface and must survive,
  // which is what combTradeLive distinguishes.
  if (!combOffer && combTradeLive && up('comb-trade-overlay')) {
    combShow('comb-trade-overlay', false);
    combTradeLive = false;
  }
  if (!combOffer && up('comb-trade-offer-overlay')) combShow('comb-trade-offer-overlay', false);
}

// Pure helpers — they RETURN content to combRenderMeadow(), and none of them
// touches the DOM. That split is what keeps the single-renderer rule honest.
// Achievements are computed and held authoritatively (combLargestHolder /
// combFiercestHolder) but were only ever shown at gameover. This surfaces the
// CURRENT holder live, as text (no art, no comb-badge seam — spec §10/§8's
// decision 9 Sep). A player holding both gets the one combined medal rather
// than two, which is also what keeps a double-holder from crowding the strip.
function combAchievementMark(p) {
  const hasLargest  = p === combLargestHolder;
  const hasFiercest = p === combFiercestHolder;
  if (hasLargest && hasFiercest) return ' 🏆';
  if (hasLargest)  return ' 🥇';
  if (hasFiercest) return ' 🛡️';
  return '';
}
// ── Meadow top zone — player panel, persistent roll result, probability ruler.
// All three are pure: they RETURN nothing and write only their own element, from
// combRenderMeadow(). Public state only. (combPointStrip() lived here until the
// header point-line was removed 10 Sep 2026 — its job is now split between the
// player panel, the player strip and the map overlay's stats table.)

// Floats over the top-left letterbox. Turn-order colour + name + this round's
// take (combLastProduced, from the public COMB_ROLL_RESULT.produced grid). The
// active row lights up: on a board identical on every phone, this is the
// turn-handover signal (identity doc T7c).
function combRenderPlayerPanel() {
  const box = combClear('comb-player-panel');
  if (!box) return;
  for (let p = 0; p < combPlayerCount; p++) {
    const row = document.createElement('div');
    row.className = 'comb-player-row' + (p === combTurn ? ' comb-player-row-now' : '');

    const dot = document.createElement('span');
    dot.className = 'comb-player-dot';
    dot.style.background = COMB_PLAYER_COLOUR[p] || '#888';
    row.appendChild(dot);

    const name = document.createElement('span');
    name.textContent = combName(p).slice(0, 8);
    row.appendChild(name);

    const take = document.createElement('span');
    take.className = 'comb-player-take';
    const got = (combLastProduced && combLastProduced[p]) || [0, 0, 0, 0, 0];
    if (!got.some(v => v)) {
      take.textContent = '—';                      // em dash: nothing bloomed
    } else {
      COMB_RES.forEach((kind, i) => {
        if (!got[i]) return;
        const n = document.createElement('span');
        n.textContent = got[i] + '×';
        take.appendChild(n);
        take.appendChild(combRenderResource(kind, { small: true }));
      });
    }
    row.appendChild(take);
    box.appendChild(row);
  }
}

// The landed Scout Flight, kept on screen until the next cast clears
// combLastProduced (combStartFlight). The flight animation lands INTO this.
function combRenderRollResult() {
  const el = document.getElementById('comb-roll-result');
  if (!el) return;
  if (!combRoll || combPhase === 'roll' || combPhase === 'draft') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.textContent = String(combRoll);
  el.classList.toggle('comb-roll-result-seven', combRoll === 7);
}

// 2d6 outcomes out of 36 — tick heights and the red→gold rarity ramp.
const COMB_ROLL_FREQ = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
// distance-from-7 (0..5) → tick colour, precomputed so no color-mix() dependency.
const COMB_ROLL_RAMP = ['#B3261E', '#A83A2E', '#9D4F3F', '#8A5A4E', '#77605A', '#6B6157'];

// 11 ticks, 2..12. Pure function of combRoll. Rarity used to live in the pog pip
// row (removed — invisible at board scale); it lives here now, legibly.
function combRenderProbRuler() {
  const box = combClear('comb-prob-ruler');
  if (!box) return;
  if (!combRoll || combPhase === 'roll' || combPhase === 'draft') { box.style.display = 'none'; return; }
  box.style.display = 'flex';
  for (let v = 2; v <= 12; v++) {
    const f = COMB_ROLL_FREQ[v];                        // 1..6
    const tick = document.createElement('span');
    tick.className = 'comb-prob-tick' + (v === combRoll ? ' comb-prob-tick-now' : '');
    tick.style.height = (0.3 + f * 0.18) + 'rem';       // 0.48rem .. 1.38rem
    tick.style.background = COMB_ROLL_RAMP[Math.abs(7 - v)];
    box.appendChild(tick);
  }
}

// ── Meadow bottom zone — the player-stats snapshot. Floats over the board
// stage's bottom letterbox; the full table lives in the map overlay. All public:
// visible VP, structure counts, unplayed Instinct count (combPublicInstinct —
// count, never kind). ──

function combCountStructures(p) {
  let cells = 0, domes = 0, walls = 0;
  for (const nd of combNodes) if (nd && nd.owner === p) { if (nd.level === 2) domes++; else if (nd.level === 1) cells++; }
  for (const e of combEdges) if (e === p) walls++;
  return { cells, domes, walls };
}

function combRenderPlayerStrip() {
  const box = combClear('comb-player-strip');
  if (!box) return;
  for (let p = 0; p < combPlayerCount; p++) {
    const card = document.createElement('div');
    card.className = 'comb-player-card' + (p === combTurn ? ' comb-player-card-now' : '');

    const top = document.createElement('div');
    top.className = 'comb-player-card-top';
    const dot = document.createElement('span');
    dot.className = 'comb-player-dot';
    dot.style.background = COMB_PLAYER_COLOUR[p] || '#888';
    top.appendChild(dot);
    const nm = document.createElement('span');
    nm.textContent = combName(p).slice(0, 9) + combAchievementMark(p);
    top.appendChild(nm);
    const vp = document.createElement('span');
    vp.className = 'comb-player-card-vp';
    vp.textContent = combPublicPoints(p) + ' VP';
    top.appendChild(vp);
    card.appendChild(top);

    const s = combCountStructures(p);
    const inst = (combPublicInstinct && combPublicInstinct[p]) | 0;
    const stats = document.createElement('div');
    stats.className = 'comb-player-card-stats';
    // One labelled pair per stat, dot-separated so a bare number can't read as a
    // range. cell / dome / wall / unplayed Instinct.
    [['⬢', s.cells], ['\u{1F451}', s.domes], ['▬', s.walls], ['\u{1F3B4}', inst]]
      .forEach(([glyph, n], i) => {
        const seg = document.createElement('span');
        seg.className = 'comb-stat-seg';
        seg.textContent = glyph + ' ' + n;
        stats.appendChild(seg);
      });
    card.appendChild(stats);

    box.appendChild(card);
  }
  box.onclick = () => { playDone(); combOpenMap('stats'); };
  box.style.pointerEvents = 'auto';
}

function combStatusLine(mine, turnName) {
  switch (combPhase) {
    case 'draft':
      return mine ? 'Place a Drone Cell, then a Comb Wall beside it.'
                  : `${turnName} is choosing an opening spot.`;
    case 'roll':
      // The 7's outcome packet is a beat behind COMB_ROLL_RESULT; name it rather
      // than flash "waiting to cast" between the two.
      if (combRoll === 7) return 'A seven!';
      return mine ? 'Send the scouts out.' : `Waiting on ${turnName} to cast.`;
    case 'overflow': {
      // Owe-aware: never name a discard the settings do not allow. On Overflow
      // off there is no 'overflow' phase at all — the 7 goes straight to the Wasp.
      const me = combLocalIdx();
      if ((combOverflowOwed[me] | 0) > 0 && !combOverflowReady[me]) {
        return 'A seven. Half of what you are carrying goes back to the meadow.';
      }
      return 'A seven. Waiting on the others to spill.';
    }
    case 'waspMove':
      return mine ? 'Park the Wasp somewhere painful.' : `${turnName} is moving the Wasp.`;
    case 'waspSteal':
      return mine ? 'Pick who the Wasp robs.' : `${turnName} is robbing someone.`;
    case 'actions': {
      if (!mine) return `${turnName} is building.`;
      if (combRoll) return `Scout Flight: ${combRoll}. Build, trade, or end your turn.`;
      return 'Build, trade, or end your turn.';
    }
    case 'gameover-pending': return 'The hive is thriving.';
    default: return '';
  }
}

function combPlaceHint() {
  if (combPendingTarget === null || combPendingTarget === undefined) {
    return { wall: 'Tap a lit edge for your Comb Wall.',
             cell: 'Tap a lit corner for your Drone Cell.',
             dome: 'Tap one of your own cells to crown it.',
             wasp: 'Tap a hex to park the Wasp.' }[combPlacementMode] || '';
  }
  return { wall: 'Wall here?', cell: 'Cell here?', dome: 'Crown this one?', wasp: 'Wasp here?' }[combPlacementMode] || '';
}

function combDaylightText() {
  const left = Math.max(0, Math.ceil((combTurnEndTs - Date.now()) / 1000));
  return `Daylight · ${left}s`;
}

// Read by the Build button's enabled state AND by placement mode's step 1, so
// affordability is asked in exactly one place (single-source rule).
function combAnyBuildAffordable(p) {
  // A Comb Rush makes a wall affordable at zero cost, so the button that opens
  // the picker has to ask the same question the picker's rows answer.
  if (combFreeWalls > 0 && !combAtPieceLimit(p, 'wall')) return true;
  return ['wall', 'cell', 'dome'].some(k =>
    combCanAfford(p, COMB_COSTS[k]) && !combAtPieceLimit(p, k));
}
// ── The board canvas ──────────────────────────────────────────────────────
// ⚠️ THE RULE THAT MAKES 2.5D SAFE: the topology stays FLAT and the slab is
// render-only. combBuildTopology() returns 54 nodes and 72 edges in the flat
// top-face plane; the extrusion exists ONLY below this line. Nothing about node
// ids, adjacency, the Distance Rule, longest-chain traversal, packets or the
// harness is aware the board looks 3-D. Break this and every geometric rule in
// §6/§7 acquires a rendering dependency.
const COMB_WALL_DEPTH = 0.35;    // hex circumradius units (14 px at R = 41.3)
const COMB_SQ3 = Math.sqrt(3);

// Async image cache. A miss draws the fallback face this frame and repaints when
// the image lands — never blocks, never throws on a 404.
const combImgCache = new Map();
function combImg(url) {
  if (!url) return null;
  if (combImgCache.has(url)) return combImgCache.get(url);
  const img = new Image();
  img.onload  = () => { combStaticCache = null; combRepaintBoards(); };
  img.onerror = () => { combImgCache.set(url, null); };
  img.src = url;
  combImgCache.set(url, img);
  return img;
}
function combImgReady(img) { return !!img && img.complete && img.naturalWidth > 0; }

let combStaticCache = null;      // { canvas, key } — layers 1-4, per match + scale

function combBoardBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of COMB_TOPOLOGY.nodes) {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: (maxY - minY) + COMB_WALL_DEPTH };
}

// Fit-to-view for the inline board; the map overlay multiplies by its viewport.
// Returns the unit->pixel transform every draw and every hit-test shares, so the
// two can never disagree about where a node is.
function combTransform(cssW, cssH, viewport) {
  const b = combBoardBounds();
  const pad = 6;
  const base = Math.min((cssW - pad * 2) / b.w, (cssH - pad * 2) / b.h);
  const vp = viewport || { zoom: 1, panX: 0, panY: 0 };
  const R = base * (vp.zoom || 1);
  const offX = (cssW - b.w * R) / 2 - b.minX * R + (vp.panX || 0);
  const offY = (cssH - b.h * R) / 2 - b.minY * R + (vp.panY || 0);
  return { R, offX, offY, toX: x => x * R + offX, toY: y => y * R + offY };
}

function combHexCentre(h) {
  const [q, r] = COMB_AXIAL[h];
  return { x: COMB_SQ3 * (q + r / 2), y: 1.5 * r };
}
function combHexCornerPts(h, tr) {
  const c = combHexCentre(h), pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30);
    pts.push([tr.toX(c.x + Math.cos(a)), tr.toY(c.y + Math.sin(a))]);
  }
  return pts;
}
function combPoly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Layers 1-4 — ground, hex slabs, Trade Blossoms, Bloom Marker pogs. These
// change ONLY at match start, so they are rendered once into an offscreen canvas
// and blitted on every repaint. Without this, ~46 image draws re-run on every
// tap, every Wasp move and every frame of the magnifier's pinch, for a 50-minute
// match. The cache is invalidated on exactly two events: a new deal, and a
// viewport change (a different zoom needs re-rendering at the new scale).
function combBuildStatic(cssW, cssH, tr) {
  const key = [combBoardSeed, combLayout, Math.round(tr.R * 100),
               Math.round(tr.offX), Math.round(tr.offY), cssW, cssH].join('|');
  if (combStaticCache && combStaticCache.key === key) return combStaticCache.canvas;

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(cssW * dpr));
  off.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  // 1. meadow ground
  ctx.fillStyle = '#EAF3DC';
  ctx.fillRect(0, 0, cssW, cssH);

  // 2. hexes, back-to-front by centre y — painter's order, so a hex's wall is
  //    occluded by the row in front and the depth is paid ONCE, not per row.
  const order = combHexes.map((_, h) => h).sort((a, b) => combHexCentre(a).y - combHexCentre(b).y);
  for (const h of order) {
    const hex = combHexes[h];
    if (!hex) continue;
    const c = combHexCentre(h);
    const img = combImg((typeof assetFace === 'function') && assetFace('comb-hex', hex.kind));
    if (combImgReady(img)) {
      // ONE sprite carries top face AND wall (224x304 master, aspect 0.74).
      const w = COMB_SQ3 * tr.R, hgt = (2 + COMB_WALL_DEPTH) * tr.R;
      ctx.drawImage(img, tr.toX(c.x) - w / 2, tr.toY(c.y) - tr.R, w, hgt);
    } else {
      const pts = combHexCornerPts(h, tr);
      const d = COMB_WALL_DEPTH * tr.R;
      // The wall: the three lower edges (corners 1,2,3) extruded down.
      ctx.fillStyle = COMB_HEX_WALL[hex.kind] || '#666';
      combPoly(ctx, [pts[1], pts[2], pts[3],
                     [pts[3][0], pts[3][1] + d], [pts[2][0], pts[2][1] + d], [pts[1][0], pts[1][1] + d]]);
      ctx.fill();
      // The top face.
      ctx.fillStyle = COMB_HEX_BASE[hex.kind] || '#888';
      combPoly(ctx, pts); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // 3. Trade Blossoms on the rim
  for (const port of COMB_TOPOLOGY.ports) {
    const [a, b] = port.nodes;
    const na = COMB_TOPOLOGY.nodes[a], nb = COMB_TOPOLOGY.nodes[b];
    const mx = tr.toX((na.x + nb.x) / 2), my = tr.toY((na.y + nb.y) / 2);
    const img = combImg((typeof assetExtra === 'function') &&
                        assetExtra('comb-blossom', port.kind === 'any' ? 'generic' : port.kind));
    const s = Math.max(16, tr.R * 0.82);
    if (combImgReady(img)) ctx.drawImage(img, mx - s / 2, my - s / 2, s, s);
    else {
      ctx.beginPath(); ctx.arc(mx, my, s / 2, 0, Math.PI * 2);
      ctx.fillStyle = port.kind === 'any' ? '#FFFFFF' : (COMB_RES_COLOUR[port.kind] || '#fff');
      ctx.fill(); ctx.strokeStyle = COMB_PIECE_INK; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = COMB_PIECE_INK;
      ctx.font = `700 ${Math.round(s * 0.38)}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(port.rate + ':1', mx, my);
    }
  }

  // 4. Bloom Marker pogs. TWO images, never ten — the number is drawn in canvas
  //    on top, which is both smaller and sharper than a downscaled bitmap of
  //    "12" at 30 px (spec §10).
  for (let h = 0; h < combHexes.length; h++) {
    const hex = combHexes[h];
    if (!hex || !hex.marker) continue;
    const c = combHexCentre(h);
    const x = tr.toX(c.x), y = tr.toY(c.y);
    const s = Math.max(16, tr.R * 0.72);
    const hot = hex.marker === 6 || hex.marker === 8;
    const img = combImg((typeof assetExtra === 'function') && assetExtra('comb-pog', hot ? 'hot' : 'blank'));
    if (combImgReady(img)) ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    else {
      ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#F7F1E3'; ctx.fill();
      ctx.strokeStyle = COMB_PIECE_INK; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Dark ink on both disc kinds. The hot disc's own red rim carries the "fat
    // marker" signal; cream-on-red was unreadable once real art sat behind it.
    // Rarity is the probability ruler's job now (the pip row was invisible at
    // board scale) — removed.
    ctx.fillStyle = hot ? '#2A1A16' : '#3A322A';
    ctx.font = `700 ${Math.round(s * 0.46)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(hex.marker), x, y);
  }

  combStaticCache = { canvas: off, key, cssW, cssH };
  return off;
}

// PURE in the sense that matters: it takes its target canvas and viewport as
// arguments and draws current state into them. The inline board passes the
// fit-to-view viewport; comb-map-overlay passes its live gesture viewport.
// THERE IS NO SECOND BOARD RENDERER, which is what stops the magnifier becoming
// a second source of board truth (spec §2).
function combDrawBoard(canvasEl, viewport) {
  if (!canvasEl || typeof canvasEl.getContext !== 'function') return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  const rect = canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : { width: 0, height: 0 };
  const cssW = Math.max(1, Math.round(rect.width || canvasEl.width || 1));
  const cssH = Math.max(1, Math.round(rect.height || canvasEl.height || 1));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (canvasEl.width !== Math.round(cssW * dpr) || canvasEl.height !== Math.round(cssH * dpr)) {
    canvasEl.width = Math.round(cssW * dpr);
    canvasEl.height = Math.round(cssH * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (!combHexes.length) return;                 // pre-deal: nothing to draw

  const tr = combTransform(cssW, cssH, viewport);
  const stat = combBuildStatic(cssW, cssH, tr);
  if (stat) ctx.drawImage(stat, 0, 0, cssW, cssH);

  // 5. the Wasp
  if (combWaspHex >= 0 && combWaspHex < combHexes.length) {
    const c = combHexCentre(combWaspHex);
    const x = tr.toX(c.x), y = tr.toY(c.y) - tr.R * 0.42;
    const s = Math.max(18, tr.R * 0.82);
    const img = combImg((typeof assetExtra === 'function') && assetExtra('comb-wasp', 'wasp'));
    if (combImgReady(img)) ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    else {
      ctx.font = `${Math.round(s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F41D}', x, y);
    }
  }

  // 6. Comb Walls, sorted by y
  const wallOrder = [];
  for (let e = 0; e < combEdges.length; e++) if (combEdges[e] !== -1) wallOrder.push(e);
  wallOrder.sort((a, b) => combEdgeMidY(a) - combEdgeMidY(b));
  for (const e of wallOrder) combDrawWall(ctx, e, combEdges[e], tr);

  // 7. Cells and Domes, sorted by y
  const nodeOrder = [];
  for (let n = 0; n < combNodes.length; n++) if (combNodes[n] && combNodes[n].level > 0) nodeOrder.push(n);
  nodeOrder.sort((a, b) => COMB_TOPOLOGY.nodes[a].y - COMB_TOPOLOGY.nodes[b].y);
  for (const n of nodeOrder) combDrawStructure(ctx, n, tr);

  // 8. legal-target glow + the combPendingTarget preview
  if (combPlacementMode) combDrawTargets(ctx, tr);
}

function combEdgeMidY(e) {
  const [a, b] = COMB_TOPOLOGY.nodesOfEdge[e];
  return (COMB_TOPOLOGY.nodes[a].y + COMB_TOPOLOGY.nodes[b].y) / 2;
}

function combDrawWall(ctx, e, owner, tr) {
  const [a, b] = COMB_TOPOLOGY.nodesOfEdge[e];
  const na = COMB_TOPOLOGY.nodes[a], nb = COMB_TOPOLOGY.nodes[b];
  const x1 = tr.toX(na.x), y1 = tr.toY(na.y), x2 = tr.toX(nb.x), y2 = tr.toY(nb.y);
  const img = combImg((typeof assetFace === 'function') && assetFace('comb-piece', 'wall-' + owner));
  if (combImgReady(img)) {
    const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    ctx.save();
    ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); ctx.rotate(ang);
    ctx.drawImage(img, -len / 2, -tr.R * 0.10, len, tr.R * 0.20);
    ctx.restore();
    return;
  }
  // The dark contour is drawn as a slightly fatter stroke UNDER the fill — one
  // rule that separates all four player colours from all six hex kinds at once.
  ctx.lineCap = 'round';
  ctx.strokeStyle = COMB_PIECE_INK;
  ctx.lineWidth = Math.max(4, tr.R * 0.20);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = COMB_PLAYER_COLOUR[owner] || '#888';
  ctx.lineWidth = Math.max(2.5, tr.R * 0.13);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function combDrawStructure(ctx, n, tr) {
  const nd = combNodes[n];
  const p = COMB_TOPOLOGY.nodes[n];
  const x = tr.toX(p.x), y = tr.toY(p.y);
  const kind = nd.level === 2 ? 'dome' : 'cell';
  const s = Math.max(14, tr.R * 0.72);          // ~30 px at R = 41.3
  const img = combImg((typeof assetFace === 'function') && assetFace('comb-piece', kind + '-' + nd.owner));
  if (combImgReady(img)) { ctx.drawImage(img, x - s / 2, y - s / 2, s, s); return; }

  const fill = COMB_PLAYER_COLOUR[nd.owner] || '#888';
  ctx.strokeStyle = COMB_PIECE_INK;
  ctx.lineWidth = Math.max(1.5, s * 0.11);
  ctx.fillStyle = fill;
  if (kind === 'cell') {
    const pts = combHexPts(x, y, s * 0.46);      // a hexagonal cell — a comb cell
    combPoly(ctx, pts);
    ctx.fill(); ctx.stroke();
    combRimLight(ctx, pts, s);                   // the light TOP rim — the other
    return;                                      // half of the separation rule
  }
  if (kind === 'dome') {
    // The Queen Dome's CROWN NOTCH is the one thing that must read at 30 px —
    // it is the whole Cell-vs-Dome distinction (spec §10).
    const dpts = combHexPts(x, y, s * 0.52);
    combPoly(ctx, dpts);
    ctx.fill(); ctx.stroke();
    combRimLight(ctx, dpts, s);
    ctx.fillStyle = fill;
    ctx.strokeStyle = COMB_PIECE_INK;
    ctx.lineWidth = Math.max(1.5, s * 0.11);
    ctx.beginPath();
    const r = s * 0.30;
    ctx.moveTo(x - r, y + r * 0.35);
    ctx.lineTo(x - r * 0.55, y - r * 0.55);
    ctx.lineTo(x, y + r * 0.05);
    ctx.lineTo(x + r * 0.55, y - r * 0.55);
    ctx.lineTo(x + r, y + r * 0.35);
    ctx.closePath();
    ctx.fillStyle = COMB_PIECE_RIM; ctx.fill();
    ctx.strokeStyle = COMB_PIECE_INK; ctx.lineWidth = Math.max(1, s * 0.07); ctx.stroke();
  }
}

// The light TOP rim. With the dark contour this is the ONE rule that separates
// all four player colours from all six hex kinds at once — which is what a
// per-colour palette fix cannot do, and it is standard game-token practice for
// exactly this reason (spec §10, the nine-way separation problem). Only the
// upper edges catch it, so it reads as a lit bevel rather than an outline.
function combRimLight(ctx, pts, s) {
  ctx.save();
  ctx.strokeStyle = COMB_PIECE_RIM;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  // Corners run from angle -30 deg; indices 4,5,0 are the upper-left, top and
  // upper-right edges in screen space (y grows downward).
  ctx.moveTo(pts[3][0], pts[3][1]);
  ctx.lineTo(pts[4][0], pts[4][1]);
  ctx.lineTo(pts[5][0], pts[5][1]);
  ctx.lineTo(pts[0][0], pts[0][1]);
  ctx.stroke();
  ctx.restore();
}

function combHexPts(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function combDrawTargets(ctx, tr) {
  const mode = combPlacementMode;
  const brand = '#F0A500';
  for (const t of combLegalTargets) {
    if (mode === 'wall') {
      const [a, b] = COMB_TOPOLOGY.nodesOfEdge[t];
      const na = COMB_TOPOLOGY.nodes[a], nb = COMB_TOPOLOGY.nodes[b];
      ctx.strokeStyle = brand; ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(5, tr.R * 0.22); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tr.toX(na.x), tr.toY(na.y)); ctx.lineTo(tr.toX(nb.x), tr.toY(nb.y)); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (mode === 'wasp') {
      const c = combHexCentre(t);
      ctx.beginPath(); ctx.arc(tr.toX(c.x), tr.toY(c.y), tr.R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = brand; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
    } else {
      const p = COMB_TOPOLOGY.nodes[t];
      ctx.beginPath(); ctx.arc(tr.toX(p.x), tr.toY(p.y), Math.max(7, tr.R * 0.26), 0, Math.PI * 2);
      ctx.fillStyle = brand; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = COMB_PIECE_INK; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  // The pending preview — what nearest-target snapping has picked, awaiting the
  // Place tap. Adjacent nodes sit ~41 px apart at fit-to-view, under the 44 px
  // touch minimum, so a preview-then-commit is required, not a nicety (spec §2).
  if (combPendingTarget !== null && combPendingTarget !== undefined) {
    const t = combPendingTarget;
    ctx.save();
    ctx.strokeStyle = COMB_PIECE_INK; ctx.lineWidth = 2.5;
    if (mode === 'wall') {
      const [a, b] = COMB_TOPOLOGY.nodesOfEdge[t];
      const na = COMB_TOPOLOGY.nodes[a], nb = COMB_TOPOLOGY.nodes[b];
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, tr.R * 0.16);
      ctx.beginPath(); ctx.moveTo(tr.toX(na.x), tr.toY(na.y)); ctx.lineTo(tr.toX(nb.x), tr.toY(nb.y)); ctx.stroke();
    } else if (mode === 'wasp') {
      const c = combHexCentre(t);
      combPoly(ctx, combHexPts(tr.toX(c.x), tr.toY(c.y), tr.R * 0.9)); ctx.stroke();
    } else {
      const p = COMB_TOPOLOGY.nodes[t];
      ctx.beginPath(); ctx.arc(tr.toX(p.x), tr.toY(p.y), Math.max(9, tr.R * 0.32), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

// Nearest LEGAL target within a radius — never a fixed hitbox. At fit-to-view on
// a 390 px phone one hex unit is ~41 px, so adjacent nodes sit ~41 px apart,
// UNDER the suite's 44 px touch minimum: fixed hitboxes would overlap. Required
// whether or not the magnifier exists (spec §2).
function combNearestTarget(px, py, tr) {
  let best = null, bestD = Infinity;
  const limit = tr.R * 0.75;
  for (const t of combLegalTargets) {
    let x, y;
    if (combPlacementMode === 'wall') {
      const [a, b] = COMB_TOPOLOGY.nodesOfEdge[t];
      x = tr.toX((COMB_TOPOLOGY.nodes[a].x + COMB_TOPOLOGY.nodes[b].x) / 2);
      y = tr.toY((COMB_TOPOLOGY.nodes[a].y + COMB_TOPOLOGY.nodes[b].y) / 2);
    } else if (combPlacementMode === 'wasp') {
      const c = combHexCentre(t); x = tr.toX(c.x); y = tr.toY(c.y);
    } else {
      x = tr.toX(COMB_TOPOLOGY.nodes[t].x); y = tr.toY(COMB_TOPOLOGY.nodes[t].y);
    }
    const d = Math.hypot(px - x, py - y);
    if (d < bestD) { bestD = d; best = t; }
  }
  return bestD <= limit ? best : null;
}

// Repaint whichever board surfaces are currently live. One call site for both,
// so a state change can never update one and leave the other stale.
function combRepaintBoards() {
  const inline = document.getElementById('comb-board-canvas');
  if (inline) combDrawBoard(inline, null);
  if (combMapOpen) {
    const map = document.getElementById('comb-map-canvas');
    if (map) combDrawBoard(map, { zoom: combZoom, panX: combPanX, panY: combPanY });
  }
}

// ── Overlays (Steps 4-5) ──────────────────────────────────────────────────

// The live value line under every pill row (ui-style § Dynamic value line) —
// six of the seven settings encode a concrete number, exactly the case that
// rule exists for. Text verbatim from spec §5.
const COMB_VAL_TEXT = {
  season:   { short: 'First to 7 Hive Points — about 25 minutes.',
              full:  'First to 10 Hive Points — about 50 minutes.' },
  layout:   { wild:   'Hexes and Bloom Markers shuffled fresh every match.',
              tended: 'The same fair meadow every time — good for a first game.' },
  wasp:     { blocks: 'The Wasp shuts a hex down, but takes nothing from your comb.',
              steals: 'The Wasp shuts a hex down and takes one resource from someone touching it.' },
  overflow: { off:   'Hold as much as you like.',
              snug:  'Hold more than 7 and a 7 costs you half.',
              roomy: 'Hold more than 9 and a 7 costs you half.' },
  waggle:   { outloud: 'Sort the deal out loud, then tap it in.',
              full:    'Post an offer; everyone answers in the app. You pick who deals.' },
  daylight: { allday: 'No time limit.', longday: '90 seconds a turn.', shortday: '60 seconds a turn.' },
  bounty:   { endless: 'The meadow never runs out.',
              limited: '19 of each resource — the meadow can run dry.' },
};

function combSyncPillGroup(group, val) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
    p.classList.remove('pill-active-comb');   // .pill is the base — never removed
    if (p.getAttribute('data-val') === String(val)) p.classList.add('pill-active-comb');
  });
  const el = document.getElementById(`comb-val-${group.replace('comb-', '')}`);
  if (el) el.textContent = (COMB_VAL_TEXT[group.replace('comb-', '')] || {})[val] || '';
}

// Repaints every pill + value line from state. Called on open AND from every
// pill's own click handler — never a per-card repaint. This is what closes
// spec §5's trap: The Season presets combWasp/combOverflow, and a handler
// that only repainted its own card would leave the other two showing stale
// pills. Calling this comprehensive repaint from all seven handlers makes
// that failure mode structurally impossible rather than something to remember.
function combSyncSettingsUI() {
  combSyncPillGroup('comb-season',   combSeason);
  combSyncPillGroup('comb-layout',   combLayout);
  combSyncPillGroup('comb-wasp',     combWasp);
  combSyncPillGroup('comb-overflow', combOverflow);
  combSyncPillGroup('comb-waggle',   combWaggle);
  combSyncPillGroup('comb-daylight', combDaylight);
  combSyncPillGroup('comb-bounty',   combBounty);
}

// Two halves: force the tab, show its sibling body and hide the others; then,
// when a highlightId is passed, refHighlightRow scrolls that gallery row into
// view and rings it — the landing point for every tap-hold in the game.
// Bodies are siblings toggled by display — never one body repainted — so
// flicking across and back keeps each tab's own scroll position.
const COMB_HOWTO_TABS = ['rules', 'comb', 'instinct'];
function combOpenHowTo(tab, highlightId) {
  // A highlightId always forces its tab; without one, honour the caller's tab,
  // and fall back to the canonical first tab (spec §8: The Rules is always first).
  combHowtoTab = COMB_HOWTO_TABS.includes(tab) ? tab : 'rules';

  COMB_HOWTO_TABS.forEach(t => {
    const body = document.getElementById(`comb-howto-body-${t}`);
    if (body) body.style.display = (t === combHowtoTab) ? 'flex' : 'none';
    const pill = document.getElementById(`btn-comb-howto-tab-${t}`);
    // Only ever add/remove pill-active-comb. `.pill` carries every structural
    // style and must never come off (ui-style.md § Pill toggle rule).
    if (pill) pill.classList.toggle('pill-active-comb', t === combHowtoTab);
  });

  const ov = document.getElementById('comb-how-to-overlay');
  if (!ov) return;
  // .overlay-data-inner, NOT .overflow-y-auto — the latter returns null silently
  // and the scroll is never reset (ui-style.md § Scroll reset on open).
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  const body = document.getElementById(`comb-howto-body-${combHowtoTab}`);
  if (body) body.scrollTop = 0;
  combRenderGalleries();               // through the real seams, every open
  ov.style.display = 'flex';
  if (highlightId && body && typeof refHighlightRow === 'function') {
    refHighlightRow(body, 'data-comb-ref-id', highlightId, 'comb-ref-row-ping');
  }
}
// One overlay, every contextual [?] and every dimmed-target tap. THREE BULLETS
// MAXIMUM — the rule exists because this game has more to explain than any other
// in the suite and would otherwise grow essays here (ui-style.md § Tip content).
function combShowTip(emoji, heading, lines) {
  combSet('comb-tip-emoji', emoji || '\u{1F41D}');
  combSet('comb-tip-heading', heading || '');
  const body = combClear('comb-tip-body');
  if (body) {
    (lines || []).slice(0, 3).forEach(t => {
      const p = document.createElement('p');
      p.textContent = t;
      body.appendChild(p);
    });
  }
  combShow('comb-tip-overlay', true);
}
// ── The How-to galleries — through the REAL seams, never hand-built markup ─
// Two load-bearing consequences: a gallery can never drift from the live board,
// and it is skinnable, which is what makes it double as the offline install
// check. Hand-built markup silently loses both.
// Wraps a rendered tile with artMakeZoomable when the engine helper and a
// resolved URL both exist (ui-style.md § Pattern 2a) — never a hand-built
// zoom listener of comb's own. `caption` is the human-readable name shown in
// the art viewer, never the internal id.
function combZoomable(el, url, caption) {
  return (typeof artMakeZoomable === 'function') ? artMakeZoomable(el, url, caption) : el;
}

function combRenderGalleries() {
  const hexBox = combClear('comb-howto-hexes');
  if (hexBox) {
    ['grove', 'blossom', 'clover', 'rock', 'nursery', 'smoke'].forEach(kind => {
      const cell = document.createElement('div');
      cell.className = 'flex flex-col gap-1 comb-ref-row';
      cell.dataset.combRefId = kind;
      const url = (typeof assetFace === 'function') && assetFace('comb-hex', kind);
      // { label: false } — the tile's own baked-in name overlay (gradient
      // scrim + text, meant for the emoji fallback) reads as clutter next to
      // real art AND duplicates this one caption line below, which now
      // carries both name and yield (owner review, 10 Sep 2026).
      cell.appendChild(combZoomable(combRenderHex(kind, { label: false }), url, COMB_HEX_NAME[kind]));
      const yield_ = COMB_HEX_YIELD[kind];
      const line = document.createElement('p');
      line.className = 'text-xs text-center';
      line.innerHTML = '<span class="font-semibold text-stone-700">' + COMB_HEX_NAME[kind] + '</span>'
        + '<span class="text-stone-400"> — ' + (yield_ ? 'Yields ' + COMB_RES_NAME[yield_] : 'Yields nothing') + '</span>';
      cell.appendChild(line);
      hexBox.appendChild(cell);
    });
  }

  // { big: true } — see css/styles.css: this is the ONE reference row per
  // resource, so it gets the gallery's largest icon, not the gameplay size.
  const resBox = combClear('comb-howto-resources');
  if (resBox) {
    COMB_RES.forEach(kind => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 comb-ref-row';
      row.dataset.combRefId = kind;
      const url = (typeof assetFace === 'function') && assetFace('comb-res', kind);
      row.appendChild(combZoomable(combRenderResource(kind, { label: true, big: true }), url, COMB_RES_NAME[kind]));
      const from = Object.keys(COMB_HEX_YIELD).find(h => COMB_HEX_YIELD[h] === kind);
      const p = document.createElement('p');
      p.className = 'text-stone-400 text-xs ml-auto';
      p.textContent = from ? 'from ' + COMB_HEX_NAME[from] : '';
      row.appendChild(p);
      resBox.appendChild(row);
    });
  }

  // Costs read straight off COMB_COSTS — the same constant affordability and the
  // build applier read, so a price can never be right in one place and wrong here.
  // { cost: true } (not the gameplay { small: true }) — up to five icons share
  // one row here (Queen Dome), so this sits between small and the Resources
  // card's big. Not individually zoomable — the Resources card above is the
  // one place to inspect a resource's art; repeating that five times per row
  // here would be noise, not reference.
  const costBox = combClear('comb-howto-costs');
  if (costBox) {
    [['wall', 'Comb Wall'], ['cell', 'Drone Cell'], ['dome', 'Queen Dome'], ['instinct', 'Instinct Card']]
      .forEach(([k, label]) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 flex-wrap comb-ref-row';
        row.dataset.combRefId = k;
        const nm = document.createElement('p');
        nm.className = 'font-semibold text-stone-700 text-sm';
        nm.textContent = label;
        row.appendChild(nm);
        const chips = document.createElement('div');
        chips.className = 'flex items-center gap-1 ml-auto flex-wrap justify-end';
        COMB_COSTS[k].forEach((n, i) => {
          for (let c = 0; c < n; c++) chips.appendChild(combRenderResource(COMB_RES[i], { cost: true }));
        });
        row.appendChild(chips);
        costBox.appendChild(row);
      });
  }

  // The Structures — the ornate hero set (spec §5.0), How-to only. One colour
  // (gold, playerIdx 0) per kind is enough to show what's really drawn; the
  // board itself shows all four in the player's own colour.
  const pieceBox = combClear('comb-howto-pieces');
  if (pieceBox) {
    [['wall', 'Comb Wall'], ['cell', 'Drone Cell'], ['dome', 'Queen Dome']].forEach(([kind, label]) => {
      const cell = document.createElement('div');
      cell.className = 'flex flex-col items-center gap-1 comb-ref-row';
      cell.dataset.combRefId = kind + '-0';
      const url = (typeof assetFace === 'function') && assetFace('comb-piece-hero', kind + '-0');
      cell.appendChild(combZoomable(combRenderPiece(kind, 0, { hero: true }), url, label));
      const nm = document.createElement('p');
      nm.className = 'text-stone-500 text-xs text-center';
      nm.textContent = label;
      cell.appendChild(nm);
      pieceBox.appendChild(cell);
    });
  }

  // The Compass. The NUMBERED die here, the blank one in the roll: a reference
  // tile is read at rest, where engraved faces say "many-sided, weighted" at a
  // glance, while the flying one must not contradict the number drawn on it.
  const dieBox = combClear('comb-howto-die');
  if (dieBox) {
    const url = (typeof assetExtra === 'function') && assetExtra('comb-die', 'die-numbered');
    dieBox.appendChild(combZoomable(combRenderDie({ numbered: true, hero: true }), url, 'The Sun Compass'));
  }

  // The face-down back, next to the deck count — a static gallery visual,
  // not a draw pile (there is nowhere in this tab a pile needs to "sit").
  // Zoomable like every other card face — it is real art too.
  const backBox = combClear('comb-howto-instinct-back');
  if (backBox) {
    const backUrl = (typeof assetBack === 'function') && assetBack('comb-instinct');
    backBox.appendChild(combZoomable(combRenderInstinct(null, { faceDown: true }), backUrl, 'Card Back'));
  }

  const deckBox = combClear('comb-howto-instinct');
  if (deckBox) {
    ['guard', 'golden', 'rush', 'bloom', 'pheromone'].forEach(kind => {
      const row = document.createElement('div');
      row.className = 'flex items-start gap-3 comb-ref-row';
      row.dataset.combRefId = kind;
      const url = (typeof assetFace === 'function') && assetFace('comb-instinct', kind);
      row.appendChild(combZoomable(combRenderInstinct(kind), url, COMB_INSTINCT_NAME[kind]));
      const txt = document.createElement('div');
      txt.className = 'flex flex-col gap-0.5 flex-1 min-w-0';
      txt.innerHTML =
        '<p class="font-semibold text-stone-700 text-sm">' + COMB_INSTINCT_NAME[kind] +
        ' <span class="text-stone-400 font-normal">×' + COMB_DECK_COUNT[kind] + '</span></p>' +
        '<p class="text-stone-500 text-xs">' + COMB_INSTINCT_TEXT[kind] + '</p>';
      row.appendChild(txt);
      deckBox.appendChild(row);
    });
  }
}

// ── The magnifier (spec §2) ───────────────────────────────────────────────
// The inline board neither pans nor zooms — it is fit-to-view and permanent.
// ALL zooming lives here, and this canvas is the game's ONLY pinch/pan surface.
function combOpenMap(scrollTo) {
  const ov = document.getElementById('comb-map-overlay');
  if (!ov) return;
  combMapOpen = true;
  combMapScrollTo = scrollTo || null;  // 'stats' → the map render scrolls its
                                       // bottom zone into view, then clears this
  combZoom = 1; combPanX = 0; combPanY = 0;
  combStaticCache = null;              // a different scale needs a re-render
  ov.style.display = 'flex';
  const c = document.getElementById('comb-map-canvas');
  if (c) combDrawBoard(c, { zoom: combZoom, panX: combPanX, panY: combPanY });
}
function combCloseMap() {
  const ov = document.getElementById('comb-map-overlay');
  if (ov) ov.style.display = 'none';
  combMapOpen = false;
  combMapScrollTo = null;
  combStaticCache = null;              // back to the inline board's scale
  combRepaintBoards();
}


// ══════════════════════════════════════════════════════════════════════════
// ── The action layer's surfaces (Step 5, chunk 5) ─────────────────────────
// Seven overlays and one inline picker, all reaching the appliers above
// through the SAME interceptor shape combAttemptPlace() uses: a client SENDS
// and waits, the authority APPLIES and broadcasts. There is one implementation
// of each rule, not a host copy and a client copy.
//
// The draft arrays below are UI state and nothing else — never serialised,
// never broadcast, cleared whenever their overlay opens.
// ══════════════════════════════════════════════════════════════════════════

let combDraftGive = [0, 0, 0, 0, 0];   // the Waggle offer being composed
let combDraftWant = [0, 0, 0, 0, 0];
let combDraftTo   = -1;                // -1 = the whole table
let combBankPick  = -1;                // which rate row is expanded, -1 = none
let combBloomPick = [];                // Spring Bloom's two, in tap order

// ── The interceptors. One per ACTION packet, and every one of them is the same
//    five lines: a client asks, the authority runs the applier the client's
//    packet routes to. ──────────────────────────────────────────────────────
function combAttemptAction(action, payload, run) {
  if (window.syllyMultiplayerMode === 'client') {
    combSendAction(action, Object.assign({ playerIdx: combLocalIdx() }, payload));
    return { ok: true, sent: true };
  }
  return run();
}
function combAttemptPost(to, give, want) {
  return combAttemptAction('COMB_TRADE_POST', { to, give, want },
    () => combPostOffer(combTurn, to, give, want));
}
// ⚠️ The one interceptor that is NOT the active player's. A responder is by
// definition somebody else's seat, so this passes combLocalIdx() where the other
// six pass combTurn — and a host answering an open offer is answering as itself.
function combAttemptRespond(accept) {
  return combAttemptAction('COMB_TRADE_RESPOND', { accept },
    () => combRespondOffer(combLocalIdx(), accept));
}
function combAttemptSelect(partnerIdx) {
  return combAttemptAction('COMB_TRADE_SELECT', { partnerIdx },
    () => combSelectPartner(combTurn, partnerIdx));
}
function combAttemptCancelOffer() {
  return combAttemptAction('COMB_TRADE_CANCEL', {}, () => combCancelOffer(combTurn));
}
function combAttemptBank(giveIdx, wantIdx) {
  return combAttemptAction('COMB_BANK_TRADE', { give: giveIdx, want: wantIdx },
    () => combBankTrade(combTurn, giveIdx, wantIdx));
}
function combAttemptBuy() {
  return combAttemptAction('COMB_BUY_INSTINCT', {}, () => combBuyInstinct(combTurn));
}
function combAttemptPlayInstinct(cardIdx, params) {
  return combAttemptAction('COMB_PLAY_INSTINCT', { cardIdx, params: params || {} },
    () => combPlayInstinct(combTurn, cardIdx, params || {}));
}

// A rejection the player asked for, in the game's one tip overlay. `reason: null`
// is a deliberate silence — §7's "prevented, not rejected" cases, where the
// control was already dimmed and a modal would be telling them what they can see.
function combRejected(res) {
  if (!res || res.ok) return false;
  playBoing();
  if (res.reason) combShowTip('\u{1F41D}', 'Not that', [res.reason]);
  return true;
}

// ── The two-step build picker (spec §7) ───────────────────────────────────
//
// Step 1 is WHICH KIND, step 2 is the existing placement mode. Deliberately
// INLINE rather than a sixteenth overlay: this game's whole architecture is that
// the board never goes away (§17-4), and a modal covering the board while you
// decide what to build is the one thing it must not do.
//
// An option you cannot afford is dimmed but STILL TAPPABLE, and tapping it says
// why — the same rule the dimmed board targets follow, for the same reason.
function combOpenBuildPicker() {
  combBuildPickerOpen = true;
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  combRenderMeadow();
}
function combCloseBuildPicker() {
  combBuildPickerOpen = false;
  combRenderMeadow();
}
function combBuildBlockReason(p, kind) {
  if (combAtPieceLimit(p, kind)) return 'Your colony has no more to give.';
  if (kind === 'wall' && combFreeWalls > 0) return null;         // a Comb Rush is paying
  if (!combCanAfford(p, COMB_COSTS[kind])) return 'Not enough in the comb for that yet.';
  if (!combLegalTargetsFor(kind, p, {}).length) return 'Nowhere legal to put one right now.';
  return null;
}
function combRenderBuildPicker() {
  const box = combClear('comb-build-options');
  if (!box) return;
  const me = combLocalIdx();
  [['cell', 'Drone Cell'], ['dome', 'Queen Dome'], ['wall', 'Comb Wall']].forEach(([kind, label]) => {
    const btn = document.createElement('button');
    const blocked = combBuildBlockReason(me, kind);
    btn.className = 'comb-build-opt' + (blocked ? ' comb-build-opt-off' : '');
    const nm = document.createElement('span');
    nm.className = 'comb-build-opt-name';
    nm.textContent = label;
    btn.appendChild(nm);
    const chips = document.createElement('span');
    chips.className = 'comb-build-opt-cost';
    // Free walls read as free, because they are — the cost line is what a player
    // checks before tapping, and showing 1 Resin + 1 Wax under a Comb Rush is a
    // lie the applier then contradicts.
    if (kind === 'wall' && combFreeWalls > 0) {
      const free = document.createElement('span');
      free.className = 'comb-build-opt-free';
      free.textContent = 'Free ×' + combFreeWalls;
      chips.appendChild(free);
    } else {
      COMB_COSTS[kind].forEach((n, i) => {
        for (let c = 0; c < n; c++) chips.appendChild(combRenderResource(COMB_RES[i], { small: true }));
      });
    }
    btn.appendChild(chips);
    btn.onclick = () => {
      if (blocked) { playBoing(); combShowTip('\u{1F41D}', label, [blocked]); return; }
      playDone();
      combBuildPickerOpen = false;
      combPlacementMode  = kind;
      combLegalTargets   = combLegalTargetsFor(kind, combTurn, {});
      combPendingTarget  = null;
      combRenderMeadow();
    };
    box.appendChild(btn);
  });
}

// ── The Waggle Dance overlay ──────────────────────────────────────────────
// One overlay, TWO states. Before an offer exists it is the builder (give, want,
// who with, the Meadow's rates). Once one is posted the same overlay becomes the
// poster's answer board — who said yes, who said no, and the tap that picks. The
// poster posted from here, so the poster picks from here.
function combOpenTrade() {
  combDraftGive = [0, 0, 0, 0, 0];
  combDraftWant = [0, 0, 0, 0, 0];
  combDraftTo   = -1;
  combBankPick  = -1;
  const ov = document.getElementById('comb-trade-overlay');
  if (!ov) return;
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  combRenderTrade();
  ov.style.display = 'flex';
}

function combTradeAmountRow(box, arr, i, cap) {
  const row = document.createElement('div');
  row.className = 'comb-trade-row';
  row.appendChild(combRenderResource(COMB_RES[i], { label: true, small: true }));
  const minus = document.createElement('button');
  minus.className = 'comb-step-btn';
  minus.textContent = '−';
  minus.onclick = () => { if (arr[i] > 0) { arr[i]--; playPillClick(); combRenderTrade(); } };
  const n = document.createElement('span');
  n.className = 'comb-step-count';
  n.textContent = String(arr[i]);
  const plus = document.createElement('button');
  plus.className = 'comb-step-btn';
  plus.textContent = '+';
  plus.onclick = () => {
    if (cap !== undefined && arr[i] >= cap) { playBoing(); return; }
    arr[i]++; playPillClick(); combRenderTrade();
  };
  row.appendChild(minus); row.appendChild(n); row.appendChild(plus);
  box.appendChild(row);
}

let combTradeLive = false;      // which half of comb-trade-overlay is painted

function combRenderTrade() {
  const live = !!combOffer;
  combTradeLive = live;
  const mine = combIsMyTurn();
  const me   = combLocalIdx();
  const hand = combHands[me] || [0, 0, 0, 0, 0];

  ['comb-trade-card-give', 'comb-trade-card-want', 'comb-trade-card-bank']
    .forEach(id => combShow(id, !live, 'flex'));
  combShow('comb-trade-card-who', true, 'flex');
  combSet('comb-trade-sub', live
    ? (combOffer.to >= 0
        ? 'Waiting on ' + combName(combOffer.to) + '.'
        : 'Posted to the table. Pick whoever says yes.')
    : 'Offer what you can spare. You cannot offer what you have not got.');

  if (!live) {
    const give = combClear('comb-trade-give');
    // ⚠️ Capped at what is actually held. §7 blocks an unaffordable post, but a
    // stepper that cannot even compose one is the kinder half of the same rule.
    if (give) COMB_RES.forEach((_, i) => combTradeAmountRow(give, combDraftGive, i, hand[i] | 0));
    const want = combClear('comb-trade-want');
    if (want) COMB_RES.forEach((_, i) => combTradeAmountRow(want, combDraftWant, i));
  }

  // ── Who with ──
  const targets = combClear('comb-trade-targets');
  if (targets) {
    if (live) {
      // The answer board. Every seat the offer asked, with its answer, and the
      // accepters tappable — that tap is COMB_TRADE_SELECT and nothing else is.
      combOfferAudience().forEach(q => {
        const r = combOffer.responses[q];
        const btn = document.createElement('button');
        btn.className = 'pill' + (r === COMB_RESP_YES ? ' pill-active-comb' : '');
        btn.textContent = combName(q) + (r === COMB_RESP_YES ? ' — yes'
                                       : r === COMB_RESP_NO  ? ' — no'
                                       : ' — thinking');
        btn.onclick = () => {
          if (r !== COMB_RESP_YES) { playBoing(); return; }
          playLaunch();
          if (!combRejected(combAttemptSelect(q))) combShow('comb-trade-overlay', false);
        };
        targets.appendChild(btn);
      });
    } else {
      const mk = (idx, label, sub) => {
        const btn = document.createElement('button');
        btn.className = 'pill' + (combDraftTo === idx ? ' pill-active-comb' : '');
        btn.textContent = sub ? label + ' · ' + sub : label;
        btn.onclick = () => { combDraftTo = idx; playPillClick(); combRenderTrade(); };
        targets.appendChild(btn);
      };
      mk(-1, 'The whole table');
      for (let q = 0; q < combPlayerCount; q++) {
        if (q === me) continue;
        // Both public mirrors, in the one place a player is choosing WHO to ask.
        // A seat holding nothing cannot pay, and that is worth seeing first.
        mk(q, combName(q), combHandCount(q) + ' held · ' + ((combPublicInstinct[q] | 0)) + ' instinct');
      }
    }
  }

  // ── The Meadow's rates ──
  if (!live) {
    const rows = combClear('comb-trade-bank-rows');
    if (rows) COMB_RES.forEach((kind, i) => {
      const rate = combBankRate(me, i);
      const afford = (hand[i] | 0) >= rate;
      const row = document.createElement('div');
      row.className = 'comb-trade-row' + (afford ? '' : ' comb-bank-off');
      const head = document.createElement('button');
      head.className = 'comb-bank-head';
      head.textContent = rate + ' × ' + COMB_RES_NAME[kind] + ' →';
      head.onclick = () => {
        if (!afford) { playBoing(); return; }
        combBankPick = (combBankPick === i) ? -1 : i;
        playPillClick();
        combRenderTrade();
      };
      row.appendChild(head);
      if (combBankPick === i && afford) {
        COMB_RES.forEach((k2, j) => {
          if (j === i) return;
          const chip = document.createElement('button');
          chip.className = 'comb-bank-chip';
          chip.appendChild(combRenderResource(k2, { small: true }));
          chip.onclick = () => {
            playLaunch();
            combBankPick = -1;
            if (!combRejected(combAttemptBank(i, j))) combShow('comb-trade-overlay', false);
          };
          row.appendChild(chip);
        });
      }
      rows.appendChild(row);
    });
  }

  // ── The two buttons ──
  const postable = !live && mine && combPhase === 'actions' &&
                   combDraftGive.some(v => v) && combDraftWant.some(v => v);
  combShow('btn-comb-trade-post', !live, 'block');
  combEnable('btn-comb-trade-post', postable);
  const cancel = document.getElementById('btn-comb-trade-cancel');
  if (cancel) cancel.textContent = live ? 'Call it off' : 'Never mind';
  combShow('comb-trade-error', false);
}

// ── The arriving offer (the responder's modal) ────────────────────────────
// Opens on COMB_TRADE_POSTED, on the devices the offer actually asks — never on
// the poster's own, which is looking at the answer board instead.
function combOpenOfferIfMine() {
  if (!combOffer) { combShow('comb-trade-offer-overlay', false); return; }
  const me = combLocalIdx();
  // The poster gets the answer board, not the accept/decline modal — in the very
  // overlay they posted from, which is where they will look for it.
  if (me === combOffer.from) { combRenderTrade(); combShow('comb-trade-overlay', true); return; }
  if (combOfferAudience().indexOf(me) < 0) { combShow('comb-trade-offer-overlay', false); return; }
  if (combOffer.responses[me] !== COMB_RESP_NONE) return;    // already answered
  combSet('comb-offer-heading', combName(combOffer.from) + ' wants to dance');
  const body = combClear('comb-offer-body');
  if (body) {
    const line = (label, arr) => {
      const row = document.createElement('div');
      row.className = 'comb-trade-row justify-center';
      const t = document.createElement('span');
      t.className = 'text-stone-400 text-xs uppercase tracking-widest';
      t.textContent = label;
      row.appendChild(t);
      COMB_RES.forEach((kind, i) => {
        for (let c = 0; c < (arr[i] | 0); c++) {
          row.appendChild(combRenderResource(kind, { small: true }));
        }
      });
      body.appendChild(row);
    };
    line('They give', combOffer.give);
    line('They want', combOffer.want);
  }
  // ⚠️ The countdown is RENDERED from the host's timestamp, never computed here,
  // and this device does nothing when it reaches zero. Expiry is the authority's
  // (the Daylight pattern) — two devices firing it would resolve one offer twice.
  combShow('comb-offer-timer', combOffer.expiresAt > 0, 'block');
  combRenderOfferTimer();
  // Accept is blocked when you cannot actually pay, rather than accepted and
  // then failed at execution — a stale deal is for the poster spending mid-dance,
  // not for an accepter who never had it.
  combEnable('btn-comb-offer-accept', combCanAfford(combLocalIdx(), combOffer.want));
  combShow('comb-trade-offer-overlay', true);
}
// ⚠️ NOT a ticking countdown, deliberately. A live tick means a fourth timer
// handle to own in the quit handler, the teardown and every early phase exit
// (§ Timer Lifecycle) — for ten seconds of text. This repaints whenever the
// meadow does, and reads as a deadline rather than a stopwatch.
function combRenderOfferTimer() {
  if (!combOffer || !combOffer.expiresAt) { combShow('comb-offer-timer', false); return; }
  const left = Math.max(0, Math.ceil((combOffer.expiresAt - Date.now()) / 1000));
  combSet('comb-offer-timer', 'About ' + left + 's before it lapses.');
}

// ── Your Instincts ────────────────────────────────────────────────────────
function combOpenInstinct() {
  const ov = document.getElementById('comb-instinct-overlay');
  if (!ov) return;
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  combRenderInstinctList();
  ov.style.display = 'flex';
}
function combRenderInstinctList() {
  const box = combClear('comb-instinct-cards');
  const me = combLocalIdx();
  const cards = combInstinct[me] || [];
  const live = cards.map((c, i) => ({ c, i })).filter(x => !x.c.played);
  combShow('comb-instinct-empty', live.length === 0, 'block');
  if (!box) return;
  live.forEach(({ c, i }) => {
    const row = document.createElement('div');
    row.className = 'comb-instinct-row';
    row.dataset.combRefId = c.kind;
    // The SAME seam the How-to gallery renders through, so the two can never
    // disagree about what a card is — and a tap-hold jumps straight to its row.
    row.appendChild(combRenderInstinct(c.kind));
    const txt = document.createElement('div');
    txt.className = 'flex flex-col gap-0.5 flex-1 min-w-0';
    txt.innerHTML =
      '<p class="font-semibold text-stone-700 text-sm">' + COMB_INSTINCT_NAME[c.kind] + '</p>' +
      '<p class="text-stone-500 text-xs">' + COMB_INSTINCT_TEXT[c.kind] + '</p>';
    row.appendChild(txt);
    if (typeof bindCardHold === 'function') {
      bindCardHold(row, () => combOpenHowTo('instinct', c.kind));
    }
    // Golden Nectar gets NO play affordance at all — it is a score card, not an
    // action, and §7 says so as a rendering rule rather than a rejection.
    if (c.kind !== 'golden') {
      const btn = document.createElement('button');
      btn.className = 'comb-instinct-play btn-mp-action';
      btn.textContent = 'Play';
      const blocked = !combIsMyTurn() ? 'Only on your own turn.'
                    : combPhase !== 'actions' ? 'Not right now.'
                    : combInstinctPlayedThisTurn ? 'One instinct a turn.'
                    : c.boughtTurn === combTurnNo ? "That one's still settling in."
                    : null;
      if (blocked) btn.classList.add('comb-instinct-play-off');
      btn.onclick = () => {
        if (blocked) { playBoing(); combShowTip('\u{1F41D}', COMB_INSTINCT_NAME[c.kind], [blocked]); return; }
        playDone();
        // The two cards that need an answer before they can resolve ask for it
        // FIRST — the applier refuses a malformed pick without eating the card,
        // but a player should never see that refusal.
        if (c.kind === 'bloom')     { combOpenBloom(i); return; }
        if (c.kind === 'pheromone') { combOpenPheromone(i); return; }
        combShow('comb-instinct-overlay', false);
        combRejected(combAttemptPlayInstinct(i, {}));
      };
      row.appendChild(btn);
    } else {
      const tag = document.createElement('span');
      tag.className = 'comb-instinct-hidden';
      tag.textContent = '+1, hidden';
      row.appendChild(tag);
    }
    box.appendChild(row);
  });
}

// The buyer's device only, straight off the private COMB_INSTINCT_SYNC that has
// already landed — this reads combInstinct[me], never the public packet, because
// the public packet deliberately does not carry the kind.
function combShowInstinctReveal() {
  const me = combLocalIdx();
  const cards = combInstinct[me] || [];
  const card = cards[cards.length - 1];
  if (!card) return;
  const box = combClear('comb-reveal-card');
  if (box) box.appendChild(combRenderInstinct(card.kind));
  combSet('comb-reveal-heading', COMB_INSTINCT_NAME[card.kind] || '');
  combSet('comb-reveal-body', card.kind === 'golden'
    ? 'A hidden Hive Point. Nobody sees it until the season ends.'
    : COMB_INSTINCT_TEXT[card.kind] + ' Not this turn, though.');
  combShow('comb-instinct-reveal-overlay', true);
}

// ── Spring Bloom and Pheromone Dominance ──────────────────────────────────
let combPendingCardIdx = -1;      // which card the open picker belongs to

function combOpenBloom(cardIdx) {
  combPendingCardIdx = cardIdx;
  combBloomPick = [];
  combShow('comb-instinct-overlay', false);
  combRenderBloom();
  combShow('comb-bloom-overlay', true);
}
function combRenderBloom() {
  const box = combClear('comb-bloom-choices');
  combSet('comb-bloom-sub', combBloomPick.length
    ? 'Taking ' + combBloomPick.map(i => COMB_RES_NAME[COMB_RES[i]]).join(' and ') + '.'
    : 'Take any two from the meadow. They can be the same one twice.');
  if (box) COMB_RES.forEach((kind, i) => {
    const btn = document.createElement('button');
    const picked = combBloomPick.filter(x => x === i).length;
    btn.className = 'comb-pick-row' + (picked ? ' comb-pick-on' : '');
    btn.appendChild(combRenderResource(kind, { label: true, small: true }));
    if (picked) {
      const n = document.createElement('span');
      n.className = 'comb-pick-count';
      n.textContent = '×' + picked;
      btn.appendChild(n);
    }
    btn.onclick = () => {
      if (combBloomPick.length >= 2) { playBoing(); return; }
      combBloomPick.push(i); playPillClick(); combRenderBloom();
    };
    box.appendChild(btn);
  });
  combEnable('btn-comb-bloom-confirm', combBloomPick.length === 2);
}

function combOpenPheromone(cardIdx) {
  combPendingCardIdx = cardIdx;
  combShow('comb-instinct-overlay', false);
  const box = combClear('comb-pheromone-choices');
  if (box) COMB_RES.forEach((kind, i) => {
    const btn = document.createElement('button');
    btn.className = 'comb-pick-row';
    btn.appendChild(combRenderResource(kind, { label: true, small: true }));
    // The public count of what is out there is genuinely useful here and leaks
    // nothing — it is a total across hands, never any one player's holding.
    btn.onclick = () => {
      playLaunch();
      combShow('comb-pheromone-overlay', false);
      const idx = combPendingCardIdx; combPendingCardIdx = -1;
      combRejected(combAttemptPlayInstinct(idx, { resIdx: i }));
    };
    box.appendChild(btn);
  });
  combShow('comb-pheromone-overlay', true);
}

// ── The Wasp's victim picker ──────────────────────────────────────────────
// combWaspMove() leaves the game in 'waspSteal' with no way to answer it until
// this exists — the SYNC applier's "the picker is the action layer's" note.
function combOpenSteal() {
  if (combPhase !== 'waspSteal' || !combIsMyTurn()) { combShow('comb-steal-overlay', false); return; }
  const victims = combWaspVictims(combWaspHex, combTurn);
  if (!victims.length) { combShow('comb-steal-overlay', false); return; }
  combSet('comb-steal-sub', 'The Wasp has landed. Pick who it takes from.');
  const box = combClear('comb-steal-targets');
  if (box) victims.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'comb-pick-row';
    const n = document.createElement('span');
    n.className = 'font-semibold text-stone-700 text-sm';
    // A count, never a kind — the victim's contents are exactly what the sting
    // must not reveal, to the thief least of all.
    n.textContent = combName(v) + ' · ' + combHandCount(v) + ' held';
    btn.appendChild(n);
    btn.onclick = () => {
      playDone();
      combShow('comb-steal-overlay', false);
      if (window.syllyMultiplayerMode === 'client') {
        combSendAction('COMB_WASP_STEAL', { playerIdx: combLocalIdx(), victimIdx: v });
        return;
      }
      combRejected(combWaspSteal(combTurn, v));
    };
    box.appendChild(btn);
  });
  combShow('comb-steal-overlay', true);
}

// ── The Overflow ──────────────────────────────────────────────────────────
// Opens on over-limit devices only, and has no dismiss: the discard is mandatory.
let combOverflowPick = [0, 0, 0, 0, 0];

function combOpenOverflow() {
  const me = combLocalIdx();
  const owed = combOverflowOwed[me] | 0;
  if (combPhase !== 'overflow' || !owed || combOverflowReady[me]) {
    combShow('comb-overflow-overlay', false);
    return;
  }
  combOverflowPick = [0, 0, 0, 0, 0];
  combRenderOverflow();
  combShow('comb-overflow-overlay', true);
}
function combRenderOverflow() {
  const me = combLocalIdx();
  const owed = combOverflowOwed[me] | 0;
  const hand = combHands[me] || [0, 0, 0, 0, 0];
  const picked = combOverflowPick.reduce((a, b) => a + b, 0);
  combSet('comb-overflow-sub', 'A seven. Half of what you are carrying goes back to the meadow.');
  combSet('comb-overflow-owed', 'Let go of ' + owed + ' — ' + picked + ' chosen.');
  const rows = combClear('comb-overflow-rows');
  if (rows) COMB_RES.forEach((kind, i) => {
    const row = document.createElement('div');
    row.className = 'comb-trade-row';
    row.appendChild(combRenderResource(kind, { label: true, small: true, count: hand[i] | 0 }));
    const minus = document.createElement('button');
    minus.className = 'comb-step-btn';
    minus.textContent = '−';
    minus.onclick = () => { if (combOverflowPick[i] > 0) { combOverflowPick[i]--; playPillClick(); combRenderOverflow(); } };
    const n = document.createElement('span');
    n.className = 'comb-step-count';
    n.textContent = String(combOverflowPick[i]);
    const plus = document.createElement('button');
    plus.className = 'comb-step-btn';
    plus.textContent = '+';
    plus.onclick = () => {
      if (combOverflowPick[i] >= (hand[i] | 0) || picked >= owed) { playBoing(); return; }
      combOverflowPick[i]++; playPillClick(); combRenderOverflow();
    };
    row.appendChild(minus); row.appendChild(n); row.appendChild(plus);
    rows.appendChild(row);
  });
  combShow('comb-overflow-waiting', false);
  combEnable('btn-comb-overflow-confirm', picked === owed);
}

// ── The Season Log ────────────────────────────────────────────────────────
function combOpenLog() {
  const ov = document.getElementById('comb-log-overlay');
  if (!ov) return;
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  const box = combClear('comb-log-rows');
  combShow('comb-log-empty', combLog.length === 0, 'block');
  if (box) combLog.slice().reverse().forEach(line => {
    const p = document.createElement('p');
    p.className = 'text-stone-500 text-sm';
    p.textContent = line;
    box.appendChild(p);
  });
  ov.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════════════════════
// ── Multiplayer — the RECEIVE half (Step 5, chunk 4) ──────────────────────
//
// Two channels in, one function. mpHandleEnvelope() has already dropped every
// envelope this device sent itself (originId === syllyDeviceUid) and already
// handled MP_PLAYER_LEFT generically, so nothing below needs to think about
// either.
//
// FOUR RULES, and every handler below obeys all four:
//   1. ⚠️ NOTHING HERE MAY THROW. A throw escapes into the Firebase callback,
//      strands the device that raised it AND kills the SYNC that would have
//      advanced everybody else (logic-engine.md § Firebase callback crash
//      safety). Every applier returns { ok, reason }; the router try/catches.
//   2. Never assign a raw payload collection. Firebase deletes every empty
//      value, so `owed: [0,0,0]`, `ready: [false,…]` and an untouched
//      `produced` grid all arrive as `undefined` — combWireArr rebuilds them.
//   3. The host trusts the WIRE's originId for who acted, never the payload's
//      playerIdx (see combSeatOf).
//   4. A client applies; it never re-derives. The two achievement holders in
//      particular are restored, never recomputed (§17-3).
// ══════════════════════════════════════════════════════════════════════════

// The ACTION table. One row per packet a non-host device may send, each naming
// the ONE applier that already implements the rule — so a client's move and the
// host's own tap cannot diverge. `pending` rows are packets spec §11 lists whose
// applier is the action layer's, not this chunk's; they are listed rather than
// omitted so the missing-handler audit stays mechanical (verify-comb-loopback
// asserts this table against the spec's list).
const COMB_ACTION_ROUTES = {
  COMB_DRAFT_PLACE:     (seat, p) => combDraftPlace(p.kind, p.targetIdx | 0, seat),
  COMB_ROLL:            (seat)    => combScoutFlight(seat),
  COMB_OVERFLOW_SUBMIT: (seat, p) => combSubmitOverflow(seat, combWireArr(p.discard, COMB_RES.length, 0)),
  COMB_WASP_MOVE:       (seat, p) => combWaspMove(seat, p.hexIdx | 0),
  COMB_WASP_STEAL:      (seat, p) => combWaspSteal(seat, p.victimIdx | 0),
  COMB_BUILD:           (seat, p) => combBuild(seat, p.kind, p.targetIdx | 0),
  COMB_END_TURN:        (seat)    => combEndTurn(seat),
  // ── The action layer (chunk 5) ──
  COMB_TRADE_POST:      (seat, p) => combPostOffer(seat,
                                       (typeof p.to === 'number') ? (p.to | 0) : -1,
                                       combWireArr(p.give, COMB_RES.length, 0),
                                       combWireArr(p.want, COMB_RES.length, 0)),
  COMB_TRADE_RESPOND:   (seat, p) => combRespondOffer(seat, !!p.accept),
  COMB_TRADE_SELECT:    (seat, p) => combSelectPartner(seat, p.partnerIdx | 0),
  COMB_TRADE_CANCEL:    (seat)    => combCancelOffer(seat),
  COMB_BANK_TRADE:      (seat, p) => combBankTrade(seat, p.give | 0, p.want | 0),
  COMB_BUY_INSTINCT:    (seat)    => combBuyInstinct(seat),
  COMB_PLAY_INSTINCT:   (seat, p) => combPlayInstinct(seat, p.cardIdx | 0, p.params || {}),
};
// Spec §11 ACTION packets whose appliers arrive with the action layer. Naming
// them here is the audit: a packet in neither map is a silently dropped
// submission, which is exactly how SS, YGI, LTTP and NAT each shipped a phase
// that looked synced and was not.
// Empty since chunk 5: every ACTION packet spec §11 lists now has an applier.
// The array stays rather than being deleted — it is half of the loopback's
// mechanical missing-handler audit, and a packet added later belongs here until
// its applier lands.
const COMB_ACTION_PENDING = [];

function combHandleEnvelope(env) {
  if (!env || !env.payload || !env.payload.action) return;
  const p = env.payload, action = p.action;
  try {
    if (env.type === 'ACTION') { combHandleAction(action, p, env.originId); return; }
    if (env.type === 'SYNC')     combHandleSync(action, p);
  } catch (e) {
    // Swallowed on purpose — see rule 1. The device that sent this keeps
    // playing; a state divergence it causes is repaired by COMB_FULL_STATE.
    if (typeof console !== 'undefined' && console.warn) console.warn('comb: ' + action, e);
  }
}

// Host only. A client that receives an ACTION (Firebase indexes every write to
// /events, so it will) ignores it.
function combHandleAction(action, p, originId) {
  if (window.syllyMultiplayerMode !== 'host') return;
  const route = COMB_ACTION_ROUTES[action];
  if (!route) return;
  const seat = combSeatOf(originId);
  if (seat < 0) return;                       // not a seated player — drop it
  const res = route(seat, p) || { ok: false };
  // A rejection is the one case a client cannot see: it submitted, and the SYNC
  // that would have answered was never built. Rather than leave that device
  // sitting on a stale board with a dead button, repair it privately — which is
  // also the only live send site COMB_FULL_STATE has in v1 (§17-21).
  if (!res.ok) combSendFullState(seat);
}

// Everything a client applies. Host-side SYNCs never arrive back here (the
// engine's dedup guard), so this is a client-only body in practice — but it is
// written to be idempotent rather than to assume that.
function combHandleSync(action, p) {
  if (window.syllyMultiplayerMode === 'host') return;
  try { mpUnlockSync(); } catch (_) {}

  switch (action) {

    // ── The private channel (mpSendPrivate → this device only) ────────────
    // The WHOLE collection, never a delta, so a dropped packet self-corrects on
    // the next mutation instead of desyncing for the rest of a 45-minute match.
    case 'COMB_HAND_SYNC':
      combSetHand(combLocalIdx(), combWireArr(p.hand, COMB_RES.length, 0));
      combRenderMeadow();
      return;

    case 'COMB_INSTINCT_SYNC':
      combSetInstinct(combLocalIdx(), (p.cards || []).filter(Boolean));
      combRenderMeadow();
      return;

    // The late-join / divergence repair. combApplyState() carries no hands but
    // this device's, because combSendFullState() stripped every other seat's
    // before it went on the wire.
    case 'COMB_FULL_STATE':
      combApplyState(p.state);
      combSetHand(combLocalIdx(), combWireArr(p.hand, COMB_RES.length, 0));
      combSetInstinct(combLocalIdx(), (p.instinct || []).filter(Boolean));
      combPublicCounts = combWireArr(p.handCounts, combPlayerCount, 0).map(v => v | 0);
      combShowMeadow();
      combArmDraftPlacement();
      combRenderMeadow();
      return;

    // ── Match start ───────────────────────────────────────────────────────
    // Settings FIRST: combDealMatch() reads combLayout to choose the Wild deal
    // or the Tended one, so applying them afterwards would deal a different
    // board from the same seed and every node index in every later packet would
    // point at the wrong hex.
    case 'COMB_MATCH_START': {
      const s = p.settings || {};
      if (s.season   !== undefined) combSeason   = s.season;
      if (s.layout   !== undefined) combLayout   = s.layout;
      if (s.wasp     !== undefined) combWasp     = s.wasp;
      if (s.overflow !== undefined) combOverflow = s.overflow;
      if (s.waggle   !== undefined) combWaggle   = s.waggle;
      if (s.daylight !== undefined) combDaylight = s.daylight;
      if (s.bounty   !== undefined) combBounty   = s.bounty;

      const slots = (typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots) ? mpPlayerSlots : [];
      combPlayerCount = slots.length || (p.names || []).length;
      combPlayerNames = combWireArr(p.names, combPlayerCount, '')
        .map((n, i) => n || (slots[i] && slots[i].nickname) || '');

      combDealMatch(p.boardSeed | 0);         // same seed + same settings = same board
      // ⚠️ MASK THE DECK. combDealMatch() rebuilt the Instinct deck from the same
      // seed, which means a client would otherwise hold the exact draw ORDER —
      // and with the public deckLeft that is every unplayed card in every hand,
      // Golden Nectar included. The count is public (the stack is on the table);
      // the order is not. A client never draws, so a masked array of the right
      // length is all of combDeck it can legitimately have. See BUG-06.
      combDeck = new Array(combDeck.length).fill('?');
      combPublicCounts = new Array(combPlayerCount).fill(0);
      combGameover     = null;
      combDraftOrder   = combWireArr(p.draftOrder, combPlayerCount * 2, 0).map(v => v | 0);
      combTurn         = p.turn | 0;
      combPhase        = p.phase || 'draft';
      combShowMeadow();
      combArmDraftPlacement();
      combRenderMeadow();
      return;
    }

    // ── The opening draft ─────────────────────────────────────────────────
    // ⚠️ combArmDraftPlacement() is the load-bearing line. Placement mode is UI
    // state, recomputed rather than carried, so without this call a client
    // renders a lit board it cannot tap the moment its own turn comes round.
    case 'COMB_DRAFT_STATE':
      combApplyNodes(p);
      combDraftStep   = p.draftStep | 0;
      combDraftAnchor = (typeof p.draftAnchor === 'number') ? p.draftAnchor : -1;
      combTurn        = p.turn | 0;
      combPhase       = p.phase || 'draft';
      combApplyCounts(p);
      combArmDraftPlacement();
      combRenderMeadow();
      return;

    // ── The Scout Flight ──────────────────────────────────────────────────
    // produced[][] is public — it is in Catan, and the whole table watches every
    // roll for it. That is a different thing from a hand's CONTENTS, which never
    // travel here. The grid arrives all-zero on a 7 and Firebase erases it
    // whole, hence combWireArr twice over.
    case 'COMB_ROLL_RESULT': {
      combRoll    = (typeof p.roll === 'number') ? p.roll : null;
      combPhase   = p.phase || combPhase;
      combWaspHex = (typeof p.waspBlockedHex === 'number') ? p.waspBlockedHex : combWaspHex;
      combApplyCounts(p);
      // The whoosh played at the cast, not here — this is the landing, and it is
      // the same call the host makes at the same moment in combScoutFlight().
      combLandFlight(combRoll);
      if (combRoll === 7) combPlay('waspRolled');
      const grid = combWireArr(p.produced, combPlayerCount, null);
      combLastProduced = grid.map(r => combWireArr(r, COMB_RES.length, 0).map(v => v | 0));
      const mine = combLastProduced[combLocalIdx()];
      if (mine.some(v => v)) combPlay('bloomYours');
      combRenderMeadow();
      return;
    }

    // ── The seven ─────────────────────────────────────────────────────────
    // owed[] and ready[] are BOTH reset values and BOTH erased in flight — the
    // exact collision spec §11 warns about. Rebuilt to seat length here, or a
    // client's gate reads undefined and its own owed count renders as blank.
    case 'COMB_OVERFLOW_BEGIN':
      combOverflowOwed  = combWireArr(p.owed,  combPlayerCount, 0).map(v => v | 0);
      combOverflowReady = combWireArr(p.ready, combPlayerCount, false).map(Boolean);
      combPhase = 'overflow';
      combOpenOverflow();                    // over-limit devices only; a no-op elsewhere
      combRenderMeadow();
      return;

    case 'COMB_OVERFLOW_DONE': {
      combShow('comb-overflow-overlay', false);
      combApplyCounts(p);
      combPlay('overflowDone');
      combPhase = p.phase || 'waspMove';
      // The host appended this line itself in combOverflowResolve(); a client
      // never ran that. Absent field = old-format packet → still log. A 7 where
      // nobody owed carries spilled:false and must NOT log — nothing spilled.
      const spilled = ('spilled' in p) ? !!p.spilled : true;
      if (spilled) combLogAppend('The hive spilled over.');
      combEnterWaspMove();                    // arms the Wasp for the active seat
      return;
    }

    // ── The Wasp ──────────────────────────────────────────────────────────
    case 'COMB_WASP_PLACED': {
      const first = p.victim === undefined || p.victim === null || p.victim < 0;
      combWaspHex = p.hexIdx | 0;
      combApplyCounts(p);
      if (first) combPlay('waspLands');
      // The sting is information the VICTIM needs and the table does not, and
      // the payload deliberately never says what was taken (spec §11).
      else if (combLocalIdx() === (p.victim | 0)) combPlay('waspStealsFromYou');
      combPhase = p.phase || combPhase;
      combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
      if (combPhase === 'waspSteal' && combIsMyTurn()) combOpenSteal();
      combRenderMeadow();
      return;
    }

    // ── The Waggle Dance ──────────────────────────────────────────────────
    // ⚠️ The client rebuilds the offer and starts NO TIMER. Expiry is the
    // authority's to act on; this device renders the same deadline off the same
    // timestamp and does nothing when it passes — the Daylight pattern exactly.
    // Two devices firing the expiry would resolve one offer twice.
    case 'COMB_TRADE_POSTED':
      combClearOffer();
      combOffer = {
        from: p.from | 0,
        to:   (typeof p.to === 'number') ? (p.to | 0) : -1,
        give: combWireArr(p.give, COMB_RES.length, 0).map(v => v | 0),
        want: combWireArr(p.want, COMB_RES.length, 0).map(v => v | 0),
        responses: combWireArr(p.responses, combPlayerCount, COMB_RESP_NONE).map(v => v | 0),
        expiresAt: Number(p.expiresAt) || 0,
      };
      combPlay('tradeArrives');
      combOpenOfferIfMine();
      combRenderMeadow();
      return;

    case 'COMB_TRADE_RESPONSES':
      if (!combOffer) return;
      combOffer.responses = combWireArr(p.responses, combPlayerCount, COMB_RESP_NONE).map(v => v | 0);
      if (combOffer.expiresAt && !combOfferAudience()
            .some(q => combOffer.responses[q] === COMB_RESP_NONE)) combOffer.expiresAt = 0;
      combRenderTrade();
      combRenderMeadow();
      return;

    case 'COMB_TRADE_RESOLVED':
      combClearOffer();
      combShow('comb-trade-offer-overlay', false);
      combShow('comb-trade-overlay', false);
      combApplyCounts(p);
      combPlay(p.ok ? 'tradeAccepted' : 'tradeFailed');
      // Only the two devices the deal was actually between are told why it did
      // not happen. The rest of the table watched it not happen.
      if (!p.ok && p.reason &&
          (combLocalIdx() === (p.a | 0) || combLocalIdx() === (p.b | 0))) {
        combShowTip('\u{1F41D}', 'No deal', [p.reason]);
      }
      combRenderMeadow();
      return;

    // ── The Instinct deck ─────────────────────────────────────────────────
    // ⚠️ The deck's LENGTH is public — the stack is on the table. Its ORDER
    // never is, and this is the second place that has to hold (BUG-06): a
    // client that rebuilt the deck here would know every unplayed card again.
    case 'COMB_INSTINCT_BOUGHT':
      combDeck = new Array(Math.max(0, p.deckLeft | 0)).fill('?');
      combPublicInstinct = combWireArr(p.instinctCounts, combPlayerCount, 0).map(v => v | 0);
      combApplyCounts(p);
      combPlay('instinctBought');
      // The buyer's own private COMB_INSTINCT_SYNC has already landed, which is
      // where the reveal reads the kind from — this packet deliberately has none.
      if (combLocalIdx() === (p.playerIdx | 0)) combShowInstinctReveal();
      combRenderMeadow();
      return;

    case 'COMB_INSTINCT_PLAYED': {
      const eff = p.effect || {};
      combPublicInstinct = combWireArr(p.instinctCounts, combPlayerCount, 0).map(v => v | 0);
      combApplyCounts(p);
      if (eff.guardsPlayed) {
        combGuardsPlayed = combWireArr(eff.guardsPlayed, combPlayerCount, 0).map(v => v | 0);
      }
      combInstinctPlayedThisTurn = true;
      combPlay(p.kind === 'guard' ? 'instinctGuard' : 'instinctPlayed');
      combShow('comb-instinct-overlay', false);
      combPhase = p.phase || combPhase;
      // The holders that a Guard Bee may have moved arrive in the
      // COMB_BOARD_UPDATE right behind this one — assigned, never recomputed.
      if (combPhase === 'waspMove') combEnterWaspMove();
      else combRenderMeadow();
      return;
    }

    // ── The turn ──────────────────────────────────────────────────────────
    // The Daylight clock arms HERE and nowhere else (§17-17 / DD-05): a turn
    // that opens on a 7 detours through three other people's Overflow taps
    // before it reaches the phase the clock is meant to pressure.
    case 'COMB_ACTIONS_BEGIN':
      combTurn  = p.playerIdx | 0;
      combPhase = p.phase || 'actions';
      combStartDaylightAt(p.endTimestamp);    // Number(), not `| 0` — see the helper
      combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
      combRenderMeadow();
      return;

    case 'COMB_TURN_BEGIN':
      combStopDaylight();
      combStopFlight();
      combClearOffer();
      combTurnNo = p.turnNo | 0;
      combTurn   = p.playerIdx | 0;
      combPhase  = p.phase || 'roll';
      combRoll   = null;
      combInstinctPlayedThisTurn = !!p.instinctPlayedThisTurn;
      combOverflowOwed  = combWireArr(p.owed,  combPlayerCount, 0).map(v => v | 0);
      combOverflowReady = combWireArr(p.ready, combPlayerCount, false).map(Boolean);
      combApplyCounts(p);
      combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
      combRenderMeadow();
      // The client's half of the cast. Wired at the SAME point as the host's
      // (combBeginTurn) — miss this half and one whole class of device never
      // sees the Sun Compass at all, which no harness would notice.
      combStartFlight();
      return;

    // ── The board changed ─────────────────────────────────────────────────
    case 'COMB_BOARD_UPDATE':
      combApplyNodes(p);
      combApplyCounts(p);
      combChainLen = combWireArr(p.chainLen, combPlayerCount, 0).map(v => v | 0);
      combSupply   = combWireArr(p.supply, COMB_RES.length, 0).map(v => v | 0);
      if (typeof p.freeWalls === 'number') combFreeWalls = p.freeWalls | 0;
      // ⚠️ Assigned, NOT recomputed. combRecomputeAchievements() would resolve a
      // tie by array order and silently move 4 points (§17-3, DD-03).
      combLargestHolder  = (typeof p.largestHolder  === 'number') ? p.largestHolder  : -1;
      combFiercestHolder = (typeof p.fiercestHolder === 'number') ? p.fiercestHolder : -1;
      combRenderMeadow();
      return;

    // ── The Season Log ────────────────────────────────────────────────────
    // Appended LOCALLY — combLogAppend() would re-broadcast, and on a client
    // that is a no-op today only because combBroadcast() checks the mode. Not
    // relying on that is one less thing to remember.
    case 'COMB_LOG_APPEND':
      if (!p.line) return;
      combLog.push(p.line);
      if (combLog.length > COMB_LOG_MAX) combLog.splice(0, combLog.length - COMB_LOG_MAX);
      return;

    // ── The end of the season ─────────────────────────────────────────────
    // The one moment hidden information becomes public: every player's Golden
    // Nectar count travels here and nowhere else in the match.
    case 'COMB_GAMEOVER':
      combStopDaylight();
      combStopFlight();
      combClearOffer();
      combPhase = 'gameover-pending';
      combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
      combLargestHolder  = (typeof p.largestHolder  === 'number') ? p.largestHolder  : -1;
      combFiercestHolder = (typeof p.fiercestHolder === 'number') ? p.fiercestHolder : -1;
      combGameover = {
        standings:    (p.standings || []).filter(Boolean),
        goldenNectar: combWireArr(p.goldenNectar, combPlayerCount, 0).map(v => v | 0),
        stats: { scoutFlights: (p.stats && p.stats.scoutFlights) | 0,
                 waspLandings: (p.stats && p.stats.waspLandings) | 0 },
        largestHolder: combLargestHolder, fiercestHolder: combFiercestHolder,
      };
      combPlay('win');
      combShowGameover();
      return;

    default:
      return;                                 // an action layer packet, not yet mine
  }
}

// The two rebuilds every applier above shares. Both exist so that "never assign
// a raw p.x collection field" is one call rather than a rule to remember at
// eighteen call sites.
function combApplyNodes(p) {
  const NODES = COMB_TOPOLOGY.nodes.length, EDGES = COMB_TOPOLOGY.nodesOfEdge.length;
  combNodes = combWireArr(p.nodes, NODES, null)
    .map(n => n ? { owner: n.owner | 0, level: n.level | 0 } : { owner: -1, level: 0 });
  combEdges = combWireArr(p.edges, EDGES, -1).map(v => v | 0);
}
function combApplyCounts(p) {
  if (!p.handCounts) return;                  // not every SYNC changes holdings
  combPublicCounts = combWireArr(p.handCounts, combPlayerCount, 0).map(v => v | 0);
}

// ⚠️ THE STRIP. combSerialiseState() carries EVERY seat's hand and Instinct
// collection by design — it is a local snapshot, not a packet. Putting it on the
// wire without removing the other seats' would hand one device the whole table's
// hidden information in a single message, which is the exact leak the private
// channel exists to prevent. This is the only function allowed to send it.
function combSendFullState(playerIdx) {
  if (window.syllyMultiplayerMode !== 'host') return;
  const state = combSerialiseState();
  const hand     = (state.hands    || [])[playerIdx] || [0, 0, 0, 0, 0];
  const instinct = (state.instinct || [])[playerIdx] || [];
  delete state.hands;
  delete state.instinct;
  // The COUNT is public — the stack sits on the table. The ORDER is not; sending
  // it would undo the masking COMB_MATCH_START does for exactly this reason.
  state.deck = new Array((state.deck || []).length).fill('?');
  combSendPrivateRepair(playerIdx, 'COMB_FULL_STATE', {
    state, hand, instinct, handCounts: combHandCounts(),
  });
}

// ── The state snapshot (spec §11, Appendix A5) ────────────────────────────
//
// ⚠️ A LOCAL SNAPSHOT, NOT A PACKET. It carries EVERY seat's hand and Instinct
// collection, because §4's Match group does and because "send the whole
// collection" is only cheap once a serialiser for that collection exists. Any
// caller putting this on the wire MUST strip every seat but the recipient's
// first — COMB_FULL_STATE is "this, plus that ONE device's private state".
//
// Contract: authoritative state only. No derived values (combChainLen, points)
// and no presentation state (combZoom, combPlacementMode, combLegalTargets, the
// how-to tab). A snapshot carrying derived data can be restored into a position
// that contradicts itself. combRng is excluded for the same reason: only the
// authority draws from it, and every result it produces already travels as an
// explicit value in a packet.
//
// Nothing calls this for reconnect in v1. It is built anyway because the
// loopback harness asserts host/client parity through it in one deep compare
// rather than field by field, and because it is the natural shape of the
// late-join path the opening draft needs regardless.
function combSerialiseState() {
  return {
    boardSeed: combBoardSeed,
    hexes: combHexes.map(h => ({ kind: h.kind, marker: h.marker })),
    nodes: combNodes.map(n => ({ owner: n.owner, level: n.level })),
    edges: combEdges.slice(),
    waspHex: combWaspHex,
    hands: combHands.map(h => h.slice()),
    instinct: combInstinct.map(cards =>
      cards.map(c => ({ kind: c.kind, boughtTurn: c.boughtTurn, played: c.played }))),
    deck: combDeck.slice(),
    supply: combSupply.slice(),
    turn: combTurn,
    turnNo: combTurnNo,
    phase: combPhase,
    roll: combRoll,
    guardsPlayed: combGuardsPlayed.slice(),
    largestHolder: combLargestHolder,
    fiercestHolder: combFiercestHolder,
    draftOrder: combDraftOrder.slice(),
    draftStep: combDraftStep,
    draftAnchor: combDraftAnchor,
    instinctPlayedThisTurn: combInstinctPlayedThisTurn,
    freeWalls: combFreeWalls,
    log: combLog.slice(),
    stats: { scoutFlights: combStats.scoutFlights, waspLandings: combStats.waspLandings },
  };
}

function combApplyState(s) {
  if (!s) return;
  const N = combPlayerCount || ((s.hands && s.hands.length) | 0);
  const NODES = COMB_TOPOLOGY.nodes.length, EDGES = COMB_TOPOLOGY.nodesOfEdge.length;
  combQuiet = true;                       // a restore earns no sounds and no log lines
  try {
    combBoardSeed = s.boardSeed | 0;
    combRng       = null;
    combHexes = combWireArr(s.hexes, 19, null)
      .map(h => h ? { kind: h.kind, marker: h.marker | 0 } : { kind: 'smoke', marker: 0 });
    combNodes = combWireArr(s.nodes, NODES, null)
      .map(n => n ? { owner: n.owner | 0, level: n.level | 0 } : { owner: -1, level: 0 });
    combEdges   = combWireArr(s.edges, EDGES, -1).map(v => v | 0);
    combWaspHex = (typeof s.waspHex === 'number') ? s.waspHex : -1;

    combHands = []; combInstinct = [];
    for (let p = 0; p < N; p++) {
      combSetHand(p, combWireArr((s.hands || [])[p], COMB_RES.length, 0));
      combSetInstinct(p, ((s.instinct || [])[p] || []).filter(Boolean));
    }

    combDeck   = (s.deck || []).slice();
    combSupply = combWireArr(s.supply, COMB_RES.length, 0).map(v => v | 0);
    combTurn   = s.turn   | 0;
    combTurnNo = s.turnNo | 0;
    combPhase  = s.phase || 'actions';
    combRoll   = (typeof s.roll === 'number') ? s.roll : null;
    combGuardsPlayed = combWireArr(s.guardsPlayed, N, 0).map(v => v | 0);
    combDraftOrder   = (s.draftOrder || []).slice();
    combDraftStep    = s.draftStep | 0;
    combDraftAnchor  = (typeof s.draftAnchor === 'number') ? s.draftAnchor : -1;
    combInstinctPlayedThisTurn = !!s.instinctPlayedThisTurn;
    combFreeWalls = s.freeWalls | 0;
    combLog   = (s.log || []).slice();
    combStats = { scoutFlights: (s.stats && s.stats.scoutFlights) | 0,
                  waspLandings: (s.stats && s.stats.waspLandings) | 0 };

    // Sized, not grown: a recompute only writes indices 0..combPlayerCount-1, so a
    // cache left over from a longer roster would keep stale trailing entries.
    combChainLen = new Array(N).fill(0);
    // The recompute rebuilds combChainLen, which is a CACHE and the only thing
    // in this function allowed to be derived…
    combRecomputeAchievements();
    // …and it must not overwrite the two values it was restored alongside.
    // ⚠️ Who holds Largest Comb depends on the ORDER chains grew in, and the
    // board cannot tell you that: two equal 5-chains recompute to a coin flip
    // worth 4 points. Both holders were RESTORED, not earned. This is spec §11's
    // "one subtle bit" and it has its own harness assertion.
    combLargestHolder  = (typeof s.largestHolder  === 'number') ? s.largestHolder  : -1;
    combFiercestHolder = (typeof s.fiercestHolder === 'number') ? s.fiercestHolder : -1;
  } finally {
    combQuiet = false;
  }
}
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
  if (combTurnTimer)   { clearInterval(combTurnTimer);       combTurnTimer   = null; }
  if (combOfferTimer)  { clearTimeout(combOfferTimer);       combOfferTimer  = null; }
  if (combFlightTimer) { clearTimeout(combFlightTimer);      combFlightTimer = null; }
  if (combRafHandle)   { cancelAnimationFrame(combRafHandle); combRafHandle  = null; }

  combHexes = []; combNodes = []; combEdges = []; combHands = []; combInstinct = [];
  combDeck = []; combSupply = []; combLog = []; combOffer = null;
  combWaspHex = -1; combTurn = 0; combTurnNo = 0; combPhase = 'draft'; combRoll = null;
  combLargestHolder = -1; combFiercestHolder = -1;
  combDraftOrder = []; combDraftStep = 0; combDraftAnchor = -1;
  combGuardsPlayed = []; combChainLen = []; combRng = null; combQuiet = false;
  combOverflowOwed = []; combOverflowReady = []; combInstinctPlayedThisTurn = false;
  combPublicCounts = []; combPublicInstinct = []; combGameover = null;
  combTurnEndTs = 0; combDaylightArmed = false; combFreeWalls = 0;
  combBuildPickerOpen = false; combPendingCardIdx = -1;
  combDraftGive = [0, 0, 0, 0, 0]; combDraftWant = [0, 0, 0, 0, 0];
  combDraftTo = -1; combBankPick = -1; combBloomPick = [];
  combOverflowPick = [0, 0, 0, 0, 0];
  combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
  combMapOpen = false; combMapScrollTo = null; combZoom = 1; combPanX = 0; combPanY = 0;
  combLastProduced = null;
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

  // ── Lobby entry, the four menu buttons, and the two overlays a player can
  //    reach from the menu. The exit paths (quit overlay, post-game ✕, ← Back to
  //    the Box) follow below, then everything that needs match state to exist.
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Lobby entry — the exact suite pattern. activeGameId is what drives
  // updateSliderTheme, getMuteToggleOnClass and Music.playFor, so it is set
  // BEFORE the showScreen that triggers them.
  on('btn-comb', () => { playLaunch(); activeGameId = 'comb'; combShowMenu(); });

  // ── Game menu ──
  // Dual context (logic-engine.md § Multiplayer-only game routing): this CTA is
  // shown once before the lobby exists, and again by onPassThePhone once the
  // lobby is fully configured — so it must branch on the mode, not assume one.
  on('btn-comb-menu-play', () => {
    playLaunch();
    // Post-lobby: onPassThePhone has already populated the roster and shown this
    // menu again, so the tap starts the match. Pre-lobby (the only other case,
    // this game being MDLM-only): create or join a room first.
    if (window.syllyMultiplayerMode === 'host') { combStartMatchLocal(); return; }
    if (window.syllyMultiplayerMode === 'client') { combShowClientStandby(); return; }
    mpShowModeScreen('comb');
  });

  on('btn-comb-menu-how-to', () => { playDone(); combOpenHowTo('rules'); });

  on('btn-comb-menu-settings', () => {
    playDone();
    const ov = document.getElementById('comb-settings-overlay');
    if (!ov) return;
    // .overlay-data-inner, NOT .overflow-y-auto — see combOpenHowTo above.
    const inner = ov.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    combSyncSettingsUI();
    ov.style.display = 'flex';
  });

  // ── Overlay dismissal. Each id ends in a `close` segment, which is also what
  //    lets the engine's delegated backdrop tap-to-dismiss find and click it —
  //    that listener needs a real handler here or the backdrop tap no-ops.
  on('btn-comb-settings-close', () => {
    playDone();
    document.getElementById('comb-settings-overlay').style.display = 'none';
  });

  // ── Settings pills — seven cards, one bind helper. Every handler repaints
  //    ALL seven cards via combSyncSettingsUI() rather than just its own —
  //    the structural fix for spec §5's trap (The Season presets two other
  //    cards; a partial repaint would leave them stale). The Season alone
  //    routes through combApplySeasonPreset(); the other six set their own
  //    variable only, per spec: "The Season is NOT changed and NOT un-set."
  const combBindSettingPill = (group, fn) => {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(pill => {
      pill.addEventListener('click', () => {
        playPillClick();
        fn(pill.getAttribute('data-val'));
        combSyncSettingsUI();
      });
    });
  };
  combBindSettingPill('comb-season',   v => combApplySeasonPreset(v));
  combBindSettingPill('comb-layout',   v => { combLayout   = v; });
  combBindSettingPill('comb-wasp',     v => { combWasp     = v; });
  combBindSettingPill('comb-overflow', v => { combOverflow = v; });
  combBindSettingPill('comb-waggle',   v => { combWaggle   = v; });
  combBindSettingPill('comb-daylight', v => { combDaylight = v; });
  combBindSettingPill('comb-bounty',   v => { combBounty   = v; });

  // ── How to Play: the tab bar, and one close button per tab body so "Got it" is
  //    always reachable from the bottom of whichever tab is being read.
  document.querySelectorAll('[data-comb-howto-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      combOpenHowTo(btn.dataset.combHowtoTab);
    });
  });
  ['btn-comb-howto-close', 'btn-comb-howto-close-comb', 'btn-comb-howto-close-instinct']
    .forEach(id => on(id, () => {
      playDone();
      document.getElementById('comb-how-to-overlay').style.display = 'none';
    }));

  // The in-game header [?] and the hand row's inline [?] both open the SAME
  // overlay — the second pre-selected on The Comb tab (spec §8 / brief §15
  // surface 3: one existing function call, never a second overlay).
  on('btn-comb-how-to',   () => { playDone(); combOpenHowTo('rules'); });
  on('btn-comb-hand-ref', () => { playDone(); combOpenHowTo('comb'); });

  // The shared tip overlay's dismiss. Without a handler here the engine's
  // delegated backdrop tap-to-dismiss finds the button and clicks it to no
  // effect — the overlay would be un-closable by backdrop tap.
  on('btn-comb-tip-close', () => { playDone(); combShow('comb-tip-overlay', false); });

  // ── The Sun Compass: tap the die out of the air ──
  on('comb-float-layer', () => combSkipFlight());

  // ── The magnifier, and the two board surfaces' shared tap path ──
  on('btn-comb-map-open',  () => { playDone(); combOpenMap(); });
  on('btn-comb-map-close', () => { playDone(); combCloseMap(); });

  // A tap on EITHER canvas routes through the same nearest-target snap and the
  // same combAttemptPlace — one placement function, so the magnifier can never
  // become a second source of board truth (spec §2).
  ['comb-board-canvas', 'comb-map-canvas'].forEach(id => {
    const c = document.getElementById(id);
    if (!c) return;
    c.addEventListener('click', ev => {
      if (!combPlacementMode) return;
      const rect = c.getBoundingClientRect();
      const isMap = id === 'comb-map-canvas';
      const tr = combTransform(rect.width, rect.height,
        isMap ? { zoom: combZoom, panX: combPanX, panY: combPanY } : null);
      const hit = combNearestTarget(ev.clientX - rect.left, ev.clientY - rect.top, tr);
      if (hit === null) return;
      combPendingTarget = hit;
      playPillClick();
      combRenderMeadow();
    });
  });

  on('btn-comb-place-cancel', () => {
    playDone();
    combPlacementMode = null; combLegalTargets = []; combPendingTarget = null;
    combRenderMeadow();
  });
  on('btn-comb-place-confirm', () => {
    if (combPendingTarget === null) return;
    const kind = combPlacementMode, target = combPendingTarget;
    const res = combAttemptPlace(kind, target);
    if (!res.ok) {
      playBoing();
      if (res.reason) combShowTip('\u{1F41D}', 'Not there', [res.reason]);
      return;
    }
    // A client's tap was a REQUEST, not a placement — nothing has changed on any
    // device yet. Drop the preview and wait: COMB_DRAFT_STATE / COMB_BOARD_UPDATE /
    // COMB_WASP_PLACED is what re-arms this board, and a rejected request comes
    // back as a private COMB_FULL_STATE rather than as silence.
    if (res.sent) {
      playSuccess();
      combPendingTarget = null;
      combRenderMeadow();
      return;
    }
    playSuccess();
    // ⚠️ Do NOT blanket-clear placement mode here. During the draft the applier
    // has ALREADY re-armed it for the next piece — a cell arms its wall — and
    // clearing it strands the player on a lit board with no mode and no way to
    // finish the step. Outside the draft nothing re-arms, so the clear is still
    // right there; combArmDraftPlacement() does the correct thing in both cases.
    if (combPhase === 'draft') combArmDraftPlacement();
    else { combPlacementMode = null; combLegalTargets = []; combPendingTarget = null; }
    if (combMapOpen) combCloseMap();      // the map closes on a successful place
    combRenderMeadow();
  });

  // End Turn. combTurn rather than combLocalIdx() is deliberate and identical in
  // the real game: the guard above has already established they are the same
  // seat, and passing combTurn is what lets the chunk-3 scaffold drive all four.
  on('btn-comb-end-turn', () => {
    if (combPhase !== 'actions') return;
    if (window.syllyMultiplayerMode !== 'single' && !combIsMyTurn()) return;
    if (window.syllyMultiplayerMode === 'client') {
      playDone();
      combSendAction('COMB_END_TURN', { playerIdx: combLocalIdx() });
      return;
    }
    const res = combEndTurn(combTurn);
    if (!res.ok) {
      playBoing();
      if (res.reason) combShowTip('\u{1F41D}', 'Not yet', [res.reason]);
      return;
    }
    playDone();
  });

  // ── STEP 5 CHUNK 5 — the action layer's controls ──────────────────────────

  // Build is now two steps: WHICH KIND here, WHERE on the board after. The
  // picker is inline rather than an overlay because the board must stay visible
  // while you choose what to put on it (§17-4).
  on('btn-comb-build', () => {
    if (!combIsMyTurn() || combPhase !== 'actions') return;
    playDone();
    combOpenBuildPicker();
  });
  on('btn-comb-build-cancel', () => { playDone(); combCloseBuildPicker(); });

  // ── The Waggle Dance ──
  on('btn-comb-waggle', () => {
    if (!combIsMyTurn() || combPhase !== 'actions') return;
    playDone();
    combOpenTrade();
  });
  on('btn-comb-trade-post', () => {
    if (combOffer) return;
    const res = combAttemptPost(combDraftTo, combDraftGive.slice(), combDraftWant.slice());
    if (!res.ok) {
      playBoing();
      const err = document.getElementById('comb-trade-error');
      if (err && res.reason) { err.textContent = res.reason; err.style.display = 'block'; }
      const btn = document.getElementById('btn-comb-trade-post');
      // §7 names the trade post as one of exactly two places a tap is REJECTED
      // rather than prevented, and therefore one of the two that shake.
      if (btn) { btn.classList.remove('comb-shake'); void btn.offsetWidth; btn.classList.add('comb-shake'); }
      return;
    }
    playLaunch();
    // A client's post is a request: COMB_TRADE_POSTED is what turns this overlay
    // into the answer board, on the poster's device along with everyone else's.
    if (res.sent) { combShow('comb-trade-overlay', false); return; }
    combRenderTrade();
  });
  on('btn-comb-trade-cancel', () => {
    // Two jobs, one button: "Never mind" backs out of the builder, "Call it off"
    // withdraws a live offer — and only the second one is a packet.
    if (combOffer && combOffer.from === combLocalIdx()) {
      playExit();
      combRejected(combAttemptCancelOffer());
      return;
    }
    playDone();
    combShow('comb-trade-overlay', false);
  });
  on('btn-comb-offer-accept', () => {
    playLaunch();
    combShow('comb-trade-offer-overlay', false);
    combRejected(combAttemptRespond(true));
  });
  on('btn-comb-offer-decline', () => {
    playDone();
    combShow('comb-trade-offer-overlay', false);
    combRejected(combAttemptRespond(false));
  });

  // ── The Instinct deck ──
  on('btn-comb-buy', () => {
    if (!combIsMyTurn() || combPhase !== 'actions') return;
    const res = combAttemptBuy();
    if (combRejected(res)) return;
    playDone();
  });
  on('btn-comb-instinct', () => { playDone(); combOpenInstinct(); });
  on('btn-comb-instinct-close', () => {
    playDone();
    combShow('comb-instinct-overlay', false);
  });
  on('btn-comb-reveal-done', () => {
    playDone();
    combShow('comb-instinct-reveal-overlay', false);
  });
  on('btn-comb-bloom-confirm', () => {
    if (combBloomPick.length !== 2) { playBoing(); return; }
    playLaunch();
    combShow('comb-bloom-overlay', false);
    const idx = combPendingCardIdx; combPendingCardIdx = -1;
    combRejected(combAttemptPlayInstinct(idx, { picks: combBloomPick.slice() }));
  });

  // ── The Overflow ──
  on('btn-comb-overflow-confirm', () => {
    const me = combLocalIdx();
    const owed = combOverflowOwed[me] | 0;
    const picked = combOverflowPick.reduce((a, b) => a + b, 0);
    if (picked !== owed) {
      playBoing();
      const btn = document.getElementById('btn-comb-overflow-confirm');
      // The other of §7's two shake sites.
      if (btn) { btn.classList.remove('comb-shake'); void btn.offsetWidth; btn.classList.add('comb-shake'); }
      return;
    }
    playDone();
    const discard = combOverflowPick.slice();
    combShow('comb-overflow-rows', false);
    combShow('comb-overflow-waiting', true, 'block');
    combEnable('btn-comb-overflow-confirm', false);
    if (window.syllyMultiplayerMode === 'client') {
      combSendAction('COMB_OVERFLOW_SUBMIT', { playerIdx: me, discard });
      return;
    }
    // ⚠️ The host marks its OWN slot by calling the applier directly, never by
    // sending itself an ACTION — mpHandleEnvelope drops every self-originated
    // envelope, so a self-sent submission leaves the seven hanging forever
    // (logic-engine.md § Host readyCheck).
    combRejected(combSubmitOverflow(me, discard));
  });

  // ── The Season Log ──
  on('btn-comb-log', () => { playDone(); combOpenLog(); });
  on('btn-comb-log-close', () => {
    playDone();
    combShow('comb-log-overlay', false);
  });

  // ── STEP 4 — exit routing. Quit overlay, post-game ✕, ← Back to the Box, and
  //    the play-again confirm. No game logic depends on any of these paths, so
  //    they are wired now rather than left for Step 5 (ui-style.md § Global UI
  //    Protocol rule 3 + logic-engine.md § Mid-Game Quit Contract).
  on('btn-comb-menu-back', () => { playExit(); resetToLobby(); });

  // Mid-game ✕ → quit overlay. `.btn-comb-quit-open` is a class, not an id — it
  // is on both screen-comb-standby's header and screen-comb-meadow's header, and
  // a delegated class query catches both without a second listener block.
  document.querySelectorAll('.btn-comb-quit-open').forEach(btn =>
    btn.addEventListener('click', () => {
      playDone();
      const ov = document.getElementById('comb-quit-overlay');
      if (ov) ov.style.display = 'flex';
    }));
  on('btn-comb-quit-cancel', () => {
    playDone();
    const ov = document.getElementById('comb-quit-overlay');
    if (ov) ov.style.display = 'none';
  });
  on('btn-comb-quit-confirm', () => {
    playExit();
    const ov = document.getElementById('comb-quit-overlay');
    if (ov) ov.style.display = 'none';
    // § Timer Lifecycle wants the quit-confirm handler to own the clear itself,
    // not to rely on resetToLobby()'s combResetState() alone — CLD's cldStopLoop()
    // call here is the reference. Both the Daylight interval and the Scout Flight
    // timeout would otherwise fire once against the lobby's state.
    combStopDaylight();
    combStopFlight();
    combClearOffer();
    if (window.syllyMultiplayerMode !== 'single') {
      // One device leaving mid-game dissolves the session for everyone
      // (Mid-Game Quit Contract) — never navigate to the game menu from here.
      if (typeof mpNotifyPlayerLeft === 'function') mpNotifyPlayerLeft();
      resetToLobby();
      return;
    }
    resetToLobby();
  });

  // Post-game ✕ and ← Back to the Box both go straight out — the match is
  // over, so there is no state left worth preserving.
  on('btn-comb-go-exit',  () => { playExit(); resetToLobby(); });
  on('btn-comb-go-leave', () => { playExit(); resetToLobby(); });

  // Play Again ALWAYS goes through the confirmation modal — never a direct
  // restart (ui-style.md § Play Again Confirmation). Confirm label is dynamic
  // per the Play-Again Return Pattern (logic-engine.md).
  on('btn-comb-go-new', () => {
    playDone();
    const btn = document.getElementById('btn-comb-new-confirm');
    if (btn) btn.textContent = window.syllyMultiplayerMode === 'client' ? 'Leave Session'
                             : window.syllyMultiplayerMode === 'host'   ? 'Restart in Lobby 🔄'
                             : 'New Season';
    const ov = document.getElementById('comb-new-season-overlay');
    if (ov) ov.style.display = 'flex';
  });
  on('btn-comb-new-cancel', () => {
    playDone();
    const ov = document.getElementById('comb-new-season-overlay');
    if (ov) ov.style.display = 'none';
  });
  on('btn-comb-new-confirm', () => {
    playLaunch();
    const ov = document.getElementById('comb-new-season-overlay');
    if (ov) ov.style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; }
    combStartMatchLocal();
  });
});
