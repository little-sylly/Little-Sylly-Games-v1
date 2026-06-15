# BLD (Bailed) — Implementation Notes

## Design Decisions

**MDLM skips setup screen**
The tech spec included a setup screen for entering player names. In MDLM, the lobby already collects names before the game starts — the setup screen is redundant. Fix: `onPassThePhone` in `engine-multiplayer.js` skips setup for BLD in MDLM; host populates `bldPlayerNames` directly from `mpPlayerSlots` and calls `bldStartGame()`. PTP still uses the setup screen.

**Couch security over per-player private writes**
The spec assumed a function `mpWritePlayerPrivateData` would exist to send each player's role privately. That function was never built — it doesn't exist in `engine-multiplayer.js`. Switched to couch security: all role arrays (`flakeIndices`, `bigFlakeIdx`, `potStirrerIdx`) broadcast in `BLD_GAME_START`. Each device renders only its own slot. Same pattern as NAT — sufficient for a same-room game.

**Plan tiles are the primary action area, not persistent chrome**
Initial layout treated the plan tile strip and patience meter as a persistent header (pinned top, `flex-shrink-0`). The action content below was `flex-1 overflow-y-auto`. This left a dead zone on screens with minimal content (waiting, pending states). Redesign: `min-h-screen overflow-y-auto` centred body — tiles + patience + planner label all flow together in the middle of the screen. Action phases sit below them. When content is short, everything centres vertically. When it's tall, it scrolls.

**Automatic random seat numbers instead of manual roster assignment**
BLD was initially configured with `rosterConfig.type: 'individual'`, which shows the "Assign Spots" lobby screen where the host manually assigns each player to a numbered slot. The user wants seat numbers to be automatic and random — not manually assigned. Changed to `rosterConfig.type: 'none'`, which skips the Assign Spots UI entirely. Random seat numbers (1..N, shuffled) are generated in `bldAssignRoles()` as `bldSeatNumbers[]`, included in `BLD_GAME_START`, and shown on the role reveal screen and main screen header. The 'individual' roster type is preserved in the engine for future games needing manual seating.

**Main screen uses NAT pattern — header inside centred block**
Multiple attempts tried to fix centering with `my-auto` / `pt-6` tweaks within a sticky-header structure (`h-screen overflow-hidden` + `flex-shrink-0` header + `flex-1` body). None worked: `my-auto` always centres the body content in the ~720px below the fixed header, producing a white canyon; removing it pins content to the top. Root cause: the structural split between a pinned header and a scrollable body cannot be fixed by padding alone. Fix (Round 4b): converted to the NAT pattern — `min-h-screen overflow-y-auto flex items-center justify-center` on the section, with the header row, plan tiles, and phase divs all inside one `flex flex-col max-w-sm px-5 py-8 gap-5` content wrapper. The entire block centres as a unit when short; scrolls when tall. The header is no longer pinned — it flows at the top of the centred block. Template gap: BLD should have used the NAT pattern from day one. Any BLD-like game (content-first, no persistent sticky CTA) must use the NAT pattern, not `h-screen overflow-hidden`.

**Fellow Flakes tracked in main screen header**
Flake players only see their fellow flakes on the role reveal screen — once the game starts there's no reference. Fix: `bldUpdateRoleIndicator()` populates a persistent `#bld-header-fellow-flakes` `<p>` element (yellow, `text-xs`) in the main screen header whenever the current device is a Flake and `bldFlakeIndices.length > 1`. Hidden for Friends and Pot-Stirrer, and hidden in single-device mode.

---

## Bug Index

### Bug: No entry sound on BLD lobby button (Phase 31 Round 3 — fixed)
**Symptom:** Tapping "Bailed" on the main lobby made no sound.
**Root cause:** The `btn-bld` listener called `activeGameId` and `bldShowMenu()` but omitted `playLaunch()`. Same omission pattern as GTH and DSD — the navigation was correct but audio was missed.
**Fix:** Added `playLaunch()` as the first line of the `btn-bld` listener.
**Lesson:** Every lobby button must call `playLaunch()` before navigating. See GTH entry.

