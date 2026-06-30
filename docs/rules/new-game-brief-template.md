# New Game Brief — [GAME NAME]
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + Gemini AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **How to use this document**
> Work through every section. Nothing needs to be technically correct — write in plain English, describe what you imagine, note what you're unsure about. Use "TBD" only if genuinely undecided. Claude Code will flag any design gaps before implementation begins.
> Sections marked **(REQUIRED)** must be filled in completely. Sections marked **(if applicable)** can be skipped with a note if they don't apply.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | |
| **Short nickname / abbreviation** (3–4 letters, used in code) | |
| **One-sentence tagline** (what appears under the game title) | |
| **Thematic universe** (a mood, setting, or real-world reference — e.g. "BBC wildlife documentary", "naval warfare", "dinner party gossip") | |
| **Emoji / icon** (one emoji that represents the game) | |
| **Brand colour preference** (a colour word — e.g. "lime green", "deep navy", "warm amber") | |

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** (e.g. 3–8) | |
| **Teams or individuals?** (everyone for themselves, or split into teams) | |
| **Are there different roles?** (yes/no — if yes, describe each role in plain English below) | |
| **Is any information hidden from some players?** (yes/no — if yes, describe what and from whom) | |
| **Minimum meaningful player count** (what's the smallest group where it's actually fun?) | |

### Roles (if applicable)
For each role, describe in plain English:
- What do they know at the start? (what information do they receive)
- What do they do on their turn?
- What are they trying to achieve?
- Is there anything they must NOT say or do?

| Role name | What they know | What they do | Their goal | Any restrictions |
|-----------|---------------|--------------|------------|-----------------|
| | | | | |
| | | | | |
| | | | | |

**Notes / anything that doesn't fit the table:**

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**

**What is the central tension or fun moment?**
(The moment where players lean in, argue, laugh, or hold their breath)

**What type of game is this closest to?**
☐ Word association / description
☐ Deduction / bluffing / social deception
☐ Trivia / knowledge
☐ Creative / lateral thinking
☐ Something else: _______________

**Walk through one complete round step by step, in plain English:**
(Number each step. Don't worry about screen names or technical terms — just describe what happens.)

1.
2.
3.
4.
(add more as needed)

**Is there anything players do simultaneously, or is everything sequential (one at a time)?**

**How does the phone physically move between players?**
(e.g. passed around the table, stays in the middle, each person has their own device)

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** (e.g. after X rounds, when someone reaches X points, when a specific event happens) | |
| **How is the winner determined?** | |
| **Are ties possible, and if so how are they handled?** | |
| **Roughly how long should a full game take?** | |

---

## 5. Scoring (REQUIRED)

List every outcome that earns or loses points. Plain English — no formulas needed yet.

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| | | | |
| | | | |
| | | | |

**Does scoring feel balanced?** 
(In a full game, does it feel like every player has a fair shot, or is there a dominant strategy that needs to be addressed?)

**Any outcomes where nobody scores?**

---

## 6. Settings (REQUIRED)

List every dial the host can turn before the game starts. For each one:

| Setting name (plain English) | What does it change? | Options | What should the default be? |
|------------------------------|---------------------|---------|----------------------------|
| | | | |
| | | | |
| | | | |

**Are there any settings that should be locked or hidden in certain situations?**
(e.g. a setting that only makes sense for 4+ players, or one that's only relevant in a specific mode)

---

## 7. Sylly Mode (if applicable)

Sylly Mode is always the last setting in every game — it's the "wild" variant that makes the game harder, weirder, or more chaotic. If this game doesn't have a Sylly Mode concept yet, write "None — will design later."

| Field | Your answer |
|-------|-------------|
| **Thematic name** (e.g. "Survival of the Fittest", "Mission Abyss", "Kitchen Nightmares") | |
| **In one sentence — what changes?** | |
| **Does it add new screens or phases?** (yes/no — describe if yes) | |
| **Does it change scoring?** (yes/no — describe if yes) | |
| **Does it change the win condition?** (yes/no — describe if yes) | |

---

## 8. Thematic Vocabulary (REQUIRED)

Replace generic game terms with game-voiced equivalents. Plain English descriptions go in the settings overlay — the table below is for what appears on-screen.

| Generic term | What this game calls it |
|---|---|
| Round | |
| Score / points | |
| Game over screen | |
| Play again | |
| Quit | |
| Settings overlay title | |
| [add any other game-specific terms] | |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | |
| **If yes — which categories?** (animals, food, places, objects, sports, nature, etc.) | |
| **If no — what kind of content does it need?** (describe the format and what each entry contains) | |
| **Does it need a completely new data file?** (yes/no) | |
| **Any words or topics that should be excluded?** | |

**If a new data file is needed — describe one example entry in plain English:**
(What information does each card / prompt / entry contain?)

---

## 10. Multiplayer Classification (REQUIRED)

With multiplayer now part of the project, every new game needs a pre-classification before technical work begins. Answer in plain English — Claude Code will translate this into the correct technical mode.

| Field | Your answer |
|-------|-------------|
| **In the ideal multiplayer version, does each player have their own device, or do teams share a device?** | |
| **Is there any information that must stay private to one player or one team's device?** | |
| **Are there moments where players act simultaneously (at the same time)?** | |
| **Are there moments where one device should be locked while another is active?** | |
| **Any roles or phases that simply don't work with multiple devices?** | |

---

## 11. Screens — Plain English List (REQUIRED)

Don't worry about screen IDs or technical names. Just describe each distinct "view" the player sees, in the order they encounter them. One line per screen.

Example format: "A screen where the active player sees their secret role before handing the phone to the next player"

1. (Game menu — every game has this)
2. (Setup / player names — every game has this)
3.
4.
5.
(add more as needed)

---

## 12. Open Questions & Design Notes (REQUIRED — even if brief)

List anything you're uncertain about, anything that needs a decision before coding, or anything that doesn't fit neatly into the sections above.

This section is important — it's better to flag uncertainty here than have Claude Code make assumptions mid-implementation.

**Unresolved design questions:**
-
-

**Things that might be complicated to implement (flag for Claude Code):**
-
-

**Things explicitly OUT OF SCOPE for v1 (save for later):**
-
-

**General notes / anything else:**

---

## 13. Mood & References (if applicable)

Optional but useful — helps Claude Code write UI copy and placeholder text that matches the game's tone.

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | |
| **Tone** (e.g. tense, silly, competitive, cosy, strategic) | |
| **Should NOT feel like** | |
| **Any example phrases or copy you've already written?** | |

---

## 14. Sample Round (REQUIRED)

Walk through one complete round with made-up players. This is the single most useful thing for Claude Code — it makes abstract rules concrete.

**Setup:** [N] players. [Any relevant game state — e.g. current word, who has which role]

**[Player name] ([role if applicable]):** [what they do / see / say]
**[Player name]:** [what they do]
(continue for each player / phase)

**Result:** [what happened, who scored, what the state is at the end of the round]

