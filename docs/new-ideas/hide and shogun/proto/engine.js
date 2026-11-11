/* ===== HIDE AND SHOGUN — RULES ENGINE + BOTS (JavaScript port of sim/hsg_sim.py, brief v3) =====
 * Rules engine only. No DOM. Kept separate so it can be lifted into the suite's own code later.
 * Board: flat 30-cell array. A cell is null or [colour, type, faceUp]. Colour 0 = Ivory Moon, 1 = Crimson Sun,
 * 2 = an un-hired Geisha. Teams: team 0 = Vanguard (commands first), team 1 = Rearguard. S.teamCol[team] = that
 * team's clan colour once the banners are raised (null before).
 * Actions: ['U', i] Unveil | ['M', i, j] March | ['C', i, j] Charge | ['S', i, j, kind] Strike
 * (kind: 'x' contact or Cast, 'v' Volley (shooter stays put), 'k' Vault).
 */
(function (root) {
  'use strict';
  const W = 5, H = 6, N = W * H;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const idx = (c, r) => r * W + c;
  const NB = [], DIAG = [], RAYS = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = idx(c, r);
    NB[i] = []; DIAG[i] = []; RAYS[i] = [[], [], [], []];
    DIRS.forEach(([dc, dr], d) => {
      let cc = c + dc, rr = r + dr;
      while (cc >= 0 && cc < W && rr >= 0 && rr < H) { RAYS[i][d].push(idx(cc, rr)); cc += dc; rr += dr; }
      if (RAYS[i][d].length) NB[i].push(RAYS[i][d][0]);
    });
    for (const dc of [-1, 1]) for (const dr of [-1, 1]) {
      const cc = c + dc, rr = r + dr;
      if (cc >= 0 && cc < W && rr >= 0 && rr < H) DIAG[i].push(idx(cc, rr));
    }
  }
  const RANK = { Sg: 8, Dm: 7, On: 6, Sm: 5, Kn: 4, Gn: 3, Rn: 2, Gs: 0 };   // v4 ladder: Onmyoji above Samurai
  const VALUE = { Sg: 100, Dm: 9, Sm: 7, Kn: 6, On: 5, Gn: 5, Rn: 2, Gs: 8 };
  const THREAT = Object.assign({}, VALUE, { Sg: 1000 });
  const CONTACT = ['Sg', 'Dm', 'Sm', 'Rn', 'Gs'];
  const CORE = { Sg: 1, Dm: 2, Sm: 2, On: 2, Kn: 1, Gn: 2 };
  const NEUTRAL = 2;

  function defaultRoster(hire) {
    const g = Math.max(1, Math.floor(hire / 2));
    const r = Object.assign({}, CORE);
    r.Rn = 5 - g;
    return r;
  }

  function makeCfg(over) {
    const cfg = Object.assign({
      hire: 4,                 // The Floating World: Geisha for hire (2 = Quiet Evening, 4 = Grand Banquet)
      night: 12,               // The Long Night (fixed rule): consecutive quiet Commands, both players (6 each); null = off (testing only)
      forcedFight: false,      // Shogun's Shame: CUT from the rules (owner, 11 Nov 2026); true only in legacy tests
      ffN: 5,                  // Shogun's Shame: own Commands without own Unveil / capture
      ffFacedownOnly: true,    // v3: only forces a Shogun that is still face-down
      nightFaceup: true,       // v3: Long Night counts face-up pieces only
      onAll: true,             // Onmyoji strikes like the Gunner
      knHitsExposed: true,
      knHitsGs: true,          // v4: the Kunoichi's Vault takes anything but a Guarded Shogun, Geisha included
      knAll: true,             // v4: the Kunoichi ignores rank
      rnHitsGs: true,          // v4: Ronin may strike a Geisha
      gnRanges: [2, 3],        // v4: Gunner fires at distance 2 or 3
      maxCmd: 1500,
    }, over || {});
    cfg.roster = defaultRoster(cfg.hire);
    return cfg;
  }

  // ---------------------------------------------------------------- RNG
  function makeRng(seed) {
    let a = (seed === undefined ? (Math.random() * 4294967296) : seed) >>> 0;
    const rnd = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      random: rnd,
      choice(arr) { return arr[Math.floor(rnd() * arr.length)]; },
      shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
      sample(arr, k) { const c = arr.slice(); this.shuffle(c); return c.slice(0, k); },
    };
  }
  function wchoice(rng, items, wts) {
    let tot = 0; for (const w of wts) tot += w;
    let r = rng.random() * tot;
    for (let i = 0; i < items.length; i++) { r -= wts[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  }

  // ---------------------------------------------------------------- state
  const pkey = (col, t) => col + '|' + t;
  function newState(cfg, rng) {
    const cells = [];
    for (const col of [0, 1]) for (const t of Object.keys(cfg.roster)) for (let k = 0; k < cfg.roster[t]; k++) cells.push([col, t, false]);
    for (let k = 0; k < cfg.hire; k++) cells.push([NEUTRAL, 'Gs', false]);
    rng.shuffle(cells);
    const S = { board: cells, teamCol: [null, null], dm: [cfg.roster.Dm, cfg.roster.Dm], quiet: 0, pool: {}, cmd: 0, cfg,
      shrouds: cells.length, fo: [false, false], stall: [0, 0], hired: [0, 0], pending: [] };
    for (const col of [0, 1]) for (const t of Object.keys(cfg.roster)) S.pool[pkey(col, t)] = cfg.roster[t];
    if (cfg.hire) S.pool[pkey(NEUTRAL, 'Gs')] = cfg.hire;
    return S;
  }

  function exposed(S, col) {
    if (col > 1) return false;
    if (S.dm[col] === 0) return true;
    if (S.fo[col]) {
      for (const c of S.board) if (c !== null && c[0] === col && c[1] === 'Dm' && c[2]) return false;
      return true;
    }
    return false;
  }

  function canHit(cfg, att, tgt, exp) {
    if (tgt === 'Gs') return (att === 'Kn' && cfg.knHitsGs) || (att === 'Rn' && cfg.rnHitsGs);
    if (tgt === 'Sg') {
      if (att === 'Gs') return true;
      if (att === 'Kn' && !cfg.knHitsExposed) return false;
      return exp;
    }
    if (att === 'Gs') return false;
    if (att === 'Gn') return true;
    if (att === 'Kn') return cfg.knAll ? true : RANK[tgt] < 4;
    if (att === 'On' && cfg.onAll) return true;
    if (att === 'Rn') return tgt === 'Rn' || tgt === 'Gn';
    return RANK[att] >= RANK[tgt];
  }

  function pieceStrikes(S, i, cell) {
    const col = cell[0], t = cell[1], b = S.board, cfg = S.cfg, out = [];
    if (CONTACT.includes(t) || t === 'On') {
      for (const j of (t === 'On' ? DIAG[i] : NB[i])) {
        const tc = b[j];
        if (tc !== null && tc[2] && tc[0] !== col && canHit(cfg, t, tc[1], exposed(S, tc[0]))) out.push([j, 'x']);
      }
    } else if (t === 'Gn') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (const rg of cfg.gnRanges) {
          if (ray.length < rg) continue;
          const tc = b[ray[rg - 1]];
          if (tc === null || !tc[2] || tc[0] === col || !canHit(cfg, t, tc[1], exposed(S, tc[0]))) continue;
          out.push([ray[rg - 1], 'v']);
        }
      }
    } else if (t === 'Kn') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d], n = ray.length;
        let k = 0;
        while (k < n && b[ray[k]] === null) k++;
        if (k >= n) continue;
        let m = k + 1;
        while (m < n && b[ray[m]] === null) m++;
        if (m >= n) continue;
        const tc = b[ray[m]];
        if (tc[2] && tc[0] !== col && canHit(cfg, t, tc[1], exposed(S, tc[0]))) out.push([ray[m], 'k']);
      }
    }
    return out;
  }

  function genStrikes(S, col) {
    const out = [];
    S.board.forEach((cell, i) => {
      if (cell !== null && cell[2] && cell[0] === col) for (const [j, kind] of pieceStrikes(S, i, cell)) out.push([i, j, kind]);
    });
    return out;
  }

  function genActions(S, col) {
    const acts = [], b = S.board;
    for (let i = 0; i < N; i++) {
      const cell = b[i];
      if (cell === null) continue;
      if (!cell[2]) { acts.push(['U', i]); continue; }
      if (cell[0] !== col) continue;
      for (const j of NB[i]) if (b[j] === null) acts.push(['M', i, j]);
      if (cell[1] === 'Sm') {
        for (let d = 0; d < 4; d++) {
          const ray = RAYS[i][d];
          if (ray.length >= 2 && b[ray[0]] === null && b[ray[1]] === null) acts.push(['C', i, ray[1]]);
        }
      }
      for (const [j, kind] of pieceStrikes(S, i, cell)) acts.push(['S', i, j, kind]);
    }
    return acts;
  }
  const legal = genActions;

  function simApply(S, act) {
    const k = act[0], b = S.board, i = act[1], j = act[2];
    if (k === 'M' || k === 'C') {
      const u = [i, j, b[i], b[j], null];
      b[j] = b[i]; b[i] = null;
      return u;
    }
    const victim = b[j];
    const dmcol = victim[1] === 'Dm' ? victim[0] : null;
    const u = [i, j, b[i], victim, dmcol];
    if (dmcol !== null) S.dm[dmcol]--;
    if (act[3] === 'v') b[j] = null; else { b[j] = b[i]; b[i] = null; }
    return u;
  }
  function simUndo(S, u) {
    S.board[u[0]] = u[2]; S.board[u[1]] = u[3];
    if (u[4] !== null) S.dm[u[4]]++;
  }
  function bestThreat(S, col) {
    let best = 0; const b = S.board;
    for (const [i, j] of genStrikes(S, col)) { const v = THREAT[b[j][1]]; if (v > best) best = v; }
    return best;
  }
  function bestPrey(S, col) {
    let best = 0; const b = S.board;
    for (const [i, j] of genStrikes(S, col)) { const v = Math.min(VALUE[b[j][1]], 20); if (v > best) best = v; }
    return best;
  }

  // ---------------------------------------------------------------- bots
  function Bot(name, o) {
    return Object.assign({ name, rand: false, takeSg: false, U0: 0.4, approach: 0.25, threatW: 0.3, noise: 0.15, search: 0, clock: true,
      fish: false, fishMove: 0.4, hireW: 1.5, gainW: 1.0 }, o || {});
  }
  const BOTS = {
    random: Bot('random', { rand: true }),
    easy: Bot('easy', { rand: true, takeSg: true }),
    cautious: Bot('cautious', { U0: 0.2, approach: 0.1 }),
    aggro: Bot('aggro', { U0: 0.6, approach: 0.4 }),
    fish: Bot('fish', { U0: 0.6, approach: 0.4, fish: true }),
    hunt: Bot('hunt', { U0: 0.6, approach: 0.4, fish: true, gainW: 1.8 }),
    flip: Bot('flip', { U0: 1.4, approach: 0.4, fish: true }),
    stall: Bot('stall', { U0: -0.8, approach: 0.1 }),
    search2: Bot('search2', { U0: 0.6, approach: 0.4, fish: true, gainW: 1.8, search: 2 }),
    search3: Bot('search3', { U0: 0.6, approach: 0.4, fish: true, gainW: 1.8, search: 3 }),
  };
  // Levels shown to the player: Easy = random (but takes a Shogun capture), Normal = cautious, Hard = aggro, Expert = hunt, Expert+ = search3
  const BOT_LEVELS = [
    { id: 'easy', label: 'Easy', bot: 'easy' },
    { id: 'normal', label: 'Normal', bot: 'cautious' },
    { id: 'hard', label: 'Hard', bot: 'aggro' },
    { id: 'expert', label: 'Expert', bot: 'hunt' },
    { id: 'expertplus', label: 'Expert+', bot: 'search3' },
  ];

  const man = (a, b) => Math.abs(a % W - b % W) + Math.abs(Math.floor(a / W) - Math.floor(b / W));

  function approachBonus(S, i, j, t, me, w) {
    const b = S.board;
    let bestOld = null, bestNew = null;
    for (let p = 0; p < N; p++) {
      const cell = b[p];
      if (cell === null || !cell[2] || cell[0] === me) continue;
      const ex = (cell[1] === 'Sg' && t !== 'Gs') ? true : exposed(S, cell[0]);
      if (!canHit(S.cfg, t, cell[1], ex)) { if (!(t === 'Gs' && cell[1] === 'Sg')) continue; }
      let dOld, dNew;
      if (t === 'Gn') { dOld = Math.min(...S.cfg.gnRanges.map(r => Math.abs(man(i, p) - r))); dNew = Math.min(...S.cfg.gnRanges.map(r => Math.abs(man(j, p) - r))); }
      else { dOld = man(i, p); dNew = man(j, p); }
      if (bestOld === null || dOld < bestOld) bestOld = dOld;
      if (bestNew === null || dNew < bestNew) bestNew = dNew;
    }
    if (bestOld === null) return 0.0;
    const mult = t === 'Gs' ? 3.0 : ((t === 'Sg' || t === 'Dm') ? 0.3 : 1.0);
    return w * mult * (bestOld - bestNew);
  }

  function countPieces(S, col, upOnly) {
    let n = 0;
    for (const c of S.board) if (c !== null && c[0] === col && (c[2] || !upOnly)) n++;
    return n;
  }
  function shogunDown(S, col) {
    for (const c of S.board) if (c !== null && c[0] === col && c[1] === 'Sg') return !c[2];
    return false;
  }

  function evaluate(S, col) {
    const b = S.board; let sc = 0.0;
    const sg = [null, null], gs = [[], []];
    for (let i = 0; i < N; i++) {
      const c = b[i];
      if (c === null) continue;
      const v = c[1] !== 'Sg' ? VALUE[c[1]] : 0;
      sc += c[0] === col ? v : -v;
      if (c[1] === 'Sg') sg[c[0]] = i;
      else if (c[1] === 'Gs' && (c[0] === 0 || c[0] === 1)) gs[c[0]].push(i);
    }
    const opp = 1 - col;
    for (const g of gs[col]) if (sg[opp] !== null) sc += 1.5 - 0.4 * man(g, sg[opp]);
    for (const g of gs[opp]) if (sg[col] !== null) sc -= 1.5 - 0.4 * man(g, sg[col]);
    return sc;
  }
  function ordered(S, acts) {
    const b = S.board;
    const st = acts.filter(a => a[0] === 'S');
    st.sort((x, y) => THREAT[b[y[2]][1]] - THREAT[b[x[2]][1]]);
    return [st, acts.filter(a => a[0] !== 'S')];
  }
  function qsearch(S, col, alpha, beta, qd) {
    const stand = evaluate(S, col);
    if (qd === 0 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const [st] = ordered(S, genStrikes(S, col).map(([i, j, k]) => ['S', i, j, k]));
    const b = S.board;
    for (const a of st) {
      if (b[a[2]][1] === 'Sg') return 10000.0;
      const u = simApply(S, a);
      const v = -qsearch(S, 1 - col, -beta, -alpha, qd - 1);
      simUndo(S, u);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function negamax(S, col, depth, alpha, beta) {
    const acts = legal(S, col);
    if (!acts.length) return -9000.0 - depth;
    const b = S.board;
    const [st, qu] = ordered(S, acts);
    if (depth === 0) return qsearch(S, col, alpha, beta, 3);
    let best = -1e9;
    for (const a of st.concat(qu)) {
      if (a[0] === 'S' && b[a[2]][1] === 'Sg') return 10000.0 + depth;
      const u = simApply(S, a);
      const v = -negamax(S, 1 - col, depth - 1, -beta, -alpha);
      simUndo(S, u);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }
  function searchMove(S, me, depth, rng, noise) {
    noise = noise === undefined ? 0.05 : noise;
    const acts = legal(S, me), b = S.board;
    const [st, qu] = ordered(S, acts);
    let bestA = null, bestV = -1e9, alpha = -1e9;
    for (const a of st.concat(qu)) {
      if (a[0] === 'S' && b[a[2]][1] === 'Sg') return a;
      const u = simApply(S, a);
      const v = -negamax(S, 1 - me, depth - 1, -1e9, -alpha + 1e-9) + rng.random() * noise;
      simUndo(S, u);
      if (v > bestV) { bestV = v; bestA = a; alpha = Math.max(alpha, v - noise); }
    }
    return bestA;
  }

  function fishSlots(S, me) {
    const b = S.board, out = new Set();
    for (let i = 0; i < N; i++) {
      const c = b[i];
      if (c === null || !c[2] || c[0] !== me) continue;
      if (c[1] === 'Gn') {
        for (let d = 0; d < 4; d++) {
          const ray = RAYS[i][d];
          for (const rg of S.cfg.gnRanges) if (ray.length >= rg) { const t = b[ray[rg - 1]]; if (t !== null && !t[2]) out.add(ray[rg - 1]); }
        }
      } else if (c[1] === 'On') {
        for (const j of DIAG[i]) { const t = b[j]; if (t !== null && !t[2]) out.add(j); }
      }
    }
    return out;
  }
  function shroudReach(S, i, t) {
    const b = S.board; let n = 0;
    if (t === 'Gn') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (const rg of S.cfg.gnRanges) if (ray.length >= rg) { const c = b[ray[rg - 1]]; if (c !== null && !c[2]) n++; }
      }
    } else {
      for (const j of DIAG[i]) { const c = b[j]; if (c !== null && !c[2]) n++; }
    }
    return n;
  }

  function choose(S, team, rng, bot) {
    const me = S.teamCol[team], cfg = S.cfg, b = S.board;
    if (me === null) {
      const sh = [];
      b.forEach((c, i) => { if (c !== null && !c[2]) sh.push(i); });
      return ['U', rng.choice(sh)];
    }
    const acts = legal(S, me);
    if (!acts.length) return null;
    if (bot.rand) {
      if (bot.takeSg) for (const a of acts) if (a[0] === 'S' && b[a[2]][1] === 'Sg') return a;
      return rng.choice(acts);
    }
    const opp = 1 - me;
    for (const a of acts) if (a[0] === 'S' && b[a[2]][1] === 'Sg') return a;
    if (bot.search && S.shrouds === 0) return searchMove(S, me, bot.search, rng);

    let gainW = bot.gainW, thW = 1.0, flat = 0.0, uAdj = 0.0;
    if (bot.clock) {
      if (cfg.forcedFight && (shogunDown(S, me) || !cfg.ffFacedownOnly)) {
        const pressure = Math.max(0, S.stall[team] - (cfg.ffN - 4));
        uAdj += 0.6 * pressure; flat += 0.6 * pressure;
      }
      if (cfg.night && S.quiet >= cfg.night - 8) {
        const diff = countPieces(S, me, cfg.nightFaceup) - countPieces(S, opp, cfg.nightFaceup);
        if (diff <= 0) { gainW *= 1.5; thW = 0.6; flat += 5.0; uAdj += 0.5; }
        else { thW = 1.4; uAdj -= 1.0; }
      }
    }
    let bestA = null, bestS = -1e18;
    const shrouds = [];
    for (const a of acts) {
      const k = a[0];
      if (k === 'U') { shrouds.push(a[1]); continue; }
      const t = b[a[1]][1];
      const gain = k === 'S' ? (gainW * THREAT[b[a[2]][1]] + flat) : 0;
      const u = simApply(S, a);
      const th = bestThreat(S, opp);
      const ours = bestPrey(S, me);
      simUndo(S, u);
      let sc = gain - thW * th + bot.threatW * ours;
      if (k === 'M' || k === 'C') {
        sc += approachBonus(S, a[1], a[2], t, me, bot.approach);
        if (bot.fish && (t === 'Gn' || t === 'On')) sc += bot.fishMove * (shroudReach(S, a[2], t) - shroudReach(S, a[1], t));
      }
      sc += rng.random() * bot.noise;
      if (sc > bestS) { bestS = sc; bestA = a; }
    }
    if (shrouds.length) {
      const ents = [];
      for (const key of Object.keys(S.pool)) if (S.pool[key] > 0) { const [c, t] = key.split('|'); ents.push({ c: +c, t, n: S.pool[key] }); }
      const wts = ents.map(e => e.n);
      let tw = 0; for (const w of wts) tw += w;
      const fs = bot.fish ? fishSlots(S, me) : new Set();
      const fishC = shrouds.filter(x => fs.has(x)).slice(0, 4);
      const other = shrouds.filter(x => !fs.has(x));
      const room = 6 - fishC.length;
      const cand = fishC.concat(other.length <= room ? other : rng.sample(other, room));
      const cap = cfg.hire ? Math.floor(cfg.hire / 2) : 0;
      const hireMe = cfg.hire && S.hired[team] < cap;
      for (const s_ of cand) {
        const old = b[s_];
        const exact = fs.has(s_);
        let samples, wo;
        if (exact) { samples = ents.map(e => [e, e.n / tw]); wo = 1.0; }
        else { const K = 3; samples = []; for (let q = 0; q < K; q++) samples.push([wchoice(rng, ents, wts), 1.0 / K]); wo = 0.4; }
        let tot = 0.0;
        for (const [e, pw] of samples) {
          let c = e.c; const t = e.t; let gb = 0.0;
          if (c === NEUTRAL) { c = hireMe ? me : opp; gb = c === me ? bot.hireW : -bot.hireW; }
          b[s_] = [c, t, true];
          const th = bestThreat(S, opp);
          const ours = bestPrey(S, me);
          b[s_] = old;
          let hs = -th + wo * ours;
          hs += c === me ? 0.25 * VALUE[t] : -0.1 * VALUE[t];
          tot += pw * (hs + gb);
        }
        const sc = bot.U0 + uAdj + tot + rng.random() * bot.noise;
        if (sc > bestS) { bestS = sc; bestA = ['U', s_]; }
      }
    }
    return bestA;
  }

  // ---------------------------------------------------------------- one Command
  /* Applies a Command for `team` and updates every clock. Mirrors the body of play() in hsg_sim.py.
   * Returns { over, winner (team index | -1 truce), reason, events:[...] , ...detail }. */
  function applyAct(S, team, act) {
    const cfg = S.cfg, me = S.teamCol[team];
    const out = { over: false, events: [] };
    S.cmd++;
    const k = act[0];
    let quietReset = false;
    if (k === 'U') {
      const cell = S.board[act[1]];
      cell[2] = true; S.shrouds--; S.pool[pkey(cell[0], cell[1])]--;
      out.revealed = [cell[0], cell[1]];
      if (cell[0] === NEUTRAL) {
        let ht = team, capped = false;
        if (S.hired[ht] >= Math.floor(cfg.hire / 2)) { ht = 1 - ht; capped = true; }
        S.hired[ht]++;
        out.events.push({ t: 'hire', idx: act[1], by: ht, flipper: team, capped });
        if (S.teamCol[0] !== null) cell[0] = S.teamCol[ht]; else S.pending.push([cell, ht]);
      } else if (S.teamCol[0] === null) {
        S.teamCol[team] = cell[0]; S.teamCol[1 - team] = 1 - cell[0];
        out.events.push({ t: 'banners', team, col: cell[0] });
        for (const [pc, pt] of S.pending) pc[0] = S.teamCol[pt];
        S.pending = [];
      }
      quietReset = true;
    } else if (k === 'M' || k === 'C') {
      S.board[act[2]] = S.board[act[1]]; S.board[act[1]] = null;
    } else {
      const i = act[1], j = act[2], kind = act[3];
      const att = S.board[i][1], victim = S.board[j];
      out.attacker = att; out.victim = victim[1];
      if (victim[1] === 'Dm') S.dm[victim[0]]--;
      if (victim[1] === 'Sg') {
        out.over = true; out.winner = team; out.reason = 'shogun'; out.sgBy = att;
        out.sgExposed = exposed(S, victim[0]); out.fallen = victim[0];
        // the strike still happens on the board so the end screen can show it
        if (kind === 'v') S.board[j] = null; else { S.board[j] = S.board[i]; S.board[i] = null; }
        return out;
      }
      if (kind === 'v') S.board[j] = null; else { S.board[j] = S.board[i]; S.board[i] = null; }
      quietReset = true;
    }
    // Shogun's Shame: per-player stall clock (own Commands without own Unveil / capture)
    if (me !== null) {
      if (quietReset) S.stall[team] = 0;
      else {
        S.stall[team]++;
        if (cfg.forcedFight && S.stall[team] >= cfg.ffN) {
          S.stall[team] = 0;
          if (!(cfg.ffFacedownOnly && !shogunDown(S, me))) {
            S.fo[me] = true;
            let flipped = null;
            for (let p = 0; p < N; p++) {
              const pc = S.board[p];
              if (pc !== null && pc[0] === me && pc[1] === 'Sg' && !pc[2]) { pc[2] = true; S.shrouds--; S.pool[pkey(me, 'Sg')]--; flipped = p; }
            }
            out.events.push({ t: 'shame', team, flipped });
          }
        }
      }
    }
    // The Long Night
    if (quietReset) S.quiet = 0;
    else {
      S.quiet++;
      if (cfg.night && S.quiet >= cfg.night) {
        const a = countPieces(S, S.teamCol[0], cfg.nightFaceup), b = countPieces(S, S.teamCol[1], cfg.nightFaceup);
        out.over = true; out.nightCounts = [a, b];
        if (a === b) { out.winner = -1; out.reason = 'night_tie'; }
        else { out.winner = a > b ? 0 : 1; out.reason = 'night_count'; }
        out.events.push({ t: 'night' });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- a whole Battle (state + recorder)
  const FILES = 'ABCDE';
  const sq = i => FILES[i % W] + (Math.floor(i / W) + 1);
  const TYPE_NAME = { Sg: 'Shogun', Dm: 'Daimyo', Sm: 'Samurai', Kn: 'Kunoichi', On: 'Onmyoji', Gn: 'Gunner', Rn: 'Ronin', Gs: 'Geisha' };
  const COL_NAME = { 0: 'Ivory Moon', 1: 'Crimson Sun', 2: 'neutral' };

  function newBattle(cfg, rng) {
    const S = newState(cfg, rng);
    return { S, team: 0, over: null, moves: [], hires: [], shame: [null, null], shameFlipped: [false, false],
      shameCount: [0, 0], vanguardCol: null, unveils: 0, kills: 0 };
  }
  function battleLegal(B) {
    const S = B.S, me = S.teamCol[B.team];
    if (me === null) { const out = []; S.board.forEach((c, i) => { if (c !== null && !c[2]) out.push(['U', i]); }); return out; }
    return legal(S, me);
  }
  /* Call at the start of a turn. If the player to command has no legal Command they are Surrounded and lose. */
  function battleCheckSurrounded(B) {
    if (B.over) return true;
    if (battleLegal(B).length === 0) {
      B.over = { over: true, winner: 1 - B.team, reason: 'surrounded', events: [] };
      return true;
    }
    return false;
  }
  function describe(S, team, act, out) {
    const who = team === 0 ? 'V' : 'R';
    const k = act[0];
    if (k === 'U') return who + ' unveil ' + sq(act[1]) + ' = ' + (out.revealed[0] === NEUTRAL ? 'Geisha' : COL_NAME[out.revealed[0]].split(' ')[0] + ' ' + TYPE_NAME[out.revealed[1]]);
    return who + ' ' + ({ M: 'march', C: 'charge', S: 'strike' }[k]) + ' ' + sq(act[1]) + (k === 'S' ? (act[3] === 'v' ? ' volley ' : act[3] === 'k' ? ' vault ' : ' x ') : '-') + sq(act[2]) + (k === 'S' ? ' (' + TYPE_NAME[out.attacker] + ' > ' + TYPE_NAME[out.victim] + ')' : '');
  }
  /* Plays one Command in a Battle. Records data for the playtest log. */
  function battleStep(B, act) {
    const S = B.S, team = B.team;
    const pieceBefore = act[0] === 'U' ? null : S.board[act[1]][1];
    const out = applyAct(S, team, act);
    out.team = team; out.act = act; out.piece = pieceBefore;
    out.text = describe(S, team, act, out);
    B.moves.push(out.text);
    if (act[0] === 'U') B.unveils++;
    if (act[0] === 'S') B.kills++;
    for (const ev of out.events) {
      if (ev.t === 'banners') B.vanguardCol = S.teamCol[0];
      if (ev.t === 'hire') B.hires.push({ cmd: S.cmd, idx: ev.idx, flippedBy: ev.flipper, hiredBy: ev.by, joinedOpponent: ev.capped });
      if (ev.t === 'shame') { B.shameCount[ev.team]++; if (B.shame[ev.team] === null) B.shame[ev.team] = S.cmd; if (ev.flipped !== null) B.shameFlipped[ev.team] = true; }
    }
    if (out.over) B.over = out; else B.team = 1 - B.team;
    return out;
  }
  function piecesLeft(S) {
    const left = [{}, {}];
    for (const c of S.board) if (c !== null && (c[0] === 0 || c[0] === 1)) left[c[0]][c[1]] = (left[c[0]][c[1]] || 0) + 1;
    return left;
  }
  /* Headless Battle between two bot objects. Returns the Battle (B.over holds the result). */
  function playBattle(cfg, bots, rng) {
    const B = newBattle(cfg, rng);
    while (!B.over) {
      if (B.S.cmd >= cfg.maxCmd) { B.over = { over: true, winner: -1, reason: 'cap', events: [] }; break; }
      if (battleCheckSurrounded(B)) break;
      const act = choose(B.S, B.team, rng, bots[B.team]);
      if (act === null) { B.over = { over: true, winner: 1 - B.team, reason: 'surrounded', events: [] }; break; }
      battleStep(B, act);
    }
    return B;
  }

  const api = { W, H, N, NB, DIAG, RAYS, RANK, VALUE, THREAT, NEUTRAL, TYPE_NAME, COL_NAME, FILES, BOTS, BOT_LEVELS,
    idx, sq, makeCfg, makeRng, newState, exposed, canHit, pieceStrikes, genStrikes, genActions, legal, simApply, simUndo,
    choose, applyAct, newBattle, battleLegal, battleCheckSurrounded, battleStep, piecesLeft, playBattle, countPieces, shogunDown, defaultRoster };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HSG = api;
})(typeof window !== 'undefined' ? window : globalThis);
