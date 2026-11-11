# Project: Little Sylly Games (The "Word" Series)
# Brand Inspiration: Sylvia (Nickname: Little Sylly)

## 📂 Rule Files

**Always loaded (auto-imported via `@` — keep this list lean; every file here costs baseline tokens in EVERY session):**
- `@ui-style.md` — overlays, buttons, speaker/exit protocol, settings layout, Sylly Tone (apply-on-every-edit pattern rules)
- `@logic-engine.md` — engine/plugin split, screen routing, audio catalogue, PWA, new-game checklist (apply-on-every-edit pattern rules)
- `@definitions.md` — naming conventions, comment style, data schema, project-wide terms

**On-demand — READ with the Read tool only when the trigger applies (NOT auto-loaded; do not read these during routine bug/polish work):**
> ⚠️ These live in `docs/rules/`, NOT `.claude/rules/`, **on purpose** — that folder is auto-loaded wholesale. Never move them back.
- `docs/game-identities/[abbr].md` — the game's **identity doc**: pitch, premise, how to play, theme + flavour, terminology, settings, the player's journey (beat map + every UI string), Sylly Mode, art, table shape. **15–25 KB — read it WHOLE**, it is written to be read end to end. **Read when:** any non-technical work on one game — review, copy, an art brief, a game review, or just learning what the game is. Each section is tagged **free** / **paired** / **derived** — see the change contract in `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5 before editing one. Copy blocks are machine-verified by `tools/verify-identity-docs.js`.
- `docs/rules/per-game-classes.md` — the per-game class strings: brand colour, range/toggle/pill classes, Play CTA + how-to emoji + Sylly Mode name, `accentBtnClass`, step label, Settings tint. **Read when:** building or editing any game's UI and you need its exact class strings.
- **Split out of the always-loaded rule files (4 Nov 2026)** — each leaves a stub with its headline rule in `ui-style.md` / `logic-engine.md`; **read the file only when the trigger applies** (every file ≤11 KB, read whole):
  - `docs/rules/ui-motion.md` — Motion Standard (timing, easing, what may animate, RAF reduced-motion). **Read when:** writing/reviewing any transition, keyframe or RAF animation.
  - `docs/rules/ui-howto-extras.md` — Art viewer (Pattern 2a), How-to tab bar, Tap-Hold, Practice tab. **Read when:** editing a How-to gallery/tab or Practice.
  - `docs/rules/ui-menu-extras.md` — Menu Title Treatment, Gel Button Treatment. **Read when:** editing a game menu's title or its four buttons.
  - `docs/rules/ui-lobby-layouts.md` — the four lobby layouts, Arcade room, jukebox, Workshop. **Read when:** touching any lobby layout.
  - `docs/rules/ui-screen-patterns.md` — Round/Night intro, Team Setup screens, legacy sticky-footer + `h-screen` whitelist, Vocab Lock. **Read when:** building/editing those screens.
  - `docs/rules/audio.md` — audio function catalogue + background music. **Read when:** adding/choosing a sound or touching music.
  - `docs/rules/mp-bots-reconnect.md` — Bots/Solo and Client Reconnect. **Read when:** adopting bots or a `reconnect` hook, or touching seats/presence/rejoin.
- `docs/art-authoring-guide.md` — the standalone (no-Claude-Code) artwork guide: skin pack vs core art, exact dimensions/aspect per game, the inventory for all seven render seams, `tools/make-skin-pack.ps1`, the offline install check. **Read when:** authoring/converting art, or answering "what art does game X need". Written for the owner to use alone — point them at it rather than re-deriving dimensions from CSS.
- `docs/rules/word-expansion.md` — `data/words.json` content rules: difficulty tiers, Great Minds categories, the animals Broad Shield protocol, the `nono_list` Dual-Use Contract. **Read when:** editing words in `data/words.json` or a pack manifest's inline `words`.
- `docs/rules/new-game-process.md` — three-stage protocol (brief → tech spec → implementation). **Read when:** starting a new game.
- `docs/rules/new-game-brief-template.md` / `new-game-technical-template.md` — the Phase 1 and Phase 2 templates. The brief opens with **§0 The World & the Intro** (10 Nov 2026); a brief written before then adds §0 and goes through Stage 1b. **Read when:** new-game Stage 1 / Stage 2.
- `docs/rules/new-game-checklist.md` — the ~40-item build checklist (engine registration, settings/overlay standards, MP handler audit, render seam, harness, closure). **Read when:** implementing a new game — before its first line of code. Binding.
- `docs/rules/harnesses.md` — every verification harness: command, what it checks, check count, plus loopback-vs-`visual-check` guidance. **Read when:** running, extending or adding a harness.
- `docs/rules/phase-audit.md` — Protocols A/B/C (drift check, skeleton-first, studio sweep). **Read when:** a phase boundary, or before a new game's first line of code.
- `docs/sw-changelog.md` — every SW release note, continuous v263→v167. **Read when:** you need the history behind a past version.
- `docs/deferred-work.md` — the parked-work list, **open items only**: older-games retest backlog, pending suite-wide sweeps, smaller flagged items. **Read when:** picking up maintenance work, or at a phase gate. Resolved entries move to `docs/deferred-work-log.md` — history, grep it; never read it as a to-do list.
- `docs/rules/ui-revamp.md` — **the UI revamp standard** (≤12 KB, read whole): the R1–R16 pass with the **R2b Directions** step, frozen / loosened / binding rules, how a game adopts **the Intro** (`intro` config, `<template id="intro-[abbr]">`, scenes, Line-up, packets). **Read when:** any game's revamp pass, or touching `js/engine-intro.js` / `screen-game-intro` / `mpEnterGame`.
- `docs/ui-revamp-lessons.md` — **what bit us during revamp passes** (team-game Start rules, hunting old styling, terminology, overlays, layout measuring). Short entries that grow when a lesson repeats. **Read when:** starting a game's revamp pass (R1) and at its close (R13) — add what you learned.
- `docs/ui-revamp-rollout.md` — the **UI revamp tracker**: status per game, one card each, programme line items, the departures log. **Read when:** starting or resuming a revamp pass, or at a batch boundary.
- `docs/practice-rollout.md` — the **Practice tab** reference (§§ 1, 3, 5 + one card per game); its tracker moved into `docs/ui-revamp-rollout.md` — Practice is R10 of a revamp pass. **Read when:** a pass reaches R10.
- `docs/cost-envelope.md` — **what the project may spend, and on what.** Three tiers (already-paid-for / costs-something-propose-the-number / changes-what-this-is), the split between permanent *craft* constraints and reviewable *business* ones, the measured install breakdown, the precache-vs-runtime-cache lever, and the owner's recorded strategic direction. **Read when:** any change adds an asset, a dependency, a font, or artwork — or when § Anti-Patterns below looks like it's saying "no" to something worth doing. It is the escape procedure for that list, not a replacement.

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
| 4 | Just Enough Cooks | `jec` | `jec.js` | slate-600 (steel) / `pill-active-slate` |
| 5 | You Get It? | `ygi` | `ygi.js` | amber-500 (light-bulb gold) / `pill-active-amber` |
| 6 | Late to the Party | `lttp` | `lttp.js` | red-500 / `pill-active-red` |
| 7 | Natural Selection | `nat` | `nat.js` | lime-600 / `pill-active-lime` |
| 8 | Deep-Sea Deploy | `dsd` | `dsd.js` | cyan-700 / `pill-active-cyan` |
| 9 | Group Therapy | `gth` | `gth.js` | sage `#B1BCA0` / `pill-active-sage` |
| 10 | The Bluff *(internal `dyb`)* | `dyb` | `dyb.js` | warm rock-grey `#6B5744` / `pill-active-dyb` |
| 11 | Bailed | `bld` | `bld.js` | dark red `#991b1b` (red-800) / `pill-active-bld` |
| 12 | Pass | `pass` | `pass.js` | zinc-900 / `pill-active-zinc` |
| 13 | Net-Trace | `nt` | `nt.js` | emerald-600 / `pill-active-emerald` |
| 14 | Fruit Salad | `frt` | `frt.js` | electric lemon `#FFE500` (white button ink) / `pill-active-frt` |
| 15 | Counting Sheep | `shp` | `shp.js` | midnight `#3A3D52` (custom) / `pill-active-shp` |
| 16 | Flawless | `flw` | `flw.js` | rose-pink `#E879A8` / `pill-active-flw` |
| 17 | Pecking Order | `pko` | `pko.js` | rust-orange `#9A3412` / `pill-active-pko` |
| 18 | Cookie Jar | `cjar` | `cjar.js` | chocolate-brown `#5C3A21` / `pill-active-cjar` |
| 19 | Cold Shoulder | `cld` | `cld.js` | glacier blue `#8ECAE6` (white ink) / `pill-active-cld` |
| 20 | Honeycomb Hills | `comb` | `comb.js` | honey gold `#F0A500` (white button ink) / `pill-active-comb` |
| 21 | E.T.A. | `eta` | `eta.js` (+ `eta-scene.js`, `css/eta.css`) | hi-vis orange `#EA580C` (white ink; text rung `#C2410C`) / `pill-active-eta` |

