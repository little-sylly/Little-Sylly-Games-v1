# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📂 Rule Files

**Always loaded (auto-imported via `@` — keep this list lean; every file here costs baseline tokens in EVERY session):**
- `@ui-style.md` — overlays, buttons, speaker/exit protocol, settings layout, Sylly Tone (apply-on-every-edit pattern rules)
- `@logic-engine.md` — engine/plugin split, screen routing, audio catalogue, PWA, new-game checklist (apply-on-every-edit pattern rules)
- `@definitions.md` — naming conventions, comment style, data schema, project-wide terms

**On-demand — READ with the Read tool only when the trigger applies (NOT auto-loaded; do not read these during routine bug/polish work):**
> ⚠️ These live in `docs/rules/`, NOT `.claude/rules/`, **on purpose** — the harness auto-loads every file in `.claude/rules/` into baseline context every turn. Only the three always-loaded files above belong there; do NOT move these back.
- `docs/game-identities/[abbr].md` — the game's **identity doc**: pitch, premise, how to play, theme + flavour, terminology, settings, the player's journey (beat map + every UI string), Sylly Mode, art, table shape. **15–25 KB — read it WHOLE**, it is written to be read end to end. **Read when:** any non-technical work on one game — review, copy, an art brief, a game review, or just learning what the game is. Each section is tagged **free** / **paired** / **derived** — see the change contract in `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5 before editing one. Copy blocks are machine-verified by `tools/verify-identity-docs.js`. **All 18 games now have one** — the `docs/rules/game-identities.md` migration completed 23 Aug 2026; that file is deleted.
- `docs/rules/per-game-classes.md` — the per-game class strings: brand colour, range/toggle/pill classes, Play CTA + how-to emoji + Sylly Mode name, `accentBtnClass`, step label, Settings tint. **Read when:** building or editing any game's UI and you need its exact class strings.
- `docs/art-authoring-guide.md` — the standalone (no-Claude-Code) artwork guide: skin pack vs core art, exact dimensions/aspect per game, the inventory for all seven render seams, `tools/make-skin-pack.ps1`, the offline install check. **Read when:** authoring/converting art, or answering "what art does game X need". Written for the owner to use alone — point them at it rather than re-deriving dimensions from CSS.
- `docs/rules/word-expansion.md` — `data/words.json` content rules: difficulty tiers, Great Minds categories, the animals Broad Shield protocol, the `nono_list` Dual-Use Contract. **Read when:** editing words in `data/words.json` or a pack manifest's inline `words`.
- `docs/rules/new-game-process.md` — three-stage protocol (brief → tech spec → implementation). **Read when:** starting a new game.
- `docs/rules/new-game-brief-template.md` / `new-game-technical-template.md` — the Phase 1 and Phase 2 templates. **Read when:** new-game Stage 1 / Stage 2.
- `docs/rules/new-game-checklist.md` — the ~40-item build checklist (engine registration, settings/overlay standards, MP handler audit, render seam, harness, closure). **Read when:** implementing a new game — before its first line of code. Binding.
- `docs/rules/phase-audit.md` — Protocols A/B/C (drift check, skeleton-first, studio sweep). **Read when:** a phase boundary, or before a new game's first line of code.
- `docs/sw-changelog.md` — every SW release note, continuous v204→v167. **Read when:** you need the history behind a past version.
- `docs/deferred-work.md` — the parked-work list: older-games retest backlog, pending suite-wide sweeps, smaller flagged items. **Read when:** picking up maintenance work, or at a phase gate.

### 🎮 Per-Game Quick Index
Always-on pointer so single-game work doesn't need a big file read. Brand colour rarely changes; everything else, confirm at the source.

**Every game's non-technical detail lives in its identity doc** — `docs/game-identities/[abbr].md`,
read whole (15–25 KB): themes, terminology, settings, every UI string, the beat map, art, table
shape. Screen/overlay IDs, state variables, key functions and MP packet tables live in
`docs/code-map.md` instead — never in an identity doc.

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
| 15 | Counting Sheep | `shp` | `shp.js` | midnight `#3A3D52` (custom) / `pill-active-shp` |
| 16 | Flawless | `flw` | `flw.js` | rose-pink `#E879A8` / `pill-active-flw` |
| 17 | Pecking Order | `pko` | `pko.js` | `#854D0E` / `pill-active-pko` |
| 18 | Cookie Jar | `cjar` | `cjar.js` | honey-gold `#D4A017` (dark ink) / `pill-active-cjar` |

