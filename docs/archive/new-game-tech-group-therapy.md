# New Game Technical Spec — Group Therapy
**Document type:** Phase 2 — Technical Specification
**Phase 1 brief:** `docs/new-ideas/new-game-brief-group-therapy.md`
**Who filled this in:** Claude Code — Phase 30 planning session, June 2026
**Status:** CONFIRMED — implementation may begin

---

## Consistency Audit

| Check | Finding |
|-------|---------|
| Terminology collisions | ✅ Clear — "Patient", "Shrink", "Disorder", "Case", "Sessions", "Waiting Room", "Case Files" unused across all 8 existing games |
| Brand colour `pill-active-sage` | ⚠️ Does not exist — must add. All standard Tailwind game colours taken (pink, purple, teal, amber, orange, red, lime, cyan, yellow). GTH uses a **custom CSS variable** `--color-gth-sage: #B1BCA0` added to `:root` in `css/styles.css`. `pill-active-sage` and `game-toggle-on-sage` classes must also be created. |
| Abbreviation `gth` prefix | ✅ Clear — unused in all JS files and game configs |
| Screen IDs `screen-gth-*` | ✅ Clear — no conflicts in `allScreens[]` |
| New data file | ✅ `data/gth-data.json` — new schema; not reusable from `words.json`. Content guide: `docs/gth-content-guide.md` |
| Engine functions reusable | `normaliseWord()` — used for Deep Dive text matching. `showWhoFirst()` — not applicable (no teams). Pass-gate pattern — not applicable (multiplayer-only; no private role reveals requiring handover). |
| Drawing module | ⚠️ `js/lib/canvas-draw.js` does not exist — must be built as Phase 30 infrastructure before GTH plugin. Full API specced in §2. |

**Flags:**
- GTH is the first game to use a custom CSS variable for branding. The pattern is isolated and self-contained — no impact on existing games.
- GTH is the first game to use `js/lib/canvas-draw.js`. The module must be load-order-registered in `index.html` and added to `sw.js` precache.
- SW version must be bumped to v97 when GTH assets are added.

---

## §1 — Identity

| Field | Value |
|-------|-------|
| Full name | Group Therapy |
| Short ID / abbreviation | `gth` |
| Plugin file | `js/games/gth.js` |
| Brand colour | `#B1BCA0` — Muted Sage. Custom CSS variable `--color-gth-sage: #B1BCA0` in `:root` of `css/styles.css`. **Never use raw hex inline.** |
| Active pill class | `pill-active-sage` — must be created in `css/styles.css` using `var(--color-gth-sage)` |
| Toggle class | `game-toggle-on-sage` — must be created in `css/styles.css` |
| Lobby button ID | `#btn-gth` |
| Play CTA label | "Start the Session 🛋️" |
| Menu screen tagline | "We've all got issues. Now draw them." |
| Multiplayer-only | `true` — no pass-the-phone fallback |

---

## §2 — Drawing Module (New Infrastructure)

**File:** `js/lib/canvas-draw.js`
**Load order:** After `engine.js`, before any game plugin. Add `<script src="js/lib/canvas-draw.js">` in `index.html` and add `'js/lib/canvas-draw.js'` to `sw.js` precache.
**Architecture:** Global object `window.CanvasDraw` — no ES modules, consistent with project architecture.

### API

```js
CanvasDraw.init(canvasEl, options)
// Attaches touch + mouse pointer event listeners to canvasEl.
// options.onStrokeEnd: callback fired after each completed stroke (pointerup).
// Returns CanvasDraw (chainable).

CanvasDraw.clear()
// Clears canvas pixel data and resets internal stroke buffer to [].

CanvasDraw.lock()
// Detaches all event listeners. Returns serialised DrawingData object. Idempotent.

CanvasDraw.render(canvasEl, data, options)
// Replays DrawingData onto canvasEl. canvasEl must be sized to data.w × data.h.
// options.lineWidth (default 3), options.strokeStyle (default '#1c1917').
// CSS scaling is the caller's responsibility.

CanvasDraw.setTremor(wrapperEl, enabled)
// enabled=true: starts a setInterval every 1500ms that applies
//   transform: translate(randX, randY) to wrapperEl (NOT to the canvas).
//   randX/Y are random values in [−5px, +5px].
// enabled=false: clears interval, resets transform to none.
// Tunable via CSS custom properties --gth-tremor-max (default 5) and
// --gth-tremor-interval (default 1500) — values in px and ms respectively.

CanvasDraw.setBlur(canvasEl, durationMs)
// Sets filter: blur(5px) on canvasEl, then starts CSS transition to blur(0px)
// completing after durationMs milliseconds.
// Client-side only. Zero Firebase involvement.
```

### Drawing Data Format (delta-encoded strokes)

```json
{
  "w": 320,
  "h": 320,
  "s": [
    [x0, y0, dx1, dy1, dx2, dy2, ...],
    [x0, y0, ...]
  ]
}
```

- `w`, `h`: canvas pixel dimensions at capture time. Used by `render()` for correct scaling.
- `s`: array of strokes. Each stroke is `[startX, startY, delta1X, delta1Y, ...]`.
- All deltas are clamped to the int8 range (−127 to 127). Strokes with jumps > 127px split automatically into a new stroke segment.
- Serialised as `JSON.stringify(data)` — typical size 1–2 KB per drawing.

