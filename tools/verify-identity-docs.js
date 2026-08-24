// ═══════════════════════════════════════════════════════════════════════════
// verify-identity-docs.js — asserts every quoted UI string in a per-game
// identity document still exists in the shipped app.
//
//   node tools/verify-identity-docs.js              (exits 1 on any failure)
//   node tools/verify-identity-docs.js --self-test  (proves the checker works)
//
// Guards docs/game-identities/<abbr>.md § T7b. Those sections reproduce every
// visible string in a game verbatim, and a mirrored string drifts silently the
// moment a label is edited. A confidently-wrong identity doc handed to an art
// or copy contractor is worse than no doc at all — and the review loop the docs
// exist for (change the doc, then change the code) only closes if drift is
// caught mechanically.
//
// Precedent for why this is not paranoia: docs/superpowers/plans/
// 2026-08-14-flw-gem-seam.md records game-identities.md § Game 16 as
// "currently documents a different game" — a whole section had drifted into
// fiction because nothing checked it.
//
// What is checked: ONLY fenced blocks tagged ```copy. Prose quotes elsewhere
// (T5's terminology, T3's rules text) are paraphrase, not copy, and are ignored
// by design.
//
// Source of truth is index.html + the game's own plugin file, nothing else.
// Three haystacks are searched: index.html normalised, index.html with tags
// replaced by spaces (so a string split by an inline <span> still matches), and
// the plugin file normalised. A hit in any one passes.
//
// A hit must be BOUNDED, not merely a substring. A plain indexOf would accept
// "Raid the Jar" against a button that actually reads "Raid the Jar!" — the doc
// would then be reviewed as if the label had no exclamation mark. So every
// occurrence is tested for a boundary character (whitespace, a tag bracket, or
// a quote) on both sides, and at least one occurrence must be clean. This is
// what makes a TRUNCATED string fail, which is the most likely transcription
// error and the one a substring check is blindest to.
//
// Two known limitations, both measured rather than assumed:
//
//   • A doc string that is a genuine FRAGMENT of a longer visible run — the
//     middle of a sentence built by interpolation — fails this check and must
//     be recorded as its full contiguous text instead. That is the intended
//     trade: "verbatim" should mean the whole label, not part of it.
//   • A truncation that lands on a word boundary AND whose shorter form is
//     itself a bounded prefix of some other real string still passes. Measured
//     example: "Waiting for the host" survives because "Waiting for the host to
//     open the jar…" contains it bounded. Closing this needs exact matching
//     against parsed HTML text nodes and JS literals, which is a parser this
//     tool deliberately does not carry. The common transcription errors —
//     dropped punctuation, changed case, wrong apostrophe — are all caught.
//
// --self-test runs the checker against tools/fixtures/identity-doc-fixture.md,
// whose contents are DELIBERATELY part right and part wrong, and asserts it
// finds exactly the planted failures. Without it, a checker that silently
// matches everything passes forever. Same discipline as verify-cjar-loopback's
// CJAR_SRC= — prove the test fails before trusting that it passes.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// The plugin filename is NOT always the abbreviation — gm and ss are legacy.
const PLUGIN = { gm: 'great-minds', ss: 'secret-signals' };

const ENTITIES = {
  amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'",
  rsaquo: '›', lsaquo: '‹', mdash: '—', ndash: '–',
  hellip: '…',
};

function decode(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

const norm = s => decode(s).replace(/\s+/g, ' ').trim();

// Tags become a SPACE, never nothing — otherwise "Foo</p><p>Bar" welds into
// "FooBar" and a doc claiming that string would falsely pass.
const stripTags = s => s.replace(/<[^>]*>/g, ' ');

// Every ```copy block's payload. Blank lines and lines starting '#' are
// comments — that is how a block records which screen it belongs to.
function copyStrings(md) {
  const out = [];
  let inBlock = false;
  md.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```copy\s*$/.test(line))        { inBlock = true;  return; }
    if (inBlock && /^\s*```\s*$/.test(line)) { inBlock = false; return; }
    if (!inBlock) return;
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    out.push({ text: t, line: i + 1 });
  });
  return out;
}

function haystacksFor(abbr) {
  const html   = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const jsFile = path.join(ROOT, 'js/games', `${PLUGIN[abbr] || abbr}.js`);
  const js     = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf8') : '';
  return [norm(html), norm(stripTags(html)), norm(js)];
}

// A character that can legitimately sit either side of a complete visible
// string: whitespace, a tag bracket, or any flavour of quote. Anything else
// adjacent means the real string continues and the doc has truncated it.
const BOUNDARY = /[\s<>"'`]/;

// True when `needle` occurs in `hay` at least once with a boundary on both
// sides. Every occurrence is tried, not just the first — "Dob" appears inside
// "Dobbed." (unbounded) AND as its own button label (bounded), and the bounded
// one is what makes it correct.
function foundBounded(hay, needle) {
  if (!needle) return false;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    const before = i === 0 ? '' : hay[i - 1];
    const afterI = i + needle.length;
    const after  = afterI >= hay.length ? '' : hay[afterI];
    if ((before === '' || BOUNDARY.test(before)) &&
        (after  === '' || BOUNDARY.test(after))) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

// Returns an array of { doc, line, text } for every string not found.
function checkDoc(docPath) {
  const abbr = path.basename(docPath, '.md');
  const hay  = haystacksFor(abbr);
  return copyStrings(fs.readFileSync(docPath, 'utf8'))
    .filter(s => { const n = norm(s.text); return !hay.some(h => foundBounded(h, n)); })
    .map(s => ({ doc: path.basename(docPath), line: s.line, text: s.text }));
}

const selfTest = process.argv.includes('--self-test');

console.log(`Identity docs — copy verification${selfTest ? ' (SELF-TEST)' : ''}`);
console.log('='.repeat(48));

if (selfTest) {
  const fixture = path.join(ROOT, 'tools/fixtures/identity-doc-fixture.md');
  const found   = checkDoc(fixture).map(f => f.text).sort();
  const planted = [
    'Custard Cream Catastrophe',
    'Grab The Biscuit Tin',
    'Nibble Quietly Away',
  ];
  const ok = JSON.stringify(found) === JSON.stringify(planted);
  console.log(ok ? '  PASS  checker finds exactly the planted failures'
                 : '  FAIL  checker did not find exactly the planted failures');
  if (!ok) {
    console.log(`          expected ${JSON.stringify(planted)}`);
    console.log(`          got      ${JSON.stringify(found)}`);
  }
  console.log(`\n${'='.repeat(48)}`);
  console.log(ok ? 'SELF-TEST PASSED' : 'SELF-TEST FAILED');
  process.exit(ok ? 0 : 1);
}

const dir = path.join(ROOT, 'docs/game-identities');
if (!fs.existsSync(dir)) {
  console.log('  no docs/game-identities/ yet — nothing to check');
  process.exit(0);
}

const docs = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
if (!docs.length) {
  console.log('  no identity docs yet — nothing to check');
  process.exit(0);
}

let failures = 0;
for (const f of docs) {
  const bad = checkDoc(path.join(dir, f));
  const n   = copyStrings(fs.readFileSync(path.join(dir, f), 'utf8')).length;
  console.log(`\n${f} — ${n} string(s) checked`);
  if (!bad.length) { console.log('  PASS  every string found in source'); continue; }
  failures += bad.length;
  bad.forEach(b => console.log(`  FAIL  ${b.doc}:${b.line}  ${JSON.stringify(b.text)}`));
}

console.log(`\n${'='.repeat(48)}`);
console.log(failures ? `FAILED — ${failures} string(s) not found in source`
                     : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
