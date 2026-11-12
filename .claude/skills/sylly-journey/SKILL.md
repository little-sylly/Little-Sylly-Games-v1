---
name: sylly-journey
description: "Little Sylly Games repo ONLY. Reflection journal of how building Little Sylly Games feels and what is being learned (not technical docs). Use when the owner asks to journal, reflect or log a session, or at a wrap-up. Writes only to the git-ignored wip/journey/ folder, never to tracked files."
---

# Sylly journey (reflection journal)

The project's technical record already lives in `docs/implementation-notes/`, `docs/decision-log.md` and the phase snapshots. **This is the other half: the human story** — what it felt like, what was learned, what surprised us — so it can later become a retro, a "making of" or content for the brand.

## Where it lives
`wip/journey/` — **git-ignored, local only** (`wip/*` is ignored in `.gitignore`). The deployed site is the whole repo, so a journal committed anywhere else would be public. **Never write the journal, or quote the owner's personal notes, into any tracked file.** Copy `wip/journey/` to the owner's external archive (`D:\Coding Projects\Documents archive\`) now and then; it is not backed up by git.

```
wip/journey/
  JOURNAL.md   one entry per session, newest at the bottom
  RECORDS.md   optional ledger: numbers worth keeping, bugs and dead ends, cast and credits
  process/     screenshots / clips that taught something, numbered in order, with a one-line caption
```

## What this skill does NOT do (the repo already covers it)
- No `versions/` snapshots — git is the version history.
- No `HANDOFF.md` — handoffs are the pointer prompt in `sylly-whats-next`.
- No duplicating impl-notes or the decision log: **link to them** ("see `shp-implementation-notes.md` BUG-03") instead of restating.

## JOURNAL.md entry (per session; short lines, plain language)
`## <date, Brisbane time> — <short title>`
- **Goal**
- **What happened** (built, decided, broke)
- **Why we chose it** (the decision and what was dropped)
- **What went well / badly** — on both sides (the owner's input, Claude's work, including Claude's own mistakes)
- **Lesson**
- **Sam's take** — one line, in Sam's own words, only when Sam gives one. Never invent it.
- **Next**

## RECORDS.md (append one row at a time; unknown stays `unknown`, never guessed later)
- **Numbers worth keeping:** `date · number · what it measures · source` (e.g. a precache size, a harness check count, a before/after).
- **Bugs and dead ends:** `date · symptom · cause · fix · caught by`.
- **Cast:** tools, models, people (play-testers) and what the owner did by hand (device checks).

## Rules
1. Record **as things happen**, one line at a time — a wrap-up can only show what was written down.
2. Dates in Brisbane local time, not UTC.
3. Copy any image or clip worth keeping into `wip/journey/process/` before the session ends — the temp workspace is not kept.
4. Tell the owner in one line what was written and where.
