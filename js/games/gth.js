// ═══════════════════════════════════════════════════════════════════
// gth.js — Group Therapy
// Depends on: engine.js (showScreen, playLaunch, etc.), engine-multiplayer.js
// ═══════════════════════════════════════════════════════════════════

// ── Settings (persist between sessions) ────────────────────────────
let gthDisordersPerPatient = 3;
let gthDrawingTime         = 60;
let gthDiagnosisWindow     = 90;
let gthDifficultyMix       = 'recurrent';
let gthDeepDive            = false;
let gthSyllyMode           = false;

// ── Roster ─────────────────────────────────────────────────────────
let gthPlayerCount = 0;
let gthPlayerNames = [];

// ── Phase 1 state ──────────────────────────────────────────────────
let gthCurrentDisorderIdx = 0;
let gthAssignedDisorders  = [];
let gthLocalDrawings      = [];
let gthPhase1Ready        = [];
let gthPhase1Complete     = false;
let gthPatientReady       = [];   // readyCheck bool[] for Patient Intake

// ── Phase 2 state ──────────────────────────────────────────────────
let gthQueue              = [];
let gthQueueIdx           = 0;
let gthLocalDiagnoses     = [];
let gthPhase2EndTimestamp = 0;
let gthPhase2Timer        = null;
let gthPhase2Complete     = false;
let gthDiagnosesSubmitted = false;
let gthDiagnosesReady     = [];        // readyCheck bool[] for Phase 2
let gthAllDiagnoses       = {};        // { playerIdx: diagnoses[] } — host-only collection

// ── Reveal state ───────────────────────────────────────────────────
let gthRevealPool  = [];
let gthRevealIdx   = 0;
let gthRevealItems = [];

// ── Scores ─────────────────────────────────────────────────────────
let gthScores = [];

// ── UI state ───────────────────────────────────────────────────────
let gthDisorderSubState  = 'preview';
let gthCanvasInstance    = null;
let gthCountdownTimer    = null;
let gthIntakeTimer       = null;
let gthShrinkIntroTimer  = null;

// ── Data ───────────────────────────────────────────────────────────
let gthAllDisorders = [];

// ═══════════════════════════════════════════════════════════════════
// Data Loading
// ═══════════════════════════════════════════════════════════════════

async function gthLoadData() {
  const res = await fetch('data/gth-data.json');
  gthAllDisorders = await res.json();
}

// ═══════════════════════════════════════════════════════════════════
// Menu Flow
// ═══════════════════════════════════════════════════════════════════

function gthShowMenu() {
  showScreen('screen-gth-menu');
}

function gthApplySettings() {
  // Pills update state directly via click handlers; this hook exists for post-close sync
}

// ═══════════════════════════════════════════════════════════════════
// Phase 1 — Patient Phase (Drawing)
// ═══════════════════════════════════════════════════════════════════

function gthShowDisorderReveal(idx) {
  gthCurrentDisorderIdx = idx;
  const disorder = gthAssignedDisorders[idx];
  const total    = gthAssignedDisorders.length;

  if (gthDisorderSubState === 'between' && idx > 0) {
    // Between-disorders transition screen
    document.getElementById('gth-reveal-progress').textContent      = `Issue ${idx + 1} of ${total}`;
    document.getElementById('gth-between-progress').textContent     = `Coming up — Issue ${idx + 1} of ${total}`;
    document.getElementById('gth-between-next-name').textContent    = disorder.name;
    document.getElementById('gth-between-next-def').textContent     = disorder.definition;
    document.getElementById('gth-reveal-preview').classList.add('hidden');
    document.getElementById('gth-reveal-between').classList.remove('hidden');
  } else {
    // Preview (first disorder, or non-between mode)
    gthDisorderSubState = 'preview';
    document.getElementById('gth-reveal-progress').textContent      = `Issue ${idx + 1} of ${total}`;
    document.getElementById('gth-reveal-name').textContent          = disorder.display || disorder.name;
    document.getElementById('gth-reveal-definition').textContent    = disorder.definition;
    document.getElementById('gth-reveal-tip').textContent           = disorder.tip;
    document.getElementById('gth-reveal-preview').classList.remove('hidden');
    document.getElementById('gth-reveal-between').classList.add('hidden');
  }

  showScreen('screen-gth-disorder-reveal');
}

function gthShowPatientIntake() {
  // Populate this player's disorder list
  document.getElementById('gth-intake-disorders').innerHTML =
    gthAssignedDisorders.map(d => `
      <div class="bg-white rounded-xl px-4 py-3 shadow-sm">
        <p class="font-semibold text-stone-800">${d.display || d.name}</p>
        <p class="text-stone-400 text-xs mt-0.5">${d.definition}</p>
      </div>
    `).join('');

  // Reset ready button state
  const btn = document.getElementById('btn-gth-intake-ready');
  btn.disabled    = false;
  btn.textContent = "I'm Ready to Draw →";
  btn.style.opacity = '';

  // 15-second auto-start countdown — prevents over-thinking before drawing
  if (gthIntakeTimer) { clearInterval(gthIntakeTimer); gthIntakeTimer = null; }
  let intakeSecsLeft = 15;
  const countdownEl = document.getElementById('gth-intake-countdown');
  if (countdownEl) countdownEl.textContent = intakeSecsLeft;
  gthIntakeTimer = setInterval(() => {
    intakeSecsLeft--;
    if (countdownEl) countdownEl.textContent = intakeSecsLeft;
    if (intakeSecsLeft <= 0) {
      clearInterval(gthIntakeTimer);
      gthIntakeTimer = null;
      document.getElementById('btn-gth-intake-ready').click();
    }
  }, 1000);

  showScreen('screen-gth-patient-intake');
}

function gthStartPhase1Drawing() {
  gthCurrentDisorderIdx = 0;
  gthShowCanvas(gthAssignedDisorders[0]);
}

function gthShowCanvas(disorderEntry) {
  const total = gthAssignedDisorders.length;
  document.getElementById('gth-canvas-disorder-name').textContent =
    disorderEntry.display || disorderEntry.name;
  document.getElementById('gth-canvas-tip').textContent = disorderEntry.tip || '';
  document.getElementById('gth-canvas-progress').textContent =
    `Drawing ${gthCurrentDisorderIdx + 1} of ${total}`;

  showScreen('screen-gth-canvas');

  const canvas  = document.getElementById('gth-canvas');
  const wrapper = document.getElementById('gth-canvas-wrapper');
  canvas.width  = 320;
  canvas.height = 320;

  CanvasDraw.clear();
  gthCanvasInstance = CanvasDraw.init(canvas, { onStrokeEnd: null });

  // Tremor effect driven by Sylly Mode
  CanvasDraw.setTremor(wrapper, gthSyllyMode);

  gthStartCountdown();
}

