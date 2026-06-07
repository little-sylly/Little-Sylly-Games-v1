// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Just Enough Cooks (jec)
// Mechanic: Social sync — players enter 3 ingredients for a secret food item.
// Scoring: 2-Chef match = jackpot (full Sweet Spot pts); 3 to N−1 = half; all N = token reward; unique = 0.
// Depends on: engine.js (normaliseWord, audio, showScreen, resetToLobby), li5.js (allWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── JEC Settings ──────────────────────────────────────────────────────────────
let jecRounds            = 3;     // 3 | 5 | 10
let jecGoldenScore       = 30;    // Sweet Spot (2-Chef match) jackpot: 10 | 20 | 30
let jecRottenPenalty     = false; // opt-in: −5 pts for unique words (Rotten); default OFF
let jecSpoiltPenalty     = false; // opt-in: −(count×2) pts for all-N match (Spoilt); default OFF
let jecSousChefOversight = true;  // manual merge before tally
let jecKitchenNightmares = false; // Sylly Mode
let jecFoodDifficulty   = 'mixed'; // 'easy' | 'mixed' | 'hard'
let jecSpecialsBoard    = false;  // allow rerolling food word on order screen

// ── JEC State ─────────────────────────────────────────────────────────────────
let jecPlayerCount   = 4;
let jecPlayerNames   = [];
let jecRound         = 0;
let jecScores        = [];
let jecCurrentWord   = '';
let jecWordPool      = [];
let jecInputs        = [];
let jecSignatures    = [];  // [playerIdx] → ingredient index 0/1/2 (Sylly Mode)
let jecPoisons       = [];  // [playerIdx] → poison word string (Sylly Mode)
let jecWordFrequency    = {};  // normalised word → count
let jecDisplayWords    = {};  // normalised word → first raw input for display
let jecMergeMap        = {};  // normalised word → merged-into target word
let jecRoundLog        = [];  // [{order, scores, frequency}]
let jecCurrentPlayerIdx  = 0;    // which player is currently prepping
let jecOversightSelected = null; // norm word of first Sous Chef tap
let jecOversightPendingA = null; // norm words awaiting merge confirm
let jecOversightPendingB = null;
let jecPoisonedNorms     = new Set(); // built from all players' poison words (KN mode)
let jecMpReadyCheck      = [];        // Lobby Mode: tracks which players have submitted prep

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
  updateSliderTheme('jec');
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
    jecRottenPenalty = btn.dataset.jecRotten === 'on';
    document.querySelectorAll('[data-jec-rotten]').forEach(b => {
      b.className = `pill${b.dataset.jecRotten === btn.dataset.jecRotten ? ' pill-active-amber' : ''}`;
    });
    document.getElementById('jec-rotten-desc').style.visibility = jecRottenPenalty ? 'visible' : 'hidden';
  });
});

document.querySelectorAll('[data-jec-spoilt]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecSpoiltPenalty = btn.dataset.jecSpoilt === 'on';
    document.querySelectorAll('[data-jec-spoilt]').forEach(b => {
      b.className = `pill${b.dataset.jecSpoilt === btn.dataset.jecSpoilt ? ' pill-active-amber' : ''}`;
    });
    document.getElementById('jec-spoilt-desc').style.visibility = jecSpoiltPenalty ? 'visible' : 'hidden';
  });
});

document.getElementById('btn-jec-oversight-toggle').addEventListener('click', () => {
  playPillClick();
  jecSousChefOversight = !jecSousChefOversight;
  const btn = document.getElementById('btn-jec-oversight-toggle');
  btn.textContent = jecSousChefOversight ? 'ON' : 'OFF';
  btn.className   = jecSousChefOversight ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
});

document.getElementById('btn-jec-specials-toggle').addEventListener('click', () => {
  playPillClick();
  jecSpecialsBoard = !jecSpecialsBoard;
  const btn = document.getElementById('btn-jec-specials-toggle');
  btn.textContent = jecSpecialsBoard ? 'ON' : 'OFF';
  btn.className   = jecSpecialsBoard ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
});

