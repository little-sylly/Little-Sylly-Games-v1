# The Bluff — procedural dice, a new table, and Practice

**Date:** 28 Sep 2026 · **Game:** The Bluff (`dyb`) · **Tier:** 2 (architectural)
**Status:** design approved in brainstorm (28 Sep 2026) — awaiting spec review
**Supersedes:** `docs/deferred-work.md` § "DYB — Phantom-die reveal + a procedural dice rework"

---

## 1. Why

The owner played a full game after SW v240. Everything works, but the table overwhelms a new
player on every axis at once:

- **Colour.** The table is black and white — tiring to look at, and nothing ties a player to
  their dice, their lives or their claims.
- **Controls.** Two steppers (face, quantity) that are not immediately distinguishable.
- **Judgement.** Nothing helps a player who plays by feel sense whether a claim is plausible.
- **The Tempest.** Special dice are coloured tints that say nothing about what they *do*.

Separately, the How to Play overlay explains the rules but never lets a player touch the controls
before a real game.

**Success:** a first-time player can open, climb and call without help, and has a feel for whether
a claim is a stretch — without the game computing odds for them.

The betting stage was designed fresh (owner's instruction: without reference to the old table),
reviewed as a mockup at 375×667 and approved: "all the issues are solved and the view is so much
more natural and intuitive now."

### 1.1 Rules the new UI enforces (as shipped — not textbook Liar's Dice)

The Bluff is Liar's Dice with these differences, confirmed in `js/games/dyb.js`:

- **No 1s-halving rule.** A raise is a higher quantity of any face, or the same quantity of a
  higher face — nothing else.
- **Classic Wilds** bans claiming 1s outright (1s count toward every other face).
- **Volatile Wilds** allows claiming 1s; doing so strips wilds for the rest of the Shake.
- **Strict** — 1s are plain 1s.
- **No "exact" call.** The loser of The Overlook opens the next Shake.
- **The Tempest** (Sylly Mode): Loaded ×2, Cracked 0, Snake −1, Slick (owner picks the face, once),
  Phantom (face hidden from its owner; may carry a secondary type).

---

## 2. Scope

**In:** procedural dice (a new `js/games/dyb-dice.js`), the table screen redesign, the shake
animation, the reveal choreography, the Phantom reveal, a Practice tab, a grown Dice gallery,
converting the two DYB skin packs to procedural sets plus a new "Classic" set pack, four
harnesses, docs.

**Out (logged to `docs/deferred-work.md`, § 10):** the dice selector and Lounge dice-tower prop;
seat/colour picking in the waiting lobby (suite-wide); Practice for the other 19 games; persisting
the stage view toggle across sessions.

**No packet changes.** `DYB_SHOWDOWN` already carries `allRolls`, `allSpecialTypes`,
`allSlickFaces` and `allPhantomTypes`; `seatNumbers` already reaches every device in the
game-start payload. Everything in this spec is local rendering from data each device already
holds. **`MP_PROTOCOL_VERSION` is not bumped.**

---

## 3. The dice

### 3.1 Two independent axes

| Axis | What it is | Chosen by | Now |
|---|---|---|---|
| **Dice set** | The look: body material, edges, pip style, cup | The game default; a Secret Mode skin pack; later the player (dice selector) | **Rocky** (default) |
| **Player tint** | The player's identity colour, drawn in whatever set they hold | Seat: `tint = seatNumber − 1` | 8 tints per set |

Tint is the identity layer **because** sets will later be player-selectable — two players may hold
different sets, or the same one, and colour still separates them. This is why tint is not baked
into a material (the brainstorm's rejected "each player gets a stone type" idea).

**Seat-assigned now, choice later.** `tint` is read through one function,
`dybTintFor(playerIdx)`, which today returns `dybSeatNumbers[playerIdx] − 1`. A future lobby
colour pick replaces that body and nothing else.

**Colour is never the only signal.** Every cluster of dice sits beside a name (climber chip, claim
line, named reveal rows). Each set's 8 tints are ordered light → dark with a real luminance spread,
so they also separate in greyscale.

### 3.2 Architecture — recipe, painter, cube

All dice render through **one seam**. `js/games/dyb-dice.js` holds three layers:

| Layer | API (indicative) | Pure? |
|---|---|---|
| **Recipe** | `dybDieRecipe({ set, tint, face, type, secondary, state })` → `{ body, edge, pip: { colour, style, positions[] }, overlays[], key }` | **Yes** — no DOM, no canvas, no `window`; Node-testable |
| **Painter** | `dybPaintDie(recipe, px)` → a cached image (object URL or canvas), keyed by `recipe.key` + `px` | No (canvas) |
| **Cube** | `dybDieCube(faces[6], landingFace)` → a CSS `preserve-3d` element; `.roll(ms)` | No (DOM) |

- `state` is one of `'face'` (visible), `'concealed'` (owner/spectator view of a Phantom),
  `'revealing'` (Phantom mist clearing), `'unpicked'` (Slick before commit).
- **Static dice everywhere are flat painted faces.** Only the shake and the reveal use the cube.
- Paint lazily; the cache is bounded by *sets × 8 tints × 6 faces × types × sizes in use*.
- `dybDieHTML` survives as a thin compatibility wrapper over recipe + painter for any call site
  not otherwise rewritten, so the render seam stays single.
- **Placement in the load order:** `dyb-dice.js` loads immediately before `dyb.js`. It is added to
  `PRECACHE_URLS` and ships under a `CACHE_NAME` bump.
- **Why not `js/lib/`:** `logic-engine.md` keeps dice game-specific until a second dice game exists
  (YAGNI). `dyb-dice.js` is the unit that moves to `js/lib/` when the dice selector or a second
  dice game arrives; nothing in it may read DYB game state.

**Rejected alternatives:** a 2D canvas generator alone (the roll never reads as 3D) and Three.js
(a second WebGL context in-game beside the Lounge's; phones drop contexts; heavier teardown — and
static dice would still need the canvas generator). Owner: revisit Three.js only in a future
suite-wide visual update.

### 3.3 Sets

**Built in (code, not files):**

- **Rocky** — the game default. Stone body with faint speckle and softened, lightly chipped
  corners; **carved** pips (dark recess, lit lower lip). Tints, light → dark: **chalk, sandstone,
  ochre, terracotta, moss, slate, umber, basalt**. Pip colour is derived from tint luminance (dark
  pips on light stone, pale on dark). The cup is a worn-leather cup.
- **Classic** — plain, clean dice: the style shown in the brainstorm mockup. Owner: keep it as a
  set of its own.

**As Secret Mode skin packs (runtime-cached, `data/packs/`):**

- `deep-ocean-dice` and `sea-cliff-dice` — rebuilt as `diceSet` parameter blocks; their `img/`
  folders are deleted.
- **`classic-dice`** — a new pack exposing the Classic set through the Terminal, so it is
  selectable today and moves to the dice selector later.

A set's parameters: body colour(s), 8 tints (each `{ body, pip? }` — `pip` optional, derived from
luminance if absent), pip style (`carved` | `printed` | …), edge wear, speckle/texture amount, cup
colours. Exact field list is fixed in the plan against what the painter needs.

**What the owner reviews:** a visual checkpoint (§ 9, step 2) shows every set in every tint plus
the five Tempest forms **before** any of it is wired into the game.

### 3.4 Skin-pack contract change (DYB only)

A DYB pack's `assets` changes from image maps to:

```json
{ "assets": { "kind": "dyb", "diceSet": { "label": "…", "tints": [ … 8 … ], "…": "…" } } }
```

- `js/lib/art.js` gains **one** resolver, `assetDiceSet(kind)` → the active skin pack's `diceSet`
  or `null`. `null` means the game default (Rocky). No core-art tier: **DYB never needs a core art
  pack** — the default set is code.
- The old DYB image path (`assetFace('dyb', …)`, `assetBack('dyb')`, `assetSpecial`,
  `assetSpecialFrame`) is removed from `dyb.js`. **Other games' image skins are untouched.**
  `assetSpecial`/`assetSpecialFrame` are deleted from `art.js` — DYB is their only caller
  (confirmed 28 Sep 2026: no other file under `js/` references them).
- Adding a DYB pack stays folder + registry line, no `sw.js` edit, no version bump.
- `docs/expansion-guide.md` documents the `diceSet` block; § Core art packs drops DYB from the
  "still on emoji/CSS defaults" list (it now has procedural defaults, not art).

### 3.5 Tempest forms — overlays on any set and tint

The die's **body belongs to its owner's tint**, so a special type must read through **form**, not
colour. Forms are overlays in the recipe (`overlays[]`) and work on every set.

| Type | Form | Reads as |
|---|---|---|
| **Loaded** (×2) | Pips cast in bronze; heavier drop shadow | Heavy, worth more |
| **Cracked** (0) | A jagged fissure across the face; pips faded | Broken — counts for nothing |
| **Snake** (−1) | Pips become slit-pupil serpent eyes | Working against you |
| **Slick** (pick) | Wet sheen streak. Before commit: a small "pick" badge; tap to choose | Slippery — no fixed face |
| **Phantom** (hidden) | Drifting mist over the face, a faint "?" | Even you can't see it |

**Phantom leak guard — moved down to the recipe.** A `state: 'concealed'` Phantom's recipe
**carries no face value at all** (no pip positions, no face in `key`). Painter and DOM can then
never leak it, whatever calls them. The harness asserts this (§ 8).

**Compound Phantoms.** On reveal, the mist clears and the secondary's form shows underneath
(bronze / fissure / eyes / the locked Slick face).

### 3.6 The Phantom reveal — decided

At The Overlook the mist **clears** (a fade; instant under reduced motion) and the true face shows.
The How to Play line *"Phantom hide their face until The Overlook"* becomes true rather than being
rewritten. `dyb-implementation-notes.md`'s open bug-index entry closes with this build.

---

## 4. The table screen

Built as **the Stack** (`ui-style.md`), not the legacy `h-screen` pattern. One column, top to
bottom:

1. **Header** — "Shake N" (left); `[?]` 🔊 ✕ (right).
2. **Climbers strip** — one chip per player: a small die in their tint, their name ("(you)" on
   yours), and lives as mini dice in their tint (Footholds: ◆ in their tint; a number beside it
   when above 5). The active player's chip gets a ring in their tint and a lift. Eliminated chips
   are greyed. Wraps to two rows at 7–8 players.
3. **Your cup** — your hand, always visible. Slick dice are tappable to pick; tap-and-hold on any
   special die jumps to its row in the Dice gallery (§ 7.4).
4. **The claim line** — swatch in the claimant's tint + "**Mia** claims **five 4s**";
   "The Ascent ›" opens the existing bid-history overlay.
5. **The stage** — a warm stone ledge (not a white card), with the view toggle in its corner.
6. **Face row** — six dice in your tint; the selected face is ringed.
7. **Controls** — two equal-weight buttons: **Call the Bluff** (neutral) and **Climb: six 4s**
   (brand; the label spells out the bid being committed). This is a sanctioned special decision
   pair (`ui-style.md` § Action Button Standard).

**Palette:** warm off-white page, stone-ledge stage, brand `#6B5744` for the primary button and
toggles, tints for identity. No large black or pure-white fields.

### 4.1 The stage

The stage always answers **"how much of this claim can I vouch for?"** Three dice states:

| State | Look | Meaning |
|---|---|---|
| **Held** | Solid, your tint | Your own dice that back the claim. A wild 1 shows its real face with a small **WILD** tag |
| **Needed** | Dashed outline, faint face | The rest of the claim — must come from other cups |
| **Ghost** | Faint empty slot | The remainder of every die on the table (Whole table view only) |

- Laid out in **groups of five** (tally-style).
- A caption under it: *"You hold **3** · need **3** more from the other **15** dice."*
- **Sizes itself to its own box** — dice scale so the table total (up to 8 × 5 = 40) never scrolls
  or spills.
- The quantity **− / +** buttons flank the stage.

**The view toggle — "Close-up | Whole table".** One control that is also the zoom (the owner's
pinch-zoom idea, folded into the toggle rather than a gesture). **Close-up** shows only the claim
(held + needed), large. **Whole table** adds the ghost slots, smaller. **Default: Whole table.**
Remembered **in memory for the session only** (persisting it is an owner call — § 10). Switching
animates ghosts in/out (opacity + scale, ≤ 300 ms).

**"You hold" — privacy and Tempest rules.** Computed only from what this player can see:

- A **Phantom** never counts toward "You hold" (it would leak its hidden face).
- **Loaded** fills two held slots; **Cracked** and **Snake** fill none.
- A committed **Slick** counts toward its picked face; an unpicked Slick counts toward its shown
  face.
- Wilds follow the rules state (Strict / Classic / Volatile, including `dybOnesStripped`).

### 4.2 Building a bid — illegal bids are unreachable

- **Your draft opens at the lowest legal raise** — the standing face, quantity + 1. Climbing is one
  tap.
- **Tapping a face** jumps quantity to that face's minimum legal quantity.
- **−** stops at the minimum legal quantity for the selected face; **+** stops at the table total.
- **1s under Classic Wilds**: dimmed but answerable — tapping shows the reason inline
  (*"1s are wild, so they can't be claimed"*). Under **Volatile**, the 1 carries a warning that
  claiming it switches wilds off for this Shake.
- **Opening bid:** no Call button; the primary reads **"Open with …"**.
- **Off-turn:** the face row and buttons give way to a status bar in the active player's tint —
  *"**Jo** is deciding…"*. The stage keeps measuring the standing claim against your cup
  (caption: *"Standing claim: five 4s"*), so you can plan while you wait.

All final copy is set in the plan and lands in `docs/game-identities/dyb.md` T7b in the same
commit (paired section).

### 4.3 Other screens

The seating screen shows each player's tint. The showdown, Spirit Board (The Depths) and gameover
screens render through the new seam and carry tints; their layout is not otherwise redesigned
beyond § 5.2.

---

## 5. The shake and the reveal

Both are **blocking choreography beats** — no decision can be made during them — so they may
exceed the 300 ms motion ceiling (`ui-style.md` § Motion Standard; precedent `CJAR_FLIP_ANIM_MS`).
They animate **only `transform` and `opacity`**, and each checks `prefers-reduced-motion` **in JS**
(a CSS media block does not reach a scripted animation; precedent `combReducedMotion()`).

### 5.1 The shake (every Shake, each player's own device, simultaneous)

1. **The cup** — a procedural cup in the centre. Hold → it rattles and wobbles. Release or tap →
   throw.
2. **The throw** — the cup lifts away; your dice tumble out as 3D cubes and land on your actual
   roll (~1.2 s total).
3. **Settle** — the dice slide into the "Your cup" row; Tempest forms and Slick "pick" badges
   appear on landing.
4. **Ready** — the player confirms the hand (the existing submit).

No device-motion shake: iOS prompts for sensor permission, at the worst possible moment.

**Reduced motion:** the cup fades, the dice appear in place.

### 5.2 The reveal (The Overlook)

It reuses the stage from § 4.1, so the verdict reads in the same visual language as the betting:

1. **Cups lift** (~0.6 s) — every hand appears as a named row in its owner's tint.
2. **The fog lifts** (~0.5 s) — every Phantom's mist clears (§ 3.6).
3. **The count** — the stage shows **the claim as empty dashed slots**. Each counting die pops and
   flies from its owner's row into the next slot, in its owner's tint. Loaded fills two slots;
   Snake knocks a filled slot back out; Cracked shudders and stays put. Ticks start at 400 ms and
   **accelerate** with the count so a large table does not drag.
4. **Verdict** — every slot full → **CLAIM HOLDS**; slots left empty → **BLUFF CALLED** (the
   unfilled dashes are the visible gap).
5. **The plunge** — on the loser's climber chip, one mini die tumbles off (Footholds: a ◆
   crumbles).

