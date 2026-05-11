# New Game Brief — Natural Selection
> Status: Final v1.0
> Short ID: `nat`

---

## 1. Identity

| Field | Your answer |
|-------|-------------|
| **Full name** | Natural Selection |
| **Short ID / abbreviation** | `nat` |
| **Tagline** | "One of you doesn't know what they're looking at." |
| **Emoji / icon** | 🦁 |
| **Brand colour** | Lime |
| **Thematic universe** | A high-budget BBC/Attenborough-style wildlife documentary. |

---

## 2. Players

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–8 players. |
| **Teams or individuals?** | One vs. Many (The Mole vs. The Research Team). |
| **Roles** | **Lead Biologist** (1) — sees the full animal name. **Field Researchers** (everyone else) — each sees a *different* word drawn from `nono_list[1–9]`. **The Mole** (1) — sees only `nono_list[0]`, the Broad Shield (e.g. "Sea Creature", "Furry Animal"). |
| **Phone handling** | Pass around — sequential only. |
| **Turn structure** | Sequential (all modes). |

---

## 3. Core Mechanic

**In one sentence, what does a player DO on their turn?**
Each player privately reads their assigned field observation (the animal name, a specific detail word, or the Broad Shield) and submits exactly one word to describe the specimen without naming it.

**What is the central tension or challenge?**
Researchers must be specific enough to prove they know the animal — but vague enough not to hand the Mole a free identification. The Mole must use their generic Broad Shield word to blend in without revealing they're working from a category, not a specimen.

**What type of interaction is at the heart of it?**
Describe / Vote / Bluff.

**Is there a hidden element?**
Yes. One player (The Mole) does not know the specific animal, only its primary grouping.

**Is there a word or prompt drawn each round?**
Yes, from the `animals` category in `words.json`.

---

## 4. Round Structure

Step 1 — The Reveal:
  Who acts: All players.
  What happens: Players tap to reveal their role and "Field Notes."
  What is shown on screen: Role name + specific word (Biologist/Researcher) or Grouping (Mole).

Step 2 — The Observation:
  Who acts: Sequential (starting with Lead Biologist).
  What happens: Each player submits a one-word clue. UI blocks: (a) the animal name, (b) the player's own assigned observation word, (c) any word already submitted this round.
  What is shown on screen: Clue input field with banned word filtering. Submitted clues accumulate visibly once the last player is done.

Step 3 — The Eviction:
  Who acts: All players (sequential, pass the phone).
  What happens: Each player votes for the suspected Mole. No deliberation. Highest-vote player is evicted. Ties: lowest Credibility of tied players is evicted; if still tied, round ends with no eviction (Mole wins by default).
  What is shown on screen: List of player names (excluding self) with "Vote" buttons. Each player votes once.

Step 4 — Final Identification:
  Who acts: The Mole (if caught), then the Lead Biologist.
  What happens: The Mole gets one attempt to guess the specific specimen name. The Lead Biologist then taps "Confirmed" or "Disputed" to rule on whether the guess is close enough.
  What is shown on screen: Text input for the Mole's guess, then a Confirmed / Disputed binary for the Biologist to judge.

---

## 5. Win / End Condition

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | After 3–5 "Observations" (rounds). |
| **How is the winner determined?** | Highest cumulative Credibility score. |
| **Are ties possible?** | Yes, shared victory. |
| **Post-game screen** | Winner splash: "Lead Researcher of the Expedition" + Round Log. |

---

## 6. Scoring

| Outcome | Who scores | Credibility | Notes |
|---------|------------|-------------|-------|
| Mole remains hidden (not evicted) | The Mole | +20 | Mole wins the round. |
| Mole remains hidden (not evicted) | Lead Biologist + all Researchers | 0 | Failed to identify. |
| Mole caught — guesses specimen correctly | The Mole | +15 | Caught but steals the research. |
| Mole caught — guesses specimen correctly | Lead Biologist + all Researchers | 0 | Exposed but not contained. |
| Mole caught — guess wrong or no guess | Lead Biologist + all Researchers | +10 | Each Researcher scores equally. |
| Mole caught — guess wrong or no guess | The Mole | 0 | Research secured. |

---

## 7. Settings

| Setting name | What it controls | Options | Default |
|--------------|------------------|---------|---------|
| **Expedition Length** | Number of rounds | 3 / 5 / 7 | 3 |
| **Field Difficulty** | Word complexity | d1 / d1+d2 / all | d1+d2 |

---

