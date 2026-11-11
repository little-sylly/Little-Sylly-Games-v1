"""Batch runner.  python3 run_batches.py <bot[:bot2]> <variant,variant|all> <games>
e.g.  python3 run_batches.py aggro base,ff_off,night12 2000      (same bot both seats)
      python3 run_batches.py flip:stall base 1200                (first bot sits in the Vanguard seat; run both orders and average)
Seeds are deterministic (crc32). Results -> results_<bot>.json next to this file. Differences under ~3 points at 2,000 games are noise."""
import sys, os, json, random, time, zlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from multiprocessing import Pool
from collections import Counter
from hsg_sim import *

OUT = HERE + '/'

VARIANTS = {
    # ---- the agreed ruleset and its settings
    'base':         dict(),                                  # v4: hire 4, Shame 5, Long Night 12, Gunner 2-3, Ronin hit Geisha, Kunoichi hits all but Geisha / Guarded Shogun
    'kn_gs':        dict(kn_hits_gs=True),                   # Kunoichi keeps the Geisha capture
    'kn_old':       dict(kn_all=False, kn_hits_gs=True),     # v3 Kunoichi (below her rank + Geisha)
    'rn_nogs':      dict(rn_hits_gs=False),                  # Ronin cannot hit Geisha
    'night20_ff10': dict(night=20, ff_n=10),
    'hire2':        dict(hire=2),
    'hire2_night20': dict(hire=2, night=20, ff_n=10),
    # ---- Geisha counter comparison (who may strike a Geisha), hire 4 and hire 2
    'gc_none':      dict(kn_hits_gs=False, rn_hits_gs=False),
    'gc_kn':        dict(kn_hits_gs=True, rn_hits_gs=False),
    'gc_rn':        dict(kn_hits_gs=False, rn_hits_gs=True),
    'gc_both':      dict(kn_hits_gs=True, rn_hits_gs=True),
    'gc2_none':     dict(hire=2, kn_hits_gs=False, rn_hits_gs=False),
    'gc2_kn':       dict(hire=2, kn_hits_gs=True, rn_hits_gs=False),
    'gc2_rn':       dict(hire=2, kn_hits_gs=False, rn_hits_gs=True),
    'gc2_both':     dict(hire=2, kn_hits_gs=True, rn_hits_gs=True),
    # ---- comparisons / what-ifs
    'ff_off':       dict(forced_fight=False),
    'ff10':         dict(ff_n=10),
    'night_off':    dict(night=None, forced_fight=True),
    'classic_gs':   dict(hire=0),                            # one fixed Geisha per clan (old model)
    'gn_as_shield': dict(gn_block='Rn'),
    'gn23_as':      dict(gn_ranges=(2, 3), gn_block='Rn'),
    'forced_strike': dict(forced_strike=True),
}


def worker(args):
    vname, botname, bot2name, seed, n = args
    cfg = Cfg(**VARIANTS[vname])
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        r = play(cfg, (BOTS[botname], BOTS[bot2name]), rng)
        r['kills'] = dict((a + '>' + b, c) for (a, b), c in r['kills'].items())
        out.append(r)
    return out


def run(vname, botname, bot2name=None, games=2000):
    bot2name = bot2name or botname
    chunks = 10
    per = max(1, games // chunks)
    jobs = [(vname, botname, bot2name, zlib.crc32(('%s|%s|%s|%d' % (vname, botname, bot2name, k)).encode()), per) for k in range(chunks)]
    with Pool(2) as p:
        return [r for chunk in p.map(worker, jobs) for r in chunk]


def summarize(res):
    n = len(res)
    win = Counter(r['winner'] for r in res)
    reasons = Counter(r['reason'] for r in res)
    cm = sorted(r['cmds'] for r in res)
    sg = [r for r in res if r['reason'] == 'shogun']
    byt = Counter(r['sg_by'] for r in sg)
    kills = Counter()
    for r in res:
        for k, v in r['kills'].items():
            kills[k] += v
    killer, died = Counter(), Counter()
    for k, v in kills.items():
        a, vic = k.split('>')
        killer[a] += v
        died[vic] += v
    ontn = sum(r['on_turns'] for r in res)
    gnt = sum(r['gn_turns'] for r in res)
    nights = [r for r in res if r['reason'].startswith('night')]
    return dict(
        n=n, seat0=win[0] / n, seat1=win[1] / n, draw=win[-1] / n,
        shogun=reasons['shogun'] / n, night_count=reasons['night_count'] / n, night_tie=reasons['night_tie'] / n,
        surrounded=reasons['surrounded'] / n, cap=reasons['cap'] / n,
        night_margin_mean=(sum(r['night_margin'] for r in nights) / len(nights)) if nights else None,
        mean_cmds=sum(cm) / n, median_cmds=cm[n // 2], p90_cmds=cm[int(n * .9)],
        by_geisha=byt['Gs'] / max(1, len(sg)), by_type={k: v / max(1, len(sg)) for k, v in byt.items()},
        ff_any=sum(1 for r in res if any(x is not None for x in r['ff'])) / n,
        ff_shogun_flipped=sum(1 for r in res if any(r['ff_shogun_flipped'])) / n,
        charges=sum(r['charges'] for r in res) / n, volleys=sum(r['volleys'] for r in res) / n,
        vaults=sum(r['vaults'] for r in res) / n, unveils=sum(r['unveils'] for r in res) / n,
        killer={k: v / n for k, v in killer.items()}, died={k: v / n for k, v in died.items()},
        on_can_per_turn=sum(r['on_can'] for r in res) / max(1, ontn), on_cant_per_turn=sum(r['on_cant'] for r in res) / max(1, ontn),
        gn_can_per_turn=sum(r['gn_can'] for r in res) / max(1, gnt), gn_adj_per_turn=sum(r['gn_adj'] for r in res) / max(1, gnt),
        first_hire_clan_wins=(lambda g: sum(1 for r in g if r['winner'] == r['first_hire'][0]) / max(1, len(g)))(
            [r for r in res if r['first_hire'] is not None and r['winner'] in (0, 1)]),
        shrouds_left=sum(r['shrouds'] for r in res) / n,
        kills={k: v / n for k, v in kills.items()},
    )


if __name__ == '__main__':
    bot = sys.argv[1]
    bot, _, bot2 = bot.partition(':')
    bot2 = bot2 or None
    tag = bot + ('_v_' + bot2 if bot2 else '')
    names = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] != 'all' else list(VARIANTS)
    games = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
    allres = {}
    for v in names:
        t0 = time.time()
        res = run(v, bot, bot2, games=games)
        allres[v] = summarize(res)
        s = allres[v]
        print("%-15s seat0 %.3f seat1 %.3f draw %.3f | Shogun %.2f NightCount %.2f | cmds mean %.0f med %d | FF %.2f | Geisha-kill %.2f | %.0fs"
              % (v, s['seat0'], s['seat1'], s['draw'], s['shogun'], s['night_count'], s['mean_cmds'], s['median_cmds'],
                 s['ff_any'], s['by_geisha'], time.time() - t0), flush=True)
        json.dump(allres, open(OUT + 'results_%s.json' % tag, 'w'))
