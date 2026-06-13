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
| 2B — Engine & Infrastructure | ✅ | 13 June 2026 — all 10 checks run (scripted); 2 new [BUG] (PASS mode-screen config fields, 17-overlay teardown gap), BLD min-players entry corrected (field absent, not `() => 4`); see Audit Findings §Phase 2B |
| 3 — Per-Game (track per game in Notes) | ✅ | **LI5 ✅ GM ✅ SS ✅ JEC ✅ YGI ✅ LTTP ✅ NAT ✅ DSD ✅ GTH ✅ DYB ✅** (13 June 2026) **BLD ✅ PASS ✅** (14 June 2026) — all 12 done; see Audit Findings §Phase 3 |
| 4 — Data | ✅ | 14 June 2026 — all 6 data files parse; words.json format/order/schema clean except dup id `objects-053`; ygi + gth fully clean; secret banks no id collisions; 2 new `[BUG]` (dup id, world-001 11-word nono_list) + secret_words category flag resolved precisely (10 `world-*` missing key); see Audit Findings §Phase 4 |
| 5 — Documentation Closure | ✅ | **5A–5D all complete** (14 June 2026). 5A: impl notes verified. 5B: 8 cross-game lessons elevated + `.name`→`.nickname` fix + 5D contract made durable. 5D: new-game-brief-prompt synced to 12-game roster + ygi-prompt `ce-`→`ygi-` ID fix. 5C: SW/precache consistent; DYB brand drift `stone-700`→`stone-400` fixed in ui-style; GM split cross-referenced; Protocol C table confirmed current. See Audit Findings §Phase 5A / §5B / §5D / §5C |
| 6 — Summary & Fix Plan | ✅ | 14 June 2026 — Output A (consolidated summary) appended to Audit Findings; Output B (`docs/fable-fix-plan.md`) finalised — status "Awaiting developer review", 71 issues (1 critical, 27 bug, 32 polish, 11 doc), 4 resolved in-audit. Audit complete |

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

**Make the 5D contract durable:** Add a checklist line to the "Adding a New Game" closure step (`logic-engine.md`, and/or the new-game closure steps in `new-game-process.md`) requiring `new-game-brief-prompt.md` to be synced from shipped reality on every new game — roster table, taken-abbreviations line, Sylly-name list. Without this, the 5D going-forward rule lives only in this audit plan, which gets archived once the audit closes.

---

### 5C — Rule File Final Pass

After Phases 1–5 are complete, do a final read of these four files and confirm they are consistent with each other:
- `CLAUDE.md` ↔ `logic-engine.md` (SW version, precache list, current focus)
- `game-identities.md` ↔ `ui-style.md` (brand colours, toggle classes, how-to overlay per-game table)
- `phase-audit.md` Protocol C table ↔ current known patterns (all rows still relevant?)

---

### 5D — Content-Prompt Doc Sync

**Goal:** The `docs/content-prompts/` files are the *first* documents a new game touches (brainstorming phase). They must reflect the full 12-game roster and the audit's corrected terminology, or every new game starts from a stale baseline and re-imports errors the audit just fixed.

**Files to verify:**

| File | Type | What to check |
|------|------|--------------|
| `new-game-brief-prompt.md` | Game-design prompt | **Roster-critical** — see checklist below |
| `words-json-prompt.md` | Content-gen prompt | Category list still matches `definitions.md` (16 categories); animals Broad Shield rules current |
| `ygi-prompt.md` | Content-gen prompt | Schema + next-ID guidance still accurate |
| `gth-prompt.md` | Content-gen prompt | Schema, cluster list, guardrails still accurate; "next available ID" note is informational (no audit action) |

**`new-game-brief-prompt.md` checklist (the roster-stale file):**
- [ ] **Existing-games table** lists all 12 games (currently 9 — missing DYB, BLD, PASS)
- [ ] **"Taken" abbreviations** line lists all 12 prefixes: `li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass` (currently missing `dyb, bld, pass` — abbreviation-collision risk)
- [ ] **Sylly Mode tone references** list all 12 names — add Devil's Luck (DYB), Drama Mode (BLD), The Abyss (PASS)
- [ ] **Thematic vocabulary example** uses the audit-corrected GTH settings title **"Inpatient Admission Form 📋"** (currently the pre-audit "Intake Form 📋")

