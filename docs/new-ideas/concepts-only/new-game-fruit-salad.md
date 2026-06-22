# New Game Brief — Fruit Salad
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + Gemini AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Fruit Salad |
| **Short nickname / abbreviation** (3–4 letters, used in code) | `frt` |
| **One-sentence tagline** | "This is definitely a banana. Trust me." 🍌 |
| **Thematic universe** | A high-tension, animated kitchen table filled with theatrical fruit characters who possess extreme attitude, heavy trust issues, and distinct social baggage. |
| **Emoji / icon** | 🍌 |
| **Brand colour preference** | Banana Yellow — implemented as a CUSTOM hex (`#FFD93B`), NOT the Tailwind `yellow` family (Bailed already owns `yellow-500` / `pill-active-yellow` / `game-toggle-on-yellow`). Bespoke classes: `pill-active-frt`, `game-toggle-on-frt`, `frt-range`, inline `style` on CTAs — same approach GTH uses for sage. See §16. |

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–8 players (plus an optional 2-player "Pear of Fruits" duel variant — kept for v1; mechanical ruleset to be confirmed, see §16) |
| **Teams or individuals?** | Individuals (every player for themselves) |
| **Are there different roles?** | No unique structural roles in v1 (everyone acts as a Passer or Receiver). |
| **Is any information hidden from some players?** | Yes. Private hands are entirely hidden from other players. The true identity of a face-down passed card is hidden from all screens via UI masks until a call is made or a peek occurs. |
| **Minimum meaningful player count** | 3 players for the standard pass-the-buck loop; 2 players via the "Pear of Fruits" duel variant (no passing — see §16C). `getMinPlayers()` is dynamic: 3 when Sylly Mode is ON, else 2. |

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
A player selects a hidden card from their hand (or handles a card passed to them), executes a face-down slide to an opponent, and declares aloud what fruit they claim it is.

**What is the central tension or fun moment?**
The "Stare Down." The moment a pulsing, face-down card lands on a receiver's screen, and they have to look up across the room to judge whether the sender is telling the truth or dropping an unmitigated lie.

**What type of game is this closest to?**
☑ Deduction / bluffing / social deception

**Walk through one complete round step by step, in plain English:**

1. **The Hand Out:** The engine generates a custom 64-card deck (8 cards of each of the 8 fruit varieties) and distributes them evenly into the private Fruit Stashes of all connected players.
2. **The Initial Serving:** The active player selects a single card from their private stash, taps the avatar of an opponent, selects their declared fruit identity from an on-screen grid, and executes The Serving to slide it face-down.
3. **The Target Alert:** The recipient receives a prominent notification banner on their device: "Mia served you a card and swears it's a Smug Banana!"
4. **The Response Gate:** The targeted receiver must choose one of three distinct actions:
   - **Call "True":** They wager that the true fruit matches the sender's declaration.
   - **Call "False":** They wager that the sender is bluffing.
   - **Peek & Pass:** They privately reveal the card's true identity to themselves, select an unrevealed player from the lobby who hasn't handled this specific card yet this round, make a brand-new declaration, and slide it onward.
5. **The Challenge Reveal:** If a player calls "True" or "False", the card instantly flips face-up across the synchronized network lobby, "unboxing" itself.
   - If the caller guessed correctly, the sender must claim the card and place it face-up in their open penalty collection area (The Fruit Bowl).
   - If the caller guessed incorrectly, the caller takes the penalty and adds it face-up to their own Fruit Bowl.
6. **The Next Switch:** The player who lost the challenge and collected the penalty card becomes the new active player to initiate the next serving loop from their remaining private stash.

**Is there anything players do simultaneously, or is everything sequential (one at a time)?**
The passing flow is strictly sequential to maintain intense psychological focus. Unassigned players act as active spectators, watching the animated timeline tracking who is serving cards to whom.

