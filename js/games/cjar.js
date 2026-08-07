// ═══════════════════════════════════════════════════════════════════════════
// Cookie Jar (cjar) — simultaneous-choice push-your-luck card game. Everyone
// decides at once: keep raiding the jar for a bigger share, or Sneak Out and
// bank what you've got before someone's Mum catches you twice. MDLM-only, 3–8
// players, host-authoritative, host-as-participant.
// Sylly Mode = Dibber Dobber — three actions, no bust, nobody ever leaves.
// Spec: docs/new-game-tech-cookie-jar.md  (Stage 2 confirmed 2 Aug 2026)
// Depends on: engine.js (showScreen, play*, shuffle, resetToLobby, activeGameId,
//             openSoundOverlay), engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots,
//             mpSendEnvelope, mpSendPrivate, mpReturnToLobby, mpLockSync, mpUnlockSync,
//             window.syllyMultiplayerMode, mpMyPlayerIdx), art.js (assetFace/assetBack)
// SCAFFOLD STAGE (Protocol B Step 2): state + named stubs. Logic injected per spec §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────────────────────
// DECISION and REVEAL are deliberately SEPARATE dials (spec §16 Q1): one is a
// deciding budget, the other a reading budget. Unlike PKO's two 5 s constants
// they are not held equal, and tuning one must not touch the other.
// The decision window is a SETTING (Decision Time), not a constant — playtest round 1
// found 15 s too short. `norush` is a genuine no-timer mode for kids and slow tables:
// the flip resolves the moment everyone has tapped and nothing auto-resolves, which is
// safe precisely because cjarAllIn() already gates on real submissions.
const CJAR_DECISION_TIMES   = { blitz: 10000, standard: 20000, norush: null };
const CJAR_TIMEOUT_GRACE_MS = 1500;  // host waits this long past endTimestamp for in-flight ACTIONs
const CJAR_REVEAL_MS        = 3000;  // reveal dwell before the next flip starts
const CJAR_INTERSTITIAL_MS  = 5000;  // raid-intro + BUSTED! auto-advance (PKO round-4 value; the
                                     // documented practical ceiling for a chrome-exempt screen)
const CJAR_DD_CUT           = 10;    // Sylly: cards cut from the 30-card pool, BEFORE the Treat
const CJAR_DD_START_STASH   = 5;     // Sylly: granted ONCE per match, never per Raid
const CJAR_DD_DOB_STEAL     = 2;     // per Dobber, capped at card value
const CJAR_DD_DOB_BACKFIRE  = 2;     // flat
const CJAR_DD_TAKE_LOSS     = { favourite: 0, neutral: 2, watcher: 4 };
const CJAR_DD_DEBT_CAP      = 6;

// A moment's identity and its voice live side by side so they cannot drift apart
// (PKO_EVENT_SOUND precedent). Zero new synthesised functions — spec §9.
const CJAR_SOUND = {
  cookie:       'playWhoosh',      // a flip, not an event
  caughtFirst:  'playHullThud',    // the "uh oh" scare
  busted:       'playAbyssThud',   // escalated version of the same hit
  reveal:       'playDone',        // choices settling into their resolved state
  soloSneak:    'playUnchallenged',// the sole survivor scoops the pot
  treatSpecial: 'playSuccess',
  treatSuper:   'playClashWin',    // purpose-built "bigger version of a success"
  raidLost:     'playBoing',       // comedic loss, not harsh
  highAlert:    'playAlarm',
  tick:         'playTick',
  dobBackfire:  'playPoacher',     // out-of-ecosystem — the accusation boomerangs
  matchEnd:     'playClashWin',
};

// ── Settings (persist between play-agains) ─────────────────────────────────
let cjarSnackFriendly = 'safe';  // 'off' | 'safe' | 'warmup'
let cjarHouseRules    = 'burn';  // 'burn' | 'on-guard' | 'high-alert'
let cjarMatchLength   = 5;       // 3 | 5
let cjarDecisionTime  = 'standard'; // 'blitz' | 'standard' | 'norush'
let cjarOpenBook      = true;
let cjarSyllyMode     = false;   // Dibber Dobber — always last in the settings overlay

// ── Roster (from mpPlayerSlots — no setup screen, MDLM only; spec §17 D-01) ─
let cjarPlayerCount = 0;
let cjarPlayerNames = [];        // from mpPlayerSlots[i].nickname — never .name

// ── Match state (reset each play-again) ────────────────────────────────────
let cjarRaidNo        = 0;       // 1-based
let cjarStashes       = [];      // banked score per player (Sylly: THE running total)
let cjarTreatsWon     = [];      // first tie-break
let cjarRaidHistory   = [];      // [raidIdx][playerIdx] = banked that Raid
let cjarFamilyCopies  = {};      // { mum:3, ... } — House Rules mutates across the match
let cjarTreatsLive    = [];      // treat ids not yet permanently discarded
let cjarTreatsCarried = [];      // unrevealed treats carrying into the next Raid

// ── Raid state (reset each Raid) ───────────────────────────────────────────
let cjarDeck         = [];       // index 0 = next to flip
let cjarSeen         = {};       // { mum:0|1, ... } — appearances THIS Raid
let cjarCrumbs       = 0;
let cjarRaidTotals   = [];       // base game only — in-progress, unbanked
let cjarActive       = [];       // base game only — still in this Raid
let cjarCounterTreat = null;     // revealed Treat sitting on the counter, unclaimed
let cjarTrail        = [];       // Crumb Trail entries for this Raid
let cjarHighAlertId  = null;     // family id escalated to 4 copies
// Raid-start snapshot. CJAR_RAID_END must broadcast banked[] per player, and the
// only honest source is "Cookie Stash now minus Cookie Stash when the Raid opened" —
// banking happens in several places (solo exit, group exit, every Sylly gain), so
// incrementing a counter at each of them is the bug-prone alternative.
let cjarRaidOpenStashes = [];
let cjarLinesUsed = {};   // { 'mum:warn': [used lines] } — reset each Raid
let cjarFavourite    = [];       // Sylly — host-side full array, family id per player
let cjarWatcher      = [];       // Sylly — host-side full array
let cjarCrumbDebt    = [];       // Sylly — capped, cleared at Raid end

// ── Flip state (reset each flip) ───────────────────────────────────────────
let cjarCard         = null;
let cjarFlipSeq      = 0;        // idempotency tag — the host drops any CJAR_CHOICE
                                 // whose flipSeq is stale (the PKO BUG-01 class)
let cjarChoices      = [];       // 'take'|'sneak'|'innocent'|'dob'|null per player
let cjarReadyCheck   = [];
let cjarEndTimestamp = 0;        // absolute ms — every device counts down against this
// Render memory — what the stage row last drew, so the flip and the trail settle fire
// once per actual change rather than on every re-render (cjarRenderTable runs on every
// submission). Neither is game state: both are reset with the Raid.
let cjarLastHeroKey  = null;
let cjarLastTrailLen = 0;
let cjarWindowMs     = null;     // the OPEN window's length, from the host; null = No Rush.
                                 // Travels per flip so a client never scales its bar
                                 // against its own pills instead of the host's clock.
let cjarDeltas       = [];       // this flip's change per player, for the reveal
let cjarLines        = [];       // flavour line per player, for Open Book Off

// ── UI / device-local state ────────────────────────────────────────────────
let cjarTablePhase         = 'deciding'; // 'deciding'|'waiting'|'revealing'|'spectating'
let cjarMyFavourite        = null;       // Sylly — THIS device only, via mpSendPrivate
let cjarMyWatcher          = null;
let cjarTimerHandle        = null;       // setInterval — the countdown bar
let cjarRevealHandle       = null;       // setTimeout — reveal dwell (host only)
let cjarHostTimeoutHandle  = null;       // setTimeout — decision-timer auto-resolve (host only)
let cjarInterstitialHandle = null;       // setTimeout — raid-intro / BUSTED! advance

let CJAR_DATA = null;                    // hydrated from data/cjar-data.json

// ── Derived — never stored ─────────────────────────────────────────────────
function cjarIsSylly()          { return cjarSyllyMode === true; }
// null on 'norush' — every caller must branch, never fall back to a default number.
// A silent fallback would re-arm the auto-resolve the setting exists to remove.
function cjarDecisionMs()       { return CJAR_DECISION_TIMES[cjarDecisionTime] || null; }
function cjarActiveCount()      { return cjarActive.filter(Boolean).length; }
// Open Book is a RENDER-LAYER COURTESY, not a security property: every total is
// derivable from two public numbers. Never document it as privacy (spec §11).
function cjarStashVisible(idx)  { return cjarOpenBook || idx === mpMyPlayerIdx; }
// Two modes, two gates — and BOTH forms are wrong in the other mode:
//   base game — only ACTIVE seats gate the flip. Plain .every(Boolean) freezes the
//     Raid the moment anyone Sneaks Out, because a departed seat never submits again.
//   Sylly     — cjarActive is deliberately EMPTY in Dibber Dobber, and [].every() is
//     vacuously TRUE. Using the base-game form there makes cjarAllIn() always true,
//     so the host resolves on the FIRST tap and seats 2..N never get to choose at all.
// Nobody ever leaves in Dibber Dobber, so every seat must be in. (BUG-05.)
function cjarAllIn() {
  if (cjarIsSylly()) return cjarReadyCheck.every(Boolean);
  return cjarActive.every((a, i) => !a || cjarReadyCheck[i]);
}

// ── Wire normalisation — apply to EVERY collection field on receipt ────────
// Firebase RTDB stores no `null`, no `{}` and no `[]`. A key holding any of those
// is DELETED and reaches the client as `undefined`; an array whose entries are all
// null vanishes whole, and a sparse one comes back as an OBJECT keyed by index.
//
// cjar broadcasts reset values EXPLICITLY on purpose (FLW BUG-01) — and its reset
// values are precisely the erasable ones: `seen: {}`, `trail: []`, `choices:
// [null,...]`, `counterTreat: null`, `highAlertId: null`. On a real room none of
// them arrive, so the client applied `undefined` and the first render threw
// (BUG-06). Never assign a raw `p.x` collection field; always route it through one
// of these three. Every other MDLM game reaches the same place with `p.x || []`.
function cjarWireArr(v, n, fill) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = v ? v[i] : undefined;
    out[i] = (x === undefined || x === null) ? fill : x;
  }
  return out;
}
// Length-unknown lists (the trail, the roster, the Raid history).
function cjarWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]);
  return [];
}
function cjarWireObj(v) { return (v && typeof v === 'object') ? v : {}; }

// ── Cards and the deck ─────────────────────────────────────────────────────
function cjarCookieCard(v) { return { type: 'cookie', value: v }; }
function cjarFamilyCard(id) { return { type: 'family', id }; }
function cjarTreatCard(id) {
  const t = (CJAR_DATA.treats || []).find(x => x.id === id) || {};
  return { type: 'treat', id, points: t.points, tier: t.tier };
}

function cjarCookieTier(value) {
  const T = CJAR_DATA.cookieTiers;
  if (value <= T.handful.max) return 'handful';
  if (value <= T.batch.max)   return 'batch';
  return 'mountain';
}

// Art keys are DERIVED from card identity, never carried in a packet. This is what
// collapses 15 cookie values onto 3 tier assets — the value is a text overlay.
function cjarArtKey(card) {
  if (card.type === 'cookie') return 'cookie-' + cjarCookieTier(card.value);
  return card.type + '-' + card.id;      // family-mum, treat-macarons
}

// The two schedules already encode "the Super Special lands on the final Raid" at
// either match length, so no length-branching logic is needed anywhere else.
function cjarScheduledTreat() {
  const s = CJAR_DATA.treatSchedule[String(cjarMatchLength)] || [];
  return s[cjarRaidNo - 1] || null;
}

// Snack Friendly: FLOAT an existing Cookie Card to the top — never PREPEND a new
// one. Prepending adds a 16th cookie and silently changes the odds for every other
// flip in the Raid. Mutates in place.
function cjarFloatCookies(deck, n) {
  for (let slot = 0; slot < n; slot++) {
    const idx = deck.findIndex((c, i) => i >= slot && c.type === 'cookie');
    if (idx === -1) break;
    deck.splice(slot, 0, deck.splice(idx, 1)[0]);
  }
}

// Returns a NEW deck; the caller assigns cjarDeck. Note shuffle() is engine.js's
// PURE shuffle — it returns a copy, so every call must be reassigned. `shuffle(d)`
// as a bare statement is a silent no-op.
function cjarBuildDeck() {
  let deck = [];

  if (cjarIsSylly()) {
    // Full 15+15 pool every Raid — House Rules is hidden in Dibber Dobber, so
    // cjarFamilyCopies is deliberately ignored here and nothing ever burns.
    CJAR_DATA.family.forEach(f => { for (let n = 0; n < 3; n++) deck.push(cjarFamilyCard(f.id)); });
    CJAR_DATA.cookieValues.forEach(v => deck.push(cjarCookieCard(v)));
    deck = shuffle(deck);
    deck.length = CJAR_DD_CUT;                     // genuine random cut to 10
    deck.push(cjarTreatCard(cjarScheduledTreat()));    // Treat added AFTER the cut, so it
    deck = shuffle(deck);                          // is always in play → ~11 cards
    // Snack Friendly is hidden in Sylly (its setting card has nowhere to live once
    // House Rules is gone too), but its SPIRIT still applies: the blind commit is the
    // point (Delta 7), not being punished before you've seen a single card. Float
    // ONE cookie to the front — after the final shuffle above, or it would be undone
    // by it. This does not touch total risk: every Caught! card that would have
    // appeared still appears somewhere in the Raid, just never on flip 1.
    cjarFloatCookies(deck, 1);
    return deck;
  }

  // Base game: live family copies, which House Rules mutates across the match.
  Object.entries(cjarFamilyCopies).forEach(([id, n]) => {
    for (let k = 0; k < n; k++) deck.push(cjarFamilyCard(id));
  });
  CJAR_DATA.cookieValues.forEach(v => deck.push(cjarCookieCard(v)));  // never depletes
  cjarTreatsCarried.forEach(id => deck.push(cjarTreatCard(id)));      // unrevealed carry forward
  const scheduled = cjarScheduledTreat();
  if (scheduled) deck.push(cjarTreatCard(scheduled));
  deck = shuffle(deck);
  cjarFloatCookies(deck, cjarSnackFriendly === 'warmup' ? 2 : cjarSnackFriendly === 'safe' ? 1 : 0);
  return deck;
}

