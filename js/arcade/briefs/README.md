# Arcade Briefs — batch of five (Oct 2026)

Five new arcade cabinets, each set in the world of a Sylly game that doesn't have a cabinet yet. Each
brief is meant to go to **its own build chat**.

## How to start a build chat

1. **Message 1:** paste `js/arcade/arcade-cabinet-prompt.md`, the whole file. It holds the rules,
   the skeleton, the bench HTML and the hand-off format.
2. **Message 2:** paste `js/arcade/arcade-roster.md`. It has the taken prefixes and what already exists.
3. **Message 3:** paste one brief from this folder. Each brief already answers the prompt's Step 1
   (pitch, ancestor, world, twist, name, id, prefix), so the chat can go straight to building.
4. The chat builds, play-tests in the bench preview, and ends with the prompt's Step 5 hand-off block.

**If the prompt and a brief disagree, the prompt wins on rules** (globals, loop, no assets, engine
surface, leaderboard). **The brief wins on design** (what the game is, how it looks and what it says).

## The five

| # | Title | id / file | Prefix | World | Ancestor |
|---|-------|-----------|--------|-------|----------|
| A | COLD SHOT (built Oct 2026; redesigned, see the roster) | `coldshot.js` | `csh` | Cold Shoulder (`cld`) | slingshot score chase (brief A is out of date) |
| B | TRACE ROUTE (built Oct 2026; escalation redesigned, see the roster) | `traceroute.js` | `trc` | Net-Trace (`nt`) | Snake / Nibbles (brief B's Node list and tuning are out of date) |
| C | RUN IT UP | `runitup.js` | `riu` | Pass (`pass`) | TriPeaks / Golf solitaire |
| D | WALK-IN CLINIC | `walkin.js` | `wic` | Group Therapy (`gth`) | Whack-a-Mole |
| E | FORTY WINKS | `fortywinks.js` | `fwk` | Counting Sheep (`shp`) | one-tap timing (Chrome dino) |

**Prefixes `csh trc riu wic fwk` are reserved by this batch.** All five chats run in parallel, so none
of them may take another's prefix. They're listed under *Reserved by briefs* in `arcade-roster.md`.

**Cabinet numbers** go in the order the cabinets are integrated (08 onwards), not the A–E order
above. Seven cabinets is already the iPhone SE scroll limit, so twelve means the terminal list needs
paging. That's a job for Claude Code during integration, not for any of these chats.

## Shared design notes, all five

- **Kid-first.** Sam's daughter is the play-tester. Each first level must be winnable by a first-timer
  without instructions. Nothing cruel: anything that "fails" is slapstick and comes back.
- **Every cabinet is themed into its world.** Each one swaps the house CRT palette for its game's
  palette and vocabulary. The look is still drawn entirely in code.
- **Words come from the game's own identity doc.** The brief quotes them, so the build chat never
  needs the identity doc.
- **Runs are 1–3 minutes.** Each brief has a tuning table: treat it as a starting point and tune it
  by play-testing.
