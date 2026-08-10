// ═══════════════════════════════════════════════════════════════════════════
// frt.js — Fruit Salad (Cockroach Poker)  ·  Game 14
// "This is definitely a banana. Trust me." 🍌
//
// MDLM-only · couch security · sequential host-authoritative · 2-player duel auto-engages.
// Spec: docs/new-game-tech-fruit-salad.md   Brief: docs/new-ideas/new-game-fruit-salad.md
//
// Depends on: engine.js (showScreen, resetToLobby, play*, shuffle, activeGameId),
//             engine-multiplayer.js (syllyMultiplayerMode, mpMyPlayerIdx, mpPlayerSlots,
//             mpSendEnvelope, mpReturnToLobby, MP_GAME_CONFIGS)
// ═══════════════════════════════════════════════════════════════════════════

// ── Fruit data contract (the only "skin"; v1 = emoji) ───────────────────────
// id: stable int 0–7 · cat: 'A' resolution-trigger | 'B' passive | 'C' interaction
const FRT_FRUITS = [
  { id: 0, name: 'Smug Banana',        emoji: '🍌', cat: 'A', persona: 'Wrong challenge on a Banana → you keep the initiative and serve again.' },
  { id: 1, name: 'Sour Lemon',         emoji: '🍋', cat: 'A', persona: 'Lose with a Lemon → your challenger flips one random card from their own stash.' },
  { id: 2, name: 'Charming Peach',     emoji: '🍑', cat: 'A', persona: 'A Peach lands in a bowl → the challenger must flip one of their own Peaches (if held).' },
  { id: 3, name: 'Dramatic Grape',     emoji: '🍇', cat: 'A', persona: 'A Grape flips → whoever holds the most hidden Grapes flips one (ties: all of them).' },
  { id: 4, name: 'Chill Watermelon',   emoji: '🍉', cat: 'B', persona: 'A public counter shows how many Watermelons each player is hiding.' },
  { id: 5, name: 'Sus Pear',           emoji: '🍐', cat: 'C', persona: 'Peek and find a Pear → pocket it and swap any card from your stash before passing on.' },
  { id: 6, name: 'Panicked Strawberry', emoji: '🍓', cat: 'C', persona: 'Serving a Strawberry has a 25% chance to panic — it auto-reveals into your own bowl.' },
  { id: 7, name: 'Angry Apple',        emoji: '🍎', cat: 'C', persona: 'An Apple flips → the loser must serve the winner next, and that target cannot Peek.' },
];

// Banana-leaf palette (see spec §1)
const FRT_FILL = '#FFE500';   // electric lemon fill
const FRT_INK  = '#292524';   // stone-800 — dark ink on lemon (was white; fixed a WCAG contrast failure)
const FRT_LEAF = '#047857';   // leaf accent — text-on-white + True button + selection outline
const FRT_DARK = '#44403c';   // dark chip (stack count badges)

// ── Settings (persist between Fruit-Offs and play-agains) ───────────────────
let frtFruitStock = 'standard'; // 'standard'(64) | 'swift'(48) | 'mega'(80)
let frtRounds     = 3;          // Fruit-Offs: 1 | 3 | 5
let frtTurnTimer  = 0;          // Think Before You Fruit: 0(off, default) | 15 | 30 | 60 (s)
let frtPearOff    = false;      // Pear-Off 1v1 duel mode — locks lobby to exactly 2 players; mutually exclusive with Sylly
let frtSyllyMode  = false;      // Fruity Personalities — last setting; forced OFF with Pear-Off

// ── Roster (from lobby; persist across play-agains) ────────────────────────
let frtPlayerCount = 0;
let frtPlayerNames = [];

// ── Match / session state (reset each play-again) ──────────────────────────
let frtScores     = [];   // Fruit Tokens — session total per player
let frtBluffWins  = [];   // correct True/False resolutions per player (Silver Lining)
let frtRoundNum   = 0;    // 1..frtRounds
let frtRoundLog   = [];   // pass-off log this Fruit-Off: { from, to, fruit, outcome }

// ── Round (Fruit-Off) state (reset each round) ─────────────────────────────
let frtStashes        = [];  // frtStashes[p] = [fruitId, ...]  (hidden hand)
let frtBowls          = [];  // frtBowls[p]   = [fruitId, ...]  (face-up penalty pile)
let frtActivePlayer   = 0;   // whose serve
let frtAppleLockTarget = -1; // Sylly: Angry Apple forced next-serve target (-1 = none)

// ── Serve-in-flight state (reset each serve) ───────────────────────────────
let frtPassFruit       = -1; // TRUE fruit id in flight (couch security — masked client-side)
let frtPassDeclaration = -1; // claimed fruit id
let frtPassFromIdx     = -1;
let frtPassToIdx       = -1;
let frtPassHandledBy   = []; // player indices who handled THIS card this serve (Peek legality)

// ── UI / phase state ───────────────────────────────────────────────────────
let frtTablePhase       = 'serving'; // 'serving' | 'await' | 'reveal'
let frtSelectedStashIdx = -1;
let frtServeTarget      = -1;        // serve compose: chosen target player
let frtServeDeclaration = -1;        // serve compose: chosen declared fruit
let frtPeeked           = false;     // receiver peeked the in-flight card (local only)
let frtPeekComposing    = false;     // receiver is choosing a new target/declaration to pass on
let frtPeekSwapIdx      = -1;        // Sus Pear (Sylly): stash card chosen to send instead of the Pear
let frtRevealData       = null;      // { fruit, loserIdx, callerIdx, callerCorrect, declared, ... }
let frtRevealTimer          = null;  // host-only setTimeout handle (reveal → frtAfterRevealHost)
let frtTurnTimerHandle      = null;  // setInterval handle — Timer Lifecycle (clear in 3 places)
let frtTurnEndTs            = null;  // wall-clock expiry for the turn timer (GTH pattern)
let frtPendingRoundGameOver = false; // host-only: stored during round-end; drives Continue button
let frtPendingRoundOpener   = 0;     // host-only: next Fruit-Off opener index

// ── Derived helpers (never stored) ──────────────────────────────────────────
function frtIsDuel()        { return frtPlayerCount === 2; }
function frtElimThreshold() { return frtIsDuel() ? 5 : 4; }
function frtFruitById(id)   { return FRT_FRUITS[id]; }
function frtShort(id)       { const n = FRT_FRUITS[id].name.split(' ').pop(); return n === 'Watermelon' ? 'Melon' : n === 'Strawberry' ? 'Straw' : n; }

// ═══════════════════════════════════════════════════════════════════════════
// Render seam — ALL fruit-card DOM goes through here (asset-pack ready, spec §10).
// Game logic + packets deal only in fruitId; a future pack swaps this body only.
// ═══════════════════════════════════════════════════════════════════════════
function frtRenderCard(fruitId, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  if (opts.faceDown) {
    // Asset-pack back (device-local skin) if one is active; else the default CSS back.
    const back = (typeof assetBack === 'function') && assetBack('frt');
    el.className = back ? 'frt-card frt-card-asset' : 'frt-card frt-card-back';
    if (back) el.style.backgroundImage = 'url("' + back + '")';
    return el;
  }
  // Asset-pack face (device-local skin) if one covers this fruit; else the default emoji card.
  const url = (typeof assetFace === 'function') && assetFace('frt', fruitId);
  if (url) {
    el.className = 'frt-card frt-card-asset';
    el.dataset.fruit = fruitId;
    el.style.backgroundImage = 'url("' + url + '")';
    return el;
  }
  const f = FRT_FRUITS[fruitId];
  el.className = 'frt-card';
  el.dataset.fruit = fruitId;
  el.innerHTML =
    '<span class="frt-card-emoji">' + f.emoji + '</span>' +
    '<span class="frt-card-name">' + f.name + '</span>';
  return el;
}

// ═══════════════════════════════════════════════════════════════════════════
// Screen transitions  (Step 2 scaffold — bodies filled in Step 3/5)
// ═══════════════════════════════════════════════════════════════════════════
function frtShowMenu() { showScreen('screen-frt-menu'); }

// My player index (frt is MDLM-only; guard for safety)
function frtMyIdx() { return (window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0); }

