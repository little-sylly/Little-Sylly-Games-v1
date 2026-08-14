// ═══════════════════════════════════════════════════════════════════════════
// Counting Sheep (shp) — O'NO-99-style climbing/survival card game.
// MDLM-only, host-as-participant. Sylly Mode = Night Terrors (Climb ⇄ Plunge).
// Spec: docs/new-game-tech-counting-sheep.md
// Depends on: engine.js (showScreen, play*, shuffle, resetToLobby, activeGameId),
//             engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots, mpSendEnvelope,
//             mpLockSync/mpUnlockSync, window.syllyMultiplayerMode, mpMyPlayerIdx)
// SCAFFOLD STAGE: state + locked data constants + named stubs. Logic injected per §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ─────────────────────────────────
let shpHandSize     = 4;       // 3 | 4 | 5  (per-player Pen cap, before any Wolf shrink)
let shpMoons        = 3;       // 3 | 5 | 7  (starting lives — Sylly mode only, post scoring-rework)
let shpMoonsToWin   = 2;       // Normal mode only (scoring-rework §4/§5) — Moons needed to win the match
let shpDreamAccel   = true;    // number cards double while Herd < 50
let shpSyllyMode    = false;   // Night Terrors — oscillating Climb ⇄ Plunge + Sleepwalkers ghost system (§12)

// ── Roster (set at deal from lobby, persists across play-agains) ────────────
let shpPlayerCount  = 0;
let shpPlayerNames  = [];

// ── Match state (reset each Night / each play-again as noted) ───────────────
let shpHerd         = 0;       // running count
let shpCeiling      = 99;      // legal bust boundary — Climb 99; Plunge descends. NEVER a literal 99 in checks.
let shpDirection    = 1;       // 1 = forward, -1 = reversed
let shpMoonsHeld    = [];      // Moons per player
let shpEliminated   = [];      // bool per player (Sleepwalker once true)
let shpElimOrder    = [];      // player indices in order of permanent Deep Sleep
// Scoring rework (docs/new-game-tech-counting-sheep-scoring.md §4) — Normal mode only. A doze is
// OUT OF THE CURRENT NIGHT, still in the match; distinct from shpEliminated (out of the match for
// good). Set by shpHostDoze; reset every deal. The two are mode-disjoint by construction: shpDozed
// is only ever set in normal mode, shpEliminated only ever in Sylly.
let shpDozed        = [];      // bool[] per player — out of the current Night, still in the match
let shpDozeOrder    = [];      // int[] — in-Night knockout order (Night-end finish order = this reversed)
let shpActivePlayer = 0;       // whose turn
let shpOpenerIdx    = 0;       // who opens the current Night
// The seating RING as a permutation of player indices — turn order is a walk along this array,
// not raw index arithmetic, so Rude Awakening (id 17) can genuinely reorder the table. Reset to
// identity every Night in shpDealNight; rides in SHP_DEAL / SHP_TURN_RESULT / SHP_DISRUPT_RESOLVED
// because a client walking a stale ring would compute a different "next player" than the host.
let shpSeatOrder    = [];      // e.g. [2,0,3,1] — position → player index

// ── Deck (host-authoritative; clients hold masked views) ───────────────────
let shpFlock        = [];      // draw pile — card-type ids
let shpDiscard      = [];      // played-card pile
let shpHands        = [];      // 2D — card-type ids per player
let shpHandCap      = [];      // per-player Pen cap (drops 4→3 while a Wolf is active)
let shpWolfActive   = [];      // bool per player — true while a Big Bad Wolf slot is shut

// ── Turn state (reset each turn) ───────────────────────────────────────────
let shpForcedCards  = 1;       // 1, or 2 for Heavy Eyelids / Sleep Paralysis nightmare
let shpNoPillowNext = false;   // true while the upcoming player may not play a Pillows card (Wide Awake)
let shpPendingSkip  = null;    // revealed random-add value awaiting commit-animation
// (No fog state — the Fog nightmare swaps a Fogged Dream card, id 13, into the target's hand array.)

// ── Ghost / Nightmare Meter (Sylly Mode only, folded into Night Terrors) ───
let shpMeter        = 0;       // charge — +1 per PASTURE card resolved, only once a Sleepwalker exists
let shpMeterFill    = 3;       // notches to fill — PLAYTEST DIAL (band 3–4)
let shpGhostTurnIdx = 0;       // rotation pointer into shpElimOrder for the next spend-right
let shpSpendHolder  = -1;      // Sleepwalker idx holding the spend-right (-1 = none)
let shpGhostOptions = [];      // the 3 face-down nightmare ids offered (Nightmare Lottery)
let shpGhostPending = false;   // true while the table waits for the spend-holder's blind pick
let shpLastDisrupt  = null;    // { text } — dream-shift banner shown until the next play
let shpDozeNotice   = null;    // { idx, reason, landedOn } — table banner for a doze/Moon-loss (§4);
                                // cleared by the next play, alongside shpLastDisrupt
// { text } — outcome note for the CURRENT play (who you swapped with, the new seating order).
// Distinct from shpLastDisrupt because that one is deliberately cleared by shpBroadcastTurn; this
// is set during resolve and must survive into the same turn result, so it rides in the payload.
let shpLastEffect   = null;
// { a, b, aOld[], bOld[], aNew[], bNew[] } — a Swap Dreams flip choreography, consumed ONE-SHOT by
// whichever device renders it (shpRenderTableFooter nulls it the instant it's read, same idiom as
// shpPlungeFlash). Only ever meaningful to the two devices with a==me or b==me — everyone else's
// footer never looks at it, per the couch-security "broadcast whole, render own" hand-privacy model.
let shpSwapAnim     = null;
let shpPendingDisrupt = null;  // (reserved)
let shpEcho         = 0;       // Global Echo modifier: 0 or 2; cleared when the next disruption fires

// ── Night Terrors / Plunge (v1 — behind shpSyllyMode) ──────────────────────
let shpPhase        = 'climb'; // 'climb' | 'plunge'
let shpPlungeGrace  = 0;       // grace turns remaining at Plunge open (1 cycle = shpPlayerCount)
// Round-based ceiling descent: −2 base, +2 each FULL round of turns (every living player faces the
// same drop before the screw tightens — fair across any player count). shpPlungeDescentTurns counts
// post-grace ticks (host-side); shpCurrentDrop is the value applied this tick (synced for display).
const SHP_DROP_BASE = 2;       // ceiling fall on the first full round of the descent
const SHP_DROP_STEP = 2;       // extra fall added each subsequent full round
let shpPlungeDescentTurns = 0; // host-side: ticks since the descent began (after the grace cycle)
let shpCurrentDrop  = 0;       // the drop applied this turn (0 during grace) — rides in SYNC for display
let shpPlungeFlash  = false;   // one-shot "THE PLUNGE BEGINS" banner flag

// ── UI / animation ─────────────────────────────────────────────────────────
let shpAnimTimer    = null;    // setTimeout handle for inline reveal/crash animations
let shpNightIntroTimer = null; // setTimeout handle for the auto-advancing Night Intro screen
let shpFlipTimers   = [];      // setTimeout handles for the Swap Dreams flip choreography (§ Timer Lifecycle)
let shpNightFlavourIdx = 0;    // host-picked, rides in SHP_DEAL so all devices show the same line
let shpTwoSel       = [];      // staged hand indices for a Heavy Eyelids two-card play
// shpNightEndInfo replaced the old shpDeepSleepInfo outright in chunk 9 — the summary screen is now
// "Last One Awake" (a Night won), not a crash report, and every render call site reads this instead.
let shpNightEndInfo  = null;   // { winner, order, over } — Night-end summary (normal mode only, §7.4)
let shpGameStandings = [];     // final standings (winner first)
let shpGameWinner    = -1;
let shpNightNum      = 0;      // Night counter (increments in shpDealNight)
let shpCardTapReady  = true;   // 1-second turn-start buffer — false while cards should be non-tappable
let shpTapReadyTimer = null;   // handle for the tap-ready timer
let shpTapReadyForPlayer = -1; // which player index the buffer was set up for

// ── Play history / animation ────────────────────────────────────────────────
let shpPlayHistory   = [];     // [{ cardIds[], rolledVal, byIdx, byName }] — last 20 entries, newest first
let shpAnimSheep     = 0;      // how many 🐑 emojis to parade on the next render (0 = none)
let shpAnimDir       = 'in';   // 'in' (herd grew → arc into the counter) | 'out' (counting backwards → arc out)
let shpDeepSleepAcks = 0;      // how many players have tapped "Got it" this Deep Sleep
let shpDeepSleepAckNeeded = 0; // total acks required (= shpPlayerCount)
let shpIAcked        = false;  // per-device: true once this device has sent/recorded its ack
let shpStuckIdx      = -1;     // player who has no legal line and must tap "Nod Off" (-1 = nobody).
                               // Host-declared, synced via SHP_STUCK: the table HOLDS on this rather
                               // than auto-advancing into the Deep Sleep summary (12 Aug 2026 playtest).

// ═══════════════════════════════════════════════════════════════════════════
// Locked data constants (spec §10) — stable integer ids; packets deal only in ids
// ═══════════════════════════════════════════════════════════════════════════
const SHP_CARDS = [
  { id:0,  family:'pasture', label:'+1',                emoji:'🐑', kind:'add',        value:1  },
  { id:1,  family:'pasture', label:'+2',                emoji:'🐑', kind:'add',        value:2  },
  { id:2,  family:'pasture', label:'+5',                emoji:'🐑', kind:'add',        value:5  },
  { id:3,  family:'pasture', label:'+10',               emoji:'🐑', kind:'add',        value:10 },
  { id:4,  family:'pillow',  label:'Doze',              emoji:'😴', kind:'skip'    },
  { id:5,  family:'pillow',  label:'Toss & Turn',       emoji:'🔄', kind:'reverse' },
  { id:6,  family:'pillow',  label:'−10',              emoji:'⏪', kind:'subtract', value:10 },
  { id:7,  family:'pillow',  label:'Lullaby',           emoji:'🎵', kind:'reset',    value:20 },
  { id:8,  family:'alarm',   label:'1, 2, Skip a Few…', emoji:'💤', kind:'random-add',min:2, max:12 },
  { id:9,  family:'alarm',   label:'The Black Sheep',   emoji:'🐏', kind:'set',      value:99 },
  { id:10, family:'alarm',   label:'Wide Awake',        emoji:'⏰', kind:'ban-pillow' },
  { id:11, family:'alarm',   label:'Heavy Eyelids',     emoji:'🥱', kind:'two-card' },
  { id:12, family:'trap',    label:'The Big Bad Wolf',  emoji:'🐺', kind:'trap-shrink' },
  { id:13, family:'phantom', label:'Fogged Dream',      emoji:'🌫️', kind:'random-add',min:2, max:12 },
  // ↑ id 13 NOT in the starting deck — conjured only by the Fog nightmare (swaps in for a Pasture).
  //   Renders a cursed face-down face to everyone incl. its owner. Dissolves on play or redeal.
  { id:14, family:'pillow',  label:'−1',               emoji:'⏪', kind:'subtract', value:1  },
  { id:15, family:'pillow',  label:'−2',               emoji:'⏪', kind:'subtract', value:2  },
  { id:16, family:'pillow',  label:'−5',               emoji:'⏪', kind:'subtract', value:5  },
  { id:17, family:'alarm',   label:'Rude Awakening',   emoji:'🔀', kind:'shuffle'   },
  { id:18, family:'pillow',  label:'Swap Dreams',      emoji:'🤝', kind:'swap-hands' },
  // ↑ 17 reshuffles the seating ring (shpSeatOrder) — the Herd is untouched, but who comes
  //   next changes for the rest of the Night. 18 swaps your Pen with a random living player's.
  //   Both leave the Herd unchanged, so shpHerdAfterCard's default case covers them and they
  //   inherit the standard "legal only while Herd ≤ ceiling" rule from shpIsPlayable.
];

const SHP_DECK_COUNTS = {
  0:15, 1:15, 2:13, 3:8,    // Pasture +1/+2/+5/+10 (51 total — +3 to hold the share against the 2 new specials)
  4:3,  5:3,  6:1,  7:1,    // Doze / Toss & Turn / CB-10 / Lullaby (1-of) — hoardable specials trimmed
  14:3, 15:3, 16:3,          // CB-1 / CB-2 / CB-5 (10 playable subtracts incl. CB-10)
  8:2,  9:2,  10:1, 11:1,   // Skip a Few / Black Sheep / Wide Awake / Heavy Eyelids — trimmed
  17:2, 18:2,               // Rude Awakening (alarm) / Swap Dreams (pillow) — added 12 Aug 2026
  12:2,                     // Big Bad Wolf trap (unchanged)
  // Total: 51 pasture + 19 pillow(4/5/6/7/14/15/16/18) + 8 alarm(8/9/10/11/17) + 2 wolf = 80 cards
  //        (pasture share 51/80 ≈ 64%. The +3 pasture bump is deliberate: adding 4 hoardable
  //         specials at the old counts would have dropped 66% → 62% and partly undone the
  //         30 Jun 2026 anti-hoarding rebalance. Watch this in playtest.)
};

const SHP_NIGHTMARES = [
  { id:0, label:'Cold Feet',      emoji:'🥶', kind:'nudge', weight:3 }, // +1..+4 Herd (−1..−4 in Plunge)
  { id:1, label:'Restless Leg',   emoji:'🦵', kind:'shift', weight:3 }, // reverse OR skip next player
  { id:2, label:'Fog',            emoji:'🌫️', kind:'fog',   weight:1 }, // RARE — swap a Pasture for a Fogged Dream
  { id:3, label:'Sleep Paralysis',emoji:'😶', kind:'heavy', weight:2 }, // next player forced two-card
  { id:4, label:'Global Echo',    emoji:'🔊', kind:'echo',  weight:2 }, // shpEcho = 2 until next disruption
];

// ── Night Intro (ui-style.md § Night/Round Intro Screen — CJAR raid-intro precedent) ──────
// Auto-advancing, no chrome (rule-5 interstitial exemption) — shown at every shpDealNight
// (match start AND every Deep-Sleep redeal), on both host and clients. Flavour + a rotating
// practical reminder folded into one line, per playtest ask (12 Aug 2026); a Sylly-only
// second line reminds the table Night Terrors is live, same shape as CJAR's affinity box.
const SHP_INTERSTITIAL_MS = 5000;
const SHP_SHEEP_STAGGER_MS = 150;  // gap between consecutive sheep in the parade (see shpStartSheepAnim).
                                   // 90ms put them ~10px apart on a 132px path — a solid line of wool.
const SHP_NIGHT_FLAVOUR = [
  'Everyone’s trying hard not to fall asleep, so you begin counting sheep. Don’t go over 99 or you might really just fall asleep.',
  'The Flock is fresh and the Herd is at 0. Keep it there — or at least under 99.',
  'Pillows plumped, alarms wound. First one to break 99 nods off for the night.',
  'A new count begins. Play smart, watch the ceiling, and don’t be the one who drifts.',
  'Fresh hands all round. Somewhere in the Flock, a Big Bad Wolf is waiting to lock a slot.',
];

// ═══════════════════════════════════════════════════════════════════════════
// Pure helpers / guards (foundational)
// ═══════════════════════════════════════════════════════════════════════════
// Awake = still in the match AND not out of the current Night.
function shpAwake(i)     { return !shpEliminated[i] && !shpDozed[i]; }
function shpAwakeCount() { let n = 0; for (let i = 0; i < shpPlayerCount; i++) if (shpAwake(i)) n++; return n; }
function shpMyIdx() { return (window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0); }

// Firebase strips empty/holey sub-arrays — rebuild a length-n 2D array (FRT shpNorm2D pattern).
function shpNorm2D(raw, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(Array.isArray(raw && raw[i]) ? raw[i].slice() : []);
  return out;
}

