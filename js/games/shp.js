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
let shpMoons        = 3;       // 3 | 5 | 7  (starting lives)
let shpDreamAccel   = true;    // number cards double while Herd < 50
let shpSleepwalkers = true;    // ghost-disruption system on/off
let shpSyllyMode    = false;   // Night Terrors — oscillating Climb ⇄ Plunge (§12)

// ── Roster (set at deal from lobby, persists across play-agains) ────────────
let shpPlayerCount  = 0;
let shpPlayerNames  = [];

// ── Match state (reset each Night / each play-again as noted) ───────────────
let shpHerd         = 0;       // running count
let shpCeiling      = 99;      // legal bust boundary — Climb 99; Plunge descends. NEVER a literal 99 in checks.
let shpDirection    = 1;       // 1 = forward, -1 = reversed
let shpLives        = [];      // Moons per player
let shpEliminated   = [];      // bool per player (Sleepwalker once true)
let shpElimOrder    = [];      // player indices in order of permanent Deep Sleep
let shpActivePlayer = 0;       // whose turn
let shpOpenerIdx    = 0;       // who opens the current Night

// ── Deck (host-authoritative; clients hold masked views) ───────────────────
let shpFlock        = [];      // draw pile — card-type ids
let shpDiscard      = [];      // played-card pile
let shpHands        = [];      // 2D — card-type ids per player
let shpHandCap      = [];      // per-player Pen cap (drops 4→3 while a Wolf is active)
let shpWolfActive   = [];      // bool per player — true while a Big Bad Wolf slot is shut

// ── Turn state (reset each turn) ───────────────────────────────────────────
let shpForcedCards  = 1;       // 1, or 2 for Heavy Eyelids / Sleep Paralysis nightmare
let shpPendingSkip  = null;    // revealed random-add value awaiting commit-animation
// (No fog state — the Fog nightmare swaps a Fogged Dream card, id 13, into the target's hand array.)

// ── Ghost / Nightmare Meter (v1 core, behind shpSleepwalkers) ──────────────
let shpMeter        = 0;       // charge — +1 per PASTURE card resolved, only once a Sleepwalker exists
let shpMeterFill    = 3;       // notches to fill — PLAYTEST DIAL (band 3–4)
let shpGhostTurnIdx = 0;       // rotation pointer into shpElimOrder for the next spend-right
let shpSpendHolder  = -1;      // Sleepwalker idx holding the spend-right (-1 = none)
let shpGhostOptions = [];      // the 3 face-down nightmare ids offered (Nightmare Lottery)
let shpGhostPending = false;   // true while the table waits for the spend-holder's blind pick
let shpLastDisrupt  = null;    // { text } — dream-shift banner shown until the next play
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
let shpTwoSel       = [];      // staged hand indices for a Heavy Eyelids two-card play
let shpDeepSleepInfo = null;   // { crasher, reason, elim, over } while a crash banner is shown
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
  { id:10, family:'alarm',   label:'Wide Awake',        emoji:'⏰', kind:'wake-leader' },
  { id:11, family:'alarm',   label:'Heavy Eyelids',     emoji:'🥱', kind:'two-card' },
  { id:12, family:'trap',    label:'The Big Bad Wolf',  emoji:'🐺', kind:'trap-shrink' },
  { id:13, family:'phantom', label:'Fogged Dream',      emoji:'🌫️', kind:'random-add',min:2, max:12 },
  // ↑ id 13 NOT in the starting deck — conjured only by the Fog nightmare (swaps in for a Pasture).
  //   Renders a cursed face-down face to everyone incl. its owner. Dissolves on play or redeal.
  { id:14, family:'pillow',  label:'−1',               emoji:'⏪', kind:'subtract', value:1  },
  { id:15, family:'pillow',  label:'−2',               emoji:'⏪', kind:'subtract', value:2  },
  { id:16, family:'pillow',  label:'−5',               emoji:'⏪', kind:'subtract', value:5  },
];

const SHP_DECK_COUNTS = {
  0:14, 1:14, 2:12, 3:8,    // Pasture +1/+2/+5/+10 (48 total — pastures bumped to cut special-hoarding)
  4:3,  5:3,  6:1,  7:1,    // Doze / Toss & Turn / CB-10 / Lullaby (1-of) — hoardable specials trimmed
  14:3, 15:3, 16:3,          // CB-1 / CB-2 / CB-5 (10 playable subtracts incl. CB-10)
  8:2,  9:2,  10:1, 11:1,   // Skip a Few / Black Sheep / Wide Awake / Heavy Eyelids — trimmed
  12:2,                     // Big Bad Wolf trap (unchanged)
  // Total: 48 pasture + 17 pillow(4/5/6/7/14/15/16) + 6 alarm(8/9/10/11) + 2 wolf = 73 cards
  //        (pasture share 48/73 ≈ 66%, up from 59% — fewer specials to sit on)
};

