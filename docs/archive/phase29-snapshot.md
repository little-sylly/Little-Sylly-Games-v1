# Phase 29 Snapshot — Deferred Fixes: LTTP L4, JEC Scoring Redesign

**Date:** 2026-06-07
**SW Version:** v96
**Status:** Complete

---

## Summary

Phase 29 addressed three items deferred from Phase 28. LTTP L4 (missing play-again modal) is fixed. JEC scoring was redesigned from punitive to reward-driven (Option C). LTTP L3 ("undefined's Phone") is mitigated by the Phase 28 defensive fallback — confirmed as "test in MDLM" and not requiring a code change at this time.

---

## LTTP L4 — Play-Again Confirmation Modal

**Root cause:** `btn-lttp-new-plans` directly called `showScreen('screen-lttp-setup')` with no confirmation overlay. LTTP predated the play-again Decision Modal protocol established in Phase 20.

**Fix:** Added `lttp-new-plans-overlay` Decision Modal (z-[90], `border-red-300`). Opening handler (`btn-lttp-new-plans`) sets dynamic confirm label based on `syllyMultiplayerMode`:
- Host: "Restart in Lobby 🔄"
- Client: "Leave Session"
- Single: "Head Out Again 🏃‍♂️"

Confirm handler executes `mpReturnToLobby()` (MP) or `showScreen('screen-lttp-setup')` (single). Cancel closes the modal. Overlay teardown added to `engine.js` `resetToLobby()`.

**Files:** `index.html`, `js/games/lttp.js`, `js/engine.js`

---

## JEC — Scoring Redesign (Option C)

**Problem:** The inverse proportional formula caused "scoring seems off" feedback. Both penalties defaulted ON, meaning players could easily go negative in a round — a party game vibe-killer. The game felt stressful rather than fun.

**New philosophy:** Reward-driven. Chase jackpots, not avoid mistakes.

### New scoring tiers (`jecCalcPoints(count, N)`)

| Situation | Points |
|-----------|--------|
| 2-Chef match (Sweet Spot) | `jecGoldenScore` (full jackpot — default 30 pts) |
| 3 to N−1 Chefs match (Nice Match) | `round(jecGoldenScore × 0.5)` (~15 pts at default) |
| All N Chefs match (Too Many Cooks) | `round(jecGoldenScore × 0.15)` (~5 pts at default) |
| Unique (count=1) | 0 pts |

### Opt-in penalties (default OFF)
- **Rotten Penalty** ON: Unique ingredients cost −5 pts (was −10)
- **Spoilt Penalty** ON: Too Many Cooks costs −(count × 2) pts (unchanged formula, but defaults OFF)
- Penalties take priority over tier rewards in the scoring loop — no double-counting.

### Settings changes
| Setting | Old default | New default |
|---------|------------|------------|
| `jecGoldenScore` | 20 | **30** |
| `jecRottenPenalty` | ON | **OFF** |
| `jecSpoiltPenalty` | ON | **OFF** |

### Sifting display updates
| Badge (before) | Badge (after) |
|---------------|--------------|
| "Chef's Kiss! ✨" (all Golden) | "Chef's Kiss! ✨" (count=2 only) |
| — | "Nice Match! 👌" (count 3+ in Golden range) |
| "Spoilt ingredient!" | "Too Many Cooks! 🍲" |
| "Rotten ingredient!" | "A Bit Pongy! 🤢" |

Golden score setting description updated to describe the tiered system. `jec-rotten-desc` and `jec-spoilt-desc` now hidden by default (revealed when penalty is toggled ON).

**Files:** `js/games/jec.js`, `index.html`

---

## LTTP L3 — "undefined's Phone" Status

**No code change.** The defensive fallback at `lttp.js:643` (`lttpPlayerNames[playerIdx] || \`Player ${playerIdx + 1}\``) eliminates the "undefined's Phone" symptom. Root cause (why `lttpPlayerNames[playerIdx]` was ever undefined) remains unconfirmed — requires MDLM browser testing. Marked as "test to confirm closed" in implementation notes.

---

## Files Modified

| File | Change |
|------|--------|
| `index.html` | `lttp-new-plans-overlay` HTML; JEC Golden pill default (30), Rotten/Spoilt pill defaults (OFF), desc visibility, desc text, setting description |
| `js/games/lttp.js` | `btn-lttp-new-plans` → modal open; confirm + cancel handlers added |
| `js/engine.js` | `lttp-new-plans-overlay` teardown in `resetToLobby()` |
| `js/games/jec.js` | New `jecCalcPoints()`, updated `jecCalcRoundScores()`, updated sifting badges, defaults changed |
| `sw.js` | Bumped to v96 |
| `CLAUDE.md` | Phase + SW version updated |
| `.claude/rules/logic-engine.md` | SW version updated |
| `docs/lttp-implementation-notes.md` | L4 marked fixed, Template Gaps updated |
| `docs/jec-implementation-notes.md` | Scoring decisions documented, Options A/B logged as future work |

---

## Deferred

- **LTTP L3** — "undefined's Phone" root cause: defensive fallback in place; browser-test MDLM to confirm closed.
- **JEC Option A** (Secret Sous-Chef) — partner pairing mechanic; design review needed before implementing.
- **JEC Option B** (Kitchen Chaos Roles) — asymmetric goal roles; design review needed.
