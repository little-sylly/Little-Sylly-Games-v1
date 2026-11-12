#!/usr/bin/env python3
"""Hide and Shogun rules engine + bots (5x6 board, 2 players). Mirrors brief section 4 (v4 ruleset).

Final ruleset implemented (defaults):
  * 30 tiles, all face-down (Shrouds). Per clan: Sg1 Dm2 Sm2 On2 Kn1 Gn2 Rn3 (13; Rn = Ronin, 4 with 2 Geisha); plus 4 neutral Geisha "for hire".
  * Geisha for hire: whoever Unveils a Geisha hires her, but a clan may hold at most half of the total.
    If the flipper's clan is already at the cap, the Geisha joins the OPPONENT. A Geisha does not set colours;
    the first non-Geisha Unveil does (Raising the Banners).
  * Strike table (v4): rank ladder Sg > Dm > On > Sm > Kn > Gn > Rn (Geisha outside it). Contact pieces (Sg, Dm, Sm, Rn) strike
    equal or lower rank, except that Ronin strike only Ronin, Gunner and Geisha (and an Exposed Shogun). Onmyoji = Gunner =
    Gunner and Onmyoji strike everything except a Geisha and a Guarded Shogun; the Kunoichi's Vault strikes everything except a
    Guarded Shogun (she keeps the Geisha capture, Ronin share it). A Geisha strikes only a Shogun, Guarded or not.
  * Gunner fires at distance 2 or 3 in a straight line (cfg.gn_ranges).
  * Guarded = any own Daimyo alive (face-down counts). Exposed = no Daimyo alive.
  * Shogun's Shame (fixed rule, cfg.forced_fight True, cfg.ff_n = 5): a clan that makes 5 of its own Commands with no
    Unveil and no capture has its Shogun forced out of hiding, but only if that Shogun is still FACE-DOWN. From then
    on ("forced out") only a REVEALED friendly Daimyo guards him; a face-down Daimyo no longer counts.
  * Long Night (fixed rule, cfg.night = 12): 12 consecutive Commands (6 each) with no Unveil and no capture end the Battle:
    most FACE-UP pieces wins; a hired Geisha counts for her clan, a Shroud counts for nobody; level = Truce (draw).
  * Surrounded (no legal Command) loses. Capturing the enemy Shogun wins at once.
  * Campaign / Honour Seals live above this engine (one Seal per Battle won, Truce = no Seal and the Battle is replayed,
    Vanguard alternates each Battle); the sim plays single Battles.
  * Legacy: Cfg(ff_facedown_only=False, night_faceup=False, ...) reproduces v2; the v3 numbers need kn_all=False, kn_hits_gs=True,
    rn_hits_gs=False, gn_ranges=(2,), ff_n=10, night=20 and the old RANK/VALUE table (see scratch copy hsg_sim_v3 in balance-findings).
"""
import random
from collections import Counter

W, H = 5, 6
N = W * H
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def idx(c, r):
    return r * W + c


NB = [[] for _ in range(N)]
DIAG = [[] for _ in range(N)]
RAYS = [[[] for _ in DIRS] for _ in range(N)]
for r in range(H):
    for c in range(W):
        i = idx(c, r)
        for d, (dc, dr) in enumerate(DIRS):
            cc, rr = c + dc, r + dr
            while 0 <= cc < W and 0 <= rr < H:
                RAYS[i][d].append(idx(cc, rr))
                cc += dc
                rr += dr
            if RAYS[i][d]:
                NB[i].append(RAYS[i][d][0])
        for dc in (-1, 1):
            for dr in (-1, 1):
                cc, rr = c + dc, r + dr
                if 0 <= cc < W and 0 <= rr < H:
                    DIAG[i].append(idx(cc, rr))

