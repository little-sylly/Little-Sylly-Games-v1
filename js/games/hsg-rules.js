// ═══════════════════════════════════════════════════════════════════════════
// hsg-rules.js — Hide and Shogun's rules engine + bots.
//
//   a board of 30 squares  →  a Command  →  a new board (or the Battle ends)
//
// Lifted from the idea folder's proto/engine.js (itself a port of sim/hsg_sim.py),
// brief v5 / tech spec docs/new-game-tech-hsg.md §1, §11, §15 S1, §17 #1 + #11.
//
// Everything here is pure: no DOM, no window, no game state, no clock. That is
// what lets the SAME file be replayed move for move against the Python
// reference (tools/verify-hsg-rules.js, HSG_PARITY=<parity.json>) and driven by
// the bots harness. It must NEVER read an hsg* game variable — hsg.js passes
// everything in. Exposed as the global `HsgRules` (and module.exports under Node).
//
// ── Vocabulary: v5 ids replace the prototype's v4 codes ─────────────────────
//   Piece   v5 id (this file)   v4 code (idea-folder engine)   Rank
//   Shogun  Sg                  Sg                              8
//   Guard   Gd                  Dm   (Daimyo)                   7
//   Monk    Mk                  On   (Onmyoji)                  6
//   Samurai Sm                  Sm                              5
//   Ninja   Nj                  Kn   (Kunoichi)                 4
//   Archer  Ar                  Gn   (Gunner)                   3
//   Farmer  Fm                  Rn   (Ronin)                    2
//   Fox     Fx                  Gs   (Geisha)                   —
//   Colours: 0 = Indigo Moon · 1 = Crimson Sun · 2 = a fox nobody has found yet.
//
// ── What was renamed, and what deliberately was not ─────────────────────────
//   RENAMED (everything hsg.js reads): piece ids; TYPE_NAME / COL_NAME; the
//     events 'banners' · 'fox' · 'lantern'; the result reasons 'shogun' ·
//     'lantern' · 'truce' · 'cornered' (+ 'cap' for the headless safety stop);
//     the Leap's action kind 'k' → 'l'; battleCheckSurrounded → battleCheckCornered.
//   KEPT (the wire the parity traces and the idea-folder engine speak):
//     the cfg keys (hire, night, nightFaceup, knHitsGs …), the state fields
//     (S.dm = Guards left per colour, closed ones included · S.hired = foxes
//     taken per team · S.shrouds = closed doors · S.pool = unseen counts ·
//     S.quiet · S.pending), and the action codes ['U'|'M'|'C'|'S', …].
//
// ── Shogun's Shame is GONE (owner, 11 Nov 2026; spec §17 #11) ───────────────
//   No forcedFight / ffN / ffFacedownOnly, no S.fo, no S.stall, no 'shame'
//   event. Guarded is simply "this colour still has a Guard" (S.dm[col] > 0).
//   The idea-folder engine keeps the Shame code for comparison runs only.
//
// Depends on: nothing at load.
// Read by: js/games/hsg.js (S2+), tools/verify-hsg-*.js.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // ── Board geometry ──────────────────────────────────────────────────────────
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

  // ── Pieces ──────────────────────────────────────────────────────────────────
  const IDS = ['Sg', 'Gd', 'Mk', 'Sm', 'Nj', 'Ar', 'Fm', 'Fx'];
  const RANK = { Sg: 8, Gd: 7, Mk: 6, Sm: 5, Nj: 4, Ar: 3, Fm: 2, Fx: 0 };
  const VALUE = { Sg: 100, Gd: 9, Sm: 7, Nj: 6, Mk: 5, Ar: 5, Fm: 2, Fx: 8 };   // bot appetite only
  const THREAT = Object.assign({}, VALUE, { Sg: 1000 });
  const CONTACT = ['Sg', 'Gd', 'Sm', 'Fm', 'Fx'];       // strike an orthogonal neighbour
  const CORE = { Sg: 1, Gd: 2, Sm: 2, Mk: 2, Nj: 1, Ar: 2 };   // Farmers fill the rest of the clan's 15
  const NEUTRAL = 2;                                    // the colour of a fox nobody has found

  function defaultRoster(hire) {
    const g = Math.max(1, Math.floor(hire / 2));        // foxes each clan can take
    const r = Object.assign({}, CORE);
    r.Fm = 5 - g;
    return r;
  }

  function makeCfg(over) {
    const cfg = Object.assign({
      hire: 4,                 // foxes behind the doors (2 = A Pair, 4 = A Skulk); each clan can take half
      night: 12,               // the Last Lantern: consecutive quiet Commands, both players; null = off (tests only)
      nightFaceup: true,       // the Last Lantern counts pieces in the open only
      onAll: true,             // the Monk strikes anything the Archer could
      knHitsExposed: true,
      knHitsGs: true,          // the Ninja's Leap takes anything but a Guarded Shogun, a fox included
      knAll: true,             // the Ninja ignores rank
      rnHitsGs: true,          // Farmers may strike a fox
      gnRanges: [2, 3],        // the Archer fires at distance 2 or 3
      maxCmd: 1500,            // headless safety stop only; a real Battle ends far sooner (spec §6)
    }, over || {});
    cfg.roster = defaultRoster(cfg.hire);
    return cfg;
  }

  // ── RNG ─────────────────────────────────────────────────────────────────────
  // mulberry32. Unseeded it takes a fresh seed — the host's layout shuffle uses
  // that, and the seed never leaves the host.
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

  // ── State ───────────────────────────────────────────────────────────────────
  // A board is a flat 30-array. A cell is null (empty) or [colour, id, faceUp]; faceUp false = a closed door.
  // Teams are numbered by turn order WITHIN a Battle (team 0 moves first); S.teamCol[team] = that team's
  // clan colour once the banners are raised (null before). The game maps seat <-> team (spec §4).
  const pkey = (col, t) => col + '|' + t;
  function newState(cfg, rng) {
    const cells = [];
    for (const col of [0, 1]) for (const t of Object.keys(cfg.roster)) for (let k = 0; k < cfg.roster[t]; k++) cells.push([col, t, false]);
    for (let k = 0; k < cfg.hire; k++) cells.push([NEUTRAL, 'Fx', false]);
    rng.shuffle(cells);
    const S = { board: cells, teamCol: [null, null], dm: [cfg.roster.Gd, cfg.roster.Gd], quiet: 0, pool: {}, cmd: 0, cfg,
      shrouds: cells.length, hired: [0, 0], pending: [] };
    for (const col of [0, 1]) for (const t of Object.keys(cfg.roster)) S.pool[pkey(col, t)] = cfg.roster[t];
    if (cfg.hire) S.pool[pkey(NEUTRAL, 'Fx')] = cfg.hire;
    return S;
  }

  // Guarded = this colour still has a Guard, closed ones included. Exposed is the opposite.
  function exposed(S, col) {
    return col <= 1 && S.dm[col] === 0;
  }

  function canHit(cfg, att, tgt, exp) {
    if (tgt === 'Fx') return (att === 'Nj' && cfg.knHitsGs) || (att === 'Fm' && cfg.rnHitsGs);
    if (tgt === 'Sg') {
      if (att === 'Fx') return true;
      if (att === 'Nj' && !cfg.knHitsExposed) return false;
      return exp;
    }
    if (att === 'Fx') return false;
    if (att === 'Ar') return true;
    if (att === 'Nj') return cfg.knAll ? true : RANK[tgt] < 4;
    if (att === 'Mk' && cfg.onAll) return true;
    if (att === 'Fm') return tgt === 'Fm' || tgt === 'Ar';
    return RANK[att] >= RANK[tgt];
  }

  // Strikes from square i: [[target, kind], …]. kind: 'x' up close (or the Monk's diagonal),
  // 'v' Volley (the Archer stays put), 'l' Leap (the Ninja over exactly one piece).
  // Only face-up pieces are ever read as targets — a closed door is never looked inside.
  function pieceStrikes(S, i, cell) {
    const col = cell[0], t = cell[1], b = S.board, cfg = S.cfg, out = [];
    if (CONTACT.includes(t) || t === 'Mk') {
      for (const j of (t === 'Mk' ? DIAG[i] : NB[i])) {
        const tc = b[j];
        if (tc !== null && tc[2] && tc[0] !== col && canHit(cfg, t, tc[1], exposed(S, tc[0]))) out.push([j, 'x']);
      }
    } else if (t === 'Ar') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (const rg of cfg.gnRanges) {
          if (ray.length < rg) continue;
          const tc = b[ray[rg - 1]];
          if (tc === null || !tc[2] || tc[0] === col || !canHit(cfg, t, tc[1], exposed(S, tc[0]))) continue;
          out.push([ray[rg - 1], 'v']);
        }
      }
    } else if (t === 'Nj') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d], n = ray.length;
        let k = 0;
        while (k < n && b[ray[k]] === null) k++;
        if (k >= n) continue;
        let m = k + 1;
        while (m < n && b[ray[m]] === null) m++;
        if (m >= n) continue;
        const tc = b[ray[m]];
        if (tc[2] && tc[0] !== col && canHit(cfg, t, tc[1], exposed(S, tc[0]))) out.push([ray[m], 'l']);
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

  // Every Command `col` could make: ['U', i] Open · ['M', i, j] March · ['C', i, j] Charge · ['S', i, j, kind] Strike.
  // A closed door only ever offers an Open — the legality code never looks inside one.
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

  // ── Search helpers (apply / undo a Command on the board only) ───────────────
  function simApply(S, act) {
    const k = act[0], b = S.board, i = act[1], j = act[2];
    if (k === 'M' || k === 'C') {
      const u = [i, j, b[i], b[j], null];
      b[j] = b[i]; b[i] = null;
      return u;
    }
    const victim = b[j];
    const gdcol = victim[1] === 'Gd' ? victim[0] : null;
    const u = [i, j, b[i], victim, gdcol];
    if (gdcol !== null) S.dm[gdcol]--;
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

  // ── Bots ────────────────────────────────────────────────────────────────────
  // The suite has three levels (spec §11): Easy = easy, Medium = cautious, Hard = search3.
  // The prototype's aggro / hunt / fish / flip / stall / search2 / random are not shipped.
  function Bot(name, o) {
    return Object.assign({ name, rand: false, takeSg: false, U0: 0.4, approach: 0.25, threatW: 0.3, noise: 0.15, search: 0, clock: true,
      fish: false, fishMove: 0.4, hireW: 1.5, gainW: 1.0 }, o || {});
  }
  const BOTS = {
    easy: Bot('easy', { rand: true, takeSg: true }),
    cautious: Bot('cautious', { U0: 0.2, approach: 0.1 }),
    search3: Bot('search3', { U0: 0.6, approach: 0.4, fish: true, gainW: 1.8, search: 3 }),
  };
  // Suite difficulty (MP_BOT_DIFFICULTIES) -> bot
  const BOT_LEVELS = { easy: 'easy', medium: 'cautious', hard: 'search3' };

  const man = (a, b) => Math.abs(a % W - b % W) + Math.abs(Math.floor(a / W) - Math.floor(b / W));

  function approachBonus(S, i, j, t, me, w) {
    const b = S.board;
    let bestOld = null, bestNew = null;
    for (let p = 0; p < N; p++) {
      const cell = b[p];
      if (cell === null || !cell[2] || cell[0] === me) continue;
      const ex = (cell[1] === 'Sg' && t !== 'Fx') ? true : exposed(S, cell[0]);
      if (!canHit(S.cfg, t, cell[1], ex)) { if (!(t === 'Fx' && cell[1] === 'Sg')) continue; }
      let dOld, dNew;
      if (t === 'Ar') { dOld = Math.min(...S.cfg.gnRanges.map(r => Math.abs(man(i, p) - r))); dNew = Math.min(...S.cfg.gnRanges.map(r => Math.abs(man(j, p) - r))); }
      else { dOld = man(i, p); dNew = man(j, p); }
      if (bestOld === null || dOld < bestOld) bestOld = dOld;
      if (bestNew === null || dNew < bestNew) bestNew = dNew;
    }
    if (bestOld === null) return 0.0;
    const mult = t === 'Fx' ? 3.0 : ((t === 'Sg' || t === 'Gd') ? 0.3 : 1.0);
    return w * mult * (bestOld - bestNew);
  }

  function countPieces(S, col, upOnly) {
    let n = 0;
    for (const c of S.board) if (c !== null && c[0] === col && (c[2] || !upOnly)) n++;
    return n;
  }

  // Reads every cell's contents: it only ever runs once no door is left closed (S.shrouds === 0).
  function evaluate(S, col) {
    const b = S.board; let sc = 0.0;
    const sg = [null, null], fx = [[], []];
    for (let i = 0; i < N; i++) {
      const c = b[i];
      if (c === null) continue;
      const v = c[1] !== 'Sg' ? VALUE[c[1]] : 0;
      sc += c[0] === col ? v : -v;
      if (c[1] === 'Sg') sg[c[0]] = i;
      else if (c[1] === 'Fx' && (c[0] === 0 || c[0] === 1)) fx[c[0]].push(i);
    }
    const opp = 1 - col;
    for (const g of fx[col]) if (sg[opp] !== null) sc += 1.5 - 0.4 * man(g, sg[opp]);
    for (const g of fx[opp]) if (sg[col] !== null) sc -= 1.5 - 0.4 * man(g, sg[col]);
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

  // Closed doors this bot's Archers / Monks could expose by opening them (the "fishing" squares).
  function fishSlots(S, me) {
    const b = S.board, out = new Set();
    for (let i = 0; i < N; i++) {
      const c = b[i];
      if (c === null || !c[2] || c[0] !== me) continue;
      if (c[1] === 'Ar') {
        for (let d = 0; d < 4; d++) {
          const ray = RAYS[i][d];
          for (const rg of S.cfg.gnRanges) if (ray.length >= rg) { const t = b[ray[rg - 1]]; if (t !== null && !t[2]) out.add(ray[rg - 1]); }
        }
      } else if (c[1] === 'Mk') {
        for (const j of DIAG[i]) { const t = b[j]; if (t !== null && !t[2]) out.add(j); }
      }
    }
    return out;
  }
  function shroudReach(S, i, t) {
    const b = S.board; let n = 0;
    if (t === 'Ar') {
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (const rg of S.cfg.gnRanges) if (ray.length >= rg) { const c = b[ray[rg - 1]]; if (c !== null && !c[2]) n++; }
      }
    } else {
      for (const j of DIAG[i]) { const c = b[j]; if (c !== null && !c[2]) n++; }
    }
    return n;
  }

  // The bot's Command for `team`. Reads S.pool (unseen counts) to weigh an Open — never a door's contents.
  function choose(S, team, rng, bot) {
    const me = S.teamCol[team], cfg = S.cfg, b = S.board;
    if (me === null) {                                  // before the banners the only Command is an Open
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
      if (cfg.night && S.quiet >= cfg.night - 8) {      // the lanterns are running low
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
        if (bot.fish && (t === 'Ar' || t === 'Mk')) sc += bot.fishMove * (shroudReach(S, a[2], t) - shroudReach(S, a[1], t));
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

  // ── One Command ─────────────────────────────────────────────────────────────
  /* Applies a Command for `team` and updates every clock. Mirrors the body of play() in hsg_sim.py.
   * Returns { over, winner (team index | -1 Truce), reason, events, … }:
   *   reason 'shogun'   → winner struck the Shogun; sgBy (piece id), sgExposed, fallen (the Shogun's colour)
   *   reason 'lantern'  → 12 quiet Commands, the counts differ; counts = [team 0, team 1] pieces in the open
   *   reason 'truce'    → 12 quiet Commands, the counts are equal; winner -1
   * events: { t:'banners', team, col } · { t:'fox', idx, by, flipper, capped } · { t:'lantern' }.
   * Cornered is not decided here — battleCheckCornered() asks it at the start of a turn. */
  function applyAct(S, team, act) {
    const cfg = S.cfg;
    const out = { over: false, events: [] };
    S.cmd++;
    const k = act[0];
    let quietReset = false;
    if (k === 'U') {
      const cell = S.board[act[1]];
      cell[2] = true; S.shrouds--; S.pool[pkey(cell[0], cell[1])]--;
      out.revealed = [cell[0], cell[1]];
      if (cell[0] === NEUTRAL) {
        // a fox sides with whoever finds her, up to half of them each; the rest join the other clan
        let ht = team, capped = false;
        if (S.hired[ht] >= Math.floor(cfg.hire / 2)) { ht = 1 - ht; capped = true; }
        S.hired[ht]++;
        out.events.push({ t: 'fox', idx: act[1], by: ht, flipper: team, capped });
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
      if (victim[1] === 'Gd') S.dm[victim[0]]--;
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
    // The Last Lantern: any Open or Strike (either player) relights it; a March or Charge lets it burn down
    if (quietReset) S.quiet = 0;
    else {
      S.quiet++;
      if (cfg.night && S.quiet >= cfg.night) {
        const a = countPieces(S, S.teamCol[0], cfg.nightFaceup), b = countPieces(S, S.teamCol[1], cfg.nightFaceup);
        out.over = true; out.counts = [a, b];
        if (a === b) { out.winner = -1; out.reason = 'truce'; }
        else { out.winner = a > b ? 0 : 1; out.reason = 'lantern'; }
        out.events.push({ t: 'lantern' });
      }
    }
    return out;
  }

  // ── A whole Battle (state + a small recorder) ───────────────────────────────
  const FILES = 'ABCDE';
  const sq = i => FILES[i % W] + (Math.floor(i / W) + 1);
  const TYPE_NAME = { Sg: 'Shogun', Gd: 'Guard', Mk: 'Monk', Sm: 'Samurai', Nj: 'Ninja', Ar: 'Archer', Fm: 'Farmer', Fx: 'Fox' };
  const COL_NAME = { 0: 'Indigo Moon', 1: 'Crimson Sun', 2: 'unclaimed' };

  function newBattle(cfg, rng) {
    const S = newState(cfg, rng);
    return { S, team: 0, over: null, moves: [], foxLog: [], opens: 0, strikes: 0 };
  }
  function battleLegal(B) {
    const S = B.S, me = S.teamCol[B.team];
    if (me === null) { const out = []; S.board.forEach((c, i) => { if (c !== null && !c[2]) out.push(['U', i]); }); return out; }
    return legal(S, me);
  }
  /* Call at the start of a turn. If the player to command has no legal Command they are Cornered and lose. */
  function battleCheckCornered(B) {
    if (B.over) return true;
    if (battleLegal(B).length === 0) {
      B.over = { over: true, winner: 1 - B.team, reason: 'cornered', events: [] };
      return true;
    }
    return false;
  }
  function describe(S, team, act, out) {
    const who = team === 0 ? '1st' : '2nd';
    const k = act[0];
    if (k === 'U') return who + ' open ' + sq(act[1]) + ' = ' + (out.revealed[0] === NEUTRAL ? 'Fox' : COL_NAME[out.revealed[0]].split(' ')[0] + ' ' + TYPE_NAME[out.revealed[1]]);
    return who + ' ' + ({ M: 'march', C: 'charge', S: 'strike' }[k]) + ' ' + sq(act[1]) + (k === 'S' ? (act[3] === 'v' ? ' volley ' : act[3] === 'l' ? ' leap ' : ' x ') : '-') + sq(act[2]) + (k === 'S' ? ' (' + TYPE_NAME[out.attacker] + ' > ' + TYPE_NAME[out.victim] + ')' : '');
  }
  /* Plays one Command in a Battle and records it (B.moves is a readable log for harness failures). */
  function battleStep(B, act) {
    const S = B.S, team = B.team;
    const pieceBefore = act[0] === 'U' ? null : S.board[act[1]][1];
    const out = applyAct(S, team, act);
    out.team = team; out.act = act; out.piece = pieceBefore;
    out.text = describe(S, team, act, out);
    B.moves.push(out.text);
    if (act[0] === 'U') B.opens++;
    if (act[0] === 'S') B.strikes++;
    for (const ev of out.events) {
      if (ev.t === 'fox') B.foxLog.push({ cmd: S.cmd, idx: ev.idx, flippedBy: ev.flipper, foundBy: ev.by, joinedOpponent: ev.capped });
    }
    if (out.over) B.over = out; else B.team = 1 - B.team;
    return out;
  }
  function piecesLeft(S) {
    const left = [{}, {}];
    for (const c of S.board) if (c !== null && (c[0] === 0 || c[0] === 1)) left[c[0]][c[1]] = (left[c[0]][c[1]] || 0) + 1;
    return left;
  }
  /* Headless Battle between two bot objects (BOTS.x). Returns the Battle (B.over holds the result). */
  function playBattle(cfg, bots, rng) {
    const B = newBattle(cfg, rng);
    while (!B.over) {
      if (B.S.cmd >= cfg.maxCmd) { B.over = { over: true, winner: -1, reason: 'cap', events: [] }; break; }
      if (battleCheckCornered(B)) break;
      const act = choose(B.S, B.team, rng, bots[B.team]);
      if (act === null) { B.over = { over: true, winner: 1 - B.team, reason: 'cornered', events: [] }; break; }
      battleStep(B, act);
    }
    return B;
  }

  const api = { W, H, N, NB, DIAG, RAYS, IDS, RANK, VALUE, THREAT, NEUTRAL, TYPE_NAME, COL_NAME, FILES, BOTS, BOT_LEVELS,
    idx, sq, makeCfg, makeRng, newState, exposed, canHit, pieceStrikes, genStrikes, genActions, legal, simApply, simUndo,
    choose, applyAct, newBattle, battleLegal, battleCheckCornered, battleStep, piecesLeft, playBattle, countPieces, defaultRoster };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HsgRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
