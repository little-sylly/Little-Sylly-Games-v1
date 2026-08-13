# Technical Spec — Counting Sheep: Scoring Rework

**Rework of Game 15's match structure.** Companion to the original spec (archived,
`docs/new-game-tech-counting-sheep.md`) — that document remains the source of truth for the deck,
the card effects, the ghost/Nightmare system and the Plunge. This document covers **only** what the
scoring rework changes. Anything not mentioned here is unchanged.

**Status:** Stage 2 — written 13 August 2026, off the owner's 3-player playtest.
**Baseline:** SW v176, `js/games/shp.js` as shipped.
**Supersedes:** `game-identities.md` § Game 15 → *State flow*, *Terminology* (Moons / Deep Sleep /
Sleepwalker), *Settings* (Moons), *Scoring / Win*, and the `SHP_DEEP_SLEEP` line of *Multiplayer*.

---

## The change in one paragraph

Today a Night ends at the **first** Deep Sleep: the crasher loses a Moon, everything redeals, and
0 Moons makes you a Sleepwalker for the rest of the match. Moons are lives in both modes. After
this rework, **normal mode** treats a Night as a survival round — a crash takes you out of *that
Night only*, the survivors keep playing at the same Herd with the same hands, and the **last one
awake wins the Night and earns a Moon**. First to `shpMoonsToWin` Moons wins the match. **Sylly
Mode (Night Terrors)** goes the other way: **one continuous Night** for the whole match, Moons stay
lives, and the existing Sleepwalker + Nightmare Meter system fires on elimination exactly as it
does now.

---

## Consistency Audit

| Check | Result |
|---|---|
| `shpEliminated` currently means "out of the match" | ✅ confirmed — `shpAliveCount`, `shpNextPlayer`, `shpLeaderIdx`, `shpElimOrder`, ghost gating all read it that way. **Not overloaded by this rework** — §4. |
| `shpMoons` serialised in `mpSerialiseSettings` | ✅ `engine-multiplayer.js:867`, applied `:1047` |
| `shpMoonsToWin` serialised | ❌ **new** — must be added to both sites. §5. |
| `shpHostPlayTwoCard` legality guard on the chosen pair | ❌ **absent by design** (`shp.js:590-593` validates indices only) — this is the one path to a Sylly `'busted'`. §3. |
| `shpApplyNightmare` can bust | ❌ **no** — analysis in §3. Q1 from the handoff is answered there. |
| Existing SHP verification harness in `tools/` | ❌ **none committed.** The `vm.runInThisContext` sim in `shp-impl-notes` § Multiplayer Lessons was ad hoc and thrown away. §11. |
| `SHP_DEEP_SLEEP` ack readyCheck | ✅ shipped and correct — **reused wholesale** as the Night-end ack. §8. |
| Deferred renders route through `shpShowTable()` | ✅ enforced since v176 (BUG-06). Every new render path in this spec inherits the rule. |

---

## §1 — Identity

| Field | Value |
|---|---|
| Scope | Match structure + scoring only. No new cards, no new nightmares, no deck change. |
| New screens | **None.** The Night-end summary reuses `screen-shp-table`'s Deep-Sleep sub-state. |
| New packets | `SHP_DOZE` (SYNC), `SHP_NIGHT_END` (SYNC, replaces `SHP_DEEP_SLEEP`) |
| New state arrays | `shpDozed[]`, `shpDozeOrder[]` |
| Renames | `shpLives[]` → `shpMoonsHeld[]`; `shpHostDeepSleep` → split (§7) |
| New setting | `shpMoonsToWin` (normal mode) — `shpMoons` keeps its current meaning in Sylly |

---

## §2 — State Flow

**Normal mode (`shpSyllyMode === false`):**

```
LOBBY (MDLM) → SHP MENU → [onPassThePhone: host deals]
→ NIGHT LOOP:
    NIGHT INTRO (5 s, auto) → SHP TABLE
      → a player busts or has no legal line → they DOZE OFF (banner + 😴 chip, turn advances)
      → Herd, ceiling, direction, every other hand UNCHANGED  ← the whole point
      → repeat until ONE player is still awake
    → NIGHT END summary (+1 Moon to the last awake, standings, finishing order, ack readyCheck)
    → host deals the next Night, OR
→ SHP GAMEOVER (Daybreak) once someone holds shpMoonsToWin Moons
```

**Sylly Mode (Night Terrors) — one continuous Night:**

```
LOBBY (MDLM) → SHP MENU → [onPassThePhone: host deals]
→ NIGHT INTRO (5 s, auto) → SHP TABLE  ← dealt ONCE for the whole match
    → a player busts or has no legal line → −1 Moon, THE JOLT (§7.3: their hand is
      discarded and redrawn; Herd/ceiling/direction/other hands untouched), turn advances
    → 0 Moons → Sleepwalker (shpEliminated) → Nightmare Meter + Lottery activate (unchanged)
    → Climb ⇄ Plunge oscillation, ceiling descent, mercy exit — ALL unchanged
    → repeat until one player still holds Moons
→ SHP GAMEOVER (Daybreak)
```

`shpNightNum` stays at 1 for a whole Sylly match; the Night Intro fires once. The status bar reads
"The Long Night" instead of "Night N" when `shpSyllyMode` is on (§9).

**The two arrays are mode-disjoint by construction:** `shpDozed` is only ever set in normal mode,
`shpEliminated` only ever in Sylly. `shpNextPlayer` skips both regardless — cheap, and it is what
keeps the invariant from being load-bearing.

---

## §3 — Q1 answered: can a nightmare produce a bust?

**No.** `shpApplyNightmare` (`shp.js:1410`) is the only non-play mutator of the Herd, via Cold Feet
(`kind:'nudge'`):

