# Hide and Shogun (`hsg`) — Handoff

> **Superseded in part (11 Nov 2026).** The brief moved to `docs/new-game-brief-hide-and-shogun.md` and is now **draft v5** (the Paper Castle world; Geisha → Fox, Daimyo → Guard, Onmyoji → Monk, Kunoichi → Ninja, Gunner → Archer, Ronin → Farmer; Shroud/Unveil → Door/Open; Long Night → The Last Lantern; Shogun's Shame cut; a Truce replay flips the first move). The engines and tests in this folder still use the v4 names; Shame now defaults OFF in both engines. Where this file disagrees with the v5 brief, the brief wins.

Updated 12 Oct 2026 after design round 3 (the owner's playtest findings and answers) and the v4 alpha build. A fresh session needs only this file, the brief and the folders below.

## 1. What this is
A two-player, Banqi-style hidden-tile game for the Little Sylly Games suite, themed on feudal Japan. 5×6 board, every tile starts face-down ("Shroud"). Two clans (Crimson Sun / Ivory Moon). Win a Battle by capturing the enemy Shogun; win Honour Seals to take the Campaign. Sam (the owner; a non-coder who designs with Claude) owns all design decisions.

**Source of truth for the rules: `hide-and-shogun-brief.md` (draft v4), §4 (roster, strike table, special rulings), §5 (winning), §6 (Seals and the Campaign), §7 (settings).** The Python sim (`sim/hsg_sim.py`) and the JavaScript engine (`proto/engine.js`) both implement Battle rules; the Campaign lives in the prototype UI (`proto/ui_template.html`). When the brief and the code disagree, the brief wins, then fix the code and run the tests.

## 2. Decisions made (do not re-open without Sam)
- Two players only; no roles or teams. Title **Hide and Shogun**.
- Roster per clan: Shogun 1, Daimyo 2, Onmyoji 2, Samurai 2, Kunoichi 1, Gunner 2, **Ronin 3**, plus 4 neutral Geisha for hire (setting: 2 or 4; with 2, each clan has 4 Ronin). Ladder: Shogun 8, Daimyo 7, **Onmyoji 6**, Samurai 5, Kunoichi 4, Gunner 3, Ronin 2. Strike table in brief §4b.
- **Ronin** (replaced the Ashigaru, round 3): lowest rank; strike Ronin, Gunner, **Geisha**, and an Exposed Shogun.
- **Kunoichi**: Vault strikes anything except a Guarded Shogun (rank ignored), Geisha included. Sam first wrote "all except guarded shogun and geisha", then corrected himself: she keeps the Geisha capture. `cfg.kn_hits_gs` / `knHitsGs` can switch it off for comparison.
- **Gunner** fires at exactly 2 or 3 squares.
- **Shogun's Shame**: fixed rule, 5 of a player's own Commands with no Unveil or capture, only while that player's Shogun is face-down (flipped face-up; from then on only a face-up Daimyo guards him). The name "Shogun's Shame" is Claude's proposal; Sam has not objected but never explicitly confirmed it (a one-line rename).
- **The Long Night**: fixed rule, 12 quiet Commands in a row (6 each); more face-up pieces wins; level = Truce. A hired Geisha counts for her clan; a Shroud counts for nobody.
- **Campaign and Honour Seals (back in, round 3)**: one Seal per Battle won; setting values first to 1 (single Battle) / **3 (default)** / 5. A Truce earns no Seal and the Battle is replayed (same Vanguard, same Battle number). The Vanguard alternates each Battle; The Omen only decides Battle 1. Leaving the Field forfeits the Campaign.
- **The Floating World** (Quiet Evening 2 / Grand Banquet 4, default 4). A Geisha unveiled before the banners are raised waits, belongs to the flipper, and takes her colour when the banners rise.
- Surrounded (no legal Command) = loss. Raising the Banners = colours set by the first coloured Unveil.
- **Parked, do not build:** Sylly Mode, 4-player mode, board-size setting, Gunner shield variants, Samurai-strikes-Daimyo.

## 3. Status
- Brief v4 written. Python sim and JavaScript engine updated to the v4 rules; `python3 sim/test_engine.py` and `node proto/engine_tests.js` (21 checks) pass; `proto/parity_test.js` shows the JS engine identical to the Python engine on 12,357 recorded Commands over 240 Battles (v4 default, 2 Geisha with the old clocks, Shame off, Kunoichi without the Geisha capture).
- **Alpha prototype v4** (`proto/`): vs-bot test bed with Campaign (first to 1 / 3 / 5), Honour Seal tally on each seat, Next Battle / Replay the Battle / New Campaign flow, alternating Vanguard, full piece names on the tiles, hint button, show-movable toggle, bot-vs-bot spectate, battle log, playtest log with JSON/CSV export (record version `hsg-alpha-2`). War Council settings now: Campaign, Floating World, who plays, bot levels, who commands first in Battle 1, bot speed. Browser-tested in headless Chromium at 390px and 360px phone widths, light and dark; a full Campaign run bot against bot, and a forced Truce replay, behave as specified.
- Balance (bots, `balance-findings.md` round 6): Ronin plus Kunoichi cut the Geisha's share of Shogun kills from 79% to 71% at 4 Geisha (62% to 49% at 2). About 72% of bot Battles end with a toppled Shogun, 25% on the Long Night, 2.6% Truce; median 50 Commands. Shame triggers in about 5%.
- Not tested: real touch devices, long human sessions, Safari, a Campaign played by a human to the end.

## 4. Next steps
1. Sam playtests v4 (a few Campaigns) and exports the playtest log (Log, Playtest log, Copy JSON or CSV). Questions for the data: does the Geisha still decide too many Battles; do Ronin hunt Geisha in human play; do Gunner (2-3), Onmyoji and Kunoichi feel worth the tile; does first-to-3 feel right; how often do Truce replays happen; does anyone ever see Shogun's Shame.
2. Re-run the sim after any rule change and update `exp_matrix` in `sim/test_engine.py` and `proto/engine_tests.js` whenever brief §4b changes. Do not run another large simulation round unless Sam asks.
3. Real-app work (not started): suite integration (read the suite repo first), art, sound, MDLM/PTP modes, solo-vs-bot using the suite's own bot system, registry min/max players = 2, Campaign state in the suite's own match flow.
4. Board size (4×8, 6×6) is deferred; the geometry is parameterised by `W, H` at the top of both engines.

## 5. Files
- `hide-and-shogun-brief.md` — the brief, draft v4, to Sam's 21-section template.
- `proto/` — the prototype (`hide-and-shogun-alpha-standalone.html` to open directly), `engine.js`, tests, build script, `ui_template.html`.
- `sim/` — Python rules engine and bots, regression tests, batch runner (`run_batches.py` has the Geisha-counter comparison rows), `legacy/`.
- `balance-findings.md` — simulation results, all rounds (round 6 = v4 rules).
- `parity.json` — Python-engine traces used by `proto/parity_test.js`.

## 6. Working notes
- Sam wants short, direct answers and decisions called out; he answers feedback in numbered lists; he sometimes asks "what do you think?" and expects a recommendation with reasons.
- Australian English. Keep all theme vocabulary from brief §9.
- The piece code for the Ronin in both engines is `Rn` (it was `As`).
