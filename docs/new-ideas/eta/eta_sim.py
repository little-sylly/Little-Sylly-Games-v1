"""ETA? scoring simulation (reference model for the maths round).

Run:  python3 eta_sim.py curve | standard | sylly | kappa | exploit | ranks | all

EVERYTHING about how players estimate is an ASSUMPTION (no playtest data yet).
Errors are measured in natural-log units (e = ln(logged / true)); "decades" = log10.
"""
import math
import sys
import numpy as np

rng = np.random.default_rng(20261010)
LN10 = math.log(10)

# ----------------------------------------------------------------- tunables
M = 40000.0                       # Accuracy Mileage ceiling per Run
SKILL_SIGMA = {"sharp": 0.60, "average": 1.10, "loose": 1.80}   # ln-units, typical miss ~1.8x / 3x / 6x (ASSUMED)
SKILL_P = {"sharp": 0.25, "average": 0.50, "loose": 0.25}
RANGE_MULT = {"Local": 0.8, "Mixed": 1.0, "Cosmic": 1.3}        # tier difficulty on sigma
UNREG_MULT = 1.25                                               # fantasy rides: harder to estimate
CLASSES = list(SKILL_SIGMA)

CURVE = dict(L=1.0, p=1.0, d0=math.log10(1.05))                 # overwritten by the chosen curve


def t_noise(size, df=5):
    return rng.standard_t(df, size) / math.sqrt(df / (df - 2))


def acc(d_dec, L=None, p=None, d0=None):
    """Accuracy fraction (0..1) from |log10(logged/true)|. Dead-zone d0 = full marks, linear fall to 0 at L decades."""
    L = CURVE["L"] if L is None else L
    p = CURVE["p"] if p is None else p
    d0 = CURVE["d0"] if d0 is None else d0
    x = np.clip((np.asarray(d_dec) - d0) / (L - d0), 0, 1)
    return (1 - x) ** p


def draw_table(n):
    cls = rng.choice(CLASSES, size=n, p=[SKILL_P[c] for c in CLASSES])
    return cls, np.array([SKILL_SIGMA[c] for c in cls])


# ----------------------------------------------------------------- standard mode
def sim_standard(n, N, rng_name="Mixed", T=3000.0, sweep=3000.0, w_acc=0.5, shifts=20000, curve=None):
    """Vectorised Standard Mode: accuracy + Depot Tips. Returns dict of arrays."""
    if curve:
        CURVE.update(curve)
    sig = np.zeros((shifts, n))
    cls = np.empty((shifts, n), dtype=object)
    for s in range(shifts):
        c, sg = draw_table(n)
        cls[s], sig[s] = c, sg
    ride = np.exp(rng.normal(0, 0.25, (shifts, N, n)))
    e = sig[:, None, :] * RANGE_MULT[rng_name] * ride * t_noise((shifts, N, n))
    A = acc(np.abs(e) / LN10) * M                                   # accuracy mileage
    trait = rng.normal(0, 1, (shifts, 1, n)) * 0.6
    charisma = trait + rng.normal(0, 1, (shifts, N, n)) * 0.8
    logit = charisma - w_acc * np.abs(e)                            # stamp appeal: charisma + plausibility
    L = np.repeat(logit[:, :, None, :], n, axis=2)                  # [s,r,giver,receiver]
    idx = np.arange(n)
    L[:, :, idx, idx] = -1e9
    g = rng.gumbel(size=L.shape)
    pick = np.argmax(L + g, axis=3)                                 # [s,r,giver]
    stamps = np.zeros((shifts, N, n))
    for giver in range(n):
        np.add.at(stamps, (np.arange(shifts)[:, None], np.arange(N)[None, :], pick[:, :, giver]), 1)
    tips = stamps * T + (stamps == (n - 1)) * sweep
    gear = 5.0 / N
    return dict(A=A, tips=tips, stamps=stamps, cls=cls, gear=gear, e=e)


