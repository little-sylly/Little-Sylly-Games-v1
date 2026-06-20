# New Game Brief — Counting Sheep
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** Core game resolved. **Sylly Mode deliberately deferred** (§7) — to be designed once the core loop is confirmed in play. A handful of tuning values are flagged in §12 as NON-BLOCKERs (deck ratios, charge rates) — they need playtesting, not a design decision, so they don't block the technical spec.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Counting Sheep |
| **Short nickname / abbreviation** | `shp` (confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt) |
| **One-sentence tagline** | "Stay awake. Pass the herd." *(alt considered: "Don't hit 99. Don't wake up.")* |
| **Thematic universe** | Drifting off to sleep, counting sheep over a moonlit fence. The count climbs; you're trying to stay awake while forcing everyone else to crash out first. Last one awake wins. |
| **Emoji / icon** | 🐑 |
| **Brand colour preference** | Moonlit indigo / midnight navy, with cream accents. *(Likely needs a custom `pill-active-shp` — same custom-colour path as GTH/FRT. Claude Code to confirm in the Consistency Audit.)* |

**The theme inversion (important):** This is *Ninety-Nine / O'NO 99* with the bust condition reframed. You are NOT trying to fall asleep — you're trying to stay awake. Every sheep you add to the herd nudges the next player closer to **Deep Sleep**. Tip the herd to **100 or more** and *you* crash out and lose a life. The boring sheep are a weapon.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–8 |
| **Teams or individuals?** | Individuals — everyone for themselves |
| **Are there different roles?** | No fixed roles during normal play. The one role-like state is **Sleepwalker** — a player who has lost all their lives but stays in the game as a minor disruptor (see below + §5). |
| **Is any information hidden from some players?** | Yes — each player's **hand** ("Your Pen") is private to them. Everyone sees the shared running count (The Herd). |
| **Minimum meaningful player count** | 3. Sweet spot is **4–6**. *(A 2-player sudden-death duel is plausible but is OUT OF SCOPE for v1 — see §12.)* |

### Roles (if applicable)