- **Climb + Sylly:** Cold Feet adds `+1..+4`. It can push the Herd past 99, but nothing checks for a
  bust on that path — `shpHostResolveDisrupt` calls `shpCheckMercy()` only, never `shpPostResolve`.
  The over-99 Herd is then resolved by the *next play*, and `shpPostResolve`'s first line converts
  any `climb && sylly && herd >= 99` into a **Plunge entry**, returning `false`. A Sylly Climb Herd
  above the ceiling can therefore only ever become a Plunge or a stuck-out, never a bust.
- **Plunge:** Cold Feet is sign-flipped to `−1..−4` and clamped at 0, then `shpCheckMercy()` runs.
  It can only move the Herd *down*, i.e. toward the mercy exit.
- Nightmares never touch `shpCeiling`. Only `shpPlungeTick` does, and it runs inside the play path
  where `shpIsPlayable` already gates every subsequent card against the new ceiling.

**But a Sylly `'busted'` IS reachable — via the two-card path.** `shpHostPlayTwoCard`
(`shp.js:590-593`) validates indices only; it deliberately does **not** run `shpIsPlayable` or
`shpHasSafePair` on the chosen pair, because a bad pair Deep-Sleeping you is the stated mechanic
(the in-game hint says so). In the Plunge, arithmetic is inverted, so a player under Sleep Paralysis
or Heavy Eyelids can pick two Counting-Backwards cards that *raise* the Herd past a fallen ceiling:

> Plunge, Herd 50, ceiling 60. Forced two-card. Player picks −5 and −10 → sign-flipped → 50+5+10 =
> **65 > 60** → `shpPostResolve` → `'busted'`.

Random-adds cannot contribute (they subtract in the Plunge), so a Sylly bust is always a
deterministic, freely-chosen pair.

**Consequence for the revert decision.** The confirmed rule — Herd reverts on every bust,
unconditional, no mode branch — therefore fires on **three** shapes, not the one the handoff
assumed:

| Path | Mode | Herd reverts | Comment |
|---|---|---|---|
| Single random-add gamble overshoots | Normal (Climb) | ✅ | The intended case |
| Two-card pair overshoots 99 | Normal (Climb) | ✅ | Deterministic — the player *chose* the overshoot |
| Two-card pair overshoots a falling ceiling | Sylly (Plunge) | ✅ | Deterministic; also inverted |

**Ship the rule unconditional anyway.** The alternative (revert gambles, keep deterministic
overshoots) needs a "was this a gamble" flag threaded through the two-card path, gives two different
Herd behaviours for one visible event, and rewards nobody — the deliberate overshooter is already
paying with the Night. One rule, one code path, one thing to explain. Flagged here only so it isn't
re-discovered in playtest as a bug.

### §3.1 — Deck exhaustion and the recycle pool

**The protocol exists and is correct.** `shpDrawUp` (`shp.js:303-320`) hits an empty Flock →
`shpReshuffleDiscard()` (`shp.js:297`) shuffles the discard back in and play continues. **It cannot
starve:** 80 cards against a ceiling of `playerCount × cap` ≤ 8 × 5 = 40 held in hands means
Flock+discard is always ≥ 40. The two `break` fallbacks at lines 306/308 are dead safety code —
keep them, but nothing reaches them.

**What the rework changes is the *frequency*.** Today the per-crash redeal builds a fresh 80-card
Flock (`shpBuildFlock()`) before the pile usually empties, so a reshuffle is rare. Long Nights in
normal mode and **no redeal at all** in Sylly make it routine — which exposes three things the redeal
was quietly masking.

**(a) Fogged Dream (id 13) leaks into the Flock. Required fix.** `shpBuildFlock` deliberately
excludes id 13 (it is conjured only by the Fog nightmare), but a *played* Fogged Dream is pushed to
the discard unconditionally (`shp.js:578`, and `:596` for the two-card path) and is then recycled
into the Flock by the reshuffle. Players would draw cursed cards with no Fog involved. There is no
special case anywhere — the other three id-13 references (`:357`, `:1200`, `:1605`) are render-only.

```js
if (cardId !== 13) shpDiscard.push(cardId);   // Fogged Dream dissolves on play — never recycled
```

Both play paths. The Fog nightmare's own `shpDiscard.push(shpHands[t][swap])` (`:1431`) is **correct
as-is** — it discards the displaced *Pasture* card, not the 13. Harness assertion: id 13 never
appears in `shpFlock` after any reshuffle, and the number of id-13 cards in existence never exceeds
the number of Fog nightmares that have fired.

**(b) The Big Bad Wolf recycles, and in Sylly the shrink becomes permanent.** The Wolf is pushed
back to the discard on draw (`:312`) and `shpWolfActive[i]` is only cleared in `shpDealNight`.
Normal mode is unchanged — one shrink per player per Night, restored at the next deal. **Sylly's one
continuous Night turns that into one shrink per player per *match*, with no path back:** a player
wolfed in the first ten minutes plays the entire match at cap−1. **Decision:** clear
`shpWolfActive[i]` and restore `shpHandCap[i] = shpHandSize` as part of **the Jolt** (§7.3) — you
crash, you jolt awake, the wolf lets go. It costs nothing, reuses a mechanic that already exists at
exactly the right moment, and gives the shrink a natural expiry. (Alternative considered and
rejected: leave it permanent. A whole-match cap−1 from one unlucky early draw is a bigger penalty
than a Moon, and it is invisible to the player who suffers it.)

**(c) Dozed players hold dead hands out of circulation.** New, created by this rework: a dozed
player keeps their cards until the next deal, so late in an 8-player Night up to 30 cards sit dead.
Not fatal (see the arithmetic above) but it thins the live pool for no benefit. **Decision:**
`shpHostDoze` discards the dozed player's whole hand into `shpDiscard` and sets `shpHands[i] = []`,
matching what already happens to a hand at redeal. This also resolves the render question — the
footer returns early for a dozed player exactly as it does for an eliminated one, with no greyed
dead hand to draw.

---

## §4 — State Variables

### New

