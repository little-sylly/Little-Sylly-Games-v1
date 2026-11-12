---
name: sylly-whats-next
description: "Little Sylly Games repo ONLY (not for other projects). Use when closing a response needs a real model + effort or session-call decision (same session / compact / fresh), or whenever the call is `fresh session`, which makes a ready-to-paste handoff prompt mandatory. The always-on 'end every response with what's next' rule stays in CLAUDE.md; this holds the picker tables and handoff template."
---

# What's next — picker tables + handoff (Little Sylly Games)

Moved out of `CLAUDE.md` § Token Hygiene (4 Nov 2026) so the tables load only when a closing line needs them. The rule itself is unchanged: **every response ends with the next task, the model + effort it warrants, and the session call — all three explicit.**

**Model & effort picker (for the "what's next" line):**

| Task shape | Model | Effort | Why |
|-----------|-------|--------|-----|
| Single known fix, exact file/line already identified | Sonnet | low–medium | Mechanical edit, no design judgement needed |
| Bug/polish following `task-bug-polish.md` intake | Sonnet | medium | Bounded scope, established pattern to follow |
| Doc-only updates (code-map, impl-notes, decision-log) | Sonnet or Haiku | low | Pure transcription/summarising, no logic risk |
| Content authoring (words.json, categories, copy) | Sonnet | medium | Needs the Consistent Word Expansion rules applied, not novel reasoning |
| New game implementation (Stage 3 build) | Opus | high | Multi-file, cross-cutting (MP handlers, render seam, checklist) — mistakes compound silently |
| Architecture/strategic decision (spec write, MP pattern design, refactor plan) | Opus | high | Wrong call here becomes a decision-log entry and future rework |
| Phase-gate audit (Protocol A/B/C, studio sweep) | Opus | high | Needs to catch subtle drift across many files, not just pattern-match |
| Owner says Fable is available, and the task is a plan or a review | Fable, via `sylly-fable-brief` | high | Reads a lot, writes little — the only shape worth its price. Never for building |
| Large exploratory search ("find every place X happens") | dispatch to Explore/general-purpose subagent | medium | Keeps the fan-out out of the main context window regardless of which model runs it |
| Quick lookup / "what does X do" | Haiku or Sonnet | low | No edit risk, cost matters more than depth |

Default for the next task when unsure: **Sonnet, medium** (sessions themselves open on Opus 5.5) — escalate to Opus + high only when the task is architectural, touches 3+ files with cross-cutting rules (MP sync, render seams), or is a phase-gate audit. Escalating "just in case" burns budget for no benefit on mechanical tasks; under-calling it on an architectural task risks a silent rule violation that surfaces as a bug days later.

**Session picker (same session / compact / fresh):**

One trade: a fresh session re-pays the **baseline** but starts clean; continuing pays the **entire transcript every turn** whether or not it still matters. The test is not "how long have we been going" — it is **how much of what's loaded is still relevant to the next task**.

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

## 🤝 Handoff Prompt (mandatory whenever the session call is `fresh session`)

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
