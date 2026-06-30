# New Game Brief — COLD SHOULDER
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

> **Origin note:** This is a reskin/distillation of *Globulos* (GlobZ, 2000 — later *Globulos Party* on DSiWare). The original was 20 minigames sharing one mechanic: aim a spherical creature, drag to set direction + power, then all players' moves resolve simultaneously on a physics board. **Cold Shoulder distils that to a single mode** — the "Sumo" / knock-off-the-edge variant — reskinned as penguins barging each other off an ice floe. The slippery ice diegetically justifies the low-friction sliding that makes the mechanic feel good. The underlying aim-and-fling physics engine is intended to be **reusable infrastructure** for a future cluster of physics games (goal/football, nearest-target/pétanque), the same way the card games share `cards.js`.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Cold Shoulder |
| **Short nickname / abbreviation** | `cld` *(confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt, shp)* |
| **One-sentence tagline** | "Barge your mates into the drink — last penguin on the floe wins." |
| **Thematic universe** | A crowded Antarctic ice floe; slapstick-cute penguin colony, gleeful schadenfreude, cosy-cold |
| **Emoji / icon** | 🐧 |
| **Brand colour preference** | Glacier Blue (a pale, icy blue) — `[ASSUMPTION: exact hex deferred to prototyping, per usual workflow]` |

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–8 |
| **Teams or individuals?** | Individuals — everyone for themselves (free-for-all) |
| **Are there different roles?** | No. Every player controls one penguin and does the same thing. |
| **Is any information hidden from some players?** | Yes — each player's chosen aim direction and power for the current Lunge is hidden from everyone else until all players commit and the Lunge resolves. This blind simultaneous commit is the core tension (you can't react to a rival's aim; you have to *read* them). |
| **Minimum meaningful player count** | 3. (Two works as a duel but loses the chaotic crowd; sweet spot is 4–6.) |

### Roles (if applicable)
No asymmetric roles. `[ASSUMPTION: v1 is one penguin per player. Multi-penguin teams — closer to original Globulos — are noted as out-of-scope expansion in §12.]`

**Notes:** The only "state" a player carries is whether their penguin is still on the floe this Floe-Off, and their Fish tally for the game.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Drag back from their own penguin to set a slide direction and power, then commit — and all penguins lunge at once.

**What is the central tension or fun moment?**
The blind simultaneous resolution. Everyone aims at the same time, can't see each other's plan, then watches the whole floe erupt into sliding, colliding penguins — with at least one comedic plunge into the freezing Drink. The "OHHH NO" / "I MEANT to do that" reaction is the game.

**What type of game is this closest to?**
☐ Word association / description
☐ Deduction / bluffing / social deception
☐ Trivia / knowledge
☐ Creative / lateral thinking
☒ **Something else: physics / dexterity party game (aim-and-fling, simultaneous-commit). This is the suite's first skill/physics game — every prior game is word/card/social.**

**Walk through one complete round step by step, in plain English:**

A **Floe-Off** (one match) is a sequence of **Lunges** until one penguin remains:

1. All surviving penguins start spread out on the floe. Each player sees the whole floe on their own phone, with their penguin highlighted.
2. Each player drags back from their penguin to aim — direction + power — and commits. Their aim stays private.
3. Once everyone has committed (a readiness check), the Host resolves the Lunge: every penguin slides at once, colliding, transferring momentum, knocking rivals around.
4. Any penguin that slides off the edge takes the plunge into the Drink and is out for the rest of this Floe-Off.
5. If two or more penguins remain, repeat from step 2 with the survivors.
6. When one penguin is left standing, it catches a **Fish** (one point). The floe refreezes (everyone back on) and the next Floe-Off begins.
7. First player to the target number of Fish wins the game.

**Is there anything players do simultaneously, or is everything sequential?**
Fully simultaneous. Every player aims at the same time; all moves resolve together. Nothing is sequential.

**How does the phone physically move between players?**
It doesn't — each player has their own device. (See §10. Pass-the-phone would break the blind-simultaneous commit, turning it into a different, sequential game — out of scope for v1.)

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When a player reaches the target Fish count (a host setting — see §6). |
| **How is the winner determined?** | The player with the target number of Fish (Floe-Off wins) first. |
| **Are ties possible, and if so how handled?** | A single Floe-Off has exactly one survivor, so it always awards exactly one Fish to one player — the *game* can't end in a tie because someone crosses the target alone. The edge case is a **Washout** (see §5): if a Lunge knocks the last remaining penguins into the Drink *simultaneously*, the floe ends empty — no Fish is awarded, the floe refreezes, and that Floe-Off replays. |
| **Roughly how long should a full game take?** | ~8–15 min. A Lunge resolves in a few seconds; a Floe-Off is a handful of Lunges; a game is a handful of Floe-Offs (default target 3 Fish). |

