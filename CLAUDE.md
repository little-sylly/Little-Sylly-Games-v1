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
- `docs/rules/new-game-checklist.md` — the ~40-item build checklist (engine registration, settings/overlay standards, MP handler audit, render seam, verification harness, closure). **Read when:** implementing a new game — before its first line of code. *(Moved out of `logic-engine.md`, 1 Aug 2026; still binding.)*
- `docs/rules/phase-audit.md` — Protocols A/B/C (drift check, skeleton-first, studio sweep). **Read when:** a phase boundary, or before a new game's first line of code.
- `docs/sw-changelog.md` — SW release notes v148 and earlier. **Read when:** you need the history behind a past version; the current version's notes stay in § Current Focus.
- `docs/deferred-work.md` — the parked-work list: the **retest backlog for the older games**, the MDLM quit-contract divergence (GTH/DYB/BLD), and smaller flagged items. **Read when:** picking up maintenance work, or at a phase gate. *(Replaces the missing `fable-fix-plan.md`.)*

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
| 11 | Bailed | `bld` | `bld.js` | dark red `#991b1b` (red-800) / `pill-active-bld` |
| 12 | Pass | `pass` | `pass.js` | zinc-900 / `pill-active-zinc` |
| 13 | Net-Trace | `nt` | `nt.js` | emerald-600 / `pill-active-emerald` |
| 14 | Fruit Salad | `frt` | `frt.js` | electric lemon `#FFE500` (dark ink) / `pill-active-frt` |
| 15 | Counting Sheep | `shp` | `shp.js` | indigo-600 / `pill-active-indigo` |
| 16 | Flawless | `flw` | `flw.js` | rose-pink `#E879A8` / `pill-active-flw` |
| 17 | Pecking Order | `pko` | `pko.js` | `#854D0E` / `pill-active-pko` |
| 18 | Cookie Jar | `cjar` | `cjar.js` | honey-gold `#D4A017` (dark ink) / `pill-active-cjar` |

For per-game classes (range / toggle / pill / CTA / how-to / brand class strings) see `ui-style.md` § **Per-Game Reference** — the single source for those; don't duplicate them here.

For where each game's screens/overlays live in `index.html`, see the **Per-Game Offset Map** at the top of `docs/code-map.md`. **`code-map.md` is ~132 KB (~33k tokens) — never read it whole.** Same rule as `game-identities.md`: Grep for the game or element ID, then offset-Read that slice. One careless full read costs more than the entire always-loaded rule set.

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

