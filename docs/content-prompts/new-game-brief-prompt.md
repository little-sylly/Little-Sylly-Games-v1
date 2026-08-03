# Prompt: Draft a New Game Brief
**Use with:** Gemini, ChatGPT, Claude, or any capable language model
**Output goes into:** `docs/new-game-brief-[name].md`

<!--
CHANGELOG — updated alongside the template rewrite after Pecking Order (pko), the suite's first
deep-planning, rule-heavy game. Added pko to the games table and taken abbreviations. Section
list expanded from 14 to 21 to match the new template (most new sections are "if applicable" and
simple games will skip most of them). Added explicit guidance for the new §4 Rule Relationships
section, since that's where this session's back-and-forth mostly happened — an under-specified
relationship table caused repeated errors downstream (art briefs, diagrams, sample rounds) that
were each individually easy to miss and collectively expensive to unwind.
-->

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
| `dyb` | The Bluff | Liar's Dice — escalating bluffs about hidden dice (cliff/climb theme) |
| `bld` | Bailed | Hidden-role social deduction + cooperative sabotage |
| `pass` | Pass | Climbing card game — shed your hand to win |
| `nt` | Net-Trace | Network engineering — harden your relay-leg node, route the signal, minimise SER |
| `frt` | Fruit Salad | Cockroach Poker bluffing — pass a face-down fruit card with a (possibly false) declaration; call bluff or pass it on |
| `shp` | Counting Sheep | O'NO-99 climbing/survival — keep the Herd ≤ 99 or fall into Deep Sleep; Sylly Mode = Night Terrors (Climb ⇄ Plunge) |
| `flw` | Flawless | Gem-trading bluffing — pass a face-down Showpiece and declare its identity; the receiver challenges or accepts; Diamonds awarded via the Ledger; Sylly Mode = The Counterfeit Run |
| `pko` | Pecking Order | Adjacency-based predator-chain climbing card game — beat Marks with their specific immediate predator, not numeric rank; two parallel tracks (Land/Sea) with cross-links; Sylly Mode = Force of Nature |
| `cjar` | Cookie Jar | Simultaneous-choice push-your-luck — a card flips, everyone secretly Takes or Sneaks Out, a second sighting of the same family member busts the Raid; Sylly Mode = Dibber Dobber |

---

## My raw game idea

