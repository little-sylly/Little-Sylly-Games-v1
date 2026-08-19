// ═══════════════════════════════════════════════════════════════════════════
// nt-slow-fit.js — slow-model fitting instrument for Net-Trace.
//
// Asserts nothing and always exits 0. It is the slow-model counterpart to
// nt-path-probe.js: that one settled MOVEMENT (tile time + corner cost) against
// maze.game, this one exists to settle what an ice block actually does.
//
// It never re-implements ntComputeTimeline. It rewrites the NT_HONEYPOT_*
// constants in a COPY of nt.js's source and runs the game's own timeline against
// them, so a fit can never drift from the shipped model — if the fit says a
// parameter set scores X, editing nt.js to those values scores X.
//
//   node tools/nt-slow-fit.js                        (every board as shipped)
//   node tools/nt-slow-fit.js --radius 6 --cooldown 0
//   node tools/nt-slow-fit.js --sweep radius         (1-D scan, all boards at once)
//   node tools/nt-slow-fit.js --grid                 (4-D search for the best joint fit)
//   node tools/nt-slow-fit.js --contact              (first-AoE-contact arclength vs radius)
//
// Boards come from maze-puzzles/boards/*.json; a board is "slow" if it carries a
// `slows` array. Its maze.game score is the leading number in the filename.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const BOARDDIR = path.join(ROOT, 'maze-puzzles/boards');
const NT_SRC   = fs.readFileSync(process.env.NT_SRC || path.join(ROOT, 'js/games/nt.js'), 'utf8');

// ── Constant substitution ──────────────────────────────────────────────────────
// Rewriting the DECLARATION (rather than assigning after load) is what keeps the
// substitution honest: these are `const`, so everything in nt.js that closes over
// them sees the new value exactly as a real source edit would.
const CONSTS = {
  radius:   'NT_HONEYPOT_RADIUS',
  slow:     'NT_HONEYPOT_SLOW',
  duration: 'NT_HONEYPOT_DURATION',
  cooldown: 'NT_HONEYPOT_COOLDOWN',
  turn:     'NT_TURN_COST',
  tile:     'NT_BASE_TILE_TIME',
};

const noop = () => {};
const el = () => ({
  style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, appendChild: noop, querySelector: () => null,
  querySelectorAll: () => [], getContext: () => null, children: [],
  textContent: '', innerHTML: '', dataset: {},
});

const sandboxCache = new Map();

function buildSandbox(overrides) {
  const key = JSON.stringify(overrides);
  if (sandboxCache.has(key)) return sandboxCache.get(key);

  let src = NT_SRC;
  for (const [flag, name] of Object.entries(CONSTS)) {
    if (overrides[flag] == null) continue;
    const re = new RegExp('const ' + name + '(\\s*)=([^;]*);');
    if (!re.test(src)) throw new Error('constant not found: ' + name);
    src = src.replace(re, 'const ' + name + '$1= ' + overrides[flag] + ';');
  }
  // RADIUS_SQ is a precomputed companion of RADIUS. Leaving it stale would make every
  // radius override a silent no-op — the one bug that would let this whole tool lie.
  if (overrides.radius != null) {
    src = src.replace(/const NT_HONEYPOT_RADIUS_SQ(\s*)=([^;]*);/,
                      'const NT_HONEYPOT_RADIUS_SQ$1= ' + (overrides.radius * overrides.radius) + ';');
  }

  const sandbox = {
    console: { log: noop, warn: noop, error: noop },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
                createElement: el, body: el(), addEventListener: noop },
    window: { syllyMultiplayerMode: 'single', syllyDeviceUid: 'fit', syllySyncLocked: false },
    performance: { now: () => Date.now() },
    shuffle: a => [...a], formatTime: s => String(s), showScreen: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    playLaunch: noop, playWhoosh: noop, playDone: noop, playTick: noop, playBoing: noop,
    playAlarm: noop, playSuccess: noop, playExit: noop, playPillClick: noop,
    playSyllyOn: noop, playSyllyOff: noop, playSonarPing: noop, playHullThud: noop,
    mpLockSync: noop, mpUnlockSync: noop, mpShowModeScreen: noop, mpReturnToLobby: noop,
    mpSendPrivate: noop, mpPlayerSlots: [], mpMyPlayerIdx: 0, resetToLobby: noop,
    Math,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'nt.js (fit)' });
  vm.runInContext('globalThis.__fit = {' +
    '  shortestPath: (n, pl) => ntShortestPath(n, pl),' +
    '  timeline: (poly, hp) => ntComputeTimeline(poly, hp),' +
    '  centres: (n, pl) => ntHoneypotCentres(n, pl),' +
    '  consts: () => ({ radius: NT_HONEYPOT_RADIUS, slow: NT_HONEYPOT_SLOW,' +
    '                   duration: NT_HONEYPOT_DURATION, cooldown: NT_HONEYPOT_COOLDOWN,' +
    '                   turn: NT_TURN_COST, tile: NT_BASE_TILE_TIME }),' +
    '};', sandbox);
  sandboxCache.set(key, sandbox.__fit);
  return sandbox.__fit;
}