| Variable | Type | Reset | Purpose |
|---|---|---|---|
| `shpDozed` | `bool[]` per player | all-`false` in `shpDealNight` | **Out of the current Night**, still in the match. Normal mode only. |
| `shpDozeOrder` | `int[]` | `[]` in `shpDealNight` | In-Night knockout order — the Night-end finishing order is this reversed, winner first. |
| `shpDozeNotice` | `{ idx, reason, landedOn }` \| `null` | cleared by the next play (alongside `shpLastDisrupt`) | Table banner for a doze/Moon-loss. Rides in `SHP_DOZE`. |
| `shpNightEndInfo` | `{ winner, order, over }` \| `null` | `null` in `shpDealNight` | Replaces `shpDeepSleepInfo` as the "a summary is showing" guard. |
| `shpMoonsToWin` | int (setting) | persists across play-agains | Normal mode: Moons needed to win the match. Default **2**. |

### Renamed

`shpLives[]` → **`shpMoonsHeld[]`**, and the payload key `lives` → `moons`.

This is required, not cosmetic. Post-rework the array counts **up** in normal mode (Nights won) and
**down** in Sylly (lives left); leaving it called `shpLives` guarantees a future reader assumes the
Sylly direction in both modes. 14 call sites (`shp.js` lines 25, 226, 228, 407, 442, 666, 668, 683,
918, 1259, 1267, 1663, 1710, 1750) — do it with a scripted rename, then grep for `shpLives` and
`\.lives` to confirm zero remain. Both readers survive the rename semantically: `shpLeaderIdx`
("most Moons" = whoever is winning) is correct in both modes, and the chip/summary renderers just
draw 🌙 per unit.

### Removed

`shpDeepSleepInfo` — superseded by `shpNightEndInfo`. `shpDeepSleepAcks` / `shpDeepSleepAckNeeded` /
`shpIAcked` are **kept as-is** and repurposed for the Night-end ack (§8).

### Modified guards

```js
function shpAwake(i)      { return !shpEliminated[i] && !shpDozed[i]; }
function shpAwakeCount()  { let n = 0; for (let i = 0; i < shpPlayerCount; i++) if (shpAwake(i)) n++; return n; }
```

- `shpNextPlayer` — the skip condition becomes `!shpAwake(i)` (was `shpEliminated[i]`).
- `shpLeaderIdx` — both loops and the tie-break walk use `shpAwake(i)`.
- `shpAliveCount` — **delete.** Every current caller means "still awake this Night"; replace with
  `shpAwakeCount()`. Leaving both names in the file is how the two concepts get confused again.
- `shpTapCard` — `if (shpActivePlayer !== me || !shpAwake(me) || !shpCardTapReady) return;`

---

## §5 — Settings

The Moons card holds **two pill groups**, exactly one visible at a time, switched by `shpSyllyMode`.
One shared value line underneath. This avoids a single number meaning "wins" or "lives" depending on
another setting — the trap that made the `shpLives` rename necessary.

| Setting (display) | Options | Default | Variable | Shown when |
|---|---|---|---|---|
| **Moons to Win** | `Catnap` / `Full Night` / `Hibernate` → 1 / 2 / 3 | 2 (`Full Night`) | `shpMoonsToWin` | Sylly **OFF** |
| **Starting Moons** | 3 / 5 / 7 | 3 | `shpMoons` | Sylly **ON** |

Markup (replaces the existing card at `index.html:8113-8121`; the pill row is unchanged in shape):

```html
<div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
  <div>
    <p id="shp-moons-title" class="text-stone-800 font-semibold">Moons</p>
    <p id="shp-moons-desc" class="text-stone-400 text-sm mt-0.5"></p>
  </div>
  <div class="flex flex-col gap-2">
    <div id="shp-moons-win-row" class="flex gap-2">
      <button class="pill" data-shp-moons-win="1">Catnap</button>
      <button class="pill pill-active-indigo" data-shp-moons-win="2">Full Night</button>
      <button class="pill" data-shp-moons-win="3">Hibernate</button>
    </div>
    <div id="shp-moons-life-row" style="display:none" class="flex gap-2">
      <button class="pill pill-active-indigo" data-shp-moons="3">3</button>
      <button class="pill" data-shp-moons="5">5</button>
      <button class="pill" data-shp-moons="7">7</button>
    </div>
    <p id="shp-val-moons" class="text-stone-400 text-xs"></p>
  </div>
</div>
```

Copy, per `ui-style.md` § Dynamic value line — the static description says what the setting
*controls*, the live line says what you just *picked*:

| Sylly | Title | Description (static) | Value line (live) |
|---|---|---|---|
| OFF | Moons to Win | Win a Night to earn a Moon. This is how many you need to take the match. | `Full Night — first to 2 Moons, usually 3 Nights.` |
| ON | Starting Moons | Lives. One long Night; lose a Moon each time you crash. At zero you become a Sleepwalker. | `3 Moons — three crashes and you're haunting the dream.` |

Value-line text for the win target: `Catnap` → "first to 1 Moon — one Night, winner takes all.";
`Hibernate` → "first to 3 Moons, usually 5 Nights."

**Repaint `shpSyncSettingsUI()`** to set the title, description, both row visibilities and the value
line — and call it from the Sylly toggle handler as well as from both pill handlers (the toggle
changes which group is live, so it cannot be left to `shpSyncToggle` alone).

**MP settings sync (both edits mandatory):**
- `engine-multiplayer.js:867` — add `shpMoonsToWin` to the serialised list.
- `engine-multiplayer.js:~1049` — add `if (s.shpMoonsToWin !== undefined) shpMoonsToWin = s.shpMoonsToWin;`

Missing either half means clients play to the host's *displayed* target but their own Moon maths —
invisible until a match ends on one device and not another.

---

## §6 — Herd revert on a bust

Snapshot before resolution, restore on bust. Both play entry points:

```js
function shpHostPlayCard(playerIdx, handIdx) {
  ...
  const herdBefore = shpHerd;          // ← before shpResolveCard
  const r = shpResolveCard(cardId, playerIdx);
  shpDrawUp(playerIdx);
  if (shpPostResolve(playerIdx, herdBefore)) return;
  ...
}
```

