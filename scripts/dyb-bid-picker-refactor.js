// DYB bid picker + claim display refactor — run with: node scripts/dyb-bid-picker-refactor.js
// Changes:
//   1. Bid picker: two stacked cards → one horizontal row (qty ▼▲ × face-die ▼▲)
//   2. dyb-face-display: <span> → <div> (block container for the pip die)

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

// ── Change 1: replace the two-card vertical bid picker with a single horizontal row ──
const oldPicker =
`      <!-- bid picker controls -->
      <div id="dyb-bid-controls" class="flex flex-col gap-3" data-face="1" data-qty="1">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest dyb-label">Face Value</p>
          <div class="flex items-center justify-between gap-3">
            <button id="btn-dyb-face-dec" class="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">−</button>
            <span id="dyb-face-display" class="text-2xl font-bold text-stone-800 w-10 text-center">1</span>
            <button id="btn-dyb-face-inc" class="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">+</button>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest dyb-label">Quantity</p>
          <div class="flex items-center justify-between gap-3">
            <button id="btn-dyb-qty-dec" class="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">−</button>
            <span id="dyb-qty-display" class="text-2xl font-bold text-stone-800 w-10 text-center">1</span>
            <button id="btn-dyb-qty-inc" class="w-12 h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">+</button>
          </div>
        </div>
      </div>`;

const newPicker =
`      <!-- bid picker controls -->
      <div id="dyb-bid-controls" class="bg-white rounded-2xl p-4 shadow-sm" data-face="1" data-qty="1">
        <div class="flex items-center justify-center gap-2">
          <button id="btn-dyb-qty-dec" class="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">−</button>
          <span id="dyb-qty-display" class="text-2xl font-bold text-stone-800 w-8 text-center">1</span>
          <button id="btn-dyb-qty-inc" class="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">+</button>
          <span class="text-stone-400 font-bold text-xl mx-1">×</span>
          <button id="btn-dyb-face-dec" class="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">−</button>
          <div id="dyb-face-display" class="flex items-center justify-center" style="width:38px;height:38px;"></div>
          <button id="btn-dyb-face-inc" class="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 font-bold text-xl transition-transform duration-100">+</button>
        </div>
      </div>`;

if (!html.includes(oldPicker)) {
  console.error('ERROR: bid picker search string did not match. Verify index.html hasn\'t changed.');
  process.exit(1);
}

html = html.replace(oldPicker, newPicker);

if (html === original) {
  console.error('ERROR: No changes made after replacement attempt.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');

// Verify
const hasPicker   = html.includes('dyb-bid-controls');
const hasFaceDec  = html.includes('btn-dyb-face-dec');
const hasFaceDiv  = html.includes('<div id="dyb-face-display"');
const noOldSpan   = !html.includes('<span id="dyb-face-display"');
const noOldCards  = !html.includes('Face Value</p>');

console.log(`${hasPicker  ? '✓' : '✗'} #dyb-bid-controls present`);
console.log(`${hasFaceDec ? '✓' : '✗'} btn-dyb-face-dec present`);
console.log(`${hasFaceDiv ? '✓' : '✗'} dyb-face-display is a <div>`);
console.log(`${noOldSpan  ? '✓' : '✗'} old <span id="dyb-face-display"> gone`);
console.log(`${noOldCards ? '✓' : '✗'} old two-card layout gone`);
console.log('\nDone — index.html updated.');