---

## 5. Scoring (REQUIRED)

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| Last penguin standing at the end of a Floe-Off | The survivor | +1 Fish | The only way to score in v1. |
| Knocked into the Drink | (nobody) | 0 | You're out for the rest of that Floe-Off; you return next Floe-Off. |
| **Washout** — final survivors all plunge on the same Lunge | (nobody) | 0 | Floe-Off voided, floe refreezes, replay. |

**Does scoring feel balanced?**
Self-balancing within a Floe-Off: as penguins fall, the floe empties and survivors have more room, so no runaway snowball. Across the game, blind simultaneous commit means even a strong aimer can't fully control outcomes — luck keeps everyone in it. `[ASSUMPTION: survival-only scoring is enough for v1. A "Shove bonus" — points for being the penguin that knocked a rival in — is noted as out-of-scope in §12; it would reward aggression but adds attribution complexity to the physics resolution.]`

**Any outcomes where nobody scores?**
Yes — the Washout (above). Defining it cleanly is important so a double/triple simultaneous plunge doesn't soft-lock the Floe-Off.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|------------------------------|---------------------|---------|---------|
| **Ice Conditions** *(difficulty-style, first)* | How slippery the floe is — i.e. how far penguins slide for a given pull. Grippier = more controllable = easier. | Powder (grippy) / Slush (medium) / Black Ice (very slippery) | Slush |
| **Floe Size** | Physical size of the playing area. Smaller = penguins crammed together = faster, more brutal eliminations. | Roomy / Standard / Cramped | Standard `[ASSUMPTION: may auto-scale to player count — see lock note below]` |
| **Fish to Win** | Number of Floe-Off wins needed to take the game. | 1 / 3 / 5 | 3 |
| **✨ The Thaw** *(Sylly Mode, last)* | See §7. | Off / On | Off |

**Are there any settings that should be locked or hidden in certain situations?**
- **Floe Size** likely auto-tightens with high player counts — a Roomy floe with 8 penguins would make eliminations rare and games drag. `[CLARIFICATION NEEDED: should Floe Size be a free host choice, or auto-scaled to player count (and therefore hidden/locked)?]`
- A possible **Aim Assist** setting (show a predicted trajectory line while aiming, on/off) is noted in §12 as a candidate addition — left out of the v1 settings list to keep it lean, but it's the natural accessibility/difficulty lever if Ice Conditions alone doesn't span enough range.

---

