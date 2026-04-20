# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📁 Project Structure
```
/
├── index.html                   # Single entry point — all screens in one file
├── css/styles.css               # Custom styles (Tailwind overrides + animations)
├── js/
│   ├── engine.js                # Shared engine: audio, navigation, allScreens[], reset
│   ├── games/
│   │   ├── dstw.js              # Plugin: Don't Say Those Words (all state + logic)
│   │   ├── great-minds.js       # Plugin: Great Minds (all state + logic)
│   │   └── sylly-signals.js     # Plugin: Sylly Signals (all state + logic)
│   ├── app.js                   # Bootstrapper only — no logic (3 lines)
│   └── lib/tailwind-play.js     # Local Tailwind (no CDN — fully offline)
├── data/words.json              # Word bank (~358 words, 16 categories)
├── sw.js                        # Service Worker (currently v55)
├── manifest.json                # PWA manifest
├── docs/phase7-snapshot.md      # Phase 7 architecture snapshot (archived)
└── docs/phase10-snapshot.md     # Phase 10.1 architecture snapshot (current)
```

**Load order:** `engine.js` → `dstw.js` → `great-minds.js` → `sylly-signals.js` → `app.js`
All symbols are global (no ES modules). Forward references work at runtime.

## 🏗 Gamebox Architecture (Phase 10.1 — Current)

### The Plugin Pattern
`engine.js` owns everything game-agnostic:
- `allScreens[]` — every screen ID in the SPA; `showScreen(id)` hides all, shows target
- All `play*()` audio functions (Web Audio API, synthesised)
- `activeGameId` — set by each plugin on entry, cleared by `resetToLobby()`
- `resetToLobby()` — cold boot: stops timer, clears all overlays, zeroes both games' state
- `resetToMenu()` — DSTW in-game exit path
- Global sound overlay (`#sound-overlay`) — mute toggle + volume slider
- `openSoundOverlay()`, `toggleMute()` — referenced by all `.btn-open-sound` buttons

Each plugin (`dstw.js`, `great-minds.js`, `sylly-signals.js`) owns:
- All game-specific state variables
- All game-specific functions and event listeners
- Nothing from engine.js is duplicated in plugins

### Global UI Protocol (apply to every new game)
Every screen must have:
1. **Speaker icon** (`.btn-open-sound`) — opens `#sound-overlay`. Absolute top-right on full screens; inline in header rows on setup/input screens.
2. **Exit button** (✕) — logical destination:
   - Pre-game screens → game's own menu screen
   - Mid-game screens → quit confirmation overlay
   - Post-game screens → `resetToLobby()`
3. **Active play exception:** `#btn-mute` stays as instant tap-to-mute (no overlay — timer running).

### Settings Layout Standard
Every game's settings overlay uses this order:
1. Game-specific options (timer, rounds, categories, word pools)
2. **✨ Sylly Mode** — always last, the "advanced rules" signature

All multi-choice settings use the **Pill Button** style (`data-group` or `data-*` + `.pill` / `.pill-active-purple`). No sliders for discrete choices.

### Screen Navigation Map
```
#screen-lobby
  ├─► #screen-menu (DSTW)
  │     ├─► #screen-setup → #screen-gatekeeper → #screen-active-play → #screen-gameover
  │     └─► #settings-overlay (slide-up)
  └─► #screen-gm-menu (Great Minds)
        ├─► #screen-gm-setup → #screen-gm-input → #screen-gm-pass-gate
        │     → #screen-gm-reveal-gate → #screen-gm-reveal → #screen-gm-result
        └─► #gm-settings-overlay (slide-up)
```

## 🛠 Tech Stack & Zero-Cost Constraints
- **Languages:** Vanilla JS (ES6+), HTML5, CSS3
- **Styling:** Tailwind CSS — local file `/js/lib/tailwind-play.js` (no CDN, works offline)
- **Hosting:** GitHub Pages ($0) — no backend
- **Audio:** Web Audio API (synthesised tones) — no audio files
- **Capabilities:** PWA (offline via Service Worker), Screen Wake Lock API

