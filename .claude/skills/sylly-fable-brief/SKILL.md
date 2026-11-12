---
name: sylly-fable-brief
description: "Little Sylly Games repo ONLY. Use at the start of every Fable 5.2 session on this repo to work the Fable queue (§ 2): pick the next task, read its brief in briefs/, and do it. Also use on Opus/Sonnet when the owner asks to add, reorder or rewrite a queue task."
---

# Sylly Fable Brief — the Fable queue

During a Fable run, **every session is Fable**. The owner won't switch back to a cheaper model for
builds, so Fable plans, builds, reviews and closes its own work. This file is the front door. § 2 is the
ordered task list. Each task has its own brief in `briefs/` that says what to read, where things stand,
what hurts and what result is wanted. **A fresh session starts here, works out the next task from § 2,
and opens only that task's brief.**

## 1. What a session costs before it starts

Every session auto-loads `CLAUDE.md` plus the three `.claude/rules/` files, about **119 KB (~31k tokens)**
(the pre-commit hook prints the current figure). Fable pays that at Fable rates before reading a single task file, so:

- **Make each session count.** Take a task stage as far as it will go before closing. Don't open a
  session for a five-minute job: fold it into the next one.
- **A Sonnet subagent is allowed for pure execution.** When a stage is mechanical work from a plan
  that already exists (a long sweep, a big but fully specified build), Fable may dispatch it with
  `model: "sonnet"`. Hand over the plan's path, then review the diff yourself. Each subagent pays the
  baseline again, at Sonnet rates. Never delegate taste, design or review work, and never delegate a
  step whose plan you'd have to write fresh for the subagent.

## 2. The queue

**How to work it.**
1. Go down the table and take the **first** task that is ☐ or 🔨 and whose *Needs* are met. Open its
   brief and read the **Progress log** at the bottom first. That's where the last session stopped.
2. Do the work. Build work follows this repo's normal rules in full: Triage Gate, impl-notes,
   Documentation Integrity Protocol, commit as you go, ask before pushing.
3. **Owner gates.** When the brief names a sign-off (a world brief, a direction pick, a cost approval, a
   phone session), ask the owner in chat. If the answer can't come now, set the task to ⏸ in the table
   with the exact question, and move to the next task you can do. **Batch the asks.** Two world briefs
   for the owner to sign off together are cheaper than two separate waits.
4. **Close the session.** Append to the brief's Progress log (date · what was done · commits · where it
   stopped · the next concrete step), update the Status cell below, and commit both. The handoff for a
   fresh session is then just:
   ```
   Task: continue the Fable queue — invoke the sylly-fable-brief skill.
   Next: Task N, [stage] (see briefs/NN-….md § Progress log).
   Model + effort: Fable, high.
   ```
5. **Judgement calls.** You may reorder tasks, split a task, or add one (write its brief in the same
   shape) when the work shows a reason. Log the reason in the Progress log of the task you moved. You
   may not skip an owner gate, push without asking, or start anything at cost-envelope Tier 2/3 without
   approval (`docs/cost-envelope.md` § 4).

Status: ☐ not started · 🔨 in progress · ⏸ waiting on the owner (what for) · ✅ done.

| # | Task | Mode | Needs | Status | Brief |
|---|------|------|-------|:---:|-------|
| 1 | **UI revamp pipeline review**: fix the pipeline before 20 more games go through it | Review → apply | — | ☐ | `briefs/01-revamp-pipeline-review.md` |
| 2 | **GM pilot** (Stage 2): world, three directions, build | Build (Tier 2) | 1 reviewed (fixes applied or declined) | ☐ | `briefs/02-gm-pilot.md` |
| 3 | **Shared-code / multiplayer audit**, then fix the top issues | Review → fix | — (good work while 2 waits on the owner) | ☐ | `briefs/03-mp-audit.md` |
| 4 | **Stage 2 close**: `scene-kit.js`, the `sylly-ui-pass` skill, departures review, batch order | Build + process | 2 built through R14 | ☐ | `briefs/04-stage2-close.md` |
| 5 | **Lounge baked prop** pilot (Blender → glTF, one hero prop) | Plan → build pilot | Blender in the session; owner approves the cost proposal | ☐ | `briefs/05-lounge-baked-prop.md` |
| 6 | **Batch revamp loop**: one game per run, via `sylly-ui-pass` | Build (repeats) | 4 ✅ | ☐ | `briefs/06-batch-revamp-loop.md` |
| 7 | **Maintenance filler**: deferred items that need no phone | Fix (Tier 0/1) | Only when nothing above can move | ☐ | `briefs/07-maintenance-filler.md` |

