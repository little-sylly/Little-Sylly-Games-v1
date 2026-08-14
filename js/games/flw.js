// ═══════════════════════════════════════════════════════════════════════════
// Flawless (flw) — faithful digital Love Letter (21-card Chancellor edition),
// re-skinned as The Master Jeweller's Exhibition. MDLM-only, 3–4 players,
// host-authoritative, host-as-participant. First suite game with a TRUE private-
// hand model (engine: mpSendPrivate → rooms/{code}/private/{uid}).
// Sylly Mode = The Counterfeit Run (bluff & audit economy — §12 amendment pending).
// Spec: docs/new-game-tech-flawless.md
// Depends on: engine.js (showScreen, play*, shuffle, resetToLobby, activeGameId),
//             engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots, mpSendEnvelope,
//             mpSendPrivate, mpReturnToLobby, window.syllyMultiplayerMode, mpMyPlayerIdx)
// SCAFFOLD STAGE: state + locked deck constant + named stubs. Logic injected per §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ─────────────────────────────────
let flwLedgerOn      = true;    // Appraiser's Ledger auto-tally matrix
let flwTokenMode     = 'auto';  // 'auto' | 'custom'
let flwCustomTarget  = 5;       // 3 | 5 | 7 (used only when flwTokenMode === 'custom')
let flwTurnTimer     = 0;       // 0 | 30 | 60 (Appraisal Clock, seconds)
let flwBurnSetting   = 1;       // 1 | 3 | 5 — Smoke & Mirrors: gems burned to Locked Lot per Showing
let flwSyllyMode     = false;   // The Counterfeit Run (always last setting)

// ── Roster (set from lobby, persist across play-agains) ────────────────────
let flwPlayerCount   = 0;
let flwPlayerNames   = [];

// ── Match state (reset each new game) ──────────────────────────────────────
let flwTokens        = [];      // Cut Diamonds per player
let flwShowingNum    = 0;

// ── Showing state (reset each Showing) — HOST-AUTHORITATIVE ─────────────────
let flwDeck          = [];      // The Vault: array of gemIds. index 0 = TOP (next draw); push() = BOTTOM
let flwLockedLot     = [];      // burned gem(s) — hidden; index 0 drawn if Vault empties
let flwHands         = [];      // host: each player's Showpiece (gemId). Clients hold only their own (flwMyHand)
let flwExposed       = [];      // bool per player — out this Showing
let flwUnderGlass    = [];      // bool per player — immune until own next turn
let flwDiscards      = [];      // per player: array of discarded gemIds (ledger + tie-break sum)
let flwPlayedObsidian= [];      // bool per player — Spy bonus eligibility
let flwPublicLog     = [];      // [{text}] chronological public actions
let flwActivePlayer  = 0;
let flwShowingOver   = false;

// ── Turn state (reset each turn) ───────────────────────────────────────────
let flwDrawnCard     = null;    // host: the 2nd gem the active player drew this turn
let flwEmeraldOffer  = null;    // host: [gemId, gemId] drawn for Deep Vault, awaiting keep+order

// ── The Counterfeit Run (Sylly) — PENDING detailed §4/§12 amendment (Step 5) ───
// One pocket Counterfeit card + 2 Audit Charges per player; masked "Unverified Gem"
// discards; failed audit privately leaks the accuser's hand to the accused via
// mpSendPrivate. Collapses to 0 carats if held to Vault Lock. Forward-declared so the
// state block isn't re-touched; full mechanics + packets specced before injection.
let flwCounterfeitHeld    = []; // bool per player — still holds their one Counterfeit token (per Showing)
let flwAuditCharges       = []; // int per player — Audit Charges remaining (start 2, per Showing)

// ── Client-local view state ────────────────────────────────────────────────
let flwMyHand        = null;    // this device's own Showpiece (from private FLW_HAND)
let flwMyDrawn       = null;    // this device's drawn gem this turn (from private FLW_DRAW)
let flwPublicVaultCount = 0;    // Vault size shown on every device (host mirrors flwDeck.length here)
let flwLedgerCounts  = [];      // public tally [gemId] → count discarded this Showing (Appraiser's Ledger)

// ── UI / timer ─────────────────────────────────────────────────────────────
let flwTimerHandle   = null;    // Appraisal Clock interval handle
let flwTurnEndTs     = 0;       // wall-clock end of the current turn (Appraisal Clock)
let flwLastTickSec   = -1;      // last whole second announced (gate playTick to 1/sec)
let flwSelSlot       = null;    // 'hand' | 'drawn' — which card the active player will place
let flwLastResult    = null;    // last Showing-end payload (drives result + gameover screens)
let flwEmeraldCards  = [];       // client: the 3 Deep-Vault options being chosen from
let flwEmeraldKeep   = null;     // client: index into flwEmeraldCards chosen to keep
let flwPeekGemId     = null;     // client: gemId currently behind the Peek Guard
let flwScratchTarget = -1;       // client: Scratch-Test selected target idx
let flwScratchGuess  = -1;       // client: Scratch-Test selected gem guess
// ── The Counterfeit Run (Sylly) — per-Showing ──────────────────────────────
let flwTopPlay       = [];       // host: [idx] → {claimedId, realId, counterfeit, audited} | null (most-recent auditable play)
let flwAuditedThisTurn = false;  // one audit per turn
let flwCfMode        = false;    // client: choosing which real gem to keep after a forge claim
let flwCfClaimed     = -1;       // client: the gem (1–7) the Counterfeit is mimicking
let flwCfKeep        = null;     // client: 'hand' | 'drawn' — which real gem to keep as Showpiece
let flwTopClaims     = [];       // public [idx] → auditable claimed gemId, or null (synced; clients can't see flwTopPlay)

// ── Locked deck constant (FRT_FRUITS model) — gemId 0–9 == carat value ──────
const FLW_DECK = [
  { id: 9, name: 'Pink Diamond',    qty: 1, effect: 'diamond',    colour: '#F4B8D0', cut: 'brilliant' },
  { id: 8, name: 'Blood Ruby',      qty: 1, effect: 'ruby',       colour: '#9B1B30', cut: 'cushion'   },
  { id: 7, name: 'Blue Sapphire',   qty: 1, effect: 'trade',      colour: '#1E4D8C', cut: 'oval'      },
  { id: 6, name: 'Green Emerald',   qty: 2, effect: 'deepvault',  colour: '#0B5D3B', cut: 'emerald'   },
  { id: 5, name: 'Yellow Topaz',    qty: 2, effect: 'recut',      colour: '#E0A106', cut: 'radiant'   },
  { id: 4, name: 'Imperial Jade',   qty: 2, effect: 'underglass', colour: '#2E8B57', cut: 'cabochon'  },
  { id: 3, name: 'Black Opal',      qty: 2, effect: 'appraisal',  colour: '#2B2B3A', cut: 'freeform'  },
  { id: 2, name: 'Purple Amethyst', qty: 2, effect: 'loupe',      colour: '#7B4FB5', cut: 'trillion'  },
  { id: 1, name: 'Clear Quartz',    qty: 6, effect: 'scratch',    colour: '#E8E8EE', cut: 'point'     },
  { id: 0, name: 'Raw Obsidian',    qty: 2, effect: 'obsidian',   colour: '#14141C', cut: 'rough'     },
]; // Total 21. flwBuildVault() expands qty → flat shuffled array, removes flwBurnCount() to flwLockedLot.

// Fast lookup: gemId → deck entry (gemId === carat).
const FLW_GEM = FLW_DECK.reduce((m, g) => { m[g.id] = g; return m; }, {});

// ── Derived runtime values (never stored) ──────────────────────────────────
function flwTargetTokens() {
  return flwTokenMode === 'auto' ? (flwPlayerCount === 3 ? 7 : 5) : flwCustomTarget;
}
function flwBurnCount() { return flwBurnSetting; } // decoupled from Sylly (Smoke & Mirrors owns it)
function flwTieSum(playerIdx) {
  return (flwDiscards[playerIdx] || []).reduce((sum, gemId) => sum + gemId, 0); // gemId === carat
}

// ═══════════════════════════════════════════════════════════════════════════
// Render seam (asset-pack) — all gem DOM goes through here. SCAFFOLD: placeholder.
// ═══════════════════════════════════════════════════════════════════════════
function flwRenderCard(gemId, opts = {}) {
  // Display-case frame + carat placard are CSS (.flw-card*); art carries no text or
  // border, so a skin or a rename needs no new art. See spec §3.
  const size = opts.size || 'md';
  const g = FLW_GEM[gemId] || {};
  const el = document.createElement('div');
  if (opts.faceDown) {
    el.className = 'flw-card flw-card-back flw-card-' + size;
    // Asset-pack back (device-local skin) if active; else default gradient back.
    const back = (typeof assetBack === 'function') && assetBack('flw');
    if (back) {
      el.style.backgroundImage = 'url("' + back + '")';
    } else {
      el.textContent = '\u{1F48E}';
    }
    return el; // no placard on a back
  }
  el.className = 'flw-card flw-card-' + size;
  el.dataset.gemId = gemId;
  // Asset-pack face (device-local skin) if one covers this gem; else the colour+carat fallback.
  const faceUrl = (typeof assetFace === 'function') && assetFace('flw', gemId);
  if (faceUrl) {
    el.style.backgroundImage = 'url("' + faceUrl + '")';
  } else {
    el.classList.add('flw-card-fallback');
    el.style.setProperty('--flw-gem', g.colour || '#ccc');
  }
  // The placard is appended AFTER the art/fallback branch, in both cases — the
  // old code returned early inside the art branch before this ever ran.
  const carat = document.createElement('div');
  carat.className = 'flw-carat';
  carat.textContent = g.id;
  el.appendChild(carat);
  if (opts.dimmed)     el.classList.add('flw-card-dim');
  if (opts.selected)   el.classList.add('flw-card-sel');
  if (opts.selectable) el.style.cursor = 'pointer';
  return el;
}

// ═══════════════════════════════════════════════════════════════════════════
// Screen / flow stubs (logic injected per §15, one effect at a time)
// ═══════════════════════════════════════════════════════════════════════════
// ── Helpers ────────────────────────────────────────────────────────────────
function flwMyIdx() { return (window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0); }
function flwOnTable() { const el = document.getElementById('screen-flw-table'); return el && el.style.display !== 'none'; }

