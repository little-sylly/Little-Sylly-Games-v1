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
let jecCalloutHandle     = null;     // setTimeout handle for the Callouts reveal
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
// Three bullets, one sentence each — § Contextual Tip Icons. textContent per
// line, never innerHTML: a tip is plain prose and nothing here needs markup.
function jecShowHelpTip(emoji, heading, lines) {
  document.getElementById('jec-help-tip-emoji').textContent   = emoji;
  document.getElementById('jec-help-tip-heading').textContent = heading;
  const body = document.getElementById('jec-help-tip-body');
  body.innerHTML = '';
  lines.forEach(line => {
    const p = document.createElement('p');
    p.textContent = '• ' + line;
    body.appendChild(p);
  });
  document.getElementById('jec-help-tip-overlay').style.display = 'flex';
}

// The three mechanics a one-line hint under the input cannot fully explain: what
// a missed Signature actually costs, why the Crutch refuses your own words, and
// that a tied name still pays.
const JEC_TIPS = {
  signature: ['⭐', 'Your Signature Dish', [
    'Back one of your three to score double — but only if it lands in the golden range.',
    'A Signature that misses still scores what it was worth; the only loss is the double.',
    'Back the one you think a couple of others will write, not the one everybody will.',
  ]],
  crutch: ['📣', 'Calling the Crutch', [
    'Name the ingredient you reckon the most Chefs at this table will write.',
    "It can't be one of your own three — calling your own is not a read of the table.",
    'Hit the round\'s most-picked, shared by 3 or more Chefs, and it pays half a jackpot.',
  ]],
  fusionName: ['🍜', 'Naming the Dish', [
    'Give the mash-up a name — everyone votes on it after The Tasting.',
    'The winner goes On the Menu for half a jackpot.',
    'Ties all pay, so there is no reason to play it safe.',
  ]],
};

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
  jecSyncSettingsUI();
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

// ── JEC Settings (The Pantry) ────────────────────────────────────
// Repaints every control from current state. Called on overlay open AND from
// every handler, so a Terminal override or a lobby SETTINGS_SYNC can never leave
// a stale pill lit.
function jecSyncSettingsUI() {
  const pills = (attr, val) => document.querySelectorAll(`[${attr}]`).forEach(b => {
    b.className = `pill${b.getAttribute(attr) === String(val) ? ' pill-active-amber' : ''}`;
  });
  pills('data-jec-rounds',          jecRounds);
  pills('data-jec-golden',          jecGoldenScore);
  pills('data-jec-food-difficulty', jecFoodDifficulty);
  pills('data-jec-tablefor1',       jecTableForOnePenalty ? 'on' : 'off');
  pills('data-jec-tax',             jecCrowdedKitchenTax  ? 'on' : 'off');

  const toggle = (id, on) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.textContent = on ? 'ON' : 'OFF';
    b.className   = on ? 'game-toggle-on-amber shrink-0' : 'game-toggle-off shrink-0';
  };
  toggle('btn-jec-souschef-toggle',     jecSousChefCheck);
  toggle('btn-jec-specials-toggle',     jecSpecialsBoard);
  toggle('btn-jec-instructions-toggle', jecSpecialInstructions);
  toggle('btn-jec-sylly-toggle',        jecFusionCuisine);

  const d1 = document.getElementById('jec-tablefor1-desc');
  if (d1) d1.style.visibility = jecTableForOnePenalty ? 'visible' : 'hidden';
  const d2 = document.getElementById('jec-tax-desc');
  if (d2) d2.style.visibility = jecCrowdedKitchenTax ? 'visible' : 'hidden';
  jecUpdateMenuVal();
}

// Dynamic value line (ui-style.md § Settings Card Standard, DD-13) — the pill
// carries the thematic name only; this says what it means for the word pool.
function jecUpdateMenuVal() {
  const el = document.getElementById('jec-val-difficulty');
  if (!el) return;
  el.textContent = { easy:  'Everyday uses only the easiest food words.',
                     mixed: 'Restaurant mixes easy and medium food words.',
                     hard:  'Fine Dining uses only the hardest food words.' }[jecFoodDifficulty] || '';
}

