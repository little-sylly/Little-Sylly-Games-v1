# Implementation Notes — Group Therapy (GTH)

## Design Decisions

1. **Between-disorders as sub-state (not a screen)** — The "Between disorders" transition (brief "Issue N of M" view before each new disorder) is implemented as `gthDisorderSubState = 'between'` on `screen-gth-disorder-reveal`, not a separate screen. Saves one `allScreens[]` registration; same UX.

2. **Custom CSS variable for brand colour** — GTH is the first game to use a custom CSS variable (`--color-gth-sage: #B1BCA0`) for branding instead of a Tailwind utility class. All Tailwind game colours were already taken. The variable is isolated in `:root` and drives `pill-active-sage` and `game-toggle-on-sage` CSS classes.

3. **Canvas wrapper constraint (non-negotiable)** — The Stroke or Genius tremor applies `transform: translate()` to `<div id="gth-canvas-wrapper">`, NEVER to `<canvas id="gth-canvas">`. Applying transform to canvas itself offsets pointer events from the canvas coordinate system, corrupting delta-encoded stroke data. This is a hard constraint.

4. **Delta-encoded drawing format** — Drawing data stored as `{ w, h, s: [[x0,y0,dx1,dy1,...], ...] }` with deltas clamped to int8 range. Strokes > 127px jump auto-split. Typical size 1–2 KB per drawing. Chosen for Firebase RTDB size efficiency.