function gthStartCountdown() {
  if (gthCountdownTimer) { clearInterval(gthCountdownTimer); gthCountdownTimer = null; }
  const timerEl = document.getElementById('gth-canvas-timer');

  // No Limit mode — show ∞ and skip auto-submit; tremor stays at starting level
  if (gthDrawingTime === 0) {
    timerEl.textContent = '∞';
    return;
  }

  let secondsLeft = gthDrawingTime;
  const total     = gthDrawingTime;

  function tick() {
    timerEl.textContent = secondsLeft;
    // Scale tremor: 0 at start → 1 at end
    if (gthSyllyMode) {
      CanvasDraw.setTremorScale((total - secondsLeft) / total);
    }
    if (secondsLeft <= 5 && secondsLeft > 0) playTick();
    if (secondsLeft <= 0) {
      clearInterval(gthCountdownTimer);
      gthCountdownTimer = null;
      playAlarm();
      gthFinishDrawing();
      return;
    }
    secondsLeft--;
  }

  tick(); // render immediately before first second elapses
  gthCountdownTimer = setInterval(tick, 1000);
}

function gthFinishDrawing() {
  // Stop timer if still running (called from Done button as well as expiry)
  if (gthCountdownTimer) {
    clearInterval(gthCountdownTimer);
    gthCountdownTimer = null;
  }
  const wrapper = document.getElementById('gth-canvas-wrapper');
  CanvasDraw.setTremor(wrapper, false); // always stop tremor before locking
  const drawingData = CanvasDraw.lock();
  gthSubmitDrawing(drawingData);
}

function gthSubmitDrawing(drawingData) {
  playSuccess();

  gthLocalDrawings.push({
    disorderId:  gthAssignedDisorders[gthCurrentDisorderIdx].id,
    playerIdx:   mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0,
    drawingData: drawingData,
  });

  const nextIdx = gthCurrentDisorderIdx + 1;

  if (nextIdx < gthAssignedDisorders.length) {
    // More disorders — go directly to canvas; player already knows all disorders from intake
    gthCurrentDisorderIdx = nextIdx;
    gthShowCanvas(gthAssignedDisorders[nextIdx]);
  } else {
    // All drawn — clients send batch to host; host handles its own drawings locally
    if (syllyMultiplayerMode === 'client') {
      mpLockSync();
      mpSendEnvelope({
        type: 'ACTION',
        payload: {
          action:    'GTH_DRAWING_SUBMIT',
          playerIdx: mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0,
          drawings:  gthLocalDrawings.map(d => ({
            disorderId:  d.disorderId,
            playerIdx:   d.playerIdx,
            drawingData: d.drawingData,
          })),
        }
      });
    }
    gthShowWaitingRoom();
    // Host: if all clients already submitted, kick off Phase 2 immediately (no Firebase round-trip)
    if (syllyMultiplayerMode === 'host' && gthPhase1Ready.every(Boolean) && !gthPhase1Complete) {
      gthKickOffPhase2();
    }
  }
}

function gthShowWaitingRoom() {
  showScreen('screen-gth-waiting-room');
  // Mark local player as done and render the progress list
  gthUpdateWaitingProgress(mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0);
}

function gthUpdateWaitingProgress(donePlayerIdx) {
  gthPhase1Ready[donePlayerIdx] = true;
  const container = document.getElementById('gth-waiting-progress');
  container.innerHTML = gthPlayerNames.map((name, i) => {
    const done = gthPhase1Ready[i];
    return `<div class="flex items-center justify-between py-1">
      <p class="text-stone-700 font-medium">${name || 'Player ' + (i + 1)}</p>
      <p class="text-sm ${done ? 'text-green-600 font-semibold' : 'text-stone-400'}">${done ? '✓ Done' : 'Drawing…'}</p>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// Phase 1 → Phase 2 Kickoff (host only)
// ═══════════════════════════════════════════════════════════════════

function gthKickOffPhase2() {
  gthPhase1Complete = true;
  // gthRevealPool already has client drawings accumulated via GTH_DRAWING_SUBMIT ACTIONs;
  // prepend host's own drawings which were never sent through Firebase
  gthRevealPool = [...gthLocalDrawings, ...gthRevealPool];

  const queues = gthBuildQueues();

  gthDiagnosesReady  = new Array(gthPlayerCount).fill(false);
  gthAllDiagnoses    = {};

  gthQueue              = queues[mpMyPlayerIdx] || [];
  gthQueueIdx           = 0;
  gthLocalDiagnoses     = [];
  gthDiagnosesSubmitted = false;

  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:    'GTH_PHASE2_START',
      allQueues: queues,
    }
  });

  gthShowShrinkIntro();
}

// ═══════════════════════════════════════════════════════════════════
// Phase 2 — Shrink Phase (Diagnosis)
// ═══════════════════════════════════════════════════════════════════

function gthShowShrinkIntro() {
  const windowSecs = gthDiagnosisWindow;
  const mins = Math.floor(windowSecs / 60);
  const secs = windowSecs % 60;
  const label = mins > 0
    ? (secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`)
    : `${secs} sec`;
  document.getElementById('gth-shrink-window-label').textContent =
    `You have ${label} to diagnose ${gthQueue.length} case${gthQueue.length !== 1 ? 's' : ''}.`;

  // Host (or single-device) controls the gate; clients wait for GTH_PHASE2_BEGIN
  const isHost = syllyMultiplayerMode !== 'client';
  document.getElementById('btn-gth-shrink-start').style.display = isHost ? '' : 'none';
  document.getElementById('gth-shrink-wait-msg').style.display  = isHost ? 'none' : '';

  // 15-second auto-start for the host/single-device
  if (gthShrinkIntroTimer) { clearInterval(gthShrinkIntroTimer); gthShrinkIntroTimer = null; }
  const shrinkCountLabelEl = document.getElementById('gth-shrink-countdown-label');
  if (isHost) {
    let shrinkSecsLeft = 15;
    const shrinkCountEl = document.getElementById('gth-shrink-countdown');
    if (shrinkCountEl) shrinkCountEl.textContent = shrinkSecsLeft;
    if (shrinkCountLabelEl) shrinkCountLabelEl.style.display = '';
    gthShrinkIntroTimer = setInterval(() => {
      shrinkSecsLeft--;
      if (shrinkCountEl) shrinkCountEl.textContent = shrinkSecsLeft;
      if (shrinkSecsLeft <= 0) {
        clearInterval(gthShrinkIntroTimer);
        gthShrinkIntroTimer = null;
        document.getElementById('btn-gth-shrink-start').click();
      }
    }, 1000);
  } else {
    if (shrinkCountLabelEl) shrinkCountLabelEl.style.display = 'none';
  }

  showScreen('screen-gth-shrink-intro');
}

function gthBuildQueues() {
  // gthRevealPool must already contain all drawings (host merged before calling).
  // Per-artist round-robin: guarantees each eligible player gets drawings[i*2 % len] and
  // drawings[(i*2+1) % len] slots — exact equal distribution when D×2 is divisible by (N-1).
  // For the standard 4-player, 3-disorder case: 6/3 = 2 each, giving exactly D×2 = 6 per player.
  const queues = Array.from({ length: gthPlayerCount }, () => []);

  // Group drawings by artist
  const byArtist = Array.from({ length: gthPlayerCount }, () => []);
  gthRevealPool.forEach(d => byArtist[d.playerIdx].push(d));

  byArtist.forEach((drawings, artistIdx) => {
    if (!drawings.length) return;

    // Shuffle this artist's drawings for random case-presentation order
    for (let i = drawings.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawings[i], drawings[j]] = [drawings[j], drawings[i]];
    }

    // Build a shuffled eligible player list for randomness within the rotation
    const eligible = [];
    for (let i = 0; i < gthPlayerCount; i++) {
      if (i !== artistIdx) eligible.push(i);
    }
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    // Circular-shift assignment: drawing i → eligible[(i*2) % len] + eligible[(i*2+1) % len]
    const len = eligible.length;
    drawings.forEach((drawing, i) => {
      queues[eligible[(i * 2)     % len]].push(drawing);
      queues[eligible[(i * 2 + 1) % len]].push(drawing);
    });
  });

  // Shuffle each player's final queue for random case-presentation order
  queues.forEach(q => {
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
  });

  return queues;
}