// ── Deck (host-authoritative) ──────────────────────────────────────────────
function flwBuildVault() {
  const flat = [];
  FLW_DECK.forEach(g => { for (let n = 0; n < g.qty; n++) flat.push(g.id); });
  const shuffled = shuffle(flat);
  flwLockedLot = shuffled.slice(0, flwBurnCount()); // burned face-down (Smoke & Mirrors: 1/3/5)
  flwDeck      = shuffled.slice(flwBurnCount());     // index 0 = TOP (next draw)
}

// ── Session / deal (host + single) ─────────────────────────────────────────
function flwStartSession() {
  if (window.syllyMultiplayerMode === 'client') return; // clients wait for FLW_SHOWING_START
  flwTokens     = Array(flwPlayerCount).fill(0);
  flwShowingNum = 0;
  flwDealShowing();
}

function flwDealShowing() {
  flwShowingNum++;
  flwBuildVault();
  flwHands          = [];
  flwExposed        = Array(flwPlayerCount).fill(false);
  flwUnderGlass     = Array(flwPlayerCount).fill(false);
  flwDiscards       = Array.from({ length: flwPlayerCount }, () => []);
  flwPlayedObsidian = Array(flwPlayerCount).fill(false);
  flwPublicLog      = [];
  flwLedgerCounts   = Array(10).fill(0);
  flwShowingOver    = false;
  flwDrawnCard      = null;
  flwMyDrawn        = null;
  // The Counterfeit Run resources (Sylly) — initialised; mechanics injected in the Sylly slice.
  flwCounterfeitHeld    = Array(flwPlayerCount).fill(true);
  flwAuditCharges       = Array(flwPlayerCount).fill(2);
  flwTopPlay            = Array(flwPlayerCount).fill(null);
  flwAuditedThisTurn    = false;
  // Deal one secret Showpiece each from the top of the Vault
  for (let i = 0; i < flwPlayerCount; i++) flwHands[i] = flwDeck.shift();
  flwActivePlayer       = 0; // seat-0 opener every Showing (Q3, v1)
  flwPublicVaultCount   = flwDeck.length;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FLW_SHOWING_START',
      playerNames: flwPlayerNames, playerCount: flwPlayerCount,
      activePlayer: flwActivePlayer, vaultCount: flwPublicVaultCount,
      exposed: flwExposed, underGlass: flwUnderGlass, tokens: flwTokens, ledger: flwLedgerCounts,
      target: flwTargetTokens(), showingNum: flwShowingNum, sylly: flwSyllyMode,
      auditCharges: flwAuditCharges, topClaims: flwTopPlayClaims(), log: flwPublicLog,
    }});
    flwSendPrivateHands();
  } else {
    flwMyHand = flwHands[0];
  }
  flwBeginTurn();
}

// Host → each device its OWN Showpiece only (never broadcast). Host stores its own locally.
function flwSendPrivateHands() {
  for (let i = 0; i < flwPlayerCount; i++) {
    const uid = mpPlayerSlots[i] && mpPlayerSlots[i].uid;
    if (!uid) continue;
    if (uid === window.syllyDeviceUid) { flwMyHand = flwHands[i]; continue; } // host's own — local
    mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'FLW_HAND', gemId: flwHands[i] } });
  }
}

// Active player draws their 2nd gem (or Vault Lock if the Vault is dry).
function flwBeginTurn() {
  flwAuditedThisTurn = false; // fresh turn — the active player may audit once
  flwUnderGlass[flwActivePlayer] = false; // Under Glass (Imperial Jade) lifts when your own turn begins
  if (flwDeck.length === 0) { flwEndShowing('vaultlock'); return; }
  flwDrawnCard        = flwDeck.shift();
  flwPublicVaultCount = flwDeck.length;
  const endTs = flwTurnTimer ? Date.now() + flwTurnTimer * 1000 : 0;
  const activeUid = mpPlayerSlots[flwActivePlayer] && mpPlayerSlots[flwActivePlayer].uid;
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FLW_TURN_START', activePlayer: flwActivePlayer, vaultCount: flwPublicVaultCount,
      underGlass: flwUnderGlass, turnEndTs: endTs, topClaims: flwTopPlayClaims(),
    }});
    if (activeUid === window.syllyDeviceUid) flwMyDrawn = flwDrawnCard;       // host is active — local
    else if (activeUid) mpSendPrivate(activeUid, { type: 'SYNC', payload: { action: 'FLW_DRAW', gemId: flwDrawnCard } });
  } else {
    flwMyDrawn = flwDrawnCard;
  }
  flwShowTable();
  flwStartTurnTimer(endTs); // host/single clock (clients start from FLW_TURN_START)
}

// ── Render (every device) ──────────────────────────────────────────────────
function flwShowTable()  { showScreen('screen-flw-table'); flwRenderTable(); }

function flwRenderTable() {
  const me = flwMyIdx();
  if (window.syllyMultiplayerMode !== 'client') flwTopClaims = flwTopPlayClaims(); // host derives fresh
  const label = document.getElementById('flw-turn-label');
  if (label) {
    if (flwExposed[me]) label.textContent = 'Exposed — spectating';
    else if (flwActivePlayer === me) label.textContent = 'Your turn';
    else label.textContent = (flwPlayerNames[flwActivePlayer] || 'Player') + "'s turn";
  }
  const vc = document.getElementById('flw-vault-count');
  if (vc) vc.textContent = flwPublicVaultCount;
  flwRenderRivalStrip(me);
  flwRenderLedger();
  flwRenderLog();
  flwRenderHand(me);
  const btn = document.getElementById('btn-flw-action');
  if (btn) {
    const myTurn = (flwActivePlayer === me && !flwExposed[me] && flwMyDrawn != null && !flwShowingOver);
    if (flwCfMode) {
      btn.disabled = (flwCfKeep == null);
      btn.textContent = (flwCfKeep == null) ? 'Keep a gem to forge' : ('Forge ' + (FLW_GEM[flwCfClaimed] ? FLW_GEM[flwCfClaimed].name : 'gem'));
    } else if (myTurn && flwSelSlot) {
      const gemId = (flwSelSlot === 'hand') ? flwMyHand : flwMyDrawn;
      const fizzle = flwIsTargeted(gemId) && flwLegalTargets(gemId, me).length === 0; // Topaz never fizzles (self legal)
      btn.disabled = false;
      btn.textContent = fizzle ? 'Discard (no effect)' : ('Place ' + (FLW_GEM[gemId] ? FLW_GEM[gemId].name : 'gem'));
    } else {
      btn.disabled = true;
      btn.textContent = myTurn ? 'Choose a gem to place' : 'Waiting…';
    }
  }
  const auditBtn = document.getElementById('btn-flw-audit');
  if (auditBtn) {
    const canAudit = flwSyllyMode && flwActivePlayer === me && !flwExposed[me] && !flwShowingOver
      && !flwCfMode && !flwAuditedThisTurn && (flwAuditCharges[me] || 0) > 0
      && (flwTopClaims || []).some((c, i) => c != null && i !== me && !flwExposed[i]);
    auditBtn.style.display = canAudit ? '' : 'none';
    auditBtn.textContent = 'Audit (' + (flwAuditCharges[me] || 0) + ')';
  }
}
function flwTopPlayClaims() { return (flwTopPlay || []).map(tp => (tp && !tp.audited) ? tp.claimedId : null); }

function flwRenderRivalStrip(me) {
  const strip = document.getElementById('flw-rival-strip');
  if (!strip) return;
  strip.innerHTML = '';
  for (let i = 0; i < flwPlayerCount; i++) {
    if (i === me) continue;
    const active = (i === flwActivePlayer);
    const chip = document.createElement('div');
    chip.className = 'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl shadow-sm ' + (active ? 'bg-[#FBE0EA]' : 'bg-white');
    const badge = document.createElement('div');
    badge.className = 'text-base';
    badge.textContent = flwExposed[i] ? '\u{1F4A5}' : (flwUnderGlass[i] ? '\u{1F6E1}\u{FE0F}' : '\u{1F48E}');
    const nm = document.createElement('div');
    nm.className = 'text-xs font-semibold ' + (flwExposed[i] ? 'text-stone-300 line-through' : 'text-stone-700');
    nm.textContent = (flwPlayerNames[i] || ('P' + (i + 1)));
    const tok = document.createElement('div');
    tok.className = 'text-[0.6rem] text-stone-400';
    tok.textContent = '\u{1F48E}'.repeat(flwTokens[i] || 0) || '·';
    chip.append(badge, nm, tok);
    strip.appendChild(chip);
  }
}

function flwMiniLabel(t) {
  const p = document.createElement('p');
  p.className = 'text-[0.6rem] text-stone-400 font-semibold uppercase tracking-wide';
  p.textContent = t;
  return p;
}

function flwLedgerTally() {
  const t = Array(10).fill(0);
  flwDiscards.forEach(d => (d || []).forEach(g => { if (g >= 0 && g <= 9) t[g]++; }));
  return t;
}
// The Gem Manifest used to be its own slide-up overlay opened by a [?] button beside
// the Ledger. Knowing the gems IS learning the game, so it is now tab 2 of How to Play
// — same content, one overlay closer, one less entry in the resetToLobby teardown.
// Same fold PKO's chain reference got (10 Aug 2026). Both entry points route here.
function flwOpenGemManifest() { flwOpenHowTo('gems'); }

// Tap-hold any real, identified gem → jump to its row in the Gem Manifest, scrolled
// to and briefly ringed (ui-style.md § Tap-Hold Reference — delegates to engine.js's
// bindCardHold). Not bound on gallery rows themselves or on face-down backs.
function flwBindCardHold(el, gemId) { bindCardHold(el, () => flwOpenHowTo('gems', gemId)); }

// What each carat DOES. Kept beside the renderer rather than in FLW_DECK because it is
// presentation copy, not deck data — flwResolveEffect owns the real behaviour.
const FLW_GEM_EFFECT = {
  9: 'No effect — but you’re out if ever forced to discard it.',
  8: 'Must be played if held with the 7 or 5.',
  7: 'The Trade — swap Showpieces with a rival.',
  6: 'The Deep Vault — draw 2, keep the best of 3.',
  5: 'The Recut — a player (or you) discards and redraws.',
  4: 'Under Glass — untargetable until your next turn.',
  3: 'The Private Appraisal — lower carat is Exposed.',
  2: 'The Loupe — secretly view a rival’s Showpiece.',
  1: 'The Scratch Test — name a gem to Expose a rival (six in the deck).',
  0: 'Worthless at Vault Lock, but earns a bonus Diamond if you’re the sole survivor who played one.',
};

