// ═══════════════════════════════════════════════════════════════
// extract-section.js — ONE-TIME migration aid for the index.html
// decomposition. Splits a partial into [before][extracted][after] and
// rewrites src/manifest.txt in place so the assembled output is
// unchanged.
//
//   node tools/extract-section.js _rest.html 10560 11294 comb.html
//
// ⚠ Line numbers are 1-based and RELATIVE TO THE NAMED PARTIAL, not to
// index.html. After the first extraction the two diverge permanently —
// always grep the partial you are about to cut.
//
// Safety: the three pieces are re-concatenated and compared against the
// original before anything is written. A mismatch aborts.
//
// Depends on: nothing (Node built-ins only)
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SRC      = path.join(ROOT, 'src', 'screens');
const MANIFEST = path.join(ROOT, 'src', 'manifest.txt');

const [src, startArg, endArg, newName] = process.argv.slice(2);
if (!src || !startArg || !endArg || !newName) {
  console.error('usage: extract-section.js <partial> <startLine> <endLine> <newName>');
  process.exit(1);
}
const start = parseInt(startArg, 10);
const end   = parseInt(endArg, 10);

const srcPath = path.join(SRC, src);
if (!fs.existsSync(srcPath)) {
  console.error('no such partial: ' + src);
  process.exit(1);
}
if (fs.existsSync(path.join(SRC, newName))) {
  console.error('refusing to overwrite an existing partial: ' + newName);
  process.exit(1);
}

const text  = fs.readFileSync(srcPath, 'utf8');
const lines = text.split('\n');   // a trailing '' is preserved when the file ends in \n

if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > end || end > lines.length) {
  console.error('bad range ' + start + '-' + end + '; ' + src + ' has ' + lines.length + ' lines');
  process.exit(1);
}

// Rejoin with '\n' so the three pieces concatenate back to the original exactly.
const before    = lines.slice(0, start - 1).join('\n');
const extracted = lines.slice(start - 1, end).join('\n');
const after     = lines.slice(end).join('\n');

const beforeText  = before    ? before + '\n'    : '';
const extractText = extracted ? extracted + '\n' : '';
const afterText   = after;

if (beforeText + extractText + afterText !== text) {
  console.error('✗ round-trip check failed — refusing to write. This is a tool bug.');
  process.exit(1);
}

// The BEFORE piece keeps the original filename, so repeated cuts do not pile up
// suffixes. The AFTER piece gets a fresh unique name — deriving it from src and
// reusing it would silently overwrite an earlier extraction's remainder.
const replacements = [];
if (beforeText) {
  fs.writeFileSync(srcPath, beforeText, 'utf8');
  replacements.push(src);
}
fs.writeFileSync(path.join(SRC, newName), extractText, 'utf8');
replacements.push(newName);
if (afterText) {
  let n = 1, tailName;
  do { tailName = src.replace(/\.html$/, '-' + n + '.html'); n++; }
  while (fs.existsSync(path.join(SRC, tailName)));
  fs.writeFileSync(path.join(SRC, tailName), afterText, 'utf8');
  replacements.push(tailName);
}
// src was never rewritten above (there was no BEFORE piece) — its old content is dead.
if (!beforeText) fs.unlinkSync(srcPath);

const manLines = fs.readFileSync(MANIFEST, 'utf8').split('\n');
const idx = manLines.findIndex(l => l.replace(/\r$/, '').trim() === src);
if (idx === -1) {
  console.error('✗ ' + src + ' is not listed in src/manifest.txt');
  process.exit(1);
}
manLines.splice(idx, 1, ...replacements);
fs.writeFileSync(MANIFEST, manLines.join('\n'), 'utf8');

console.log('✓ ' + src + ' → ' + replacements.join(' + '));
console.log('  now run: node tools/verify-build-fresh.js');