**Reduced motion:** nothing travels — fades only; slots fill in place at the same pace; the
verdict appears.

**The count is single-sourced (§ 6.2).** The animation plays the same event list whose sum is the
verdict's real count.

### 5.3 Sound — no new synthesised effects

A `DYB_SOUND` map (the `CJAR_SOUND` pattern, `logic-engine.md` § Audio) names each moment:

| Moment | Plays |
|---|---|
| Rattle | `playTick` bursts |
| Cup lift | `playWhoosh` |
| Dice land | `playPillClick` |
| Each counted die | `playTick` |
| Verdict — bluff called | `playBoing` |
| Verdict — claim holds | `playSuccess` |

### 5.4 Timers

Every timeout / RAF in the shake and reveal is held in a named handle and cleared on the
quit-confirm, in `resetToLobby()`, and on any early transition (`logic-engine.md` § Timer
Lifecycle).

---

## 6. Rules and counting — pure, shared, single-sourced

### 6.1 Pure rule functions

Refactored to take arguments and read **no globals**, so the table and Practice share them:

- `dybLegalRaise(claim, bid, rules)` — replaces `dybIsLegalRaise` (which reads `dybCurrentQty`,
  `dybCurrentFace`, `dybWildcardsStyle`, `dybOnesStripped`).