**Owner-only, not Fable's to pick:** the phone sessions that keep phase gates open (LI5 R15, E.T.A. R15
/ phase 44, HSG phase 45, CLD phase 40, the reconnect real-device pass). When a brief needs one of
them, prepare a short checklist for the owner and mark the task ⏸.

**Before switching to Fable (optional, cheaper on Opus).** (a) Trim the always-loaded baseline: every
KB cut saves on every later Fable session. (b) Connect Blender (MCP or headless `bpy`) if task 5 should
run. (c) `.claude/settings.json` pins Opus 5.5; choose Fable for the run with `/model`.

## 3. Facts a summary gets wrong (check these in every brief)

- Hosting is **Cloudflare Pages**, deployed from `main` with no build step. GitHub Pages is a second copy.
  **The repo is served as-is**, so anything committed is public.
- **22 games**. Newest: `hsg` (Hide and Shogun) and `eta` (E.T.A.).
- The rule is **no runtime CDN**, not "no libraries". A library may be *vendored* (copied into `js/lib/`,
  precached) after a cost-envelope proposal. Vendored today: Tailwind, the Firebase SDK, Three.js
  **r128**. r128's `three.min.js` has **no GLTFLoader**.
- Fonts: Fredoka is the suite font. A game's world may bring its own self-hosted fonts (E.T.A. ships its
  own, in `css/eta.css`). The main menus' typography is open.
- Asset sizes are **targets, not gates** (owner, 12 Nov 2026). Keep precached images lean. Music and other
  runtime-cached content may run larger.
- UI revamp: Stage 0 is built (SW v264) and the **LI5 pilot is built (SW v265–v271), with only its phone
  pass outstanding**. GM is next. Status: `docs/ui-revamp-rollout.md`, whose own LI5 row is out of date
  (task 1 fixes it).
- `CLAUDE-OFFLINE.md` doesn't exist. Arcade standing prompts: `js/arcade/arcade-cabinet-prompt.md` and
  `js/arcade/arcade-roster.md`.
- The Firebase rules are recorded in `docs/multiplayer-feature-specification-v1.4.md` §2.7 and live in the
  Firebase console, which no session can see. Room cleanup is §5.

## 4. Where output goes

- **Review and audit files** (`REVIEW.md`, `AUDIT.md`, scratch plans) go to **`wip/fable/`**, which is
  git-ignored. Never commit them, and never at the repo root: a committed audit is publicly served, weak
  spots included. A finding worth keeping is recorded in the normal docs when it gets fixed.
- **Build work** lands in the normal places: specs in `docs/superpowers/specs/`, impl-notes,
  decision-log, commits.
- **Queue state** lives in § 2's Status column and each brief's Progress log. Both are tracked. Keep
  security findings out of them (point to the `wip/fable/` file instead).

## 5. The override block (review-only steps)

A literal reader would run CLAUDE.md's closing procedures in a session that only reads and reports.
At the start of a **review-only** step, apply this to yourself:

```
This step is review only: write only to wip/fable/ (plus this task's Progress log and the § 2 status),
and edit no other file. For this step, these CLAUDE.md procedures don't apply: the Documentation
Integrity Protocol, the sylly-implementation-notes skill, the Current Focus / SW-entry housekeeping, the
deferred-work sweep and the decision-log entry. The apply step after it does those. Skip the Triage Gate
statement. Don't read docs/code-map.md or index.html whole: Grep for the identifier, then read the slice.
```

When the same session moves on to the apply step, the normal rules come back in full.

## 6. Closing line during a Fable run

CLAUDE.md's "what's next" rule still applies. The model is always **Fable, high**, so don't re-run the
picker tables. Name the next queue task and stage plus the session call, and if the call is
`fresh session`, use the three-line handoff in § 2 step 4. The brief's Progress log carries the detail.
