// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: You Get It? (ygi)
// Mechanic: Players estimate a Number + Metric for a subjective prompt, then
//           vote on each other's answers via ranked choice to score points.
// Depends on: engine.js (audio, showScreen, resetToLobby), engine.js (allWords unused)
// ═══════════════════════════════════════════════════════════════════════════════

// ── CE Settings ───────────────────────────────────────────────────────────────
let ygiRounds       = 3;              // 3 | 5 | 8
let ygiDecider      = 'close-enough'; // 'close-enough' | 'only-one'
let ygiFullTally    = false;          // false = top-3 only | true = rank all
let ygiVerdictStyle = 'secret-ballot'; // 'secret-ballot' | 'open-ballpark'
let ygiRinger     = false;          // Sylly Mode — injects a Ghost Card each round

// ── CE State ──────────────────────────────────────────────────────────────────
let ygiPlayerCount     = 4;
let ygiPlayerNames     = [];
let ygiRound           = 0;
let ygiScores          = [];        // [playerIdx] → cumulative score
let ygiRoundLog        = [];        // [{round, prompt, entries[]}]
let ygiRoundLogIdx     = 0;
let ygiPromptPool      = [];        // shuffled array of prompt objects, drawn from end
let ygiCurrentPrompt   = null;      // {id, text, ringers}
let ygiCurrentRinger = null;      // {number, metric} | null when Sylly off
let ygiInputs          = [];        // [{playerIdx, number, metric}] — submission order
let ygiCurrentInputIdx = 0;         // index into ygiPlayerNames for YGI_INPUT loop
let ygiLineup              = [];     // [{number, metric, playerIdx, isGhost}] sorted low→high
let ygiVotes               = [];     // [{voterIdx, rankings: [lineupIdx...]}]
let ygiCurrentVoterIdx     = 0;
let ygiPassPhase           = 'input'; // 'input' | 'vote' | 'sd'
let ygiCurrentVoteRankings = [];     // [lineupIdx...] current voter's picks in order
let ygiCurrVoteEntries     = [];     // voteable lineup entries for current voter
let ygiCurrVoteRequired    = 0;      // ranks needed to submit
// Sudden Death (Only One mode)
const YGI_SUDDEN_DEATH_QS = [
  "On a scale of 1–100, how much do you want to see your opponent lose?",
  "How many years of luck are you willing to trade for this win?",
  "How many 'I'm not mad' lies have you told this session?",
];
let ygiSuddenDeathQ        = '';   // selected question
let ygiSuddenDeathPlayers  = [];   // [playerIdx...] tied finalists
let ygiSuddenDeathInputs   = [];   // [{playerIdx, number}]
let ygiSuddenDeathInputIdx = 0;    // current finalist's turn
let ygiDataLoaded      = false;
let ygiAllPrompts      = [];        // raw data from ygi-data.json

// ── Load CE data ──────────────────────────────────────────────────────────────
async function ygiLoadData() {
  if (ygiDataLoaded) return;
  const res  = await fetch('data/ygi-data.json');
  ygiAllPrompts = await res.json();
  ygiDataLoaded = true;
}

// ── Lobby → CE Menu ───────────────────────────────────────────────────────────
document.getElementById('btn-ygi').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'ce';
  showScreen('screen-ygi-menu');
});

// ── CE Menu ───────────────────────────────────────────────────────────────────
document.getElementById('btn-ygi-menu-play').addEventListener('click', () => {
  playLaunch();
  ygiShowSetup();
  showScreen('screen-ygi-setup');
});

document.getElementById('btn-ygi-menu-how-to').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-how-to-overlay').style.display = 'flex';
  document.getElementById('ygi-how-to-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
});

document.getElementById('btn-ygi-menu-settings').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-settings-overlay').style.display = 'flex';
  document.getElementById('ygi-settings-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
});

document.getElementById('btn-ygi-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── CE Settings ───────────────────────────────────────────────────────────────
document.querySelectorAll('[data-ygi-rounds]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ygiRounds = parseInt(btn.dataset.ygiRounds);
    document.querySelectorAll('[data-ygi-rounds]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.ygiRounds) === ygiRounds ? ' pill-active-orange' : ''}`;
    });
  });
});

