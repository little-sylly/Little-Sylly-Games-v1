import sys, json, random, time, zlib
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from multiprocessing import Pool
from collections import Counter
from hsg_sim import *

OUT = os.path.dirname(os.path.abspath(__file__)) + '/'


def roster(**over):
    r = dict(BASE_ROSTER)
    r.update(over)
    assert sum(r.values()) == 15, r
    return r


VARIANTS = {
    'base':         dict(),
    'gs2_kn1':      dict(roster=roster(Gs=2, As=3)),
    'gs1_kn2':      dict(roster=roster(Kn=2, As=3)),
    'gs0_noassn':   dict(roster=roster(Gs=0, As=5)),
    'gn1':          dict(roster=roster(Gn=1, As=5)),
    'gn3':          dict(roster=roster(Gn=3, As=3)),
    'on1':          dict(roster=roster(On=1, As=5)),
    'on3':          dict(roster=roster(On=3, As=3)),
    'night_off':    dict(night=None),
    'night_12':     dict(night=12),
    'night_30':     dict(night=30),
    'sm_hits_dm':   dict(sm_hits_dm=True),
    'kn_range3':    dict(kn_range=3),
    'kn_no_exposed': dict(kn_hits_exposed=False),
    'night12_truce40': dict(night=12, truce_window=40),
    'truce_40':     dict(truce_window=40),
    'kn_adj_gs':    dict(kn_adj_gs=True),
    'dm_hits_gs':   dict(dm_hits_gs=True),
    # ---- round 2: Sam's questions
    'forced':       dict(forced_strike=True),
    'rk5':          dict(reckoning=5),
    'rk10':         dict(reckoning=10),
    'rk15':         dict(reckoning=15),
    'rk10_drop':    dict(reckoning=10, rk_shield_drop=True),
    'rk5_drop':     dict(reckoning=5, rk_shield_drop=True),
    'forced_rk10':  dict(forced_strike=True, reckoning=10),
    'on_all':       dict(on_all=True),
    'gn23_any':     dict(gn_ranges=(2, 3), gn_block='any'),
    'gn23_as':      dict(gn_ranges=(2, 3), gn_block='As'),
    'gn2_as':       dict(gn_block='As'),
    'gn2_any':      dict(gn_block='any'),
    'gn23_free':    dict(gn_ranges=(2, 3)),
    'on_all_gn2_as': dict(on_all=True, gn_block='As'),
    # ---- round 3: hired Geisha, per-clan stall clock
    'hire2':        dict(roster=dict(BASE_ROSTER, Gs=0), hire=2),
    'hire4':        dict(roster=dict(BASE_ROSTER, Gs=0, As=3), hire=4),
    'each6':        dict(stall='each', stall_n=6, night=None),
    'each10':       dict(stall='each', stall_n=10, night=None),
    'each15':       dict(stall='each', stall_n=15, night=None),
    'each10_lift':  dict(stall='each', stall_n=10, night=None, pun_lift=True),
    'each6_lift':   dict(stall='each', stall_n=6, night=None, pun_lift=True),
    'each10_rk':    dict(stall='each', stall_n=10, night=None, reckoning=10, rk_on_pun=True),
    'each10_hire2': dict(stall='each', stall_n=10, night=None, roster=dict(BASE_ROSTER, Gs=0), hire=2),
    'each10_hire4': dict(stall='each', stall_n=10, night=None, roster=dict(BASE_ROSTER, Gs=0, As=3), hire=4),
    'hire2_on_all': dict(roster=dict(BASE_ROSTER, Gs=0), hire=2, on_all=True),
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


def run(vname, botname, bot2name=None, games=2500):
    bot2name = bot2name or botname
    chunks = 10
    per = games // chunks
    jobs = [(vname, botname, bot2name, zlib.crc32(('%s|%s|%s|%d' % (vname, botname, bot2name, k)).encode()), per) for k in range(chunks)]
    with Pool(2) as p:
        res = [r for chunk in p.map(worker, jobs) for r in chunk]
    return res


def summarize(res):
    n = len(res)
    win = Counter(r['winner'] for r in res)
    cm = sorted(r['cmds'] for r in res)
    sg = [r for r in res if r['reason'] == 'shogun']
    byt = Counter(r['sg_by'] for r in sg)
    kills = Counter()
    for r in res:
        for k, v in r['kills'].items():
            kills[k] += v
    deaths = Counter()
    for k, v in kills.items():
        a, vic = k.split('>')
        deaths[vic] += v
    killer = Counter()
    for k, v in kills.items():
        killer[k.split('>')[0]] += v
    tr = [r for r in res if r['reason'] == 'truce']
    ontn = sum(r['on_turns'] for r in res)
    gnt = sum(r['gn_turns'] for r in res)
    pcs = [sum(r['left'][c].values()) for r in tr for c in (0, 1)] if tr and 'left' in tr[0] else []
    rk = [r for r in res if r['reason'] in ('reckoning', 'rk_tie')]
    extra = dict(
        killer={k: v / n for k, v in killer.items()},
        died={k: v / n for k, v in deaths.items()},
        on_can_per_turn=sum(r['on_can'] for r in res) / max(1, ontn),
        on_cant_per_turn=sum(r['on_cant'] for r in res) / max(1, ontn),
        on_turns=ontn / n,
        gn_can_per_turn=sum(r['gn_can'] for r in res) / max(1, gnt),
        gn_cant_per_turn=sum(r['gn_cant'] for r in res) / max(1, gnt),
        gn_adj_per_turn=sum(r['gn_adj'] for r in res) / max(1, gnt),
        gn_turns=gnt / n,
        truce_shrouds_mean=(sum(r['shrouds'] for r in tr) / len(tr)) if tr else None,
        truce_with_shrouds=(sum(r['shrouds'] > 0 for r in tr) / len(tr)) if tr else None,
        truce_pieces_per_clan=(sum(pcs) / len(pcs)) if pcs else None,
        truce_geisha_alive=(sum(any(r['left'][c]['Gs'] for c in (0, 1)) for r in tr) / len(tr)) if tr else None,
        truce_end_strikes_avail=(sum(any(x > 0 for x in r.get('end_strikes', [0])) for r in tr) / len(tr)) if tr else None,
        declined_share_post_night=sum(r['declined_post_night'] for r in res) / max(1, sum(r['post_night_cmds'] for r in res)),
        rk_decided=len([r for r in res if r['reason'] == 'reckoning']) / n,
        rk_tie=len([r for r in res if r['reason'] == 'rk_tie']) / n,
        rk_margin_mean=(sum(r['rk_margin'] for r in rk) / len(rk)) if rk else None,
        shogun_falls=len([r for r in res if r['reason'] == 'shogun']) / n,
        pun_any=sum(1 for r in res if any(x is not None for x in r['pun'])) / n,
        pun_team0=sum(1 for r in res if r['pun'][0] is not None) / n,
        pun_team1=sum(1 for r in res if r['pun'][1] is not None) / n,
        pun_win_by_other=(lambda g: (sum(1 for r in g if r['winner'] in (0, 1) and r['pun'][1 - r['winner']] is not None and r['pun'][r['winner']] is None) / max(1, sum(1 for r in g if (r['pun'][0] is None) != (r['pun'][1] is None) and r['winner'] in (0, 1)))))(res),
        first_hire_clan_wins=(lambda g: (sum(1 for r in g if r['winner'] == r['first_hire'][0]) / max(1, len(g))))([r for r in res if r['first_hire'] is not None and r['winner'] in (0, 1)]),
        first_hire_by_flipper=(lambda g: (sum(1 for r in g if r['first_hire'][2]) / max(1, len(g))))([r for r in res if r['first_hire'] is not None]),
        first_hire_cmd=(lambda g: (sum(r['first_hire'][1] for r in g) / max(1, len(g))))([r for r in res if r['first_hire'] is not None]),
    )
    return dict(
        extra,
        n=n,
        vanguard=win[0] / n, rearguard=win[1] / n, truce=win[-1] / n,
        surrounded=sum(r['reason'] == 'surrounded' for r in res) / n,
        mean_cmds=sum(cm) / n, median_cmds=cm[n // 2], p90_cmds=cm[int(n * .9)],
        night=sum(r['night'] for r in res) / n,
        by_geisha=byt['Gs'] / max(1, len(sg)),
        by_gunner=byt['Gn'] / max(1, len(sg)),
        by_exposed_other=(len(sg) - byt['Gs']) / max(1, len(sg)),
        by_type={k: v / max(1, len(sg)) for k, v in byt.items()},
        charges=sum(r['charges'] for r in res) / n,
        volleys=sum(r['volleys'] for r in res) / n,
        vaults=sum(r['vaults'] for r in res) / n,
        unveils=sum(r['unveils'] for r in res) / n,
        kills={k: v / n for k, v in kills.items()},
    )


if __name__ == '__main__':
    bot = sys.argv[1]
    bot, _, bot2 = bot.partition(':')
    bot2 = bot2 or None
    tag = bot + ('_v_' + bot2 if bot2 else '')
    names = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] != 'all' else list(VARIANTS)
    games = int(sys.argv[3]) if len(sys.argv) > 3 else 2500
    allres = {}
    for v in names:
        t0 = time.time()
        res = run(v, bot, bot2, games=games)
        allres[v] = summarize(res)
        s = allres[v]
        print("%-14s van %.3f rear %.3f truce %.3f | cmds mean %.0f med %d | night %.2f | Geisha %.2f Exposed-other %.2f | %.0fs"
              % (v, s['vanguard'], s['rearguard'], s['truce'], s['mean_cmds'], s['median_cmds'], s['night'],
                 s['by_geisha'], s['by_exposed_other'], time.time() - t0), flush=True)
        json.dump(allres, open(OUT + 'results_%s.json' % tag, 'w'))
