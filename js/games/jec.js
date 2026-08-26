// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Just Enough Cooks (jec)
// Mechanic: Social sync — players enter 3 ingredients for a secret food item.
// Scoring: 2-Chef match = jackpot (full Sweet Spot pts); 3 to N−1 = half; all N = token reward; unique = 0.
// Depends on: engine.js (normaliseWord, audio, showScreen, resetToLobby), li5.js (allWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── JEC Settings ──────────────────────────────────────────────────────────────
let jecRounds              = 3;      // Courses: 3 | 5 | 10  (variable name kept — a round is a round)
let jecGoldenScore         = 30;     // The Sweet Spot jackpot: 10 | 20 | 30. Also sets all three bonuses.
let jecTableForOnePenalty  = false;  // opt-in: −5 pts for a Table for One ingredient
let jecCrowdedKitchenTax   = false;  // opt-in: −2 × count for a Too Many Cooks ingredient
let jecSousChefCheck       = true;   // gates the blind Sous Chef's Check sub-state
let jecFusionCuisine       = false;  // Sylly Mode
let jecFoodDifficulty      = 'mixed';// The Menu: 'easy' | 'mixed' | 'hard'
let jecSpecialsBoard       = false;  // allow rerolling the Order (and its Instruction) before prep
let jecSpecialInstructions = false;  // modify Today's Order with one Special Instruction

// ── JEC State ─────────────────────────────────────────────────────────────────
let jecPlayerCount   = 4;
let jecPlayerNames   = [];
let jecRound         = 0;
let jecScores        = [];
let jecCurrentWord   = '';
let jecCurrentWord2  = '';    // Fusion Cuisine's second Order; '' otherwise
let jecInstruction   = '';    // the Special Instruction for this Order; '' when OFF
let jecInstructionDeck = [];  // shuffled JEC_INSTRUCTIONS, popped per Order
let jecWordPool      = [];
let jecInputs        = [];
let jecSignatures    = [];    // [playerIdx] → nominated ingredient index 0/1/2; −1 = unset
let jecCrutches      = [];    // [playerIdx] → the called Crutch word; '' = none
let jecFusionNames   = [];    // [playerIdx] → fused-dish name; '' = none (Fusion only)
let jecNameVotes     = [];    // [playerIdx] → voted-for playerIdx; −1 = not yet voted
let jecNameWinners   = [];    // playerIdx[] — every tied top-voted name
let jecWordFrequency = {};    // normalised word → count
let jecDisplayWords  = {};    // normalised word → first raw input for display
let jecMergeMap      = {};    // normalised word → merged-into target word
let jecRoundLog      = [];    // [{ order, order2, instruction, scores }]
let jecCurrentPlayerIdx  = 0; // which Chef is currently prepping (Pass-the-Phone)
let jecVoteCurrentIdx    = 0; // which Chef is currently voting (Pass-the-Phone)
let jecSiftingSubState   = 'check';  // 'check' (blind merge) | 'tasting' (scored reveal)
let jecOversightSelected = null;
let jecOversightPendingA = null;
let jecOversightPendingB = null;
let jecPrepSignatureIdx  = -1;       // the tap-selected Signature on the live prep screen
let jecMpReadyCheck      = [];       // Lobby Mode: which Chefs have submitted prep
let jecMpVoteCheck       = [];       // Lobby Mode: which Chefs have submitted a name vote

// ── Firebase wire normalisers ────────────────────────────────────────────────
// Firebase RTDB stores no null, no {} and no []: a key holding any of them is
// DELETED, and the reader gets undefined. An array whose entries are all null
// vanishes whole; a half-dense one comes back as an OBJECT keyed by index, not
// an array. false, 0 and '' are legitimate stored values and are never at risk —
// only emptiness is erased.
//
// Which JEC reset values are actually at risk, verified against the wire:
//   SAFE    all-'' (jecCrutches, jecFusionNames), all-−1 (jecSignatures,
//           jecNameVotes) — '' and −1 are scalars, so the array is not empty and
//           nothing is dropped.
//   ERASED  [] and {} (an EMPTY jecCrutches, jecNameWinners, jecMergeMap) — the
//           whole key is deleted and the reader gets undefined.
//   MANGLED a half-dense array — it returns as an OBJECT keyed by index.
//
// So the accumulator rule still applies, but the hazard is emptiness and sparsity,
// not the reset value itself. Both halves are needed — send the reset value
// explicitly AND rebuild it on receipt — because a normaliser is also what
// guarantees LENGTH N on the client, which a raw assignment never does. Never
// assign a raw p.x collection field.
function jecWireArr(v, n, fill) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = v ? v[i] : undefined;
    out[i] = (x === undefined || x === null) ? fill : x;
  }
  return out;
}
function jecWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]);
  return [];
}
function jecWireObj(v) { return (v && typeof v === 'object') ? v : {}; }

// ── JEC Special Instructions ──────────────────────────────────────────────────
// A second deck that modifies Today's Order: "Pizza — …at 3am". One instruction
// per Order; they never stack with each other.
//
// SELECTION CRITERION for any future addition: the instruction must CHANGE THE
// INGREDIENT LIST. A line that is merely funny but leaves the same three answers
// correct does not qualify — "for a picnic" and "for your fussiest mate" were
// drafted and cut on exactly this test.
//
// The real motivation is accessibility, not variety. The repetition complaint is
// only half a vocabulary problem: an instruction gives a Chef an ANGLE to think
// from rather than requiring recipe knowledge. "$5 budget" is answerable by
// anyone. Twenty instructions × ~100 food words ≈ 2,000 prompts.
const JEC_INSTRUCTIONS = Object.freeze([
  // Budget & constraint
  '…on a $5 budget',
  "…using only what's at the petrol station",
  '…in one pan, ten minutes flat',
  '…camping, no power',
  // Occasion
  '…for family dinner',
  '…to impress the in-laws',
  '…as takeaway, before a night out',
  '…for a barbecue in 38° heat',
  '…in a school lunchbox',
  '…to feed twenty people',
  // Standard
  '…going for a Michelin star',
  '…prepared by a five-year-old',
  '…at 3am',
  '…as a hangover cure',
  // Chaos
  "…but it's entirely beige",
  '…but it has to be green',
  '…but make it breakfast',
  '…but make it dessert',
  '…air fryer only',
  '…spicy enough to hurt',
]);

