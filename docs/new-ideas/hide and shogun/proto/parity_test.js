// Compares the JS engine with traces exported from the Python reference engine (tools/export_parity.py).
const H = require('./engine.js');
const data = JSON.parse(require('fs').readFileSync(process.argv[2] || '../parity.json', 'utf8'));
function build(snapshot, cfgd) {
  const cfg = H.makeCfg({ hire: cfgd.hire, night: cfgd.night, forcedFight: cfgd.forcedFight, ffN: cfgd.ffN, knHitsGs: cfgd.knHitsGs });
  const S = H.newState(cfg, H.makeRng(1));
  S.board = snapshot.board.map(c => c === null ? null : [c[0], c[1], c[2]]);
  S.teamCol = snapshot.teamCol.slice(); S.dm = snapshot.dm.slice(); S.fo = snapshot.fo.slice(); S.stall = snapshot.stall.slice();
  S.hired = snapshot.hired.slice(); S.quiet = snapshot.quiet; S.shrouds = snapshot.shrouds; S.cmd = snapshot.cmd;
  S.pending = snapshot.pending.map(([i, t]) => [S.board[i], t]);
  return S;
}
const key = a => JSON.stringify(a);
const sortActs = a => a.map(x => x.slice()).sort((p, q) => key(p) < key(q) ? -1 : 1);
function compareState(S, snapshot, where) {
  const got = { board: S.board.map(c => c === null ? null : [c[0], c[1], c[2]]), teamCol: S.teamCol, dm: S.dm, fo: S.fo, stall: S.stall, hired: S.hired, quiet: S.quiet, shrouds: S.shrouds, cmd: S.cmd,
    pending: S.pending.map(([pc, t]) => [S.board.indexOf(pc), t]) };
  for (const f of Object.keys(got)) if (key(got[f]) !== key(snapshot[f])) throw new Error('state mismatch in ' + f + ' at ' + where + '\n js: ' + key(got[f]) + '\n py: ' + key(snapshot[f]));
}
let nlegal = 0, ntrans = 0, ngames = 0, nends = 0;
// Python lists actions in a different order and sorts with Python tuples; compare as sets of canonical strings
const canon = a => a.map(x => x.join(',')).sort();
data.forEach((g, gi) => {
  ngames++;
  g.records.forEach((r, ri) => {
    const where = 'game ' + gi + ' cmd ' + ri;
    const S = build(r.before, g.cfg);
    for (const col of [0, 1]) {
      const js = canon(H.genActions(S, col)), py = canon(r.legal[col]);
      if (key(js) !== key(py)) throw new Error('legal list mismatch col ' + col + ' at ' + where + '\n js-py: ' + js.filter(x => !py.includes(x)) + '\n py-js: ' + py.filter(x => !js.includes(x)));
      nlegal++;
      if (H.exposed(S, col) !== r.exposed[col]) throw new Error('exposed mismatch at ' + where);
    }
    if (r.act === null) { nends++; return; }
    const out = H.applyAct(S, r.team, r.act);
    const next = g.records[ri + 1];
    if (next) { compareState(S, next.before, where); if (out.over) throw new Error('JS ended the Battle early at ' + where + ' ' + out.reason); ntrans++; }
    else {
      // last Command of the Battle: compare the result
      if (!out.over) throw new Error('JS did not end the Battle at ' + where);
      const res = g.result;
      if (out.winner !== res.winner || out.reason !== res.reason) throw new Error('result mismatch at ' + where + ' js ' + out.winner + '/' + out.reason + ' py ' + res.winner + '/' + res.reason);
      if (res.reason.startsWith('night') && key(out.nightCounts) !== key(res.nightCounts)) throw new Error('night counts mismatch');
      if (S.cmd !== res.cmds) throw new Error('command count mismatch');
      nends++; ntrans++;
    }
  });
});
console.log('PARITY OK:', ngames, 'games,', nlegal, 'legal-list comparisons,', ntrans, 'transitions,', nends, 'endings');