### Bug: Sound slider not themed on BLD menus (Phase 31 Round 3 — fixed)
**Symptom:** Opening the sound overlay from the BLD menu showed the stone (grey) gradient instead of yellow, even though `bld-range` CSS and the map entry in `updateSliderTheme` were both present.
**Root cause:** Same as GTH — `openSoundOverlay()` in `engine.js` never called `updateSliderTheme()`. BLD correctly set `activeGameId = 'bld'` in the lobby listener but the slider class was never updated.
**Fix:** Added `updateSliderTheme(activeGameId)` as the first line of `openSoundOverlay()` in `engine.js`. Universal fix — all games benefit.
**Lesson:** See GTH bug entry. The overlay open is the right sync point for slider theme, not individual game entry.

### Bug 1 — Crash: `mpWritePlayerPrivateData is not a function`
**Symptom:** Game crashes immediately after "Deal the Roles" in MDLM.
**Root cause:** `bldStartGameMdlm()` called `window.mpWritePlayerPrivateData()` — a function that was never implemented in `engine-multiplayer.js`.
**Fix:** Removed all calls. Switched to couch security broadcast pattern.
**Lesson:** Before calling any `engine-multiplayer.js` function from a plugin, grep to confirm it exists. The tech spec should list every engine-multiplayer function the game depends on, confirmed against the actual file.

### Bug 2 — Everyone = A Friend (first occurrence)
**Symptom:** After crash fix, all devices still showed "A Friend".
**Root cause:** The crash in Bug 1 was leaving `flakeIndices` unset in the game start broadcast — role arrays were never making it into the payload.
**Fix:** Role arrays explicitly included in `BLD_GAME_START` payload.
**Lesson:** When a crash prevents a function from completing, any state it was supposed to set may remain at default. Check what the crashed function was responsible for setting.

### Bug 3 — PTP mode broken (couldn't make plans)
**Symptom:** In single-device (PTP) mode, game was unresponsive after role reveals.
**Root cause:** `onPassThePhone` in `engine-multiplayer.js` had no branch for BLD in single mode — wasn't calling `bldShowSetup()`.
**Fix:** Added PTP branch to `onPassThePhone`.
**Lesson:** The `onPassThePhone` function needs a case for every game that uses it. The tech spec's multiplayer section should confirm the single-mode flow is explicitly wired, not just the MDLM flow.

### Bug 4 — Stuck at nominating (nomination not advancing to voting)
**Symptom:** After the Planner locked in the group, all devices stayed on the nominating screen.
**Root cause:** The client Planner sent `BLD_NOMINATION_CONFIRMED` as an ACTION to the Host, but the Host wasn't re-broadcasting it as a SYNC. Non-planner devices had no way to advance.
**Fix:** Host receives `BLD_NOMINATION_CONFIRMED` ACTION and re-broadcasts as SYNC. All devices advance to voting.
**Lesson:** Any client-initiated state change that must advance ALL devices needs a Host SYNC broadcast. The tech spec's per-phase intercept table should explicitly note which ACTIONs require a full re-broadcast SYNC.

### Bug 5, 6, 7 — Client votes, mission cards, and drama guesses ignored
**Symptom:** Game advanced but client submissions had no effect.
**Root cause:** `BLD_VOTE_SUBMIT`, `BLD_MISSION_SUBMIT`, and `BLD_DRAMA_GUESS` ACTION handlers were missing entirely from `bldHandleEnvelope`.
**Fix:** Added all three handlers.
**Lesson:** Every player action that can be submitted must have a corresponding ACTION handler on the host. The tech spec's ACTION packet table must enumerate ALL submittable actions. Review the full game flow and ask: "can a client submit something here?" for every phase.