const SHP_NIGHTMARES = [
  { id:0, label:'Cold Feet',      emoji:'🥶', kind:'nudge', weight:3 }, // +1..+4 Herd (−1..−4 in Plunge)
  { id:1, label:'Restless Leg',   emoji:'🦵', kind:'shift', weight:3 }, // reverse OR skip next player
  { id:2, label:'Fog',            emoji:'🌫️', kind:'fog',   weight:1 }, // RARE — swap a Pasture for a Fogged Dream
  { id:3, label:'Sleep Paralysis',emoji:'😶', kind:'heavy', weight:2 }, // next player forced two-card
  { id:4, label:'Global Echo',    emoji:'🔊', kind:'echo',  weight:2 }, // shpEcho = 2 until next disruption
];

// ═══════════════════════════════════════════════════════════════════════════
// Pure helpers / guards (foundational)
// ═══════════════════════════════════════════════════════════════════════════
function shpAliveCount() { return shpEliminated.filter(e => !e).length; }
function shpMyIdx() { return (window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0); }

// Firebase strips empty/holey sub-arrays — rebuild a length-n 2D array (FRT shpNorm2D pattern).
function shpNorm2D(raw, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(Array.isArray(raw && raw[i]) ? raw[i].slice() : []);
  return out;
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
    default:           h = herd; break;            // skip/reverse/wake-leader/two-card unchanged
  }
  return Math.max(0, h);
}

// Next living player in the current direction.
function shpNextPlayer(fromIdx) {
  const n = shpPlayerCount; let i = fromIdx, guard = 0;
  do { i = (i + shpDirection + n) % n; guard++; } while (shpEliminated[i] && guard <= n);
  return i;
}

// Leader = alive player with most Moons; tie broken by next-in-direction from the active seat.
function shpLeaderIdx() {
  let bestLives = -1;
  for (let i = 0; i < shpPlayerCount; i++) if (!shpEliminated[i] && shpLives[i] > bestLives) bestLives = shpLives[i];
  const tied = [];
  for (let i = 0; i < shpPlayerCount; i++) if (!shpEliminated[i] && shpLives[i] === bestLives) tied.push(i);
  if (tied.length === 1) return tied[0];
  const n = shpPlayerCount; let i = shpActivePlayer, guard = 0;
  do { i = (i + shpDirection + n) % n; guard++; } while ((shpEliminated[i] || tied.indexOf(i) < 0) && guard <= n);
  return i;
}

// Playable = the card's resulting Herd keeps ≤ ceiling. Phase-aware:
//  · Climb + Sylly: adds & random-adds are ALWAYS legal — reaching ≥99 triggers the Plunge, never busts.
//  · Climb base:    adds must fit; random-add playable if its best-case (min) roll fits.
//  · Plunge:        arithmetic is sign-flipped (in shpHerdAfterCard); random-add subtracts → always safe.
// When the Herd is pushed over the ceiling (Cold Feet / a falling Plunge ceiling), only reducers stay legal.
function shpIsPlayable(playerIdx, handIdx) {
  const c = SHP_CARDS[shpHands[playerIdx][handIdx]];
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
  if (opts.wolf)     { el.className = 'shp-card shp-card-wolf';
                       el.innerHTML = '<span class="shp-card-emoji">\u{1F43A}</span><span class="shp-card-label">asleep</span>';
                       return el; }
  const c = SHP_CARDS[cardId];
  el.dataset.card = cardId;
  if (cardId === 13) {   // Fogged Dream — cursed, value hidden from everyone incl. owner (not skinned)
    el.className = 'shp-card shp-card-cursed';
    el.innerHTML = '<span class="shp-card-emoji">' + c.emoji + '</span><span class="shp-card-label">?</span>';
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
  shpLives      = Array(shpPlayerCount).fill(shpMoons);
  shpEliminated = Array(shpPlayerCount).fill(false);
  shpElimOrder  = [];
  shpHandCap    = Array(shpPlayerCount).fill(shpHandSize);
  shpWolfActive = Array(shpPlayerCount).fill(false);
  shpMeter = 0; shpGhostTurnIdx = 0; shpSpendHolder = -1; shpEcho = 0; shpPendingDisrupt = null;
  shpGameStandings = []; shpGameWinner = -1; shpDeepSleepInfo = null;
  shpNightNum = 0;
  shpOpenerIdx = Math.floor(Math.random() * shpPlayerCount);
  shpDealNight(shpOpenerIdx);
}

// Deal a fresh Night (game start AND every Deep-Sleep redeal). Living players only.
function shpDealNight(openerIdx) {
  shpNightNum++;
  shpHerd = 0; shpDirection = 1; shpPhase = 'climb'; shpCeiling = 99; shpPlungeGrace = 0; shpPlungeFlash = false;
  shpPlungeDescentTurns = 0; shpCurrentDrop = 0;
  shpForcedCards = 1; shpTwoSel = []; shpPendingSkip = null; shpDeepSleepInfo = null;
  shpPlayHistory = []; shpAnimSheep = 0;
  shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false;
  shpFlock = shpBuildFlock(); shpDiscard = [];
  shpHands = [];
  for (let i = 0; i < shpPlayerCount; i++) {
    shpHands.push([]);
    shpHandCap[i] = shpHandSize; shpWolfActive[i] = false;
    if (!shpEliminated[i]) shpDrawUp(i);
  }
  shpActivePlayer = openerIdx;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DEAL',
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive,
      herd: shpHerd, direction: shpDirection, activePlayer: shpActivePlayer,
      lives: shpLives, eliminated: shpEliminated, elimOrder: shpElimOrder,
      playerCount: shpPlayerCount, playerNames: shpPlayerNames, meter: shpMeter, echo: shpEcho,
    }});
  }
  shpShowTable();
}

