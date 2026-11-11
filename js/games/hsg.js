// ═══════════════════════════════════════════════════════════════════════════
// hsg.js — Hide and Shogun (game 22). Two clans, thirty doors, someone behind
// every one. Find their Shogun before they find yours.
// Two players, host-authoritative, hidden information (the closed doors).
//
// ── BUILT SO FAR: S2 (state machine) · S3 (menu, War Council) · S4 (Castle) ─
// ── · S5 (the Intro's scene + the Battle intro) · S6 (both War Chronicles) ──
// ── · S7 (multi-device: the packet layer, the client path) · S8 (bots, Solo) ─
// ── · S9 (reconnect; the moments + HSG_SOUND) ───────────────────────────────
// The Campaign, the host's Command pipeline, the public-copy codec, the masked
// state, and the Castle on one phone: hsgRenderTile (the art seam), the board,
// the bars, the lantern beam, the message card, tap-tap, the two-tap door,
// drag and drop. The Battle intro (toss · battle · replay) and the Intro's
// Storyteller (hsgIntroScene over js/games/hsg-scene.js). The five packets and
// their receivers (hsgHandleEnvelope — S7), proved by tools/verify-hsg-loopback.js.
// The bots' view / decide / submit (S8), proved by tools/verify-hsg-bots.js.
// Reconnect (S9): HSG_STATE is the rejoin snapshot — the loopback's § 9 drops and
// rejoins from every phase. The moments (S9, hsgPlayMoments) and the HSG_SOUND map.
//
// Spec: docs/new-game-tech-hsg.md (§2 state flow, §4 state, §6 scoring, §7
// validation, §11 packets + bots). It wins over the brief.
//
// ── The one idea ────────────────────────────────────────────────────────────
// The host's phone is the Storyteller holding the secret seating chart (hsgB).
// Every device — the host's own included — draws from the PUBLIC COPY (hsgPub),
// which shows opened pieces only; a closed door in it is just '#'. Nothing
// private is ever sent, and no renderer is ever handed hsgB.
//
//   hsgB   the secret      HOST / ONE-PHONE ONLY. Never sent, never rendered.
//   hsgPub the public copy every device. The wire format. Renderers read ONLY this.
//
// ── Rules this file keeps ───────────────────────────────────────────────────
//  1. Appliers take an explicit SEAT and skip every broadcast in 'single' mode
//     (new-game-process.md § Verifying the rules engine) — that is what lets one
//     harness play both seats. Nothing here reads mpMyPlayerIdx to decide who
//     moved. The host's own Command never goes through an ACTION (the engine
//     drops self-sent ACTIONs): it applies directly, then broadcasts.
//  2. A packet is a snapshot AFTER the move. hsgHostCommand settles the whole
//     Command — the strike, the Seal, the Cornered check — and builds hsgPub once.
//  3. Firebase erases every empty value, so hsgPub holds no null / {} / [].
//     Every collection has a fixed length and hsgWirePub() rebuilds it on
//     receipt (the cjarWireArr idea). hsgBuildPub() already returns canonical
//     form, so a pub that survives the wire compares byte-equal to the original.
//  4. Seat and team meet in exactly two places, hsgSeatOfTeam / hsgTeamOfSeat.
//     The engine numbers players by turn order WITHIN a Battle (team 0 moves
//     first); the game numbers them by seat (spec §4). Nothing else ever sees a
//     team number.
//  5. hsgMaskedState(pub) is the ONLY way anything but the host's Command
//     pipeline reads the board's rules: the client lights its moves from it, the
//     bot decides from it (S8) and the host's own screen draws from the pub.
//     Every closed door in it is an opaque [-1, '?', false].
//
// ── Extra host bookkeeping beyond spec §4 ───────────────────────────────────
//   hsgLast / hsgResult  — the last Command and the Battle's result, held so
//     hsgBuildPub() is a pure function of the variables (no argument threading).
//   hsgSeed              — a harness pins the layout shuffle (null = fresh per
//     Battle). The seed never leaves the host and is never put in a packet.
//
// Depends on: js/games/hsg-rules.js (HsgRules — pure),
//             js/games/hsg-scene.js (HsgScene — pure; the Storyteller),
//             engine.js (showScreen — S3 registers the screens),
//             engine-multiplayer.js (mpSendEnvelope, mpSendPrivate, mpPlayerSlots,
//               mpIsBotSlot, mpBotsPrompt, mpBotsCancel, mpSeatLabel, mpUnlockSync)
// Read by: tools/verify-hsg.js, verify-hsg-loopback.js, verify-hsg-bots.js.
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains; ride SETTINGS_SYNC) ─────────────
let hsgCampaignLen = 3;        // 1 | 3 | 5 — Seals to win (1 = Single Battle)
let hsgFoxes       = 4;        // 2 (A Pair) | 4 (A Skulk); A Pair gives each clan 4 Farmers

// ── Roster (set at entry; persist across play-agains) ──────────────────────
let hsgNames       = ['', '']; // per seat — Pass-the-Phone setup, or mpSeatLabel(i)

// ── The secret — HOST / ONE-PHONE ONLY. Never sent, never rendered. ─────────
let hsgB           = null;     // HsgRules battle: { S (engine state incl. the layout), team, over, … }

// ── The public copy — every device holds this and only this ────────────────
let hsgPub         = null;     // the snapshot; the ONLY thing renderers read

// ── Campaign bookkeeping (host / one phone; mirrored into hsgPub) ──────────
let hsgPhase       = 'idle';   // 'idle'|'battle-intro'|'castle'|'ending'|'chronicle'|'gameover'
let hsgBattleNo    = 1;        // a Truce replay keeps the number
let hsgReplay      = false;
let hsgFirstSeat   = 0;        // seat that opens this Battle; flips every Battle, replays included
let hsgSeals       = [0, 0];   // per seat
let hsgWins        = [];       // every Seal won, in order: seat | (clan colour << 1); colour 2 = no banner (hsgWinPack)
let hsgStruck      = [0, 0];   // pieces struck per COLOUR, this Battle (War Chronicle stat)
let hsgLast        = { k: 'none' };     // the last Command — see hsgBuildPub
let hsgResult      = { reason: 'none' };// the Battle's result — see hsgBuildPub
let hsgSeed        = null;     // test hook: pins the layout shuffle; never sent anywhere

// ── UI state (every device; display only) ──────────────────────────────────
let hsgSel         = -1;       // square of the lifted piece, -1 = none
let hsgDoorArmed   = -1;       // square of the lifted door ("Open?"), -1 = none
let hsgFlavourIdx  = 0;        // Battle intro line (host-picked in multi-device)
let hsgTimers      = [];       // EVERY setTimeout handle this game owns — hsgStopTimers() clears all
let hsgNewsFx      = [];       // the last Command's moment keys (HSG_COMMAND_DONE's fx) — the message card's news
let hsgDrag        = null;     // a drag in progress: { from, x0, y0, moved, pid, ghost } — DOM only
let hsgDragEndAt   = 0;        // Date.now() when a drag dropped: swallows the click that follows it
let hsgBattleScene = null;     // the Battle intro's own HsgScene instance (mounted per Battle; stopped on leaving)

// ── Constants ───────────────────────────────────────────────────────────────
const HSG_BATTLE_INTRO_MS = 3500;   // "about 3.5 s, by itself" (spec §2)
const HSG_TOSS_INTRO_MS   = 4500;   // Battle 1: the fan is in the air first, then the verdict needs reading (DD-04)
const HSG_SNAP_MS         = 900;    // the Storyteller snaps his fan and the call appears (Battle N / replay)
const HSG_TOSS_LAND_MS    = 1700;   // …or the tossed fan lands and the call appears (Battle 1)
const HSG_ENDING_MS       = 2400;   // the Found you! / last-lantern / Cornered beat before the Chronicle
// brief §0c — one picked per Battle by the host (its index rides HSG_BATTLE_START)
const HSG_FLAVOUR = [
  'Everyone hide! Ready or not…',
  'The doors are shut. Somebody is giggling behind one.',
  'Thirty doors, two Shoguns, and far too many foxes.',
  'Quietly now. Shoguns are terrible at hiding.',
  'The lamps are lit. The hunt begins.',
];
const HSG_FLAVOUR_LINES   = HSG_FLAVOUR.length;
const HSG_CELLS           = 30;     // 5 × 6

// ═══════════════════════════════════════════════════════════════════════════
// ── Seat ⇄ team: the only place the two numberings meet ────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Team 0 opens the Battle. Both maps are the same swap, so each is its own inverse.
function hsgSeatOfTeam(t, first) { return ((first === undefined ? hsgFirstSeat : first) + t) % 2; }
function hsgTeamOfSeat(s, first) { return (s - (first === undefined ? hsgFirstSeat : first) + 2) % 2; }

// ═══════════════════════════════════════════════════════════════════════════
// ── Timers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function hsgLater(fn, ms) {
  const h = setTimeout(() => {
    hsgTimers = hsgTimers.filter(x => x !== h);
    fn();
  }, ms);
  hsgTimers.push(h);
  return h;
}
function hsgStopTimers() {
  hsgTimers.forEach(h => clearTimeout(h));
  hsgTimers = [];
  hsgClearMoments();               // a moment is removed by a timer: no timer, no moment (S9)
}

// Screens: the ONLY place this file touches routing. S3 registers the IDs.
function hsgGo(id) { if (typeof showScreen === 'function') showScreen(id); }

// ═══════════════════════════════════════════════════════════════════════════
// ── The public copy: canonical form + the wire codec ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Firebase erases null, {} and [] — and returns a sparse array as an OBJECT keyed
// by index. These normalisers read v[i] so both shapes work. 0, false and ''
// are real stored values and survive.
function hsgWireArr(v, n, fill) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = (v && typeof v === 'object') ? v[i] : undefined;
    out[i] = (x === undefined || x === null) ? fill : x;
  }
  return out;
}
function hsgWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]);
  return [];
}
const hsgNum  = (x, d) => (typeof x === 'number' && isFinite(x)) ? x : d;
const hsgStr  = (x, d) => (typeof x === 'string') ? x : d;

// Rebuilds a complete, canonical pub from anything that came off the wire (or
// from hsgBuildPub). Idempotent: hsgWirePub(hsgWirePub(x)) deep-equals hsgWirePub(x).
function hsgWirePub(p) {
  p = (p && typeof p === 'object') ? p : {};
  const last = (p.last && typeof p.last === 'object') ? p.last : {};
  const res  = (p.result && typeof p.result === 'object') ? p.result : {};
  const out = {
    battleNo:    hsgNum(p.battleNo, 1),
    replay:      p.replay === true,
    firstSeat:   hsgNum(p.firstSeat, 0),
    turnSeat:    hsgNum(p.turnSeat, 0),
    cmd:         hsgNum(p.cmd, 0),
    board:       hsgWireArr(p.board, HSG_CELLS, '.').map(c => hsgStr(c, '.')),
    seatCol:     hsgWireArr(p.seatCol, 2, -1),
    guards:      hsgWireArr(p.guards, 2, 0),
    foxesHeld:   hsgWireArr(p.foxesHeld, 2, 0),
    foxTotal:    hsgNum(p.foxTotal, 4),
    quiet:       hsgNum(p.quiet, 0),
    struck:      hsgWireArr(p.struck, 2, 0),
    seals:       hsgWireArr(p.seals, 2, 0),
    wins:        hsgWireList(p.wins).filter(w => typeof w === 'number' && w >= 0 && w <= 5),   // [] is erased in flight → rebuilt here
    campaignLen: hsgNum(p.campaignLen, 3),
    last:        { k: 'none' },
    result:      { reason: 'none' },
  };
  const lk = hsgStr(last.k, 'none');
  // seat = who made it; vid = the piece struck ('' unless a Strike) — both were in the open.
  if (lk !== 'none') out.last = { k: lk, i: hsgNum(last.i, 0), j: hsgNum(last.j, 0), kind: hsgStr(last.kind, ''),
    seat: hsgNum(last.seat, 0), vid: hsgStr(last.vid, '') };
  const rr = hsgStr(res.reason, 'none');
  if (rr !== 'none') {
    out.result = {
      reason:       rr,
      winnerSeat:   hsgNum(res.winnerSeat, -1),
      by:           hsgStr(res.by, ''),
      gekokujo:     res.gekokujo === true,
      counts:       hsgWireArr(res.counts, 2, 0),
      campaignOver: res.campaignOver === true,
    };
  }
  return out;
}

// A board cell string for one engine cell. `pendingSeat` is the seat a fox found
// BEFORE the banners is waiting to side with.
function hsgCellString(cell, pendingSeat) {
  if (cell === null) return '.';
  if (!cell[2]) return '#';                       // a closed door — nothing else about it, ever
  if (cell[0] === HsgRules.NEUTRAL) return 'Fxp' + pendingSeat;
  return cell[1] + cell[0];
}

// Builds the public copy from the host's variables. Pure: reads hsgB and the
// Campaign variables, mutates nothing. The ONLY function that reads a closed
// door, and it reads only whether the door is closed.
function hsgBuildPub() {
  const S = hsgB.S, first = hsgFirstSeat;
  const pendingSeat = new Map();
  S.pending.forEach(([cell, ht]) => pendingSeat.set(cell, hsgSeatOfTeam(ht, first)));
  const seatTeam = s => hsgTeamOfSeat(s, first);
  const col = s => { const c = S.teamCol[seatTeam(s)]; return c === null ? -1 : c; };
  const counts = hsgOpenCounts(S);
  const res = hsgResult.reason === 'none' ? { reason: 'none' } : Object.assign({}, hsgResult, { counts });
  return hsgWirePub({
    battleNo: hsgBattleNo, replay: hsgReplay, firstSeat: first,
    turnSeat: hsgSeatOfTeam(hsgB.team, first),
    cmd: S.cmd,
    board: S.board.map(c => hsgCellString(c, c && pendingSeat.has(c) ? pendingSeat.get(c) : 0)),
    seatCol: [col(0), col(1)],
    guards: [S.dm[0], S.dm[1]],
    foxesHeld: [S.hired[seatTeam(0)], S.hired[seatTeam(1)]],
    foxTotal: S.cfg.hire,
    quiet: S.quiet,
    struck: hsgStruck.slice(),
    seals: hsgSeals.slice(), wins: hsgWins.slice(), campaignLen: hsgCampaignLen,
    last: hsgLast, result: res,
  });
}

