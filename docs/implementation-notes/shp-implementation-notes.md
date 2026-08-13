# Counting Sheep (shp) — Implementation Notes

Spec: `docs/new-game-tech-counting-sheep.md`. MDLM-only, host-authoritative, host-as-participant. Sylly Mode = Night Terrors (Climb ⇄ Plunge), built last.

---

## Design Decisions

- **Fresh full deck each Night (not a gather-and-reshuffle).** `shpDealNight()` builds a brand-new 62-card Flock via `shpBuildFlock()` every Night (game start and every Deep-Sleep redeal) rather than gathering existing hands+discard+flock. Functionally equivalent for an independent-Night game, and it guarantees card counts (incl. the 2 Wolves) are always whole — a Wolf consumed last Night reappears. Spec §10 described "gather all"; this is the cleaner equivalent. Mid-Night exhaustion is still handled by `shpReshuffleDiscard()`.
- **random-add cards are always playable gambles.** `shpIsPlayable` returns true for `kind:'random-add'` (Skip a Few, Fogged Dream) — they can't be pre-checked, so the player may always gamble them. Only deterministic `add` cards are blocked when they'd overshoot. "No legal line" therefore means: zero non-add safe cards, zero fitting adds, AND zero random-adds. A bust from a gamble routes the *current* player to Deep Sleep (reason `'busted'`).
- **Two-card legality uses best-case detection.** For Heavy Eyelids / Sleep Paralysis (`shpForcedCards === 2`), `shpHasSafePair` treats a `random-add` at its `min` (most favourable) when deciding whether a safe ordered pair exists — avoids false auto-crashes while still letting a genuinely stuck player Deep-Sleep. Edge (a): 1 card → degrade to single play. Edge (c): Heavy Eyelids played as one of the forced two does NOT chain (`shpForcedCards` reset to 1 after).
- **Deep Sleep redeal reuses `SHP_DEAL`.** The crash banner (`SHP_DEEP_SLEEP`) carries only lives/elimination info; the host's tap-to-continue (host-gated per §16 Q4) calls `shpDealNight()` which broadcasts a fresh `SHP_DEAL`. No separate "fresh hands" packet — simpler, and one deal code path.
- **Standings = `[winner, ...elimOrder.reversed()]`** — last eliminated is runner-up.

