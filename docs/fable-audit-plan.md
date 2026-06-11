# Studio Audit Plan — Little Sylly Games
**Prepared for:** Fable (Claude Fable 5)
**Prepared by:** Claude Sonnet 4.6 + Sam
**Date:** June 2026
**Purpose:** A structured, end-to-end audit of every layer of the project — rule files, documentation, code-map, per-game implementations, and data — to drive consistency across all 11 games and prevent recurring implementation issues.

---

## Before You Begin — Mandatory Orientation

Read these files in full before starting any phase. Do not skip any.

| File | Why |
|------|-----|
| `CLAUDE.md` | Master project instructions — project structure, tech stack, anti-patterns, skill triggers |
| `.claude/rules/game-identities.md` | Per-game bible — every game's terminology, settings, overlays, scoring, multiplayer config |
| `.claude/rules/logic-engine.md` | Engine rules — audio catalogue, screen routing, multiplayer sync, PWA checklist |
| `.claude/rules/ui-style.md` | UI standards — overlay patterns, layout rules, brand colours, menu standard |
| `.claude/rules/definitions.md` | Naming conventions, comment style, data schema |
| `.claude/rules/phase-audit.md` | Protocol A/B/C — the audit checklists this plan is modelled on |
| `docs/code-map.md` | Current surgical reference — screen IDs, overlay IDs, key functions |

**Project summary (read before the files above if cold-starting):**
- Single-page app, vanilla JS + HTML5 + Tailwind CSS (local, no CDN)
- 12 game plugins, all sharing one `index.html`, one `engine.js`, one `css/styles.css` — 11 shipped + BLD (in active testing)
- All games are multiplayer-capable via Firebase (multiplayer-only games: GTH, DYB, PASS, BLD)
- PWA with offline service worker (`sw.js`, currently v101)
- Australian English throughout — colour, flavour, organise. No npm. No build tools.

**Audit scope:** All 12 plugins, BLD included. BLD is mid-testing, so code-level findings there may already be known — cross-check against `bld-implementation-notes.md` before logging duplicates.

---

## Audit Principles

These govern every phase:

1. **Do not write game code.** This audit fixes documentation, rule files, and code-map accuracy. Bug discoveries are logged in implementation notes — not fixed in code unless the fix is a one-line doc string correction.
2. **Update files atomically.** Complete one phase fully before moving to the next.
3. **Reality wins over docs.** When the JS file and the documentation disagree, the JS file is authoritative. Update the doc, not the code.
4. **Flag, don't invent.** If something is ambiguous, write `[AUDIT FLAG: ...]` in the relevant doc and note it in the Phase Summary at the end. Do not guess at intent.
5. **Cross-game patterns are the priority.** A bug in one game is a bug. The same pattern in three games is a missing rule. Elevate recurring issues to `logic-engine.md` or `phase-audit.md`.
6. **All findings feed the fix plan.** Every issue found — minor polish, flavor text drift, deprecated class, silent multiplayer drop, critical logic bug — gets logged in `docs/fable-fix-plan.md` with a severity tag. The fix plan is the deliverable for the developer; impl notes are the permanent record. Nothing gets silently discarded.

---

## Phase 0 — Pre-Audit Housekeeping

**Goal:** A clean, reviewable starting point. Do not begin Phase 1 until all three items are done.

1. **Commit the current working tree.** The repo has extensive uncommitted changes. An audit that edits a dozen docs on top of uncommitted work makes the audit's own changes impossible to review. Commit (or have the developer commit) everything first, so every audit edit is isolated in its own diff.
2. **Checkpoint commit after each phase.** One commit per completed phase (e.g. `audit: phase 1 — rules & meta-docs`). This makes each phase reviewable and lets a later session see exactly where the audit stopped.
3. **Session & context management.** This audit will NOT fit in one context window — 12 plugin files plus `index.html` is far too much. Plan for one phase (or one sub-phase) per session. The Progress Tracker below plus the per-phase Summary entries (Phase 6 Output A) are the hand-off state between sessions: update both **before** ending a session, not after starting the next one. A fresh session reads: this document top-to-bottom → the Progress Tracker → the partial Audit Findings section → resumes.

### Progress Tracker

Update the status column as phases complete. A fresh session starts at the first non-✅ row.

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Housekeeping | ☐ | |
| 1A — CLAUDE.md | ☐ | |
| 1B — game-identities.md | ☐ | |
| 1C — logic-engine.md | ☐ | |
| 1D — ui-style.md | ☐ | |
| 1E — phase-audit.md | ☐ | |
| 1F — definitions.md | ☐ | |
| 2 — Code Map | ☐ | |
| 2B — Engine & Infrastructure | ☐ | |
| 3 — Per-Game (track per game in Notes) | ☐ | LI5 / GM / SS / JEC / YGI / LTTP / NAT / DSD / GTH / DYB / BLD / PASS |
| 4 — Data | ☐ | |
| 5 — Documentation Closure | ☐ | |
| 6 — Summary & Fix Plan | ☐ | |

---

## Phase 1 — Rules & Meta-Docs Audit

