# Phase 28 Snapshot — Audit & Polish: JEC, YGI, LTTP, NAT, DSD

**Date:** 2026-06-07
**SW Version:** v95
**Status:** Complete

---

## Summary

Phase 28 audited and polished the five games not covered in Phase 27 (LI5, GM, SS). All five received MDLM bug fixes, UI improvements, and Protocol A audits. No new screens were added; no architecture changed outside of the multiplayer `hasCaptain` pattern.

---

## Critical Bug Fixes

### JEC — MDLM readycheck (J1)
**Root cause:** `engine-multiplayer.js` drops self-sent envelopes (`originId === syllyDeviceUid`). Host's own JEC_PREP_SUBMIT was silently ignored; `jecMpReadyCheck` never completed.
**Fix:** Host path in `jecSubmitIngredients()` marks its own readycheck slot directly and broadcasts JEC_SIFTING when all ready.
**Files:** `js/games/jec.js`

### YGI — MDLM readycheck Take + Vote (Y1, Y2)
**Root cause:** Same self-envelope deduplication pattern. Both Take submit and Vote submit readychecks affected.
**Fix:** Same host-direct pattern in both `ygiSubmitTake()` and `ygiSubmitVote()`.
**Files:** `js/games/ygi.js`

### LTTP — PTP mode broken (L1)
**Root cause:** `onPassThePhone` in `engine-multiplayer.js` only ran `lttpStartGame()` when `syllyMultiplayerMode === 'host'`. In PTP mode, mode is `'single'`, so nothing ran.
**Fix:** Added `else if (syllyMultiplayerMode === 'single')` branch → `showScreen('screen-lttp-setup'); lttpSyncSetup();`
**Files:** `js/engine-multiplayer.js`

### LTTP — MDLM roster enforcement (L2)
**Root cause:** `mpRenderHostPlayerList()` used `>= 2` as the start condition. LTTP requires the configured `lttpPlayerCount`.
**Fix:** Added `getMinPlayers: () => lttpPlayerCount` to LTTP game config. `mpRenderHostPlayerList()` now uses `mpActiveGameConfig?.getMinPlayers?.() ?? 2`.
**Files:** `js/engine-multiplayer.js`

### NAT — MDLM all devices show Lead Biologist (N1)
**Root cause:** `natRenderObservationScreen()` used the current turn's `pIdx` for all role display. In MDLM, each device should render its own player's role via `mpMyPlayerIdx`.
**Fix:** `myPIdx = (syllyMultiplayerMode !== 'single') ? mpMyPlayerIdx : pIdx` at all role/word/category display points.
**Files:** `js/games/nat.js`

### DSD — MDLM captain fields shown pre-lobby (pre-game)
**Root cause:** `hasCaptain: true` in DSD rosterConfig was a static boolean — always showed captain name inputs regardless of `mpLobbyStyle`.
**Fix:** Changed to `hasCaptain: () => window.mpLobbyStyle === 'team'`. Added `mpRcHasCaptain(rc)` helper to engine-multiplayer.js to resolve function-or-bool at all read sites.
**Files:** `js/engine-multiplayer.js`

---

## UI Improvements

### YGI
- **How-to format:** All 4 steps now use 3-level format: orange-500 Step N eyebrow → bold heading → detail paragraph.
- **[?] on The Gap:** Inline [?] button next to The Gap label on input screen. Opens `ygi-help-tip-overlay` with sentence-structure guidance.

### NAT
- **How-to format:** All steps now use 3-level format: lime-600 Step N eyebrow → bold heading → detail paragraph.
- **Research log display:** Cumulative clues now displayed left-to-right joined by ` · ` with no day labels.

### LTTP
- **[?] on Message modal:** `btn-lttp-tip-message` added to `lttp-confirm-overlay` header. Opens `lttp-tip-overlay` with three tips on what makes a good message.
- **Contacts flash:** `lttp-tab-badge` CSS pulse animation added. Already wired in lttp.js — CSS was missing. Now in `css/styles.css`.

### DSD
- **"Operations Manual" → "How to Play":** How-to overlay title block heading updated to comply with the universal how-to title standard.
- **"Clue History" → "Sonar Log":** Label renamed in spectator screen. Entry style changed to compact `border-b` rows (`gap-0`) instead of rounded cards.
- **Spectator tap-to-peek:** Unrevealed cells now show `?` by default. Tapping a cell toggles its word visible via `dsdFlippedCells` Set (per-cell state, resets on grid re-render from execution).