**How does the phone physically move between players?**
Each person operates on their own individual device connected via the multiplayer network architecture.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | Instant Round Elimination Trigger. A single round halts the exact second a player is forced to collect a 4th card of the same fruit type face-up in their Fruit Bowl, OR when a player must initiate a pass but holds 0 cards in their private Fruit Stash. The match fully concludes once the host's configured round limit is completed. |
| **How is the winner determined?** | At the end of the final round, all accrued session tokens are tabulated. The overall winner is the player with the highest total score. |
| **Are ties possible, and if so how are they handled?** | Yes, if multiple players share the exact same high token count at the end of the configured rounds. Ties result in a shared podium victory announcement. |
| **Roughly how long should a full game take?** | 10–15 minutes for a standard 3-round session. |

---

## 5. Scoring (REQUIRED)

Session scores compile across multiple rounds to ensure individual survival translates into an overall winner.

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| Triggered the Loss | The eliminated player | 0 tokens | Displayed on screen as "Fruit Looped". |
| Pristine Clean Escape | Any survivor with 0 penalty cards | +10 tokens | Awarded for a perfect psychological performance. Mutually exclusive with "Survived the Salad" — see §16D. |
| Survived the Salad | All other non-eliminated players | +5 tokens | Standard survival baseline award. |
| The Silver Lining | Player who won the most bluff calls (per session) | Bonus +2 tokens | Flavour badge title: "Fruit Master". See §16D for the exact metric. |

**Does scoring feel balanced?**
Yes. It prevents a single bad round from entirely ruining a player's session while keeping pressure heavily mounted on the player who gets "Fruit Looped" each round.

**Any outcomes where nobody scores?**
No. Everyone except the single eliminated loser walks away with tokens to keep the session feeling highly encouraging.

---

## 6. Settings (REQUIRED)

| Setting name (plain English) | What does it change? | Options | What should the default be? |
|------------------------------|---------------------|---------|----------------------------|
| Fruit Stock | Modifies total card distribution profiles to alter game velocity. | Standard (8×8) / Swift (6×6) / Mega Salad (10×8) | Standard (8×8) |
| Fruit-Offs | Sets the total number of sequential rounds played before declaring the final session winner. | 1 Round / 3 Rounds / 5 Rounds | 3 Rounds |
| Think Before You Fruit | Implements an active turn countdown timer to force rapid choices under pressure. | Off / 15s / 30s / 60s | 30s |
| Pear of Fruits | Alters the core state machine rules specifically to accommodate tight 2-player matchmaking. | Off / On | Off |
| ✨ Sylly Mode (Fruity Personalities) | Every fruit variety gains a unique, rule-breaking property — see §7 and §15. | Off / On | Off |

**Are there any settings that should be locked or hidden in certain situations?**
- The "Mega Salad" stock profile should be programmatically locked if the lobby has fewer than 5 players to prevent rounds from dragging out.
- **Pear of Fruits ↔ Sylly Mode are mutually exclusive.** At exactly 2 players the duel rules auto-engage (burn pile, no Peek & Pass, 5-card threshold — see §16C) and Sylly Mode is greyed out with subtext "Fruity Personalities require 3+ players". Enabling Sylly Mode raises the minimum player count to 3. In duel mode the Fruit Stock setting is hidden and the fixed 54-card duel deck is used.

---

## 7. Sylly Mode (if applicable)

Our custom variant directly utilizes the psychological profiles of our fruit deck, turning passive cards into active rule breakers.

| Field | Your answer |
|-------|-------------|
| **Thematic name** | Fruity Personalities |
| **In one sentence — what changes?** | Every fruit variety gains a unique, rule-breaking property that alters the game state based on its personality categorization when interacted with. |
| **Does it add new screens or phases?** | No. It modifies the existing logic inside the Core Loop seamlessly. |
| **Does it change scoring?** | No. |
| **Does it change the win condition?** | No, but it heavily messes with how fast players approach the threshold. |
| **Availability** | Requires 3+ players. Mutually exclusive with the 2-player "Pear of Fruits" duel — see §16C. |