// Pops one instruction, reshuffling a fresh deck when exhausted so a game never
// repeats until it has seen all twenty.
function jecDrawInstruction() {
  if (!jecSpecialInstructions) { jecInstruction = ''; return; }
  if (!jecInstructionDeck.length) jecInstructionDeck = shuffle([...JEC_INSTRUCTIONS]);
  jecInstruction = jecInstructionDeck.pop();
}

// Draws Today's Order — two of them in Fusion Cuisine. Refills the pool from the
// active source (Secret Mode expansion words, else the shared food category) when
// it runs dry. Centralised so jecStartRound and the Specials Board reroll cannot
// drift apart.
function jecRefillPool() {
  if (isSecretMode && secretWords && secretWords.length) {
    const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
    jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
  } else {
    jecWordPool = jecBuildFoodPool(allWords);
  }
}

function jecDrawOrders() {
  if (!jecWordPool.length) jecRefillPool();
  jecCurrentWord = jecWordPool.pop();
  if (!jecFusionCuisine) { jecCurrentWord2 = ''; return; }
  if (!jecWordPool.length) jecRefillPool();
  jecCurrentWord2 = jecWordPool.pop();
  // A pool of one would hand back the same word twice, and "Pizza + Pizza" is
  // not a fusion. Refill and take a different one.
  if (jecCurrentWord2 === jecCurrentWord) {
    jecRefillPool();
    jecCurrentWord2 = jecWordPool.filter(w => w !== jecCurrentWord).pop() || jecCurrentWord2;
  }
}

// ── JEC Help tip overlay ──────────────────────────────────────────────────────
function jecShowHelpTip(emoji, heading, tip) {
  document.getElementById('jec-help-tip-emoji').textContent   = emoji;
  document.getElementById('jec-help-tip-heading').textContent = heading;
  document.getElementById('jec-help-tip-text').textContent    = tip;
  document.getElementById('jec-help-tip-overlay').style.display = 'flex';
}

// ── Lobby → JEC Menu ──────────────────────────────────────────────────────────
document.getElementById('btn-jec').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'jec';
  showScreen('screen-jec-menu');
});

// ── JEC Menu ──────────────────────────────────────────────────────────────────
document.getElementById('btn-jec-menu-play').addEventListener('click', () => {
  playLaunch();
  mpShowModeScreen('jec');
});

document.getElementById('btn-jec-menu-how-to').addEventListener('click', () => {
  playPillClick();
  const el = document.getElementById('jec-how-to-overlay');
  const inner = el.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  el.style.display = 'flex';
});

document.getElementById('btn-jec-menu-settings').addEventListener('click', () => {
  playPillClick();
  const el = document.getElementById('jec-settings-overlay');
  const body = el.querySelector('.overlay-data-inner');
  if (body) body.scrollTop = 0;
  el.style.display = 'flex';
});

document.getElementById('btn-jec-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── JEC How to Play overlay ───────────────────────────────────────────────────
document.getElementById('btn-jec-how-to-close').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-how-to-overlay').style.display = 'none';
});

// ── JEC Settings (The Pantry Cabinet) ────────────────────────────────────────
document.querySelectorAll('[data-jec-rounds]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecRounds = parseInt(btn.dataset.jecRounds);
    document.querySelectorAll('[data-jec-rounds]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.jecRounds) === jecRounds ? ' pill-active-amber' : ''}`;
    });
  });
});

document.querySelectorAll('[data-jec-rotten]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecTableForOnePenalty = btn.dataset.jecRotten === 'on';
    document.querySelectorAll('[data-jec-rotten]').forEach(b => {
      b.className = `pill${b.dataset.jecRotten === btn.dataset.jecRotten ? ' pill-active-amber' : ''}`;
    });
    document.getElementById('jec-rotten-desc').style.visibility = jecTableForOnePenalty ? 'visible' : 'hidden';
  });
});

document.querySelectorAll('[data-jec-spoilt]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecCrowdedKitchenTax = btn.dataset.jecSpoilt === 'on';
    document.querySelectorAll('[data-jec-spoilt]').forEach(b => {
      b.className = `pill${b.dataset.jecSpoilt === btn.dataset.jecSpoilt ? ' pill-active-amber' : ''}`;
    });
    document.getElementById('jec-spoilt-desc').style.visibility = jecCrowdedKitchenTax ? 'visible' : 'hidden';
  });
});

document.getElementById('btn-jec-oversight-toggle').addEventListener('click', () => {
  playPillClick();
  jecSousChefCheck = !jecSousChefCheck;
  const btn = document.getElementById('btn-jec-oversight-toggle');
  btn.textContent = jecSousChefCheck ? 'ON' : 'OFF';
  btn.className   = jecSousChefCheck ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
});

document.getElementById('btn-jec-specials-toggle').addEventListener('click', () => {
  playPillClick();
  jecSpecialsBoard = !jecSpecialsBoard;
  const btn = document.getElementById('btn-jec-specials-toggle');
  btn.textContent = jecSpecialsBoard ? 'ON' : 'OFF';
  btn.className   = jecSpecialsBoard ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
});

