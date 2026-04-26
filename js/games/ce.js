// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Close Enough (ce)
// Mechanic: Players estimate a Number + Metric for a subjective prompt, then
//           vote on each other's answers via ranked choice to score points.
// Depends on: engine.js (audio, showScreen, resetToLobby), engine.js (allWords unused)
// ═══════════════════════════════════════════════════════════════════════════════

// ── CE Settings ───────────────────────────────────────────────────────────────
let ceRounds     = 5;              // 3 | 5 | 8
let ceDecider    = 'close-enough'; // 'close-enough' | 'only-one'
let ceFullTally  = false;          // false = top-3 only | true = Wall of Shame (rank all)
let ceSaboteur   = false;          // Sylly Mode — injects a Ghost Card each round

// ── CE State ──────────────────────────────────────────────────────────────────
let cePlayerCount     = 4;
let cePlayerNames     = [];
let ceRound           = 0;
let ceScores          = [];        // [playerIdx] → cumulative score
let ceRoundLog        = [];        // [{promptText, inputs, rankings, roundPoints}]
let cePromptPool      = [];        // shuffled array of prompt objects, drawn from end
let ceCurrentPrompt   = null;      // {id, text, saboteurs}
let ceCurrentSaboteur = null;      // {number, metric} | null when Sylly off
let ceInputs          = [];        // [{playerIdx, number, metric}] — submission order
let ceCurrentInputIdx = 0;         // index into cePlayerNames for CE_INPUT loop
let ceLineup              = [];     // [{number, metric, playerIdx, isGhost}] sorted low→high
let ceVotes               = [];     // [{voterIdx, rankings: [lineupIdx...]}]
let ceCurrentVoterIdx     = 0;
let cePassPhase           = 'input'; // 'input' | 'vote' | 'sd'
let ceCurrentVoteRankings = [];     // [lineupIdx...] current voter's picks in order
let ceCurrVoteEntries     = [];     // voteable lineup entries for current voter
let ceCurrVoteRequired    = 0;      // ranks needed to submit
// Sudden Death (Only One mode)
const CE_SUDDEN_DEATH_QS = [
  "On a scale of 1–100, how much do you want to see your opponent lose?",
  "How many years of luck are you willing to trade for this win?",
  "How many 'I'm not mad' lies have you told this session?",
];
let ceSuddenDeathQ        = '';   // selected question
let ceSuddenDeathPlayers  = [];   // [playerIdx...] tied finalists
let ceSuddenDeathInputs   = [];   // [{playerIdx, number}]
let ceSuddenDeathInputIdx = 0;    // current finalist's turn
let ceDataLoaded      = false;
let ceAllPrompts      = [];        // raw data from ce-data.json

// ── Load CE data ──────────────────────────────────────────────────────────────
async function ceLoadData() {
  if (ceDataLoaded) return;
  const res  = await fetch('data/ce-data.json');
  ceAllPrompts = await res.json();
  ceDataLoaded = true;
}

// ── Lobby → CE Menu ───────────────────────────────────────────────────────────
document.getElementById('btn-ce').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'ce';
  showScreen('screen-ce-menu');
});

// ── CE Menu ───────────────────────────────────────────────────────────────────
document.getElementById('btn-ce-menu-play').addEventListener('click', () => {
  playLaunch();
  ceShowSetup();
  showScreen('screen-ce-setup');
});

document.getElementById('btn-ce-menu-how-to').addEventListener('click', () => {
  playDone();
  document.getElementById('ce-how-to-overlay').style.display = 'flex';
  document.getElementById('ce-how-to-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
});

document.getElementById('btn-ce-menu-settings').addEventListener('click', () => {
  playDone();
  document.getElementById('ce-settings-overlay').style.display = 'flex';
  document.getElementById('ce-settings-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
});

document.getElementById('btn-ce-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── CE Settings ───────────────────────────────────────────────────────────────
document.querySelectorAll('[data-ce-rounds]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ceRounds = parseInt(btn.dataset.ceRounds);
    document.querySelectorAll('[data-ce-rounds]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.ceRounds) === ceRounds ? ' pill-active-orange' : ''}`;
    });
  });
});