For per-game classes (range / toggle / pill / CTA / how-to / brand class strings) read `docs/rules/per-game-classes.md` (on-demand) — the single source for those; don't duplicate them here.

For where each game's screens/overlays live in `index.html`, see the **Per-Game Offset Map** at the top of `docs/code-map.md`. **`code-map.md` is ~325 KB (~80k tokens) — never read it whole.** Same rule as any large file: Grep for the game or element ID, then offset-Read that slice. One careless full read costs more than the entire always-loaded rule set.

---

## 🧭 Task Playbooks & Decision Log

**Front door for any task — SIZE IT FIRST (§ Task Triage Gate below), then open the matching workflow and record the outcome in the listed doc.** All of these are on-demand reads (not auto-loaded).

| Starting a… | Open this workflow | Record the outcome in |
|-------------|--------------------|------------------------|
| **New game** | `docs/rules/new-game-process.md` (3-stage: brief → tech spec → implementation; `/brainstorm` drives Stage 2) | tech spec `docs/new-game-tech-[name].md` (archived at the gate — `phase-audit.md` Protocol A § 5) + phase snapshot + `docs/decision-log.md` |
| **Audit / phase gate** | `docs/rules/phase-audit.md` (Protocols A/B/C) | phase snapshot + `docs/decision-log.md` |
| **Bug / update / polish** | `docs/templates/task-bug-polish.md` (fill the intake form first) | `docs/implementation-notes/[abbr]-implementation-notes.md` — or `shared-implementation-notes.md` if the root cause is in engine/secret-mode/art.js rather than a specific game (+ `docs/decision-log.md` if it became architectural) |
| **UI / layout design work** | Invoke `/impeccable <command>` (`critique`, `audit`, `polish`, `layout`, `shape`…) **on request only** — the design hook is deliberately off, so it never runs on ordinary edits. It reads `PRODUCT.md` + `DESIGN.md` (repo root); `.claude/rules/ui-style.md` stays the guidebook and either may be updated when a better design earns it — propose the rule change, don't silently depart. Size it with the Triage Gate first; a two-line CSS tweak doesn't need the skill. | the game's impl-notes as above; if the design system itself moved, update `DESIGN.md` (`/impeccable document`) and the matching `ui-style.md` rule |