document.getElementById('btn-jec-sylly-toggle').addEventListener('click', () => {
  jecKitchenNightmares = !jecKitchenNightmares;
  const btn = document.getElementById('btn-jec-sylly-toggle');
  btn.textContent = jecKitchenNightmares ? 'ON' : 'OFF';
  btn.className   = jecKitchenNightmares ? 'game-toggle-on-amber shrink-0' : 'sylly-toggle-off shrink-0';
  jecKitchenNightmares ? playSyllyOn() : playSyllyOff();
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

document.querySelectorAll('[data-jec-food-difficulty]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    jecFoodDifficulty = btn.dataset.jecFoodDifficulty;
    document.querySelectorAll('[data-jec-food-difficulty]').forEach(b => {
      b.className = `pill${b.dataset.jecFoodDifficulty === jecFoodDifficulty ? ' pill-active-amber' : ''}`;
    });
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
  jecRound    = 0;
  jecScores   = Array(jecPlayerCount).fill(0);
  jecRoundLog = [];
  jecApplyExpansionOverrides();
  jecStartRound();
}

function jecStartRound() {
  jecRound++;
  if (jecWordPool.length === 0) {
    if (isSecretMode && secretWords && secretWords.length) {
      const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
      jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
    } else {
      jecWordPool = jecBuildFoodPool(allWords);
    }
  }
  jecCurrentWord      = jecWordPool.pop();
  jecCurrentPlayerIdx = 0;
  jecInputs           = Array.from({ length: jecPlayerCount }, () => ['', '', '']);
  jecMpReadyCheck     = Array(jecPlayerCount).fill(false);
  if (jecKitchenNightmares) {
    jecSignatures = Array(jecPlayerCount).fill(-1);
    jecPoisons    = Array(jecPlayerCount).fill('');
  }

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast the food word so all devices show the same order screen
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_ORDER', word: jecCurrentWord, round: jecRound, rounds: jecRounds,
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
  if (jecKitchenNightmares) {
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
  if (jecKitchenNightmares) {
    const poison = document.getElementById('jec-prep-poison').value.trim();
    if (!poison) {
      err.textContent = 'Add your Poison Word to sabotage the kitchen!';
      return;
    }
    if (norms.includes(normaliseWord(poison))) {
      err.textContent = "That's your own ingredient — pick a different Poison! 🤢";
      return;
    }
    jecPoisons[jecCurrentPlayerIdx]    = poison;
    jecSignatures[jecCurrentPlayerIdx] = 0; // ingredient 1 is always the Signature Dish
  }
  jecInputs[jecCurrentPlayerIdx] = [v1, v2, v3];

  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: freeze local prep screen
    const poison = jecKitchenNightmares ? (document.getElementById('jec-prep-poison').value.trim() || '') : '';
    mpLockSync();
    document.getElementById('btn-jec-serve').classList.add('opacity-50', 'pointer-events-none');
    document.getElementById('jec-prep-error').textContent = 'Ingredients submitted — waiting for the other chefs…';
    if (window.syllyMultiplayerMode === 'host') {
      // Host processes directly — self-sent envelopes are deduplicated/ignored by engine-multiplayer.js
      jecInputs[mpMyPlayerIdx] = [v1, v2, v3];
      if (jecKitchenNightmares && poison) {
        jecPoisons[mpMyPlayerIdx]    = poison;
        jecSignatures[mpMyPlayerIdx] = 0;
      }
      jecMpReadyCheck[mpMyPlayerIdx] = true;
      if (jecMpReadyCheck.every(Boolean)) {
        jecBuildFrequency();
        if (jecKitchenNightmares) jecBuildPoisonSet();
        mpSendEnvelope({ type: 'SYNC', payload: {
          action:           'JEC_SIFTING',
          jecInputs:         jecInputs.map(a => [...a]),
          jecWordFrequency:  {...jecWordFrequency},
          jecDisplayWords:   {...jecDisplayWords},
          jecMergeMap:       {...jecMergeMap},
          jecPoisonedNorms:  [...jecPoisonedNorms],
          jecPoisons:        [...jecPoisons],
          jecSignatures:     [...jecSignatures],
        }});
        mpUnlockSync();
        jecStartSifting();
      }
    } else {
      mpSendEnvelope({ type: 'ACTION', payload: {
        action:      'JEC_PREP_SUBMIT',
        playerIdx:   mpMyPlayerIdx,
        ingredients: [v1, v2, v3],
        poison,
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
  jecInputs.flat().forEach(raw => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const norm = normaliseWord(trimmed);
    jecWordFrequency[norm] = (jecWordFrequency[norm] || 0) + 1;
    if (!jecDisplayWords[norm]) jecDisplayWords[norm] = trimmed;
  });
}

function getIngredientStatus(count, N) {
  if (count <= 1)  return 'Rotten';
  if (count < N)   return 'Golden';
  return 'Spoilt';
}

// Tiered positive rewards — 2-Chef match is the jackpot; no negatives unless opt-in penalties are on
function jecCalcPoints(count, N) {
  if (count <= 1) return 0;
  if (count === 2) return jecGoldenScore;                      // Sweet Spot — full jackpot
  if (count < N)   return Math.round(jecGoldenScore * 0.5);   // Nice Match — half score
  return            Math.round(jecGoldenScore * 0.15);         // Too Many Cooks — token reward
}

function jecBuildPoisonSet() {
  jecPoisonedNorms = new Set();
  jecPoisons.forEach(p => {
    const norm = normaliseWord(p.trim());
    if (norm) jecPoisonedNorms.add(norm);
  });
}

function jecStartSifting() {
  if (jecKitchenNightmares) jecBuildPoisonSet();
  document.getElementById('jec-sifting-order').textContent       = jecCurrentWord.toUpperCase();
  document.getElementById('jec-sifting-round-label').textContent = `Round ${jecRound} of ${jecRounds}`;
  document.getElementById('jec-oversight-hint').style.display    = jecSousChefOversight ? '' : 'none';
  document.getElementById('jec-sifting-recipe-label').textContent =
    `Today's Recipe: ${jecCurrentWord.charAt(0).toUpperCase() + jecCurrentWord.slice(1)}`;
  const poisonSection = document.getElementById('jec-sifting-poison-section');
  if (jecKitchenNightmares && jecPoisons.some(p => p)) {
    const unique = [...new Set(jecPoisons.filter(p => p).map(p => p.trim()))];
    const poisonList = document.getElementById('jec-sifting-poison-list');
    poisonList.innerHTML = '';
    unique.forEach(p => {
      const norm = normaliseWord(p);
      const chip = document.createElement('span');
      chip.className   = 'jec-poison-chip px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700'
        + (jecSousChefOversight ? ' cursor-pointer active:scale-95 transition-transform duration-100' : '');
      chip.dataset.norm = norm;
      chip.textContent = p.charAt(0).toUpperCase() + p.slice(1);
      if (jecSousChefOversight) chip.addEventListener('click', () => jecHandleOversightTap(norm));
      poisonList.appendChild(chip);
    });
    poisonSection.style.display = '';
  } else {
    poisonSection.style.display = 'none';
  }
  jecRenderSifting();
  showScreen('screen-jec-sifting');
}

function jecRenderSifting() {
  const list    = document.getElementById('jec-sifting-list');
  list.innerHTML = '';
  const statusOrder = { Golden: 0, Spoilt: 1, Poisoned: 2, Rotten: 3 };
  const entries = Object.entries(jecWordFrequency).sort((a, b) => {
    const sA = statusOrder[jecKitchenNightmares && jecPoisonedNorms.has(a[0]) ? 'Poisoned' : getIngredientStatus(a[1], jecPlayerCount)] ?? 3;
    const sB = statusOrder[jecKitchenNightmares && jecPoisonedNorms.has(b[0]) ? 'Poisoned' : getIngredientStatus(b[1], jecPlayerCount)] ?? 3;
    return sA !== sB ? sA - sB : b[1] - a[1];
  });
  entries.forEach(([norm, count]) => {
    const isPoisoned = jecKitchenNightmares && jecPoisonedNorms.has(norm);
    const status     = isPoisoned ? 'Poisoned' : getIngredientStatus(count, jecPlayerCount);
    const raw     = jecDisplayWords[norm] || norm;
    const display = raw.charAt(0).toUpperCase() + raw.slice(1);
    const chefs   = count === 1 ? '1 Chef' : `${count} Chefs`;
    const badgeClass = status === 'Golden'
      ? 'bg-amber-100 text-amber-700'
      : status === 'Spoilt'   ? 'bg-stone-100 text-stone-500'
      : status === 'Poisoned' ? 'bg-purple-100 text-purple-700'
      : 'bg-stone-50 text-stone-400';
    const badgeText = status === 'Golden'
      ? (count === 2 ? "Chef's Kiss! ✨" : 'Nice Match! 👌')
      : status === 'Spoilt'   ? 'Too Many Cooks! 🍲'
      : status === 'Poisoned' ? 'Kitchen Nightmare! 🧪'
      : 'A Bit Pongy! 🤢';
    const card = document.createElement('div');
    card.className    = `jec-sift-card bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between${jecSousChefOversight ? ' cursor-pointer active:scale-95 transition-transform duration-100' : ''}`;
    card.dataset.norm = norm;
    card.innerHTML    = `
      <div>
        <p class="font-semibold text-stone-800">${display}</p>
        <p class="text-xs text-stone-400 mt-0.5">${chefs}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">${badgeText}</span>`;
    if (jecSousChefOversight) card.addEventListener('click', () => jecHandleOversightTap(norm));
    list.appendChild(card);
  });
}

function jecClearOversightHighlights() {
  document.querySelectorAll('.jec-sift-card').forEach(c => c.classList.remove('ring-2', 'ring-amber-400'));
  document.querySelectorAll('.jec-poison-chip').forEach(c => c.classList.remove('ring-2', 'ring-purple-500'));
}

function jecHandleOversightTap(norm) {
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
  // If normA is a pure poison word (not an ingredient), swap so the ingredient wins
  if (!jecWordFrequency[normA] && jecWordFrequency[normB]) { [normA, normB] = [normB, normA]; }
  // If neither is in the freq map, nothing to merge
  if (!jecWordFrequency[normA] && !jecWordFrequency[normB]) return;
  jecWordFrequency[normA] = (jecWordFrequency[normA] || 0) + (jecWordFrequency[normB] || 0);
  jecMergeMap[normB]      = normA;
  jecDisplayWords[normA]  = `${jecDisplayWords[normA] || normA} / ${jecDisplayWords[normB] || normB}`;
  // poison propagates: if either word was poisoned, the merged result is poisoned
  if (jecPoisonedNorms.has(normA) || jecPoisonedNorms.has(normB)) {
    jecPoisonedNorms.add(normA);
  }
  jecPoisonedNorms.delete(normB);
  delete jecWordFrequency[normB];
  delete jecDisplayWords[normB];

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast updated sifting state so all clients re-render
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_MERGE',
      jecWordFrequency: {...jecWordFrequency},
      jecDisplayWords:  {...jecDisplayWords},
      jecMergeMap:      {...jecMergeMap},
      jecPoisonedNorms: [...jecPoisonedNorms],
    }});
  }
}

// ── JEC Round scoring ─────────────────────────────────────────────────────────
function jecCalcRoundScores() {
  const roundScores = Array(jecPlayerCount).fill(0);
  for (let p = 0; p < jecPlayerCount; p++) {
    for (let j = 0; j < jecInputs[p].length; j++) {
      const raw = jecInputs[p][j];
      let norm  = normaliseWord(raw.trim());
      let steps = 0;
      while (jecMergeMap[norm] && steps < 10) { norm = jecMergeMap[norm]; steps++; }
      const count        = jecWordFrequency[norm] || 0;
      const isPoisoned   = jecKitchenNightmares && jecPoisonedNorms.has(norm);
      const isSignature  = jecKitchenNightmares && jecSignatures[p] === j;
      if (!isPoisoned) {
        // Opt-in penalties take priority over tier rewards
        if (count === 1 && jecRottenPenalty) {
          roundScores[p] -= 5;
        } else if (count === jecPlayerCount && jecSpoiltPenalty) {
          roundScores[p] -= count * 2;
        } else {
          const pts = jecCalcPoints(count, jecPlayerCount);
          if (pts > 0) roundScores[p] += isSignature ? pts * 2 : pts;
        }
      }
      // Poisoned: 0 pts regardless of penalty settings
    }
    jecScores[p] += roundScores[p];
  }
  jecRoundLog.push({ order: jecCurrentWord, scores: [...roundScores] });
  return roundScores;
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
  document.getElementById('btn-jec-tally-next').textContent =
    jecRound < jecRounds ? 'Next Course 🍽️' : 'Final Wash-up 🏆';
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
  jecPoisons          = [];
  jecWordFrequency    = {};
  jecDisplayWords     = {};
  jecMergeMap         = {};
  jecRoundLog         = [];
  jecCurrentPlayerIdx  = 0;
  jecOversightSelected = null;
  jecOversightPendingA = null;
  jecOversightPendingB = null;
  jecPoisonedNorms     = new Set();
  showScreen('screen-jec-menu');
}

// ── Washup screen listeners ───────────────────────────────────────────────────
document.getElementById('btn-jec-new-game').addEventListener('click', () => {
  playPillClick();
  const confirmBtn = document.getElementById('btn-jec-new-shift-start');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby 🔄';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'Yeah, fire it up! 🍳';
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
  playLaunch();
  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: Host triggers next phase for all devices
    if (jecRound < jecRounds) {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'JEC_NEXT_ROUND' } });
    } else {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'JEC_WASHUP', scores: [...jecScores], roundLog: jecRoundLog } });
    }
  }
  if (jecRound < jecRounds) {
    jecStartRound();
  } else {
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
  if (jecWordPool.length === 0) {
    if (isSecretMode && secretWords && secretWords.length) {
      const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
      jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
    } else {
      jecWordPool = jecBuildFoodPool(allWords);
    }
  }
  jecCurrentWord = jecWordPool.pop();
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
  if (ov.jecRottenPenalty     !== undefined) jecRottenPenalty     = ov.jecRottenPenalty;
  if (ov.jecSpoiltPenalty     !== undefined) jecSpoiltPenalty     = ov.jecSpoiltPenalty;
  if (ov.jecKitchenNightmares !== undefined) jecKitchenNightmares = ov.jecKitchenNightmares;
  // In Secret Mode, use expansion words filtered to food category; fall back to all expansion words
  if (secretWords && secretWords.length) {
    const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
    jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
  }
}
