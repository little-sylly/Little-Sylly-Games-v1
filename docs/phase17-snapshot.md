# Phase 17 Snapshot — Little Sylly Games
**Gold Master:** 7 games complete
**Date:** May 2026
**SW Version:** v75

---

## What Changed in Phase 17

**Added:** Natural Selection (`js/games/nat.js`) — Game 7

- 9 screens: `screen-nat-menu`, `screen-nat-setup`, `screen-nat-handover`, `screen-nat-observation`, `screen-nat-daily-review`, `screen-nat-selection`, `screen-nat-last-stand`, `screen-nat-tally`, `screen-nat-gameover`
- 3 overlays: `nat-settings-overlay`, `nat-how-to-overlay`, `nat-quit-overlay`
- Animals word pool from `words.json` — hierarchical `nono_list` (Broad Shield at index 0)
- 7 settings: Habitats (matches), Days Per Habitat, Field Difficulty, Voting Mode, Scientific Integrity, Escape Points, Sylly Mode
- Sylly Mode: Survival of the Fittest — no Lead Biologist, sealed journals, Daily Review screen
- Scientific Integrity: peer-review dispute mechanic (`natDispute()`)
- SW bumped v74 → v75 with `js/games/nat.js` precached

**Unchanged from Phase 16b:** engine.js, li5.js, great-minds.js, secret-signals.js, jec.js, ygi.js, lttp.js, secret-mode.js, data files, overlay patterns, PWA architecture

---

## Complete Game Roster

| # | Game | Plugin | Brand | Screens | Overlays |
|---|------|--------|-------|---------|----------|
| 1 | Like I'm Five | `js/games/li5.js` | `pink-500` | 5 | 8 |
| 2 | Great Minds | `js/games/great-minds.js` | `violet-500` | 8 | 11 |
| 3 | Secret Signals | `js/games/secret-signals.js` | `teal-500` | 17 | 6 |
| 4 | Just Enough Cooks | `js/games/jec.js` | `amber-500` | 7 | 5 |
| 5 | You Get It? | `js/games/ygi.js` | `orange-500` | 11 | 4 |
| 6 | Late to the Party | `js/games/lttp.js` | `red-500` | 10 | 8 |
| 7 | Natural Selection | `js/games/nat.js` | `lime-600` | 9 | 3 |

**Total screens:** ~67 (excluding shared engine screens)
**Total overlays:** ~45

---

## Architecture (unchanged)

- **SPA:** single `index.html`, all screens registered in `allScreens[]` in `engine.js`
- **Plugin split:** engine owns audio/routing/reset; each plugin owns its own state + listeners
- **Overlay patterns:** exactly 2 — Data slide-up (`overlay-data-backdrop`) + Decision modal (`overlay-modal-backdrop`)
- **Audio:** Web Audio API only — synthesised tones, no audio files
- **PWA:** Service Worker v75, cache-first strategy, all assets precached
- **Secret Mode:** Konami gateway → Terminal → expansion proxy; any game can read `window.activeExpansionOverrides`
- **Word bank:** `data/words.json` (~433 words, 16 categories); `data/secret_words.json` (Dota 2 expansion); `data/ygi-data.json` (55+ prompts)
- **Load order:** `engine.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `secret-mode.js` → `app.js`

---

## Key Design Decisions (phase 17)

- **animals `nono_list[0]` = Broad Shield (Documentary Label):** Natural language common grouping (e.g. "Sea Creature", "Furry Animal") — used as The Mole's information in Natural Selection. Must NOT be a scientific class name.
- **Voting Mode split:** consensus (shared tally, all non-mole score) vs independent (pass-the-phone, only correct voters score) — avoids "free rider" feel in larger groups
- **Scientific Integrity (peer-review):** dispute mechanic adds a social deduction layer without changing core eviction logic
- **natEscapePoints configurable:** allows groups to tune Mole advantage vs field researcher incentive

---

## Next Horizon (Phase 18+)

- New game concept TBD
- Possible new expansion pack for Secret Mode
- UI consistency audit (mobile vertical centering, thumb zone review)
- See `.claude/rules/new-game-template.md` for the brief format to use when starting a new game