document.querySelectorAll('[data-jec-rounds]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecRounds = parseInt(btn.dataset.jecRounds); jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-golden]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecGoldenScore = parseInt(btn.dataset.jecGolden); jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-food-difficulty]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecFoodDifficulty = btn.dataset.jecFoodDifficulty; jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-tablefor1]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecTableForOnePenalty = btn.dataset.jecTablefor1 === 'on'; jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-tax]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecCrowdedKitchenTax = btn.dataset.jecTax === 'on'; jecSyncSettingsUI();
}));
document.getElementById('btn-jec-souschef-toggle').addEventListener('click', () => {
  playPillClick(); jecSousChefCheck = !jecSousChefCheck; jecSyncSettingsUI();
});
document.getElementById('btn-jec-specials-toggle').addEventListener('click', () => {
  playPillClick(); jecSpecialsBoard = !jecSpecialsBoard; jecSyncSettingsUI();
});
document.getElementById('btn-jec-instructions-toggle').addEventListener('click', () => {
  playPillClick(); jecSpecialInstructions = !jecSpecialInstructions; jecSyncSettingsUI();
});
document.getElementById('btn-jec-sylly-toggle').addEventListener('click', () => {
  jecFusionCuisine = !jecFusionCuisine;
  jecFusionCuisine ? playSyllyOn() : playSyllyOff();
  jecSyncSettingsUI();
});
document.getElementById('btn-jec-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-settings-overlay').style.display = 'none';
});

jecSyncSettingsUI();

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

// Repaints the whole Order stage from state. Called by jecShowOrderScreen AND by
// the Specials Board reroll — one function, so a reroll can never repaint the
// word while leaving a stale instruction sitting under it.
function jecRenderOrder() {
  document.getElementById('jec-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-order-round').textContent = `Course ${jecRound} of ${jecRounds}`;

  const plus     = document.getElementById('jec-order-fusion-plus');
  const word2    = document.getElementById('jec-order-word2');
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  plus.style.display  = isFusion ? '' : 'none';
  word2.style.display = isFusion ? '' : 'none';
  if (isFusion) word2.textContent = jecCurrentWord2.toUpperCase();

  const instr = document.getElementById('jec-order-instruction');
  instr.style.display = jecInstruction ? '' : 'none';
  instr.textContent   = jecInstruction;

  document.getElementById('jec-order-hint').textContent = isFusion
    ? 'One dish, two Orders. Prep for the mash-up — and give it a name.'
    : 'Everyone read this together — each Chef will take a turn.';

  // Host-gated: a client tapping Reroll would redraw its own word and desync the
  // table, because only the host's draw is the one that gets broadcast.
  document.getElementById('btn-jec-reroll').style.display =
    (jecSpecialsBoard && window.syllyMultiplayerMode !== 'client') ? '' : 'none';
}

function jecShowOrderScreen() {
  jecRenderOrder();
  showScreen('screen-jec-order');
}

// A Specials Board reroll redraws the Instruction with the Order — and in Fusion,
// BOTH Orders. Rerolling one but not the others would let a table fish for an easy
// instruction against a fixed dish.
//
// Named rather than inline in the listener for two reasons: the loopback harness
// cannot fire a DOM click, and the broadcast below is the half that was missing.
function jecReroll() {
  jecDrawOrders();
  jecDrawInstruction();
  jecRenderOrder();
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_ORDER',
      word:        jecCurrentWord,
      word2:       jecCurrentWord2 || '',
      instruction: jecInstruction  || '',
      round: jecRound, rounds: jecRounds,
    }});
  }
}