function gthPickDecoys(disorder, count = 4) {
  const clusterSlots = 2;
  let clusterDecoys  = [];

  // Fill up to 2 slots with same-cluster items when the disorder has a cluster tag
  if (disorder.cluster) {
    let clusterPool = gthAllDisorders.filter(d => d.id !== disorder.id && d.cluster === disorder.cluster);
    for (let i = clusterPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clusterPool[i], clusterPool[j]] = [clusterPool[j], clusterPool[i]];
    }
    clusterDecoys = clusterPool.slice(0, clusterSlots);
  }

  // Fill remaining slots from same category (excluding already-chosen cluster items)
  const usedIds  = new Set([disorder.id, ...clusterDecoys.map(d => d.id)]);
  const remaining = count - clusterDecoys.length;
  let pool = gthAllDisorders.filter(d => !usedIds.has(d.id) && d.category === disorder.category);
  if (pool.length < remaining) pool = gthAllDisorders.filter(d => !usedIds.has(d.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [...clusterDecoys, ...pool.slice(0, remaining)];
}

function gthShowCase() {
  const caseItem = gthQueue[gthQueueIdx];
  if (!caseItem) {
    // Queue exhausted before timer — submit batch and go to case report
    gthSubmitDiagnosisBatch();
    gthShowCaseReport();
    return;
  }

  const disorder = gthAllDisorders.find(d => d.id === caseItem.disorderId);
  if (!disorder) { gthQueueIdx++; gthShowCase(); return; } // skip unknown disorder

  // ── Render drawing ─────────────────────────────────────────────────
  const renderCanvas = document.getElementById('gth-case-canvas');
  renderCanvas.width  = 320;
  renderCanvas.height = 320;
  CanvasDraw.render(renderCanvas, caseItem.drawingData, { lineWidth: 2, strokeStyle: '#1c1917' });

  // ── Sylly Mode blur ────────────────────────────────────────────────
  if (gthSyllyMode) CanvasDraw.setBlur(renderCanvas, 3500);

  // ── Case progress counter ──────────────────────────────────────────
  document.getElementById('gth-case-progress').textContent =
    `Case ${gthQueueIdx + 1} of ${gthQueue.length}`;

  if (!gthDeepDive) {
    // ── Standard mode: Diagnostic Cards ─────────────────────────────
    const decoys  = gthPickDecoys(disorder, 4);
    const options = [disorder, ...decoys];
    // Fisher-Yates shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    document.getElementById('gth-case-cards').classList.remove('hidden');
    document.getElementById('gth-case-deepdive').classList.add('hidden');

    const cardsEl = document.getElementById('gth-case-cards');
    cardsEl.innerHTML = options.map(opt => `
      <button class="btn-gth-diag-card w-full text-left rounded-xl bg-white border-2 border-stone-200 px-4 py-3 text-stone-800 font-medium active:scale-95 transition-all duration-100 text-sm" data-disorder-id="${opt.id}">
        ${opt.name}
      </button>
    `).join('');
  } else {
    // ── Deep Dive mode: text input ────────────────────────────────────
    document.getElementById('gth-case-cards').classList.add('hidden');
    document.getElementById('gth-case-deepdive').classList.remove('hidden');
    document.getElementById('gth-deepdive-input').value = '';
    const errEl = document.getElementById('gth-deepdive-error');
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }

  showScreen('screen-gth-case');
}

function gthSubmitDiagnosis(selectedDisorderId) {
  const caseItem = gthQueue[gthQueueIdx];
  gthLocalDiagnoses.push({
    disorderId:  caseItem.disorderId,
    selectedId:  selectedDisorderId,
    timestamp:   Date.now(),
    queueIdx:    gthQueueIdx,
  });
  playSuccess();
  gthQueueIdx++;
  gthShowCase(); // next case (handles queue-exhausted check internally)
}

function gthUpdateCaseReportProgress() {
  const container = document.getElementById('gth-case-report-progress');
  if (!container) return;
  container.innerHTML = gthPlayerNames.map((name, i) => {
    const done = gthDiagnosesReady[i];
    return `<div class="flex items-center justify-between py-1">
      <p class="text-stone-700 font-medium">${name || 'Player ' + (i + 1)}</p>
      <p class="text-sm ${done ? 'text-green-600 font-semibold' : 'text-stone-400'}">${done ? '✓ Done' : 'Diagnosing…'}</p>
    </div>`;
  }).join('');
}

function gthShowCaseReport() {
  const total = gthQueue.length;
  const done  = gthLocalDiagnoses.length;
  const statsEl = document.getElementById('gth-case-report-stats');
  statsEl.innerHTML = `
    <p class="text-stone-500 text-sm">
      Diagnosed <span class="font-semibold text-stone-700">${done}</span> of
      <span class="font-semibold text-stone-700">${total}</span> case${total !== 1 ? 's' : ''}.
    </p>
  `;
  gthUpdateCaseReportProgress();
  // Seed the time-remaining label for the first render (timer interval keeps it updated)
  const remaining = gthPhase2EndTimestamp
    ? Math.max(0, Math.ceil((gthPhase2EndTimestamp - Date.now()) / 1000))
    : 0;
  const timeEl = document.getElementById('gth-case-report-time');
  if (timeEl) timeEl.textContent = remaining + 's remaining';
  showScreen('screen-gth-case-report');
}

function gthSubmitDiagnosisBatch() {
  if (gthDiagnosesSubmitted) return; // idempotent
  gthDiagnosesSubmitted = true;

  if (syllyMultiplayerMode === 'host') {
    // Host stores directly to avoid Firebase ACTION being overwritten by the GTH_PHASE2_END SYNC
    // that fires immediately after this call in gthStartPhase2Timer()
    const myIdx = mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0;
    gthAllDiagnoses[myIdx]    = gthLocalDiagnoses;
    gthDiagnosesReady[myIdx]  = true;
    if (gthDiagnosesReady.every(Boolean)) gthResolveScores();
  } else if (syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({
      type: 'ACTION',
      payload: {
        action:    'GTH_DIAGNOSES_SUBMIT',
        playerIdx: mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0,
        diagnoses: gthLocalDiagnoses,
      }
    });
  }
}

function gthStartPhase2Timer(endTimestamp) {
  if (gthPhase2Timer) { clearInterval(gthPhase2Timer); gthPhase2Timer = null; }
  gthPhase2EndTimestamp = endTimestamp;
  const timerEl = document.getElementById('gth-case-timer');

  gthPhase2Timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));

    // Update the timer display on the case screen when visible
    if (timerEl && document.getElementById('screen-gth-case').style.display !== 'none') {
      timerEl.textContent = remaining;
    }
    // Also update the case-report screen's time label for early finishers waiting
    const reportTimeEl = document.getElementById('gth-case-report-time');
    if (reportTimeEl && document.getElementById('screen-gth-case-report').style.display !== 'none') {
      reportTimeEl.textContent = remaining + 's remaining';
    }

    if (remaining <= 5 && remaining > 0) playTick();

    if (remaining <= 0) {
      clearInterval(gthPhase2Timer);
      gthPhase2Timer = null;
      playAlarm();
      gthSubmitDiagnosisBatch();
      // Only show case-report if scoring hasn't already resolved (all submitted before timer)
      if (!gthPhase2Complete) gthShowCaseReport();

      // Host broadcasts phase end so all clients stop their timers and move to report
      if (syllyMultiplayerMode === 'host') {
        mpSendEnvelope({
          type: 'SYNC',
          payload: { action: 'GTH_PHASE2_END' }
        });
      }
    }
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// Score Resolution
// ═══════════════════════════════════════════════════════════════════

