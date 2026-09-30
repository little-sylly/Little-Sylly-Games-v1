// Warn-only check: the always-loaded baseline (CLAUDE.md + .claude/rules/*.md) is paid in
// tokens on EVERY session. Prints the size; warns past BUDGET_BYTES; always exits 0.
// Zero dependencies. Raise BUDGET_BYTES only as a deliberate decision (docs/decision-log.md).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUDGET_BYTES = 195 * 1024;   // ~50k tokens; set 30 Sep 2026 just above the post-trim size
const files = ['CLAUDE.md'];
const rulesDir = path.join(ROOT, '.claude', 'rules');
if (fs.existsSync(rulesDir)) {
  fs.readdirSync(rulesDir).filter(f => f.endsWith('.md')).sort()
    .forEach(f => files.push(path.join('.claude', 'rules', f)));
}

let total = 0;
const rows = files.map(f => {
  const n = fs.statSync(path.join(ROOT, f)).size;
  total += n;
  return { f, n };
});
rows.forEach(r => console.log(`  ${(r.n / 1024).toFixed(1).padStart(6)} KB  ${r.f}`));
console.log(`  ${(total / 1024).toFixed(1).padStart(6)} KB  TOTAL (~${Math.round(total / 4000)}k tokens, budget ${BUDGET_BYTES / 1024} KB)`);

if (total > BUDGET_BYTES) {
  console.warn(`\nWARN: always-loaded baseline is ${((total - BUDGET_BYTES) / 1024).toFixed(1)} KB over budget.`);
  console.warn('      Move history to impl-notes / sw-changelog / cost-envelope with a pointer; rules stay.');
}
process.exit(0);
