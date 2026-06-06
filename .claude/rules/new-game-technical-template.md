# New Game Technical Spec — [GAME NAME]
**Document type:** Phase 2 — Technical Specification
**Who fills this in:** Claude Code, after reading the Phase 1 brief and all rule files
**Status when handed to project owner:** DRAFT — awaiting confirmation before implementation begins

> **Instructions for Claude Code**
> 1. Read the Phase 1 brief (`new-game-brief-[name].md`) in full
> 2. Read `logic-engine.md`, `ui-style.md`, `definitions.md`, `game-identities.md`, `CLAUDE.md`
> 3. Read `docs/code-map.md` to check for naming collisions and reusable patterns
> 4. Fill in every section below. Where the brief is ambiguous, flag it with **[CLARIFICATION NEEDED]** — do not invent answers
> 5. Present the completed spec to the project owner. Do not write any game code until this document is confirmed.
> 6. Once confirmed, this document is the implementation spec. Reference it directly. Do not re-derive decisions from the Phase 1 brief.

---

## Consistency Audit (complete before filling any other section)

Run these checks against `game-identities.md` and `docs/code-map.md` before proceeding.

| Check | Finding |
|-------|---------|
| Does any proposed terminology collide with existing terms across the 8 games? | |
| Does the proposed brand colour have an existing `pill-active-[colour]` class in `css/styles.css`? | |
| Does the proposed abbreviation conflict with any existing plugin prefix? | |
| Does any proposed screen ID conflict with any existing screen in `allScreens[]`? | |
| Does the game need a new data file, or can it reuse `words.json` or `ygi-data.json`? | |
| Are there any engine functions already built that this game can reuse (e.g. `showWhoFirst`, `normaliseWord`, pass-gate pattern)? | |

**Flags:** (list any collisions or concerns found)

---

## §1 — Identity

| Field | Value |
|-------|-------|
| Full name | |
| Short ID / abbreviation | |
| Plugin file | `js/games/[abbr].js` |
| Brand colour (Tailwind class) | |
| Active pill class | `pill-active-[colour]` — confirm exists in `css/styles.css`; add if missing |
| Lobby button ID | `#btn-[abbr]` |
| Play CTA label | |
| Menu screen tagline | |

---

## §2 — State Flow

Full screen sequence from lobby entry to game over. Use screen IDs from §5.

```
LOBBY → [ABBR] MENU → [ABBR] SETUP
→ [describe loop structure]
→ [ABBR] GAMEOVER
```

**Sub-states within screens** (if any screen has internal phases, list them here with their state variable):

| Screen | Sub-states | State variable |
|--------|-----------|----------------|
| | | |

**Pass-the-phone gate points** — list every transition where private role information is shown to a new player. Each requires a `screen-[abbr]-pass-gate` or equivalent gate screen.

| Transition | Gate required? | Gate screen ID |
|-----------|---------------|----------------|
| | | |

**`showWhoFirst()` usage** — if this is a team game:
- Config values: `emoji`, `eyebrow`, `heading`, `prompt`, `teamA/B`, `confirmLabel`, `accentBtnClass`, `accentTextClass`
- `onResult` handler: [describe what happens when first team is determined]

**Screen layout pattern decision** — decide at spec time for every screen; wrong choices require structural rework during testing:

| Screen ID | Layout pattern | Reason |
|-----------|---------------|--------|
| | `min-h-screen` centred (default) / `h-screen` sticky-footer | |

Rule: `h-screen overflow-hidden` only when a primary CTA must stay visible regardless of content height. Everything else: `min-h-screen overflow-y-auto flex items-center justify-center` (the NAT pattern).

---

## §3 — Screen Registry

All IDs must be added to `allScreens[]` in `engine.js`. Every screen listed here, no exceptions.

