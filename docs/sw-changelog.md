# Service Worker Version Changelog

Historical SW release notes, moved out of `CLAUDE.md` (1 Aug 2026) so they stop loading into every session.
The **current** version and its notes stay in `CLAUDE.md` § Current Focus — append the outgoing entry here on each bump.


## v214 — Lobby keycap treatment + Release/Colour sort toggle (30 Aug 2026)

`#screen-lobby`'s 18 game buttons now carry a colour-agnostic `.key-cap` class — micro-gradient + layered shadow, a
composited `transform`-only press that sinks 3px like a real key — needing no per-game CSS since the
gradient/shadow sit over whatever background each button already sets. A new `#btn-lobby-sort` (✨)
toggles the list between **Release** order (default, the shipped DOM order) and **Colour** order
(`LOBBY_COLOUR_ORDER`, a hand-picked hue walk from LI5 pink), via `style.order` — never a re-render,
since each button is bound by its own plugin at parse time and a rebuild would drop all 18
listeners. Sort mode is memory-only. Verified in headless Chromium: all 18 render the treatment,
subtitle/sort row don't overlap, sort reorders and restores exactly, press genuinely sinks. This is
Tier-1 polish on the **original** lobby only — the separately-discussed 4-mode redesign
(Original/Shelves/TV/Premium) is parked pending art direction. Detail: `shared-implementation-notes`.


## v213 — Sound overlay: System Sounds gets its own ON/OFF, and a tap-hold mutes without opening it (28 Aug 2026).

The effects "Volume" block now mirrors Music exactly — its own toggle
(`#btn-global-sfx-toggle`), its own slider-row, ON by default — so a player can silence cues without
losing music or vice versa (`sfxEnabled`, every `play*()` guard now `isMuted || !sfxEnabled`, except
`playSliderTick`, which still bypasses both by design). Every `.btn-open-sound` icon now also
answers a 500 ms **tap-hold**: toggles `isMuted` directly, no overlay — wired via the shared
`bindCardHold` with a per-button flag that suppresses the click a fired hold leaves behind, so a
normal tap still opens the overlay. Verified in headless Chromium: SFX-off genuinely suppresses
oscillator creation, hold-to-mute and hold-to-unmute both work, a quick tap still opens the overlay.
Detail: `shared-implementation-notes`.


## v212 — Background music: the suite's first audio files (28 Aug 2026).

`js/lib/music.js`
resolves a looping track per game from `data/music/manifest.json`, two-tier: the game's own track,
else the **lobby** theme — so a game without music is never silent and a new game inherits one free.
Driven by **one seam** (`showScreen` → `Music.playFor(activeGameId)`); no plugin has music code.
Tracks are **runtime-cached like `data/packs/`**, so a new one ships by dropping an mp3 in and
adding a manifest line — no `sw.js` edit, no version bump (ceiling ~1.5 MB/track). Music has its own
toggle + slider in `#sound-overlay`, ON at 30% by default; global Mute All still outranks it.
Effects stay synthesised. Detail: `shared-implementation-notes`, `docs/decision-log.md`.


## v211 — Just Enough Cooks reworked: real decisions in standard play, Kitchen Nightmares retired (27 Aug 2026).

JEC's base game was one guess repeated; it now carries three decisions —
a **Signature Dish** you tap to back (double, and only inside the Golden range — the code had been
doubling any positive score), **The Crutch** (predict the table's most-picked cliché; never one of
your own three, and never entered into the pot), and **Special Instructions** (twenty twists that
bend the Order rather than punish the answer). The Sifting splits into a **blind** Sous Chef's Check
then The Tasting: merges are now decided before anyone can see what one is worth. Sylly Mode becomes
**Fusion Cuisine** — two Orders, one dish, and a name vote where ties all pay. Bug **J2** closed at
all three sites. Two new harnesses (`verify-jec-loop` 77, `verify-jec-loopback` 164) — JEC had
none. Detail: `jec-implementation-notes`, `docs/decision-log.md`.


## v210 — lobby bounds are constants, the quit contract covers TLM, and the declarations layer finally has a harness (23 Aug 2026)

Two recurring bugs from the identity-doc pass, both
cross-cutting, both invisible to all 14 rules harnesses. **(1)** `getMaxPlayers`/`getMinPlayers` are
read only while a room fills — before the game shows a screen — so five games (SS, JEC, YGI, LTTP,
DSD) resolved theirs against a setup variable still at its default, capping rooms below their own
Pass-the-Phone range; now constants. Raising SS/DSD to 3v3 exposed that nothing ever checked team
balance (3v2 confirmed; 4v0 too) — new `rosterConfig.requiresBalancedTeams` gates the host CTA and
the roster screen. **(2)** Eight games had no mid-game quit teardown; the rule was titled *MDLM*, so
the two TLM games (LI5, DSD) read past it. It is now § Mid-Game Quit Contract, covers every lobby
session, and is satisfied by one generic helper `mpNotifyPlayerLeft()`. **Scope grew on evidence
twice** — the identity pass named 5 quit games and 4 bounds games; grepping the shape found 8 and 5.
New `node tools/verify-mp-configs.js` (18 games) fails on pre-fix `main` via `MP_SRC=`. Detail:
`shared-implementation-notes` ML-01…ML-04, `docs/decision-log.md`.

## v209 — NT's honeypot is a pure cooldown gate, FOOTPRINT-based; 111378/64472 CLOSED (20 Aug 2026)

Three fixes from one Debug Mode session, worst corpus error **20.80% → 2.81%**. **(1)**
191490's recorded hits were `[2,2,2]`, not owner-confirmed `[3,2,2]` — v208's "refresh" branch was
fitted to a gap pattern that only existed under the wrong count; `checkFires` is now a pure
`elapsed >= lastFire[i] + NT_HONEYPOT_DURATION` gate, no entry/exit branch. **(2)** D45's Minkowski
rejection tested footprint-distance at the wrong (centre-model) radius; at its own radius (2×√2,
"2 tiles from the block's corner") it reproduces 48154/97877 too — AoE is now footprint-based, disc/
ring redrawn to match. **(3)** `nt-maze-transcribe.js` had ingress/egress backwards on some boards —
assigned by edge-scan order, not by reading which marker is the finish. 111378 (owner-verified against
their own Debug Mode rebuild) and 64472 both had this exact bug: **−10.3%→+0.25%, −20.2%→+0.67%** —
the two boards flagged "genuinely open" since D45 were bad input data, not a routing/AoE gap. `72000`
reads the same unambiguous marker but flipping it made the fit worse — left alone, unresolved.
6/6 trigger counts still MATCH, harness 417 green. Detail: `nt-implementation-notes` D46/D47/D48,
`docs/deferred-work.md`.

## v208 — NT's honeypot REFRESHES in place; the Minkowski AoE is dead (19 Aug 2026)

Both from one new reference: the owner's 191490 daily, screenshotted at each of its **six** triggers
(`maze-puzzles/slow model/saturated board/`). Three ice blocks, two triggers each, and the pair on
each block is **29,727 / 30,114 / 29,727 ms** apart — the slow duration, identical to the millisecond
on two blocks. v207's entry-only rule cannot produce that; a block re-arming on its own expiry
produces it by construction. `checkFires` now also fires when a block's window expires with the
runner still inside. All five recorded trigger counts still reproduce; only 64472 moves (−22.9% →
−20.2%). The same evidence **independently re-confirms `NT_HONEYPOT_DURATION = 30000`** (previously
fitted to scores alone) and **falsifies the Minkowski AoE** — distance-to-footprint breaks 48154 (2+2
vs 2+1) and 97877 (2+1+2 vs 1+2+1); at the radius that restores the counts it reproduces the same
shortfall. `--contact` now splits the two open boards apart: 111378 misses by 8 points (geometry's
size), 64472 by **38** — a route or transcription problem, not an AoE one. Harness 417, green on four seeds (0/7/101/4242). Detail: `nt-implementation-notes` D45, `docs/deferred-work.md`.

**Superseded one day later by v209 — the "two per block" reading behind this entry's headline claim
was wrong** (191490 is actually 3+2+2, not 2+2+2), which knocked out the entry-triggered-plus-refresh
rule's own justification. See v209.

## v207 — NT port mouths never truncate; the honeypot fires on AoE ENTRY (19 Aug 2026)

