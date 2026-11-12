---
name: sylly-implementation-notes
description: "Little Sylly Games repo ONLY. Use after any non-trivial bug fix, design decision or architectural lesson (a new game build, maintenance, or an audit of any game or of shared/engine code) to write the implementation-notes entry in the right file. Must run in the same response that completes the fix."
---

# Implementation notes (Little Sylly Games)

Moved out of `CLAUDE.md` § Skills (4 Nov 2026), content unchanged.

**Trigger:** Any non-trivial bug fix, design decision, or architectural lesson — in a new game build, maintenance, or an audit of any game **or of shared/engine code**.

**Action:**
1. **Pick the right file first — by where the root cause lives, not where it was found.** A single game's own code → `docs/implementation-notes/[abbr]-implementation-notes.md` (create if missing; four sections: Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps). `engine.js`, `engine-multiplayer.js`, `secret-mode.js`, `js/lib/*`, `sw.js`, or a cross-cutting rule → `shared-implementation-notes.md`, **even when found while testing one game**. A fix spanning both gets the writeup in exactly one file (whichever owns the bug) and at most a one-line pointer in the other.
2. Entry shape: **What happened → Root cause → Lesson**.
3. At the end of an audit/testing session, review Template Gaps and flag anything that should fold into `logic-engine.md`, `ui-style.md`, or the tech template.

**When:** in a session that changes code, in the **same response** that completes the fix — never a follow-on session. If the fix is done and this hasn't run, the session isn't complete. (A plan- or review-only session writes none; the session that applies its fixes does.)

**Cross-reference:** before a new game's tech spec, read Template Gaps in *all* impl-notes files (including shared) and resolve what applies.
