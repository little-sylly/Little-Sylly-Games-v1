# DSD (Deep-Sea Deploy) — Implementation Notes

## Design Decisions

**Grid composition 9/8/4/4 — no bystander**
25 cells: 9 friendly / 8 enemy / 4 urchins / 4 mines. First team (determined by `showWhoFirst()`) gets 9 payloads. There are no bystander/neutral cells — every cell has a role. This makes grids more tense than Codenames-style games.

**`showWhoFirst()` — first production use**
DSD was the first game to call `showWhoFirst()` from `engine.js`. The function was confirmed working in production here before being referenced as the required pattern for all team games.

**Word curation filter at runtime**
`dsdBuildGame()` excludes `aussie_slang`, `pop_culture`, `people`, `brands` categories and any word containing a space. Hyphenated entries are kept. This filter runs at game start — not at data load time.

**Nuclear Mine — 2.6s delay before gameover**
`dsdValour[me] -= 1000` then `setTimeout(() => dsdShowGameover(), 2600)` — the delay allows `playAbyssThud()` to play out fully. This is a deliberate UX choice, not a workaround.

**Magnetic Drift (Sylly) — host-local, reflected in SYNC**
`dsdApplyDrift()` runs on the host locally, then the updated grid state is included in `SYNC: DSD_EXECUTION_RESULT`. Clients never run drift independently — they receive the already-drifted grid state from the host.

**Dynamic legend — updates per captain screen**
`dsdUpdateLegend()` is called on each captain screen open. Legend text is derived from current settings (`dsdHazardControl`, `dsdSyllyMode`, team names) — not hardcoded. Future games with context-sensitive legend text should use this pattern.

**Spectator screen (TLM)**
`screen-dsd-spectator` is a read-only crew-view grid + running clue history for the non-active team in TLM mode. Driven by `dsdShowSpectatorView()`. Only game in the suite with a spectator screen.

---

## Bug Index

**No entry sound on DSD lobby button (Phase 31 Round 3 — fixed)**
- Symptom: Tapping "Deep-Sea Deploy" on the main lobby made no sound.
- Root cause: `btn-dsd` listener called `updateSliderTheme('dsd')` and `dsdShowMenu()` but omitted `playLaunch()`. The `updateSliderTheme` call was itself redundant (now handled inside `openSoundOverlay()`).
- Fix: Added `playLaunch()` as the first line; removed the now-redundant `updateSliderTheme('dsd')` call.
- Lesson: Same as GTH/BLD — every lobby button must call `playLaunch()` before navigating.

**`hasCaptain` as function — MDLM captain pre-lobby fix (Phase 28)**
What happened: MDLM mode showed captain name input fields in the pre-lobby overlay even though no captain can be assigned before the roster is known (players join individually).
Root cause: `hasCaptain: true` in DSD's rosterConfig was a static boolean, always showing captain fields regardless of `mpLobbyStyle`.
Fix: Changed to `hasCaptain: () => window.mpLobbyStyle === 'team'` — only TLM mode shows captain fields pre-game. Added `mpRcHasCaptain(rc)` helper to engine-multiplayer.js to resolve function-or-bool values uniformly at all read sites.
Lesson: Any game config property that depends on `mpLobbyStyle` should be a function, not a static value. The engine now supports this via `mpRcHasCaptain()`.

**Duplicate `id` attribute on captain screen [?] button (Phase 28)**
What happened: `#btn-dsd-how-to` had `id="btn-dsd-how-to"` written twice on the same element.
Root cause: Copy-paste error — likely duplicated when wiring up the help button.
Fix: Removed the second `id` attribute. No functional impact (browsers use the first occurrence), but technically invalid HTML.

**Nuclear Mine never broadcasts `DSD_GAMEOVER` in Lobby Mode (audit June 2026)**
What happened: When a Nuclear Mine detonates (`dsdResolveHit()` mine branch, Danger Level = nuclear), the game ends via `setTimeout(() => dsdShowGameover(), 2600)` and returns `true` from `dsdResolveHit`, breaking the `dsdShowExecution()` loop. This path bypasses `dsdAdvanceTurn()` — the only function that broadcasts `SYNC: DSD_GAMEOVER`.
Root cause: Two separate game-end paths exist. Normal victory flows through `dsdAdvanceTurn()` → `dsdCheckVictory()` → broadcast. The Nuclear Mine instant-loss is terminal inside `dsdResolveHit` and was wired straight to `dsdShowGameover()` for the dramatic 2.6s delay, without a corresponding broadcast. The active crew device (host or client preview) shows gameover via its own local `setTimeout`, masking the gap for that device — but the non-active **spectator/standby device** only ever receives `DSD_EXECUTION_RESULT` (grid + −1000 Valour) and is then stranded on the spectator/execution screen with no `DSD_GAMEOVER` SYNC.
Lesson: Any terminal game-end path that bypasses the normal advance/victory function must replicate the `DSD_GAMEOVER` broadcast (host-side) before/around the `setTimeout`. When a game has more than one way to reach gameover, every path needs the SYNC, not just the common one.
Status: FIXED (June 2026). The Nuclear Mine branch in `dsdResolveHit()` now broadcasts `DSD_GAMEOVER` (valour + grid + turnLog) host-side, immediately before scheduling the local `dsdShowGameover()` `setTimeout` — mirroring the broadcast `dsdAdvanceTurn()` already makes on normal victory. The spectator/standby device now receives the full gameover state and navigates correctly.

---

## Multiplayer Lessons

**TLM captain routing**
Active team's Captain device shows full colour grid. Non-active team shows `screen-dsd-spectator` (TLM) or crew standby (MDLM). The routing split is in `dsdShowCaptain()` — check `window.mpLobbyStyle` and `dsdCurrentTeam` (vs `mpMyPlayerIdx`) to determine which view to show. (Function/variable names corrected June 2026 audit — this note previously read `dsdShowCaptainPhase()` and `bldCurrentTeam`, neither of which exists.)

**MDLM pre-game — separate team naming from captain assignment (Phase 28)**
The original MDLM setup combined team name entry with captain assignment before the roster was known. Changed so team names are entered before the lobby fills, and captain assignment is a separate step after all players have joined (roster visible). This is the correct UX for any MDLM game with team + role assignment.

---

## Template Gaps

**How-to overlay title must be "How to Play" (Phase 28)**
DSD used "Operations Manual ⚓" as the how-to overlay title block heading. Renamed to "How to Play ⚓" to match the universal standard. The subtitle can remain thematic. Added to ui-style.md as a hard rule: how-to title heading is always "How to Play [emoji]", never the game's internal name for the overlay.

**Clue log on active deployment (Phase 28)**
Added a collapsible Sonar Log strip on captain/crew screens showing the most recent entry, tapable to expand a full scrollable log. Any game with a running action history that could be relevant mid-round should use this collapsible-strip pattern rather than a full secondary screen.

**Spectator tap-to-peek (Phase 28)**
Added per-cell tap toggle on the spectator grid — cells show colour/icon by default, tap reveals the word temporarily. Useful for any spectator view where players need to recall what words were in play.