// Firebase erases an all-false bool array entirely (empty array → undefined on receipt) — rebuild a
// length-n bool array explicitly rather than trusting `raw` to still be an array at all (§8).
function shpNormBool(raw, n) {
  const out = []; for (let i = 0; i < n; i++) out.push(!!(raw && raw[i])); return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Derived helpers (§4, §6)
// ═══════════════════════════════════════════════════════════════════════════
function shpName(i) { return (shpPlayerNames && shpPlayerNames[i]) || ('Player ' + (i + 1)); }
function shpRandInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Resulting Herd after applying a card to `herd`. Arithmetic (add/subtract/random-add) is SIGN-FLIPPED
// during the Plunge — a +10 subtracts, a Counting-Backwards adds. set/reset are absolute (unchanged).
// Pasture adds get Dream Acceleration (×2 under 50) + Global Echo (+shpEcho). rolledVal: random-add roll
// (null → use min, the best case, for legality checks). Result clamped ≥ 0.
function shpHerdAfterCard(herd, cardId, rolledVal) {
  const c = SHP_CARDS[cardId];
  const sgn = (shpPhase === 'plunge') ? -1 : 1;
  let h = herd;
  switch (c.kind) {
    case 'add':        { let v = c.value; if (shpDreamAccel && herd < 50) v *= 2; v += shpEcho; h = herd + sgn * v; break; }
    case 'subtract':   h = herd - sgn * c.value; break;
    case 'random-add': h = herd + sgn * (rolledVal != null ? rolledVal : c.min); break;
    case 'set':        h = (shpPhase === 'plunge') ? Math.min(c.value, shpCeiling) : c.value; break;
    case 'reset':      h = c.value; break;
    default:           h = herd; break;            // skip/reverse/ban-pillow/two-card unchanged
  }
  return Math.max(0, h);
}

// The seating ring, guaranteed length-n even if a packet arrived without one (falls back to identity).
function shpRing() {
  const n = shpPlayerCount;
  if (shpSeatOrder && shpSeatOrder.length === n) return shpSeatOrder;
  const ident = []; for (let i = 0; i < n; i++) ident.push(i);
  return ident;
}

// Next living player in the current direction — walks the SEATING RING, not raw indices,
// so a shuffled table (Rude Awakening) changes who actually comes next.
function shpNextPlayer(fromIdx) {
  const n = shpPlayerCount, order = shpRing();
  let pos = order.indexOf(fromIdx); if (pos < 0) pos = 0;
  let guard = 0, i = fromIdx;
  do { pos = (pos + shpDirection + n) % n; i = order[pos]; guard++; } while (!shpAwake(i) && guard <= n);
  return i;
}

// Playable = the card's resulting Herd keeps ≤ ceiling. Phase-aware:
//  · Climb + Sylly: adds & random-adds are ALWAYS legal — reaching ≥99 triggers the Plunge, never busts.
//  · Climb base:    adds must fit; random-add playable if its best-case (min) roll fits.
//  · Plunge:        arithmetic is sign-flipped (in shpHerdAfterCard); random-add subtracts → always safe.
// When the Herd is pushed over the ceiling (Cold Feet / a falling Plunge ceiling), only reducers stay legal.
function shpIsPlayable(playerIdx, handIdx) {
  const c = SHP_CARDS[shpHands[playerIdx][handIdx]];
  // Wide Awake — the player it targeted may not play a Pillows card on this, their next, turn.
  if (shpNoPillowNext && playerIdx === shpActivePlayer && c.family === 'pillow') return false;
  const climbSylly = (shpSyllyMode && shpPhase === 'climb');
  if (c.kind === 'random-add') {
    if (shpPhase === 'plunge' || climbSylly) return true;
    return shpHerd + c.min <= shpCeiling;
  }
  if (c.kind === 'add' && climbSylly) return true;
  return shpHerdAfterCard(shpHerd, shpHands[playerIdx][handIdx], null) <= shpCeiling;
}
function shpLegalCards(playerIdx) {
  const out = [], h = shpHands[playerIdx] || [];
  for (let i = 0; i < h.length; i++) if (shpIsPlayable(playerIdx, i)) out.push(i);
  return out;
}

// Best-case final Herd after applying two cards in sequence (random-add at its min = best case).
function shpPairFinalBest(playerIdx, a, b) {
  let herd = shpHerdAfterCard(shpHerd, shpHands[playerIdx][a], null);
  herd = shpHerdAfterCard(herd, shpHands[playerIdx][b], null);
  return herd;
}
function shpHasSafePair(playerIdx) {
  const h = shpHands[playerIdx] || [];
  for (let a = 0; a < h.length; a++) for (let b = 0; b < h.length; b++) {
    if (a !== b && shpPairFinalBest(playerIdx, a, b) <= shpCeiling) return true;
  }
  return false;
}
// True if the player about to act has any legal line; else they Deep-Sleep on turn entry.
function shpHasLegalLine(playerIdx) {
  const h = shpHands[playerIdx] || [];
  if (shpForcedCards === 2) {
    if (h.length === 0) return false;
    if (h.length === 1) return shpIsPlayable(playerIdx, 0); // degrade to single (edge a)
    return shpHasSafePair(playerIdx);
  }
  return shpLegalCards(playerIdx).length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Deck + render seam (§10)
// ═══════════════════════════════════════════════════════════════════════════
// Expand SHP_DECK_COUNTS → flat id array → shuffle. (Excludes id 13 Fogged Dream — phantom.)
function shpBuildFlock() {
  const flock = [];
  Object.keys(SHP_DECK_COUNTS).forEach(id => {
    const n = SHP_DECK_COUNTS[id];
    for (let i = 0; i < n; i++) flock.push(parseInt(id, 10));
  });
  return shuffle(flock);
}

// Flock empties mid-Night → shuffle the discard back in.
function shpReshuffleDiscard() {
  shpFlock = shuffle(shpFlock.concat(shpDiscard));
  shpDiscard = [];
}

// Draw back up to the player's cap. The Big Bad Wolf (id 12) is consumed on draw, shutting a slot.
function shpDrawUp(playerIdx) {
  while (shpHands[playerIdx].length < shpHandCap[playerIdx]) {
    if (shpFlock.length === 0) {
      if (shpDiscard.length === 0) break;
      shpReshuffleDiscard();
      if (shpFlock.length === 0) break;
    }
    const drawn = shpFlock.shift();
    if (drawn === 12) {                          // Big Bad Wolf — never enters the hand
      shpDiscard.push(12);
      if (!shpWolfActive[playerIdx]) {
        shpWolfActive[playerIdx] = true;
        shpHandCap[playerIdx] = Math.max(1, shpHandCap[playerIdx] - 1);
      }
      // Re-evaluate against the (reduced) cap — do NOT break. Mid-game this stops immediately
      // (hand already at the reduced cap); at deal it keeps filling the shrunk hand. See impl notes.
      continue;
    }
    shpHands[playerIdx].push(drawn);
  }
}

// Display label — flips the sign of Pasture adders during the Plunge (Night Terrors).
function shpCardFaceLabel(c, inverted) {
  if (inverted && c.kind === 'add')      return '−' + c.value;  // +N → −N in Plunge
  if (inverted && c.kind === 'subtract') return '+' + c.value;  // −N → +N in Plunge
  return c.label;
}

// Asset-pack render seam — ALL card DOM flows through here (frtRenderCard precedent).
// opts: { faceDown, wolf, inverted }. Fogged Dream (id 13) always renders cursed (value hidden).
function shpRenderCard(cardId, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  if (opts.faceDown) {
    // Asset-pack back (device-local skin) if active; else default CSS back.
    const back = (typeof assetBack === 'function') && assetBack('shp');
    el.className = back ? 'shp-card shp-card-asset' : 'shp-card shp-card-back';
    if (back) el.style.backgroundImage = 'url("' + back + '")';
    return el;
  }
  if (opts.wolf)     { el.className = 'shp-card shp-card-wolf shp-card-flagged';
                       const wolfUrl = (typeof assetFace === 'function') && assetFace('shp', 12);
                       if (wolfUrl) {
                         el.style.backgroundImage = 'url("' + wolfUrl + '")';
                         el.style.backgroundSize = 'cover';
                         el.style.backgroundPosition = 'center';
                         el.innerHTML = '<span class="shp-card-label">asleep</span>';
                       } else {
                         el.innerHTML = '<span class="shp-card-emoji">\u{1F43A}</span><span class="shp-card-label">asleep</span>';
                       }
                       return el; }
  const c = SHP_CARDS[cardId];
  el.dataset.card = cardId;
  if (cardId === 13) {   // Fogged Dream — the resolved value (2-12) is hidden from everyone incl. owner;
                          // that roll happens at play time via shpRandInt and is independent of the art
                          // shown here, so a static face doesn't leak it — same "?" badge either way.
    const foggedUrl = (typeof assetFace === 'function') && assetFace('shp', 13);
    if (foggedUrl) {
      // Art present — same asset styling as every other skinned card, NOT the heavy shp-card-cursed
      // treatment (a 1.4rem "?" that was sized to fill an EMPTY card). A small badge is enough once
      // real art is doing the work. shp-card-flagged overrides shp-card-asset's transparent border
      // with the shared "notable card" stone one (§ styles.css, cascade relies on source order).
      el.className = 'shp-card shp-card-asset shp-card-fogged shp-card-flagged';
      el.style.backgroundImage = 'url("' + foggedUrl + '")';
      el.innerHTML = '<span class="shp-card-fogged-badge">?</span>';
    } else {
      el.className = 'shp-card shp-card-cursed';
      el.innerHTML = '<span class="shp-card-emoji">' + c.emoji + '</span><span class="shp-card-label">?</span>';
    }
    return el;
  }
  // Asset-pack face (device-local skin) if one covers this card; else default emoji card.
  const url = (typeof assetFace === 'function') && assetFace('shp', cardId);
  if (url) {
    el.className = 'shp-card shp-card-asset';
    el.style.backgroundImage = 'url("' + url + '")';
    return el;
  }
  el.className = 'shp-card shp-card-' + c.family;
  el.innerHTML = '<span class="shp-card-emoji">' + c.emoji + '</span>' +
                 '<span class="shp-card-label">' + shpCardFaceLabel(c, opts.inverted) + '</span>';
  return el;
}

// Weighted-sample 3 DISTINCT nightmare ids (Fog rarest). Blind Lottery pool (§6/§10).
function shpDrawNightmares() {
  const pool = SHP_NIGHTMARES.map(nm => ({ id: nm.id, weight: nm.weight }));
  const picked = [];
  while (picked.length < 3 && pool.length) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
    if (idx >= pool.length) idx = pool.length - 1;
    picked.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return picked;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core flow (§2, §6) — host-authoritative; host is also a participant
// ═══════════════════════════════════════════════════════════════════════════
function shpStartSession() {
  if (window.syllyMultiplayerMode === 'client') return;   // clients wait for SHP_DEAL
  // Normal mode counts Moons UP from 0 to shpMoonsToWin (Nights won); Sylly counts DOWN from
  // shpMoons (lives). §8: "watch moons in normal mode: at the first deal it is [0, 0, 0]."
  shpMoonsHeld  = Array(shpPlayerCount).fill(shpSyllyMode ? shpMoons : 0);
  shpEliminated = Array(shpPlayerCount).fill(false);
  shpElimOrder  = [];
  shpHandCap    = Array(shpPlayerCount).fill(shpHandSize);
  shpWolfActive = Array(shpPlayerCount).fill(false);
  shpMeter = 0; shpGhostTurnIdx = 0; shpSpendHolder = -1; shpEcho = 0; shpPendingDisrupt = null;
  shpGameStandings = []; shpGameWinner = -1; shpNightEndInfo = null;
  shpNightNum = 0;
  shpOpenerIdx = Math.floor(Math.random() * shpPlayerCount);
  shpDealNight(shpOpenerIdx);
}

// Deal a fresh Night (game start AND every Deep-Sleep redeal). Living players only.
function shpDealNight(openerIdx) {
  shpNightNum++;
  shpHerd = 0; shpDirection = 1; shpPhase = 'climb'; shpCeiling = 99; shpPlungeGrace = 0; shpPlungeFlash = false;
  shpPlungeDescentTurns = 0; shpCurrentDrop = 0;
  shpForcedCards = 1; shpNoPillowNext = false; shpTwoSel = []; shpPendingSkip = null;
  shpPlayHistory = []; shpAnimSheep = 0; shpLastEffect = null; shpSwapAnim = null;
  shpDozed = Array(shpPlayerCount).fill(false); shpDozeOrder = [];   // scoring-rework §4
  shpNightEndInfo = null; shpDozeNotice = null;                      // scoring-rework §4/§7
  shpSeatOrder = []; for (let i = 0; i < shpPlayerCount; i++) shpSeatOrder.push(i);  // ring back to identity each Night
  shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false; shpStuckIdx = -1;
  shpFlock = shpBuildFlock(); shpDiscard = [];
  shpHands = [];
  for (let i = 0; i < shpPlayerCount; i++) {
    shpHands.push([]);
    shpHandCap[i] = shpHandSize; shpWolfActive[i] = false;
    if (!shpEliminated[i]) shpDrawUp(i);
  }
  shpActivePlayer = openerIdx;
  shpNightFlavourIdx = Math.floor(Math.random() * SHP_NIGHT_FLAVOUR.length);   // host picks; synced below
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DEAL',
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive,
      herd: shpHerd, direction: shpDirection, activePlayer: shpActivePlayer,
      moons: shpMoonsHeld, eliminated: shpEliminated, elimOrder: shpElimOrder,
      // scoring-rework §8 — dozed/dozeOrder must ride every deal, or a client carries the PREVIOUS
      // Night's finishing state forward (the classic accumulator bug, logic-engine.md § Accumulator
      // arrays). moonsToWin rides too — a client that only ever reads it via SETTINGS_SYNC would be
      // stuck on a stale target if a mid-lobby settings change landed after the deal.
      dozed: shpDozed, dozeOrder: shpDozeOrder, moonsToWin: shpMoonsToWin,
      playerCount: shpPlayerCount, playerNames: shpPlayerNames, meter: shpMeter, echo: shpEcho,
      // nightNum was host-only until 12 Aug 2026 — clients sat on "Night 0" all match (BUG-04).
      nightNum: shpNightNum, seatOrder: shpSeatOrder, flavourIdx: shpNightFlavourIdx,
    }});
  }
  shpShowNightIntro();
}

// Auto-advancing Night Intro (ui-style.md § Night/Round Intro Screen) — every Night, both
// host and clients call this instead of jumping straight to the table. No [?]/🔊/✕ (rule-5
// interstitial exemption: auto-advances, nothing to tap). Timer is cleared + retriggered on
// every call so a rapid-fire redeal (e.g. a mercy-exit loop) can never stack two.
function shpShowNightIntro() {
  const heading = document.getElementById('shp-intro-heading');
  if (heading) heading.textContent = 'Night ' + shpNightNum + ' Begins';
  const sub = document.getElementById('shp-intro-sub');
  if (sub) sub.textContent = SHP_NIGHT_FLAVOUR[shpNightFlavourIdx % SHP_NIGHT_FLAVOUR.length] || SHP_NIGHT_FLAVOUR[0];
  // Running Moon tally (§9) — the whole reason a Night now matters. Hidden on Night 1 (everyone is
  // on nothing) and in Sylly (Moons there are lives, already on every chip, and there is only one
  // Night).
  const tally = document.getElementById('shp-intro-tally');
  if (tally) {
    const show = !shpSyllyMode && shpNightNum > 1;
    tally.style.display = show ? 'block' : 'none';
    if (show) {
      tally.textContent = Array.from({ length: shpPlayerCount }, (_, i) => {
        const m = shpMoonsHeld[i] || 0;
        return shpName(i) + ' ' + (m === 0 ? '—' : m <= 5 ? '\u{1F319}'.repeat(m) : '\u{1F319}\xD7' + m);
      }).join(' \xB7 ');
    }
  }
  const syllyNote = document.getElementById('shp-intro-sylly');
  if (syllyNote) syllyNote.style.display = shpSyllyMode ? 'flex' : 'none';
  showScreen('screen-shp-night-intro');
  if (shpNightIntroTimer) clearTimeout(shpNightIntroTimer);
  shpNightIntroTimer = setTimeout(() => { shpNightIntroTimer = null; shpShowTable(); }, SHP_INTERSTITIAL_MS);
}