function gthResolveScores() {
  // Initialise per-player score objects
  gthScores = Array.from({ length: gthPlayerCount }, () => ({ patientPts: 0, shrinkPts: 0, total: 0 }));

  // For each drawing in the reveal pool, gather diagnoses and award points
  gthRevealPool.forEach(drawing => {
    const disorder  = gthAllDisorders.find(d => d.id === drawing.disorderId);
    if (!disorder) return;
    const artistIdx = drawing.playerIdx;

    // Collect all diagnoses targeting this drawing (excluding the artist)
    const allForDrawing = [];
    Object.entries(gthAllDiagnoses).forEach(([pIdxStr, diagnoses]) => {
      const pIdx = parseInt(pIdxStr, 10);
      if (pIdx === artistIdx) return;
      const diag = diagnoses.find(d => d.disorderId === drawing.disorderId);
      if (diag) allForDrawing.push({ pIdx, ...diag });
    });

    // Filter correct diagnoses
    const correct = allForDrawing.filter(d => d.selectedId === disorder.id);

    // Patient pts: +2 per correct Shrink who cracked this player's drawing
    if (artistIdx >= 0 && artistIdx < gthPlayerCount) {
      gthScores[artistIdx].patientPts += correct.length * 2;
    }

    // Speed bonus: fastest timestamp among correct answers
    let speedWinner = -1;
    if (correct.length > 0) {
      const sorted = correct.slice().sort((a, b) => a.timestamp - b.timestamp);
      speedWinner = sorted[0].pIdx;
    }

    // Shrink pts for each correct diagnosis
    correct.forEach(d => {
      if (d.pIdx < 0 || d.pIdx >= gthPlayerCount) return;
      gthScores[d.pIdx].shrinkPts += 2;                              // base correct pts
      if (d.pIdx === speedWinner) gthScores[d.pIdx].shrinkPts += 1; // speed bonus
      if (disorder.difficulty === 3) gthScores[d.pIdx].shrinkPts += 1; // difficulty 3 bonus
    });
  });

  // Compute totals
  gthScores.forEach(s => { s.total = s.patientPts + s.shrinkPts; });

  // Build reveal items — one per drawing, with outcome data for the Big Reveal
  const revealItems = gthRevealPool.map(drawing => {
    const disorder   = gthAllDisorders.find(d => d.id === drawing.disorderId);
    const artistName = gthPlayerNames[drawing.playerIdx] || `Player ${drawing.playerIdx + 1}`;

    const correctShrinks = [];
    Object.entries(gthAllDiagnoses).forEach(([pIdxStr, diagnoses]) => {
      const pIdx = parseInt(pIdxStr, 10);
      if (pIdx === drawing.playerIdx) return;
      const diag = diagnoses.find(d => d.disorderId === drawing.disorderId && d.selectedId === disorder?.id);
      if (diag) correctShrinks.push(gthPlayerNames[pIdx] || `Player ${pIdx + 1}`);
    });

    return {
      drawingData:   drawing.drawingData,
      disorderId:    drawing.disorderId,
      disorderName:  disorder?.name || '?',
      artistName,
      correctShrinks,
    };
  });

  gthPhase2Complete = true; // prevent case-report screen from overriding navigation

  // Broadcast to all clients (host already has everything)
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:      'GTH_FINAL_SCORES',
      scores:      gthScores,
      revealItems: revealItems,
    }
  });

  // Host navigates directly to Big Reveal
  gthRevealItems = revealItems;
  gthRevealIdx   = 0;
  gthShowBigReveal();
}