// ── Boards ─────────────────────────────────────────────────────────────────────
// A slowing block is an obstacle FIRST and a slow second, so it is listed in
// `blocks` as well as `slows` — subtract it out rather than declaring it twice.
function toNode(board) {
  const slows = board.slows || [];
  const isSlow = (ax, ay) => slows.some(([sx, sy]) => sx === ax && sy === ay);
  return {
    w: board.w, h: board.h, ingress: board.ingress, egress: board.egress,
    badSectors: (board.blocks || []).filter(([ax, ay]) => !isSlow(ax, ay)).map(([ax, ay]) => ({ ax, ay })),
    nativeHoneypots: slows.map(([ax, ay]) => ({ ax, ay })),
  };
}

function loadBoards() {
  return fs.readdirSync(BOARDDIR).filter(f => f.endsWith('.json')).map(f => {
    const board = JSON.parse(fs.readFileSync(path.join(BOARDDIR, f), 'utf8'));
    const m = /^(\d+)/.exec(f);
    // A "-empty" board is the UNSOLVED puzzle from the same screenshot; the number in
    // its filename is the score of the SOLVED board beside it, so it has no target of
    // its own. Scoring it against that number compares two different mazes.
    const isEmpty = /-empty$/.test(path.basename(f, '.json'));
    return { name: path.basename(f, '.json'), board, target: (m && !isEmpty) ? Number(m[1]) : null,
             hits: board.hits || null,
             slow: (board.slows || []).length > 0 };
  });
}

function score(F, entry) {
  const node = toNode(entry.board);
  const poly = F.shortestPath(node, []);
  if (!poly) return null;
  const centres = F.centres(node, []);
  const tl = F.timeline(poly, centres);
  // Per-honeypot, not just a total: 48154's reference reads "2+1", and a model that
  // fired 3 times at one block and 0 at the other would match the total while being
  // obviously wrong. Fires carry their honeypot's coordinates, so bucket on those.
  const perHp = centres.map(c => tl.fires.filter(f => f.x === c.x && f.y === c.y).length);
  return { latency: tl.latencyMs, fires: tl.fires.length, perHp,
           at: tl.fires.map(f => Math.round(f.atMs)),
           slowMs: tl.slowSpans.reduce((a, [s0, s1]) => a + (s1 - s0), 0) };
}

// Journey time with the slow switched OFF entirely — the movement-only baseline.
// Every slow model is a claim about how much of THIS number gets stretched, so
// printing it beside the target turns a fit into arithmetic that can be checked
// by hand rather than taken on trust.
const baseCache = new Map();
// Does this parameter set reproduce the board's recorded trigger count? Compared as a
// SORTED multiset: nothing guarantees NT lists a board's honeypots in the same order
// the screenshot's "1+2+1" was read off, and the ordering is not what is being tested.
function hitsMatch(entry, s) {
  if (!entry.hits || !s) return null;
  const a = entry.hits.slice().sort((x, y) => x - y).join(',');
  const b = s.perHp.slice().sort((x, y) => x - y).join(',');
  return a === b;
}

