# Hide and Shogun — balance findings so far (simulator, heuristic bots)

> **Superseded in part (11 Nov 2026).** The brief moved to `docs/new-game-brief-hide-and-shogun.md` and is now **draft v5** (the Paper Castle world; Geisha → Fox, Daimyo → Guard, Onmyoji → Monk, Kunoichi → Ninja, Gunner → Archer, Ronin → Farmer; Shroud/Unveil → Door/Open; Long Night → The Last Lantern; Shogun's Shame cut; a Truce replay flips the first move). The engines and tests in this folder still use the v4 names; Shame now defaults OFF in both engines. Where this file disagrees with the v5 brief, the brief wins.

All numbers come from `sim/` (heuristic bots; gaps under ~3 points at ~2,000 games are noise; humans will differ, especially with Gunner/Onmyoji). Rounds 1-3 used earlier rule sets (see `sim/legacy/`); rounds 4 and 5 used the v2 and v3 rules (Ashigaru, Gunner range 2, Shame 10, Night 20).

## Round 6 (12 Oct 2026): v4 rules, aggro bots (2,000 Battles per row unless stated)
v4 = Ronin replace the Ashigaru and may strike a Geisha; Kunoichi Vault takes anything but a Guarded Shogun (Geisha included); Gunner range 2 or 3; Onmyoji ranked above the Samurai; Shogun's Shame fixed at 5 own Commands; Long Night fixed at 12. The JavaScript engine (1,000 Battles) matches the Python numbers within noise, and replays 12,357 recorded Python Commands move for move.

**Who may strike a Geisha** (the owner's requested comparison; "Geisha share" = share of toppled-Shogun Battles where a Geisha made the capture):

| Counter to the Geisha | 4 Geisha: Shogun toppled | Night count | Geisha share | Geisha dead per Battle | 2 Geisha: Shogun toppled | Night count | Geisha share | Geisha dead per Battle |
|---|---|---|---|---|---|---|---|---|
| None | 83% | 15% | 79% | 0.00 | 69% | 29% | 62% | 0.00 |
| Kunoichi only (old rule) | 81% | 17% | 77% | 0.24 | 65% | 32% | 57% | 0.15 |
| Ronin only | 75% | 22% | 73% | 0.77 | 57% | 39% | 55% | 0.59 |
| **Ronin and Kunoichi (adopted)** | **73%** | **25%** | **71%** | **0.99** | **58%** | **38%** | **49%** | **0.65** |

Other v4 numbers (4 Geisha unless stated): median 51 Commands, Truce 1.8%, Shame triggers in 5-6% of Battles; Shame switched off moves about 4 points of endings from Shogun toppled to the Long Night (69% / 29%); 2 Geisha: 53-58% / 38-42%, median 60-62, Truce 4%; the Vanguard seat wins 49-53% (noise). Easy / Normal / Expert / Expert+ bots end 85 / 72 / 70 / 69% of Battles with a toppled Shogun.

Per piece, per Battle, both clans together (kills / deaths): Gunner 1.8 / 2.1 (v3: 1.0 / 2.2), Onmyoji 1.5 / 1.7 (1.4 / 1.8), Kunoichi 1.0 / 1.0, Ronin 1.8 / 2.6, Samurai 1.1 / 1.9, Daimyo 2.1 / 1.7, Geisha 0.5 / 1.0. At 2 Geisha: Gunner 2.0 / 2.6, Onmyoji 1.9 / 2.1, Ronin 2.3 / 4.3.

Brainstorm experiments behind the decisions (1,000 Battles, aggro, 4 Geisha, one change at a time on the v3 rules): base v3 86% Shogun toppled; Ronin-only Geisha capture 74%; every contact piece may hit the Geisha 40% (Night 60%, too stally); Gunner 2-3 raised Gunner kills from 1.04 to 1.59; Onmyoji above the Samurai raised Onmyoji kills 1.43 to 1.75 and cut Samurai kills 1.59 to 1.10; Shame 5 / Night 12 alone 80% / 20%. Staller versus flipper under the face-up count: Night 12 staller 53% against 45%; Night 20 51% against 48% (a quiet player keeps a small edge at 12, worth watching in human play).

The owner's first playtest log (6 Battles): Geisha made the winning strike in 4; 1 of 18 hired Geisha died; Shogun made 31 of 102 strikes; Gunner 4 kills / 15 deaths; Onmyoji 15 / 18; Battles of 47-90 Commands, about 100-160 seconds each.

## Round 5 (12 Oct 2026): v3 rules, aggro bots
Two rule changes from the owner's round-2 answers: Shogun's Shame (was Forced Fight) only triggers while the Shogun is still face-down, and the Long Night counts face-up pieces only. Python sim 1,000 games per row; the JavaScript port in `proto/` 2,000 games per row (the two agree within noise).

| Setting | Shogun toppled | Ended on piece count | Truce | Median Commands | Geisha share of Shogun kills | Shame triggers |
|---|---|---|---|---|---|---|
| v2 rules (legacy flags), for reference | 85% | 13% | 1.6% | 50 | 79% | 30% of Battles |
| v3 default (4 Geisha, Shame on, Night 20) | 85-87% | 12-14% | 1.4-1.5% | 48-49 | 81-82% | 3% |
| v3, Night 12 | 75% | 23% | 2.1-2.3% | 48-49 | 80-82% | 1% |
| v3, 2 Geisha | 69% | 27-28% | 2.8-3.7% | 66-67 | 66% | 3% |
| v3, 2 Geisha, Night 12 | 56-60% | 35-41% | 3.3-4.4% | 60-61 | 66-68% | 1% |
| v3, Shame off | 83-84% | 15% | 1.1-1.7% | 48-49 | 82% | 0% |

What changed: almost nothing in the Battle mix. The one real effect is that Shogun's Shame is now rare (about 3% of bot Battles, down from about 30%), because the Shogun is usually unveiled long before the 10-Command clock matters. It is a guardrail, as intended. Counting face-up pieces at the Long Night moved bot results by about 1-2 points (within noise); the interesting effect is human behaviour (unveiling when ahead), which only playtests can show. The "Short Night favours the turtle" finding below was measured under the v2 count and has not been re-run head to head.

## Round 4 ruleset (v2, aggro bots, 2,000 games each)
| Setting | Shogun toppled | Ended on piece count (Night) | Truce (equal count) | Median Commands | Geisha share of Shogun kills |
|---|---|---|---|---|---|
| Default (4 Geisha, Forced Fight on, Night 20) | 86% | 12% | 1.5% | 49 | 80% |
| Night 12 | 75% | 23% | 2.4% | 50 | 82% |
| 2 Geisha | 72% | 25% | 2.7% | 68 | 67% |
| 2 Geisha, Night 12 | 56% | 40% | 4.0% | 62 | 65% |
| Forced Fight off | 83% | 15% | 1.4% | 48 | 81% |
| Forced Fight at 6 own Commands | 85% | 13% | 1.8% | 49 | 80% |
| Seat 0 / seat 1 win rate (default) | 49% / 50% | | | | |

Per piece, per Battle (aggro, default): kills/deaths - Shogun 1.5/0.43, Daimyo 0.60/0.37, Samurai 0.41/0.45, Kunoichi 0.32/0.48, Onmyoji 0.36/0.45, Gunner 0.24/0.54, Ashigaru 0.16/0.40; the Geisha as a group kills 0.69 pieces per Battle (almost all Shoguns). With "hunt" bots: Onmyoji 0.46/0.49, Gunner 0.33/0.56.

## Behavioural findings
1. Forced Fight triggers in ~28% of Battles but found the Shogun still face-down in only ~4%. Its effect at the defaults is small (its 10-each clock arrives about when the 20-total Night does).
2. Short Night (12) rewards the cautious player: staller bot beat flip-heavy bot 53% to 44% (at Night 20: even, 49-50%).
3. The Geisha is the main Shogun killer (80% at 4 Geisha). The Guard mostly delays. Default 4 kept by design decision; revisit.
4. First Geisha hired: the hiring clan wins ~50%. No first-flip advantage with bots.
5. The Onmyoji on the Gunner strike table roughly doubles her kills (0.20 -> 0.4-0.5 per piece) without changing results; Gunner and Onmyoji still die more than they kill.
6. Bots that "fish" (flip a tile they can shoot next turn): the setup works (about 60% of fishing flips leave a legal strike next turn), but the bot only takes the shot ~31% of the time; Gunner kills +40%, no head-to-head gain.

## Earlier rounds (old rules) that shaped the design
- Draws before the new clocks: 12-15% (both Shoguns Exposed after a Night, then 20 more quiet Commands). Mostly sparse boards (about 62% empty, 5-6 pieces per clan): nobody walked into a capture. A search bot drew more (17.7%), so it is not bot shallowness alone.
- Forced strike (must strike if able) cut draws 14% -> 9%. Piece-count Reckoning cut draws to ~3% but rewarded turtling (staller won 58-41 in one setup).
- Per-clan stall clock cut draws 14% -> 7% on its own and gave a flip-heavy player a ~+4 point edge over a staller.
- No effect (within noise), so not adopted: Vault range cap at 3, Kunoichi barred from an Exposed Shogun, Samurai striking Daimyo.
- Gunner range 2-3: kills +70% free; Ashigaru-only shield -8% at range 2 (a possible later dial); any-piece shield cripples her (-70%).
- Two fixed Geisha per clan vs one: Geisha share of Shogun kills 77% vs 55%, median game 52 vs 71 Commands.
- Onmyoji could not strike 71% of the enemies standing diagonal to her under the old rank table.