function shpShowTable() {
  showScreen('screen-shp-table');
  if (shpNightEndInfo) { shpRenderNightEnd(); return; }
  const me = shpMyIdx();
  // When the turn first becomes mine, gate card taps for 1 second (prevents accidental plays
  // on the turn-transition render before the player has oriented themselves).
  if (me >= 0 && shpActivePlayer === me && shpTapReadyForPlayer !== me) {
    shpTapReadyForPlayer = me;
    shpCardTapReady = false;
    if (shpTapReadyTimer) { clearTimeout(shpTapReadyTimer); shpTapReadyTimer = null; }
    // Footer-only repaint (not shpRenderTable) — a full re-render here rebuilt body.innerHTML
    // mid-parade and restarted the sheep from frame 0 every turn. Also guarded on shpNightEndInfo
    // for the same reason as the animation timer above.
    shpTapReadyTimer = setTimeout(() => {
      shpCardTapReady = true; shpTapReadyTimer = null;
      if (shpNightEndInfo) return;
      shpRenderTableFooter();
    }, 1000);
  } else if (me < 0 || shpActivePlayer !== me) {
    // Not my turn — reset so the buffer fires next time my turn comes around.
    shpTapReadyForPlayer = -1;
    shpCardTapReady = true;
  }
  shpRenderTable();
}

// ── Playing a card ─────────────────────────────────────────────────────────
function shpTapCard(handIdx) {
  const me = shpMyIdx();
  if (shpActivePlayer !== me || !shpAwake(me) || !shpCardTapReady) return;
  if (shpForcedCards === 2 && (shpHands[me] || []).length >= 2) { shpStageTwoCard(handIdx); return; }
  if (!shpIsPlayable(me, handIdx)) { playBoing(); return; }
  playTick();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_PLAY', handIdx } });
  } else {
    shpHostPlayCard(me, handIdx);
  }
}

// Bug (14 Aug 2026 playtest): a forced Heavy Eyelids pair was submitted with NO legality check on
// the specific order tapped — Black Sheep (99) then +2 busted, even though shpHasSafePair (which
// only gates the STUCK/Deep-Sleep detector) already knew a DIFFERENT order of the same two cards
// was safe. Single-card play never allows a deterministic bust (shpIsPlayable); two-card selection
// now matches that: the second tap is rejected, same as tapping an illegal single card.
function shpStageTwoCard(handIdx) {
  const me = shpMyIdx();
  const pos = shpTwoSel.indexOf(handIdx);
  if (pos >= 0) { shpTwoSel.splice(pos, 1); playPillClick(); shpRenderTable(); return; }
  if (shpTwoSel.length >= 2) return;
  const cd = SHP_CARDS[shpHands[me][handIdx]];
  if (shpNoPillowNext && cd.family === 'pillow') { playBoing(); return; }        // Wide Awake ban
  if (shpTwoSel.length === 1 && shpPairFinalBest(me, shpTwoSel[0], handIdx) > shpCeiling) {
    playBoing(); return;                                                        // deterministic bust in THIS order
  }
  shpTwoSel.push(handIdx);
  playPillClick();
  shpRenderTable();
}

function shpConfirmTwoCard() {
  if (shpTwoSel.length !== 2) return;
  const me = shpMyIdx();
  const a = shpTwoSel[0], b = shpTwoSel[1];
  playTick();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_PLAY', idxA: a, idxB: b } });
  } else {
    shpHostPlayTwoCard(me, a, b);
  }
}

// Apply one card's effect to shared state. Returns { rolled, forcedNext, banPillow }.
// HOST ONLY (both call sites are shpHostPlay*), so mutating hands / the ring here is safe —
// everything it touches is broadcast wholesale in the SHP_TURN_RESULT that follows.
// Every non-arithmetic (ability) card sets shpLastEffect — the same announcement banner Swap
// Dreams and Rude Awakening always had, generalised suite-wide (12 Aug 2026 playtest ask) so a
// Skip/Reverse/Reset/Black Sheep/Skip-a-Few/Heavy Eyelids/Wide Awake is never invisible to the table.
function shpResolveCard(cardId, playerIdx) {
  const c = SHP_CARDS[cardId];
  const rolled = (c.kind === 'random-add') ? shpRandInt(c.min, c.max) : null;
  let forcedNext = false, banPillow = false;
  if (c.kind === 'reverse')    shpDirection *= -1;
  if (c.kind === 'two-card')   forcedNext = true;
  if (c.kind === 'ban-pillow') banPillow = true;

  const resultHerd = shpHerdAfterCard(shpHerd, cardId, rolled);  // computed early — every banner below quotes it

  if (c.kind === 'shuffle') {                    // Rude Awakening — reseat the ring for the rest of the Night
    const before = shpRing().slice();
    let next = shuffle(before.slice());
    // A shuffle that lands on the identical ring is a wasted card — reroll a couple of times
    // when there is actually more than one arrangement available.
    for (let t = 0; t < 4 && shpPlayerCount > 1 && next.join() === before.join(); t++) next = shuffle(before.slice());
    shpSeatOrder = next;
    shpLastEffect = { text: 'Rude Awakening — the table is reseated: ' + next.map(shpName).join(' → ') + '.' };
  } else if (c.kind === 'swap-hands') {          // Swap Dreams — trade Pens with a random living player
    const others = [];
    for (let i = 0; i < shpPlayerCount; i++) if (i !== playerIdx && !shpEliminated[i]) others.push(i);
    if (others.length) {
      const t = others[Math.floor(Math.random() * others.length)];
      const aOld = shpHands[playerIdx].slice(), bOld = shpHands[t].slice();
      const mine = shpHands[playerIdx];
      shpHands[playerIdx] = shpHands[t];
      shpHands[t] = mine;
      // Both sides re-fill to their OWN cap — a Wolf-shrunk cap stays with the player, not the cards.
      // The partner is topped up here because nothing else will until their turn comes round.
      shpDrawUp(t);
      // Snapshot for the flip choreography (shpRenderSwapFlip) — aNew is finalised by the caller
      // once IT has drawn playerIdx back up (that draw happens after this function returns).
      shpSwapAnim = { a: playerIdx, b: t, aOld, bOld, aNew: null, bNew: shpHands[t].slice() };
      shpLastEffect = { text: 'Swap Dreams — ' + shpName(playerIdx) + ' traded Pens with ' + shpName(t) + '.' };
    } else {
      shpSwapAnim = null;
      shpLastEffect = { text: 'Swap Dreams — nobody left to trade with. It fizzles.' };
    }
  } else if (c.kind === 'skip') {
    shpLastEffect = { text: c.label + ' — ' + shpName(playerIdx) + ' stalls the count. The Herd holds at ' + resultHerd + '.' };
  } else if (c.kind === 'reverse') {
    shpLastEffect = { text: c.label + ' — direction flips. Now heading ' + (shpDirection === 1 ? 'Forward →' : 'Reverse ↺') + '.' };
  } else if (c.kind === 'reset') {
    shpLastEffect = { text: c.label + ' — the Herd resets to ' + resultHerd + '.' };
  } else if (c.kind === 'set') {
    shpLastEffect = { text: c.label + ' — the Herd snaps to ' + resultHerd + '.' };
  } else if (c.kind === 'random-add') {
    shpLastEffect = { text: c.label + ' — the Herd ' + (shpPhase === 'plunge' ? 'falls' : 'jumps') + ' by ' + rolled + '.' };
  } else if (c.kind === 'two-card') {
    shpLastEffect = { text: c.label + ' — ' + shpName(shpNextPlayer(playerIdx)) + ' must play two cards next turn.' };
  } else if (c.kind === 'ban-pillow') {
    shpLastEffect = { text: c.label + ' — ' + shpName(shpNextPlayer(playerIdx)) + " can't play a Pillows card next turn." };
  }

  shpHerd = resultHerd;
  if (c.family === 'pasture') shpChargeMeter();
  return { rolled, forcedNext, banPillow };
}

function shpHostPlayCard(playerIdx, handIdx) {
  if (playerIdx !== shpActivePlayer) return;
  const cardId = shpHands[playerIdx][handIdx];
  if (cardId === undefined) return;
  if (!shpIsPlayable(playerIdx, handIdx)) return; // full legality guard (all card kinds)
  shpHands[playerIdx].splice(handIdx, 1);
  if (cardId !== 13) shpDiscard.push(cardId);      // Fogged Dream dissolves on play — never recycled
  shpLastEffect = null; shpSwapAnim = null;
  const herdBefore = shpHerd;                      // ← before shpResolveCard (§6 revert snapshot)
  const r = shpResolveCard(cardId, playerIdx);
  shpDrawUp(playerIdx);
  if (shpSwapAnim && shpSwapAnim.a === playerIdx && shpSwapAnim.aNew === null) shpSwapAnim.aNew = shpHands[playerIdx].slice();
  const res = shpPostResolve(playerIdx, herdBefore); // Plunge entry / bust / mercy
  if (!res.busted) {
    shpActivePlayer = shpNextPlayer(playerIdx);
    shpForcedCards = r.forcedNext ? 2 : 1;
    shpNoPillowNext = r.banPillow;
    shpPlungeTick();                               // ceiling descent for the new turn (no-op in Climb)
  }
  // §8 "Why a bust sends two packets, in this order": SHP_TURN_RESULT always fires first (carrying
  // the reverted Herd, busted:true, nextActive still pointing at the crasher), THEN shpHostCrash's
  // SHP_DOZE moves the seat. shpActivePlayer is unchanged above when busted, so nextActive is
  // correct without extra plumbing.
  shpBroadcastTurn([cardId], r.rolled != null ? [r.rolled] : [], playerIdx, res.busted);
  if (res.busted) { shpHostCrash(playerIdx, 'busted', res.landedOn); return; }
  if (shpMeterReady()) shpHostOpenLottery(); else shpAfterAdvance();
}

function shpHostPlayTwoCard(playerIdx, a, b) {
  if (playerIdx !== shpActivePlayer) return;
  const h = shpHands[playerIdx];
  if (a == null || b == null || a === b || h[a] === undefined || h[b] === undefined) return;
  const ids = [h[a], h[b]];
  [a, b].sort((x, y) => y - x).forEach(i => h.splice(i, 1));     // remove higher index first
  ids.forEach(id => { if (id !== 13) shpDiscard.push(id); });    // Fogged Dream dissolves — never recycled
  const rolled = []; let banPillow = false;
  shpLastEffect = null; shpSwapAnim = null;
  const herdBefore = shpHerd;                      // ← before either card resolves (§6 revert snapshot)
  ids.forEach(id => { const r = shpResolveCard(id, playerIdx); if (r.rolled != null) rolled.push(r.rolled); if (r.banPillow) banPillow = true; });
  shpForcedCards = 1; shpTwoSel = [];                            // consumed; Heavy Eyelids does not chain (edge c)
  shpDrawUp(playerIdx);
  if (shpSwapAnim && shpSwapAnim.a === playerIdx && shpSwapAnim.aNew === null) shpSwapAnim.aNew = shpHands[playerIdx].slice();
  const res = shpPostResolve(playerIdx, herdBefore);
  if (!res.busted) {
    shpActivePlayer = shpNextPlayer(playerIdx);
    shpNoPillowNext = banPillow;
    shpPlungeTick();
  }
  shpBroadcastTurn(ids, rolled, playerIdx, res.busted);
  if (res.busted) { shpHostCrash(playerIdx, 'busted', res.landedOn); return; }
  if (shpMeterReady()) shpHostOpenLottery(); else shpAfterAdvance();
}

function shpBroadcastTurn(playedIds, rolled, byIdx, busted) {
  shpLastDisrupt = null;                          // a new play ends the dream-shift banner
  shpDozeNotice = null;                           // ...and the previous doze/Moon-loss banner (§4)

  // Push to play history (newest-first, cap at 20)
  const entry = { cardIds: playedIds.slice(), rolledVal: rolled, byIdx, byName: shpName(byIdx) };
  shpPlayHistory.unshift(entry);
  if (shpPlayHistory.length > 20) shpPlayHistory.length = 20;

  // Sheep parade — arc into the counter when the Herd grows, arc back out when counting backwards.
  // Skipped on a bust: the Herd rides here already REVERTED (§6), so the card-value-based parade
  // would show growth that never actually happened on the live counter.
  if (!busted) shpStartSheepAnim(playedIds, rolled);

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_TURN_RESULT',
      herd: shpHerd, direction: shpDirection, nextActive: shpActivePlayer, forcedCards: shpForcedCards,
      noPillowNext: shpNoPillowNext,
      played: playedIds, rolled, byIdx, busted: !!busted,
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive, meter: shpMeter,
      phase: shpPhase, ceiling: shpCeiling, grace: shpPlungeGrace, drop: shpCurrentDrop,
      playHistory: shpPlayHistory,
      // seatOrder rides every turn: a client walking a stale ring after a Rude Awakening would
      // render the wrong "next up". lastEffect is this play's outcome note (swap partner / new order).
      // swapAnim rides only on the turn it's set (shpSwapAnim is null on every other turn) — Firebase
      // erases the whole field then, and the client-side rebuild (`|| null`) covers it, same as lastEffect.
      seatOrder: shpSeatOrder, lastEffect: shpLastEffect, swapAnim: shpSwapAnim,
    }});
  }
  shpShowTable();
}

// Host: after advancing, the new active player Deep-Sleeps if they have no legal line.
// Host: after advancing, if the new active player has no legal line we HOLD the table and hand
// them a "Nod Off" button rather than auto-running the Deep Sleep. Previously this fired straight
// into the summary — which, combined with the render timers below repainting over it, left a
// non-host stuck player on a table with no button and no way forward (12 Aug 2026 playtest).
function shpAfterAdvance() {
  if (shpHasLegalLine(shpActivePlayer)) return;
  shpStuckIdx = shpActivePlayer;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'SHP_STUCK', stuckIdx: shpStuckIdx } });
  }
  shpShowTable();
}

// The stuck player taps "Nod Off". Host resolves directly; a client sends an ACTION (the host is
// also a participant, so the dedup guard would drop a self-sent envelope — logic-engine.md).
function shpConfirmStuck() {
  const me = shpMyIdx();
  if (shpStuckIdx < 0 || shpStuckIdx !== me) return;
  playDone();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_STUCK_ACK' } });
    return;                                     // wait for the host's SHP_DOZE
  }
  shpHostCrash(shpStuckIdx, 'stuck', null);      // landedOn null — nothing was played to land anywhere
}

// Every crash — busted gamble, bad pair, or no legal line — lands here (§7.1). The stuck-hold flow
// (shpStuckIdx / "Nod Off" / SHP_STUCK_ACK) is unchanged upstream; it now ends here instead of the
// old shpHostDeepSleep. shpDozed and shpEliminated are mode-disjoint by construction (§2): shpDozed
// only ever set in normal mode, shpEliminated only ever in Sylly.
function shpHostCrash(crasherIdx, reason, landedOn) {
  shpStuckIdx = -1;                 // the hold, if any, is now resolved
  shpForcedCards = 1; shpNoPillowNext = false; shpTwoSel = [];
  if (shpSyllyMode) shpHostMoonLoss(crasherIdx, reason, landedOn);
  else              shpHostDoze(crasherIdx, reason, landedOn);
}

// Normal mode (§7.2) — a crash takes the player out of THIS NIGHT ONLY. No summary, no ack, no
// redeal: the Herd, ceiling, direction, seating ring, every other hand and the Flock are all
// untouched. The dozed player's own hand returns to the discard (§3.1(c)) — those cards are dead
// until the next deal and holding them thins the live pool for no benefit. A Fogged Dream in a
// dozed hand dissolves rather than recycling, same rule as playing one.
function shpHostDoze(crasherIdx, reason, landedOn) {
  shpDozed[crasherIdx] = true;
  shpDozeOrder.push(crasherIdx);
  shpDozeNotice = { idx: crasherIdx, reason, landedOn };
  (shpHands[crasherIdx] || []).forEach(cid => { if (cid !== 13) shpDiscard.push(cid); });
  shpHands[crasherIdx] = [];
  const over = shpAwakeCount() <= 1;
  // Compute the next active player AFTER setting shpDozed and always FROM crasherIdx — walking from
  // the pre-doze active seat would land on the crasher again (the "ordering trap" in §7.2). When the
  // Night is over, leave shpActivePlayer pointing at the crasher — there's no "next" this Night.
  if (!over) shpActivePlayer = shpNextPlayer(crasherIdx);
  // SHP_DOZE must broadcast even when this crash ENDS the Night — it's the only packet carrying
  // this crasher's shpDozed/hand mutation. A loopback probe caught the bug this comment is warning
  // about: returning early here (as the pre-chunk-7 code did) means the client never learns the
  // FINAL crasher's hand was discarded, and its shpDozed/shpDozeOrder silently fall behind the
  // host's — permanently, since nothing else ever re-sends them before the next deal.
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DOZE', crasher: crasherIdx, reason, landedOn, mode: 'normal',
      herd: shpHerd, dozed: shpDozed, dozeOrder: shpDozeOrder, moons: shpMoonsHeld,
      eliminated: shpEliminated, elimOrder: shpElimOrder,
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive,
      nextActive: shpActivePlayer, phase: shpPhase, ceiling: shpCeiling,
      grace: shpPlungeGrace, drop: shpCurrentDrop,
    }});
  }
  if (over) { shpHostNightEnd(); return; }         // SHP_NIGHT_END follows as its own, second packet
  shpShowTable();
  shpAfterAdvance();                // the next player may be stuck too — this is the doze cascade
}

