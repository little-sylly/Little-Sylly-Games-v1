"""Regression tests for hsg_sim.py (brief v4 ruleset). Run after ANY rule change:  python3 test_engine.py
When the brief's tables change, update exp_matrix below to match section 4b."""
import os, sys, random, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hsg_sim import *
from hsg_sim import legal as legal_moves

IV, CR = 0, 1


def pos(s):
    return idx("ABCDE".index(s[0]), int(s[1]) - 1)


def empty_state(cfg=None, dm=(2, 2)):
    cfg = cfg or Cfg()
    S = State()
    S.board = [None] * N
    S.team_col = [IV, CR]
    S.dm = list(dm)
    S.quiet = 0
    S.pool = Counter()
    S.cmd = 0
    S.cfg = cfg
    S.shrouds = 0
    S.fo = [False, False]
    S.stall = [0, 0]
    S.hired = [0, 0]
    S.pending = []
    return S


def put(S, p, col, t, up=True):
    S.board[pos(p)] = [col, t, up]


def has_act(S, col, act):
    return act in gen_actions(S, col)


# ---------- Sample A (classic fixed Geisha rows, all colours already known) ----------
rows = [
    "I-Dm C-Gn I-Rn C-Sm I-On",
    "C-On I-Kn C-Dm I-Gn C-Rn",
    "I-Sg C-Gs I-Sm C-Rn I-Rn",
    "C-Sg I-On C-Kn I-Dm C-Gn",
    "I-Gn C-Sm I-Rn C-On I-Gs",
    "C-Dm I-Rn C-Rn I-Sm C-Rn",
]
S = empty_state()
for r, line in enumerate(rows):
    for c, tok in enumerate(line.split()):
        S.board[idx(c, r)] = [IV if tok[0] == 'I' else CR, tok[2:], False]
S.board[pos('C3')][2] = True
for step, (col, act) in enumerate([(CR, ('U', pos('B3'))), (IV, ('U', pos('D3'))), (CR, ('U', pos('A3')))], start=2):
    assert has_act(S, col, act), step
    S.board[act[1]][2] = True
iv_acts = gen_actions(S, IV)
assert not any(a[0] in 'MCS' and a[1] == pos('A3') for a in iv_acts), "Shogun should have no moves"
assert not any(a[0] == 'S' and a[2] == pos('B3') for a in iv_acts)
act = ('S', pos('C3'), pos('D3'), 'x')
assert has_act(S, IV, act)
S.board[pos('D3')] = S.board[pos('C3')]
S.board[pos('C3')] = None
assert S.dm[IV] == 2
assert has_act(S, CR, ('S', pos('B3'), pos('A3'), 'x'))
print("Sample A: Geisha takes a Guarded Shogun (face-down Daimyo still guard)")
S2 = empty_state(); put(S2, 'A3', IV, 'Sg'); put(S2, 'B3', CR, 'Dm'); put(S2, 'A4', CR, 'Gn'); put(S2, 'A5', CR, 'Rn')
assert not any(a[0] == 'S' and a[2] == pos('A3') for a in gen_actions(S2, CR)), "guard must hold vs Daimyo and Gunner"

# ---------- C1: Charge past the Gunner ----------
S = empty_state(); put(S, 'C6', IV, 'Sm'); put(S, 'C3', CR, 'Gn'); put(S, 'C2', CR, 'Rn')
put(S, 'B3', CR, 'Rn', up=False); put(S, 'D3', CR, 'Rn', up=False)
a = gen_actions(S, IV)
assert ('C', pos('C6'), pos('C4')) in a and ('M', pos('C6'), pos('C5')) in a
S3 = empty_state(); put(S3, 'C5', IV, 'Sm'); put(S3, 'C3', CR, 'Gn')
assert (pos('C3'), pos('C5'), 'v') in gen_strikes(S3, CR)
S3 = empty_state(); put(S3, 'C4', IV, 'Sm'); put(S3, 'C3', CR, 'Gn')
assert gen_strikes(S3, CR) == []
assert (pos('C4'), pos('C3'), 'x') in gen_strikes(S3, IV)
print("C1 ok")