**`docs/decision-log.md`** — the running index of big architectural / strategic / process decisions (newest on top). Read it to recall *why* something was done; append a one-line entry whenever a change is architectural, strategic, or process-level (wired into the Documentation Integrity Protocol below).

### 🚦 Task Triage Gate — size the task BEFORE picking a workflow

**Classify the task in one line before doing anything else. State the tier out loud, then work at that tier.**

| Tier | What it is | Process |
|------|-----------|---------|
| **0 — Trivial** | ≤2 files · no logic, packet, state or rules change · uses an existing pattern verbatim. Spacing, a label string, a colour, a class swap, a copy fix, a stale doc line. | **Edit directly.** No spec. No subagents. No new harness assertions. One commit. Impl-notes only if a genuine lesson emerged — "changed a gap" is not a lesson. |
| **1 — Bounded** | One game · existing pattern · logic touched but no cross-cutting rule (MP sync, render seam, engine contract). A normal bug fix or polish item. | `docs/templates/task-bug-polish.md` intake, **inline in this session**. No spec/plan split — the intake form *is* the plan. Harness assertions only if the fix touched something a harness already covers. |
| **2 — Architectural** | New game · new engine/MP pattern · a change touching 3+ files under cross-cutting rules · a phase gate. | **Brainstorm → spec → implement → review.** Invoke the project skill `/brainstorm`; the spec names its verification up front and is the only hard gate. **No separate plan document** (30 Sep 2026 — see `docs/decision-log.md`); implement inline from the spec. A big build gets its stage breakdown *inside the spec*. |

