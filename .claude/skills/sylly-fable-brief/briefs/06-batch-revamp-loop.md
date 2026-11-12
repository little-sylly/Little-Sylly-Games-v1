# Task 6 — Batch revamp loop

**Mode:** Build, repeating · **Tier:** sized per game at its R2 · **Needs:** task 4 ✅ (the
`sylly-ui-pass` skill exists) · **Sessions:** one game per run of sessions, never two worlds in one session
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this

This is the programme's actual payload: every remaining game gets a world, an Intro and a first turn that
is obvious without reading (`CLAUDE.md` § North Star). It's last in the build order because it's
open-ended. Anything queued after it would never run, so tasks 5 and 7 sit beside it, not behind it.

## How this task works

This brief is deliberately thin. **The skill is the brief.** For each game:
1. Take the next game in the tracker's batch order (`docs/ui-revamp-rollout.md` § 3, set by task 4). The
   first one is the **Stage 3 proof game**. Its job is to show the skill alone is enough, so note every
   time you had to leave the skill to find something, and fix the skill at R13.
2. Invoke **`sylly-ui-pass`** with the abbreviation and follow it. Its read list replaces this one.
3. Use the full or light classification from task 1 / 4. Fable's own judgement may upgrade a light game
   to full if R1 shows its world deserves it. Log why on the tracker card.

## Working the owner gates efficiently

Each game has three owner gates (R2 world brief, R2b direction, R15 phones). Waiting on each in turn
stalls the loop, so:
- once game N is waiting at R2 or R2b, **start game N+1's R1–R2 in a fresh session** and present both
  world briefs together;
- keep at most **two** games open at once. A third means the owner is the bottleneck. Say so, and switch
  to task 5 or 7;
- R15 phone sessions batch naturally: write one combined checklist for every game waiting on phones.

## Rules that bite in a batch

- **One world per session.** Never draft two games' directions in the same context (North Star).
- Lessons L2/L3/L4/L8 (old styling, stale terminology, forgotten overlays, values drifting from the board)
  bite on every pass. The skill's greps are not optional.
- Every departure gets logged. At each **batch boundary** (end of a shape group), run the departures review
  again, as task 4 did.
- The lobby roster retirement fires when the last roster game migrates (rollout § 4). Watch for it.

## The result we want, per game

The tracker row ✅ (R1–R16, R15 played by the owner), the tracker card filled, the identity doc current,
harnesses green, a before/after artifact, and SW bumped per the skill's closure.

## Progress log

*(one line per game: date · game · stage reached · commits · gate waiting on)*