### Ghost system (chunk 4)
- **Legality generalised to `shpResultHerd` for ALL card kinds.** Originally only `add` cards were range-checked; everything else was "always playable." But Cold Feet (and later the Plunge) can push the Herd *above* the ceiling, at which point an unchanged-Herd card (Doze/reverse/Wide Awake/Heavy Eyelids) leaves you still busted — so it must be illegal. `shpIsPlayable` now compares the card's *resulting* Herd against `shpCeiling` for every deterministic kind; only reducers (subtract/reset/Black-Sheep) stay legal once over. `random-add` is playable only while `Herd ≤ ceiling` (pointless once over — guaranteed bust). This also makes the Plunge ceiling-drop legality work for free.
- **Synchronous turn-gate model for disruptions (no async buffer).** When a Pasture play fills the meter, the host opens the Lottery and the table *gates* on the spend-holder's blind pick (`shpGhostPending`); the chosen nightmare applies immediately — which IS "at the turn-gate," since the upcoming player hasn't acted yet — then `shpAfterAdvance` runs. Simpler than buffering a `shpPendingDisrupt` to fire later, and the effect lands exactly where intended (Cold Feet nudges the Herd before the next play, Sleep Paralysis forces the upcoming player's two-card, etc.). `shpPendingDisrupt` is left declared but unused.
- **Meter charges only once a Sleepwalker exists** (`shpElimOrder.length > 0`) — no ownerless disruptions; the meter UI is hidden until then.
- **Global Echo persists across Deep-Sleep redeals** (carried in `SHP_DEAL.echo`), cleared only when the *next* disruption fires (`shpEcho = 0` at the top of `shpHostResolveDisrupt`). `shpEffectiveAdd` adds `shpEcho` to every Pasture add (and the inline calc in `shpPairFinalBest` mirrors it).
- **Weighted Lottery confirmed:** 300-game sim fired Fog (weight 1) ~1,400× vs ~2,900× for the common nightmares (weight 3) — the cursed-card swap is reliably the rarest.

### Night Terrors / the Plunge (chunk 5)
- **One centralised herd-math function (`shpHerdAfterCard`).** Resolve, legality (`shpIsPlayable`), and two-card pair-simulation all route through it, so the Plunge sign-flip (arithmetic `kind ∈ {add,subtract,random-add}` negated; `set`/`reset` absolute) lives in exactly one place. `shpEffectiveAdd` and `shpResultHerd` were folded into it and deleted.
- **Plunge entry fires only on a PLAYER'S play reaching ≥99** (`shpPostResolve`), never on a ghost effect — keeps the descent decoupled from the Nightmare Meter (spec §12). Cold Feet can shove the Herd over 99 in Climb, but the next *play* is what trips the Plunge.
- **Climb+Sylly legality differs from Climb-base:** in Climb+Sylly, adds and random-adds are *always* legal because reaching ≥99 triggers the Plunge (never a bust); the overflow is intentional (selfish +1→99 snare vs co-op +10→104 runway). Climb-base keeps the strict "adds must fit" rule.
- **Ceiling descent at turn entry (`shpPlungeTick`)**, `shpPlungeGrace = shpPlayerCount` holds it for one full cycle, then `-= shpDrop` (7) each turn. Legality already compares to `shpCeiling`, so the squeeze works with no extra legality code.
- **Two exit paths, both reuse existing machinery:** a Plunge bust is just a normal Deep Sleep (−1 Moon + redeal), and `shpDealNight` resets `phase='climb'/ceiling=99`, so the Plunge exit is automatic. The mercy backstop (Herd driven to 0) calls `shpExitPlunge` directly — no Moon, no redeal, play continues in Climb.
- **Sync:** `phase`/`ceiling`/`grace` ride in `SHP_TURN_RESULT` (and `SHP_DISRUPT_RESOLVED`); clients detect a climb→plunge flip to raise the one-shot "THE PLUNGE BEGINS" flash. No separate `SHP_PHASE_CHANGE` packet was needed — folding it into the turn result is simpler (minor deviation from spec §12's suggested dedicated packet).
- **400-game sim (≈⅔ with Night Terrors on):** overflow runway held at every entry (ceiling ≥99), 31k Plunge entries, both bust and mercy exits fired thousands of times, all games terminated.

---

## Bug Index

- **Black Sheep bypassed the Plunge ceiling guard → unexpected moon loss.** *What happened:* In Plunge with a fallen ceiling (e.g. 92), playing Black Sheep (kind:'set', value:99) landed above the ceiling → bust → −1 Moon with no warning. *Root cause 1:* `shpHostPlayCard` guarded only `kind:'add'` — Black Sheep (kind:'set') skipped the legality check entirely. *Root cause 2:* `shpHerdAfterCard` 'set' case was absolute (h = c.value), ignoring the Plunge ceiling. *Fix:* Guard changed to `!shpIsPlayable(playerIdx, handIdx)` (all card kinds); 'set' case clamps in Plunge: `Math.min(c.value, shpCeiling)`. Lesson: the `shpIsPlayable` route should gate every card kind in `shpHostPlayCard`; never short-circuit to a single-kind check.

- **Wolf draw-trap aborted the initial deal → empty/under-dealt hands.** *What happened:* headless simulation (200 games) threw "no legal line but not auto-deep-slept"; a living opener had an empty hand at Herd 0. *Root cause:* `shpDrawUp` did `break` after consuming a Big Bad Wolf. That's right for a mid-game single-card refill (draw 1 to replace the played card) but wrong at the deal, where the player draws `shpHandSize` cards — a Wolf drawn early aborted the whole deal, leaving 0–N cards instead of the (reduced) cap. *Lesson:* the same draw-up routine serves both single refills and multi-card deals; use `continue` (re-evaluate the `while` against the reduced cap) instead of `break`. Mid-game it stops immediately (hand already at reduced cap); at deal it fills the shrunk hand. Spec §7's "stop drawing" was describing the single-draw case only.

---

## Multiplayer Lessons

### Post-launch fixes (same session)
- **MDLM quit-contract wired to the PASS reference.** Quit-confirm: client sends `SHP_PLAYER_LEFT` then `resetToLobby()`; host's `resetToLobby()` broadcasts `HOST_END_GAME`. Host handles `SHP_PLAYER_LEFT` → broadcasts `SHP_MATCH_DISSOLVED` → `resetToLobby()`; all clients on `SHP_MATCH_DISSOLVED` → `resetToLobby()`. One leaver dissolves the match — no ghost rooms (mirrors PASS/NT/FRT). This is the correct contract; the GTH/DYB/BLD game-menu divergence was NOT copied.
- **Table converted to Centered Content Layout (FRT BUG-02 solution).** `screen-shp-table` originally used the `h-screen` sticky-footer split (header / `flex-1` body with `my-auto` / footer). The herd stack read top-aligned, not centred. Fixed by switching to the section-level centred pattern (`flex items-center justify-center w-full min-h-screen overflow-y-auto` + one `max-w-sm` column holding header/body/footer as siblings) and removing `my-auto` from the render wrappers. The hand is short enough that it doesn't need a sticky footer. **Lesson (going forward):** default game screens to the Centered Content Layout; reserve `h-screen` sticky-footer for screens where a CTA genuinely must stay pinned regardless of content height. Already the documented rule (ui-style § Centered Content Layout / phase-audit mobile checks) — applied here.


- **Headless logic harness caught the Wolf bug before any browser.** A `vm.runInThisContext`-loaded copy of `shp.js` with stubbed DOM/engine globals auto-played 200 single-device games asserting invariants (termination, herd ≤ ceiling between turns, standings = permutation of seats). Cheap, fast, and found a deal-time edge that manual play would rarely hit (needs a Wolf as the opener's first deal card). Worth rebuilding for the ghost + Plunge chunks.
- **Host-as-participant + ACTION routing:** host processes its own taps directly (`shpHostPlayCard`); clients send `SHP_PLAY`; host resolves for `shpActivePlayer` (only the active player's device sends, so seat is unambiguous). Self-sent ACTIONs are dropped by the dedup guard — host never routes its own play through `mpSendEnvelope`.

---

### Polish pass (post-playtest)
- **Tap buffer on turn entry.** A 1-second `shpCardTapReady` gate fires when the active player's turn first activates (`shpTapReadyForPlayer !== me`). Prevents accidental card plays when a new SYNC arrives and the screen re-renders under a player's finger. State: `shpCardTapReady` (bool), `shpTapReadyTimer` (handle), `shpTapReadyForPlayer` (idx). Auto-resets when turn leaves the player.
- **Hand sorted by family.** `shpHandFooter` now sorts the display by `FAMILY_ORDER` (pasture→pillow→alarm→trap/phantom) while preserving original hand indices for `shpTapCard`. Wolf placeholder rendered after live cards when `shpWolfActive[me]`.
- **Long-press card info.** 500ms touchstart/mousedown via `shpBindCardHold` shows `shp-card-info-overlay` (z-[90], Decision Modal) with card name, family, and plain-English effect. Works on wolf placeholder (shows "slot locked" message). Wired to all cards and the wolf slot in `shpHandFooter`.
- **Waiting hand not hidden.** Non-active players (and active player during the tap buffer) see their cards at `opacity-40` — never hidden. No `shpWaitFooter` function needed; removed.
- **Plunge spike-trap herd display.** In Plunge, the herd box switches to a three-element vertical stack (red bg-red-50 container): ceiling at top descending → "X sheep left" gap label → Herd at bottom. Plunge reminder text promoted to `text-xs font-semibold text-red-500` inside the container.
- **Direction arrows.** "→ Forward" rendered above player chips, "↺ Reverse" below; whichever is active gets the brand colour (indigo/red), the inactive one is stone-300.
- **Status bar.** Shows "Night N" with night number; turns `text-red-500` in Plunge. Night counter increments in `shpDealNight`.
- **Moon cap.** Chip moon display caps at 5 emoji; 6+ renders as `🌙×N`.
- **Active chip in Plunge.** Active player chip switches to `bg-red-600` during Plunge.
- **Nightmare meter.** Wrapped in `bg-violet-50 border border-violet-200 rounded-xl` container; label promoted to `text-xs font-semibold`; dots to `text-lg`.
- **Ghost banner.** Names the spend-holder: `"💤 [Name] is picking a nightmare…"` instead of generic "A Sleepwalker".
- **Dream-shift banner.** Wrapped in `bg-violet-50 border border-violet-200 rounded-xl` container.
- **Deep Sleep screen.** Crash reason copy improved ("Gambled too high — the herd broke loose." / "No safe card to play — sleep claimed them."). Adds a sorted vertical moon-status list (most moons on top, Sleepwalkers at bottom) so all players can see standings after a crash.
- **Gameover sub-labels.** Non-winner rows show ordinal place ("2nd place", "3rd place", etc.).
- **Two-card bust hint.** In two-card mode, a hint line "Select two that won't break [ceiling] — a bad pair Deep Sleeps you." appears below the hand.
- **Two-card Play Both colour.** Play Both button uses `bg-red-600` during Plunge (was always indigo).
- **Dream Acceleration description fixed.** Settings card now reads: "Below 50, every Pasture card counts double — Skip a Few and other specials aren't affected." (previously implied random-adds also doubled).
- **How-to Wolf note added.** Step 2 now mentions: "The Big Bad Wolf hides in the Flock — draw one and a card slot locks for the Night."

### Post-playtest polish (this session)
- **Deck rebalanced — 62 → 71 cards.** Pasture count increased (12/12/10/8 = 42 total) to reduce hoarding. Three new subtract cards added (ids 14/15/16: −1/−2/−5, family `pillow`, kind `subtract`) alongside the existing −10 (9 playable subtracts total). Big Bad Wolves kept at 2. `SHP_DECK_COUNTS` updated; `SHP_CARDS` extended; `shpCardFaceLabel` updated to flip subtract signs in Plunge (−N → +N).
- **Plunge herd box updated.** "Ceiling 🔻 falling" label renamed to "The Sky is Falling 🔻" and a "−N/turn" sub-label added directly under the ceiling number.
- **Long-press card info is now Plunge-aware.** `shpShowCardInfo` now branches on `shpPhase === 'plunge'` for all card kinds — Pasture says "PLUNGE: reduces the Herd by N", subtract says "PLUNGE: increases the Herd by N", etc. Smart-quote encoding introduced in the previous session required a two-step fix: blanket replace curly quotes → straight, then convert apostrophe-in-single-quoted-string cases to double-quoted strings (lines 804, 860, 878–879).
- **Sheep jump animation.** When a Pasture or Black Sheep is played (Climb only), `shpAnimSheep` is set (1 per +1 value, capped at 8; Black Sheep = 7). `shpRenderTable` emits a row of `<span class="shp-sheep-jump">🐑</span>` with staggered 80ms delays via the `animation-delay` inline style. A 1500ms clear timer resets `shpAnimSheep` and re-renders. CSS `@keyframes shpSheepJump` (translateY 0→−12px→0, fade in/out) added to `styles.css`. Clients receive `shpAnimSheep` via `SHP_TURN_RESULT.played` — the SYNC handler rebuilds the count from the `played` array.
- **Play log.** `shpPlayHistory` array (newest-first, capped at 20) accumulates `{ cardIds[], rolledVal, byIdx, byName }` entries in `shpBroadcastTurn` and is serialised in `SHP_TURN_RESULT`. A "Last: [card] Log →" indicator appears below the herd box; tapping opens `shp-play-log-overlay` (data slide-up, z-[90]) via `shpOpenLog()`. Overlay inserted via Node.js script (avoiding Edit-tool mojibake). Close button wired in `DOMContentLoaded`. Teardown added to `shpResetState` and `engine.js resetToLobby()`.
- **Deep Sleep per-player confirm (MDLM ack readyCheck).** Host initialises `shpDeepSleepAckNeeded = shpPlayerCount`, `shpDeepSleepAcks = 1` (host counts itself) in `shpHostDeepSleep`. `SHP_DEEP_SLEEP` carries `acksNeeded`. Clients see a "Got it 😴" button → sends `SHP_SLEEP_ACK` ACTION; host handler increments `shpDeepSleepAcks` and calls `shpRenderDeepSleep()` to update the count. Continue CTA is locked (`bg-stone-200 cursor-not-allowed`) until `shpDeepSleepAcks >= shpDeepSleepAckNeeded`. Single-device: unchanged — direct Continue button, no counter. `shpIAcked` prevents double-submission per device. `playBoing()` moved to one-shot flag `info._boingPlayed` to avoid replaying on re-renders.

### Post-playtest polish — round 2 (30 June 2026, SW v138)
Seven playtest notes (3-player sessions) addressed in one pass:

- **Hand sort bug — Pillows were rendering leftmost instead of Pastures.** *Root cause:* the family-rank comparator used `FAMILY_ORDER[fam] || 2`, and `pasture`'s rank is `0` — falsy — so `0 || 2` pushed every Pasture card to rank 2 (behind Pillow's rank 1). *Fix:* `famRank()` now uses an explicit `undefined`/`null` check (not `||`). Added a numeric secondary sort (`numRank` = `c.value`, non-numeric → 99) so within a family cards read +1/+2/+5/+10 ascending. **Lesson:** never use `|| fallback` on a lookup whose valid first value is `0` — classic falsy-zero trap.
- **Card-info modal — tap-outside-to-close added.** A backdrop click listener on `#shp-card-info-overlay` dismisses when `e.target === overlay` (the "Got it" button still works). Scoped to the inspect modal only per the request.
- **Sheep animation reworked — no more layout jank.** The old `.shp-sheep-jump` row was an inline child of the herd column, so each play pushed a row in and then retracted it (header/footer visibly bounced). Replaced with an **absolutely-positioned overlay** (`.shp-sheep-layer` anchored top-centre of the counter; `.shp-sheep-fly` sheep) that arcs in from the left whitespace and lands in the counter — zero layout shift. New `@keyframes shpSheepArcIn`/`shpSheepArcOut`. Direction is data-driven: `shpStartSheepAnim(played, rolled)` computes the **net** Herd delta from the played cards (add/set positive, subtract negative, random-add uses `rolled`) → arc **in** when growing, **out** when counting backwards. Single shared helper runs identically on host and client (both read the synced `played`/`rolled`). Climb-only (Plunge keeps the spike-trap stack).
- **Deck rebalanced 71 → 73, pasture share 59% → ~66%.** Pastures bumped to 14/14/12/8 = 48; hoardable specials trimmed (Doze 4→3, Toss&Turn 4→3, Skip a Few 3→2, Wide Awake 2→1). Subtracts unchanged (−1/−2/−5 ×3 each, −10 ×1). Directly targets the "everyone hoards specials after a few rounds" complaint by diluting the special draw rate.
- **Counting-Backwards naming restored in the inspect modal.** Card faces still show just "−1/−2/−5/−10" (the visual the playtest liked), but `shpShowCardInfo` now names subtract cards "Counting Backwards −N" so the family reads clearly. Also relabelled id 6 from the wordy face label "Counting Backwards" to "−10" for visual consistency with 14/15/16 (it was already showing "+10" in Plunge — now consistent in both phases via `shpCardFaceLabel`).
- **Last-played / Dream Journal moved to the right whitespace.** The Climb herd display is now a `grid-cols-3` band: left spacer (sheep arc zone), centred counter, right column with "Last" on its own row and a "Dream Journal →" link below it (renamed from "Log →"). Play-log overlay title renamed "Play Log 📋" → "Dream Journal 📖". Plunge keeps the single centred indicator below the spike-trap stack (also relabelled "Dream Journal →").
- **Night Terrors drop softened + made fair across player counts (Option 3 — round-based escalation).** Flat `shpDrop = 7` was catching most players in the 70–80 band. Replaced with `SHP_DROP_BASE = 2` + `SHP_DROP_STEP = 2`: the ceiling falls **−2/turn for a full round of turns, then −4, then −6…** locked per round so every living player faces the same hazard before it tightens (`round = floor(shpPlungeDescentTurns / playerCount)`). New host-side `shpPlungeDescentTurns`; the applied `shpCurrentDrop` rides in `SHP_TURN_RESULT.drop` for the display ("steady…" during grace, "−N/turn" once descending). Reset in `shpEnterPlunge`/`shpExitPlunge`/`shpDealNight`/`shpResetState` + the client `SHP_DEAL` handler. **Lesson (Template Gap candidate):** any falling/escalating environmental hazard should lock its rate to a full player-round so fairness is player-count-independent — locking the rate per turn (not per round) silently advantages whoever sits earliest in the cycle.

### Phase-audit polish — sheep fence-jump arc (30 June 2026)
- **Sheep flight reads as a straight angled vector, not a graceful arc.** *Root cause:* `@keyframes shpSheepArcIn/Out` had only a single midpoint (55%); with `ease-in-out` the path collapsed to two straight legs (a "V"). *Fix:* rebuilt both keyframes as a proper parabola — `x` evenly spaced (25/50/75% → −97/−65/−33px) for steady horizontal travel, `y` apexing at 50% (−52px) for a symmetric arch — and switched `.shp-sheep-fly` timing-function from `ease-in-out` to `linear` so the parabolic keyframes supply the natural gravity feel (fast launch, hang at apex, fast descent), like a sheep clearing a fence. CSS-only change; the JS direction logic (`shpStartSheepAnim`) is untouched. **Lesson:** a curved motion path needs ≥3 well-spaced midpoints with `linear` timing — `ease-in-out` between only two keyframes always looks like straight segments.

## BUG-07 — Fogged Dream leaked into the recycled Flock (13 Aug 2026, SW v177, RESOLVED)

**What happened:** A played Fogged Dream (id 13) was pushed to `shpDiscard` unconditionally in both
`shpHostPlayCard` and `shpHostPlayTwoCard`. `shpReshuffleDiscard()` shuffles the discard back into
the Flock whenever it empties, so a recycled Fogged Dream could be drawn as a normal card — with no
Fog nightmare having fired to justify it.

**Root cause:** `shpBuildFlock()` deliberately excludes id 13 (it's conjured only by the Fog
nightmare, never dealt), but nothing downstream re-enforced that exclusion once the card entered
the discard pile. The two discard-push sites treated every played card identically.

**Why it went unnoticed:** in the pre-rework model a crash triggers a full redeal (`shpDealNight`
calls `shpBuildFlock()` fresh), so the discard pile rarely accumulated enough to force a mid-Night
reshuffle. The bug was real from the day the ghost system shipped but effectively dormant.

**Found while:** writing `docs/new-game-tech-counting-sheep-scoring.md` — the scoring rework removes
the per-crash redeal (a Night in normal mode no longer resets; Sylly mode never redeals at all), which
makes discard reshuffles routine instead of rare and would have turned this into a frequent, visible
bug. Shipped standalone ahead of the rework since the fix stands on its own.

**Fix:** `if (cardId !== 13) shpDiscard.push(cardId);` on both play paths.

**Lesson:** a card excluded from the *build* step of a deck needs the same exclusion enforced at
every *return-to-pool* step too (discard, reshuffle) — excluding it once at construction is not
self-maintaining once cards start cycling back through play. Also a general one for the rework: when
a change removes a periodic reset, audit everything that reset was silently cleaning up before
assuming the state it touched is otherwise stable. See `docs/new-game-tech-counting-sheep-scoring.md`
§ 3.1 for the other two items that same audit found (Wolf cap-shrink permanence, dozed-hand pool
lockup).

---

## Scoring-rework chunks 1–2: `shpLives` → `shpMoonsHeld` rename + committed `verify-shp-loop.js` (13 Aug 2026, SW v177)

Per `docs/new-game-tech-counting-sheep-scoring.md` §4/§12 chunks 1–2 — no gameplay change in either.

**Chunk 1 — rename.** `shpLives[]` → `shpMoonsHeld[]`, payload key `lives` → `moons` (`SHP_DEAL`,
`SHP_DEEP_SLEEP`). 14 call sites; `grep -n "shpLives\|\.lives\b\|lives:"` returns nothing after. The
rename matters because post-rework the array counts **up** in normal mode and **down** in Sylly —
`shpLives` would silently bias a future reader toward the Sylly direction in both modes.

**Chunk 2 — committed `tools/verify-shp-loop.js`.** Replaces the ad hoc harness mentioned at line 48
above (thrown away, never committed). Auto-plays random matches across every player count (2–6),
both modes, and varied settings via the real host appliers (`shpHostPlayCard`, `shpHostPlayTwoCard`,
`shpHostDeepSleep`, `shpHostContinue`, `shpHostResolveDisrupt`) called directly with an explicit
`playerIdx` — one process drives every seat, same pattern as `verify-cjar-loop.js`/`verify-pko-loop.js`.
Legal-move selection reuses the game's own `shpLegalCards`/`shpPairFinalBest` — no rules reimplemented.

Only asserts what's true of **current** (pre-rework) behaviour — spec §11 assertions 1, 2, 6, 7, 8.
Assertions 3/4/5/9/10 describe post-rework state (Herd revert, monotonic Moons, the Wolf expiring,
Fogged-Dream-never-recycles) and are deliberately not implemented yet; they arrive with the chunks
that build the behaviour they check.

**Assertion 2 (Herd ≤ ceiling) needed three exclusions to be correctly scoped, not just "between
every pair of turns" as the spec phrase reads in isolation:**

1. Skip while a Deep Sleep/stuck/ghost-pick is being resolved — a busted Herd is legitimately over
   ceiling until the redeal resets it to 0.
2. Skip in Plunge phase — the falling ceiling (`shpPlungeTick`) can squeeze below an already-legal
   Herd between turns; this is the documented "endgame squeeze" (spec §13 risk 2), resolved by the
   next player's own play or a bust, not a defect.
3. Skip in Sylly Climb specifically — Cold Feet (`shpApplyNightmare` 'nudge') can push the Herd past
   99 with no bust/Plunge-entry check on that path at all, **confirmed intentional** by spec §3: a
   Sylly Climb Herd above the ceiling only ever resolves into a Plunge or a stuck-out on the *next*
   play, never an immediate bust. First attempt at this harness enforced the invariant unconditionally
   and got ~30 false failures out of 60 matches before narrowing it to these three cases — all three
   are pre-existing, spec-documented behaviour, not bugs introduced by writing the harness.

Verified non-vacuous: a standalone probe confirmed Fogged Dream (id 13) cards genuinely appear in
hands during Sylly-mode runs (Fog nightmare fires), so the deck-conservation check (assertion 8)
is exercising the real discard-guard paths, not passing because the mechanic never triggers.
Turn ceiling (10,000) has headroom above the slowest observed case — a 6-player, 7-Moon, Sylly
match legitimately needs ~4,000 turns (confirmed by hand at a 200,000-turn ceiling: it terminates,
doesn't hang). Passes clean across multiple seeds (`SHP_SEED=` env var).

---

## Scoring-rework chunk 3: `shpDozed`/`shpDozeOrder`/`shpAwake`/`shpAwakeCount` (13 Aug 2026, SW v177)

Per spec §4/§12 chunk 3 — mechanical refactor, no gameplay change, ends when the chunk-2 harness is
still green (it is — byte-identical turns-per-match instrument numbers before/after, across 4 seeds).

**What changed.** Two new state vars, `shpDozed[]` (bool per player) and `shpDozeOrder[]` (int
knockout order), both reset in `shpDealNight`/`shpResetState`. New pure functions:

```js
function shpAwake(i)     { return !shpEliminated[i] && !shpDozed[i]; }
function shpAwakeCount() { let n = 0; for (let i = 0; i < shpPlayerCount; i++) if (shpAwake(i)) n++; return n; }
```

`shpAliveCount` (its one caller, the `over` check in `shpHostDeepSleep`) is deleted and replaced with
`shpAwakeCount()`. `shpNextPlayer`'s skip condition, both `shpLeaderIdx` loops and its tie-break walk,
and `shpTapCard`'s turn guard all switch from testing `shpEliminated[i]` directly to `!shpAwake(i)`/
`shpAwake(i)`.

**Why this is genuinely a no-op right now.** Nothing sets `shpDozed[i]` to `true` yet — that's chunk
4 (`shpHostDoze`). So `shpAwake(i)` is definitionally identical to `!shpEliminated[i]` for the whole
of this chunk, on both host (where `shpDozed` is a real all-false array from `shpDealNight`) and
client (where it's never synced yet — chunk 7 — and stays at its `[]` reset value; `shpDozed[i]` on
an empty array reads `undefined`, and `!undefined` is `true`, so an un-synced client computes the
same "awake" answer as the host by JS's own array-index semantics, not by any special-casing here).

**Lesson:** this is the same "swap the meaning of an existing guard for a new derived predicate,
verify with the regression harness that behaviour hasn't moved" shape as the assertion-2 scoping
work in chunk 2 — the harness's unchanged instrument numbers are the evidence, not an inspection of
the diff. Worth trusting the harness over eyeballing for any future rename/refactor chunk in this
rework (4 through 6 all touch these same guard call sites next).

---

## Scoring-rework chunk 4 (+ chunk 5's minimum content): Herd revert, crash router, Doze, Night End, Moon Loss + the Jolt (13 Aug 2026, SW v177)

Per spec §6/§7/§12 chunk 4 — this is the first chunk with a REAL gameplay change (everything before
it was a rename or a mechanical no-op refactor).

**Scope decision: chunks 4 and 5 landed together, deliberately.** Chunk 4's own table row is "Herd
revert + `shpHostCrash` router + `shpHostDoze` + `shpHostNightEnd` + `shpHostContinue`/
`shpHostGameover` branches"; chunk 5 is separately "Sylly branch — `shpHostMoonLoss` + the Jolt." But
`shpHostCrash`'s router (§7.1) calls `shpHostMoonLoss` unconditionally whenever `shpSyllyMode` is
true — there is no valid intermediate state where the router exists but its Sylly branch doesn't: a
strictly chunk-4-only build would throw `ReferenceError: shpHostMoonLoss is not defined` on the first
Sylly-mode crash, which is not "an unfinished feature," it's a live crash bug. Built both together
instead of shipping a broken router. Assertion 5's OWN fine-grained checks (the Jolt leaves the
crasher's hand at their cap and the Herd/ceiling/direction/other hands byte-identical) are still
**not** fully asserted — see below — so chunk 5 as a checkpoint isn't fully closed, only its code.

**What changed, by function:**

- **`shpPostResolve(playerIdx, herdBefore)`** — new second parameter. On a bust, snapshots
  `landedOn = shpHerd` (banner copy), reverts `shpHerd = herdBefore`, then calls `shpHostCrash`.
  Unconditional, no mode branch (§3/§6) — scope of the revert is the Herd only; the played card(s)
  stay in the discard and any non-Herd side effect of the busting play (direction flip, reseat, hand
  swap, meter charge) stands. Both call sites (`shpHostPlayCard`/`shpHostPlayTwoCard`) now snapshot
  `herdBefore` immediately before `shpResolveCard` runs.
- **`shpHostCrash(crasherIdx, reason, landedOn)`** — new router, replaces `shpHostDeepSleep`
  everywhere (the stuck-hold path in `shpConfirmStuck` and the host's `SHP_STUCK_ACK` ACTION handler
  both updated). Branches on `shpSyllyMode`.
- **`shpHostDoze`** (normal mode) — doze the crasher for the rest of THIS Night only: `shpDozed[i] =
  true`, push to `shpDozeOrder`, discard their hand (§3.1c — the id-13 guard applies here too), and
  if only one player is left awake, hand off to `shpHostNightEnd`. Otherwise advance
  `shpActivePlayer` (computed from `crasherIdx`, never the pre-doze active seat — the "ordering trap"
  the spec calls out) and let `shpAfterAdvance()` cascade into the next doze if the new active player
  is also stuck.
- **`shpHostMoonLoss` + `shpJolt`** (Sylly mode) — a crash costs a Moon; 0 Moons makes the crasher a
  Sleepwalker (unchanged elimination/ghost wiring), otherwise they get the Jolt (hand discarded and
  redrawn to a RESET cap — `shpWolfActive[i] = false; shpHandCap[i] = shpHandSize`). The cap reset is
  the only place a Wolf-shrunk cap can ever recover now that Sylly never redeals (§3.1b) — without it
  one early Wolf permanently costs a hand slot for the whole match.
- **`shpHostNightEnd`** (normal mode only) — awards the sole awake player a Moon, computes
  `[winner, ...dozeOrder.reversed()]` as the Night's finishing order, sets `shpNightEndInfo` (reuses
  the pre-rework ack-readyCheck machinery verbatim, just repointed at a Night-end summary instead of
  a Deep Sleep one).
- **`shpHostContinue`** — much simpler now: reads `shpNightEndInfo`, either ends the match or deals
  the next Night opened by THIS Night's winner (replaces "the crasher opens," which no longer has a
  referent — the crasher is now whoever dozed first, a full Night ago).
- **`shpHostGameover(finalNightOrder)`** — genuinely mode-branches for the first time. Sylly:
  unchanged (`[winner, ...elimOrder.reversed()]`, winner = the one player left `!shpEliminated`).
  Normal: winner = whoever's Moons reached `shpMoonsToWin`; standings = every seat sorted by Moons
  descending, ties broken by placement in the FINAL Night's finishing order (captured by
  `shpHostContinue` into `finalNightOrder` before `shpNightEndInfo` is cleared — it can't be read
  after that point). This is the only tie-break available and the fair one (of two players on equal
  Moons, whoever survived longer in the deciding Night placed higher).
- **`shpStartSession`** — Moons now start at 0 in normal mode (counting UP to `shpMoonsToWin`) and at
  `shpMoons` in Sylly (counting DOWN as lives) — `Array(shpPlayerCount).fill(shpSyllyMode ? shpMoons
  : 0)`. Missed initially on a first read of §7 alone; caught by re-reading §8's Firebase section,
  which states outright "at the first deal it [normal-mode moons] is `[0, 0, 0]`."
- **New setting `shpMoonsToWin`** (default 2, normal mode only) — declared alongside the other
  persisted settings; NOT wired into the settings UI or `engine-multiplayer.js` serialisation yet
  (that's chunk 6).
- **`shpDeepSleepInfo` deliberately NOT deleted**, despite spec §4 listing it as "Removed — superseded
  by `shpNightEndInfo`." Its render call sites (`shpRenderDeepSleep`, `shpShowTable`'s guard, the
  `SHP_DEEP_SLEEP` applier) are chunk 9/chunk 7 territory. Deleting the variable now would throw
  `ReferenceError` from code this chunk doesn't own — the exact mistake the chunk-4/5 merge above was
  trying to avoid, just at a different call site. It's dead (nothing sets it true any more) but
  harmless; a comment at its declaration flags this explicitly so it isn't mistaken for an oversight.

**Harness rewrite.** `tools/verify-shp-loop.js` updated for the new state model — `step()` now checks
`shpNightEndInfo` (not `shpDeepSleepInfo`) and calls `shpHostCrash` (not `shpHostDeepSleep`). Added
assertions 3 (revert — general, both modes, since Sylly's two-card path can bust too), 4 (normal
mode: `shpEliminated` stays all-false, Moons monotonically non-decreasing and up by exactly 1 at
every Night end, match ends the instant `shpMoonsToWin` is reached), 6 (Night-end finishing order is
a permutation of every seat, checked at the moment `shpNightEndInfo` transitions null→set, not just
at match end), 7 (final standings permutation + sorted by Moons descending, both modes). Two light
Sylly-mode sanity checks ride along for free since the code they'd catch already exists and runs:
`shpDozed` stays all-false in Sylly (the two arrays are mode-disjoint by construction, §2) and
`shpNightNum` stays 1 (Sylly never redeals). These are **not** assertion 5 in full — the Jolt's
"leaves the Herd/ceiling/direction/other hands byte-identical" check needs before/after snapshots
timed around the crash resolution itself, deferred to a proper chunk 5 pass, along with assertion 10
(the Wolf's expiry). `moonsToWin` added to the settings matrix (`[1, 2, 3]`, cycling per match) so the
1-Moon instant-win edge case gets coverage.

**Verified non-vacuous, not just green.** A standalone probe confirmed the mode-disjoint sanity checks
have something to catch (crashes happen in both modes), and specifically confirmed the Herd-revert
check (assertion 3) fires on REAL busted crashes, not just passing by absence: 7 busted crashes across
8 seeded normal-mode runs, all reverted correctly; Sylly mode also produces busted crashes (via the
two-card path, §3) alongside far more frequent 'stuck' crashes. Full suite re-run at 40 matches/combo
across 5 seeds (12,000+ simulated matches) with zero failures before considering this chunk closed —
6 matches/combo (the committed default) is enough for fast iteration but this wider sweep is what the
"pass clean" claim actually rests on.

**Turns-per-match dropped sharply vs. chunk 2/3's numbers** (6-player mean ~322 vs. ~1567 turns) —
expected, not a red flag: a normal-mode Night now ends the moment only one player is left awake
(no more grinding through repeated full-table redeals to reach permanent elimination), and Sylly's
Jolt hands a stuck player a fresh playable hand instead of them bleeding Moons on a redeal cycle.

**Lesson:** re-reading a spec section a second time, later, specifically hunting for something a
FIRST read didn't need, found a real requirement (`shpMoonsHeld` starting at 0 in normal mode) that a
literal transcription of §7's pseudocode alone would have silently gotten wrong — §7's own code
snippets never show `shpMoonsHeld` being initialised at all, that detail only exists in §8's Firebase
prose. Cross-reference every section that touches a variable before assuming one section's pseudocode
is the complete picture, especially for a spec this size (14 sections).

---

## Scoring-rework chunk 6: `shpMoonsToWin` settings UI + MP serialisation (13 Aug 2026, SW v177)

Per spec §5/§12 chunk 6 — pure settings wiring, no logic risk (nothing the chunk-4 harness already
covers changed shape).

**Markup.** The Moons settings card (`index.html`, via a Node.js script per the encoding warning —
never the Edit tool on this file) now holds **two pill groups**, exactly one visible at a time,
switched by `shpSyllyMode`, with one shared value line underneath: `#shp-moons-win-row`
(`Catnap`/`Full Night`/`Hibernate` → `data-shp-moons-win="1|2|3"`) and `#shp-moons-life-row`
(unchanged `3`/`5`/`7` → `data-shp-moons`), plus `#shp-moons-title`/`#shp-moons-desc`/`#shp-val-moons`
for the dynamic copy. This is the exact trap the `shpLives`→`shpMoonsHeld` rename (chunk 1) called
out in advance: a single number card meaning "wins" in one mode and "lives" in the other.

**JS.** `shpSyncSettingsUI()` now repaints the title, description, both row visibilities, and the
value line from `shpSyllyMode`/`shpMoons`/`shpMoonsToWin` — not just the pill highlight state it did
before. `shpBindPills()` now calls `shpSyncSettingsUI()` after applying a pill click (previously it
hand-rolled its own highlight toggle and stopped there), so this fires for every pill group uniformly,
not just the Moons card's two. The Sylly toggle handler also now calls `shpSyncSettingsUI()`
explicitly — `shpSyncToggle()` only paints the toggle button itself, and the toggle is what decides
which of the two Moons pill rows is even visible, so leaving it out would mean the OFF→ON flip left
the wrong row showing until the next pill tap. New pill group registered:
`shpBindPills('data-shp-moons-win', v => shpMoonsToWin = parseInt(v, 10))`.

**Value-line copy, verified against a mock DOM (not the harness — its `getElementById` returns `null`
by design, so this code path is invisible to it):**

| State | Value line |
| --- | --- |
| Normal, Catnap (1) | `Catnap — first to 1 Moon — one Night, winner takes all.` |
| Normal, Full Night (2) | `Full Night — first to 2 Moons, usually 3 Nights.` |
| Normal, Hibernate (3) | `Hibernate — first to 3 Moons, usually 5 Nights.` |
| Sylly, 3 Moons | `3 Moons — three crashes and you're haunting the dream.` |
| Sylly, 5 Moons | `5 Moons — five crashes and you're haunting the dream.` |
| Sylly, 7 Moons | `7 Moons — seven crashes and you're haunting the dream.` |

All six matched the spec's copy table exactly on the first pass.

**MP serialisation (`engine-multiplayer.js`, both halves mandatory).** Added `shpMoonsToWin` to the
`case 'shp':` object in `mpSerialiseSettings` (line 867) and the matching `if (s.shpMoonsToWin !==
undefined) shpMoonsToWin = s.shpMoonsToWin;` in the apply switch (line 1048). Missing either half
means a client plays to the host's *displayed* target but its own stale Moon maths — invisible until
a match ends on one device and not another, per the spec's own warning. Not exercised by
`tools/verify-shp-loop.js` (single-process, no `SETTINGS_SYNC` packet exists to test) — this is
exactly the kind of gap `verify-shp-loopback.js` (chunk 8) exists to close; until then this is a
read-the-diff-carefully guarantee, not a tested one.

**Lesson:** this chunk is a good example of "the harness staying green proves nothing new" — chunk 4's
suite passed before AND after this change, correctly, because settings UI paint logic is
`getElementById`-gated and invisible to a `'single'`-mode harness by construction. The mock-DOM probe
above is what actually verified this chunk's own deliverable; re-running the existing harness was
necessary-but-not-sufficient evidence, not proof of correctness for what changed.

---

## Scoring-rework chunk 5, closed properly: the Jolt's assertion 5/10 checks (13 Aug 2026, SW v177)

Chunk 5's CODE (`shpHostMoonLoss` + `shpJolt`) landed in chunk 4's merge (necessity — the crash
router can't exist half-built). What was still open was chunk 5 as a CHECKPOINT: its own bar is
"assertions 5, 10 green", and only light sanity was asserted until now. No source changes this pass —
`tools/verify-shp-loop.js` only.

**The one real finding: "immediately after a Jolt" is not deterministic, and neither is "immediately
after a deal".** First attempt added a straightforward integration check — right after a Jolt,
`shpWolfActive[crasher] === false && shpHandCap[crasher] === shpHandSize` — and it failed on real
matches. Root cause, confirmed by forcing a Wolf to the front of the flock and calling `shpJolt`
directly: the Jolt's own `shpDrawUp(i)` redraw can legitimately pull a **fresh** Wolf card and
re-trigger both flags in the same call, identical to how a normal `shpDealNight` can draw one
mid-deal (already documented, pre-existing behaviour — the "Wolf draw-trap" Bug Index entry above).
An initial, symmetrical "`shpWolfActive` all-false immediately after every `shpDealNight`" check hit
the exact same wall from the other side (a real run drew a Wolf at turn 42 of a redeal) and was
removed for the same reason before it ever shipped.

**Fix — two layers instead of one, because a single black-box check can't distinguish "the reset
didn't run" from "the reset ran, then got unlucky":**

- **`testJoltIsolation()`** — a new scripted (not random-match) unit test. Strips every Wolf from
  `shpFlock`/`shpDiscard` first, so the redraw *cannot* confound the result, then calls `shpJolt`
  directly on a player pre-set to a Wolf-shrunk state and asserts all seven of assertion 5's literal
  claims: cap reset, wolf flag cleared, hand redrawn to the (reset) cap, and Herd/ceiling/direction/
  every other hand byte-identical — **ceiling included**, which the integration path can't test at
  all (see below). Deterministic by construction, runs once before the random-match sweep.
- **Integration check inside `runMatch()`** — kept, but pared to only what's universally true
  regardless of redraw luck: hand length matches whatever cap the player ended up at. The
  wolf-flag/cap-value assertions were removed from this path entirely; a comment points at
  `testJoltIsolation` as the source of truth for that specific claim instead of silently dropping it.

**Why ceiling could never be integration-tested.** `shpHostMoonLoss` calls `shpPlungeTick()`
*immediately after* the Jolt, in the same function, before broadcasting (§7.3 — "the descent keeps
ticking"). A black-box snapshot taken around the whole crash resolution would see the ceiling legally
move from `shpPlungeTick`, indistinguishable from the Jolt itself doing something wrong. Only calling
`shpJolt` directly, with nothing else in the call stack, isolates its own promise from that. This is
the same shape as chunk 2's assertion-2 Plunge-squeeze exclusion and chunk 4's Cold-Feet exclusion —
a "byte-identical" or "≤" claim in this codebase routinely turns out to mean "true of the mechanism
in isolation," not "true of every aggregate post-hoc snapshot," and the fix is always to find the
narrowest thing that's actually deterministic and test THAT.

Verified clean across 6 seeds × 40 matches/combo (14,400+ simulated matches) plus the isolated test,
before considering chunk 5 closed.

---

## Scoring-rework chunk 7: packets (13 Aug 2026, SW v177)

Per spec §8/§12 chunk 7 — `SHP_DOZE`/`SHP_NIGHT_END` additions, `SHP_DEAL` additions, `SHP_DEEP_SLEEP`
deletion, `shpNormBool`. Found and fixed a real bug the `'single'`-mode harness structurally cannot
see, via a throwaway host↔client loopback probe built specifically to pressure-test this chunk.

**What changed, by function:**

- **`shpNormBool(raw, n)`** — new, alongside `shpNorm2D`. Rebuilds a length-n bool array on receipt;
  Firebase erases an all-false array entirely (`[]` → `undefined`), so the reader can't trust `raw`
  is even an array.
- **`shpDealNight`'s `SHP_DEAL` payload** — added `dozed`, `dozeOrder`, `moonsToWin`.
- **`shpPostResolve`** — no longer calls `shpHostCrash` itself. Returns `{ busted, landedOn }` instead
  of a bare bool, so the caller can sequence the two packets correctly (see next point).
- **`shpHostPlayCard`/`shpHostPlayTwoCard`** — restructured so a busted play calls
  `shpBroadcastTurn(...,busted)` **before** `shpHostCrash`, matching §8's "why a bust sends two
  packets, in this order": `SHP_TURN_RESULT` records the play and the reverted Herd first (with
  `nextActive` still pointing at the crasher, since `shpActivePlayer` is deliberately left unchanged
  on the busted path), then `shpHostCrash`'s `SHP_DOZE` moves the seat.
- **`shpBroadcastTurn`** — new `busted` parameter. Adds `busted: !!busted` to `SHP_TURN_RESULT` and
  skips `shpStartSheepAnim` when busted (both host and client) — the parade is computed from the
  played card's face value, which would show growth that never happened on the (already-reverted)
  live counter.
- **Client appliers (`shpHandleEnvelope`)** — `SHP_DEAL` now reads `dozed`/`dozeOrder`/`moonsToWin`
  and resets `shpNightEndInfo`/`shpDozeNotice`, exactly mirroring `shpDealNight`'s own reset (the
  accumulator-bug pattern, `logic-engine.md` § Accumulator arrays). `SHP_TURN_RESULT` skips the sheep
  parade when `p.busted`. New `SHP_DOZE` applier (all fields, `shpStuckIdx = -1`, `shpDozeNotice`
  rebuilt). New `SHP_NIGHT_END` applier (`shpNightEndInfo`, `shpMoonsHeld`, resets the repurposed
  ack-readyCheck machinery). Old `SHP_DEEP_SLEEP` applier branch deleted outright.
- **Missing-handler audit confirmed clean** — no new ACTION handlers needed; `SHP_SLEEP_ACK` is
  unchanged and now acks the Night-end summary instead of the old Deep Sleep one, exactly as spec'd.

**The real bug, found by a throwaway loopback probe (not the committed harness).** `'single'`-mode
testing structurally cannot see packet-ordering or dropped-field bugs — `mpSendEnvelope` is stubbed
to throw and never called. Before committing to chunk 7 being done, I built a quick two-sandbox
host↔client probe (piping the host's real `mpSendEnvelope` calls into the client's real
`shpHandleEnvelope`, comparing state after every packet) and it found a genuine defect within the
first handful of seeds: **`shpHostDoze` and `shpHostMoonLoss` both returned early — skipping their
own `SHP_DOZE` broadcast entirely — whenever the crash they were resolving was the ONE THAT ENDS THE
NIGHT OR MATCH** (`if (shpAwakeCount() <= 1) { shpHostNightEnd(); return; }` / `...shpHostGameover();
return;`, written that way since chunk 4). The client never learned that final crasher's hand was
discarded or that they'd been eliminated — its `shpDozed`/`shpDozeOrder`/`shpHands` fell permanently
behind the host's, with nothing ever re-syncing them (the next deal resets both devices identically,
but the WRONG intermediate state is what a player would have briefly seen, and `SHP_NIGHT_END`'s/
`SHP_GAMEOVER`'s own payloads don't carry the same fields, so it isn't a redundant send).

**Fix:** both functions now compute `over = shpAwakeCount() <= 1` up front, skip only the *turn
advance* (`shpActivePlayer`/`shpPlungeTick`) when `over`, but **always** send `SHP_DOZE` — then call
`shpHostNightEnd`/`shpHostGameover` afterward as an explicit *second* packet, extending the same
"two packets, in order" pattern from §8's bust-handling section to this parallel case. Re-ran the
loopback probe after the fix: 80 runs (5 player counts × 2 modes × 8 seeds), zero divergence on any
of 12 compared fields (`herd`, `ceiling`, `active`, `moons`, `dozed`, `dozeOrder`, `hands`,
`eliminated`, `elimOrder`, `direction`, `handCap`, `wolfActive`) plus matching final standings/winner
on every match.

**Lesson.** This is the second time in this rework a bug only a real wire (not `'single'`-mode) could
catch turned out to live in an early-`return` on the "this is the LAST one" branch — chunk 4's
`shpJolt`-vs-`shpPlungeTick` ordering issue (closed in chunk 5) and this one share the same shape: an
edge-of-sequence branch that skips work a NORMAL turn always does. Worth specifically auditing every
`if (X <= 1) { ...; return; }`-style early exit in this file for "does the skipped code include a
broadcast the client needs" before calling a chunk done — `'single'`-mode passing is not evidence
either way, since it never sends anything regardless of which branch runs. The probe used here was
deliberately NOT `tools/verify-shp-loopback.js` (chunk 8's own committed harness, not built yet) — a
~90-line throwaway script was enough to catch this, which is itself the argument for building the
real one sooner rather than treating it as pure formality once chunk 8 arrives.

---

## Scoring-rework chunk 8: `tools/verify-shp-loopback.js` committed (13 Aug 2026, SW v177)

Per spec §11 — modelled on `tools/verify-cjar-loopback.js` (the wire and DOM-mock sections are close
ports, game-agnostic). Builds out chunk 7's throwaway probe into a committed, scenario-driven harness
with the two things a real MP bug needs to be catchable: a Firebase-shaped **wire** (`fbWrite`/`fbRead`
strip `null`/`{}`/`[]` the way Firebase does — asserted on its own behaviour first) and a **real mock
DOM** (`getElementById` returns real, stateful elements, not `null`), so a render-path throw strands a
device instead of vanishing into a short-circuited guard.

**All 7 required cases implemented and green**, plus 12 standalone wire-erasure assertions:

1. A client's own bust — `SHP_DOZE` alone (no ack) clears "your turn."
2. A client's stuck-out — Nod Off → `SHP_STUCK_ACK` → `SHP_DOZE`; a bystander device never shows a
   stuck button for a seat that isn't theirs.
3. Doze cascade — three consecutive doze-outs with no redeal between them; host and client end with
   byte-identical `shpDozed`/`shpDozeOrder`/`shpActivePlayer`.
4. Night end — ack gating, then `shpHostContinue`'s `SHP_DEAL` correctly resets `shpDozed`/
   `shpDozeOrder`/`shpNightEndInfo` on the client (not just the host).
5. Sylly Jolt over the wire — only the crasher's own hand changes; a bystander's hand and the Herd
   are byte-identical on their own device.
6. Match end, both modes — identical `shpGameStandings`/winner on host and client.
7. `SHP_SRC=` accepted — verified by reintroducing chunk 7's exact fixed bug (the early-return-skips-
   `SHP_DOZE` one) into a scratch copy and confirming the harness fails loudly (uncaught exception,
   non-zero exit) before the real file's fix makes it pass again (exit 0).

**Deterministic scenario control, not luck.** A real shuffle won't deliver a specific hand, a specific
bust, or a specific stuck-out on demand — same problem CJAR's `stackDeck()` solves. The bridge adds
`setHerd`/`setHand`/`stackFlock` (direct state injection) and a one-shot `forceRandom(v)` override on
`Math.random` (pins the next roll — used to force a Skip a Few's random-add to bust on demand rather
than hoping for one). Every case builds its exact pre-condition this way instead of playing out a
match and hoping the right shape appears.

**Scope decision: state/packet correctness, not rendered Night-End UI.** Confirmed by grep before
writing a single case: no render call site (`shpRenderTable`'s chip logic, `shpShowTable`'s guard)
reads `shpDozed`/`shpNightEndInfo`/`shpDozeNotice` yet — chunk 9 hasn't wired them up, and
`shpRenderDeepSleep` is fully dead code now (its gate, `shpDeepSleepInfo`, is never set by any live
path since chunk 4). Asserting against markup that doesn't reflect the new model yet would either
assert nothing meaningful or assert the wrong thing on purpose. The real DOM mock is used throughout
anyway — that's what still catches a render-path throw (and did, twice, before the harness ran clean
— see below) — but nothing here checks Night-End chip/banner *content*. That's chunk 9's own bar.

**Two DOM-mock gaps found and fixed while standing this up, both real code paths shp.js already
exercises that the CJAR reference's mock never needed:** `setAttribute`/`getAttribute` (an aria-label
on the Dream Journal button) and `.append(...)` the multi-arg spread form (the Last Played card
column). Both are the ordinary cost of a first real-DOM run on a new game's file, not defects in
shp.js — the CJAR mock simply never had to cover them because cjar.js doesn't call either.

**Lesson.** The chunk-7 throwaway probe's finding (both `shpHostDoze` and `shpHostMoonLoss` skipping
`SHP_DOZE` on the Night/match-ending crash) is now permanently regression-tested here — case 3
(cascade into a Night end) and case 6 (match end) both exercise exactly that code path on every run.
Building the committed harness immediately after finding a bug by hand, rather than treating it as a
someday task, is what turns a one-off catch into a standing guarantee.

