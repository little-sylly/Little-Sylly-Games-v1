# Cookie Jar — Stage Polish Round (design spec)

**Date:** 8 Aug 2026
**Game:** Cookie Jar (`cjar`), game 18
**Status:** confirmed by owner, ready for implementation plan
**Target SW version:** v165
**Follows:** `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md` (DD-18…DD-24, SW v164) — this
round is owner feedback from the first real playtest of that rework, not a new root-cause finding.

---

## 1. The problem

The Aug 7 action-stage rework fixed the *missing* feedback — a flip now has a visible beat. Playing
it revealed a second problem: the beat that exists is too fast to read comfortably, and four
supporting surfaces (headings, the score table, the family strip, the gameover screen) came out of
that rework inconsistent with each other in ways that read as unfinished. None of this is a new
root cause — it's the first round of "now that it's visible, here's what's wrong with what we see."

Nine changes, grouped by area: the reveal choreography (DD-25), three stage-column heading fixes
(DD-26), a trail-card popup (DD-27), a score-table restructure (DD-28), family-strip spacing
(DD-29), gameover polish (DD-30), and a suite-wide button-consistency rule applied to CJAR first
(DD-31).

---

## 2. Design decisions

### DD-25 — The reveal choreography roughly doubles, and the tail overlaps decision time

**Symptom:** the animation lands but feels rushed — a helper for reading what happened, and it's
gone before it's helped. Owner guidance: smoothness is the priority; overlap with decision time is
the release valve if the added length ever reads as "stealing" time from the clock, not a hard
constraint to hit an exact time-neutral total.

**Which beats block, which don't:** the three beats that carry information the player needs before
deciding (the flip itself, the hold where it's readable, the payout where cookies actually move)
stay fully blocking — nothing to act on until you've seen the outcome. The fourth beat (the spent
card physically sliding into the history strip, the next face-down card rising to replace it) is
pure housekeeping with no information in it, so it's the one that moves off the blocking clock and
plays out concurrently with the decision window already being open. This is the same "transient
animations float over a relative anchor, contribute zero layout height" pattern the delta-token
layer already uses (`ui-style.md` § The Stack, "Transient animations must float").

| Beat | Today | Proposed | Blocking? |
|---|---|---|---|
| Flip (card turns face-up) | 300ms | 600ms | yes |
| Hold (fully readable, nothing moving yet) | 600ms | 1200ms | yes |
| Payout (crumbs/tokens move) | 700ms | 1400ms | yes |
| **Settle** (slides to trail, new card rises) | 500ms | 1000ms | **no — overlaps decision window** |