### Canvas Wrapper — Non-Negotiable Constraint

The tremor `transform: translate()` must be applied to a **`<div id="gth-canvas-wrapper">`** surrounding `<canvas id="gth-canvas">`, **never to the `<canvas>` element itself.**

**Why:** Applying `transform` to `<canvas>` offsets the visual position without moving the canvas coordinate system. Pointer events register against the transformed visual position but `getPointerPosition()` reads raw canvas coordinates — every recorded stroke point is shifted by the tremor offset, corrupting the delta-encoded data. The wrapper approach is cosmetically identical but leaves the coordinate system intact.

```html
<!-- Correct structure — always use this pattern -->
<div id="gth-canvas-wrapper">
  <canvas id="gth-canvas" width="320" height="320"
    class="w-full aspect-square touch-none"></canvas>
</div>
```

---

## §3 — State Flow

```
LOBBY (screen-mp-lobby-host / screen-mp-lobby-join)
→ GTH MENU             (screen-gth-menu)
→ [Phase 1 — Patient Phase, all players simultaneously]
    DISORDER REVEAL    (screen-gth-disorder-reveal)    ← reused per disorder; 'preview' sub-state
    CANVAS             (screen-gth-canvas)              ← drawing; 'between' sub-state on reveal after submit
    ← repeat gthDisordersPerPatient times →
    WAITING ROOM       (screen-gth-waiting-room)        ← passive; Firebase-backed progress
→ SHRINK INTRO         (screen-gth-shrink-intro)        ← Phase 2 announcement; tap to confirm
→ [Phase 2 — Shrink Phase, all players simultaneously]
    CASE               (screen-gth-case)                ← reused per case in queue
    OR CASE REPORT     (screen-gth-case-report)         ← shown if queue exhausted before timer
    ← shared timer (endTimestamp) counts down; GTH_PHASE2_END broadcast on host expiry →
→ BIG REVEAL           (screen-gth-big-reveal)          ← host-controlled; GTH_REVEAL_NEXT per tap
→ FINAL REPORT         (screen-gth-final-report)
```

### Sub-states within `screen-gth-disorder-reveal`

`gthDisorderSubState` drives which content is shown within the same screen:

| Sub-state | What shows | CTA |
|-----------|-----------|-----|
| `'preview'` | Disorder name + definition + tip | "Ready to Draw" |
| `'between'` | "Issue N of M" + next disorder name + tip | "Draw Next" |

The `'between'` sub-state appears after a drawing is submitted when more disorders remain. When the last disorder is submitted, the device transitions directly to `screen-gth-waiting-room`.

This is a **spec deviation from the brief's §11 screen list** — the brief listed "Between disorders" as a separate screen. Implemented as a sub-state to avoid an unnecessary screen registration. (See §18.)

### Phase 2 Timer Synchronisation

- Host includes `endTimestamp: Date.now() + gthDiagnosisWindow * 1000` in `GTH_PHASE2_START` payload.
- All clients display a countdown computed as `Math.max(0, gthPhase2EndTimestamp - Date.now())` in a `setInterval`.
- Host fires its own timer. On expiry, Host broadcasts `GTH_PHASE2_END`.
- `GTH_PHASE2_END` is the authoritative trigger. All devices that haven't yet submitted their diagnoses do so immediately (guarded by `if (!gthDiagnosesSubmitted)`).
- Host waits for all `GTH_DIAGNOSES_SUBMIT` ACTIONs (full `gthDiagnosesReady` readyCheck), then calls `gthResolveScores()`.

### Pass-gate screens

None required — multiplayer-only game. Disorders are assigned privately via Firebase writes to each player's private slot. No pass-the-phone handovers.

### `showWhoFirst()` usage

Not applicable — GTH has no teams and no pre-game order selection.

### Screen layout patterns

| Screen | Pattern | Reason |
|--------|---------|--------|
| `screen-gth-menu` | `min-h-screen` centred | Menu; no sticky footer needed |
| `screen-gth-disorder-reveal` | `min-h-screen` centred | Content flows naturally; no persistent CTA required |
| `screen-gth-canvas` | `h-screen` sticky-footer | Canvas + countdown must remain fully visible; Done button in footer |
| `screen-gth-waiting-room` | `min-h-screen` centred | Passive; no sticky footer |
| `screen-gth-shrink-intro` | `min-h-screen` centred | Simple announcement |
| `screen-gth-case` | `h-screen` sticky-footer | Drawing + Diagnostic Cards/input must stay in view; deep-dive keyboard layout requires sticky input footer |
| `screen-gth-case-report` | `min-h-screen` centred | Passive stats |
| `screen-gth-big-reveal` | `min-h-screen` centred | Host taps at their own pace; no sticky footer |
| `screen-gth-final-report` | `min-h-screen` centred | Leaderboard |

---

## §4 — Screen Registry

All must be added to `allScreens[]` in `engine.js`. **Total: 9 new screens.**