// ── Scoring primitives ─────────────────────────────────────────────────────
// The ONLY split helper. Every uneven split in this game — either mode, every card
// type, every action — sends its remainder to Crumbs. There is no other destination.
function cjarSplit(total, headCount) {
  if (headCount <= 0) { cjarCrumbs += total; return 0; }
  const per = Math.floor(total / headCount);
  cjarCrumbs += total - (per * headCount);
  return per;
}

function cjarSeatsChoosing(action) {
  const out = [];
  for (let i = 0; i < cjarPlayerCount; i++) if (cjarChoices[i] === action) out.push(i);
  return out;
}

// Base game. `leavers` is an array of playerIdx that chose Sneak Out this flip.
function cjarResolveSneak(leavers) {
  if (leavers.length === 1) {
    const i = leavers[0];
    cjarStashes[i] += cjarRaidTotals[i] + cjarCrumbs;
    cjarCrumbs = 0;
    if (cjarCounterTreat) {                    // a solo leaver is the ONLY Treat claim
      cjarStashes[i] += cjarCounterTreat.points;
      cjarTreatsWon[i] += 1;
      cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
      cjarCounterTreat = null;
    }
  } else {
    // cjarSplit pushes its remainder INTO cjarCrumbs, so the pool must be drained to
    // zero BEFORE the call. Splitting cjarCrumbs in place double-counts it. This and
    // the Sylly scare-off block are the only two places the pool splits into itself.
    const pool = cjarCrumbs;
    cjarCrumbs = 0;
    const per = cjarSplit(pool, leavers.length);
    leavers.forEach(i => { cjarStashes[i] += cjarRaidTotals[i] + per; });
  }                                            // 2+ leavers never claim the Treat
  leavers.forEach(i => { cjarRaidTotals[i] = 0; cjarActive[i] = false; });
}

// Base game only — Dibber Dobber has no bust.
function cjarResolveBust(familyId) {
  cjarActive.forEach((live, i) => { if (live) { cjarRaidTotals[i] = 0; cjarActive[i] = false; } });
  if (cjarHouseRules !== 'on-guard') cjarFamilyCopies[familyId] -= 1;   // burn + high-alert
  if (cjarHouseRules === 'high-alert') {
    // The busting family is EXCLUDED from the escalation pool (owner call, 2 Aug 2026 —
    // plan Delta 6). If it could be re-picked it would go 3→2 on the burn and 2→3 on the
    // escalation, cancelling out: nothing burns, nothing escalates, and High Alert does
    // nothing at all that Raid. With 5 archetypes that was 1 bust in 5.
    const pool = Object.keys(cjarFamilyCopies)
      .filter(id => cjarFamilyCopies[id] > 0 && id !== familyId);
    // Unreachable in a real match (it needs every other family burnt to zero), but an
    // empty pool would otherwise write cjarFamilyCopies[undefined] and poison the deck.
    if (pool.length) {
      cjarHighAlertId = pool[Math.floor(Math.random() * pool.length)];
      cjarFamilyCopies[cjarHighAlertId] += 1;                           // a 4th copy next Raid
    }
  }
  if (cjarCounterTreat) {                                               // revealed Treat is lost
    cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
    cjarCounterTreat = null;
  }
}

// ── Flavour and the Crumb Trail ────────────────────────────────────────────
// Drawn without replacement within a Raid so a 5-Raid match doesn't repeat the
// same line every time. When a pool is exhausted it resets rather than returning
// undefined — a missing line would render as "undefined" on the BUSTED! screen.
function cjarFlavourLine(familyId, pool) {
  const fam = (CJAR_DATA.family || []).find(f => f.id === familyId);
  if (!fam || !fam[pool] || !fam[pool].length) return '';
  const key = familyId + ':' + pool;
  let used = cjarLinesUsed[key] || [];
  let remaining = fam[pool].filter(l => !used.includes(l));
  if (!remaining.length) { used = []; remaining = fam[pool].slice(); }
  const line = remaining[Math.floor(Math.random() * remaining.length)];
  cjarLinesUsed[key] = used.concat([line]);
  return line;
}

function cjarLogTrail(entry) { cjarTrail.push(entry); }

// ── Card reveal ────────────────────────────────────────────────────────────
// HOST ONLY. Pops the next card and applies its OWN effect — before anyone chooses.
// The ordering is load-bearing: if the effect landed after the decision window, a
// player looking at a second Caught! card could Sneak Out for free and the whole
// push-your-luck tension would collapse. This is why CJAR_FLIP_START carries
// raidTotals[], crumbs and seen{} — it broadcasts the POST-effect state.
// Returns { busted, bustFamilyId }; a bust skips the decision window entirely.
function cjarApplyCardEffect() {
  if (window.syllyMultiplayerMode === 'client') return { busted: false, bustFamilyId: null };
  // BASE GAME ONLY. Dibber Dobber commits its choices BLIND and reveals inside
  // cjarHostResolveFlip (Delta 7) — routing Sylly through here would pop a card out
  // from under a window nobody has answered yet. Guarded at the top, before the pop,
  // so a stray call is a clean no-op rather than a lost card.
  if (cjarIsSylly()) return { busted: false, bustFamilyId: null };
  cjarCard = cjarDeck.shift() || null;
  cjarFlipSeq += 1;
  cjarChoices    = new Array(cjarPlayerCount).fill(null);
  cjarReadyCheck = new Array(cjarPlayerCount).fill(false);
  if (!cjarCard) return { busted: false, bustFamilyId: null };

  if (cjarCard.type === 'cookie') {
    const per = cjarSplit(cjarCard.value, cjarActiveCount());
    for (let i = 0; i < cjarPlayerCount; i++) if (cjarActive[i]) cjarRaidTotals[i] += per;
    cjarLogTrail({ type: 'cookie', value: cjarCard.value, per });
    return { busted: false, bustFamilyId: null };
  }

  if (cjarCard.type === 'family') {
    const id = cjarCard.id;
    if (!cjarSeen[id]) {
      cjarSeen[id] = 1;
      cjarLogTrail({ type: 'family', id, line: cjarFlavourLine(id, 'warn'), busted: false });
      return { busted: false, bustFamilyId: null };
    }
    cjarLogTrail({ type: 'family', id, line: cjarFlavourLine(id, 'bust'), busted: true });
    cjarResolveBust(id);
    return { busted: true, bustFamilyId: id };
  }

  cjarCounterTreat = cjarCard;                      // treat — sits, unclaimed
  cjarLogTrail({ type: 'treat', id: cjarCard.id, points: cjarCard.points });
  return { busted: false, bustFamilyId: null };
}

// ── Dibber Dobber's blind flip (Delta 7) ───────────────────────────────────
// Dibber Dobber keeps the base game's mental model: the card you are choosing about
// is the NEXT, unseen one. Incan Gold's loop is reveal → resolve → choose-about-the-
// next-card, and the base game matches it exactly. Sylly cannot resolve a card before
// choices exist (every DD outcome is choice-driven), so it inverts to
// choose-blind → reveal → resolve. Same gamble, opposite implementation.
//
// The one inherent asymmetry: the base game's FIRST decision of a Raid is informed by
// card 1's already-resolved effect, while DD's first decision is fully blind. That
// falls out of DD resolving FROM the choices and cannot be avoided.

// HOST ONLY, SYLLY ONLY. Opens a blind window: bumps the idempotency tag, resets the
// accumulators, and clears the card so the hero renders face-down through the seam.
function cjarOpenBlindWindow() {
  cjarCard       = null;            // cjarRenderCard(null) → the card back, for free
  cjarFlipSeq   += 1;
  cjarChoices    = new Array(cjarPlayerCount).fill(null);
  cjarReadyCheck = new Array(cjarPlayerCount).fill(false);
}

// HOST ONLY, SYLLY ONLY. Pops and reveals the card the already-committed choices will
// resolve against, and logs it to the Crumb Trail. The trail entry belongs HERE and
// nowhere else: before Delta 7 the Sylly path returned before any cjarLogTrail call,
// so Dibber Dobber's Crumb Trail was empty for a whole match (BUG-04).
function cjarRevealSyllyCard() {
  cjarCard = cjarDeck.shift() || null;
  if (!cjarCard) return null;
  if (cjarCard.type === 'treat') cjarCounterTreat = cjarCard;
  // A cookie's per-head share is not known until the takers are counted inside
  // cjarResolveFlipDD, so `per` is deliberately omitted; the trail renderer prints
  // the bare value when it is absent.
  cjarLogTrail(
    cjarCard.type === 'cookie' ? { type: 'cookie', value: cjarCard.value }
  : cjarCard.type === 'family' ? { type: 'family', id: cjarCard.id, busted: false,
                                   line: cjarFlavourLine(cjarCard.id, 'warn') }
                               : { type: 'treat', id: cjarCard.id, points: cjarCard.points });
  return cjarCard;
}

// HOST ONLY. Records one seat's choice. Returns whether it was accepted, so the
// caller can tell a dropped packet from a duplicate.
function cjarApplyChoice(playerIdx, choice, flipSeq) {
  if (window.syllyMultiplayerMode === 'client') return false;
  if (playerIdx < 0 || playerIdx >= cjarPlayerCount) return false;
  // An in-flight packet from a flip that has already resolved must not resolve it a
  // second time (the PKO BUG-01 class). flipSeq is the idempotency tag.
  if (flipSeq !== cjarFlipSeq) return false;
  if (cjarReadyCheck[playerIdx]) return false;                 // no changing your mind
  if (!cjarIsSylly() && !cjarActive[playerIdx]) return false;  // spectators cannot submit
  cjarChoices[playerIdx]    = choice;
  cjarReadyCheck[playerIdx] = true;
  return true;
}

// ── Flip resolution ────────────────────────────────────────────────────────
// HOST ONLY, once per flip, after the decision window closes. The single entry
// point for choice resolution; branches on cjarIsSylly().
function cjarResolveFlip(choices) {
  cjarChoices = choices || cjarChoices;
  const deltas = new Array(cjarPlayerCount).fill(0);
  const lines  = new Array(cjarPlayerCount).fill('');
  const before = cjarStashes.slice();

  if (cjarIsSylly()) {
    const raidEnded = cjarResolveFlipDD(lines);
    for (let i = 0; i < cjarPlayerCount; i++) deltas[i] = cjarStashes[i] - before[i];
    return { deltas, lines, raidEnded };
  }

  const leavers = [];
  for (let i = 0; i < cjarPlayerCount; i++) {
    if (cjarActive[i] && cjarChoices[i] === 'sneak') leavers.push(i);
  }
  if (leavers.length) {
    cjarResolveSneak(leavers);
    leavers.forEach(i => { lines[i] = 'Sneaked out.'; });
    cjarLogTrail({ type: 'sneak', players: leavers.slice() });
  }

  // Raid-end checks, in the spec's order. BUSTED is handled at reveal, so only two
  // conditions remain here.
  let raidEnded = cjarActiveCount() === 0;
  if (!raidEnded && cjarDeck.length === 0) {
    // D-04 — the deck runs dry with players still in. Treated as everyone Sneaking
    // Out together: it needs no new rule and no new copy.
    const rest = [];
    for (let i = 0; i < cjarPlayerCount; i++) if (cjarActive[i]) rest.push(i);
    cjarResolveSneak(rest);
    if (cjarCounterTreat) {              // only reachable when 2+ left together
      cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
      cjarCounterTreat = null;
    }
    cjarCrumbs = 0;                      // an unclaimed remainder is destroyed
    cjarLogTrail({ type: 'deckout', players: rest });
    raidEnded = true;
  }

  for (let i = 0; i < cjarPlayerCount; i++) deltas[i] = cjarStashes[i] - before[i];
  return { deltas, lines, raidEnded };
}

// ── Raid lifecycle ─────────────────────────────────────────────────────────
// HOST ONLY. Everything reset here also travels at its reset value in the
// CJAR_RAID_START payload — clients never run this function (FLW BUG-01).
function cjarStartRaid() {
  cjarRaidNo      += 1;
  cjarSeen         = {};
  cjarCrumbs       = 0;
  cjarTrail        = [];
  cjarLinesUsed    = {};
  cjarCounterTreat = null;
  cjarFlipSeq      = 0;
  cjarChoices      = new Array(cjarPlayerCount).fill(null);
  cjarReadyCheck   = new Array(cjarPlayerCount).fill(false);
  cjarCrumbDebt    = new Array(cjarPlayerCount).fill(0);
  cjarRaidOpenStashes = cjarStashes.slice();
  if (cjarIsSylly()) {
    cjarRaidTotals = [];                       // unused in Dibber Dobber
    cjarActive     = [];
    cjarAssignAffinities();
  } else {
    cjarRaidTotals = new Array(cjarPlayerCount).fill(0);
    cjarActive     = new Array(cjarPlayerCount).fill(true);
  }
  cjarDeck = cjarBuildDeck();
}