| Screen ID | Purpose | Notes |
|-----------|---------|-------|
| `screen-[abbr]-menu` | Main hub | |
| `screen-[abbr]-setup` | [Team names / player names / roster] | |
| `screen-[abbr]-pass-gate` | Pass-the-phone confirmation | If needed — see §2 |
| `screen-[abbr]-[main-play]` | | |
| `screen-[abbr]-gameover` | Final score + log | |
| [add all screens] | | |

**Total new screens:** [N] — add all to `allScreens[]` in `engine.js`

**Team setup screens (if team game):**
- Screen 1 (`screen-[abbr]-setup`): team names only — no player names, no captain on this screen
- Screen 2 (`screen-[abbr]-players`): team size pills first, then player name inputs, then captain/role assignment
- Follows exact pattern in `ui-style.md` § Team Setup Screen Standard — do not deviate

---

## §4 — State Variables

All variables use the `[abbr]` prefix. Group by lifecycle — settings persist between games; roster persists across play-agains; match/round state resets.

```javascript
// ── Settings (persist between play-agains) ─────────────────────────────────
let [abbr]Difficulty  = '[default]'; // '[opt1]' | '[opt2]' | '[opt3]'
let [abbr]RoundCount  = [default];   // [opt1] | [opt2] | [opt3]
// [all other settings with their internal value types]
let [abbr]SyllyMode   = false;       // always last setting

// ── Roster (set in setup, persist across play-agains) ──────────────────────
let [abbr]PlayerCount = [default];
let [abbr]PlayerNames = [];
// [team variables if team game]

// ── Match / game state (reset each play-again) ─────────────────────────────
let [abbr]CurrentRound = 0;
let [abbr]Scores       = [];
// [all other game state]

// ── Round state (reset each round) ─────────────────────────────────────────
// [variables that only live for one round]

// ── Turn state (reset each turn) ───────────────────────────────────────────
// [variables that only live for one player's turn]

// ── UI state ───────────────────────────────────────────────────────────────
// [variables driving display only — not game logic]
```

**Variables derived at runtime (never stored):**
- [list any values that are computed on demand rather than stored, e.g. `isSylly = difficulty === 3`]

---

## §5 — Settings

**Settings overlay title block:**
- Heading: `[Thematic title] [emoji]`
- Subtitle: `[one-line game-voiced description, text-xs]`

**Settings table** (difficulty first, Sylly Mode last):

| Setting name (display) | Options (display) | Default | Internal variable | Internal values |
|------------------------|-------------------|---------|------------------|-----------------|
| [Difficulty — required] | | | `[abbr]Difficulty` | `'d1'` / `'d1+d2'` / `'all'` |
| | | | | |
| ✨ Sylly Mode ([Theme Name]) | OFF / ON | OFF | `[abbr]SyllyMode` | `bool` |

**Plain-English card descriptions** (shown below each setting name in the settings overlay):

| Setting | Description text |
|---------|-----------------|
| [Setting name] | |

**Locked/disabled settings in multiplayer:**
[List any settings that must be forced or disabled when `window.syllyMultiplayerMode !== 'single'`. Reference MFS v1.4 §7 for the override pattern if applicable.]

---

## §6 — Scoring Logic

Exact formula derived from the Phase 1 brief. Code-ready.

| Outcome | Who scores | Points | Formula (if not flat) | Turn end? |
|---------|-----------|--------|-----------------------|-----------|
| | | | | |

**Tie-break rule:**
1. [first tiebreak condition]
2. [second tiebreak condition]
3. [unresolved tie handling — what does `[abbr]EvictedIdx = -1` or equivalent mean in the UI?]

**Scoring function:** `[abbr]ResolveRound()` — called when [describe trigger]

**Zero-sum check:** [Does total points pool feel balanced across N players? Describe briefly.]

---

## §7 — Validation Rules

List every input block in the game — the checks that fire when a player tries to submit something invalid.

| Input | Block condition | Error message | Animation |
|-------|----------------|---------------|-----------|
| | | | shake: `el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');` |