function baseline(entry) {
  if (!baseCache.has(entry.name)) {
    const s = score(buildSandbox({ duration: 0, cooldown: 1e12 }), entry);
    baseCache.set(entry.name, s ? s.latency : null);
  }
  return baseCache.get(entry.name);
}

// ── CLI ────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const num = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? Number(argv[i + 1]) : dflt; };
const overrides = {};
for (const k of Object.keys(CONSTS)) { const v = num('--' + k, null); if (v != null) overrides[k] = v; }

const boards = loadBoards();
const slowBoards  = boards.filter(b => b.slow && b.target != null);
const plainBoards = boards.filter(b => !b.slow && b.target != null);

function reportAll(F, label) {
  const c = F.consts();
  console.log('\n── ' + label);
  console.log('   radius ' + c.radius.toFixed(3) + '  slow x' + c.slow + '  duration ' + c.duration +
              '  cooldown ' + c.cooldown + '  turn ' + c.turn + '  tile ' + c.tile);
  console.log('   ' + 'board'.padEnd(16) + 'target'.padStart(8) + 'NT'.padStart(8) + 'gap'.padStart(9) +
              'err'.padStart(8) + 'base'.padStart(8) + 'slowed'.padStart(8) + 'fires'.padStart(8) + '  maze hits');
  let worst = 0;
  for (const b of [...plainBoards, ...slowBoards]) {
    const s = score(F, b);
    if (!s) { console.log('   ' + b.name.padEnd(16) + '  NO ROUTE'); continue; }
    const gap = s.latency - b.target, err = 100 * gap / b.target;
    worst = Math.max(worst, Math.abs(err));
    const hm = hitsMatch(b, s);
    console.log('   ' + b.name.padEnd(16) + String(b.target).padStart(8) + String(s.latency).padStart(8) +
                ((gap >= 0 ? '+' : '') + gap).padStart(9) + (err.toFixed(2) + '%').padStart(8) +
                String(baseline(b)).padStart(8) + String(Math.round(s.slowMs)).padStart(8) +
                (s.slow ? '' : '') + (b.slow ? s.perHp.join('+') : '-').padStart(8) +
                '  ' + (b.hits ? b.hits.join('+') + (hm ? '  MATCH' : '  ← MISMATCH') : ''));
  }
  const scored   = [...plainBoards, ...slowBoards].filter(b => b.hits);
  const matching = scored.filter(b => hitsMatch(b, score(F, b)));
  console.log('   worst |err| ' + worst.toFixed(2) + '% ' +
              ' · trigger counts reproduced ' + matching.length + '/' + scored.length +
              (matching.length === scored.length ? '  (the hard constraint holds)' : '  ← a MISMATCH invalidates the fit'));
  return worst;
}

