# JEC (Just Enough Cooks) — Implementation Notes

## Design Decisions

**Naming collision — `applyExpansionOverrides`**
JEC uses `jecApplyExpansionOverrides()` with the `jec` prefix deliberately. The generic name `applyExpansionOverrides()` is already defined globally by `li5.js` (DSTW) and would be silently overwritten if reused. Always prefix game-specific expansion override functions.

**Sous Chef Oversight — ghost merge guard**
`jecApplyMerge(normA, normB)` checks that at least one norm exists in the frequency map before applying. If neither is present (ghost merge), it returns early with no effect. This prevents phantom merges when a player taps two items that both got normalised to the same key.

**Poisoned status overrides all other statuses**
Kitchen Nightmares (Sylly Mode): Poisoned = 0 pts, overrides Golden/Spoilt/Rotten. This is evaluated first in the scoring function. Signature Dish (ingredient slot 0) is the only exception — it can still double if Golden and not Poisoned.

**Inverse proportional scoring**
Golden score scales inversely with count: `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)`. count=2 always = full score. Designed so fewer matches = more points, without making unique matches (count=1) immediately rotten.

---

## Bug Index

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

**Sous Chef Oversight in MDLM**
Host runs all sifting + Sous Chef oversight. All merges are broadcast via `JEC_MERGE` so all devices stay in sync. Clients cannot initiate merges — they wait for the host's merge SYNC.

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