document.querySelectorAll('[data-ce-decider]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ceDecider = btn.dataset.ceDecider;
    document.querySelectorAll('[data-ce-decider]').forEach(b => {
      b.className = `pill${b.dataset.ceDecider === ceDecider ? ' pill-active-orange' : ''}`;
    });
  });
});

document.getElementById('btn-ce-full-tally-toggle').addEventListener('click', () => {
  ceFullTally = !ceFullTally;
  const btn = document.getElementById('btn-ce-full-tally-toggle');
  btn.textContent = ceFullTally ? 'ON' : 'OFF';
  btn.className   = ceFullTally ? 'sylly-toggle-on shrink-0' : 'sylly-toggle-off shrink-0';
  playPillClick();
});

document.getElementById('btn-ce-sylly-toggle').addEventListener('click', () => {
  ceSaboteur = !ceSaboteur;
  const btn = document.getElementById('btn-ce-sylly-toggle');
  btn.textContent = ceSaboteur ? 'ON' : 'OFF';
  btn.className   = ceSaboteur ? 'sylly-toggle-on shrink-0' : 'sylly-toggle-off shrink-0';
  ceSaboteur ? playSyllyOn() : playSyllyOff();
});

document.getElementById('btn-ce-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('ce-settings-overlay').style.display = 'none';
});

document.getElementById('btn-ce-how-to-close').addEventListener('click', () => {
  playDone();
  document.getElementById('ce-how-to-overlay').style.display = 'none';
});

// ── CE Setup screen ───────────────────────────────────────────────────────────
function ceShowSetup() {
  document.querySelectorAll('[data-ce-player-count]').forEach(b => {
    b.className = `pill${parseInt(b.dataset.cePlayerCount) === cePlayerCount ? ' pill-active-orange' : ''}`;
  });
  ceUpdatePlayerFields();
}

document.querySelectorAll('[data-ce-player-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    cePlayerCount = parseInt(btn.dataset.cePlayerCount);
    document.querySelectorAll('[data-ce-player-count]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.cePlayerCount) === cePlayerCount ? ' pill-active-orange' : ''}`;
    });
    ceUpdatePlayerFields();
  });
});

function ceUpdatePlayerFields() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`ce-player-${i}`);
    if (el) el.closest('.ce-player-row').style.display = i <= cePlayerCount ? '' : 'none';
  }
}

document.getElementById('btn-ce-setup-back').addEventListener('click', () => {
  playExit();
  showScreen('screen-ce-menu');
});

document.getElementById('btn-ce-setup-confirm').addEventListener('click', async () => {
  cePlayerNames = [];
  for (let i = 1; i <= cePlayerCount; i++) {
    const val = (document.getElementById(`ce-player-${i}`)?.value || '').trim();
    cePlayerNames.push(val || `Estimator ${i}`);
  }
  playLaunch();
  await ceStartGame();
});

// ── CE Game start ─────────────────────────────────────────────────────────────
async function ceStartGame() {
  await ceLoadData();
  ceRound               = 0;
  ceScores              = Array(cePlayerCount).fill(0);
  ceRoundLog            = [];
  ceVotes               = [];
  ceCurrentVoterIdx     = 0;
  ceSuddenDeathQ        = '';
  ceSuddenDeathPlayers  = [];
  ceSuddenDeathInputs   = [];
  ceSuddenDeathInputIdx = 0;
  cePromptPool          = shuffle([...ceAllPrompts]);
  ceStartRound();
}

