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

---

### 2. Technical Debt Harvest

Scan the plugin JS for these specific anti-patterns:

- [ ] **No naked `setTimeout`** — any `setTimeout` present must have an inline comment explaining why a delay is necessary (not just what it does)
- [ ] **No hardcoded shadows** — no magic numbers that duplicate a setting's default (e.g., writing `+10` in scoring logic when `natEscapePoints` is the variable to use)
- [ ] **No global-scope event listeners** — all `addEventListener` calls for this game must live inside an init or start function, not at top-level script execution
- [ ] **No surviving `TODO` / `FIXME` comments** — grep the plugin for these; resolve or consciously defer with a dated note
- [ ] **No engine duplication** — check that no function in the plugin reimplements something already in `engine.js` (audio, `showScreen`, `normaliseWord`, overlay patterns)

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

- [ ] **Layout pattern correctly chosen** — screens with a persistent action button use `h-screen overflow-hidden` + sticky footer; all others use `min-h-screen overflow-y-auto` centred layout (see `ui-style.md`)
- [ ] **`min-h-0` on scroll bodies** — every `flex-1 overflow-y-auto` body inside an `h-screen` container also has `min-h-0` (without it, the body won't constrain)
- [ ] **Z-index stack respected** — quit/settings overlays are `z-[80]`; how-to/history overlays are `z-[90]`; sound overlay is `z-[110]` and always highest (see `ui-style.md` Z-Index Stack)
- [ ] **No `.focus()` on page load or screen show** — any programmatic focus call risks snapping the keyboard open on mobile; allowed only in explicit user-triggered input flows
- [ ] **Touch targets ≥ 44×44px** — all buttons have `min-h-11` or equivalent; no bare `<div>` used as a tap target
- [ ] **Speaker + ✕ on every screen** — full-screen menus use `absolute top-4 right-4` speaker; gameplay screens use the header row pattern

---

## Protocol B: Skeleton-First Build Order

Follow this sequence strictly. Do not skip ahead to logic injection.

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
