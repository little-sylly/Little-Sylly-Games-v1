# New Game Brief — Read the Room
**Document type:** Phase 1 — Design Brief
**Version:** v0.1 — first draft for review
**Source inspiration:** Wavelength (spectrum guessing)
**Status:** Parked pending MFS v1.4. Revisit before technical spec.

> ⚠️ **MFS Revisit Required**
> Written before multiplayer implementation. Before converting to a technical spec, review §10 (Multiplayer) against completed MFS v1.4 — particularly the private clue-giver view, the simultaneous dial-lock, and the team-vs-team optional layer.

---

## On the Title

**Recommended: "Read the Room."** Captures the social-calibration heart of the game — you're not guessing a fact, you're guessing how someone else's brain works.

Alternatives:
- **"Same Page"** — short, warm, the win-state expressed as a phrase
- **"Wavelength"** — taken (the source game), avoid
- **"Ballpark"** — the act of estimating, casual and friendly
- **"Roughly"** — funny, self-deprecating, captures the imprecision

This brief uses **Read the Room**. Short ID: `rtr`. Lock before technical spec.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Read the Room |
| **Short ID / abbreviation** | `rtr` |
| **One-sentence tagline** | *"One clue. One dial. Are we thinking the same thing?"* |
| **Thematic universe** | Light and abstract — no heavy world. The "theme" is the act of mental calibration itself: trying to land on the same wavelength as your friends. Framing leans into a warm, slightly retro "tuning a radio dial together" aesthetic. |
| **Emoji / icon** | 🎯 |
| **Brand colour** | `indigo-500` — calm, focused, distinct from existing palette. The dial gradient can run warm-to-cool across the spectrum. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 2–10 (best 4–8) |
| **Teams or individuals?** | Two modes: **Team mode** (two teams, the core Wavelength experience) or **Co-op mode** (everyone vs the dial, chasing a high score together). Team mode is primary. |
| **Are there different roles?** | One rotating role: **The Tuner** (the clue-giver who sees the hidden target). Everyone else guesses. |
| **Hidden information?** | Yes — only The Tuner sees where the target zone sits on the dial. |
| **Minimum meaningful count** | 3 (one Tuner, two guessers). 2 works in a stripped co-op variant. |

### Roles

| Role | Display name | What they know | What they do | Goal |
|------|-------------|---------------|--------------|------|
| Clue-giver | **The Tuner** (rotates each round) | The two ends of the spectrum + the hidden target zone | Give one clue that points to where the target sits | Help their team's dial land on the target |
| Everyone else | **The Room** | The two ends of the spectrum only — not the target | Discuss and place the dial where they think the target is | Land the dial as close to the centre of the target as possible |

The Tuner role rotates each round so everyone gets to give clues.

---

## 3. The Core Loop

**In one sentence:** The Tuner sees a hidden spot on a spectrum between two opposites, gives a single clue, and their team turns a dial to guess where that spot is.

**The central tension:** The gap between how the Tuner thinks and how everyone else thinks. The Tuner knows the target is, say, 70% of the way toward "Hot" on a Cold↔Hot spectrum. They say "a fresh coffee." Now the whole table argues: is fresh coffee 70% hot, or 85% hot, or only 60%? The clue is never precise enough — that's the fun. The discussion *is* the game.

**Game type:** ☑ Creative / lateral thinking (with a social-calibration core)

**One complete round, step by step:**

1. **A spectrum is drawn.** Two opposite concepts appear at the ends of a dial — e.g. *"Useless ↔ Essential"*, *"Underrated ↔ Overrated"*, *"Kids' food ↔ Fancy food"*. Everyone sees the two ends.

2. **The Tuner sees the target.** Only The Tuner's view shows a highlighted target zone somewhere on the dial (a scoring band, widest in the centre worth most, narrower edges worth less). Everyone else's dial is blank.

3. **The Tuner gives one clue.** A word or short phrase that places a concept somewhere on the spectrum. *"A fresh coffee."* The clue must not be a number or a direct position ("70%" is illegal).