def standard_report(n=5, N=5, T=3000, sweep=3000, w_acc=0.5, rng_name="Mixed", shifts=15000):
    if T is None:
        T = TIP_BY_N[n]
        sweep = T if n >= SWEEP_MIN_PLAYERS else 0.0
    r = sim_standard(n, N, rng_name, T, sweep, w_acc, shifts)
    acc_tot = r["A"].sum(1)
    tot = (r["A"] + r["tips"]).sum(1)
    flip = np.mean(np.argmax(acc_tot, 1) != np.argmax(tot, 1))
    share = r["tips"].sum() / (r["A"] + r["tips"]).sum()
    return dict(flip=flip, tip_share=share, run_mean=(r["A"] + r["tips"]).mean(),
                acc_run_mean=r["A"].mean(), tips_run_mean=r["tips"].mean())


# ----------------------------------------------------------------- sylly mode
def shapley(e, us):
    k = len(us)
    masks = np.arange(1 << k)
    bits = (masks[:, None] >> np.arange(k)) & 1
    sums = (bits * np.array(us)).sum(1)
    v = abs(e) - np.abs(e + sums)
    pc = bits.sum(1)
    fact = [math.factorial(i) for i in range(k + 1)]
    wts = np.array([fact[s] * fact[k - s - 1] / fact[k] if s < k else 0 for s in range(k + 1)])
    out = []
    for i in range(k):
        m0 = masks[((masks >> i) & 1) == 0]
        out.append(float(np.sum(wts[pc[m0]] * (v[m0 | (1 << i)] - v[m0]))))
    return out


def credit(scheme, e, us):
    """Signed credit in ln-units for each corrector of one target (positive = helped)."""
    k = len(us)
    d_f = e + sum(us)
    if scheme == "loo":                       # "as if you went last"
        return [abs(d_f - u) - abs(d_f) for u in us]
    if scheme == "shapley":
        return shapley(e, us)
    if scheme == "pool":                      # share of the NET result, by push size
        delta = abs(e) - abs(d_f)
        if delta >= 0:
            helpers = [i for i, u in enumerate(us) if np.sign(u) == -np.sign(e)]
            tot = sum(abs(us[i]) for i in helpers) or 1.0
            c = [0.0] * k
            for i in helpers:
                c[i] = delta * abs(us[i]) / tot
            for i, u in enumerate(us):
                if np.sign(u) == np.sign(e):  # pushed the wrong way: always loses own push
                    c[i] = -abs(u)
            return c
        net_dir = np.sign(sum(us))
        movers = [i for i, u in enumerate(us) if np.sign(u) == net_dir]
        tot = sum(abs(us[i]) for i in movers) or 1.0
        c = [0.0] * k
        for i in movers:
            c[i] = delta * abs(us[i]) / tot
        return c
    raise ValueError(scheme)


def credit_pts(e, us, Ka, Kb):
    """'poolacc': credit measured in ACCURACY POINTS the corrections added/removed (signed km per corrector).
    Net swing is shared by push size; Navigation Assist = Ka x swing, Detour = Kb x |swing|.
    Anyone who pushed the wrong way pays Kb x the damage their own push would have done alone."""
    k = len(us)
    d_f = e + sum(us)
    swing = float(acc(abs(d_f) / LN10) - acc(abs(e) / LN10)) * M
    out = [0.0] * k
    if swing >= 0:
        helpers = [i for i, u in enumerate(us) if np.sign(u) == -np.sign(e)]
        tot = sum(abs(us[i]) for i in helpers) or 1.0
        for i in helpers:
            out[i] = Ka * swing * abs(us[i]) / tot
        for i, u in enumerate(us):
            if np.sign(u) == np.sign(e):
                alone = float(acc(abs(e + u) / LN10) - acc(abs(e) / LN10)) * M
                out[i] = Kb * min(alone, 0.0)
        return out
    net_dir = np.sign(sum(us))
    movers = [i for i, u in enumerate(us) if np.sign(u) == net_dir]
    tot = sum(abs(us[i]) for i in movers) or 1.0
    for i in movers:
        out[i] = Kb * swing * abs(us[i]) / tot
    return out


STYLES = {"timid": 0.5, "normal": 0.8, "bold": 1.0}
STYLE_P = [0.3, 0.4, 0.3]