---

## Scoring-rework chunk 9: UI + copy — `shpRenderNightEnd`, the doze chip/banner, how-to (13 Aug 2026, SW v177)

Per spec §9. This is the chunk where the reworked state finally reaches the screen: before it,
`shpDozed`/`shpDozeNotice`/`shpNightEndInfo` were fully correct and fully invisible.

**`shpDeepSleepInfo` is deleted, not just bypassed.** Chunk 4 deliberately left it declared-but-dead
(deleting it then would have thrown `ReferenceError`s from render code chunk 4 didn't own). Every one
of its call sites is now migrated to `shpNightEndInfo`: `shpShowTable`'s guard, the sheep-animation
timer's guard, the tap-ready timer's guard, `shpStartSession`/`shpDealNight`/`shpResetState`, and the
`SHP_DEAL`/`SHP_TURN_RESULT` appliers. A grep for the old name now returns only two prose comments.

**`shpRenderDeepSleep` → `shpRenderNightEnd`, rebuilt rather than renamed.** The old screen was a
*crash report* ("Ash drifts off… −1 Moon") with a one-shot `playBoing`; the new one is a *Night won*
("Ash is the Last One Awake", `+1 Moon. First to N wins the match.") with `playSuccess`. Three
substantive changes beyond the copy: the standings rows carry a live `N/shpMoonsToWin` count (an
ordinal alone hides how close the match is), the winner's row is tinted, and a new **Finishing Order**
block renders `info.order` with "— Last One Awake" / "— first to doze" annotations. The three footer
branches (single / host ack-gate / client "Got it") are untouched — that ack machinery is repurposed
verbatim, per §4 "Removed".

**The screen now owns its own status bar.** It sets `Night N · Complete` rather than inheriting
whatever the table left there. Caught by the visual check: without it the header read a bare "NIGHT",
and on a screen reached mid-Plunge it would have read "THE PLUNGE 🔻" in red above a Night-won
summary — a half-repainted screen. *Lesson: a render function that repaints only `#body`/`#footer` of
a shared screen inherits every other element on it; either it owns them or it must accept whatever the
previous renderer wrote.*

**Table changes.** Dozed players take the existing `shp-chip-out` styling plus a new `.shp-chip-doze`
marker line (`😴 Dozed Off`); the chip's active-state test moved from `!shpEliminated[i]` to
`shpAwake(i)`, so a dozed player can never render as the active seat. `shpRenderTableFooter` returns
early for a dozed player exactly as for an eliminated one — their hand went to the discard the moment
they dozed (§3.1c), so there is nothing to render. `shpDozeNoticeText()` builds the banner's four
shapes (normal busted/stuck, Sylly Jolt, Sylly Sleepwalker) in one place. Sylly's status bar reads
**The Long Night** — a `Night N` counter there would sit on "Night 1" all match and read as broken.

**Gameover sub-labels split by mode.** Normal mode is a Moon race, so the row's sub-label is the Moon
count (`2 Moons` / `1 Moon`); Sylly keeps the survival ordinals, because there are no Moons left to
count by then.

**Verification.** Both harnesses re-run green (`verify-shp-loop.js` 60 matches; `verify-shp-loopback.js`
6 scenarios). Neither can see any of the above — but the loopback's **real** DOM mock means all the new
render code genuinely executes there, so a throw would have surfaced. Layout was checked with the
`visual-check` skill: 8 seeded screens at 390×844 (dozed table from the dozer's and a bystander's
seat, Sylly Moon-loss, Night-End in all three footer branches, Night Intro tally, normal-mode
gameover). No page errors, no horizontal overflow on any screen. The stale chunk-8 scope comments in
`verify-shp-loopback.js` (which asserted, correctly at the time, that no render site read the new
state) were corrected in the same pass.

**Template gap candidate.** The status-bar finding generalises: any game whose screen is repainted by
more than one render function needs each of them to set *every* element it cares about, not just its
own body. Flagged for chunk 10's docs closure — see § Template Gaps.

---

## Scoring-rework chunk 10: docs closure + SW v178 (13 Aug 2026)

Per spec §14. Closes the 10-chunk scoring rework (`docs/new-game-tech-counting-sheep-scoring.md`).

**Decisions recorded (spec §14's four, D-A through D-D):**
- **D-A — A crash no longer ends the Night.** Normal mode: doze out, everyone else plays on from the
  same Herd; last awake takes a Moon. *Why:* the old model ended the interesting part of a Night at
  the first mistake and made every crash a full reset. *Impact:* `shpDozed`/`shpDozeOrder`,
  `SHP_DOZE`, `SHP_NIGHT_END`.
- **D-B — Moons mean opposite things in the two modes, on purpose.** Wins in normal, lives in Sylly —
  forced the `shpLives` → `shpMoonsHeld` rename and two pill groups behind one settings card
  (`shp-moons-win-row` / `shp-moons-life-row`).
- **D-C — A busted play is rolled back, unconditionally.** One rule, one code path (`shpHostCrash`),
  three reachable shapes (busted gamble, bad two-card pair, no legal line/stuck), including
  deterministic two-card overshoots.
- **D-D — Removing the redeal made the recycle pool load-bearing.** Three consequences, all shipped
  ahead of or during this rework: Fogged Dream dissolves on play/doze/Jolt instead of recycling
  (BUG-07, shipped standalone at SW v177 — see Bug Index below); the Big Bad Wolf's cap shrink expires
  at the Jolt rather than persisting a whole match from one draw; a dozed player's hand returns to the
  discard immediately. *Lesson:* when a rework deletes a periodic **reset**, audit everything that
  reset was silently cleaning up — none of these three were anywhere in the rework's own description.

**Doc updates made in this pass:** `docs/code-map.md` (SHP packet table + state/function tables —
`shpDozed`/`shpDozeOrder`/`shpMoonsToWin`/`shpMoonsHeld` and the `shpHostCrash`/`shpHostDoze`/
`shpHostMoonLoss`/`shpJolt`/`shpHostNightEnd`/`shpRenderNightEnd`/`shpAwake` function set added;
`shpLives`/`shpAliveCount`/`shpDeepSleepInfo`/`shpHostDeepSleep`/`shpRenderDeepSleep` removed);
`game-identities.md` § Game 15 (state flow, Terminology table — Dozed Off / Last One Awake / Nod Off /
The Jolt / Moons' split meaning — Settings table's two Moon rows, Scoring/Win, Special Mechanics,
Multiplayer packet lists); `CLAUDE.md` § Current Focus (compressed to the closed one-liner below) +
SW version; `ui-style.md` § The Stack (rule 4 — see the "Folded into" note on the chunk 9 Template Gap
above); `docs/decision-log.md` (one line). `logic-engine.md`'s candidate (a mode that removes a game's
reset must supply a per-player recovery in its place — the Jolt) was deliberately **not** added:
per spec §14 item 4, it's a single-instance pattern so far and the rule says add it only if a second
game ever needs it.

**CLAUDE.md § Current Focus, compressed:** "SW v178 — Counting Sheep scoring rework CLOSED, all 10
chunks shipped (13 Aug 2026)." Full history of chunks 1–9 stays in this file; the spec's §12 table is
the chunk-by-chunk index.

**Verification:** `tools/verify-shp-loop.js` (60 matches) and `tools/verify-shp-loopback.js`
(6 scenarios) both re-run green, unchanged by this doc-only chunk.

---

## Bug Index (post-launch — June 2026)

### BUG-03 — Sound buttons inert on all SHP screens (June 2026, RESOLVED)
**What:** The 🔊 button on every SHP screen did nothing when tapped.
**Root cause:** `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements at parse time via a top-level `querySelectorAll`. SHP's HTML section sits at ~line 7939 in `index.html`, after the `<script>` block (~line 6773). The querySelectorAll runs before that HTML exists, so SHP's sound buttons are never captured.
**Fix:** Added explicit re-wiring inside SHP's `DOMContentLoaded` callback (bottom of `shp.js`): `document.querySelectorAll('#screen-shp-menu .btn-open-sound, #screen-shp-table .btn-open-sound, #screen-shp-gameover .btn-open-sound').forEach(btn => btn.addEventListener('click', openSoundOverlay))`.
**Lesson:** Any game whose HTML section in `index.html` appears after the `<script>` block must re-wire its `.btn-open-sound` buttons inside `DOMContentLoaded`. FRT is the established reference. See also NT BUG-12 and FLW BUG-02 (same root cause, same fix pattern).

---

## How-to gallery tab (2026-08-10, SW v167)

**What happened:** `shp-how-to-overlay` gained a second tab, `The Rules | The Cards`, built from
`SHP_CARDS` through `shpRenderCard` and grouped by family (Pasture / Pillow / Alarm / Trap).
Tiles are tappable-to-enlarge via `artMakeZoomable` (`ui-style.md` § Pattern 2a). Closes SHP's
half of the deferred gallery item, and makes the core-art (v154) offline install check a
single-device job instead of needing a live match.

**The id-13 detail the gallery had to respect.** Fogged Dream is rendered in its own section and is
**shown but never zoomable** — `shpRenderCard` hardcodes its cursed face *before* ever calling
`assetFace`, because its value is hidden from every player including its owner, so there is no
artwork behind it and `assetFace('shp', 13)` correctly returns null. This falls out of the
`artMakeZoomable` `src` guard for free rather than needing a special case — which is the argument
for putting that guard in the helper rather than at each call site.

**Deliberately built on every switch INTO the tab, not cached:** the Plunge inverts what a number
card *does*, so a gallery built once at boot would be wrong for half the night.

---

## Template Gaps

- **Ghost-pick has no auto-resolve timer (stall risk).** The disruption table-gate waits on the designated spend-holder's tap, and Counting Sheep has no turn timer. An AFK Sleepwalker stalls the table. Acceptable for a same-room party game in v1, but a future "auto-pick after N seconds" (GTH wall-clock pattern) would harden it. Flag for any future ghost/afterlife mechanic in another game.
- **Single-source herd math paid off for the sign-flip.** Routing resolve + legality + pair-sim through one `shpHerdAfterCard` meant Night Terrors' inversion was a one-line `sgn` change rather than touching every call site. Worth recommending as a pattern for any future game with a "mode that changes card arithmetic." Candidate for `logic-engine.md`.
- **Escalating hazards should tick per player-round, not per turn (fairness).** Night Terrors' flat per-turn ceiling drop was player-count-dependent: whoever sat earliest in the cycle faced a lower accumulated ceiling than later players. Locking the drop rate to a full round of turns (`round = floor(descentTurns / playerCount)`) makes the hazard identical for every living player before it tightens. Any future game with an escalating environmental hazard (rising tide, shrinking timer, falling ceiling) should escalate per-round, not per-turn. Candidate for `logic-engine.md` / phase-audit balance checks.
- **A screen repainted by more than one render function must have each of them own every element it cares about.** SHP's table screen has two renderers — `shpRenderTable` and `shpRenderNightEnd` — and only the first set `#shp-table-status`. The Night-End summary therefore inherited whatever the table last wrote there, which on a screen reached from a Plunge would have been "THE PLUNGE 🔻" in red above a Night-won summary. Repainting only `#body`/`#footer` of a shared screen is not "leaving the rest alone", it is "showing the previous state's header". **Folded into `ui-style.md` § The Stack as rule 4, chunk 10 (13 Aug 2026).**
- **Animations that must not move the layout belong in an absolutely-positioned overlay, not inline.** SHP's first sheep parade was an inline child of the herd column, so each play pushed and retracted a row (visible header/footer bounce). The fix (a `position:absolute` `.shp-sheep-layer` over a `relative` counter) is the general rule: any transient, repeating in-flow animation in a centred Stack will jank the surrounding zones — anchor it to a relative parent and float it instead.

---

## Core Art (2026-08-01, SW v154)

**What happened:** SHP became the fourth game (after PKO, FLW, FRT) to ship a **core art pack** — 16 of its 17 card ids now render real bitmap art (`data/art/shp/`) instead of the emoji-on-family-colour card. Zero JS changed: `shpRenderCard` already resolved `assetFace('shp', cardId)` / `assetBack('shp')` through `js/lib/art.js`, so this was art + manifest + registry + precache only.

**Where the art came from:** the **`plush-sheeps` skin pack** (`data/packs/plush-sheeps/`), whose filenames already matched the game's ids directly (`card0.png`…`card16.png`), so the converter's id map needed no lookup table — just a straight `cardN -> N`. Promoting it removed `plush-sheeps` from `data/packs/registry.json`, same standing rule as the FLW/FRT runs.

**id 13 (Fogged Dream) was originally excluded (1 Aug 2026), reversed 11 Aug 2026 — see below.**
`shpRenderCard` (`js/games/shp.js:297`) checks `cardId === 13` and returned a hardcoded cursed
placeholder **before it ever called `assetFace`**, on the reasoning that the card's value is hidden
from every player including whoever holds it, so giving it real art would leak information. That
reasoning conflated two separate things: the card's *resolved numeric value* (2–12, rolled fresh at
play time via `shpRandInt`, completely decoupled from what image is shown) versus the card's
*identity/appearance* (already visible to everyone as a distinct violet "cursed" card — nothing
about that was ever hidden). A static face doesn't encode the roll, so it doesn't leak anything the
placeholder wasn't already showing. Owner had `card13.png` ready and pushed back on this during the
Sleepwalkers-in-Sylly-Mode round; **reversed 11 Aug 2026** — `13.jpg` (39 KB, converted from the
same `plush-sheeps/img/card13.png` master, same 400 px/40 KB settings as the other 16) was added to
`data/art/shp/pack.json`'s `faces` block and `PRECACHE_URLS`, and `shpRenderCard`'s cursed branch
now tries `assetFace('shp', 13)` first — same pattern as the Wolf-slot fix above — keeping the "?"
label overlaid on top so the *hidden-value* mechanic still reads clearly. The How-to gallery tile is
zoomable now too. **Owner confirmed (1 Aug 2026, unchanged): do not renumber `SHP_CARDS` to close
the id-13 gap in the base deck** — that decision was never about the art, it's that those ids are
the locked data-layer identity of the game (`js/games/shp.js:87` — "stable integer ids; packets deal
only in ids"): `SHP_DECK_COUNTS` and every hand/discard/SYNC payload carry raw ids over Firebase, and
id 13 is still correctly absent from `SHP_DECK_COUNTS` (conjured only by the Fog nightmare, never
dealt) — only the *art* gap closed, not the id gap. **Lesson:** "this would leak hidden information"
is worth re-deriving mechanically (what data does the art actually encode?) rather than accepting by
pattern-match from a card's flavour text — the placeholder and the roll were never actually coupled.

**Dimensions — no upscale needed, same call as FLW/FRT:** masters were 400×550 PNGs, already small and close to card aspect, so the converter held `$cardWidth` at 400 rather than PKO's 360px default (here the source was already *larger* than that default, so holding it was simply "don't touch it needlessly"). All 17 files landed under the 40 KB/card ceiling on the first or second quality step (q76–q84) — 640 KB total, the largest core-art payload so far but still well inside the FLW/FRT/PKO pattern.

**Skipped deliberately:** an `await artReady` guard at SHP's entry point, same reasoning as FLW/FRT — the first live card render is several screens past app boot.

---

## Night Intro screen + sheep pen art (2026-08-12, SW v172→v173)

Two owner polish requests, same session as the Fogged Dream/stuck-player round above.

### Round/Night Intro Screen — new pattern, not SHP-specific
**Ask:** the lobby jumped straight from Start into a live table with no beat marking "a new Night
has begun" — PKO and CJAR "got the formula right" and SHP should match. Rather than a one-off SHP
screen, this became a named, documented pattern: `ui-style.md` § **Round/Night Intro Screen**,
generalising CJAR's `screen-cjar-raid-intro` (the only prior instance) into something any
multi-round game should default to.

`screen-shp-night-intro` — same Stack shape as CJAR's raid-intro, no `[?]`/🔊/✕ (rule-5 interstitial
exemption: `SHP_INTERSTITIAL_MS` 5000ms, nothing to tap). Heading is `"Night N Begins"`; the subtext
does double duty as flavour AND a practical reminder in one sentence (owner's own example: *"Don't
go over 99 or you might really just fall asleep"* — mood and rule in the same breath). Five lines in
`SHP_NIGHT_FLAVOUR`, host-picks an index and **syncs it** in the `SHP_DEAL` payload (`flavourIdx`)
so every device shows the same line — picking independently per device would have players sitting
together reading different text for the same moment. A conditional fourth element
(`#shp-intro-sylly`) reminds the table Night Terrors is live, shown only when `shpSyllyMode` is on —
same shape as CJAR's Sylly-only affinity box.

**Wired at both call sites, not one.** `shpShowNightIntro()` replaced the direct `shpShowTable()`
call in **both** `shpDealNight()` (host) and the client's `SHP_DEAL` applier — missing either one
means that class of device (host or every client) skips straight past the intro on every redeal, not
just the first Night. `shpNightIntroTimer` follows the same lifecycle as every other SHP timer:
cleared and reset on every call (a rapid mercy-exit loop must never stack two pending 5s timers),
and torn down in `shpResetState()`.

**Deferred:** not retrofitted onto any other game this round — `docs/deferred-work.md` carries the
sweep item. PKO is the closest structural match (Clashes/Encounters repeat many times a match) and
the obvious next candidate.

### Sheep pen — the empty left column gets art
**Ask:** the Climb stage's left column (previously a bare spacer reserved only for the flying-sheep
animation's whitespace) read as empty. Owner supplied `fence.png` and `sheep.png` (transparent PNG,
`data/art/shp/img/`) and asked for a static huddle of sheep with a fence divider, plus the existing
sheep-jump animation swapped from the 🐑 emoji to the real art.

**New `extras` block, not `faces`.** Fence and sheep aren't cards — they went into
`data/art/shp/pack.json`'s `assets.extras` (the same non-card-art channel PKO's chain diagram uses),
resolved via `assetExtra('shp', 'fence'|'sheep')`. No conversion needed: both were already small
(15KB/40KB PNGs, well under any per-card ceiling) and PNG is correct here specifically *because* the
transparency is load-bearing — the `tools/convert-core-art.ps1` JPEG pipeline would have flattened
it onto a white background and destroyed the cutout.

