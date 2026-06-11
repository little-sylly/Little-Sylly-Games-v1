# Phase Gate: The Studio Audit — Little Sylly Games

## When to Run
- **Protocol A (Phase Gate):** After every completed game or major phase. Run BEFORE writing the phase snapshot — the snapshot is a confirmation, not a discovery.
- **Protocol B (Skeleton-First):** At the start of coding any new game. No game logic until the skeleton passes.

---

## Protocol A: Phase Gate Checklist

Run all four checks. Each item is a yes/no gate — flag and fix before proceeding.

---

### 1. Drift Check — Code vs Docs

For the game just completed, verify these against the actual JS file:

- [ ] **Screen IDs match** — every `screen-[abbr]-*` ID in the plugin exists verbatim in `game-identities.md` State Flow
- [ ] **Settings table matches** — every `let [abbr]Setting` variable in the plugin matches the Settings table (name, options, default value, internal identifier)
- [ ] **Scoring values match** — every points value in the resolve/score function matches the Scoring table in `game-identities.md`
- [ ] **State variable list is complete** — all state vars declared in the plugin are listed under State Variables in `game-identities.md`
- [ ] **`allScreens[]` is current** — every screen ID registered in `engine.js` matches the screens defined for this game
- [ ] **SW precache is current** — `sw.js` lists the plugin file; `logic-engine.md` precache list matches `sw.js`; CACHE_NAME version is correct
- [ ] **Implementation notes current** — `docs/[abbr]-implementation-notes.md` exists for this game; any bugs resolved or design decisions made during this phase are logged under the appropriate section (Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps)

---

### 2. Technical Debt Harvest

Scan the plugin JS for these specific anti-patterns:

- [ ] **No naked `setTimeout`** — any `setTimeout` present must have an inline comment explaining why a delay is necessary (not just what it does)
- [ ] **No hardcoded shadows** — no magic numbers that duplicate a setting's default (e.g., writing `+10` in scoring logic when `natEscapePoints` is the variable to use)
- [ ] **No global-scope event listeners** — all `addEventListener` calls for this game must live inside an init or start function, not at top-level script execution
- [ ] **No surviving `TODO` / `FIXME` comments** — grep the plugin for these; resolve or consciously defer with a dated note
- [ ] **No engine duplication** — check that no function in the plugin reimplements something already in `engine.js` (audio, `showScreen`, `normaliseWord`, overlay patterns)
- [ ] **No `window.` prefix on `let`-declared engine-multiplayer globals** — grep the plugin for `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode`. These are `let`-declared and NOT on `window` — any `window.` prefix returns `undefined` silently. Note: `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.mpLobbyStyle`, `window.mpLobbyRoster` ARE on `window` (declared as `window.x = ...` in `engine-multiplayer.js`) — using `window.` prefix on these is correct and intentional.
- [ ] **Team games use `showWhoFirst()`** — any game with two competing teams must call `showWhoFirst(config)` from `engine.js` for pre-game order selection. No plugin may define its own equivalent screen. Grep the plugin for `showScreen` and verify no bespoke first-team screen exists.
- [ ] **Pass-gates on all role/team transitions** — every screen showing private information (Captain grid, role reveal, team-specific content) is preceded by a named `screen-[abbr]-pass-gate` confirmation screen. Grep the plugin for `showScreen('screen-[abbr]-captain')` and verify it is always called via the pass-gate function, never directly.
- [ ] **Play-again uses confirmation modal** — no "New [Game]" / "Play Again" button calls reset state directly; must go through a Decision Modal (z-[90]) first. Grep for `addEventListener('click'` on the gameover play-again button and verify the handler shows an overlay, not `resetState()` or `showSetup()` directly.
- [ ] **Team setup screens match standard** — for any team game, verify Screen 1: `relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6` section class, `absolute top-4 right-4` header, NO card wrapper around inputs, `border-2 border-stone-200 bg-white … placeholder-stone-300` input style, named-defaults hint text, pre-fill only for custom names. Screen 2 (if applicable): bare team sections (no cards), game-coloured team labels (`text-[brand]`), team size pills without card wrapper. See `@ui-style.md` § Team Setup Screen Standard.
- [ ] **Game brand colour applied consistently** — primary CTA buttons and `screen-who-first` accent use the game's full brand colour (via `accentBtnClass`/`accentTextClass` in `showWhoFirst()` config). Settings button uses light brand tint (`bg-[brand-100] hover:bg-[brand-200] text-[brand-700]`). ALL ON/OFF toggles (including Sylly Mode) use `game-toggle-on-[colour]` — `sylly-toggle-on` is no longer used anywhere. How to Play button is always `bg-stone-700`. Exit (✕) and back (←) buttons are always neutral. See `@ui-style.md` § Game Brand Colour — Scope.

