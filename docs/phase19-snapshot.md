# Phase 19 Snapshot — Little Sylly Games
**Gold Master:** 8 games complete
**Date:** May 2026
**SW Version:** v77

---

## What Changed in Phase 19

**Added:** Deep-Sea Deploy (`js/games/dsd.js`) — Game 8

- 7 screens: `screen-dsd-menu`, `screen-dsd-setup`, `screen-dsd-captain`, `screen-dsd-crew`, `screen-dsd-execution`, `screen-dsd-sabotage`, `screen-dsd-gameover`
- 4 overlays: `dsd-settings-overlay`, `dsd-how-to-overlay`, `dsd-quit-overlay`, `dsd-confirm-disarm`
- Full-width 5×5 grid — breaks out of `max-w-sm` constraint; grid screens use `h-screen overflow-hidden flex flex-col`
- Asymmetric payload grid: 9 (first team) / 8 (second team) / 6 urchins / 1 mine / 1 bystander
- Sequential execution loop — crew selects ordered tiles, resolved one-by-one with audio feedback
- Hazard Control object: `{urchin, mine, enemy}` — each toggle controls turn-end only; penalty always applies
- Danger Level: Pressure Mine (−20 VP) or Nuclear Mine (−1000 VP + game over, 2.6s delay)
- 6 settings: Sea State (word tier), Danger Level, 3 hazard control toggles, Sylly Mode
- Sylly Mode (Mission Abyss): Magnetic Drift (shuffles unrevealed cells from deployment 2) + Jammer (sabotage tile, placed by second team after deployment 1)
- `showWhoFirst()` — DSD is the first production game to call this engine utility; first team gets 9 payloads
- 3 new engine audio functions: `playSonarPing()`, `playHullThud()`, `playAbyssThud()`
- `pill-active-cyan` added to `css/styles.css`
- SW bumped v75 → v77 with `js/games/dsd.js` precached

**Unchanged from Phase 17:** engine.js, li5.js, great-minds.js, secret-signals.js, jec.js, ygi.js, lttp.js, nat.js, secret-mode.js, data files, overlay patterns, PWA architecture

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
| 8 | Deep-Sea Deploy | `js/games/dsd.js` | `cyan-700` | 7 | 4 |

**Total screens:** ~74 (excluding shared engine screens)
**Total overlays:** ~49

---

## Architecture (unchanged)

- **SPA:** single `index.html`, all screens registered in `allScreens[]` in `engine.js`
- **Plugin split:** engine owns audio/routing/reset; each plugin owns its own state + listeners
- **Overlay patterns:** exactly 2 — Data slide-up (`overlay-data-backdrop`) + Decision modal (`overlay-modal-backdrop`)
- **Audio:** Web Audio API only — synthesised tones, no audio files
- **PWA:** Service Worker v77, cache-first strategy, all assets precached
- **Secret Mode:** Konami gateway → Terminal → expansion proxy; any game can read `window.activeExpansionOverrides`
- **Word bank:** `data/words.json` (~433 words, 16 categories); `data/secret_words.json` (Dota 2 expansion); `data/ygi-data.json` (55+ prompts)
- **Load order:** `engine.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `secret-mode.js` → `app.js`

---

## Key Design Decisions (Phase 19)

- **Role encoding as integers:** Grid cell roles stored as `0`/`1` (team indices), not strings. This makes `cell.role === dsdCurrentTeam` work correctly even when team names are customised. Urchin/mine/bystander stored as strings since they have no team mapping.
- **Hazard Control object pattern:** Three independent toggles in one object (`dsdHazardControl`) rather than three separate variables. Reads as `dsdHazardControl.mine` — self-documenting and reduces variable clutter.
- **Sequential reveal (not simultaneous):** Crew's sequence resolves tile-by-tile with delay, not all at once. Creates tension and allows turn-enders to break the loop mid-sequence. The async loop + `dsdDelay()` pattern is reusable for any future timed reveal mechanic.
- **Full-width grid layout:** Captain and crew screens break out of the `max-w-sm` constraint used everywhere else. Grid uses `h-screen overflow-hidden flex flex-col` with the grid container as `flex-1 min-h-0`. This gives ~74×52px cells on a 390px screen — above the 44px touch threshold.
- **`showWhoFirst()` first production use:** DSD is the first game to exercise the engine's team-order utility. The onResult callback sets `dsdFirstTeam` and triggers `dsdBuildGame()` — the grid can't be built until team order is known (role counts are asymmetric).
- **Jammer placing team bug fix:** `dsdAdvanceTurn()` saves `const justFinished = dsdCurrentTeam` before switching teams. The sabotage screen is triggered with `justFinished` (the team that just played), not `dsdCurrentTeam` (which has already been updated to the next team).
- **`grid.onclick` assignment for sabotage:** `dsdRenderSabotageGrid()` uses `grid.onclick = fn` (not `addEventListener`) to prevent handler stacking across re-renders of the same element.
- **Nuclear mine UX:** The execution loop breaks immediately (`return true`), so `dsdShowExecutionResult` briefly shows before the 2.6s gameover delay. This is intentional — the `playAbyssThud()` sound (2.5s) needs to complete before the screen transitions.

---

## Next Horizon (Phase 20+)

- New game concept TBD
- Possible new expansion pack for Secret Mode
- DSD could benefit from: animated tile reveals, deployment progress bar, Captain/Crew name display in header
- See `.claude/rules/new-game-template.md` for the brief format when starting a new game