**Rule:** This sub-section must pass before the audit is considered closed. Going forward, the "Adding a New Game" closure step (and any future game's phase snapshot) must also update `new-game-brief-prompt.md`'s roster table, taken-abbreviations line, and Sylly-name list — the brief prompt is now part of the per-game documentation contract.

**Source-of-truth caveat:** When syncing the brief prompt, pull every value from *shipped reality* — `game-identities.md`, the game's plugin file, and its implementation notes — **never from the original `docs/new-game-brief-[name].md`**. The brief is a starting point, not the final say: design changes routinely land post-brief and post-implementation (exactly why implementation notes exist — to store critical decisions, bug fixes, and issues that supersede the brief). The "Intake Form 📋" → "Inpatient Admission Form 📋" drift in this file is a live example of a brief-era value that shipped differently. Treat the brief prompt's examples as teaching material that must mirror what the games actually do today.

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

### Phase 2B — Engine & Shared Infrastructure (13 June 2026)

**Method:** Throwaway Node scripts (temp dir, not committed) for every mechanical check; targeted reads of `engine.js` `resetToLobby()`, `engine-multiplayer.js` `MP_GAME_CONFIGS` / `mpShowModeScreen()` / `mpSetModeSelection()`, and `pass.js` for verification.

**Clean checks (no findings):**
- **2B-1 screen registry:** 115 HTML screen elements ↔ 115 `allScreens[]` entries; no dead registrations. (`screen-menu` lives on a `<main>` not a `<section>` — LI5 legacy, fine. Sole ghost = the already-logged orphan `screen-lttp-smalltalk`, which is never shown.)
- **2B-4 theming maps:** `updateSliderTheme()` and `getMuteToggleOnClass()` both cover all 12 games; every mapped class exists in `css/styles.css`.
- **2B-5 forward direction:** every `pill-active-*`, `game-toggle-on-*`, and `*-range` class referenced in HTML/JS is defined in CSS.
- **2B-7 function existence:** all 18 distinct `play*()` call names resolve to `engine.js` definitions; every function called from `mpHandleEnvelope` + the four per-game `[abbr]HandleEnvelope`s (BLD, DYB, GTH, PASS) is defined.
- **2B-8 service worker:** all 33 `PRECACHE_URLS[]` entries exist on disk; CACHE_NAME v101 matches docs; all 19 `<script src>` tags precached; all `fetch()` targets precached; `<script>` load order matches CLAUDE.md exactly.

**New issues logged in `docs/fable-fix-plan.md`:**
- `[BUG]` **17 overlays never hidden by any reset path** (2B-3): scripted token-exact sweep of `resetToLobby()` + all 8 delegated reset functions. LI5 ×3 (`settings-overlay`, `deck-panel`, `skip-turn-overlay`), GM ×9 (settings, near-sync, boost, neural-library, new-frequency, vocab, concede, deck-panel, how-to), SS ×3 (settings, dossier, how-to), LTTP ×1 (`lttp-smalltalk-overlay`), global ×1 (`sound-overlay`). Reachable via the MP host-disconnect → `resetToLobby()` window (DYB BUG-05 class).
- `[BUG]` **PASS `MP_GAME_CONFIGS` entry missing `gameName`/`emoji`/`ptpLabel`/`brandBtnClass`** (2B-6) + stray unread `gameId` key — `mpShowModeScreen()` writes all four unconditionally, so the PASS mode screen renders literal "undefined" name/emoji/CTA (CTA gets no background class). PASS routes through the mode screen on every multiplayer entry.
- `[BUG]` **BLD min-players entry corrected** (2B-6): the existing fix-plan entry said `getMinPlayers: () => 4`; reality is the field is **absent** — engine fallback `?? 2` allows a 2-player lobby start against a role table that starts at 5. Fix-plan entry rewritten.
- `[POLISH]` **Doubled `id` attribute on one tag** (2B-2): `btn-gm-how-to`, `btn-lttp-how-to`, `btn-nat-how-to` each have `id="…"` written twice on the same element. No true duplicate IDs exist anywhere in `index.html` (1377 unique).
- `[POLISH]` **Dead `.pill.pill-active` CSS rule** (2B-5 reverse): bare `pill-active` (pink) defined but never referenced — predates the per-game colour family. (Joins the already-logged dead `.sylly-toggle-on`.)
- `[POLISH]` **Google Fonts CDN dependency** (2B-8 reverse): `index.html` `<head>` links `fonts.googleapis.com` for Fredoka — not precached; offline sessions fall back to system font, contradicting the "no CDN / fully offline" constraint as documented.
- `[DOC]` **index.html section headers stale across ~9 sections** (2B-9/2B-10): all 8 `[abbr]-help-tip-overlay`s, `lttp-tip-overlay`, `bld-tip-overlay`, `nat-new-expedition-overlay`, `dyb-slick-picker-overlay`, `ss-dossier-overlay`, `ss-inning-transition`, `ss-endgame-splash`, `lttp-smalltalk-overlay`, `mp-host-prelobby-overlay`, and `screen-mp-roster` exist but are claimed by no header. LTTP's header says "screen-lttp-smalltalk removed Phase 21a" while the section still exists. No phantom claims (every header-listed ID exists).
- `[DOC]` **`multiplayerOnly` config field is never read by any code** — MDLM-only routing is enforced solely by `supportedModes: ['mdlm']`.

**Doc corrections applied in place:**
- `game-identities.md` SS Multiplayer: removed the non-existent `supportsHybrid: true` reference (no such field anywhere in code) — replaced with the real mechanism (`supportedModes: ['ptp','tlm','mdlm']`, `recommendedMode: 'tlm'`).

**2B-6 full verification (MP_GAME_CONFIGS ↔ game-identities):** LI5 ptp/tlm max 2 ✓; GM ptp/mdlm max 2 ✓; SS hybrid ✓ (doc corrected as above); JEC/YGI/LTTP/NAT ptp+mdlm ✓; DSD tlm-recommended, ptp/tlm/mdlm ✓; GTH mdlm-only 4–8 ✓; DYB mdlm-only 3–8 ✓; PASS mdlm-only 3–6 ✓; BLD max 10 ✓ / min **missing** (see [BUG] above). All `rosterConfig` types match docs. Note: LTTP sets `getMinPlayers` = `getMaxPlayers` = `lttpPlayerCount` (lobby requires the exact host-configured count) — undocumented but intentional-looking; left as-is.

### Phase 3 — Per-Game: LI5 + Great Minds (13 June 2026)

**Method:** Full reads of `li5.js` (977 lines) + `great-minds.js` (1151 lines), their `index.html` sections (LI5 ~115–628 + monitor screen ~5105; GM ~629–1196 + quit/how-to/deck-panel ~1958–2042), their `mpHandleEnvelope` branches + `mpSerialiseSettings` entries in `engine-multiplayer.js`, both impl-notes files; scripted sweeps for AU English, `window.` MP prefixes, TODO/FIXME, pill-stripping, `sylly-toggle-on`.

**LI5:**
- **[BUG] `deck-panel` z-[60] renders behind `settings-overlay` z-[80]** — "Edit Toy Box ▸" appears to do nothing; the category picker is unreachable (GM's `gm-deck-panel` is z-[100]). Logged L6 + fix plan.
- **[BUG] Quit-cancel from the gatekeeper starts a phantom turn timer** — `hideQuitConfirm()` unconditionally `startTimer()`; can fire `endTurn()` → stale Report Card → double turn-advance. Logged L7 + fix plan.
- **[POLISH] ×3:** `li5-play-again-overlay` non-canonical inner class string (`bg-white p-6`); settings overlay legacy centred title (no standard title block); `flipEntry()` skips the live-play penalty clamp (Report Card delta can disagree with the floored score — L8).
- **Doc sync (game-identities):** settings table rewritten from reality — 9 settings incl. previously undocumented The Toy Box (`settingPlayAllDecks`/`settingCategories`) and Report Card difficulty (`settingDifficulty` `'easy'`/`'standard'`); settings overlay title corrected to "Learning Plan 📝" (was misdocumented as "The Toy Box"); overlay table extended to all 10 overlays; terminology table added; MP packet docs gained `isClientTurn` + `LI5_CATCH { word }` + 10s cooldown.
- **Clean:** Check B (no `sylly-toggle-on`), Check C greps (no TODO, no wrong `window.` prefixes, all `setTimeout`s commented, no pill-stripping), Check D (LI5_ROUND_START/LI5_CATCH handlers present; serialiser covers all settings clients need — `settingCategories`/`settingCorrections` deliberately host-only, client is a passive monitor), Check F (all modal borders present), Check G (expansion overrides + secret pool in `startGame()`; no refill path exists by design — exhaustion ends the game), AU English, exit routing (quit→`resetToMenu`, post-game→`resetToLobby`, play-again confirm modal with dynamic MP labels + `mpReturnToLobby()`).

**Great Minds:**
- **[BUG] Lobby Mode near-sync round silently discarded** — `gmMpResolveRound()`'s `isNearSync` branch calls neither match nor mismatch handler: round unlogged, pair unchanged, host result screen stale, client renders a contradictory mismatch. Logged G4 + fix plan.
- **[POLISH] ×3:** host/client mismatch phrase divergence (G5); `gm-quit-overlay` border is `teal-300` — SS copy-paste (G6); `btn-gm-custom-toggle` missing initial `shrink-0`.
- **Violet/purple reconciled (Phase 1B/2 forward-flag):** the split is suite-wide within GM — all CTAs/accents violet-500, all pills/toggles/borders/settings-tint purple. Reality recorded in game-identities; fix-plan [DOC] entry rewritten (the old "lobby card only" claim was wrong).
- **Doc sync (game-identities):** settings table rewritten to overlay order with display names ("Frequency Tuner", "Adjust Frequency Range") and the Sylly row merged (toggle IS `gmStaticInterference`; Mental Fog/Neural Storm pills = `gmSyllyIntensity` sub-option — the old table presented them as two settings); terminology gained settings title "Frequency Configuration 📡" + quit copy; MP section gained the near-sync limitation note.
- **Clean:** Checks B/C greps, Check D (GM_ROUND_START/GM_SUBMIT/GM_RESULT handlers present; serialiser covers all 8 settings — `gmPoolA/B` not synced, harmless: host draws all pairs; client guards on next-round/override correct per G3 investigation), Check E (scroll reset ✓, pill toggling never strips `.pill`), Check F (borders present — teal one flagged above), Check G (`gmApplyExpansionOverrides()` + `gmGetWordPool()` round-2 switch in both initial and refill paths), AU English, quit/play-again routing (Session Terminal modal + `mpReturnToLobby()` ✓).

**Recurring pattern elevated (2 games, expect more):** all event listeners at top-level script execution in both legacy plugins vs Protocol A §2's "no global-scope listeners" — functionally safe given script-after-markup load order; logged as a rule/reality [DOC] decision in the fix plan rather than per-game bugs.

### Phase 3 — Per-Game: Secret Signals + Just Enough Cooks (13 June 2026)

**Method:** Full reads of `secret-signals.js` (2252 lines) + `jec.js` (883 lines), their `index.html` sections (SS ~1197–1930 + help-tip ~2162; JEC ~2173–2627), the SS/JEC branches of `mpHandleEnvelope` + `mpSerialiseSettings` + `MP_GAME_CONFIGS` in `engine-multiplayer.js`, both impl-notes files; scripted sweeps (deprecated toggle class, wrong `window.` MP prefixes, TODO/FIXME, AU English, pill-stripping, `btn-mp-action` distribution, help-tip teardown, `syllySyncLocked` consumers).

**Suite-wide [BUG] discovered via SS (affects all 8 Phase-22 games):** `mpLockSync()` works only through the `.btn-mp-action` class — applied exclusively by BLD/GTH/DYB/PASS; `window.syllySyncLocked` is written but never read anywhere. The sync lock is a no-op for LI5/GM/SS/JEC/YGI/LTTP/NAT/DSD. Concrete worst case: SS double-tap "Confirm Code" → two `SS_DECODE_SUBMIT` ACTIONs → host runs `ssResolve()` twice → double scoring. Logged S10 + fix plan (suite entry).

**Secret Signals:**
- **[BUG] ×4:** S9 client `SS_RESOLUTION` handler re-runs `ssResolve()` after applying the authoritative payload — inflated client scoreboard + duplicated Mission Journal half; S10 (suite sync-lock, above); S11 SS lobby guards use `mpMyPlayerIdx` as a *team* index — MDLM with 3+ devices soft-locks and the broadcast `SS_VAULT_DATA` leaks Team B's vault to extra devices (docs' "targeted write" claim was wrong — corrected in game-identities + impl notes); S12 Intel Phase has zero MP packets — client crashes on Team B's intel turn (`ssVaultA` never sent) when Sylly Mode is on in Lobby Mode.
- **[POLISH] ×5:** legacy settings overlay (bare divs + `<hr>` + centred title — LI5's class); "Game Over" generic eyebrow on gameover; customise toggle missing initial `shrink-0`; no header `[?]`→how-to on gameplay screens (encrypt header `?` is a contextual tip); round numbering lopsided when Team B encrypts first.
- **Doc sync (game-identities):** settings table rewritten from reality with Default/Internal columns (1B forward-flag resolved) — "Designate Vault Contents", "Encryption Protocol" Clear/Scrambled/Deep Space, "Interceptions Required", "Vault Rotations", "⏱ Broadcaster Timer" 1/2/3 min, Sylly = Intel Phase; terminology gained settings title "Operations Briefing 🔐", quit/play-again copy, Intelligence Archive, Mission Journal, Diplomatic Resolution, Scramble Bonus; overlay table gained `ss-inning-transition` + `ss-endgame-splash` (custom z-[95] splashes); MP section corrected (broadcast not targeted write; 2-device assumption; Intel not MP-aware; client-sent `SS_START_INTERCEPT` noted).
- **Check G resolved (Phase 2 [DOC] flag):** SS expansion hook exists *inline* in `ssConfirmPlayers()` + `isSecretMode` branches in `ssBuildVaults()`/`ssRerollWord()` — functional, just unnamed. Fix-plan entry marked ✅. Residual: MP host path bypasses the override read.
- **Clean:** Check B (no `sylly-toggle-on`), Check C greps (no TODO, no wrong `window.` prefixes, all 3 `setTimeout`s commented, no pill-stripping, no `h-screen` misuse), Check E (Sylly last, scroll reset works via the overlay's real scrollable body), Check F (all modal borders `teal-300` ✓), AU English ✓, exit routing (quit→`ssResetToMenu`→menu; post-game→`resetToLobby`; play-again modal with dynamic MP labels + `mpReturnToLobby()` ✓), all 17 SS screens incl. intel/tiebreak/standby in `allScreens[]` ✓ (2B-1), `ss-play-again-overlay` in `resetSyllySignals()` ✓.

**Just Enough Cooks:**
- **[BUG] ×2:** J3 client-side Sous Chef merges unguarded — impl-notes' "clients cannot initiate merges" was documentation, not code (no client early-return, no ACTION exists); J4 sifting/tally CTAs not host-gated — clients can run `jecCalcRoundScores()`/`jecStartRound()` locally and diverge; `JEC_NEXT_ROUND` handler itself causes a transient wrong-word flash on clients.
- **[POLISH] ×2:** J2 how-to states Rotten penalty −10 (actual −5) + "−2 per extra Chef" imprecision — Phase 29 copy-sweep miss; `jec-new-shift-overlay` z-[80] instead of z-[90].
- **Doc sync (game-identities) — the big one:** the **Phase 29 scoring redesign never reached game-identities**. Scoring section rewritten from the retired inverse-proportional formula to the tiered model (`jecCalcPoints`: 2 = full jackpot / 3..N−1 = half / N = 15% token / penalties opt-in and replacing, not stacking); settings defaults corrected (Sweet Spot 20→30, Rotten/Spoilt penalties On→Off, Rotten −10→−5); "Rounds" display name → "Dishes"; player count moved out of the settings table (lives on the roster screen); terminology gained "Nice Match! 👌" and corrected Chef's Kiss (= exactly 2) and Too Many Cooks (= all N); overlay table gained `jec-help-tip-overlay` + z-indexes; MP section gained the host-direct-submission note (J1) and the client-gating gaps.
- **Clean:** Check B, Check C greps (zero `setTimeout`s, no TODO, bare `mpMyPlayerIdx` ✓), Check E (cards ✓, `shrink-0` ✓, scroll reset via `.overlay-data-inner` ✓, Sylly last ✓), Check F (borders `amber-300` ✓), Check G (`jecApplyExpansionOverrides()` named hook + secret-pool refill in `jecStartRound()` AND the reroll path ✓; ghost-merge guard ✓), `mpSerialiseSettings('jec')` covers all 8 settings ✓, quit/play-again routing ✓ (quit→`jecResetForNewGame()`→menu; `mpReturnToLobby()` ✓), AU English ✓.

**Recurring patterns (this session):** (1) the suite-wide `btn-mp-action` gap (now a fix-plan entry — candidates for a Protocol C Part 2 row after the remaining Phase-22 games are audited); (2) "documented host-only behaviour with no code guard" appeared in both games (SS intel/reroll, JEC merges/CTAs) — Phase 22's interceptor pattern gated *submissions* but never *navigation/oversight* taps; (3) top-level listeners confirmed in SS + JEC (existing [DOC] entry updated).

### Phase 3 — Per-Game: You Get It? + Late to the Party (13 June 2026)

**Method:** Full reads of `ygi.js` (966 lines) + `lttp.js` (1524 lines), their `index.html` sections (YGI overlays ~3023–3160; LTTP overlays ~3252–3800), the YGI/LTTP branches of `mpHandleEnvelope` + `mpSerialiseSettings` + `MP_GAME_CONFIGS` in `engine-multiplayer.js`, both impl-notes files; scripted greps (deprecated toggle class, wrong `window.` MP prefixes, TODO/FIXME, AU English, pill-stripping, `overlay-modal-inner` borders, `btn-mp-action` distribution).

**Recurring pattern this session (3rd+4th occurrence — escalating):** "late-game phase bolted on after the core MP loop, never made MP-aware." Already seen in SS (Intel Phase S12); now **YGI Sudden Death (Y4)** and **LTTP guess/gameover (L6)**, plus the related **LTTP plan-narrowing gap (L5)**. This is now a 3-game pattern → strong candidate to elevate to a `logic-engine.md` rule ("every game phase, including tie-breaks and endgames, needs the MDLM missing-handler audit — not just the main loop") and a Protocol C Part 2 row, after the remaining Phase-22 games (NAT/DSD) are audited to confirm scope.

**You Get It?:**
- **[BUG] ×3:** Y3 — MP double-pushes `ygiRoundLog`; the manually-pushed entry stores the prompt **object** (not `.text`) with field-less entries, so the gameover carousel shows a doubled count and `entry.prompt.replace()` throws a TypeError when "prev" reaches it. Y4 — Sudden Death (Solo Take tie-break) has zero MP packets → unplayable/divergent in MDLM. Y5 — `btn-ygi-results-next` not host-gated; clients run `ygiStartRound()` locally and flash the wrong situation (JEC J4 class).
- **[POLISH] ×2:** `ygiShowHelpTip()` defined twice (lines ~58 + ~153); OFF-state toggles use the legacy `sylly-toggle-off` alias (valid but non-canonical).
- **Doc sync (game-identities):** **default Verdict Style corrected "Your Call" → "The Consensus"** (`ygiVerdictStyle = 'open-ballpark'`, UI pill `pill-active-orange` confirms; MDLM forces `'secret-ballot'`); Scoring section enriched with the real values (`VOTE_PTS = [3,2,1]`, +2 "Local Legend ✨" round-winner bonus, Ringer-win −2 to all players); Sudden Death screens + the Y4 not-MP-aware note added to the state-flow description.
- **Clean:** Check B (no `sylly-toggle-on`), Check C greps (no TODO, no wrong `window.` prefixes — uses bare `mpMyPlayerIdx` ✓, all `setTimeout`s n/a, no pill-stripping), Check F (all 3 YGI modal borders `orange-300` ✓), Check D (`YGI_TAKE_SUBMIT`/`YGI_VOTE_SUBMIT` ACTION + `YGI_ROUND_START`/`YGI_LINEUP`/`YGI_VERDICT` SYNC present; host readycheck-self-mark fix Y1/Y2 in place; `mpSerialiseSettings('ygi')` covers the 4 synced settings and deliberately omits `ygiVerdictStyle` — forced in `ygiStartGame()`; take/vote submit buttons manually frozen so the suite-wide `btn-mp-action` no-op (S10) doesn't cause double-submit here), AU English ✓, exit/play-again routing (quit→menu; play-again `ygi-run-it-back-overlay` with dynamic MP labels + `mpReturnToLobby()` ✓).

**Late to the Party:**
- **[BUG] ×2:** L5 — MDLM plan narrowing/advancement never synced: the host's `LTTP_MESSAGE_SEND` handler omits the lap-completion branch, `lttpNarrowHighlights()` uses `shuffle()` (non-deterministic), and there's no `LTTP_PLAN_UPDATE` packet → after lap 1 devices show different remaining locations and the plan can stall. L6 — the entire Plan-4 guess phase + gameover has zero MP packets (SS S12 mirror). Both need browser confirmation but are clear from the code paths.
- **[POLISH] ×2:** dead `lttpShowRoleReveal()` / `screen-lttp-role-reveal` + unused `indices` in `lttpAssignRoles()` + implicit-global `lttpRoleRevealIdx` (never `let`-declared); `lttp-confirm-overlay` inner uses a non-canonical class string (LI5 play-again drift class).
- **Doc sync (game-identities):** Contacts status label corrected "✅ Safe" → "✅ Maybe" (the `safe` key renders "✅ Maybe"); map annotation wording "Safe (green)/Dead End (red)" → "Maybe (green)/Nope (red)"; Overlay Types table gained `lttp-new-plans-overlay`, `lttp-tip-overlay`, `lttp-help-tip-overlay`; MP section gained the L5 (plan-narrowing) + L6 (endgame) limitation bullets.
- **Clean:** Check B (no `sylly-toggle-on` — LTTP uses canonical `game-toggle-off`), Check C greps (no TODO, no wrong `window.` prefixes, the one `setTimeout`s are commented — message-flash reset line ~208 + focus-delay line ~913), **Check listeners — LTTP is the first Phase-22 game found COMPLIANT** (all listeners inside `DOMContentLoaded`, lines ~92 + ~916 + ~1345; the existing top-level-listeners [DOC] entry updated to note LTTP as the exception), Check F (all LTTP modal borders `red-300` ✓), Check D (`LTTP_MESSAGE_SEND` ACTION + `LTTP_GAME_START`/`LTTP_TURN_ADVANCE`/`LTTP_MESSAGE_INTERRUPT` SYNC present for the messaging loop; send button incidentally protected from double-submit by the z-[105] interrupt overlay despite the S10 no-op; `mpSerialiseSettings('lttp')` covers all 5 settings; play-again `lttp-new-plans-overlay` with dynamic labels + `mpReturnToLobby()` ✓; map/contacts local-only by design), AU English ✓, teardown (`lttp-new-plans-overlay` hidden in `engine.js`; tip overlays gap logged — see teardown [BUG]).

### Phase 3 — Per-Game: Natural Selection + Deep-Sea Deploy (13 June 2026)

**Method:** Full reads of `nat.js` (1234 lines) + `dsd.js` (1524 lines), their `index.html` sections (NAT screens ~3826–4185 + overlays ~4145–4385; DSD screens ~4387–4735 + overlays ~4736–5215), the NAT/DSD branches of `mpHandleEnvelope` + `mpSerialiseSettings` + `MP_GAME_CONFIGS` in `engine-multiplayer.js`, both impl-notes files; scripted greps (`sylly-toggle-on`, `overlay-modal-inner` borders, `<section>` layout classes, settings titles/quit copy, toggle initial classes).

**Recurring pattern CONFIRMED (4th occurrence — ready to elevate):** "a phase reachable after the core MP loop that never got the MDLM missing-handler audit." SS Intel (S12), YGI Sudden Death (Y4), LTTP guess/gameover (L6), and now **NAT Selection voting + Last Stand (N2)**. The YGI/LTTP session deferred elevation "until NAT/DSD confirm scope" — NAT confirms it squarely (a *core* phase, not just a tie-break). **Recommendation for Phase 5B/6:** add a `logic-engine.md` rule + Protocol C Part 2 row — "every game phase, including votes, tie-breaks, and endgames, needs the MDLM missing-handler audit, not just the main loop; a `*ReadyCheck` array that is reset but never read is the tell of an abandoned per-device collection." DSD does NOT add to this pattern (its gameover is MP-aware except the one terminal nuclear edge).

**Natural Selection:**
- **[BUG] N2:** Selection voting + Last Stand not MP-distributed — only the observation loop, clue reveal (`NAT_SELECTION`), and tally (`NAT_TALLY`) carry packets. `btn-nat-sel-start`/`natStartVoting` (applies peer-review −5 locally), the consensus/independent vote controls, mole guess, and Biologist verdict are ungated → every device runs a divergent local vote/eviction/Last-Stand; in MDLM the host can't collect remote players' votes. `natMpVoteReadyCheck` is reset in two handlers but read nowhere (abandoned scaffold). End state converges via `NAT_TALLY`. Logged N2 + fix plan.
- **Doc sync (game-identities) — settings table rewritten from reality (1B forward-flag resolved):** "Field Difficulty: Shallow/Mixed/All" → **Common/Rare/Exotic** (default **Rare** = `'d1+d2'`); "Voting Mode" → **"The Classification"** with a **"Field Consensus"** pill; "Escape Points" → **"Mole Escape Bonus"**; added Internal-variable column + the MDLM `natVotingMode='independent'` force note. Terminology gained "The Classification" + "Field Consensus" rows. MP section gained the N2 limitation bullet.
- **Clean:** Check A (settings title "The Permit Office 🦁" ✓, how-to "How to Play 🦁" ✓, quit "Abandon the expedition?" ✓, Sylly "Survival of the Fittest" ✓, AU English ✓), Check B (no `sylly-toggle-on` — `game-toggle-on-lime`), Check C (no `setTimeout` in `nat.js`, no TODO, bare `mpMyPlayerIdx`/`window.`-prefixed globals correct, no pill-stripping), **Check listeners — NAT COMPLIANT** (all listeners inside `DOMContentLoaded`, line ~1027 — 2nd compliant Phase-22 game after LTTP; [DOC] entry updated), Check E (both toggles have **initial** `shrink-0` ✓ — better than SS/GM; Sylly last ✓; scroll reset via `.overlay-data-inner` ✓; pills only toggle `pill-active-lime`), Check F (all 3 NAT modal borders `lime-300` ✓), Check D (`NAT_OBSERVATION` ACTION + `NAT_MATCH_START`/`NAT_ACTIVE_PLAYER`/`NAT_DAY_END`/`NAT_SELECTION`/`NAT_TALLY` SYNC present for the *observation* loop; `mpSerialiseSettings('nat')` covers all 8 settings ✓), Check G (`natApplyExpansionOverrides()` in `natStartGame()` + secret pool in `natDrawSpecimen()`; exhaustion handled by clearing `natUsedWordIds` and redrawing — no separate refill bug; minor: the MDLM setup path skips the override read, same as other games), layout (NAT is the centred-pattern reference — zero `h-screen`), play-again (`nat-new-expedition-overlay` confirm modal with dynamic MP labels + `mpReturnToLobby()` ✓), exit routing (quit→`screen-nat-menu`; post-game→`resetToLobby`).

**Deep-Sea Deploy:**
- **[BUG] Nuclear Mine MP gameover gap:** the Nuclear Mine branch of `dsdResolveHit()` ends the game via `setTimeout(dsdShowGameover, 2600)`, bypassing `dsdAdvanceTurn()` — the only `DSD_GAMEOVER` broadcaster. `dsdShowExecution()` broadcasts `DSD_EXECUTION_RESULT` but no `DSD_GAMEOVER`, so the non-active spectator/standby device is stranded (Danger Level IS serialised, so reachable in Lobby Mode). Logged dsd-impl-notes Bug Index + fix plan.
- **Doc sync (game-identities):** how-to title "Operations Manual ⚓" → **"How to Play ⚓"** (renamed Phase 28 per impl notes, never propagated — corrected in both the terminology table and the overlay table); settings table rewritten — the three "X Ends Turn" rows are actually **one "Hazard Control" card** with Urchin/Mine/Payload multi-select pills (active = ends turn; "Payload" pill = `enemy`), reordered to overlay reality (Sea State → Strategic Planning → Hazard Control → Danger Level → Sylly), Internal-variable column added (1B forward-flag resolved); SYNC packet list gained `DSD_CAPTAIN_ACTIVE`; MP section gained the nuclear-gameover bullet.
- **Doc sync (dsd-impl-notes):** Multiplayer Lessons "TLM captain routing" referenced non-existent `dsdShowCaptainPhase()` and `bldCurrentTeam` — corrected to `dsdShowCaptain()` / `dsdCurrentTeam` (reality wins).
- **Clean:** Check A (settings "The Console ⚓" ✓, how-to "How to Play ⚓" ✓, quit "Scuttle the Ship?" ✓, Sylly "Mission Abyss" ✓, AU English ✓), Check B (no `sylly-toggle-on` — `game-toggle-on-cyan`), Check C (the two `setTimeout`s are commented — `dsdDelay` helper used with WHY comments at call sites + the nuclear 2600ms with inline comment; no TODO; bare `mpMyPlayerIdx`/`window.`-prefixed globals correct; no pill-stripping — `classList.toggle('pill-active-cyan', …)` only), Check E (both toggles have initial `shrink-0` ✓; Sylly last ✓; scroll reset via `.overlay-data-inner` ✓), Check F (all 9 DSD `overlay-modal-inner` borders `cyan-300` ✓ — no copy-paste drift), Check D (`DSD_PING_TRANSMIT`/`DSD_SEQUENCE_SUBMIT` ACTION + `DSD_CAPTAIN_ACTIVE`/`DSD_CREW_ACTIVE`/`DSD_EXECUTION_RESULT`/`DSD_GAMEOVER` SYNC present; client execution preview is intentional + self-corrects via `DSD_EXECUTION_RESULT`; submit double-tap incidentally protected by the disarm overlay dismissal despite the S10 no-op; `mpSerialiseSettings('dsd')` covers all 5 settings incl. `dsdHazardControl` ✓), Check G (`dsdBuildGame()` reads `activeExpansionOverrides` + secret pool substitution + refill path in `dsdRerollWord()` — applies in MP too, since `dsdBuildGame` runs in both paths ✓), per-game notes verified (`dsdApplyDrift()` shuffles only unrevealed cells ✓; `dsdUpdateLegend()` called on every captain-screen open ✓; nuclear 2600ms delay commented ✓), layout (all 5 `h-screen` screens — captain/crew/execution/sabotage/spectator — have genuine sticky-footer CTAs ✓), play-again (`dsd-new-op-overlay` confirm modal + dynamic MP labels + `mpReturnToLobby()` ✓), exit routing (quit→`dsdResetState()`→menu; post-game→`resetToLobby`).

**Net new fix-plan entries this session:** 2 `[BUG]` (NAT N2, DSD nuclear gameover). No new `[POLISH]` — NAT and DSD are the cleanest pair so far on the polish axis (initial `shrink-0` present, borders correct, no deprecated classes, correct layout patterns). Doc corrections applied in place (NAT + DSD settings tables, DSD how-to title, DSD impl-notes drift) — not fix-plan entries (reality-wins doc syncs). The top-level-listeners [DOC] entry was updated to add DSD (non-compliant) and NAT (compliant, 2nd after LTTP). Fix-plan total: 51 → **53** (0 critical, 19 bugs, 24 polish, 10 doc).

### Phase 3 — Per-Game: Group Therapy + Dicey Bluffs (13 June 2026)

**Method:** Full reads of `gth.js` (1188 lines) + `dyb.js` (1163 lines), their `index.html` sections (GTH ~5825–6306; DYB ~6307–6643), the GTH/DYB branches of `mpHandleEnvelope` + `mpSerialiseSettings` + `MP_GAME_CONFIGS` in `engine-multiplayer.js`, both impl-notes files; scripted greps (deprecated toggle class, wrong `window.` MP prefixes, TODO/FIXME, AU English, pill-stripping, `setTimeout` comments). Both games are MDLM-only; both are **listener-compliant** (all `addEventListener` inside `DOMContentLoaded`) — joining LTTP/NAT, so the four newer MDLM games are uniformly compliant (top-level-listeners [DOC] entry updated).

**Group Therapy:**
- **[BUG] Case-screen `[?]` is dead (`btn-gth-how-to-case` has no listener)** — `gth.js` wires only `btn-gth-how-to`, which lives on `screen-gth-disorder-reveal`, a **single-device-only** screen (MDLM goes Intake → Canvas → Case directly). So in real MDLM play the only reachable help button is the dead one on the Case screen → How to Play is unreachable mid-game. Logged gth-impl-notes Bug Index + fix plan.
- **[POLISH] `gth-case-report-progress` div never populated** — reserved for per-player progress dots; no writer. Dead markup. Logged.
- **Doc sync (game-identities):** settings overlay title "Intake Form 📋" → **"Inpatient Admission Form 📋"** (reality); how-to title "The Disclaimer 🛋️" → **"How to Play 🛋️"** (reality is the standard title block — the "Disclaimer" name was never shipped). Both corrected in the terminology + overlay tables. Impl-notes header "Guess the Handicap (GTH)" → **"Group Therapy (GTH)"** (the game was renamed; header was stale).
- **Clean:** Check A (gameover "Session Summary 📋", reveal "Case Files Unsealed 📂", quit "Walk Out?" thematic ✓, AU English — "Unrecognised" ✓), Check B (no `sylly-toggle-on` — `game-toggle-on-sage`), Check C (no `setTimeout` — uses `setInterval` countdowns; no TODO; bare `mpMyPlayerIdx`/`syllyMultiplayerMode` correct; no pill-stripping — only `pill-active-sage` toggled), Check D (`GTH_PATIENT_READY`/`GTH_DRAWING_SUBMIT`/`GTH_DIAGNOSES_SUBMIT` ACTION + 8 SYNC handlers present; `deepdive-submit` carries `btn-mp-action` — GTH is one of the 4 games where the S10 sync-lock actually works; `mpSerialiseSettings('gth')` covers all 6 settings ✓), Check E (Sylly last ✓; `shrink-0` on both toggle states ✓; scroll reset via `.overlay-data-inner` ✓), Check F (both `overlay-modal-inner` borders present — `border-stone-300`, GTH's sage has no Tailwind `-300` utility so stone is the consistent fallback), per-game notes verified (`CanvasDraw.setTremor` targets `gth-canvas-wrapper` div not the canvas ✓; `GTH_PHASE2_BEGIN` carries `endTimestamp`, clients `gthStartPhase2Timer` ✓; host stores `gthAllDiagnoses` directly bypassing Firebase ✓; `gth-quit`/`gth-new-session`/`gth-settings`/`gth-how-to` overlays all in `resetToLobby()` ✓), play-again (`gth-new-session-overlay` confirm modal + dynamic MP labels + `mpReturnToLobby()` ✓), exit routing (quit→`gthResetState`→menu; post-game→`resetToLobby`). Note: the single-device path dead-ends in the Waiting Room (no Phase 2 kickoff when `single`) — dev-only path for an MDLM-only game; not logged as a player-facing bug.

**Dicey Bluffs:**
- **[BUG] BUG-06 — gameover standings invert the loser ranking:** `dybShowGameover()` does `order = [...eliminationOrder].reverse()` (line ~833) then spreads `...order.reverse()` (line ~837) — a double-reverse that nets the raw elimination order, so first-eliminated shows as runner-up. Violates game-identities "last eliminated = 2nd place." Logged BUG-06 + fix plan.
- **[BUG] BUG-07 — Phantom die never reveals:** `dybDieHTML` phantom branch shows "?" unconditionally even at `visible=true` (showdown), while the count includes it at its real value — the how-to promises a reveal. Logged BUG-07 + fix plan.
- **[BUG] BUG-08 — eliminated players pulled to the Shake screen:** `DYB_NEXT_SHAKE` calls `dybInitShake()` with no eliminated guard (BUG-02 only guarded `DYB_SHAKE_ACTIVE`), so eliminated devices sit on a live-looking Shake screen until `DYB_SPIRIT_SHAKE`. Logged BUG-08 + fix plan.
- **[POLISH] ×2:** dead ternary `dybSlickFaces = dybSpecialTypes.map(t => t === 'slick' ? -1 : -1)` (both branches −1); generic "GAME OVER" H2 (eyebrow "The Clean Out" is thematic).
- **Doc sync (game-identities) — the big one:** Sylly Mode rewritten from "Chaos Mode / Slick dice only" to **"Devil's Luck" with five die types** — Loaded (×2), Phantom (hidden face, counts at real value), Slick (owner-assigned face), Cracked (0), Snake/Snake Eyes (−1) — with `dybComputeRealCount` semantics + cumulative `typeOrder` rates. Brand `stone-700` → **`stone-400`** (every CTA uses `bg-stone-400` — an intentional muted brand, resolving the Phase 1D how-to flag). Settings title "The House Rules 🎲" → **"House Rules 📋"**; quit "Fold?" → **"Walk Away?"**; play-again "New Game?" → **"Roll Again?"**. The two forward-flagged fix-plan entries (DYB stone-400 [POLISH], DYB Chaos Mode [DOC]) marked ✅ resolved.
- **Per-game notes verified:** BUG-03 fix present — `dybResolveShowdown()` reads bidder from `dybAllegationHistory[last].playerIdx`, not `dybCurrentBidderIdx` ✓; BUG-02 guard present — `DYB_SHAKE_ACTIVE` has `!dybActivePlayers.includes(mpMyPlayerIdx)` early-return ✓; BUG-05 — `dyb-slick-picker-overlay` cleared in `resetToLobby()` (engine.js 468) AND in `btn-dyb-quit-confirm` (dyb.js 104) ✓.
- **Clean:** Check B (no `sylly-toggle-on`), Check C (all 5 `setTimeout`s commented — showdown tally animation + gameover delay; no TODO; `window.syllyMultiplayerMode` correct + bare `mpMyPlayerIdx` ✓; pills only toggle `pill-active-stone`), Check D (`DYB_ROLL_SUBMIT`/`DYB_ALLEGATION`/`DYB_CALL_BLUFF` ACTION + 7 SYNC handlers; `btn-dyb-roll-ready`/`btn-dyb-raise`/`btn-dyb-call-bluff` carry `btn-mp-action`; stale-action guards `env.originIdx === dybCurrentBidderIdx` ✓; `mpSerialiseSettings('dyb')` covers all 4 settings ✓), Check E (Sylly last ✓; `shrink-0` both states ✓; scroll reset via `.overlay-data-inner` ✓; intensity slider sub-option correct), Check F (all 3 `overlay-modal-inner` borders `border-stone-300` ✓), AU English ✓, layout (all 4 `h-screen` screens — shake/table/spirit/(+menu n/a) — have sticky-footer CTAs; showdown/gameover are centred ✓), exit routing (quit→menu; post-game→`resetToLobby`).

**Cross-cutting observation (both MDLM games):** mid-game quit-confirm navigates to the game menu without tearing down the Firebase room or notifying peers (GTH `gthResetState`+`gthShowMenu`; DYB hides overlays + `showScreen('screen-dyb-menu')`) — identical in both, matching the universal "✕ → game menu" rule; room teardown is deferred to the subsequent "← Back to the Box" → `resetToLobby()`. Consistent, so logged as an observation, not a per-game bug — re-confirm against BLD/PASS next session; if all four MDLM games share it, consider whether MDLM mid-game quit should broadcast `HOST_END_GAME` / mark a candidate rule.

**Net new fix-plan entries this session:** 4 `[BUG]` (GTH dead `[?]`, DYB BUG-06/07/08) + 3 `[POLISH]` (GTH dead progress div, DYB dead ternary, DYB generic GAME OVER heading). 2 prior entries marked ✅ resolved (DYB stone-400, DYB Devil's Luck doc) via reality-wins doc syncs. Doc corrections applied in place (GTH settings/how-to titles + impl-notes header; DYB Sylly Mode/brand/titles) — not fix-plan entries. Fix-plan total: 53 → **60** (0 critical, 23 bugs, 27 polish, 10 doc). **Phase 3 remaining: BLD, PASS.**

### Phase 3 — Per-Game: Bailed (BLD) (14 June 2026)

**Method:** Full read of `bld.js` (1716 lines), its `index.html` section (`screen-bld-*` ~5272–5820 + the seven BLD overlays), `bld-implementation-notes.md` (16 bugs already logged), and the BLD entries in `engine-multiplayer.js` (`MP_GAME_CONFIGS.bld` ~190–212, `mpSerialiseSettings` line 594 + deserialiser 706–707, `onPassThePhone`, `bldHandleEnvelope` routing 1227). Scripted greps: `function applyExpansionOverrides` (cross-file), `sylly-toggle-on`, `window.mp*` prefixes, `overlay-modal-inner` borders, `BLD_VOTE_PENDING`/`BLD_MISSION_PENDING` send sites. BLD is mid-testing — all 16 prior impl-notes bugs were cross-checked first; nothing below duplicates them.

**The big one — [CRITICAL] cross-game function clobber (NEW):** `bld.js` line 1273 declares a global no-op `function applyExpansionOverrides()` — the same generic name LI5 owns (`li5.js` line 162, the real Secret Mode override reader). `bld.js` loads after `li5.js`, so the hoisted declaration overwrites LI5's on `window`; LI5's `startGame()` then calls BLD's no-op and silently stops applying its forced expansion settings in Secret Mode. This is precisely the collision the JEC naming note warns about (JEC used `jecApplyExpansionOverrides()` to avoid it). Fix: rename to `bldApplyExpansionOverrides()` (no-op → behaviourally inert for BLD, restores LI5). Logged `bld-implementation-notes.md` Bug 16 + fix plan (first `[CRITICAL]` of the audit). The new-game checklist should gain a "no plugin may declare a top-level function whose name is already global in another plugin" grep.

**[POLISH] ×3 (NEW):** how-to Step 2 names the vote buttons "I'm In / Not Them" but the real buttons are "Sounds Good ✅ / No Way ❌" ("I'm In" is the mission card — conflated phases); dead `filled` variable + no-op `(x ? 0 : 0)` ternary in `bldRenderPatienceMeter()` (meter actually renders from `rejectionsThisPlan`); two dead SYNC handlers `BLD_VOTE_PENDING` (1208) + `BLD_MISSION_PENDING` (1238) — never broadcast (Bug 10's fix removed the broadcast; pending state is now per-device local).

**Doc sync (game-identities) — substantial, BLD docs were written from the spec not reality:**
- **Scoring rewritten:** BLD has **no points/Credibility currency** — it is pure win/loss (`bldGameResult = 'friends'|'flakes'`; aftermath shows winner + role reveal). The doc's "each Friend earns a point" / "+1 Credibility" was fictional.
- **Drama Mode rewritten from "+1 bonus" to the real win-flip:** when the Friends reach 3 successes, `bldCheckWinCondition()` returns false and `bldTriggerDramaLock()` runs; the Big Flake guesses the **Pot-Stirrer** (not "a Friend"); a correct guess **flips the entire result to a Flakes win** (`bldResolveDramaGuess`), wrong keeps the Friends' win. Big Flake terminology row updated to match.
- **Settings overlay title "The Group Chat" → "Bailed 💬"** ("The Group Chat" is actually the *setup-screen eyebrow*, line 5313). **Quit heading "Walk Out?" → "Leave the Chat?"** (confirm "Let's Bail" / cancel "Not yet!"). **Play-again "New Night Out" → "Second Chances"**; the documented `bld-new-night-overlay` does not exist (reuses `bld-second-chances-overlay`) — the prior fix-plan `[DOC]` entry marked ✅ resolved, and its incorrect "dual-purpose Flake-win confirm" claim corrected (the overlay is play-again only; patience-exhausted Flake win goes straight to aftermath).
- **Seat numbers note corrected:** MDLM uses the host's `screen-bld-seating` (reorder + Randomise), not "assigned randomly, not manually assigned"; only PTP shuffles in `bldAssignRoles()`.
- Overlay table: `bld-plan-detail-overlay` is a data slide-up ("The Receipts") z-[80], not a decision modal; `bld-pass-reveal-overlay` gates voting/mission PTP (role reveal uses the `screen-bld-pass-gate` screen).

**Clean / verified:** Check B (zero `sylly-toggle-on`); Check C (no naked `setTimeout` — none at all; bare `mpMyPlayerIdx` correct, no `window.` prefix — Bug 8 stays fixed; no TODO/FIXME; pills toggle correctly via full `className` swap, `.pill` base never stripped); Check D (all four client ACTIONs — `BLD_NOMINATION_CONFIRMED`/`BLD_VOTE_SUBMIT`/`BLD_MISSION_SUBMIT`/`BLD_DRAMA_GUESS` — have host handlers; submittable buttons carry `btn-mp-action`, so the suite-wide S10 sync-lock works here; `mpSerialiseSettings('bld')` covers the lone `bldDramaMode` setting); Check E (Drama Mode/Sylly is the only settings card and is last; toggle `game-toggle-off shrink-0`; scroll reset via `.overlay-data-inner`); Check F (all 5 BLD `overlay-modal-inner` borders `yellow-300` ✓); Check G (n/a — no word bank; the offending `applyExpansionOverrides` is the no-op hook, see CRITICAL above); AU English ✓; menu compliant (no `min-h-screen`, 4 buttons, "Make the Plans" CTA has no emoji, Settings light tint, How to Play `bg-stone-700`); header `[?]` (`btn-bld-how-to`) present + always visible; `bldShowTip()` drives all 5 contextual tips; Plan-4-at-7+ requires 2 bails (`bldBailsRequired`); play-again via confirm modal with `mpReturnToLobby()` + dynamic labels; quit → game menu. BLD min-players gap + the suite-wide `btn-mp-action`/overlay-teardown bugs were already logged (Phase 2/2B) — not re-logged.

**Recurring patterns:** (1) **Top-level event listeners** — BLD wires every listener at script top-level (only the sound button is inside `DOMContentLoaded`), so it is NOT listener-compliant, unlike the other newer MDLM games (LTTP/NAT/GTH/DYB). Corrects the GTH/DYB-session impression that "newer MDLM games are uniformly compliant" — BLD is the exception; added to the existing top-level-listeners `[DOC]` entry's non-compliant list. (2) **MDLM mid-game quit doesn't tear down the Firebase room / notify peers** — BLD's quit-confirm does `bldResetState(); bldShowMenu()` with no `HOST_END_GAME`, matching GTH + DYB exactly. The cross-cutting observation from the GTH/DYB session is now confirmed in a 3rd MDLM game; re-confirm against PASS, then decide whether MDLM mid-game quit should broadcast `HOST_END_GAME` (candidate rule).

**Net new fix-plan entries this session:** 1 `[CRITICAL]` (applyExpansionOverrides clobber) + 3 `[POLISH]` (how-to vote labels, dead patience var, dead SYNC handlers). 1 prior `[DOC]` marked ✅ resolved (BLD new-night overlay). Doc corrections applied in place (game-identities BLD Scoring/Drama Mode/Seat numbers/settings+quit+play-again titles/overlay table) — not fix-plan entries. Fix-plan total: 60 → **64** (1 critical, 23 bugs, 30 polish, 10 doc). **Phase 3 remaining: PASS.**

### Phase 3 — Per-Game: Pass (PASS) (14 June 2026)

**Method:** Full read of `pass.js` (1509 lines), its `index.html` section (`screen-pass-*` 6665–7022 + the four PASS overlays), `pass-implementation-notes.md` (no bugs logged — Phase 32 ship), and the PASS entries in `engine-multiplayer.js` (`MP_GAME_CONFIGS.pass` 257–275, `mpSerialiseSettings` case 600–602, `onPassThePhone` 260–266, `passHandleEnvelope` routing 1242). Scripted greps: `PASS_NEXT_ROUND`/`PASS_GAMEOVER` send sites (cross-file), `passResolveAbyssDetonation` call sites, `sylly-toggle-on`, `window.mp*` prefixes, `overlay-modal-inner` borders. PASS is MDLM-only and **listener-compliant** (all `addEventListener` inside `DOMContentLoaded`) — so of the five newer MDLM games, only BLD is non-compliant.

**[BUG] BUG-01 — Abyss never detonates mid-trick (Sylly Mode core mechanic incomplete):** `passResolveAbyssDetonation()` is only called on the round-winning play (`hand.length === 0` branch of `passProcessPlay`) and on a Fracture — never when a Bomb/Sequence is played that doesn't empty the hand. The marquee Sylly rule ("play a Bomb or Sequence → Abyss detonates, dealing clockwise to opponents") therefore almost never fires in normal play; the Abyss just grows on passes until a Fracture (13). The code comment "Abyss mid-trick detonation: table cleared by Bomb or Sequence" flags the intent but no code wires it, and the `'detonation'` trigger value documented under the `PASS_ABYSS_DRAFT` design decision is never sent. Logged pass-impl-notes BUG-01 + fix plan; game-identities Sylly bullet annotated with the gap (doc left describing intended behaviour per Principle 1).

**[BUG] BUG-02 — client `passRoundsWon` resets every round:** `passStartRound()` re-broadcasts `PASS_GAME_START` at the start of *every* round; the client handler zeroes `passRoundsWon = Array(...).fill(0)` each time, so a client's gameover "N rounds won" subline reflects only the final round. Host stays correct (host `passStartRound()` never touches `passRoundsWon`). Compounded by the client gameover passing local `passRoundsWon` rather than the authoritative `payload.roundsWon` the host sends in `PASS_ROUND_END`. Root cause: the intended per-round packet `PASS_NEXT_ROUND` (whose handler correctly does NOT reset `passRoundsWon`) exists but is never sent. Logged BUG-02 + fix plan.

**[POLISH] ×2:** two dead SYNC handlers — `PASS_NEXT_ROUND` + `PASS_GAMEOVER` — defined in `passHandleEnvelope` but never broadcast (rounds 2+ reuse `PASS_GAME_START`; gameover via `PASS_ROUND_END { matchOver:true }`); `screen-pass-round-wrap` + `screen-pass-seating` have no ✕ exit (a non-host client stuck on "Waiting for the host..." can't leave — Protocol A §4 violation).

**[DOC] (cross-game):** MDLM mid-game quit teardown is inconsistent — **PASS dissolves the room correctly** (`PASS_MATCH_DISSOLVED` host / `PASS_PLAYER_LEFT` client + `resetToLobby()`), whereas GTH/DYB/BLD navigate to the game menu and leak the Firebase room. This **resolves the cross-cutting observation** carried since the GTH/DYB + BLD sessions: it is NOT a universal pattern — PASS is the counter-example and the most-correct one. Logged as a `[DOC]` decision: standardise the four MDLM games on one mid-game-quit contract (recommend PASS's dissolve, encoded in `logic-engine.md`). Note PASS's quit deviates from "✕ → game menu" (goes straight to lobby) and that one player quitting dissolves the whole match — PASS can't tolerate a mid-match drop.

**Doc sync (game-identities) — applied in place (Principle 3):** SYNC packet list corrected — `PASS_GAME_START` re-broadcast every round; `PASS_ABYSS_DRAFT` only sends `'round-win'`/`'fracture'`; `PASS_ROUND_END` carries `matchOver`/`finalChips`/`roundsWon` and drives the gameover transition; `PASS_NEXT_ROUND`/`PASS_GAMEOVER` documented as defined-but-unused; added the mid-game-quit-dissolve note. Config cross-checked: `MP_GAME_CONFIGS.pass` (mdlm-only, min 3 / max 6, rosterConfig `none`) matches game-identities ✓; `onPassThePhone` populates `passPlayerCount`/`passPlayerNames` from `mpPlayerSlots` (host) ✓; `mpSerialiseSettings('pass')` covers all 9 settings ✓.

**Clean / verified:** Check A (menu "takes the pot! 🃏", round wrap "wins the round!", quit "Walk Away?" thematic ✓, settings "The House Rules 🃏", how-to "How to Play 🃏" with correct 4-step → Winning and Scoring → Sylly Mode structure + `text-zinc-700` step labels; AU English — "Customise" ✓; "Round"/"Match" used literally but PASS defines no thematic substitute — acceptable); Check B (zero `sylly-toggle-on` — `game-toggle-on-zinc`/`game-toggle-off`); Check C (no naked `setTimeout` — all four commented except the error-hide debounce at line 1263, self-evident; bare `mpMyPlayerIdx` + `window.syllyMultiplayerMode` correct; no TODO/FIXME; pills toggle only `pill-active-zinc`, `.pill` base never stripped); Check D (`PASS_PLAY_SUBMIT`/`PASS_PASS_SUBMIT`/`PASS_PLAYER_LEFT` ACTION all have host handlers; play/pass/seating-start/next-round all carry `btn-mp-action` — S10 sync-lock works here; `mpSerialiseSettings` complete); Check E (Sylly Mode last card ✓; both toggle states `shrink-0` ✓; scroll reset via `.overlay-data-inner` ✓); Check F (both `overlay-modal-inner` borders `border-zinc-300` ✓); Check G (n/a — card game, no word bank, no Secret Mode hook — documented in impl-notes Template Gaps); layout (table = `h-screen overflow-hidden` + `flex-1 min-h-0` body + sticky footer ✓; seating/round-wrap/gameover = `min-h-screen` centred ✓; menu content-height ✓); per-game notes verified (rank-hierarchy comment + 2s excluded from sequences ✓; Two-Natural-Card Anchor ✓; full-circuit pass clears table ✓; Abyss inline strip not overlay ✓). Section header comment (5 screens / 4 overlays) matches reality. Single-device path is a dev-only dead-end (PASS is MDLM-only; `passPlayerCount` is never set without `onPassThePhone`'s host branch) — not a player-facing bug, matches GTH/DYB.

**Recurring patterns:** (1) **Dead SYNC handlers wired during spec, never sent** — PASS (`PASS_NEXT_ROUND`/`PASS_GAMEOVER`) joins BLD (`BLD_VOTE_PENDING`/`BLD_MISSION_PENDING`) and the GM/JEC near-sync gaps; a "grep every documented packet for a send site" step would catch these. (2) **A re-used "start" packet doubling as a per-round packet drops cumulative state** — PASS's `PASS_GAME_START`-every-round wiping `passRoundsWon` echoes JEC's `JEC_NEXT_ROUND` pool-pop transient; the lesson is that match-init and round-init packets must have distinct reset scopes. (3) **MDLM mid-game quit teardown** — now resolved across all four MDLM games: PASS dissolves correctly, GTH/DYB/BLD leak → `[DOC]` standardisation decision.

**Net new fix-plan entries this session:** 2 `[BUG]` (PASS Abyss mid-trick detonation, PASS client roundsWon reset) + 2 `[POLISH]` (PASS dead SYNC handlers, PASS round-wrap/seating missing ✕) + 1 `[DOC]` (MDLM mid-game quit teardown standardisation). Doc corrections applied in place (game-identities PASS SYNC packets + Sylly detonation gap + quit-dissolve note) — not fix-plan entries. Fix-plan total: 64 → **69** (1 critical, 25 bugs, 32 polish, 11 doc). **Phase 3 COMPLETE — all 12 games audited. Next: Phase 4 (Data).**

### Phase 4 — Data (14 June 2026)

**Method:** Three throwaway Node scripts (temp dir, not committed) — 4E parse smoke test first, then full structural sweeps of all six `data/*.json` files: schema/field-shape per entry, id uniqueness (within-file and cross-file), category order + counts, difficulty distribution, animals `nono_list[0]` Broad-Shield analysis, DSD-eligible (space-free) counts, ygi `[ ]` gap count + ringer shape, gth cluster sizes + alias minimums. No data files were edited (Principle 1 — flag, don't rewrite).

**4E — Parse smoke test:** All 6 files `JSON.parse` cleanly — `words.json` (850), `secret_words.json` (434), `secret2_words.json` (50), `secret3_words.json` (151), `ygi-data.json` (50), `gth-data.json` (100). No `[CRITICAL]` malformed-file catches.

**4A — words.json:**
- **Format ✓** — custom serialiser intact: array brackets + one compact `JSON.stringify(entry)` per line (2-space indent before `{`, no pretty-print of keys — 0 indented-key lines). 16 blank-line separators (15 between categories + 1 trailing before `]`).
- **Category order ✓** — exact match to the canonical 16-category order; 850 entries; counts: animals 100, food 100, places 70, objects 55, sports 50, nature 50, vehicles 50, jobs 50, activities 50, aussie_slang 30, pop_culture 45, people 25, brands 30, emotions 50, actions 50, music 45.
- **Schema ✓** — all 850 entries: string `id`, string `word`, `nono_list` array of exactly 10, valid `category`, `difficulty` ∈ {1,2,3}, no unexpected fields.
- **[BUG] duplicate id `objects-053`** — shared by "Walkie-Talkie" (d2, idx 308) and "Stapler" (d1, idx 322); `objects-039` is the missing slot (objects runs 001–055). Stapler should be re-keyed to `objects-039`. Logged to fix plan.
- **Animals Broad Shield ✓** — no scientific class names (no Mammalia/Aves/etc.); 22 distinct shields across 100 animals; largest is "Sea Creature" at 13% — under the 15% "too broad" threshold (Hoofed Animal 11%, Small Critter 10% next).
- **Difficulty distribution** — most categories span all three tiers. Structural skews (by design, not bugs, noted for 4F): `aussie_slang` d1=0 (all d2/d3 — slang is inherently abstract), `emotions` d1=0 (abstract by nature), `brands` d3=0, `actions` d3=1. Flagged as future-proofing notes only.
- **DSD eligibility** — 195 of 850 words contain a space (DSD excludes them). Per-category space-free counts healthy in every DSD-eligible category (lowest: vehicles 34/50, activities 35/50, sports 39/50; emotions/actions 50/50).

**4B — ygi-data.json:** 50 entries, **fully clean** — every entry `{id, text, ringers}` only; every `text` contains `[ ]` exactly once; every `ringers` is an array of exactly 5 `{number:number, metric:string}` pairs; all ids `ce-NNN` (legacy format, no `ygi-NNN` yet — consistent, no mixing). Zero issues.

**4C — gth-data.json:** 100 entries, **fully clean** — all required string fields present + non-empty (`id, name, display, definition, tip, category`); `difficulty` ∈ {1,2,3} spanning all tiers (d1=25, d2=42, d3=33); every entry has ≥3 `aliases`; all 9 `cluster` values have ≥3 members (existential 19, loops 18, impulses 12, social 12, environments 11, transit 10, sleep 8, medical 6, creatures 4). Zero issues.

**4D — Expansion banks:** All three files exist and precache-referenced. No duplicate ids within any file; **no id collisions with `words.json`**; no cross-bank collisions. `secret2_words.json` (large_monsters 50) and `secret3_words.json` (gen1 151) fully clean.
- **[DOC resolved precisely] secret_words.json — 10 `world-*` entries missing the `category` key entirely** (world-075, 081–087, 090, 095). The Phase-1A flag is now exact: the key is *absent* (parses to `undefined`), not an empty string; all 10 belong to category `World` by id/theme. Existing fix-plan `[DOC]` entry updated with the precise id list + fix.
- **[BUG] secret_words.json — `world-001` ("Ancient") has an 11-word `nono_list`** (Throne…Victory) where the schema requires exactly 10. Low play impact (LI5 slices to 5/10) but a schema-length violation. Logged to fix plan.
- Field-shape sweep: 424 entries have the full 5-key shape; the 10 category-less entries have the 4-key shape — no other shape variants.

**4F — Schema future-proofing notes (no rewrites):**
1. **`words.json` id integrity** — the `objects-053`/`objects-039` collision shows id numbering can drift during edits; a pre-commit `node` uniqueness check (the Verify one-liner in the fix plan) would catch this class permanently. Candidate for a content-tooling guard.
2. **`secret_words.json` category hygiene** — category values are mixed-case Title Case (`Heroes`/`Items`/`World`/`Social`) whereas `words.json` uses lowercase_snake (`animals`/`pop_culture`). Not a bug (each bank is filtered independently), but worth standardising if a future game ever pools the standard + expansion banks together by category.
3. **`difficulty` floor gaps** — `aussie_slang` and `emotions` have zero d1 entries and `brands` zero d3. Intentional given the category nature, but if a future game hard-requires a d1 word from an arbitrary category it would fail on these two. Noted, not flagged.

**Net new fix-plan entries this session:** 2 `[BUG]` (words.json dup id `objects-053`, secret_words.json `world-001` 11-word nono_list). 1 prior `[DOC]` (secret_words empty category) made precise — not a new entry. No data files edited. Fix-plan total: 69 → **71** (1 critical, 27 bugs, 32 polish, 11 doc). **Phase 4 COMPLETE. Next: Phase 5 (Documentation Closure).**

### Phase 5A — Implementation Notes Review (14 June 2026)

**Method:** Read all 12 `docs/implementation-notes/[abbr]-implementation-notes.md` files in full. Scripted grep confirmed the four canonical section headers (Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps) in every file. Cross-checked each file's Bug Index against the per-game bugs logged in the Phase 3 Audit Findings above.

**Four-section structure: all 12 present ✅.** No file is missing a required section. Three files carry extra/variant sections, all benign: SS has an added "Polish Index" (S13–S17) between Multiplayer Lessons and Template Gaps; BLD has two extra "Design Decisions (…)" subsections (how-to rewrite + polish round); GTH's Multiplayer Lessons is a deliberate one-line pointer to BLD (its MP patterns live in the extensive Design Decisions block, so not a stub).

**Bug Index currency: every Phase 3 bug is already logged ✅.** The Phase 3 sessions logged to impl notes as they went, so 5A found zero missing entries. Confirmed present per game: LI5 L6/L7/L8; GM G4/G5/G6; SS S9/S10/S11/S12; JEC J2/J3/J4; YGI Y3/Y4/Y5; LTTP L5/L6; NAT N2; DSD Nuclear-Mine gameover gap; GTH dead case-`[?]` + `gth-case-report-progress` dead div; DYB BUG-06/07/08; BLD Bug 16 (CRITICAL `applyExpansionOverrides` clobber); PASS BUG-01/02 (+ 2 POLISH). Polish-only findings correctly live in the fix plan / Template Gaps rather than the Bug Index, per the Phase 3 output contract.

**Phase 4 data bugs:** not per-game (they live in `words.json` / `secret_words.json`), so they belong to no game's impl notes — tracked in the fix plan only. No impl-notes action.

**One gap closed (the only edit this sub-phase):** DYB's Multiplayer Lessons section was an empty `*(to be filled during testing)*` placeholder despite DYB being a shipped (Phase 31) MDLM-only game with six MP-related bugs. Filled it by distilling four lessons already evidenced in DYB's own Bug Index (no invention): guard every Shake-screen entry point not just the first (BUG-02/08); track last-bidder separately from next-turn (BUG-03); re-derive host-set counts in the SYNC handler on every device (BUG-01); tear down mid-game overlays in both reset paths (BUG-05).

**No new fix-plan entries** (5A is a documentation-completeness review). Fix-plan total unchanged at **71**. **5A COMPLETE. Next: Phase 5B (Cross-Game Lessons Elevation).**

### Phase 5B — Cross-Game Lessons Elevation (14 June 2026)

**Method:** Re-read the Bug Index + Template Gaps of all 12 impl notes files. Identified patterns appearing in 2+ games that were NOT yet captured in a rule file, then elevated each to the correct destination with a `[Elevated from …]` tag at the elevation site. UI patterns were checked separately — all recurring UI lessons (how-to 3-level format, pill toggle, modal border, shared tip overlay, layout pattern, "How to Play" title) are already standardised in `ui-style.md`, so no new UI elevation was required.

**Recurring multiplayer bugs → `phase-audit.md` Protocol A §2 (new "MDLM technical-debt checks" subsection):**
1. **Host-only interactions need an explicit `client` early-return** — an absent broadcast branch is not a guard; clients run the logic locally and diverge. *(jec J3/J4, ygi Y5, nat N2, lttp L5 — 4 games.)*
2. **Secondary-phase missing-handler audit** — votes, tie-breaks, sudden-death, intel/guess, endgame resolution are repeatedly shipped pass-the-phone-only with zero packets. A `*ReadyCheck` reset-but-never-read is the tell. *(ss S12, ygi Y4, lttp L6, nat N2 — 4 games; nat-impl-notes explicitly requested this elevation.)*
3. **SYNC handlers render, never re-resolve / double-push** — clients apply the authoritative payload; they must not re-run the resolver or push a log entry the resolver already pushed. *(ss S9, ygi Y3, bld Bug 12 — 3 games.)*
4. **Mid-game `fixed inset-0` overlays torn down in BOTH reset paths** — survives as an invisible full-screen tap interceptor otherwise. *(dyb BUG-05, gth canvas wrapper, lttp tip overlays, ygi help-tip — 4 games.)*

**Template gaps → `logic-engine.md`:**
5. **No global function-name collision across plugins** (new "Adding a New Game" item) — all plugins share `window`; a later plugin's hoisted `function` clobbers an earlier one. Expansion hook must be `[abbr]ApplyExpansionOverrides()`. *(bld Bug 16 clobbered LI5, jec naming note.)*
6. **Contextual tip IDs uniquely named** `btn-[abbr]-[phase]-tip` vs `btn-[abbr]-how-to` (new "Adding a New Game" item) — duplicate IDs leave the second button unwired; wire the `[?]` on the *reachable* screen. *(ss S3, dsd dup id, gth btn-gth-how-to-case.)*
7. **MDLM host readyCheck self-submission processed directly** (new MDLM Patterns entry + checklist item) — the dedup guard drops self-sent envelopes, hanging the round. *(jec J1, ygi Y1/Y2.)*
8. **Secondary-phase coverage** added to the existing § Interceptor Pattern "Missing handler audit" note (strengthened, not duplicated).

**Doc-error correction (Principle 3 — reality wins):** `logic-engine.md` stated `mpPlayerSlots[i].name` in both the MDLM Patterns section and the new-game checklist. Verified against `engine-multiplayer.js` (~line 624): the slot object is `{ uid, nickname }` — the field is `.nickname`; `.name` returns `undefined` silently. `pass-impl-notes` had caught this; `bld-impl-notes` carried the imprecise `.name`. Both `logic-engine.md` sites corrected.

**5D contract made durable (per 5B instruction):** Added a `new-game-brief-prompt.md` sync line to (a) `logic-engine.md` "Adding a New Game" closure and (b) `new-game-process.md` Stage 3 "complete when" checklist, requiring the roster table / taken-abbreviations / Sylly-name list to be synced from shipped reality on every new game. Without this the 5D going-forward rule would live only in this audit plan (archived at audit close).

**Files changed:** `phase-audit.md` (4 new §2 items), `logic-engine.md` (2 `.nickname` fixes, host-readyCheck pattern, strengthened missing-handler note, 4 new checklist items), `new-game-process.md` (1 Stage 3 closure item). **No new fix-plan entries** (5B elevates lessons into rule files; the underlying bugs were already logged in Phases 3–4). Fix-plan total unchanged at **71**. **5B COMPLETE.**

### Phase 5D — Content-Prompt Doc Sync (14 June 2026)

**Done out of order at user request (5C — Rule File Final Pass — still pending).**

**Method:** Read all 4 `docs/content-prompts/` files and checked each against shipped reality (`game-identities.md`, `definitions.md`, the data files) per the 5D source-of-truth caveat — never against the original briefs.

**`new-game-brief-prompt.md` — 4 roster fixes (was stale at 9 games):**
- Existing-games table: added `dyb` (Dicey Bluffs), `bld` (Bailed), `pass` (Pass) → now 12.
- "Taken" abbreviations line: added `dyb, bld, pass` (was an abbreviation-collision risk).
- Sylly-Mode tone references: added Devil's Luck (DYB), Drama Mode (BLD), The Abyss (PASS).
- Thematic-vocabulary example: GTH settings title `Intake Form 📋` → `Inpatient Admission Form 📋` (the brief-era value that shipped differently — the exact drift the 5D caveat warns about).

**`ygi-prompt.md` — ID-convention drift fixed (genuine 5D catch):** the prompt instructed new entries to use the legacy `ce-NNN` format, but the project convention (`game-identities.md` § YGI data format, `definitions.md`) is `ce-NNN` = legacy / new entries = `ygi-NNN` starting at `ygi-001`. Verified `data/ygi-data.json` holds 50 `ce-*` entries and zero `ygi-*`, so the next new entry is `ygi-001`. Updated the schema line, the ID guidance, the example entry (`ce-051` → `ygi-001`), the "Start IDs from" line, and the tip. Without this fix, the first batch of new YGI content would have re-imported the wrong ID series.

**`words-json-prompt.md` — verified clean:** 16-category list, Broad-Shield rules, GM-compatibility category list, and schema all match `definitions.md`.

**`gth-prompt.md` — verified clean:** schema (category + difficulty + optional cluster + aliases) matches the Phase 31 data rehaul; cluster list and guardrails accurate; the "next available ID" note is informational per the plan (no audit action).

**Files changed:** `new-game-brief-prompt.md`, `ygi-prompt.md`. **No new fix-plan entries** (content-prompt doc sync). Fix-plan total unchanged at **71**. **5D COMPLETE.**

### Phase 5C — Rule File Final Pass (14 June 2026)

**Done after 5D at user request (the only remaining Phase 5 sub-phase).** Final cross-file consistency read of the four checkpoints in the plan.

**`CLAUDE.md` ↔ `logic-engine.md` ↔ `sw.js` — consistent ✓:**
- SW version `v101` matches in all three (`sw.js` line 4 `CACHE_NAME`, CLAUDE.md, logic-engine.md).
- Precache list: `logic-engine.md` (31 entries) matches `sw.js` `PRECACHE_URLS[]` exactly (re-confirmed against disk, not just Phase 1C/2B).
- CLAUDE.md Current Focus (Studio Audit June 2026, v101, 11 gold-master + BLD in testing) is internally consistent; current-focus state lives only in CLAUDE.md, so nothing to reconcile.

**`game-identities.md` ↔ `ui-style.md` (brand colours / toggle / how-to) — one drift fixed:**
- **DYB brand drift [fixed]:** `ui-style.md` Per-game brand reference table listed DYB as `stone-700` / `bg-stone-700`, while its own how-to per-game table (line 332) AND `game-identities.md` § Dicey Bluffs (line 920) both say the muted `stone-400`. Corrected the brand-reference row to `stone-400` / `bg-stone-400 hover:bg-stone-500` and added a Notes bullet recording the correction. The toggle (`game-toggle-on-stone`) and range (`dyb-range`) classes are shade-agnostic and were already correct.
- **GM split [cross-referenced]:** `game-identities.md` documents GM's `violet-500` CTA / `purple-*` pill split with a "see fix plan" pointer, but `ui-style.md` listed only `purple-500` with no note. Added a Notes bullet in `ui-style.md` flagging the documented split so the two files agree. This is a known logged item (GM unify-or-document), not new drift.
- All other games' brand colours, toggle ON classes, range classes, and how-to Sylly-Mode names are consistent between the two files (DYB/BLD/PASS Sylly names re-confirmed post-5D: Devil's Luck / Drama Mode / The Abyss).

**`phase-audit.md` Protocol C table — confirmed current ✓:** all 14 Part 2 rows still relevant and accurate; no conflict with the 4 MDLM rows added to Protocol A §2 in 5B (Protocol C is the pre-new-game cross-suite sweep; A §2 is the per-game phase gate — complementary). No edits.

**Files changed:** `ui-style.md` (DYB brand-reference row + 2 Notes bullets). **No new fix-plan entries** (the DYB row was a doc-internal reconciliation per Principle 3; the GM split was already logged). Fix-plan total unchanged at **71**. **5C COMPLETE — Phase 5 (Documentation Closure) fully closed. Next: Phase 6 (Audit Summary & Fix Plan).**

### Phase 6 — Audit Summary (Consolidated, 14 June 2026)

The detailed per-phase findings are above. This is the roll-up. **Deliverables:** this summary (Output A) + `docs/fable-fix-plan.md` (Output B — 71 issues, finalised, status "Awaiting developer review"). No game code was written (Principle 1); every code-level finding is logged, not fixed.

#### Phase 1 — Rules & Meta-Docs (all 6 files synced to reality)
- **CLAUDE.md (1A):** structure map + load order + data counts corrected; non-existent `@new-game-template.md` reference replaced with the 3 real files; phase27-snapshot reference removed.
- **game-identities.md (1B):** game numbering fixed; GTH Screens table added; PASS packets + terminology corrected; LI5/SS overlay tables completed; settings display-name drift forward-flagged to Phase 3 (resolved there for all games).
- **logic-engine.md (1C):** precache list synced to `sw.js`; `resetToLobby()` MP block rewritten to match `engine.js`; `updateSliderTheme`/`getMuteToggleOnClass` documented.
- **ui-style.md (1D):** all theming tables extended to 12 games; mute-toggle theming section added; menu CTA labels synced to reality; `sylly-toggle-on` marked deprecated.
- **phase-audit.md (1E):** Protocol C added to When-to-Run; stale paths fixed; 3 new MP rows added to Protocol C Part 2.
- **definitions.md (1F):** legacy DSTW/Sylly Signals names purged; all 12 prefixes listed; MP/theming terms + data-file pointers added.

#### Phase 2 + 2B — Code Map & Engine Infrastructure
- **code-map.md (2):** stamped Phase 32/June 2026; **BLD section added in full**; LI5/GM/SS/YGI/LTTP/DSD/GTH/DYB function + ID drift corrected against scripted sweeps (115 screens, all plugins).
- **2B (scripted cross-checks):** screen registry clean (115↔115); zero true duplicate IDs (1377 unique); function-existence + SW-precache + load-order all clean. New findings: 20-overlay teardown gap `[BUG]`, PASS mode-screen config `[BUG]`, BLD min-players absent `[BUG]`, doubled-`id` attributes + dead CSS + Google-Fonts-CDN `[POLISH]`, stale section headers + unread `multiplayerOnly` `[DOC]`. `game-identities.md` SS `supportsHybrid` (non-existent field) corrected.

#### Phase 3 — Per-Game (all 12 audited)
- **Bugs by game:** LI5 (deck-panel z-index, gatekeeper phantom timer); GM (near-sync round discarded); **suite-wide** (`mpLockSync` no-op for the 8 Phase-22 games — `btn-mp-action` never applied); SS (client double-resolve, 2-device assumption, Intel-Phase crash); JEC (unguarded client merges, ungated sifting/tally CTAs); YGI (round-log double-push TypeError, sudden-death not MP-aware, ungated results-next); LTTP (plan-narrowing not synced, guess/gameover no packets); NAT (selection voting + Last Stand not MP-distributed); DSD (Nuclear-Mine bypasses `DSD_GAMEOVER`); GTH (dead Case-screen `[?]`); DYB (inverted gameover standings, phantom-die never reveals, eliminated pulled to Shake); BLD (**[CRITICAL]** `applyExpansionOverrides` clobbers LI5's global); PASS (Abyss never detonates mid-trick, client rounds-won reset).
- **Doc syncs applied in place (reality wins):** every game's settings table, terminology, overlay/screen tables reconciled against its plugin — biggest were JEC (Phase-29 tiered scoring never reached the doc), DYB (Sylly Mode "Chaos Mode/Slick-only" → "Devil's Luck/5 die types"), BLD (pure win/loss, not points; Drama Mode win-flip not bonus), NAT/DSD/GM/SS settings display names.

#### Phase 4 — Data (all 6 files parse clean)
- words.json: format/order/schema clean; **dup id `objects-053`** + missing `objects-039` `[BUG]`; animals Broad Shield ≤15% ✓.
- secret_words.json: **`world-001` 11-word `nono_list`** `[BUG]`; **10 `world-*` entries missing `category` key** `[DOC]` (Phase-1A flag made precise — key absent, not empty string).
- ygi-data.json (50) + gth-data.json (100): fully clean. Expansion banks: no id collisions.

#### Phase 5 — Documentation Closure
- **5A:** all 12 impl-notes files have the 4 canonical sections; every Phase-3 bug already logged; DYB Multiplayer Lessons placeholder filled.
- **5B:** 8 cross-game lessons elevated to rule files (see below); `logic-engine.md` `.name`→`.nickname` correction; 5D sync contract made durable in `logic-engine.md` + `new-game-process.md`.
- **5C:** SW/precache consistent across CLAUDE.md/logic-engine.md/sw.js; DYB brand drift `stone-700`→`stone-400` fixed in ui-style.md; GM split cross-referenced.
- **5D:** `new-game-brief-prompt.md` synced to 12-game roster + abbreviations + Sylly names; `ygi-prompt.md` `ce-`→`ygi-` ID-convention fixed.

#### Recurring Patterns Elevated to Rule Files
- **Host-only interactions need an explicit `client` early-return** (jec/ygi/nat/lttp — 4 games) → `phase-audit.md` Protocol A §2 (new MDLM technical-debt subsection).
- **Secondary-phase missing-handler audit** — votes/tie-breaks/sudden-death/intel/endgame shipped pass-the-phone-only; a reset-but-never-read `*ReadyCheck` is the tell (ss/ygi/lttp/nat — 4 games) → Protocol A §2 + § Interceptor Pattern note strengthened.
- **SYNC handlers render, never re-resolve / double-push** (ss/ygi/bld — 3 games) → Protocol A §2.
- **Mid-game `fixed inset-0` overlays torn down in BOTH reset paths** (dyb/gth/lttp/ygi — 4 games) → Protocol A §2.
- **No global function-name collision across plugins** (bld clobbered LI5; jec naming note) → `logic-engine.md` "Adding a New Game".
- **Contextual tip IDs uniquely named** `btn-[abbr]-[phase]-tip` vs `btn-[abbr]-how-to` (ss/dsd/gth) → `logic-engine.md` "Adding a New Game".
- **MDLM host readyCheck self-submission processed directly** (jec/ygi) → `logic-engine.md` MDLM Patterns + checklist.
- **`new-game-brief-prompt.md` sync on every ship** → `logic-engine.md` closure + `new-game-process.md` Stage 3.

#### Open Flags (Require Developer Decision)
- **GM brand split** `[DOC]` — unify violet→purple (Node script) or document the violet-CTA/purple-chrome scheme deliberately in ui-style.md.
- **Legacy top-level event listeners** `[DOC]` — 7 plugins (LI5/GM/SS/JEC/YGI/DSD/BLD) fail Protocol A §2's "no global-scope listeners" but are functionally safe (script-after-markup load order). Relax the rule wording or schedule a refactor.
- **MDLM mid-game quit teardown** `[DOC]` — PASS dissolves the room correctly; GTH/DYB/BLD navigate to menu and leak it. Standardise on one contract in `logic-engine.md`.
- **`multiplayerOnly` config field unread** `[DOC]` — remove it or document it as informational (enforcement is `supportedModes`).
- **Missing snapshots** `[DOC]` — `phase27-snapshot.md` (LI5/GM/SS polish) and `phase32-snapshot.md` (PASS ship) do not exist; write retroactively or accept the gap.
- **Google Fonts CDN** `[POLISH]` — Fredoka loaded from CDN contradicts the "fully offline" constraint; self-host or document the exception.

**Audit complete.** All 7 phases closed. Output B (`docs/fable-fix-plan.md`) is the actionable work list — work CRITICAL → BUG → POLISH → DOC; bump SW version once after all precached-asset fixes land.
