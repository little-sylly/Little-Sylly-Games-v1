// ═══════════════════════════════════════════════════════════════════════════
// nt.js — Net-Trace (mazing / spatial-optimisation grid router)
// Game 13. Theme: AMAZE_INC / AMAZE_OS security terminal. Build a Node so the
// automated Breach Vector takes the LONGEST path Ingress→Egress. Highest System
// Efficiency Rating (SER) wins. Sylly Mode = DNP (Distributed Network Protocol):
// 2 corporate clusters chain their Nodes into one continuous relay.
//
// Spec: docs/new-game-tech-net-trace.md  |  Brief: docs/new-ideas/new-game-brief-net-trace.md
//
// Depends on: engine.js (showScreen, playLaunch, playSuccess, playBoing,
//             playWhoosh, playDone, playExit, playAlarm, playTick, playPillClick,
//             resetToLobby, shuffle, formatTime),
//             engine-multiplayer.js (mpSendEnvelope, mpLockSync, mpUnlockSync,
//             mpMyPlayerIdx, mpPlayerSlots, mpReturnToLobby, mpShowModeScreen,
//             mpLobbyRoster, syllyMultiplayerMode, syllyDeviceUid)
//
// ARCHITECTURE NOTE (first-in-suite): NT ships its OWN game-local RAF canvas
// renderer (NOT js/lib/canvas-draw.js — that is a stroke-capture module) and a
// vanilla BFS pathfinder. ntRafHandle is a TIMER — cancel it in every teardown
// path (quit, resetToLobby, early playback exit) or it ticks against the next
// screen (Timer Lifecycle rule).
// ═══════════════════════════════════════════════════════════════════════════

// ── ENGINE BALANCING CONSTANTS ──────────────────────────────────────────────
// Model (faithful to maze.game / WC3 CUSTOM mazing — see plan + docs/new-ideas/net-trace-issues.md):
// ONE uniform N×N TILE grid (Matrix Scale = N directly, 16/18/20). Every block is a
// 2×2-TILE footprint anchored at ANY integer tile (1-tile placement resolution,
// STRICT zero-overlap — staggered disjoint blocks make the 1-tile corridors).
// The runner is a 0.5-tile SQUARE body: pathfinding runs on a ¼-tile config-space
// lattice with every solid inflated by the runner half-width (0.25 tile = exactly
// ONE sub-cell — clean integer inflation). Corners stay SHARP, just offset outward,
// so the runner must clear a corner before turning → organic turn delay, NO turn timer.
// Score = pure latency = travel distance × NT_BASE_TILE_TIME + duration-based slows.
const NT_GRID_DEFAULT       = 18;       // default tile grid side (16/18/20 selectable)
const NT_BLOCK              = 2;        // every placed block is NT_BLOCK×NT_BLOCK tiles
const NT_LATTICE_K          = 4;        // config-space sub-cells per tile (¼-tile = 0.25 = runner half-width ⇒ 1-sub-cell inflation)
const NT_RUNNER_HALF        = 0.25;     // runner square half-width in tiles (0.5 body ⇒ 0.25 clearance each side of a 1-tile corridor)

// TIMING & MOVEMENT (abstract "latency" units; calibrated to maze.game ratios —
//   straight full-height run ≈ 18000 on an 18 grid, one full slow ≈ +15000)
const NT_BASE_TILE_TIME     = 1000;     // latency per 1 tile of straight travel (18 tall ⇒ 18000)
const NT_DIAG = Math.SQRT2;             // diagonal lattice-step length
const NT_SUBSTEP            = 0.25;      // tiles per timeline integration tick (fixed-distance; AoE checked each tick)

// SLOW (honeypot) — 0.5× speed for a FIXED duration (timer, persists outside the AoE);
//   non-stacking (re-trigger extends, never deepens); cooldown gates the quad re-trigger.
const NT_HONEYPOT_RADIUS    = 3 * Math.SQRT2; // ≈4.243 tiles from block dead-centre (3× the unit-square diagonal)
const NT_HONEYPOT_RADIUS_SQ = 18;       // (dx*dx)+(dy*dy) <= 18 — the per-tick squared AoE check (= (3√2)²)
const NT_HONEYPOT_SLOW      = 0.50;     // speed multiplier while slowed
const NT_HONEYPOT_DURATION  = 35000;    // slow lifetime in latency units; matches cooldown → ~7s real at 5× playback
const NT_HONEYPOT_COOLDOWN  = 35000;    // re-trigger lockout per honeypot; ≥ NT_HONEYPOT_DURATION → one trigger per slow window (~7s real at 5×)

// PLAYBACK
const NT_PLAYBACK_SPEED     = 5;        // time-compression factor (§16-Q5 — start 5×, dial by feel)

// VISUAL THEME — PLAYFIELD palette (canvas only; NOT the emerald UI chrome)
const NT_COLOR_BASE         = '#0f172a';  // slate-900 — canvas base
const NT_COLOR_FIREWALL     = '#06b6d4';  // cyan-500 — user-built firewall segments
const NT_COLOR_BAD_SECTOR   = '#334155';  // slate-700 — fixed obstacles (flat, no glow)
const NT_COLOR_HONEYPOT        = '#d946ef';  // fuchsia-500 — slow traps (player-placed)
const NT_COLOR_NATIVE_HONEYPOT = '#5b21b6';  // violet-800 — fixed map obstacles (muted structural amethyst)
const NT_COLOR_BREACH       = '#ef4444';  // red-500 — the breach vector signal head
const NT_TRAIL_ALPHA        = 0.20;       // canvas overfill alpha for the fading neon trail

// INVENTORY GENERATION BANDS (calibration — §10)
const NT_BADSECTOR_MIN_PCT  = 0.02;     // density floor (% of tiles) — lowered for sparse open-maze variety
const NT_BADSECTOR_MAX_PCT  = 0.18;     // density ceiling (% of tiles)
const NT_FIREWALL_MIN_PCT   = 0.06;     // firewall inventory floor (% of tiles) — lowered for scarcity nodes (~5 min on 18-grid)
const NT_FIREWALL_MAX_PCT   = 0.30;     // firewall inventory ceiling (% of tiles)
const NT_HONEYPOT_CAP       = 4;        // bounds the natural per-cycle honeypot ROLL only (ntGenerateNode) —
                                        // NOT a placement or DNP-deposit ceiling; nothing enforces it once
                                        // inventory exists. DNP surplus deposits had no honeypot cap either,
                                        // as of D29 (16 Aug 2026) — same reasoning as firewall, which never had one.
const NT_ALLOC_HONEYPOT_CAP = 2;        // bound on the per-cycle RANDOM honeypot roll (see ntGenerateNode).
const NT_LONGPRESS_MS       = 400;      // long-press threshold (honeypot place / firewall upgrade)
// DNP surplus — scales PER PLAYER so the per-leg average is identical at 2v2 and 4v4.
// Base inventory is untouchable; this is the only thing a captain moves.
const NT_SURPLUS_FIREWALL   = 3;        // surplus firewalls per team member
const NT_SURPLUS_HONEYPOT   = 1;        // surplus honeypots per team member

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ──────────────────────────────────
let ntMatrixScale    = 18;       // 16 | 18 | 20 — tile grid side (N)
let ntIterations     = 5;        // 5 | 7 | 10  — Simulation Iterations (rounds)
let ntHardeningWin   = 90;       // 45 | 60 | 90 | 120 (seconds) — build timer
let ntNativeHoneypots= 2;        // 0 | 1 | 2   — max Native Honeypots baked into seed
let ntDebugMode      = false;    // Debug / Sandbox Mode — mutually exclusive with ntSyllyMode
let ntSyllyMode      = false;    // DNP (Distributed Network Protocol) — always last setting

// ── Roster (set in lobby, persist across play-agains) ───────────────────────
let ntPlayerCount    = 1;        // total players (1 solo … 8 MDLM)
let ntPlayerNames    = [];       // from mpPlayerSlots[i].nickname
let ntTeamIdx        = [];       // DNP: per-player team (0|1) from mpLobbyRoster.playerTeamIdx
let ntTeamNames      = ['Amaze Inc.', 'Pender Securities']; // DNP team names
let ntCaptainSlots   = [-1, -1]; // DNP: per-team captain player index

// ── Match state (reset each play-again / Reboot) ────────────────────────────
let ntCycle          = 0;        // current Simulation Cycle (0-indexed)
let ntCycleSERs      = [];       // [cycleIdx][playerIdx] = number (%) — Standard
let ntTeamCycleSERs  = [];       // [cycleIdx][teamIdx]   = number (%) — DNP
let ntOverallSER     = [];       // rolling average per PLAYER — both modes (DNP's team rollup is derived in ntTeamOverallSER())
let ntCycleLatencies = [];       // [cycleIdx][playerIdx] = raw latency ms (solo: [latency])

// ── Playback render state (reset each playback) ─────────────────────────────
let ntPlaybackTimeline = null;   // { path, segments, fires, latencyMs }
let ntPlaybackStartTs  = 0;      // performance.now() at playback start
let ntPlaybackScrubMs  = null;   // non-null = scrubbing (paused at this sim-ms)
let ntRoutingTimer     = null;   // status-bar EXCEPTION flash revert handle
let ntRafHandle      = null;     // requestAnimationFrame handle — TIMER, cancel everywhere
let ntBuildTimer     = null;     // setInterval — Hardening countdown
let ntHuddleTimer    = null;     // setInterval — DNP huddle countdown
let ntResolveGuard   = null;     // setTimeout — host build-resolve fallback (prevents permanent hang)
let ntCycleResolved  = false;    // host: true once this cycle's playback has been resolved (guards double-resolve)
let ntCommitted      = false;    // true once this device has committed its build (guards double-commit)

// ── Cycle / Node state (reset each cycle) ───────────────────────────────────
// ntNode = { n,                                  // tile grid side (16/18/20)
//            ingress:{edge,idx}, egress:{edge,idx},   // border ports — edge + tile index along it (never same edge)
//            badSectors:[{ax,ay}], nativeHoneypots:[{ax,ay}] }   // 2×2-block top-left tile anchors
let ntNode           = null;
let ntInventory      = { firewall: 0, honeypot: 0 }; // block budget, randomised per cycle, same for all
let ntMyPlacements   = [];       // this device's [{ax,ay,type:'firewall'|'honeypot'}] — 2×2-block anchors (top-left tile)
let ntBuildCells     = [];       // [ty][tx] DOM cell refs for the build grid (rebuilt each render)
let ntFirewallUsed   = 0;        // live counters (cached from ntMyPlacements for UI)
let ntHoneypotUsed   = 0;
let ntPlaybackData   = null;     // host-broadcast: per-player/per-team { timeline, latencyMs }
let ntViewingUid     = null;     // which player's maze is loaded in the playback comparison slot

// ── DNP cycle state ──────────────────────────────────────────────────────────
let ntTeamNodes      = [];       // [playerIdx] = Node for that player's relay leg (all players, DNP)
let ntAllocationPool = { firewall: 0, honeypot: 0 }; // my team's SURPLUS to deposit (NT_SURPLUS_* × team size) — NOT the total
let ntAllocations    = [];       // [legIdx within my team] = { firewall, honeypot } = base inventory + deposits
let ntAllocBrush     = 'firewall'; // DNP allocation screen: which resource a leg-tap deposits
let ntAllocDeposits  = [];       // captain-local Undo stack — [{ leg, type }] in tap order; never synced
let ntAllocViewLeg   = 0;        // captain-local: which leg the windowed maze viewer shows; never synced
let ntHuddlePhase    = 'editing';// 'editing' | 'locked'
let ntTeamAllocLocked      = [false, false]; // host-only: which team's captain has locked
let ntTeamWorkingAllocs    = [[], []];       // host-only: [team][legIdx] = {firewall,honeypot} current state
let ntAllPlayerAllocations = [];            // host-only: [playerIdx] = { firewall, honeypot } final per-leg alloc

// ── MP readyCheck matrices (reset each phase) ───────────────────────────────
let ntGateReadyCheck    = [];     // per-player ready at Cycle Initialization Gate
let ntCommitReadyCheck  = [];     // per-player committed at build phase
let ntSummaryReadyCheck = [];     // per-player ready to advance past the Diagnostic Summary

// ── Debug / Sandbox Mode session state (all cleared by ntResetState; ntDebugMode is a
//    SETTING and deliberately survives, like every other setting) ──────────────────────
let ntDebugBrush         = 'bad'; // Node Editor: 'bad' | 'native' | 'ingress' | 'egress'
let ntDebugMyAttempt     = 0;     // MY attempt number on the current node (1-based when shown)
let ntDebugBest          = null;  // MY best so far — { latencyMs, placements, timeline } | null
let ntDebugFinished      = [];    // [playerIdx] = bool — host authority, the readiness gate
let ntDebugAttemptCounts = [];    // [playerIdx] = int  — display only, drives the roster

// ── PTP state (reset each cycle in ntBeginCycle; reset on reboot in ntResetState) ──
let ntPtpTurn            = 0;    // index of the player whose turn it currently is (0..ntPlayerCount-1)
let ntPtpTimelines       = [];   // [playerIdx] = committed timeline (filled as each player finishes)
let ntPtpPlacements      = [];   // [playerIdx] = placement array snapshot (for comparison render)
let ntViewingPlayerIdx   = 0;    // which player's trace is loaded in the main playback canvas
// ── DNP continuous-bridge playback (team-sequence journey) ───────────────────
let ntPbTeam      = 0;           // which team's bridge is being watched (default = own team)
let ntPbJourney   = null;        // { team, legs:[{pIdx,legIdx,name,node,timeline,placements,offset,latency}], total }
let ntPbActiveLeg = -1;          // active leg index in the journey (drives slide + top bar)
// ── Match-level PTP log (persists across cycles for System Logs) ─────────────
let ntAllCycleTimelines  = [];   // [cycleIdx][playerIdx] = timeline
let ntAllCyclePlacements = [];   // [cycleIdx][playerIdx] = placements snapshot
let ntAllCycleNodes      = [];   // [cycleIdx] = node object (for thumbnail re-rendering)
// Gate button callback — changed per gate context (default → ntShowBuild, gather → ntShowComparisonPlayback)
let ntGateCallback              = null;
// Diagnostic Summary "Next Cycle"/"Ready" callback — set per ntShowSummary() call; branches on
// solo/PTP (immediate advance) vs MDLM host (readyCheck-gated advance) vs MDLM client (send ready).
let ntSummaryCallback           = null;
// Playback Continue callback — null = normal cycle advance; set when viewing a log round → returns to logs
let ntPlaybackContinueCallback  = null;

// ── UI / transient state ─────────────────────────────────────────────────────
let ntRoutingState   = 'valid';  // 'valid' | 'exception' (drives status-bar flash)
let ntPlaybackPhase  = 'tracing';
let ntSummaryMode    = 'cycle';  // 'cycle' | 'match'
let ntOverclockTheme = false;    // easter-egg monochrome/amber theme (triple-tap AMAZE_INC_v1.2)
let ntBootTimers      = [];      // cycle-boot terminal typewriter setTimeout handles
let ntLongPressTimer = null;     // long-press gesture threshold handle (build screen)
let ntGhostAnchor    = null;     // {ax,ay} of current 2×2 ghost preview, or null when hidden
let ntPlaybackPaused = false;    // true when manually paused via play/pause button
let ntPlaybackLoopFn = null;     // stored RAF loop fn ref (set in ntStartPlayback — enables pause/resume)

// ── Derived at runtime (never persisted) ────────────────────────────────────
// ntIsDNP() = ntSyllyMode === true (mirrors isSylly pattern)
function ntIsDNP() { return ntSyllyMode === true; }

// Debug Mode forces the Hardening Window to ∞. `0` already means "no limit" everywhere in NT
// (ntStartBuildTimer early-returns and renders ∞), so this is a new way of reaching shipped
// code rather than new behaviour. Single-source, per logic-engine.md: a mode that mutates a
// value routes every reader through one function instead of repeating the branch at four call
// sites where the fifth one added later would be missed.
function ntEffectiveHardeningWin() { return ntDebugMode ? 0 : ntHardeningWin; }

// ── Wire repair (BUG-06 class — logic-engine.md "Firebase erases every EMPTY value") ──
// Both of these repair a collection nested INSIDE an object that arrived over the wire.
// That nesting is why the Aug 2026 suite-wide BUG-06 audit missed them: it scanned for
// direct payload-to-collection assignment in appliers, and `ntNode = payload.node` looks
// clean — the erasure is one and two levels further down.

// A node whose nativeHoneypots (or badSectors) came back empty. ntGenerateNode rolls
// convertN = ntRandInt(0, min(ntNativeHoneypots, …)), which is 0 outright under the
// "Native Honeypots: 0" setting and can be 0 under any other — so `nativeHoneypots: []`
// is ordinary, and Firebase deletes it. Call this on EVERY node arriving from a packet.
function ntNormaliseNode(node) {
  if (!node) return node;
  node.badSectors      = node.badSectors      || [];
  node.nativeHoneypots = node.nativeHoneypots || [];
  return node;
}

// A timeline for a player who placed no honeypots has fires:[] and slowSpans:[] — both
// erased in flight. ntRenderFrame reads tl.fires unguarded, so the RAF frame throws on
// every device except the host (which never round-trips its own timelines).
function ntNormaliseTimeline(tl) {
  if (!tl) return tl;
  tl.polyline  = tl.polyline  || [];
  tl.fires     = tl.fires     || [];
  tl.slowSpans = tl.slowSpans || [];
  tl.samples   = tl.samples   || [];
  return tl;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN TRANSITIONS  (Step 3 navigation wired; logic injected in Step 5)
// ═══════════════════════════════════════════════════════════════════════════

// Solo single-device entry (skips MODE/LOBBY/ROSTER — always Standard).
// Step 5: generate cycle-1 Node before the handshake. For now drives the flow.
function ntStartSolo() {
  ntPlayerCount = 1;
  ntCycle = 0;
  if (ntDebugMode) { ntShowAuthoring(); return; }
  ntBeginCycle();
}

// ── PTP setup screen ─────────────────────────────────────────────────────────

function ntShowSetup() {
  ntSelectPill('nt-count', ntPlayerCount);
  document.querySelectorAll('.nt-setup-name-input').forEach(inp => {
    const idx = parseInt(inp.dataset.ntPlayer, 10);
    inp.style.display = idx < ntPlayerCount ? '' : 'none';
    const defaultName = 'ADMIN-' + (idx + 1);
    inp.value = (ntPlayerNames[idx] && ntPlayerNames[idx] !== defaultName) ? ntPlayerNames[idx] : '';
  });
  showScreen('screen-nt-setup');
}

function ntStartPTP() {
  ntPlayerNames = [];
  document.querySelectorAll('.nt-setup-name-input').forEach(inp => {
    const idx = parseInt(inp.dataset.ntPlayer, 10);
    if (idx < ntPlayerCount) {
      ntPlayerNames[idx] = inp.value.trim() || ('ADMIN-' + (idx + 1));
    }
  });
  ntCycle = 0;
  ntCycleSERs = [];
  ntTeamCycleSERs = [];
  ntCycleLatencies = [];
  ntOverallSER = [];
  if (ntDebugMode) { ntShowAuthoring(); return; }
  ntBeginCycle();
}

// ── PTP turn management ───────────────────────────────────────────────────────

// Show the gate screen configured for the current PTP player's handover.
function ntBeginPtpTurn() {
  const name = ntPlayerNames[ntPtpTurn] || ('ADMIN-' + (ntPtpTurn + 1));
  const heading = document.getElementById('nt-gate-heading');
  const sub = document.getElementById('nt-gate-sub');
  const btn = document.getElementById('btn-nt-gate-ready');
  if (heading) heading.textContent = 'Cycle Initialisation Gate';
  if (sub) sub.textContent = ntPtpTurn === 0
    ? 'Your turn first, ' + name + '. Tap when ready.'
    : 'Hand the phone to ' + name + '.';
  if (btn) btn.textContent = 'Ready — ' + name + ' ▶';
  ntGateCallback = () => ntShowBuild();
  ntPlayGateBoot([ntSimTag(), 'LOGIN: ' + name.toUpperCase()]);
}

// Called after each player commits their build in PTP mode.
function ntCommitPtp() {
  const timeline = ntComputeTimeline_local();
  ntPtpTimelines[ntPtpTurn] = timeline;
  ntPtpPlacements[ntPtpTurn] = ntMyPlacements.slice();
  ntPtpTurn++;
  if (ntPtpTurn < ntPlayerCount) {
    // Reset build state for next player's fresh start on the same node
    ntMyPlacements = [];
    ntFirewallUsed = 0;
    ntHoneypotUsed = 0;
    ntBeginPtpTurn();
  } else {
    // All players done — score, then gather gate before comparison playback
    ntResolveCyclePtp();
    if (ntPlayerCount > 1) {
      ntShowGatherGate();
    } else {
      ntShowComparisonPlayback();
    }
  }
}

// Gather gate shown after the last PTP player commits — everyone assembles to watch
// playback. No boot log here — it's not a login moment, so it skips straight to the button.
function ntShowGatherGate() {
  const heading = document.getElementById('nt-gate-heading');
  const sub = document.getElementById('nt-gate-sub');
  const btn = document.getElementById('btn-nt-gate-ready');
  const count = ntPlayerCount;
  if (heading) heading.textContent = 'Cycle Diagnostic Gate';
  if (sub) sub.textContent = count > 1
    ? 'All ' + count + ' admins done. Gather around to watch the playback.'
    : 'Analysis complete. Tap to view playback.';
  if (btn) btn.textContent = 'Launch Playback ▶';
  ntGateCallback = () => ntShowComparisonPlayback();
  ntShowGateNow();
}

// Relative-ceiling SER: player with the highest latency = 100% (longest path wins).
function ntResolveCyclePtp() {
  const latencies = ntPtpTimelines.map(tl => (tl ? tl.latencyMs : 0));
  ntCycleLatencies[ntCycle] = latencies.slice();
  const maxLat = Math.max(...latencies) || 1;
  const sers = latencies.map(lat => (lat / maxLat) * 100);
  ntCycleSERs[ntCycle] = sers.slice();
  ntOverallSER = Array.from({ length: ntPlayerCount }, (_, i) => {
    let sum = 0, n = 0;
    ntCycleSERs.forEach(c => { if (c && typeof c[i] === 'number') { sum += c[i]; n++; } });
    return n ? sum / n : 0;
  });
  // Persist for System Logs (node is immutable after generation — safe to reference directly)
  ntAllCycleTimelines[ntCycle]  = ntPtpTimelines.slice();
  ntAllCyclePlacements[ntCycle] = ntPtpPlacements.map(p => p.slice());
  ntAllCycleNodes[ntCycle]      = ntNode;
}

// ── Comparison playback ───────────────────────────────────────────────────────

// Load player 0 into the main playback canvas, render the panel, open screen.
function ntShowComparisonPlayback() {
  ntViewingPlayerIdx = 0;
  ntPlaybackTimeline = ntPtpTimelines[0];
  ntMyPlacements = ntPtpPlacements[0];
  const panel = document.getElementById('nt-comparison-panel');
  if (panel) panel.style.display = ntPlayerCount > 1 ? 'flex' : 'none';
  ntRenderComparisonPanel();
  ntShowPlayback();
}

// Build player chip row + thumbnail canvases inside #nt-comparison-panel.
function ntRenderComparisonPanel() {
  const chipsEl = document.getElementById('nt-player-chips');
  const thumbsEl = document.getElementById('nt-thumbnail-row');
  if (!chipsEl || !thumbsEl || !ntNode) return;

  chipsEl.innerHTML = '';
  thumbsEl.innerHTML = '';

  const savedPlacements = ntMyPlacements;
  const THUMB = 80;

  ntPtpPlacements.forEach((placements, idx) => {
    const name = ntPlayerNames[idx] || ('OP-' + (idx + 1));
    const cycleSers = ntCycleSERs[ntCycle];
    const ser = (cycleSers && cycleSers[idx] != null) ? cycleSers[idx].toFixed(1) + '%' : '--';

    // Chip
    const chip = document.createElement('button');
    chip.className = 'pill flex-shrink-0' + (idx === ntViewingPlayerIdx ? ' pill-active-emerald' : '');
    chip.dataset.ntPlayerIdx = String(idx);
    chip.textContent = name + ' · ' + ser;
    chip.addEventListener('click', () => { playPillClick(); ntSelectComparisonPlayer(idx); });
    chipsEl.appendChild(chip);

    // Thumbnail canvas — maze layout only (no runner animation)
    const canvas = document.createElement('canvas');
    canvas.width = THUMB;
    canvas.height = THUMB;
    canvas.className = 'rounded cursor-pointer flex-shrink-0';
    canvas.style.cssText = 'width:' + THUMB + 'px;height:' + THUMB + 'px;border:2px solid ' +
      (idx === ntViewingPlayerIdx ? '#10b981' : '#334155') + ';display:block';
    canvas.dataset.ntPlayerIdx = String(idx);
    canvas.addEventListener('click', () => { playPillClick(); ntSelectComparisonPlayer(idx); });

    // Draw using this player's placements (temporarily swap global)
    ntMyPlacements = placements;
    const ctx = canvas.getContext('2d');
    const px = THUMB / ntNode.n;
    ctx.fillStyle = NT_COLOR_BASE;
    ctx.fillRect(0, 0, THUMB, THUMB);
    ctx.save();
    ctx.strokeStyle = 'rgba(52,211,153,0.12)';
    ctx.lineWidth = 0.3;
    for (let li = 0; li <= ntNode.n; li++) {
      ctx.beginPath(); ctx.moveTo(li * px, 0); ctx.lineTo(li * px, THUMB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, li * px); ctx.lineTo(THUMB, li * px); ctx.stroke();
    }
    ctx.restore();
    ntDrawMaze(ctx, px);
    thumbsEl.appendChild(canvas);
  });

  ntMyPlacements = savedPlacements;
}

// ── System Logs overlay ───────────────────────────────────────────────────────

function ntOpenLogs() {
  playDone();
  const overlay = document.getElementById('nt-logs-overlay');
  if (!overlay) return;
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  ntRenderLogs();
  overlay.style.display = 'flex';
}

// Render per-cycle cards inside #nt-logs-content — static thumbnails, no RAF.
function ntRenderLogs() {
  const container = document.getElementById('nt-logs-content');
  if (!container) return;
  container.innerHTML = '';
  const THUMB = 64;

  const savedPlacements = ntMyPlacements;
  const savedNode = ntNode;

  ntAllCycleNodes.forEach((node, cycleIdx) => {
    const placements = ntAllCyclePlacements[cycleIdx] || [];
    const sers       = ntCycleSERs[cycleIdx] || [];
    const winnerIdx  = sers.reduce((best, v, i) => v > (sers[best] || 0) ? i : best, 0);
    const winnerName = ntPlayerNames[winnerIdx] || ('ADMIN-' + (winnerIdx + 1));

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform duration-100 cursor-pointer';
    card.title = 'Tap to replay VS-' + String(cycleIdx + 1).padStart(2, '0');
    card.addEventListener('click', () => ntOpenLogRound(cycleIdx));

    // Header: cycle label + winner
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    header.innerHTML =
      `<p class="text-xs font-mono font-semibold text-stone-500 uppercase tracking-widest">VS-${String(cycleIdx + 1).padStart(2, '0')}</p>` +
      `<p class="text-xs font-mono text-emerald-600 font-semibold">&#x26A1; ${winnerName}</p>`;
    card.appendChild(header);

    // Thumbnail row: one canvas per player
    const thumbRow = document.createElement('div');
    thumbRow.className = 'flex gap-3 overflow-x-auto pb-0.5';

    ntNode = node; // use this cycle's node for ntDrawMaze
    placements.forEach((p, idx) => {
      const name = ntPlayerNames[idx] || ('ADMIN-' + (idx + 1));
      const ser  = sers[idx] != null ? sers[idx].toFixed(1) + '%' : '--';
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-1 flex-shrink-0';

      const canvas = document.createElement('canvas');
      canvas.width  = THUMB;
      canvas.height = THUMB;
      canvas.style.cssText = 'width:' + THUMB + 'px;height:' + THUMB + 'px;border-radius:8px;border:2px solid ' +
        (idx === winnerIdx ? '#10b981' : '#334155') + ';display:block';

      ntMyPlacements = p;
      const ctx = canvas.getContext('2d');
      const px  = THUMB / node.n;
      ctx.fillStyle = NT_COLOR_BASE;
      ctx.fillRect(0, 0, THUMB, THUMB);
      ctx.save();
      ctx.strokeStyle = 'rgba(52,211,153,0.12)';
      ctx.lineWidth = 0.3;
      for (let li = 0; li <= node.n; li++) {
        ctx.beginPath(); ctx.moveTo(li * px, 0); ctx.lineTo(li * px, THUMB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, li * px); ctx.lineTo(THUMB, li * px); ctx.stroke();
      }
      ctx.restore();
      ntDrawMaze(ctx, px);

      const label = document.createElement('p');
      label.className = 'text-xs font-mono text-stone-400 text-center leading-tight';
      label.textContent = name.length > 8 ? name.slice(0, 7) + '…' : name;

      const serLabel = document.createElement('p');
      serLabel.className = 'text-xs font-mono text-emerald-600 font-semibold text-center';
      serLabel.textContent = ser;

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);
      wrapper.appendChild(serLabel);
      thumbRow.appendChild(wrapper);
    });

    card.appendChild(thumbRow);
    container.appendChild(card);
  });

  ntMyPlacements = savedPlacements;
  ntNode = savedNode;

  if (container.children.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-stone-400 text-sm text-center font-mono';
    empty.textContent = '// NO CYCLES LOGGED';
    container.appendChild(empty);
  }
}