function shpShowTable() {
  showScreen('screen-shp-table');
  if (shpDeepSleepInfo) { shpRenderDeepSleep(); return; }
  const me = shpMyIdx();
  // When the turn first becomes mine, gate card taps for 1 second (prevents accidental plays
  // on the turn-transition render before the player has oriented themselves).
  if (me >= 0 && shpActivePlayer === me && shpTapReadyForPlayer !== me) {
    shpTapReadyForPlayer = me;
    shpCardTapReady = false;
    if (shpTapReadyTimer) { clearTimeout(shpTapReadyTimer); shpTapReadyTimer = null; }
    shpTapReadyTimer = setTimeout(() => { shpCardTapReady = true; shpTapReadyTimer = null; shpRenderTable(); }, 1000);
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
  if (shpActivePlayer !== me || shpEliminated[me] || !shpCardTapReady) return;
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

function shpStageTwoCard(handIdx) {
  const pos = shpTwoSel.indexOf(handIdx);
  if (pos >= 0) shpTwoSel.splice(pos, 1);
  else if (shpTwoSel.length < 2) shpTwoSel.push(handIdx);
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

// Apply one card's effect to shared state. Returns { rolled, nextOverride, forcedNext }.
function shpResolveCard(cardId) {
  const c = SHP_CARDS[cardId];
  const rolled = (c.kind === 'random-add') ? shpRandInt(c.min, c.max) : null;
  let nextOverride = -1, forcedNext = false;
  if (c.kind === 'reverse')     shpDirection *= -1;
  if (c.kind === 'wake-leader') nextOverride = shpLeaderIdx();
  if (c.kind === 'two-card')    forcedNext = true;
  shpHerd = shpHerdAfterCard(shpHerd, cardId, rolled);  // arithmetic (sign-flipped in Plunge); unchanged otherwise
  if (c.family === 'pasture') shpChargeMeter();
  return { rolled, nextOverride, forcedNext };
}

function shpHostPlayCard(playerIdx, handIdx) {
  if (playerIdx !== shpActivePlayer) return;
  const cardId = shpHands[playerIdx][handIdx];
  if (cardId === undefined) return;
  if (!shpIsPlayable(playerIdx, handIdx)) return; // full legality guard (all card kinds)
  shpHands[playerIdx].splice(handIdx, 1);
  shpDiscard.push(cardId);
  const r = shpResolveCard(cardId);
  shpDrawUp(playerIdx);
  if (shpPostResolve(playerIdx)) return;          // Plunge entry / bust / mercy
  shpActivePlayer = (r.nextOverride >= 0) ? r.nextOverride : shpNextPlayer(playerIdx);
  shpForcedCards = r.forcedNext ? 2 : 1;
  shpPlungeTick();                                 // ceiling descent for the new turn (no-op in Climb)
  shpBroadcastTurn([cardId], r.rolled != null ? [r.rolled] : [], playerIdx);
  if (shpMeterReady()) shpHostOpenLottery(); else shpAfterAdvance();
}

function shpHostPlayTwoCard(playerIdx, a, b) {
  if (playerIdx !== shpActivePlayer) return;
  const h = shpHands[playerIdx];
  if (a == null || b == null || a === b || h[a] === undefined || h[b] === undefined) return;
  const ids = [h[a], h[b]];
  [a, b].sort((x, y) => y - x).forEach(i => h.splice(i, 1));     // remove higher index first
  ids.forEach(id => shpDiscard.push(id));
  const rolled = []; let nextOverride = -1;
  ids.forEach(id => { const r = shpResolveCard(id); if (r.rolled != null) rolled.push(r.rolled); if (r.nextOverride >= 0) nextOverride = r.nextOverride; });
  shpForcedCards = 1; shpTwoSel = [];                            // consumed; Heavy Eyelids does not chain (edge c)
  shpDrawUp(playerIdx);
  if (shpPostResolve(playerIdx)) return;
  shpActivePlayer = (nextOverride >= 0) ? nextOverride : shpNextPlayer(playerIdx);
  shpPlungeTick();
  shpBroadcastTurn(ids, rolled, playerIdx);
  if (shpMeterReady()) shpHostOpenLottery(); else shpAfterAdvance();
}

function shpBroadcastTurn(playedIds, rolled, byIdx) {
  shpLastDisrupt = null;                          // a new play ends the dream-shift banner

  // Push to play history (newest-first, cap at 20)
  const entry = { cardIds: playedIds.slice(), rolledVal: rolled, byIdx, byName: shpName(byIdx) };
  shpPlayHistory.unshift(entry);
  if (shpPlayHistory.length > 20) shpPlayHistory.length = 20;

  // Sheep parade — arc into the counter when the Herd grows, arc back out when counting backwards.
  shpStartSheepAnim(playedIds, rolled);

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_TURN_RESULT',
      herd: shpHerd, direction: shpDirection, nextActive: shpActivePlayer, forcedCards: shpForcedCards,
      played: playedIds, rolled, byIdx,
      hands: shpHands, handCaps: shpHandCap, wolfActive: shpWolfActive, meter: shpMeter,
      phase: shpPhase, ceiling: shpCeiling, grace: shpPlungeGrace, drop: shpCurrentDrop,
      playHistory: shpPlayHistory,
    }});
  }
  shpShowTable();
}

