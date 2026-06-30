# Phase Gate: The Studio Audit — Little Sylly Games

## When to Run
- **Protocol A (Phase Gate):** After every completed game or major phase. Run BEFORE writing the phase snapshot — the snapshot is a confirmation, not a discovery.
- **Protocol B (Skeleton-First):** At the start of coding any new game. No game logic until the skeleton passes.
- **Protocol C (Pre-Game Studio Sweep):** Before any new game's Phase 1 brief is written. Both parts must pass before Protocol B Step 1 begins.

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
- [ ] **Implementation notes current** — `docs/implementation-notes/[abbr]-implementation-notes.md` exists for this game; any bugs resolved or design decisions made during this phase are logged under the appropriate section (Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps)

---

### 2. Technical Debt Harvest

Scan the plugin JS for these specific anti-patterns:

- [ ] **No naked `setTimeout`** — any `setTimeout` present must have an inline comment explaining why a delay is necessary (not just what it does)
- [ ] **Timers cleared on every exit** — grep the plugin for `setInterval` / `setTimeout` countdown/turn timers; every handle must be cleared in the quit-confirm handler, in `resetToLobby()`, AND before any early phase-ending transition. A handle left running fires against the next screen's state (LI5 phantom turn timer). See `logic-engine.md` § Timer Lifecycle.
- [ ] **No hardcoded shadows** — no magic numbers that duplicate a setting's default (e.g., writing `+10` in scoring logic when `natEscapePoints` is the variable to use)
- [ ] **Global-scope event listeners are acceptable in this SPA** — `index.html` is fully parsed before any `<script>` runs (scripts are at the bottom of `<body>`), so top-level `addEventListener` calls in plugin files can safely reference DOM elements. This is the established pattern for the older eight Phase-22 games (LI5, GM, SS, JEC, YGI, LTTP, DSD, BLD) and is not a bug. However, **new games should prefer `DOMContentLoaded`** wrappers for clarity and forward-compatibility. Flag only if a listener references an element that does not exist in `index.html` at all, or if a listener fires during a screen it was not intended for.
- [ ] **No surviving `TODO` / `FIXME` comments** — grep the plugin for these; resolve or consciously defer with a dated note
- [ ] **No engine duplication** — check that no function in the plugin reimplements something already in `engine.js` (audio, `showScreen`, `normaliseWord`, overlay patterns)
- [ ] **No `window.` prefix on `let`-declared engine-multiplayer globals** — grep the plugin for `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode`. These are `let`-declared and NOT on `window` — any `window.` prefix returns `undefined` silently. Note: `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.mpLobbyStyle`, `window.mpLobbyRoster` ARE on `window` (declared as `window.x = ...` in `engine-multiplayer.js`) — using `window.` prefix on these is correct and intentional.
- [ ] **Team games use `showWhoFirst()`** — any game with two competing teams must call `showWhoFirst(config)` from `engine.js` for pre-game order selection. No plugin may define its own equivalent screen. Grep the plugin for `showScreen` and verify no bespoke first-team screen exists.
- [ ] **Pass-gates on all role/team transitions** — every screen showing private information (Captain grid, role reveal, team-specific content) is preceded by a named `screen-[abbr]-pass-gate` confirmation screen. Grep the plugin for `showScreen('screen-[abbr]-captain')` and verify it is always called via the pass-gate function, never directly.
- [ ] **Play-again uses confirmation modal** — no "New [Game]" / "Play Again" button calls reset state directly; must go through a Decision Modal (z-[90]) first. Grep for `addEventListener('click'` on the gameover play-again button and verify the handler shows an overlay, not `resetState()` or `showSetup()` directly.
- [ ] **Team setup screens match standard** — for any team game, verify Screen 1: `relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6` section class, `absolute top-4 right-4` header, NO card wrapper around inputs, `border-2 border-stone-200 bg-white … placeholder-stone-300` input style, named-defaults hint text, pre-fill only for custom names. Screen 2 (if applicable): bare team sections (no cards), game-coloured team labels (`text-[brand]`), team size pills without card wrapper. See `@ui-style.md` § Team Setup Screen Standard.
- [ ] **Game brand colour applied consistently** — primary CTA buttons and `screen-who-first` accent use the game's full brand colour (via `accentBtnClass`/`accentTextClass` in `showWhoFirst()` config). Settings button uses light brand tint (`bg-[brand-100] hover:bg-[brand-200] text-[brand-700]`). ALL ON/OFF toggles (including Sylly Mode) use `game-toggle-on-[colour]` — `sylly-toggle-on` is no longer used anywhere. How to Play button is always `bg-stone-700`. Exit (✕) and back (←) buttons are always neutral. See `@ui-style.md` § Game Brand Colour — Scope.