| Screen ID | Purpose |
|-----------|---------|
| `screen-gth-menu` | Main menu hub |
| `screen-gth-disorder-reveal` | Pre-draw disorder info; reused per disorder via `gthDisorderSubState` |
| `screen-gth-canvas` | Drawing screen with countdown and canvas |
| `screen-gth-waiting-room` | Phase 1 complete; waiting for remaining players |
| `screen-gth-shrink-intro` | Phase 2 announcement; all players tap to confirm ready |
| `screen-gth-case` | Shrink Phase case screen — Diagnostic Cards (standard) or text input (Deep Dive) |
| `screen-gth-case-report` | Queue exhausted before timer; live Firebase progress |
| `screen-gth-big-reveal` | Host-controlled reveal; one drawing at a time |
| `screen-gth-final-report` | Final leaderboard + play-again |

Shared multiplayer screens (`screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join`) are already registered — do not re-add.

**Team setup screens:** Not applicable — individual players, no teams.

---

## §5 — State Variables

```javascript
// ── Settings (persist between sessions) ────────────────────────────────────
let gthDisordersPerPatient = 3;             // 2 | 3 | 4
let gthDrawingTime         = 30;            // 20 | 30 | 45 (seconds)
let gthDiagnosisWindow     = 90;            // 60 | 90 | 120 (seconds)
let gthDifficultyMix       = 'everyday+phobias'; // 'everyday' | 'everyday+phobias' | 'all'
let gthDeepDive            = false;         // bool — Hard Mode; text input replaces Diagnostic Cards
let gthSyllyMode           = false;         // bool — Stroke or Genius

// ── Roster (populated at game start from mpPlayerSlots; persists across sessions) ──
let gthPlayerCount  = 0;
let gthPlayerNames  = [];                   // string[gthPlayerCount]

// ── Phase 1 state (reset each session) ─────────────────────────────────────
let gthCurrentDisorderIdx  = 0;            // which disorder currently drawing (0-based)
let gthAssignedDisorders   = [];           // disorder entry objects for this player (private, local)
let gthLocalDrawings       = [];           // serialised DrawingData[], one per disorder
let gthPhase1Ready         = [];           // bool[gthPlayerCount] — readyCheck for Phase 1→2
let gthPhase1Complete      = false;
let gthAllDrawings         = [];           // Host only: all collected drawings [{playerIdx, disorderIdx, data, disorderId}]

// ── Phase 2 state (reset each session) ─────────────────────────────────────
let gthQueue               = [];           // {drawingData, disorderId, decoys[], artistIdx}[]
let gthQueueIdx            = 0;            // current case index
let gthLocalDiagnoses      = [];           // {disorderId, selectedId, timestamp}[] — local accumulation
let gthPhase2EndTimestamp  = 0;            // epoch ms — from GTH_PHASE2_START payload
let gthPhase2Timer         = null;         // setInterval ref for countdown display
let gthPhase2Complete      = false;
let gthDiagnosesSubmitted  = false;        // guard: prevents double-submit on GTH_PHASE2_END
let gthDiagnosesReady      = [];           // bool[gthPlayerCount] — readyCheck for diagnosis collection
let gthAllDiagnoses        = [];           // Host only: all received diagnosis batches

// ── Reveal state ────────────────────────────────────────────────────────────
let gthRevealPool          = [];           // [{disorderId, disorderName, artistIdx, artistName, correctShrinks[], patientPts}]
let gthRevealIdx           = 0;

// ── Scores ──────────────────────────────────────────────────────────────────
let gthScores              = [];           // {patientPts, shrinkPts, total}[] per player index

// ── UI state ────────────────────────────────────────────────────────────────
let gthDisorderSubState    = 'preview';    // 'preview' | 'between'
let gthCanvasActive        = false;        // true while CanvasDraw listeners are attached
let gthCountdownTimer      = null;         // setInterval ref for drawing countdown
```

**Derived at runtime (never stored):**
- Disorder pool filtered by `gthDifficultyMix` — computed in `gthBuildDisorderPool()`
- `isSylly` (canonical engine pattern) = `gthSyllyMode` — used for Sylly Mode conditionals

---

## §6 — Settings

**Settings overlay title block:**
- Heading: `Intake Form 📋`
- Subtitle: `Adjust your session details below.`

| Setting (display) | Options | Default | Variable | Internal values |
|------------------|---------|---------|----------|----------------|
| Disorders per Patient | 2 / 3 / 4 | 3 | `gthDisordersPerPatient` | `2` / `3` / `4` |
| Drawing Time | 20s / 30s / 45s | 30s | `gthDrawingTime` | `20` / `30` / `45` |
| Diagnosis Window | 60s / 90s / 120s | 90s | `gthDiagnosisWindow` | `60` / `90` / `120` |
| Difficulty Mix | Everyday / Everyday + Phobias / All | Everyday + Phobias | `gthDifficultyMix` | `'everyday'` / `'everyday+phobias'` / `'all'` |
| Deep Dive | OFF / ON | OFF | `gthDeepDive` | `bool` |
| ✨ Sylly Mode (Stroke or Genius) | OFF / ON | OFF | `gthSyllyMode` | `bool` |

**Plain-English card descriptions:**
| Setting | Description text |
|---------|-----------------|
| Disorders per Patient | "Number of drawings each player makes per session." |
| Drawing Time | "Seconds on the clock for each disorder." |
| Diagnosis Window | "Total time for the Shrink Phase." |
| Difficulty Mix | "Which disorders appear in the pool. Everyday is the most accessible." |
| Deep Dive | "Hard Mode. Removes Diagnostic Cards — Shrinks must type their diagnosis instead." |