// Open the animated comparison playback for a historical cycle from System Logs.
// On Continue, returns to the logs overlay instead of advancing the match.
function ntOpenLogRound(cycleIdx) {
  playLaunch();
  const overlay = document.getElementById('nt-logs-overlay');
  if (overlay) overlay.style.display = 'none';

  const originalCycle      = ntCycle;
  const originalNode       = ntNode;
  const originalTimelines  = ntPtpTimelines;
  const originalPlacements = ntPtpPlacements;

  // Load historical cycle data into the comparison globals
  ntNode           = ntAllCycleNodes[cycleIdx];
  ntPtpTimelines   = ntAllCycleTimelines[cycleIdx];
  ntPtpPlacements  = ntAllCyclePlacements[cycleIdx];
  ntCycle          = cycleIdx; // so SER labels in comparison panel are correct

  // Continue → restore state and re-open logs
  ntPlaybackContinueCallback = () => {
    ntCycle          = originalCycle;
    ntNode           = originalNode;
    ntPtpTimelines   = originalTimelines;
    ntPtpPlacements  = originalPlacements;
    ntOpenLogs();
  };

  const btn = document.getElementById('btn-nt-playback-continue');
  if (btn) btn.textContent = '← Back to Logs';

  ntShowComparisonPlayback();
}

// Switch main playback canvas to show a different player.
function ntSelectComparisonPlayer(idx) {
  if (idx === ntViewingPlayerIdx) return;
  ntViewingPlayerIdx = idx;
  ntPlaybackTimeline = ntPtpTimelines[idx];
  ntMyPlacements = ntPtpPlacements[idx];
  // Update chip highlight
  document.querySelectorAll('#nt-player-chips .pill').forEach((chip, i) => {
    chip.classList.toggle('pill-active-emerald', i === idx);
  });
  // Update thumbnail borders
  document.querySelectorAll('#nt-thumbnail-row canvas').forEach((c, i) => {
    c.style.borderColor = i === idx ? '#10b981' : '#334155';
  });
  // Restart playback from beginning for this player
  ntStartPlayback();
}

// Post-lobby menu Play (MDLM): onPassThePhone has fired, players are ready.
// Host calls ntStartMatch(); clients already showing the boot terminal.
function ntStartSession() {
  ntCycle = 0;
  ntCycleSERs = [];
  ntTeamCycleSERs = [];
  ntCycleLatencies = [];
  ntOverallSER = [];
  ntAllCycleTimelines  = [];
  ntAllCyclePlacements = [];
  ntAllCycleNodes      = [];
  // Host builds + shows the boot gate itself, synchronously, below. A client has nothing
  // to show yet (its own boot needs the roster-derived name it's just been given, and the
  // node data NT_GENERATE is about to send) — a brief standby covers that short wait.
  if (window.syllyMultiplayerMode === 'host') {
    if (ntDebugMode) ntShowAuthoring();
    else ntStartMatch();
  } else {
    ntShowStandby(ntDebugMode ? 'Authoring node…' : 'Booting cluster…');
  }
}

// Shared per-cycle reset — the subset genuinely common to BOTH cycle-start entry points:
// ntStartMatch (Standard/DNP, the shipped match) and ntDeployNode (Debug). Single-sourced so
// a field can't silently drift out of sync between the two the way ntPlaybackTimeline briefly
// did (Task 6 fix round 1 — the Debug path had been missing it).
// Each caller layers its own extras on top afterwards: ntStartMatch adds the DNP allocation
// fields and the cycle-log arrays live at its own call site (ntStartSession); ntDeployNode
// adds the Debug readiness/attempt fields. Neither caller's private state belongs in here.
function ntResetCycleAccumulators(n) {
  ntMyPlacements      = [];
  ntFirewallUsed      = 0;
  ntHoneypotUsed      = 0;
  ntPlaybackTimeline  = null;
  ntPtpTurn           = 0;
  ntPtpTimelines      = [];
  ntPtpPlacements     = Array.from({ length: n }, () => []); // pre-sized — no holes
  ntGateReadyCheck    = new Array(n).fill(false);
  ntCommitReadyCheck  = new Array(n).fill(false);
  ntSummaryReadyCheck = new Array(n).fill(false);
  ntCycleResolved     = false;
}

// Host: generate cycle Node + broadcast NT_GENERATE; then route to gate (Standard) or huddle (DNP).
function ntStartMatch() {
  ntResetCycleAccumulators(ntPlayerCount);
  ntTeamAllocLocked      = [false, false];
  ntTeamWorkingAllocs    = [[], []];
  ntAllPlayerAllocations = [];

  if (ntIsDNP()) {
    // Generate ONE shared chain of legCount nodes (chained egress→ingress so the bridge
    // connects edge-to-edge). BOTH teams harden the SAME geometry per leg position — leg k
    // of team A and leg k of team B are the identical node — so the Cluster Ceiling
    // comparison (max of the two teams' latencies per leg) is a fair like-for-like.
    // First generated node sets ntInventory; the rest keep it (keepInventory = true).
    ntTeamNodes = new Array(ntPlayerCount);
    const teamMembersOf = team => ntTeamIdx.reduce((acc, t, i) => { if (t === team) acc.push(i); return acc; }, []);
    const teamAMembers = teamMembersOf(0);
    const teamBMembers = teamMembersOf(1);
    const legCount = Math.max(teamAMembers.length, teamBMembers.length);
    let invSet = false, prevEgressIdx = null;
    for (let k = 0; k < legCount; k++) {
      ntGenerateNode(invSet, prevEgressIdx);   // one shared node for leg position k
      invSet = true;
      if (teamAMembers[k] != null) ntTeamNodes[teamAMembers[k]] = ntNode;
      if (teamBMembers[k] != null) ntTeamNodes[teamBMembers[k]] = ntNode;
      prevEgressIdx = ntNode.egress.idx;
    }
    // Host's own leg
    ntNode = ntTeamNodes[mpMyPlayerIdx];

    // Each team's pool is a SURPLUS on top of every leg's base inventory — not the
    // total. Base is untouchable, so the model is purely additive: a captain who does
    // nothing plays exactly the same node everyone else would have, and can only ever
    // make a leg stronger. That is what removed the "take from P1 to give P2" step.
    const teamSizes = [0, 0];
    ntTeamIdx.forEach(t => teamSizes[t]++);
    const myTeam = ntTeamIdx[mpMyPlayerIdx];
    ntAllocationPool = {
      firewall: NT_SURPLUS_FIREWALL * teamSizes[myTeam],
      honeypot: NT_SURPLUS_HONEYPOT * teamSizes[myTeam],
    };
    ntAllocDeposits = [];
    ntAllocBrush    = 'firewall';
    ntAllocViewLeg  = 0;
    // Default allocation = each leg at its BASE inventory, surplus entirely undeposited.
    const baseAlloc = () => ({ firewall: ntInventory.firewall, honeypot: ntInventory.honeypot });
    ntAllocations = teamMembersOf(myTeam).map(baseAlloc);
    ntTeamWorkingAllocs = [0, 1].map(team => teamMembersOf(team).map(baseAlloc));
    ntHuddlePhase = 'editing';

    // Same SURPLUS formula as the host's own pool above — this is the copy every client
    // reads, so the two must not drift.
    const allPoolsPayload = [0, 1].map(team => ({
      members: teamMembersOf(team),
      pool: {
        firewall: NT_SURPLUS_FIREWALL * teamSizes[team],
        honeypot: NT_SURPLUS_HONEYPOT * teamSizes[team],
      },
    }));

    mpSendEnvelope({
      type: 'SYNC',
      payload: {
        action: 'NT_GENERATE',
        cycle: ntCycle,
        node: null,               // DNP: each device derives its node from allPlayerNodes
        inventory: ntInventory,
        allPlayerNodes: ntTeamNodes.slice(),
        isDNP: true,
      },
    });
    mpSendEnvelope({
      type: 'SYNC',
      payload: {
        action: 'NT_HUDDLE_START',
        allPlayerNodes: ntTeamNodes.slice(),
        allPools: allPoolsPayload,
        // default base allocations per team (legs start at base, whole surplus in hand)
        allAllocations: [0, 1].map(team => teamMembersOf(team).map(baseAlloc)),
        huddleDuration: ntHardeningWin * teamSizes[0], // both teams same size (validated)
      },
    });
    const myTeamForCap = ntTeamIdx[mpMyPlayerIdx];
    const isCaptain    = mpMyPlayerIdx === ntCaptainSlots[myTeamForCap];
    const myName = ntPlayerNames[mpMyPlayerIdx] || ('ADMIN-' + (mpMyPlayerIdx + 1));
    ntSetGateHeading('Cycle Initialisation Gate', 'Preparing your team’s Allocation Hub…');
    ntPlayGateBoot([ntSimTag(), 'LOGIN: ' + myName.toUpperCase() + ' — OPENING ALLOCATION HUB…'], () => {
      ntShowAllocationScreen(isCaptain);
      ntStartHuddleTimer(ntHardeningWin * teamSizes[myTeamForCap]);
    });
  } else {
    ntGenerateNode();
    mpSendEnvelope({
      type: 'SYNC',
      payload: { action: 'NT_GENERATE', cycle: ntCycle, node: ntNode, inventory: ntInventory },
    });
    ntShowMdlmGate();
  }
}

// Flavour boot lines — typed out line by line on every "Cycle Initialisation Gate" entry
// (cycle start, each PTP handover, DNP's allocation hand-off — NOT the boot-free "Cycle
// Diagnostic Gate" gather screen). `ntPlayGateBoot` appends caller-supplied context lines
// (which round this is, whose session this is) after these before playing them.
const NT_BOOT_LINES = [
  'BOOTING AMAZE INC. OS v1.2…',
  'INITIALISING OS…',
  '',
  'CONNECTING TO CLUSTER…',
  '',
  'ROUTING VIA PENDER SECURITIES…',
  'SECURING INGRESS…',
];

// Round indicator line for the boot log — "which Vulnerability Simulation is this".
function ntSimTag() {
  return 'LOADING SIMULATION ' + (ntCycle + 1) + '/' + ntIterations + '…';
}

// Generic typewriter: reveals `lines` one at a time inside `container`, then calls `callback`.
// Mirrors secret-mode.js's smTypeLines but takes an explicit container (NT owns its own log).
function ntTypeLines(container, lines, baseDelay, lineGap, callback) {
  ntBootTimers.forEach(clearTimeout);
  ntBootTimers = [];
  if (!container) { if (callback) callback(); return; }
  container.innerHTML = '';
  lines.forEach((text, i) => {
    const t = setTimeout(() => {
      const p = document.createElement('p');
      if (text === '') { p.innerHTML = '&nbsp;'; p.style.lineHeight = '0.6'; }
      else { p.textContent = text; }
      container.appendChild(p);
      container.scrollTop = container.scrollHeight;
    }, baseDelay + i * lineGap);
    ntBootTimers.push(t);
  });
  if (callback) {
    const total = baseDelay + lines.length * lineGap;
    const t = setTimeout(callback, total);
    ntBootTimers.push(t);
  }
}

// Small shared setter — every gate-entry function writes its own heading/sub text before
// calling ntPlayGateBoot()/ntShowGateNow(); this just saves repeating the two getElementById
// lookups at each call site.
function ntSetGateHeading(heading, sub) {
  const h = document.getElementById('nt-gate-heading');
  const s = document.getElementById('nt-gate-sub');
  if (h) h.textContent = heading;
  if (s) s.textContent = sub;
}

// Shows screen-nt-gate (the "Cycle Initialisation Gate" context) and plays the boot log
// under the already-visible heading/sub, at a deliberately readable pace. Callers set the
// heading/sub/button text BEFORE calling this — the button itself stays hidden until the
// log finishes typing (plus a short read-pause), then it's the only thing that reveals; the
// log stays put rather than being swapped out for a second block. `onDone`, when given,
// runs instead of revealing the button — DNP's hand-off into the Allocation Hub.
function ntPlayGateBoot(contextLines, onDone) {
  showScreen('screen-nt-gate');
  const log = document.getElementById('nt-gate-boot-log');
  const btn = document.getElementById('btn-nt-gate-ready');
  if (btn) btn.style.display = 'none';
  if (log) log.style.display = 'block';
  const extra = Array.isArray(contextLines) ? contextLines : (contextLines ? [contextLines] : []);
  const lines = NT_BOOT_LINES.concat(extra);
  ntTypeLines(log, lines, 100, 280, () => {
    // Read-pause on the final line before the button reveals — brief, not a second wait.
    const t = setTimeout(() => {
      if (onDone) onDone();
      else if (btn) btn.style.display = 'block';
    }, 300);
    ntBootTimers.push(t);
  });
}

// Shows screen-nt-gate for the "Cycle Diagnostic Gate" context (the post-build gather,
// before playback) — no boot log, heading/sub/button all visible immediately. Callers set
// the heading/sub/button text before calling this, same as ntPlayGateBoot.
function ntShowGateNow() {
  showScreen('screen-nt-gate');
  const log = document.getElementById('nt-gate-boot-log');
  const btn = document.getElementById('btn-nt-gate-ready');
  if (log) log.style.display = 'none';
  if (btn) btn.style.display = 'block';
}

// ── DNP Allocation Hub ─────────────────────────────────────────────────────

// Show the allocation screen and render the current team's cluster bridge.
// captainMode: true = captain (brush + tap-to-deposit); false = read-only.
// showScreen() FIRST, render SECOND — both are synchronous so there's no visible flash
// either order, but ntRenderAllocationScreen's conditional-centring check measures
// body.scrollHeight/stage.clientHeight, which both read 0 on a still-`display:none`
// section. Rendering before the section is visible made that check always pass
// (0 <= 0), centring content regardless of whether it actually fit.
function ntShowAllocationScreen(captainMode) {
  showScreen('screen-nt-allocation');
  ntRenderAllocationScreen(captainMode);
}

// Returns the ordered list of global player indices on myTeam.
function ntMyTeamMembers() {
  const myTeam = ntTeamIdx[mpMyPlayerIdx];
  return ntTeamIdx.reduce((acc, t, i) => { if (t === myTeam) acc.push(i); return acc; }, []);
}

// Surplus still in hand. DERIVED from ntAllocations against base inventory rather than
// from ntAllocDeposits, so a non-captain (whose allocations arrive over the wire, with
// no local deposit stack) renders the same numbers the captain sees.
function ntAllocBank() {
  let depFW = 0, depHP = 0;
  ntAllocations.forEach(a => {
    depFW += Math.max(0, (a.firewall || 0) - ntInventory.firewall);
    depHP += Math.max(0, (a.honeypot || 0) - ntInventory.honeypot);
  });
  return {
    fw: Math.max(0, ntAllocationPool.firewall - depFW),
    hp: Math.max(0, ntAllocationPool.honeypot - depHP),
  };
}

// Refusal feedback for the allocation screen. ntSetRouting() targets the BUILD screen's
// #nt-routing-status and silently no-ops here, so refusals write this screen's own status
// line. No timer by design — the next successful deposit/undo/reset re-renders and
// restores the surplus readout, so there is no handle to leak (§ Timer Lifecycle).
function ntAllocRefuse(msg) {
  playBoing();
  const el = document.getElementById('nt-alloc-status');
  if (el) {
    el.textContent = '> ' + msg;
    el.className   = 'text-amber-400 font-mono text-[10px] text-center mb-2 truncate';
  }
}

// Allocation screen — a windowed view of the team's cluster bridge. One leg shown large
// (real resolution, no CSS downscale) with ‹ › to switch; a chip row under it keeps
// every leg's live totals readable at once and doubles as a second deposit surface, so
// the "see the whole team, choose between legs" property survives windowing to one leg.
// Side-by-side at small cell (the previous shape) was legible at 2 legs and an
// unreadable smudge at 3-4 — see deferred-work.md + owner feedback, 16 Aug 2026.
// The captain arms a resource (brush) and taps a leg (maze or chip) to DEPOSIT one unit
// of it — a tap means one thing only, there is no select-then-adjust mode.
function ntRenderAllocationScreen(captainMode) {
  const body    = document.getElementById('nt-alloc-body');
  const warning = document.getElementById('nt-alloc-warning');
  const status  = document.getElementById('nt-alloc-status');
  const lockBtn = document.getElementById('btn-nt-alloc-lock');
  if (!body) return;

  const isCap    = captainMode === true;
  const editable = isCap && ntHuddlePhase !== 'locked';
  const members  = ntMyTeamMembers(); // global player indices, in leg order
  const bank     = ntAllocBank();

  // Clamp against the live team — never trust a stale index across a huddle boundary
  // (team size can differ cycle to cycle if a player dropped).
  if (ntAllocViewLeg >= members.length || ntAllocViewLeg < 0) ntAllocViewLeg = 0;
  const multi = members.length > 1;
  const navBtn = 'min-h-11 min-w-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-emerald-300 text-lg font-bold active:scale-95 transition-all duration-150 disabled:opacity-30';

  // Console directive, in the same terminal-window chrome as the Gate's boot log
  // (border-emerald-700/40, bg-slate-900, font-mono text-emerald-400) for a consistent
  // NT terminal voice — printed straight, no typewriter reveal (that's the Gate's own
  // thing; this line changes with huddle state and shouldn't re-animate on every render).
  body.innerHTML = `<div class="w-full rounded-xl border border-emerald-700/40 bg-slate-900 px-4 py-3 text-left font-mono text-[11px] text-emerald-400 leading-snug shrink-0 mb-2">&gt; ALERT: CLUSTER SURPLUS UNASSIGNED.<br>${
    editable ? 'ARM A RESOURCE, TAP A LEG TO DEPLOY IT.' : (isCap ? 'ALLOCATION COMMITTED.' : 'CAPTAIN IS DEPLOYING THE SURPLUS.')
  }</div>
  <div class="flex items-center justify-center gap-2 mb-1 shrink-0">
    <button id="btn-nt-alloc-prev" class="${navBtn}" ${multi ? '' : 'disabled'}>‹</button>
    <p id="nt-alloc-viewer-label" class="text-[11px] font-mono text-stone-500 w-20 text-center"></p>
    <button id="btn-nt-alloc-next" class="${navBtn}" ${multi ? '' : 'disabled'}>›</button>
  </div>
  <div id="nt-alloc-viewport" class="w-full overflow-hidden shrink-0">
    <div id="nt-alloc-bridge"></div>
  </div>
  <div id="nt-alloc-chips" class="flex flex-wrap gap-1.5 justify-center mt-2 shrink-0"></div>`;

  // Real resolution, no clamp-to-fit against the TEAM — legibility is the whole point of
  // windowing to one leg. ntBuildBridgeInto still renders the WHOLE strip (deliberately
  // one builder, see its own header comment) so wallLeft/wallRight joins stay intact; the
  // viewport just clips to one leg and neighbours peek at the edges.
  // Cell IS still capped against the GRID SIZE setting, though — 18px/tile assumes an
  // 18×18 node (324px, fits the ~336px viewport with room to peek). At the "large map"
  // setting (n=20) that's 360px, wider than the viewport itself, so even the ACTIVE leg
  // would render partially clipped with no way to ever see its far edge. Scale down only
  // when the grid is bigger than 18 would fit; smaller grids (n=16) keep the full 18px
  // for consistency rather than growing to fill the space.
  const previewN = (ntTeamNodes[members[ntAllocViewLeg]] && ntTeamNodes[members[ntAllocViewLeg]].n) || NT_GRID_DEFAULT;
  const viewportW = document.getElementById('nt-alloc-viewport').clientWidth || 336;
  const cell = Math.min(18, Math.floor(viewportW / previewN));

  ntBuildBridgeInto(document.getElementById('nt-alloc-bridge'), members, cell, {
    footer: (legIdx, pIdx) => {
      const s = ntAllocLegDisplay(legIdx, pIdx);
      return `<p class="font-mono text-[9px] text-center leading-tight whitespace-nowrap">
        <span class="text-emerald-300">${s.fw}</span>
        <span class="text-stone-600"> · </span>
        <span class="text-emerald-300">${s.hp}</span>
      </p>
      <p class="font-mono text-[9px] text-center leading-tight whitespace-nowrap text-orange-400">
        ${s.surplusFw}<span class="text-stone-600"> · </span>${s.surplusHp}
      </p>`;
    },
    onTap:  editable ? ntDepositAlloc  : null,
    onHold: editable ? ntWithdrawAlloc : null,
  });

  ntCenterAllocViewport();

  // "LEG N/M" — the leg's own name already renders correctly (light text on the dark
  // canvas strip, via ntBuildBridgeInto's own label). Repeating it here on the page's
  // WHITE background would need its own contrast treatment and would just duplicate
  // what the strip already says; nav position is the one thing this row adds.
  const viewerLabel = document.getElementById('nt-alloc-viewer-label');
  if (viewerLabel) viewerLabel.textContent = multi ? `LEG ${ntAllocViewLeg + 1}/${members.length}` : '';

  if (multi) {
    document.getElementById('btn-nt-alloc-prev').addEventListener('click', () => {
      ntAllocViewLeg = (ntAllocViewLeg - 1 + members.length) % members.length;
      playPillClick();
      ntRenderAllocationScreen(captainMode);
    });
    document.getElementById('btn-nt-alloc-next').addEventListener('click', () => {
      ntAllocViewLeg = (ntAllocViewLeg + 1) % members.length;
      playPillClick();
      ntRenderAllocationScreen(captainMode);
    });
  }

  ntRenderAllocChips(members, editable);

  // Live surplus readout. Overwritten in place by ntAllocRefuse() on a refused tap and
  // restored here by the next successful action — one element, one owner per repaint.
  const hasSurplus = bank.fw > 0 || bank.hp > 0;
  if (status) {
    status.textContent = hasSurplus
      ? `> SURPLUS IN HAND: ${bank.fw} FW · ${bank.hp} HP`
      : '> SURPLUS FULLY DEPLOYED';
    status.className = (hasSurplus ? 'text-emerald-400' : 'text-stone-500') +
                       ' font-mono text-[10px] text-center truncate';
  }

  // A text-and-colour SWAP, not show/hide — reserving the space always means this line
  // (and the buttons below it) never jump vertically as the state changes. Reflects the
  // team's shared bank, same as the status line above it, not gated to the captain —
  // a teammate should be able to see whether the captain is finished without asking.
  if (warning) {
    warning.textContent = hasSurplus ? 'UNALLOCATED SURPLUS' : 'SURPLUS ALLOCATED';
    warning.className   = 'text-xs font-semibold text-center mb-2 ' +
                          (hasSurplus ? 'text-amber-500' : 'text-emerald-500');
  }

  ntRenderAllocBrushBar(editable, bank);

  if (lockBtn) {
    lockBtn.style.display = isCap ? 'block' : 'none';
    lockBtn.textContent   = ntHuddlePhase === 'locked' ? 'Locked' : 'Lock Allocations';
    lockBtn.disabled      = ntHuddlePhase === 'locked';
  }

  // Whole-screen layout mode: prefer THE STACK (header + stage + footer as one centred
  // block — ui-style.md's suite-wide default) whenever everything actually fits; fall
  // back to the legacy sticky-footer split (header/footer pinned, stage scrolls) only
  // when it doesn't — the documented reason this screen is on that whitelist at all.
  // Centring only the stage (the previous fix) left the header pinned to the top edge
  // with the centred content floating below it, which read as "the header isn't part of
  // the stack" — correct per D30/D33, but not what was actually wanted once the whole
  // screen is short enough to just BE the Stack.
  // Reset to the sticky-footer baseline before measuring, so a stale Stack-mode class
  // doesn't feed back into its own measurement (removing stage's flex-1 makes stage
  // content-sized, which would hide real overflow from the "does it fit" check).
  const section = document.getElementById('screen-nt-allocation');
  const stage   = body.parentElement;
  const header  = section && section.firstElementChild;
  const footer  = stage && stage.nextElementSibling;
  if (section && stage && header && footer) {
    section.classList.remove('justify-center');
    stage.classList.add('flex-1');
    const fits = (header.scrollHeight + body.scrollHeight + footer.scrollHeight) <= section.clientHeight;
    section.classList.toggle('justify-center', fits);
    stage.classList.toggle('flex-1', !fits);
  }
  // Within the stage's own box — its full flex-1 height in sticky-footer mode, or its
  // now content-sized box in Stack mode — centre body's own content when IT fits. Same
  // D30 guard as before: never centre content taller than its box (the sticky-footer
  // fallback, e.g. captain view at 4 legs, is exactly the case this still protects).
  if (stage) body.classList.toggle('justify-center', body.scrollHeight <= stage.clientHeight);
}