Two findings from the same maze.game reference set. **Ports:** a mouth is always two edge-units. At a
corner maze.game either sits FLUSH (both units along one edge) or WRAPS (one unit on each edge,
one tile); NT collapsed both to a single unit, so a door against a corner could not be authored.
`ntMouthIdxs` now clamps idx to `len-2` and takes an opt-in `corner` flag; tapping a corner in the
Node Editor **cycles** wrapped → flush → flush; both renderers draw the L, and the canvas bar now
spans the real mouth instead of the fixed one tile it always drew. **Honeypot:** the owner's
screenshots recorded maze.game's on-screen trigger counts, and on all five they equal the route's
**AoE-entry count** — so the 35 s cooldown was suppressing real re-triggers (the missing quad hit).
Firing is now entry-triggered with hysteresis, and `NT_HONEYPOT_DURATION` refits to **30000**: the
five verified boards land within **−3.2…+2.7%** and every trigger count reproduces exactly.
Harness 372→**418**. Two boards remain 14–23% short — open. Detail: `docs/decision-log.md`
2026-08-19.

## v206 — Net-Trace movement calibrated against maze.game (19 Aug 2026)

NT scored 5.6–7.5% below the reference game. Six maze.game boards were transcribed from
screenshots and scored tile-for-tile, isolating the cause to a **missing corner cost** — a taut
polyline is not self-timing. `ntComputeTimeline` now charges 235 ms per 90° of turning
(`sin(θ/2)`-weighted, maze corners only, spread over 0.4 tiles as a braking ramp). The three plain
reference boards now match to **±4 ms**. Tile time, the entry/exit stubs and the honeypot AoE were
all confirmed already correct. Slow-block re-trigger behaviour still diverges — deferred. Detail:
`docs/decision-log.md` 2026-08-19.

## v205 — Fredoka self-hosted; always-loaded baseline trimmed (19 Aug 2026)

The brand font now
ships from `fonts/` (34 KB, variable, precached) instead of Google Fonts, so it renders offline —
the long-standing "deliberate offline exception" is deleted from every rule file, and the app now
has zero runtime third-party dependencies. Same round cut the baseline paid every turn
(**44.7k → 36.8k, −18%**): `CLAUDE.md` and `ui-style.md` keep every rule, while the history behind
them moved to `sw-changelog.md`, `decision-log.md`, the impl-notes, and the new on-demand
`docs/rules/per-game-classes.md`. Detail: `docs/decision-log.md` 2026-08-19.

## v204 — `ntGenerateNode` made rectangle-aware; Randomise Topology no longer un-rectangles a Debug sandbox (19 Aug 2026)

Closes the one item v203 deliberately left open. `ntGenerateNode`
gained an optional third param, `forcedDims = { w, h }` — every internal axis that used to read
one shared `ntMatrixScale`-derived `n` (the occupied-cell grid, the block-anchor rolls, the DNP
port-idx rolls, the pathological fallback) now reads `w`/`h` independently; the standard match and
DNP never pass `forcedDims` and are unaffected (still square). `ntAuthRandomiseTerrain` passes the
sandbox's own `{ w: ntNode.w, h: ntNode.h }`, so a 16×20 board stays 16×20 across a re-roll instead
of silently resetting to 18×18. Verified live in a real browser (not just the mock-DOM harness) —
before/after screenshot confirms the rectangle survives and both terrain and ports re-roll inside
it. New harness section exercises exactly what deferred-work.md said was missing: all three
rectangular shapes (16×18, 16×20, 20×16) call `authRandTerrain()` and assert dimensions + a
repainted `w×h` grid, not the square default — confirmed RED against the pre-fix code via
`NT_SRC=` before going green. `verify-nt-loopback.js`: 364 → **373**.

## v203 — NT Debug Mode's attempt log: PTP keeps EVERY seat's full history, ports re-roll, two labels renamed (19 Aug 2026)

Third round on the attempt-log feature (v201/v202), from a
live 2-player PTP playtest. `ntDebugAttemptsBySeat[playerIdx]` stashes each finished PTP seat's
full history instead of discarding it at hand-over — PTP is one device with zero network cost,
so unlike MDLM (genuinely separate devices) there was no reason to throw it away; `ntDebugAttemptsFor(playerIdx)`
is now the single lookup both the log renderer and the playback opener call. `ntAuthRandomiseTerrain`
stopped restoring the hand-authored ports after a re-roll (owner wants "Randomise" to mean a full
re-roll). Renamed to fit NT's network-engineering register: `Randomise Terrain` → **Randomise
Topology**, `Randomise Budget` → **Randomise Resources**, `Firewall/Honeypot Budget` →
**Firewall/Honeypot Resources**. `verify-nt-loopback.js`: 342 → 356 → **364**. Design doc:
`docs/superpowers/specs/2026-08-18-nt-debug-attempt-log-design.md`. Detail:
`nt-implementation-notes.md` D50–D52.

## v200 — NT two-unit ports with single-unit corners CLOSED (18 Aug 2026, Phase 2)

A
seven-task refactor made a relay-leg node's ingress/egress two tiles wide instead of one, so a
player can narrow their OWN door without sealing it, derived entirely from the existing
`{ edge, idx }` port record with no wire/packet change. `verify-nt-loopback.js` was at 342 checks,
8/8 seeds green. Detail: `nt-implementation-notes.md` D47–D49; `docs/decision-log.md`.

## v199 — NT Debug Mode's rectangular grid CLOSED (18 Aug 2026)

A five-task dual-write refactor (Phase 1) converted the Node's geometry from a single square `n` to
independent `w`/`h` across the whole geometry core — pathfinding, ports, footprint clamps,
rendering, both grid renderers — with every intermediate commit green on the existing 242-check
suite before the `n` key was dropped. A new "Sandbox Initialisation" screen
(`screen-nt-debug-config`) then lets Debug Mode's host choose Width and Height independently
(16–20 each) before the Node Editor opens, reached once per session; the Author New Node loop-back
reuses the same choice. Two testing gaps closed alongside the feature: a NaN tripwire
(finite-geometry assertions — a missed rename throws nothing, just renders garbage) and an
end-to-end rectangular section at 16×18/16×20/20×16, the last one proven to catch a swapped axis
that the square-only suite structurally cannot. One real latent bug surfaced by the axis split:
`ntPortSub` had clamped both axes to one shared bound, correct only by coincidence while every node
was square. `visual-check` confirmed the aspect ratio actually renders (16×18 measured ≈0.889, not
the old forced 1.0) across all four Debug screens. `verify-nt-loopback.js` sits at **278** checks,
8/8 seeds green. Detail: `nt-implementation-notes.md` D43–D46; `docs/decision-log.md`.

## v198 — NT Debug/Sandbox Mode CLOSED, documentation pass + SW bump (17 Aug 2026)