def sylly_run(sigma, unreg, P, kappa=None, focal_kappa=None, rng_mult=1.0):
    """One Sylly Run. Returns per-player dict of components (km) plus diagnostics."""
    n = len(sigma)
    sig_eff = sigma * rng_mult * np.where(unreg, UNREG_MULT, 1.0) * np.exp(rng.normal(0, 0.25, n))
    e = sig_eff * t_noise(n)                                       # signed ln error of each Logged ETA
    common = rng.normal(0, 0.45, n) * np.where(unreg, 1.3, 1.0)   # everybody is unsure about the same ride speed
    indiv = rng.normal(0, 1, (n, n)) * (0.7 * sigma)[:, None]
    b = e[None, :] - common[None, :] - indiv                      # corrector i's belief of target j's error
    absb = np.abs(b)
    np.fill_diagonal(absb, -1.0)
    pick = np.argmax(absb + rng.gumbel(size=(n, n)) * P["temp"], axis=1)
    bi = b[np.arange(n), pick]
    if kappa is None:
        kappa = rng.choice(P.get("styles", list(STYLES.values())), size=n, p=STYLE_P)
    kappa = np.array(kappa, dtype=float)
    if focal_kappa is not None:
        kappa[0] = focal_kappa
    u = np.clip(-kappa * bi, -LN10, LN10)
    u[np.abs(bi) < P["theta"]] = 0.0                              # not worth a correction => Hands off
    hands_off = u == 0

    A = acc(np.abs(e) / LN10) * M
    H = np.where(unreg, P["H"], 0.0)
    nav = np.zeros(n)
    det = np.zeros(n)
    ins = np.zeros(n)
    spin = back = pile = 0
    for j in range(n):
        cor = [i for i in range(n) if i != j and pick[i] == j and not hands_off[i]]
        if not cor:
            continue
        us = [u[i] for i in cor]
        d_f = e[j] + sum(us)
        if P["scheme"] == "poolacc":
            for i, pts in zip(cor, credit_pts(e[j], us, P["Ka"], P["Kb"])):
                if pts >= 0:
                    nav[i] += pts
                else:
                    det[i] += -pts
        else:
            cr = credit(P["scheme"], e[j], us)
            for i, c in zip(cor, cr):
                dec = c / LN10
                if dec >= 0:
                    nav[i] += P["a"] * dec
                else:
                    det[i] += P["b"] * -dec
        ins[j] = min(P["c"] * sum(abs(x) for x in us) / LN10, P["Imax"])
        if len(cor) >= 2:
            pile += 1
            if abs(d_f) > abs(e[j]) + 0.15:
                spin += 1
        if abs(e[j]) > math.log(1.5) and abs(d_f) <= math.log(1.25) and abs(d_f) < abs(e[j]):
            back += 1
    raw = A + H + nav - det + ins
    tot = np.maximum(raw, 0.0)
    return dict(A=A, H=H, nav=nav, det=det, ins=ins, tot=tot, e=e, u=u, hands_off=hands_off,
                spin=spin, back=back, pile=pile, n_targets=len(set(pick[~hands_off])))


# Planning behaviour = "measured" table; "reckless" (styles .5/.8/1.0, temp .3) is the stress test.
TIP_BY_N = {3: 4500.0, 4: 3500.0, 5: 3000.0, 6: 2500.0, 7: 2250.0, 8: 2000.0}     # Depot Tip per Stamp
SWEEP_MIN_PLAYERS = 5                                                              # Sweep Bonus = one extra tip, 5+ only
DEFAULT_P = dict(scheme="poolacc", Ka=0.8, Kb=0.4, a=18000.0, b=22000.0, c=3000.0, Imax=4000.0, H=4000.0,
                 temp=0.8, theta=0.7, styles=[0.3, 0.5, 0.8])


def sylly_batch(n, runs, P=None, rng_name="Mixed", unreg_rate=0.35, focal_kappa=None, seed_classes=None):
    P = {**DEFAULT_P, **(P or {})}
    rows = dict(A=[], H=[], nav=[], det=[], ins=[], tot=[], cls=[], spin=0, back=0, pile=0, tgt=0, hands=0, picks=0)
    for _ in range(runs):
        c, sg = draw_table(n)
        if seed_classes:
            c = np.array(seed_classes + list(c[len(seed_classes):]))
            sg = np.array([SKILL_SIGMA[x] for x in c])
        un = rng.random(n) < unreg_rate
        r = sylly_run(sg, un, P, focal_kappa=focal_kappa, rng_mult=RANGE_MULT[rng_name])
        for k in ("A", "H", "nav", "det", "ins", "tot"):
            rows[k].append(r[k])
        rows["cls"].append(c)
        rows["spin"] += r["spin"]
        rows["back"] += r["back"]
        rows["pile"] += r["pile"]
        rows["hands"] += r["hands_off"].sum()
        rows["picks"] += n
    for k in ("A", "H", "nav", "det", "ins", "tot", "cls"):
        rows[k] = np.array(rows[k])
    return rows