## 7. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | The Thaw |
| **In one sentence — what changes?** | The floe is melting — it shrinks a little after every Lunge, steadily shoving the surviving penguins together until the ice runs out from under someone. |
| **Does it add new screens or phases?** | No — same loop, the playing area just contracts each Lunge. |
| **Does it change scoring?** | No — still last-penguin-standing wins the Fish. |
| **Does it change the win condition?** | No — same Fish target. It just guarantees Floe-Offs resolve fast and chaotically (no more endless stalemate stand-offs, which was the original Globulos's biggest flaw against weak opposition). |

*Alternative name in reserve: "Meltdown."*

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Cold Shoulder calls it |
|---|---|
| Round (one match, fought to a single survivor) | **Floe-Off** |
| One simultaneous-commit resolution within a match | **Lunge** |
| Score / points | **Fish** (caught for winning a Floe-Off) |
| Game over screen | **The Final Floe** |
| Play again | **Refreeze** |
| Quit | **Waddle Off?** |
| Settings overlay title | **The Huddle 🐧** |
| The playing field | **The Floe** |
| Falling off the edge / the water | **The Drink** ("taking the plunge into the Drink") |
| A player still on the ice | **Standing** |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | No — there are no words/prompts. |
| **If yes — which categories?** | N/A |
| **If no — what kind of content does it need?** | Effectively none. Penguins are distinguished by colour (assigned per player) and simple programmatic faces; the floe is procedural geometry. All visuals/audio generated programmatically per the suite's standing constraint. |
| **Does it need a completely new data file?** | No. `[ASSUMPTION: no content file needed for v1. An optional cosmetic list — penguin name tags or hat variants — could be added later but isn't required.]` |
| **Any words or topics that should be excluded?** | N/A |

**Example entry:** N/A — no content entries.

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | Each player has their own device. |
| **Information that must stay private to one player/device?** | Yes — each player's aim (direction + power) for the current Lunge, until everyone commits and the Lunge resolves. |
| **Moments where players act simultaneously?** | Yes — every Lunge. All players aim and commit at the same time, then all resolve together. This is the whole game. |
| **Moments where one device should be locked while another is active?** | No turn-locking — it's simultaneous, not turn-by-turn. Devices are "open for aiming" together, then all watch the same resolution together. |
| **Any roles/phases that don't work with multiple devices?** | None — it's designed individual-device-first. Pass-the-phone would force sequential aiming (you'd see prior moves), which destroys the blind-commit tension; that variant is out of scope. |

*Plain-English intent for Claude Code: this is the suite's simultaneous-input pattern — collect every player's committed Lunge, run a readiness check, then the Host resolves one authoritative physics simulation and broadcasts the outcome.*

---

## 11. Screens — Plain English List (REQUIRED)

1. Game menu (every game has this)
2. Setup / player names + room code (every game has this)
3. The Huddle — host configures settings (Ice Conditions, Floe Size, Fish to Win, The Thaw)
4. Lobby — players join via room code, pick/are assigned a penguin colour, wait for host to start
5. The Floe (aiming) — your view of the whole floe with your penguin highlighted; drag back to aim your Lunge and commit; a quiet indicator shows who else has committed
6. The Lunge (resolution) — everyone watches the same animation: penguins slide, collide, and any unlucky ones plunge into the Drink
7. Floe-Off result — who's still Standing / who took the plunge; the survivor catches a Fish
8. Between-Floe-Offs scoreboard — current Fish tally, then the floe Refreezes for the next Floe-Off
9. The Final Floe (game over) — winner, final Fish tally, Refreeze / Waddle Off

---

## 12. Open Questions & Design Notes (REQUIRED)

**Unresolved design questions:**
- **Does blind simultaneous fling stay fun at high player counts?** With 7–8 penguins all committing blind, a Lunge could be pure chaos with little aim skill mattering. Needs a playtest — it may be that 3–6 is the real sweet spot and 7–8 wants The Thaw on by default, or a slightly larger floe. (The §14 sample round assumes it holds at 4.)
- **Elimination downtime on individual devices.** A player whose penguin plunges early in a long Floe-Off watches the rest. Lunges are quick so this is likely fine, but worth confirming it doesn't feel like sitting out. (Mitigations if needed: cap Lunges per Floe-Off, or The Thaw to force fast resolution.)
- **Is the aim genuinely hidden, or shown live?** v1 assumes hidden-until-reveal (the core tension). Worth confirming you don't prefer a more reactive "see everyone's arrows live" variant — it's a fundamentally different, less tense game.
- **Floe Size: free choice or auto-scaled to player count?** (See §6.)
- **Game name + brand colour** — "Cold Shoulder" / Glacier Blue are my picks; alternatives below in case you want to redirect (this is a directional call for you).

**Things that might be complicated to implement (flag for Claude Code):**
- **This needs a brand-new physics engine.** Reuses nothing from `cards.js`, `canvas-draw.js`, or `words.json`. It's a small deterministic 2D circle-collision + friction simulation (circles are the easy case, but it's genuinely new infrastructure). Build it as a reusable module — it's the seed for a future physics-game cluster, not a one-off.
- **Determinism across devices.** Every client must see the same outcome from the same inputs. Almost certainly wants host-authoritative resolution: Host runs the one true simulation and broadcasts the result (final positions and/or the input set for clients to re-sim and snap-correct). This is the single thing to nail in the tech spec.
- **Washout handling** (simultaneous final plunge) must be explicit so a Floe-Off can't soft-lock.

**Things explicitly OUT OF SCOPE for v1 (save for later):**
- The rest of the Globulos modes on the same engine — goal/football, nearest-target/pétanque, etc. (the cluster expansion).
- Multi-penguin teams per player.
- "Shove bonus" scoring (points for knocking a rival in).
- Pass-the-phone sequential variant.
- Cosmetics (hats, name tags).
- Aim Assist setting (candidate, not committed).

**General notes:**
- Tonally this is the most "video game" thing in the suite (skill/physics vs the existing word/card/social games). That's a deliberate range-expansion — flagging it so it's a chosen direction, not a surprise. The multiplayer-first soul matches the suite perfectly; only the *type* of fun (aim chaos vs conversation) differs.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Most similar to** | Globulos / Mucho Party (its Sumo mode specifically); shuffleboard; pool/billiards; King-of-the-Hill; the knock-each-other-off energy of party platformers like *Stumble Guys* / *Fall Guys* finals |
| **Tone** | Chaotic, slapstick, gleeful, cosy-cold; a splash of schadenfreude |
| **Should NOT feel like** | A precise physics *simulator* or a serious sports game. It's slapstick chaos, not a trick-shot puzzler — readability and laughs over fidelity |
| **Example phrases / copy** | "Into the Drink!" · "Last penguin Standing." · "Brace for the Lunge…" · "The floe is thawing…" (Sylly) · "You caught a Fish! 🐟" |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 players — Mia, Theo, Priya, Sam. Ice Conditions: Slush. Floe Size: Standard. Fish to Win: 3. The Thaw: Off. One Standard hexagonal floe; each penguin starts spread around it. This is **Floe-Off #1**.

**Lunge 1** (all aim blind, then resolve):
- **Mia** drags toward Theo, medium power — trying to barge him toward the near edge.
- **Theo** taps a soft nudge toward the centre — playing it safe.
- **Priya** aims hard at Sam, who's sitting near an edge.
- **Sam**, feeling exposed, aims toward the centre to escape.
- **Resolve:** everyone slides at once. Theo's already drifted centre, so Mia's barge whiffs and she coasts to a stop mid-floe. Priya's hard charge catches Sam *as* he's sliding centre; the combined momentum skews him sideways — he clips the edge and **takes the plunge into the Drink. 🐧💦** Priya, having charged full power, overshoots toward the far edge and teeters but holds.
- **After Lunge 1:** Sam's out for this Floe-Off. Standing: Mia, Theo, Priya.

**Lunge 2:**
- Priya's stuck precarious near the far edge. Both **Mia** and **Theo** aim at her; **Priya** flings hard toward centre to save herself.
- **Resolve:** Priya's centre-dash *almost* escapes, but Theo's hit clips her tail and spins her off the far edge → **Drink.** Mia and Theo bump gently and both stay on.
- **After Lunge 2:** Standing: Mia, Theo.

**Lunge 3:**
- **Mia** and **Theo** both aim full power straight at each other — blind.
- **Resolve:** near head-on; Mia's angle is a touch better, Theo glances off and slides clean off the edge → **Drink.** Mia is the last penguin Standing.

**Result:** Mia wins Floe-Off #1 and catches **1 Fish.** Tally — Mia 1, Theo 0, Priya 0, Sam 0. The floe **Refreezes** (all four back on) and Floe-Off #2 begins. First to **3 Fish** takes The Final Floe.

*(Washout illustration: had Mia and Theo knocked each other in on the same Lunge 3, the floe would have ended empty — no Fish awarded, Refreeze, replay the Floe-Off.)*

---

## Open Questions

1. **[NON-BLOCKER]** Does blind simultaneous fling stay fun at 7–8 players, or is 3–6 the real range (with The Thaw / bigger floe compensating up top)? — needs playtest; brief works as-is at 4.
2. **[NON-BLOCKER]** Floe Size: free host choice, or auto-scaled to player count (and hidden)? — assumed Standard/free for now.
3. **[NON-BLOCKER]** Aim hidden-until-reveal (assumed) vs live-arrows variant — confirm the blind-commit is the intended feel.
4. **[NON-BLOCKER]** Add an Aim Assist (trajectory preview) setting, or rely on Ice Conditions alone for difficulty range?
5. **[NON-BLOCKER]** Survival-only scoring (assumed) vs adding a Shove bonus later.
6. **[NON-BLOCKER]** Game name "Cold Shoulder" + Glacier Blue — confirm, or redirect. Name alternatives: *Last Waddle*, *Thin Ice*, *Floe* (`flo`), *Off the Floe*.
7. **[NON-BLOCKER → becomes technical]** Determinism strategy (host-authoritative resolution) is the crux for Stage 2 — not a design blocker, but the first thing the tech spec must resolve.

*No BLOCKERs: the brief is internally complete and the sample round runs without ambiguity. Every open item above has a working assumption already baked in.*
