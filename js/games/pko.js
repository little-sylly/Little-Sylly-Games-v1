// ═══════════════════════════════════════════════════════════════════════════
// Pecking Order (pko) — adjacency-based climbing/shedding card game. "Who eats
// whom" replaces numeric rank: a Leopard beats a Mongoose because Leopard is
// Mongoose's actual predator. MDLM-only, 3–6 players, host-authoritative,
// host-as-participant. Private Hoards via mpSendPrivate (FLW model).
// Sylly Mode = Force of Nature — PHASE 2; the setting exists but nothing branches on it.
// Spec: docs/new-game-tech-pecking-order.md  (Stage 2 confirmed 31 July 2026)
// Depends on: engine.js (showScreen, play*, shuffle, resetToLobby, activeGameId,
//             openSoundOverlay), engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots,
//             mpSendEnvelope, mpSendPrivate, mpReturnToLobby, mpLockSync,
//             window.syllyMultiplayerMode, mpMyPlayerIdx), secret-mode.js (assetFace/assetBack)
// SCAFFOLD STAGE (Protocol B Step 2): state + named stubs. Logic injected per spec §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ─────────────────────────────────
let pkoClashTarget    = 3;            // 3 | 5 | 7      — Clashes to Win
let pkoHoardSize      = 12;           // 10 | 12 | 15   — cards dealt per player
let pkoPoacherSetting = 'perPlayer';  // 'none' | 'flat3' | 'perPlayer'
let pkoScavenge       = false;        // draw 1 from the Reserve on Retreat
let pkoStartSmall     = 'match';      // 'off' | 'match' | 'clash' — Small Fry: opener must Stake their smallest
let pkoAppetite       = 'sated';      // 'sated' | 'ravenous' — how far down the chain a predator reaches.
                                      // Ships defaulting to 'sated' (the strict chain) so playtest
                                      // round 3 measures Swarm against a known baseline; 'ravenous'
                                      // is the table-side A/B dial. See the round-2 plan.
let pkoSyllyMode      = false;        // Force of Nature — PHASE 2; wired but inert in v1 (spec §12/§16 Q7)

// ── Roster (from mpPlayerSlots — no setup screen, MDLM only) ───────────────
let pkoPlayerCount    = 0;
let pkoPlayerNames    = [];           // from mpPlayerSlots[i].nickname — never .name

// ── Match state (reset each play-again) ───────────────────────────────────
let pkoScores         = [];           // int per player — Clashes won
let pkoClashNum       = 0;
let pkoClashHistory   = [];           // [[1,0,0,0], ...] one row per Clash — drives the Hierarchy grid

// ── Clash state (reset each Clash) ────────────────────────────────────────
let pkoHoards         = [];           // HOST ONLY: array of arrays of card ids (all players)
let pkoMyHoard        = [];           // THIS DEVICE: own card ids — the only hand a client ever holds
let pkoHoardCounts    = [];           // public: int per player, mirrored to every device
let pkoReserve        = [];           // HOST ONLY: undealt card ids
let pkoWateringHole   = [];           // BATCH records { enc, cards[] } — one per spent board, so the
                                      // pile stays grouped by the play that spent it. Host-authored,
                                      // mirrored to every device (public: every card in it was
                                      // face-up on the board). Total via pkoHoleCount().
let pkoLeaderIdx      = 0;            // opens the current Encounter
let pkoEncounterNum   = 0;
let pkoTrail          = [];           // [{ enc, entries: [...] }] — match log, rebuilt each Clash
let pkoHoardReady     = [];           // readyCheck matrix for the deal screen

// ── Encounter state (reset each Encounter) ────────────────────────────────
let pkoMarks          = [];           // array of card ids — ALWAYS one id per Mark, never nested
let pkoMarkOwnerIdx   = -1;           // who owns the current board (last successful play)
let pkoTurnIdx        = 0;            // whose turn it is
let pkoRetreatedSince = [];           // bool per player — resets on every board change

// ── Turn / UI state ───────────────────────────────────────────────────────
let pkoDraft          = [];           // Challenge builder: an ARRAY of fan positions per Mark — same
                                      // length as pkoMarks. [] = unanswered, 1 = a predator answer,
                                      // 2 = a Swarm. Never longer (pkoAnswers enforces it).
let pkoSelectedSlot   = -1;           // Method A: selected Mark slot, -1 = none
let pkoStakeSel       = [];           // Stake builder: selected card ids (same species)
let pkoChain          = null;         // loaded data/pko-data.json, keyed by id
let pkoBeatenByMap    = {};           // id -> Set(predator ids)  — straight from the data file
let pkoBeatsMap       = {};           // id -> Set(prey ids)      — DERIVED at load, never stored
// The Ravenous pair. Both are deterministic from the data file, so BOTH are built once at load
// and pkoAppetite only chooses between them — changing the setting never reloads the chain.
let pkoBeatenByWide   = {};           // id -> Set(predator ids)  — beaten_by ∪ reach_beaten_by
let pkoBeatsWideMap   = {};           // id -> Set(prey ids)      — DERIVED, never stored
let pkoUnchallengedTimer = null;      // auto-advance handle on the interstitial (cleared in 3 places)

// ── Constants ─────────────────────────────────────────────────────────────
const PKO_POACHER_ID  = 'human';      // the Poacher card's chain id
// The small card footprint — shared by pkoRenderCard's 'sm' size and the empty
// Challenge slots, so a slot and the card that lands in it can never differ.
const PKO_SM_CSS      = 'width:3.25rem;height:4.4rem;';
// Prey rank for Small Fry (the opener rule). Land and sea run as parallel ladders, so
// Mouse and Fish are BOTH rank 1 and either satisfies the rule. Deliberately NOT derived
// from beaten_by — the chain contains cycles (Bee beats Elephant, Orca⇄Stingray), so it
// has no well-defined depth. Bee, Eagle, Stingray and the Poacher are UNRANKED on purpose:
// they sit outside the size ladder, so they never force the rule and never satisfy it.
const PKO_PREY_RANK   = {
  mouse:  1, fish:       1,
  mongoose: 2, octopus:  2,
  leopard: 3, seal:      3,
  bear:    4, polar_bear: 4,
  elephant: 5, orca:     5,
};
// Card art is resolved through js/lib/art.js — assetFace('pko', id) / assetBack('pko'),
// backed by the core art pack data/art/pko/pack.json. The manifest owns the id →
// filename mapping, so no lookup table lives here.

// ── Chain loading & the single-source predicate ───────────────────────────

// Loads data/pko-data.json into pkoChain + pkoBeatenByMap, then DERIVES pkoBeatsMap
// by inverting beaten_by. The data file never stores `beats` (storing both drifts).
// Idempotent — safe to call from lobby entry and again from pkoStartSession().
async function pkoLoadChain() {
  if (pkoChain) return;
  const entries = await fetch('data/pko-data.json').then(r => r.json());

  pkoChain = {};
  pkoBeatenByMap = {}; pkoBeatsMap     = {};
  pkoBeatenByWide = {}; pkoBeatsWideMap = {};
  entries.forEach(e => {
    const reach = e.reach_beaten_by || [];
    pkoChain[e.id]        = e;
    pkoBeatenByMap[e.id]  = new Set(e.beaten_by);
    pkoBeatenByWide[e.id] = new Set([...e.beaten_by, ...reach]);
    pkoBeatsMap[e.id]     = pkoBeatsMap[e.id]     || new Set();  // every id gets an entry,
    pkoBeatsWideMap[e.id] = pkoBeatsWideMap[e.id] || new Set();  // empty if it eats nothing
  });
  // DERIVE the forward maps: X is in beaten_by of Y  ⇒  X beats Y. Ravenous folds in the
  // two-tier `reach_beaten_by` edges; Sated ignores them entirely.
  entries.forEach(e => {
    e.beaten_by.forEach(p => { pkoBeatsMap[p].add(e.id); pkoBeatsWideMap[p].add(e.id); });
    (e.reach_beaten_by || []).forEach(p => pkoBeatsWideMap[p].add(e.id));
  });

  // Core art resolves asynchronously at boot (js/lib/art.js). Awaiting it here means
  // the first Hoard render already has illustrated faces instead of a one-off emoji
  // flash. artReady never rejects — art.js catches internally — so this cannot block.
  if (typeof artReady !== 'undefined') await artReady;
}

// The active predator set for a Mark, under the current Appetite. Every "what beats this?"
// question — combat, builder highlighting, the chain overlay's Animals tab — reads through
// here, so Sated and Ravenous can never disagree with each other at a single call site.
function pkoPredators(markId) {
  return (pkoAppetite === 'ravenous' ? pkoBeatenByWide : pkoBeatenByMap)[markId];
}

// The ONLY place "does A beat B?" is decided — builder highlighting, confirm gating,
// host re-validation, Stampede availability. Phase 2's Great Reversal is a one-line
// inversion here, not an edit at every call site. No track check: track-locking is emergent.
function pkoBeats(markId, cardId) {
  // The Poacher wins any one Mark outright — a wildcard rule, not a chain lookup.
  // Tested FIRST so it also clears a Poacher-Mark left on the board (spec §16 Q1a).
  if (cardId === PKO_POACHER_ID) return true;
  const predators = pkoPredators(markId);
  return !!(predators && predators.has(cardId));
}

// ── Per-slot legality — the Swarm predicate ───────────────────────────────
// Does this GROUP of cards legally answer one Mark? The only place a slot's legality is
// decided: builder highlighting, the confirm gate, and the host's re-validation all call it.
//   1 card  → the chain (pkoBeats).
//   2 cards → a SWARM: two of the Mark's OWN species. Each becomes a Mark of its own, so a
//             slot still only ever holds one card — which is why the v6 "how deep is a
//             swarmed slot?" ambiguity that cut this mechanic cannot arise here.
// Exactly 2, never more: it mirrors Stampede's exact pkoMarks.length + 1 and stops a player
// dumping five cards onto one Mark to build an unanswerable board.
function pkoAnswers(markId, cards) {
  if (!Array.isArray(cards)) return false;
  if (cards.length === 1) return pkoBeats(markId, cards[0]);
  if (cards.length !== 2) return false;
  // Poacher is solo-only (brief v6): it can neither Swarm nor be Swarmed.
  if (markId === PKO_POACHER_ID) return false;
  return cards.every(c => c === markId && c !== PKO_POACHER_ID);
}

// ── Small Fry: the opener rule ────────────────────────────────────────────
// Is the CURRENT board state an opening Stake that Small Fry constrains? The rule only
// ever bites on an empty board, and only on the Encounter the setting names.
function pkoSmallFryActive() {
  if (pkoStartSmall === 'off' || pkoMarks.length) return false;
  if (pkoStartSmall === 'clash') return pkoEncounterNum === 1;   // every fresh deal opens low
  return pkoClashNum === 1 && pkoEncounterNum === 1;             // 'match' — the very first Stake
}

// Which species may open, given a Hoard — or null when anything goes. Takes the hoard as
// an argument (never reads pkoMyHoard) so the host can re-validate a CLIENT's Stake against
// the authoritative mirror, exactly like pkoHoldsAll.
// Returns null — not an empty set — when the Hoard holds no ranked animal at all, so a hand
// of pure Bee/Eagle/Stingray/Poacher can still open instead of deadlocking the Encounter.
function pkoOpenerSpecies(hoard) {
  if (!pkoSmallFryActive()) return null;
  const ranks = (hoard || []).map(c => PKO_PREY_RANK[c]).filter(r => r !== undefined);
  if (!ranks.length) return null;
  const lowest = Math.min(...ranks);
  return new Set((hoard || []).filter(c => PKO_PREY_RANK[c] === lowest));
}

// Builds the Pool for n players. Totals must be 110 / 146 / 183 / 219 at n=3/4/5/6
// under default settings. Eagle uses Math.ceil(1.5 * n) — never Math.round.
function pkoBuildPool(n) {
  const pool = [];
  Object.values(pkoChain || {}).forEach(e => {
    if (e.force_of_nature_only) return;              // Mimic, when Phase 2 lands
    let count;
    if (e.id === PKO_POACHER_ID) {
      // The Poacher ignores its copy_formula — the setting owns the count.
      count = pkoPoacherSetting === 'none'  ? 0
            : pkoPoacherSetting === 'flat3' ? 3
            : n;
    } else if (e.copy_formula === '1.5n') {
      count = Math.ceil(1.5 * n);                    // 5 / 6 / 8 / 9 — ceil, NOT round
    } else {
      count = parseFloat(e.copy_formula) * n || n;   // '4n'/'3n'/'2n' → 4n/3n/2n; 'n' → n
    }
    for (let i = 0; i < count; i++) pool.push(e.id);
  });
  return shuffle(pool);
}

