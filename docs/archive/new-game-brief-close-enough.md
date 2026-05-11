# New Game Brief — Close Enough (CE)

## 1. Identity

| Field | Your answer |
|-------|-------------|
| **Full name** | Close Enough |
| **Short ID / abbreviation** | `ce` |
| **Tagline** | Not quite right, but right enough for us. |
| **Emoji / icon** | 📐 |
| **Brand colour** | **Amber** |
| **Thematic universe** | **The Ballpark.** A world of rough sketches, "guestimates", and creative logic where being "technically correct" is boring. |

---

## 2. Players

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–6 (Default: 4) |
| **Teams or individuals?** | Free-for-all |
| **Roles** | All players are **Estimators** and **Voters**. |
| **Phone handling** | **Pass around.** Sequential inputs, simultaneous reveal, sequential ranked voting. |
| **Turn structure** | Players pass the phone to enter their Ballpark. Then it's put in the centre for the Reveal. Then passed again for the Verdict. |

---

## 3. Core Mechanic

**In one sentence, what does a player DO on their turn?**
> A player creates a custom "measurement" (a Number + a Metric) for a subjective prompt, then everyone else ranks all entries to decide who best captured the group's vibe.

**What is the central tension or challenge?**
> To be the most relatable or hilarious person in the room.

**What type of interaction is at the heart of it?**
> Creative Comparison & Ranked Voting.

**Is there a hidden element?**
> Yes. Inputs are secret until the "Reveal" phase, where they are shown anonymously (sorted by number).

**Is there a word or prompt drawn each round?**
> Yes. A subjective question drawn from `ce-prompts.json`.

---

## 4. Round Structure

Step 1 — **The Inquiry (Input)**:
- **Who acts:** All players.
- **What happens:** The phone is passed. Each player sees the prompt and enters a **Number** and a **Metric**.
- **On screen:** Prompt text + Numeric Input + Text Input ("The Metric").

Step 2 — **The Lineup (The Reveal)**:
- **Who acts:** None (Group Discussion).
- **What happens:** The PWA sorts all entries by **Number (Low to High)** and displays them as anonymous white cards. 
- **On screen:** A sorted lineup of cards showing "[Number] [Metric]". No names yet.

Step 3 — **The Verdict (Ranked Voting)**:
- **Who acts:** All players (one by one).
- **What happens:** Players pass the phone. Each person ranks **everyone else's** cards in order of preference (Best to Worst). You cannot vote for yourself.
- **On screen:** The list of cards with 1st, 2nd, 3rd, etc. selection buttons.

Step 4 — **The Reveal & Tally**:
- **Who acts:** All players.
- **What happens:** The PWA flips the cards to reveal the authors and shows the weighted points from the rankings.
- **On screen:** Authors revealed + Points animation + Updated Tally.

---

## 5. Win / End Condition

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | After a set number of Inquiries (Rounds). |
| **How is the winner determined?** | Highest cumulative score. |
| **Tiebreak: "Close Enough"** | (Default) Multiple winners are allowed. A shared victory. |
| **Tiebreak: "Only One"** | (Optional Setting) Triggers a Sudden Death question to determine a single champion. |
| **Post-game screen** | Final Standings leaderboard + "The Local Legend" badge for the winner(s). |

---

## 6. Scoring (Ranked)

| Rank Received | Points | Notes |
|---------------|--------|-------|
| 1st Place Vote | +3 | Main choice from another player. |
| 2nd Place Vote | +2 | |
| 3rd Place Vote | +1 | |
| Round Winner | +2 | Bonus for the author with the most total points in a single round. |

---

## 7. Settings

| Setting name | What it controls | Options | Default |
|------------------------|----------------------------------|---------|---------|
| **Inquiries** | Number of rounds | 3 / 5 / 8 | 5 |
| **The Decider** | Tiebreaker logic | Close Enough / Only One | Close Enough |

---

## 8. Sylly Mode: "The Saboteur"

| Field | Your answer |
|-------|-------------|
| **What does it change?** | Adds a curated "Ghost Card" to the reveal from a preset list of funny/absurd responses. |
| **Thematic name** | **The Saboteur** |
| **The Twist** | If the Saboteur card gets more 1st place votes than any human, everyone loses 2 points. |

---

## 9. Screens & Flow

- `CE_MENU` — Title card "Close Enough" + Start Mission button.
- `CE_SETUP` — Player count (3-6) + Toggle for "The Decider".
- `CE_PLAYERS` — Name entry screen for all participants.
- `CE_PROMPT` — Large display of the Inquiry question.
- `CE_INPUT` — Numeric + Text fields for the current player.
- `CE_REVEAL` — Anonymous sorted cards (The Lineup).
- `CE_VOTE` — Ranked selection buttons (1st, 2nd, 3rd...).
- `CE_RESULTS` — Reveal of authors + Points tally.
- `CE_GAMEOVER` — Final leaderboard and winner splash.

---

## 10. Terminology / Voice

| Concept | This game calls it |
|---------|-------------------|
| Round start prompt | "New Statement Closing In..." |
| The prompt | The Inquiry |
| The winner | The Local Legend |
| The end screen | The Final Result |

**Settings overlay title:** "The Ballpark Rules"
**Menu CTA button label:** "Start Estimating"
**Quit overlay copy:**
- Heading: "Abandon the Ballpark?"
- Subtext: "Your guesses will be lost to history."

---

## 11. Content / Words

| Field | Your answer |
|-------|-------------|
| **Inquiry List** | `ce-prompts.json` (Subjective questions) |
| **Saboteur List** | `ce-saboteur.json` (Preset Number + Metric pairs) |
| **Format** | `{"id": "ce-001", "text": "How many [X] is too many [X]?"}` |

---

## 12. Sample Round

**Setup:** 4 Players (Dave, Sarah, Mom, Dad). 
**Inquiry:** *"How many 'Dad Jokes' per hour is enough to be annoying?"*

1. **Dave:** `12` | `Puns that don't land`
2. **Sarah:** `5` | `Groans from the audience`
3. **Mom:** `1` | `If it's the same joke twice`
4. **Dad:** `100` | `Non-stop hilarity`

**Reveal (Sorted):** 1 (Mom) → 5 (Sarah) → 12 (Dave) → 100 (Dad).
**Voting:** Each player ranks the others. 
**Result:** Mom's "1 if it's the same joke twice" gets most 1st place votes. She is the Local Legend for the round.

---

## 13. Tiebreaker: "Only One" (Sudden Death)
*Finalists answer one "Aggression Scale" question:*
1. "On a scale of 1-100, how much do you want to see your opponent lose?"
2. "How many years of luck are you willing to trade for this win?"
3. "How many standard 'I'm not mad' lies have you told this session?"

---

## 14. Mood & References

- **Tone:** Silly, Creative, Relatable.
- **Pace:** Fast and punchy.
- **Target:** Families (specifically including the 5-year-old perspective).

---

## 15. Out of Scope (v1)

- No betting.
- No multiplayer over separate devices.
- No image generation.
