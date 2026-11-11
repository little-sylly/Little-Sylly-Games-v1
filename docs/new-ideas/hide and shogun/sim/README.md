# Hide and Shogun balance simulator (matches brief draft v4)

Python 3 only, no dependencies. ~0.02 s per game (heuristic bots), ~0.1 s with the search bot.

Run first after ANY rule change:   python3 test_engine.py
Batch balance runs:               python3 run_batches.py <bot[:bot2]> <variant,variant|all> <games>
  e.g.  python3 run_batches.py aggro base,hire2,ff_off 2000
        python3 run_batches.py flip:stall base 1200      (first bot sits in seat 0 / Vanguard; run both orders and average)
Seeds are deterministic. At ~2,000 games, gaps under ~3 points are noise.

Files
- hsg_sim.py     the rules engine (Cfg flags), bots, play(), and a docstring spelling out the ruleset
- test_engine.py replays brief sample round A through the real engine, scenarios C1-C6 rules, full capture matrix (update exp_matrix when brief 4b changes), guard / forced-out rules, hire cap, Shogun's Shame (5) and the Long Night (12) in real games
- run_batches.py VARIANTS dict holds the settings combinations; summarize() produces the numbers quoted in the brief
- legacy/        earlier rule experiments and their runner (reference only)

Settings = Cfg(...) fields:  hire (2|4; 0 = old fixed Geisha), night (12 fixed rule; 20 or None for experiments), forced_fight (True; Shogun's Shame), ff_n (5, fixed rule)
v3 rule flags (both default True): ff_facedown_only (Shame only triggers on a face-down Shogun), night_faceup (Long Night counts face-up pieces). Cfg(ff_facedown_only=False, night_faceup=False) reproduces the v2 rules exactly.
v4 rule flags: kn_hits_gs (True: the Kunoichi's Vault takes a Geisha), rn_hits_gs (True: Ronin take a Geisha), kn_all (True: the Kunoichi ignores rank), gn_ranges ((2, 3)). The piece code for the Ronin is 'Rn' (it was 'As', Ashigaru). VARIANTS in run_batches.py has the Geisha-counter comparison rows (gc_none, gc_kn, gc_rn, gc_both and gc2_* for 2 Geisha).
Experiment flags: on_all (Onmyoji table), gn_block ('any'|'Rn'), forced_strike, kn_range, sm_hits_dm

Bots (difficulty ladder for solo play): random < cautious < aggro < fish < hunt < search3
- random   uniform legal move (does not even take a free Shogun capture; an 'easy' solo bot should add that)
- cautious/aggro  1-ply: score = capture value - biggest threat after the move + approach bonus; Unveil value sampled from the hidden pool
- fish     also Unveils tiles that its Gunner/Onmyoji can strike next turn and drifts them towards Shrouds
- hunt     fish + heavier appetite for captures
- search2/3 alpha-beta negamax with capture quiescence once no Shrouds remain, hunt-style before that
- flip / stall  test personalities (flip-heavy, avoids flipping)
All bots read the Long Night and Forced Fight clocks: behind or level near the Night -> hunt; ahead -> sit tight; near a Forced Fight trigger -> flip or capture.
Bots do not plan shields, nets or multi-move combinations, and play the Geisha hunt only by proximity; expect humans to differ.

Engine notes for porting
- Board is a flat 30-cell list; piece = [colour, type, faceUp]; colour 0/1, 2 = un-hired Geisha. Precomputed NB (orthogonal), DIAG, RAYS per cell.
- Strikes: piece_strikes() per piece; Vault finds the first piece (the screen) then the first piece beyond it.
- exposed(S, col): no Daimyo alive, or Shogun forced out and no FACE-UP Daimyo.
- A JavaScript port of the whole engine and bots lives in ../proto/engine.js. tools: proto/parity_test.js compares it with traces exported from this file (see ../proto/README.md).
- Forced Fight and Long Night counters are in play(); bots only see them via S.stall and S.quiet.