// Firebase drops empty arrays/holes — rebuild a length-n 2D array with [] for missing entries.
function frtNorm2D(raw, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((raw && raw[i]) ? raw[i].slice() : []);
  return out;
}

// Deck: all 8 fruit types always present; copies by stock (spec §10)
function frtBuildDeck() {
  const copies = frtFruitStock === 'mega' ? 10 : frtFruitStock === 'swift' ? 6 : 8;
  const deck = [];
  for (let f = 0; f < 8; f++) for (let c = 0; c < copies; c++) deck.push(f);
  return shuffle(deck);
}

function frtResetServeState() {
  frtPassFruit = -1; frtPassDeclaration = -1; frtPassFromIdx = -1; frtPassToIdx = -1;
  frtPassHandledBy = []; frtSelectedStashIdx = -1; frtServeTarget = -1;
  frtServeDeclaration = -1; frtPeeked = false; frtPeekComposing = false; frtPeekSwapIdx = -1;
}

// Host: build deck, burn duel pile, deal evenly, burn remainder so stashes are equal
function frtDealRound() {
  let deck = frtBuildDeck();
  if (frtIsDuel()) deck = deck.slice(10);          // 64 → 54
  const n = frtPlayerCount, per = Math.floor(deck.length / n);
  frtStashes = []; frtBowls = [];
  for (let p = 0; p < n; p++) {
    frtStashes.push(deck.slice(p * per, p * per + per));
    frtBowls.push([]);                              // remainder (deck.length − per·n) burned
  }
  frtResetServeState();
  frtAppleLockTarget = -1;
  frtTablePhase = 'serving';
  frtRoundLog = [];
}

// Host entry from the menu Play CTA (post-lobby). Clients wait for FRT_DEAL.
function frtStartSession() {
  if (window.syllyMultiplayerMode === 'client') return;
  frtScores    = Array(frtPlayerCount).fill(0);
  frtBluffWins = Array(frtPlayerCount).fill(0);
  frtRoundNum  = 0;
  frtStartRoundHost(Math.floor(Math.random() * frtPlayerCount)); // round-1 random opener
}

function frtStartRoundHost(openerIdx) {
  frtRoundNum++;
  frtDealRound();
  frtActivePlayer = openerIdx;
  frtHostArmTimer();
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FRT_DEAL',
      stashes: frtStashes, activePlayer: frtActivePlayer, roundNum: frtRoundNum,
      playerCount: frtPlayerCount, playerNames: frtPlayerNames,
      syllyMode: frtSyllyMode, fruitStock: frtFruitStock,
      scores: frtScores, bluffWins: frtBluffWins, turnEndTs: frtTurnEndTs,
    }});
  }
  frtShowTable();
  frtStartTurnTimer(frtTurnEndTs);
}

function frtShowDeal()     { showScreen('screen-frt-deal'); } // transient interstitial (polish)
function frtShowGameover() { showScreen('screen-frt-gameover'); /* chunk 3: tokens + Silver Lining */ }

// ── Think Before You Fruit — turn timer (host owns expiry; all devices display) ──
function frtHostArmTimer() { frtTurnEndTs = (frtTurnTimer > 0) ? Date.now() + frtTurnTimer * 1000 : null; return frtTurnEndTs; }
function frtStopTurnTimer() {
  if (frtTurnTimerHandle) { clearInterval(frtTurnTimerHandle); frtTurnTimerHandle = null; }
  frtUpdateTimerDisplay(null);
}
function frtStartTurnTimer(endTs) {
  if (frtTurnTimerHandle) { clearInterval(frtTurnTimerHandle); frtTurnTimerHandle = null; }
  if (!endTs) { frtUpdateTimerDisplay(null); return; }
  frtTurnEndTs = endTs;
  const tick = () => {
    const left = Math.max(0, Math.ceil((frtTurnEndTs - Date.now()) / 1000));
    frtUpdateTimerDisplay(left);
    if (left > 0 && left <= 3) playTick();
    if (left <= 0) {
      clearInterval(frtTurnTimerHandle); frtTurnTimerHandle = null;
      if (window.syllyMultiplayerMode === 'host') { playAlarm(); frtTimerExpire(); }
    }
  };
  tick();
  frtTurnTimerHandle = setInterval(tick, 1000);
}
function frtUpdateTimerDisplay(left) {
  const r = document.getElementById('frt-table-round');
  if (!r) return;
  const base = 'Fruit-Off ' + frtRoundNum + (frtRounds > 1 ? ' / ' + frtRounds : '');
  if (left == null) { r.textContent = base; return; }
  const m = Math.floor(left / 60), sec = left % 60;
  r.textContent = base + ' · ⏱ ' + m + ':' + (sec < 10 ? '0' : '') + sec;
}
function frtTimerExpire() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (frtTablePhase === 'serving') {
    const me = frtActivePlayer;
    if (!frtStashes[me] || !frtStashes[me].length) return;
    const stashIdx = Math.floor(Math.random() * frtStashes[me].length);
    const fid = frtStashes[me][stashIdx];
    const targets = [];
    for (let p = 0; p < frtPlayerCount; p++) {
      if (p === me) continue;
      if (frtAppleLockTarget >= 0 && p !== frtAppleLockTarget) continue;
      targets.push(p);
    }
    if (!targets.length) return;
    frtHostProcessServe(me, targets[Math.floor(Math.random() * targets.length)], fid, stashIdx); // truthful
  } else if (frtTablePhase === 'await') {
    frtHostResolveChallenge(frtPassToIdx, 'true'); // auto-call TRUE
  }
}

function frtShowTable() {
  showScreen('screen-frt-table');
  const r = document.getElementById('frt-table-round');
  if (r) r.textContent = 'Fruit-Off ' + frtRoundNum + (frtRounds > 1 ? ' / ' + frtRounds : '');
  frtRenderOpponents();
  frtRenderTableBody();
}

function frtRenderTableBody() {
  const me = frtMyIdx();
  if (frtTablePhase === 'reveal') frtRenderReveal();
  else if (frtTablePhase === 'await' && me === frtPassToIdx) frtRenderAwait();
  else if (frtTablePhase === 'serving' && me === frtActivePlayer) frtRenderServing();
  else frtRenderSpectator();
}

// Top grid — all players' face-up Fruit Bowls (self included, clearly marked)
function frtRenderOpponents() {
  const me = frtMyIdx();
  const wrap = document.getElementById('frt-table-opponents');
  if (!wrap) return;
  wrap.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'flex gap-2 overflow-x-auto pb-1';
  for (let p = 0; p < frtPlayerCount; p++) {
    const isSelf = p === me;
    const cell = document.createElement('div');
    // Self gets a ring; active non-self gets a pale lemon tint; others neutral
    let cellBg = isSelf ? 'bg-stone-100 ring-1 ring-stone-300' :
                 (p === frtActivePlayer ? 'bg-[#FFF4CC]' : 'bg-stone-50');
    cell.className = 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl flex-shrink-0 ' + cellBg;
    const name = document.createElement('p');
    name.className = 'text-xs font-semibold text-stone-700 truncate max-w-20';
    name.textContent = (frtPlayerNames[p] || ('P' + (p + 1))) + (isSelf ? ' 👤' : '');
    const bowl = document.createElement('p');
    bowl.className = 'text-base leading-none';
    bowl.textContent = (frtBowls[p] && frtBowls[p].length)
      ? [...frtBowls[p]].sort((a, b) => a - b).map(id => FRT_FRUITS[id].emoji).join('') : '—';
    cell.appendChild(name); cell.appendChild(bowl);
    if (frtSyllyMode) {
      const wm = (frtStashes[p] || []).filter(id => id === 4).length;
      const wmEl = document.createElement('p');
      wmEl.className = 'text-[10px] text-stone-400';
      wmEl.textContent = '🍉 ' + wm;
      cell.appendChild(wmEl);
    }
    row.appendChild(cell);
  }
  wrap.appendChild(row);
}

function frtMiniLabel(t) {
  const p = document.createElement('p');
  p.className = 'text-center text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5 mt-2';
  p.textContent = t;
  return p;
}