// HOST ONLY. `reason` is 'bust' | 'allout' | 'deckout' — used only for copy.
function cjarEndRaid(reason) {
  const banked = cjarStashes.map((s, i) => s - (cjarRaidOpenStashes[i] || 0));
  cjarRaidHistory[cjarRaidNo - 1] = banked;

  if (cjarIsSylly()) {
    // A Treat unclaimed at Raid end is permanently gone — it never carries forward.
    cjarCounterTreat = null;
    cjarCrumbs = 0;
    cjarCrumbDebt = new Array(cjarPlayerCount).fill(0);
    return { banked, reason };
  }

  // Recomputed from the deck, never maintained incrementally: whatever is still in
  // the deck was never revealed, and everything else was claimed or discarded by the
  // rules above. A Treat cannot be both carried and discarded when the deck is the
  // single source.
  cjarTreatsCarried = cjarDeck.filter(c => c.type === 'treat').map(c => c.id);
  if (cjarCounterTreat) {                       // revealed but unclaimed → gone for good
    cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
    cjarCounterTreat = null;
  }
  cjarCrumbs = 0;
  return { banked, reason };
}

// ── Table: the Stage zone ──────────────────────────────────────────────────
// Every renderer starts with a null-guard so it runs unmodified against the
// harness's null document and against a screen that isn't mounted yet.
function cjarRenderStage() {
  // COLUMN 1 — "Up for Grabs": Crumbs on top, then the Treat slot, then a caption.
  // Crumbs and the Treat are the same idea — shared table state a solo departure
  // claims — so they are one card, not two things in a column (DD-23).
  const crumbsVal = document.getElementById('cjar-crumbs-value');
  if (crumbsVal) crumbsVal.textContent = String(cjarCrumbs);

  const treatSlot = document.getElementById('cjar-treat-slot');
  if (treatSlot) {
    treatSlot.innerHTML = '';
    if (cjarCounterTreat) {
      treatSlot.appendChild(cjarRenderCard(cjarCounterTreat, { size: 'counter' }));
    } else {
      const ph = document.createElement('div');
      ph.className = 'cjar-card-counter cjar-placeholder-dashed';
      treatSlot.appendChild(ph);
    }
  }

  // The caption promotes ONE line out of the crumbs tip onto the card face. It is the
  // least-understood rule in the game and this is the object it is about. Static, not
  // press-to-preview: a preview would leak your intent to anyone glancing at your
  // screen, and phones have no hover state to hang it on (DD-23).
  const cap = document.getElementById('cjar-grabs-caption');
  if (cap) cap.textContent = cjarIsSylly()
    ? 'Play innocent alone and the pile is yours.'
    : 'Sneak out alone and you take the lot.';

  // COLUMN 2 — just revealed. Unchanged: still the largest single image on the stage.
  const hero = document.getElementById('cjar-table-hero');
  if (hero) {
    hero.innerHTML = '';
    const card = cjarRenderCard(cjarCard, { size: 'stage' });
    // Flip ONLY when the card actually changed. cjarRenderTable is called on every
    // choice submission and every re-render, so animating unconditionally would
    // re-flip the same card every time anybody tapped anything.
    const key = cjarCard ? (cjarCard.type + ':' + (cjarCard.id || cjarCard.value)) : 'down';
    if (key !== cjarLastHeroKey) {
      card.className += ' cjar-card-flipin';
      cjarLastHeroKey = key;
    }
    hero.appendChild(card);
    hero.onclick = () => { playDone(); cjarOpenTrail(); };
  }

  // COLUMN 3 — the jar the centre card came from. Round 2 sized this near the hero
  // "because it is the card you are actually betting on"; DD-18 moved that job to
  // column 2, so the rationale inverts and the size follows (DD-24). It renders as an
  // OFFSET STACK rather than a single back: two lone face-down cards side by side read
  // as "which one is next?", where a stack reads unambiguously as the reservoir — and
  // it is literally where the settle beat lifts the replacement from.
  const badge = document.getElementById('cjar-deck-badge');
  if (badge) {
    badge.innerHTML = '';
    if (cjarDeck.length) {
      const stack = document.createElement('div');
      stack.className = 'cjar-deck-stack';
      // Three backs regardless of depth — this is an icon meaning "the deck", not a
      // gauge. The COUNT below is the gauge, and it is the precise one.
      for (let k = 0; k < 3; k++) {
        const back = cjarRenderCard(null, { faceDown: true, size: 'next' });
        back.style.cssText += `left:${k * 3}px;top:${k * -3}px;z-index:${k};`;
        stack.appendChild(back);
      }
      badge.appendChild(stack);
      const n = document.createElement('div');
      n.className = 'text-base font-bold text-stone-600 text-center mt-1';
      n.textContent = cjarDeck.length;
      badge.appendChild(n);
    }
  }

  // The "just revealed" label is only true while a card is face-up in the slot. In
  // Dibber Dobber's blind window there is no card, so it would be a lie. VISIBILITY,
  // not display — collapsing the label would shift the cards it sits under.
  const now = document.getElementById('cjar-stage-label-now');
  if (now) now.style.visibility = cjarCard ? 'visible' : 'hidden';
  cjarRenderWarningStrip();
  cjarRenderTrailStrip();
}

// Five slots, one per family member. Two live states per mode, not three:
//   base game — dim (unseen) / RED (seen once, so the next one busts the Raid)
//   Sylly     — dim (unseen) / amber (seen once; Dibber Dobber has no bust)
// The amber branch is deliberately unreachable in the base game: cjarSeen[id] is
// only ever 0 or 1, and "seen once" IS the danger condition there, so there is no
// middle rung to show. Do not "fix" the missing amber state in the base game.
// The High Alert outline is separate from all of it — it marks a 4th copy in the
// deck, which is about ODDS, not about how close that member is to busting you.
// NOTE: the `flex-1` below is the HORIZONTAL kind — five slots sharing one row's
// width. It is not the banned sticky-footer `flex-1` that inflates a vertical
// Stage; see impl-notes TG-01 before "fixing" a grep hit on it.
function cjarRenderWarningStrip() {
  const strip = document.getElementById('cjar-warning-strip');
  if (!strip) return;
  strip.innerHTML = '';
  (CJAR_DATA.family || []).forEach(f => {
    const copies = cjarFamilyCopies[f.id] || 0;
    const slot = document.createElement('div');
    const seen = cjarSeen[f.id] ? 1 : 0;
    // Sylly Mode has no bust, so the strip is purely informational there — it still
    // shows who has appeared, but never the danger state.
    const danger = seen && !cjarIsSylly();
    slot.className = 'flex-1 min-h-11 flex items-center justify-center rounded-lg text-lg transition-colors duration-150 '
      + (copies === 0 ? 'bg-stone-100 opacity-30'
         : danger     ? 'bg-red-100 ring-2 ring-red-400'
         : seen       ? 'bg-[#F7E9C4]'
                      : 'bg-stone-100 opacity-50')
      + (cjarHighAlertId === f.id ? ' ring-2 ring-offset-1 ring-[#D4A017]' : '');
    slot.textContent = f.emoji || '👪';
    slot.title = f.name + (copies ? '' : ' — all gone');
    strip.appendChild(slot);
  });
}

// Newest on the right, auto-scrolled to the end so the latest flip is always the
// one in view without a tap.
function cjarRenderTrailStrip() {
  const strip = document.getElementById('cjar-trail-strip');
  if (!strip) return;
  strip.innerHTML = '';
  const cards = cjarTrail.filter(e => e.type !== 'sneak' && e.type !== 'deckout'); // not cards
  // The LAST card entry is the one currently in the stage slot — drawing it here too
  // is precisely the duplication this layout exists to remove. It joins the strip on
  // the next flip, when the slot moves on.
  const spent = cjarCard ? cards.slice(0, -1) : cards;
  if (!spent.length) {
    // Before the first flip lands here, the strip would otherwise just be dead space —
    // exactly the same "is this broken?" read as the Treat slot before a Treat exists.
    // One dashed placeholder at thumb size says "this is where history starts."
    const ph = document.createElement('div');
    ph.className = 'cjar-card-thumb cjar-placeholder-dashed';
    strip.appendChild(ph);
  } else {
    spent.forEach((entry, i) => {
      const card = entry.type === 'cookie' ? { type: 'cookie', value: entry.value }
                 : entry.type === 'family' ? { type: 'family', id: entry.id }
                                           : { type: 'treat',  id: entry.id, points: entry.points };
      const el = cjarRenderCard(card, { size: 'thumb', dimmed: true });
      // Only the newest thumb settles in — it is the one that just arrived from the slot.
      if (i === spent.length - 1 && spent.length !== cjarLastTrailLen) el.className += ' cjar-trail-settle';
      strip.appendChild(el);
    });
  }
  cjarLastTrailLen = spent.length;
  // Deliberately NO click handler on the strip. It is a horizontal scroll container, and
  // a tap-to-open-the-overlay handler on it competes with the swipe that scrolls it —
  // which is why the history read as unscrollable even though overflow-x was already on.
  // `btn-cjar-trail-open` beneath it is the affordance instead.
  strip.scrollLeft = strip.scrollWidth;   // newest end stays in view without a swipe
}

// The Crumb Trail overlay — the flip LOG, plus the copies-remaining row. The title
// must never read as just "Crumbs": that is the scoring currency, not this list.
function cjarOpenTrail() {
  const ov = document.getElementById('cjar-trail-overlay');
  if (!ov) return;
  const copies = document.getElementById('cjar-trail-copies');
  if (copies) {
    copies.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest cjar-label';
    h.textContent = 'Still in the deck';
    copies.appendChild(h);
    (CJAR_DATA.family || []).forEach(f => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm';
      row.innerHTML = `<span class="text-sm text-stone-700">${f.emoji || '👪'} ${f.name}</span>`;
      const n = document.createElement('span');
      n.className = 'text-sm font-bold text-stone-500';
      n.textContent = (cjarFamilyCopies[f.id] || 0) + ' left';
      row.appendChild(n);
      copies.appendChild(row);
    });
  }
  const log = document.getElementById('cjar-trail-log');
  if (log) {
    log.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest cjar-label';
    h.textContent = 'Every flip this Raid';
    log.appendChild(h);
    if (!cjarTrail.length) {
      const empty = document.createElement('p');
      empty.className = 'text-stone-400 text-sm';
      empty.textContent = 'Nothing yet — the jar is still shut.';
      log.appendChild(empty);
    }
    cjarTrail.forEach(e => {
      const row = document.createElement('p');
      row.className = 'text-sm text-stone-600';
      const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || id;
      row.textContent =
        // `per` is absent on Dibber Dobber entries: the share depends on how many
        // players chose Take, which is not known when the card is logged (Delta 7).
        e.type === 'cookie'  ? (e.per == null ? `🍪 ${e.value} cookies`
                                             : `🍪 ${e.value} cookies — ${e.per} each`)
      : e.type === 'family'  ? `${e.busted ? '🚨' : '👀'} ${fam(e.id)} — ${e.line}`
      : e.type === 'treat'   ? `🍰 A treat appeared on the counter`
      : e.type === 'sneak'   ? `🚪 ${e.players.map(i => cjarPlayerNames[i]).join(', ')} sneaked out`
                             : `📭 The jar ran dry — everyone left together`;
      log.appendChild(row);
    });
  }
  ov.style.display = 'flex';
}

// A cookie delta flying up from the Stage. Lives in an absolute layer over a
// relative anchor so it contributes ZERO height: in-flow it would change the
// column height, and because the <section> centres the Stack that re-centres the
// whole screen on every flip (the SHP sheep-parade bug). This fires ~55× a match.
function cjarFlyDelta(amount) {
  const layer = document.getElementById('cjar-delta-layer');
  if (!layer || !amount) return;
  const el = document.createElement('div');
  el.className = 'cjar-delta';
  el.style.left = (30 + Math.random() * 40) + '%';
  el.style.bottom = '10%';
  el.textContent = (amount > 0 ? '+' : '') + amount + ' 🍪';
  layer.appendChild(el);
  // Duration-based reduced-motion means animationend still fires, so this cleanup
  // is safe under prefers-reduced-motion. Never switch that block to animation:none.
  el.addEventListener('animationend', () => el.remove());
}

