# Cookie Jar — Action Stage Rework (design spec)

**Date:** 7 Aug 2026
**Game:** Cookie Jar (`cjar`), game 18
**Status:** confirmed by owner, ready for implementation plan
**Target SW version:** v163

---

## 1. The problem

Playtest feedback, rounds 1–3: *"the action stage is still off"* — specifically, players feel
they are choosing based on **what just happened** rather than **what is about to happen**.

Round 2 already attacked this as a layout problem (DD-12 — the three-column grid) and round 1
as a duplication problem (DD-11 — the one-row stage). Neither fixed it, because neither was the
cause.

### Root cause — the payout is invisible

In the base game a flip runs like this:

1. `cjarHostNextFlip` → `cjarApplyCardEffect` (`cjar.js:336`) pops the card and **immediately**
   splits its value into `cjarRaidTotals` for every active seat, remainder into `cjarCrumbs`
   (`cjar.js:349–353`). No animation. No sound beyond the card sound. No screen change.
2. `cjarOpenDecisionWindow` opens the decision window with that already-resolved card sitting in
   the centre at `cjar-card-stage`, labelled **"just revealed"**, with **"Take a Cookie"**
   directly beneath it.

The only cookie feedback in the game is `cjarFlyDelta` (`cjar.js:726`), which fires once per
flip from `cjarHostResolveFlip` on `cjarDeltas[mpMyPlayerIdx]`. Base-game deltas are **stash**
deltas (`cjar.js:470`, computed against `before = cjarStashes.slice()`), and the base game only
moves a stash on `cjarResolveSneak`. Therefore:

> **On a normal flip where you keep raiding, you gain cookies and nothing on screen moves.**

The single most satisfying moment in a push-your-luck game has no beat. The screen's only visible
change is a static card appearing above a button that says "Take a Cookie" — a button which, in
the base game, does not take anything.

This is a missing-feedback problem wearing a layout problem's clothes. Relabelling and
repositioning could not fix it, and did not.

### Secondary: the button label is factually wrong in the base game

`cjarApplyCardEffect` splits among `cjarActive` with no reference to any choice. Nobody "takes";
taking is what happens to you for being present. The base game's choice is **participation** —
stay or leave. Dibber Dobber's choice is genuinely an **action**: `takers` is derived from the
choice itself (`cjar.js:1090`), there is no active/inactive state, and the three options are
three acts performed on the same card.

---

## 2. Design decisions

Numbered so the implementation plan and impl-notes can reference them.

### DD-18 — The centre slot holds the card you are betting on, face-down

The stage's largest object is no longer the card that just resolved. It is `cjarDeck[0]`,
rendered face-down. It flips **in place** during the animation, pays out, then leaves for the
history strip while a new face-down card rises to replace it.

The button directly beneath it is then literally correct: it acts on the object above it.

**Dibber Dobber already works this way.** `cjarOpenBlindWindow` sets `cjarCard = null`
(`cjar.js:387`), so the hero renders face-down through `cjarRenderCard(null)`. This change makes
the base game match Sylly — it removes a mode divergence rather than adding one.

**No information is lost.** Which family member just appeared is on the warning strip
(`cjarRenderWarningStrip`, in red when one more busts the Raid); the card itself is the newest
thumb in the history strip; the full log is one tap away in `cjar-trail-overlay`.

### DD-19 — The reveal animation, 2100 ms, paid for out of `CJAR_REVEAL_MS`

`CJAR_REVEAL_MS` is currently a **3000 ms dead dwell** (`cjar.js:25`) between the choice
resolution and the next flip, showing nothing but static outcome lines. Most of it is spent on
the animation instead:

| Beat | Today | After |
| ---- | ----- | ----- |
| Outcome dwell (`CJAR_REVEAL_MS`) — who sneaked out, deltas | 3000 ms | **1200 ms** |
| Reveal animation (`CJAR_FLIP_ANIM_MS`) | 0 ms | **2100 ms** |
| **Per-flip cycle** | **3000 ms** | **3300 ms** |

Net **+300 ms per flip** — roughly +10–15 s across a whole 30–50 flip match, in exchange for the
game's central beat existing at all. The dwell keeps 1200 ms because the choice outcome still
needs its own moment: it is a *different* event from the card flip, and collapsing it into the
animation would stack two unrelated things in one window.