#### MDLM technical-debt checks (recurring across the suite — elevated June 2026)

These four patterns each appeared in 3+ games during the Fable audit. In MDLM, every interactive control on a shared screen is on *every* device — the absence of a broadcast is not a guard.

- [ ] **Host-only interactions have an explicit client early-return** — any control that should only act on the host (scoring CTAs, "Next round/course/situation", merge taps, vote-resolution buttons) must start with `if (window.syllyMultiplayerMode === 'client') return;`. An *absent* broadcast branch does NOT stop a client running the logic locally and diverging until the next SYNC. Grep every gameplay button handler for a `syllyMultiplayerMode` branch; a host-only action with no client guard is a [BUG]. *[Elevated from jec-impl-notes J3/J4, ygi-impl-notes Y5, nat-impl-notes N2, lttp-impl-notes L5.]*
- [ ] **Secondary-phase missing-handler audit** — the missing-handler audit (logic-engine § Interceptor Pattern) must cover phases reached *after* the core MP loop: voting, tie-breaks, sudden-death, intel/guess phases, and endgame resolution. These are the ones repeatedly shipped pass-the-phone-only and never made MP-aware. For each such phase ask "can a non-host device submit here?" and "does this phase have ACTION/SYNC packets at all?". A phase with zero packets that runs a local pass-the-phone flow on every device is a [BUG]. A `*ReadyCheck` array that is reset but read nowhere is a reliable tell that per-device collection was scaffolded and abandoned. *[Elevated from ss-impl-notes S12, ygi-impl-notes Y4, lttp-impl-notes L6, nat-impl-notes N2.]*
- [ ] **SYNC handlers render, never re-resolve** — a client's SYNC handler applies the authoritative payload and renders; it must not call the resolve/score function again, nor push a second log/history entry the resolver already pushed. Split resolve-and-render functions before reusing the renderer in a SYNC handler. Grep for `.push(` inside both the resolver and the SYNC handler for the same array — double-push corrupts round logs and history counts. *[Elevated from ss-impl-notes S9, ygi-impl-notes Y3, bld-impl-notes Bug 12.]*
- [ ] **Mid-game `fixed inset-0` overlays torn down in BOTH reset paths** — any overlay openable during play (slick-picker, tip overlay, message interrupt, canvas wrapper) must be hidden in `resetToLobby()` AND in every "return to menu" / quit-confirm handler. A surviving `fixed inset-0` overlay becomes an invisible full-screen tap interceptor over the next screen. Grep the plugin's overlays against both teardown paths. *[Elevated from dyb-impl-notes BUG-05, gth-impl-notes canvas wrapper, lttp-impl-notes tip overlays, ygi-impl-notes ygi-help-tip-overlay.]*

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

- [ ] **The Stack — positive check (do this one by eye, every screen).** Read each screen and ask: *does it read as ONE tight column (Header → Stage → Controls), centred in the viewport, with no zone pinned to a screen edge and no large dead band between zones?* If the title is jammed against the top of the glass and the buttons against the bottom with empty space in the middle, it's wrong — even if the button is "reachable" and the screen is technically valid. That sparse, edge-pinned look is the recurring failure this check exists to catch. See `ui-style.md` § The Stack. *[Elevated June 2026 — recurring across the suite; PASS retrofit.]*
- [ ] **One column, no split.** Every screen's `<section>` is `flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto`, with Header + Stage + Controls as **siblings inside one** `flex flex-col w-full max-w-sm gap-4` div. Grep the plugin for `getElementById('…-body')` / `getElementById('…-footer')` (or equivalent) — content rendered into one wrapper and buttons into a separate footer wrapper detaches them; merge into the single column. *[frt-implementation-notes BUG-02.]*
- [ ] **No legacy sticky-footer in new games** — grep the plugin's screens for `h-screen` and `flex-1`/`flex-shrink-0` layout splits. New games use the Stack for **every** screen, including main gameplay (project decision, June 2026 — whole-Stack scrolling preferred even for long card hands). Any `h-screen` screen in a game shipped after this date is a [BUG] unless explicitly justified in the impl notes. Existing pre-June-2026 sticky-footer screens are migrated opportunistically; log each migration. *[Elevated June 2026.]*
- [ ] **No `my-auto` as a vertical-centering workaround** — grep the plugin JS for `my-auto` in `className` strings. `my-auto` inside an `overflow-y-auto` column silently does nothing — the column's computed height equals its content height, so there is no free space to distribute. Centring is the `<section>`'s job (`items-center justify-center`), never the child's. *[frt-implementation-notes BUG-02.]*
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
- Read the **Template Gaps** section of every existing `docs/implementation-notes/[abbr]-implementation-notes.md` file
- For each gap, assess whether it applies to the new game's design — if yes, resolve it in the tech spec before coding begins
- This is how recurring bugs from past games get prevented proactively rather than discovered again
- **Gate:** All applicable template gaps acknowledged → proceed to Step 1