## 8. Sylly Mode

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **Survival of the Fittest** |
| **Is it a full phase add-on or round modifier?** | Round modifier — the Observation phase splits into two passes. |
| **What does it change?** | **Pass 1:** every player submits one generic clue (broad, category-level thinking — no detail words yet). **Pass 2:** Researchers may now submit a second, more specific clue using their assigned detail word. The Mole submits a second generic clue. All clues from both passes are visible during The Eviction. |
| **Eviction** | Unchanged — standard single-vote eviction. |
| **Scoring** | Unchanged — standard Credibility table. |
| **Does it change the win condition?** | No. |
| **Descoped to v2** | Ranked suspicion voting, Suspicion Score leaderboard, Naturalist's Commendation. |

---

## 9. Screens & Flow

NAT_LOBBY        — Main lobby (shared)
NAT_MENU         — Title card + 4 menu buttons
NAT_SETUP        — Settings (Permit Office)
NAT_BRIEFING     — The Briefing — each player taps to reveal their field observation (role gate)
NAT_OBSERVATION  — The Observation — sequential clue input
NAT_EVICTION     — The Eviction — voting screen
NAT_LAST_STAND   — Final Identification — Mole's guess + Biologist verdict
NAT_TALLY        — The Field Notes — per-round score reveal
NAT_GAMEOVER     — Final Report — expedition winner + round log


---

## 10. Terminology / Voice

| Concept | This game calls it |
|---------|-------------------|
| The impostor role | **The Mole** |
| The word drawn each round | **The Specimen** |
| The Broad Shield (Mole's info) | **The Grouping** |
| A player's score | **Credibility** |
| One round | **An Observation** |
| The clue phase | **The Observation** (NAT_OBSERVATION) |
| The role reveal phase | **The Briefing** (NAT_BRIEFING) |
| The per-round score screen | **The Field Notes** (NAT_TALLY) |
| The end-of-game screen | **The Final Report** (NAT_GAMEOVER) |
| Play Again | **New Expedition** |

**Settings overlay title:** "The Permit Office 🦁"
**Settings overlay subtitle:** "Configure the expedition before you head out."
**Menu CTA button label:** "Begin Observation"
**Quit overlay copy:**
- Emoji: 🔬
- Heading: "Abandon the expedition?"
- Subtext: "All observations and Credibility will be lost."
- Confirm button: "Yeah, pack up."
- Cancel button: "Keep watching."

---

## 11. Content / Words

| Field | Your answer |
|-------|-------------|
| **Does this game use words.json?** | Yes |
| **Which categories?** | `animals` |
| **Scientific Integrity** | Blocks duplicate words and the animal name itself. |
| **The Mole's Data** | Always uses The Grouping at `nono_list[0]` (the Broad Shield / Documentary Label). |

---

## 12. Sample Round

**Setup:** 4 players. Specimen: **Elephant**.

**[Sam (Biologist)] sees:** "Elephant"
**[Wife (Researcher)] sees:** "Trunk"
**[Friend (Mole)] sees:** "Land Giant"

**Phase — The Observation:**
* Sam: "Wrinkled."
* Wife: "Tusks."
* Mole: "Heavy."

**Result:** Mole is voted out. Mole guesses "Elephant" because of the "Tusks" clue.
**Score:** Mole gains +15 Credibility.

---

## 13. Sample Phrasing / UI Copy

| Moment | Example phrase |
|--------|---------------|
| Round start prompt | "Quiet on set. Specimen in sight." |
| Success (Mole caught) | "The anomaly has been identified." |
| Fail (Mole wins) | "The Mole blended in. Research compromised." |
| Mole caught | "Mole, make your final identification." |

---

## 14. Mood & References

| Field | Your answer |
|-------|-------------|
| **Real-world games** | *The Chameleon* meets *Just One*. |
| **Tone** | Tense / Educated / Strategic. |
| **Pace** | Fast and punchy. |
| **Target player** | Animal lovers and social deduction fans. |
| **Should NOT feel like** | Generic trivia or a simple guessing game. |

---

## 15. Out of Scope (v1)

- No animated wildlife footage.
- No custom animal categories outside of `words.json`.
- No team-based play.

---

## 16. Resolved Design Questions

- **Same or different detail words?** Each Researcher sees a DIFFERENT word from `nono_list[1–9]`.
- **Blocking rule:** Block (a) the animal name and (b) any word already submitted this round. No super-block on the full nono_list.
- **Biologist's block:** Same rule — blocked from the animal name and any already-submitted clue.
- **Minimum player count:** 4 (UI: 4/5/6/7/8 pills). 3-player removed from v1 — structurally unbalanced.
- **Timer:** Untimed in v1.
- **Simultaneous mode:** Removed — sequential only in all modes.
- **Eviction tie-break:** Lowest current Credibility among tied players. If still tied, Mole wins by default.
- **Sylly Mode ranked voting:** Descoped to v2.