// ═══════════════════════════════════════════════════════════════════
// Big Reveal + Final Report
// ═══════════════════════════════════════════════════════════════════

function gthShowBigReveal() {
  const item = gthRevealItems[gthRevealIdx];
  if (!item) {
    // All drawings revealed — move to final report
    gthShowFinalReport();
    return;
  }

  // Render drawing onto the canvas
  const canvas = document.getElementById('gth-reveal-canvas');
  if (canvas && item.drawingData) {
    CanvasDraw.render(canvas, item.drawingData, { lineWidth: 2, strokeStyle: '#1c1917' });
  }

  // Disorder name + artist
  document.getElementById('gth-reveal-disorder').textContent = item.disorderName;
  document.getElementById('gth-reveal-artist').textContent   = `By ${item.artistName}`;

  // Correct shrinks text
  const shrinksEl = document.getElementById('gth-reveal-shrinks');
  if (item.correctShrinks.length === 0) {
    shrinksEl.textContent = 'Nobody cracked it!';
  } else {
    shrinksEl.textContent = item.correctShrinks.join(', ') + ' got it right';
  }

  // Progress counter
  document.getElementById('gth-reveal-count').textContent =
    `${gthRevealIdx + 1} of ${gthRevealItems.length}`;

  // Toggle Next / Finish buttons based on whether this is the last item
  const isLast = gthRevealIdx >= gthRevealItems.length - 1;
  document.getElementById('gth-reveal-next-wrap').classList.toggle('hidden', isLast);
  document.getElementById('gth-reveal-finish-wrap').classList.toggle('hidden', !isLast);

  // In multiplayer, hide both navigation buttons on client devices (host drives progression)
  if (syllyMultiplayerMode === 'client') {
    document.getElementById('gth-reveal-next-wrap').classList.add('hidden');
    document.getElementById('gth-reveal-finish-wrap').classList.add('hidden');
  }

  showScreen('screen-gth-big-reveal');
}

function gthShowFinalReport() {
  // Sort by total desc; tie-break by shrinkPts desc
  const ranked = gthScores.map((s, i) => ({
    name:       gthPlayerNames[i] || `Player ${i + 1}`,
    patientPts: s.patientPts,
    shrinkPts:  s.shrinkPts,
    total:      s.total,
    idx:        i,
  })).sort((a, b) => b.total - a.total || b.shrinkPts - a.shrinkPts);

  const medals = ['🥇', '🥈', '🥉'];
  document.getElementById('gth-final-leaderboard').innerHTML = ranked.map((p, rank) => `
    <div class="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">${medals[rank] || '🏅'}</span>
        <div>
          <p class="font-bold text-stone-800">${p.name}</p>
          <p class="text-xs text-stone-400">Patient ${p.patientPts}pts · Shrink ${p.shrinkPts}pts</p>
        </div>
      </div>
      <p class="text-xl font-bold text-stone-800">${p.total}</p>
    </div>
  `).join('');

  showScreen('screen-gth-final-report');
}

// ═══════════════════════════════════════════════════════════════════
// Multiplayer Envelope Handler
// ═══════════════════════════════════════════════════════════════════