document.getElementById('btn-jec-sylly-toggle').addEventListener('click', () => {
  jecFusionCuisine = !jecFusionCuisine;
  const btn = document.getElementById('btn-jec-sylly-toggle');
  btn.textContent = jecFusionCuisine ? 'ON' : 'OFF';
  btn.className   = jecFusionCuisine ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
  jecFusionCuisine ? playSyllyOn() : playSyllyOff();
});

document.querySelectorAll('[data-jec-golden]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecGoldenScore = parseInt(btn.dataset.jecGolden);
    document.querySelectorAll('[data-jec-golden]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.jecGolden) === jecGoldenScore ? ' pill-active-amber' : ''}`;
    });
  });
});

// Dynamic value line (ui-style.md § Settings Card Standard, DD-13) — the pill carries the
// thematic name only; this says what it actually means for the word pool.
function jecUpdateFoodDifficultyVal() {
  const el = document.getElementById('jec-val-difficulty');
  if (!el) return;
  el.textContent = { easy:  'Home Cook uses only easy words.',
                     mixed: 'Sous Chef mixes easy and medium words.',
                     hard:  'Head Chef uses only the hardest words.' }[jecFoodDifficulty] || '';
}
jecUpdateFoodDifficultyVal();

document.querySelectorAll('[data-jec-food-difficulty]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecFoodDifficulty = btn.dataset.jecFoodDifficulty;
    document.querySelectorAll('[data-jec-food-difficulty]').forEach(b => {
      b.className = `pill${b.dataset.jecFoodDifficulty === jecFoodDifficulty ? ' pill-active-amber' : ''}`;
    });
    jecUpdateFoodDifficultyVal();
  });
});

document.getElementById('btn-jec-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-settings-overlay').style.display = 'none';
});

// ── JEC Roster (Kitchen Roster) ───────────────────────────────────────────────
function jecInitRoster() {
  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: player count and names come from lobby slots
    jecPlayerCount = mpPlayerSlots.length;
    jecPlayerNames = mpPlayerSlots.map(p => p.nickname);
    jecStartGame();
    return;
  }
  document.querySelectorAll('[data-jec-player-count]').forEach(b => {
    b.className = `pill${parseInt(b.dataset.jecPlayerCount) === jecPlayerCount ? ' pill-active-amber' : ''}`;
  });
  jecUpdatePlayerFields();
}

document.querySelectorAll('[data-jec-player-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecPlayerCount = parseInt(btn.dataset.jecPlayerCount);
    document.querySelectorAll('[data-jec-player-count]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.jecPlayerCount) === jecPlayerCount ? ' pill-active-amber' : ''}`;
    });
    jecUpdatePlayerFields();
  });
});

function jecUpdatePlayerFields() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`jec-player-${i}`);
    if (el) el.style.display = i <= jecPlayerCount ? '' : 'none';
  }
}

document.getElementById('btn-jec-roster-exit').addEventListener('click', () => {
  playExit();
  showScreen('screen-jec-menu');
});

document.getElementById('btn-jec-roster-confirm').addEventListener('click', () => {
  jecPlayerNames = [];
  for (let i = 1; i <= jecPlayerCount; i++) {
    const val = (document.getElementById(`jec-player-${i}`)?.value || '').trim();
    jecPlayerNames.push(val || `Chef ${i}`);
  }
  playLaunch();
  jecStartGame();
});

// ── JEC Word pool builder ─────────────────────────────────────────────────────
function jecBuildFoodPool(source) {
  const filtered = source.filter(w => {
    if (w.category !== 'food') return false;
    if (jecFoodDifficulty === 'easy') return w.difficulty === 1;
    if (jecFoodDifficulty === 'hard') return w.difficulty === 3;
    return w.difficulty <= 2; // 'mixed'
  });
  return shuffle((filtered.length ? filtered : source.filter(w => w.category === 'food')).map(w => w.word));
}

// ── JEC Game start ────────────────────────────────────────────────────────────
async function jecStartGame() {
  await loadWords();
  jecWordPool = jecBuildFoodPool(allWords);
  jecInstructionDeck = [];
  jecRound    = 0;
  jecScores   = Array(jecPlayerCount).fill(0);
  jecRoundLog = [];
  jecApplyExpansionOverrides();
  jecStartRound();
}

function jecStartRound() {
  jecRound++;
  jecDrawOrders();
  jecDrawInstruction();
  jecCurrentPlayerIdx = 0;
  jecInputs           = Array.from({ length: jecPlayerCount }, () => ['', '', '']);
  jecMpReadyCheck     = Array(jecPlayerCount).fill(false);
  jecSignatures  = Array(jecPlayerCount).fill(-1);
  jecCrutches    = Array(jecPlayerCount).fill('');
  jecFusionNames = Array(jecPlayerCount).fill('');
  jecNameVotes   = Array(jecPlayerCount).fill(-1);
  jecNameWinners = [];
  jecMpVoteCheck = Array(jecPlayerCount).fill(false);

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast the food word so all devices show the same order screen
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_ORDER',
      word:  jecCurrentWord,
      word2: jecCurrentWord2 || '',       // '' not null — null is erased in flight
      instruction: jecInstruction || '',  // same
      round: jecRound, rounds: jecRounds,
    }});
  }

  jecShowOrderScreen();
}

function jecShowOrderScreen() {
  document.getElementById('jec-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-order-round').textContent = `Round ${jecRound} of ${jecRounds}`;
  document.getElementById('btn-jec-reroll').style.display = jecSpecialsBoard ? '' : 'none';
  showScreen('screen-jec-order');
}

