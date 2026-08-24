# Token-Budget Register — Little Sylly Games

**What this is:** The single canonical record of *token / context-budget* problems — incidents of uncontrollable token burn, what we found, what we did, what we're still worried about, and the ranked plan to fix the rest. Written to be read cold by a fresh session or a non-coder owner.

**What this is NOT:** A re-explanation of game logic or per-game bugs. It only covers context/token cost.

**Canonical home:** This file (repo). Mirror to Confluence for browsing; the repo copy is the source of truth.

**Companion records (kept, not superseded):**
- `docs/templates/testing-session-protocol.md` — read at the start of any game-testing session; the zero-config practices (subagent-hunt, one-game-per-window, count-first reads) that keep `index.html` out of the live window during the dangerous bug/polish category.
- `docs/token-budget-handoff.md` — the post-fix handoff brief (cold-start summary of the relocation fix).
- `token-efficiency-lessons-learnt.md` (repo root) — the raw discussion transcript of the two reduction passes; this register distils it.
- `docs/decision-log.md` — entries "Context-budget reduction" (2026-06-29) and "Settings-label emoji convention" (2026-06-30).
- Memory: `project_context_budget`.

**How to add an incident:** Append a row to § 2 (newest on top) and, if the fix is architectural/process-level, a one-liner to `docs/decision-log.md`.

---

## 1. The mechanism — why token burn happens here (read this first)

Token burn in this project is almost never the *work* being large. It is a **compaction death-spiral** driven by two structural facts about how this repo meets this harness:

1. **An oversized always-on baseline.** Some files load into context *every single turn*, before any work begins. The bigger that baseline, the smaller the working window left for the actual task — and the sooner any read tips the window over the limit.

2. **One enormous file: `index.html` (~138k tokens / ~540 KB).** Every game's screens and overlays live in this one file. Any *full read* of it, or any *unconstrained content-mode Grep* on it (its screens are single multi-thousand-character lines, so grep results are huge), can alone blow the context window.

When those two combine, the loop is:

> big baseline + a full `index.html` read/grep → **"Prompt is too long"** → **auto-compact** → the baseline rule files **reload** on the very next turn → context is back at the ceiling → the next grep re-detonates it → compact again.

That is the ~2-minute compaction loop that burned ~50% of a session's usage without shipping anything. Smaller-window models (Sonnet) hit the wall faster and harder than Opus, but the trap bites every model eventually.

**One-line version:** huge always-on baseline + a 138k-token single HTML file + unconstrained reads = a compact death-spiral.

---

## 2. Incident register (newest on top)

| Date | Incident | Trigger | Root cause | Status |
|------|----------|---------|------------|--------|
| 2026-06-30 | Sonnet session doing routine Secret Signals edits **auto-compacted every ~2 min and burned ~50% of usage** with nothing shipped. Snapshots showed content-mode Greps on `index.html` returning **"Prompt is too long."** | Unconstrained content-mode grep on the 540 KB `index.html` while a ~70k-token rule-file baseline was already resident. | **The harness auto-loads EVERY file in `.claude/rules/` every turn** — defeating the project's `@`-import hygiene. The big "on-demand" docs that lived there (chiefly `game-identities.md` at ~34.7k) were silently loaded every turn, inflating the baseline to ~70k before the grep tipped it over. | **Resolved** by Fix (a) — relocation (§ 4). Behavioural discipline (§ 5 D) reinforced. |
| 2026-06-29 | Earlier diagnosis: baseline measured at **~75k tokens** before any work; bug/polish sessions cost 2–3× a full implementation. | Exploratory reads during bug-hunting (read `index.html`, the game file, firebase, re-read files already seen) landing in context and staying. | Two structural sinks: (i) ~75k of auto-loaded docs, and (ii) `index.html` full-reads tempted by every overlay/screen bug. The de-`@` discipline in CLAUDE.md was assumed to gate loading — it did **not** in this harness. | **Partially addressed** by the de-`@` pass; **fully addressed** only once the relocation (Fix a) followed, because de-`@`-ing alone didn't stop the harness loading the folder. |

---

## 3. Findings (consolidated)

1. **The harness ignores `@`-import discipline for `.claude/rules/`.** It loads the *whole folder* as project instructions every turn. This is the single most important finding: the project's entire token-hygiene strategy had assumed only `@`-imported files load. That assumption was **false for this harness (VSCode native extension)**. The first reduction pass (removing `@` prefixes) therefore *did not actually reduce baseline* — the files still loaded. Only physically moving them out of `.claude/rules/` worked.

2. **`index.html` is the detonator, not the baseline alone.** The baseline makes the window fragile; the 138k-token single file is what tips it over. Both must be managed — fixing one without the other leaves the spiral reachable.