// Host: after advancing, the new active player Deep-Sleeps if they have no legal line.
function shpAfterAdvance() {
  if (!shpHasLegalLine(shpActivePlayer)) shpHostDeepSleep(shpActivePlayer, 'stuck');
}

function shpHostDeepSleep(crasherIdx, reason) {
  shpLives[crasherIdx]--;
  let elim = false;
  if (shpLives[crasherIdx] <= 0 && !shpEliminated[crasherIdx]) {
    shpEliminated[crasherIdx] = true; shpElimOrder.push(crasherIdx); elim = true;
  }
  shpForcedCards = 1; shpTwoSel = [];
  const over = shpAliveCount() <= 1;

  // Initialise per-player ack readyCheck (host marks own slot directly — dedup guard blocks self-send)
  shpDeepSleepAckNeeded = shpPlayerCount;
  shpDeepSleepAcks = window.syllyMultiplayerMode === 'single' ? shpPlayerCount : 1; // host counts itself
  shpIAcked = true;

  shpDeepSleepInfo = { crasher: crasherIdx, reason, elim, over };
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'SHP_DEEP_SLEEP', crasher: crasherIdx, reason, elim, over,
      lives: shpLives, eliminated: shpEliminated, elimOrder: shpElimOrder,
      acksNeeded: shpDeepSleepAckNeeded,
    }});
  }
  shpShowTable();
}

function shpHostContinue() {
  const info = shpDeepSleepInfo; shpDeepSleepInfo = null;
  if (info && info.over) { shpHostGameover(); return; }
  let opener = info ? info.crasher : shpActivePlayer;
  if (shpEliminated[opener]) opener = shpNextPlayer(opener);
  shpDealNight(opener);
}

function shpHostGameover() {
  let winner = -1;
  for (let i = 0; i < shpPlayerCount; i++) if (!shpEliminated[i]) { winner = i; break; }
  shpGameWinner = winner;
  shpGameStandings = [winner].concat(shpElimOrder.slice().reverse());
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'SHP_GAMEOVER', winner, standings: shpGameStandings } });
  }
  shpRenderGameover();
}

// ── Rendering ──────────────────────────────────────────────────────────────
// Sheep flight: net Herd movement from a play → a parade of 🐑 that arc IN to the counter (growth)
// or OUT to the left (counting backwards). Climb-only; identical on host and client (both read the
// synced played/rolled arrays). One 1500ms clear timer; capped at 8 sheep.
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
  shpAnimTimer = setTimeout(() => { shpAnimSheep = 0; shpAnimTimer = null; shpRenderTable(); }, 1500);
}

