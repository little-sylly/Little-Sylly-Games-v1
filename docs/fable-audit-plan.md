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
| 0 — Housekeeping | ✅ | 12 June 2026 — pre-audit checkpoint commit `bb32291` (50 files); per-phase checkpoint convention active from here |
| 1A — CLAUDE.md | ✅ | 12 June 2026 — structure map, load order, data counts, key references all corrected; see Audit Findings §Phase 1A |
| 1B — game-identities.md | ✅ | 12 June 2026 — structural pass complete; GTH Screens table added, PASS packets corrected, numbering fixed; settings display-name drift forward-flagged to Phase 3; see Audit Findings §Phase 1B |
| 1C — logic-engine.md | ✅ | 12 June 2026 — precache list synced to sw.js, resetToLobby() MP block rewritten, getMuteToggleOnClass documented; see Audit Findings §Phase 1C |
| 1D — ui-style.md | ✅ | 12 June 2026 — all theming tables extended to 12 games, mute-toggle theming section added, menu CTA table synced to reality; see Audit Findings §Phase 1D |
| 1E — phase-audit.md | ✅ | 12 June 2026 — When-to-Run gains Protocol C, stale paths/refs fixed, sound-listener row corrected (line 549, 12 games), 3 multiplayer rows added to Protocol C Part 2; see Audit Findings §Phase 1E |
| 1F — definitions.md | ✅ | 12 June 2026 — legacy DSTW/Sylly Signals names purged, all 12 prefixes listed, MP/theming terms added, data-file pointer section added; see Audit Findings §Phase 1F |
| 2 — Code Map | ✅ | 12 June 2026 — all 12 game sections verified against JS/HTML (scripted ID + function sweeps); BLD section added; LTTP/LI5/GM/SS/DSD/GTH/DYB drift corrected; see Audit Findings §Phase 2 |
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
- Reverse: every file the app actually loads (`<script src>`, `fetch`ed data files, manifest) is either precached or deliberately runtime-only. (Correction from Phase 1C: the four Firebase libs ARE in `PRECACHE_URLS[]` — they are lazy-*injected* at runtime but cached for offline.) Flag undocumented omissions.
- `<script>` load order in `index.html` matches the documented load order in `CLAUDE.md`.

### 2B-9 — index.html section headers
- Every game has its `<!-- ════ GAME NAME ════ -->` section header comment block, and the screen/overlay lists inside each header match reality.