- `dybMinQty(claim, face, rules)` — replaces `dybMinQtyForFace`.
- `dybYouHold(hand, face, rules)` — § 4.1's count, Phantom excluded.

`rules = { wildcards: 'strict'|'classic'|'volatile', onesStripped: bool }`.

### 6.2 One counting function

`dybCountEvents(face, hands, rules)` returns the ordered per-die events
`{ pIdx, dieIdx, delta: +1|+2|−1|0 }`. **The real count is the sum of the deltas; the reveal
animation plays the same list.** `dybComputeRealCount` and `dybGetCountingDice` both collapse into
it. (Today they are separate and treat Snake differently — exactly the duplication `logic-engine.md`
§ "Single-source card/board arithmetic" forbids; the new reveal would make any disagreement
visible.)

The real count's value must not change for any existing hand — the harness proves equivalence
against the current `dybComputeRealCount` before the old function is deleted.

### 6.3 Renderers take a model

The climbers strip, cup, claim line, stage, face row and reveal become renderers of a **model**
(a plain state object), not readers of `dyb*` globals. The live table builds the model from game
state; Practice builds it from its script. This is what stops Practice drifting from the real game.

---

## 7. Practice

### 7.1 Where

`dyb-how-to-overlay` gains a third tab: **The Rules | Practice | The Dice**.

