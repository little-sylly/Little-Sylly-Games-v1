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
- `docs/art-authoring-guide.md` — the standalone, no-Claude-Code guide to **making artwork**: skin pack vs core art, exact pixel dimensions and aspect per game, the complete art inventory for all seven render seams, `tools/make-skin-pack.ps1`, per-game gotchas, the offline install check, troubleshooting. **Read when:** the task is authoring or converting art, or answering "what art does game X need / what size". Written for the owner to use alone — point them at it rather than re-deriving dimensions from CSS.
- `docs/rules/word-expansion.md` — the `data/words.json` content rules: difficulty tiers, curated Great Minds categories, the animals Broad Shield protocol, and the `nono_list` Dual-Use Contract. **Read when:** adding or editing words in `data/words.json` or a pack manifest's inline `words`. *(Moved out of `CLAUDE.md`, 9 Aug 2026 — content-authoring only.)*
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

**Front door for any task — SIZE IT FIRST (§ Task Triage Gate below), then open the matching workflow and record the outcome in the listed doc.** All of these are on-demand reads (not auto-loaded).

| Starting a… | Open this workflow | Record the outcome in |
|-------------|--------------------|------------------------|
| **New game** | `docs/rules/new-game-process.md` (3-stage: brief → tech spec → implementation) | tech spec `docs/new-game-tech-[name].md` + phase snapshot + `docs/decision-log.md` |
| **Audit / phase gate** | `docs/rules/phase-audit.md` (Protocols A/B/C) | phase snapshot + `docs/decision-log.md` |
| **Bug / update / polish** | `docs/templates/task-bug-polish.md` (fill the intake form first) | `docs/implementation-notes/[abbr]-implementation-notes.md` — or `shared-implementation-notes.md` if the root cause is in engine/secret-mode/art.js rather than a specific game (+ `docs/decision-log.md` if it became architectural) |

**`docs/decision-log.md`** — the running index of big architectural / strategic / process decisions (newest on top). Read it to recall *why* something was done; append a one-line entry whenever a change is architectural, strategic, or process-level (wired into the Documentation Integrity Protocol below).

### 🚦 Task Triage Gate — size the task BEFORE picking a workflow

**This rule overrides the superpowers SessionStart hook**, which instructs that any task with "even a 1% chance" of matching a skill must invoke it, and routes "let's build X" to brainstorming → spec → plan by default. That hook has **no size gate**: it puts a two-line CSS change through the same pipeline as building game 18. Its own closing line concedes the precedence — *"User instructions (CLAUDE.md…) take precedence over skills"* — so this section is the authority, not the hook.

**Classify the task in one line before doing anything else. State the tier out loud, then work at that tier.**

| Tier | What it is | Process |
|------|-----------|---------|
| **0 — Trivial** | ≤2 files · no logic, packet, state or rules change · uses an existing pattern verbatim. Spacing, a label string, a colour, a class swap, a copy fix, a stale doc line. | **Edit directly.** No design spec. No plan file. No subagents. No new harness assertions. One commit. Impl-notes only if a genuine lesson emerged — "changed a gap" is not a lesson. |
| **1 — Bounded** | One game · existing pattern · logic touched but no cross-cutting rule (MP sync, render seam, engine contract). A normal bug fix or polish item. | `docs/templates/task-bug-polish.md` intake, **inline in this session**. No spec/plan split — the intake form *is* the plan. Harness assertions only if the fix touched something a harness already covers. |
| **2 — Architectural** | New game · new engine/MP pattern · a change touching 3+ files under cross-cutting rules · a phase gate. | **Full pipeline earns its keep here** — brainstorm → spec → plan → task execution → review. The Cookie Jar build's 4,219-line plan was correctly sized. |

**Batching rule.** A round of several Tier-0/1 items (an owner playtest list, a polish sweep) is **one** unit of work: one plan section if any, one implementation pass, **one** documentation-closure pass at the end. Never one full cycle per item. The DD-25…DD-31 round ran nine cycles for seven cosmetic tweaks and produced 1,626 lines of planning prose against ~186 lines of shipped production code — a ~9:1 ratio, plus four post-hoc review-fix commits, one of them fixing an assertion the same round had just written.