def sylly_shifts(n, shifts, N, P=None, rng_name="Mixed", unreg_rate=0.35):
    """Sylly Shifts with the SAME couriers across the N Runs. Returns (totals[shifts,N,n], classes[shifts,n])."""
    P = {**DEFAULT_P, **(P or {})}
    tot = np.zeros((shifts, N, n))
    cls = np.empty((shifts, n), dtype=object)
    for s_ in range(shifts):
        c, sg = draw_table(n)
        cls[s_] = c
        for r_ in range(N):
            un = rng.random(n) < unreg_rate
            tot[s_, r_] = sylly_run(sg, un, P, rng_mult=RANGE_MULT[rng_name])["tot"]
    return tot, cls


# ----------------------------------------------------------------- experiments
def exp_curve():
    print("Accuracy at ratio R (off by R x, either direction)")
    cands = {"L1.0 p1.0": dict(L=1.0, p=1.0), "L1.0 p1.5": dict(L=1.0, p=1.5),
             "L1.25 p1.0": dict(L=1.25, p=1.0), "L1.25 p1.5": dict(L=1.25, p=1.5),
             "L1.5 p1.5": dict(L=1.5, p=1.5), "L1.5 p2.0": dict(L=1.5, p=2.0)}
    Rs = [1.05, 1.1, 1.25, 1.5, 2, 3, 5, 10, 20, 30]
    print("curve       " + " ".join(f"{r:>6}x" for r in Rs))
    for name, cv in cands.items():
        CURVE.update(cv)
        print(f"{name:<12}" + " ".join(f"{float(acc(math.log10(r)))*100:6.0f}%" for r in Rs))
    print()
    print("Population results (Mixed range, 3000 tables x 5 runs): mean score % by class, zero-rate, bullseye(>=95%)")
    for name, cv in cands.items():
        CURVE.update(cv)
        res = {c: [] for c in CLASSES}
        for _ in range(3000):
            cl, sg = draw_table(8)
            e = sg * t_noise(8) * np.exp(rng.normal(0, 0.25, 8))
            a = acc(np.abs(e) / LN10)
            for c_, a_ in zip(cl, a):
                res[c_].append(a_)
        line = f"{name:<12}"
        for c in CLASSES:
            v = np.array(res[c])
            line += f" | {c}: mean {v.mean()*100:4.1f}% zero {np.mean(v==0)*100:4.1f}% bull {np.mean(v>=.95)*100:4.1f}%"
        print(line)
    print()
    print("Range effect for chosen-style curve L1.25 p1.5 (mean accuracy % over mixed population)")
    CURVE.update(dict(L=1.25, p=1.5))
    for rn in RANGE_MULT:
        v = []
        for _ in range(4000):
            cl, sg = draw_table(8)
            e = sg * RANGE_MULT[rn] * t_noise(8) * np.exp(rng.normal(0, 0.25, 8))
            v.extend(acc(np.abs(e) / LN10))
        v = np.array(v)
        print(f"  {rn:<7} mean {v.mean()*100:5.1f}%  zero-rate {np.mean(v==0)*100:4.1f}%")