# ---------- C2: Vault (v4: the Kunoichi takes anything but a Geisha or a Guarded Shogun) ----------
S = empty_state(); put(S, 'B1', IV, 'Sg'); put(S, 'B2', CR, 'Gs'); put(S, 'B4', IV, 'Rn'); put(S, 'B6', IV, 'Kn')
assert (pos('B6'), pos('B2'), 'k') in gen_strikes(S, IV), "v4: the Kunoichi keeps the Geisha capture"
assert (pos('B2'), pos('B1'), 'x') in gen_strikes(S, CR)
assert not any(s[1] == pos('B2') for s in gen_strikes(S, IV) if s[0] == pos('B1'))
S = empty_state(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Dm')
assert (pos('B6'), pos('B2'), 'k') in gen_strikes(S, IV), "v4: the Vault ignores rank"
S = empty_state(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Sg'); put(S, 'A2', CR, 'Dm')
assert not any(s[1] == pos('B2') for s in gen_strikes(S, IV)), "a Guarded Shogun is safe from the Vault"
S.dm[CR] = 0
assert (pos('B6'), pos('B2'), 'k') in gen_strikes(S, IV), "an Exposed Shogun is not"
S = empty_state(); put(S, 'B3', IV, 'Kn'); put(S, 'B2', CR, 'Sm')
assert gen_strikes(S, IV) == [], "adjacent Kunoichi cannot Vault"
# a Vault is only a capture: with a face-down piece beyond the screen there is simply no Vault action
S = empty_state(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Sm', up=False)
assert not any(a[0] == 'S' for a in gen_actions(S, IV))
# Ronin: lowest rank, strikes Ronin, Gunner, Geisha (v4) and an Exposed Shogun, nothing else
S = empty_state(); put(S, 'C3', IV, 'Rn'); put(S, 'C2', CR, 'Gs'); put(S, 'B3', CR, 'Sm'); put(S, 'D3', CR, 'Gn'); put(S, 'C4', CR, 'Rn')
assert sorted(x[1] for x in gen_strikes(S, IV)) == sorted([pos('C2'), pos('D3'), pos('C4')]), "Ronin: Geisha, Gunner, Ronin"
print("C2 ok")

# ---------- C3: Guard falls ----------
S = empty_state(dm=(2, 1))
put(S, 'D1', CR, 'Sg'); put(S, 'B1', CR, 'Dm'); put(S, 'B3', IV, 'Gn'); put(S, 'D2', IV, 'Rn')
assert not any(s[2] == pos('D1') for s in gen_strikes(S, IV))
assert (pos('B3'), pos('B1'), 'v') in gen_strikes(S, IV)
sim_apply(S, ('S', pos('B3'), pos('B1'), 'v'))
assert S.dm[CR] == 0
assert (pos('D2'), pos('D1'), 'x') in gen_strikes(S, IV)
assert (pos('D1'), pos('D2'), 'x') in gen_strikes(S, CR)
print("C3 ok")

# ---------- C4: Cast (Onmyoji strikes diagonally, all ranks except Geisha / Guarded Shogun) ----------
S = empty_state(); put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Gn'); put(S, 'B3', CR, 'Rn', up=False); put(S, 'C4', IV, 'Rn', up=False)
assert (pos('B4'), pos('C3'), 'x') in gen_strikes(S, IV)
S = empty_state(); put(S, 'B4', IV, 'On'); put(S, 'B3', CR, 'Gn')
assert gen_strikes(S, IV) == [], "Onmyoji cannot strike orthogonally"
S = empty_state(); put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Dm'); put(S, 'A3', CR, 'Gs'); put(S, 'C5', CR, 'Sg')
st = gen_strikes(S, IV)
assert (pos('B4'), pos('C3'), 'x') in st, "Onmyoji may strike a Daimyo (Gunner table)"
assert not any(s[1] == pos('A3') for s in st) and not any(s[1] == pos('C5') for s in st), "not a Geisha, not a Guarded Shogun"
print("C4 ok")

# ---------- full capture matrix vs brief 4b ----------
types = ['Sg', 'Dm', 'Sm', 'Kn', 'On', 'Gn', 'Rn', 'Gs']
exp_matrix = {
    'Sg': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, Rn=1, Gs=0),
    'Dm': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, Rn=1, Gs=0),
    'Sm': dict(Sg='*', Dm=0, Sm=1, Kn=1, On=0, Gn=1, Rn=1, Gs=0),   # v4: the Onmyoji ranks above the Samurai
    'Kn': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, Rn=1, Gs=1),   # v4: all but a Guarded Shogun
    'On': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, Rn=1, Gs=0),   # = Gunner row
    'Gn': dict(Sg='*', Dm=1, Sm=1, Kn=1, On=1, Gn=1, Rn=1, Gs=0),
    'Rn': dict(Sg='*', Dm=0, Sm=0, Kn=0, On=0, Gn=1, Rn=1, Gs=1),   # v4: Ronin hunt Geisha
    'Gs': dict(Sg=1, Dm=0, Sm=0, Kn=0, On=0, Gn=0, Rn=0, Gs=0),
}
cfg = Cfg()
for a in types:
    for t in types:
        e = exp_matrix[a][t]
        g = can_hit(cfg, a, t, False)
        gx = can_hit(cfg, a, t, True)
        if e == '*':
            assert (not g) and gx, (a, t)
        else:
            assert bool(e) == g == gx, (a, t, e, g, gx)