**Goal:** Bring `CLAUDE.md` and all `.claude/rules/` files into perfect sync with the current state of the project.

### 1A — CLAUDE.md

Read `CLAUDE.md` in full. Check each section against reality:

| Check | What to verify |
|-------|---------------|
| **Project Structure map** | Does the file tree match the actual repo? All 11 game files listed? `js/lib/` files listed? `data/` files current? `docs/` subdirectories current? |
| **Load order** | Does the `<script>` load order in CLAUDE.md match `index.html`? |
| **SW Version** | Does the stated SW version match `sw.js` line 4 (`CACHE_NAME`)? |
| **Current Focus** | Does the Phase, Gold Master count, and BLD/pending status accurately reflect the project state? |
| **Key references** | Do all listed file paths exist? (`docs/archive/phase31-snapshot.md`, etc.) |
| **Skills section** | Are all skills still relevant and accurately described? Are any skills obsolete? |
| **Anti-Patterns** | Are the anti-patterns still the correct ones? Any new anti-patterns discovered in recent phases? |

**Output:** Update `CLAUDE.md` in place. Note every change in the Phase 1 Summary section at the bottom of this document.

---

### 1B — game-identities.md

This is the per-game bible. For each of the 11 games, verify these sections exist and are accurate:

**For every game entry:**

| Section | Check |
|---------|-------|
| **Identity block** | Full name, tagline, key file, brand colour, active pill class, state flow |
| **Terminology table** | Every on-screen term the game uses. No generic strings like "Score", "Round", "Player" |
| **Settings table** | Every setting: display name, options, default, internal variable name, internal values |
| **Special Mechanics** | Describes any non-standard logic. Check it matches the JS file. |
| **Overlay Types table** | Every overlay: ID, pattern (data/modal), z-index, notes |
| **Screens table** | All non-standard screens listed (menu + setup are implicit; other screens need explicit entries) |
| **Multiplayer section** | Mode, min/max players, rosterConfig type, key ACTION packets, key SYNC packets |

**Known gaps to check specifically:**
- GTH: `game-identities.md` does not have a Screens table — it needs one matching `screen-gth-patient-intake`, `screen-gth-canvas`, `screen-gth-waiting-room`, `screen-gth-shrink-intro`, `screen-gth-case`, `screen-gth-case-report`, `screen-gth-big-reveal`, `screen-gth-final-report`
- PASS: Verify the Multiplayer section ACTION/SYNC packets match `js/games/pass.js` (Phase 32 was the last ship)
- BLD: State flow shows `BLD SETUP (PTP only)` — verify this branch is documented correctly
- DYB: `game-identities.md` uses brand colour `stone-700` — verify `pill-active-stone` exists in `css/styles.css`
- All games: Confirm "Sylly Mode" is always the last setting in the Settings table

**Sequencing note:** Phase 1B is a *structural* pass — sections present, internally consistent, no obvious staleness. Deep verification against the JS files (does Special Mechanics actually match the code?) happens in Phase 3, which reads every plugin in full anyway. When Phase 3 finds a doc/code mismatch, correct `game-identities.md` at that point (Principle 3: reality wins). Do not read all 12 plugin files during 1B — that doubles the work for no gain.

**Output:** Update `game-identities.md` in place.

---

### 1C — logic-engine.md

| Section | Check |
|---------|-------|
| **Audio Function Catalogue** | All 14 audio functions listed? Any new ones added since? `playHullThud`, `playAbyssThud`, `playSonarPing` present? |
| **`showWhoFirst()` config** | All config keys documented? `accentBtnClass` / `accentTextClass` present? |
| **Multiplayer Sync Module** | `window.` vs `let` declaration table — does it match `engine-multiplayer.js` actual declarations? |
| **`getMuteToggleOnClass(gameId)` function** | This was added in June 2026. Is it documented here? If not, add it to the Key Functions section or a relevant section. |
| **resetToLobby() Multiplayer Additions** | Does the listed teardown code match what's actually in `engine.js`? |
| **PWA Precache list** | Does the list in `logic-engine.md` match `sw.js` `PRECACHE_URLS[]` exactly? |
| **SW version** | Matches `sw.js`? |
| **Checklist: Adding a New Game** | All items still accurate? Any new items to add from recent phases? |
| **Play-Again Return Pattern** | Confirm the `mpReturnToLobby()` pattern is documented correctly |
| **MDLM Patterns** | All pattern notes current and accurate? |

**Output:** Update `logic-engine.md` in place.

---

### 1D — ui-style.md

