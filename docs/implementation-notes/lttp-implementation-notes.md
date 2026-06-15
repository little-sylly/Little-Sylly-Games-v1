# LTTP (Late to the Party) — Implementation Notes

## Design Decisions

**Small Talk Helper — always routes through confirm overlay**
The guided path (Small Talk Helper ON) opens `lttp-smalltalk-overlay` first. Selecting a prompt pre-fills `lttp-confirm-overlay` and closes the smalltalk overlay. `lttp-confirm-overlay` is always the final step regardless of mode. The "Other" tab opens the confirm modal with an empty input — typed reminder text in the Other tab is not transferred.

**History schema uses `messageText` only**
`lttpPendingTag` was removed. History records are `{ asker, asked, plan, messageText: "string" }` — the final typed message only, regardless of guided/free-text mode.

**Contacts — local only, never synced**
Map annotations and Contacts status/notes are local to each device in Lobby Mode. They are intentionally not synced — each player maintains their own suspicion tracking. This is a deliberate privacy/UX decision, not a gap.

**Rotating folder hints — global index, not per-player**
The hint index increments globally each time any folder is opened (6 phrases per role, cycles via modulo). This means the same device cycling through multiple players' folders will show sequential hints, not the same hint repeated.

---

## Bug Index

**L1 — PTP (single-device) mode broken**
What happened: The normal pass-the-phone game flow does not work on a single device.
Root cause: Multiplayer refactors introduced a guard condition that short-circuits the single-device path. Investigate `lttpStartGame()`, BRIEFING/CHAT routing, and message flow for `syllyMultiplayerMode !== 'single'` guards in wrong positions.
Status: Fixed Phase 28.

**L2 — MDLM: host can start game with incomplete roster**
What happened: When 3 of 4 player slots are filled, the host can still trigger game start.
Root cause: The "Start Game" / confirm-roster condition does not correctly enforce the required player count for LTTP.
Fix: Ensure start-game is disabled until all expected player slots are filled.
Status: Fixed Phase 28.

**L3 — MDLM: contacts shows "undefined's Phone" after a message is sent**
What happened: After any message is sent, all non-host devices show "undefined's Phone" in the contacts overlay.
Root cause: Investigated — `lttpPlayerNames` IS present in LTTP_GAME_START payload (lttp.js line 491) and IS applied on clients (engine-multiplayer.js). The name array is correctly synced. Most likely cause: `lttpActiveIdx` is `-1` or stale on some devices when `lttpShowChat` runs post-interrupt. Added defensive fallback: `const name = lttpPlayerNames[playerIdx] || \`Player \${playerIdx + 1}\`` in `lttpShowChat`. Full root cause requires browser testing.
Status: Partially mitigated Phase 28 (defensive fallback). Browser test to confirm.

**L4 — LTTP has no play-again confirmation modal (Protocol A flag)**
What happened: `btn-lttp-new-plans` on the gameover screen directly calls `showScreen('screen-lttp-setup')` with no confirmation overlay.
Root cause: LTTP predates the play-again Decision Modal protocol established in Phase 20.
Fix: Added `lttp-new-plans-overlay` Decision Modal (z-[90], red border, "Head Out Again?" heading). `btn-lttp-new-plans` now opens the modal; confirm and cancel handlers added. Dynamic label on confirm button: "Restart in Lobby 🔄" (host) / "Leave Session" (client) / "Head Out Again 🏃‍♂️" (single). `mpReturnToLobby()` moved to confirm handler. Teardown added to `engine.js` `resetToLobby()`.
Status: Fixed Phase 29.

**L5 — MDLM: plan narrowing / plan advancement is not synced (Phase 3 audit, 13 June 2026)**
What happened: Only the per-message loop has packets. When a lap completes, the highlights never narrow consistently across devices and the plan counter desyncs.
Root cause: two-fold. (1) The host's `LTTP_MESSAGE_SEND` handler (`engine-multiplayer.js` ~1415) pushes history + sets `lttpActiveIdx` + broadcasts `LTTP_MESSAGE_INTERRUPT`, but never runs the lap-completion branch (`lttpNarrowHighlights()` / `lttpShowPlanUpdate()` / `lttpStartGuessPhase()`). So when a *client* completes a lap the host's `lttpPlan`/`lttpHighlights` stay stale. (2) The lap-completing client runs `lttpNarrowHighlights()` locally, but it's immediately clobbered by the interrupt-dismiss → `lttpShowChat()`. (3) Even if narrowing were broadcast, `lttpNarrowHighlights()` picks decoys via `shuffle([...lttpDecoys])` — non-deterministic, so independent narrowing per device would diverge regardless.
Impact: after the first full lap, devices show different remaining locations and the plan can fail to advance. Primary MDLM mode partially broken. (Phase 28 MDLM testing likely covered only the first lap's messaging.)
Fix (RESOLVED, June 2026 — Group B, with L6): the host now owns lap completion. `lttpSelectPlayer` no longer computes advancement on the sender — a client just sends `LTTP_MESSAGE_SEND` and shows the interrupt; the host runs `lttpHostProcessMessage()` → `lttpAdvanceAfterMessage()` for both its own and clients' messages. `lttpAdvanceAfterMessage` narrows **once** on the host and broadcasts the resolved sets via `LTTP_PLAN_UPDATE` (`highlights`/`fadedCells`/`decoys`/`plan`/`activeIdx`/`lapAnswered`/`history`/`planLog`) — no client ever calls `lttpNarrowHighlights()` (so the non-deterministic `shuffle()` can't diverge). Normal turns broadcast `LTTP_TURN_ADVANCE`; the interrupt-dismiss no longer navigates (it would clobber a plan-update/guess screen the host just navigated to) — navigation is entirely host-SYNC-driven. Verified `node --check` clean. Needs live MDLM browser confirmation.
Status: RESOLVED (Group B).

