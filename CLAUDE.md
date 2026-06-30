# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📂 Rule Files

**Always loaded (auto-imported via `@` — keep this list lean; every file here costs baseline tokens in EVERY session):**
- `@ui-style.md` — overlays, buttons, speaker/exit protocol, settings layout, Sylly Tone (apply-on-every-edit pattern rules)
- `@logic-engine.md` — engine/plugin split, screen routing, audio catalogue, PWA, new-game checklist (apply-on-every-edit pattern rules)
- `@definitions.md` — naming conventions, comment style, data schema, project-wide terms

**On-demand — READ with the Read tool only when the trigger applies (NOT auto-loaded; do not read these during routine bug/polish work):**
> ⚠️ These live in `docs/rules/`, NOT `.claude/rules/`, **on purpose**. The harness auto-loads every file in `.claude/rules/` into baseline context every turn — keeping the big on-demand docs there cost ~50k tokens/turn and caused mid-task auto-compact spirals. Do NOT move them back into `.claude/rules/`. Only the three always-loaded files above belong there.
- `docs/rules/game-identities.md` — per-game themes, terminology, settings tables, special mechanics. **135 KB / 16 game sections — never read whole.** **Read when:** doing non-trivial work on a specific game — Grep for that game's `## Game N:` heading and offset-Read only that one section. The quick index below covers most "which colour / which file / which abbr" lookups without opening it.
- `docs/rules/new-game-process.md` — three-stage protocol for adding a new game (brief → tech spec → implementation). **Read when:** starting a new game.
- `docs/rules/new-game-brief-template.md` — Phase 1 design brief template (filled by project owner + Gemini). **Read when:** new-game Stage 1.
- `docs/rules/new-game-technical-template.md` — Phase 2 technical spec template (filled by Claude Code). **Read when:** new-game Stage 2.
- `docs/rules/phase-audit.md` — Protocols A/B/C (drift check, skeleton-first, studio sweep). **Read when:** a phase boundary, or before a new game's first line of code.

### 🎮 Per-Game Quick Index
Always-on pointer so single-game work doesn't need the 128 KB `game-identities.md`. For terminology, settings tables, overlays, multiplayer packets → read that game's `## Game N:` section in `game-identities.md`. Brand colour rarely changes; everything else, confirm in-section.

| # | Game | `activeGameId` | Plugin file | Brand / active-pill |
|---|------|---------------|-------------|---------------------|
| 1 | Like I'm Five | `li5` | `li5.js` | pink-500 / `pill-active-pink` |
| 2 | Great Minds | `great-minds` | `great-minds.js` | violet-500 CTAs + purple-* pills / `pill-active-purple` |
| 3 | Secret Signals | `sylly-signals` *(legacy id)* | `secret-signals.js` | teal-500 / `pill-active-teal` |
| 4 | Just Enough Cooks | `jec` | `jec.js` | amber-500 / `pill-active-amber` |
| 5 | You Get It? | `ygi` | `ygi.js` | orange-500 / `pill-active-orange` |
| 6 | Late to the Party | `lttp` | `lttp.js` | red-500 / `pill-active-red` |
| 7 | Natural Selection | `nat` | `nat.js` | lime-600 / `pill-active-lime` |
| 8 | Deep-Sea Deploy | `dsd` | `dsd.js` | cyan-700 / `pill-active-cyan` |
| 9 | Group Therapy | `gth` | `gth.js` | sage `#B1BCA0` / `pill-active-sage` |
| 10 | The Bluff *(internal `dyb`)* | `dyb` | `dyb.js` | ocean `#1E4D8C` / `pill-active-dyb` |
| 11 | Bailed | `bld` | `bld.js` | yellow-500 / `pill-active-yellow` |
| 12 | Pass | `pass` | `pass.js` | zinc-900 / `pill-active-zinc` |
| 13 | Net-Trace | `nt` | `nt.js` | emerald-600 / `pill-active-emerald` |
| 14 | Fruit Salad | `frt` | `frt.js` | banana `#FFC700` / `pill-active-frt` |
| 15 | Counting Sheep | `shp` | `shp.js` | indigo-600 / `pill-active-indigo` |
| 16 | Flawless | `flw` | `flw.js` | rose-pink `#E879A8` / `pill-active-flw` |