document.querySelectorAll('[data-ygi-decider]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ygiDecider = btn.dataset.ygiDecider;
    document.querySelectorAll('[data-ygi-decider]').forEach(b => {
      b.className = `pill${b.dataset.ygiDecider === ygiDecider ? ' pill-active-orange' : ''}`;
    });
  });
});

document.querySelectorAll('[data-ygi-verdict]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ygiVerdictStyle = btn.dataset.ygiVerdict;
    document.querySelectorAll('[data-ygi-verdict]').forEach(b => {
      b.className = `pill${b.dataset.ygiVerdict === ygiVerdictStyle ? ' pill-active-orange' : ''}`;
    });
  });
});

document.getElementById('btn-ygi-full-tally-toggle').addEventListener('click', () => {
  ygiFullTally = !ygiFullTally;
  const btn = document.getElementById('btn-ygi-full-tally-toggle');
  btn.textContent = ygiFullTally ? 'ON' : 'OFF';
  btn.className   = ygiFullTally ? 'game-toggle-on-orange shrink-0' : 'sylly-toggle-off shrink-0';
  playPillClick();
});

document.getElementById('btn-ygi-sylly-toggle').addEventListener('click', () => {
  ygiRinger = !ygiRinger;
  const btn = document.getElementById('btn-ygi-sylly-toggle');
  btn.textContent = ygiRinger ? 'ON' : 'OFF';
  btn.className   = ygiRinger ? 'game-toggle-on-orange shrink-0' : 'sylly-toggle-off shrink-0';
  ygiRinger ? playSyllyOn() : playSyllyOff();
});

document.getElementById('btn-ygi-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-settings-overlay').style.display = 'none';
});

document.getElementById('btn-ygi-how-to-close').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-how-to-overlay').style.display = 'none';
});

// ── CE Setup screen ───────────────────────────────────────────────────────────
function ygiShowSetup() {
  document.querySelectorAll('[data-ygi-player-count]').forEach(b => {
    b.className = `pill${parseInt(b.dataset.ygiPlayerCount) === ygiPlayerCount ? ' pill-active-orange' : ''}`;
  });
  ygiUpdatePlayerFields();
}

document.querySelectorAll('[data-ygi-player-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ygiPlayerCount = parseInt(btn.dataset.ygiPlayerCount);
    document.querySelectorAll('[data-ygi-player-count]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.ygiPlayerCount) === ygiPlayerCount ? ' pill-active-orange' : ''}`;
    });
    ygiUpdatePlayerFields();
  });
});

function ygiUpdatePlayerFields() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`ygi-player-${i}`);
    if (el) el.closest('.ygi-player-row').style.display = i <= ygiPlayerCount ? '' : 'none';
  }
}

document.getElementById('btn-ygi-setup-back').addEventListener('click', () => {
  playExit();
  showScreen('screen-ygi-menu');
});

document.getElementById('btn-ygi-setup-confirm').addEventListener('click', async () => {
  ygiPlayerNames = [];
  for (let i = 1; i <= ygiPlayerCount; i++) {
    const val = (document.getElementById(`ygi-player-${i}`)?.value || '').trim();
    ygiPlayerNames.push(val || `Friend ${i}`);
  }
  playLaunch();
  await ygiStartGame();
});

// ── CE Game start ─────────────────────────────────────────────────────────────
async function ygiStartGame() {
  await ygiLoadData();
  ygiRound               = 0;
  ygiScores              = Array(ygiPlayerCount).fill(0);
  ygiRoundLog            = [];
  ygiRoundLogIdx         = 0;
  ygiVotes               = [];
  ygiCurrentVoterIdx     = 0;
  ygiSuddenDeathQ        = '';
  ygiSuddenDeathPlayers  = [];
  ygiSuddenDeathInputs   = [];
  ygiSuddenDeathInputIdx = 0;
  ygiPromptPool          = shuffle([...ygiAllPrompts]);
  ygiStartRound();
}

