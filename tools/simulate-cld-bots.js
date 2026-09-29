// ═══════════════════════════════════════════════════════════════════════════
// simulate-cld-bots.js — balance instrument for Cold Shoulder's bots (SW v247).
// Seeded bot-only matches; prints win share by difficulty and seat count.
// Asserts NOTHING and always exits 0.   CLD_SEED= / CLD_BOTS_MATCHES=
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const { playMatch } = require('./lib/cld-rules-world');
const SEED = Number(process.env.CLD_SEED || 20260929);
const N = Number(process.env.CLD_BOTS_MATCHES || 30);
const DIFFS = ['easy', 'medium', 'hard'];
console.log('Cold Shoulder bots — win share (one Floe-Off per match; seats rotate)');
for (const players of [3, 4, 5, 6]) {
  const wins = { easy: 0, medium: 0, hard: 0 }; let slides = 0, ended = 0;
  for (let k = 0; k < N; k++) {
    const diffs = Array.from({ length: players }, (_, j) => DIFFS[(j + k) % 3]);
    const r = playMatch({ players, diffs, seed: SEED + players * 1000 + k, fishToWin: 1 });
    if (r.winner >= 0) { wins[diffs[r.winner]]++; ended++; }
    slides += r.slides;
  }
  const pct = d => (100 * wins[d] / Math.max(1, ended)).toFixed(0).padStart(3) + '%';
  console.log(`  ${players} seats  easy ${pct('easy')}  medium ${pct('medium')}  hard ${pct('hard')}   ` +
              `${(slides / N).toFixed(1)} Slides/match, ${ended}/${N} ended`);
}
process.exit(0);
