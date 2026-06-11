# Phase 30 Snapshot — Group Therapy (GTH)

**Date:** June 2026
**Status:** Complete
**SW Version:** v97 (bumped from v96)

---

## Decision

Phase 30 ships Group Therapy (GTH) — a multiplayer-only simultaneous drawing + guessing party game. It is the ninth game in the Little Sylly Games suite and the first to introduce a live drawing mechanic.

---

## Rationale

GTH fills a gap in the game suite: all existing games are word-based (description, deduction, association). Drawing introduces a fundamentally different creative/comedic failure mode — the gap between what you intended to draw and what everyone else sees. The psychological disorder theme grounds the humour without requiring specialist knowledge.

GTH is multiplayer-only by design (MDLM). The core loop requires simultaneous, private drawing followed by anonymous diagnosis — a flow that is fundamentally broken in pass-the-phone mode.

---

## Technical Impact

### New files
| File | Purpose |
|------|---------|
| `js/lib/canvas-draw.js` | Shared drawing infrastructure — `window.CanvasDraw` global; stroke capture, delta encoding, render, tremor, blur |
| `js/games/gth.js` | GTH game plugin — full state + logic |
| `data/gth-data.json` | Disorder bank — 45 entries (15 per tier: Everyday Neuroses, Classic Phobias, Complex Conditions) |
| `docs/gth-content-guide.md` | Content creation guide for disorder entries |
| `docs/new-game-tech-group-therapy.md` | GTH technical spec (Phase 30 source of truth) |
| `docs/implementation-notes/gth-implementation-notes.md` | GTH bug log + design decisions |

### Modified files
| File | Change |
|------|--------|
| `js/engine.js` | Added 9 GTH screen IDs to `allScreens[]`; added GTH teardown to `resetToLobby()` |
| `js/engine-multiplayer.js` | Added GTH entry to `MP_GAME_CONFIGS`; added `mpSerialiseSettings('gth')` case; added `gthHandleEnvelope(env)` dispatch |
| `index.html` | GTH lobby button, 9 screens, 4 overlays, `<script>` tags for canvas-draw.js + gth.js — injected via Node.js script (`add-gth-html.js`, now deleted) |
| `css/styles.css` | Added `--color-gth-sage: #B1BCA0` CSS custom property; `pill-active-sage`; `game-toggle-on-sage`; GTH tremor custom properties |
| `sw.js` | Bumped to v97; added `js/lib/canvas-draw.js`, `js/games/gth.js`, `data/gth-data.json` to precache |
| `docs/code-map.md` | Added GTH section (screens, overlays, state vars, key functions, packet types) |
| `.claude/rules/game-identities.md` | Added Game 9: Group Therapy section |
| `.claude/rules/logic-engine.md` | Bumped SW version; updated precache list |
| `CLAUDE.md` | Updated current focus, SW version, gold master (9 games), key references, project structure |

---

## Architecture Notes

### Canvas module design
`CanvasDraw` is a global IIFE (`js/lib/canvas-draw.js`) — not an ES module — consistent with the project's no-module architecture. It uses the Pointer Events API for unified touch + mouse capture. Delta encoding (int8 deltas, stroke splitting on ±127 overflow) keeps Firebase payloads under 2KB per drawing.

**Non-negotiable constraint:** Tremor transform applies to `<div id="gth-canvas-wrapper">`, never to `<canvas id="gth-canvas">`. Pointer events register against the canvas's own coordinate system; translating the canvas itself would corrupt all delta values.

### Multiplayer-only architecture
GTH is the first `multiplayerOnly: true` game in the suite. The lobby button calls `mpShowModeScreen('gth')` directly. `rosterConfig: {type:'none'}` — lobby fills automatically from Firebase `/players` node; no manual seat assignment. `onPassThePhone` populates `gthPlayerCount` + `gthPlayerNames` from `mpPlayerSlots` and calls `gthShowMenu()` (host) or waits for `GTH_GAME_START` (client).

### Queue algorithm
Each drawing appears in exactly 2 player queues (never the artist's own). All disorder assignments and all queues are distributed in single broadcast payloads (`GTH_GAME_START` sends `allDisorders[][]`; `GTH_PHASE2_START` sends `allQueues[][]`). Each device extracts its own slice by `mpMyPlayerIdx`. UX-based couch security — sufficient for a same-room game.

### Phase 2 timer sync
`GTH_PHASE2_START` includes `endTimestamp: Date.now() + gthDiagnosisWindow * 1000`. All clients display countdown as `Math.ceil((endTimestamp - Date.now()) / 1000)`. Host's `gthStartPhase2Timer()` broadcasts `GTH_PHASE2_END` on expiry — this is the authoritative trigger for all devices to submit their diagnosis batches.

### Score resolution
All scoring runs on host after all `GTH_DIAGNOSES_SUBMIT` batches received (full `gthDiagnosesReady` readyCheck). Patient pts (+2 per correct Shrink), Shrink pts (+2 correct, +1 speed bonus per drawing, +1 tier-3 bonus). Results broadcast as `GTH_FINAL_SCORES` with both `scores[]` and `revealItems[]` for Big Reveal.

---

## Spec Deviations (from Phase 1 brief)

| # | Brief said | Shipped instead | Reason |
|---|-----------|----------------|--------|
| 1 | Between-disorders as a separate screen | Sub-state `'between'` within `screen-gth-disorder-reveal` | Saves a screen registration; identical UX |
| 2 | Private Firebase writes for disorder assignments | `allDisorders[][]` in GTH_GAME_START payload; each client extracts by `mpMyPlayerIdx` | Simpler; same-room couch security is sufficient |
| 3 | Private Firebase writes for Phase 2 queues | `allQueues[][]` in GTH_PHASE2_START payload | Same rationale as above |
| 4 | Custom CSS colour approach needed | `--color-gth-sage: #B1BCA0` in `:root`; `bg-[#B1BCA0]` Tailwind arbitrary value for buttons; `style="background-color:#B1BCA0"` inline fallback on lobby button | All standard Tailwind game colours were taken (9 games) |

---

## Gold Master State

**9 games complete + multiplayer:** LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy, Group Therapy