function ygiStartRound() {
  ygiRound++;
  ygiInputs          = [];
  ygiCurrentInputIdx = 0;
  ygiLineup          = [];
  ygiCurrentPrompt   = ygiPromptPool.pop();
  ygiCurrentRinger = ygiRinger
    ? ygiCurrentPrompt.ringers[Math.floor(Math.random() * ygiCurrentPrompt.ringers.length)]
    : null;

  document.getElementById('ygi-prompt-round-label').textContent = `Situation ${ygiRound} of ${ygiRounds}`;
  document.getElementById('ygi-prompt-text').textContent        = ygiCurrentPrompt.text;
  showScreen('screen-ygi-prompt');
}

document.getElementById('btn-ygi-prompt-start').addEventListener('click', () => {
  playLaunch();
  ygiShowPassGate();
});

// ── Pass Gate ─────────────────────────────────────────────────────────────────
function ygiShowPassGate() {
  ygiPassPhase = 'input';
  document.getElementById('ygi-pass-name').textContent = `${ygiPlayerNames[ygiCurrentInputIdx]}! 👀`;
  showScreen('screen-ygi-pass');
}

document.getElementById('btn-ygi-pass-ready').addEventListener('click', () => {
  playLaunch();
  if (ygiPassPhase === 'vote') ygiShowVoteInput();
  else if (ygiPassPhase === 'sd') ygiShowSDInput();
  else ygiShowInput();
});

// ── YGI Input screen ───────────────────────────────────────────────────────────
function ygiShowInput() {
  const name = ygiPlayerNames[ygiCurrentInputIdx];
  document.getElementById('ygi-input-player-label').textContent = `${name}'s Take`;
  document.getElementById('ygi-input-prompt-text').textContent  = ygiCurrentPrompt.text.replace('[ ]', '________');
  document.getElementById('ygi-input-number').value             = '';
  const metricEl = document.getElementById('ygi-input-metric');
  metricEl.value = '';
  metricEl.style.height = '';
  document.getElementById('ygi-input-error').textContent        = '';
  showScreen('screen-ygi-input');
  document.getElementById('ygi-input-number').focus();
}

// Enforce integer-only input: strip anything that isn't a digit
document.getElementById('ygi-input-number').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7); // max 7 digits = 1,000,000
});

// Auto-grow metric textarea as player types
document.getElementById('ygi-input-metric').addEventListener('input', e => {
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
});

document.getElementById('btn-ygi-input-confirm').addEventListener('click', () => {
  const rawNum = document.getElementById('ygi-input-number').value.trim();
  const metric = document.getElementById('ygi-input-metric').value.trim();
  const errEl  = document.getElementById('ygi-input-error');

  if (!rawNum) { errEl.textContent = 'Enter a number first.'; return; }

  const num = parseInt(rawNum, 10);
  if (num > 1_000_000) { errEl.textContent = 'Keep it under a million!'; return; }
  if (!metric)         { errEl.textContent = 'Give it a metric!'; return; }

  ygiInputs.push({ playerIdx: ygiCurrentInputIdx, number: num, metric });
  ygiCurrentInputIdx++;

  if (ygiCurrentInputIdx < ygiPlayerCount) {
    ygiShowPassGate();
  } else {
    ygiShowReveal(); // Piece 2
  }
});

// ── Mid-game quit ─────────────────────────────────────────────────────────────
document.getElementById('btn-ygi-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('ygi-quit-overlay').style.display = 'none';
  showScreen('screen-ygi-menu');
});

document.getElementById('btn-ygi-quit-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-quit-overlay').style.display = 'none';
});

document.querySelectorAll('.btn-ygi-quit-open').forEach(btn => {
  btn.addEventListener('click', () => {
    playExit();
    document.getElementById('ygi-quit-overlay').style.display = 'flex';
  });
});