// Shared FW/HP display strings for a leg — the BUDGET (ntInventory: what a player can
// place during Build, identical for every leg since it's the same for all players this
// cycle) on its own line, and separately how much of the TEAM's SURPLUS pool was
// deposited to THIS leg (D33 follow-up, 16 Aug 2026: showing the budget+deposited TOTAL
// here read as "wrong" — a captain expects to see what's fixed vs what they chose, not
// a merged number they have to do the subtraction on themselves).
// Do NOT call this line "native" in comments/docs — Budget has nothing to do with
// nativeHoneypots (the map's own pre-placed terrain hazard, generated, never player-
// controlled). Two different tiers share the word "Honeypot": the terrain hazard and
// the buildable component are unrelated things that happen to have the same name — see
// D35 / `nt-implementation-notes.md` for the full Generated / Budget / Surplus glossary.
// No "/cap" fraction on HP any more — D29 removed the per-leg honeypot ceiling, same
// reasoning as firewall never having had one.
// Derived from ntAllocations vs ntInventory/ntAllocationPool (the same arithmetic
// ntAllocBank sums across all legs), never from ntAllocDeposits — that stack is
// captain-local and never synced, so a read-only teammate has no other way to see it.
function ntAllocLegDisplay(legIdx, pIdx) {
  const a     = ntAllocations[legIdx] || { firewall: 0, honeypot: 0 };
  const depFW = Math.max(0, (a.firewall || 0) - ntInventory.firewall);
  const depHP = Math.max(0, (a.honeypot || 0) - ntInventory.honeypot);
  return {
    fw: `FW ${ntInventory.firewall || 0}`,
    hp: `HP ${ntInventory.honeypot || 0}`,
    surplusFw: `FW ${depFW}/${ntAllocationPool.firewall}`,
    surplusHp: `HP ${depHP}/${ntAllocationPool.honeypot}`,
  };
}

// Slides the bridge strip so ntAllocViewLeg's column is centred in the viewport, with
// neighbouring legs peeking at the edges (clamped so we never scroll past the first/last
// leg into blank space). Real DOM measurement, not n×cell arithmetic — a leg's rendered
// column width depends on its label text too.
// ntBuildBridgeInto owns #nt-alloc-bridge's contents and appends its own unnamed `row`
// div as the single child holding the per-leg columns — that inner row is what gets
// measured and transformed, not the container itself.
//
// getBoundingClientRect, NOT offsetLeft/offsetWidth. offsetLeft resolves against
// whichever ancestor is the nearest POSITIONED one — nothing in this chain (row, bridge,
// viewport) sets `position`, so it can walk straight past all of them to some unrelated
// ancestor further up the page, silently mixing page-relative and viewport-relative
// coordinates. That produced a real, confirmed misalignment for any leg past the first
// (correct for leg 0, ~24px off-centre for a middle leg) — caught from a live screenshot,
// 16 Aug 2026. getBoundingClientRect is always viewport-relative regardless of ancestor
// positioning, so both sides of the subtraction below are guaranteed to share a frame.
function ntCenterAllocViewport() {
  const viewport = document.getElementById('nt-alloc-viewport');
  const bridge   = document.getElementById('nt-alloc-bridge');
  const row      = bridge && bridge.firstElementChild;
  if (!viewport || !row || !row.children.length) return;
  const col = row.children[ntAllocViewLeg];
  if (!col) return;
  const vpRect    = viewport.getBoundingClientRect();
  const colRect   = col.getBoundingClientRect();
  const colCenter = colRect.left + colRect.width / 2;
  const vwCenter  = vpRect.left + vpRect.width / 2;
  const rowWidth  = row.scrollWidth;
  const minOffset = Math.min(0, vpRect.width - rowWidth);
  const offset    = Math.max(minOffset, Math.min(0, vwCenter - colCenter));
  row.style.transform = `translateX(${offset}px)`;
}

// Chip row — every leg's live totals, always visible regardless of which leg the maze
// viewer is showing (restores the "whole team readable at once" property the windowed
// view would otherwise lose). Tap deposits the armed brush to that leg directly, without
// switching the viewer; hold withdraws. Same verbs as the maze itself — a chip is a
// second surface for the same action, not a different one.
function ntRenderAllocChips(members, editable) {
  const wrap = document.getElementById('nt-alloc-chips');
  if (!wrap) return;
  // w-28, fixed — NOT auto-width. The chip previously grew/shrank with its own text
  // (the old inline "(+N)" qualifier), which visibly popped the pill's size on every
  // deposit and reflowed the whole wrapped row. A fixed width means the box never
  // changes size regardless of digit count; only the text inside it updates.
  wrap.innerHTML = members.map((pIdx, legIdx) => {
    const s      = ntAllocLegDisplay(legIdx, pIdx);
    const isMe   = pIdx === mpMyPlayerIdx;
    const active = legIdx === ntAllocViewLeg;
    const name   = (ntPlayerNames[pIdx] || ('ADMIN-' + (pIdx + 1))) + (isMe ? ' (you)' : '');
    return `<button data-leg="${legIdx}" class="nt-alloc-chip min-h-11 w-28 shrink-0 rounded-lg border px-2 py-1 font-mono text-[9px] leading-tight text-center transition-all duration-150 ${
      active ? 'border-emerald-400 bg-slate-800' : 'border-slate-700 bg-slate-900'
    } ${editable ? 'active:scale-95' : ''}">
      <span class="block truncate ${isMe ? 'text-emerald-400' : 'text-stone-300'}">${name}</span>
      <span class="block whitespace-nowrap"><span class="text-emerald-300">${s.fw}</span> <span class="text-emerald-300">${s.hp}</span></span>
      <span class="block whitespace-nowrap text-orange-400">${s.surplusFw} ${s.surplusHp}</span>
    </button>`;
  }).join('');

  if (!editable) return;
  wrap.querySelectorAll('.nt-alloc-chip').forEach(btn => {
    const legIdx = Number(btn.dataset.leg);
    btn.addEventListener('click', () => ntDepositAlloc(legIdx));
    if (typeof bindCardHold === 'function') bindCardHold(btn, () => ntWithdrawAlloc(legIdx));
  });
}

// The brush bar — which resource a leg-tap deposits, plus Undo / Reset All.
// Hidden for non-captains and once the allocation is locked.
function ntRenderAllocBrushBar(editable, bank) {
  const hub = document.getElementById('nt-alloc-controlhub');
  if (!hub) return;
  if (!editable) { hub.innerHTML = ''; hub.style.display = 'none'; return; }
  hub.style.display = 'block';

  // .pill stays on every pill always — only pill-active-emerald is added/removed.
  // min-h-11 is added deliberately: .pill's own padding lands at 39px, under the 44px
  // touch minimum (§ Thumb-Friendly UI). A settings pill is tapped once; this one is a
  // mid-huddle tool the captain hits repeatedly against a running clock.
  const brushPill = (type, label, left) =>
    `<button data-brush="${type}" class="nt-alloc-brush pill min-h-11 ${ntAllocBrush === type ? 'pill-active-emerald' : ''}">${label} ${left}</button>`;
  const util = 'min-h-11 flex-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold active:scale-95 transition-all duration-150 disabled:opacity-30';

  hub.innerHTML = `<div class="flex flex-col gap-2">
    <div class="flex gap-2">${brushPill('firewall', 'Firewall', bank.fw)}${brushPill('honeypot', 'Honeypot', bank.hp)}</div>
    <div class="flex gap-2">
      <button id="btn-nt-alloc-undo"  class="${util}" ${ntAllocDeposits.length ? '' : 'disabled'}>Undo</button>
      <button id="btn-nt-alloc-reset" class="${util}" ${ntAllocDeposits.length ? '' : 'disabled'}>Reset All</button>
    </div>
  </div>`;

  hub.querySelectorAll('.nt-alloc-brush').forEach(btn => {
    btn.addEventListener('click', () => {
      if (ntAllocBrush === btn.dataset.brush) return;
      ntAllocBrush = btn.dataset.brush;
      playPillClick();
      ntRenderAllocationScreen(true);
    });
  });
  const undo  = document.getElementById('btn-nt-alloc-undo');
  const reset = document.getElementById('btn-nt-alloc-reset');
  if (undo)  undo.addEventListener('click', ntUndoDeposit);
  if (reset) reset.addEventListener('click', ntResetDeposits);
}

// Captain taps a leg — deposit one unit of the armed resource onto it.
function ntDepositAlloc(legIdx) {
  if (ntHuddlePhase === 'locked') return;
  const members = ntMyTeamMembers();
  const pIdx    = members[legIdx];
  if (pIdx === undefined) return;
  const alloc = ntAllocations[legIdx] || { firewall: 0, honeypot: 0 };
  const bank  = ntAllocBank();
  const type  = ntAllocBrush;

  if (type === 'firewall' && bank.fw <= 0) return ntAllocRefuse('FIREWALL SURPLUS EXHAUSTED');
  // No per-leg honeypot ceiling — same reasoning as firewall (D27/D29): concentrating
  // surplus on one leg is a captain judgement call (inefficiency, or a deliberate bet),
  // never a broken state. Bank exhaustion is the only refusal condition either resource
  // has now.
  if (type === 'honeypot' && bank.hp <= 0) return ntAllocRefuse('HONEYPOT SURPLUS EXHAUSTED');

  ntAllocations[legIdx] = { ...alloc, [type]: (alloc[type] || 0) + 1 };
  ntAllocDeposits.push({ leg: legIdx, type });
  playPillClick();
  ntPushAllocationChange();
}

// Long-press a leg — pull one unit of the armed resource back off it. A bonus
// affordance; Undo is the discoverable path. Never goes below the untouchable base.
function ntWithdrawAlloc(legIdx) {
  if (ntHuddlePhase === 'locked') return;
  const type  = ntAllocBrush;
  const alloc = ntAllocations[legIdx] || { firewall: 0, honeypot: 0 };
  const base  = type === 'firewall' ? ntInventory.firewall : ntInventory.honeypot;
  if ((alloc[type] || 0) <= base) return ntAllocRefuse('LEG AT BASE — NOTHING TO RECALL');

  ntAllocations[legIdx] = { ...alloc, [type]: (alloc[type] || 0) - 1 };
  // Drop the most recent matching entry so the Undo stack stays consistent with reality.
  for (let i = ntAllocDeposits.length - 1; i >= 0; i--) {
    if (ntAllocDeposits[i].leg === legIdx && ntAllocDeposits[i].type === type) {
      ntAllocDeposits.splice(i, 1);
      break;
    }
  }
  playPillClick();
  ntPushAllocationChange();
}

// Pop the last deposit, wherever it landed.
function ntUndoDeposit() {
  if (ntHuddlePhase === 'locked') return;
  const last = ntAllocDeposits.pop();
  if (!last) return ntAllocRefuse('NOTHING TO UNDO');
  const alloc = ntAllocations[last.leg] || { firewall: 0, honeypot: 0 };
  ntAllocations[last.leg] = { ...alloc, [last.type]: Math.max(0, (alloc[last.type] || 0) - 1) };
  playPillClick();
  ntPushAllocationChange();
}

// Back to every leg at base inventory, whole surplus in hand.
function ntResetDeposits() {
  if (ntHuddlePhase === 'locked') return;
  if (!ntAllocDeposits.length) return ntAllocRefuse('NOTHING TO RESET');
  ntAllocations   = ntAllocations.map(() => ({ firewall: ntInventory.firewall, honeypot: ntInventory.honeypot }));
  ntAllocDeposits = [];
  playPillClick();
  ntPushAllocationChange();
}

// Repaint + propagate. The ONE place an allocation edit leaves this device, so any
// future edit affordance inherits the host/client split for free.
function ntPushAllocationChange() {
  ntRenderAllocationScreen(true);

  if (window.syllyMultiplayerMode === 'host') {
    // Host updates its own team's working state directly — self-sent ACTIONs are dropped by dedup guard
    const myTeam = ntTeamIdx[mpMyPlayerIdx];
    ntTeamWorkingAllocs[myTeam] = ntAllocations.map(a => ({ ...a }));
    ntBroadcastAllocationSync();
  } else if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({
      type: 'ACTION',
      payload: { action: 'NT_ALLOCATION_UPDATE', allocations: ntAllocations.map(a => ({ ...a })) },
    });
  }
}

// Start the huddle countdown. On expiry, auto-lock the captain's team.
function ntStartHuddleTimer(durationSecs) {
  ntStopHuddleTimer();
  if (durationSecs === 0) {
    const eyebrow = document.getElementById('nt-alloc-header');
    if (eyebrow) eyebrow.textContent = 'SYS_PARTITION \\ HUB · ∞';
    return;
  }
  const label = document.getElementById('nt-alloc-warning');
  let secs = durationSecs;
  ntHuddleTimer = setInterval(() => {
    secs--;
    // Show remaining time in the terminal header banner on the allocation screen
    const eyebrow = document.getElementById('nt-alloc-header');
    if (eyebrow) {
      const m = String(Math.floor(Math.max(0, secs) / 60)).padStart(2, '0');
      const s = String(Math.max(0, secs) % 60).padStart(2, '0');
      eyebrow.textContent = `SYS_PARTITION // HUB · ${m}:${s}`;
    }
    if (secs <= 10 && secs > 0) playTick();
    if (secs <= 0) {
      ntStopHuddleTimer();
      playAlarm();
      // Auto-lock this device's team
      ntCommitAllocation();
    }
  }, 1000);
}
function ntStopHuddleTimer() {
  if (ntHuddleTimer) { clearInterval(ntHuddleTimer); ntHuddleTimer = null; }
}

// Captain (or timer) commits the allocation — sends NT_ALLOCATION_LOCK to host.
function ntCommitAllocation() {
  if (ntHuddlePhase === 'locked') return;
  ntHuddlePhase = 'locked';
  ntRenderAllocationScreen(true);
  if (window.syllyMultiplayerMode === 'host') {
    // Host marks own team directly
    const myTeam = ntTeamIdx[mpMyPlayerIdx];
    ntTeamAllocLocked[myTeam] = true;
    ntApplyAllocationLock(myTeam, ntAllocations.map(a => ({ ...a })));
    ntCheckBothTeamsLocked();
  } else {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_ALLOCATION_LOCK', allocations: ntAllocations.map(a => ({ ...a })) } });
  }
}

// Host: apply a team's locked allocations into ntAllPlayerAllocations + broadcast SYNC.
// HOST-ONLY authority check on a team's proposed allocations. Returns a sanitised copy,
// or null if the proposal is out of bounds. Both the live-update and the lock path go
// through this ONE function: validating only the update path would let a client skip
// straight to LOCK with anything it liked, which is what it used to do.
function ntValidateTeamAllocations(teamIdx, proposed) {
  const teamSizes = [0, 0]; ntTeamIdx.forEach(t => teamSizes[t]++);
  // A team's legal total = every leg's untouchable base PLUS the deposit surplus — the
  // same numbers the host hands out in NT_HUDDLE_START's allPools.
  const ceiling = {
    firewall: (ntInventory.firewall + NT_SURPLUS_FIREWALL) * teamSizes[teamIdx],
    honeypot: (ntInventory.honeypot + NT_SURPLUS_HONEYPOT) * teamSizes[teamIdx],
  };
  const allocs = (proposed || []).map(a => ({
    firewall: Math.max(0, (a && a.firewall) || 0),
    honeypot: Math.max(0, (a && a.honeypot) || 0),
  }));
  const usedFW = allocs.reduce((s, a) => s + a.firewall, 0);
  const usedHP = allocs.reduce((s, a) => s + a.honeypot, 0);
  if (usedFW > ceiling.firewall || usedHP > ceiling.honeypot) return null;
  // No per-leg honeypot ceiling (D29, 16 Aug 2026) — same as firewall, concentrating
  // surplus on one leg is a captain judgement call, not an out-of-bounds proposal. The
  // team-wide pool ceiling above is the only bound either resource has.
  return allocs;
}

function ntApplyAllocationLock(teamIdx, allocations) {
  // Fall back to the team's last VALID working state rather than committing a rejected
  // proposal — a locked-in illegal allocation would survive into the build phase.
  const allocs = ntValidateTeamAllocations(teamIdx, allocations)
              || (ntTeamWorkingAllocs[teamIdx] || []).map(a => ({ ...a }));
  ntTeamWorkingAllocs[teamIdx] = allocs.map(a => ({ ...a }));
  const members = ntTeamIdx.reduce((acc, t, i) => { if (t === teamIdx) acc.push(i); return acc; }, []);
  members.forEach((pIdx, legIdx) => {
    const a = allocs[legIdx] || { firewall: 0, honeypot: 0 };
    ntAllPlayerAllocations[pIdx] = { firewall: a.firewall, honeypot: a.honeypot };
  });
  ntBroadcastAllocationSync();
}

// Host: re-broadcast current working allocation state to all devices.
function ntBroadcastAllocationSync() {
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:   'NT_ALLOCATION_SYNC',
      teamData: [0, 1].map(team => ({
        locked:      ntTeamAllocLocked[team],
        allocations: (ntTeamWorkingAllocs[team] || []).map(a => ({ ...a })),
      })),
    },
  });
}

// Host: check if both captains have locked — if so, broadcast NT_BUILD_BEGIN.
function ntCheckBothTeamsLocked() {
  if (!ntTeamAllocLocked[0] || !ntTeamAllocLocked[1]) return;
  ntStopHuddleTimer();
  // Build assigned inventory array (per global player index)
  const assignedInventory = (ntAllPlayerAllocations || []).map(a => ({ ...a }));
  const endTimestamp = ntEffectiveHardeningWin() > 0 ? Date.now() + (ntEffectiveHardeningWin() * 1000) : null;
  mpSendEnvelope({
    type: 'SYNC',
    payload: { action: 'NT_BUILD_BEGIN', endTimestamp, cycle: ntCycle, assignedInventory },
  });
  // Host applies its own assigned inventory
  const myAlloc = (ntAllPlayerAllocations || [])[mpMyPlayerIdx] || ntInventory;
  ntInventory = { ...myAlloc };
  ntShowBuild(endTimestamp);
}

function ntShowMdlmGate() {
  const heading = document.getElementById('nt-gate-heading');
  const sub     = document.getElementById('nt-gate-sub');
  const btn     = document.getElementById('btn-nt-gate-ready');

  if (heading) heading.textContent = 'Cycle Initialisation Gate';
  const cycleTag = 'VS-' + String(ntCycle + 1).padStart(2, '0');
  const myName = ntPlayerNames[mpMyPlayerIdx] || ('ADMIN-' + (mpMyPlayerIdx + 1));

  if (window.syllyMultiplayerMode === 'client') {
    if (sub) sub.textContent = cycleTag + ' — waiting for all analysts to ready up…';
    if (btn) { btn.textContent = 'Ready ▶'; btn.classList.add('btn-mp-action'); btn.disabled = false; }
    ntGateCallback = () => {
      if (btn) { btn.textContent = 'Waiting…'; btn.disabled = true; }
      if (sub) sub.textContent = 'Waiting for host to begin…';
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_GATE_READY' } });
    };
  } else {
    // Host — marks own slot directly, enables Begin Hardening when all ready
    if (sub) sub.textContent = cycleTag + ' — waiting for all analysts to ready up…';
    if (btn) { btn.textContent = 'Begin Hardening ▶'; btn.classList.add('btn-mp-action'); btn.disabled = true; }
    ntGateReadyCheck[mpMyPlayerIdx] = true;
    ntGateCallback = () => {
      const endTimestamp = ntEffectiveHardeningWin() > 0 ? Date.now() + (ntEffectiveHardeningWin() * 1000) : null;
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'NT_BUILD_BEGIN', endTimestamp, cycle: ntCycle } });
      ntShowBuild(endTimestamp);
    };
    if (ntGateReadyCheck.every(Boolean) && btn) btn.disabled = false;
  }
  ntPlayGateBoot([ntSimTag(), 'LOGIN: ' + myName.toUpperCase()]);
}

function ntShowBuild(endTimestamp) {
  // Per-build-phase reset: re-enable the grid, clear the commit/resolve guards.
  ntCommitted     = false;
  ntCycleResolved = false;
  const grid0 = document.getElementById('nt-build-grid');
  if (grid0) grid0.style.pointerEvents = '';
  const commitBtn = document.getElementById('btn-nt-commit');
  if (commitBtn) { commitBtn.disabled = false; commitBtn.textContent = 'COMMIT RUNTIME ▶'; }
  // Two renderers now write this header, so BOTH elements are set on BOTH paths — leaving one
  // alone shows whatever the other last wrote (ui-style.md, the Stack's multi-renderer rule).
  const label   = document.getElementById('nt-build-title-label');
  const counter = document.getElementById('nt-build-counter');
  if (label)   label.textContent   = ntDebugMode ? 'STAGING — ATTEMPT' : 'VULNERABILITY SIMULATION';
  if (counter) counter.textContent = ntDebugMode ? String(ntDebugMyAttempt + 1)
                                                 : `${ntCycle + 1}/${ntIterations}`;
  const clearBtn = document.getElementById('btn-nt-build-clear');
  if (clearBtn) clearBtn.style.display = ntDebugMode ? '' : 'none';
  const name = document.getElementById('nt-node-name');
  const nodeTag = 'NT-NODE-' + String(ntCycle + 1).padStart(2, '0');
  if (name) name.innerHTML = 'SYS_INIT // <span class="text-emerald-400">' + nodeTag + '</span>';
  // Current builder, computer-prompt style — PTP: whoever's turn it is; MDLM: this device's
  // own seat; solo: the lone admin.
  const isSingle = window.syllyMultiplayerMode === 'single';
  const nameIdx  = (isSingle && ntPlayerCount > 1) ? ntPtpTurn : (isSingle ? 0 : mpMyPlayerIdx);
  const playerName = ntPlayerNames[nameIdx] || ('ADMIN-' + (nameIdx + 1));
  const playerEl = document.getElementById('nt-build-player');
  if (playerEl) playerEl.textContent = 'user:\\' + playerName.toLowerCase().replace(/\s+/g, '');
  showScreen('screen-nt-build');
  ntRenderBuildGrid();
  ntSetRouting('valid');
  ntStartBuildTimer(endTimestamp); // MDLM: wall-clock anchor; solo/PTP: undefined → local countdown
}

function ntShowPlayback() {
  // Reset the scrubber + live latency each cycle (else they carry over).
  const scrub = document.getElementById('nt-playback-scrubber');
  if (scrub) scrub.value = 0;
  const lat = document.getElementById('nt-playback-latency');
  if (lat) lat.textContent = '0 ms';
  const pbStatus = document.getElementById('nt-playback-status');
  const pillBase = 'px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap flex-shrink-0';
  if (pbStatus) { pbStatus.textContent = 'OPERATIONAL'; pbStatus.className = pillBase + ' bg-emerald-900/60 text-emerald-400'; }
  ntPlaybackPhase = 'tracing';

  // DNP → continuous team-bridge journey (default = own team); else single-node playback.
  if (ntIsDNP()) {
    ntPbTeam = ntTeamIdx[mpMyPlayerIdx];
    ntShowJourneyPlayback();
    return;
  }
  // Non-DNP: hide journey UI, show single-node trace.
  const tabs = document.getElementById('nt-journey-tabs');     if (tabs)   tabs.style.display = 'none';
  const segWrap = document.getElementById('nt-journey-segwrap'); if (segWrap) segWrap.style.display = 'none';
  const pbNodeName = document.getElementById('nt-playback-node-name');
  if (pbNodeName) pbNodeName.textContent = 'NT-NODE-' + String(ntCycle + 1).padStart(2, '0');
  showScreen('screen-nt-playback');
  ntStartPlayback();
}

function ntShowSummary(mode) {
  ntStopPlayback();
  ntSummaryMode = mode || 'cycle';
  const heading  = document.getElementById('nt-summary-heading');
  const nextBtn  = document.getElementById('btn-nt-summary-next');
  const rebootBtn = document.getElementById('btn-nt-reboot');
  const logsBtn  = document.getElementById('btn-nt-logs-open');
  const isFinalMatch = ntSummaryMode === 'match';

  // Debug is single-node and terminal: there is no next cycle, no rolling average and no
  // match-wide ranking. The host's onward action is a fresh sandbox instead.
  if (ntDebugMode) {
    if (heading)  heading.textContent = 'Diagnostic Summary // STAGING';
    if (logsBtn)  logsBtn.style.display = 'none';
    if (rebootBtn) rebootBtn.style.display = 'block';
    if (nextBtn) {
      const canAuthor = window.syllyMultiplayerMode !== 'client';
      nextBtn.style.display = canAuthor ? 'block' : 'none';
      nextBtn.textContent   = 'Author New Node';
      nextBtn.disabled      = false;
    }
    ntSummaryCallback = () => ntShowAuthoring();
    showScreen('screen-nt-summary');
    ntRenderSummary();
    return;
  }

  if (isFinalMatch) {
    if (heading) heading.textContent = 'Diagnostic Summary // FINAL';
    if (nextBtn) nextBtn.style.display = 'none';
    if (rebootBtn) rebootBtn.style.display = 'block';
  } else {
    if (heading) heading.textContent = 'Diagnostic Summary';
    if (nextBtn) nextBtn.style.display = 'block';
    if (rebootBtn) rebootBtn.style.display = 'none';
  }
  // Show System Logs button whenever there is at least one logged cycle — solo/PTP populate
  // ntAllCycleNodes via ntResolveCyclePtp, MDLM host+client both populate it via
  // ntResolveCycleMdlm/the NT_PLAYBACK applier, so this is genuinely device-agnostic.
  if (logsBtn) logsBtn.style.display = ntAllCycleNodes.length > 0 ? 'block' : 'none';

  // MDLM per-cycle summary — readyCheck gate before advancing, same pattern as the Cycle
  // Initialisation Gate: the host waits for every device to confirm before starting the
  // next cycle, instead of unilaterally advancing everyone (nextBtn is hidden for the final
  // match summary above, so this only ever applies to the mid-match case).
  if (!isFinalMatch && window.syllyMultiplayerMode === 'client') {
    if (nextBtn) { nextBtn.textContent = 'Ready ▶'; nextBtn.disabled = false; nextBtn.classList.add('btn-mp-action'); }
    ntSummaryCallback = () => {
      if (nextBtn) { nextBtn.textContent = 'Waiting for host…'; nextBtn.disabled = true; }
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_SUMMARY_READY' } });
    };
  } else if (!isFinalMatch && window.syllyMultiplayerMode === 'host') {
    if (nextBtn) { nextBtn.textContent = 'Next Cycle ▶'; nextBtn.disabled = true; nextBtn.classList.add('btn-mp-action'); }
    ntSummaryReadyCheck[mpMyPlayerIdx] = true;
    ntSummaryCallback = () => {
      ntCycle++;
      ntStartMatch();
    };
    if (ntSummaryReadyCheck.every(Boolean) && nextBtn) nextBtn.disabled = false;
  } else {
    // Solo/PTP, or the final match summary (nextBtn hidden — Reboot is the only action there).
    ntSummaryCallback = () => {
      ntCycle++;
      ntBeginCycle();
    };
  }

  showScreen('screen-nt-summary');
  ntRenderSummary();
}

// Two things now live on this screen, so EVERY path sets BOTH — a caller that "leaves the
// roster alone" is really showing whatever the previous caller last wrote (ui-style.md, the
// Stack's multi-renderer rule). Existing single-argument callers pass roster === undefined,
// which explicitly blanks it; no call site needs editing.
function ntShowStandby(msg, roster) {
  const el = document.getElementById('nt-standby-msg');
  if (el && msg) el.textContent = msg;
  ntRenderDebugRoster(roster || null);
  showScreen('screen-nt-standby');
}

