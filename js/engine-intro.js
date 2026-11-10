// ═══════════════════════════════════════════════════════════════════════════
// js/engine-intro.js — the Intro: the world, a narrator, what you'll be doing,
// pick your side (UI revamp Stage 0, SW v264).
//
//   players join → host starts → INTRO (narrator beats → brief → Line-up → Ready) → game
//
// Depends on: engine.js (showScreen, play*), engine-multiplayer.js (mpEnterGame — the
// seam that calls mpIntroOpen — plus mpPlayerSlots, mpSeats, mpMyPlayerIdx,
// mpActiveGame, mpActiveGameConfig, mpSendEnvelope, mpSendPrivate, mpIsBotSlot,
// mpSeatList, mpAwaySeats, mpReleasedSeats, mpAwayPending, mpMarkAway, mpMatchLive).
//
// A game opts in with MP_GAME_CONFIGS[abbr].intro; a game without one never reaches
// this file. Rules: docs/rules/ui-revamp.md § The Intro.
// Spec: docs/superpowers/specs/2026-11-08-ui-revamp-design.md § 5.
//
// Packets (engine-generic, routed by mpIntroHandleEnvelope BEFORE any per-game code):
//   MP_INTRO_READY  client → host  {}            seat from originId, never the payload
//   MP_LINEUP_PICK  client → host  { team }      -1 = Unassigned
//   MP_INTRO_STATE  host → all     { ready[], team[], names[], skipped }
//   MP_INTRO_DONE   host → all     { order[], roster }   — sent once, after the whole
//                                                           transition is settled
// Firebase erases empty values: every array is rebuilt on receipt (mpIntroWireArr).
// ═══════════════════════════════════════════════════════════════════════════

const MP_INTRO_BEAT_MS         = 5000;   // a narrator line auto-advances; a tap goes sooner
const MP_INTRO_NAME_MAX        = 20;

let mpIntroSeen      = null;   // game abbr whose Intro already played this session — Play again only
let mpIntroLastTeams = null;   // host: { uid: team } from the last Line-up, kept for the returning form
let mpIntroTimers    = [];     // EVERY Intro timer handle — beat auto-advance, Start-anyway reveal
let mpIntro          = null;   // the open Intro, or null

function mpIntroIsOpen() { return !!mpIntro; }

// ── Timers: one bag (logic-engine.md § Timer Lifecycle) ──────────────────────
function mpIntroLater(fn, ms) {
  const h = setTimeout(() => { mpIntroTimers = mpIntroTimers.filter(x => x !== h); fn(); }, ms);
  mpIntroTimers.push(h);
  return h;
}
function mpIntroCancel(h) {
  if (!h) return;
  clearTimeout(h);
  mpIntroTimers = mpIntroTimers.filter(x => x !== h);
}

// ── Wire normalisers ─────────────────────────────────────────────────────────
// A dense array survives the wire as an array, a sparse one as an object keyed by
// index, an empty one not at all. Read v[i] for i < n and fill the holes.
function mpIntroWireArr(v, n, fill) {
  const src = (v && typeof v === 'object') ? v : {};
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = src[i];
    out.push(x === undefined || x === null ? fill : x);
  }
  return out;
}

function mpIntroWireRoster(r, n) {
  if (!r || typeof r !== 'object') return null;
  return {
    teamNames:     r.teamNames ? mpSeatList(r.teamNames).map(String) : null,
    playerTeamIdx: r.playerTeamIdx ? mpIntroWireArr(r.playerTeamIdx, n, 0).map(Number) : null,
    captainSlots:  r.captainSlots ? mpSeatList(r.captainSlots) : null,
    captainNames:  r.captainNames ? mpSeatList(r.captainNames) : null,
  };
}

function mpIntroEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// ── Copy: cloned from the game's own <template id="intro-[abbr]"> ────────────
// The copy lives in the game's partial so verify-identity-docs.js reads it where it
// already looks. Every field is plain text content — no copy in attributes.
//   <p data-intro-narrator>…</p> <p data-intro-role>…</p>
//   <p data-intro-line>…</p> ×N
//   <ul data-intro-brief="default"><li>…</li> ≤3</ul>  (+ more variants by key)
//   <p data-intro-lineup>…</p>       the narrator's Line-up prompt (optional)
//   <p data-intro-unassigned>…</p>   the Line-up's third column (optional — "Unassigned")
//   <p data-intro-roll>…</p>         the roll call's heading (optional; ETA "Sign the timesheet.")
//   <p data-intro-ready-tag>…</p>    a ready chip's stamp instead of ✓ (optional; ETA "CLOCKED ON")
// The last two are skin, not rules: a game without them renders exactly as before.
function mpIntroReadTemplate(id) {
  const tpl  = id ? document.getElementById(id) : null;
  const root = tpl ? (tpl.content || tpl) : null;
  const q  = sel => (root && root.querySelector) ? root.querySelector(sel) : null;
  const qa = sel => (root && root.querySelectorAll) ? [...root.querySelectorAll(sel)] : [];
  const txt = el => (el && el.textContent ? String(el.textContent).trim() : '');
  const briefs = {};
  qa('[data-intro-brief]').forEach(ul => {
    const key = (ul.dataset && ul.dataset.introBrief) || 'default';
    const items = (ul.querySelectorAll ? [...ul.querySelectorAll('li')] : []).map(txt).filter(Boolean);
    briefs[key] = items.slice(0, 3);
  });
  return {
    narrator:     txt(q('[data-intro-narrator]')),
    role:         txt(q('[data-intro-role]')),
    lines:        qa('[data-intro-line]').map(txt).filter(Boolean),
    briefs,
    lineupPrompt: txt(q('[data-intro-lineup]')),
    unassigned:   txt(q('[data-intro-unassigned]')),
    rollPrompt:   txt(q('[data-intro-roll]')),
    readyTag:     txt(q('[data-intro-ready-tag]')),
  };
}