---

## Protocol A Audit Findings

### Checks: all 5 games

| Check | JEC | YGI | LTTP | NAT | DSD |
|-------|-----|-----|------|-----|-----|
| allScreens[] current | ✅ | ✅ | ✅ | ✅ | ✅ |
| SW precache current | ✅ | ✅ | ✅ | ✅ | ✅ |
| No TODO/FIXME | ✅ | ✅ | ✅ | ✅ | ✅ |
| No window. prefix on non-window globals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Play-again uses Decision Modal | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Decision modal borders | ✅ | ✅ | ✅ | ✅ | ✅ |
| No naked setTimeout | ✅ | ✅ | ✅ | ✅ | ✅ |
| How-to title "How to Play [emoji]" | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| Layout pattern correct | ✅ | ✅ | ✅ | ✅ | ✅ |

**Flags:**
- **LTTP play-again modal missing (L4):** `btn-lttp-new-plans` directly resets. Needs `lttp-new-plans-overlay` Decision Modal. Deferred — not in Phase 28 scope. Logged in LTTP implementation notes.
- **YGI how-to title missing emoji:** Reads "How to Play" — should be "How to Play 🃏". Low priority. Logged in YGI implementation notes.
- **LTTP how-to title non-compliant:** Reads "Late To The Party 🏃‍♂️" — should be "How to Play 🏃‍♂️". Logged in LTTP implementation notes.
- **JEC how-to title missing emoji:** Reads "How to Play" — should be "How to Play ✨". Low priority. Deferred.
- **DSD duplicate `id` attribute on captain [?] button:** Fixed in-place (removed duplicate `id="btn-dsd-how-to"`).

---

## New Engine Patterns

### `mpRcHasCaptain(rc)` — engine-multiplayer.js
Resolves a game config's `hasCaptain` property that may be either a boolean or a zero-arg function. Required for any future game where captain assignment depends on `mpLobbyStyle`.

### How-to overlay title standard — ui-style.md
Title block heading must always read "How to Play [emoji]". Thematic subtitle below is still allowed. Added to ui-style.md with compliance status table.

---

## Files Modified

| File | Change |
|------|--------|
| `js/games/jec.js` | MDLM readycheck host-direct fix |
| `js/games/ygi.js` | MDLM readycheck host-direct fix (Take + Vote) |
| `js/games/lttp.js` | PTP fix, defensive name fallback, tip overlay wiring + `lttpShowTip()` |
| `js/games/nat.js` | MDLM role display fix, research log display |
| `js/games/dsd.js` | Spectator tap-to-peek, Sonar Log compact style, setTimeout comments |
| `js/engine-multiplayer.js` | L1 PTP, L2 getMinPlayers, `mpRcHasCaptain()`, DSD `hasCaptain` as function |
| `js/engine.js` | `lttp-tip-overlay` teardown in `resetToLobby()` |
| `index.html` | YGI/NAT how-to steps; YGI [?] tip; LTTP confirm [?] + tip overlay; DSD how-to title + Sonar Log; DSD duplicate id fix |
| `css/styles.css` | `@keyframes lttpTabPulse` + `.lttp-tab-badge` |
| `sw.js` | Bumped to v95 |
| `CLAUDE.md` | Phase + SW version updated |
| `.claude/rules/logic-engine.md` | SW version updated |
| `.claude/rules/ui-style.md` | How-to Overlay Standard section added |
| `docs/lttp-implementation-notes.md` | L3 root cause clarified, L4 flag added |
| `docs/dsd-implementation-notes.md` | `hasCaptain` function fix, duplicate id bug |
| `docs/ygi-implementation-notes.md` | How-to emoji flag |

---

## Deferred

- **LTTP play-again confirmation modal** — L4. Needs `lttp-new-plans-overlay` Decision Modal. Next LTTP audit.
- **JEC scoring balance + fun factor** — open design questions. Next design session.
- **How-to emoji missing (JEC, YGI, JEC)** — cosmetic, next pass.
- **LTTP "undefined's Phone" root cause** — defensive fallback in place; full root cause requires browser MDLM testing.