function jecStartPlayerPrep(idx) {
  const name = jecPlayerNames[idx];
  document.getElementById('jec-prep-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-prep-chef-name').textContent   = `${name}'s Prep 🧑‍🍳`;
  document.getElementById('jec-prep-round-label').textContent = `Round ${jecRound} of ${jecRounds}`;
  document.getElementById('jec-prep-ingredient-1').value = '';
  document.getElementById('jec-prep-ingredient-2').value = '';
  document.getElementById('jec-prep-ingredient-3').value = '';
  document.getElementById('jec-prep-error').textContent = '';
  const ing1       = document.getElementById('jec-prep-ingredient-1');
  const knSection  = document.getElementById('jec-prep-kn-section');
  const knSubtitle = document.getElementById('jec-prep-kn-subtitle');
  if (jecFusionCuisine) {
    ing1.className   = 'w-full rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-amber-500 focus:outline-none transition-colors';
    ing1.placeholder = '🌟 Signature Dish';
    document.getElementById('jec-prep-poison').value = '';
    knSection.style.display  = '';
    knSubtitle.style.display = '';
  } else {
    ing1.className   = 'w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-amber-400 focus:outline-none transition-colors';
    ing1.placeholder = 'Ingredient 1';
    knSection.style.display  = 'none';
    knSubtitle.style.display = 'none';
  }
  document.getElementById('jec-prep-phase').style.display = '';
  document.getElementById('jec-pass-gate').style.display  = 'none';
  showScreen('screen-jec-prep');
}

function jecSubmitIngredients() {
  const v1  = document.getElementById('jec-prep-ingredient-1').value.trim();
  const v2  = document.getElementById('jec-prep-ingredient-2').value.trim();
  const v3  = document.getElementById('jec-prep-ingredient-3').value.trim();
  const err = document.getElementById('jec-prep-error');
  if (!v1 || !v2 || !v3) {
    err.textContent = 'Add all 3 ingredients before serving!';
    return;
  }
  const norms = [v1, v2, v3].map(v => normaliseWord(v));
  if (new Set(norms).size < 3) {
    err.textContent = "You've already prepped that! Try a different ingredient. 🤔";
    return;
  }
  jecInputs[jecCurrentPlayerIdx] = [v1, v2, v3];

  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: freeze local prep screen
    mpLockSync();
    document.getElementById('btn-jec-serve').classList.add('opacity-50', 'pointer-events-none');
    document.getElementById('jec-prep-error').textContent = 'Ingredients submitted — waiting for the other chefs…';
    if (window.syllyMultiplayerMode === 'host') {
      // Host processes directly — self-sent envelopes are deduplicated/ignored by engine-multiplayer.js
      jecInputs[mpMyPlayerIdx] = [v1, v2, v3];
      jecMpReadyCheck[mpMyPlayerIdx] = true;
      if (jecMpReadyCheck.every(Boolean)) jecHostResolveSifting();
    } else {
      mpSendEnvelope({ type: 'ACTION', payload: {
        action:      'JEC_PREP_SUBMIT',
        playerIdx:   mpMyPlayerIdx,
        ingredients: [v1, v2, v3],
      }});
    }
    return;
  }

  const nextIdx = jecCurrentPlayerIdx + 1;
  if (nextIdx < jecPlayerCount) {
    document.getElementById('jec-pass-gate-next-name').textContent = jecPlayerNames[nextIdx];
    document.getElementById('jec-prep-phase').style.display = 'none';
    document.getElementById('jec-pass-gate').style.display  = '';
    jecCurrentPlayerIdx = nextIdx;
  } else {
    jecAfterAllPlayersSubmit();
  }
}

function jecAfterAllPlayersSubmit() {
  jecBuildFrequency();
  jecStartSifting();
}

// ── JEC Sifting ───────────────────────────────────────────────────────────────
function jecBuildFrequency() {
  jecWordFrequency = {};
  jecDisplayWords  = {};
  jecMergeMap      = {};
  jecOversightSelected = null;
  // ONLY jecInputs. The Crutch is a prediction, not a submission — a Crutch that
  // counted would let a Chef manufacture a Crowd-Pleaser for themselves, and at a
  // 3-player table it is the difference between a jackpot and a token for every
  // Chef who wrote that word. Never add another source to this loop.
  jecInputs.flat().forEach(raw => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const norm = normaliseWord(trimmed);
    jecWordFrequency[norm] = (jecWordFrequency[norm] || 0) + 1;
    if (!jecDisplayWords[norm]) jecDisplayWords[norm] = trimmed;
  });
}

// One badge object per count. The four keys map 1:1 to the four named badges,
// which is what lets the Signature double test the GOLDEN RANGE rather than
// "any positive score" — the shipped code doubled the Too Many Cooks token too,
// against what the identity doc has always described.
function jecBadge(count, N) {
  if (count <= 1)  return { key: 'alone',   label: 'Table for One 🍽️', cls: 'bg-stone-50 text-stone-400' };
  if (count === 2) return { key: 'kiss',    label: "Chef's Kiss ✨",    cls: 'bg-amber-100 text-amber-700' };
  if (count < N)   return { key: 'crowd',   label: 'Crowd-Pleaser 👌',  cls: 'bg-amber-50 text-amber-600' };
  return             { key: 'toomany', label: 'Too Many Cooks! 🍲', cls: 'bg-stone-100 text-stone-500' };
}

// The Golden range = Chef's Kiss + Crowd-Pleaser. The Signature double applies
// here and nowhere else.
function jecIsGolden(key) { return key === 'kiss' || key === 'crowd'; }