// One row per gem: the real card, its name and carat, how many are in the Vault, and
// what it does. Rows render through flwRenderCard — the old manifest drew its own
// colour-swatch circles, which meant a skin could never reach it and the Vault's own
// artwork was invisible outside a live Showing.
// highlightId: scroll to + briefly ring that gem's row (tap-hold entry point).
function flwRenderGems(highlightId) {
  const box = document.getElementById('flw-gems-body');
  if (!box) return;
  box.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'text-stone-400 text-xs';
  intro.textContent = `Twenty-one gems in the Vault. Highest carat held at Vault Lock wins the Showing.`;
  box.appendChild(intro);

  FLW_DECK.forEach(g => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 rounded-2xl p-2.5 bg-white shadow-sm flw-ref-row';
    row.dataset.flwGemId = g.id;
    const url = (typeof assetFace === 'function') && assetFace('flw', g.id);
    row.appendChild(artMakeZoomable(flwRenderCard(g.id, { size: 'sm' }), url, g.name));

    const txt = document.createElement('div');
    txt.className = 'flex flex-col gap-0.5 min-w-0';
    const n = document.createElement('p');
    n.className = 'font-bold text-stone-800 text-sm';
    n.textContent = `${g.name} · ${g.id}`;
    const q = document.createElement('p');
    q.className = 'text-stone-400 text-[0.65rem] font-semibold uppercase tracking-wide';
    q.textContent = g.qty === 1 ? 'One in the Vault' : `${g.qty} in the Vault`;
    const e = document.createElement('p');
    e.className = 'text-stone-500 text-xs';
    e.textContent = FLW_GEM_EFFECT[g.id] || '';
    txt.append(n, q, e);
    row.appendChild(txt);
    box.appendChild(row);
  });

  if (highlightId != null) refHighlightRow(box, 'data-flw-gem-id', highlightId, 'flw-ref-row-ping');
}

function flwSetHowToTab(tab, highlightId) {
  const rules = document.getElementById('flw-how-to-body');
  const gems  = document.getElementById('flw-how-to-gems');
  if (rules) rules.style.display = tab === 'gems' ? 'none' : 'flex';
  if (gems)  gems.style.display  = tab === 'gems' ? 'flex' : 'none';
  document.querySelectorAll('[data-flw-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-flw');       // .pill is the base — never removed
    if (b.dataset.flwHowtoTab === tab) b.classList.add('pill-active-flw');
  });
  if (tab === 'gems') flwRenderGems(highlightId);
}

function flwRenderLedger() {
  const el = document.getElementById('flw-ledger');
  if (!el) return;
  if (!flwLedgerOn) { el.innerHTML = '<p class="text-stone-400 text-xs">Off — count the discards yourself.</p>'; return; }
  const counts = flwLedgerCounts || [];
  // 4-column grid: [carat#] [gem name] [seen] [/total] — gem colour on numeric fields only
  let html = '<div style="display:grid;grid-template-columns:1.1rem 1fr auto auto;gap:0.12rem 0.45rem;align-items:center;">';
  FLW_DECK.forEach(g => {
    const seen = counts[g.id] || 0;
    const done = seen >= g.qty;
    const col = g.colour || '#9ca3af';
    const fade = done ? 'opacity:0.3;text-decoration:line-through;' : '';
    html += '<div style="font-size:0.65rem;font-weight:800;color:' + col + ';text-align:right;' + fade + '">' + g.id + '</div>'
          + '<div style="font-size:0.65rem;color:#57534e;' + fade + '">' + g.name + '</div>'
          + '<div style="font-size:0.65rem;font-weight:700;color:' + col + ';' + fade + '">' + seen + '</div>'
          + '<div style="font-size:0.65rem;color:#a8a29e;' + fade + '">/​' + g.qty + '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}
function flwRenderLog() {
  const el = document.getElementById('flw-log');
  if (!el) return;
  const items = flwPublicLog || [];
  el.innerHTML = items.length
    ? items.map(e => '<p>' + (e.text || '') + '</p>').join('')
    : '<p class="text-stone-400 italic">The Exhibition begins…</p>';
  el.scrollTop = el.scrollHeight;
}

function flwRenderHand(me) {
  const row = document.getElementById('flw-hand-row');
  if (!row) return;
  row.innerHTML = '';
  if (flwExposed[me]) { row.innerHTML = '<p class="text-stone-400 text-sm">You are Exposed this Showing.</p>'; return; }
  if (flwMyHand == null) { row.innerHTML = '<p class="text-stone-400 text-sm">Waiting for your Showpiece…</p>'; return; }
  const myTurn = (flwActivePlayer === me && flwMyDrawn != null && !flwShowingOver);
  const forced = (myTurn && !flwCfMode) ? flwRubyForcedSlot() : null; // Blood Ruby hard-lock
  const cards = [{ slot: 'hand', gemId: flwMyHand }];
  if (myTurn) cards.push({ slot: 'drawn', gemId: flwMyDrawn });
  cards.forEach(c => {
    let selectable, dimmed, outlined, onTap;
    if (flwCfMode) {                                   // choosing which real gem to KEEP (other is forged)
      selectable = true; dimmed = false; outlined = (flwCfKeep === c.slot);
      onTap = () => flwCfChooseKeep(c.slot);
    } else {
      selectable = myTurn && (!forced || forced === c.slot);
      dimmed     = myTurn && forced && forced !== c.slot;
      outlined   = myTurn && flwSelSlot === c.slot;
      onTap = () => flwSelectSlot(c.slot);
    }
    const card = flwRenderCard(c.gemId, { size: 'md', selectable, dimmed, selected: outlined });
    flwBindCardHold(card, c.gemId);
    if (selectable) card.addEventListener('click', onTap);
    const wrap = document.createElement('div'); wrap.className = 'flex flex-col items-center gap-1';
    wrap.append(card, flwMiniLabel(flwCfMode ? (c.slot === flwCfKeep ? 'Keep' : 'Forge?') : (c.slot === 'hand' ? 'Showpiece' : 'Drawn')));
    row.appendChild(wrap);
  });
  // Counterfeit token (Sylly) — far right; hidden under the Ruby lock
  if (flwSyllyMode && myTurn && flwCounterfeitHeld[me] && !flwRubyForcedSlot()) {
    const tok = flwRenderCounterfeitToken();
    if (flwCfMode) tok.style.outline = '3px solid #C9A227';
    else tok.addEventListener('click', () => flwBeginCounterfeit());
    const wrap = document.createElement('div'); wrap.className = 'flex flex-col items-center gap-1';
    wrap.append(tok, flwMiniLabel('Counterfeit'));
    row.appendChild(wrap);
  }
}
function flwRenderCounterfeitToken() {
  const el = document.createElement('div');
  el.className = 'flw-card flw-card-lg';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.2rem;background:linear-gradient(145deg,#2b2b3a,#14141c);border:2px dashed #C9A227;color:#C9A227;cursor:pointer;';
  el.innerHTML = '<div style="font-size:1.6rem;font-weight:800;">?</div><div style="font-size:0.5rem;font-weight:700;letter-spacing:0.05em;">FORGE</div>';
  return el;
}

// ── Effect / target helpers ────────────────────────────────────────────────
function flwIsTargeted(gemId) { return [7, 5, 3, 2, 1].includes(gemId); } // trade, recut, opal, loupe, scratch
function flwLegalTargets(gemId, active) {
  const out = [];
  for (let i = 0; i < flwPlayerCount; i++) {
    if (flwExposed[i]) continue;
    if (i === active) { if (gemId === 5) out.push(i); continue; } // Topaz (Recut) may self-target
    if (flwUnderGlass[i]) continue;                                // Under Glass = untargetable
    out.push(i);
  }
  return out;
}
function flwRubyForced(pair) { return pair.includes(8) && (pair.includes(7) || pair.includes(5)); }
function flwRubyForcedSlot() {
  if (flwMyDrawn == null) return null;
  const pair = [flwMyHand, flwMyDrawn];
  if (!flwRubyForced(pair)) return null;
  return (flwMyHand === 8) ? 'hand' : 'drawn';
}
function flwAliveCount() { let n = 0; for (let i = 0; i < flwPlayerCount; i++) if (!flwExposed[i]) n++; return n; }
function flwNextActive(from) {
  for (let s = 1; s <= flwPlayerCount; s++) {
    const i = (from + s) % flwPlayerCount;
    if (!flwExposed[i]) return i;
  }
  return from;
}
function flwDrawForRedraw() { return flwDeck.length ? flwDeck.shift() : (flwLockedLot.length ? flwLockedLot.shift() : null); }
function flwExpose(idx) {
  if (flwExposed[idx]) return;
  flwExposed[idx] = true;
  if (flwHands[idx] != null) { flwDiscards[idx].push(flwHands[idx]); flwHands[idx] = null; }
}
function flwName(i) { return flwPlayerNames[i] || ('P' + (i + 1)); }

// ── Selection + play initiation (active device) ────────────────────────────
function flwSelectSlot(slot) { playPillClick(); flwSelSlot = slot; flwRenderTable(); }

function flwBeginPlay(gemId) {
  const me = flwMyIdx();
  if (gemId === 6) { playWhoosh(); flwSubmitPlay(6, -1, null); return; }       // Emerald — host returns the 3-card offer
  if (gemId === 1) {                                                            // Quartz — needs target + guess
    if (flwLegalTargets(1, me).length === 0) { playWhoosh(); flwSubmitPlay(1, -1, null); return; }
    flwOpenScratch(); return;
  }
  if (flwIsTargeted(gemId)) {
    const lg = flwLegalTargets(gemId, me);
    if (lg.length === 0) { playWhoosh(); flwSubmitPlay(gemId, -1, null); return; } // fizzle
    if (lg.length === 1) { playWhoosh(); flwSubmitPlay(gemId, lg[0], null); return; } // only one legal target
    flwOpenTarget(gemId, lg); return;
  }
  playWhoosh(); flwSubmitPlay(gemId, -1, null);                                 // no-target effect
}

// ── The Counterfeit Run — forge flow (active device) ───────────────────────
function flwBeginCounterfeit() {
  if (flwRubyForcedSlot()) return; // can't bluff under the Ruby lock
  flwCfClaimed = -1; flwCfKeep = null;
  const grid = document.getElementById('flw-cf-grid');
  if (grid) {
    grid.innerHTML = '';
    [7, 6, 5, 4, 3, 2, 1].forEach(g => {
      const b = document.createElement('button');
      b.className = 'pill'; b.dataset.cf = g; b.textContent = g + ' ' + FLW_GEM[g].name;
      b.addEventListener('click', () => flwCfPickClaim(g));
      grid.appendChild(b);
    });
  }
  const ov = document.getElementById('flw-cf-overlay'); if (ov) ov.style.display = 'flex';
}
function flwCfPickClaim(g) {
  playPillClick();
  flwCfClaimed = g; flwCfMode = true; flwCfKeep = null;
  const ov = document.getElementById('flw-cf-overlay'); if (ov) ov.style.display = 'none';
  flwRenderTable();
}
function flwCfChooseKeep(slot) { playPillClick(); flwCfKeep = slot; flwRenderTable(); }
function flwCancelCounterfeit() { flwCfMode = false; flwCfKeep = null; flwCfClaimed = -1; flwRenderTable(); }
function flwBeginCounterfeitPlay() {
  const me = flwMyIdx();
  const claimedId = flwCfClaimed, keepSlot = flwCfKeep;
  if (claimedId < 1 || claimedId > 7 || keepSlot == null) return;
  if (claimedId === 6) { playWhoosh(); flwSubmitCounterfeit(6, keepSlot, -1, null); return; }   // forged Deep Vault
  if (claimedId === 1) {
    if (flwLegalTargets(1, me).length === 0) { playWhoosh(); flwSubmitCounterfeit(1, keepSlot, -1, null); return; }
    flwOpenScratch(); return; // flwCfMode true → confirm routes to counterfeit
  }
  if (flwIsTargeted(claimedId)) {
    const lg = flwLegalTargets(claimedId, me);
    if (lg.length === 0) { playWhoosh(); flwSubmitCounterfeit(claimedId, keepSlot, -1, null); return; }
    if (lg.length === 1) { playWhoosh(); flwSubmitCounterfeit(claimedId, keepSlot, lg[0], null); return; }
    flwOpenTarget(claimedId, lg); return; // flwCfMode true → tap routes to counterfeit
  }
  playWhoosh(); flwSubmitCounterfeit(claimedId, keepSlot, -1, null);
}

// ── Audit (active device) — pick a rival's most-recent play to authenticate ──
function flwOpenAudit() {
  const me = flwMyIdx();
  const head = document.getElementById('flw-target-heading');
  const sub  = document.getElementById('flw-target-sub');
  const list = document.getElementById('flw-target-list');
  if (head) head.textContent = 'Audit a Rival';
  if (sub)  sub.textContent = 'Authenticate their latest gem. Call it wrong and you leak your hand.';
  if (list) {
    list.innerHTML = '';
    for (let i = 0; i < flwPlayerCount; i++) {
      if (i === me || flwExposed[i]) continue;
      const claim = (flwTopClaims || [])[i];
      if (claim == null) continue;
      const b = document.createElement('button');
      b.className = 'flw-cta min-h-11 w-full rounded-2xl text-white font-semibold text-sm active:scale-95 transition-all duration-100';
      b.textContent = flwName(i) + ' — last played ' + (FLW_GEM[claim] ? FLW_GEM[claim].name : 'a gem');
      b.addEventListener('click', () => { document.getElementById('flw-target-overlay').style.display = 'none'; playWhoosh(); flwSubmitAudit(i); });
      list.appendChild(b);
    }
  }
  document.getElementById('flw-target-overlay').style.display = 'flex';
}

function flwDispatchPlay(payload) {
  flwSelSlot = null; flwCfMode = false; flwCfKeep = null; flwCfClaimed = -1;
  flwClearTimer(); // you've acted — stop your own clock
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: Object.assign({ action: 'FLW_PLAY' }, payload) });
  } else {
    flwHostEntryPlay(flwMyIdx(), payload);
  }
}
function flwSubmitPlay(gemId, targetIdx, guessId) { flwDispatchPlay({ gemId, targetIdx, guessId }); }
function flwSubmitCounterfeit(claimedId, keepSlot, targetIdx, guessId) {
  const me = flwMyIdx();
  if (flwCounterfeitHeld[me] !== undefined) flwCounterfeitHeld[me] = false; // optimistic — token spent
  flwDispatchPlay({ counterfeit: true, claimedId, keepSlot, targetIdx, guessId });
}
function flwSubmitAudit(targetIdx) {
  if (flwAuditedThisTurn) return;
  flwAuditedThisTurn = true; // local gate; host re-validates
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'FLW_AUDIT', targetIdx } });
  } else {
    flwHostAudit(flwMyIdx(), targetIdx);
  }
}