// ── Table: master renderer ─────────────────────────────────────────────────
// Every SYNC handler calls THIS, never a sub-renderer, so a device can never end
// up with a half-updated screen.
function cjarRenderTable() {
  const raid = document.getElementById('cjar-table-raid');
  if (raid) raid.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength}`;
  cjarRenderStage();
  cjarRenderControls();
  cjarRenderRevealRows();
  cjarRenderPrivateStrip();
}

// ── Table: the Controls zone ───────────────────────────────────────────────
// Trap 2 (spec §11): mpLockSync() self-releases after 8 s, which is SHORTER than
// the 15 s decision window — a player who submitted early would watch their own
// buttons un-grey while the table still waits. So the Waiting state is expressed by
// REMOVING the buttons from the DOM, not by greying them. When the class self-clears
// there is nothing left to un-grey. mpLockSync is still called for its correctness
// layer (it drops the duplicate ACTION at the send choke point), and btn-mp-action
// still goes on the buttons as suite standard — it just isn't the mechanism.
function cjarRenderControls() {
  const box = document.getElementById('cjar-controls');
  if (!box) return;
  box.innerHTML = '';

  const mk = (label, choice, tone) => {
    const b = document.createElement('button');
    // Custom brand classes carry their own flex centering; Tailwind-coloured buttons
    // need it inline, because a show/hide helper setting display:flex would otherwise
    // pin the label top-left (PKO BUG-03, widened).
    b.className = 'btn-mp-action min-h-14 w-full rounded-2xl active:scale-95 text-lg font-semibold '
      + 'flex items-center justify-center transition-all duration-150 '
      + (tone === 'brand' ? 'cjar-cta' : 'bg-stone-200 hover:bg-stone-300 text-stone-700');
    b.textContent = label;
    b.addEventListener('click', () => cjarSubmitChoice(choice));
    return b;
  };

  if (cjarTablePhase === 'deciding') {
    if (cjarIsSylly()) {
      // "Sneak" must never appear in Dibber Dobber copy: in the base game it means
      // bank-and-leave, and here nobody leaves. Reusing it teaches the wrong rule.
      // "Reach In" (not "Take a Cookie") because these are three parallel ACTS on one
      // card — a noun phrase beside two verb phrases read as a different kind of
      // option — and because a taker receives a SHARE of the card's value, not one
      // cookie (cjarSplit in cjarResolveFlipDD). DD-21.
      box.appendChild(mk('Reach In', 'take', 'brand'));
      box.appendChild(mk('Play Innocent', 'innocent'));
      box.appendChild(mk('Dob', 'dob'));
    } else {
      // NOT "Take a Cookie": in the base game the cookies were already split among
      // every active seat by cjarApplyCardEffect, before this button existed. The
      // choice here is PARTICIPATION — stay in for the next, unseen card, or leave.
      // "Again" is what carries that. DD-21.
      box.appendChild(mk('Reach In Again', 'take', 'brand'));
      box.appendChild(mk('Sneak Out', 'sneak'));
    }
    return;
  }

  if (cjarTablePhase === 'spectating') {
    const p = document.createElement('p');
    p.className = 'text-stone-500 text-sm text-center';
    p.textContent = 'You’re out with your cookies. Watching the rest of them sweat.';
    box.appendChild(p);
    return;
  }

  // 'waiting' and 'revealing' both show who is still deciding, as name chips.
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap items-center justify-center gap-2';
  const caption = document.createElement('p');
  caption.className = 'text-stone-400 text-xs text-center w-full';
  caption.textContent = cjarTablePhase === 'waiting' ? 'Waiting on…' : '';
  wrap.appendChild(caption);
  for (let i = 0; i < cjarPlayerCount; i++) {
    if (!cjarIsSylly() && !cjarActive[i]) continue;
    if (cjarReadyCheck[i]) continue;
    const chip = document.createElement('span');
    chip.className = 'px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold';
    chip.textContent = cjarPlayerNames[i];
    wrap.appendChild(chip);
  }
  box.appendChild(wrap);
}

// One row per player, shown after CJAR_FLIP_RESOLVE. With Open Book OFF you still
// hear WHAT happened to everyone — you just don't see their numbers.
// One row per player, in EVERY phase — this is the standings board, not just a reveal
// readout. Before the change it only rendered during 'revealing', which meant Open Book
// was on but there was nowhere to see where you stood while actually deciding: the one
// moment the information is worth anything.
//   deciding / waiting / spectating → rank + name + Cookie Stash
//   revealing                       → what just happened, and the +/− delta
// Sorted by Stash so the board reads as a ladder; your own row is always tinted, which
// is also what makes it findable at eight players.
function cjarRenderRevealRows() {
  const box = document.getElementById('cjar-reveal-rows');
  if (!box) return;
  box.innerHTML = '';
  if (!cjarPlayerCount) return;
  const revealing = cjarTablePhase === 'revealing';
  const ranks = cjarRanks();
  const order = cjarPlayerNames
    .map((n, i) => i)
    .sort((a, b) => revealing ? a - b : (ranks[a] - ranks[b]));   // reveal keeps seat order

  order.forEach((i, pos) => {
    const me  = i === mpMyPlayerIdx;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between rounded-xl px-3 py-1.5 shadow-sm '
      + (me ? 'bg-[#F7E9C4]' : 'bg-white');
    // 30-80 ms stagger between rows, per the Motion Standard.
    row.style.animationDelay = (pos * 50) + 'ms';

    const left = document.createElement('span');
    left.className = 'text-sm ' + (me ? 'text-[#7A5C0A] font-semibold' : 'text-stone-700');
    left.textContent = revealing
      ? cjarPlayerNames[i] + (cjarLines[i] ? ' — ' + cjarLines[i] : '')
      : cjarRankLabel(ranks[i]) + '  ' + cjarPlayerNames[i]
        + (!cjarIsSylly() && !cjarActive[i] ? '  🚪' : '');

    const right = document.createElement('span');
    if (revealing) {
      const d = cjarDeltas[i] || 0;
      right.className = 'text-sm font-bold ' + (d < 0 ? 'text-red-700' : 'text-stone-500');
      right.textContent = cjarStashVisible(i) ? ((d > 0 ? '+' : '') + d + ' 🍪') : '•••';
    } else {
      right.className = 'text-sm font-bold text-stone-500';
      // Open Book gates OTHERS' numbers only — your own row always reads. The
      // in-Raid total is base-game only; Dibber Dobber has one running Stash.
      right.textContent = cjarStashVisible(i)
        ? (cjarStashes[i] || 0) + ' 🍪'
          + (!cjarIsSylly() && cjarActive[i] ? `  (+${cjarRaidTotals[i] || 0} in)` : '')
        : '•••';
    }
    row.appendChild(left); row.appendChild(right);
    box.appendChild(row);
  });
}

// This device's own numbers. Always visible regardless of Open Book — it is your
// own hand, and Open Book only governs whether you can see OTHERS.
// SYLLY-ONLY personal chips. Cookie Stash and This Raid used to live here too — round 2
// removed both, because cjar-reveal-rows already shows them for your own seat: Open Book
// gates OTHERS' numbers, never your own (cjarStashVisible checks `idx === mpMyPlayerIdx`
// unconditionally), so your row there is already live at every setting. That leaves this
// strip with nothing to say in the base game, so it hides itself entirely rather than
// showing an empty bordered row.
function cjarRenderPrivateStrip() {
  const box = document.getElementById('cjar-private-strip');
  if (!box) return;
  box.innerHTML = '';
  if (!cjarIsSylly()) { box.style.display = 'none'; return; }

  const me = mpMyPlayerIdx;
  const chip = (label, value, extraClass) => {
    const c = document.createElement('span');
    c.className = 'px-3 py-1 rounded-full text-xs font-semibold ' + (extraClass || 'bg-[#F7E9C4] text-[#7A5C0A]');
    c.textContent = label + ' ' + value;
    box.appendChild(c);
  };
  if (cjarCrumbDebt[me] > 0) chip('Owes', cjarCrumbDebt[me] + ' 🍪', 'bg-red-100 text-red-800');
  const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || '—';
  chip('⭐ Favourite', fam(cjarMyFavourite));
  chip('👁 Watcher', fam(cjarMyWatcher));

  const tip = document.createElement('button');
  tip.id = 'btn-cjar-mine-tip';
  tip.className = 'text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100';
  tip.textContent = '[?]';
  tip.addEventListener('click', () => {
    playDone();
    cjarShowTip('🍪', 'Your Cookies', ['Owes — a debt paid out of your next winnings, not out of your Cookie Stash.',
                                       'Your Cookie Stash and this Raid’s running total are always on the scoreboard above, in your own row.']);
  });
  box.appendChild(tip);
  box.style.display = 'flex';
}

// ── The decision timer ─────────────────────────────────────────────────────
// Every device counts down against the SAME absolute endTimestamp, so clock skew
// stays cosmetic — only the host ever resolves.
// The fill drains right-to-left via scaleX, which needs `transform-origin:left` —
// see the #cjar-timer-fill rule in styles.css. Without it the default centre origin
// shrinks the bar symmetrically from both ends and it reads as a shrinking pill.
// On 'norush' there is no deadline at all: the bar is hidden outright rather than
// left full, because a full-but-frozen bar reads as "broken timer". The window's
// LENGTH comes from the payload, not from the local setting — a client whose own
// pills say something else must still animate against the host's clock.
function cjarStartTimer(endTimestamp, windowMs) {
  cjarStopTimer();
  const bar = document.getElementById('cjar-timer-bar');
  if (!endTimestamp || !windowMs) {
    cjarEndTimestamp = 0;
    if (bar) bar.style.display = 'none';
    return;
  }
  if (bar) bar.style.display = 'block';
  cjarEndTimestamp = endTimestamp;
  const fill = document.getElementById('cjar-timer-fill');
  let lastTick = -1;
  const paint = () => {
    const left = Math.max(0, cjarEndTimestamp - Date.now());
    if (fill) fill.style.transform = `scaleX(${left / windowMs})`;
    const secs = Math.ceil(left / 1000);
    if (secs <= 3 && secs > 0 && secs !== lastTick) { lastTick = secs; playTick(); }
    if (left <= 0) cjarStopTimer();
  };
  paint();
  cjarTimerHandle = setInterval(paint, 100);
}
function cjarStopTimer() {
  if (cjarTimerHandle) { clearInterval(cjarTimerHandle); cjarTimerHandle = null; }
}

// ── Submitting a choice ────────────────────────────────────────────────────
function cjarSubmitChoice(choice) {
  if (cjarTablePhase !== 'deciding') return;
  playDone();
  // mpLockSync's correctness layer drops a double-tap's second ACTION at the send
  // choke point. It is kept for exactly that; the Waiting state is the re-render.
  mpLockSync();
  cjarTablePhase = 'waiting';

  if (window.syllyMultiplayerMode === 'host' || window.syllyMultiplayerMode === 'single') {
    // The dedup guard drops every envelope where originId === syllyDeviceUid, so a
    // host that self-sends never marks its own seat and the flip hangs forever.
    // This has recurred in JEC, YGI and NT. Host mutates directly, then broadcasts.
    cjarApplyChoice(mpMyPlayerIdx, choice, cjarFlipSeq);
    cjarRenderTable();
    if (cjarAllIn()) cjarHostResolveFlip();
    return;
  }
  mpSendEnvelope({ type: 'ACTION', payload: { action: 'CJAR_CHOICE', flipSeq: cjarFlipSeq, choice } });
  cjarRenderTable();
}

// ── Match lifecycle ────────────────────────────────────────────────────────
// HOST ONLY. Post-lobby entry point — the roster is already populated from
// mpPlayerSlots by onPassThePhone, so there is no setup screen (spec §17 D-01).
function cjarStartMatch() {
  if (window.syllyMultiplayerMode === 'client') return;
  cjarApplyExpansionOverrides();
  // Dibber Dobber seeds 5 cookies ONCE. A per-Raid grant would hand out 25 free
  // cookies over a Full Feast and flatten the whole economy.
  const seed = cjarIsSylly() ? CJAR_DD_START_STASH : 0;
  cjarStashes     = new Array(cjarPlayerCount).fill(seed);
  cjarTreatsWon   = new Array(cjarPlayerCount).fill(0);
  cjarRaidHistory = [];
  cjarRaidNo      = 0;
  cjarHighAlertId = null;
  cjarTreatsCarried = [];
  cjarTreatsLive  = (CJAR_DATA.treats || []).map(t => t.id);
  cjarFamilyCopies = {};
  (CJAR_DATA.family || []).forEach(f => { cjarFamilyCopies[f.id] = f.copies; });
  cjarBroadcastMatchStart();
  cjarStartRaid();
  // Order matters: cjarStartRaid builds the deck AND assigns affinities, so both
  // broadcasts have to follow it — RaidStart needs deckCount, affinities need the
  // freshly-drawn Favourite/Watcher pairs.
  cjarBroadcastRaidStart();
  cjarSendAffinities();
  cjarShowRaidIntro(() => cjarHostNextFlip());
}

// Standard competition ranking: ties share a rank and the next rank is skipped, so
// two players on 2nd are followed by 4th (PKO precedent). Tie-break is total, then
// Treats won, then shared.
function cjarRanks() {
  const order = cjarStashes
    .map((s, i) => ({ i, s, t: cjarTreatsWon[i] || 0 }))
    .sort((a, b) => (b.s - a.s) || (b.t - a.t));
  const ranks = new Array(cjarPlayerCount).fill(0);
  let rank = 1;
  order.forEach((row, k) => {
    if (k > 0 && !(row.s === order[k - 1].s && row.t === order[k - 1].t)) rank = k + 1;
    ranks[row.i] = rank;
  });
  return ranks;
}

// Last place, single or shared — the Red-Handed label.
function cjarRedHanded() {
  const ranks = cjarRanks();
  const worst = Math.max(...ranks);
  // An all-square match has joint winners and NO last place. Without this guard
  // max(ranks) === min(ranks) === 1, so every seat comes back as Red-Handed and the
  // end screen labels the same player both "Top Cookie Thief" and "Red-Handed" on
  // one row. Reachable: a short Raid where everyone banks the same amount.
  if (worst === Math.min(...ranks)) return [];
  return ranks.map((r, i) => (r === worst ? i : -1)).filter(i => i >= 0);
}

function cjarRankLabel(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// HOST ONLY.
function cjarEndMatch() {
  return { ranks: cjarRanks(), redHanded: cjarRedHanded() };
}

// ── Dibber Dobber (Sylly Mode) ─────────────────────────────────────────────
// Structurally different from the base game: no cjarActive, no cjarRaidTotals, no
// bust, nobody leaves. One running cjarStashes[i] per player for the whole match.
//
// The two ledger primitives. EVERY Sylly gain and loss goes through these — touch
// cjarStashes directly anywhere and Crumb Debt silently stops working.
function cjarDDGain(i, amt) {
  if (cjarCrumbDebt[i] > 0) {
    const pay = Math.min(cjarCrumbDebt[i], amt);
    cjarCrumbDebt[i] -= pay; cjarCrumbs += pay; amt -= pay;   // repayments go to Crumbs
  }
  cjarStashes[i] += amt;
}
function cjarDDPay(i, amt) {
  const paid = Math.min(cjarStashes[i], amt);
  cjarStashes[i] -= paid; cjarCrumbs += paid;
  const short = amt - paid;
  // Closes the free-Dob-at-zero exploit; capped so a young player can always dig out.
  if (short > 0) cjarCrumbDebt[i] = Math.min(CJAR_DD_DEBT_CAP, cjarCrumbDebt[i] + short);
}

// One Favourite (loss 0) and one Watcher (loss doubled) per player, per Raid,
// reassigned at random each Raid. They must be DIFFERENT family members, so the
// Watcher is drawn from the remaining four.
function cjarAssignAffinities() {
  const ids = (CJAR_DATA.family || []).map(f => f.id);
  cjarFavourite = new Array(cjarPlayerCount).fill(null);
  cjarWatcher   = new Array(cjarPlayerCount).fill(null);
  for (let i = 0; i < cjarPlayerCount; i++) {
    const fav = ids[Math.floor(Math.random() * ids.length)];
    const rest = ids.filter(id => id !== fav);
    cjarFavourite[i] = fav;
    cjarWatcher[i]   = rest[Math.floor(Math.random() * rest.length)];
  }
}

// Called at the END of every flip while a Treat sits. Never split. "Solo" is
// evaluated in PRIORITY ORDER, not independently: two players can each be the only
// one who chose their action, and the higher-priority one wins outright.
function cjarDDResolveTreat() {
  if (!cjarCounterTreat) return;
  const solo = list => (list.length === 1 ? list[0] : -1);
  let w = solo(cjarSeatsChoosing('take'));
  if (w < 0) w = solo(cjarSeatsChoosing('dob'));
  if (w < 0) w = solo(cjarSeatsChoosing('innocent'));
  if (w < 0) return;                            // nobody uniquely solo — re-contests
  cjarDDGain(w, cjarCounterTreat.points);
  cjarTreatsWon[w] += 1;
  cjarCounterTreat = null;
}

// Returns raidEnded. Writes per-player flavour into `lines`.
function cjarResolveFlipDD(lines) {
  const takers    = cjarSeatsChoosing('take');
  const dobbers   = cjarSeatsChoosing('dob');
  const innocents = cjarSeatsChoosing('innocent');
  const card = cjarCard;

  if (card && card.type === 'cookie') {
    const V = card.value;
    if (takers.length && dobbers.length) {
      const steal = Math.min(CJAR_DD_DOB_STEAL * dobbers.length, V);
      const dPer  = cjarSplit(steal, dobbers.length);      dobbers.forEach(i => cjarDDGain(i, dPer));
      const tPer  = cjarSplit(V - steal, takers.length);   takers.forEach(i  => cjarDDGain(i, tPer));
    } else if (takers.length) {
      const tPer = cjarSplit(V, takers.length);            takers.forEach(i  => cjarDDGain(i, tPer));
    } else if (dobbers.length) {
      dobbers.forEach(i => cjarDDPay(i, CJAR_DD_DOB_BACKFIRE));  // backfire — nobody took
      cjarCrumbs += V;                                           // card value unclaimed
    } else {
      cjarCrumbs += V;                                           // everyone played innocent
    }
  } else if (card && card.type === 'family') {
    takers.forEach(i => {
      const loss = cjarFavourite[i] === card.id ? CJAR_DD_TAKE_LOSS.favourite
                 : cjarWatcher[i]   === card.id ? CJAR_DD_TAKE_LOSS.watcher
                 : CJAR_DD_TAKE_LOSS.neutral;
      if (loss) cjarDDPay(i, loss);
    });
    dobbers.forEach(i => cjarDDPay(i, CJAR_DD_DOB_BACKFIRE));    // ALWAYS backfires here
  }

  // SCARE-OFF — runs LAST so an all-innocent flip absorbs its own contribution
  // immediately. A Dobber's presence denies Innocents the pile on BOTH card types,
  // and the pile is then left untouched for a future flip.
  if (innocents.length && dobbers.length === 0) {
    const pool = cjarCrumbs; cjarCrumbs = 0;     // drain BEFORE splitting into itself
    const iPer = cjarSplit(pool, innocents.length);
    innocents.forEach(i => cjarDDGain(i, iPer));
  }

  cjarDDResolveTreat();

  takers.forEach(i    => { lines[i] = 'Took a cookie.'; });
  dobbers.forEach(i   => { lines[i] = 'Dobbed.'; });
  innocents.forEach(i => { lines[i] = 'Played innocent.'; });

  // The ~11-card deck running out is the ONLY Raid-end condition in Dibber Dobber.
  return cjarDeck.length === 0;
}

// ── Interstitials ──────────────────────────────────────────────────────────
// Both carry NO [?] / 🔊 / ✕: they auto-advance AND have no interactive element,
// which are the two conditions of the ui-style rule-5 exemption. 5 s is the
// documented practical ceiling — do not raise it. Past that a player with nothing
// to tap is genuinely stuck and the exemption should be reconsidered, not stretched.
function cjarShowRaidIntro(onDone) {
  const h = document.getElementById('cjar-intro-heading');
  if (h) h.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength}`;
  const s = document.getElementById('cjar-intro-sub');
  if (s) s.textContent = cjarIsSylly()
    ? 'Fresh jar. Nobody leaves, nobody busts.'
    : 'Fresh jar, fresh family. Grab what you can.';
  const aff = document.getElementById('cjar-intro-affinity');
  if (aff) {
    aff.innerHTML = '';
    aff.style.display = 'none';
    if (cjarIsSylly() && cjarMyFavourite) {
      const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || '—';
      aff.innerHTML =
        `<p class="text-sm text-stone-700">⭐ Your <b>Favourite</b> is <b>${fam(cjarMyFavourite)}</b> — they look the other way.</p>` +
        `<p class="text-sm text-stone-700">👁 Your <b>Watcher</b> is <b>${fam(cjarMyWatcher)}</b> — they're onto you.</p>` +
        `<p class="text-xs text-stone-400">Only you can see this.</p>`;
      aff.style.display = 'flex';
    }
  }
  // A fresh Raid means a fresh strip — clear the render memory so the first flip
  // animates in rather than being mistaken for "the same card as last Raid's last".
  cjarLastHeroKey = null; cjarLastTrailLen = 0;
  showScreen('screen-cjar-raid-intro');
  if (cjarInterstitialHandle) clearTimeout(cjarInterstitialHandle);
  cjarInterstitialHandle = setTimeout(() => { cjarInterstitialHandle = null; onDone(); }, CJAR_INTERSTITIAL_MS);
}