// ── Line-up arithmetic (pure) ────────────────────────────────────────────────
// Unassigned seats are placed, in seat order, into the smallest team (lowest index on
// a tie). The gate is judged on the PLACED teams: an unassigned player can always be
// placed to balance; a player who chose a crowded team cannot be moved silently.
function mpIntroPlace(team, nTeams) {
  const out    = team.slice();
  const counts = Array(nTeams).fill(0);
  out.forEach(t => { if (t >= 0 && t < nTeams) counts[t]++; });
  out.forEach((t, i) => {
    if (t >= 0 && t < nTeams) return;
    let best = 0;
    for (let k = 1; k < nTeams; k++) if (counts[k] < counts[best]) best = k;
    out[i] = best;
    counts[best]++;
  });
  return out;
}

function mpIntroLineupProblem(team, lineup) {
  if (!lineup || lineup.type !== 'teams') return null;
  const n      = (lineup.teamNames || []).length;
  const placed = mpIntroPlace(team, n);
  const counts = Array.from({ length: n }, (_, t) => placed.filter(x => x === t).length);
  if (lineup.minPerTeam && counts.some(c => c < lineup.minPerTeam)) {
    return `Each team needs at least ${lineup.minPerTeam} players.`;
  }
  if (lineup.balanced && Math.max(...counts) !== Math.min(...counts)) {
    return n === 2 ? 'Both teams need the same number of players.' : 'Every team needs the same number of players.';
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Open / close
// ═══════════════════════════════════════════════════════════════════════════

// From mpEnterGame() only. PTP ('single') gets the one-tap form; host and client the
// full form. A client opens WAITING: nothing is shown until the host's first
// MP_INTRO_STATE says whether the narrator beats run (a Play-again skips them).
function mpIntroOpen(cfg) {
  mpIntroStop();
  const mode = window.syllyMultiplayerMode === 'single' ? 'ptp' : window.syllyMultiplayerMode;
  const copy = mpIntroReadTemplate(cfg.intro.template);
  // No Line-up in a Team Lobby: there a device IS a team, so a minPerTeam could never
  // be met by two devices (LI5 pilot § 4.4). A roll call instead — generic.
  const lineup = (mode !== 'ptp' && window.mpLobbyStyle !== 'team' && cfg.intro.lineup && cfg.intro.lineup.type === 'teams') ? cfg.intro.lineup : null;
  mpIntro = {
    cfg, abbr: mpActiveGame, mode, copy, lineup,
    beat: 0, waiting: mode === 'client', shown: false,
    scene: null, sceneBeat: null, beatTimer: null, readySent: false,
    state: null,
  };

  if (mode === 'host') {
    const returning = mpIntroSeen === mpActiveGame;
    // A returning game with no Line-up has nothing left to ask: straight in.
    if (returning && !lineup) { mpIntroFinishHost(); return; }
    const last  = (returning && mpIntroLastTeams) || {};
    const pre   = window.mpLobbyRosterTeamNames;   // the host may have named teams pre-lobby
    const names = lineup
      ? lineup.teamNames.map((d, t) => String((pre && pre[t] && String(pre[t]).trim()) || d).slice(0, MP_INTRO_NAME_MAX))
      : [];
    mpIntro.state = {
      ready:   mpPlayerSlots.map(s => mpIsBotSlot(s)),   // a bot has nothing to read
      team:    mpPlayerSlots.map(s => (lineup && Number.isInteger(last[s.uid]) && last[s.uid] < names.length) ? last[s.uid] : -1),
      names,
      skipped: returning,
    };
    if (returning) mpIntro.beat = copy.lines.length;
    mpIntroBroadcast();
  }
  if (!mpIntro.waiting) mpIntroShow();
}

function mpIntroShow() {
  if (!mpIntro) return;
  mpIntro.waiting = false;
  if (!mpIntro.shown) {
    mpIntro.shown = true;
    showScreen('screen-game-intro');
    mpIntroMountScene();
  }
  mpIntroArmBeat();
  mpIntroRender();
}

// Stops everything the Intro owns. Safe to call with nothing open.
function mpIntroStop() {
  mpIntroTimers.forEach(h => clearTimeout(h));
  mpIntroTimers = [];
  mpIntroStopScene();
  mpIntro = null;
  const q = document.getElementById('game-intro-quit-overlay');
  if (q) q.style.display = 'none';
  const sc = document.getElementById('game-intro-start-overlay');
  if (sc) sc.style.display = 'none';
}

// From resetToLobby(): a fresh session plays the Intro again.
function mpIntroTeardown() {
  mpIntroStop();
  mpIntroSeen = null;
  mpIntroLastTeams = null;
}

// From mpReturnToLobby() (host) — Play again is the ONLY thing that skips the beats.
function mpIntroNoteReturning(abbr) {
  if (abbr && MP_GAME_CONFIGS[abbr] && MP_GAME_CONFIGS[abbr].intro) mpIntroSeen = abbr;
}

// ── Scene: game-owned { mount(el, opts), stop(), beat?(i, text) } ────────────
// beat is optional (LI5 pilot § 4.4). It means "show this line", not "advance":
// beat(i, line) per narrator line, then beat(-1, '') exactly once when the beats end
// (last line, Skip, or a returning Intro). mpIntroRender() sends it, deduped by
// mpIntro.sceneBeat; a (re-)mount clears that so the board is never left blank.
function mpIntroReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

function mpIntroMountScene() {
  const el = document.getElementById('game-intro-scene');
  if (!el || !mpIntro) return;
  mpIntro.sceneBeat = null;
  const scr = document.getElementById('screen-game-intro');
  if (scr && scr.dataset) delete scr.dataset.sceneBeats;
  const make = mpIntro.cfg.intro.scene;
  if (typeof make !== 'function') { el.style.display = 'none'; return; }
  try {
    const sc = make();
    if (!sc || typeof sc.mount !== 'function') { el.style.display = 'none'; return; }
    el.style.display = '';
    sc.mount(el, { reducedMotion: mpIntroReducedMotion(), seat: mpMyPlayerIdx, mode: mpIntro.mode });
    mpIntro.scene = sc;
    // The scene writes the lines itself: the narrator card keeps the tap target, the
    // count and the accessible text (#game-intro-line goes sr-only — styles.css).
    if (typeof sc.beat === 'function' && scr && scr.dataset) scr.dataset.sceneBeats = '';
  } catch (e) {
    console.warn('[intro] scene.mount', e);
    el.style.display = 'none';
  }
}

function mpIntroStopScene() {
  const sc = mpIntro && mpIntro.scene;
  if (!sc) return;
  mpIntro.scene = null;
  try { if (typeof sc.stop === 'function') sc.stop(); } catch (e) { console.warn('[intro] scene.stop', e); }
}

// ── Narrator beats (local only — no packet) ──────────────────────────────────
function mpIntroInBeats() {
  return !!mpIntro && !(mpIntro.state && mpIntro.state.skipped) && mpIntro.beat < mpIntro.copy.lines.length;
}

function mpIntroArmBeat() {
  if (!mpIntro) return;
  mpIntroCancel(mpIntro.beatTimer);
  mpIntro.beatTimer = mpIntroInBeats() ? mpIntroLater(mpIntroAdvance, MP_INTRO_BEAT_MS) : null;
}

function mpIntroAdvance() {
  if (!mpIntroInBeats()) return;
  mpIntro.beat++;
  mpIntroArmBeat();
  mpIntroRender();
}

// Host (and PTP): skip the beats on every device.
function mpIntroSkip() {
  if (!mpIntro || (mpIntro.mode !== 'host' && mpIntro.mode !== 'ptp')) return;
  mpIntro.beat = mpIntro.copy.lines.length;
  if (mpIntro.mode === 'host') { mpIntro.state.skipped = true; mpIntroBroadcast(); }
  mpIntroArmBeat();
  mpIntroRender();
}

// ═══════════════════════════════════════════════════════════════════════════
// Readiness + Line-up — host-authoritative; the host applies its own taps directly
// (the dedup guard drops self-sent ACTIONs — logic-engine.md § MDLM Patterns).
// ═══════════════════════════════════════════════════════════════════════════

function mpIntroReady() {
  if (!mpIntro || mpIntro.mode === 'ptp' || !mpIntro.state || mpIntroInBeats()) return;
  if (mpIntro.mode === 'host') {
    mpIntro.state.ready[mpMyPlayerIdx] = true;
    mpIntroBroadcast();
  } else {
    if (mpIntro.readySent) return;
    mpIntro.readySent = true;
    mpIntro.state.ready[mpMyPlayerIdx] = true;            // optimistic; the host's state overwrites
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'MP_INTRO_READY' } });
  }
  mpIntroRender();
}

