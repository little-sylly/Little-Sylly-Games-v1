// dyb-summit-polish.js
// Two index.html changes for DYB summit polish:
//   1. Cup area internal padding: px-5 py-6 → px-3 py-5
//   2. Insert Chronicle section after #dyb-gameover-standings, before #btn-dyb-gameover-again

const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let src = fs.readFileSync(filePath, 'utf8');
const original = src;

// ── 1. Cup area padding ────────────────────────────────────────────────────
const cupNeedle  = 'id="dyb-shake-cup-area" class="flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-transform duration-150 px-5 py-6 rounded-3xl bg-stone-100"';
const cupReplace = 'id="dyb-shake-cup-area" class="flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-transform duration-150 px-3 py-5 rounded-3xl bg-stone-100"';

if (!src.includes(cupNeedle)) {
  console.error('ERROR: Cup area needle not found.');
  process.exit(1);
}
src = src.replace(cupNeedle, cupReplace);
console.log('✅  Cup area padding updated: px-5 py-6 → px-3 py-5');

// ── 2. Insert Chronicle section ────────────────────────────────────────────
const chronicleAnchor = '      <button id="btn-dyb-gameover-again"';

if (!src.includes(chronicleAnchor)) {
  console.error('ERROR: btn-dyb-gameover-again anchor not found.');
  process.exit(1);
}

const chronicleHTML = `      <!-- Post-Climb Chronicle -->
      <div id="dyb-chronicle-section" style="display:none" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-widest dyb-label">Post-Climb Chronicle</p>
          <div class="flex items-center gap-2">
            <button id="btn-dyb-chronicle-prev" class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-500 font-bold text-sm transition-all duration-100 disabled:opacity-30">&#8678;</button>
            <span id="dyb-chronicle-label" class="text-xs text-stone-500 font-semibold w-14 text-center"></span>
            <button id="btn-dyb-chronicle-next" class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-500 font-bold text-sm transition-all duration-100 disabled:opacity-30">&#8680;</button>
          </div>
        </div>
        <div id="dyb-chronicle-card" class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1 min-h-[60px]"></div>
      </div>
      `;

src = src.replace(chronicleAnchor, chronicleHTML + chronicleAnchor);
console.log('✅  Chronicle section inserted before btn-dyb-gameover-again');

// ── Write back ─────────────────────────────────────────────────────────────
if (src === original) {
  console.log('No changes were made — something may be wrong.');
  process.exit(1);
}

fs.writeFileSync(filePath, src, 'utf8');
console.log('✅  index.html written successfully.');
