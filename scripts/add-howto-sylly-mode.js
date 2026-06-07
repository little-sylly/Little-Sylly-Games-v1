// Add ✨ Sylly Mode cards to all games' How-to overlays
// Also rewrites BLD how-to from narrative format to canonical Step-card format
// Run from project root: node scripts/add-howto-sylly-mode.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(filePath, 'utf8');
const original = html;

// ── Helper ─────────────────────────────────────────────────────────────────

function insertBefore(anchor, insertion) {
  const idx = html.indexOf(anchor);
  if (idx === -1) { console.error('ANCHOR NOT FOUND:', anchor.slice(0, 60)); process.exit(1); }
  html = html.slice(0, idx) + insertion + html.slice(idx);
}

function replaceBetween(startAnchor, endAnchor, replacement) {
  const startIdx = html.indexOf(startAnchor);
  const endIdx   = html.indexOf(endAnchor);
  if (startIdx === -1) { console.error('START ANCHOR NOT FOUND:', startAnchor.slice(0, 60)); process.exit(1); }
  if (endIdx === -1)   { console.error('END ANCHOR NOT FOUND:', endAnchor.slice(0, 60)); process.exit(1); }
  html = html.slice(0, startIdx) + replacement + html.slice(endIdx);
}

// ── 1. Sylly Mode card insertions (7 games) ───────────────────────────────

