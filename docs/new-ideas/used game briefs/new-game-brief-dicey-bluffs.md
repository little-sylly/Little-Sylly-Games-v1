# New Game Brief — Dicey Bluffs
**Document type:** Phase 1 — Design Brief (non-technical)  
**Who fills this in:** Project owner + Gemini AI, before any technical work  
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Dicey Bluffs |
| **Short nickname / abbreviation** | dyb |
| **One-sentence tagline** | Trust no one, count every face. |
| **Thematic universe** | A dimly lit, back-alley 1920s speakeasy where players gamble with wooden cups and loaded claims. |
| **Emoji / icon** | 🎲 |
| **Brand colour preference** | `stone-400` — warm medium grey, closest to aged ivory that holds contrast on white cards. Note: `pill-active-stone`, `game-toggle-on-stone`, and `dyb-range` CSS classes do not yet exist and must be added at tech spec time. |

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–8 players |
| **Teams or individuals?** | Everyone for themselves (individual elimination) |
| **Are there different roles?** | No |
| **Is any information hidden from some players?** | Yes. Every player's rolled dice values are strictly hidden from all other players until a showdown is triggered. |
| **Minimum meaningful player count** | 3 players (the sweet spot is 4–6 for optimal probability bluffing) |

Not applicable — all players operate under identical mechanical rules.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?** A player must either increase the current collective dice bid (stating a higher quantity of any face, or a higher face value) or call out the previous player's claim as a bluff.

**What is the central tension or fun moment?** The moment a player slams the challenge button, a dramatic "cup lifting" animation occurs across all connected screens, and players collectively watch the table tally count up the real dice to see who gets cleaned out.

**What type of game is this closest to?**
- [x] Deduction / bluffing / social deception

**Walk through one complete round step by step, in plain English:**

1. **The Shake:** Every player physically shakes their own phone or rapidly taps the screen simultaneously to rattle their digital dice inside their cup.
2. **The Peek:** Each player views their private dice values displayed clearly at the bottom of their individual screen.
3. **The Opener:** The starting player inputs an opening claim (e.g., "Across everyone's cups, there are at least four 5s").
4. **The Escalation:** Moving clockwise, the next player must either raise the claim or challenge. To raise, they must either increase the quantity while keeping any face (e.g., five 5s), OR keep the same quantity and increase the face value (e.g., four 6s). **Quantity must never decrease** — e.g., "Three 6s" is not a legal raise after "Four 5s."
5. **The Showdown:** When a player challenges, all player screens flash. The game engine tallies all dice of that face value across the room and displays the final count on everyone's device.
6. **The Penalty:** The loser loses one of their digital dice for the next round.

**Is there anything players do simultaneously, or is everything sequential (one at a time)?** The initial rolling and peeking phases are completely simultaneous. The bidding and challenging phase is strictly sequential.

**How does the phone physically move between players?** Each person has their own device connected to a real-time room code. No physical device swapping occurs.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When all players except one have lost all of their digital dice. |
| **How is the winner determined?** | The last surviving player with at least one die remaining wins the match. |
| **Are ties possible, and if so how are they handled?** | No ties are possible; a challenge mathematically forces exactly one person to lose a die. |
| **Roughly how long should a full game take?** | 10–15 minutes. |

---

## 5. Scoring (REQUIRED)

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| A challenge is issued and the real count is less than the claim. | The Challenger wins. The Bidder loses. | Bidder loses 1 Die | The bidder over-bluffed and got caught. |
| A challenge is issued and the real count is equal or greater than the claim. | The Bidder wins. The Challenger loses. | Challenger loses 1 Die | The claim was safe; the challenger doubted incorrectly. |

**Does scoring feel balanced?** Yes. Because it uses classic elimination, it self-balances. Knocked-out players transition into an active spectator mode.

**Any outcomes where nobody scores?** No. Every single challenge forces exactly one die out of rotation.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|---|---|---|---|
| Wildcards Style | Determines how the 1-face behaves during active Allegations. | Strict Numbers / Classic Wilds / Volatile Wilds | Classic Wilds |
| Starting Hand | The number of digital dice each player starts with in their cup. | 3 Dice / 4 Dice / 5 Dice | 5 Dice |
| ✨ Devil's Luck | Activates the chaotic variable modifier dice pool variant. | Off / On | Off |