def exp_standard():
    CURVE.update(dict(L=1.25, p=1.5))
    print("Standard Mode: how much do Stamps swing the winner? (5 couriers, 5 Runs, Mixed)")
    print(" w_acc = how much stamp-givers lean toward plausible (accurate-looking) pitches")
    print("   T     sweep  w_acc  tips%of total  winner-flip%  run mean (km)")
    for T in (2000, 3000, 4000, 5000):
        for w in (0.0, 0.5, 1.0):
            r = standard_report(5, 5, T, T, w)
            print(f"  {T:>5} {T:>6} {w:>5.1f}   {r['tip_share']*100:8.1f}%   {r['flip']*100:9.1f}%   {r['run_mean']:9.0f}")
    print()
    print("Player-count sensitivity at T=3000, w=0.5")
    for n in (3, 4, 6, 8):
        r = standard_report(n, 5, 3000, 3000, 0.5, shifts=8000)
        print(f"  n={n}: tips {r['tip_share']*100:4.1f}%  flip {r['flip']*100:4.1f}%  run mean {r['run_mean']:.0f}")
    print()
    print("Chosen tip table (Sweep = one extra tip, 5+ couriers only): flip% / tip share / mean Run km")
    for n in (3, 4, 5, 6, 7, 8):
        r = standard_report(n, 5, None, None, 0.5, shifts=8000)
        print(f"  n={n}: T={TIP_BY_N[n]:.0f}  flip {r['flip']*100:4.1f}%  tips {r['tip_share']*100:4.1f}%  run mean {r['run_mean']:.0f}")
    print()
    print("Shift length: hidden Gear Ratio = 5/N keeps Shift totals comparable")
    for N in (3, 5, 7):
        r = sim_standard(5, N, "Mixed", 3000, 3000, 0.5, 8000)
        tot = ((r["A"] + r["tips"]).sum(1) * r["gear"])
        print(f"  N={N}: gear {r['gear']:.3f}  mean Shift total {tot.mean():8.0f}  sd {tot.std():7.0f}  (per player)")


def exp_sylly():
    CURVE.update(dict(L=1.25, p=1.5))
    print("Sylly Mode: compare credit schemes (n=5, Mixed, a=18000/dec, b=22000/dec)")
    print(" scheme    spin/Run  pile/Run  back/Run  hands%  Nav-Det mean|sharp avg loose   Run total mean   sd")
    for sch in ("loo", "shapley", "pool", "poolacc"):
        rr = sylly_batch(5, 2500, dict(scheme=sch))
        net = rr["nav"] - rr["det"]
        by = {c: net[rr["cls"] == c].mean() for c in CLASSES}
        print(f"  {sch:<8} {rr['spin']/2500:7.2f} {rr['pile']/2500:9.2f} {rr['back']/2500:9.2f} "
              f"{rr['hands']/rr['picks']*100:6.1f}   {by['sharp']:7.0f} {by['average']:7.0f} {by['loose']:7.0f}"
              f"   {rr['tot'].mean():9.0f} {rr['tot'].std():8.0f}")


def exp_kappa():
    CURVE.update(dict(L=1.25, p=1.5))
    print("Best-response test: focal AVERAGE player varies boldness kappa (0=Hands off, 1=full fix); others mixed styles")
    for sch in ("loo", "pool", "poolacc"):
        print(f" scheme={sch}")
        for n in (4, 6):
            line = f"  n={n}: "
            for k in (0.0, 0.25, 0.5, 0.75, 1.0, 1.25):
                rr = sylly_batch(n, 3000, dict(scheme=sch), focal_kappa=k, seed_classes=["average"])
                net = (rr["nav"] - rr["det"])[:, 0].mean()
                line += f" k={k:<4}:{net:7.0f} "
            print(line)


def exp_exploit():
    CURVE.update(dict(L=1.25, p=1.5))
    P = DEFAULT_P
    print("Exploit checks (per Run, km). Ka=%.1f Kb=%.1f c=%.0f Imax=%.0f" % (P["Ka"], P["Kb"], P["c"], P["Imax"]))
    print(" 1) Ring: A logs a deliberately bad ETA, partner B fixes it perfectly and they share")
    print("    miss   A loses   B Nav   A Insurance   pair net")
    for fac in (1.5, 2, 3, 5, 10):
        lose = (acc(0.0) - acc(math.log10(fac))) * M
        nav = P["Ka"] * lose
        ins = min(P["c"] * math.log10(fac), P["Imax"])
        print(f"    {fac:>4}x {lose:8.0f} {nav:8.0f} {ins:9.0f} {nav + ins - lose:10.0f}")
    print(" 2) Nudge farming: 1%% nudge pays Insurance %.1f km and Nav 0 (inside the 5%% dead-zone)" % (P["c"] * math.log10(1.01)))
    print(" 3) Spite: S pushes against a helper H on a target. S pays Kb x own damage; H's Nav shrinks by at most Ka x swing")
    e = math.log(4.0)
    sw_alone = float(acc(0.0) - acc(math.log10(4.0))) * M
    print(f"    target 4x low: H alone earns {P['Ka']*sw_alone:.0f}; S pushes x1.5 back -> S pays about {P['Kb']*(float(acc(math.log10(4.0)) - acc(math.log10(6.0)))*M):.0f}")
    print(" 4) Hands-off dominance: see the kappa experiment (EV of correcting at modest boldness is positive for sharp/average)")
    rr = sylly_batch(5, 4000, {})
    net = rr["nav"] - rr["det"]
    print(f"    mean Nav-Det per courier-Run {net.mean():.0f}; sd {net.std():.0f}; Run-total floor hit {(rr['tot']==0).mean()*100:.2f}%")