### Step 1 — Brief (before any JS)
- Fill out `docs/new-game-brief-[name].md` using `docs/rules/new-game-brief-template.md` (full three-stage protocol: `docs/rules/new-game-process.md`)
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
- **Before any MDLM testing:** grep the plugin for `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode` — these are `let`-declared and a `window.` prefix returns `undefined` silently (BLD Bug 8)
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
| **Sound button listeners** | `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements via a top-level `querySelectorAll` at script-execution time. **This only covers games whose HTML appears BEFORE the `<script>` block.** In `index.html` the scripts sit at ~line 3823–6774; games whose HTML sections appear after line 6774 (NT ~7174, FRT ~7558, SHP ~7939, FLW ~8179) are NOT covered by the engine selector — their sound buttons are inert unless re-wired in `DOMContentLoaded`. FRT is the reference implementation; NT, SHP, and FLW were fixed June 2026. Any future game added at the end of `index.html` **must** include DOMContentLoaded re-wiring in its plugin file — do not rely on the engine global alone. Older games (LI5, GM, SS, JEC, YGI, LTTP, NAT, DSD, GTH, BLD, DYB, PASS) have HTML before the scripts and are covered by the engine global. ✅ All 16 games verified June 2026. |
| **Settings pill toggles** | Only `pill-active-[colour]` is added or removed — the `.pill` base class is NEVER removed from any pill. Grep for `classList.toggle('pill'` and `classList.remove('pill'` — both are prohibited. |
| **Decision modal class strings** | Every `overlay-modal-inner` div has `border border-[brand]-300`. Data overlays (`overlay-data-inner`) are exempt. |
| **Quit overlay copy** | Game-voiced heading, subtext, confirm label, cancel label. Grep for generic strings: `"Quit game"`, `"Are you sure"`, `"Yes"`, `"No"`. |
| **How-to overlay structure** | Thematic title block (sticky) → step cards → "Winning and Scoring" card → ✨ Sylly Mode card → close button. See `ui-style.md` § How-to Overlay Standard. |
| **Play-again flow** | Every gameover restart button opens a confirmation overlay — no direct call to a reset/start function on button click. In multiplayer, the confirm handler calls `mpReturnToLobby()` (host) / `resetToLobby()` (client) with the dynamic confirm label — see `logic-engine.md` § Play-Again Return Pattern. |
| **`allScreens[]` registration** | Every screen ID in every plugin appears in `engine.js` `allScreens[]`. |
| **`resetToLobby()` teardown** | Every overlay from every game is hidden in `resetToLobby()` in `engine.js`. |
| **No `window.` prefix on `let`-declared MP globals** | Grep every plugin for `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode` — `let`-declared, so the `window.` prefix returns `undefined` silently (BLD Bug 8). `window.syllyMultiplayerMode` / `window.syllySyncLocked` / `window.mpLobbyStyle` / `window.mpLobbyRoster` are correct WITH the prefix. |
| **ACTION handler completeness** | For every multiplayer game phase, every ACTION a non-host device can send has a handler in `[abbr]HandleEnvelope`. Missing handlers silently drop submissions — they do not error (see `logic-engine.md` § Missing handler audit). |
| **`mpSerialiseSettings` coverage** | Every game's `mpSerialiseSettings` entry covers every setting the host can change. A missing field means clients silently play with different rules. |
| **`MP_GAME_CONFIGS` field completeness** | Every game's entry has all required display fields (`gameName`, `emoji`, `brandBtnClass`, `ptpLabel`/`lobbyCtaLabel`) and correct player-count getters (`getMaxPlayers`, plus `getMinPlayers` for any game with a minimum above 2). A missing display field renders "undefined" on `screen-mp-mode`; a missing `getMinPlayers` lets the lobby start under-strength. See `logic-engine.md` § MP_GAME_CONFIGS Entry Schema. |

**Gate:** All items pass (or failures are logged and fixed) → Protocol B Step 1 (brief) may begin.