// Sylly mode (§7.3) — Moons are lives; a crash costs one. 0 Moons makes the player a Sleepwalker
// (unchanged elimination/ghost-system wiring). Otherwise they get the Jolt: their whole hand is
// discarded and redrawn, because "one continuous Night" removed the redeal that used to be what
// gave a stuck player a playable hand again — without it they'd stick out again on their very next
// turn, bleeding a Moon per lap until eliminated.
function shpHostMoonLoss(crasherIdx, reason, landedOn) {
  shpMoonsHeld[crasherIdx]--;
  shpDozeNotice = { idx: crasherIdx, reason, landedOn };
  if (shpMoonsHeld[crasherIdx] <= 0 && !shpEliminated[crasherIdx]) {
    shpEliminated[crasherIdx] = true; shpElimOrder.push(crasherIdx);   // Sleepwalker; ghost system arms
  } else {
    shpJolt(crasherIdx);
  }
  const over = shpAwakeCount() <= 1;
  if (!over) { shpActivePlayer = shpNextPlayer(crasherIdx); shpPlungeTick(); }  // the descent keeps ticking
  // SHP_DOZE must broadcast even when this crash ENDS the match — same reasoning as shpHostDoze
  // above: it's the only packet carrying this crasher's elimination/Jolt/hand mutation, and
  // SHP_GAMEOVER's payload ({winner, standings}) doesn't repeat any of that.
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DOZE', crasher: crasherIdx, reason, landedOn, mode: 'sylly',
      herd: shpHerd, dozed: shpDozed, dozeOrder: shpDozeOrder, moons: shpMoonsHeld,
      eliminated: shpEliminated, elimOrder: shpElimOrder,
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive,
      nextActive: shpActivePlayer, phase: shpPhase, ceiling: shpCeiling,
      grace: shpPlungeGrace, drop: shpCurrentDrop,
    }});
  }
  if (over) { shpHostGameover(); return; }          // SHP_GAMEOVER follows as its own, second packet
  shpShowTable();
  shpAfterAdvance();
}

// The Jolt (§7.3) — discards the crasher's whole hand and redraws to their current cap. The cap
// restore is NOT optional: shpWolfActive is otherwise cleared only in shpDealNight, and Sylly no
// longer deals twice — without this line one unlucky early Wolf draw costs a player a hand slot for
// the entire match, invisibly and with no way back (§3.1(b)). A player can of course draw the same
// recycled Wolf again afterwards; that is fine and intended. An eliminated player gets no Jolt.
function shpJolt(i) {
  (shpHands[i] || []).forEach(cid => { if (cid !== 13) shpDiscard.push(cid); });  // §3.1(a)
  shpHands[i] = [];
  shpWolfActive[i] = false;
  shpHandCap[i]    = shpHandSize;
  shpDrawUp(i);                     // reshuffles the discard if the Flock is short — existing behaviour
}

// Normal mode only (§7.4) — every player acks (including the ones who dozed out ten minutes ago;
// this is the one moment the whole table looks at the same screen). Continue is host-gated and
// locked until shpDeepSleepAcks >= shpDeepSleepAckNeeded, unchanged from the pre-rework ack machinery
// (repurposed here, not replaced — §4 "Removed").
function shpHostNightEnd() {
  let winner = -1;
  for (let i = 0; i < shpPlayerCount; i++) if (shpAwake(i)) { winner = i; break; }
  shpMoonsHeld[winner]++;
  const order = [winner].concat(shpDozeOrder.slice().reverse());   // finishing order, winner first
  const over  = shpMoonsHeld[winner] >= shpMoonsToWin;

  shpDeepSleepAckNeeded = shpPlayerCount;
  shpDeepSleepAcks = window.syllyMultiplayerMode === 'single' ? shpPlayerCount : 1;  // host counts itself
  shpIAcked = true;
  shpNightEndInfo = { winner, order, over };
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_NIGHT_END', winner, order, over, moons: shpMoonsHeld,
      nightNum: shpNightNum, acksNeeded: shpDeepSleepAckNeeded,
    }});
  }
  shpShowTable();
}

function shpHostContinue() {
  const info = shpNightEndInfo; shpNightEndInfo = null;
  if (info && info.over) { shpHostGameover(info.order); return; }
  // The Night's winner opens the next Night — replaces the old "the crasher opens" rule, which no
  // longer has a referent (the crasher is now whoever dozed first, a full Night ago). No
  // shpEliminated guard needed — normal mode never eliminates.
  shpDealNight(info ? info.winner : shpActivePlayer);
}

// finalNightOrder: normal mode's tie-break — of two players on equal Moons, the one who placed
// higher in the deciding (final) Night ranks higher in the match standings. It is the only
// tie-break available and it is the fair one. Captured by shpHostContinue BEFORE shpNightEndInfo is
// cleared, since shpHostGameover needs it after that point.
function shpHostGameover(finalNightOrder) {
  let winner = -1, standings;
  if (shpSyllyMode) {
    for (let i = 0; i < shpPlayerCount; i++) if (!shpEliminated[i]) { winner = i; break; }
    standings = [winner].concat(shpElimOrder.slice().reverse());
  } else {
    for (let i = 0; i < shpPlayerCount; i++) if (shpMoonsHeld[i] >= shpMoonsToWin) { winner = i; break; }
    const order = finalNightOrder || [];
    standings = Array.from({ length: shpPlayerCount }, (_, i) => i).sort((a, b) => {
      if (shpMoonsHeld[b] !== shpMoonsHeld[a]) return shpMoonsHeld[b] - shpMoonsHeld[a];
      return order.indexOf(a) - order.indexOf(b);   // earlier in the final Night's finish = ranks higher
    });
  }
  shpGameWinner = winner;
  shpGameStandings = standings;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'SHP_GAMEOVER', winner, standings: shpGameStandings } });
  }
  shpRenderGameover();
}

// ── Rendering ──────────────────────────────────────────────────────────────
// Sheep flight: net Herd movement from a play → a parade of 🐑 that arc IN to the counter (growth)
// or OUT to the left (counting backwards). Climb-only; identical on host and client (both read the
// synced played/rolled arrays). Capped at 8 sheep; the clear timer is sized to the LAST sheep's
// finish (a flat 1500ms cut the tail of the parade off mid-flight once the stagger was counted).
function shpStartSheepAnim(playedIds, rolled) {
  if (shpAnimTimer) { clearTimeout(shpAnimTimer); shpAnimTimer = null; }
  shpAnimSheep = 0;
  if (shpPhase !== 'climb' || !playedIds || !playedIds.length) return;
  let net = 0, ri = 0;
  for (const cid of playedIds) {
    const c = SHP_CARDS[cid];
    if (!c) continue;
    if (c.kind === 'add')             net += Math.min(c.value, 10);
    else if (c.kind === 'set')        net += 7;
    else if (c.kind === 'subtract')   net -= Math.min(c.value, 10);
    else if (c.kind === 'random-add') { const v = (rolled && rolled[ri] != null) ? rolled[ri] : c.min; net += Math.min(v, 10); }
    if (c.kind === 'random-add') ri++;
  }
  if (net === 0) return;
  shpAnimDir   = net > 0 ? 'in' : 'out';
  shpAnimSheep = Math.min(Math.abs(net), 8);
  // 1200ms flight + 90ms stagger per sheep + a little slack, so the last one lands before the clear.
  const clearMs = 1200 + (shpAnimSheep - 1) * SHP_SHEEP_STAGGER_MS + 250;
  shpAnimTimer = setTimeout(() => {
    shpAnimSheep = 0; shpAnimTimer = null;
    // Guard: a Night can END inside this window (a 'stuck' crash resolves in the same tick as the
    // play that caused it). Rendering the TABLE here would paint straight over the Night-End
    // summary — which is exactly the "it goes to the summary then switches back" bug, and left a
    // non-host stuck player on a table with no button. Route through the guarded path.
    if (shpNightEndInfo) { shpRenderNightEnd(); return; }
    shpRenderTable();
  }, clearMs);
}

// The doze/Moon-loss banner's copy (§9). Four shapes: normal mode says who is out for the Night and
// how many are left; Sylly says what the Moon cost bought (a Jolt) or that it bought nothing (a
// Sleepwalker). `landedOn` is null for a 'stuck' crash — nothing was played to land anywhere.
function shpDozeNoticeText(n) {
  const who = shpName(n.idx);
  const how = (n.reason === 'busted' && n.landedOn != null)
    ? 'gambled to ' + n.landedOn
    : 'had no safe cards left';
  if (shpSyllyMode) {
    if (shpEliminated[n.idx]) return '\u{1F4A4} ' + who + ' is out of Moons — now a Sleepwalker.';
    return '\u{1F634} ' + who + ' ' + how + ' — −1 Moon. Fresh hand, same dream.';
  }
  return '\u{1F634} ' + who + ' ' + how + ' — dozed off. ' + shpAwakeCount() + ' still awake.';
}

