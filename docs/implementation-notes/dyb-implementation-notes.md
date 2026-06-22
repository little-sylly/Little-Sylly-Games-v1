# DYB Implementation Notes — The Bluff (internal `dyb`)

## Design Decisions

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

**BUG-06: Gameover standings invert the loser ranking (June 2026 audit — logged, not yet fixed)**
- **What happened:** Final standings rank the *first*-eliminated player as runner-up and the *last*-eliminated as wooden spoon — exactly backwards.
- **Root cause:** `dybShowGameover()` reverses `eliminationOrder` into `order` (line ~833), then spreads `...order.reverse()` (line ~837) which reverses the same array in place *again*, netting `[winnerIdx, ...eliminationOrder]`. The two reverses cancel.
- **Fix:** Use the already-reversed copy once: `const positions = [data.winnerIdx, ...order];` (drop the second `.reverse()`).
- **Found during:** Phase 3 per-game audit (code trace).
- **Lesson:** `Array.prototype.reverse()` mutates in place and returns the same array — a `[...arr].reverse()` followed by `arr.reverse()` is a double-reverse, not two independent copies.

**BUG-07: Phantom die never reveals its face, even at showdown (RESOLVED — post-Phase-34 backlog testing)**
- **What happened:** A Devil's Luck phantom die showed "?" everywhere, including the showdown reveal — so the real count couldn't be audited.
- **Root cause:** `dybDieHTML()`'s `phantom` case set `display = '?'` unconditionally.
- **Fix:** Redesigned `dybDieHTML` to CSS pip dice (`DYB_PIP_LAYOUTS`). The phantom case now uses `dieIdx >= 0` to distinguish owner's live hand (show "?" text label) from showdown render (`dieIdx = -1`, show real pip face). The `visible` param is removed from the distinction — always true now that the veil is gone.
- **Found during:** Post-Phase-34 backlog testing.

**BUG-08: Eliminated players pulled back to the Shake screen each round (June 2026 audit — logged, not yet fixed)**
- **What happened:** After elimination, a player is navigated to `screen-dyb-shake` at the start of every subsequent shake and sits there (with a live "Shake 'Em Up" button) until `DYB_SPIRIT_SHAKE` arrives.
- **Root cause:** BUG-02 added an eliminated guard to `DYB_SHAKE_ACTIVE`, but `DYB_NEXT_SHAKE` (from `dybAdvanceFromShowdown()`) calls `dybInitShake()` with no such guard. `DYB_SPIRIT_SHAKE` only fires after all survivors have rolled, so the wrong-screen window is the full roll-collection period.
- **Fix:** In the `DYB_NEXT_SHAKE` handler, route `!dybActivePlayers.includes(mpMyPlayerIdx)` devices to `dybShowSpiritBoard()` instead of `dybInitShake()`'s Shake screen.
- **Found during:** Phase 3 per-game audit (code trace).
- **Lesson:** The BUG-02 eliminated-guard pattern must cover *every* handler that can show the Shake screen (`DYB_NEXT_SHAKE` as well as `DYB_SHAKE_ACTIVE`), not just the one found in the first trace.

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

---

## Template Gaps

**Sound button listeners — engine.js global covers all games (June 2026)**
Investigated a report that the DYB menu sound button wasn't working. Found that `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements globally at script execution time (top-level `querySelectorAll`). Since all HTML is parsed before any script runs, every game's sound buttons are covered automatically — no per-game listener is needed. DYB and several newer games (NAT, DSD, GTH, BLD, PASS) have explicit plugin-level listeners too, which are harmless duplicates. Phase-audit Protocol C cross-game check updated to document this. Lesson: when investigating a sound button report, first confirm whether an old SW cache might be serving stale JS before assuming a wiring gap.