**Stemmer / fuzzy match usage:**
[Does this game need `normaliseWord()` from engine.js? Does it need a derivative-blocking stemmer like `natStem()`? Specify here — do not invent a new normaliser if one already exists.]

---

## §8 — Overlay Registry

Only two patterns permitted — data slide-up or decision modal. All overlays added to `resetToLobby()` teardown.

| Overlay ID | Pattern | z-index | Trigger | Notes |
|------------|---------|---------|---------|-------|
| `[abbr]-settings-overlay` | Data (slide-up) | z-[80] | `#btn-[abbr]-menu-settings` | |
| `[abbr]-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-[abbr]-menu-how-to` | |
| `[abbr]-quit-overlay` | Decision modal | z-[80] | `.btn-[abbr]-quit-open` | |
| `[abbr]-new-[game]-overlay` | Decision modal | z-[90] | `#btn-[abbr]-go-new` on gameover | Required — no direct restart |
| [other overlays] | | | | |

**Quit overlay copy** (game-voiced — not "Quit game?"):
- Emoji: [thematic]
- Heading: [game-voiced, e.g. "Abandon the expedition?"]
- Subtext: [what will be lost]
- Confirm: [themed confirm label]
- Cancel: "Not yet!" or "Keep going!"

**Play-again overlay copy:**
- Emoji:
- Heading: "New [Game]?"
- Subtext: [what resets]
- Confirm: [themed label]
- Cancel: "Stay here"

**Shared tip overlay:** If the game has 3+ contextual `[?]` tip points (inline help for specific mechanics), add one `[abbr]-tip-overlay` entry here (Decision Modal, z-[90]) and implement `[abbr]ShowTip(emoji, heading, lines[])` to inject content dynamically. All contextual `[?]` buttons share this one overlay. See `@ui-style.md` § Contextual Tip Icons for the full HTML/JS pattern.

**Exact inner div class strings — use verbatim:**

Pattern 1 (data slide-up):
```html
<div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
```

Pattern 2 (decision modal):
```html
<div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[brand]-300">
```
Not `bg-white`, not `shadow-xl`, not `p-8`, not `rounded-2xl`, not `border-2`.

---

## §9 — Audio Map

Map existing `play*()` functions to game moments. Do not create new audio functions unless there is no suitable existing one — flag as **[NEW AUDIO NEEDED]** if so.

| Game moment | Audio function | Notes |
|-------------|---------------|-------|
| Game entry / big CTA tap | `playLaunch()` | |
| Correct answer / success | `playSuccess()` | |
| Wrong answer / block | `playBoing()` | |
| Settings pill toggle | `playPillClick()` | |
| Close overlay / confirm | `playDone()` | |
| Destructive confirm (quit, end game) | `playExit()` | |
| Timer tick | `playTick()` | |
| Timer expiry | `playAlarm()` | |
| Skip / swipe | `playWhoosh()` | |
| [game-specific moment] | **[NEW AUDIO NEEDED]** | Describe the sound if new audio is required |

---

## §10 — Word Bank & Data

**Source:** `words.json` / `ygi-data.json` / new file — [specify]

**If using `words.json`:**
- Categories used: [list]
- Difficulty tiers: derived from [setting name] — `'d1'` / `'d1+d2'` / `'all'`
- Excluded categories: [list any, e.g. `aussie_slang`, `pop_culture`]
- Space-containing entries: [include or exclude — DSD excludes them; LI5 includes them]
- Filter function: [describe the pool build logic]

**If using a new data file:**
- Filename: `data/[abbr]-data.json`
- Entry schema:
  ```json
  {
    "id": "string",
    "[field]": "[type and description]",
    "[field]": "[type and description]"
  }
  ```
- Example entry: [one real example]
- Content guide: will need `docs/[abbr]-content-guide.md` (modelled on `docs/ygi-content-guide.md`)
- Add to `sw.js` precache

