# New Game Brief — [GAME NAME]
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + Gemini AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

<!--
CHANGELOG — this template was rewritten after the Pecking Order (pko) brief, which was the
suite's first genuinely rule-heavy, deep-planning game. Five sections that PKO had to invent
from scratch (Rule Relationships, Complex Interaction UI, Rule Reference/Cheat Sheet, Sound
Design, End Screen Content) are now built into the template as "(if applicable)" sections, so
future games with similar depth don't have to reinvent them, while simple word/social games can
keep skipping straight past them. §9 (Word Bank) and §11 (Custom Visual Assets) were extended
with patterns PKO needed (scaling formulas, reskin/fixed-id guidance). Everything else is
unchanged from the version that shipped LI5 through FLW.
-->

---

> **How to use this document**
> Work through every section. Nothing needs to be technically correct — write in plain English, describe what you imagine, note what you're unsure about. Use "TBD" only if genuinely undecided. Claude Code will flag any design gaps before implementation begins.
> Sections marked **(REQUIRED)** must be filled in completely. Sections marked **(if applicable)** can be skipped with a note if they don't apply — most simple games will skip most of the "if applicable" sections. The more rule-dense or UI-dense the game, the more of these you'll actually need.

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
☐ Climbing / shedding / adjacency-based card game
☐ Creative / lateral thinking
☐ Something else: _______________

**Walk through one complete round step by step, in plain English:**
(Number each step. Don't worry about screen names or technical terms — just describe what happens. If the legality of any step depends on how one game element relates to another — beats, outranks, unlocks, is immune to — don't re-derive that relationship in prose here. State the step ("play a card that beats the active one") and point to §4, where the full relationship is tabulated exactly once.)

1.
2.
3.
4.
(add more as needed)

**Is there anything players do simultaneously, or is everything sequential (one at a time)?**

**How does the phone physically move between players?**
(e.g. passed around the table, stays in the middle, each person has their own device)

---

## 4. Rule Relationships & Interaction Matrix (if applicable)

**Skip this section entirely if the game has no "beats / outranks / unlocks / is immune to" relationships between elements** — pure word games, trivia, and most social-deduction games can skip straight to §5.

**Fill this in completely if any legal move depends on how one element relates to another** — a predator chain, rock-paper-scissors-style cycles, a numeric hierarchy with exceptions, unlockable combinations, anything where "can X beat Y?" isn't a simple number comparison. This section exists because that exact kind of relationship is the easiest thing in a brief to get subtly wrong once it's only described in prose — and the hardest thing to fix later, because every downstream section (Sylly Mode events, the sample round, the in-game reference diagram, the art) ends up re-describing it slightly differently. Tabulate it once, here, exhaustively, and have every other section point back to it.

**List every element and its relationships:**

| Element | Beaten by / loses to | Beats / wins against | Notes (dead-end, wildcard, cross-group link, etc.) |
|---|---|---|---|
| | | | |
| | | | |

**Answer these explicitly — these are the exact spots that go wrong if left implicit:**
- **Closed loops:** are there any two elements that beat each other (a bidirectional pair)? List every one. A loop is not the same as a linear chain — say so explicitly if two elements form a closed pair rather than both feeding into a longer line.
- **Cross-group links:** if elements are organised into separate groups/tracks/categories, are there any relationships that cross between groups? List each cross-link individually, with direction (which element beats which — not just "these two are connected").
- **Dead ends:** is there any element that beats nothing, or is beaten by nothing? State which, and how it's balanced (limited copies, no special power, etc.) so it doesn't feel broken.
- **Wildcards:** do any elements bypass the relationship table entirely (win/lose against everything, or copy another element)? State exactly what they can and can't interact with — including whether they interact with each other.
- **Does anything change these relationships temporarily** (a Sylly Mode event, a power-up, a rule twist)? If yes, describe the change precisely enough that someone could redraw the whole table under the new rule without guessing — including what happens to dead ends, loops, and wildcards under the change. Don't just say "the chain reverses" — confirm what reversal means for every special case.

