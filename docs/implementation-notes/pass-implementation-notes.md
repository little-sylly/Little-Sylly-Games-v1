# Pass (PASS) — Implementation Notes

## Design Decisions

**Seat order = join order (no shuffle)**
Pass has no hidden roles — all players see the same information about rank structure. Join order is therefore fair and predictable without a shuffle. Deviation from DYB/BLD random seat allocation, which was necessary there because those games have secret role assignments. Logged in tech spec §17.

**Abyss as inline strip, not overlay**
The Sylly Mode Abyss pool is rendered as a horizontal-scroll strip on `screen-pass-table`, not as a slide-up overlay or decision modal. Lesson from DYB BUG-05: overlays that fire mid-gameplay create ghost interceptors — taps intended for game controls hit the overlay backdrop instead. Inline keeps the Abyss visible without interrupting gameplay.

**`window.Cards` module (`js/lib/cards.js`)**
Introduced as the first suite-wide card rendering library, following the `canvas-draw.js → window.CanvasDraw` precedent. Public API: `Cards.buildEl(cardData)` / `Cards.buildBackEl(deckIdx)`. The data model `{ rank, suit, deckIdx }` is rendering-agnostic — any future swap from SVG to image assets changes only the internals of `Cards.buildEl()`, not any calling code.

**Joker `suit` field = `''` not `null`**
Firebase Realtime Database strips `null` fields from objects on write. A Joker stored as `{ rank: 'Joker', suit: null }` arrives at clients as `{ rank: 'Joker' }`, breaking `suit` checks. Stored as `''` (empty string) throughout. This is the same null-stripping constraint documented for GTH delta encoding.

**`PASS_ABYSS_DRAFT` unified packet**
A single SYNC packet covers all three Abyss draft triggers (detonation, round-win, fracture) via a `trigger` field. Originally three separate packet types were specced — collapsed to avoid redundant handler branching. Trigger values: `'detonation'` | `'round-win'` | `'fracture'`.

**Round-end trigger: `hand.length === 0` only**
A full-circuit pass (everyone passes) clears the table but does NOT end the round — it's a table-clear only. The round ends solely when a player's hand reaches length 0. This distinction is critical: the early spec draft incorrectly described full-circle-pass as a potential round-end trigger.

**`screen-pass-table` migrated to the Stack (26 June 2026)**
The table screen was the last PASS screen still on the legacy `h-screen overflow-hidden` sticky-footer layout (header + opponents + combo + abyss + status all `flex-shrink-0`, the hand the lone `flex-1 overflow-y-auto min-h-0` body, action buttons a `flex-shrink-0` footer). On a phone the stacked fixed zones starve the hand's `flex-1` band down toward zero height, so cards render into a clipped/near-invisible strip — the "table shows nothing after cards played" symptom in playtesting. Migrated to the centred **Stack** (`<section class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">` → one `flex flex-col w-full max-w-sm gap-4` column; Header / Stage / Controls as siblings; whole-Stack vertical scroll). All element IDs and JS render code (`passRenderTable`/`passRenderHand`/`passRenderAbyss`) unchanged — pure markup change. This migration accompanied the project-wide decision to make the Stack the single screen-layout standard (`ui-style.md` § The Stack) and to deprecate the sticky-footer pattern for new screens (the owner chose whole-Stack scrolling over a docked footer even for long card hands, prioritising consistency). The other three PASS screens (seating/round-wrap/gameover) were already Stack-compliant. SW → v127.

---

## Bug Index

