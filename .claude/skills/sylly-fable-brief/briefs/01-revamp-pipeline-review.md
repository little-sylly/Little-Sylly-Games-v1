# Task 1 — UI revamp pipeline review

**Mode:** Review, then apply · **Tier:** 2 for any engine change it adopts, otherwise doc-only ·
**Sessions:** 1 (review + owner answers + apply), 2 if the owner's answers lag
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this, and why first

The revamp pipeline (R1–R16 plus R2b) will run on about **20 more games**: GM, then 18 batch games and the
Stage 3 proof. A fix to the pipeline now saves the same fix 20 times later. It is mostly reading with a
short output, and every later revamp task (2, 4, 6) builds on what it decides.

## Where things stand

- **Stage 0** (SW v264): the engine Intro, readiness, the Line-up, the `mpEnterGame` seam,
  `verify-game-intro.js`, `verify-tv-labels.js`, `capture-screens.js`, `?fps`.
- **LI5 pilot**: S0–S6 built 9 Nov ~21:00 → 10 Nov ~09:20 (SW v265–v269), then owner-playtest fixes
  (v270, v271: Start rules, Auto-assign). That is roughly one evening plus one morning of sessions for a
  pilot that also added a whole new MDLM mode. Only R15 (the owner's phone session) is outstanding.
- **Two new games went world-first since then** and stress-tested the same rules: **E.T.A.**
  (SW v272–v277) and **Hide and Shogun** (SW v278–v289). Their departures are in the tracker's § 6 log.
- **Next:** GM (Stage 2 pilot), then extract `js/lib/scene-kit.js`, write the `sylly-ui-pass` skill and
  run the first departures review (task 4), then the batch.
- The pipeline was written assuming Opus does R1–R3 and Sonnet builds. **That split is gone for this
  run:** Fable does everything (with the optional Sonnet subagent, SKILL.md § 1).

## Pain points (known)

1. **The tracker has drifted.** `docs/ui-revamp-rollout.md` says "0 revamped" and LI5's row reads
   "🔨 3/16 … Next S2", while its own card says S6 is built. **HSG has no row at all**, though its
   departures are logged. The § 2 model line still says Opus/Sonnet. `verify-tv-labels.js` reads the
   Status column, so a careless edit there breaks a harness.
2. **A promotion is overdue.** The beat-scene box sizing (`#game-intro-scene:has(> .x) { aspect-ratio: auto }`)
   has been hand-patched three times (LI5, D-ETA-5, HSG S5). Lessons L10 says "promote at the batch
   boundary: a scene with `beat()` sizes its own box and shows the line, not the speaker". That is an
   engine change.
3. **The headless driver keeps flaking** (L9, seen four times): `ensure()` and the triple seed belong in
   a driver template, not in memory.
4. **There is no cost number per pass.** Sixteen steps and two sign-offs per game, times 20 games, and
   nobody has written down what a pass costs or which steps a batch game can merge or skip.
5. **Untested shapes.** LI5 is a two-team, PTP/TLM/MDLM game. The batch includes hidden-role games (BLD,
   GTH), teams-with-TLM games (SS, DSD), individual-roster games that need the undesigned `'seats'`
   Line-up (JEC, YGI, LTTP, NAT), and no-roster MDLM games (most of the rest). What breaks first?
6. **Each world builds its own scene kit from scratch** (`li5-scene.js` 13 KB, `eta-scene.js` 46 KB,
   `hsg-scene.js` 10 KB). The pipeline says extract on the second use. Has it already happened silently?

## Read first (in this order)

1. `docs/rules/ui-revamp.md`, whole (12 KB).
2. `docs/ui-revamp-lessons.md`, whole (9 KB).
3. `docs/ui-revamp-rollout.md`, whole (15 KB).
4. `docs/superpowers/specs/2026-11-08-ui-revamp-design.md`: §§ 3, 4, 6, 10–13, 17 (Grep for the rest).
5. `docs/superpowers/specs/2026-11-09-li5-pilot-design.md` (53 KB): list its headings first, then read the
   stage breakdown and § 5.12. Don't read it whole.
6. Shape samples, **slices only**: the identity docs' "table shape" and "player's journey" sections for
   `bld`, `ss` and `jec` (Grep the headings in `docs/game-identities/`).
7. Effort data: `git log --format='%ad %s' --date=format:'%d %b %H:%M' --since=2026-11-08` (LI5, ETA, HSG).

**Don't read:** game plugin JS, `docs/code-map.md`, `index.html`.

## The result we want

**Step 1 — review (override block on, SKILL.md § 5).** Write `wip/fable/REVAMP-REVIEW.md` with:
- **At most 5 pipeline changes**, ranked. Each one: the evidence, the exact edit (file + text), its tier.
- **A per-game pass classification**: *full* (world + three directions) vs *light* (world brief, one
  direction, a merged R5–R7), with the reason for each of the remaining games. This feeds tasks 4 and 6.
- **A batch order** grouped by shape, plus the Stage 3 proof candidate (an N-player MDLM game, not CJAR).
- **A cost estimate per pass** (sessions, and which steps dominate), anchored on the LI5/ETA/HSG timelines.
- **What will break** on a game unlike LI5, one paragraph per shape in pain point 5.
- **What only the LI5 phone pass can answer**, so the owner knows what to watch when they play it.

**Owner gate:** list the changes with accept / decline per item and ask in chat. Decline is fine.

**Step 2 — apply (normal rules back).** For each accepted change, one commit per concern:
- reconcile the tracker (LI5 row, an HSG row or a note on why it sits outside, header counts, the model line);
- promote any lessons the owner accepted into `docs/rules/ui-revamp.md` (and `ui-style.md` / `DESIGN.md`
  when a design rule changes);
- if the beat-scene sizing is accepted: the engine change, removing the three per-game patches, plus a
  `verify-game-intro.js` check and a mutant. The scene boxes must look the same afterwards, so measure the
  three Intro scenes at 320×452 / 375×548 / 375×667 before and after (`visual-check`);
- a driver template for `visual-check` (with `ensure()`) if accepted;
- a decision-log entry.

## Verification

`node tools/verify-tv-labels.js` after any tracker edit. If the engine was touched:
`node tools/verify-game-intro.js` + `node tools/mutate-game-intro.js`, `verify-build-fresh.js`, plus the
LI5 / ETA / HSG loopbacks (commands in `docs/rules/harnesses.md`).

## Progress log

*(append: date · what was done · commits · where it stopped · next concrete step)*
