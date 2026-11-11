// Bot-vs-bot batches for comparing with the Python numbers.  node batch_test.js [games]
const H = require('./engine.js');
const games = +process.argv[2] || 500;
function batch(name, over, a, b) {
  const rng = H.makeRng(12345); const cfg = H.makeCfg(over);
  const c = {}; const cmds = []; let geisha = 0, sg = 0, shame = 0, seat0 = 0, t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const B = H.playBattle(cfg, [H.BOTS[a], H.BOTS[b || a]], rng);
    c[B.over.reason] = (c[B.over.reason] || 0) + 1; cmds.push(B.S.cmd);
    if (B.over.reason === 'shogun') { sg++; if (B.over.sgBy === 'Gs') geisha++; }
    if (B.shameCount[0] + B.shameCount[1] > 0) shame++;
    if (B.over.winner === 0) seat0++;
  }
  cmds.sort((x, y) => x - y);
  const p = x => (100 * x / games).toFixed(1) + '%';
  console.log(name.padEnd(20), 'Shogun', p(c.shogun || 0), 'NightCount', p(c.night_count || 0), 'Truce', p(c.night_tie || 0), 'median', cmds[games >> 1], 'GeishaOfSgKills', (100 * geisha / Math.max(1, sg)).toFixed(0) + '%', 'Shame', p(shame), 'seat0', p(seat0), ((Date.now() - t0) / games).toFixed(1) + 'ms/game');
}
batch('v4 aggro', {}, 'aggro');
batch('v4 hire2', { hire: 2 }, 'aggro');
batch('v4 Kn no Geisha', { knHitsGs: false }, 'aggro');
batch('v4 Ronin no Geisha', { rnHitsGs: false }, 'aggro');
batch('v4 shame off', { forcedFight: false }, 'aggro');
for (const lv of ['easy', 'cautious', 'hunt', 'search3']) batch('v4 ' + lv, {}, lv);