**BUG-01 — Abyss never detonates mid-trick (Sylly Mode core mechanic incomplete)** *(found: Phase 3 audit, 14 June 2026)*
- **What happened:** The headline Sylly Mode mechanic — "play a Bomb or Sequence and the Abyss detonates, dealing its cards clockwise to opponents" (how-to overlay + `game-identities.md`) — only fires when the Bomb/Sequence *also empties the player's hand* (the round-winning play). A Bomb/Sequence played mid-trick (hand not emptied) does nothing to the Abyss; it just keeps growing on passes until a Fracture (13 cards).
- **Root cause:** `passResolveAbyssDetonation()` is only called from the `hand.length === 0` branch of `passProcessPlay()` (round-win) and from `passHandleAbyssFracture()` (fracture). The comment in `passProcessPlay` ("Abyss mid-trick detonation: table cleared by Bomb or Sequence") flags the intent, but no code implements a mid-trick detonation check. The `'detonation'` trigger value documented under the `PASS_ABYSS_DRAFT` design decision is consequently never sent (only `'round-win'` and `'fracture'`).
- **Lesson:** When a Sylly mechanic's headline trigger ("play X → Y happens") is described in the how-to, the per-play processing function (not just the round-resolution path) must check for it. Detonation belongs in `passProcessPlay` immediately after a valid Bomb/Sequence is laid, gated on `passSyllyMode && passAbyss.length > 0`, with the playing player exempt.
- **RESOLVED (15 June 2026):** Fixed *and re-modelled*. On owner clarification the trigger was changed from combo-type ("Bomb or Sequence played") to **trick resolution** — combo type is now irrelevant. Three triggers: (1) **trick clears** (full-circle pass) → `passProcessPass()` detonates exempting the trick winner (`passTableLeaderIdx`, captured before reset), folded into the existing `PASS_TURN_RESULT` packet via a new `abyssDraft:{order,cards}` field (no extra packet / pause — trick-clear is frequent); (2) **round win** → `passProcessPlay()` detonates on *any* winning combo (gate `detonatingTypes.has(...)` removed), distributing before scoring via `PASS_ABYSS_DRAFT trigger:'round-win'`; (3) **fracture** at 13 (unchanged). Also removed the now-dead `passLastWinningCombo` state and the stale "mid-trick detonation" comment. How-to overlay (both cards) + `game-identities.md` (Detonation term, Sylly bullet, packet table) updated to match. The originally-planned mid-trick "Bomb/Sequence detonates" behaviour was *not* implemented — the trick-resolution model supersedes it.
- **Bonus fix (same pass):** corrected a pre-existing off-by-one in the Mid-Game-Draw talon: the full-circle-clear branch computed `trickWinner = (playerIdx + 1) % passPlayerCount` (one seat past the real winner); now uses the captured `passTableLeaderIdx`. The talon draw and the Abyss exemption share this corrected trick-winner.
- **CORRECTION (15 June 2026) — combo-class gate added:** The trick-resolution model above was *partly* a terminology error on the owner's side: "trick" had been used to mean "Bomb/Sequence", and the first re-model over-corrected by detonating on *every* trick resolution regardless of combo. The owner then defined the real model precisely: detonation is gated on a **combo class**, not on every trick.
  - **Standard Combos** = Single, Pair → keep a trick quiet; never detonate, even on a winning play (a Single/Pair that empties the hand ends the match peacefully, no draft).
  - **Detonation Combos** = Triplet, Quad, Double Joker, Sequence, Double Sequence → the only combos that detonate the Abyss when they win a trick or empty a hand.
  - Implemented as module-level `const PASS_DETONATION_TYPES = new Set([...])` + `passIsDetonationCombo(combo)` helper (promoted from the local `isBomb` arrow pattern in the validate fn). Both detonation sites now gate on it: round-win on the played `combo`; trick-clear on `winningCombo` (= `passTableCombo` captured before reset). Fracture is unchanged (combo class irrelevant). The trick-winner exemption and the talon off-by-one fix are unchanged.
- **Lesson (revised again):** Confirm the *taxonomy* before wiring a gated mechanic. The first re-model removed the combo gate entirely on the strength of one ambiguous sentence; the gate was always the point — the ambiguity was only in the word "trick". When a trigger is "play X → Y", pin down exactly which X's qualify (a named set) before coding, and prefer a single named predicate (`passIsDetonationCombo`) over an inline type check so every call site stays in sync.

