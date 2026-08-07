// ═══════════════════════════════════════════════════════════════════════════
// pass.js — Pass (Gan Deng Yan climbing card game)
// Depends on: engine.js (showScreen, playLaunch, playSuccess, playBoing,
//             playWhoosh, playDone, playExit, playAlarm, playPillClick,
//             resetToLobby, shuffle),
//             engine-multiplayer.js (mpSendEnvelope, mpLockSync, mpUnlockSync,
//             mpMyPlayerIdx, mpPlayerSlots, mpReturnToLobby, mpShowModeScreen),
//             cards.js (Cards.buildEl, Cards.buildBackEl)
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ──────────────────────────────────
let passHandSize          = 5;           // 5 | 6 | 7
let passChipStack         = 100;         // 50 | 100 | 150
let passMatchDuration     = '5';         // '5' | '10' | 'endless'
let passBombStrictness    = 'standard';  // 'standard' | 'heavy'
let passMidGameDraw       = false;
let passOpenClimbing      = false;       // relax exact +1 climb -> any higher of same type
let passMinSequenceLength = 3;           // 3 | 4 | 5
let passJokerCount        = 2;           // 0 | 2 | 4
let passSkyJokerVariant   = false;
let passSyllyMode         = false;       // The Abyss — always last setting

// ── Roster (set at game start, persist across play-agains) ──────────────────
let passPlayerCount  = 0;
let passPlayerNames  = [];
// Seat = mpPlayerSlots index (join order; host = seat 1) — NOT shuffled.
// Turn order = ascending seat index, wrapping (the "clockwise circuit").
// Deliberate deviation from DYB/BLD random seats: Pass has no role
// assignment, so join order is fair and predictable.
let passSeatNumbers  = [];

// ── Match state (reset each play-again) ──────────────────────────────────────
let passMatchRound = 0;
let passChips      = [];   // [playerCount] current chip totals
let passRoundsWon  = [];   // [playerCount] round wins for tie-break
let passMatchOver  = false;

// ── Round state (reset each round) ───────────────────────────────────────────
let passDeck           = [];    // remaining draw pile — card objects { rank, suit, deckIdx }
let passHands          = [];    // [playerCount][] of card objects
let passTableCombo     = null;  // { type, rank, count } | null = open table
let passTableLeaderIdx = -1;    // player who laid the current table combo
let passPassCount      = [];    // [playerCount] consecutive passes per player (escalation display)
let passHasPlayedCard  = [];    // [playerCount] bool — played any card this round
let passAbyss          = [];    // Sylly Mode: face-up central pool
let passRoundWinnerIdx = -1;
let passConsecPasses   = 0;     // consecutive passes since last valid play — table-clear trigger only
let passTableCards     = [];    // the card objects currently on the table — for arena display only
let passMandatoryCard  = null;  // round-1 opening lead must contain this card (lowest, e.g. 3♦); null otherwise
let passDeckIdx        = 0;     // 0 = Deck 1 (charcoal grey), 1 = Deck 2 (crimson red)

// ── Turn state (reset each turn) ─────────────────────────────────────────────
let passCurrentPlayerIdx = 0;
let passSelectedCardIdxs = [];        // indices into passHands[mpMyPlayerIdx]
let passPhase            = 'your-turn'; // 'your-turn' | 'waiting' | 'abyss-draft' | 'round-over'

// ── Trick history (round-scoped) ──────────────────────────────────────────────
let passCurrentTrickPlays = [];  // [{ playerIdx, action, comboLabel }]
let passTrickLog          = [];  // [{ trickNum, plays, winnerIdx }]
let passCurrentTrickNum   = 1;

// ── Constants ─────────────────────────────────────────────────────────────────
const PASS_RANK_VALUES = {
  '3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,'2':13
  // Joker = 14 (base); Sky Joker ON: single Joker = 16, Double Joker = 17
};
const PASS_SUITS = ['♠','♥','♦','♣'];
const PASS_RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
// Suit order for the round-1 starting-player tie-break ONLY (never used in play comparison):
// ♦ lowest → ♣ → ♥ → ♠ highest, so 3♦ is the absolute lowest card.
const PASS_LEAD_SUIT_ORDER = { '♦': 0, '♣': 1, '♥': 2, '♠': 3 };