**Subagent rule.** Default to working **inline**. Every dispatched subagent starts cold and re-pays this project's ~30k baseline (CLAUDE.md + the three always-loaded rule files) before doing any work — nine sequential task-subagents is ~270k tokens of pure baseline, larger than the round's real content and invisible while it happens. Dispatch only when tasks are genuinely **parallel and independent**, or when a search would otherwise flood this context (the Explore agent, per the model picker's "large exploratory search" row).

**Harness rule.** Verification harnesses cover **rules, packets, state, decks and appliers** — not presentation. A cosmetic change does not earn new assertions. Asserting label strings and pixel slots is what produced `560c7c2` (fixing DD-30's own just-written podium assertions); the assertion cost more than the bug it could have caught.

**Escalate a tier when you find you were wrong** — a "trivial" change that turns out to touch a packet is Tier 1, say so and switch. Escalating on evidence is correct; escalating pre-emptively "just in case" is the behaviour this gate exists to stop.

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
5. `docs/implementation-notes/[abbr]-implementation-notes.md` (or `shared-implementation-notes.md` for engine/secret-mode/art.js work) — log any design decisions made, bugs found and resolved, or lessons learned during the phase (create the file if it doesn't exist)
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

**The two fields that actually pay for the handoff:** **Read first** (name the file *and* the Grep
term — 3 files ceiling — so the new session never full-reads `index.html`, `code-map.md` or
`game-identities.md`) and **Constraints / gotchas** (load-bearing only — this is what stops a fresh
session repeating the last one's dead end). **Task** stays one action; three tasks produces a
session that context-switches and finishes none. **State** carries only what a fresh session cannot
infer (SW version, which harnesses pass, what shipped) — it prevents re-fixing something already fixed.

**Do NOT include:** a recap of what was tried and rejected (belongs in the impl-notes), code snippets (the new session reads the real file), or restatements of anything in CLAUDE.md / the three rule files — those load automatically and repeating them is pure waste.

---

## 🎯 Skills

### 🎯 Skill: PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.
See `@logic-engine.md` for the full checklist and SW asset list.

### 🎯 Skill: Consistent Word Expansion
**Trigger:** Adding or editing words in `data/words.json`, or a pack manifest's inline `words`.
**Action:** Read `docs/rules/word-expansion.md` (on-demand) and follow it — difficulty tiers, the
curated Great Minds category list, the animals **Broad Shield** protocol, and the `nono_list`
**Dual-Use Contract** (every slot means something different in Like I'm Five vs Natural Selection,
so a careless edit silently degrades one of the two games).

### 🎯 Skill: Add New Expansion Pack
**Trigger:** Adding a new secret mode expansion (new theme/word bank).
**Action:** Follow `docs/expansion-guide.md` — 4-step checklist. Do NOT patch plugin files (the proxy architecture handles everything).

### 🎯 Skill: Implementation Notes
**Trigger:** Any non-trivial bug fix, design decision change, or architectural lesson — during new game builds, maintenance, or audit of any existing game **or of shared/engine code**.
**Action:**
1. **Pick the right file first.** If the bug or decision's root cause lives in a single game's own code, use `docs/implementation-notes/[abbr]-implementation-notes.md` (create it if missing, four sections: Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps). If the root cause is in `engine.js`, `engine-multiplayer.js`, `secret-mode.js`, `js/lib/art.js`/`cards.js`/`canvas-draw.js`, `sw.js`, or a cross-cutting rule itself — **even if it was found while testing one specific game** — use `docs/implementation-notes/shared-implementation-notes.md` instead (same four-section shape). A fix touching both a shared function and a game's own call site gets the root-cause writeup in exactly one file (whichever owns the bug), with at most a one-line pointer in the other.
2. Add a concise entry in the appropriate section: **What happened → Root cause → Lesson**
3. At the end of any audit or testing session, review the Template Gaps section and flag items that should fold into `logic-engine.md`, `ui-style.md`, or the tech template
**When:** Log entries in the same response that completes the fix — not in a follow-up session. If the fix is done and this skill hasn't run, the session is not complete.
**Scope:** All games — new and existing — plus shared/engine code. Log during any session that touches a game's code or the engine, not just at phase boundaries.
**Cross-reference:** Before starting a new game's tech spec, read the Template Gaps section of all existing implementation notes files (including `shared-implementation-notes.md`) and resolve any gaps that apply to the new game before implementation begins.

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

**This section carries *state*, not history.** Anything finished and documented elsewhere is a
pointer, not a narrative — that is what keeps this file cheap. When a round closes, compress its
entry to one line and let the impl-notes carry the detail (§ Documentation Integrity Protocol).

**SW v170 — Counting Sheep: Sleepwalkers folded into Sylly Mode, Wolf + Fogged Dream art, MDLM start-game fix (11 Aug 2026).**
Owner playtest call: the ghost/Nightmare-Meter system (Sleepwalkers) was a separate ON-by-default
toggle sitting next to Sylly Mode (Night Terrors) — a base-rules game could still have eliminated
players haunting the table. It's now gated on `shpSyllyMode` directly; the standalone settings
toggle and its How-to step were removed, and their copy folded into the Sylly Mode settings/how-to
cards. Also: the in-hand Big Bad Wolf "slot locked" placeholder was hardcoded to the 🐺 emoji even
though `data/art/shp/`'s `12.jpg` was already precached — it bypassed `assetFace` entirely because
the Wolf card is consumed straight to discard on draw and never rendered through the normal path.
Now tries the core art first, emoji as fallback. **v168→v169 same-day fix:** the Sleepwalkers
removal missed two references in `engine-multiplayer.js`'s MDLM settings serialiser/applier
(`mpSerialiseSettings('shp')`, the SETTINGS_SYNC applier), which threw a `ReferenceError` the
moment the host tapped the lobby's Start button — the async `mpConfirmRoster()` caught it silently
and just reset the button, so "Lights Out" appeared to do nothing with 3+ players joined.
**v169→v170 same-day:** Fogged Dream (id 13) also gets real art now — the earlier "permanently
unskinnable" call (1 Aug 2026) conflated the card's hidden *resolved value* (2–12, rolled at play
time) with its *appearance*; a static face doesn't leak the roll, so the owner's ready `card13.png`
was converted in (`data/art/shp/img/13.jpg`) and wired the same way as the Wolf-slot fix. Detail:
`docs/implementation-notes/shp-implementation-notes.md` (2026-08-11 entries).

**Still open from v166:** PKO's **Stragglers** scoring mode is shipped but unplayed — Force of
Nature can hand a player cards they did not choose (Deluge, Culling, Migration, Great Reversal),
which is a straight penalty under Stragglers in a way it never was under Dominance, deliberately
left un-special-cased pending a live session. Detail: `pko-implementation-notes.md` D39/D40.

**Previous versions: `docs/sw-changelog.md`** — the outgoing entry moves there on each bump; only
the current version keeps its notes here.

**Where the suite stands.** **18 games shipped**, all gold-master, plus multiplayer. Newest three:
**Cookie Jar** (`cjar`, game 18, phase 39), **Pecking Order** (`pko`, game 17, phase 37) and its
**Force of Nature** Sylly Mode (phase 38). All three phase gates are CLOSED —
`docs/phase39-snapshot.md`, `docs/phase37-snapshot.md`, `docs/phase38-snapshot.md`. The **Cartridge
System** is COMPLETE, both halves (Phase A word packs, Phase B skin packs) —
`docs/cartridge-system-plan.md`. **Core art** has rolled out to `pko`, `flw`, `frt`, `shp`; **PASS
and DYB still run emoji/CSS defaults** — rollout tracker, the 4-step conversion and the offline
install check live in `docs/expansion-guide.md` § Core art packs.

**Side project — Arcade Mode.** Secret Mode holds **arcade cabinets** under an `ARCADE` category
alongside word packs and skins. **Cabinets are NOT Sylly Games and NOT packs** — no MP config, no
`game-identities.md` section, no Sylly Mode, no verification harness, and explicitly **not**
`docs/rules/new-game-checklist.md`. They use the terminal's CRT green-on-black language, not the
Stack or the brand palette. First cabinet: **Asherplane** (`js/arcade/asherplane.js`), a top-down
shmup. Adding cabinet #2 = one `SM_ARCADE` entry + one file. Spec + plan:
`docs/superpowers/{specs,plans}/2026-08-03-arcade-asherplane*.md`.

**Open threads — all deliberately deferred, none blocking: `docs/deferred-work.md`.** It holds the
older-games retest backlog, four pending suite-wide sweeps (the **BUG-06** Firebase-erasure class,
the **DD-13** settings value line, **DD-31** button parity, and a How-to card gallery for
FLW/SHP/FRT/PKO), the Decision Modal button-sizing divergences (FLW/PASS/GTH/BLD), and CJAR's open
**DD-06** balance flag. Read it when picking up maintenance work, or at a phase gate.

### 🧪 Verification harnesses

Re-run a game's full set after touching its appliers, deck/data, packets or render seam.

| Game | Command | Checks |
|------|---------|--------|
| CJAR | `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js` | 76 · 102 · 47 |
| CJAR | `node tools/verify-cjar-loopback.js` — host↔client over a Firebase-shaped wire | 177 |
| CJAR | `node tools/simulate-cjar-dd.js` — balance instrument; asserts nothing, always exits 0 | — |
| PKO | `node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js` | 68 · 147 · 148 |
| DYB | `node tools/verify-dyb-dice.js` — after any `js/lib/art.js` / `dybDieHTML` / `.dyb-die-*` change | 90+ |

**The blind spot they share is load-bearing.** Every harness *except* `verify-cjar-loopback.js`
runs in `'single'` mode with `getElementById: () => null`. That is what lets one process drive all
N seats — and exactly what blinds it to **both** the packet layer and every line of render code (a
render throw inside a SYNC applier is invisible; the guard clauses all short-circuit). PKO's
**TG-07** is the same shape from the other side: `pkoMyHoard` *aliases* `pkoHoards[0]`, so
per-device mirror bugs cannot exist there by construction. CJAR's **BUG-06** survived 222 green
checks in that double blind spot; PKO's **BUG-02** survived 75. `verify-cjar-loopback.js` closes
both gaps — real wire, real render-executing mock DOM, and it accepts `CJAR_SRC=` so a
deliberately-broken copy can prove a test fails before the fix makes it pass — so reach for it on
anything MP- or render-shaped.

**Layout is a fourth tier none of them reach** — a mock element has no box, so no harness can see
spacing, alignment or overflow. For that, invoke the **`visual-check`** skill: real headless
Chromium, `getBoundingClientRect` measurements, and one browser context per seat for genuine
per-device views. Use it whenever a screen "looks off" or a fix is presentational (it found
DD-32's 20 px score-table gap). **None of it substitutes for a real multi-device session:** no
clock skew, no Firebase ordering, no dropped packets, and no judgement about how anything *feels*.

**Standing pointers.** Phase snapshots are written **in-repo** to `docs/phase[N]-snapshot.md`
(current template: `docs/phase37-snapshot.md`). Snapshots up to and including phase36, the
fable-audit campaign, and phase22 live in the owner's external archive — ask if you need one.
Every game's confirmed spec is `docs/new-game-tech-[name].md`; its bug log and design decisions are
`docs/implementation-notes/[abbr]-implementation-notes.md`. Non-game-specific bug logs and design
decisions (engine.js, engine-multiplayer.js, secret-mode.js, js/lib/*) live in
`docs/implementation-notes/shared-implementation-notes.md` instead. Those, plus `docs/code-map.md`
and `docs/decision-log.md`, are where the detail this section used to carry now lives.