| Section | Check |
|---------|-------|
| **Sound Overlay theming** | Range class reference table — all 11 games listed? BLD and DYB added? PASS added? |
| **Slider theming** | `updateSliderTheme()` call now inside `openSoundOverlay()` — is this documented? |
| **Mute toggle theming** | `getMuteToggleOnClass(gameId)` behaviour — is this documented? The mute toggle (`#global-mute-toggle`) now uses per-game `game-toggle-on-*` classes. |
| **`game-toggle-on-[colour]`** | Is this class family documented as the required pattern? Is `sylly-toggle-on` explicitly deprecated? |
| **Per-game brand reference table** | All 11 games present? DYB (`stone-700`), PASS (`zinc-900`), BLD (`yellow-500`) included? `accentBtnClass`, `accentTextClass`, toggle class, settings button class all filled in? |
| **How-to overlay per-game table** | All 11 games? Sylly Mode name column accurate for each? |
| **Universal Menu Standard** | Table includes all 11 games? Play CTA labels correct? |
| **Settings Card Standard** | `shrink-0` rule for toggles documented? Sub-option slider pattern documented? |
| **Contextual Tip Icons** | Pattern complete and accurate? `[abbr]-tip-overlay` teardown rule documented? |
| **Two-Pattern Overlay Library** | Exact class strings for both patterns present and accurate? |

**Output:** Update `ui-style.md` in place.

---

### 1E — phase-audit.md

| Section | Check |
|---------|-------|
| **Protocol A §2 Technical Debt** | `game-toggle-on-[colour]` rule: the audit item says "ALL ON/OFF toggles (including Sylly Mode) use `game-toggle-on-[colour]` — `sylly-toggle-on` is no longer used anywhere." Verify this is the current rule. |
| **Protocol C Part 2 table** | "Sound button listeners" row — is it current? (Should say ✅ All 11 games audited June 2026) |
| **Protocol C Part 2 table** | Any missing rows that should be added based on lessons from GTH, DYB, BLD, PASS? |

**Output:** Update `phase-audit.md` in place.

---

### 1F — definitions.md

| Section | Check |
|---------|-------|
| **Variable Naming table** | All active game prefixes present? (DYB: `dyb`, GTH: `gth`, BLD: `bld`, PASS: `pass`) |
| **Function Naming table** | Patterns accurate? Any new patterns from recent games? |
| **Technical Project Terms** | `getMuteToggleOnClass`, `game-toggle-on-*`, `mpClientPlayerRef`, `mpPlayersListener` — documented? |
| **Data Schema** | `words.json` schema accurate? `gth-data.json` schema accurate? |

**Output:** Update `definitions.md` in place.

---

## Phase 2 — Code Map Audit

**Goal:** `docs/code-map.md` must be a precise, exhaustive, current reference. Every screen ID, overlay ID, and key function for every game must appear here.

**Note:** `code-map.md` currently says "Updated: Phase 25" — it is significantly out of date. GTH, DYB, BLD, and PASS were all added after Phase 25.

### For each game section in code-map.md:

1. Read the game's JS file (`js/games/[abbr].js`)
2. Read the game's section in `index.html`
3. Compare against what's currently in `code-map.md`

**Add/update for each game:**
- Screen IDs table (all screens including multiplayer mode/lobby screens)
- Overlay IDs table (ID, pattern, what opens it)
- Key buttons table (button ID → action)
- Key functions table (function name → one-line purpose)

**Games that need new sections added (missing entirely or severely incomplete):**
- **GTH** — add full section: patient intake screen, canvas screen, waiting room, shrink intro, case screen, case report, big reveal, final report; all overlays; key functions including `CanvasDraw` references
- **DYB** — add full section: seating, shake, table, showdown, spirit board, gameover; all overlays including `dyb-slick-picker-overlay`; key functions
- **BLD** — add full section: setup, seating, pass gate, role reveal, main, aftermath; all overlays; key functions
- **PASS** — add full section: seating, table, round wrap, gameover; all overlays; key functions; `passAbyss` Sylly Mode reference

**Global / Engine section — add missing items:**
- `getMuteToggleOnClass(gameId)` — new function, maps `activeGameId` to `game-toggle-on-*`
- `updateSliderTheme(gameId)` — already exists, confirm it's documented
- `toggleMute()` — confirm documented
- `mpReturnToLobby()` — multiplayer play-again return

**Format to maintain:**
```
## Game Name (ABBR)
**JS file:** `js/games/[abbr].js`
**Brand colour:** `[colour]`
**Lobby button:** `#btn-[abbr]`

### Screens
| ID | Purpose |
|----|---------|

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|

### Key buttons
| ID | Action |
|----|--------|