**If you're describing this to an AI or artist for a diagram later:** a linear "single continuous line" instruction is only accurate if the underlying relationship really is one long chain. The moment there's a fork (two elements that are both beaten by the same predator but don't beat each other) or a loop (two elements that beat each other), say so explicitly — "single line" language will otherwise get misread as a strict hierarchy every time.

---

## 5. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** (e.g. after X rounds, when someone reaches X points, when a specific event happens) | |
| **How is the winner determined?** | |
| **Are ties possible, and if so how are they handled?** | |
| **Roughly how long should a full game take?** | |

---

## 6. Scoring (REQUIRED)

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

## 7. Settings (REQUIRED)

List every dial the host can turn before the game starts. For each one:

| Setting name (plain English) | What does it change? | Options | What should the default be? |
|------------------------------|---------------------|---------|----------------------------|
| | | | |
| | | | |
| | | | |

**Are there any settings that should be locked or hidden in certain situations?**
(e.g. a setting that only makes sense for 4+ players, or one that's only relevant in a specific mode)

**Do any settings scale automatically with player count rather than being user-facing?**
(e.g. total content pool size, deal size — describe the formula if so; see also §9 for content-quantity scaling)

---

## 8. Sylly Mode (if applicable)

Sylly Mode is always the last setting in every game — it's the "wild" variant that makes the game harder, weirder, or more chaotic. If this game doesn't have a Sylly Mode concept yet, write "None — will design later."

| Field | Your answer |
|-------|-------------|
| **Thematic name** (e.g. "Survival of the Fittest", "Silent Running", "Kitchen Nightmares", "Force of Nature") | |
| **In one sentence — what changes?** | |
| **Does it add new screens or phases?** (yes/no — describe if yes) | |
| **Does it change scoring?** (yes/no — describe if yes) | |
| **Does it change the win condition?** (yes/no — describe if yes) | |

**If Sylly Mode has multiple distinct events/variants rather than one single change:** list each one separately with its own one-line effect description. For any event that touches the relationships tabulated in §4, don't re-derive the relationship — state only what changes and confirm the edge cases (dead ends, loops, wildcards) explicitly, the same way §4 asks. For any event that hides information that's normally visible, answer the same questions as the hidden-information prompt in §12 — who sees what, and whether it's revealed later or stays permanently redacted in any history/log screen.

---

## 9. Thematic Vocabulary (REQUIRED)

Replace generic game terms with game-voiced equivalents. Plain English descriptions go in the settings overlay — the table below is for what appears on-screen.

| Generic term | What this game calls it |
|---|---|
| Round | |
| Score / points | |
| Game over screen | |
| Play again | |
| Quit | |
| Settings overlay title | |
| [add any other game-specific terms — every mechanic named in §3, §4, and §8 needs an entry here] | |

**Note on Quit specifically:** the suite's quit-confirm popup always needs a themed confirm button (e.g. "Yeah, pack up!") alongside a neutral cancel button (e.g. "Not yet!") — the row above is the heading/prompt; if you already have the confirm/cancel button copy in mind, note it here too so it doesn't get lost.

---

## 10. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | |
| **If yes — which categories?** (animals, food, places, objects, sports, nature, etc.) | |
| **If no — what kind of content does it need?** (describe the format and what each entry contains) | |
| **Does it need a completely new data file?** (yes/no) | |
| **Any words or topics that should be excluded?** | |

**If a new data file is needed — describe one example entry in plain English:**
(What information does each card / prompt / entry contain? If entries have beats/loses-to relationships, don't repeat them here — that's §4's job. This example entry should cover everything else: name, category, special flags, display info.)

**Does the quantity of any content scale with player count?** (if applicable)
(e.g. total pool size, copies of each item — describe the formula, and show a small table across a few player counts so the scaling is easy to sanity-check.)

| Player count | Total quantity | Notes |
|---|---|---|
| | | |

---

## 11. Custom Visual Assets (if applicable)

Does this game have a **visual primitive that players look at repeatedly** and might one day be
re-skinned with custom art — cards, dice, gems, tiles, tokens, fruit, a board? If so, it should
ship **asset-pack ready** (all of that primitive's art drawn through one render seam from day one,
keyed by id). See the cartridge system: `docs/expansion-guide.md` § Add an asset (skin) pack.

| Field | Your answer |
|-------|-------------|
| **Is there a repeated visual primitive?** (yes/no — name it) | |
| **How many distinct faces/types does it have?** (e.g. 8 fruit, 54 cards, 6 die faces) | |
| **Should it be skinnable with custom art later?** (yes / no / maybe) | |
| **Default look for v1** (emoji? CSS shapes? text? fully illustrated? — what ships before any skin) | |

> Even a "maybe" means Claude Code routes **all** of that primitive's DOM through a single
> `[abbr]RenderX(id, opts)` seam (and a face-down/back variant), keyed by a stable id, so a skin
> can be added later with **no game-logic changes**. Skins are device-local cosmetic — no
> multiplayer impact. If "no" (e.g. a pure word game), write "None" and skip.

**If planning multiple reskins:** ids must stay fixed across all skins — a reskin changes the display layer only, never the underlying relationships from §4. Note whether the same lobby can mix skins across players (each player picks their own skin, still playing the same logical game) — this affects the render seam but not game logic, and is worth deciding early rather than retrofitting.

**Skin selection today defaults to the existing hidden expansion-pack terminal** (the same mechanism used for word-pack skins) — assume that's where players pick a skin unless this brief has a specific reason to propose a visible Settings toggle instead. Either way this is a Claude Code technical decision at the spec stage, not something to design here — just note a preference in §19 if you have one.

**If the default look is going to be a large, fully-illustrated set (not emoji/CSS placeholders):** this is a bigger undertaking than most games in the suite have budgeted for at v1. Note explicitly whether this game has that extra time budgeted, and consider spinning up a companion art-style checklist document (style line, per-item prompt template, production checklist) rather than cramming full art direction into this brief.

**If items are ever displayed compactly/overlapping** (e.g. a fanned hand of cards): describe the minimum visible portion of each item in that compact view, and what identifying detail must survive at that size — this constrains where the "important" part of each asset's composition needs to sit.

---

## 12. Multiplayer Classification (REQUIRED)

With multiplayer now part of the project, every new game needs a pre-classification before technical work begins. Answer in plain English — Claude Code will translate this into the correct technical mode.

| Field | Your answer |
|-------|-------------|
| **In the ideal multiplayer version, does each player have their own device, or do teams share a device?** | |
| **Is there any information that must stay private to one player or one team's device?** | |
| **Are there moments where players act simultaneously (at the same time)?** | |
| **Are there moments where one device should be locked while another is active?** | |
| **When it's not a player's turn, what do they see, and can they interact with anything, or is it read-only?** | |
| **Any roles or phases that simply don't work with multiple devices?** | |
| **Do any settings or events temporarily hide information that's normally visible** (e.g. a chaos event that blacks out the shared state for everyone except the active player)? If so, describe exactly who sees what during it, and whether it's revealed afterward or stays permanently hidden in any history/log screen. | |

---

## 13. Screens — Plain English List (REQUIRED)

Don't worry about screen IDs or technical names. Just describe each distinct "view" the player sees, in the order they encounter them. One line per screen.

Example format: "A screen where the active player sees their secret role before handing the phone to the next player"

1. (Game menu — every game has this)
2. (Setup / player names — every game has this)
3.
4.
5.
(add more as needed)

**If the game accumulates a history of turns/events that players might want to look back on:** consider whether it needs its own log/history screen, and if so, whether that screen has to respect the same information-hiding rules as live play (per §12) rather than revealing everything after the fact.

**Two things you don't need to design from scratch:** the game menu screen already has a fixed suite-wide structure — Play CTA, then How to Play, then Settings, then Back to the Box, in that order, every game — so the only decision here is the Play CTA's game-voiced label. And every other screen is built from three stacked zones (a header row with title/round-info, a central stage where the actual content lives, and a controls area with the primary action button) — when sketching a screen here or in §14, think in those three zones rather than freeform layout, since that's how it'll actually be built.

---

## 14. Complex Interaction / UI Spec (if applicable)

**Skip this if every turn is a simple tap-to-choose action.** Fill this in if a player's turn involves building something up from parts — assigning multiple items to multiple targets, dragging, multi-step confirmation, or any screen where "just describe the button" isn't enough for Claude Code to build the right UX.

**Plain-text/ASCII sketch of the main interactive screen** — boxes and labels are enough, doesn't need to be pretty:

```
(sketch here)
```

**Every distinct way a player can perform the action, if there's more than one:**
(e.g. tap a target then tap an item, vs tap an item and have it auto-assign, vs drag-and-drop — describe each method fully; note whether they can be freely mixed within a single turn)

**Real-time validation feedback:**
(What tells a player their in-progress assignment is valid or invalid, before they commit? What happens on an invalid attempt — does it just not register, or is there a rejection animation/sound?)

**Auxiliary controls:**
(Reset, undo, confirm, or any special-case action buttons — describe what makes each one appear, hide, enable, or disable)

**If this interaction needs a popup or overlay of its own** (a builder panel, a confirmation step): it will be built as one of exactly two existing overlay patterns — a slide-up scrollable panel (for anything with real content or input) or a small centred confirmation box (for a short prompt with three or fewer interactive elements). Say which shape fits; don't design a third kind.

**If the controls need to stay frozen in place while the player works in a busy central area** (e.g. assigning many small pieces to slots, or a countdown running while a puzzle updates): say so explicitly. That's a recognised but deliberately rare exception to the suite's normal single-scrolling-screen layout, so it's worth flagging as an exception rather than assuming it's the default.

---

## 15. Rule Reference / In-Game Cheat Sheet (if applicable)

**Skip this if the game's rules fit comfortably in a player's head after one read of How to Play.** Fill this in if §4 produced a relationship table complex enough that players will need to check it mid-game — most games with a §4 will need this too.

| Field | Your answer |
|-------|-------------|
| **What reference material do players need mid-game?** (a relationship chart, a decoder, a scoring reference, etc.) | |
| **How do they access it?** (which tap/gesture, from how many places in the game) | |
| **Does opening it interrupt the game, or is it a non-blocking overlay?** | |
| **Is it a static image/asset, or does it need to render dynamically from data?** | |
| **Does it need a per-skin version if §11 has custom visual assets?** | |

**If it's a diagram of relationships from §4:** sketch the layout in plain text/ASCII here, the same way you would for a UI screen. Be explicit about direction (which way do arrows point — from the weaker element to what beats it, or the reverse?), how loops are shown differently from linear chains, and how cross-group links are visually distinguished from the main relationships — these are the exact details that get lost if only described in prose.

**This will almost always be built as the same slide-up scrollable overlay used for How to Play and Settings** — no new overlay pattern needed here, so don't spend time designing a bespoke container for it.

---

## 16. Sound Design (if applicable)

Skip if the game will just reuse the suite's generic UI sounds. Fill in if specific moments deserve their own sound direction — this saves Claude Code from inventing tone decisions that should be a design call.

| Moment | Sound direction |
|---|---|
| | |
| | |

(Describe direction in feel, not files — e.g. "deep rumble building to a crescendo — dramatic" rather than a filename. List every moment from §3, §4, and §8 that has real emotional weight: a big win, a failed attempt, a special power triggering, a chaos event landing.)

---

## 17. End Screen Content Mockup (if applicable)

Skip if the end-of-game screen is just "here's the winner" with no further detail. Fill in if standings, breakdowns, or thematic framing matter enough to spec the actual copy — this is especially worth doing once §9's thematic vocabulary introduces named ranks or outcomes (e.g. a 1st-place title, a last-place title).

**Full text mockup of the screen, top to bottom** (title, winner announcement, standings/ranking layout, tie-handling copy, any history/breakdown table, CTA button labels):

```
(mockup here)
```

**Does this table/grid stay useful for very short games** (e.g. a 1-round match), or does it only add value in longer games? Note if it should be conditionally shown.

---

## 18. How to Play — Teaching Points (if applicable)

Skip if §3's core loop is genuinely a one-read, no-ambiguity explanation. Fill in for anything with real rules depth — this doesn't need full screen copy, just the ordered list of concepts a new player must absorb before they can play unaided.

**Ordered list — one line per concept, in the order they should be taught:**
1.
2.
3.
(add more as needed)

**For each concept that has an easy-to-miss exception or edge case** (e.g. "only the *immediate* relationship counts, not the whole chain"), flag it explicitly here — these are the details that get lost between the brief and the actual tutorial copy if not called out.

**The How to Play overlay this feeds into has a fixed shape already:** one card per step, then a card titled exactly "Winning and Scoring", then — for every game, no exceptions — a card titled "✨ Sylly Mode" with the thematic name as its heading. Order your teaching points so the list maps cleanly onto that shape; the last concept you list naturally becomes the Sylly Mode card.

---

## 19. Open Questions & Design Notes (REQUIRED — even if brief)

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

## 20. Mood & References (if applicable)

Optional but useful — helps Claude Code write UI copy and placeholder text that matches the game's tone.

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | |
| **Tone** (e.g. tense, silly, competitive, cosy, strategic) | |
| **Should NOT feel like** | |
| **Any example phrases or copy you've already written?** | |

---

## 21. Sample Round (REQUIRED)

Walk through one complete round with made-up players. This is the single most useful thing for Claude Code — it makes abstract rules concrete.

**Setup:** [N] players. [Any relevant game state — e.g. current word, who has which role]

**[Player name] ([role if applicable]):** [what they do / see / say]
**[Player name]:** [what they do]
(continue for each player / phase)

**Result:** [what happened, who scored, what the state is at the end of the round]

**If the game has a Sylly Mode or rule-modifying events (§8):** include at least one additional sample round showing an event in effect, not just the standard round. If §12 identified moments of hidden/asymmetric information, walk through at least one round from a single player's limited point of view so the information boundary is concrete, not just asserted.