// Base game only — Dibber Dobber never reaches this screen.
function cjarShowBusted(familyId, line, onDone) {
  const fam = (CJAR_DATA.family || []).find(f => f.id === familyId) || {};
  const e = document.getElementById('cjar-busted-emoji');
  if (e) e.textContent = fam.emoji || '🚨';
  const w = document.getElementById('cjar-busted-who');
  if (w) w.textContent = fam.name || '';
  const l = document.getElementById('cjar-busted-line');
  if (l) l.textContent = line || '';
  playAbyssThud();
  showScreen('screen-cjar-busted');
  if (cjarInterstitialHandle) clearTimeout(cjarInterstitialHandle);
  cjarInterstitialHandle = setTimeout(() => { cjarInterstitialHandle = null; onDone(); }, CJAR_INTERSTITIAL_MS);
}

// ── Raid summary ───────────────────────────────────────────────────────────
function cjarShowRaidSummary(banked) {
  cjarStopTimer();
  const t = document.getElementById('cjar-summary-raid');
  if (t) t.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength} complete`;
  const box = document.getElementById('cjar-summary-rows');
  if (box) {
    box.innerHTML = '';
    for (let i = 0; i < cjarPlayerCount; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between rounded-xl px-3 py-2 bg-white shadow-sm';
      const left = document.createElement('span');
      left.className = 'text-sm text-stone-700';
      left.textContent = cjarPlayerNames[i];
      const right = document.createElement('span');
      right.className = 'text-sm font-bold text-stone-500';
      // Open Book gates OTHERS' numbers only — your own row always reads.
      right.textContent = cjarStashVisible(i)
        ? `+${banked[i] || 0} 🍪   ·   ${cjarStashes[i]} total`
        : `+${banked[i] || 0} 🍪   ·   •••`;
      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);
    }
  }
  // Host-gated: only the host advances the match. A client that could tap this
  // would run the next Raid locally and diverge until the next SYNC.
  const isHost = window.syllyMultiplayerMode !== 'client';
  const cta = document.getElementById('btn-cjar-next-raid');
  if (cta) cta.style.display = isHost ? 'flex' : 'none';
  const wait = document.getElementById('cjar-summary-waiting');
  if (wait) wait.style.display = isHost ? 'none' : 'block';
  showScreen('screen-cjar-raid-summary');
}

// ── End screen ─────────────────────────────────────────────────────────────
function cjarShowGameover() {
  cjarStopTimer();
  const ranks = cjarRanks();
  const red   = cjarRedHanded();
  const pod = document.getElementById('cjar-podium');
  if (pod) {
    pod.innerHTML = '';
    cjarPlayerNames
      .map((n, i) => ({ i, n }))
      .sort((a, b) => ranks[a.i] - ranks[b.i])
      .forEach(({ i, n }) => {
        const row = document.createElement('div');
        const top = ranks[i] === 1;
        row.className = 'flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm '
          + (top ? 'bg-[#F7E9C4]' : 'bg-white');
        const left = document.createElement('span');
        left.className = 'text-sm font-semibold text-stone-800';
        left.textContent = (top ? '🍪 ' : '') + cjarRankLabel(ranks[i]) + ' — ' + n
          + (top ? ' · Top Cookie Thief' : '')
          + (red.includes(i) ? ' · Red-Handed' : '');
        const right = document.createElement('span');
        right.className = 'text-sm font-bold text-stone-600';
        right.textContent = cjarStashes[i] + ' 🍪'
          + (cjarTreatsWon[i] ? `  ·  ${cjarTreatsWon[i]} 🍰` : '');
        row.appendChild(left); row.appendChild(right);
        pod.appendChild(row);
      });
  }
  // Players as ROWS, Raids as COLUMNS. Wide content scrolls inside its own
  // container so the page body never scrolls horizontally.
  const grid = document.getElementById('cjar-history-grid');
  if (grid) {
    let html = '<table class="w-full text-xs text-stone-600"><thead><tr>'
      + '<th class="text-left font-semibold pb-1">Raid</th>';
    for (let r = 0; r < cjarRaidHistory.length; r++) html += `<th class="pb-1 px-1">${r + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let i = 0; i < cjarPlayerCount; i++) {
      html += `<tr><td class="text-left py-0.5 pr-2">${cjarPlayerNames[i]}</td>`;
      for (let r = 0; r < cjarRaidHistory.length; r++) {
        html += `<td class="text-center py-0.5 px-1">${(cjarRaidHistory[r] || [])[i] || 0}</td>`;
      }
      html += '</tr>';
    }
    grid.innerHTML = html + '</tbody></table>';
  }
  playClashWin();
  showScreen('screen-cjar-gameover');
}

// Clients land here after the lobby and wait for CJAR_MATCH_START.
function cjarShowClientStandby() {
  const s = document.getElementById('cjar-intro-sub');
  if (s) s.textContent = 'Waiting for the host to open the jar…';
  const h = document.getElementById('cjar-intro-heading');
  if (h) h.textContent = 'Cookie Jar';
  const aff = document.getElementById('cjar-intro-affinity');
  if (aff) aff.style.display = 'none';
  showScreen('screen-cjar-raid-intro');
}

// ── Host flip driver ───────────────────────────────────────────────────────
// HOST ONLY. Reveals the next card, applies its effect, and either busts out of the
// Raid or opens the decision window.
function cjarHostNextFlip() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (cjarHostTimeoutHandle) { clearTimeout(cjarHostTimeoutHandle); cjarHostTimeoutHandle = null; }

  if (!cjarDeck.length) { cjarHostEndRaid('deckout'); return; }

  if (cjarIsSylly()) {
    // Blind commit — the card is revealed in cjarHostResolveFlip (Delta 7).
    cjarOpenBlindWindow();
    cjarOpenDecisionWindow();
    return;
  }

  const eff = cjarApplyCardEffect();

  if (eff.busted) {
    const last = cjarTrail[cjarTrail.length - 1] || {};
    cjarBroadcastResolve({ deltas: new Array(cjarPlayerCount).fill(0),
                           lines: new Array(cjarPlayerCount).fill(''),
                           raidEnded: true, bustFamilyId: eff.bustFamilyId, bustLine: last.line });
    playBoing();
    cjarShowBusted(eff.bustFamilyId, last.line, () => cjarHostEndRaid('bust'));
    return;
  }

  cjarPlayCardSound(cjarCard);
  cjarOpenDecisionWindow();
}