For where each game's screens/overlays live in `index.html`, see the **Per-Game Offset Map** at the top of `docs/code-map.md`.

---

## 🧭 Task Playbooks & Decision Log

**Front door for any task — open the matching workflow, then record the outcome in the listed doc.** All of these are on-demand reads (not auto-loaded).

| Starting a… | Open this workflow | Record the outcome in |
|-------------|--------------------|------------------------|
| **New game** | `docs/rules/new-game-process.md` (3-stage: brief → tech spec → implementation) | tech spec `docs/new-game-tech-[name].md` + phase snapshot + `docs/decision-log.md` |
| **Audit / phase gate** | `docs/rules/phase-audit.md` (Protocols A/B/C) | phase snapshot + `docs/decision-log.md` |
| **Bug / update / polish** | `docs/templates/task-bug-polish.md` (fill the intake form first) | `docs/implementation-notes/[abbr]-implementation-notes.md` (+ `docs/decision-log.md` if it became architectural) |

**`docs/decision-log.md`** — the running index of big architectural / strategic / process decisions (newest on top). Read it to recall *why* something was done; append a one-line entry whenever a change is architectural, strategic, or process-level (wired into the Documentation Integrity Protocol below).

---

## 📁 Project Structure
```
/
├── index.html                       # Single entry point — all screens in one file
├── css/styles.css                   # Custom styles (Tailwind overrides + animations)
├── js/
│   ├── engine.js                    # Shared engine: audio, navigation, allScreens[], normaliseWord()
│   ├── games/
│   │   ├── li5.js                   # Plugin: Like I'm Five (all state + logic)
│   │   ├── great-minds.js           # Plugin: Great Minds (all state + logic)
│   │   ├── secret-signals.js        # Plugin: Secret Signals (all state + logic)
│   │   ├── jec.js                   # Plugin: Just Enough Cooks (all state + logic)
│   │   ├── ygi.js                   # Plugin: You Get It? (all state + logic)
│   │   ├── lttp.js                  # Plugin: Late to the Party (all state + logic)
│   │   ├── nat.js                   # Plugin: Natural Selection (all state + logic)
│   │   ├── dsd.js                   # Plugin: Deep-Sea Deploy (all state + logic)
│   │   ├── bld.js                   # Plugin: Bailed (all state + logic)
│   │   ├── gth.js                   # Plugin: Group Therapy (all state + logic)
│   │   ├── dyb.js                   # Plugin: The Bluff (formerly Dicey Bluffs — all state + logic)
│   │   ├── pass.js                  # Plugin: Pass (all state + logic)
│   │   ├── nt.js                    # Plugin: Net-Trace (all state + logic)
│   │   ├── frt.js                   # Plugin: Fruit Salad (Cockroach Poker — all state + logic)
│   │   ├── shp.js                   # Plugin: Counting Sheep (O'NO-99 survival — all state + logic)
│   │   └── flw.js                   # Plugin: Flawless (gem-trading bluffing game — all state + logic)
│   ├── engine-multiplayer.js        # Multiplayer module: Firebase, lobby, sync, per-game envelopes
│   ├── secret-mode.js               # Secret Mode: Konami gateway, Terminal, expansion proxy state
│   ├── app.js                       # Bootstrapper only — no logic (3 lines)
│   └── lib/
│       ├── tailwind-play.js         # Local Tailwind (no CDN — fully offline)
│       ├── canvas-draw.js           # Drawing module: CanvasDraw global (stroke capture, delta encoding, render)
│       ├── cards.js                 # Card rendering module: Cards global (Cards.buildEl, Cards.buildBackEl)
│       ├── firebase-app.js          # Firebase App (local copy — no CDN)
│       ├── firebase-auth.js         # Firebase Auth (anonymous auth)
│       ├── firebase-database.js     # Firebase Realtime Database
│       └── firebase-init.js         # Firebase project config + initialisation
├── data/
│   ├── words.json                   # Standard word bank (850 words, 16 categories)
│   ├── packs/                       # Secret Mode expansion CARTRIDGES (runtime-loaded, not precached)
│   │   ├── registry.json            #   live pack ids — edit this + drop a folder to add/remove a pack
│   │   ├── dota2/pack.json          #   DOTA 2 (434 words, inline)
│   │   ├── monsterhunter/pack.json  #   Monster Hunter (50 words, inline)
│   │   └── pokemon/pack.json        #   Pokémon Gen 1 (151 words, inline; gen1 sub-cat)
│   ├── ygi-data.json                # You Get It? prompts (50 entries, {id, text, ringers[5]})
│   └── gth-data.json                # Group Therapy disorder bank (100 entries, 3 tiers: everyday/phobias/complex)
├── sw.js                            # Service Worker (currently v140)
├── manifest.json                    # PWA manifest
├── docs/expansion-guide.md          # Template + checklist for adding new expansion packs
├── docs/code-map.md                 # Surgical code reference — all game IDs, overlays, key functions
├── docs/multiplayer-feature-specification-v1.4.md  # MFS v1.4 — Phase 22 source of truth
├── docs/multiplayer-ui-components.md  # Multiplayer component catalogue (screens, overlays, CSS)
├── docs/ygi-content-guide.md        # Content creation guide for You Get It? prompts + ringers
├── docs/gth-content-guide.md        # Content creation guide for Group Therapy disorders
├── docs/fable-audit-plan.md         # Studio audit plan (June 2026) — progress tracker + findings
├── docs/implementation-notes/       # Per-game design decisions, bugs, lessons, template gaps
│   └── [abbr]-implementation-notes.md  # One file per game (all 12 games covered)
├── docs/content-prompts/            # Prompt templates for content generation
├── docs/new-ideas/                  # Unimplemented game briefs + brainstorms
├── docs/archive/                    # Empty by design — phase snapshots live OUT-OF-REPO (external archive); only spent plan docs may land here
```