assert exp_matrix['On'] == exp_matrix['Gn']
print("capture matrix matches brief 4b")

# ---------- Guard rules: face-down Daimyo guard; Forced Fight changes that ----------
S = empty_state(); put(S, 'A1', CR, 'Sg'); put(S, 'B1', CR, 'Dm', up=False); put(S, 'A2', IV, 'Rn')
assert not exposed(S, CR) and gen_strikes(S, IV) == [], "face-down Daimyo guards a normally-hidden Shogun"
S.fo[CR] = True
assert exposed(S, CR) and (pos('A2'), pos('A1'), 'x') in gen_strikes(S, IV), "forced out + only face-down Daimyo = Exposed"
S.board[pos('B1')][2] = True
assert not exposed(S, CR) and gen_strikes(S, IV) == [], "a revealed Daimyo restores the Guard"
S.board[pos('B1')] = None; S.dm[CR] = 0
assert exposed(S, CR), "no Daimyo left = Exposed"
print("guard / forced-out rules ok")

# ---------- Geisha for hire ----------
rng = random.Random(9)
for hire in (2, 4):
    ch = Cfg(hire=hire)
    for g in range(40):
        S0 = new_state(ch, rng)
        assert len(S0.board) == 30 and sum(1 for c in S0.board if c[0] == NEUTRAL) == hire
        assert sum(1 for c in S0.board if c[1] == 'Gs' and c[0] != NEUTRAL) == 0
    outs = [play(ch, (BOTS['fish'], BOTS['fish']), rng) for _ in range(60)]
    assert all(o['reason'] in ('shogun', 'night_count', 'night_tie', 'surrounded') for o in outs)
    print("hire", hire, Counter(o['reason'] for o in outs))
assert default_roster(4)['Rn'] == 3 and default_roster(2)['Rn'] == 4 and sum(default_roster(4).values()) == 13


# hire cap: script the first moves of a real game with a stubbed shuffle and chooser
import hsg_sim as H
orig_new_state = H.new_state