### 2B-10 — Orphaned markup sweep (scripted)
- Diff the full set of screen/overlay IDs in `index.html` against the union of everything claimed by the 12 game section headers + engine / multiplayer / secret-mode sections. Any unclaimed element is an orphan — dead screens from removed features, leftover overlays, abandoned experiment divs. Per-game audits (Phase 3) never look here because no game owns it; this check covers the seam. Flag orphans as `[POLISH]` (don't delete during audit — Principle 1).

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

---

## Audit Findings

### Phase 1A — CLAUDE.md (12 June 2026)

Changes applied to `CLAUDE.md`:
- **Rule Files list:** `@new-game-template.md` does not exist — replaced with the three actual files: `new-game-process.md`, `new-game-brief-template.md`, `new-game-technical-template.md`. Same fix applied in Key references.
- **Project Structure map:** added missing `js/games/bld.js`; added `data/secret2_words.json` (Monster Hunter, 50) and `data/secret3_words.json` (Pokémon Gen 1, 151); corrected stale counts — `words.json` ~433 → 850, `secret_words.json` 35 → 434, `ygi-data.json` 55+ → 50, `gth-data.json` 45 → 100; corrected `sw.js` comment v80 → v101; added `docs/gth-content-guide.md`, `docs/fable-audit-plan.md`, `docs/content-prompts/` to the docs listing.
- **Load order:** corrected to match `index.html` — `canvas-draw.js` loads after `engine-multiplayer.js` (was absent); `bld.js` loads between `dsd.js` and `gth.js` (was absent); `cards.js` loads immediately before `pass.js` (was wrongly placed before `li5.js`). Noted `tailwind-play.js` loads in `<head>`.
- **SW Version line:** v101 — already correct, no change.
- **Current Focus:** updated Phase line to reflect the active studio audit (Phase 32/PASS noted as last shipped game phase); Protocol C pending note corrected "all 10 games" → "all 12 games"; added `fable-audit-plan.md` to Key references.
- **Key references:** removed `docs/archive/phase27-snapshot.md` — file does not exist (see flag below).
- **Skills / Anti-Patterns:** verified, no changes needed. "Bank size: 100 animals as of Phase 20" confirmed accurate (100 animals in `words.json`).

**Flags (logged in `docs/fable-fix-plan.md`):**
- `[AUDIT FLAG]` `phase27-snapshot.md` (LI5/GM/SS polish pass) was referenced but never existed in `docs/archive/` — either it was never written or never committed.
- `[AUDIT FLAG]` No Phase 32 snapshot exists for the PASS ship — `docs/archive/` ends at `phase31-snapshot.md`.
- `[AUDIT FLAG]` `data/secret_words.json` contains at least one entry with an empty-string `category` — forward-noted for Phase 4D verification.

### Phase 1B — game-identities.md (12 June 2026)

Changes applied to `game-identities.md`:
- **Game numbering corrected:** headings read Game 11 (DYB) before Game 10 (BLD) but the file order was DYB → BLD. Renumbered to match file order: DYB = Game 10, BLD = Game 11.
- **GTH (known gap):** Screens table added — 10 screens. Discovered `screen-gth-disorder-reveal` exists in `allScreens[]` and `gth.js` but was absent from the doc's state flow AND from this audit plan's own expected-screens list (1B known gaps). Added to both the Screens table and the state flow (Phase 1 loop, before GTH CANVAS).
- **GTH settings table updated to match `index.html` + `gth.js`:** display names had drifted — "Disorders per Patient" → "Reportable Symptoms" (options now 3/4/5, not 2/3/4), "Drawing Time" → "Expression Window", "Difficulty Mix" → "Symptom Severity" with internal values `'episodic'/'recurrent'/'refractory'` (not `'everyday'/'everyday+phobias'/'all'` — verified against `gth.js` line 10, default `'recurrent'`), "Deep Dive" → "Psychiatric Evaluation".
- **PASS (known gap):** multiplayer SYNC packets verified against `pass.js` — `PASS_NEXT_ROUND` was implemented (line 1165) but undocumented; added. All other ACTION/SYNC packets match.
- **PASS terminology:** removed "Stealth Veil … hide your own dice" row — a copy-paste from DYB; no veil/hide feature exists anywhere in `pass.js` or PASS's `index.html` markup (PASS is a card game; grep for "Stealth"/"veil" returns zero hits project-wide outside DYB's eye toggle).
- **LTTP settings table:** reordered to match the actual overlay — Sylly Mode is last in reality (was listed mid-table, violating the Shared Rule as written). Display name corrected: "Difficulty Local/Secret" → "Party Destination — The Local Hang / The Secret Spot" (`lttpDifficulty`). Player count moved to a note (it lives on the setup screen, not the settings overlay).
- **SS:** Overlay Types table added (was missing entirely) — 7 overlays verified against `index.html` with patterns + z-indexes (`ss-settings`, `ss-how-to`, `ss-dossier`, `ss-quit`, `ss-override`, `ss-play-again`, `ss-help-tip`).
- **GM:** Overlay Types table completed — added z-index column and 4 undocumented overlays (`gm-quit-overlay` z-[80], `gm-help-tip-overlay` z-[90], `gm-concede-overlay` z-[95], `gm-vocab-overlay` z-[95]); corrected z-indexes for the existing rows.
- **LI5:** Overlay Types table completed — added legacy `settings-overlay` (no `li5-` prefix — predates the prefix convention), `li5-how-to-overlay`, `li5-help-tip-overlay`.
- **Known-gap checks with no change needed:** `pill-active-stone` exists in `css/styles.css` (line 711) ✓; BLD `onPassThePhone` PTP branch (`single` → `bldShowSetup()`) matches the doc ✓; Sylly Mode is the last card in all 12 actual settings overlays in `index.html` ✓.