**L6 — MDLM: guess phase + gameover have no MP packets (Phase 3 audit, 13 June 2026)**
What happened: `lttpStartGuessPhase()`, the pin/vote screens, and `lttpComputeAndShowGameover()` carry zero ACTION/SYNC. In MDLM the Plan-4 endgame either never starts on client devices (when the host completes the lap) or runs a divergent local pass-the-phone flow.
Root cause: the endgame was bolted on after the messaging-loop MP work and never made MP-aware — exact mirror of SS Intel-Phase S12.
Fix (RESOLVED, June 2026 — Group B, with L5): host-driven guess collection. `lttpStartGuessPhase()` broadcasts `LTTP_GUESS_PHASE`; since `lttpGroupVote` is forced off in MDLM, every device guesses for its own player simultaneously (Stray pins via `LTTP_PIN_SUBMIT`, everyone else votes via `LTTP_VOTE_SUBMIT`) — no pass-the-phone, no group-guess screen. The host aggregates with the new `lttpGuessReadyCheck[]`, runs `lttpComputeAndShowGameover()` once all are in, and broadcasts `LTTP_GAMEOVER` (winner/reason/pin/votes/highlights). Non-active devices show a "Waiting for the other guests…" standby (`lttpShowGuessWaiting`). Single-device pass-the-phone flow unchanged. Verified `node --check` clean. Needs live MDLM browser confirmation.
Status: RESOLVED (Group B).

---

## Multiplayer Lessons

**Message interrupt fires on ALL devices simultaneously**
`mp-lttp-message-interrupt-overlay` (z-[105]) is shown on every device when any player sends a message. Passive devices (not the active player) have `.lttp-send-trigger` and `#btn-lttp-confirm-send` locked.

**Player name sync must be explicit in GAME_START payload**
Games that populate player names during local setup (from text inputs or settings) must explicitly include `playerNames` in their GAME_START broadcast. Clients have no other way to obtain these names. LTTP was missing this — contacts overlay broke as a result. This is now a required checklist item for any game with player names in multiplayer.

---

## Template Gaps

**Contacts tab prominence in MDLM (Phase 28)**
The red dot on the 🕵️ Contacts button was insufficient to direct the active player to proceed. Added a CSS pulse/flash animation on the button when it's the active player's turn and contacts is not yet opened. Future games with a "tap X to proceed" mechanic on a non-obvious element should use this animated-indicator pattern.

**[?] on message/action modals (Phase 28)**
Added a contextual [?] to the `lttp-confirm-overlay` header with tips on what good questions look like. Any modal where the player is expected to produce creative or strategic content benefits from a tip anchor near the input.

**Play-again confirmation modal (Phase 29 — resolved)**
`lttp-new-plans-overlay` added in Phase 29. `btn-lttp-new-plans` now opens the modal; dynamic label per multiplayer mode. Teardown in `engine.js`. Fully compliant with Protocol A. See Bug Index L4.

**How-to overlay title non-compliant (Phase 28)**
LTTP's how-to overlay title reads "Late To The Party 🏃‍♂️" — should read "How to Play 🏃‍♂️" per the standard established in Phase 28. Low priority but flagged for next LTTP audit pass.

**Dead `lttpShowRoleReveal()` + implicit-global `lttpRoleRevealIdx` (Phase 3 audit, 13 June 2026)**
`lttpShowRoleReveal()` (`lttp.js` ~525) and `screen-lttp-role-reveal` are never reached in any flow — roles are revealed on the chat screen (role label + objective). `lttpAssignRoles()` also has a dead `const indices = shuffle(...)` (line ~452, never used). `lttpRoleRevealIdx` is assigned (lines ~469, ~1504) but never declared with `let` → implicit global. [POLISH] — remove the dead function/screen/var or wire a real role-reveal gate; declare the var if kept.

**Contacts/map labels reality-synced (Phase 3 audit)**
The status label keyed `safe` displays "✅ Maybe" (not "Safe"); map annotations are "Maybe (green) / Nope (red)". `game-identities.md` was corrected to match (was "✅ Safe" / "Dead End"). Reality wins.

**Tip overlays not in teardown (Phase 3 audit)**
`lttp-tip-overlay`, `lttp-help-tip-overlay`, and `lttp-smalltalk-overlay` are hidden by neither `resetLateToTheParty()` nor `engine.js` `resetToLobby()`. (`lttp-new-plans-overlay` IS hidden, in `engine.js`.) DYB BUG-05 class — 2B's sweep caught only `lttp-smalltalk-overlay`; the two tip overlays were missed there. Add all three to `resetLateToTheParty()`.