// ── Render seam — ALL card DOM is built here, nowhere else ────────────────
// A bypass is unskinnable (DYB's old cup-die bypass is the cautionary case).
// opts: { faceDown, size, alpha (Phase 2), selected, dimmed }
function pkoRenderCard(id, opts = {}) {
  const el = document.createElement('div');
  el.dataset.cardId = id;                             // handlers read the id, never an index
  // The CSS ships one card size; 'sm' shrinks it for the Marks row and the Trail.
  const small = opts.size === 'sm' ? PKO_SM_CSS : '';

  if (opts.faceDown) {
    el.className = 'pko-card-back';
    const back = (typeof assetBack === 'function') && assetBack('pko');
    el.style.cssText = small
      + (back ? 'background:none;background-size:cover;background-position:center;background-image:url("' + back + '");' : '');
    return el;
  }

  const entry = (pkoChain && pkoChain[id]) || {};
  const track = entry.track === 'sea' ? ' pko-card-sea' : entry.track === 'wild' ? ' pko-card-wild' : '';
  const state = (opts.selected ? ' pko-card-selected' : '');

  // Three-tier art (skin → core art → emoji) resolves inside assetFace — see js/lib/art.js.
  const faceUrl = (typeof assetFace === 'function') && assetFace('pko', id);
  if (faceUrl) {
    el.className = 'pko-card pko-card-asset' + track + state;
    el.style.cssText = small + 'background-image:url("' + faceUrl + '");' + (opts.dimmed ? 'opacity:0.35;' : '');
    return el;
  }

  // Emoji fallback — the shipped look is illustrated, but the seam must never depend on art.
  el.className = 'pko-card' + track + state;
  el.style.cssText = small + (opts.dimmed ? 'opacity:0.35;' : '');
  const emoji = document.createElement('span');
  emoji.className = 'pko-card-emoji';
  emoji.textContent = entry.emoji || '';
  const name = document.createElement('span');
  name.className = 'pko-card-name';
  name.textContent = entry.name || id;                // degrade to the id, never throw
  el.append(emoji, name);
  return el;
}

// ── Helpers ───────────────────────────────────────────────────────────────
// This device's seat. MDLM-only, so mpMyPlayerIdx is the answer; the `single`
// fallback exists purely for the dev path. mpMyPlayerIdx is a top-level `let` in
// engine-multiplayer.js — NOT on window. Never write window.mpMyPlayerIdx.
function pkoMyIdx() { return (window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0); }

// Hoard display order: chain order from the data file (land chain, sea chain, Poacher
// last), so a player's fan reads the same way the chain overlay does.
function pkoSortHoard(ids) {
  const order = Object.keys(pkoChain || {});
  return [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

// Collapses a SORTED Hoard into runs of one species. Positions are indices into that
// sorted list — the same coordinate pkoStakeSel and pkoDraft speak (DD-12/DD-16).
function pkoGroupHoard(sorted) {
  const groups = [];
  sorted.forEach((id, pos) => {
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.positions.push(pos);
    else groups.push({ id, positions: [pos] });
  });
  return groups;
}

// Overlap layout. A flat fan of 15 cards is ~1000px inside a ~310px column, so cards
// overlap — HEAVILY within a species (duplicates are interchangeable; you only need to
// see that there are several) and LIGHTLY between species (each species has to stay
// identifiable at a glance). If the ideal strides still don't fit, both shrink together
// toward a floor, so the fan fits the column instead of scrolling.
// Reads the card width from the DOM rather than PKO_SM_CSS/.pko-card, so a CSS change
// can never desync the maths from the render.
function pkoLayoutFan(el) {
  if (!el) return;
  const cards = [...el.children];
  if (!cards.length) return;
  const W = cards[0].offsetWidth;
  const H = cards[0].offsetHeight;
  const avail = el.clientWidth;
  // Laid out while the screen was still display:none — measure again once it's on screen.
  if (!W || !avail) { requestAnimationFrame(() => pkoLayoutFan(el)); return; }

  const n = cards.length;
  const g = cards.filter(c => c.dataset.groupStart === '1').length;

  // Fan geometry first, because the rotation decides how much WIDTH the strides may use.
  const span = Math.min(26, Math.max(10, 44 - n * 1.6));   // total degrees across the fan
  const mid  = (n - 1) / 2;
  const step = n > 1 ? span / (n - 1) : 0;
  const half = (span / 2) * Math.PI / 180;

  // `transform: rotate()` does NOT change an element's layout box, but it DOES create visual
  // overflow — and both fans are `overflow-x-auto`, so an unaccounted sweep shows up as a
  // scrollbar even when the margin maths fits the row exactly. Reserve the real sweep:
  // rotating the outermost card about its bottom centre throws its top corner out by
  // roughly H·sin(span/2), on each side.
  const sweep = 2 * H * Math.sin(half);
  const A = Math.max(W, avail - sweep - 6);

  // Strides are tighter than a flat fan needs, because the rotation now supplies the visual
  // separation between groups that the wider gaps used to. Target: Hoard 12 never scrolls.
  let sw = 0.16 * W;                          // within species  — heavy overlap
  let sb = 0.50 * W;                          // between species — light overlap
  const needed = W + (n - g) * sw + (g - 1) * sb;
  if (needed > A) {
    const scale = (A - W) / (needed - W);
    sw = Math.max(sw * scale, 0.09 * W);
    sb = Math.max(sb * scale, 0.22 * W);
  }
  // A real hand fans: each card is rotated a little about a pivot BELOW the fan, so the
  // arc's chord is the row and the tops splay apart. That splay is the point — it gives a
  // duplicate group visibly separate tops to aim at instead of a flat stack of slivers.
  // The span narrows as the hand grows so a 15-card Hoard doesn't sweep a half-circle.
  const LIFT = 10;                            // selection lift, in px
  cards.forEach((c, i) => {
    c.style.marginLeft = i === 0
      ? '0px'
      : `-${Math.round(W - (c.dataset.groupStart === '1' ? sb : sw))}px`;
    // Explicit paint order. Negative margins make this load-bearing, and `opacity` on a
    // dimmed card creates its own stacking context — without a z-index a spent card would
    // paint over the live one to its right.
    c.style.position = 'relative';
    c.style.zIndex   = String(c.classList.contains('pko-card-selected') ? 100 + i : i + 1);

    // ONE source of truth for `transform` per card. The selection lift lives here rather
    // than in .pko-card-selected, because a class-level transform would clobber the angle.
    const deg  = (i - mid) * step;
    const rise = Math.abs(i - mid) * 0.9;                  // arc sag, in px
    const lift = c.classList.contains('pko-card-selected') ? LIFT : 0;
    c.style.transformOrigin = 'bottom center';
    c.style.transform = `translateY(${rise - lift}px) rotate(${deg.toFixed(2)}deg)`;
  });

  // Height is COMPUTED from what was just laid out, not fixed in CSS: the arch peak depends
  // on the hand size, so a fixed min-height either clips the fan or leaves dead space (and a
  // clipped rotation is what produced the scrollbars). Rotating about the bottom centre
  // raises the outer top corner by H(1−cos θ) + (W/2)sin θ; the arc adds its own sag below.
  const rot     = H * (1 - Math.cos(half)) + (W / 2) * Math.sin(half);
  const maxRise = mid * 0.9;
  el.style.minHeight = `${Math.ceil(H + rot + maxRise + LIFT + 8)}px`;
}

// Fills a container with this device's own Hoard. One code path for the deal screen
// and the table so the two fans can never drift apart.
function pkoRenderFan(el, opts = {}) {
  if (!el) return;
  el.innerHTML = '';
  let prev = null;
  pkoSortHoard(pkoMyHoard).forEach((id, pos) => {
    const card = pkoRenderCard(id, opts);
    card.dataset.pos        = String(pos);
    card.dataset.groupStart = id === prev ? '0' : '1';
    prev = id;
    el.appendChild(card);
  });
  pkoLayoutFan(el);
}

// ── Session / Clash lifecycle ─────────────────────────────────────────────

// New Match. Host only — clients reach the table via PKO_CLASH_BEGIN.
async function pkoStartSession() {
  await pkoLoadChain();                       // idempotent; also awaits core art
  pkoScores       = new Array(pkoPlayerCount).fill(0);
  pkoClashNum     = 0;
  pkoClashHistory = [];
  pkoLeaderIdx    = Math.floor(Math.random() * pkoPlayerCount);  // first leader is random (§6)
  pkoStartClash();
}

// Host: build the Pool, deal, and put every device on the deal screen.
// Clients never run this — they apply PKO_CLASH_BEGIN instead.
function pkoStartClash() {
  if (window.syllyMultiplayerMode === 'client') return;
  pkoClashNum++;

  // Deal from a fresh Pool every Clash. The Reserve is what's left — Scavenge draws from it.
  const pool = pkoBuildPool(pkoPlayerCount);
  pkoHoards  = [];
  for (let i = 0; i < pkoPlayerCount; i++) pkoHoards.push(pool.splice(0, pkoHoardSize));
  pkoReserve      = pool;
  pkoWateringHole = [];

  // Every accumulator resets HERE and must travel in the payload at its reset value —
  // the host resets locally, clients never do, and would carry stale values forward.
  pkoHoardCounts    = pkoHoards.map(h => h.length);
  pkoHoardReady     = new Array(pkoPlayerCount).fill(false);
  pkoTrail          = [];
  pkoMarks          = [];
  pkoMarkOwnerIdx   = -1;
  pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
  pkoEncounterNum   = 0;
  pkoMyHoard        = pkoHoards[pkoMyIdx()] || [];

  if (window.syllyMultiplayerMode !== 'single') {
    pkoSendPrivateHands();
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_CLASH_BEGIN',
      clashNum: pkoClashNum, leaderIdx: pkoLeaderIdx,
      playerNames: pkoPlayerNames, playerCount: pkoPlayerCount,
      hoardCounts: pkoHoardCounts, scores: pkoScores,
      // reset accumulators — explicit, not implied
      hoardReady: pkoHoardReady, retreatedSince: pkoRetreatedSince,
      marks: pkoMarks, markOwnerIdx: pkoMarkOwnerIdx,
      encounterNum: pkoEncounterNum, trail: pkoTrail, wateringHole: pkoWateringHole,
    }});
  }
  pkoShowHoard();
}

// Host → each device its OWN Hoard only, over the private Firebase channel. Card
// contents never touch the public /events node (FLW's True Network Privacy model).
function pkoSendPrivateHands() {
  for (let i = 0; i < pkoPlayerCount; i++) {
    const uid = mpPlayerSlots[i] && mpPlayerSlots[i].uid;
    if (!uid) continue;
    if (uid === window.syllyDeviceUid) { pkoMyHoard = pkoHoards[i]; continue; }  // host's own — local
    mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'PKO_HAND', cards: pkoHoards[i] } });
  }
}

function pkoShowHoard() {
  showScreen('screen-pko-hoard');
  pkoRenderHoardScreen();
}

function pkoRenderHoardScreen() {
  const clash = document.getElementById('pko-hoard-clash');
  if (clash) clash.textContent = `Clash ${pkoClashNum}`;
  const count = document.getElementById('pko-hoard-count');
  if (count) count.textContent = pkoMyHoard.length ? `${pkoMyHoard.length} cards` : '—';
  pkoRenderFan(document.getElementById('pko-hoard-fan'));

  // Ready button hides once you've confirmed; the waiting line names who's left.
  const me    = pkoMyIdx();
  const ready = pkoHoardReady[me] === true;
  const btn   = document.getElementById('btn-pko-hoard-ready');
  if (btn) btn.style.display = (pkoMyHoard.length && !ready) ? 'flex' : 'none';
  const wait = document.getElementById('pko-hoard-waiting');
  if (!wait) return;
  if (!pkoMyHoard.length)  { wait.textContent = 'Waiting for the host to deal…'; return; }
  const pending = pkoPlayerNames.filter((_, i) => !pkoHoardReady[i]);
  wait.textContent = ready
    ? (pending.length ? `Waiting on ${pending.join(', ')}…` : 'Everyone’s ready — entering the wild…')
    : '';
}