## 📁 Load Order
**Load order:** `engine.js` → `art.js` → `engine-multiplayer.js` → `canvas-draw.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `bld.js` → `gth.js` → `dyb.js` → `cards.js` → `pass.js` → `nt.js` → `frt.js` → `shp.js` → `flw.js` → `pko.js` → `cjar.js` → `secret-mode.js` → `app.js`
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
- **End every response with "what's next":** Always close with 1–2 sentences naming what was just completed AND what comes next — the next phase, next item, or a recommendation if the task is done. For multi-phase work, name upcoming phases so the roadmap is visible. This applies even to short responses. The user may return after a gap with incomplete context; explicit next-step visibility removes the ambiguity. **Also name the model + effort level the next task warrants** (e.g. "next: Sonnet, medium effort" or "next: Opus/Fable, high effort") using the table below — the user is not yet confident picking these themselves, so the recommendation must be explicit, not implied. **And name the session call** — `same session`, `/compact then continue`, or `fresh session` — using the second table. All three (task, model+effort, session) go in the closing line; never leave the session call implied.

**Model & effort picker (for the "what's next" line):**

| Task shape | Model | Effort | Why |
|-----------|-------|--------|-----|
| Single known fix, exact file/line already identified | Sonnet | low–medium | Mechanical edit, no design judgement needed |
| Bug/polish following `task-bug-polish.md` intake | Sonnet | medium | Bounded scope, established pattern to follow |
| Doc-only updates (code-map, impl-notes, decision-log) | Sonnet or Haiku | low | Pure transcription/summarising, no logic risk |
| Content authoring (words.json, categories, copy) | Sonnet | medium | Needs the Consistent Word Expansion rules applied, not novel reasoning |
| New game implementation (Stage 3 build) | Opus or Fable | high | Multi-file, cross-cutting (MP handlers, render seam, checklist) — mistakes compound silently |
| Architecture/strategic decision (spec write, MP pattern design, refactor plan) | Opus or Fable | high–xhigh | Wrong call here becomes a decision-log entry and future rework |
| Phase-gate audit (Protocol A/B/C, studio sweep) | Opus or Fable | high | Needs to catch subtle drift across many files, not just pattern-match |
| Large exploratory search ("find every place X happens") | dispatch to Explore/general-purpose subagent | medium | Keeps the fan-out out of the main context window regardless of which model runs it |
| Quick lookup / "what does X do" | Haiku or Sonnet | low | No edit risk, cost matters more than depth |

Default when unsure: **Sonnet, medium** — escalate to Opus/Fable + high only when the task is architectural, touches 3+ files with cross-cutting rules (MP sync, render seams), or is a phase-gate audit. Escalating "just in case" burns budget for no benefit on mechanical tasks; under-calling it on an architectural task risks a silent rule violation that surfaces as a bug days later.

**Session picker (same session / compact / fresh):**

The whole question is one trade: a fresh session re-pays this project's **~30k-token baseline** (CLAUDE.md + the three always-loaded rule files) but starts clean; continuing pays the **entire transcript on every single turn**, whether or not any of it still matters. So the test is not "how long have we been going" — it is **how much of what's loaded is still relevant to the next task**.

| Signal | Call | Why |
|--------|------|-----|
| Next task is the **same game / same files** already read into context | **same session** | Re-reading those slices in a fresh session costs more than carrying them |
| Next task is a **direct follow-on** (fix → test it, build → document it) | **same session** | The reasoning behind the change is the context |
| Sub-task done, next task is **adjacent but narrower** (e.g. finished a PKO fix, now writing PKO impl-notes) | **/compact then continue** | Keeps the conclusions, drops the exploration that produced them |
| **Switching games** (PKO work → FRT bug) | **fresh session** | Nothing loaded transfers; you're paying rent on dead context |
| **Switching mode of work** (build → doc-only, code → design/spec) | **fresh session** | Different rule files, different reading pattern |
| **Auto-compact has already fired once** | **fresh session** | The cheap context is gone. A summary-of-a-summary is worse than a clean start with a pointer to the impl-notes |
| A **big file slice was read** and is now irrelevant (a 3k-line `index.html` window, `game-identities.md` section) | **fresh session** | That slice re-costs on every turn forever |
| Escalating model **up** for the next task (Sonnet → Opus) | **fresh session** | Opus turns are the expensive ones — don't feed them a transcript of Sonnet's exploration |
| Dropping model **down** for the next task (Opus → Sonnet/Haiku) | **same session** ok | Cheap turns can afford the carried context |

Default when unsure: **fresh session, with an explicit pointer** — name the file(s) and the doc (impl-notes / tech spec / decision-log) the new session should read first. That pointer is what makes a fresh start cheap: it's the difference between 30k of baseline plus one targeted read, and a fresh session flailing to re-orient. **Never start fresh without one.** If the last session produced anything a fresh one would need to know, the Documentation Integrity Protocol above should already have written it down — if it hasn't, that's the real signal to stay put and finish the docs first.

### 🤝 Handoff Prompt (mandatory whenever the session call is `fresh session`)

**Rule:** Any response whose closing line says **fresh session** MUST end with a ready-to-paste handoff prompt in a fenced code block — no exceptions, no "let me know if you want one". The user should be able to copy it straight into the new session and start working. A `fresh session` call without a handoff block is an incomplete response.

**The handoff is a pointer, not a summary.** It says where to read, not what was read. Anything longer than ~15 lines means facts are being smuggled in that belong in a doc — put them in the impl-notes and link there instead. Docs first, handoff second: if writing the handoff surfaces something not yet recorded anywhere, that's a Documentation Integrity Protocol miss — fix the doc, then write the pointer to it.

**Template:**

````markdown
```
**Task:** [one sentence — the single next action, not the whole roadmap]

