# JEC (Just Enough Cooks) — Implementation Notes

## Design Decisions

**Naming collision — `applyExpansionOverrides`**
JEC uses `jecApplyExpansionOverrides()` with the `jec` prefix deliberately. The generic name `applyExpansionOverrides()` is already defined globally by `li5.js` (DSTW) and would be silently overwritten if reused. Always prefix game-specific expansion override functions.

**Sous Chef Oversight — ghost merge guard**
`jecApplyMerge(normA, normB)` checks that at least one norm exists in the frequency map before applying. If neither is present (ghost merge), it returns early with no effect. This prevents phantom merges when a player taps two items that both got normalised to the same key.

**Poisoned status overrides all other statuses**
Kitchen Nightmares (Sylly Mode): Poisoned = 0 pts, overrides Golden/Spoilt/Rotten. This is evaluated first in the scoring function. Signature Dish (ingredient slot 0) is the only exception — it can still double if Golden and not Poisoned.

**Inverse proportional scoring (Phase 28 and earlier)**
Replaced in Phase 29. Was: `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)`. Caused "scoring seems off" feedback — players felt punished for being almost-right.

**Tiered positive scoring (Phase 29 — current)**
New `jecCalcPoints(count, N)`: count=2 = full `jecGoldenScore` jackpot; count 3 to N−1 = half; count=N = 15% token reward; count=1 = 0 pts. No negatives by default — penalties (Rotten −5, Spoilt −count×2) are opt-in toggles defaulting OFF. Default `jecGoldenScore` raised from 20 → 30. This flips the philosophy from punitive to reward-driven: players chase jackpots rather than avoid mistakes. Sifting badge labels updated: "Chef's Kiss! ✨" (count=2), "Nice Match! 👌" (count 3+, Golden range), "Too Many Cooks! 🍲" (all-N), "A Bit Pongy! 🤢" (unique).

**Opt-in penalty priority in scoring loop**
When both Rotten or Spoilt penalties are ON, they override the tier reward for that count (not added on top). If Rotten penalty is ON and count=1, deduct 5 and skip the tier calc. If Spoilt penalty is ON and count=N, deduct count×2 and skip the token reward. This prevents double-counting (e.g. token reward + penalty simultaneously).

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

**Future design: Options A and B (Phase 29)**
Option A (Secret Sous-Chef): Device secretly pairs each player with one other chef; big bonus for matching your assigned partner. Adds social dynamics and cross-table groans. Requires Firebase targeted write for pairing or a shared-state derivation. Good for MDLM.
Option B (Kitchen Chaos Roles): Each round assigns a hidden agenda (Head Chef wants popular words, Fusion Chef wants exact 2-match, Health Inspector sabotages). Adds bluffing/deduction. Significantly changes game structure. Review design separately before implementing either option.