(See §15 for the full breakdown of how these custom role mechanics execute, and §16B for the deterministic resolution order that keeps them balanced and loop-free.)

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What this game calls it |
|---|---|
| Round | The Fruit-Off |
| Match / Global Session | Game of Fruits |
| Score / points | Fruit Tokens |
| Private Hand | The Fruit Stash (cards are "Boxed") |
| Discard Pile / Penalty Pile | The Fruit Bowl (cards are "Unboxed") |
| Pass a card | The Serving |
| Game over screen | Orange You Glad It's Over? 🍊 |
| Play again | More Fruit |
| Quit | Vegetables Instead? |
| Settings overlay title | Fruit Selection |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | No. |
| **If yes — which categories?** | N/A |
| **If no — what kind of content does it need?** | A hardcoded array mapping the system config and metadata strings for the 8 distinct fruit types. |
| **Does it need a completely new data file?** | No. It will live directly as a constant definition inside `js/games/frt.js` to eliminate external fetch requests. |
| **Any words or topics that should be excluded?** | N/A |

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Each player own device, or teams share a device?** | Each player requires their own device to manage their private Fruit Stashes. |
| **Information that must stay private?** | Yes. A player's hand must be private. Additionally, the true card identity of an active pass is hidden behind client-side masks. (Couch-security model — see §16A.) |
| **Moments where players act simultaneously?** | No. It is entirely turn-based, flowing like a live wire from passer to recipient. |
| **Moments where one device should be locked while another is active?** | Yes. While a player is deliberating over an incoming card, all other player views scale into a "Spectator Mode" tracking overlay. |
| **Any roles or phases that don't work with multiple devices?** | None. This game is built specifically to thrive on individual networked screens. |

---

## 11. Screens — Plain English List (REQUIRED)

1. **Title Menu Screen (`screen-frt-menu`):** Vibrant banana yellow backdrop, a large bouncing "Smug Banana" graphic, rules overview layout, and the lobby initialization buttons.
2. **Lobby Setup:** uses the shared MDLM lobby screens (`screen-mp-mode` / `screen-mp-lobby-host` / `screen-mp-lobby-join`) — no game-specific lobby screen. Synchronized staging grid displaying all connected players as they join the room.
3. **The Dealing Animation Interstitial (`screen-frt-deal`):** Quick layout showing an empty fruit bowl being distributed as card elements slide face-down into the bottom of each user's interface.
4. **Active Table View (`screen-frt-table`):** Divided into three clear visual tiers:
   - **Top Grid:** Scaled icons of all opponents showing their face-up penalty piles ("Their Bowls").
   - **Middle Drop Zone:** The staging area where incoming passed cards land as large, pulsing alerts.
   - **Bottom Drawer:** A slide-out panel containing the player's own "Fruit Stash" cards.
5. **The Challenge Reveal:** an animated SYNC-driven state/overlay on `screen-frt-table` (not a separate registered screen). The card shakes, flips with a custom audio tone, and flashes red or green depending on who collects the failure penalty. "Spectator Mode" is likewise a standby sub-state of `screen-frt-table`, not a new screen (same pattern as NAT/DSD standby).
6. **Orange You Glad It's Over Dashboard (`screen-frt-gameover`):** Displays the final results, explicitly framing the eliminated loser with bruised art while calculating tokens for survivors.

---

## 12. Open Questions & Design Notes (REQUIRED)

**Unresolved design questions:**
- 🛑 **The Peek-and-Pass Lock Friction Point:** In physical Cockroach Poker, if a card is passed sequentially around the table until only one player remains who hasn't seen it yet, that final player cannot choose "Peek & Pass" because there is no legal target left. They are forced by the rules engine to call True or False. We need to ensure our client UI handles this by dynamically disabling the "Peek" button when legal pass targets hit 0.

**Things that might be complicated to implement (flag for Claude Code):**
- **Cost-Optimised Public Synchronization:** Because the true card values live inside the public room node to save on database operation costs, Claude Code must write clean, local variable encapsulation. NOTE (resolved §16A): this is the couch-security model — DOM/Firebase obfuscation is NOT a real anti-cheat measure; the limitation is accepted and documented.

**Things explicitly OUT OF SCOPE for v1 (save for later):**
- **Custom Character Assets:** For v1, the cards will exclusively use the native system fruit emojis inside clean CSS layouts. Custom character design illustrations are out of scope for the initial launch.