function jecStartPlayerPrep(idx) {
  const name = jecPlayerNames[idx];
  document.getElementById('jec-prep-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-prep-chef-name').textContent   = `${name}'s Prep 🧑‍🍳`;
  document.getElementById('jec-prep-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;

  // The Order header mirrors the Order screen's shape, from the same two pieces
  // of state — a Chef reading their prep sees exactly what the table just read.
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const plus  = document.getElementById('jec-prep-order-plus');
  const word2 = document.getElementById('jec-prep-order-word2');
  plus.style.display  = isFusion ? '' : 'none';
  word2.style.display = isFusion ? '' : 'none';
  if (isFusion) word2.textContent = jecCurrentWord2.toUpperCase();

  const instr = document.getElementById('jec-prep-instruction');
  instr.style.display = jecInstruction ? '' : 'none';
  instr.textContent   = jecInstruction;

  ['1', '2', '3'].forEach(n => { document.getElementById(`jec-prep-ingredient-${n}`).value = ''; });
  document.getElementById('jec-prep-crutch').value = '';
  document.getElementById('jec-prep-fusion-name').value = '';
  document.getElementById('jec-prep-fusion-section').style.display = isFusion ? '' : 'none';
  document.getElementById('jec-prep-error').textContent = '';

  jecSetPrepSignature(-1);

  document.getElementById('jec-prep-phase').style.display = '';
  document.getElementById('jec-pass-gate').style.display  = 'none';
  showScreen('screen-jec-prep');
}

// The Signature tap. Nomination is MANDATORY — there is no default, because a
// default is not a decision, and this is the game's first genuine trade-off:
// back the word you're confident about, or gamble the double on the weird one.
function jecSetPrepSignature(idx) {
  jecPrepSignatureIdx = idx;
  document.querySelectorAll('[data-jec-sig]').forEach(b => {
    const on = parseInt(b.dataset.jecSig, 10) === idx;
    b.className = `jec-sig-btn min-h-11 min-w-11 shrink-0 rounded-xl text-lg active:scale-95 ${on ? 'jec-sig-btn-on' : 'bg-stone-100'}`;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  jecUpdateServeState();
}

// Serve it Up! is blocked until every required field is PRESENT — the Signature
// tap gated exactly as the three ingredients are. Presence only: the semantic
// checks (duplicate ingredients, a Crutch that is one of your own) stay in
// jecSubmitIngredients, where they can say what is actually wrong.
function jecUpdateServeState() {
  const vals   = ['1', '2', '3'].map(n => document.getElementById(`jec-prep-ingredient-${n}`).value.trim());
  const crutch = document.getElementById('jec-prep-crutch').value.trim();
  const name   = document.getElementById('jec-prep-fusion-name').value.trim();
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const ok = vals.every(Boolean) && jecPrepSignatureIdx >= 0 && !!crutch && (!isFusion || !!name);
  const btn = document.getElementById('btn-jec-serve');
  btn.disabled = !ok;
  btn.style.opacity = ok ? '' : '0.5';
}

function jecSubmitIngredients() {
  const v = ['1', '2', '3'].map(n => document.getElementById(`jec-prep-ingredient-${n}`).value.trim());
  const crutch   = document.getElementById('jec-prep-crutch').value.trim();
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const name     = isFusion ? document.getElementById('jec-prep-fusion-name').value.trim() : '';
  const err      = document.getElementById('jec-prep-error');

  if (!v.every(Boolean))       { err.textContent = 'Add all 3 ingredients before serving!'; return; }
  const norms = v.map(x => normaliseWord(x));
  if (new Set(norms).size < 3) { err.textContent = "You've already prepped that! Try a different ingredient. 🤔"; return; }
  if (jecPrepSignatureIdx < 0) { err.textContent = 'Tap the ⭐ on your Signature Dish first!'; return; }
  if (!crutch)                 { err.textContent = 'Call the Crutch before you serve!'; return; }
  // Calling one of your own three is not a read of the table — it is a read of
  // your own hand, which you already have.
  if (norms.includes(normaliseWord(crutch))) {
    err.textContent = "That's one of your own — call something you didn't write. 📣"; return;
  }
  if (isFusion && !name)       { err.textContent = 'Give the dish a name before you serve!'; return; }

  const idx = window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : jecCurrentPlayerIdx;
  jecInputs[idx]      = v;
  jecCrutches[idx]    = crutch;
  jecSignatures[idx]  = jecPrepSignatureIdx;
  jecFusionNames[idx] = name;

  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: freeze local prep screen
    mpLockSync();
    document.getElementById('btn-jec-serve').classList.add('opacity-50', 'pointer-events-none');
    err.textContent = 'Ingredients submitted — waiting for the other chefs…';
    if (window.syllyMultiplayerMode === 'host') {
      // The host processes its OWN submission directly. mpHandleEnvelope drops
      // every envelope where originId === syllyDeviceUid, so a host that sent
      // itself an ACTION would never have its slot set and the round would hang.
      // That is bug J1, and it applies identically to the vote matrix.
      jecMpReadyCheck[mpMyPlayerIdx] = true;
      if (jecMpReadyCheck.every(Boolean)) jecHostResolveSifting();
    } else {
      mpSendEnvelope({ type: 'ACTION', payload: {
        action:       'JEC_PREP_SUBMIT',
        playerIdx:    mpMyPlayerIdx,
        ingredients:  v,
        crutch,                                  // '' is impossible here — validated above
        signatureIdx: jecPrepSignatureIdx,       // 0 is a legitimate value and survives the wire
        fusionName:   name,                      // '' when not Fusion, never null
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
    jecBuildFrequency();
    jecStartSifting();
  }
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
  document.getElementById('jec-sifting-order').textContent = jecFusionCuisine && jecCurrentWord2
    ? `${jecCurrentWord.toUpperCase()} + ${jecCurrentWord2.toUpperCase()}`
    : jecCurrentWord.toUpperCase();
  document.getElementById('jec-sifting-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  // Sous Chef's Check is skipped WHOLE when the setting is OFF — not shown with
  // the merge affordance hidden. There is nothing to look at on a blind board.
  if (jecSousChefCheck) jecShowSousChefCheck(); else jecShowTasting();
  showScreen('screen-jec-sifting');
}

// Sub-state A. Plain, unscored, alphabetical. No counts, no badges, no Callouts.
// Merging blind is the whole point: on the old scored board a Chef could push a
// merge that raised their own count, with full knowledge of what it was worth.
function jecShowSousChefCheck() {
  jecSiftingSubState = 'check';
  document.getElementById('jec-sifting-stage-label').textContent = "Sous Chef's Check";
  document.getElementById('jec-sifting-check').style.display   = '';
  document.getElementById('jec-sifting-tasting').style.display = 'none';
  document.getElementById('jec-oversight-hint').style.display  = jecCanOversee() ? '' : 'none';
  jecRenderCheckList();
  jecSetAdvanceCta('btn-jec-check-proceed', 'Start the Tasting');
}

function jecRenderCheckList() {
  const list = document.getElementById('jec-check-list');
  list.innerHTML = '';
  Object.keys(jecWordFrequency)
    .map(norm => [norm, (jecDisplayWords[norm] || norm)])
    .sort((a, b) => a[1].localeCompare(b[1]))     // alphabetical, NOT by count
    .forEach(([norm, raw]) => {
      const card = document.createElement('div');
      card.className = `jec-sift-card bg-white rounded-2xl p-4 shadow-sm flex items-center${jecCanOversee() ? ' cursor-pointer active:scale-95 transition-transform duration-100' : ''}`;
      card.dataset.norm = norm;
      card.innerHTML = `<p class="font-semibold text-stone-800">${raw.charAt(0).toUpperCase() + raw.slice(1)}</p>`;
      if (jecCanOversee()) card.addEventListener('click', () => jecHandleOversightTap(norm));
      list.appendChild(card);
    });
}

// Sub-state B. Counts, badges, Signature markers and the Callouts — revealed in
// ASCENDING count order so the Chef's Kisses land in the middle, where the
// reactions are, and Too Many Cooks lands last.
function jecShowTasting() {
  jecSiftingSubState = 'tasting';
  document.getElementById('jec-sifting-stage-label').textContent = 'The Tasting';
  document.getElementById('jec-sifting-check').style.display   = 'none';
  document.getElementById('jec-sifting-tasting').style.display = '';
  jecRenderTasting();
  jecSetAdvanceCta('btn-jec-sifting-proceed', 'The Tally');
}

function jecRenderTasting() {
  const list = document.getElementById('jec-tasting-list');
  list.innerHTML = '';
  const entries = Object.entries(jecWordFrequency).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  // Which Chefs nominated which surviving word — one star marker per nomination.
  // Resolved through the merge map, so a nomination that was merged away still
  // marks the word it became.
  const sigCounts = {};
  for (let p = 0; p < jecPlayerCount; p++) {
    const j = jecSignatures[p];
    if (!(j >= 0) || !jecInputs[p] || !jecInputs[p][j]) continue;
    const n = jecResolveNorm(jecInputs[p][j]);
    sigCounts[n] = (sigCounts[n] || 0) + 1;
  }

  entries.forEach(([norm, count], i) => {
    const badge   = jecBadge(count, jecPlayerCount);
    const raw     = jecDisplayWords[norm] || norm;
    const display = raw.charAt(0).toUpperCase() + raw.slice(1);
    const chefs   = count === 1 ? '1 Chef' : `${count} Chefs`;
    const stars   = sigCounts[norm] ? ' ' + '⭐'.repeat(sigCounts[norm]) : '';
    const card = document.createElement('div');
    card.className = 'jec-tasting-row bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between';
    card.style.transitionDelay = `${Math.min(i * 50, 600)}ms`;
    card.innerHTML = `
      <div>
        <p class="font-semibold text-stone-800">${display}${stars}</p>
        <p class="text-xs text-stone-400 mt-0.5">${chefs}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${badge.cls}">${badge.label}</span>`;
    list.appendChild(card);
  });

  // Kick the stagger on the next frame so the initial (hidden) state paints first.
  requestAnimationFrame(() => {
    document.querySelectorAll('.jec-tasting-row').forEach(el => el.classList.add('jec-tasting-row-in'));
  });

  jecRenderCallouts(entries.length);
}

// The Callouts reveal AFTER the ingredient list has finished. The Crutch result
// is the round's punchline, not its preamble.
function jecRenderCallouts(rowCount) {
  const section = document.getElementById('jec-callouts-section');
  const list    = document.getElementById('jec-callouts-list');
  const called  = [];
  for (let p = 0; p < jecPlayerCount; p++) {
    const c = (jecCrutches[p] || '').trim();
    if (c) called.push({ p, word: c, hit: jecCrutchHit(p) });
  }
  if (!called.length) { section.style.display = 'none'; return; }
  list.innerHTML = '';
  called.forEach(({ p, word, hit }) => {
    const row = document.createElement('div');
    row.className = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    row.innerHTML = `
      <div>
        <p class="font-semibold text-stone-800">${jecPlayerNames[p]}</p>
        <p class="text-xs text-stone-400 mt-0.5">${word.charAt(0).toUpperCase() + word.slice(1)}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${hit ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-stone-400'}">${hit ? 'Called It! 📣' : 'Not this time'}</span>`;
    list.appendChild(row);
  });
  section.style.display = 'none';
  // Clear any pending handle first — a rapid re-render must never stack two
  // timers (§ Timer Lifecycle). jecCalloutHandle is cleared in the quit handler,
  // in jecResetForNewGame() and in resetToLobby().
  if (jecCalloutHandle) { clearTimeout(jecCalloutHandle); jecCalloutHandle = null; }
  jecCalloutHandle = setTimeout(() => {
    section.style.display = '';
    jecCalloutHandle = null;
  }, Math.min(rowCount * 50, 600) + 300);
}

// Sous Chef's Check -> The Tasting. A real function rather than a listener body
// so the loopback drives the SHIPPED advance, guard included, instead of a copy.
function jecAdvanceToTasting() {
  if (window.syllyMultiplayerMode === 'client') return;   // J4: host-gated
  if (window.syllyMultiplayerMode === 'host') {
    // The merges already reached clients via JEC_MERGE; this packet carries the
    // final state once more so a client that missed one is repaired BEFORE
    // anything is scored.
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_TASTING',
      jecWordFrequency: { ...jecWordFrequency },
      jecDisplayWords:  { ...jecDisplayWords },
      jecMergeMap:      { ...jecMergeMap },
    }});
  }
  jecShowTasting();
}

function jecClearOversightHighlights() {
  document.querySelectorAll('.jec-sift-card').forEach(c => c.classList.remove('ring-2', 'ring-amber-400'));
}

// Sous Chef's Check is interactive only on the host (and single-device). In Lobby
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
  if (jecSiftingSubState !== 'check') return;           // merging is blind, or not at all
  if (jecOversightSelected === null) {
    jecOversightSelected = norm;
    document.querySelectorAll('.jec-sift-card').forEach(c => {
      c.classList.toggle('ring-2',         c.dataset.norm === norm);
      c.classList.toggle('ring-amber-400', c.dataset.norm === norm);
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

// ── JEC Name the Dish (Fusion Cuisine) ───────────────────────────────────────
// Runs AFTER The Tasting and BEFORE The Tally, so the Tally shows the round's
// complete score including the name bonus — one score screen per round, not two.
// No pass gate: the names are public, so there is nothing private to protect
// and logic-engine.md § Pass-the-Phone Safety Gate does not apply.
function jecStartNameVote() {
  document.getElementById('jec-name-vote-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  document.getElementById('jec-name-vote-fusion').textContent =
    `${jecCurrentWord.toUpperCase()} + ${jecCurrentWord2.toUpperCase()}`;
  document.getElementById('jec-name-vote-ballot').style.display = '';
  document.getElementById('jec-name-vote-result').style.display = 'none';
  document.getElementById('jec-name-vote-list').classList.remove('opacity-50', 'pointer-events-none');
  jecVoteCurrentIdx = window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0;
  // A ballot with nothing on it can only happen if every name went missing, which
  // validation forbids — but a hung round is a worse failure than a blank result.
  if (!jecFusionNames.some(x => (x || '').trim())) {
    jecTallyNameVotes();
    showScreen('screen-jec-name-vote');
    jecShowNameResult();
    return;
  }
  jecRenderBallot(jecVoteCurrentIdx);
  showScreen('screen-jec-name-vote');
}

// One ballot. The voter's OWN entry renders DISABLED, not hidden, so the ballot
// reads the same for everyone — a hidden row would shift every other name up and
// make the list length itself a tell.
function jecRenderBallot(voterIdx) {
  document.getElementById('jec-name-vote-heading').textContent =
    window.syllyMultiplayerMode !== 'single'
      ? 'Pick the best name'
      : `${jecPlayerNames[voterIdx]}, pick the best name`;
  const list = document.getElementById('jec-name-vote-list');
  list.innerHTML = '';
  for (let p = 0; p < jecPlayerCount; p++) {
    const name = (jecFusionNames[p] || '').trim();
    if (!name) continue;                       // not on the ballot
    const own = p === voterIdx;
    const btn = document.createElement('button');
    btn.className = `btn-mp-action min-h-14 w-full rounded-2xl px-4 text-lg font-semibold transition-transform duration-100 ${
      own ? 'bg-stone-100 text-stone-400' : 'bg-white text-stone-800 shadow-sm active:scale-95'}`;
    btn.textContent = name;
    btn.disabled = own;
    if (!own) btn.addEventListener('click', () => { playPillClick(); jecCastNameVote(voterIdx, p); });
    list.appendChild(btn);
  }
  document.getElementById('jec-name-vote-status').textContent = '';
}

function jecCastNameVote(voterIdx, targetIdx) {
  if (voterIdx === targetIdx) return;          // belt and braces; the button is disabled
  jecNameVotes[voterIdx] = targetIdx;

  if (window.syllyMultiplayerMode === 'single') {
    // Pass-the-Phone: cycle through Chefs on the one device. No pass gate — the
    // names are public, so there is nothing private to protect.
    jecVoteCurrentIdx++;
    if (jecVoteCurrentIdx < jecPlayerCount) { jecRenderBallot(jecVoteCurrentIdx); return; }
    jecTallyNameVotes();
    jecShowNameResult();
    return;
  }

  document.getElementById('jec-name-vote-status').textContent = 'Vote in — waiting for the other chefs…';
  document.getElementById('jec-name-vote-list').classList.add('opacity-50', 'pointer-events-none');

  if (window.syllyMultiplayerMode === 'host') {
    // Host processes its OWN vote directly. mpHandleEnvelope drops every envelope
    // where originId === syllyDeviceUid, so a self-sent ACTION would leave this
    // slot false forever and the round would hang. Same shape as bug J1.
    jecMpVoteCheck[mpMyPlayerIdx] = true;
    jecHostCheckVotes();
  } else {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action: 'JEC_NAME_VOTE', playerIdx: mpMyPlayerIdx, votedForIdx: targetIdx,
    }});
  }
}

// The readiness gate. In Lobby Mode every seat is live, so a plain .every(Boolean)
// is correct — but [].every() is TRUE, so this must never run against an empty
// matrix. jecMpVoteCheck is set to length N in jecStartRound and in the JEC_ORDER
// applier; the guard below is what makes that explicit.
function jecHostCheckVotes() {
  if (jecMpVoteCheck.length !== jecPlayerCount) return;
  if (!jecMpVoteCheck.every(Boolean)) return;
  const r = jecTallyNameVotes();
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'JEC_NAME_RESULT',
    votes:   [...r.votes],      // an all-0 array is a legitimate value; 0 survives
    winners: [...r.winners],    // MAY be empty — rebuilt to [] on receipt
    bonus:   r.bonus,
  }});
  mpUnlockSync();
  jecShowNameResult();
}

function jecShowNameResult() {
  document.getElementById('jec-name-vote-ballot').style.display = 'none';
  document.getElementById('jec-name-vote-result').style.display = '';
  const w   = jecNameWinners;
  const win = document.getElementById('jec-name-vote-winner');
  const sub = document.getElementById('jec-name-vote-winner-sub');
  if (!w.length) {
    win.textContent = 'No name made the menu.';
    sub.textContent = 'Nobody voted. Back to the pans.';
  } else if (w.length === 1) {
    win.textContent = jecFusionNames[w[0]];
    sub.textContent = `${jecPlayerNames[w[0]]} takes On the Menu! ⭐ — +${jecBonusValue()} pts`;
  } else {
    // Ties are NOT broken: every tied name takes the full bonus, because a tie
    // means two names were both funny and a runoff costs another pass for no gain.
    win.textContent = w.map(i => jecFusionNames[i]).join('  ·  ');
    sub.textContent = `A dead heat — every one of them goes On the Menu! ⭐ +${jecBonusValue()} pts each`;
  }
  jecSetAdvanceCta('btn-jec-name-vote-next', 'The Tally');
}

// The Tasting's proceed. A real function rather than a listener body so the
// loopback drives the SHIPPED advance, Fusion detour and J4 guard included.
function jecAdvanceFromTasting() {
  if (window.syllyMultiplayerMode === 'client') return;   // J4: host-gated
  if (jecFusionCuisine && jecCurrentWord2) {
    if (window.syllyMultiplayerMode === 'host') {
      // Clients must be TOLD to enter the ballot, and must hold the same name
      // list — the spec's JEC_NAME_VOTE is client→host only.
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'JEC_NAME_VOTE_BEGIN',
        jecFusionNames: [...jecFusionNames],
      }});
    }
    jecStartNameVote();
    return;
  }
  jecFinishRoundToTally();
}