3. **Bug/polish sessions are the dangerous ones.** Implementation-from-spec has a map (it knows what to write where). Bug-fixing goes *hunting* — fanning out across files, re-reading what it already read. That exploratory fan-out is where within-session burn concentrates.

4. **Within-session, not between-session.** General "optimise between sessions" advice (e.g. typical Reddit tips) solves a different problem. Our burn is *within* a single session, structurally forced by how the docs and the SPA are organised.

5. **graphify (the dependency-graph tool) is the wrong fit.** Three reasons: (a) the architecture is "all symbols global, no ES modules, forward references at runtime" — there are no imports to walk, so it would map almost nothing; (b) it's a build/tooling step — straight into the no-build anti-pattern; (c) it solves "what calls this function" (already answered by hand-curated `code-map.md`), not "where in 540 KB does this overlay live" — which is a line-anchor problem, not a relationship-graph problem.

---

## 4. Actions taken (what's fixed)

### Fix (a) — Rule-file relocation ✅ DONE (2026-06-30, the decisive fix)
Moved the 5 genuinely on-demand docs out of `.claude/rules/` → `docs/rules/` (via `git mv`, history preserved):

| File relocated | ~tokens/turn removed |
|----------------|----------------------|
| `game-identities.md` | ~34.7k |
| `phase-audit.md` | ~5.5k |
| `new-game-technical-template.md` | ~5.2k |
| `new-game-process.md` | ~2.9k |
| `new-game-brief-template.md` | ~2.3k |
| **Total off baseline** | **~50k** |

- All live path references updated (CLAUDE.md, logic-engine.md, decision-log.md, fable-fix-plan.md, fable-audit-plan.md, phase-audit.md). `docs/archive/*` snapshots left frozen by design.
- CLAUDE.md carries a ⚠️ note explaining *why* these live outside `.claude/` — so nobody "tidies" them back in and re-triggers the spiral.
- **Kept in `.claude/rules/` (the only files that belong there):** `ui-style.md`, `logic-engine.md`, `definitions.md` — the genuine apply-on-every-edit rules.
- **Effect takes hold next session** — `@`-imports/folder-load resolve at session boot, so the session that did the move stayed heavy; every future session starts ~50k leaner.

### Fix (b) — `index.html` read discipline ✅ DONE (codified in CLAUDE.md)
Hard rule: **never full-read `index.html`.** Grep for the screen/overlay ID with `output_mode: "count"` or `files_with_matches` first, then `content` with `-n`, then Read with tight `offset`/`limit` around the hit. Generalised to any file over ~40 KB. A coarse **Per-Game Offset Map** was added to `docs/code-map.md` (ID-grep remains the authority; offsets are dated/approximate accelerators, deliberately *not* exact per-screen line ranges because those rot on every edit).

### Superseded earlier action — the de-`@` pass (kept for the lesson)
The first pass removed `@` prefixes from the on-demand docs, expecting that to stop them loading. **It did not** in this harness (Finding 1). The relocation (Fix a) is what actually worked. Lesson logged so we never again assume `@` discipline gates loading here.

### Supporting structure shipped alongside (consistency backbone)
- `docs/decision-log.md` — append-only index of big decisions; self-maintains via Documentation Integrity Protocol step 6.
- `docs/templates/task-bug-polish.md` — intake form filled at the *start* of a fix session; doubles as a token-saver by pre-answering "what's in scope" so Claude doesn't fan out.
- "Task Playbooks" front-door map in CLAUDE.md.

---

## 5. Remaining levers / action plan (ranked)

**A. `index.html` (138k) — the biggest avoidable sink. OWNER DECISION MADE 2026-06-30: defer the build (see below).**
> **Decision (2026-06-30):** keep discipline-only for now; the dev-only assembly build is **deferred, not rejected**. **Revisit trigger:** `index.html` crosses **~750 KB / ~20 games**, OR subagent-hunting stops keeping edits under the ceiling — whichever first. Rationale: "$0" and "no build" are independent; the build's only payoff is this file's token pain, currently mitigated, and a build adds owner-facing fragility (non-coder owner). Full entry: `docs/decision-log.md` 2026-06-30 "No-build constraint reviewed". Interim discipline: `docs/templates/testing-session-protocol.md`.

Governed now by the never-full-read rule. The open question (now answered, above): is discipline alone enough, or should the file be **physically split**?
- *Tension:* the project is explicitly **no-build / single-page** (Anti-Patterns). A runtime split into multiple HTML pages is forbidden.
- *Possible middle path:* a **dev-only assembly step** — per-game HTML partials under `src/` concatenated into the shipped `index.html` by a Node script that is **not** part of the runtime/PWA. Keeps the single-page runtime intact while making edits touch small files. **This conflicts with the spirit of "no build tools" and must have an explicit owner decision before any work.** Log the outcome in `decision-log.md`.
- *Cheapest path:* leave it whole, keep hardening discipline (offset map already exists).