4. **The Room discusses and dials.** The team turns the dial together (or in multiplayer, each player places privately, then the average or the captain's placement locks). Discussion is encouraged — this is where the laughs are. The Tuner stays silent, poker-faced.

5. **Lock it in.** The team commits their dial position.

6. **The reveal.** The hidden target zone slides into view. Scoring is by proximity:
   - Dead centre of target = max points (e.g. 4)
   - Adjacent bands = fewer points (3, 2)
   - Outside the target = 0
7. **(Team mode optional — the steal):** Before the reveal, the *opposing* team predicts whether the guessing team landed left or right of the true target. If correct, they steal a point. (This is Wavelength's core opposing-team mechanic — keeps the off-team engaged.)

8. **Rotate The Tuner. Next spectrum.** First team to a target score wins (e.g. 10), or play a fixed number of rounds.

**Simultaneously or sequential?**
- In team mode pass-the-phone: the team discusses openly and one person sets the dial — naturally sequential by team.
- In multiplayer: each guesser can place their own dial privately, then placements resolve (average, or the team captain confirms). The Tuner's view is always private.

**Phone handling:**
The Tuner needs a private view (they see the target; no one else can). In pass-the-phone: the phone shows the target to The Tuner, then they pass it / it's hidden while the team dials. In multiplayer: The Tuner's device shows the target; everyone else's shows the blank dial.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | Team mode: first team to the target score (default 10 points) wins. Co-op mode: after a fixed number of rounds, the group's total proximity score is rated against tiers ("Strangers" → "Best Friends" → "One Brain"). |
| **How is the winner determined?** | Team mode: highest score. Co-op mode: collective score band — everyone wins or loses together. |
| **Ties possible?** | Team mode: yes — play one sudden-death spectrum to break it. Co-op: N/A (collective). |
| **Session length** | 10–20 minutes. Rounds are ~60–90 seconds each. |

---

## 5. Scoring

No persistent individual scoring — scoring is per-team (team mode) or collective (co-op).

| Outcome | Points |
|---------|--------|
| Dial lands dead centre of target | 4 |
| Dial lands in the band adjacent to centre | 3 |
| Dial lands in the outer target band | 2 |
| Dial lands outside the target | 0 |
| (Team mode) Opposing team correctly predicts left/right | +1 to that team |

The target zone is a set of nested bands: a narrow centre (4), flanked by two bands (3), flanked by two outer bands (2), with everything beyond scoring 0. This is the Wavelength scoring gauge exactly.

**Co-op tiers** (total points across N rounds, as a percentage of max possible):
- 90%+ → "One Brain 🧠"
- 70–89% → "Best Friends"
- 50–69% → "Pretty In Sync"
- Below 50% → "Do You Even Know Each Other?"

---

## 6. Settings

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Mode** | Team vs Co-op | Teams / Co-op | Teams |
| **Target Size** | How wide the scoring zone is (difficulty) | Generous / Standard / Razor-thin | Standard |
| ✨ **Sylly Mode — "Static"** | Constrains the clue + adds interference | OFF / ON | OFF |

Keep settings minimal. Difficulty is expressed through Target Size (wider = easier). Mode selection could live on a mode screen rather than settings — decide in technical spec.

---

## 7. Sylly Mode — "Static"

| Field | Answer |
|-------|--------|
| **Thematic name** | Static |
| **In one sentence** | The signal's breaking up — your clue has to fight through interference. |
| **What changes** | The Tuner's clue is constrained by a random "interference" rule drawn each round: *"Movies only"*, *"Foods only"*, *"One word only"*, *"Must be a person"*, *"Emotions only"*. The Tuner must give a clue that obeys the constraint while still pointing to the target. Ramps difficulty and comedy. |
| **New screens?** | No — the interference constraint appears on The Tuner's view alongside the target. |
| **Changes scoring?** | No. |
| **Changes win condition?** | No. |

---

## 8. Thematic Vocabulary

| Generic term | Read the Room calls it |
|---|---|
| Clue-giver | **The Tuner** |
| Guessers | **The Room** |
| The spectrum / scale | **The Dial** |
| The two opposite concepts | **The Extremes** |
| Hidden target zone | **The Signal** |
| The clue | **The Read** |
| Round | **Round** (kept simple) |
| Lock in the guess | **"Lock It In"** |
| Reveal | **"Tune In"** |
| Opposing team's left/right bet | **The Call** |
| Game over | **Final Frequency** |
| Co-op result | **Group Sync** |
| Play again | **"Go Again"** |
| Quit | **"Switch Off?"** |
| How to Play title | **"How to Tune In 🎯"** |
| Sylly Mode label | **✨ Static** |

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No |
| **New data file needed?** | Yes — `data/rtr-data.json` |
| **Entry schema** | `{ id, left, right, difficulty }` — the two ends of a spectrum |
| **Example entries** | `{ left: "Useless", right: "Essential" }`, `{ left: "Kids' food", right: "Fancy food" }`, `{ left: "Underrated", right: "Overrated" }`, `{ left: "Forgettable", right: "Iconic" }`, `{ left: "A chore", right: "A treat" }` |
| **Content cost** | Low — each entry is just two opposing words. Hundreds are easy to write. Lowest per-entry cost of any content game. |
| **Sylly Mode interference rules** | A small hardcoded array of constraints (~8–10), not part of the data file. |

The spectra should be subjective/opinion-based, not factual. "Cold ↔ Hot" works for objects; "Overrated ↔ Underrated" works for opinions and is funnier. A good content guide (`docs/rtr-content-guide.md`) should steer writers toward spectra that spark argument.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | Works well both ways. Pass-the-phone is genuinely fine here (one person tunes, passes, team dials together on one screen). Multiplayer adds private individual dialing. |
| **Private information** | The Signal (target zone) — visible only to The Tuner. This is the one piece of private data. |
| **Simultaneous actions** | Optional — in multiplayer, each guesser can place their own dial privately, then placements resolve. Or the team dials together on the captain's device. |
| **Locked devices** | The Tuner's device during the guess phase shows the target but no dial control (they can't guess their own clue). |
| **Pass-the-phone fallback** | Excellent — arguably the most pass-the-phone-friendly game in the box. The Tuner sees the target, hides the screen, the team debates and dials. |

> ⚠️ **MFS Revisit — §10:** Decide whether multiplayer uses per-player private dials (averaged) or a single captain dial. Per-player private dials + average is the richer experience and a strong showcase for the dial-as-input on individual screens. Confirm against MFS v1.4.

---

## 11. Screens — Plain English List

1. **Game menu** — title, tagline, How to Play, mode selection, Static toggle, Back to the Box
2. **Setup** — team names / player names (depending on mode). Multiplayer: lobby.
3. **Tuner reveal** — The Tuner privately sees the spectrum's two ends + the hidden Signal zone + (Sylly) the interference rule. Pass-gate before this in pass-the-phone.
4. **The Dial (main screen)** — the persistent game board. Shows the two Extremes at each end of a dial. The Tuner's clue is displayed. The Room turns the dial. The opposing team makes The Call. Reveal animates the Signal into view. All on one screen, elements updating.
5. **Round result** — proximity score for this round, running team totals (or co-op tally)
6. **Final Frequency** — game over: winning team or co-op sync tier

---

## 12. Design Notes

### The Dial — the signature component

This is the heart of the game and the thing that must feel *great* on a touchscreen. Design notes:

- A large arc/gauge spanning roughly 180°, two Extremes labelled at each end
- A draggable needle/pointer the player sweeps across the arc
- Smooth, weighty drag feel — this should feel like tuning an analog radio, with a subtle haptic tick as it moves (if supported)
- The Tuner's view: the Signal zone shown as coloured nested bands behind the arc (centre brightest)
- The Room's view: arc is blank — no bands visible — until the reveal
- Reveal animation: the needle locks, then the hidden bands fade/slide into view behind it, then the score tallies with a satisfying sound

This is the most novel UI in the whole box — no existing game has a draggable analog input. Worth prototyping the dial in isolation first.

### The Steal (opposing team's Call)

In team mode, after The Room locks their dial but before the reveal, the opposing team gets one chance to say "we think they're too far LEFT" or "too far RIGHT." If they're right (the true Signal is on that side of The Room's guess), they steal a point. This keeps the non-guessing team fully engaged every round and adds a second layer of mind-reading. It's optional — could be a setting, or always-on in team mode.