**Load order:** `engine.js` → `engine-multiplayer.js` → `canvas-draw.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `bld.js` → `gth.js` → `dyb.js` → `cards.js` → `pass.js` → `nt.js` → `frt.js` → `shp.js` → `flw.js` → `secret-mode.js` → `app.js`
(`tailwind-play.js` loads in `<head>` before everything else.)
All symbols are global (no ES modules). Forward references work at runtime.

---

## 🛠 Tech Stack & Zero-Cost Constraints
- **Languages:** Vanilla JS (ES6+), HTML5, CSS3
- **Styling:** Tailwind CSS — local file `/js/lib/tailwind-play.js` (no CDN, works offline)
- **Hosting:** GitHub Pages ($0) — no backend
- **Audio:** Web Audio API (synthesised tones) — no audio files
- **Capabilities:** PWA (offline via Service Worker), Screen Wake Lock API
- **Diagrams:** Mermaid (`stateDiagram-v2`) — used in tech specs for state flows; rendered natively by GitHub, no install required
- **Font exception (Fredoka):** The Fredoka brand font is loaded from Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) at runtime and is NOT precached by the SW. In offline/installed sessions the app falls back to the system sans-serif font. This is a deliberate exception — self-hosting Fredoka would require woff2 files, a local `@font-face`, and SW precache entries that add network-install weight. The app is fully functional offline; only the brand typography is affected. Do NOT remove the `<link>` tags — the offline fallback is acceptable.

---

## 🚫 Anti-Patterns (Do Not)
- Do NOT use `npm`, `webpack`, or any build tools
- Do NOT add external JS libraries beyond local Tailwind
- Do NOT create multiple HTML pages — single-page app
- Do NOT use `localStorage` for game state mid-round (memory only; settings may persist)
  - **Exception:** `sylly_nickname` (multiplayer nickname) and `isMuted`/`masterVolume` are permitted localStorage uses
- Do NOT over-engineer: no classes/inheritance unless genuinely needed
- Do NOT assume context from previous sessions — reference files explicitly
- Do NOT add game-specific audio controls — audio is global via `engine.js`

---

## 🧠 Surgical Coding Protocol
- **Confidence Rule:** Do NOT write code until 95% confident. Ask until you reach that threshold.
- **Visualise First:** Describe logic/flow in plain English BEFORE writing code.
- **Atomic Changes:** One function or one UI component per response.
- **Test First:** Describe verification before implementing.
- **Direct References:** Only read/edit specific files or lines requested.
- **Challenge Bad Specs:** If a proposed mechanic breaks the game's soul, say so before building.

---

## 📝 Documentation Pause Rule
**Trigger:** Before shifting between project phases OR making a permanent architectural change.
**Action:** STOP and provide a "Confluence Snapshot":
1. **Decision:** One sentence summary
2. **Rationale:** The "why"
3. **Technical Impact:** What changed, which files affected
**Wait:** Do not proceed until confirmed.

---

## 📋 Documentation Integrity Protocol
**Trigger:** After any completed phase, game addition, permanent architectural change, or mid-session bug fix session. This protocol applies even when no phase snapshot is written — the snapshot is optional, the doc updates are not.
**Mandatory updates (in this order, before the phase snapshot is written):**
1. `docs/code-map.md` — add/update all new screen IDs, overlay IDs, key functions, and state variables introduced in the phase
2. `game-identities.md` — add/update all new settings, terminology, overlay types, and screen entries for affected games
3. `CLAUDE.md` — update SW version, current focus, and key references
4. `logic-engine.md` — update any new universal rules, audio functions, or engine patterns introduced
5. `docs/implementation-notes/[abbr]-implementation-notes.md` — log any design decisions made, bugs found and resolved, or lessons learned during the phase (create the file if it doesn't exist for this game)
6. `docs/decision-log.md` — if the work included any **architectural, strategic, or process-level** decision, append a one-line entry (newest on top, ~4 lines, pointer not deep-doc). Skip only when the work was purely routine bug/polish with no cross-cutting decision.

**Rule:** No phase snapshot may be written until all five documents are verified current. The snapshot itself is the final deliverable — not the starting point for cleanup.

**Enforcement:** At the start of every new phase, Claude Code must read `docs/code-map.md` and `game-identities.md` for all games it will touch and cross-reference against the actual `index.html` section headers and JS file. Any discrepancy found must be flagged and resolved before implementation begins.

---

## 🧼 Token Hygiene & Context Management
- **Never full-read `index.html`:** It is ~515 KB (~128k tokens) — a single full read nearly fills the context window and is the largest avoidable token sink in this project. To work on a screen or overlay, **Grep first** for its identifier (`screen-[abbr]-*`, an `[abbr]-*-overlay` ID, or the `<!-- ════ GAME NAME ════ -->` section header), then **Read with `offset`/`limit`** around the hit — never read the whole file to "get oriented".
- **Same rule for any file over ~40 KB** (e.g. `js/games/nt.js`, `engine-multiplayer.js`, `secret-signals.js`, and `game-identities.md` itself): locate the relevant section with Grep, then read only that slice. Reading a large file in full to orient yourself is the single most common cause of the mid-task auto-compact spiral.
- **Lean Context:** Avoid repetitive explanations. Assume technical competence.
- **Australian English:** Use Australian spelling (e.g., "colour", "synthesised"). Metric units only.
- **Session Cleanup:** If a sub-task is complete, suggest running /compact to clear history.
- **End every response with "what's next":** Always close with 1–2 sentences naming what was just completed AND what comes next — the next phase, next item, or a recommendation if the task is done. For multi-phase work, name upcoming phases so the roadmap is visible. This applies even to short responses. The user may return after a gap with incomplete context; explicit next-step visibility removes the ambiguity.

---

## 🎯 Skills

### 🎯 Skill: PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.
See `@logic-engine.md` for the full checklist and SW asset list.

### 🎯 Skill: Consistent Word Expansion
**Trigger:** Adding or editing words in `data/words.json`.
**Action:** Follow these rules:
- **Vibe Check:** High-imagery, widely understood. No niche jargon.
- **Difficulty 1 (Standard):** Concrete nouns — e.g., Mountain, Pizza, Bicycle
- **Difficulty 2 (Wild):** Verbs or specific adjectives — e.g., Sparkling, Sprinting
- **Difficulty 3 (Wilder):** Abstract concepts or tricky pairs — e.g., Nostalgia, Gravity
- **Units:** Metric only (Australian audience)
- **Legal:** All words must be original. `nono_list` field name is deliberate (not `taboo_list`)
- **Great Minds curated categories:** `animals, food, places, objects, nature, sports, activities, emotions, jobs, actions` — no `pop_culture`, `brands`, or `aussie_slang` (dead-end pairs)

#### 🐾 Animals Category — Hierarchical nono_list Protocol
- **nono_list[0] (The Broad Shield):** Must be a Documentary Label — a natural-language Common Grouping (e.g., "Sea Creature", "Furry Animal", "Ground Bird"). NOT a scientific class (not "Mammalia", "Aves", etc.)
- **nono_list[1–9] (The Details):** Standard associative words — same rules as all other categories
- **Design Conflict Rule:** If a Broad Shield covers >15% of the animal bank, it is too broad. Split into narrower Documentary Labels (e.g., "Bird" → "Ground Bird", "Wading Bird", "Tropical Bird") to preserve game tension.
- **Bank size:** 100 animals as of Phase 20.

#### 🐾 nono_list Dual-Use Contract
The animals category is shared by both Like I'm Five and Natural Selection. Every slot serves a different role in each game:

| Slot | Like I'm Five | Natural Selection |
|------|--------------|-------------------|
| `nono_list[0]` | Broad Shield — the describer cannot hint at the animal's category | The Mole's Grouping — the only information The Mole receives |
| `nono_list[1–9]` | Forbidden words — the describer cannot say these | Field Researcher clues — each Researcher receives exactly ONE of these words and must give one clue based on it |

**nono_list[1–9] quality rules (for Natural Selection playability):**
- **Distinctive:** The word must clearly narrow down this specific animal (or a small group), not apply to dozens of animals. "ivory" ✓, "big" ✗
- **Non-redundant:** No 3+ synonyms for the same trait in one list. Cheetah had "fast", "run", "speed", "sprint" — a researcher assigned any one of those has a useless clue. Keep at most 2 movement/speed words; replace the rest with different trait types
- **Standalone:** Must work as a single spoken word or hyphenated compound. A researcher receives it cold and says it aloud to the group. "duck-billed" ✓, prefer "eggs" over "lay eggs"
- **Specific over vague:** When two words cover the same trait, keep the more specific one. "purr" beats a second "fast"; "acacia" beats "height" when "tall" is already present

### 🎯 Skill: Add New Expansion Pack
**Trigger:** Adding a new secret mode expansion (new theme/word bank).
**Action:** Follow `docs/expansion-guide.md` — 4-step checklist. Do NOT patch plugin files (the proxy architecture handles everything).

### 🎯 Skill: Implementation Notes
**Trigger:** Any non-trivial bug fix, design decision change, or architectural lesson — during new game builds, maintenance, or audit of any existing game.
**Action:**
1. If `docs/implementation-notes/[abbr]-implementation-notes.md` does not exist for the affected game, create it with four sections: Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps
2. Add a concise entry in the appropriate section: **What happened → Root cause → Lesson**
3. At the end of any audit or testing session, review the Template Gaps section and flag items that should fold into `logic-engine.md`, `ui-style.md`, or the tech template
**When:** Log entries in the same response that completes the fix — not in a follow-up session. If the fix is done and this skill hasn't run, the session is not complete.
**Scope:** All games — new and existing. Log during any session that touches a game's code, not just at phase boundaries.
**Cross-reference:** Before starting a new game's tech spec, read the Template Gaps section of all existing implementation notes files and resolve any gaps that apply to the new game before implementation begins.

### 🎯 Skill: Phase Gate — Studio Audit
**Trigger:** After completing a game or entering a new phase. Before writing the phase snapshot. Before writing the first line of a new game's JS.
**Action:** Read `docs/rules/phase-audit.md` (on-demand — not auto-loaded) and run all three protocols:
- **Protocol A** — Phase Gate (drift check, tech debt, linguistic sweep, mobile layout). Run after every completed game/phase.
- **Protocol B** — Skeleton-First. Run before any new game's first line of code.
- **Protocol C** — Studio Sweep (impl notes harvest + cross-game consistency check). Run before any new game's Phase 1 brief. Both parts must pass before Protocol B Step 1 begins.

Do not write the phase snapshot until Protocols A is clean. Do not write a line of game logic until Protocol B Steps 1–4 are confirmed. Do not start a new game's brief until Protocol C is complete.

### 🎯 Skill: Logic-First Teaching
**Trigger:** Any new concept, pattern, or architectural decision.
**Action:** Before writing code:
1. **Analogy:** Real-world comparison
2. **Diagram (optional):** ASCII or plain-English flow
3. **Why This Way:** One sentence over alternatives
**Wait:** Confirm understanding before proceeding.

---

## 🎯 Current Focus
**Phase:** Cartridge System **Phase A COMPLETE** (word expansions → runtime-loaded `data/packs/` cartridges). Phase 36 — Flawless (`flw`) COMPLETE. Private-hand multiplayer model (`mpSendPrivate` + `mpStartPrivateListener`) introduced.
**Cartridge (Phase A):** The 3 expansions are now `data/packs/<id>/pack.json` manifests (inline `words`), listed in `data/packs/registry.json`; `secret-mode.js` builds the terminal consts at runtime via `smLoadPacks()`; `sw.js` runtime-caches `data/packs/` (network-first JSON, cache-first images). Adding a word pack = drop folder + edit registry, no JS/SW edit. Defaults locked: inline words, terminal selector, single-purpose packs.
**Cartridge (Phase B — IN PROGRESS):** Asset (skin) packs share the same manifest/registry format with an `assets` block instead of `words`; render seams call `assetFace(kind,id)`/`assetBack(kind)` (in `secret-mode.js`) at draw time, falling back to default art when no pack covers an id. Device-local cosmetic — ids-only packets mean zero MP sync. Terminal is now **nested by category** (`WORD PACKS` theme→game; `GAME SKINS` game→skin) so pulling IP word packs at go-live just drops the `WORD PACKS` category. **Done:** general system (`window.activeAssetPack`, `assetFace`/`assetBack`, `smLaunch` asset branch, `resetSecretMode` teardown), B0 seam audit, **asset guards in all FIVE seams** — frt (`frtRenderCard`), shp (`shpRenderCard`), flw (`flwRenderCard`), cards (`Cards.buildEl/buildBackEl`, id scheme `rank`+suit-letter e.g. `QH`/`Joker`), and **dyb** (`dybDieHTML` standard faces only + `dybDieBackHTML` — special dice keep pips so type stays legible; the old face-down cup-die bypass at `dyb.js:482` now routes through the seam) — plus `.frt/shp/pass/dyb-die-asset` CSS, `SM_GAMES` entries for frt/shp/flw/pass/dyb, and **five sample SVG skins**: `neon-fruit`, `neon-sheep`, `neon-gems`, `neon-deck` (full 54), `neon-dice`. **Phase B doc closure DONE:** code-map seam table, `expansion-guide.md` § Add an asset (skin) pack (per-game id cheat-sheets + install steps), decision-log entry, brief template §9A + tech template §10 asset-readiness, `docs/content-prompts/asset-pack-prompt.md`, logic-engine new-game checklist item. DYB dice skins keyed by face value 1–6 only (no per-type skinning — YAGNI). Spec: `docs/cartridge-system-plan.md` Part B. **Phase B COMPLETE.**
**Last shipped game:** Phase 36 — Flawless (FLW), gem-trading bluffing game, MDLM-only, 3–4 players; True Network Privacy (private Firebase channel); Sylly Mode = The Counterfeit Run.
**Previous shipped game:** Phase 35 — Counting Sheep (SHP), O'NO-99 climbing/survival card game, MDLM-only, 3–8 players; Sylly Mode = Night Terrors (oscillating Climb ⇄ Plunge).
**SW Version:** v142 (DSD Sylly Mode renamed Mission Abyss → **Silent Running** to resolve a vocab clash with PASS's Sylly Mode "The Abyss" — PASS keeps the name [it's a load-bearing mechanic: `passAbyss` pool, `abyss-draft` phase, "the abyss gazes back"]; DSD's was a cosmetic display string only. Display strings in `index.html` [sabotage header, settings, how-to] + `dsd.js` pass-gate subtext changed; internal `playAbyssThud()` audio left as-is. Previous: v141 — Phase-audit Protocol A polish sweep: Counting Sheep sheep flight reworked into a smooth parabolic fence-jump arc [multi-point `@keyframes shpSheepArcIn/Out` + `linear` timing]; stale skeleton `TODO` markers + two dead NT stubs [`ntComputePlayback`, `ntValidateTeams`] removed. Previous: v140 — Cartridge Phase A: `data/packs/` runtime-cached — network-first JSON, cache-first images; legacy `data/secret*_words.json` migrated into manifests + removed from precache. Previous: v139 — Lobby min-players hint: host lobby now shows "Need N more players to start (min M)" below the capacity line while the start CTA is locked — `mpRenderHostPlayerList()` + `#mp-lobby-min-hint`. Previous: v138 — Counting Sheep playtest round 2: hand-sort falsy-zero fix [Pastures leftmost, +1/+2/+5/+10], card-info tap-outside-to-close, sheep animation reworked to an absolutely-positioned arc-from-left overlay [no layout jank] with in/out direction by net Herd delta, deck rebalanced 71→73 [~66% pasture], "Counting Backwards −N" restored in inspect modal, Last/Dream Journal moved to right whitespace + rename "Log →"→"Dream Journal", "The Sky is Falling"→"The Dream is Collapsing", Night Terrors drop softened to round-based escalation −2 base +2/round. Previous: v137 — PASS playtest fixes)
**Gold Master:** 16 games complete + multiplayer (LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy, Bailed, Group Therapy, The Bluff [internal `dyb`], Pass, Net-Trace, Fruit Salad, Counting Sheep, Flawless)
**Flawless key refs:** `docs/new-game-tech-flawless.md` (confirmed spec), `docs/implementation-notes/flw-implementation-notes.md`, `docs/new-ideas/new-game-brief-flawless.md` (Phase-1 brief). MDLM-only, True Network Privacy (`mpSendPrivate`), host-as-participant, host-authoritative; rose-pink `#E879A8` + Exhibition gold `#C9A227`; all card rendering through `flwRenderCard` (asset-pack seam); 10 gems (`FLW_GEMS`); Sylly Mode = The Counterfeit Run (1 token + 2 audit charges per Showing).
**Counting Sheep key refs:** `docs/new-game-tech-counting-sheep.md` (confirmed spec — Night Terrors + ghost rework in v1), `docs/implementation-notes/shp-implementation-notes.md` (bug log incl. Wolf-deal fix + design decisions), `docs/new-ideas/counting-sheep-notes.md` (final design notes). MDLM-only, host-authoritative, host-as-participant; couch security; moonlit indigo (native Tailwind); all card rendering through `shpRenderCard` (asset-pack seam); single-source herd math `shpHerdAfterCard` (Plunge sign-flip).
**Phase snapshots are OUT-OF-REPO** — historical `phase[N]-snapshot.md` / `fable-audit-snapshot.md` records were moved to an external archive folder (outside the project) so in-repo sweeps don't scan them. They are *pointer detail only* — nothing in the code or build depends on one. The three the decision-log still anchors to are **phase36** (FLW + private-hand model), **fable-audit** (the 71-item Studio Audit campaign), and **phase22** (multiplayer complete — MFS v1.4); ask the owner for the external archive if you need to read one. New snapshots are written there too, not into `docs/archive/` (kept empty by design).

