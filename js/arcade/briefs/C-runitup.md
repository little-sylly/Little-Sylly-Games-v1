# Arcade Brief C — RUN IT UP (Pass's world)

> **How to use:** paste `arcade-cabinet-prompt.md` first, then this brief. This brief answers Step 1
> of the prompt, so go straight to Step 2. The prompt's rules win any conflict; this brief owns the
> design.

| | |
|---|---|
| Title (`RIU_TITLE`) | RUN IT UP |
| id / file / screen | `runitup` · `js/arcade/runitup.js` · `screen-arcade-runitup` |
| Prefix | `riu` / `RIU_` |
| Terminal label | RUN IT UP |
| Ancestor | TriPeaks / Golf solitaire |
| World | Pass (`pass`, game 12) |
| Target run | 2–3 minutes (3 Deals) |

**Reserved by sibling briefs being built in parallel:** `csh trc wic fwk`. Don't take them.

---

## 1. Pitch

The cards are laid out in two peaks. Tap any uncovered card that's **one rank higher or lower** than
the Table card to play it, and keep a Climb going as long as you can. When you're stuck, **Pass** to
flip a new Table card. Clear both peaks before the deck runs out, or get caught holding cards and pay
chips for it.

## 2. Why it belongs to Pass

It's Pass's one-sentence rule ("one rank higher than what's on the table") boiled down to a solo
card puzzle. It keeps Pass's exact rank order, its chips, its "caught holding cards" penalty, its
Jokers and its Bombs, and the button that flips the deck is literally labelled **PASS**.

---

## 3. The world: borrow exactly this

**Pass deliberately has no fiction.** It's a straight, confident card game, and its personality is
all in its vocabulary. **Don't invent lore, mascots or a story.** The cabinet should feel like a real
card table.

**Palette** (zinc: this replaces the house CRT green):

```js
const RIU_TABLE   = '#18181B',  // zinc-900, Pass brand: the table
      RIU_TABLE_HI= '#27272A',  // zinc-800, soft radial lift in the centre
      RIU_LINE    = '#3F3F46',  // zinc-700, card backs / dividers
      RIU_DIM     = '#A1A1AA',  // zinc-400, labels
      RIU_CARD    = '#FAFAFA',  // card face
      RIU_EDGE    = '#D4D4D8',  // card edge
      RIU_RED     = '#DC2626',  // hearts / diamonds
      RIU_BLACK   = '#18181B',  // spades / clubs
      RIU_GOLD    = '#FBBF24';  // Climb glow, chips, Bomb (the one warm accent)
```

**Type.** Bold monospace for the HUD. Card corners use a bold sans or monospace, whichever reads
best at size.

**Vocabulary:**

| Term | In this cabinet |
|---|---|
| **The Table** | the face-up card you play onto |
| **Pass** | flip the next card from the deck onto the Table (breaks your Climb) |
| **Climb** | consecutive plays without a Pass, i.e. the combo |
| **Chips** | the score |
| **Caught holding** | cards left on the peaks when a Deal ends, which cost chips |
| **Bomb** | a power you earn: blast any face-up card straight to the Table |
| **Sky Joker** | a Joker on the Table: wild, so any card can follow it |
| **Deal** | one layout. A match is 3 Deals |
| **New Deal / Walk Away** | play again / back to the menu |

**Voice.** Terse, functional, card-table: *Deal Me In*, *New Deal*, *Walk Away*.

---

## 4. How it plays

### Rank order: Pass's, not standard solitaire's

`3 4 5 6 7 8 9 10 J Q K A 2`, and it **wraps** (2 ↔ 3). A card is playable if it sits **directly
above or below** the Table card on this ladder. Suits don't matter.

A **rank ladder strip** runs along the bottom of the screen with all 13 ranks. The Table card's rank
is highlighted, and its two playable neighbours glow gold. It teaches the unusual order without a
single word.

### The layout: "Two Peaks" (portrait-friendly TriPeaks)

- Rows from the top: **2, 4, 6, 7 cards** (19 total), forming two peaks that share the base. Each
  card overlaps the two cards below it by about half its height, like TriPeaks.
- Card size is about **44 × 62** logical px, so the bottom row of 7 fits within 360 with gaps.
- **Only the bottom row starts face up.** A card turns face up (with a quick flip) once both cards
  covering it have been played.
- **Deck:** the remaining 52 − 19 − 1 = 32 cards **plus 2 Jokers** = 34, shuffled. One card starts
  on the Table.
- Layout: the peaks in the upper ~55% of the screen. The Table pile at bottom centre, the deck at
  bottom left with **PASS (34)** printed on it, the Bomb slot at bottom right, and the rank ladder
  under all of it.

### Playing

- **Tap a face-up tableau card** that's playable: it flies to the Table, and your **Climb** goes up
  by 1. Tapping a card that *isn't* playable gives a little shake and a low beep, with no penalty.
- **PASS:** tap the deck. The next card flips onto the Table and the **Climb resets to 0**.
- **Playable cards glow faintly** (a gold edge) the whole time. That's the kid assist. Keep the glow
  subtle so finding the play is still the fun part.
