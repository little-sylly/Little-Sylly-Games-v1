# YGI (You Get It?) — Implementation Notes

## Design Decisions

**`[ ]` placeholder rendered at display time, never stored**
The Gap in situation text is stored as `[ ]` in `ygi-data.json` and rendered as `________` via `.replace('[ ]', '________')` at every display point. Never transform the stored data — always apply at render time. Display points: `ygiShowInput()`, `ygiShowReveal()`, `ygiShowVoteInput()`, `ygiShowOpenBallparkVote()`, `ygiShowResults()`, `ygiRenderRoundLog()`.

**Vertical centering — migrated to the Stack (26 June 2026); old `my-auto` note retracted**
~~The Lineup uses `flex-1 overflow-y-auto flex flex-col` + `my-auto`…~~ This advice was **wrong** and is retracted. `my-auto` inside an `overflow-y-auto` column is a silent no-op (no free space to distribute) — the FRT BUG-02 lesson. In the suite-wide Stack sweep, `screen-ygi-reveal`, `screen-ygi-vote`, `screen-ygi-results`, and `screen-ygi-gameover` were migrated off `h-screen` + `my-auto` to the centred **Stack** (`ui-style.md` § The Stack): one `flex items-center justify-center min-h-screen overflow-y-auto` section wrapping a single `flex flex-col max-w-sm gap-4` column. Centring is now the section's job, never the child's. All element IDs (`ygi-lineup-cards`, `ygi-vote-cards`, `ygi-results-cards`, `ygi-gameover-standings`, etc.) and render code are unchanged — markup-only transform. Residual: a couple of these carry a leftover nested wrapper / uneven per-zone padding from the scoped transform; functional and centred, polish opportunistically. Also fixed 26 June 2026: `screen-ygi-gameover` inner footer `pb-8` → `pb-2` (was making the column appear bottom-heavy despite correct section centring).

**The Consensus forced to secret-ballot in Lobby Mode**
`ygiVerdictStyle` is forced to `'secret-ballot'` in Lobby Mode. The Consensus (`'open-ballpark'`) requires a shared device — not viable with individual devices. This override is applied in `YGI_ROUND_START` handling.

**ID format legacy**
Existing entries use `ce-NNN` ID format (legacy — do not rename). New entries use `ygi-NNN` starting at `ygi-001`.

---

## Bug Index

**Y1 — MDLM: game does not advance to lineup after all players submit Take**
What happened: After all players submit their number + metric, all devices are locked out and the game never advances to the reveal screen.
Root cause: Same root cause as JEC J1 — `engine-multiplayer.js` line 486 drops self-sent envelopes (`originId === syllyDeviceUid`). Host sends YGI_TAKE_SUBMIT via envelope; it's ignored; `ygiMpReadyCheck[mpMyPlayerIdx]` is never set. `.every(Boolean)` never fires.
Fix: When `syllyMultiplayerMode === 'host'`, host marks its own readycheck slot directly and checks all-ready (same as JEC fix pattern). ygiInputs is already updated before the MP check, so no re-push needed.
Status: Fixed Phase 28.

**Y2 — MDLM: vote phase also affected by same readycheck bug**
What happened: The vote phase has the same root cause — host's YGI_VOTE_SUBMIT is ignored; `ygiVoteReadyCheck[mpMyPlayerIdx]` never set.
Fix: Same host-direct pattern. ygiVotes NOT pre-pushed, so host push + readycheck + full scoring computation all run in the host path.
Status: Fixed Phase 28.

**Y3 — MDLM: round-log double-pushed; one entry is malformed and crashes the carousel (Phase 3 audit, 13 June 2026)**
What happened: In Lobby Mode the host pushes a round-log entry inside the vote-resolution path (`ygi.js` line ~561, and `engine-multiplayer.js` `YGI_VOTE_SUBMIT` line ~965) *and then* calls `ygiShowResults()`, which pushes a second entry (line ~694). Clients set `ygiRoundLog = p.roundLog` from the SYNC then also call `ygiShowResults()` → another push. So `ygiRoundLog` ends up with 2 entries per round on every device.
Root cause: the manual push was added to populate the `roundLog` field of the `YGI_VERDICT` SYNC, but `ygiShowResults()` already owns the push (single-device path proves it — `ygiComputeAndShowResults()` does NOT push; only `ygiShowResults()` does). The manually-pushed entry is also malformed: `prompt: ygiCurrentPrompt` is the prompt **object**, not `.text`, and `entries` lacks the `name/pts/isGhost/isWinner` fields the renderer expects.
Impact: The gameover carousel indicator shows a doubled count (e.g. "1 / 6" for a 3-round game). Navigating "prev" eventually lands on a malformed entry, where `ygiRenderRoundLog()` calls `entry.prompt.replace('[ ]', …)` on an object → **TypeError**, killing the carousel. MP-only.
Fix (RESOLVED, Phase 3 audit, 15 June 2026): removed the manual malformed `ygiRoundLog.push()` from both host paths (`ygi.js` vote-resolution + `engine-multiplayer.js` `YGI_VOTE_SUBMIT`). `ygiShowResults()` is now the single source of truth for the round-log push; both host paths call it *first*, then build the `YGI_VERDICT` SYNC with `roundLog: ygiRoundLog` so the broadcast carries the freshly-pushed, well-formed entry. The client `YGI_VERDICT` handler now calls `ygiShowResults()` (which pushes a local entry) and *then* overwrites `ygiRoundLog = p.roundLog` with the host's authoritative log — assign-after-render, never both a push and a stale assign. Result: exactly one well-formed entry per round on every device. Verified `node --check` clean. Needs live 3-round MDLM browser confirmation (carousel reads "1 / 3").
Status: RESOLVED (Phase 3 audit).