function shpRenderTable() {
  const body = document.getElementById('shp-table-body');
  const footer = document.getElementById('shp-table-footer');
  const status = document.getElementById('shp-table-status');
  if (!body || !footer) return;
  const me = shpMyIdx();
  const plunge = (shpPhase === 'plunge');

  // Status bar — night number + red in Plunge. Sylly is ONE continuous Night (§2), so a counter
  // there would sit on "Night 1" all match and read as broken; it gets the name instead.
  if (status) {
    const nightLabel = shpSyllyMode ? 'The Long Night' : ('Night ' + shpNightNum);
    status.textContent = plunge ? ('THE PLUNGE 🔻 \xB7 ' + nightLabel) : nightLabel;
    status.className = 'text-xs font-semibold uppercase tracking-widest ' + (plunge ? 'text-red-500' : 'shp-label');
  }

  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col items-center gap-4 w-full';

  // One-shot Plunge-entry flash
  if (shpPlungeFlash) {
    const flash = document.createElement('p');
    flash.className = 'text-red-600 text-lg font-bold text-center';
    flash.textContent = '💤 THE PLUNGE BEGINS — the count inverts!';
    wrap.appendChild(flash);
    shpPlungeFlash = false;
  }

  // ── Herd display ──
  const herdBox = document.createElement('div');
  if (plunge) {
    // Spike-trap stack: ceiling (falling) → gap → herd (at bottom)
    const gap = shpCeiling - shpHerd;
    herdBox.className = 'flex flex-col items-center gap-2 w-full bg-red-50 border border-red-200 rounded-2xl px-4 py-3';
    herdBox.innerHTML =
      '<div class="flex flex-col items-center">' +
        '<p class="text-red-400 text-xs uppercase tracking-widest">The Dream is Collapsing 🔻</p>' +
        '<p class="text-3xl font-bold text-red-600">' + shpCeiling + '</p>' +
        '<p class="text-red-400 text-xs">' + (shpPlungeGrace > 0 ? 'steady…' : '−' + shpCurrentDrop + '/turn') + '</p>' +
      '</div>' +
      '<p class="text-stone-400 text-xs font-semibold">↕ ' + gap + ' sheep left</p>' +
      '<div class="flex flex-col items-center">' +
        '<p class="text-stone-400 text-xs uppercase tracking-widest">The Herd</p>' +
        '<p class="text-5xl font-bold text-red-700">' + shpHerd + '</p>' +
        '<p class="text-red-500 text-xs font-semibold">Drive to 0 to escape.</p>' +
      '</div>';
  } else {
    // Two stacked grid-cols-3 rows sharing one column template: a heading row (The Pen | The Herd |
    // Last Played, all three headings on ONE line — owner ask, 14 Aug 2026) sits above a content row
    // (pen image | counter stack | last-played card). Splitting them like this is what makes the
    // headings align exactly: three equal-weight <p> labels in their own row can never drift out of
    // line the way "the pen has no heading of its own" (the old single-row approach) did.
    herdBox.className = 'flex flex-col gap-1 w-full';

    // Sheep flight — absolutely positioned (a .shp-sheep-layer overlay) so it NEVER shifts the layout.
    // The old inline row pushed a row in/out between the header and counter on every play (the jank).
    // Uses the real sheep art when the core pack resolves it (assetExtra — non-card game art);
    // falls back to the 🐑 emoji if a skin/pack ever ships without it. The flying sheep is
    // deliberately an INNER <img> inside the animated <span>: the keyframes own the span's
    // transform (translate + scale, the arc itself), so the flip for "out" has to live on a
    // child element or it would fight the same transform property every frame.
    const sheepArtUrl = (typeof assetExtra === 'function') && assetExtra('shp', 'sheep');
    let sheepHtml = '';
    if (shpAnimSheep > 0) {
      const anim = (shpAnimDir === 'out') ? 'shpSheepArcOut' : 'shpSheepArcIn';
      const flip = (shpAnimDir === 'out') ? ' style="transform:scaleX(-1)"' : '';
      let spans = '';
      for (let s = 0; s < shpAnimSheep; s++) {
        const inner = sheepArtUrl
          ? '<img class="shp-sheep-fly-img" src="' + sheepArtUrl + '"' + flip + ' />'
          : '🐑';
        spans += '<span class="shp-sheep-fly" style="animation-name:' + anim + ';animation-delay:' + (s * SHP_SHEEP_STAGGER_MS) + 'ms">' + inner + '</span>';
      }
      // Scale the sheep to the size of the flock: a +10 sends 8 of them down a ~132px path, so at a
      // fixed 2.5rem they overlap into one continuous woolly mass. Smaller flocks stay big and readable.
      const sheepW = shpAnimSheep >= 7 ? '1.55rem' : shpAnimSheep >= 4 ? '1.95rem' : '2.5rem';
      sheepHtml = '<div class="shp-sheep-layer" style="--shp-sheep-w:' + sheepW + '">' + spans + '</div>';
    }

    // Heading row — three equal labels, one per column, so they can never drift out of alignment
    // the way an implicit/self-centred pen or Last Played column could.
    const headRow = document.createElement('div');
    headRow.className = 'grid grid-cols-3 items-end w-full';
    headRow.innerHTML =
      '<p class="shp-last-label text-center">The Pen</p>' +
      '<p class="shp-herd-label text-center">The Herd</p>' +
      '<p class="shp-last-label text-center">Last Played</p>';

    // Content row — pen image, counter stack, last-played card. Vertically centred against each
    // other (items-center) since the centre column is now the only one with real height variation.
    const contentRow = document.createElement('div');
    contentRow.className = 'grid grid-cols-3 items-center w-full';

    // Static pen — a single pre-composed image (sheep + fence baked in), filling the left
    // whitespace the flying sheep already arc through. Falls back to a plain emoji trio if the
    // core art hasn't resolved (e.g. a bare install racing the SW precache).
    const penArtUrl = (typeof assetExtra === 'function') && assetExtra('shp', 'pen');
    let penInner = '<p class="text-lg leading-none opacity-70" aria-hidden="true">🐑🐑<br>🐑</p>';
    if (penArtUrl) {
      penInner = '<img class="shp-pen-img" src="' + penArtUrl + '" alt="" aria-hidden="true" />';
    }
    const penCol = document.createElement('div');
    penCol.className = 'flex justify-center';
    penCol.innerHTML = penInner;

    // Centre column — no label of its own any more (it rode up into headRow); just the counter stack.
    const midCol = document.createElement('div');
    midCol.className = 'relative flex flex-col items-center gap-0.5';
    const pct  = Math.max(0, Math.min(100, Math.round((shpHerd / Math.max(1, shpCeiling)) * 100)));
    const ramp = pct >= 85 ? { bar: '#dc2626', num: 'text-red-600'    }
               : pct >= 60 ? { bar: '#d97706', num: 'text-amber-600'  }
               :             { bar: '#3A3D52', num: 'shp-label'       };
    midCol.innerHTML =
      sheepHtml +
      '<p class="shp-ceiling-badge">ceiling ' + shpCeiling + '</p>' +
      '<p class="text-6xl font-bold leading-none ' + ramp.num + '">' + shpHerd + '</p>' +
      '<div class="shp-herd-bar" aria-hidden="true">' +
        '<div class="shp-herd-bar-fill" style="width:' + pct + '%;background:' + ramp.bar + '"></div>' +
      '</div>';

    // Right column — the real card(s) via the render seam (shpRenderCard), scaled into a
    // fixed-footprint .shp-last-card wrapper. The card itself is the tap target — opens the Dream
    // Journal; no separate link text needed (the log isn't load-bearing this game). An em dash
    // placeholder keeps the column (and the heading row above it) from jumping the instant the
    // first card is played.
    const rightCol = document.createElement('div');
    rightCol.className = 'flex justify-center';
    if (shpPlayHistory.length > 0) {
      const cardsBtn = document.createElement('button');
      cardsBtn.className = 'flex items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100';
      cardsBtn.setAttribute('aria-label', 'View Dream Journal');
      shpPlayHistory[0].cardIds.forEach(id => {
        const cwrap = document.createElement('div');
        cwrap.className = 'shp-last-card';
        cwrap.appendChild(shpRenderCard(id));
        cardsBtn.appendChild(cwrap);
      });
      cardsBtn.addEventListener('click', shpOpenLog);
      rightCol.appendChild(cardsBtn);
    } else {
      rightCol.innerHTML = '<p class="text-stone-300 text-2xl leading-none">—</p>';
    }

    contentRow.append(penCol, midCol, rightCol);
    herdBox.append(headRow, contentRow);
  }
  wrap.appendChild(herdBox);

  // ── Play pile / last-played indicator (Plunge only — Climb shows it in the herd band above) ──
  if (shpPlayHistory.length > 0 && plunge) {
    const last = shpPlayHistory[0];
    const lastLabel = last.cardIds.map(id => {
      const c = SHP_CARDS[id]; return c ? (c.emoji + '\xA0' + c.label) : '?';
    }).join(' + ');
    const pileBtn = document.createElement('button');
    pileBtn.className = 'flex items-center gap-1 text-stone-400 text-xs active:text-stone-600 transition-colors';
    pileBtn.innerHTML = 'Last: <span class="text-stone-600 font-medium">' + lastLabel + '</span>&nbsp;<span class="underline">Dream Journal →</span>';
    pileBtn.addEventListener('click', shpOpenLog);
    wrap.appendChild(pileBtn);
  }

  // ── Direction (forward above chips, reverse below) ──
  // Only the LIVE direction gets a filled pill; the dormant one stays a ghost. Same
  // above/below placement as before — it reads as the flow of play around the table.
  const dirPill = (live, glyph, label) => {
    const p = document.createElement('p');
    p.className = 'text-center';
    p.innerHTML = '<span class="' + (live ? (plunge ? 'shp-dir shp-dir-live-plunge' : 'shp-dir shp-dir-live') : 'shp-dir shp-dir-idle') + '">' +
                    '<span class="shp-dir-glyph">' + glyph + '</span>' + label +
                  '</span>';
    return p;
  };
  wrap.appendChild(dirPill(shpDirection === 1, '→', 'Forward'));

  // ── Player chips ──
  // Walked in SEAT ORDER, not index order, so a Rude Awakening (id 17) is visibly a reseat
  // rather than an invisible rules change. Hand size is deliberately NOT shown: everyone is
  // always at their cap, so the only thing it ever revealed was who had been Wolf-shrunk —
  // private information that has no business being public.
  const opp = document.createElement('div');
  opp.className = 'flex flex-wrap justify-center gap-2 w-full';
  shpRing().forEach(i => {
    const isActive = i === shpActivePlayer && shpAwake(i);
    const chip = document.createElement('div');
    // A dozed player wears the same "out" chip as a Sleepwalker — they are out of THIS Night, and
    // the two states are mode-disjoint (§2), so a table only ever shows one of the two.
    chip.className = 'shp-chip ' +
      (shpAwake(i) ? (isActive ? (plunge ? 'shp-chip-active-plunge' : 'shp-chip-active') : 'shp-chip-idle')
                   : 'shp-chip-out');
    const rawMoons = shpMoonsHeld[i] || 0;
    const moons = shpEliminated[i] ? '\u{1F4A4}'
      : rawMoons <= 5 ? '\u{1F319}'.repeat(Math.max(0, rawMoons))
      : '\u{1F319}\xD7' + rawMoons;
    const dozeTag = (shpDozed[i] && !shpEliminated[i])
      ? '<span class="shp-chip-doze">\u{1F634} Dozed Off</span>' : '';
    chip.innerHTML =
      '<span class="shp-chip-name">' + shpName(i) + (i === me ? ' (you)' : '') + '</span>' +
      dozeTag +
      '<span class="shp-chip-moons">' + moons + '</span>';
    opp.appendChild(chip);
  });
  wrap.appendChild(opp);

  wrap.appendChild(dirPill(shpDirection === -1, '↺', 'Reverse'));

  // ── Nightmare Meter — visible once the ghost system is active ──
  if (shpSyllyMode && shpElimOrder.length > 0) {
    const meterEl = document.createElement('div');
    meterEl.className = 'flex flex-col items-center gap-1 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2';
    let dots = '';
    for (let k = 0; k < shpMeterFill; k++) dots += (k < shpMeter ? '🌑' : '⚪');
    meterEl.innerHTML =
      '<p class="text-violet-500 text-xs font-semibold uppercase tracking-wide">Nightmare Meter</p>' +
      '<p class="text-lg leading-none">' + dots + '</p>' +
      (shpEcho > 0 ? '<p class="text-xs text-violet-600">🔊 Global Echo \xB7 Pasture +' + shpEcho + '</p>' : '');
    wrap.appendChild(meterEl);
  }

  // ── Doze / Moon-loss banner — the crash that just happened (§9) ──
  // Same slot and treatment as the play-effect banner below, cleared by the next play
  // (shpBroadcastTurn). This is the ONLY announcement of a normal-mode crash: there is no summary
  // screen any more unless the crash also ended the Night.
  if (shpDozeNotice) {
    const dz = document.createElement('p');
    dz.className = 'text-stone-700 text-sm text-center font-semibold bg-stone-100 border border-stone-300 rounded-xl px-3 py-2';
    dz.textContent = shpDozeNoticeText(shpDozeNotice);
    wrap.appendChild(dz);
  }

  // ── Play-effect banner — outcome of the current play (Swap Dreams / Rude Awakening) ──
  // Separate from the nightmare banner below: this one describes something a PLAYER just did,
  // and without it a reseat or a hand swap is invisible on every device but the actor's.
  if (shpLastEffect && shpLastEffect.text) {
    const fx = document.createElement('p');
    fx.className = 'shp-tint-bg text-sm text-center font-semibold border rounded-xl px-3 py-2';
    fx.textContent = '\u{1F504} ' + shpLastEffect.text;
    wrap.appendChild(fx);
  }

  // ── Dream-shift banner — last resolved nightmare ──
  if (shpLastDisrupt) {
    const ds = document.createElement('p');
    ds.className = 'text-violet-700 text-sm text-center font-semibold bg-violet-50 border border-violet-200 rounded-xl px-3 py-2';
    ds.textContent = '🌙 ' + shpLastDisrupt.text;
    wrap.appendChild(ds);
  }

  // ── Action banner ──
  const banner = document.createElement('p');
  banner.className = 'text-stone-500 text-sm text-center';
  if (shpGhostPending) {
    banner.textContent = (shpEliminated[me] && shpSpendHolder === me)
      ? 'Your nightmare to choose… 💤'
      : '💤 ' + shpName(shpSpendHolder) + ' is picking a nightmare…';
  } else {
    // Stuck is now HOST-DECLARED state (shpStuckIdx, synced via SHP_STUCK) rather than a local
    // re-derivation. The table holds here — nothing auto-advances — until the stuck player taps
    // "Nod Off", so every device needs to agree on who we're waiting for.
    banner.textContent = shpDozed[me] ? 'You’re out for the night — back next Night.'
      : shpEliminated[me] ? (shpSyllyMode ? 'You are a Sleepwalker, haunting the dream…' : 'You are out for the night…')
      : (shpStuckIdx >= 0)
        ? (shpStuckIdx === me
            ? '\u{1F634} No safe cards left — you’re drifting off…'
            : '\u{1F634} ' + shpName(shpStuckIdx) + ' has no safe cards left…')
      : (shpActivePlayer === me
          ? (shpForcedCards === 2 ? 'Heavy Eyelids — play TWO cards.'
             : shpNoPillowNext ? '⏰ Wide Awake — no Pillows this turn.'
             : 'Your turn — play a card.')
          : 'Waiting for ' + shpName(shpActivePlayer) + '…');
  }
  wrap.appendChild(banner);
  body.appendChild(wrap);

  shpRenderTableFooter();
}

// Footer only — split out of shpRenderTable so the 1s tap-gate timer can re-enable card taps
// WITHOUT rebuilding body.innerHTML. A full re-render mid-flight destroys and recreates the
// .shp-sheep-fly spans, restarting the parade from frame 0 (it stuttered every single turn).
function shpRenderTableFooter() {
  const footer = document.getElementById('shp-table-footer');
  if (!footer) return;
  const me = shpMyIdx();
  footer.innerHTML = '';
  // Swap Dreams flip choreography — one-shot (same idiom as shpPlungeFlash): the instant a device
  // that was actually involved renders it, it's consumed, so a later footer-only repaint (the 1s
  // tap-gate timer) shows the normal tappable hand instead of replaying the flip.
  if (shpSwapAnim && (shpSwapAnim.a === me || shpSwapAnim.b === me)) {
    const anim = shpSwapAnim; shpSwapAnim = null;
    footer.appendChild(shpRenderSwapFlip(anim, me === anim.a));
    return;
  }
  if (shpGhostPending) {                          // table is gated on the spend-holder's blind pick
    if (shpEliminated[me] && shpSpendHolder === me) footer.appendChild(shpRenderLottery());
    return;
  }
  if (shpEliminated[me]) return;                  // sleepwalker: no hand, no input
  // Dozed: same treatment. Their hand went back to the discard the moment they dozed (§3.1c), so
  // there is nothing left to render and nothing to tap until the next deal.
  if (shpDozed[me]) return;
  if (shpStuckIdx >= 0 && shpStuckIdx === me) {
    // Held, not auto-advanced: this player's hand is all-illegal, so show it greyed and give them
    // the button that ends the Night on their own tap. Nothing moves until they press it.
    footer.appendChild(shpHandFooter(me, false));
    const btn = document.createElement('button');
    btn.className = 'min-h-14 w-full rounded-2xl shp-cta active:scale-95 ' +
                    'text-white font-semibold text-lg transition-all duration-150 btn-mp-action';
    btn.textContent = 'Nod Off';
    btn.addEventListener('click', shpConfirmStuck);
    footer.appendChild(btn);
    return;
  }
  const tappable = (shpActivePlayer === me) && shpCardTapReady && shpStuckIdx < 0;
  footer.appendChild(shpHandFooter(me, tappable));
}

function shpClearFlipTimers() {
  shpFlipTimers.forEach(h => clearTimeout(h));
  shpFlipTimers = [];
}

// Swap Dreams — "each player involved has their hand turned over left to right (showing the
// card-back), then again in order reveals the new hand" (playtest ask, 14 Aug 2026). Two staggered
// waves of the same 3D-flip trick (front/back faces on a preserve-3d inner, § css .shp-flip-*):
// wave 1 rotates every OLD card 0deg->180deg, left to right, ending on backs; after a hold, wave 2
// swaps each card's hidden front face to the NEW card (while it's facing away, so nothing pops) and
// continues the same rotation 180deg->360deg, left to right, revealing the new hand. A blocking
// choreography beat (ui-style.md § Motion Standard) — nothing here is tappable until it finishes.
function shpRenderSwapFlip(anim, isA) {
  shpClearFlipTimers();
  const oldHand = ((isA ? anim.aOld : anim.bOld) || []).slice();
  const newHand = ((isA ? anim.aNew : anim.bNew) || []).slice();
  const n = Math.max(oldHand.length, newHand.length);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Doubled from the first pass (220/90/260) — owner playtest wanted more time to actually read
  // the choreography, not just notice it happened.
  const HALF = reduced ? 1 : 440, STAGGER = reduced ? 1 : 180, HOLD = reduced ? 1 : 520;

  const col = document.createElement('div');
  col.className = 'flex flex-col gap-2 items-center';
  const label = document.createElement('p');
  label.className = 'shp-label text-sm font-semibold';
  label.textContent = '\u{1F91D} Swapping Pens…';
  col.appendChild(label);
  const row = document.createElement('div');
  row.className = 'flex flex-wrap justify-center gap-2';
  col.appendChild(row);

  const flippers = [];
  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'shp-flip-wrap';
    const inner = document.createElement('div');
    inner.className = 'shp-flip-inner';
    const front = document.createElement('div');
    front.className = 'shp-flip-face';
    if (oldHand[i] != null) front.appendChild(shpRenderCard(oldHand[i]));
    const back = document.createElement('div');
    back.className = 'shp-flip-face shp-flip-face-back';
    back.appendChild(shpRenderCard(null, { faceDown: true }));
    inner.append(front, back);
    wrap.appendChild(inner);
    row.appendChild(wrap);
    flippers.push({ inner, front, newId: newHand[i] });
  }

  // Wave 1 — flip to backs, left to right.
  flippers.forEach((f, i) => {
    f.inner.style.transitionDuration = HALF + 'ms';
    f.inner.style.transitionDelay = (i * STAGGER) + 'ms';
    requestAnimationFrame(() => { f.inner.style.transform = 'rotateY(180deg)'; });
  });
  const wave1End = Math.max(0, flippers.length - 1) * STAGGER + HALF;

  // Wave 2 — while each card is showing its back (front face hidden, facing away), swap the front
  // face's content to the NEW card, then continue the same rotation on to 360deg to reveal it.
  shpFlipTimers.push(setTimeout(() => {
    flippers.forEach(f => { f.front.innerHTML = ''; if (f.newId != null) f.front.appendChild(shpRenderCard(f.newId)); });
  }, wave1End + HOLD - Math.min(10, HOLD)));
  flippers.forEach((f, i) => {
    shpFlipTimers.push(setTimeout(() => {
      f.inner.style.transitionDelay = '0ms';
      f.inner.style.transform = 'rotateY(360deg)';
    }, wave1End + HOLD + i * STAGGER));
  });

  const total = wave1End + HOLD + Math.max(0, flippers.length - 1) * STAGGER + HALF;
  shpFlipTimers.push(setTimeout(() => {
    shpFlipTimers = [];
    if (!shpNightEndInfo) shpRenderTableFooter();   // hand off to the normal, tappable footer
  }, total + 60));

  return col;
}

// The facedown Nightmare Lottery — 3 card-backs the spend-holder flips one of.
function shpRenderLottery() {
  const col = document.createElement('div');
  col.className = 'flex flex-col gap-2 items-center';
  const row = document.createElement('div');
  row.className = 'flex justify-center gap-3';
  shpGhostOptions.forEach((nid, i) => {
    const c = shpRenderCard(null, { faceDown: true });
    c.style.cursor = 'pointer';
    c.addEventListener('click', () => shpPickNightmare(i));
    row.appendChild(c);
  });
  col.appendChild(row);
  const hint = document.createElement('p');
  hint.className = 'text-stone-400 text-xs';
  hint.textContent = 'Tap one to unleash it — blind. 💤';
  col.appendChild(hint);
  return col;
}

function shpOpenLog() {
  playDone();
  const overlay = document.getElementById('shp-play-log-overlay');
  const list = document.getElementById('shp-play-log-list');
  if (!overlay || !list) return;
  list.innerHTML = '';
  if (shpPlayHistory.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-stone-400 text-sm text-center';
    empty.textContent = 'No cards played yet.';
    list.appendChild(empty);
  } else {
    shpPlayHistory.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'flex items-start gap-3 py-2' + (i < shpPlayHistory.length - 1 ? ' border-b border-stone-100' : '');
      const label = entry.cardIds.map(id => {
        const c = SHP_CARDS[id]; return c ? (c.emoji + '\xA0' + c.label) : '?';
      }).join(' + ');
      row.innerHTML =
        '<span class="text-stone-400 text-xs w-5 text-right flex-shrink-0">' + (i + 1) + '</span>' +
        '<div class="flex flex-col">' +
          '<span class="text-stone-800 text-sm font-medium">' + label + '</span>' +
          '<span class="text-stone-400 text-xs">' + entry.byName + (entry.rolledVal != null ? ' \xB7 rolled ' + entry.rolledVal : '') + '</span>' +
        '</div>';
      list.appendChild(row);
    });
  }
  overlay.style.display = 'flex';
}