// Client after the lobby: the deal screen in its empty "waiting" state. Reuses the
// real screen rather than a standby screen, so the deal just fills it in.
function pkoShowClientStandby() {
  pkoMyHoard = [];
  pkoHoardReady = new Array(pkoPlayerCount).fill(false);
  pkoShowHoard();
}

// Host: open a new Encounter. The leader faces an empty board and must Stake.
function pkoStartEncounter() {
  if (window.syllyMultiplayerMode === 'client') return;
  pkoEncounterNum++;
  pkoMarks          = [];
  pkoMarkOwnerIdx   = -1;
  pkoTurnIdx        = pkoLeaderIdx;
  pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_ENCOUNTER_BEGIN',
      encounterNum: pkoEncounterNum, leaderIdx: pkoLeaderIdx, turnIdx: pkoTurnIdx,
      marks: pkoMarks, markOwnerIdx: pkoMarkOwnerIdx,
      retreatedSince: pkoRetreatedSince, hoardCounts: pkoHoardCounts,
      wateringHole: pkoWateringHole,
    }});
  }
  pkoShowTable();
}

// ── Table ─────────────────────────────────────────────────────────────────
function pkoShowTable() { showScreen('screen-pko-table'); pkoRenderTable(); }

function pkoRenderTable() {
  const me      = pkoMyIdx();
  const myTurn  = pkoTurnIdx === me;
  const empty   = pkoMarks.length === 0;

  const head = document.getElementById('pko-table-clash');
  if (head) head.textContent = `Clash ${pkoClashNum} · Encounter ${pkoEncounterNum}`;

  const banner = document.getElementById('pko-turn-banner');
  if (banner) {
    // Small Fry has to be announced, not just enforced — an opener whose taps are being
    // refused with no explanation reads as a broken fan.
    const lead = pkoOpenerSpecies(pkoMyHoard)
      ? 'Your lead — Small Fry: open with your smallest animal.'
      : 'Your lead — Stake to open the Encounter.';
    banner.textContent = myTurn
      ? (empty ? lead : 'Your move — answer every Mark, or Retreat.')
      : `Waiting on ${pkoPlayerNames[pkoTurnIdx] || '—'}…`;
  }

  // Active Marks — one card per Mark, never a stack.
  const marks = document.getElementById('pko-marks-row');
  if (marks) {
    marks.innerHTML = '';
    if (empty) {
      const p = document.createElement('p');
      p.className = 'text-stone-300 text-xs';
      p.textContent = 'The field is open.';
      marks.appendChild(p);
    } else {
      pkoMarks.forEach(id => marks.appendChild(pkoRenderCard(id)));
    }
  }

  pkoRenderWateringHole();
  pkoRenderPlayerStrip();
  pkoRenderMyHoard();

  // Action visibility. Every button is hidden for anyone who isn't the active player —
  // read-only is the default state at this table (spec §7).
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'flex' : 'none'; };
  pkoRefreshActionLabels();                     // both CTAs read back their selection model
  show('btn-pko-stake',     myTurn && empty);
  show('btn-pko-challenge', myTurn && !empty);
  show('btn-pko-retreat',   myTurn && !empty);

  // Stampede is SHOWN whenever it could conceptually apply (a uniform board), disabled with
  // its price when the player is short — rather than vanishing. Hiding it meant the N+1 rule
  // was invisible at the one moment it mattered, and a player could finish a whole match
  // without learning the action exists. Hidden only on a mixed board, where it can never apply.
  const stampBtn = document.getElementById('btn-pko-stampede');
  if (stampBtn) {
    const uniform = !empty && new Set(pkoMarks).size === 1 && pkoMarks[0] !== PKO_POACHER_ID;
    const ready   = pkoCanStampede();
    stampBtn.style.display = (myTurn && uniform) ? 'flex' : 'none';
    if (myTurn && uniform) {
      const need = pkoMarks.length + 1;
      stampBtn.disabled      = !ready;
      stampBtn.style.opacity = ready ? '1' : '0.45';
      stampBtn.textContent   = ready
        ? `Stampede with ${need} × ${pkoCardName(pkoMarks[0])}`
        : `Stampede — needs ${need} × ${pkoCardName(pkoMarks[0])}`;
    }
  }
}

// Name + Hoard count + Retreated flag, for every seat. Counts only — never contents.
function pkoRenderPlayerStrip() {
  const strip = document.getElementById('pko-player-strip');
  if (!strip) return;
  strip.innerHTML = '';
  pkoPlayerNames.forEach((name, i) => {
    const chip = document.createElement('div');
    const isTurn = i === pkoTurnIdx;
    chip.className = 'flex flex-col items-center rounded-xl px-2.5 py-1.5 text-center '
      + (isTurn ? 'bg-[#F5E6C8]' : 'bg-white shadow-sm');
    const n = document.createElement('p');
    n.className = 'text-[0.7rem] font-semibold ' + (isTurn ? 'text-[#854D0E]' : 'text-stone-600');
    n.textContent = name + (i === pkoMyIdx() ? ' (you)' : '');
    const c = document.createElement('p');
    c.className = 'text-[0.6rem] text-stone-400';
    c.textContent = pkoRetreatedSince[i] ? 'Retreated' : `${pkoHoardCounts[i] ?? 0} cards`;
    chip.append(n, c);
    strip.appendChild(chip);
  });
}

// The table fan. Selectable only in the `active-stake` sub-state — a Stake is built
// by tapping cards here; every other state renders the same fan read-only.
function pkoRenderMyHoard() {
  const el = document.getElementById('pko-my-fan');
  if (!el) return;
  // TWO selection sub-states, and they speak DIFFERENT models on purpose:
  //   empty board → a Stake, which is one species only, so pkoStakeSel (a flat position list)
  //   board up    → a Challenge, which is per-Mark and freely mixed, so pkoDraft
  // v146 ran the Challenge through pkoStakeSel and inherited the Stake's single-species
  // refusal — Mongoose+Mongoose+Octopus against three Fish was rejected from the table while
  // the builder accepted it (BUG-05). The two models are not interchangeable.
  const myTurn   = pkoTurnIdx === pkoMyIdx();
  const staking  = myTurn && pkoMarks.length === 0;
  const answering = myTurn && pkoMarks.length > 0;
  if (!staking && pkoStakeSel.length) pkoStakeSel = [];         // pkoStakeSel is Stake-only again
  const opener = staking ? pkoOpenerSpecies(pkoMyHoard) : null; // Small Fry — null when unconstrained
  const spent  = answering ? new Set(pkoDraft.flat()) : null;   // committed to the Challenge draft
  el.innerHTML = '';
  // Selection is by fan POSITION, not by id — a Hoard holds duplicates, so "the second
  // Bee" has to be distinguishable from the first. The TAP target, though, is the whole
  // species group (see pkoCycleStakeGroup): at the tightest stride a single card exposes
  // ~7px, far under a thumb, and duplicates are interchangeable anyway.
  pkoGroupHoard(pkoSortHoard(pkoMyHoard)).forEach(grp => {
    const barred = staking && opener && !opener.has(grp.id);
    grp.positions.forEach((pos, k) => {
      const card = pkoRenderCard(grp.id, {
        selected: staking   && pkoStakeSel.includes(pos),
        dimmed:   answering && spent.has(pos),      // same "already spent" cue as the builder fan
      });
      card.dataset.pos        = String(pos);
      card.dataset.groupStart = k === 0 ? '1' : '0';
      pkoBindChainHold(card, grp.id);
      if (staking || answering) {
        card.style.cursor = 'pointer';
        // Small Fry: species you may not open with read as out of bounds before you tap.
        if (barred) card.style.filter = 'grayscale(0.75)';
        card.addEventListener('click', () =>
          staking ? pkoCycleStakeGroup(grp) : pkoCycleAnswerGroup(grp));
      }
      el.appendChild(card);
    });
  });
  pkoLayoutFan(el);
}

// Tap-hold any card, anywhere → the chain overlay (spec §8: three entry points, one
// overlay). Hold, never drag — drag is deliberately unused in this game.
function pkoBindChainHold(el, id) {
  let held = null;
  const start = () => { held = setTimeout(() => { held = null; pkoOpenChain(id); }, 500); };
  const stop  = () => { if (held) { clearTimeout(held); held = null; } };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('mousedown', start);
  ['touchend', 'touchmove', 'touchcancel', 'mouseup', 'mouseleave'].forEach(e => el.addEventListener(e, stop));
}

// One species group is ONE tap target, and a tap CYCLES how many of it are staked:
// 0 → 1 → … → N → 0. Overlap makes a per-card target unusable (~7px of exposed sliver at
// the tightest stride), and since duplicates are interchangeable there is nothing to lose
// by counting instead of picking. The selected copies are the group's LAST positions —
// those are the ones painted on top, so the lift is always visible.
// A Stake is one species only, and a Poacher can never be Staked as an animal (§7).
// STAKE ONLY — the Challenge path is pkoCycleAnswerGroup, deliberately not this one.
function pkoCycleStakeGroup(grp) {
  const refuse  = () => { playBoing(); pkoShakeFan(grp.positions[grp.positions.length - 1]); };
  if (grp.id === PKO_POACHER_ID) return refuse();
  const opener = pkoOpenerSpecies(pkoMyHoard);            // Small Fry — null when unconstrained
  if (opener && !opener.has(grp.id)) return refuse();
  const sorted  = pkoSortHoard(pkoMyHoard);
  const current = pkoStakeSel.length ? sorted[pkoStakeSel[0]] : null;
  if (current && current !== grp.id) return refuse();     // mixed species — refuse the tap

  const max  = grp.positions.length;
  const next = (current === grp.id ? pkoStakeSel.length : 0) >= max
    ? 0                                                   // full → wrap back to none
    : (current === grp.id ? pkoStakeSel.length : 0) + 1;
  pkoStakeSel = next === 0 ? [] : grp.positions.slice(-next);
  playPillClick();

  pkoRenderMyHoard();
  pkoRefreshActionLabels();
}

// Both primary CTAs read back their own selection model in one place — Stake from
// pkoStakeSel, Challenge from pkoDraft — so a label can never disagree with what a tap did.
function pkoRefreshActionLabels() {
  const sorted = pkoSortHoard(pkoMyHoard);
  const stake  = document.getElementById('btn-pko-stake');
  if (stake) stake.textContent = pkoStakeSel.length
    ? `Stake ${pkoStakeSel.length} × ${pkoCardName(sorted[pkoStakeSel[0]])}`
    : 'Stake';
  const chal = document.getElementById('btn-pko-challenge');
  if (chal) {
    // Complete → the button commits and names the play. Part-built → the same `N of M`
    // progress idiom the builder's Confirm uses, so the two read as one flow rather than
    // two features; tapping it opens the builder with the work carried in.
    const answered = pkoMarks.length && pkoDraft.length === pkoMarks.length
      ? pkoDraft.filter((g, i) => pkoAnswers(pkoMarks[i], g.map(p => sorted[p]))).length : 0;
    const started  = pkoMarks.length ? pkoDraft.flat().length : 0;
    chal.textContent = pkoDraftComplete()
      ? `Challenge with ${pkoSummariseCards(pkoDraft.flat().map(p => sorted[p]))}`
      : (started ? `Challenge — ${answered} of ${pkoMarks.length} challenged` : 'Challenge');
  }
}

// The Challenge counterpart of pkoCycleStakeGroup — same group-as-tap-target feel, but it
// builds pkoDraft through the BUILDER's own card-first method, so a mixed answer
// (Mongoose, Mongoose, Octopus against three Fish) works by construction. It also picks up
// Swarms for free: pkoAutoFillSlot already prefers completing a started Swarm.
// Tap cycle mirrors the Stake's 0 → 1 → … → N → 0: once every copy of a species is
// committed, one more tap releases the whole group.
function pkoCycleAnswerGroup(grp) {
  if (!pkoDraft.length || pkoDraft.length !== pkoMarks.length) pkoDraft = pkoMarks.map(() => []);
  const spent = new Set(pkoDraft.flat());
  const free  = grp.positions.find(p => !spent.has(p));
  if (free === undefined) {                       // wrap: release every copy of this species
    pkoDraft = pkoDraft.map(g => g.filter(p => !grp.positions.includes(p)));
    playPillClick();
    pkoRenderMyHoard();
    pkoRefreshActionLabels();
    return;
  }
  pkoAutoFillSlot(free, 'pko-my-fan');            // shakes + explains on refusal, like the builder
  pkoRenderMyHoard();
  pkoRefreshActionLabels();
}

