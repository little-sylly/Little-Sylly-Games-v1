# SS (Secret Signals) — Implementation Notes

## Design Decisions

**Hybrid multiplayer mode**
SS supports both Individual Devices and 2-Device Teams (Zone 2 pill in host lobby, `supportsHybrid: true`). Most games are one or the other — SS is the only hybrid game in the suite.

**Team B vault security — targeted Firebase write**
Team B's vault is sent ONLY to the Client device via `SYNC: SS_VAULT_DATA` (targeted write). Team A's vault never leaves the Host. This is the one case in the codebase where targeted per-device Firebase writes are used — other games use couch security (broadcast all, render own slot only).

**Fuzzy matching — compound word handling**
`ssFuzzyMatch` is plural/singular aware and compound-word aware (hyphen/space split, ≥3 char components). Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching. This is SS-specific; do not apply to other games without testing.

**Customise Vault setting — curated vs full picker**
`ssCustomiseVault = false` uses a curated 10-category pool. `true` opens the full 16-category picker. Default off to prevent dead-end pairs (e.g. `pop_culture`, `brands`).

**S1 — TLM standby screen vs locking the encrypt flow (Phase 27)**
When the non-encrypting team's device receives `SS_ENCRYPT_TURN` in TLM, two approaches exist: (a) lock inputs and show a "please wait" banner on the encrypt screen, or (b) show a dedicated standby screen. Chose (b) — `screen-ss-standby` — because showing the encrypt screen to the wrong team risks displaying the other team's vault context. The standby screen is content-neutral and shows only the encrypting team's name.

**S2 — Settings vs roster state boundary for player names (Phase 27)**
`ssPlayerNamesA/B` are roster state (persist across play-agains within a session), not settings. The fix clears them only when entering PTP after a TLM session (`window.syllyMultiplayerMode === 'single'` at game-start time). PTP→PTP retains names as before.

**S6 — Intel DR button renamed "Accept It 🤝" and hidden until reveal (Phase 27)**
"Diplomatic Resolution" was too long and bureaucratic. "Accept It 🤝" is concise and thematic. Button is now hidden by default (`style="display:none"`) and shown only after the third failed attempt reveals the keyword — preventing premature reveals and making DR a clean fallback path only after the word is on screen.

**S7 — Word-by-word alternation for intel phase (Phase 27)**
Original: all 4 keywords for Team Leader, then all 4 for Underdog. New: kw0 Team A → kw0 Team B → kw1 Team A → kw1 Team B → etc. Requires `ssIntelDone[team][kwIdx]` tracking matrix. `ssShowIntelSummary()` updated so leader's summary "next" button calls underdog's summary directly — not `ssShowInningTransition` (which would restart guessing).

---

## Bug Index

**S1 — TLM code mismatch and vault info leak (Phase 27)**
What happened: In TLM Half 2 when Team B (client) encrypted, the host's `SS_ENCRYPT_TURN` handler called `ssStartHalf()` → `ssGenerateCode()`, overwriting the already-set `ssCurrentCode`. HOST and CLIENT ended up with different codes; HOST also briefly showed the encrypt screen with a wrong code, risking vault exposure.
Root cause: `ssStartHalf()` was always called on both devices on `SS_ENCRYPT_TURN` regardless of which team was encrypting.
Fix: TLM guard added in turn-advancement logic (host side) and in `SS_ENCRYPT_TURN` CLIENT handler (`engine-multiplayer.js`). Non-encrypting device shows `screen-ss-standby`.
Note: Final scoring was unaffected — `SS_RESOLUTION` always sends correct code to CLIENT.

**S3 — Duplicate button ID `btn-ss-how-to` (Phase 27)**
What happened: The game menu "How to Play" button and the encrypt screen `[?]` button shared ID `btn-ss-how-to`. `getElementById` returned only the first (menu), leaving encrypt `[?]` permanently unwired.
Root cause: Encrypt screen `[?]` added without checking for ID collision against the menu button.
Fix: Renamed encrypt screen `[?]` to `btn-ss-encrypt-tip`.
Lesson: See Template Gaps.

**S8 — Attempt 3 border ring applied to row wrapper (Phase 27)**
What happened: `ssLockAttemptInputs()` applied the red ring to the `.jec-attempt-row` wrapper div, causing the border to frame both the "Attempt 3" label and the input.
Root cause: Ring applied at row level, not input level.
Fix: Rewrote `ssLockAttemptInputs()` to select only the `input` element within the locked row.

---

## Multiplayer Lessons

**TLM: code generation must happen exactly once per half, on the encrypting device only (Phase 27)**
Any call to `ssGenerateCode()` in a TLM session must be guarded to confirm the current device is the encrypting team's device. In TLM, HOST = Team 0 always. Code for Team 1's turn must either be generated on the CLIENT or sent from HOST pre-generated.

**TLM standby screens are necessary for asymmetric-role games (Phase 27)**
In TLM SS, during the encrypt phase, one device is active (encoder's team) and the other is passive. Without a standby screen, the passive device shows a misleading UI or leaks vault information. Pattern: `ssShowEncryptStandby()` is called on TLM guard fire — content-neutral holding screen naming the encrypting team.

**Envelope handler safety: every function called from `mpHandleEnvelope` must exist before shipping (Phase 27)**
If `ssShowEncryptStandby()` had been undefined when called from the CLIENT `SS_ENCRYPT_TURN` handler, the Firebase callback would silently crash, leaving both devices stuck. Grep-confirm every function called from `mpHandleEnvelope` before shipping.

---

## Template Gaps

**Contextual `[?]` buttons need unique IDs enforced by convention (Phase 27)**
The S3 duplicate-ID bug happened because the encrypt-screen `[?]` and the menu "How to Play" button both received `btn-ss-how-to`. Convention: in-game contextual tips must use `btn-[abbr]-[phase]-tip` format; menu How to Play buttons use `btn-[abbr]-how-to`. Should be called out explicitly in the new-game checklist in `logic-engine.md`.

**Word-by-word alternation phases require a "done" matrix, not a simple counter (Phase 27)**
When two teams alternate per keyword, a simple index counter isn't enough — you need to know whether BOTH teams have attempted each keyword before advancing. The `ssIntelDone[team][kwIdx]` boolean matrix is the correct pattern. Future games with alternating multi-step phases should design this tracking matrix upfront in the tech spec.

**Intel summary routing: direct call, not transition screen, after final keyword (Phase 27)**
After word-by-word alternation finishes, calling `ssShowInningTransition` between the two summary screens incorrectly restarts the guessing sequence. Direct call `ssShowIntelSummary(underdog)` is correct. Transition screens are for advancing between guessing turns, not between summary screens.
