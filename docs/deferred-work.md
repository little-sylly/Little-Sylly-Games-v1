# Deferred Work

**On-demand — not auto-loaded.** The running list of known-but-not-yet-done work: code divergences,
retest backlogs, and audit items that are deliberately parked rather than forgotten. Newest section on top.
Tick items off here; promote anything architectural into `decision-log.md`.

> Replaces `docs/fable-fix-plan.md`, which `logic-engine.md` pointed at but which no longer exists in the repo.

---

## NT allocation preview: canvas renderer looks cruder than the real build grid (added 16 Aug 2026)

`ntDrawLegCanvas` (the allocation screen's maze preview) draws flat rect-fills with a plain 1px
port bar. The real build screen's grid (`nt-build-grid`) is a richer DOM renderer — rounded port
markers with a glow (`box-shadow`), directional arrow glyphs, percentage-positioned. They're two
different renderers for what's conceptually the same maze, and the preview one is visibly plainer.

**Candidate fix:** a read-only variant of the real build-grid renderer (no placement interaction,
since nothing is placed yet at allocation time — only bad sectors, native honeypots, and ports
exist), scaled down via CSS for the small chip-adjacent views. Would also guarantee the preview can
never visually drift from what the player actually builds on, since it'd be the same code path.

**Why not done yet:** raised alongside the D28 fixes (16 Aug 2026) but the screenshot meant to show
the exact defect didn't attach to that session — building a renderer swap without seeing what
"a mess" actually looked like risks solving the wrong problem. Re-raise once a screenshot confirms
whether D28's shifting-animation fix already resolved the visual complaint or whether the renderer
itself still needs replacing.

---

## `.pill` is 39 px tall — under the suite's own 44 px touch minimum (added 16 Aug 2026)

`ui-style.md` § Thumb-Friendly UI mandates a 44×44 px minimum touch target. `.pill` in
`css/styles.css` uses `padding: 0.5rem 0` with `font-size: 0.95rem`, which measures **39 px** —
verified by `visual-check` on NT's allocation screen. **Every pill in every game** has this
measurement: settings pills, how-to tab bars, brush selectors.

**Scoped fix already shipped:** NT's allocation brush pills carry `min-h-11` (NT is a mid-huddle
tool tapped repeatedly against a running clock, unlike a settings pill tapped once).

**Why it is not swept:** this is either a deliberate accepted exception for pills specifically, or a
suite-wide gap in a rule the project states plainly — and picking between those is a phase-gate call,
not something to decide inside a single game's round. Changing `.pill` itself alters the vertical
rhythm of every settings overlay and every how-to tab bar in 18 games, so it also wants a
`visual-check` pass rather than a blind CSS edit.

**When picked up:** decide the rule first (exempt pills, or raise `.pill` to 44 px), record it in
`ui-style.md` either way — the current state, where the rule says 44 and the shared class says 39,
is the actual problem.

---

## NT allocation screen — ~350 px of dead space (added 16 Aug 2026, mostly closed same day)

`screen-nt-allocation` is on the legacy `h-screen` sticky-footer whitelist (`ui-style.md`). The
original cause (the bridge strip fitting all legs at small cell, per `nt-implementation-notes.md`
D25) was superseded the same day by D26's windowed leg viewer — the maze now renders at a fixed
324×324 px regardless of team size, which absorbs most of the gap as a side effect of an unrelated
legibility fix (owner feedback on a live session, not a deliberate fix for this item).

**Still outstanding:** the huddle countdown is a small eyebrow in the header
(`#nt-alloc-header`, written by `ntStartHuddleTimer`) rather than using any of the space the maze
doesn't fill at 1v1/2v2. Low priority now that the screen reads as intentional rather than sparse.

---

## `verify-cjar-loopback.js` is FLAKY — fails ~1 run in 3 (added 15 Aug 2026)

**Not a regression.** Found incidentally while running the full harness suite after the NT work;
`git status` confirms neither `tools/verify-cjar-loopback.js` nor `js/games/cjar.js` was touched
that session. Reproduced by running it 6–8 times in a row.

**Symptom:** always the same two checks, in the Dibber Dobber payout-beat section:
`host2 threw the exact split token count` / `client2 threw the exact split token count`.

**Cause:** the harness stubs `shuffle` with the real Fisher–Yates over an **unseeded**
`Math.random()` (deliberately — an identity stub would deal a family-first deck that busts on flip
2 every time, per its own comment). So the deck order differs every run, and those two checks
assert an *exact* token count that depends on how many seats take vs. dob on that particular deal.

**Why it matters beyond CJAR:** a suite where one harness fails a third of the time trains everyone
to re-run until green, which is how a real regression gets waved through. It also means the "222
green checks" figure quoted in `CLAUDE.md` was never reliably 222.

**Fix shape (not done here — different game, and it changes what 177 checks exercise):** port the
seeded mulberry32 + `*_SEED=` env hook from `verify-shp-loopback.js` / `verify-nt-loopback.js`, then
run across several seeds to find which assertions were only ever passing by luck. Expect the two
failing checks to need rewriting as an invariant (`tokens === takers`, computed from the same deal)
rather than a literal — the NT harness hit exactly this and the fix was to *construct* the
precondition instead of hoping for it (`nt-implementation-notes.md` D21, lesson 1).

---

## BUG-06 re-sweep by payload SHAPE, not by applier line (added 15 Aug 2026)

