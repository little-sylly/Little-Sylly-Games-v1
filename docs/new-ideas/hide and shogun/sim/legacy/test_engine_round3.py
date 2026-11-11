import random, time, sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hsg_sim import *
from hsg_sim import legal as legal_moves

def pos(s):
    return idx("ABCDE".index(s[0]), int(s[1]) - 1)

IV, CR = 0, 1
cfg = Cfg()

def empty_state(dm=(2, 2)):
    S = State()
    S.board = [None] * N
    S.team_col = [IV, CR]
    S.dm = list(dm)
    S.night = False
    S.quiet = 0
    S.pool = Counter()
    S.cmd = 0
    S.cfg = cfg
    S.shrouds = 0
    S.rk = None
    S.pun = [False, False]
    S.stall = [0, 0]
    S.hired = [0, 0]
    S.pending = []
    return S

def put(S, p, col, t, up=True):
    S.board[pos(p)] = [col, t, up]

def legal(S, col, act):
    return act in gen_actions(S, col)

# ---------- Sample A ----------
rows = [
 "I-Dm C-Gn I-As C-Sm I-On",
 "C-On I-Kn C-Dm I-Gn C-As",
 "I-Sg C-Gs I-Sm C-As I-As",
 "C-Sg I-On C-Kn I-Dm C-Gn",
 "I-Gn C-Sm I-As C-On I-Gs",
 "C-Dm I-As C-As I-Sm C-As",
]
S = empty_state()
for r, line in enumerate(rows):
    for c, tok in enumerate(line.split()):
        S.board[idx(c, r)] = [IV if tok[0] == 'I' else CR, tok[2:], False]
# Command 1: Mia (Vanguard) unveils C3 -> Ivory Samurai; Vanguard = Ivory
assert S.board[pos('C3')][1] == 'Sm' and S.board[pos('C3')][0] == IV
S.board[pos('C3')][2] = True
for step, (col, act) in enumerate([
    (CR, ('U', pos('B3'))),
    (IV, ('U', pos('D3'))),
    (CR, ('U', pos('A3'))),
], start=2):
    assert legal(S, col, act), step
    S.board[act[1]][2] = True
# Command 4 consequences: Ivory Shogun cannot move or strike Geisha
iv_acts = gen_actions(S, IV)
assert not any(a[0] in 'MCS' and a[1] == pos('A3') for a in iv_acts), "Shogun should have no moves"
# Ivory has nothing that can take the Geisha at B3
assert not any(a[0] == 'S' and a[2] == pos('B3') for a in iv_acts)
# Command 5: Samurai strikes D3
act = ('S', pos('C3'), pos('D3'), 'x')
assert legal(S, IV, act)
S.board[pos('D3')] = S.board[pos('C3')]; S.board[pos('C3')] = None
# Command 6: Geisha strikes Guarded Shogun
assert S.dm[IV] == 2
act = ('S', pos('B3'), pos('A3'), 'x')
assert legal(S, CR, act)
print("Sample A replays legally; Geisha takes a Guarded Shogun")
# And a non-Geisha could NOT take the Guarded Shogun
S2 = empty_state(); put(S2, 'A3', IV, 'Sg'); put(S2, 'B3', CR, 'Dm'); put(S2, 'A4', CR, 'Gn'); put(S2, 'A5', CR, 'As')
assert not any(a[0] == 'S' and a[2] == pos('A3') for a in gen_actions(S2, CR)), "guard must hold vs Daimyo and Gunner"

# ---------- C1: Charge past the Gunner ----------
S = empty_state(); put(S, 'C6', IV, 'Sm'); put(S, 'C3', CR, 'Gn'); put(S, 'C2', CR, 'As')
put(S, 'B3', CR, 'As', up=False); put(S, 'D3', CR, 'As', up=False)
a = gen_actions(S, IV)
assert ('C', pos('C6'), pos('C4')) in a
assert ('M', pos('C6'), pos('C5')) in a
# Gunner threatens C5 but not C6/C4
g = [x for x in gen_strikes(S, CR)]
S3 = empty_state(); put(S3, 'C5', IV, 'Sm'); put(S3, 'C3', CR, 'Gn')
assert (pos('C3'), pos('C5'), 'v') in gen_strikes(S3, CR)
S3 = empty_state(); put(S3, 'C4', IV, 'Sm'); put(S3, 'C3', CR, 'Gn')
assert gen_strikes(S3, CR) == []
assert (pos('C4'), pos('C3'), 'x') in gen_strikes(S3, IV)
print("C1 ok")