// Tiered positive rewards — a 2-Chef match is the jackpot.
function jecCalcPoints(count, N) {
  if (count <= 1)  return 0;
  if (count === 2) return jecGoldenScore;
  if (count < N)   return Math.round(jecGoldenScore * 0.5);
  return             Math.round(jecGoldenScore * 0.15);
}

// Every flat bonus in the game is this one number — half a jackpot. Called It!
// and On the Menu! both pay it, so the game carries one bonus magnitude rather
// than three magic numbers.
function jecBonusValue() { return Math.round(jecGoldenScore * 0.5); }

// Normalise, then walk the merge map to the surviving word. Shared by ingredient
// scoring AND Crutch resolution — a Sous Chef merge must apply to both.
function jecResolveNorm(raw) {
  let norm  = normaliseWord(String(raw || '').trim());
  let steps = 0;
  while (jecMergeMap[norm] && steps < 10) { norm = jecMergeMap[norm]; steps++; }
  return norm;
}

// The round's highest ingredient count. 0 when nothing was written.
function jecTopCount() {
  const counts = Object.values(jecWordFrequency);
  return counts.length ? Math.max(...counts) : 0;
}

// A Crutch hits when the called word is at the round's TOP count AND that count
// is at least 3. "Top count, >= 3 Chefs" has exactly one right-ish answer at any
// player count, where a literal all-N target would be common at 3 Chefs and rare
// at 6. It also gives Too Many Cooks a purpose it has never had: one Chef is
// hunting the very thing everyone else is avoiding.
function jecCrutchHit(p) {
  const raw = (jecCrutches[p] || '').trim();
  if (!raw) return false;
  const top = jecTopCount();
  if (top < 3) return false;
  return (jecWordFrequency[jecResolveNorm(raw)] || 0) === top;
}

// Called once every Chef has submitted, from BOTH the host's own submit path and
// the JEC_PREP_SUBMIT handler. One function, so the two cannot drift — that shape
// is what produced bug J1.
function jecHostResolveSifting() {
  jecBuildFrequency();
  mpSendEnvelope({ type: 'SYNC', payload: {
    action:           'JEC_SIFTING',
    jecInputs:        jecInputs.map(a => [...a]),
    jecWordFrequency: { ...jecWordFrequency },
    jecDisplayWords:  { ...jecDisplayWords },
    jecMergeMap:      { ...jecMergeMap },
    // Every accumulator at its reset value, explicitly. All-'' and all--1 are the
    // exact shapes Firebase erases; sending them is half the fix, rebuilding them
    // on receipt is the other half.
    jecCrutches:      [...jecCrutches],
    jecSignatures:    [...jecSignatures],
    jecFusionNames:   [...jecFusionNames],
  }});
  mpUnlockSync();
  jecStartSifting();
}

function jecStartSifting() {
  document.getElementById('jec-sifting-order').textContent       = jecCurrentWord.toUpperCase();
  document.getElementById('jec-sifting-round-label').textContent = `Round ${jecRound} of ${jecRounds}`;
  document.getElementById('jec-oversight-hint').style.display    = jecCanOversee() ? '' : 'none';
  document.getElementById('jec-sifting-recipe-label').textContent =
    `Today's Recipe: ${jecCurrentWord.charAt(0).toUpperCase() + jecCurrentWord.slice(1)}`;
  jecRenderSifting();
  jecSetAdvanceCta('btn-jec-sifting-proceed', 'The Taste Test! 🍽️');
  showScreen('screen-jec-sifting');
}

function jecRenderSifting() {
  const list    = document.getElementById('jec-sifting-list');
  list.innerHTML = '';
  const entries = Object.entries(jecWordFrequency).sort((a, b) => b[1] - a[1]);
  entries.forEach(([norm, count]) => {
    const badge   = jecBadge(count, jecPlayerCount);
    const raw     = jecDisplayWords[norm] || norm;
    const display = raw.charAt(0).toUpperCase() + raw.slice(1);
    const chefs   = count === 1 ? '1 Chef' : `${count} Chefs`;
    const badgeClass = badge.cls;
    const badgeText  = badge.label;
    const card = document.createElement('div');
    card.className    = `jec-sift-card bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between${jecCanOversee() ? ' cursor-pointer active:scale-95 transition-transform duration-100' : ''}`;
    card.dataset.norm = norm;
    card.innerHTML    = `
      <div>
        <p class="font-semibold text-stone-800">${display}</p>
        <p class="text-xs text-stone-400 mt-0.5">${chefs}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">${badgeText}</span>`;
    if (jecCanOversee()) card.addEventListener('click', () => jecHandleOversightTap(norm));
    list.appendChild(card);
  });
}

function jecClearOversightHighlights() {
  document.querySelectorAll('.jec-sift-card').forEach(c => c.classList.remove('ring-2', 'ring-amber-400'));
}

// Sous Chef Oversight is interactive only on the host (and single-device). In Lobby
// Mode clients render a read-only sifting board — merges arrive via the JEC_MERGE SYNC,
// never initiated locally. A client merging would silently diverge its board from the
// table without sending any ACTION. (J3)
function jecCanOversee() {
  return jecSousChefCheck && window.syllyMultiplayerMode !== 'client';
}

// Host-gates a round-advance CTA in Lobby Mode: clients render a disabled
// "Waiting for the Head Chef…" label and cannot run scoring/round-advance
// locally; the Host (and single-device) sees the live label. (J4)
function jecSetAdvanceCta(btnId, liveLabel) {
  const btn = document.getElementById(btnId);
  if (window.syllyMultiplayerMode === 'client') {
    btn.disabled      = true;
    btn.textContent   = 'Waiting for the Head Chef…';
    btn.style.opacity = '0.5';
  } else {
    btn.disabled      = false;
    btn.textContent   = liveLabel;
    btn.style.opacity = '';
  }
}