// An event's identity and its voice stay in one place (CJAR_SOUND), so a card type
// can never drift away from the sound that announces it.
function cjarPlayCardSound(card) {
  if (!card) return;
  const key = card.type === 'cookie' ? 'cookie'
            : card.type === 'family' ? 'caughtFirst'
            : (card.tier === 'super' ? 'treatSuper' : 'treatSpecial');
  const fn = window[CJAR_SOUND[key]];
  if (typeof fn === 'function') fn();
}

// HOST ONLY. The shared tail of BOTH modes' flip opening — deadline, broadcast,
// render, countdown, auto-resolve. Factored so the two paths cannot drift: the only
// difference between them is whether a card is face-up when the window opens.
function cjarOpenDecisionWindow() {
  const windowMs = cjarDecisionMs();
  cjarWindowMs     = windowMs;
  cjarEndTimestamp = windowMs ? Date.now() + windowMs : 0;
  cjarTablePhase = (!cjarIsSylly() && !cjarActive[mpMyPlayerIdx]) ? 'spectating' : 'deciding';
  cjarBroadcastFlipStart();
  cjarRenderTable();
  cjarStartTimer(cjarEndTimestamp, windowMs);
  showScreen('screen-cjar-table');

  // No Rush: no deadline, so no auto-resolve. cjarAllIn() is the only gate, which is
  // exactly what it already is in every other mode — the timeout was never the
  // mechanism, only the safety net. A table that stalls here is a table waiting on a
  // person, which is the point of the setting.
  if (!windowMs) return;

  // The grace window lets an ACTION that was already in flight when the clock hit
  // zero still land. Without it a player who tapped on the last tick is silently
  // auto-resolved instead.
  cjarHostTimeoutHandle = setTimeout(() => {
    cjarHostTimeoutHandle = null;
    // Timeout default: Sneak Out banks and is safe in the base game; Play Innocent
    // is the safe action in Dibber Dobber, where Sneak Out does not exist.
    const fallback = cjarIsSylly() ? 'innocent' : 'sneak';
    for (let i = 0; i < cjarPlayerCount; i++) {
      if (!cjarReadyCheck[i] && (cjarIsSylly() || cjarActive[i])) {
        cjarApplyChoice(i, fallback, cjarFlipSeq);
      }
    }
    cjarHostResolveFlip();
  }, windowMs + CJAR_TIMEOUT_GRACE_MS);
}

// HOST ONLY. Closes the window, resolves, broadcasts, then dwells before the next flip.
function cjarHostResolveFlip() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (cjarHostTimeoutHandle) { clearTimeout(cjarHostTimeoutHandle); cjarHostTimeoutHandle = null; }
  cjarStopTimer();

  // Delta 7 — in Dibber Dobber the card is revealed HERE, once the choices are locked.
  // It must be popped BEFORE cjarResolveFlip, because cjarResolveFlipDD resolves
  // against cjarCard and reports raidEnded from the post-pop deck length.
  if (cjarIsSylly()) cjarPlayCardSound(cjarRevealSyllyCard());

  const res = cjarResolveFlip(cjarChoices.slice());
  cjarDeltas = res.deltas;
  cjarLines  = res.lines;
  const solo = cjarSeatsChoosing('sneak');
  if (!cjarIsSylly() && solo.length === 1) playUnchallenged(); else playDone();

  cjarBroadcastResolve({ ...res, bustFamilyId: null });
  cjarTablePhase = 'revealing';
  cjarRenderTable();
  cjarFlyDelta(cjarDeltas[mpMyPlayerIdx]);

  if (cjarRevealHandle) clearTimeout(cjarRevealHandle);
  cjarRevealHandle = setTimeout(() => {
    cjarRevealHandle = null;
    if (res.raidEnded) cjarHostEndRaid('allout');
    else cjarHostNextFlip();
  }, CJAR_REVEAL_MS);
}

// HOST ONLY.
function cjarHostEndRaid(reason) {
  if (window.syllyMultiplayerMode === 'client') return;
  cjarStopTimer();
  const { banked } = cjarEndRaid(reason);
  cjarBroadcastRaidEnd(banked);
  if (cjarRaidNo >= cjarMatchLength) { cjarBroadcastMatchEnd(); cjarShowGameover(); return; }
  cjarShowRaidSummary(banked);
}

// ── Shared tip + data-overlay opener ───────────────────────────────────────
// Shared tip overlay — one per game, reused for all three contextual [?] points.
// Three bullets maximum; resist explaining everything.
function cjarShowTip(emoji, heading, lines) {
  const e = document.getElementById('cjar-tip-emoji');   if (e) e.textContent = emoji;
  const h = document.getElementById('cjar-tip-heading'); if (h) h.textContent = heading;
  const b = document.getElementById('cjar-tip-body');
  if (b) {
    b.innerHTML = '';
    (lines || []).slice(0, 3).forEach(t => {
      const p = document.createElement('p');
      p.textContent = '• ' + t;
      b.appendChild(p);
    });
  }
  const ov = document.getElementById('cjar-tip-overlay');
  if (ov) ov.style.display = 'flex';
}

// Data overlays scroll-reset on open so the thematic title is always the first
// thing seen. overflow-y:auto comes from the .overlay-data-inner CLASS, not a
// Tailwind utility — querying '.overflow-y-auto' returns null and silently no-ops.
function cjarOpenOverlay(id) {
  const ov = document.getElementById(id);
  if (!ov) return;
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  ov.style.display = 'flex';
}

// ── Settings ────────────────────────────────────────────────────────────────
// Repaints every control from the current values. Also the one place the two
// bust-related settings are hidden: every option in both governs what happens
// after a bust, and Dibber Dobber has no bust.
function cjarSyncSettingsUI() {
  const setGroup = (group, val) => {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
      p.classList.remove('pill-active-cjar');
      if (p.dataset.val === String(val)) p.classList.add('pill-active-cjar');
    });
  };
  setGroup('cjar-snack',  cjarSnackFriendly);
  setGroup('cjar-house',  cjarHouseRules);
  setGroup('cjar-length', cjarMatchLength);
  setGroup('cjar-time',   cjarDecisionTime);

  // The dynamic value line under each pill group. The pill carries the THEMATIC name and
  // nothing else — baking "(3)" or "(10s)" into a label lengthens it unevenly and wrecks
  // the row's alignment, which is why Decision Time shipped with no indication of its
  // actual times at all. Same shape as the Sylly intensity slider's live descriptor
  // (ui-style.md § Settings Card Standard); the static description above still says what
  // the setting CONTROLS, this says what you have just PICKED.
  const setVal = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setVal('cjar-val-snack', { off:    'No guarantee — the first card could be anyone.',
                             safe:   'The first card of every Raid is cookies.',
                             warmup: 'The first two cards of every Raid are cookies.' }[cjarSnackFriendly] || '');
  setVal('cjar-val-house', { 'burn':       'A family member who catches you drops to 2 copies for the rest of the match.',
                             'on-guard':   'Copies never change — every Raid runs the same odds.',
                             'high-alert': 'The catcher drops to 2 copies, and someone else climbs to 4.' }[cjarHouseRules] || '');
  setVal('cjar-val-length', cjarMatchLength + ' Raids.');
  setVal('cjar-val-time',  { blitz:    '10 seconds per decision.',
                             standard: '20 seconds per decision.',
                             norush:   'No clock at all — the jar waits.' }[cjarDecisionTime] || '');

  const ob = document.getElementById('btn-cjar-openbook-toggle');
  if (ob) { ob.className = (cjarOpenBook ? 'game-toggle-on-cjar' : 'game-toggle-off') + ' shrink-0';
            ob.textContent = cjarOpenBook ? 'ON' : 'OFF'; }
  const sy = document.getElementById('btn-cjar-sylly-toggle');
  if (sy) { sy.className = (cjarSyllyMode ? 'game-toggle-on-cjar' : 'game-toggle-off') + ' shrink-0';
            sy.textContent = cjarSyllyMode ? 'ON' : 'OFF'; }

  ['cjar-set-snack', 'cjar-set-house'].forEach(id => {
    const card = document.getElementById(id);
    if (card) card.style.display = cjarSyllyMode ? 'none' : 'flex';
  });
}

// ── Packet senders (host only) ─────────────────────────────────────────────
// Each is a no-op in 'single' mode by construction, which is what lets the four
// harnesses drive the real appliers in one process. mpSendEnvelope THROWS in the
// harness sandbox, so a leak fails loudly instead of passing silently.
function cjarSend(payload) {
  if (window.syllyMultiplayerMode === 'single' || window.syllyMultiplayerMode === 'client') return;
  mpSendEnvelope({ type: 'SYNC', payload });
}

function cjarBroadcastMatchStart() {
  cjarSend({
    action: 'CJAR_MATCH_START',
    snackFriendly: cjarSnackFriendly, houseRules: cjarHouseRules,
    matchLength: cjarMatchLength, openBook: cjarOpenBook, sylly: cjarSyllyMode,
    decisionTime: cjarDecisionTime,
    playerNames: cjarPlayerNames, stashes: cjarStashes, treatsWon: cjarTreatsWon,
    familyCopies: cjarFamilyCopies,
  });
}

// EVERY accumulator this Raid touches appears here at its RESET value. The host
// resets them in cjarStartRaid; clients never run that function, so anything left
// out carries the previous Raid's value forward (FLW BUG-01). cjar fires this
// pattern ~55x a match — more than any shipped game.
function cjarBroadcastRaidStart() {
  cjarSend({
    action: 'CJAR_RAID_START',
    raidNo: cjarRaidNo, deckCount: cjarDeck.length,
    seen: {}, crumbs: 0, counterTreat: null, trail: [],
    raidTotals: cjarRaidTotals, active: cjarActive,
    crumbDebt: new Array(cjarPlayerCount).fill(0),
    choices: new Array(cjarPlayerCount).fill(null),
    readyCheck: new Array(cjarPlayerCount).fill(false),
    stashes: cjarStashes, highAlertId: cjarHighAlertId, familyCopies: cjarFamilyCopies,
  });
}

// `card` is deliberately whatever cjarCard currently holds — which under Delta 7 is
// NULL in Dibber Dobber, because the window opens blind and the card is not popped
// until resolve. Clients render null as the card back through the seam, so the blind
// window needs no special-casing here.
function cjarBroadcastFlipStart() {
  cjarSend({
    action: 'CJAR_FLIP_START',
    flipSeq: cjarFlipSeq, card: cjarCard, deckCount: cjarDeck.length,
    crumbs: cjarCrumbs, seen: cjarSeen, stashes: cjarStashes,
    raidTotals: cjarRaidTotals, active: cjarActive, counterTreat: cjarCounterTreat,
    endTimestamp: cjarEndTimestamp, windowMs: cjarWindowMs, trail: cjarTrail,
    choices: new Array(cjarPlayerCount).fill(null),        // reset values travel
    readyCheck: new Array(cjarPlayerCount).fill(false),    // explicitly
  });
}

function cjarBroadcastResolve(res) {
  cjarSend({
    action: 'CJAR_FLIP_RESOLVE',
    // MUST carry the card. In the base game CJAR_FLIP_START already sent it, but under
    // Delta 7 Dibber Dobber's FLIP_START sends `card: null` and the real card is not
    // revealed until this point — without it a client's hero stays face-down through
    // the entire reveal and never learns what it was caught by.
    card: cjarCard,
    flipSeq: cjarFlipSeq, choices: cjarChoices, deltas: res.deltas, lines: res.lines,
    stashes: cjarStashes, raidTotals: cjarRaidTotals, active: cjarActive,
    crumbs: cjarCrumbs, crumbDebt: cjarCrumbDebt, counterTreat: cjarCounterTreat,
    treatsWon: cjarTreatsWon, trail: cjarTrail, familyCopies: cjarFamilyCopies,
    highAlertId: cjarHighAlertId, raidEnded: res.raidEnded,
    bustFamilyId: res.bustFamilyId || null, bustLine: res.bustLine || '',
  });
}

function cjarBroadcastRaidEnd(banked) {
  cjarSend({
    action: 'CJAR_RAID_END',
    raidNo: cjarRaidNo, banked, stashes: cjarStashes, treatsWon: cjarTreatsWon,
    raidHistory: cjarRaidHistory, familyCopies: cjarFamilyCopies,
    highAlertId: cjarHighAlertId,
  });
}

function cjarBroadcastMatchEnd() {
  cjarSend({
    action: 'CJAR_MATCH_END',
    stashes: cjarStashes, treatsWon: cjarTreatsWon,
    raidHistory: cjarRaidHistory, ranks: cjarRanks(),
  });
}

// The ONE private-channel use. Affinities never mutate mid-Raid, which is exactly
// why this is safe as a one-shot: it is NOT the mpSendPrivate hand-REPAIR pattern
// and must not be extended into one. Cookie Stashes deliberately stay on the public
// channel — every total is derivable from two public numbers, so Open Book is a
// render-layer courtesy, never a security property.
function cjarSendAffinities() {
  if (!cjarIsSylly()) return;
  for (let i = 0; i < cjarPlayerCount; i++) {
    const uid = mpPlayerSlots[i] && mpPlayerSlots[i].uid;
    if (i === mpMyPlayerIdx) {                     // the host's own — set locally
      cjarMyFavourite = cjarFavourite[i];
      cjarMyWatcher   = cjarWatcher[i];
      continue;
    }
    if (!uid || window.syllyMultiplayerMode === 'single') continue;
    mpSendPrivate(uid, { type: 'SYNC', payload: {
      action: 'CJAR_AFFINITY', favourite: cjarFavourite[i], watcher: cjarWatcher[i],
    }});
  }
}