function ntRenderDebugRoster(rows) {
  const box = document.getElementById('nt-standby-roster');
  if (!box) return;
  if (!rows || !rows.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = 'flex';
  box.innerHTML = rows.map(r =>
    `<div class="flex items-center justify-between bg-white rounded-xl px-4 py-2 text-sm">
       <span class="text-stone-500 font-mono">${r.done ? '✓' : '⋯'} ${r.name}</span>
       <span class="text-stone-400 font-mono text-xs">${r.done ? 'finished' : 'testing'} (${r.attempts} ${r.attempts === 1 ? 'attempt' : 'attempts'})</span>
     </div>`).join('');
}

// Open the how-to overlay (shared by menu + in-game [?] buttons).
function ntOpenHowTo() {
  playDone();
  const overlay = document.getElementById('nt-how-to-overlay');
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  overlay.style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════════════
// GRID HELPERS  (single N×N tile grid + ¼-tile config-space lattice)
// ═══════════════════════════════════════════════════════════════════════════

function ntRandInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function ntKey(x, y) { return x + ',' + y; }

// The 4 tiles a 2×2 block anchored at (ax,ay) occupies (ax,ay = top-left tile).
function ntBlockTiles(ax, ay) { return [[ax, ay], [ax + 1, ay], [ax, ay + 1], [ax + 1, ay + 1]]; }

// Does block anchored at (ax,ay) cover tile (tx,ty)?
function ntCovers(ax, ay, tx, ty) { return tx >= ax && tx <= ax + 1 && ty >= ay && ty <= ay + 1; }

// Boolean [n][n] of solid tiles (bad sectors, native + allocated honeypots, firewalls).
function ntSolidGrid(node, placements) {
  const n = node.n, g = [];
  for (let y = 0; y < n; y++) g.push(new Array(n).fill(false));
  const mark = (ax, ay) => ntBlockTiles(ax, ay).forEach(([tx, ty]) => {
    if (tx >= 0 && tx < n && ty >= 0 && ty < n) g[ty][tx] = true;
  });
  (node.badSectors || []).forEach(c => mark(c.ax, c.ay));
  (node.nativeHoneypots || []).forEach(c => mark(c.ax, c.ay));
  (placements || []).forEach(p => mark(p.ax, p.ay));
  return g;
}

// Config-space lattice [n·k][n·k] of cells the runner CENTRE may not occupy.
// Every solid tile is inflated by the runner half-width (0.25 = exactly ONE sub-cell):
// a tile owning sub-cells [tx·k … tx·k+k-1] blocks [tx·k-1 … tx·k+k] → sharp +0.25 offset.
function ntConfigGrid(node, placements) {
  const n = node.n, k = NT_LATTICE_K, W = n * k, H = n * k;
  const solid = ntSolidGrid(node, placements);
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(false));
  for (let ty = 0; ty < n; ty++) for (let tx = 0; tx < n; tx++) {
    if (!solid[ty][tx]) continue;
    for (let sy = ty * k - 1; sy <= ty * k + k; sy++) {
      if (sy < 0 || sy >= H) continue;
      for (let sx = tx * k - 1; sx <= tx * k + k; sx++) {
        if (sx < 0 || sx >= W) continue;
        g[sy][sx] = true;
      }
    }
  }
  return g;
}

// 8-neighbour steps; diagonals carry their orthogonal pair for the no-corner-cut test.
const NT_STEPS = [
  { dx: 0, dy: -1, cost: 1 }, { dx: 1, dy: 0, cost: 1 }, { dx: 0, dy: 1, cost: 1 }, { dx: -1, dy: 0, cost: 1 },
  { dx: 1, dy: -1, cost: NT_DIAG * 1.05, ox: [[1, 0], [0, -1]] },
  { dx: 1, dy: 1, cost: NT_DIAG * 1.05, ox: [[1, 0], [0, 1]] },
  { dx: -1, dy: 1, cost: NT_DIAG * 1.05, ox: [[-1, 0], [0, 1]] },
  { dx: -1, dy: -1, cost: NT_DIAG * 1.05, ox: [[-1, 0], [0, -1]] },
];

function ntInBounds(g, x, y) { return y >= 0 && y < g.length && x >= 0 && x < g[0].length; }

// A step (cur → nx,ny) is legal if the target is open AND, for a diagonal, BOTH
// orthogonally-adjacent cells it clips are open (NO corner-cutting).
function ntStepLegal(g, cx, cy, step) {
  const nx = cx + step.dx, ny = cy + step.dy;
  if (!ntInBounds(g, nx, ny) || g[ny][nx]) return false;
  if (step.ox) for (const [ox, oy] of step.ox) { const x = cx + ox, y = cy + oy; if (!ntInBounds(g, x, y) || g[y][x]) return false; }
  return true;
}

// ── Perimeter ports — edge + tile index along it (rectangle straddling the border)
function ntPortMouth(port, n) {              // the tile just inside the border (must stay open)
  if (port.edge === 'top')    return [port.idx, 0];
  if (port.edge === 'bottom') return [port.idx, n - 1];
  if (port.edge === 'left')   return [0, port.idx];
  return [n - 1, port.idx];                  // right
}
function ntPortInterior(node, port) {        // tile-space centre of the mouth tile (path endpoint)
  const [tx, ty] = ntPortMouth(port, node.n);
  return { x: tx + 0.5, y: ty + 0.5 };
}
function ntPortBorder(port, n) {             // the point ON the border line
  if (port.edge === 'top')    return { x: port.idx + 0.5, y: 0 };
  if (port.edge === 'bottom') return { x: port.idx + 0.5, y: n };
  if (port.edge === 'left')   return { x: 0, y: port.idx + 0.5 };
  return { x: n, y: port.idx + 0.5 };        // right
}
function ntPortOutside(port, n) {            // a point just OFF the board (visual entry/exit stub)
  if (port.edge === 'top')    return { x: port.idx + 0.5, y: -0.6 };
  if (port.edge === 'bottom') return { x: port.idx + 0.5, y: n + 0.6 };
  if (port.edge === 'left')   return { x: -0.6, y: port.idx + 0.5 };
  return { x: n + 0.6, y: port.idx + 0.5 };  // right
}
function ntPortSub(node, port) {             // config-lattice sub-cell of the mouth interior
  const k = NT_LATTICE_K, p = ntPortInterior(node, port), m = node.n * k - 1;
  return { sx: Math.max(0, Math.min(m, Math.floor(p.x * k))), sy: Math.max(0, Math.min(m, Math.floor(p.y * k))) };
}
function ntIsMouthTile(tx, ty) {
  const n = ntNode.n, [ix, iy] = ntPortMouth(ntNode.ingress, n), [ex, ey] = ntPortMouth(ntNode.egress, n);
  return (tx === ix && ty === iy) || (tx === ex && ty === ey);
}

// ═══════════════════════════════════════════════════════════════════════════
// PATHFINDING  (¼-tile config lattice, 8-dir, no corner-cut — §7)
// ═══════════════════════════════════════════════════════════════════════════

// Build-time reachability: BFS on the config lattice (port mouth → port mouth).
function ntPathExists(node, placements) {
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements), W = node.n * k, H = node.n * k;
  const s = ntPortSub(node, node.ingress), t = ntPortSub(node, node.egress);
  if (g[s.sy][s.sx] || g[t.sy][t.sx]) return false;
  const seen = new Uint8Array(W * H), goal = t.sy * W + t.sx;
  let head = 0; const q = [s.sy * W + s.sx]; seen[q[0]] = 1;
  while (head < q.length) {
    const u = q[head++];
    if (u === goal) return true;
    const ux = u % W, uy = (u - ux) / W;
    for (const st of NT_STEPS) {
      if (!ntStepLegal(g, ux, uy, st)) continue;
      const v = (uy + st.dy) * W + (ux + st.dx);
      if (seen[v]) continue;
      seen[v] = 1; q.push(v);
    }
  }
  return false;
}

// Weighted shortest path (Dijkstra; ortho 1 / diagonal √2) on the config lattice.
// Returns sub-cells [{x,y}, …] inclusive, or null. Deterministic (NT_STEPS order).
function ntDijkstraSub(node, placements) {
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements), W = node.n * k, H = node.n * k;
  const s = ntPortSub(node, node.ingress), t = ntPortSub(node, node.egress);
  if (g[s.sy][s.sx] || g[t.sy][t.sx]) return null;
  const dist = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  const done = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const start = idx(s.sx, s.sy), goal = idx(t.sx, t.sy);
  dist[start] = 0;
  while (true) {
    let u = -1, best = Infinity;
    for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u === -1 || u === goal) break;
    done[u] = 1;
    const ux = u % W, uy = (u - ux) / W;
    for (const st of NT_STEPS) {
      if (!ntStepLegal(g, ux, uy, st)) continue;
      const v = idx(ux + st.dx, uy + st.dy);
      if (done[v]) continue;
      const nd = dist[u] + st.cost;
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
    }
  }
  if (!isFinite(dist[goal])) return null;
  const path = [];
  for (let v = goal; v !== -1; v = prev[v]) path.push({ x: v % W, y: (v - (v % W)) / W });
  return path.reverse();
}

// ── String-pull (funnel) — taut the sub-cell path against the (inflated) corners.
// LOS in sub-cell space on the config grid: clearance is already baked in, so the
// pulled polyline keeps the runner's 0.25 buffer and bends sharply round offset corners.
function ntLineOfSight(g, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
  let pcx = -1, pcy = -1;
  for (let i = 0; i <= steps; i++) {
    const x = ax + (dx * i) / steps, y = ay + (dy * i) / steps;
    const cx = Math.round(x), cy = Math.round(y);
    if (!ntInBounds(g, cx, cy) || g[cy][cx]) return false;
    if (pcx !== -1 && cx !== pcx && cy !== pcy) {
      if ((ntInBounds(g, pcx, cy) && g[cy][pcx]) || (ntInBounds(g, cx, pcy) && g[pcy][cx])) return false;
    }
    pcx = cx; pcy = cy;
  }
  return true;
}

function ntStringPull(subPath, g) {
  if (!subPath || subPath.length <= 2) return (subPath || []).map(p => ({ x: p.x, y: p.y }));
  const out = [subPath[0]];
  let anchor = 0;
  for (let i = 1; i < subPath.length - 1; i++) {
    // i is a necessary corner if the anchor can no longer see the NEXT vertex.
    if (!ntLineOfSight(g, subPath[anchor].x, subPath[anchor].y, subPath[i + 1].x, subPath[i + 1].y)) {
      out.push(subPath[i]); anchor = i;
    }
  }
  out.push(subPath[subPath.length - 1]);
  return out.map(p => ({ x: p.x, y: p.y }));
}

// Full route → taut TILE-space polyline, with the off-board entry/exit stubs.
// Returns [outside, border, interior, …taut…, interior, border, outside] or null.
function ntShortestPath(node, placements) {
  const sub = ntDijkstraSub(node, placements);
  if (!sub) return null;
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements);
  const pulled = ntStringPull(sub, g);
  const poly = pulled.map(p => ({ x: (p.x + 0.5) / k, y: (p.y + 0.5) / k }));
  // Snap the two ends to the exact mouth centres, then add the border + off-board points.
  poly[0] = ntPortInterior(node, node.ingress);
  poly[poly.length - 1] = ntPortInterior(node, node.egress);
  poly.unshift(ntPortBorder(node.ingress, node.n));
  poly.unshift(ntPortOutside(node.ingress, node.n));
  poly.push(ntPortBorder(node.egress, node.n));
  poly.push(ntPortOutside(node.egress, node.n));
  return poly;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP GENERATION  (host-side, §10 — single-grid gen, config-lattice validity, border ports)
// ═══════════════════════════════════════════════════════════════════════════

function ntRandomEdgePort(n) { return { edge: ['top', 'right', 'bottom', 'left'][ntRandInt(0, 3)], idx: ntRandInt(0, n - 1) }; }

// §10 pipeline → sets ntNode + ntInventory. Re-rolls until Ingress→Egress is valid
// on the config lattice. Ports never share an edge (DNP pins left→right).
// Budgets scale to "block slots" ≈ (N/2)² so they read like the old coarse counts.
// keepInventory = true: only regenerate node geometry; leave ntInventory unchanged.
// Used in DNP to generate one node per player while sharing the same cycle inventory.
// forcedIngressIdx (DNP only): pin this leg's left-edge ingress to a specific row so
// it lines up with the previous leg's egress — chains the cluster bridge edge-to-edge.
function ntGenerateNode(keepInventory = false, forcedIngressIdx = null) {
  const n = ntMatrixScale;
  const slots = Math.pow(Math.floor(n / NT_BLOCK), 2);
  const floor = Math.max(Math.ceil(NT_BADSECTOR_MIN_PCT * slots), ntNativeHoneypots + 2);
  const ceil  = Math.round(NT_BADSECTOR_MAX_PCT * slots);

  let node = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    let ingress, egress;
    if (ntIsDNP()) {
      ingress = { edge: 'left',  idx: (forcedIngressIdx != null ? forcedIngressIdx : ntRandInt(0, n - 1)) };
      egress  = { edge: 'right', idx: ntRandInt(0, n - 1) };
    } else {
      ingress = ntRandomEdgePort(n);
      do { egress = ntRandomEdgePort(n); } while (egress.edge === ingress.edge);
    }
    const [imx, imy] = ntPortMouth(ingress, n), [emx, emy] = ntPortMouth(egress, n);
    if (Math.abs(imx - emx) + Math.abs(imy - emy) < 8) continue; // corner-proximity guard — re-roll if ports too close
    const isMouth = (tx, ty) => (tx === imx && ty === imy) || (tx === emx && ty === emy);
    // Place disjoint 2×2 bad-sector blocks (zero-overlap; never on a port mouth tile).
    const occupied = []; for (let y = 0; y < n; y++) occupied.push(new Array(n).fill(false));
    const tryMark = (ax, ay) => {
      const tiles = ntBlockTiles(ax, ay);
      for (const [tx, ty] of tiles) { if (tx >= n || ty >= n || occupied[ty][tx] || isMouth(tx, ty)) return false; }
      for (const [tx, ty] of tiles) occupied[ty][tx] = true;
      return true;
    };
    const badCount = ntRandInt(floor, Math.max(floor, ceil));
    const badSectors = [];
    let guard = 0;
    while (badSectors.length < badCount && guard++ < slots * 8) {
      const ax = ntRandInt(0, n - 2), ay = ntRandInt(0, n - 2);
      if (occupied[ay][ax]) continue;
      if (tryMark(ax, ay)) badSectors.push({ ax, ay });
    }
    const candidate = { n, ingress, egress, badSectors, nativeHoneypots: [] };
    if (!ntPathExists(candidate, [])) continue;  // config-lattice validity gate
    // Native Honeypot conversion (still solid; cannot break validity).
    const convertN = ntRandInt(0, Math.min(ntNativeHoneypots, badSectors.length));
    const shuffled = shuffle(badSectors.slice());
    candidate.nativeHoneypots = shuffled.slice(0, convertN);
    candidate.badSectors      = shuffled.slice(convertN);
    node = candidate;
    break;
  }
  if (!node) { // pathological fallback — empty board, opposite-edge ports
    node = { n, ingress: { edge: 'left', idx: (forcedIngressIdx != null ? forcedIngressIdx : (n >> 1)) }, egress: { edge: 'right', idx: (n >> 1) }, badSectors: [], nativeHoneypots: [] };
  }

  ntNode = node;
  if (!keepInventory) {
    // Inventory — block budget, randomised per cycle, identical for all players.
    const firewall = ntRandInt(Math.round(NT_FIREWALL_MIN_PCT * slots), Math.round(NT_FIREWALL_MAX_PCT * slots));
    const honeypot = ntRandInt(0, Math.min(NT_ALLOC_HONEYPOT_CAP, NT_HONEYPOT_CAP - node.nativeHoneypots.length));
    ntInventory = { firewall, honeypot };
  }
  return node;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK TIMELINE + RAF RENDERER  (Step 5 — §16)
// ═══════════════════════════════════════════════════════════════════════════

// Tile-space dead centres of every honeypot block (native + allocated) for the AoE check.
// A 2×2 block anchored at (ax,ay) spans tiles [ax,ax+2]×[ay,ay+2] ⇒ centre (ax+1, ay+1).
function ntHoneypotCentres(node, placements) {
  return [
    ...(node.nativeHoneypots || []).map(h => ({ x: h.ax + 1, y: h.ay + 1 })),
    ...(placements || []).filter(p => p.type === 'honeypot').map(p => ({ x: p.ax + 1, y: p.ay + 1 })),
  ];
}

// Simulate the Breach Vector along the taut TILE-space POLYLINE at a fixed sim tick:
//   latency = Σ travel distance × NT_BASE_TILE_TIME (×1/slow while slowed).
// NO artificial turn cost — corner delay is already in the polyline geometry (the
// runner's 0.25 clearance pushes the taut path out around every offset corner).
// Slow = 0.5× speed for NT_HONEYPOT_DURATION after a trigger (timer; persists outside
// the AoE); per-honeypot cooldown; non-stacking (re-trigger extends the window).
// AoE is the per-tick squared check (dx*dx + dy*dy <= 18).
// Returns { polyline, fires:[{x,y,atMs}], slowSpans:[[startMs,endMs]], samples, latencyMs }.
function ntComputeTimeline(polyline, honeypots) {
  if (!polyline || polyline.length < 2) return { polyline: polyline || [], fires: [], slowSpans: [], samples: [], latencyMs: 0 };
  let elapsed = 0;
  const fires = [];
  const slowSpans = [];
  const samples = [{ t: 0, x: polyline[0].x, y: polyline[0].y }]; // trajectory for the renderer
  const lastFired = honeypots.map(() => -Infinity);
  let slowUntil = -Infinity;

  const checkFires = (x, y) => {
    honeypots.forEach((h, i) => {
      const dx = h.x - x, dy = h.y - y;
      if (dx * dx + dy * dy <= NT_HONEYPOT_RADIUS_SQ && elapsed >= lastFired[i] + NT_HONEYPOT_COOLDOWN) {
        lastFired[i] = elapsed;
        const prevUntil = slowUntil;
        slowUntil = Math.max(slowUntil, elapsed + NT_HONEYPOT_DURATION);
        if (prevUntil <= elapsed) slowSpans.push([elapsed, slowUntil]); else slowSpans[slowSpans.length - 1][1] = slowUntil;
        fires.push({ x: h.x, y: h.y, atMs: elapsed });
      }
    });
  };

  checkFires(polyline[0].x, polyline[0].y);
  for (let i = 1; i < polyline.length; i++) {
    const from = polyline[i - 1], to = polyline[i];
    const segLen = Math.hypot(to.x - from.x, to.y - from.y);
    let travelled = 0;
    while (travelled < segLen - 1e-9) {
      const ds = Math.min(NT_SUBSTEP, segLen - travelled);
      const slowed = elapsed < slowUntil;
      elapsed += (ds * NT_BASE_TILE_TIME) / (slowed ? NT_HONEYPOT_SLOW : 1);
      travelled += ds;
      const t = travelled / segLen;
      const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
      checkFires(x, y);
      samples.push({ t: elapsed, x, y });
    }
  }
  return { polyline, fires, slowSpans, samples, latencyMs: Math.round(elapsed) };
}

// Solo/local: route → taut tile polyline (with edge stubs) → timeline + latency.
function ntComputeTimeline_local() {
  const polyline = ntShortestPath(ntNode, ntMyPlacements);
  if (!polyline) return { polyline: [], fires: [], slowSpans: [], samples: [], latencyMs: 0 };
  return ntComputeTimeline(polyline, ntHoneypotCentres(ntNode, ntMyPlacements));
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORING  (Step 5 — §6)
// ═══════════════════════════════════════════════════════════════════════════

function ntFmtMs(ms) { return Math.round(ms).toLocaleString('en-AU') + ' ms'; }

// Rolling team average across every cycle played so far — the team-level counterpart of
// ntOverallSER. DERIVED from ntTeamCycleSERs on demand rather than accumulated into new
// state, so nothing extra has to be broadcast, reset or normalised on receipt.
function ntTeamOverallSER() {
  return [0, 1].map(team => {
    let sum = 0, n = 0;
    ntTeamCycleSERs.forEach(c => { if (c && typeof c[team] === 'number') { sum += c[team]; n++; } });
    return n ? sum / n : 0;
  });
}

function ntRenderSummary() {
  const serEl   = document.getElementById('nt-summary-ser');
  const rawEl   = document.getElementById('nt-summary-rawms');
  const labelEl = document.getElementById('nt-summary-ser-label');
  const board   = document.getElementById('nt-summary-board');
  const isFinal = ntSummaryMode === 'match';

  // Set on EVERY path, including the non-Debug ones, so a Debug session followed by a Standard
  // one cannot leave a stale caption behind (ui-style.md, the Stack's multi-renderer rule).
  const capEl = document.getElementById('nt-summary-caption');
  if (capEl) {
    if (ntDebugMode) {
      const seat = window.syllyMultiplayerMode === 'single' ? 0 : mpMyPlayerIdx;
      const n = ntDebugAttemptCounts[seat] || ntDebugMyAttempt || 1;
      capEl.textContent   = `STAGING — scored on your best of ${n} attempt${n === 1 ? '' : 's'}`;
      capEl.style.display = '';
    } else {
      capEl.textContent   = '';
      capEl.style.display = 'none';
    }
  }

  // Solo: raw latency is the headline (SER is trivially 100%); show accumulated on final.
  if (ntPlayerCount <= 1) {
    const cycleMs = (ntCycleLatencies[ntCycle] || [0])[0];
    const totalMs = ntCycleLatencies.reduce((a, c) => a + ((c && c[0]) || 0), 0);
    if (labelEl) labelEl.textContent = isFinal ? 'Total Accumulated Latency' : 'Cycle Latency';
    if (serEl)   serEl.textContent   = ntFmtMs(isFinal ? totalMs : cycleMs);
    if (rawEl)   rawEl.textContent   = 'SER 100.00%';
    if (board) {
      board.innerHTML = '';
      ntCycleLatencies.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-white rounded-xl px-4 py-2 text-sm';
        row.innerHTML = `<span class="text-stone-500 font-mono">VS-${i + 1}</span>` +
                        `<span class="text-stone-800 font-mono font-semibold">${ntFmtMs((c || [0])[0])}</span>`;
        board.appendChild(row);
      });
    }
    return;
  }

  // DNP: the match is team vs team, so the headline and the board are both by TEAM —
  // with each member's own contribution under their team, because the per-player number
  // is what a player actually recognises as "how I did". ntTeamCycleSERs was computed,
  // broadcast and applied on every device from the day DNP shipped, and then read by
  // nothing at all; this is the render that was missing, not new scoring.
  if (ntIsDNP() && ntPlayerCount > 1) {
    const teamSERs = isFinal ? ntTeamOverallSER() : (ntTeamCycleSERs[ntCycle] || []);
    const playerSERs = (isFinal ? ntOverallSER : ntCycleSERs[ntCycle]) || [];
    const teamName = t => ntTeamNames[t] || ('TEAM ' + (t === 0 ? 'A' : 'B'));
    const leadIdx  = (teamSERs[1] || 0) > (teamSERs[0] || 0) ? 1 : 0;

    if (labelEl) labelEl.textContent = isFinal ? 'Match Winner' : 'Cycle Leader';
    if (serEl)   serEl.textContent   = teamName(leadIdx);
    if (rawEl)   rawEl.textContent   = 'TEAM SER ' + (teamSERs[leadIdx] || 0).toFixed(2) + '%';

    if (board) {
      board.innerHTML = '';
      const order = [0, 1].sort((a, b) => (teamSERs[b] || 0) - (teamSERs[a] || 0));
      order.forEach(team => {
        const members = ntTeamIdx.reduce((acc, t, i) => { if (t === team) acc.push(i); return acc; }, []);
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl px-4 py-2 text-sm flex flex-col gap-1';
        let inner = `<div class="flex items-center justify-between">
            <span class="text-stone-700 font-mono font-semibold">${teamName(team)}</span>
            <span class="text-stone-800 font-mono font-semibold">${(teamSERs[team] || 0).toFixed(2)}%</span>
          </div>`;
        members.forEach(pIdx => {
          const nm = ntPlayerNames[pIdx] || ('ADMIN-' + (pIdx + 1));
          inner += `<div class="flex items-center justify-between pl-3">
              <span class="text-stone-400 font-mono text-xs">${nm}</span>
              <span class="text-stone-500 font-mono text-xs">${(playerSERs[pIdx] || 0).toFixed(2)}%</span>
            </div>`;
        });
        card.innerHTML = inner;
        board.appendChild(card);
      });
    }
    return;
  }

  // Multi-player leaderboard — PTP and MDLM alike. This deliberately does NOT branch on
  // syllyMultiplayerMode: it reads ntOverallSER / ntCycleSERs / ntPlayerNames, and the
  // NT_PLAYBACK applier populates all three on every client from the host's own numbers,
  // so the same render is correct everywhere. It used to be gated behind
  // `mode === 'single'` with an "MDLM rendering arrives in the MP step" placeholder
  // below — a step never taken, so every MDLM summary showed the untouched `--.--%`
  // default with no scoreboard at all.
  if (ntPlayerCount > 1) {
    const overallSERs = ntOverallSER.length ? ntOverallSER : (ntCycleSERs[ntCycle] || []);
    const winnerIdx = overallSERs.reduce((best, v, i) => v > overallSERs[best] ? i : best, 0);
    const winnerName = ntPlayerNames[winnerIdx] || ('ADMIN-' + (winnerIdx + 1));
    if (labelEl) labelEl.textContent = isFinal ? 'Match Winner' : 'Cycle Leader';
    if (serEl)   serEl.textContent   = winnerName;
    if (rawEl)   rawEl.textContent   = 'SER ' + (overallSERs[winnerIdx] || 0).toFixed(2) + '%';
    if (board) {
      board.innerHTML = '';
      const sorted = overallSERs.map((ser, i) => ({ i, ser })).sort((a, b) => b.ser - a.ser);
      sorted.forEach(({ i, ser }) => {
        const name = ntPlayerNames[i] || ('ADMIN-' + (i + 1));
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-white rounded-xl px-4 py-2 text-sm';
        row.innerHTML = `<span class="text-stone-500 font-mono">${name}</span>` +
                        `<span class="text-stone-800 font-mono font-semibold">${ser.toFixed(2)}%</span>`;
        board.appendChild(row);
      });
    }
    return;
  }

  // Unreachable in practice — ntPlayerCount is either <= 1 (handled above) or > 1 (the
  // leaderboard). Kept as a safe default rather than leaving the label whatever the
  // previous render wrote (§ the Stack's multi-renderer rule in ui-style.md).
  if (labelEl) labelEl.textContent = 'System Efficiency Rating';
}

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE ORCHESTRATION  (solo/local — host broadcast lands in the MP step)
// ═══════════════════════════════════════════════════════════════════════════

