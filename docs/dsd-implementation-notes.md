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

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

**TLM captain routing**
Active team's Captain device shows full colour grid. Non-active team shows `screen-dsd-spectator` (TLM) or crew standby (MDLM). The routing split is in `dsdShowCaptainPhase()` — check `mpLobbyStyle` and `bldCurrentTeam` to determine which view to show.

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
