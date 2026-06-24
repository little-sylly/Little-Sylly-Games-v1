// DYB HTML fixes — run with: node scripts/dyb-html-fixes.js
// Changes:
//   1. Section header comment: DICEY BLUFFS → THE BLUFF
//   2. Seating screen: add header row with 🔊 and ✕ (BUG-18)
//   3. Settings: "Starting Hand" → "Starting Dice"
//   4. Showdown screen: move 🔊/✕ to header row, CTA becomes full-width (BUG-17)
//   5. Gameover screen: same fix (BUG-17)

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

// ── 1. Section header comment ────────────────────────────────────────────────
html = html.replace(
  '<!-- ════ DICEY BLUFFS ════',
  '<!-- ════ THE BLUFF ════'
);

// ── 2. Seating screen — add header row with 🔊 + ✕ ─────────────────────────
html = html.replace(
  `  <!-- DYB SEATING -->
  <section id="screen-dyb-seating" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label mb-1">The Bluff</p>
        <h2 class="text-2xl font-bold text-stone-800">Take Your Position</h2>
        <p class="text-stone-400 text-sm mt-1">Positions for this climb.</p>
      </div>`,
  `  <!-- DYB SEATING -->
  <section id="screen-dyb-seating" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <div></div>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label mb-1">The Bluff</p>
        <h2 class="text-2xl font-bold text-stone-800">Take Your Position</h2>
        <p class="text-stone-400 text-sm mt-1">Positions for this climb.</p>
      </div>`
);

// ── 3. Settings: Starting Hand → Starting Dice ───────────────────────────────
html = html.replace(
  `            <p class="text-stone-800 font-semibold">Starting Hand</p>
            <p class="text-stone-400 text-sm mt-0.5">How many dice each player holds at the start of the game.</p>`,
  `            <p class="text-stone-800 font-semibold">Starting Dice</p>
            <p class="text-stone-400 text-sm mt-0.5">How many dice each player starts with.</p>`
);

// ── 4. Showdown screen: proper header row, full-width CTA ────────────────────
html = html.replace(
  `  <!-- DYB SHOWDOWN -->
  <section id="screen-dyb-showdown" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label mb-1">Reaching the Edge</p>
        <h2 class="text-2xl font-bold text-stone-800">THE OVERLOOK</h2>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm text-center flex flex-col gap-2">
        <p id="dyb-showdown-claimed" class="text-stone-500 text-sm"></p>
        <p id="dyb-showdown-real" class="text-xl font-bold text-stone-800"></p>
        <p id="dyb-showdown-verdict" class="text-2xl font-bold text-stone-700"></p>
        <p id="dyb-showdown-loser" class="text-stone-500 text-sm mt-1"></p>
      </div>
      <div id="dyb-showdown-hands" class="flex flex-col gap-2"></div>
      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
        <button id="btn-dyb-next-shake" class="flex-1 min-h-14 rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Next Shake →
        </button>
        <button id="btn-dyb-showdown-exit" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100 px-2">✕</button>
      </div>
      <p id="dyb-showdown-client-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for host…</p>
    </div>
  </section>`,
  `  <!-- DYB SHOWDOWN -->
  <section id="screen-dyb-showdown" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label">Reaching the Edge</p>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button id="btn-dyb-showdown-exit" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100 px-2">✕</button>
        </div>
      </div>
      <h2 class="text-2xl font-bold text-stone-800 text-center">THE OVERLOOK</h2>
      <div class="bg-white rounded-2xl p-5 shadow-sm text-center flex flex-col gap-2">
        <p id="dyb-showdown-claimed" class="text-stone-500 text-sm"></p>
        <p id="dyb-showdown-real" class="text-xl font-bold text-stone-800"></p>
        <p id="dyb-showdown-verdict" class="text-2xl font-bold text-stone-700"></p>
        <p id="dyb-showdown-loser" class="text-stone-500 text-sm mt-1"></p>
      </div>
      <div id="dyb-showdown-hands" class="flex flex-col gap-2"></div>
      <button id="btn-dyb-next-shake" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Next Shake →
      </button>
      <p id="dyb-showdown-client-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for host…</p>
    </div>
  </section>`
);

// ── 5. Gameover screen: proper header row, full-width CTA ────────────────────
html = html.replace(
  `  <!-- DYB GAMEOVER -->
  <section id="screen-dyb-gameover" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-stone-800">The Summit 🎲</h2>
        <p id="dyb-gameover-winner" class="text-xl font-bold text-stone-600 mt-2"></p>
      </div>
      <div id="dyb-gameover-standings" class="flex flex-col gap-2"></div>
      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
        <button id="btn-dyb-gameover-again" class="flex-1 min-h-14 rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Climb Again?
        </button>
        <button id="btn-dyb-gameover-exit" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100 px-2">✕</button>
      </div>
    </div>
  </section>`,
  `  <!-- DYB GAMEOVER -->
  <section id="screen-dyb-gameover" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <div></div>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button id="btn-dyb-gameover-exit" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100 px-2">✕</button>
        </div>
      </div>
      <div class="text-center">
        <h2 class="text-2xl font-bold text-stone-800">The Summit 🎲</h2>
        <p id="dyb-gameover-winner" class="text-xl font-bold text-stone-600 mt-2"></p>
      </div>
      <div id="dyb-gameover-standings" class="flex flex-col gap-2"></div>
      <button id="btn-dyb-gameover-again" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Climb Again?
      </button>
    </div>
  </section>`
);

// ── Verify and write ─────────────────────────────────────────────────────────
if (html === original) {
  console.error('ERROR: No changes were made — all replace() calls were no-ops. Check that the search strings match exactly.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');

// Count how many changes landed
const checks = [
  ['Section header', html.includes('<!-- ════ THE BLUFF ════')],
  ['Seating exit button', html.includes('btn-dyb-quit-open text-stone-400 font-bold text-xl') && html.includes('screen-dyb-seating')],
  ['Starting Dice', html.includes('"Starting Dice"')],
  ['Showdown header', html.includes('screen-dyb-showdown') && html.includes('Reaching the Edge</p>\n        <div class="flex items-center gap-2">')],
  ['Gameover header', html.includes('screen-dyb-gameover') && html.includes('btn-dyb-gameover-exit')],
];

checks.forEach(([name, ok]) => console.log(`${ok ? '✓' : '✗'} ${name}`));
console.log('\nDone — index.html updated.');