**General notes / Player Identity:**
- **Player Avatars vs Fruit Personalities:** We will stick to standard user names/avatars for players. Since the fruit personalities are tied directly to the cards themselves, giving players a permanent fruit identity would overcomplicate things and cause mechanical confusion during card declarations.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Cockroach Poker (Kakerlakenpoker). |
| **Tone** | Mind-bendingly tense, psychologically cutthroat, yet completely hilarious due to the absurd fruit labels. |
| **Should NOT feel like** | A traditional, boring card game or a dry, mathematical text puzzle. |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 Players (Mia, Sam, Leo, Ruby). The 64-card deck is fully distributed. All open fruit bowls are completely empty.

**Mia's Move:** Mia opens her hidden Fruit Stash and selects an Angry Apple. She selects Leo as the target, selects Smug Banana as her declaration, and executes The Serving.

**Leo's Interception:** Leo's screen flashes: "Mia served you a card and swears it's a Smug Banana."

**Leo's Action:** Leo doesn't want to gamble yet. He clicks Peek & Pass. The screen flashes a brief animation showing the card lifted, revealing to him alone that it is actually an Angry Apple.

**Leo's Redirect:** Leo looks around the room. He cannot send it back to Mia. He selects Ruby as the new target, modifies the declaration to Sour Lemon, and slides it along.

**Ruby's Stand:** Ruby sees the card arrive: "Leo says this is a Sour Lemon." Ruby looks across the room, catches Leo smiling, and hits "FALSE!"

**The Climax Reveal:** The database updates the shared network state. The card unboxes and flips simultaneously across all 4 screens, revealing the true Angry Apple card asset.

**Result:** Ruby was correct — it was not a Sour Lemon. Because Leo got caught in a lie, the card flies directly into Leo's open Fruit Bowl area. Leo now has 1 face-up Apple. He must now select a new card from his hidden stash to launch the next serving loop.

---

## 15. The Fruity Personalities Matrix (Sylly Mode Rules)

To ensure structural balance, abilities are cleanly categorised across distinct gameplay phases to avoid mechanical overlap. The deterministic resolution order and loop guards are specified in §16B.

### Category A: Resolution Triggers (fire instantly when the card is unboxed face-up)

**Smug Banana (The Main Character)**
- *Vibe:* Thinks it is inherently better than every other item in the kitchen.
- *Perk:* Triggered when the physical card is a Banana. If an opponent challenges your Serving involving a Banana card and guesses incorrectly, they take the card as normal, but you completely retain initiative and execute the very next Serving yourself.

**Sour Lemon (The Sore Loser)**
- *Vibe:* Constantly squinting with bitter, deep-seated resentment.
- *Perk:* Triggered when you lose a challenge involving a Lemon card (forcing you to add it to your bowl). Out of pure bitter spite, your challenger is instantly forced to select one random card from their own Fruit Stash to unbox face-up directly into their own Fruit Bowl.

**Charming Peach (The Honey Trap)**
- *Vibe:* Exudes irresistible allure, drawing others directly into its wake.
- *Perk:* Peaches attract other peaches. When a Peach card flips and lands face-up in a player's Fruit Bowl, the challenger who resolved that card must immediately check their own Fruit Stash. If they possess a Peach card, it is immediately charmed out of their hand and flips face-up into their own Fruit Bowl.

**Dramatic Grape (The Theatre Kid)**
- *Vibe:* Hand on forehead, swooning, interpreting every call as an existential crisis.
- *Perk:* Grapes refuse to be outshone. The exact second a Grape card flips face-up in any bowl, a mandatory hand check runs across the network: whichever player currently holds the highest number of hidden Grapes in their Fruit Stash must immediately unbox one face-up into their own Fruit Bowl (all tied players flip one if tied).

### Category B: Passive State Modifiers (alter structural deck rules continuously)

**Chill Watermelon (The Poker Face)**
- *Vibe:* Watermelons are far too big and heavy to completely hide under a kitchen table. They just sit out in the open.
- *Perk:* At all times, the engine displays a public counter next to every player's avatar showing exactly how many Watermelons are currently "chilling" hidden inside their private Fruit Stash.

### Category C: Interaction Modifiers (alter actions during the Serving or Peek phase)

**Sus Pear (The Shifty Operator)**
- *Vibe:* Eyes darting sideways; clearly running a secondary operation.
- *Perk:* Highly strategic routing override. When you are targeted with an incoming face-down Serving, if you choose to execute a Peek & Pass action and discover the card is a Sus Pear, you gain the ability to secretly pocket it into your own hand and swap it out with any card from your existing Fruit Stash before serving a card onward.