def fake_new_state(cfg_, rng_):
    S = orig_new_state(cfg_, rng_)
    S.board = [[NEUTRAL, 'Gs', False] for _ in range(4)] + [[CR, 'Rn', False], [IV, 'Rn', False]] + [None] * (N - 6)
    S.pool = Counter({(NEUTRAL, 'Gs'): 4, (CR, 'Rn'): 1, (IV, 'Rn'): 1})
    S.shrouds = 6
    S.dm = [0, 0]
    return S


orig_choose = H.choose
seq_log = []


def fake_choose(S, team, rng_, bot):
    shrouds = [i for i, c in enumerate(S.board) if c is not None and not c[2]]
    if not shrouds:
        return None
    if S.cmd == 0:
        return ('U', 4)     # team 0 flips a coloured piece: Raising the Banners
    # team 0 flips Geisha at its turns; team 1 flips remaining pieces so team 0 gets to flip the third Geisha
    if team == 0:
        g = [i for i in shrouds if S.board[i][1] == 'Gs']
        return ('U', g[0]) if g else ('U', shrouds[0])
    rest = [i for i in shrouds if S.board[i][1] != 'Gs']
    return ('U', rest[0]) if rest else ('U', shrouds[0])


H.new_state = fake_new_state
H.choose = fake_choose
try:
    probe = Cfg(hire=4, night=None, max_cmd=12)
    # replicate play loop manually with a trace, capturing S via new_state
    states = []
    def capture_new_state(cfg_, rng_):
        S = fake_new_state(cfg_, rng_); states.append(S); return S
    H.new_state = capture_new_state
    H.play(probe, (BOTS['aggro'], BOTS['aggro']), random.Random(0))
    S = states[0]
    held = [sum(1 for c in S.board if c is not None and c[1] == 'Gs' and c[0] == S.team_col[t]) for t in (0, 1)]
    assert held == [2, 2], held
    assert S.hired == [2, 2], S.hired
finally:
    H.new_state = orig_new_state
    H.choose = orig_choose
print("hire cap: flipping a third Geisha gives her to the opponent")

# ---------- Brief sample round A, replayed through the real engine (hired Geisha) ----------
import hsg_sim as HH


def replay(rows, script, cfg_=None):
    """rows: 6 strings of 5 tokens like 'I-Dm' / 'C-Gn' / 'G-Gs' (G = neutral Geisha). script: list of ('U','C3') / ('S','C3','D3')."""
    cfg_ = cfg_ or Cfg(night=None)
    cells = []
    for line in rows:
        for tok in line.split():
            cells.append([{'I': IV, 'C': CR, 'G': NEUTRAL}[tok[0]], tok[2:], False])
    holder = {}
    def ns(c_, r_):
        S = HH.__dict__['_orig_new_state'](c_, r_)
        S.board = cells
        S.pool = Counter((c[0], c[1]) for c in cells)
        S.shrouds = len(cells)
        holder['S'] = S
        return S
    def ch(S, team, r_, bot):
        st = script[S.cmd]
        if st[0] == 'U':
            return ('U', pos(st[1]))
        i, j = pos(st[1]), pos(st[2])
        kind = 'v' if S.board[i][1] == 'Gn' else ('k' if S.board[i][1] == 'Kn' else 'x')
        assert (i, j, kind) in gen_strikes(S, S.team_col[team]), ("illegal scripted strike", st)
        return ('S', i, j, kind)
    HH._orig_new_state = HH.new_state
    oc = HH.choose
    HH.new_state, HH.choose = ns, ch
    try:
        res = HH.play(cfg_, (BOTS['aggro'], BOTS['aggro']), random.Random(0), trace=None)
    finally:
        HH.new_state, HH.choose = HH._orig_new_state, oc
    return res, holder['S']


