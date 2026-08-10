# DYB Implementation Notes — The Bluff (internal `dyb`)

## Design Decisions

**Stack sweep (26 June 2026) — `screen-dyb-spirit-board` migrated to the centred Stack.**
The eliminated-player spectator screen (The Depths 🌊) was the only DYB screen on the legacy `h-screen overflow-hidden` sticky-footer pattern. Migrated to the centred **Stack** (`ui-style.md` § The Stack) in the suite-wide sweep via the scoped class-transform — markup-only, IDs (`dyb-spirit-allegation`, `dyb-spirit-grid`) and render code unchanged. The main `screen-dyb-table` and other DYB screens were already Stack/centred-compliant. Method: throwaway Node script (per the index.html-encoding rule), SW → v127.

**Thematic rename: "Dicey Bluffs" → "The Bluff" (June 2026 backlog sweep).**
The title was reworked around the geological double meaning of *bluff* (a high sea-cliff), giving the whole game a climb/cliff metaphor. Display mapping: Allegation → **The Claim**, Raise the Stakes → **Climb Higher**, Call Bluff! → **Call the Bluff**, The Showdown → **The Overlook** (eyebrow "Reaching the Edge"), The Spirit Board → **The Depths** (🌊), The Clean Out → **The Summit**, Devil's Luck → **The Tempest**, House Rules → **Ground Rules**, Walk Away? → **Back Down?**, Roll Again? → **Climb Again?**, seating "Pull Up a Chair" → "Take Your Position". "Shake" (round + roll action) and the dice/pip mechanics were deliberately kept — they are literal, not flavour.
- **Scope discipline:** view-layer strings ONLY. The `dyb` prefix and every code identifier (`dybAllegationHistory`, `DYB_ALLEGATION`, `screen-dyb-showdown`, `screen-dyb-spirit-board`, die-type strings `'loaded'`/…/`'snake'`) are untouched — renaming functional identifiers across `index.html`/`engine-multiplayer.js`/`sw.js` would be pure churn with a large breakage surface for zero player-facing gain. The abstraction stays strictly in the view layer.
- **Files touched:** `index.html` (lobby card + DYB section), `dyb.js` (`'No bid yet.'`→`'No claim yet.'`, single-device play-again label `'Roll Again'`→`'Climb Again'`), `engine-multiplayer.js` (`gameName`), plus docs + SW bump to v113. The verdict strings `'CLAIM HOLDS'`/`'BLUFF CALLED'` and `Claimed:` already aligned with the new vocabulary and were left as-is.
- **Method:** `index.html` was swept with a throwaway Node script (per the project's index.html-encoding rule — never the Edit tool for systematic index.html changes), scoped to the substring between the DICEY BLUFFS and PASS section markers so PASS's identical `"Walk Away?"` quit heading was provably untouched, with a per-replacement count assertion that aborts before writing if any expected count is wrong (it caught "The Allegation" appearing 3× not 2× — the how-to body "This becomes The Allegation." was the third).
- **Stale doc cleanup found en route:** the terminology table still listed "Stealth Veil" (the dice-hiding eye toggle) — removed in BUG-11 but never struck from `game-identities.md`. Dropped during the sweep.

**Seating screen is host-only.**
`screen-dyb-seating` is shown exclusively to the host after `onPassThePhone` fires. Clients remain on `screen-mp-lobby-join` until `DYB_GAME_START` is received, at which point they navigate directly to the Shake screen. The seating screen is purely a pre-game waiting room and player-count confirmation — no mechanics depend on it.

**Seat numbers are not shown on the seating screen.**
Random seat assignment happens in `dybStartGame()` and is distributed via `DYB_GAME_START`. Showing sequential placeholder numbers (1, 2, 3…) before randomisation would be misleading. The seating list just shows who's in the game with a neutral "ready" label.

**`DYB_SPIRIT_SHAKE` and `DYB_SHAKE_ACTIVE` are sent back-to-back from the same function.**
Both are fire-and-forget writes to Firebase. All devices receive both. The Spirit Board routing relies on `dybActivePlayers.includes(mpMyPlayerIdx)` to distinguish eliminated vs active devices at the point of receipt. This is sufficient because `dybActivePlayers` is updated from `DYB_SHOWDOWN` before the next shake begins.

---

## Bug Index

**BUG-01: `dybPlayerCount` not set in `DYB_GAME_START` client handler**
- **What happened:** `dybPlayerCount` is only assigned in `onPassThePhone`, which only runs on the host. Clients kept `dybPlayerCount = 0` (default).
- **Root cause:** `dybRenderAllHandsOnShowdown()` iterates `for (let i = 0; i < dybPlayerCount; i++)`. With `dybPlayerCount = 0` on clients, the showdown screen rendered zero hands — blank reveal.
- **Fix:** Added `dybPlayerCount = payload.playerNames.length;` to the `DYB_GAME_START` SYNC handler, immediately before the `dybActivePlayers` assignment.
- **Found during:** Protocol B Step 3 routing trace (pre-first-run).

**BUG-02: `DYB_SHAKE_ACTIVE` SYNC overrides Spirit Board navigation for eliminated devices**
- **What happened:** `dybBroadcastShakeActive()` sends `DYB_SPIRIT_SHAKE` then `DYB_SHAKE_ACTIVE` to all devices sequentially. Eliminated devices correctly navigate to the Spirit Board on `DYB_SPIRIT_SHAKE`, then immediately get rerouted to the table by `DYB_SHAKE_ACTIVE`.
- **Root cause:** The `DYB_SHAKE_ACTIVE` handler had no guard for eliminated players.
- **Fix:** Added `if (!dybActivePlayers.includes(mpMyPlayerIdx)) return;` at the top of the `DYB_SHAKE_ACTIVE` SYNC case.
- **Found during:** Protocol B Step 3 routing trace (pre-first-run).

**BUG-03 (Critical): Wrong `bidderIdx` in `dybResolveShowdown()` — challenger penalised instead of last bidder**
- **What happened:** `dybProcessAllegation()` advances `dybCurrentBidderIdx` to the next player after each bid. When player B calls bluff, `dybCurrentBidderIdx` has already been updated to B. `dybResolveShowdown()` used `dybCurrentBidderIdx` as the bidder, making bidderIdx and challengerIdx the same person (B). When `real < claimed` (A's bid was a lie), `loserIdx = bidderIdx = B` — the challenger incorrectly loses a die.
- **Root cause:** `dybCurrentBidderIdx` tracks whose turn it is next, not who made the last bid. The variable is updated before `dybChallengerIdx` is set.
- **Fix:** Read the last bidder from `dybAllegationHistory[dybAllegationHistory.length - 1].playerIdx` instead. Safe because `Call Bluff!` is disabled when no bid exists, so the history array is never empty at resolution.
- **Found during:** Protocol B Step 5 code trace.

**BUG-04 (Minor): `dybStartSession()` skipped seating render; clients incorrectly routed to seating screen**
- **What happened:** `dybStartSession()` called `showScreen('screen-dyb-seating')` directly without calling `dybRenderSeatingList()`, leaving the seating list blank. Additionally, clients who had the post-lobby Play CTA available would navigate to the seating screen instead of waiting for `DYB_GAME_START`.
- **Root cause:** `dybStartSession()` was written before `dybShowSeating()` existed as a combined helper, and no client guard was added.
- **Fix:** Replaced the body with `if (window.syllyMultiplayerMode === 'client') return;` then `dybShowSeating()`.
- **Found during:** Protocol B Step 5 code trace.

**BUG-05: Sound button and Settings button unresponsive on DYB menu**
- **What happened:** After quitting a game mid-session (via the ✕ → quit overlay → confirm path), the sound button and Settings button on the DYB menu were completely unresponsive — taps did nothing.
- **Root cause:** `dyb-slick-picker-overlay` is `fixed inset-0 z-[100]`. It can only be dismissed from within the table screen. Neither the quit-confirm handler nor `resetToLobby()` hid it, so it persisted over the game menu as an invisible but full-screen tap interceptor. All taps went to the overlay, which had no open handler from the menu context.
- **Fix:** (1) Added `document.getElementById('dyb-slick-picker-overlay').style.display = 'none';` to the `resetToLobby()` DYB teardown block in `engine.js`. (2) Added the same hide call to the `btn-dyb-quit-confirm` click handler in `dyb.js`, before `showScreen('screen-dyb-menu')`.
- **Prior art:** Same pattern as GTH canvas wrapper and LTTP message interrupt overlay — any `fixed inset-0` overlay that can be opened mid-game must be explicitly cleared in both `resetToLobby()` and every "return to menu" path.
- **Found during:** Live testing post-Phase Gate audit.

**BUG-06: Gameover standings invert the loser ranking (RESOLVED — confirmed correct in June 2026 playtest audit)**
- **What happened:** Final standings rank the *first*-eliminated player as runner-up and the *last*-eliminated as wooden spoon — exactly backwards.
- **Root cause (logged):** `dybShowGameover()` would reverse `eliminationOrder` into `order`, then spread `...order.reverse()` — reversing the same in-place array twice, netting the original forward order. The double-reverse cancels.
- **Status:** Code audit confirmed the current `dybShowGameover()` already reads `const positions = [data.winnerIdx, ...order]` (no second `.reverse()`). The bug was resolved prior to this playtest session — most likely during an earlier backlog pass. Verified correct: last-eliminated = rank 2, first-eliminated = last rank.
- **Lesson:** `Array.prototype.reverse()` mutates in place and returns the same array — a `[...arr].reverse()` followed by `arr.reverse()` is a double-reverse, not two independent copies.

**BUG-07: Phantom die never reveals its face, even at showdown (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** A Devil's Luck phantom die showed "?" everywhere, including the showdown reveal — so the real count couldn't be audited.
- **Root cause:** `dybDieHTML()`'s `phantom` case set `display = '?'` unconditionally.
- **Fix:** Redesigned `dybDieHTML` to CSS pip dice (`DYB_PIP_LAYOUTS`). The phantom case now uses `dieIdx >= 0` to distinguish owner's live hand (show "?" text label) from showdown render (`dieIdx = -1`, show real pip face). The `visible` param is removed from the distinction — always true now that the veil is gone.
- **Found during:** Post-Phase-34 backlog testing.

**BUG-08: Eliminated players pulled back to the Shake screen each round (RESOLVED — confirmed correct in June 2026 playtest audit)**
- **What happened:** After elimination, a player navigated to `screen-dyb-shake` at the start of every subsequent shake and sat there until `DYB_SPIRIT_SHAKE` arrived.
- **Root cause:** BUG-02 added an eliminated guard to `DYB_SHAKE_ACTIVE`, but `DYB_NEXT_SHAKE` (from `dybAdvanceFromShowdown()`) called `dybInitShake()` with no such guard.
- **Status:** Code audit confirmed the fix is already in place at `DYB_NEXT_SHAKE` handler: `if (!dybActivePlayers.includes(mpMyPlayerIdx)) { dybShowSpiritBoard(); } else { dybInitShake(); }`. The fix was applied prior to this playtest session.
- **Lesson:** The eliminated-guard pattern must cover *every* handler that can show the Shake screen (`DYB_NEXT_SHAKE` as well as `DYB_SHAKE_ACTIVE`), not just the one found in the first trace.

---

## Multiplayer Lessons
*(distilled from the Bug Index — Fable audit, Phase 5A, June 2026)*

**Guard every entry point that can show the Shake screen, not just the first one found**
Eliminated devices must route to the Spirit Board, not the Shake screen. `DYB_SHAKE_ACTIVE` (BUG-02) and `DYB_NEXT_SHAKE` (BUG-08) both navigate there and both needed a `!dybActivePlayers.includes(mpMyPlayerIdx)` guard. When adding an eliminated/standby guard for one packet, grep for every other packet that reaches the same screen and guard them all in the same pass.

**Track "last bidder" separately from "whose turn is next"**
`dybCurrentBidderIdx` advances to the next player on each bid, so it is the wrong value at showdown resolution (BUG-03). Read the actual last bidder from `dybAllegationHistory[last].playerIdx`. A turn-pointer and a last-action index are different facts — never reuse one for the other.

**Re-derive host-set counts in the SYNC handler on every device**
`dybPlayerCount` is assigned only in the host-only `onPassThePhone`, so clients kept the default `0` and rendered zero hands at showdown (BUG-01). Any count/array a render loop depends on must be set from the `DYB_GAME_START` payload on every device, not assumed from setup.

**Mid-game overlays must be torn down in both reset paths**
`dyb-slick-picker-overlay` (`fixed inset-0 z-[100]`) survived a mid-game quit as an invisible full-screen tap interceptor over the menu (BUG-05). Any overlay openable during play must be hidden in `resetToLobby()` AND in every "return to menu" handler — same lesson as GTH canvas wrapper and LTTP message interrupt.

**`resetToLobby()` tears down one device, never notifies the rest [MDLM quit contract fix, 1 Aug 2026]**
DYB's quit-confirm already called `resetToLobby()` unconditionally (the docs claiming it still navigated to the game menu were stale — see the equivalent GTH note for the full root cause). What was missing was the PASS contract's other half: a **client** quitting mid-game removes only its own `/players` node, which the host isn't listening for mid-game, so the host and any surviving clients are left waiting on a player who will never move. Fix: client quit-confirm now sends `DYB_PLAYER_LEFT` before its local `resetToLobby()`; the host's existing host-only ACTION gate in `dybHandleEnvelope` calls `resetToLobby()` on receipt, which broadcasts `HOST_END_GAME` and lets the generic disconnect overlay do the rest.

---

**BUG-09 (Critical): `env.originIdx` is always `undefined` — all ACTION handlers broken (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** The game was completely non-functional in MDLM. The opener's dice appeared but the bid controls were absent; rolls from clients were never recorded; the game would hang on the shake screen forever.
- **Root cause:** Every ACTION handler in `dybHandleEnvelope` used `env.originIdx` to identify the submitting player. Firebase envelopes carry `env.originId` (a string UID, set by `engine-multiplayer.js` line 642). `env.originIdx` does not exist and evaluates to `undefined`. As a result: `dybShakeReadyCheck[undefined] = true` — the array slot was never filled, `.every(Boolean)` on `[false, false, ...]` never fired, and `dybBroadcastShakeActive()` was never called. Any allegation or call-bluff from a client was also silently dropped (`undefined !== dybCurrentBidderIdx` always true → early return).
- **Fix:** Added `const originIdx = mpPlayerSlots.findIndex(p => p.uid === env.originId);` at the top of the ACTION block. All three handlers now use `originIdx`. Pattern from `nt.js` lines 2195/2207/2220/2242.
- **Lesson:** Firebase envelopes never carry a player index — the engine only supplies `originId` (UID). Always resolve player index from `mpPlayerSlots.findIndex(p => p.uid === env.originId)`. Never assume `env.originIdx` exists.

**BUG-10: First bid quantity initialised to 0 (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** When no previous bid existed (`dybCurrentQty = 0`, `dybCurrentFace = 0`), the bid picker displayed quantity 0.
- **Root cause:** `minQty = dybCurrentQty + (selectedFace === dybCurrentFace ? 1 : 0)`. With no prior bid: `minQty = 0 + (2 === 0 ? 1 : 0) = 0`. `selectedQty = max(0, 0) = 0`.
- **Fix:** `const minQty = Math.max(1, dybCurrentQty + (...))` — floors the minimum at 1.

**BUG-11: Veil toggle (👁️) not appropriate for MDLM (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** Shake and table screens had a veil eye-icon toggle (btn-dyb-hand-veil / btn-dyb-table-veil) to hide the player's own dice. Not needed in MDLM (each player on their own device, no peeking risk) and was confusing UI clutter.
- **Fix:** Removed `dybHandVisible` state, `dybRenderHandVeil()`, both veil button listeners, both `btn-dyb-hand-veil`/`btn-dyb-table-veil` HTML buttons. `dybRenderHandDock()` now always passes `visible = true`.

**BUG-12: Table screen split h-screen body/footer layout (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** Table screen used `h-screen overflow-hidden` with separate body (scrollable bid controls) and footer (hand + action buttons). Created visual disconnection — too much white space between sections, buttons not aligned with content.
- **Root cause:** Split body/footer pattern instead of single-wrapper centered layout. Violates CLAUDE.md rule: "the entire stack must be siblings inside the single inner wrapper."
- **Fix:** Changed section to `flex items-center justify-center w-full min-h-screen px-5 py-6 overflow-y-auto` with a single inner `div.flex.flex-col.max-w-sm.gap-4` containing all content as siblings. Removed the `border-t` footer separator. Action buttons upgraded to `min-h-14`.

**BUG-13: Raise gate is face-primary — a legal quantity-increase with a lower face is blocked (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** With a standing allegation of 9 × [6], setting 11 × [2] (or even 10 × [2]) left the "Raise the Stakes" button greyed out, despite 11 > 9 being a legal raise (quantity increases, face is free).
- **Root cause:** `dybUpdateBidButtonState()` checked `(face > dybCurrentFace || (face === dybCurrentFace && qty > dybCurrentQty))` — it asked "is the face higher?" first. The Liar's Dice rule is quantity-primary: legal if `qty > currentQty` (any face) OR `qty === currentQty && face > currentFace`. The three picker-floor sites (`dybRenderBidPicker`/`dybAdjustFacePicker`/`dybAdjustQtyPicker`) carried the inverse error — their `face === dybCurrentFace ? +1 : +0` floor let quantity sit at `currentQty` for a *lower* face (the illegal same-quantity-lower-face bid), masked only because the button rejected everything.
- **Fix:** Added one canonical `dybIsLegalRaise(face, qty)` (button gate) plus `dybMinQtyForFace(face)` (picker floors: higher face may keep quantity, same/lower face must raise it). Both replace the four duplicated inline predicates. The `dybMinQtyForFace` opener case still floors at 1 (preserves BUG-10). Host path doesn't re-validate, so the button + picker gate is the only guard.
- **Found during:** Post-Phase-34 backlog testing (user report).
- **Lesson:** When the same raise/escalation rule drives both a picker floor and a submit-button gate, derive both from one predicate. Four independent copies of "what's a legal raise" drifted into two *opposite* errors that masked each other.

**BUG-14: Action buttons (`Call the Bluff`, `Climb Higher`) not locked for non-active players (RESOLVED — June 2026 playtest)**
- **What happened:** Non-active players could tap `btn-dyb-call-bluff` and `btn-dyb-raise` and trigger a bid/challenge even when it wasn't their turn.
- **Root cause:** Both buttons sit outside `#dyb-bid-controls` in a separate `<div class="flex gap-3">`. Hiding `#dyb-bid-controls` for non-active players (which was the prior guard) had no effect on these two buttons.
- **Fix:** In `dybRenderTableScreen()`, when `!isMyTurn`, explicitly set `disabled = true` and add `opacity-40` to both `callBtn` and `raiseBtn`. Re-enable and remove `opacity-40` in the `isMyTurn` branch.

**BUG-15: "Last bidder" label showed the wrong player name (RESOLVED — June 2026 playtest)**
- **What happened:** The "X alleged N × [F]." label on the table screen showed the name of the *next* bidder instead of the player who made the last bid.
- **Root cause:** `dybCurrentBidderIdx` has already advanced to the next player by the time `dybRenderTableScreen` runs. The label was reading `dybPlayerNames[dybCurrentBidderIdx]`.
- **Fix:** Read last bidder from `dybAllegationHistory[dybAllegationHistory.length - 1].playerIdx`. This same root cause was documented in BUG-03 for the showdown; it also appeared in the turn label context here.

**BUG-16: `Climb Higher` and `Call the Bluff` lacked `opacity-40` visual state (RESOLVED — June 2026 playtest)**
- **What happened:** `dybUpdateBidButtonState()` set `raiseBtn.disabled = true` and `callBtn.disabled = true` when the raise was illegal / no bid existed, but no opacity change accompanied it. The buttons appeared enabled even when inactive.
- **Fix:** Added `raiseBtn.classList.toggle('opacity-40', raiseBtn.disabled)` and `callBtn.classList.toggle('opacity-40', noBid)` in `dybUpdateBidButtonState()`.

**BUG-17: Showdown and gameover screens had 🔊/✕ inline with the CTA, not in a header row (RESOLVED — June 2026 playtest)**
- **What happened:** Both screens used a `flex items-center gap-2` row containing `[🔊] [CTA flex-1] [✕]`, which squeezed the CTA and violated the global UI Protocol (chrome buttons must be in a header row, CTAs must be full-width).
- **Fix:** Applied via Node.js script: split into a proper header row (`flex items-center justify-between`: eyebrow label on left, `[🔊][✕]` on right) + separate full-width `<button>` below the content. For gameover, the eyebrow space is an empty placeholder div since there's no sub-label needed.

**BUG-18: Seating screen had no 🔊 or ✕ chrome (RESOLVED — June 2026 playtest)**
- **What happened:** `screen-dyb-seating` was missing both the sound button and the exit button entirely.
- **Fix:** Added a header row (`flex items-center justify-between`: placeholder left, `[btn-open-sound 🔊][btn-dyb-quit-open ✕]` right) as the first child of the inner wrapper div. Applied via Node.js script.

**BUG-19: Spirit Board (The Depths) had no ✕ exit button (RESOLVED — June 2026 playtest audit)**
- **What happened:** Eliminated players on `screen-dyb-spirit-board` had no way to quit mid-game. The header only contained the 🔊 sound button — no ✕.
- **Root cause:** The Spirit Board screen was built as a pure spectator view and the exit button was never added.
- **Fix:** Added `<button class="btn-dyb-quit-open ...">✕</button>` alongside the 🔊 button, wrapped in a `<div class="flex items-center gap-2">` group. Uses the existing `.btn-dyb-quit-open` class, already wired by the global `querySelectorAll('.btn-dyb-quit-open')` listener. Applied via Node.js script (`scripts/dyb-spirit-board-quit.js`). The quit overlay and confirm path are unchanged.
- **Lesson:** The "every screen must have 🔊 and ✕" rule (Protocol A §4) applies to passive spectator screens too — eliminated players should always be able to exit cleanly.

**Showdown dice highlight — tick-by-tick tally animation (June 2026 playtest audit)**
- **Design:** During the count-up animation in `dybRenderShowdownScreen`, all dice start dimmed (CSS `.dyb-die-dim`, opacity 0.2). On each 400ms tick, the next counting die un-dims — making the tally visual and theatrical. At the verdict, all remaining dimmed dice un-dim so the full table is visible.
- **Implementation:** `dybGetCountingDice(face)` builds an ordered `[{pIdx, dieIdx}]` list using the same logic as `dybComputeRealCount` (respects wildcards, Loaded adds two entries for its +2 contribution, Cracked/Snake excluded). `dybRenderAllHandsOnShowdown()` injects `data-p`/`data-d` attributes and `dyb-die-dim` class into each die via string replace on the generated HTML. The `step()` loop queries `[data-p="${p}"][data-d="${d}"]` to remove the dim class one per tick. CSS: `.dyb-die.dyb-die-dim { opacity: 0.2; transition: opacity 0.25s ease; }`.
- **Edge case:** `real <= 0` — `reveal()` is called after 600ms with no ticks; all dice un-dim immediately at the verdict.

**Shake screen redesign — two-button → single "Ready!" with tappable cup area (June 2026 playtest)**
The original Shake screen had two sequential buttons ("Shake 'Em Up" → hidden → "Ready ✓"). Replaced with:
- A tappable `#dyb-shake-cup-area` div in the body showing face-down dice (`bg-slate-800` tiles) before rolling and real dice after rolling, with a "Tap to shake 'em up" / "Your hand." label.
- A single `#btn-dyb-ready` CTA always visible at the bottom.
- **Path A (tactile):** tap cup → `playWhoosh()` + `dybCupShake` CSS animation (0.55s) → dice reveal → Ready! submits.
- **Path B (speedrun):** tap Ready! immediately → `dybDoRoll()` fires silently → submits in one step.
- Both paths write `dybMyRoll` exactly once (idempotency guards in `dybHandleCupTap` and `dybDoRoll`).
- `dybAssignSlickFace` updated to be context-aware: refreshes `dyb-hand-dock-shake` when the shake screen is active, `dyb-hand-dock-table` otherwise (fixes pre-existing wrong-dock-refresh issue).
- `.dyb-cta` fixed to include `display:flex; align-items:center; justify-content:center` — root cause of the recurring centering issue on DYB and other custom-colour games (see Template Gaps).

---

## How-to gallery tab (2026-08-10, SW v167)

**What happened:** `dyb-how-to-overlay` gained a second tab, `The Rules | The Dice` — faces
`1`–`6` plus the cup back, rendered through `dybDieHTML`/`dybDieBackHTML`. New
`dybOpenHowTo(tab)` / `dybSetHowToTab(tab)` / `dybRenderDiceGallery()`; all three existing
how-to openers (menu, table header, shake header) were collapsed onto `dybOpenHowTo()` so the pill
state can never disagree with which body is showing.

**DYB is the one gallery with no art behind it yet** — it still renders the default pip grid, so no
tile is zoomable. That is the correct state, not a gap: `artMakeZoomable` only wires a tile whose
art resolved. The tab exists now so that the day DYB gets a skin or core art, the reference and the
offline install check are already in place.

**The five Tempest types are deliberately excluded.** They are skinnable (`assets.specials`) and
documented in `docs/art-authoring-guide.md` § The Bluff, but a static reference tile would
misrepresent them: their identity is the engine's coloured frame **plus live per-die state** — an
unassigned Slick shows the auto-rolled face the player is about to choose, and a concealed Phantom
must never render its real value. They are previewed in play under Sylly Mode instead.

**Implementation note:** `dybDieHTML` returns an HTML **string**, not a node, so the gallery
unwraps it through a holder div before handing the element to `artMakeZoomable`. Every other
game's seam returns an element.

---

## Template Gaps

**Sound button listeners — engine.js global covers all games (June 2026)**
Investigated a report that the DYB menu sound button wasn't working. Found that `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements globally at script execution time (top-level `querySelectorAll`). Since all HTML is parsed before any script runs, every game's sound buttons are covered automatically — no per-game listener is needed. DYB and several newer games (NAT, DSD, GTH, BLD, PASS) have explicit plugin-level listeners too, which are harmless duplicates. Phase-audit Protocol C cross-game check updated to document this. Lesson: when investigating a sound button report, first confirm whether an old SW cache might be serving stale JS before assuming a wiring gap.

**Custom CSS CTA class centering — flex properties must be declared in the class (June 2026 playtest)**
DYB uses `.dyb-cta` (custom ocean blue `#1E4D8C`) instead of a Tailwind utility class for its primary CTAs. The class only declared `background-color` and hover. When JS sets `style.display = 'flex'` (the `display` Tailwind utility does this), the button becomes a flex container without `align-items: center` or `justify-content: center`, causing text to top-left-align. Fix: add `display: flex; align-items: center; justify-content: center;` directly to the custom class. **This applies to every custom-colour game:** GTH sage (`.gth-...` inline styles), FRT banana (`.frt-...` style attributes), and any future game that uses a non-Tailwind colour for its CTA. For Tailwind-based games this is not an issue because Tailwind's `flex items-center justify-center` utilities are applied in HTML directly. Template gap: `logic-engine.md` new-game checklist should warn that custom CSS brand classes used on `<button>` elements must always include flex centering properties — not just colour.

---

## Bug Index (continued — June 2026 playtest audit, round 2)

**BUG-20: `hand-dock-spread` — shake screen dice wrap to a second row with 5 dice (RESOLVED)**
- **What happened:** With 5 dice, `#dyb-hand-dock-shake` (and `#dyb-hand-dock-table`) overflowed its parent container and wrapped. Shortcut phrase: **`hand-dock-spread`** (maps to `dyb-hand-dock-*` element + spread/gap symptom).
- **Root cause:** Cup area used `px-8` (32px each side). Inner width ≈ 280px. 5 dice × 52px + 4 gaps × 12px (`gap-3`) = 308px > 280px → wraps. On the table screen the hand dock also lacked `justify-center`.
- **Fix:** Cup area `px-8` → `px-5` (20px padding → inner 304px). Hand dock `gap-3` → `gap-2` (4 × 8px = 32px gap total → 5×52+32 = 292px ≤ 304px). Added `justify-center` to `#dyb-hand-dock-table`. Applied via `scripts/dyb-ascent-polish.js`.
- **Root cause of detection failure:** The `includes()` needle used a straight apostrophe `'` but the HTML file stored a right single quotation mark U+2019 (`'`) in "Tap to shake 'em up". Fix: split replacement into three smaller targeted replacements — `px-8 py-6` attribute only (no apostrophe in string), `gap-3` → `gap-2` attribute only, cup-label wrapping separately using `’` escape in the needle.

**BUG-21: `[?]` placement violations on shake and table screens (RESOLVED)**
- **What happened:** (1) Shake screen (`screen-dyb-shake`) header had no `[?]` button at all — rules violation per `ui-style.md` (every gameplay screen header must have `[?]` in the right group alongside 🔊 and ✕). (2) Table screen had `[?]` on the top-left as a lone button, but `ui-style.md` mandates it be in the right group alongside 🔊 and ✕.
- **Fix:** Shake screen: added `#btn-dyb-shake-how-to` to the right group, wired to open `dyb-how-to-overlay`. Table screen: moved `#btn-dyb-how-to` into the right group (alongside 🔊 and ✕); replaced left slot with `<div></div>` placeholder. Applied via `scripts/dyb-ascent-polish.js`.

---

## Design Decisions (continued — June 2026 playtest audit, round 2)

**"The Ascent" — bid history redesign**
The original allegation history rendered a vertical list of `N × [die graphic]` entries (last 3 bids). This was visually noisy and took up prime vertical real-estate in the table screen's compact single-column layout.
- **New design:** A compact single-line preview row (`#dyb-ascent-section`) showing the last 2–3 bids inline: `Syl: 2×[6] → Sam: 3×[6]`, with a 📋 button that opens `#dyb-ascent-overlay` — a bottom sheet (max 60vh, scrollable) with the full bid history as numbered rows.
- **Plain text format:** bids shown as `N×[F]` (plain text, not pip dice graphics) — faster to read at a glance and unambiguous.
- **Section hidden until first bid:** `dyb-ascent-section` starts `display:none`; `dybRenderAscentPreview()` shows it only once `dybAllegationHistory` has at least one entry.
- **Rationale:** The log is reference information — not the primary focus. Compressing it to one line with an expand affordance keeps the claim card and bid stepper front and centre.

**Tempest die contextual help — [?] guide + tap-hold per-die info**
Players seeing special Tempest dice for the first time (or after forgetting) had no in-context help.
- **General guide:** After rolling in Sylly Mode, `#btn-dyb-tempest-guide` appears next to the "Your hand." label. Opens `dybShowTempestGuide()` — a single tip overlay listing all 5 die types. Hidden before rolling (starts `display:none` in HTML; shown in `dybDoRoll()`).
- **Per-die tap-hold:** In `dybRenderHandDock()`, every special die (non-standard type) gets a 500ms long-press handler (`touchstart`/`mousedown` + cancel on `touchend`/`touchmove`/`mouseup`/`mouseleave`). On fire: `_didLP = true` + `dybShowDieInfo(type)`. The Slick die click handler checks `_didLP` and skips the slick picker if a long press fired, preventing the die-info and picker from both opening.
- **Overlay:** Reuses the new `#dyb-tip-overlay` (Decision Modal, z-[90], border `border border-[#9db8d9]`) driven by `dybShowTip(emoji, heading, lines[])`. Lines support inline HTML (for `<strong>` emphasis). Consistent with `shp-tip-overlay`/`frt-tip-overlay` pattern.
- **SW:** bumped v118 → v119.

**Snake die visual redesign — sinister dark toxic green (June 2026 polish pass)**
The original Snake die used red, visually clashing with the pressure mine and injury states.
- **New design:** Dark toxic green `#064E3B` border + subtle `rgba(6,78,59,0.07)` background tint + `box-shadow: 0 0 8px rgba(6,78,59,0.4)` toxic glow. Pips are diamond-shaped: 7×7px squares rotated 45°, dark green fill (`#064E3B`), no `border-radius`.
- **CSS approach:** Two compound classes — `.dyb-die.dyb-die-snake` (specificity 0,2,0) overrides Tailwind's border/bg (specificity 0,1,0) so `borderCls`/`bgCls` in `dybDieHTML` don't need clearing. `.dyb-pip.dyb-pip-snake` similarly overrides `.dyb-pip` defaults. Added after `.dyb-die.dyb-die-dim` in `css/styles.css`.
- **Pip sizing rationale:** 7×7px at 45° = diagonal ~9.9px. Grid cells are (52px − 14px padding) ÷ 3 ≈ 12.67px, so the diamond fits comfortably.

**Slick die clarity + unassigned-0 rule (June 2026 polish pass)**
`dybShowDieInfo('slick')` description updated to state: (1) you can only assign a face during your own turn; (2) if The Overlook fires before you assign, the Slick die counts as 0. The second rule was already implemented (`assigned === -1` never matches any face 1–6 in `dybComputeRealCount` so the die contributes 0) but was undocumented to players.

**Venom Wilds (Option B) — description-only update (June 2026 polish pass)**
A Snake rolling 1 with Classic or Volatile Wildcards active targets the bid face with −1 (counts as −1 toward whatever face is bid). This was already implemented in `dybComputeRealCount` via `matchesFace = val === face || (wildOnes && val === 1 && face !== 1)` — a matching Snake applies `total -= 1`. Only the die-info description and Tempest guide entry were updated to document this as "Venom Wilds".

**BUG-22: Per-die `_lpTimer`/`_didLP` shared-variable bug in `dybRenderHandDock` (RESOLVED)**
- **What happened:** `_lpTimer` and `_didLP` were declared once outside the `forEach((_,i) => …)` loop, shared across all dice. After a long-press on any die, `_didLP` remained `true`. On mobile, the synthetic `click` event fires after `touchend` — the Slick die's click handler checked `_didLP` and found it `true` even for unrelated subsequent taps, permanently suppressing the slick picker.
- **Root cause:** Variable declaration scope — one `let _lpTimer; let _didLP` for all N dice.
- **Fix:** Moved both declarations inside the `forEach` body so each die instance gets its own isolated timer and flag.
- **Lesson:** Any per-element event handler that uses shared mutable state inside a `forEach` is a latent race condition. Always scope per-element state inside the iterator.

**BUG-23: Tempest guide `[?]` button hidden before rolling (RESOLVED)**
- **What happened:** `#btn-dyb-tempest-guide` was only shown inside `dybDoRoll()` — players on the shake screen before tapping could not access the special die guide.
- **Fix:** Added `document.getElementById('btn-dyb-tempest-guide').style.display = dybSyllyMode ? '' : 'none';` to `dybRenderShakeScreen()` (shown immediately when the shake screen is displayed in Sylly Mode).

**Summit screen expansion — Clashes W/L + Lucky Face + Post-Climb Chronicle (June 2026 polish pass)**
The original gameover screen only showed a ranked standings list. Expanded to:
- **Clashes column:** W/L per player, tracked in `dybClashWins[]`/`dybClashLosses[]` by `dybResolveShowdown()` (host only).
- **Lucky Face column:** most-frequently rolled raw face per player, shown as a mini die graphic via `dybDieHTML(bestFace, 'standard', -1, true)`. Tracked in `dybFaceFreq[playerIdx][1..6]` by `dybRecordRoll()` (host only; phantom dice excluded since their face is hidden).
- **Post-Climb Chronicle:** paginated per-shake log. Each entry: bid sequence (`Name: qty×[face] → …`) + conclusion sentence. Stored in `dybShakeLogs[]` by `dybResolveShowdown()`; passed in `DYB_GAMEOVER` payload; rendered by `dybRenderChronicle()` with `btn-dyb-chronicle-prev`/`next` navigation.
- **All stats sent in `DYB_GAMEOVER`** payload fields `clashWins`, `clashLosses`, `faceFreq`, `shakeLogs` — host-authoritative, received by all devices.
- **SW:** bumped v119 → v120.

**BUG-24: Opener's "Call the Bluff" button not faded despite being disabled (RESOLVED)**
- **What happened:** On the opener's turn (no bid yet, `dybCurrentFace === 0`), `callBtn.disabled = true` but `opacity-40` was absent — the button appeared live.
- **Root cause:** `dybRenderTableScreen()` called `dybUpdateBidButtonState()` (via `dybRenderBidPicker`) which correctly applied `opacity-40`. Then in the active-player else branch, two unconditional `classList.remove('opacity-40')` calls immediately overrode the correct state.
- **Fix:** Removed both `classList.remove` lines from the else branch. Comment added explaining that `dybUpdateBidButtonState` already owns that state.

**BUG-25: Long-press and Slick tap handlers attached to wrong DOM elements due to ID collision (RESOLVED)**
- **What happened:** Both `dyb-hand-dock-shake` and `dyb-hand-dock-table` render dice with IDs `dyb-die-0`, `dyb-die-1`, etc. Both hand docks exist in the DOM simultaneously (the shake screen remains when the table screen is shown). `document.getElementById('dyb-die-0')` always returns the first match — the shake screen's hidden dice. Long-press and Slick picker listeners were wired to invisible elements and never fired.
- **Root cause:** Duplicate element IDs across two hand docks. `getElementById` is document-scoped and non-deterministic when IDs collide.
- **Fix:** Changed `document.getElementById('dyb-die-${i}')` to `container.querySelectorAll('.dyb-die')[i]` in `dybRenderHandDock()`. The lookup is now scoped to the specific container that was just populated, so both docks always wire their own elements.
- **Lesson:** Any function that renders multiple DOM instances of elements with shared IDs must use container-scoped queries (`el.querySelectorAll`) rather than document-global `getElementById`. Elevate to audit checklist: whenever `dybRenderHandDock` (or any multi-dock render) is called, verify the listener-attachment query is scoped.

**BUG-26: DYB quit and new-game overlay button text too small (RESOLVED)**
- **What happened:** Both buttons in `dyb-quit-overlay` and `dyb-new-game-overlay` used `min-h-11 text-sm` — significantly smaller than the `min-h-14 text-lg` standard used in FRT, SHP, and other recent games.
- **Root cause:** Template gap — the original DYB overlay buttons were written before the current button-sizing standard was established.
- **Fix:** Updated both overlays' buttons to `min-h-14 text-lg`. Note: the tip overlay close button (`#btn-dyb-tip-close`) intentionally stays at `min-h-11 text-sm` — tip overlays use the compact "Got it" style across all games.
- **Audit item:** Recurring across games. Any DYB polish pass should cross-check quit/play-again modal button height against `min-h-14 text-lg` standard.

**Slick die one-time face lock (June 2026 polish pass — updated pass 3)**
`dybOpenSlickPicker` guards against reassignment: if `dybSlickFaces[dieIdx] > 0` (already committed), the picker is silently ignored. Face assignment is now permitted on **both** the shake screen and the table screen:
- **Shake screen:** always open (no turn restriction). All players roll simultaneously, so a player who won't get a bid turn this Shake should still be able to declare their Slick face and contribute to the count.
- **Table screen:** restricted to the active bidder's turn in MDLM (unchanged from pass 2).
The lock fires once per Shake. The guard `shakeScreen.style.display !== 'none'` distinguishes the two contexts.

**Special dice visual polish — Loaded / Phantom / Cracked / Slick (June 2026 polish pass)**
All four remaining Tempest die types upgraded to be visually distinctive:
- **Loaded:** Amber glow breathing pulse via `@keyframes dybLoadedGlow` (CSS compound class `.dyb-die.dyb-die-loaded`). Background `rgba(251,191,36,0.08)`, amber border, amber pips `bg-amber-700`. Glow oscillates 6→14px over 2.4s.
- **Phantom:** Purple tint background `rgba(139,92,246,0.08)` + lavender border `#C4B5FD` via `.dyb-die.dyb-die-phantom`. Live-hand `?` glyph rendered with `.dyb-phantom-glyph` class — indigo `#4338CA` with `text-shadow` neon glow. Showdown reveal: real pip grid with `bg-indigo-400` pips.
- **Cracked:** Removed `opacity-40`. Now `bg-stone-100` + `border-stone-200` (light and visually dead). Pips stripped; shows `✕` in muted stone text — unambiguous zero-value signal.
- **Slick:** Border upgraded `border-blue-300` → `border-cyan-400`. Unassigned: `~` tilde with `.dyb-tilde-breathe` CSS animation (opacity 0.55↔1 over 1.8s). Assigned: standard cyan pips `bg-cyan-600` + retained cyan border. The `cursor-pointer` class removed from the `extraCls` (border and bg now drive via Tailwind directly in the switch).
- **Implementation:** All four use Tailwind utility classes where available; CSS compound classes (same pattern as `.dyb-die-snake`) for rgba backgrounds, box-shadows, and animations that local Tailwind cannot express.
- **SW:** bumped v120 → v121.

**Polish pass 4 — Phantom compound types, Slick redesign, Slick sync fix, Summit grid (June 2026)**

**Phantom compound types (Phantom dual-type mechanic):**
Each Phantom die has a `specialRate`-probability chance of harbouring a secondary type (`loaded`, `slick`, `cracked`, or `snake`). Stored in `dybPhantomTypes[]` (per-device) and `dybAllPhantomTypes[][]` (host-only), populated by `dybGenerateRoll`, broadcast in `DYB_ROLL_SUBMIT`, and received on all devices via `DYB_SHOWDOWN` → `dybApplyShowdown`.
- **During gameplay:** ALL phantom dice (including compound) show only `?` to their owner and to spectators on the Spirit Board (dieIdx !== -1 sentinel handles both live-hand and spectator modes).
- **At the Overlook (showdown reveal):** compound phantoms unmask as their secondary type WITH an additive indigo phantom-ring glow (`dyb-die-phantom-ring`: `box-shadow: 0 0 0 2px #818cf8, 0 0 12px rgba(99,102,241,0.6)`). Phantom+Loaded = amber glow die + ring. Phantom+Snake = dark green die + ring. Phantom+Cracked = ✕ die + ring. Phantom+Slick = cyan pip die + ring.
- **Counting:** `dybComputeRealCount` and `dybGetCountingDice` both read `dybAllPhantomTypes[pIdx][j]` and apply the secondary type's counting rule (loaded=+2, snake=−1, cracked=0, slick=locked face only).
- **Phantom+Slick:** At generation time, `dybSlickFaces[i] = roll[i]` and `dybSlickAssigned[i] = true` — face is locked immediately. Picker cannot be opened for this die. At the Overlook, revealed as cyan die + phantom ring at the auto-assigned face value.
- **Spectator mode fix (incidental):** Previously, `dybRenderSpiritBoard` called `dybDieHTML` with no `dieIdx` argument (defaulting to `dieIdx = -1` = reveal mode). This was a latent couch-security gap — phantom dice would show their real face on the Spirit Board before the Overlook. Fixed by passing `dieIdx = -2` (new spectator sentinel) so phantom continues to show `?` on the Spirit Board.

**Slick redesign — X* pre-assignment visual:**
Previously, a Slick die always initialised with `dybSlickFaces[i] = -1` (unassigned), showing `~` until the player committed a face via the picker. New behaviour: Slick dice auto-assign their rolled face at generation time (`dybSlickFaces[i] = roll[i]`). Visual changes:
- **Unassigned (not yet committed):** Shows `X*` (the rolled number + asterisk) in cyan text — communicates the pending auto-face clearly. The picker can still be used to change it.
- **Committed:** Shows cyan pip grid at the assigned face (same as before). Once committed, picker is blocked.
- **Guard change:** `dybOpenSlickPicker` previously used `if (dybSlickFaces[dieIdx] > 0) return` — with auto-assignment this would ALWAYS block the picker (face is > 0 from roll time). Changed to `if (dybSlickAssigned[dieIdx]) return`.
- **`dybSlickAssigned[]`:** New boolean array tracking whether the player has exercised their one-time face change. Set `true` at committed by picker OR at generation time for Phantom+Slick.

**BUG-27: Slick sync bug — `~` shown at Overlook after face assigned during table phase (RESOLVED)**
- **What happened:** During the TABLE phase (after `DYB_ROLL_SUBMIT` was already sent), a player assigned their Slick face via the picker. The local `dybSlickFaces[i]` was updated, but `dybAllSlickFaces[mpMyPlayerIdx]` on the host was never updated — it still held the initial value from `DYB_ROLL_SUBMIT`. At the Overlook, the host used the stale value, so the Slick die rendered as `~` (unassigned) rather than the committed face.
- **Root cause:** `dybAssignSlickFace` only mutated local `dybSlickFaces[dieIdx]` — no sync to host.
- **Fix:** Added `DYB_SLICK_UPDATE` ACTION packet (fire-and-forget, no lock). `dybAssignSlickFace` now: (1) sets `dybSlickAssigned[dieIdx] = true`; (2) if host → directly mutates `dybAllSlickFaces[mpMyPlayerIdx][dieIdx]`; (3) if client → sends `DYB_SLICK_UPDATE { dieIdx, face }` ACTION. Host handler in `dybHandleEnvelope` writes `dybAllSlickFaces[originIdx][payload.dieIdx] = payload.face`. No lock needed — fire-and-forget, last-write-wins, resolves before showdown.
- **Why no lock:** The Slick picker is a local one-time commit, not a phase-advance. Adding a sync lock here would block the entire table UI for an unnecessarily long round-trip.

**Summit standings grid layout fix (Point 0):**
The previous flex layout used `flex-1` on the Climber column — giving it ALL remaining space regardless of name length, creating a large visual gap between the name and the Challenges column. Fixed by switching to CSS grid (`grid-template-columns: 28px 1fr 80px [40px]`) on both the header row and all data rows. The Challenges column now always appears at a fixed visual position. The `luckyFaceHtml` div simplified to `<div class="flex justify-center items-center">…</div>` — no fixed-width wrapper needed (grid column handles the fixed width).

- **SW:** bumped v122 → v123.

**Polish pass 3 — shake screen layout, Slick on shake, Summit redesign (June 2026)**
- **Shake screen:** Switched from `h-screen overflow-hidden` sticky-footer to `min-h-screen overflow-y-auto flex items-center justify-center` centred layout. All elements (header, dice count row, cup area, Ready button) are now siblings inside a `gap-4` column — no empty floating space between header and dice. Matches the table screen pattern.
- **Slick on shake screen:** See updated Slick die one-time face lock note above.
- **Summit standings redesign:** Single header row replaces per-card mini-labels. Columns: RANK (w-6) | CLIMBER (flex-1 truncate) | CHALLENGES (w-[72px] shrink-0) | FAVOURED (w-10 shrink-0). Column widths match between header and data rows via identical Tailwind classes. `hasFaceData` guard controls whether the FAVOURED column appears at all (so non-Sylly sessions don't show an empty column). Renamed: "Clashes" → "Challenges", "Face" → "Favoured".
- **SW:** bumped v121 → v122.

---

## Design Decisions (continued — June 2026)

**Footholds Mode — lives separate from dice (Phase 35 backlog)**
New setting in The Bluff: `dybFootholdsMode` (toggle OFF/ON, default OFF) + `dybFootholdsCount` sub-option pills (3/5/10, default 5).
- **What changes:** When ON, losing a showdown costs 1 foothold (`dybLives[loserIdx]--`) instead of 1 die. Dice count stays constant all game — you always roll `dybStartingHand` dice per shake regardless of losses. Footholds reaching 0 triggers elimination, same as dice reaching 0 in the standard path.
- **What stays the same:** "Starting Dice" was not renamed — it still accurately describes how many dice you roll per shake (unchanged in foothold mode). The setting remains in the Ground Rules overlay with its original label.
- **Display changes:** Pip row uses `◆` symbol for footholds vs `■` for dice; shake screen count row says "X footholds" vs "X dice"; verdict text says "loses a foothold" vs "loses a die".
- **MDLM:** `dybLives` is carried in `DYB_GAME_START`, `DYB_NEXT_SHAKE`, and `DYB_SPIRIT_SHAKE` payloads; `dybFootholdsMode`/`dybFootholdsCount` included in `mpSerialiseSettings` and the `SETTINGS_SYNC` applier. All existing SYNC handlers branch on `dybFootholdsMode` to apply the correct elimination logic.
- **Non-impact on existing path:** All new logic is gated behind `if (dybFootholdsMode)` — the default OFF path is structurally unchanged. `dybLives` initialises to `[]` and is never read in standard mode.
- **SW:** bumped v125 → v126.

---

## Design Decisions (continued — August 2026, Tempest asset seam)

### The frame is the type, the image is the face

**What happened:** DYB's asset seam was gated to `type === 'standard'` because
`.dyb-die-asset` sets `border-color: transparent; padding: 0`, discarding every
channel the type `switch` had just computed. A skinned hand mixed real art with raw
CSS pips.

**Root cause:** the seam replaced the whole die rather than its face. Type identity
lived in four channels (border, tint, glow, pip colour) and three of them are things
an image covers.

**Lesson:** when a render seam has to preserve a signal, give the signal its own DOM
layer instead of asking the art to carry it. `.dyb-die-framed` keeps the frame on the
outer div and insets the art in a child — so the engine keeps every channel that
lives outside the image, and the pack owns everything inside it.

### A skin opt-out must be provenance-gated

`"frame": false` lets a pack suppress the engine chrome for a type. It applies **only**
to a die whose special art actually resolved. Without that gate, a pack that opts out
and then omits one face ships a die that is neither marked by the engine nor by the
art — the exact failure the frame exists to prevent.

### `blank` keys must not share the face fallback chain

**What happened:** the first draft of the resolver was one chain,
`assetSpecial(...) || assetFace(val)`. For a concealed phantom that is a
hidden-information leak: the real rolled value *is* passed to `dybDieHTML` as `val`
and only the `?` glyph hides it, so a pack with phantom face art but no `blank` would
have rendered the true face to its owner and to every spectator on the Depths screen.

**Root cause:** treating "no art for this key" as one situation when it is two —
"draw the plain face instead" and "draw nothing that reveals anything".

**Lesson:** a fallback chain crossing a privacy boundary needs its own branch, and a
test that names the leak. `tools/verify-dyb-dice.js` asserts the concealed value
appears nowhere in the markup, so a future tidy-up that merges the chains fails loudly.
