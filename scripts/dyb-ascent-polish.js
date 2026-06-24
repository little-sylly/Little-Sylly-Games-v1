/**
 * DYB Ascent Polish — index.html changes:
 *  1. Shake screen header: add [?] button in right group
 *  2a. Shake screen cup area: fix padding px-8 → px-5
 *  2b. Shake screen hand dock: fix gap-3 → gap-2
 *  2c. Shake screen cup label: wrap in flex div + hidden Tempest guide [?]
 *  4. Table screen header: move [?] from left to right group
 *  5. Table screen: replace dyb-allegation-history with The Ascent section
 *  6. Table screen hand dock: add justify-center
 *  7. Insert dyb-ascent-overlay + dyb-tip-overlay after slick picker overlay
 */

const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── 1. Shake screen header: add [?] before 🔊 ──────────────────────────────
html = html.replace(
  `      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
        <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
      </div>
    </div>
    <div id="dyb-shake-dice-counts"`,
  `      <div class="flex items-center gap-2">
        <button id="btn-dyb-shake-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
        <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
      </div>
    </div>
    <div id="dyb-shake-dice-counts"`
);

// ── 2a. Cup area: fix padding px-8 → px-5 ──────────────────────────────────
// Targeted so we don't need to span the curly-apostrophe line.
html = html.replace(
  'px-8 py-6 rounded-3xl bg-stone-100" role="button">',
  'px-5 py-6 rounded-3xl bg-stone-100" role="button">'
);

// ── 2b. Hand dock: fix gap-3 → gap-2 ───────────────────────────────────────
html = html.replace(
  '<div id="dyb-hand-dock-shake" class="flex gap-3 flex-wrap justify-center"></div>',
  '<div id="dyb-hand-dock-shake" class="flex gap-2 flex-wrap justify-center"></div>'
);

// ── 2c. Cup label: wrap in flex div + add hidden Tempest guide [?] ──────────
// ’ = RIGHT SINGLE QUOTATION MARK (the curly apostrophe in the HTML file)
html = html.replace(
  `        <p id="dyb-shake-cup-label" class="text-stone-400 text-sm font-semibold">Tap to shake ’em up</p>`,
  `        <div class="flex items-center gap-1.5">
          <p id="dyb-shake-cup-label" class="text-stone-400 text-sm font-semibold">Tap to shake ’em up</p>
          <button id="btn-dyb-tempest-guide" class="text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100" style="display:none">[?]</button>
        </div>`
);

// ── 4. Table screen header: move [?] to right group ────────────────────────
html = html.replace(
  `      <!-- header row -->
      <div class="flex items-center justify-between">
        <button id="btn-dyb-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>`,
  `      <!-- header row -->
      <div class="flex items-center justify-between">
        <div></div>
        <div class="flex items-center gap-2">
          <button id="btn-dyb-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>`
);

// ── 5. Replace allegation history with The Ascent section ──────────────────
html = html.replace(
  `      <div id="dyb-allegation-history" class="flex flex-col gap-1"></div>`,
  `      <div id="dyb-ascent-section" style="display:none" class="flex items-center gap-2">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label shrink-0">The Ascent</p>
        <p id="dyb-ascent-preview" class="text-stone-400 text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap"></p>
        <button id="btn-dyb-ascent-open" class="text-stone-400 text-xs font-semibold shrink-0 active:scale-90 transition-transform duration-100">📋</button>
      </div>`
);

// ── 6. Table hand dock: add justify-center ─────────────────────────────────
html = html.replace(
  `        <div id="dyb-hand-dock-table" class="flex gap-3 flex-wrap min-h-12"></div>`,
  `        <div id="dyb-hand-dock-table" class="flex gap-3 flex-wrap justify-center min-h-12"></div>`
);

// ── 7. Insert new overlays after slick picker, before first <script> ────────
html = html.replace(
  `\n    <script src="js/games/lttp.js"></script>`,
  `

  <!-- DYB ASCENT OVERLAY -->
  <div id="dyb-ascent-overlay" style="display:none"
    class="fixed inset-0 bg-black/50 z-[90] flex items-end justify-center">
    <div class="bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col" style="max-height:60vh">
      <div class="px-5 pt-5 pb-3 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 class="text-base font-bold text-stone-800">The Ascent</h3>
          <p class="text-xs text-stone-400 mt-0.5">Full bid history this Shake</p>
        </div>
        <button id="btn-dyb-ascent-close" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
      </div>
      <div id="dyb-ascent-history" class="overflow-y-auto flex flex-col px-5 py-4 flex-1 min-h-0"></div>
    </div>
  </div>

  <!-- DYB TIP OVERLAY -->
  <div id="dyb-tip-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[#9db8d9]">
      <div class="flex flex-col gap-2">
        <p id="dyb-tip-emoji" class="text-3xl"></p>
        <h3 id="dyb-tip-heading" class="text-lg font-bold text-stone-800"></h3>
        <div id="dyb-tip-body" class="text-stone-500 text-sm text-left flex flex-col gap-1.5"></div>
      </div>
      <button id="btn-dyb-tip-close" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-100">Got it</button>
    </div>
  </div>

    <script src="js/games/lttp.js"></script>`
);

// ── Verify all replacements were applied ────────────────────────────────────
const checks = [
  ['btn-dyb-shake-how-to',               'shake [?] button added'],
  ['px-5 py-6 rounded-3xl bg-stone-100', 'cup area padding fixed (px-5)'],
  ['flex gap-2 flex-wrap justify-center', 'hand dock gap fixed (gap-2)'],
  ['btn-dyb-tempest-guide',              'tempest guide button added'],
  ['dyb-ascent-section',                 'ascent section added'],
  ['dyb-ascent-overlay',                 'ascent overlay added'],
  ['dyb-tip-overlay',                    'tip overlay added'],
  ['<div></div>',                        'table header left placeholder added'],
];

let ok = true;
checks.forEach(([needle, label]) => {
  if (!html.includes(needle)) {
    console.error(`FAIL: ${label} (needle: "${needle}")`);
    ok = false;
  } else {
    console.log(`OK:   ${label}`);
  }
});

if (!html.includes('dyb-allegation-history')) {
  console.log('OK:   dyb-allegation-history removed');
} else {
  console.error('FAIL: dyb-allegation-history still present');
  ok = false;
}

if (!ok) {
  console.error('\nOne or more replacements failed — file NOT written.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\nDone! index.html updated.');