**Batching rule.** A round of several Tier-0/1 items (an owner playtest list, a polish sweep) is **one** unit of work: one implementation pass and **one** documentation-closure pass at the end — never one full cycle per item.

**Subagent rule.** Default to working **inline**. Every dispatched subagent starts cold and re-pays this project's **baseline** (CLAUDE.md + the three always-loaded rule files) before doing any work — nine sequential subagents is ~300k tokens of pure baseline, larger than the round's real content and invisible while it happens. Dispatch only when tasks are genuinely **parallel and independent**, or when a search would otherwise flood this context (the Explore agent, per the model picker's "large exploratory search" row).

**Harness rule.** Verification harnesses cover **rules, packets, state, decks and appliers** — not presentation. A cosmetic change does not earn new assertions. (Asserting label strings and pixel slots produced `560c7c2`, a commit fixing the same round's just-written podium assertions.)

**Escalate a tier when you find you were wrong** — a "trivial" change that turns out to touch a packet is Tier 1, say so and switch. Escalating on evidence is correct; escalating pre-emptively "just in case" is the behaviour this gate exists to stop.

---

## 📁 Load Order
**Load order:** `music.js` → `engine.js` → `art.js` → `three.min.js` → `controller-body.js` → `controller-sticker-surface.js` → `physics.js` → `engine-multiplayer.js` → `engine-intro.js` → `canvas-draw.js` → `li5-scene.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `bld.js` → `gth.js` → `dyb-dice.js` → `dyb.js` → `cards.js` → `pass.js` → `nt.js` → `frt.js` → `shp.js` → `flw.js` → `pko.js` → `cjar.js` → `cld-art.js` → `cld.js` → `comb.js` → `eta-scene.js` → `eta.js` → `hsg-rules.js` → `hsg-scene.js` → `hsg.js` → `controller.js` → `lounge-lib.js` → `lounge-room.js` → `lounge-props.js` → `lounge-scene.js` → `lounge-sfx.js` → `lobby-games.js` → `lobby.js` → `tv.js` → `board.js` → `achievements.js` → `stickerbook.js` → `jukebox.js` → `arcade.js` → `lobby-router.js` → `lobby-doors.js` → `lobby-host.js` → `secret-mode.js` → `app.js`
(`tailwind-play.js` loads in `<head>` before everything else. `js/lib/music.js` loads *before* `engine.js` — the engine boot block calls `Music.init()` at parse time. `app.js`'s last line is `lobbyBoot()` — every lobby symbol exists by then.)
All symbols are global (no ES modules). Forward references work at runtime.

---

## 🛠 Tech Stack & Zero-Cost Constraints
- **Languages:** Vanilla JS (ES6+), HTML5, CSS3
- **Styling:** Tailwind CSS — local file `/js/lib/tailwind-play.js` (no CDN, works offline)
- **Hosting:** Cloudflare Pages ($0), `little-sylly-games-v1.pages.dev`, deployed from `main` with no build step — no backend. GitHub Pages is a second copy of the same repo (decide separately whether to keep it); never add `wrangler.jsonc`, the Pages project ignores `.git` on its own (a Workers project on this repo failed on the 115 MiB pack file, 20 Oct 2026)
- **Audio:** Web Audio API (synthesised tones) — **effects are never files**. The one exception is background *music* (`data/music/`, SW v212), runtime-cached like packs and never precached — see `logic-engine.md` § Background music
- **Capabilities:** PWA (offline via Service Worker), Screen Wake Lock API
- **Diagrams:** Mermaid (`stateDiagram-v2`) — used in tech specs for state flows; rendered natively by GitHub, no install required
- **Font:** Fredoka, self-hosted from `fonts/` (variable woff2, `@font-face` in `css/styles.css`, precached). No external font request — the app has **zero** runtime third-party dependencies.

---

## 🚫 Anti-Patterns (Do Not)
- Do NOT add a build step **to the runtime** — no `npm`/`webpack`/bundler, no transpile, nothing
  between the repo and what the host serves. **Sanctioned exception (15 Sep 2026):**
  `tools/build-index.js`, a dev-only assembler with zero dependencies that concatenates
  `src/screens/*.html` into the committed `index.html`. The output is committed, so deleting the
  script still leaves a shippable app. Rationale and the process that approved it:
  `docs/cost-envelope.md` § 7 and `docs/superpowers/specs/2026-09-15-index-decomposition-design.md`.
  (`tools/*.js` verification harnesses remain dev tooling, not a build.)
- Do NOT add external JS libraries. The only **three** are vendored: local Tailwind
  (`js/lib/tailwind-play.js`), the Firebase SDK (precached, lazy-loaded at runtime — see
  `logic-engine.md` § Firebase Lazy-Load), and Three.js r128 (`js/lib/three.min.js`, precached,
  never fetched from a CDN — see `logic-engine.md` § Shared Library Modules).
- Do NOT create multiple HTML pages — single-page app
- Do NOT use `localStorage` for game state mid-round (memory only; settings may persist)
  - **Exception:** `sylly_nickname` (multiplayer nickname), `isMuted`/`masterVolume`,
    `sylly_controller` (the saved 3D controller design), and `sylly_rejoin` (a session *pointer*
    `{ code, game, ts }` for the reconnect prompt — never game state) are permitted localStorage uses
- Do NOT over-engineer: no classes/inheritance unless genuinely needed
- Do NOT assume context from previous sessions — reference files explicitly
- Do NOT add game-specific audio controls — audio is global via `engine.js`

---

## 🌍 North Star — every game is a world (9 Nov 2026)
Distinctness comes from **world-building**, not mechanics. Several of our games use familiar
mechanics; a rich world with matching visuals is what makes each one *ours* and unlike the others on
the shelf. So: **world first → three visual directions (Opus) → owner picks → the world may revise
brand colour, terminology and the brief → only then build** (Sonnet builds from board + plan). Applies
to new games (`new-game-process.md` § Stage 1b) and every revamp pass (UI revamp spec § 17). One game
per session. A screen that could belong to any game is not done.

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
5. `docs/implementation-notes/[abbr]-…md` (or `shared-…md` — see the `sylly-implementation-notes` skill for which) — design decisions, bugs resolved, lessons
6. `docs/deferred-work.md` — grep it for what you just touched (file, function, screen ID, game
   abbreviation). If an entry describes something this fix already resolves, mark it
   `RESOLVED [date]` with a one-line note **in this same response**, then move it to
   `docs/deferred-work-log.md` under the same heading — never delete outright, the
   discovery record is the valuable half. This is cheap only *now*, while you already have the exact
   terms to search for; re-deriving it later from a cold read is how the file accumulates stale
   entries (a 26 Sep 2026 review found ~10). Nothing to do here if the fix wasn't already logged.
7. `docs/decision-log.md` — one entry (newest on top, ~4 lines, pointer not deep-doc) **if** the work included an architectural, strategic or process-level decision. Skip only for routine bug/polish.

**Rule:** No phase snapshot until all seven are verified current. The snapshot is the final deliverable, not the starting point for cleanup.

**Enforcement:** at the start of a new phase, read `docs/code-map.md` and each affected game's identity doc (`docs/game-identities/[abbr].md`) and cross-reference against the real `index.html` headers and JS. Flag and resolve any discrepancy before implementation begins. `node tools/verify-identity-docs.js` does the UI-copy half of this mechanically.

---

## 🧼 Token Hygiene & Context Management
- **`index.html` is generated — edit `src/screens/[abbr].html` instead (15 Sep 2026).** `index.html` itself is assembled by `tools/build-index.js` and carries a "DO NOT EDIT BY HAND" banner; a hand edit is silently overwritten on the next build. Per-game markup now lives in `src/screens/[abbr].html` (~350–750 lines each) — small enough to read whole, no Grep-then-offset needed. `index.html` itself should essentially never be read; if you must (e.g. auditing the assembler's own output), Grep first for the identifier and `Read` with `offset`/`limit` as before. After editing a partial, run `node tools/build-index.js` (or let the pre-commit hook do it) and `node tools/verify-build-fresh.js`. Detail: `docs/superpowers/specs/2026-09-15-index-decomposition-design.md`.
- **Same rule for any file over ~40 KB** (e.g. `js/games/nt.js`, `engine-multiplayer.js`, `secret-signals.js`): locate the relevant section with Grep, then read only that slice. Reading a large file in full to orient yourself is the single most common cause of the mid-task auto-compact spiral.
- **Lean Context:** Avoid repetitive explanations. Assume technical competence.
- **Australian English:** Use Australian spelling (e.g., "colour", "synthesised"). Metric units only — the one exception is E.T.A.'s per-phone KM / MI display chip (SW v276); content is still written in metric.
- **Session Cleanup:** If a sub-task is complete, suggest running /compact to clear history.
- **End every response with "what's next":** 1–2 sentences naming what was just completed AND what comes next (name upcoming phases for multi-phase work). Applies even to short responses — the owner may return after a gap with no context. The closing line must carry **all three** explicitly, never implied: the next task, the **model + effort** it warrants, and the **session call** — `same session` / `/compact then continue` / `fresh session`.
  - **Defaults:** model **Sonnet, medium** — Opus/Fable + high only for architectural work, 3+ files under cross-cutting rules (MP sync, render seams) or a phase-gate audit. Session call **fresh session with an explicit pointer** when unsure (never start fresh without one); a direct follow-on or the same game's files already loaded stays `same session`.
  - **`fresh session` ⇒ a ready-to-paste handoff block is mandatory** (a fenced pointer, not a summary, ≤15 lines: Task · Read first · State · Constraints · Model + effort). The full picker tables and the handoff template live in the **`sylly-whats-next` skill** — invoke it when choosing a non-default model/session call or writing a handoff.

---

## 🎯 Triggers (on-demand procedures)

One line each — open the doc when the trigger applies; none of these is loaded by default.

| Trigger | Do this |
|---------|---------|
| New feature that fetches data, loads assets or changes app state | **PWA Guardian** — `logic-engine.md` § PWA Guardian (checklist + SW asset list) |
| Adding/editing words in `data/words.json` or a pack manifest's inline `words` | **Consistent Word Expansion** — read `docs/rules/word-expansion.md`. The `nono_list` **Dual-Use Contract** means each slot does something different in Like I'm Five vs Natural Selection; a careless edit silently degrades one of them |
| New Secret Mode expansion (theme/word bank) | **Add New Expansion Pack** — `docs/expansion-guide.md`, 4 steps. Do NOT patch plugin files (the proxy architecture handles everything) |
| Any non-trivial bug fix, design decision or architectural lesson (any game **or** shared/engine code) | **Implementation notes** — invoke the **`sylly-implementation-notes` skill**; runs in the **same response** that finishes the fix (the file is chosen by where the root cause lives) |
| After a completed game/phase, before a phase snapshot, before a new game's first line of JS | **Phase Gate — Studio Audit** — read `docs/rules/phase-audit.md`, run Protocol **A** (phase gate), **B** (skeleton-first) or **C** (studio sweep, before a new game's Phase 1 brief; must pass before B Step 1) |
| The owner asks to journal / reflect on the project | **`sylly-journey` skill** — writes only to git-ignored `wip/journey/` |

---

## 🎯 Current Focus

**This section carries *state*, not history.** It holds exactly four things: the current SW entry
(**≤6 lines, one version only**), where the suite stands, the Arcade side project, and pointers.
On every bump the outgoing SW entry moves **verbatim** to `docs/sw-changelog.md` — there is no
"keep the last three". **A second `**SW v…**` paragraph appearing here means that move didn't
happen: do it before anything else.**

**SW v286 — Hide and Shogun, S11: Practice (12 Nov 2026).** The How to Play tab bar is now **The Rules | Practice | The Household**. Practice is nine lessons on small fixed boards (open a door · the ladder · Archer · Ninja · Monk · Samurai · Guard · foxes · Last Lantern), each a real engine state (`HsgRules.applyAct`) drawn through `hsgRenderTile` and tapped through `hsgTapDecide` / `hsgMarksFor`; beats are gated on the tap, with a coach line, a step count and a soft ring. `hsgLegalFor` gains one optional hook (`pub.pracFilter`) that keeps a lesson on its board and goal. Own timer bag (`hsgPracTimers`, cleared on tab-away, close and `hsgTeardown`); Sam’s Last Lantern reply is instant under reduced motion (JS check). No packets. New `tools/verify-hsg-practice.js` (64; four mutants go red). `MP_PROTOCOL_VERSION` stays v265.

**Previous versions: `docs/sw-changelog.md`** — continuous, v285 back to v167.

**Where the suite stands.** **21 games**, 20 gold-master plus **E.T.A. (`eta`, built SW v272, playtest rounds SW v273–v274, content rebuilt SW v275, phase 44 gate SW v277)**; newest before it are Honeycomb Hills (`comb`, MDLM-only, no Sylly Mode), Cold Shoulder (`cld`, first physics game) and Cookie Jar (`cjar`). Every game has an identity doc (`docs/game-identities/`). The Cartridge System (word packs + skin packs, `docs/cartridge-system-plan.md`) is complete; core art has rolled out to `pko`, `flw`, `frt`, `shp`, `comb` — PASS runs CSS defaults, DYB and CLD art are procedural and never need a pack (`docs/expansion-guide.md` § Core art packs). **Phase gates 37–39 and 41 are closed; phase 40 (Cold Shoulder) is open** — its snapshot (archived) names what is left (a live multi-device session and the offline install check). **Phase 44 (E.T.A.) passed Protocol A and is open on R15 only** — `docs/phase44-snapshot.md`. **UI revamp** (spec `docs/superpowers/specs/2026-11-08-ui-revamp-design.md`): Stage 0 foundations built (SW v264 — the Intro, `mpEnterGame`, tooling); **the LI5 pilot is under way** — S0 (scene `beat` hook) and S1 (LI5 MDLM + TLM on one host path, `verify-li5-loopback.js`) built 9 Nov, S2 (world kit + Intro scene) shipped as SW v265, S3 (wipe-and-write round intro) as SW v266, S4 (describer board) as SW v267, **S5 (tattle + guess) as SW v268, S6 (Report Card, gameover, history, play-again) as SW v269**; the LI5 pilot is built — then GM — tracker `docs/ui-revamp-rollout.md`.

**Side project — the Arcade.** A room of its own (`screen-arcade`, `js/lobby/arcade.js`, SW v254) — no longer a Secret Mode category. **Cabinets are NOT Sylly Games and NOT packs** — no MP config, identity doc, Sylly Mode or harness, and not `docs/rules/new-game-checklist.md`; their screens wear the Arcade room's chrome (SW v259), the canvas art is each cabinet's own. **Nine cabinets shipped (seven SW v249, COLD SHOT + TRACE ROUTE SW v255):** ASHERPLANE, DEEP-SEA SWEEP, OTHER SIDE, CHOP SALAD, COOKIE JAR, STACKING ORDER, BEYOND THE BLUFF, COLD SHOT, TRACE ROUTE — all built in a standalone bench, all awaiting a phone play-test. The room itself is the **Arcade Floor** (SW v257 — a row of cabinets in the controller's colours); the Lounge has its own cabinet on the bookshelf (spec Stage 3, SW v258), and since SW v259 the Floor's cabinets *are* that model, each screen showing its game's live attract scene (spec § 3.2) — since SW v260 all in one live 3D scene, on a ring (spec § 3.3). A cabinet's optional `preview` / `best` fields feed its screen. A new cabinet = one `ARC_CABINETS` entry (`start` **and** `stop`, plus `blurb`/`accent`) + one file; **`ARC_CABINETS` is the registration, so anything acting on "a cabinet" iterates it** — the room's list, `resetToLobby()`, the Konami guard. Inventory: `docs/code-map.md` § Arcade Cabinets. Harness: `node tools/verify-arcade.js` (+ `mutate-arcade.js`). Bench + workshop notes: `js/arcade/_archive/`. **Building a cabinet offline** (no repo attached): paste `js/arcade/arcade-cabinet-prompt.md` whole — self-contained, carries the skeleton + the integration contract; destined for `docs/content-prompts/`. Spec: `docs/superpowers/{specs,plans}/2026-08-03-arcade-asherplane*.md`.

**Open threads — all deliberately deferred, none blocking: `docs/deferred-work.md`** (read it when picking up maintenance work or at a phase gate). Headline items: the lobby redesign's remainder (§ Lobby redesign), the controller stickers' on-device pass, the older-games retest backlog and the pending suite-wide sweeps. `wip/` is git-ignored — a local sandbox, never deployed.

### 🧪 Verification harnesses

Every game and shared module has a harness set (`tools/verify-*.js`, loopbacks, mutation runners). **Re-run a game's full set after touching its appliers, deck/data, packets or render seam.** The per-game commands, check counts, and the "loopback vs `visual-check`" guidance are in `docs/rules/harnesses.md` (on-demand — read it before running or adding a harness). Always:
- `node tools/verify-build-fresh.js` — after any markup change (`src/screens/`).
- `node tools/verify-mp-configs.js` — after touching `MP_GAME_CONFIGS`, a quit-confirm handler or the roster screen.
- `node tools/verify-mp-reconnect.js` — after touching seats, presence, rejoin, `mpConfirmRoster` or `MP_END_SCREENS`.

Headless harnesses cannot see packets-over-a-wire, render code or layout: reach for a loopback on anything MP- or render-shaped (`logic-engine.md` § MDLM Patterns) and the `visual-check` skill for layout. None of it substitutes for a real multi-device session.

**Standing pointers.** Phase snapshots are written **in-repo** to `docs/phase[N]-snapshot.md`
(current template: `docs/phase44-snapshot.md`). Snapshots up to and including phase36, the
fable-audit campaign, and phase22 live in the owner's external archive (`D:\Coding Projects\archive\Documents archive\`).
A shipped game's tech spec moves there at its phase gate too — a
`docs/new-game-tech-*.md` or `docs/superpowers/plans/…` path in a comment or an old log is history,
not a broken link. What the game *is* now: its identity doc; its bug log and design decisions are
`docs/implementation-notes/[abbr]-implementation-notes.md`. Non-game-specific bug logs and design
decisions (engine.js, engine-multiplayer.js, secret-mode.js, js/lib/*) live in
`docs/implementation-notes/shared-implementation-notes.md` instead. Those, plus `docs/code-map.md`
and `docs/decision-log.md`, are where the detail this section used to carry now lives.