SAMPLE_A = [
    "I-Dm C-Gn I-Rn C-Sm I-On",
    "C-On I-Kn C-Dm I-Gn C-Rn",
    "I-Sg G-Gs I-Sm C-Rn G-Gs",
    "C-Sg I-On C-Kn I-Dm C-Gn",
    "I-Gn C-Sm I-Rn C-On G-Gs",
    "C-Dm I-Rn C-Rn I-Sm G-Gs",
]
assert Counter(t[0] for line in SAMPLE_A for t in line.split()) == Counter({'I': 13, 'C': 13, 'G': 4})
# the old script targets: Mia (team 0) Samurai at C3, Geisha at B3, Ronin D3, Shogun A3
res, S = replay(SAMPLE_A, [('U', 'C3'), ('U', 'B3'), ('U', 'D3'), ('U', 'A3'), ('S', 'C3', 'D3'), ('S', 'B3', 'A3')])
assert res['winner'] == 1 and res['reason'] == 'shogun' and res['sg_by'] == 'Gs' and res['cmds'] == 6, res['reason']
assert S.team_col == [IV, CR] and S.hired == [0, 1], (S.team_col, S.hired)
assert res['sg_exposed'] is False, "the Ivory Shogun was still Guarded (face-down Daimyo count) when the Geisha struck"
assert res['shrouds'] == 26
print("Sample A replays through the engine: Geisha hired by Priya's clan topples the Guarded Shogun in 6 Commands; shrouds left", res['shrouds'])
# hire cap scenario (setting 4): Crimson has hired two, flips a third -> it joins Ivory
CAP = [
    "I-Dm C-Gn I-Rn C-Sm I-On",
    "C-On I-Kn C-Dm I-Gn C-Rn",
    "I-Sg G-Gs I-Sm C-Rn G-Gs",
    "C-Sg I-On C-Kn I-Dm C-Gn",
    "I-Gn C-Sm I-Rn C-On G-Gs",
    "C-Dm I-Rn C-Rn I-Sm G-Gs",
]
# team0 unveils C3 (Ivory Sm), team1 hires B3, team0 unveils D3, team1 hires E3 (2nd Geisha), team0 unveils A3,
# team1 unveils E5 (third Geisha flipped by Crimson at its cap) -> joins Ivory
res, S = replay(CAP, [('U', 'C3'), ('U', 'B3'), ('U', 'D3'), ('U', 'E3'), ('U', 'A3'), ('U', 'E5')], Cfg(night=None, max_cmd=6, forced_fight=False))
assert S.hired == [1, 2], S.hired
assert S.board[pos('E5')][0] == IV and S.board[pos('B3')][0] == CR and S.board[pos('E3')][0] == CR, "third Geisha joins the opponent of the flipper at the cap"
print("hire cap verified in the brief scenario: hired", S.hired)

# ---------- v3 rules: scripted scenarios on custom positions ----------
def replay2(rows, script, cfg_):
    """rows: 6 strings of 5 tokens. 'I-Sg' = face-down Ivory Shogun, 'I-Sg^' = face-up, '..' = empty, 'G-Gs' = neutral Geisha.
    Colours are already raised (team 0 = Ivory, team 1 = Crimson). script: ('M','A1','A2') / ('S','C3','D3') / ('U','C3')."""
    cells = []
    for line in rows:
        for tok in line.split():
            if tok == '..':
                cells.append(None)
            else:
                cells.append([{'I': IV, 'C': CR, 'G': NEUTRAL}[tok[0]], tok[2:4], tok.endswith('^')])
    holder = {}

    def ns(c_, r_):
        S = HH._orig_new_state(c_, r_)
        S.board = cells
        S.team_col = [IV, CR]
        S.dm = [sum(1 for c in cells if c and c[0] == IV and c[1] == 'Dm'), sum(1 for c in cells if c and c[0] == CR and c[1] == 'Dm')]
        S.pool = Counter((c[0], c[1]) for c in cells if c and not c[2])
        S.shrouds = sum(1 for c in cells if c and not c[2])
        holder['S'] = S
        return S

    def ch(S, team, r_, bot):
        st = script[S.cmd]
        if st[0] == 'U':
            return ('U', pos(st[1]))
        i, j = pos(st[1]), pos(st[2])
        if st[0] == 'M':
            assert ('M', i, j) in gen_actions(S, S.team_col[team]), ("illegal scripted march", st)
            return ('M', i, j)
        kind = 'v' if S.board[i][1] == 'Gn' else ('k' if S.board[i][1] == 'Kn' else 'x')
        assert (i, j, kind) in gen_strikes(S, S.team_col[team]), ("illegal scripted strike", st)
        return ('S', i, j, kind)
    HH._orig_new_state = HH.new_state
    oc = HH.choose
    HH.new_state, HH.choose = ns, ch
    try:
        res = HH.play(cfg_, (BOTS['aggro'], BOTS['aggro']), random.Random(0))
    finally:
        HH.new_state, HH.choose = HH._orig_new_state, oc
    return res, holder['S']