function shpRenderTable() {
  const body = document.getElementById('shp-table-body');
  const footer = document.getElementById('shp-table-footer');
  const status = document.getElementById('shp-table-status');
  if (!body || !footer) return;
  const me = shpMyIdx();
  const plunge = (shpPhase === 'plunge');

  // Status bar — night number + red in Plunge
  if (status) {
    status.textContent = plunge ? ('THE PLUNGE 🔻 \xB7 Night ' + shpNightNum) : ('Night ' + shpNightNum);
    status.className = 'text-xs font-semibold uppercase tracking-widest ' + (plunge ? 'text-red-500' : 'text-indigo-400');
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
    // Three-column band: empty left spacer (sheep arc into this whitespace), centred counter, and the
    // Last-played / Dream Journal on the right (previously a separate centred row below the counter).
    herdBox.className = 'grid grid-cols-3 items-center w-full';

    // Sheep flight — absolutely positioned (a .shp-sheep-layer overlay) so it NEVER shifts the layout.
    // The old inline row pushed a row in/out between the header and counter on every play (the jank).
    let sheepHtml = '';
    if (shpAnimSheep > 0) {
      const anim = (shpAnimDir === 'out') ? 'shpSheepArcOut' : 'shpSheepArcIn';
      let spans = '';
      for (let s = 0; s < shpAnimSheep; s++) {
        spans += '<span class="shp-sheep-fly" style="animation-name:' + anim + ';animation-delay:' + (s * 90) + 'ms">🐑</span>';
      }
      sheepHtml = '<div class="shp-sheep-layer">' + spans + '</div>';
    }

    // Right column — Last played (own row) + Dream Journal link below it (only after a card is played)
    let rightHtml = '';
    if (shpPlayHistory.length > 0) {
      const lastLabel = shpPlayHistory[0].cardIds.map(id => {
        const c = SHP_CARDS[id]; return c ? (c.emoji + '\xA0' + c.label) : '?';
      }).join(' + ');
      rightHtml =
        '<div class="flex flex-col items-end text-right gap-1 pr-0.5">' +
          '<div>' +
            '<p class="text-stone-300 text-[10px] uppercase tracking-wider leading-none">Last</p>' +
            '<p class="text-stone-600 text-xs font-medium leading-tight">' + lastLabel + '</p>' +
          '</div>' +
          '<button id="shp-journal-btn" class="text-indigo-500 text-xs font-semibold active:text-indigo-700 transition-colors">Dream Journal →</button>' +
        '</div>';
    }

    herdBox.innerHTML =
      '<div></div>' +                                   // left spacer — keeps the counter centred
      '<div class="relative flex flex-col items-center">' +
        sheepHtml +
        '<p class="text-stone-400 text-xs uppercase tracking-widest">The Herd</p>' +
        '<p class="text-6xl font-bold text-indigo-700">' + shpHerd + '</p>' +
        '<p class="text-stone-400 text-xs">ceiling ' + shpCeiling + '</p>' +
        (shpDirection < 0 ? '<p class="text-stone-400 text-xs">↺ reversed</p>' : '') +
      '</div>' +
      rightHtml;
  }
  wrap.appendChild(herdBox);
  const journalBtn = herdBox.querySelector('#shp-journal-btn');
  if (journalBtn) journalBtn.addEventListener('click', shpOpenLog);

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

  // ── Direction arrows (forward above chips, reverse below) ──
  const fwdArrow = document.createElement('p');
  fwdArrow.className = 'text-center text-sm font-semibold ' + (shpDirection === 1 ? (plunge ? 'text-red-500' : 'text-indigo-600') : 'text-stone-300');
  fwdArrow.textContent = '→ Forward';
  wrap.appendChild(fwdArrow);

  // ── Player chips ──
  const opp = document.createElement('div');
  opp.className = 'flex flex-wrap justify-center gap-2 w-full';
  for (let i = 0; i < shpPlayerCount; i++) {
    const isActive = i === shpActivePlayer && !shpEliminated[i];
    const chip = document.createElement('div');
    chip.className = 'flex flex-col items-center px-2.5 py-1 rounded-xl text-xs ' +
      (shpEliminated[i] ? 'bg-stone-200 text-stone-400'
        : isActive ? (plunge ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white')
        : 'bg-white text-stone-600 border border-stone-200');
    const rawMoons = shpLives[i] || 0;
    const moons = shpEliminated[i] ? '💤'
      : rawMoons <= 5 ? '\u{1F319}'.repeat(Math.max(0, rawMoons))
      : '\u{1F319}\xD7' + rawMoons;
    const cards = shpEliminated[i] ? 'asleep' : ((shpHands[i] ? shpHands[i].length : 0) + ' cards');
    chip.innerHTML =
      '<span class="font-semibold">' + shpName(i) + (i === me ? ' (you)' : '') + '</span>' +
      '<span class="text-sm leading-tight">' + moons + '</span>' +
      '<span class="opacity-70">' + cards + '</span>';
    opp.appendChild(chip);
  }
  wrap.appendChild(opp);

  const revArrow = document.createElement('p');
  revArrow.className = 'text-center text-sm font-semibold ' + (shpDirection === -1 ? (plunge ? 'text-red-500' : 'text-indigo-600') : 'text-stone-300');
  revArrow.textContent = '↺ Reverse';
  wrap.appendChild(revArrow);

  // ── Nightmare Meter — visible once the ghost system is active ──
  if (shpSleepwalkers && shpElimOrder.length > 0) {
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
    banner.textContent = shpEliminated[me] ? 'You are a Sleepwalker, haunting the dream…'
      : (shpActivePlayer === me
          ? (shpForcedCards === 2 ? 'Heavy Eyelids — play TWO cards.' : 'Your turn — play a card.')
          : 'Waiting for ' + shpName(shpActivePlayer) + '…');
  }
  wrap.appendChild(banner);
  body.appendChild(wrap);

  footer.innerHTML = '';
  if (shpGhostPending) {                          // table is gated on the spend-holder's blind pick
    if (shpEliminated[me] && shpSpendHolder === me) footer.appendChild(shpRenderLottery());
    return;
  }
  if (shpEliminated[me]) return;                  // sleepwalker: no hand, no input
  const tappable = (shpActivePlayer === me) && shpCardTapReady;
  footer.appendChild(shpHandFooter(me, tappable));
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
      if (shpTwoSel.indexOf(idx) >= 0) card.classList.add('ring-2', plunge ? 'ring-red-400' : 'ring-indigo-500');
      card.addEventListener('click', () => shpTapCard(idx));
    } else {
      card.style.cursor = 'pointer';
      if (legal.indexOf(idx) < 0) card.classList.add('opacity-40');
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
    hint.textContent = "Select two that won't break " + shpCeiling + " — a bad pair Deep Sleeps you.";
    col.appendChild(hint);
    const btn = document.createElement('button');
    const ready = shpTwoSel.length === 2;
    btn.className = 'min-h-12 w-full rounded-2xl ' + (plunge ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700') + ' active:scale-95 text-white font-semibold text-base transition-all duration-150' + (ready ? '' : ' opacity-40 pointer-events-none');
    btn.textContent = 'Play Both';
    btn.addEventListener('click', shpConfirmTwoCard);
    col.appendChild(btn);
  }

  return col;
}

// 500ms long-press: show card-info overlay. Cancelled on release/move.
function shpBindCardHold(el, cardId, isWolf) {
  let timer = null;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const start  = () => { cancel(); timer = setTimeout(() => { timer = null; shpShowCardInfo(cardId, isWolf); }, 500); };
  el.addEventListener('touchstart', start,  { passive: true });
  el.addEventListener('touchend',   cancel);
  el.addEventListener('touchmove',  cancel, { passive: true });
  el.addEventListener('mousedown',  start);
  el.addEventListener('mouseup',    cancel);
  el.addEventListener('mouseleave', cancel);
}

function shpShowCardInfo(cardId, isWolf) {
  const overlay = document.getElementById('shp-card-info-overlay');
  if (!overlay) return;
  let emoji, name, family, effect;
  if (isWolf) {
    emoji = '\u{1F43A}'; name = 'Big Bad Wolf'; family = 'Trap';
    effect = 'A Wolf was hiding in your Flock — it consumed a card slot. This slot is locked for the rest of the Night.';
  } else {
    const c = SHP_CARDS[cardId];
    if (!c) return;
    emoji = c.emoji; name = c.label;
    // Pillow subtract cards show just "−N" on the face, but name them "Counting Backwards −N" in the
    // inspect modal so the family reads clearly (and flips sign in the Plunge, matching the face).
    if (c.kind === 'subtract') name = 'Counting Backwards ' + shpCardFaceLabel(c, shpPhase === 'plunge');
    const fam = { pasture:'Pasture', pillow:'Pillow', alarm:'Alarm', phantom:'Phantom', trap:'Trap' };
    family = fam[c.family] || c.family;
    const plunge = (shpPhase === 'plunge');
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
      case 'wake-leader':
        effect = 'The next turn goes to whoever holds the most cards.';
        break;
      case 'two-card':
        effect = 'Forces the NEXT player to play two cards on their turn.';
        break;
      default:
        effect = c.label;
    }
  }
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('shp-card-info-emoji',  emoji);
  set('shp-card-info-name',   name);
  set('shp-card-info-family', family);
  set('shp-card-info-effect', effect);
  overlay.style.display = 'flex';
  playDone();
}

