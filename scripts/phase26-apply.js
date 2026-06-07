const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const orig = html;
let count = 0;

// ── PASS 1: Modal borders ─────────────────────────────────────────────────────
// Add border border-[brand]-300 to every overlay-modal-inner that lacks a border.
// Determine brand from last game-section marker before the match.

function getBrandForPos(pos) {
  const before = html.substring(0, pos);
  const markers = [
    ['BAILED', 'stone'],
    ['DEEP-SEA DEPLOY', 'cyan'],
    ['NATURAL SELECTION', 'lime'],
    ['LATE TO THE PARTY', 'red'],
    ['YOU GET IT', 'orange'],
    ['JUST ENOUGH COOKS', 'amber'],
    ['SECRET SIGNALS', 'teal'],
    ['GREAT MINDS', 'purple'],
    ['MULTIPLAYER', 'stone'],
  ];
  for (const [marker, color] of markers) {
    if (before.includes(marker)) return color;
  }
  return 'pink'; // LI5 (earliest section)
}

const regex = /class="(overlay-modal-inner[^"]*)"/g;
let match;
const replacements = [];
while ((match = regex.exec(html)) !== null) {
  const fullClass = match[1];
  if (fullClass.includes('border border-')) continue;
  const brand = getBrandForPos(match.index);
  const newClass = fullClass + ' border border-' + brand + '-300';
  replacements.push({ index: match.index, orig: match[0], repl: 'class="' + newClass + '"' });
}
replacements.reverse().forEach(r => {
  html = html.substring(0, r.index) + r.repl + html.substring(r.index + r.orig.length);
  count++;
});
console.log('Modal borders added:', count);

// ── PASS 1b: Structural conversions ───────────────────────────────────────────
// Old-pattern modals that need full conversion.

// LI5 skip-turn (old pre-library modal)
const li5_skip_old = 'bg-white rounded-2xl p-8 w-full max-w-sm text-center flex flex-col gap-3 shadow-xl';
const li5_skip_new = 'overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-pink-300';
if (html.includes(li5_skip_old)) { html = html.replace(li5_skip_old, li5_skip_new); console.log('LI5 skip-turn converted'); }
else console.log('WARN: LI5 skip-turn old pattern not found');

// LI5 play-again: bg-white -> bg-stone-50 (overlay-modal-inner already present, gets border from regex above, just fix bg)
const li5_pa_old = 'overlay-modal-inner bg-white w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center';
const li5_pa_new = 'overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center';
if (html.includes(li5_pa_old)) { html = html.replace(li5_pa_old, li5_pa_new); console.log('LI5 play-again bg-white fixed'); }

// SS three old-pattern modals (override, quit, play-again) — use gap-3 (actual pattern)
const ss_old = 'bg-white rounded-2xl p-8 w-full max-w-sm text-center flex flex-col gap-3 shadow-xl';
const ss_new = 'overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-teal-300';
let ssCount = 0;
while (html.includes(ss_old)) { html = html.replace(ss_old, ss_new); ssCount++; }
if (ssCount) console.log('SS old-pattern modals converted:', ssCount);
else console.log('WARN: SS old pattern not found');

// JEC oversight old pattern
const jec_old = 'bg-white rounded-3xl px-6 pt-6 pb-8 w-full max-w-sm flex flex-col gap-4 text-center shadow-xl';
const jec_new = 'overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-amber-300';
if (html.includes(jec_old)) { html = html.replace(jec_old, jec_new); console.log('JEC oversight converted'); }
else console.log('WARN: JEC oversight old pattern not found');

// GM boost/near-sync/override/new-frequency: missing rounded-3xl
// These use overlay-modal-inner but without rounded-3xl and border
// Pattern: overlay-modal-inner bg-stone-50 w-full max-w-sm px-6 pt-6 pb-8 flex flex-col gap-4
const gm_no_round_old = 'overlay-modal-inner bg-stone-50 w-full max-w-sm px-6 pt-6 pb-8 flex flex-col gap-4';
const gm_no_round_new = 'overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 border border-purple-300';
let gmCount = 0;
while (html.includes(gm_no_round_old)) { html = html.replace(gm_no_round_old, gm_no_round_new); gmCount++; }
if (gmCount) console.log('GM modals fixed (missing rounded-3xl):', gmCount);
else console.log('WARN: GM no-rounded pattern not found');