### Key functions
| Function | Purpose |
|----------|---------|
```

**Output:** Update `docs/code-map.md` in place. Mark it "Updated: Phase 32 / June 2026" at the top.

---

## Phase 2B — Engine & Shared Infrastructure Audit

**Goal:** Audit the shared layers as *code*, cross-checked against each other — not just against docs. Phases 1–2 verify documentation; nothing else in this plan verifies that `engine.js`, `engine-multiplayer.js`, `index.html`, `css/styles.css`, and `sw.js` agree with one another. Mismatches here break all 12 games at once.

Several of these checks are mechanical — write small throwaway Node scripts (run with `node`, not added to the repo) rather than eyeballing. **Never edit `index.html` with the Edit tool for systematic changes** (UTF-8 mojibake risk — established project rule); the audit shouldn't be editing it at all, but scripted *reads* are fine.

### 2B-1 — Screen registry integrity (scripted)
- Extract every `<section id="screen-...">` from `index.html`; extract every entry in `allScreens[]` in `engine.js`. Diff both directions:
  - HTML section not in `allScreens[]` → **ghost screen** that never hides — `[CRITICAL]`
  - `allScreens[]` entry with no HTML section → dead registration — `[BUG]`

### 2B-2 — Duplicate element IDs (scripted)
- Extract every `id="..."` in `index.html` and find duplicates. `getElementById` silently returns the first match — a duplicate ID is an invisible bug factory in a single-file SPA with 12 games' worth of markup.

### 2B-3 — `resetToLobby()` teardown completeness
- Enumerate every overlay element in `index.html` (`fixed inset-0` containers with `overlay-data-backdrop` / `overlay-modal-backdrop` / high z-index). Verify each one is hidden in `resetToLobby()`. A missing entry = a stale overlay (or invisible ghost interceptor — DYB BUG-05) surviving into the lobby.

### 2B-4 — Engine theming maps cover all 12 games
- `updateSliderTheme()` map in `engine.js`: entry for every game abbr, each pointing at a `[abbr]-range` class that exists in `css/styles.css`.
- `getMuteToggleOnClass(gameId)`: entry for every game, each pointing at an existing `game-toggle-on-*` class.

### 2B-5 — CSS class cross-reference (scripted)
- Every `pill-active-*`, `game-toggle-on-*`, and `*-range` class referenced anywhere in `index.html` or any JS file exists in `css/styles.css` (a missing class fails *silently* — element just renders unstyled).
- Reverse direction: classes defined in `styles.css` with zero references → flag as dead code `[POLISH]` (don't delete during audit).

### 2B-6 — `MP_GAME_CONFIGS` vs game-identities
- For every multiplayer game: `supportedModes`, `recommendedMode`, `multiplayerOnly`, min/max players, and `rosterConfig` in `engine-multiplayer.js` match the game's Multiplayer section in `game-identities.md`. Reality wins — fix the doc.

### 2B-7 — Function-existence sweeps (scripted)
- Every `play[A-Z]*(`... call across all plugins resolves to a function defined in `engine.js`. A call to an undefined audio function throws inside a click handler and silently kills the rest of that handler.
- Every function invoked from `mpHandleEnvelope` (and from each game's `[abbr]HandleEnvelope`) is defined. Per `logic-engine.md`, a crash inside a Firebase callback cascades — treat any miss as `[CRITICAL]`.

### 2B-8 — Service worker integrity (scripted)
- Every URL in `PRECACHE_URLS[]` exists on disk. **`cache.addAll()` is atomic — one 404 fails the entire SW install**, silently breaking offline mode for every user. Any missing file is `[CRITICAL]`.
- Reverse: every file the app actually loads (`<script src>`, `fetch`ed data files, manifest) is either precached or deliberately runtime-only (Firebase libs are deliberately not precached — lazy-loaded). Flag undocumented omissions.
- `<script>` load order in `index.html` matches the documented load order in `CLAUDE.md`.

### 2B-9 — index.html section headers
- Every game has its `<!-- ════ GAME NAME ════ -->` section header comment block, and the screen/overlay lists inside each header match reality.

**Output:** Findings logged to fix plan with severity tags. Doc corrections applied in place. Engine-level bugs are NOT fixed (Principle 1) — logged only.

---

## Phase 3 — Per-Game Audit

**Goal:** For each of the 12 games (BLD included), verify: (a) the code matches the documented identity, (b) flavour text is consistent and thematic, (c) known anti-patterns are absent.

**This is the largest phase — budget one session per 2–3 games.** Update the Progress Tracker notes column with which games are done before ending each session.

**For each game, read:**
1. `js/games/[abbr].js` — full file
2. The game's section in `index.html` (all screens and overlays for that game)
3. The game's entry in `game-identities.md`
4. The game's `docs/implementation-notes/[abbr]-implementation-notes.md`

**Run these checks for every game:**

### Check A — Flavor Text Consistency
Grep the JS and HTML for user-facing strings. Verify against the Terminology table in `game-identities.md`:
- Screen headings match the game's voice
- Button labels match terminology (e.g. "New Expedition 🦁" not "Play Again")
- Overlay titles match (e.g. "The Permit Office 🦁" not "Settings")
- Quit overlay: game-voiced heading, subtext, confirm label, cancel label — all four present and thematic
- Settings overlay title block: heading + subtitle present as first child of `overlay-data-inner`
- **Australian English sweep:** grep user-facing strings for `color`, `flavor`, `organize`, `recognize`, imperial units — flag any hit (Protocol A §3)
- **Legacy generic strings:** grep for `"Game Over"`, `"Round"`, `"Score"`, `"Points"`, bare `"Player"` — flag any not replaced by game vocabulary (Protocol A §3)

### Check B — Toggle Class Audit
Grep each game's JS and HTML for `sylly-toggle-on`. This class is deprecated. Every toggle must use `game-toggle-on-[colour]`. Flag any instance of `sylly-toggle-on` remaining in the game's HTML or JS.

### Check C — Technical Debt (Protocol A §2 checklist)
For each game:
- Any naked `setTimeout` without an inline comment? Flag it.
- Any `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode`? These are `let`-declared — `window.` prefix returns `undefined` silently. Flag immediately.
- `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.mpLobbyStyle` — these ARE correct with `window.` prefix.
- Any `classList.remove('pill')` or `classList.toggle('pill', ...)` calls? These strip base pill styles. Flag.
- Any play-again button that calls a reset function directly (bypassing a confirmation modal)? Flag.
- Any `h-screen` usage on a screen where there is no sticky-footer CTA requirement? Flag.
- Any `addEventListener` at top-level script execution (outside an init/`DOMContentLoaded` block)? Flag (Protocol A §2).
- Any surviving `TODO` / `FIXME` comments? Flag with location (Protocol A §2).
- Any hardcoded magic numbers that shadow a setting's default (e.g. literal `+10` where `natEscapePoints` is the variable)? Flag.

### Check D — Multiplayer Integrity
For multiplayer-capable games:
- Does every submittable action button have `btn-mp-action` class?
- Are there any ACTION packet types implied by the state flow but missing from `mpHandleEnvelope`? (Silent drop = impossible to test) — walk every phase and ask "can a non-host device submit here?"
- Does the settings overlay disable/force the right settings when `syllyMultiplayerMode !== 'single'`?
- Does the game have a `mpSerialiseSettings` entry (SETTINGS_SYNC serialiser) covering every setting the host can change? A missing field means clients silently play with different rules.
- Does the play-again confirm handler call `mpReturnToLobby()` when `syllyMultiplayerMode !== 'single'` (host) / `resetToLobby()` (client), with the dynamic confirm label ("Restart in Lobby 🔄" / "Leave Session")?

### Check E — Settings Completeness
For each game's settings overlay HTML:
- Is "Sylly Mode" the last card?
- Does every toggle have `shrink-0` class?
- Does every pill group correctly add/remove `pill-active-[colour]` (never `pill`)?
- Does the settings overlay scroll reset to 0 on open (`.overlay-data-inner.scrollTop = 0`)?

### Check F — Overlay Borders
Grep the game's HTML for `overlay-modal-inner`. Every instance must have `border border-[brand]-300`. Data overlays (`overlay-data-inner`) are exempt.

### Check G — Secret Mode / Expansion Hooks
For games that draw from `words.json` (LI5, GM, SS, NAT, DSD, and any others found):
- Is the `applyExpansionOverrides()` / `[abbr]ApplyExpansionOverrides()` read wired at the settings-apply point?
- Is the `secretWords` pool substitution present in the game's start function AND the pool-refill path?
- Games that deliberately skip Secret Mode support: confirm the skip is documented somewhere (impl notes or game-identities) — if undocumented, log a `[DOC]` flag, not a bug.

### Per-Game Notes

**LI5:**
- Screen IDs are non-standard (legacy names: `#screen-menu`, `#screen-active-play` — no `li5-` prefix). Confirm this is intentional and documented in code-map.
- Verify `#li5-play-again-overlay` teardown is in `resetToLobby()`.

**Great Minds:**
- Brand colour in code-map says `violet-500` but `game-identities.md` says `purple-500`. Reconcile (check CSS class actually used in the HTML).
- Verify all 9 overlays from the overlay types table are in `resetToLobby()` teardown.
- Verify `gm-neural-library-overlay` z-[100] is correct.

**Secret Signals:**
- Verify `ss-play-again-overlay` is in `resetToLobby()`.
- Verify the Intel Phase (`ss-intel-*`) screens are all in `allScreens[]`.

**Just Enough Cooks (JEC):**
- Verify `jecApplyExpansionOverrides()` (not `applyExpansionOverrides()`) is used — naming collision note in `game-identities.md`.
- Verify ghost merge guard is in place in `jecApplyMerge()`.

**You Get It? (YGI):**
- Verify every display point replaces `[ ]` with `________` — 6 listed in `game-identities.md`.
- Verify `The Consensus` mode forces `ygiVerdictStyle = 'secret-ballot'` in multiplayer.

**Late to the Party (LTTP):**
- Verify `lttp-smalltalk-overlay` and `lttp-confirm-overlay` both clear on `resetToLobby()`.
- Verify `lttpPendingTag` is confirmed absent (removed; history schema uses `messageText` only).
- Verify `LTTP_SMALL_TALK` constant has 5 categories, 4 prompts each.

**Natural Selection (NAT):**
- Verify eviction tie-break: `natEvictedIdx = -1` path renders "No consensus reached" message, not a crash.
- Verify `natSyllyMode` (Survival of the Fittest) hides daily clues correctly.

**Deep-Sea Deploy (DSD):**
- Verify `dsdApplyDrift()` only shuffles unrevealed cells.
- Verify `dsdUpdateLegend()` is called on every captain screen open.
- Nuclear Mine: verify 2600ms delay before `dsdShowGameover()` with inline WHY comment on `setTimeout`.

**Group Therapy (GTH):**
- Verify `CanvasDraw.setTremor(wrapperEl, bool)` applies to the wrapper `<div>` — NEVER to `<canvas>` element.
- Verify Phase 2 timer: `GTH_PHASE2_BEGIN` carries `endTimestamp`; clients `startTimer(endTimestamp)`.
- Verify host submission bypass: host stores `gthAllDiagnoses` directly without Firebase round-trip.
- Verify `gth-new-session-overlay` and `gth-quit-overlay` are in `resetToLobby()`.

**Dicey Bluffs (DYB):**
- Verify `dyb-slick-picker-overlay` is in `resetToLobby()` teardown AND in `btn-dyb-quit-confirm` handler.
- Verify `dybCurrentBidderIdx` is NOT used as bidder in `dybResolveShowdown()` — should read from `dybAllegationHistory[last].playerIdx` (BUG-03 fix).
- Verify `dybActivePlayers.includes(mpMyPlayerIdx)` guard is in `DYB_SHAKE_ACTIVE` handler (BUG-02 fix).

**Bailed (BLD):**
- Verify `window.mpMyPlayerIdx` is NOT used anywhere — must be `mpMyPlayerIdx` (let-declared, BUG-08 pattern).
- Verify `bldShowTip(emoji, heading, lines[])` drives all contextual `[?]` buttons.
- Verify Plan 4 with 7+ players requires 2 Bails to fail (not 1).
- Verify `bld-second-chances-overlay`, `bld-pass-reveal-overlay`, `bld-role-help-overlay`, `bld-plan-detail-overlay`, `bld-tip-overlay`, `bld-new-night-overlay` — all in `resetToLobby()`.

**Pass (PASS):**
- Verify rank hierarchy comment: 3 < 4 < ... < A < 2 < Joker (2s are NOT in sequences).
- Verify Two-Natural-Card Anchor: sequences with Jokers require ≥ 2 natural cards.
- Verify full-circuit pass: if all pass, table clears (`passTableCombo = null`) and last leader plays on open table.
- Verify Sylly Mode (The Abyss): Abyss rendered inline above hand — NOT as an overlay (DYB BUG-05 ghost-interceptor lesson applied).

**Output per game:**
1. Bugs found → log in `docs/implementation-notes/[abbr]-implementation-notes.md` under Bug Index AND in the fix plan with severity.
2. Doc/code mismatches → correct `game-identities.md` (and `code-map.md` if affected) immediately, in the same session (Principle 3: reality wins). Do not defer doc fixes to a later phase.
3. Recurring patterns (2+ games) → log in Phase 3 Summary for elevation to rule files, and add a row to the Appendix seed list.
4. Before logging a BLD finding, check `bld-implementation-notes.md` — BLD is mid-testing and many issues are already known.

---

## Phase 4 — Data Audit

**Goal:** Verify the JSON data files are structurally correct, consistent, and ready to scale.

### 4A — words.json

Read `data/words.json`.

| Check | Rule |
|-------|------|
| **File format** | One compact entry per line (`JSON.stringify(entry)` — no multi-line pretty-print). Blank line between category groups. 16 categories, 15 separators. |
| **Category order** | `animals, food, places, objects, sports, nature, vehicles, jobs, activities, aussie_slang, pop_culture, people, brands, emotions, actions, music` — in this exact order |
| **Schema fields** | Every entry has: `id` (unique string), `word` (string), `nono_list` (array of 10), `category` (string), `difficulty` (1/2/3) |
| **animals category `nono_list[0]`** | Must be a Documentary Label / Common Grouping (e.g. "Sea Creature", "Furry Animal") — NOT a scientific class name. Never "Mammalia", "Aves", etc. |
| **animals `nono_list[1–9]` quality** | Each word must be distinctive (not vague), non-redundant (no 3+ synonyms), standalone (usable as a single spoken word) |
| **Difficulty distribution** | Sample check: are there entries across all three difficulty levels (1/2/3) within major categories? |
| **No duplicate IDs** | `id` field must be unique across the entire file |
| **No spaces in non-animals entries used by DSD** | DSD excludes entries with spaces in the word. Note how many DSD-eligible entries exist per category. |

**Output:** Flag any structural issues. Do not rewrite the file. Log findings in this audit's Phase 4 Summary.

### 4B — ygi-data.json

| Check | Rule |
|-------|------|
| **Schema fields** | Every entry: `id` (string), `text` (string containing `[ ]`), `ringers` (array of exactly 5 `{number, metric}` objects) |
| **Gap placeholder** | Every `text` field contains `[ ]` exactly once (this becomes `________` at render time) |
| **ID format** | Legacy entries: `ce-NNN`. New entries: `ygi-NNN`. No mixing formats within a group. |
| **Ringers quality** | Each ringer is a `{number, metric}` pair where the combination would make a plausible (or hilariously implausible) answer |

**Output:** Flag structural issues. Log in Phase 4 Summary.

### 4C — gth-data.json

| Check | Rule |
|-------|------|
| **Schema fields** | Every entry: `id` (`gth-NNN`), `name`, `display`, `definition`, `tip`, `category`, `difficulty` (1/2/3), `aliases` (string[] — at least 3) |
| **Optional `cluster` field** | If present, must have ≥3 members using the same cluster value |
| **Difficulty distribution** | Entries across all three tiers? |
| **`aliases` minimum** | At least 3 per entry — these are Deep Dive accepted answers (normalised lowercase) |

**Output:** Flag structural issues. Log in Phase 4 Summary.

### 4D — Expansion word banks (`secret_words.json`, `secret2_words.json`, `secret3_words.json`)

| Check | Rule |
|-------|------|
| **Files exist** | All three files referenced in the `sw.js` precache exist on disk |
| **Schema** | Same schema as `words.json` (`id`, `word`, `nono_list`, `category`, `difficulty`) per `docs/expansion-guide.md` |
| **ID uniqueness** | No `id` collisions within each file AND no collision with `words.json` IDs |
| **Expansion guide accuracy** | `docs/expansion-guide.md` 4-step checklist still matches how the proxy architecture actually works in `secret-mode.js` |

**Output:** Flag structural issues. Log in Phase 4 Summary.

### 4E — Scripted parse smoke test

Run a throwaway Node one-liner that `JSON.parse`s every file in `data/` and reports failures. A malformed data file fails at runtime with a blank game and no error UI — this is the cheapest `[CRITICAL]` catch in the entire audit. Do this **first**, before the manual checks above.

### 4F — Schema future-proofing notes

After reviewing all three files, note any structural improvements that would help when the word bank expands:
- Are category names consistent (lowercase, no typos)?
- Are `id` sequences consistent and gap-free?
- Any fields that are semantically overloaded or ambiguous?

Log recommendations in Phase 4 Summary. Do not rewrite data files.

---

## Phase 5 — Documentation Closure

**Goal:** Ensure every finding from Phases 1–4 is correctly documented and every implementation notes file is current.

### 5A — Implementation Notes Review

For each game, read `docs/implementation-notes/[abbr]-implementation-notes.md`. Verify:

| Check | What to look for |
|-------|----------------|
| **Four sections present** | Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps |
| **Bug Index current** | Any bug discovered in Phase 3 that isn't logged yet — add it |
| **Template Gaps current** | Any pattern from this game that should inform the new-game process — flag it |
| **Multiplayer Lessons** | If a multiplayer bug was fixed, is it logged with root cause + lesson? |

**Missing impl notes files:** Verify every game has one. Current expected files:
- `li5-implementation-notes.md` ✓
- `gm-implementation-notes.md` ✓
- `ss-implementation-notes.md` ✓
- `jec-implementation-notes.md` ✓
- `ygi-implementation-notes.md` ✓
- `lttp-implementation-notes.md` ✓
- `nat-implementation-notes.md` ✓
- `dsd-implementation-notes.md` ✓
- `gth-implementation-notes.md` ✓
- `dyb-implementation-notes.md` ✓
- `bld-implementation-notes.md` ✓
- `pass-implementation-notes.md` ✓

**Output:** Update any impl notes file that needs entries added.

---

### 5B — Cross-Game Lessons Elevation

After reviewing all 12 impl notes files, identify:
1. **Recurring bugs** (same pattern in 2+ games) → add to `phase-audit.md` Protocol A §2 Technical Debt checklist
2. **Template gaps** that apply to new game builds → add to `logic-engine.md` Checklist: Adding a New Game
3. **UI patterns** that should be standardised → add to `ui-style.md`

Document each elevation decision with a one-line note: `[Elevated from [abbr]-impl-notes: short description]`.

---

### 5C — Rule File Final Pass

After Phases 1–5 are complete, do a final read of these four files and confirm they are consistent with each other:
- `CLAUDE.md` ↔ `logic-engine.md` (SW version, precache list, current focus)
- `game-identities.md` ↔ `ui-style.md` (brand colours, toggle classes, how-to overlay per-game table)
- `phase-audit.md` Protocol C table ↔ current known patterns (all rows still relevant?)

**Output:** Any final reconciliation edits.

---

## Phase 6 — Audit Summary & Fix Plan

When all phases are complete, produce two outputs:

### Output A — Audit Summary (append to this document)

Write a concise summary directly at the bottom of this document under "## Audit Findings". Format:

```
## Audit Findings — [Date]

### Phase 1 — Rules & Meta-Docs
- [File changed]: [what changed and why]
- [AUDIT FLAG: ...]: [anything unresolvable that needs developer decision]

### Phase 2 — Code Map
- [Game]: [sections added/updated]

### Phase 3 — Per-Game
- [Game — Check]: [what was found / what was logged in impl notes]

### Phase 4 — Data
- [File]: [findings]

### Phase 5 — Documentation Closure
- [File]: [what was updated]

### Recurring Patterns Elevated to Rule Files
- [Pattern]: elevated from [source] → [destination]

### Open Flags (Require Developer Decision)
- [Flag]: [context]
```

---

### Output B — Fix Plan (new file: `docs/fable-fix-plan.md`)

Create `docs/fable-fix-plan.md`. This is the actionable work list for the developer — every issue found during the audit, nothing excluded. Severity is the only filter on order, not on inclusion.

**Severity tags:**
- `[CRITICAL]` — silent data corruption, wrong game outcome, multiplayer crash, undefined variable (e.g. wrong `window.` prefix)
- `[BUG]` — incorrect behaviour a player would notice (wrong scoring, missing teardown, broken exit path)
- `[POLISH]` — flavor text drift, deprecated class still in use, missing border, layout inconsistency
- `[DOC]` — documentation-only gap that could mislead a future implementation session

**Format for each entry:**
```
### [SEVERITY] [Game / File] — Short description

**Where:** `[file path]` — function name or element ID
**What:** One sentence describing the problem.
**Why it matters:** One sentence on the impact (crash / wrong score / silent drop / visual glitch / misleading docs).
**Fix:** One sentence describing exactly what needs to change. No ambiguity.
**Verify:** How the developer confirms the fix worked (what to tap / what to grep / what state to check).
**Rule violated:** `[rule file] § [section]` (if applicable)
```

**Grouping order:**
1. `[CRITICAL]` items — all games, sorted by game
2. `[BUG]` items — all games, sorted by game
3. `[POLISH]` items — all games, sorted by game
4. `[DOC]` items — rule files and data files

**Header format for `fable-fix-plan.md`:**
```markdown
# Fix Plan — Little Sylly Games Studio Audit
**Generated by:** Fable audit — [Date]
**Status:** Awaiting developer review
**Total issues:** [N] ([X] critical, [Y] bugs, [Z] polish, [W] doc)

> Work through CRITICAL items first. Each entry has a self-contained Fix line —
> no cross-referencing required. Mark items complete by changing `###` to `### ✅`.
>
> ⚠️ index.html rule: never apply systematic/bulk edits to index.html with an
> editor's find-replace or an AI Edit tool — use a Node.js script (UTF-8 mojibake
> risk; established project rule). One-off single-element edits are fine.
>
> After completing all fixes that touch precached assets: bump the SW version once
> (not per-fix) and update CLAUDE.md + logic-engine.md to match.
```

---

## Appendix — Known Recurring Issues (Seed List)

These are patterns already documented as recurring. Phase 3 should check every game against these. Any new recurring patterns discovered should be added here for future audits.

| Pattern | Rule source | What to grep for |
|---------|------------|-----------------|
| `sylly-toggle-on` still in use | `phase-audit.md` Protocol A §2 | `sylly-toggle-on` |
| `window.mpMyPlayerIdx` (wrong prefix) | `logic-engine.md` + BLD Bug-08 | `window.mpMyPlayerIdx`, `window.mpPlayerSlots`, `window.mpActiveGame`, `window.mpActiveRoomCode` |
| `classList.remove('pill')` stripping base styles | `ui-style.md` Settings Card Standard | `classList.remove('pill'`, `classList.toggle('pill'` |
| Missing `border border-[brand]-300` on decision modals | `ui-style.md` Two-Pattern Overlay Library | `overlay-modal-inner` without `border` |
| Direct play-again without confirmation modal | `logic-engine.md` Play-Again Confirmation | gameover `btn-*-play-again` calling reset function directly |
| `h-screen` on non-sticky-footer screens | `ui-style.md` Layout rules | `h-screen` on screens without persistent bottom CTA |
| `fixed inset-0` overlay not cleared in `resetToLobby()` | DYB BUG-05 pattern | any overlay with `fixed inset-0` and high z-index |
| `setTimeout` without WHY comment | `phase-audit.md` Protocol A §2 | `setTimeout` without inline comment |
| Lobby button missing `playLaunch()` | `logic-engine.md` checklist | `btn-[abbr]` listener missing `playLaunch()` call |
| Menu section with `min-h-screen` | `ui-style.md` + Phase 31 fix | game menu `<section>` with `min-h-screen` |
| Settings overlay missing `scrollTop = 0` on open | `ui-style.md` Settings Layout Standard | settings open handler not resetting scroll |
| Toggle missing `shrink-0` class | `ui-style.md` Settings Card Standard | toggle buttons without `shrink-0` |
| Missing `mpSerialiseSettings` entry / stale serialised fields | `logic-engine.md` new-game checklist | game's settings vars vs its `mpSerialiseSettings` entry |
| Missing ACTION handler in `[abbr]HandleEnvelope` (silent drop) | `logic-engine.md` MDLM missing-handler audit | every "client can submit here" phase vs handler switch cases |
| Screen in HTML but not in `allScreens[]` (ghost screen) | `logic-engine.md` Screen Routing | `<section id="screen-` diff against `allScreens[]` |
| Precached URL missing on disk (SW install fails atomically) | `logic-engine.md` PWA Guardian | `PRECACHE_URLS[]` vs disk |
| Call to undefined `play*()` audio function | `logic-engine.md` Audio Catalogue | `play[A-Z]\w*\(` call sites vs `engine.js` definitions |