// Stash rendering — grouped by fruit (sorted by id), one card per fruit with a ×count badge.
function frtGroupStash(stash) {
  const map = {};
  (stash || []).forEach((fid, i) => {
    if (!(fid in map)) map[fid] = { fruit: fid, count: 0, firstIdx: i };
    map[fid].count++;
  });
  return Object.values(map).sort((a, b) => a.fruit - b.fruit);
}
function frtRenderStashGrouped(container, stash, opts) {
  opts = opts || {};
  const selFruit = (opts.selectedIdx != null && opts.selectedIdx >= 0 && stash && stash[opts.selectedIdx] != null)
    ? stash[opts.selectedIdx] : -1;
  frtGroupStash(stash).forEach(g => {
    const c = frtRenderCard(g.fruit);
    c.style.position = 'relative';
    if (g.fruit === selFruit) c.style.outline = '3px solid ' + FRT_LEAF;
    if (g.count > 1) {
      const badge = document.createElement('span');
      badge.textContent = '×' + g.count;
      badge.className = 'absolute -top-1.5 -right-1.5 text-[11px] font-bold text-white rounded-full px-1.5 leading-tight';
      badge.style.background = FRT_DARK;
      c.appendChild(badge);
    }
    if (opts.onPick) { c.classList.add('cursor-pointer'); c.addEventListener('click', () => opts.onPick(g.firstIdx)); }
    container.appendChild(c);
  });
}

// ── SERVING — active player composes a serve (card → target → declaration) ──
function frtRenderServing() {
  const me = frtMyIdx();
  const body = document.getElementById('frt-table-body');
  const footer = document.getElementById('frt-table-footer');
  body.innerHTML = ''; footer.innerHTML = '';

  const h = document.createElement('p');
  h.className = 'text-center text-sm font-semibold text-stone-700 my-2';
  h.textContent = frtAppleLockTarget >= 0
    ? 'Vendetta! You must serve ' + (frtPlayerNames[frtAppleLockTarget] || ('P'+(frtAppleLockTarget+1))) + '.'
    : 'Your serve — pick a card, a target, and what you\'ll call it.';
  body.appendChild(h);

  // Stash label: add [?] next to label when Sylly Mode is ON so players can check personalities
  if (frtSyllyMode) {
    const stashLabelRow = document.createElement('div');
    stashLabelRow.className = 'flex items-center justify-center gap-1.5';
    stashLabelRow.appendChild(frtMiniLabel('Your stash'));
    const stashQ = document.createElement('button');
    stashQ.id = 'btn-frt-personalities-stash';
    stashQ.className = 'text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100 mb-1.5 mt-2';
    stashQ.textContent = '[?]';
    stashQ.addEventListener('click', frtOpenPersonalities);
    stashLabelRow.appendChild(stashQ);
    body.appendChild(stashLabelRow);
  } else {
    body.appendChild(frtMiniLabel('Your stash'));
  }
  const stashRow = document.createElement('div');
  stashRow.className = 'grid grid-cols-4 gap-1.5';
  frtRenderStashGrouped(stashRow, frtStashes[me], {
    selectedIdx: frtSelectedStashIdx,
    onPick: idx => { playPillClick(); frtSelectedStashIdx = idx; frtRenderServing(); },
  });
  body.appendChild(stashRow);

  // Build valid target list; auto-select when only one option
  const validTargets = [];
  for (let p = 0; p < frtPlayerCount; p++) {
    if (p === me) continue;
    if (frtAppleLockTarget >= 0 && p !== frtAppleLockTarget) continue;
    validTargets.push(p);
  }
  if (validTargets.length === 1 && frtServeTarget !== validTargets[0]) {
    frtServeTarget = validTargets[0];
  }

  body.appendChild(frtMiniLabel('Serve to'));
  const tRow = document.createElement('div');
  tRow.className = 'flex flex-wrap gap-2 justify-center';
  validTargets.forEach(p => {
    const b = document.createElement('button');
    b.className = 'pill' + (p === frtServeTarget ? ' pill-active-frt' : '');
    b.textContent = frtPlayerNames[p] || ('P' + (p + 1));
    b.addEventListener('click', () => { playPillClick(); frtServeTarget = p; frtRenderServing(); });
    tRow.appendChild(b);
  });
  body.appendChild(tRow);

  body.appendChild(frtMiniLabel('Call it a…'));
  const dRow = document.createElement('div');
  dRow.className = 'grid grid-cols-4 gap-2';
  FRT_FRUITS.forEach(f => {
    const b = document.createElement('button');
    b.className = 'pill w-full text-center' + (f.id === frtServeDeclaration ? ' pill-active-frt' : '');
    b.innerHTML = f.emoji + ' ' + frtShort(f.id);
    b.addEventListener('click', () => { playPillClick(); frtServeDeclaration = f.id; frtRenderServing(); });
    dRow.appendChild(b);
  });
  body.appendChild(dRow);

  const ready = frtSelectedStashIdx >= 0 && frtServeTarget >= 0 && frtServeDeclaration >= 0;
  const serve = document.createElement('button');
  serve.className = 'btn-mp-action min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150' + (ready ? '' : ' opacity-50');
  serve.style.background = FRT_FILL; serve.style.color = FRT_INK;
  serve.disabled = !ready;
  serve.textContent = 'Serve →';
  serve.addEventListener('click', () => { if (ready) { playLaunch(); frtSubmitServe(); } });
  footer.appendChild(serve);
}

function frtSubmitServe() {
  const me = frtMyIdx();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action: 'FRT_SERVE', fromIdx: me, toIdx: frtServeTarget,
      declaration: frtServeDeclaration, stashIdx: frtSelectedStashIdx,
    }});
    return; // wait for FRT_SERVED
  }
  frtHostProcessServe(me, frtServeTarget, frtServeDeclaration, frtSelectedStashIdx);
}

// Host-authoritative: remove the card, set it in-flight face-down, broadcast.
function frtHostProcessServe(fromIdx, toIdx, declaration, stashIdx) {
  frtStopTurnTimer();             // serving-phase timer done
  const fid = frtStashes[fromIdx].splice(stashIdx, 1)[0];
  frtAppleLockTarget = -1;        // a fresh serve consumes any vendetta lock

  // Panicked Strawberry (Sylly, Category C) — 25% host roll → auto-reveals into the sender's bowl
  if (frtSyllyMode && fid === 6 && Math.random() < 0.25) {
    frtBowls[fromIdx].push(fid);  // primary flip; Strawberry is Cat C → fires no Cat-A trigger
    frtPassFruit = fid; frtPassDeclaration = declaration;
    frtPassFromIdx = fromIdx; frtPassToIdx = fromIdx;
    const eliminatedSet = frtComputeEliminated();
    const outcome = eliminatedSet.length ? 'round-end' : 'continue';
    let nextServer = fromIdx;
    if (eliminatedSet.includes(nextServer)) nextServer = frtNextActiveAfter(nextServer, eliminatedSet);
    frtRevealData = { fruit: fid, loserIdx: fromIdx, callerIdx: fromIdx, callerCorrect: false, declared: declaration, outcome, eliminatedSet, nextServer, panic: true };
    frtLogReveal(frtRevealData);
    frtTablePhase = 'reveal';
    frtBroadcastReveal(); frtShowTable(); frtScheduleAfterReveal();
    return;
  }

  frtPassFruit = fid; frtPassDeclaration = declaration;
  frtPassFromIdx = fromIdx; frtPassToIdx = toIdx;
  frtPassHandledBy = [fromIdx];   // the server has handled it — not a legal Peek target
  frtPeeked = false;
  frtTablePhase = 'await';
  frtHostArmTimer();
  frtBroadcastServed();
  frtShowTable();
  frtStartTurnTimer(frtTurnEndTs);
}

function frtBroadcastServed() {
  if (window.syllyMultiplayerMode === 'single') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'FRT_SERVED',
    fruit: frtPassFruit, declaration: frtPassDeclaration,
    fromIdx: frtPassFromIdx, toIdx: frtPassToIdx, handledBy: frtPassHandledBy,
    stashes: frtStashes, turnEndTs: frtTurnEndTs,
  }});
}

