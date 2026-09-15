// ═══════════════════════════════════════════════════════════════
// verify-build-fresh.js — is the committed index.html a faithful
// assembly of src/screens/? Exits non-zero if it is not.
//
// This is the layer that HOLDS when the pre-commit hook is absent —
// a fresh clone has no .git/hooks, and `git commit --no-verify`
// bypasses it. Run it like any other tools/verify-*.js harness.
//
// Depends on: tools/build-index.js (assemble)
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const { assemble } = require('./build-index.js');

const OUT = path.join(__dirname, '..', 'index.html');

const built   = Buffer.from(assemble(), 'utf8');
const current = fs.readFileSync(OUT);            // raw bytes, BOM included

if (built.equals(current)) {
  console.log('✓ index.html is fresh (' + current.length + ' bytes)');
  process.exit(0);
}

// Name the first differing byte — a bare "they differ" is useless at this size.
const min = Math.min(built.length, current.length);
let i = 0;
while (i < min && built[i] === current[i]) i++;
const line = current.slice(0, i).toString('utf8').split('\n').length;

console.error('✗ index.html is STALE — it does not match src/screens/.');
console.error('  committed: ' + current.length + ' bytes | assembled: ' + built.length + ' bytes');
console.error('  first difference at byte ' + i + ' (around line ' + line + ')');
console.error('  Fix: node tools/build-index.js');
process.exit(1);
