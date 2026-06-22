// DYB colour sweep: stone-400 (#a8a29e) → ocean blue (#1E4D8C)
// Scoped to the DYB section only (between DICEY BLUFFS and PASS markers).
// Run once then delete.

const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const content  = fs.readFileSync(filePath, 'utf8');

const startMarker = '<!-- ════ DICEY BLUFFS ════';
const endMarker   = '<!-- ════ PASS ════';

const startIdx = content.indexOf(startMarker);
const endIdx   = content.indexOf(endMarker);
if (startIdx === -1) throw new Error('START marker not found');
if (endIdx   === -1) throw new Error('END marker not found');
if (startIdx >= endIdx) throw new Error('Markers out of order');

const before  = content.slice(0, startIdx);
const section = content.slice(startIdx, endIdx);
const after   = content.slice(endIdx);

function replace(str, from, to, expectedCount) {
  const parts = str.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount)
    throw new Error(`"${from}": expected ${expectedCount} replacements but found ${count}`);
  return parts.join(to);
}

let s = section;

// 1. Primary CTA buttons: bg-stone-400 hover:bg-stone-500 → dyb-cta
s = replace(s, 'bg-stone-400 hover:bg-stone-500', 'dyb-cta', 9);

// 2. Active pill class
s = replace(s, 'pill-active-stone', 'pill-active-dyb', 2);

// 3. Settings button light tint (min-h-14 full-width only — not the +/- picker buttons)
s = replace(
  s,
  'min-h-14 w-full rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700',
  'min-h-14 w-full rounded-2xl bg-[#dce8f7] hover:bg-[#c8daf0] active:scale-95 text-[#1E4D8C]',
  1
);

// 4. Decision modal brand borders
s = replace(s, 'border border-stone-300', 'border border-[#9db8d9]', 3);

// 5. Brand-coloured small-caps section/step labels
//    Pattern: text-xs font-semibold uppercase tracking-widest text-stone-400
//    (distinct from body subtext which uses text-xs text-stone-400 without the uppercase/tracking chain)
s = replace(
  s,
  'text-xs font-semibold uppercase tracking-widest text-stone-400',
  'text-xs font-semibold uppercase tracking-widest dyb-label',
  12
);

fs.writeFileSync(filePath, before + s + after, 'utf8');
console.log('DYB colour sweep complete — all assertions passed.');
