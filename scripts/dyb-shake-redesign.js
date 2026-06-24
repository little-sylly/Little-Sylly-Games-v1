// DYB shake screen redesign — run with: node scripts/dyb-shake-redesign.js
// Replaces the two-button (Shake + Ready) layout with:
//   - Tappable cup area (face-down dice + "Tap to shake 'em up" label)
//   - Single "Ready!" CTA at the bottom
// Path A: tap cup → shake animation → reveal dice → Ready! submits
// Path B: tap Ready! immediately → roll instantly + submit

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

html = html.replace(
  `    <div class="flex-1 overflow-y-auto flex flex-col min-h-0 items-center justify-center px-5 py-4">
      <div id="dyb-hand-dock-shake" class="flex gap-3 flex-wrap justify-center min-h-12"></div>
    </div>
    <div class="px-5 pb-8 pt-2 flex-shrink-0 flex flex-col gap-3">
      <button id="btn-dyb-roll" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Shake 'Em Up 🎲
      </button>
      <button id="btn-dyb-roll-ready" class="min-h-14 w-full rounded-2xl bg-stone-600 hover:bg-stone-700 active:scale-95 text-white text-xl font-semibold transition-all duration-150 btn-mp-action" style="display:none">
        Ready ✓
      </button>
      <p id="dyb-roll-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for others…</p>
    </div>`,
  `    <div class="flex-1 flex flex-col items-center justify-center gap-5 min-h-0 px-5 py-4">
      <div id="dyb-shake-cup-area" class="flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-transform duration-150 px-8 py-6 rounded-3xl bg-stone-100" role="button">
        <div id="dyb-hand-dock-shake" class="flex gap-3 flex-wrap justify-center"></div>
        <p id="dyb-shake-cup-label" class="text-stone-400 text-sm font-semibold">Tap to shake ’em up</p>
      </div>
    </div>
    <div class="px-5 pb-8 pt-2 flex-shrink-0 flex flex-col gap-3">
      <button id="btn-dyb-ready" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150 btn-mp-action">
        Ready!
      </button>
      <p id="dyb-roll-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for others…</p>
    </div>`
);

if (html === original) {
  console.error('ERROR: No changes were made — search string did not match. Verify shake screen HTML hasn\'t changed.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');

const ok = html.includes('dyb-shake-cup-area') && html.includes('btn-dyb-ready') && !html.includes('btn-dyb-roll-ready');
console.log(`${ok ? '✓' : '✗'} Shake screen redesign`);
console.log('\nDone — index.html updated.');