function flwOpenTarget(gemId, legal) {
  const head = document.getElementById('flw-target-heading');
  const sub  = document.getElementById('flw-target-sub');
  const list = document.getElementById('flw-target-list');
  if (head) head.textContent = 'The ' + ({ 7: 'Trade', 5: 'Recut', 3: 'Private Appraisal', 2: 'Loupe' }[gemId] || 'Effect');
  if (sub)  sub.textContent = 'Tap a jeweller to target.';
  if (list) {
    list.innerHTML = '';
    legal.forEach(i => {
      const b = document.createElement('button');
      b.className = 'flw-cta min-h-11 w-full rounded-2xl text-white font-semibold text-sm active:scale-95 transition-all duration-100';
      b.textContent = (i === flwMyIdx()) ? (flwName(i) + ' (yourself)') : flwName(i);
      b.addEventListener('click', () => {
        document.getElementById('flw-target-overlay').style.display = 'none'; playWhoosh();
        if (flwCfMode) flwSubmitCounterfeit(gemId, flwCfKeep, i, null); else flwSubmitPlay(gemId, i, null);
      });
      list.appendChild(b);
    });
  }
  document.getElementById('flw-target-overlay').style.display = 'flex';
}

function flwOpenScratch() {
  flwScratchTarget = -1; flwScratchGuess = -1;
  const me = flwMyIdx();
  const tl = document.getElementById('flw-scratch-target-list');
  const gl = document.getElementById('flw-scratch-guess-list');
  if (tl) {
    tl.innerHTML = '';
    flwLegalTargets(1, me).forEach(i => {
      const b = document.createElement('button');
      b.className = 'pill'; b.dataset.t = i; b.textContent = flwName(i);
      b.addEventListener('click', () => { flwScratchTarget = i; flwRenderScratchSel(); });
      tl.appendChild(b);
    });
  }
  if (gl) {
    gl.innerHTML = '';
    [9, 8, 7, 6, 5, 4, 3, 2, 0].forEach(g => { // every gem except Clear Quartz (1)
      const b = document.createElement('button');
      b.className = 'pill'; b.dataset.g = g; b.textContent = g + ' ' + FLW_GEM[g].name;
      b.addEventListener('click', () => { flwScratchGuess = g; flwRenderScratchSel(); });
      gl.appendChild(b);
    });
  }
  flwRenderScratchSel();
  document.getElementById('flw-scratch-overlay').style.display = 'flex';
}
function flwRenderScratchSel() {
  document.querySelectorAll('#flw-scratch-target-list .pill').forEach(b => b.classList.toggle('pill-active-flw', parseInt(b.dataset.t, 10) === flwScratchTarget));
  document.querySelectorAll('#flw-scratch-guess-list .pill').forEach(b => b.classList.toggle('pill-active-flw', parseInt(b.dataset.g, 10) === flwScratchGuess));
  const c = document.getElementById('btn-flw-scratch-confirm');
  if (c) c.disabled = !(flwScratchTarget >= 0 && flwScratchGuess >= 0);
}

// ── Host resolution ────────────────────────────────────────────────────────
function flwHostEntryPlay(active, p) {
  if (active !== flwActivePlayer || flwShowingOver) return;
  if (p.counterfeit) { flwHostResolveCounterfeit(active, p); return; } // The Counterfeit Run (Sylly)
  const gemId = p.gemId;
  const hand = [flwHands[active], flwDrawnCard];
  if (gemId !== hand[0] && gemId !== hand[1]) return;       // not held
  if (flwRubyForced(hand) && gemId !== 8) return;            // Blood Ruby hard-lock
  if (gemId === 6) { flwHostStartEmerald(active, null); return; } // Emerald — two-step
  flwHostResolvePlay(active, gemId, p.targetIdx, p.guessId);
}

// Records the auditable most-recent play (overwriting buries the previous one).
function flwSetTopPlay(idx, claimedId, realId, counterfeit) {
  flwTopPlay[idx] = { claimedId, realId, counterfeit: !!counterfeit, audited: false };
}