**Secret Mode / expansion pack:**
- `applyExpansionOverrides()` hook: added at [specify location in settings-apply flow]
- Word pool substitution: in `[abbr]StartGame()` and pool-refill path — pattern from `nat.js` `natDrawSpecimen()`

---

## §11 — Multiplayer Configuration

Based on Phase 1 brief §10 and MFS v1.4 §7.

| Field | Value |
|-------|-------|
| Multiplayer mode | Individual Devices / 2-Device Teams / Hybrid / TBD |
| New screens required for multiplayer | [list, or "Uses shared `screen-[abbr]-mode/lobby-host/lobby-join` templates"] |

**Per-phase intercept points** — for each phase of the game, describe what the multiplayer sync does:

| Game phase | Single-device behaviour | Multiplayer intercept |
|-----------|------------------------|----------------------|
| [Phase name] | [what happens] | [what ACTION/SYNC packet is sent, what clients receive] |

**Private information routing** — list any information that must only reach specific devices:

| Information | Sent to | Method |
|------------|---------|--------|
| | | Firebase targeted write to `/rooms/{code}/players/{idx}/privateData` |

**Settings override in Lobby Mode** — list any settings that must be forced or disabled:

| Setting | Override | Reason |
|---------|---------|--------|
| | | |

**readyCheck matrix** — if this game has simultaneous input phases:
- Variable: `[abbr]ReadyCheck = []` — array of booleans, one per player
- Set to `true` when player at index `i` submits
- Host advances state when `[abbr]ReadyCheck.every(Boolean)`

---

## §12 — Sylly Mode Technical Spec

[If "None" in Phase 1 brief, write "None" and skip.]

**Internal variable:** `[abbr]SyllyMode = false`

**What changes from standard play (code-level description):**
- [change 1]
- [change 2]

**New screens added:**
| Screen ID | Purpose |
|-----------|---------|
| | |

**Modified functions:** [list functions that branch on `[abbr]SyllyMode`]

**Edge cases:**
- [e.g. what happens if Sylly Mode triggers when the board is nearly empty]

---

## §13 — `resetToLobby()` Additions

List every item that must be added to `resetToLobby()` in `engine.js` for this game's teardown.

```javascript
// [GAME NAME] teardown
document.getElementById('[abbr]-new-[game]-overlay').style.display = 'none';
document.getElementById('[abbr]-quit-overlay').style.display = 'none';
// [any other overlays]
// [any timers: clearInterval([abbr]Timer)]
// [any active game state that must be explicitly cleared]
```

---

## §14 — `index.html` Section Header

```html
<!-- ════ [GAME NAME] ════
     Screens : screen-[abbr]-menu, screen-[abbr]-setup, [list all]
     Overlays: [abbr]-settings-overlay, [abbr]-how-to-overlay, [abbr]-quit-overlay, [abbr]-new-[game]-overlay, [list all]
  ════════════════════════════════════════════════════════════════ -->
```

Place after the previous game's section, before the `<script>` tags.

---

## §15 — Implementation Checklist

Tick each item as it is built. Do not mark complete until verified in the browser.

### Foundation
- [ ] `js/games/[abbr].js` created with dependency comment at top
- [ ] `<script>` tag added to `index.html` in correct load order (after `engine.js`, before `secret-mode.js`)
- [ ] All screen IDs added to `allScreens[]` in `engine.js` (§3 count: [N] screens)
- [ ] All overlay teardown added to `resetToLobby()` in `engine.js` (§13)
- [ ] Section header comment added to `index.html` (§14)
- [ ] `pill-active-[colour]` confirmed in `css/styles.css` — added if missing
- [ ] `activeGameId = '[abbr]'` set in lobby button listener
- [ ] Lobby button (`#btn-[abbr]`) → game menu screen

### Game Menu
- [ ] Play CTA, How to Play, Settings, ← Back to the Box — all four present
- [ ] `playLaunch()` on play CTA