Tasks 1–9 shipped a full hand-authoring sandbox for NT: the host builds a Node in a Node Editor
(`screen-nt-authoring`) instead of the system rolling one, deploys it over the existing
`NT_GENERATE` packet (`debug: true`), and every player retries it locally an unlimited number of
times — zero packets per attempt — before finishing independently through a sized readiness gate,
scored on their **best** (highest-latency) attempt. Mutually exclusive with Sylly Mode, superseding
Iterations/Hardening Window — the **second** shipped instance of a now-named suite-wide settings
pattern, after FRT's unnamed Pear-Off ↔ Sylly Mode (SW v167, 10 Aug 2026); decision-log entry below
names both and corrects an earlier "first instance" misattribution caught in review. Task 10 closed
it out: `visual-check` on `screen-nt-authoring` at all three Matrix Scale settings found no headroom
to grow the Randomise buttons (left `min-h-11`) and a real 44 px touch-target gap on the four brush
pills (fixed, extending TG-08's precedent); `verify-nt-loopback.js` sits at **239** checks, 8/8
seeds green. Two pieces of stale NT documentation predating this branch were corrected in passing
(`ntCycles`→`ntIterations`, a phantom `nt-new-trace-overlay` id). Detail: `nt-implementation-notes.md`
D36–D42; decision-log 2026-08-17.

## v195–197 — NT allocation viewer rounds 5–6: maze-preview polish, budget-vs-total split, the Stack, terminology cleanup (16 Aug 2026)

Detail: `nt-implementation-notes.md` D33–D35.

## v194 — NT allocation viewer round 3–4: screenshot-confirmed polish, a real clip bug, a real alignment bug, and a deliberate balance change (16 Aug 2026)

A screenshot-driven round covering
the D28 items plus everything they surfaced testing them:
- **Terminal-styled directive**, **chip 3rd row** (total vs surplus-to-this-leg split apart, fixed
  `w-28` width so nothing pops on deposit), **status/warning merged** into an always-rendered
  text-swap — all owner-requested, all shipped. A third instance of D28's own label-contrast bug
  (assumed-dark backdrop, actually the white page) was caught in the same screenshot and fixed.
- **Chip clipping at 4 legs** — the taller chips broke `overflow-hidden`'s only-shrinkable child,
  making 2 of 4 chips permanently unreachable. Fixed by making the stage scroll (its own documented
  purpose in the sticky-footer pattern) rather than clip. A `justify-center` compaction added in the
  same round actively conflicted with this (centred overflow hides its own top edge, unreachable by
  scroll) and was reverted.
- **Viewport misalignment**, confirmed from a second screenshot — `offsetLeft` silently walked past
  the intended `row`/`viewport` ancestors to an unrelated one further up the page, mixing coordinate
  frames. Fixed with `getBoundingClientRect()` throughout. Verified symmetric to the pixel at every
  leg position.
- **Matrix-scale overflow** — the fixed 18px/tile cell size overflowed the viewport at the "large
  map" (n=20) setting, clipping even the active leg permanently. Cell size now scales to fit.
- **Honeypot per-leg cap removed** (owner decision, informed by an asymmetry firewall doesn't share
  — honeypot excess is actually placeable during build, not self-limiting like firewall). Team-pool
  ceiling is now the only bound either resource has.
Presentational + one deliberate balance change, no packet shape change. `verify-nt-loopback.js`
rewritten for the new honeypot behaviour, green on 8 seeds. **Still open:** the maze preview canvas
looks visibly cruder than the real build screen's DOM-based grid — deferred, tracked in
`deferred-work.md`. Detail: `nt-implementation-notes.md` D29–D32.

## v192 — NT allocation screen: side-by-side legs → windowed leg viewer (16 Aug 2026)

Owner
feedback from a live 3-device DNP session: v191's "fit the whole bridge across the panel" sizing was
cramped at 2v2 and an unreadable, overflowing smudge at 4v4. Replaced with one leg shown large
(`cell: 18`, real 324×324 px) with ‹ › to switch plus an always-visible chip row restoring "whole
team readable at once." Detail: `nt-implementation-notes.md` D26.

## v191 — NT's DNP (Sylly Mode) round: allocation reworked to a tally-deposit, plus three fixes (16 Aug 2026)

Bank-mediated transfer replaced with a per-member surplus tally-deposit (Undo /
Reset All / long-press-to-withdraw); the DNP summary now renders the team layer it always computed;
the playback journey canvas is clipped and direction-aware; the dead `ntBuildBridgeInto` bridge was
revived as the allocation picker. Two process lessons in `nt-implementation-notes.md` D22/D22b: the
surplus formula lived in three places, and only one of two mutation paths was validated.
**Verified:** `verify-nt-loopback.js` 119 → 146 checks. **Still open:** the `mpConfirmRoster`
late-join race (BUG-07) and a real 3-device retest. Detail: `nt-implementation-notes.md` D22–D25 +
TG-08; design record `docs/net-trace-dnp-mode-update.md`; `docs/decision-log.md`.

## v190 — NT MDLM desync root-caused, fixed, and harnessed (15 Aug 2026)

A live 3-device
session (1 host + 2 clients) produced blank build grids on clients, playback never reaching them,
and a `--.--%` summary. Static analysis found **three** defects, all client-only (the host never
round-trips its own state, so a host-side playtest is clean by construction): **BUG-15** —
`ntGenerateNode`'s `convertN` roll can be 0 (and always is under the shipped **"Native Honeypots:
0"** setting), so `nativeHoneypots: []` is erased in flight and two *unguarded render* reads
(`ntBlockAt`, `ntDrawMaze`) throw per grid cell, leaving a blank grid and a dead applier;
**BUG-16** — same class one level deeper, `timeline.fires: []` erased and `ntRenderFrame` reading
it unguarded; **BUG-17** — the MDLM Diagnostic Summary was gated behind
`syllyMultiplayerMode === 'single'` and so rendered *nothing* in MDLM, ever (a never-completed "MP
step" TODO). Fixed with `ntNormaliseNode`/`ntNormaliseTimeline` at every receipt point plus `|| []`
at the five previously-unguarded reads, and by dropping the mode gate. **New harness:
`tools/verify-nt-loopback.js`** — 119 checks, host + **2 clients**, Standard *and* DNP; it went red
on 20 before the fix and is green on every seed after, with a reverted copy still red via
`NT_SRC=`. NT was the last game with a render seam and MDLM and no harness at all.
**The transferable lesson is in `shared-implementation-notes.md` BUG-06 addendum:** the Aug 2026
BUG-06 sweep scanned appliers for *direct payload-to-collection assignment*, which is structurally
blind to collections **nested inside** an assigned object — `ntNode = payload.node` looks clean when
the erasure is at `node.nativeHoneypots`. Re-sweeping the other games by payload *shape* is tracked
in `deferred-work.md`. **Still open:** the `mpConfirmRoster` late-join race (BUG-07) and a real
3-device retest. Detail: `nt-implementation-notes.md` BUG-15/16/17 + D21.

## v189 — FLW polish round: colour/copy/UX fixes across the table + a readyCheck gate CLOSED (15 Aug 2026)

Six passes — v184 through v189, each correcting the last from live owner
feedback/screenshots. Self-directed except for one `AskUserQuestion` on the contrast tradeoff;
no `visual-check` this round — verified via `verify-flw-loopback.js` (green) and syntax checks
only. **Colour, settled:** primary surfaces (CTA/pills/toggle-ON, and the lobby's own `#btn-flw`
tile) are `#F9A8D4` fill + WHITE text — the lobby tile is the reference the owner confirmed live
(measured contrast is low, ~1.8:1, but this is a deliberate twice-confirmed call, not an
oversight). Every secondary/utility button (Settings, Audit, the readyCheck button) flips the
same two established hexes instead — `#A02050` fill + white text (simplified from light-pink text, round 5) — a scoped exception
to the suite's light-tint Settings convention (`ui-style.md` Table C footnote ¶). One real scope-
miss caught mid-round: the lobby game-tile lives outside the FLW block of `index.html`, so an
earlier block-scoped `text-white` sweep missed it — worth remembering for any future shared-class
cleanup that assumes a game's markup all lives in one place. **Table/UX changes:** header combined
to one line ("The Showroom - Exhibition N"); rival strip shows every seat including your own with
a live Diamond count; the Vault row is one horizontal row (label — remaining — cut); the
Appraiser's Ledger's counts sit tight against their own gem, split into two equal halves each
centred (not one centred cluster); every Journal line names its gem before the action; the hand
row's off-turn slot is a fixed empty placeholder (was omitted, causing reflow) and the selection
ring no longer overlaps the neighbouring card; the Scratch Test auto-selects a lone target and
shows its guess list as real gem cards, greying out anything the Ledger shows fully discarded; the
target-selection modal (Sapphire/Topaz/Opal/Amethyst) always lists every alive Collector, greying
the ineligible instead of silently auto-submitting past them; the Deep Vault overlay pre-selects
the leftmost gem and shows a live description panel; the Showing-result screen gates the host's
Next Showing behind a readyCheck (`FLW_RESULT_READY`) so players aren't swept past the reveal.
Also closes the gem-seam plan's own Task 13 doc pass (game-identities § 16 was still describing an
entirely different unshipped design). Detail: `flw-implementation-notes.md`, `docs/decision-log.md`.

## v183 — FLW gem render seam (tasks 1–12) CLOSED (14–15 Aug 2026)

Square core art, no baked
text on the card face — the display-case frame, carat placard, hand placards and a chronological
discard strip all moved onto the CSS render seam so a skin needs no chrome baked into its art.
Detail: `flw-implementation-notes.md`, `docs/superpowers/plans/2026-08-14-flw-gem-seam.md`.

## v182 — Settings dynamic-value-line (DD-13) sweep CLOSED (13 Aug 2026)

Self-directed, no live testing. Explore-agent audit found the gap was narrower than the deferred
item implied — only word-difficulty pills, only 7 games: **JEC** (Menu Complexity — its static
description also named three DIFFERENT tier labels than the pills, a real copy bug fixed alongside
the value line), **GTH** (Symptom Severity), **LI5** (Report Card), **NAT** (Field Difficulty),
**DSD** (Sea State), **LTTP** (Party Destination), **SS** (Encryption Protocol — the one game with
exact-tier, not cumulative, pills, so its wording uses `definitions.md`'s Standard/Wild/Wilder
language). Every other duration/count/threshold pill in the suite already stated its value or had
independently built the same shape under a different name. Root-cause writeups split into each
game's own impl-notes file per `shared-implementation-notes.md`'s own scope rule (no shared engine
file was touched). Not verified beyond syntax/encoding checks — no `visual-check`, no live play.
Detail: `deferred-work.md`, and each of jec/gth/li5/nat/dsd/lttp/ss-implementation-notes.md.

## v181 — Round/Night Intro Screen sweep CLOSED (13 Aug 2026)

PKO/NAT/PASS added
(`screen-[abbr]-*-intro`); GTH and DYB investigated and ruled out (already covered by existing
screens/timing constraints). Detail: `deferred-work.md`, `pko-implementation-notes.md` DD-26,
`nat-implementation-notes.md`, `pass-implementation-notes.md`, `dyb-implementation-notes.md`.

## v179 — CJAR Dibber Dobber payout-beat fix and a suite-wide BUG-06 audit (3 live fixes: LTTP, GTH, NT) (13 Aug 2026)

Detail: `shared-implementation-notes.md` BUG-06.

## v178 — Counting Sheep scoring rework CLOSED, all 10 chunks shipped (13 Aug 2026)

Full detail
moved to `shp-implementation-notes.md`; spec `docs/new-game-tech-counting-sheep-scoring.md`.

## v177 — Counting Sheep: Fogged Dream no longer leaks into the recycled Flock (13 Aug 2026)

A played Fogged Dream (id 13 — deliberately excluded from `shpBuildFlock`, conjured only by the Fog
nightmare) was being pushed to the discard unconditionally and recycled back into the Flock on the
next reshuffle, so a player could draw a cursed card with no Fog nightmare involved. Bug had been
live since the ghost system shipped; masked because the per-crash redeal usually rebuilt a fresh
Flock before a reshuffle happened. Fix: both play paths (`shpHostPlayCard`, `shpHostPlayTwoCard`)
now guard `if (cardId !== 13)` before pushing to `shpDiscard`. Found during design work on the
scoring rework (v178) — removing the per-crash redeal there was going to make reshuffles routine
and turn this into a visible, frequent bug instead of a rare theoretical one.
Detail: `docs/decision-log.md` 2026-08-13, `docs/new-game-tech-counting-sheep-scoring.md` § 3.1(a).
Resolved as `shp-implementation-notes.md` BUG-07.

## v176 — Counting Sheep: Deep Sleep HOLDS, herd-band relaid out, real animation bug found (13 Aug 2026)

Third playtest round on the same feature; two of the three items are corrections to earlier "fixes".

**(1) BUG-05 — the flying sheep were rendering at ZERO WIDTH all along.** Tailwind preflight sets
`img { max-width: 100% }`, and `.shp-sheep-layer` is deliberately a 0×0 anchor so the parade
contributes no layout — so `100%` resolved to 0px and every sheep was invisible on every device.
Introduced by v173's emoji → real-art swap (text ignores `max-width`, images don't). Fix:
`max-width: none` plus an explicit width on `.shp-sheep-fly`. Sheep now also scale to flock size
(`--shp-sheep-w`) so a +10's eight sheep aren't one blob.

