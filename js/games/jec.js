// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Just Enough Cooks (jec)
// Mechanic: Social sync — players enter 3 ingredients for a secret food item.
// The Golden Zone = 2 to floor(N × 0.7) matching ingredients. Won't Spoil the Broth!
// Depends on: engine.js (normaliseWord, audio, showScreen, resetToLobby), li5.js (allWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── JEC Settings ──────────────────────────────────────────────────────────────
let jecRounds            = 3;     // 3 | 5 | 10
let jecGoldenScore       = 20;    // pts per Golden ingredient: 10 | 20 | 30
let jecRottenPenalty     = true;  // −10 pts for unique words (Rotten)
let jecSpoiltPenalty     = true;  // −10 pts for overcrowded words (Spoilt)
let jecSousChefOversight = true;  // manual merge before tally
let jecKitchenNightmares = false; // Sylly Mode

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

// ── Lobby → JEC Menu ──────────────────────────────────────────────────────────
document.getElementById('btn-jec').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'jec';
  showScreen('screen-jec-menu');
});

// ── JEC Menu ──────────────────────────────────────────────────────────────────
document.getElementById('btn-jec-menu-play').addEventListener('click', () => {
  playLaunch();
  jecInitRoster();
  showScreen('screen-jec-roster');
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
  const body = el.querySelector('.overflow-y-auto');
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
  btn.className   = jecSousChefOversight ? 'sylly-toggle-on' : 'sylly-toggle-off';
});

document.getElementById('btn-jec-sylly-toggle').addEventListener('click', () => {
  jecKitchenNightmares = !jecKitchenNightmares;
  const btn = document.getElementById('btn-jec-sylly-toggle');
  btn.textContent = jecKitchenNightmares ? 'ON' : 'OFF';
  btn.className   = jecKitchenNightmares ? 'sylly-toggle-on' : 'sylly-toggle-off';
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

document.getElementById('btn-jec-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-settings-overlay').style.display = 'none';
});

// ── JEC Roster (Kitchen Roster) ───────────────────────────────────────────────
function jecInitRoster() {
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

// ── JEC Game start ────────────────────────────────────────────────────────────
async function jecStartGame() {
  await loadWords();
  jecWordPool = shuffle(allWords.filter(w => w.category === 'food').map(w => w.word));
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
      jecWordPool = shuffle(allWords.filter(w => w.category === 'food').map(w => w.word));
    }
  }
  jecCurrentWord      = jecWordPool.pop();
  jecCurrentPlayerIdx = 0;
  jecInputs           = Array.from({ length: jecPlayerCount }, () => ['', '', '']);
  if (jecKitchenNightmares) {
    jecSignatures = Array(jecPlayerCount).fill(-1);
    jecPoisons    = Array(jecPlayerCount).fill('');
  }
  jecShowOrderScreen();
}

function jecShowOrderScreen() {
  document.getElementById('jec-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-order-round').textContent = `Round ${jecRound} of ${jecRounds}`;
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
  if (count === 1) return 'Rotten';
  if (count >= 2 && count <= Math.floor(N * 0.7)) return 'Golden';
  return 'Spoilt';
}

// Inverse proportional: 2-player match = full Sweet Spot score; scales down as count grows
function jecCalcGoldenPoints(count, N) {
  const goldenMax = Math.floor(N * 0.7);
  if (goldenMax <= 1) return jecGoldenScore;
  return Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax);
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
      : 'bg-green-100 text-green-700';
    const badgeText = status === 'Golden'
      ? "Chef's Kiss! ✨"
      : status === 'Spoilt'   ? 'Too Many Cooks!'
      : status === 'Poisoned' ? 'Kitchen Nightmare! 🧪'
      : 'A Bit Pongy!';
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
      const isPoisoned   = jecKitchenNightmares && jecPoisonedNorms.has(norm);
      const status       = isPoisoned ? 'Poisoned' : getIngredientStatus(jecWordFrequency[norm] || 0, jecPlayerCount);
      const isSignature  = jecKitchenNightmares && jecSignatures[p] === j;
      if (status === 'Golden') {
        const pts = jecCalcGoldenPoints(jecWordFrequency[norm] || 0, jecPlayerCount);
        roundScores[p] += isSignature ? pts * 2 : pts;
      } else if (status === 'Spoilt' && jecSpoiltPenalty) {
        roundScores[p] -= (jecWordFrequency[norm] || 0) * 2;
      } else if (status === 'Rotten' && jecRottenPenalty) {
        roundScores[p] -= 10;
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
    const medal = medals[i] || `${i + 1}.`;
    const isTied = p.score === topScore && i > 0;
    const card = document.createElement('div');
    card.className = `bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3${i === 0 ? ' border-2 border-amber-400' : ''}`;
    card.innerHTML = `
      <span class="text-2xl w-8 text-center">${medal}</span>
      <div class="flex-1">
        <p class="font-semibold text-stone-800">${p.name}</p>
      </div>
      <span class="text-xl font-bold ${i === 0 ? 'text-amber-600' : 'text-stone-400'}">${p.score} pts</span>`;
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
  document.getElementById('jec-new-shift-overlay').style.display = 'flex';
});

document.getElementById('btn-jec-washup-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

document.getElementById('btn-jec-new-shift-start').addEventListener('click', () => {
  playLaunch();
  document.getElementById('jec-new-shift-overlay').style.display = 'none';
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
  jecStartPlayerPrep(0);
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