function gthHandleEnvelope(envelope) {
  const { type, payload } = envelope;

  // ── ACTION: GTH_PATIENT_READY (host only) ─────────────────────────
  if (type === 'ACTION' && payload.action === 'GTH_PATIENT_READY') {
    if (syllyMultiplayerMode !== 'host') return;
    gthPatientReady[payload.playerIdx] = true;
    mpUnlockSync();
    if (gthPatientReady.every(Boolean)) {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'GTH_PHASE1_START' } });
      gthStartPhase1Drawing();
    }
    return;
  }

  // ── SYNC: GTH_PHASE1_START ────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_PHASE1_START') {
    if (syllyMultiplayerMode === 'host') return; // host already called gthStartPhase1Drawing() directly
    mpUnlockSync();
    gthStartPhase1Drawing();
    return;
  }

  // ── SYNC: GTH_GAME_START ───────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_GAME_START') {
    if (syllyMultiplayerMode === 'host') return; // host already set up state and called gthShowPatientIntake() directly
    // Apply host settings to this client device
    gthDisordersPerPatient = payload.disordersPerPatient;
    gthDrawingTime         = payload.drawingTime;
    gthDiagnosisWindow     = payload.diagnosisWindow;
    gthDifficultyMix       = payload.difficultyMix;
    gthDeepDive            = payload.deepDive;
    gthSyllyMode           = payload.syllyMode;
    gthPlayerCount         = payload.playerCount;
    gthPlayerNames         = payload.playerNames || [];

    gthResetState();
    gthPhase1Ready   = new Array(gthPlayerCount).fill(false);
    gthPatientReady  = new Array(gthPlayerCount).fill(false);
    gthLocalDrawings = [];

    // Resolve this device's disorder IDs to full objects from the loaded data
    const myIds = payload.allDisorders[mpMyPlayerIdx] || [];
    gthAssignedDisorders = myIds.map(id => gthAllDisorders.find(d => d.id === id)).filter(Boolean);

    mpUnlockSync();
    gthShowPatientIntake();
    return;
  }

  // ── SYNC: GTH_PHASE2_START ────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_PHASE2_START') {
    if (syllyMultiplayerMode === 'host') return; // host already set up queues and called gthShowShrinkIntro() directly
    // Each client extracts its own queue by device player index
    gthQueue              = (payload.allQueues || [])[mpMyPlayerIdx] || [];
    gthQueueIdx           = 0;
    gthLocalDiagnoses     = [];
    gthDiagnosesSubmitted = false;
    gthDiagnosesReady     = new Array(gthPlayerCount).fill(false);
    mpUnlockSync();
    gthShowShrinkIntro(); // wait here — host will broadcast GTH_PHASE2_BEGIN to start the timer
    return;
  }

  // ── SYNC: GTH_PHASE2_BEGIN ────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_PHASE2_BEGIN') {
    if (syllyMultiplayerMode === 'host') return; // host already called gthStartPhase2Timer() + gthShowCase() directly
    gthStartPhase2Timer(payload.endTimestamp);
    gthShowCase();
    return;
  }

  // ── ACTION: GTH_DIAGNOSES_SUBMIT (host only) ──────────────────────
  if (type === 'ACTION' && payload.action === 'GTH_DIAGNOSES_SUBMIT') {
    if (syllyMultiplayerMode !== 'host') return;
    // A player who times out before diagnosing a single case sends diagnoses:[] —
    // Firebase erases the empty array, so payload.diagnoses arrives undefined (BUG-06 class).
    gthAllDiagnoses[payload.playerIdx] = payload.diagnoses || [];
    gthDiagnosesReady[payload.playerIdx] = true;
    gthUpdateCaseReportProgress();
    mpUnlockSync();
    if (gthDiagnosesReady.every(Boolean)) gthResolveScores();
    return;
  }

  // ── SYNC: GTH_PHASE2_END ──────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_PHASE2_END') {
    if (syllyMultiplayerMode === 'host') return; // host's own timer already handled this
    // Stop timer if still running (timer may have fired locally already)
    if (gthPhase2Timer) { clearInterval(gthPhase2Timer); gthPhase2Timer = null; }
    gthSubmitDiagnosisBatch();
    gthShowCaseReport();
    return;
  }

  // ── SYNC: GTH_FINAL_SCORES ────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_FINAL_SCORES') {
    if (syllyMultiplayerMode === 'host') return; // host already called gthShowBigReveal() directly in gthResolveScores()
    gthScores      = payload.scores;
    gthRevealItems = payload.revealItems;
    gthRevealIdx   = 0;
    mpUnlockSync();
    gthShowBigReveal();
    return;
  }

  // ── SYNC: GTH_REVEAL_NEXT ─────────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_REVEAL_NEXT') {
    if (syllyMultiplayerMode === 'host') return; // host already called gthShowBigReveal() in the click handler
    gthRevealIdx = payload.revealIdx;
    gthShowBigReveal();
    return;
  }

  // ── SYNC: GTH_REVEAL_FINISH ───────────────────────────────────────
  if (type === 'SYNC' && payload.action === 'GTH_REVEAL_FINISH') {
    if (syllyMultiplayerMode === 'host') return; // host already called gthShowFinalReport() in the click handler
    gthShowFinalReport();
    return;
  }

  // ── ACTION: GTH_DRAWING_SUBMIT (host only) ─────────────────────────
  if (type === 'ACTION' && payload.action === 'GTH_DRAWING_SUBMIT') {
    if (syllyMultiplayerMode !== 'host') return;
    const { playerIdx, drawings } = payload;
    drawings.forEach(d => gthRevealPool.push(d));
    gthUpdateWaitingProgress(playerIdx);
    mpUnlockSync();

    if (gthPhase1Ready.every(Boolean) && !gthPhase1Complete) {
      gthKickOffPhase2();
    }
    return;
  }

  // ── ACTION: GTH_PLAYER_LEFT — a client quit mid-game; dissolve for everyone ────────
  // (MDLM quit contract, PASS pattern — logic-engine.md § Mid-Game Quit Contract)
  if (type === 'ACTION' && payload.action === 'GTH_PLAYER_LEFT') {
    if (syllyMultiplayerMode !== 'host') return;
    resetToLobby(); // broadcasts HOST_END_GAME to remaining clients
    return;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Reset
// ═══════════════════════════════════════════════════════════════════

function gthResetState() {
  gthCurrentDisorderIdx = 0;
  gthAssignedDisorders  = [];
  gthLocalDrawings      = [];
  gthPhase1Ready        = [];
  gthPhase1Complete     = false;
  gthPatientReady       = [];
  gthQueue              = [];
  gthQueueIdx           = 0;
  gthLocalDiagnoses     = [];
  gthPhase2EndTimestamp = 0;
  if (gthPhase2Timer)       { clearInterval(gthPhase2Timer);       gthPhase2Timer       = null; }
  if (gthCountdownTimer)    { clearInterval(gthCountdownTimer);    gthCountdownTimer    = null; }
  if (gthIntakeTimer)       { clearInterval(gthIntakeTimer);       gthIntakeTimer       = null; }
  if (gthShrinkIntroTimer)  { clearInterval(gthShrinkIntroTimer);  gthShrinkIntroTimer  = null; }
  gthPhase2Complete     = false;
  gthDiagnosesSubmitted = false;
  gthDiagnosesReady     = [];
  gthAllDiagnoses       = {};
  gthRevealPool         = [];
  gthRevealIdx          = 0;
  gthRevealItems        = [];
  gthScores             = [];
  gthDisorderSubState   = 'preview';
  gthCanvasInstance     = null;
}

// ── Settings UI sync ────────────────────────────────────────────────
function gthSyncSettingsUI() {
  const pillMap = {
    'gth-disorders':  String(gthDisordersPerPatient),
    'gth-drawtime':   String(gthDrawingTime),
    'gth-window':     String(gthDiagnosisWindow),
    'gth-difficulty': gthDifficultyMix,
  };
  for (const [group, val] of Object.entries(pillMap)) {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
      const isActive = p.dataset.val === val;
      p.classList.toggle('pill-active-sage', isActive);
    });
  }
  // Dynamic value line (ui-style.md § Settings Card Standard, DD-13) — the pill carries the
  // thematic name only; this says what it means for the disorder pool.
  const diffVal = document.getElementById('gth-val-difficulty');
  if (diffVal) diffVal.textContent = {
    episodic:   'Episodic uses only the simplest cases.',
    recurrent:  'Recurrent mixes simple and moderate cases.',
    refractory: 'Refractory includes the hardest cases too.',
  }[gthDifficultyMix] || '';
  const ddBtn = document.getElementById('btn-gth-deepdive-toggle');
  ddBtn.textContent = gthDeepDive ? 'ON' : 'OFF';
  ddBtn.className   = gthDeepDive ? 'game-toggle-on-sage shrink-0' : 'game-toggle-off shrink-0';
  const syllyBtn = document.getElementById('btn-gth-sylly-toggle');
  syllyBtn.textContent = gthSyllyMode ? 'ON' : 'OFF';
  syllyBtn.className   = gthSyllyMode ? 'game-toggle-on-sage shrink-0' : 'game-toggle-off shrink-0';
}

