"""Export Python-engine traces for the JS parity test: per Command, the full state before it, the Command chosen, and the legal
Command list for both colours. The JS engine must reproduce every list and every transition."""
import sys, json, random
sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'sim'))
import hsg_sim as HS
from hsg_sim import Cfg, BOTS

def snap(S):
    return dict(board=[None if c is None else [c[0], c[1], bool(c[2])] for c in S.board], teamCol=list(S.team_col), dm=list(S.dm),
                fo=list(S.fo), stall=list(S.stall), hired=list(S.hired), quiet=S.quiet, shrouds=S.shrouds, cmd=S.cmd,
                pending=[[next(i for i, x in enumerate(S.board) if x is pc), t] for pc, t in S.pending])

def sortacts(a): return sorted([list(x) for x in a])
orig = HS.choose
records = []
def spy(S, team, rng, bot):
    act = orig(S, team, rng, bot)
    rec = dict(before=snap(S), team=team, act=None if act is None else list(act))
    legal_lists = {}
    for col in (0, 1):
        legal_lists[col] = sortacts(HS.gen_actions(S, col))
    rec['legal'] = legal_lists
    rec['exposed'] = [HS.exposed(S, 0), HS.exposed(S, 1)]
    records.append(rec)
    return act
HS.choose = spy
out = []
for cfgname, kw in (('v4', {}), ('night20_hire2', dict(night=20, hire=2, ff_n=10)), ('v4_ffoff', dict(forced_fight=False)), ('v4_kn_nogs', dict(kn_hits_gs=False))):
    for seed in range(60):
        records.clear()
        cfg = Cfg(**kw)
        rng = random.Random(1000 + seed)
        bots = (BOTS['aggro'], BOTS['stall']) if seed % 3 == 0 else (BOTS['cautious'], BOTS['hunt']) if seed % 3 == 1 else (BOTS['random'], BOTS['flip'])
        res = HS.play(cfg, bots, rng)
        out.append(dict(cfg=dict(hire=cfg.hire, night=cfg.night, forcedFight=cfg.forced_fight, ffN=cfg.ff_n, knHitsGs=cfg.kn_hits_gs), records=list(records),
                        result=dict(winner=res['winner'], reason=res['reason'], cmds=res['cmds'], nightCounts=res.get('night_counts'))))
json.dump(out, open('parity.json', 'w'))
print(len(out), "games", sum(len(g['records']) for g in out), "commands")