// ── CE Reveal (Piece 2) ───────────────────────────────────────────────────────
function ygiShowReveal() {
  // Sort submissions low→high, tag as non-ghost
  ygiLineup = [...ygiInputs]
    .sort((a, b) => a.number - b.number)
    .map(e => ({ number: e.number, metric: e.metric, playerIdx: e.playerIdx, isGhost: false }));

  // Inject ringer ghost card at its natural sorted position
  if (ygiRinger && ygiCurrentRinger) {
    const ghost    = { number: ygiCurrentRinger.number, metric: ygiCurrentRinger.metric, playerIdx: -1, isGhost: true };
    const insertAt = ygiLineup.findIndex(e => e.number > ghost.number);
    if (insertAt === -1) ygiLineup.push(ghost);
    else ygiLineup.splice(insertAt, 0, ghost);
  }

  document.getElementById('ygi-reveal-round-label').textContent = `Situation ${ygiRound} of ${ygiRounds}`;
  document.getElementById('ygi-reveal-prompt-text').textContent  = ygiCurrentPrompt.text.replace('[ ]', '________');

  const container = document.getElementById('ygi-lineup-cards');
  container.innerHTML = '';
  ygiLineup.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4';
    card.innerHTML = `
      <span class="text-2xl font-bold text-orange-500 min-w-[4rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
      <span class="text-stone-700 font-semibold text-base leading-snug flex-1 min-w-0 break-words">${entry.metric}</span>
    `;
    container.appendChild(card);
  });

  showScreen('screen-ygi-reveal');
}

document.getElementById('btn-ygi-reveal-next').addEventListener('click', () => {
  playLaunch();
  if (ygiVerdictStyle === 'open-ballpark') {
    ygiShowOpenBallparkVote();
  } else {
    ygiShowVotePassGate();
  }
});

// ── CE Vote (Piece 3) ─────────────────────────────────────────────────────────
function ygiShowVotePassGate() {
  ygiPassPhase = 'vote';
  document.getElementById('ygi-pass-name').textContent = `${ygiPlayerNames[ygiCurrentVoterIdx]}! 🏆`;
  showScreen('screen-ygi-pass');
}

function ygiShowVoteInput() {
  ygiCurrentVoteRankings = [];
  ygiCurrVoteEntries = ygiLineup
    .map((entry, idx) => ({ ...entry, lineupIdx: idx }))
    .filter(entry => entry.playerIdx !== ygiCurrentVoterIdx);
  ygiCurrVoteRequired = ygiFullTally
    ? ygiCurrVoteEntries.length
    : Math.min(3, ygiCurrVoteEntries.length);

  document.getElementById('ygi-vote-round-label').textContent  = `Situation ${ygiRound} of ${ygiRounds}`;
  document.getElementById('ygi-vote-player-label').textContent = `${ygiPlayerNames[ygiCurrentVoterIdx]}'s Verdict`;
  document.getElementById('ygi-vote-prompt-text').textContent  = ygiCurrentPrompt.text.replace('[ ]', '________');
  document.getElementById('ygi-vote-instruction').textContent  = ygiFullTally
    ? `Rank all ${ygiCurrVoteRequired} entries — best first.`
    : `Rank your top ${ygiCurrVoteRequired} — best first.`;
  document.getElementById('ygi-vote-error').textContent = '';

  ygiRenderVoteCards();
  showScreen('screen-ygi-vote');
}

function ygiShowOpenBallparkVote() {
  ygiCurrentVoteRankings = [];
  ygiCurrVoteEntries     = ygiLineup.map((entry, idx) => ({ ...entry, lineupIdx: idx }));
  ygiCurrVoteRequired    = ygiFullTally ? ygiCurrVoteEntries.length : Math.min(3, ygiCurrVoteEntries.length);

  document.getElementById('ygi-vote-round-label').textContent  = `Situation ${ygiRound} of ${ygiRounds}`;
  document.getElementById('ygi-vote-player-label').textContent = 'The Consensus 🏟️️';
  document.getElementById('ygi-vote-prompt-text').textContent  = ygiCurrentPrompt.text.replace('[ ]', '________');
  document.getElementById('ygi-vote-instruction').textContent  = ygiFullTally
    ? `Rank all ${ygiCurrVoteEntries.length} entries together — best first.`
    : `Rank the top ${ygiCurrVoteRequired} together — best first.`;
  document.getElementById('ygi-vote-error').textContent        = '';
  document.getElementById('btn-ygi-vote-submit').textContent   = 'Lock In The Consensus';

  ygiRenderVoteCards();
  showScreen('screen-ygi-vote');
}