// ── Stubs — filled by later tasks, names are final ─────────────────────────
// Hydrates CJAR_DATA once, on lobby entry. Idempotent — a second tap on the lobby
// button must not refetch. Never throws into the boot path: on failure the menu
// still opens and the failure surfaces at deck build, not as a dead lobby button.
function cjarLoadData() {
  if (CJAR_DATA) return Promise.resolve(CJAR_DATA);
  return fetch('data/cjar-data.json')
    .then(r => r.json())
    .then(d => { CJAR_DATA = d; return d; })
    .catch(err => { console.warn('[cjar] data unavailable', err); return null; });
}
// Post-lobby entry for the host — onPassThePhone lands here so Settings and How to
// Play are available before committing the table to a match.
function cjarShowMenu() {
  cjarSyncSettingsUI();
  showScreen('screen-cjar-menu');
}
// ── The render seam ────────────────────────────────────────────────────────
// EVERY cjar card in the DOM is built here. Nothing else may construct one — a
// bypass is unskinnable and invisible to the art pipeline (DYB's old cup-die
// bypass is the cautionary case).
//   opts.faceDown  → the card back
//   opts.size      → 'hero' (default) | 'thumb' | 'counter'
//   opts.dimmed    → 35% opacity, for a spent trail entry
function cjarRenderCard(card, opts = {}) {
  const el = document.createElement('div');
  const size = 'cjar-card-' + (opts.size || 'hero');

  if (opts.faceDown || !card) {
    el.className = 'cjar-card-back ' + size;
    const back = (typeof assetBack === 'function') && assetBack('cjar');
    el.style.cssText = back
      ? 'background:none;background-size:cover;background-position:center;background-image:url("' + back + '");'
      : '';
    return el;
  }

  el.dataset.cardType = card.type;
  // Three-tier art (skin → core art → emoji) resolves inside assetFace — art.js.
  // The art key is DERIVED here and never travels in a packet.
  const faceUrl = (typeof assetFace === 'function') && assetFace('cjar', cjarArtKey(card));
  const dim = opts.dimmed ? 'opacity:0.35;' : '';

  if (faceUrl) {
    el.className = 'cjar-card cjar-card-asset ' + size + ' cjar-card-' + card.type;
    el.style.cssText = 'background-image:url("' + faceUrl + '");' + dim;
    // The numeric value is a TEXT OVERLAY on the tier art — this is what collapses
    // 15 cookie values onto 3 assets. It must survive the asset branch.
    if (card.type === 'cookie') {
      const v = document.createElement('div');
      v.className = 'cjar-card-value';
      v.textContent = String(card.value);
      el.appendChild(v);
    }
    return el;
  }

  // Emoji + CSS fallback — the shipped look is illustrated, but the seam must never
  // depend on art having loaded.
  el.className = 'cjar-card ' + size + ' cjar-card-' + card.type;
  el.style.cssText = dim;
  const emoji = document.createElement('div');
  emoji.className = 'cjar-card-emoji';
  const name = document.createElement('div');
  name.className = 'cjar-card-name';

  if (card.type === 'cookie') {
    emoji.textContent = '🍪';
    name.textContent = (CJAR_DATA.cookieTiers[cjarCookieTier(card.value)] || {}).label || '';
    const v = document.createElement('div');
    v.className = 'cjar-card-value';
    v.textContent = String(card.value);
    el.appendChild(emoji); el.appendChild(v); el.appendChild(name);
    return el;
  }
  if (card.type === 'family') {
    const fam = (CJAR_DATA.family || []).find(f => f.id === card.id) || {};
    emoji.textContent = fam.emoji || '👪';
    name.textContent  = fam.name || '';
  } else {
    const t = (CJAR_DATA.treats || []).find(x => x.id === card.id) || {};
    emoji.textContent = '🍰';
    name.textContent  = t.name || '';
  }
  el.appendChild(emoji); el.appendChild(name);
  return el;
}
// ── The card gallery ───────────────────────────────────────────────────────
// Builds itself from CJAR_DATA every time it opens, so it can never drift from the
// live deck the way a hand-written list would. Three sections mirroring the three
// card types; the cookie row shows ONE card per tier (the art collapses 15 values
// onto 3 assets — the number is a text overlay, so a 15-tile row would be 15 copies
// of 3 pictures). Needs no match, no lobby and no network: the whole point.
function cjarOpenCards() {
  const box = document.getElementById('cjar-cards-body');
  if (!box) return;
  box.innerHTML = '';
  if (!CJAR_DATA) {
    const p = document.createElement('p');
    p.className = 'text-stone-400 text-sm';
    p.textContent = 'The jar is still being unpacked — try again in a moment.';
    box.appendChild(p);
    return;   // the overlay itself is opened by the caller, never from in here
  }

  const section = (label, blurb) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-2';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest cjar-label';
    h.textContent = label;
    const b = document.createElement('p');
    b.className = 'text-stone-500 text-sm';
    b.textContent = blurb;
    const row = document.createElement('div');
    // Fixed 3-column grid, not flex-wrap: 5 tiles (Family, Treats) wrapped as an uneven
    // 4-then-1 under flex-wrap, purely a function of how many happened to fit per the
    // container's measured width. Forcing 3 columns makes it a deliberate 3-then-2 no
    // matter how many tiles a section has.
    row.className = 'grid grid-cols-3 gap-3 justify-items-center pt-1';
    wrap.appendChild(h); wrap.appendChild(b); wrap.appendChild(row);
    box.appendChild(wrap);
    return row;
  };
  // A tile is the card plus its name underneath — the card face itself carries no
  // label at thumb/counter size, and an unlabelled grid of art is a poster, not a
  // reference.
  const tile = (row, card, caption) => {
    const cell = document.createElement('div');
    cell.className = 'flex flex-col items-center gap-1 w-[4.5rem]';
    cell.appendChild(cjarRenderCard(card, { size: 'counter' }));
    const c = document.createElement('p');
    c.className = 'text-[0.65rem] text-stone-500 text-center leading-tight';
    c.textContent = caption;
    cell.appendChild(c);
    row.appendChild(cell);
  };

  const T = CJAR_DATA.cookieTiers || {};
  const cookies = section('Cookies',
    'Good news. The value is split between everyone still in the kitchen; the remainder becomes Crumbs.');
  ['handful', 'batch', 'mountain'].forEach(k => {
    if (!T[k]) return;
    // A value inside the band so the tier art and the overlay agree.
    const v = k === 'mountain' ? (T.batch ? T.batch.max + 4 : 20) : T[k].max;
    tile(cookies, cjarCookieCard(v), T[k].label || k);
  });

  const family = section('The Family',
    cjarIsSylly()
      ? 'Nobody busts in Dibber Dobber — but your Favourite looks the other way and your Watcher is onto you.'
      : 'The first time one appears, nothing happens. The second time, the Raid is over and everyone loses what they were carrying.');
  (CJAR_DATA.family || []).forEach(f => tile(family, cjarFamilyCard(f.id), f.name));

  const treats = section('Treats',
    'Only ever claimed by sneaking out ALONE. Leave with anyone else and it stays on the counter.');
  (CJAR_DATA.treats || []).forEach(t => {
    tile(treats, cjarTreatCard(t.id), `${t.name} · ${t.points}`);
  });

  const back = section('The Jar', 'What is still to come. This is the one you are betting on.');
  tile(back, null, `${CJAR_DATA.cookieValues ? CJAR_DATA.cookieValues.length + (CJAR_DATA.family || []).length * 3 : ''} cards`);
}

// The gallery and the rules are two tabs of ONE overlay, so opening either is the same
// call with a different tab. Keeping the two bodies as siblings (rather than repainting
// one) means the rules body keeps its scroll position when you flick across and back.
function cjarSetHowToTab(tab) {
  const rules = document.getElementById('cjar-how-to-body');
  const cards = document.getElementById('cjar-how-to-cards');
  if (rules) rules.style.display = tab === 'cards' ? 'none' : 'flex';
  if (cards) cards.style.display = tab === 'cards' ? 'flex' : 'none';
  document.querySelectorAll('[data-cjar-howto-tab]').forEach(b => {
    // .pill carries every structural style and must never come off — only the
    // active class is added or removed.
    b.classList.remove('pill-active-cjar');
    if (b.dataset.cjarHowtoTab === tab) b.classList.add('pill-active-cjar');
  });
  // Built on every switch INTO the tab, never once at load: CJAR_DATA arrives async, and
  // the Sylly blurbs differ by mode, so a gallery cached at boot would be wrong twice.
  if (tab === 'cards') cjarOpenCards();
}

// Opens How to Play on a chosen tab. Both entry points route through here so the tab
// state can never disagree with which body is showing.
function cjarOpenHowTo(tab) {
  cjarSetHowToTab(tab || 'rules');
  cjarOpenOverlay('cjar-how-to-overlay');
}

// ── Envelope handler ───────────────────────────────────────────────────────
// SYNC handlers APPLY the authoritative payload and render — they never re-resolve
// and never push a second trail entry the host already pushed.
function cjarHandleEnvelope(env) {
  const p = (env && env.payload) || {};
  const senderIdx = () => mpPlayerSlots.findIndex(s => s.uid === env.originId);

  if (env.type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;
    switch (p.action) {
      case 'CJAR_CHOICE':
        // Re-validated host-side: a stale flipSeq is silently dropped, so an
        // in-flight packet from a flip that has already resolved cannot resolve
        // it a second time (the PKO BUG-01 class). An unknown sender gives -1,
        // which cjarApplyChoice's bounds check rejects.
        if (cjarApplyChoice(senderIdx(), p.choice, p.flipSeq)) {
          cjarRenderTable();
          if (cjarAllIn()) cjarHostResolveFlip();
        }
        break;
      case 'CJAR_PLAYER_LEFT':
        // One player leaving dissolves the match. With a flip every ~9-15 s, a seat
        // that will never submit stalls the table immediately. resetToLobby()
        // broadcasts HOST_END_GAME and the existing mp-host-disconnected-overlay
        // handles the remaining clients — the GTH/DYB/BLD contract.
        resetToLobby();
        break;
    }
    return;
  }

  switch (p.action) {
    case 'CJAR_MATCH_START':
      cjarSnackFriendly = p.snackFriendly; cjarHouseRules = p.houseRules;
      cjarMatchLength = p.matchLength; cjarOpenBook = p.openBook; cjarSyllyMode = p.sylly;
      cjarDecisionTime = p.decisionTime || 'standard';
      cjarPlayerNames = cjarWireList(p.playerNames);
      if (!cjarPlayerNames.length) cjarPlayerNames = mpPlayerSlots.map(s => s.nickname);
      cjarPlayerCount = cjarPlayerNames.length;
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarTreatsWon = cjarWireArr(p.treatsWon, cjarPlayerCount, 0);
      cjarFamilyCopies = cjarWireObj(p.familyCopies); cjarRaidHistory = [];
      cjarMyFavourite = null; cjarMyWatcher = null;
      break;

    case 'CJAR_AFFINITY':                       // private — this device only
      cjarMyFavourite = p.favourite;
      cjarMyWatcher   = p.watcher;
      break;

    case 'CJAR_RAID_START':
      cjarRaidNo = p.raidNo;
      cjarSeen = cjarWireObj(p.seen); cjarCrumbs = p.crumbs || 0;
      cjarCounterTreat = p.counterTreat || null;
      cjarTrail = cjarWireList(p.trail);
      cjarRaidTotals = cjarWireArr(p.raidTotals, cjarPlayerCount, 0);
      // Dibber Dobber deliberately has no cjarActive at all (BUG-05), so an empty
      // payload there means empty — not "everybody left".
      cjarActive = cjarIsSylly() ? [] : cjarWireArr(p.active, cjarPlayerCount, false);
      cjarCrumbDebt = cjarWireArr(p.crumbDebt, cjarPlayerCount, 0);
      cjarChoices = cjarWireArr(p.choices, cjarPlayerCount, null);
      cjarReadyCheck = cjarWireArr(p.readyCheck, cjarPlayerCount, false);
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarHighAlertId = p.highAlertId || null;
      cjarFamilyCopies = cjarWireObj(p.familyCopies);
      cjarDeck = new Array(p.deckCount || 0).fill(null);   // count only; contents host-side
      cjarShowRaidIntro(() => {});                    // client just watches it pass
      break;

    case 'CJAR_FLIP_START':
      cjarFlipSeq = p.flipSeq || 0; cjarCard = p.card || null;
      cjarDeck = new Array(p.deckCount || 0).fill(null);
      cjarCrumbs = p.crumbs || 0; cjarSeen = cjarWireObj(p.seen);
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarRaidTotals = cjarWireArr(p.raidTotals, cjarPlayerCount, 0);
      cjarActive = cjarIsSylly() ? [] : cjarWireArr(p.active, cjarPlayerCount, false);
      cjarCounterTreat = p.counterTreat || null; cjarTrail = cjarWireList(p.trail);
      // Reset values travel explicitly — and are rebuilt here, because the wire
      // erases the very shapes a reset value takes.
      cjarChoices = cjarWireArr(p.choices, cjarPlayerCount, null);
      cjarReadyCheck = cjarWireArr(p.readyCheck, cjarPlayerCount, false);
      cjarDeltas = []; cjarLines = [];
      cjarTablePhase = (!cjarIsSylly() && !cjarActive[mpMyPlayerIdx]) ? 'spectating' : 'deciding';
      mpUnlockSync();
      cjarRenderTable();
      // `windowMs` is absent on a No Rush flip (null is erased by the wire) — which is
      // exactly the signal cjarStartTimer needs to hide the bar rather than freeze it.
      cjarWindowMs = p.windowMs || null;
      cjarStartTimer(p.endTimestamp || 0, cjarWindowMs);
      showScreen('screen-cjar-table');
      break;

    case 'CJAR_FLIP_RESOLVE':
      cjarStopTimer();
      // Delta 7: in Dibber Dobber this is the FIRST time the client sees the card —
      // FLIP_START carried null because the window was blind.
      cjarCard = p.card !== undefined ? p.card : cjarCard;
      cjarChoices = cjarWireArr(p.choices, cjarPlayerCount, null);
      cjarDeltas = cjarWireArr(p.deltas, cjarPlayerCount, 0);
      cjarLines = cjarWireArr(p.lines, cjarPlayerCount, '');
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarRaidTotals = cjarWireArr(p.raidTotals, cjarPlayerCount, 0);
      cjarActive = cjarIsSylly() ? [] : cjarWireArr(p.active, cjarPlayerCount, false);
      cjarCrumbs = p.crumbs || 0;
      cjarCrumbDebt = cjarWireArr(p.crumbDebt, cjarPlayerCount, 0);
      cjarCounterTreat = p.counterTreat || null;
      cjarTreatsWon = cjarWireArr(p.treatsWon, cjarPlayerCount, 0);
      cjarTrail = cjarWireList(p.trail); cjarFamilyCopies = cjarWireObj(p.familyCopies);
      cjarHighAlertId = p.highAlertId || null;
      cjarTablePhase = 'revealing';
      mpUnlockSync();
      if (p.bustFamilyId) {
        playBoing();
        cjarShowBusted(p.bustFamilyId, p.bustLine, () => {});
        break;
      }
      cjarRenderTable();
      cjarFlyDelta(cjarDeltas[mpMyPlayerIdx]);
      break;

    case 'CJAR_RAID_END':
      cjarRaidNo = p.raidNo;
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarTreatsWon = cjarWireArr(p.treatsWon, cjarPlayerCount, 0);
      cjarRaidHistory = cjarWireList(p.raidHistory).map(r => cjarWireArr(r, cjarPlayerCount, 0));
      cjarFamilyCopies = cjarWireObj(p.familyCopies);
      cjarHighAlertId = p.highAlertId || null;
      cjarShowRaidSummary(cjarWireArr(p.banked, cjarPlayerCount, 0));
      break;

    case 'CJAR_MATCH_END':
      cjarStashes = cjarWireArr(p.stashes, cjarPlayerCount, 0);
      cjarTreatsWon = cjarWireArr(p.treatsWon, cjarPlayerCount, 0);
      cjarRaidHistory = cjarWireList(p.raidHistory).map(r => cjarWireArr(r, cjarPlayerCount, 0));
      cjarShowGameover();
      break;
  }
}
// Cookie Jar's content is a fixed deck, not a word pool — the practical override
// surface is the flavour pools and treat names only. No pool-refill path exists.
function cjarApplyExpansionOverrides() {
  if (!window.isSecretMode || !window.activeExpansionOverrides || !CJAR_DATA) return;
  const o = window.activeExpansionOverrides.cjar;
  if (!o) return;
  if (o.family) {
    CJAR_DATA.family.forEach(f => {
      const sub = o.family[f.id];
      if (!sub) return;
      if (sub.name) f.name  = sub.name;
      if (sub.emoji) f.emoji = sub.emoji;
      // The >= 4 floor is the same one the deck harness asserts: fewer than four
      // lines and a 5-Raid match repeats itself every time. A short override pool
      // is ignored rather than accepted, so a bad pack degrades to the real copy.
      if (Array.isArray(sub.warn) && sub.warn.length >= 4) f.warn = sub.warn;
      if (Array.isArray(sub.bust) && sub.bust.length >= 4) f.bust = sub.bust;
    });
  }
  if (o.treats) {
    CJAR_DATA.treats.forEach(t => { if (o.treats[t.id]) t.name = o.treats[t.id]; });
  }
}