// Applies one gem's effect (operates on flwHands[active] = already-retained Showpiece).
// Returns the public log line (which states the CLAIMED effect — a forgery's lie reads true).
function flwApplyEffect(active, gemId, targetIdx, guessId, changed) {
  switch (FLW_GEM[gemId].effect) {
    case 'diamond':    return flwName(active) + ' placed the Pink Diamond.';
    case 'ruby':       return flwName(active) + ' placed the Blood Ruby.';
    case 'underglass': flwUnderGlass[active] = true; return flwName(active) + ' slipped Under Glass.';
    case 'obsidian':   return flwName(active) + ' placed a Raw Obsidian.';
    case 'trade':
      if (targetIdx < 0) return flwName(active) + ' played The Trade — no one to trade with.';
      { const t = flwHands[active]; flwHands[active] = flwHands[targetIdx]; flwHands[targetIdx] = t; }
      changed.add(targetIdx);
      return flwName(active) + ' traded Showpieces with ' + flwName(targetIdx) + '.';
    case 'recut': {
      if (targetIdx < 0) return flwName(active) + ' played The Recut — no valid target.';
      const before = flwHands[targetIdx]; flwRecut(targetIdx, changed);
      let s = flwName(active) + ' forced ' + flwName(targetIdx) + ' to recut.';
      if (before === 9) s += ' The Pink Diamond shattered — ' + flwName(targetIdx) + ' is Exposed!';
      return s;
    }
    case 'appraisal': {
      if (targetIdx < 0) return flwName(active) + ' played The Private Appraisal — no target.';
      const av = flwHands[active], tv = flwHands[targetIdx];
      if (av < tv) { flwExpose(active); return flwName(active) + ' lost the Appraisal and was Exposed.'; }
      if (tv < av) { flwExpose(targetIdx); return flwName(active) + ' out-appraised ' + flwName(targetIdx) + ' — Exposed.'; }
      return flwName(active) + ' and ' + flwName(targetIdx) + ' appraised dead even — no change.';
    }
    case 'loupe': {
      if (targetIdx < 0) return flwName(active) + ' played The Loupe — no one to inspect.';
      const auid = mpPlayerSlots[active] && mpPlayerSlots[active].uid;
      if (window.syllyMultiplayerMode === 'single' || auid === window.syllyDeviceUid) flwShowPeek(targetIdx, flwHands[targetIdx]);
      else if (auid) mpSendPrivate(auid, { type: 'SYNC', payload: { action: 'FLW_PEEK', targetIdx, gemId: flwHands[targetIdx] } });
      return flwName(active) + ' studied ' + flwName(targetIdx) + ' through the Loupe.';
    }
    case 'scratch':
      if (targetIdx < 0) return flwName(active) + ' played The Scratch Test — no target.';
      if (flwHands[targetIdx] === guessId) { flwExpose(targetIdx); return flwName(active) + ' scratched ' + flwName(targetIdx) + "'s gem — Exposed!"; }
      return flwName(active) + ' guessed wrong on ' + flwName(targetIdx) + '.';
  }
  return '';
}

function flwAfterPlay(active, changed) {
  if (flwAliveCount() <= 1) { flwEndShowing('laststanding'); return; }
  flwBroadcastResolve(changed);
  flwActivePlayer = flwNextActive(active);
  flwBeginTurn();
}

function flwHostResolvePlay(active, gemId, targetIdx, guessId) {
  if (flwIsTargeted(gemId)) {
    const legal = flwLegalTargets(gemId, active);
    if (legal.length === 0) targetIdx = -1;          // fizzle
    else if (!legal.includes(targetIdx)) return;     // illegal target — reject
  } else targetIdx = -1;
  if (gemId === 1 && targetIdx >= 0 && (guessId === 1 || guessId == null || guessId < 0 || guessId > 9)) return;

  const hand = [flwHands[active], flwDrawnCard];
  flwHands[active] = (gemId === hand[0]) ? hand[1] : hand[0]; // retained Showpiece
  flwDrawnCard = null;
  flwDiscards[active].push(gemId);
  flwSetTopPlay(active, gemId, gemId, false);                 // genuine play
  if (gemId === 0) flwPlayedObsidian[active] = true;
  const changed = new Set([active]);
  flwPublicLog.push({ text: flwApplyEffect(active, gemId, targetIdx, guessId, changed) });
  flwAfterPlay(active, changed);
}

// The Counterfeit Run — forge a claimed gem (1–7) onto a sacrificed real card.
function flwHostResolveCounterfeit(active, p) {
  if (!flwSyllyMode || !flwCounterfeitHeld[active]) return;
  const claimedId = p.claimedId;
  if (!(claimedId >= 1 && claimedId <= 7)) return;           // mimic 1–7 only (decision #3)
  const hand = [flwHands[active], flwDrawnCard];
  if (flwRubyForced(hand)) return;                            // Ruby lock overrides the bluff
  const keepSlot = (p.keepSlot === 'drawn') ? 'drawn' : 'hand';
  const realId = (keepSlot === 'hand') ? flwDrawnCard : flwHands[active]; // sacrificed (hidden) card
  const kept   = (keepSlot === 'hand') ? flwHands[active] : flwDrawnCard;
  if (realId == null) return;
  let targetIdx = p.targetIdx, guessId = p.guessId;
  if (flwIsTargeted(claimedId)) {
    const legal = flwLegalTargets(claimedId, active);
    if (legal.length === 0) targetIdx = -1;
    else if (!legal.includes(targetIdx)) return;
  } else targetIdx = -1;
  if (claimedId === 1 && targetIdx >= 0 && (guessId === 1 || guessId == null || guessId < 0 || guessId > 9)) return;

  flwCounterfeitHeld[active] = false;
  flwHands[active] = kept;
  flwDrawnCard = null;
  flwDiscards[active].push(claimedId);                       // forged — Ledger sees the claim (decision #1)
  flwSetTopPlay(active, claimedId, realId, true);
  const changed = new Set([active]);
  if (claimedId === 6) { flwHostStartEmerald(active, kept); return; } // forged Deep Vault
  flwPublicLog.push({ text: flwApplyEffect(active, claimedId, targetIdx, guessId, changed) });
  flwAfterPlay(active, changed);
}

function flwRecut(targetIdx, changed) {
  const disc = flwHands[targetIdx];
  if (disc === 9) { flwExpose(targetIdx); return; } // Pink Diamond forced-discard → Exposed, no redraw
  if (disc != null) flwDiscards[targetIdx].push(disc);
  flwHands[targetIdx] = flwDrawForRedraw();
  changed.add(targetIdx);
}

// Green Emerald — two-step (draw 2, keep best of 3, return 2 to the bottom in draw order).
// retainedOverride set when forged via Counterfeit (discard + topPlay already recorded by caller).
function flwHostStartEmerald(active, retainedOverride) {
  let retained;
  if (retainedOverride != null) {
    retained = retainedOverride;                  // counterfeit path: hand/draw/discard already set
  } else {
    const hand = [flwHands[active], flwDrawnCard];
    retained = (hand[0] === 6) ? hand[1] : hand[0];
    flwDiscards[active].push(6);
    flwSetTopPlay(active, 6, 6, false);
    flwDrawnCard = null;
  }
  const d1 = flwDrawForRedraw(), d2 = flwDrawForRedraw();
  const offer = [retained, d1, d2].filter(x => x != null);
  flwEmeraldOffer = { active, cards: offer };
  flwPublicVaultCount = flwDeck.length;
  flwPublicLog.push({ text: flwName(active) + ' delves the Deep Vault…' });
  const auid = mpPlayerSlots[active] && mpPlayerSlots[active].uid;
  if (window.syllyMultiplayerMode === 'single' || auid === window.syllyDeviceUid) flwShowEmerald(offer);
  else if (auid) mpSendPrivate(auid, { type: 'SYNC', payload: { action: 'FLW_EMERALD_OFFER', cards: offer } });
  flwLedgerCounts = flwLedgerTally();
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FLW_RESOLVE', exposed: flwExposed, underGlass: flwUnderGlass,
      discardCounts: flwDiscards.map(d => d.length), ledger: flwLedgerCounts, log: flwPublicLog, vaultCount: flwDeck.length, actor: active, topClaims: flwTopPlayClaims(),
    }});
  }
  flwRenderTable();
}

// Audit — authenticate an opponent's most-recent play. Free utility action; does not end the turn.
function flwHostAudit(auditor, targetIdx) {
  if (!flwSyllyMode || auditor !== flwActivePlayer || flwShowingOver) return;
  if (flwAuditedThisTurn || (flwAuditCharges[auditor] || 0) <= 0 || targetIdx === auditor) return;
  const tp = flwTopPlay[targetIdx];
  if (!tp || tp.audited) return;
  flwAuditCharges[auditor]--; flwAuditedThisTurn = true; tp.audited = true;
  let caught = false;
  if (tp.counterfeit) {
    caught = true;
    flwExpose(targetIdx);
    const d = flwDiscards[targetIdx];
    for (let k = d.length - 1; k >= 0; k--) { if (d[k] === tp.claimedId) { d[k] = tp.realId; break; } } // scrub Ledger
    flwPublicLog.push({ text: flwName(auditor) + ' audited ' + flwName(targetIdx) + ' — FORGERY! ' + flwName(targetIdx) + ' is Exposed.' });
  } else {
    flwPublicLog.push({ text: flwName(auditor) + ' audited ' + flwName(targetIdx) + ' — genuine. ' + flwName(targetIdx) + ' glimpses the auditor’s hand.' });
    const tuid = mpPlayerSlots[targetIdx] && mpPlayerSlots[targetIdx].uid;
    if (window.syllyMultiplayerMode === 'single' || tuid === window.syllyDeviceUid) flwShowPeek(auditor, flwHands[auditor]);
    else if (tuid) mpSendPrivate(tuid, { type: 'SYNC', payload: { action: 'FLW_LEAK', gemId: flwHands[auditor], fromIdx: auditor } });
  }
  flwLedgerCounts = flwLedgerTally();
  if (flwAliveCount() <= 1) { flwEndShowing('laststanding'); return; } // an audit can end the Showing
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FLW_AUDIT_RESULT', auditor, targetIdx, caught,
      exposed: flwExposed, ledger: flwLedgerCounts, log: flwPublicLog,
      auditCharges: flwAuditCharges, vaultCount: flwDeck.length, topClaims: flwTopPlayClaims(),
    }});
  }
  flwRenderTable();
}
function flwHostResolveEmerald(active, keepId, returnOrder) {
  if (!flwEmeraldOffer || flwEmeraldOffer.active !== active) return;
  const offer = flwEmeraldOffer.cards.slice();
  if (!offer.includes(keepId)) return;
  flwHands[active] = keepId;
  (returnOrder || []).forEach(g => flwDeck.push(g)); // to the bottom, draw order preserved
  flwEmeraldOffer = null;
  flwPublicVaultCount = flwDeck.length;
  flwPublicLog.push({ text: flwName(active) + ' kept one gem from the Deep Vault.' });
  if (flwAliveCount() <= 1) { flwEndShowing('laststanding'); return; }
  flwBroadcastResolve(new Set([active]));
  flwActivePlayer = flwNextActive(active);
  flwBeginTurn();
}

