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

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

*(No lessons logged beyond what is in the multiplayer subsection of game-identities.md.)*

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