**Panicked Strawberry (The Tell)**
- *Vibe:* Sweating profusely, wide-eyed, clearly cannot handle high stakes.
- *Perk:* Instant anxiety check. Every single time a Strawberry card is selected from a hand and placed face-down to begin a new Serving (regardless of what name the player speaks aloud), a flat 25% host-rolled panic chance occurs. If it triggers, the card completely panics, breaks its cover, and auto-reveals itself face-up on the spot, landing as an immediate penalty in the sender's own Fruit Bowl before the receiver even gets a choice.

**Angry Apple (The Duelist)**
- *Vibe:* Furious, red-faced, and steaming at the sheer audacity of being passed.
- *Perk:* Rigid vendetta lock. The individual responsible for an Apple flipping face-up becomes a locked target. The loser of the Apple challenge must target the winner of that specific challenge with their very next initial Serving. Furthermore, the targeted recipient is completely blocked from using Peek & Pass — they are backed into a corner and forced to call True or False, continuing the duel until the tension resolves.

---

## 16. Review Resolutions & Handoff Notes (Claude Code, 2026-06-20)

This section captures the design decisions resolved during the Phase-1 review so the tech spec can be written without re-deriving them. Items marked **PROPOSED** still need the project owner's confirmation.

### A. Card privacy / anti-cheat model — RESOLVED: Couch security
The true identity of every card (hand + active pass) is broadcast in the public room node; each device renders only what that device is entitled to see (own stash; a passed card stays masked until that device peeks or a call resolves). This matches the established couch-security model (NAT, SS, BLD): sufficient for a same-room social game, but a determined player inspecting Firebase/DOM could read a card. This limitation is accepted and must be documented in the tech spec exactly as NAT/SS document theirs. Do NOT rely on DOM-string obfuscation as a security measure — it is not one. (Targeted per-device writes were considered and deferred; revisit only if cheating becomes a real problem.)

### B. Sylly Mode scope — RESOLVED: All 8 fruits ship in v1, governed by a strict deterministic resolution model