// Is the current draft a complete, legal answer to every Mark? Drives the Challenge button's
// dual behaviour — commit when true, open the builder when false.
function pkoDraftComplete() {
  if (!pkoMarks.length || pkoDraft.length !== pkoMarks.length) return false;
  const sorted = pkoSortHoard(pkoMyHoard);
  return pkoDraft.every((g, i) => pkoAnswers(pkoMarks[i], g.map(p => sorted[p])));
}

// The standard re-trigger — without the reflow the class re-add silently no-ops.
// Serves both fans: the table's Stake fan and the Challenge builder's.
// Queries by data-pos rather than children[pos]: with species grouping a card's fan
// POSITION is no longer guaranteed to be its DOM index.
function pkoShakeFan(pos, containerId = 'pko-my-fan') {
  const el = document.getElementById(containerId);
  const card = el && el.querySelector(`[data-pos="${pos}"]`);
  if (!card) return;
  card.classList.remove('pko-shake'); void card.offsetWidth; card.classList.add('pko-shake');
}

// Derived, never stored: every Mark is the same species AND you hold one more real
// copy of it than there are Marks. Poachers never count toward the threshold.
function pkoCanStampede() {
  if (!pkoMarks.length) return false;
  if (new Set(pkoMarks).size !== 1) return false;
  const species = pkoMarks[0];
  if (species === PKO_POACHER_ID) return false;
  return pkoMyHoard.filter(c => c === species).length >= pkoMarks.length + 1;
}

// ── Challenge builder (pko-challenge-overlay — an overlay, not a screen: §17 D1) ──
// pkoDraft holds fan POSITIONS, not card ids (same reason as pkoStakeSel — DD-12): a
// Hoard routinely holds four Mice, so an id-keyed draft cannot say WHICH Mouse is
// committed, and dimming "the used one" in the fan would dim all of them. The packet
// still carries ids only, so nothing position-dependent crosses the network.

// pkoDraft is one ARRAY per Mark, not one position: a slot holds 1 position (a predator
// answer) or 2 (a Swarm). It is never longer — pkoAnswers enforces that. The Marks the
// Swarm creates are separate one-card Marks, so pkoMarks itself stays flat.
function pkoOpenChallenge() {
  if (pkoTurnIdx !== pkoMyIdx() || !pkoMarks.length) return;
  // Re-arm ONLY when the draft is stale. A player can start a Challenge by tapping the table
  // fan and then open the builder for the fiddly part; wiping the draft here would throw that
  // work away. A length mismatch means the board moved under it, so it must go.
  if (pkoDraft.length !== pkoMarks.length) pkoDraft = pkoMarks.map(() => []);
  pkoSelectedSlot = -1;
  pkoRenderChallenge();
  pkoOpen('pko-challenge-overlay');
}

// A silent shake told a player "no" and never "why" — which is how "a Fish can't answer a
// Fish" read as a broken button rather than a rule. Every message is derived from
// pkoPredators()/pkoAnswers, so the help can never drift from what pkoBeats allows.
// Two sinks, one function: the builder's line and the table's. A card can be refused from
// either fan now, and a reason shown only in the hidden overlay would teach nobody.
function pkoChallengeHint(text) {
  ['pko-challenge-hint', 'pko-table-hint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  });
}
function pkoRejectionReason(markId, cardId) {
  const mark = pkoCardName(markId);
  if (markId === PKO_POACHER_ID) return `Only a Poacher answers a Poacher. It can't be Swarmed.`;
  const preds = [...(pkoPredators(markId) || [])].map(pkoCardName);
  const swarm = `or two ${mark}s to Swarm it`;
  if (cardId === markId) return `A ${mark} can't beat a ${mark} — you need two to Swarm it.`;
  return preds.length
    ? `${pkoCardName(cardId)} doesn't beat ${mark}. Try ${preds.join(', ')} — ${swarm}.`
    : `Nothing in the chain beats ${mark}. Only a Poacher — ${swarm}.`;
}

// Can this group sit in this slot while the player is still BUILDING? A lone card is
// acceptable either because it already answers the Mark, or because it is the first half
// of a Swarm (same species as the Mark). Completeness is always pkoAnswers() — a
// half-built Swarm renders as unanswered and cannot Confirm.
function pkoSlotAccepts(markId, cards) {
  if (cards.length === 1) {
    return pkoBeats(markId, cards[0])
        || (cards[0] === markId && markId !== PKO_POACHER_ID);
  }
  return pkoAnswers(markId, cards);
}

// Marks row → slot row → Hoard fan. Re-rendered after every tap; the three rows are
// always drawn from the same pkoSortHoard() ordering so a position means one thing.
function pkoRenderChallenge() {
  const sorted = pkoSortHoard(pkoMyHoard);

  // The Marks you must answer, in slot order so the row below reads against it.
  const marksEl = document.getElementById('pko-challenge-marks');
  if (marksEl) {
    marksEl.innerHTML = '';
    pkoMarks.forEach(id => {
      const card = pkoRenderCard(id, { size: 'sm' });
      pkoBindChainHold(card, id);
      marksEl.appendChild(card);
    });
  }

  // One slot per Mark. Tapping an empty slot selects it (Method A); tapping a filled
  // one returns its card to the fan and keeps the slot selected for a replacement.
  const slotsEl = document.getElementById('pko-challenge-slots');
  if (slotsEl) {
    slotsEl.innerHTML = '';
    pkoDraft.forEach((group, i) => {
      const armed = pkoSelectedSlot === i;
      let el;
      if (!group.length) {
        el = document.createElement('div');
        el.className = 'pko-slot-empty' + (armed ? ' pko-slot-active' : '');
        el.style.cssText = PKO_SM_CSS;
      } else if (group.length === 1) {
        el = pkoRenderCard(sorted[group[0]], { size: 'sm', selected: armed });
        // A lone card that matches its Mark is half a Swarm, not an answer — mark it so
        // "1 of 2 answered" never looks like a bug.
        if (!pkoAnswers(pkoMarks[i], [sorted[group[0]]])) el.classList.add('pko-slot-partial');
      } else {
        // A completed Swarm: two cards overlapped so the pair still reads as one slot.
        el = document.createElement('div');
        el.className = 'pko-slot-swarm' + (armed ? ' pko-slot-active' : '');
        group.forEach((p, k) => {
          const c = pkoRenderCard(sorted[p], { size: 'sm' });
          if (k) c.style.marginLeft = '-2.1rem';
          c.style.position = 'relative';
          c.style.zIndex   = String(k + 1);
          el.appendChild(c);
        });
      }
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => pkoTapSlot(i));
      slotsEl.appendChild(el);
    });
  }

  // Your Hoard. A card already committed to a slot is dimmed and inert — un-assigning
  // is done by tapping the slot, which keeps "which card came back" unambiguous.
  const fanEl = document.getElementById('pko-challenge-fan');
  if (fanEl) {
    fanEl.innerHTML = '';
    // Same overlap + group-tap model as the table fan: the group is the tap target and it
    // spends its first uncommitted copy, because one Mouse is as good as the next.
    const spent = new Set(pkoDraft.flat());        // positions committed to ANY slot
    pkoGroupHoard(sorted).forEach(grp => {
      grp.positions.forEach((pos, k) => {
        const card = pkoRenderCard(grp.id, { dimmed: spent.has(pos) });
        card.dataset.pos        = String(pos);
        card.dataset.groupStart = k === 0 ? '1' : '0';
        pkoBindChainHold(card, grp.id);
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const free = grp.positions.find(q => !spent.has(q));
          if (free === undefined) {
            playBoing(); pkoShakeFan(pos, 'pko-challenge-fan');
            pkoChallengeHint(`Every ${pkoCardName(grp.id)} in your Hoard is already committed.`);
            return;
          }
          pkoTapFanCard(free);
        });
        fanEl.appendChild(card);
      });
    });
    pkoLayoutFan(fanEl);
  }

  // A Challenge is all-or-nothing, so Confirm stays disabled until every slot ANSWERS —
  // a half-built Swarm counts as unanswered. The progress label is the only thing
  // distinguishing "waiting on you" from "broken".
  const filled = pkoDraft.filter((g, i) => pkoAnswers(pkoMarks[i], g.map(p => sorted[p]))).length;
  const done   = pkoDraft.length > 0 && filled === pkoDraft.length;
  const btn    = document.getElementById('btn-pko-challenge-confirm');
  if (btn) {
    btn.disabled      = !done;
    btn.style.opacity = done ? '1' : '0.45';
    btn.textContent   = done ? 'Challenge' : `${filled} of ${pkoDraft.length} challenged`;
  }

  // A half-built Swarm is the one state where the board looks answered but isn't, so it
  // gets an explicit prompt. Any rejection message a tap wrote survives until the next
  // render — rejections deliberately do not re-render.
  const partial = pkoDraft.findIndex((g, i) => g.length === 1 && !pkoAnswers(pkoMarks[i], [sorted[g[0]]]));
  pkoChallengeHint(partial === -1 ? ''
    : `Tap one more ${pkoCardName(pkoMarks[partial])} to finish the Swarm.`);
}

function pkoTapSlot(slotIdx) {
  playPillClick();
  if (pkoDraft[slotIdx].length) {
    pkoDraft[slotIdx] = [];                    // the WHOLE group goes back to the fan…
    pkoSelectedSlot   = slotIdx;               // …and the slot stays armed for a swap
  } else {
    pkoSelectedSlot = (pkoSelectedSlot === slotIdx ? -1 : slotIdx);
  }
  pkoRenderChallenge();
}

// The two input methods mix freely: with a slot armed the tap is Mark-first, without
// one it is card-first. Tap-hold is the chain overlay; there is no drag anywhere.
function pkoTapFanCard(pos) {
  if (pkoSelectedSlot !== -1) pkoAssignToSlot(pkoSelectedSlot, pos);
  else                        pkoAutoFillSlot(pos);
}

// Method A (Mark-first) — a slot is armed, so this card goes there or nowhere. It either
// fills an empty slot or completes a Swarm already started in that slot.
function pkoAssignToSlot(slotIdx, pos) {
  const sorted    = pkoSortHoard(pkoMyHoard);
  const candidate = [...pkoDraft[slotIdx].map(p => sorted[p]), sorted[pos]];
  if (!pkoSlotAccepts(pkoMarks[slotIdx], candidate)) {
    playBoing(); pkoShakeFan(pos, 'pko-challenge-fan');
    pkoChallengeHint(pkoDraft[slotIdx].length
      ? `That slot already holds a ${pkoCardName(sorted[pkoDraft[slotIdx][0]])}. Tap it to clear it.`
      : pkoRejectionReason(pkoMarks[slotIdx], sorted[pos]));
    return;
  }
  pkoDraft[slotIdx] = [...pkoDraft[slotIdx], pos];
  const complete = pkoAnswers(pkoMarks[slotIdx], candidate);
  // Stay armed while a Swarm is still half-built, so the second tap needs no re-arming.
  pkoSelectedSlot = complete ? -1 : slotIdx;
  if (complete && candidate.length === 2) playStampede(); else playPillClick();
  pkoRenderChallenge();
}

// Method B (card-first) — no slot armed. Priority order matters: finishing a Swarm the
// player has already started beats opening a new one, or the second Mouse would start a
// second half-Swarm instead of completing the first.
// `containerId` names the fan the tap came from — the builder's or the table's. Both drive
// the SAME pkoDraft; only the shake target and who re-renders differ.
function pkoAutoFillSlot(pos, containerId = 'pko-challenge-fan') {
  const sorted = pkoSortHoard(pkoMyHoard);
  const id     = sorted[pos];
  const ids    = i => pkoDraft[i].map(p => sorted[p]);

  //  1. complete a half-built Swarm in some slot
  let slot = pkoDraft.findIndex((g, i) => g.length === 1 && pkoAnswers(pkoMarks[i], [...ids(i), id]));
  //  2. else the leftmost empty Mark this card answers outright (a Poacher takes the first gap)
  if (slot === -1) slot = pkoDraft.findIndex((g, i) => !g.length && pkoBeats(pkoMarks[i], id));
  //  3. else start a Swarm on the leftmost empty Mark of this card's own species
  if (slot === -1) slot = pkoDraft.findIndex((g, i) => !g.length && pkoSlotAccepts(pkoMarks[i], [id]));

  if (slot === -1) {
    playBoing(); pkoShakeFan(pos, containerId);
    // Name the leftmost unanswered Mark — that is the one the player is stuck on.
    const open = pkoDraft.findIndex(g => !g.length);
    pkoChallengeHint(open === -1
      ? 'Every Mark already has an answer. Tap a card again to take it back.'
      : pkoRejectionReason(pkoMarks[open], id));
    return;
  }
  pkoDraft[slot] = [...pkoDraft[slot], pos];
  pkoDraft[slot].length === 2 ? playStampede() : playPillClick();
  // Only the builder re-renders itself here; the table caller owns its own repaint, so a tap
  // from the table never lays out the hidden overlay fan (a 0-width measure would spin rAF).
  if (containerId === 'pko-challenge-fan') pkoRenderChallenge();
}