// shpWaitFooter removed — non-active players now receive shpHandFooter(me, false) (grayed hand)

function shpHandFooter(me, tappable) {
  const plunge = (shpPhase === 'plunge');
  const col = document.createElement('div');
  col.className = 'flex flex-col gap-2';
  const h = shpHands[me] || [];
  const twoMode = tappable && (shpForcedCards === 2 && h.length >= 2);
  const legal = tappable ? shpLegalCards(me) : [];

  // Sort by family (Pasture → Pillow → Alarm → Trap/Phantom), then by number ascending within a family
  // (+1, +2, +5, +10). NOTE: must use a nullish fallback, not `|| 2` — pasture rank is 0, which is
  // falsy, so `|| 2` was pushing every Pasture card behind Pillows. That was the "pillows leftmost" bug.
  const FAMILY_ORDER = { pasture:0, pillow:1, alarm:2, trap:3, phantom:4 };
  const famRank = c => { const r = c && FAMILY_ORDER[c.family]; return (r === undefined || r === null) ? 2 : r; };
  const numRank = c => (c && typeof c.value === 'number') ? c.value : 99;   // non-numeric cards sort last in-family
  const sortedHand = h.map((cardId, idx) => ({ cardId, idx }))
    .sort((a, b) => {
      const ca = SHP_CARDS[a.cardId], cb = SHP_CARDS[b.cardId];
      return (famRank(ca) - famRank(cb)) || (numRank(ca) - numRank(cb));
    });

  const row = document.createElement('div');
  row.className = 'flex flex-wrap justify-center gap-2';

  sortedHand.forEach(({ cardId, idx }) => {
    const card = shpRenderCard(cardId, { inverted: plunge });
    if (!tappable) {
      card.classList.add('opacity-40');
    } else if (twoMode) {
      card.style.cursor = 'pointer';
      const selected = shpTwoSel.indexOf(idx) >= 0;
      const cd = SHP_CARDS[cardId];
      // Same two blockers as a single-card tap (shpIsPlayable) — Wide Awake's Pillows ban applies
      // per-card regardless of pairing; a bust check only makes sense once one card is already
      // staged, and it's evaluated in the EXACT order the player is building (shpPairFinalBest(a,b),
      // not a). Both are surfaced here AND enforced in shpStageTwoCard — this is the visual half.
      const banned = shpNoPillowNext && cd.family === 'pillow';
      const wouldBust = !selected && shpTwoSel.length === 1 && shpPairFinalBest(me, shpTwoSel[0], idx) > shpCeiling;
      if (selected) card.classList.add('ring-2', plunge ? 'ring-red-400' : 'ring-[#3A3D52]');
      if (banned) card.classList.add('opacity-40', 'shp-card-flagged');   // Wide Awake — greyed AND flagged
      else if (wouldBust) card.classList.add('opacity-40');
      card.addEventListener('click', () => shpTapCard(idx));
    } else {
      card.style.cursor = 'pointer';
      const banned = shpNoPillowNext && SHP_CARDS[cardId].family === 'pillow';
      if (banned) card.classList.add('opacity-40', 'shp-card-flagged');   // Wide Awake — greyed AND flagged
      else if (legal.indexOf(idx) < 0) card.classList.add('opacity-40');
      card.addEventListener('click', () => shpTapCard(idx));
    }
    shpBindCardHold(card, cardId, false);
    row.appendChild(card);
  });

  // Wolf slot placeholder — locked card slot from a consumed Big Bad Wolf
  if (shpWolfActive[me]) {
    const wolfEl = shpRenderCard(null, { wolf: true });
    wolfEl.classList.add('opacity-60');
    shpBindCardHold(wolfEl, null, true);
    row.appendChild(wolfEl);
  }

  col.appendChild(row);

  if (twoMode) {
    const hint = document.createElement('p');
    hint.className = 'text-stone-400 text-xs text-center';
    hint.textContent = "Pick two that keep you at or under " + shpCeiling + " — gambling a Skip a Few can still Deep Sleep you.";
    col.appendChild(hint);
    const btn = document.createElement('button');
    const ready = shpTwoSel.length === 2;
    btn.className = 'min-h-12 w-full rounded-2xl ' + (plunge ? 'bg-red-600 hover:bg-red-700' : 'shp-cta') + ' active:scale-95 text-white font-semibold text-base transition-all duration-150' + (ready ? '' : ' opacity-40 pointer-events-none');
    btn.textContent = 'Play Both';
    btn.addEventListener('click', shpConfirmTwoCard);
    col.appendChild(btn);
  }

  return col;
}

// 500ms long-press → jump to that card's row in the How-to gallery, scrolled + ringed
// (ui-style.md § Tap-Hold Reference — delegates to engine.js's bindCardHold). The
// Wolf-slot placeholder has no card id of its own; it points at real card 12 (The
// Big Bad Wolf), whose gallery row is what explains the locked slot.
function shpBindCardHold(el, cardId, isWolf) {
  bindCardHold(el, () => shpOpenHowTo('cards', isWolf ? 12 : cardId));
}

// Display name for a card — subtract cards show a bare "−N" on the face but read as
// "Counting Backwards −N" wherever there is room to say it.
function shpCardDisplayName(cardId) {
  const c = SHP_CARDS[cardId];
  if (!c) return '?';
  if (c.kind === 'subtract') return 'Counting Backwards ' + shpCardFaceLabel(c, shpPhase === 'plunge');
  return c.label;
}

// Plain-English effect for one card, phase-aware (the Plunge inverts what a number card DOES).
// SINGLE SOURCE: both the long-press inspect modal and the How-to gallery read this, so a card
// can never explain itself two different ways in the same app.
function shpCardEffectText(cardId) {
  const c = SHP_CARDS[cardId];
  if (!c) return '';
  const plunge = (shpPhase === 'plunge');
  let effect;
  switch (c.kind) {
      case 'add':
        if (plunge) {
          effect = 'PLUNGE: reduces the Herd by ' + c.value + (shpDreamAccel ? ' (doubles below 50)' : '') + '. Push towards 0.';
        } else {
          effect = '+' + c.value + ' to the Herd' + (shpDreamAccel ? ' — doubles below 50' : '') + '.';
        }
        break;
      case 'subtract':
        if (plunge) {
          effect = 'PLUNGE: adds ' + c.value + ' to the Herd. Pushes you closer to the ceiling — dangerous!';
        } else {
          effect = '−' + c.value + ' from the Herd (minimum 0).';
        }
        break;
      case 'skip':
        effect = "Skips the next player's turn.";
        break;
      case 'reverse':
        effect = 'Reverses the direction of play.';
        break;
      case 'reset':
        effect = plunge
          ? 'PLUNGE: sets the Herd to ' + c.value + '. Handy if the Herd is stuck high.'
          : 'Sets the Herd to ' + c.value + '.';
        break;
      case 'set':
        effect = plunge
          ? 'PLUNGE: snaps the Herd to the ceiling (' + shpCeiling + ') — just below the bust. Very dangerous.'
          : 'Snaps the Herd to ' + c.value + '.';
        break;
      case 'random-add':
        if (cardId === 13) {
          effect = plunge
            ? "PLUNGE: a cursed Fogged Dream — plays a random −2..−12. You can't see the value until it lands."
            : "A cursed Fogged Dream — plays a random 2–12. You can't see the value until it lands.";
        } else {
          effect = plunge
            ? 'PLUNGE: reduces the Herd by a random 2–12. Always playable — gamble for safety.'
            : 'Adds a random 2–12 to the Herd. Always playable — gamble wisely.';
        }
        break;
      case 'ban-pillow':
        // Redesigned 14 Aug 2026 — the old "send the turn to the leader" effect could target
        // yourself (you ARE the leader) and ties were common early in a Night. This always
        // targets a real player (whoever's next) and can never fizzle.
        effect = "The next player can't play a Pillows card on their turn — they're too Wide Awake for it.";
        break;
      case 'two-card':
        effect = 'Forces the NEXT player to play two cards on their turn. They Deep Sleep if no safe pair exists.';
        break;
      case 'shuffle':
        effect = 'Reshuffles the seating order for the rest of the Night. Everyone keeps their cards and Moons — only who follows whom changes.';
        break;
      case 'swap-hands':
        effect = 'Trades your whole Pen with a random living player. You get their cards, they get yours — then both hands top back up.';
        break;
      case 'trap-shrink':
        effect = 'Hides in the Flock. Draw it and a card slot locks for the rest of the Night — your Pen cap shrinks by one.';
        break;
      default:
        effect = c.label;
  }
  return effect;
}

// Night-end summary (§9) — normal mode only; Sylly never sets shpNightEndInfo (its one long Night
// ends straight into the gameover). Renamed from shpRenderDeepSleep in chunk 9: the screen now
// celebrates the Last One Awake rather than reporting a crash, so the header, the sub-line and the
// finishing-order block are new. The three footer branches (single / host ack-gate / client "Got
// it") are unchanged — that ack machinery is repurposed verbatim, per §4 "Removed".
function shpRenderNightEnd() {
  const body = document.getElementById('shp-table-body');
  const footer = document.getElementById('shp-table-footer');
  if (!body || !footer) return;
  const info = shpNightEndInfo || {};
  const order = info.order || [];

  // Own the status bar rather than inheriting whatever the table left there — this screen can be
  // reached from a Plunge-red header, and "THE PLUNGE 🔻" above a Night-won summary reads as a
  // half-repainted screen.
  const status = document.getElementById('shp-table-status');
  if (status) {
    status.textContent = 'Night ' + shpNightNum + ' \xB7 Complete';
    status.className = 'text-xs font-semibold uppercase tracking-widest shp-label';
  }

  // One-shot chime — only fires the first time this Night-end renders (a Night was WON here, so
  // this is playSuccess, not the old crash-report playBoing).
  if (!info._sfxPlayed) { info._sfxPlayed = true; playSuccess(); }

  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col items-center gap-4 text-center w-full';
  const moonsNow = shpMoonsHeld[info.winner] || 0;
  wrap.innerHTML =
    '<div class="text-5xl">\u{1F319}</div>' +
    '<div class="flex flex-col gap-1">' +
      '<h2 class="text-xl font-bold text-stone-800">' + shpName(info.winner) + ' is the Last One Awake</h2>' +
      '<p class="text-stone-500 text-sm">+1 Moon. ' +
        (info.over ? 'That takes the match.' : 'First to ' + shpMoonsToWin + ' wins the match.') +
      '</p>' +
    '</div>';

  // Moon standings — most Moons first. Normal mode never eliminates, so every row is a live player.
  const sorted = Array.from({ length: shpPlayerCount }, (_, i) => i)
    .sort((a, b) => (shpMoonsHeld[b] || 0) - (shpMoonsHeld[a] || 0));
  const moonList = document.createElement('div');
  moonList.className = 'flex flex-col gap-1.5 w-full';
  sorted.forEach(i => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-3 py-1.5 rounded-xl text-sm ' +
      (i === info.winner ? 'shp-tint-bg border'
                         : 'bg-white border border-stone-200 text-stone-700');
    const rawMoons = shpMoonsHeld[i] || 0;
    const moonStr = rawMoons === 0 ? '—'
      : rawMoons <= 5 ? '\u{1F319}'.repeat(rawMoons)
      : '\u{1F319}\xD7' + rawMoons;
    row.innerHTML =
      '<span class="font-semibold">' + shpName(i) + '</span>' +
      '<span>' + moonStr + ' <span class="opacity-60 text-xs">' + rawMoons + '/' + shpMoonsToWin + '</span></span>';
    moonList.appendChild(row);
  });
  wrap.appendChild(moonList);

  // Finishing order for the Night just played — winner first, first-to-doze last (§9).
  if (order.length > 1) {
    const orderBox = document.createElement('div');
    orderBox.className = 'flex flex-col gap-1 w-full';
    const heading = document.createElement('p');
    heading.className = 'shp-label text-xs font-semibold uppercase tracking-widest text-left';
    heading.textContent = 'Finishing Order';
    orderBox.appendChild(heading);
    order.forEach((pIdx, rank) => {
      const note = rank === 0 ? ' — Last One Awake'
        : rank === order.length - 1 ? ' — first to doze'
        : '';
      const line = document.createElement('p');
      line.className = 'text-stone-500 text-sm text-left';
      line.textContent = (rank + 1) + '. ' + shpName(pIdx) + note;
      orderBox.appendChild(line);
    });
    wrap.appendChild(orderBox);
  }
  body.appendChild(wrap);

  footer.innerHTML = '';
  const mpMode = window.syllyMultiplayerMode;

  if (mpMode === 'single') {
    // Single-device: direct continue (unchanged)
    const btn = document.createElement('button');
    btn.className = 'min-h-14 w-full rounded-2xl shp-cta active:scale-95 text-white font-semibold text-lg transition-all duration-150';
    btn.textContent = info.over ? 'See Daybreak' : 'Deal the next Night';
    btn.addEventListener('click', () => { playLaunch(); shpHostContinue(); });
    footer.appendChild(btn);

  } else if (mpMode === 'host') {
    // Host: ack counter + Continue (locked until all players confirm)
    const allAcked = shpDeepSleepAcks >= shpDeepSleepAckNeeded;
    const countEl = document.createElement('p');
    countEl.className = 'text-stone-400 text-xs text-center mb-2';
    countEl.textContent = shpDeepSleepAcks + ' / ' + shpDeepSleepAckNeeded + ' confirmed';
    footer.appendChild(countEl);
    const btn = document.createElement('button');
    btn.className = 'min-h-14 w-full rounded-2xl font-semibold text-lg transition-all duration-150 ' +
      (allAcked ? 'shp-cta active:scale-95 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed');
    btn.textContent = info.over ? 'See Daybreak' : 'Deal the next Night';
    btn.disabled = !allAcked;
    if (allAcked) btn.addEventListener('click', () => { playLaunch(); shpHostContinue(); });
    footer.appendChild(btn);

  } else {
    // Client: Got it button until this device acks, then waiting message
    if (shpIAcked) {
      const p = document.createElement('p');
      p.className = 'text-center text-stone-400 text-sm py-4';
      p.textContent = '⏳ Waiting for others…';
      footer.appendChild(p);
    } else {
      const btn = document.createElement('button');
      btn.className = 'min-h-14 w-full rounded-2xl shp-cta active:scale-95 text-white font-semibold text-lg transition-all duration-150';
      btn.textContent = 'Got it';
      btn.addEventListener('click', () => {
        playDone();
        shpIAcked = true;
        mpLockSync();
        mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_SLEEP_ACK' } });
        shpRenderNightEnd();
      });
      footer.appendChild(btn);
    }
  }
}

function shpRenderGameover() {
  showScreen('screen-shp-gameover');
  const box = document.getElementById('shp-gameover-standings');
  if (!box) return;
  box.innerHTML = '';
  const ordinal = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  (shpGameStandings || []).forEach((pIdx, rank) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-4 py-2 rounded-xl ' +
      (rank === 0 ? 'shp-cta text-white' : 'bg-white border border-stone-200 text-stone-600');
    const medal = rank === 0 ? '\u{1F451}' : (rank + 1) + '.';
    // Normal mode is a Moon race, so the Moon count IS the standing — an ordinal alone hides how
    // close it was. Sylly keeps the survival wording: there are no Moons left to count there.
    const moonsWon = shpMoonsHeld[pIdx] || 0;
    const sub = shpSyllyMode
      ? (rank === 0 ? 'Last one awake' : ordinal(rank + 1) + ' place')
      : (moonsWon === 1 ? '1 Moon' : moonsWon + ' Moons');
    row.innerHTML =
      '<span class="font-semibold">' + medal + ' ' + shpName(pIdx) + '</span>' +
      '<span class="text-xs opacity-80">' + sub + '</span>';
    box.appendChild(row);
  });
  playSuccess();
}

// ── Ghost / Nightmare Meter (§6) — Sleepwalkers + the facedown Lottery — Sylly Mode only ──
function shpNightmareName(id) { const nm = SHP_NIGHTMARES.find(x => x.id === id); return nm ? nm.label : 'Nightmare'; }

