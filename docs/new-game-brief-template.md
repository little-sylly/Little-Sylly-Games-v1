# New Game Brief — Template
> Copy this file, rename it `new-game-brief-[name].md`, and fill in every section before handing to Claude.
> The more detail here, the better the first build. Leave nothing blank — use "TBD" or "no preference" if genuinely unsure.

---

## 1. Identity

| Field | Your answer |
|-------|-------------|
| **Full name** | e.g. "Just Enough Cooks" |
| **Short ID / abbreviation** | e.g. `jec` — used in code as prefix for all variables and functions |
| **Tagline** | One sentence. What's the vibe in plain English? e.g. "Cook together. Score together. Blame each other." |
| **Emoji / icon** | The single emoji that represents this game on the lobby screen |
| **Brand colour** | The game's primary colour — used for CTAs, active pills, Done button. Pick one: pink / purple / teal / amber / orange / sky / rose / lime / or describe |
| **Thematic universe** | The world this game lives in — e.g. kitchen, space, school, crime, nature. Everything in-game should feel like it belongs here. |

---

## 2. Players

| Field | Your answer |
|-------|-------------|
| **Player count range** | e.g. 2–6. What's the minimum to make it fun? What's the maximum before it breaks? |
| **Teams or individuals?** | Free-for-all / fixed teams / flexible teams / one vs many |
| **Roles** | Are all players equal, or are there named roles? (e.g. Encoder vs Interceptors in SS, Describer in LI5) List each role and what they do. |
| **Phone handling** | Does the phone stay on the table? Pass around? One player holds it? |
| **Turn structure** | Sequential (one player at a time) / Simultaneous (all at once) / Hybrid |

---

## 3. Core Mechanic

> This is the most important section. Be specific — "players guess a word" is not enough.

**In one sentence, what does a player DO on their turn?**
> e.g. "Each player secretly writes 3 ingredients they associate with a food word, then the group reveals and scores based on overlap."

**What is the central tension or challenge?**
> e.g. "Think like everyone else, but not TOO like everyone else."

**What type of interaction is at the heart of it?**
> Describe / Guess / Vote / Rate / Bluff / Match / Build / Bid / Rank — or describe your own.