function pkoResetChallenge() {
  pkoDraft        = pkoMarks.map(() => []);
  pkoSelectedSlot = -1;
  pkoRenderChallenge();
}

// The board moved, so any half-built Challenge is answering Marks that no longer
// exist. Called from every SYNC that replaces the board — leaving a stale draft open
// would let a player Confirm against the previous Encounter's slots.
function pkoDismissChallenge() {
  pkoClose('pko-challenge-overlay');
  pkoDraft = []; pkoSelectedSlot = -1;
}

// ── Player actions (each branches host vs client — see pkoSubmit* below) ──
function pkoSubmitStake() {
  if (pkoTurnIdx !== pkoMyIdx() || pkoMarks.length) return;
  if (!pkoStakeSel.length) return;
  const sorted = pkoSortHoard(pkoMyHoard);
  const cards  = pkoStakeSel.map(p => sorted[p]);
  if (new Set(cards).size !== 1 || cards[0] === PKO_POACHER_ID) { playBoing(); return; }
  const opener = pkoOpenerSpecies(pkoMyHoard);            // Small Fry — null when unconstrained
  if (opener && !opener.has(cards[0])) { playBoing(); return; }
  playLaunch();
  pkoStakeSel = [];
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_STAKE', cards } });
    return;                                    // wait for the host's PKO_BOARD
  }
  pkoApplyStake(pkoMyIdx(), { cards });        // host: mutate directly, never self-send
}
// `assignments` crosses the wire as one array of ids PER SLOT — [['bear'], ['mouse','mouse']]
// — because a slot may hold a Swarm. The host flattens it into the new board.
function pkoSubmitChallenge() {
  if (pkoTurnIdx !== pkoMyIdx() || !pkoMarks.length) return;
  if (pkoDraft.length !== pkoMarks.length) return;
  const sorted = pkoSortHoard(pkoMyHoard);
  pkoSendChallenge(pkoDraft.map(g => g.map(p => sorted[p])));   // positions → ids at the wire
}


// The single exit for a Challenge, whichever route built it. Validation lives here so the
// quick path can never bypass a check the builder enforces — the host re-checks regardless.
function pkoSendChallenge(assignments) {
  if (pkoTurnIdx !== pkoMyIdx() || !pkoMarks.length) return;
  if (assignments.length !== pkoMarks.length) return;
  if (!assignments.every((g, i) => pkoAnswers(pkoMarks[i], g))) { playBoing(); return; }

  const flat = assignments.flat();
  if (flat.includes(PKO_POACHER_ID))              playPoacher();
  else if (assignments.some(g => g.length === 2)) playStampede();   // a Swarm is a small stampede
  else                                            playLaunch();
  pkoClose('pko-challenge-overlay');
  pkoDraft = []; pkoSelectedSlot = -1; pkoStakeSel = [];
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_CHALLENGE', assignments } });
    return;                                                  // wait for the host's PKO_BOARD
  }
  pkoApplyChallenge(pkoMyIdx(), { assignments });             // host: mutate directly
}

// The only same-species mechanic: every Mark is one species and you hold N+1 real
// copies, so you take the whole board — and it comes back one Mark wider.
function pkoSubmitStampede() {
  if (pkoTurnIdx !== pkoMyIdx() || !pkoCanStampede()) return;
  const species = pkoMarks[0];
  const count   = pkoMarks.length + 1;
  playStampede();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_STAMPEDE', species, count } });
    return;
  }
  pkoApplyStampede(pkoMyIdx(), { species, count });
}
function pkoSubmitRetreat() {
  if (pkoTurnIdx !== pkoMyIdx() || !pkoMarks.length) return;
  playWhoosh();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_RETREAT' } });
    return;
  }
  pkoApplyRetreat(pkoMyIdx());
}
// The host is a full player. engine-multiplayer.js drops every envelope whose
// originId is this device, so a host that submits its own ACTION is ignored and the
// readyCheck never completes. Host mutates directly; ACTION is for clients only.
function pkoSubmitReady() {
  const me = pkoMyIdx();
  if (pkoHoardReady[me]) return;                 // already in — ignore a double-tap
  playDone();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_HOARD_READY' } });
    pkoHoardReady[me] = true;                    // optimistic — the host's SYNC is authoritative
    pkoRenderHoardScreen();
    return;
  }
  pkoApplyReady(me);
}

// ── Host-side appliers (host mutates directly, then broadcasts SYNC) ──────
// The host is a full player: engine-multiplayer drops every envelope where
// originId === syllyDeviceUid, so a host must NEVER self-send an ACTION.
// Host re-validates every action against ITS OWN board — a client's UI can be one
// packet stale. A rejected action is dropped silently and the sender is resynchronised
// by the board rebroadcast, never left hanging.
function pkoApplyStake(playerIdx, payload) {
  if (window.syllyMultiplayerMode === 'client') return;
  const cards  = (payload && payload.cards) || [];
  const hoard  = pkoHoards[playerIdx] || [];
  // Small Fry is re-checked against the HOST's mirror of that player's Hoard — a client
  // could otherwise open with anything by skipping its own gate.
  const opener = pkoOpenerSpecies(hoard);
  const valid = playerIdx === pkoTurnIdx
    && pkoMarks.length === 0
    && cards.length > 0
    && new Set(cards).size === 1
    && cards[0] !== PKO_POACHER_ID
    && (!opener || opener.has(cards[0]))
    && pkoHoldsAll(hoard, cards);
  if (!valid) { pkoBroadcastBoard(); return; }

  pkoRemoveFromHoard(playerIdx, cards);
  pkoMarks        = cards.slice();             // each card becomes its OWN Mark — never a stack
  pkoMarkOwnerIdx = playerIdx;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Staked ${cards.length} × ${pkoCardName(cards[0])}.`);
  pkoAfterBoardChange(playerIdx);
}

// ── Shared board helpers (host only) ──────────────────────────────────────
// Does this Hoard really contain every one of these cards, counting duplicates?
function pkoHoldsAll(hoard, cards) {
  const pool = [...hoard];
  return cards.every(c => {
    const i = pool.indexOf(c);
    if (i === -1) return false;
    pool.splice(i, 1);
    return true;
  });
}

// Cards leave the host's authoritative mirror here — and the owning DEVICE has to be
// told, or its fan keeps rendering cards it no longer holds. PKO_BOARD carries counts
// only (contents never touch the public channel), so the repair goes down the private
// channel as the player's WHOLE hand, not a delta: a full replacement is self-correcting
// if a packet is ever missed. Without this a client's pkoMyHoard was only ever written
// by the initial deal, so every card it played stayed in its fan and every attempt to
// replay one was silently dropped by pkoHoldsAll() on the host (BUG-02).
//
// The SEND is deliberately its own function rather than living inside
// pkoRemoveFromHoard: Force of Nature's Culling, Extinction and Migration all change a
// Hoard without a card being played, and a repair keyed to "a card was played" would
// miss all three. pkoSyncHand means "this Hoard changed" — the only precondition that
// is actually true at every call site.
function pkoSyncHand(playerIdx) {
  const hoard = pkoHoards[playerIdx] || [];
  pkoHoardCounts[playerIdx] = hoard.length;
  if (playerIdx === pkoMyIdx()) { pkoMyHoard = hoard; return; }   // host's own seat — aliased, nothing to send
  const uid = mpPlayerSlots[playerIdx] && mpPlayerSlots[playerIdx].uid;
  if (uid && window.syllyMultiplayerMode !== 'single') {
    mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'PKO_HAND_SYNC', cards: hoard } });
  }
}
function pkoSyncAllHands() {
  for (let i = 0; i < pkoPlayerCount; i++) pkoSyncHand(i);
}

function pkoRemoveFromHoard(playerIdx, cards) {
  const hoard = pkoHoards[playerIdx];
  cards.forEach(c => { const i = hoard.indexOf(c); if (i !== -1) hoard.splice(i, 1); });
  pkoSyncHand(playerIdx);
}

// The spent board goes to the Watering Hole as ONE batch record, not loose cards, so the
// pile stays grouped by the play that spent it — which is how a real discard pile reads,
// and what the Discards tab renders. Every push site funnels through here so the shape
// can never drift between Challenge, Stampede and Encounter close.
function pkoDiscardBoard() {
  if (!pkoMarks.length) return;
  pkoWateringHole.push({ enc: pkoEncounterNum, cards: pkoMarks.slice() });
}
// Total cards in the pile — the count the table shows. Tolerates a legacy flat id (a
// string) so a mid-session packet from an older shape can never NaN the counter.
function pkoHoleCount() {
  return (pkoWateringHole || []).reduce(
    (n, b) => n + (b && Array.isArray(b.cards) ? b.cards.length : 1), 0);
}

function pkoCardName(id) { return ((pkoChain || {})[id] || {}).name || id; }

// "Bear ×2, Poacher" — groups duplicates so a six-wide board still reads in one line.
function pkoSummariseCards(ids) {
  const counts = new Map();
  ids.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  return [...counts].map(([id, n]) => (n > 1 ? `${pkoCardName(id)} ×${n}` : pkoCardName(id))).join(', ');
}

// Every successful board change funnels through here — Stake, Challenge and Stampede
// all end the same way, so the Clash-end check and the window reset live in ONE place.
function pkoAfterBoardChange(playerIdx) {
  // Clash end fires BEFORE the board resolves (§6): emptying your Hoard wins immediately,
  // whether you emptied it Staking, Challenging or Stampeding.
  if ((pkoHoards[playerIdx] || []).length === 0) { pkoResolveClash([playerIdx]); return; }
  // The response window restarts clockwise from the player after the one who changed
  // the board, and every Retreat is forgiven — a Retreat is not a lock-out.
  pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
  pkoTurnIdx        = playerIdx;
  pkoAdvanceTurn();
  pkoBroadcastBoard();
  pkoShowTable();
}
// A Challenge answers every Mark or it is not a Challenge — the host re-checks each
// slot through pkoBeats() against ITS OWN board, because a client's UI can be one
// packet stale. The answered Marks go to the Watering Hole and the Challenge becomes
// the new board: one card per Mark, same width as what it beat.
function pkoApplyChallenge(playerIdx, payload) {
  if (window.syllyMultiplayerMode === 'client') return;
  const groups = (payload && payload.assignments) || [];
  const hoard  = pkoHoards[playerIdx] || [];
  const flat   = groups.flat();
  const valid = playerIdx === pkoTurnIdx
    && pkoMarks.length > 0
    && groups.length === pkoMarks.length
    && groups.every((g, i) => pkoAnswers(pkoMarks[i], g))
    && pkoHoldsAll(hoard, flat);
  if (!valid) { pkoBroadcastBoard(); return; }

  pkoRemoveFromHoard(playerIdx, flat);
  pkoDiscardBoard();
  // Every card played becomes its own Mark, so a Swarm returns the board one Mark wider —
  // the same shape Stampede already had. Slots never stay stacked (the cut Mob idea).
  pkoMarks        = flat;
  pkoMarkOwnerIdx = playerIdx;
  const swarms = groups.filter(g => g.length === 2).length;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Challenged with ${pkoSummariseCards(flat)}`
    + (swarms ? ` — ${swarms} Swarm${swarms > 1 ? 's' : ''}.` : '.'));
  pkoAfterBoardChange(playerIdx);
}