### Bug 8 — Everyone = A Friend (second occurrence, different root cause)
**Symptom:** After all prior fixes, some devices still showed wrong roles. Host always showed slot 0's role; clients always showed "A Friend".
**Root cause:** `engine-multiplayer.js` declares `let mpMyPlayerIdx = -1`. A `let` at script top-level does NOT attach to `window`. Both references in `bld.js` used `window.mpMyPlayerIdx` — always `undefined`. Host had a `|| 0` fallback → always slot 0. Clients had no fallback → `undefined` → `bldFlakeIndices.includes(undefined)` = false → always "A Friend".
**Fix:** Removed `window.` prefix. `mpMyPlayerIdx` is accessible directly. NAT.js uses it correctly without `window.`.
**Lesson:** `let` at script top-level ≠ `window.let`. Only `var` attaches to `window`. Every plugin that reads `mpMyPlayerIdx` must access it without `window.`. NAT and DSD are the reference implementations.

### Bug 11 — `'individual'` roster type loses players via `reordered[-1]`
**Symptom:** Host device showed a different player's name on the role reveal screen; one player's name appeared on two devices (host + that player's device). One device showed "Got it — pass the phone" instead of "Got it ✓".
**Root cause:** `rosterConfig.type: 'individual'` shows the Assign Spots lobby screen. Any player left unassigned gets `mpRosterPendingTeamIdx[i] = -1`. In `mpConfirmRoster()`, `reordered[-1] = player` sets a non-standard property on the array — the player is lost from standard array iteration. `findIndex(hostUid)` returns -1; the fallback puts the host at index 0, which now belongs to another player.
**Fix:** Changed BLD's `rosterConfig.type` from `'individual'` to `'none'`. `mpPlayerSlots` stays in join order (host = 0, clients = 1..N). `findIndex(hostUid)` reliably returns 0.
**Lesson:** The 'individual' roster type requires ALL players (including host) to be manually assigned before starting. If any are skipped, the reordering produces corrupted state. Games that need random/automatic seating should use 'none' and handle seat labels internally.

### Bug 12 — Double-push corrupts `bldPlanHistory` on clients
**Symptom:** Plan detail overlay shows "2 attempts" for a plan that only had 1 nomination. Clients prematurely trigger flake win after 3 rejections (instead of 5) due to doubled rejection count.
**Root cause:** `BLD_VOTE_RESULT` handler pushed `record` to `bldPlanHistory`, then called `bldApplyVoteResult()` which also pushes `record`. Clients received two identical records per vote event.
**Fix:** Removed `bldPlanHistory.push(record)` from the handler. `bldApplyVoteResult()` is the sole push point.
**Lesson:** When a handler calls a function that manages its own state persistence (like `bldApplyVoteResult()`), do not duplicate that persistence in the handler.

### Bug 13 — Plan loop race condition + "stuck at tallying votes"
**Symptom:** Plan 1 appears to repeat after its mission completes. After multiple rejections, vote screen gets stuck at "Tallying votes..." indefinitely.
**Root cause:** Two-part. (A) `btn-bld-plan-result-next` had no MDLM guard — all devices independently called `bldAdvanceAfterPlanResult()`. (B) `currentPlanIdx` was not included in `BLD_NOMINATION_CONFIRMED` SYNC payload. If the planner's device advanced quickly and sent a nomination SYNC before other devices tapped the button, those devices received the SYNC and transitioned to voting. When they later tapped "Next Plan →", `bldAdvanceAfterPlanResult()` ran again, incrementing `bldCurrentPlanIdx` a second time and overriding the voting phase with a fresh `bldStartNominating()`. The desynced client's stray nomination ACTION to the HOST reset `bldVoteReady` mid-round — players who already voted were now in `vote-pending` with no way to re-vote. Stuck permanently.
**Fix:** (A) Guarded `btn-bld-plan-result-next` for clients (`syllyMultiplayerMode === 'client'` → return early). (B) Added `currentPlanIdx: bldCurrentPlanIdx` to `BLD_NOMINATION_CONFIRMED` SYNC payload (both host-direct and re-broadcast paths). Clients set `bldCurrentPlanIdx` from the payload — the SYNC drives their plan transition instead of the button.
**Lesson:** Any transition that advances shared game state (plan index) must be driven by a HOST SYNC, not independent button taps on each device. Button taps that advance state without a SYNC are a race condition waiting to happen.

### Bug 14 — Vote color: "Sounds Good" appeared red
**Symptom:** All nomination votes in the plan detail overlay appeared in red regardless of value.
**Root cause:** Plan detail overlay used `vote === "I'm In"` to determine green/red color. `"I'm In"` is a mission card value, not a nomination vote value. Nomination votes are `"Sounds Good"` (approve) and `"No Way"` (reject). The check always evaluated false → all red.
**Fix:** Changed to `vote === "Sounds Good"`.
**Lesson:** Nomination votes and mission cards use different string values. Never conflate them.

### Bug 10 — Vote pending broadcast blocks other voters
**Symptom:** As soon as one player voted (host or client), all devices switched to "Tallying votes…" and the vote buttons disappeared — remaining players couldn't submit.
**Root cause:** `bldRecordVote()` broadcast `BLD_VOTE_PENDING` as a SYNC to all devices after every single vote, causing every device to render the vote-pending phase (hiding `bld-phase-voting`).
**Fix:** Two-part. (A) Client path of `bldCollectVote()` now sets `bldGamePhase = 'vote-pending'` and calls `bldRenderPhase()` locally after sending the ACTION — each device self-manages its own pending state. (B) `bldRecordVote()` no longer broadcasts `BLD_VOTE_PENDING` at all; it only shows pending locally on the host. `BLD_VOTE_RESULT` is still broadcast when all votes are in.
**Lesson:** Per-player intermediate state ("I have voted, waiting for others") must be managed locally on each device. Broadcasting a pending state to everyone when only one player has submitted blocks all other players. Only broadcast resolved/final state.

### Bug 9 — Layout: action content pinned to top with dead zone below
**Symptom:** Plan tiles, patience meter, and planner label were all stuck at the top. Large empty space below in waiting states.
**Root cause:** `h-screen overflow-hidden` pattern with tiles as `flex-shrink-0`. Correct for sticky-footer screens (where a button must always be visible), but wrong for content-centred screens.
**Fix:** `min-h-screen overflow-y-auto` with `flex-1 flex flex-col items-center justify-center` body. Same pattern as NAT observation screen.
**Lesson:** `h-screen overflow-hidden` = sticky CTA screens (DSD crew, LTTP chat). `min-h-screen overflow-y-auto` + centred body = content-first screens (observation, waiting, reveal). Decide this at spec time per screen, not during testing.

### Bug 15 — `bldRenderPlanResult is not defined` crashes Firebase callback, cascades to "host disconnected"
**Symptom:** After all mission cards were submitted and the group approved, all devices saw the "host disconnected" overlay. Host console showed "Exception was thrown by user callback. ReferenceError: bldRenderPlanResult is not defined". A second vote cycle also fired immediately after the crash (Firebase re-delivered buffered events with a now-reset `bldVoteReady` array).
**Root cause:** `bldRenderPhase()` had `if (bldGamePhase === 'plan-result') bldRenderPlanResult();` — but `bldRenderPlanResult` was never defined. The `plan-result` DOM content is set directly in `bldShowPlanResult()` before `bldRenderPhase()` is called; no separate render function was needed. The crash fired inside the Firebase `onValue` callback. Firebase caught it and logged the warning, but the crash meant (a) `BLD_MISSION_RESULT` SYNC was never sent to clients, and (b) Firebase re-delivered the accumulated vote/mission events after state had been partially reset, producing a second spurious vote resolution.
**Fix:** Removed the `bldRenderPlanResult()` call from `bldRenderPhase()`. The phase div show/hide is sufficient; the content is already populated by `bldShowPlanResult()`.
**Lesson:** Any crash inside a Firebase `onValue` callback produces a cascade: the SYNC that would have advanced all devices is never sent; Firebase may re-deliver previous events; the second delivery runs against partially-reset state and can trigger additional spurious resolutions. Keep Firebase callbacks crash-free — treat every function called from `bldHandleEnvelope` as safety-critical. Also: when a `bldRenderPhase()` branch calls a function, confirm that function exists before shipping.

### Bug 16 — `applyExpansionOverrides()` clobbers LI5's global of the same name (Fable audit, June 2026)
**Symptom:** In Secret Mode, Like I'm Five no longer applies its forced expansion settings (timer / rounds / taboo count / penalty / skip / Sylly). Silent — no error, the game just plays with the user's last manual settings instead of the expansion's forced ones.
**Root cause:** `bld.js` line 1273 declares a global `function applyExpansionOverrides()` (a no-op) — the same generic name `li5.js` line 162 already uses for its real Secret Mode override reader. Because `bld.js` loads AFTER `li5.js`, BLD's hoisted top-level function declaration overwrites LI5's on `window`. LI5's `startGame()` (line 176) then calls BLD's no-op. This is exactly the collision the JEC naming note warns about ("`applyExpansionOverrides()` is already defined globally by dstw.js and would be overwritten if reused" — JEC avoided it with `jecApplyExpansionOverrides()`); BLD reused the generic name.
**Fix (RESOLVED, June 2026):** Renamed BLD's hook to `bldApplyExpansionOverrides()` and updated the single call site in `bldStartGame()`. BLD's version is a no-op anyway, so the rename has zero behavioural effect on BLD and restores LI5's. Verified: `grep "function applyExpansionOverrides" js/games/*.js` returns only `li5.js`.
**Lesson:** The expansion-override hook must always be plugin-prefixed (`[abbr]ApplyExpansionOverrides`). The bare `applyExpansionOverrides` name belongs to LI5 (legacy) only. Add a grep to the new-game checklist: a plugin must never declare a top-level function whose name is already global in another plugin.

---

## Multiplayer Lessons

1. **`let` vs `window` for engine-multiplayer globals** — `mpMyPlayerIdx`, `mpPlayerSlots`, `syllyMultiplayerMode`, etc. are `let`-declared. Access directly, never via `window.`. Reference: NAT.js, DSD.js.

2. **Confirm every engine-multiplayer function exists before speccing it** — `mpWritePlayerPrivateData` was assumed. It didn't exist. During Stage 2, grep `engine-multiplayer.js` for every function the plugin plans to call.

3. **Enumerate ALL ACTION handlers upfront** — go through every screen phase and ask "can a non-host device submit something here?" Every yes is a required ACTION handler. Missing handlers silently drop submissions.

4. **MDLM name population** — names are already in `mpPlayerSlots[i].name` when `onPassThePhone` fires. The game's own setup screen is redundant in MDLM. `onPassThePhone` should populate the name array from `mpPlayerSlots` and skip to game start.

5. **Couch security is sufficient for same-room games** — `mpWritePlayerPrivateData` was never implemented and likely won't be. For couch games, broadcast all roles and render only the device's own slot. Only implement targeted writes if glimpsing the host screen would genuinely break the game.

---

---

## Design Decisions (How-to Overlay Rewrite — Phase 29+)

**BLD how-to rewritten to canonical Step-card format**
The original BLD how-to overlay (`bld-how-to-overlay`) used narrative prose divs — no Step label cards, no brand-colour step labels, no `<span class="font-semibold text-stone-700">` key terms. It was also inconsistently structured (separate `flex-shrink-0` footer div for the close button, `bg-stone-800` close button instead of brand yellow). Rewritten entirely to match the canonical `ui-style.md` How-to Overlay Standard: 4 Step cards + Winning and Scoring + ✨ Sylly Mode (Drama Mode), all inside a single `overflow-y-auto` body div. Close button now `bg-yellow-500 hover:bg-yellow-600`. Tables (Group Sizes, Roles per Player Count) preserved inside the relevant step cards. Title updated from "The Group Rules 📋" to the canonical "How to Play 📋".

---

## Design Decisions (Polish Round — Help System, Plan Reorder, UI Consistency)

**Shared tip overlay (`bld-tip-overlay`) instead of per-tip overlays**
Rather than one overlay per contextual `[?]` button, a single `bld-tip-overlay` (Decision Modal, z-[90]) is reused by all five tip buttons (Planner, Patience, Nominating, Vote, Mission). Content is injected at call time via `bldShowTip(emoji, heading, lines[])`. Role-specific tips for Nominating use the same overlay with different lines depending on `bldFlakeIndices.includes(bldMyPlayerIdx)`. This avoids overlay proliferation for short contextual help. Template gap: future games with multiple contextual tips should use this pattern.

**Header `[?]` → How To Play (new project standard)**
The header `[?]` (previously `btn-bld-role-help`, toggled by `bldUpdateRoleIndicator()`) was repurposed as `btn-bld-how-to`, always visible, always opens `bld-how-to-overlay`. Role-specific help moved to the role reveal screen via `btn-bld-role-reveal-help`. `bldUpdateRoleIndicator()` no longer needs to show/hide the `[?]` button — it only manages the subtitle and fellow-flakes line.

**Plan names reordered for narrative flow**
Plans now follow a logical pre-party sequence: Booking Accommodation → Who's Driving → Food Pickup → Alcohol Run → The Big Party. Old order was thematically inconsistent (takeaway run before booking accommodation). `BLD_FAIL_PHRASES` fully rewritten to match each new plan's theme — accommodation excuses, driving excuses, food pickup excuses, alcohol run excuses, party excuses.

**Bail count text: "Someone bailed." → "[N] person/people bailed."**
The original "Someone bailed." text didn't communicate urgency when multiple people bail. Now shows exact count — "2 people bailed." The redundant bail count subtext line was removed (count is in the heading). The excuse phrase below is unchanged.

**Aftermath itinerary tiles are now tappable**
`bldShowAftermath()` renders plan tiles as `<button>` elements (previously `<div>`). Click listeners wired inline at render time via `querySelectorAll('.bld-aftermath-tile')`, calling `bldOpenPlanDetail(i)`. Same `bld-plan-detail-overlay` as in-game tile taps — no new overlay needed.

**Modal border standard: `border border-yellow-300`**
All BLD `overlay-modal-inner` divs now have `border border-yellow-300` — a deliberate subtle accent using BLD's brand colour. Applies to: `bld-quit-overlay`, `bld-role-help-overlay`, `bld-second-chances-overlay`, `bld-pass-reveal-overlay`, `bld-tip-overlay`. This is a new project-wide standard (see `ui-style.md` § Two-Pattern Overlay Library).

---

## Template Gaps (add to future specs)

- **Tech template §11 (Multiplayer):** Add explicit note — "All engine-multiplayer globals use `let`. Access directly, never via `window.`"
- **Tech template §11:** Add "missing handler audit" step — for each game phase, list every ACTION a non-host device might send. Confirm each has a handler before implementation begins.
- **Tech template §11:** Add "MDLM name population" — `onPassThePhone` should pull names from `mpPlayerSlots` and skip setup. No separate name-entry screen needed in MDLM.
- **Tech template §2 (State Flow):** Add "layout pattern decision" per screen — `h-screen overflow-hidden` (sticky CTA) or `min-h-screen overflow-y-auto` (centred content). Decide at spec time.
- **Phase audit Protocol B:** Add pre-MDLM-test grep — search plugin for `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.syllyMultiplayerMode`. Flag any `window.` prefix on engine-multiplayer globals.
- **UI standard — `[?]` header button:** Every new game must include `btn-[abbr]-how-to` in the gameplay header from day one, wired to its how-to overlay. Now in `ui-style.md` and phase-audit.md checklist.
- **UI standard — decision modal border:** Every `overlay-modal-inner` div must have `border border-[brand]-300`. Now in `ui-style.md` Pattern 2 description and phase-audit.md checklist.
- **UI standard — shared tip overlay:** Games with multiple contextual `[?]` points should implement a single `[abbr]-tip-overlay` + `[abbr]ShowTip()` function rather than per-tip overlays. Add to tech template §8 (Overlay Registry).
