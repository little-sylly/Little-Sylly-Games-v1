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

1. Each player is dealt a hand of cards (default 4). The Herd (running count) starts at 0.
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

**Sleepwalker disruptions (the "ghost" system — LOCKED: rotation model):**
Eliminated players don't just spectate — they haunt the dream. The whole system is wrapped in a **Sleepwalkers** setting (default ON) so groups that want a clean spectator elimination can switch it off.

To stop a pile of ghosts from dogpiling whoever's in the lead, all Sleepwalkers share a single **Nightmare Meter**, and the right to spend it **rotates**:

- The meter charges by one notch each time a living player completes a turn, and is tuned to **fill fast — roughly every 3–4 completed Sleeper turns** (starting value, tunable). Fast charge is the deliberate counter to the rotation's one con: in a big lobby no ghost waits long for their slot to come round. Frequency is high; severity stays fixed at exactly one disruption per fill.
- When it fills, the spend-right is handed to **one** Sleepwalker on a **rotation** (elimination order — first one out haunts first, then it cycles). No squabbling over who acts, and no concurrency race: only ever one ghost holds the spend-right.
- That ghost's disruption resolves at the **next turn-gate** — the moment the active player finishes drawing — then the meter empties and recharges.
- **Total ghost impact is bounded regardless of ghost count** — two Sleepwalkers and five exert the same pressure on the survivors; the rotation just shares the haunting around so everyone stays engaged. This is the key balance lever. *(An "every ghost fires each fill" model was considered and rejected — it makes disruption scale with elimination count, re-creating the exact dogpile we're avoiding, and it peaks late when the game should be tightening to a clean duel.)*

**Candidate disruption effects (final set + charge rate = playtest, see §12):**
- **Bad Dream 💭** — the next card played counts +1 higher. A small, mean nudge that makes a tight spot tighter.
- **Sleep Paralysis 😴** — one random card in the next active player's Pen is greyed out and locked for that turn only (cannot be played). No targeting, no reveal — a pure system pick. *(Replaces the earlier "Whisper" card-reveal idea, which leaked information and needed opponent-hand rendering.)*
- **Cold Feet 🦶** — reverse the turn direction once (no count change).
- **Restless 🌙** *(candidate)* — the active player must draw one extra card into their Pen this turn (a fuller, harder-to-dump hand).
- **Fog 🌫️** *(candidate)* — the running Herd total is hidden from everyone for the next turn; you play blind. High-flavour — confirm in play it isn't more annoying than fun.

*Design intent:* every effect is **minor** — none can directly eliminate a living player or hand someone the win. Mild chaos and flavour only, so eliminated players stay engaged.

**Does scoring feel balanced?**
The risk in any climbing game is the early-game slog (0→~60 carries no tension). Dream Acceleration targets that. The risk in the ghost system is dogpiling; the shared, rotating Nightmare Meter is the answer (bounded impact regardless of ghost count). Both need a real playtest pass to tune (§12).

**Any outcomes where nobody scores?**
There's no scoring to withhold — a Night either ends in someone's Deep Sleep or rolls on. No "dead" rounds where nothing happens.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Hand Size** *(the challenge/depth dial — sits first)* | How many cards you hold. More cards = more strategic options, fewer forced busts. | 3 / 4 / 5 | **4** |
| **Moons (lives)** | How many lives each player starts with. More = longer, gentler game. | 3 / 5 / 7 | **3** |
| **Dream Acceleration** | While the Herd is below 50, standard number cards count double (+10 → +20). Rockets the early game into the danger zone instead of a slow climb. | OFF / ON | **ON** |
| **Sleepwalkers** | Whether eliminated players haunt the dream via the shared Nightmare Meter (see §5). OFF = clean spectator elimination. | OFF / ON | **ON** |
| **✨ Sylly Mode** | *Reserved last slot — design later (see §7).* | OFF / ON | OFF |

**Fast Start removed:** the earlier "start the Herd at 50" toggle has been **cut**. It and Dream Acceleration were two solutions to the same problem (the early-game slog), and keeping both meant a dormant-interaction edge case to test and document for no real gain. Dream Acceleration alone smooths the early game and is now a player-facing toggle (default ON).

**Are there any settings that should be locked or hidden in certain situations?**
- *Possible future setting:* a deck-chaos dial ("how special-card-heavy is The Flock?"). Flagged as a §12 question rather than committed, to keep v1 lean.

---

## 7. Sylly Mode — Night Terrors (DESIGNED; build deferred)

**Status:** the design is now **resolved** (brainstormed and locked across the spec process), but **implementation is deferred** until the core climbing loop, custom deck, and ghost system are confirmed in play. The settings overlay reserves Sylly Mode as the last setting, shown disabled / "coming soon" in v1. Full technical capture lives in `docs/new-game-tech-counting-sheep.md` §12.

**Thematic name:** **Night Terrors.** In-phase on-screen label: **"The Plunge."**

**One sentence:** once the Herd climbs all the way to the top, the world inverts and a falling ceiling drags everyone back down — you've evaded sleep long enough, now sleep comes for you.

**The mechanic — an oscillating Climb → Plunge cycle (Model A):**
- **The Climb (the spring):** play builds the Herd upward as usual, but the climb does **not** eliminate. It's a tug-of-war — aggressors push toward the top to drop the scythe on rivals, defenders pull down to delay — and the 67%-adder deck guarantees the Herd is forced up to the top. Deliberately lower-stakes: the inhale before the terror.
- **The trigger:** the moment the Herd reaches the top (99), the room flips into **The Plunge.** Screen flashes crimson; a "💤 THE PLUNGE BEGINS" beat.
- **The inversion:** all *arithmetic* cards flip sign — the Pasture (+1/+2/+5/+10) now **subtracts**, and Counting Backwards (−10) now **adds (+10)**. Set / skip / reverse / attack cards are unchanged (Black Sheep still slams to 99 — now an aggressive shove into the falling ceiling; Lullaby still sets 20). The inversion isn't flavour: it's what re-tools the adder-heavy deck into subtractors so players actually have tools to flee downward.
- **The descending ceiling:** after a one-cycle **grace** (the ceiling holds at the top so players can carve a starting margin and play a positioning round), the ceiling falls a little at the start of every turn. Players race the Herd down under it using their flipped subtractors; flipped Counting Backwards (+10) is the weapon to shove rivals up into it.
- **The executioner is the deck, not the drop.** The ceiling's fall is tuned only to stop players *outrunning* it (an anti-stall floor — see the §12 governing equation). What actually kills is **attrition**: you can dump big subtractors for a few turns, but the deck runs dry of them, and a player left holding small cards can't keep up and is swallowed (−1 Moon). Different players run dry at different times → picked off in sequence → graduated sweat.
- **The Plunge ends on the first bust:** whoever can't get under the falling ceiling loses a Moon — and that bust ends the Plunge. The Herd resets, cards un-invert, ceiling snaps back to the top, fresh redeal, the buster opens the next climb. **Mercy backstop:** if the Herd ever reaches 0 with nobody caught (everyone held big subtractors), the Plunge reverts with **no** Moon lost — a rare "clean escape." **One Moon lost per oscillation** — a controlled drip, not a bloodbath; game length stays governed by the Moons setting.

**Does it add screens?** No new full screens — The Plunge is a sub-state of the main table (crimson re-skin + a falling-ceiling readout beside the Herd + cards re-rendered with their flipped values). One "THE PLUNGE BEGINS" interstitial flash.
**Does it change scoring?** No — still Moons; the same Deep Sleep = −1 Moon handler, just triggered by the falling ceiling instead of the fixed 99.
**Does it change the win condition?** No — last one awake still wins.

**Deliberately reuses the existing deck — no new card types** (the discipline: subvert the loop with the same data structures). Mode-specific cards were considered and set aside for a possible v2.

**Tuning (playtest, not a paper answer):** ceiling drop per turn (~7 starting, band 6–8), grace length (1 cycle), per-turn vs per-cycle cadence, and whether the ceiling resets fully to 99 each cycle (v1) or tightens each oscillation (possible later). Dials, not blockers.

**Set aside (not v1):** the pillow-tax ("Nightmare Fuel"), the auto-disruption chaos ("Fever Dream"), a tightening amplitude, and mode-only cards. A richer **Model 2** Plunge (runs to 0; busters lose a Moon and sit out the rest of that descent; multi-kill descents with clean-night variance) is a documented future upgrade if one-kill-per-cycle ever feels too metronomic.

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
| Card families | **The Pasture** (positive numbers) · **The Pillows** (defensive cards) · **The Alarms** (offensive / chaos cards) · **The Traps** (cursed cards you don't want to draw) |

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

**The Pillows (defensive cards):**
- **Doze** — skip: the Herd is unchanged, your turn simply ends. (The classic "9 = pass.")
- **Toss & Turn** — reverse direction; the Herd is unchanged.
- **Counting Backwards** — subtract 10 from the Herd (floors at 0). Sheep hopping back over the fence.
- **Lullaby** *(LOCKED — 1-of "legendary")* — reset the Herd down to 20. The ultimate psychological safety valve: dropping it at a suffocating 99 plunges the room back to 20 and kicks off a frantic second climb. It overlaps Counting Backwards / Black Sheep mathematically, but its job is *emotional* — one unexpected moment of total relief in a game built on mounting tension. Kept as a single rare copy.

**The Alarms (offensive / chaos cards):** *(renamed from "The Wolves" — only one card was actually wolf-related, so the family name was weak; "Alarms" fits the noises-that-wake-you theme)*
- **"1, 2, Skip a Few…"** — adds a *random* amount between **+2 and +12**, marked on the card only *after* you commit to playing it. A gamble: "I'll play it and hope it's small."
- **The Black Sheep** — sets the Herd to **exactly 99**. The "King = 99" bomb. Hands the next player the brink.
- **Wide Awake** *(rare)* — **no targeting.** Automatically jolts the current **leader** (the player with the most 🌙 Moons remaining — the "most awake"): they must take the next turn at the current high Herd. Ties resolve by following the turn direction to the next-closest leader. Thematically clean (the one ahead gets the rude awakening) and zero UI overhead. *(Note: early game, when everyone's tied on Moons, it degrades to "hit the next player" — its teeth come out once someone pulls ahead. Acceptable as a tall-poppy card.)*
- **Heavy Eyelids** *(rare)* — the next player must play **two cards** on their turn, doubling their bust risk. *(Edge cases flagged in §12: holding only one card, the second card being a non-adder, and Heavy-Eyelids-into-Heavy-Eyelids chains.)*

**The Traps (cursed draw cards):**
- **The Big Bad Wolf** *(very rare)* — **not a card you play — a trap shuffled blindly into The Flock.** Whoever *draws* it has the effect forced on **themselves**: the Wolf is consumed on draw (it never enters your hand as a playable card), your Pen cap drops 4→3, and a sleeping wolf is rendered over the blocked slot until you next fall into Deep Sleep, when the slot returns. Because it's consumed in place of a normal draw, you simply end the turn at 3 cards — **no forced discard needed**. Removes all targeting; pure self-inflicted dread the moment you flip it.

**Deck distribution — sensible v1 starting point (tunable, NON-BLOCKER):**
There's no universal standard, but the working heuristic for shedding/climbing games: numbers ~60–70% (predictable math), utility specials a few copies each, game-enders genuinely scarce (1–2 copies), and the whole deck at least ~1.5–2× the total cards that can sit in hands so it doesn't exhaust before a reshuffle. A ~60-card blueprint that fits:

| Family | Card | Copies |
|--------|------|--------|
| Pasture | +1 / +2 / +5 / +10 | 10 each (40) |
| Pillows | Doze | 4 |
| Pillows | Toss & Turn | 4 |
| Pillows | Counting Backwards | 3 |
| Pillows | Lullaby | 1 *(locked — single legendary copy)* |
| Alarms | 1, 2, Skip a Few… | 3 |
| Alarms | The Black Sheep | 2 |
| Alarms | Wide Awake | 2 |
| Alarms | Heavy Eyelids | 1 |
| Traps | The Big Bad Wolf | 2 |

≈60 cards, ~67% numbers. Treat as a starting line, not gospel — exact counts are a play-tuning job.

**Deck exhaustion / reshuffle (LOCKED):** with up to 8 players × 4 cards in hand plus the play pile, a 60-card Flock *will* run low within a long Night, so the protocol is:
- **Mid-Night:** when The Flock empties while players are still fighting through a Night, the discard pile is immediately grabbed, shuffled, and set as the replacement deck.
- **On Deep Sleep:** the Night terminates — the engine collects *every* card (hands, discard, remaining Flock), shuffles one fresh deck, and redeals. This clears out hoarded endgame hands so each Night starts clean.

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
3. **The Table** — the heart of the game: a big central Herd count with the sheep-and-fence animation, your Pen along the bottom, and the play controls. This one screen carries all sub-states: *your turn*, *waiting for someone else*, and *forced two-card play* (Heavy Eyelids). **No targeting prompt** — Wide Awake auto-hits the leader and The Big Bad Wolf is a self-inflicted draw trap, so the targeting overlay is gone entirely.
4. **"1, 2, Skip a Few…" reveal** — the gamble moment (inline animation on The Table rather than a full screen).
5. **Deep Sleep moment** — a player crashes: lose a Moon, the Herd visibly resets, a new Night begins (inline animation or brief interstitial).
6. **Sleepwalker view** — the eliminated player's screen: spectating The Table, plus the shared Nightmare Meter; when the rotation hands *you* the spend-right, a single disruption affordance appears.
7. **Dream-shift interstitial** — a brief "the dream shifts 🌙" flash when a Sleepwalker's disruption resolves at a turn-gate, so the table sees what happened (a lightweight inline banner, not a full screen).
8. **Daybreak (game over)** — the last one awake, final standings (reverse elimination order), and Another Night? / exit.

*Standard overlays expected alongside these:* settings (Bedtime Routine 🌙), how-to, quit (Tuck In?), play-again (Another Night?).

---

## 12. Open Questions & Design Notes (REQUIRED)

**Unresolved design questions (tuning — need playtesting, not a decision):**
- **Deck distribution ratios** — how many of each card in The Flock? Mostly-numbers is the agreed *feel*; exact counts need play. *(NON-BLOCKER — Claude Code can spec a sensible starting distribution.)*
- **Nightmare Meter charge rate** + final Sleepwalker effect set (Bad Dream / Whisper / Cold Feet, or a subset). *(NON-BLOCKER.)*
- **"1, 2, Skip a Few…" range** (+2 to +12) — may need narrowing after play. *(NON-BLOCKER.)*

**Things that might be complicated to implement (flag for Claude Code):**
- **Dream Acceleration scope** — confirmed: applies to **The Pasture number cards only** (+1/+2/+5/+10). "1, 2, Skip a Few…" and Counting Backwards are NOT doubled (avoids a wild −20 swing or a doubled random bomb).
- **Deck exhaustion / reshuffle** *(LOCKED)* — Flock empties mid-Night → shuffle the discard pile into the replacement deck. On Deep Sleep → collect all hands + discard + Flock, reshuffle one fresh deck, redeal. (See §9.)
- **Sleepwalker model** *(LOCKED)* — shared Nightmare Meter, spend-right **rotates** to one ghost per fill, charges fast (~every 3–4 Sleeper turns), resolves at the next turn-gate (host-authoritative). Sidesteps both the dogpile-balance problem and the mid-turn concurrency race in one move — only one ghost ever holds the spend-right. The "every ghost fires each fill" alternative was steel-manned and rejected (scales disruption with elimination count, turning the endgame into an unfair execution squad).
- **The Big Bad Wolf draw-trap** — consumed on draw (never enters hand as a playable card), Pen cap 4→3, slot restored on next Deep Sleep. Because it replaces a normal draw, the turn just ends at 3 cards — no forced discard. Confirm the restore trigger is unambiguous.
- **Heavy Eyelids two-card play** — edge cases to nail down: (a) the next player holds only one card; (b) one of the two cards is a non-adder (Doze / reverse / subtractor) — does that count as one of the two?; (c) Heavy Eyelids played as one of the forced two (chain). The "no legal two-card line → Deep Sleep" check must enumerate combinations, not just single cards.
- **Hand redeal on Deep Sleep** — confirmed assumption: hands are **redealt fresh** at each Herd reset.
- **Counting Backwards floor** — confirmed assumption: the Herd floors at 0 (can't go negative).

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

**Setup:** 4 players — **Ada, Boris, Chloe, Dev**. Hand Size 4, 3 Moons each, **Dream Acceleration ON** (default), turn order Ada → Boris → Chloe → Dev. The Herd starts at **0**.

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
Several Nights on, **Dev** has lost his last Moon and is now a **Sleepwalker**. The shared Nightmare Meter fills as Ada and Chloe trade turns; the rotation hands this fill's spend-right to Dev. He fires **Sleep Paralysis 😴** — the system greys out one random card in Ada's Pen for her next turn. Ada had been holding a tidy +2 for exactly this high-Herd moment, and it's the card that locks. Dev can't win, but he's still shaping the endgame — and on the next fill it'll be a different ghost's turn to haunt.

---

## Open Questions

1. **[NON-BLOCKER]** Deck distribution ratios — §9 has a ~60-card starting blueprint; exact counts to be tuned in play.
2. **[NON-BLOCKER]** Final Sleepwalker effect set (Bad Dream / Sleep Paralysis / Cold Feet / Restless / Fog — pick the subset that plays best). Meter charge rate locked to a ~3–4-turn starting value (§5), still play-tunable.
3. **[NON-BLOCKER]** "1, 2, Skip a Few…" random range (+2 to +12) — may narrow after play.
4. **[LOCKED]** **Lullaby** kept as a single legendary copy (§9) — emotional safety valve, not a math card.
5. **[LOCKED]** Deck reshuffle rule (§9) — discard reshuffles into the Flock on exhaustion; full reshuffle + fresh redeal on Deep Sleep.
6. **[CONFIRMED]** Dream Acceleration applies to Pasture number cards only; hands redealt fresh on reset; Counting Backwards floors at 0.
7. **[LOCKED]** Sleepwalker model — shared meter, spend-right rotates one ghost per fill (fast charge), resolves at the next turn-gate, host-authoritative; bounds ghost impact and removes the concurrency race in one move.

*No BLOCKERs. Core loop, deck, win condition, scoring, settings, reshuffle, the ghost model, and multiplayer profile are all locked; the only remaining items are pure play-tuning values (effect-set subset, charge-rate fine-tune, random range).*