`shpPostResolve(playerIdx, herdBefore)` — the bust branch becomes:

```js
if (shpHerd > shpCeiling) {
  const landedOn = shpHerd;            // the number that broke it — banner copy uses this
  shpHerd = herdBefore;                // ← the revert. Unconditional, no mode branch (§3).
  shpHostCrash(playerIdx, 'busted', landedOn);
  return true;
}
```

**Scope of the revert is the Herd and nothing else.** The played card(s) stay in the discard, and any
non-Herd side effect of the busting play stands — a direction flip from a Toss & Turn played as the
first half of a busting pair, a Rude Awakening reseat, a Swap Dreams trade, the Nightmare Meter
charge. Reverting those means unwinding a hand swap and a reshuffled ring for no gain; the Herd is
the only value the player was gambling against.

**Do not revert on the mercy path.** `shpCheckMercy` fires on `shpHerd <= 0` in the Plunge and is
untouched by this section.

---

## §7 — Crash resolution

`shpHostDeepSleep` splits into a mode router plus two handlers. The stuck-hold flow
(`shpStuckIdx` / "Nod Off" / `SHP_STUCK_ACK`) is **unchanged upstream** — it still ends by calling
into the router, which is now `shpHostCrash` instead of `shpHostDeepSleep`.

### 7.1 The router

```js
// Every crash — busted gamble, bad pair, or no legal line — lands here.
// landedOn: the Herd the play reached before the revert (null for a stuck-out).
function shpHostCrash(crasherIdx, reason, landedOn) {
  shpStuckIdx = -1;                    // the hold, if any, is now resolved
  shpForcedCards = 1; shpTwoSel = [];
  if (shpSyllyMode) shpHostMoonLoss(crasherIdx, reason, landedOn);
  else              shpHostDoze(crasherIdx, reason, landedOn);
}
```

### 7.2 Normal mode — `shpHostDoze`

```
shpDozed[crasherIdx] = true
shpDozeOrder.push(crasherIdx)
shpDozeNotice = { idx: crasherIdx, reason, landedOn }
(shpHands[crasherIdx] || []).forEach(cid => { if (cid !== 13) shpDiscard.push(cid); })
shpHands[crasherIdx] = []                                      ← §3.1(c): dead cards go back in the pool
if (shpAwakeCount() <= 1) → shpHostNightEnd(); return          ← the Night is over
shpActivePlayer = shpNextPlayer(crasherIdx)                    ← skips dozed + eliminated
broadcast SHP_DOZE
shpShowTable()
shpAfterAdvance()                                              ← the next player may be stuck too
```

**No summary, no ack, no redeal.** The Herd, ceiling, direction, seating ring, every other hand and
the Flock are all untouched. The dozed player's own hand **is** returned to the discard (§3.1(c)) —
those cards are dead until the next deal and holding them thins the live pool for no benefit. Their
footer then renders nothing, exactly as an eliminated player's does. Note the id-13 guard: a Fogged
Dream in a dozed hand dissolves rather than recycling, same rule as playing one.

`shpAfterAdvance()` at the tail is what produces a cascade when the Herd is high — player B dozes,
player C is immediately stuck, holds, taps Nod Off, dozes, and so on until one is left. That chain
terminates because `shpAwakeCount()` strictly decreases; it is asserted in the harness (§11).

**Ordering trap:** compute `shpActivePlayer` *after* setting `shpDozed[crasherIdx]`, and always from
`crasherIdx` — walking from the pre-doze active seat would land on the crasher again.

### 7.3 Sylly mode — `shpHostMoonLoss` and the Jolt

```
shpMoonsHeld[crasherIdx]--
shpDozeNotice = { idx: crasherIdx, reason, landedOn }
if (shpMoonsHeld[crasherIdx] <= 0 && !shpEliminated[crasherIdx]) {
  shpEliminated[crasherIdx] = true; shpElimOrder.push(crasherIdx)   ← Sleepwalker; ghost system arms
} else {
  shpJolt(crasherIdx)                                               ← see below
}
if (shpAwakeCount() <= 1) → shpHostGameover(); return
shpActivePlayer = shpNextPlayer(crasherIdx)
shpPlungeTick()                                                     ← the descent keeps ticking
broadcast SHP_DOZE
shpShowTable(); shpAfterAdvance()
```

**The Jolt is a required addition, not a nicety.** In the old model a crash triggered a redeal, which
is what gave a stuck player a playable hand again. "One continuous Night" removes the redeal — so a
player who stuck out at Herd 96 with four un-playable cards would stick out again on their very next
turn, and every turn after, bleeding one Moon per lap until eliminated. `shpJolt(i)` discards that
player's whole hand into `shpDiscard`, then `shpDrawUp(i)` to their current cap:

```js
function shpJolt(i) {
  (shpHands[i] || []).forEach(cid => { if (cid !== 13) shpDiscard.push(cid); });  // §3.1(a)
  shpHands[i] = [];
  shpWolfActive[i] = false;            // §3.1(b) — the wolf lets go; Sylly never redeals, so this
  shpHandCap[i]    = shpHandSize;      //           is the only place the cap can ever be restored
  shpDrawUp(i);                        // reshuffles the discard if the Flock is short — existing behaviour
}
```

Herd, ceiling, direction, phase and every other hand are untouched. Thematically: you jolt awake and
the dream restarts around you. Banner copy names it (§9).

**The cap restore is not optional.** `shpWolfActive` is otherwise cleared only in `shpDealNight`, and
Sylly no longer deals twice — without this line one unlucky early Wolf draw costs a player a hand
slot for the entire match, invisibly and with no way back (§3.1(b)). The Jolt is the natural expiry
because it is already the "your dream restarts" beat. A player can of course draw the same recycled
Wolf again afterwards; that is fine and intended.

An eliminated player gets no Jolt — they have no hand.

### 7.4 Night end — `shpHostNightEnd` (normal mode only)