**(2) BUG-06 — the summary appeared, then bounced back to the table.** `shpAnimTimer` and
`shpTapReadyTimer` both called `shpRenderTable()` directly, bypassing `shpShowTable()`'s
`shpDeepSleepInfo` guard. A `'stuck'` Deep Sleep resolves in the same tick as the play that caused
it, so the parade timer was always pending and repainted the table over the summary ~1.5s later.
Both timers are now guarded.

**(3) The stuck player now holds instead of auto-advancing** (owner ask). New host-declared
`shpStuckIdx` + `SHP_STUCK` SYNC / `SHP_STUCK_ACK` ACTION: the table holds, that player gets a
"Nod Off" button over their greyed hand, everyone else sees "*Name* has no safe cards left…", and
their tap moves the table to the summary. A bust is deliberately still immediate.

**(4) Herd band relaid out** — "Last Played" is now a column heading on the same line as "THE HERD",
card 2.1rem → 3rem, pen 5.4rem → 6.6rem.

Detail: `docs/implementation-notes/shp-implementation-notes.md`, "Deep Sleep hold, herd-band
layout, and the REAL animation bug".

## v168–v175 — Counting Sheep playtest round (11–13 Aug 2026)

v175 (**Pen art replaced with a single pre-composed image; animation opacity curve fixed.**
Same-day follow-up to v174. **(1)** Owner supplied one hand-drawn `pen.png` (200×200, sheep+fence
baked into a single composition with a real alpha channel), replacing the CSS-layered
4-`<img>`-plus-rotated-fence approach — simpler, and it sidesteps every positioning judgement call
that kept being wrong. `pack.json`'s `extras` swapped `fence` for `pen`; `fence.png` deleted.
**(2)** `@keyframes shpSheepArcIn`/`Out` set opacity only at 0%/15%/100%, so the browser linearly
faded the sheep across the entire 15%→100% span — down to ~20% opacity by 1000ms of a 1200ms
flight. Fixed with an explicit `85% { opacity: 1 }` stop. Both were real defects, but **neither was
the reason the parade was invisible** — see v176 in `CLAUDE.md` § Current Focus, which found the
sheep had been rendering at zero width the whole time. Detail:
`docs/implementation-notes/shp-implementation-notes.md`, "Pen art replaced + animation opacity bug".)

v174 (**Sheep-pen fixes + Last Played redesign, same-day follow-up to v173.** Owner playtest of
the v173 sheep-pen round found three problems. **(1)** `sheep.png`/`fence.png` shipped in v173
with no alpha channel (PNG colour type 2, confirmed by reading the IHDR bytes directly) — both
rendered with a visible cream/white box. Closed same day: owner re-exported from Krita with
"Store alpha channel" ticked; re-verified byte-level (colour type 6/RGBA) and confirmed visually.
**(2)** The fence was rotated 90° to act as a right-edge divider — wrong, the art was never drawn
for that orientation. Fixed: fence sat unrotated as a horizontal rail along the pen's bottom edge;
pen and sheep sizes bumped too. **(3)** The parade animation was reported "not showing" —
Playwright confirmed it was firing correctly, just too small and (until #1 landed) invisible as a
white shape on a near-white background. **(4)** The right-column "Last" indicator rebuilt as "Last
Played" + the real last-played card rendered through `shpRenderCard`, the card itself as the tap
target for the journal. **This whole round of fixes to the pen composition turned out to be a dead
end** — see the v175 entry in `CLAUDE.md` § Current Focus, which replaced the hand-composed
4-sheep+fence CSS layout with a single pre-composed image once the owner supplied one, and found a
second, more consequential animation bug the v174 fix didn't touch. Detail:
`docs/implementation-notes/shp-implementation-notes.md`, "Sheep pen fixes + Last Played redesign".)

v173 (**Night Intro screen + sheep pen art, same-day follow-up to v172.** Two owner polish
requests. **(1)** `screen-shp-night-intro` — the lobby jumped straight into a live table with no
beat marking a new Night; matches PKO/CJAR's formula now. Auto-advancing (rule-5 interstitial
exemption, `SHP_INTERSTITIAL_MS` 5000ms), heading "Night N Begins", subtext doing double duty as
flavour AND a practical reminder in one line (5 rotating options, `SHP_NIGHT_FLAVOUR`, host-picked
+ synced via `SHP_DEAL.flavourIdx`), a Sylly-only Night-Terrors note. Promoted to a documented
default, `ui-style.md` § **Round/Night Intro Screen** — generalises CJAR's `screen-cjar-raid-intro`
(the only prior instance) for any game where the same phase repeats several times a match;
`docs/deferred-work.md` carries the sweep item (PKO next). **(2)** The Climb stage's empty left
column got a static sheep-pen (4 hand-placed `sheep.png`, plus a `fence.png` divider, both new
`extras`-block core art) and the sheep-jump animation swapped its 🐑 emoji for the same art.
**Both the pen composition and the animation's visibility turned out to be broken** — see the v174
entry in `CLAUDE.md` § Current Focus for the fix. Detail:
`docs/implementation-notes/shp-implementation-notes.md`, "Night Intro screen + sheep pen art".)

