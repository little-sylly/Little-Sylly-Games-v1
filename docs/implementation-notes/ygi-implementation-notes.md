# YGI (You Get It?) — Implementation Notes

## Design Decisions

**`[ ]` placeholder rendered at display time, never stored**
The Gap in situation text is stored as `[ ]` in `ygi-data.json` and rendered as `________` via `.replace('[ ]', '________')` at every display point. Never transform the stored data — always apply at render time. Display points: `ygiShowInput()`, `ygiShowReveal()`, `ygiShowVoteInput()`, `ygiShowOpenBallparkVote()`, `ygiShowResults()`, `ygiRenderRoundLog()`.

**Vertical centering — `my-auto` pattern**
The Lineup uses `flex-1 overflow-y-auto flex flex-col` on the outer wrapper and `my-auto` on the inner content div. Centers when content fits; collapses to natural scroll when overflowing. `min-h-full justify-center` does NOT work inside overflow containers — always use `my-auto`.

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