For per-game classes (range / toggle / pill / CTA / how-to / brand class strings) read `docs/rules/per-game-classes.md` (on-demand) — the single source for those; don't duplicate them here.

For where each game's screens/overlays live in `index.html`, see the **Per-Game Offset Map** at the top of `docs/code-map.md`. **`code-map.md` is ~132 KB (~33k tokens) — never read it whole.** Same rule as any large file: Grep for the game or element ID, then offset-Read that slice. One careless full read costs more than the entire always-loaded rule set.

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

**This rule overrides the superpowers SessionStart hook**, which has no size gate and would put a two-line CSS change through the same brainstorm → spec → plan pipeline as building game 18. The hook's own closing line concedes precedence to CLAUDE.md, so this section is the authority.

**Classify the task in one line before doing anything else. State the tier out loud, then work at that tier.**

| Tier | What it is | Process |
|------|-----------|---------|
| **0 — Trivial** | ≤2 files · no logic, packet, state or rules change · uses an existing pattern verbatim. Spacing, a label string, a colour, a class swap, a copy fix, a stale doc line. | **Edit directly.** No design spec. No plan file. No subagents. No new harness assertions. One commit. Impl-notes only if a genuine lesson emerged — "changed a gap" is not a lesson. |
| **1 — Bounded** | One game · existing pattern · logic touched but no cross-cutting rule (MP sync, render seam, engine contract). A normal bug fix or polish item. | `docs/templates/task-bug-polish.md` intake, **inline in this session**. No spec/plan split — the intake form *is* the plan. Harness assertions only if the fix touched something a harness already covers. |
| **2 — Architectural** | New game · new engine/MP pattern · a change touching 3+ files under cross-cutting rules · a phase gate. | **Full pipeline earns its keep here** — brainstorm → spec → plan → task execution → review. The Cookie Jar build's 4,219-line plan was correctly sized. |

**Batching rule.** A round of several Tier-0/1 items (an owner playtest list, a polish sweep) is **one** unit of work: one plan section if any, one implementation pass, **one** documentation-closure pass at the end — never one full cycle per item. (The DD-25…DD-31 round ran nine cycles for seven cosmetic tweaks: ~9:1 planning prose to shipped code.)