// Pieces in the open per COLOUR (a found fox counts for her side; '#' and a fox
// still waiting for the banners count for nobody) — the Last Lantern's rule (spec §6).
function hsgOpenCounts(S) {
  const n = [0, 0];
  S.board.forEach(c => { if (c !== null && c[2] && (c[0] === 0 || c[0] === 1)) n[c[0]]++; });
  return n;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── The masked state: an engine state rebuilt from the public copy ──────────
// ═══════════════════════════════════════════════════════════════════════════
// Every closed door is an opaque [-1, '?', false]. The engine's legality code
// never looks inside one (genActions offers only an Open, pieceStrikes tests
// faceUp first, the Ninja counts a closed door only as a screen, the Guard test
// reads S.dm). verify-hsg.js proves legal(masked) === legal(real) every Command.
function hsgMaskedState(pub) {
  const first = pub.firstSeat;
  const cfg = HsgRules.makeCfg({ hire: pub.foxTotal });
  const teamCol = [null, null], hired = [0, 0];
  for (let s = 0; s < 2; s++) {
    const t = hsgTeamOfSeat(s, first);
    teamCol[t] = pub.seatCol[s] < 0 ? null : pub.seatCol[s];
    hired[t] = pub.foxesHeld[s];
  }
  const pending = [];
  let shrouds = 0;
  const board = pub.board.map(str => {
    if (str === '.') return null;
    if (str === '#') { shrouds++; return [-1, '?', false]; }
    if (str.indexOf('Fxp') === 0) {
      const cell = [HsgRules.NEUTRAL, 'Fx', true];
      pending.push([cell, hsgTeamOfSeat(+str.slice(3), first)]);
      return cell;
    }
    return [+str.slice(2), str.slice(0, 2), true];
  });
  return { board, teamCol, dm: [pub.guards[0], pub.guards[1]], quiet: pub.quiet, pool: {}, cmd: pub.cmd, cfg,
    shrouds, hired, pending };
}

// A seat's legal Commands from the public copy alone: what a client lights up.
// Same answer as the host's engine (before the banners a seat can only Open).
function hsgLegalFor(pub, seat) {
  const S = hsgMaskedState(pub);
  const acts = HsgRules.battleLegal({ S, team: hsgTeamOfSeat(seat, pub.firstSeat), over: null });
  return pub.pracFilter ? acts.filter(pub.pracFilter) : acts;   // Practice only (S11): keeps a lesson on its board and goal
}

// ═══════════════════════════════════════════════════════════════════════════
// ── The Campaign ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const hsgIsHost = () => window.syllyMultiplayerMode === 'host';

// Roster at entry. Multi-device and Solo take names from the lobby; one phone
// fills hsgNames from its setup screen before calling hsgStartCampaign().
function hsgOnEnter() {
  const mode = window.syllyMultiplayerMode;
  if (mode === 'single') { hsgGo('screen-hsg-setup'); return; }
  hsgNames = [0, 1].map(i => mpSeatLabel(i));
  // A client holds nothing until the host's HSG_BATTLE_START: clear what a previous
  // match (a Play Again in the same room) left behind, then wait. Safe to re-run.
  if (mode === 'client') { hsgTeardown(); hsgGo('screen-hsg-standby'); return; }
  hsgStartCampaign();
}

// A fresh Campaign: Seals cleared, Battle 1, the fan tossed again.
// (New Campaign on one phone, and the host's first Battle.)
function hsgStartCampaign() {
  hsgSeals = [0, 0]; hsgWins = [];
  hsgBattleNo = 1;
  hsgReplay = false;
  hsgFirstSeat = Math.random() < 0.5 ? 0 : 1;     // the Storyteller's fan toss
  hsgStartBattle();
}

// Deals a new Battle (the layout is shuffled here, on the host, from a seed that
// never leaves it), shows the Battle intro, and — in multi-device — tells the
// other phone. Does NOT touch Campaign counters: hsgStartCampaign and
// hsgHostNextBattle set them first.
function hsgStartBattle() {
  hsgStopTimers();
  const cfg = HsgRules.makeCfg({ hire: hsgFoxes });
  const rng = HsgRules.makeRng(hsgSeed === null ? undefined : (hsgSeed + hsgBattleNo * 977 + (hsgReplay ? 1 : 0)) >>> 0);
  hsgB = HsgRules.newBattle(cfg, rng);
  hsgStruck = [0, 0];
  hsgLast = { k: 'none' };
  hsgResult = { reason: 'none' };
  hsgSel = -1; hsgDoorArmed = -1; hsgNewsFx = [];
  hsgFlavourIdx = Math.floor(Math.random() * HSG_FLAVOUR_LINES);
  hsgPhase = 'battle-intro';
  hsgPub = hsgBuildPub();
  if (hsgIsHost()) mpSendEnvelope({ type: 'SYNC', payload: { action: 'HSG_BATTLE_START', pub: hsgPub, flavourIdx: hsgFlavourIdx } });
  hsgShowBattleIntro();
}

// Paints and shows the Battle intro from hsgPub + hsgFlavourIdx, and schedules its
// two beats: the fan snap (sound — the picture is CSS on the same number) and the
// end. Every device runs this itself — the client from HSG_BATTLE_START (S7) — so
// the timing is a pure function of the pub (hsgBattleIntroMs) and nothing is sent.
function hsgShowBattleIntro() {
  const bi = hsgBattleIntroText(hsgPub, hsgFlavourIdx);
  hsgPaintBattleIntro(bi);
  hsgGo('screen-hsg-battle-intro');
  hsgLater(() => { if (hsgPhase === 'battle-intro') hsgSound('fan'); }, bi.snapMs);
  hsgLater(hsgBattleIntroDone, bi.ms);
}

// The Battle intro's words and timing — pure, from the public copy alone (spec §2
// sub-states: toss · battle · replay). Battle 1 of a Campaign is the fan toss; a
// Truce replay keeps the Battle number and says "again".
function hsgBattleIntroText(pub, flavourIdx) {
  const state = pub.replay ? 'replay' : pub.battleNo === 1 ? 'toss' : 'battle';
  const who = hsgName(pub.firstSeat);
  const idx = Number.isInteger(flavourIdx) && flavourIdx >= 0 && flavourIdx < HSG_FLAVOUR_LINES ? flavourIdx : 0;
  return {
    state,
    title:   'Battle ' + pub.battleNo + (state === 'replay' ? ', again' : ''),
    flavour: state === 'toss'   ? 'Ahem! Who goes first? The fan decides…'
           : state === 'replay' ? 'A Truce! Everyone back behind the doors.'
           : HSG_FLAVOUR[idx],
    call:    state === 'toss'   ? 'It lands on ' + who + '. ' + who + ' opens the first door.'
           : state === 'replay' ? who + ' opens the first door this time.'
           : who + ' opens the first door.',
    ms:      hsgBattleIntroMs(pub),
    snapMs:  state === 'toss' ? HSG_TOSS_LAND_MS : HSG_SNAP_MS,
  };
}
function hsgBattleIntroMs(pub) {
  return (!pub.replay && pub.battleNo === 1) ? HSG_TOSS_INTRO_MS : HSG_BATTLE_INTRO_MS;
}

// The host's Battle intro ends (each device runs its own timer; nothing is sent).
function hsgBattleIntroDone() {
  if (hsgPhase !== 'battle-intro') return;
  hsgStopBattleScene();
  hsgPhase = 'castle';
  hsgRenderCastle();                               // painted before it is shown
  hsgGo('screen-hsg-castle');
  hsgOpenCommand();
}

// Next Battle / Replay the Battle. EITHER player may tap it: the first tap wins
// (spec §17 #8). `tag` is the { battleNo, replay } the tapper was looking at —
// a double start is refused because the first one changes both. Host / one phone.
// Refused for a client seat in a lobby → privately repaired with HSG_STATE, which
// releases the sync lock its tap took (the same contract as hsgHostCommand).
function hsgHostNextBattle(seat, tag) {
  if (seat !== 0 && seat !== 1) return { ok: false, why: 'seat' };
  const refuse = why => { hsgRepairSeat(seat); return { ok: false, why }; };
  if (hsgPhase !== 'chronicle') return refuse('phase');
  if (tag && (tag.battleNo !== hsgBattleNo || tag.replay !== hsgReplay)) return refuse('stale');
  hsgReplay = hsgResult.reason === 'truce';       // a Truce keeps the Battle number
  if (!hsgReplay) hsgBattleNo++;
  hsgFirstSeat = 1 - hsgFirstSeat;                // alternates every Battle, replays included
  hsgStartBattle();
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// ── A Command (host / one phone) ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// hsgHostCommand(seat, act[, cmd]) → { ok, why?, over? }
//   seat — whose Command it claims to be. A client's seat comes from the
//          envelope's originId, resolved by the packet layer (S7), never from
//          the payload. act — the engine's action array: ['U',i] ['M',i,j]
//          ['C',i,j] ['S',i,j,kind]. cmd — the tag the sender was looking at
//          (omit on the host's own taps and a bot's, which read live state).
// Refused (and, for a client seat in a lobby, privately repaired with HSG_STATE
// — which also releases that phone's sync lock) when: not that seat's turn, a
// stale tag, the action isn't legal, or no Battle is on (spec §7).
function hsgHostCommand(seat, act, cmd) {
  const refuse = why => { hsgRepairSeat(seat); return { ok: false, why }; };
  if (!hsgB || (hsgPhase !== 'castle' && hsgPhase !== 'battle-intro')) return refuse('phase');
  if (hsgB.over) return refuse('over');
  if (seat !== hsgPub.turnSeat) return refuse('turn');
  if (cmd !== undefined && cmd !== hsgPub.cmd) return refuse('stale');
  if (!Array.isArray(act) || !HsgRules.battleLegal(hsgB).some(a => hsgSameAct(a, act))) return refuse('illegal');

  const B = hsgB;
  const before = hsgPub, wasCastle = hsgPhase === 'castle';      // the moments play from the two snapshots
  const victimCell = act[0] === 'S' ? B.S.board[act[2]] : null;   // colour before it leaves the board
  const out = HsgRules.battleStep(B, act);
  const fx = [];
  for (const ev of out.events) {
    if (ev.t === 'banners') fx.push('banners');
    else if (ev.t === 'fox') fx.push('fox:' + hsgSeatOfTeam(ev.by) + ':' + (ev.capped ? 1 : 0));
  }
  if (victimCell) {
    if (victimCell[0] === 0 || victimCell[0] === 1) hsgStruck[victimCell[0]]++;
    if (victimCell[1] === 'Gd') fx.push('guardFall:' + victimCell[0]);
  }
  hsgLast = act[0] === 'U' ? { k: 'U', i: act[1], j: act[1], kind: '', seat, vid: '' }
          : { k: act[0], i: act[1], j: act[2], kind: act[0] === 'S' ? act[3] : '', seat, vid: victimCell ? victimCell[1] : '' };
  hsgSel = -1; hsgDoorArmed = -1;
  hsgNewsFx = fx;

  // Then, in this order (spec §6): a Shogun struck → the Last Lantern → is the
  // player to move Cornered? battleStep already did the first two; the third is ours.
  if (!out.over) HsgRules.battleCheckCornered(B);
  if (B.over) hsgEndBattle(hsgResultOf(B.over));
  hsgPub = hsgBuildPub();                          // ONE snapshot, after everything settled
  if (hsgIsHost()) mpSendEnvelope({ type: 'SYNC', payload: { action: 'HSG_COMMAND_DONE', pub: hsgPub, act: act, fx: fx } });
  hsgRenderCastle();                               // the host's own screen draws the pub, like everyone's
  if (wasCastle) hsgPlayMoments(before, hsgPub, fx);
  if (!B.over) hsgOpenCommand();
  return { ok: true, over: !!B.over, fx };
}

const hsgSameAct = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Engine result → the pub's result (seats, not teams). Counts are filled by
// hsgBuildPub from the board, so they are right for every reason.
function hsgResultOf(o) {
  const win = o.winner;                            // team index, or -1 for a Truce
  const r = { reason: o.reason, winnerSeat: win < 0 ? -1 : hsgSeatOfTeam(win), by: '', gekokujo: false,
    counts: [0, 0], campaignOver: false };
  if (o.reason === 'shogun') { r.by = o.sgBy; r.gekokujo = o.sgBy === 'Fm'; }
  return r;
}

// Awards the Seal, decides whether the Campaign is won, and schedules the ending
// beat. Host / one phone only; hsgHostCommand builds the snapshot afterwards.
function hsgEndBattle(result) {
  if (hsgPhase === 'ending') return;               // idempotent: a Battle ends once
  if (result.winnerSeat >= 0) {
    hsgSeals[result.winnerSeat]++;
    // The Seal is struck in the colour of the clan it was won as — a seat's clan changes Battle to Battle.
    const tc = hsgB ? hsgB.S.teamCol[hsgTeamOfSeat(result.winnerSeat, hsgFirstSeat)] : null;
    hsgWins.push(hsgWinPack(result.winnerSeat, tc === null || tc === undefined ? -1 : tc));
  }
  result.campaignOver = hsgSeals.some(n => n >= hsgCampaignLen);
  hsgResult = result;
  hsgPhase = 'ending';
  hsgStopTimers();                                 // an intro still running has nothing left to do
  if (typeof mpBotsCancel === 'function') mpBotsCancel();
  hsgLater(hsgFinishEnding, HSG_ENDING_MS);
}

// The ending beat is over: the War Chronicle between Battles, or the last one.
// Reads the PUB's result, not hsgResult — a client runs this too and holds only the pub.
function hsgFinishEnding() {
  if (hsgPhase !== 'ending' || !hsgPub) return;
  hsgPhase = hsgPub.result.campaignOver ? 'gameover' : 'chronicle';
  hsgPaintChronicle(hsgPhase === 'gameover');
  hsgGo(hsgPhase === 'gameover' ? 'screen-hsg-gameover' : 'screen-hsg-chronicle');
}

// The single place a Command opens on the host: if the seat to move is a bot,
// prompt it. Runs when the Battle intro ends and after every Command that
// doesn't end the Battle. (A two-seat game with a bot has no client, so no
// client Command ever races a bot's.)
function hsgOpenCommand() {
  if (!hsgIsHost() || hsgPhase !== 'castle' || !hsgPub || hsgPub.result.reason !== 'none') return;
  const seat = hsgPub.turnSeat;
  if (typeof mpIsBotSlot === 'function' && mpIsBotSlot(mpPlayerSlots[seat]) && typeof mpBotsPrompt === 'function') {
    mpBotsPrompt(hsgPub.cmd, [seat]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Bots (S8, spec §11 § Bots) — view → decide → submit ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// The engine owns the timers (mpBotsPrompt); the game owns what a bot may see,
// how it thinks, and the one record path its Command takes. Suite level →
// prototype bot: Easy = easy, Medium = cautious, Hard = search3 (HsgRules.BOT_LEVELS).
const HSG_BOT_THINK = { easy: [700, 1200], medium: [900, 1600], hard: [1100, 2000] };

function hsgBotThinkMs(d, rng) {
  const r = HSG_BOT_THINK[d] || HSG_BOT_THINK.medium;
  return r[0] + rng() * (r[1] - r[0]);
}

// The seat's view: the public snapshot, plus the UNSEEN COUNTS (S.pool — how many
// of each piece of each colour are still behind doors; anyone who has watched
// every door open could work it out). Never a door's contents, never the seed.
// A copy, not a reference: decide runs a think-time later, after hsgB has moved on.
function hsgBotView(i) {
  const unseen = {};
  if (hsgB) Object.keys(hsgB.S.pool).forEach(k => { unseen[k] = hsgB.S.pool[k]; });
  return { me: i, pub: hsgWirePub(hsgPub), unseen };
}

// The engine hands decide a bare () => float; HsgRules.choose wants the
// prototype's rng object. Same stream, nothing else read.
function hsgBotRng(rnd) {
  const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  return {
    random: rnd,
    choice: arr => arr[Math.floor(rnd() * arr.length)],
    shuffle,
    sample: (arr, k) => shuffle(arr.slice()).slice(0, k),
  };
}

// PURE: reads only the view. Builds the masked state (every closed door an
// opaque [-1,'?',false]), restores the unseen counts, and asks the engine's bot.
// choose() reads a closed cell's contents only in evaluate(), which runs only
// once no door is left closed — so the mask is never the thing it reasons about.
function hsgBotDecide(view, difficulty, rng) {
  const S = hsgMaskedState(view.pub);
  S.pool = Object.assign({}, view.unseen);
  const bot = HsgRules.BOTS[HsgRules.BOT_LEVELS[difficulty] || 'cautious'];
  return HsgRules.choose(S, hsgTeamOfSeat(view.me, view.pub.firstSeat), hsgBotRng(rng), bot);
}

// The host's own record path, like its taps. A stale tag (the board moved on
// while the bot thought) is dropped silently — hsgRepairSeat has nothing to
// repair for a bot, and the bot that is current has already been prompted.
function hsgBotSubmit(i, move, tag) {
  if (!hsgPub || tag !== hsgPub.cmd || hsgPhase !== 'castle' || !Array.isArray(move)) return false;
  return hsgHostCommand(i, move).ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Host → one seat: HSG_STATE ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// The phase a rejoiner needs (spec §11): mid-Battle-intro skips the intro. The
// ending beat of a Battle that won the Campaign is the GAMEOVER, not a Chronicle —
// the S6 draft said 'chronicle' for every ending, which would have stranded a
// rejoiner on the between-Battles screen with a Next Battle the host refuses.
function hsgPhaseForWire() {
  if (hsgPhase === 'gameover') return 'gameover';
  if (hsgPhase === 'ending') return hsgResult.campaignOver ? 'gameover' : 'chronicle';
  if (hsgPhase === 'chronicle') return 'chronicle';
  return 'castle';
}
// reconnect.sendState(idx), and the repair after a refused Command. The whole
// state is one small public snapshot, the same for both seats — nothing to strip.
function hsgSendState(idx) {
  if (!hsgIsHost() || !hsgPub) return;
  const slot = mpPlayerSlots[idx];
  if (!slot || (typeof mpIsBotSlot === 'function' && mpIsBotSlot(slot))) return;
  mpSendPrivate(slot.uid, { type: 'SYNC', payload: { action: 'HSG_STATE', pub: hsgPub, phase: hsgPhaseForWire() } });
}
// A refused Command from a CLIENT seat gets the truth back. The host's own taps
// need nothing (its screen already draws hsgPub), and a bot has no queue.
function hsgRepairSeat(seat) {
  if (!hsgIsHost() || !hsgPub) return;
  if (seat !== 0 && seat !== 1) return;
  if (seat === mpMyPlayerIdx) return;
  hsgSendState(seat);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S7 — Multi-device: the packet layer ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Two client ACTIONs in, three host SYNCs out (spec §11).
//   HOST    takes a sender's seat from the envelope's originId — never from the
//           payload — and hands it to the same appliers its own taps use. Every
//           refusal repairs that seat privately (HSG_STATE), which also releases
//           the sync lock its tap took.
//   CLIENT  applies whole snapshots only, each through hsgWirePub. The snapshot
//           wins over whatever is on screen — except over a NEWER snapshot of the
//           same Battle: the public channel (BATTLE_START, COMMAND_DONE) and the
//           private one (STATE) are not ordered against each other.
// Every function reached from here is inside the router's try/catch, and a throw
// is a console.warn (logic-engine.md: a swallow needs an observable side effect).

// A sender's seat: its uid's index in mpPlayerSlots. -1 = not seated — dropped.
function hsgSeatOf(originId) {
  if (!originId || typeof mpPlayerSlots === 'undefined' || !mpPlayerSlots) return -1;
  for (let i = 0; i < 2; i++) if (mpPlayerSlots[i] && mpPlayerSlots[i].uid === originId) return i;
  return -1;
}

// The same Battle. A Truce replay keeps battleNo and replay, but the first move
// flips every Battle, so the three together tell consecutive Battles apart.
const hsgSameBattle = (a, b) => !!a && !!b && a.battleNo === b.battleNo && a.replay === b.replay && a.firstSeat === b.firstSeat;
// Older than what this phone holds: the same Battle with fewer Commands, or the
// same Command again once this phone already has the Battle's result.
const hsgIsStale = pub => hsgSameBattle(hsgPub, pub)
  && (pub.cmd < hsgPub.cmd || (pub.cmd === hsgPub.cmd && hsgPub.result.reason !== 'none'));

function hsgHandleEnvelope(env) {
  if (!env || !env.payload || !env.payload.action) return;
  const p = env.payload, a = p.action;
  try {
    if (env.type === 'ACTION') { hsgHandleAction(a, p, env.originId); return; }
    if (env.type === 'SYNC' && window.syllyMultiplayerMode === 'client') hsgHandleSync(a, p);
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) console.warn('[hsg] ' + a, e);
  }
}

// Host only (Firebase indexes every write to /events, so a client sees ACTIONs too).
function hsgHandleAction(a, p, originId) {
  if (window.syllyMultiplayerMode !== 'host') return;
  const seat = hsgSeatOf(originId);
  if (seat < 0) return;
  if (a === 'HSG_COMMAND') {
    // A missing tag is a stale one (-1 never matches), never "skip the check".
    hsgHostCommand(seat, hsgWireList(p.act), typeof p.cmd === 'number' ? p.cmd : -1);
  } else if (a === 'HSG_NEXT_BATTLE') {
    hsgHostNextBattle(seat, { battleNo: hsgNum(p.battleNo, -1), replay: p.replay === true });
  }
}

function hsgHandleSync(a, p) {
  if (a === 'HSG_BATTLE_START')      hsgApplyBattleStart(hsgWirePub(p.pub), p.flavourIdx);
  else if (a === 'HSG_COMMAND_DONE') hsgApplyCommandDone(hsgWirePub(p.pub), hsgWireList(p.fx));
  else if (a === 'HSG_STATE')        hsgApplyState(hsgWirePub(p.pub), hsgStr(p.phase, 'castle'));
}

const hsgUnlock = () => { if (typeof mpUnlockSync === 'function') mpUnlockSync(); };

// Take a snapshot as this phone's own. The Campaign counters are mirrored so a
// client's variables say what its screen says (renderers still read only the pub).
function hsgTakePub(pub) {
  hsgPub = pub;
  hsgBattleNo = pub.battleNo; hsgReplay = pub.replay; hsgFirstSeat = pub.firstSeat;
  hsgSeals = pub.seals.slice(); hsgWins = pub.wins.slice();
  hsgSel = -1; hsgDoorArmed = -1;
}

// The client's Castle, from wherever it was (a missed start, a repair, the intro).
function hsgEnterCastle() {
  hsgStopTimers();
  hsgStopBattleScene();
  hsgPhase = 'castle';
  hsgRenderCastle();
  hsgGo('screen-hsg-castle');
}

// The client's ending beat: the same 2.4 s as the host's, off the same snapshot.
function hsgClientEnding() {
  hsgStopTimers();
  hsgStopBattleScene();
  hsgDragCancel();
  hsgPhase = 'ending';
  hsgRenderCastle();
  hsgGo('screen-hsg-castle');
  hsgLater(hsgFinishEnding, HSG_ENDING_MS);
}

// HSG_BATTLE_START — a new Battle: this phone runs its own Battle intro.
function hsgApplyBattleStart(pub, flavourIdx) {
  hsgUnlock();
  if (hsgSameBattle(hsgPub, pub)) return;          // a repair already put this Battle on screen
  hsgStopTimers();
  hsgDragCancel();
  hsgTakePub(pub);
  hsgFlavourIdx = Number.isInteger(flavourIdx) ? flavourIdx : 0;   // hsgBattleIntroText range-checks it
  hsgNewsFx = [];
  hsgPhase = 'battle-intro';
  hsgShowBattleIntro();
}

// HSG_COMMAND_DONE — after every Command: redraw, or the ending beat.
function hsgApplyCommandDone(pub, fx) {
  hsgUnlock();
  if (hsgIsStale(pub)) return;
  const before = hsgPub, wasCastle = hsgPhase === 'castle';
  hsgDragCancel();
  hsgTakePub(pub);
  hsgNewsFx = fx.filter(k => typeof k === 'string');
  if (pub.result.reason !== 'none') {
    hsgClientEnding();
    if (wasCastle) hsgPlayMoments(before, pub, hsgNewsFx);
    return;
  }
  if (hsgPhase === 'battle-intro') return;         // the intro ends on its own timer and draws this board
  if (hsgPhase === 'castle') { hsgRenderCastle(); hsgPlayMoments(before, pub, hsgNewsFx); }
  else hsgEnterCastle();                           // a missed HSG_BATTLE_START: the snapshot is the Battle
}

// HSG_STATE — the private repair after a refused ACTION (and, from S9, a rejoin).
function hsgApplyState(pub, phase) {
  hsgUnlock();
  if (hsgIsStale(pub)) return;
  const same = hsgSameBattle(hsgPub, pub);
  if (!same) hsgNewsFx = [];
  hsgTakePub(pub);
  if (phase === 'chronicle' || phase === 'gameover') {
    if (same && hsgPhase === 'ending') return;     // its own ending beat is already on the way there
    hsgStopTimers();
    hsgStopBattleScene();
    hsgPhase = phase;
    hsgPaintChronicle(phase === 'gameover');
    hsgGo(phase === 'gameover' ? 'screen-hsg-gameover' : 'screen-hsg-chronicle');
    return;
  }
  if (same && hsgPhase === 'battle-intro') return; // the intro is already playing this Battle
  if (hsgPhase === 'castle') hsgRenderCastle();
  else hsgEnterCastle();
}

// The client's Next Battle / Replay the Battle: ask, with the tag it was looking at.
function hsgClientNextBattle() {
  if (hsgPhase !== 'chronicle' || !hsgPub || window.syllySyncLocked) return;
  mpLockSync();
  mpSendEnvelope({ type: 'ACTION', payload: { action: 'HSG_NEXT_BATTLE', battleNo: hsgPub.battleNo, replay: hsgPub.replay } });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Teardown (resetToLobby / quit-confirm) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Settings (hsgCampaignLen, hsgFoxes) persist. S3 wires this into resetToLobby().
function hsgTeardown() {
  hsgStopTimers();
  hsgPracStop(); hsgPracLesson = -1; hsgPracS = null;
  hsgStopBattleScene();
  hsgB = null; hsgPub = null; hsgPhase = 'idle';
  hsgSel = -1; hsgDoorArmed = -1;
  hsgSeals = [0, 0]; hsgWins = []; hsgBattleNo = 1; hsgReplay = false;
  hsgStruck = [0, 0]; hsgLast = { k: 'none' }; hsgResult = { reason: 'none' };
  hsgNewsFx = [];
  hsgDragCancel();
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S4 — The Castle: what a tap MEANS (pure — verify-hsg.js drives these) ───
// ═══════════════════════════════════════════════════════════════════════════
// These decide legality, so they live with the rules, not the DOM
// (new-game-checklist: "scope the harness by what a function DECIDES"). Each
// reads only the public copy it is handed — never hsgB.

// Who taps on this phone. One phone: whoever's Command it is (the phone lies
// flat between them). Multi-device / Solo: this phone's own seat.
function hsgCommanderSeat() {
  if (window.syllyMultiplayerMode === 'single') return hsgPub ? hsgPub.turnSeat : 0;
  return typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0;
}
// Whose bar sits at the bottom. One phone: fixed to the first name entered —
// nothing flips. Multi-device / Solo: always your own.
function hsgBottomSeat() {
  if (window.syllyMultiplayerMode === 'single') return 0;
  return typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0;
}

// A board cell string → what is drawn there. `assetId` is the art seam's key:
// the piece id + colour ('Sg1'); a fox found before the banners is 'Fx2'.
function hsgCellInfo(cell) {
  if (cell === '#') return { kind: 'door', id: '', col: -1, pending: -1, assetId: 'door' };
  if (typeof cell !== 'string' || cell.length < 3) return { kind: 'empty', id: '', col: -1, pending: -1, assetId: '' };
  if (cell.indexOf('Fxp') === 0) return { kind: 'piece', id: 'Fx', col: -1, pending: +cell.slice(3), assetId: 'Fx2' };
  return { kind: 'piece', id: cell.slice(0, 2), col: +cell.slice(2), pending: -1, assetId: cell };
}

// One of THIS seat's pieces in the open (a fox that has sided with you included;
// one still waiting for the banners belongs to nobody yet).
function hsgIsOwnPiece(pub, seat, i) {
  if (!pub) return false;
  const inf = hsgCellInfo(pub.board[i]);
  return inf.kind === 'piece' && inf.col >= 0 && inf.col === pub.seatCol[seat];
}

const hsgRowCol = i => [Math.floor(i / 5), i % 5];
// The direction a Charge travels: 'd' 'u' 'r' 'l' (the chevrons point that way).
function hsgDirOf(i, j) {
  const [ri, ci] = hsgRowCol(i), [rj, cj] = hsgRowCol(j);
  if (rj > ri && cj === ci) return 'd';
  if (rj < ri && cj === ci) return 'u';
  if (cj > ci && rj === ri) return 'r';
  if (cj < ci && rj === ri) return 'l';
  return '';
}
// The piece a Leap jumps: the first occupied square between i and j.
function hsgScreenOf(board, i, j) {
  const [ri, ci] = hsgRowCol(i), [rj, cj] = hsgRowCol(j);
  const dr = Math.sign(rj - ri), dc = Math.sign(cj - ci);
  let r = ri + dr, c = ci + dc;
  while (r !== rj || c !== cj) {
    if (board[r * 5 + c] !== '.') return r * 5 + c;
    r += dr; c += dc;
  }
  return -1;
}

// The lifted piece's marks, shape-coded, from its LEGAL Commands only:
//   dot  March · chev  Charge · strike  up close · diag  the Monk's diagonal ·
//   volley  the Archer · leap  the Ninja (and `screens` = the piece it jumps).
// → { marks: { [square]: { mark, dir } }, screens: [square], acts: [action] }
function hsgMarksFor(pub, seat, sel) {
  const out = { marks: {}, screens: [], acts: [] };
  if (!pub || sel < 0 || !hsgIsOwnPiece(pub, seat, sel)) return out;
  const id = hsgCellInfo(pub.board[sel]).id;
  out.acts = hsgLegalFor(pub, seat).filter(a => a[0] !== 'U' && a[1] === sel);
  out.acts.forEach(a => {
    const j = a[2];
    let mark;
    if (a[0] === 'M') mark = 'dot';
    else if (a[0] === 'C') mark = 'chev';
    else if (a[3] === 'v') mark = 'volley';
    else if (a[3] === 'l') { mark = 'leap'; const s = hsgScreenOf(pub.board, sel, j); if (s >= 0) out.screens.push(s); }
    else mark = id === 'Mk' ? 'diag' : 'strike';
    out.marks[j] = { mark, dir: hsgDirOf(sel, j) };
  });
  return out;
}

// One tap on square i, for `seat`, with `sel` (a lifted piece) and `armed` (a
// lifted door) as they stand. → { sel, armed, act } — act is the engine action
// to send, or null. Brief §14: only legal squares light up; anything else just
// puts the piece down. A door takes two taps on the SAME door; no popup.
function hsgTapDecide(pub, seat, sel, armed, i) {
  const none = { sel: -1, armed: -1, act: null };
  if (!pub || pub.result.reason !== 'none' || pub.turnSeat !== seat) return { sel, armed, act: null };  // read-only
  if (i < 0 || i >= HSG_CELLS) return none;
  const legal = hsgLegalFor(pub, seat);
  if (pub.board[i] === '#') {
    if (armed !== i) return { sel: -1, armed: i, act: null };            // lift it: "Open?"
    const a = legal.find(x => x[0] === 'U' && x[1] === i);
    return { sel: -1, armed: -1, act: a || null };                       // the second tap opens it
  }
  if (sel >= 0) {
    const a = legal.find(x => x[0] !== 'U' && x[1] === sel && x[2] === i);
    if (a) return { sel: -1, armed: -1, act: a };
  }
  if (hsgIsOwnPiece(pub, seat, i)) return { sel: sel === i ? -1 : i, armed: -1, act: null };
  return none;
}

// ── The message card's words (pure: pub + names → [title, sub]) ──────────────
const HSG_CLAN  = { 0: 'Indigo Moon', 1: 'Crimson Sun' };
const HSG_SHORT = { 0: 'Indigo', 1: 'Crimson' };
const hsgName = s => (hsgNames[s] || ('Lord ' + (s + 1)));
const hsgPoss = s => hsgName(s) + '’s';
const hsgTypeName = id => HsgRules.TYPE_NAME[id] || id;

// "Priya’s Monk just marched." — what the last Command was, so the player who
// looked away can see what happened (brief §14).
function hsgLastText(pub) {
  const L = pub.last;
  if (!L || L.k === 'none') return '';
  const who = hsgName(L.seat);
  if (L.k === 'U') {
    const inf = hsgCellInfo(pub.board[L.j]);
    if (inf.id === 'Fx') return who + ' just found a fox.';
    if (inf.kind !== 'piece') return who + ' just opened a door.';
    return who + ' just found ' + (inf.col === 0 ? 'an Indigo ' : 'a Crimson ') + hsgTypeName(inf.id) + '.';
  }
  const at = hsgCellInfo(pub.board[L.k === 'S' && L.kind === 'v' ? L.i : L.j]);
  const piece = at.kind === 'piece' ? hsgTypeName(at.id) : 'piece';
  if (L.k === 'M') return hsgPoss(L.seat) + ' ' + piece + ' just marched.';
  if (L.k === 'C') return hsgPoss(L.seat) + ' ' + piece + ' just charged.';
  const victim = L.vid === 'Fx' ? 'a fox' : 'a ' + hsgTypeName(L.vid);
  const verb = L.kind === 'v' ? ' just shot ' : L.kind === 'l' ? ' just leapt onto ' : ' just struck ';
  return hsgPoss(L.seat) + ' ' + piece + verb + victim + '.';
}

// The last Command's moment, in words (S9 adds the pictures).
function hsgNewsText(pub, fx) {
  const list = fx || [];
  if (list.indexOf('banners') >= 0) {
    const crim = pub.seatCol[0] === 1 ? 0 : 1;
    return ['“The banners are raised!”', hsgName(crim) + ' is Crimson Sun. ' + hsgName(1 - crim) + ' is Indigo Moon.'];
  }
  const fox = list.find(k => k.indexOf('fox:') === 0);
  if (fox) {
    const parts = fox.split(':'), r = +parts[1], capped = parts[2] === '1';
    const share = Math.floor(pub.foxTotal / 2), held = pub.foxesHeld[r];
    let sub;
    if (capped) sub = hsgName(1 - r) + ' already has ' + (share === 1 ? 'a fox' : 'both foxes') + ', so this one joins ' + hsgName(r) + '.';
    else if (held >= share) sub = 'That’s ' + (share === 1 ? hsgPoss(r) + ' fox' : 'both of ' + hsgPoss(r) + ' foxes') + '. Any more join ' + hsgName(1 - r) + '.';
    else sub = hsgName(r) + ' has ' + held + ' of ' + share + ' foxes.';
    return ['“The fox sides with ' + hsgName(r) + '!”', sub];
  }
  const gd = list.find(k => k.indexOf('guardFall:') === 0);
  if (gd) {
    const col = +gd.split(':')[1];
    return ['“A Guard falls!”', pub.guards[col] > 0 ? 'One Guard still stands for ' + HSG_CLAN[col] + '.' : HSG_CLAN[col] + '’s Shogun is Unguarded.'];
  }
  return null;
}

// The ending beat's words. War Chronicle copy (brief §17) is S6's; this is the card.
function hsgResultText(pub) {
  const r = pub.result, w = r.winnerSeat, l = 1 - w, c = r.counts;
  if (r.reason === 'shogun') return r.gekokujo
    ? ['“Gekokujo!”', hsgPoss(w) + ' Farmer topples the Shogun!']
    : ['“Found you!”', hsgPoss(w) + ' ' + hsgTypeName(r.by) + ' finds ' + hsgPoss(l) + ' Shogun.'];
  if (r.reason === 'lantern') return ['“The last lantern is out.”', 'In the open: Crimson ' + c[1] + ' · Indigo ' + c[0] + '. ' + hsgName(w) + ' holds the castle.'];
  if (r.reason === 'truce') return ['“A Truce!”', 'Both households stand, ' + c[0] + ' apiece. The Battle will be replayed.'];
  if (r.reason === 'cornered') return ['“Cornered!”', hsgName(l) + ' has nowhere left to hide. ' + hsgName(w) + ' wins the Battle.'];
  return ['', ''];
}

// The card for the moment the board is in. v = { me, mine, sel, armed, news }.
function hsgCardText(pub, v) {
  if (pub.result.reason !== 'none') return hsgResultText(pub);
  const last = hsgLastText(pub);
  if (!v.mine) return [hsgPoss(pub.turnSeat) + ' Command', ('You’re watching. ' + last).trim()];
  if (v.armed >= 0) return ['“Somebody’s there…”', 'Tap the door again to slide it open. Tap anywhere else to cancel.'];
  if (v.sel >= 0) {
    const marks = hsgMarksFor(pub, v.me, v.sel).marks;
    const kinds = new Set(Object.keys(marks).map(k => marks[k].mark));
    const how = [];
    if (kinds.has('dot'))    how.push('March to a dot');
    if (kinds.has('chev'))   how.push('Charge to the chevrons');
    if (kinds.has('strike')) how.push('Strike inside the brackets');
    if (kinds.has('diag'))   how.push('Strike on the diagonal');
    if (kinds.has('volley')) how.push('Volley inside the brackets');
    if (kinds.has('leap'))   how.push('Leap over the outlined piece');
    const title = hsgTypeName(hsgCellInfo(pub.board[v.sel]).id);
    return [title, how.length ? how.join(' · ') + '.' : 'Nowhere to go from here. Tap another piece, or a door.'];
  }
  const news = hsgNewsText(pub, v.news);
  if (news) return news;
  const lit = 12 - pub.quiet;
  if (lit <= 3) return ['“' + ['', 'One lantern', 'Two lanterns', 'Three lanterns'][lit] + ' left!”',
    'Open a door or strike to relight them, or the households get counted.'];
  const title = 'Your Command, ' + hsgName(v.me);
  if (pub.cmd === 0) return [title, 'Every door is shut. Tap one, then tap it again to slide it open.'];
  if (pub.seatCol[v.me] < 0) return [title, (last + ' The first clan piece found raises the banners.').trim()];
  return [title, (last + ' Tap a piece or a door.').trim()];
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S4 — The Castle: drawing (DOM — every path guarded, so the harness's
//    null document never reaches it) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const HSG_INK     = { 0: '#2B3A67', 1: '#B3261E' };   // Indigo Moon, Crimson Sun
const HSG_FOX_INK = '#5C4A3A';                       // a fox found before the banners: no clan yet
// Shadow-puppet silhouettes, sumi ink, viewBox 0 0 40 40 — ported from the board
// ("Mix · The Castle"). The final silhouettes are an art task (brief §11).
const HSG_GLYPH = {
  Sg: 'M8 5 Q20 17 32 5 Q20 12 8 5Z M9 24 Q9 12 20 12 Q31 12 31 24Z M5 24 L35 24 L38 32 L2 32Z',
  Gd: 'M19 6 L21 6 L21 38 L19 38Z M20 0 L24 8 L16 8Z M10 13 L30 13 L30 25 Q20 34 10 25Z',
  Mk: 'M4 17 Q20 3 36 17Z M12 19 L28 19 L32 38 L8 38Z',
  Sm: 'M5 31 L29 3 L33 6 L9 35Z M35 31 L11 3 L7 6 L31 35Z M3 29 L11 36 L8 39 L1 32Z M37 29 L29 36 L32 39 L39 32Z',
  Nj: 'M7 17 A13 13 0 1 0 33 17 A13 13 0 1 0 7 17Z M11 15 L29 15 L29 20 L11 20Z M8 30 L32 30 L35 39 L5 39Z',
  Ar: 'M11 3 Q33 20 11 37 L14 37 Q29 20 14 3Z M11 3 L12.5 3 L12.5 37 L11 37Z M4 19 L32 19 L32 21 L4 21Z M31 15.5 L39 20 L31 24.5Z',
  Fm: 'M1 20 L20 7 L39 20 Q20 25 1 20Z M13 24 L27 24 L30 38 L10 38Z',
  Fx: 'M5 5 L15 14 L25 14 L35 5 L33 22 L20 35 L7 22Z M12 20 L17 22 L13 25Z M28 20 L23 22 L27 25Z',
};
const HSG_EVENODD = { Nj: true, Fx: true };
// Crests, viewBox 0 0 12 12 — the second cue, so colour is never the only one.
const HSG_SUN  = 'M1 6 A5 5 0 1 0 11 6 A5 5 0 1 0 1 6Z';
const HSG_MOON = 'M8.5 1.6 A5 5 0 1 0 8.5 10.4 A4 4 0 1 1 8.5 1.6Z';
const HSG_PAW  = 'M1.4 5.4A1.2 1.2 0 1 0 3.8 5.4A1.2 1.2 0 1 0 1.4 5.4Z M4.7 3.6A1.3 1.3 0 1 0 7.3 3.6A1.3 1.3 0 1 0 4.7 3.6Z M8.2 5.4A1.2 1.2 0 1 0 10.6 5.4A1.2 1.2 0 1 0 8.2 5.4Z M3 9Q3 6.6 6 6.6Q9 6.6 9 9Q9 11 6 10.8Q3 11 3 9Z';
const HSG_BRACKETS = 'M3 15 V3 H15 M43 3 H55 V15 M55 43 V55 H43 M15 55 H3 V43';
const HSG_DIAMOND  = 'M20 12 L29 3 L38 12 M46 20 L55 29 L46 38 M38 46 L29 55 L20 46 M12 38 L3 29 L12 20';
const HSG_CHEV_ROT = { d: 0, u: 180, r: -90, l: 90, '': 0 };

// ── Honour Seals: struck in the clan's own colour and symbol (Sun / Moon) ────
// hsgWins holds one packed int per Seal won, in the order won: seat | colour << 1,
// colour 2 = the winner had no banner (cannot normally happen; drawn neutral).
const hsgWinPack = (seat, col) => seat | ((col === 0 || col === 1 ? col : 2) << 1);
const hsgWinSeat = w => w & 1;
const hsgWinCol  = w => w >> 1;
const hsgSeatWins = (pub, seat) => pub.wins.filter(w => hsgWinSeat(w) === seat);

// One Seal. `col` undefined → an empty slot waiting to be won.
function hsgSealHTML(col) {
  if (col === undefined) return '<span class="hsg-seal"></span>';
  const ink = col === 0 || col === 1 ? HSG_INK[col] : HSG_FOX_INK;
  const glyph = col === 1 ? HSG_SUN : col === 0 ? HSG_MOON : HSG_PAW;
  return '<span class="hsg-seal is-won" style="background:' + ink + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + glyph + '" fill="#F3EAD7"/></svg></span>';
}

// A seat's row of Seals: the ones won (each in its clan's colour), then empty slots.
function hsgSealRowHTML(pub, seat) {
  const won = hsgSeatWins(pub, seat);
  let h = '';
  for (let k = 0; k < pub.campaignLen; k++) h += hsgSealHTML(k < won.length ? hsgWinCol(won[k]) : undefined);
  return h;
}

const hsgEsc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// The Shogun's status, drawn ON his tile: 'guarded' | 'exposed' | '' (not a Shogun in the open).
// A Guard still behind a door counts, so this reads pub.guards, never the board.
function hsgShogunState(pub, cell) {
  const inf = hsgCellInfo(cell);
  if (inf.kind !== 'piece' || inf.id !== 'Sg' || inf.col < 0) return '';
  return pub.guards[inf.col] > 0 ? 'guarded' : 'exposed';
}

// THE RENDER SEAM — every tile in the game (the board, S10's gallery, S11's
// Practice) is built here and nowhere else (spec §10). cell is a board string
// ('Sg1' '#' '.' 'Fxp0'); opts = { size, mark, dir, armed, screen, last, guard: 'guarded'|'exposed' (a Shogun only) }.
// A skin's image replaces the lamplit square and the silhouette; the game still
// prints the crest, rank and name plate itself (brief §11: the art never paints the name).
function hsgRenderTile(cell, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'hsg-tile';
  if (opts.size) el.style.setProperty('--hsg-t', opts.size + 'px');
  const inf = hsgCellInfo(cell);
  let h = '';
  if (inf.kind === 'door') {
    const url = (typeof assetBack === 'function') && assetBack('hsg');
    h += url ? '<img class="hsg-tile-asset" src="' + hsgEsc(url) + '" alt="">' : '<span class="hsg-door"></span>';
    if (opts.armed) {
      // the same vague shadow behind every door — it never hints at what is there
      h += '<svg class="hsg-shade" viewBox="0 0 40 48" aria-hidden="true"><path d="M11 13 A9 9 0 1 0 29 13 A9 9 0 1 0 11 13Z M6 48 Q6 26 20 24 Q34 26 34 48Z" fill="rgba(43,38,32,.32)"/></svg>'
         + '<span class="hsg-open-chip">Open?</span>';
    }
  } else if (inf.kind === 'empty') {
    h += '<span class="hsg-floor"></span>';
  } else {
    const url = (typeof assetFace === 'function') && assetFace('hsg', inf.assetId);
    const ink = inf.col >= 0 ? HSG_INK[inf.col] : HSG_FOX_INK;
    const crest = inf.id === 'Fx' ? HSG_PAW : inf.col === 1 ? HSG_SUN : HSG_MOON;
    const rank = HsgRules.RANK[inf.id] || '';
    h += url ? '<img class="hsg-tile-asset" src="' + hsgEsc(url) + '" alt="">'
             : '<span class="hsg-lit"></span><svg class="hsg-glyph" viewBox="0 0 40 40" aria-hidden="true"><path d="'
               + HSG_GLYPH[inf.id] + '" fill="#2B2620" fill-rule="' + (HSG_EVENODD[inf.id] ? 'evenodd' : 'nonzero') + '"/></svg>';
    h += '<span class="hsg-tile-crest" style="background:' + ink + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + crest + '" fill="#FFF6DD"/></svg></span>'
       + (rank ? '<span class="hsg-rank">' + rank + '</span>' : '')
       + '<span class="hsg-sash" style="background:' + ink + '">' + hsgTypeName(inf.id) + '</span>';
    if (inf.id === 'Sg' && opts.guard) h += '<span class="hsg-sg-frame is-' + opts.guard + '"></span><span class="hsg-sg-flag is-' + opts.guard + '">' + (opts.guard === 'guarded' ? 'Guarded' : 'Exposed') + '</span>';
  }
  if (opts.screen) h += '<span class="hsg-mark-screen"></span>';
  const m = opts.mark;
  if (m === 'dot') h += '<span class="hsg-mark-dot"></span>';
  else if (m === 'chev') {
    h += '<svg class="hsg-mark-chev" viewBox="0 0 28 32" aria-hidden="true" style="transform:rotate(' + HSG_CHEV_ROT[opts.dir || ''] + 'deg)">'
       + '<path d="M4 4 L14 13 L24 4 M4 17 L14 26 L24 17" fill="none" stroke="#F2B45A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else if (m === 'strike' || m === 'volley' || m === 'diag' || m === 'leap') {
    h += '<svg class="hsg-mark-full" viewBox="0 0 58 58" aria-hidden="true"><path d="' + (m === 'diag' ? HSG_DIAMOND : HSG_BRACKETS)
       + '" fill="none" stroke="#2B2620" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
       + (m === 'leap' ? '<path d="M14 24 Q29 4 44 24 M38 16 L44 24 L35 25" fill="none" stroke="#2B2620" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' : '')
       + '</svg>';
  }
  if (opts.last) h += '<span class="hsg-mark-last"></span>';
  el.innerHTML = h;
  return el;
}

// A player's bar: crest, name, clan, fox slots, the Guard ring, the Seals.
function hsgBarHTML(pub, s) {
  const col = pub.seatCol[s];
  const ink = col >= 0 ? HSG_INK[col] : HSG_FOX_INK;
  const crest = col >= 0
    ? '<span class="hsg-crest" style="background:' + ink + '" role="img" aria-label="' + HSG_CLAN[col] + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + (col === 1 ? HSG_SUN : HSG_MOON) + '" fill="#F3EAD7"/></svg></span>'
    : '<span class="hsg-crest is-none" role="img" aria-label="No banner yet"></span>';
  const share = Math.floor(pub.foxTotal / 2), held = pub.foxesHeld[s];
  let foxes = '';
  for (let k = 0; k < share; k++) {
    const on = k < held;
    foxes += '<span class="hsg-fox-slot' + (on ? ' is-held' : '') + '"' + (on ? ' style="background:' + ink + '"' : '') + '>'
           + '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + HSG_PAW + '" fill="' + (on ? '#F3EAD7' : 'rgba(243,234,215,.35)') + '"/></svg></span>';
  }
  const guarded = col < 0 || pub.guards[col] > 0;
  const guard = '<svg class="hsg-guard" viewBox="0 0 18 18" role="img" aria-label="' + (guarded ? 'Guarded' : 'Unguarded') + '"><circle cx="9" cy="9" r="6.5" fill="none" '
    + (guarded ? 'stroke="#C9A14A" stroke-width="2.6"' : 'stroke="rgba(243,234,215,.35)" stroke-width="2" stroke-dasharray="3 3"') + '/></svg>';
  const seals = hsgSealRowHTML(pub, s);
  return crest
    + '<div class="hsg-bar-who"><span class="hsg-bar-name">' + hsgEsc(hsgName(s)) + '</span><span class="hsg-bar-clan">' + (col >= 0 ? HSG_CLAN[col] : 'No banner yet') + '</span></div>'
    + '<div class="hsg-slots" role="img" aria-label="Foxes: ' + held + ' of ' + share + '">' + foxes + '</div>'
    + guard
    + '<div class="hsg-seals" role="img" aria-label="Honour Seals: ' + pub.seals[s] + ' of ' + pub.campaignLen + '">' + seals + '</div>';
}

function hsgSquareLabel(pub, i, opts) {
  const inf = hsgCellInfo(pub.board[i]);
  let what = inf.kind === 'door' ? 'closed door' : inf.kind === 'empty' ? 'empty'
    : inf.id === 'Fx' ? (inf.col >= 0 ? HSG_SHORT[inf.col] + ' fox' : 'a fox') : HSG_SHORT[inf.col] + ' ' + hsgTypeName(inf.id);
  const how = { dot: 'march here', chev: 'charge here', strike: 'strike', diag: 'strike', volley: 'volley', leap: 'leap' }[opts.mark];
  if (how) what += ', ' + how;
  if (opts.guard) what += ', ' + opts.guard;
  if (opts.armed) what += ', tap again to open';
  return HsgRules.sq(i) + ', ' + what;
}

// Draws the whole Castle from hsgPub (+ this phone's UI state) — never from hsgB.
// Idempotent: a tile is redrawn only when what it shows changed, so the slot's
// lift and glow transition instead of jumping.
function hsgRenderCastle() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const grid = document.getElementById('hsg-grid');
  if (!grid || !hsgPub) return;
  const pub = hsgPub;
  const cmdr = hsgCommanderSeat(), bottom = hsgBottomSeat();
  const live = hsgPhase === 'castle' && pub.result.reason === 'none';
  const mine = live && pub.turnSeat === cmdr;
  if (!mine) { hsgSel = -1; hsgDoorArmed = -1; }

  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  setText('hsg-castle-battle', 'Battle ' + pub.battleNo + (pub.replay ? ' · Replay' : ''));
  setText('hsg-castle-terms', pub.campaignLen === 1 ? 'Single Battle' : 'First to ' + pub.campaignLen + ' Seals');

  [['hsg-bar-top', 1 - bottom], ['hsg-bar-bottom', bottom]].forEach(([id, s]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = hsgBarHTML(pub, s);
    el.classList.toggle('is-active', live && pub.turnSeat === s);
  });

  const beam = document.getElementById('hsg-beam');
  if (beam) {
    const lit = Math.max(0, 12 - pub.quiet);
    let h = '';
    for (let k = 0; k < 12; k++) h += '<span class="hsg-lantern' + (k < lit ? ' is-lit' + (lit <= 3 ? ' is-flicker' : '') : '') + '"></span>';
    beam.innerHTML = h;
    beam.setAttribute('aria-label', lit + ' of 12 lanterns lit');
  }

  if (grid.children.length !== HSG_CELLS) {
    grid.innerHTML = '';
    for (let i = 0; i < HSG_CELLS; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hsg-sq';
      b.setAttribute('data-i', String(i));
      hsgBindCardHold(b, i);                           // long-press a piece → its Household row (S10)
      grid.appendChild(b);
    }
  }
  const mk = mine ? hsgMarksFor(pub, cmdr, hsgSel) : { marks: {}, screens: [] };
  const lastSq = pub.last.k !== 'none' ? pub.last.j : -1;
  for (let i = 0; i < HSG_CELLS; i++) {
    const sq = grid.children[i], m = mk.marks[i];
    const opts = { mark: m ? m.mark : '', dir: m ? m.dir : '', armed: i === hsgDoorArmed,
      screen: mk.screens.indexOf(i) >= 0, last: i === lastSq, guard: hsgShogunState(pub, pub.board[i]) };
    const key = pub.board[i] + '|' + opts.guard + '|' + opts.mark + opts.dir + '|' + (opts.armed ? 1 : 0) + (opts.screen ? 1 : 0) + (opts.last ? 1 : 0);
    if (sq.getAttribute('data-key') !== key) {
      sq.innerHTML = '';
      sq.appendChild(hsgRenderTile(pub.board[i], opts));
      sq.setAttribute('data-key', key);
    }
    sq.classList.toggle('is-picked', i === hsgSel);
    sq.classList.toggle('is-armed', i === hsgDoorArmed);
    sq.setAttribute('aria-label', hsgSquareLabel(pub, i, opts));
  }

  const [title, sub] = hsgCardText(pub, { me: cmdr, mine, sel: hsgSel, armed: hsgDoorArmed, news: hsgNewsFx });
  setText('hsg-card-title', title);
  setText('hsg-card-sub', sub);
}

// ── Input: tap-tap, the two-tap door, drag and drop ───────────────────────────
// The board is read-only unless it is this phone's Command and nothing is in flight.
function hsgCanCommand() {
  return hsgPhase === 'castle' && !!hsgPub && hsgPub.result.reason === 'none'
    && hsgPub.turnSeat === hsgCommanderSeat() && !window.syllySyncLocked;
}

function hsgTap(i) {
  if (!hsgCanCommand()) return;                    // waiting, sending or ending: nothing (spec §7)
  const r = hsgTapDecide(hsgPub, hsgCommanderSeat(), hsgSel, hsgDoorArmed, i);
  hsgSel = r.sel; hsgDoorArmed = r.armed;
  if (r.act) { hsgSubmitCommand(r.act); return; }
  hsgRenderCastle();
}

// One phone and the host apply directly (the engine drops a self-sent ACTION);
// hsgHostCommand repaints. A client locks, asks the host with the cmd tag it was
// looking at, and waits for HSG_COMMAND_DONE (or HSG_STATE, if refused). A second
// tap is stopped twice over: hsgCanCommand reads the lock, and mpSendEnvelope drops
// any ACTION the lock did not authorise.
function hsgSubmitCommand(act) {
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'HSG_COMMAND', cmd: hsgPub.cmd, act: act } });
    hsgRenderCastle();
    return;
  }
  const r = hsgHostCommand(hsgCommanderSeat(), act);
  if (!r.ok) hsgRenderCastle();
}

// Tapping anywhere off the squares puts a lifted piece or door back down.
function hsgTapOff() {
  if (hsgSel < 0 && hsgDoorArmed < 0) return;
  if (Date.now() - hsgDragEndAt < 400) return;     // the click a drop leaves behind (pointer capture retargets it)
  hsgSel = -1; hsgDoorArmed = -1;
  hsgRenderCastle();
}

function hsgSquareAt(x, y) {
  const el = document.elementFromPoint ? document.elementFromPoint(x, y) : null;
  const sq = el && el.closest ? el.closest('.hsg-sq') : null;
  return sq ? +sq.getAttribute('data-i') : -1;
}

function hsgDragStart(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const sq = e.target && e.target.closest ? e.target.closest('.hsg-sq') : null;
  if (!sq || !hsgCanCommand()) return;
  const i = +sq.getAttribute('data-i');
  if (!hsgIsOwnPiece(hsgPub, hsgCommanderSeat(), i)) return;
  hsgDrag = { from: i, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, ghost: null };
}

function hsgDragMove(e) {
  const d = hsgDrag;
  if (!d || e.pointerId !== d.pid) return;
  const host = document.getElementById('hsg-castle'), layer = document.getElementById('hsg-castle-fx');
  const grid = document.getElementById('hsg-grid');
  if (!host || !layer || !grid) return;
  if (!d.moved) {
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (dx * dx + dy * dy < 64) return;            // under 8 px it is still a tap
    if (!hsgCanCommand()) { hsgDrag = null; return; }
    d.moved = true;
    try { grid.setPointerCapture(d.pid); } catch (_) {}
    hsgSel = d.from; hsgDoorArmed = -1;
    hsgRenderCastle();                             // its marks light up while it travels
    const src = grid.children[d.from];
    if (src) src.classList.add('is-dragging');
    d.ghost = hsgRenderTile(hsgPub.board[d.from], {});
    d.ghost.classList.add('hsg-ghost');
    layer.appendChild(d.ghost);
  }
  const hr = host.getBoundingClientRect(), t = d.ghost.offsetWidth || 58;
  // held a little above the finger, so the player can see what they carry
  d.ghost.style.transform = 'translate3d(' + (e.clientX - hr.left - t / 2) + 'px,' + (e.clientY - hr.top - t * 0.85) + 'px,0)';
  e.preventDefault();
}

function hsgDragEnd(e) {
  const d = hsgDrag;
  if (!d || (e && e.pointerId !== d.pid)) return;
  const dropped = d.moved && e && e.type === 'pointerup';
  const j = dropped ? hsgSquareAt(e.clientX, e.clientY) : -1;
  hsgDragCancel();
  if (!dropped) return;
  hsgDragEndAt = Date.now();
  if (!hsgCanCommand()) { hsgRenderCastle(); return; }
  // Dropped on a lit square → that Command; anywhere else → the piece stays lifted,
  // so tap-tap can finish what the drag started.
  const r = hsgTapDecide(hsgPub, hsgCommanderSeat(), d.from, -1, j);
  if (r.act) { hsgSel = -1; hsgSubmitCommand(r.act); return; }
  hsgSel = d.from; hsgDoorArmed = -1;
  hsgRenderCastle();
}

// Drops any drag in flight: the ghost and the dimmed source square. Safe headless.
function hsgDragCancel() {
  const d = hsgDrag;
  hsgDrag = null;
  if (!d || typeof document === 'undefined' || !document.getElementById) return;
  if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
  const grid = document.getElementById('hsg-grid');
  const src = grid && grid.children ? grid.children[d.from] : null;
  if (src && src.classList) src.classList.remove('is-dragging');
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S5 — The Storyteller: the Battle intro, the Intro's scene, the fan snap ─
// ═══════════════════════════════════════════════════════════════════════════
// Every moment → its sound (spec §9), the CJAR / COMB pattern. Two-part sounds put
// their second half on hsgLater, so hsgStopTimers() silences a half-played one.
const hsgCall = name => {
  const g = typeof globalThis !== 'undefined' ? globalThis : window;
  if (typeof g[name] === 'function') g[name]();
};
const HSG_SOUND = {
  fan:        () => hsgCall('playFanSnap'),            // the Storyteller (the Intro's last beat, the Battle intro)
  open:       () => hsgCall('playPaperSlide'),
  openShogun: () => { hsgCall('playPaperSlide'); hsgLater(() => hsgCall('playHullThud'), 170); },   // the small taiko tap
  march:      () => hsgCall('playPillClick'),          // March and Charge: a light wooden clack
  strike:     () => { hsgCall('playFanSnap'); hsgLater(() => hsgCall('playWhoosh'), 70); },          // fan snap, then the ink swish
  volley:     () => hsgCall('playWhoosh'),
  leap:       () => hsgCall('playWhoosh'),
  fox:        () => hsgCall('playSuccess'),
  guardFall:  () => hsgCall('playBoing'),
  foundYou:   () => { hsgCall('playFanSnap'); hsgLater(() => hsgCall('playClashWin'), 140); },
  lantern:    () => hsgCall('playUnchallenged'),       // the last lantern goes out (a lantern going out is silent)
  truce:      () => hsgCall('playDone'),
  cornered:   () => hsgCall('playBoing'),
};
function hsgSound(key) {
  const f = HSG_SOUND[key];
  try { if (f) f(); } catch (_) { /* a sound never stops a Battle */ }
}

// The Intro's scene, as the engine sees it. HsgScene stays pure; this wrapper adds
// the one thing the game owns — the fan snap's sound — when the beats END LIVE
// (a line was showing). A re-mount (tab-away) or a returning Intro sends beat(-1)
// with no line before it, so it stays quiet.
const hsgIntroScene = {
  last: null,
  mount(el, opts) { hsgIntroScene.last = null; HsgScene.mount(el, opts); },
  beat(i, text) {
    const was = hsgIntroScene.last;
    hsgIntroScene.last = i;
    HsgScene.beat(i, text);
    if (i < 0 && typeof was === 'number' && was >= 0) hsgSound('fan');
  },
  stop() { hsgIntroScene.last = null; HsgScene.stop(); },
};

function hsgStopBattleScene() {
  if (hsgBattleScene) { try { hsgBattleScene.stop(); } catch (_) {} }
}

function hsgReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

// The Seal tally under the title: you (the bottom bar's seat) on the left, each
// side's Seals filling from its own name inwards.
function hsgTallyHTML(pub) {
  const L = hsgBottomSeat(), R = 1 - L;
  const wl = hsgSeatWins(pub, L), wr = hsgSeatWins(pub, R);
  let left = '', right = '';
  for (let k = 0; k < pub.campaignLen; k++) left += hsgSealHTML(k < wl.length ? hsgWinCol(wl[k]) : undefined);
  for (let k = pub.campaignLen - 1; k >= 0; k--) right += hsgSealHTML(k < wr.length ? hsgWinCol(wr[k]) : undefined);
  const n = s => pub.seals[s] + (pub.seals[s] === 1 ? ' Seal' : ' Seals');
  return '<span class="hsg-bi-name">' + hsgEsc(hsgName(L)) + '</span>'
    + '<span class="hsg-seals" role="img" aria-label="' + hsgEsc(hsgName(L)) + ' ' + n(L) + ', ' + hsgEsc(hsgName(R)) + ' ' + n(R) + '">'
    + left + '<span class="hsg-bi-dot" aria-hidden="true">·</span>' + right + '</span>'
    + '<span class="hsg-bi-name is-right">' + hsgEsc(hsgName(R)) + '</span>';
}

// Draws the Battle intro. An interstitial (auto-advances, no controls) → no chrome
// (ui-style.md § Global UI Protocol 5). Its one-shot motion is CSS, timed by the
// custom properties set here, and replayed by re-adding .is-playing.
function hsgPaintBattleIntro(bi) {
  if (typeof document === 'undefined' || !document.getElementById || !hsgPub) return;
  const root = document.getElementById('hsg-bi');
  if (!root) return;
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  set('hsg-bi-title', bi.title);
  set('hsg-bi-flavour', '“' + bi.flavour + '”');
  set('hsg-bi-call', bi.call);
  const tally = document.getElementById('hsg-bi-tally');
  if (tally) tally.innerHTML = hsgTallyHTML(hsgPub);
  if (root.style && root.style.setProperty) {
    root.style.setProperty('--hsg-snap', bi.snapMs + 'ms');
    root.style.setProperty('--hsg-bi-ms', bi.ms + 'ms');
  }
  root.setAttribute('data-state', bi.state);
  const stage = document.getElementById('hsg-bi-stage');
  if (stage && typeof HsgScene !== 'undefined') {
    if (!hsgBattleScene) hsgBattleScene = HsgScene.make();
    try {
      hsgBattleScene.mount(stage, { mode: 'battle', toss: bi.state === 'toss', reducedMotion: hsgReducedMotion() });
    } catch (e) { console.warn('[hsg] battle scene', e); }
  }
  if (root.classList) { root.classList.remove('is-playing'); void root.offsetWidth; root.classList.add('is-playing'); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S9 — The moments (spec §15 S9; brief §0c, Appendix § Motion) ────────────
// ═══════════════════════════════════════════════════════════════════════════
// What a Command LOOKS and SOUNDS like, played on every phone from the same three
// things: the snapshot before, the snapshot after, and the Command's fx keys. So a
// moment can never show more than the public copy does, and both phones play the
// same one. Never played for a repair or a rejoin (a snapshot, not a Command we
// watched happen): only when the Command counter moved by exactly one.
//
// Every moment lives in #hsg-castle-fx (absolute over the Castle; ui-style.md §
// "Transient animations must float"), is removed by its own hsgLater, and goes
// when hsgStopTimers() does. Reduced motion is decided HERE, not only in CSS:
// a moment that is only motion (the door slide, the fold, a lantern's puff) is
// skipped — the board already shows the result — and a moment that carries news
// (the banners, the fox's stamp, the cracked ring, the ink blot, "Found you!")
// is shown still for the same hold (ui-motion.md: reduced motion, not reduced
// information).
const HSG_MO_INK = '<svg viewBox="0 0 60 60" aria-hidden="true"><g fill="#2B2620">'
  + '<path d="M30 14 Q41 13 45 23 Q52 30 44 39 Q40 49 29 46 Q17 49 15 38 Q8 29 17 21 Q21 13 30 14Z"/>'
  + '<circle cx="11" cy="15" r="4"/><circle cx="50" cy="13" r="3"/><circle cx="54" cy="44" r="4.5"/>'
  + '<circle cx="14" cy="50" r="3"/><circle cx="33" cy="5" r="2.2"/><circle cx="5" cy="35" r="2"/><circle cx="41" cy="56" r="2"/></g></svg>';
const HSG_MO_FAN = '<svg class="hsg-mo-fan" viewBox="0 0 64 50" aria-hidden="true">'
  + '<g class="hsg-mo-fan-open"><path d="M32 48 L3 20 A40 40 0 0 1 61 20 Z" fill="#F3EAD7" stroke="#2B2620" stroke-width="2.5" stroke-linejoin="round"/>'
  + '<path d="M32 48 L13 11 M32 48 L24 6 M32 48 L32 5 M32 48 L40 6 M32 48 L51 11" stroke="#2B2620" stroke-width="1.6"/>'
  + '<path d="M9 17 A38 38 0 0 1 55 17" fill="none" stroke="#B3261E" stroke-width="3"/></g>'
  + '<path class="hsg-mo-fan-shut" d="M32 49 L28 6 Q32 2 36 6 Z" fill="#2B2620"/></svg>';
const HSG_MO_EARS = '<svg class="hsg-mo-ears" viewBox="0 0 40 16" aria-hidden="true">'
  + '<path d="M5 16 L11 1 L18 16Z M22 16 L29 1 L35 16Z" fill="#2B2620"/>'
  + '<path d="M9 14 L11.4 6 L14.8 14Z M25.2 14 L28.6 6 L31 14Z" fill="#E3C894"/></svg>';
const HSG_MO_RING = '<svg viewBox="0 0 40 40" aria-hidden="true">'
  + '<path class="hsg-mo-ring-l" d="M20 5.7 A14.3 14.3 0 0 0 20 34.3"/>'
  + '<path class="hsg-mo-ring-r" d="M20 5.7 A14.3 14.3 0 0 1 20 34.3"/>'
  + '<path class="hsg-mo-crack" d="M20 2.5 L17 11 L22.5 17 L17.5 25 L21 37.5"/></svg>';

// el's box in the Castle's coordinates (the fx layer is inset: 0 over it). A square
// is still sliding down from its lift when its Command lands, so where the Castle is
// el's offsetParent the layout box is used — offsets ignore transforms.
function hsgRectIn(el, host) {
  if (!el || !host) return null;
  if (el.offsetParent === host && typeof el.offsetLeft === 'number') {
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }
  if (!el.getBoundingClientRect || !host.getBoundingClientRect) return null;
  const a = el.getBoundingClientRect(), h = host.getBoundingClientRect();
  return { x: a.left - h.left, y: a.top - h.top, w: a.width, h: a.height };
}
const hsgGrow = (r, k) => r && { x: r.x + r.w * (1 - k) / 2, y: r.y + r.h * (1 - k) / 2, w: r.w * k, h: r.h * k };

// One moment: a box in the layer, a CSS start delay (--d), gone after `ms`.
function hsgMoment(cls, r, html, ms, at, still) {
  const layer = document.getElementById('hsg-castle-fx');
  if (!layer || !r || !document.createElement) return null;
  const el = document.createElement('div');
  el.className = 'hsg-mo ' + cls + (still ? ' is-still' : '');
  el.style.left = r.x + 'px'; el.style.top = r.y + 'px';
  el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
  if (el.style.setProperty) el.style.setProperty('--d', (still ? 0 : (at || 0)) + 'ms');
  if (html) el.innerHTML = html;
  layer.appendChild(el);
  hsgLater(() => {
    try {
      if (el.parentNode) el.parentNode.removeChild(el);
      else if (!('parentNode' in el)) layer.removeChild(el);   // the harness's mock DOM keeps no parent
    } catch (_) {}
  }, ms);
  return el;
}

function hsgClearMoments() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const layer = document.getElementById('hsg-castle-fx');
  if (!layer || !layer.children || !layer.removeChild) return;
  Array.prototype.slice.call(layer.children).forEach(c => {
    if (c && c.classList && c.classList.contains('hsg-mo')) layer.removeChild(c);
  });
}

// Raising the Banners (and, with a winner, the banners of "Found you!"): two cloth
// banners drop from the beam, the crimson sun and the indigo moon, each with a name.
// You (the bottom bar) on the left, like the Battle intro's tally.
function hsgBannersMoment(pub, host, at, winner, still) {
  const br = hsgRectIn(document.getElementById('hsg-beam'), host);
  const grid = document.getElementById('hsg-grid');
  const t = (grid && grid.children && hsgRectIn(grid.children[0], host) || { h: 58 }).h;
  if (!br) return;
  const bottom = hsgBottomSeat();
  const cloth = [bottom, 1 - bottom].map(s => {
    const col = pub.seatCol[s];
    if (col < 0) return '';
    const cls = winner < 0 ? '' : s === winner ? ' is-won' : ' is-lost';
    return '<div class="hsg-mo-banner' + cls + '" style="background:' + HSG_CLOTH[col] + '">'
      + '<span class="hsg-mo-banner-crest" style="background:' + HSG_INK[col] + '"><svg viewBox="0 0 12 12"><path d="' + (col === 1 ? HSG_SUN : HSG_MOON) + '" fill="#F3EAD7"/></svg></span>'
      + '<span class="hsg-mo-banner-clan">' + HSG_CLAN[col] + '</span>'
      + '<span class="hsg-mo-banner-who">' + hsgEsc(hsgName(s)) + '</span></div>';
  }).join('');
  const final = winner >= 0;
  // 2.6 tiles: the shorter, losing banner still clears its name above the swallowtail at 320×452
  hsgMoment('hsg-mo-banners' + (final ? ' is-final' : ''), { x: br.x, y: br.y + br.h, w: br.w, h: t * 2.6 },
    cloth, final ? HSG_ENDING_MS - 100 : at + 2000, at, still);
}

// A fox is found (or sided at the banners): ears over the door frame, then a paw
// crest stamped on in the colour of the side she joins (the fox's own ink before then).
function hsgFoxMoment(r, col, at, still) {
  if (!r) return;
  const ink = col >= 0 ? HSG_INK[col] : HSG_FOX_INK;
  hsgMoment('hsg-mo-fox', r, HSG_MO_EARS
    + '<span class="hsg-mo-paw" style="background:' + ink + '"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="' + HSG_PAW + '" fill="#FFF6DD"/></svg></span>',
    at + 1500, at, still);
}

// The Guard falls: the gold ring by that clan's name cracks — and, with no Guard
// left, breaks in two (the bar underneath already draws it Unguarded).
function hsgGuardMoment(r, broken, at, still) {
  if (!r) return;
  hsgMoment('hsg-mo-guard' + (broken ? ' is-broken' : ''), hsgGrow(r, 2.2), HSG_MO_RING, at + 1150, at, still);
}

// The ending beat over the board: the Storyteller's word, and for a Shogun his
// fan snapping shut and the banners dropping — a blocking choreography beat (the
// board is no longer playable), so it may run past 300 ms (ui-motion.md).
function hsgEndingMoment(pub, host, at, still) {
  const r = pub.result, shogun = r.reason === 'shogun';
  const snap = shogun ? at + 320 : at;
  hsgLater(() => hsgSound(shogun ? 'foundYou' : r.reason), still ? at : snap);
  const fr = hsgRectIn(document.getElementById('hsg-frame'), host) || hsgRectIn(document.getElementById('hsg-grid'), host);
  const title = hsgResultText(pub)[0].replace(/[“”]/g, '');
  hsgMoment('hsg-mo-end' + (shogun ? ' has-fan' : ''), fr,
    '<div class="hsg-mo-end-card">' + (shogun ? HSG_MO_FAN : '') + '<span class="hsg-mo-end-title">' + hsgEsc(title) + '</span></div>',
    HSG_ENDING_MS - 100, at, still);
  if (shogun) hsgBannersMoment(pub, host, at + 420, r.winnerSeat, still);
}

function hsgPlayMoments(before, pub, fx) {
  if (typeof document === 'undefined' || !document.getElementById || !before || !pub) return;
  const host = document.getElementById('hsg-castle'), grid = document.getElementById('hsg-grid');
  if (!host || !grid || !document.getElementById('hsg-castle-fx')) return;
  if (!hsgSameBattle(before, pub) || pub.cmd !== before.cmd + 1 || !pub.last || pub.last.k === 'none') return;
  const still = hsgReducedMotion();
  const sq = i => hsgRectIn(grid.children && grid.children[i], host);
  const list = fx || [];
  const L = pub.last, j = L.j;
  let t = 0;                                       // when the Command's own beat is over; the news follows it

  // 1. The Command itself
  if (L.k === 'U') {
    hsgSound(/^Sg/.test(pub.board[j]) ? 'openShogun' : 'open');
    if (!still) {
      // the signature: a shadow flickers on the paper, the panel slides aside, the piece pops in
      hsgMoment('hsg-mo-door', sq(j), '<div class="hsg-mo-panel"><span class="hsg-door"></span><span class="hsg-mo-shade"></span></div>', 420, 0, false);
      const tile = grid.children[j] && grid.children[j].children && grid.children[j].children[0];
      if (tile && tile.classList) tile.classList.add('is-pop');
    }
    t = 380;
  } else if (L.k === 'M' || L.k === 'C') {
    hsgSound('march');
  } else if (L.k === 'S') {
    hsgSound(L.kind === 'v' ? 'volley' : L.kind === 'l' ? 'leap' : 'strike');
    const r = sq(j);                               // the victim's square, for every kind of strike
    if (!still && r) {
      const fold = hsgMoment('hsg-mo-fold', r, '', 300, 0, false);
      if (fold) fold.appendChild(hsgRenderTile(before.board[j], {}));   // the struck piece folds flat
    }
    hsgMoment('hsg-mo-ink', hsgGrow(r, 1.5), HSG_MO_INK, 720, 90, still);
    t = 300;
  }

  // 2. Raising the Banners
  const banners = list.indexOf('banners') >= 0;
  if (banners) hsgBannersMoment(pub, host, t, -1, still);

  // 3. A fox found — or a fox found earlier, sided now by the banners
  let fox = list.some(k => k.indexOf('fox:') === 0);
  pub.board.forEach((c, i) => {
    const was = before.board[i];
    if (c.indexOf('Fx') !== 0 || typeof was !== 'string') return;
    const found = was === '#', sided = was.indexOf('Fxp') === 0 && c.indexOf('Fxp') !== 0;
    if (!found && !sided) return;
    fox = true;
    hsgFoxMoment(sq(i), c.indexOf('Fxp') === 0 ? -1 : +c.slice(2), t + (banners ? 260 : 0), still);
  });
  if (fox) hsgLater(() => hsgSound('fox'), t + (banners ? 260 : 0));

  // 4. The Guard falls
  list.filter(k => k.indexOf('guardFall:') === 0).forEach(k => {
    const col = +k.split(':')[1];
    const s = pub.seatCol[0] === col ? 0 : pub.seatCol[1] === col ? 1 : -1;
    if (s < 0) return;
    const bar = document.getElementById(s === hsgBottomSeat() ? 'hsg-bar-bottom' : 'hsg-bar-top');
    const ring = bar && bar.querySelector ? bar.querySelector('.hsg-guard') : null;
    hsgGuardMoment(hsgRectIn(ring, host), pub.guards[col] === 0, t, still);
    hsgLater(() => hsgSound('guardFall'), t + 140);
  });

  // 5. The lanterns: one goes out per quiet Command; an Unveil or a strike relights them
  const beam = document.getElementById('hsg-beam');
  const lamps = beam && beam.children ? beam.children : [];
  const lit0 = Math.max(0, 12 - before.quiet), lit1 = Math.max(0, 12 - pub.quiet);
  if (!still) {
    for (let k = lit1; k < lit0; k++) hsgMoment('hsg-mo-puff', hsgRectIn(lamps[k], host), '<span class="hsg-lantern is-lit"></span><i></i>', 360, 0, false);
    for (let k = lit0; k < lit1; k++) {
      const el = lamps[k];
      if (el && el.classList) { if (el.style && el.style.setProperty) el.style.setProperty('--i', String(k - lit0)); el.classList.add('is-relit'); }
    }
  }

  // 6. The ending
  if (pub.result.reason !== 'none') hsgEndingMoment(pub, host, Math.max(t, 240), still);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S6 — The War Chronicle (both end screens, one painter) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Board "A · War Chronicle", brief §17. Two cloth banners hang from a beam (the
// winner's longer and stamped, the loser's dim; a Truce hangs them level), then
// the headline, the sub-line, the quote, two stat boxes and the Seal tally.
// screen-hsg-chronicle (between Battles) and screen-hsg-gameover (the Campaign
// won) are the same picture; only the headline and the buttons differ.

// The five result variants (brief §17) → their headline. hsgChronicleModel picks one
// from hsgPub.result.reason + .gekokujo and nothing else.
const HSG_CHRON_HEAD = {
  shogun:   'Found you!',
  gekokujo: 'Gekokujo!',
  lantern:  'The Last Lantern',
  truce:    'A Truce!',
  cornered: 'Cornered!',
};

// Pure: the public copy → every word and flag the Chronicle shows. Reads only
// hsgPub (and names), so a client (S7) paints exactly what the host does.
function hsgChronicleModel(pub) {
  const r = pub.result;
  const variant = r.reason === 'shogun' ? (r.gekokujo ? 'gekokujo' : 'shogun') : r.reason;
  if (!HSG_CHRON_HEAD[variant]) return null;                    // no result yet: nothing to chronicle
  const truce = variant === 'truce';
  const w = r.winnerSeat, l = 1 - w;
  const clan = s => (pub.seatCol[s] >= 0 ? HSG_CLAN[pub.seatCol[s]] : 'No banner');
  const c = r.counts || [0, 0];
  const quote = {
    shogun:   '“The fox slips past the Guards and the Shogun is found!”',
    gekokujo: '“The farmer topples the Shogun!”',
    lantern:  'The last lantern is out. Pieces in the open: Crimson ' + c[1] + ' · Indigo ' + c[0] + '. ' + clan(w) + ' holds the castle.',
    truce:    'A Truce! Both households stand. No Seal; the Battle will be replayed.',
    cornered: clan(l) + ' is Cornered. Nowhere left to hide.',
  }[variant];
  const title = HSG_CHRON_HEAD[variant];
  const final = r.campaignOver === true;
  const wins = truce ? '' : clan(w) + ' wins Battle ' + pub.battleNo + '.';
  const bottom = hsgBottomSeat();
  return {
    variant, final, truce,
    head: final ? hsgName(w) + ' takes the Campaign!' : title,
    // The Campaign headline takes the slot, so the variant's own title moves to the sub-line.
    sub: final ? (title + ' ' + wins).trim() : truce ? 'No Seal this Battle.' : wins,
    quote,
    commands: pub.cmd,
    struck: [['Crimson', pub.struck[1]], ['Indigo', pub.struck[0]]],
    showTally: pub.campaignLen > 1,
    cta: truce ? 'Replay the Battle' : 'Next Battle',
    banners: [bottom, 1 - bottom].map(s => ({
      seat: s, name: hsgName(s), clan: clan(s), col: pub.seatCol[s],
      state: truce ? 'even' : s === w ? 'won' : 'lost',
    })),
  };
}

const HSG_CLOTH = { 0: '#2F3A6B', 1: '#A8321F', '-1': '#5A4636' };

// The Honour Seals ledger: one lane per player, one column per Battle that gave a
// Seal, left to right in the order they were won. Each Seal is struck in the clan
// it was won as, so the page reads "who is ahead, and how it got there" at a glance.
function hsgLedgerHTML(pub) {
  const lanes = [hsgBottomSeat(), 1 - hsgBottomSeat()];
  // Room for the Seals still to come (at least the Campaign's length), capped at the most Battles
  // a Campaign can take — so the cells stay big and grow a column as the war drags on.
  const cols = Math.min(2 * pub.campaignLen - 1, Math.max(pub.campaignLen, pub.wins.length + 1));
  const spoken = [];
  const lane = s => {
    let cells = '';
    for (let c = 0; c < cols; c++) {
      const w = pub.wins[c];
      cells += '<span class="hsg-ch-cell">' + (w !== undefined && hsgWinSeat(w) === s ? hsgSealHTML(hsgWinCol(w)) : '') + '</span>';
    }
    return '<span class="hsg-ch-lname">' + hsgEsc(hsgName(s)) + '</span>' + cells
      + '<span class="hsg-ch-lsum">' + pub.seals[s] + '</span>';
  };
  pub.wins.forEach((w, i) => {
    const c = hsgWinCol(w);
    spoken.push('Seal ' + (i + 1) + ': ' + hsgName(hsgWinSeat(w)) + (c === 0 || c === 1 ? ' (' + HSG_CLAN[c] + ')' : ''));
  });
  let nums = '<span></span>';
  for (let c = 0; c < cols; c++) nums += '<span class="hsg-ch-num">' + (c < pub.wins.length ? c + 1 : '') + '</span>';
  return '<div class="hsg-ch-tallybox hsg-ch-seals"><span class="hsg-ch-tally-k">Honour Seals · first to ' + pub.campaignLen + '</span>'
    + '<div class="hsg-ch-ledger" style="--cols:' + cols + '" role="img" aria-label="Honour Seals, in the order won. '
    + hsgEsc(spoken.length ? spoken.join('. ') : 'None won yet') + '">'
    + lane(lanes[0]) + lane(lanes[1]) + nums + '<span></span></div></div>';
}

// Draws one War Chronicle into its body and sets the Next Battle label. `final` is
// the gameover (the Campaign is won); otherwise the screen between Battles.
function hsgPaintChronicle(final) {
  if (typeof document === 'undefined' || !document.getElementById || !hsgPub) return;
  const body = document.getElementById(final ? 'hsg-go-body' : 'hsg-chron-body');
  const m = hsgChronicleModel(hsgPub);
  if (!body || !m) return;
  const banner = b => '<div class="hsg-ch-banner is-' + b.state + '" style="--cloth:' + (HSG_CLOTH[b.col] || HSG_CLOTH['-1']) + '">'
    + (b.col === 0 || b.col === 1
        ? '<span class="hsg-ch-emblem" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="' + (b.col === 1 ? HSG_SUN : HSG_MOON) + '" fill="#F3EAD7"/></svg></span>' : '')
    + (b.state === 'won' ? '<span class="hsg-ch-stamp" style="background:' + (HSG_INK[b.col] || HSG_FOX_INK) + '" aria-hidden="true">勝</span>' : '')
    + '<span class="hsg-ch-clan">' + hsgEsc(b.clan) + '</span>'
    + '<span class="hsg-ch-who">' + hsgEsc(b.name) + '</span></div>';
  body.innerHTML =
      '<div class="hsg-ch-hang" role="img" aria-label="' + hsgEsc(m.banners.map(b => b.name + ', ' + b.clan).join(' and ')) + '">'
    +   '<div class="hsg-ch-rod"></div><div class="hsg-ch-banners">' + m.banners.map(banner).join('') + '</div></div>'
    + '<h3 class="hsg-ch-head">' + hsgEsc(m.head) + '</h3>'
    + '<p class="hsg-ch-sub">' + hsgEsc(m.sub) + '</p>'
    + '<p class="hsg-ch-quote">' + hsgEsc(m.quote) + '</p>'
    + (m.showTally ? hsgLedgerHTML(hsgPub) : '')      // the Seals are the focus: before the stats
    + '<div class="hsg-ch-stats">'
    +   '<div class="hsg-ch-stat"><span class="hsg-ch-stat-k">Commands</span><span class="hsg-ch-stat-v">' + m.commands + '</span></div>'
    +   '<div class="hsg-ch-stat"><span class="hsg-ch-stat-k">Pieces struck</span><span class="hsg-ch-stat-v is-two">'
    +     m.struck.map(x => '<span>' + x[0] + ' ' + x[1] + '</span>').join('') + '</span></div>'
    + '</div>';
  if (!final) {
    const btn = document.getElementById('btn-hsg-chron-next');
    if (btn) btn.textContent = m.cta;
  }
  if (body.classList) { body.classList.remove('is-playing'); void body.offsetWidth; body.classList.add('is-playing'); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── S3 — Menu, War Council, How to Play shell, quit, wiring ─────────────────
// ═══════════════════════════════════════════════════════════════════════════
// The only part of this file that touches the DOM. Every id comes from
// src/screens/hsg.html. Kept apart so verify-hsg.js (null document) never runs it.

function hsgShowMenu() { hsgGo('screen-hsg-menu'); }

// Both settings cards repaint from here — from the pill handler AND from the
// SETTINGS_SYNC apply, so a client's read-only overlay shows the room's rules.
function hsgSyncSettingsUI() {
  const setPills = (group, val) => {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
      p.classList.toggle('pill-active-hsg', Number(p.getAttribute('data-val')) === val);
    });
  };
  setPills('hsg-campaign', hsgCampaignLen);
  setPills('hsg-foxes', hsgFoxes);
  const line = document.getElementById('hsg-val-foxes');
  if (line) {
    line.textContent = hsgFoxes === 2 ? '2 foxes · 4 Farmers a clan' : '4 foxes · 3 Farmers a clan';
  }
}

// ── S10 — The Household: the How to Play gallery tab ─────────────────────────
// One row per piece, drawn through hsgRenderTile (the only tile seam — a skin reaches
// the gallery for free), then the ladder, the upsets and the loop. Pure data first.
const HSG_HOUSEHOLD = [
  { id: 'Sg', line: 'Strikes an adjacent piece, a fox excepted.',                         tip: 'Only a fox can reach him while a Guard stands.' },
  { id: 'Gd', line: 'Strikes an adjacent piece, a fox excepted.',                         tip: 'While any Guard stands, even behind a door, the Shogun is Guarded.' },
  { id: 'Mk', line: 'Marches and strikes on the diagonal. Takes anything but a fox.',     tip: 'The only piece that strikes diagonally.' },
  { id: 'Sm', line: 'Strikes an adjacent piece of equal or lower rank. Charges 2.',       tip: 'The Charge needs two empty squares in a line.' },
  { id: 'Nj', line: 'Leaps over exactly one piece to take anything beyond it, a fox too.', tip: 'Can’t hit an adjacent piece.' },
  { id: 'Ar', line: 'Volleys a piece 2 or 3 squares away and stays put. Not a fox.',      tip: 'Can’t hit an adjacent piece.' },
  { id: 'Fm', line: 'Strikes an adjacent Farmer, Archer or fox.',                         tip: 'Lowest rank, but chases off foxes.' },
  { id: 'Fx', line: 'Strikes an adjacent Shogun, even a Guarded one. Nothing else.',      tip: 'Your third fox goes to your opponent.' },
];
const HSG_UPSETS = [
  ['Archer', 'volleys a Guard or a Monk from across the board — rank doesn’t matter at range.'],
  ['Ninja', 'leaps a screen to take anything beyond it, a fox included.'],
  ['Monk', 'takes anything on the diagonal that no other piece can reach.'],
  ['Farmer', 'chases off an Archer — and the foxes.'],
  ['Fox', 'takes a Guarded Shogun, the top of the ladder.'],
];
const HSG_LOOP = [
  ['Ar', 'The Archer volleys the Samurai from a distance.'],
  ['Sm', 'The Samurai cuts down the Farmer up close.'],
  ['Fm', 'The Farmer chases off the Archer.'],
];
// A piece's board string for the gallery: Crimson Sun's piece; the fox is the one nobody has found.
const hsgGalleryCell = id => (id === 'Fx' ? 'Fxp0' : id + '1');

function hsgRenderHousehold(highlightId) {
  const box = document.getElementById('hsg-household-box');
  if (!box) return;
  box.innerHTML = '';
  const card = cls => { const d = document.createElement('div'); d.className = 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2 ' + (cls || ''); return d; };
  const text = (tag, cls, t) => { const e = document.createElement(tag); e.className = cls; e.textContent = t; return e; };
  const label = t => text('p', 'text-xs font-semibold uppercase tracking-widest hsg-label', t);
  const tile = (id, size) => {
    const cell = hsgGalleryCell(id), inf = hsgCellInfo(cell);
    const url = (typeof assetFace === 'function') && assetFace('hsg', inf.assetId);
    return artMakeZoomable(hsgRenderTile(cell, { size }), url, hsgTypeName(id));
  };

  // The ladder
  const ladder = card();
  ladder.append(label('The ladder'), text('p', 'font-bold text-stone-800', 'Higher (or equal) strikes lower, up close'));
  const chips = document.createElement('div');
  chips.className = 'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-stone-500';
  HsgRules.IDS.filter(id => id !== 'Fx').forEach((id, k) => {
    if (k) chips.appendChild(text('span', 'text-stone-300', '›'));
    const c = text('span', 'font-semibold text-stone-700', HsgRules.RANK[id] + ' ' + hsgTypeName(id));
    chips.appendChild(c);
  });
  ladder.append(chips, text('p', 'text-stone-500 text-sm', 'The ranged and the sneaky ignore it — that’s the next two cards.'));
  box.appendChild(ladder);

  // One row per piece, through the seam
  HSG_HOUSEHOLD.forEach(p => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 rounded-2xl p-2.5 bg-white shadow-sm hsg-ref-row';
    row.setAttribute('data-hsg-card-id', p.id);
    const wrap = document.createElement('div');
    wrap.className = 'flex-shrink-0';
    wrap.appendChild(tile(p.id, 56));
    const txt = document.createElement('div');
    txt.className = 'flex flex-col gap-0.5 min-w-0';
    txt.append(
      text('p', 'font-bold text-stone-700 text-sm', hsgTypeName(p.id) + (p.id === 'Fx' ? '' : ' · rank ' + HsgRules.RANK[p.id])),
      text('p', 'text-stone-500 text-xs', p.line),
      text('p', 'text-stone-400 text-xs', 'Easy to miss: ' + p.tip.charAt(0).toLowerCase() + p.tip.slice(1)));
    row.append(wrap, txt);
    box.appendChild(row);
  });

  // The upsets
  const up = card();
  up.append(label('The upsets'), text('p', 'font-bold text-stone-800', 'Lower beats higher, five ways'));
  const ul = document.createElement('ul');
  ul.className = 'list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm';
  HSG_UPSETS.forEach(([who, what]) => {
    const li = document.createElement('li');
    li.append(text('span', 'font-semibold text-stone-700', who), document.createTextNode(' ' + what));
    ul.appendChild(li);
  });
  up.append(ul, text('p', 'text-stone-500 text-sm', 'Easy to miss: an Archer or a Ninja is helpless against the piece next to it.'));
  box.appendChild(up);

  // The loop triangle
  const loop = card();
  loop.append(label('The loop'), text('p', 'font-bold text-stone-800', 'Nobody is safe everywhere'));
  const tri = document.createElement('div');
  tri.className = 'flex items-center justify-center gap-2';
  HSG_LOOP.forEach(([id], k) => {
    if (k) tri.appendChild(text('span', 'text-stone-400 font-bold text-lg', '→'));
    const w = document.createElement('div'); w.className = 'flex flex-col items-center gap-1';
    w.appendChild(tile(id, 52));
    tri.appendChild(w);
  });
  tri.appendChild(text('span', 'text-stone-400 font-bold text-lg', '↺'));
  const lul = document.createElement('ul');
  lul.className = 'list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm';
  HSG_LOOP.forEach(([, line]) => lul.appendChild(text('li', '', line)));
  loop.append(tri, lul);
  box.appendChild(loop);

  if (highlightId) refHighlightRow(box, 'data-hsg-card-id', highlightId, 'hsg-ref-row-ping');
}

function hsgSetHowToTab(tab, highlightId) {
  const hh = tab === 'household', pr = tab === 'practice';
  const rules = document.getElementById('hsg-howto-body-rules');
  const home  = document.getElementById('hsg-howto-body-household');
  const prac  = document.getElementById('hsg-howto-body-practice');
  if (rules) rules.style.display = (hh || pr) ? 'none' : 'flex';
  if (home)  home.style.display  = hh ? 'flex' : 'none';
  if (prac)  prac.style.display  = pr ? 'flex' : 'none';
  hsgPracStop();                                   // leaving (or re-entering) Practice always stops its clock
  if (pr) { hsgPracLesson = -1; hsgPracS = null; hsgRenderPractice(); }
  document.querySelectorAll('[data-hsg-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-hsg');         // .pill is the base — never removed
    if (b.getAttribute('data-hsg-howto-tab') === tab) b.classList.add('pill-active-hsg');
  });
  if (hh) hsgRenderHousehold(highlightId);
}

// highlightId set → the Household tab, scrolled to that piece (refHighlightRow owns the scroll).
function hsgOpenHowTo(tab, highlightId) {
  const ov = document.getElementById('hsg-how-to-overlay');
  if (!ov) return;
  hsgSetHowToTab(highlightId ? 'household' : (tab || 'rules'), highlightId);
  // .overlay-data-inner, NOT .overflow-y-auto — the latter returns null silently.
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  if (!highlightId) ['hsg-howto-body-rules', 'hsg-howto-body-household', 'hsg-howto-body-practice'].forEach(id => {
    const body = document.getElementById(id);
    if (body) body.scrollTop = 0;
  });
  ov.style.display = 'flex';
}

// Long-press a piece on the board → its row in the Household. A drag in flight is not a hold;
// the hold swallows the click that would follow it so the piece isn't also selected.
function hsgHoldSquare(i) {
  if (!hsgPub || (hsgDrag && hsgDrag.moved)) return;
  const inf = hsgCellInfo(hsgPub.board[i]);
  if (inf.kind !== 'piece') return;                // a door or a bare floor has no row
  hsgDragCancel();
  hsgDragEndAt = Date.now();
  playDone();
  hsgOpenHowTo('household', inf.id);
}
function hsgBindCardHold(el, i) { bindCardHold(el, () => hsgHoldSquare(i)); }

// ═══════════════════════════════════════════════════════════════════════════
// ── S11 — Practice: nine lessons on small fixed boards (brief §24) ──────────
// ═══════════════════════════════════════════════════════════════════════════
// Lessons form (COMB's shape). Every lesson is a real engine state (HsgRules.applyAct)
// drawn through hsgRenderTile and tapped through hsgTapDecide / hsgMarksFor — the same
// code the Castle runs. No multiplayer: nothing here sends a packet or touches hsgB /
// hsgPub. Only the top `rows` rows of the 5×6 board are drawn; hsgLegalFor's pracFilter
// keeps every Command inside them and on the lesson's goal, so a stray tap can't strand
// the board. The player is always "You" (Crimson, seat 0); the scripted opponent is Sam.
// Own timer bag (hsgPracTimers): stopped on tab-away, on close and in hsgTeardown().
const HSG_PRAC_T = 48;
const hsgPracRM = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
let hsgPracTimers = [];
let hsgPracDone   = [];         // lesson indexes finished this visit (memory only)
let hsgPracLesson = -1;         // -1 = the picker
let hsgPracS      = null;       // the lesson's engine state
let hsgPracStep   = 0;
let hsgPracSel    = -1;
let hsgPracArmed  = -1;
let hsgPracBusy   = false;      // Sam's scripted reply is on its way
let hsgPracEnd    = null;       // set when the lesson is won: { text }
let hsgPracNote   = '';         // the reply's one-line caption

function hsgPracLater(fn, ms) {
  const h = setTimeout(() => { hsgPracTimers = hsgPracTimers.filter(x => x !== h); fn(); }, ms);
  hsgPracTimers.push(h);
  return h;
}
function hsgPracStop() {
  hsgPracTimers.forEach(h => clearTimeout(h));
  hsgPracTimers = [];
  hsgPracBusy = false;
}

const hsgPracAll = n => Array.from({ length: n }, (_, i) => i);
const hsgPracIs = (a, k, i, j, kind) => a[0] === k && a[1] === i && (j === undefined || a[2] === j) && (kind === undefined || a[3] === kind);
// every piece of yours in the open (the ring on a lesson that lets you pick any of them)
const hsgPracOwn = S => S.board.map((c, i) => (c && c[2] && c[0] === S.teamCol[0] ? i : -1)).filter(i => i >= 0);
const hsgPracAnyOpen = a => a[0] === 'U';
const hsgPracFoxStrike = (a, S) => a[0] === 'S' && a[1] === 2 && !!S.board[a[2]] && S.board[a[2]][1] === 'Fx';

// board: row-major tokens, 5 per row. '.' empty · 'Sm1' open · '?Fm0' behind a door.
// Colours: 1 = Crimson Sun (You) · 0 = Indigo Moon (Sam) · a '?Fx' is a fox nobody has found.
const HSG_LESSONS = [
  { title: 'Open a door', goal: 'Open one and the banners rise.', rows: 2, teamCol: null,
    board: ['?Fm1', '?Ar0', '?Sm1', '?Mk0', '?Fm0', '?Gd1', '?Fm1', '?Nj0', '?Ar1', '?Sm0'],
    steps: [{ pick: 'Every piece hides behind a door. Tap one.', armed: 'It lifted and asks “Open?”. Tap the same door again.', door: true,
      from: () => hsgPracAll(10), allow: hsgPracAnyOpen, want: hsgPracAnyOpen }],
    win: S => 'The banners rise: whoever finds the first clan piece decides who is Crimson and who is Indigo. You are ' + HSG_SHORT[S.teamCol[0]] + '.' },

  { title: 'The ladder', goal: 'Strike a lower piece up close.', rows: 1, teamCol: [1, 0],
    board: ['Sm1', 'Fm0', '.', 'Fm1', 'Sm0'],
    steps: [{ pick: 'Tap your Samurai (rank 5).', go: 'Strike the Farmer (rank 2). Higher beats lower, up close.', from: () => [0], to: () => [1],
      allow: a => hsgPracIs(a, 'S', 0, 1), want: a => hsgPracIs(a, 'S', 0, 1) }],
    win: () => 'The Samurai takes the Farmer’s square. Higher (or equal) rank wins up close; the specialists bend that rule.' },

  { title: 'The Archer', goal: 'Volley a piece 2 or 3 squares away.', rows: 1, teamCol: [1, 0],
    board: ['Ar1', '.', '.', 'Sm0', '.'],
    steps: [{ pick: 'Tap your Archer.', go: 'The Samurai is three squares away. Volley it!', from: () => [0], to: () => [3],
      allow: a => hsgPracIs(a, 'S', 0, 3, 'v'), want: a => hsgPracIs(a, 'S', 0, 3, 'v') }],
    win: () => 'Volley! The Archer fired from range and stayed put. Remember: beside a piece, an Archer is helpless.' },

  { title: 'The Ninja', goal: 'Leap over a screen.', rows: 1, teamCol: [1, 0],
    board: ['Nj1', 'Fm1', 'Ar0', '.', '.'],
    steps: [{ pick: 'Tap your Ninja.', go: 'Leap over your Farmer (the screen) onto the Archer.', from: () => [0], to: () => [2],
      allow: a => hsgPracIs(a, 'S', 0, 2, 'l'), want: a => hsgPracIs(a, 'S', 0, 2, 'l') }],
    win: () => 'Leap! The Ninja needs exactly one piece in between, and can’t hit anything beside it.' },

  { title: 'The Monk', goal: 'Strike on the diagonal.', rows: 2, teamCol: [1, 0],
    board: ['.', '.', 'Ar0', '.', '.', '.', 'Mk1', '.', '.', '.'],
    steps: [{ pick: 'Tap your Monk.', go: 'The Archer sits on his diagonal. Strike it.', from: () => [6], to: () => [2],
      allow: a => hsgPracIs(a, 'S', 6, 2), want: a => hsgPracIs(a, 'S', 6, 2) }],
    win: () => 'The Monk strikes corner to corner, the one direction nobody else can.' },

  { title: 'The Samurai', goal: 'Charge past an Archer.', rows: 1, teamCol: [1, 0],
    board: ['Sm1', '.', '.', 'Ar0', '.'],
    steps: [{ pick: 'Tap your Samurai.', go: 'The chevrons show the Charge: two empty squares in a line. Land beside the Archer.', from: () => [0], to: () => [2],
      allow: a => hsgPracIs(a, 'C', 0, 2), want: a => hsgPracIs(a, 'C', 0, 2) }],
    win: () => 'Charged! The Archer shoots from 2–3 squares away, but beside the Samurai it can’t touch him, and he strikes next.' },

  { title: 'The Guard', goal: 'Take the last Guard, then the Shogun.', rows: 2, teamCol: [1, 0], dm: [1, 1],
    board: ['.', 'Sg0', '.', '.', '.', '.', 'Gd0', 'Gd1', '.', '.'],
    steps: [
      { pick: 'While a Guard stands (even one still behind a door) the Shogun is Guarded (gold frame, see his flag) and nothing can touch him. Tap your Guard.',
        go: 'Strike their Guard.', from: () => [7], to: () => [6],
        allow: a => hsgPracIs(a, 'S', 7, 6), want: a => hsgPracIs(a, 'S', 7, 6) },
      { pick: 'That was their last Guard, so his flag flips to Exposed. Tap your Guard.',
        go: 'Strike the Shogun!', from: () => [6], to: () => [1],
        allow: a => hsgPracIs(a, 'S', 6, 1), want: a => hsgPracIs(a, 'S', 6, 1) }],
    win: () => 'The Shogun falls and the Battle is yours. Take the Guards first.' },

  { title: 'The foxes', goal: 'Find one, then stop the enemy’s.', rows: 1, teamCol: [1, 0], hire: 2,
    board: ['.', '?Fx', 'Fm1', '?Fx', '.'],
    steps: [
      { pick: 'Foxes hide behind doors too. Tap a door.', armed: 'Tap the same door again to open it.', door: true,
        from: () => [1, 3], allow: hsgPracAnyOpen, want: hsgPracAnyOpen },
      { pick: 'She sides with you: each clan can take half the foxes. Now tap the other door.', armed: 'Tap the same door again to open it.', door: true,
        from: S => [1, 3].filter(i => !S.board[i][2]), allow: hsgPracAnyOpen, want: hsgPracAnyOpen },
      { pick: 'That fox went to your opponent, and only a Farmer or the Ninja can stop her. Tap your Farmer.',
        go: 'Strike the enemy fox.', from: () => [2], to: S => [1, 3].filter(i => S.board[i] && S.board[i][0] === S.teamCol[1]),
        allow: hsgPracFoxStrike, want: hsgPracFoxStrike }],
    win: () => 'She’s gone. Foxes slip past a Guarded Shogun, so keep a Farmer or the Ninja close.' },

  { title: 'The Last Lantern', goal: 'Watch the count run down.', rows: 2, teamCol: [1, 0], quiet: 8, beam: true,
    board: ['Fm1', 'Sm1', '.', 'Ar1', '?Fm0', '.', '?Gd0', '.', 'Mk0', 'Fm0'],
    steps: [
      { pick: 'Twelve quiet Commands in a row end the Battle; the lanterns above the board count them down. Tap a piece of yours.',
        go: 'March it. A March burns a lantern; opening a door or striking relights them all.', from: hsgPracOwn,
        allow: a => a[0] === 'M', want: a => a[0] === 'M', reply: true },
      { pick: 'Sam marched too: both players burn lanterns. Tap a piece and march again.',
        go: 'March it. Almost out.', from: hsgPracOwn,
        allow: a => a[0] === 'M', want: a => a[0] === 'M', reply: true }],
    win: (S, end) => 'The last lantern goes out! You have ' + end.counts[0] + ' pieces in the open, Sam has ' + end.counts[1]
      + '. Closed doors count for no one. ' + (end.counts[0] > end.counts[1] ? 'You take the Battle.' : end.counts[0] < end.counts[1] ? 'Sam takes it.' : 'A Truce.') },
];

function hsgPracCell(tok) {
  if (tok === '.') return null;
  const closed = tok.charAt(0) === '?';
  const t = closed ? tok.slice(1) : tok;
  const type = t.slice(0, 2);
  return [type === 'Fx' ? HsgRules.NEUTRAL : +t.charAt(2), type, !closed];
}

function hsgPracBuild(L) {
  const board = new Array(HSG_CELLS).fill(null);
  L.board.forEach((tok, i) => { board[i] = hsgPracCell(tok); });
  const cfg = HsgRules.makeCfg({ hire: L.hire || 4 });
  return { board, teamCol: L.teamCol ? L.teamCol.slice() : [null, null], dm: (L.dm || [2, 2]).slice(), quiet: L.quiet || 0,
    pool: {}, cmd: 0, cfg, shrouds: board.filter(c => c && !c[2]).length, hired: [0, 0], pending: [] };
}

// The public-copy shape hsgTapDecide / hsgMarksFor / hsgLegalFor read, built from the lesson's state,
// plus pracFilter (the one hook hsgLegalFor knows about: a Practice-only narrowing of the legal Commands).
function hsgPracPub() {
  const S = hsgPracS, L = HSG_LESSONS[hsgPracLesson], step = L.steps[Math.min(hsgPracStep, L.steps.length - 1)];
  const lim = L.rows * 5;
  return { battleNo: 1, replay: false, firstSeat: 0, turnSeat: 0, cmd: S.cmd,
    board: S.board.map(c => hsgCellString(c, 0)),
    seatCol: [S.teamCol[0] === null ? -1 : S.teamCol[0], S.teamCol[1] === null ? -1 : S.teamCol[1]],
    guards: S.dm.slice(), foxesHeld: S.hired.slice(), foxTotal: S.cfg.hire, quiet: S.quiet,
    struck: [0, 0], seals: [0, 0], wins: [], campaignLen: 1, last: { k: 'none' }, result: { reason: 'none' },
    pracFilter: a => (a[0] === 'U' ? a[1] < lim : a[1] < lim && a[2] < lim) && step.allow(a, S) };
}

function hsgPracStart(n) {
  hsgPracStop();
  hsgPracLesson = n;
  hsgPracS = hsgPracBuild(HSG_LESSONS[n]);
  hsgPracStep = 0; hsgPracSel = -1; hsgPracArmed = -1; hsgPracEnd = null; hsgPracNote = '';
  hsgRenderPractice();
}

function hsgPracSoundFor(a, out) {
  if (a[0] === 'U') hsgSound(out.revealed && out.revealed[1] === 'Fx' ? 'fox' : 'open');
  else if (a[0] === 'S') hsgSound(out.over && out.reason === 'shogun' ? 'foundYou' : a[3] === 'v' ? 'volley' : a[3] === 'l' ? 'leap' : 'strike');
  else hsgSound('march');
}

function hsgPracTap(i) {
  if (!hsgPracS || hsgPracBusy || hsgPracEnd) return;
  const r = hsgTapDecide(hsgPracPub(), 0, hsgPracSel, hsgPracArmed, i);
  hsgPracSel = r.sel; hsgPracArmed = r.armed;
  if (r.act) hsgPracApply(r.act); else hsgRenderPractice();
}

function hsgPracApply(act) {
  const L = HSG_LESSONS[hsgPracLesson], step = L.steps[hsgPracStep], S = hsgPracS;
  const out = HsgRules.applyAct(S, 0, act);
  hsgPracSel = -1; hsgPracArmed = -1;
  hsgPracSoundFor(act, out);
  if (out.over && out.reason !== 'shogun') hsgSound('lantern');
  hsgPracStep++;
  const finish = end => {
    hsgPracEnd = { text: L.win(S, end) };
    if (hsgPracDone.indexOf(hsgPracLesson) < 0) hsgPracDone.push(hsgPracLesson);
    playSuccess();
    hsgRenderPractice();
  };
  if (step.reply && !out.over) {
    // Sam's scripted March, so the lantern really runs down (instant when motion is reduced)
    hsgPracBusy = true; hsgPracNote = 'Sam marches too.';
    hsgRenderPractice();
    const reply = () => {
      hsgPracBusy = false; hsgPracNote = '';
      const m = HsgRules.legal(S, S.teamCol[1]).find(a => a[0] === 'M');
      const o2 = m ? HsgRules.applyAct(S, 1, m) : { over: false };
      if (m) hsgSound('march');
      if (o2.over) { hsgSound('lantern'); finish(o2); }
      else if (hsgPracStep >= L.steps.length) finish(o2);
      else hsgRenderPractice();
    };
    if (hsgPracRM()) reply(); else hsgPracLater(reply, 600);
    return;
  }
  if (hsgPracStep >= L.steps.length) finish(out); else hsgRenderPractice();
}

function hsgPracCaption(L) {
  if (hsgPracEnd) return hsgPracEnd.text;
  if (hsgPracNote) return hsgPracNote;
  const step = L.steps[hsgPracStep];
  if (hsgPracArmed >= 0) return step.armed || step.pick;
  return hsgPracSel >= 0 && step.go ? step.go : step.pick;
}

function hsgRenderPractice() {
  const box = document.getElementById('hsg-practice-box');
  if (!box) return;
  box.innerHTML = '';
  const el = (tag, cls, t) => { const e = document.createElement(tag); if (cls) e.className = cls; if (t !== undefined) e.textContent = t; return e; };

  if (hsgPracLesson < 0 || !hsgPracS) {                       // the picker
    const head = el('div', 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2');
    head.append(el('p', 'text-xs font-semibold uppercase tracking-widest hsg-label', 'Practice'),
      el('p', 'font-bold text-stone-800', 'Nine small boards'),
      el('p', 'text-stone-500 text-sm', 'One idea each, about half a minute. Pick any, leave any time.'));
    box.appendChild(head);
    HSG_LESSONS.forEach((L, n) => {
      const b = el('button', 'flex items-center gap-3 rounded-2xl p-3 bg-white shadow-sm min-h-14 text-left active:scale-95 transition-transform duration-100');
      b.type = 'button'; b.setAttribute('data-hsg-lesson', String(n));
      const done = hsgPracDone.indexOf(n) >= 0;
      const num = el('span', 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' + (done ? 'hsg-prac-tick' : 'bg-stone-200 text-stone-600'), done ? '✓' : String(n + 1));
      const txt = el('span', 'flex flex-col min-w-0');
      txt.append(el('span', 'font-bold text-stone-800 text-sm', L.title), el('span', 'text-stone-500 text-xs', L.goal));
      b.append(num, txt);
      b.addEventListener('click', () => { playPillClick(); hsgPracStart(n); });
      box.appendChild(b);
    });
    return;
  }

  const L = HSG_LESSONS[hsgPracLesson], S = hsgPracS, pub = hsgPracPub();
  const top = el('div', 'flex items-center justify-between gap-2');
  const back = el('button', 'min-h-11 px-3 rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-transform duration-100', '← Lessons');
  back.type = 'button'; back.id = 'btn-hsg-prac-back';
  back.addEventListener('click', () => { playExit(); hsgPracStop(); hsgPracLesson = -1; hsgPracS = null; hsgRenderPractice(); });
  const count = hsgPracEnd ? 'Done' : (hsgPracStep + 1) + ' / ' + L.steps.length;
  top.append(back, el('p', 'text-xs font-semibold uppercase tracking-widest hsg-label', 'Lesson ' + (hsgPracLesson + 1) + ' of ' + HSG_LESSONS.length + ' · ' + count));
  box.appendChild(top);

  const coach = el('div', 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1');
  const cap = el('p', 'text-stone-500 text-sm', hsgPracCaption(L));
  cap.id = 'hsg-prac-caption'; cap.setAttribute('aria-live', 'polite');
  coach.append(el('p', 'font-bold text-stone-800', L.title), cap);
  if (L.teamCol) coach.append(el('p', 'text-stone-400 text-xs', 'You are ' + HSG_SHORT[L.teamCol[0]] + ' · Sam is ' + HSG_SHORT[L.teamCol[1]]));
  box.appendChild(coach);
  if (cap.scrollIntoView) cap.scrollIntoView({ block: 'nearest' });   // a new coach line comes back into view

  if (L.beam) {
    const lit = Math.max(0, 12 - S.quiet);
    const beam = el('div', 'hsg-prac-beam');
    beam.setAttribute('role', 'img'); beam.setAttribute('aria-label', lit + ' of 12 lanterns lit');
    for (let k = 0; k < 12; k++) beam.appendChild(el('span', 'hsg-lantern' + (k < lit ? ' is-lit' : '')));
    box.appendChild(beam);
  }

  // the board: the top rows of the real grid, every tile through the seam
  const frame = el('div', 'hsg-frame hsg-prac-frame');
  frame.style.cssText = '--hsg-fp:6px;--hsg-fb:2px;--hsg-tg:3px;--hsg-t:' + HSG_PRAC_T + 'px';
  const grid = el('div', 'hsg-grid hsg-prac-grid');
  const live = !hsgPracEnd && !hsgPracBusy;
  const mk = live ? hsgMarksFor(pub, 0, hsgPracSel) : { marks: {}, screens: [] };
  const step = L.steps[Math.min(hsgPracStep, L.steps.length - 1)];
  const ring = !live ? [] : hsgPracArmed >= 0 ? [hsgPracArmed] : hsgPracSel >= 0 ? (step.to ? step.to(S) : []) : (step.from ? step.from(S) : []);
  for (let i = 0; i < L.rows * 5; i++) {
    const b = el('button', 'hsg-sq' + (i === hsgPracSel ? ' is-picked' : '') + (i === hsgPracArmed ? ' is-armed' : '') + (ring.indexOf(i) >= 0 ? ' is-coach' : ''));
    b.type = 'button'; b.setAttribute('data-i', String(i));
    const m = mk.marks[i];
    const opts = { mark: m ? m.mark : '', dir: m ? m.dir : '', armed: i === hsgPracArmed, screen: mk.screens.indexOf(i) >= 0, guard: hsgShogunState(pub, pub.board[i]) };
    b.appendChild(hsgRenderTile(pub.board[i], opts));
    b.setAttribute('aria-label', hsgSquareLabel(pub, i, opts));
    b.addEventListener('click', () => hsgPracTap(i));
    grid.appendChild(b);
  }
  grid.style.gridTemplateColumns = 'repeat(5, ' + HSG_PRAC_T + 'px)';
  frame.appendChild(grid);
  const wrap = el('div', 'flex justify-center');
  wrap.appendChild(frame);
  box.appendChild(wrap);

  const row = el('div', 'flex gap-2');
  const again = el('button', 'min-h-14 flex-1 rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-lg transition-all duration-150', 'Practice again');
  again.type = 'button'; again.id = 'btn-hsg-prac-again';
  again.addEventListener('click', () => { playPillClick(); hsgPracStart(hsgPracLesson); });
  row.appendChild(again);
  if (hsgPracEnd && hsgPracLesson < HSG_LESSONS.length - 1) {
    const next = el('button', 'hsg-cta min-h-14 flex-1 rounded-2xl font-semibold text-lg active:scale-95 transition-all duration-150', 'Next lesson');
    next.type = 'button'; next.id = 'btn-hsg-prac-next';
    next.addEventListener('click', () => { playPillClick(); hsgPracStart(hsgPracLesson + 1); });
    row.appendChild(next);
  }
  box.appendChild(row);
}

function hsgShow(id, on) {
  const el = document.getElementById(id);
  if (el) el.style.display = on ? 'flex' : 'none';
}

// Pass-the-Phone names -> the Campaign. Blank = "Lord 1" / "Lord 2"; identical names
// (trim, case-insensitive) are refused with a shake on the second input.
function hsgSetupStart() {
  const a = document.getElementById('hsg-name-0');
  const b = document.getElementById('hsg-name-1');
  const err = document.getElementById('hsg-setup-err');
  const n0 = ((a && a.value) || '').trim() || 'Lord 1';
  const n1 = ((b && b.value) || '').trim() || 'Lord 2';
  if (n0.toLowerCase() === n1.toLowerCase()) {
    if (err) err.style.display = 'block';
    if (b) {
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      setTimeout(() => b.classList.remove('shake'), 560);   // .shake is `infinite` globally
    }
    return;
  }
  if (err) err.style.display = 'none';
  hsgNames = [n0, n1];
  hsgStartCampaign();
}

// The quit contract (logic-engine.md § Mid-Game Quit Contract): a lobby session is
// dissolved through the engine — tell the host, then resetToLobby(). Never the menu.
function hsgQuitConfirm() {
  hsgShow('hsg-quit-overlay', false);
  if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
  hsgTeardown();
  hsgShowMenu();
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    // New-game sound re-wiring: this markup sits after engine.js's parse-time
    // querySelectorAll, so it cannot reach it. FRT is the reference.
    document.querySelectorAll(
      '#screen-hsg-menu .btn-open-sound, #screen-hsg-setup .btn-open-sound, ' +
      '#screen-hsg-standby .btn-open-sound, #screen-hsg-castle .btn-open-sound, ' +
      '#screen-hsg-chronicle .btn-open-sound, #screen-hsg-gameover .btn-open-sound'
    ).forEach(btn => btn.addEventListener('click', openSoundOverlay));

    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

    // Lobby entry — the exact suite pattern. activeGameId drives the slider/mute theme
    // and the music, so it is set BEFORE the showScreen that triggers them.
    on('btn-hsg', () => { playLaunch(); activeGameId = 'hsg'; hsgShowMenu(); });

    // Play CTA, dual context: single -> pick create/join/one-phone; anything else is a
    // lobby session whose entry is hsgOnEnter() (host -> Battle 1, client -> standby).
    on('btn-hsg-menu-play', () => {
      playLaunch();
      if (window.syllyMultiplayerMode === 'single') mpShowModeScreen('hsg');
      else hsgOnEnter();
    });
    on('btn-hsg-menu-how-to', () => { playDone(); hsgOpenHowTo(); });
    on('btn-hsg-menu-settings', () => {
      playDone();
      const ov = document.getElementById('hsg-settings-overlay');
      if (!ov) return;
      const inner = ov.querySelector('.overlay-data-inner');
      if (inner) inner.scrollTop = 0;
      hsgSyncSettingsUI();
      ov.style.display = 'flex';
    });
    on('btn-hsg-menu-back', () => { playExit(); resetToLobby(); });

    // Overlay dismissals — ids end in a `close`/`cancel` segment so the engine's
    // delegated backdrop tap-to-dismiss finds and clicks them.
    on('btn-hsg-settings-close', () => { playDone(); hsgShow('hsg-settings-overlay', false); });
    const closeHowTo = () => { playDone(); hsgPracStop(); hsgShow('hsg-how-to-overlay', false); };
    on('btn-hsg-howto-close',    closeHowTo);
    on('btn-hsg-howto-household-close', closeHowTo);
    on('btn-hsg-howto-practice-close', closeHowTo);
    document.querySelectorAll('[data-hsg-howto-tab]').forEach(b => {
      b.addEventListener('click', () => { playPillClick(); hsgSetHowToTab(b.getAttribute('data-hsg-howto-tab')); });
    });
    on('btn-hsg-how-to',         () => { playDone(); hsgOpenHowTo(); });

    // War Council pills. Values are numbers in state, strings in the DOM.
    const bindPill = (group, fn) => {
      document.querySelectorAll(`[data-group="${group}"]`).forEach(pill => {
        pill.addEventListener('click', () => {
          playPillClick();
          fn(Number(pill.getAttribute('data-val')));
          hsgSyncSettingsUI();
        });
      });
    };
    bindPill('hsg-campaign', v => { hsgCampaignLen = v; });
    bindPill('hsg-foxes',    v => { hsgFoxes = v; });
    hsgSyncSettingsUI();

    on('btn-hsg-setup-start', () => { playLaunch(); hsgSetupStart(); });

    // The Castle (S4). One delegated listener per gesture on the grid; the 30
    // squares are created on the first paint. A click straight after a drop is
    // the drop's own click — swallowed.
    const grid = document.getElementById('hsg-grid');
    if (grid) {
      grid.addEventListener('click', e => {
        const sq = e.target && e.target.closest ? e.target.closest('.hsg-sq') : null;
        if (!sq) return;                                 // a gap between squares counts as "off"
        e.stopPropagation();
        if (Date.now() - hsgDragEndAt < 400) return;
        hsgTap(+sq.getAttribute('data-i'));
      });
      grid.addEventListener('pointerdown', hsgDragStart);
      grid.addEventListener('pointermove', hsgDragMove);
      grid.addEventListener('pointerup', hsgDragEnd);
      grid.addEventListener('pointercancel', hsgDragEnd);
    }
    const castle = document.getElementById('hsg-castle');
    if (castle) castle.addEventListener('click', hsgTapOff);
    on('btn-hsg-chron-next', () => {
      playLaunch();
      const mode = window.syllyMultiplayerMode;
      if (!hsgPub) return;
      if (mode === 'client') { hsgClientNextBattle(); return; }   // either player may tap it (spec §17 #8)
      hsgHostNextBattle(mode === 'single' ? 0 : mpMyPlayerIdx, { battleNo: hsgPub.battleNo, replay: hsgPub.replay });
    });

    // Quit (Castle / Chronicle / setup / standby ✕) and its two buttons.
    document.querySelectorAll('.btn-hsg-quit-open').forEach(b =>
      b.addEventListener('click', () => { playDone(); hsgShow('hsg-quit-overlay', true); }));
    on('btn-hsg-quit-confirm', () => { playExit(); hsgQuitConfirm(); });
    on('btn-hsg-quit-cancel',  () => { playDone(); hsgShow('hsg-quit-overlay', false); });

    // Gameover: ✕ and Leave the Field go straight to the lobby (the game is over);
    // New Campaign confirms through its Decision Modal, label set per mode when opened.
    on('btn-hsg-go-exit',  () => { playExit(); resetToLobby(); });
    on('btn-hsg-go-leave', () => { playExit(); resetToLobby(); });
    on('btn-hsg-go-new', () => {
      playDone();
      const mode = window.syllyMultiplayerMode;
      const btn = document.getElementById('btn-hsg-new-confirm');
      if (btn) btn.textContent = mode === 'host' ? 'Restart in the lobby' : mode === 'client' ? 'Leave Session' : 'Toss the fan';
      hsgShow('hsg-new-campaign-overlay', true);
    });
    on('btn-hsg-new-cancel', () => { playDone(); hsgShow('hsg-new-campaign-overlay', false); });
    on('btn-hsg-new-confirm', () => {
      playLaunch();
      hsgShow('hsg-new-campaign-overlay', false);
      const mode = window.syllyMultiplayerMode;
      if (mode !== 'single') { mpReturnToLobby(); return; }   // host restarts in the lobby; client leaves
      hsgStartCampaign();
    });
  });
}