**Diagnosis Window — recommendation sub-labels** (shown as `text-stone-400 text-xs` below each pill):
- 60s → "Fast — roughly 4 cases in a 6-player game."
- 90s → "Balanced — roughly 6 cases in a 6-player game."
- 120s → "Relaxed — roughly 8 cases in a 6-player game."

**Settings overrides in Lobby Mode:** All settings synced via `mpSerialiseSettings('gth')`. No settings need to be forced or disabled for multiplayer.

**`mpSerialiseSettings('gth')` return value:**
```javascript
{ gthDisordersPerPatient, gthDrawingTime, gthDiagnosisWindow, gthDifficultyMix, gthDeepDive, gthSyllyMode }
```

---

## §7 — Scoring Logic

**Patient scoring:** +2 per Shrink who correctly diagnoses your drawing. Multiple correct Shrinks = multiple +2 awards. No cap.

**Shrink scoring:**
| Outcome | Points | Notes |
|---------|--------|-------|
| Correct diagnosis | +2 | Base |
| Speed bonus | +1 | One player per drawing only — fastest correct timestamp from `GTH_DIAGNOSES_SUBMIT` batch |
| Tier 3 disorder correctly diagnosed | +1 | Stacks with base +2 and speed bonus |
| Incorrect diagnosis | 0 | No penalty |
| Timer expires before queue exhausted | 0 | Undiagnosed drawings simply don't score |

**Speed bonus implementation:** All local diagnoses are timestamped (`timestamp: Date.now()`) at the moment the player taps a Diagnostic Card or submits text. Host receives full batches via `GTH_DIAGNOSES_SUBMIT`. For each drawing, Host finds all correct diagnoses, sorts by `timestamp` ascending, awards speed bonus to index 0.

**Tie-break rule (Final Report):**
1. Highest `total` (patientPts + shrinkPts)
2. Tie → most correct Shrink diagnoses
3. Still tied → shared victory (both names displayed as winners)

**Score resolution:** `gthResolveScores()` — called by Host only, after all `GTH_DIAGNOSES_SUBMIT` batches received (`gthDiagnosesReady.every(Boolean)`). Result broadcast in `GTH_FINAL_SCORES`.

**Zero-sum check:** A player who draws clearly and diagnoses well scores roughly twice as much as a single-skill player. The speed bonus rewards engagement without punishing slower guessers — additive (+1), never multiplied.

---

## §8 — Validation Rules

| Input | Block condition | Error | Animation |
|-------|----------------|-------|-----------|
| Deep Dive text input | Empty string after trim | "Enter a diagnosis." | Shake text field |
| Deep Dive text input | No match against `name` or any `aliases[]` entry after `normaliseWord()` | "Unrecognised — try again." | Shake text field; keep input value |

**normaliseWord() usage:** Called on both the player's input and on each candidate string (`name` + all `aliases[]` entries) at match time. Exact normalised-string match only. **No fuzzy/Levenshtein matching in v1** — explicitly out of scope (see brief §13).

**Deep Dive mobile keyboard layout constraint:** On `screen-gth-case` with Deep Dive ON, use `h-screen` sticky-footer layout. The drawing canvas is in the scrollable body (`flex-1 overflow-y-auto min-h-0`); the text input and Submit button are in the sticky footer (`px-6 pb-8 pt-2 flex-shrink-0`). When the soft keyboard opens, the footer stays visible; the canvas scrolls above it. This is non-negotiable per brief §12.

---

## §9 — Overlay Registry

| Overlay ID | Pattern | z-index | Trigger | Notes |
|------------|---------|---------|---------|-------|
| `gth-settings-overlay` | Data (slide-up) | z-[80] | `#btn-gth-menu-settings` | "Intake Form 📋" |
| `gth-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-gth-menu-how-to`, `#btn-gth-how-to` | "The Disclaimer 🛋️" |
| `gth-quit-overlay` | Decision modal | z-[80] | `.btn-gth-quit-open` | "Walk Out?" |
| `gth-new-session-overlay` | Decision modal | z-[90] | `#btn-gth-new-session` on final-report | "New Session?" — required play-again confirmation |

**Quit overlay copy:**
- Emoji: 🛋️
- Heading: "Walk Out?"
- Subtext: "Your session will be lost. The waiting room will be very disappointed."
- Confirm: "Yeah, I'm out."
- Cancel: "Keep going!"

**Play-again overlay copy:**
- Emoji: 🛋️
- Heading: "New Session?"
- Subtext: "All drawings and diagnoses will be cleared. Names and settings stay."
- Confirm: "Start New Session" (single) / "Restart in Lobby 🔄" (host) / "Leave Session" (client)
- Cancel: "Stay here"

**Multiplayer play-again pattern:** Host confirm → `mpReturnToLobby()`. Client confirm → `resetToLobby()`. Confirm label must update dynamically when overlay opens.

**Exact inner div class strings — use verbatim:**

Data slide-up (`gth-settings-overlay`, `gth-how-to-overlay`):
```html
<div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
```