// ── AWAIT — receiver decides: True / False / Peek & Pass ────────────────────
function frtRenderAwait() {
  const body = document.getElementById('frt-table-body');
  const footer = document.getElementById('frt-table-footer');
  body.innerHTML = ''; footer.innerHTML = '';
  const decl = FRT_FRUITS[frtPassDeclaration];
  const mk = (label, bg, fn) => {
    const b = document.createElement('button');
    const ink = bg === FRT_FILL ? FRT_INK : '#ffffff';
    b.className = 'btn-mp-action min-h-12 w-full rounded-2xl active:scale-95 text-base font-semibold transition-all duration-150';
    b.style.background = bg; b.style.color = ink; b.textContent = label; b.addEventListener('click', fn);
    return b;
  };

  // Peek & Pass compose — choose a new target + declaration
  if (frtPeekComposing) {
    const f = FRT_FRUITS[frtPassFruit];
    const pm = document.createElement('p');
    pm.className = 'text-center text-sm text-stone-700 my-2';
    pm.innerHTML = 'It\'s really a <span class="font-bold">' + f.emoji + ' ' + f.name + '</span>. Pass it on…';
    body.appendChild(pm);

    // Sus Pear (Sylly, Category C) — pocket the Pear, send a swapped card instead
    if (frtSyllyMode && frtPassFruit === 5) {
      const me = frtMyIdx();
      body.appendChild(frtMiniLabel('Sus Pear — pocket it & send instead?'));
      const keepRow = document.createElement('div');
      keepRow.className = 'flex justify-center mb-1.5';
      const keep = document.createElement('button');
      keep.className = 'pill' + (frtPeekSwapIdx < 0 ? ' pill-active-frt' : '');
      keep.innerHTML = '🍐 Send the Pear';
      keep.addEventListener('click', () => { playPillClick(); frtPeekSwapIdx = -1; frtRenderAwait(); });
      keepRow.appendChild(keep);
      body.appendChild(keepRow);
      const swapRow = document.createElement('div');
      swapRow.className = 'flex flex-wrap gap-1.5 justify-center items-center';
      frtRenderStashGrouped(swapRow, frtStashes[me], {
        selectedIdx: frtPeekSwapIdx,
        onPick: idx => { playPillClick(); frtPeekSwapIdx = idx; frtRenderAwait(); },
      });
      body.appendChild(swapRow);
    }

    // Auto-select when only one legal peek target
    const peekTargets = frtLegalPeekTargets();
    if (peekTargets.length === 1 && frtServeTarget !== peekTargets[0]) {
      frtServeTarget = peekTargets[0];
    }

    body.appendChild(frtMiniLabel('Pass to'));
    const tRow = document.createElement('div');
    tRow.className = 'flex flex-wrap gap-2 justify-center';
    peekTargets.forEach(p => {
      const b = document.createElement('button');
      b.className = 'pill' + (p === frtServeTarget ? ' pill-active-frt' : '');
      b.textContent = frtPlayerNames[p] || ('P' + (p + 1));
      b.addEventListener('click', () => { playPillClick(); frtServeTarget = p; frtRenderAwait(); });
      tRow.appendChild(b);
    });
    body.appendChild(tRow);
    body.appendChild(frtMiniLabel('Call it a…'));
    const dRow = document.createElement('div');
    dRow.className = 'grid grid-cols-4 gap-2';
    FRT_FRUITS.forEach(fr => {
      const b = document.createElement('button');
      b.className = 'pill w-full text-center' + (fr.id === frtServeDeclaration ? ' pill-active-frt' : '');
      b.innerHTML = fr.emoji + ' ' + frtShort(fr.id);
      b.addEventListener('click', () => { playPillClick(); frtServeDeclaration = fr.id; frtRenderAwait(); });
      dRow.appendChild(b);
    });
    body.appendChild(dRow);
    const ready = frtServeTarget >= 0 && frtServeDeclaration >= 0;
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-2';
    const slide = mk('Slide it →', FRT_FILL, () => { if (ready) { playLaunch(); frtSubmitPeekPass(); } });
    if (!ready) { slide.classList.add('opacity-50'); slide.disabled = true; }
    wrap.appendChild(slide);
    wrap.appendChild(mk('Back', '#78716c', () => { playDone(); frtPeekComposing = false; frtRenderAwait(); }));
    footer.appendChild(wrap);
    return;
  }

  // Standard await
  const fromName = frtPlayerNames[frtPassFromIdx] || ('P' + (frtPassFromIdx + 1));
  const awaitCenter = document.createElement('div');
  awaitCenter.className = 'flex flex-col items-center gap-6 w-full py-2';
  const msg = document.createElement('p');
  msg.className = 'text-center text-sm text-stone-700';
  msg.innerHTML = '<span class="font-bold">' + fromName + '</span> served you a card and swears it\'s a <span class="font-bold">' + decl.emoji + ' ' + decl.name + '</span>.';
  awaitCenter.appendChild(msg);
  const cw = document.createElement('div');
  cw.className = 'flex justify-center';
  cw.appendChild(frtPeeked ? frtRenderCard(frtPassFruit) : frtRenderCard(0, { faceDown: true }));
  awaitCenter.appendChild(cw);
  body.appendChild(awaitCenter);
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-2';
  const appleLocked = frtAppleLockTarget >= 0 && frtPassToIdx === frtAppleLockTarget;
  const canPeek = frtLegalPeekTargets().length > 0 && !appleLocked;
  if (frtPeeked && canPeek) {
    // Peeked — True/False locked out; must pass the card on
    wrap.appendChild(mk('Pass it on →', FRT_FILL, () => { playLaunch(); frtPeekComposing = true; frtServeTarget = -1; frtServeDeclaration = -1; frtRenderAwait(); }));
  } else {
    // Standard challenge (or peeked but no valid pass targets — fallback to call)
    wrap.appendChild(mk('Call TRUE — it\'s a ' + decl.name, FRT_LEAF, () => { playDone(); frtCall('true'); }));
    wrap.appendChild(mk('Call FALSE — they\'re bluffing', '#dc2626', () => { playBoing(); frtCall('false'); }));
    if (!frtPeeked && canPeek) {
      wrap.appendChild(mk('Peek & Pass', FRT_FILL, () => { playWhoosh(); frtPeeked = true; frtRenderAwait(); }));
    }
  }
  footer.appendChild(wrap);
}

function frtLegalPeekTargets() {
  const out = [];
  for (let p = 0; p < frtPlayerCount; p++) {
    if (p === frtPassToIdx) continue;            // can't pass to self
    if (frtPassHandledBy.includes(p)) continue;  // already handled this card
    out.push(p);
  }
  return out;
}

// ── Receiver actions ────────────────────────────────────────────────────────
function frtCall(verdict) {
  const me = frtMyIdx();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'FRT_CALL', callerIdx: me, verdict } });
    return;
  }
  frtHostResolveChallenge(me, verdict);
}

function frtSubmitPeekPass() {
  const me = frtMyIdx();
  const swapIdx = (frtSyllyMode && frtPassFruit === 5) ? frtPeekSwapIdx : -1;
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action: 'FRT_PEEK_PASS', fromIdx: me, toIdx: frtServeTarget, declaration: frtServeDeclaration, swapStashIdx: swapIdx,
    }});
    return;
  }
  frtHostProcessPeekPass(me, frtServeTarget, frtServeDeclaration, swapIdx);
}

// ── Host-authoritative resolution ───────────────────────────────────────────
function frtHostProcessPeekPass(fromIdx, toIdx, declaration, swapStashIdx) {
  // Sus Pear (Sylly, Category C) — pocket the Pear, swap in a different card to send
  if (frtSyllyMode && frtPassFruit === 5 && swapStashIdx != null && swapStashIdx >= 0 &&
      frtStashes[fromIdx] && frtStashes[fromIdx][swapStashIdx] != null) {
    const newCard = frtStashes[fromIdx].splice(swapStashIdx, 1)[0];
    frtStashes[fromIdx].push(5);   // pocket the Pear into the peeker's stash
    frtPassFruit = newCard;
  }
  if (!frtPassHandledBy.includes(fromIdx)) frtPassHandledBy.push(fromIdx);
  frtPassDeclaration = declaration;
  frtPassFromIdx = fromIdx;   // new sender of record (takes the penalty if caught)
  frtPassToIdx = toIdx;
  frtPeeked = false; frtPeekComposing = false;
  frtTablePhase = 'await';
  frtStopTurnTimer(); frtHostArmTimer();
  frtBroadcastServed();
  frtShowTable();
  frtStartTurnTimer(frtTurnEndTs);
}

