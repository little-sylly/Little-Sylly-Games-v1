# Claude Code kickoff prompt — Hide and Shogun (`hsg`)

> **Superseded in part (11 Nov 2026).** The brief moved to `docs/new-game-brief-hide-and-shogun.md` and is now **draft v5** (the Paper Castle world; Geisha → Fox, Daimyo → Guard, Onmyoji → Monk, Kunoichi → Ninja, Gunner → Archer, Ronin → Farmer; Shroud/Unveil → Door/Open; Long Night → The Last Lantern; Shogun's Shame cut; a Truce replay flips the first move). The engines and tests in this folder still use the v4 names; Shame now defaults OFF in both engines. Where this file disagrees with the v5 brief, the brief wins.

Paste everything below the line into a fresh Claude Code session opened in the Little-Sylly-Games repo. Recommended: Opus, high effort (Stage 1b is a design step).

---

I'm Sam. I've been designing a new game, **Hide and Shogun** (proposed abbreviation `hsg`), with Claude in a claude.ai Project. The concept, rules, a bot-balanced rules engine and a playable alpha prototype are all done. Because of the UI revamp I want it carried through the repo's own new-game workflow from here, not built straight from the prototype.

**Read first, in this order** (read whole, don't skim):
1. `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`
2. `docs/rules/new-game-process.md`, `docs/rules/new-game-brief-template.md`, `docs/rules/new-game-checklist.md`
3. `docs/rules/ui-revamp.md` and `docs/ui-revamp-lessons.md`
4. `docs/decision-log.md`, `.claude/rules/definitions.md`, and `docs/game-identities/*.md` (you need these for the collision check)
5. The idea folder: `docs/new-ideas/hide and shogun/` — `HANDOFF.md` first, then `hide-and-shogun-brief.md`, then `balance-findings.md`. `README.md` in that folder says what everything is.

**What the game is (one paragraph):** a two-player, Banqi-style hidden-tile game in feudal Japan. 5×6 board, all 30 tiles start face-down ("Shrouds"). Two clans, Crimson Sun and Ivory Moon. Win a Battle by capturing the enemy Shogun. First to 1 / 3 / 5 Honour Seals takes the Campaign (default 3). Four neutral Geisha can be hired by whichever clan unveils them (The Floating World setting: 2 or 4). The rules are settled in brief §4–§7; HANDOFF.md §2 lists the decisions that are locked. **Don't re-open a locked decision without asking me.**

**Where it stands in the workflow:** the brief is a Stage 1 draft (v4) written before the newer brief-template requirements. It does NOT yet have the world-first work (template §0 world / Intro / mood beats, §0d chosen direction) and has not been through **Stage 1b: World + Three Directions**. Our north star is that every game is a world, and distinctness comes from world-building, not mechanics. Banqi is a borrowed mechanic, so the world has to carry this game. The Japan theme is a starting point, not the finished world; push on setting, narrator voice, terminology and what only this game's screens would look like.

**What I want from this session, in order:**
1. Confirm you've read the files above. Tell me in a few lines what you understand the game to be, and anything in the repo that conflicts with the brief.
2. Run the **Naming Collision Check**: abbreviation `hsg`, the file/CSS/JS prefixes, and the game's terms (Seal, Campaign, Battle, Command, Ronin, Shroud, Unveil, March, Strike, Charge, Vault, Volley, Cast, Omen, Banners, Truce, Surrounded, Floating World, and the piece names) against `definitions.md` and the other game identities. Flag any term that would blur with an existing game.
3. Do **Stage 1b** as the process doc describes it: world brief, then three visual directions as Design-canvas boards, then stop for me to pick. After I pick, record the choice in the brief (§0d) and let it revise brand colour, terminology and the brief where the world needs it.
4. Only then **Stage 2**, the tech spec `docs/new-game-tech-hsg.md` via `/brainstorm`, with the Consistency Audit and a Mermaid stateDiagram-v2. **No app code until I confirm the spec.** Stage 3 follows `new-game-checklist.md`.

**The prototype and sims are reference, not app code.**
- `proto/engine.js` is pure rules (no DOM) and mirrors `sim/hsg_sim.py` exactly (parity-tested). It is a good candidate to lift into the real game file, but check the repo's architecture first: vanilla JS, no build step, no ES modules, global symbols, `src/screens/hsg.html` partial, the suite's own bot system, multiplayer/match flow, registry min/max players = 2.
- `proto/ui_template.html` look and feel is throwaway: it predates the UI revamp. The Campaign logic in it (`newCampaign`, `nextBattle`, `startBattle`, `finish`) is worth reading as the reference for Seal flow.
- Before any rule change, the tests must stay green: `python3 sim/test_engine.py`, `node proto/engine_tests.js` (21 checks), and `cd proto && node parity_test.js` (run from inside `proto/`). When brief §4b changes, update `exp_matrix` in both test files. When the brief and the code disagree, the brief wins.
- For Stage 3, the repo's `tools/verify-hsg-*.js` harness should wrap the engine, not replace the sim tests.
- `playtest/playtest-log-1.json` is my first playtest (6 Battles). It drove the v4 rule changes; keep it as evidence.

**Open items (ask me, don't guess):**
1. Is **"Shogun's Shame"** the final name for the rule that flips a hidden Shogun face-up after 5 quiet Commands? It was Claude's proposal and I never explicitly confirmed it. A rename is one line.
2. On a **Truce replay**, should the Vanguard flip, or stay as it was? Currently it stays and the Battle number repeats.
3. Brief §12 multiplayer questions need a pass against how the suite really does MP.
4. Sylly Mode is parked ("design later" marker). Also parked, don't build: 4-player mode, board-size setting, Gunner shield variants, Samurai-strikes-Daimyo.
5. Not yet tested: real touch devices, Safari, a human playing a Campaign to the end.

**Working style:** Australian English, metric. I'm a non-coder, so plain English first and an analogy when a pattern is new. Challenge anything that breaks the game's soul or reads as a clone. Short, direct answers; when you want my decision, give a recommendation with reasons. Record durable decisions in the right repo doc. End every response with the what's-next line from `CLAUDE.md` (next task, model + effort, session call, plus a handoff block if the call is a fresh session).

Please start with step 1.