function flwBroadcastResolve(changed) {
  flwLedgerCounts = flwLedgerTally();
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'FLW_RESOLVE', exposed: flwExposed, underGlass: flwUnderGlass,
      discardCounts: flwDiscards.map(d => d.length), ledger: flwLedgerCounts, log: flwPublicLog,
      vaultCount: flwDeck.length, actor: flwActivePlayer, topClaims: flwTopPlayClaims(),
    }});
    changed.forEach(idx => { if (!flwExposed[idx]) flwSendHandTo(idx); });
  }
  flwRenderTable();
}
function flwSendHandTo(idx) {
  const uid = mpPlayerSlots[idx] && mpPlayerSlots[idx].uid;
  if (!uid) return;
  if (uid === window.syllyDeviceUid) { flwMyHand = flwHands[idx]; return; }
  mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'FLW_HAND', gemId: flwHands[idx] } });
}

// ── Peek Guard (Amethyst result, looker only) ──────────────────────────────
function flwShowPeek(targetIdx, gemId) {
  flwPeekGemId = gemId;
  const sub = document.getElementById('flw-peek-sub');
  if (sub) sub.textContent = flwName(targetIdx) + "'s Showpiece — press and hold.";
  const hold = document.getElementById('flw-peek-hold');
  if (hold) hold.textContent = 'Hold to reveal';
  const ov = document.getElementById('flw-peek-overlay'); if (ov) ov.style.display = 'flex';
}

// ── Green Emerald overlay (active device) ──────────────────────────────────
function flwShowEmerald(cards) {
  flwEmeraldCards = cards.slice(); flwEmeraldKeep = null;
  const wrap = document.getElementById('flw-emerald-keep');
  if (wrap) {
    wrap.innerHTML = '';
    flwEmeraldCards.forEach((gemId, i) => {
      const card = flwRenderCard(gemId, { size: 'lg', selectable: true });
      flwBindCardHold(card, gemId);
      card.addEventListener('click', () => { flwEmeraldKeep = i; flwRenderEmeraldSel(); });
      wrap.appendChild(card);
    });
  }
  flwRenderEmeraldSel();
  const ov = document.getElementById('flw-emerald-overlay'); if (ov) ov.style.display = 'flex';
}
function flwRenderEmeraldSel() {
  const wrap = document.getElementById('flw-emerald-keep');
  if (wrap) Array.from(wrap.children).forEach((c, i) => { c.classList.toggle('flw-card-sel', i === flwEmeraldKeep); });
  const c = document.getElementById('btn-flw-emerald-confirm');
  if (c) c.disabled = (flwEmeraldKeep == null);
}
function flwSubmitEmerald() {
  if (flwEmeraldKeep == null) return;
  const keepId = flwEmeraldCards[flwEmeraldKeep];
  const returnOrder = flwEmeraldCards.filter((_, i) => i !== flwEmeraldKeep);
  const ov = document.getElementById('flw-emerald-overlay'); if (ov) ov.style.display = 'none';
  playWhoosh();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'FLW_EMERALD_RESOLVE', keepId, returnOrder } });
  } else {
    flwHostResolveEmerald(flwMyIdx(), keepId, returnOrder);
  }
}

// ── Showing end / scoring / result / gameover ──────────────────────────────
function flwEndShowing(reason) {
  flwShowingOver = true;
  const survivors = [];
  for (let i = 0; i < flwPlayerCount; i++) if (!flwExposed[i]) survivors.push(i);
  let winners = [];
  if (reason === 'laststanding') {
    winners = survivors.slice(0, 1);
  } else { // vaultlock
    let best = -1; survivors.forEach(i => { if (flwHands[i] > best) best = flwHands[i]; });
    let top = survivors.filter(i => flwHands[i] === best);
    if (top.length > 1) {
      let bestSum = -1; top.forEach(i => { const s = flwTieSum(i); if (s > bestSum) bestSum = s; });
      winners = top.filter(i => flwTieSum(i) === bestSum); // still tied → co-winners (Q4)
    } else winners = top;
  }
  // Both end reasons — laststanding is a single entry (the last Collector's own
  // gem), but that is still worth showing rather than skipping the reveal.
  const reveal = survivors.map(i => ({ idx: i, gemId: flwHands[i] }));
  winners.forEach(i => flwTokens[i] = (flwTokens[i] || 0) + 1);
  // Raw Obsidian bonus — sole surviving Obsidian-player
  const obs = survivors.filter(i => flwPlayedObsidian[i]);
  let obsidianBonus = -1;
  if (obs.length === 1) { flwTokens[obs[0]] += 1; obsidianBonus = obs[0]; }
  const resultText = (reason === 'laststanding')
    ? (flwName(winners[0]) + ' is the last one standing!')
    : (winners.length === 1 ? (flwName(winners[0]) + ' wins the Vault Lock!')
                            : ('Tied Vault Lock — ' + winners.map(flwName).join(' & ') + ' share it.'));
  const target = flwTargetTokens();
  const maxTok = Math.max.apply(null, flwTokens);
  const gameOver = maxTok >= target;
  const gameWinner = gameOver ? flwTokens.indexOf(maxTok) : -1;
  flwLedgerCounts = flwLedgerTally();
  const payload = { reason, winners, reveal, tokens: flwTokens, obsidianBonus, resultText,
                    exposed: flwExposed, log: flwPublicLog, ledger: flwLedgerCounts, target, gameOver, gameWinner };
  if (window.syllyMultiplayerMode !== 'single') mpSendEnvelope({ type: 'SYNC', payload: Object.assign({ action: 'FLW_SHOWING_END' }, payload) });
  flwApplyShowingEnd(payload);
}
function flwApplyShowingEnd(d) {
  flwShowingOver = true;
  flwLastResult = d;
  flwClearTimer();
  playSuccess();
  if (d.gameOver) flwShowGameover(); else flwShowShowingResult();
}
// The final Showpieces as actual gem cards — shared between the Showing-result
// screen and the gameover screen, so a match-ending Vault Lock still shows them
// on whichever screen the player actually lands on. Reads `reveal || []`
// defensively per the erasure rule even though flwEndShowing now always sends
// a non-empty array for both end reasons.
function flwBuildReveal(reveal) {
  const list = reveal || [];
  if (!list.length) return [];
  const lbl = document.createElement('p');
  lbl.className = 'text-[0.6rem] font-semibold uppercase tracking-wide text-stone-400 mt-1';
  lbl.textContent = 'Final Showpieces';
  const cardRow = document.createElement('div');
  cardRow.className = 'flex flex-wrap gap-3 justify-center';
  list.forEach(r => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col items-center gap-1';
    const card = flwRenderCard(r.gemId, { size: 'md' });
    flwBindCardHold(card, r.gemId);
    wrap.appendChild(card);
    const nm = document.createElement('p');
    nm.className = 'text-xs font-semibold text-stone-500'; nm.textContent = flwName(r.idx);
    wrap.appendChild(nm);
    cardRow.appendChild(wrap);
  });
  return [lbl, cardRow];
}
function flwShowShowingResult() {
  showScreen('screen-flw-showing-result');
  const body = document.getElementById('flw-showing-result-body');
  const numEl = document.getElementById('flw-showing-result-num');
  const d = flwLastResult || {};
  if (numEl) numEl.textContent = 'Showing ' + (flwShowingNum || 1);
  if (!body) return;
  body.innerHTML = '';

  // Result heading
  const emoji = document.createElement('p');
  emoji.className = 'text-2xl'; emoji.textContent = '💎';
  body.appendChild(emoji);
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-stone-800'; title.textContent = d.resultText || '';
  body.appendChild(title);

  // Survivors' final Showpieces as actual gem cards
  flwBuildReveal(d.reveal).forEach(n => body.appendChild(n));

  // Obsidian bonus
  if (d.obsidianBonus >= 0) {
    const ob = document.createElement('p');
    ob.className = 'text-sm text-stone-500';
    ob.textContent = flwName(d.obsidianBonus) + ' earns the Raw Obsidian bonus 💎';
    body.appendChild(ob);
  }

  // Diamond tally
  const tokWrap = document.createElement('div');
  tokWrap.className = 'flex flex-col gap-1 w-full bg-white rounded-2xl px-3 py-2 shadow-sm mt-1';
  (flwTokens || []).forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'flex justify-between text-sm';
    const nm = document.createElement('span'); nm.textContent = flwName(i);
    const dots = document.createElement('span'); dots.textContent = '💎'.repeat(t) || '·';
    row.append(nm, dots);
    tokWrap.appendChild(row);
  });
  body.appendChild(tokWrap);

  // That Showing's full action log
  if (d.log && d.log.length) {
    const logLbl = document.createElement('p');
    logLbl.className = 'text-[0.6rem] font-semibold uppercase tracking-wide text-stone-400 mt-1';
    logLbl.textContent = 'The Showroom Journal';
    body.appendChild(logLbl);
    const logWrap = document.createElement('div');
    logWrap.className = 'bg-stone-100 rounded-2xl p-3 w-full text-xs text-stone-500 flex flex-col gap-1 text-left max-h-36 overflow-y-auto';
    d.log.forEach(entry => {
      const p = document.createElement('p'); p.textContent = entry.text || ''; logWrap.appendChild(p);
    });
    body.appendChild(logWrap);
  }

  // Next Showing button visibility (host/single only)
  const btn = document.getElementById('btn-flw-next-showing');
  if (btn) {
    const host = (window.syllyMultiplayerMode === 'host' || window.syllyMultiplayerMode === 'single');
    btn.style.display = host ? '' : 'none';
    btn.textContent = 'Next Showing';
  }
}
function flwShowGameover() {
  showScreen('screen-flw-gameover');
  const body = document.getElementById('flw-gameover-body');
  const d = flwLastResult || {};
  if (!body) return;
  body.innerHTML = '';

  // The Vault Lock that ends the match is still worth seeing — same reveal the
  // Showing-result screen shows, above the medal table.
  flwBuildReveal(d.reveal).forEach(n => body.appendChild(n));

  let html = '';
  if (d.gameWinner >= 0) html += '<p class="text-center text-lg font-bold text-stone-800 mb-1">' + flwName(d.gameWinner) + ' is Best in Show! 🏆</p>';
  const order = (flwTokens || []).map((t, i) => ({ i, t })).sort((a, b) => b.t - a.t);
  html += '<div class="flex flex-col gap-1.5">';
  order.forEach((o, r) => {
    // DD-30 pattern (ui-style.md § Gameover podium rank icons) — a fixed-width
    // leading slot on every row, blank past 3rd, so unmedalled rows' text still
    // starts at the same x position as medalled ones.
    const medal = r === 0 ? '\u{1F947}' : r === 1 ? '\u{1F948}' : r === 2 ? '\u{1F949}' : '';
    html += '<div class="flex justify-between bg-white rounded-xl px-3 py-2 shadow-sm text-sm">'
          + '<span class="flex items-center gap-1"><span class="flw-medal-slot">' + medal + '</span>' + flwName(o.i) + '</span>'
          + '<span>' + ('\u{1F48E}'.repeat(o.t) || '0') + '</span></div>';
  });
  html += '</div>';
  const podium = document.createElement('div');
  podium.innerHTML = html;
  body.appendChild(podium);
}
function flwHostNextShowing() {
  if (window.syllyMultiplayerMode === 'client') return;
  flwDealShowing();
}