**The pen is a fixed composition, not a live count.** Four `<img>` sheep at hand-placed offsets
(`shpRenderTable`, inline `style`) — not randomised per render, or the huddle would visibly reshuffle
on every table update. This is deliberately decorative, not a representation of any real game
number (cards in hand, Herd value, etc.) — "a bunch of sheep" per the ask, not a data-bound count.
The fence sits at the pen's right edge, `rotate(90deg)` — since the source art is landscape (two
posts + horizontal rails, 188×91), pre-rotation CSS `width` becomes the POST-rotation visual
*height*, so `width:2.6rem` pre-rotation yields a ~2.6rem-tall vertical-reading divider without
distorting the art. `.shp-pen`/`.shp-pen-sheep`/`.shp-pen-fence` in `styles.css`. Falls back to a
plain 🐑 emoji cluster if the art doesn't resolve (matches the fallback pattern used everywhere
else `assetFace`/`assetExtra` might return null).

**The flying sheep animation was already a proper parabola** (the 30 Jun 2026 fence-jump rework,
5-point `@keyframes shpSheepArcIn`/`Out`, linear timing) — what changed is only the glyph. The
`<span class="shp-sheep-fly">` still owns the arc's `translate`/`scale` keyframes; a new inner
`<img class="shp-sheep-fly-img">` carries the sheep art, with the "out" direction (Counting
Backwards cards, sheep leaving the counter back to the pen) getting a static
`transform:scaleX(-1)` on the image itself. This has to live on the CHILD element — the parent
span's `transform` is already fully owned by the keyframes every animation frame, so a flip on the
same property on the same element would fight it. **Default (unflipped) orientation reads as
facing the direction of "in" travel** (left-to-right, pen → counter) since that's the more common
case (most cards grow the Herd); "out" flips it to face back toward the pen. Per-card-value sheep
counts (the ask: "+1 = one sheep, +2 = two, +5 = five") were **already implemented** before this
round (`shpStartSheepAnim`'s `net` calculation, capped at 8) — no new work needed there, just the
glyph swap inherited it for free.

---

## Sheep pen fixes + Last Played redesign (2026-08-12, SW v173→v174)

Owner playtest of the v173 round above surfaced three problems, all fixed same day.

**1. Sheep/fence render with a visible cream/white box — the PNGs have no alpha channel.**
Checked directly by reading the PNG `IHDR` colour-type byte: both `data/art/shp/img/sheep.png` and
`fence.png` are colour type 2 (flat RGB), not type 6 (RGBA). No alpha-preserving copy of either
file exists anywhere in the repo — the v173 entry above states "transparent PNG" but that was
never actually verified at the byte level, only assumed from the owner's description of the
source. The most likely cause is that the copy step used to bring these into `data/art/shp/img/`
flattened them, though the exact tool isn't recoverable from history. **Not fixed this round** —
there is no way to recover alpha from a flattened RGB image without a manual chroma-key pass, which
is unsafe here because the sheep's own wool is white/cream (a colour-key would eat into the art
itself). Needs a fresh export from the owner's Krita source with the alpha channel explicitly saved
on export, then copied in **directly, never through `tools/convert-core-art.ps1`'s JPEG pipeline**
(that pipeline flattens onto white by design — correct for card faces, wrong for anything that
needs a cutout). Lesson: verify a "transparent PNG" claim by reading the IHDR colour type before
building on top of it, not after a playtest reports a white box.