# ---------- C2: Vault ----------
S = empty_state(); put(S, 'B1', IV, 'Sg'); put(S, 'B2', CR, 'Gs'); put(S, 'B4', IV, 'As'); put(S, 'B6', IV, 'Kn')
assert (pos('B6'), pos('B2'), 'k') in gen_strikes(S, IV)
# Geisha adjacent to Shogun threatens him; Shogun can't hit her
assert (pos('B2'), pos('B1'), 'x') in gen_strikes(S, CR)
assert not any(s[1] == pos('B2') for s in gen_strikes(S, IV) if s[0] == pos('B1'))
S = empty_state(); put(S, 'B3', IV, 'Kn'); put(S, 'B2', CR, 'Gs')
assert gen_strikes(S, IV) == [], "adjacent Kunoichi cannot Vault"
print("C2 ok")

# ---------- C3: Guard falls ----------
S = empty_state(dm=(2, 1))
put(S, 'D1', CR, 'Sg'); put(S, 'B1', CR, 'Dm'); put(S, 'B3', IV, 'Gn'); put(S, 'D2', IV, 'As')
assert not any(s[2] == pos('D1') for s in gen_strikes(S, IV)), "Guarded Shogun untouchable by Ashigaru"
assert (pos('B3'), pos('B1'), 'v') in gen_strikes(S, IV)
sim_apply(S, ('S', pos('B3'), pos('B1'), 'v'))
assert S.dm[CR] == 0
assert (pos('D2'), pos('D1'), 'x') in gen_strikes(S, IV), "Exposed Shogun can be hit by Ashigaru"
assert (pos('D1'), pos('D2'), 'x') in gen_strikes(S, CR), "Shogun may take the Ashigaru"
print("C3 ok")

# ---------- C4: Cast ----------
S = empty_state(); put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Gn'); put(S, 'B3', CR, 'As', up=False); put(S, 'C4', IV, 'As', up=False)
assert (pos('B4'), pos('C3'), 'x') in gen_strikes(S, IV)
S = empty_state(); put(S, 'B4', IV, 'On'); put(S, 'B3', CR, 'Gn')
assert gen_strikes(S, IV) == [], "Onmyoji cannot strike orthogonally"
print("C4 ok")

# ---------- full capture matrix vs brief ----------
types = ['Sg', 'Dm', 'Sm', 'Kn', 'On', 'Gn', 'As', 'Gs']
# expected exactly as in brief 4b (exposed=False/True for Shogun column)
exp_matrix = {
 'Sg': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, As=1, Gs=0),
 'Dm': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, As=1, Gs=0),
 'Sm': dict(Sg='*', Dm=0, Sm=1, Kn=1, On=1, Gn=1, As=1, Gs=0),
 'Kn': dict(Sg='*', Dm=0, Sm=0, Kn=0, On=1, Gn=1, As=1, Gs=1),
 'On': dict(Sg='*', Dm=0, Sm=0, Kn=0, On=1, Gn=1, As=1, Gs=0),
 'Gn': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, As=1, Gs=0),
 'As': dict(Sg='*', Dm=0, Sm=0, Kn=0, On=0, Gn=1, As=1, Gs=0),
 'Gs': dict(Sg=1,  Dm=0, Sm=0, Kn=0, On=0, Gn=0, As=0, Gs=0),
}
for a in types:
    for t in types:
        e = exp_matrix[a][t]
        g = can_hit(cfg, a, t, False)
        gx = can_hit(cfg, a, t, True)
        if e == '*':
            assert (not g) and gx, (a, t)
        else:
            assert bool(e) == g == gx, (a, t, e, g, gx)
print("capture matrix matches brief 4b")

# ---------- random + bot games: invariants and speed ----------
def check_counts(res):
    pass