function ygiRenderVoteCards() {
  const container = document.getElementById('ygi-vote-cards');
  container.innerHTML = '';
  const labels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  ygiCurrVoteEntries.forEach(entry => {
    const rankPos = ygiCurrentVoteRankings.indexOf(entry.lineupIdx);
    const ranked  = rankPos !== -1;

    const card = document.createElement('div');
    card.className = `${ranked ? 'bg-orange-50 border border-orange-200' : 'bg-white'} rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition-all duration-100`;
    card.innerHTML = `
      <span class="text-xl font-bold text-orange-500 min-w-[3.5rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
      <span class="text-stone-700 font-semibold text-base leading-snug flex-1 min-w-0 break-words">${entry.metric}</span>
      <span class="${ranked ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-400'} w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
        ${ranked ? (labels[rankPos] || `#${rankPos + 1}`) : '?'}
      </span>
    `;
    card.addEventListener('click', () => {
      const pos = ygiCurrentVoteRankings.indexOf(entry.lineupIdx);
      if (pos !== -1) {
        ygiCurrentVoteRankings.splice(pos, 1);
      } else if (ygiCurrentVoteRankings.length < ygiCurrVoteRequired) {
        ygiCurrentVoteRankings.push(entry.lineupIdx);
      }
      ygiRenderVoteCards();
    });
    container.appendChild(card);
  });
}

document.getElementById('btn-ygi-vote-submit').addEventListener('click', () => {
  const errEl  = document.getElementById('ygi-vote-error');
  const needed = ygiCurrVoteRequired - ygiCurrentVoteRankings.length;
  if (needed > 0) {
    errEl.textContent = `Rank ${needed} more entr${needed === 1 ? 'y' : 'ies'} to continue.`;
    return;
  }
  playDone();
  if (ygiVerdictStyle === 'open-ballpark') {
    ygiVotes = Array.from({ length: ygiPlayerCount }, (_, i) => ({
      voterIdx: i, rankings: [...ygiCurrentVoteRankings]
    }));
    ygiComputeAndShowResults();
  } else {
    ygiVotes.push({ voterIdx: ygiCurrentVoterIdx, rankings: [...ygiCurrentVoteRankings] });
    ygiCurrentVoterIdx++;
    if (ygiCurrentVoterIdx < ygiPlayerCount) {
      ygiShowVotePassGate();
    } else {
      ygiComputeAndShowResults();
    }
  }
});

// ── CE Score calculation ───────────────────────────────────────────────────────
function ygiComputeAndShowResults() {
  const VOTE_PTS = [3, 2, 1];
  const roundPts = Array(ygiLineup.length).fill(0);

  ygiVotes.forEach(vote => {
    vote.rankings.forEach((lineupIdx, rank) => {
      if (rank < VOTE_PTS.length) roundPts[lineupIdx] += VOTE_PTS[rank];
    });
  });

  // Ghost win check: compare ghost's 1st-place votes against best human's
  const ghostIdx = ygiLineup.findIndex(e => e.isGhost);
  let ghostWins  = false;
  if (ghostIdx !== -1) {
    const ghostFirst    = ygiVotes.filter(v => v.rankings[0] === ghostIdx).length;
    const maxHumanFirst = Math.max(...ygiLineup.map((e, i) => e.isGhost ? 0 : ygiVotes.filter(v => v.rankings[0] === i).length));
    ghostWins = ghostFirst > maxHumanFirst;
    if (ghostWins) {
      for (let i = 0; i < ygiPlayerCount; i++) ygiScores[i] -= 2;
    }
  }

  // Round winner: highest vote pts among humans
  const maxRoundPts = Math.max(...ygiLineup.map((e, i) => e.isGhost ? -Infinity : roundPts[i]));

  // Apply round points + winner bonus to cumulative scores
  ygiLineup.forEach((entry, idx) => {
    if (!entry.isGhost) {
      ygiScores[entry.playerIdx] += roundPts[idx];
      if (roundPts[idx] === maxRoundPts && maxRoundPts > 0) {
        ygiScores[entry.playerIdx] += 2;
      }
    }
  });

  ygiShowResults(roundPts, ghostIdx, ghostWins, maxRoundPts);
}

function ygiShowResults(roundPts, ghostIdx, ghostWins, maxRoundPts) {
  document.getElementById('ygi-results-round-label').textContent      = `Situation ${ygiRound} of ${ygiRounds}`;
  document.getElementById('ygi-results-prompt-text').textContent      = ygiCurrentPrompt.text.replace('[ ]', '________');
  document.getElementById('ygi-results-ghost-banner').style.display   = ghostWins ? '' : 'none';

  // Result cards — winner(s) float to top, rest keep existing lineup order
  const cardContainer = document.getElementById('ygi-results-cards');
  cardContainer.innerHTML = '';
  const indexed = ygiLineup.map((entry, idx) => ({ entry, idx }));
  const displayOrder = [...indexed].sort((a, b) => {
    if (a.entry.isGhost) return 1;
    if (b.entry.isGhost) return -1;
    return roundPts[b.idx] - roundPts[a.idx];
  });
  displayOrder.forEach(({ entry, idx }) => {
    const pts      = roundPts[idx];
    const isWinner = !entry.isGhost && pts === maxRoundPts && maxRoundPts > 0;
    const total    = pts + (isWinner ? 2 : 0);
    const author   = entry.isGhost ? '👻 The Ringer' : ygiPlayerNames[entry.playerIdx];

    const card = document.createElement('div');
    card.className = `${entry.isGhost ? 'bg-stone-100 border border-stone-200' : isWinner ? 'bg-orange-50 border border-orange-200' : 'bg-white'} rounded-2xl p-4 shadow-sm`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xl font-bold text-orange-500 min-w-[3.5rem] text-right shrink-0">${entry.number.toLocaleString()}</span>
        <span class="text-stone-700 font-semibold flex-1 leading-snug min-w-0 break-words">${entry.metric}</span>
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

  // Running scores table — leader row gets gold tint
  const scoresContainer = document.getElementById('ygi-results-scores');
  scoresContainer.innerHTML = '';
  [...ygiScores.map((s, i) => ({ name: ygiPlayerNames[i], score: s }))]
    .sort((a, b) => b.score - a.score)
    .forEach((p, rank) => {
      const isLeader = rank === 0;
      const row = document.createElement('div');
      row.className = `flex items-center justify-between py-2 border-b border-stone-100 last:border-0${isLeader ? ' bg-amber-50 -mx-4 px-4 rounded-xl' : ''}`;
      const medal = rank === 0 ? '🥇 ' : rank === 1 ? '🥈 ' : rank === 2 ? '🥉 ' : '';
      row.innerHTML = `
        <span class="${isLeader ? 'text-amber-700' : 'text-stone-700'} font-semibold">${medal}${p.name}</span>
        <span class="${isLeader ? 'text-amber-600' : 'text-stone-800'} font-bold">${p.score} points</span>
      `;
      scoresContainer.appendChild(row);
    });

  document.getElementById('btn-ygi-results-next').textContent = ygiRound >= ygiRounds
    ? 'Final Standings 🏆'
    : 'Next Situation →';

  ygiRoundLog.push({
    round:   ygiRound,
    prompt:  ygiCurrentPrompt.text,
    entries: ygiLineup.map((entry, idx) => ({
      isGhost:  entry.isGhost,
      name:     entry.isGhost ? '👻 The Ringer' : ygiPlayerNames[entry.playerIdx],
      number:   entry.number,
      metric:   entry.metric,
      pts:      roundPts[idx],
      isWinner: !entry.isGhost && roundPts[idx] === maxRoundPts && maxRoundPts > 0
    }))
  });

  playSuccess();
  showScreen('screen-ygi-results');
}

document.getElementById('btn-ygi-results-next').addEventListener('click', () => {
  playLaunch();
  if (ygiRound >= ygiRounds) {
    ygiShowGameOver();
  } else {
    ygiCurrentVoterIdx = 0;
    ygiVotes           = [];
    ygiStartRound();
  }
});

// ── CE Game Over (Piece 4) ────────────────────────────────────────────────────
function ygiShowGameOver() {
  const maxScore = Math.max(...ygiScores);
  const winners  = ygiScores.map((_, i) => i).filter(i => ygiScores[i] === maxScore);

  if (ygiDecider === 'only-one' && winners.length > 1) {
    ygiStartSuddenDeath(winners);
  } else {
    ygiShowFinalStandings(winners, false);
  }
}

function ygiStartSuddenDeath(tiedPlayers) {
  ygiSuddenDeathPlayers  = tiedPlayers;
  ygiSuddenDeathInputs   = [];
  ygiSuddenDeathInputIdx = 0;
  ygiSuddenDeathQ        = YGI_SUDDEN_DEATH_QS[Math.floor(Math.random() * YGI_SUDDEN_DEATH_QS.length)];

  document.getElementById('ygi-sd-tied-names').textContent = tiedPlayers.map(i => ygiPlayerNames[i]).join(' vs ');
  document.getElementById('ygi-sd-question').textContent   = `"${ygiSuddenDeathQ}"`;
  showScreen('screen-ygi-sd-intro');
}

document.getElementById('btn-ygi-sd-begin').addEventListener('click', () => {
  playLaunch();
  ygiShowSDPassGate();
});

function ygiShowSDPassGate() {
  ygiPassPhase = 'sd';
  const playerIdx = ygiSuddenDeathPlayers[ygiSuddenDeathInputIdx];
  document.getElementById('ygi-pass-name').textContent = `${ygiPlayerNames[playerIdx]}! ⚡`;
  showScreen('screen-ygi-pass');
}

function ygiShowSDInput() {
  const playerIdx = ygiSuddenDeathPlayers[ygiSuddenDeathInputIdx];
  document.getElementById('ygi-sd-input-player-label').textContent = `${ygiPlayerNames[playerIdx]}'s Final Answer`;
  document.getElementById('ygi-sd-input-question').textContent     = ygiSuddenDeathQ;
  document.getElementById('ygi-sd-input-number').value             = '';
  document.getElementById('ygi-sd-input-error').textContent        = '';
  showScreen('screen-ygi-sd-input');
  document.getElementById('ygi-sd-input-number').focus();
}

document.getElementById('ygi-sd-input-number').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
});

