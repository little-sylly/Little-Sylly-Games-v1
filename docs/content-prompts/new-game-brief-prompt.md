# Prompt: Draft a New Game Brief
**Use with:** Gemini, ChatGPT, Claude, or any capable language model
**Output goes into:** `docs/new-game-brief-[name].md`

---

## How to use this prompt

1. Fill in the bracketed idea placeholder near the top of the prompt with your raw game idea — as rough as you like.
2. Copy everything between START PROMPT and END PROMPT, paste it into your AI, and send.

The output is a first draft. Work with the AI to revise it — fill in gaps, answer the Open Questions at the end, and refine until you're happy. Once the brief is solid, hand it to Claude Code for Stage 2 (the technical spec).

---

<!-- START PROMPT -->

You are helping design a new game for a suite called **Little Sylly Games** — a collection of social party games that run in a mobile browser. I'll give you a raw game idea and I want you to produce a complete first draft of a design brief for it.

## About Little Sylly Games

Single-page mobile app. Pass-the-phone style, or individual devices depending on the game. No user accounts, no persistence — everything resets when the game ends. Room codes for multiplayer (no sign-in required).

**Existing games in the suite** — so you understand the genre and don't duplicate a concept:

| Abbreviation | Game name | Core type |
|---|---|---|
| `li5` | Like I'm Five | Describing words without forbidden terms |
| `gm` | Great Minds | Two players telepathically find a shared word |
| `ss` | Secret Signals | Team encryption/deduction |
| `jec` | Just Enough Cooks | Collaborative ingredient-guessing, hit the sweet spot |
| `ygi` | You Get It? | Social polling — who relates most? |
| `lttp` | Late to the Party | Social deduction — who's the outsider? |
| `nat` | Natural Selection | Role-based wildlife clue-giving, find the mole |
| `dsd` | Deep-Sea Deploy | Codenames-style sequential deduction for two teams |
| `gth` | Group Therapy | Simultaneous drawing + diagnosing psychological disorders |
| `dyb` | Dicey Bluffs | Liar's Dice — escalating bluffs about hidden dice |
| `bld` | Bailed | Hidden-role social deduction + cooperative sabotage |
| `pass` | Pass | Climbing card game — shed your hand to win |
| `nt` | Net-Trace | Network engineering — harden your relay-leg node, route the signal, minimise SER |

---

## My raw game idea