function shpRenderDeepSleep() {
  const body = document.getElementById('shp-table-body');
  const footer = document.getElementById('shp-table-footer');
  if (!body || !footer) return;
  const info = shpDeepSleepInfo || {};

  // One-shot boing — only fires the first time this Deep Sleep renders
  if (!info._boingPlayed) { info._boingPlayed = true; playBoing(); }

  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col items-center gap-4 text-center w-full';
  // Crash header
  const crashReason = info.reason === 'busted'
    ? 'Gambled too high — the herd broke loose.'
    : 'No safe card to play — sleep claimed them.';
  wrap.innerHTML =
    '<div class="text-5xl">\u{1F634}</div>' +
    '<div class="flex flex-col gap-1">' +
      '<h2 class="text-xl font-bold text-stone-800">' + shpName(info.crasher) + ' drifts off…</h2>' +
      '<p class="text-stone-500 text-sm">' + crashReason + ' −1 Moon.' + (info.elim ? ' No Moons left — now a Sleepwalker. \u{1F4A4}' : '') + '</p>' +
    '</div>';
  // Moon status for all players (sorted: most moons → eliminated at bottom)
  const sorted = Array.from({ length: shpPlayerCount }, (_, i) => i)
    .sort((a, b) => {
      if (shpEliminated[a] !== shpEliminated[b]) return shpEliminated[a] ? 1 : -1;
      return (shpLives[b] || 0) - (shpLives[a] || 0);
    });
  const moonList = document.createElement('div');
  moonList.className = 'flex flex-col gap-1.5 w-full';
  sorted.forEach(i => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-3 py-1.5 rounded-xl text-sm ' +
      (shpEliminated[i] ? 'bg-stone-100 text-stone-400' : 'bg-white border border-stone-200 text-stone-700');
    const rawMoons = shpLives[i] || 0;
    const moonStr = shpEliminated[i] ? '\u{1F4A4} Sleepwalker'
      : rawMoons <= 5 ? '\u{1F319}'.repeat(rawMoons) || 'Out'
      : '\u{1F319}\xD7' + rawMoons;
    row.innerHTML =
      '<span class="font-semibold">' + shpName(i) + '</span>' +
      '<span>' + moonStr + '</span>';
    moonList.appendChild(row);
  });
  wrap.appendChild(moonList);
  body.appendChild(wrap);

  footer.innerHTML = '';
  const mpMode = window.syllyMultiplayerMode;

  if (mpMode === 'single') {
    // Single-device: direct continue (unchanged)
    const btn = document.createElement('button');
    btn.className = 'min-h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-lg transition-all duration-150';
    btn.textContent = info.over ? 'See Daybreak ☀️' : 'Deal the next Night';
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
      (allAcked ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed');
    btn.textContent = info.over ? 'See Daybreak ☀️' : 'Deal the next Night';
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
      btn.className = 'min-h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-lg transition-all duration-150';
      btn.textContent = 'Got it \u{1F634}';
      btn.addEventListener('click', () => {
        playDone();
        shpIAcked = true;
        mpLockSync();
        mpSendEnvelope({ type: 'ACTION', payload: { action: 'SHP_SLEEP_ACK' } });
        shpRenderDeepSleep();
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
      (rank === 0 ? 'bg-indigo-600 text-white' : 'bg-white border border-stone-200 text-stone-600');
    const medal = rank === 0 ? '\u{1F451}' : (rank + 1) + '.';
    const sub   = rank === 0 ? 'Last one awake' : ordinal(rank + 1) + ' place';
    row.innerHTML =
      '<span class="font-semibold">' + medal + ' ' + shpName(pIdx) + '</span>' +
      '<span class="text-xs opacity-80">' + sub + '</span>';
    box.appendChild(row);
  });
  playSuccess();
}

// ── Ghost / Nightmare Meter (§6) — Sleepwalkers + the facedown Lottery ──────
function shpNightmareName(id) { const nm = SHP_NIGHTMARES.find(x => x.id === id); return nm ? nm.label : 'Nightmare'; }

// +1 per Pasture card resolved, only once a Sleepwalker exists. (No trigger here — checked after the play.)
function shpChargeMeter() {
  if (!shpSleepwalkers || shpElimOrder.length === 0) return;
  shpMeter++;
}
function shpMeterReady() {
  return shpSleepwalkers && shpElimOrder.length > 0 && shpMeter >= shpMeterFill && !shpGhostPending;
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
      phase: shpPhase, ceiling: shpCeiling,
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
// Returns true if the turn ended (bust → Deep Sleep), false to keep advancing.
function shpPostResolve(playerIdx) {
  if (shpSyllyMode && shpPhase === 'climb' && shpHerd >= 99) { shpEnterPlunge(); return false; }
  if (shpHerd > shpCeiling) { shpHostDeepSleep(playerIdx, 'busted'); return true; } // climb overshoot OR Plunge squeeze
  shpCheckMercy();
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Overlays
// ═══════════════════════════════════════════════════════════════════════════
function shpSyncToggle(id, on) {
  const t = document.getElementById(id);
  if (!t) return;
  t.textContent = on ? 'ON' : 'OFF';
  t.className = (on ? 'game-toggle-on-indigo' : 'game-toggle-off') + ' shrink-0';
}

function shpSyncSettingsUI() {
  const setGroup = (attr, val) => document.querySelectorAll('[' + attr + ']').forEach(b =>
    b.classList.toggle('pill-active-indigo', b.getAttribute(attr) === String(val)));
  setGroup('data-shp-hand', shpHandSize);
  setGroup('data-shp-moons', shpMoons);
  shpSyncToggle('btn-shp-dream-toggle', shpDreamAccel);
  shpSyncToggle('btn-shp-sleepwalk-toggle', shpSleepwalkers);
  shpSyncToggle('btn-shp-sylly-toggle', shpSyllyMode);
}

function shpBindPills(attr, apply) {
  document.querySelectorAll('[' + attr + ']').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    playPillClick();
    document.querySelectorAll('[' + attr + ']').forEach(x => x.classList.remove('pill-active-indigo'));
    b.classList.add('pill-active-indigo');
    apply(b.getAttribute(attr));
  }));
}