document.getElementById('btn-ygi-sd-input-confirm').addEventListener('click', () => {
  const rawNum = document.getElementById('ygi-sd-input-number').value.trim();
  const errEl  = document.getElementById('ygi-sd-input-error');
  if (!rawNum) { errEl.textContent = 'Enter a number first.'; return; }
  const num = parseInt(rawNum, 10);
  if (num > 1_000_000) { errEl.textContent = 'Keep it under a million!'; return; }

  ygiSuddenDeathInputs.push({ playerIdx: ygiSuddenDeathPlayers[ygiSuddenDeathInputIdx], number: num });
  ygiSuddenDeathInputIdx++;

  if (ygiSuddenDeathInputIdx < ygiSuddenDeathPlayers.length) {
    ygiShowSDPassGate();
  } else {
    ygiResolveSuddenDeath();
  }
});

function ygiResolveSuddenDeath() {
  const maxNum    = Math.max(...ygiSuddenDeathInputs.map(e => e.number));
  const sdWinners = ygiSuddenDeathInputs.filter(e => e.number === maxNum).map(e => e.playerIdx);
  ygiShowFinalStandings(sdWinners, true);
}

function ygiShowFinalStandings(winners, afterSD) {
  const standings = ygiScores
    .map((s, i) => ({ name: ygiPlayerNames[i], score: s, playerIdx: i }))
    .sort((a, b) => b.score - a.score);

  const container = document.getElementById('ygi-gameover-standings');
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
  const sdReveal = document.getElementById('ygi-gameover-sd-reveal');
  if (sdReveal) {
    sdReveal.style.display = afterSD ? '' : 'none';
    if (afterSD) {
      const sdContainer = document.getElementById('ygi-gameover-sd-answers');
      sdContainer.innerHTML = '';
      [...ygiSuddenDeathInputs]
        .sort((a, b) => b.number - a.number)
        .forEach(entry => {
          const isSDWinner = winners.includes(entry.playerIdx);
          const row        = document.createElement('div');
          row.className    = 'flex items-center justify-between py-1';
          row.innerHTML    = `
            <span class="text-stone-700 font-semibold">${isSDWinner ? '⚡ ' : ''}${ygiPlayerNames[entry.playerIdx]}</span>
            <span class="font-bold ${isSDWinner ? 'text-orange-500' : 'text-stone-400'}">${entry.number.toLocaleString()}</span>
          `;
          sdContainer.appendChild(row);
        });
    }
  }

  ygiRoundLogIdx = ygiRoundLog.length - 1;
  ygiRenderRoundLog();

  playSuccess();
  showScreen('screen-ygi-gameover');
}