function passCardSortKey(card) {
  if (card.rank === 'Joker') return passSkyJokerVariant ? 16 : 14;
  return PASS_RANK_VALUES[card.rank] || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK BUILDING
// ═══════════════════════════════════════════════════════════════════════════

function passBuildDeck(deckIdx) {
  const cards = [];
  for (const suit of PASS_SUITS) {
    for (const rank of PASS_RANKS) {
      cards.push({ rank, suit, deckIdx });
    }
  }
  for (let i = 0; i < passJokerCount; i++) {
    cards.push({ rank: 'Joker', suit: '', deckIdx }); // suit '' not null — Firebase strips nulls
  }
  return shuffle(cards);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBO DETECTION
// ═══════════════════════════════════════════════════════════════════════════

// Returns { type, rank, count } or null.
// types: Single | Pair | Triplet | Quad | DoubleJoker | Sequence | DoubleSequence | null
function passDetectCombo(cards) {
  if (!cards || cards.length === 0) return null;
  const n = cards.length;
  const jokers  = cards.filter(c => c.rank === 'Joker');
  const natural = cards.filter(c => c.rank !== 'Joker');
  const jokerCt = jokers.length;
  const natCt   = natural.length;

  // ── DoubleJoker Bomb (2 Jokers) ──────────────────────────────────────────
  if (n === 2 && jokerCt === 2) {
    return { type: 'DoubleJoker', rank: 99, count: 1 }; // absolute max
  }

  // ── Single (1 card) ──────────────────────────────────────────────────────
  if (n === 1) {
    const card = cards[0];
    if (card.rank === 'Joker') {
      // Single Joker validated contextually in passIsValidPlay — detect as Single here
      const r = passSkyJokerVariant ? 16 : 14;
      return { type: 'Single', rank: r, count: 1 };
    }
    return { type: 'Single', rank: PASS_RANK_VALUES[card.rank], count: 1 };
  }

  // ── Quad Bomb (4 same rank, ≤1 Joker) ────────────────────────────────────
  if (n === 4) {
    if (natCt >= 3) {
      const natRanks = natural.map(c => c.rank);
      const uniqueNat = [...new Set(natRanks)];
      if (uniqueNat.length === 1) {
        // All natural cards same rank — Joker(s) fill remaining slot(s)
        return { type: 'Quad', rank: PASS_RANK_VALUES[uniqueNat[0]], count: 1 };
      }
    }
  }

  // ── Triplet (3 same rank, ≤1 Joker) — Bomb when passBombStrictness === 'standard' ──
  if (n === 3 && natCt >= 2) {
    const natRanks = natural.map(c => c.rank);
    const uniqueNat = [...new Set(natRanks)];
    if (uniqueNat.length === 1) {
      return { type: 'Triplet', rank: PASS_RANK_VALUES[uniqueNat[0]], count: 1 };
    }
  }

  // ── Pair (2 same rank, ≤1 Joker) ─────────────────────────────────────────
  if (n === 2 && jokerCt <= 1) {
    if (jokerCt === 1) {
      // Joker pairs with the natural card
      return { type: 'Pair', rank: PASS_RANK_VALUES[natural[0].rank], count: 1 };
    }
    if (natural[0].rank === natural[1].rank) {
      return { type: 'Pair', rank: PASS_RANK_VALUES[natural[0].rank], count: 1 };
    }
  }

  // ── Sequence (M consecutive ranks, M ≥ passMinSequenceLength, 2s excluded) ─
  if (n >= passMinSequenceLength) {
    const seq = passDetectSequence(natural, jokerCt, n);
    if (seq) return seq;
  }

  // ── DoubleSequence (2N cards, N ≥ 2 pairs of consecutive ranks) ───────────
  if (n >= 4 && n % 2 === 0) {
    const ds = passDetectDoubleSequence(natural, jokerCt, n);
    if (ds) return ds;
  }

  return null;
}

// Returns { type:'Sequence', rank, count } or null.
// Jokers fill gaps and/or extend ends; 2s excluded; Two-Natural-Card Anchor.
function passDetectSequence(natural, jokerCt, totalCards) {
  if (natural.some(c => c.rank === '2')) return null; // 2s excluded from sequences
  const natValues = natural.map(c => PASS_RANK_VALUES[c.rank]).sort((a, b) => a - b);
  const uniqueVals = [...new Set(natValues)];
  if (uniqueVals.length !== natValues.length) return null; // duplicate natural ranks → not a sequence
  if (uniqueVals.length < 2) return null; // Two-Natural-Card Anchor

  // The run must span totalCards consecutive values.
  // With jokerCt Jokers available, we need to fill the gaps in [lo..hi] where hi-lo+1 = totalCards.
  // Try all windows of size totalCards that encompass the natural cards.
  const lo_nat = uniqueVals[0];
  const hi_nat = uniqueVals[uniqueVals.length - 1];

  // 2s are excluded (value 13). Cap ceiling at 12 (Ace).
  const maxRank = 12; // A = 12

  for (let lo = Math.max(1, lo_nat - jokerCt); lo <= lo_nat; lo++) {
    const hi = lo + totalCards - 1;
    if (hi > maxRank) continue;
    if (hi_nat > hi) continue; // natural cards don't fit
    // Count gaps to fill with Jokers
    let gaps = 0;
    for (let v = lo; v <= hi; v++) {
      if (!uniqueVals.includes(v)) gaps++;
    }
    if (gaps === jokerCt) {
      return { type: 'Sequence', rank: hi, count: totalCards };
    }
  }
  return null;
}

// Returns { type:'DoubleSequence', rank, count } or null.
// count = number of pairs; 2s excluded; Two-Natural-Card Anchor (≥2 natural cards).
function passDetectDoubleSequence(natural, jokerCt, totalCards) {
  if (natural.some(c => c.rank === '2')) return null;
  const pairCount = totalCards / 2;
  if (pairCount < 2) return null;

  // Group natural cards by rank
  const byRank = {};
  for (const c of natural) {
    byRank[c.rank] = (byRank[c.rank] || 0) + 1;
  }
  // Only ranks with exactly 2 naturals (or 1 natural + 1 Joker slot) are valid
  const rankValues = Object.entries(byRank).map(([r, ct]) => ({ v: PASS_RANK_VALUES[r], ct }));
  // All natural ranks must appear exactly once or twice (no triple+)
  if (rankValues.some(r => r.ct > 2)) return null;

  const natPairValues   = rankValues.filter(r => r.ct === 2).map(r => r.v).sort((a, b) => a - b);
  const natSingleValues = rankValues.filter(r => r.ct === 1).map(r => r.v).sort((a, b) => a - b);

  // Total natural cards
  const natTotal = natural.length;
  if (natTotal < 2) return null; // Two-Natural-Card Anchor

  // Available Jokers to fill pair slots
  // Each missing pair needs 2 Jokers; each single-natural pair needs 1 Joker.
  const singleSlots = natSingleValues.length; // each needs 1 Joker to complete the pair
  const jokerNeeded = singleSlots; // incomplete pairs

  // Try all windows of pairCount consecutive ranks
  const maxRank = 12; // A = 12
  const allNatValues = [...new Set([...natPairValues, ...natSingleValues])].sort((a, b) => a - b);

  if (allNatValues.length === 0) return null;

  const lo_nat = allNatValues[0];
  const hi_nat = allNatValues[allNatValues.length - 1];

  for (let lo = Math.max(1, lo_nat - (jokerCt - jokerNeeded)); lo <= lo_nat; lo++) {
    const hi = lo + pairCount - 1;
    if (hi > maxRank) continue;
    if (hi_nat > hi) continue;
    // How many Jokers needed: 2 per fully-missing rank + 1 per single-natural rank
    let jokersUsed = 0;
    for (let v = lo; v <= hi; v++) {
      if (natPairValues.includes(v)) continue;          // full pair — no Joker
      if (natSingleValues.includes(v)) { jokersUsed++; continue; } // half pair — 1 Joker
      jokersUsed += 2;                                  // missing pair — 2 Jokers
    }
    if (jokersUsed === jokerCt) {
      return { type: 'DoubleSequence', rank: hi, count: pairCount };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

// Returns { valid: true } or { valid: false, msg: string }
function passIsValidPlay(combo, hand) {
  if (!combo) return { valid: false, msg: "That's not a valid combo." };

  // ── Single Joker hard block (Sky Joker OFF) ────────────────────────────
  if (combo.type === 'Single' && (combo.rank === 14 || combo.rank === 16)) {
    if (!passSkyJokerVariant) {
      // Only allowed as last card on an open table
      if (hand.length > 1 || passTableCombo !== null) {
        return { valid: false, msg: "A Joker can only lead on its own as your very last card." };
      }
    }
  }

  // ── Two-Natural-Card Anchor already enforced in detection ─────────────
  // If detection returned null for a bad sequence, combo will be null above.

  // ── Open table (no restriction on combo type) ─────────────────────────
  if (passTableCombo === null) return { valid: true };

  // ── DoubleJoker table — all must pass ─────────────────────────────────
  if (passTableCombo.type === 'DoubleJoker') {
    return { valid: false, msg: "The table is closed. You must pass." };
  }

  // ── Bomb overrides non-Bomb ────────────────────────────────────────────
  const isBomb = (t) => t === 'Triplet' || t === 'Quad' || t === 'DoubleJoker';
  if (isBomb(combo.type) && !isBomb(passTableCombo.type)) return { valid: true };

  // ── Bomb on Bomb ───────────────────────────────────────────────────────
  if (isBomb(combo.type) && isBomb(passTableCombo.type)) {
    const bombTier = { 'Triplet': 1, 'Quad': 2, 'DoubleJoker': 3 };
    const playTier  = bombTier[combo.type];
    const tableTier = bombTier[passTableCombo.type];

    if (playTier < tableTier) {
      return { valid: false, msg: "Must play a higher-tier Bomb." };
    }
    // Heavy mode: Triplet not a Bomb
    if (passBombStrictness === 'heavy' && combo.type === 'Triplet') {
      return { valid: false, msg: "Heavy mode: only Quads are Bombs." };
    }
    if (playTier === tableTier && combo.rank <= passTableCombo.rank) {
      return { valid: false, msg: "Must beat with a higher rank." };
    }
    return { valid: true };
  }

  // ── Heavy mode: Triplet is not a Bomb ─────────────────────────────────
  if (passBombStrictness === 'heavy' && combo.type === 'Triplet') {
    // Falls through to normal climbing rules below
  }

  // ── Type must match ────────────────────────────────────────────────────
  if (combo.type !== passTableCombo.type) {
    return { valid: false, msg: "Must match the current combo type." };
  }

  // ── Sequence/DoubleSequence: count must match ──────────────────────────
  if ((combo.type === 'Sequence' || combo.type === 'DoubleSequence') &&
      combo.count !== passTableCombo.count) {
    return { valid: false, msg: "Sequence length must match." };
  }

  // ── Rank rules ─────────────────────────────────────────────────────────
  // 2s (rank 13) beat any single/pair of their type without needing +1
  if (combo.rank === 13 && passTableCombo.rank < 13) return { valid: true };

  // Sky Joker single (rank 16) beats any single
  if (passSkyJokerVariant && combo.type === 'Single' && combo.rank === 16) return { valid: true };

  // Open Climbing Mode: any strictly-higher rank of the same type beats the table
  if (passOpenClimbing) {
    if (combo.rank <= passTableCombo.rank) {
      return { valid: false, msg: "Must be a higher rank." };
    }
    return { valid: true };
  }

  // Standard: must be exactly +1
  if (combo.rank !== passTableCombo.rank + 1) {
    return { valid: false, msg: "Must be one rank higher." };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════════════════════════════════════════

function passShowSeating() {
  passRenderSeatingList();
  showScreen('screen-pass-seating');
}

function passRenderSeatingList() {
  const list = document.getElementById('pass-seating-list');
  list.innerHTML = '';
  for (let i = 0; i < passPlayerCount; i++) {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm';
    item.innerHTML = `
      <span class="font-semibold text-stone-800">${passPlayerNames[i] || 'Player ' + (i + 1)}</span>
      <span class="text-xs text-stone-400 font-semibold uppercase tracking-wider">Seat ${i + 1}</span>
    `;
    list.appendChild(item);
  }
}

function passStartSession() {
  // Client guard — clients wait for PASS_GAME_START SYNC (DYB BUG-04 pattern)
  if (window.syllyMultiplayerMode === 'client') return;
  passShowSeating();
}

function passStartGame() {
  // Host builds and deals hands, broadcasts PASS_GAME_START
  passMatchRound = 0;
  passChips      = Array(passPlayerCount).fill(passChipStack);
  passRoundsWon  = Array(passPlayerCount).fill(0);
  passMatchOver  = false;
  passSeatNumbers = Array.from({ length: passPlayerCount }, (_, i) => i);
  passStartRound();
}

function passStartRound() {
  passMatchRound++;
  passDeckIdx = 0;
  passDeck    = passBuildDeck(0);
  passHands   = Array.from({ length: passPlayerCount }, () => []);
  passTableCombo     = null;
  passTableLeaderIdx = -1;
  passTableCards     = [];
  passPassCount      = Array(passPlayerCount).fill(0);
  passHasPlayedCard  = Array(passPlayerCount).fill(false);
  passAbyss          = [];
  passRoundWinnerIdx = -1;
  passConsecPasses   = 0;
  passMandatoryCard  = null;

  // Deal hands
  for (let i = 0; i < passHandSize; i++) {
    for (let p = 0; p < passPlayerCount; p++) {
      if (passDeck.length > 0) passHands[p].push(passDeck.pop());
    }
  }

  // Sort all hands lowest→highest so the display is immediately readable
  passHands.forEach(h => h.sort((a, b) => passCardSortKey(a) - passCardSortKey(b)));

  // Reset trick history for the new round
  passCurrentTrickPlays = [];
  passTrickLog          = [];
  passCurrentTrickNum   = 1;

  // Determine who leads first
  if (passMatchRound === 1) {
    passCurrentPlayerIdx = passFindLeader();
  }
  // Rounds 2+: passCurrentPlayerIdx is set to passRoundWinnerIdx after passResolveRound()

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:      'PASS_GAME_START',
      playerNames: passPlayerNames,
      seatNumbers: passSeatNumbers,
      hands:       passHands,
      chips:       passChips,
      handSize:    passHandSize,
      roundNum:    passMatchRound,
      firstPlayer: passCurrentPlayerIdx,
      mandatoryCard: passMandatoryCard,
    }});
  }
  passShowTable();
}

// Determine the round-1 leader: the holder of the single lowest card (3♦ is the absolute
// lowest — lowest rank, ties broken by suit ♦<♣<♥<♠). That card becomes the mandatory
// opening card: the leader's first combo must contain it. Jokers are never the mandatory
// card. The suit ranking is used HERE ONLY — it never affects play comparison.
function passFindLeader() {
  let bestKey = Infinity, leader = 0;
  passMandatoryCard = null;
  for (let p = 0; p < passPlayerCount; p++) {
    for (const c of passHands[p]) {
      if (c.rank === 'Joker') continue;
      const key = (PASS_RANK_VALUES[c.rank] || 99) * 10 + (PASS_LEAD_SUIT_ORDER[c.suit] ?? 9);
      if (key < bestKey) { bestKey = key; leader = p; passMandatoryCard = c; }
    }
  }
  return leader;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function passShowTable() {
  passPhase = (mpMyPlayerIdx === passCurrentPlayerIdx) ? 'your-turn' : 'waiting';
  passSelectedCardIdxs = [];
  passRenderTable();
  showScreen('screen-pass-table');
}

function passRenderTable() {
  const myIdx = mpMyPlayerIdx;

  // ── My name + chips ──────────────────────────────────────────────────────
  document.getElementById('pass-table-my-name').textContent  = passPlayerNames[myIdx] || 'Me';
  document.getElementById('pass-table-my-chips').textContent = passChips[myIdx] + ' chips';

  // ── Round / match info ───────────────────────────────────────────────────
  const durLabel = passMatchDuration === 'endless' ? '∞' : passMatchDuration;
  document.getElementById('pass-table-round-label').textContent = `Round ${passMatchRound} of ${durLabel}`;

  // ── Player status tracker (all players, turn order, chevrons) ───────────
  const tracker = document.getElementById('pass-player-tracker');
  tracker.innerHTML = '';
  for (let p = 0; p < passPlayerCount; p++) {
    if (p > 0) {
      const chevron = document.createElement('span');
      chevron.className = 'text-stone-300 text-xs self-center flex-shrink-0';
      chevron.textContent = '›';
      tracker.appendChild(chevron);
    }
    const isActive = p === passCurrentPlayerIdx;
    const isMe     = p === myIdx;
    const cardCount = passHands[p] ? passHands[p].length : 0;
    const name = (passPlayerNames[p] || ('P' + (p + 1))) + (isMe ? ' ★' : '');

    const node = document.createElement('div');
    node.className = 'pass-player-node ' + (isActive ? 'pass-player-active' : 'pass-player-inactive');
    node.innerHTML = `
      <span class="text-xs font-semibold text-stone-800 truncate max-w-[4rem]">${name}</span>
      <div class="flex items-center gap-0.5 bg-stone-100 rounded-lg px-1.5 py-0.5">
        <span class="text-[0.6rem] leading-none">🂠</span>
        <span class="text-xs font-bold text-stone-700 leading-none">${cardCount}</span>
      </div>
    `;
    tracker.appendChild(node);
  }

  // ── Active play arena ────────────────────────────────────────────────────
  passRenderArena();

  // ── Abyss pool (Sylly Mode) ──────────────────────────────────────────────
  const abyssSection = document.getElementById('pass-abyss-section');
  if (passSyllyMode) {
    abyssSection.style.display = 'flex';
    passRenderAbyss();
  } else {
    abyssSection.style.display = 'none';
  }

  // ── My hand ──────────────────────────────────────────────────────────────
  passRenderHand();

  // ── Controls ─────────────────────────────────────────────────────────────
  const isMyTurn = myIdx === passCurrentPlayerIdx && passPhase === 'your-turn';
  // Cannot pass on an open table — the table leader must play something first
  document.getElementById('btn-pass-pass').disabled = !isMyTurn || passTableCombo == null;
  document.getElementById('pass-table-status').textContent = passTableStatusText();
  passUpdatePlayButton();

  // Staring escalation text
  const myPassStreak = passPassCount[myIdx] || 0;
  const streakEl = document.getElementById('pass-table-staring');
  if (myPassStreak >= 3) {
    streakEl.textContent = '😰 Staring into the void...';
    streakEl.style.display = 'block';
  } else if (myPassStreak === 2) {
    streakEl.textContent = '😟 Staring helplessly...';
    streakEl.style.display = 'block';
  } else if (myPassStreak === 1) {
    streakEl.textContent = '😬 Staring at your hand...';
    streakEl.style.display = 'block';
  } else {
    streakEl.style.display = 'none';
  }
}

function passTableStatusText() {
  if (passPhase === 'abyss-draft') return 'THE ABYSS GAZES BACK...';
  if (passPhase === 'round-over')  return 'Round over!';
  if (mpMyPlayerIdx === passCurrentPlayerIdx) return "Your turn — select cards to play.";
  return `Waiting for ${passPlayerNames[passCurrentPlayerIdx] || '...'}`;
}

function passComboLabel(combo) {
  const typeNames = {
    'Single': 'Single', 'Pair': 'Pair', 'Triplet': 'Triplet',
    'Quad': 'Quad Bomb', 'DoubleJoker': 'Double Joker Bomb',
    'Sequence': `Sequence (${combo.count})`, 'DoubleSequence': `Double Sequence (${combo.count} pairs)`,
  };
  return typeNames[combo.type] || combo.type;
}

function passRenderArena() {
  const labelEl   = document.getElementById('pass-arena-label');
  const cardsEl   = document.getElementById('pass-arena-cards');
  const leaderEl  = document.getElementById('pass-arena-leader');
  if (!cardsEl) return;
  cardsEl.innerHTML = '';

  if (!passTableCombo || passTableCards.length === 0) {
    labelEl.textContent  = 'Open Table';
    leaderEl.textContent = '';
    const ph = document.createElement('p');
    ph.className   = 'text-stone-400 text-xs text-center';
    ph.textContent = 'Lead anything.';
    cardsEl.appendChild(ph);
    return;
  }

  labelEl.textContent  = passComboLabel(passTableCombo);
  leaderEl.textContent = passTableLeaderIdx >= 0
    ? (passPlayerNames[passTableLeaderIdx] || '') : '';

  // Render in the player's selection (tap) order — a Joker keeps the slot it was played in
  const sorted = passTableCards;
  const n = sorted.length;

  // Overlap increases with hand size so corner indices always stay visible
  const overlapPx = n <= 1 ? 0
    : n === 2      ? -4
    : n <= 4       ? -10
    : n <= 6       ? -14
    : -18;

  sorted.forEach((card, i) => {
    const el = Cards.buildEl(card);
    el.classList.add('pass-arena-card');
    if (i > 0) el.style.marginLeft = overlapPx + 'px';
    cardsEl.appendChild(el);
  });
}

// ── Trick history helpers ─────────────────────────────────────────────────────

function passRecordPlay(playerIdx, combo, cards) {
  const label = combo ? passComboLabel(combo) : 'played';
  passCurrentTrickPlays.push({ playerIdx, action: 'play', comboLabel: label, cards: cards || [] });
}

function passRecordPass(playerIdx) {
  passCurrentTrickPlays.push({ playerIdx, action: 'pass', comboLabel: null });
}

function passCompleteTrick(winnerIdx) {
  if (passCurrentTrickPlays.length === 0) return;
  passTrickLog.push({
    trickNum: passCurrentTrickNum,
    plays: passCurrentTrickPlays.slice(),
    winnerIdx,
  });
  passCurrentTrickNum++;
  passCurrentTrickPlays = [];
}

// ── History overlay ───────────────────────────────────────────────────────────

function passOpenHistoryOverlay() {
  passRenderHistoryOverlay();
  document.getElementById('pass-history-overlay').style.display = 'flex';
}

function passRenderHistoryOverlay() {
  const body = document.getElementById('pass-history-body');
  body.innerHTML = '';

  const allTricks = passTrickLog.slice().reverse(); // most recent first
  // Also include the in-progress trick if it has plays
  if (passCurrentTrickPlays.length > 0) {
    allTricks.unshift({
      trickNum: passCurrentTrickNum,
      plays: passCurrentTrickPlays.slice(),
      winnerIdx: null, // still active
    });
  }

  if (allTricks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-stone-400 text-sm text-center py-4';
    empty.textContent = 'No plays yet this round.';
    body.appendChild(empty);
    return;
  }

  allTricks.forEach(trick => {
    const section = document.createElement('div');
    section.className = 'flex flex-col gap-2';

    const isActive = trick.winnerIdx === null;
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2';
    const badge = document.createElement('span');
    badge.className = isActive
      ? 'text-xs font-bold uppercase tracking-widest text-zinc-900'
      : 'text-xs font-bold uppercase tracking-widest text-stone-400';
    badge.textContent = `Trick ${trick.trickNum}`;
    const statusChip = document.createElement('span');
    statusChip.className = isActive
      ? 'text-[0.65rem] font-semibold bg-zinc-900 text-white rounded-full px-2 py-0.5'
      : 'text-[0.65rem] font-semibold bg-stone-200 text-stone-500 rounded-full px-2 py-0.5';
    statusChip.textContent = isActive ? 'Active' : 'Cleared';
    header.appendChild(badge);
    header.appendChild(statusChip);
    section.appendChild(header);

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl px-4 py-3 shadow-sm flex flex-col gap-1.5';

    trick.plays.forEach(play => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-2';
      const name = document.createElement('span');
      name.className = 'text-stone-700 text-sm font-semibold truncate';
      name.textContent = passPlayerNames[play.playerIdx] || ('P' + (play.playerIdx + 1));
      const action = document.createElement('span');
      if (play.action === 'pass') {
        action.className = 'text-stone-400 text-xs font-semibold';
        action.textContent = 'Pass';
      } else {
        action.className = 'text-zinc-900 text-xs font-semibold bg-stone-100 rounded-lg px-2 py-0.5 flex flex-col items-end gap-0.5';
        const comboLine = document.createElement('span');
        comboLine.textContent = play.comboLabel;
        action.appendChild(comboLine);
        if (play.cards && play.cards.length > 0) {
          const cardsLine = document.createElement('span');
          cardsLine.className = 'text-stone-400 font-normal text-[0.65rem]';
          cardsLine.textContent = play.cards.map(c =>
            c.rank === 'Joker' ? '🃏' : c.suit + c.rank
          ).join(' ');
          action.appendChild(cardsLine);
        }
      }
      row.appendChild(name);
      row.appendChild(action);
      card.appendChild(row);
    });

    section.appendChild(card);
    body.appendChild(section);
  });
}

function passRenderHand() {
  const container = document.getElementById('pass-hand-container');
  container.innerHTML = '';
  const hand = passHands[mpMyPlayerIdx] || [];
  hand.forEach((card, idx) => {
    const el = Cards.buildEl(card);
    el.classList.add('pass-hand-card');
    if (passSelectedCardIdxs.includes(idx)) el.classList.add('pass-card-selected');
    if (passPhase === 'your-turn') {
      el.addEventListener('click', () => passToggleCardSelect(idx));
    }
    container.appendChild(el);
  });
}

function passRenderAbyss() {
  const container = document.getElementById('pass-abyss-pool');
  container.innerHTML = '';
  passAbyss.forEach((card, i) => {
    const el = Cards.buildEl(card);
    el.classList.add('pass-abyss-card');
    if (i > 0) el.style.marginLeft = '-1.5rem'; // overlapping
    container.appendChild(el);
  });
  document.getElementById('pass-abyss-count').textContent = passAbyss.length + ' in the Abyss';
}

function passToggleCardSelect(idx) {
  const i = passSelectedCardIdxs.indexOf(idx);
  if (i === -1) {
    passSelectedCardIdxs.push(idx);
  } else {
    passSelectedCardIdxs.splice(i, 1);
  }
  passRenderHand();
  passUpdatePlayButton();
}

function passUpdatePlayButton() {
  const btn = document.getElementById('btn-pass-play');
  if (!btn) return;
  if (passPhase !== 'your-turn' || passSelectedCardIdxs.length === 0) {
    btn.style.opacity = '0.45';
    return;
  }
  const hand = passHands[mpMyPlayerIdx] || [];
  const selectedCards = passSelectedCardIdxs.map(i => hand[i]);
  const combo = passDetectCombo(selectedCards);
  const valid = combo && passIsValidPlay(combo, hand).valid;
  btn.style.opacity = valid ? '1' : '0.45';
}

// ── Submit play ───────────────────────────────────────────────────────────────

function passSubmitPlay() {
  const myIdx = mpMyPlayerIdx;
  if (myIdx !== passCurrentPlayerIdx) return;

  const hand = passHands[myIdx];
  if (passSelectedCardIdxs.length === 0) {
    passShakeButton('btn-pass-play');
    passShowError("Select cards to play.");
    return;
  }

  const selectedCards = passSelectedCardIdxs.map(i => hand[i]);
  const combo = passDetectCombo(selectedCards);

  if (!combo) {
    passShakeButton('btn-pass-play');
    passShowError("That's not a valid combo.");
    return;
  }

  // Single Joker block
  if (combo.type === 'Single' && (combo.rank === 14 || combo.rank === 16)) {
    if (!passSkyJokerVariant && (hand.length > 1 || passTableCombo !== null)) {
      passShakeButton('btn-pass-play');
      passShowError("A Joker can only lead on its own as your very last card.");
      return;
    }
  }

  const validation = passIsValidPlay(combo, hand);
  if (!validation.valid) {
    passShakeButton('btn-pass-play');
    passShowError(validation.msg);
    return;
  }

  // Round-1 opening lead must include the mandatory lowest card (e.g. 3♦). passMandatoryCard
  // is cleared the moment the opening play lands (locally + via SYNC), so this gates ONLY the
  // round-1 leader — never the players after them (their device no longer has it set).
  if (passMandatoryCard) {
    const hasIt = selectedCards.some(c =>
      c.rank === passMandatoryCard.rank && c.suit === passMandatoryCard.suit && c.deckIdx === passMandatoryCard.deckIdx);
    if (!hasIt) {
      passShakeButton('btn-pass-play');
      passShowError(`Your opening play must include ${passMandatoryCard.rank}${passMandatoryCard.suit}.`);
      return;
    }
  }

  playSuccess();

  if (window.syllyMultiplayerMode !== 'single') {
    if (window.syllyMultiplayerMode === 'client') {
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: {
        action: 'PASS_PLAY_SUBMIT',
        playerIdx: myIdx,
        cardIndices: [...passSelectedCardIdxs],
      }});
      // Optimistically remove the played cards from our own hand so they leave the
      // hand immediately. The client already validated identically to the host, and
      // PASS_TURN_RESULT keeps our own hand authoritative (it sends counts for others
      // only), so the trimmed hand stays consistent when the SYNC lands.
      [...passSelectedCardIdxs].sort((a, b) => b - a).forEach(i => hand.splice(i, 1));
      passSelectedCardIdxs = [];
      passRenderHand();
      return;
    }
    // Host processes locally then broadcasts
    passProcessPlay(myIdx, [...passSelectedCardIdxs], combo);
  } else {
    passProcessPlay(myIdx, [...passSelectedCardIdxs], combo);
  }
}

function passSubmitPass() {
  const myIdx = mpMyPlayerIdx;
  if (myIdx !== passCurrentPlayerIdx) return;
  if (passTableCombo == null) {
    // Cannot pass on an open table — the leader must play
    passShakeButton('btn-pass-pass');
    passShowError('Open table — you must lead.');
    return;
  }

  playWhoosh();

  if (window.syllyMultiplayerMode !== 'single') {
    if (window.syllyMultiplayerMode === 'client') {
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: {
        action: 'PASS_PASS_SUBMIT',
        playerIdx: myIdx,
      }});
      return;
    }
    passProcessPass(myIdx);
  } else {
    passProcessPass(myIdx);
  }
}