function jecHandleOversightTap(norm) {
  if (window.syllyMultiplayerMode === 'client') return; // J3: clients never merge
  if (jecOversightSelected === null) {
    jecOversightSelected = norm;
    document.querySelectorAll('.jec-sift-card').forEach(c => {
      c.classList.toggle('ring-2',         c.dataset.norm === norm);
      c.classList.toggle('ring-amber-400', c.dataset.norm === norm);
    });
    document.querySelectorAll('.jec-poison-chip').forEach(c => {
      c.classList.toggle('ring-2',          c.dataset.norm === norm);
      c.classList.toggle('ring-purple-500', c.dataset.norm === norm);
    });
  } else if (jecOversightSelected === norm) {
    jecOversightSelected = null;
    jecClearOversightHighlights();
  } else {
    jecOversightPendingA = jecOversightSelected;
    jecOversightPendingB = norm;
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const wA  = cap(jecDisplayWords[jecOversightSelected] || jecOversightSelected);
    const wB  = cap(jecDisplayWords[norm] || norm);
    document.getElementById('jec-oversight-words').textContent = `${wA} / ${wB}`;
    document.getElementById('jec-oversight-overlay').style.display = 'flex';
    jecOversightSelected = null;
    jecClearOversightHighlights();
  }
}

function jecApplyMerge(normA, normB) {
  if (normA === normB) return;
  // If normA is not an ingredient but normB is, swap so the ingredient survives.
  if (!jecWordFrequency[normA] && jecWordFrequency[normB]) { [normA, normB] = [normB, normA]; }
  // Neither is in the pool — both are Crutch-only words. Record the mapping so a
  // Crutch calling the losing spelling still resolves, but touch no counts.
  if (!jecWordFrequency[normA] && !jecWordFrequency[normB]) { jecMergeMap[normB] = normA; return; }
  jecWordFrequency[normA] = (jecWordFrequency[normA] || 0) + (jecWordFrequency[normB] || 0);
  jecMergeMap[normB]      = normA;
  jecDisplayWords[normA]  = `${jecDisplayWords[normA] || normA} / ${jecDisplayWords[normB] || normB}`;
  delete jecWordFrequency[normB];
  delete jecDisplayWords[normB];

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast updated sifting state so all clients re-render
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_MERGE',
      jecWordFrequency: {...jecWordFrequency},
      jecDisplayWords:  {...jecDisplayWords},
      jecMergeMap:      {...jecMergeMap},
    }});
  }
}

// Tallies the Name the Dish ballot. Ties are NOT broken — every tied name takes
// the full bonus, because a tie means two names were both funny and a runoff
// costs another pass for no gain.
function jecTallyNameVotes() {
  const votes = Array(jecPlayerCount).fill(0);
  if (!jecFusionCuisine) { jecNameWinners = []; return { votes, winners: [], bonus: jecBonusValue() }; }
  for (let p = 0; p < jecPlayerCount; p++) {
    const t = jecNameVotes[p];
    if (t === undefined || t === null || t < 0 || t >= jecPlayerCount) continue;
    if (t === p) continue;                                   // no self-votes
    if (!(jecFusionNames[t] || '').trim()) continue;          // not on the ballot
    votes[t]++;
  }
  const top = Math.max(0, ...votes);
  jecNameWinners = top > 0 ? votes.map((v, i) => (v === top ? i : -1)).filter(i => i >= 0) : [];
  return { votes, winners: [...jecNameWinners], bonus: jecBonusValue() };
}

// ── JEC Round scoring ─────────────────────────────────────────────────────────
// Returns { roundScores, bonus } — bonus[p] = { signature, crutch, name }, the
// per-Chef breakdown The Tally renders and JEC_TALLY carries to clients.
// The crutch and name fields stay 0 until Tasks 3 and 5 fill them.
function jecCalcRoundScores() {
  const roundScores = Array(jecPlayerCount).fill(0);
  const bonus = Array.from({ length: jecPlayerCount },
    () => ({ signature: 0, crutch: 0, name: 0 }));

  for (let p = 0; p < jecPlayerCount; p++) {
    for (let j = 0; j < jecInputs[p].length; j++) {
      const norm  = jecResolveNorm(jecInputs[p][j]);
      const count = jecWordFrequency[norm] || 0;
      const badge = jecBadge(count, jecPlayerCount);

      // Opt-in penalties REPLACE the tier reward for that count; they never stack.
      if (badge.key === 'alone' && jecTableForOnePenalty)   { roundScores[p] -= 5; continue; }
      if (badge.key === 'toomany' && jecCrowdedKitchenTax)  { roundScores[p] -= count * 2; continue; }

      const pts = jecCalcPoints(count, jecPlayerCount);
      if (pts <= 0) continue;
      roundScores[p] += pts;
      // The Signature double — GOLDEN RANGE ONLY. A nominated ingredient landing
      // Table for One or Too Many Cooks scores its normal value; the loss is the
      // double you did not get, not an extra penalty.
      if (jecSignatures[p] === j && jecIsGolden(badge.key)) {
        roundScores[p]     += pts;
        bonus[p].signature += pts;
      }
    }

    if (jecCrutchHit(p)) {
      const b = jecBonusValue();
      roundScores[p]  += b;
      bonus[p].crutch  = b;
    }

    if (jecFusionCuisine && jecNameWinners.includes(p)) {
      const b = jecBonusValue();
      roundScores[p] += b;
      bonus[p].name   = b;
    }
  }

  jecRoundLog.push({
    order: jecCurrentWord, order2: jecCurrentWord2,
    instruction: jecInstruction, scores: [...roundScores],
  });
  for (let p = 0; p < jecPlayerCount; p++) jecScores[p] += roundScores[p];
  return { roundScores, bonus };
}

