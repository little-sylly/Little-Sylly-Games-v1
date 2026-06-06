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
Fix: Add `lttp-new-plans-overlay` Decision Modal — "Head Out Again?" — triggered from gameover. Currently out of scope.
Status: Deferred. Log in Template Gaps.

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

**Play-again confirmation modal missing (Phase 28)**
LTTP gameover has no confirmation modal before resetting — `btn-lttp-new-plans` calls directly into setup. This violates the Protocol A "play-again must use Decision Modal" rule established in Phase 20. Needs `lttp-new-plans-overlay` added. See Bug Index L4.

**How-to overlay title non-compliant (Phase 28)**
LTTP's how-to overlay title reads "Late To The Party 🏃‍♂️" — should read "How to Play 🏃‍♂️" per the standard established in Phase 28. Low priority but flagged for next LTTP audit pass.
