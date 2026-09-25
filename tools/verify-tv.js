// verify-tv.js — the pure tier of the TV layout (js/lobby/tv.js; the sandbox called it the Lounge).
// Zero dependencies. Covers the arithmetic a browser can't tell you is wrong:
// the rail's loop wrap, the nearest-copy pick that stops wrap-edge yank, the
// ink/label luminance split, and ORDER's agreement with games.js.
// Run: node tools/verify-tv.js
const { GAMES } = require('../js/lobby/lobby-games.js');
const L = require('../js/lobby/tv.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  FAIL ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// ── ORDER integrity ─────────────────────────────────────────────────────────
console.log('ORDER');
eq(L.TV_ORDER.length, 20, 'ORDER holds 20 ids');
eq(new Set(L.TV_ORDER).size, 20, 'ORDER has no duplicates');
for (const id of L.TV_ORDER) ok(GAMES.some(g => g.id === id), `ORDER id "${id}" exists in games.js`);
for (const g of GAMES) ok(L.TV_ORDER.includes(g.id), `games.js id "${g.id}" appears in ORDER`);
eq(L.TV_W, 20 * 166, 'W = 20 x ITEM');

// ── Ink and label by luminance ──────────────────────────────────────────────
// Threshold is >0.3 for ink (README § 6). Light-fill brands must take plum ink.
console.log('ink / label');
eq(L.tvInk('#FFE500'), '#2B1B45', 'FRT electric lemon takes plum ink');
eq(L.tvInk('#F0A500'), '#2B1B45', 'COMB honey gold takes plum ink');
eq(L.tvInk('#8ECAE6'), '#2B1B45', 'CLD glacier takes plum ink');
eq(L.tvInk('#18181B'), '#FFFFFF', 'PASS zinc-900 takes white ink');
eq(L.tvInk('#991B1B'), '#FFFFFF', 'BLD dark red takes white ink');
for (const g of GAMES) ok(['#2B1B45', '#FFFFFF'].includes(L.tvInk(g.brandHex)), `${g.id} ink resolves`);
// Pale brands get a darkened label so the heading's second word is readable
// on the off-white ground (ui-style.md § Menu Title Treatment, same principle).
ok(L.tvLabel('#FFE500') !== '#FFE500', 'FRT label is darkened, not the raw fill');
eq(L.tvLabel('#18181B'), '#18181B', 'a dark brand is its own label colour');

// ── Tilt: deterministic, bounded ±7deg ──────────────────────────────────────
console.log('tilt');
for (const g of GAMES) {
  const t = L.tvTilt(g.id);
  ok(/^-?\d+(\.\d+)?deg$/.test(t), `${g.id} tilt is a deg string (${t})`);
  const n = parseFloat(t);
  ok(n >= -7 && n <= 7, `${g.id} tilt within +/-7deg (${n})`);
  eq(L.tvTilt(g.id), t, `${g.id} tilt is deterministic`);
}

// ── The loop wrap ───────────────────────────────────────────────────────────
// 5 copies; scrollLeft is kept inside [1.5W, 3.5W] so the seam is never on
// screen even on a 1920-wide viewport.
console.log('wrap');
const W = L.TV_W;
eq(L.tvWrap(2 * W), 2 * W, 'mid-range is untouched');
eq(L.tvWrap(1.4 * W), 2.4 * W, 'below 1.5W adds W');
eq(L.tvWrap(3.6 * W), 2.6 * W, 'above 3.5W subtracts W');
eq(L.tvWrap(1.5 * W), 1.5 * W, 'exactly 1.5W is inside the window');
eq(L.tvWrap(3.5 * W), 3.5 * W, 'exactly 3.5W is inside the window');
for (let s = 0; s <= 5 * W; s += 137) {
  const w = L.tvWrap(s);
  ok(Math.abs(((w - s) % W)) < 1e-6, `wrap(${s}) moves by a whole W`);
}

// ── Nearest copy: the anti-yank rule ────────────────────────────────────────
// Picking the copy nearest the CURRENT offset is what stops a wrap-edge game
// (index 0 or 19) hauling the rail the length of the whole list.
console.log('nearest copy');
const ITEM = L.TV_ITEM, n = 20;
eq(L.tvNearestCopy(2 * W, 0), 2, 'at 2W, index 0 picks copy 2 (zero distance)');
// ...and index 19 picks copy ONE — its last box sits immediately left of
// where we are, one item away, against copy 2's nineteen. This is the rule
// doing its job, not an off-by-one: the nearest copy is frequently not the
// one we are standing in.
eq(L.tvNearestCopy(2 * W, 19), 1, 'at 2W, index 19 picks the copy BEHIND (1 item back, not 19 forward)');
// Sitting just past the end of copy 2 (index 19), reaching for index 0 must
// take copy 3 — one item forward — not copy 2, which is 19 items back.
const at19 = (2 * n + 19) * ITEM;
eq(L.tvNearestCopy(at19, 0), 3, 'just past index 19, index 0 takes the NEXT copy');
// And the mirror: sitting on index 0 of copy 3, reaching for 19 takes copy 2.
const at0c3 = (3 * n + 0) * ITEM;
eq(L.tvNearestCopy(at0c3, 19), 2, 'on index 0, index 19 takes the PREVIOUS copy');
for (let c = 0; c < 5; c++) for (const idx of [0, 7, 19]) {
  const here = (c * n + idx) * ITEM;
  eq(L.tvNearestCopy(here, idx), c, `standing on copy ${c} index ${idx} picks itself`);
}
// No pick may ever be more than half the list away.
for (let s = 1.5 * W; s <= 3.5 * W; s += 211) for (let idx = 0; idx < n; idx++) {
  const c = L.tvNearestCopy(s, idx);
  ok(Math.abs((c * n + idx) * ITEM - s) <= (n / 2) * ITEM + ITEM,
     `pick for idx ${idx} at ${Math.round(s)} is within half a list`);
}

// ── Name split for the pane heading ─────────────────────────────────────────
console.log('name split');
eq(JSON.stringify(L.tvSplitName('Cookie Jar')), JSON.stringify({ a: 'Cookie ', b: 'Jar' }), 'two words split at the last');
eq(JSON.stringify(L.tvSplitName('Pass')), JSON.stringify({ a: '', b: 'Pass' }), 'one word is all colour');
eq(JSON.stringify(L.tvSplitName('Just Enough Cooks')), JSON.stringify({ a: 'Just Enough ', b: 'Cooks' }), 'three words keep two neutral');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