// Detonation Combos trigger the Abyss when they WIN a trick or empty a hand.
// Standard Combos (Single, Pair) keep the trick quiet — they never detonate, so a
// trick or match won on a Single/Pair leaves the pool untouched. Fracture (13) is
// independent of this gate.
const PASS_DETONATION_TYPES = new Set(['Triplet', 'Quad', 'DoubleJoker', 'Sequence', 'DoubleSequence']);
function passIsDetonationCombo(combo) {
  return !!combo && PASS_DETONATION_TYPES.has(combo.type);
}

// ── Core turn processing (runs on host / single device) ──────────────────────

function passProcessPlay(playerIdx, cardIndices, combo) {
  const hand = passHands[playerIdx];
  // Capture the played cards BEFORE removing from hand, in the player's SELECTION (tap)
  // order so a Joker keeps the slot the player chose for it (e.g. 7→Joker→9 reads 7-8-9).
  // Display honours this order; combo validity is order-independent.
  passTableCards = cardIndices.map(i => hand[i]);
  // Remove played cards from a descending-sorted copy so indices stay valid during splice
  [...cardIndices].sort((a, b) => b - a).forEach(i => hand.splice(i, 1));

  passTableCombo     = combo;
  passTableLeaderIdx = playerIdx;
  passHasPlayedCard[playerIdx] = true;
  passMandatoryCard  = null;   // opening lead satisfied — clear so later players aren't gated
  passConsecPasses   = 0;
  passPassCount[playerIdx] = 0;
  passRecordPlay(playerIdx, combo, passTableCards.slice());

  // Check round win: hand empty after play
  if (hand.length === 0) {
    passRoundWinnerIdx = playerIdx;
    passCompleteTrick(playerIdx);
    if (window.syllyMultiplayerMode !== 'single') {
      // Abyss detonates only when the round is won by a Detonation Combo — the pool
      // is distributed to opponents BEFORE scoring; the winner is exempt. A Standard
      // Combo (Single/Pair) ends the match peacefully with no draft.
      if (passSyllyMode && passAbyss.length > 0 && passIsDetonationCombo(combo)) {
        const draftResult = passResolveAbyssDetonation(playerIdx);
        mpSendEnvelope({ type: 'SYNC', payload: {
          action:     'PASS_ABYSS_DRAFT',
          trigger:    'round-win',
          draftOrder: draftResult.order,
          draftCards: draftResult.cards,
          newHands:   passHands,
        }});
        // passResolveRound() runs after the abyss reveal — via broadcastRoundEnd
        setTimeout(() => passBroadcastRoundEnd(), 2000); // brief pause for abyss reveal
        return;
      }
      passBroadcastRoundEnd();
    } else {
      // Distribute the Abyss before scoring — only on a Detonation Combo win; winner exempt.
      if (passSyllyMode && passAbyss.length > 0 && passIsDetonationCombo(combo)) {
        passResolveAbyssDetonation(playerIdx);
      }
      passResolveRound(playerIdx);
    }
    return;
  }

  // Mid-Game Draw: if table was cleared by this play AND passMidGameDraw is on
  // (Table is only cleared by full-circle pass in passProcessPass; not by a single play winning)
  // → No mid-game draw here; only on full-circle pass table clear.

  // Advance to next player
  passCurrentPlayerIdx = (playerIdx + 1) % passPlayerCount;
  passSelectedCardIdxs = [];

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:         'PASS_TURN_RESULT',
      playerIdx,
      action_type:    'play',
      tableCombo:     passTableCombo,
      tableCards:     passTableCards,
      nextPlayerIdx:  passCurrentPlayerIdx,
      abyss:          passAbyss,
      passStreak:     passPassCount[playerIdx],
      tableCleared:   false,
      handCounts:     passHands.map(h => h.length),
    }});
    // Host is a participant but never receives its own SYNC (dedup guard) — re-render locally.
    passShowTable();
  } else {
    passShowTable();
  }
}