function frtHostResolveChallenge(callerIdx, verdict) {
  frtStopTurnTimer();             // await-phase timer done
  const trueFruit = frtPassFruit, declared = frtPassDeclaration;
  const isTrue = (trueFruit === declared);
  const callerCorrect = (verdict === 'true') ? isTrue : !isTrue;
  const loser = callerCorrect ? frtPassFromIdx : callerIdx;

  frtBowls[loser].push(trueFruit);                 // §16B step 1: primary flip
  if (callerCorrect) frtBluffWins[callerIdx] = (frtBluffWins[callerIdx] || 0) + 1;

  let nextServer = loser, appleLock = -1;
  if (frtSyllyMode) {                              // step 1 trigger + step 2 inert secondaries
    const s = frtSyllyResolve(trueFruit, loser, callerIdx, callerCorrect);
    if (s.nextServerOverride >= 0) nextServer = s.nextServerOverride;
    appleLock = s.appleLock;
  }

  const eliminatedSet = frtComputeEliminated();    // §16B step 3: ONE check, after all flips
  const outcome = eliminatedSet.length ? 'round-end' : 'continue';
  if (eliminatedSet.includes(nextServer)) nextServer = frtNextActiveAfter(nextServer, eliminatedSet);
  if (appleLock >= 0 && eliminatedSet.includes(appleLock)) appleLock = -1; // locked target gone
  frtAppleLockTarget = appleLock;

  frtRevealData = { fruit: trueFruit, loserIdx: loser, callerIdx, callerCorrect, declared, outcome, eliminatedSet, nextServer, fromIdx: frtPassFromIdx };
  frtLogReveal(frtRevealData);
  frtTablePhase = 'reveal';
  frtBroadcastReveal();
  frtShowTable();
  frtScheduleAfterReveal();
}

function frtComputeEliminated() {
  const out = [], th = frtElimThreshold();
  for (let p = 0; p < frtPlayerCount; p++) {
    const counts = {};
    (frtBowls[p] || []).forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    if (Object.values(counts).some(c => c >= th)) out.push(p);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sylly Mode — Fruity Personalities (§16B single-pass; each ability isolated)
// Category A fires at the primary flip; its forced flips are INERT (no re-trigger).
// Dispatcher returns flow effects only ({nextServerOverride, appleLock}); the
// forced-flip abilities mutate bowls directly. Tweak/replace any one in isolation.
// ═══════════════════════════════════════════════════════════════════════════
function frtSyllyResolve(fruit, loserIdx, callerIdx, callerCorrect) {
  const res = { nextServerOverride: -1, appleLock: -1 };
  const other = (loserIdx === callerIdx) ? frtPassFromIdx : callerIdx; // the non-loser party
  switch (fruit) {
    case 0: if (!callerCorrect) res.nextServerOverride = frtPassFromIdx; break; // Banana — keep initiative
    case 1: frtSyllyLemon(other);   break;  // Lemon — challenger flips a random own card
    case 2: frtSyllyPeach(callerIdx); break; // Peach — resolver flips an own Peach
    case 3: frtSyllyGrape();          break; // Grape — top Grape-holder(s) flip one
    case 7: res.appleLock = callerCorrect ? callerIdx : frtPassFromIdx; break; // Apple — lock the winner
    // 4 Watermelon = passive display; 5 Pear / 6 Strawberry = interaction-phase hooks
  }
  return res;
}
function frtSyllyLemon(victimIdx) { // secondary flip — inert
  const s = frtStashes[victimIdx];
  if (!s || !s.length) return;
  const card = s.splice(Math.floor(Math.random() * s.length), 1)[0];
  frtBowls[victimIdx].push(card);
}
function frtSyllyPeach(playerIdx) { // secondary flip — inert
  const s = frtStashes[playerIdx]; if (!s) return;
  const i = s.indexOf(2);
  if (i >= 0) { s.splice(i, 1); frtBowls[playerIdx].push(2); }
}
function frtSyllyGrape() { // secondary flip — inert; all tied top-holders flip one
  const counts = frtStashes.map(s => (s || []).filter(id => id === 3).length);
  const max = counts.length ? Math.max(0, ...counts) : 0;
  if (max === 0) return;
  counts.forEach((c, p) => {
    if (c === max) { const i = frtStashes[p].indexOf(3); if (i >= 0) { frtStashes[p].splice(i, 1); frtBowls[p].push(3); } }
  });
}

function frtNextActiveAfter(idx, elim) {
  for (let k = 1; k <= frtPlayerCount; k++) {
    const p = (idx + k) % frtPlayerCount;
    if (!elim.includes(p)) return p;
  }
  return idx;
}

function frtBroadcastReveal() {
  if (window.syllyMultiplayerMode === 'single') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'FRT_REVEAL', reveal: frtRevealData, bowls: frtBowls, stashes: frtStashes, bluffWins: frtBluffWins,
  }});
}

function frtScheduleAfterReveal() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (frtRevealTimer) clearTimeout(frtRevealTimer);
  frtRevealTimer = setTimeout(() => { frtRevealTimer = null; frtAfterRevealHost(); }, 5000);
}

function frtAfterRevealHost() {
  const rd = frtRevealData;
  if (!rd) return;
  if (rd.outcome === 'round-end') { frtHostRoundEnd(rd.eliminatedSet); return; }
  // continue — 0-stash loss check on the next server
  const nextServer = rd.nextServer;
  if (!frtStashes[nextServer] || frtStashes[nextServer].length === 0) { frtHostRoundEnd([nextServer]); return; }
  frtActivePlayer = nextServer;
  frtResetServeState();
  frtTablePhase = 'serving';
  frtHostArmTimer();
  frtBroadcastContinue();
  frtShowTable();
  frtStartTurnTimer(frtTurnEndTs);
}

function frtBroadcastContinue() {
  if (window.syllyMultiplayerMode === 'single') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'FRT_CONTINUE', activePlayer: frtActivePlayer, stashes: frtStashes, bowls: frtBowls,
    appleLock: frtAppleLockTarget, turnEndTs: frtTurnEndTs,
  }});
}

// Pass-off log — one entry per resolved serving (final sender ➔ challenger : fruit, outcome)
function frtLogReveal(rd) {
  if (!rd) return;
  const outcome = rd.panic ? 'Panicked' : (rd.callerCorrect ? 'Sender Caught' : 'Challenger Lost');
  const from = rd.panic ? rd.loserIdx : (rd.fromIdx != null ? rd.fromIdx : rd.loserIdx);
  const to   = rd.panic ? rd.loserIdx : rd.callerIdx;
  frtRoundLog.push({ from, to, fruit: rd.fruit, outcome });
}
function frtOpenLog() {
  const body = document.getElementById('frt-log-body');
  if (!body) return;
  body.innerHTML = '';
  if (!frtRoundLog.length) {
    const e = document.createElement('p');
    e.className = 'text-center text-stone-400 text-sm py-4';
    e.textContent = 'No pass-offs yet this Fruit-Off.';
    body.appendChild(e);
  } else {
    frtRoundLog.forEach(en => {
      const row = document.createElement('div');
      row.className = 'bg-white rounded-xl px-3 py-2 shadow-sm text-sm text-stone-700 flex items-center justify-between gap-2';
      const fromN = frtPlayerNames[en.from] || ('P' + (en.from + 1));
      const toN   = frtPlayerNames[en.to]   || ('P' + (en.to + 1));
      const f = FRT_FRUITS[en.fruit];
      const left = document.createElement('span');
      left.innerHTML = '<span class="font-semibold">' + fromN + '</span> ➔ <span class="font-semibold">' + toN + '</span> : ' + f.emoji + ' ' + f.name;
      const right = document.createElement('span');
      right.className = 'text-xs text-stone-400 flex-shrink-0';
      right.textContent = en.outcome;
      row.appendChild(left); row.appendChild(right);
      body.appendChild(row);
    });
  }
  document.getElementById('frt-log-overlay').style.display = 'flex';
}