## 🚫 Anti-Patterns (Do Not)
- Do NOT use `npm`, `webpack`, or any build tools
- Do NOT add external JS libraries beyond local Tailwind
- Do NOT create multiple HTML pages — single-page app
- Do NOT use `localStorage` for game state mid-round (memory only; settings may persist)
- Do NOT over-engineer: no classes/inheritance unless genuinely needed
- Do NOT assume context from previous sessions — reference files explicitly
- Do NOT add game-specific audio controls — audio is global via `engine.js`

## 🧠 Surgical Coding Protocol
- **Confidence Rule:** Do NOT write code until 95% confident. Ask until you reach that threshold.
- **Visualise First:** Describe logic/flow in plain English BEFORE writing code.
- **Atomic Changes:** One function or one UI component per response.
- **Test First:** Describe verification before implementing.
- **Direct References:** Only read/edit specific files or lines requested.
- **Challenge Bad Specs:** If a proposed mechanic breaks the game's soul, say so before building.

## 📝 Documentation Pause Rule
**Trigger:** Before shifting between project phases OR making a permanent architectural change.
**Action:** STOP and provide a "Confluence Snapshot":
1. **Decision:** One sentence summary
2. **Rationale:** The "why"
3. **Technical Impact:** What changed, which files affected
**Wait:** Do not proceed until confirmed.

## 🧼 Token Hygiene & Context Management
- **Lean Context:** Avoid repetitive explanations. Assume technical competence.
- **Australian English:** Use Australian spelling (e.g., "colour", "synthesised"). Metric units only.
- **Session Cleanup:** If a sub-task is complete, suggest running /compact to clear history.

## 🎯 Skills

### 🎯 Skill: PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.
**Action:** Before implementing, answer:
1. Will this work offline? If not, how do we cache it?
2. Does `sw.js` need updating to pre-cache new files?
3. Are we using any APIs that require network (and gracefully failing if unavailable)?
**Failure Mode:** Flag and propose offline fallback if feature can't work offline.

### 🎯 Skill: Thumb-Friendly UI
**Trigger:** Any new button, link, or interactive element.
**Action:** Verify:
1. Minimum touch target: 44×44px (`min-h-11 min-w-11` in Tailwind)
2. Buttons in Active Play must be in the bottom 60% of screen (thumb zone)
3. No two destructive actions adjacent without spacing
**Test:** Mentally simulate one-handed phone use.

### 🎯 Skill: Sylly Tone
**Trigger:** Any user-facing text, loading state, or empty state.
**Action:** Look for ONE opportunity to inject playfulness:
- Cheeky button labels, Australian slang where natural, micro-copy that sounds like a friend
**Constraint:** Never force it. If it feels cringe, keep it neutral.

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

### 🎯 Skill: Logic-First Teaching
**Trigger:** Any new concept, pattern, or architectural decision.
**Action:** Before writing code:
1. **Analogy:** Real-world comparison
2. **Diagram (optional):** ASCII or plain-English flow
3. **Why This Way:** One sentence over alternatives
**Wait:** Confirm understanding before proceeding.

## 🏗 Architect Competencies