const cards = [
  {
    anchor: '        <button id="btn-li5-how-to-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-pink-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Wild Words</p>
          <p class="text-stone-500 text-sm">Wilder words are shuffled into the deck. Correct answers score double, but Sylly Mode words carry penalties too.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-gm-how-to-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Static Interference</p>
          <p class="text-stone-500 text-sm">Each round, a random consonant is banned — no clue may contain it. Set your intensity in Settings: <span class="font-semibold text-stone-700">Mental Fog</span> for a sub-atomic challenge, or <span class="font-semibold text-stone-700">Neural Storm</span> for full supernova mayhem.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-ss-how-to-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-teal-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Intel Phase</p>
          <p class="text-stone-500 text-sm">After the main game ends, both teams take turns guessing the other team's <span class="font-semibold text-stone-700">vault keywords</span> in order. A second chance to steal the win.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-jec-how-to-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Kitchen Nightmares</p>
          <p class="text-stone-500 text-sm">Your first ingredient becomes a <span class="font-semibold text-stone-700">Signature Dish</span> — if it hits the Sweet Spot, it scores double. Also plant a <span class="font-semibold text-stone-700">Poison Word</span> to spoil anyone who matches it.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-ygi-how-to-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">The Ringer</p>
          <p class="text-stone-500 text-sm">A mystery <span class="font-semibold text-stone-700">Ghost Card</span> joins The Lineup each round. If the group gives The Nod to the Ghost instead of a real player, everyone loses points.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-nat-howto-close"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Survival of the Fittest</p>
          <p class="text-stone-500 text-sm">No Lead Biologist. Every player gets a detail word — including the player normally in that role. All clues stay hidden until <span class="font-semibold text-stone-700">The Daily Review</span> reveals them before voting.</p>
        </div>
`,
  },
  {
    anchor: '        <button id="btn-dsd-howto-done"',
    card: `        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Mission Abyss</p>
          <p class="text-stone-500 text-sm">The grid <span class="font-semibold text-stone-700">drifts</span> between deployments, scrambling unrevealed cells. Teams can also plant a <span class="font-semibold text-stone-700">Jammer</span> tile to ambush the enemy's next sequence.</p>
        </div>
`,
  },
];

for (const { anchor, card } of cards) {
  insertBefore(anchor, card);
}

// ── 2. BLD how-to full rewrite ─────────────────────────────────────────────

const bldNew = `  <!-- BLD HOW TO PLAY OVERLAY -->
  <div id="bld-how-to-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-data-backdrop flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 📋</h2>
        <p class="text-xs text-stone-400 mt-1">A social deduction game of trust, betrayal, and terrible excuses.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">Step 1</p>
          <p class="font-bold text-stone-800">Everyone gets a secret role</p>
          <p class="text-stone-500 text-sm">Players are split into <span class="font-semibold text-stone-700">Friends</span> and <span class="font-semibold text-stone-700">Flakes</span>. Friends want the plans to succeed. Flakes want them to fail — without getting caught.</p>
          <div class="mt-1">
            <p class="text-xs font-semibold text-stone-400 mb-1">Roles per player count</p>
            <table class="w-full text-xs border-collapse">
              <thead><tr class="text-stone-400"><th class="text-left py-1">Players</th><th class="text-center py-1">Friends</th><th class="text-center py-1">Flakes</th></tr></thead>
              <tbody class="text-stone-500">
                <tr><td>5</td><td class="text-center">3</td><td class="text-center">2</td></tr>
                <tr><td>6</td><td class="text-center">4</td><td class="text-center">2</td></tr>
                <tr><td>7</td><td class="text-center">4</td><td class="text-center">3</td></tr>
                <tr><td>8</td><td class="text-center">5</td><td class="text-center">3</td></tr>
                <tr><td>9</td><td class="text-center">6</td><td class="text-center">3</td></tr>
                <tr><td>10</td><td class="text-center">6</td><td class="text-center">4</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">Step 2</p>
          <p class="font-bold text-stone-800">Picking the group</p>
          <p class="text-stone-500 text-sm">The <span class="font-semibold text-stone-700">Planner</span> nominates a group to carry out the plan. Everyone votes: <span class="font-semibold text-stone-700">I'm In</span> or <span class="font-semibold text-stone-700">Not Them</span>. Majority rules. If a group is rejected <span class="font-semibold text-stone-700">5 times in a row</span>, the Flakes win immediately.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">Step 3</p>
          <p class="font-bold text-stone-800">The mission cards</p>
          <p class="text-stone-500 text-sm">Once the group is approved, each member privately submits a card. <span class="font-semibold text-stone-700">Friends must submit I'm In</span>. <span class="font-semibold text-stone-700">Flakes can choose to bail</span> — anonymously. Even one bail causes the plan to fail.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">Step 4</p>
          <p class="font-bold text-stone-800">Five plans, pass the phone</p>
          <p class="text-stone-500 text-sm">The game runs for up to 5 plans. Group sizes grow as the game progresses.</p>
          <div class="mt-1">
            <table class="w-full text-xs border-collapse">
              <thead><tr class="text-stone-400"><th class="text-left py-1">Players</th><th class="text-center py-1">Plan 1</th><th class="text-center py-1">Plan 2</th><th class="text-center py-1">Plan 3</th><th class="text-center py-1">Plan 4</th><th class="text-center py-1">Plan 5</th></tr></thead>
              <tbody class="text-stone-500">
                <tr><td>5</td><td class="text-center">2</td><td class="text-center">3</td><td class="text-center">2</td><td class="text-center">3</td><td class="text-center">3</td></tr>
                <tr><td>6</td><td class="text-center">2</td><td class="text-center">3</td><td class="text-center">4</td><td class="text-center">3</td><td class="text-center">4</td></tr>
                <tr><td>7</td><td class="text-center">2</td><td class="text-center">3</td><td class="text-center">3</td><td class="text-center">4*</td><td class="text-center">4</td></tr>
                <tr><td>8</td><td class="text-center">3</td><td class="text-center">4</td><td class="text-center">4</td><td class="text-center">5*</td><td class="text-center">5</td></tr>
                <tr><td>9</td><td class="text-center">3</td><td class="text-center">4</td><td class="text-center">4</td><td class="text-center">5*</td><td class="text-center">5</td></tr>
                <tr><td>10</td><td class="text-center">3</td><td class="text-center">4</td><td class="text-center">4</td><td class="text-center">5*</td><td class="text-center">5</td></tr>
              </tbody>
            </table>
            <p class="text-stone-400 text-xs mt-1">* Plan 4 requires 2 bails to fail at 7+ players.</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">First to three wins</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li><span class="font-semibold text-stone-700">Friends</span> — win when 3 plans succeed.</li>
            <li><span class="font-semibold text-stone-700">Flakes</span> — win when 3 plans fail.</li>
            <li><span class="font-semibold text-stone-700">5 rejections in a row</span> — Flakes win instantly, no mission needed.</li>
          </ul>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-yellow-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Drama Mode</p>
          <p class="text-stone-500 text-sm">One Friend secretly knows all the Flakes — <span class="font-semibold text-stone-700">The Pot-Stirrer</span>. One Flake becomes <span class="font-semibold text-stone-700">The Big Flake</span>. If the Friends win, the Big Flake gets one shot to name The Pot-Stirrer. A correct guess steals the win.</p>
        </div>
        <button id="btn-bld-how-to-done" class="min-h-14 w-full rounded-2xl bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>

  `;

replaceBetween('  <!-- BLD HOW TO PLAY OVERLAY -->', '  <!-- BLD QUIT OVERLAY -->', bldNew);

// ── Write ──────────────────────────────────────────────────────────────────

if (html === original) {
  console.error('No changes made — check anchor strings.');
  process.exit(1);
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Done. Changes written to index.html');
