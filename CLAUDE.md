# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📂 Rule Files — Load When Relevant
- `@ui-style.md` — overlays, buttons, speaker/exit protocol, settings layout, Sylly Tone
- `@logic-engine.md` — engine/plugin split, screen routing, audio catalogue, PWA, new-game checklist
- `@definitions.md` — naming conventions, comment style, data schema, project-wide terms
- `@game-identities.md` — per-game themes, terminology, settings tables, special mechanics

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
│   │   └── jec.js                   # Plugin: Just Enough Cooks (all state + logic)
│   ├── secret-mode.js               # Secret Mode: Konami gateway, Terminal, expansion proxy state
│   ├── app.js                       # Bootstrapper only — no logic (3 lines)
│   └── lib/tailwind-play.js         # Local Tailwind (no CDN — fully offline)
├── data/
│   ├── words.json                   # Standard word bank (~358 words, 16 categories)
│   └── secret_words.json            # Expansion word bank: Dota 2 (35 words, 5 categories)
├── sw.js                            # Service Worker (currently v60)
├── manifest.json                    # PWA manifest
├── docs/expansion-guide.md          # Template + checklist for adding new expansion packs
├── docs/code-map.md                 # Surgical code reference — all game IDs, overlays, key functions
├── docs/phase12-snapshot.md         # Phase 12 architecture snapshot (current gold master)
└── docs/archive/                    # Retired snapshots + spent plan docs
```

**Load order:** `engine.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `secret-mode.js` → `app.js`
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

### 🎯 Skill: Add New Expansion Pack
**Trigger:** Adding a new secret mode expansion (new theme/word bank).
**Action:** Follow `docs/expansion-guide.md` — 4-step checklist. Do NOT patch plugin files (the proxy architecture handles everything).

### 🎯 Skill: Logic-First Teaching
**Trigger:** Any new concept, pattern, or architectural decision.
**Action:** Before writing code:
1. **Analogy:** Real-world comparison
2. **Diagram (optional):** ASCII or plain-English flow
3. **Why This Way:** One sentence over alternatives
**Wait:** Confirm understanding before proceeding.

---

## 🎯 Current Focus
**Phase:** 12 complete — Hard Branding + UI Consistency Pass
**SW Version:** v60
**Next:** Game 5 or expansion pack 2
**Key references:**
- `docs/phase12-snapshot.md` — core architecture gold master (current)
- `docs/code-map.md` — surgical reference: all game IDs, overlays, key functions
- `docs/expansion-guide.md` — template for adding new expansion packs
