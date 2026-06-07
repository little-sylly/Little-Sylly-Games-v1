# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📂 Rule Files — Load When Relevant
- `@ui-style.md` — overlays, buttons, speaker/exit protocol, settings layout, Sylly Tone
- `@logic-engine.md` — engine/plugin split, screen routing, audio catalogue, PWA, new-game checklist
- `@definitions.md` — naming conventions, comment style, data schema, project-wide terms
- `@game-identities.md` — per-game themes, terminology, settings tables, special mechanics
- `@new-game-template.md` — fill this in before coding any new game (brief format + 10-section spec)
- `@phase-audit.md` — run after every completed game and before every new game's first line of code

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
│   │   └── dsd.js                   # Plugin: Deep-Sea Deploy (all state + logic)
│   ├── engine-multiplayer.js        # Multiplayer module: Firebase, lobby, sync, per-game envelopes
│   ├── secret-mode.js               # Secret Mode: Konami gateway, Terminal, expansion proxy state
│   ├── app.js                       # Bootstrapper only — no logic (3 lines)
│   └── lib/
│       ├── tailwind-play.js         # Local Tailwind (no CDN — fully offline)
│       ├── firebase-app.js          # Firebase App (local copy — no CDN)
│       ├── firebase-auth.js         # Firebase Auth (anonymous auth)
│       ├── firebase-database.js     # Firebase Realtime Database
│       └── firebase-init.js         # Firebase project config + initialisation
├── data/
│   ├── words.json                   # Standard word bank (~433 words, 16 categories)
│   ├── secret_words.json            # Expansion word bank: Dota 2 (35 words, 5 categories)
│   └── ygi-data.json                # You Get It? prompts (55+ entries, {id, text, ringers[5]})
├── sw.js                            # Service Worker (currently v80)
├── manifest.json                    # PWA manifest
├── docs/expansion-guide.md          # Template + checklist for adding new expansion packs
├── docs/code-map.md                 # Surgical code reference — all game IDs, overlays, key functions
├── docs/multiplayer-feature-specification-v1.4.md  # MFS v1.4 — Phase 22 source of truth
├── docs/multiplayer-ui-components.md  # Multiplayer component catalogue (screens, overlays, CSS)
├── docs/ygi-content-guide.md        # Content creation guide for You Get It? prompts + ringers
├── docs/implementation-notes/       # Per-game design decisions, bugs, lessons, template gaps
│   ├── bld-implementation-notes.md  # BLD (active)
│   └── [abbr]-implementation-notes.md  # One file per game
├── docs/new-ideas/                  # Unimplemented game briefs + brainstorms
├── docs/archive/                    # Retired snapshots + spent plan docs
```

**Load order:** `engine.js` → `engine-multiplayer.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `secret-mode.js` → `app.js`
All symbols are global (no ES modules). Forward references work at runtime.

---

## 🛠 Tech Stack & Zero-Cost Constraints
- **Languages:** Vanilla JS (ES6+), HTML5, CSS3
- **Styling:** Tailwind CSS — local file `/js/lib/tailwind-play.js` (no CDN, works offline)
- **Hosting:** GitHub Pages ($0) — no backend
- **Audio:** Web Audio API (synthesised tones) — no audio files
- **Capabilities:** PWA (offline via Service Worker), Screen Wake Lock API

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
**Trigger:** After any completed phase, game addition, or permanent architectural change.
**Mandatory updates (in this order, before the phase snapshot is written):**
1. `docs/code-map.md` — add/update all new screen IDs, overlay IDs, key functions, and state variables introduced in the phase
2. `game-identities.md` — add/update all new settings, terminology, overlay types, and screen entries for affected games
3. `CLAUDE.md` — update SW version, current focus, and key references
4. `logic-engine.md` — update any new universal rules, audio functions, or engine patterns introduced
5. `docs/implementation-notes/[abbr]-implementation-notes.md` — log any design decisions made, bugs found and resolved, or lessons learned during the phase (create the file if it doesn't exist for this game)

**Rule:** No phase snapshot may be written until all five documents are verified current. The snapshot itself is the final deliverable — not the starting point for cleanup.

**Enforcement:** At the start of every new phase, Claude Code must read `docs/code-map.md` and `game-identities.md` for all games it will touch and cross-reference against the actual `index.html` section headers and JS file. Any discrepancy found must be flagged and resolved before implementation begins.

---

## 🧼 Token Hygiene & Context Management
- **Lean Context:** Avoid repetitive explanations. Assume technical competence.
- **Australian English:** Use Australian spelling (e.g., "colour", "synthesised"). Metric units only.
- **Session Cleanup:** If a sub-task is complete, suggest running /compact to clear history.

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
**Scope:** All games — new and existing. Log during any session that touches a game's code, not just at phase boundaries.
**Cross-reference:** Before starting a new game's tech spec, read the Template Gaps section of all existing implementation notes files and resolve any gaps that apply to the new game before implementation begins.

### 🎯 Skill: Phase Gate — Studio Audit
**Trigger:** After completing a game or entering a new phase. Before writing the phase snapshot. Before writing the first line of a new game's JS.
**Action:** Run both protocols in `@phase-audit.md`. Do not write the phase snapshot until the Drift Check and Linguistic Sweep are clean. Do not write a line of game logic until the Skeleton-First protocol (Steps 1–4) is confirmed.

### 🎯 Skill: Logic-First Teaching
**Trigger:** Any new concept, pattern, or architectural decision.
**Action:** Before writing code:
1. **Analogy:** Real-world comparison
2. **Diagram (optional):** ASCII or plain-English flow
3. **Why This Way:** One sentence over alternatives
**Wait:** Confirm understanding before proceeding.

---

## 🎯 Current Focus
**Phase:** Phase 29 complete — Deferred fixes: LTTP L4 play-again modal, JEC scoring redesign (Option C: tiered positive rewards, penalties opt-in default OFF).
**SW Version:** v96 (bump when assets change)
**Gold Master:** 8 games complete + multiplayer (LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy)
**BLD status:** In active testing — MDLM only, `js/games/bld.js`, multiplayer bugs being resolved round by round.
**Key references:**
- `docs/implementation-notes/bld-implementation-notes.md` — BLD bug log + design decisions (active)
- `docs/archive/phase29-snapshot.md` — Phase 29 snapshot (LTTP L4 modal, JEC scoring redesign)
- `docs/archive/phase28-snapshot.md` — Phase 28 snapshot (JEC/YGI/LTTP/NAT/DSD audit & polish)
- `docs/archive/phase27-snapshot.md` — Phase 27 snapshot (LI5/GM/SS polish pass)
- `docs/archive/phase26-snapshot.md` — Phase 26 snapshot (studio audit — retrograde polish pass, all 8 games)
- `docs/archive/phase25-snapshot.md` — Phase 25 snapshot (play-again lobby return all games, host-only audit)
- `docs/archive/phase22-snapshot.md` — Phase 22 snapshot (multiplayer complete — MFS v1.4)
- `docs/archive/phase21a-snapshot.md` — Phase 21a snapshot (8 games, pre-multiplayer gold master)
- `docs/multiplayer-feature-specification-v1.4.md` — MFS v1.4 spec (Phase 22 source of truth)
- `docs/multiplayer-ui-components.md` — multiplayer component catalogue
- `docs/code-map.md` — surgical reference: all game IDs, overlays, key functions
- `.claude/rules/new-game-template.md` — fill this in before coding any new game
- `docs/expansion-guide.md` — template for adding new expansion packs
- `docs/ygi-content-guide.md` — content creation guide for You Get It? prompts