**BUG-02 — Client `passRoundsWon` tally resets to zero every round** *(found: Phase 3 audit, 14 June 2026)*
- **What happened:** On a client device, the "N rounds won" subline on the gameover screen is wrong — it only reflects the most recent round, not the cumulative total.
- **Root cause:** `passStartRound()` broadcasts `PASS_GAME_START` at the start of *every* round (round 1 and via the host's "Next Round" button). The client `PASS_GAME_START` handler runs `passRoundsWon = Array(passPlayerCount).fill(0)` — correct for a match start, but it also wipes the tally at the start of rounds 2+. The host never resets `passRoundsWon` in `passStartRound()`, so the host stays accurate; only clients diverge. Compounding it, the client `PASS_ROUND_END` handler passes its *local* `passRoundsWon` to `passShowGameover()` and ignores the authoritative `payload.roundsWon` the host sends.
- **Lesson:** A "deal a new round" packet must not share an initialiser with the "start a new match" packet when the two have different reset scopes. The intended per-round packet (`PASS_NEXT_ROUND`, whose handler correctly does *not* touch `passRoundsWon`) exists but was never wired — the host shortcuts to `PASS_GAME_START` for every round. Fix: either broadcast `PASS_NEXT_ROUND` for rounds 2+, or stop zeroing `passRoundsWon` in the `PASS_GAME_START` handler and have the client gameover consume `payload.roundsWon`.
- **Severity:** [BUG] — display-only (chips are authoritative via payload; rounds-won is the secondary tie-break in the client's local sort). Logged to fix plan.
- **RESOLVED (15 June 2026):** Took the minimal option (b) — kept the single `PASS_GAME_START`-per-round packet flow (and the hand-broadcast behaviour) unchanged. Two surgical edits in the client SYNC handlers: (1) the `PASS_GAME_START` handler now guards the tally reset on `(payload.roundNum || 1) === 1`, so it zeroes `passRoundsWon` only at a true match start and preserves the running count on rounds 2+ (the client's `PASS_ROUND_END` handler keeps incrementing it correctly); (2) the `PASS_ROUND_END` gameover branch now consumes the authoritative `payload.roundsWon || passRoundsWon` instead of the local array. Option (a) — wiring the orphaned `PASS_NEXT_ROUND` for rounds 2+ — was rejected as larger scope: its handler also switches opponent hands from full-array to placeholder, a behaviour change unrelated to this bug. The `PASS_NEXT_ROUND` / `PASS_GAMEOVER` dead handlers remain (separate [POLISH] item). SW bump deferred to the batch at the end of the fix-plan pass.

**BUG-03 — Host device never updates after any action (stale table, stuck on round win)** *(found: post-Phase-34 backlog testing, 21 June 2026)*
- **What happened:** Three symptoms, all on the host device: (1) the played combo / table never appeared to update ("can't see the played cards"); (2) after a valid play the card did not leave the host's hand; (3) after emptying their hand to win a round, the host was stranded on `screen-pass-table` ("stuck on the player initiating").
- **Root cause:** `passProcessPlay` / `passProcessPass` / `passProcessPassAfterAbyss` / `passBroadcastRoundEnd` only re-rendered/navigated in the **single-device** branch. In the MP branch they broadcast the resolving SYNC (`PASS_TURN_RESULT` / `PASS_ROUND_END`) and returned. But the host is a participant, and `engine-multiplayer.js` drops every self-sent envelope (`originId === syllyDeviceUid`), so the host never receives its own SYNC — its screen was only ever updated by `passStartRound()` at deal time. Every subsequent action (its own *and* any client's action it processed) left the host's UI frozen.
- **Lesson:** The "host is also a player" trap from the MDLM patterns applies to *rendering*, not just readyCheck submission. Any host code path that resolves state and broadcasts a SYNC must also apply the visible result locally — the SYNC handler runs on clients only. Mirror the SYNC handler's navigation in the host's resolve path.
- **Fix:** Added `passShowTable()` to all four host MP turn branches (and set `passCurrentPlayerIdx` in the full-circle table-clear branch, which previously only advanced it in the single-device path). `passBroadcastRoundEnd` now mirrors the `PASS_ROUND_END` SYNC handler locally — `passShowGameover(...)` on match over else `passShowRoundWrap(...)` — without re-incrementing `passRoundsWon` (already incremented in `passResolveRound`).
- **Related — BUG-04 (client played card stays in hand):** A client's own played cards never left its hand either: the `PASS_TURN_RESULT` handler keeps the acting player's own hand authoritative (`i === mpMyPlayerIdx ? return h`) and the host only mutates *its* copy of the client's hand, so the client's local hand was never trimmed. Fixed by optimistically splicing the played indices from the client's own hand at submit time in `passSubmitPlay` (the client already ran the identical `passIsValidPlay` validation, so host rejection cannot occur). Both fixed together; SW → v106.

**[POLISH] Dead SYNC handlers `PASS_NEXT_ROUND` + `PASS_GAMEOVER`** *(found: Phase 3 audit, 14 June 2026)*
- Both have branches in `passHandleEnvelope` but are never broadcast (confirmed by cross-file grep). Rounds 2+ reuse `PASS_GAME_START`; gameover is reached via `PASS_ROUND_END { matchOver: true }`. `PASS_NEXT_ROUND` is the packet that *should* be sent (see BUG-02). Resolving BUG-02 by wiring `PASS_NEXT_ROUND` would un-orphan that handler; `PASS_GAMEOVER` can be removed.

**[POLISH] Round-wrap + seating screens have no ✕ exit** *(found: Phase 3 audit, 14 June 2026)*
- `screen-pass-round-wrap` and `screen-pass-seating` carry only the speaker button — no ✕ / quit trigger. A non-host client waiting on "Waiting for the host..." at round wrap has no way to leave the session. Mirrors transient host-gated screens in other games; low priority, but violates the "speaker + ✕ on every screen" rule (Protocol A §4).

---

## Multiplayer Lessons

**`mpPlayerSlots[i].nickname` not `.name`**
The correct field name for player display names in the lobby roster is `.nickname` — `.name` does not exist and returns `undefined` silently. Reference: `engine-multiplayer.js` line 601 where slots are built. Same lesson as BLD Bug 8 (wrong `window.` prefix) — always grep the engine file to confirm field names before writing name-array code.

**Host-only seating screen**
`passShowSeating()` is called only on the host path in `onPassThePhone`. Clients skip directly to waiting for `PASS_GAME_START` SYNC. Standard MDLM pattern (DYB/GTH reference), but worth restating: any pre-game screen showing roster state is always host-only; clients should never render it independently.

---

## Template Gaps

**Card CSS scoping**
Card CSS classes (`.pass-card`, `.pass-hand-card`, `.pass-card-selected`, etc.) are Pass-specific despite living in `cards.js`. If a second card game is added, these styles will need to be reviewed for cross-game compatibility — the `pass-` prefix is intentional but future games may need their own visual variants (different card sizes, colours). Recommend keeping `pass-card` as the base class and adding game-specific modifier classes for future variants.

**No difficulty setting for card games**
The `logic-engine.md` checklist item "include a difficulty setting" assumes word bank games. Card games using a standard deck have no equivalent difficulty tier. The template should note this exception for non-word-bank games. Currently waived for Pass — no word bank used.

---

## Play Screen Polish Pass (26 June 2026)

Four UX improvements added to `screen-pass-table` to make the game legible in playtesting:

**Feature 1 — Dynamic Player Status Tracker**
Replaced the opponents card-back strip (`pass-table-opponents`) with a full horizontal player tracker (`pass-player-tracker`) showing ALL players (including "Me ★") in seat/turn order. Each node renders a short name + `🂠 N` card-count badge. The active player's node scales up (1.06×) and pulses with a zinc-900 outline animation (`.pass-player-active`); non-active nodes sit at 55% opacity (`.pass-player-inactive`). Chevron arrows `›` between nodes visualise turn flow. The tracker is rebuilt by `passRenderTable()` on every state update, so it is always current. CSS lives in `css/styles.css`; renderer rewritten in the tracker block of `passRenderTable()`.

**Feature 2 — Trick-grouped History Log (The Table Log)**
Added `pass-history-overlay` (z-[90], data slide-up) accessible via a `📋` button next to the table combo display. Opened by `passOpenHistoryOverlay()` → `passRenderHistoryOverlay()`. Groups plays by trick (sequence from fresh lead to full-circuit clear), most-recent trick first. Active in-progress trick shown at the top with an "Active" chip; cleared tricks labelled "Cleared". Each play row shows player name + combo label (or "Pass" in subdued style). Three new state variables: `passCurrentTrickPlays`, `passTrickLog`, `passCurrentTrickNum`. Three helpers: `passRecordPlay(playerIdx, combo)`, `passRecordPass(playerIdx)`, `passCompleteTrick(winnerIdx)`. Integration points: `passProcessPlay` (play recorded + trick completed on round win), `passProcessPass` (pass recorded + trick completed on full-circuit clear), SYNC handler (clients record from payload `action_type` + `trickWinner`). `pass-history-overlay` added to `resetToLobby()` teardown.

**Feature 3 — Hand Sorting + Dynamic Play Button**
All hands sorted lowest→highest (3→K→A→2→Joker) on deal via `passCardSortKey(card)`. Sort applied in `passStartRound()` (single/host) and in the `PASS_GAME_START` SYNC handler (clients). The "Play Selected" button (`btn-pass-play`) now uses opacity-based validity feedback instead of `disabled` (which was removed). After every card tap, `passUpdatePlayButton()` checks `passDetectCombo` + `passIsValidPlay` on the current selection and sets `btn-pass-play` opacity to `1` (valid) or `0.45` (nothing selected or invalid). The button remains untouched (`disabled` removed) so taps on an invalid selection still produce the shake/error-message feedback from `passSubmitPlay()`. `passUpdatePlayButton()` is also called from `passRenderTable()` to reset the button on every full render.

**Feature 4 — Action button balance**
Confirmed existing layout correct during design discussion — no changes required. "Play Selected" wide-dominant on the right, "Pass" smaller on the left.

**SW:** v129

---

## Play Screen Polish Pass 2 (26 June 2026)

Five bug fixes and one feature addition to `screen-pass-table`. SW → v130.

**BUG-05 — Trick does not clear until the table leader passes their own combo** *(found: playtesting)*
- **What happened:** In a 4-player game, after A lays a combo and B/C/D all pass in turn, the table does not clear — the game then awaits A passing their own combo before the trick clears, incorrectly giving the re-lead to B (not A).
- **Root cause:** `passProcessPass()` checked `passConsecPasses >= passPlayerCount`. After the last non-leader passes, consec reaches `passPlayerCount - 1` (e.g. 3 in a 4-player game), not `passPlayerCount`. The leader had to pass their own combo as pass #4 to trigger the clear. The correct threshold is `passPlayerCount - 1` (all OTHER players have passed consecutively).
- **Cascading effects:** (a) the wrong player received the open-table lead after the clear; (b) a player could pass on an open table because the pass counter would then hit the (incorrect) trigger, making an entirely separate "clear" fire with a wrong winner — see BUG-06 below.
- **Fix:** Changed `>= passPlayerCount` to `>= passPlayerCount - 1` in `passProcessPass()`. After the fix, `(playerIdx + 1) % n` naturally equals `passTableLeaderIdx` because the last passer is always the seat immediately before the leader in the clockwise circuit.

**BUG-06 — Passing permitted on an open table** *(found: playtesting)*
- **What happened:** When the table was open (leader's turn to play first), the Pass button was enabled and clickable. Submitting a pass on an open table corrupted the consecutive-pass counter, eventually triggering phantom trick-clears with the wrong winner.
- **Root cause:** `btn-pass-pass.disabled` only checked `!isMyTurn` — no check for `passTableCombo === null`. `passSubmitPass()` had no open-table guard either.
- **Fix:** `btn-pass-pass.disabled = !isMyTurn || passTableCombo === null;` in `passRenderTable()`. Added a guard in `passSubmitPass()` that calls `passShakeButton('btn-pass-pass')` and `passShowError('Open table — you must lead.')` when `passTableCombo === null`, then returns early.

**BUG-07 — Shake animation persists for the entire game after the first invalid play** *(found: playtesting)*
- **What happened:** After any invalid play attempt, the Play button shook continuously until the end of the game.
- **Root cause:** `passShakeButton()` calls `classList.add('shake')` but never removes the class. The global `.shake` CSS rule uses `animation: shake 0.55s ease-in-out infinite` — `infinite` keeps it running forever.
- **Fix:** Added `clearTimeout(el._shakeTimer); el._shakeTimer = setTimeout(() => el.classList.remove('shake'), 600);` in `passShakeButton()` after adding the class. One full animation cycle (600ms) plays then stops cleanly.
- **Note:** The `infinite` keyword in the global `.shake` class is shared across other games that manage it differently. The fix is in the caller, not the CSS.
- **Pattern to propagate:** Any game using `.shake` must pair `classList.add('shake')` with a timed `classList.remove('shake')` or an `animationend` listener. Failing to remove a persistent-animation class is a recurring trap.

**BUG-08 — Leftmost player node clipped at the tracker container edge** *(found: playtesting)*
- **What happened:** The leftmost player bubble in `pass-player-tracker` had its left border shadow and pulse animation clipped — the glow appeared to cut off mid-element.
- **Root cause:** `.pass-player-active` applies `box-shadow: 0 0 0 5px rgba(24,24,27,0.18)` (5px at its peak) and `transform: scale(1.06)`. Both extend beyond the element boundary. `overflow-x-auto` on the container clips any content extending past the scroll-port edge — no breathing room on the left side.
- **Fix:** Added `px-1 pt-1` to `#pass-player-tracker` in `index.html` so the leftmost node's shadow and scale have room to render without clipping.

**Feature — Active Play Arena** *(26 June 2026)*
- **What changed:** The flat text pod (`#pass-table-combo-display`, showing e.g. "Single — Alice") was replaced with a three-zone visual pod (`#pass-arena-pod`) that renders the actual played cards using `Cards.buildEl()`:
  - `#pass-arena-label` — combo type label in small-caps (0.6rem) anchored to top of pod
  - `#pass-arena-cards` — rendered card elements using `.pass-arena-card` sizing
  - `#pass-arena-leader` — player name in subdued 0.6rem text anchored below cards
  - Open-table state: label "Open Table", placeholder text "Lead anything." in stone-400
- **Overlap rules (negative `marginLeft` on cards[i>0]):** 0px (1 card), −4px (pair), −10px (3–4 cards), −14px (5–6 cards), −18px (7+). Cards sorted ascending by `passCardSortKey()` for left-to-right readability. Fine enough that rank/suit corner text remains readable at all combo sizes.
- **New state:** `passTableCards = []` stores the card objects currently on the table. Captured in `passProcessPlay()` from `passHands[playerIdx]` *before* the `splice` loop removes them. Cleared in `passStartRound()`, `passProcessPass()` on trick-clear, and `PASS_GAME_START` client handler.
- **SYNC propagation:** `tableCards` added to all three `PASS_TURN_RESULT` SYNC payloads: the valid-play path in `passProcessPlay`, the trick-clear path in `passProcessPass`, and the simple-pass path in `passProcessPass`. Also added to `passProcessPassAfterAbyss`'s SYNC. Client `PASS_TURN_RESULT` handler applies `passTableCards = payload.tableCards || []`.
- **New function:** `passRenderArena()` — called from `passRenderTable()` in place of the old text-block update. Reads `passTableCombo` and `passTableCards`; renders cards using `Cards.buildEl(card)` with `.pass-arena-card` added.
- **New CSS (css/styles.css):** `.pass-arena-card` (2.4rem × 3.4rem, `flex-shrink:0`, 0.55rem base font, 0.4rem border-radius), `.pass-arena-card .pass-card-center-suit` (0.9rem), `.pass-arena-card .pass-card-rank` (0.6rem). Placed immediately after the `.pass-abyss-card` block.

**SW:** v130

---

## Play Screen Polish Pass 3 (26 June 2026)

Four fixes from continued playtesting. SW → v131.

**BUG-08 (re-fix) — Leftmost player node still clipping after `px-1 pt-1` fix**
- **What happened:** The `px-1` (4px) left padding added in Polish Pass 2 was still not enough — the peak shadow is 5px and `scale(1.06)` on a ~40px node pushes 2px further out, requiring ~7px of breathing room on the left.
- **Fix:** Increased to `px-2 pt-2` (8px each side) so the pulse glow and scale have clear runway on both the left and top edges.

**BUG-09 — Firebase null stripping: `passTableCombo = undefined` after every trick clear; pass permitted on open table in MDLM**
- **What happened:** After a trick cleared in multiplayer, the arena permanently showed "Open Table / Lead anything." on all client devices, and the active player could pass on the open table — corrupting the consecutive-pass counter and causing phantom trick-clears.
- **Root cause:** Firebase Realtime Database silently strips `null` values from JSON objects on write. When `passProcessPass()` sent `PASS_TURN_RESULT { tableCombo: null }` for a trick-clear, clients received `payload.tableCombo = undefined`. The SYNC handler set `passTableCombo = undefined`, not `null`. All three `=== null` guards (`passRenderTable` button disable, `passSubmitPass` early-return, and `passProcessPass` guard added later) use strict equality and pass through `undefined`, leaving the table in a permanently-open state.
- **Root cause (compounding):** `passProcessPass()` itself had no guard at all — it accepted calls with an already-open table and immediately recorded the pass and incremented `passConsecPasses`, propagating the corruption before any SYNC was sent.
- **Fix:** Three changes: (1) `passTableCombo = payload.tableCombo ?? null` in the SYNC handler (null-coalescing guarantees `null` when Firebase strips the field); (2) all `=== null` checks changed to `== null` (catches both `null` and `undefined`); (3) guard added at the very top of `passProcessPass()`: `if (passTableCombo == null) return;` — the host rejects the call entirely before any state mutation.
- **Lesson:** When a state variable must be `null` (not `undefined`) to gate downstream logic, always use `?? null` when populating it from Firebase payloads. The broader rule is already documented in the Joker `suit` design decision — this bug proves it applies to *every* nullable field in every SYNC handler, not just schema-level choices.

**BUG-10 — Mid-game draw cards appear unsorted in the hand**
- **What happened:** With "Mid-Game Draw" on, cards dealt after a trick clear pushed to the right end of the hand array instead of their sorted position.
- **Root cause:** `passHands[drawP].push(drawn)` in `passProcessPass()` appends to the array but `passCardSortKey`-based sort is only applied at deal time (`passStartRound()`), not on incremental draws. The SYNC handler's `push` on the client side had the same gap.
- **Fix:** After the talon loop in `passProcessPass()`, added a post-draw sort for every player that received a card: `talonDraws.forEach(({ playerIdx: p }) => passHands[p].sort(...))`. In the client SYNC handler, after applying the player's drawn card, if `ownDrawn` a sort of `passHands[mpMyPlayerIdx]` is run. Same fix applied in the `PASS_ABYSS_DRAFT` handler for consistency.

**Feature — History log shows actual cards played**
- **What changed:** The trick-history log previously showed only the combo type label (e.g. "Single"). The play entry chip now shows a second subdued line with the actual cards (e.g. "♠2" or "♥K ♦K") directly beneath the combo label.
- **Implementation:** `passRecordPlay(playerIdx, combo)` gained a third `cards` parameter; `passCurrentTrickPlays` entries now carry `cards: []`. The call in `passProcessPlay` passes `passTableCards.slice()` (captured before splice). The client SYNC handler passes `payload.tableCards || []`. `passRenderHistoryOverlay` renders the cards line as `suit+rank` strings (Joker → "🃏") in a `text-stone-400 font-normal text-[0.65rem]` span beneath the combo label. No Firebase payload changes — `tableCards` was already sent in all `PASS_TURN_RESULT` packets from Polish Pass 2.