### 7.2 The script

Classic Wilds, Tempest off. You + two scripted climbers: **Mia** (terracotta) and **Jo** (moss);
5 dice each, 15 on the table. The hands are fixed, so every coach line is true.

| # | Beat | Coach / what happens | Player |
|---|---|---|---|
| 1 | Shake | "Hold the cup to shake, let go to throw." Real throw animation; you land **3·3·1·5·2** | Shakes |
| 2 | Read your cup | "Two 3s — and a 1. In Classic Wilds, 1s count as any face, so you really hold three 3s." The stage shows it | Continue |
| 3 | Open | "You go first. Tap 3, then + up to three 3s — you can back that yourself." | Explores freely; **Climb unlocks only on three 3s** |
| 4 | Watch them climb | Mia claims **four 3s** — "she only needs one more from ten dice — likely." Jo claims **seven 3s** — "the other cups would need four of their ten. A stretch." The Whole-table view is introduced | Watches |
| 5 | Your call | "Call the Bluff — or climb higher?" | Either; both scripted |
| 6 | The Overlook | Real reveal choreography. The table holds **five 3s**. **Called:** BLUFF CALLED, Jo loses a die. **Climbed:** Mia calls you; you fall — "climbing on a stretch is how you plunge." | Watches |
| 7 | Done | "That's The Bluff. A real game runs until one climber is left." | **Practice again** / **Got it** |

