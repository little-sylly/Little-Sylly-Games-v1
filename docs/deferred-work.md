# Deferred Work

**On-demand — not auto-loaded.** The running list of known-but-not-yet-done work: code divergences,
retest backlogs, and audit items that are deliberately parked rather than forgotten. Newest section on top.
Tick items off here; promote anything architectural into `decision-log.md`.

> Replaces `docs/fable-fix-plan.md`, which `logic-engine.md` pointed at but which no longer exists in the repo.

---

## Retest backlog — the older games (added 1 Aug 2026)

**Owner's note:** the suite has picked up a lot of cross-cutting change since the early games shipped —
the Stack layout sweep, the Motion Standard + reduced-motion block (SW v148), and the asset-pack render seams
and core art tier. The early games were built before most of it and have not been replayed since.

**Scope:** every game shipped before the current phase, replayed on a real device — not a code audit, an
actual play. Priority order is roughly oldest-first, since they have accumulated the most drift:
LI5 → Great Minds → Secret Signals → JEC → YGI → LTTP → Natural Selection → Deep-Sea Deploy → Bailed →
Group Therapy → The Bluff → Pass → Net-Trace → Fruit Salad → Counting Sheep → Flawless.

**What to check per game** (beyond "does it still play"):
- Reduced motion — DevTools → Rendering → emulate `prefers-reduced-motion: reduce`; nothing should travel,
  and nothing should be left stranded on screen (the `animationend`-cleanup trap, see `ui-style.md` § Motion Standard).
- Stack compliance — any screen looking sparse or edge-pinned that is **not** on the legacy `h-screen`
  whitelist in `ui-style.md` is a new bug.
- The per-game values in `ui-style.md` § Per-Game Reference actually match what renders.
- Sylly Mode reachable and working (all 17 games have one).

**Log findings** in each game's `docs/implementation-notes/[abbr]-implementation-notes.md` as they surface,
not in a batch at the end.

---

## Smaller flagged items

- **Decision Modal button sizing diverges in four games** (found 3 Aug 2026 while checking cjar's).
  `ui-style.md` § Quit Overlay Checklist now specifies `min-h-14 … text-lg` for both buttons in a quit or
  play-again modal; it was previously unstated, which is how three variants shipped. **FLW** and **PASS** use
  `min-h-11`/`text-sm` on both; **GTH** and **BLD** use a mismatched pair (`min-h-14 text-xl` confirm +
  `min-h-11 text-base` cancel). Conforming: SHP, FRT, NT, DYB, PKO, CJAR. 8 buttons across 4 games — low risk,
  but do it via a scoped Node script, never a broad Edit (index.html mojibake). Owner deferred the sweep out of
  a Cookie Jar session.
- **A suite-wide audit for the BUG-06 class has not been done.** Firebase erases `null`/`{}`/`[]`, so any game
  assigning a raw payload collection in a SYNC applier can strand a client. cjar is fixed and the rule is now in
  `logic-engine.md`; the other 17 games reach the same protection informally via `p.x || []` but have not been
  checked field by field. Worth a Protocol A pass. Detail: `cjar-implementation-notes.md` BUG-06.
- **A card gallery exists only for CJAR** — and as of 3 Aug 2026 it is **the second tab of How to Play**
  (`The Rules | The Cards`), not its own overlay; `ui-style.md` § How-to Overlay Standard now carries the
  optional tab-bar pattern, with the rule that teaching material earns a tab while a mid-play reference (PKO's
  chain) keeps its own overlay. cjar's offline install check **passed** on this route. FLW, SHP, FRT and PKO
  have the same need and the same render seam and still have none — their core-art offline check still needs a
  running match. The shape is now proven; copying it is a per-game job. PASS is the awkward one — 54 playing
  cards. Detail: `cjar-implementation-notes.md` DD-14.
- **The settings dynamic-value line (DD-13) is implemented only in CJAR.** `ui-style.md` § Settings Card
  Standard requires it wherever a pill option encodes a concrete value not visible in its label — durations,
  counts, thresholds. The other 17 games have not been swept, and at least some will have the same gap cjar had
  (a value the player can only learn by playing). Deliberately not folded into a playtest-fix batch. Detail:
  `cjar-implementation-notes.md` DD-13.
- **GTH Play CTA contains an emoji** ("Start the Session 🛋️"), violating the "CTA start-game buttons must not
  contain emoji" rule in `ui-style.md` § Settings Card Standard. Reconcile at the GTH retest.
- **FLW how-to step labels** use inline `style="color:#E879A8"` where every other custom-colour game uses its
  `[abbr]-label` class (PKO uses `pko-label`). Cosmetic consistency only — it renders correctly.
- **`docs/archive/` is not empty** — it holds `phase-audit-2026-06-30-snapshot.md`, while `CLAUDE.md` describes
  the directory as empty by design with snapshots kept out-of-repo. Either move that file to the external
  archive or amend the claim.