function ceStartRound() {
  ceRound++;
  ceInputs          = [];
  ceCurrentInputIdx = 0;
  ceLineup          = [];
  ceCurrentPrompt   = cePromptPool.pop();
  ceCurrentSaboteur = ceSaboteur
    ? ceCurrentPrompt.saboteurs[Math.floor(Math.random() * ceCurrentPrompt.saboteurs.length)]
    : null;

  document.getElementById('ce-prompt-round-label').textContent = `Inquiry ${ceRound} of ${ceRounds}`;
  document.getElementById('ce-prompt-text').textContent        = ceCurrentPrompt.text;
  showScreen('screen-ce-prompt');
}

document.getElementById('btn-ce-prompt-start').addEventListener('click', () => {
  playLaunch();
  ceShowPassGate();
});

// ── Pass Gate ─────────────────────────────────────────────────────────────────
function ceShowPassGate() {
  cePassPhase = 'input';
  document.getElementById('ce-pass-name').textContent = `${cePlayerNames[ceCurrentInputIdx]}! 👀`;
  showScreen('screen-ce-pass');
}

document.getElementById('btn-ce-pass-ready').addEventListener('click', () => {
  playLaunch();
  if (cePassPhase === 'vote') ceShowVoteInput();
  else if (cePassPhase === 'sd') ceShowSDInput();
  else ceShowInput();
});

// ── CE Input screen ───────────────────────────────────────────────────────────
function ceShowInput() {
  const name = cePlayerNames[ceCurrentInputIdx];
  document.getElementById('ce-input-player-label').textContent = `${name}'s Ballpark`;
  document.getElementById('ce-input-prompt-text').textContent  = ceCurrentPrompt.text;
  document.getElementById('ce-input-number').value             = '';
  document.getElementById('ce-input-metric').value             = '';
  document.getElementById('ce-input-error').textContent        = '';
  showScreen('screen-ce-input');
  document.getElementById('ce-input-number').focus();
}

// Enforce integer-only input: strip anything that isn't a digit
document.getElementById('ce-input-number').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7); // max 7 digits = 1,000,000
});

document.getElementById('btn-ce-input-confirm').addEventListener('click', () => {
  const rawNum = document.getElementById('ce-input-number').value.trim();
  const metric = document.getElementById('ce-input-metric').value.trim();
  const errEl  = document.getElementById('ce-input-error');

  if (!rawNum) { errEl.textContent = 'Enter a number first.'; return; }

  const num = parseInt(rawNum, 10);
  if (num > 1_000_000) { errEl.textContent = 'Keep it under a million!'; return; }
  if (!metric)         { errEl.textContent = 'Give it a metric!'; return; }

  ceInputs.push({ playerIdx: ceCurrentInputIdx, number: num, metric });
  ceCurrentInputIdx++;

  if (ceCurrentInputIdx < cePlayerCount) {
    ceShowPassGate();
  } else {
    ceShowReveal(); // Piece 2
  }
});

// ── Mid-game quit ─────────────────────────────────────────────────────────────
document.getElementById('btn-ce-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('ce-quit-overlay').style.display = 'none';
  showScreen('screen-ce-menu');
});

document.getElementById('btn-ce-quit-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ce-quit-overlay').style.display = 'none';
});

document.querySelectorAll('.btn-ce-quit-open').forEach(btn => {
  btn.addEventListener('click', () => {
    playExit();
    document.getElementById('ce-quit-overlay').style.display = 'flex';
  });
});

// ── CE Reveal (Piece 2) ───────────────────────────────────────────────────────
function ceShowReveal() {
  // Sort submissions low→high, tag as non-ghost
  ceLineup = [...ceInputs]
    .sort((a, b) => a.number - b.number)
    .map(e => ({ number: e.number, metric: e.metric, playerIdx: e.playerIdx, isGhost: false }));

  // Inject saboteur ghost card at its natural sorted position
  if (ceSaboteur && ceCurrentSaboteur) {
    const ghost    = { number: ceCurrentSaboteur.number, metric: ceCurrentSaboteur.metric, playerIdx: -1, isGhost: true };
    const insertAt = ceLineup.findIndex(e => e.number > ghost.number);
    if (insertAt === -1) ceLineup.push(ghost);
    else ceLineup.splice(insertAt, 0, ghost);
  }

  document.getElementById('ce-reveal-round-label').textContent = `Inquiry ${ceRound} of ${ceRounds}`;
  document.getElementById('ce-reveal-prompt-text').textContent  = ceCurrentPrompt.text;

  const container = document.getElementById('ce-lineup-cards');
  container.innerHTML = '';
  ceLineup.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4';
    card.innerHTML = `
      <span class="text-2xl font-bold text-orange-500 min-w-[4rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
      <span class="text-stone-700 font-semibold text-base leading-snug">${entry.metric}</span>
    `;
    container.appendChild(card);
  });

  showScreen('screen-ce-reveal');
}