**Resolution order when a card is unboxed face-up into a bowl** (host-authoritative, runs exactly once per serving):
1. **PRIMARY FLIP:** the card that was challenged/revealed lands in the owning bowl. Apply that card's own Resolution Trigger (Banana initiative / Lemon spite / Peach charm / Grape check) EXACTLY ONCE.
2. **SECONDARY FLIPS:** any card forced into a bowl BY a trigger (Lemon's random card, Peach's charmed peach, Grape's forced grape, Strawberry auto-reveal) is INERT — it is collected silently and does NOT re-fire any Resolution Trigger. This is the loop guard; it makes cascades impossible.
3. **ELIMINATION CHECK** runs once, AFTER all triggers for this serving have resolved. If multiple players cross a threshold (4-of-a-fruit, or 0-stash) in the same serving, all of them are "Fruit Looped" (0 tokens) and the round ends.

**Per-fruit clarifications folded in:**
- **Panicked Strawberry:** "server-side roll" → host rolls a flat 25% chance when the strawberry is placed face-down to serve. Auto-reveal is a PRIMARY flip into the sender's bowl but Strawberry is an interaction modifier (Category C), so no Resolution Trigger fires from it.
- **Angry Apple vs Sus Pear conflict:** Apple's lock removes the Peek & Pass option entirely, so Sus Pear's peek-swap can never trigger on an Apple-locked turn. Apple lock wins by construction — no special-case code needed.
- **Apple vendetta** "until the tension resolves": define as a single forced next-Serving (lock clears after that one duel serving resolves), so the lock cannot stack indefinitely.
- **Smug Banana:** "retain initiative" overrides the default "challenge loser becomes active player" rule for that serving only.
- **Watermelon public counter** and **Grape "highest holder" check** both read hidden-stash counts — host computes and broadcasts; consistent with the couch-security model in (A).

### C. 2-player "Pear of Fruits" mode — RESOLVED 🥊

**The Lobby Guardrail (Sylly mutual-exclusion):** A 2-player game automatically forces Sylly Mode OFF and greys out its toggle with subtext ("Fruity Personalities require 3+ players"). Conversely, switching Sylly Mode ON raises the minimum player count to 3. This is the design's key simplification — we never have to define Angry Apple / Sus Pear / cascade behaviour in a two-player vacuum, eliminating that entire class of edge-case logic.

**Standard 1v1 Mechanical Framework** — a 2-player match alters three core structural rules:
1. **The Burn Pile (setup):** before dealing, the host burns 10 random cards out of the 64-card deck face-down, out of play. The remaining 54 are dealt evenly (27 each). This injects hidden variability so neither player can perfectly card-count the deck.
2. **The Direct Showdown (loop):** the Peek & Pass path is stripped out of `screen-frt-table` entirely. A received Serving offers only a direct fork — call True or False. No passing the buck. (This also moots the §12 dead-end concern in 1v1.)
3. **The 5-Card Flashpoint (loss):** because penalties accumulate faster in a direct duel, the same-fruit elimination threshold is lifted from 4 to **5** face-up cards of a single fruit.
4. **The Exhaustion Route (loss):** unchanged — starting a serving turn with 0 cards in hand instantly drops the round.

**Tech-spec alignment:**
- `getMinPlayers()` is a dynamic getter: returns 3 when Sylly Mode is ON, else 2.
- The rules-engine split is gated on a single state flag (e.g. `frtIsDuel` / `frtPlayerCount === 2`) — burn pile, no-peek fork, and 5-card threshold all branch on it. Scoring tiers and the multi-round handover (§16D) apply unchanged.
- **MDLM reconciliation note (confirm at Stage 2):** player count in MDLM is lobby-driven (number of joined devices), not a settings pill. So "Pear of Fruits" duel rules are best **auto-engaged when exactly 2 devices are present at game start**, with the Sylly toggle greyed in the settings overlay while the lobby holds 2 — rather than a manual on/off count selector. Net behaviour matches the owner's guardrail; only the trigger mechanism differs to fit the lobby model.

### D. Scoring clarifications (fold into tech spec §6)
- "Pristine Clean Escape" (+10) and "Survived the Salad" (+5) are MUTUALLY EXCLUSIVE — a clean survivor scores 10 instead of 5, never both.
- "The Silver Lining" (+2): metric = most correct True/False resolutions, counted PER SESSION (not per round). All players tied for the lead each receive +2.
- **Multi-round handover — RESOLVED:** each Fruit-Off deals a fresh deck (64 standard / 54 in duel mode). The player who was Fruit Looped in the previous round receives the initial serving token for the next round — handing the player who just took a beating immediate agency to set the opening trap (instant-revenge tempo).

### E. Brand colour
Custom hex `#FFD93B` with bespoke classes (`pill-active-frt`, `game-toggle-on-frt`, `frt-range`) — see §1. Avoids the BLD yellow-family collision.

### F. No word-bank difficulty setting
The standard new-game checklist mandates a themed difficulty setting tied to word-difficulty tiers. That requirement is N/A here — the game uses a fixed 8-fruit deck, not `words.json`. "Fruit Stock" (deck size) is the legitimate velocity dial. The Phase-Gate audit should not flag the absence.

### G. Full screen / overlay registry (to register in `allScreens[]` + `resetToLobby()`)
- **Screens:** `screen-frt-menu`, `screen-frt-deal`, `screen-frt-table`, `screen-frt-gameover`. (Shared MDLM: `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join`.) No name-entry setup screen (`rosterConfig` type `'none'` — names come from the lobby). No pass-gate (MDLM, own devices). Challenge Reveal + Spectator Mode are sub-states of `screen-frt-table`.
- **Overlays:** `frt-settings-overlay`, `frt-how-to-overlay` (z-90), `frt-quit-overlay` (z-80, "Vegetables Instead?"), `frt-new-game-overlay` (z-90, play-again "More Fruit?"), and `frt-tip-overlay` (z-90, shared contextual `[?]` — recommended given Sylly complexity: 8 fruit rules warrant inline tips).

### H. MP_GAME_CONFIGS
`multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`, `rosterConfig: { type: 'none' }`, `getMaxPlayers` → 8, `getMinPlayers` → 2 (if Pear-of-Fruits stays; otherwise 3). Confirm min once (C) is locked.