Rejected alternatives: adding 2–3 s *on top* of the full existing dwell (+75–150 s per match, and
Blitz's 10 s clock starts feeling cramped), and a longer ~4 s choreography (+30–50 s).

### DD-20 — No per-player flight paths

A cookie token animating to each player's row requires live `getBoundingClientRect` geometry.
That is fragile under scroll, breaks silently when the score table is off-screen, and is
invisible to every harness. Rejected.

Instead the burst carries **direction** — down toward the score table, left toward the Crumb
pile — and the **token count equals the number of seats splitting the card**, so the visual
weight tracks the split. The per-player payload lands as the score pill counting up and pulsing,
which needs no geometry at all.

### DD-21 — Button labels: one metaphor, both modes

| Mode | Labels |
|------|--------|
| Base | **Reach In Again** · Sneak Out |
| Sylly | **Reach In** · Play Innocent · Dob |

`Again` carries the push-your-luck continuation, so the base game gets its framing without a
different verb from Sylly.

Two problems with the outgoing `Take a Cookie` in **Sylly**, both real:

1. **Singular is wrong.** `tPer = cjarSplit(V, takers.length)` (`cjar.js:1102`) is a *share* of
   the card's value, which ranges over the whole `cookieValues` band — not one cookie.
2. **Parallel structure is broken.** `Take a Cookie / Play Innocent / Dob` is a noun phrase
   beside two verb phrases. Three simultaneous acts on one card must read as three parallel
   verbs.

Constraints honoured: no emoji (§ Action Button Standard — this rules out Gemini's
`Reach into Jar 🍪`); the word "Sneak" still never appears in Dibber Dobber copy
(`cjar.js:780`).

### DD-22 — Score pills: `stashed` and `at risk` as separate objects

`0 🍪 (+1 in)` puts load-bearing information in a parenthetical, read at a glance during a timed
simultaneous decision. Split into two pills:

```
[rank] [name]  ·······  🔒 12 stashed   ·   3 at risk
```

- **Stashed** — `cjarStashes[i]`, amber/gold solid, lock glyph. Safe, cannot be lost.
- **At risk** — `cjarRaidTotals[i]`, red-tinted. **Base game only**: Dibber Dobber has one
  running Stash and no Raid-local pool (`cjar.js:862–863`), so DD renders the Stashed pill
  alone.
- Departed seats (`!cjarActive[i]`, marked 🚪) drop the At Risk pill.
- Open Book OFF → `•••` in both pills for other seats. Your own row always reads
  (`cjarStashVisible` is unconditionally true for `idx === mpMyPlayerIdx`).

**During `'revealing'` the pills stay.** Today they are *replaced* by the delta
(`cjar.js:855–858`), which means the standings vanish at the exact moment you want to compare
them. The delta now flashes **on** the pill instead.

There is roughly 150 px of dead horizontal space in these rows; the words `stashed` and
`at risk` fill it and remove the need to decode an icon.

### DD-23 — "Up for Grabs": Crumbs and the Treat as one object

Column 1 becomes a single white card holding both, because both are the same thing — shared
table state that a solo Sneak Out claims:

- **Crumbs on top**, promoted to a prominent count. Crumbs are almost always present; a Treat is
  occasional.
- **Treat slot below** — art when one is scheduled, otherwise the dashed placeholder in the exact
  footprint a Treat will occupy (round 2's fill-in-not-layout-jump rule, retained).
- A permanent one-line caption, promoted from the crumbs tip (`cjar.js:2061`):
  base game *"Sneak out alone and you take the lot."*; Sylly the scare-off equivalent.

The caption is Gemini's "highlight this column when Sneak Out is under consideration", made
static. A press-to-preview would leak a player's intent to anyone watching their screen, and
phones have no hover state to attach it to.

### DD-24 — Column 3 becomes a reservoir, not a bet

`styles.css:1837–1843` currently documents `cjar-card-next` at 7.2 rem *because* "it is the card
you are actually betting on". DD-18 moves that job to column 2, so the rationale inverts and the
size follows: column 3 shrinks.

It renders as an **offset stack of card backs** plus the count, not a single back. Two single
face-down cards side by side would read as "which one is next?"; a stack reads unambiguously as
the deck the centre card came from — which is also literally where the animation lifts it from.

---

## 3. Layout

### Stage bands (`screen-cjar-table`, `index.html` ~9128–9184)

Band 1 (warning strip) and band 3 (history strip) are **unchanged**.

Band 2, `#cjar-stage-row`, stays `grid grid-cols-3 items-stretch gap-2`:

| Col | Element | Content |
|-----|---------|---------|
| 1 | `#cjar-grabs-card` (new) | label `up for grabs` · `#cjar-crumbs-value` (promoted) · `#cjar-treat-slot` · caption · `[?]` |
| 2 | `#cjar-table-hero` | face-down `cjar-card-stage` card, or face-up mid-animation |
| 3 | `#cjar-deck-badge` | offset stack of backs + count |

Column 1's inner card takes `h-full` so `items-stretch` gives it the hero's height — this is
what delivers the vertical balance the owner asked for, with no explicit height maths.

### Label state (`#cjar-stage-label-now`)

One `textContent` swap driven by whether a card is face-up:

| State | Label |
|-------|-------|
| face-down (deciding, waiting, blind window) | `next out of the jar` |
| face-up (the animation's flip + hold + payout beats) | `just revealed` |

The existing `visibility` toggle is replaced by this swap — the label is now always honest, so it
never needs hiding, and nothing shifts underneath it.

---

## 4. The animation

### New table phase `'flipping'`

`cjarTablePhase` gains `'flipping'`. `cjarRenderControls` renders **no buttons** in it — the same
mechanism already used for `'waiting'`, and for the same reason (spec §11 Trap 2: `mpLockSync`
self-releases after 8 s, so greying is not a reliable "you cannot act yet" signal; removing the
buttons from the DOM is).

### Beats — `CJAR_FLIP_ANIM_MS = 2100`

| Beat | Window | What happens |
|------|--------|--------------|
| **Flip** | 0–300 ms | Column 2's face-down card rotates Y in place to face-up. `cjarPlayCardSound` fires here. |
| **Hold** | 300–900 ms | Face-up and readable. |
| **Payout** | 900–1600 ms | Type-dependent — see table below. |
| **Settle** | 1600–2100 ms | Card slides down-left into the history strip; a new face-down card rises from column 3 into column 2. |

### Payout beat by card type

| Card | Payout beat |
|------|-------------|
| `cookie` | Token burst fans **downward** toward the score table, one token per splitting seat. A remainder sends one token **left** into the Crumb pile. Affected score pills count up and pulse. |
| `family`, first sighting | No cookies. That member's warning-strip slot pulses. |
| `family`, second sighting (bust) | No cookies. The flip beat still runs in full **before** `screen-cjar-busted` — see §6. |
| `treat` | The card itself **travels** into column 1's Treat slot, which is what teaches where a Treat lives and that it is unclaimed. |

### Timing contract

`cjarOpenDecisionWindow` (`cjar.js:1327`) sets

```
cjarEndTimestamp = Date.now() + CJAR_FLIP_ANIM_MS + windowMs
```

so **Blitz remains a true 10 s of deciding**, not 10 s minus the animation. `endTimestamp` is
absolute and already broadcast in `CJAR_FLIP_START`, so clock skew stays cosmetic exactly as it
is today. The host's auto-resolve timeout extends by the same amount.

`CJAR_REVEAL_MS` drops **3000 → 1200 ms**: it now covers only the choice-outcome beat, with the
rest of the budget moving to `CJAR_FLIP_ANIM_MS` (DD-19). The two are separate constants and are
*not* held equal — unlike PKO's `PKO_INTERSTITIAL_MS` / `PKO_CARRION_WINDOW_MS` pair, these
measure two different things (reading a result vs watching a card resolve) and should be tuned
independently if a playtest says one of them is off.

### Three rules the implementation must not break

1. **Host progression is driven by `setTimeout`, never `animationend`.** The three `'single'`
   harnesses run with `getElementById: () => null`, so every render call is a no-op and no CSS
   animation ever starts. A DOM-gated host loop deadlocks all of them.
2. **Under `prefers-reduced-motion` the visuals snap but the 2100 ms dwell stays.** It is pacing
   and it is load-bearing for the decision clock. The global reduced-motion block is
   duration-based (never `animation: none`), so any `animationend` cleanup still fires — do not
   change that block.
3. **The token layer is absolute over a relative anchor.** `#cjar-delta-layer` already does this
   (`cjar.js:726`, and the comment there). In-flow tokens change the column height, and because
   the `<section>` centres the Stack, that re-centres the entire screen — the SHP sheep-parade
   bug, ~55× a match.

---

## 5. Multiplayer

`CJAR_FLIP_START` already carries the **post-effect** state (`raidTotals[]`, `crumbs`, `seen{}`,
`endTimestamp`, `windowMs`, `trail`) — see the comment at `cjar.js:333`. That does not change.

What changes is the client applier (`cjar.js:1844–1866`): instead of setting `'deciding'`
immediately it sets `'flipping'` and self-transitions after `CJAR_FLIP_ANIM_MS`. Because
`endTimestamp` is absolute and already includes the animation, a client whose animation starts
late still gets the correct deadline and the correct remaining bar.

The wire contract is unchanged, so no new normaliser is needed. The `cjarWireArr` /
`cjarWireList` / `cjarWireObj` protections (BUG-06) continue to apply unchanged to every
collection in the payload.

---

## 6. Edge cases

| Case | Behaviour |
|------|-----------|
| **Bust card** | Today `cjarHostNextFlip` broadcasts the resolve and calls `cjarShowBusted` immediately (`cjar.js:1299–1306`), so the most dramatic card in the game is the one card you never see flip. The flip + hold beats run **first**, then `screen-cjar-busted`. |
| **Deck runs dry** | Unchanged — `cjarResolveFlip`'s D-04 path. Column 3 renders empty; column 2's rise beat is skipped. |
| **Dibber Dobber** | The animation lives in `cjarHostResolveFlip`, where `cjarRevealSyllyCard` already pops the card (Delta 7). The blind window is unchanged — column 2 is face-down throughout the decision, which is what it already does. |
| **Spectating seat** | Plays the full animation; the payout beat's burst reflects the seats still splitting, which does not include them. |
| **No Rush** | `windowMs` is `null`, so `cjarEndTimestamp` stays `0` and there is no deadline. The animation still runs; the phase transition to `'deciding'` is on its own timer, independent of the (absent) clock. |
| **First flip of a Raid** | `cjarLastHeroKey` / `cjarLastTrailLen` are already cleared at Raid start (`cjar.js:1165`) so the first card animates in rather than being mistaken for the previous Raid's last card. Retained. |

---

## 7. Verification

All five harnesses need updating; the new `'flipping'` phase and the label changes break existing
assertions **by design**.

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js      # host↔client over a Firebase-shaped wire
node tools/simulate-cjar-dd.js          # balance instrument; asserts nothing, always exits 0
```

New checks required:

- `verify-cjar-loop` — the `'flipping'` → `'deciding'` transition happens on a timer and not on a
  DOM event; `cjarEndTimestamp` includes `CJAR_FLIP_ANIM_MS`; the bust path runs the flip beat
  before `screen-cjar-busted`.
- `verify-cjar-loopback` — the **only** harness with real mock elements, so it is the only one
  that executes render code at all. It must cover: column 2 face-down during `'deciding'`, the
  label swap, the `stashed` / `at risk` pills in both modes and at both Open Book settings, and
  the Up for Grabs card with and without a Treat.
- `verify-cjar-dd` — Sylly renders the Stashed pill alone, no At Risk pill.

The balance instrument is untouched — nothing in this spec changes a rule, a value, or a
probability. `simulate-cjar-dd.js` output should be unchanged within its usual noise band, and
that is itself a useful check that this stayed presentational.

---

## 8. Documentation impact

Per the Documentation Integrity Protocol:

1. `docs/code-map.md` — `'flipping'` phase, `#cjar-grabs-card`, `CJAR_FLIP_ANIM_MS`, the changed
   `cjarRenderStage` / `cjarRenderRevealRows` / `cjarRenderControls` seams.
2. `docs/rules/game-identities.md` § Game 18 — button labels, stage layout, score pills.
3. `CLAUDE.md` — SW v163, § Current Focus.
4. `.claude/rules/ui-style.md` — the two-pill score-row pattern is a candidate for generalisation,
   but **do not elevate it on one game's evidence**; note it in impl-notes Template Gaps and
   revisit if a second game wants it.
5. `docs/implementation-notes/cjar-implementation-notes.md` — DD-18 … DD-24, plus the root-cause
   finding in §1, which is the reusable lesson: *a push-your-luck game whose payout mutates state
   with no on-screen beat will read as a layout problem and resist every layout fix.*
6. `docs/decision-log.md` — one line; DD-18 and DD-19 are cross-cutting.

---

## 9. Out of scope

Deliberately not touched, to keep this a presentational change:

- **DD-06**, the Dibber Dobber Innocent-lean (~52% at 5 and 8 players). No rule, value or
  probability changes here.
- Moving the `Owes` debt chip out of the private strip into the score pills.
- The suite-wide BUG-06 audit of the other 17 games.
- DD-13's settings dynamic-value line sweep, and the card gallery for FLW / SHP / FRT / PKO.