document.getElementById('btn-ce-reveal-next').addEventListener('click', () => {
  playLaunch();
  ceShowVotePassGate();
});

// ── CE Vote (Piece 3) ─────────────────────────────────────────────────────────
function ceShowVotePassGate() {
  cePassPhase = 'vote';
  document.getElementById('ce-pass-name').textContent = `${cePlayerNames[ceCurrentVoterIdx]}! 🏆`;
  showScreen('screen-ce-pass');
}

function ceShowVoteInput() {
  ceCurrentVoteRankings = [];
  ceCurrVoteEntries = ceLineup
    .map((entry, idx) => ({ ...entry, lineupIdx: idx }))
    .filter(entry => entry.playerIdx !== ceCurrentVoterIdx);
  ceCurrVoteRequired = ceFullTally
    ? ceCurrVoteEntries.length
    : Math.min(3, ceCurrVoteEntries.length);

  document.getElementById('ce-vote-round-label').textContent  = `Inquiry ${ceRound} of ${ceRounds}`;
  document.getElementById('ce-vote-player-label').textContent = `${cePlayerNames[ceCurrentVoterIdx]}'s Verdict`;
  document.getElementById('ce-vote-prompt-text').textContent  = ceCurrentPrompt.text;
  document.getElementById('ce-vote-instruction').textContent  = ceFullTally
    ? `Rank all ${ceCurrVoteRequired} entries — best first.`
    : `Rank your top ${ceCurrVoteRequired} — best first.`;
  document.getElementById('ce-vote-error').textContent = '';

  ceRenderVoteCards();
  showScreen('screen-ce-vote');
}