function passProcessPass(playerIdx) {
  // Guard: cannot pass on an open table (Firebase may deliver null as undefined)
  if (passTableCombo == null) return;
  passPassCount[playerIdx]++;
  passConsecPasses++;
  passRecordPass(playerIdx);

  // Abyss: draw 1 card into pool on every pass (Sylly Mode)
  if (passSyllyMode && passDeck.length > 0) {
    // Check cap before pushing
    if (passAbyss.length >= 13) {
      passHandleAbyssFracture(playerIdx);
      return;
    }
    passAbyss.push(passDeck.pop());
    // Check detonation cap AFTER adding
    if (passAbyss.length === 13) {
      passHandleAbyssFracture(playerIdx);
      return;
    }
  }

  // Full-circle pass: all OTHER players have passed — the trick resolves.
  // Threshold is passPlayerCount - 1 (everyone except the table leader who played
  // the winning combo). When the last passer triggers this, (playerIdx + 1) % n
  // naturally resolves to trickWinner (the leader is next after the full rotation).
  if (passConsecPasses >= passPlayerCount - 1) {
    // The trick winner is whoever's combo no one beat = the current table leader.
    // Capture it before clearing — it drives both the Abyss exemption and the
    // talon-draw start seat.
    const trickWinner  = passTableLeaderIdx;
    const winningCombo = passTableCombo; // capture before reset — gates Abyss detonation
    passCompleteTrick(trickWinner);
    passTableCombo     = null;
    passTableLeaderIdx = -1;
    passTableCards     = [];
    passConsecPasses   = 0;

    // Abyss detonation (Sylly Mode): only when the trick was WON by a Detonation
    // Combo does the pool deal clockwise to everyone EXCEPT the trick winner and
    // clear. A trick won by a Standard Combo (Single/Pair) leaves the pool intact —
    // it persists and keeps growing on future passes.
    let abyssDraft = null;
    if (passSyllyMode && passAbyss.length > 0 && passIsDetonationCombo(winningCombo)) {
      const draftResult = passResolveAbyssDetonation(trickWinner);
      abyssDraft = { order: draftResult.order, cards: draftResult.cards };
    }

    let talonDraws = [];
    if (passMidGameDraw) {
      // All players draw 1 clockwise, starting from the trick winner.
      for (let step = 0; step < passPlayerCount; step++) {
        const drawP = (trickWinner + step) % passPlayerCount;
        if (passDeck.length > 0) {
          const drawn = passDeck.pop();
          passHands[drawP].push(drawn);
          talonDraws.push({ playerIdx: drawP, card: drawn });
        }
      }
      // Re-sort every hand that received a card so rank order is preserved
      talonDraws.forEach(({ playerIdx: p }) => {
        passHands[p].sort((a, b) => passCardSortKey(a) - passCardSortKey(b));
      });
    }

    if (window.syllyMultiplayerMode !== 'single') {
      const payload = {
        action:        'PASS_TURN_RESULT',
        playerIdx,
        action_type:   'pass',
        tableCombo:    null,
        tableCards:    [],
        nextPlayerIdx: (playerIdx + 1) % passPlayerCount,
        abyss:         passAbyss,
        passStreak:    passPassCount[playerIdx],
        tableCleared:  true,
        trickWinner,
        handCounts:    passHands.map(h => h.length),
      };
      if (abyssDraft) payload.abyssDraft = abyssDraft;
      if (talonDraws.length > 0) {
        payload.talonDraws = talonDraws;
        payload.talonRemaining = passDeck.length;
      }
      mpSendEnvelope({ type: 'SYNC', payload });
      // Host never receives its own SYNC — advance + re-render its own view here.
      passCurrentPlayerIdx = (playerIdx + 1) % passPlayerCount;
      passShowTable();
    } else {
      passCurrentPlayerIdx = (playerIdx + 1) % passPlayerCount;
      passShowTable();
    }
    return;
  }

  // Advance turn
  passCurrentPlayerIdx = (playerIdx + 1) % passPlayerCount;
  passSelectedCardIdxs = [];

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:        'PASS_TURN_RESULT',
      playerIdx,
      action_type:   'pass',
      tableCombo:    passTableCombo,
      tableCards:    passTableCards,
      nextPlayerIdx: passCurrentPlayerIdx,
      abyss:         passAbyss,
      passStreak:    passPassCount[playerIdx],
      tableCleared:  false,
      handCounts:    passHands.map(h => h.length),
    }});
    // Host never receives its own SYNC — re-render its own view.
    passShowTable();
  } else {
    passShowTable();
  }
}