function frtRenderReveal() {
  const rd = frtRevealData; if (!rd) return;
  frtStopTurnTimer();
  const body = document.getElementById('frt-table-body');
  const footer = document.getElementById('frt-table-footer');
  if (footer) footer.innerHTML = '';
  body.innerHTML = '';
  const f = FRT_FRUITS[rd.fruit], decl = FRT_FRUITS[rd.declared];
  const revealCenter = document.createElement('div');
  revealCenter.className = 'flex flex-col items-center gap-6 w-full py-2';
  const cw = document.createElement('div');
  cw.className = 'flex justify-center';
  const card = frtRenderCard(rd.fruit);
  card.style.transform = 'scale(1.15)';
  cw.appendChild(card);
  revealCenter.appendChild(cw);
  const callerName = frtPlayerNames[rd.callerIdx] || ('P' + (rd.callerIdx + 1));
  const loserName  = frtPlayerNames[rd.loserIdx]  || ('P' + (rd.loserIdx + 1));
  const t = document.createElement('div');
  t.className = 'text-center text-sm text-stone-700';
  if (rd.panic) {
    t.innerHTML = '<span class="font-bold">' + loserName + '</span>\'s Strawberry 🍓 panicked — it bolted face-up straight into their own bowl!';
  } else {
    t.innerHTML = 'It was a <span class="font-bold">' + f.emoji + ' ' + f.name + '</span> — claimed ' + decl.emoji + ' ' + decl.name + '.<br>' +
      '<span class="font-bold">' + callerName + '</span> ' + (rd.callerCorrect ? 'was right!' : 'was wrong!') +
      ' <span class="font-bold">' + loserName + '</span> takes it.';
  }
  revealCenter.appendChild(t);
  body.appendChild(revealCenter);
}

// ── Round end + gameover ─────────────────────────────────────────────────────
function frtHostRoundEnd(eliminatedSet) {
  for (let p = 0; p < frtPlayerCount; p++) {
    if (eliminatedSet.includes(p)) continue;            // Fruit Looped — 0 tokens
    else if (frtBowls[p].length === 0) frtScores[p] += 10; // Pristine Clean Escape
    else frtScores[p] += 5;                              // Survived the Salad
  }
  const gameOver = frtRoundNum >= frtRounds;
  const opener = eliminatedSet.length ? eliminatedSet[0] : 0; // Looped player serves first next round
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FRT_ROUND_END', eliminatedSet, scores: frtScores, bowls: frtBowls, roundNum: frtRoundNum, gameOver, opener,
    }});
  }
  frtPendingRoundGameOver = gameOver;
  frtPendingRoundOpener   = opener;
  frtRenderRoundEnd(eliminatedSet);
}

function frtRenderRoundEnd(eliminatedSet) {
  showScreen('screen-frt-table');
  frtStopTurnTimer();
  frtRenderOpponents();
  const body = document.getElementById('frt-table-body');
  const footer = document.getElementById('frt-table-footer');
  if (footer) footer.innerHTML = '';
  body.innerHTML = '';
  const roundEndCenter = document.createElement('div');
  roundEndCenter.className = 'flex flex-col items-center gap-4 w-full py-2';
  const h = document.createElement('p');
  h.className = 'text-center text-lg font-bold text-stone-800';
  h.textContent = eliminatedSet.map(p => frtPlayerNames[p] || ('P' + (p + 1))).join(' & ') + ' got Fruit Looped! 🍌';
  roundEndCenter.appendChild(h);
  const list = document.createElement('div');
  list.className = 'flex flex-col gap-1 w-full';
  frtScores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).forEach(({ i, s }) => {
    const r = document.createElement('p');
    r.className = 'text-center text-sm text-stone-600';
    r.textContent = (frtPlayerNames[i] || ('P' + (i + 1))) + ': ' + s + ' 🍒';
    list.appendChild(r);
  });
  roundEndCenter.appendChild(list);
  body.appendChild(roundEndCenter);
  if (!footer) return;
  if (window.syllyMultiplayerMode === 'client') {
    const wait = document.createElement('p');
    wait.className = 'text-center text-stone-400 text-sm py-2';
    wait.textContent = 'Waiting for host…';
    footer.appendChild(wait);
  } else {
    const btn = document.createElement('button');
    btn.className = 'min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150';
    btn.style.background = FRT_FILL; btn.style.color = FRT_INK;
    btn.textContent = frtPendingRoundGameOver ? 'See Final Scores →' : 'Next Fruit-Off →';
    btn.addEventListener('click', () => {
      playLaunch();
      if (frtPendingRoundGameOver) frtHostGameover();
      else frtStartRoundHost(frtPendingRoundOpener);
    });
    footer.appendChild(btn);
  }
}

function frtHostGameover() {
  const maxBW = frtBluffWins.length ? Math.max(0, ...frtBluffWins) : 0;
  const silver = [];
  if (maxBW > 0) frtBluffWins.forEach((bw, i) => { if (bw === maxBW) { frtScores[i] += 2; silver.push(i); } });
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'FRT_GAMEOVER', scores: frtScores, silver } });
  }
  frtRenderGameover(silver);
}

function frtRenderGameover(silver) {
  showScreen('screen-frt-gameover');
  frtStopTurnTimer();
  const wrap = document.getElementById('frt-gameover-standings');
  if (!wrap) return;
  wrap.innerHTML = '';
  const ranked = frtScores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s);
  const top = ranked.length ? ranked[0].s : 0;
  ranked.forEach(({ i, s }, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-4 py-2 rounded-xl ' + (s === top && top > 0 ? 'bg-[#FFF4CC]' : 'bg-stone-50');
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
    const left = document.createElement('span');
    left.className = 'text-sm font-semibold text-stone-700';
    left.textContent = (medal ? medal + ' ' : '') + (frtPlayerNames[i] || ('P' + (i + 1))) + ((silver || []).includes(i) ? ' ✨' : '');
    const right = document.createElement('span');
    right.className = 'text-sm font-bold text-stone-800';
    right.textContent = s + ' 🍒';
    row.appendChild(left); row.appendChild(right);
    wrap.appendChild(row);
  });
}

// ── SPECTATOR — non-active device, read-only tracking ───────────────────────
function frtRenderSpectator() {
  const body = document.getElementById('frt-table-body');
  const footer = document.getElementById('frt-table-footer');
  if (footer) footer.innerHTML = '';
  body.innerHTML = '';
  const center = document.createElement('div');
  center.className = 'flex flex-col items-center gap-4 w-full py-2';
  const msg = document.createElement('p');
  msg.className = 'text-center text-sm text-stone-500';
  if (frtTablePhase === 'serving') msg.textContent = (frtPlayerNames[frtActivePlayer] || ('P'+(frtActivePlayer+1))) + ' is choosing a card to serve…';
  else if (frtTablePhase === 'await') msg.textContent = (frtPlayerNames[frtPassToIdx] || ('P'+(frtPassToIdx+1))) + ' is deciding…';
  else msg.textContent = 'Watching the table…';
  center.appendChild(msg);
  const me = frtMyIdx();
  if (frtStashes[me] && frtStashes[me].length) {
    center.appendChild(frtMiniLabel('Your stash'));
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-1.5';
    frtRenderStashGrouped(row, frtStashes[me], {});
    center.appendChild(row);
  }
  body.appendChild(center);
}

// Overlays
function frtSyncSyllyToggle() {
  const t = document.getElementById('btn-frt-sylly-toggle');
  if (!t) return;
  t.textContent = frtSyllyMode ? 'ON' : 'OFF';
  t.className = (frtSyllyMode ? 'game-toggle-on-frt' : 'game-toggle-off') + ' shrink-0';
}

function frtSyncPearOffToggle() {
  const t = document.getElementById('btn-frt-pearoff-toggle');
  if (!t) return;
  t.textContent = frtPearOff ? 'ON' : 'OFF';
  t.className = (frtPearOff ? 'game-toggle-on-frt' : 'game-toggle-off') + ' shrink-0';
}

function frtSyncSettingsUI() {
  const setGroup = (attr, val) => document.querySelectorAll('[' + attr + ']').forEach(b =>
    b.classList.toggle('pill-active-frt', b.getAttribute(attr) === String(val)));
  setGroup('data-frt-stock', frtFruitStock);
  setGroup('data-frt-rounds', frtRounds);
  setGroup('data-frt-timer', frtTurnTimer);
  frtSyncSyllyToggle();
  frtSyncPearOffToggle();
}