function shpOpenSettings() {
  shpSyncSettingsUI();
  const inner = document.querySelector('#shp-settings-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('shp-settings-overlay').style.display = 'flex';
}
function shpOpenHowTo() {
  const inner = document.querySelector('#shp-how-to-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('shp-how-to-overlay').style.display = 'flex';
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
        shpLives = p.lives; shpEliminated = p.eliminated; shpElimOrder = p.elimOrder || [];
        shpMeter = p.meter || 0; shpEcho = p.echo || 0; shpForcedCards = 1; shpTwoSel = []; shpDeepSleepInfo = null;
        shpGhostPending = false; shpGhostOptions = []; shpLastDisrupt = null;
        shpPhase = 'climb'; shpCeiling = 99; shpPlungeFlash = false; shpCurrentDrop = 0;
        if (shpAnimTimer) { clearTimeout(shpAnimTimer); shpAnimTimer = null; }
        shpPlayHistory = []; shpAnimSheep = 0;
        shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false;
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_TURN_RESULT') {
        if (p.phase) { if (shpPhase === 'climb' && p.phase === 'plunge') shpPlungeFlash = true; shpPhase = p.phase; }
        if (p.ceiling !== undefined) shpCeiling = p.ceiling;
        if (p.grace !== undefined) shpPlungeGrace = p.grace;
        if (p.drop !== undefined) shpCurrentDrop = p.drop;
        shpHerd = p.herd; shpDirection = p.direction; shpActivePlayer = p.nextActive;
        shpForcedCards = p.forcedCards || 1;
        shpHands     = shpNorm2D(p.hands, shpPlayerCount);
        shpHandCap   = p.handCaps  || shpHandCap;
        shpWolfActive= p.wolfActive|| shpWolfActive;
        shpMeter = p.meter || 0; shpTwoSel = []; shpDeepSleepInfo = null;
        shpGhostPending = false; shpLastDisrupt = null;
        if (p.playHistory) shpPlayHistory = p.playHistory;
        shpStartSheepAnim(p.played, p.rolled);   // sheep flight (Climb only — phase already applied above)
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
        shpLastDisrupt = { text: p.text };
        shpShowTable(); if (typeof mpUnlockSync === 'function') mpUnlockSync();
      } else if (a === 'SHP_DEEP_SLEEP') {
        shpLives = p.lives; shpEliminated = p.eliminated; shpElimOrder = p.elimOrder || [];
        shpDeepSleepInfo = { crasher: p.crasher, reason: p.reason, elim: p.elim, over: p.over };
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
      } else if (a === 'SHP_SLEEP_ACK') {
        shpDeepSleepAcks++;
        shpRenderDeepSleep();           // re-render to update count + unlock Continue when all confirmed
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
  shpPlayerCount = 0;  shpPlayerNames = [];
  shpHerd = 0;         shpCeiling = 99;       shpDirection = 1;
  shpLives = [];       shpEliminated = [];    shpElimOrder = [];
  shpActivePlayer = 0; shpOpenerIdx = 0;
  shpFlock = [];       shpDiscard = [];       shpHands = [];
  shpHandCap = [];     shpWolfActive = [];
  shpForcedCards = 1;  shpPendingSkip = null;
  shpMeter = 0;        shpGhostTurnIdx = 0;   shpSpendHolder = -1;
  shpGhostOptions = [];shpPendingDisrupt = null; shpEcho = 0;
  shpGhostPending = false; shpLastDisrupt = null;
  shpPhase = 'climb';  shpPlungeGrace = 0;   shpPlungeFlash = false;
  shpPlungeDescentTurns = 0; shpCurrentDrop = 0;
  shpTwoSel = [];      shpDeepSleepInfo = null;
  shpGameStandings = []; shpGameWinner = -1;
  shpNightNum = 0;
  shpCardTapReady = true;
  if (shpTapReadyTimer) { clearTimeout(shpTapReadyTimer); shpTapReadyTimer = null; }
  shpTapReadyForPlayer = -1;
  shpPlayHistory = []; shpAnimSheep = 0;
  shpDeepSleepAcks = 0; shpDeepSleepAckNeeded = 0; shpIAcked = false;
  const infoOverlay = document.getElementById('shp-card-info-overlay');
  if (infoOverlay) infoOverlay.style.display = 'none';
  const logOverlay = document.getElementById('shp-play-log-overlay');
  if (logOverlay) logOverlay.style.display = 'none';
  // Settings (shpHandSize/Moons/DreamAccel/Sleepwalkers/SyllyMode) intentionally preserved.
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
  on('btn-shp-tip-close',      () => { playDone(); document.getElementById('shp-tip-overlay').style.display = 'none'; });
  on('btn-shp-card-info-close',() => { playDone(); document.getElementById('shp-card-info-overlay').style.display = 'none'; });
  // Tap the backdrop (outside the card) to dismiss the inspect modal
  const shpCardInfoOv = document.getElementById('shp-card-info-overlay');
  if (shpCardInfoOv) shpCardInfoOv.addEventListener('click', e => {
    if (e.target === shpCardInfoOv) { playDone(); shpCardInfoOv.style.display = 'none'; }
  });
  on('btn-shp-play-log-close', () => { playDone(); document.getElementById('shp-play-log-overlay').style.display = 'none'; });

  // Settings controls — pills + toggles
  shpBindPills('data-shp-hand',  v => shpHandSize = parseInt(v, 10));
  shpBindPills('data-shp-moons', v => shpMoons    = parseInt(v, 10));
  on('btn-shp-dream-toggle',     () => { shpDreamAccel   = !shpDreamAccel;   playPillClick(); shpSyncToggle('btn-shp-dream-toggle', shpDreamAccel); });
  on('btn-shp-sleepwalk-toggle', () => { shpSleepwalkers = !shpSleepwalkers; playPillClick(); shpSyncToggle('btn-shp-sleepwalk-toggle', shpSleepwalkers); });
  on('btn-shp-sylly-toggle',     () => { shpSyllyMode    = !shpSyllyMode;    shpSyllyMode ? playSyllyOn() : playSyllyOff(); shpSyncToggle('btn-shp-sylly-toggle', shpSyllyMode); });

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