for name in ('random', 'cautious', 'aggro'):
    rng = random.Random(1)
    t0 = time.time()
    n = 40 if name != 'random' else 300
    outs = []
    for g in range(n):
        outs.append(play(cfg, (BOTS[name], BOTS[name]), rng))
    dt = time.time() - t0
    cm = sorted(o['cmds'] for o in outs)
    print(name, "games", n, "sec/game %.3f" % (dt / n), "median cmds", cm[len(cm)//2],
          "winners", Counter(o['winner'] for o in outs), "reasons", Counter(o['reason'] for o in outs))

# ---------- new options ----------
c2 = Cfg(on_all=True)
S = empty_state(); S.cfg = c2; put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Dm'); put(S, 'A3', CR, 'Gs'); put(S, 'C5', CR, 'Sg')
st = gen_strikes(S, IV)
assert (pos('B4'), pos('C3'), 'x') in st and not any(s[1] == pos('A3') for s in st) and not any(s[1] == pos('C5') for s in st)
print("on_all ok")

c3 = Cfg(gn_ranges=(2, 3), gn_block='any')
S = empty_state(); S.cfg = c3; put(S, 'C1', IV, 'Gn'); put(S, 'C3', CR, 'As'); put(S, 'C4', CR, 'Sm')
assert (pos('C1'), pos('C3'), 'v') in gen_strikes(S, IV) and (pos('C1'), pos('C4'), 'v') not in gen_strikes(S, IV)
put(S, 'C2', CR, 'As', up=False)   # a piece between blocks range 2 and 3
assert gen_strikes(S, IV) == []
c4 = Cfg(gn_block='As')
S = empty_state(); S.cfg = c4; put(S, 'C1', IV, 'Gn'); put(S, 'C3', CR, 'Sm'); put(S, 'C2', CR, 'Sm')
assert (pos('C1'), pos('C3'), 'v') in gen_strikes(S, IV)
S.board[pos('C2')] = [CR, 'As', True]
assert gen_strikes(S, IV) == []
print("gunner range/shield ok")

c5 = Cfg(forced_strike=True)
S = empty_state(); S.cfg = c5; put(S, 'A1', IV, 'Sm'); put(S, 'A2', CR, 'As'); put(S, 'E6', IV, 'As')
assert all(a[0] == 'S' for a in legal_moves(S, IV))
S.board[pos('A2')] = None
assert any(a[0] == 'M' for a in legal_moves(S, IV))
print("forced strike ok")

rng = random.Random(5)
cfgr = Cfg(reckoning=8, night=20)
rs = [play(cfgr, (BOTS['aggro'], BOTS['aggro']), rng) for _ in range(30)]
print("reckoning reasons", Counter(r['reason'] for r in rs), "avg cmds", sum(r['cmds'] for r in rs) / 30)
assert all(r['reason'] != 'truce' for r in rs)
t0 = time.time()
rs = [play(Cfg(), (BOTS['search3'], BOTS['search3']), rng) for _ in range(6)]
print("search3 games", [(r['reason'], r['cmds']) for r in rs], "sec/game %.1f" % ((time.time() - t0) / 6))

# ---------- hired Geisha, stall clock, fishing ----------
R14 = dict(BASE_ROSTER, Gs=0)
rng = random.Random(9)
for hire, ro in ((2, R14), (4, dict(R14, As=3))):
    ch = Cfg(hire=hire, roster=ro)
    for g in range(60):
        S0 = new_state(ch, rng)
        assert len(S0.board) == 30 and sum(1 for c in S0.board if c[0] == 2) == hire
    outs = [play(ch, (BOTS['fish'], BOTS['fish']), rng) for _ in range(80)]
    assert all(o['reason'] in ('shogun', 'truce', 'surrounded') for o in outs)
    assert all(o['first_hire'] is None or o['first_hire'][0] in (0, 1) for o in outs)
    print("hire", hire, Counter(o['reason'] for o in outs))
cs = Cfg(stall='each', stall_n=3, night=None)
S = empty_state(); S.cfg = cs
rs = [play(Cfg(stall='each', stall_n=6, night=None), (BOTS['stall'], BOTS['flip']), rng) for _ in range(60)]
print("stall each6, stall-bot vs flip-bot:", Counter(r['reason'] for r in rs), "punished team0/team1:", sum(r['pun'][0] is not None for r in rs), sum(r['pun'][1] is not None for r in rs))
rs = [play(Cfg(), (BOTS['fish'], BOTS['fish']), rng) for _ in range(100)]
print("fish games ok", Counter(r['reason'] for r in rs))