**Read first:** [1–3 files max, with the Grep term or offset if it's a big file]
- `docs/implementation-notes/[abbr]-implementation-notes.md` — [why: which entry matters]
- `js/games/[abbr].js` — Grep `[functionName]`

**State:** [what is already done + what is verifiably true right now — SW version, which
verification harnesses pass, what shipped. One or two lines.]

**Constraints / gotchas:** [only the ones that would cause a wrong turn — e.g. "host-as-participant
means the host path proves nothing about clients"; "re-run tools/verify-pko-loop.js after any
applier change". Omit the section entirely if there are none.]

**Model + effort:** [from the picker table]
```
````

**The five fields, and why each is there:**

1. **Task** — one action. A handoff listing three tasks produces a session that context-switches between them and finishes none.
2. **Read first** — the whole point. Names the file *and* the Grep term, so the new session never full-reads `index.html`, `code-map.md`, or `game-identities.md` (see Token Hygiene above). Three files is the ceiling; more than that and the fresh session isn't cheaper than continuing.
3. **State** — the ground truth a fresh session cannot infer: current SW version, which verification tools pass, what already shipped. Prevents the classic fresh-session failure of re-fixing something already fixed.
4. **Constraints / gotchas** — only load-bearing ones. This is the field that pays for the handoff; it is where "the host path proves nothing about clients" lives, and it is the reason a fresh session doesn't repeat the last one's dead end. Never pad it with generic rules already in the always-loaded files.
5. **Model + effort** — so the user opens the new session on the right model *before* the first turn, not after.

**Do NOT include:** a recap of what was tried and rejected (belongs in the impl-notes), code snippets (the new session reads the real file), or restatements of anything in CLAUDE.md / the three rule files — those load automatically and repeating them is pure waste.

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
**COMPLETE — Cookie Jar action-stage rework (7 Aug 2026), SW v164.** A 9-task plan against three
playtest rounds that all called the action stage "off." Diagnosed as a missing-feedback problem
wearing a layout problem's clothes: the base game's payout mutated state (`cjarRaidTotals`) with
no on-screen beat, so a normal flip gained cookies and nothing visibly moved — two earlier rounds
of layout work (DD-11, DD-12) could never have fixed that. Fix is presentational only, no rules or
packet change: the centre slot now holds the face-down card you're betting on rather than the one
that just resolved (DD-18), a 2100 ms reveal choreography gives every card — including the bust —
a flip/payout/settle beat (DD-19/DD-20), buttons are renamed to one metaphor across both modes
(DD-21), score rows split into stashed/at-risk pills (DD-22), and Crumbs + the Treat merged into
one "Up for Grabs" card while the deck badge demoted to a reservoir (DD-23/DD-24). Root-cause
lesson elevated to impl-notes as **TG-08**: before redesigning a screen players call confusing,
list every state mutation it performs and check each one has a visible beat. Full detail: § SW
Version below, decision-log 2026-08-07, `docs/implementation-notes/cjar-implementation-notes.md`.

**Side project — Arcade Mode (3 Aug 2026).** Secret Mode now holds **arcade cabinets**
alongside word packs and skins: small standalone canvas games under a new `ARCADE`
category, first in the terminal list. **Cabinets are NOT Sylly Games and NOT packs** —
no MP config, no `game-identities.md` section, no Sylly Mode, no verification harness,
and explicitly not `docs/rules/new-game-checklist.md`. They use the terminal's CRT
green-on-black language, not the Stack or the brand palette. First cabinet:
**Asherplane** (`js/arcade/asherplane.js`), a top-down shmup. Adding cabinet #2 = one
`SM_ARCADE` entry + one file. Spec:
`docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`; plan:
`docs/superpowers/plans/2026-08-03-arcade-asherplane.md`.

**COMPLETE — Phase 39: Cookie Jar (`cjar`), game 18.** Built task-by-task from `docs/superpowers/plans/2026-08-02-cookie-jar.md` (all 17 tasks done) against the confirmed spec `docs/new-game-tech-cookie-jar.md`. **The phase gate is CLOSED** — see `docs/phase39-snapshot.md`. Both required checks are satisfied: playtest rounds 1 and 2 were **live 3–4 device sessions** (a snapshot-drafting error earlier treated the plan's "three-device session" as a separate, still-unrun gate — it wasn't; the owner confirmed every gameplay round was real multi-device play), and the offline install check passed, single-device, exactly as designed. What remains is deliberately deferred suite-wide sweeps (see below), none of which block Cookie Jar.

**Playtest round 1 ran 3 Aug 2026 and found the blocker: BUG-06.** Every client froze on the Raid 1 intro and the host played the whole match alone. Root cause was **the wire, not the logic** — Firebase RTDB erases `null`, `{}` and `[]`, which is exactly the shape of cjar's explicitly-broadcast reset values (`seen: {}`, `trail: []`, `choices: [null,…]`, `counterTreat: null`), so `CJAR_FLIP_START` threw inside the client's warning-strip render one line before `showScreen`. Fixed at **SW v158** (current build v159) with three normalisers applied in all five SYNC appliers. The lesson is now a universal rule in `logic-engine.md` (§ MDLM Patterns) — every other MDLM game already reached the same place via the `p.x || []` idiom; cjar had none. Full account: impl-notes **BUG-06** + **ML-03**.

**What remains — all deliberately deferred, none blocking:**
1. ~~The offline install check~~ — **DONE, 3 Aug 2026, PASSED.** Unregister → hard reload → Offline → How to Play → The Cards tab → illustrated cards appeared. The 14 core-art JPEGs and the manifest are precached.
2. ~~Task 17's docs~~ — **DONE** (`code-map.md`, `game-identities.md` § Game 18, `docs/phase39-snapshot.md`, the `frt-implementation-notes.md` entry for Delta 2, decision-log, brief-prompt roster). Committed as `ee231f7`.
3. ~~Commit history completeness~~ — **DONE, 3 Aug 2026.** `js/games/cjar.js` had been committed in the Task-17 pass, but `data/cjar-data.json`, `data/art/cjar/`, and `MP_GAME_CONFIGS.cjar` in `js/engine-multiplayer.js` had not — `HEAD` would have shipped an unenterable game (404 on the data fetch, no lobby config). All committed now alongside the four verify tools, the simulator, spec, plan, and content guide.
4. **A suite-wide sweep for the BUG-06 class is NOT done.** cjar is fixed; whether any of the other 17 games assigns a raw payload collection that Firebase could erase has not been audited. Scoped out deliberately — same discipline as Delta 2. Worth a Protocol A pass.
5. **Two sweeps opened by round 2, both deliberately deferred:** the settings dynamic-value line (DD-13) across the other 17 games, and a card gallery / How-to tab for the other core-art games (FLW, SHP, FRT, PKO), which still have DD-09's original single-device-offline-check problem.

**Closed 3 Aug 2026:** TG-04 (the four unprefixed globals renamed to `cjarCookieCard` / `cjarFamilyCard` / `cjarTreatCard` / `cjarSeatsChoosing`, 77 sites across code, both harness bridges, the spec and the plan) · DD-07 (menu buttons were the only ones in the suite at the wrong type scale; `ui-style.md` § Universal Menu Standard now specifies it) · DD-08 (lobby minimum 4 → 3, owner call — **3-player balance is unsimulated**).

**Playtest round 2 ran 3 Aug 2026 across two passes — SW v158 → v161, both live 3–4 device sessions.** The offline install check (the one genuinely single-device step, by design) PASSED: DevTools → unregister → hard reload → Offline → Cookie Jar → How to Play → The Cards tab, illustrated cards appeared, so the 14 core-art JPEGs and the manifest are precached.

**Round 2's headline finding was a diagnosis, not a leak.** The reported "card stuck under the next one" was **the Treat**, not a render bug — `cjarRenderStage` had appended the deck's face-down card *and* `cjarCounterTreat` into the same 56 px column, so the unclaimed Treat drew as an unlabelled thumbnail wedged under the deck, in the slot that means "next". Different each Raid because the Treat is scheduled per Raid; persistent across flips because that is its rule. The mechanic was correct throughout; the object just had no home (BUG-08).

**HISTORICAL (round 2, superseded 7 Aug 2026 — see the Action Stage Rework entry above for the current stage layout).** The table became a 3-COLUMN grid, not a row (DD-12, second pass). CSS `grid-cols-3` — not flex — is what lets columns 1 and 3 stretch to match column 2's (the hero's) height automatically. Col 1 is "on the table": a Treat slot on top (art, or a **dashed placeholder in the exact footprint** a Treat will occupy, so one arriving is a fill-in, not a layout jump) and Crumbs below — Crumbs moved here from a separate band above the row, and before that from the private strip, because it is shared table state, not personal. Col 2 was, at this point in the round-2 record, still `just revealed` and still the single largest image — **DD-18 (7 Aug 2026) later inverted this**: col 2 now holds the face-down card you're betting on, showing face-up only during the reveal choreography. Col 3 was the deck — bumped again (6.5 → **7.2rem**) with a bigger, bolder count, because it needed to be "important to know" and its two stacked pieces (card + count) needed to reach col 2's height — **DD-24 later shrank it back down** once col 2 took over the "what you're betting on" job. The **history strip** gets the same placeholder treatment: before the first flip it showed dead space, which read as broken; now a single dashed thumb marks "history starts here."

**The private strip lost its two most-argued-about chips entirely.** `Cookie Stash` and `This Raid` were removed — not restyled — because `cjar-reveal-rows` (the standings table, moved to sit directly above the action buttons) **already shows both for your own seat, at every Open Book setting**: `cjarStashVisible()` is unconditionally true for `idx === mpMyPlayerIdx`, so your own row is never hidden. The strip now shows only Dibber Dobber's Favourite/Watcher/Owes chips, and hides itself entirely in the base game rather than rendering an empty bordered row.

**Screen order is now Stage → standings → Sylly-only chips → timer → action buttons**, buttons fixed at the floor as the consistent "the thing you act on is always last" rule. **The game menu's "See the Cards" button was removed** — the gallery lives only in How to Play now, which also puts cjar's menu back to the canonical 4-button shape (Play / How-to / Settings / Back) instead of a 5th deviation. **The gallery grid is CSS `grid-cols-3`, not `flex-wrap`** — Family (5) and Treats (5) now wrap a deliberate 3-then-2, not whatever `flex-wrap` happened to fit per row (previously 4-then-1). Gameover also gained a title — **The Haul 🍪** — matching the suite's "The [Noun]" shape (PKO's The Hierarchy, FLW's The Vault), with the nursery rhyme demoted to subtitle.

**`ui-style.md` gained two rules from round 2's first pass, both still standing:** the Settings Card Standard's dynamic value line (DD-13 — cjar is the reference; the other 17 games are **not** swept) and the How-to Overlay Standard's optional tab bar (DD-14 — teaching material earns a tab, a mid-play reference like PKO's chain keeps its own overlay).

**The blind-first-flip question, raised in round 2, is now RESOLVED (DD-17, SW v162).** In the base game flip 1 auto-resolves before any decision (correct — Incan Gold; you cannot decline to enter the temple) and Snack Friendly protects the cards you do see. Dibber Dobber had neither: its first decision every Raid was made on a completely empty stage, and `cjarBuildDeck`'s Sylly branch returned *before* `cjarFloatCookies`, so a new player's first move could cost 4 of 5 starting cookies with zero information. **Fix:** `cjarFloatCookies(deck, 1)` now runs at the end of the Sylly branch, after its own final shuffle (floating before that shuffle would have been undone by it) — the blind commit (Delta 7) is untouched, only the guaranteed card at position 0 changed. **Re-measured against the DD-06/Delta-7 baseline:** 5p spread 34.3 → 31.4 pts, Innocent 53.5% → 51.4%; 8p spread 37.4 → 37.6 pts, Innocent 52.9% → 52.3% — all within the noise band Delta 7 itself established, so DD-06's flagged imbalance is untouched. `verify-cjar-deck.js` cannot assert this (its identity-shuffle stub deals an all-family Sylly cut, TG-03); the new check lives in `verify-cjar-loopback.js` (the only harness with a real shuffle), 111 → 112.

**Playtest round 1, second pass — SW v159.** Five more items, all owner-raised:
1. **BUG-07** — the lobby dropped the host back on the game menu; `onPassThePhone` now calls `cjarStartMatch()`. cjar was the **only** MDLM game that bounced (GTH/FRT/SHP/FLW/PKO all go straight into play). The "GTH is the reference" note in `logic-engine.md` describes the *CTA's* dual context, not a routing recommendation — read the reference before following the prose.
2. **DD-11 — the stage was rebuilt as ONE ROW**: `trail → just-revealed card → face-down deck`, reading past → present → unknown. The old hero drew `cjarCard` at 15rem directly above a strip whose rightmost thumb was *the same card*, putting the bigger copy where the eye reads "the card under decision". Nothing is drawn twice now. Card drops to `cjar-card-stage` 8.5rem, which **improves** art sharpness (~1.1× → ~2.6× effective, TG-02b maths). New `cjar-card-flipin` + `cjar-trail-settle` animations, both transform/opacity, both fired only on real change.
3. **Standings are persistent** — `cjarRenderRevealRows` rendered only during `'revealing'`, so Open Book was ON with nowhere to see the ladder *while deciding*. Now every phase.
4. **DD-10 — Decision Time setting**: Blitz 10 s · Standard 20 s · **No Rush (no clock at all)**. Standard is deliberately above the old 15 s. `cjarDecisionMs()` returns `null` for No Rush so a caller that forgets to branch fails loudly; `windowMs` travels **per flip** so a client scales against the host's clock, and its wire-erased absence *is* the No Rush signal.
5. **DD-09 — `cjar-cards-overlay`, the suite's first card gallery.** Built from `CJAR_DATA` on open, every tile through `cjarRenderCard`. **This is what makes the offline install check a single-device job** — the earlier instruction to "check Settings and How to Play" was wrong, because cjar's art only rendered inside a running match, which on an MDLM-only game needs four phones to see a card at all.

`ui-style.md` gained the **Decision Modal button sizing** rule (previously unstated; three variants had shipped). cjar is conformed; **FLW, PASS, GTH and BLD diverge and were NOT swept** — owner deferred, logged in `docs/deferred-work.md`.

**Read `docs/implementation-notes/cjar-implementation-notes.md` first** — it is the real handoff artifact: 6 design decisions, 5 bugs, 2 multiplayer lessons, 6 template gaps, written as the build went. Seven **deltas** from the spec are recorded at the top of the plan; two matter most: **Delta 3** (a card's effect resolves at reveal, *before* the decision window — otherwise a visible bust card makes Sneaking Out free) and **Delta 7** (Dibber Dobber commits choices **blind**, owner call, so both modes share Incan Gold's mental model). Five harnesses, all green — re-run all five after any change to the appliers, the deck, the ledger or the packets:
```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js      # host↔client over a Firebase-shaped wire
node tools/simulate-cjar-dd.js          # balance instrument: asserts nothing, always exits 0
```
`verify-cjar-deck` **73** (data + deck + render seam) · `verify-cjar-loop` **102** (base game + match) · `verify-cjar-dd` **47** (Dibber Dobber) · `verify-cjar-loopback` **111** (two devices, both modes, 4- and 3-player, all three Decision Times, the stage grid, the gallery tab, the empty-trail placeholder). **The first three run in `'single'` mode** with `getElementById: () => null` — which is what lets one process drive all N seats, and exactly what blinds them to *both* the packet layer and every line of render code. **BUG-06 lived in that double blind spot** and survived all 222 of their checks plus the original ML-01 loopback, because that loopback had no wire between the devices. `verify-cjar-loopback.js` closes both gaps and is the one to reach for on anything MP- or render-shaped; it takes `CJAR_SRC=` so a deliberately-broken copy can be driven through the same wire to prove a test fails before the fix makes it pass.

**§ Offline — the install check is NOT a multiplayer test.** It is a **single device, no lobby, no second phone** check. What is verified is that the **service worker precached the 14 core-art JPEGs and the manifest** — a pure asset question, nothing to do with Firebase. Missing art renders every card as the emoji fallback (`cjarRenderCard`'s third tier); that is the tell.

**Procedure (v161 onward):** DevTools → Application → unregister the SW → hard reload → tick **Offline** → open Cookie Jar → **How to Play → The Cards tab**. Illustrated cards = precached. Emoji = it did not. You never start a match. (Round 2 removed the game menu's own "See the Cards" button — a redundant fifth button on a screen the Universal Menu Standard fixes at four — so this is now the only entry point, same as it always was for every other game's How to Play.)

**This only works because of DD-09.** Before v159 cjar's art rendered *only inside a running Raid*, so on an MDLM-only game the check needed four phones and a live room to answer a service-worker question — and the earlier instruction here ("open Settings and How to Play") was simply wrong, because those overlays are text. The gallery is what makes it a single-device job. **The other core-art games (FLW, SHP, FRT, PKO) still have no equivalent** and inherit the original problem — logged in `docs/deferred-work.md`.

Firebase is lazy-loaded and irrelevant here: the app is fully functional offline right up to tapping Host/Join, which shows `mp-network-error-overlay`. That overlay appearing offline is **correct behaviour, not a failure of this check**.

**One open balance flag, deliberately not acted on: DD-06.** Dibber Dobber's Innocent-leaning archetype wins **~52%** at both 5 and 8 players (33–38 pt spread against a ~12 pt threshold). Diagnosed to the **scare-off** — Play Innocent never pays on a Caught! card *and* sweeps the whole Crumb pool whenever no Dobber is present, while Dob is punished hard enough to be under-played. Not retuned on purpose: changing a number pre-playtest leaves nothing to compare against. If a lever is needed the candidates are the scare-off's unconditional full-pool sweep and the Dob backfire severity — **not** the Treat rule (a mechanism probe disconfirmed that).

---

**COMPLETE — Phase 38: Force of Nature (PKO Sylly Mode).** Shipped at **SW v149**, raised to **v150** after playtest round 4 (see § SW Version). Built against the confirmed spec `docs/new-game-tech-pecking-order-fon.md`, built task-by-task from the plan `docs/superpowers/plans/2026-08-01-pko-force-of-nature.md` (all 12 tasks done — **Task 12, the three-device multi-device pass, ran clean on v150**, non-host moving first: see D38, `docs/phase38-snapshot.md`). Nine events: the fixed opener **Invasive Mimicry** plus eight drawn per Encounter — **The Culling, The Great Reversal, The Deluge, The Dry Season, Extinction Event, Migration, Alpha, Carrion**. Plus the **Mimic** card (15th chain entry), `screen-pko-event`, `pko-carrion-overlay`, and a multi-winner `pkoResolveClash(winnerIdxs)`. **Dark Forest was cut** (D26).

**Three headless harnesses, all green — re-run all three after any change to the appliers, the chain, the balance numbers or the event rules:**
```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
`verify-pko-chain.js` **68** (data layer) · `verify-pko-loop.js` **132** (turn loop) · `verify-pko-events.js` **148** (Force of Nature). **TG-07 still binds:** all three run in `'single'` mode where `pkoMyHoard` *aliases* `pkoHoards[0]`, so per-device mirror bugs are invisible to them by construction — that is exactly how BUG-02 survived 75 green checks. The Mimic's raw-vs-resolved removal, the three `pkoSyncAllHands()` senders and `PKO_CARRION_OPEN` are all that class and **can only be proven on three devices**.

**Phase 37: Pecking Order (`pko`), game 17 — COMPLETE.** Adjacency climbing/shedding card game, MDLM-only, 3–6 players. Stage 1 brief (v7) ✅, Stage 2 spec ✅ confirmed 31 July 2026 (`docs/new-game-tech-pecking-order.md`), Stage 3 ✅, playtest rounds 1–3 ✅ (SW v145 → v147).

**Round 2 shipped two rules changes.** **Swarm restored** (cut in brief v6): any single Mark may be answered with **two cards of its own species**, and each becomes a Mark of its own — so a slot never holds depth, which is precisely the ambiguity the v6 cut was about. **Mob stays cut.** Swarm is the second outlet for shedding Mouse/Fish that `pko_log1.md` item F named and the v6 cut removed; its absence is the stall round 2 found. Plus **Appetite** (`pkoAppetite`) — `Sated` (strict chain) / `Ravenous` (predators also eat two tiers down, six new edges, apex band untouched). **Appetite defaults to Sated on purpose:** both changes attack the same symptom, so round 3 measures Swarm against the known baseline and flips Appetite mid-session as a free A/B. See spec §7/§17 D10–D11 and impl-notes DD-21…DD-24.

**`game-identities.md` § Game 17 now written** (1 Aug 2026) — terminology, full chain table under both Appetites, settings (incl. Small Fry, added since the Stage 2 spec), Swarm/Stampede/Poacher mechanics, the Force of Nature Phase 2 record, overlays, screens, MP packets — sourced from shipped `pko.js`/`index.html`, not the spec draft. PKO was already present in this file's Per-Game Quick Index (row 17) — the earlier note claiming it was missing was itself stale and has been corrected. Trail terminology fixed: "answered" → "**challenged**" in the Challenge builder + button label, matching the Trail's own verb (`pko.js`, `index.html`).

**New-game brief template/prompt superseded (1 Aug 2026):** the `v2` rewrite triggered by PKO's own brief (Rule Relationships/Interaction Matrix, Complex Interaction UI, Rule Reference, Sound Design, End Screen Content — all sections PKO had to invent from scratch) is now the canonical `docs/rules/new-game-brief-template.md` / `docs/content-prompts/new-game-brief-prompt.md`. The v1 originals were replaced in place (same filenames), so every existing pointer (this file, `new-game-process.md`, `phase-audit.md`, the checklist) needed no edits.

**Playtest round 4 (1 Aug 2026) — a 3-player session ran with a non-host moving first, no blocking bug reported.** It produced two legibility changes, both shipped at **v150**: the 5 s interstitial dwell and the live event in the table header + the nine-event roster overlay.

**Playtest round 5 (1 Aug 2026) — the deferred multi-device pass, run clean.** 3 players, SW v150, non-host moving first, several Encounters played: no mirror desync, no frozen fan, no dead button. This is the session TG-07 said no harness could substitute for, and it closes the per-device mirror class BUG-02 opened. **One path stayed unverified live:** no client Challenge in this session happened to beat a Mark, so `PKO_CARRION_OPEN` (gap C5) is confirmed by code audit — every Hoard-mutation site pairs with a `pkoSyncHand`/`pkoSyncAllHands` repair, and the SYNC is sent and handled unconditionally — rather than by a live client-side overlay open. See D38, `docs/phase38-snapshot.md`, decision-log 2026-08-01 "Phase 38 gate closed".

**The 5 s dial is one number for three things** — `PKO_INTERSTITIAL_MS` (both interstitials) and `PKO_CARRION_WINDOW_MS` (the spoils window) are separate constants held deliberately equal (D31, D35); if 5 s ever reads wrong at the table, decide whether it's the *reading* budget or the *acting* budget that's off before changing either, and re-run the events harness (it asserts they match). Key refs: `docs/new-game-tech-pecking-order-fon.md`, `docs/implementation-notes/pko-implementation-notes.md`, `docs/phase38-snapshot.md`.
**Core art tier (July–Aug 2026):** default game artwork now ships as a **core art pack** — `data/art/<kind>/pack.json` + images, same manifest format as a Secret Mode skin pack but **precached** and never listed in the Terminal. Resolution moved out of `secret-mode.js` into `js/lib/art.js`: `assetFace`/`assetBack`/`assetExtra` layer **skin → core art → emoji fallback**, so existing seams were untouched. Rolled out **game by game** — `pko`, `flw`, `frt`, and **`shp`** (Aug 2026) ship core art; PASS/DYB keep their emoji/CSS defaults until converted. **Promoting a skin to core art unlists the skin** — FLW's art came from `prismatic-gems`, FRT's from `fruity-fruits`, SHP's from `plush-sheeps`; all three left `data/packs/registry.json` in the same change (a Terminal entry identical to the default is only confusing). Candidate masters for the remaining two are already in `data/packs/`: `sea-cliff-dice`/`deep-ocean-dice` (DYB — **needs alpha, so PNG not JPEG**), `joker` (PASS — only 1 of 54 faces; budget the precache before generating the rest). **SHP's id 13 (Fogged Dream) is permanently unskinned** — its whole mechanic is a hidden value, so `shpRenderCard` never asks `assetFace` for it; the manifest simply has no `"13"` key, and `SHP_CARDS`' ids were deliberately NOT renumbered to close the gap (owner call, 1 Aug 2026 — those ids are locked across MP packets). Gotchas learned from the FLW/FRT/SHP runs: **check the masters' dimensions before setting the converter's target width** (all three sets of masters were already near the card aspect and small — upscaling would only cost bytes), and a conversion is not done until `sw.js` carries the manifest + every image and `CACHE_NAME` is bumped. See `docs/expansion-guide.md` § Core art packs (rollout tracker) and `tools/convert-core-art.ps1`.
**Phase:** Cartridge System **Phase A COMPLETE** (word expansions → runtime-loaded `data/packs/` cartridges). Phase 36 — Flawless (`flw`) COMPLETE. Private-hand multiplayer model (`mpSendPrivate` + `mpStartPrivateListener`) introduced.
**Cartridge (Phase A):** The 3 expansions are now `data/packs/<id>/pack.json` manifests (inline `words`), listed in `data/packs/registry.json`; `secret-mode.js` builds the terminal consts at runtime via `smLoadPacks()`; `sw.js` runtime-caches `data/packs/` (network-first JSON, cache-first images). Adding a word pack = drop folder + edit registry, no JS/SW edit. Defaults locked: inline words, terminal selector, single-purpose packs.
**Cartridge (Phase B — IN PROGRESS):** Asset (skin) packs share the same manifest/registry format with an `assets` block instead of `words`; render seams call `assetFace(kind,id)`/`assetBack(kind)` (in `secret-mode.js`) at draw time, falling back to default art when no pack covers an id. Device-local cosmetic — ids-only packets mean zero MP sync. Terminal is now **nested by category** (`WORD PACKS` theme→game; `GAME SKINS` game→skin) so pulling IP word packs at go-live just drops the `WORD PACKS` category. **Done:** general system (`window.activeAssetPack`, `assetFace`/`assetBack`, `smLaunch` asset branch, `resetSecretMode` teardown), B0 seam audit, **asset guards in all FIVE seams** — frt (`frtRenderCard`), shp (`shpRenderCard`), flw (`flwRenderCard`), cards (`Cards.buildEl/buildBackEl`, id scheme `rank`+suit-letter e.g. `QH`/`Joker`), and **dyb** (`dybDieHTML` standard faces only + `dybDieBackHTML` — special dice keep pips so type stays legible; the old face-down cup-die bypass at `dyb.js:482` now routes through the seam) — plus `.frt/shp/pass/dyb-die-asset` CSS, `SM_GAMES` entries for frt/shp/flw/pass/dyb, and sample SVG skins incl. `neon-fruit`, `neon-sheep`, `neon-deck` (full 54) — DYB's two live skins are `sea-cliff-dice` (faces-only) and `deep-ocean-dice` (a bundled `neon-dice` pack was never shipped, despite this paragraph previously claiming otherwise). **Phase B doc closure DONE:** code-map seam table, `expansion-guide.md` § Add an asset (skin) pack (per-game id cheat-sheets + install steps), decision-log entry, brief template §9A + tech template §10 asset-readiness, `docs/content-prompts/asset-pack-prompt.md`, logic-engine new-game checklist item. DYB dice skins keyed by face value 1–6 only (no per-type skinning — YAGNI). Spec: `docs/cartridge-system-plan.md` Part B. **Phase B COMPLETE.**
**Last shipped game:** Phase 36 — Flawless (FLW), gem-trading bluffing game, MDLM-only, 3–4 players; True Network Privacy (private Firebase channel); Sylly Mode = The Counterfeit Run.
**Previous shipped game:** Phase 35 — Counting Sheep (SHP), O'NO-99 climbing/survival card game, MDLM-only, 3–8 players; Sylly Mode = Night Terrors (oscillating Climb ⇄ Plunge).
**SW Version:** v165 (**Cookie Jar — the stage-polish round.** Owner feedback from the first real
playtest of the Aug 7 action-stage rework, not a new root-cause finding — presentational only,
no rules or packet change, confirmed by an unchanged `simulate-cjar-dd.js` noise band. Seven
design decisions, **DD-25…DD-31**: the reveal choreography's blocking dwell roughly doubles —
`CJAR_FLIP_ANIM_MS` 2100 → **3200 ms** (flip 600 / hold 1200 / payout 1400) — while a new ~1000 ms
settle tail moves OFF the blocking clock and overlaps the already-open decision window, the same
"transient animations float, contribute zero layout height" pattern the delta-token layer already
used (DD-25); all three stage-column headings move to the top so the row reads as one unit top-down
instead of column 1 reading down and columns 2/3 reading up, with the face-down label shortened to
**"Next from Jar"** and column 3 relabelled **"Left in Jar"** (DD-26), plus denser padding and an
enlarged Crumbs value/caption in column 1 (DD-26a); trail-strip thumbs are individually tappable,
opening a new `cjar-card-view-overlay` full-illustration popup while the strip container itself
keeps its no-handler rule (DD-27); the score table gains a header row and a fixed 5-column grid —
Rank | Player | Stashed | **Status** | At Risk — with the old inline 🚪 replaced by a proper
Still In / Snuck Out badge, base game only (DD-28); the family strip's inter-slot gap tightens and
its gap to the `[?]` button widens (DD-29); the gameover podium gets a fixed-width medal slot
(🥇🥈🥉 or blank) so every row's text aligns regardless of rank, plus a top-scorer highlight per
Raid in the history grid (DD-30); and same-screen action buttons must now match in size and weight
with **no exceptions** — the previously-documented "Back to the Box steps down because it's
navigation" carve-out is retired, applied to CJAR's own screens now, the other 17 games' sweep
deferred (DD-31, also written into `ui-style.md` as a standing rule). All five harnesses updated:
`verify-cjar-deck.js` **76** · `verify-cjar-loop.js` **102** · `verify-cjar-dd.js` **47** ·
`verify-cjar-loopback.js` **177** (147 at the Aug 7 rework, +30 from this round — the only harness
with real render-executing mock elements, so the only one that could assert any of this) ·
`simulate-cjar-dd.js` unchanged. Spec: `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md`.
Full detail: `docs/implementation-notes/cjar-implementation-notes.md`.)

**Previous versions:** v164 and earlier — `docs/sw-changelog.md` (the outgoing entry moves there on each bump; only the current version keeps its notes here).
**DYB harness:** `node tools/verify-dyb-dice.js` — re-run after any change to `js/lib/art.js`, `dybDieHTML`/`dybDieBackHTML`, or `.dyb-die-*` CSS. Covers the `specials` manifest block, the engine frame contract and its per-type opt-out, and the leak guard that stops a concealed phantom's real face reaching the DOM.
**Gold Master:** 16 games complete + multiplayer (LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy, Bailed, Group Therapy, The Bluff [internal `dyb`], Pass, Net-Trace, Fruit Salad, Counting Sheep, Flawless)
**Flawless key refs:** `docs/new-game-tech-flawless.md` (confirmed spec), `docs/implementation-notes/flw-implementation-notes.md`, `docs/new-ideas/new-game-brief-flawless.md` (Phase-1 brief). MDLM-only, True Network Privacy (`mpSendPrivate`), host-as-participant, host-authoritative; rose-pink `#E879A8` + Exhibition gold `#C9A227`; all card rendering through `flwRenderCard` (asset-pack seam); 10 gems (`FLW_GEMS`); Sylly Mode = The Counterfeit Run (1 token + 2 audit charges per Showing).
**Counting Sheep key refs:** `docs/new-game-tech-counting-sheep.md` (confirmed spec — Night Terrors + ghost rework in v1), `docs/implementation-notes/shp-implementation-notes.md` (bug log incl. Wolf-deal fix + design decisions), `docs/new-ideas/counting-sheep-notes.md` (final design notes). MDLM-only, host-authoritative, host-as-participant; couch security; moonlit indigo (native Tailwind); all card rendering through `shpRenderCard` (asset-pack seam); single-source herd math `shpHerdAfterCard` (Plunge sign-flip).
**Phase snapshots live in `docs/`** — corrected 1 Aug 2026 (owner clarification): the earlier "external archive" move was housekeeping to get old files out of the way of in-repo sweeps, not a standing rule to write new ones externally. The owner keeps their own running Confluence separately; an in-repo snapshot is Claude Code's own reference, so **new snapshots are written to `docs/phase[N]-snapshot.md`** (see `docs/phase37-snapshot.md` for the current template). Historical snapshots up to and including **phase36** (FLW + private-hand model), **fable-audit** (the 71-item Studio Audit campaign), and **phase22** (multiplayer complete — MFS v1.4) remain in the external archive the decision-log anchors to — ask the owner if you need to read one of those specifically. `docs/archive/` still holds the one pre-existing Protocol-A sweep snapshot from 30 June 2026.

**Key references:** see the Task Playbooks table above, plus `docs/code-map.md` (surgical code reference) and `docs/implementation-notes/[abbr]-implementation-notes.md` (one per game — bug log + design decisions).