Decision modal (`gth-quit-overlay`, `gth-new-session-overlay`):
```html
<div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-stone-300">
```
(GTH uses `border-stone-300` — the custom sage colour is not available as a Tailwind utility for border. Use `border-stone-300` for modal borders or apply inline style `border-color: var(--color-gth-sage)` if brand accent is required.)

---

## §10 — Audio Map

| Game moment | Audio function |
|-------------|---------------|
| "Start the Session" CTA, Phase 2 start | `playLaunch()` |
| Drawing submitted (Done tap or timer auto-submit) | `playSuccess()` |
| Deep Dive incorrect diagnosis | `playBoing()` |
| Settings pill toggle | `playPillClick()` |
| Close overlay / confirm | `playDone()` |
| Walk Out confirm (quit) | `playExit()` |
| Drawing countdown — last 5 seconds (each tick) | `playTick()` |
| Drawing countdown expiry | `playAlarm()` |
| Big Reveal "Next Case →" tap | `playWhoosh()` |

No new audio functions required.

---

## §11 — Word Bank & Data

**Source:** New file `data/gth-data.json` — distinct schema, not reusable from `words.json`.

**Entry schema:**
```json
{
  "id": "gth-042",
  "name": "Arachnophobia",
  "display": "Arachnophobia",
  "definition": "An intense, irrational fear of spiders and other arachnids.",
  "tip": "Draw a huge spider looming over a tiny, terrified stick figure.",
  "tier": 2,
  "category": "phobia",
  "aliases": ["fear of spiders", "spider fear", "scared of spiders", "spider phobia"]
}
```

| Field | Purpose |
|-------|---------|
| `id` | Unique ID — `gth-NNN` format, zero-padded to 3 digits |
| `name` | Canonical term — shown at Big Reveal and in Diagnostic Cards |
| `display` | Patient-facing name — may simplify long clinical names |
| `definition` | Plain-English explanation on the disorder-reveal screen |
| `tip` | Drawable suggestion — concrete and visual, steers toward absurdism |
| `tier` | `1` = Everyday Neuroses / `2` = Classic Phobias / `3` = Complex Conditions |
| `category` | Used for decoy selection — pulls thematically adjacent decoys |
| `aliases` | Accepted text inputs for Deep Dive. Must be populated from day one. |

**Tier → DifficultyMix filter (`gthBuildDisorderPool()`):**
| `gthDifficultyMix` | Tiers included |
|--------------------|---------------|
| `'everyday'` | tier 1 only |
| `'everyday+phobias'` | tier 1 + 2 |
| `'all'` | all tiers |

**Minimum content for v1:** 15 entries per tier minimum (45 total) — required before testing begins. See `docs/gth-content-guide.md`.

**Decoy selection algorithm (`gthPickDecoys(entry, pool, count = 4)`):**
1. Pull entries matching `tier` + `category`, excluding the correct entry
2. If < `count` available: expand to same `tier` only
3. If still < `count`: expand to full pool
4. Shuffle and take first `count`. Return as `{ id, name }` objects.
5. `count` = 4 for v1 (all player counts).