```js
function shpHostNightEnd() {
  let winner = -1;
  for (let i = 0; i < shpPlayerCount; i++) if (shpAwake(i)) { winner = i; break; }
  shpMoonsHeld[winner]++;
  const order = [winner].concat(shpDozeOrder.slice().reverse());   // finishing order, winner first
  const over  = shpMoonsHeld[winner] >= shpMoonsToWin;

  shpDeepSleepAckNeeded = shpPlayerCount;
  shpDeepSleepAcks = window.syllyMultiplayerMode === 'single' ? shpPlayerCount : 1;  // host counts itself
  shpIAcked = true;
  shpNightEndInfo = { winner, order, over };
  broadcast SHP_NIGHT_END { winner, order, over, moons: shpMoonsHeld, nightNum: shpNightNum, acksNeeded }
  shpShowTable();
}
```

Every player acks (including the ones who dozed out ten minutes ago — this is the one moment the
whole table looks at the same screen). Continue is host-gated and locked until
`shpDeepSleepAcks >= shpDeepSleepAckNeeded`, unchanged from the current implementation.

### 7.5 `shpHostContinue` and `shpHostGameover`

```js
function shpHostContinue() {
  const info = shpNightEndInfo; shpNightEndInfo = null;
  if (info && info.over) { shpHostGameover(); return; }
  shpDealNight(info ? info.winner : shpActivePlayer);   // the Night's winner opens the next one
}
```

The Night's winner opening the next Night replaces the old "the crasher opens" rule, which no longer
has a referent (the crasher is now whoever dozed first, a full Night ago). No `shpEliminated` guard
is needed — normal mode never eliminates.

`shpHostGameover` branches:

```js
if (shpSyllyMode) {
  winner = the one player with !shpEliminated
  standings = [winner, ...shpElimOrder.reversed()]                  // unchanged
} else {
  winner = the player with shpMoonsHeld >= shpMoonsToWin
  standings = all seats sorted by shpMoonsHeld DESC,
              ties broken by position in the FINAL Night's finishing order (shpNightEndInfo.order)
}
```

Capture the final Night's order into a local before `shpNightEndInfo` is cleared, or pass it into
`shpHostGameover` — it is the only tie-break available and it is the fair one (of two players on
2 Moons, the one who survived longer in the deciding Night placed higher).

---

## §8 — Multiplayer

### Packet changes

| Packet | Type | Status | Payload |
|---|---|---|---|
| `SHP_DEAL` | SYNC | **modified** | add `dozed`, `dozeOrder`, `moonsToWin`; `lives` → `moons` |
| `SHP_TURN_RESULT` | SYNC | **modified** | add `herdBefore` is *not* sent — the reverted Herd rides in `herd` as normal; add `busted: bool` so the client skips the sheep parade |
| `SHP_DOZE` | SYNC | **new** | `{ crasher, reason, landedOn, mode, herd, dozed, dozeOrder, moons, eliminated, elimOrder, hands, handCaps, wolfActive, nextActive, phase, ceiling, grace, drop }` |
| `SHP_NIGHT_END` | SYNC | **new** — replaces `SHP_DEEP_SLEEP` | `{ winner, order, over, moons, nightNum, acksNeeded }` |
| `SHP_DEEP_SLEEP` | SYNC | **deleted** | |
| `SHP_STUCK`, `SHP_STUCK_ACK`, `SHP_SLEEP_ACK`, `SHP_PLAY`, `SHP_DISRUPT`, `SHP_GHOST_READY`, `SHP_DISRUPT_RESOLVED`, `SHP_GAMEOVER`, `SHP_PLAYER_LEFT`, `SHP_MATCH_DISSOLVED` | — | **unchanged** | `SHP_SLEEP_ACK` keeps its name and now acks the Night-end summary |

### Why a bust sends two packets, in this order

A busting play still calls `shpBroadcastTurn` **first** (carrying the reverted Herd, the played
cards, `busted: true`, and `nextActive` still pointing at the crasher), and `shpHostDoze` /
`shpHostMoonLoss` then send `SHP_DOZE`. This is deliberately the same two-packet shape the stuck path
already uses and ships (`shpBroadcastTurn` → `SHP_STUCK`, proven in v176): the turn result is what
records the play in the Dream Journal and repaints the Herd, and the second packet is what moves the
seat. Folding the doze into `SHP_TURN_RESULT` would give the stuck path — which has no cards played —
a second, different code path to the same visible event.

`SHP_DOZE` also carries `hands`/`handCaps`/`wolfActive`, because **both** branches now mutate the
crasher's hand — normal mode discards it (§3.1c), Sylly replaces it and restores the cap (§3.1b, the
Jolt). Send the whole hand array, never a delta — a dropped packet then self-corrects on the next
mutation (`logic-engine.md` § private hands). `wolfActive` is easy to forget here precisely because
nothing outside the Jolt has ever changed it mid-Night.

### Firebase empty-value handling

`SHP_DEAL` sends `dozed: [false, false, false]` and `dozeOrder: []`. **The `false`s survive; the `[]`
does not** — Firebase erases empty arrays, and the reader gets `undefined`. Both halves are required:
send the reset value explicitly *and* rebuild it on receipt.

```js
// alongside shpNorm2D
function shpNormBool(raw, n) {
  const out = []; for (let i = 0; i < n; i++) out.push(!!(raw && raw[i])); return out;
}
```

Appliers:

```js
shpDozed     = shpNormBool(p.dozed, shpPlayerCount);
shpDozeOrder = Array.isArray(p.dozeOrder) ? p.dozeOrder.slice() : [];
shpMoonsHeld = p.moons || shpMoonsHeld;
```

Also watch `moons` in normal mode: at the first deal it is `[0, 0, 0]`. Zeros **are** stored by
Firebase (only `null` / `{}` / `[]` are erased), so the array survives — but a half-dense array comes
back as an index-keyed object, so run it through the same normalisation rather than assigning `p.moons`
raw. Never `p.dozeOrder || []` alone as a substitute for the array check: an index-keyed object is
truthy and would sail through.

### Applier requirements

