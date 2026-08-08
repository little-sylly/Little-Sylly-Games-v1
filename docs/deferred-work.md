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

- **DD-31's same-screen button-parity rule has only been applied to CJAR.** `ui-style.md` §
  Universal Menu Standard now requires every same-screen button pair (a menu's Play CTA vs its
  Back to the Box, a gameover screen's primary vs its Leave/secondary option) to match in size
  and weight — no "navigation is smaller" exception anymore. The other 17 games' menu and
  gameover screens have not been audited against this. Same shape as the Aug 2026 action-button
  emoji sweep: grep both `index.html` and `js/games/*.js` (a JS-built label is exactly as much
  a same-screen button as static markup — that sweep's own lesson). Detail:
  `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` DD-31.

~~**Action buttons carried decorative emoji suite-wide, and two had drifted off-brand colour**~~ —
  **RESOLVED, 7 Aug 2026.** New rule: `ui-style.md` § Action Button Standard (Play CTA / Decision Modal
  confirm-cancel / primary in-game submit-decision buttons — no emoji, colour must be brand/neutral/destructive-
  red). Swept in **two passes**, because the first missed a whole class of buttons: pass 1 covered static
  `index.html` markup (~80 buttons); pass 2, triggered when CJAR's in-game Take/Play Innocent/Dob/Sneak Out
  buttons turned up still carrying emoji, covered `js/games/*.js` labels set via `.textContent`/
  `createElement('button')` (46 more sites across 14 files — mostly the "Restart in Lobby 🔄" play-again
  confirm, which every MDLM game sets dynamically per multiplayer mode, so it was invisible to a static-HTML-
  only grep). 2 colour mismatches also fixed — DSD's `btn-dsd-sabotage-confirm` (was JEC's amber, now DSD's
  cyan) and SS's `btn-ss-to-intercept` (was neutral stone, now SS's teal). SS's `btn-ss-splash-phase2` stays red
  deliberately — an interrupt/alert screen whose own copy ("Urgent mission received…") justifies it, the one
  documented exception to the colour rule. **Lesson folded into the rule itself:** any future action-button
  audit must grep both `index.html` and `js/games/*.js` — a JS-set label is exactly as much an "action button"
  as static markup. Detail: `decision-log.md` 2026-08-07.

~~**Decision Modal button sizing diverges in four games**~~ — **RESOLVED, 7 Aug 2026.** FLW, PASS, GTH, and
  BLD's quit/play-again buttons (8 total, PASS's new-deal confirm was already conforming) now all use
  `min-h-14 … text-lg` per `ui-style.md` § Quit Overlay Checklist. Applied via a scoped Node script (occurrence-
  count-asserted string replacements), never a broad Edit. GTH's and BLD's confirm buttons still use `bg-red-500`
  rather than their brand colour — that's a separate, deliberate "destructive action" colour choice, left for
  the action-button colour sweep (see below) to confirm or correct.
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
~~**FLW how-to step labels**~~ — **RESOLVED, 7 Aug 2026.** They used inline `style="color:#E879A8"` (rose-pink,
  FLW's primary brand) rather than a class. The pre-existing `.flw-label` class was **not** reusable here — it's
  already taken for FLW's secondary Exhibition-gold accent (`#C9A227`, used on the gem-vault count). Added a new
  `.flw-step-label { color: #E879A8; }` and swapped all 7 inline-style sites to it — no visual change, same
  colour, now class-based like every other custom-colour game.
~~**GTH Play CTA contains an emoji**~~ — **RESOLVED (stale), Aug 2026.** The code already reads "Start the
  Session" with no emoji; only `ui-style.md` Table B and an audit-flag note were out of date. Both corrected.
~~**`docs/archive/` is not empty**~~ — **RESOLVED (stale), Aug 2026.** `CLAUDE.md` § Current Focus already
  documents the one file it holds (`phase-audit-2026-06-30-snapshot.md`) — the "empty by design" claim this
  item pointed at no longer exists in the doc. No action needed.

**CJAR — the Dibber Dobber payout beat mis-narrates one branch** — *flagged 8 Aug 2026 by the action-stage
  rework's final review; presentational only, no state impact.* The 900 ms payout beat in
  `cjarBeginFlipAnim` mirrors `cjarResolveFlipDD`'s divisor in four of five Sylly shapes. The fifth —
  **takers ≥ 1 + innocents ≥ 1 + no dobbers** — is still wrong: the resolver splits the card among the
  takers, and then the **scare-off** (`cjar.js`, "runs LAST so an all-innocent flip absorbs its own
  contribution") drains the whole Crumb pool, this card's remainder included, straight out to the
  innocents. So the beat throws a leftward token for a remainder that immediately leaves, and shows
  nothing for the innocents' gain. Same class as BUG-11 (the all-innocent case, fixed 8 Aug), one branch
  over, and structurally out of reach of that fix's `else if`. Worth folding in whenever the beat is next
  touched; the fix is a fifth branch keyed on `innocents.length && !dobbers.length && takers.length`.

**CJAR — Dibber Dobber's Innocent-leaning archetype wins ~52% (DD-06)** — *open balance flag, deliberately
  not acted on; moved here from `CLAUDE.md` § Current Focus 9 Aug 2026 to stop it loading every session.*
  `simulate-cjar-dd.js` measures ~52% at both 5 and 8 players, a 33–38 pt spread against a ~12 pt
  threshold. Diagnosed to the **scare-off**: Play Innocent never pays on a Caught! card *and* sweeps the
  whole Crumb pool whenever no Dobber is present, while Dob is punished hard enough to be under-played.
  Not retuned on purpose — changing a number pre-playtest leaves nothing to compare against, and DD-17's
  flip-1 float was re-measured against this exact baseline (5p 34.3 → 31.4 pts, Innocent 53.5% → 51.4%)
  and landed inside the noise band, so the flag is untouched. If a lever is ever needed the candidates
  are the scare-off's unconditional full-pool sweep and the Dob backfire severity — **not** the Treat
  rule, which a mechanism probe disconfirmed.