**B. Split `ui-style.md` (~10.7k) + `logic-engine.md` (~10.2k) into core + appendix. (~10–15k/turn possible.)**
Both are always-loaded on purpose, but much of their bulk is *reference tables* (per-game brand-colour / range-class / toggle-class tables, the legacy `h-screen` whitelist, the full audio catalogue), not apply-on-every-edit rules. Those could move to an on-demand `docs/rules/` appendix, leaving a lean always-on core. **Risk:** drift if the appendix isn't read when needed — this exact trade-off is why de-`@`-ing these was *deferred* in the 2026-06-29 decision. Mechanical and reversible if attempted.

**C. Trim `CLAUDE.md` (~6.8k). (Minor.)**
The "Current Focus → Key references" list is long and duplicates `decision-log.md` + archive snapshots. Could shrink to a few pointers.

**D. Conversation-level discipline. (Free, ongoing — applies every session.)**
- Count-first Grep (`output_mode: "count"` / `files_with_matches`) → `content` with `-n` → Read with tight `offset`/`limit`.
- Never bare-read a >40 KB file "to orient."
- Before reading a file, check whether it was already read this session (stops the re-read spiral).
- Keep "investigate-and-fix" sessions separate from "implement-new-feature" sessions.
- Fill `docs/templates/task-bug-polish.md` before a fix session so the hunting is done once, up front.

---

## 6. Foreseeable concerns (watch-list)

1. **Regression risk on `.claude/rules/`.** Anything big dropped back into that folder silently reverses Fix (a) — the harness will load it every turn again. **Guard:** the ⚠️ note in CLAUDE.md; treat `.claude/rules/` as a 3-file allow-list (`ui-style`, `logic-engine`, `definitions`).
2. **`index.html` keeps growing.** Each new game adds screens/overlays to the same 540 KB file, pushing the full-read cost higher and making the never-full-read rule more load-bearing over time. Lever A becomes more pressing with every game shipped.
3. **`game-identities.md` retired 23 Aug 2026** (superseded by `docs/game-identities/[abbr].md`, one file per game, 15–25 KB each) — concern closed, not open. The per-game identity docs are individually small enough that the whole-file-read risk this item used to track no longer applies; the Per-Game Quick Index in CLAUDE.md still exists so most "which colour/file/abbr" lookups never open even those.
4. **Drift if levers B/C are taken.** Moving always-on pattern rules to on-demand trades guaranteed convention-loading for a drift risk — the very reason `ui-style`/`logic-engine` were kept loaded. Any such move must pair the saving against more frequent convention violations.
5. **Harness behaviour is environment-specific.** The "loads the whole `.claude/rules/` folder" finding is true for *this* harness (VSCode native extension). A different harness (CLI, web) may behave differently — don't assume the relocation is needed or harmless everywhere without re-checking.
6. **Owner is a non-coder who will forget these habits.** The structural fixes (relocation, offset map) are robust because they don't rely on memory; the behavioural ones (§ 5 D) do. The decision log + task templates exist to make the habits findable rather than remembered.

---

## 7. Hard constraints any token work must respect

- **Keep `.claude/rules/` to the 3 lean always-on files only.** The harness auto-loads everything there every turn.
- **No build tools, no npm/webpack, single-page app** (CLAUDE.md Anti-Patterns). Any `index.html` split must not break the no-build / offline-PWA runtime.
- **Never use the Edit tool for systematic `index.html` changes — use a Node.js script** (UTF-8 mojibake risk; memory `feedback_indexhtml_encoding`).
- **Australian English; metric units.**

---

## 8. How to verify the baseline at session start

`@`-imports and folder-loads resolve at session boot, so a fix only shows up *next* session. To confirm Fix (a) held:
1. On a fresh session, run `/context` (or eyeball the auto-loaded project-instructions block): `phase-audit.md`, the three new-game docs, and any `docs/game-identities/*.md` file should be **absent** (`game-identities.md` itself no longer exists — retired 23 Aug 2026).
2. A quick `PowerShell` size sweep of `.claude/rules/*` + `CLAUDE.md` confirms only the 3 lean files remain (~30k subtotal).
3. If any relocated file reappears in the baseline, something is re-importing it — chase it before doing other work.

---

*Authored 2026-06-30. Distilled from `token-efficiency-lessons-learnt.md` (raw transcript) and `docs/token-budget-handoff.md` (post-fix handoff). Update this register whenever a new token-burn incident occurs or a lever is taken.*