- **`SHP_DOZE`** — apply all fields, then `shpShowTable()`, then `mpUnlockSync()`. It must set
  `shpStuckIdx = -1` (a turn-advancing packet resolves any hold) and `shpDozeNotice` from
  `{ crasher, reason, landedOn }`.
- **The busted device must leave "your turn" state on this packet alone.** There is no ack, so the
  only thing that clears the crasher's own input affordance is `shpDozed[me] === true` +
  `shpActivePlayer !== me` arriving in `SHP_DOZE`. Its `mpLockSync` (client path) is released by that
  same applier's `mpUnlockSync`. This is a **loopback concern, not a sim one** — the `'single'`-mode
  harness never sends the packet at all.
- **`SHP_NIGHT_END`** — sets `shpNightEndInfo`, `shpMoonsHeld`, resets `shpDeepSleepAcks = 0`,
  `shpDeepSleepAckNeeded = p.acksNeeded || shpPlayerCount`, `shpIAcked = false`, then `shpShowTable()`.
- **`SHP_DEAL`** — must reset `shpDozed`/`shpDozeOrder`/`shpNightEndInfo` on the client, exactly as
  `shpDealNight` does on the host. Missing this is the classic accumulator bug
  (`logic-engine.md` § Accumulator arrays).

### Missing-handler audit

Every phase, asked "can a non-host device submit here?":

| Phase | Client submits? | Handler |
|---|---|---|
| Playing a card / a pair | yes | `SHP_PLAY` ✅ existing |
| Nod Off (stuck hold) | yes | `SHP_STUCK_ACK` ✅ existing |
| Busting a gamble | no — falls out of `SHP_PLAY` | n/a |
| Nightmare Lottery pick | yes | `SHP_DISRUPT` ✅ existing |
| **Night-end "Got it"** | yes | `SHP_SLEEP_ACK` ✅ existing, repurposed |
| **Night-end Continue** | no — host-gated | n/a |
| Quit mid-Night | yes | `SHP_PLAYER_LEFT` ✅ existing |

No new ACTION handlers are required. That is the point of reusing the Deep-Sleep ack machinery
verbatim.

---

## §9 — UI

### Terminology (confirmed 13 Aug 2026)

| Term | Meaning | Replaces |
|---|---|---|
| **Dozed Off** | Out of the current Night, still in the match. Normal mode. | — (new) |
| **Sleepwalker** | Out of the match at 0 Moons. **Sylly only** now. | unchanged wording, narrower scope |
| **Last One Awake** | Winner of a Night; earns a Moon. | — (new) |
| **The Jolt** | Sylly: crash → your hand is discarded and redrawn. | — (new) |
| **Deep Sleep** | Retired as the name of the *summary screen*; kept only as the flavour verb for a crash. | Night-end summary is now "Last One Awake" |
| **Moon** | Normal: a Night won. Sylly: a life. | meaning split by mode |

### Table changes

- **Player chip** — a dozed player gets `shp-chip-out` (the existing eliminated style) with the label
  `😴 Dozed Off`; an eliminated Sleepwalker keeps `💤`. Moons render unchanged (🌙 per unit, `🌙×N`
  past 5). Both crowded onto the chip is fine — they are mode-disjoint, so a table only ever shows one
  of the two.
- **Doze banner** — the `shpDozeNotice` slot renders in the same place as `shpLastEffect`, with the
  same card treatment, cleared by the next play. Copy:
  - busted, normal: `😴 Ash gambled to 103 — dozed off. 3 still awake.`
  - stuck, normal: `😴 Ash had no safe cards left — dozed off. 3 still awake.`
  - busted, Sylly: `😴 Ash gambled to 103 — −1 Moon. Fresh hand, same dream.`
  - eliminated, Sylly: `💤 Ash is out of Moons — now a Sleepwalker.`
- **Action banner** — add a `shpDozed[me]` branch above the `shpEliminated[me]` one:
  `You're out for the night — back next Night.`
- **Footer** — `shpRenderTableFooter` returns early for a dozed player exactly as it does for an
  eliminated one. No hand, no taps, no Nod Off button: their cards went back to the discard the
  moment they dozed (§3.1(c)), so there is nothing left to draw.
- **Status bar** — `Night N` in normal mode; `The Long Night` in Sylly (there is only ever one).
- **Sheep parade** — skipped when `busted` (the Herd reverted; a growth parade would be a lie).

### Night Intro (`screen-shp-night-intro`)

The optional third element gets the running Moon tally, which is the whole reason a Night now
matters:

```
Night 2 Begins
[flavour line]
Ash 🌙 · Bo — · Cal —          ← shown from Night 2 on; hidden on Night 1 and in Sylly
```

### Night End summary

Rename `shpRenderDeepSleep` → `shpRenderNightEnd`. Structure, ack counter, and the three
single/host/client footer branches are **unchanged**; only the header and one new block differ:

```
🌙  (was 😴)
Ash is the Last One Awake
+1 Moon. First to 2 wins the match.

[ Moon standings list — existing, sorted desc ]

FINISHING ORDER                 ← new block, from info.order
1. Ash — Last One Awake
2. Cal
3. Bo — first to doze
```

Continue CTA labels unchanged: `Deal the next Night` / `See Daybreak`.

### Gameover

Normal mode rows show the Moon count as the sub-label (`2 Moons` / `1 Moon`) instead of the ordinal.
Sylly is unchanged (`Last one awake` / `Nth place`). Winner row keeps 👑.

### How to Play — copy edits

- **Step: the crash.** "Bust or run out of safe cards and you **doze off** — you're out for the
  night, but everyone else plays on from exactly where the Herd sits."
- **Winning and Scoring** (rewrite): last one awake wins the Night and earns a **Moon**; first to
  `shpMoonsToWin` Moons wins the match; a busted play is **rolled back** — the Herd returns to where
  it was before your card.
- **✨ Sylly Mode — Night Terrors** (rewrite): one long Night; Moons are lives; a crash costs a Moon
  and jolts you awake with a fresh hand; at zero Moons you become a Sleepwalker and start feeding the
  Nightmare Meter.