**Subagent rule.** Default to working **inline**. Every dispatched subagent starts cold and re-pays this project's **~33k baseline** (CLAUDE.md + the three always-loaded rule files) before doing any work — nine sequential subagents is ~300k tokens of pure baseline, larger than the round's real content and invisible while it happens. Dispatch only when tasks are genuinely **parallel and independent**, or when a search would otherwise flood this context (the Explore agent, per the model picker's "large exploratory search" row).

**Harness rule.** Verification harnesses cover **rules, packets, state, decks and appliers** — not presentation. A cosmetic change does not earn new assertions. (Asserting label strings and pixel slots produced `560c7c2`, a commit fixing the same round's just-written podium assertions.)

**Escalate a tier when you find you were wrong** — a "trivial" change that turns out to touch a packet is Tier 1, say so and switch. Escalating on evidence is correct; escalating pre-emptively "just in case" is the behaviour this gate exists to stop.

---

## 📁 Load Order
**Load order:** `music.js` → `engine.js` → `art.js` → `engine-multiplayer.js` → `canvas-draw.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `bld.js` → `gth.js` → `dyb.js` → `cards.js` → `pass.js` → `nt.js` → `frt.js` → `shp.js` → `flw.js` → `pko.js` → `cjar.js` → `secret-mode.js` → `app.js`
(`tailwind-play.js` loads in `<head>` before everything else. `js/lib/music.js` loads *before* `engine.js` — the engine boot block calls `Music.init()` at parse time.)
All symbols are global (no ES modules). Forward references work at runtime.

---

## 🛠 Tech Stack & Zero-Cost Constraints
- **Languages:** Vanilla JS (ES6+), HTML5, CSS3
- **Styling:** Tailwind CSS — local file `/js/lib/tailwind-play.js` (no CDN, works offline)
- **Hosting:** GitHub Pages ($0) — no backend
- **Audio:** Web Audio API (synthesised tones) — **effects are never files**. The one exception is background *music* (`data/music/`, SW v212), runtime-cached like packs and never precached — see `logic-engine.md` § Background music
- **Capabilities:** PWA (offline via Service Worker), Screen Wake Lock API
- **Diagrams:** Mermaid (`stateDiagram-v2`) — used in tech specs for state flows; rendered natively by GitHub, no install required
- **Font:** Fredoka, self-hosted from `fonts/` (variable woff2, `@font-face` in `css/styles.css`, precached). No external font request — the app has **zero** runtime third-party dependencies.

---

## 🚫 Anti-Patterns (Do Not)
- Do NOT add a build step — no `npm`/`webpack`/bundler for the app itself. (`tools/*.js` verification
  harnesses run under Node; that's dev tooling, not a build.)
- Do NOT add external JS libraries. The only two are vendored: local Tailwind (`js/lib/tailwind-play.js`)
  and the Firebase SDK (precached, lazy-loaded at runtime — see `logic-engine.md` § Firebase Lazy-Load).
- Do NOT create multiple HTML pages — single-page app
- Do NOT use `localStorage` for game state mid-round (memory only; settings may persist)
  - **Exception:** `sylly_nickname` (multiplayer nickname) and `isMuted`/`masterVolume` are permitted localStorage uses
- Do NOT over-engineer: no classes/inheritance unless genuinely needed
- Do NOT assume context from previous sessions — reference files explicitly
- Do NOT add game-specific audio controls — audio is global via `engine.js`

---

## 🧠 How to Work
- **Visualise first.** Describe the logic/flow in plain English before writing code. For a genuinely
  new pattern, lead with a real-world analogy and one sentence on why this way over the alternative.
- **Atomic changes.** One function or one UI component at a time.
- **Test first.** Name the verification before implementing it.
- **Direct references.** Read/edit the specific files and lines the task needs — never a whole big
  file to "get oriented" (§ Token Hygiene).
- **Challenge bad specs.** If a proposed mechanic breaks the game's soul, say so before building it.
- **Confluence Snapshot** — the deliverable shape for any architectural change or phase shift:
  **Decision** (one sentence) · **Rationale** (the why) · **Technical Impact** (what changed, which
  files). Write it as part of the work; it feeds `docs/decision-log.md`.

---

## 📋 Documentation Integrity Protocol
**Trigger:** After any completed phase, game addition, permanent architectural change, or mid-session bug fix session. Applies even when no phase snapshot is written — the snapshot is optional, the doc updates are not.
**Mandatory updates, in this order:**
1. `docs/code-map.md` — new screen IDs, overlay IDs, key functions, state variables
2. `docs/game-identities/[abbr].md` — terminology, settings, the player's journey + UI copy, Sylly Mode, art. **Screen and overlay reference tables are step 1's job, not this one.** Respect the section's **free / paired / derived** tag — a paired change is not done until the code ships too.
3. `CLAUDE.md` — SW version, Current Focus, key references
4. `logic-engine.md` / `ui-style.md` — any new universal rule, audio function or engine/UI pattern
5. `docs/implementation-notes/[abbr]-…md` (or `shared-…md` — see § Skill: Implementation Notes for which) — design decisions, bugs resolved, lessons
6. `docs/decision-log.md` — one entry (newest on top, ~4 lines, pointer not deep-doc) **if** the work included an architectural, strategic or process-level decision. Skip only for routine bug/polish.

**Rule:** No phase snapshot until all six are verified current. The snapshot is the final deliverable, not the starting point for cleanup.

**Enforcement:** at the start of a new phase, read `docs/code-map.md` and each affected game's identity doc (`docs/game-identities/[abbr].md`) and cross-reference against the real `index.html` headers and JS. Flag and resolve any discrepancy before implementation begins. `node tools/verify-identity-docs.js` does the UI-copy half of this mechanically.

---

## 🧼 Token Hygiene & Context Management
- **Never full-read `index.html`:** It is ~515 KB (~128k tokens) — a single full read nearly fills the context window and is the largest avoidable token sink in this project. To work on a screen or overlay, **Grep first** for its identifier (`screen-[abbr]-*`, an `[abbr]-*-overlay` ID, or the `<!-- ════ GAME NAME ════ -->` section header), then **Read with `offset`/`limit`** around the hit — never read the whole file to "get oriented".
- **Same rule for any file over ~40 KB** (e.g. `js/games/nt.js`, `engine-multiplayer.js`, `secret-signals.js`): locate the relevant section with Grep, then read only that slice. Reading a large file in full to orient yourself is the single most common cause of the mid-task auto-compact spiral.
- **Lean Context:** Avoid repetitive explanations. Assume technical competence.
- **Australian English:** Use Australian spelling (e.g., "colour", "synthesised"). Metric units only.
- **Session Cleanup:** If a sub-task is complete, suggest running /compact to clear history.
- **End every response with "what's next":** 1–2 sentences naming what was just completed AND what comes next (name upcoming phases for multi-phase work). Applies even to short responses — the owner may return after a gap with no context. The closing line must carry **all three** explicitly, never implied: the next task, the **model + effort** it warrants (from the table below), and the **session call** — `same session` / `/compact then continue` / `fresh session` (second table).

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

One trade: a fresh session re-pays the **~33k baseline** but starts clean; continuing pays the **entire transcript every turn** whether or not it still matters. The test is not "how long have we been going" — it is **how much of what's loaded is still relevant to the next task**.

| Signal | Call | Why |
|--------|------|-----|
| Next task is the **same game / same files** already read into context | **same session** | Re-reading those slices in a fresh session costs more than carrying them |
| Next task is a **direct follow-on** (fix → test it, build → document it) | **same session** | The reasoning behind the change is the context |
| Sub-task done, next task is **adjacent but narrower** (e.g. finished a PKO fix, now writing PKO impl-notes) | **/compact then continue** | Keeps the conclusions, drops the exploration that produced them |
| **Switching games** (PKO work → FRT bug) | **fresh session** | Nothing loaded transfers; you're paying rent on dead context |
| **Switching mode of work** (build → doc-only, code → design/spec) | **fresh session** | Different rule files, different reading pattern |
| **Auto-compact has already fired once** | **fresh session** | The cheap context is gone. A summary-of-a-summary is worse than a clean start with a pointer to the impl-notes |
| A **big file slice was read** and is now irrelevant (a 3k-line `index.html` window, a `code-map.md` section) | **fresh session** | That slice re-costs on every turn forever |
| Escalating model **up** for the next task (Sonnet → Opus) | **fresh session** | Opus turns are the expensive ones — don't feed them a transcript of Sonnet's exploration |
| Dropping model **down** for the next task (Opus → Sonnet/Haiku) | **same session** ok | Cheap turns can afford the carried context |

Default when unsure: **fresh session, with an explicit pointer** — name the file(s) and doc the new session should read first. **Never start fresh without one.** If writing that pointer surfaces something not recorded anywhere, that's a Documentation Integrity Protocol miss — stay put and finish the docs first.

### 🤝 Handoff Prompt (mandatory whenever the session call is `fresh session`)

**Rule:** Any response closing with **fresh session** MUST end with a ready-to-paste handoff prompt in a fenced code block — no exceptions, no "let me know if you want one". A `fresh session` call without a handoff block is an incomplete response.

**The handoff is a pointer, not a summary** — where to read, not what was read. Past ~15 lines it is smuggling facts that belong in a doc; put them in the impl-notes and link there instead.

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

**Read first** and **Constraints / gotchas** are the two fields that pay for the handoff — the first
(file *plus* Grep term, 3 files ceiling) stops the new session full-reading `index.html` or
`code-map.md`; the second stops it repeating the last one's dead end. Keep
**Task** to one action, and **State** to what a fresh session cannot infer (SW version, which
harnesses pass, what shipped).

**Do NOT include:** what was tried and rejected (impl-notes), code snippets (it reads the real file), or anything already in CLAUDE.md / the three rule files — those load automatically.

---

## 🎯 Skills

### 🎯 Skill: PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.
See `@logic-engine.md` for the full checklist and SW asset list.

### 🎯 Skill: Consistent Word Expansion
**Trigger:** Adding or editing words in `data/words.json`, or a pack manifest's inline `words`.
**Action:** Read `docs/rules/word-expansion.md` (on-demand) and follow it. Note the `nono_list`
**Dual-Use Contract** — each slot means something different in Like I'm Five vs Natural Selection,
so a careless edit silently degrades one of the two games.

### 🎯 Skill: Add New Expansion Pack
**Trigger:** Adding a new secret mode expansion (new theme/word bank).
**Action:** Follow `docs/expansion-guide.md` — 4-step checklist. Do NOT patch plugin files (the proxy architecture handles everything).

### 🎯 Skill: Implementation Notes
**Trigger:** Any non-trivial bug fix, design decision, or architectural lesson — in a new game build, maintenance, or an audit of any game **or of shared/engine code**.
**Action:**
1. **Pick the right file first — by where the root cause lives, not where it was found.** A single game's own code → `docs/implementation-notes/[abbr]-implementation-notes.md` (create if missing; four sections: Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps). `engine.js`, `engine-multiplayer.js`, `secret-mode.js`, `js/lib/*`, `sw.js`, or a cross-cutting rule → `shared-implementation-notes.md`, **even when found while testing one game**. A fix spanning both gets the writeup in exactly one file (whichever owns the bug) and at most a one-line pointer in the other.
2. Entry shape: **What happened → Root cause → Lesson**.
3. At the end of an audit/testing session, review Template Gaps and flag anything that should fold into `logic-engine.md`, `ui-style.md`, or the tech template.
**When:** in the **same response** that completes the fix — never a follow-on session. If the fix is done and this hasn't run, the session isn't complete.
**Cross-reference:** before a new game's tech spec, read Template Gaps in *all* impl-notes files (including shared) and resolve what applies.

### 🎯 Skill: Phase Gate — Studio Audit
**Trigger:** After completing a game or entering a new phase; before writing a phase snapshot; before a new game's first line of JS.
**Action:** Read `docs/rules/phase-audit.md` (on-demand) and run the protocol that applies —
**A** Phase Gate (after a completed game/phase, and before its snapshot), **B** Skeleton-First
(before a new game's first line of code), **C** Studio Sweep (before a new game's Phase 1 brief;
must pass before B Step 1). Each gates the step named beside it.

---

## 🎯 Current Focus

**This section carries *state*, not history.** It holds exactly four things: the current SW entry
(**≤6 lines, one version only**), where the suite stands, the Arcade side project, and pointers.
On every bump the outgoing SW entry moves **verbatim** to `docs/sw-changelog.md` — there is no
"keep the last three". **A second `**SW v…**` paragraph appearing here means that move didn't
happen: do it before anything else.**

**SW v214 — Lobby keycap treatment + Release/Colour sort toggle (30 Aug 2026).** `#screen-lobby`'s
18 game buttons now carry a colour-agnostic `.key-cap` class — micro-gradient + layered shadow, a
composited `transform`-only press that sinks 3px like a real key — needing no per-game CSS since the
gradient/shadow sit over whatever background each button already sets. A new `#btn-lobby-sort` (✨)
toggles the list between **Release** order (default, the shipped DOM order) and **Colour** order
(`LOBBY_COLOUR_ORDER`, a hand-picked hue walk from LI5 pink), via `style.order` — never a re-render,
since each button is bound by its own plugin at parse time and a rebuild would drop all 18
listeners. Sort mode is memory-only. Verified in headless Chromium: all 18 render the treatment,
subtitle/sort row don't overlap, sort reorders and restores exactly, press genuinely sinks. This is
Tier-1 polish on the **original** lobby only — the separately-discussed 4-mode redesign
(Original/Shelves/TV/Premium) is parked pending art direction. Detail: `shared-implementation-notes`.

**Previous versions: `docs/sw-changelog.md`** — continuous, v213 back to v167.

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
identity doc, no Sylly Mode, no verification harness, and explicitly **not**
`docs/rules/new-game-checklist.md`. They use the terminal's CRT green-on-black language, not the
Stack or the brand palette. First cabinet: **Asherplane** (`js/arcade/asherplane.js`), a top-down
shmup. Adding cabinet #2 = one `SM_ARCADE` entry + one file. Spec + plan:
`docs/superpowers/{specs,plans}/2026-08-03-arcade-asherplane*.md`.

**Open threads — all deliberately deferred, none blocking: `docs/deferred-work.md`.** Older-games
retest backlog, four pending suite-wide sweeps (BUG-06 Firebase-erasure re-sweep by payload shape,
DD-13 settings value line, DD-31 button parity, a How-to gallery for PASS), NT's open Minors and
`mpConfirmRoster` late-join race (BUG-07), PKO's unplayed **Stragglers** mode, and CJAR's **DD-06**
balance flag. The identity-doc pass's 22 findings are still listed there too — **its two recurring MP
bugs are now CLOSED (SW v210)**; what remains from that pass is per-game polish plus one design call
(NAT's Pass-the-Phone floor). Read it when picking up maintenance work, or at a phase gate.

### 🧪 Verification harnesses

Re-run a game's full set after touching its appliers, deck/data, packets or render seam.

| Game | Command | Checks |
|------|---------|--------|
| CJAR | `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js` | 76 · 102 · 47 |
| CJAR | `node tools/verify-cjar-loopback.js` — host↔client over a Firebase-shaped wire | 177 |
| CJAR | `node tools/simulate-cjar-dd.js` — balance instrument; asserts nothing, always exits 0 | — |
| PKO | `node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js` | 68 · 147 · 148 |
| DYB | `node tools/verify-dyb-dice.js` — after any `js/lib/art.js` / `dybDieHTML` / `.dyb-die-*` change | 90+ |
| SHP | `node tools/verify-shp-loop.js` — random matches, all player counts/modes/settings; `SHP_SEED=` for reproducibility | 60 matches |
| SHP | `node tools/verify-shp-loopback.js` — host↔client over a Firebase-shaped wire; accepts `SHP_SRC=` | 6 scenarios |
| NT | `node tools/verify-nt-loopback.js` — host↔**2 clients** over a Firebase-shaped wire, Standard + DNP + Debug Mode (incl. rectangular grids that survive Randomise Topology, two-unit ports, two-unit ports + the corner cycle, the attempt log + PTP log switcher); accepts `NT_SRC=` and `NT_SEED=` | 417 |
| NT | `node tools/nt-path-probe.js <board.json> --target <ms>` — movement-model instrument: path length, turn angle, latency, and the fit against a maze.game score. Asserts nothing, exits 0 | — |
| NT | `node tools/nt-maze-transcribe.js <shot.png> --auto` — reads a maze.game screenshot into a probe board.json (zero-dependency PNG decode; ice blocks and corner mouths too) | — |
| NT | `node tools/nt-slow-fit.js` — slow-model fitter: substitutes the `NT_HONEYPOT_*` constants into nt.js's OWN timeline, so a fit can never drift from the shipped model. `--sweep`, `--grid`, `--contact`. Asserts nothing, exits 0 | — |
| JEC | `node tools/verify-jec-loop.js` — the four tiers, the Golden-only Signature double, Crutch resolution + the never-in-pool invariant, the Instructions deck, the Fusion name vote | 77 |
| JEC | `node tools/verify-jec-loopback.js` — host↔client over a Firebase-shaped wire with a real mock DOM; accepts `JEC_SRC=` | 164 |
| **All 18 / MP** | `node tools/verify-mp-configs.js` — `MP_GAME_CONFIGS` entry schema, player-count bounds (sanity, **purity** — a bound may read nothing but `window.mpLobbyStyle`, and agreement with each game's own PTP count pills), the balanced-teams invariant, and the Mid-Game Quit Contract. Runs no game logic; accepts `MP_SRC=`. **Re-run after touching `MP_GAME_CONFIGS`, any quit-confirm handler, or the roster screen** | 18 games |
| Identity docs | `node tools/verify-identity-docs.js` — every `copy` block in `docs/game-identities/` against the shipped `index.html` + plugin file | per-doc |
| Identity docs | `node tools/verify-identity-docs.js --self-test` — proves the checker still detects planted drift | 1 |
| FLW | `node tools/verify-flw-loopback.js` — host↔client over a Firebase-shaped wire, incl. the private-channel hand packets | 84 |

**Reach for a loopback on anything MP- or render-shaped.** Every harness *except* the four
loopbacks (`cjar`/`shp`/`flw`/`nt`/`jec`) runs `'single'` mode with `getElementById: () => null`, which
is what lets one process drive all N seats — and exactly what blinds it to both the packet layer
and every line of render code. CJAR's **BUG-06** survived 222 green checks in that gap; NT's
**BUG-15/16** survived a clean host-side playtest. How to build one, and the wire/mock-DOM
requirements: `logic-engine.md` § MDLM Patterns. The two omissions that cost NT a false green
(seeded RNG run across several `*_SEED=` values; a time window on the timer pump):
`nt-implementation-notes.md` D21.

**Layout is a fourth tier none of them reach** — a mock element has no box, so no harness sees
spacing, alignment or overflow. For that invoke the **`visual-check`** skill (real headless
Chromium, `getBoundingClientRect`, one browser context per seat). **None of it substitutes for a
real multi-device session:** no clock skew, no Firebase ordering, no dropped packets, and no
judgement about how anything *feels*.

**Standing pointers.** Phase snapshots are written **in-repo** to `docs/phase[N]-snapshot.md`
(current template: `docs/phase37-snapshot.md`). Snapshots up to and including phase36, the
fable-audit campaign, and phase22 live in the owner's external archive — ask if you need one.
Every game's confirmed spec is `docs/new-game-tech-[name].md`; its bug log and design decisions are
`docs/implementation-notes/[abbr]-implementation-notes.md`. Non-game-specific bug logs and design
decisions (engine.js, engine-multiplayer.js, secret-mode.js, js/lib/*) live in
`docs/implementation-notes/shared-implementation-notes.md` instead. Those, plus `docs/code-map.md`
and `docs/decision-log.md`, are where the detail this section used to carry now lives.