`CJAR_FLIP_ANIM_MS` (blocking portion, drives `cjarEndTimestamp` and the host auto-resolve timeout)
becomes **3200ms**, up from 2100ms. A new `CJAR_SETTLE_MS` = **1000ms** covers the cosmetic tail —
its CSS animations (`cjar-trail-settle`, the new card's rise-in) fire once the blocking dwell ends
and are never awaited by any JS gate.

**Within Payout specifically** (the crumbs/token complaint): the value updates and *holds* on
screen for a beat before the token burst starts moving, rather than moving immediately, and the
token flight animation itself roughly doubles (~380ms → ~760ms CSS transition), so cookies visibly
travel slower toward the score table / Crumb pile instead of snapping across.

**Time-budget honesty, not a target to hit exactly:** doubling flip+hold+payout alone (3200ms) is
already more than today's *entire* blocking choreography including settle (2100ms) — freeing up
the settle beat doesn't fully offset the doubling. Net effect is roughly **+1.1s more blocking time
per flip** than today, on top of the +300ms/flip DD-19 already added. Across a ~40-flip match
that's another ~+45s. Owner-accepted trade-off for smoothness; if a playtest says it drags, the
lever is shifting more of Hold/Payout's length into the overlapping Settle beat rather than
shortening the choreography outright — Settle already has headroom (it's free) and isn't at its
ceiling.

**Unaffected by this DD:** `CJAR_REVEAL_MS` (1200ms outcome dwell), the bust path (still runs the
full flip beat before `screen-cjar-busted`, per the existing DD-19 rule), and the "three rules the
implementation must not break" from the Aug 7 spec (setTimeout-driven, never `animationend`;
reduced-motion collapses duration not `animation:none`; token layer stays absolute-over-relative).
Those three rules apply identically to the new `CJAR_SETTLE_MS` tail.

### DD-26 — All three stage-column headings move to the top, nothing sits below the art

**Symptom:** column 1 ("Up for Grabs") already reads top-down (heading → content); columns 2 and 3
read bottom-up (content → heading), so the row doesn't scan as one unit, and column 2's label
wraps to two lines in the process.

- **Col 1** — unchanged position (already the reference). Its inner padding/gaps tighten and its
  Crumbs value / Treat art / caption enlarge — see DD-26a below.
- **Col 2** — the label moves above `#cjar-table-hero`, nothing renders below the card. **Both**
  states of the label swap move: face-down ("next out of the jar") shortens to **"Next from Jar"**
  to fit one line; face-up ("just revealed") moves to the same top position — the swap mechanism
  (`cjar-stage-label-now` textContent) is unchanged, only its DOM position and the face-down copy
  change.
- **Col 3** — the label moves above `#cjar-deck-badge` and becomes **"Left in Jar"**; the deck-stack
  graphic vertically centres in the remaining column height (`justify-center` replaces
  `justify-between`) instead of pinning to the top with dead space below it.

All three headings share the same type scale and position (`text-[0.6-0.65rem] uppercase
tracking-widest`, top of the column) — that positional/scale consistency is the actual fix.
Colour stays **deliberately non-uniform**: col 1 and col 2 keep the branded `cjar-label` gold (the
"up for grabs" and "what's happening" columns are the ones worth emphasising), col 3 keeps its
muted `text-stone-300` (DD-24 already established the deck as the de-emphasised reservoir — this
round fixes its position, not its emphasis).

### DD-26a — Column 1 density

Reduce `#cjar-grabs-card`'s internal padding/gap so the card doesn't read as mostly whitespace;
enlarge `#cjar-crumbs-value`, the Treat art, and `#cjar-grabs-caption`. The caption
("Sneak out alone and you take the lot.") is the specific visibility complaint — it currently ships
at `text-[0.55rem]`, smaller than every other label on the stage; it moves to something in the
`text-xs`–`text-sm` range with room to breathe, no layout restructure needed.

### DD-27 — Trail cards are individually tappable; the strip itself stays a pure scroll container

Confirmed: click handlers go on each card thumb in `#cjar-trail-strip`, never on the container.
The container's existing "no handler here, it fights the swipe" comment
(`cjarRenderTrailStrip`, `cjar.js:709-712`) stays true and gets a one-line addendum explaining why
per-thumb handlers are safe where a container-wide one wasn't — a tap and a drag are already
distinguished by the browser's native click-vs-scroll heuristic on an `overflow-x:auto` container,
so a discrete small target doesn't reintroduce the conflict. Tapping a thumb opens a small popup —
enlarged `cjarRenderCard(card, { size: 'hero' })` plus the card's name — closed by tap-anywhere or a
close button, same Decision-Modal shell as `cjar-tip-overlay`. The strip's own horizontal scroll is
untouched; this still needs to work with an arbitrarily long Raid log.

### DD-28 — Score table gets a header row, a status column, and a real column layout

**Header row** added above `#cjar-reveal-rows`: **Rank | Player | Stashed | Status | At Risk**.

**Per-row restructure**, base game:

```
[rank] [name]        [Still In / Snuck Out]   [stashed pill]   [at-risk pill]
```

Ordering matches the header: rank, name, stashed, status, at risk. The current 🚪 emoji (a text
character appended to the name string in `cjarRenderRevealRows`, `cjar.js:941` — not a button, so
it fell outside the Aug 7 Action Button Standard sweep entirely) is replaced by a proper status
badge: **"Still In"** (green) when `cjarActive[i]` is true, **"Snuck Out"** (red) when false —
base game only, same restriction as the existing At Risk pill (Dibber Dobber has no
leave/still-in concept).

**Layout mechanism:** the row moves off `flex justify-between` (which stretches to fill the row
regardless of content length — the actual source of the "lots of white space between name and
stashed" complaint) onto a grid row with defined column tracks, so column widths are consistent
across rows regardless of name length and there's no leftover elastic gap in the middle.

Dibber Dobber rows keep their existing two-field shape (rank, name, stashed pill only) — no Status
or At Risk column renders for it, matching the header's own conditional columns.

### DD-29 — Family strip spacing

Tighten `#cjar-warning-strip`'s inter-slot gap (`gap-1.5` → a smaller value) and add breathing room
between the strip and `#btn-cjar-family-tip`, so a highlighted slot's `ring-2 ring-offset-1` doesn't
visually crowd the `[?]` button. Positional/structural change only — no change to what makes a slot
"highlighted" (danger ring, High Alert ring, flip-pulse).

### DD-30 — Gameover ("The Haul")

- **Podium rank icon:** drop the 🍪 prefix on 1st place. Adopt the suite's existing medal
  convention (🥇🥈🥉 — already shipped in FRT, GTH, JEC, NAT, PASS, YGI) inside a **fixed-width
  leading slot** on every row, so 4th place and below (blank slot) still align with 1st–3rd
  (medal) — the actual fix for "it pushes rows out of alignment," which was really "only one row
  has a leading glyph and the others don't."
- **Raid history table:** highlight the top scorer's cell in each Raid column — bold text +
  `cjar-label` gold — no highlight when tied for the raid's top score.
- **Button sizing:** see DD-31 — both `btn-cjar-go-new` and `btn-cjar-go-leave` become
  `min-h-14 … text-xl font-semibold`.

### DD-31 — Same-screen action buttons match in size and weight; documented as a suite rule, applied to CJAR now

New rule for `ui-style.md`: **buttons representing real, distinct choices on the same screen must
match in size and weight — no exceptions**, including the previously-documented "Back to the Box
steps down because it's navigation" carve-out on the game menu's type scale. Per owner decision,
this applies retroactively to CJAR's own screens in this round (the gameover pair, and the game
menu's own four buttons where CJAR is touched) and is written into `ui-style.md` as the standing
rule for all future work. **The 17-other-game sweep is deferred** — logged in
`docs/deferred-work.md` alongside the other pending sweeps (DD-13 settings dynamic-value line,
DD-14 card galleries, the Decision Modal button-sizing divergence), same pattern as every prior
suite-wide rule change that started on one game.

**Also written into `ui-style.md` as a standing pattern (not just CJAR-local):** the medal-in-a-
fixed-width-slot convention from DD-30 becomes the documented shape for any gameover podium that
wants rank icons — owner take: "it's better than our other options... at least we want it
consistent from now and going forward." This is prospective (new/touched games follow it) not a
retroactive sweep of existing podiums.

---

## 3. Verification

All five harnesses need updating — same pattern as the Aug 7 rework, where the new phase timing
and label changes break existing assertions **by design**.

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

New/changed checks:

- `verify-cjar-loop` — `cjarEndTimestamp` now includes the new `CJAR_FLIP_ANIM_MS` (3200ms, not
  2100ms); a new assertion that the settle beat's timer (`CJAR_SETTLE_MS`) does **not** gate
  `cjarStartTimer` or button availability — i.e. the decision window opens at the 3200ms mark
  regardless of whether the 1000ms settle tail has finished.
- `verify-cjar-loopback` — the only harness with real render code: cover the header row + status
  badge in the score table (both Open Book settings, both modes), the trail-thumb click handler
  existing per-card rather than on the container, and the col 2/3 heading positions.
- `simulate-cjar-dd.js` — unchanged; nothing here touches a rule, value, or probability.

---

## 4. Documentation impact

Per the Documentation Integrity Protocol:

1. `docs/code-map.md` — `CJAR_SETTLE_MS`, the score-table grid restructure, the trail-thumb click
   handler, the gameover podium fixed-width rank slot.
2. `docs/rules/game-identities.md` § Game 18 — updated column headings, score-table columns, the
   status badge.
3. `CLAUDE.md` — SW v165, § Current Focus.
4. `.claude/rules/ui-style.md` — DD-31's two new rules: same-screen action-button size parity (no
   exceptions, supersedes the Back-to-the-Box carve-out) and the medal-in-a-fixed-slot podium
   pattern. Both written as standing suite rules, not CJAR-only notes.
5. `docs/implementation-notes/cjar-implementation-notes.md` — DD-25…DD-31.
6. `docs/decision-log.md` — one line; DD-31 is cross-cutting (it changes a documented UI-style
   rule).
7. `docs/deferred-work.md` — new entry: the 17-other-game sweep for DD-31's button-size rule,
   alongside the existing deferred sweeps.

---

## 5. Out of scope

- The DD payout-beat mis-narration bug already logged in `docs/deferred-work.md` (the
  innocents+no-dobbers branch) — untouched by this round, still deferred.
- Any change to what the pills/badges *mean* (Stashed/At Risk semantics, Still In/Snuck Out
  derivation) — this round only changes their layout and labelling, not the underlying state they
  read from (`cjarStashes`, `cjarRaidTotals`, `cjarActive`).
- The full 17-game DD-31 button-size sweep and the medal-podium retrofit — both deferred per §2.