**Closed same day (SW v174).** Krita's PNG export dialog defaults "Store alpha channel
(transparency)" to **unchecked** — the owner's first export had transparency in the working
document but lost it on save, exactly as diagnosed above. Re-exported with that box ticked; both
files re-verified byte-level (a hand-rolled PNG/zlib decoder, not just the IHDR colour-type check
this time — confirmed colour type 6/RGBA, corner pixels alpha 0, sheep centre alpha 255, and traced
the fence's alpha map to confirm its gaps are real slat gaps in the art rather than a broken
export) and confirmed visually via `visual-check` (the pen now sits with no box against
`bg-stone-50`). Lesson for next time an owner reports "I saved it as transparent PNG": ask whether
the export dialog's alpha checkbox was ticked specifically — Krita (and most raster editors) will
happily save a fully-opaque flattened PNG with no warning beyond a generic "will lose information"
banner that's easy to click past.

**2. Fence rotation was wrong — the asset was never drawn to be rotated.** The v173 entry's
`rotate(90deg)` reasoning (turn a landscape divider into a vertical one) was a guess that didn't
match what the art actually depicts: `fence.png` is a small paddock-fence *panel* (two posts + rails,
meant to sit upright), not a rail motif that reads correctly on its side. Confirmed visually via a
Playwright screenshot before touching the CSS. Fixed by dropping the rotation entirely and using the
fence **upright as a horizontal rail along the pen's own bottom edge** (`.shp-pen-fence`:
`bottom:-0.1rem; width:100%`, `z-index` above the sheep so it reads as being in front of them) — the
composition now reads as sheep standing in a pen behind its own fence line, not a divider between
two unrelated things. Pen and sheep sizes were also bumped (pen `3.6×2.7rem → 5.6×4.1rem`, individual
sheep `1.5–1.85rem → 2.2–2.7rem`; flying sheep `1.7rem → 2.5rem`) — the owner's "too small" report
was correct independent of the transparency bug.