// ── Appraisal Clock (wall-clock anchor — GTH pattern) ──────────────────────
function flwClearTimer() {
  if (flwTimerHandle) { clearInterval(flwTimerHandle); flwTimerHandle = null; }
  flwLastTickSec = -1;
  flwUpdateTimerDisplay(null);
}
function flwStartTurnTimer(endTs) {
  flwClearTimer();
  if (!endTs || !flwTurnTimer) return;
  flwTurnEndTs = endTs;
  flwTimerHandle = setInterval(flwTimerTick, 250);
  flwTimerTick();
}
function flwTimerTick() {
  const remMs = flwTurnEndTs - Date.now();
  const rem = Math.max(0, Math.ceil(remMs / 1000));
  flwUpdateTimerDisplay(rem);
  if (rem !== flwLastTickSec) { flwLastTickSec = rem; if (rem <= 5 && rem > 0) playTick(); }
  if (remMs <= 0) {
    flwClearTimer();
    const me = flwMyIdx();
    if (flwActivePlayer === me && !flwExposed[me] && flwMyDrawn != null && !flwShowingOver) flwTimerExpire();
  }
}
function flwUpdateTimerDisplay(rem) {
  const el = document.getElementById('flw-timer');
  if (!el) return;
  if (rem == null) { el.textContent = ''; return; }
  const m = Math.floor(rem / 60), s = rem % 60;
  el.textContent = '\u{23F1} ' + m + ':' + String(s).padStart(2, '0');
  el.className = 'text-sm font-bold ' + (rem <= 5 ? 'text-red-500' : 'text-stone-500');
}
// Timer expiry — auto-play the DRAWN gem at a random legal target (Q5); respect the Ruby lock.
function flwTimerExpire() {
  const me = flwMyIdx();
  if (flwActivePlayer !== me || flwMyDrawn == null) return;
  playAlarm();
  const forced = flwRubyForcedSlot();
  const gemId = forced ? (forced === 'hand' ? flwMyHand : flwMyDrawn) : flwMyDrawn;
  flwSelSlot = null;
  if (gemId === 6) { flwSubmitPlay(6, -1, null); return; } // Emerald — offer follows (see note)
  if (flwIsTargeted(gemId)) {
    const legal = flwLegalTargets(gemId, me);
    if (legal.length === 0) { flwSubmitPlay(gemId, -1, null); return; }
    const t = legal[Math.floor(Math.random() * legal.length)];
    if (gemId === 1) { const gs = [9, 8, 7, 6, 5, 4, 3, 2, 0]; flwSubmitPlay(1, t, gs[Math.floor(Math.random() * gs.length)]); }
    else flwSubmitPlay(gemId, t, null);
    return;
  }
  flwSubmitPlay(gemId, -1, null);
}

// ── Multiplayer envelope dispatch (§11) ────────────────────────────────────
function flwHandleEnvelope(env) {
  try {
    const a = env.payload && env.payload.action;
    if (!a) return;

    // Host receives client ACTIONs
    if (window.syllyMultiplayerMode === 'host') {
      if (a === 'FLW_PLAYER_LEFT') {
        mpSendEnvelope({ type: 'SYNC', payload: { action: 'FLW_MATCH_DISSOLVED' } }); // PASS contract
        resetToLobby(); return;
      }
      if (a === 'FLW_PLAY') {
        const auid = mpPlayerSlots[flwActivePlayer] && mpPlayerSlots[flwActivePlayer].uid;
        if (env.originId !== auid) return; // only the active player may play
        flwHostEntryPlay(flwActivePlayer, env.payload);
        return;
      }
      if (a === 'FLW_AUDIT') {
        const auid = mpPlayerSlots[flwActivePlayer] && mpPlayerSlots[flwActivePlayer].uid;
        if (env.originId !== auid) return; // only the active player audits
        flwHostAudit(flwActivePlayer, env.payload.targetIdx);
        return;
      }
      if (a === 'FLW_EMERALD_RESOLVE') {
        const auid = mpPlayerSlots[flwActivePlayer] && mpPlayerSlots[flwActivePlayer].uid;
        if (env.originId !== auid) return;
        flwHostResolveEmerald(flwActivePlayer, env.payload.keepId, env.payload.returnOrder);
        return;
      }
    }

    // All devices apply host SYNC / private writes (the host's own are filtered by the dedup guard)
    switch (a) {
      case 'FLW_SHOWING_START': {
        const p = env.payload;
        flwPlayerNames      = p.playerNames || flwPlayerNames;
        flwPlayerCount      = p.playerCount || flwPlayerCount;
        flwActivePlayer     = p.activePlayer;
        flwPublicVaultCount = p.vaultCount;
        flwExposed          = p.exposed || [];
        flwUnderGlass       = p.underGlass || [];
        flwTokens           = p.tokens || [];
        flwLedgerCounts     = p.ledger || [];
        flwTopClaims        = p.topClaims || [];
        flwAuditCharges     = p.auditCharges || [];
        flwCounterfeitHeld  = Array(flwPlayerCount).fill(true);
        flwPublicLog        = p.log || [];
        flwShowingNum       = p.showingNum || flwShowingNum;
        flwShowingOver      = false; flwSelSlot = null; flwMyDrawn = null;
        flwAuditedThisTurn  = false; flwCfMode = false; flwCfKeep = null; flwCfClaimed = -1;
        flwClearTimer();
        flwShowTable();
        break;
      }
      case 'FLW_HAND':
        flwMyHand = env.payload.gemId;
        if (flwOnTable()) flwRenderTable();
        break;
      case 'FLW_TURN_START': {
        flwActivePlayer     = env.payload.activePlayer;
        flwPublicVaultCount = env.payload.vaultCount;
        if (env.payload.underGlass) flwUnderGlass = env.payload.underGlass;
        if (env.payload.topClaims)  flwTopClaims  = env.payload.topClaims;
        flwSelSlot = null; flwAuditedThisTurn = false; flwCfMode = false; flwCfKeep = null; flwCfClaimed = -1;
        if (flwActivePlayer !== flwMyIdx()) flwMyDrawn = null; // not my turn — no drawn gem shown
        if (flwOnTable()) flwRenderTable(); else flwShowTable();
        flwStartTurnTimer(env.payload.turnEndTs);
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      }
      case 'FLW_DRAW':
        flwMyDrawn = env.payload.gemId;
        if (flwOnTable()) flwRenderTable();
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      case 'FLW_RESOLVE': {
        const p = env.payload;
        flwExposed          = p.exposed   || flwExposed;
        flwUnderGlass       = p.underGlass || flwUnderGlass;
        flwPublicLog        = p.log        || flwPublicLog;
        flwLedgerCounts     = p.ledger     || flwLedgerCounts;
        flwTopClaims        = p.topClaims  || flwTopClaims;
        flwPublicVaultCount = p.vaultCount;
        if (flwMyIdx() === p.actor) flwMyDrawn = null; // I just played
        flwClearTimer(); // turn resolved; the next FLW_TURN_START restarts the clock
        if (flwOnTable()) flwRenderTable();
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      }
      case 'FLW_PEEK':
        flwShowPeek(env.payload.targetIdx, env.payload.gemId);
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      case 'FLW_LEAK': // failed audit — the accused privately glimpses the auditor's Showpiece
        flwShowPeek(env.payload.fromIdx, env.payload.gemId);
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      case 'FLW_AUDIT_RESULT': {
        const p = env.payload;
        flwExposed          = p.exposed      || flwExposed;
        flwLedgerCounts     = p.ledger       || flwLedgerCounts;
        flwPublicLog        = p.log          || flwPublicLog;
        flwAuditCharges     = p.auditCharges || flwAuditCharges;
        flwTopClaims        = p.topClaims    || flwTopClaims;
        if (p.vaultCount != null) flwPublicVaultCount = p.vaultCount;
        if (flwOnTable()) flwRenderTable();
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      }
      case 'FLW_EMERALD_OFFER':
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        flwShowEmerald(env.payload.cards || []);
        break;
      case 'FLW_SHOWING_END': {
        const p = env.payload;
        flwTokens       = p.tokens   || flwTokens;
        flwExposed      = p.exposed  || flwExposed;
        flwPublicLog    = p.log      || flwPublicLog;
        flwLedgerCounts = p.ledger   || flwLedgerCounts;
        flwApplyShowingEnd(p);
        if (typeof mpUnlockSync === 'function') mpUnlockSync();
        break;
      }
      case 'FLW_MATCH_DISSOLVED':
        resetToLobby();
        break;
    }
  } catch (e) {
    console.error('[FLW] handler error', e);
  }
}
function flwOpenSettings()      { const el = document.getElementById('flw-settings-overlay'); if (el) { const inner = el.querySelector('.overlay-data-inner'); if (inner) inner.scrollTop = 0; el.style.display = 'flex'; } }
// highlightId set → force the Gems tab regardless of what was passed, and skip the
// scroll-to-top reset (refHighlightRow inside flwRenderGems owns the scroll instead).
function flwOpenHowTo(tab, highlightId) {
  flwSetHowToTab(highlightId != null ? 'gems' : (tab || 'rules'), highlightId);
  const el = document.getElementById('flw-how-to-overlay');
  if (el) {
    const inner = el.querySelector('.overlay-data-inner');
    if (inner && highlightId == null) inner.scrollTop = 0;
    el.style.display = 'flex';
  }
}
function flwApplyExpansionOverrides() { /* no-op stub — no word pool (forward-compat consistency) */ }

