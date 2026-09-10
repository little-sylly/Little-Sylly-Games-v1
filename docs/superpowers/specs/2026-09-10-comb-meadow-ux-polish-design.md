# Honeycomb Hills — meadow screen UX polish + the roll-7 strand fix

**Date:** 2026-09-10
**Game:** Honeycomb Hills (`comb`, game 20) · SW v225
**Classification:** architectural (restructures `screen-comb-meadow`'s three zones and turns
`comb-map-overlay` into the game's full-detail view; batches Tier-0/1 polish + one P0 bug into the
same unit of work per CLAUDE.md § Batching rule)
**Source:** owner's first real multi-device session, 10 Sep 2026.

---

## 1. Problem statement

A real 3–4 device session surfaced one hard break and a cluster of UX gaps on the meadow screen:

1. **Every 7 strands every client** (P0, deterministic on default settings).
2. The meadow screen has ~124 px of dead letterbox above the board and ~121 px below it (measured at
   390×844) doing nothing, while genuinely useful public state (per-player round takes, cells/domes,
   instinct counts, visible VP) is either absent or crammed into an unreadable header line.
3. The Scout Flight result is visible only during a ~600–1050 ms animation and then only as text in
   the status line — players miss it.
4. The Bloom Marker pip dots (the Catan-style rarity dots under 6/8) are invisible at board scale.
5. The hot pog (6/8) number is cream on a red disc — hard to read.
6. Nothing on the board shows which Trade Blossoms a player has reached, or where to build to reach one.
7. The board fades nothing after a roll, so "what just paid out" takes a beat to read.
8. `comb-map-overlay` is only a pinch-zoom board — it does not carry the detail a 25–50 minute
   season accumulates.

This design fixes (1) as a standalone P0 and reworks the meadow screen + zoom overlay for (2)–(8).

---

## 2. Non-goals

- **Hexboard palette.** The saturated pink/purple flower hexes clash; this is an art pass, tracked
  separately. This design only adds the *fade* behaviour (S4), not new hex colours.
- **Flight-budget changes.** `COMB_FLIGHT_MS` (1050 ms first 3, 600 ms after) and its
  `verify-comb-loop.js` ceiling are unchanged. The persistent result chip (S2) removes the need.
- **Season Log surfacing at gameover**, the short gameover screen, the empty standby roster — other
  T7c gaps, out of scope for this batch.
- **New rules, packets, or scoring.** Except `COMB_OVERFLOW_DONE` gaining one boolean field (S1).
  All new UI reads existing public state.

---

## 3. Architecture context (unchanged, and load-bearing)

- **`screen-comb-meadow` is the one screen not on the Stack** — legacy `h-screen` sticky-footer,
  whitelisted, because the board is permanently fit-to-view and must not scroll while read/tapped.
  This design keeps that. New panels **float over the board stage's letterbox dead-space**; they add
  no layout height and the board stays fit-to-view.
- **`combRenderMeadow()` is the only writer to the screen** and sets every element every time
  (seven phases, one screen). Every new element is painted from here, each behind an
  `if (!el) return` guard (the loopback runs a real mock DOM; a render throw strands the device).
- **`combDrawBoard(canvasEl, viewport)` is pure and shared** by the inline board and the magnifier —
  "the map cannot become a second source of board truth". The restructured overlay (S6) still draws
  through it.
- **Motion Standard.** New transitions animate `transform`/`opacity` only. Opacity fades clear the
  global reduced-motion block (no travel). No `@keyframes` added to the flight (every frame is
  `combFlightPaint`).

---

## 4. S1 — P0: the roll-7 strand + setting-consistent copy

### 4.1 Root cause