- `index.html:8176` — "Out of Moons - you're eliminated for the night." is wrong under both modes and
  must be replaced.

**All `index.html` edits go through a Node.js script, not the Edit tool** — the file's UTF-8 mojibake
hazard is a standing project rule and this rework touches settings, how-to, table and gameover markup.

---

## §10 — Teardown

`shpResetState()` adds `shpDozed = []`, `shpDozeOrder = []`, `shpDozeNotice = null`,
`shpNightEndInfo = null`, and drops `shpDeepSleepInfo`. `shpMoonsToWin` is a **setting** — preserved,
like `shpHandSize`/`shpMoons`/`shpDreamAccel`/`shpSyllyMode`.

`shpDealNight` resets `shpDozed`/`shpDozeOrder`/`shpDozeNotice`/`shpNightEndInfo`, and **must not**
touch `shpMoonsHeld`, `shpEliminated` or `shpElimOrder` — those are match-scoped. `shpStartSession`
initialises `shpMoonsHeld` to `Array(n).fill(shpSyllyMode ? shpMoons : 0)`.

---

## §11 — Verification

Neither harness exists yet — the sim described in `shp-impl-notes` was ad hoc and never committed.
Both are required by this rework.

### `tools/verify-shp-loop.js` — rules, `'single'` mode

Auto-play N random matches across both modes and every settings combination. Assertions:

1. **Termination** — every match ends within a turn ceiling; no infinite Night.
2. `shpHerd <= shpCeiling` between every pair of turns.
3. **Revert** — after any `'busted'` crash, the Herd equals its value before the busting play.
4. **Normal mode:** exactly one player is awake at every Night end; `shpMoonsHeld` is
   monotonically non-decreasing and increases by exactly 1 per Night; the match ends on the first
   turn any player reaches `shpMoonsToWin`; `shpEliminated` is all-`false` for the whole match.
5. **Sylly mode:** `shpMoonsHeld` is monotonically non-increasing; `shpDozed` is all-`false` for the
   whole match; `shpNightNum === 1` at the end; a Jolt leaves the crasher's hand at their cap and the
   Herd/ceiling/direction/other hands byte-identical.
6. **Finishing order** — `[winner, ...dozeOrder.reversed()]` is a permutation of all seats, every
   Night.
7. **Final standings** — a permutation of all seats, sorted by Moons descending.
8. **Deck conservation (§3.1)** — after every turn, `shpFlock.length + shpDiscard.length +
   Σ shpHands[i].length === 80` minus the id-13 cards currently in existence. This single invariant
   catches a mis-scoped discard on any of the four paths that now return cards to the pool (play,
   two-card play, doze, Jolt).
9. **Fogged Dream never recycles (§3.1a)** — `shpFlock.indexOf(13) === -1` after every reshuffle, and
   the count of id 13 across all hands never exceeds the number of Fog nightmares fired.
10. **The Wolf expires (§3.1b)** — in Sylly, a player who is Wolf-shrunk and then crashes has
    `shpWolfActive[i] === false` and `shpHandCap[i] === shpHandSize` on the next turn. In normal
    mode, `shpWolfActive` is all-`false` immediately after every `shpDealNight`.
11. **Instrument, not an assertion:** print the mean and p95 turns-per-Night and Nights-per-match by
    player count, plus reshuffles-per-Night. This is the number the balance risk in §13 is judged on,
    and the reshuffle count is what tells you whether §3.1 matters in practice or only in theory.

### `tools/verify-shp-loopback.js` — packets + render, host ↔ client

Modelled on `tools/verify-cjar-loopback.js`, and non-negotiable for this rework: `shpDozed`,
`shpDozeOrder`, `shpMoonsHeld` and two new packets all cross the wire, and the `'single'`-mode
harness cannot see any of it. It must have both halves the CJAR reference has:

- **A wire.** An `fbWrite`/`fbRead` pair that strips `null`/`{}`/`[]` the way Firebase does, asserted
  on its own behaviour first. Without it, `dozeOrder: []` passes as a live JS reference and the bug
  ships.
- **A DOM of real mock elements.** `getElementById: () => null` short-circuits every `if (!el) return`
  guard, so no render code runs at all — and a throw inside a `SHP_DOZE` applier strands the device.

Cases it must cover:
1. A **client's** bust: its own device leaves "your turn" state on `SHP_DOZE` alone, with no ack.
2. A **client's** stuck-out: hold → Nod Off → `SHP_STUCK_ACK` → `SHP_DOZE`, and the *other* clients
   never showed a button.
3. Doze cascade — three consecutive doze-outs with no redeal between them; host and client end with
   identical `shpDozed`/`shpDozeOrder`/`shpActivePlayer`.
4. Night end: all-seat ack, host Continue locked until the last ack lands, `SHP_DEAL` clears
   `shpDozed`/`shpDozeOrder` on the client.
5. Sylly Jolt over the wire — the client's own hand is replaced, nobody else's changes.
6. Match end from both modes; identical `shpGameStandings` on host and client.
7. Accept `SHP_SRC=` so a deliberately-broken copy proves each check fails before the fix makes it
   pass.

### Layout

Invoke the **`visual-check`** skill for the reworked Night-end summary and the doze chip/banner — the
finishing-order block is new markup inside an existing screen, and no harness above can see spacing
or overflow.

### Not covered by any of it

A real multi-device session. No clock skew, no Firebase ordering, no dropped packets, and no
judgement about whether a Night at 5+ players is *fun* — which is the actual open question (§13).

---

## §12 — Implementation Order

Each chunk ends green before the next starts.