Mia's and Jo's hidden hands are fixed in the script so the reveal totals five 3s (including their
wild 1s); the plan fixes the exact faces and the harness checks them.

- **Coach:** a caption above the stage with a step counter ("3 / 7"). The control being taught gets
  a soft ring (a `box-shadow` transition — already reduced-motion-safe).
- **Dropped from the handoff:** the free "reroll stage" — reshaking changes the hand, and the
  lesson depends on a known one. "Practice again" replays the whole demo.

### 7.3 Isolation and lifecycle

- Practice renders through the same renderers as the table (§ 6.3), fed a scripted model.
- It never calls `mpSendEnvelope`, never reads or writes live `dyb*` match state, and cannot leak
  into a real game.
- Its timers/animations stop on tab-away, on close, and in `resetToLobby()`. It checks
  `prefers-reduced-motion` in JS. Precedent: CLD's "The Floe" tab.

### 7.4 The Dice gallery grows

The old reason for excluding Tempest dice ("a static tile can't show live state") no longer holds:
generated tiles can show mist, badge and fissure. **The Dice** tab gains:

- **The Faces** (the six, in the active set),
- **Seat tints** (the active set's eight),
- **The Tempest** — the five forms, each with a one-line ability,
- **In the Cup** — the cup.

Tiles are procedural, so — like CLD's pose tiles — they are **not** `artMakeZoomable` (no resolved
URL, § Pattern 2a) and no longer double as an offline install check.

