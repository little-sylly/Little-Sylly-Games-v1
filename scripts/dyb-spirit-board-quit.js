// BUG-19 fix — add ✕ quit button to Spirit Board header
// Run with: node scripts/dyb-spirit-board-quit.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

const oldHeader =
`    <div class="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
      <p class="text-sm font-bold text-stone-500">THE DEPTHS 🌊</p>
      <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
    </div>`;

const newHeader =
`    <div class="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
      <p class="text-sm font-bold text-stone-500">THE DEPTHS 🌊</p>
      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
        <button class="btn-dyb-quit-open text-stone-500 font-bold text-lg active:scale-90 transition-transform duration-100">✕</button>
      </div>
    </div>`;

if (!html.includes(oldHeader)) {
  console.error('ERROR: Spirit Board header search string did not match. Verify index.html.');
  process.exit(1);
}

html = html.replace(oldHeader, newHeader);

if (html === original) {
  console.error('ERROR: No changes made after replacement attempt.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');

const hasQuitBtn = html.includes('btn-dyb-quit-open text-stone-500 font-bold');
const hasDepths  = html.includes('THE DEPTHS 🌊');
const hasSoundGrp = html.includes('<div class="flex items-center gap-2">');

console.log(`${hasQuitBtn  ? '✓' : '✗'} ✕ quit button added to Spirit Board`);
console.log(`${hasDepths   ? '✓' : '✗'} THE DEPTHS label preserved`);
console.log(`${hasSoundGrp ? '✓' : '✗'} Sound + quit grouped in flex container`);
console.log('\nDone — index.html updated.');