// Generate this cycle's Node, clear placements, show the flavour handshake.
function ntBeginCycle() {
  ntGenerateNode();
  ntMyPlacements = [];
  ntFirewallUsed = 0;
  ntHoneypotUsed = 0;
  ntPlaybackTimeline = null;
  // PTP resets — clear per-cycle comparison state each new cycle
  ntPtpTurn       = 0;
  ntPtpTimelines  = [];
  ntPtpPlacements = [];
  // Solo is PTP with exactly one admin — same turn/gate machinery either way, so there's
  // no separate solo path here. ntBeginCycle() is only ever reached in single-device mode.
  ntBeginPtpTurn();
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD SCREEN  (DOM grid + contextual gestures + preventive validity, §17)
// ═══════════════════════════════════════════════════════════════════════════

// Which discrete block (if any) covers tile (tx,ty)? Blocks are disjoint, so ≤1 match.
function ntBlockAt(tx, ty) {
  const n = ntNode;
  let b = (n.badSectors || []).find(c => ntCovers(c.ax, c.ay, tx, ty));      if (b) return { ax: b.ax, ay: b.ay, type: 'bad',  source: 'bad' };
  b = (n.nativeHoneypots || []).find(c => ntCovers(c.ax, c.ay, tx, ty));     if (b) return { ax: b.ax, ay: b.ay, type: 'native', source: 'native' };
  b = ntMyPlacements.find(p => ntCovers(p.ax, p.ay, tx, ty));        if (b) return { ax: b.ax, ay: b.ay, type: b.type, source: 'placement' };
  return null;
}

function ntCellType(tx, ty) {
  const b = ntBlockAt(tx, ty);
  if (b) return b.type;                       // 'bad' | 'native' | 'firewall' | 'honeypot'
  if (ntIsMouthTile(tx, ty)) return 'port';   // the runner enters/exits here — reserved
  return 'null';
}

function ntPaintCell(cell, tx, ty) {
  const type = ntCellType(tx, ty);
  cell.textContent = '';
  cell.className = 'nt-cell flex items-center justify-center text-[9px] font-bold select-none';
  const styles = {
    port:     ['bg-slate-900',   'text-emerald-400', '◦'],
    bad:      ['bg-slate-600',   'text-slate-400', ''],
    native:   ['bg-purple-900', 'text-purple-400', ''],  // muted structural obstacle — not player-placed
    firewall: ['bg-cyan-500',    'text-white', ''],
    honeypot: ['bg-fuchsia-500', 'text-white', ''],
    null:     ['bg-slate-800',   'text-slate-700', ''],
  }[type];
  cell.classList.add(styles[0], styles[1]);
  if (styles[2]) cell.textContent = styles[2];
}

function ntRepaintFootprint(ax, ay) {
  ntBlockTiles(ax, ay).forEach(([tx, ty]) => {
    if (ntBuildCells[ty] && ntBuildCells[ty][tx]) ntPaintCell(ntBuildCells[ty][tx], tx, ty);
  });
}

// ── Ghost preview helpers ────────────────────────────────────────────────────
function ntClearGhost() {
  if (!ntGhostAnchor) return;
  const { ax, ay } = ntGhostAnchor;
  ntGhostAnchor = null;
  ntBlockTiles(ax, ay).forEach(([tx, ty]) => {
    const cell = ntBuildCells[ty] && ntBuildCells[ty][tx];
    if (!cell) return;
    cell.style.backgroundColor = '';
    ntPaintCell(cell, tx, ty);
  });
  // Restore routing status to valid (unless a transient timer is already running)
  if (!ntRoutingTimer) {
    const el = document.getElementById('nt-routing-status');
    if (el) { el.textContent = 'ROUTING: VALID'; el.className = 'text-emerald-400 whitespace-nowrap'; }
  }
}

function ntShowGhost(ax, ay, validity) {
  // Clear any ghost at a different anchor first
  if (ntGhostAnchor && (ntGhostAnchor.ax !== ax || ntGhostAnchor.ay !== ay)) ntClearGhost();
  ntGhostAnchor = { ax, ay };
  const ghostBg = validity === 'valid'     ? 'rgba(52,211,153,0.45)'  // emerald-400 tint
                : validity === 'exception' ? 'rgba(239,68,68,0.45)'   // red-500 tint
                :                           'rgba(100,116,139,0.45)'; // slate-500 tint (out-of-stock)
  ntBlockTiles(ax, ay).forEach(([tx, ty]) => {
    const cell = ntBuildCells[ty] && ntBuildCells[ty][tx];
    if (!cell) return;
    cell.className = 'nt-cell flex items-center justify-center text-[9px] font-bold select-none';
    cell.style.backgroundColor = ghostBg;
    cell.textContent = '';
  });
}

// Called on every pointermove; computes the anchor from (tx,ty) and runs BFS only
// when the anchor changes — throttles the ~5k-cell BFS to anchor steps, not pixels.
function ntUpdateGhostAt(tx, ty) {
  if (!ntNode) return;
  const n = ntNode.n;
  const ax = Math.max(0, Math.min(tx, n - 2));
  const ay = Math.max(0, Math.min(ty, n - 2));

  // Tapping an existing user placement → they'll remove it on tap; no ghost.
  const b = ntBlockAt(tx, ty);
  if (b && b.source === 'placement') { ntClearGhost(); return; }

  // Reserved (bad / native / port mouth) → silent, no ghost.
  let blocked = false;
  for (const [fx, fy] of ntBlockTiles(ax, ay)) {
    if (ntBlockAt(fx, fy) || ntIsMouthTile(fx, fy)) { blocked = true; break; }
  }
  if (blocked) { ntClearGhost(); return; }

  // Ghost already at this anchor → nothing to change.
  if (ntGhostAnchor && ntGhostAnchor.ax === ax && ntGhostAnchor.ay === ay) return;

  // New anchor: compute validity (BFS only fires here, not on every pixel).
  let validity;
  if (ntFirewallUsed >= ntInventory.firewall) {
    validity = 'outofstock';
  } else {
    const candidate = ntMyPlacements.concat([{ ax, ay, type: 'firewall' }]);
    validity = ntPathExists(ntNode, candidate) ? 'valid' : 'exception';
  }

  ntShowGhost(ax, ay, validity);

  // Update status bar to reflect ghost state (no transient timer — ghost IS the state).
  if (ntRoutingTimer) { clearTimeout(ntRoutingTimer); ntRoutingTimer = null; }
  const el = document.getElementById('nt-routing-status');
  if (el) {
    if (validity === 'valid') {
      el.textContent = 'ROUTING: VALID'; el.className = 'text-emerald-400 whitespace-nowrap';
    } else if (validity === 'exception') {
      el.textContent = 'ROUTING: EXCEPTION'; el.className = 'text-red-500 whitespace-nowrap';
    } else {
      el.textContent = 'STORAGE: INSUFFICIENT'; el.className = 'text-amber-400 whitespace-nowrap';
    }
  }
}

// Port markers — a rectangle straddling the grid border; ingress green/inward, egress
// grey/outward. Lifted out of ntRenderBuildGrid so the build grid and the Node Editor call
// the same code and can never drift into drawing different markers.
const NT_PORT_ARROWS = { top:  { in: '▼', out: '▲' }, bottom: { in: '▲', out: '▼' },
                         left: { in: '▶', out: '◀' }, right:  { in: '◀', out: '▶' } };

function ntDrawPortMarker(grid, port, color, inward, n) {
  if (!grid || !port) return null;
  const m = document.createElement('div');
  m.className = 'absolute pointer-events-none rounded-sm flex items-center justify-center';
  m.style.background = color;
  m.style.boxShadow = `0 0 6px ${color}`;
  const span = `calc(${100 / n}%)`, off = '-3px', thick = '6px';
  if (port.edge === 'top')         { m.style.left = `${(port.idx / n) * 100}%`; m.style.width = span; m.style.top = off; m.style.height = thick; }
  else if (port.edge === 'bottom') { m.style.left = `${(port.idx / n) * 100}%`; m.style.width = span; m.style.bottom = off; m.style.height = thick; }
  else if (port.edge === 'left')   { m.style.top = `${(port.idx / n) * 100}%`; m.style.height = span; m.style.left = off; m.style.width = thick; }
  else                             { m.style.top = `${(port.idx / n) * 100}%`; m.style.height = span; m.style.right = off; m.style.width = thick; }
  const a = document.createElement('span');
  a.style.cssText = 'font-size:5px;line-height:1;color:#fff;pointer-events:none';
  a.textContent = NT_PORT_ARROWS[port.edge][inward ? 'in' : 'out'];
  m.appendChild(a);
  grid.appendChild(m);
  return m;
}

function ntRenderBuildGrid() {
  const old = document.getElementById('nt-build-grid');
  if (!old || !ntNode) return;
  // Strip stale listeners from prior cycles by replacing the element with a shallow clone.
  // grid.innerHTML = '' removes child nodes but NOT grid-level listeners — causing cycle 2 to
  // fire the old pointerup first (places block) then the new one (immediately removes it).
  const grid = old.cloneNode(false);
  old.parentNode.replaceChild(grid, old);
  const n = ntNode.n;
  grid.innerHTML = '';
  grid.style.display = 'grid';
  grid.style.position = 'relative';
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.style.gap = '1px';
  grid.style.touchAction = 'none';
  ntBuildCells = [];

  for (let ty = 0; ty < n; ty++) {
    ntBuildCells.push([]);
    for (let tx = 0; tx < n; tx++) {
      const cell = document.createElement('div');
      cell.style.aspectRatio = '1';
      ntPaintCell(cell, tx, ty);
      ntBuildCells[ty].push(cell);
      grid.appendChild(cell);
    }
  }

  // Grid-level pointer handlers — ghost preview on hover/drag, commit on tap/long-press.
  const getTile = (e) => {
    const rect = grid.getBoundingClientRect();
    return {
      tx: Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left) / rect.width * n))),
      ty: Math.max(0, Math.min(n - 1, Math.floor((e.clientY - rect.top) / rect.height * n))),
    };
  };

  grid.addEventListener('pointermove', (e) => {
    e.preventDefault();
    const { tx, ty } = getTile(e);
    ntUpdateGhostAt(tx, ty);
  });

  grid.addEventListener('pointerleave', () => {
    ntClearGhost();
    if (ntLongPressTimer) { clearTimeout(ntLongPressTimer); ntLongPressTimer = null; }
  });

  let longFired = false, rightClickPending = false;
  grid.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    rightClickPending = e.button === 2; // contextmenu fires AFTER pointerup — flag so pointerup skips
    longFired = false;
    const { tx, ty } = getTile(e);
    ntUpdateGhostAt(tx, ty); // ensure ghost is up-to-date at press point
    if (ntLongPressTimer) { clearTimeout(ntLongPressTimer); ntLongPressTimer = null; }
    if (rightClickPending) return; // right-click handled entirely by contextmenu — no long-press timer
    ntLongPressTimer = setTimeout(() => {
      longFired = true;
      ntLongPressTimer = null;
      // Long-press: upgrade existing firewall → honeypot, or place new honeypot.
      if (ntGhostAnchor) {
        const { ax, ay } = ntGhostAnchor;
        ntClearGhost();
        const existing = ntMyPlacements.find(p => p.ax === ax && p.ay === ay);
        if (existing && existing.type === 'firewall') ntUpgradeToHoneypot(ax, ay);
        else ntAttemptPlace(ax, ay, true);
      } else {
        ntHandleLongPress(tx, ty);
      }
    }, NT_LONGPRESS_MS);
  });

  grid.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (rightClickPending) { rightClickPending = false; return; } // contextmenu event will handle it
    if (longFired) return; // long-press already handled
    if (ntLongPressTimer) { clearTimeout(ntLongPressTimer); ntLongPressTimer = null; }
    const { tx, ty } = getTile(e);
    const b = ntBlockAt(tx, ty);
    if (b && b.source === 'placement') {
      // Tap-cycle on existing placement: firewall → honeypot (if stock); honeypot → empty.
      ntClearGhost();
      if (b.type === 'firewall') {
        if (ntHoneypotUsed < ntInventory.honeypot) {
          ntUpgradeToHoneypot(b.ax, b.ay);
        } else {
          ntRemoveBlock(b.ax, b.ay); // no honeypot stock — skip honeypot step, go to empty
        }
      } else {
        ntRemoveBlock(b.ax, b.ay); // honeypot → empty
      }
    } else if (ntGhostAnchor) {
      // Empty cell: prefer firewall; fall through to honeypot if out of firewall stock.
      const { ax, ay } = ntGhostAnchor;
      ntClearGhost();
      if (ntFirewallUsed < ntInventory.firewall) {
        ntAttemptPlace(ax, ay, false);
      } else if (ntHoneypotUsed < ntInventory.honeypot) {
        ntAttemptPlace(ax, ay, true); // skip firewall step — none in stock
      } else {
        playBoing(); ntSetRouting('storage_insufficient');
      }
    }
  });

  // Right-click on an empty valid cell → place honeypot directly (desktop power user shortcut).
  grid.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (ntLongPressTimer) { clearTimeout(ntLongPressTimer); ntLongPressTimer = null; } // defence: cancel any stale long-press
    const { tx, ty } = getTile(e);
    const b = ntBlockAt(tx, ty);
    if (b || ntIsMouthTile(tx, ty)) return; // occupied or port — ignore
    const ax = Math.max(0, Math.min(tx, n - 2));
    const ay = Math.max(0, Math.min(ty, n - 2));
    for (const [fx, fy] of ntBlockTiles(ax, ay)) { if (ntBlockAt(fx, fy) || ntIsMouthTile(fx, fy)) return; }
    ntClearGhost();
    ntAttemptPlace(ax, ay, true);
  });

  ntDrawPortMarker(grid, ntNode.ingress, '#34d399', true, n);            // INGRESS — green, inward
  ntDrawPortMarker(grid, ntNode.egress,  NT_COLOR_BAD_SECTOR, false, n); // EGRESS  — grey, outward
  ntUpdateBuildCounters();
}

function ntHandleTap(tx, ty) {
  const b = ntBlockAt(tx, ty);
  if (b && b.source === 'placement') { ntRemoveBlock(b.ax, b.ay); return; }
  if (b) return;                       // bad / native — reserved
  if (ntIsMouthTile(tx, ty)) return;   // port mouth — reserved
  ntAttemptPlace(tx, ty, false);
}

function ntHandleLongPress(tx, ty) {
  const b = ntBlockAt(tx, ty);
  if (b && b.source === 'placement' && b.type === 'firewall') { ntUpgradeToHoneypot(b.ax, b.ay); return; }
  if (b) return;                       // honeypot / bad / native — reserved
  if (ntIsMouthTile(tx, ty)) return;
  ntAttemptPlace(tx, ty, true);
}

// Place a 2×2 block anchored at the tapped tile (clamped so the footprint stays in bounds).
function ntAttemptPlace(tx, ty, asHoneypot) {
  ntClearGhost();
  const n = ntNode.n;
  const ax = Math.max(0, Math.min(tx, n - 2)), ay = Math.max(0, Math.min(ty, n - 2));
  // Strict zero-overlap: all 4 footprint tiles must be vacant and clear of port mouths.
  for (const [fx, fy] of ntBlockTiles(ax, ay)) {
    if (ntBlockAt(fx, fy) || ntIsMouthTile(fx, fy)) { ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]); return; }
  }
  if (asHoneypot) {
    if (ntHoneypotUsed >= ntInventory.honeypot) { playBoing(); ntSetRouting('storage_insufficient'); return; }
  } else {
    if (ntFirewallUsed >= ntInventory.firewall)  { playBoing(); ntSetRouting('storage_insufficient'); return; }
  }
  // Connectivity gate (config lattice, no-corner-cut): would this seal the Egress?
  const candidate = ntMyPlacements.concat([{ ax, ay, type: asHoneypot ? 'honeypot' : 'firewall' }]);
  if (!ntPathExists(ntNode, candidate)) { ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]); return; }
  ntMyPlacements.push({ ax, ay, type: asHoneypot ? 'honeypot' : 'firewall' });
  playPillClick();
  ntSetRouting('valid');
  ntRepaintFootprint(ax, ay);
  ntUpdateBuildCounters();
}

function ntRemoveBlock(ax, ay) {
  ntClearGhost();
  ntMyPlacements = ntMyPlacements.filter(p => !(p.ax === ax && p.ay === ay));
  playWhoosh();
  ntRepaintFootprint(ax, ay);
  ntUpdateBuildCounters();
}

function ntUpgradeToHoneypot(ax, ay) {
  ntClearGhost();
  if (ntHoneypotUsed >= ntInventory.honeypot) { playBoing(); ntSetRouting('storage_insufficient'); return; }
  const p = ntMyPlacements.find(c => c.ax === ax && c.ay === ay);
  if (!p) return;
  p.type = 'honeypot'; // footprint stays solid → connectivity unchanged
  playPillClick();
  ntRepaintFootprint(ax, ay);
  ntUpdateBuildCounters();
}

function ntUpdateBuildCounters() {
  const prevFw = ntFirewallUsed, prevHp = ntHoneypotUsed;
  ntFirewallUsed = ntMyPlacements.filter(p => p.type === 'firewall').length;
  ntHoneypotUsed = ntMyPlacements.filter(p => p.type === 'honeypot').length;
  const fw = document.getElementById('nt-fw-counter');
  const hp = document.getElementById('nt-hp-counter');
  if (fw) {
    fw.textContent = `${ntInventory.firewall - ntFirewallUsed}/${ntInventory.firewall}`;
    if (ntFirewallUsed !== prevFw) { fw.classList.remove('nt-counter-flash'); void fw.offsetWidth; fw.classList.add('nt-counter-flash'); }
  }
  if (hp) {
    hp.textContent = `${ntInventory.honeypot - ntHoneypotUsed}/${ntInventory.honeypot}`;
    if (ntHoneypotUsed !== prevHp) { hp.classList.remove('nt-counter-flash'); void hp.offsetWidth; hp.classList.add('nt-counter-flash'); }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NODE EDITOR  (Debug Mode — author the node instead of rolling one)
// ═══════════════════════════════════════════════════════════════════════════
// The editor writes DIRECTLY into ntNode with ntMyPlacements empty. That is the whole trick:
// ntBlockAt / ntCellType / ntPaintCell / ntRepaintFootprint / ntPathExists / ntFlashReject are
// already mode-agnostic, so they need no changes and the editor is WYSIWYG for free — a bad
// sector looks here exactly as it will look in play. ntRenderBuildGrid is NOT reused: its
// pointer handlers are saturated with build semantics (live-inventory tap-cycling, the
// firewall→honeypot long-press upgrade, right-click honeypots, ntUpdateBuildCounters on every
// path, ports as pointer-events:none decorations). Threading a mode branch through all of them
// would put conditional logic on the single render path the loopback harness actually executes.

function ntAuthBlankNode() {
  const n = ntMatrixScale;
  return {
    n,
    ingress: { edge: 'left',  idx: n >> 1 },
    egress:  { edge: 'right', idx: n >> 1 },
    badSectors: [],
    nativeHoneypots: [],
  };
}

// Entry point — reached at session start AND on the Author New Node loop-back from the summary.
// One authoring entry point, reached twice; there is deliberately no second "restart" path.
function ntShowAuthoring() {
  ntDebugBrush   = 'bad';
  ntNode         = ntAuthBlankNode();   // always a fresh sandbox
  ntInventory    = { firewall: 0, honeypot: 0 };
  ntMyPlacements = [];
  ntFirewallUsed = 0;
  ntHoneypotUsed = 0;
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;
  ntDebugFinished      = [];
  ntDebugAttemptCounts = [];
  // Symmetric with the opening: every other device returns to the same standby it saw at the
  // start. One authoring entry point, reached twice — not a second "restart" path. This is why
  // NT_DEBUG_ROSTER carries an `authoring` flag rather than the feature minting a third packet.
  if (window.syllyMultiplayerMode === 'host') ntDebugBroadcastRoster(true);
  showScreen('screen-nt-authoring');
  ntRenderAuthGrid();
  ntSyncAuthUI();
  ntSetRouting('valid');
}

function ntRenderAuthGrid() {
  const old = document.getElementById('nt-auth-grid');
  if (!old || !ntNode) return;
  // Same shallow-clone swap as ntRenderBuildGrid: innerHTML = '' removes children but NOT
  // grid-level listeners, so a re-render would otherwise stack a second pointerup handler.
  const grid = old.cloneNode(false);
  old.parentNode.replaceChild(grid, old);
  const n = ntNode.n;
  grid.innerHTML = '';
  grid.style.display = 'grid';
  grid.style.position = 'relative';
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.style.gap = '1px';
  grid.style.touchAction = 'none';
  ntBuildCells = [];   // shared with the build screen — ntRepaintFootprint/ntFlashReject read it

  for (let ty = 0; ty < n; ty++) {
    ntBuildCells.push([]);
    for (let tx = 0; tx < n; tx++) {
      const cell = document.createElement('div');
      cell.style.aspectRatio = '1';
      ntPaintCell(cell, tx, ty);
      ntBuildCells[ty].push(cell);
      grid.appendChild(cell);
    }
  }

  const getTile = (e) => {
    const rect = grid.getBoundingClientRect();
    return {
      tx: Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left) / rect.width * n))),
      ty: Math.max(0, Math.min(n - 1, Math.floor((e.clientY - rect.top) / rect.height * n))),
    };
  };
  // A brush model: one tap, one meaning, decided by ntDebugBrush. No long-press, no ghost
  // preview, no right-click — those all belong to the build screen's inventory semantics.
  grid.addEventListener('pointerup', (e) => {
    e.preventDefault();
    const { tx, ty } = getTile(e);
    ntAuthTap(tx, ty);
  });
  grid.addEventListener('contextmenu', e => e.preventDefault());

  ntDrawPortMarker(grid, ntNode.ingress, '#34d399', true, n);
  ntDrawPortMarker(grid, ntNode.egress,  NT_COLOR_BAD_SECTOR, false, n);
}

function ntAuthTap(tx, ty) {
  if (ntDebugBrush === 'ingress' || ntDebugBrush === 'egress') { ntAuthSetPort(tx, ty); return; }
  const b = ntBlockAt(tx, ty);
  if (b && (b.source === 'bad' || b.source === 'native')) { ntAuthRemoveTerrain(b); return; }
  ntAuthPlaceTerrain(tx, ty, ntDebugBrush === 'native');
}

function ntAuthPlaceTerrain(tx, ty, asHoneypot) {
  const n = ntNode.n;
  const ax = Math.max(0, Math.min(tx, n - 2)), ay = Math.max(0, Math.min(ty, n - 2));
  // Strict zero-overlap, exactly as ntAttemptPlace enforces it during Build.
  for (const [fx, fy] of ntBlockTiles(ax, ay)) {
    if (ntBlockAt(fx, fy) || ntIsMouthTile(fx, fy)) { ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]); return; }
  }
  if (asHoneypot && ntNode.nativeHoneypots.length >= ntNativeHoneypots) {
    playBoing(); ntSetRouting('storage_insufficient');
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
  // Validity gate — the authored node must route with NO player hardening on it, which is the
  // same guarantee ntGenerateNode gives (`ntPathExists(candidate, [])`, nt.js:1714).
  const target = asHoneypot ? ntNode.nativeHoneypots : ntNode.badSectors;
  target.push({ ax, ay });
  if (!ntPathExists(ntNode, [])) {
    target.pop();
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
  playPillClick();
  ntSetRouting('valid');
  ntRepaintFootprint(ax, ay);
  ntSyncAuthUI();
}

// Removing terrain only ever OPENS the board, so it can never break validity — no re-check.
function ntAuthRemoveTerrain(b) {
  const drop = arr => arr.filter(c => !(c.ax === b.ax && c.ay === b.ay));
  ntNode.badSectors      = drop(ntNode.badSectors);
  ntNode.nativeHoneypots = drop(ntNode.nativeHoneypots);
  playWhoosh();
  ntRepaintFootprint(b.ax, b.ay);
  ntSyncAuthUI();
}

// Arm the Ingress or Egress brush, then tap any tile — the port snaps to that tile's NEAREST
// border. Reuses the grid's own getTile maths, so no drag interaction is needed.
//
// Two of ntGenerateNode's constraints are deliberately NOT enforced here:
//   • the corner-proximity re-roll (|imx−emx| + |imy−emy| < 8, nt.js:1695)
//   • the different-edges rule (while (egress.edge === ingress.edge), nt.js:1692)
// Both exist to keep RANDOMLY ROLLED nodes varied. An author placing two ports close together,
// or on the same edge, is making a choice — blocking it would be the tool second-guessing its
// user. The two genuine constraints remain: the mouths must differ, and the node must route.
function ntAuthSetPort(tx, ty) {
  const n = ntNode.n;
  const nearest = [
    { edge: 'top',    d: ty,         idx: tx },
    { edge: 'bottom', d: n - 1 - ty, idx: tx },
    { edge: 'left',   d: tx,         idx: ty },
    { edge: 'right',  d: n - 1 - tx, idx: ty },
  ].sort((a, b) => a.d - b.d)[0];
  const pick  = { edge: nearest.edge, idx: nearest.idx };
  const key   = ntDebugBrush;                                    // 'ingress' | 'egress'
  const other = key === 'ingress' ? ntNode.egress : ntNode.ingress;
  if (pick.edge === other.edge && pick.idx === other.idx) {
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);      // ingress mouth ≠ egress mouth
    return;
  }
  const prev = ntNode[key];
  ntNode[key] = pick;
  if (!ntPathExists(ntNode, [])) {
    ntNode[key] = prev;
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
  playPillClick();
  ntSetRouting('valid');
  ntRenderAuthGrid();   // port markers are appended to the grid — a full re-render moves them
}

// Budget ceilings, both lifted from ntGenerateNode's own roll (nt.js:1730–1731).
function ntAuthMaxFirewall() {
  const n = ntNode ? ntNode.n : ntMatrixScale;
  return Math.pow(Math.floor(n / NT_BLOCK), 2);                  // "slots" — the roll's ceiling
}
function ntAuthMaxHoneypot() {
  return Math.max(0, NT_HONEYPOT_CAP - (ntNode ? ntNode.nativeHoneypots.length : 0));
}

function ntSyncAuthUI() {
  // Clamp here rather than at each stepper: removing a native honeypot RAISES the honeypot
  // ceiling and adding one lowers it, so the budget has to be re-clamped after a terrain edit
  // too — one place, every path.
  ntInventory.firewall = Math.max(0, Math.min(ntInventory.firewall, ntAuthMaxFirewall()));
  ntInventory.honeypot = Math.max(0, Math.min(ntInventory.honeypot, ntAuthMaxHoneypot()));
  const fw = document.getElementById('nt-auth-fw-val');
  const hp = document.getElementById('nt-auth-hp-val');
  if (fw) fw.textContent = String(ntInventory.firewall);
  if (hp) hp.textContent = String(ntInventory.honeypot);
  // Only pill-active-emerald is ever added or removed — .pill always stays.
  document.querySelectorAll('[data-nt-brush]').forEach(b => {
    b.classList.toggle('pill-active-emerald', b.dataset.ntBrush === ntDebugBrush);
  });
  const hint = document.getElementById('nt-auth-brush-hint');
  if (hint) {
    const natives = ntNode ? ntNode.nativeHoneypots.length : 0;
    hint.textContent = {
      bad:     'Tap to draw a Bad Sector. Tap it again to erase.',
      native:  `Tap to drop a Native Honeypot — ${natives} of ${ntNativeHoneypots} placed.`,
      ingress: 'Tap anywhere to move the Ingress port to the nearest edge.',
      egress:  'Tap anywhere to move the Egress port to the nearest edge.',
    }[ntDebugBrush] || '';
  }
}

// Randomise Terrain — ntGenerateNode(true) already means exactly "re-roll the geometry, leave
// the budget alone" (its keepInventory argument, nt.js:1728). A parameter reuse, not new logic.
// Ports are NOT terrain, though: ntGenerateNode re-rolls ingress/egress unconditionally, which
// would silently wipe a hand-placed pair (ntAuthSetPort deliberately allows placements the
// generator itself would never roll — same-edge mouths, close corners). Restore the authored
// pair over the freshly-rolled terrain, but only keep it if it still routes; otherwise fall
// back to whatever ntGenerateNode rolled alongside that terrain.
function ntAuthRandomiseTerrain() {
  const authoredIngress = ntNode.ingress, authoredEgress = ntNode.egress;
  ntGenerateNode(true);
  const rolledIngress = ntNode.ingress, rolledEgress = ntNode.egress;
  ntNode.ingress = authoredIngress;
  ntNode.egress  = authoredEgress;
  if (!ntPathExists(ntNode, [])) {
    ntNode.ingress = rolledIngress;
    ntNode.egress  = rolledEgress;
  }
  ntRenderAuthGrid();
  ntSyncAuthUI();
  ntSetRouting('valid');
}

// Randomise Budget — the two expressions ntGenerateNode uses for its own roll (nt.js:1730–1731),
// so a sandbox budget always lands in the range a real match would have dealt.
function ntAuthRandomiseBudget() {
  const slots = ntAuthMaxFirewall();
  ntInventory = {
    firewall: ntRandInt(Math.round(NT_FIREWALL_MIN_PCT * slots), Math.round(NT_FIREWALL_MAX_PCT * slots)),
    honeypot: ntRandInt(0, Math.min(NT_ALLOC_HONEYPOT_CAP, NT_HONEYPOT_CAP - ntNode.nativeHoneypots.length)),
  };
  ntSyncAuthUI();
}

// Deploy Node — the authored node takes exactly the place ntGenerateNode()'s output takes in a
// Standard match, so NT_GENERATE is reused verbatim and everything downstream (path validity,
// timeline simulation, playback, SER scoring, the summary) is untouched.
function ntDeployNode() {
  ntCycle              = 0;      // Debug is single-node: the cycle counter never advances
  ntCycleSERs          = [];
  ntTeamCycleSERs      = [];
  ntCycleLatencies     = [];
  ntOverallSER         = [];
  ntAllCycleTimelines  = [];
  ntAllCyclePlacements = [];
  ntAllCycleNodes      = [];
  ntResetCycleAccumulators(ntPlayerCount);
  // Sizing rule — LOAD-BEARING. [].every(Boolean) is true, so leaving either of these as []
  // would resolve the whole sandbox on the FIRST player's Finish while everyone else is still
  // building. Same shape as CJAR BUG-05 (logic-engine.md § MDLM Patterns).
  ntDebugFinished      = new Array(ntPlayerCount).fill(false);
  ntDebugAttemptCounts = new Array(ntPlayerCount).fill(0);
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({
      type: 'SYNC',
      payload: { action: 'NT_GENERATE', cycle: 0, node: ntNode, inventory: ntInventory, debug: true },
    });
    ntShowMdlmGate();
  } else {
    // Solo and PTP alike — solo is PTP with one admin, exactly as ntBeginCycle treats it.
    ntBeginPtpTurn();
  }
}