**Y4 — MDLM: Sudden Death (Solo Take tie-break) is not multiplayer-aware (Phase 3 audit, 13 June 2026)**
What happened: When `ygiDecider === 'only-one'` (Solo Take) and the final standings tie, `ygiStartSuddenDeath()` runs a pass-the-phone flow (`screen-ygi-sd-intro` → `screen-ygi-sd-pass` → `screen-ygi-sd-input`) with zero MP packets.
Root cause: Sudden Death was built for single-device play and never given ACTION/SYNC handlers. In MDLM each device independently calls `ygiShowGameOver()` (the `btn-ygi-results-next` handler is not host-gated) and runs its own local SD.
Impact: Conditional (Solo Take + a tie). In MDLM the sudden-death is unplayable/divergent. Same class as SS Intel-Phase S12.
Fix (RESOLVED, June 2026 — Group B, host-driven SD): built the full host-authoritative sudden death. New packets: `YGI_SUDDEN_DEATH` (SYNC — host broadcasts the chosen question + tied finalists so every device runs the same SD), `YGI_SD_SUBMIT` (ACTION — each finalist submits their number from their OWN device; the pass-the-phone gate is bypassed in MDLM), `YGI_GAMEOVER` (SYNC — host resolves the winner and broadcasts final standings; carries `afterSD` + `sdInputs` so clients can render the SD answer reveal). Host aggregates via the new `ygiSdReadyCheck[]` and resolves once all finalists are in. `ygiRenderSDIntro()` factored out so host + client share the intro render; in MDLM only finalists get an active Begin button, non-finalists see "Sudden death in progress…", and finalists who have answered see a "Waiting for the other finalists…" standby (`ygiShowSDWaiting`). Single-device pass-the-phone path unchanged. Verified `node --check` clean. Needs live MDLM browser confirmation.
Status: RESOLVED (Group B).

**Y5 — MDLM: `btn-ygi-results-next` not host-gated; clients advance the round locally (Phase 3 audit, 13 June 2026)**
What happened: The results-screen "Next Situation →" button runs `ygiStartRound()` on whichever device taps it. On a client, `ygiStartRound()` pops the client's own (independently shuffled) `ygiPromptPool` and shows `screen-ygi-prompt` with the wrong situation until the host's `YGI_ROUND_START` SYNC arrives and overwrites it.
Root cause: no `syllyMultiplayerMode` branch on the results-next handler — same client-gating-gap class as JEC J4.
Impact: transient wrong-situation flash on clients + divergent `ygiRound` increments (self-corrects on the next `YGI_ROUND_START`). Low severity.
Fix (RESOLVED, June 2026 — folded into the Y4 fix): the `btn-ygi-results-next` handler now early-returns for clients, and `ygiShowResults()` disables the button + relabels it "Waiting for the host…" on clients. The host owns both the round advance (`ygiStartRound` → `YGI_ROUND_START`) and the gameover transition (`ygiShowGameOver` → `YGI_GAMEOVER` / `YGI_SUDDEN_DEATH`). Same seam as Y4, so fixed together.
Status: RESOLVED (Group B, with Y4).

---

## Multiplayer Lessons

**MDLM host readycheck pattern — same as JEC J1**
See JEC implementation notes for the canonical description of this bug pattern. Any game using a readyCheck matrix must mark the host's own slot in the local submit path.

---

## Template Gaps

**How-to overlay format consistency (Phase 28)**
YGI how-to was missing the detail paragraph under each step. Other games (LI5, GM, SS) include a plain-English explanation after the bold heading. The standard 3-level format (Step N tag → bold heading → detail paragraph) should be applied universally. See ui-style.md How-to Overlay Style Standard added in Phase 28.

**[?] contextual tip on The Gap (Phase 28)**
Added a [?] button on the YGI input screen next to The Gap label, with sentence-structure guidance. This pattern (inline [?] → shared tip overlay) should be used for any game mechanic that players frequently misunderstand on first play.

**How-to overlay title missing emoji (Phase 28)**
YGI how-to overlay title reads "How to Play" without an emoji. Per the standard established in Phase 28, it should read "How to Play 🃏". Low priority but flagged for next pass.

**Duplicate `ygiShowHelpTip()` definition (Phase 3 audit, 13 June 2026)**
`ygiShowHelpTip()` is defined twice, identically, at `ygi.js` lines ~58 and ~153 (the second wins). Harmless but dead duplication. [POLISH] — delete the first definition.

**Legacy `sylly-toggle-off` OFF-state alias (Phase 3 audit)**
YGI's settings toggles set the OFF class to `sylly-toggle-off` (lines ~130, ~138) rather than the canonical `game-toggle-off`. The alias is still valid (shared CSS rule) so this is not a bug, but YGI is one of the few games still on the legacy alias — flagged [POLISH] for consistency. (The deprecated class is `sylly-toggle-on`, which YGI does NOT use — Check B clean.)

**`ygi-help-tip-overlay` not in teardown (Phase 3 audit)**
`resetYouGetIt()` hides quit/settings/how-to/run-it-back but NOT `ygi-help-tip-overlay`; `engine.js` `resetToLobby()` doesn't either. DYB BUG-05 ghost-interceptor class — reachable if the tip is open when a host-disconnect fires `resetToLobby()`. Add to `resetYouGetIt()`. Augments the suite-wide 2B teardown [BUG].
