// Update LTTP Sylly Mode: rename "Joker Mode" → "The Troublemaker" in settings overlay
// and add ✨ Sylly Mode card to LTTP how-to overlay
// Run from project root: node scripts/update-lttp-sylly-mode.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

function replaceExact(oldStr, newStr) {
  if (!html.includes(oldStr)) {
    console.error('STRING NOT FOUND:', oldStr.slice(0, 80));
    process.exit(1);
  }
  html = html.replace(oldStr, newStr);
}

function insertBefore(anchor, insertion) {
  const idx = html.indexOf(anchor);
  if (idx === -1) { console.error('ANCHOR NOT FOUND:', anchor.slice(0, 60)); process.exit(1); }
  html = html.slice(0, idx) + insertion + html.slice(idx);
}

// ── 1. Settings overlay: rename subtitle ─────────────────────────────────
replaceExact(
  '<p class="text-stone-600 text-sm font-semibold">Joker Mode</p>',
  '<p class="text-stone-600 text-sm font-semibold">The Troublemaker</p>'
);

// ── 2. Settings overlay: update description ──────────────────────────────
replaceExact(
  '<p class="text-stone-400 text-sm">One member of the Gang is secretly stirring the pot. Three-way scoring.</p>',
  '<p class="text-stone-400 text-sm">One Gang member secretly has a decoy location to plant. If the Friend of a Friend pins the decoy, The Troublemaker scores big instead.</p>'
);

// ── 3. How-to overlay: insert Sylly Mode card before close button ─────────
insertBefore(
  '        <button id="btn-lttp-how-to-done"',
  `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">The Troublemaker</p>
          <p class="text-stone-500 text-sm">One member of <span class="font-semibold text-stone-700">The Gang</span> secretly has a decoy location. They want the <span class="font-semibold text-stone-700">Friend of a Friend</span> to pin the wrong spot. Three-way scoring: Friend of a Friend, The Gang, and The Troublemaker each have different win conditions.</p>
        </div>
`
);

// ── Write ─────────────────────────────────────────────────────────────────
if (html === original) {
  console.error('No changes made — check string anchors.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Done. Changes written to index.html');