# Shogun's Shame: Ivory's Shogun is face-down, Crimson's Shogun was revealed earlier. Both clans shuffle a face-up Ronin
# for 5 Commands each. Only Ivory's Shogun is forced out of hiding; Crimson's count reaches 5 but nothing happens.
SHAME = [
    "I-Sg I-Dm .. .. ..",
    "I-Dm .. .. .. ..",
    "I-Rn^ .. .. .. ..",
    ".. .. .. .. ..",
    ".. .. .. .. C-Rn^",
    ".. .. .. C-Dm C-Sg^",
]
script = []
for k in range(5):
    script.append(('M', 'A3', 'A4') if k % 2 == 0 else ('M', 'A4', 'A3'))   # Ivory's Ronin
    script.append(('M', 'E5', 'D5') if k % 2 == 0 else ('M', 'D5', 'E5'))   # Crimson's Ronin
res, S = replay2(SHAME, script, Cfg(night=None, max_cmd=10, forced_fight=True))
sg_iv = next(c for c in S.board if c and c[0] == IV and c[1] == 'Sg')
assert sg_iv[2] is True and S.fo[IV] is True, "Ivory's face-down Shogun is forced out at its 5th quiet Command"
assert res['ff'][0] == 9 and res['ff_count'] == [1, 0], res['ff_count']
assert S.fo[CR] is False and res['ff'][1] is None, "Crimson's Shogun was already face-up: Forced Fight never triggers for that clan"
assert exposed(S, IV), "forced out and both Daimyo are face-down = Exposed"
assert not exposed(S, CR), "Crimson's Shogun was never forced out, so his face-down Daimyo still guard him"
# legacy v2 assumption: it triggers for the face-up Crimson Shogun as well
res, S = replay2(SHAME, script, Cfg(night=None, max_cmd=10, ff_facedown_only=False, forced_fight=True))
assert res['ff_count'] == [1, 1] and S.fo[CR] is True
# an Unveil resets the clock: Ivory's 5th Command unveils the Shroud on A4, so nothing triggers in 16 Commands
SHAME2 = ["I-Sg I-Dm .. .. ..", "I-Dm .. .. .. ..", "I-Rn^ .. .. .. ..", "I-Rn .. .. .. ..", ".. .. .. .. C-Rn^", ".. .. .. C-Dm C-Sg^"]
script2 = []
for k in range(8):
    if k == 4:
        script2.append(('U', 'A4'))
    elif k < 4:
        script2.append(('M', 'A3', 'B3') if k % 2 == 0 else ('M', 'B3', 'A3'))
    else:
        script2.append(('M', 'A3', 'B3') if k % 2 == 1 else ('M', 'B3', 'A3'))
    script2.append(('M', 'E5', 'D5') if k % 2 == 0 else ('M', 'D5', 'E5'))
res, S = replay2(SHAME2, script2, Cfg(night=None, max_cmd=16, forced_fight=True))
assert res['ff_count'] == [0, 0] and S.stall[0] == 3, (res['ff_count'], S.stall)
print("Shogun's Shame: triggers only for a face-down Shogun; resets on Unveil")

