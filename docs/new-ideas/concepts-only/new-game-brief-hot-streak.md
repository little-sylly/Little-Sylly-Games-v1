# New Game Brief — Hot Streak
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** Adaptation of **Cee-lo / 4-5-6 / Chinchirorin** (the three-dice banking game), faithfully reproduced and simplified for clean teachability. Presentation is deliberately **minimal** — no fiction, just dice with a "hot/cold streak" identity carried through gambling-table vernacular. **All design calls are now made and baked in** (see the Decisions Log in §12). The only items left genuinely open are the final **Sylly Mode** pick (a short candidate list, to be chosen after the core is confirmed in play) and a handful of **playtest tuning values**. Review-ready.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Hot Streak** |
| **Short nickname / abbreviation** | `hot` (confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt. A numeric like `456` was rejected — code prefixes can't start with a digit.) |
| **One-sentence tagline** | "Three dice, one hot hand — don't cool off." |
| **Thematic universe** | None — and that's the point. A clean, glowing dice game whose only "theme" is *temperature*: dice on a winning streak glow molten; cold dice ice over. The pure press-your-luck mechanic carries the game; gambling vernacular (Chips, the Hot Seat, the Mark, hot, cold) does the thematic-vocab job without bolting on a fiction. |
| **Emoji / icon** | 🔥 *(alt: 🎲)* |
| **Brand colour preference** | Molten ember orange-red (the "hot" end), cooling toward icy blue for cold streaks. Needs a custom `pill-active-hot` (flag for the audit). |

**Why "clean" instead of a theme:** for a pure-luck press-your-luck game, a heavy narrative pulls attention away from the only thing that matters — the risk decision in front of you. The suite's two hard rules (thematic vocab; a Sylly Mode) are satisfied **for free** by gambling-table vernacular and a heat-meter identity, so "clean" here means **vernacular-clean, not abstract**.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **2–8** |
| **Teams or individuals?** | Individuals |
| **Are there different roles?** | One rotating role per round: **The Hot Seat** (the banker — sets the mark, and the whole field bets against them). Everyone else is a challenger that round. The role rotates constantly. |
| **Is any information hidden from some players?** | **No** — every roll is public. The only momentary private beat is a player's press-your-luck decision (lock or re-roll), and even that is shown openly. This is the **simplest multiplayer profile in the suite** — no hidden hands at all. |
| **Minimum meaningful player count** | 2 (heads-up works). Sweet spot **4–6**. |

### Roles (if applicable)

| Role name | What they know | What they do | Their goal | Restrictions |
|-----------|---------------|--------------|------------|--------------|
| The Hot Seat (banker) | Public dice only | Rolls first to set **the Mark**; then pays/collects against every challenger | Win Chips from the field; hold the seat | Must roll first; defends the seat for up to 2 Rolls (see §3) |
| Challenger (everyone else) | Public dice only | Rolls to beat the Mark | Beat the Mark, win Chips, and steal the Hot Seat | — |

**Notes:** No hidden roles, no secret information — the asymmetry is purely positional (who's in the Hot Seat this Roll) and rotates constantly.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Roll three dice — up to three times — trying to lock a winning combo or a high enough pair to beat the Mark before you cool off, deciding after each throw whether to bank a weak result or gamble on a re-roll.

**What is the central tension or fun moment?**
The re-roll gamble. You've got a pair of 6s and a 2 — a weak Heat of 2. Do you keep it, or re-roll all three hoping for better and risk **Ice Cold (1-2-3)** or running out of throws and **cooling off**? That decision, round after round, plus the scramble to **steal the Hot Seat**, is the whole game.

**What type of game is this closest to?**
☑ Something else: **press-your-luck dice gambling** (banker-vs-field). No content, no deduction — pure nerve.

**The roll hierarchy (what each result means) — DECIDED:**

| Roll | Result | Hot Streak name |
|------|--------|-----------------|
| **4-5-6** | Instant win — beats everything | **Red Hot** |
| **Triple** (X-X-X) | Instant win; a higher triple beats a lower one | **Trips** |
| **Pair + odd die** | The odd die (1–6) is your score; higher wins | **Your Heat** (the point) |
| **1-2-3** | Instant loss | **Ice Cold** |
| **Three different dice** (not 4-5-6 / 1-2-3) | Dead roll — doesn't count, must re-roll | — |
| **No scoring result in 3 throws** | Bust / no score (loses to the bank) | **Cooled Off** |

The full ladder, high to low: **Red Hot > Trips (ranked by value) > Heat 6 > Heat 5 > … > Heat 1 > Ice Cold.** The odd die runs the full **1–6** as your Heat — a pair-with-6 is the best point, a pair-with-1 the worst. This is a deliberate simplification of canonical Cee-lo (which auto-wins on a 6-high pair and auto-loses on a 1-low pair); the monotonic ladder is far easier to teach, and the canonical version is parked as a possible Sylly wrinkle. All triples are wins ranked low-to-high — triple-1 is simply the lowest triple, **not** an "acey-out" auto-loss.

**Walk through one complete Roll (round), step by step:**

1. The field each ante one Chip against the Hot Seat.
2. **The Hot Seat rolls first** to set the Mark. Red Hot or Trips → they instantly sweep the field's antes. Ice Cold or Cooled Off → they pay every challenger. A pair → that's the Mark (a Heat of 1–6) everyone must beat.
3. Each challenger, in turn, rolls. **Red Hot / Trips / Ice Cold resolve instantly.** A **pair sets their Heat — and the player then chooses to lock it or re-roll**, up to a three-throw limit. Dead rolls force a re-roll.
4. Beat the Mark → the Hot Seat pays them (matched ante). Below the Mark or Cooled Off → they pay the Hot Seat. **Equal to the Mark → a Wash** (no Chips move).
5. **The Hot Seat steals/holds:** the first challenger to go Red Hot or Trips **steals the Hot Seat** for the next Roll. If nobody steals, the Hot Seat holds — but only for up to **two Rolls**, after which it passes left. If the Hot Seat themselves goes Ice Cold / Cooled Off on their setting roll, the seat passes left immediately.
6. The heat meter tracks consecutive wins — a player stringing wins together is **on a Streak**.

**Simultaneous or sequential?**
Sequential — the Hot Seat rolls, then challengers roll one at a time against the Mark. One-at-a-time is more dramatic than simultaneous rolling.

**How does the phone move between players?**
Either way — see §10. Uniquely in the suite, Hot Streak works cleanly as **one shared device passed around the table** (everyone watches each roll) *or* as individual devices. No hidden information means pass-the-phone is a first-class option here, not a clunky fallback. **Both modes are in scope for v1.**

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | At **Last Call** — after a set number of Rolls (the default Finish; alternatives in §6). |
| **How is the winner determined?** | Most Chips at Last Call wins. |
| **Are ties possible?** | A round tie (equal Heat to the Mark) is a **Wash** — no Chips move. An end-game Chip tie is broken by **longest Streak** achieved during the game; if still tied, a single sudden-death roll-off. |
| **Roughly how long should a full game take?** | ~10–20 minutes depending on the Finish setting and player count. |

---

## 5. Scoring (REQUIRED)

The currency is **Chips 🔵**. Everyone starts with an equal stack (**20 Chips**).

| What happened | Who gains / loses | How much | Notes |
|--------------|-------------------|----------|-------|
| Hot Seat rolls **Red Hot / Trips** | Hot Seat collects every challenger's ante | +1 Chip per challenger (×multiplier if set) | The bank sweeps |
| Hot Seat rolls **Ice Cold / Cooled Off** | Hot Seat pays every challenger | −1 Chip per challenger | The field breaks the bank |
| Challenger **beats the Mark** | Hot Seat pays that challenger | +1 Chip to challenger | Red Hot/Trips also steal the seat |
| Challenger is **below the Mark / Cooled Off** | That challenger pays the Hot Seat | −1 Chip | — |
| Challenger **ties the Mark** | Nobody | 0 — a **Wash** | Ante returned |
| **Heat Level multipliers** (Blazing setting) | Winner of a Red Hot / Trips | ×2 for Red Hot, ×3 for Trips | Adds swing |

**Does scoring feel balanced?**
The banker holds the known statistical edge (auto-wins on Red Hot/Trips), which is exactly why the Hot Seat rotates and can be forcibly stolen — the edge is shared around the table over a game. Faithful to the source; nothing to redesign.

**Any outcomes where nobody scores?**
A **Wash** (tied Heat) moves no Chips. Otherwise every challenge resolves into a Chip movement.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Heat Level** *(the variance/challenge dial — sits first)* | How swingy the Chips are. Cool = flat payouts; Warm = Red Hot pays ×2; Blazing = full multipliers (Red Hot ×2, Trips ×3). | Cool / Warm / Blazing | **Warm** |
| **The Finish** | How the game ends. *Last Call* = most Chips after a set number of Rolls (~12, scaling a little with player count). *Cash Out* = first to a Chip target. *Cleaned Out* = last player with Chips (elimination — the tensest). | Last Call / Cash Out / Cleaned Out | **Last Call** |
| **Side Bets** | Flat 1-Chip ante (fast, simple) vs letting challengers choose their bet each Roll, up to the Hot Seat's stake. | Off / On | **Off** |
| **✨ Sylly Mode** | Not yet finalised — candidate list in §7. | OFF / ON | OFF |

**Player count** (2–8) is set on the setup screen / from the lobby roster, not in the settings overlay.

**Locked/hidden settings:** Side Bets On is more meaningful at 4+ players but is fine to leave available everywhere.

---

## 7. Sylly Mode (if applicable)

**Not finalised — candidate list below; final pick deferred until the core loop is confirmed in play** (consistent with how Counting Sheep's Sylly was handled). The settings overlay reserves the last slot for it.

Each candidate **adds to the dice/streak core rather than replacing it**:

| Candidate | What it adds | Why it fits |
|-----------|-------------|-------------|
| **Overheat 🔥** *(provisional lead)* | Consecutive wins build a personal Heat meter; at max heat your payouts multiply — but you must take one extra, mandatory re-roll on your next turn (greater reward, greater exposure). | The most on-identity option — it literally makes "hot streak" a mechanic, escalating both reward and risk for whoever's running hot. |
| **Double or Nothing 🎰** | After winning a Roll, you may gamble your winnings on one extra throw: Red Hot doubles them, Ice Cold loses the lot. | A second press-your-luck layer bolted onto the payout — pure extension of the core nerve. |
| **The Wildcard Die ⚡** | One of the three dice carries a ⚡ face; rolling it lets you set that die to any value — once per turn. | Adds a per-roll decision and variance without touching the structure. |
| **Cold Snap ❄️** | Each Roll you go without winning deepens your "cold"; rolling Ice Cold while frozen costs double, but any win instantly thaws you. | Mirrors the hot-streak reward with a cold-streak penalty — adds tension and a gentle catch-up pull for trailing players. |

**Recommendation:** **Overheat** — it's the truest expression of the game's identity. None of these changes the win condition or adds screens beyond a meter/animation.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Hot Streak calls it |
|---|---|
| Round | **Roll** (one go-around: the Hot Seat sets the Mark, the field challenges) |
| Score / points (currency) | **Chips 🔵** |
| The banker role | **The Hot Seat** |
| The benchmark to beat | **The Mark** |
| Your pair's odd-die value | **Your Heat** |
| Instant win (4-5-6) | **Red Hot** |
| Instant win (triples) | **Trips** |
| Instant loss (1-2-3) | **Ice Cold** |
| Failing to score in 3 throws | **Cooled Off** |
| Tie / push | **a Wash** |
| A run of consecutive wins | **a Streak** |
| Game over screen | **Last Call 🔔** |
| Play again | **Reload?** |
| Quit | **Cash Out?** |
| Settings overlay title | **The Table Rules 🎲** |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | No. |
| **If no — what content does it need?** | **None.** No words, no cards, no data file — just dice logic and Chip arithmetic. The lightest content footprint in the suite. |
| **Does it need a completely new data file?** | No. |
| **Any words/topics to exclude?** | N/A. |

**Note:** the only "content" is the roll-resolution logic and the payout table, both of which live in code. The single technical must-have is a **fair, unbiased random number generator** for the dice.

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | **Both — in scope for v1.** With no hidden information, one shared device passed around the table is a first-class mode (everyone watches the roll) *and* individual devices work (each rolls on their own, results broadcast). |
| **Any information private to one device?** | No. |
| **Are there moments players act simultaneously?** | No — sequential rolling (Hot Seat, then each challenger). |
| **Is one device locked while another is active?** | In individual-device mode, yes — only the active roller can roll; others watch. |
| **Anything that doesn't work with multiple devices?** | Nothing. |

**This is the suite's lightest multiplayer build** — no targeted writes, no couch-security concerns, no hidden-hand rendering. Just broadcasting roll results and Chip state to a shared view. **Pass-the-phone is the primary mode** (warm, classic, around-the-table) with individual devices as a clean secondary; both ship in v1.

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — player names (2–8), pick pass-the-phone vs individual devices.
3. **The Table (main)** — the central bowl + three dice, the Mark display, the heat meter, the Hot Seat indicator, every player's Chip stack, and whose turn it is. Carries the roll sub-states.
4. **Roll / decision** — the active roller's view: the roll button, the throw counter (3 max), and after a pair the **Lock it / Re-roll** press-your-luck choice.
5. **Roll resolution** — the Red Hot / Trips / Ice Cold / Heat-set moment, with the heat meter's reaction.
6. **Roll settle** — Chips move (Hot Seat collects or pays), and the steal/hold status of the Hot Seat.
7. **Last Call (game over)** — final Chip standings, the longest-Streak callout, Reload? / exit.

*Standard overlays:* settings (The Table Rules 🎲), how-to, quit (Cash Out?), play-again (Reload?).

---

## 12. Open Questions & Design Notes (REQUIRED)

### Decisions Log — calls made for your review (override any on review)
- **Roll hierarchy:** monotonic Heat (odd die 1–6 is the point; no 6-high/1-low auto win/loss in the base game). Canonical version parked as a Sylly wrinkle.
- **Triples:** all triples are wins, ranked low-to-high; triple-1 is the lowest triple, not an acey-out.
- **Press-your-luck:** a pair gives the player a lock/re-roll choice within the 3-throw cap; Red Hot / Trips / Ice Cold auto-resolve immediately; dead rolls force a re-roll.
- **Hot Seat succession:** first challenger to hit Red Hot/Trips steals the seat; else the Hot Seat holds for max two Rolls then passes left; a Hot Seat that busts on its own setting roll passes the seat left immediately.
- **End condition:** default **Last Call** (most Chips after ~12 Rolls), with Cash Out (race to a target) and Cleaned Out (elimination) as Finish-setting alternatives.
- **Betting model:** flat 1-Chip ante by default; Side Bets On allows variable wagers up to the Hot Seat's stake.
- **Starting Chips / length:** 20 Chips each; Standard ≈ 12 Rolls.
- **Heat Level multipliers:** Cool = flat; Warm = Red Hot ×2; Blazing = Red Hot ×2 + Trips ×3.
- **Multiplayer:** both pass-the-phone and individual-device modes ship in v1; pass-the-phone primary.

### Still genuinely open
- **Sylly Mode final pick** — choose from the §7 candidates (provisional lead: **Overheat**). Deferred until the core is confirmed in play. *(NON-BLOCKER.)*
- **Playtest tuning** — starting Chip count, exact Last Call round count per player count, and the Heat Level multiplier values may shift after a play pass. *(NON-BLOCKER.)*

### Flag for Claude Code (technical)
- **Fair RNG** — the dice must use a fair, unbiased random source; confirm the engine has a suitable utility or note one is needed.
- This is flagged as the **fastest of the batch-2 games to ship** — contained dice engine, no card rendering, no private hands, no content file.

### Out of scope for v1
- Real betting / variable side-bet economies beyond a simple stake cap.
- The canonical 6-high-pair / 1-low-pair auto-win/loss rules (parked as a possible Sylly wrinkle).

**General note:** resist re-theming. The whole decision here was that a clean, vernacular dice game serves the press-your-luck core better than a costume. Keep the presentation about *heat and Chips*, not a fiction.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Cee-lo / 4-5-6 / Chinchirorin (direct adaptation); craps-adjacent in feel; the press-your-luck arc of any "do I re-roll?" dice game. |
| **Tone** | Slick, punchy, tense, fast. Neon-and-chrome cool. The drama is all in the roll. |
| **Should NOT feel like** | A grim gambling den (off-brand) or a soft, themed kids' game that buries the nerve (the failure mode of over-theming a luck game). Clean and electric, not dark and not cutesy. |
| **Example phrases / copy already written** | "Three dice, one hot hand — don't cool off." · Red Hot · Trips · Ice Cold · Cooled Off · a Wash · the Hot Seat · the Mark · your Heat · on a Streak · Last Call · Cash Out? |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 players — **Ada, Boris, Chloe, Dev**. Heat Level Warm, flat 1-Chip ante, everyone on 20 Chips. **Ada is in the Hot Seat** this Roll.

1. The field — Boris, Chloe, Dev — each ante **1 Chip** against Ada.
2. **Ada (Hot Seat)** rolls to set the Mark: **2-2-5** → a pair of 2s with an odd die of 5 → **the Mark is Heat 5** (strong). The field has to beat a 5.
3. **Boris** rolls. First throw: **3-3-1** → pair of 3s, Heat 1 — well below the Mark. He has two throws left, so he gambles and re-rolls: **4-5-6 → Red Hot!** Instant win. Ada pays Boris **1 Chip**, and because it's a Red Hot, **Boris steals the Hot Seat** for the next Roll.
4. **Chloe** rolls: **6-6-2** → Heat 2, below the Mark. She re-rolls the weak point… **1-2-3 → Ice Cold!** Instant loss. She pays Ada **1 Chip**. The press-your-luck bit her.
5. **Dev** rolls: **5-5-4** → Heat 4, just short of the Mark's 5. He gambles his last allowed re-roll: **3-3-3 → Trips!** Instant win — Ada pays Dev **1 Chip**. (Boris already claimed the steal as the first Red Hot/Trips, so Dev wins Chips but not the seat.)

**Result:** Ada paid Boris and Dev (−2) and collected from Chloe (+1) → **Ada nets −1 Chip** for her time in the Hot Seat. **Boris takes the Hot Seat** next Roll and the heat meter shows him starting a Streak. One Roll down; play continues until Last Call.

---

## Open Questions

1. **[NON-BLOCKER]** Sylly Mode final pick from the §7 candidates (provisional lead: **Overheat**) — deferred until the core is confirmed in play.
2. **[NON-BLOCKER]** Playtest tuning — starting Chip count, Last Call round count per player count, and Heat Level multiplier values may shift after a play pass.

*No BLOCKERs. Every structural decision — roll hierarchy, scoring, banker rotation, end condition, settings, and multiplayer profile — is made and recorded in the §12 Decisions Log. The only open items are the Sylly Mode selection and playtest tuning.*