[PASTE YOUR RAW GAME IDEA HERE — as rough as you like: fragments, references to real games, vibes, bullet points, anything. If you're referencing a real board or party game, describe the core mechanic in your own words rather than assuming I know the rules.]

---

## What I need from you

Produce a complete draft of the new game brief covering all 21 sections listed below. Most games only need the sections marked **(REQUIRED)** filled in fully — the **(if applicable)** sections exist for games with real rule depth or UI complexity, and should be skipped with a one-line "not applicable" note if the idea is a simple word/social game.

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
- **Sylly Mode is required in every game.** Sylly Mode is the "wild" variant — makes the game harder, weirder, or more chaotic. It's always the last setting. If you can't design it yet, write "None — will design later" in §8, but you must address it
- **Thematic vocabulary is mandatory.** Every generic term that appears on-screen must have a game-specific name. No bare "Round", "Score", "Game Over", "Settings", "Player" etc. — everything must be voiced through the game's theme
- **If the game has any "beats / outranks / unlocks / is immune to" relationship between elements, it must be resolved as an explicit table in §4 — not just described in prose.** A prose description ("predators beat their prey") reads fine to a human but is genuinely ambiguous the moment there's a fork, a loop, a cross-category link, or an exception — and every section downstream (sample rounds, diagrams, art direction) will silently inherit whichever interpretation gets guessed first. Resolve it once, in the table, and have every other section reference it rather than re-describing it.
- **Settings:** difficulty-style setting first (controls word/prompt complexity or challenge level), ✨ Sylly Mode last
- **Abbreviation:** 3–4 characters, not already used. Taken: `li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`, `frt`, `shp`, `flw`, `pko`, `cjar`
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
Wild Words (LI5) · Static Interference (GM) · Intel Phase (SS) · Kitchen Nightmares (JEC) · The Ringer (YGI) · The Troublemaker (LTTP) · Survival of the Fittest (NAT) · Silent Running (DSD) · Stroke or Genius (GTH) · The Tempest (DYB) · Drama Mode (BLD) · The Abyss (PASS) · Devil's Network Protocol (NT) · Fruity Personalities (FRT) · Night Terrors (SHP) · The Counterfeit Run (FLW) · Force of Nature (PKO) · Dibber Dobber (CJAR)

---

## Section-specific guidance

A few notes on the sections that most often have gaps:

**§1 Identity:** Propose an abbreviation and confirm it isn't in the taken list above.

**§2 The Players:** If you're adapting a real game, note how the role structure changes for a phone format. Some mechanics that work on a table need redesign for mobile.

**§3 The Core Loop:** State the single-sentence turn action clearly — this is the test of whether the mechanic is resolved. If you can't state what a player DOES in one sentence, flag it with `[CLARIFICATION NEEDED]`. Don't let this section absorb the game's rule relationships — that's §4's job; §3 is about the flow of a turn, §4 is about what beats what.

**§4 Rule Relationships & Interaction Matrix (if applicable):** Only include this section if the idea has real "beats/outranks/unlocks" relationships — skip it outright for word games, trivia, and most social deduction. When it does apply, treat it as the most important section to get exhaustively right, because errors here are the most expensive to unwind later. Specifically check for and call out: closed loops (two elements that beat each other — not the same as a linear chain), cross-category links (state direction explicitly, don't just say "these connect"), dead-end elements (beat nothing or are beaten by nothing — say how that's balanced), and wildcards (what they can and can't interact with, including each other). If Sylly Mode modifies these relationships, restate what happens to every special case under the modification — don't assume "the chain reverses" is self-explanatory once dead ends, loops, and cross-links exist.

**§6 Scoring:** Cover every outcome including zero and negative points. Be explicit about what happens when nobody scores a round. If no scoring system applies, flag it as a design decision.

**§9 Thematic Vocabulary:** Minimum 7 rows. Must cover: Round, Score/points, Game over screen, Play again, Quit, Settings overlay title, and at least one game-specific term unique to this game. Every mechanic named in §3, §4, and §8 needs a vocabulary entry.

**§10 Word Bank & Content:** If the game needs a custom data file rather than the shared word bank, describe one example entry fully — but don't duplicate beats/loses-to relationships here if §4 exists; that's §4's job, this section is for everything else (name, category, display info, special flags). If quantities scale with player count, show the formula and a small table.

**§12 Multiplayer Classification:** Answer all 7 questions in plain English — no technical terms, no code references. Pay particular attention to the read-only/spectator question and the temporary-information-hiding question — these are easy to skip and expensive to retrofit.

**§14 Complex Interaction / UI Spec (if applicable):** Only needed when a turn is more than tap-to-choose — e.g. assigning multiple items to multiple targets. If included, sketch the screen in plain text and describe every distinct input method a player could use, not just the intended primary one. Any popup this interaction needs must be one of exactly two existing overlay shapes — a scrollable slide-up panel, or a small centred confirmation box for three or fewer elements — don't invent a third. If the interaction needs its controls to stay visually frozen while the player works a busy area, flag that explicitly as a deliberate exception rather than the default.

**§15 Rule Reference / In-Game Cheat Sheet (if applicable):** Usually needed whenever §4 exists — players will want to check the relationship table mid-game. If it's a diagram, sketch it in plain text and be explicit about arrow direction and how loops/cross-links are visually distinguished from the main chain. This will almost always be the same scrollable overlay shape as How to Play — no new container needed.

**§18 How to Play — Teaching Points (if applicable):** The overlay this feeds has a fixed shape suite-wide — one card per step, then a card titled exactly "Winning and Scoring", then a card titled "✨ Sylly Mode" with the thematic name (present for every game, no exceptions). Order the teaching points so that shape falls out naturally.

**§21 Sample Round:** This is the most important section. Name specific players, assign roles, walk a complete round from setup to result. If the sample round has gaps or ambiguity, the mechanics aren't resolved — fill them in or flag them explicitly. If §8 (Sylly Mode) or §12 (hidden information) apply, add at least one further sample round demonstrating each — a standard round alone isn't enough to prove those mechanics are resolved.

---

## Output format

Produce the draft using these section headers in order:

```
## 1. Identity
## 2. The Players
## 3. The Core Loop
## 4. Rule Relationships & Interaction Matrix
## 5. Winning
## 6. Scoring
## 7. Settings
## 8. Sylly Mode
## 9. Thematic Vocabulary
## 10. Word Bank & Content
## 11. Custom Visual Assets
## 12. Multiplayer Classification
## 13. Screens — Plain English List
## 14. Complex Interaction / UI Spec
## 15. Rule Reference / In-Game Cheat Sheet
## 16. Sound Design
## 17. End Screen Content Mockup
## 18. How to Play — Teaching Points
## 19. Open Questions & Design Notes
## 20. Mood & References
## 21. Sample Round
```

For any "(if applicable)" section that genuinely doesn't apply, write the header with a one-line "Not applicable — [why]" note rather than omitting it, so it's clear it was considered and skipped deliberately rather than missed.

After §21, add a final section:

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
- Don't skip §9 (Vocabulary) — it's required even at draft stage
- Don't describe beats/outranks relationships only in prose if §4 applies — tabulate them exhaustively
- Don't invent technology beyond: mobile browser + real-time room codes
- Don't duplicate an existing game's core mechanic — check the suite list above

<!-- END PROMPT -->

---

## Tips for best results

- **Before pasting your idea,** answer this first: *"What's the fun moment in 10 words?"* If you can't, the concept needs more time before briefing.
- **For "copy of X" inputs:** The AI will adapt the mechanic for mobile. Confirm that adaptation feels right — some games that work on a table (hidden boards, physical components) need genuine redesign, not just translation.
- **Judge which "(if applicable)" sections you actually need early.** A simple word or social game should stay close to the original 14-section shape and skip most of §4, §14–18. A game with a real rule structure (anything with a "beats" or "outranks" relationship) will usually need §4 and §15 at minimum, and probably benefits from all of them — that depth is exactly what made the Pecking Order brief hold up through implementation without rework.
- **§4 is the section most likely to save you time later if you get it right, and cost you time if you don't.** If the idea has any kind of hierarchy, chain, or beats-relationship, resist the urge to leave it as prose — insist on the table, the closed-loop check, and the cross-link check before moving on.
- **§21 is the acceptance test.** If you can't follow the sample round without any confusion, the mechanics aren't resolved. Ask the AI to work through the gaps before treating the draft as done.
- **Scan the `[ASSUMPTION: ...]` markers** before moving on. These are not mistakes — they're design decisions the AI made on your behalf. Make sure you agree with each one.
- **Treat the Open Questions list seriously.** Any BLOCKER left unanswered will become a `[CLARIFICATION NEEDED]` in the technical spec and block implementation.
- **What happens next:** Once you're happy with the brief, hand it to Claude Code alongside the rule files (`logic-engine.md`, `ui-style.md`, `definitions.md`, `game-identities.md`, `CLAUDE.md`, `docs/code-map.md`) for Stage 2 — the technical spec. Claude Code fills in the technical template and confirms everything before writing a single line of game code.