[PASTE YOUR RAW GAME IDEA HERE — as rough as you like: fragments, references to real games, vibes, bullet points, anything. If you're referencing a real board or party game, describe the core mechanic in your own words rather than assuming I know the rules.]

---

## What I need from you

Produce a complete draft of the new game brief covering all 14 sections listed below.

**How to handle gaps and uncertainty:**
- Make reasonable assumptions where the idea is incomplete, and mark them `[ASSUMPTION: ...]`
- Flag genuine design blockers — things you can't resolve without my input — with `[CLARIFICATION NEEDED: ...]`
- Prefer a working draft with marked assumptions over leaving sections blank
- For "copy of X" inputs: adapt the mechanic for mobile pass-the-phone and note clearly what changes from the original game

---

## Non-negotiable constraints

Factor these into every section of the brief:

- **Mobile-first.** Either one shared device (passed around the table) OR each player has their own device — never both simultaneously within the same gameplay phase
- **Player count 3–8.** Note the minimum meaningful count and the sweet spot
- **No persistence.** No user accounts, no score history, no data saved between sessions
- **Sylly Mode is required in every game.** Sylly Mode is the "wild" variant — makes the game harder, weirder, or more chaotic. It's always the last setting. If you can't design it yet, write "None — will design later" in §7, but you must address it
- **Thematic vocabulary is mandatory.** Every generic term that appears on-screen must have a game-specific name. No bare "Round", "Score", "Game Over", "Settings", "Player" etc. — everything must be voiced through the game's theme
- **Settings:** difficulty-style setting first (controls word/prompt complexity or challenge level), ✨ Sylly Mode last
- **Abbreviation:** 3–4 characters, not already used. Taken: `li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`
- **Australian English throughout:** colour, flavour, organise, recognise, °C, km, kg. No American spellings

---

## What thematic vocabulary means

Every game in the suite replaces generic game language with words from its theme. Here are three examples:

| Generic term | Like I'm Five | Just Enough Cooks | Group Therapy |
|---|---|---|---|
| Round | *(not used)* | Order | Session |
| Score / points | *(not used)* | Kitchen Points | Sessions |
| Game over screen | *(not used)* | Final Wash-up | The Final Report |
| Play again | *(not used)* | New Shift | New Session |
| Quit | *(not used)* | Leave the Kitchen? | Walk Out? |
| Settings overlay title | *(not used)* | The Pantry Cabinet 🧂 | Inpatient Admission Form 📋 |

And Sylly Mode names from the existing games, as tone references:
Wild Words (LI5) · Static Interference (GM) · Intel Phase (SS) · Kitchen Nightmares (JEC) · The Ringer (YGI) · The Troublemaker (LTTP) · Survival of the Fittest (NAT) · Mission Abyss (DSD) · Stroke or Genius (GTH) · Devil's Luck (DYB) · Drama Mode (BLD) · The Abyss (PASS) · Devil's Network Protocol (NT)

---

## Section-specific guidance

A few notes on the sections that most often have gaps:

**§1 Identity:** Propose an abbreviation and confirm it isn't in the taken list above.

**§2 The Players:** If you're adapting a real game, note how the role structure changes for a phone format. Some mechanics that work on a table need redesign for mobile.

**§3 The Core Loop:** State the single-sentence turn action clearly — this is the test of whether the mechanic is resolved. If you can't state what a player DOES in one sentence, flag it with `[CLARIFICATION NEEDED]`.

**§5 Scoring:** Cover every outcome including zero and negative points. Be explicit about what happens when nobody scores a round. If no scoring system applies, flag it as a design decision.

**§8 Thematic Vocabulary:** Minimum 7 rows. Must cover: Round, Score/points, Game over screen, Play again, Quit, Settings overlay title, and at least one game-specific term unique to this game.

**§10 Multiplayer Classification:** Answer all 5 questions in plain English — no technical terms, no code references.

**§14 Sample Round:** This is the most important section. Name specific players, assign roles, walk a complete round from setup to result. If the sample round has gaps or ambiguity, the mechanics aren't resolved — fill them in or flag them explicitly.

---

## Output format

Produce the draft using these section headers in order:

```
## 1. Identity
## 2. The Players
## 3. The Core Loop
## 4. Winning
## 5. Scoring
## 6. Settings
## 7. Sylly Mode
## 8. Thematic Vocabulary
## 9. Word Bank & Content
## 10. Multiplayer Classification
## 11. Screens — Plain English List
## 12. Open Questions & Design Notes
## 13. Mood & References
## 14. Sample Round
```

After §14, add a final section:

```
## Open Questions

Every [CLARIFICATION NEEDED] item from the brief above, numbered and tagged:
1. [BLOCKER] ...
2. [NON-BLOCKER] ...
```

BLOCKER = I cannot complete the brief or start the technical spec without an answer.
NON-BLOCKER = The brief works as-is with my assumption, but I'd like your input before it's final.

---

## What NOT to do

- No code, screen IDs, variable names, or JavaScript references
- No Firebase, CSS class, or framework mentions — this brief is non-technical
- No British English spellings
- Don't skip §8 (Vocabulary) — it's required even at draft stage
- Don't invent technology beyond: mobile browser + real-time room codes
- Don't duplicate an existing game's core mechanic — check the suite list above

<!-- END PROMPT -->

---

## Tips for best results

- **Before pasting your idea,** answer this first: *"What's the fun moment in 10 words?"* If you can't, the concept needs more time before briefing.
- **For "copy of X" inputs:** The AI will adapt the mechanic for mobile. Confirm that adaptation feels right — some games that work on a table (hidden boards, physical components) need genuine redesign, not just translation.
- **§14 is the acceptance test.** If you can't follow the sample round without any confusion, the mechanics aren't resolved. Ask the AI to work through the gaps before treating the draft as done.
- **Scan the `[ASSUMPTION: ...]` markers** before moving on. These are not mistakes — they're design decisions the AI made on your behalf. Make sure you agree with each one.
- **Treat the Open Questions list seriously.** Any BLOCKER left unanswered will become a `[CLARIFICATION NEEDED]` in the technical spec and block implementation.
- **What happens next:** Once you're happy with the brief, hand it to Claude Code alongside the rule files (`logic-engine.md`, `ui-style.md`, `definitions.md`, `game-identities.md`, `CLAUDE.md`, `docs/code-map.md`) for Stage 2 — the technical spec. Claude Code fills in the technical template and confirms everything before writing a single line of game code.