// ── The sandbox retry loop ────────────────────────────────────────────────────
// ntComputeTimeline_local() is a PURE function: same node + same placements ⇒ same timeline, on
// every device, every time. So an attempt resolves entirely locally and costs no packet at all.
// A player on attempt 11 has sent exactly as many as one on attempt 1: zero. The network is
// touched twice all round — the host publishing the node, and each player declaring Finish.
function ntDebugRunAttempt() {
  ntStopBuildTimer();
  ntDebugMyAttempt++;
  const timeline = ntComputeTimeline_local();
  const latency  = timeline ? timeline.latencyMs : 0;
  // HIGHER latency is BETTER in Net-Trace — the defender is slowing the intruder down, and the
  // longest delay each cycle scores 100% SER (ntResolveCyclePtp / ntResolveCycleMdlm both do
  // `lat / maxLat`). So "best" is the SLOWEST trace and an improvement is a POSITIVE delta.
  const prevBest = ntDebugBest ? ntDebugBest.latencyMs : null;
  const isBest   = prevBest === null || latency > prevBest;
  if (isBest) ntDebugBest = { latencyMs: latency, placements: ntMyPlacements.slice(), timeline };

  ntPlaybackTimeline = timeline;
  const panel = document.getElementById('nt-comparison-panel');
  if (panel) panel.style.display = 'none';     // sandbox: you watch your own trace, not a field
  // Reuse the playback screen's own Continue button rather than adding a second exit from it.
  ntPlaybackContinueCallback = () => ntDebugOpenRetry(latency, isBest, prevBest);
  ntShowPlayback();
}

function ntDebugOpenRetry(latency, isBest, prevBest) {
  const att = document.getElementById('nt-debug-retry-attempt');
  if (att) att.textContent = 'ATTEMPT ' + ntDebugMyAttempt;
  const sub = document.getElementById('nt-debug-retry-sub');
  if (sub) {
    sub.textContent = ntFmtMs(latency) + (
      prevBest === null ? ' · first trace'
      : isBest          ? ' · NEW BEST +' + ntFmtMs(latency - prevBest)
                        : ' · best remains ' + ntFmtMs(prevBest)
    );
  }
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'flex';
}

// Previous placements stay put — tweak-one-wall-and-re-run is the whole point of the mode.
// Clear All (build screen, Debug only) is the way to start an attempt from nothing.
function ntDebugRunAgain() {
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'none';
  ntStopPlayback();
  ntShowBuild();      // resets ntCommitted; ntMyPlacements deliberately survives
}

function ntDebugRosterRows() {
  return Array.from({ length: ntPlayerCount }, (_, i) => ({
    name:     ntPlayerNames[i] || ('ADMIN-' + (i + 1)),
    done:     !!ntDebugFinished[i],
    attempts: ntDebugAttemptCounts[i] || 0,
  }));
}

function ntDebugBroadcastRoster(authoring) {
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:    'NT_DEBUG_ROSTER',
      finished:  ntDebugFinished.slice(),
      attempts:  ntDebugAttemptCounts.slice(),
      authoring: !!authoring,
    },
  });
}

// Finish is FINAL — there is no un-finishing. Per mode:
//   Solo — straight through; no gate exists.
//   PTP  — sequential handover, so no simultaneous-finish problem exists at all.
//   MDLM — one slot in ntDebugFinished; the host resolves on .every(Boolean).
function ntDebugFinish() {
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'none';
  ntStopPlayback();
  const best   = ntDebugBest ? ntDebugBest.placements.slice() : [];
  const waiting = 'Testing complete — waiting for the other analysts…';

  if (window.syllyMultiplayerMode === 'client') {
    // Fire-and-forget, matching ntCommit's client path: a residual sync lock would silently
    // drop this ACTION and strand the round, and Finish is already one-shot by construction.
    // No latency field — the host recomputes it from bestPlacements (ntResolveCycleMdlm), so
    // sending one here would look like a client-supplied score the host trusts verbatim.
    mpSendEnvelope({
      type: 'ACTION',
      payload: {
        action:         'NT_DEBUG_FINISH',
        bestPlacements: best,
        attempts:       ntDebugMyAttempt,
      },
    });
    ntDebugFinished[mpMyPlayerIdx]      = true;   // local optimism, for this device's roster
    ntDebugAttemptCounts[mpMyPlayerIdx] = ntDebugMyAttempt;
    // Always show standby, even when this device's own optimism makes every seat read
    // finished locally. Over real Firebase the ACTION just sent is an async round-trip away
    // — the host has not necessarily resolved yet, let alone broadcast NT_PLAYBACK, so
    // skipping standby here would leave the last finisher frozen on the (stopped) playback
    // screen for that round-trip, with no message and no force-resolve net armed in Debug.
    // NT_PLAYBACK's own applier navigates unconditionally when it arrives, so it's safe to
    // show standby unconditionally too — the same screen.nt-standby → screen-nt-playback
    // sequence every other seat already goes through.
    ntShowStandby(waiting, ntDebugRosterRows());
    return;
  }

  if (window.syllyMultiplayerMode === 'host') {
    // Host marks its OWN slot directly and never self-sends — the dedup guard drops every
    // envelope where originId === syllyDeviceUid (NT's own BUG-05, and logic-engine.md
    // generalises it to any phase where the host is a submitting participant).
    ntDebugFinished[mpMyPlayerIdx]      = true;
    ntDebugAttemptCounts[mpMyPlayerIdx] = ntDebugMyAttempt;
    ntPtpPlacements[mpMyPlayerIdx]      = best;
    ntDebugBroadcastRoster(false);
    if (ntDebugFinished.every(Boolean)) ntResolveCycleMdlm(ntPtpPlacements.slice());
    else ntShowStandby(waiting, ntDebugRosterRows());
    return;
  }

  // Solo / PTP — the handover gate already serialises this.
  ntPtpTimelines[ntPtpTurn]       = ntDebugBest ? ntDebugBest.timeline : ntComputeTimeline_local();
  ntPtpPlacements[ntPtpTurn]      = best;
  ntDebugAttemptCounts[ntPtpTurn] = ntDebugMyAttempt;
  ntPtpTurn++;
  if (ntPtpTurn < ntPlayerCount) {
    ntMyPlacements = []; ntFirewallUsed = 0; ntHoneypotUsed = 0;
    ntDebugMyAttempt = 0;
    ntDebugBest      = null;
    ntBeginPtpTurn();
  } else {
    ntResolveCyclePtp();
    if (ntPlayerCount > 1) ntShowGatherGate();
    else ntShowComparisonPlayback();
  }
}

function ntFlashReject(cell) {
  playBoing();
  ntSetRouting('exception');
  if (cell) {
    cell.classList.remove('nt-cell-reject'); void cell.offsetWidth; cell.classList.add('nt-cell-reject');
  }
}

// Routing status. The build screen and the Node Editor each own their own element — only one
// screen is ever visible, so writing to both is always correct and never needs a mode branch.
function ntSetRouting(state) {
  const els = ['nt-routing-status', 'nt-auth-routing']
    .map(id => document.getElementById(id)).filter(Boolean);
  if (!els.length) return;
  const paint = (txt, cls) => els.forEach(el => { el.textContent = txt; el.className = cls; });
  if (state === 'exception') {
    ntRoutingState = 'exception';
    paint('ROUTING: EXCEPTION', 'text-red-500 whitespace-nowrap');
    if (ntRoutingTimer) clearTimeout(ntRoutingTimer);
    ntRoutingTimer = setTimeout(() => { ntRoutingTimer = null; ntSetRouting('valid'); }, 700);
  } else if (state === 'storage_insufficient') {
    paint('STORAGE: INSUFFICIENT', 'text-amber-400 whitespace-nowrap');
    if (ntRoutingTimer) clearTimeout(ntRoutingTimer);
    ntRoutingTimer = setTimeout(() => { ntRoutingTimer = null; ntSetRouting('valid'); }, 1200);
  } else {
    ntRoutingState = 'valid';
    paint('ROUTING: VALID', 'text-emerald-400 whitespace-nowrap');
  }
}

// Playback status — driven by slowSpans at the current sim position.
function ntSetStatus(simMs) {
  const el = document.getElementById('nt-playback-status');
  if (!el) return;
  const tl = ntPlaybackTimeline;
  const inSlow = tl && (tl.slowSpans || []).some(sp => simMs >= sp[0] && simMs < sp[1]);
  const pillBase = 'px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap flex-shrink-0';
  if (inSlow) {
    el.textContent = 'THROTTLED';
    el.className = pillBase + ' bg-red-900/60 text-red-400';
  } else {
    el.textContent = 'OPERATIONAL';
    el.className = pillBase + ' bg-emerald-900/60 text-emerald-400';
  }
}

// ── Hardening (build) timer ──────────────────────────────────────────────────
// Optional endTimestamp — when provided, derives remaining secs from wall-clock
// (MDLM sync: host computes endTimestamp, broadcasts it; all devices start from same anchor).
function ntStartBuildTimer(endTimestamp) {
  ntStopBuildTimer();
  const label = document.getElementById('nt-build-timer');
  if (ntEffectiveHardeningWin() === 0) {
    if (label) label.textContent = '∞';
    return;
  }
  const getSecs = () => endTimestamp
    ? Math.ceil((endTimestamp - Date.now()) / 1000)
    : ntEffectiveHardeningWin();
  let secs = getSecs();
  if (label) label.textContent = formatTime(Math.max(0, secs));
  ntBuildTimer = setInterval(() => {
    secs = endTimestamp ? getSecs() : secs - 1;
    if (label) label.textContent = formatTime(Math.max(0, secs));
    if (secs <= 10 && secs > 0) playTick();
    if (secs <= 0) { ntStopBuildTimer(); playAlarm(); ntCommit(); }
  }, 1000);
  // Host safety net: a few seconds after the hardening window closes, force-resolve
  // even if a commit packet was lost — guarantees the round can never hang on the
  // build screen ("waiting for team…" forever). No-op if everyone committed in time.
  if (window.syllyMultiplayerMode === 'host' && endTimestamp) {
    ntClearResolveGuard();
    ntResolveGuard = setTimeout(ntForceResolveCycle, Math.max(0, endTimestamp - Date.now()) + 4000);
  }
}
function ntStopBuildTimer() {
  if (ntBuildTimer) { clearInterval(ntBuildTimer); ntBuildTimer = null; }
}
function ntClearResolveGuard() {
  if (ntResolveGuard) { clearTimeout(ntResolveGuard); ntResolveGuard = null; }
}
// Host-only fallback: resolve the cycle with whatever placements have arrived, filling
// any missing player with an empty (un-hardened) leg so the BFS still has valid input.
function ntForceResolveCycle() {
  ntResolveGuard = null;
  if (window.syllyMultiplayerMode !== 'host' || ntCycleResolved) return;
  for (let i = 0; i < ntPlayerCount; i++) { if (!ntPtpPlacements[i]) ntPtpPlacements[i] = []; }
  ntResolveCycleMdlm(ntPtpPlacements.slice());
}

// ── Commit ─────────────────────────────────────────────────────────────────
function ntCommit() {
  if (ntDebugMode) { ntDebugRunAttempt(); return; }
  if (ntCommitted) return;        // one commit per build phase (timer expiry + manual tap both call this)
  ntCommitted = true;
  ntStopBuildTimer();
  // Lock the grid so it can't be edited after submitting.
  const grid = document.getElementById('nt-build-grid');
  if (grid) grid.style.pointerEvents = 'none';
  if (window.syllyMultiplayerMode === 'host') {
    // Host marks own slot directly — dedup guard drops self-sent ACTIONs
    ntCommitReadyCheck[mpMyPlayerIdx] = true;
    ntPtpPlacements[mpMyPlayerIdx]    = ntMyPlacements.slice();
    if (ntCommitReadyCheck.every(Boolean)) {
      ntResolveCycleMdlm(ntPtpPlacements.slice());
    } else {
      const btn = document.getElementById('btn-nt-commit');
      if (btn) { btn.textContent = 'Waiting for team…'; btn.disabled = true; }
    }
  } else if (window.syllyMultiplayerMode === 'client') {
    // Client sends placements to host. Fire-and-forget readyCheck submit — NO mpLockSync
    // (a residual lock would otherwise silently drop this ACTION, stranding the round);
    // the ntCommitted guard prevents a double-send, and the host's resolve-guard is the
    // backstop if the packet is ever lost.
    const btn = document.getElementById('btn-nt-commit');
    if (btn) { btn.textContent = 'Submitted…'; btn.disabled = true; }
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_COMMIT', placements: ntMyPlacements.slice() } });
  } else {
    // Single-device — solo is PTP with one admin, so this is the only path either way.
    ntCommitPtp();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBACK CANVAS RENDERER  (game-local RAF — §16)
// ═══════════════════════════════════════════════════════════════════════════

function ntStopPlayback() {
  if (ntRafHandle) { cancelAnimationFrame(ntRafHandle); ntRafHandle = null; }
}

// Playback palette
const NT_TRAIL_BLUE   = '#3b82f6';  // normal trail (blue, fades by length)
const NT_TRAIL_SLOW   = '#8b5cf6';  // slowed trail = Fuchsia + Blue (violet)
const NT_PING_CORE    = '#a5f3fc';  // signal-ping core (cyan-white)
const NT_PING_SLOW    = '#f43f9d';  // slowed core = Red + Fuchsia (hot pink)

// All playback rendering is in TILE units (px = canvas / n). A 2×2 block is one
// (2·px) rect; the polyline + honeypot centres are continuous tile coords (× px directly).
// Draw ONE relay leg for the cluster bridge. Ports are chained at node-gen time so a
// leg's egress row equals the next leg's ingress row; rendered edge-to-edge the legs
// connect only through that egress▸ingress channel. The rest of each shared (seam) edge
// is walled off in bad-sector grey so it's clear you can't cross elsewhere.
// Self-contained — never reads ntNode/ntMyPlacements. opts = { wallLeft, wallRight }.
function ntDrawLegCanvas(canvas, node, cell, opts) {
  if (!canvas || !node || !node.n) return;
  opts = opts || {};
  const c = cell || 8;
  const n = node.n;
  canvas.width  = n * c;
  canvas.height = n * c;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = NT_COLOR_BASE;
  ctx.fillRect(0, 0, n * c, n * c);
  // Per-TILE gridlines (not per-2×2-block) so each square reads at its real scale —
  // matching the playback screen's own grid (ntRenderFrame). The old block-only spacing
  // made 2×2 obstacles look like an ambiguous size with nothing to anchor scale against.
  // Lighter than a per-block grid would need (2× the line count) to stay unobtrusive.
  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.lineWidth = 1;
  for (let li = 0; li <= n; li++) {
    ctx.beginPath(); ctx.moveTo(li * c + 0.5, 0);     ctx.lineTo(li * c + 0.5, n * c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, li * c + 0.5);     ctx.lineTo(n * c, li * c + 0.5); ctx.stroke();
  }
  const fill = (ax, ay, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ax * c + 1, ay * c + 1, NT_BLOCK * c - 2, NT_BLOCK * c - 2);
  };
  (node.badSectors      || []).forEach(p => fill(p.ax, p.ay, NT_COLOR_BAD_SECTOR));
  (node.nativeHoneypots || []).forEach(p => fill(p.ax, p.ay, NT_COLOR_NATIVE_HONEYPOT));
  // Seam walls on shared edges — full height except the one connecting port row.
  // Deliberately NOT NT_COLOR_BAD_SECTOR: that colour is a hazard's colour, and on this
  // flat (no-glow) preview a same-colour wall reads as just another obstacle square
  // rather than a team-connection boundary. Lighter slate keeps the neutral/structural
  // palette without competing with the semantic ingress/egress/native-honeypot colours.
  const wallT = Math.max(2, Math.round(c * 0.5));
  ctx.fillStyle = '#64748b'; // slate-500 — lighter than bad-sector's slate-700
  if (opts.wallLeft && node.ingress) {
    for (let row = 0; row < n; row++) { if (row === node.ingress.idx) continue; ctx.fillRect(0, row * c, wallT, c); }
  }
  if (opts.wallRight && node.egress) {
    for (let row = 0; row < n; row++) { if (row === node.egress.idx) continue; ctx.fillRect(n * c - wallT, row * c, wallT, c); }
  }
  // Port channel bars (drawn over the wall gap): green ingress, amber egress.
  const t = Math.max(2, Math.round(c * 0.5));
  if (node.ingress) { ctx.fillStyle = '#34d399'; ctx.fillRect(0, node.ingress.idx * c, t, c); }
  if (node.egress)  { ctx.fillStyle = '#f59e0b'; ctx.fillRect(n * c - t, node.egress.idx * c, t, c); }
}

// Build a team's full bridge into `container`: a horizontal row of (name + maze)
// columns, edge-to-edge so the chained ports connect visually. `members` = global
// player indices in leg order; `cell` = px per tile (small inline, large for overlay).
//
// opts (all optional) turn the same strip into the allocation picker:
//   footer(legIdx, pIdx) → HTML string rendered under a leg (live FW/HP counts)
//   onTap(legIdx)        → click handler on a leg column (deposit)
//   onHold(legIdx)       → long-press handler on a leg column (withdraw)
// Read-only callers (the enlarged preview overlay) pass none of them and get the
// original display-only strip. Deliberately ONE builder: the allocation picker and
// the preview overlay must never drift into two different pictures of the bridge.
function ntBuildBridgeInto(container, members, cell, opts) {
  if (!container) return;
  opts = opts || {};
  container.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'flex items-end w-max mx-auto';
  const teamSize = members.length;
  members.forEach((pIdx, legIdx) => {
    const col = document.createElement('div');
    col.className = 'flex flex-col items-center' + (opts.onTap ? ' cursor-pointer' : '');
    const isMe = pIdx === mpMyPlayerIdx;
    const name = ntPlayerNames[pIdx] || ('ADMIN-' + (pIdx + 1));
    const label = document.createElement('p');
    // On the PAGE's white background, not the canvas below it — col has no bg of its
    // own. text-stone-300 read as near-invisible for a non-"you" leg (D28 fix missed
    // this sibling of the nav label; same bug, same cause: wrong assumed backdrop).
    label.className = 'text-[10px] font-semibold mb-1 whitespace-nowrap ' + (isMe ? 'text-emerald-400' : 'text-stone-500');
    label.textContent = name + (isMe ? ' (you)' : '');
    const cv = document.createElement('canvas');
    cv.className = 'bg-slate-950';
    cv.style.imageRendering = 'pixelated';
    col.appendChild(label);
    col.appendChild(cv);
    if (opts.footer) {
      const ft = document.createElement('div');
      ft.className = 'mt-1 w-full';
      ft.innerHTML = opts.footer(legIdx, pIdx);
      col.appendChild(ft);
    }
    row.appendChild(col);
    const node = ntTeamNodes[pIdx];
    if (node) ntDrawLegCanvas(cv, node, cell, { wallLeft: legIdx > 0, wallRight: legIdx < teamSize - 1 });
    if (opts.onTap)  col.addEventListener('click', () => opts.onTap(legIdx));
    // Long-press to withdraw — a bonus affordance, never the primary one (the Undo
    // button is the discoverable path). bindCardHold is the engine.js global.
    if (opts.onHold && typeof bindCardHold === 'function') bindCardHold(col, () => opts.onHold(legIdx));
  });
  container.appendChild(row);
}

// Open the enlarged bridge overlay (tap-to-close). `members` in leg order.
function ntOpenBridgePreview(members) {
  const ov   = document.getElementById('nt-bridge-preview-overlay');
  const host = document.getElementById('nt-bridge-preview-host');
  if (!ov || !host || !members || !members.length) return;
  ntBuildBridgeInto(host, members, 16);
  ov.onclick = () => { ov.style.display = 'none'; };
  ov.style.display = 'flex';
  playPillClick();
}

function ntDrawMaze(ctx, px) {
  const n = ntNode.n;
  const fill = (ax, ay, color, glow) => {
    ctx.save();
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
    ctx.fillStyle = color;
    ctx.fillRect(ax * px + 1, ay * px + 1, NT_BLOCK * px - 2, NT_BLOCK * px - 2);
    ctx.restore();
  };
  (ntNode.badSectors || []).forEach(c => fill(c.ax, c.ay, NT_COLOR_BAD_SECTOR, false));
  (ntNode.nativeHoneypots || []).forEach(c => fill(c.ax, c.ay, NT_COLOR_NATIVE_HONEYPOT, false)); // muted structural — no glow
  ntMyPlacements.forEach(p => fill(p.ax, p.ay, p.type === 'honeypot' ? NT_COLOR_HONEYPOT : NT_COLOR_FIREWALL, true));
  // Static AoE threat rings are now drawn by ntRenderFrame (suppressed during active cooldown disc).
  // Port bars — straddling the border line; ingress green+inward arrow, egress grey+outward.
  const canvas = ctx.canvas;
  const t = Math.max(4, px * 0.4);
  const BARROWS = { top: { in: '▼', out: '▲' }, bottom: { in: '▲', out: '▼' },
                    left: { in: '▶', out: '◀' }, right:  { in: '◀', out: '▶' } };
  const bar = (port, color, inward) => {
    ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    let cx, cy;
    if (port.edge === 'top')         { ctx.fillRect(port.idx * px, -t / 2, px, t);                       cx = port.idx * px + px / 2; cy = 0; }
    else if (port.edge === 'bottom') { ctx.fillRect(port.idx * px, canvas.height - t / 2, px, t);         cx = port.idx * px + px / 2; cy = canvas.height; }
    else if (port.edge === 'left')   { ctx.fillRect(-t / 2, port.idx * px, t, px);                        cx = 0;            cy = port.idx * px + px / 2; }
    else                             { ctx.fillRect(canvas.width - t / 2, port.idx * px, t, px);          cx = canvas.width; cy = port.idx * px + px / 2; }
    // Tiny direction arrow centred on the bar
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(5, Math.round(t * 0.85))}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(BARROWS[port.edge][inward ? 'in' : 'out'], cx, cy);
    ctx.restore();
  };
  bar(ntNode.ingress, '#34d399', true);            // INGRESS — green, inward arrow
  bar(ntNode.egress,  NT_COLOR_BAD_SECTOR, false); // EGRESS  — bad-sector grey, outward arrow
}