**Key references:**
- `docs/implementation-notes/flw-implementation-notes.md` — FLW bug log + design decisions
- `docs/new-game-tech-flawless.md` — Phase 2 technical spec (FLW source of truth)
- `docs/implementation-notes/shp-implementation-notes.md` — SHP bug log + design decisions
- `docs/new-game-tech-counting-sheep.md` — Phase 2 technical spec (SHP source of truth)
- `docs/implementation-notes/frt-implementation-notes.md` — FRT bug log + design decisions
- `docs/new-game-tech-fruit-salad.md` — Phase 2 technical spec (FRT source of truth)
- `docs/implementation-notes/nt-implementation-notes.md` — NT bug log + design decisions
- `docs/new-game-tech-net-trace.md` — Phase 2 technical spec (NT source of truth)
- `docs/implementation-notes/dyb-implementation-notes.md` — DYB bug log + design decisions
- `docs/implementation-notes/bld-implementation-notes.md` — BLD bug log + design decisions
- `docs/implementation-notes/gth-implementation-notes.md` — GTH bug log + design decisions
- `docs/multiplayer-feature-specification-v1.4.md` — MFS v1.4 spec (Phase 22 source of truth)
- `docs/multiplayer-ui-components.md` — multiplayer component catalogue
- `docs/code-map.md` — surgical reference: all game IDs, overlays, key functions
- `docs/rules/new-game-process.md` — three-stage protocol for adding a new game (with `new-game-brief-template.md` + `new-game-technical-template.md`)
- `docs/expansion-guide.md` — template for adding new expansion packs
- `docs/ygi-content-guide.md` — content creation guide for You Get It? prompts