- **Engine/Plugin Split:** `engine.js` owns global primitives. Plugins own game state. No cross-contamination.
- **Global Sound:** `toggleMute()` in `engine.js` syncs `#btn-mute` (active play), `#global-mute-toggle` (overlay), and all `.btn-open-sound` icons in one call.
- **Screen Routing:** `showScreen(id)` hides all `allScreens[]` then shows target with fade. Adding a new screen requires adding its ID to `allScreens[]` in `engine.js`.
- **Modular Content Management:** JSON word-bank, metadata-driven difficulty. `isSylly` derived at runtime (`difficulty === 3`) — never store computed values in data.
- **State-Aware UI:** Review Screen allows real-time score correction via `flipEntry()` + `scoreBeforeTurn` snapshot.
- **PWA Lifecycle:** SW versioning (`CACHE_NAME = 'sylly-games-vN'`), cache-first strategy. Bump on every deploy.
- **Acoustic Branding:** Synthesised tones — pitch + duration encode meaning. Function names: `playSuccess`, `playBoing`, `playLaunch`, `playExit`, `playPillClick`, `playDone`, `playTick`.
- **Animation Re-trigger:** `classList.remove` → `void el.offsetWidth` → `classList.add` — required to replay CSS animations on the same element.
- **Overlay Standard (Two-Pattern Library):** TWO patterns only — do not invent a third.
  - *Data overlay* (settings, how-to, word lists, history — scrollable content or keyboard input): backdrop adds `.overlay-data-backdrop` (`items-end justify-center`); inner div adds `.overlay-data-inner` (`height:80vh; overflow-y:auto`) + `rounded-t-3xl` + `settings-slide-up` animation.
  - *Decision modal* (confirmations, short prompts, ≤3 interactive elements): backdrop adds `.overlay-modal-backdrop` (`items-center justify-center px-6`); inner div adds `.overlay-modal-inner` (`rounded-3xl`), auto height, no slide-up animation.
  - Classes live in `css/styles.css`. If a new overlay doesn't clearly fit either pattern, discuss before building.

## 🕹 Games

### Game 1: Don't Say Those Words
Pass-the-phone. One player describes, others guess. No saying the target word or taboo list.
**State:** LOBBY → DSTW MENU → SETUP → GATEKEEPER → ACTIVE_PLAY → GAMEOVER
**Key files:** `js/games/dstw.js`
**Settings:** Timer (30/60/90s), Rounds (3/5/10), No-No list size (5/10), Penalty type, Skip cost, Review edits, Sylly Mode

### Game 2: Great Minds
Two players privately enter a connecting word for a random pair. Reveal together with 3-2-1 countdown. Loop until they match (Mind Meld). Score = rounds taken (lower is better).
**State:** LOBBY → GM MENU → GM SETUP → GM INPUT → GM PASS GATE → GM REVEAL GATE → GM REVEAL → GM RESULT (loop or victory)
**Key files:** `js/games/great-minds.js`
**Settings:** Customise Words, Memory Guard, Resonance Tolerance (High Fidelity/Resonant), Signal Boost, Infinite Resync, Frequency Range, Static Interference, Sylly Mode (Mental Fog/Neural Storm)
**Special mechanics:**
- Cheap Move Guard: blocks inputs that contain or are contained by either pair word
- Starting Pair Guard + Last Round Guard: hardcoded, always active
- Social Override: "Actually... that counts 🤝" → "Quantum Entanglement?" confirmation modal
- Signal Boost (turn-based from R5): transmitter sees boost overlay + `?` Neural Library guide; receiver sees boost context banner
- Psychic Echoes: table log on victory screen + result screen; columns: # | Pair | P1 | P2
- Session Terminal: decision modal — "Memory Purge ⚛️" (new game) / "Resume Current Evaluation 📖"
- Name Persistence: `gmPlayerNames` survives between games

### Game 3: Sylly Signals
Two teams intercept and decode encrypted transmissions. Team A encrypts keywords into a code; Team B intercepts.
**Key files:** `js/games/sylly-signals.js`
**Full state:** see `docs/phase10-snapshot.md`

## 📊 Data Schema: words.json
```json
{
  "id": "string (unique, e.g., 'animals-001')",
  "word": "string (target word)",
  "nono_list": ["array of 10 forbidden words"],
  "category": "string — one of 16 categories",
  "difficulty": 1
}
```
- 16 categories: `animals, food, places, objects, sports, nature, vehicles, jobs, activities, music, pop_culture, people, brands, emotions, actions, aussie_slang`
- Great Minds uses 10 of these: excludes `vehicles, music, pop_culture, people, brands, aussie_slang`

## 🎯 Current Focus
**Phase:** 10.1 (Great Minds + Neural Library — complete)
**SW Version:** v55
**Key reference:** `docs/phase10-snapshot.md` — current architecture gold master