- **Jokers:**
  - A Joker flipped from the deck becomes a **Sky Joker** on the Table: any card may follow it.
  - (Optional variant: a Joker can also sit in the tableau, where it's playable on anything.)
- **Bomb:** reaching **Climb 6** earns a Bomb (you can hold one, shown in the Bomb slot). Tap the
  Bomb, then tap **any face-up tableau card**: it goes straight to the Table, ignoring rank, and your
  Climb continues. Shake plus a **BOMB!** bark.

### End of a Deal

- **Table cleared** (both peaks gone): **TABLE CLEARED** plus the bonus.
- **Stuck** (deck empty and no playable card, Bomb included): **CAUGHT HOLDING**. You pay chips for
  every card left in the peaks, with Pass's rule: **1 chip per card, or 3× if 13 or more are left.**
- Then the next Deal. After Deal 3 the match is over. **If your chips hit 0 at any point → BUSTED,
  and the match ends early.**

---

## 5. Chips (the score)

You start with **100 chips**.

| Event | Chips |
|---|---|
| Card played | `+ Climb length` (1st card +1, 2nd +2, 3rd +3…) |
| Peak tip cleared | +10 |
| Table cleared | +30, plus 2 per card left in the deck |
| Caught holding | −1 per card left (−3 per card if 13+ left) |

The HUD shows `DEAL 1/3`, `CHIPS 100` and `CLIMB ×4` (gold, pulsing as it grows). The leaderboard
ranks by final chips.

**Tuning knobs:** Climb-6 for a Bomb, 2 Jokers, 3 Deals. If runs take longer than 3 minutes, keep 3
Deals and drop the base to **2, 4, 5, 6** (17 cards). A 5-Deal match ("Match Length 5", like Pass) is
the parity option. Decide by play-testing.

---

## 6. Screens and states

The prompt's state machine applies. Within `playing`: `dealing` (cards fly from the deck to the
peaks, 1.2 s) → `play` → `dealEnd` (cleared or caught-holding tally, 2 s) → next Deal or `over`.

- **Attract:** the title **RUN IT UP** over a fanned hand of five cards that slowly breathes. Below
  it, the one-line rule. The button is **DEAL ME IN**.
- **Deal intro line** (one of these, under *DEAL N OF 3*):
  - *Fresh deck, fresh hands. Nobody has an edge yet.*
  - *Everyone starts even. The climb begins now.*
  - *New hands all round. The table remembers nothing.*

---

## 7. Art: draw it, don't load it

There's no access to `js/lib/cards.js` (cabinets can't call it), so draw the cards on the canvas:

- **Face:** a rounded rect (radius 5) with a 1 px edge. Rank and suit in the top-left corner, plus one
  big central suit symbol. **Court cards** get a big J, Q or K letter with a thin frame instead of an
  illustration. Draw the suits (♠ ♥ ♦ ♣) as paths or text, whichever renders consistently.
- **Back:** zinc-700 with a fine diagonal cross-hatch and a thin inner border. No logo.
- **Joker:** "JOKER" set vertically down the card, with a small star. Gold accent.
- **Motion:** cards fly to the Table on a 160 ms ease-out arc. Face-down cards flip by squashing
  horizontally. On **TABLE CLEARED**, the remaining deck cards cascade into the Table one at a time
  (about 40 ms apart) as the bonus counts up.
- **Climb feedback:** the Climb counter gets bigger and warmer as it grows. At 6, the Bomb slot lights
  up with a gold ring.

---

## 8. Sound map (`RIU_SOUND`)

| Moment | Beeps |
|---|---|
| `select` | 660 |
| `highScore` | 1046 |
| `play` | 523 + (climb × 40), capped at 1046, so the pitch climbs with the Climb |
| `nope` | 147 |
| `pass` | 330 |
| `flip` | 784 (very short) |
| `bombEarned` | 880, 1175 |
| `bomb` | 110, 82 |
| `peak` | 784, 988 |
| `cleared` (jingle) | 523, 659, 784, 1046, 1318 |
| `caught` | 392, 349, 330 |
| `busted` | 262, 196, 147, 98 |

---

## 9. Copy deck

```
RUN IT UP
Shed the peaks, climb the table.
One higher or one lower. 2 wraps to 3.
DEAL ME IN

DEAL N OF 3
PASS (34)
CLIMB ×N
BOMB READY · BOMB!
SKY JOKER!
PEAK +10
TABLE CLEARED
CAUGHT HOLDING −N
BUSTED                         ← chips hit 0
FINAL CHIPS                    ← run over
TOP STACKS                     ← leaderboard heading
SIGN FOR YOUR CHIPS            ← name entry
NEW DEAL  /  WALK AWAY         ← again / menu
```

---

## 10. Build order

1. The deck model, Pass's rank order with wraparound, and the playable test. Then the Two Peaks
   layout, covering and uncovering, tap-to-play, and PASS. Playable in the bench.
2. Climb, chips, peak and clear bonuses, and caught-holding with the ×3 rule. 3 Deals, then BUSTED.
3. The rank ladder strip and the playable glow.
4. Jokers (Sky Joker), and earning and using a Bomb.
5. Card drawing, motion, sound, the attract hand.
6. The leaderboard skin, then a full play-test of every state as the prompt requires.

## 11. Done when

- A kid who's never seen Pass's rank order can play the first Deal using the ladder strip alone.
- No card is ever mis-judged as playable or unplayable. Write a tiny self-test for the wrap: K→A,
  A→2, 2→3 and 3→2 are all legal.
- Every tap target is at least 44 px wide (only the exposed part of an overlapped card needs to be
  tappable).
- There's no lore, no mascot and no illustrated faces. It reads as a real card table.
- A 3-Deal match lasts about 2–3 minutes.