function ceRenderVoteCards() {
  const container = document.getElementById('ce-vote-cards');
  container.innerHTML = '';
  const labels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  ceCurrVoteEntries.forEach(entry => {
    const rankPos = ceCurrentVoteRankings.indexOf(entry.lineupIdx);
    const ranked  = rankPos !== -1;

    const card = document.createElement('div');
    card.className = `${ranked ? 'bg-orange-50 border border-orange-200' : 'bg-white'} rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition-all duration-100`;
    card.innerHTML = `
      <span class="text-xl font-bold text-orange-500 min-w-[3.5rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
      <span class="text-stone-700 font-semibold text-base leading-snug flex-1">${entry.metric}</span>
      <span class="${ranked ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-400'} w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
        ${ranked ? (labels[rankPos] || `#${rankPos + 1}`) : '?'}
      </span>
    `;
    card.addEventListener('click', () => {
      const pos = ceCurrentVoteRankings.indexOf(entry.lineupIdx);
      if (pos !== -1) {
        ceCurrentVoteRankings.splice(pos, 1);
      } else if (ceCurrentVoteRankings.length < ceCurrVoteRequired) {
        ceCurrentVoteRankings.push(entry.lineupIdx);
      }
      ceRenderVoteCards();
    });
    container.appendChild(card);
  });
}

document.getElementById('btn-ce-vote-submit').addEventListener('click', () => {
  const errEl  = document.getElementById('ce-vote-error');
  const needed = ceCurrVoteRequired - ceCurrentVoteRankings.length;
  if (needed > 0) {
    errEl.textContent = `Rank ${needed} more entr${needed === 1 ? 'y' : 'ies'} to continue.`;
    return;
  }
  playDone();
  ceVotes.push({ voterIdx: ceCurrentVoterIdx, rankings: [...ceCurrentVoteRankings] });
  ceCurrentVoterIdx++;

  if (ceCurrentVoterIdx < cePlayerCount) {
    ceShowVotePassGate();
  } else {
    ceComputeAndShowResults();
  }
});

// ── CE Score calculation ───────────────────────────────────────────────────────
function ceComputeAndShowResults() {
  const VOTE_PTS = [3, 2, 1];
  const roundPts = Array(ceLineup.length).fill(0);

  ceVotes.forEach(vote => {
    vote.rankings.forEach((lineupIdx, rank) => {
      if (rank < VOTE_PTS.length) roundPts[lineupIdx] += VOTE_PTS[rank];
    });
  });

  // Ghost win check: compare ghost's 1st-place votes against best human's
  const ghostIdx = ceLineup.findIndex(e => e.isGhost);
  let ghostWins  = false;
  if (ghostIdx !== -1) {
    const ghostFirst    = ceVotes.filter(v => v.rankings[0] === ghostIdx).length;
    const maxHumanFirst = Math.max(...ceLineup.map((e, i) => e.isGhost ? 0 : ceVotes.filter(v => v.rankings[0] === i).length));
    ghostWins = ghostFirst > maxHumanFirst;
    if (ghostWins) {
      for (let i = 0; i < cePlayerCount; i++) ceScores[i] -= 2;
    }
  }

  // Round winner: highest vote pts among humans
  const maxRoundPts = Math.max(...ceLineup.map((e, i) => e.isGhost ? -Infinity : roundPts[i]));

  // Apply round points + winner bonus to cumulative scores
  ceLineup.forEach((entry, idx) => {
    if (!entry.isGhost) {
      ceScores[entry.playerIdx] += roundPts[idx];
      if (roundPts[idx] === maxRoundPts && maxRoundPts > 0) {
        ceScores[entry.playerIdx] += 2;
      }
    }
  });

  ceShowResults(roundPts, ghostIdx, ghostWins, maxRoundPts);
}

function ceShowResults(roundPts, ghostIdx, ghostWins, maxRoundPts) {
  document.getElementById('ce-results-round-label').textContent      = `Inquiry ${ceRound} of ${ceRounds}`;
  document.getElementById('ce-results-prompt-text').textContent      = ceCurrentPrompt.text;
  document.getElementById('ce-results-ghost-banner').style.display   = ghostWins ? '' : 'none';

  // Result cards
  const cardContainer = document.getElementById('ce-results-cards');
  cardContainer.innerHTML = '';
  ceLineup.forEach((entry, idx) => {
    const pts      = roundPts[idx];
    const isWinner = !entry.isGhost && pts === maxRoundPts && maxRoundPts > 0;
    const total    = pts + (isWinner ? 2 : 0);
    const author   = entry.isGhost ? '👻 The Saboteur' : cePlayerNames[entry.playerIdx];

    const card = document.createElement('div');
    card.className = `${entry.isGhost ? 'bg-stone-100 border border-stone-200' : isWinner ? 'bg-orange-50 border border-orange-200' : 'bg-white'} rounded-2xl p-4 shadow-sm`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xl font-bold text-orange-500 min-w-[3.5rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
        <span class="text-stone-700 font-semibold flex-1 leading-snug">${entry.metric}</span>
        ${entry.isGhost
          ? '<span class="text-stone-400 font-bold text-lg shrink-0">—</span>'
          : `<span class="${total > 0 ? 'text-orange-500' : total < 0 ? 'text-red-500' : 'text-stone-400'} font-bold text-lg shrink-0">${total > 0 ? '+' : ''}${total}</span>`}
      </div>
      <div class="mt-1.5 flex items-center justify-between">
        <span class="text-stone-400 text-sm">${author}</span>
        ${isWinner ? '<span class="text-xs font-semibold text-orange-400">Local Legend ✨ +2</span>' : ''}
      </div>
    `;
    cardContainer.appendChild(card);
  });

  // Running scores table
  const scoresContainer = document.getElementById('ce-results-scores');
  scoresContainer.innerHTML = '';
  [...ceScores.map((s, i) => ({ name: cePlayerNames[i], score: s }))]
    .sort((a, b) => b.score - a.score)
    .forEach((p, rank) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-2 border-b border-stone-100 last:border-0';
      row.innerHTML = `
        <span class="text-stone-700 font-semibold">${rank === 0 ? '🥇 ' : ''}${p.name}</span>
        <span class="text-stone-800 font-bold">${p.score} pts</span>
      `;
      scoresContainer.appendChild(row);
    });

  document.getElementById('btn-ce-results-next').textContent = ceRound >= ceRounds
    ? 'Final Standings 🏆'
    : 'Next Inquiry →';

  playSuccess();
  showScreen('screen-ce-results');
}