// ── Abyss mechanics (Sylly Mode) ──────────────────────────────────────────────

function passHandleAbyssFracture(playerIdx) {
  playAlarm();
  const draftResult = passResolveAbyssDetonation(-1); // -1 = no one exempt on fracture
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:     'PASS_ABYSS_DRAFT',
      trigger:    'fracture',
      draftOrder: draftResult.order,
      draftCards: draftResult.cards,
      newHands:   passHands,
    }});
    // After draft resolves, continue the interrupted pass
    setTimeout(() => passProcessPassAfterAbyss(playerIdx), 2000);
  } else {
    passRenderTable();
    passProcessPassAfterAbyss(playerIdx);
  }
}

function passProcessPassAfterAbyss(playerIdx) {
  // Re-add the original pass card that triggered the fracture
  if (passDeck.length > 0) passAbyss.push(passDeck.pop());
  passCurrentPlayerIdx = (playerIdx + 1) % passPlayerCount;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:        'PASS_TURN_RESULT',
      playerIdx,
      action_type:   'pass',
      tableCombo:    passTableCombo,
      tableCards:    passTableCards,
      nextPlayerIdx: passCurrentPlayerIdx,
      abyss:         passAbyss,
      passStreak:    passPassCount[playerIdx],
      tableCleared:  false,
      handCounts:    passHands.map(h => h.length),
    }});
    // Host never receives its own SYNC — re-render its own view.
    passShowTable();
  } else {
    passShowTable();
  }
}