function mpIntroValidTeam(team) {
  const n = mpIntro && mpIntro.lineup ? mpIntro.state.names.length : 0;
  return Number.isInteger(team) && team >= -1 && team < n;
}

function mpIntroPick(team) {
  team = Number(team);
  if (!mpIntro || !mpIntro.lineup || !mpIntro.state || !mpIntroValidTeam(team)) return;
  if (mpIntro.state.team[mpMyPlayerIdx] === team) return;
  mpIntro.state.team[mpMyPlayerIdx] = team;
  if (mpIntro.mode === 'host') mpIntroBroadcast();
  else mpSendEnvelope({ type: 'ACTION', payload: { action: 'MP_LINEUP_PICK', team } });
  mpIntroRender();
}

// Host powers: move anyone (a tap cycles Unassigned → team 1 → … → Unassigned),
// shuffle, rename.
function mpIntroHostMove(seat) {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.lineup) return;
  const s = mpIntro.state;
  if (!Number.isInteger(seat) || seat < 0 || seat >= s.team.length) return;
  const n = s.names.length;
  s.team[seat] = s.team[seat] + 1 >= n ? -1 : s.team[seat] + 1;
  mpIntroBroadcast();
  mpIntroRender();
}

// Auto-assign: seat everyone still Unassigned, one at a time, into whichever team is smallest
// (random among ties). Players who already picked a side stay put.
function mpIntroHostAutoAssign() {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.lineup) return;
  const s = mpIntro.state, n = s.names.length;
  const counts = Array(n).fill(0);
  s.team.forEach(t => { if (t >= 0 && t < n) counts[t]++; });
  const open = s.team.map((t, i) => (t >= 0 && t < n) ? -1 : i).filter(i => i >= 0);
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  open.forEach(seat => {
    const low = Math.min(...counts);
    const pool = counts.map((c, t) => c === low ? t : -1).filter(t => t >= 0);
    const t = pool[Math.floor(Math.random() * pool.length)];
    s.team[seat] = t; counts[t]++;
  });
  mpIntroBroadcast();
  mpIntroRender();
}