**3. The parade animation was firing but invisible — confirmed via Playwright, not guessed.**
Rather than reasoning further from the code, seeded `screen-shp-table` directly in a headless
Chromium session (`visual-check` skill) and played a card to trigger `shpStartSheepAnim`. DOM
inspection showed `.shp-sheep-fly` elements *were* present, correctly animating (`animation-name`
set, opacity ramping 0→1→0 across the timeline) — the animation was never broken. It was simply
**too small (1.7rem) and, until fix 1 above lands, drawn as a white box on a near-white
(`bg-stone-50`) background** — functionally invisible even while running correctly. The size bump in
fix 2 addresses half of this; full visibility is blocked on the same alpha-channel fix as fix 1. Lesson:
when a report says "animation isn't showing," check whether it's actually not *firing* (a state or
timer bug) before assuming that — here it was a pure visibility problem, and the DOM inspection took
less time than a second guess would have.

**4. Last Played redesigned as a real card, not emoji+text.** The herd band's right column
previously showed `emoji + label` text (e.g. "🐑 +10") under a "LAST" label, plus a separate
"Dream Journal →" link. Rebuilt as: **"Last Played"** label, then the actual last-played card(s)
rendered through `shpRenderCard` — the game's own render seam, so it's skinnable and can never
drift from the live deck, same principle as the How-to gallery (`ui-style.md` § Optional tab bar).
The card is scaled into a fixed-footprint wrapper (`.shp-last-card`: `2.1×2.9rem` box,
`.shp-card` inside it `transform:scale(0.525)` anchored `top left`) so the grid column reserves the
post-scale box, not the full 4×5.5rem card. The card element itself is the tap target for the Dream
Journal (`aria-label="View Dream Journal"`) — no separate link text, since the owner judged the log
isn't important enough this game to need an explicit affordance beyond a tappable card. This
required switching that part of `shpRenderTable`'s Climb-branch from a single `innerHTML` string to
building `rightCol` as a real DOM node via `document.createElement`/`appendChild`, since a
`shpRenderCard()` element can't be serialised into an HTML string. Verified end-to-end in
Playwright: clicking the card opens `shp-play-log-overlay`.

