# Hide and Shogun (`hsg`) — idea folder

> **Superseded in part (11 Nov 2026).** The brief moved to `docs/new-game-brief-hide-and-shogun.md` and is now **draft v5** (the Paper Castle world; Geisha → Fox, Daimyo → Guard, Onmyoji → Monk, Kunoichi → Ninja, Gunner → Archer, Ronin → Farmer; Shroud/Unveil → Door/Open; Long Night → The Last Lantern; Shogun's Shame cut; a Truce replay flips the first move). The engines and tests in this folder still use the v4 names; Shame now defaults OFF in both engines. Where this file disagrees with the v5 brief, the brief wins.

Status: concept + rules + alpha prototype complete (brief draft v4). Not yet through Stage 1b (World + Three Directions) or Stage 2 (tech spec). Start with `CLAUDE-CODE-PROMPT.md`.

| Path | What it is |
|---|---|
| `CLAUDE-CODE-PROMPT.md` | Paste-ready kickoff prompt for Claude Code |
| `HANDOFF.md` | Decisions locked, status, next steps, working notes |
| `../../new-game-brief-hide-and-shogun.md` | The brief (moved; draft v5 is the rules source of truth) |
| `balance-findings.md` | Bot simulation results, rounds 1–6 |
| `sim/` | Python reference rules engine, bots, tests, batch runner (`legacy/` = round-3 rules) |
| `proto/` | JS engine (`engine.js`, mirrors the sim), tests, parity test, alpha UI. Open `hide-and-shogun-alpha-standalone.html` to play |
| `parity.json` | Python traces used by `proto/parity_test.js` |
| `playtest/playtest-log-1.json` | Sam's first playtest log (6 Battles) |
| `hsg-package-v4.zip` | The same package as one zip (backup) |

Tests (all passing at v4): `python3 sim/test_engine.py` and `node proto/engine_tests.js` from this folder; `cd proto && node parity_test.js` for the parity check (it reads `../parity.json`).

Superseded and no longer kept: the v1/v2 brief and the pre-v4 package.
