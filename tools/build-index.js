// ═══════════════════════════════════════════════════════════════
// build-index.js — assembles index.html from the src/screens/ partials.
//
// DEV-ONLY. Not part of the runtime, not part of the PWA, not precached,
// not fetched by anything. If this script were deleted, index.html is
// committed and complete and the app still ships — see the design spec
// § 5. That escape hatch is what makes a build acceptable here at all.
//
// The partials are EXACT LINEAR SLICES of index.html, joined with no
// separator. That is what makes the output byte-identical to the file
// that was decomposed, which is the safety property the whole migration
// rests on. A single stray newline here breaks it.
//
// Usage:  node tools/build-index.js
// Depends on: nothing (Node built-ins only — no npm, no package.json)
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SRC      = path.join(ROOT, 'src', 'screens');
const MANIFEST = path.join(ROOT, 'src', 'manifest.txt');
const OUT      = path.join(ROOT, 'index.html');
const BOM      = '﻿';

const BANNER =
  '<!-- ═══════════════════════════════════════════════════════════════\n' +
  '     GENERATED FILE — DO NOT EDIT BY HAND.\n' +
  '     Assembled by tools/build-index.js from src/screens/.\n' +
  '     Edit the partial for the game you are changing, then commit —\n' +
  '     the pre-commit hook rebuilds this file for you.\n' +
  '     A hand edit here is silently overwritten on the next build.\n' +
  '═══════════════════════════════════════════════════════════════ -->\n';

function readManifest() {
  const raw = fs.readFileSync(MANIFEST, 'utf8');
  return raw.split('\n')
    .map(l => l.replace(/\r$/, '').trim())
    .filter(l => l && !l.startsWith('#'));
}

function assemble() {
  const names = readManifest();
  if (!names.length) throw new Error('src/manifest.txt names no partials');

  const parts = names.map(name => {
    const p = path.join(SRC, name);
    if (!fs.existsSync(p)) {
      throw new Error('manifest names a missing partial: ' + name);
    }
    let s = fs.readFileSync(p, 'utf8');
    // A partial must not carry its own BOM — the assembler emits exactly one.
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    return s;
  });

  // join('') — never join('\n'). The slices already carry their own newlines.
  const body = parts.join('');

  // The banner goes immediately AFTER the DOCTYPE, which must stay the first
  // thing in the document.
  const nl = body.indexOf('\n') + 1;
  if (nl === 0) throw new Error('assembled output has no newline — the manifest is wrong');
  return BOM + body.slice(0, nl) + BANNER + body.slice(nl);
}

module.exports = { assemble, readManifest };

if (require.main === module) {
  const text  = assemble();
  const bytes = Buffer.byteLength(text, 'utf8');
  fs.writeFileSync(OUT, text, 'utf8');
  console.log('✓ wrote index.html (' + bytes + ' bytes from ' +
              readManifest().length + ' partials)');
}
