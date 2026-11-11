// ═══════════════════════════════════════════════════════════════════════════
// hsg.js — Hide and Shogun (game 22). Two clans, thirty doors, someone behind
// every one. Find their Shogun before they find yours.
// Two players, host-authoritative, hidden information (the closed doors).
//
// ── STAGE S2 — THE STATE MACHINE, HEADLESS ──────────────────────────────────
// This file is the Campaign, the host's Command pipeline, the public-copy codec
// and the masked state. There is NO markup, NO render function and NO packet
// RECEIVER here yet: screens are S3–S6, the client path is S7, bots S8,
// reconnect S9. The send sites below (HSG_BATTLE_START, HSG_COMMAND_DONE,
// HSG_STATE) are drafts until S7 writes their receivers and re-reads them
// through a loopback (logic-engine.md — "a send site written without a
// receiver is a draft").
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
//             engine.js (showScreen — S3 registers the screens),
//             engine-multiplayer.js (mpSendEnvelope, mpSendPrivate, mpPlayerSlots,
//               mpIsBotSlot, mpBotsPrompt, mpSeatLabel, mpUnlockSync)
// Read by: tools/verify-hsg.js (and verify-hsg-loopback / -bots from S7/S8).
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
let hsgStruck      = [0, 0];   // pieces struck per COLOUR, this Battle (War Chronicle stat)
let hsgLast        = { k: 'none' };     // the last Command — see hsgBuildPub
let hsgResult      = { reason: 'none' };// the Battle's result — see hsgBuildPub
let hsgSeed        = null;     // test hook: pins the layout shuffle; never sent anywhere

// ── UI state (every device; display only) ──────────────────────────────────
let hsgSel         = -1;       // square of the lifted piece, -1 = none
let hsgDoorArmed   = -1;       // square of the lifted door ("Open?"), -1 = none
let hsgFlavourIdx  = 0;        // Battle intro line (host-picked in multi-device)
let hsgTimers      = [];       // EVERY setTimeout handle this game owns — hsgStopTimers() clears all

// ── Constants ───────────────────────────────────────────────────────────────
const HSG_BATTLE_INTRO_MS = 3500;   // "about 3.5 s, by itself" (spec §2)
const HSG_ENDING_MS       = 2400;   // the Found you! / last-lantern / Cornered beat before the Chronicle
const HSG_FLAVOUR_LINES   = 5;      // brief §0c — one picked per Battle by the host
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
    campaignLen: hsgNum(p.campaignLen, 3),
    last:        { k: 'none' },
    result:      { reason: 'none' },
  };
  const lk = hsgStr(last.k, 'none');
  if (lk !== 'none') out.last = { k: lk, i: hsgNum(last.i, 0), j: hsgNum(last.j, 0), kind: hsgStr(last.kind, '') };
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
    seals: hsgSeals.slice(), campaignLen: hsgCampaignLen,
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
  return HsgRules.battleLegal({ S, team: hsgTeamOfSeat(seat, pub.firstSeat), over: null });
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
  if (mode === 'client') { hsgGo('screen-hsg-standby'); return; }
  hsgStartCampaign();
}

// A fresh Campaign: Seals cleared, Battle 1, the fan tossed again.
// (New Campaign on one phone, and the host's first Battle.)
function hsgStartCampaign() {
  hsgSeals = [0, 0];
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
  hsgSel = -1; hsgDoorArmed = -1;
  hsgFlavourIdx = Math.floor(Math.random() * HSG_FLAVOUR_LINES);
  hsgPhase = 'battle-intro';
  hsgPub = hsgBuildPub();
  if (hsgIsHost()) mpSendEnvelope({ type: 'SYNC', payload: { action: 'HSG_BATTLE_START', pub: hsgPub, flavourIdx: hsgFlavourIdx } });
  hsgGo('screen-hsg-battle-intro');
  hsgLater(hsgBattleIntroDone, HSG_BATTLE_INTRO_MS);
}

// The host's Battle intro ends (each device runs its own timer; nothing is sent).
function hsgBattleIntroDone() {
  if (hsgPhase !== 'battle-intro') return;
  hsgPhase = 'castle';
  hsgGo('screen-hsg-castle');
  hsgOpenCommand();
}

// Next Battle / Replay the Battle. EITHER player may tap it: the first tap wins
// (spec §17 #8). `tag` is the { battleNo, replay } the tapper was looking at —
// a double start is refused because the first one changes both. Host / one phone.
function hsgHostNextBattle(seat, tag) {
  if (seat !== 0 && seat !== 1) return { ok: false, why: 'seat' };
  if (hsgPhase !== 'chronicle') return { ok: false, why: 'phase' };
  if (tag && (tag.battleNo !== hsgBattleNo || tag.replay !== hsgReplay)) return { ok: false, why: 'stale' };
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
  hsgLast = act[0] === 'U' ? { k: 'U', i: act[1], j: act[1], kind: '' }
          : { k: act[0], i: act[1], j: act[2], kind: act[0] === 'S' ? act[3] : '' };
  hsgSel = -1; hsgDoorArmed = -1;

  // Then, in this order (spec §6): a Shogun struck → the Last Lantern → is the
  // player to move Cornered? battleStep already did the first two; the third is ours.
  if (!out.over) HsgRules.battleCheckCornered(B);
  if (B.over) hsgEndBattle(hsgResultOf(B.over));
  hsgPub = hsgBuildPub();                          // ONE snapshot, after everything settled
  if (hsgIsHost()) mpSendEnvelope({ type: 'SYNC', payload: { action: 'HSG_COMMAND_DONE', pub: hsgPub, act: act, fx: fx } });
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
  if (result.winnerSeat >= 0) hsgSeals[result.winnerSeat]++;
  result.campaignOver = hsgSeals.some(n => n >= hsgCampaignLen);
  hsgResult = result;
  hsgPhase = 'ending';
  hsgStopTimers();                                 // an intro still running has nothing left to do
  if (typeof mpBotsCancel === 'function') mpBotsCancel();
  hsgLater(hsgFinishEnding, HSG_ENDING_MS);
}

// The ending beat is over: the War Chronicle between Battles, or the last one.
function hsgFinishEnding() {
  if (hsgPhase !== 'ending') return;
  hsgPhase = hsgResult.campaignOver ? 'gameover' : 'chronicle';
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
// ── Host → one seat: HSG_STATE ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// The phase a rejoiner needs (spec §11): mid-Battle-intro skips the intro.
function hsgPhaseForWire() {
  if (hsgPhase === 'gameover') return 'gameover';
  if (hsgPhase === 'chronicle' || hsgPhase === 'ending') return 'chronicle';
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
// ── Teardown (resetToLobby / quit-confirm) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Settings (hsgCampaignLen, hsgFoxes) persist. S3 wires this into resetToLobby().
function hsgTeardown() {
  hsgStopTimers();
  hsgB = null; hsgPub = null; hsgPhase = 'idle';
  hsgSel = -1; hsgDoorArmed = -1;
  hsgSeals = [0, 0]; hsgBattleNo = 1; hsgReplay = false;
  hsgStruck = [0, 0]; hsgLast = { k: 'none' }; hsgResult = { reason: 'none' };
}