v172 (**Fogged Dream badge fix, stuck-player messaging, Tap-Hold Reference, same-day follow-up to
v171.** Three fixes from the live 3-player test that shipped v171. **(1)** Fogged Dream's art was
landing under `shp-card-cursed` styling sized for an EMPTY card — violet border + a 1.4rem "?"
sitting over the photo. Split into an art path (`shp-card-asset`, plus a small corner badge) and the
unchanged no-art fallback. **(2)** After Swap Dreams handed a bad hand to the next player, that
player's own screen kept showing "Your turn" while every card boinged, with no indication anything
was about to happen. `shpRenderTable` now runs the same stuck-check locally on the active player's
own device and shows "😴 No safe cards left — you're drifting off…" with the hand greyed. **(3)**
Tap-hold on a card now jumps to the How-to gallery (scrolled + ringed) instead of opening a
standalone popup — generalising PKO's pattern. `shp-card-info-overlay` fully retired. Promoted to a
documented default, `ui-style.md` § **Tap-Hold Reference**. Also: updated v2 art for cards 17/18
(higher-contrast symbols), old masters/JPGs removed. Detail:
`docs/implementation-notes/shp-implementation-notes.md`, second 2026-08-12 entry.)

v171 (**Two new cards, table polish, Night desync fix.** Owner playtest round. **(1) BUG-04** —
`shpNightNum` incremented in the host-only `shpDealNight()` and was never in the `SHP_DEAL`
payload, so every client sat on "Night 0" all match. **(2) Two new cards** from owner art — Rude
Awakening (17, alarm, reseats the table) and Swap Dreams (18, pillow, trade Pens with a random
player). 17 forced a real `shpSeatOrder` ring; new `shpLastEffect` carries the outcome sentence.
Deck 73 → 80 with +3 pasture so the 4 new specials don't undo the anti-hoard rebalance.
**(3)** Wide Awake was documented backwards — `shpLeaderIdx()` picks most Moons, the inspect text
said most cards. **(4)** Table polish — a herd/ceiling pressure ramp, stronger labels, filled
direction pill, player chips dropped the public "N cards" line (leaked Wolf-shrunk hands), render
in ring order. Card effect text unified in `shpCardEffectText`, shared by the long-press modal and
the How-to gallery (now a reference list). Detail:
`docs/implementation-notes/shp-implementation-notes.md`, 2026-08-12 entry.)

v170 (**Sleepwalkers folded into Sylly Mode, Wolf + Fogged Dream art, MDLM start-game fix.** Owner
playtest call: the ghost/Nightmare-Meter system (Sleepwalkers) was a separate ON-by-default toggle
sitting next to Sylly Mode (Night Terrors). Now gated on `shpSyllyMode` directly. Also: the in-hand
Big Bad Wolf "slot locked" placeholder was hardcoded to the 🐺 emoji even though `12.jpg` was
already precached — bypassed `assetFace` because the Wolf card is consumed straight to discard on
draw. Now tries core art first. **v168→v169 same-day fix:** the Sleepwalkers removal missed two
references in `engine-multiplayer.js`'s MDLM settings serialiser/applier, which threw a
`ReferenceError` the moment the host tapped Start — silently caught, so "Lights Out" appeared to do
nothing with 3+ players joined. **v169→v170 same-day:** Fogged Dream (id 13) also got real art —
the earlier "permanently unskinnable" call conflated the card's hidden resolved value (2–12, rolled
at play time) with its appearance; a static face doesn't leak the roll. Detail:
`docs/implementation-notes/shp-implementation-notes.md`, 2026-08-11 entries.)

## v167 and earlier