**Wildcards Style options:**
- **Strict Numbers** — 1s are never wild; they count only as face value 1 in all tallies.
- **Classic Wilds** — 1s permanently count toward any face value during the tally. Players cannot directly allege 1s.
- **Volatile Wilds** — 1s are wild until a player explicitly alleges them (e.g., "Four 1s"). The moment that bid is submitted, 1s strip their wild status for the remainder of that Shake: they count only as 1s, and subsequent players may only raise the quantity of 1s or call bluff. They cannot swap back to another face.

**Are there any settings that should be locked or hidden in certain situations?** None.

---

## 7. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | Devil's Luck |
| **In one sentence — what changes?** | Standard dice pools are injected with volatile, randomised specialty dice that drastically alter probability calculations. |
| **Does it add new screens or phases?** | No, but the hand dock at the bottom dynamically styles your dice array with custom visual states based on what rolled. |
| **Does it change scoring?** | No, but it heavily impacts how total dice quantities are calculated during the final table tally. |
| **Does it change the win condition?** | No. |

### Specialty Dice Pool (Devil's Luck Rules)

At the start of each Shake phase, every individual die has a randomised modifier check applied to its roll:

| Die type | Default chance | Effect |
|----------|---------------|--------|
| Standard Die | 75% | 1× normal value |
| The Loaded Die | 5% | Counts as 2× quantity for the face it rolls during the table count |
| The Phantom Die | 5% | Value rolls normally but stays hidden from the player until the final showdown |
| The Slick Die | 5% | Blank wildcard pip — player taps to manually assign a face value before bidding begins |
| The Cracked Die | 5% | Blown-out face; contributes 0 to all table calculations |
| The Snake Eye | 5% | Crimson die. If a showdown is called on the exact face value it landed on, it contributes −1 to the room's final tally |

**Intensity slider** (same pattern as LI5 Wild Words): 5%–10% per special die (increments of 1%). At max (10% each), standard die = 50%, specials = 50% total.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What this game calls it |
|---|---|
| Round | The Shake |
| Score / points | Dice in Hand |
| Game over screen | The Clean Out |
| Play again | Roll Again |
| Quit | Walk Away |
| Settings overlay title | House Rules 📋 |
| The Bid / Claim | The Allegation |
| Challenge / Call Liar | Call Bluff! |
| Dice revealing phase | The Showdown |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | No. |
| **If yes — which categories?** | N/A |
| **If no — what kind of content does it need?** | This game relies entirely on a random number generator yielding integers between 1 and 6. |
| **Does it need a completely new data file?** | No. |
| **Any words or topics that should be excluded?** | None. |

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **In the ideal multiplayer version, does each player have their own device, or do teams share a device?** | Each player must use their own individual device. |
| **Is there any information that must stay private to one player or one team's device?** | Yes — the array of dice values rolled by that player must only render on their personal screen during the active round. |
| **Are there moments where players act simultaneously (at the same time)?** | Yes — during The Shake phase, everyone rolls simultaneously via device motion sensors or rapid screen tapping. |
| **Are there moments where one device should be locked while another is active?** | Yes — during sequential turn progression, only the active player's screen presents inputs. Others see a passive waiting message. |
| **Any roles or phases that simply don't work with multiple devices?** | None. This game is built natively for multiple devices. |

---

## 11. Screens — Plain English List (REQUIRED)

1. **Speakeasy Door (Game Menu):** The local lobby entry screen — settings, how to play, start session.
2. **Pull Up a Chair (Setup):** Host sets House Rules; players join via room code.
3. **Shake 'Em Up (The Roll):** Simultaneous screen where all players shake or rapid-tap to roll their dice pool.
4. **The Whispering Table (Active Bidding):** Primary gameplay view — player pip counts at top, current Allegation in the centre, private dice hand with toggleable stealth veil at the bottom footer.
5. **Slamming the Cup (Showdown Reveal):** Synchronised dramatic reveal — matching dice flash one by one as the global tally counts up.
6. **The Clean Out (Game Over):** Final leaderboard showing the last player standing.
7. **The Spirit Board (Ghost View):** When a player is eliminated, their device enters a read-only ghost state. The action inputs (Call Bluff / Raise) are replaced by a live grid showing every active player's hidden dice hand side-by-side, updating in real time. Flashes green when a live player submits an Allegation that exceeds the true room count — letting ghosts track who's bluffing.

