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

~~**DD-31's same-screen button-parity rule was applied only to CJAR**~~ — **RESOLVED, 9 Aug 2026.**
  All 18 games now conform: 17 game-menu "← Back to the Box" buttons and 9 gameover-screen
  secondary exit/leave buttons resized to match their screen's primary CTA (height, text size,
  weight). Applied via a scoped Node script, id-targeted. Detail: `docs/decision-log.md` 2026-08-09.

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
~~**A suite-wide audit for the BUG-06 class has not been done.**~~ — **RESOLVED, 13 Aug 2026.** Explore-agent
  swept every game's SYNC applier; found and fixed three live-risk unguarded collections — **LTTP**'s `lttpDecoys`
  (a guaranteed crash: every match reaches zero decoys), **GTH**'s `gthAllDiagnoses[i]` (a timed-out player sends
  `[]`), **NT**'s `ntPtpPlacements` (a zero-inventory cycle holes the array) — plus hardened DSD, JEC, and PASS
  (lower risk, no live-play trigger found, same unguarded shape). GM/BLD/SS/DYB's remaining unguarded assigns were
  judged structurally non-empty and left alone; FRT/SHP/FLW/PKO already had the CJAR-pattern normalisers. **None
  of the six touched games have a `tools/verify-*.js` harness**, so these fixes are syntax-checked only, not
  regression-tested or played live — flagged for the retest backlog. Detail: `shared-implementation-notes.md` BUG-06.
~~**PKO's Chain diagram/animals list kept its own overlay**~~ — **RESOLVED, 10 Aug 2026.** Folded into
  `pko-how-to-overlay` as tabs 2–3 (`The Rules | Diagram | Animals`); the old two-tab `pko-chain-overlay` is
  gone. This also retired the "mid-play reference keeps its own overlay" carve-out in `ui-style.md` — see
  `decision-log.md` 2026-08-10. Detail: `pko-implementation-notes.md`.
~~**A card/reference gallery exists only for CJAR and PKO.**~~ — **RESOLVED, 10 Aug 2026.** FRT
  (`The Rules | The Fruit`), SHP (`The Rules | The Cards`), FLW (`The Rules | The Gems`) and DYB
  (`The Rules | The Dice`) all gained one, so **six of the seven render seams now have a gallery** and the
  core-art offline install check is a single-device job everywhere it applies. FLW's was a *fold*, not a new
  build: its standalone `flw-gems-overlay` Gem Manifest became tab 2 and was retired, same move PKO's chain
  overlay made — and converting it to `flwRenderCard` fixed a real defect, since the old swatch-circle markup
  meant no skin could ever reach it. Every tile is now tappable-to-enlarge via the new engine-owned art viewer
  (`ui-style.md` § Pattern 2a). **PASS remains the one exception** — 54 playing cards make a tile grid a poster
  rather than a reference, and it has no core art to verify, so nothing is currently unverifiable. Detail:
  `docs/decision-log.md` 2026-08-10, `docs/art-authoring-guide.md`.
~~**Round/Night Intro Screen sweep**~~ — **RESOLVED, 13 Aug 2026.** `ui-style.md` § Round/Night
  Intro Screen (added 12 Aug 2026) says any game where the same phase repeats several times a match
  should show a short auto-advancing intro at the start of each repetition, rather than jumping
  straight from "deal" into an already-live table. Implemented where a genuine gap existed: CJAR
  (precedent) → SHP → **PKO** (`screen-pko-clash-intro`) → **NAT** (`screen-nat-habitat-intro`) →
  **PASS** (`screen-pass-intro`). Investigated and correctly ruled out where the pattern didn't
  apply: **GTH** (Session doesn't repeat within a match; Patient Phase and Shrink Phase already
  have their own equivalents or would be actively harmed by a forced pause) and **DYB**
  (`screen-dyb-shake` already shows "Shake #N" as the actual roll interaction — an interactive
  equivalent, not a gap). SW bumped v178 → v181 across the four additions. **None of PKO/NAT/PASS
  were verified beyond harness/syntax level** — no `visual-check` pass, no live play; NAT and PASS
  additionally have no `tools/verify-*.js` harness at all. Detail: `pko-implementation-notes.md`
  DD-26, `nat-implementation-notes.md`, `pass-implementation-notes.md`, `dyb-implementation-notes.md`.
~~**The settings dynamic-value line (DD-13) is implemented only in CJAR.**~~ — **SWEPT, 13 Aug
  2026.** Explore-agent audited every other game's settings overlay for pill groups encoding a
  concrete value not visible in the label. Found the gap was narrower than expected — only
  word-difficulty pills, and only 7 games: **JEC** (Menu Complexity — the static description also
  named three DIFFERENT tier names than the pills show, a real copy bug fixed in the same pass),
  **GTH** (Symptom Severity), **LI5** (Report Card), **NAT** (Field Difficulty), **DSD** (Sea
  State), **LTTP** (Party Destination), **SS** (Encryption Protocol). Every duration/count/
  threshold pill elsewhere in the suite already states its value on the pill itself or in the
  static description, or had already independently built the DD-13 shape under a different name
  (GM's `*-desc` elements, DYB's `dyb-wildcards-desc`, SHP's `shp-val-moons`, PKO's `pko-val-law`,
  GTH's own Diagnosis Window). BLD has no pill groups at all. **Not verified beyond syntax/encoding
  checks** — no `visual-check` pass, no live play. Detail: `shared-implementation-notes.md` DD-13
  sweep.
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

~~**CJAR — the Dibber Dobber payout beat mis-narrates one branch**~~ — **RESOLVED, 13 Aug 2026.** Added
  the missing `takers.length && innocents.length` branch in `cjarBeginFlipAnim` (`js/games/cjar.js`),
  ahead of the plain takers-only branch it was previously falling into — takers and innocents both now
  fly a token down, none flies left, matching the scare-off's real behaviour (the pool never sits in the
  pile when a Dobber is absent). Presentational only; `verify-cjar-dd.js` (47 checks) and
  `verify-cjar-loop.js` re-run clean, confirming the resolver logic itself was never wrong.

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