// Trajectory position at sim-ms (binary search over timeline samples).
function ntSampleAt(simMs) {
  const s = ntPlaybackTimeline && ntPlaybackTimeline.samples;
  if (!s || !s.length) return null;
  if (simMs <= s[0].t) return { x: s[0].x, y: s[0].y };
  if (simMs >= s[s.length - 1].t) { const e = s[s.length - 1]; return { x: e.x, y: e.y }; }
  let lo = 0, hi = s.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; (s[mid].t <= simMs ? lo = mid : hi = mid); }
  const a = s[lo], b = s[hi], f = (simMs - a.t) / (b.t - a.t || 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function ntRenderFrame(simMs, updateScrubber) {
  const canvas = document.getElementById('nt-playback-canvas');
  if (!canvas || !ntNode) return;
  const ctx = canvas.getContext('2d');
  const px = canvas.width / ntNode.n;

  ctx.fillStyle = NT_COLOR_BASE;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Faint structural grid overlay — gives tile-scale reference without competing with the trail.
  ctx.save();
  ctx.strokeStyle = 'rgba(52,211,153,0.15)';
  ctx.lineWidth = 0.5;
  for (let li = 0; li <= ntNode.n; li++) {
    ctx.beginPath(); ctx.moveTo(li * px, 0); ctx.lineTo(li * px, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, li * px); ctx.lineTo(canvas.width, li * px); ctx.stroke();
  }
  ctx.restore();
  ntDrawMaze(ctx, px);

  const tl = ntPlaybackTimeline;
  if (tl && tl.samples && tl.samples.length) {
    const head = ntSampleAt(simMs);
    const isSlowAt = (t) => (tl.slowSpans || []).some(sp => t >= sp[0] && t < sp[1]);
    // Track which honeypots are currently within cooldown — suppresses static ring on those cells.
    const activeFires = new Set();
    (tl.fires || []).forEach(f => {
      const age = simMs - f.atMs;
      if (age >= 0 && age < NT_HONEYPOT_COOLDOWN) activeFires.add(`${f.x},${f.y}`);
    });
    // Static AoE threat ring — faint always-on indicator; hidden while draining disc is active.
    ntHoneypotCentres(ntNode, ntMyPlacements).forEach(h => {
      if (activeFires.has(`${h.x},${h.y}`)) return;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = NT_COLOR_HONEYPOT; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(h.x * px, h.y * px, NT_HONEYPOT_RADIUS * px, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });
    // Traversed trail — smooth tail→head alpha gradient; colour by slow state at each segment.
    // Batched in groups of FADE_BATCH so lineJoin='round' handles corner smoothing within each batch.
    const pts = [];
    for (const s of tl.samples) { if (s.t > simMs) break; pts.push(s); }
    if (head) pts.push({ t: simMs, x: head.x, y: head.y });
    const count = pts.length;
    if (count > 1) {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, px * 0.42);
      // Single-path blue trail with canvas linear gradient fade (tail→head) — no batch-boundary dots.
      const t0 = pts[0], t1 = pts[count - 1];
      const grad = ctx.createLinearGradient(t0.x * px, t0.y * px, t1.x * px, t1.y * px);
      grad.addColorStop(0, 'rgba(59,130,246,0.08)');
      grad.addColorStop(1, 'rgba(59,130,246,0.90)');
      ctx.strokeStyle = grad;
      ctx.shadowColor = NT_TRAIL_BLUE; ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(t0.x * px, t0.y * px);
      for (let j = 1; j < count; j++) ctx.lineTo(pts[j].x * px, pts[j].y * px);
      ctx.stroke();
      // Overlay slowed segments in violet — all subpaths collected into one stroke call.
      if (tl.slowSpans && tl.slowSpans.length) {
        ctx.strokeStyle = NT_TRAIL_SLOW; ctx.globalAlpha = 0.80;
        ctx.shadowColor = NT_TRAIL_SLOW; ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let j = 1; j < count; j++) {
          if (!isSlowAt(pts[j].t)) continue;
          if (j === 1 || !isSlowAt(pts[j - 1].t)) ctx.moveTo(pts[j - 1].x * px, pts[j - 1].y * px);
          ctx.lineTo(pts[j].x * px, pts[j].y * px);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draining AoE disc + clock-wipe — both animate for the full cooldown window (~7s real at 5×).
    (tl.fires || []).forEach(f => {
      const age = simMs - f.atMs;
      if (age < 0 || age >= NT_HONEYPOT_COOLDOWN) return;
      const progress = age / NT_HONEYPOT_COOLDOWN; // 0.0 = just triggered → 1.0 = recharged
      const cx = f.x * px, cy = f.y * px;
      const half = px; // 1 tile in canvas-px; the 2×2 block half-size = px

      // AoE disc — filled fuchsia circle that starts at full threat radius and drains to zero.
      const discR = NT_HONEYPOT_RADIUS * px * (1 - progress);
      if (discR > px * 0.3) {
        ctx.save();
        ctx.globalAlpha = 0.11 * (1 - progress * 0.6); // fades out gently as disc shrinks
        ctx.fillStyle = NT_COLOR_HONEYPOT;
        ctx.beginPath(); ctx.arc(cx, cy, discR, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.40 * (1 - progress * 0.5); // ring outline — more visible
        ctx.strokeStyle = NT_COLOR_HONEYPOT; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, discR, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Clock-wipe on tile — fuchsia wedge fills from 12 o'clock as the trap recharges.
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - half, cy - half, 2 * half, 2 * half); ctx.clip();
      // Dark dead background — tile goes offline
      ctx.globalAlpha = 0.88; ctx.fillStyle = NT_COLOR_BASE;
      ctx.fillRect(cx - half, cy - half, 2 * half, 2 * half);
      // Clockwise fuchsia wedge — refills from 12 o'clock as cooldown expires
      if (progress > 0.01) {
        ctx.globalAlpha = 0.85; ctx.fillStyle = NT_COLOR_HONEYPOT;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, half * 1.5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.closePath(); ctx.fill();
      }
      // Border ring — tile boundary indicator during dark phase
      ctx.globalAlpha = 0.45; ctx.strokeStyle = NT_COLOR_HONEYPOT; ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - half, cy - half, 2 * half, 2 * half);
      ctx.restore();
      // White flash on trigger frame
      if (age < 80) {
        ctx.save(); ctx.globalAlpha = 0.8 - (age / 80) * 0.7; ctx.fillStyle = '#fff';
        ctx.fillRect(cx - half, cy - half, 2 * half, 2 * half); ctx.restore();
      }
    });

    // Signal-ping head — layered glow for vivid focus; pulse ring marks the hitbox boundary.
    if (head) {
      const slowed = isSlowAt(simMs);
      const core = slowed ? NT_PING_SLOW : NT_PING_CORE;
      const HX = head.x * px, HY = head.y * px;
      const pulse = 0.5 + 0.5 * Math.sin(simMs / 120);     // 0..1 ping cadence
      const coreR = Math.max(3, px * 0.26);
      const ringR = Math.max(5, NT_RUNNER_HALF * px) * (0.6 + 0.4 * pulse);
      // Pulse ring — marks hitbox boundary; fades in/out with ping cadence
      ctx.save();
      ctx.globalAlpha = 0.30 + 0.45 * (1 - pulse);
      ctx.strokeStyle = core; ctx.lineWidth = 1.5; ctx.shadowColor = core; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(HX, HY, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // Layered glow core: outer halo → mid-bloom → solid centre
      for (const [blur, alpha] of [[28, 0.28], [14, 0.60], [5, 1.0]]) {
        ctx.save();
        ctx.globalAlpha = alpha; ctx.shadowColor = core; ctx.shadowBlur = blur; ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(HX, HY, coreR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  const lat = document.getElementById('nt-playback-latency');
  if (lat) lat.textContent = ntFmtMs(simMs);
  ntSetStatus(simMs);
  if (updateScrubber) {
    const sc = document.getElementById('nt-playback-scrubber');
    if (sc && tl && tl.latencyMs > 0) sc.value = Math.round((simMs / tl.latencyMs) * 100);
  }
}

function ntStartPlayback() {
  const canvas = document.getElementById('nt-playback-canvas');
  if (!canvas || !ntPlaybackTimeline) return;
  const size = canvas.clientWidth || 320;
  canvas.width = size;
  canvas.height = size;
  ntPlaybackScrubMs = null;
  ntPlaybackPaused = false;
  ntPlaybackPhase = 'tracing';
  ntPlaybackStartTs = performance.now();
  ntStopPlayback();
  // Module-scope ref so ntTogglePlayback / ntResumeAfterScrub can restart the RAF.
  ntPlaybackLoopFn = () => {
    const tl = ntPlaybackTimeline;
    if (!tl) { ntRafHandle = null; return; }
    if (ntPlaybackScrubMs !== null) {
      // Scrub/paused hold — just keep rendering the frozen frame.
      ntRenderFrame(ntPlaybackScrubMs, false);
      ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
      return;
    }
    const simMs = (performance.now() - ntPlaybackStartTs) * NT_PLAYBACK_SPEED;
    if (simMs >= tl.latencyMs) {
      ntRenderFrame(tl.latencyMs, true);
      if (ntPlaybackPhase !== 'ended') {
        ntPlaybackPhase = 'ended';
        playSuccess();
        const pb = document.getElementById('btn-nt-playback-pause');
        if (pb) { pb.textContent = '▶'; pb.style.opacity = '0.45'; } // ▶ dimmed = at end
      }
      ntRafHandle = null;
      return;
    }
    ntRenderFrame(simMs, true);
    ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
  };
  const pb = document.getElementById('btn-nt-playback-pause');
  if (pb) { pb.textContent = '⏸'; pb.style.opacity = '1'; } // ⏸ = playing
  ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
}

function ntTogglePlayback() {
  const tl = ntPlaybackTimeline;
  if (!tl) return;
  const pb = document.getElementById('btn-nt-playback-pause');
  if (!ntRafHandle || ntPlaybackPaused) {
    // Play / resume
    ntPlaybackPaused = false;
    const resumeMs = ntPlaybackScrubMs !== null ? ntPlaybackScrubMs : 0;
    if (resumeMs >= tl.latencyMs) {
      // Was at end — restart from beginning
      ntPlaybackStartTs = performance.now();
      ntPlaybackScrubMs = null;
    } else {
      ntPlaybackStartTs = performance.now() - resumeMs / NT_PLAYBACK_SPEED;
      ntPlaybackScrubMs = null;
    }
    ntPlaybackPhase = 'tracing';
    if (pb) { pb.textContent = '⏸'; pb.style.opacity = '1'; } // ⏸
    if (!ntRafHandle && ntPlaybackLoopFn) ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
  } else {
    // Pause — capture current sim position, cancel RAF to save power
    ntPlaybackPaused = true;
    const simMs = (performance.now() - ntPlaybackStartTs) * NT_PLAYBACK_SPEED;
    ntPlaybackScrubMs = Math.min(simMs, tl.latencyMs);
    if (pb) { pb.textContent = '▶'; pb.style.opacity = '1'; } // ▶
    ntStopPlayback();
  }
}

function ntResumeAfterScrub() {
  if (ntPlaybackPaused) return; // user manually paused — stay frozen
  const tl = ntPlaybackTimeline;
  if (!tl) return;
  const resumeMs = ntPlaybackScrubMs !== null ? ntPlaybackScrubMs : 0;
  if (resumeMs >= tl.latencyMs) return; // scrubbed to end — let RAF re-enter on next play tap
  ntPlaybackStartTs = performance.now() - resumeMs / NT_PLAYBACK_SPEED;
  ntPlaybackScrubMs = null;
  ntPlaybackPhase = 'tracing';
  if (!ntRafHandle && ntPlaybackLoopFn) ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
}

// ═══════════════════════════════════════════════════════════════════════════
// DNP CONTINUOUS-BRIDGE PLAYBACK  (team-sequence journey)
// ═══════════════════════════════════════════════════════════════════════════

// Build a team's journey: its legs in order, each leg's timeline offset so the packet
// flows ingress → leg 1 → leg 2 → … → egress as one continuous timeline. Timelines are
// normalised (Firebase strips empty arrays) so the renderer never hits undefined.
function ntBuildJourney(team) {
  const members = ntTeamIdx.reduce((acc, t, i) => { if (t === team) acc.push(i); return acc; }, []);
  let offset = 0;
  const legs = members.map((pIdx, legIdx) => {
    const raw = ntPtpTimelines[pIdx] || {};
    const timeline = {
      samples:   raw.samples   || [],
      fires:     raw.fires     || [],
      slowSpans: raw.slowSpans || [],
      latencyMs: raw.latencyMs || 0,
    };
    const leg = {
      pIdx, legIdx,
      name:       ntPlayerNames[pIdx] || ('ADMIN-' + (pIdx + 1)),
      node:       ntTeamNodes[pIdx],
      timeline,
      placements: ntPtpPlacements[pIdx] || [],
      offset,
      latency:    timeline.latencyMs,
    };
    offset += leg.latency;
    return leg;
  });
  return { team, legs, total: offset };
}

// Which leg is active at journey time simMs (skips zero-latency legs; clamps to last).
function ntJourneyLegAt(journey, simMs) {
  const legs = journey.legs;
  for (let i = 0; i < legs.length; i++) {
    if (simMs < legs[i].offset + legs[i].latency) return i;
  }
  return legs.length - 1;
}

// Enter DNP playback: build my team's journey, render tabs + segmented scrubber, play.
function ntShowJourneyPlayback() {
  ntPbJourney   = ntBuildJourney(ntPbTeam);
  ntPbActiveLeg = -1;
  // Hide the per-player comparison panel; show the team tabs + segmented track.
  const panel = document.getElementById('nt-comparison-panel');
  if (panel) panel.style.display = 'none';
  const segWrap = document.getElementById('nt-journey-segwrap');
  if (segWrap) segWrap.style.display = 'block';
  ntRenderJourneyTabs();
  ntRenderJourneySegments();
  showScreen('screen-nt-playback');
  ntStartJourneyPlayback();
}

// The journey RAF loop — advances one continuous sim clock across all legs.
function ntStartJourneyPlayback() {
  const canvas = document.getElementById('nt-playback-canvas');
  if (!canvas || !ntPbJourney) return;
  const size = canvas.clientWidth || 320;
  canvas.width = size; canvas.height = size;
  ntPlaybackScrubMs = null;
  ntPlaybackPaused  = false;
  ntPlaybackPhase   = 'tracing';
  ntPlaybackStartTs = performance.now();
  ntStopPlayback();
  const pb = document.getElementById('btn-nt-playback-pause');
  if (ntPbJourney.total <= 0) {
    // Nothing to animate (all legs un-hardened) — render a static first leg.
    ntPbActiveLeg = -1;
    ntRenderJourneyFrame(0);
    if (pb) { pb.textContent = '▶'; pb.style.opacity = '0.45'; }
    return;
  }
  ntPlaybackLoopFn = () => {
    const j = ntPbJourney;
    if (!j) { ntRafHandle = null; return; }
    if (ntPlaybackScrubMs !== null) {           // scrub/pause hold — keep the frozen frame
      ntRenderJourneyFrame(ntPlaybackScrubMs);
      ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
      return;
    }
    const simMs = (performance.now() - ntPlaybackStartTs) * NT_PLAYBACK_SPEED;
    if (simMs >= j.total) {
      ntRenderJourneyFrame(j.total);
      if (ntPlaybackPhase !== 'ended') {
        ntPlaybackPhase = 'ended';
        playSuccess();
        if (pb) { pb.textContent = '▶'; pb.style.opacity = '0.45'; }
      }
      ntRafHandle = null;
      return;
    }
    ntRenderJourneyFrame(simMs);
    ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
  };
  if (pb) { pb.textContent = '⏸'; pb.style.opacity = '1'; }
  ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
}

// Render one journey frame: point the renderer globals at the active leg, draw it at
// local time, then drive the cumulative latency label + journey scrubber.
function ntRenderJourneyFrame(simMs) {
  const j = ntPbJourney;
  if (!j || !j.legs.length) return;
  const legIdx = ntJourneyLegAt(j, simMs);
  const leg    = j.legs[legIdx];
  if (legIdx !== ntPbActiveLeg) {       // boundary cross — slide the next node in
    const dir = legIdx > ntPbActiveLeg ? 1 : -1;
    ntPbActiveLeg = legIdx;
    ntJourneySlide(dir);
  }
  // Point the shared renderer at the active leg (ntRenderFrame/ntSampleAt/ntSetStatus read these).
  ntNode             = leg.node;
  ntPlaybackTimeline = leg.timeline;
  ntMyPlacements     = leg.placements;
  ntRenderFrame(simMs - leg.offset, false);
  // Top bar: per-leg node id + name; cumulative journey latency.
  const nm = document.getElementById('nt-playback-node-name');
  if (nm) nm.textContent = `NT-NODE-${String(legIdx + 1).padStart(2, '0')} · ${leg.name}`;
  const lat = document.getElementById('nt-playback-latency');
  if (lat) lat.textContent = ntFmtMs(simMs);
  const sc = document.getElementById('nt-playback-scrubber');
  if (sc && j.total > 0) sc.value = Math.round((simMs / j.total) * 100);
}

// Quick horizontal slide-in on the canvas when the active leg changes (viewport-slider
// feel). `dir` is +1 travelling forward along the bridge and −1 when the scrubber is
// dragged back: forward, the next leg is to your right and so enters from the right;
// backward it must enter from the left, or reversing reads as continuing forward.
// (The canvas is clipped by its parent's overflow-hidden — without that it slides
// visibly outside the terminal frame.)
function ntJourneySlide(dir) {
  const cv = document.getElementById('nt-playback-canvas');
  if (!cv) return;
  cv.style.transition = 'none';
  cv.style.transform  = 'translateX(' + (dir < 0 ? '-16%' : '16%') + ')';
  cv.style.opacity    = '0.35';
  void cv.offsetWidth; // force reflow so the transition runs
  cv.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
  cv.style.transform  = 'translateX(0)';
  cv.style.opacity    = '1';
}

// Macro team tabs — watch your team's bridge or the opponent's.
function ntRenderJourneyTabs() {
  const tabs = document.getElementById('nt-journey-tabs');
  if (!tabs) return;
  tabs.style.display = 'flex';
  const myTeam = ntTeamIdx[mpMyPlayerIdx];
  const label  = t => (ntTeamNames[t] || ('TEAM ' + (t === 0 ? 'A' : 'B'))).toUpperCase();
  tabs.innerHTML = [0, 1].map(t => {
    const active = t === ntPbTeam;
    const mine   = t === myTeam;
    return `<button data-team="${t}" class="nt-journey-tab flex-1 min-h-9 rounded-lg font-mono text-[11px] font-semibold truncate px-1 transition-colors ${active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-stone-400'}">${label(t)}${mine ? ' ◂YOU' : ''}</button>`;
  }).join('');
  tabs.querySelectorAll('.nt-journey-tab').forEach(b => {
    b.addEventListener('click', () => ntSwitchJourneyTeam(parseInt(b.dataset.team, 10)));
  });
}

function ntSwitchJourneyTeam(team) {
  if (team === ntPbTeam) return;
  ntPbTeam = team;
  playPillClick();
  ntStopPlayback();
  ntPbJourney   = ntBuildJourney(team);
  ntPbActiveLeg = -1;
  ntRenderJourneyTabs();
  ntRenderJourneySegments();
  ntStartJourneyPlayback(); // restart from ingress for the newly-selected team
}

// Segmented scrubber track — one labelled section per leg, width ∝ that leg's latency.
function ntRenderJourneySegments() {
  const seg = document.getElementById('nt-journey-segments');
  if (!seg) return;
  const j = ntPbJourney;
  if (!j || j.total <= 0) { seg.innerHTML = '<div class="flex-1"></div>'; return; }
  seg.innerHTML = j.legs.map((l, i) => {
    const w = (l.latency / j.total) * 100;
    if (w <= 0) return '';
    const bg = i % 2 === 0 ? 'bg-emerald-900/40' : 'bg-slate-700/40';
    return `<div class="h-full flex items-center justify-center overflow-hidden ${bg}" style="width:${w}%"><span class="text-[8px] font-mono text-stone-400 truncate px-1">${l.name}</span></div>`;
  }).join('');
}

// Journey-aware pause/resume (mirrors ntTogglePlayback but against the journey total).
function ntToggleJourneyPlayback() {
  const j = ntPbJourney;
  if (!j || j.total <= 0) return;
  const pb = document.getElementById('btn-nt-playback-pause');
  if (!ntRafHandle || ntPlaybackPaused) {
    ntPlaybackPaused = false;
    const resumeMs = ntPlaybackScrubMs !== null ? ntPlaybackScrubMs : 0;
    ntPlaybackStartTs = (resumeMs >= j.total)
      ? performance.now()                                   // was at end → restart
      : performance.now() - resumeMs / NT_PLAYBACK_SPEED;
    ntPlaybackScrubMs = null;
    ntPlaybackPhase   = 'tracing';
    if (pb) { pb.textContent = '⏸'; pb.style.opacity = '1'; }
    if (!ntRafHandle && ntPlaybackLoopFn) ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
  } else {
    ntPlaybackPaused = true;
    const simMs = (performance.now() - ntPlaybackStartTs) * NT_PLAYBACK_SPEED;
    ntPlaybackScrubMs = Math.min(simMs, j.total);
    if (pb) { pb.textContent = '▶'; pb.style.opacity = '1'; }
    ntStopPlayback();
  }
}

function ntResumeJourneyAfterScrub() {
  if (ntPlaybackPaused) return;
  const j = ntPbJourney;
  if (!j || j.total <= 0) return;
  const resumeMs = ntPlaybackScrubMs !== null ? ntPlaybackScrubMs : 0;
  if (resumeMs >= j.total) return;
  ntPlaybackStartTs = performance.now() - resumeMs / NT_PLAYBACK_SPEED;
  ntPlaybackScrubMs = null;
  ntPlaybackPhase   = 'tracing';
  if (!ntRafHandle && ntPlaybackLoopFn) ntRafHandle = requestAnimationFrame(ntPlaybackLoopFn);
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLAYER  (§11 packet table — Phase C Standard / Phase D DNP)
// ═══════════════════════════════════════════════════════════════════════════

// Host-authoritative cycle resolution for MDLM: runs BFS for every player's
// submitted placements, computes SERs, persists log arrays, broadcasts NT_PLAYBACK.
function ntResolveCycleMdlm(allPlacements) {
  if (ntCycleResolved) return;   // guard: last-commit and the resolve-fallback can both fire
  ntCycleResolved = true;
  ntClearResolveGuard();
  // In DNP mode each player has their own relay-leg node — swap node + placements per player.
  const savedNode         = ntNode;
  const savedPlacements   = ntMyPlacements;

  const timelines = allPlacements.map((placements, idx) => {
    if (ntIsDNP() && ntTeamNodes[idx]) ntNode = ntTeamNodes[idx];
    ntMyPlacements = placements || [];
    const tl = ntComputeTimeline_local();
    ntMyPlacements = savedPlacements;
    ntNode = savedNode;
    return tl;
  });

  ntPtpTimelines  = timelines.slice();
  ntPtpPlacements = allPlacements.map(p => p.slice());

  const latencies = timelines.map(tl => (tl ? tl.latencyMs : 0));
  ntCycleLatencies[ntCycle] = latencies.slice();

  let sers;
  if (ntIsDNP()) {
    // Cluster Ceiling scoring: ceiling per leg = max(teamA_leg_n_latency, teamB_leg_n_latency)
    const teamMembers = [0, 1].map(team =>
      ntTeamIdx.reduce((acc, t, i) => { if (t === team) acc.push(i); return acc; }, [])
    );
    const legCount = Math.min(teamMembers[0].length, teamMembers[1].length);
    let clusterCeiling = 0;
    for (let n = 0; n < legCount; n++) {
      const latA = latencies[teamMembers[0][n]] || 0;
      const latB = latencies[teamMembers[1][n]] || 0;
      clusterCeiling += Math.max(latA, latB);
    }
    if (clusterCeiling === 0) clusterCeiling = 1;

    // Per-player SER = latency / clusterCeiling × 100 (contribution relative to ceiling)
    sers = latencies.map(lat => (lat / clusterCeiling) * 100);

    // Per-team SER = Σ team_member_latencies / clusterCeiling × 100
    const teamSERs = [0, 1].map(team => {
      const total = teamMembers[team].reduce((s, pIdx) => s + (latencies[pIdx] || 0), 0);
      return (total / clusterCeiling) * 100;
    });
    ntTeamCycleSERs[ntCycle] = teamSERs;
  } else {
    const maxLat = Math.max(...latencies) || 1;
    sers = latencies.map(lat => (lat / maxLat) * 100);
  }

  ntCycleSERs[ntCycle] = sers.slice();
  ntOverallSER = Array.from({ length: ntPlayerCount }, (_, i) => {
    let sum = 0, n = 0;
    ntCycleSERs.forEach(c => { if (c && typeof c[i] === 'number') { sum += c[i]; n++; } });
    return n ? sum / n : 0;
  });

  ntAllCycleTimelines[ntCycle]  = ntPtpTimelines.slice();
  ntAllCyclePlacements[ntCycle] = ntPtpPlacements.map(p => p.slice());
  ntAllCycleNodes[ntCycle]      = ntNode;

  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:         'NT_PLAYBACK',
      cycle:          ntCycle,
      timelines,
      allPlacements,
      cycleSERs:      ntCycleSERs[ntCycle],
      overallSER:     ntOverallSER,
      cycleLatencies: ntCycleLatencies[ntCycle],
      teamCycleSERs:  ntTeamCycleSERs[ntCycle] || null,
    },
  });

  // Host is also a participant and never receives its own SYNC (dedup guard), so it
  // must mirror the NT_PLAYBACK navigation locally — otherwise it strands on the build
  // screen ("waiting for team…") even though resolution completed.
  if (ntIsDNP() && ntTeamNodes[mpMyPlayerIdx]) ntNode = ntTeamNodes[mpMyPlayerIdx];
  ntViewingPlayerIdx = mpMyPlayerIdx;
  ntPlaybackTimeline = ntPtpTimelines[mpMyPlayerIdx];
  ntMyPlacements     = ntPtpPlacements[mpMyPlayerIdx] || [];
  const panel = document.getElementById('nt-comparison-panel');
  if (panel) panel.style.display = ntPlayerCount > 1 ? 'flex' : 'none';
  ntRenderComparisonPanel();
  ntShowPlayback();
}

function ntHandleEnvelope(envelope) {
  const { type, payload } = envelope;

  // ── ACTION (client → host) ────────────────────────────────────────────────
  if (type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;

    if (payload.action === 'NT_GATE_READY') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      ntGateReadyCheck[senderIdx] = true;
      mpUnlockSync();
      if (ntGateReadyCheck.every(Boolean)) {
        const btn = document.getElementById('btn-nt-gate-ready');
        if (btn) btn.disabled = false;
      }
      return;
    }

    if (payload.action === 'NT_SUMMARY_READY') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      ntSummaryReadyCheck[senderIdx] = true;
      mpUnlockSync();
      // Only touch the button if the host is actually on the summary screen right now —
      // harmless either way (ntShowSummary() re-checks .every(Boolean) fresh when the host
      // does reach it), this just avoids poking a hidden/off-screen element pointlessly.
      if (ntSummaryReadyCheck.every(Boolean)) {
        const btn = document.getElementById('btn-nt-summary-next');
        if (btn) btn.disabled = false;
      }
      return;
    }

    if (payload.action === 'NT_COMMIT') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      ntCommitReadyCheck[senderIdx] = true;
      ntPtpPlacements[senderIdx]    = payload.placements || [];
      mpUnlockSync();
      if (ntCommitReadyCheck.every(Boolean)) {
        ntResolveCycleMdlm(ntPtpPlacements.slice());
      }
      return;
    }

    if (payload.action === 'NT_DEBUG_FINISH') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      // `|| []` is LOAD-BEARING here, not defensive habit. Finishing with an empty build is
      // NORMAL in a sandbox ("what's the baseline with no hardening at all?"), and Firebase
      // deletes an empty array in flight — so the host reads undefined, ntResolveCycleMdlm maps
      // over it and throws, and the whole room is stranded.
      ntDebugFinished[senderIdx]      = true;
      ntDebugAttemptCounts[senderIdx] = payload.attempts || 0;
      ntPtpPlacements[senderIdx]      = payload.bestPlacements || [];
      mpUnlockSync();
      ntDebugBroadcastRoster(false);
      if (ntDebugFinished.every(Boolean)) ntResolveCycleMdlm(ntPtpPlacements.slice());
      return;
    }

    if (payload.action === 'NT_ALLOCATION_UPDATE') {
      // Client captain sends updated allocations; host validates then re-broadcasts
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      const senderTeam = ntTeamIdx[senderIdx];
      const allocs = ntValidateTeamAllocations(senderTeam, payload.allocations);
      if (!allocs) return;                        // reject out-of-bounds outright
      ntTeamWorkingAllocs[senderTeam] = allocs;
      ntBroadcastAllocationSync();
      mpUnlockSync();
      return;
    }

    if (payload.action === 'NT_ALLOCATION_LOCK') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      const senderTeam = ntTeamIdx[senderIdx];
      mpUnlockSync();
      ntTeamAllocLocked[senderTeam] = true;
      ntApplyAllocationLock(senderTeam, payload.allocations || []);
      ntCheckBothTeamsLocked();
      return;
    }

    if (payload.action === 'NT_PLAYER_LEFT') {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'NT_MATCH_DISSOLVED' } });
      resetToLobby();
      return;
    }
  }

  // ── SYNC (host → all) ─────────────────────────────────────────────────────
  if (type === 'SYNC') {
    mpUnlockSync();

    if (payload.action === 'NT_GENERATE') {
      ntCycle     = payload.cycle;
      ntInventory = payload.inventory;
      ntMyPlacements  = [];
      ntFirewallUsed  = 0;
      ntHoneypotUsed  = 0;
      ntGateReadyCheck    = new Array(ntPlayerCount).fill(false);
      ntCommitReadyCheck  = new Array(ntPlayerCount).fill(false);
      ntSummaryReadyCheck = new Array(ntPlayerCount).fill(false);

      if (payload.debug) {
        // Client-side sizing. The host holds the authoritative ntDebugFinished; these are the
        // client's own display copies and must still never be left as [].
        ntDebugFinished      = new Array(ntPlayerCount).fill(false);
        ntDebugAttemptCounts = new Array(ntPlayerCount).fill(0);
        ntDebugMyAttempt     = 0;
        ntDebugBest          = null;
      }

      if (payload.isDNP) {
        // DNP: each player has their own relay-leg node; wait for NT_HUDDLE_START
        ntTeamNodes = (payload.allPlayerNodes || []).map(ntNormaliseNode);
        ntNode      = ntTeamNodes[mpMyPlayerIdx];
        // ntHuddleStart will show the allocation screen
      } else {
        ntNode = ntNormaliseNode(payload.node);
        ntShowMdlmGate();
      }
      return;
    }

    if (payload.action === 'NT_DEBUG_ROSTER') {
      ntDebugFinished      = payload.finished || [];
      ntDebugAttemptCounts = payload.attempts || [];
      if (payload.authoring) {
        // The host has looped back to the Node Editor — return to the same standby this device
        // saw at the start, and re-zero every piece of Debug session state.
        ntDebugMyAttempt = 0;
        ntDebugBest      = null;
        ntMyPlacements   = [];
        ntFirewallUsed   = 0;
        ntHoneypotUsed   = 0;
        ntShowStandby('Authoring node…');
        return;
      }
      // Repaint in place — a player still building must NOT be navigated to standby by a
      // roster update, so this deliberately does not call ntShowStandby.
      ntRenderDebugRoster(ntDebugRosterRows());
      return;
    }

    if (payload.action === 'NT_HUDDLE_START') {
      // DNP: captain sets allocation screen; others see read-only view
      ntTeamNodes    = (payload.allPlayerNodes || []).map(ntNormaliseNode);
      ntNode         = ntTeamNodes[mpMyPlayerIdx];
      ntHuddlePhase  = 'editing';

      const myTeam   = ntTeamIdx[mpMyPlayerIdx];
      const myCapIdx = ntCaptainSlots[myTeam];
      const isCap    = mpMyPlayerIdx === myCapIdx;

      const myTeamPool = payload.allPools.find(p => p.members.includes(mpMyPlayerIdx));
      ntAllocationPool = myTeamPool ? myTeamPool.pool : { firewall: 0, honeypot: 0 };

      const myTeamAllocs = payload.allAllocations[myTeam];
      ntAllocations = myTeamAllocs ? myTeamAllocs.map(a => ({ ...a })) : [];
      // Per-huddle reset of the captain-local deposit stack — accumulator arrays must be
      // reset on the CLIENT too, or cycle 2's Undo pops cycle 1's taps (§ logic-engine.md).
      ntAllocDeposits = [];
      ntAllocBrush    = 'firewall';
      ntAllocViewLeg  = 0;

      const teamSizes = [0, 0];
      ntTeamIdx.forEach(t => teamSizes[t]++);
      const huddleDuration = payload.huddleDuration || (ntHardeningWin * teamSizes[myTeam]);
      const myName = ntPlayerNames[mpMyPlayerIdx] || ('ADMIN-' + (mpMyPlayerIdx + 1));

      ntSetGateHeading('Cycle Initialisation Gate', 'Preparing your team’s Allocation Hub…');
      ntPlayGateBoot([ntSimTag(), 'LOGIN: ' + myName.toUpperCase() + ' — OPENING ALLOCATION HUB…'], () => {
        ntShowAllocationScreen(isCap);
        ntStartHuddleTimer(huddleDuration);
      });
      return;
    }

    if (payload.action === 'NT_ALLOCATION_SYNC') {
      // Render the updated allocation state for this device's team (read-only unless captain)
      const myTeam   = ntTeamIdx[mpMyPlayerIdx];
      const myCapIdx = ntCaptainSlots[myTeam];
      const isCap    = mpMyPlayerIdx === myCapIdx;
      const teamData = payload.teamData[myTeam];
      if (teamData) {
        ntAllocations = teamData.allocations.map(a => ({ ...a }));
        if (teamData.locked) ntHuddlePhase = 'locked';
      }
      ntRenderAllocationScreen(isCap && ntHuddlePhase !== 'locked');
      return;
    }

    if (payload.action === 'NT_BUILD_BEGIN') {
      // Apply per-player assigned inventory if present (DNP); otherwise use ntInventory as-is
      if (payload.assignedInventory) {
        const myAlloc = payload.assignedInventory[mpMyPlayerIdx];
        if (myAlloc) ntInventory = { ...myAlloc };
      }
      ntStopHuddleTimer();
      ntShowBuild(payload.endTimestamp);
      return;
    }

    if (payload.action === 'NT_PLAYBACK') {
      // Render-only — host already resolved; clients just store + display.
      // Each timeline needs the same empty-collection repair the node does: a player who
      // placed no honeypots sends fires:[] / slowSpans:[], both erased in flight, and
      // ntRenderFrame reads tl.fires unguarded.
      ntPtpTimelines   = (payload.timelines || []).map(ntNormaliseTimeline);
      // A player who spent no inventory this cycle submits placements:[] — Firebase drops
      // that empty array, turning allPlacements into a hole-having object keyed by index
      // rather than a plain array (BUG-06 class). Rebuild per-seat so a dropped slot reads
      // as [] instead of undefined and .map() below never throws.
      ntPtpPlacements  = Array.from({ length: ntPlayerCount },
        (_, i) => (payload.allPlacements && payload.allPlacements[i]) || []);
      ntCycleSERs[ntCycle]      = payload.cycleSERs;
      ntOverallSER              = payload.overallSER;
      ntCycleLatencies[ntCycle] = payload.cycleLatencies;
      if (payload.teamCycleSERs) ntTeamCycleSERs[ntCycle] = payload.teamCycleSERs;

      // In DNP, load this device's own relay-leg node for playback
      if (ntIsDNP() && ntTeamNodes[mpMyPlayerIdx]) ntNode = ntTeamNodes[mpMyPlayerIdx];

      ntAllCycleTimelines[ntCycle]  = ntPtpTimelines.slice();
      ntAllCyclePlacements[ntCycle] = ntPtpPlacements.map(p => p.slice());
      ntAllCycleNodes[ntCycle]      = ntNode;

      ntViewingPlayerIdx = mpMyPlayerIdx;
      ntPlaybackTimeline = ntPtpTimelines[mpMyPlayerIdx];
      ntMyPlacements     = ntPtpPlacements[mpMyPlayerIdx] || [];
      const panel = document.getElementById('nt-comparison-panel');
      if (panel) panel.style.display = ntPlayerCount > 1 ? 'flex' : 'none';
      ntRenderComparisonPanel();
      ntShowPlayback();
      return;
    }

    if (payload.action === 'NT_SUMMARY') {
      // Render-only — host already computed; apply and navigate
      if (payload.cycleSERs)     ntCycleSERs[ntCycle]      = payload.cycleSERs;
      if (payload.overallSER)    ntOverallSER               = payload.overallSER;
      if (payload.type === 'match') ntShowSummary('match');
      else                          ntShowSummary('cycle');
      return;
    }

    if (payload.action === 'NT_GAMEOVER') {
      if (payload.overallSER)    ntOverallSER   = payload.overallSER;
      if (payload.playerNames)   ntPlayerNames  = payload.playerNames;
      ntShowMatchSummary();
      return;
    }

    if (payload.action === 'NT_MATCH_DISSOLVED') {
      resetToLobby();
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE RESET  (called from engine.js resetToLobby — §13)
// ═══════════════════════════════════════════════════════════════════════════

function ntResetState() {
  if (ntRafHandle)     { cancelAnimationFrame(ntRafHandle); ntRafHandle = null; }
  if (ntBuildTimer)    { clearInterval(ntBuildTimer);  ntBuildTimer  = null; }
  if (ntHuddleTimer)   { clearInterval(ntHuddleTimer); ntHuddleTimer = null; }
  if (ntLongPressTimer){ clearTimeout(ntLongPressTimer); ntLongPressTimer = null; }
  if (ntResolveGuard)  { clearTimeout(ntResolveGuard); ntResolveGuard = null; }
  ntBootTimers.forEach(clearTimeout);
  ntBootTimers = [];
  ntCycleResolved  = false;
  ntCommitted      = false;
  // DNP journey playback teardown
  ntPbJourney   = null;
  ntPbActiveLeg = -1;
  const pbCanvas = document.getElementById('nt-playback-canvas');
  if (pbCanvas) { pbCanvas.style.transform = ''; pbCanvas.style.transition = ''; pbCanvas.style.opacity = ''; }
  ['nt-journey-tabs', 'nt-journey-segwrap'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  const bridgeOv = document.getElementById('nt-bridge-preview-overlay');
  if (bridgeOv) bridgeOv.style.display = 'none';
  ntCycle          = 0;
  ntCycleSERs      = [];
  ntTeamCycleSERs  = [];
  ntOverallSER     = [];
  ntCycleLatencies = [];
  ntPlaybackTimeline = null;
  ntPlaybackScrubMs  = null;
  ntNode           = null;
  ntInventory      = { firewall: 0, honeypot: 0 };
  ntMyPlacements   = [];
  ntFirewallUsed   = 0;
  ntHoneypotUsed   = 0;
  ntPlaybackData   = null;
  ntViewingUid     = null;
  ntTeamNodes      = [];
  ntAllocationPool  = { firewall: 0, honeypot: 0 };
  ntAllocations     = [];
  ntAllocBrush      = 'firewall';
  ntAllocDeposits   = [];
  ntAllocViewLeg    = 0;
  ntHuddlePhase     = 'editing';
  ntTeamAllocLocked      = [false, false];
  ntTeamWorkingAllocs    = [[], []];
  ntAllPlayerAllocations = [];
  ntGateReadyCheck    = [];
  ntCommitReadyCheck  = [];
  ntSummaryReadyCheck = [];
  ntRoutingState   = 'valid';
  ntPlaybackPhase  = 'tracing';
  ntPlaybackPaused = false;
  ntPlaybackLoopFn = null;
  ntSummaryMode    = 'cycle';
  ntOverclockTheme = false;
  ntGhostAnchor    = null;
  // Debug / Sandbox session state. ntDebugMode is deliberately NOT cleared — it is a setting,
  // and every other setting survives a play-again / Reboot too.
  ntDebugBrush         = 'bad';
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;
  ntDebugFinished      = [];
  ntDebugAttemptCounts = [];
  // PTP state
  ntPtpTurn        = 0;
  ntPtpTimelines   = [];
  ntPtpPlacements  = [];
  ntViewingPlayerIdx = 0;
  // Match-level log
  ntAllCycleTimelines  = [];
  ntAllCyclePlacements = [];
  ntAllCycleNodes      = [];
  ntGateCallback              = null;
  ntSummaryCallback           = null;
  ntPlaybackContinueCallback  = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS UI  (pill/toggle visual state; apply-effects land in Step 5)
// ═══════════════════════════════════════════════════════════════════════════

function ntSelectPill(group, value) {
  document.querySelectorAll(`[data-${group}]`).forEach(p => p.classList.remove('pill-active-emerald'));
  const target = document.querySelector(`[data-${group}="${value}"]`);
  if (target) target.classList.add('pill-active-emerald');
}

// Mutually-exclusive / superseded settings (ui-style.md § Settings Layout Standard).
// The controls dim; the card TITLE stays at full contrast — a fully-dimmed card reads as a
// rendering bug rather than an unavailable option. The amber reason line is mandatory: a dead
// control with no explanation is indistinguishable from a bug, and the player has no way to
// discover that a different setting is the cause. Amber, never text-stone-400 — stone-400 is
// already the dynamic-value-line colour (what you have PICKED); amber means UNAVAILABLE.
function ntSetCardDisabled(ctlId, reasonId, disabled, reason) {
  const ctl = document.getElementById(ctlId);
  if (ctl) {
    ctl.classList.toggle('opacity-50', disabled);
    ctl.classList.toggle('pointer-events-none', disabled);
  }
  const r = document.getElementById(reasonId);
  if (r) {
    r.textContent   = disabled ? reason : '';
    r.style.display = disabled ? '' : 'none';
  }
}

// Reflect current settings state into the overlay controls before opening.
function ntSyncSettingsUI() {
  ntSelectPill('nt-scale', ntMatrixScale);
  ntSelectPill('nt-iters', ntIterations);
  ntSelectPill('nt-win', ntHardeningWin);
  ntSelectPill('nt-native', ntNativeHoneypots);
  const t = document.getElementById('btn-nt-sylly-toggle');
  if (t) {
    t.textContent = ntSyllyMode ? 'ON' : 'OFF';
    t.className = (ntSyllyMode ? 'game-toggle-on-emerald' : 'game-toggle-off') + ' shrink-0';
  }
  const d = document.getElementById('btn-nt-debug-toggle');
  if (d) {
    d.textContent = ntDebugMode ? 'ON' : 'OFF';
    d.className = (ntDebugMode ? 'game-toggle-on-emerald' : 'game-toggle-off') + ' shrink-0';
  }
  // Mutually exclusive — each turns the other off, and dims it while on. Both stay reachable.
  ntSetCardDisabled('btn-nt-sylly-toggle', 'nt-reason-sylly', ntDebugMode, 'Unavailable while Debug Mode is on');
  ntSetCardDisabled('btn-nt-debug-toggle', 'nt-reason-debug', ntSyllyMode, 'Unavailable while Sylly Mode is on');
  // Superseded — the stored values are NOT modified and return intact when Debug goes off.
  ntSetCardDisabled('nt-ctl-iters', 'nt-reason-iters', ntDebugMode, 'Debug Mode runs a single Node');
  ntSetCardDisabled('nt-ctl-win',   'nt-reason-win',   ntDebugMode, 'Debug Mode has no time limit');
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM READY — wire all event listeners
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Lobby button ──────────────────────────────────────────────────────────
  document.getElementById('btn-nt').addEventListener('click', () => {
    playLaunch();
    activeGameId = 'nt';
    const banner = document.getElementById('nt-menu-status');
    if (banner) banner.style.display = 'none';
    showScreen('screen-nt-menu');
  });

  // ── Game menu ───────────────────────────────────────────────────────────────
  document.getElementById('btn-nt-menu-play').addEventListener('click', () => {
    playLaunch();
    // Post-lobby (host/client): start session. Pre-lobby: mode screen for PTP/MDLM choice.
    if (window.syllyMultiplayerMode !== 'single') {
      ntStartSession();
    } else {
      mpShowModeScreen('nt');
    }
  });

  document.getElementById('btn-nt-menu-how-to').addEventListener('click', ntOpenHowTo);

  document.getElementById('btn-nt-menu-settings').addEventListener('click', () => {
    playDone();
    ntSyncSettingsUI();
    const overlay = document.getElementById('nt-settings-overlay');
    overlay.querySelector('.overlay-data-inner').scrollTop = 0;
    overlay.style.display = 'flex';
  });

  document.getElementById('btn-nt-menu-back').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── How-to overlay ──────────────────────────────────────────────────────────
  document.getElementById('btn-nt-howto-close').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-how-to-overlay').style.display = 'none';
  });
  ['btn-nt-how-to', 'btn-nt-playback-how-to', 'btn-nt-alloc-how-to'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', ntOpenHowTo);
  });

  // ── Settings overlay ──────────────────────────────────────────────────────────
  document.getElementById('btn-nt-settings-close').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-settings-overlay').style.display = 'none';
  });

  // Pills — visual select + state write (apply-effects use these globals in Step 5)
  document.querySelectorAll('[data-nt-scale]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntMatrixScale = parseInt(b.dataset.ntScale, 10); ntSelectPill('nt-scale', ntMatrixScale);
  }));
  document.querySelectorAll('[data-nt-iters]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntIterations = parseInt(b.dataset.ntIters, 10); ntSelectPill('nt-iters', ntIterations);
  }));
  document.querySelectorAll('[data-nt-win]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntHardeningWin = parseInt(b.dataset.ntWin, 10); ntSelectPill('nt-win', ntHardeningWin);
  }));
  document.querySelectorAll('[data-nt-native]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntNativeHoneypots = parseInt(b.dataset.ntNative, 10); ntSelectPill('nt-native', ntNativeHoneypots);
  }));

  // Sylly Mode (DNP) toggle — reciprocally forces Debug off (mutually exclusive)
  document.getElementById('btn-nt-sylly-toggle').addEventListener('click', () => {
    ntSyllyMode = !ntSyllyMode;
    if (ntSyllyMode) { ntDebugMode = false; playSyllyOn(); } else playSyllyOff();
    ntSyncSettingsUI();
  });

  // Debug Mode toggle — forces Sylly off. Uses playPillClick, not playSyllyOn/Off: those two
  // are the Sylly Mode signature across the whole suite and Debug is an ordinary setting.
  document.getElementById('btn-nt-debug-toggle').addEventListener('click', () => {
    ntDebugMode = !ntDebugMode;
    if (ntDebugMode) ntSyllyMode = false;
    playPillClick();
    ntSyncSettingsUI();
  });

  document.getElementById('btn-nt-alloc-lock').addEventListener('click', () => {
    playLaunch();
    // Flash warning if pool is not fully allocated (non-blocking — captain can still lock)
    const usedFW = ntAllocations.reduce((s, a) => s + (a.firewall || 0), 0);
    const usedHP = ntAllocations.reduce((s, a) => s + (a.honeypot || 0), 0);
    const warning = document.getElementById('nt-alloc-warning');
    if ((usedFW < ntAllocationPool.firewall || usedHP < ntAllocationPool.honeypot) && warning) {
      warning.classList.remove('nt-flash-warning');
      void warning.offsetWidth;
      warning.classList.add('nt-flash-warning');
    }
    ntCommitAllocation();
  });
  document.getElementById('btn-nt-gate-ready').addEventListener('click', () => { playLaunch(); if (ntGateCallback) ntGateCallback(); else ntShowBuild(); });
  document.getElementById('btn-nt-commit').addEventListener('click', () => { playLaunch(); ntCommit(); });

  // ── Node Editor (Debug Mode) ────────────────────────────────────────────────
  document.querySelectorAll('[data-nt-brush]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntDebugBrush = b.dataset.ntBrush; ntSyncAuthUI();
  }));
  // ntSyncAuthUI clamps, so a bare ++/-- can never leave the budget out of range.
  document.getElementById('btn-nt-auth-fw-minus').addEventListener('click', () => { playPillClick(); ntInventory.firewall--; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-fw-plus') .addEventListener('click', () => { playPillClick(); ntInventory.firewall++; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-hp-minus').addEventListener('click', () => { playPillClick(); ntInventory.honeypot--; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-hp-plus') .addEventListener('click', () => { playPillClick(); ntInventory.honeypot++; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-rand-terrain').addEventListener('click', () => { playWhoosh(); ntAuthRandomiseTerrain(); });
  document.getElementById('btn-nt-auth-rand-budget') .addEventListener('click', () => { playWhoosh(); ntAuthRandomiseBudget(); });
  document.getElementById('btn-nt-auth-how-to').addEventListener('click', ntOpenHowTo);
  document.getElementById('btn-nt-auth-deploy').addEventListener('click', () => { playLaunch(); ntDeployNode(); });
  document.getElementById('btn-nt-debug-again').addEventListener('click', () => { playLaunch(); ntDebugRunAgain(); });
  document.getElementById('btn-nt-debug-finish').addEventListener('click', () => { playLaunch(); ntDebugFinish(); });
  document.getElementById('btn-nt-build-clear').addEventListener('click', () => {
    playWhoosh();
    ntMyPlacements = [];
    ntRenderBuildGrid();      // repaints every cell and calls ntUpdateBuildCounters itself
    ntSetRouting('valid');
  });

  // Playback scrubber — drag to scrub; drives the renderer directly when auto-play has ended.
  document.getElementById('nt-playback-scrubber').addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10) / 100;
    if (ntIsDNP()) {
      if (!ntPbJourney || ntPbJourney.total <= 0) return;
      ntPlaybackScrubMs = pct * ntPbJourney.total;
      if (!ntRafHandle) ntRenderJourneyFrame(ntPlaybackScrubMs);
      return;
    }
    if (!ntPlaybackTimeline) return;
    ntPlaybackScrubMs = pct * ntPlaybackTimeline.latencyMs;
    if (!ntRafHandle) ntRenderFrame(ntPlaybackScrubMs, false);
  });
  document.getElementById('nt-playback-scrubber').addEventListener('change', () => {
    if (ntIsDNP()) { ntResumeJourneyAfterScrub(); return; }
    ntResumeAfterScrub(); // auto-resume on drag release (no-op when manually paused)
  });
  document.getElementById('btn-nt-playback-pause').addEventListener('click', () => {
    playPillClick();
    if (ntIsDNP()) { ntToggleJourneyPlayback(); return; }
    ntTogglePlayback();
  });
  document.getElementById('btn-nt-playback-skip-end').addEventListener('click', () => {
    const pb = document.getElementById('btn-nt-playback-pause');
    const sc = document.getElementById('nt-playback-scrubber');
    if (ntIsDNP()) {
      if (!ntPbJourney || ntPbJourney.total <= 0) return;
      ntPlaybackScrubMs = ntPbJourney.total;
      ntPlaybackPaused = true;
      ntStopPlayback();
      ntRenderJourneyFrame(ntPbJourney.total);
      if (pb) { pb.textContent = '▶'; pb.style.opacity = '1'; }
      if (ntPlaybackPhase !== 'ended') { ntPlaybackPhase = 'ended'; playSuccess(); }
      if (sc) sc.value = 100;
      return;
    }
    const tl = ntPlaybackTimeline;
    if (!tl) return;
    ntPlaybackScrubMs = tl.latencyMs;
    ntPlaybackPaused = true;
    ntStopPlayback();
    ntRenderFrame(tl.latencyMs, true);
    if (pb) { pb.textContent = '▶'; pb.style.opacity = '1'; }
    if (ntPlaybackPhase !== 'ended') { ntPlaybackPhase = 'ended'; playSuccess(); }
    if (sc) sc.value = 100;
  });
  document.getElementById('btn-nt-playback-continue').addEventListener('click', () => {
    playDone();
    if (ntPlaybackContinueCallback) {
      const cb = ntPlaybackContinueCallback;
      ntPlaybackContinueCallback = null;
      // Reset button label for next normal use
      const btn = document.getElementById('btn-nt-playback-continue');
      if (btn) btn.textContent = 'Continue ▶';
      cb();
      return;
    }
    // Last cycle → final (match) summary; otherwise the per-cycle summary.
    if (ntCycle >= ntIterations - 1) ntShowSummary('match');
    else ntShowSummary('cycle');
  });
  document.getElementById('btn-nt-summary-next').addEventListener('click', () => {
    playLaunch();
    if (ntSummaryCallback) ntSummaryCallback();
  });

  // ── Quit (mid-game ✕ → quit overlay → game menu) ──────────────────────────────
  document.querySelectorAll('.btn-nt-quit-open').forEach(b => b.addEventListener('click', () => {
    playExit();
    document.getElementById('nt-quit-overlay').style.display = 'flex';
  }));
  document.getElementById('btn-nt-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-quit-overlay').style.display = 'none';
  });
  document.getElementById('btn-nt-quit-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('nt-quit-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode === 'host') {
      // Host dissolves the whole match for everyone (PASS contract)
      try { mpSendEnvelope({ type: 'SYNC', payload: { action: 'NT_MATCH_DISSOLVED' } }); } catch (_) {}
      resetToLobby();
      return;
    }
    if (window.syllyMultiplayerMode === 'client') {
      // Client notifies host then leaves
      try { mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_PLAYER_LEFT' } }); } catch (_) {}
      resetToLobby();
      return;
    }
    ntResetState();
    showScreen('screen-nt-menu');
  });

  // ── Summary exit — mode-aware: the final match summary is post-game (✕ → resetToLobby
  // directly, no state left to preserve); a per-cycle summary is still mid-match, so it
  // goes through the same quit-confirm gate as every other in-round ✕. ──────────────────
  document.getElementById('btn-nt-summary-exit').addEventListener('click', () => {
    if (ntSummaryMode === 'match') {
      playExit();
      resetToLobby();
      return;
    }
    playExit();
    document.getElementById('nt-quit-overlay').style.display = 'flex';
  });

  // ── Reboot (play-again confirm) ───────────────────────────────────────────────
  document.getElementById('btn-nt-reboot').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-reboot-overlay').style.display = 'flex';
  });
  document.getElementById('btn-nt-reboot-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-reboot-overlay').style.display = 'none';
  });
  document.getElementById('btn-nt-reboot-confirm').addEventListener('click', () => {
    playLaunch();
    document.getElementById('nt-reboot-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; }
    ntResetState();
    ntShowSetup(); // reboot returns to setup so operator count can be changed
  });

  // ── Setup screen (PTP) ──────────────────────────────────────────────────────

  document.getElementById('nt-setup-count-pills').addEventListener('click', e => {
    const btn = e.target.closest('[data-nt-count]');
    if (!btn) return;
    playPillClick();
    ntPlayerCount = parseInt(btn.dataset.ntCount, 10);
    ntSelectPill('nt-count', ntPlayerCount);
    // Show/hide name inputs to match selected count
    document.querySelectorAll('.nt-setup-name-input').forEach(inp => {
      const idx = parseInt(inp.dataset.ntPlayer, 10);
      inp.style.display = idx < ntPlayerCount ? '' : 'none';
    });
  });

  document.getElementById('btn-nt-setup-back').addEventListener('click', () => {
    playExit();
    showScreen('screen-nt-menu');
  });

  document.getElementById('btn-nt-setup-start').addEventListener('click', () => {
    playLaunch();
    ntStartPTP();
  });

  // ── System Logs overlay ──────────────────────────────────────────────────────
  document.getElementById('btn-nt-logs-open').addEventListener('click', ntOpenLogs);
  document.getElementById('btn-nt-logs-close').addEventListener('click', () => {
    playDone();
    document.getElementById('nt-logs-overlay').style.display = 'none';
  });

  // ── Sound buttons (engine.js querySelectorAll runs before NT markup is parsed) ──
  document.querySelectorAll('#screen-nt-menu .btn-open-sound, #screen-nt-setup .btn-open-sound, #screen-nt-allocation .btn-open-sound, #screen-nt-gate .btn-open-sound, #screen-nt-build .btn-open-sound, #screen-nt-playback .btn-open-sound, #screen-nt-summary .btn-open-sound, #screen-nt-standby .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});