function mpIntroHostRandomise() {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.lineup) return;
  const s = mpIntro.state, n = s.names.length;
  const seats = s.team.map((_, i) => i);
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  seats.forEach((seat, k) => { s.team[seat] = k % n; });
  mpIntroBroadcast();
  mpIntroRender();
}

function mpIntroHostRename(t, name) {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.lineup) return;
  const s = mpIntro.state;
  if (!Number.isInteger(t) || t < 0 || t >= s.names.length) return;
  const clean = String(name == null ? '' : name).trim().slice(0, MP_INTRO_NAME_MAX);
  s.names[t] = clean || mpIntro.lineup.teamNames[t];   // never an empty name — the wire would erase it
  mpIntroBroadcast();
  mpIntroRender();
}

function mpIntroAllReady() {
  return !!mpIntro && !!mpIntro.state && mpIntro.state.ready.every(Boolean);
}

function mpIntroProblem() {
  return mpIntro && mpIntro.state ? mpIntroLineupProblem(mpIntro.state.team, mpIntro.lineup) : null;
}

// Host: Start. `force` waives readiness only (the Start tap's own confirmation has already
// warned the host); it never waives a Line-up rule, and never starts a table that is waiting
// on a dropped seat.
function mpIntroStart(force) {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.state) return false;
  if (mpIntroInBeats()) return false;
  if (!mpIntroAllReady() && !force) return false;
  if (mpIntroProblem()) return false;
  if (mpAwaySeats.size) return false;
  mpIntroFinishHost();
  return true;
}

// The Start tap (SW v271). Once the Line-up is valid the host can start whenever — no waiting for
// every "I'm ready". Two warnings stand in the way, in this order:
//   1. players with no team → offer to auto-assign them, then carry on;
//   2. players not yet confirmed → warn, and start only on a second tap.
function mpIntroConfirm(heading, body, goLabel, backLabel, onGo) {
  const $ = id => document.getElementById(id);
  if (!mpIntro || !$('game-intro-start-overlay')) { onGo(); return; }
  $('game-intro-start-head').textContent = heading;
  $('game-intro-start-sub').textContent  = body;
  $('btn-game-intro-start-go').textContent   = goLabel;
  $('btn-game-intro-start-cancel').textContent = backLabel;
  mpIntro.confirmGo = onGo;
  $('game-intro-start-overlay').style.display = 'flex';
}

function mpIntroPlural(n, one, many) { return n === 1 ? one : many; }

function mpIntroHostStartTap() {
  if (!mpIntro || mpIntro.mode !== 'host' || !mpIntro.state || mpIntroInBeats()) return;
  if (mpIntroProblem() || mpAwaySeats.size) return;
  const go = () => { if (mpIntroStart(true)) playLaunch(); };
  const askReady = () => {
    const n = mpIntro && mpIntro.state ? mpIntro.state.ready.filter(r => !r).length : 0;
    if (!n) { go(); return; }
    mpIntroConfirm('Not everyone is ready',
      `${n} ${mpIntroPlural(n, "player hasn't", "players haven't")} tapped I'm ready yet. Start without ${mpIntroPlural(n, 'them', 'them')}?`,
      'Start anyway', 'Wait', go);
  };
  const unplaced = mpIntro.lineup ? mpIntro.state.team.filter(t => !(t >= 0)).length : 0;
  if (unplaced) {
    mpIntroConfirm('Not everyone has a team',
      `${unplaced} ${mpIntroPlural(unplaced, "player hasn't", "players haven't")} picked a team. Auto-assign ${mpIntroPlural(unplaced, 'them', 'them')} and start?`,
      'Auto-assign and start', 'Back',
      () => { mpIntroHostAutoAssign(); if (!mpIntroProblem()) askReady(); });
  } else askReady();
}