**Verification for this round:** all three fixes were confirmed with a real headless-Chromium
Playwright session (`visual-check` skill) — seeded table state, screenshotted before/after, measured
`.shp-sheep-fly`/`​.shp-pen`/`.shp-last-card` geometry via `getBoundingClientRect`, and clicked the
new Last Played card to confirm the journal overlay opens. This is stronger than the "unverified in
a real browser" caveat attached to the v173 round — that caveat is exactly what let the rotation and
sizing mistakes ship unnoticed until the next playtest. `node -c js/games/shp.js` passed; the
250-game headless sim (rules/state only — it stubs `getElementById` to `null`, so it never executes
this round's DOM-building code) stayed green throughout, as expected — it was never going to catch
any of these three, which is why the Playwright pass was the actual verification this time.

**Correction, same day (see next entry): the v174 verification above did not catch everything.**
It confirmed the animation was *firing* (DOM elements present, `animation-name` set, opacity
sampled at one instant mid-flight). It did not sample opacity across the *whole* timeline, which is
what the v175 entry below found actually mattered — a real device still couldn't see it.

---

## Deep Sleep hold, herd-band layout, and the REAL animation bug (2026-08-13, SW v175→v176)

Third playtest round on the same feature. Two of the three items below are corrections to fixes
made in the two rounds before — worth reading as a single story about verifying the wrong thing.

### BUG-05 — the flying sheep were rendering at ZERO WIDTH the whole time

**What happened.** Three consecutive rounds "fixed" the sheep parade — a size bump (v174), an
alpha-channel re-export (v174), an opacity-curve keyframe fix (v175) — and the owner still could
not see a single sheep. Every one of those was a real defect, and none of them was *the* defect.

**Root cause.** Tailwind's preflight sets `img { max-width: 100% }`. The flying sheep live inside
`.shp-sheep-layer`, which is deliberately a **0×0 anchor point** (`width:0; height:0`) so the
parade never contributes layout — that part is correct and load-bearing (§ Transient animations
must float, `ui-style.md`). But `.shp-sheep-fly` is an absolutely-positioned span with no width, so
it shrink-wrapped against a 0-width containing block → `max-width: 100%` on the `<img>` inside
resolved to **0px** → the sheep rendered at zero width. Invisible, on every device, always.

This was introduced in v173 by the emoji → real-art swap, and it is exactly the kind of bug that
swap could produce: **text ignores `max-width`, images don't.** The 🐑 emoji had rendered fine in
the same 0-width span for weeks, which is why the whole mechanism looked proven.

**Fix.** `max-width: none` on `.shp-sheep-fly-img`, plus an explicit width on `.shp-sheep-fly`
(with a `margin-left` of half that, to keep the sheep centred on the anchor path rather than
hanging off its right edge).

**Lesson — "the element exists and is animating" is not "the element is visible."** Rounds v174 and
v175 both verified via `getComputedStyle`/`getBoundingClientRect` and both got green answers to the
question they asked (is it there? is it animating? what's its opacity?). Neither asked **what are
its dimensions**, and `width: 0` was sitting in the very same `getBoundingClientRect()` payload that
was being read for position each time. When something is reported invisible, check the **box** —
width/height and the computed value of every inherited constraint (`max-width`, `max-height`,
`overflow`, `clip-path`) — before checking anything else. A zero-size box is the single most common
way an element is simultaneously "present, correct and animating" and completely unseeable.

**Second-order fix from the same round:** with the sheep finally visible, a `+10` put 8 of them on a
~132px path at a fixed 2.5rem — one continuous woolly mass. Sheep width is now scaled to flock size
via a `--shp-sheep-w` custom property set per-parade on the layer (2.5rem for ≤3, 1.95rem for 4–6,
1.55rem for 7+), and `SHP_SHEEP_STAGGER_MS` went 90 → 150.

### BUG-06 — the Deep Sleep summary appeared, then bounced back to the table

**What happened.** A player with no legal cards saw the Night-summary screen appear and then, about
a second and a half later, get replaced by the play table again. A non-host player in that state was
then stranded: the table had no button for them and the host was waiting on an ack they could not
send. (Host-side behaviour differed slightly, which is what made it look like two bugs.)

**Root cause.** Two render timers called `shpRenderTable()` **directly**, bypassing
`shpShowTable()`'s `if (shpDeepSleepInfo) { shpRenderDeepSleep(); return; }` guard:
`shpAnimTimer` (the sheep-parade clear) and `shpTapReadyTimer` (the 1s tap gate). A `'stuck'` Deep
Sleep resolves in the *same tick* as the play that caused it — so the parade timer started by that
play was always still pending, and ~1.5s later it painted the table straight over the summary.

**Fix.** Both timers now check `shpDeepSleepInfo` and route through `shpRenderDeepSleep()` (or bail)
rather than unconditionally repainting the table.

**Lesson — every deferred render is a screen transition racing whatever happened since.** A
`setTimeout` that calls a *specific* screen's render function is asserting "we will still be on that
screen in N ms," which is exactly the assumption a crash/advance path breaks. Deferred repaints
should go through the same guarded entry point as the initial navigation, never straight to a
renderer. Grep for `setTimeout(... shpRender` / `... Render` before shipping any new timed UI.

### The stuck player now HOLDS instead of auto-advancing

Owner call, and the right one: "the round can play out as normal but once a player can't play a
valid card the engine checks, then displays the button which pressed proceeds everyone to the
summary." Previously `shpAfterAdvance()` detected no-legal-line and immediately ran
`shpHostDeepSleep()` — the table lurched into the summary with no beat and no agency.

New state `shpStuckIdx` (-1 = nobody), **host-declared and synced** via a new `SHP_STUCK` SYNC.
When the host detects the incoming player has no legal line it sets `shpStuckIdx`, broadcasts, and
everyone holds on the table: that player sees their (all-illegal) hand greyed plus a **"Nod Off"**
button; everyone else sees "*Name* has no safe cards left…". The tap runs `shpHostDeepSleep`
directly on the host, or sends a new `SHP_STUCK_ACK` ACTION from a client (the dedup guard drops
self-sent envelopes, so the host must never route its own tap through `mpSendEnvelope` —
`logic-engine.md` § host-as-participant). `shpStuckIdx` is cleared by `shpHostDeepSleep`,
`shpDealNight`, `shpResetState`, and by the `SHP_DEAL` / `SHP_TURN_RESULT` / `SHP_DISRUPT_RESOLVED`
appliers (any turn-advancing packet resolves a hold).

**The `|| -1` trap, avoided deliberately:** the `SHP_STUCK` applier reads
`(p.stuckIdx === undefined || p.stuckIdx === null) ? -1 : p.stuckIdx` — **not** `p.stuckIdx || -1`.
Seat **0** is a legitimate stuck player and `0` is falsy, so the idiomatic `||` would have silently
converted "player 0 is stuck" into "nobody is stuck" and hung the table for exactly one seat. This
is the sibling of the Firebase erase-empty rule: `0`/`false`/`''` are stored fine, but they still
break every `||` default written without thinking.

**A bust is deliberately NOT held.** `shpPostResolve`'s overshoot path still goes straight to the
summary: the player just chose to gamble and the result screen *is* the answer to their own action.
The hold exists for the case where the game decides *for* you.

### Herd band relaid out (owner ask)

"Last Played" is now a real column heading sitting on the **same line** as "THE HERD" — the band is
`items-start` and both columns lead with a same-metric label (`.shp-herd-label` / new
`.shp-last-label`, stone rather than indigo so the centre column keeps the emphasis). The pen has no
heading, so it takes `self-center` to stay optically centred against the taller middle column. The
Last Played card grew 2.1rem → 3rem wide (`scale(0.525)` → `scale(0.75)`) and the pen 5.4rem →
6.6rem, both per the ask to fill the flanking space without competing with the counter.

**Verification for this round.** Real headless Chromium (`visual-check`): asserted the two headings
share a `top` to within 1px, the parade's elements sit **inside the herd band and below the header
row** (the v175 anchor fix — they had been flying through empty space above the status bar), that a
stuck player gets a Nod Off button with `shpDeepSleepInfo` still null (no auto-advance), and — the
regression that matters — that after tapping it the summary is **still** on screen 2.6s later, past
every render timer. The 250-game headless sim stayed green, and its stuck invariant was rewritten:
"no legal line" is now a legal settled state, so it asserts the *hold contract* instead
(`shpStuckIdx` matches the active player, and is never set for a player who can still play).

---

## Pen art replaced + animation opacity bug (2026-08-12, SW v174→v175)

The v174 fixes weren't enough. Owner reported the CSS-composed pen's positioning was "still off,"
and — more importantly — the parade animation was **still not visible** on a real device despite
the v174 size bump and the confirmed-correct alpha channel.

**1. Pen simplified to a single image, CSS composition abandoned.** Rather than iterate the
hand-placed-offset 4-sheep-plus-fence layout a third time, the owner drew one `pen.png` (200×200,
sheep and fence baked into a single composition by hand, transparent — verified colour type 6/RGBA
the same way as the v174 sheep/fence check). This is a strictly better approach for any future
non-card "furniture" art of this kind: a single pre-composed image has no CSS-side positioning
decisions to get wrong, versus N separate transparent layers that all need independently-tuned
offsets to read as one coherent scene. `data/art/shp/pack.json`'s `extras` block now has `pen`
instead of `fence`; `fence.png` and the old 4-sheep CSS (`.shp-pen-sheep`, `.shp-pen-fence`,
the hand-placed inline `style` offsets in `shpRenderTable`) are gone. `.shp-pen-img` is one rule:
`width: 5.4rem; height: auto;` plus a drop-shadow.

**2. The actual "animation isn't showing" bug, finally isolated.** `@keyframes shpSheepArcIn` and
`shpSheepArcOut` (`css/styles.css`) set `opacity` explicitly only at **0%, 15%, and 100%** — no
keyframes engine holds a value between two explicit stops, it interpolates linearly across the gap.
With the nearest stops at 15% (opacity 1) and 100% (opacity 0), that means opacity was **linearly
falling for the entire remaining 85% of the animation** — by 1000ms of a 1200ms run, a sheep was
already down to roughly 20% opacity. The v173 and v174 rounds both sampled opacity at a single
instant (a screenshot, or one `getComputedStyle` read) and both happened to land on values that
looked plausible without revealing the shape of the curve. This round sampled
`getComputedStyle(...).opacity` at five points across the full 1200ms window instead of one:
before the fix, opacity at 900ms ranged ~0.4–1 and was actively dropping frame to frame; after
adding one more explicit stop — `85% { opacity: 1; }` — opacity holds at exactly 1.0 for every
sheep through at least 900ms, only fading in the final 15% as originally intended. **This was the
real bug the whole time.** The v173 sizing (`1.7rem` sheep) and the v174 alpha-channel fix were
both genuine improvements, but neither one touched the actual cause — the animation was fading to
invisible on its own fixed schedule regardless of size or background colour.

**Lesson — a single-instant sample of an animation proves it fired, not that it's visible.**
`getComputedStyle` at one point in time (or a screenshot) confirms the element exists and the
animation is attached; it says nothing about the *shape* of the timeline unless sampled at enough
points to see the curve, or unless every declared property has an explicit stop near both ends of
any span you care about. Any future CSS keyframe animation in this codebase that fades in/out
should set the fade-relevant property (typically `opacity`) at a stop close to *both* sides of the
"stay visible" plateau — not just at the start of the fade-in — or the browser's linear
interpolation will quietly eat into it.

---

## Fogged Dream badge, stuck-player messaging, Tap-Hold Reference (2026-08-12, SW v171→v172)

Three fixes from the same live 3-player test that shipped v171:

### Fogged Dream still looked "unskinned" after the art landed
**What:** the border stayed violet and a giant 1.4rem "?" sat over the artwork.
**Root cause:** `shpRenderCard`'s cardId===13 branch kept `className = 'shp-card shp-card-cursed'`
(violet border + background, oversized label) even once `assetFace('shp',13)` resolved — that
styling was sized to fill an EMPTY card, not to sit on top of a real photo. Split into two paths:
art present → `shp-card-asset shp-card-fogged` (transparent border like every other skinned card,
plus a small violet corner badge `.shp-card-fogged-badge`); no art → unchanged `shp-card-cursed`
fallback. **Lesson:** a conditional "art or fallback" branch needs its **styling class** to switch
with it, not just its `backgroundImage` — the fallback's CSS was written for a card with nothing
else on it, and silently inherited by the art path.

### Active player left staring at "Your turn" with nothing playable
**What:** after Swap Dreams handed a bad hand to the next player (Herd near 99, no safe card),
that player's own screen kept showing "Your turn — play a card" while every tap boinged. Two other
players had already reached the Deep Sleep / round-summary screen and were waiting on a "Got it"
they had no way to know the stuck player still needed to receive.
**Fix, not a full root-cause chase:** rather than hunt a specific packet-timing race (auto Deep
Sleep is host-authoritative and fires the instant `shpAfterAdvance` sees no legal line — for the
host that's synchronous, for a client it's one network hop), `shpRenderTable` now runs the SAME
`shpHasLegalLine(me)` check locally on the active player's OWN device. If it comes back false, the
banner switches to "😴 No safe cards left — you're drifting off…" and the footer renders the
(all-illegal) hand greyed with no tap handlers, instead of a normally-interactive footer that just
boings on everything. This makes the waiting state legible on the stuck player's screen regardless
of exactly when the host's `SHP_DEEP_SLEEP` sync lands — it can no longer read as "I'm supposed to
be able to play something and I can't find it." **Template Gap:** if this exact hang (not just the
confusing message, but the transition never actually completing) recurs, that's a genuine
host↔client packet delivery bug and needs a live-logged repro, not another UI patch — flag it
distinctly from this fix if seen again.

### Tap-hold now jumps to the gallery instead of a standalone popup
Replaced `shp-card-info-overlay` (a Decision Modal duplicate of what the How-to gallery already
explains) with the PKO pattern generalised: `shpBindCardHold` now calls
`shpOpenHowTo('cards', cardId)`, which forces the gallery tab and scrolls+rings the matching row
(`data-shp-card-id`, `.shp-ref-row-ping`). The Wolf hand-slot (no card id of its own) points at
real card **12** — its gallery row is what explains the locked slot. Fully retired the popup:
`shpShowCardInfo` deleted, its overlay markup removed from `index.html`, its close-button and
backdrop-click listeners removed, its entry dropped from `engine.js`'s `resetToLobby()` teardown
list and the section-header overlay comment. **Promoted to a documented default**,
`ui-style.md` § **Tap-Hold Reference** — any game with a How-to gallery tab should default new
card long-presses to this instead of building a per-game popup; PKO's `pkoBindChainHold` is the
other reference implementation, now named as the pattern's origin rather than a one-off.

### New card art updated, old versions retired
Owner supplied v2 art for cards 17/18 (higher-contrast symbols, easier to read at hand-thumb size).
Reconverted through the same pipeline (400px/40KB cap) — `17.jpg` 39.4KB, `18.jpg` 37.1KB. Old
masters and old converted JPGs both removed per owner instruction; new PNG masters archived to
`data/packs/plush-sheeps/img/card17.png` / `card18.png` (source-of-truth pattern, matches every
other SHP card).

---

## Two new cards, table polish, Night desync (2026-08-12, SW v171)

### BUG-04 — clients sat on "Night 0" for the whole match
**What:** host showed "Night 1", both clients showed "Night 0"; it never corrected.
**Root cause:** `shpNightNum` is incremented inside `shpDealNight()`, which is **host-only** (clients
never call it — they receive `SHP_DEAL`). The counter was simply never added to the `SHP_DEAL`
payload, so clients kept their initial `0` forever. Purely cosmetic (nothing reads `shpNightNum`
except the status bar), which is why it survived launch and every harness.
**Fix:** `nightNum: shpNightNum` in the `SHP_DEAL` payload; client applies `p.nightNum || shpNightNum`.
**Lesson:** this is the accumulator rule (`logic-engine.md`) with the sign flipped — that rule
catches state the host *resets* and the client carries forward stale; this is state the host
*advances* and the client never advances at all. Same test either way: for every host-side
assignment to a piece of shared state, ask which packet carries it. A field only the status bar
reads still shows up on three screens.

### The two new cards (ids 17 / 18)
Owner-supplied art arrived for two new cards, so both were built this round:
- **`17` Rude Awakening (alarm, `kind:'shuffle'`)** — reseats the table for the rest of the Night.
- **`18` Swap Dreams (pillow, `kind:'swap-hands'`)** — trade your whole Pen with a random living player.

**Rude Awakening needed a seating ring that did not previously exist.** Turn order was raw index
arithmetic (`(i + shpDirection + n) % n`), which has no representation for "the table is in a
different order now". Added `shpSeatOrder`, a permutation of player indices; `shpNextPlayer` and
`shpLeaderIdx`'s tie-break now walk it via a shared `shpRing()` helper (which falls back to identity
if a packet arrives without one). It resets to identity every Night and ships in **every packet that
can change whose turn it is** — `SHP_DEAL`, `SHP_TURN_RESULT`, `SHP_DISRUPT_RESOLVED` — because a
client walking a stale ring computes a different "next player" than the host, which is a desync that
would present as a dead button on whoever's turn it actually was.