document.getElementById('btn-ce-results-next').addEventListener('click', () => {
  playLaunch();
  if (ceRound >= ceRounds) {
    ceShowGameOver();
  } else {
    ceCurrentVoterIdx = 0;
    ceVotes           = [];
    ceStartRound();
  }
});

// ── CE Game Over (Piece 4) ────────────────────────────────────────────────────
function ceShowGameOver() {
  const maxScore = Math.max(...ceScores);
  const winners  = ceScores.map((_, i) => i).filter(i => ceScores[i] === maxScore);

  if (ceDecider === 'only-one' && winners.length > 1) {
    ceStartSuddenDeath(winners);
  } else {
    ceShowFinalStandings(winners, false);
  }
}

function ceStartSuddenDeath(tiedPlayers) {
  ceSuddenDeathPlayers  = tiedPlayers;
  ceSuddenDeathInputs   = [];
  ceSuddenDeathInputIdx = 0;
  ceSuddenDeathQ        = CE_SUDDEN_DEATH_QS[Math.floor(Math.random() * CE_SUDDEN_DEATH_QS.length)];

  document.getElementById('ce-sd-tied-names').textContent = tiedPlayers.map(i => cePlayerNames[i]).join(' vs ');
  document.getElementById('ce-sd-question').textContent   = `"${ceSuddenDeathQ}"`;
  showScreen('screen-ce-sd-intro');
}

document.getElementById('btn-ce-sd-begin').addEventListener('click', () => {
  playLaunch();
  ceShowSDPassGate();
});

function ceShowSDPassGate() {
  cePassPhase = 'sd';
  const playerIdx = ceSuddenDeathPlayers[ceSuddenDeathInputIdx];
  document.getElementById('ce-pass-name').textContent = `${cePlayerNames[playerIdx]}! ⚡`;
  showScreen('screen-ce-pass');
}

function ceShowSDInput() {
  const playerIdx = ceSuddenDeathPlayers[ceSuddenDeathInputIdx];
  document.getElementById('ce-sd-input-player-label').textContent = `${cePlayerNames[playerIdx]}'s Final Answer`;
  document.getElementById('ce-sd-input-question').textContent     = ceSuddenDeathQ;
  document.getElementById('ce-sd-input-number').value             = '';
  document.getElementById('ce-sd-input-error').textContent        = '';
  showScreen('screen-ce-sd-input');
  document.getElementById('ce-sd-input-number').focus();
}

document.getElementById('ce-sd-input-number').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
});

document.getElementById('btn-ce-sd-input-confirm').addEventListener('click', () => {
  const rawNum = document.getElementById('ce-sd-input-number').value.trim();
  const errEl  = document.getElementById('ce-sd-input-error');
  if (!rawNum) { errEl.textContent = 'Enter a number first.'; return; }
  const num = parseInt(rawNum, 10);
  if (num > 1_000_000) { errEl.textContent = 'Keep it under a million!'; return; }

  ceSuddenDeathInputs.push({ playerIdx: ceSuddenDeathPlayers[ceSuddenDeathInputIdx], number: num });
  ceSuddenDeathInputIdx++;

  if (ceSuddenDeathInputIdx < ceSuddenDeathPlayers.length) {
    ceShowSDPassGate();
  } else {
    ceResolveSuddenDeath();
  }
});