// +1 per Pasture card resolved, only once a Sleepwalker exists. (No trigger here — checked after the play.)
function shpChargeMeter() {
  if (!shpSyllyMode || shpElimOrder.length === 0) return;
  shpMeter++;
}
function shpMeterReady() {
  return shpSyllyMode && shpElimOrder.length > 0 && shpMeter >= shpMeterFill && !shpGhostPending;
}

// Host: the meter filled — hand the spend-right to the next Sleepwalker and offer 3 face-down cards.
function shpHostOpenLottery() {
  shpGhostPending = true;
  shpSpendHolder  = shpElimOrder[shpGhostTurnIdx % shpElimOrder.length];
  shpGhostOptions = shpDrawNightmares();
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_GHOST_READY', holderIdx: shpSpendHolder, optionIds: shpGhostOptions,
    }});
  }
  shpShowTable();
}

// Spend-holder taps one of the 3 face-down cards (blind).
function shpPickNightmare(choiceIdx) {
  const me = shpMyIdx();
  if (!shpGhostPending || shpSpendHolder !== me) return;
  playWhoosh();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_DISRUPT', choice: choiceIdx } });
  } else {
    shpHostResolveDisrupt(choiceIdx);
  }
}

// Host: resolve the chosen nightmare at the turn-gate (before the upcoming player acts).
function shpHostResolveDisrupt(choiceIdx) {
  if (!shpGhostPending) return;
  const nightmareId = shpGhostOptions[choiceIdx];
  shpGhostPending = false;
  shpMeter = 0;
  shpGhostTurnIdx++;
  shpEcho = 0;                                   // a prior Global Echo ends when any disruption fires
  const res = shpApplyNightmare(nightmareId);    // mutates state; returns { targetIdx, text }
  shpCheckMercy();                               // a Cold-Feet subtract may drive the Herd to 0 in the Plunge
  shpLastDisrupt = { text: res.text };
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DISRUPT_RESOLVED', nightmareId, targetIdx: res.targetIdx, text: res.text,
      herd: shpHerd, direction: shpDirection, nextActive: shpActivePlayer, forcedCards: shpForcedCards,
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive, echo: shpEcho, meter: shpMeter,
      phase: shpPhase, ceiling: shpCeiling, seatOrder: shpSeatOrder,
    }});
  }
  shpShowTable();
  shpAfterAdvance();                             // upcoming player may now be stuck → Deep Sleep
}

// Apply a nightmare's effect. Target framing: the "upcoming" player is shpActivePlayer.
function shpApplyNightmare(id) {
  const kind = SHP_NIGHTMARES.find(x => x.id === id).kind;
  if (kind === 'nudge') {                        // Cold Feet — random ±1..4 to the Herd
    const amt = shpRandInt(1, 4) * (shpPhase === 'plunge' ? -1 : 1);
    shpHerd = Math.max(0, shpHerd + amt);
    return { targetIdx: -1, text: 'Cold Feet — the herd ' + (amt >= 0 ? 'swells +' : 'shrinks ') + amt + '.' };
  }
  if (kind === 'shift') {                        // Restless Leg — reverse OR skip the upcoming player
    if (Math.random() < 0.5) { shpDirection *= -1; return { targetIdx: -1, text: 'Restless Leg — the order reverses ↺.' }; }
    const skipped = shpActivePlayer;
    shpActivePlayer = shpNextPlayer(shpActivePlayer);
    return { targetIdx: skipped, text: 'Restless Leg — ' + shpName(skipped) + ' is skipped.' };
  }
  if (kind === 'fog') {                          // Fog — swap a random living player's Pasture for a Fogged Dream
    const living = [];
    for (let i = 0; i < shpPlayerCount; i++) if (!shpEliminated[i]) living.push(i);
    const t = living[Math.floor(Math.random() * living.length)];
    const pastureIdxs = [];
    (shpHands[t] || []).forEach((cid, i) => { if (SHP_CARDS[cid].family === 'pasture') pastureIdxs.push(i); });
    if (pastureIdxs.length) {
      const swap = pastureIdxs[Math.floor(Math.random() * pastureIdxs.length)];
      shpDiscard.push(shpHands[t][swap]);
      shpHands[t][swap] = 13;                     // Fogged Dream (cursed, hidden value)
      return { targetIdx: t, text: 'Fog — a card in ' + shpName(t) + "'s hand curdles into a Fogged Dream." };
    }
    return { targetIdx: t, text: 'Fog rolls in around ' + shpName(t) + '… but finds no pasture to spoil.' };
  }
  if (kind === 'heavy') {                        // Sleep Paralysis — upcoming player forced to play two
    shpForcedCards = 2;
    return { targetIdx: shpActivePlayer, text: 'Sleep Paralysis — ' + shpName(shpActivePlayer) + ' must play TWO cards.' };
  }
  if (kind === 'echo') {                         // Global Echo — every Pasture +2 until the next disruption
    shpEcho = 2;
    return { targetIdx: -1, text: 'Global Echo — every Pasture card now carries +2 extra.' };
  }
  return { targetIdx: -1, text: 'The dream shifts.' };
}

// ── Night Terrors / Plunge (§12) ───────────────────────────────────────────
function shpEnterPlunge() {
  shpPhase = 'plunge';
  shpCeiling = shpHerd;               // overflow runway — anchor to the exact total the card landed on
  shpPlungeGrace = shpPlayerCount;    // one full cycle held before the ceiling starts falling
  shpPlungeDescentTurns = 0;          // descent escalation counter resets each Plunge
  shpCurrentDrop = 0;
  shpPlungeFlash = true;
}
function shpExitPlunge() {
  shpPhase = 'climb';
  shpCeiling = 99;
  shpPlungeGrace = 0;
  shpPlungeDescentTurns = 0;
  shpCurrentDrop = 0;
}
// Ceiling descent at each Plunge turn entry (held during the grace cycle).
// Round-based escalation: the drop is locked for a full round of turns, then increases — so every
// living player faces the same hazard level before it tightens. Round 0 = −2, round 1 = −4, etc.
function shpPlungeTick() {
  if (shpPhase !== 'plunge') return;
  if (shpPlungeGrace > 0) { shpPlungeGrace--; shpCurrentDrop = 0; return; }
  const round = Math.floor(shpPlungeDescentTurns / Math.max(1, shpPlayerCount));
  shpCurrentDrop = SHP_DROP_BASE + round * SHP_DROP_STEP;
  shpCeiling = Math.max(0, shpCeiling - shpCurrentDrop);
  shpPlungeDescentTurns++;
}
// Mercy backstop — driving the Herd to 0 in the Plunge exits to Climb with NO Moon lost.
function shpCheckMercy() {
  if (shpSyllyMode && shpPhase === 'plunge' && shpHerd <= 0) { shpExitPlunge(); return true; }
  return false;
}
// After a card resolves: Plunge entry (overflow runway), bust, or mercy backstop.
// Returns { busted, landedOn }. Does NOT call shpHostCrash itself (unlike the pre-chunk-7 version) —
// §8 requires SHP_TURN_RESULT to broadcast BEFORE shpHostCrash's SHP_DOZE, so the caller
// (shpHostPlayCard/shpHostPlayTwoCard) calls shpBroadcastTurn(...,busted) first and only then
// shpHostCrash, using the landedOn this function hands back.
// herdBefore: the Herd value BEFORE shpResolveCard ran — a bust reverts to this exactly (§6),
// unconditional, no mode branch. Scope of the revert is the Herd only: the played card(s) stay in
// the discard, and any non-Herd side effect of the busting play (a direction flip, a reseat, a
// hand swap, the Nightmare Meter charge) stands.
function shpPostResolve(playerIdx, herdBefore) {
  if (shpSyllyMode && shpPhase === 'climb' && shpHerd >= 99) { shpEnterPlunge(); return { busted: false }; }
  if (shpHerd > shpCeiling) {                       // climb overshoot OR Plunge squeeze
    const landedOn = shpHerd;                       // the number that broke it — banner copy uses this
    shpHerd = herdBefore;
    return { busted: true, landedOn };
  }
  shpCheckMercy();
  return { busted: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// Overlays
// ═══════════════════════════════════════════════════════════════════════════
function shpSyncToggle(id, on) {
  const t = document.getElementById(id);
  if (!t) return;
  t.textContent = on ? 'ON' : 'OFF';
  t.className = (on ? 'game-toggle-on-shp' : 'game-toggle-off') + ' shrink-0';
}

// Moons to Win value-line copy (§5) — thematic name + the concrete meaning, per
// ui-style.md § Dynamic value line: the static description says what the setting
// CONTROLS, this live line says what you just PICKED.
const SHP_MOONS_WIN_COPY = {
  1: 'Catnap — first to 1 Moon — one Night, winner takes all.',
  2: 'Full Night — first to 2 Moons, usually 3 Nights.',
  3: 'Hibernate — first to 3 Moons, usually 5 Nights.',
};
const SHP_MOONS_LIFE_WORD = { 3: 'three', 5: 'five', 7: 'seven' };

function shpSyncSettingsUI() {
  const setGroup = (attr, val) => document.querySelectorAll('[' + attr + ']').forEach(b =>
    b.classList.toggle('pill-active-shp', b.getAttribute(attr) === String(val)));
  setGroup('data-shp-hand', shpHandSize);
  setGroup('data-shp-moons', shpMoons);
  setGroup('data-shp-moons-win', shpMoonsToWin);
  shpSyncToggle('btn-shp-dream-toggle', shpDreamAccel);
  shpSyncToggle('btn-shp-sylly-toggle', shpSyllyMode);

  // Moons card — two pill groups, exactly one visible at a time, switched by shpSyllyMode; one
  // shared value line underneath (§5). Avoids a single number meaning "wins" or "lives" depending
  // on another setting — the trap that made the shpLives rename necessary.
  const title   = document.getElementById('shp-moons-title');
  const desc    = document.getElementById('shp-moons-desc');
  const winRow  = document.getElementById('shp-moons-win-row');
  const lifeRow = document.getElementById('shp-moons-life-row');
  const val     = document.getElementById('shp-val-moons');
  if (winRow)  winRow.style.display  = shpSyllyMode ? 'none' : 'flex';
  if (lifeRow) lifeRow.style.display = shpSyllyMode ? 'flex' : 'none';
  if (shpSyllyMode) {
    if (title) title.textContent = 'Starting Moons';
    if (desc)  desc.textContent  = 'Lives. One long Night; lose a Moon each time you crash. At zero you become a Sleepwalker.';
    if (val)   val.textContent   = shpMoons + ' Moons — ' + (SHP_MOONS_LIFE_WORD[shpMoons] || shpMoons) +
                                    ' crashes and you\'re haunting the dream.';
  } else {
    if (title) title.textContent = 'Moons to Win';
    if (desc)  desc.textContent  = 'Win a Night to earn a Moon. This is how many you need to take the match.';
    if (val)   val.textContent   = SHP_MOONS_WIN_COPY[shpMoonsToWin] || SHP_MOONS_WIN_COPY[2];
  }
}

function shpBindPills(attr, apply) {
  document.querySelectorAll('[' + attr + ']').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    playPillClick();
    document.querySelectorAll('[' + attr + ']').forEach(x => x.classList.remove('pill-active-shp'));
    b.classList.add('pill-active-shp');
    apply(b.getAttribute(attr));
    shpSyncSettingsUI();
  }));
}

function shpOpenSettings() {
  shpSyncSettingsUI();
  const inner = document.querySelector('#shp-settings-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('shp-settings-overlay').style.display = 'flex';
}
// highlightId: when set, opens straight to The Cards tab, scrolled to and briefly
// ringing that card's row — the tap-hold-to-reference pattern (ui-style.md § Tap-Hold
// Reference, PKO precedent). Card id 12 covers the Wolf slot too (see shpBindCardHold).
function shpOpenHowTo(tab, highlightId) {
  shpSetHowToTab(highlightId != null ? 'cards' : (tab || 'rules'), highlightId);
  const inner = document.querySelector('#shp-how-to-overlay .overlay-data-inner');
  if (inner && highlightId == null) inner.scrollTop = 0;
  document.getElementById('shp-how-to-overlay').style.display = 'flex';
}

// Rules and card gallery are two tabs of ONE overlay; bodies are siblings toggled by
// display so each keeps its own scroll position across a flick.
function shpSetHowToTab(tab, highlightId) {
  const rules = document.getElementById('shp-how-to-body');
  const cards = document.getElementById('shp-how-to-cards');
  if (rules) rules.style.display = tab === 'cards' ? 'none' : 'flex';
  if (cards) cards.style.display = tab === 'cards' ? 'flex' : 'none';
  document.querySelectorAll('[data-shp-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-shp');    // .pill is the base — never removed
    if (b.dataset.shpHowtoTab === tab) b.classList.add('pill-active-shp');
  });
  if (tab === 'cards') shpRenderGallery(highlightId);
}

