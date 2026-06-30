# Task Template — Bug / Update / Polish

**Purpose:** A short intake form to fill in at the *start* of a fix/polish session — before any code is read or changed. It does two jobs:
1. **Consistency:** every fix session starts the same way, with scope agreed up front.
2. **Token-lean:** it pre-answers the questions Claude would otherwise go hunting for (reading four files to "get oriented"), which is the main cause of the mid-task slow-down.

**How to use:** Copy the block below into the chat (or a scratch file) and fill what you can — even half-filled is a big help. Claude will confirm scope, fill any gaps by asking, then work *only* inside it. Don't worry about technical names; "the dice screen in The Bluff" is enough.

---

## Copy-paste block

```
# Task: <one line — what's wrong or what to change>
Type: bug / update / polish        (delete the two that don't apply)

Game(s):        <e.g. The Bluff (dyb)>     — or "engine / multiplayer / all"
Where:          <screen, overlay, or moment — e.g. "the Showdown reveal screen">
                <if known: file(s) or element ID — leave blank if not>

Expected:       <what "done/fixed" looks like, in plain English>
Actual now:     <what happens currently — for bugs>

Already tried / ruled out:   <so we don't re-investigate the same thing>
Out of scope:                <anything to explicitly NOT touch>

Record outcome in:  docs/implementation-notes/<abbr>-implementation-notes.md
Decision-log entry? <only if this turns into an architectural/strategic/process change>
```

---

## Filled example (for reference)

```
# Task: Phantom die still shows "?" at the showdown instead of revealing its face
Type: bug

Game(s):        The Bluff (dyb)
Where:          the Overlook / Showdown reveal screen — dybRenderShowdownScreen
Expected:       at reveal, each Phantom die shows its real rolled face
Actual now:     it keeps the grey "?" even after all hands are revealed

Already tried:  nothing yet
Out of scope:   Slick/Loaded/Cracked die rendering — only Phantom is wrong

Record outcome in:  docs/implementation-notes/dyb-implementation-notes.md
Decision-log entry? no (single-game bug, not architectural)
```

---

## Notes / rules baked in
- **Scope is a fence, not a suggestion.** Claude will not read or edit files outside "Where" without asking first.
- **Impl notes are mandatory, not optional.** Any non-trivial fix logs a `What happened → Root cause → Lesson` entry in the game's implementation-notes file *in the same session* (existing Implementation Notes skill).
- **If a "polish" turns out to need an architectural change** (new overlay pattern, new packet, a rule that affects other games), stop — that's a Documentation Pause moment, and it earns a `docs/decision-log.md` entry.
- **One task per session where possible.** Mixing "investigate-and-fix" with "build something new" is what bloats context — keep them separate.