function ceResolveSuddenDeath() {
  const maxNum    = Math.max(...ceSuddenDeathInputs.map(e => e.number));
  const sdWinners = ceSuddenDeathInputs.filter(e => e.number === maxNum).map(e => e.playerIdx);
  ceShowFinalStandings(sdWinners, true);
}

function ceShowFinalStandings(winners, afterSD) {
  const standings = ceScores
    .map((s, i) => ({ name: cePlayerNames[i], score: s, playerIdx: i }))
    .sort((a, b) => b.score - a.score);

  const container = document.getElementById('ce-gameover-standings');
  container.innerHTML = '';
  standings.forEach((p, rank) => {
    const isWinner = winners.includes(p.playerIdx);
    const medal    = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
    const row      = document.createElement('div');
    row.className  = `${isWinner ? 'bg-orange-50 border border-orange-200' : 'bg-white'} rounded-2xl p-4 shadow-sm flex items-center gap-3`;
    row.innerHTML  = `
      <span class="text-xl shrink-0">${medal}</span>
      <div class="flex-1 min-w-0">
        <p class="text-stone-800 font-bold truncate">${p.name}</p>
        ${isWinner ? '<p class="text-orange-400 text-xs font-semibold">The Local Legend ✨</p>' : ''}
      </div>
      <span class="text-stone-800 font-bold text-lg shrink-0">${p.score} pts</span>
    `;
    container.appendChild(row);
  });

  // SD reveal block
  const sdReveal = document.getElementById('ce-gameover-sd-reveal');
  if (sdReveal) {
    sdReveal.style.display = afterSD ? '' : 'none';
    if (afterSD) {
      const sdContainer = document.getElementById('ce-gameover-sd-answers');
      sdContainer.innerHTML = '';
      [...ceSuddenDeathInputs]
        .sort((a, b) => b.number - a.number)
        .forEach(entry => {
          const isSDWinner = winners.includes(entry.playerIdx);
          const row        = document.createElement('div');
          row.className    = 'flex items-center justify-between py-1';
          row.innerHTML    = `
            <span class="text-stone-700 font-semibold">${isSDWinner ? '⚡ ' : ''}${cePlayerNames[entry.playerIdx]}</span>
            <span class="font-bold ${isSDWinner ? 'text-orange-500' : 'text-stone-400'}">${entry.number.toLocaleString()}</span>
          `;
          sdContainer.appendChild(row);
        });
    }
  }

  playSuccess();
  showScreen('screen-ce-gameover');
}

document.getElementById('btn-ce-play-again').addEventListener('click', async () => {
  playLaunch();
  await ceStartGame();
});

document.getElementById('btn-ce-gameover-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── CE teardown (called by engine.js resetToLobby) ────────────────────────────
function resetCloseEnough() {
  document.getElementById('ce-quit-overlay').style.display     = 'none';
  document.getElementById('ce-settings-overlay').style.display = 'none';
  document.getElementById('ce-how-to-overlay').style.display   = 'none';
  ceRound               = 0;
  ceScores              = [];
  ceInputs              = [];
  ceLineup              = [];
  ceVotes               = [];
  ceCurrentInputIdx     = 0;
  ceCurrentVoterIdx     = 0;
  cePassPhase           = 'input';
  ceCurrentVoteRankings = [];
  ceCurrVoteEntries     = [];
  ceCurrVoteRequired    = 0;
  ceCurrentPrompt       = null;
  ceCurrentSaboteur     = null;
  cePromptPool          = [];
  ceRoundLog            = [];
  ceSuddenDeathQ        = '';
  ceSuddenDeathPlayers  = [];
  ceSuddenDeathInputs   = [];
  ceSuddenDeathInputIdx = 0;
}