**Flags (forward-noted for Phase 3 — need plugin reads to resolve, out of 1B scope per the sequencing note):**
- `[AUDIT FLAG]` Settings display-name drift exists in MORE games than GTH/LTTP. Observed card titles in `index.html` that don't match `game-identities.md` settings tables: **GM** ("Frequency Tuner", "Adjust Frequency Range"; no "Static Interference" card visible), **JEC** ("Dishes" card; no "Chefs" card in the overlay), **YGI** (no "Players" card in the overlay), **NAT** (order differs; "The Classification" and "Mole Escape Bonus" vs doc's "Voting Mode" / "Escape Points"), **DSD** (single "Hazard Control" card vs doc's three separate "X Ends Turn" rows), **BLD** (overlay contains only the Sylly Mode card; "Players" presumably setup-screen). Phase 3 must reconcile each table against the plugin + HTML (reality wins).
- `[AUDIT FLAG]` LI5 and SS settings tables are legacy-format — missing Default and Internal variable columns. Enrich during Phase 3 when the plugins are read in full.

### Phase 1C — logic-engine.md (12 June 2026)

Changes applied to `logic-engine.md`:
- **Engine/Plugin Split — engine.js owns list:** added `updateSliderTheme(gameId)` and `getMuteToggleOnClass(gameId)` (June 2026 addition, previously undocumented) with their fallback values and call sites.
- **Globals table:** `syllyDeviceUid` default corrected `''` → `null` (set by `firebase-init.js` after `signInAnonymously` — verified against `engine-multiplayer.js` line 12).
- **`resetToLobby()` Multiplayer Additions:** code block was stale — rewritten to match `engine.js` lines 489–513: host path (`HOST_END_GAME` LOBBY envelope → `syllyTeardownRoom()`, which calls `mpStopListeners()` internally), client path (explicit `mpClientPlayerRef` removal), resets of `mpLobbyStyle` + all three `mpLobbyRoster*` globals, and the `updateSliderTheme(null)` / `getMuteToggleOnClass(null)` theming reset. The old block showed a bare `mpStopListeners()` call and none of the above.
- **PWA precache list:** synced to `sw.js` `PRECACHE_URLS[]` — was missing `js/games/bld.js`, `js/engine-multiplayer.js`, and all four Firebase lib files (`firebase-app/-database/-auth/-init.js`). Added note clarifying Firebase libs are precached but lazy-injected.
- **Firebase Lazy-Load section:** added clarification that lazy-load refers to script injection timing, not caching — the libs are in the SW precache.

Verified with no change needed:
- **Audio Function Catalogue:** all 16 public `play*()` functions in `engine.js` are documented (`playTone` is an internal helper, correctly omitted). `playSonarPing`, `playHullThud`, `playAbyssThud` present ✓.
- **`showWhoFirst()` config:** all keys (`emoji`, `eyebrow`, `heading`, `prompt`, `teamA/B`, `confirmLabel`, `accentBtnClass`, `accentTextClass`, `onResult`) and both defaults match `engine.js` lines 565–582 ✓.
- **`window.` vs `let` declaration table:** matches `engine-multiplayer.js` declarations exactly (9 `window.`-declared listed, 11 `let`-declared listed; `mpSelectedMode` and the three `mpRosterPending*` working vars are unlisted but low-risk — internal to lobby UI, not referenced by plugins) ✓.
- **SW version:** v101 in both `logic-engine.md` and `sw.js` ✓.
- **Play-Again Return Pattern:** `mpReturnToLobby()` doc matches `engine-multiplayer.js` line 2141 (host: `LOBBY_RESET` broadcast → same-code host lobby → `mpStartPlayersWatcher()` re-subscribe; client: `resetToLobby()`) ✓.
- **MDLM Patterns + Checklist (Adding a New Game):** read in full; current and accurate, no stale references found.

Side-fix to this plan document: 2B-8's parenthetical claimed Firebase libs are "deliberately not precached" — corrected in place (they ARE precached; lazy refers to injection timing).

### Phase 1D — ui-style.md (12 June 2026)

Changes applied to `ui-style.md`:
- **Range class reference table:** added DYB (`dyb-range`, #e7e5e4 → #a8a29e stone) and PASS (`pass-range`, #a1a1aa → #18181b zinc) — verified against `css/styles.css` and the `updateSliderTheme()` map in `engine.js` (all 12 games covered in both).
- **New "Mute toggle theming" subsection:** documents `getMuteToggleOnClass(gameId)` (June 2026 addition, previously absent from ui-style.md) — call sites (`toggleMute()`, `openSoundOverlay()`, boot init, `resetToLobby(null)`), the full 12-game `game-toggle-on-*` map (verified against `engine.js`), fallback `game-toggle-on-stone`, and new-game steps.
- **Toggle class rules made explicit:** `game-toggle-off` canonical / `sylly-toggle-off` legacy alias (shared CSS rule, both valid); **`sylly-toggle-on` explicitly deprecated** — verified zero usages in `index.html` and all JS (dead CSS rule remains — logged `[POLISH]`). Cross-reference added under Settings Card Standard rules.
- **Settings active-pill table:** added DSD (`pill-active-cyan`), GTH (`pill-active-sage`), DYB (`pill-active-stone`), BLD (`pill-active-yellow`), PASS (`pill-active-zinc`) — all verified present in `css/styles.css`.
- **Per-game brand reference table (Game Brand Colour — Scope):** added GTH (#B1BCA0 sage — inline styles, no Tailwind class), DYB (stone-700), BLD (yellow-500), PASS (zinc-900) with toggle + settings-button classes verified against `index.html`; note added that `accentBtnClass`/`accentTextClass` are unused for non-team games.
- **How-to per-game table:** added GTH (🛋️, inline sage, "Stroke or Genius"), DYB (🎲, stone-400, "Devil's Luck"), PASS (🃏, zinc, "The Abyss"). Compliance-status line updated (Phase 29 covered 9 games; GTH/DYB/PASS pending Phase 3 structure verification).
- **Universal Menu Standard:** restructured from a 7-game column table to a 12-game Play CTA row table, synced to `index.html` reality. Stale labels corrected: LI5 "Let's Play!" → "Play Time!", GM "Let's Play!" → "Begin Link", SS "Let's Play!" → "Start Mission", YGI "Show Your Take 🃏" → "Let's Get To It!".

Verified with no change needed:
- **Slider theming:** `updateSliderTheme()` auto-call inside `openSoundOverlay()` already documented ✓.
- **Settings Card Standard:** `shrink-0` rule + sub-option slider pattern present ✓.
- **Contextual Tip Icons:** pattern complete; `[abbr]-tip-overlay` `resetToLobby()` teardown rule present ✓.
- **Two-Pattern Overlay Library:** both exact inner-div class strings present ✓.

**Flags (logged in `docs/fable-fix-plan.md`):**
- `[POLISH]` GTH Play CTA "Start the Session 🛋️" contains an emoji — violates the CTA emoji rule.
- `[POLISH]` DYB how-to overlay uses muted `stone-400` step labels + close button instead of brand stone-700 — intentional-vs-drift to be resolved in Phase 3.
- `[POLISH]` Dead `.sylly-toggle-on` rule remains in `css/styles.css` (zero usages).
- `[DOC]` **DYB Sylly Mode drift:** shipped UI names it "Devil's Luck" with Loaded/Phantom/Slick/Cracked die types; `game-identities.md` documents "Chaos Mode" with Slick dice only. Forward-flagged to Phase 3 DYB (needs full `dyb.js` read).

### Phase 1E — phase-audit.md (12 June 2026)

Changes applied to `phase-audit.md`:
- **When to Run:** added the missing Protocol C line — the section listed only Protocols A and B even though Protocol C has existed since it was added to the file. Now matches the CLAUDE.md skill description (three protocols).
- **Protocol A §1 + Protocol B Step 0:** corrected stale implementation-notes path `docs/[abbr]-implementation-notes.md` → `docs/implementation-notes/[abbr]-implementation-notes.md` (files moved into the subdirectory; same class of stale reference 1A found in CLAUDE.md).
- **Protocol B Step 1:** corrected `.claude/rules/new-game-template.md` (does not exist — same 1A finding) → `new-game-brief-template.md`, with a pointer to `new-game-process.md` for the full three-stage protocol.
- **Protocol B Step 5:** added the pre-MDLM-test grep for `window.`-prefixed `let`-declared MP globals — this was an explicit open Template Gap in `bld-implementation-notes.md` ("Phase audit Protocol B: Add pre-MDLM-test grep") that had never been actioned.
- **Protocol C Part 2 — Sound button listeners row (1E known check):** corrected `engine.js` line reference 534 → 549 (verified against current `engine.js`) and "All 11 games audited" → "All 12 games audited" (the row itself already listed 12 games — the count was self-contradictory).
- **Protocol C Part 2 — three new rows from GTH/DYB/BLD/PASS lessons:** (1) **No `window.` prefix on `let`-declared MP globals** (BLD Bug 8 — was in Protocol A §2 but absent from the cross-suite sweep), (2) **ACTION handler completeness** (silent-drop pattern from the MDLM missing-handler audit in `logic-engine.md`), (3) **`mpSerialiseSettings` coverage** (clients silently playing with different rules). All three were already rules in `logic-engine.md` but had no Protocol C gate.
- **Protocol C Part 2 — Play-again flow row extended:** now also requires the multiplayer branch (`mpReturnToLobby()` host / `resetToLobby()` client with dynamic confirm label) per `logic-engine.md` § Play-Again Return Pattern.

Verified with no change needed:
- **Protocol A §2 `game-toggle-on-[colour]` rule (1E known check):** "ALL ON/OFF toggles (including Sylly Mode) use `game-toggle-on-[colour]` — `sylly-toggle-on` is no longer used anywhere" — confirmed current; matches the 1D verification (zero `sylly-toggle-on` usages in `index.html`/JS) ✓.

### Phase 1F — definitions.md (12 June 2026)

Changes applied to `definitions.md`:
- **Variable Naming table:** legacy "DSTW state" row renamed to "LI5 state (legacy — no prefix)" — verified `li5.js` state vars are genuinely unprefixed (`currentWordData`, `settingRounds`, etc.; the file predates the prefix convention). The three per-game prefix rows (gm/ss/jec) replaced with one generic "`[abbr]` prefix" row plus an explicit list of all 12 active prefixes (`li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass`) — cross-referenced to Naming Collision Check 3. Constants examples refreshed (`BLD_ROLE_TABLE`, `LTTP_SMALL_TALK`).
- **Function Naming table:** game-specific `gm*()` / `ss*()` rows generalised to `[abbr]*()`; added `[abbr]Show*()` (screen transitions), `[abbr]Mp*()` / `[abbr]HandleEnvelope()` (multiplayer interceptors), and `mp*()` (engine multiplayer module) rows. Every example function verified to exist via grep.
- **"Sylly Signals" → "Secret Signals":** three stale occurrences fixed (Function Naming row removed in generalisation; Vault and Broadcast term rows renamed). Added an "Internal game id" term noting `activeGameId` for SS is still `'sylly-signals'` internally (verified in `engine.js` `getMuteToggleOnClass` map) while the display name is Secret Signals.
- **Internal Enum Strings:** added `gthDifficultyMix`, `dybWildcardsStyle`, and `syllyMultiplayerMode` examples — pattern continues in newer games.
- **Comment Style:** dependency-declaration example `dstw.js` → `li5.js` (file was renamed; same stale-name class as 1A/1E findings).
- **Technical Project Terms (1F known checks):** added `mpClientPlayerRef` (window-declared, cleared in `resetToLobby()`), `mpPlayersListener` (let-declared — no `window.` prefix), `getMuteToggleOnClass(gameId)`, and the `game-toggle-on-[colour]` class family (with `game-toggle-off` canonical / `sylly-toggle-on` deprecated note). All verified against `engine.js` / `engine-multiplayer.js`.
- **New "Other Data Files" section:** pointer entries for `ygi-data.json`, `gth-data.json`, and the three expansion banks — schema summaries only, with cross-references to `game-identities.md` and the content guides (full schemas deliberately not duplicated; single source of truth stays with the owning game).

Verified with no change needed:
- **words.json Data Schema + File Format sections:** field list, 16-category list, Great Minds 10-category subset, difficulty tiers, dual-use `nono_list[0]` note, and the one-entry-per-line serialiser rule all current ✓ (deep data verification deferred to Phase 4A per plan).

### Phase 2 — Code Map (12 June 2026)

**Method:** Throwaway Node scripts (not committed) extracted `allScreens[]`, every plugin's top-level state vars / function definitions / packet strings, `MP_GAME_CONFIGS`, and all element IDs in `index.html`; then a verification sweep checked every ID and function name in `code-map.md` against the codebase. Plan note "GTH/DYB/BLD/PASS missing entirely" was stale — GTH, DYB, and PASS sections already existed (added post-Phase-25 without updating the header); only **BLD was missing entirely**.

Changes applied to `docs/code-map.md`:
- **Header:** "Updated: Phase 25" → "Phase 32 / June 2026".
- **BLD section added in full** (between DYB and PASS): 7 screens, 8 overlays (with the dual-purpose `bld-second-chances-overlay` note), key buttons, 20 state vars, 17 key functions, full ACTION/SYNC packet table — all extracted from `bld.js` + `index.html`.
- **Global/Engine:** added `toggleMute()`, `updateSliderTheme()`, `getMuteToggleOnClass()`; fixed `#btn-gth` row (routes to `screen-gth-menu`, NOT `mpShowModeScreen('gth')`); added missing `#btn-bld` row.
- **LI5:** `#how-to-overlay` → `#li5-how-to-overlay`; added `#li5-help-tip-overlay`; play-again opener corrected to legacy `#btn-play-again`; `#btn-back-to-box` → `#btn-back-to-lobby`; Key functions table rewritten — `applySettings`/`startGatekeeper`/`startRound`/`endRound` do not exist (real: `handlePill`, `showGatekeeper`, `startGame`, `applyAndAdvance`, `endTurn`, …).
- **GM:** `gmNewRound()` does not exist — replaced with `startGreatMinds()` / `gmStartInputPhase()` / `gmProcessLockIn()`; brand colour note expanded (violet lobby card vs purple in-game) with Phase 3 flag.
- **SS:** `ssNextRound()` → `ssStartHalf()`/`ssNextHalf()`; **`ssApplyExpansionOverrides()` removed — function does not exist** (flag added; Phase 3 Check G).
- **YGI:** `ygiShowSuddenDeathIntro()` → `ygiStartSuddenDeath()` (+ `ygiShowSDPassGate()`/`ygiResolveSuddenDeath()`).
- **LTTP:** chat-screen element table rewritten for the current two-pane Map/Contacts layout (old `lttp-chat-player-list`/`-history`/`-notes`/`lttp-suspicion-list` IDs no longer exist); added `lttp-smalltalk-overlay` + `lttp-guess-map-overlay` rows; `lttpOpenSuspicionOverlay()`/`lttpOpenMapOverlay()` do not exist (real: `lttpOpenPlayerFolder()`, `lttpRenderMapPane()`, `lttpOpenGuessMapOverlay()`); added `lttpOpenSmallTalkOverlay()`, `lttpShowBriefing()`.
- **Secret Mode:** `#sm-terminal-settings` does not exist → `#sm-terminal-subcategories`.
- **DSD:** stamp Phase 19 → Phase 23/June 2026; added `screen-dsd-spectator` to the DSD screens table; `dsdInitSetup()`/`dsdValidateSetup()` do not exist (real: `dsdShowPlayers()`, `dsdValidatePlayers()`); added `dsdShowCaptain()`/`dsdShowCrew()`/`dsdShowSpectatorView()`/`dsdShowCrewStandby()`.
- **GTH:** added missing `screen-gth-patient-intake` row; settings values corrected (`gthDisordersPerPatient` 3/4/5 not 2/3/4; `gthDifficultyMix` `'recurrent'` with `'episodic'/'recurrent'/'refractory'` — matches the 1B game-identities fix); added `gthPatientReady` var + `gthShowPatientIntake()`/`gthStartPhase1Drawing()`/`gthKickOffPhase2()` functions.
- **DYB:** state table rewritten — `dybDice`/`dybDiceCount` do not exist (real: `dybStartingHand` 3/4/5, `dybMyRoll`/`dybAllRolls`/`dybDiceInHand`, plus `dybWildcardsStyle`, `dybOnesStripped`, `dybSeatNumbers`, elimination/opener state); `dybSyllyIntensity` default 5 not 7; `dybShowMenu()`/`dybShowTable()` do not exist (real: `dybStartSession()`, `dybRenderTableScreen()`); Devil's Luck flag embedded (die type strings `'loaded'/'phantom'/'slick'/'cracked'` confirmed in `dyb.js`).
- **PASS:** added `passStartSession()`, `passShowRoundWrap()`/`passCheckMatchOver()`; rest verified accurate (incl. `passStartRound()` broadcasting `PASS_GAME_START` ✓).
- **Multiplayer Module:** `mpRoomCode` → `mpActiveRoomCode` (with no-`window.`-prefix note); `syllyDeviceUid` default `''` → `null`; added `screen-mp-roster` to MP screens; mode-classification line extended to all 12 games with min/max; GTH packet row gains `GTH_PATIENT_READY`; DYB/BLD/PASS rows added (pointing at their per-game tables).

**New issues logged in `docs/fable-fix-plan.md`:**
- `[BUG]` **BLD `getMinPlayers: () => 4`** in `MP_GAME_CONFIGS` but `BLD_ROLE_TABLE` starts at 5 players (game-identities min 5) — a 4-player start would hit an undefined role-table row.
- `[POLISH]` **Orphaned `screen-lttp-smalltalk` section** in `index.html` — never referenced by `lttp.js`, never in `allScreens[]`, never shown; leftover from the pre-Phase-21a Small Talk screen design (child IDs `lttp-st-ask-*`, `lttp-st-stamp-row` all unreferenced — verified). Early catch of a 2B-10 orphan.
- `[DOC]` BLD `bld-new-night-overlay` documented in game-identities but does not exist — play-again reuses `bld-second-chances-overlay` with dynamic labels.
- `[DOC]` SS has no expansion-hook function — deliberate skip or gap, Phase 3 Check G to resolve.
- `[DOC]` GM violet-500 lobby card vs purple-500 everywhere else — Phase 3 GM to reconcile.

**Forward notes for Phase 2B:** BLD min-players mismatch found here overlaps 2B-6 (MP_GAME_CONFIGS vs game-identities) — recheck remaining config fields then. The orphaned LTTP section pre-answers part of 2B-10. `screen-mp-roster` registration confirmed in `allScreens[]` (115 screens total extracted).