// ── Phase 1 entry ──────────────────────────────────────────────────
function gthStartSession() {
  gthResetState();

  // ── Build disorder pool based on difficulty mix ───────────────────
  let pool = gthAllDisorders.slice();
  if (gthDifficultyMix === 'episodic')              pool = pool.filter(d => d.difficulty === 1);
  else if (gthDifficultyMix === 'recurrent')        pool = pool.filter(d => d.difficulty <= 2);
  // 'refractory' = full pool (no filter)

  // ── Fisher-Yates shuffle ─────────────────────────────────────────
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // ── Assign gthDisordersPerPatient disorders to each player ────────
  const allDisorders = [];
  for (let p = 0; p < gthPlayerCount; p++) {
    allDisorders.push(pool.splice(0, gthDisordersPerPatient));
  }

  // ── Initialise ready-checks ───────────────────────────────────────
  gthPhase1Ready   = new Array(gthPlayerCount).fill(false);
  gthPatientReady  = new Array(gthPlayerCount).fill(false);
  gthLocalDrawings = [];

  if (syllyMultiplayerMode !== 'single') {
    // Multiplayer: this device is host; assign own slice by mpMyPlayerIdx
    gthAssignedDisorders = allDisorders[mpMyPlayerIdx] || allDisorders[0];
    mpSendEnvelope({
      type: 'SYNC',
      payload: {
        action:              'GTH_GAME_START',
        allDisorders:        allDisorders.map(slice => slice.map(x => x.id)), // IDs only
        playerCount:         gthPlayerCount,
        playerNames:         gthPlayerNames,
        disordersPerPatient: gthDisordersPerPatient,
        drawingTime:         gthDrawingTime,
        diagnosisWindow:     gthDiagnosisWindow,
        difficultyMix:       gthDifficultyMix,
        deepDive:            gthDeepDive,
        syllyMode:           gthSyllyMode,
      }
    });
  } else {
    // Single-device path
    gthAssignedDisorders = allDisorders[0] || [];
  }

  if (syllyMultiplayerMode !== 'single') {
    gthShowPatientIntake();
  } else {
    gthShowDisorderReveal(0); // single-device testing path
  }
}