**Tap-and-hold** on a special die in the hand jumps to its gallery row (`ui-style.md` § Tap-Hold
Reference: `dybBindDieHold` → `dybOpenHowTo('dice', type)` + `refHighlightRow`). This replaces
DYB's own long-press info popup (`dybShowDieInfo`).

### 7.5 The suite standard — "Practice tab"

Written into `ui-style.md` § How-to Overlay Standard as a named pattern for every game's future
tutorial rework:

- A **scripted, deterministic** demo, 60–90 seconds.
- Built from the game's **real renderers fed a model** — never a hand-built imitation.
- **Beats gated on the player doing the thing**, with a coach caption and step counter.
- **Both branches** at the game's key decision.
- Ends with **Practice again / Got it**.
- **No multiplayer**; standard timer lifecycle; reduced motion checked in JS.
- Tab order: **Rules | Practice | gallery**.

---

## 8. Testing

| Harness | Proves |
|---|---|
| `tools/verify-dyb-dice.js` (**rewritten**) | Every set × tint × face × type × state recipe is valid and deterministic; pips meet a contrast floor on all 8 tints of every set; a `concealed` Phantom recipe **carries no face**; the `diceSet` schema, incl. the three packs' manifests |
| `tools/verify-dyb-rules.js` (**new**) | `dybLegalRaise` / `dybMinQty` under all three Wildcards styles and `onesStripped`; `dybYouHold` incl. Phantom exclusion and Loaded/Snake/Cracked/Slick; `dybCountEvents` sums equal the current `dybComputeRealCount` on seeded random tables (run across several seeds) before that function is removed |
| `tools/verify-dyb-practice.js` (**new**) | The script's claims agree with its fixed hands (the reveal totals five 3s); both decision branches reach the end; Climb unlocks only on the suggested bid; Practice never calls `mpSendEnvelope` |
| `tools/verify-dyb-loopback.js` (**new**) | Host + 2 clients over a Firebase-shaped wire, real mock DOM: no applier throws on any device across several Shakes (shake, claim, reveal, gameover); all devices agree on claim, count and loser; no client learns another hand before `DYB_SHOWDOWN`; the Tempest on and off; accepts `DYB_SRC=` / `DYB_SEED=` |
| `visual-check` | Table at 4 and **8 players** (the 40-dice fit), shake, reveal, Practice — at the owner's **iPhone SE (2nd gen)** sizes **375×667, 375×548, 320×452** (320×452 first — the hardest), plus a reduced-motion pass |