// Shared by the standard path (straight off The Tasting) and by the Fusion
// path (off the vote result), so the round is scored in exactly one place.
function jecFinishRoundToTally() {
  const { roundScores, bonus } = jecCalcRoundScores();
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_TALLY',
      round: jecRound, rounds: jecRounds,
      roundScores: [...roundScores],
      scores:      [...jecScores],
      // The per-Chef breakdown, so clients render the same Tally rather than a
      // bare total. Every field is a number and 0 survives the wire — only
      // emptiness is erased — but a MISSING entry is the real risk, so the
      // array is rebuilt field by field on receipt regardless.
      bonus: bonus.map(b => ({ signature: b.signature, crutch: b.crutch, name: b.name })),
      roundLog: jecRoundLog,
    }});
  }
  jecRenderTally(roundScores, bonus);
  showScreen('screen-jec-tally');
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
function jecRenderTally(roundScores, bonus) {
  document.getElementById('jec-tally-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  const best = Math.max(...roundScores);
  const feedback = best >= jecGoldenScore * 3
    ? "Head Chef Status: Absolutely Cookin'! 🔥"
    : best >= jecGoldenScore * 2
    ? 'Five-star effort right there! ⭐'
    : 'Maybe stick to toast next time. 🍞';
  document.getElementById('jec-tally-feedback').textContent = feedback;
  // `bonus` is required and must be length N: jecFinishRoundToTally passes the
  // array it just built, and the JEC_TALLY applier rebuilds it field by field.
  // A tolerant `|| { }` fallback here would swallow an applier that forgot to
  // rebuild - the defect would render as a blank Tally rather than fail.
  const ranked = jecPlayerNames.slice(0, jecPlayerCount)
    .map((name, i) => ({ name, rs: roundScores[i], total: jecScores[i], b: bonus[i] }))
    .sort((a, b) => b.rs - a.rs);
  const list = document.getElementById('jec-tally-list');
  list.innerHTML = '';
  ranked.forEach(({ name, rs, total, b }) => {
    const rsText   = rs > 0 ? `+${rs}` : `${rs}`;
    const rsColour = rs > 0 ? 'text-amber-600' : rs < 0 ? 'text-red-500' : 'text-stone-400';
    // Named badges, not a lump sum — a Chef needs to see WHICH bet paid off.
    // Omitted entirely when nothing landed: an empty line under every
    // non-scoring Chef is noise, not consistency.
    const marks = [];
    if (b.signature) marks.push(`Signature Dish 🌟 +${b.signature}`);
    if (b.crutch)    marks.push(`Called It! 📣 +${b.crutch}`);
    if (b.name)      marks.push(`On the Menu! ⭐ +${b.name}`);
    const card     = document.createElement('div');
    card.className  = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    card.innerHTML  = `
      <div>
        <p class="font-semibold text-stone-800">${name}</p>
        <p class="text-xs text-stone-400 mt-0.5">Total: ${total} pts</p>
        ${marks.length ? `<p class="text-xs text-amber-600 font-semibold mt-0.5">${marks.join(' · ')}</p>` : ''}
      </div>
      <span class="text-xl font-bold shrink-0 whitespace-nowrap ${rsColour}">${rsText} pts</span>`;
    list.appendChild(card);
  });
  // No emoji on an action button — § Action Button Standard. The label is read at
  // a glance mid-round and a glyph competes with the words for the same read.
  jecSetAdvanceCta('btn-jec-tally-next',
    jecRound < jecRounds ? 'Next Course' : 'Final Wash-up');
}

function jecRenderCookBook() {
  const container = document.getElementById('jec-washup-cookbook');
  container.innerHTML = '';
  jecRoundLog.forEach((entry, i) => {
    const ranked = jecPlayerNames.slice(0, jecPlayerCount)
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
    // A Fusion course was two Orders and may have carried an Instruction; a log
    // that shows neither cannot explain why a course scored the way it did.
    const orderText = entry.order2 ? `${entry.order} + ${entry.order2}` : entry.order;
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-stone-400">Course ${i + 1}</p>
        <p class="text-sm font-bold text-amber-600 uppercase tracking-wide">${orderText}</p>
      </div>
      ${entry.instruction ? `<p class="text-xs text-stone-400 italic">${entry.instruction}</p>` : ''}
      <div class="flex flex-col gap-1">${rows}</div>`;
    container.appendChild(card);
  });
}

// Medals by SCORE, not by row index. Sorting alone gave two Chefs on the same
// score different medals below first place — [30, 20, 20] rendered 🥈 and 🥉 for
// identical totals. Blank past third, per § Gameover podium rank icons.
// Pure and exported so it can be asserted without a DOM.
function jecPodiumMedals(scores) {
  return scores.map(s => {
    const rank = 1 + scores.filter(x => x > s).length;
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
  });
}

function jecShowWashup() {
  const ranked = jecPlayerNames.slice(0, jecPlayerCount)
    .map((name, i) => ({ name, score: jecScores[i] }))
    .sort((a, b) => b.score - a.score);
  const medals = jecPodiumMedals(ranked.map(p => p.score));
  const topScore = ranked[0].score;
  const winners  = ranked.filter(p => p.score === topScore);
  document.getElementById('jec-washup-subtitle').textContent =
    winners.length > 1 ? 'A dead heat in the kitchen!' : `${winners[0].name} wins the kitchen! 🎉`;
  const list = document.getElementById('jec-washup-list');
  list.innerHTML = '';
  ranked.forEach((p, i) => {
    const isFirst = p.score === topScore;
    const card = document.createElement('div');
    // A transparent border on the losing rows, so the winner's amber ring does not
    // inset its own contents by 2px and knock the podium out of alignment - the
    // same reason the medal slot has a fixed width.
    card.className = `bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 border-2 ${isFirst ? 'border-amber-400' : 'border-transparent'}`;
    card.innerHTML = `
      <span class="jec-medal-slot text-2xl">${medals[i]}</span>
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
  if (jecCalloutHandle) { clearTimeout(jecCalloutHandle); jecCalloutHandle = null; }
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

document.getElementById('btn-jec-check-proceed').addEventListener('click', () => {
  if (window.syllyMultiplayerMode === 'client') return;   // J4
  playSuccess();
  jecAdvanceToTasting();
});

document.getElementById('btn-jec-sifting-proceed').addEventListener('click', () => {
  // Host-gated in Lobby Mode — only the Head Chef runs scoring or opens the vote;
  // clients wait for the Host's SYNC. A client running jecCalcRoundScores() locally
  // would mutate jecScores, double-log the round, and self-navigate ahead of the
  // table. (J4)
  if (window.syllyMultiplayerMode === 'client') return;
  playSuccess();
  jecAdvanceFromTasting();
});

// ── Name the Dish listeners ───────────────────────────────────────────────────
document.getElementById('btn-jec-name-vote-exit').addEventListener('click', () => {
  playPillClick();
  document.getElementById('jec-quit-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-name-vote-next').addEventListener('click', () => {
  if (window.syllyMultiplayerMode === 'client') return;   // J4
  playSuccess();
  jecFinishRoundToTally();
});

// ── Sous Chef's Check merge overlay ──────────────────────────────────────────
document.getElementById('btn-jec-oversight-merge').addEventListener('click', () => {
  playSuccess();
  jecApplyMerge(jecOversightPendingA, jecOversightPendingB);
  document.getElementById('jec-oversight-overlay').style.display = 'none';
  jecRenderCheckList();
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
  jecReroll();
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

document.querySelectorAll('[data-jec-sig]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick();
  jecSetPrepSignature(parseInt(btn.dataset.jecSig, 10));
}));

// Every field the Serve gate reads has to repaint it, or the CTA stays greyed
// out while the screen looks complete.
['jec-prep-ingredient-1', 'jec-prep-ingredient-2', 'jec-prep-ingredient-3',
 'jec-prep-crutch', 'jec-prep-fusion-name'].forEach(id => {
  document.getElementById(id).addEventListener('input', jecUpdateServeState);
});

document.getElementById('btn-jec-pass-gate-ready').addEventListener('click', () => {
  playLaunch();
  jecStartPlayerPrep(jecCurrentPlayerIdx);
});

// ── JEC Quit overlay ──────────────────────────────────────────────────────────
document.getElementById('btn-jec-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('jec-quit-overlay').style.display = 'none';
  if (jecCalloutHandle) { clearTimeout(jecCalloutHandle); jecCalloutHandle = null; }
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
Object.entries({
  'btn-jec-tip-signature':   'signature',
  'btn-jec-tip-crutch':      'crutch',
  'btn-jec-tip-fusion-name': 'fusionName',
}).forEach(([id, key]) => {
  document.getElementById(id)?.addEventListener('click', () => {
    playPillClick();
    jecShowHelpTip(...JEC_TIPS[key]);
  });
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
