// Rewrites all 8 How to Play overlays in index.html to the canonical structure.
// Run from the project root: node scripts/rewrite-how-to-overlays.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// Replace an overlay div (including its content) with newHtml.
// Uses balanced <div>...</div> counting to find the exact closing tag.
function replaceOverlay(src, overlayId, newHtml) {
  const startMarker = `<div id="${overlayId}"`;
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Overlay "${overlayId}" not found`);

  let depth = 0;
  let i = startIdx;
  let endIdx = -1;

  while (i < src.length) {
    if (src[i] === '<') {
      if (src.startsWith('<div', i) && /[\s>]/.test(src[i + 4])) {
        depth++;
        i += 4;
      } else if (src.startsWith('</div>', i)) {
        depth--;
        if (depth === 0) {
          endIdx = i + 6;
          break;
        }
        i += 6;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  if (endIdx === -1) throw new Error(`No matching </div> for "${overlayId}"`);
  return src.slice(0, startIdx) + newHtml + src.slice(endIdx);
}

// ── New overlay HTML blocks ──────────────────────────────────────────────────

const LI5 = `<div id="li5-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 💬</h2>
        <p class="text-xs text-stone-400 mt-1">Describe the word without saying anything on the No-No List.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-pink-500">Step 1</p>
          <p class="font-bold text-stone-800">Divide into two teams.</p>
          <p class="text-stone-500 text-sm">One person describes the <span class="font-semibold text-stone-700">Word</span> on screen while their team guesses. Get as many right as you can before the timer runs out!</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-pink-500">Step 2</p>
          <p class="font-bold text-stone-800">Don't say the No-No words.</p>
          <p class="text-stone-500 text-sm">You also can't say any part of the main word. Use your hands, sounds, or wild metaphors — just no cheating, yeah?</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-pink-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Points on every outcome.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>✅ <span class="font-semibold text-stone-700">Correct</span> — your team got it, ripper!</li>
            <li>❌ <span class="font-semibold text-stone-700">No-No!</span> — busted! Points off.</li>
            <li>⏩ <span class="font-semibold text-stone-700">Skip</span> — too hard? Pass it on.</li>
            <li>✨ <span class="font-semibold text-stone-700">Sylly words</span> — tricky ones worth double points.</li>
          </ul>
        </div>
        <button id="btn-li5-how-to-close" class="min-h-14 w-full rounded-2xl bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const GM = `<div id="gm-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🧠</h2>
        <p class="text-xs text-stone-400 mt-1">Find the same connecting word as your partner.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 1</p>
          <p class="font-bold text-stone-800">Two players. One word pair.</p>
          <p class="text-stone-500 text-sm">You're each shown the same pair of words. Your job: think of one word that connects them both — without talking to each other.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 2</p>
          <p class="font-bold text-stone-800">Enter your word privately.</p>
          <p class="text-stone-500 text-sm">No peeking! Each player enters their word without showing the other. You also can't use any part of either starting word.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 3</p>
          <p class="font-bold text-stone-800">Reveal and check for a match.</p>
          <p class="text-stone-500 text-sm">After the countdown, both answers are revealed. If they match — <span class="font-semibold text-stone-700">Mind Meld! 🧠</span> If not, your two words become the new starting pair. Keep going until you meld!</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Fewer rounds is more impressive.</p>
          <p class="text-stone-500 text-sm">The game ends when you achieve <span class="font-semibold text-stone-700">Neural Link</span> — both words match. The fewer rounds it took, the stronger the connection. Lower rounds = bigger brains. 🧠</p>
        </div>
        <button id="btn-gm-how-to-close" class="min-h-14 w-full rounded-2xl bg-purple-500 hover:bg-purple-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const SS = `<div id="ss-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 📡</h2>
        <p class="text-xs text-stone-400 mt-1">Encrypt your vault. Intercept theirs.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-teal-500">Step 1</p>
          <p class="font-bold text-stone-800">Each team memorises their vault.</p>
          <p class="text-stone-500 text-sm">Your team gets 4 secret keywords numbered 1–4. Only your team can see them — memorise them!</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-teal-500">Step 2</p>
          <p class="font-bold text-stone-800">Encrypt your broadcast.</p>
          <p class="text-stone-500 text-sm">Each round, your <span class="font-semibold text-stone-700">Encoder</span> receives a secret code (e.g. 3-1-4). Give one clue per number — cryptic enough to fool the enemy, clear enough for your own team.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-teal-500">Step 3</p>
          <p class="font-bold text-stone-800">Intercept or decode.</p>
          <p class="text-stone-500 text-sm">The enemy team tries to crack your code first — that's an 🕵️ <span class="font-semibold text-stone-700">Interception</span>. Then your own team decodes it. Get it wrong and it's a <span class="font-semibold text-stone-700">Misfire</span> 💥.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-teal-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Intercept to win. Don't misfire.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>🕵️ <span class="font-semibold text-stone-700">Intercept</span> — enemy cracked your code. They score.</li>
            <li>💥 <span class="font-semibold text-stone-700">Misfire</span> — your own team got it wrong. Two misfires and you lose.</li>
            <li>First team to reach the interception target wins.</li>
          </ul>
        </div>
        <button id="btn-ss-how-to-close" class="min-h-14 w-full rounded-2xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const JEC = `<div id="jec-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🍳</h2>
        <p class="text-xs text-stone-400 mt-1">Think the same as just enough people — not too many, not too few.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 1</p>
          <p class="font-bold text-stone-800">Everyone sees the same food.</p>
          <p class="text-stone-500 text-sm">A food item — like "Pizza" or "Nachos" — appears on screen. Everyone reads it, then each <span class="font-semibold text-stone-700">Chef</span> takes a turn privately.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 2</p>
          <p class="font-bold text-stone-800">Each Chef secretly picks 3 ingredients.</p>
          <p class="text-stone-500 text-sm">What would you put in this dish? Think carefully — you want to match others without being too obvious.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 3</p>
          <p class="font-bold text-stone-800">Hit the Sweet Spot.</p>
          <p class="text-stone-500 text-sm">After all Chefs submit, ingredients are revealed. A <span class="font-semibold text-stone-700">Chef's Kiss ✨</span> hits the Sweet Spot — shared by just the right number of players. Too common is <span class="font-semibold text-stone-700">Too Many Cooks!</span> Too rare is <span class="font-semibold text-stone-700">A Bit Pongy!</span></p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Most Golden ingredients wins.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>✨ <span class="font-semibold text-stone-700">Chef's Kiss</span> — hit the Sweet Spot. Full points!</li>
            <li>🤢 <span class="font-semibold text-stone-700">Too Many Cooks</span> — too common. Points drop (penalty on: −2 per extra Chef).</li>
            <li>🍂 <span class="font-semibold text-stone-700">A Bit Pongy</span> — nobody else picked it (penalty on: −10 pts).</li>
          </ul>
        </div>
        <button id="btn-jec-how-to-close" class="min-h-14 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const YGI = `<div id="ygi-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🃏</h2>
        <p class="text-xs text-stone-400 mt-1">Fill in the blank. Vote for the take you relate to most.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">Step 1</p>
          <p class="font-bold text-stone-800">Read the Situation aloud.</p>
          <p class="text-stone-500 text-sm">Everyone reads <span class="font-semibold text-stone-700">The Situation</span> together. It has a blank — that's <span class="font-semibold text-stone-700">The Gap</span> you'll fill with your answer.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">Step 2</p>
          <p class="font-bold text-stone-800">Submit your Take.</p>
          <p class="text-stone-500 text-sm">Pass the phone around. Each player secretly picks a <span class="font-semibold text-stone-700">Number</span> and writes something for The Gap. Your combined answer should slot right into the sentence.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">Step 3</p>
          <p class="font-bold text-stone-800">The Lineup is revealed.</p>
          <p class="text-stone-500 text-sm">All Takes appear at once 🃏, sorted lowest to highest. No names — just the answers. Read them out.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">Step 4</p>
          <p class="font-bold text-stone-800">Give the Nod.</p>
          <p class="text-stone-500 text-sm">Vote for the take you relate to most. You can't vote for your own.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-orange-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">The Nod decides everything.</p>
          <p class="text-stone-500 text-sm">1st most votes = 3 pts, 2nd = 2 pts, 3rd = 1 pt. Most points across all Situations wins. The take everyone vibes with wins the round.</p>
        </div>
        <button id="btn-ygi-how-to-close" class="min-h-14 w-full rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const LTTP = `<div id="lttp-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🏃‍♂️</h2>
        <p class="text-xs text-stone-400 mt-1">Figure out the secret address. Don't blow your cover.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">Step 1</p>
          <p class="font-bold text-stone-800">Roles are assigned in secret.</p>
          <p class="text-stone-500 text-sm">One player is the <span class="font-semibold text-stone-700">Friend of a Friend</span> — they don't know the location and are trying to blend in. Everyone else is <span class="font-semibold text-stone-700">The Gang</span> — they see a shortlist of possible locations that narrows each plan.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">Step 2</p>
          <p class="font-bold text-stone-800">Players message each other over 4 Plans.</p>
          <p class="text-stone-500 text-sm">Each lap, every player messages one other player. The Gang's shortlist narrows: <span class="font-semibold text-stone-700">6 → 3 → 1 location</span>. By Plan 3, The Gang knows the exact spot — but the Friend of a Friend might too if they've been paying attention.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">Step 3</p>
          <p class="font-bold text-stone-800">Use the map to track locations.</p>
          <p class="text-stone-500 text-sm">Open 🗺️ any time. <span class="font-semibold text-stone-700">The Gang</span> see their narrowing highlights. <span class="font-semibold text-stone-700">Friend of a Friend</span> sees all locations and can annotate ✅ Safe or ❌ Dead End.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">Step 4</p>
          <p class="font-bold text-stone-800">Plan 4 — Last Drinks.</p>
          <p class="text-stone-500 text-sm">After the final plan, everyone votes on who they think is the <span class="font-semibold text-stone-700">Friend of a Friend</span>, and the Friend of a Friend pins their guess on the map.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-red-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Points for the right read.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>📍 <span class="font-semibold text-stone-700">Friend of a Friend pins correctly</span> → +10 pts.</li>
            <li>🕵️ <span class="font-semibold text-stone-700">The Gang keeps the secret</span> → +5 each.</li>
            <li>🃏 <span class="font-semibold text-stone-700">Troublemaker plants a fake</span> → +20 if the Friend of a Friend pins it.</li>
          </ul>
        </div>
        <button id="btn-lttp-how-to-done" class="min-h-14 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const NAT = `<div id="nat-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🦁</h2>
        <p class="text-xs text-stone-400 mt-1">Natural Selection — a wildlife documentary goes wrong.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">Step 1</p>
          <p class="font-bold text-stone-800">Roles are Assigned.</p>
          <p class="text-stone-500 text-sm">Each habitat draws a new Specimen. Roles are secretly assigned and revealed one at a time:</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li><span class="font-semibold text-stone-700">🔬 Lead Biologist (1)</span> — sees the full animal name.</li>
            <li><span class="font-semibold text-stone-700">📋 Field Researchers</span> — each sees a different detail word about the animal.</li>
            <li><span class="font-semibold text-stone-700">🕵️ The Mole (1)</span> — only knows the broad grouping (e.g. "Sea Creature"). Trying to blend in.</li>
          </ul>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">Step 2</p>
          <p class="font-bold text-stone-800">The Observation.</p>
          <p class="text-stone-500 text-sm">Over several Observation Days, each player submits one word to describe the Specimen. Turn order is random each day. You can't use the animal's name, and you can't repeat a word already given this habitat.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">Step 3</p>
          <p class="font-bold text-stone-800">The Selection.</p>
          <p class="text-stone-500 text-sm">Once all days are done, the field notes are revealed. Each player votes for who they think is The Mole. Most votes = exposed.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">Step 4</p>
          <p class="font-bold text-stone-800">The Last Stand.</p>
          <p class="text-stone-500 text-sm">If The Mole is caught, they get one final chance — name the Specimen. The Lead Biologist decides if it counts. +10 Credibility either way for a correct guess.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-lime-600">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Credibility decides the winner.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>Mole escapes → <span class="font-semibold text-stone-700">+Escape Bonus</span> to The Mole.</li>
            <li>Mole names Specimen correctly → <span class="font-semibold text-stone-700">+10</span> to The Mole.</li>
            <li>Mole caught → <span class="font-semibold text-stone-700">+10</span> to each Field Researcher &amp; Biologist.</li>
            <li>Discredited clue (Peer Review) → <span class="font-semibold text-stone-700">−5</span> to the author.</li>
          </ul>
        </div>
        <button id="btn-nat-howto-close" class="min-h-14 w-full rounded-2xl bg-lime-600 hover:bg-lime-700 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

const DSD = `<div id="dsd-how-to-overlay" style="display:none" class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play ⚓</h2>
        <p class="text-xs text-stone-400 mt-1">How to run a successful deployment.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-5 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">Step 1</p>
          <p class="font-bold text-stone-800">The Grid.</p>
          <p class="text-stone-500 text-sm">A 5×5 grid of 25 words is dealt face-down. Words belong to one of four roles: <span class="font-semibold text-stone-700">Friendly Payloads</span> (9 for the first team, 8 for the second), <span class="font-semibold text-stone-700">Enemy Payloads</span>, <span class="font-semibold text-stone-700">Spiked Urchins</span>, and <span class="font-semibold text-stone-700">Mines</span>. Only the Captain can see the roles.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">Step 2</p>
          <p class="font-bold text-stone-800">The Captain gives a Sonar Ping.</p>
          <p class="text-stone-500 text-sm">The Captain sees the colour-coded grid and gives the Crew a <span class="font-semibold text-stone-700">Sonar Ping</span> — one word + one number. The word hints at multiple targets. The number says how many payloads it covers.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">Step 3</p>
          <p class="font-bold text-stone-800">The Crew taps their sequence.</p>
          <p class="text-stone-500 text-sm">Using the Sonar Ping, the Crew taps grid words in the order they want to reveal them, then launches the sequence. You can guess up to the Captain's number + 1, or stop early.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">Step 4</p>
          <p class="font-bold text-stone-800">Hazard outcomes.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>✅ <span class="font-semibold text-stone-700">Friendly Payload</span> — +10 Valour, keep going.</li>
            <li>⚠️ <span class="font-semibold text-stone-700">Enemy Payload</span> — enemy gains +10 Valour.</li>
            <li>🦔 <span class="font-semibold text-stone-700">Spiked Urchin</span> — −5 Valour.</li>
            <li>💣 <span class="font-semibold text-stone-700">Pressure Mine</span> — −20 Valour.</li>
            <li>💀 <span class="font-semibold text-stone-700">Nuclear Mine</span> — −1000 Valour, game over.</li>
          </ul>
          <p class="text-stone-400 text-xs mt-1">Whether hazards end your turn is controlled in Settings.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-cyan-700">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Highest Valour wins.</p>
          <p class="text-stone-500 text-sm">The game ends when a team arms all of their payloads. The team with the <span class="font-semibold text-stone-700">highest Valour</span> wins — not necessarily the team that finished first.</p>
        </div>
        <button id="btn-dsd-howto-done" class="min-h-14 w-full rounded-2xl bg-cyan-700 hover:bg-cyan-800 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          Got it
        </button>
      </div>
    </div>
  </div>`;

// ── Apply replacements ───────────────────────────────────────────────────────
// LI5 uses the legacy non-prefixed id "how-to-overlay"
html = replaceOverlay(html, 'how-to-overlay', LI5);
html = replaceOverlay(html, 'ss-how-to-overlay', SS);
html = replaceOverlay(html, 'gm-how-to-overlay', GM);
html = replaceOverlay(html, 'jec-how-to-overlay', JEC);
html = replaceOverlay(html, 'ygi-how-to-overlay', YGI);
html = replaceOverlay(html, 'lttp-how-to-overlay', LTTP);
html = replaceOverlay(html, 'nat-how-to-overlay', NAT);
html = replaceOverlay(html, 'dsd-how-to-overlay', DSD);

fs.writeFileSync(filePath, html, 'utf8');
console.log('✓ All 8 How to Play overlays rewritten successfully.');