// ── JEC Tally ─────────────────────────────────────────────────────────────────
function jecRenderTally(roundScores) {
  document.getElementById('jec-tally-round-label').textContent = `Round ${jecRound} of ${jecRounds}`;
  const best = Math.max(...roundScores);
  const feedback = best >= jecGoldenScore * 3
    ? "Head Chef Status: Absolutely Cookin'! 🔥"
    : best >= jecGoldenScore * 2
    ? 'Five-star effort right there! ⭐'
    : 'Maybe stick to toast next time. 🍞';
  document.getElementById('jec-tally-feedback').textContent = feedback;
  const ranked = jecPlayerNames
    .map((name, i) => ({ name, rs: roundScores[i], total: jecScores[i] }))
    .sort((a, b) => b.rs - a.rs);
  const list = document.getElementById('jec-tally-list');
  list.innerHTML = '';
  ranked.forEach(({ name, rs, total }) => {
    const rsText   = rs > 0 ? `+${rs}` : `${rs}`;
    const rsColour = rs > 0 ? 'text-amber-600' : rs < 0 ? 'text-red-500' : 'text-stone-400';
    const card     = document.createElement('div');
    card.className  = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    card.innerHTML  = `
      <div>
        <p class="font-semibold text-stone-800">${name}</p>
        <p class="text-xs text-stone-400 mt-0.5">Total: ${total} pts</p>
      </div>
      <span class="text-xl font-bold ${rsColour}">${rsText} pts</span>`;
    list.appendChild(card);
  });
  jecSetAdvanceCta('btn-jec-tally-next',
    jecRound < jecRounds ? 'Next Course 🍽️' : 'Final Wash-up 🏆');
}

