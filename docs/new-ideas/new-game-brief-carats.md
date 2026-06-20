# New Game Brief — Carats
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** This is a faithful adaptation of **Love Letter** (the 21-card edition) re-skinned to recognisable real-world gemstones — *The Master Jeweller's Exhibition*. Because it's a clone of a finished, elegant game, the **core loop, card roster, and win condition are fully resolved**. The design work is the re-skin, the suite-fit (mobile / multiplayer / thematic vocab / Sylly Mode), and a handful of edge-case confirmations flagged in §12. No design BLOCKERs.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Carats** *(alternatives considered: "Flawless", "Showpiece", "The Exhibition")* |
| **Short nickname / abbreviation** | `crt` (carat → crt; confirmed not in taken list. Deliberately **not** `gem` — too close to `gm`/Great Minds for grep + readability; see §12) |
| **One-sentence tagline** | "The flawless one wins. Don't get exposed." |
| **Thematic universe** | **The Master Jeweller's Exhibition.** You're a master lapidary (gem cutter) showing your finest stone in a velvet display case. The numbers are carat weight and rarity — a Pink Diamond outshines a Clear Quartz, and everyone knows it on sight. You read your rivals, expose their lesser stones, and protect your own until the vault locks. |
| **Emoji / icon** | 💎 |
| **Brand colour preference** | Deep emerald green with gold accents (luxe jeweller). *(Likely needs a custom `pill-active-crt`. Flag for the audit: confirm emerald reads as distinct from NAT's `lime-600`.)* |

**Source & adaptation note:** This is *Love Letter* — hold one card, draw one, play one, pass. The thematic driver that makes the gem re-skin click: instead of delivering a letter up a social hierarchy, you're trying to have the **single most flawless, highest-carat stone on display when the vault door locks** (the deck runs out), while using lesser stones to disrupt your rivals' appraisals. Zero jargon to learn — the artwork of a massive Blue Sapphire vs a tiny Clear Quartz teaches the power dynamic instantly.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **2–6** *(hard ceiling: the 21-card deck only stretches to 6. 2-player needs Love Letter's special "three face-up" variant — see §12; recommend OUT for v1.)* |
| **Teams or individuals?** | Individuals — everyone for themselves |
| **Are there different roles?** | No persistent roles — everyone is a Jeweller with the same job. The only varying state is **in the Showing** vs **Exposed** (knocked out for the current round, returns next Showing). |
| **Is any information hidden from some players?** | Yes — your single hand card (**Your Showpiece**) is secret. Some effects reveal hidden info privately (Amethyst peek) or to the table (Opal duel). The **Locked Lot** (burned card) is hidden from everyone, which is what stops perfect card-counting. |
| **Minimum meaningful player count** | 3 (recommended floor for v1). Sweet spot **4**. |

### Roles (if applicable)
No hidden/asymmetric roles. *(This is the cleanest possible §2 — Carats is a symmetric deduction game, not a social-deception game with secret roles.)*

**Notes:** "Exposed" (knocked out) is a temporary per-round state, not a role — exposed players sit out the rest of the current Showing and return for the next one. Contrast with Counting Sheep's Sleepwalkers, who are permanent: here, knockout is round-only.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Draw a second gem from the Vault so you're holding two, then choose one to place face-up and resolve its effect — keeping the other as your secret Showpiece.

**What is the central tension or fun moment?**
The signature Love Letter dilemmas, gem-flavoured:
- You hold the **Pink Diamond (9)** — unbeatable in a duel, but if anyone hits you with a **Yellow Topaz (5)** you're forced to discard it and you're instantly out.
- You're forced to play the **Blood Ruby (8)** early (because you also drew the Sapphire) — now the whole table assumes you're sitting on something huge, and the next **Clear Quartz** guess is coming straight for you.
- You played an **Amethyst** last turn and *know* the player to your left is holding the Diamond — do you Topaz it out of their hands now, or wait?

**What type of game is this closest to?**
☑ Deduction / bluffing / social deception *(specifically: micro-deduction + risk — 5-minute high-tension rounds)*

**Walk through one complete round (a Showing) step by step:**

1. Shuffle the Vault (the 21-gem deck). Remove the top gem face-down — the **Locked Lot** — so nobody can perfectly count what's left.
2. Deal one gem face-down to each player. That's their starting Showpiece.
3. On your turn: draw one gem from the Vault (you now hold two), then play one face-up and resolve its effect. You end your turn holding exactly one.
4. Effects let you peek at, compare with, force-discard, trade with, or guess against other players. Getting **Exposed** (by a correct Quartz guess, losing an Opal duel, or being forced to discard the Pink Diamond) knocks you out for the rest of this Showing.
5. Play passes clockwise, skipping Exposed players.
6. **The Showing ends one of two ways:**
   - **Last one standing** — everyone else is Exposed → the survivor wins the Showing.
   - **Vault Lock** — the Vault runs dry → all surviving players reveal their Showpiece; **highest carat wins** the Showing.
7. The winner earns one **Cut Diamond 💎** (a token). First player to the target number of Cut Diamonds wins the whole game (**Best in Show**).

**Is there anything players do simultaneously, or is everything sequential?**
Fully sequential — one player acts at a time. No simultaneous input anywhere. *(This is the cleanest possible multiplayer profile — see §10.)*

**How does the phone physically move between players?**
Each player has their own device (multiplayer-first). Hands stay secret for an entire Showing, so passing one phone around is awkward — individual devices are strongly recommended (see §10).

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When one player reaches the target number of Cut Diamonds (set by the "Diamonds to Win" setting). |
| **How is the winner determined?** | First to the target Cut Diamond count is **Best in Show** and wins the whole game. |
| **Are ties possible?** | Within a Showing: a **Vault Lock** tie (two survivors holding equal carat) is broken by the **sum of each player's exposed/discarded gems** that round — higher sum wins. *(Classic Love Letter tie-break.)* For the overall game, the token race makes a final tie effectively impossible. |
| **Roughly how long should a full game take?** | ~5 minutes per Showing; a full game of ~15–25 minutes depending on the Diamonds-to-Win setting and player count. |

---

## 5. Scoring (REQUIRED)

Tokens are **Cut Diamonds 💎**. There is no points subtraction — you either earn a Cut Diamond or you don't.

| What happened | Who gets it | How many | Notes |
|--------------|------------|----------|-------|
| Win a Showing by being the **last one standing** | The survivor | +1 Cut Diamond | All others got Exposed |
| Win a Showing by **Vault Lock** (highest carat at deck-out) | The highest-carat survivor | +1 Cut Diamond | Tie → highest sum of discarded gems |
| **Raw Obsidian (0) bonus** | A surviving player who played their Obsidian | +1 bonus Cut Diamond | Only if they're the sole player who played an Obsidian and survived to round-end *(classic Spy bonus — exact condition flagged in §12)* |

**Does scoring feel balanced?**
Yes — this is a 30-year-refined design. The 6× Clear Quartz vs the singleton high gems creates the deduction backbone; the Topaz-forces-Diamond-discard line is the high-skill kill; the Obsidian bonus rewards a gutsy low play. Nothing to rebalance — the job is faithful reproduction, not redesign.

**Any outcomes where nobody scores?**
No — every Showing produces exactly one Showing-winner (last-standing or Vault Lock), so a Cut Diamond is always awarded. The Obsidian bonus is the only conditional extra.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Appraiser's Ledger** *(the difficulty/accessibility dial — sits first)* | ON shows a running list of every gem already Exposed this Showing (the app counts for you — easier deduction). OFF hides it (pure memory — the purist, harder mode). | ON / OFF | **ON** |
| **Diamonds to Win** | How many Cut Diamonds win the whole game (game length). | 3 / 4 / 5 | **4** |
| **Appraisal Clock** *(optional turn timer)* | A per-turn countdown to keep things snappy. | OFF / 30s / 60s | **OFF** |
| **✨ Sylly Mode (Smoke & Mirrors)** | See §7. | OFF / ON | OFF |

**Player count** is set on the setup screen / from the lobby roster (3–6), **not** in the settings overlay — consistent with the suite pattern (NAT, DSD, LTTP).

**Are there any settings that should be locked or hidden in certain situations?**
- *(Possible)* auto-scale "Diamonds to Win" by player count instead of a fixed dial (classic Love Letter uses 7/5/4 tokens for 2/3/4 players). Flagged in §12 — the simple dial is the v1 assumption.

---

## 7. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **Smoke & Mirrors 🪞** |
| **In one sentence — what changes?** | Instead of one Locked Lot, **three gems** are removed face-down at the start of each Showing — so the table can no longer reliably deduce what's left, every Quartz guess and Opal duel becomes a far riskier read, and rounds run shorter and swingier. |
| **Does it add new screens or phases?** | No — it changes a single setup number (how many gems are burned). No new effects, no new screens. |
| **Does it change scoring?** | No. |
| **Does it change the win condition?** | No. |

*Why this Sylly:* it's the lowest-risk way to make an elegant, fragile game "harder/weirder" without touching the card balance — it purely amplifies deduction difficulty. A richer alternative to consider **later** (not v1): a **Counterfeit** gem shuffled into the Vault that scores 0 at Vault Lock but can be played as a bluffed copy of any gem's effect. Noted for the post-core pass; not part of this brief.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Carats calls it |
|---|---|
| Round (one hand) | **Showing** |
| Score / points (tokens) | **Cut Diamonds 💎** |
| Your hand card | **Your Showpiece** |
| The draw deck | **The Vault** |
| The burned/removed card | **The Locked Lot** |
| Knocked out | **Exposed** (out of the Showing) |
| Deck runs out → reveal highest | **Vault Lock** |
| Immunity (Imperial Jade) | **Under Glass** |
| Game over screen | **Best in Show 🏆** |
| Play again | **Another Showing?** |
| Quit | **Pack Up Your Case?** |
| Settings overlay title | **The Display Case 💎** ("Set the scene before the first Showing.") |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | No. |
| **If no — what content does it need?** | A small **fixed deck definition**: the 10 gem types, each with a carat value (0–9), a quantity, an effect, and display info (name, emoji/colour). 21 cards total. This is a fixed constant, not user content — closest analogue is FRT's `FRT_FRUITS`. Likely a `CRT_DECK` constant in the plugin rather than a `data/crt-data.json` file. |
| **Does it need a completely new data file?** | Probably not — a code constant suffices. Claude Code to confirm in the tech spec; only worth a data file if the deck is meant to be host-editable later. |
| **Any words/topics to exclude?** | N/A — no words. |

**The deck — the 10 gems (faithful Love Letter 21-card mapping):**

| Carat | Gem | Qty | Effect |
|------|-----|-----|--------|
| **9** | **Pink Diamond** | 1 | No active effect — but if you're ever **forced to discard it**, you're instantly **Exposed**. The crown jewel: flawless, but fragile. |
| **8** | **Blood Ruby** | 1 | No active effect — **but** if you hold it alongside the **Blue Sapphire (7)** or **Yellow Topaz (5)**, you **must** play the Ruby. Too conspicuous to keep. |
| **7** | **Blue Sapphire** | 1 | **The Trade** — swap Showpieces with another player. |
| **6** | **Green Emerald** | 2 | **The Deep Vault** — draw 2 from the Vault, keep the best of your 3, return the other 2 to the **bottom** of the deck. |
| **5** | **Yellow Topaz** | 2 | **The Recut** — choose any player (including yourself); they discard their Showpiece and draw a fresh one. *(Forcing a Pink Diamond discard this way knocks that player out.)* |
| **4** | **Imperial Jade** | 2 | **Under Glass** — you can't be targeted by any effect until your next turn. |
| **3** | **Black Opal** | 2 | **The Private Appraisal** — secretly compare Showpieces with a chosen player; the lower carat is **Exposed**. |
| **2** | **Purple Amethyst** | 2 | **The Loupe** — secretly look at another player's Showpiece. |
| **1** | **Clear Quartz** | 6 | **The Scratch Test** — name a player and guess their gem (cannot guess Quartz); if correct, they're **Exposed**. |
| **0** | **Raw Obsidian** | 2 | Worthless at Vault Lock — but if you played it and survive the Showing as the sole Obsidian-player, you earn a **+1 bonus Cut Diamond**. |

Total: 21 gems (1+1+1+2+2+2+2+2+6+2).

**One example entry in plain English:** *Clear Quartz — carat value 1, six copies in the Vault. When played, the holder points at one rival and names a specific gem (anything but Quartz). If that rival is holding exactly that gem, they're Exposed and out of the Showing. The common filler stone, but lethal when you've read the table right.*

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | Each player has their **own device** (MDLM). Recommended as the only mode for v1 — the persistent secret hand makes pass-the-phone awkward. |
| **Any information private to one device?** | Yes, heavily — every player's Showpiece is private, and several effects deliver private info (Amethyst peek shows a gem to **one** player only). |
| **Do players ever act simultaneously?** | No — strictly one player at a time. The whole game is sequential. |
| **Is one device ever locked while another is active?** | Yes — only the active player's device can act; everyone else (including Exposed players) is on a spectator/standby view until their turn or the next Showing. |
| **Anything that doesn't work with multiple devices?** | Nothing breaks. Pass-the-phone is the awkward case (hidden persistent hands); MDLM is the natural fit. |

**Security model:** Carats leans on hidden information more than most suite games, but the established suite stance for same-room couch play is **couch security** — role/hand data is broadcast and each device renders only what its player is entitled to see (as NAT, SS, BLD, FRT all do). That's the v1 assumption. For genuine cryptographic separation, **targeted Firebase writes per player** would be required (the Amethyst peek is the sharpest case — it should write only to the looking player's node). Flagged in §12.

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — players join via room code; names from the lobby roster (3–6 players).
3. **The Exhibition (main table)** — your Showpiece, the Vault count, the Exposed-gems area (the Appraiser's Ledger), each player's status (in the Showing / Exposed / Under Glass), and whose turn it is. Carries the sub-states: *your turn (draw + choose which of two gems to play)*, *waiting*, and *Exposed/spectating*.
4. **Targeting overlay** — choose which player an effect hits (Sapphire trade, Topaz recut, Opal duel, Amethyst loupe, Quartz scratch-test).
5. **Scratch-Test overlay (Quartz)** — pick a target **and** name a gem to guess.
6. **Loupe result (Amethyst)** — a **private** reveal of one player's Showpiece, shown only to the player who looked.
7. **Private Appraisal result (Opal)** — reveal both duelling Showpieces; the lower carat is Exposed.
8. **Showing result** — who won the Cut Diamond this round (last-standing or Vault Lock reveal).
9. **Best in Show (game over)** — first to the target Cut Diamonds, final standings, Another Showing? / exit.

*Standard overlays alongside these:* settings (The Display Case 💎), how-to, quit (Pack Up Your Case?), play-again (Another Showing?).

---

## 12. Open Questions & Design Notes (REQUIRED)

**Unresolved design questions (mostly confirmations — none block the tech spec):**
- **Diamonds to Win** — fixed dial (3/4/5, this brief's assumption) vs auto-scaling by player count like classic Love Letter (7/5/4 for 2/3/4 players)? *(NON-BLOCKER.)*
- **2-player support** — needs Love Letter's special "deal three gems face-up beside the Vault" variant. Recommend **OUT for v1** (min 3). Confirm. *(NON-BLOCKER.)*
- **Abbreviation** — `crt` proposed to avoid `gem`↔`gm` (Great Minds) adjacency. Confirm `crt` in the Consistency Audit. *(NON-BLOCKER.)*

**Things that might be complicated to implement (flag for Claude Code):**
- **Blood Ruby forced-play rule** — when a player holds Blood Ruby (8) together with Sapphire (7) or Topaz (5), they MUST play the Ruby. The app should **enforce** this automatically (a clean digital advantage over the physical game). Confirm enforcement vs. advisory.
- **Green Emerald → bottom-of-deck ordering** — the two returned gems go to the **bottom** of the Vault, in order. This matters for card-counting / Vault Lock; the deck model must preserve bottom-insertion, not reshuffle.
- **Yellow Topaz on an empty Vault** — if the forced-discard target must draw but the Vault is empty, they draw the **Locked Lot** (the burned card), per Love Letter. Edge case — confirm handling.
- **Topaz self-targeting** — a player may target **themselves** with the Recut (e.g. to dump a dangerous gem). Confirm allowed.
- **Clear Quartz guess constraints** — cannot name "Clear Quartz"; must target a non-immune, in-the-Showing player. Confirm the guess UI excludes Quartz and Under-Glass/Exposed targets.
- **"All other players immune/Exposed" edge** — if every legal target is Under Glass or Exposed, a targeted card must either fizzle or be played on self where the rules allow. Confirm the fizzle/forced-self logic per card (this is the standard Love Letter edge).
- **Amethyst (Loupe) privacy** — the sharpest couch-security case: the peeked gem should ideally be a **targeted write to the looking player's device only**, not a broadcast everyone could inspect. Flag for the multiplayer spec.
- **Appraiser's Ledger scope** — confirm it lists only **publicly Exposed/discarded** gems, never hidden Showpieces.
- **Raw Obsidian bonus condition** — confirm exact trigger: a player earns the +1 only if they **played an Obsidian** and are the **sole such player** still in / winning at round-end (classic Spy rule).

**Things explicitly OUT OF SCOPE for v1 (save for later):**
- 2-player "three face-up" variant.
- Pass-the-phone mode (MDLM-only recommended for v1).
- The **Counterfeit gem** richer-Sylly idea (§7) — revisit after core.

**General notes / anything else:**
- This is a **faithful clone** — resist the urge to "improve" the card effects. The 21-card balance is the appeal. All creative latitude is in the re-skin (names, art, vocab, the Smoke & Mirrors Sylly), not the mechanics.
- The three alternative themes explored in brainstorming (The Vault / black-market thieves; The Magecraft Catalyst / arcane) were set aside in favour of **recognisable real-world gemstones** specifically for zero-jargon approachability. If the owner ever wants a re-skin toggle, those mappings exist — but that's well out of v1 scope.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Love Letter (direct re-skin of the 21-card edition). Spiritually adjacent: Coup, any quick micro-deduction filler. |
| **Tone** | Luxe, tense, quick. Velvet-and-gold elegance over a sharp, bluff-heavy, read-the-table knife fight. Five-minute high-stakes rounds. |
| **Should NOT feel like** | A heavy strategy game or a rules-lookup slog. The whole point is "look at the gem, instantly understand the power." Keep it fast and legible. |
| **Example phrases / copy already written** | "The flawless one wins. Don't get exposed." · gem names: Pink Diamond, Blood Ruby, Blue Sapphire, Green Emerald, Yellow Topaz, Imperial Jade, Black Opal, Purple Amethyst, Clear Quartz, Raw Obsidian · effect names: The Trade, The Deep Vault, The Recut, Under Glass, The Private Appraisal, The Loupe, The Scratch Test. |

---

## 14. Sample Round (REQUIRED)

**Setup:** 3 players — **Ada, Boris, Chloe**. Appraiser's Ledger ON, Diamonds to Win 4, Smoke & Mirrors OFF. One **Locked Lot** is removed face-down (nobody sees it). Each player is dealt one secret Showpiece. Turn order Ada → Boris → Chloe.

*Secret starting Showpieces (shown here for clarity — invisible to the other players):*
**Ada:** Clear Quartz (1) · **Boris:** Yellow Topaz (5) · **Chloe:** Pink Diamond (9)

1. **Ada** draws a **Purple Amethyst (2)** — she now holds Quartz + Amethyst. She plays **Amethyst (The Loupe)** on Chloe. Her device privately shows her that Chloe is holding the **Pink Diamond (9)**. Nobody else sees this. Ada keeps her Quartz.

2. **Boris** draws an **Imperial Jade (4)** — he holds Topaz + Jade. With no strong read yet, he plays **Jade (Under Glass)** to make himself untargetable until his next turn. He keeps his Topaz.

3. **Chloe** draws a **Black Opal (3)** — she holds Pink Diamond (9) + Opal. She can't risk ever discarding the Diamond, so she plays **Opal (The Private Appraisal)**. Boris is Under Glass, so she must target **Ada**. They secretly compare: Ada's Quartz (1) vs Chloe's Diamond (9) → **Ada is Exposed** and out of the Showing. Chloe keeps her Diamond.

4. **Boris** (his Under Glass has now lapsed — it was "until your next turn") draws a **Clear Quartz (1)** — he holds Topaz + Quartz. Chloe just played aggressively and is clearly protecting something big. Boris plays **Topaz (The Recut)** on **Chloe**: she must discard her Showpiece and draw fresh. Chloe is forced to discard the **Pink Diamond** — and discarding the Diamond means she's **instantly Exposed!**

**Result:** Everyone but **Boris** is Exposed → Boris wins the Showing and earns his **1st Cut Diamond 💎**. The Topaz-forces-Diamond line — the signature Love Letter kill — closed it out. (Diamonds to Win is 4, so Boris needs 3 more. A new Showing begins.)

---

## Open Questions

1. **[NON-BLOCKER]** "Diamonds to Win": fixed 3/4/5 dial (assumed) vs auto-scale by player count (classic 7/5/4)?
2. **[NON-BLOCKER]** Confirm 2-player variant is OUT for v1 (min 3 players).
3. **[NON-BLOCKER]** Confirm abbreviation `crt` (chosen over `gem` to avoid `gm` adjacency) in the Consistency Audit.
4. **[NON-BLOCKER]** Confirm the app **enforces** the Blood Ruby forced-play rule automatically.
5. **[NON-BLOCKER]** Confirm Green Emerald returns gems to the **bottom** of the Vault (ordering preserved, no reshuffle).
6. **[NON-BLOCKER]** Confirm Yellow Topaz on an empty Vault draws the **Locked Lot**, and that Topaz self-targeting is allowed.
7. **[NON-BLOCKER]** Confirm the Amethyst (Loupe) peek is a **targeted write** to the looking player's device, not a table-wide broadcast.
8. **[NON-BLOCKER]** Confirm the Raw Obsidian bonus condition (sole player who played it + survived).

*No BLOCKERs. The core loop, full 21-gem roster, scoring, win condition, settings, Sylly Mode, and multiplayer profile are all resolved — every open item is an edge-case confirmation Claude Code can carry into the technical spec.*