| Role name | What they know | What they do | Their goal | Any restrictions |
|-----------|---------------|--------------|------------|-----------------|
| Sleeper (default) | Their own hand + the shared Herd count | On their turn, play one card that changes the Herd | Stay awake — be the last Sleeper standing | Must play a legal card if they hold one (can't choose to bust on purpose) |
| Sleepwalker (eliminated, "ghost") | Same public info + the shared Nightmare Meter | Spend the Nightmare Meter to fire one small dream disruption | Stir up chaos / drag the survivors down with them | Cannot win; influence is bounded by the shared meter (see §5) |

**Notes:** Sleepwalker is not a hidden role — when you lose your last life, you visibly "drift off" and the game tells everyone you're now haunting the dream.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Tap one card from their hand to push, hold, shrink, or weaponise the running sheep count — then draw back up to a full hand.

**What is the central tension or fun moment?**
The herd sits at 99 and it's now *your* turn — your whole hand is fat +10s and you can feel the Deep Sleep coming. Or: you drop **The Black Sheep** to slam the count to 99 and hand the next player a death sentence, then watch them sweat. The digital-only attack cards (Heavy Eyelids, Big Bad Wolf, Wide Awake) turn a quiet counting game into a knife fight.

**What type of game is this closest to?**
☑ Something else: **climbing-number card game / shedding-and-survival** (closest existing suite-mate: Pass `pass`, a custom-deck card game)

**Walk through one complete round step by step, in plain English:**

1. Each player is dealt a hand of cards (default 4). The Herd (running count) starts at 0 — or at 50 if Fast Start is on.
2. The active player taps one card. The engine applies its effect to the Herd and checks the result.
3. **Dream Acceleration:** while the Herd is below 50, any standard number card counts **double** (a +10 becomes +20). This rockets the early game into the danger zone instead of a slow slog.
4. If the card would push the Herd to **100 or more**, that's a bust — but a player only busts when they have *no* legal card to play (see §5). Reaching or holding **exactly 99 is completely safe** and a power move.
5. After playing, the active player draws back up to a full hand from The Flock (the deck).
6. Direction passes to the next player (unless a card reversed it, skipped someone, or targeted a specific player).
7. When a player has no card that keeps the Herd at 99 or below, they fall into **Deep Sleep**: they lose one life (a 🌙 Moon), the Herd resets, all hands are redealt fresh, and they open the next Night.
8. Lose all your Moons and you become a **Sleepwalker** (ghost). The last player still awake wins.

**Is there anything players do simultaneously, or is everything sequential?**
Turns are strictly sequential — one active player at a time. The one concurrency wrinkle: **Sleepwalkers** can fire a dream disruption *during* a living player's turn. This is intentional spice; it needs a clean "whose input is live" rule (flagged in §12).

**How does the phone physically move between players?**
Each player has their own device (multiplayer-first — see §10). Hands are private, so passing one phone around is clunky; recommended mode is individual devices, same profile as Pass and Fruit Salad.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When only one player is still awake (everyone else has lost all their Moons and become Sleepwalkers). |
| **How is the winner determined?** | Last Sleeper standing wins. Final placements = reverse order of falling into permanent Deep Sleep (last one out = runner-up, etc.). |
| **Are ties possible?** | Not in normal play — eliminations resolve one card at a time, so two players can't crash simultaneously. Reverse-elimination order gives a clean ranking. |
| **Roughly how long should a full game take?** | ~10–20 minutes for 4–6 players at the default 3 Moons. More Moons (5/7) lengthens it. |

---

## 5. Scoring (REQUIRED)

**There is no points currency.** Survival is the score. Lives are tracked as **🌙 Moons**.

| What happened | Who is affected | Effect | Notes |
|--------------|----------------|--------|-------|
| A player has no card that keeps the Herd ≤ 99 | The active player | Falls into **Deep Sleep** → loses 1 Moon | Herd resets, hands redeal, that player opens the next Night |
| A player is forced to play and every legal line exceeds 99 | The active player | Same as above — Deep Sleep, −1 Moon | e.g. forced two-card play (Heavy Eyelids) with an all-adder hand |
| A player loses their **last** Moon | That player | Becomes a **Sleepwalker** (ghost) — out of the running but still in the game | Cannot win; gains access to the Nightmare Meter |
| A player survives to be the last awake | Winner | Wins the game | — |

**Sleepwalker disruptions (the "ghost" system):**
Eliminated players don't just spectate — they haunt the dream. To stop a pile of ghosts from dogpiling whoever's in the lead, **all Sleepwalkers share a single Nightmare Meter**:

- The meter charges by one notch each time a living player completes a turn.
- When it's full, **any one** Sleepwalker may spend it to trigger a single small effect, then it empties and starts recharging.
- This means ghost influence is bounded *regardless of how many ghosts there are* — two Sleepwalkers and five Sleepwalkers have the same total impact. That's the key balance lever.

**Candidate disruption effects (final set + charge rate = playtest, see §12):**
- **Bad Dream 💭** — add +1 to the Herd on the next card played. A small, mean nudge that makes a tight spot tighter.
- **Whisper 🌬️** — reveal one random card from the active player's hand to everyone. Pure information leak, no count change.
- **Cold Feet 🦶** — reverse the turn direction once (steals "Toss & Turn"). A tempo disruption, no count change.

*Design intent:* every Sleepwalker effect is **minor** — none can directly eliminate a living player or hand someone the win. They add flavour and mild chaos so eliminated players stay engaged, nothing more.

**Does scoring feel balanced?**
The risk in any climbing game is the early-game slog (0→~60 carries no tension). Dream Acceleration + Fast Start both target that. The risk in the ghost system is dogpiling; the shared Nightmare Meter is the answer. Both need a real playtest pass to tune (§12).

**Any outcomes where nobody scores?**
There's no scoring to withhold — a Night either ends in someone's Deep Sleep or rolls on. No "dead" rounds where nothing happens.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Hand Size** *(the challenge/depth dial — sits first)* | How many cards you hold. More cards = more strategic options, fewer forced busts. | 3 / 4 / 5 | **4** |
| **Moons (lives)** | How many lives each player starts with. More = longer, gentler game. | 3 / 5 / 7 | **3** |
| **Fast Start** | The Herd begins at 50 instead of 0, skipping the safe early climb. | OFF / ON | **OFF** |
| **✨ Sylly Mode** | *Reserved last slot — design later (see §7).* | OFF / ON | OFF |

**Always-on rule (NOT a setting): Dream Acceleration** — while the Herd is below 50, standard number cards count double. This is a baked-in rule so the early game always has stakes. *(See §12 — note the interaction with Fast Start.)*

**Are there any settings that should be locked or hidden in certain situations?**
- When **Fast Start** is ON, **Dream Acceleration** is effectively dormant (the Herd already begins at the 50 threshold). This is intentional — they're two alternative ways to skip the slog, not a stack. Claude Code should treat this as expected behaviour, not a bug.
- *Possible future setting:* a deck-chaos dial ("how special-card-heavy is The Flock?"). Flagged as a §12 question rather than committed, to keep v1 lean.

---

## 7. Sylly Mode (if applicable)

**None — will design later.**

Deferred deliberately: the project owner wants the core climbing loop, the custom deck, and the ghost system confirmed in play before layering on the wild variant. The settings overlay should still reserve Sylly Mode as the **last setting** per the suite-wide rule, shown OFF / disabled-with-a-"coming soon" affordance, or simply stubbed — Claude Code's call in the tech spec.

*(Early thought to revisit later, not a commitment: a "Night Terrors" variant where every special card's effect is amplified or where a hidden card type lurks in The Flock.)*

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Counting Sheep calls it |
|---|---|
| Round (count from reset to reset) | **Night** |
| Score / points | *(no points)* — lives are **🌙 Moons** |
| The running total | **The Herd** (the sheep counted so far) |
| Busting (Herd hits 100+) | **Deep Sleep** |
| The deck | **The Flock** |
| Your hand | **Your Pen** |
| Eliminated player (ghost) | **Sleepwalker** |
| Game over screen | **Daybreak ☀️** (the last one awake sees the sun come up) |
| Play again | **Another Night?** |
| Quit | **Tuck In?** ("Give in to sleep?") |
| Settings overlay title | **Bedtime Routine 🌙** ("Set the scene before lights out.") |
| Card families | **The Pasture** (positive numbers) · **The Wolves** (attack cards) · **The Pillows** (defensive cards) |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | No. |
| **If no — what content does it need?** | A small, fixed **custom deck definition** — the card types, their effects, their values, and how many of each are in The Flock. No suits, no word bank. Closer to FRT's fixed `FRT_FRUITS` constant than to a JSON word file. |
| **Does it need a completely new data file?** | Probably not a JSON content file — the deck is a small fixed constant (like FRT's fruit set). Likely a `SHP_DECK` constant in the plugin rather than `data/shp-data.json`. Claude Code to decide in the tech spec; if the deck composition is meant to be host-tunable later, a data file may be warranted. |
| **Any words/topics to exclude?** | N/A — no words. |

**The deck — plain English (The Flock):**

**The Pasture (positive number cards):**
- **+1, +2, +5, +10** only. Intermediate fillers (+3/+4/+6/+7/+8/+9) are deliberately dropped — with a custom deck there's no reason to carry them, and trimming them keeps the mental maths snappy.

**The Wolves (attack cards):**
- **"1, 2, Skip a Few…"** — adds a *random* amount between **+2 and +12**, revealed on the card only *after* you commit to playing it. A gamble: "I'll play it and hope it's small."
- **The Black Sheep** — sets the Herd to **exactly 99**. The "King = 99" bomb. Hands the next player the brink.
- **Wide Awake** *(rare)* — choose any player; they must take the next turn at the current (high) Herd. A targeted attack.
- **Heavy Eyelids** *(rare)* — the next player must play **two cards** on their turn, doubling their bust risk.
- **The Big Bad Wolf** *(very rare)* — choose an opponent; they lose one card slot (e.g. hand shrinks 4→3) until they next fall into Deep Sleep. Rendered as a sleeping wolf draped over the blocked slot.

**The Pillows (defensive cards):**
- **Doze** — skip: the Herd is unchanged, your turn simply ends. (The classic "9 = pass.")
- **Toss & Turn** — reverse direction; the Herd is unchanged.
- **Counting Backwards** — subtract 10 from the Herd (floors at 0). Sheep hopping back over the fence.
- **Lullaby** *(rare)* — reset the Herd down to 20. A relief card — a moment of calm.

**Deck distribution intent:** lean mostly-numbers with specials as power-ups — i.e. The Pasture should dominate, Wolves and Pillows should feel like earned moments, and the *(rare)* / *(very rare)* cards genuinely scarce. Exact ratios are a tuning job, not a design blocker — see §12.

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | Each player has their **own device**. Same multiplayer-only profile as Pass and Fruit Salad. |
| **Any information private to one device?** | Yes — each player's hand (Your Pen) is private. The Herd, direction, and Moon counts are public. |
| **Do players ever act simultaneously?** | Core turns are sequential. The exception is **Sleepwalker disruptions**, which can fire during a living player's turn — needs a clear "live input owner" rule. |
| **Is one device ever locked while another is active?** | Yes — only the active player's device accepts a card play; everyone else is on a spectator/standby view. Sleepwalkers get a limited ghost-action affordance. |
| **Anything that doesn't work with multiple devices?** | Pass-the-phone is technically viable but clunky (hidden hands, constant passing). Recommend **multiplayer-only (MDLM)** for v1, matching FRT. PTP-with-handover is possible but OUT OF SCOPE for v1 — see §12. |

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — every game has this (hub, Play, settings, how-to).
2. **Lobby / setup** — players join via room code; names come from the lobby roster (MDLM, no separate name-entry screen).
3. **The Table** — the heart of the game: a big central Herd count with the sheep-and-fence animation, your Pen along the bottom, and the play controls. This one screen carries all sub-states: *your turn*, *waiting for someone else*, *forced two-card play* (Heavy Eyelids), and the *targeting* prompt for Wide Awake / Big Bad Wolf.
4. **Targeting overlay** — pick which player to hit with Wide Awake or The Big Bad Wolf.
5. **"1, 2, Skip a Few…" reveal** — the gamble moment (can be an inline animation on The Table rather than a full screen).
6. **Deep Sleep moment** — a player crashes: lose a Moon, the Herd visibly resets, a new Night begins (inline animation or brief interstitial).
7. **Sleepwalker view** — the eliminated player's screen: spectating The Table, plus the shared Nightmare Meter and the dream-disruption button.
8. **Daybreak (game over)** — the last one awake, final standings (reverse elimination order), and Another Night? / exit.

*Standard overlays expected alongside these:* settings (Bedtime Routine 🌙), how-to, quit (Tuck In?), play-again (Another Night?).

---

## 12. Open Questions & Design Notes (REQUIRED)

**Unresolved design questions (tuning — need playtesting, not a decision):**
- **Deck distribution ratios** — how many of each card in The Flock? Mostly-numbers is the agreed *feel*; exact counts need play. *(NON-BLOCKER — Claude Code can spec a sensible starting distribution.)*
- **Nightmare Meter charge rate** + final Sleepwalker effect set (Bad Dream / Whisper / Cold Feet, or a subset). *(NON-BLOCKER.)*
- **"1, 2, Skip a Few…" range** (+2 to +12) — may need narrowing after play. *(NON-BLOCKER.)*

**Things that might be complicated to implement (flag for Claude Code):**
- **Dream Acceleration scope** — confirm it applies to **The Pasture number cards only** (+1/+2/+5/+10). The assumption here is that "1, 2, Skip a Few…" and Counting Backwards are NOT doubled, to avoid a wild −20 swing or a doubled random bomb. Please confirm.
- **Dream Acceleration × Fast Start interaction** — intentional that Acceleration goes dormant when Fast Start begins the Herd at 50. Documented in §6; not a bug.
- **Sleepwalker concurrency** — a ghost firing a disruption mid-turn needs a clean rule for whose input is live and how the meter is claimed when several ghosts tap at once (host-authoritative, presumably — same pattern as the suite's other simultaneous-input games).
- **The Big Bad Wolf hand-slot shrink** — the "render a sleeping wolf over the blocked slot, restored on next Deep Sleep" mechanic is a digital-only convenience; confirm the restore trigger (on losing a Moon) is unambiguous.
- **Heavy Eyelids forced two-card play** — interacts with the bust check (a player with an all-adder hand forced to play two cards is the cleanest "fair" Deep Sleep). Confirm the forced-play / no-legal-line logic handles the two-card case.
- **Hand redeal on Deep Sleep** — assumption is hands are **redealt fresh** at each Herd reset for a clean restart. Confirm vs. carrying hands over.
- **Counting Backwards floor** — assumption: the Herd floors at 0 (can't go negative). Confirm.

**Things explicitly OUT OF SCOPE for v1 (save for later):**
- **Sylly Mode** — deferred until the core is confirmed (§7).
- **2-player sudden-death duel variant** (cf. FRT's Pear-Off). Possible later; not v1.
- **Pass-the-phone mode** — MDLM-only recommended for v1.
- **Deck-chaos host setting** — possible future dial; not committed for v1.

**General notes / anything else:**
- **UI direction:** big central Herd number with a lightweight sheep-jumping-over-a-fence animation. Confirmed feasible for a PWA *if built smart* — a single SVG vector sheep translated along a CSS cubic-bezier curve over a central fence, fired on each card play. No 3D, no sprite sheets, no heavy libraries. Cheap on CPU, fast to load.
- **Shared foundation with Pass:** if the card-rendering infrastructure from Pass (`cards.js` / the `Cards` global) exists, Counting Sheep should reuse it heavily — it's a lighter game on the same foundation. Claude Code to assess reuse in the Consistency Audit.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Ninety-Nine / O'NO 99 (the addition card game); spiritually adjacent to Uno-style shedding games and Liar's Dice for the survival/elimination arc. |
| **Tone** | Cosy-on-the-surface, cut-throat-underneath. A gentle bedtime aesthetic wrapped around a mean little knife fight. |
| **Should NOT feel like** | A maths drill. The dropped intermediate numbers, snappy +1/+2/+5/+10 maths, Dream Acceleration, and Fast Start all exist to keep it from feeling like arithmetic homework. |
| **Example phrases / copy already written** | "Stay awake. Pass the herd." · "Don't hit 99. Don't wake up." · "1, 2, skip a few…" · card names: The Black Sheep, Toss & Turn, Counting Backwards, Heavy Eyelids, The Big Bad Wolf, Lullaby, Doze, Wide Awake. |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 players — **Ada, Boris, Chloe, Dev**. Hand Size 4, 3 Moons each, **Fast Start OFF** (so Dream Acceleration is live), turn order Ada → Boris → Chloe → Dev. The Herd starts at **0**.

1. **Ada** plays **+10**. The Herd is below 50, so **Dream Acceleration doubles it to +20**. Herd = **20**. She draws back to 4.
2. **Boris** plays **+10** → doubled → **+20**. Herd = **40**.
3. **Chloe** plays **+5** → doubled → **+10**. Herd = **50**. *(From here the Herd is at the threshold — Dream Acceleration switches off.)*
4. **Dev** plays **"1, 2, Skip a Few…"**. He commits, the card flips and reveals **+12** (a special card — NOT doubled by Dream Acceleration). Herd = **62**.
5. **Ada** plays **+10**. Herd = **72**.
6. **Boris** plays **The Black Sheep** → Herd is slammed to exactly **99**. Chloe is now on the brink.
7. **Chloe's Pen:** +10, +5, +2, Toss & Turn. Every number would bust her, so she plays **Toss & Turn** — the Herd stays at **99** and the direction **reverses**. Play now flows Chloe → Boris → Ada → Dev. Boris is back on the brink at 99.
8. **Boris's Pen:** +1, +5, **Heavy Eyelids**, +10. He plays **Heavy Eyelids** — the Herd is unchanged at **99** (so he's safe), but the next player, **Ada**, must now play **two cards**.
9. **Ada's Pen:** +10, +5, +5, +2 — all adders, and she's forced to play **two** at a Herd of 99. Her smallest two cards (+2 and +5) still total +7 → **106**. There is no legal line. **Ada falls into Deep Sleep.**

**Result of the Night:** Ada loses a Moon (🌙🌙🌙 → 🌙🌙). The Herd resets to 0, all hands are redealt fresh, and Ada opens the next Night. Boris's Black Sheep → Heavy Eyelids combo was the kill — a textbook digital-only one-two punch.

---

**Later in the game (Sleepwalker vignette):**
Several Nights on, **Dev** has lost his last Moon and is now a **Sleepwalker**. The Nightmare Meter fills as Ada and Chloe trade turns. When it tops out, Dev spends it on **Whisper 🌬️** — one of Ada's cards (a Black Sheep) is flashed to the whole table. Now Chloe knows the bomb is coming and plays around it. Dev can't win, but he's still shaping the endgame.

---

## Open Questions

1. **[NON-BLOCKER]** Deck distribution ratios (how many of each card in The Flock). Mostly-numbers feel agreed; exact counts to be tuned in play.
2. **[NON-BLOCKER]** Nightmare Meter charge rate and the final Sleepwalker effect set (Bad Dream / Whisper / Cold Feet, or a subset).
3. **[NON-BLOCKER]** "1, 2, Skip a Few…" random range (+2 to +12) — may narrow after play.
4. **[NON-BLOCKER]** Confirm **Dream Acceleration applies to Pasture number cards only** (+1/+2/+5/+10), not to specials or subtractors.
5. **[NON-BLOCKER]** Confirm hands are **redealt fresh** at each Deep Sleep reset (vs. carried over).
6. **[NON-BLOCKER]** Confirm **Counting Backwards** floors the Herd at 0.
7. **[NON-BLOCKER]** Confirm the **Sleepwalker mid-turn concurrency** model is host-authoritative (consistent with the suite's other simultaneous-input games).

*No BLOCKERs. The core loop, deck, win condition, scoring, settings, and multiplayer profile are all resolved; the open items are tuning values and confirmations Claude Code can carry into the technical spec.*