RANK = {'Sg': 8, 'Dm': 7, 'On': 6, 'Sm': 5, 'Kn': 4, 'Gn': 3, 'Rn': 2, 'Gs': 0}   # v4 ladder: Onmyoji above Samurai
VALUE = {'Sg': 100, 'Dm': 9, 'Sm': 7, 'Kn': 6, 'On': 5, 'Gn': 5, 'Rn': 2, 'Gs': 8}
THREAT = dict(VALUE, Sg=1000)
CONTACT = ('Sg', 'Dm', 'Sm', 'Rn', 'Gs')
CORE = {'Sg': 1, 'Dm': 2, 'Sm': 2, 'On': 2, 'Kn': 1, 'Gn': 2}
NEUTRAL = 2   # colour id of an un-hired Geisha


def default_roster(hire):
    """Per-clan roster. hire = total neutral Geisha (0 = classic: one own Geisha per clan)."""
    g = max(1, hire // 2)
    r = dict(CORE)
    r['Rn'] = 5 - g
    if hire == 0:
        r['Gs'] = 1
    return r


class Cfg:
    def __init__(self, **kw):
        self.hire = 4              # total Geisha for hire (2 or 4); 0 = classic fixed Geisha (1 per clan)
        self.night = 12            # Long Night (v4: fixed rule): consecutive quiet Commands (both clans) that end the Battle; None = off (tests only)
        self.forced_fight = False  # Shogun's Shame: CUT from the rules (owner, 11 Nov 2026); True only in legacy tests
        self.ff_n = 5              # v4 fixed rule: own Commands without own Unveil/capture
        self.ff_facedown_only = True   # v3: Shogun's Shame only triggers while the Shogun is still face-down
        self.night_faceup = True       # v3: Long Night piece count uses face-up pieces only
        self.on_all = True         # Onmyoji strikes like the Gunner (all but Geisha / Guarded Shogun)
        self.kn_hits_exposed = True
        self.kn_hits_gs = True     # v4: Kunoichi's Vault takes anything but a Guarded Shogun, Geisha included (False = comparison only)
        self.kn_all = True         # v4: Kunoichi ignores rank (False = v3: only pieces ranked below her)
        self.rn_hits_gs = True     # v4: Ronin may strike a Geisha
        self.kn_range = None       # experiment: cap on Vault distance
        self.gn_ranges = (2, 3)    # v4: Gunner firing distances
        self.gn_block = None       # None | 'any' | 'Rn' shield experiments
        self.forced_strike = False # experiment: must strike if any strike is legal
        self.sm_hits_dm = False    # experiment
        self.max_cmd = 1500
        for k, v in kw.items():
            setattr(self, k, v)
        if 'roster' not in kw:
            self.roster = default_roster(self.hire)


class State:
    __slots__ = ('board', 'team_col', 'dm', 'quiet', 'pool', 'cmd', 'cfg', 'shrouds', 'fo', 'stall', 'hired', 'pending')


def new_state(cfg, rng):
    S = State()
    cells = []
    for col in (0, 1):
        for t, n in cfg.roster.items():
            for _ in range(n):
                cells.append([col, t, False])
    for _ in range(cfg.hire):
        cells.append([NEUTRAL, 'Gs', False])
    rng.shuffle(cells)
    S.board = cells
    S.team_col = [None, None]
    S.dm = [cfg.roster['Dm'], cfg.roster['Dm']]
    S.quiet = 0
    S.pool = Counter()
    for col in (0, 1):
        for t, n in cfg.roster.items():
            S.pool[(col, t)] += n
    if cfg.hire:
        S.pool[(NEUTRAL, 'Gs')] = cfg.hire
    S.cmd = 0
    S.cfg = cfg
    S.shrouds = len(cells)
    S.fo = [False, False]      # Shogun forced out of hiding
    S.stall = [0, 0]           # per-team own Commands since own Unveil/capture
    S.hired = [0, 0]
    S.pending = []
    return S


def exposed(S, col):
    if col > 1:
        return False
    if S.dm[col] == 0:
        return True
    if S.fo[col]:
        for c in S.board:
            if c is not None and c[0] == col and c[1] == 'Dm' and c[2]:
                return False
        return True
    return False


def can_hit(cfg, att, tgt, exp):
    if tgt == 'Gs':
        return (att == 'Kn' and cfg.kn_hits_gs) or (att == 'Rn' and cfg.rn_hits_gs)
    if tgt == 'Sg':
        if att == 'Gs':
            return True
        if att == 'Kn' and not cfg.kn_hits_exposed:
            return False
        return exp
    if att == 'Gs':
        return False
    if att == 'Gn':
        return True
    if att == 'Kn':
        return True if cfg.kn_all else RANK[tgt] < 4
    if att == 'On' and cfg.on_all:
        return True
    if att == 'Rn':
        return tgt == 'Rn' or tgt == 'Gn'
    if att == 'Sm' and cfg.sm_hits_dm and tgt == 'Dm':
        return True
    return RANK[att] >= RANK[tgt]


def piece_strikes(S, i, cell):
    col, t = cell[0], cell[1]
    b = S.board
    cfg = S.cfg
    out = []
    if t in CONTACT or t == 'On':
        for j in (DIAG[i] if t == 'On' else NB[i]):
            tc = b[j]
            if tc is not None and tc[2] and tc[0] != col and can_hit(cfg, t, tc[1], exposed(S, tc[0])):
                out.append((j, 'x'))
    elif t == 'Gn':
        for d in range(4):
            ray = RAYS[i][d]
            for rg in cfg.gn_ranges:
                if len(ray) < rg:
                    continue
                tc = b[ray[rg - 1]]
                if tc is None or not tc[2] or tc[0] == col or not can_hit(cfg, t, tc[1], exposed(S, tc[0])):
                    continue
                if cfg.gn_block:
                    blocked = False
                    for q in ray[:rg - 1]:
                        bc = b[q]
                        if bc is not None and (cfg.gn_block == 'any' or (bc[2] and bc[1] == 'Rn')):
                            blocked = True
                            break
                    if blocked:
                        continue
                out.append((ray[rg - 1], 'v'))
    elif t == 'Kn':
        for d in range(4):
            ray = RAYS[i][d]
            n = len(ray)
            k = 0
            while k < n and b[ray[k]] is None:
                k += 1
            if k >= n:
                continue
            m = k + 1
            while m < n and b[ray[m]] is None:
                m += 1
            if m >= n:
                continue
            if cfg.kn_range is not None and (m + 1) > cfg.kn_range:
                continue
            tc = b[ray[m]]
            if tc[2] and tc[0] != col and can_hit(cfg, t, tc[1], exposed(S, tc[0])):
                out.append((ray[m], 'k'))
    return out


def gen_strikes(S, col):
    out = []
    for i, cell in enumerate(S.board):
        if cell is not None and cell[2] and cell[0] == col:
            for j, kind in piece_strikes(S, i, cell):
                out.append((i, j, kind))
    return out


def gen_actions(S, col):
    acts = []
    b = S.board
    for i, cell in enumerate(b):
        if cell is None:
            continue
        if not cell[2]:
            acts.append(('U', i))
            continue
        if cell[0] != col:
            continue
        for j in NB[i]:
            if b[j] is None:
                acts.append(('M', i, j))
        if cell[1] == 'Sm':
            for d in range(4):
                ray = RAYS[i][d]
                if len(ray) >= 2 and b[ray[0]] is None and b[ray[1]] is None:
                    acts.append(('C', i, ray[1]))
        for j, kind in piece_strikes(S, i, cell):
            acts.append(('S', i, j, kind))
    return acts


def legal(S, col):
    acts = gen_actions(S, col)
    if S.cfg.forced_strike:
        st = [a for a in acts if a[0] == 'S']
        if st:
            return st
    return acts


def sim_apply(S, act):
    k = act[0]
    b = S.board
    i, j = act[1], act[2]
    if k == 'M' or k == 'C':
        u = (i, j, b[i], b[j], None)
        b[j] = b[i]
        b[i] = None
    else:
        victim = b[j]
        dmcol = victim[0] if victim[1] == 'Dm' else None
        u = (i, j, b[i], victim, dmcol)
        if dmcol is not None:
            S.dm[dmcol] -= 1
        if act[3] == 'v':
            b[j] = None
        else:
            b[j] = b[i]
            b[i] = None
    return u


def sim_undo(S, u):
    i, j, bi, bj, dmcol = u
    S.board[i] = bi
    S.board[j] = bj
    if dmcol is not None:
        S.dm[dmcol] += 1


def best_threat(S, col):
    best = 0
    b = S.board
    for i, j, kind in gen_strikes(S, col):
        v = THREAT[b[j][1]]
        if v > best:
            best = v
    return best


def best_prey(S, col):
    best = 0
    b = S.board
    for i, j, kind in gen_strikes(S, col):
        v = min(VALUE[b[j][1]], 20)
        if v > best:
            best = v
    return best


# ------------------------------------------------------------------ bots
class Bot:
    """Heuristic bot. Difficulty ladder suggested for solo play: random < cautious < aggro < fish < hunt < search3."""

    def __init__(self, name, rand=False, U0=0.4, approach=0.25, threat_w=0.3, noise=0.15, search=0, clock=True,
                 fish=False, fish_move=0.4, hire_w=1.5, gain_w=1.0):
        self.name = name
        self.rand = rand
        self.U0 = U0                # appetite for Unveiling
        self.approach = approach    # appetite for closing on prey
        self.threat_w = threat_w
        self.noise = noise
        self.search = search        # negamax depth once no Shrouds remain (0 = heuristic only)
        self.clock = clock          # adapt to the Long Night / Forced Fight clocks
        self.fish = fish            # Unveil tiles that a Gunner/Onmyoji can strike next turn; drift them toward Shrouds
        self.fish_move = fish_move
        self.hire_w = hire_w        # extra appetite for hiring a neutral Geisha
        self.gain_w = gain_w        # weight on the value of a capture versus avoiding threats


BOTS = {
    'random': Bot('random', rand=True),
    'cautious': Bot('cautious', U0=0.2, approach=0.1),
    'aggro': Bot('aggro', U0=0.6, approach=0.4),
    'fish': Bot('fish', U0=0.6, approach=0.4, fish=True),
    'hunt': Bot('hunt', U0=0.6, approach=0.4, fish=True, gain_w=1.8),
    'flip': Bot('flip', U0=1.4, approach=0.4, fish=True),
    'stall': Bot('stall', U0=-0.8, approach=0.1),
    'search2': Bot('search2', U0=0.6, approach=0.4, fish=True, gain_w=1.8, search=2),
    'search3': Bot('search3', U0=0.6, approach=0.4, fish=True, gain_w=1.8, search=3),
}


def man(a, b):
    return abs(a % W - b % W) + abs(a // W - b // W)


def approach_bonus(S, i, j, t, me, w):
    b = S.board
    best_old = best_new = None
    for p, cell in enumerate(b):
        if cell is None or not cell[2] or cell[0] == me:
            continue
        if not can_hit(S.cfg, t, cell[1], True if cell[1] == 'Sg' and t != 'Gs' else exposed(S, cell[0])):
            if not (t == 'Gs' and cell[1] == 'Sg'):
                continue
        if t == 'Gn':
            do, dn = min(abs(man(i, p) - r_) for r_ in S.cfg.gn_ranges), min(abs(man(j, p) - r_) for r_ in S.cfg.gn_ranges)
        else:
            do, dn = man(i, p), man(j, p)
        if best_old is None or do < best_old:
            best_old = do
        if best_new is None or dn < best_new:
            best_new = dn
    if best_old is None:
        return 0.0
    mult = 3.0 if t == 'Gs' else (0.3 if t in ('Sg', 'Dm') else 1.0)
    return w * mult * (best_old - best_new)


def count_pieces(S, col, up_only=False):
    return sum(1 for c in S.board if c is not None and c[0] == col and (c[2] or not up_only))


def shogun_down(S, col):
    """True if this clan's Shogun is on the board and still face-down."""
    for c in S.board:
        if c is not None and c[0] == col and c[1] == 'Sg':
            return not c[2]
    return False


# -------- search bot (perfect information: no Shrouds left)
def evaluate(S, col):
    b = S.board
    sc = 0.0
    sg = [None, None]
    gs = [[], []]
    for i, c in enumerate(b):
        if c is None:
            continue
        v = VALUE[c[1]] if c[1] != 'Sg' else 0
        sc += v if c[0] == col else -v
        if c[1] == 'Sg':
            sg[c[0]] = i
        elif c[1] == 'Gs' and c[0] in (0, 1):
            gs[c[0]].append(i)
    opp = 1 - col
    for g in gs[col]:
        if sg[opp] is not None:
            sc += 1.5 - 0.4 * man(g, sg[opp])
    for g in gs[opp]:
        if sg[col] is not None:
            sc -= 1.5 - 0.4 * man(g, sg[col])
    return sc


def ordered(S, acts):
    b = S.board
    st = [a for a in acts if a[0] == 'S']
    st.sort(key=lambda a: -THREAT[b[a[2]][1]])
    return st, [a for a in acts if a[0] != 'S']


def qsearch(S, col, alpha, beta, qd):
    stand = evaluate(S, col)
    if qd == 0 or stand >= beta:
        return stand
    if stand > alpha:
        alpha = stand
    st, _ = ordered(S, [('S', i, j, k) for i, j, k in gen_strikes(S, col)])
    b = S.board
    for a in st:
        if b[a[2]][1] == 'Sg':
            return 10000.0
        u = sim_apply(S, a)
        v = -qsearch(S, 1 - col, -beta, -alpha, qd - 1)
        sim_undo(S, u)
        if v >= beta:
            return v
        if v > alpha:
            alpha = v
    return alpha


def negamax(S, col, depth, alpha, beta):
    acts = legal(S, col)
    if not acts:
        return -9000.0 - depth
    b = S.board
    st, qu = ordered(S, acts)
    if depth == 0:
        return qsearch(S, col, alpha, beta, 3)
    best = -1e9
    for a in st + qu:
        if a[0] == 'S' and b[a[2]][1] == 'Sg':
            return 10000.0 + depth
        u = sim_apply(S, a)
        v = -negamax(S, 1 - col, depth - 1, -beta, -alpha)
        sim_undo(S, u)
        if v > best:
            best = v
            if v > alpha:
                alpha = v
                if alpha >= beta:
                    break
    return best


def search_move(S, me, depth, rng, noise=0.05):
    acts = legal(S, me)
    b = S.board
    st, qu = ordered(S, acts)
    best_a, best_v = None, -1e9
    alpha = -1e9
    for a in st + qu:
        if a[0] == 'S' and b[a[2]][1] == 'Sg':
            return a
        u = sim_apply(S, a)
        v = -negamax(S, 1 - me, depth - 1, -1e9, -alpha + 1e-9) + rng.random() * noise
        sim_undo(S, u)
        if v > best_v:
            best_v, best_a = v, a
            alpha = max(alpha, v - noise)
    return best_a


# -------- fishing helpers
def fish_slots(S, me):
    """Shroud squares that one of my face-up Gunners / Onmyoji could strike next turn if a hittable enemy appeared there."""
    b = S.board
    out = set()
    for i, c in enumerate(b):
        if c is None or not c[2] or c[0] != me:
            continue
        if c[1] == 'Gn':
            for d in range(4):
                ray = RAYS[i][d]
                for rg in S.cfg.gn_ranges:
                    if len(ray) >= rg:
                        t = b[ray[rg - 1]]
                        if t is not None and not t[2]:
                            out.add(ray[rg - 1])
        elif c[1] == 'On':
            for j in DIAG[i]:
                t = b[j]
                if t is not None and not t[2]:
                    out.add(j)
    return out


def shroud_reach(S, i, t):
    b = S.board
    n = 0
    if t == 'Gn':
        for d in range(4):
            ray = RAYS[i][d]
            for rg in S.cfg.gn_ranges:
                if len(ray) >= rg:
                    c = b[ray[rg - 1]]
                    if c is not None and not c[2]:
                        n += 1
    else:
        for j in DIAG[i]:
            c = b[j]
            if c is not None and not c[2]:
                n += 1
    return n


def choose(S, team, rng, bot):
    me = S.team_col[team]
    cfg = S.cfg
    b = S.board
    if me is None:
        shrouds = [i for i, c in enumerate(b) if c is not None and not c[2]]
        return ('U', rng.choice(shrouds))
    acts = legal(S, me)
    if not acts:
        return None
    if bot.rand:
        return rng.choice(acts)
    opp = 1 - me
    for a in acts:
        if a[0] == 'S' and b[a[2]][1] == 'Sg':
            return a
    if bot.search and S.shrouds == 0:
        return search_move(S, me, bot.search, rng)

    gain_w, th_w, flat = bot.gain_w, 1.0, 0.0
    u_adj = 0.0
    if bot.clock:
        # Forced Fight pressure: about to be forced out of hiding -> flip or capture to reset the clan clock
        if cfg.forced_fight and (shogun_down(S, me) or not cfg.ff_facedown_only):
            pressure = max(0, S.stall[team] - (cfg.ff_n - 4))
            u_adj += 0.6 * pressure
            flat += 0.6 * pressure
        # Long Night approaching: the side ahead on pieces sits tight, the side behind (or level) must act
        if cfg.night and S.quiet >= cfg.night - 8:
            diff = count_pieces(S, me, cfg.night_faceup) - count_pieces(S, opp, cfg.night_faceup)
            if diff <= 0:
                gain_w, th_w, flat, u_adj = gain_w * 1.5, 0.6, flat + 5.0, u_adj + 0.5
            else:
                th_w, u_adj = 1.4, u_adj - 1.0
    best_a, best_s = None, -1e18
    shrouds = []
    for a in acts:
        k = a[0]
        if k == 'U':
            shrouds.append(a[1])
            continue
        t = b[a[1]][1]
        gain = (gain_w * THREAT[b[a[2]][1]] + flat) if k == 'S' else 0
        u = sim_apply(S, a)
        th = best_threat(S, opp)
        ours = best_prey(S, me)
        sim_undo(S, u)
        sc = gain - th_w * th + bot.threat_w * ours
        if k in ('M', 'C'):
            sc += approach_bonus(S, a[1], a[2], t, me, bot.approach)
            if bot.fish and t in ('Gn', 'On'):
                sc += bot.fish_move * (shroud_reach(S, a[2], t) - shroud_reach(S, a[1], t))
        sc += rng.random() * bot.noise
        if sc > best_s:
            best_s, best_a = sc, a
    if shrouds:
        keys = [k for k in S.pool if S.pool[k] > 0]
        wts = [S.pool[k] for k in keys]
        tw = float(sum(wts))
        fs = fish_slots(S, me) if bot.fish else set()
        fish_c = [x for x in shrouds if x in fs][:4]
        other = [x for x in shrouds if x not in fs]
        room = 6 - len(fish_c)
        cand = fish_c + (other if len(other) <= room else rng.sample(other, room))
        cap = cfg.hire // 2 if cfg.hire else 0
        hire_me = cfg.hire and S.hired[team] < cap
        for s_ in cand:
            old = b[s_]
            exact = s_ in fs
            if exact:
                samples = [(k, w / tw) for k, w in zip(keys, wts)]
                wo = 1.0
            else:
                K = 3
                samples = [(rng.choices(keys, wts)[0], 1.0 / K) for _ in range(K)]
                wo = 0.4
            tot = 0.0
            for (c, t), pw in samples:
                geisha_bonus = 0.0
                if c == NEUTRAL:
                    c = me if hire_me else opp
                    geisha_bonus = bot.hire_w if c == me else -bot.hire_w
                b[s_] = [c, t, True]
                th = best_threat(S, opp)
                ours = best_prey(S, me)
                b[s_] = old
                hs = -th + wo * ours
                hs += 0.25 * VALUE[t] if c == me else -0.1 * VALUE[t]
                tot += pw * (hs + geisha_bonus)
            sc = bot.U0 + u_adj + tot + rng.random() * bot.noise
            if sc > best_s:
                best_s, best_a = sc, ('U', s_)
    return best_a


def opportunity(S, me, res):
    """Count what the mover's Onmyoji / Gunners could and could not strike this Command."""
    b = S.board
    cfg = S.cfg
    for i, c in enumerate(b):
        if c is None or not c[2] or c[0] != me:
            continue
        if c[1] == 'On':
            res['on_turns'] += 1
            for j in DIAG[i]:
                tc = b[j]
                if tc is not None and tc[2] and tc[0] != me:
                    if can_hit(cfg, 'On', tc[1], exposed(S, tc[0])):
                        res['on_can'] += 1
                    else:
                        res['on_cant'] += 1
        elif c[1] == 'Gn':
            res['gn_turns'] += 1
            for d in range(4):
                ray = RAYS[i][d]
                if ray:
                    tc = b[ray[0]]
                    if tc is not None and tc[2] and tc[0] != me:
                        res['gn_adj'] += 1
            for j, kind in piece_strikes(S, i, c):
                res['gn_can'] += 1
            for d in range(4):
                ray = RAYS[i][d]
                for rg in cfg.gn_ranges:
                    if len(ray) >= rg:
                        tc = b[ray[rg - 1]]
                        if tc is not None and tc[2] and tc[0] != me and not can_hit(cfg, 'Gn', tc[1], exposed(S, tc[0])):
                            res['gn_cant'] += 1


def play(cfg, bots, rng, trace=None):
    """bots = (bot for team0 / Vanguard seat, bot for team1 / Rearguard seat). Returns a result dict.
    winner: 0/1 = team index, -1 = Truce (draw). reason: shogun | night_count | night_tie | surrounded | cap."""
    S = new_state(cfg, rng)
    team = 0
    res = {'winner': -1, 'reason': 'night_tie', 'cmds': 0, 'sg_by': None, 'sg_exposed': None,
           'kills': Counter(), 'charges': 0, 'volleys': 0, 'vaults': 0, 'unveils': 0, 'vanguard_col': None,
           'on_turns': 0, 'on_can': 0, 'on_cant': 0, 'gn_turns': 0, 'gn_can': 0, 'gn_cant': 0, 'gn_adj': 0,
           'night_margin': None, 'first_hire': None, 'ff': [None, None], 'ff_count': [0, 0],
           'ff_shogun_flipped': [False, False], 'fish_flips': 0, 'fish_enemy_hittable': 0, 'fish_snipes': 0}
    last_fish = None
    me = None
    while True:
        if S.cmd >= cfg.max_cmd:
            res['reason'] = 'cap'
            break
        me = S.team_col[team]
        if me is not None:
            opportunity(S, me, res)
        act = choose(S, team, rng, bots[team])
        if last_fish is not None and last_fish[0] == team and act is not None:
            if act[0] == 'S' and act[2] == last_fish[1]:
                res['fish_snipes'] += 1
            last_fish = None
        if act is not None and act[0] == 'U' and me is not None and act[1] in fish_slots(S, me):
            res['fish_flips'] += 1
            c_, t_ = S.board[act[1]][0], S.board[act[1]][1]
            att_ok = False
            if c_ != me and c_ != NEUTRAL:
                for cc in S.board:
                    if cc is not None and cc[2] and cc[0] == me and cc[1] in ('Gn', 'On') and can_hit(cfg, cc[1], t_, exposed(S, c_)):
                        att_ok = True
                        break
            if att_ok:
                res['fish_enemy_hittable'] += 1
                last_fish = (team, act[1])
        if act is None:
            res['winner'] = 1 - team
            res['reason'] = 'surrounded'
            break
        if trace is not None:
            trace.append((team, act))
        S.cmd += 1
        k = act[0]
        quiet_reset = False
        if k == 'U':
            cell = S.board[act[1]]
            cell[2] = True
            S.shrouds -= 1
            S.pool[(cell[0], cell[1])] -= 1
            res['unveils'] += 1
            if cell[0] == NEUTRAL:
                ht = team
                if S.hired[ht] >= cfg.hire // 2:
                    ht = 1 - ht            # flipper's clan is at the cap: the Geisha joins the opponent
                S.hired[ht] += 1
                if res['first_hire'] is None:
                    res['first_hire'] = (ht, S.cmd, ht == team)
                if S.team_col[0] is not None:
                    cell[0] = S.team_col[ht]
                else:
                    S.pending.append((cell, ht))
            elif S.team_col[0] is None:
                S.team_col[team] = cell[0]
                S.team_col[1 - team] = 1 - cell[0]
                res['vanguard_col'] = cell[0]
                for pc, pt in S.pending:
                    pc[0] = S.team_col[pt]
                S.pending = []
            quiet_reset = True
        elif k in ('M', 'C'):
            i, j = act[1], act[2]
            S.board[j] = S.board[i]
            S.board[i] = None
            if k == 'C':
                res['charges'] += 1
        else:
            i, j, kind = act[1], act[2], act[3]
            att = S.board[i][1]
            victim = S.board[j]
            res['kills'][(att, victim[1])] += 1
            if kind == 'v':
                res['volleys'] += 1
            elif kind == 'k':
                res['vaults'] += 1
            if victim[1] == 'Dm':
                S.dm[victim[0]] -= 1
            if victim[1] == 'Sg':
                res['winner'] = team
                res['reason'] = 'shogun'
                res['sg_by'] = att
                res['sg_exposed'] = exposed(S, victim[0])
                res['cmds'] = S.cmd
                res['shrouds'] = S.shrouds
                return res
            if kind == 'v':
                S.board[j] = None
            else:
                S.board[j] = S.board[i]
                S.board[i] = None
            quiet_reset = True
        # ---- Forced Fight: per-clan stall clock (own Commands without own Unveil / capture)
        if me is not None:
            if quiet_reset:
                S.stall[team] = 0
            else:
                S.stall[team] += 1
                if cfg.forced_fight and S.stall[team] >= cfg.ff_n:
                    S.stall[team] = 0
                    if cfg.ff_facedown_only and not shogun_down(S, me):
                        pass            # v3: Shogun already revealed (or gone): nothing to force out
                    else:
                        S.fo[me] = True
                        res['ff_count'][team] += 1
                        if res['ff'][team] is None:
                            res['ff'][team] = S.cmd
                    for pc in S.board:
                        if pc is not None and pc[0] == me and pc[1] == 'Sg' and not pc[2]:
                            pc[2] = True
                            S.shrouds -= 1
                            S.pool[(me, 'Sg')] -= 1
                            res['ff_shogun_flipped'][team] = True
        # ---- Long Night: both clans quiet for `night` Commands ends the Battle on piece count
        if quiet_reset:
            S.quiet = 0
        else:
            S.quiet += 1
            if cfg.night and S.quiet >= cfg.night:
                a_ = count_pieces(S, S.team_col[0], cfg.night_faceup)
                b_ = count_pieces(S, S.team_col[1], cfg.night_faceup)
                res['night_counts'] = (a_, b_)
                res['night_margin'] = abs(a_ - b_)
                if a_ == b_:
                    res['reason'] = 'night_tie'
                else:
                    res['winner'] = 0 if a_ > b_ else 1
                    res['reason'] = 'night_count'
                break
        team = 1 - team
    res['cmds'] = S.cmd
    left = [Counter(), Counter()]
    for cell in S.board:
        if cell is not None and cell[0] in (0, 1):
            left[cell[0]][cell[1]] += 1
    res['left'] = left
    res['shrouds'] = S.shrouds
    return res