**Is there a hidden element?** (information one player has that others don't)
> Yes / No — if yes, describe what's hidden and from whom.

**Is there a word or prompt drawn each round?**
> Yes / No — if yes, where does it come from? (words.json food category / custom list / player-generated / etc.)

---

## 4. Round Structure

Walk through one full round step by step. Be explicit about who does what, in what order, and what information is revealed when.

```
Step 1 — [Name of phase]:
  Who acts: 
  What happens: 
  What is shown on screen: 

Step 2 — [Name of phase]:
  Who acts: 
  What happens: 
  What is shown on screen: 

Step 3 — [Name of phase]:
  Who acts: 
  What happens: 
  What is shown on screen: 

(add more steps as needed)
```

**Does the phone need to be passed during a round?**
> If yes, at which step(s)?

**Is there a timer in any phase?**
> Yes / No — if yes, which phase and what happens when it runs out?

---

## 5. Win / End Condition

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | After N rounds / when a player reaches X points / when a condition is met / etc. |
| **How is the winner determined?** | Highest score / last standing / first to X / etc. |
| **Are ties possible? How are they handled?** | |
| **Is there a "sudden death" or tiebreak?** | Yes / No — describe if yes |
| **Post-game screen** | What does the end screen show? Just scores? A winner splash? A round-by-round log? |

---

## 6. Scoring

| Outcome | Points | Notes |
|---------|--------|-------|
| [Good outcome] | +X | |
| [Bad outcome] | −X | |
| [Special case] | ×X | |

**Is scoring cumulative across rounds?**
> Yes / No

**Are there any multipliers, bonuses, or combos?**
> Describe any non-standard scoring logic.

**Can a player go negative?**
> Yes / No

---

## 7. Settings

List every setting the host should be able to configure before the game starts. For each, note the options and a sensible default.

| Setting name (thematic) | What it controls (plain English) | Options | Default |
|------------------------|----------------------------------|---------|---------|
| e.g. "Dishes" | Number of rounds | 3 / 5 / 10 | 3 |
| e.g. "The Sweet Spot" | Points for a perfect match | 10 / 20 / 30 pts | 20 |
| | | | |

**Is there a difficulty setting?** (controls word complexity — d1 easy / d1+d2 mixed / d3 hard)
> Yes / No — if yes, what's the thematic name and what does each tier feel like in this game's voice?

---

## 8. Sylly Mode

Sylly Mode is always the last setting and adds a twist for experienced players.

| Field | Your answer |
|-------|-------------|
| **What does Sylly Mode change?** | A new phase? A modifier on scoring? An extra role? A rule flip? |
| **Is it a full phase add-on or a round modifier?** | |
| **Thematic name for Sylly Mode in this game** | e.g. "Kitchen Nightmares" (JEC), "Neural Storm" (GM) |
| **What does the player gain by enabling it?** | Higher risk, higher reward? Extra chaos? A secret objective? |
| **Does it change the win condition?** | Yes / No |

---

## 9. Screens & Flow

List every screen the player will see, in the order they appear. Use the format: `SCREEN NAME — one-line description`.

```
LOBBY           — main lobby (already exists, just wire the button)
[GAME] MENU     — game title card + 4 menu buttons
[GAME] SETUP    — settings / roster entry
[GAME] [PHASE]  — first active screen
...
[GAME] GAMEOVER — end screen
```

**List any overlays needed:**
- Decision modals (quit confirm, merge confirm, etc.)
- Data overlays (settings, how-to, history/log)

---

## 10. Terminology / Voice

Fill in the game's internal vocabulary. These become the labels on screen and in code.

| Concept | This game calls it |
|---------|-------------------|
| A single game session | e.g. "a shift", "a mission", "a session" |
| One round | e.g. "a dish", "a round", "a wave" |
| The word/prompt drawn each round | e.g. "Today's Order", "The Signal", "The Subject" |
| A player's score | e.g. "points", "medals", "coins" |
| The score screen | e.g. "The Tally", "The Debrief", "Scoreboard" |
| The end-of-game screen | e.g. "Final Wash-up", "Mission Complete", "Game Over" |
| Play Again | e.g. "New Shift", "New Mission", "One More Go" |
| [Add more as needed] | |

**Settings overlay title:** e.g. "The Pantry Cabinet", "Frequency Configuration"
**Settings overlay subtitle:** plain English, e.g. "Prep before you cook."
**Menu CTA button label:** e.g. "Let's Cook!", "Let's Play!", "Start Mission"
**Quit overlay copy:**
  - Emoji: 
  - Heading (game-voiced): e.g. "Abandon the kitchen?"
  - Subtext (what's lost): e.g. "All scores and progress will be cleared."
  - Confirm button: e.g. "Yeah, close the kitchen."
  - Cancel button: e.g. "Not yet!"

---

## 11. Content / Words

| Field | Your answer |
|-------|-------------|
| **Does this game use words.json?** | Yes / No |
| **Which categories?** | List from: animals, food, places, objects, sports, nature, vehicles, jobs, activities, music, pop_culture, people, brands, emotions, actions, aussie_slang |
| **Which difficulty tiers?** | d1 only / d1+d2 / all / varies by setting |
| **Does it need custom data not in words.json?** | Yes / No — if yes, describe the format |
| **Secret Mode word substitution** | What subset of the expansion pack makes sense for this game? (e.g. JEC uses `category === 'food'`) |
| **Any content rules specific to this game?** | e.g. "Words must be nouns", "Avoid proper nouns", "Keep it family-friendly" |

---

## 12. Sample Round

> Write out one complete round as if you were playing with real players. Include player names, what they say/do, and what the screen shows at each step. This is the single most useful thing for Claude to reference.

```
Setup: [describe the starting state]

[Player A] sees: ...
[Player A] does: ...

[Player B] sees: ...
[Player B] does: ...

Screen shows: ...

Result: [what happened, what score changed]
```

---

## 13. Sample Phrasing / UI Copy

Provide example phrases in the game's voice for each of these moments. These seed the tone for all on-screen text.

| Moment | Example phrase |
|--------|---------------|
| Round start prompt | e.g. "Today's Order is in — check the board, Chef." |
| Correct / success | e.g. "Chef's Kiss! ✨" |
| Wrong / fail | e.g. "Back of the fridge for you." |
| Waiting for others | e.g. "Hold tight — the kitchen's still cooking." |
| Game over — winner | e.g. "Head Chef of the night: Sam!" |
| Game over — nobody won | e.g. "The kitchen burned down. Nobody wins." |
| [Add moments specific to your game] | |

---

## 14. Mood & References

| Field | Your answer |
|-------|-------------|
| **Real-world games it resembles** | e.g. "Codenames meets Just One" |
| **Tone** | Cosy / Competitive / Chaotic / Strategic / Silly / Tense — pick one or combine |
| **Pace** | Fast and punchy / Slow and deliberate / Builds over time |
| **Who is the target player?** | Casual family / Friend groups / Party animals / Word nerds / All of the above |
| **Anything it should NOT feel like?** | e.g. "Not too serious", "Not trivia-based" |

---

## 15. Out of Scope (v1)

List anything you're explicitly NOT building in the first version. This stops scope creep and keeps the first build shippable.

- e.g. No online multiplayer
- e.g. No custom word entry in v1 (add later)
- e.g. No animated transitions beyond standard card pop

---

## 16. Open Questions

Anything you're not sure about yet. Claude will ask about these before coding.

- 
- 

---
*Template version: Phase 12 — update alongside `ui-style.md` and `logic-engine.md` when standards change.*
