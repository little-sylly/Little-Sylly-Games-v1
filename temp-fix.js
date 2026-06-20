// temp-fix.js — Fix settings overlay freeze-pane structure for GM, JEC, YGI, LTTP
// Also adds missing 🍳 emoji to JEC's "The Pantry Cabinet" title
// Run: node temp-fix.js

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const orig = html;

function replaceOnce(search, replacement, label) {
  const idx = html.indexOf(search);
  if (idx === -1) {
    console.error(`MISS [${label}]: search string not found — check for whitespace differences`);
    process.exitCode = 1;
    return;
  }
  html = html.slice(0, idx) + replacement + html.slice(idx + search.length);
  console.log(`OK   [${label}]`);
}

// ── GM settings ──────────────────────────────────────────────────────────────
// Opening: remove padding/gap from outer div; add overflow-y-auto scroll body after title

replaceOnce(
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5">

      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Frequency Configuration 📡</h2>
        <p class="text-stone-400 text-xs mt-1">Calibrate before you sync.</p>
      </div>`,
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Frequency Configuration 📡</h2>
        <p class="text-stone-400 text-xs mt-1">Calibrate before you sync.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-5 px-5 py-5">`,
  'GM open'
);

// Closing: insert </div> to close the scroll body before the overlay outer close
replaceOnce(
  `      </button>

    </div>
  </div>

  <!-- Near-Sync overlay (Great Minds)`,
  `      </button>
      </div>

    </div>
  </div>

  <!-- Near-Sync overlay (Great Minds)`,
  'GM close'
);

// ── JEC settings ─────────────────────────────────────────────────────────────
// Opening: remove padding/gap; add 🍳 emoji to title; add scroll body

replaceOnce(
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5">

      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">The Pantry Cabinet</h2>
        <p class="text-stone-400 text-xs mt-1">Prep before you cook.</p>
      </div>`,
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">The Pantry Cabinet 🍳</h2>
        <p class="text-stone-400 text-xs mt-1">Prep before you cook.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-5 px-5 py-5">`,
  'JEC open + emoji'
);

replaceOnce(
  `      </button>

    </div>
  </div>

  <!-- JEC How to Play overlay`,
  `      </button>
      </div>

    </div>
  </div>

  <!-- JEC How to Play overlay`,
  'JEC close'
);

// ── YGI settings ─────────────────────────────────────────────────────────────
// Opening: remove padding/gap; add scroll body (no blank line between outer div and title here)

replaceOnce(
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">House Rules 💡</h2>
        <p class="text-stone-400 text-xs mt-1">Set it before you take it.</p>
      </div>`,
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">House Rules 💡</h2>
        <p class="text-stone-400 text-xs mt-1">Set it before you take it.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-5 px-5 py-5">`,
  'YGI open'
);

// Closing: YGI has no blank line between </button> and </div>
replaceOnce(
  `      </button>
    </div>
  </div>

  <!-- YGI How to Play overlay`,
  `      </button>
      </div>
    </div>
  </div>

  <!-- YGI How to Play overlay`,
  'YGI close'
);

// ── LTTP settings ─────────────────────────────────────────────────────────────

replaceOnce(
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl px-6 pt-6 pb-8 flex flex-col gap-5">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Night Out Settings 🗺️</h2>
        <p class="text-xs text-stone-400 mt-1">What's the plan tonight?</p>
      </div>`,
  `class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Night Out Settings 🗺️</h2>
        <p class="text-xs text-stone-400 mt-1">What's the plan tonight?</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-5 px-5 py-5">`,
  'LTTP open'
);

replaceOnce(
  `      </button>
    </div>
  </div>

  <!-- HOW TO PLAY OVERLAY`,
  `      </button>
      </div>
    </div>
  </div>

  <!-- HOW TO PLAY OVERLAY`,
  'LTTP close'
);

// ── Write ─────────────────────────────────────────────────────────────────────

if (process.exitCode === 1) {
  console.error('\nAborted — no file written.');
} else if (html === orig) {
  console.error('ERROR: html unchanged after all replacements — something went wrong.');
} else {
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('\nindex.html written successfully (8 replacements).');
}