function frtBindPills(attr, apply) {
  document.querySelectorAll('[' + attr + ']').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    playPillClick();
    document.querySelectorAll('[' + attr + ']').forEach(x => x.classList.remove('pill-active-frt'));
    b.classList.add('pill-active-frt');
    apply(b.getAttribute(attr));
  }));
}

function frtOpenSettings() {
  playPillClick();
  const n = frtPlayerCount || 0;
  // Mega Salad needs 5+ players
  const mega = document.getElementById('frt-pill-mega');
  if (mega) {
    const ok = (n === 0 || n >= 5);
    mega.disabled = !ok; mega.style.opacity = ok ? '' : '0.4';
    if (!ok && frtFruitStock === 'mega') frtFruitStock = 'standard';
  }
  // Sylly Mode: locked when Pear-Off is on
  const syllyT = document.getElementById('btn-frt-sylly-toggle');
  const syllyNote = document.getElementById('frt-sylly-locked-note');
  if (syllyT) {
    const locked = frtPearOff;
    syllyT.disabled = locked; syllyT.style.opacity = locked ? '0.4' : '';
    if (locked) frtSyllyMode = false;
    if (syllyNote) syllyNote.style.display = locked ? '' : 'none';
  }
  // Pear-Off: locked when Sylly Mode is on
  const pearT = document.getElementById('btn-frt-pearoff-toggle');
  const pearNote = document.getElementById('frt-pearoff-locked-note');
  if (pearT) {
    const locked = frtSyllyMode;
    pearT.disabled = locked; pearT.style.opacity = locked ? '0.4' : '';
    if (locked) frtPearOff = false;
    if (pearNote) pearNote.style.display = locked ? '' : 'none';
  }
  frtSyncSettingsUI();
  const inner = document.querySelector('#frt-settings-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('frt-settings-overlay').style.display = 'flex';
}
function frtOpenHowTo(tab) {
  frtSetHowToTab(tab || 'rules');
  const inner = document.querySelector('#frt-how-to-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('frt-how-to-overlay').style.display = 'flex';
}

// The rules and the fruit gallery are two tabs of ONE overlay. Bodies are siblings
// toggled by display (never one body repainted) so flicking across and back keeps
// the other tab's scroll position.
function frtSetHowToTab(tab) {
  const rules = document.getElementById('frt-how-to-body');
  const cards = document.getElementById('frt-how-to-cards');
  if (rules) rules.style.display = tab === 'cards' ? 'none' : 'flex';
  if (cards) cards.style.display = tab === 'cards' ? 'flex' : 'none';
  document.querySelectorAll('[data-frt-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-frt');       // .pill is the base — never removed
    if (b.dataset.frtHowtoTab === tab) b.classList.add('pill-active-frt');
  });
  if (tab === 'cards') frtRenderGallery();
}

