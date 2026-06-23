# Phase 35 Snapshot — Counting Sheep (SHP)

**Game 15.** O'NO-99-style climbing/survival card game. MDLM-only (3–8 players), host-authoritative, host-as-participant. Sylly Mode = Night Terrors (oscillating Climb ⇄ Plunge). SW bumped **v113 → v114**.

## Decision
Built Counting Sheep end-to-end from the confirmed spec (`docs/new-game-tech-counting-sheep.md`), with the Sleepwalker ghost rework and Night Terrors both folded into v1 per the owner's direction.

## What shipped
- **Foundation:** `js/games/shp.js`; 3 screens + 5 overlays (Node-script inserted, ASCII entities — no mojibake); lobby `#btn-shp`; `MP_GAME_CONFIGS.shp`; `allScreens[]` + `resetToLobby()` + slider/mute maps; `pill-active-indigo` / `game-toggle-on-indigo` / `shp-range` CSS + `.shp-card` family.
- **Deck + render seam:** `SHP_CARDS` (14 incl. id 13 Fogged Dream phantom), `SHP_DECK_COUNTS` (62), `SHP_NIGHTMARES` (5 weighted); `shpRenderCard` asset-pack seam; `shpBuildFlock`/`shpDrawUp` (Wolf trap).
- **Core loop:** deal → play (single + Heavy-Eyelids two-card) → all card effects → draw-up → advance (direction/reverse/leader) → Deep Sleep (stuck or busted gamble) → redeal → Daybreak. Packets `SHP_DEAL` / `SHP_PLAY` / `SHP_TURN_RESULT` / `SHP_DEEP_SLEEP` / `SHP_GAMEOVER`.
- **Ghost system (Sleepwalkers):** Pasture-triggered meter (post-first-elimination), facedown 3-of-5 weighted Nightmare Lottery, turn-gate resolution, five nightmares (Cold Feet / Restless Leg / Fog cursed-swap / Sleep Paralysis / Global Echo). Packets `SHP_GHOST_READY` / `SHP_DISRUPT` / `SHP_DISRUPT_RESOLVED`.
- **Night Terrors (Plunge):** overflow runway (`shpCeiling = shpHerd`), arithmetic sign-flip via single-source `shpHerdAfterCard`, ceiling descent (`shpDrop` 7) after a one-cycle grace, bust→revert, mercy backstop (Herd 0), crimson re-skin + inverted faces. Phase rides in `SHP_TURN_RESULT`.

## Verification
- All files pass `node --check`.
- **Headless simulation harness** (vm-loaded plugin, stubbed DOM/engine) auto-played:
  - 200 base-loop games → caught & fixed the **Wolf-deal bug** (draw-trap aborted the multi-card deal; fix: `continue` not `break`).
  - 300 ghost games → all 5 nightmares fire; Fog confirmed rarest (weighting works).
  - 400 Night-Terrors games → overflow runway held (ceiling ≥99 at every entry), bust + mercy exits both exercised, all terminate with valid standings.
- **NOT yet verified:** browser visual/UX pass (DOM rendering, mobile layout) — owner to confirm.

## Rationale highlights (full log in `docs/implementation-notes/shp-implementation-notes.md`)
- Single-source herd math (`shpHerdAfterCard`) made the Plunge sign-flip a one-line change.
- Legality generalised to resulting-Herd for all card kinds (handles Cold Feet / falling ceiling for free).
- Fresh full 62-card deck each Night (cleaner than gather-and-reshuffle).
- Ghost disruptions resolve synchronously at the turn-gate (no async buffer).

## Resolved post-snapshot (same session)
- **Browser visual pass** — owner did a playthrough; looks good (polish noted for later).
- **MDLM mid-game quit** — PASS contract now wired: client `SHP_PLAYER_LEFT` → host `SHP_MATCH_DISSOLVED` → all `resetToLobby()`; host quit broadcasts `HOST_END_GAME`.
- **ui-style drift** — NT + FRT rows added to all six ui-style.md tables (range/toggle/how-to/pill/brand/CTA) alongside SHP.
- **Table centering** — `screen-shp-table` converted from the `h-screen` sticky-footer split to the Centered Content Layout (section-level `flex items-center justify-center` + single column, `my-auto` removed) — the FRT BUG-02 solution, now the default for game screens going forward.

## Deferred / follow-ups
- **Ghost-pick has no auto-resolve timer** — AFK Sleepwalker can stall (template gap logged).
- Playtest dials: `shpMeterFill` (3), `shpDrop` (7), grace length, nightmare weights.
- General UI polish (owner-noted during playthrough).

## Docs updated
`docs/code-map.md`, `game-identities.md` (Game 15), `CLAUDE.md` (structure/load-order/focus/refs), `logic-engine.md` (SW v114 + precache), `definitions.md` (15 prefixes), `ui-style.md` (6 tables), `docs/content-prompts/new-game-brief-prompt.md` (roster/taken/Sylly), `docs/implementation-notes/shp-implementation-notes.md`, `sw.js` (v114 + precache).
