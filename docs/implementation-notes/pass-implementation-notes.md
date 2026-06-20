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