// Called from resetToLobby(). Every one of the four handles is also cleared in the
// quit-confirm path (via resetToLobby) and on any early phase transition.
function cjarResetState() {
  if (cjarTimerHandle)        { clearInterval(cjarTimerHandle);       cjarTimerHandle = null; }
  if (cjarRevealHandle)       { clearTimeout(cjarRevealHandle);       cjarRevealHandle = null; }
  if (cjarHostTimeoutHandle)  { clearTimeout(cjarHostTimeoutHandle);  cjarHostTimeoutHandle = null; }
  if (cjarInterstitialHandle) { clearTimeout(cjarInterstitialHandle); cjarInterstitialHandle = null; }
  cjarRaidNo = 0; cjarStashes = []; cjarTreatsWon = []; cjarRaidHistory = [];
  cjarDeck = []; cjarCrumbs = 0; cjarCounterTreat = null; cjarTrail = [];
  cjarChoices = []; cjarReadyCheck = []; cjarEndTimestamp = 0; cjarFlipSeq = 0;
  cjarWindowMs = null; cjarLastHeroKey = null; cjarLastTrailLen = 0;
  cjarRaidTotals = []; cjarActive = []; cjarSeen = {}; cjarHighAlertId = null;
  cjarFavourite = []; cjarWatcher = []; cjarCrumbDebt = [];
  cjarMyFavourite = null; cjarMyWatcher = null;
  cjarRaidOpenStashes = []; cjarLinesUsed = {};
  cjarTablePhase = 'deciding';
}

// ── Wiring ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // cjar's HTML sits AFTER the <script> block, so engine.js's parse-time
  // querySelectorAll never reached these. FRT is the reference implementation.
  document.querySelectorAll(
    '#screen-cjar-menu .btn-open-sound, #screen-cjar-table .btn-open-sound, ' +
    '#screen-cjar-raid-summary .btn-open-sound, #screen-cjar-gameover .btn-open-sound'
  ).forEach(btn => btn.addEventListener('click', openSoundOverlay));

  on('btn-cjar', () => { playLaunch(); activeGameId = 'cjar'; cjarLoadData(); cjarShowMenu(); });

  // Pre-lobby this opens the mode screen — the only path that runs now that
  // onPassThePhone goes straight into Raid 1. The multiplayer branch is kept as a
  // defensive fallback (FRT/SHP/FLW/PKO all keep theirs the same way): if this menu
  // is ever reachable again post-lobby, it must start the match, not re-host.
  on('btn-cjar-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') cjarStartMatch();
    else mpShowModeScreen('cjar');
  });
  on('btn-cjar-menu-back', () => { playExit(); resetToLobby(); });

  // Mid-game ✕ → quit overlay. MDLM contract: confirm goes to resetToLobby(),
  // NOT the game menu — a client leaving must dissolve the match (spec §11).
  document.querySelectorAll('.btn-cjar-quit-open').forEach(btn =>
    btn.addEventListener('click', () => {
      playDone();
      document.getElementById('cjar-quit-overlay').style.display = 'flex';
    }));
  on('btn-cjar-quit-cancel', () => {
    playDone();
    document.getElementById('cjar-quit-overlay').style.display = 'none';
  });
  on('btn-cjar-quit-confirm', () => {
    playExit();
    document.getElementById('cjar-quit-overlay').style.display = 'none';
    // A client leaving silently would leave the table waiting forever on a seat
    // that will never submit — and with a flip every ~9–15 s that stall is instant.
    if (window.syllyMultiplayerMode === 'client') {
      try { mpSendEnvelope({ type: 'ACTION', payload: { action: 'CJAR_PLAYER_LEFT' } }); } catch (_) {}
    }
    resetToLobby();
  });

  // Post-game ✕ and "Leave the Jar" both go straight out — the game is over,
  // there is no state left to preserve.
  on('btn-cjar-go-exit',  () => { playExit(); resetToLobby(); });
  on('btn-cjar-go-leave', () => { playExit(); resetToLobby(); });

  // Play again ALWAYS goes through the confirmation modal — never restarts directly.
  on('btn-cjar-go-new', () => {
    playDone();
    const btn = document.getElementById('btn-cjar-new-confirm');
    btn.textContent = window.syllyMultiplayerMode === 'client' ? 'Leave Session' : 'Restart in Lobby';
    document.getElementById('cjar-new-raid-overlay').style.display = 'flex';
  });
  on('btn-cjar-new-cancel', () => {
    playDone();
    document.getElementById('cjar-new-raid-overlay').style.display = 'none';
  });
  on('btn-cjar-new-confirm', () => {
    playLaunch();
    document.getElementById('cjar-new-raid-overlay').style.display = 'none';
    mpReturnToLobby();   // host broadcasts LOBBY_RESET; client calls resetToLobby()
  });

  on('btn-cjar-next-raid', () => {
    // Host-only. An absent broadcast branch does NOT stop a client running this
    // locally and diverging until the next SYNC — the guard is what stops it.
    if (window.syllyMultiplayerMode === 'client') return;
    playLaunch();
    cjarStartRaid();
    cjarBroadcastRaidStart();
    cjarSendAffinities();          // Raid 2+ gets a fresh pair dealt too
    cjarShowRaidIntro(() => cjarHostNextFlip());
  });
  on('btn-cjar-menu-how-to',    () => { playDone(); cjarOpenHowTo('rules'); });
  on('btn-cjar-how-to',         () => { playDone(); cjarOpenHowTo('rules'); });
  on('btn-cjar-summary-how-to', () => { playDone(); cjarOpenHowTo('rules'); });
  // The game menu no longer has its own "See the Cards" button — with the gallery living
  // inside How to Play (DD-14), a second entry point on the menu was a redundant fifth
  // button on a screen the Universal Menu Standard fixes at four. The offline install
  // check now reads: How to Play → The Cards tab.
  document.querySelectorAll('[data-cjar-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); cjarSetHowToTab(b.dataset.cjarHowtoTab); });
  });
  on('btn-cjar-family-tip', () => {
    playDone();
    // Copy is MODE-AWARE and matches what the strip can actually show. The base game
    // has only two live states — seen-once IS the danger state, because the next
    // sighting busts (impl-notes TG-06). Describing a middle "lit" rung would teach a
    // state that never renders.
    cjarShowTip('👪', 'The Family', cjarIsSylly()
      ? ['Dim = haven’t turned up this Raid.',
         'Lit = they’ve already been past once.',
         'Nobody busts in Dibber Dobber — it’s your Favourite and Watcher that bite.']
      : ['Dim = haven’t seen them this Raid.',
         'Red = they’ve caught you once. One more and it’s BUSTED!',
         'A gold ring means there’s a fourth copy of them in the deck.']);
  });
  // Stage band 1 — Crumbs. Static markup now rather than a button built inside
  // cjarRenderPrivateStrip, because Crumbs moved out of that strip and onto the Stage.
  on('btn-cjar-crumbs-tip', () => {
    playDone();
    const lines = ['Leftovers that wouldn’t split evenly.', 'Sneak Out alone and you take the lot.'];
    if (cjarIsSylly()) lines[1] = 'A Dobber about the place and nobody’s touching them this flip.';
    cjarShowTip('🍪', 'Cookie Crumbs', lines);
  });
  // Stage band 3 — the history label IS the affordance; the strip itself must stay a
  // clean scroll container (a click handler on it fights the swipe that scrolls it).
  on('btn-cjar-trail-open', () => { playDone(); cjarOpenTrail(); });

  on('btn-cjar-menu-settings', () => { playDone(); cjarSyncSettingsUI(); cjarOpenOverlay('cjar-settings-overlay'); });
  on('btn-cjar-settings-close', () => {
    playDone();
    document.getElementById('cjar-settings-overlay').style.display = 'none';
  });
  // One close per tab — each body scrolls independently, so each needs its own button
  // at the bottom of its own scroll region.
  ['btn-cjar-howto-close', 'btn-cjar-howto-close-cards'].forEach(id => on(id, () => {
    playDone();
    document.getElementById('cjar-how-to-overlay').style.display = 'none';
  }));

  document.querySelectorAll('[data-group^="cjar-"]').forEach(pill => {
    pill.addEventListener('click', () => {
      // In MDLM every setting is host-owned; a client's overlay is read-only. They
      // may still OPEN it to read the rules.
      if (window.syllyMultiplayerMode === 'client') return;
      playPillClick();
      const group = pill.dataset.group, val = pill.dataset.val;
      // Only pill-active-cjar is added or removed — the .pill base class carries
      // every structural style and must NEVER come off.
      document.querySelectorAll(`[data-group="${group}"]`)
        .forEach(p => p.classList.remove('pill-active-cjar'));
      pill.classList.add('pill-active-cjar');
      if (group === 'cjar-snack')  cjarSnackFriendly = val;
      if (group === 'cjar-house')  cjarHouseRules    = val;
      if (group === 'cjar-length') cjarMatchLength   = parseInt(val, 10);
      if (group === 'cjar-time')   cjarDecisionTime  = val;
      cjarSyncSettingsUI();   // repaint the value line under the group that just changed
    });
  });

  on('btn-cjar-openbook-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    playPillClick();
    cjarOpenBook = !cjarOpenBook;
    cjarSyncSettingsUI();
  });
  on('btn-cjar-sylly-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    cjarSyllyMode = !cjarSyllyMode;
    if (cjarSyllyMode) playSyllyOn(); else playSyllyOff();
    cjarSyncSettingsUI();
  });

  on('btn-cjar-trail-close', () => {
    playDone();
    document.getElementById('cjar-trail-overlay').style.display = 'none';
  });
  on('btn-cjar-tip-close', () => {
    playDone();
    document.getElementById('cjar-tip-overlay').style.display = 'none';
  });
});