// Stampede takes the board and returns N+1 SEPARATE single-card Marks — never a stack.
// Poachers can't pad the threshold, so the count is re-derived from the Hoard, not trusted.
function pkoApplyStampede(playerIdx, payload) {
  if (window.syllyMultiplayerMode === 'client') return;
  const species = payload && payload.species;
  const count   = parseInt((payload && payload.count), 10);
  const hoard   = pkoHoards[playerIdx] || [];
  const valid = playerIdx === pkoTurnIdx
    && pkoMarks.length > 0
    && new Set(pkoMarks).size === 1
    && species === pkoMarks[0]
    && species !== PKO_POACHER_ID
    && count === pkoMarks.length + 1
    && hoard.filter(c => c === species).length >= count;
  if (!valid) { pkoBroadcastBoard(); return; }

  const cards = new Array(count).fill(species);
  pkoRemoveFromHoard(playerIdx, cards);
  pkoDiscardBoard();
  pkoMarks        = cards;
  pkoMarkOwnerIdx = playerIdx;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Stampeded with ${count} × ${pkoCardName(species)}.`);
  pkoAfterBoardChange(playerIdx);
}
function pkoApplyRetreat(playerIdx) {
  if (window.syllyMultiplayerMode === 'client') return;
  if (playerIdx !== pkoTurnIdx || !pkoMarks.length) { pkoBroadcastBoard(); return; }
  pkoRetreatedSince[playerIdx] = true;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Retreated.`);

  // Scavenge: draw one from the Reserve. More options later — but this is a race to
  // empty your Hoard, so the card is a cost as much as a gift.
  if (pkoScavenge && pkoReserve.length) {
    const card = pkoReserve.shift();
    pkoHoards[playerIdx].push(card);
    const uid = mpPlayerSlots[playerIdx] && mpPlayerSlots[playerIdx].uid;
    pkoSyncHand(playerIdx);                     // count + host-seat alias, one place
    if (playerIdx !== pkoMyIdx() && uid && window.syllyMultiplayerMode !== 'single') {
      mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'PKO_DRAW', card } });
    }
  }

  if (pkoCheckEncounterEnd()) { pkoEndEncounter(); return; }
  pkoAdvanceTurn();
  pkoBroadcastBoard();
  pkoShowTable();
}

// Host only. Marks a seat ready and opens the first Encounter once everyone is in.
function pkoApplyReady(playerIdx) {
  if (window.syllyMultiplayerMode === 'client') return;
  if (playerIdx < 0 || pkoHoardReady[playerIdx]) return;
  pkoHoardReady[playerIdx] = true;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'PKO_READY_STATE', hoardReady: pkoHoardReady } });
  }
  pkoRenderHoardScreen();
  if (pkoHoardReady.every(Boolean)) pkoStartEncounter();
}
function pkoBroadcastBoard() {
  if (window.syllyMultiplayerMode === 'single') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'PKO_BOARD',
    marks: pkoMarks, markOwnerIdx: pkoMarkOwnerIdx, turnIdx: pkoTurnIdx,
    retreatedSince: pkoRetreatedSince, hoardCounts: pkoHoardCounts,
    encounterNum: pkoEncounterNum, trail: pkoTrail, wateringHole: pkoWateringHole,
  }});
}

// ── Resolution ────────────────────────────────────────────────────────────

// Clockwise from whoever holds the turn, skipping the board owner (you don't answer
// your own Marks) and anyone who has Retreated since the last board change.
function pkoAdvanceTurn() {
  let i = pkoTurnIdx;
  for (let step = 0; step < pkoPlayerCount; step++) {
    i = (i + 1) % pkoPlayerCount;
    if (i === pkoMarkOwnerIdx) continue;
    if (pkoRetreatedSince[i]) continue;
    pkoTurnIdx = i;
    return true;
  }
  return false;                                // nobody left to answer
}

// The Encounter's termination condition: every player OTHER than the board owner has
// Retreated since the last board change. Each board change resets the matrix, so this
// terminates — a Challenge always consumes cards from a finite Hoard.
function pkoCheckEncounterEnd() {
  if (!pkoMarks.length) return false;
  return pkoRetreatedSince.every((r, i) => i === pkoMarkOwnerIdx || r);
}

// Host: the board owner goes Unchallenged, takes the Encounter, and leads the next.
function pkoEndEncounter() {
  const winner = pkoMarkOwnerIdx;
  const won    = pkoMarks.slice();              // captured before the board is cleared
  pkoDiscardBoard();                            // the board goes to the Watering Hole

  // Clear the board HERE, not on the interstitial's 2.5 s timer. The Encounter is over
  // the moment this runs, but pkoStartEncounter() — which resets pkoMarks — is 2.5 s
  // away. In that window a PKO_RETREAT submitted by a client just before the Encounter
  // closed still passes pkoApplyRetreat's guards, and resolves the Encounter a SECOND
  // time: the interstitial re-shows, the advance is rescheduled, and the board is
  // pushed to the Watering Hole twice. An empty board is the guard that drops it.
  pkoMarks = [];

  pkoLeaderIdx = winner;
  pkoLogTrail(`${pkoPlayerNames[winner]} went Unchallenged and leads the next Encounter.`);
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_UNCHALLENGED', winnerIdx: winner, marks: won,
      hoardCounts: pkoHoardCounts, trail: pkoTrail, wateringHole: pkoWateringHole,
    }});
  }
  pkoShowUnchallenged(winner, won);
}

function pkoShowUnchallenged(winnerIdx, marks) {
  const name = document.getElementById('pko-unchallenged-name');
  if (name) name.textContent = pkoPlayerNames[winnerIdx] || '—';
  const row = document.getElementById('pko-unchallenged-marks');
  if (row) {
    row.innerHTML = '';
    (marks || []).forEach(id => row.appendChild(pkoRenderCard(id, { size: 'sm' })));
  }
  playUnchallenged();
  showScreen('screen-pko-unchallenged');
  // Delay is the point: the interstitial exists to be read before the next Encounter.
  // Only the host schedules the advance — clients move on the PKO_ENCOUNTER_BEGIN SYNC.
  if (pkoUnchallengedTimer) clearTimeout(pkoUnchallengedTimer);
  if (window.syllyMultiplayerMode === 'client') return;
  pkoUnchallengedTimer = setTimeout(() => { pkoUnchallengedTimer = null; pkoStartEncounter(); }, 2500);
}

// Which of several joint winners opens the next Clash: most Match points, then random
// (brief §5). With one winner it is that winner — the shipped behaviour, unchanged.
function pkoNextOpener(winnerIdxs) {
  if (winnerIdxs.length === 1) return winnerIdxs[0];
  const best = Math.max(...winnerIdxs.map(i => pkoScores[i] || 0));
  const tied = winnerIdxs.filter(i => (pkoScores[i] || 0) === best);
  return tied[Math.floor(Math.random() * tied.length)];
}

// Host: a point enters the game only by emptying a Hoard — but Extinction Event can empty
// SEVERAL at once, so this takes an array. One point per emptied Hoard, one history row per
// Clash with a 1 in every winning column, and if more than one player crosses the target on
// the same Clash they win the Match jointly (brief §4: "they all win together").
function pkoResolveClash(winnerIdxs) {
  if (window.syllyMultiplayerMode === 'client') return;
  // Defensive unwrap: a bare int would silently no-op on pkoScores[[0]]++ rather than throw.
  const winners = (Array.isArray(winnerIdxs) ? winnerIdxs : [winnerIdxs])
    .filter(i => i >= 0 && i < pkoPlayerCount).sort((a, b) => a - b);
  if (!winners.length) return;

  winners.forEach(i => pkoScores[i]++);
  pkoClashHistory.push(pkoPlayerNames.map((_, i) => (winners.includes(i) ? 1 : 0)));
  pkoLeaderIdx = pkoNextOpener(winners);
  const names = winners.map(i => pkoPlayerNames[i]);
  pkoLogTrail(winners.length === 1
    ? `${names[0]} emptied their Hoard and took the Clash.`
    : `${names.join(' and ')} emptied their Hoards and took the Clash together.`);
  playClashWin();

  if (winners.some(i => pkoScores[i] >= pkoClashTarget)) {
    if (window.syllyMultiplayerMode !== 'single') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'PKO_MATCH_END', finalScores: pkoScores, clashHistory: pkoClashHistory,
        playerNames: pkoPlayerNames, winnerIdxs: winners,
      }});
    }
    pkoShowHierarchy();
    return;
  }
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_CLASH_END', winnerIdxs: winners, scores: pkoScores,
      clashHistory: pkoClashHistory, clashNum: pkoClashNum, trail: pkoTrail,
    }});
  }
  pkoShowClashResult(winners);
}

function pkoShowClashResult(winnerIdxs) {
  const winners = Array.isArray(winnerIdxs) ? winnerIdxs : [winnerIdxs];
  showScreen('screen-pko-clash-result');
  const num = document.getElementById('pko-clash-result-num');
  if (num) num.textContent = `Clash ${pkoClashNum} Summary`;
  const body = document.getElementById('pko-clash-result-body');
  if (body) {
    body.innerHTML = '';
    const emoji = document.createElement('div');
    emoji.className = 'text-5xl'; emoji.textContent = '🐘';
    const head = document.createElement('h2');
    head.className = 'text-2xl font-bold text-stone-800';
    const names = winners.map(i => pkoPlayerNames[i]);
    head.textContent = names.length === 1
      ? `${names[0]} takes the Clash`
      : `${names.join(' & ')} share the Clash`;
    const sub = document.createElement('p');
    sub.className = 'text-stone-400 text-sm';
    sub.textContent = names.length === 1 ? 'They lead the next one.' : 'One of them leads the next one.';
    body.append(emoji, head, sub, pkoBuildStandings());
  }
  // Host-gated: only the host opens the next Clash.
  const isClient = window.syllyMultiplayerMode === 'client';
  const btn  = document.getElementById('btn-pko-next-clash');
  const wait = document.getElementById('pko-clash-result-waiting');
  if (btn)  btn.style.display  = isClient ? 'none' : 'flex';
  if (wait) wait.style.display = isClient ? 'block' : 'none';
}

// Shared standings block — the Clash result and the Hierarchy show the same ranking.
// Equal scores share a rank number (§6: players can finish level-pegged).
function pkoBuildStandings() {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-2 w-full';
  const order = pkoPlayerNames.map((n, i) => ({ n, i, s: pkoScores[i] || 0 }))
    .sort((a, b) => b.s - a.s);
  const top = order.length ? order[0].s : 0;
  order.forEach((p, pos) => {
    const rank = order.findIndex(q => q.s === p.s) + 1;   // ties share a rank
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-white rounded-2xl px-4 py-2.5 shadow-sm';
    const left = document.createElement('p');
    left.className = 'text-stone-700 font-semibold text-sm';
    left.textContent = `${rank}. ${p.n}` + (p.i === pkoMyIdx() ? ' (you)' : '');
    const right = document.createElement('p');
    right.className = 'pko-label font-bold text-sm';
    right.textContent = p.s === 1 ? '1 Clash' : `${p.s} Clashes`;
    // Top and bottom of the pile get named — a bare score doesn't carry the story.
    // Joint Apex Predator: equal top scores share rank 1, so they share the title too —
    // there is no arbitrary ordering to break the tie with (FoN §6).
    if (p.s === top && p.s > 0)                     left.textContent += ' — Apex Predator';
    else if (pos === order.length - 1 && p.s === 0) left.textContent += ' — Bottom Feeder';
    row.append(left, right);
    wrap.appendChild(row);
  });
  return wrap;
}

