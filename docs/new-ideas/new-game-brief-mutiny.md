# New Game Brief — Mutiny
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** A pirate-themed **Werewolf / Mafia** adaptation — a hidden-traitor, night-kill deduction game, built warm and chaos-forward rather than as a tense competitive port. The folk skeleton is public-domain and app-hostable (no human Storyteller). The defining twist: **drunkenness is the misinformation engine, and it's a weapon** — a mutineer "spikes the grog" to corrupt a crewmate's night action, so false info is a *play*, not a coin flip. All structural calls are made and baked in (see the §12 Decisions Log). Open items are tuning values and a couple of chaos-role confirmations. Review-ready.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Mutiny** *(alt considered: "Scallywags", "Walk the Plank")* |
| **Short nickname / abbreviation** | `mut` (confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt) |
| **One-sentence tagline** | "There's a mutiny brewing. Find the rats before you all go overboard." |
| **Thematic universe** | A rowdy ship's crew on a long voyage. Hidden mutineers are picking off honest sailors in the night and spiking the grog to muddy everyone's wits. By day the crew musters on deck, argues, and votes one suspect to **walk the plank**. Warm, loud, slapstick-pirate — plank-walking is comedy, not a hanging; the dead splash about in Davy Jones' Locker and keep heckling. |
| **Emoji / icon** | 🏴‍☠️ |
| **Brand colour preference** | Weathered sea-teal with brass accents, **or** rum-barrel amber. *(Custom `pill-active-mut` likely needed. Flag for the audit: confirm distinct from Deep-Sea Deploy's deep blue — the two are thematic neighbours.)* |

**The lane it fills:** the suite already has three social deduction games — LTTP (find the outsider), NAT (find the mole), BLD (hidden role + sabotage). None of them runs a **night-kill loop with fallible info roles** — people die each night and survivors deduce from partial, sometimes-false clues. That's the gap Mutiny fills, and it's a real one.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **5–10** |
| **Teams or individuals?** | Two hidden teams: the **Honest Crew** (uninformed majority) vs the **Mutineers** (informed minority who know each other), plus the occasional neutral chaos role. |
| **Are there different roles?** | Yes — hidden roles are the heart of the game (full set in §9). |
| **Is any information hidden from some players?** | Heavily. Your role is secret; mutineers know each other; the Navigator gets private (sometimes false) readings; all night actions are private. |
| **Minimum meaningful player count** | 6. Sweet spot **7–9**. |

### Roles (overview — full powers in §9)

| Side | Role | One-line job |
|------|------|--------------|
| Honest Crew | **Honest Deckhand** | No power — argue, vote, survive |
| Honest Crew | **The Navigator** | Each night, secretly check one crewmate's loyalty — reading is true *unless they were grog-spiked* |
| Honest Crew | **The Ship's Surgeon** | Each night, patch up one crewmate — they survive a mutiny strike (fails if grog-spiked) |
| Honest Crew | **The Quartermaster** | One-shot day pistol — publicly take a shot at a suspect (Standard+ complexity) |
| Mutineers | **The Mutineer(s)** | Each night, together drag one crewmate under |
| Mutineers | **The Bosun** | A mutineer who also spikes one crewmate's grog each night — the misinformation engine |
| Neutral | **The Cabin Boy** | Wins if the crew plank *him* — pure chaos (Full complexity) |

**Notes:** the mutineer count scales with the table (see §9). The Bosun is the team's signature tool — at low counts the lone mutineer *is* the Bosun and chooses each night whether to kill **or** spike; at higher counts a dedicated Bosun lets the team do both.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
At night, players with a role secretly act on their own device (mutineers pick a victim and spike a grog; the Navigator reads a crewmate; the Surgeon protects one); by day, the whole crew argues out loud and votes one suspect to walk the plank.

**What is the central tension or fun moment?**
The grog. The Navigator stands up at dawn, dead certain — *"I checked Boris, he's loyal, trust me!"* — not knowing the Bosun spiked her grog last night and the app fed her a lie. The crew has to weigh every confident claim against *"…but were you sober?"* That's the deduction spine wrapped in comedy: information is usually reliable, so reads matter — but the grog is a known, weaponised risk everyone has to reason around.

**What type of game is this closest to?**
☑ Deduction / bluffing / social deception

**Walk through one complete Watch (night + day), step by step:**

1. **Nightwatch.** Lights out below deck. On their own devices, simultaneously: the Mutineers agree on a crewmate to drag under; the Bosun picks someone to spike with grog; the Navigator checks one crewmate's loyalty; the Surgeon patches one crewmate. (Deckhands just "sleep.")
2. **Resolution.** The app applies the grog spike first, then resolves everything: a grog-soaked Navigator's reading is flipped to a lie; a grog-soaked Surgeon's patch fails; the mutiny's victim is lost overboard unless the Surgeon protected them.
3. **Dawn / Muster.** The app narrates who didn't make it through the night. The crew gathers on deck.
4. **Discussion.** Everyone argues out loud (verbal, IRL — the banter is the game), optionally on a Watch Timer.
5. **The Plank.** The crew votes; the suspect with the most votes **walks the plank** and (by default) their role is revealed.
6. **The Locker.** Anyone lost overboard or planked splashes into Davy Jones' Locker — they stay in the banter and share a small, bounded nightly nudge (see §5).
7. Repeat until the Mutiny is quashed (all mutineers gone) or the Ship is taken (mutineers reach parity).

**Simultaneous or sequential?**
Night actions are **simultaneous and private** (a ready check gates the resolution). Day discussion is open; the plank vote is a public show of hands (for table drama).

**How does the phone move between players?**
Each player has their own device — non-negotiable here. Hidden roles, private night actions, secret readings, and mutineers-know-each-other all require it. Pass-the-phone doesn't work for this game (see §10).

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When one side achieves its goal: the **Honest Crew** win when every Mutineer is gone (the Mutiny is Quashed); the **Mutineers** win when they equal or outnumber the honest crew (the Ship is Taken). The **Cabin Boy** wins instantly if the crew plank him. |
| **How is the winner determined?** | By side. Everyone on the winning side wins together (the Cabin Boy wins alone). |
| **Are ties possible?** | A tied plank vote means **nobody walks** that day (the crew couldn't agree) — tension, not a coin flip. Side victory is unambiguous. |
| **Roughly how long should a full game take?** | ~10–20 minutes per game; tables often play several back-to-back. |

---

## 5. Scoring (REQUIRED)

Mutiny is **win/lose by side**, not a points game (like LI5, there's no running score). An optional session tally can track wins across back-to-back games ("Crew 3, Mutiny 1").

| What happened | Outcome |
|--------------|---------|
| All Mutineers removed | Honest Crew win — **the Mutiny is Quashed** |
| Mutineers reach parity with the crew | Mutineers win — **the Ship is Taken** |
| The crew plank the Cabin Boy | Cabin Boy wins alone (chaos); the main game continues for the others |

**The Locker (ghost) system:** the dead aren't out — they stay in the banter and share a **single bounded nightly nudge** (the same shared-meter trick that stops dogpiling in Counting Sheep's Sleepwalkers). Light-hearted and non-deciding: the Locker can collectively "rattle the rigging" once a night to flag general unease — a flavour signal, never a power that names or kills anyone. *(In Sylly Mode the Locker gets teeth — see §7.)*

**Does it feel balanced?**
Mutineer count scales with the table (§9) to keep the informed minority around the classic ~25–30%. The weaponised grog gives the bad guys a real strategic fork (kill someone, or let them live and poison the crew's information through them) without being random. Reads stay meaningful because info is true *most* of the time.

**Any outcomes where nobody scores?**
A tied plank vote resolves to no execution — a deliberate stalemate beat, not a dead round.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Crew Complexity** *(the difficulty/complexity dial — sits first)* | Which roles are in play. Simple = Navigator + Surgeon + Mutineers/Bosun only. Standard = adds the Quartermaster. Full = adds the Cabin Boy (chaos). | Simple / Standard / Full | **Standard** |
| **Plank Reveal** | Whether a planked player's role is revealed when they walk. | On / Off | **On** |
| **Watch Timer** | An optional day-discussion countdown to keep things moving. | Off / Short / Long | **Off** |
| **✨ Sylly Mode (The Kraken Wakes)** | See §7. | OFF / ON | OFF |

**Player count** (5–10) is set from the lobby roster; the **mutineer count is derived automatically** from it (§9), not a manual dial.

---

## 7. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **The Kraken Wakes 🐙** |
| **In one sentence — what changes?** | After a few Watches a sea-monster stirs, and from then on the **Locker (the dead) collectively choose one living crewmate each night for the Kraken to drag under** — turning the ghosts into a real, chaotic third force. |
| **Does it add new screens or phases?** | One: a Locker voting step during Nightwatch once the Kraken is awake. |
| **Does it change scoring?** | No new win condition, but it accelerates losses and shortens games. |
| **Does it change the win condition?** | No — crew vs mutineers still decides it; the Kraken just thins the decks faster and gives the drowned real teeth. |

*Why this Sylly:* it's the natural home for the Kraken (saved from the earlier theme talk), and it cranks the suite's "dead stay dangerous" idea up to chaos level without replacing the core game. A bounded nudge becomes a genuine nightly threat — loud, swingy, and very Sylly.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Mutiny calls it |
|---|---|
| Round / cycle | **Watch** (one night + one day) |
| Night phase | **Nightwatch** |
| Day phase | **Muster** (the crew gathers on deck) |
| Score / points | *(not used — win/lose by side)* |
| Execution (day vote) | **Walk the Plank** |
| Night kill | **Lost Overboard** / dragged under |
| Eliminated players | **The Drowned**, down in **Davy Jones' Locker** |
| Misinformation state | **Grog-soaked** (spiked) |
| The good team | **The Honest Crew** |
| The bad team | **The Mutineers** |
| Game over screen | **The Reckoning ⚓** (crew win = "Mutiny Quashed"; mutineer win = "Ship Taken") |
| Play again | **Set Sail Again?** |
| Quit | **Abandon Ship?** |
| Settings overlay title | **Ship's Articles 📜** |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | No. |
| **If no — what content does it need?** | A fixed **role definition set** (each role's side, night action, and grog-vulnerability) plus a **mutineer-scaling table** and a pool of **dawn-narration flavour lines** ("Dawn breaks. [Name]'s hammock is empty…"). All small fixed constants in code — no external content file. |
| **Does it need a completely new data file?** | No (flavour lines can be a hardcoded constant; Claude Code's call if a tiny file is cleaner). |
| **Any words/topics to exclude?** | Keep death framing light and comedic (overboard, the Locker) — never grim or graphic, in keeping with the warm tone. |

**The role set (the actual "content"):**

*Honest Crew*
- **Honest Deckhand** — no power. The backbone; pure social read and vote.
- **The Navigator** — each Nightwatch, secretly check one crewmate; the app returns *Loyal* or *Mutineer*. **True unless the Navigator was grog-spiked that night, in which case the app returns the opposite.**
- **The Ship's Surgeon** — each Nightwatch, patch one crewmate; if the mutiny targets that person, they survive. May self-patch once per game. **A grog-spiked Surgeon's patch fails.**
- **The Quartermaster** *(Standard+)* — once per game, by day, publicly fire a pistol at a suspect, removing them instantly. The risk: shoot an honest sailor and the crew has done the mutiny's work for it.

*Mutineers*
- **The Mutineer(s)** — each Nightwatch, together choose one crewmate to drag under.
- **The Bosun** — a mutineer who *also* spikes one crewmate's grog each Nightwatch, corrupting that player's night action. The engine of the whole "drunk = misinfo" theme.

*Neutral*
- **The Cabin Boy** *(Full only)* — wins instantly if the crew vote to plank him. Wants to act just suspicious enough. Pure chaos.

**Mutineer scaling (derived from player count):**

| Players | Mutineers | Bosun |
|--------|-----------|-------|
| 5–6 | 1 | the lone mutineer acts as Bosun (each night: **kill or spike**, not both) |
| 7–9 | 2 | one of the two is the Bosun (team can kill **and** spike) |
| 10 | 3 | one is the Bosun |

*(Exact thresholds are a tuning value — see §12.)*

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | **Individual devices only.** Hidden roles, private night actions, secret readings, and mutineers-know-each-other make this impossible to pass around one phone. |
| **Any information private to one device?** | Heavily — roles, mutineer identities, night actions, and the Navigator's reading are all private. |
| **Are there moments players act simultaneously?** | Yes — all night actions happen at once (a ready-check matrix gates resolution). |
| **Is one device locked while another is active?** | Locking is per-phase: Nightwatch (only role-holders act), Muster (everyone discusses), the Plank (everyone votes), and the Locker view for the Drowned. |
| **Anything that doesn't work with multiple devices?** | Pass-the-phone is unworkable here and is **out of scope**. |

**Profile:** individual devices with a host-authoritative night resolver and a `readyCheck` matrix for Nightwatch. **Targeted writes are important here** — the Navigator's reading and the mutineers' shared identity must go only to the right devices (sharper than a couch-security broadcast, since the false-info layer makes leakage more damaging). The app holds the truth and resolves the grog-spike *before* computing each player's returned information.

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — player names (5–10); mutineer count derived automatically.
3. **Role reveal** — private: "You are the Navigator," or "You are a Mutineer — your crewmates are Boris and Erin."
4. **Nightwatch** — the private night-action screen per role (Navigator picks a bunk; Surgeon picks a patient; mutineers coordinate a kill + the Bosun a spike; Deckhands see a "sleeping" screen). Ready check.
5. **Reading result** — the Navigator's private (possibly false) reading.
6. **Dawn / Muster** — the app narrates who was lost overboard; the crew gathers.
7. **The Plank (vote)** — public show-of-hands to send a suspect overboard.
8. **Plank resolution** — the suspect walks; role revealed (if Plank Reveal is On); splash to the Locker.
9. **The Locker** — the Drowned spectate and use their bounded nightly nudge (and, in Sylly, aim the Kraken).
10. **The Reckoning (game over)** — which side won, full role reveal, Set Sail Again? / exit.

*Standard overlays:* settings (Ship's Articles 📜), how-to, quit (Abandon Ship?), play-again (Set Sail Again?).

---

## 12. Open Questions & Design Notes (REQUIRED)

### Decisions Log — calls made for your review (override any on review)
- **Villains:** a scaling **Mutineer team** (not a lone wolf); the **Kraken is saved for Sylly Mode**, not the base game.
- **Misinfo engine:** **drunkenness, weaponised** — the Bosun spikes a crewmate's grog each night, corrupting their action. Not random; a deliberate play.
- **Info reliability:** the Navigator's reading is **true unless grog-spiked** (then flipped) — noise on a reliable signal, so reads still matter.
- **Tone:** **chaos-forward with a deduction spine** — punchy, legible roles over fiddly ones; rewards loud participation, not silent small-play.
- **The dead:** **bounded Locker ghosts** (shared nightly nudge, non-deciding), consistent with the Sleepwalker pattern.
- **Win conditions:** crew win when all mutineers are gone; mutineers win at parity; Cabin Boy wins if planked.
- **Plank Reveal:** ON by default (role shown when someone walks).
- **Plank vote:** public show of hands (table drama); a tie means nobody walks.
- **First-night grace:** Nightwatch 1 allows the Bosun to spike but **no kill**, so nobody is out before the first day's banter.
- **Complexity tiers:** Quartermaster enters at Standard, Cabin Boy at Full — keeps the core clean while offering chaos.
- **Multiplayer:** individual devices only; pass-the-phone out of scope.

### Still genuinely open
- **Mutineer scaling thresholds** + whether the lone (5–6p) mutineer's "kill **or** spike" fork feels right vs. always allowing both. *(NON-BLOCKER — tuning.)*
- **Cabin Boy** — confirm Full-only, and that his win is personal (game continues for the rest) rather than ending the game. *(NON-BLOCKER.)*
- **Locker nudge** — the exact bounded mechanic ("rattle the rigging") needs a play pass to pitch right. *(NON-BLOCKER.)*
- **Quartermaster** — confirm the one-shot pistol is a pure day action (unaffected by grog), to keep it legible. *(NON-BLOCKER.)*

### Flag for Claude Code (technical)
- **Targeted writes** for role/mutineer identity and the Navigator's reading; the app must resolve the grog-spike *before* computing returned info.
- **Night resolution order** — spike → protection → kill → reading, computed host-side.
- **Ready-check matrix** for Nightwatch so the day can't open until all night actions are in (with a timeout fallback for AFK players).

### Out of scope for v1
- The Kraken as a base-game mechanic (it's the Sylly).
- A large/expanding role roster — v1 stays with the punchy set above.
- Pass-the-phone mode.

**General note:** protect the two things that make it sing — the **banter** (keep night/day transitions fast and let people argue) and the **grog payoff** (the moment a confident wrong read blows up is the whole game). Keep death light and comedic throughout.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Werewolf / Mafia (the night-kill deduction skeleton); Town of Salem (info roles); a dash of Blood on the Clocktower's "your information might be a lie" — minus the human Storyteller. |
| **Tone** | Warm, loud, rowdy, slapstick-pirate. Chaotic and swingy, never grim — walking the plank is a punchline, the Locker is a splash-about, not a graveyard. |
| **Should NOT feel like** | Grim competitive Werewolf where the correct play is to stay silent and small, or a dark witch-trial. It should reward loud participation and big swings. |
| **Example phrases / copy already written** | "There's a mutiny brewing. Find the rats before you all go overboard." · Walk the Plank · Lost Overboard · grog-soaked · the Bosun spiked your grog · Davy Jones' Locker · the Mutiny is Quashed · the Ship is Taken · Set Sail Again? |

---

## 14. Sample Round (REQUIRED)

**Setup:** 7 players — **Ada, Boris, Chloe, Dev, Erin, Finn, Gail**. Crew Complexity Standard, Plank Reveal On. At 7 players there are **2 Mutineers**.

*Roles (app-assigned, hidden):* **Ada** — Navigator · **Chloe** — Ship's Surgeon · **Dev** — Quartermaster · **Finn, Gail** — Honest Deckhands · **Boris** — Mutineer · **Erin** — Mutineer & **Bosun**. (Honest Crew: Ada, Chloe, Dev, Finn, Gail. Mutineers: Boris, Erin.)

**Nightwatch 1** (no kill on the first night — grace; spike only):
- **Erin (Bosun)** spikes **Ada (the Navigator)** with grog.
- **Ada (Navigator)** checks **Boris**. The true answer is *Mutineer* — but she's grog-soaked, so the app feeds her **"Loyal."** She now wrongly trusts Boris.
- **Chloe (Surgeon)** patches **Dev**.
- Dawn: nobody was lost (grace night). The crew musters none the wiser.

**Muster 1:** light chatter, no deaths yet, no plank (or an early throwaway vote). The seeds are set: Ada is quietly confident about Boris.

**Nightwatch 2:**
- **Mutineers (Boris + Erin)** drag under **Chloe (the Surgeon)** — a smart removal.
- **Erin (Bosun)** spikes **Dev (the Quartermaster)** for good measure.
- **Ada (Navigator)**, sober this time, checks **Erin** → correctly reads **"Mutineer."**
- **Chloe (Surgeon)** patched **Gail**, not herself — so she isn't protected.
- Dawn: **Chloe is Lost Overboard** and splashes into the Locker. The Surgeon is gone.

**Muster 2:** Ada now has conflicting intel in her head — she "knows" Boris is Loyal (the spiked lie) *and* Erin is a Mutineer (the true read). She accuses **Erin** hard. But **Boris**, the other mutineer, loudly defends Erin and points the finger at **Finn**, sowing doubt: *"How do we know Ada wasn't three sheets to the wind on night one?"* — which, ironically, is exactly what happened. The crew wavers between Erin and Finn.

**The Plank:** the vote splits, then lands on **Erin**. She walks the plank, revealed as a **Mutineer** — the crew got one! Erin splashes to the Locker.

**State after Watch 2:** Mutineers down to **Boris** alone (1) vs Honest Crew **Ada, Dev, Finn, Gail** (4), with Chloe and Erin in the Locker sharing the bounded nudge. The crew are ahead — but Boris is still hidden behind Ada's grog-soaked night-one lie that he's "Loyal." The tension now: will the crew remember that Ada's vouch for Boris came from a night she was spiked?

*(This sample shows the whole engine: hidden roles, the grace first night, a Bosun spike turning a true read into a confident lie, a smart mutiny kill, a public plank that nets a real mutineer, and the lingering damage of weaponised grog.)*

---

## Open Questions

1. **[NON-BLOCKER]** Mutineer scaling thresholds, and whether the lone (5–6p) mutineer's "kill **or** spike" fork is the right balance vs. allowing both.
2. **[NON-BLOCKER]** Confirm the Cabin Boy is Full-complexity only and his win is personal (the game continues for the others).
3. **[NON-BLOCKER]** The Locker "rattle the rigging" nudge — exact bounded mechanic, to be pitched in a play pass.
4. **[NON-BLOCKER]** Confirm the Quartermaster's pistol is a grog-immune day action.

*No BLOCKERs. The core loop, role set, weaponised-grog misinfo engine, win conditions, scaling, settings, Sylly Mode, and multiplayer profile are all resolved and recorded in the §12 Decisions Log. The remaining items are tuning values and chaos-role confirmations Claude Code can carry into the technical spec.*