// Settle the WHOLE transition — teams placed, slots reordered, seats re-frozen,
// roster written — THEN send one snapshot, THEN enter the game
// (logic-engine.md § MDLM Patterns: "a packet is a snapshot of state AFTER the move").
function mpIntroFinishHost() {
  const it = mpIntro;
  const lineup = it.lineup;
  let roster = window.mpLobbyRoster || null;
  if (lineup && it.state) {
    const n      = it.state.names.length;
    const placed = mpIntroPlace(it.state.team, n);
    const order  = [];
    for (let t = 0; t < n; t++) placed.forEach((x, i) => { if (x === t) order.push(i); });
    const last = {};
    order.forEach(i => { last[mpPlayerSlots[i].uid] = placed[i]; });
    mpIntroLastTeams = last;
    roster = { teamNames: it.state.names.slice(), playerTeamIdx: order.map(i => placed[i]), captainSlots: null };
    mpPlayerSlots = order.map(i => mpPlayerSlots[i]);
  }
  const uids = mpPlayerSlots.map(s => s.uid);
  mpIntroRefreeze(uids);
  window.mpLobbyRoster = roster;
  mpMyPlayerIdx = Math.max(0, uids.indexOf(window.syllyDeviceUid));
  mpSendEnvelope({ type: 'LOBBY', payload: { action: 'MP_INTRO_DONE', order: uids, roster } });
  const cfg = it.cfg;
  mpIntroStop();
  cfg.onPassThePhone();
}

// The seat freeze moves to MP_INTRO_DONE for a game whose Line-up reorders seats
// (spec § 5.7). Presence started at GAME_START; every per-seat set is re-keyed by uid.
function mpIntroRefreeze(uids) {
  if (mpSeats.length === uids.length && mpSeats.every((u, i) => u === uids[i])) return;
  const old   = mpSeats.slice();
  const remap = set => new Set([...set].map(i => uids.indexOf(old[i])).filter(i => i >= 0));
  mpAwaySeats     = remap(mpAwaySeats);
  mpReleasedSeats = remap(mpReleasedSeats);
  const pending   = [...mpAwayPending.keys()].map(i => uids.indexOf(old[i])).filter(i => i >= 0);
  mpAwayPending.forEach(h => clearTimeout(h));
  mpAwayPending.clear();
  pending.forEach(idx => mpAwayPending.set(idx, setTimeout(() => { mpAwayPending.delete(idx); mpMarkAway(idx); }, MP_AWAY_DEBOUNCE_MS)));
  mpSeats = uids.slice();
  const fb = window.syllyFirebase;
  if (fb && mpActiveRoomCode) { try { fb.set(fb.ref(`rooms/${mpActiveRoomCode}/seats`), mpSeats); } catch (_) {} }
}

// ── Packets ──────────────────────────────────────────────────────────────────
function mpIntroStatePayload() {
  const s = mpIntro.state;
  return { action: 'MP_INTRO_STATE', ready: s.ready.slice(), team: s.team.slice(), names: s.names.slice(), skipped: !!s.skipped };
}

function mpIntroBroadcast() {
  if (!mpIntro || mpIntro.mode !== 'host') return;
  mpSendEnvelope({ type: 'LOBBY', payload: mpIntroStatePayload() });
}

// Host: a seat rejoining while the Intro is open (spec § 5.7) gets the state privately.
function mpIntroSendStateTo(uid) {
  if (!mpIntro || mpIntro.mode !== 'host') return;
  mpSendPrivate(uid, { type: 'LOBBY', payload: mpIntroStatePayload() });
}

function mpIntroSeatOf(uid) {
  return mpPlayerSlots.findIndex(s => s && s.uid === uid);
}

function mpIntroApplyState(p) {
  if (!mpIntro) {
    // A rejoiner (or a client whose GAME_START raced) — open the Intro on the state.
    const cfg = mpActiveGameConfig;
    if (!cfg || !cfg.intro || window.syllyMultiplayerMode !== 'client' || !mpMatchLive) return;
    mpIntroOpen(cfg);
    if (!mpIntro) return;
  }
  const n = mpPlayerSlots.length;
  mpIntro.state = {
    ready:   mpIntroWireArr(p.ready, n, false).map(x => x === true),
    team:    mpIntroWireArr(p.team, n, -1).map(x => (Number.isInteger(Number(x)) ? Number(x) : -1)),
    names:   mpSeatList(p.names).map(String),
    skipped: p.skipped === true,
  };
  if (mpIntro.state.ready[mpMyPlayerIdx]) mpIntro.readySent = true;
  if (mpIntro.state.skipped) mpIntro.beat = mpIntro.copy.lines.length;
  if (mpIntro.waiting || !mpIntro.shown) mpIntroShow();
  else { mpIntroArmBeat(); mpIntroRender(); }
}

