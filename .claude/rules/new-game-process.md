# New Game Process — Little Sylly Games
**Purpose:** The end-to-end protocol for adding a new game, from first idea to first line of code.
**Who reads this:** Project owner (for context), Gemini AI (for Phase 1 guidance), Claude Code (for Phase 2 execution).

---

## Overview

Adding a new game has three stages. Each stage has a hard gate — the next stage cannot begin until the current one is confirmed complete. This prevents the drift that occurs when implementation begins before design decisions are locked.

```
STAGE 1 — Design Brief        STAGE 2 — Technical Spec       STAGE 3 — Implementation
(Project owner + Gemini)  →   (Claude Code, confirmed by  →   (Claude Code)
                               project owner)
```

---

## Stage 1 — Design Brief

**Who:** Project owner + Gemini AI
**Document:** `new-game-brief-template.md` → saved as `docs/new-game-brief-[name].md`
**Goal:** A complete, non-technical description of the game

### What to do
1. Copy `new-game-brief-template.md` to `docs/new-game-brief-[name].md`
2. Work through it with Gemini — use Gemini for brainstorming, balancing, and fleshing out mechanics
3. Fill in every section marked **(REQUIRED)** — leave nothing blank
4. Use the Sample Round section (§14) to stress-test the design: if you can't write a clean example round, the mechanics aren't resolved yet
5. Flag anything uncertain in §12 (Open Questions) — do not paper over ambiguity

### What Gemini is good for at this stage
- Brainstorming role mechanics and tensions
- Suggesting scoring balance approaches
- Writing thematic vocabulary and UI copy
- Identifying edge cases in round flow
- Stress-testing the design ("what happens if the Mole guesses correctly?")

### What Gemini should NOT do at this stage
- Suggest screen IDs, variable names, or code structures — these come from the codebase, not the idea
- Propose multiplayer architecture — §10 only needs plain-English intent
- Suggest audio, CSS classes, or overlay patterns — these are covered by project rules

### Stage 1 gate — the brief is ready when:
- [ ] All REQUIRED sections are filled in completely
- [ ] The Sample Round can be followed without any ambiguity
- [ ] §12 Open Questions lists real questions, not "none"
- [ ] A complete set of scoring outcomes is defined
- [ ] Sylly Mode is either designed or explicitly marked "design later"

**Do not hand the brief to Claude Code until all gate items are checked.**

---

## Stage 2 — Technical Spec

**Who:** Claude Code
**Documents read:** Phase 1 brief + `logic-engine.md` + `ui-style.md` + `definitions.md` + `game-identities.md` + `CLAUDE.md` + `docs/code-map.md`
**Document produced:** `new-game-technical-template.md` → saved as `docs/new-game-tech-[name].md`
**Goal:** A complete technical specification, confirmed by the project owner before any code is written

### What Claude Code does
1. Read the Phase 1 brief in full
2. Read all rule files listed above — do not skip any
3. Run the Consistency Audit (top of technical template) before filling in anything else
4. Fill in every section of the technical template
4a. Express the §2 State Flow as a Mermaid `stateDiagram-v2` diagram — not ASCII arrows. GitHub renders Mermaid natively in all markdown files; the diagram will be visible directly in the repo.
5. Where the brief is ambiguous or incomplete: use **[CLARIFICATION NEEDED]** — do not invent answers
6. Where a technical decision deviates from the brief: document it in §17 (Deviations)
7. Present the completed spec to the project owner for confirmation

### What Claude Code must NOT do at Stage 2
- Write any game code — not even a skeleton, not even a variable declaration
- Make design decisions without flagging them (use §17)
- Assume a terminology term is unique without checking `game-identities.md` and `code-map.md`
- Propose a new normaliser, fuzzy matcher, or utility function if one already exists in `engine.js`
- Create a new overlay pattern — only data slide-up or decision modal

### Clarification process
If §16 (Clarifications Required) has items, Claude Code presents them to the project owner before completing the spec. The project owner answers them, then the spec is updated and presented for final confirmation.

### Stage 2 gate — the spec is ready when:
- [ ] Consistency Audit complete — no unresolved collisions
- [ ] §16 (Clarifications) is empty or all items have been answered
- [ ] §17 (Deviations) has been reviewed and confirmed by the project owner
- [ ] All screen IDs enumerated in §3 and counted
- [ ] All state variables listed with types, defaults, and lifecycle groupings in §4
- [ ] Scoring formula is code-ready (not "roughly X points")
- [ ] Validation rules are complete in §7
- [ ] Multiplayer configuration is specified in §11
- [ ] `resetToLobby()` additions listed in §13
- [ ] Project owner has explicitly confirmed the spec

**Claude Code may not write a single line of game code until the project owner confirms the spec.**

---

## Stage 3 — Implementation

**Who:** Claude Code
**Reference:** The confirmed technical spec (`docs/new-game-tech-[name].md`)
**Process:** Work through the implementation checklist in §15 of the technical spec, one item at a time

### Implementation rules
- The technical spec is the source of truth — not the Phase 1 brief, not memory, not inference
- Work through §15 in order — foundation before logic, logic before UI polish
- One function or one UI component per response (surgical coding protocol)
- Do not begin a new section of §15 until the current section is verified working in the browser
- Any deviation from the spec requires a pause and a note — do not silently adapt