### Settings Overlay
- [ ] Difficulty setting first, ✨ Sylly Mode last
- [ ] Every setting in a white card
- [ ] Thematic title block as first child of `overlay-data-inner` (exact HTML from §12.7 of `new-game-template.md`)
- [ ] `scrollTop = 0` on open (selector: `.overlay-data-inner` — never `.overflow-y-auto`)
- [ ] All toggles: `shrink-0` in both active and inactive `className` strings
- [ ] `applyExpansionOverrides()` hook wired in

### How-to Overlay
- [ ] Thematic title block + `scrollTop = 0` on open

### Screens
- [ ] `.btn-open-sound` + ✕ on every screen
- [ ] `[?]` button (`#btn-[abbr]-how-to`) in main gameplay screen header — always visible (no `hidden`), wired to `[abbr]-how-to-overlay` (see `@ui-style.md` § Help icon `[?]`)
- [ ] Every screen uses the layout pattern decided in §2 (centred vs sticky-footer)
- [ ] Mid-game ✕ → quit overlay → game menu
- [ ] Post-game ✕ (`#btn-[abbr]-gameover-exit`) → `playExit(); resetToLobby()`
- [ ] Pass-gate screens implemented at all transitions identified in §2
- [ ] `showWhoFirst()` called correctly with full config (team games only)

### Overlays
- [ ] Data slide-up inners use exact class string from §8
- [ ] Decision modal inners use exact class string from §8 — including `border border-[brand]-300`
- [ ] Quit overlay copy matches §8 (game-voiced, not generic)
- [ ] Play-again overlay (`[abbr]-new-[game]-overlay`) triggers correctly — never resets state directly
- [ ] Shared tip overlay (`[abbr]-tip-overlay`) implemented if ≥3 contextual tip buttons (see `@ui-style.md` § Contextual Tip Icons)
- [ ] All `setTimeout` calls have inline WHY comment

### Scoring & Logic
- [ ] Scoring formula implemented per §6
- [ ] Tie-break logic implemented and `-1` / unresolved state handled gracefully in UI
- [ ] All validation rules from §7 implemented with correct error messages and shake animation
- [ ] `normaliseWord()` used where appropriate (never a custom normaliser)

### Word Bank
- [ ] Word pool build logic matches §10 (correct categories, difficulty tiers, exclusions)
- [ ] Secret Mode pool substitution in `startGame()` and refill path
- [ ] New data file added to `sw.js` precache if applicable

### Service Worker
- [ ] `sw.js` precache updated with any new files
- [ ] SW version bumped

### Multiplayer
- [ ] Mode selection screen (`screen-[abbr]-mode`) wired to "Let's Play!" button
- [ ] All multiplayer screens registered in `allScreens[]` and `resetToLobby()`
- [ ] Per-phase intercepts from §11 implemented
- [ ] Settings overrides for Lobby Mode from §11 implemented
- [ ] `btn-mp-action` class applied to all submittable action buttons

### Documentation
- [ ] `docs/code-map.md` updated with new game section
- [ ] `game-identities.md` updated with new game entry (terminology, settings, overlays, screens, multiplayer config)
- [ ] `CLAUDE.md` project structure map updated
- [ ] Phase snapshot written (`docs/phase[N]-snapshot.md`)

---

## §16 — Clarifications Required Before Implementation

List every open question from filling in this spec. Present to project owner for answers before coding begins.

| # | Question | Section affected | Default assumption if unanswered |
|---|----------|-----------------|----------------------------------|
| 1 | | | |
| 2 | | | |

---

## §17 — Deviations from Phase 1 Brief

List every place where the technical spec differs from what the Phase 1 brief described. These are decisions Claude Code made to fit project constraints — confirm each one.

| # | Brief said | Spec does instead | Reason |
|---|-----------|------------------|--------|
| 1 | | | |
| 2 | | | |