---

### 3. Linguistic Integrity Sweep

For each game in the suite (not just the new one — drift can enter during fixes):

- [ ] **Terminology table coverage** — every term in the game's Terminology table in `game-identities.md` is reflected in the plugin's user-facing strings (screen headings, button labels, overlay titles)
- [ ] **No legacy generic strings** — grep the plugin for: `"Game Over"`, `"Round"`, `"Score"`, `"Points"`, `"Vote"`, `"Level"`, `"Player"` (bare, uncapitalised) — flag any that haven't been replaced with the game's own vocabulary
- [ ] **Quit overlay copy is thematic** — verify the quit overlay heading, subtext, confirm button, and cancel button against the game's Quit Overlay entry in `game-identities.md`
- [ ] **Settings overlay title block** — thematic title and subtitle in the overlay match the Settings overlay title row in the Terminology table
- [ ] **Australian English** — no "color", "flavor", "organize", "recognize" in UI strings; metric units only

---

### 4. Mobile-First Layout Audit

Static checklist — verify by reading the HTML and CSS, not by running a browser:

- [ ] **Layout pattern correctly chosen** — `h-screen overflow-hidden` is ONLY correct for screens where a primary CTA must stay visible at all times regardless of content height (e.g. DSD crew sequence, LTTP chat send). For all other screens — observation, handover, waiting, reveal, tally, gameover — use `min-h-screen overflow-y-auto flex items-center justify-center` with content centred inside a `flex flex-col max-w-sm` wrapper (the NAT pattern). Grep the plugin for `h-screen` and confirm every match has a genuine sticky-footer CTA. If in doubt, use the centred pattern. **Remediation note:** Existing games should be audited against this rule and any incorrectly applied `h-screen` screens migrated to the centred layout. Log each fixed screen in the game's implementation notes.
- [ ] **`min-h-0` on scroll bodies** — every `flex-1 overflow-y-auto` body inside an `h-screen` container also has `min-h-0` (without it, the body won't constrain)
- [ ] **Z-index stack respected** — quit/settings overlays are `z-[80]`; how-to/history overlays are `z-[90]`; sound overlay is `z-[110]` and always highest (see `ui-style.md` Z-Index Stack)
- [ ] **No `.focus()` on page load or screen show** — any programmatic focus call risks snapping the keyboard open on mobile; allowed only in explicit user-triggered input flows
- [ ] **Touch targets ≥ 44×44px** — all buttons have `min-h-11` or equivalent; no bare `<div>` used as a tap target
- [ ] **Speaker + ✕ on every screen** — full-screen menus use `absolute top-4 right-4` speaker; gameplay screens use the header row pattern
- [ ] **`[?]` opens How to Play on main gameplay screen** — the gameplay screen header must have a `btn-[abbr]-how-to` button wired to `[abbr]-how-to-overlay`. Must be always visible (no `hidden` class). Grep for `btn-[abbr]-how-to` to confirm presence and handler.
- [ ] **Decision modal borders** — every `overlay-modal-inner` div has `border border-[brand]-300`. Grep the game's HTML for `overlay-modal-inner` and verify each instance has the border class. Data overlays (`overlay-data-inner`) are exempt.

---

## Protocol B: Skeleton-First Build Order

Follow this sequence strictly. Do not skip ahead to logic injection.

### Step 0 — Template Gap Review (before the brief)
- Read the **Template Gaps** section of every existing `docs/[abbr]-implementation-notes.md` file
- For each gap, assess whether it applies to the new game's design — if yes, resolve it in the tech spec before coding begins
- This is how recurring bugs from past games get prevented proactively rather than discovered again
- **Gate:** All applicable template gaps acknowledged → proceed to Step 1

### Step 1 — Brief (before any JS)
- Fill out `docs/new-game-brief-[name].md` using `.claude/rules/new-game-template.md`
- Every section must be complete (no blank cells, no TBD on core mechanics)
- Review against `game-identities.md` for tone consistency and against `ui-style.md` for overlay/menu standards
- **Gate:** Brief signed off → proceed to Step 2

### Step 2 — Scaffold (state + empty functions)
- Create `js/games/[name].js` with all state variable declarations (settings + roster + round state)
- Write empty named functions for every screen transition (e.g., `natShowHandover()`, `natShowObservation()`)
- Register all screen IDs in `allScreens[]` in `engine.js`
- Add teardown stub to `resetToLobby()` in `engine.js`
- **Gate:** Plugin loads without errors, all vars declared → proceed to Step 3

### Step 3 — Flow Verification (routing only)
- Wire every `showScreen()` call so the full screen sequence is navigable
- Wire the lobby button → game menu screen (not directly to setup)
- Add the 4 standard menu buttons (Play CTA, How to Play, Settings, ← Back to the Box) — they don't need to work yet, just exist
- **Gate:** Walk through the entire screen flow on mobile (or mentally trace it) before any logic → proceed to Step 4

### Step 4 — Exit Routing (before game logic)
- Wire the quit overlay → game menu (mid-game ✕ path)
- Wire the post-game ✕ → `resetToLobby()` directly
- Wire "← Back to the Box" → `resetToLobby()`
- Verify these routes work cold — this is the most common source of end-of-build bugs
- **Gate:** All exit paths confirmed → proceed to Step 5

### Step 5 — Logic Injection (one screen at a time)
- Inject game logic screen by screen, in flow order (setup → handover → main play → scoring → gameover)
- After each screen: verify the exit path from that screen still works
- Add settings, overlays, and Sylly Mode last — these are enhancements, not the skeleton
- Run the Drift Check (Protocol A §1) after completing the final screen
- **Gate:** Drift Check clean + Phase Gate passed → write phase snapshot

---

## Protocol C: Pre-Game Studio Sweep

**When to run:** Before any new game's Phase 1 brief is written. Also valuable at the end of a major phase before the snapshot. Run alongside Protocol B Step 0 — both are pre-build gates.

**Purpose:** Catch recurring cross-game bugs and propagate lessons into rule files before a new game has the chance to repeat them. Protocol B Step 0 reviews Template Gaps per-game; Protocol C is the broader cross-suite sweep.

---

### Part 1 — Implementation Notes Harvest

Propagate general lessons from past bugs into rule files.

1. Read every `docs/implementation-notes/[abbr]-implementation-notes.md` — focus on the **Template Gaps** section of each file
2. Scan every **Bug Index** for bugs that appeared in 2+ games — these indicate a missing or under-specified rule, not a one-off
3. Cross-reference each finding against `logic-engine.md`, `ui-style.md`, and `phase-audit.md`
4. For any lesson not yet captured in a rule file: add it to the appropriate document before proceeding

**Gate:** No unaddressed general lessons remain open → proceed to Part 2.

---

### Part 2 — Cross-Game Consistency Check

Compare specific implementation elements across all game plugin files and `index.html`. Each row is a yes/no gate — flag and fix any failure before the new game's brief begins.

| Element | Rule to verify |
|---------|---------------|
| **Lobby button listener** | Pattern is `playLaunch(); activeGameId = '[abbr]'; showScreen('screen-[abbr]-menu');` — in that order. No `updateSliderTheme()` call (handled by `openSoundOverlay()` automatically). |
| **Menu section class** | No `min-h-screen` on any game menu section. Standard pattern: `relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6`. |
| **Sound button position** | Sound button is `absolute top-4 right-4` within a `relative` section. Section must be content-height (no `min-h-screen`) or the button detaches visually from the content. |
| **Sound button listeners** | `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements globally at script execution time (top-level `querySelectorAll` — line 534). Since all HTML is parsed before scripts run, this covers every game automatically. Newer games (NAT, DSD, GTH, BLD, DYB, PASS) also wire them explicitly inside their `DOMContentLoaded` block — redundant but harmless. Older games (LI5, GM, SS, JEC, YGI, LTTP) rely on the engine.js global only — confirmed correct. ✅ All 11 games audited June 2026. |
| **Settings pill toggles** | Only `pill-active-[colour]` is added or removed — the `.pill` base class is NEVER removed from any pill. Grep for `classList.toggle('pill'` and `classList.remove('pill'` — both are prohibited. |
| **Decision modal class strings** | Every `overlay-modal-inner` div has `border border-[brand]-300`. Data overlays (`overlay-data-inner`) are exempt. |
| **Quit overlay copy** | Game-voiced heading, subtext, confirm label, cancel label. Grep for generic strings: `"Quit game"`, `"Are you sure"`, `"Yes"`, `"No"`. |
| **How-to overlay structure** | Thematic title block (sticky) → step cards → "Winning and Scoring" card → ✨ Sylly Mode card → close button. See `ui-style.md` § How-to Overlay Standard. |
| **Play-again flow** | Every gameover restart button opens a confirmation overlay — no direct call to a reset/start function on button click. |
| **`allScreens[]` registration** | Every screen ID in every plugin appears in `engine.js` `allScreens[]`. |
| **`resetToLobby()` teardown** | Every overlay from every game is hidden in `resetToLobby()` in `engine.js`. |

**Gate:** All items pass (or failures are logged and fixed) → Protocol B Step 1 (brief) may begin.