The 13 Aug BUG-06 sweep declared NT clean; two days later NT turned out to be carrying **two more
instances of the same class**, both of which that sweep's method could not have found. Its search
shape was "appliers that assign a payload field straight to a state collection without `|| []`" —
which is blind to a collection **nested inside** an assigned object. `ntNode = payload.node` reads
as clean; the erased field was `node.nativeHoneypots`, one level down. `ntPtpTimelines =
payload.timelines` likewise; the erased fields were `timelines[i].fires` / `.slowSpans`, two levels
down. Detail + the corrected method: `shared-implementation-notes.md` BUG-06 addendum.

**What to do:** for each game, walk the payload tree the *producer* builds for every SYNC packet and
list every leaf array/object, then ask of each "can this legitimately be empty when it is sent?".
Two tells that a leaf is at risk: its length is decided by a random roll or by a player doing
nothing; and the same field is guarded with `|| []` *somewhere else in the file* — an inconsistent
guard means someone already hit the empty case on one path and patched only that one.

**Candidates, in priority order:** PKO, FLW, SHP, CJAR (all broadcast nested per-seat objects), then
GTH / DSD / JEC / LTTP. Note that CJAR/FLW/SHP each have a loopback harness that would catch a
regression once written; PKO does not, and PKO's per-seat hoard packets are the closest structural
match to what bit NT.

---

## ~~NT (Net-Trace) MDLM 3-player desync~~ — **RESOLVED 15 Aug 2026**

Root-caused by static analysis, reproduced deterministically, fixed, and harnessed. All three
defects were client-only (the host never round-trips its own state through the wire, so the
host-side view was correct throughout — which is why it read as a mystery):

- **BUG-15** — blank build grid: `nativeHoneypots: []` erased in flight, two unguarded *render*
  reads throwing per grid cell. Intermittent because `convertN` is re-rolled each cycle;
  **deterministic** under the "Native Honeypots: 0" setting.
- **BUG-16** — playback never reached clients: `timeline.fires: []` erased, `ntRenderFrame`
  reading it unguarded.
- **BUG-17** — the `--.--%` summary: MDLM's leaderboard was gated behind
  `syllyMultiplayerMode === 'single'` and never rendered at all.

New harness `tools/verify-nt-loopback.js` (119 checks, host + 2 clients, Standard + DNP) reproduces
all three. Detail: `nt-implementation-notes.md` BUG-15/16/17, D21.

**Still open from that session, unchanged:** the `mpConfirmRoster` late-join race (BUG-07,
`shared-implementation-notes.md`) — the guard added there stops a mis-joined device corrupting
state, but does not close the race itself; and a **real 3-device retest** is still required, since
no harness models clock skew, Firebase ordering or dropped packets.

**Two smaller items surfaced while building the harness, neither fixed:**
- `ntRoutingTimer` is the one timer handle missing from `ntResetState()` — a pending 700/1200 ms
  `ntSetRouting('valid')` can fire against the next screen (§ Timer Lifecycle).
- The DNP allocation appliers (`NT_ALLOCATION_UPDATE` / `_LOCK`) validate the sender's **team** but
  never that the sender is that team's **captain**, so any client on a team can drive its
  allocation. Current behaviour is pinned by a check in the harness labelled `KNOWN GAP` so a
  future change is visible rather than silent.
- `NT_GAMEOVER`'s applier calls `ntShowMatchSummary()`, which does not exist anywhere in the repo.
  Nothing sends that packet so it is unreachable in play; also pinned as a `KNOWN GAP` check rather
  than "fixed" by inventing a function for dead code.

---

## NT (Net-Trace) MDLM 3-player desync — original symptom report (superseded by the entry above)

**What was observed, live-testing 1 host + 2 clients:** round 1's build screen ("Vulnerability
Simulation") rendered a completely empty grid for both clients (header/timer/counters all correct,
`#nt-build-grid` itself had zero tiles) while the host's rendered fine; round 2 was fine for all
three; after round 1 resolved, only the host reached the playback screen — both clients stayed
stuck on "Submitted…" until the host manually clicked "Next Cycle" (now readyCheck-gated, see
below — but this doesn't explain the earlier bare-"Submitted" hang; the bug is upstream of the gate
itself); one client's cycle-boot terminal log was missing its "LOADING SIMULATION N/M…" context
line entirely (present for the host and the other client, on the exact same code path — see
`ntShowMdlmGate()`) while its "LOGIN:" line still rendered, which by itself rules out the line
simply being absent from the array passed to `ntPlayGateBoot`; by round 4 the SER stopped
resolving (`--.--%`, no per-player scores) even though System Logs still had correct data; round 5
broke again for the two clients.

**Kept only as the symptom record** — every one of these is accounted for by BUG-15/16/17 above.
The session that logged this also fixed a genuine, separate defect found by inspection: the
Diagnostic Summary's "Next Cycle" was a client no-op (`if (mode === 'client') return;`) with no
readyCheck, so the host advanced everyone unilaterally; that is now `ntSummaryReadyCheck` +
`NT_SUMMARY_READY` (`nt-implementation-notes.md` D20).

**One symptom to re-check on the retest:** "one client's boot log was missing its LOADING
SIMULATION line while its LOGIN line rendered." The harness asserts all three devices type
identical boot lines bar `LOGIN:` and that passes on every seed, so this was **not** reproduced.
Most likely it was the blank-grid throw landing mid-typewriter on that device rather than a
separate defect — but it is the one reported symptom without a confirmed cause, so watch for it
specifically rather than assuming it went away with the rest.

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