function jecRenderCookBook() {
  const container = document.getElementById('jec-washup-cookbook');
  container.innerHTML = '';
  jecRoundLog.forEach((entry, i) => {
    const ranked = jecPlayerNames
      .map((name, p) => ({ name, score: entry.scores[p] }))
      .sort((a, b) => b.score - a.score);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-2';
    const rows = ranked.map(({ name, score }) => {
      const scoreText   = score > 0 ? `+${score}` : `${score}`;
      const scoreColour = score > 0 ? 'text-amber-600' : score < 0 ? 'text-red-500' : 'text-stone-400';
      return `<div class="flex justify-between items-center">
        <span class="text-stone-600 text-sm">${name}</span>
        <span class="text-sm font-bold ${scoreColour}">${scoreText}</span>
      </div>`;
    }).join('');
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-stone-400">Round ${i + 1}</p>
        <p class="text-sm font-bold text-amber-600 uppercase tracking-wide">${entry.order}</p>
      </div>
      <div class="flex flex-col gap-1">${rows}</div>`;
    container.appendChild(card);
  });
}

function jecShowWashup() {
  const ranked = jecPlayerNames
    .map((name, i) => ({ name, score: jecScores[i] }))
    .sort((a, b) => b.score - a.score);
  const topScore = ranked[0].score;
  const winners  = ranked.filter(p => p.score === topScore);
  document.getElementById('jec-washup-subtitle').textContent =
    winners.length > 1 ? 'A dead heat in the kitchen!' : `${winners[0].name} wins the kitchen! 🎉`;
  const list = document.getElementById('jec-washup-list');
  list.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  ranked.forEach((p, i) => {
    const isFirst = p.score === topScore;
    const medal = isFirst ? '🥇' : (medals[i] || `${i + 1}.`);
    const card = document.createElement('div');
    card.className = `bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3${isFirst ? ' border-2 border-amber-400' : ''}`;
    card.innerHTML = `
      <span class="text-2xl w-8 text-center">${medal}</span>
      <div class="flex-1">
        <p class="font-semibold text-stone-800">${p.name}</p>
      </div>
      <span class="text-xl font-bold ${isFirst ? 'text-amber-600' : 'text-stone-400'}">${p.score} pts</span>`;
    list.appendChild(card);
  });
  jecRenderCookBook();
  showScreen('screen-jec-washup');
}

function jecResetForNewGame() {
  jecRound            = 0;
  jecScores           = [];
  jecWordPool         = [];
  jecInputs           = [];
  jecSignatures       = [];
  jecCrutches         = [];
  jecFusionNames      = [];
  jecNameVotes        = [];
  jecNameWinners      = [];
  jecCurrentWord2     = '';
  jecInstruction      = '';
  jecWordFrequency    = {};
  jecDisplayWords     = {};
  jecMergeMap         = {};
  jecRoundLog         = [];
  jecCurrentPlayerIdx  = 0;
  jecVoteCurrentIdx    = 0;
  jecSiftingSubState   = 'check';
  jecPrepSignatureIdx  = -1;
  jecOversightSelected = null;
  jecOversightPendingA = null;
  jecOversightPendingB = null;
  jecMpVoteCheck       = [];
  showScreen('screen-jec-menu');
}

// ── Washup screen listeners ───────────────────────────────────────────────────
document.getElementById('btn-jec-new-game').addEventListener('click', () => {
  playPillClick();
  const confirmBtn = document.getElementById('btn-jec-new-shift-start');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'Yeah, fire it up!';
  }
  document.getElementById('jec-new-shift-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-washup-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

document.getElementById('btn-jec-washup-exit').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

document.getElementById('btn-jec-new-shift-start').addEventListener('click', () => {
  playLaunch();
  document.getElementById('jec-new-shift-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') {
    mpReturnToLobby();
    return;
  }
  jecResetForNewGame();
});

document.getElementById('btn-jec-new-shift-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-new-shift-overlay').style.display = 'none';
});

// ── Sifting screen listeners ──────────────────────────────────────────────────
document.getElementById('btn-jec-sifting-exit').addEventListener('click', () => {
  playPillClick();
  document.getElementById('jec-quit-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-sifting-proceed').addEventListener('click', () => {
  // Host-gated in Lobby Mode — only the Head Chef runs scoring; clients wait for
  // the Host's JEC_TALLY SYNC. A client running jecCalcRoundScores() locally would
  // mutate jecScores, double-log the round, and self-navigate ahead of the table. (J4)
  if (window.syllyMultiplayerMode === 'client') return;
  playSuccess();
  const roundScores = jecCalcRoundScores();

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast tally so all devices render the same scores
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_TALLY',
      round: jecRound, rounds: jecRounds,
      roundScores, scores: [...jecScores], roundLog: jecRoundLog,
    }});
  }

  jecRenderTally(roundScores);
  showScreen('screen-jec-tally');
});

// ── Sous Chef Oversight overlay ───────────────────────────────────────────────
document.getElementById('btn-jec-oversight-merge').addEventListener('click', () => {
  playSuccess();
  jecApplyMerge(jecOversightPendingA, jecOversightPendingB);
  document.getElementById('jec-oversight-overlay').style.display = 'none';
  jecRenderSifting();
});

document.getElementById('btn-jec-oversight-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-oversight-overlay').style.display = 'none';
});

// ── Tally screen listeners ────────────────────────────────────────────────────
document.getElementById('btn-jec-tally-exit').addEventListener('click', () => {
  playPillClick();
  document.getElementById('jec-quit-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-tally-next').addEventListener('click', () => {
  // Host-gated in Lobby Mode — only the Head Chef advances; clients wait for the
  // Host's JEC_ORDER (next round) / JEC_WASHUP (final) SYNC. A client running
  // jecStartRound() locally pops its own word pool and flashes a wrong order. (J4)
  if (window.syllyMultiplayerMode === 'client') return;
  playLaunch();
  if (jecRound < jecRounds) {
    // Host: jecStartRound() broadcasts JEC_ORDER, which fully drives all clients
    // into the next round — no separate JEC_NEXT_ROUND packet needed. (J4)
    jecStartRound();
  } else {
    if (window.syllyMultiplayerMode === 'host') {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'JEC_WASHUP', scores: [...jecScores], roundLog: jecRoundLog } });
    }
    jecShowWashup();
  }
});

// ── Order screen listeners ────────────────────────────────────────────────────
document.getElementById('btn-jec-order-exit').addEventListener('click', () => {
  playPillClick();
  document.getElementById('jec-quit-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-order-start').addEventListener('click', () => {
  playLaunch();
  // Lobby Mode: each device goes directly to their own player's prep (no sequential pass-gate)
  const prepIdx = window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0;
  jecStartPlayerPrep(prepIdx);
});

document.getElementById('btn-jec-reroll').addEventListener('click', () => {
  playWhoosh();
  jecDrawOrders();
  jecDrawInstruction();
  document.getElementById('jec-order-word').textContent = jecCurrentWord.toUpperCase();
});

// ── Prep screen listeners ─────────────────────────────────────────────────────
document.getElementById('btn-jec-prep-exit').addEventListener('click', () => {
  playPillClick();
  document.getElementById('jec-quit-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-serve').addEventListener('click', () => {
  playSuccess();
  jecSubmitIngredients();
});

document.getElementById('btn-jec-pass-gate-ready').addEventListener('click', () => {
  playLaunch();
  jecStartPlayerPrep(jecCurrentPlayerIdx);
});

// ── JEC Quit overlay ──────────────────────────────────────────────────────────
document.getElementById('btn-jec-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('jec-quit-overlay').style.display = 'none';
  // Mid-Game Quit Contract (logic-engine.md): in a lobby session, leaving must dissolve the
  // session for every other device — jecResetForNewGame() only tears this one down.
  if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
  jecResetForNewGame();
});

document.getElementById('btn-jec-quit-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-quit-overlay').style.display = 'none';
});

// ── [?] JEC Help buttons ──────────────────────────────────────────────────────
document.querySelectorAll('.btn-jec-help-open').forEach(btn => {
  btn.addEventListener('click', () => {
    playDone();
    const el = document.getElementById('jec-how-to-overlay');
    const inner = el.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    el.style.display = 'flex';
  });
});
document.getElementById('btn-jec-how-to')?.addEventListener('click', () => {
  playDone();
  const el = document.getElementById('jec-how-to-overlay');
  const inner = el.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  el.style.display = 'flex';
});
document.getElementById('btn-jec-help-tip-close')?.addEventListener('click', () => {
  playDone();
  document.getElementById('jec-help-tip-overlay').style.display = 'none';
});

// ── Secret Mode expansion overrides ──────────────────────────────────────────
function jecApplyExpansionOverrides() {
  // Called at game start (JEC-2) — applies Terminal-pushed overrides
  if (!isSecretMode || !window.activeExpansionOverrides) return;
  const ov = window.activeExpansionOverrides;
  if (ov.jecRounds            !== undefined) jecRounds            = ov.jecRounds;
  if (ov.jecTableForOnePenalty     !== undefined) jecTableForOnePenalty     = ov.jecTableForOnePenalty;
  if (ov.jecCrowdedKitchenTax     !== undefined) jecCrowdedKitchenTax     = ov.jecCrowdedKitchenTax;
  if (ov.jecFusionCuisine !== undefined) jecFusionCuisine = ov.jecFusionCuisine;
  // In Secret Mode, use expansion words filtered to food category; fall back to all expansion words
  if (secretWords && secretWords.length) {
    const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
    jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
  }
}