// ── PASS 2: [?] header button IDs ─────────────────────────────────────────────

// LI5: rename btn-li5-active-tip -> btn-li5-how-to
if (html.includes('id="btn-li5-active-tip"')) {
  html = html.replace('id="btn-li5-active-tip"', 'id="btn-li5-how-to"');
  console.log('LI5 [?] ID updated');
} else console.log('WARN: LI5 active-tip button not found');

// GM: add id to first btn-gm-help-open button (screen-gm-input)
const gm_help = 'class="btn-gm-help-open w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all duration-150 text-stone-300 font-mono font-bold"';
const gm_help_new = 'id="btn-gm-how-to" class="btn-gm-help-open w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all duration-150 text-stone-300 font-mono font-bold"';
if (html.includes(gm_help)) { html = html.replace(gm_help, gm_help_new); console.log('GM [?] ID added'); }
else console.log('WARN: GM help button not found');

// SS: rename btn-ss-encrypt-tip -> btn-ss-how-to
if (html.includes('id="btn-ss-encrypt-tip"')) {
  html = html.replace('id="btn-ss-encrypt-tip"', 'id="btn-ss-how-to"');
  console.log('SS [?] ID updated');
} else console.log('WARN: SS encrypt-tip button not found');

// JEC: rename btn-jec-prep-tip -> btn-jec-how-to
if (html.includes('id="btn-jec-prep-tip"')) {
  html = html.replace('id="btn-jec-prep-tip"', 'id="btn-jec-how-to"');
  console.log('JEC [?] ID updated');
} else console.log('WARN: JEC prep-tip button not found');

// YGI: rename btn-ygi-input-tip -> btn-ygi-how-to
if (html.includes('id="btn-ygi-input-tip"')) {
  html = html.replace('id="btn-ygi-input-tip"', 'id="btn-ygi-how-to"');
  console.log('YGI [?] ID updated');
} else console.log('WARN: YGI input-tip button not found');

// LTTP: add id to btn-lttp-help-open on screen-lttp-chat
const lttp_help = 'class="btn-lttp-help-open text-white/50 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
const lttp_help_new = 'id="btn-lttp-how-to" class="btn-lttp-help-open text-white/50 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
if (html.includes(lttp_help)) { html = html.replace(lttp_help, lttp_help_new); console.log('LTTP [?] ID added'); }
else console.log('WARN: LTTP help button not found');

// NAT: add id to first btn-nat-help-open (screen-nat-observation)
const nat_help = 'class="btn-nat-help-open text-stone-300 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
const nat_help_new = 'id="btn-nat-how-to" class="btn-nat-help-open text-stone-300 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
if (html.includes(nat_help)) { html = html.replace(nat_help, nat_help_new); console.log('NAT [?] ID added'); }
else console.log('WARN: NAT help button not found');

// DSD captain: add id to btn-dsd-help-open (captain screen)
const dsd_help = 'class="btn-dsd-help-open text-stone-300 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
const dsd_help_new = 'id="btn-dsd-how-to" class="btn-dsd-help-open text-stone-300 font-mono font-bold text-xl active:scale-90 transition-transform duration-100"';
if (html.includes(dsd_help)) { html = html.replace(dsd_help, dsd_help_new); console.log('DSD captain [?] ID added'); }
else console.log('WARN: DSD help button not found');

// DSD crew: add [?] button between speaker and quit buttons
const dsd_crew_old = '        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>\n        <button class="btn-dsd-quit-open text-xl text-stone-400 active:scale-90 transition-transform duration-100">✕</button>\n      </div>\n    </div>\n    <!-- Ping banner -->';
const dsd_crew_new = '        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>\n        <button class="btn-dsd-help-open text-stone-300 font-mono font-bold text-xl active:scale-90 transition-transform duration-100">?</button>\n        <button class="btn-dsd-quit-open text-xl text-stone-400 active:scale-90 transition-transform duration-100">✕</button>\n      </div>\n    </div>\n    <!-- Ping banner -->';
if (html.includes(dsd_crew_old)) { html = html.replace(dsd_crew_old, dsd_crew_new); console.log('DSD crew [?] button added'); }
else console.log('WARN: DSD crew header string not found');

// ── Write ─────────────────────────────────────────────────────────────────────
if (html !== orig) {
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('\nindex.html written successfully.');
} else {
  console.log('\nNo changes made.');
}