// ═══════════════════════════════════════════════════════════════════
// Lobby Entry
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // ── Lobby button ────────────────────────────────────────────────
  const lobbyBtn = document.getElementById('btn-gth');
  if (lobbyBtn) lobbyBtn.addEventListener('click', () => {
    playLaunch();
    activeGameId = 'gth';
    showScreen('screen-gth-menu');
  });

  document.querySelectorAll('#screen-gth-menu .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });

  // ── Menu buttons ────────────────────────────────────────────────
  document.getElementById('btn-gth-menu-play').addEventListener('click', () => {
    playLaunch();
    if (syllyMultiplayerMode !== 'single') {
      gthStartSession(); // onPassThePhone already fired — players ready
    } else {
      mpShowModeScreen('gth');
    }
  });
  document.getElementById('btn-gth-menu-how-to').addEventListener('click', () => {
    playDone();
    const el = document.getElementById('gth-how-to-overlay');
    el.querySelector('.overlay-data-inner').scrollTop = 0;
    el.style.display = 'flex';
  });
  document.getElementById('btn-gth-menu-settings').addEventListener('click', () => {
    playDone();
    gthSyncSettingsUI();
    const el = document.getElementById('gth-settings-overlay');
    el.querySelector('.overlay-data-inner').scrollTop = 0;
    el.style.display = 'flex';
  });
  document.getElementById('btn-gth-menu-back').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Settings overlay ────────────────────────────────────────────
  document.getElementById('btn-gth-settings-done').addEventListener('click', () => {
    playDone();
    document.getElementById('gth-settings-overlay').style.display = 'none';
  });

  document.querySelectorAll('[data-group^="gth-"]').forEach(pill => {
    pill.addEventListener('click', () => {
      playPillClick();
      const group = pill.dataset.group;
      const val   = pill.dataset.val;
      document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
        p.classList.remove('pill-active-sage');
      });
      pill.classList.add('pill-active-sage');
      if (group === 'gth-disorders')  gthDisordersPerPatient = parseInt(val, 10);
      if (group === 'gth-drawtime')   gthDrawingTime         = parseInt(val, 10);
      if (group === 'gth-window')     gthDiagnosisWindow     = parseInt(val, 10);
      if (group === 'gth-difficulty') gthDifficultyMix       = val;
      gthSyncSettingsUI();   // repaint the value line under the group that just changed
    });
  });

  const deepDiveBtn = document.getElementById('btn-gth-deepdive-toggle');
  deepDiveBtn.addEventListener('click', () => {
    gthDeepDive = !gthDeepDive;
    deepDiveBtn.textContent = gthDeepDive ? 'ON' : 'OFF';
    deepDiveBtn.className   = gthDeepDive ? 'game-toggle-on-sage shrink-0' : 'game-toggle-off shrink-0';
    playPillClick();
  });

  const syllyBtn = document.getElementById('btn-gth-sylly-toggle');
  syllyBtn.addEventListener('click', () => {
    gthSyllyMode = !gthSyllyMode;
    syllyBtn.textContent = gthSyllyMode ? 'ON' : 'OFF';
    syllyBtn.className   = gthSyllyMode ? 'game-toggle-on-sage shrink-0' : 'game-toggle-off shrink-0';
    gthSyllyMode ? playSyllyOn() : playSyllyOff();
  });

  // ── How-to overlay ──────────────────────────────────────────────
  document.getElementById('btn-gth-how-to-done').addEventListener('click', () => {
    playDone();
    document.getElementById('gth-how-to-overlay').style.display = 'none';
  });

  document.getElementById('btn-gth-how-to').addEventListener('click', () => {
    playDone();
    const el = document.getElementById('gth-how-to-overlay');
    el.querySelector('.overlay-data-inner').scrollTop = 0;
    el.style.display = 'flex';
  });

  // Case screen [?] — the only help button reachable in MDLM play (disorder-reveal,
  // which carries the other [?], is skipped in MDLM). Mirrors btn-gth-how-to.
  document.getElementById('btn-gth-how-to-case').addEventListener('click', () => {
    playDone();
    const el = document.getElementById('gth-how-to-overlay');
    el.querySelector('.overlay-data-inner').scrollTop = 0;
    el.style.display = 'flex';
  });

  // ── Quit overlay ────────────────────────────────────────────────
  document.querySelectorAll('.btn-gth-quit-open').forEach(btn => {
    btn.addEventListener('click', () => {
      playDone();
      document.getElementById('gth-quit-overlay').style.display = 'flex';
    });
  });
  document.getElementById('btn-gth-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('gth-quit-overlay').style.display = 'none';
  });
  document.getElementById('btn-gth-quit-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('gth-quit-overlay').style.display = 'none';
    // MDLM quit contract (PASS pattern): a client leaving mid-game must tell the host,
    // which dissolves the match for every remaining device — resetToLobby() alone only
    // tears down THIS device's view.
    if (syllyMultiplayerMode === 'client') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'GTH_PLAYER_LEFT', playerIdx: mpMyPlayerIdx } });
    }
    resetToLobby();
  });

  // ── New Session overlay ─────────────────────────────────────────
  document.getElementById('btn-gth-new-session').addEventListener('click', () => {
    playDone();
    const confirmBtn = document.getElementById('btn-gth-new-session-confirm');
    if (syllyMultiplayerMode === 'host') {
      confirmBtn.textContent = 'Restart in Lobby';
    } else if (syllyMultiplayerMode === 'client') {
      confirmBtn.textContent = 'Leave Session';
    } else {
      confirmBtn.textContent = 'Start New Session';
    }
    document.getElementById('gth-new-session-overlay').style.display = 'flex';
  });
  document.getElementById('btn-gth-new-session-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('gth-new-session-overlay').style.display = 'none';
  });
  document.getElementById('btn-gth-new-session-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('gth-new-session-overlay').style.display = 'none';
    if (syllyMultiplayerMode !== 'single') {
      mpReturnToLobby();
      return;
    }
    gthResetState();
    gthShowMenu();
  });

  // ── Patient Intake ready button ──────────────────────────────────
  document.getElementById('btn-gth-intake-ready').addEventListener('click', () => {
    if (gthIntakeTimer) { clearInterval(gthIntakeTimer); gthIntakeTimer = null; }
    playLaunch();
    const btn = document.getElementById('btn-gth-intake-ready');
    btn.disabled    = true;
    btn.textContent = 'Waiting for others…';
    btn.style.opacity = '0.5';

    const myIdx = mpMyPlayerIdx >= 0 ? mpMyPlayerIdx : 0;
    if (syllyMultiplayerMode === 'host') {
      gthPatientReady[myIdx] = true;
      if (gthPatientReady.every(Boolean)) {
        mpSendEnvelope({ type: 'SYNC', payload: { action: 'GTH_PHASE1_START' } });
        gthStartPhase1Drawing();
      }
    } else if (syllyMultiplayerMode === 'client') {
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'GTH_PATIENT_READY', playerIdx: myIdx } });
    } else {
      // Single-device path
      gthStartPhase1Drawing();
    }
  });

  // ── Disorder reveal buttons (Phase D — single-device path only) ──
  document.getElementById('btn-gth-reveal-ready').addEventListener('click', () => {
    playLaunch();
    gthShowCanvas(gthAssignedDisorders[gthCurrentDisorderIdx]);
  });
  document.getElementById('btn-gth-between-draw').addEventListener('click', () => {
    playLaunch();
    gthDisorderSubState = 'preview';
    gthShowDisorderReveal(gthCurrentDisorderIdx);
  });

  // ── Canvas buttons (Phase D) ─────────────────────────────────────
  document.getElementById('btn-gth-canvas-clear').addEventListener('click', () => {
    playWhoosh();
    CanvasDraw.clear();
  });
  document.getElementById('btn-gth-canvas-undo').addEventListener('click', () => {
    playPillClick();
    CanvasDraw.undo();
  });
  document.getElementById('btn-gth-canvas-done').addEventListener('click', () => {
    gthFinishDrawing();
  });

  // ── Big Reveal: host taps Next (Phase F) ─────────────────────────
  document.getElementById('btn-gth-reveal-next').addEventListener('click', () => {
    playWhoosh();
    gthRevealIdx++;
    if (syllyMultiplayerMode !== 'single') {
      mpSendEnvelope({
        type: 'SYNC',
        payload: { action: 'GTH_REVEAL_NEXT', revealIdx: gthRevealIdx }
      });
    }
    gthShowBigReveal();
  });

  // ── Big Reveal: host taps Finish / See Final Results (Phase F) ────
  document.getElementById('btn-gth-reveal-finish').addEventListener('click', () => {
    playLaunch();
    if (syllyMultiplayerMode !== 'single') {
      mpSendEnvelope({
        type: 'SYNC',
        payload: { action: 'GTH_REVEAL_FINISH' }
      });
    }
    gthShowFinalReport();
  });

  // ── Final Report: exit button (Phase F) ───────────────────────────
  document.getElementById('btn-gth-final-exit').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Big Reveal: exit button (mid-game quit → game menu) ───────────
  document.getElementById('btn-gth-big-reveal-exit').addEventListener('click', () => {
    playExit();
    document.getElementById('gth-quit-overlay').style.display = 'flex';
  });

  // ── Shrink intro (Phase E) ────────────────────────────────────────
  document.getElementById('btn-gth-shrink-start').addEventListener('click', () => {
    if (syllyMultiplayerMode === 'client') return; // clients have no button — safety guard
    if (gthShrinkIntroTimer) { clearInterval(gthShrinkIntroTimer); gthShrinkIntroTimer = null; }
    playLaunch();
    const endTimestamp = Date.now() + gthDiagnosisWindow * 1000;
    mpSendEnvelope({
      type: 'SYNC',
      payload: { action: 'GTH_PHASE2_BEGIN', endTimestamp },
    });
    gthStartPhase2Timer(endTimestamp);
    gthShowCase();
  });

  // ── Case screen: Diagnostic Card selection (Phase E) ─────────────
  // Event delegation — cards are generated dynamically by gthShowCase()
  document.getElementById('screen-gth-case').addEventListener('click', e => {
    const card = e.target.closest('.btn-gth-diag-card');
    if (!card) return;
    const selectedId = card.getAttribute('data-disorder-id');
    if (!selectedId) return;
    gthSubmitDiagnosis(selectedId);
  });

  // ── Case screen: Deep Dive submit (Phase E) ───────────────────────
  document.getElementById('btn-gth-deepdive-submit').addEventListener('click', () => {
    const input = document.getElementById('gth-deepdive-input');
    const val   = input.value.trim();
    if (!val) {
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      return;
    }
    const caseItem = gthQueue[gthQueueIdx];
    if (!caseItem) return;
    const disorder = gthAllDisorders.find(d => d.id === caseItem.disorderId);
    if (!disorder) return;
    const norm  = normaliseWord(val);
    const match = normaliseWord(disorder.name) === norm ||
                  (disorder.aliases || []).some(a => normaliseWord(a) === norm);
    if (!match) {
      const errEl = document.getElementById('gth-deepdive-error');
      errEl.textContent = 'Unrecognised — try again';
      errEl.classList.remove('hidden');
      playBoing();
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      return;
    }
    gthSubmitDiagnosis(disorder.id);
  });

  gthLoadData();
});
