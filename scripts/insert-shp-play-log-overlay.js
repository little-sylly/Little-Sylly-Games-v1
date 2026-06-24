'use strict';
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const ANCHOR = '  <div id="shp-card-info-overlay"';

if (html.includes('shp-play-log-overlay')) {
  console.log('shp-play-log-overlay already present — nothing to do.');
  process.exit(0);
}

if (!html.includes(ANCHOR)) {
  console.error('ERROR: anchor "shp-card-info-overlay" not found — aborting.');
  process.exit(1);
}

const INSERT = `  <div id="shp-play-log-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Play Log \u{1F4CB}</h2>
        <p class="text-xs text-stone-400 mt-1">Cards played this Night, newest first.</p>
      </div>
      <div id="shp-play-log-list" class="overflow-y-auto flex flex-col px-5 py-4 gap-0"></div>
      <div class="px-5 pb-8 flex-shrink-0">
        <button id="btn-shp-play-log-close" class="min-h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-lg font-semibold transition-all duration-150">Close</button>
      </div>
    </div>
  </div>

`;

html = html.replace(ANCHOR, INSERT + ANCHOR);

// Also update the section header comment to list the new overlay
html = html.replace(
  'shp-new-night-overlay, shp-tip-overlay, shp-card-info-overlay',
  'shp-new-night-overlay, shp-tip-overlay, shp-card-info-overlay,\n                 shp-play-log-overlay'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('shp-play-log-overlay inserted successfully.');