5. **Multiplayer-only design** — GTH is multiplayer-only (no pass-the-phone fallback). `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `rosterConfig: { type: 'none' }`. Mirrors BLD pattern.

6. **Phase 2 timer via endTimestamp** — `GTH_PHASE2_START` carries `endTimestamp: Date.now() + gthDiagnosisWindow * 1000`. All clients compute countdown locally. `GTH_PHASE2_END` is host-authoritative trigger for diagnosis submission. Avoids drift from separate per-device timers.

7. **Queue algorithm: exactly 2 appearances per drawing** — Each drawing assigned to exactly 2 player queues (never artist's own). Gives `gthDisordersPerPatient × 2` drawings per queue at any player count. Clean and predictable.

8. **Speed bonus via timestamp batch** — Diagnoses accumulate locally with `timestamp: Date.now()`. Submitted as a batch in `GTH_DIAGNOSES_SUBMIT`. Host sorts by timestamp to find fastest correct diagnosis per drawing. Deterministic regardless of Firebase message arrival order.

9. **Big Reveal: host-controlled** — Host taps "Next Case →" to broadcast `GTH_REVEAL_NEXT`. Gives group time to react and laugh. Auto-advance rejected as too mechanical for the social payoff moment.

10. **Drawing module as shared infrastructure** — `js/lib/canvas-draw.js` is designed as a reusable module (global `window.CanvasDraw`), not embedded in gth.js. Future drawing-based games can reuse it without changes.

**Phase 30 (D–F) Decisions:**

- **Disorder assignment as IDs in broadcast:** GTH_GAME_START broadcasts `allDisorders` as arrays of IDs (not full objects). Clients resolve IDs against their locally-loaded `gthAllDisorders` bank. Avoids duplicating large JSON objects in Firebase payload.

- **Queue distribution in single payload:** GTH_PHASE2_START broadcasts `allQueues[][]` (all queues indexed by playerIdx) rather than writing to per-player Firebase private slots. Simpler; UX-level couch security is sufficient for same-room game. Each client extracts `payload.allQueues[mpMyPlayerIdx]`.

- **Canvas tremor on wrapper div only:** `CanvasDraw.setTremor()` applies CSS translate to `<div id="gth-canvas-wrapper">`, never to `<canvas id="gth-canvas">`. Pointer events register against the untransformed canvas coordinate system; applying transform to canvas itself corrupts delta-encoded stroke deltas.

- **gthAllDiagnoses as host-only accumulator:** Diagnoses are accumulated in `gthAllDiagnoses = { playerIdx: diagnoses[] }` on the host only. Not synced to clients. Score resolution runs entirely on host and is broadcast as `GTH_FINAL_SCORES`.

- **Between-disorder transition as sub-state:** `screen-gth-disorder-reveal` handles both `'preview'` and `'between'` sub-states via `gthDisorderSubState`. No separate screen registered. Saves a screen entry in `allScreens[]`.

**Phase 31 Decisions:**

- **Data schema rehaul — category + difficulty axes:** Original schema used `tier` (1=Everyday Neuroses, 2=Classic Phobias, 3=Complex Conditions) — a single axis that coupled category and difficulty. New schema separates them: `category` (phobia / neurosis / condition) and `difficulty` (1 / 2 / 3) are independent. Rationale: same-category decoy generation produces thematically coherent multiple-choice cards; difficulty=3 bonus scoring is more intuitive than tier-3; content creation is clearer with 5 entries per category × 3 levels = 45 total, evenly distributed. `gthPickDecoys()` simplified to category-only fallback (no tier/difficulty matching needed). All `d.tier` references in gth.js changed to `d.difficulty`. Pool filter values changed to `'episodic'` / `'recurrent'` / `'refractory'`. Default `gthDifficultyMix` changed to `'recurrent'`.

- **Settings overlay rehaul — institutional psychiatry vocabulary:** All settings renamed to match the game's theme: "Inpatient Admission Form 📋" (title), "Reportable Symptoms" (disorder count), "Expression Window" (drawing time), "Symptom Severity" (difficulty pool: Episodic / Recurrent / Refractory), "Psychiatric Evaluation" (Deep Dive toggle). Disorder count options changed from 2/3/4 → 3/4/5 (3 is the minimum meaningful session load for a 4+ player game; 2 felt sparse). Tips changed from explicit drawing instructions to atmospheric dry-humour nudges ("Eight legs is exactly seven too many.") — goal is to nudge without prescribing, keeping drawings varied and the guessing phase interesting.

## Bug Index

**Bug: No entry sound on GTH lobby button (Phase 31 Round 3 — fixed)**
- Symptom: Tapping "Group Therapy" on the main lobby made no sound, while all other game lobby buttons played `playLaunch()`.
- Root cause: The `btn-gth` listener set `activeGameId` and called `showScreen` but never called `playLaunch()`. The listener was added late (DOMContentLoaded block rather than top-level) during the Phase 31 Round 1 menu-routing fix, and the audio call was omitted.
- Fix: Added `playLaunch()` as the first line of the `btn-gth` listener.
- Lesson: Every lobby button listener must call `playLaunch()` before `activeGameId` and navigation. The checklist item "Wire lobby button → game menu screen" was interpreted as navigation-only — audio is equally required.

**Bug: Sound slider not themed on GTH menus (Phase 31 Round 3 — fixed)**
- Symptom: Opening the sound overlay from the GTH menu showed the stone (grey) gradient instead of sage, even though `gth-range` CSS and the map entry in `updateSliderTheme` were both present.
- Root cause: `openSoundOverlay()` in `engine.js` never called `updateSliderTheme()` — it only showed the overlay. Working games (e.g. GM) happened to call `updateSliderTheme()` at game entry so the class was already set. GTH correctly set `activeGameId = 'gth'` in the lobby listener but never updated the slider class.
- Fix: Added `updateSliderTheme(activeGameId)` as the first line of `openSoundOverlay()` in `engine.js`. Applies to all games universally — no per-game calls needed.
- Lesson: `openSoundOverlay()` must always sync the slider to `activeGameId` at open time. Don't rely on per-game entry calls — the overlay is the authoritative sync point.

**Bug: btn-gth bypassed game menu (Phase 31 Round 1 — fixed)**
- Symptom: Tapping "Group Therapy" on the main menu went directly to the multiplayer host lobby, skipping `screen-gth-menu`. Settings and How to Play were inaccessible before committing to a session.
- Root cause: Implementation error. The `logic-engine.md` new-game checklist explicitly states "Wire lobby button → game menu screen (not directly into setup)." The Phase 30 implementer wired `btn-gth` directly to `mpShowModeScreen('gth')`, incorrectly assuming the game menu could be skipped for a multiplayer-only game. Additionally, `btn-gth-menu-play` was wired to `gthStartSession()` — correct for the post-lobby context (when `onPassThePhone` fires and shows the menu again for the host) but missing the branching needed for the pre-lobby context.
- Fix: `btn-gth` → `showScreen('screen-gth-menu')`. `btn-gth-menu-play` branches on `syllyMultiplayerMode`: if `!== 'single'` → `gthStartSession()`; if `=== 'single'` → `mpShowModeScreen('gth')`.
- Lesson: Dual-context routing for MDLM-only game menus documented as a pattern in `logic-engine.md` MDLM Patterns section.

**Bug: Active settings pills rendered as unstyled boxes (Phase 31 Round 1 — fixed)**
- Symptom: Tapping any settings pill activated the correct value internally but rendered the selected pill as an unstyled rectangular box (no background colour, no border-radius, no padding).
- Root cause: Implementation error + documentation gap. `gthSyncSettingsUI` used `p.classList.toggle('pill', !isActive)` which removed the `.pill` base class from active pills, leaving only `.pill-active-sage`. The `pill-active-*` CSS classes only define `background-color` and `color` — all structural styles (border-radius, padding, flex, font-size) live in `.pill`. Removing `.pill` = unstyled box. The `ui-style.md` pill pattern described the two states ("Inactive: `.pill` | Active: `pill-active-[colour]`") but didn't show the toggle code, so the implementer treated them as mutually exclusive.
- Fix: Never remove `.pill`. Only add/remove `.pill-active-[colour]`. Applied in both `gthSyncSettingsUI` and the pill click handler.
- Lesson: Explicit pill toggle code pattern added to `ui-style.md`.

**Bug: Phase 2 timer fired before host could click through shrink-intro (live test — fixed)**
- Symptom: All 4 devices showed "Diagnosed 0 of N cases" on the Case Report screen — nobody had diagnosed anything.
- Root cause: `gthKickOffPhase2()` computed `endTimestamp = Date.now() + window` and called `gthStartPhase2Timer()` immediately. `GTH_PHASE2_START` carried the timestamp to clients who also started their timer instantly. The 90-second window expired while all devices were still reading the Shrink Phase intro screen.
- Fix: Removed timestamp and timer start from `gthKickOffPhase2()`. Added `GTH_PHASE2_BEGIN` SYNC packet — host computes `endTimestamp` and broadcasts it when tapping "Open the Case Files →". All devices start the timer on receiving/sending `GTH_PHASE2_BEGIN`.
- Lesson: Any screen that serves as a gate before timed gameplay must own the timestamp computation. Compute `endTimestamp` at the moment the gate is passed, not at queue-build time.

**Bug: Shrink-intro was not a host-only gate — clients could self-advance (live test — fixed)**
- Symptom: Any client device could tap "Open the Case Files →" independently, starting diagnosis before the host had clicked through.
- Root cause: `btn-gth-shrink-start` had no `syllyMultiplayerMode` guard; all devices received the same HTML with the button visible.
- Fix: `gthShowShrinkIntro()` now hides the button and shows "Waiting for the host to open the files…" on client devices. The listener has a `syllyMultiplayerMode !== 'host'` early-return guard.
- Lesson: Any intro/gate screen before a timed phase must be host-only in MDLM. Client-visible "start" buttons on shared-screen designs are a consistent source of premature advancement.

**Bug: Queue case count was uneven (5 / 6 / 6 / 7 instead of 6 / 6 / 6 / 6) (live test — fixed)**
- Symptom: Players received different numbers of cases despite the design intent of `gthDisordersPerPatient × 2` per player.
- Root cause: The "pick 2 lightest-loaded" heuristic used Fisher-Yates shuffle then sorted by queue length. Random tie-breaking during sort could consistently favour some players over others, producing ±1 variance.
- Fix: Replaced with a per-artist round-robin. For each artist's drawings, shuffle the eligible player list once, then assign drawing `i` to `eligible[(i*2) % len]` and `eligible[(i*2+1) % len]`. For N=4, D=3: each eligible player gets exactly 2 drawings from each artist = exactly 6 total. Exact equality guaranteed when `D×2` is divisible by `N−1`.
- Lesson: Implementation note #7 claimed the algorithm gave exact `D×2` per player but the heuristic didn't enforce it. When a design note promises exact counts, the algorithm must prove it — not approximate it.

**Bug: Case-screen `[?]` button is dead — How to Play unreachable in MDLM (June 2026 audit — logged, not yet fixed)**
- Symptom: Tapping `[?]` on the Case (Shrink Phase) screen does nothing.
- Root cause: The Case screen's help button has id `btn-gth-how-to-case`, but `gth.js` only wires `btn-gth-how-to` (the disorder-reveal screen's button). No listener exists for `btn-gth-how-to-case`. Worse, `screen-gth-disorder-reveal` (which carries the working `[?]`) is only shown on the single-device dev path — MDLM routes Patient Intake → Canvas → Case directly, so the dead `[?]` on the Case screen is the only help button a player can reach in real play.
- Fix: Add a `btn-gth-how-to-case` listener mirroring `btn-gth-how-to` (scroll-reset + show `gth-how-to-overlay`).
- Lesson: When a screen exists in two routing contexts (single-device vs MDLM) and only one is reachable in production, the `[?]` audit must check the *reachable* screen's button, not just "a `[?]` exists somewhere". Two header help buttons sharing one overlay should share one id or both be wired.
- Logged: fix plan [BUG] GTH — Case-screen `[?]`.

**Bug: `gth-case-report-progress` container never populated (June 2026 audit — logged, not yet fixed)**
- Symptom: The Case Report screen reserves a per-player progress area that always renders empty.
- Root cause: `#gth-case-report-progress` ("Per-player progress dots") has no writer — `gthShowCaseReport()` only fills `gth-case-report-stats` + `gth-case-report-time`.
- Fix: Either populate it (mirror `gthUpdateWaitingProgress` using `gthDiagnosesReady`) or remove the dead div.
- Logged: fix plan [POLISH] GTH — case-report-progress.

## Multiplayer Lessons
(reference BLD implementation notes for additional patterns)

## Template Gaps

- **Drawing module not in new-game-checklist:** Future games that include drawing mechanics should reference `canvas-draw.js`. The checklist in `logic-engine.md` and `new-game-technical-template.md` does not mention this. Consider adding a `[ ] If game uses drawing: wire CanvasDraw.init() on canvas screen entry; verify tremor targets wrapper div not canvas element` item.

- **Multiplayer-only game lobby routing (RESOLVED — Phase 31):** The lobby button and Play CTA dual-context pattern for `multiplayerOnly: true` games is now documented in `logic-engine.md` MDLM Patterns. The new-game checklist rule "Wire lobby button → game menu screen" applies to all games including multiplayer-only ones.