Unchanged harnesses that must stay green: `verify-mp-configs.js`, `verify-identity-docs.js`,
`verify-build-fresh.js`.

**Still not a substitute for a real multi-device session** — owner playtest after the build.

---

## 9. Build order

Each phase ends green before the next starts.

1. **Rules and counting** — pure functions + `dybCountEvents`, tests first; the table still renders
   the old way.
2. **Dice generator** — `dyb-dice.js` (recipe, painter, cube), Rocky + Classic, the three pack
   conversions, `art.js` resolver. **Owner visual checkpoint:** a review page of every set × tint
   and the five Tempest forms, approved before any of it is wired into the game.
3. **The table** — model-fed renderers, the stage, face row, climbers strip, toggle, off-turn state.
4. **The shake and the reveal** — cube roll, fog, slot count, plunge, `DYB_SOUND`, timers.
5. **Practice** — the tab, the script, the gallery growth, tap-hold.
6. **Loopback, visual checks, docs** — § 8 and § 10; SW bump.

---

## 10. Docs and deferred work

**Documentation Integrity pass**, in order: `docs/code-map.md`; `docs/game-identities/dyb.md`
(T7a/T7b paired with the new copy, T7c, **T8** Phantom reveal, **T9** rewritten for procedural
sets); `CLAUDE.md` (SW entry, load order adds `dyb-dice.js`); `ui-style.md` (Practice tab pattern;
Tempest-in-gallery exception retired; `screen-dyb-table` on the Stack); `logic-engine.md` (dice
still game-specific, now in `dyb-dice.js`; `DYB_SOUND` noted beside `CJAR_SOUND`);
`docs/expansion-guide.md` (`diceSet`); `dyb-implementation-notes.md`; `docs/decision-log.md`
(procedural dice sets as the skin model for dice; Practice as the tutorial standard).

**New `docs/deferred-work.md` entries:**

- **Dice selector + Lounge dice-tower prop** — players pick a dice set; `diceSet` packs are the
  catalogue; `dyb-dice.js` moves to `js/lib/`.
- **Seat and colour picking in the waiting lobby — suite-wide.** `dybTintFor()` is DYB's hook.
- **Practice tab retrofit** — one line per remaining game (19).
- **Persisting the stage view toggle** — needs a new permitted `localStorage` key (owner call).

**Closed by this build:** the deferred-work entry "DYB — Phantom-die reveal + a procedural dice
rework" (→ `docs/deferred-work-log.md`), and the Phantom entry in `dyb-implementation-notes.md`'s
bug index.

---

## 11. Risks

- **40 dice on a 320 px screen.** The stage's fit-to-box sizing is the mitigation; visual-check at
  320×452 with 8 players is the gate. If the dice fall below a legible size, Whole table groups into
  a compact count ("+18 more") beyond the claim — decided at the gate, not before.
- **Canvas painting cost on first show.** Cache by key; paint only faces in use; measure on the
  first table render.
- **CSS 3D on iOS WebKit.** `preserve-3d` + `backface-visibility` quirks; the reduced-motion path is
  also the fallback if the cube misrenders.
- **The model refactor touches every table render path.** Phase 1's harnesses and the Phase 6
  loopback are the guard; the old table stays working until Phase 3 replaces it.