v167 (**Artwork: a global art viewer, galleries for the last four seams, and a standalone authoring
guide (10 Aug 2026).** Three things ride this bump. **(1) The art viewer** —
`openArtViewer(src, caption)` and `artMakeZoomable(el, src, caption)` in `engine.js`, plus one
global `#art-viewer-overlay` (z-[105]) — makes every gallery tile in every game tappable-to-enlarge.
It is Pattern 2 geometry with an image body, deliberately unbranded (six games open it), and
documented as `ui-style.md` § Pattern 2a. The load-bearing detail is the `src` guard: a tile whose
art didn't resolve gets neither the zoom cursor nor a handler, so a dead tap is now a second,
sharper signal for the offline install check. **(2) Galleries** — the How-to tab bar rolled out to
FRT · SHP · FLW · DYB, closing the deferred item; six of seven render seams now have one (PASS, at
54 faces, is the deliberate exception). FLW's was a fold of its standalone `flw-gems-overlay`, which
also fixed a real defect — the old swatch-circle markup meant no skin could ever reach the Gem
Manifest. **(3) Authoring** — `docs/art-authoring-guide.md` + `tools/make-skin-pack.ps1` (`-List`
prints any game's inventory; `-Register` writes the pack and the registry line) make skin authoring
a Claude-Code-free workflow. Drive-by: `getMuteToggleOnClass` was missing its `frt` entry and
silently fell back to stone. Detail: `docs/decision-log.md` 2026-08-10, `docs/art-authoring-guide.md`.) Previous:

v166 (**Pecking Order: the Law of the Wild, plus the D39 stage-polish round.** Two things. **(1) Law of the Wild** — a PKO Match can now be won two ways. **Dominance** is the shipped behaviour, unchanged: a race, first to `pkoClashTarget` Clashes. **Stragglers** plays exactly that many Clashes instead and counts every card still in your Hoard when a Clash ends against you — lowest total takes the Match, and the champion may have won no Clash at all. One merged settings card carries both pill rows and a live `#pko-val-law` value line, because `pkoClashTarget` means "Clashes to **win**" in one mode and "Clashes to **play**" in the other. Both modes share `pkoScores`/`pkoClashHistory` — only what a history row *holds* differs — and the direction of "winning" lives in one `pkoBestScore`, since a mode read the wrong way round doesn't throw, it just crowns the wrong player. `pkoScoring` ships in `SETTINGS_SYNC` and rides `PKO_CLASH_BEGIN`/`CLASH_END`/`MATCH_END`, so a client self-heals before it renders a score. `verify-pko-loop.js` **132 → 147**. **(2) D39** — the Active Marks / Watering Hole two-column layout, and `pko-chain-overlay` folded into How to Play as tabs 2–3 (decision-log 2026-08-10). **Still open for playtest:** Force of Nature can hand a player cards they did not choose (Deluge, Culling, Migration, Great Reversal), which is a straight penalty under Stragglers in a way it never was under Dominance — deliberately left un-special-cased pending a live session. Detail: `docs/implementation-notes/pko-implementation-notes.md` D39/D40.) Previous:

v165 (**Cookie Jar stage-polish round.** Presentational only, no rules or packet change, confirmed by an unchanged `simulate-cjar-dd.js` noise band. Seven design decisions **DD-25…DD-31**: reveal-choreography timing (`CJAR_FLIP_ANIM_MS` 2100 → **3200 ms**, with a ~1000 ms settle tail moved OFF the blocking clock to overlap the decision window), stage-column heading placement, tappable trail thumbs (`cjar-card-view-overlay`), a score-table Status column, a fixed-width gameover medal slot, and a new standing `ui-style.md` rule that same-screen buttons match in size and weight — **CJAR only at the time; the suite-wide rollout to all 18 games followed separately on 9 Aug 2026.** Detail: `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` + `docs/implementation-notes/cjar-implementation-notes.md`.) Previous: v164 (**Cookie Jar's action stage rework.** No rules, packet, or precache change — presentational only, confirmed by an unchanged `simulate-cjar-dd.js` noise band. Root cause of three playtest rounds calling the stage "off": the base game's payout mutated `cjarRaidTotals` with no on-screen beat at all, so a normal flip gained cookies and nothing visibly moved (TG-08) — two earlier rounds of layout work (DD-11, DD-12) could not have fixed that. Seven design decisions, **DD-18…DD-24**: the centre slot (`#cjar-table-hero`) now holds the face-down card the buttons act on, not the one that just resolved (DD-18, and it's what Dibber Dobber's blind window already did); a 2100 ms reveal choreography (`CJAR_FLIP_ANIM_MS` — flip/hold/payout/settle) plays out on every card including the bust, paid for mostly out of `CJAR_REVEAL_MS` (3000 → 1200 ms, DD-19); the payout is a token burst carrying direction and count rather than per-player flight paths (DD-20); buttons renamed **Reach In Again / Sneak Out** (base) and **Reach In / Play Innocent / Dob** (Sylly), replacing the factually-wrong "Take a Cookie" (DD-21); score rows split into `.cjar-pill-stashed` / `.cjar-pill-risk` (DD-22, the latter base-game only); Crumbs + the Treat merged into one "Up for Grabs" card, `#cjar-grabs-card` (DD-23); the deck badge demoted to a `.cjar-deck-stack` reservoir (DD-24). All five harnesses updated: `verify-cjar-deck.js` **76** · `verify-cjar-loop.js` **102** · `verify-cjar-dd.js` **47** · `verify-cjar-loopback.js` **164** (112 at ship, 147 at this rework, +17 from the 8 Aug 2026 final-review fix wave covering the settle-handover trail gap, the client bust-timeout leak, and the all-innocent payout beat — the only harness with real render-executing mock elements, so the only one that could assert any of this) · `simulate-cjar-dd.js` unchanged. Spec: `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md`. Full history for v137–v163: `docs/sw-changelog.md`.) Previous: v163 (**Arcade Mode — Asherplane, the first cabinet.** Secret Mode gains an `ARCADE` category holding small standalone canvas games — cabinets are deliberately NOT Sylly Games: no MP config, no `game-identities.md` section, no Sylly Mode, no verification harness. `js/arcade/asherplane.js` (top-down shmup) + engine registration + SW precache entry. Spec: `docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`; plan: `docs/superpowers/plans/2026-08-03-arcade-asherplane.md`. **Retroactively logged 7 Aug 2026** — this bump shipped ahead of the Cookie Jar action-stage work and had not yet received its own `CLAUDE.md` § SW Version note; the arcade narrative itself was already current in § Current Focus.) Previous: v162 (**Cookie Jar (`cjar`) — game 18. Playtest rounds 1–2 fully triaged; both were live multi-device sessions; the phase gate is CLOSED.** Simultaneous-choice push-your-luck, MDLM-only, **3–8** players (min dropped from 4, owner call 3 Aug 2026 — 3-player balance unsimulated), host-authoritative, host-as-participant. **Base mode is Incan Gold 1:1** — reveal → resolve → choose about the *next, unseen* card, with a bust ending the Raid before any decision window (Delta 3). **Sylly Mode = Dibber Dobber** preserves that same mental model by inverting the implementation: choices commit **blind**, then the card is revealed and resolved against them (**Delta 7**, owner call 2 Aug 2026 — spec §6.3 originally resolved against the face-up card, which made Sylly a different game). Three actions (Take / Play Innocent / Dob), no bust, nobody leaves; one running `cjarStashes` seeded **once** with 5. New files: `js/games/cjar.js` (1777 lines, zero stubs), `data/cjar-data.json` (15 cookie values totalling 124, 3 tier bands, 5 family archetypes × 4 warn + 4 bust lines, 5 treats, both schedules), `docs/cjar-content-guide.md`, `data/art/cjar/` core art (**14 JPEGs, 18.7 MB → 492 KB**, every file under the 40 KB ceiling), six screens, six overlays. **Five headless tools**, all green: `verify-cjar-deck.js` **73** · `verify-cjar-loop.js` **102** · `verify-cjar-dd.js` **47** · **`verify-cjar-loopback.js` 112** (host↔client over a Firebase-shaped wire, with a DOM of real mock elements and the only real shuffle among the four tools — the one that caught BUG-06, and the only one that can prove DD-17's flip-1 float actually landed) · `simulate-cjar-dd.js` (balance instrument — asserts nothing, always exits 0). Brand **honey-gold `#D4A017` with DARK ink** — white measures 2.38:1 against it, so `ctaTextClass: 'text-stone-800'` (second consumer after FRT) and labels use the darkened `#7A5C0A`. Two engine-side lessons elevated to `logic-engine.md`: a readiness gate reading a per-seat array must be tested in the mode where that array is **empty** (`[].every()` is `true` — BUG-05 let the host resolve on the first tap in Sylly), and a **two-device loopback** should prove the packet contract before the real multi-device session (it found two defects that had passed 222 green checks). **The offline install check PASSED at v161. Rounds 1–2 were both live 3–4 device sessions, fully triaged (BUG-06 through BUG-08, DD-07 through DD-16); TG-04 is closed. The commit history is also now consistent** — `data/cjar-data.json`, the core art, and `MP_GAME_CONFIGS.cjar` had shipped on disk but not in git; all committed. The blind-first-flip question in Dibber Dobber is now resolved (DD-17).) Previous: v156 (**BLD and FRT recoloured off yellow, ahead of Cookie Jar.** No rules, packet, or precache change — CSS + class-name only. Design review for the incoming Cookie Jar game flagged two problems (`docs/new-ideas/new-game-brief-cookie-jar.md` §1/§19): the amber/cookie-brown space needed to be clear of both PKO's `#854D0E` brand and Cookie Jar's own incoming honey-gold, and both games' white-on-yellow toggle/pill combos were failing WCAG contrast (1.92:1 and 1.57:1 against the 3:1 floor). **BLD:** yellow-500 → dark red `#991b1b` (red-800) — new `pill-active-bld` / `game-toggle-on-bld` / `bld-cta` / `bld-label` CSS classes (white text now passes contrast against the darker fill); secondary in-game accents (rejection dots, selection rings, role-colour text) remapped shade-for-shade `yellow-N` → `red-N`; the old generic `.pill-active-yellow` / `.game-toggle-on-yellow` rules deleted (confirmed BLD-only before removal). **FRT:** banana `#FFC700` → electric lemon `#FFE500`, with **dark ink (stone-800) replacing white** throughout — the brighter fill made the old white-text approach worse, so every FRT surface using the fill needed the swap (`pill-active-frt`, `game-toggle-on-frt`, `.frt-range`, `.frt-card-back`, the `mk()` button helper in `frtRenderAwait()`, the round-transition button in `frtRenderGameOver()`), not just the two named CSS classes; `FRT_FILL`/`FRT_INK` constants updated to match. Left deliberately unchanged: FRT's card-name/settings-button ink `#854d0e` — it coincidentally equals PKO's brand hex but isn't FRT's identity colour and isn't itself a contrast failure. `index.html`'s ~49 occurrences were edited via a scoped Node script, never the Edit tool, per the encoding-corruption rule. Full history for v137–v155: `docs/sw-changelog.md`.) Previous: v155 (**DYB Tempest asset seam — the five special die types are now skinnable.** Rules-neutral, packet-neutral: `dybGenerateRoll`'s odds and `dybComputeRealCount`'s arithmetic are untouched. The asset manifest gains an optional `specials` block (per-type face keys `1`–`6`, a reserved `blank` key for faceless dice, and a `"frame": false` opt-out), resolved by two new functions in `js/lib/art.js` — `assetSpecial(kind,type,id)` / `assetSpecialFrame(kind,type)` — alongside `assetFace`/`assetBack`/`assetExtra`. `dybDieHTML` (`js/games/dyb.js`) draws special-die art *inside* the engine's own type frame (new `.dyb-die-framed` + inner `.dyb-die-art` CSS) rather than replacing the frame, so a Loaded die stays legible as loaded under any skin; the opt-out is provenance-gated (only applies to a die whose special art actually resolved) and the `blank` key never falls back to the ordinary face chain, so a concealed phantom's real value can never leak through a partial pack. `data/packs/deep-ocean-dice/` is the reference pack (hand-authored SVG loaded/snake faces + ghost/broken blanks); `sea-cliff-dice` stays faces-only on purpose as the fallback path's live test. New harness `tools/verify-dyb-dice.js` (90+ checks incl. the leak guard) — add it to the standard re-run list alongside the three PKO harnesses whenever `js/lib/art.js` or `dybDieHTML` change. Also dropped `dybDieHTML`'s dead `visible` parameter (six call sites).) Previous: v154 (**SHP core art — Counting Sheep gets real plush-sheep faces.** No JS change, no rules change, no packet change: `shpRenderCard` already resolved `assetFace('shp', cardId)` / `assetBack('shp')` through `js/lib/art.js`, so this was art + manifest + registry + precache only — the fourth core-art conversion (after PKO, FLW, FRT). New `data/art/shp/` — 16 faces keyed `0`–`12`/`14`–`16` (filenames matched ids directly, no lookup table needed) + `back.jpg`, 400×550 JPEG, **640 KB** total; `data/art/registry.json` → `["pko","flw","frt","shp"]`; all 17 images + the manifest added to `PRECACHE_URLS`. The art was already in the repo as the **`plush-sheeps` skin**, removed from `data/packs/registry.json` at the same time, per the standing rule. **id 13 (Fogged Dream) has no `faces` entry and never will** — `shpRenderCard` hardcodes its cursed placeholder before ever calling `assetFace`, since the card's whole mechanic is a value hidden even from its own owner; owner confirmed (1 Aug 2026) not to renumber `SHP_CARDS` to close the gap, since those ids are locked across MP packets (`SHP_DECK_COUNTS`, hand/discard/SYNC payloads) and closing a purely cosmetic gap isn't worth that risk. `tools/convert-core-art.ps1` held the width at the source 400 px; all 17 files landed under the 40 KB cap at q76–q84. Skipped deliberately, same call as FLW/FRT: an `await artReady` guard at SHP's entry point.) Previous: v153 (**FRT core art — Fruit Salad gets real fruit faces.** No JS change, no rules change, no packet change: `frtRenderCard` already resolved `assetFace('frt', fruitId)` / `assetBack('frt')` through `js/lib/art.js`, so this was art + manifest + registry + precache only — the third core-art conversion (after PKO, FLW). New `data/art/frt/` — 8 fruit faces keyed `0`–`7` (banana=0 … apple=7, matching the shipped `fruity-fruits` skin's own id map) + `back.jpg`, 337×450 JPEG, **220 KB** total; `data/art/registry.json` → `["pko","flw","frt"]`; all 9 images + the manifest added to `PRECACHE_URLS`. The art was already in the repo as the **`fruity-fruits` skin**, which was **removed from `data/packs/registry.json`** at the same time, per the standing rule set at the FLW conversion. `tools/convert-core-art.ps1` re-pointed at FRT and held the width at the source 337 px (masters already small and near card aspect) rather than upscaling; 8 of 9 files landed at q88, `back.jpg` stepped down to q72 on its busier repeating pattern. Skipped deliberately, same call as FLW: an `await artReady` guard at FRT's entry point — its first card render is several screens past boot.) Previous: v152 (**FLW core art — Flawless gets real gem faces.** No JS change, no rules change, no packet change: `flwRenderCard` already resolved `assetFace('flw', gemId)` / `assetBack('flw')` through `js/lib/art.js`, so this was art + manifest + registry + precache only — the first conversion to actually test the July claim that a core-art rollout needs zero plugin edits. New `data/art/flw/` — 10 gem faces keyed `0`–`9` (the id *is* the carat value) + `back.jpg`, 338×488 JPEG, **217 KB** total; `data/art/registry.json` → `["pko","flw"]`; all 11 images + the manifest added to `PRECACHE_URLS`. The art was already in the repo as the **`prismatic-gems` skin**, which was **removed from `data/packs/registry.json`** at the same time — once a pack's art is the default, offering it under `GAME SKINS` is a selectable option that changes nothing and re-downloads 1.1 MB of PNG to do it. That's now the standing rule for the rest of the rollout. `tools/convert-core-art.ps1` re-pointed at FLW (its CONFIG block is edited per run; a previous run's id map survives in that game's `pack.json`) and held the width at the source 338 px rather than PKO's 360 px default — the masters were already the exact card aspect, so downscaling was unnecessary and upscaling would have cost bytes for no detail; all 11 files landed at the top quality step (q88) without the walk-down engaging. Skipped deliberately: an `await artReady` guard at FLW's entry point — FLW's first card render is several screens deep, far longer than two local fetches (recorded in the impl notes as the assumption to revisit if a gem ever renders as the CSS token).) Previous: v151 (**MDLM quit contract closed for GTH / DYB / BLD** — no rules, UI, or precache change. All three already called `resetToLobby()` on quit confirm; what was missing was the other half of the PASS contract — a client's `resetToLobby()` tears down only *that* device, and the host has no listener on `/players` mid-game, so a client quitting left the host and remaining clients waiting on a turn that would never come. Each game gained a client→host `[ABBR]_PLAYER_LEFT` ACTION: the client sends it before its local `resetToLobby()`, the host's handler calls its own `resetToLobby()`, and the resulting generic `HOST_END_GAME` drives the existing `mp-host-disconnected-overlay` for everyone else — no per-game banner, unlike PASS's richer `PASS_MATCH_DISSOLVED`. The `sw.js` header comment was also corrected from a stale v149. See decision-log 2026-08-01 and `gth-implementation-notes.md` § Multiplayer Lessons.) Previous: v150 (**PKO playtest round 4 — event legibility.** Two changes, no rules or packet change. **(1) One interstitial dwell.** `PKO_EVENT_SCREEN_MS` (2.5 s) is gone; both auto-advancing interstitials — `screen-pko-event` and `screen-pko-unchallenged` — now run off a single `PKO_INTERSTITIAL_MS = 5000`, deliberately equal to `PKO_CARRION_WINDOW_MS`. 2.5 s was the reading budget for a winner's name; it is not enough for an event name **plus** a blurb, and a table changing tempo at 2.5 s against Carrion's 5 s read as two games (D35). **(2) The live event stays on screen.** The table header is now `Clash X · Encounter Y · [emoji] [Event]` (`#pko-table-event`) with a `[?]` (`#btn-pko-events`) opening the **`pko-events-overlay`** — the full nine-event roster, rendered from `PKO_EVENTS` by `pkoRenderEvents()` so markup can never drift from the registry, with the live event ringed (`.pko-event-live`). Rules copy lives in `PKO_EVENT_DETAIL` beside the registry, same discipline as `PKO_EVENT_SOUND`. Two more entry points via `.btn-pko-events-open` — the Sylly Mode card in **settings** and in **how-to** (the FRT Fruity Personalities precedent). The header gate is `pkoEvent || pkoEventsFired.length` — the same synced state the header displays, so the `[?]` cannot appear on a table that has never seen an event. Harnesses **68 / 132 / 148**; the events harness gained registry↔`PKO_EVENT_DETAIL`↔`PKO_EVENT_SOUND` coverage checks and a dwell-equality check.) Previous: v149 (**Force of Nature** — PKO's Sylly Mode, shipped. Nine events (fixed opener Invasive Mimicry + eight drawn per Encounter), the **Mimic** card as the 15th chain entry, `screen-pko-event`, `pko-carrion-overlay`, `.pko-card-alpha` / `.pko-carrion-bar` CSS, and a third harness `tools/verify-pko-events.js`. Breaking signature change: **`pkoResolveClash(winnerIdxs)` takes an array** — Extinction Event can empty several Hoards at once, so joint winners share the Clash and a joint target crossing wins the Match together. `pkoDiscardBoard(exceptIdx)` and `pkoAfterBoardChange(playerIdx, spoils)` also gained parameters, both defaulting to the shipped behaviour. Architecture: events are plain data in `PKO_EVENTS`, read through `pkoEventFlag(key)` so no call site ever compares `pkoEvent` to a string; the Mimic is interpreted in exactly one function (`pkoResolveGroup`) which `pkoAnswers` routes through, leaving `pkoBeats()` and `pkoMarks` untouched. **Dark Forest cut** (D26).) Previous: v148 (**Reduced motion + Motion Standard** — accessibility + rules work, no gameplay change. The suite had **zero** `prefers-reduced-motion` support against 27 `@keyframes` and 487 `transition-all`; `css/styles.css` now ends with one global block honouring the OS preference. It is deliberately **duration-based** (`animation-duration: 0.01ms`), **never `animation: none`** — `li5.js` attaches four `animationend` listeners (`card-enter`, `streak-fire-shake`, two `hype-pop`) that do the *cleanup*, so killing the animation outright would strand the class and its text on screen permanently; a near-zero duration still fires the event. Being global, new animations are covered for free — do not add a second block. Also: `.claude/rules/ui-style.md` gains **§ Motion Standard** (duration table 100–160 ms tap → 200–500 ms overlay with a 300 ms ceiling, easing by role with **never `ease-in`**, transform/opacity only, `transition-all` logged as known debt with a don't-add-more rule) and `emil-design-eng` is installed as an **on-demand** skill in `.claude/skills/` (not auto-loaded, zero baseline cost). Toolchain: Claude Code updated **v2.1.114 → v2.1.220**, unlocking `/doctor` and `/goal`; **Impeccable rejected** — see decision log.) Previous: v147 (**PKO round-2 follow-up** — one bug + three polishes, no rules or packet change. **BUG-05**: a mixed answer (Mongoose, Mongoose, Octopus vs three Fish) was refused from the table fan while the Challenge builder accepted it — v146 built quick-play by reusing the Stake's group-cycling and so inherited the Stake-only *"one species only"* refusal. The two selections are now separate models by construction: `pkoStakeSel` (flat, one species) for a Stake, `pkoDraft` (per-Mark, mixed) for a Challenge, with the table's new `pkoCycleAnswerGroup` calling the **builder's own** `pkoAutoFillSlot(pos, containerId)`. `pkoQuickPick`/`pkoSubmitQuickChallenge` deleted; the Challenge button commits when `pkoDraftComplete()` and otherwise opens the builder **carrying the partial draft in** (`pkoOpenChallenge` re-arms only a *stale* draft). Swarms are now reachable from the table too. Also: **"Build a Challenge…" button removed** (the brand-coloured Challenge button is dual-purpose); rejection hints now render on the **table** as well as in the builder (`pko-table-hint`); **fan polish** — the horizontal scrollbar was the *rotation*, not the strides (`transform: rotate()` doesn't change the layout box but does create visual overflow, and both fans are `overflow-x-auto`), so `pkoLayoutFan` now reserves the true sweep `2·H·sin(span/2)` and tightens both strides [0.20W→0.16W within species, 0.64W→0.50W between] so **Hoard 12 never scrolls**, and the container's height is **computed** from the layout rather than fixed in CSS; "Clash N complete" → **"Clash N Summary"**. Harness extended to **123 loop checks** — §12 now drives the table tap path directly (mixed answers both orders, the wrap-release cycle, a table-built Swarm, an illegal tap), the gap that let BUG-05 ship past 111 green checks. Previous: v146 (**PKO playtest round 2** — two rules changes + five UI fixes, no precache list change [`data/pko-data.json` was already listed]. **Swarm restored** — `pkoDraft` becomes an array-of-arrays [one slot may hold 2 positions], new single-source per-slot predicate `pkoAnswers(markId, cards)` beside `pkoBeats`, plus builder-only `pkoSlotAccepts` for half-built Swarms; `PKO_CHALLENGE.assignments` is now **one id array PER SLOT** [`[['bear'],['mouse','mouse']]`] and the host flattens it into the new board. **Appetite** setting [`pkoAppetite` `'sated'`/`'ravenous'`, **default Sated**] — `data/pko-data.json` gains `reach_beaten_by` carrying six two-tier edges, `pkoLoadChain` builds both predator maps at load and `pkoPredators()` chooses; it is **load-bearing in MP** [host re-validates with `pkoBeats`] so it ships in `mpSerialiseSettings` + SETTINGS_SYNC. UI: **BUG-03** Retreat + Stampede got `flex items-center justify-center` [revealed with `display:flex`, no centering utilities — rule widened in `logic-engine.md` beyond custom brand classes]; **BUG-04** the builder now gives a *named reason* on refusal and **Stampede shows disabled with its price** on a uniform board instead of vanishing [spec §7 deviation, §17 D10]; **quick Challenge** from the table fan [`pkoQuickPick` + `pkoSendChallenge` as the single validated exit] with `Build a Challenge…` always available; **true fanned hand** [`pkoLayoutFan` rotates each card; the selection lift moved INTO the inline transform because `.pko-card-selected`'s `transform` would fight it]; Watering Hole is now **batch records** `{enc,cards[]}` so Discards group by encounter, Trail + Discards render **newest first**, and the Clash Complete screen gets a `Trail & Discards →` button; PKO's three decision modals raised `min-h-11/text-sm` → `min-h-14/text-lg` [it was the smallest of 16 games]. Harnesses extended to **58 chain + 111 loop** checks — every invariant now runs under BOTH Appetites, the apex band is asserted identical in both, and Swarm has every rejection path covered. Previous: v145 (**PKO playtest round 1** — seven fixes. **BUG-02** [the blocker]: `pkoRemoveFromHoard` now sends the acting player their whole authoritative Hoard over the private channel as `PKO_HAND_SYNC` whenever the actor isn't this device — a client's `pkoMyHoard` was previously only ever written by the deal, so every card it played stayed in its fan and was then silently rejected by the host's `pkoHoldsAll`. Plus: **Small Fry** opener setting [`pkoStartSmall` off/match/clash + `PKO_PREY_RANK`, enforced at tap, client submit and host re-validation]; **overlap Hoard fan** [`pkoLayoutFan`/`pkoGroupHoard`, no more horizontal scroll] with the **species group as the tap target** [`pkoCycleStakeGroup` replaces `pkoToggleStakeCard`]; **Watering Hole** made visible + broadcast, now the home of the Trail [two-tab overlay: Trail | Discards]; **Chain overlay tabbed** Diagram | Animals — the first call site for `assetExtra('pko','chain')`; Challenge builder → **Challenge + ← Back** with Reset demoted inline; all four table actions matched to `min-h-14 text-lg` and the two missing `btn-mp-action` hooks added. Harness extended to 92 checks [Small Fry + a card-conservation census]. No precache change — `chain.jpg` was already listed. Previous: v144 (**PKO Step 5 logic injection** — Challenge builder [`pkoOpenChallenge`/`pkoRenderChallenge`/`pkoTapSlot`/`pkoTapFanCard`/`pkoAssignToSlot`/`pkoAutoFillSlot`/`pkoResetChallenge`/`pkoDismissChallenge`], Stampede [`pkoSubmitStampede`/`pkoApplyStampede`/`pkoRenderStampede`], `pkoSubmitChallenge`/`pkoApplyChallenge`, the missing `PKO_CHALLENGE` + `PKO_STAMPEDE` ACTION handlers, and `pkoApplyExpansionOverrides` as a documented no-op. Fixes **BUG-01**: `pkoEndEncounter()` now clears `pkoMarks` synchronously instead of leaving the board standing until the interstitial's 2.5 s timer, closing a window where a late client Retreat resolved the Encounter twice. New tool `tools/verify-pko-loop.js`. No precache list change — `js/games/pko.js` was already listed. Previous: v143 — **Core art tier** — `data/art/<kind>/` packs hold a game's *default* artwork using the skin-pack manifest format but precached + invisible to the Terminal; `assetFace`/`assetBack` moved out of `secret-mode.js` into the new always-loaded `js/lib/art.js` and now resolve skin → core art → emoji, plus `assetExtra(kind,key)` for non-card art. First user `data/art/pko/` — 17 images, 26 MB of PNGs converted to 360 px JPEGs at a 40 KB/card ceiling = **682 KB**. Also adds `js/games/pko.js` + `data/pko-data.json` to precache. Previous: v142 — DSD Sylly Mode renamed Mission Abyss → **Silent Running** to resolve a vocab clash with PASS's Sylly Mode "The Abyss" — PASS keeps the name [it's a load-bearing mechanic: `passAbyss` pool, `abyss-draft` phase, "the abyss gazes back"]; DSD's was a cosmetic display string only. Display strings in `index.html` [sabotage header, settings, how-to] + `dsd.js` pass-gate subtext changed; internal `playAbyssThud()` audio left as-is. Previous: v141 — Phase-audit Protocol A polish sweep: Counting Sheep sheep flight reworked into a smooth parabolic fence-jump arc [multi-point `@keyframes shpSheepArcIn/Out` + `linear` timing]; stale skeleton `TODO` markers + two dead NT stubs [`ntComputePlayback`, `ntValidateTeams`] removed. Previous: v140 — Cartridge Phase A: `data/packs/` runtime-cached — network-first JSON, cache-first images; legacy `data/secret*_words.json` migrated into manifests + removed from precache. Previous: v139 — Lobby min-players hint: host lobby now shows "Need N more players to start (min M)" below the capacity line while the start CTA is locked — `mpRenderHostPlayerList()` + `#mp-lobby-min-hint`. Previous: v138 — Counting Sheep playtest round 2: hand-sort falsy-zero fix [Pastures leftmost, +1/+2/+5/+10], card-info tap-outside-to-close, sheep animation reworked to an absolutely-positioned arc-from-left overlay [no layout jank] with in/out direction by net Herd delta, deck rebalanced 71→73 [~66% pasture], "Counting Backwards −N" restored in inspect modal, Last/Dream Journal moved to right whitespace + rename "Log →"→"Dream Journal", "The Sky is Falling"→"The Dream is Collapsing", Night Terrors drop softened to round-based escalation −2 base +2/round. Previous: v137 — PASS playtest fixes