if (argv.includes('--contact')) {
  // How much of the journey is already run before the route first touches the AoE?
  // A slow that persists to the end has to start at exactly (2 − target/base), since
  // every millisecond after contact is doubled. If NO radius puts first contact
  // there, then "the AoE is bigger" cannot be the explanation, whatever else is.
  console.log('\nFIRST AoE CONTACT vs RADIUS — fraction of the unslowed journey already run');
  console.log('  A slow-to-the-end model needs contact at `need`:  target = base x (2 - contact).');
  const radii = [3, 3 * Math.SQRT2, 5, 6, 7, 8, 10, 12];
  console.log('\n  ' + 'board'.padEnd(14) + 'base'.padStart(8) + 'target'.padStart(8) + 'need'.padStart(7) +
              radii.map(r => ('r=' + r.toFixed(1)).padStart(8)).join(''));
  for (const b of slowBoards) {
    const base = baseline(b);
    const need = 2 - b.target / base;
    const cells = radii.map(r => {
      // Unbounded duration means the first fire IS first contact, and the clock runs
      // unslowed right up to it — so its timestamp is directly comparable to `base`.
      const s = score(buildSandbox({ radius: r, duration: 1e9, cooldown: 1e12 }), b);
      return s && s.fires ? (s.at[0] / base).toFixed(3).padStart(8) : '       -';
    });
    console.log('  ' + b.name.padEnd(14) + String(base).padStart(8) + String(b.target).padStart(8) +
                need.toFixed(3).padStart(7) + cells.join(''));
  }
  console.log('');
} else if (argv.includes('--grid')) {
  const radii = [3 * Math.SQRT2, 5, 6, 7, 8];
  const slows = [0.5, 0.45, 0.4];
  const durs  = [20000, 27500, 35000, 50000, 1e9];
  const cools = [0, 5000, 15000, 25000, 35000];
  const rows = [];
  for (const r of radii) for (const sl of slows) for (const d of durs) for (const cd of cools) {
    const F = buildSandbox({ radius: r, slow: sl, duration: d, cooldown: cd });
    let worst = 0, ok = true;
    const errs = [];
    for (const b of slowBoards) {
      const s = score(F, b);
      if (!s) { ok = false; break; }
      const e = 100 * (s.latency - b.target) / b.target;
      errs.push(e); worst = Math.max(worst, Math.abs(e));
    }
    if (ok) rows.push({ r, sl, d, cd, worst, errs });
  }
  rows.sort((a, b) => a.worst - b.worst);
  console.log('\nJOINT FIT — ranked by worst per-board error across the slow boards');
  console.log('  ' + 'radius'.padStart(7) + 'slow'.padStart(6) + 'duration'.padStart(10) +
              'cooldown'.padStart(10) + 'worst'.padStart(8) + '   per-board err%');
  rows.slice(0, 20).forEach(x => console.log('  ' + x.r.toFixed(2).padStart(7) + String(x.sl).padStart(6) +
    String(x.d).padStart(10) + String(x.cd).padStart(10) + (x.worst.toFixed(2) + '%').padStart(8) +
    '   ' + x.errs.map(e => e.toFixed(1)).join(', ')));
  console.log('\n  boards: ' + slowBoards.map(b => b.name).join(', ') + '\n');
} else if (argv.includes('--sweep')) {
  const which = argv[argv.indexOf('--sweep') + 1] || 'radius';
  const values = { radius:   [3, 3.5, 4, 4.243, 5, 6, 7, 8, 10],
                   slow:     [0.6, 0.55, 0.5, 0.45, 0.4, 0.35],
                   duration: [10000, 20000, 27500, 35000, 45000, 60000, 1e9],
                   cooldown: [0, 5000, 10000, 17500, 25000, 35000, 50000] }[which];
  if (!values) { console.log('unknown sweep axis: ' + which); process.exit(0); }
  console.log('\nSWEEP ' + which + '  (everything else as shipped, plus any --flag overrides)');
  console.log('  ' + which.padStart(10) + slowBoards.map(b => (b.name + ' err%').padStart(22)).join(''));
  for (const v of values) {
    const F = buildSandbox({ ...overrides, [which]: v });
    const cells = slowBoards.map(b => {
      const s = score(F, b);
      if (!s) return '            NO ROUTE'.padStart(22);
      const e = 100 * (s.latency - b.target) / b.target;
      return (e.toFixed(1) + '% (' + s.fires + 'f)').padStart(22);
    });
    console.log('  ' + String(v).padStart(10) + cells.join(''));
  }
  console.log('');
} else {
  reportAll(buildSandbox(overrides), Object.keys(overrides).length ? 'OVERRIDDEN' : 'AS SHIPPED');
  console.log('');
}