// ── Settings helpers ───────────────────────────────────────────────────────
function flwSyncToggle(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  b.textContent = on ? 'ON' : 'OFF';
  b.className = (on ? 'game-toggle-on-flw' : 'game-toggle-off') + ' shrink-0';
}
function flwBindPills(attr, fn) {
  document.querySelectorAll('[' + attr + ']').forEach(p => p.addEventListener('click', () => {
    playPillClick();
    document.querySelectorAll('[' + attr + ']').forEach(x => x.classList.remove('pill-active-flw'));
    p.classList.add('pill-active-flw');
    fn(p.getAttribute(attr));
  }));
}

// ── Teardown (called from engine.js resetToLobby) ──────────────────────────
function flwResetState() {
  if (flwTimerHandle) { clearInterval(flwTimerHandle); flwTimerHandle = null; }
  flwTurnEndTs = 0; flwLastTickSec = -1;
  flwPlayerCount = 0; flwPlayerNames = [];
  flwTokens = []; flwShowingNum = 0;
  flwDeck = []; flwLockedLot = []; flwHands = [];
  flwExposed = []; flwUnderGlass = []; flwDiscards = [];
  flwPlayedObsidian = []; flwPublicLog = [];
  flwActivePlayer = 0; flwShowingOver = false;
  flwDrawnCard = null; flwEmeraldOffer = null;
  flwCounterfeitHeld = []; flwAuditCharges = []; flwTopPlay = []; flwTopClaims = []; flwAuditedThisTurn = false;
  flwCfMode = false; flwCfKeep = null; flwCfClaimed = -1;
  flwMyHand = null; flwMyDrawn = null; flwPublicVaultCount = 0; flwLedgerCounts = [];
  flwSelSlot = null; flwLastResult = null; flwEmeraldCards = []; flwEmeraldKeep = null;
  flwPeekGemId = null; flwScratchTarget = -1; flwScratchGuess = -1;
  // Settings (Ledger / token mode+target / timer / Smoke&Mirrors burn / Sylly) intentionally preserved.
}

// ═══════════════════════════════════════════════════════════════════════════
// Event wiring (DOMContentLoaded — flw.js loads BEFORE its screen markup).
// The `on` helper guards missing elements, so wiring to not-yet-built buttons
// (lobby #btn-flw, screens added in Step 4) is harmless during scaffold.
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Lobby entry → game menu
  on('btn-flw', () => { playLaunch(); activeGameId = 'flw'; showScreen('screen-flw-menu'); });

  // Game menu — Play CTA dual context (pre-lobby vs post-lobby); GTH reference
  on('btn-flw-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') flwStartSession(); // post-lobby (host)
    else mpShowModeScreen('flw');                                    // pre-lobby
  });
  on('btn-flw-menu-how-to',   () => flwOpenHowTo());
  on('btn-flw-menu-settings', () => flwOpenSettings());
  on('btn-flw-menu-back',     () => { playExit(); resetToLobby(); });

  // In-game header [?] → How to Play; Gem Manifest button near Ledger
  on('btn-flw-how-to',      () => flwOpenHowTo());
  on('btn-flw-gem-manifest', () => { playPillClick(); flwOpenGemManifest(); });
  on('btn-flw-howto-close-gems', () => { playDone(); const el = document.getElementById('flw-how-to-overlay'); if (el) el.style.display = 'none'; });
  document.querySelectorAll('[data-flw-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); flwSetHowToTab(b.dataset.flwHowtoTab); });
  });

  // Settings — toggles + pill groups
  flwSyncToggle('btn-flw-ledger-toggle', flwLedgerOn);
  flwSyncToggle('btn-flw-sylly-toggle', flwSyllyMode);
  on('btn-flw-ledger-toggle', () => { flwLedgerOn = !flwLedgerOn; playPillClick(); flwSyncToggle('btn-flw-ledger-toggle', flwLedgerOn); });
  on('btn-flw-sylly-toggle',  () => { flwSyllyMode = !flwSyllyMode; flwSyllyMode ? playSyllyOn() : playSyllyOff(); flwSyncToggle('btn-flw-sylly-toggle', flwSyllyMode); });
  flwBindPills('data-flw-tokmode', v => { flwTokenMode = v; const row = document.getElementById('flw-custom-target-row'); if (row) row.style.display = (v === 'custom') ? 'flex' : 'none'; });
  flwBindPills('data-flw-target', v => { flwCustomTarget = parseInt(v, 10); });
  flwBindPills('data-flw-burn',   v => { flwBurnSetting  = parseInt(v, 10); });
  flwBindPills('data-flw-timer',  v => { flwTurnTimer    = parseInt(v, 10); });

  // Overlay closers
  on('btn-flw-settings-done', () => { playDone(); const el = document.getElementById('flw-settings-overlay'); if (el) el.style.display = 'none'; });
  on('btn-flw-howto-close',   () => { playDone(); const el = document.getElementById('flw-how-to-overlay');   if (el) el.style.display = 'none'; });

  // Quit (mid-game ✕ → quit overlay → resetToLobby per PASS contract)
  document.querySelectorAll('.btn-flw-quit-open').forEach(b =>
    b.addEventListener('click', () => { const el = document.getElementById('flw-quit-overlay'); if (el) el.style.display = 'flex'; }));
  on('btn-flw-quit-cancel',  () => { playDone(); const el = document.getElementById('flw-quit-overlay'); if (el) el.style.display = 'none'; });
  on('btn-flw-quit-confirm', () => {
    playExit();
    flwClearTimer();
    const el = document.getElementById('flw-quit-overlay'); if (el) el.style.display = 'none';
    if (window.syllyMultiplayerMode === 'client' && typeof mpSendEnvelope === 'function') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'FLW_PLAYER_LEFT' } }); // PASS contract — host dissolves the match
    }
    if (window.syllyMultiplayerMode !== 'single') { resetToLobby(); return; } // host teardown broadcasts HOST_END_GAME
    showScreen('screen-flw-menu'); // single-device dev path
  });

  // Gameover — post-game ✕ → lobby; play-again → confirm overlay
  on('btn-flw-gameover-exit', () => { playExit(); resetToLobby(); });
  on('btn-flw-go-again',      () => { const el = document.getElementById('flw-new-showing-overlay'); if (el) el.style.display = 'flex'; });
  on('btn-flw-new-cancel',    () => { playDone(); const el = document.getElementById('flw-new-showing-overlay'); if (el) el.style.display = 'none'; });
  on('btn-flw-new-confirm',   () => {
    playLaunch();
    const el = document.getElementById('flw-new-showing-overlay'); if (el) el.style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; } // §11 play-again return
    flwStartSession(); // single-device dev path
  });

  // ── Gameplay: place a gem ──────────────────────────────────────────────
  on('btn-flw-action', () => {
    const me = flwMyIdx();
    if (flwActivePlayer !== me || flwExposed[me] || flwMyDrawn == null || flwShowingOver) return;
    if (flwCfMode) { if (flwCfKeep != null) flwBeginCounterfeitPlay(); return; }
    if (!flwSelSlot) return;
    flwBeginPlay(flwSelSlot === 'hand' ? flwMyHand : flwMyDrawn);
  });
  on('btn-flw-next-showing', () => { if (window.syllyMultiplayerMode === 'client') return; playLaunch(); flwHostNextShowing(); });

  // The Counterfeit Run (Sylly)
  on('btn-flw-audit', () => flwOpenAudit());
  on('btn-flw-cf-cancel', () => { playDone(); const el = document.getElementById('flw-cf-overlay'); if (el) el.style.display = 'none'; flwCancelCounterfeit(); });

  // Target overlay
  on('btn-flw-target-cancel', () => { playDone(); const el = document.getElementById('flw-target-overlay'); if (el) el.style.display = 'none'; });

  // Scratch-Test overlay
  on('btn-flw-scratch-cancel', () => { playDone(); const el = document.getElementById('flw-scratch-overlay'); if (el) el.style.display = 'none'; });
  on('btn-flw-scratch-confirm', () => {
    if (flwScratchTarget < 0 || flwScratchGuess < 0) return;
    const el = document.getElementById('flw-scratch-overlay'); if (el) el.style.display = 'none';
    playWhoosh();
    if (flwCfMode) flwSubmitCounterfeit(1, flwCfKeep, flwScratchTarget, flwScratchGuess);
    else flwSubmitPlay(1, flwScratchTarget, flwScratchGuess);
  });

  // Private Appraisal overlay (informational — outcome also appears in the log)
  on('btn-flw-appraisal-close', () => { playDone(); const el = document.getElementById('flw-appraisal-overlay'); if (el) el.style.display = 'none'; });

  // Deep Vault (Emerald) overlay
  on('btn-flw-emerald-confirm', () => flwSubmitEmerald());

  // Loupe (Peek Guard) overlay — press-and-hold reveal, re-blur on release
  on('btn-flw-peek-close', () => { playDone(); const el = document.getElementById('flw-peek-overlay'); if (el) el.style.display = 'none'; });
  const peekHold = document.getElementById('flw-peek-hold');
  if (peekHold) {
    const reveal = () => { peekHold.innerHTML = ''; if (flwPeekGemId != null) peekHold.appendChild(flwRenderCard(flwPeekGemId, { size: 'lg' })); };
    const reblur = () => { peekHold.innerHTML = 'Hold to reveal'; };
    peekHold.addEventListener('contextmenu', e => e.preventDefault());
    peekHold.addEventListener('pointerdown', e => { e.preventDefault(); reveal(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => peekHold.addEventListener(ev, reblur));
    // Bound to the container, not the ephemeral revealed card: reveal() already
    // consumed this press's pointerdown, so a card built mid-gesture never sees
    // its own fresh touchstart/mousedown — bindCardHold on peekHold itself lets
    // the SAME continued press (already showing the gem) also open the gallery.
    bindCardHold(peekHold, () => { if (flwPeekGemId != null) flwOpenHowTo('gems', flwPeekGemId); });
  }

  // ── Sound buttons (engine.js querySelectorAll runs before FLW markup is parsed) ──
  document.querySelectorAll('#screen-flw-menu .btn-open-sound, #screen-flw-table .btn-open-sound, #screen-flw-showing-result .btn-open-sound, #screen-flw-gameover .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});