// ── Round Log Carousel ─────────────────────────────────────────────────────────
function ygiRenderRoundLog() {
  const entry     = ygiRoundLog[ygiRoundLogIdx];
  if (!entry) return;
  const indicator = document.getElementById('ygi-log-round-indicator');
  const card      = document.getElementById('ygi-log-card');
  const prevBtn   = document.getElementById('btn-ygi-log-prev');
  const nextBtn   = document.getElementById('btn-ygi-log-next');

  indicator.textContent = `${ygiRoundLogIdx + 1} / ${ygiRoundLog.length}`;
  prevBtn.style.opacity = ygiRoundLogIdx === 0 ? '0.3' : '1';
  nextBtn.style.opacity = ygiRoundLogIdx === ygiRoundLog.length - 1 ? '0.3' : '1';

  card.innerHTML = `
    <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest mb-1">Situation ${entry.round}</p>
    <p class="text-stone-800 font-semibold text-sm leading-snug mb-2">${entry.prompt.replace('[ ]', '________')}</p>
    ${entry.entries.map(e => `
      <div class="flex items-center gap-2 py-1.5 border-t border-stone-100">
        <span class="text-orange-500 font-bold min-w-[3rem] text-right shrink-0 text-sm">${e.number.toLocaleString()}</span>
        <span class="text-stone-600 text-sm flex-1 leading-snug min-w-0 break-words">${e.metric}</span>
        <span class="text-stone-400 text-xs shrink-0">${e.name}</span>
        ${e.isGhost ? '' : `<span class="${e.pts > 0 ? 'text-orange-500' : e.pts < 0 ? 'text-red-400' : 'text-stone-300'} font-bold text-sm shrink-0">${e.pts > 0 ? '+' : ''}${e.pts}</span>`}
      </div>
    `).join('')}
  `;
}