// Built from SHP_CARDS on every switch INTO the tab (never cached at boot — the
// Plunge inverts what a number card DOES, so a gallery built once would be wrong
// half the night), and every tile goes through shpRenderCard so it stays skinnable.
// highlightId: scroll to + briefly ring that card's row (tap-hold entry point).
function shpRenderGallery(highlightId) {
  const box = document.getElementById('shp-cards-body');
  if (!box) return;
  box.innerHTML = '';

  const section = (label, blurb) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-2';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest shp-label';
    h.textContent = label;
    const b = document.createElement('p');
    b.className = 'text-stone-500 text-sm';
    b.textContent = blurb;
    const list = document.createElement('div');
    list.className = 'flex flex-col gap-2 pt-1';
    wrap.append(h, b, list);
    box.appendChild(wrap);
    return list;
  };

  // One reference ROW per card — thumb, name, what it actually does, how many are in the deck.
  // Rows rather than a tile grid (10 Aug 2026's shape) because the tab's real job is answering
  // "what does this card do again?" mid-match, and a 4rem tile with a two-word caption cannot.
  // refId: the value shpBindCardHold's highlightId will match against (null for the two
  // non-card reference rows — Face Down has nothing to jump to).
  const row = (list, cardEl, url, name, effect, count, refId) => {
    const r = document.createElement('div');
    r.className = 'flex items-start gap-3 bg-white rounded-2xl p-3 shadow-sm shp-ref-row';
    if (refId != null) r.dataset.shpCardId = refId;
    const thumb = document.createElement('div');
    thumb.className = 'flex-shrink-0';
    thumb.appendChild(artMakeZoomable(cardEl, url, name));
    const txt = document.createElement('div');
    txt.className = 'flex flex-col gap-0.5 min-w-0';
    const head = document.createElement('div');
    head.className = 'flex items-baseline gap-2 flex-wrap';
    head.innerHTML =
      '<span class="font-bold text-stone-800 text-sm">' + name + '</span>' +
      (count ? '<span class="text-[0.65rem] text-stone-400 font-semibold">×' + count + ' in deck</span>' : '');
    const eff = document.createElement('p');
    eff.className = 'text-stone-500 text-xs leading-snug';
    eff.textContent = effect;
    txt.append(head, eff);
    r.append(thumb, txt);
    list.appendChild(r);
  };
  const add = (list, card) => {
    const url = (typeof assetFace === 'function') && assetFace('shp', card.id);
    row(list, shpRenderCard(card.id), url,
        shpCardDisplayName(card.id), shpCardEffectText(card.id), SHP_DECK_COUNTS[card.id], card.id);
  };

  const byFamily = f => SHP_CARDS.filter(c => c.family === f && c.id !== 13);
  const pasture = section('Pasture', 'Sheep go in. Every one of these pushes the Herd up.');
  byFamily('pasture').forEach(c => add(pasture, c));

  const pillow = section('Pillows', 'Relief cards — they take sheep back out, skip you, or turn the count around.');
  byFamily('pillow').forEach(c => add(pillow, c));

  const alarm = section('Alarms', 'Loud, unpredictable, and usually somebody else’s problem until it isn’t.');
  byFamily('alarm').forEach(c => add(alarm, c));

  const trap = section('Traps', 'One card, and it is coming for the ceiling itself.');
  byFamily('trap').forEach(c => add(trap, c));

  const fog = section('Fogged Dreams',
    'Conjured by the Fog nightmare, never dealt from the Flock.');
  row(fog, shpRenderCard(13), (typeof assetFace === 'function') && assetFace('shp', 13),
      'Fogged Dream', shpCardEffectText(13), 0, 13);

  const back = section('Face Down', 'Somebody else’s hand.');
  row(back, shpRenderCard(null, { faceDown: true }),
      (typeof assetBack === 'function') && assetBack('shp'),
      'The Back', 'What every other player’s Pen looks like from where you are sitting.', 0, null);

  // Tap-hold entry point (ui-style.md § Tap-Hold Reference) — scroll to and briefly ring
  // the target row so the player lands exactly where their question was.
  if (highlightId != null) refHighlightRow(box, 'data-shp-card-id', highlightId, 'shp-ref-row-ping');
}
function shpShowTip(emoji, heading, lines) {
  document.getElementById('shp-tip-emoji').textContent = emoji || '';
  document.getElementById('shp-tip-heading').textContent = heading || '';
  const body = document.getElementById('shp-tip-body');
  body.innerHTML = '';
  (lines || []).forEach(l => { const p = document.createElement('p'); p.textContent = l; body.appendChild(p); });
  document.getElementById('shp-tip-overlay').style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════════════
// Multiplayer (§11)
// ═══════════════════════════════════════════════════════════════════════════
function shpHandleEnvelope(env) {
  try {
    const a = env.payload.action, p = env.payload;
    if (env.type === 'SYNC') {
      if (a === 'SHP_DEAL') {
        shpPlayerCount = p.playerCount; shpPlayerNames = p.playerNames || shpPlayerNames;
        shpHands     = shpNorm2D(p.hands, shpPlayerCount);
        shpHandCap   = p.handCaps  || shpHandCap;
        shpWolfActive= p.wolfActive|| shpWolfActive;
        shpHerd = p.herd; shpDirection = p.direction; shpActivePlayer = p.activePlayer;
        shpMoonsHeld = p.moons; shpEliminated = p.eliminated; shpElimOrder = p.elimOrder || [];
        // scoring-rework §8 — must reset dozed/dozeOrder/nightEndInfo/dozeNotice here exactly as
        // shpDealNight does on the host, or a client carries the PREVIOUS Night's finishing state
        // forward (the accumulator bug, logic-engine.md § Accumulator arrays).
        shpDozed = shpNormBool(p.dozed, shpPlayerCount);
        shpDozeOrder = Array.isArray(p.dozeOrder) ? p.dozeOrder.slice() : [];
        if (p.moonsToWin !== undefined) shpMoonsToWin = p.moonsToWin;
        shpNightEndInfo = null; shpDozeNotice = null;
        shpMeter = p.meter || 0; shpEcho = p.echo || 0; shpForcedCards = 1; shpNoPillowNext = false; shpTwoSel = [];
        shpGhostPending = false; shpGhostOptions = []; shpLastDisrupt = null;
        shpPhase = 'climb'; shpCeiling = 99; shpPlungeFlash = false; shpCurrentDrop = 0;
        if (shpAnimTimer) { clearTimeout(shpAnimTimer); shpAnimTimer = null; }
        shpClearFlipTimers();
        shpPlayHistory = []; shpAnimSheep = 0; shpLastEffect = null; shpSwapAnim = null;
        shpNightNum  = p.nightNum || shpNightNum;      // was never sent — clients stuck on Night 0 (BUG-04)
        shpSeatOrder = Array.isArray(p.seatOrder) ? p.seatOrder.slice() : [];
        shpNightFlavourIdx = p.flavourIdx || 0;        // host-picked — same line on every device
        shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false; shpStuckIdx = -1;
        shpShowNightIntro(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_TURN_RESULT') {
        if (p.phase) { if (shpPhase === 'climb' && p.phase === 'plunge') shpPlungeFlash = true; shpPhase = p.phase; }
        if (p.ceiling !== undefined) shpCeiling = p.ceiling;
        if (p.grace !== undefined) shpPlungeGrace = p.grace;
        if (p.drop !== undefined) shpCurrentDrop = p.drop;
        shpHerd = p.herd; shpDirection = p.direction; shpActivePlayer = p.nextActive;
        shpForcedCards = p.forcedCards || 1;
        shpNoPillowNext = !!p.noPillowNext;
        shpHands     = shpNorm2D(p.hands, shpPlayerCount);
        shpHandCap   = p.handCaps  || shpHandCap;
        shpWolfActive= p.wolfActive|| shpWolfActive;
        shpMeter = p.meter || 0; shpTwoSel = []; shpNightEndInfo = null; shpStuckIdx = -1;
        shpGhostPending = false; shpLastDisrupt = null;
        // shpBroadcastTurn clears this LOCALLY on the host (it's the function that nulls it before
        // every new play) but the field never rode the payload, so a client kept the previous
        // crasher's banner ("Shirley gambled to 101 — dozed off…") on screen for every turn after,
        // until the next redeal. A normal turn result always supersedes the last doze notice.
        shpDozeNotice = null;
        if (p.playHistory) shpPlayHistory = p.playHistory;
        if (Array.isArray(p.seatOrder)) shpSeatOrder = p.seatOrder.slice();
        shpLastEffect = p.lastEffect || null;     // Firebase erases null — the || is the rebuild half
        shpSwapAnim   = p.swapAnim   || null;     // same erasure/rebuild — only meaningful on a Swap Dreams turn
        // busted:true — the Herd here already rode the §6 revert, so the card-value-based parade
        // would show growth that never happened on the live counter. Skip it (§8).
        if (!p.busted) shpStartSheepAnim(p.played, p.rolled);
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_STUCK') {
        // Host says the active player has no legal line. Everyone HOLDS on the table; only that
        // player gets a button. NOT `|| -1` — seat 0 is a legitimate stuck player and 0 is falsy.
        shpStuckIdx = (p.stuckIdx === undefined || p.stuckIdx === null) ? -1 : p.stuckIdx;
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_GHOST_READY') {
        shpGhostPending = true; shpSpendHolder = p.holderIdx; shpGhostOptions = p.optionIds || [];
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_DISRUPT_RESOLVED') {
        shpGhostPending = false; shpMeter = p.meter || 0; shpEcho = p.echo || 0;
        if (p.phase) { if (shpPhase === 'climb' && p.phase === 'plunge') shpPlungeFlash = true; shpPhase = p.phase; }
        if (p.ceiling !== undefined) shpCeiling = p.ceiling;
        shpHerd = p.herd; shpDirection = p.direction; shpActivePlayer = p.nextActive; shpForcedCards = p.forcedCards || 1;
        shpHands = shpNorm2D(p.hands, shpPlayerCount); shpHandCap = p.handCaps || shpHandCap; shpWolfActive = p.wolfActive || shpWolfActive;
        if (Array.isArray(p.seatOrder)) shpSeatOrder = p.seatOrder.slice();
        shpStuckIdx = -1;                    // turn-advancing packet — any prior hold is resolved
        shpLastDisrupt = { text: p.text };
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_DOZE') {
        // §8 applier requirements — apply every field, both modes carry the crasher's mutated hand
        // (normal mode discards it §3.1c, Sylly replaces it via the Jolt §3.1b): send the whole
        // collection, never a delta, so a dropped packet self-corrects on the next mutation.
        shpHerd = p.herd;
        shpDozed = shpNormBool(p.dozed, shpPlayerCount);
        shpDozeOrder = Array.isArray(p.dozeOrder) ? p.dozeOrder.slice() : [];
        shpMoonsHeld = p.moons || shpMoonsHeld;
        shpEliminated = p.eliminated || shpEliminated;
        shpElimOrder = p.elimOrder || [];
        shpHands = shpNorm2D(p.hands, shpPlayerCount);
        shpHandCap = p.handCaps || shpHandCap;
        shpWolfActive = p.wolfActive || shpWolfActive;
        shpActivePlayer = p.nextActive;
        if (p.phase) shpPhase = p.phase;
        if (p.ceiling !== undefined) shpCeiling = p.ceiling;
        if (p.grace !== undefined) shpPlungeGrace = p.grace;
        if (p.drop !== undefined) shpCurrentDrop = p.drop;
        // A turn-advancing packet resolves any prior hold, and is the ONLY thing that clears the
        // busted device's own "your turn" input affordance — there is no ack for this one.
        shpStuckIdx = -1;
        shpDozeNotice = { idx: p.crasher, reason: p.reason, landedOn: p.landedOn };
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_NIGHT_END') {
        shpMoonsHeld = p.moons || shpMoonsHeld;
        shpNightEndInfo = { winner: p.winner, order: p.order || [], over: p.over };
        shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = p.acksNeeded || shpPlayerCount; shpIAcked = false;
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_GAMEOVER') {
        shpGameStandings = p.standings; shpGameWinner = p.winner;
        shpRenderGameover(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_MATCH_DISSOLVED') {
        resetToLobby();                            // a player left — PASS contract dissolves for everyone
      }
    } else if (env.type === 'ACTION') {
      if (window.syllyMultiplayerMode !== 'host') return;   // only the host resolves ACTIONs
      if (a === 'SHP_PLAY') {
        if (p.idxA !== undefined && p.idxB !== undefined) shpHostPlayTwoCard(shpActivePlayer, p.idxA, p.idxB);
        else shpHostPlayCard(shpActivePlayer, p.handIdx);
      } else if (a === 'SHP_DISRUPT') {
        shpHostResolveDisrupt(p.choice);
      } else if (a === 'SHP_STUCK_ACK') {
        // Only the held player can end the hold, and only while it's actually held — a stale or
        // duplicated packet must not run the crash resolution twice.
        if (shpStuckIdx >= 0) shpHostCrash(shpStuckIdx, 'stuck', null);
      } else if (a === 'SHP_SLEEP_ACK') {
        shpDeepSleepAcks++;
        shpRenderNightEnd();            // re-render to update count + unlock Continue when all confirmed
      } else if (a === 'SHP_PLAYER_LEFT') {
        mpSendEnvelope({ type: 'SYNC', payload: { action: 'SHP_MATCH_DISSOLVED' } });
        resetToLobby();                            // one leaver dissolves the match (PASS contract)
      }
    }
  } catch (e) { console.error('shpHandleEnvelope', e); }
}

// ═══════════════════════════════════════════════════════════════════════════
// State teardown (called by engine.js resetToLobby) — implemented (foundational)
// ═══════════════════════════════════════════════════════════════════════════
function shpResetState() {
  if (shpAnimTimer) { clearTimeout(shpAnimTimer); shpAnimTimer = null; }
  if (shpNightIntroTimer) { clearTimeout(shpNightIntroTimer); shpNightIntroTimer = null; }
  shpClearFlipTimers();
  shpPlayerCount = 0;  shpPlayerNames = [];
  shpHerd = 0;         shpCeiling = 99;       shpDirection = 1;
  shpMoonsHeld = [];   shpEliminated = [];    shpElimOrder = [];
  shpDozed = [];       shpDozeOrder = [];
  shpActivePlayer = 0; shpOpenerIdx = 0;      shpSeatOrder = [];
  shpLastEffect = null; shpSwapAnim = null;
  shpFlock = [];       shpDiscard = [];       shpHands = [];
  shpHandCap = [];     shpWolfActive = [];
  shpForcedCards = 1;  shpNoPillowNext = false; shpPendingSkip = null;
  shpMeter = 0;        shpGhostTurnIdx = 0;   shpSpendHolder = -1;
  shpGhostOptions = [];shpPendingDisrupt = null; shpEcho = 0;
  shpGhostPending = false; shpLastDisrupt = null;
  shpPhase = 'climb';  shpPlungeGrace = 0;   shpPlungeFlash = false;
  shpPlungeDescentTurns = 0; shpCurrentDrop = 0;
  shpTwoSel = [];      shpStuckIdx = -1;
  shpNightEndInfo = null; shpDozeNotice = null;
  shpGameStandings = []; shpGameWinner = -1;
  shpNightNum = 0;
  shpCardTapReady = true;
  if (shpTapReadyTimer) { clearTimeout(shpTapReadyTimer); shpTapReadyTimer = null; }
  shpTapReadyForPlayer = -1;
  shpPlayHistory = []; shpAnimSheep = 0;
  shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false;
  const logOverlay = document.getElementById('shp-play-log-overlay');
  if (logOverlay) logOverlay.style.display = 'none';
  // Settings (shpHandSize/Moons/MoonsToWin/DreamAccel/SyllyMode) intentionally preserved.
}

// ═══════════════════════════════════════════════════════════════════════════
// Event wiring (DOMContentLoaded — shp.js loads BEFORE its screen markup)
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Lobby entry → game menu
  on('btn-shp', () => { playLaunch(); activeGameId = 'shp'; showScreen('screen-shp-menu'); });

  // Game menu — Play CTA has dual context (pre-lobby vs post-lobby)
  on('btn-shp-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') shpStartSession(); // post-lobby (host)
    else mpShowModeScreen('shp');                                    // pre-lobby
  });
  on('btn-shp-menu-how-to',   () => shpOpenHowTo());
  on('btn-shp-menu-settings', () => shpOpenSettings());
  on('btn-shp-menu-back',     () => { playExit(); resetToLobby(); });

  // Overlay closers
  on('btn-shp-settings-done', () => { playDone(); document.getElementById('shp-settings-overlay').style.display = 'none'; });
  on('btn-shp-howto-close',   () => { playDone(); document.getElementById('shp-how-to-overlay').style.display = 'none'; });
  on('btn-shp-howto-close-cards', () => { playDone(); document.getElementById('shp-how-to-overlay').style.display = 'none'; });
  document.querySelectorAll('[data-shp-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); shpSetHowToTab(b.dataset.shpHowtoTab); });
  });
  on('btn-shp-tip-close',      () => { playDone(); document.getElementById('shp-tip-overlay').style.display = 'none'; });
  on('btn-shp-play-log-close', () => { playDone(); document.getElementById('shp-play-log-overlay').style.display = 'none'; });

  // Settings controls — pills + toggles
  shpBindPills('data-shp-hand',      v => shpHandSize   = parseInt(v, 10));
  shpBindPills('data-shp-moons',     v => shpMoons      = parseInt(v, 10));
  shpBindPills('data-shp-moons-win', v => shpMoonsToWin = parseInt(v, 10));
  on('btn-shp-dream-toggle',     () => { shpDreamAccel   = !shpDreamAccel;   playPillClick(); shpSyncToggle('btn-shp-dream-toggle', shpDreamAccel); });
  // The toggle changes which Moons pill group is live, so shpSyncSettingsUI() must run here too —
  // shpSyncToggle alone only paints the toggle button itself (§5).
  on('btn-shp-sylly-toggle',     () => { shpSyllyMode    = !shpSyllyMode;    shpSyllyMode ? playSyllyOn() : playSyllyOff(); shpSyncToggle('btn-shp-sylly-toggle', shpSyllyMode); shpSyncSettingsUI(); });

  // In-game header [?] → How to Play
  on('btn-shp-how-to', () => shpOpenHowTo());

  // Quit (mid-game ✕ → quit overlay → game menu)
  document.querySelectorAll('.btn-shp-quit-open').forEach(b =>
    b.addEventListener('click', () => { document.getElementById('shp-quit-overlay').style.display = 'flex'; }));
  on('btn-shp-quit-cancel',  () => { playDone(); document.getElementById('shp-quit-overlay').style.display = 'none'; });
  on('btn-shp-quit-confirm', () => {
    playExit();
    document.getElementById('shp-quit-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode === 'client' && typeof mpSendEnvelope === 'function') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_PLAYER_LEFT' } }); // PASS contract — host dissolves the match
    }
    if (window.syllyMultiplayerMode !== 'single') { resetToLobby(); return; } // host teardown broadcasts HOST_END_GAME
    showScreen('screen-shp-menu'); // single-device dev path
  });

  // Gameover — post-game ✕ → lobby; play-again → confirm overlay
  on('btn-shp-gameover-exit', () => { playExit(); resetToLobby(); });
  on('btn-shp-go-again',      () => { document.getElementById('shp-new-night-overlay').style.display = 'flex'; });
  on('btn-shp-new-cancel',    () => { playDone(); document.getElementById('shp-new-night-overlay').style.display = 'none'; });
  on('btn-shp-new-confirm',   () => {
    playLaunch();
    document.getElementById('shp-new-night-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; } // §11 play-again return
    shpStartSession(); // single-device dev path
  });

  // ── Sound buttons (engine.js querySelectorAll runs before SHP markup is parsed) ──
  document.querySelectorAll('#screen-shp-menu .btn-open-sound, #screen-shp-table .btn-open-sound, #screen-shp-gameover .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});
