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

**J1 — MDLM: game does not advance to sifting after all players submit**
What happened: In MDLM, all players see "Ingredients submitted — waiting for the other chefs…" but the sifting phase never begins.
Root cause: The host sends its own JEC_PREP_SUBMIT via `mpSendEnvelope`. However, `engine-multiplayer.js` line 486 silently drops all envelopes where `env.originId === window.syllyDeviceUid` (deduplication guard). So the host's own ACTION is never processed by `mpHandleEnvelope`. `jecMpReadyCheck[mpMyPlayerIdx]` is never set to `true`. `jecMpReadyCheck.every(Boolean)` never fires.
Fix: In `js/games/jec.js` `jecSubmitIngredients()`, when `syllyMultiplayerMode === 'host'`, process the host's own submission directly (mark readycheck, check all-ready, broadcast JEC_SIFTING if complete) instead of sending via envelope.
Status: Fixed Phase 28.

---

## Multiplayer Lessons

**Sous Chef Oversight in MDLM**
Host runs all sifting + Sous Chef oversight. All merges are broadcast via `JEC_MERGE` so all devices stay in sync. Clients cannot initiate merges — they wait for the host's merge SYNC.

**MDLM host readycheck pattern (applies to all games with a readyCheck matrix)**
`engine-multiplayer.js` line 486 drops all envelopes where `originId === syllyDeviceUid` as a deduplication guard. This means the host's own ACTION envelopes are NEVER processed by `mpHandleEnvelope`. Any readyCheck update that relies on the ACTION handler will silently skip the host's slot. Fix pattern: when `syllyMultiplayerMode === 'host'`, process the host's own submission directly in the game's submit function (mark readycheck, check `.every(Boolean)`, broadcast SYNC if all ready). Do NOT send via envelope for host-owned submissions in readyCheck games.

---

## Template Gaps

**Open design question: scoring balance (Phase 28)**
User noted scoring "seems off" and that the game may feel less fun due to limited ingredient/cooking knowledge. The inverse proportional scoring formula and minimum 3-ingredient match are under review. Deferred to a future design session — do not change scoring without a dedicated design discussion.

**Open design question: fun factor (Phase 28)**
User noted the game "feels not exactly fun at the moment" — possibly linked to difficulty of generating ingredient words without cooking knowledge. Consider whether default difficulty (Menu Complexity) should be lowered, or whether the game needs a category refresh. Deferred.