| # | Chunk | Ends when |
|---|---|---|
| 1 | `shpLives` → `shpMoonsHeld` rename + payload key. No behaviour change. | grep for `shpLives` / `\.lives` returns nothing; game still plays |
| 2 | `tools/verify-shp-loop.js` against **current** behaviour (assertions 1, 2, 6, 7, 8) | green — this is the regression net for everything after. Assertion 9 is expected to **fail** here: it is the proof the §3.1(a) leak is real. |
| 2b | §3.1(a) fix — `if (cardId !== 13)` on both play paths | assertion 9 green. Standalone and shippable on its own; the leak exists in v176 today. |
| 3 | `shpDozed`/`shpDozeOrder`/`shpAwake`/`shpAwakeCount`; `shpNextPlayer` + `shpLeaderIdx` skip both; delete `shpAliveCount` | chunk-2 harness still green |
| 4 | Herd revert (§6) + `shpHostCrash` router + `shpHostDoze` (incl. the §3.1(c) hand discard) + `shpHostNightEnd` + `shpHostContinue`/`shpHostGameover` branches | harness assertions 3, 4, 6, 7, 8 green |
| 5 | Sylly branch — `shpHostMoonLoss` + the Jolt (incl. the §3.1(b) Wolf/cap restore) | assertions 5, 10 green |
| 6 | Settings: `shpMoonsToWin`, dual pill groups, value line, both `engine-multiplayer.js` edits | settings survive a host→client `SETTINGS_SYNC` |
| 7 | Packets: `SHP_DOZE`, `SHP_NIGHT_END`, `SHP_DEAL` additions, `SHP_DEEP_SLEEP` deletion, `shpNormBool` | — |
| 8 | `tools/verify-shp-loopback.js` — all 7 cases | green, and proven to fail on a broken copy |
| 9 | UI + copy (Node.js script for `index.html`): chip, banners, footer, Night Intro tally, Night-end summary, gameover sub-labels, how-to rewrite | `visual-check` clean |
| 10 | Docs closure (§14) + SW bump | — |

---

## §13 — Risks and playtest dials

1. **Night length is the one real risk.** A Night now runs to *one* survivor instead of one crash. At
   3 players that is 2 knockouts; at 8 it is 7. Assertion 8's instrument exists to size this before
   the owner does. Dials, in the order to reach for them: the `Moons to Win` default (2, could drop
   to 1 for large tables), then `Hand Size`, then — only if it is genuinely broken — a partial Herd
   pull-back on a doze, which is explicitly **out of scope for v1**.
2. **The endgame squeeze.** Late in a Night the Herd sits near 99 and survivors need a subtract or a
   Lullaby. The deck has 10 subtracts and 1 Lullaby in 80 cards, so this is a squeeze rather than a
   guaranteed cascade — but it is the part most likely to feel unfair, and it is where a doze cascade
   would show up. Loopback case 3 exists for exactly this shape.
3. **Sylly matches are now unbounded above.** With no redeal, a Sylly match ends only when players run
   out of Moons. Combined with the Jolt (which hands a stuck player a fresh, playable hand), a
   3-Moon Sylly match could be long. The instrument covers it; `Starting Moons` is the dial.
4. **The revert fires on deliberate overshoots too** (§3). Accepted; flagged so it is not re-filed as
   a bug.
5. **The chip has two "out" states.** They are mode-disjoint today. If a future change ever makes both
   reachable in one match, `shpAwake()` still behaves — but the chip copy would need a third case.

---

## §14 — Doc closure (Documentation Integrity Protocol)

In this order, before any phase snapshot:

1. **`docs/code-map.md`** — `shpDozed`, `shpDozeOrder`, `shpDozeNotice`, `shpNightEndInfo`,
   `shpMoonsToWin`, `shpMoonsHeld` (rename), `shpHostCrash`, `shpHostDoze`, `shpHostMoonLoss`,
   `shpJolt`, `shpHostNightEnd`, `shpRenderNightEnd`, `shpAwake`/`shpAwakeCount`; remove
   `shpLives`, `shpAliveCount`, `shpDeepSleepInfo`, `shpHostDeepSleep`, `shpRenderDeepSleep`.
2. **`game-identities.md` § Game 15** — State flow, Terminology (Dozed Off / Last One Awake / The
   Jolt / Moon's split meaning), Settings table (both Moon rows), Scoring / Win, and the Multiplayer
   packet lists.
3. **`CLAUDE.md`** — SW version + § Current Focus.
4. **`logic-engine.md`** — one candidate only: *a mode that removes a game's reset must supply a
   per-player recovery in its place* (the Jolt). Add it if a second game ever needs it; do not add it
   pre-emptively.
5. **`docs/implementation-notes/shp-implementation-notes.md`** — Design Decisions (the three below),
   Bug Index (anything the harnesses catch), Multiplayer Lessons (the two-packet doze shape).
6. **`docs/decision-log.md`** — one line: Moons split meaning by mode; a Night became a scored round.

**Decisions to record:**

- **D-A — A crash no longer ends the Night.** Normal mode: doze out, everyone else plays on from the
  same Herd; last awake takes a Moon. *Why:* the old model ended the interesting part of a Night at
  the first mistake and made every crash a full reset. *Impact:* `shpDozed`/`shpDozeOrder`,
  `SHP_DOZE`, `SHP_NIGHT_END`.
- **D-B — Moons mean opposite things in the two modes, on purpose.** Wins in normal, lives in Sylly —
  forced the `shpLives` → `shpMoonsHeld` rename and two pill groups behind one card.
- **D-C — A busted play is rolled back, unconditionally.** One rule, one code path, three reachable
  shapes (§3), including deterministic two-card overshoots.
- **D-D — Removing the redeal made the recycle pool load-bearing** (§3.1). Three consequences, all
  decided here: Fogged Dream dissolves on play instead of recycling (a **live bug in v176**, masked
  until now by the per-crash redeal — worth shipping ahead of the rest); the Big Bad Wolf's cap
  shrink expires at the Jolt, because Sylly no longer deals twice and it would otherwise be a
  whole-match penalty from one draw; and a dozed player's hand returns to the discard immediately.
  *Lesson for the impl notes:* when a rework deletes a periodic **reset**, audit everything that
  reset was silently cleaning up — here a phantom card, a cap penalty and 30 dead cards, none of
  which were anywhere in the rework's own description.