RANK_TH = [0, 25000, 55000, 85000, 115000, 145000, 170000, 195000]      # chosen thresholds (km, hidden Gear Ratio applied)


def exp_ranks():
    CURVE.update(dict(L=1.25, p=1.5))
    print("Shift totals per courier (5-Run, Gear 1.0), Standard vs Sylly, same couriers across Runs")
    std, cs, syl, cy = [], [], [], []
    for n in (3, 4, 5, 6, 7, 8):
        T = TIP_BY_N[n]
        r = sim_standard(n, 5, "Mixed", T, T if n >= SWEEP_MIN_PLAYERS else 0.0, 0.5, 3000)
        std.append((r["A"] + r["tips"]).sum(1).ravel())
        cs.append(r["cls"].ravel())
        t, c = sylly_shifts(n, 800 if n < 7 else 500, 5)
        syl.append(t.sum(1).ravel())
        cy.append(c.ravel())
    std, cs, syl, cy = map(np.concatenate, (std, cs, syl, cy))
    allv = np.concatenate([std, syl])
    print(" quantile  Standard    Sylly   pooled")
    for q in [0, .01, .06, .17, .32, .50, .68, .85, .96, .99]:
        print(f"  {q:4.2f}  {np.quantile(std, q):9.0f} {np.quantile(syl, q):9.0f} {np.quantile(allv, q):9.0f}")
    print(" mean Standard %.0f | mean Sylly %.0f | max Standard %.0f | max Sylly %.0f" % (std.mean(), syl.mean(), std.max(), syl.max()))
    for nm, v, c in (("Standard", std, cs), ("Sylly", syl, cy)):
        print(f" {nm} 5-Run total by skill (km):")
        for cl in CLASSES:
            x = v[c == cl]
            print(f"   {cl:<8} mean {x.mean():8.0f}  p10 {np.quantile(x,.1):8.0f}  p90 {np.quantile(x,.9):8.0f}  max {x.max():8.0f}")
    th = RANK_TH
    print(" Final rank share with thresholds", th)
    for nm, v in (("Standard", std), ("Sylly", syl), ("pooled", allv)):
        ranks = np.digitize(v, th[1:])
        print("  %-9s" % nm + " ".join(f"R{i+1}:{np.mean(ranks==i)*100:4.1f}%" for i in range(8)))
    print(" Promotions by Shift length (Standard, 5 couriers): mean rank after each Run, and % promoted that Run")
    for N in (3, 5, 7):
        T = TIP_BY_N[5]
        r = sim_standard(5, N, "Mixed", T, T, 0.5, 6000)
        cum = np.cumsum((r["A"] + r["tips"]) * r["gear"], axis=1)
        ranks = np.digitize(cum, th[1:]) + 1
        prev = np.concatenate([np.ones((ranks.shape[0], 1, ranks.shape[2])), ranks[:, :-1, :]], axis=1)
        promo = (ranks > prev).mean(axis=(0, 2)) * 100
        print(f"  N={N}: mean rank " + " ".join(f"{x:.1f}" for x in ranks.mean(axis=(0, 2))) +
              " | promoted % " + " ".join(f"{x:.0f}" for x in promo) +
              f" | reached R8 by final {np.mean(ranks[:, -1, :] == 8)*100:.1f}% (before final {np.mean(ranks[:, :-1, :] == 8)*100 if N > 1 else 0:.1f}%)")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    fns = dict(curve=exp_curve, standard=exp_standard, sylly=exp_sylly, kappa=exp_kappa, exploit=exp_exploit, ranks=exp_ranks)
    for k, f in fns.items():
        if which in (k, "all"):
            print("=" * 78)
            print(k.upper())
            f()
