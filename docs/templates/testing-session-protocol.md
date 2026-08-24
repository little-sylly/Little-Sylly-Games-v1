# Testing-Session Protocol — Little Sylly Games

**Read this at the start of any game-testing session.** Testing is bug/polish work — the
category that historically burned ~50% of a session's tokens in a compaction death-spiral
(see `docs/token-budget-register.md` Finding 3). These rules keep the 138k-token `index.html`
out of the live context window. They need no harness config — they are practices, written
down here so they're findable rather than remembered.

---

## The three rules

### 1. Hunt via a subagent — never grep `index.html` in the main window
When a test surfaces a bug that needs locating in `index.html` (a screen, overlay, handler),
**dispatch an `Explore` agent** to find it and report back **line ranges only**:

> "Find where the `[abbr]-foo-overlay` markup and its open/close handlers live in
> `index.html` and in `js/games/[abbr].js`. Report the file + line ranges. Do not dump the code."

The heavy grepping of the 540 KB file happens in the **subagent's** context; only the conclusion
(e.g. "overlay at `index.html:4120–4180`, handler at `[abbr].js:560`") returns to the main
window. Then make a **surgical** Read (tight `offset`/`limit`) + Edit at that exact location.

This is the single most important rule — it structurally prevents the detonator (an
`index.html` content-grep landing in the live session).

### 2. One game per window — `/compact` between games
Do not test multiple games in one continuous session. Finish a game's test pass, then
`/compact` (or start fresh) before the next. A clean window per game keeps each test pass
far from the context ceiling.

### 3. Count-first, slice-only reads (if you ever read `index.html` directly)
If a direct read is unavoidable: `Grep` with `output_mode: "count"` or `"files_with_matches"`
first → then `content` with `-n` → then `Read` with tight `offset`/`limit`. **Never** a bare
full-read, and **never** a content-mode grep on `index.html` from the main window.

---

## Edit safety (carries over from existing rules)
- **Single surgical fixes** to `index.html`: the `Edit` tool is fine for a one-off.
- **Systematic / bulk** `index.html` changes: use a **Node.js script**, never the Edit tool —
  the Edit tool corrupts UTF-8 into mojibake on bulk passes (memory `feedback_indexhtml_encoding`).
- After any non-trivial fix, log it per the Implementation Notes skill in the affected game's
  `docs/implementation-notes/[abbr]-implementation-notes.md` — in the same response that fixes it.

---

## Quick pre-flight (10 seconds, optional)
At session start, eyeball that the baseline is still lean: only `ui-style.md`,
`logic-engine.md`, `definitions.md` (+ `CLAUDE.md`) should be auto-loaded — no
identity docs, `code-map.md`, or new-game docs. If a relocated file reappears, fix that before
testing (see `docs/token-budget-register.md` § 8).

---

## What we deliberately did NOT do
A PreToolUse hook to *enforce* the `index.html` guard was considered and **shelved**: a prior
attempt hung the session on a permission prompt, and re-introducing flaky harness config right
before a testing push is its own burn risk. The practices above achieve the same protection
without that risk. Revisit hooks only as a standalone task if enforced guards become necessary.

---

*Authored 2026-06-30. Companion to `docs/token-budget-register.md` (the incident record) and
`docs/templates/task-bug-polish.md` (the per-fix intake form).*