document.getElementById('btn-ygi-log-prev').addEventListener('click', () => {
  if (ygiRoundLogIdx > 0) { ygiRoundLogIdx--; ygiRenderRoundLog(); playPillClick(); }
});
document.getElementById('btn-ygi-log-next').addEventListener('click', () => {
  if (ygiRoundLogIdx < ygiRoundLog.length - 1) { ygiRoundLogIdx++; ygiRenderRoundLog(); playPillClick(); }
});

document.getElementById('btn-ygi-play-again').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-run-it-back-overlay').style.display = 'flex';
});

document.getElementById('btn-ygi-run-confirm').addEventListener('click', async () => {
  playLaunch();
  document.getElementById('ygi-run-it-back-overlay').style.display = 'none';
  await ygiStartGame();
});

document.getElementById('btn-ygi-run-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ygi-run-it-back-overlay').style.display = 'none';
});

document.getElementById('btn-ygi-gameover-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

document.getElementById('btn-ygi-gameover-exit').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── YGI teardown (called by engine.js resetToLobby) ───────────────────────────
function resetYouGetIt() {
  document.getElementById('ygi-quit-overlay').style.display         = 'none';
  document.getElementById('ygi-settings-overlay').style.display     = 'none';
  document.getElementById('ygi-how-to-overlay').style.display       = 'none';
  document.getElementById('ygi-run-it-back-overlay').style.display  = 'none';
  ygiRound               = 0;
  ygiScores              = [];
  ygiInputs              = [];
  ygiLineup              = [];
  ygiVotes               = [];
  ygiCurrentInputIdx     = 0;
  ygiCurrentVoterIdx     = 0;
  ygiPassPhase           = 'input';
  ygiCurrentVoteRankings = [];
  ygiCurrVoteEntries     = [];
  ygiCurrVoteRequired    = 0;
  ygiCurrentPrompt       = null;
  ygiCurrentRinger     = null;
  ygiPromptPool          = [];
  ygiRoundLog            = [];
  ygiSuddenDeathQ        = '';
  ygiSuddenDeathPlayers  = [];
  ygiSuddenDeathInputs   = [];
  ygiSuddenDeathInputIdx = 0;
}