// Built from FRT_FRUITS on every switch INTO the tab, and every tile goes through
// frtRenderCard — a gallery that built its own markup would be unskinnable and would
// drift from the deck. Needs no match, no lobby and no network, which is what makes
// the offline install check a single-device job on an MDLM-only game.
function frtRenderGallery() {
  const box = document.getElementById('frt-cards-body');
  if (!box) return;
  box.innerHTML = '';

  const section = (label, blurb) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-2';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest';
    h.style.color = FRT_LEAF;
    h.textContent = label;
    const b = document.createElement('p');
    b.className = 'text-stone-500 text-sm';
    b.textContent = blurb;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-3 gap-3 justify-items-center pt-1';
    wrap.append(h, b, row);
    box.appendChild(wrap);
    return row;
  };
  // A tile is the card plus its name underneath: the face carries no label at this
  // size, and an unlabelled grid of art is a poster, not a reference.
  const tile = (row, cardEl, url, caption) => {
    const cell = document.createElement('div');
    cell.className = 'flex flex-col items-center gap-1 w-[4.5rem]';
    cell.appendChild(artMakeZoomable(cardEl, url, caption));
    const c = document.createElement('p');
    c.className = 'text-[0.65rem] text-stone-500 text-center leading-tight';
    c.textContent = caption;
    cell.appendChild(c);
    row.appendChild(cell);
  };

  const fruit = section('The Fruit',
    'Eight fruits, eight cards each. Collect four of a kind face-up and you are out.');
  FRT_FRUITS.forEach(f => {
    const url = (typeof assetFace === 'function') && assetFace('frt', f.id);
    tile(fruit, frtRenderCard(f.id), url, f.name);
  });

  const back = section('Face Down', 'What a served card looks like before anyone calls it.');
  tile(back, frtRenderCard(null, { faceDown: true }),
    (typeof assetBack === 'function') && assetBack('frt'), 'The Back');
}
function frtOpenPersonalities() {
  playPillClick();
  const inner = document.querySelector('#frt-personalities-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('frt-personalities-overlay').style.display = 'flex';
}
function frtShowTip(emoji, heading, lines) { /* Step 5: inject + show frt-tip-overlay */ }

// ═══════════════════════════════════════════════════════════════════════════
// Multiplayer envelope handler  (Step 5 — ACTION/SYNC per spec §11)
// ═══════════════════════════════════════════════════════════════════════════
function frtHandleEnvelope(env) {
  try {
    const a = env.payload.action, p = env.payload;

    // ── SYNC (host → all devices apply + render) ──
    if (env.type === 'SYNC') {
      if (a === 'FRT_DEAL') {
        frtPlayerCount = p.playerCount; frtPlayerNames = p.playerNames || [];
        frtStashes = frtNorm2D(p.stashes, frtPlayerCount);
        frtBowls   = Array.from({ length: frtPlayerCount }, () => []); // always empty at deal (Firebase drops empties)
        frtActivePlayer = p.activePlayer; frtRoundNum = p.roundNum;
        frtSyllyMode = p.syllyMode; frtFruitStock = p.fruitStock;
        frtScores = p.scores || []; frtBluffWins = p.bluffWins || [];
        frtResetServeState(); frtAppleLockTarget = -1; frtTablePhase = 'serving'; frtRoundLog = [];
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtShowTable();
        frtStartTurnTimer(p.turnEndTs);
        return;
      }
      if (a === 'FRT_SERVED') {
        frtStashes = frtNorm2D(p.stashes, frtPlayerCount);
        frtPassFruit = p.fruit; frtPassDeclaration = p.declaration;
        frtPassFromIdx = p.fromIdx; frtPassToIdx = p.toIdx;
        frtPassHandledBy = p.handledBy || [];
        frtPeeked = false; frtTablePhase = 'await';
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtShowTable();
        frtStartTurnTimer(p.turnEndTs);
        return;
      }
      if (a === 'FRT_REVEAL') {
        frtBowls = frtNorm2D(p.bowls, frtPlayerCount);
        frtStashes = frtNorm2D(p.stashes, frtPlayerCount);
        if (p.bluffWins) frtBluffWins = p.bluffWins;
        frtRevealData = p.reveal; frtLogReveal(p.reveal); frtTablePhase = 'reveal';
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtShowTable();
        return;
      }
      if (a === 'FRT_CONTINUE') {
        frtStashes = frtNorm2D(p.stashes, frtPlayerCount);
        frtBowls = frtNorm2D(p.bowls, frtPlayerCount);
        frtActivePlayer = p.activePlayer; frtResetServeState(); frtTablePhase = 'serving';
        frtAppleLockTarget = (p.appleLock != null ? p.appleLock : -1); // vendetta lock for this serve
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtShowTable();
        frtStartTurnTimer(p.turnEndTs);
        return;
      }
      if (a === 'FRT_ROUND_END') {
        frtBowls = frtNorm2D(p.bowls, frtPlayerCount);
        if (p.scores) frtScores = p.scores;
        frtRoundNum = p.roundNum;
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtRenderRoundEnd(p.eliminatedSet || []); // render only — host already awarded
        return;
      }
      if (a === 'FRT_GAMEOVER') {
        if (p.scores) frtScores = p.scores;
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        frtRenderGameover(p.silver || []);
        return;
      }
      if (a === 'FRT_MATCH_DISSOLVED') { resetToLobby(); return; }
      return;
    }

    // ── ACTION (client → host; host resolves) ──
    if (env.type === 'ACTION' && window.syllyMultiplayerMode === 'host') {
      if (a === 'FRT_SERVE')     { frtHostProcessServe(p.fromIdx, p.toIdx, p.declaration, p.stashIdx); return; }
      if (a === 'FRT_CALL')      { frtHostResolveChallenge(p.callerIdx, p.verdict); return; }
      if (a === 'FRT_PEEK_PASS') { frtHostProcessPeekPass(p.fromIdx, p.toIdx, p.declaration, p.swapStashIdx); return; }
      if (a === 'FRT_PLAYER_LEFT') {
        mpSendEnvelope({ type: 'SYNC', payload: { action: 'FRT_MATCH_DISSOLVED' } });
        resetToLobby(); // PASS contract — one leaver dissolves the match
        return;
      }
    }
  } catch (e) {
    console.error('[FRT] envelope handler crash:', e, env);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Teardown — called by engine.js resetToLobby()
// ═══════════════════════════════════════════════════════════════════════════
function frtResetState() {
  if (frtTurnTimerHandle) { clearInterval(frtTurnTimerHandle); frtTurnTimerHandle = null; }
  if (frtRevealTimer)     { clearTimeout(frtRevealTimer); frtRevealTimer = null; }
  frtRevealData = null; frtPeekComposing = false; frtPeeked = false;
  ['frt-settings-overlay', 'frt-how-to-overlay', 'frt-quit-overlay',
   'frt-new-game-overlay', 'frt-tip-overlay', 'frt-log-overlay',
   'frt-personalities-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  frtStashes = []; frtBowls = []; frtScores = []; frtBluffWins = [];
  frtPassFruit = -1; frtPassDeclaration = -1; frtPassFromIdx = -1; frtPassToIdx = -1;
  frtPassHandledBy = []; frtAppleLockTarget = -1; frtTablePhase = 'serving';
  frtSelectedStashIdx = -1; frtActivePlayer = 0; frtRoundNum = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Event wiring  (DOMContentLoaded — frt.js loads BEFORE its screen markup)
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Lobby entry → game menu
  on('btn-frt', () => { playLaunch(); activeGameId = 'frt'; showScreen('screen-frt-menu'); });

  // Game menu
  on('btn-frt-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') frtStartSession(); // post-lobby (host)
    else mpShowModeScreen('frt');                                    // pre-lobby
  });
  on('btn-frt-menu-how-to',   () => frtOpenHowTo());
  on('btn-frt-menu-settings', () => frtOpenSettings());
  on('btn-frt-menu-back',     () => { playExit(); resetToLobby(); });

  // Overlay closers
  on('btn-frt-settings-done', () => { playDone(); document.getElementById('frt-settings-overlay').style.display = 'none'; });
  on('btn-frt-howto-close',   () => { playDone(); document.getElementById('frt-how-to-overlay').style.display = 'none'; });
  on('btn-frt-howto-close-cards', () => { playDone(); document.getElementById('frt-how-to-overlay').style.display = 'none'; });
  document.querySelectorAll('[data-frt-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); frtSetHowToTab(b.dataset.frtHowtoTab); });
  });

  // In-game header [?] → How to Play · 📋 → Pass-Off Log
  on('btn-frt-how-to', () => frtOpenHowTo());
  on('btn-frt-log', () => frtOpenLog());
  on('btn-frt-log-close', () => { playDone(); document.getElementById('frt-log-overlay').style.display = 'none'; });

  // ── Settings controls ──
  frtBindPills('data-frt-stock',  v => frtFruitStock = v);
  frtBindPills('data-frt-rounds', v => frtRounds = parseInt(v, 10));
  frtBindPills('data-frt-timer',  v => frtTurnTimer = parseInt(v, 10));
  const syllyT = document.getElementById('btn-frt-sylly-toggle');
  if (syllyT) syllyT.addEventListener('click', () => {
    if (syllyT.disabled) return;
    frtSyllyMode = !frtSyllyMode;
    frtSyllyMode ? playSyllyOn() : playSyllyOff();
    // Mutual exclusion: Sylly on → lock Pear-Off
    if (frtSyllyMode) {
      frtPearOff = false;
      const pearT = document.getElementById('btn-frt-pearoff-toggle');
      const pearNote = document.getElementById('frt-pearoff-locked-note');
      if (pearT) { pearT.disabled = true; pearT.style.opacity = '0.4'; }
      if (pearNote) pearNote.style.display = '';
      frtSyncPearOffToggle();
    } else {
      const pearT = document.getElementById('btn-frt-pearoff-toggle');
      const pearNote = document.getElementById('frt-pearoff-locked-note');
      if (pearT) { pearT.disabled = false; pearT.style.opacity = ''; }
      if (pearNote) pearNote.style.display = 'none';
    }
    frtSyncSyllyToggle();
  });
  const pearOffT = document.getElementById('btn-frt-pearoff-toggle');
  if (pearOffT) pearOffT.addEventListener('click', () => {
    if (pearOffT.disabled) return;
    frtPearOff = !frtPearOff;
    playPillClick();
    // Mutual exclusion: Pear-Off on → lock Sylly
    if (frtPearOff) {
      frtSyllyMode = false;
      const syllyToggle = document.getElementById('btn-frt-sylly-toggle');
      const syllyNote = document.getElementById('frt-sylly-locked-note');
      if (syllyToggle) { syllyToggle.disabled = true; syllyToggle.style.opacity = '0.4'; }
      if (syllyNote) syllyNote.style.display = '';
      frtSyncSyllyToggle();
    } else {
      const syllyToggle = document.getElementById('btn-frt-sylly-toggle');
      const syllyNote = document.getElementById('frt-sylly-locked-note');
      if (syllyToggle) { syllyToggle.disabled = false; syllyToggle.style.opacity = ''; }
      if (syllyNote) syllyNote.style.display = 'none';
    }
    frtSyncPearOffToggle();
  });

  // ── Exit routing (Step 4) ──
  // Mid-game ✕ → quit overlay → PASS contract (resetToLobby). MDLM: a client leaving dissolves the match.
  document.querySelectorAll('.btn-frt-quit-open').forEach(b =>
    b.addEventListener('click', () => { document.getElementById('frt-quit-overlay').style.display = 'flex'; }));
  on('btn-frt-quit-cancel',  () => { playDone(); document.getElementById('frt-quit-overlay').style.display = 'none'; });
  on('btn-frt-quit-confirm', () => {
    playExit();
    document.getElementById('frt-quit-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode === 'client' && typeof mpSendEnvelope === 'function') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'FRT_PLAYER_LEFT' } });
    }
    resetToLobby(); // host teardown broadcasts HOST_END_GAME; client leaves
  });

  // Post-game ✕ → resetToLobby
  on('btn-frt-gameover-exit', () => { playExit(); resetToLobby(); });

  // Play again → confirm overlay → mpReturnToLobby (MDLM)
  on('btn-frt-go-again',   () => { document.getElementById('frt-new-game-overlay').style.display = 'flex'; });
  on('btn-frt-new-cancel', () => { playDone(); document.getElementById('frt-new-game-overlay').style.display = 'none'; });
  on('btn-frt-new-confirm', () => {
    playLaunch();
    document.getElementById('frt-new-game-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; }
    frtShowMenu(); // single-device fallback (frt is MDLM-only)
  });

  // ── Sound buttons (engine.js querySelectorAll runs before FRT markup is parsed) ──
  document.querySelectorAll('#screen-frt-menu .btn-open-sound, #screen-frt-table .btn-open-sound, #screen-frt-deal .btn-open-sound, #screen-frt-gameover .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });

  // ── Personalities overlay ──
  on('btn-frt-personalities-close',    () => { playDone(); document.getElementById('frt-personalities-overlay').style.display = 'none'; });
  on('btn-frt-personalities-howto',    () => frtOpenPersonalities());
  on('btn-frt-personalities-settings', () => frtOpenPersonalities());
  // btn-frt-personalities-stash is dynamically created in frtRenderServing() — wired inline there

  // Step 5 (gameplay) listeners wired in their own passes.
});