# Long Night counts face-up pieces only. Ivory: 3 face-up; Crimson: 2 face-up + 4 face-down (6 in total, so the old rule says Crimson).
NIGHT = [
    "I-Sg^ .. .. .. ..",
    "I-Dm^ .. .. .. ..",
    "I-Rn^ .. .. .. ..",
    ".. .. .. .. ..",
    "C-Sg C-Dm C-Rn C-Rn .. ",
    "C-Rn^ .. .. .. C-Sm^",
]
NIGHT = [l.strip() for l in NIGHT]
script = []
for k in range(6):
    script.append(('M', 'A3', 'B3') if k % 2 == 0 else ('M', 'B3', 'A3'))
    script.append(('M', 'A6', 'B6') if k % 2 == 0 else ('M', 'B6', 'A6'))
res, S = replay2(NIGHT, script, Cfg(forced_fight=False))
assert res['reason'] == 'night_count' and res['winner'] == 0 and res['night_counts'] == (3, 2) and res['cmds'] == 12, res
res, S = replay2(NIGHT, script, Cfg(forced_fight=False, night_faceup=False))
assert res['reason'] == 'night_count' and res['winner'] == 1 and res['night_counts'] == (3, 6), res
# a tie on face-up pieces is a Truce even when one side hides more pieces under Shrouds
NIGHT_T = [l for l in NIGHT]
NIGHT_T[0] = "I-Sg^ .. .. .. C-Gs^"           # a hired Crimson Geisha counts for Crimson: 3 v 3
res, S = replay2(NIGHT_T, script, Cfg(forced_fight=False))
assert res['night_counts'] == (3, 3) and res['reason'] == 'night_tie' and res['winner'] == -1, res
print("Long Night: face-up pieces only; a tie is a Truce")

# ---------- Forced Fight / Long Night in real games ----------
rng = random.Random(5)
rs = [play(Cfg(forced_fight=True), (BOTS['stall'], BOTS['flip']), rng) for _ in range(120)]
assert any(r['ff'][0] is not None or r['ff'][1] is not None for r in rs), "Forced Fight should trigger sometimes"
print("forced fight triggered in", sum(any(x is not None for x in r['ff']) for r in rs), "of 120 stall-vs-flip games")
rs_off = [play(Cfg(), (BOTS['stall'], BOTS['flip']), random.Random(6 + i)) for i in range(40)]
assert all(r['ff'] == [None, None] or r['ff'] == (None, None) for r in rs_off), "Shogun's Shame is cut: the default never triggers it"
print("default rules: Shogun's Shame never triggers (cut 11 Nov 2026)")
rs = [play(Cfg(night=12), (BOTS['aggro'], BOTS['aggro']), rng) for _ in range(100)]
rs20 = [play(Cfg(night=20, ff_n=10), (BOTS['aggro'], BOTS['aggro']), rng) for _ in range(100)]
n12 = sum(r['reason'].startswith('night') for r in rs); n20 = sum(r['reason'].startswith('night') for r in rs20)
assert n12 >= n20, (n12, n20)
for r in rs + rs20:
    if r['reason'].startswith('night'):
        assert r['night_margin'] is not None and (r['reason'] == 'night_tie') == (r['night_margin'] == 0)
print("Long Night 12 ends %d%% of games, 20 ends %d%%" % (n12, n20))

for name in ('random', 'cautious', 'aggro', 'fish', 'search3'):
    rng = random.Random(1)
    t0 = time.time()
    n = 300 if name == 'random' else 40
    outs = [play(Cfg(), (BOTS[name], BOTS[name]), rng) for g in range(n)]
    print(name, "games", n, "sec/game %.3f" % ((time.time() - t0) / n), Counter(o['reason'] for o in outs))
print("ALL TESTS PASSED")