`combScoutFlight` ([comb.js:1440](../../../js/games/comb.js#L1440)) broadcasts
`COMB_ROLL_RESULT { phase: 'overflow' }` to every device *unconditionally* on a 7 — before anyone
knows whether a discard is owed. Clients enter `overflow` and show *"A seven. Everyone over the
limit spills half."*

`combBeginSeven()` ([comb.js:1474](../../../js/games/comb.js#L1474)) then runs **host-only**. When
`!combOverflowOwed.some(v => v > 0)` it calls `combEnterWaspMove()` — which sets the host's phase
locally and **broadcasts nothing**. Clients are stranded in `overflow`, no overlay, no packet coming.

`combCarryLimit()` returns `Infinity` when `combOverflow === 'off'`, and the default Season
(**Short Summer**) presets The Overflow to **Off** — so on default settings *nobody ever owes* and
the no-broadcast branch is taken on **every** 7. On Snug/Roomy it fires any 7 where nobody is over
the limit.

The `verify-comb-loop.js` and `verify-comb-loopback.js` overflow cases only ever drive the path
where someone owes. The "nobody owes → straight to Wasp" branch was never sent over the wire.

### 4.2 Fix

**One outcome packet per branch, always broadcast.**

- `combScoutFlight`'s 7 branch **stops sending `phase: 'overflow'`** in `COMB_ROLL_RESULT`. It sends
  the roll, `produced: combZeroGrid()`, `handCounts`, `waspBlockedHex` and a transient marker (a
  `seven: true` flag) that drives a brief *"A seven!"* status beat without committing a phase.
- `combBeginSeven()` **always** ends by broadcasting exactly one of:
  - someone owes → `COMB_OVERFLOW_BEGIN { owed, ready }` (unchanged) + `combPhase = 'overflow'`
  - nobody owes → `COMB_OVERFLOW_DONE { spilled: false, phase: 'waspMove', handCounts }`, then
    `combEnterWaspMove()`
- `COMB_OVERFLOW_DONE` gains `spilled` (bool). The existing client applier
  ([comb.js:4190](../../../js/games/comb.js#L4190)) already sets phase + calls `combEnterWaspMove()`;
  it now skips the *"The hive spilled over"* log append when `spilled === false`. Read it as
  `const spilled = ('spilled' in p) ? !!p.spilled : true;` — `false` is a legitimate stored value
  (Firebase erases only emptiness), and an absent field means an old-format packet, which should
  still log.
- `combOverflowResolve()` ([comb.js:1532](../../../js/games/comb.js#L1532)) — the *someone-owed*
  resolve path — passes `spilled: true` explicitly.

~15–20 lines across `combScoutFlight`, `combBeginSeven`, `combOverflowResolve`, and the
`COMB_OVERFLOW_DONE` / `COMB_ROLL_RESULT` appliers. No schema redesign; one new bool.

### 4.3 Setting-consistent copy (owner point 1)

`combStatusLine` ([comb.js:2693](../../../js/games/comb.js#L2693)) `case 'overflow'` and the 7 beat
become owe-aware:

| Condition | Line |
|---|---|
| 7, Overflow on, this device owes | *"A seven. Half of what you're carrying goes back to the meadow."* (existing overflow-overlay sub) |
| 7, Overflow on, someone else owes | *"A seven. Waiting on the others to spill."* |
| 7, Overflow **off** (no discard step) | *"A seven. Park the Wasp somewhere painful."* / *"[Name] is moving the Wasp."* |

The instruction never names an action the current settings don't allow.

**Paired change:** `comb.md` T7b's status-line copy block (`# screen-comb-meadow —
combStatusLine()`) is updated in the same commit and `node tools/verify-identity-docs.js` re-run.

### 4.4 Verification

- New `verify-comb-loopback.js` case: host + 2 clients, everyone under the limit, force a 7. Assert
  all three reach `combPhase === 'waspMove'`, the roller's device has `combPlacementMode === 'wasp'`
  with legal targets, no device recorded a `warn:`/`error:`, and no *"spilled over"* log line.
- Add a second case with mixed owe (seat 1 owes, seats 0/2 don't) to prove the existing path still
  passes and the gate still opens correctly with a non-owing third seat.
- `node tools/verify-comb-loop.js` + `node tools/mutate-comb.js` ×5 green.

---

## 5. S2 — Top zone: player panel, roll result, probability ruler

Three elements floating over the top letterbox dead-space (≈124 px clear above the board), all
painted from `combRenderMeadow()` behind `if (!el) return` guards. New markup added inside
`#comb-board-stage` (which is already `relative`), *not* new sibling zones.

### 5.1 Player panel — replaces `#comb-turn-order`

`#comb-turn-order` (the 44×8 px dot row) is replaced by `#comb-player-panel`, `absolute top-2
left-2`, `pointer-events:none`, a vertical stack of 3–4 rows:

```
● You        1🕯 2🍯
● Mara       —
● Shirley    1🌼
● Ade        3🍇
```

- **Colour chip** — the player's turn-order colour (the same palette the dots used).
- **Name** — truncated to ~8 chars.
- **This round's take** — from the last `COMB_ROLL_RESULT.produced[p]` (public, already on every
  device). Rendered as compact `count×<resource glyph>` pairs; `—` when nothing bloomed for that
  player. A Queen Dome's ×2 is already in `produced`. Cleared/blanked at the head of the next cast.
- **Active player's row lights up** (background tint + subtle scale, one-shot). This is the
  turn-handover signal (T7c's thinnest gap) — on a board that looks identical on every phone, this
  is what says "it's you now".

Resource glyph: reuse `combRenderResource(kind, { small: true, glyphOnly: true })` if such an option
exists, else a new tiny variant — decided in the plan against the real seam.

### 5.2 Landed roll — `#comb-roll-result`

`absolute`, top-centre of the stage, above the ruler. The rolled number, large, in the die/compass
visual language. Appears on `COMB_ROLL_RESULT` land (or `combLandFlight`), **persists until the next
cast**. On a 7, shows `7` with the Wasp tint.

Does not replace the flight animation — it is what the animation lands *into* and leaves behind.

### 5.3 Probability ruler — `#comb-prob-ruler`

`absolute`, top-centre, directly beneath `#comb-roll-result`. **Full 11-tick scale** (values 2→12):

- Each tick's height and/or opacity encodes the 2d6 frequency (counts out of 36:
  `2:1 3:2 4:3 5:4 6:5 7:6 8:5 9:4 10:3 11:2 12:1`).
- Colour ramp: 7 = red (`#B3261E`, the old hot-pip red, now reused here), fading to dull pip-gold
  (`#6B6157` neighbourhood) at 2 and 12.
- The **current roll's tick is marked** (enlarged / ringed).
- Target width ≈ 45 px. Sits between the left player panel and the right-pinned 🔍 — the plan
  confirms it fits at 390 px via `visual-check`; **fallback** if it genuinely cannot: render only
  the landed value ±1 (3 ticks) on the main stage, full scale in the overlay.
- **Full annotated version** (value labels + `×N/36`) lives in the zoom overlay's top zone (S6).

Pure function of the value — no state, no packet.

### 5.4 🔍 magnifier

`#btn-comb-map-open` stays exactly where it is — `absolute top-2 right-2` inside the board stage.
Not moved into the header chrome row (owner point 9). The three new elements lay out around it.

### 5.5 Header row

`#comb-meadow-points` (the *"Sam 2 · Shirley 2 · Sylvia 2"* line) is **removed from the markup**.
`#comb-meadow-turn` (*"TURN 9 · YOU"*) stays. The header collapses to one text line + chrome.
`combPointStrip()` / `combAchievementMark()` usages audited — if `combPointStrip` is now unused,
delete it; the achievement marks move into the S3 snapshot and the S6 stats table.

---

## 6. S3 — Bottom zone: player snapshot strip

`#comb-player-strip`, floating over the bottom letterbox dead-space (≈121 px clear), painted from
`combRenderMeadow()`. `pointer-events:auto` — the whole strip is one tap target.

**2×2 grid of player mini-cards**, two per side:

```
● You          6 VP        ● Shirley      5 VP  🛡️
  ⬠3  👑1  ▬5  🎴2           ⬠2  👑0  ▬3  🎴0

● Mara         2 VP        ● Ade          2 VP
  ⬠1  👑0  ▬2  🎴1           ⬠1  👑1  ▬0  🎴3
```

Per card:
- colour dot + name + **visible VP** (`combPublicPoints(p)`) + achievement mark
  (`combAchievementMark(p)` — 🥇/🛡️/🏆).
- icon row: **cells** (`level 1` nodes owned by p), **domes** (`level 2`), **walls** (edges owned by
  p), **instinct held** (`combPublicInstinct[p]` — unplayed count, never kind).
- the **active player's card is ringed**.

Counts derive from `combNodes` / `combEdges` / the public mirrors — all already on every device.
Icons: the plan settles the exact glyph set (resource-shaped vs emoji) and truncation against a
`visual-check` render; 175 px/column is tight but workable.

**Tapping the strip opens `comb-map-overlay` scrolled to its bottom (stats) section** (S6).

---

## 7. S4 — Board focus-dim (fade + build glow)

One shared helper — call it `combFocusDim(ctx, mode)` — applied as a **layer over the static board
cache** (`combStaticCache`, layers 1–4), never baked into it. 65% opacity. 150 ms opacity
transition on entering/leaving a dimmed state (no travel; reduced-motion safe).

Two trigger contexts:

| Context | Dimmed | Full |
|---|---|---|
| **After a roll** (`combPhase === 'actions'` with `combRoll` set, non-7) | hexes whose `marker !== combRoll`; the Wasp's hex | pieces, pogs, Trade Blossoms, hexes that bloomed |
| **During Build placement** (`combPlacementMode` is a build kind) | the whole ground except legal targets and the player's own network | legal target nodes/edges get the **player-colour glow** on top |

The post-roll dim clears at the next cast (`combStartFlight` / `combPhase → 'roll'`). The placement
dim clears when `combPlacementMode` is cleared.

The build-mode legal-target glow reuses `combLegalTargets` (already computed by
`combLegalTargetsFor`) — this only adds the glow pass and turns the dim on for placement mode.

---

## 8. S5 — Polish

### 8.1 Hot pog text + pip removal

`combDrawBoard` pog block (~[comb.js:2878-2905](../../../js/games/comb.js#L2878)):

- Hot pog number: `#FDF6E3` → a dark ink that does not sit on the disc's red rim (`#2A1A16` or the
  existing `#3A322A`, kept within the pog's lighter inner field). Normal pog unchanged.
- **Delete the pip-dot rendering entirely** (both hot and normal — [comb.js:2902-2903](../../../js/games/comb.js#L2902)).
  The probability ruler (S2.3) carries rarity now.

### 8.2 Trade Blossom reach affordance

In `combDrawBoard`, after the Trade Blossom layer, per blossom, for the local player:

- **Not yet reached by you** — a soft dock-style glow in the blossom's colour on the adjacent
  **corner node(s)** where a Drone Cell would earn the rate (respecting legality: unowned, and the
  Distance Rule would permit a cell there). "Build here to trade."
- **Reached by you** — a glow in the blossom's colour on **your own cell/dome** sitting on the
  enabling node. "Trade is live from here."

`combBankRate(p, i)` already knows which blossoms a player has reached; the enabling-node set comes
from the topology's `port → nodes` map.

**Suppressed during Build placement mode** so the blossom hints don't compete with the S4
legal-target glow. Rendering priority: placement glow > post-roll dim > blossom hint.

### 8.3 Header points line

Covered in S2.5 — `#comb-meadow-points` removed.

---

## 9. S6 — `comb-map-overlay`: the 3-zone detail view

Restructured from "pinch-zoom board + one hint line" into a full-screen sheet mirroring the meadow
screen at full detail. **Stays z-75** — still the one overlay that loses a z-fight, so the Overflow
and an arriving trade land on top (unchanged, and still correct).

- **Top zone** — the same `#comb-player-panel` content (with room for each player's last-few-rolls
  take history), `#comb-roll-result` large, and the **full annotated probability ruler** (value
  labels 2–12, `×N/36` under each, the 7 red ramp).
- **Middle zone** — the board via `combDrawBoard`, in a **gesture-locked container**:
  - pinch zoom (touch) **and** mouse-wheel zoom (`wheel` listener, `preventDefault`)
  - drag / two-finger pan
  - `touch-action: none` + `overscroll-behavior: contain` on the wrapper; the canvas clipped to
    this zone so zoom/pan never scrolls or bleeds into the top/bottom zones
  - the *"Pinch to zoom, drag to pan — scroll to zoom on a mouse"* hint is a small caption inside
    this zone, off the board (currently overlaid on it)
  - existing `combZoom` / `combPanX` / `combPanY` UI state is reused; the wheel handler adjusts
    `combZoom` around the pointer.
- **Bottom zone** — full per-player stats table: rows = players, columns = **VP · cells · domes ·
  walls · longest chain · instinct held · Trade Blossoms reached**. Plus the current status line and
  turn info. (Golden Nectar is never shown here — hidden until gameover.) Opened via the S3 strip
  tap, this zone is scrolled into view.

`combDrawBoard` is untouched — the overlay still hands it a canvas + viewport. Teardown stays in
`resetToLobby()` (the overlay id is already listed).

---

## 10. S7 — Art convert-tool self-serve doc

New section in `docs/content-prompts/comb-art-prompts.md`:

- running `tools/convert-comb-art.ps1` directly — inputs, per-kind output dimensions and precache
  ceilings (hex 350 KB, resource 150 KB, hero piece 130 KB, die 150 KB, others per the script),
  output paths under `data/art/comb/<kind>/`
- checking the result in **How to Play → The Comb** tab (and the Instinct Deck tab) — that gallery
  renders through the live seams and *is* the offline-install check, so it is the right surface to
  eyeball a re-convert
- **no SW version bump** for a like-for-like art swap — *unless* a file crosses its precache
  ceiling, in which case `CACHE_NAME` must bump (the manifest hash / file list is unchanged, but the
  bytes served are; note the ceiling check explicitly)

Doc-only. No code.

---

## 11. Documentation & verification plan

| Artefact | Change |
|---|---|
| `docs/code-map.md` (COMB section) | New element IDs (`#comb-player-panel`, `#comb-roll-result`, `#comb-prob-ruler`, `#comb-player-strip`); `#comb-turn-order`/`#comb-meadow-points` removed; `comb-map-overlay` restructure; `COMB_OVERFLOW_DONE.spilled`; the S1 broadcast fix in the packet notes |
| `docs/game-identities/comb.md` | T7a (top/bottom panels, restructured map overlay), T7b (status-line copy block — the owe-aware 7 lines; the map-overlay hint caption), `verify-identity-docs.js` re-run |
| `docs/implementation-notes/comb-implementation-notes.md` | Bug Index: the roll-7 strand (What happened → Root cause → Lesson). Multiplayer Lessons: the loopback gap — every overflow case drove the "someone owes" branch; the "nobody owes" branch was never sent over the wire. Design Decisions: the meadow screen's letterbox-float pattern; the map overlay becoming the detail view |
| `docs/decision-log.md` | One line — `comb-map-overlay` promoted from magnifier to full-detail view |
| `docs/deferred-work.md` | Tick the T7c turn-handover gap as addressed by S2.1 |
| `.claude/rules/*` | No new universal rule expected. If the letterbox-float pattern proves reusable, a `ui-style.md` note — decided at closure, not assumed |
| `CACHE_NAME` (`sw.js`) | Bump — this ships new `index.html` + `comb.js` |

**Verification:**

- `verify-comb-loopback.js` — the two new S1 cases (§4.4). `CACHE_NAME`/`COMB_SRC=` unaffected.
- `verify-comb-loop.js`, `mutate-comb.js` ×5, `verify-comb-rules.js`, `verify-comb-board.js`,
  `verify-mp-configs.js`, `verify-identity-docs.js` — all green.
- **`visual-check` driver** (kept in the scratchpad, not committed): the meadow screen at 390×844
  and a wider phone, and the restructured `comb-map-overlay`. Measures: no horizontal body scroll;
  the top three elements do not overlap each other or the 🔍; the ruler fits (or the fallback is
  used); the bottom strip's two columns don't clip names; the focus-dim reads at 65%; the overlay's
  three zones hold their bounds under zoom/pan.
- The UI work is presentation — **no new rule/packet assertions** beyond S1's (per CLAUDE.md
  § Harness rule: harnesses cover rules/packets/state/decks/appliers, not presentation).

**Build order (for the plan):**

1. **S1** — the P0 fix + regression tests + copy. Standalone, ships-alone-able.
2. **S5.1** (hot pog + pip removal) — trivial, unblocks S2.3's colour reuse.
3. **S2** — top zone (panel, result, ruler) + header points-line removal.
4. **S3** — bottom strip.
5. **S4** — focus-dim (post-roll + placement glow).
6. **S5.2** — Trade Blossom affordance.
7. **S6** — the map-overlay restructure.
8. **S7** — art doc.
9. Documentation-closure pass (one, at the end — CLAUDE.md § Batching rule).

---

## 12. Open items carried to the plan

- The resource-glyph rendering path for the panel/strip (new `combRenderResource` option vs. a tiny
  new helper) — decided against the real seam.
- Exact bottom-strip icon set and name truncation — decided against a `visual-check` render, then
  iterated with the owner.
- Whether the ruler fits full-scale at 390 px, or the 3-tick fallback is used — decided by
  `visual-check`.
- Whether `combPointStrip()` has any surviving caller after S2.5 — deleted if not.