**Swap Dreams tops up BOTH hands.** `shpDrawUp` is normally only called for the acting player, so
the swap partner would have been left short a card until their own turn (or permanently, if their
new hand was already at their cap). The partner's top-up happens inside the swap itself. Note the
cap stays with the *player*, not the cards — a Wolf-shrunk player who swaps into a full hand still
only re-fills to their reduced cap.

**Both leave the Herd alone**, so `shpHerdAfterCard`'s `default` case covers them and they inherit
the normal "legal only while Herd ≤ ceiling" rule from `shpIsPlayable` with no legality changes —
same shape as Doze and Toss & Turn.

**`shpLastEffect` (new).** A reseat or a hand swap is invisible on every device except the actor's:
the play log only records *which card* was played, not what it did. `shpLastEffect` carries the
outcome sentence ("traded Pens with Sam", the new seating order) and rides in `SHP_TURN_RESULT`. It
is deliberately **not** `shpLastDisrupt` — `shpBroadcastTurn` clears that one, so anything set during
resolve would be wiped by the very packet meant to carry it.

**Deck rebalanced 73 → 80.** Adding 4 hoardable specials at the old counts would have dropped the
pasture share 66% → 62% and partly undone the 30 Jun 2026 anti-hoarding rebalance, so pastures went
+3 (0:15, 1:15, 2:13) alongside `17:2, 18:2` — landing at 51/80 ≈ 64%. **Watch in playtest.**

**Verification:** the throwaway `vm` harness was extended with two new invariants and run over 600
games (3–8 players, Sylly on/off): the seat ring must stay a valid permutation at every settle point,
and total cards (flock + discard + all hands) must stay constant except after a Fog nightmare (which
legitimately destroys a card). A separate 120-game probe confirmed both cards actually fire —
Rude Awakening played 1,906 times and changed the ring on **all** of them, Swap Dreams played 1,928
times and recorded a swap on all of them. Without that second probe the first run proves nothing
about the new cards: a card that is never drawn passes every invariant trivially.

### Wide Awake was documented backwards
`shpLeaderIdx()` picks the player with the most **Moons**; the inspect-modal text said "whoever
holds the most cards". Since hand size is always at cap, that description made the card look
random — which is exactly the "Wide Awake feels useless" playtest note. Text corrected to name the
Moons leader and to say the intervening players are skipped. **Lesson:** a card that playtests as
"pointless" is worth diffing against its own implementation before it is rebalanced — the effect
here was fine, the explanation was wrong.

### Table polish (Climb stage)
The stage read flat: a large counter flanked by two `text-stone-400` captions and two plain text
arrows. Changes, all CSS-class-backed in `styles.css` (`.shp-herd-*`, `.shp-dir*`, `.shp-chip*`)
rather than inline Tailwind, so the table has one place to restyle:
- **Pressure ramp** (`.shp-herd-bar`) under the counter — fill = Herd as a % of ceiling, colour
  indigo → amber (60%) → red (85%), and the counter digits take the same colour. This is the piece
  the bare number was missing: 62 and 91 looked identical at a glance, so the climb had no visible
  tension.
- **"The Herd"** promoted from stone-400 to indigo-400 bold with wider tracking; **"ceiling N"**
  became a bordered badge instead of a whispered caption.
- **Direction** keeps its above/below placement (it reads as the flow of play) but the live one is
  now a filled brand pill and the dormant one a stone-300 ghost.
- **Player chips** lost the "N cards" line. Everyone is always at their cap, so the only thing it
  ever revealed was who had been Wolf-shrunk — private information, published. Chips now render in
  **ring order** (so a reseat is legible) with a ring-glow + lift on the active player.

---

## Sleepwalkers folded into Sylly Mode + Wolf-slot art (2026-08-11, SW v168→v169)

**What happened:** owner playtest feedback: the ghost/Nightmare-Meter system (Sleepwalkers) was a
separate ON-by-default toggle sitting alongside Sylly Mode (Night Terrors), so a base-rules game
could still have eliminated players haunting the table. Owner's call: fold it into Sylly Mode
entirely — the ghost system now only activates when Night Terrors is on ("they only become active
during the flip"). `shpSleepwalkers` was deleted as a variable; every call site (`shpChargeMeter`,
`shpMeterReady`, the Nightmare Meter UI gate) now reads `shpSyllyMode` directly. The standalone
settings card and its `btn-shp-sleepwalk-toggle` were removed from `index.html`; the Sylly Mode
settings card and How-to card absorbed the Sleepwalkers/Nightmare Meter description, and the old
How-to "Step 4: Sleepwalkers" base-game step was folded into the How-to Sylly Mode card instead of
staying a numbered base step. `shpElimOrder` tracking and the "Sleepwalker" elimination-state label
are unaffected — a player still becomes a Sleepwalker at 0 Moons in base rules, they just don't
haunt anything without Sylly Mode on (the in-table banner was made conditional: `'You are out for
the night…'` in base rules vs `'…haunting the dream…'` under Sylly Mode).

**BUG — MDLM start-game silently failed after the above (same session, caught in live 3-player
test).** `js/games/shp.js` was the only file swept for `shpSleepwalkers` — `js/engine-multiplayer.js`
had two more references the grep-by-file habit missed: `mpSerialiseSettings('shp')` (sent in
SETTINGS_SYNC just before GAME_START) and the matching SETTINGS_SYNC applier. Referencing the
now-undeclared `shpSleepwalkers` inside the settings object literal threw a `ReferenceError` at the
exact moment the host tapped the lobby's "Lights Out" Start button; `mpConfirmRoster()`'s `catch`
swallowed it and just reset the button to "Start Game →" with no visible error — from the host's
seat it looked like the button simply did nothing. Fixed by removing both references. **Lesson:**
a variable that backs a per-game MDLM setting has (at least) three homes, not one — the game's own
`js/games/[abbr].js`, `mpSerialiseSettings()`'s per-game case, and the matching SETTINGS_SYNC
applier switch in `engine-multiplayer.js` — deleting a settings variable needs a grep across
**both** files, not just the game's own. A `try/catch` around a multi-step async lobby action
(SETTINGS_SYNC → GAME_START) is exactly the shape that turns a `ReferenceError` into a silent
no-op button instead of a visible crash, so a "the button doesn't do anything" report on an MDLM
Start button is worth checking the browser console for a caught exception before assuming it's a
logic/timing bug.

**Wolf hand-slot placeholder now shows real art.** The in-hand "slot locked" placeholder
(`shpRenderCard(null, { wolf: true })`) always rendered the hardcoded 🐺 emoji, even though the
core-art pack's `12.jpg` (the Big Bad Wolf card itself) was already in the manifest and precached —
the wolf card is consumed straight to discard on draw (`shpDrawUp`) and so is never rendered through
the normal `assetFace('shp', cardId)` path that every other card uses. Fixed by having the wolf
branch try `assetFace('shp', 12)` first (keeping the greyed/italic `.shp-card-wolf` styling and the
"asleep" label as an overlay on top of the art), falling back to the emoji only if no art resolves.
**Lesson:** any placeholder branch in a render seam that bypasses the normal `assetFace` lookup for
UX reasons (locked slot, hidden value) needs to be checked separately when core art ships — it's
invisible to a `cardId !== 13`-style audit because it never reaches the id-keyed lookup at all.