// Returns { order: int[], cards: card[] } — clockwise draft, exemptIdx skipped, 13-cap skipped
function passResolveAbyssDetonation(exemptIdx) {
  const draftOrder = [];
  const draftCards = [];
  const abyssCopy  = [...passAbyss];
  let abyssIdx = 0;

  // clockwise from player after exemptIdx (or player 0 if no exempt)
  const startOffset = exemptIdx >= 0 ? (exemptIdx + 1) % passPlayerCount : 0;
  for (let step = 0; step < passPlayerCount && abyssIdx < abyssCopy.length; step++) {
    const p = (startOffset + step) % passPlayerCount;
    if (p === exemptIdx) continue;
    if (passHands[p].length >= 13) continue; // hand cap — skip
    draftOrder.push(p);
    draftCards.push(abyssCopy[abyssIdx]);
    passHands[p].push(abyssCopy[abyssIdx]);
    abyssIdx++;
  }
  passAbyss = abyssCopy.slice(abyssIdx); // remaining cards (if any) stay
  return { order: draftOrder, cards: draftCards };
}

// ── Round resolution ──────────────────────────────────────────────────────────

function passResolveRound(winnerIdx) {
  passRoundsWon[winnerIdx]++;
  const chipDeltas = Array(passPlayerCount).fill(0);
  const badges     = [];
  let totalPenalty = 0;

  for (let p = 0; p < passPlayerCount; p++) {
    if (p === winnerIdx) { badges.push(''); continue; }
    const handLen = passHands[p].length;
    let penalty = 0;
    let badge   = '';

    if (handLen >= 13) {
      penalty = handLen * 3;
      badge   = passSyllyMode ? 'Total Despair' : 'Loaded Down';
    } else if (!passHasPlayedCard[p]) {
      penalty = handLen * 2;
      badge   = passSyllyMode ? 'Dragged Under' : 'Caught Sleeping';
    } else {
      penalty = handLen * 1;
      badge   = passSyllyMode ? 'Surviving the Wake' : 'Clean Exit';
    }
    chipDeltas[p]  = -penalty;
    passChips[p]  -= penalty;
    totalPenalty  += penalty;
    badges.push(badge);
  }
  chipDeltas[winnerIdx] = totalPenalty;
  passChips[winnerIdx] += totalPenalty;

  // Check match termination
  const matchOver = passCheckMatchOver();

  if (window.syllyMultiplayerMode !== 'single') {
    passBroadcastRoundEnd(winnerIdx, chipDeltas, badges, matchOver);
  } else {
    passShowRoundWrap(winnerIdx, chipDeltas, badges, matchOver);
  }
}

function passBroadcastRoundEnd(winnerIdx, chipDeltas, badges, matchOver) {
  // Allow calling with no args for the detonation path (round end deferred)
  if (winnerIdx === undefined) {
    passResolveRound(passRoundWinnerIdx);
    return;
  }
  mpSendEnvelope({ type: 'SYNC', payload: {
    action:          'PASS_ROUND_END',
    winnerIdx,
    chipDeltas,
    newChips:        passChips,
    badges,
    finalHandCounts: passHands.map(h => h.length),
    matchOver,
    finalChips:      matchOver ? passChips : undefined,
    roundsWon:       matchOver ? passRoundsWon : undefined,
  }});
  // Host never receives its own SYNC — navigate locally (mirrors the PASS_ROUND_END
  // SYNC handler; passRoundsWon was already incremented in passResolveRound, so don't
  // re-increment here). Without this the round winner (the player who emptied their
  // hand) is stranded on the table screen.
  if (matchOver) {
    passShowGameover(winnerIdx, passChips, passRoundsWon);
  } else {
    passShowRoundWrap(winnerIdx, chipDeltas, badges, false);
  }
}

function passCheckMatchOver() {
  if (passMatchDuration !== 'endless' && passMatchRound >= parseInt(passMatchDuration)) return true;
  if (passChips.some(c => c <= 0)) return true;
  return false;
}

// ── Round wrap screen ─────────────────────────────────────────────────────────

function passShowRoundWrap(winnerIdx, chipDeltas, badges, matchOver) {
  passPhase = 'round-over'; // gate stray PASS_TURN_RESULT packets from re-showing the table
  const container = document.getElementById('pass-round-wrap-scores');
  container.innerHTML = '';
  for (let p = 0; p < passPlayerCount; p++) {
    const delta    = chipDeltas[p];
    const el       = document.createElement('div');
    el.className   = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3';
    // Gains green, losses red, no change neutral — applies to the winner too (always a gain)
    const deltaColour = delta > 0 ? 'text-green-600' : (delta < 0 ? 'text-red-500' : 'text-stone-400');
    el.innerHTML   = `
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-stone-800 truncate">${passPlayerNames[p] || 'Player ' + (p + 1)}</p>
        ${badges[p] ? `<p class="text-xs text-stone-400">${badges[p]}</p>` : ''}
      </div>
      <div class="flex items-stretch gap-5 flex-shrink-0 text-right">
        <div>
          <p class="text-[0.6rem] uppercase tracking-wider text-stone-400 font-semibold">Change</p>
          <p class="font-bold ${deltaColour}">${delta >= 0 ? '+' : ''}${delta}</p>
        </div>
        <div>
          <p class="text-[0.6rem] uppercase tracking-wider text-stone-400 font-semibold">Chips</p>
          <p class="font-bold text-stone-700">${passChips[p]}</p>
        </div>
      </div>
    `;
    container.appendChild(el);
  }

  document.getElementById('pass-round-wrap-winner').textContent =
    (passPlayerNames[winnerIdx] || 'Player ' + (winnerIdx + 1)) + ' wins the round! 🃏';

  // Show "Next Round" only to host; clients see "Waiting..."
  const nextBtn  = document.getElementById('btn-pass-next-round');
  const waitText = document.getElementById('pass-round-wrap-waiting');
  if (window.syllyMultiplayerMode === 'client') {
    nextBtn.style.display  = 'none';
    waitText.style.display = 'block';
  } else {
    nextBtn.style.display  = 'block';
    waitText.style.display = 'none';
  }

  if (matchOver) {
    nextBtn.style.display = 'none';
    waitText.style.display = 'none';
    // Auto-navigate to gameover after a short pause
    setTimeout(() => passShowGameover(), 1500);
  }

  showScreen('screen-pass-round-wrap');
}

// ── Gameover ──────────────────────────────────────────────────────────────────