function pkoShowHierarchy() {
  showScreen('screen-pko-hierarchy');
  const body = document.getElementById('pko-hierarchy-body');
  if (body) { body.innerHTML = ''; body.appendChild(pkoBuildStandings()); }

  // Clash history grid — one column per Clash, a paw on the row that won it.
  const grid = document.getElementById('pko-hierarchy-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'text-xs w-full';
  const head = document.createElement('tr');
  head.innerHTML = '<th class="text-left font-semibold text-stone-400 pb-1"></th>'
    + pkoClashHistory.map((_, c) => `<th class="font-semibold text-stone-400 pb-1 px-1">C${c + 1}</th>`).join('');
  table.appendChild(head);
  pkoPlayerNames.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="text-stone-600 font-semibold pr-2 py-0.5">${name}</td>`
      + pkoClashHistory.map(row => `<td class="text-center py-0.5 px-1">${row[i] ? '🐾' : '·'}</td>`).join('');
    table.appendChild(tr);
  });
  grid.appendChild(table);
}

// ── Trail (match log) ─────────────────────────────────────────────────────
// Public in v1 — the Dark Forest redaction the brief mentions is a Phase 2 event.
function pkoLogTrail(entry) {
  pkoTrail.push({ enc: pkoEncounterNum, text: entry });
}

function pkoRenderTrail() {
  const body = document.getElementById('pko-trail-body');
  if (!body) return;
  body.innerHTML = '';
  if (!pkoTrail.length) {
    body.innerHTML = '<p class="text-stone-300 text-sm">Nothing yet. The Clash has only just begun.</p>';
    return;
  }
  // Newest first — the last thing that happened is the thing being discussed, and it
  // should not need a scroll. Entries stay in play order WITHIN their Encounter so a
  // single Encounter still reads forwards; only the Encounters themselves are reversed.
  const byEnc = [];
  pkoTrail.forEach(e => {
    const last = byEnc[byEnc.length - 1];
    if (last && last.enc === e.enc) last.entries.push(e);
    else byEnc.push({ enc: e.enc, entries: [e] });
  });
  byEnc.reverse().forEach(grp => {
    const h = document.createElement('p');
    h.className = 'text-[0.6rem] font-semibold uppercase tracking-wide pko-label mt-2';
    h.textContent = `Encounter ${grp.enc}`;
    body.appendChild(h);
    grp.entries.forEach(e => {
      const p = document.createElement('p');
      p.className = 'text-stone-500 text-sm';
      p.textContent = e.text;
      body.appendChild(p);
    });
  });
}

// ── Multiplayer ───────────────────────────────────────────────────────────
function pkoHandleEnvelope(env) {
  const p = (env && env.payload) || {};
  const senderIdx = () => mpPlayerSlots.findIndex(s => s.uid === env.originId);

  // ── Client → host. Every one of these is re-validated against the host's own
  //    board before it is applied; a stale client is silently resynchronised.
  if (env.type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;
    switch (p.action) {
      case 'PKO_HOARD_READY': pkoApplyReady(senderIdx()); break;
      case 'PKO_STAKE':       pkoApplyStake(senderIdx(), p); break;
      case 'PKO_CHALLENGE':   pkoApplyChallenge(senderIdx(), p); break;
      case 'PKO_STAMPEDE':    pkoApplyStampede(senderIdx(), p); break;
      case 'PKO_RETREAT':     pkoApplyRetreat(senderIdx()); break;
      case 'PKO_PLAYER_LEFT':
        // One player leaving dissolves the match — a climbing game cannot continue
        // with a missing Hoard, and it prevents ghost rooms (the PASS contract).
        resetToLobby();
        break;
    }
    return;
  }

  // ── Host → all (and host → one, over the private channel).
  switch (p.action) {
    case 'PKO_HAND':                              // private — this device's own Hoard (the deal)
      pkoMyHoard = p.cards || [];
      pkoRenderHoardScreen();
      mpUnlockSync();
      break;

    // Private — the authoritative hand after THIS device played cards. Deliberately a
    // separate action from PKO_HAND: that one renders the deal screen, and this arrives
    // mid-Encounter. It must NOT unlock sync — the paired PKO_BOARD owns the unlock, and
    // releasing early would reopen the double-tap window this device is locked against.
    case 'PKO_HAND_SYNC':
      pkoMyHoard  = p.cards || [];
      pkoStakeSel = [];                           // positions are meaningless against a new hand
      pkoRenderTable();
      break;

    case 'PKO_CLASH_BEGIN':
      pkoClashNum       = p.clashNum;
      pkoLeaderIdx      = p.leaderIdx;
      pkoPlayerNames    = p.playerNames || pkoPlayerNames;
      pkoPlayerCount    = p.playerCount || pkoPlayerCount;
      pkoHoardCounts    = p.hoardCounts || [];
      pkoScores         = p.scores || pkoScores;
      pkoHoardReady     = p.hoardReady || [];
      pkoRetreatedSince = p.retreatedSince || [];
      pkoMarks          = p.marks || [];
      pkoMarkOwnerIdx   = p.markOwnerIdx;
      pkoEncounterNum   = p.encounterNum;
      pkoTrail          = p.trail || [];
      pkoWateringHole   = p.wateringHole || [];
      pkoDismissChallenge();
      pkoShowHoard();                             // PKO_HAND may arrive either side of this
      mpUnlockSync();
      break;

    case 'PKO_READY_STATE':
      pkoHoardReady = p.hoardReady || [];
      pkoRenderHoardScreen();
      mpUnlockSync();
      break;

    case 'PKO_ENCOUNTER_BEGIN':
      if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
      pkoEncounterNum   = p.encounterNum;
      pkoLeaderIdx      = p.leaderIdx;
      pkoTurnIdx        = p.turnIdx;
      pkoMarks          = p.marks || [];
      pkoMarkOwnerIdx   = p.markOwnerIdx;
      pkoRetreatedSince = p.retreatedSince || [];
      pkoHoardCounts    = p.hoardCounts || pkoHoardCounts;
      pkoWateringHole   = p.wateringHole || pkoWateringHole;
      pkoDismissChallenge();
      pkoShowTable();
      mpUnlockSync();
      break;

    case 'PKO_BOARD':
      pkoMarks          = p.marks || [];
      pkoMarkOwnerIdx   = p.markOwnerIdx;
      pkoTurnIdx        = p.turnIdx;
      pkoRetreatedSince = p.retreatedSince || [];
      pkoHoardCounts    = p.hoardCounts || pkoHoardCounts;
      pkoEncounterNum   = p.encounterNum;
      pkoTrail          = p.trail || pkoTrail;
      pkoWateringHole   = p.wateringHole || pkoWateringHole;
      pkoStakeSel       = [];                   // the board moved — any draft is stale
      pkoDismissChallenge();
      pkoShowTable();
      mpUnlockSync();
      break;

    case 'PKO_DRAW':                            // private — this device's Scavenge card
      pkoMyHoard.push(p.card);
      pkoRenderTable();
      break;

    case 'PKO_UNCHALLENGED':
      pkoHoardCounts = p.hoardCounts || pkoHoardCounts;
      pkoTrail       = p.trail || pkoTrail;
      pkoWateringHole = p.wateringHole || pkoWateringHole;
      pkoLeaderIdx   = p.winnerIdx;
      pkoMarks       = [];                      // board's gone — mirrors the host
      pkoDismissChallenge();
      pkoShowUnchallenged(p.winnerIdx, p.marks || []);
      mpUnlockSync();
      break;

    case 'PKO_CLASH_END':
      if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
      pkoScores       = p.scores || pkoScores;
      pkoClashHistory = p.clashHistory || pkoClashHistory;
      pkoClashNum     = p.clashNum;
      pkoTrail        = p.trail || pkoTrail;
      pkoDismissChallenge();
      playClashWin();
      pkoShowClashResult(p.winnerIdxs || (p.winnerIdx === undefined ? [] : [p.winnerIdx]));
      mpUnlockSync();
      break;

    case 'PKO_MATCH_END':
      if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
      pkoScores       = p.finalScores || pkoScores;
      pkoClashHistory = p.clashHistory || pkoClashHistory;
      pkoPlayerNames  = p.playerNames || pkoPlayerNames;
      pkoDismissChallenge();
      pkoShowHierarchy();
      mpUnlockSync();
      break;
  }
}

// ── Secret Mode (skins only — PKO has no word pool) ───────────────────────
// No-op by design: PKO draws from a fixed chain, not words.json, so there is nothing
// for a word cartridge to override. Skins reach the game through assetFace('pko', id)
// inside pkoRenderCard, which needs no hook here. Kept plugin-prefixed (never bare
// applyExpansionOverrides — that name is LI5's and a bare one would clobber it).
function pkoApplyExpansionOverrides() { /* no-op — no word pool (forward-compat consistency) */ }

// ── Teardown (called by resetToLobby in engine.js) ────────────────────────
function pkoResetState() {
  if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
  pkoScores = []; pkoClashNum = 0; pkoClashHistory = [];
  pkoHoards = []; pkoMyHoard = []; pkoHoardCounts = []; pkoReserve = []; pkoWateringHole = [];
  pkoLeaderIdx = 0; pkoEncounterNum = 0; pkoTrail = []; pkoHoardReady = [];
  pkoMarks = []; pkoMarkOwnerIdx = -1; pkoTurnIdx = 0; pkoRetreatedSince = [];
  pkoDraft = []; pkoSelectedSlot = -1; pkoStakeSel = [];
  pkoPlayerCount = 0; pkoPlayerNames = [];
}

// ── Overlay helpers ───────────────────────────────────────────────────────
function pkoOpen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // .overlay-data-inner owns overflow-y via CSS — .overflow-y-auto returns null silently
  const inner = el.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  el.style.display = 'flex';
}
function pkoClose(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function pkoOpenSettings() { pkoOpen('pko-settings-overlay'); }
function pkoOpenHowTo()    { pkoOpen('pko-how-to-overlay'); }
// Two tabs, one overlay. The Diagram is the default because it answers "what beats what"
// faster than any list can — EXCEPT when you arrived by tap-holding a card, where the
// highlighted Animals row is the entire point of that entry path.
function pkoOpenChain(highlightId) {
  pkoSetChainTab(highlightId ? 'animals' : 'diagram', highlightId);
  pkoOpen('pko-chain-overlay');
}

function pkoSetChainTab(tab, highlightId) {
  const isDiagram = tab === 'diagram';
  const pills = { 'btn-pko-chain-tab-diagram': isDiagram, 'btn-pko-chain-tab-animals': !isDiagram };
  Object.entries(pills).forEach(([id, on]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('pill-active-pko');           // .pill is the base — never removed
    if (on) el.classList.add('pill-active-pko');
  });
  const dia = document.getElementById('pko-chain-diagram');
  const ani = document.getElementById('pko-chain-body');
  if (dia) dia.style.display = isDiagram ? 'flex' : 'none';
  if (ani) ani.style.display = isDiagram ? 'none' : 'flex';
  if (isDiagram) pkoRenderChainDiagram();
  else {
    pkoRenderChain(highlightId);
    // Scroll the highlighted row into view — the reason tap-hold opens this tab at all.
    if (highlightId && ani) {
      const row = ani.querySelector(`[data-chain-id="${highlightId}"]`);
      if (row) requestAnimationFrame(() => row.scrollIntoView({ block: 'center' }));
    }
  }
}

// The authored chain diagram, straight off the core art pack (data/art/pko → extras.chain).
// Resolved through assetExtra so a skin pack can override it like any other asset; if no
// pack covers it the tab says so rather than rendering a broken image.
function pkoRenderChainDiagram() {
  const el = document.getElementById('pko-chain-diagram');
  if (!el) return;
  el.innerHTML = '';
  const url = (typeof assetExtra === 'function') && assetExtra('pko', 'chain');
  if (!url) {
    el.innerHTML = '<p class="text-stone-300 text-sm">Diagram unavailable — try the Animals tab.</p>';
    return;
  }
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'The food chain — who eats whom';
  img.className = 'w-full h-auto rounded-2xl';
  el.appendChild(img);
}

// ── Watering Hole (the discard pile — and the Trail's home) ───────────────
// The pile sits leftmost in the Marks row: spent cards on one side, live board on the
// other. Face-down, because what matters at a glance is how much of the Pool is gone.
function pkoRenderWateringHole() {
  const el = document.getElementById('pko-hole-pile');
  if (!el) return;
  el.innerHTML = '';
  const n = pkoHoleCount();
  if (!n) {
    const empty = document.createElement('div');
    empty.className = 'pko-hole-empty';
    empty.style.cssText = PKO_SM_CSS;
    el.appendChild(empty);
  } else {
    const last = pkoWateringHole[pkoWateringHole.length - 1];
    const top  = (last && last.cards) ? last.cards[last.cards.length - 1] : last;
    el.appendChild(pkoRenderCard(top, { faceDown: true, size: 'sm' }));
  }
  const count = document.getElementById('pko-hole-count');
  if (count) count.textContent = String(n);
}

function pkoOpenHole() { pkoSetHoleTab('trail'); pkoOpen('pko-trail-overlay'); }

function pkoSetHoleTab(tab) {
  const isTrail = tab === 'trail';
  const pills = { 'btn-pko-hole-tab-trail': isTrail, 'btn-pko-hole-tab-discards': !isTrail };
  Object.entries(pills).forEach(([id, on]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('pill-active-pko');
    if (on) el.classList.add('pill-active-pko');
  });
  const trail = document.getElementById('pko-trail-body');
  const disc  = document.getElementById('pko-hole-body');
  if (trail) trail.style.display = isTrail ? 'flex' : 'none';
  if (disc)  disc.style.display  = isTrail ? 'none' : 'flex';
  isTrail ? pkoRenderTrail() : pkoRenderDiscards();
}

// A real discard pile: newest on top, one row per board that was spent, grouped under the
// Encounter it belonged to. Reading it top-down replays the Clash backwards, which is what
// players actually want mid-argument ("what did they beat that with?").
function pkoRenderDiscards() {
  const body = document.getElementById('pko-hole-body');
  if (!body) return;
  body.innerHTML = '';
  if (!pkoHoleCount()) {
    body.innerHTML = '<p class="text-stone-300 text-sm">Nothing spent yet. The Watering Hole is dry.</p>';
    return;
  }
  const total = document.createElement('p');
  total.className = 'text-stone-400 text-xs';
  total.textContent = `${pkoHoleCount()} cards spent this Clash. Newest first.`;
  body.appendChild(total);

  let lastEnc = null;
  [...pkoWateringHole].reverse().forEach(batch => {
    const cards = (batch && batch.cards) || [];
    if (batch && batch.enc !== lastEnc) {
      lastEnc = batch.enc;
      const h = document.createElement('p');
      h.className = 'text-[0.6rem] font-semibold uppercase tracking-wide pko-label mt-2';
      h.textContent = `Encounter ${batch.enc}`;
      body.appendChild(h);
    }
    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-1';
    cards.forEach(id => row.appendChild(pkoRenderCard(id, { size: 'sm' })));
    body.appendChild(row);
  });
}

// Names the species and the cost before the tap is committed — a Stampede spends N+1
// cards from your Hoard, which is the whole reason it isn't a free win.
function pkoRenderStampede() {
  const species = pkoMarks[0];
  const count   = pkoMarks.length + 1;
  const head = document.getElementById('pko-stampede-heading');
  if (head) head.textContent = `Stampede with ${count} × ${pkoCardName(species)}?`;
  const prev = document.getElementById('pko-stampede-preview');
  if (!prev) return;
  prev.innerHTML = '';
  for (let i = 0; i < count; i++) prev.appendChild(pkoRenderCard(species, { size: 'sm' }));
}

// One row per card: the card, and what beats it. Read through pkoPredators() — NOT the raw
// `beaten_by` — so the reference always tells the truth for the Appetite actually in play.
// This overlay is the rules; it must not paraphrase them or lag behind a setting.
function pkoRenderChain(highlightId) {
  const body = document.getElementById('pko-chain-body');
  if (!body || !pkoChain) return;
  body.innerHTML = '';

  const mode = document.createElement('p');
  mode.className = 'text-stone-400 text-xs mb-1';
  mode.textContent = pkoAppetite === 'ravenous'
    ? 'Ravenous — a predator also eats two tiers below it. Plus: two of a Mark’s own kind Swarm it.'
    : 'Sated — you only ever eat your direct prey. Plus: two of a Mark’s own kind Swarm it.';
  body.appendChild(mode);

  Object.values(pkoChain).forEach(e => {
    const row = document.createElement('div');
    row.dataset.chainId = e.id;
    row.className = 'flex items-center gap-3 rounded-2xl p-2.5 '
      + (e.id === highlightId ? 'bg-[#F5E6C8]' : 'bg-white shadow-sm');
    row.appendChild(pkoRenderCard(e.id, { size: 'sm' }));
    const txt = document.createElement('div');
    txt.className = 'flex flex-col gap-0.5 min-w-0';
    const n = document.createElement('p');
    n.className = 'font-bold text-stone-800 text-sm';
    n.textContent = e.name;
    const b = document.createElement('p');
    b.className = 'text-stone-500 text-xs';
    const preds = [...(pkoPredators(e.id) || [])];
    b.textContent = preds.length
      ? 'Beaten by ' + preds.map(pkoCardName).join(', ')
      : (e.id === PKO_POACHER_ID ? 'Answers to no one. Wins any one Mark outright.'
                                 : 'Nothing in the chain beats it. Only a Poacher — or a Swarm.');
    txt.append(n, b);
    row.appendChild(txt);
    body.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Event wiring (DOMContentLoaded — pko.js loads BEFORE its screen markup).
// The `on` helper guards missing elements. Steps 3–4: routing + exits only.
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Lobby entry → game menu (never straight into setup)
  // Chain loads on entry (not at boot) so the chain overlay works from the game menu,
  // before any Match exists. Idempotent — later calls from pkoStartSession() are free.
  on('btn-pko', () => { playLaunch(); activeGameId = 'pko'; pkoLoadChain(); showScreen('screen-pko-menu'); });

  // Game menu — Play CTA has dual context (pre-lobby vs post-lobby); GTH/FLW reference
  on('btn-pko-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') pkoStartSession(); // post-lobby (host)
    else mpShowModeScreen('pko');                                    // pre-lobby
  });
  on('btn-pko-menu-how-to',   () => pkoOpenHowTo());
  on('btn-pko-menu-settings', () => pkoOpenSettings());
  on('btn-pko-menu-back',     () => { playExit(); resetToLobby(); });

  // In-game reference buttons
  on('btn-pko-how-to',           () => pkoOpenHowTo());   // hoard screen header
  on('btn-pko-table-how-to',     () => pkoOpenHowTo());   // table screen header
  on('btn-pko-chain',            () => pkoOpenChain());
  on('btn-pko-challenge-chain',  () => pkoOpenChain());
  on('btn-pko-hole',             () => pkoOpenHole());   // the Watering Hole pile IS the log's entry point
  document.querySelectorAll('.btn-pko-chain-open').forEach(b => b.addEventListener('click', () => pkoOpenChain()));

  // Overlay closers
  on('btn-pko-settings-done', () => { playDone(); pkoClose('pko-settings-overlay'); });
  on('btn-pko-howto-close',   () => { playDone(); pkoClose('pko-how-to-overlay'); });
  on('btn-pko-chain-close',   () => { playDone(); pkoClose('pko-chain-overlay'); });
  on('btn-pko-trail-close',   () => { playDone(); pkoClose('pko-trail-overlay'); });

  // Tabbed overlays — the Chain (Diagram | Animals) and the Watering Hole (Trail | Discards)
  on('btn-pko-chain-tab-diagram',  () => { playPillClick(); pkoSetChainTab('diagram'); });
  on('btn-pko-chain-tab-animals',  () => { playPillClick(); pkoSetChainTab('animals'); });
  on('btn-pko-hole-tab-trail',     () => { playPillClick(); pkoSetHoleTab('trail'); });
  on('btn-pko-hole-tab-discards',  () => { playPillClick(); pkoSetHoleTab('discards'); });

  // Settings — pills + toggles (state only; nothing branches on pkoSyllyMode in v1)
  const bindPills = (attr, fn) => {
    document.querySelectorAll(`[${attr}]`).forEach(pill => {
      pill.addEventListener('click', () => {
        playPillClick();
        // Only pill-active-pko is ever added/removed — .pill must never come off
        document.querySelectorAll(`[${attr}]`).forEach(p => p.classList.remove('pill-active-pko'));
        pill.classList.add('pill-active-pko');
        fn(pill.getAttribute(attr));
      });
    });
  };
  const syncToggle = (id, isOn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = (isOn ? 'game-toggle-on-pko' : 'game-toggle-off') + ' shrink-0';
    el.textContent = isOn ? 'ON' : 'OFF';
  };
  bindPills('data-pko-target',  v => { pkoClashTarget    = parseInt(v, 10); });
  bindPills('data-pko-hoard',   v => { pkoHoardSize      = parseInt(v, 10); });
  bindPills('data-pko-poacher', v => { pkoPoacherSetting = v; });
  bindPills('data-pko-smallfry', v => { pkoStartSmall     = v; });
  bindPills('data-pko-appetite', v => { pkoAppetite       = v; });
  on('btn-pko-scavenge-toggle', () => { pkoScavenge = !pkoScavenge; playPillClick(); syncToggle('btn-pko-scavenge-toggle', pkoScavenge); });
  on('btn-pko-sylly-toggle',    () => { pkoSyllyMode = !pkoSyllyMode; pkoSyllyMode ? playSyllyOn() : playSyllyOff(); syncToggle('btn-pko-sylly-toggle', pkoSyllyMode); });

  // Challenge builder overlay (§17 D1 — an overlay, not a screen)
  // Dual purpose, one button: a complete draft commits straight from the table; anything
  // else opens the builder — carrying whatever was picked on the table in with it.
  on('btn-pko-challenge',        () => {
    if (pkoDraftComplete()) { pkoSubmitChallenge(); return; }
    playWhoosh(); pkoOpenChallenge();
  });
  on('btn-pko-challenge-cancel', () => { playDone(); pkoClose('pko-challenge-overlay'); pkoResetChallenge(); });
  on('btn-pko-challenge-back',   () => { playDone(); pkoClose('pko-challenge-overlay'); pkoResetChallenge(); });
  on('btn-pko-challenge-reset',  () => { playDone(); pkoResetChallenge(); });   // small, beside 'Your Challenge'
  on('btn-pko-challenge-confirm',() => pkoSubmitChallenge());

  // Stampede confirm modal — the preview shows the N+1 Marks it will leave behind
  on('btn-pko-stampede',         () => {
    if (!pkoCanStampede()) return;
    playPillClick(); pkoRenderStampede(); pkoOpen('pko-stampede-overlay');
  });
  on('btn-pko-stampede-cancel',  () => { playDone(); pkoClose('pko-stampede-overlay'); });
  on('btn-pko-stampede-confirm', () => { pkoClose('pko-stampede-overlay'); pkoSubmitStampede(); });

  // Gameplay actions (logic injected Step 5)
  on('btn-pko-hoard-ready', () => pkoSubmitReady());
  on('btn-pko-stake',       () => pkoSubmitStake());
  on('btn-pko-retreat',     () => pkoSubmitRetreat());
  on('btn-pko-next-clash',  () => { if (window.syllyMultiplayerMode === 'client') return; playLaunch(); pkoStartClash(); });
  // Review window: pkoTrail still holds this Clash (it resets in pkoStartClash, which only
  // the host reaches, and only via Next Clash) — so the table can argue about it here.
  on('btn-pko-result-trail', () => { playDone(); pkoOpenHole(); });

  // Quit (mid-game ✕ → quit overlay → resetToLobby, per the PASS contract)
  document.querySelectorAll('.btn-pko-quit-open').forEach(b =>
    b.addEventListener('click', () => pkoOpen('pko-quit-overlay')));
  on('btn-pko-quit-cancel',  () => { playDone(); pkoClose('pko-quit-overlay'); });
  on('btn-pko-quit-confirm', () => {
    playExit();
    if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
    pkoClose('pko-quit-overlay');
    pkoClose('pko-challenge-overlay');
    if (window.syllyMultiplayerMode === 'client' && typeof mpSendEnvelope === 'function') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_PLAYER_LEFT' } }); // host dissolves the match
    }
    if (window.syllyMultiplayerMode !== 'single') { resetToLobby(); return; }      // host teardown broadcasts HOST_END_GAME
    showScreen('screen-pko-menu');                                                 // single-device dev path
  });

  // The Hierarchy — post-game ✕ and "Leave the Wild" go straight to the lobby;
  // play-again always routes through the confirm modal.
  on('btn-pko-hierarchy-exit', () => { playExit(); resetToLobby(); });
  on('btn-pko-go-leave',       () => { playExit(); resetToLobby(); });
  on('btn-pko-go-new',         () => pkoOpen('pko-new-match-overlay'));
  on('btn-pko-new-cancel',     () => { playDone(); pkoClose('pko-new-match-overlay'); });
  on('btn-pko-new-confirm',    () => {
    playLaunch();
    pkoClose('pko-new-match-overlay');
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; }
    pkoStartSession(); // single-device dev path
  });

  // Sound buttons — engine.js's parse-time querySelectorAll cannot reach PKO's
  // markup, which sits after the <script> block (FRT is the reference fix).
  document.querySelectorAll(
    '#screen-pko-menu .btn-open-sound, #screen-pko-hoard .btn-open-sound, ' +
    '#screen-pko-table .btn-open-sound, #screen-pko-clash-result .btn-open-sound, ' +
    '#screen-pko-hierarchy .btn-open-sound, #pko-challenge-overlay .btn-open-sound'
  ).forEach(btn => btn.addEventListener('click', openSoundOverlay));
});