---

## 12. Open Questions & Design Notes (REQUIRED)

**Resolved design decisions:**
- **Bidding escalation rule:** Quantity must equal or increase when raising. Raising face value requires same-or-higher quantity. "Three 6s" after "Four 5s" is illegal. Reason: allowing quantity drop destroys the mathematical compression and resets tension.
- **Wildcards Style:** Upgraded to three-way setting — Strict Numbers / Classic Wilds / Volatile Wilds. Classic Wilds is default (1s permanently wild, cannot be directly alleged). Volatile Wilds lets players allege 1s, which strips wild status and locks bid progression onto 1s for the rest of that Shake.
- **Round opener:** The loser of the previous Showdown opens the next Shake. They set the opening Allegation — psychologically cornered, forced to lead.
- **The Spectre Engine / Spirit Board:** Eliminated players enter a read-only ghost state called The Spirit Board — a live grid of all active players' hidden hands. Action inputs are gone. Flashes green when a live player's Allegation exceeds the real count. Vengeance mechanics deferred to post-v1.

**Things that might be complicated to implement (flag for Claude Code):**
- Real-time synchronisation across multiple browser instances during the multi-stage Showdown animation sequence — race conditions or early spoilers must be prevented.
- Disabling bid controls intelligently so players cannot mathematically submit an illegal (lower) bid.
- Volatile Wilds state management: once a player alleges 1s, the engine must globally strip 1s' wild status and lock subsequent bids to 1s-only for the rest of that Shake. This is a mid-round rule mutation outside the normal bidding constraint checks.

**Things explicitly OUT OF SCOPE for v1:**
- Decorative cosmetic dice skins.
- Secondary token betting systems for spectator players.
- Ghost vengeance mechanics (ghosts influencing live play).

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Perudo, Liar's Dice, Pirates of the Caribbean tavern mini-game. |
| **Tone** | Tense, sneaky, highly strategic, full of mock outrage. |
| **Should NOT feel like** | A clean, sterile casino mathematical spreadsheet tracker. |

---

## 14. Sample Round (REQUIRED)

**Setup:** 3 players connected via individual devices.

- Sarah (5 dice remaining): Rolled [2, 2, 5, 5, 6]
- Dave (5 dice remaining): Rolled [1, 3, 4, 6, 6] *(1 is a Wildcard)*
- Toby (4 dice remaining): Rolled [2, 3, 3, 4]

**Sarah:** Looks at her two 5s and opens conservatively — "Three 5s total across the room."

**Dave:** Knows his 1 is wild, giving him effectively three 6s (two real + one wild). Applies pressure — "Four 6s total across the room."

**Toby:** Has zero 6s. Smells a rat but doesn't want to challenge yet. Bumps the quantity instead of the face — "Five 5s total across the room."

**Sarah:** Holds two 5s herself. Five across the whole table feels too high. Taps "Call Bluff!"

**Result:** Showdown triggers on all three phones. The cups lift.

The tally counts all 5s and wild 1s: Sarah has two 5s, Dave has one wild 1, Toby has zero 5s. Real total = **three 5s**. Toby's claim of five fails — Toby loses 1 Die. His pool drops to 3 dice next shake.

---

## Extra — Sample Screen (work in progress)

```
+-----------------------------------------------------+
| [Room: DYB-73]             House Rules 📋           |
|                 == DAVE'S TURN ==                   |
+-----------------------------------------------------+
|  (Sarah) ⚀⚀⚀⚀⚀    *[Dave]* ⚀⚀⚀⚀    (Toby) ⚀⚀⚀       |
+-----------------------------------------------------+
|                                                     |
|                  THE ALLEGATION                     |
|                      5 × ⚅                          |
|             "At least five 6s"                      |
|                                                     |
|    Dave alleged four 6s.                            |
|                                                     |
+-----------------------------------------------------+
|          [ CALL BLUFF ]     [ RAISE ]               |
+-----------------------------------------------------+
| DICE IN HAND (Private)                              |
|  [ 2 ]   [ 2 ]   [ 5 ]   [ 5 ]   [ ⚅ ]   ( Hide 👁️ )|
+-----------------------------------------------------+
```