function passShowGameover(winnerIdx, finalChips, roundsWon) {
  passPhase = 'round-over'; // gate stray PASS_TURN_RESULT packets from re-showing the table
  // Use stored state if not provided
  if (winnerIdx === undefined) {
    winnerIdx  = passChips.indexOf(Math.max(...passChips));
    finalChips = passChips;
    roundsWon  = passRoundsWon;
  }

  const list = document.getElementById('pass-gameover-list');
  list.innerHTML = '';
  // Sort by chips desc, then rounds won desc
  const order = Array.from({ length: passPlayerCount }, (_, i) => i)
    .sort((a, b) => finalChips[b] - finalChips[a] || (roundsWon[b] - roundsWon[a]));
  order.forEach((p, rank) => {
    const el = document.createElement('div');
    el.className = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    const medal = ['🥇', '🥈', '🥉'][rank] || '';
    el.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xl">${medal}</span>
        <div>
          <p class="font-semibold text-stone-800">${passPlayerNames[p] || 'Player ' + (p + 1)}</p>
          <p class="text-xs text-stone-400">${roundsWon[p]} round${roundsWon[p] !== 1 ? 's' : ''} won</p>
        </div>
      </div>
      <p class="font-bold text-zinc-900">${finalChips[p]} chips</p>
    `;
    list.appendChild(el);
  });

  document.getElementById('pass-gameover-winner').textContent =
    (passPlayerNames[winnerIdx] || 'Player ' + (winnerIdx + 1)) + ' takes the pot! 🃏';

  showScreen('screen-pass-gameover');
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLAYER ENVELOPE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function passHandleEnvelope(env) {
  const { type, payload } = env;

  if (type === 'LOBBY' && payload.action === 'SETTINGS_SYNC') {
    // Apply synced settings from host
    const s = payload.gameSettings;
    if (!s) return;
    passHandSize          = s.passHandSize          ?? passHandSize;
    passChipStack         = s.passChipStack         ?? passChipStack;
    passMatchDuration     = s.passMatchDuration     ?? passMatchDuration;
    passBombStrictness    = s.passBombStrictness    ?? passBombStrictness;
    passMidGameDraw       = s.passMidGameDraw       ?? passMidGameDraw;
    passOpenClimbing      = s.passOpenClimbing      ?? passOpenClimbing;
    passMinSequenceLength = s.passMinSequenceLength ?? passMinSequenceLength;
    passJokerCount        = s.passJokerCount        ?? passJokerCount;
    passSkyJokerVariant   = s.passSkyJokerVariant   ?? passSkyJokerVariant;
    passSyllyMode         = s.passSyllyMode         ?? passSyllyMode;
    passSyncSettingsUI();
    return;
  }

  if (type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return; // only host processes ACTIONs

    if (payload.action === 'PASS_PLAY_SUBMIT') {
      const hand  = passHands[payload.playerIdx];
      const cards = payload.cardIndices.map(i => hand[i]);
      const combo = passDetectCombo(cards);
      const check = passIsValidPlay(combo, hand);
      if (!check.valid) {
        // Invalid play from client — ignore (shouldn't happen with correct client validation)
        return;
      }
      // Authoritative round-1 opening-lead check (mirrors passSubmitPlay)
      if (passMandatoryCard) {
        const hasIt = cards.some(c =>
          c.rank === passMandatoryCard.rank && c.suit === passMandatoryCard.suit && c.deckIdx === passMandatoryCard.deckIdx);
        if (!hasIt) return;
      }
      passProcessPlay(payload.playerIdx, payload.cardIndices, combo);
      return;
    }

    if (payload.action === 'PASS_PASS_SUBMIT') {
      passProcessPass(payload.playerIdx);
      return;
    }

    if (payload.action === 'PASS_PLAYER_LEFT') {
      // A client quit — dissolve the match for everyone
      mpSendEnvelope({ type: 'SYNC', payload: {
        action:    'PASS_MATCH_DISSOLVED',
        leaverIdx: payload.playerIdx,
      }});
      resetToLobby();
      return;
    }
  }

  if (type === 'SYNC') {
    if (payload.action === 'PASS_GAME_START') {
      passPlayerNames      = payload.playerNames;
      passSeatNumbers      = payload.seatNumbers;
      passHands            = (payload.hands || []).map(h => h || []);
      passChips            = payload.chips || [];
      passHandSize         = payload.handSize;
      passPlayerCount      = passPlayerNames.length;
      passMatchRound       = payload.roundNum || 1;
      passCurrentPlayerIdx = payload.firstPlayer || 0;
      passMandatoryCard    = payload.mandatoryCard || null;
      passChips            = payload.chips.map(c => c);
      // Only zero the cumulative tally at a true match start (round 1). Rounds 2+
      // re-broadcast PASS_GAME_START but must preserve the running rounds-won count,
      // otherwise the client gameover subline shows only the final round (BUG-02).
      if ((payload.roundNum || 1) === 1) passRoundsWon = Array(passPlayerCount).fill(0);
      passMatchOver        = false;
      passTableCombo       = null;
      passTableLeaderIdx   = -1;
      passTableCards       = [];
      passPassCount        = Array(passPlayerCount).fill(0);
      passHasPlayedCard    = Array(passPlayerCount).fill(false);
      passAbyss            = [];
      passConsecPasses     = 0;
      // Sort all hands lowest→highest so display is immediately readable
      passHands.forEach(h => h.sort((a, b) => passCardSortKey(a) - passCardSortKey(b)));
      // Reset trick history for the new round
      passCurrentTrickPlays = [];
      passTrickLog          = [];
      passCurrentTrickNum   = 1;
      mpUnlockSync();
      passShowTable();
      return;
    }

    if (payload.action === 'PASS_TURN_RESULT') {
      // Once the round has ended, ignore late / re-delivered turn packets — applying one
      // would call passShowTable() and yank the client back to the play screen while the
      // host (which navigates locally) stays on the round-wrap. (Firebase can re-deliver
      // buffered events.) The next round re-enables play via PASS_GAME_START → passShowTable.
      if (passPhase === 'round-over') return;
      // Firebase strips null fields — use ?? null so passTableCombo is never undefined
      passTableCombo       = payload.tableCombo ?? null;
      passTableCards       = payload.tableCards || [];
      passCurrentPlayerIdx = payload.nextPlayerIdx;
      passAbyss            = payload.abyss || [];
      passPassCount[payload.playerIdx] = payload.passStreak || 0;
      // Update hand counts from server truth
      if (payload.handCounts) {
        passHands = passHands.map((h, i) => {
          // Keep own hand cards accurate — server sends counts only; own hand is authoritative
          if (i === mpMyPlayerIdx) return h;
          // Create placeholder arrays for opponents' hand length display
          return Array(payload.handCounts[i]).fill(null);
        });
      }
      // Abyss trick-clear detonation: add our drafted card to our own hand
      if (payload.abyssDraft && payload.abyssDraft.order) {
        payload.abyssDraft.order.forEach((pIdx, i) => {
          if (pIdx === mpMyPlayerIdx && payload.abyssDraft.cards[i]) {
            passHands[mpMyPlayerIdx].push(payload.abyssDraft.cards[i]);
          }
        });
      }
      // Mid-Game Draw: update own hand if we received a card, then re-sort
      if (payload.talonDraws) {
        let ownDrawn = false;
        payload.talonDraws.forEach(draw => {
          if (draw.playerIdx === mpMyPlayerIdx && draw.card) {
            passHands[mpMyPlayerIdx].push(draw.card);
            ownDrawn = true;
          }
        });
        if (ownDrawn) {
          passHands[mpMyPlayerIdx].sort((a, b) => passCardSortKey(a) - passCardSortKey(b));
        }
      }
      // Clear selection from remote play
      if (payload.playerIdx === mpMyPlayerIdx) {
        passSelectedCardIdxs = [];
      }
      // ── History recording (clients only — host records via processPlay/processPass) ──
      if (payload.action_type === 'play') {
        passMandatoryCard = null; // opening lead has landed — clear the round-1 gate on this client
        passRecordPlay(payload.playerIdx, payload.tableCombo, payload.tableCards || []);
      } else if (payload.action_type === 'pass') {
        passRecordPass(payload.playerIdx);
        if (payload.tableCleared && payload.trickWinner != null) {
          passCompleteTrick(payload.trickWinner);
        }
      }
      mpUnlockSync();
      passShowTable();
      return;
    }

    if (payload.action === 'PASS_ABYSS_DRAFT') {
      passAbyss = []; // pool distributed
      // Apply draft cards to own hand, then re-sort
      if (payload.draftCards && payload.draftOrder) {
        let ownDrawn = false;
        payload.draftOrder.forEach((pIdx, i) => {
          if (pIdx === mpMyPlayerIdx && payload.draftCards[i]) {
            passHands[mpMyPlayerIdx].push(payload.draftCards[i]);
            ownDrawn = true;
          }
        });
        if (ownDrawn) {
          passHands[mpMyPlayerIdx].sort((a, b) => passCardSortKey(a) - passCardSortKey(b));
        }
      }
      mpUnlockSync();
      passRenderTable();
      return;
    }

    if (payload.action === 'PASS_ROUND_END') {
      passChips     = payload.newChips || passChips;
      passRoundsWon[payload.winnerIdx]++;
      mpUnlockSync();
      if (payload.matchOver) {
        // Host is authoritative for the final tally; fall back to local only if absent (BUG-02).
        passShowGameover(payload.winnerIdx, payload.newChips, payload.roundsWon || passRoundsWon);
      } else {
        passShowRoundWrap(payload.winnerIdx, payload.chipDeltas, payload.badges, false);
      }
      return;
    }

    if (payload.action === 'PASS_MATCH_DISSOLVED') {
      mpUnlockSync();
      const leaverName = passPlayerNames[payload.leaverIdx] || 'A player';
      resetToLobby();
      // Show inline status banner on the menu after lobby resets
      setTimeout(() => {
        const banner = document.getElementById('pass-menu-status');
        if (banner) {
          banner.textContent = `${leaverName} walked away. Match dissolved.`;
          banner.style.display = 'block';
        }
      }, 200); // brief wait for resetToLobby() to complete navigation
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS UI
// ═══════════════════════════════════════════════════════════════════════════

function passSyncSettingsUI() {
  // Hand Size
  document.querySelectorAll('[data-pass-hand]').forEach(p => {
    p.classList.toggle('pill-active-zinc', parseInt(p.dataset.passHand) === passHandSize);
  });
  // Chip Stack
  document.querySelectorAll('[data-pass-chips]').forEach(p => {
    p.classList.toggle('pill-active-zinc', parseInt(p.dataset.passChips) === passChipStack);
  });
  // Match Duration
  document.querySelectorAll('[data-pass-duration]').forEach(p => {
    p.classList.toggle('pill-active-zinc', p.dataset.passDuration === passMatchDuration);
  });
  // Bomb Strictness
  document.querySelectorAll('[data-pass-bomb]').forEach(p => {
    p.classList.toggle('pill-active-zinc', p.dataset.passBomb === passBombStrictness);
  });
  // Minimum Sequence Length
  document.querySelectorAll('[data-pass-seq]').forEach(p => {
    p.classList.toggle('pill-active-zinc', parseInt(p.dataset.passSeq) === passMinSequenceLength);
  });
  // Jokers
  document.querySelectorAll('[data-pass-jokers]').forEach(p => {
    p.classList.toggle('pill-active-zinc', parseInt(p.dataset.passJokers) === passJokerCount);
  });
  // Toggles
  passSetToggle('btn-pass-mid-draw-toggle', passMidGameDraw);
  passSetToggle('btn-pass-open-climb-toggle', passOpenClimbing);
  passSetToggle('btn-pass-sky-joker-toggle', passSkyJokerVariant);
  passSetToggle('btn-pass-sylly-toggle', passSyllyMode);
}

function passSetToggle(id, isOn) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.textContent = isOn ? 'ON' : 'OFF';
  btn.className   = (isOn ? 'game-toggle-on-zinc' : 'game-toggle-off') + ' shrink-0';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function passShakeButton(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  // Remove after one animation cycle — the global .shake class uses `infinite`
  // so it must be explicitly stopped; without this the button shakes for the entire game.
  clearTimeout(el._shakeTimer);
  el._shakeTimer = setTimeout(() => el.classList.remove('shake'), 600);
}

function passShowError(msg) {
  const el = document.getElementById('pass-table-error');
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = 'block';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.style.display = 'none'; }, 2500);
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM READY — wire all event listeners
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Lobby button ──────────────────────────────────────────────────────────
  document.getElementById('btn-pass').addEventListener('click', () => {
    playLaunch();
    activeGameId = 'pass';
    // Clear status banner on re-entry
    const banner = document.getElementById('pass-menu-status');
    if (banner) banner.style.display = 'none';
    showScreen('screen-pass-menu');
  });

  // ── Game menu ─────────────────────────────────────────────────────────────
  document.getElementById('btn-pass-menu-play').addEventListener('click', () => {
    playLaunch();
    // Dual context: post-lobby → start session; pre-lobby → open mode screen
    if (window.syllyMultiplayerMode !== 'single') {
      passStartSession();
    } else {
      mpShowModeScreen('pass');
    }
  });

  document.getElementById('btn-pass-menu-how-to').addEventListener('click', () => {
    playDone();
    const overlay = document.getElementById('pass-how-to-overlay');
    overlay.querySelector('.overlay-data-inner').scrollTop = 0;
    overlay.style.display = 'flex';
  });

  document.getElementById('btn-pass-menu-settings').addEventListener('click', () => {
    playDone();
    passSyncSettingsUI();
    const overlay = document.getElementById('pass-settings-overlay');
    overlay.querySelector('.overlay-data-inner').scrollTop = 0;
    overlay.style.display = 'flex';
  });

  document.getElementById('btn-pass-menu-back').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── How-to overlay close ──────────────────────────────────────────────────
  document.getElementById('btn-pass-howto-close').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-how-to-overlay').style.display = 'none';
  });

  document.getElementById('btn-pass-howto-close-settings').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-how-to-overlay').style.display = 'none';
  });

  // Also wire how-to button on table screen
  document.getElementById('btn-pass-how-to').addEventListener('click', () => {
    playDone();
    const overlay = document.getElementById('pass-how-to-overlay');
    overlay.querySelector('.overlay-data-inner').scrollTop = 0;
    overlay.style.display = 'flex';
  });

  // ── Settings overlay — close ──────────────────────────────────────────────
  document.getElementById('btn-pass-settings-close').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-settings-overlay').style.display = 'none';
  });

  // ── Settings — pill clicks ────────────────────────────────────────────────
  document.querySelectorAll('[data-pass-hand]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passHandSize = parseInt(btn.dataset.passHand);
      passSyncSettingsUI();
    });
  });

  document.querySelectorAll('[data-pass-chips]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passChipStack = parseInt(btn.dataset.passChips);
      passSyncSettingsUI();
    });
  });

  document.querySelectorAll('[data-pass-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passMatchDuration = btn.dataset.passDuration;
      passSyncSettingsUI();
    });
  });

  document.querySelectorAll('[data-pass-bomb]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passBombStrictness = btn.dataset.passBomb;
      passSyncSettingsUI();
    });
  });

  document.querySelectorAll('[data-pass-seq]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passMinSequenceLength = parseInt(btn.dataset.passSeq);
      passSyncSettingsUI();
    });
  });

  document.querySelectorAll('[data-pass-jokers]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      passJokerCount = parseInt(btn.dataset.passJokers);
      passSyncSettingsUI();
    });
  });

  document.getElementById('btn-pass-mid-draw-toggle').addEventListener('click', () => {
    playPillClick();
    passMidGameDraw = !passMidGameDraw;
    passSyncSettingsUI();
  });

  document.getElementById('btn-pass-open-climb-toggle').addEventListener('click', () => {
    playPillClick();
    passOpenClimbing = !passOpenClimbing;
    passSyncSettingsUI();
  });

  document.getElementById('btn-pass-sky-joker-toggle').addEventListener('click', () => {
    playPillClick();
    passSkyJokerVariant = !passSkyJokerVariant;
    passSyncSettingsUI();
  });

  document.getElementById('btn-pass-sylly-toggle').addEventListener('click', () => {
    passSyllyMode ? playSyllyOff() : playSyllyOn();
    passSyllyMode = !passSyllyMode;
    passSyncSettingsUI();
  });

  // ── Quit overlay ──────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-pass-quit-open').forEach(btn => {
    btn.addEventListener('click', () => {
      playDone();
      document.getElementById('pass-quit-overlay').style.display = 'flex';
    });
  });

  document.getElementById('btn-pass-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-quit-overlay').style.display = 'none';
  });

  document.getElementById('btn-pass-quit-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('pass-quit-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode === 'client') {
      // Tell host we're leaving
      mpSendEnvelope({ type: 'ACTION', payload: {
        action: 'PASS_PLAYER_LEFT',
        playerIdx: mpMyPlayerIdx,
      }});
      resetToLobby();
    } else if (window.syllyMultiplayerMode === 'host') {
      // Broadcast dissolution then clean up
      mpSendEnvelope({ type: 'SYNC', payload: {
        action:    'PASS_MATCH_DISSOLVED',
        leaverIdx: mpMyPlayerIdx,
      }});
      resetToLobby();
    } else {
      showScreen('screen-pass-menu');
    }
  });

  // ── Table screen controls ─────────────────────────────────────────────────
  document.getElementById('btn-pass-play').addEventListener('click', () => {
    passSubmitPlay();
  });

  document.getElementById('btn-pass-pass').addEventListener('click', () => {
    passSubmitPass();
  });

  // ── Table log overlay ──────────────────────────────────────────────────────
  document.getElementById('btn-pass-open-history').addEventListener('click', () => {
    playDone();
    passOpenHistoryOverlay();
  });
  document.getElementById('btn-pass-history-close').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-history-overlay').style.display = 'none';
  });

  // ── Seating confirm (host only) ───────────────────────────────────────────
  document.getElementById('btn-pass-seating-start').addEventListener('click', () => {
    playLaunch();
    passStartGame();
  });

  // ── Round wrap — Next Round (host only) ───────────────────────────────────
  document.getElementById('btn-pass-next-round').addEventListener('click', () => {
    playLaunch();
    // Deal next round and broadcast
    passCurrentPlayerIdx = passRoundWinnerIdx;
    passStartRound();
  });

  // ── Gameover ──────────────────────────────────────────────────────────────
  document.getElementById('btn-pass-go-new').addEventListener('click', () => {
    playDone();
    // Update button label dynamically based on MP mode
    const btn = document.getElementById('btn-pass-new-deal-confirm');
    if (window.syllyMultiplayerMode === 'host') {
      btn.textContent = 'Restart in Lobby';
    } else if (window.syllyMultiplayerMode === 'client') {
      btn.textContent = 'Leave Session';
    } else {
      btn.textContent = 'Deal Me In';
    }
    document.getElementById('pass-new-deal-overlay').style.display = 'flex';
  });

  document.getElementById('btn-pass-new-deal-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('pass-new-deal-overlay').style.display = 'none';
  });

  document.getElementById('btn-pass-new-deal-confirm').addEventListener('click', () => {
    playLaunch();
    document.getElementById('pass-new-deal-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') {
      mpReturnToLobby();
      return;
    }
    // Single device: reset match and deal again
    passMatchRound = 0;
    passChips      = Array(passPlayerCount).fill(passChipStack);
    passRoundsWon  = Array(passPlayerCount).fill(0);
    passMatchOver  = false;
    passStartRound();
  });

  document.getElementById('btn-pass-gameover-exit').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Sound buttons ─────────────────────────────────────────────────────────
  document.querySelectorAll('#screen-pass-menu .btn-open-sound, #screen-pass-seating .btn-open-sound, #screen-pass-table .btn-open-sound, #screen-pass-round-wrap .btn-open-sound, #screen-pass-gameover .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });

});