function mpIntroApplyDone(p) {
  const order  = mpSeatList(p.order).map(String);
  const bySlot = new Map(mpPlayerSlots.map(s => [s.uid, s]));
  const slots  = order.map(u => bySlot.get(u)).filter(Boolean);
  const myIdx  = slots.findIndex(s => s.uid === window.syllyDeviceUid);
  const cfg    = (mpIntro && mpIntro.cfg) || mpActiveGameConfig;
  mpIntroStop();
  if (myIdx < 0 || slots.length !== order.length || !cfg) {
    const ov = document.getElementById('mp-roster-mismatch-overlay');
    if (ov) ov.style.display = 'flex';
    return;
  }
  mpPlayerSlots = slots;
  mpMyPlayerIdx = myIdx;
  mpSeats       = order.slice();
  window.mpLobbyRoster = mpIntroWireRoster(p.roster, slots.length);
  cfg.onPassThePhone();
}

// From mpHandleEnvelope, BEFORE any per-game routing. Returns true when it consumed
// the envelope — every MP_INTRO_* / MP_LINEUP_* packet is consumed, open or not.
function mpIntroHandleEnvelope(env) {
  const p = env && env.payload;
  const a = p && p.action;
  if (a !== 'MP_INTRO_READY' && a !== 'MP_LINEUP_PICK' && a !== 'MP_INTRO_STATE' && a !== 'MP_INTRO_DONE') return false;
  const host = window.syllyMultiplayerMode === 'host';
  if (env.type === 'ACTION' && host && mpIntro && mpIntro.state) {
    const seat = mpIntroSeatOf(env.originId);
    if (seat < 0) return true;                       // not on the roster — drop
    if (a === 'MP_INTRO_READY') {
      mpIntro.state.ready[seat] = true;
    } else {
      const team = Number(p.team);
      if (!mpIntro.lineup || !mpIntroValidTeam(team)) return true;
      mpIntro.state.team[seat] = team;
    }
    mpIntroBroadcast();
    mpIntroRender();
    return true;
  }
  if (env.type === 'LOBBY' && window.syllyMultiplayerMode === 'client') {
    if (a === 'MP_INTRO_STATE') mpIntroApplyState(p);
    if (a === 'MP_INTRO_DONE')  mpIntroApplyDone(p);
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Render — one function owns every element on screen-game-intro (ui-style.md § The
// Stack, rule 4). Dynamic markup is innerHTML with escaped names; its clicks are
// delegated from mpWireIntro().
// ═══════════════════════════════════════════════════════════════════════════
function mpIntroRender() {
  const it = mpIntro;
  if (!it || !it.shown) return;
  const $ = id => document.getElementById(id);
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? '' : 'none'; };
  const cfg = it.cfg, s = it.state, copy = it.copy;
  const beats = mpIntroInBeats();
  const host = it.mode === 'host', ptp = it.mode === 'ptp';
  const brand = cfg.brandBtnClass || 'bg-stone-700 hover:bg-stone-800';

  $('game-intro-eyebrow').textContent = cfg.gameName || '';

  // Narrator
  show('game-intro-narrator', beats);
  $('game-intro-who').textContent  = [copy.narrator, copy.role].filter(Boolean).join(' · ');
  $('game-intro-line').textContent = beats ? copy.lines[it.beat] : '';
  $('game-intro-beat-count').textContent = beats ? `${it.beat + 1} / ${copy.lines.length}` : '';
  const line = $('game-intro-line');
  if (line && line.classList && beats && it.animBeat !== it.beat) {
    it.animBeat = it.beat;                          // replay only when the line changes
    line.classList.remove('intro-line-enter');
    void line.offsetWidth;
    line.classList.add('intro-line-enter');
  }
  const sc = it.scene;
  if (sc && typeof sc.beat === 'function') {
    const want = beats ? it.beat : -1;
    if (it.sceneBeat !== want) {
      it.sceneBeat = want;                          // set first: a throwing scene is told once, not every render
      try { sc.beat(want, want >= 0 ? copy.lines[want] : ''); } catch (e) { console.warn('[intro] scene.beat', e); }
    }
  }

  // Brief — may vary by seat and (once picked) team
  const myTeam = s && s.team ? s.team[mpMyPlayerIdx] : -1;
  let key = 'default';
  if (typeof cfg.intro.brief === 'function') {
    try { key = cfg.intro.brief(mpMyPlayerIdx, myTeam) || 'default'; } catch (e) { console.warn('[intro] brief', e); }
  }
  const items = copy.briefs[key] || copy.briefs.default || Object.values(copy.briefs)[0] || [];
  show('game-intro-brief', !beats && items.length > 0);
  $('game-intro-brief-list').innerHTML = items.map(t => `<li>${mpIntroEsc(t)}</li>`).join('');

  // Line-up / roll call
  const lineupOn = !beats && !!it.lineup && !!s;
  show('game-intro-lineup-wrap', lineupOn);
  $('game-intro-lineup-prompt').textContent = copy.lineupPrompt || 'Pick a side.';
  $('game-intro-lineup').innerHTML = lineupOn ? mpIntroLineupHtml() : '';
  const rollOn = !beats && !ptp && !it.lineup && !!s;
  show('game-intro-roll', rollOn);
  $('game-intro-roll').innerHTML = rollOn ? mpIntroRollHtml() : '';

  // Controls
  const ready = !!(s && s.ready[mpMyPlayerIdx]);
  const problem = mpIntroProblem();
  const allReady = mpIntroAllReady();
  show('btn-game-intro-skip', beats && (host || ptp));
  show('btn-game-intro-go', !beats && ptp);
  $('btn-game-intro-go').className = `min-h-14 w-full rounded-2xl ${brand} active:scale-95 text-white text-xl font-semibold transition-transform duration-150`;
  show('btn-game-intro-ready', !beats && !ptp && !!s);
  const rb = $('btn-game-intro-ready');
  rb.disabled = ready;
  rb.textContent = ready ? "You're ready" : "I'm ready";
  rb.className = ready
    ? 'min-h-14 w-full rounded-2xl bg-stone-200 text-stone-500 text-xl font-semibold'
    : `min-h-14 w-full rounded-2xl ${brand} active:scale-95 text-white text-xl font-semibold transition-transform duration-150`;
  show('btn-game-intro-shuffle', !beats && host && !!it.lineup);
  show('btn-game-intro-autoassign', !beats && host && !!it.lineup && !!s && s.team.some(t => !(t >= 0)));
  const canStart = !problem && !mpAwaySeats.size;   // readiness and unplaced players are warned about on the tap
  show('btn-game-intro-start', !beats && host);
  const sb = $('btn-game-intro-start');
  sb.disabled = !canStart;
  sb.className = `min-h-14 w-full rounded-2xl ${brand} active:scale-95 text-white text-xl font-semibold transition-transform duration-150${canStart ? '' : ' opacity-50'}`;

  // Status + reason (amber = unavailable — ui-style.md § Mutually-exclusive settings)
  const n = s ? s.ready.length : 0, k = s ? s.ready.filter(Boolean).length : 0;
  let status = '';
  if (beats || ptp) status = '';                  // the narrator card carries its own "tap" hint
  else if (host) status = allReady ? 'Everyone is ready.' : `${k} / ${n} ready — you can start any time.`;
  else status = ready ? `${k} / ${n} ready — waiting for the host to start.` : `${k} / ${n} ready`;
  $('game-intro-status').textContent = status;
  const pr = $('game-intro-problem');
  pr.textContent = (!beats && problem) ? problem : '';
  show('game-intro-problem', !beats && !!problem);
}

function mpIntroChip(seat, opts) {
  const s = mpIntro.state;
  const slot = mpPlayerSlots[seat] || {};
  const me = seat === mpMyPlayerIdx;
  const label = mpIntroEsc(slot.nickname || `Player ${seat + 1}`) + (me ? ' <span class="intro-chip-you">(you)</span>' : '');
  const tag  = mpIntro.copy && mpIntro.copy.readyTag;
  const tick = !s.ready[seat] ? ''
    : tag ? `<span class="intro-chip-stamp" aria-label="ready">${mpIntroEsc(tag)}</span>`
    : '<span class="intro-chip-tick" aria-label="ready">✓</span>';
  const cls = `intro-chip${me ? ' is-me' : ''}${s.ready[seat] ? ' is-ready' : ''}`;
  return opts && opts.movable
    ? `<button type="button" class="${cls}" data-intro-chip="${seat}">${label}${tick}</button>`
    : `<span class="${cls}">${label}${tick}</span>`;
}

function mpIntroLineupHtml() {
  const it = mpIntro, s = it.state, host = it.mode === 'host';
  const myTeam = s.team[mpMyPlayerIdx];
  const col = t => {
    const seats = s.team.map((x, i) => (x === t ? i : -1)).filter(i => i >= 0);
    const head = t < 0
      ? `<p class="intro-col-name">${mpIntroEsc(it.copy.unassigned || 'Unassigned')}</p>`
      : host
        ? `<input class="intro-col-input" data-intro-rename="${t}" maxlength="${MP_INTRO_NAME_MAX}" value="${mpIntroEsc(s.names[t])}" aria-label="Team name">`
        : `<p class="intro-col-name">${mpIntroEsc(s.names[t])}</p>`;
    const chips = seats.map(i => mpIntroChip(i, { movable: host })).join('')
      || '<span class="intro-col-empty">Nobody yet</span>';
    const join = myTeam === t ? ''
      : `<button type="button" class="intro-col-join" data-intro-join="${t}">${t < 0 ? 'Step out' : 'Join'}</button>`;
    return `<div class="intro-col${t < 0 ? ' intro-col-unassigned' : ''}${myTeam === t ? ' is-mine' : ''}">${head}<div class="intro-col-chips">${chips}</div>${join}</div>`;
  };
  const teams = s.names.map((_, t) => col(t)).join('');
  return `<div class="intro-teams">${teams}</div>${col(-1)}`;
}

function mpIntroRollHtml() {
  const s = mpIntro.state;
  const head = mpIntro.copy && mpIntro.copy.rollPrompt
    ? `<p class="intro-roll-prompt">${mpIntroEsc(mpIntro.copy.rollPrompt)}</p>` : '';
  return `${head}<div class="intro-col-chips">${s.ready.map((_, i) => mpIntroChip(i)).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Wiring — its own function so a harness can wire it without DOMContentLoaded.
// Missing-handler audit (spec § 5.5): narrator advance, Skip — local + state;
// Ready — MP_INTRO_READY; Join/Step out — MP_LINEUP_PICK; host move / shuffle /
// rename — host-local + MP_INTRO_STATE; Start / Start anyway — MP_INTRO_DONE;
// ✕ — the Mid-Game Quit Contract (mpNotifyPlayerLeft → resetToLobby).
// ═══════════════════════════════════════════════════════════════════════════
function mpWireIntro() {
  const $ = id => document.getElementById(id);
  $('game-intro-narrator').addEventListener('click', () => { mpIntroAdvance(); });
  $('game-intro-scene').addEventListener('click', () => { mpIntroAdvance(); });   // a tap on the board advances too
  $('btn-game-intro-skip').addEventListener('click', () => { playPillClick(); mpIntroSkip(); });
  $('btn-game-intro-ready').addEventListener('click', () => { playSuccess(); mpIntroReady(); });
  $('btn-game-intro-shuffle').addEventListener('click', () => { playPillClick(); mpIntroHostRandomise(); });
  $('btn-game-intro-autoassign').addEventListener('click', () => { playPillClick(); mpIntroHostAutoAssign(); });
  $('btn-game-intro-start').addEventListener('click', () => { mpIntroHostStartTap(); });
  $('btn-game-intro-start-go').addEventListener('click', () => {
    const f = mpIntro && mpIntro.confirmGo;
    $('game-intro-start-overlay').style.display = 'none';
    if (mpIntro) mpIntro.confirmGo = null;
    if (typeof f === 'function') f();
  });
  $('btn-game-intro-start-cancel').addEventListener('click', () => {
    $('game-intro-start-overlay').style.display = 'none';
    if (mpIntro) mpIntro.confirmGo = null;
  });
  $('btn-game-intro-go').addEventListener('click', () => {
    if (!mpIntro || mpIntro.mode !== 'ptp') return;
    playLaunch();
    const cfg = mpIntro.cfg;
    mpIntroStop();
    cfg.onPassThePhone();
  });
  const lu = $('game-intro-lineup');
  lu.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-intro-join],[data-intro-chip]') : null;
    if (!t || !t.dataset) return;
    if (t.dataset.introJoin !== undefined) { playPillClick(); mpIntroPick(Number(t.dataset.introJoin)); }
    else if (t.dataset.introChip !== undefined) { playPillClick(); mpIntroHostMove(Number(t.dataset.introChip)); }
  });
  lu.addEventListener('change', e => {
    const t = e.target;
    if (t && t.dataset && t.dataset.introRename !== undefined) mpIntroHostRename(Number(t.dataset.introRename), t.value);
  });
  // ✕ — the Intro is part of the match: the normal quit contract.
  $('btn-game-intro-quit').addEventListener('click', () => {
    if (!mpIntro) return;
    playBoing();
    $('game-intro-quit-sub').textContent = mpIntro.mode === 'ptp'
      ? 'Back to the game menu. Nothing has started yet.'
      : 'Everyone heads back to the lobby, and the game ends for the whole room.';
    $('game-intro-quit-overlay').style.display = 'flex';
  });
  $('btn-game-intro-quit-cancel').addEventListener('click', () => {
    playDone();
    $('game-intro-quit-overlay').style.display = 'none';
  });
  $('btn-game-intro-quit-confirm').addEventListener('click', () => {
    playExit();
    $('game-intro-quit-overlay').style.display = 'none';
    if (!mpIntro || mpIntro.mode === 'ptp') {
      const menu = mpIntro && mpIntro.cfg.menuScreen;
      mpIntroStop();
      if (menu) showScreen(menu);
      return;
    }
    mpNotifyPlayerLeft();
    resetToLobby();
  });
  // Tab-away stops the scene's loop; coming back mounts it again.
  document.addEventListener('visibilitychange', () => {
    if (!mpIntro || !mpIntro.shown) return;
    if (document.hidden) mpIntroStopScene();
    else if (!mpIntro.scene) { mpIntroMountScene(); mpIntroRender(); }   // re-sends the beat
  });
}

document.addEventListener('DOMContentLoaded', mpWireIntro);