### When the brief and the spec conflict
The spec wins. If during implementation a spec decision turns out to be wrong or impossible, stop and flag it. Do not work around it silently.

### Documentation during implementation
As each section of §15 is completed, update:
- `docs/code-map.md` — add new screen IDs, overlay IDs, and key functions as they are created (not at the end — during)
- `game-identities.md` — add the new game entry as the game takes shape (not at the end)

### Stage 3 complete when:
- [ ] All items in §15 checked
- [ ] Protocol A audit passes for all new screens
- [ ] `docs/code-map.md` updated
- [ ] `game-identities.md` updated with full new game entry
- [ ] `CLAUDE.md` project structure map updated
- [ ] SW version bumped and precache updated
- [ ] `docs/phase[N]-snapshot.md` written and confirmed

---

## The Naming Collision Check

Run this check at the START of Stage 2 (Consistency Audit in the technical template) before filling in any other section. Naming collisions have caused documentation drift in past phases.

**Check 1 — Terminology:**
Search `game-identities.md` for every thematic term proposed in the Phase 1 brief. Confirm no term means something different in another game.

*Example of what to catch:* "Field Notes" was proposed as a new NAT setting name, but "The Field Notes" was already NAT's tally screen label in `game-identities.md`. This required a rename before implementation.

**Check 2 — Screen IDs:**
Search `allScreens[]` in `engine.js` for any proposed `screen-[abbr]-*` ID. Abbreviations must be unique across all 8 games.

**Check 3 — Variable prefixes:**
Confirm the proposed abbreviation isn't already used. Current prefixes: `li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`.

**Check 4 — Brand colour:**
Check `css/styles.css` for `pill-active-[colour]`. If it doesn't exist, it needs to be added — note this in the spec. No SW bump required for CSS changes.

**Check 5 — Data files:**
If a new `data/[abbr]-data.json` file is proposed, confirm no similar data file already exists. Confirm the new file format is flexible enough to be reused by future games (per project goal).

---

## Word Bank Decision Guide

Every new game needs a word bank decision. Use this guide:

**Reuse `words.json` if:**
- The game draws words from existing categories (animals, food, places, objects, etc.)
- The game just needs a word plus its `nono_list` — no extra fields
- Examples: LI5, NAT, DSD, SS all use `words.json`

**Reuse `ygi-data.json` format if:**
- The game needs prompts with pre-written response options or ringers
- The format is: `{ id, text, [extras array] }`
- Example: YGI uses this format

**Create a new data file if:**
- The game needs a fundamentally different entry structure (new fields not present in `words.json`)
- The content type is not words (e.g. scenarios, questions, image descriptions)
- Reusing would require hacking `words.json` entries in a way that breaks other games

**If creating a new file:**
- Name it `data/[abbr]-data.json`
- Design the schema to be as reusable as possible — think about whether a future game could use this format
- Add to `sw.js` precache
- Create `docs/[abbr]-content-guide.md` modelled on `docs/ygi-content-guide.md`

---

## Multiplayer Pre-Classification Guide

Phase 1 brief §10 asks for multiplayer intent in plain English. This guide shows how that maps to technical modes — for reference when Claude Code fills in §11 of the technical spec.

| If the brief says... | Technical mode |
|---------------------|---------------|
| "Each player has their own device, acts independently" | Individual Devices |
| "Teams share one device, pass it between them" | Pass-the-Phone (existing single-device mode — no multiplayer change) |
| "Teams each have one device, they face off" | 2-Device Teams |
| "Some phases are individual, some are team-vs-team" | Hybrid |
| "I'm not sure yet" | TBD — Claude Code flags for confirmation before §11 |

**The key question for any game:** Is there information that must be visible to one player/team and hidden from another? If yes, individual device mode or targeted Firebase writes are required. If all players see the same thing, the simpler shared-state model works.

**Games with simultaneous input** always need a `readyCheck` matrix — an array of booleans, one per player, that the Host evaluates before broadcasting the resolved state. This is independent of the multiplayer mode.

---

## Archived Documents

When the final technical spec is confirmed and implementation begins, the following can be archived to `docs/archive/`:
- `docs/new-game-brief-[name].md` (Phase 1 brief — superseded by confirmed technical spec)

The technical spec (`docs/new-game-tech-[name].md`) is retained permanently as the game's design record.
The phase snapshot (`docs/phase[N]-snapshot.md`) is the implementation record.

---

## Quick Reference — Document Locations

| Document | Location | Created by |
|----------|----------|-----------|
| Phase 1 brief template | `new-game-brief-template.md` | (this file — copy it) |
| Phase 2 technical template | `new-game-technical-template.md` | (this file — Claude Code fills it in) |
| Phase 1 brief (filled in) | `docs/new-game-brief-[name].md` | Project owner + Gemini |
| Phase 2 spec (filled in) | `docs/new-game-tech-[name].md` | Claude Code |
| Content guide (if new data file) | `docs/[abbr]-content-guide.md` | Project owner |
| Phase snapshot | `docs/phase[N]-snapshot.md` | Claude Code, end of phase |