**Queue building algorithm (`gthBuildQueues()`) — Host only, called after Phase 1 readyCheck:**
- Goal: each drawing is assigned to exactly **2** player queues (never the artist's own queue)
- Gives `gthDisordersPerPatient × 2` drawings per queue (6 for default settings)
- Algorithm:
  ```
  for each drawing in shuffled pool:
    pick 2 random target players (not the artist)
    append drawing to their queue
  shuffle each player's queue
  ```
- Edge case: 4 players × 2 disorders = 8 drawings → 4 queues → 4 drawings per queue (valid)
- Each queue entry includes: `{ drawingData, disorderId, decoys[], artistIdx }`
- Written to `/rooms/{code}/players/{idx}/queue` for each player

**Secret Mode / expansion packs:** `applyExpansionOverrides()` hook called at settings-apply point (same pattern as all plugins). GTH expansion packs would substitute `gth-data.json` disorder entries.

**Add to `sw.js` precache:**
```
'data/gth-data.json'
'js/games/gth.js'
'js/lib/canvas-draw.js'
```

---

## §12 — Multiplayer Configuration

| Field | Value |
|-------|-------|
| Mode | Individual Devices — MDLM |
| `recommendedMode` | `'mdlm'` |
| `supportedModes` | `['mdlm']` |
| `multiplayerOnly` | `true` |
| `rosterConfig` | `{ type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false }` |
| `getMaxPlayers` | `() => 8` |
| `getMinPlayers` | `() => 4` |

**`MP_GAME_CONFIGS` entry (`engine-multiplayer.js`):**
```javascript
gth: {
  gameName:        'Group Therapy',
  emoji:           '🛋️',
  brandBtnClass:   'bg-stone-400 hover:bg-stone-500',  // closest available for sage in Tailwind classes
  ptpLabel:        'Start the Session 🛋️',
  menuScreen:      'screen-gth-menu',
  onPassThePhone: () => {
    if (window.syllyMultiplayerMode === 'host') {
      gthPlayerCount = mpPlayerSlots.length;
      gthPlayerNames = mpPlayerSlots.map(p => p.nickname);
      gthShowMenu();
    }
    // 'client': waits for GTH_GAME_START SYNC from Host
  },
  recommendedMode: 'mdlm',
  supportedModes:  ['mdlm'],
  multiplayerOnly: true,
  lobbyCtaLabel:   'Start the Session 🛋️',
  rosterConfig:    { type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
  getMaxPlayers:   () => 8,
  getMinPlayers:   () => 4,
},
```

**Per-phase intercept summary:**

| Phase | Action (client → host) | Sync (host → all) |
|-------|----------------------|------------------|
| Game start | — | `GTH_GAME_START` (per-player disorders written privately) |
| Each drawing submitted | `GTH_DRAWING_SUBMIT` | — (host accumulates; no mid-Phase-1 broadcasts) |
| All drawings in | — | `GTH_PHASE2_START` (queues written privately per player, includes `endTimestamp`) |
| Phase 2 running | `GTH_DIAGNOSES_SUBMIT` (at expiry or queue-exhausted) | — |
| Phase 2 end | — | `GTH_PHASE2_END` (host timer fires; triggers all pending submissions) |
| All diagnoses in | — | `GTH_FINAL_SCORES` → `GTH_REVEAL_POOL` (full reveal data) |
| Big Reveal advance | — | `GTH_REVEAL_NEXT` (host taps; includes `revealIdx` + reveal payload) |

**ACTION packet types:**
| Packet | Payload | Trigger |
|--------|---------|---------|
| `GTH_DRAWING_SUBMIT` | `{ playerIdx, disorderIdx, drawingData }` | Each drawing timer expiry or Done tap |
| `GTH_DIAGNOSES_SUBMIT` | `{ playerIdx, diagnoses: [{disorderId, selectedId, timestamp}] }` | Phase 2 timer expiry or queue exhausted |

**SYNC packet types:**
| Packet | Payload | Client response |
|--------|---------|----------------|
| `GTH_GAME_START` | `{ playerNames[], playerCount, disordersPerPatient, drawingTime }` | Phase 1 begins; each player reads own disorders from private Firebase slot |
| `GTH_PHASE2_START` | `{ endTimestamp }` | Phase 2 begins; each player reads own queue from private Firebase slot; countdown starts |
| `GTH_PHASE2_END` | — | All pending `GTH_DIAGNOSES_SUBMIT` fire immediately |
| `GTH_REVEAL_NEXT` | `{ revealIdx, disorderName, artistName, artistIdx, correctShrinks[], patientPts, drawingData }` | Advance big-reveal display |
| `GTH_FINAL_SCORES` | `{ scores: [{patientPts, shrinkPts, total}], winnerIdx[] }` | Show `screen-gth-final-report` |

**Private information routing:**
| Information | Path | Method |
|------------|------|--------|
| Each player's assigned disorders | `/rooms/{code}/players/{idx}/disorders` | Targeted Firebase write by Host |
| Each player's Phase 2 queue | `/rooms/{code}/players/{idx}/queue` | Targeted Firebase write by Host |

**readyCheck matrices:**
- `gthPhase1Ready = new Array(gthPlayerCount).fill(false)` — `true` when player `idx`'s total drawing count equals `gthDisordersPerPatient`. Host checks `.every(Boolean)`.
- `gthDiagnosesReady = new Array(gthPlayerCount).fill(false)` — `true` when `GTH_DIAGNOSES_SUBMIT` received from player `idx`. Host checks `.every(Boolean)`.

---

## §13 — Sylly Mode: Stroke or Genius

**Internal variable:** `gthSyllyMode = false`

**Effect 1 — Patient Phase: The Stroke**
- Called in `gthShowCanvas()`: `if (gthSyllyMode) CanvasDraw.setTremor(document.getElementById('gth-canvas-wrapper'), true);`
- Cleared on drawing lock: `CanvasDraw.setTremor(wrapper, false);`
- CSS tuning properties in `css/styles.css`: `--gth-tremor-max: 5;` (px), `--gth-tremor-interval: 1500;` (ms)

**Effect 2 — Shrink Phase: The Genius Test**
- Called in `gthRenderCase()`: `if (gthSyllyMode) CanvasDraw.setBlur(canvasEl, 3500);`
- `3500ms` ≈ half the average case viewing window at 90s / 6 cases
- Zero Firebase involvement — entirely client-side CSS

**Modified functions:** `gthShowCanvas()` (tremor branch), `gthRenderCase()` (blur branch)

**The Stack:** Deep Dive ON + Stroke or Genius ON simultaneously — confirmed intentional per brief.

---

## §14 — `resetToLobby()` Additions

Add to `engine.js` `resetToLobby()` after all existing game teardowns:

```javascript
// Group Therapy teardown
const _gthSettingsOv = document.getElementById('gth-settings-overlay');
const _gthHowtoOv    = document.getElementById('gth-how-to-overlay');
const _gthQuitOv     = document.getElementById('gth-quit-overlay');
const _gthNewOv      = document.getElementById('gth-new-session-overlay');
const _gthWrapper    = document.getElementById('gth-canvas-wrapper');
if (_gthSettingsOv) _gthSettingsOv.style.display = 'none';
if (_gthHowtoOv)    _gthHowtoOv.style.display    = 'none';
if (_gthQuitOv)     _gthQuitOv.style.display      = 'none';
if (_gthNewOv)      _gthNewOv.style.display        = 'none';
if (gthCountdownTimer) { clearInterval(gthCountdownTimer); gthCountdownTimer = null; }
if (gthPhase2Timer)    { clearInterval(gthPhase2Timer);    gthPhase2Timer = null; }
if (typeof CanvasDraw !== 'undefined' && _gthWrapper) CanvasDraw.setTremor(_gthWrapper, false);
gthPhase1Complete = false; gthPhase2Complete = false;
gthDiagnosesSubmitted = false; gthCanvasActive = false;
```

The `getElementById` guards are required because `resetToLobby()` runs on cold boot before `gth.js` elements exist in the DOM.

---

## §15 — `index.html` Section Header

```html
<!-- ════ GROUP THERAPY ════
     Screens : screen-gth-menu, screen-gth-disorder-reveal, screen-gth-canvas,
               screen-gth-waiting-room, screen-gth-shrink-intro, screen-gth-case,
               screen-gth-case-report, screen-gth-big-reveal, screen-gth-final-report
     Overlays: gth-settings-overlay, gth-how-to-overlay, gth-quit-overlay, gth-new-session-overlay
  ════════════════════════════════════════════════════════════════════════════════════ -->
```

Place after the BLD section, before the `<script>` tags.

---

## §16 — Implementation Checklist

Tick each item as built. Do not mark complete until verified in the browser.

### Phase A — Infrastructure (complete before any GTH game logic)
- [ ] `js/lib/canvas-draw.js` created: `CanvasDraw.init()`, `.clear()`, `.lock()`, `.render()`, `.setTremor()`, `.setBlur()`
- [ ] Canvas wrapper constraint verified: tremor applies to `#gth-canvas-wrapper`; strokes record pixel-accurate coordinates (no offset)
- [ ] Unit verify: draw strokes → `lock()` → `render()` onto a second canvas → visual output matches
- [ ] `<script src="js/lib/canvas-draw.js">` tag added to `index.html` (after `engine.js`, before game plugins)
- [ ] CSS additions to `css/styles.css`: `--color-gth-sage: #B1BCA0` in `:root`, `pill-active-sage`, `game-toggle-on-sage`, `--gth-tremor-max`, `--gth-tremor-interval`
- [ ] `data/gth-data.json` created — minimum 15 entries per tier (45 total)
- [ ] `docs/gth-content-guide.md` created

### Phase B — Foundation
- [ ] `js/games/gth.js` created with all state variable declarations (§5)
- [ ] `<script src="js/games/gth.js">` tag added to `index.html` (after all other plugins, before `secret-mode.js`)
- [ ] All 9 screen IDs added to `allScreens[]` in `engine.js`
- [ ] Overlay teardown added to `resetToLobby()` in `engine.js` (§14)
- [ ] Section header comment added to `index.html` (§15)
- [ ] `activeGameId = 'gth'` set in lobby button listener
- [ ] `#btn-gth` → `screen-gth-menu`
- [ ] `gth` entry added to `MP_GAME_CONFIGS` in `engine-multiplayer.js`
- [ ] `mpSerialiseSettings('gth')` case added to `engine-multiplayer.js`

### Phase C — Game Menu
- [ ] Four buttons: "Start the Session 🛋️", "How to Play", "Settings", "← Back to the Box"
- [ ] Settings overlay: thematic title block first, all settings cards, `scrollTop = 0` on open
- [ ] Settings Difficulty Mix: recommendation sub-labels on Diagnosis Window pills
- [ ] How-to overlay: "The Disclaimer 🛋️" heading, step cards, `scrollTop = 0` on open
- [ ] `playLaunch()` on "Start the Session 🛋️"
- [ ] `applyExpansionOverrides()` hook wired at settings-apply point

### Phase D — Phase 1 (Patient Phase)
- [ ] Host assigns disorders via `gthAssignDisorders()` — writes privately per player to Firebase
- [ ] Each client reads own disorders from private Firebase slot on `GTH_GAME_START`
- [ ] `screen-gth-disorder-reveal`: `'preview'` sub-state — disorder name, definition, tip, "Ready to Draw" button
- [ ] `screen-gth-disorder-reveal`: `'between'` sub-state — "Issue N of M", next disorder preview, "Draw Next" button
- [ ] `screen-gth-canvas`: disorder name in header, countdown timer, `#gth-canvas-wrapper` > `#gth-canvas`, "Done" button in footer
- [ ] `CanvasDraw.init()` on canvas entry; `CanvasDraw.lock()` on timer expiry or Done tap → drawing appended to `gthLocalDrawings`
- [ ] Sylly Mode tremor: `CanvasDraw.setTremor(wrapper, gthSyllyMode)` on canvas entry; cleared on lock
- [ ] Countdown: `playTick()` last 5 seconds; `playAlarm()` on expiry
- [ ] Drawing submitted → `GTH_DRAWING_SUBMIT` ACTION sent; advance to next disorder or waiting room
- [ ] `screen-gth-waiting-room`: Firebase-backed player count ("N/M patients submitted"); flavour copy
- [ ] Phase 1 readyCheck: host advances to Phase 2 when `gthPhase1Ready.every(Boolean)`
- [ ] `[?]` button on canvas screen header wired to `gth-how-to-overlay`

### Phase E — Phase 2 (Shrink Phase)
- [ ] Host: `gthBuildQueues()` — assign each drawing to 2 queues; shuffle; write to Firebase private slots
- [ ] `GTH_PHASE2_START` broadcast with `endTimestamp`
- [ ] All clients read own queue from Firebase; start countdown display
- [ ] `screen-gth-shrink-intro`: Phase 2 announcement with session length; tap to proceed
- [ ] `screen-gth-case` standard mode: `CanvasDraw.render()` + 4 Diagnostic Card buttons
- [ ] `screen-gth-case` Deep Dive mode: `CanvasDraw.render()` + text input + Submit (sticky footer)
- [ ] Sylly Mode blur: `CanvasDraw.setBlur(canvasEl, 3500)` on each case render
- [ ] Deep Dive validation: `normaliseWord()` match against `name` + `aliases[]`; shake on failure
- [ ] Diagnosis local accumulation with `timestamp: Date.now()`
- [ ] Queue exhausted: `screen-gth-case-report` — live Firebase progress + flavour copy
- [ ] `GTH_DIAGNOSES_SUBMIT` sent on `GTH_PHASE2_END` or queue-exhausted (guarded by `gthDiagnosesSubmitted`)
- [ ] `[?]` button on case screen header wired to `gth-how-to-overlay`

### Phase F — Score Resolution + Big Reveal + Final Report
- [ ] `gthResolveScores()`: patient pts, shrink base, speed bonus (timestamp sort), tier 3 bonus — host only
- [ ] `GTH_FINAL_SCORES` + `GTH_REVEAL_POOL` broadcast; all devices navigate to `screen-gth-big-reveal`
- [ ] `screen-gth-big-reveal`: one drawing visible at a time; host sees "Next Case →" button, clients see "Waiting for reveal..."
- [ ] `GTH_REVEAL_NEXT` broadcast per host tap; all devices advance `gthRevealIdx`
- [ ] Each reveal item: disorder name, artist name, correct Shrinks listed, patient pts scored this drawing
- [ ] After last reveal: all devices advance to `screen-gth-final-report`
- [ ] `screen-gth-final-report`: leaderboard table (Patient pts / Shrink pts / Total); winner callout; "New Session" → `gth-new-session-overlay`
- [ ] Multiplayer play-again: host → `mpReturnToLobby()`; client → `resetToLobby()`; confirm label updates dynamically

### Phase G — Service Worker + Documentation
- [ ] `sw.js` precache: add `'js/lib/canvas-draw.js'`, `'js/games/gth.js'`, `'data/gth-data.json'`
- [ ] SW `CACHE_NAME` bumped to `'sylly-games-v97'`
- [ ] Protocol A Phase Gate audit complete
- [ ] `docs/code-map.md` updated (screens, overlays, key functions, GTH ACTION/SYNC packet table)
- [ ] `game-identities.md` updated (full GTH entry)
- [ ] `logic-engine.md` updated (canvas-draw.js documented in load order + precache list)
- [ ] `CLAUDE.md` updated (SW version v97, current focus, key references)
- [ ] `docs/implementation-notes/gth-implementation-notes.md` created
- [ ] Phase 30 snapshot written (`docs/archive/phase30-snapshot.md`)

---

## §17 — Clarifications Required Before Implementation

None. All design questions resolved during planning:

| Decision | Resolution |
|----------|-----------|
| Big Reveal control | Host-taps to advance via `GTH_REVEAL_NEXT` — confirmed by project owner |
| Between-disorders screen | Sub-state on `screen-gth-disorder-reveal` — see §18 |
| Speed bonus resolution | Timestamp from `GTH_DIAGNOSES_SUBMIT` batch, sorted by host |
| Queue algorithm | Each drawing assigned to exactly 2 queues; never artist's own |
| Phase 2 timer sync | `endTimestamp` in `GTH_PHASE2_START`; `GTH_PHASE2_END` is authoritative |
| No fuzzy matching | `normaliseWord()` exact match only; Levenshtein out of scope for v1 |

---

## §18 — Deviations from Phase 1 Brief

| # | Brief said | Spec does instead | Reason |
|---|-----------|------------------|--------|
| 1 | §11 screen list includes "Between disorders" as a separate screen | Implemented as `gthDisorderSubState = 'between'` — a display sub-state within `screen-gth-disorder-reveal` | Saves one screen registration; same UX; simpler wiring |
| 2 | "Multiplayer-only — no pass-the-phone mode" (brief intent) | `multiplayerOnly: true`, `supportedModes: ['mdlm']` — no PTP fallback in config | Per brief intent; confirmed |
| 3 | Big Reveal advancement not specified in brief | Host-controlled: "Next Case →" tap broadcasts `GTH_REVEAL_NEXT` | Confirmed by project owner during planning |
| 4 | Diagnosis Window recommendations mentioned informally (brief §6 note) | Included as `text-stone-400 text-xs` sub-labels on Diagnosis Window pills | Directly actionable UI copy; improves settings UX |
| 5 | `brandBtnClass` for sage in MP lobby | Uses `'bg-stone-400 hover:bg-stone-500'` (closest available Tailwind class) in `brandBtnClass`; actual sage colour applied via `var(--color-gth-sage)` in game-specific elements | Tailwind JIT cannot resolve `--color-gth-sage` in class strings; stone-400 is a reasonable visual approximation in the lobby button context |
