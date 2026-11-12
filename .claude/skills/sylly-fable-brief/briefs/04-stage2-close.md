# Task 4 — Stage 2 close: scene kit, `sylly-ui-pass`, departures review, batch order

**Mode:** Build + process · **Tier:** 2 (a new shared library, rule promotions) · **Needs:** task 2
(GM) built through R14. GM's R15 may still be pending · **Sessions:** 1–2
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this

This is the hinge between "two pilots" and "18 games". The programme spec planned it from the start
(§ 3, Stage 2 row): **extract what both pilots used into `js/lib/scene-kit.js`, write `sylly-ui-pass`,
run the first departures review.** Done well, each batch game becomes one skill invocation plus the
owner's two sign-offs. Done badly, every batch session re-derives the process from five documents.

## Where things stand (as of writing; GM's pass will change it)

- **World scene code, all game-owned:** `js/games/li5-scene.js` (13 KB), `js/games/eta-scene.js` (46 KB),
  `js/games/hsg-scene.js` (10 KB), plus whatever GM adds. The rule (`ui-revamp.md` § 4): a piece moves to
  `js/lib/scene-kit.js` only when a **second** game needs it. Never pre-build.
- **The departures log** (`docs/ui-revamp-rollout.md` § 6) has ETA and HSG entries with an empty Review
  column. Task 1 may already have promoted the beat-scene sizing, so check.
- **Lessons** (`docs/ui-revamp-lessons.md`) has two "candidates" waiting on a second sighting.
- **Programme items** in rollout § 4 that wait on this point: lobby roster retirement, the `'seats'`
  Line-up type (GM's R2 decided it), Settings Card Standard → on-demand, scene/size caps "after both
  pilots are measured".
- **Task 1's** `wip/fable/REVAMP-REVIEW.md` holds the full/light classification and a draft batch order.

## Pain points

1. **Shared or merely similar?** A chalk write-on, a passed-note buzz, a shoji stage and a thought bubble
   share techniques (a beat-driven line card, a static tier after slow frames, reduced-motion handling,
   one-WebGL-context discipline), not art. The kit should hold the **plumbing**, not the look (the lessons
   candidate "a new world needs its own scene kit, not a reskin").
2. **The process lives in five places** (ui-revamp.md, the rollout, lessons, the programme spec, the LI5
   pilot spec). A batch session can't afford to read all five.
3. **The skill must work for a cheaper model too.** The current run is Fable-only, but the skill outlives
   the run. Write it so a Sonnet subagent can run R4–R14 from a signed-off board plus plan.

## Read first

1. `docs/ui-revamp-rollout.md` whole; `docs/rules/ui-revamp.md` whole; `docs/ui-revamp-lessons.md` whole.
2. Programme spec: §§ 3, 6, 13.
3. `wip/fable/REVAMP-REVIEW.md` (task 1) and the GM pilot spec (task 2).
4. The scene files above, whole (each is small except ETA's; Grep that one for `mount`, `beat`, `stop`,
   reduced motion and the static tier).
5. An existing project skill as the format reference: `.claude/skills/sylly-implementation-notes/SKILL.md`.

## The result we want

- **`js/lib/scene-kit.js` (`SceneKit`)** holding only pieces that ≥2 shipped scenes actually use, with
  those scenes switched onto it, byte-identical in behaviour (measure each Intro scene before and after).
  Register it in `sw.js` `PRECACHE_URLS`, the CLAUDE.md load order and the `_scripts-*.html` partial, and
  bump `CACHE_NAME`. Add a row to `logic-engine.md` § Shared Library Modules. If nothing qualifies yet, say
  so and don't build it.
- **`.claude/skills/sylly-ui-pass/SKILL.md`**: invoked with an abbreviation. It reads the game's tracker
  card and identity doc and walks R1–R16 in full or light form (from task 1's classification). It carries
  the gates, the read list, the lessons checklist (L2/L3/L4/L8 as greps), the driver template and the
  closure list. Self-contained: a batch session reads the skill plus the game's own files, nothing else
  from the programme. Mark which steps are delegable to a Sonnet subagent.
- **The departures review:** every § 6 entry marked promoted / kept / rolled back. Promotions land in
  `ui-style.md` / `DESIGN.md` / `ui-revamp.md` (the skill learns them too).
- **The tracker:** batch order set and grouped, the Stage 3 proof game chosen (an N-player MDLM game, not
  CJAR), § 4 items updated.
- A decision-log entry for the kit and the skill.

## Owner gates

Rule promotions (they change suite-wide rules) and the batch order. Present both in one ask.

## Verification

Every scene-owning game's loopback + `verify-game-intro` (+ mutate) + `verify-build-fresh` + `visual-check`
of each Intro scene at the three sizes + reduced motion. `verify-tv-labels` after tracker edits.

## Progress log

*(append: date · what was done · commits · where it stopped · next concrete step)*