### Co-op mode

Strips out teams and the Steal. Everyone is The Room together; the Tuner rotates. The group chases a collective score across a fixed number of rounds, rated against the sync tiers in §5. This is the gentler, more cooperative texture — good for groups who don't want competition. Adds variety to the box (only In Sync, if built, would also be co-op).

---

## 13. Out of Scope for v1

- Per-player individual scoring (it's team/collective by design)
- Custom spectra (host-written) — content file only for v1
- A "free play / sandbox" dial mode
- Animated theming beyond the dial reveal
- More than two teams

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | Wavelength (direct source), with a dash of the cooperative warmth of The Mind |
| **Tone** | Warm, playful, argumentative-in-a-good-way. The retro-radio framing keeps it light. |
| **Should NOT feel like** | A trivia game (there are no facts), or a precision/maths exercise (the imprecision is the point) |
| **Example phrases** | "Where does this land?" / "That's WAY more essential than that." / "You said a fresh coffee, that's like... 80% hot!" / "Lock it in." / "Tune in..." |

---

## 15. Sample Round

**Setup:** 6 players, team mode, 2 teams of 3. Team A's turn. Mia is The Tuner for Team A.

**Spectrum drawn:** *"Useless ↔ Essential"*. Both ends visible to everyone.

**The Signal (Mia sees only):** target zone sits at roughly 75% toward "Essential."

**Mia's Read (clue):** *"A phone charger."*

**The Room (Jake & Priya) discuss:**
*"A charger's pretty essential." / "But not LIKE water essential." / "Yeah it's high though, like 80%?" / "Maybe a bit less, you can borrow one." / "70?"* — they dial to ~72%.

**The Call (Team B):** *"We think they went a touch too low — the true signal is RIGHT of their guess."*

**Lock it in. Tune in.** The Signal reveals at 75%. Team A's dial at 72% lands in the adjacent band → **3 points**. Team B called RIGHT correctly (75 > 72) → **+1 to Team B**.

**Rotate.** Next round, Team B tunes. New spectrum.

---

*What this round illustrates: the clue ("a phone charger") was never precise. The fun was three people arguing about exactly how essential a charger is. Team B stayed engaged by betting on the direction of the error. Nobody needed to know a fact — they needed to read how Mia's brain works.*
