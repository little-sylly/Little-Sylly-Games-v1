// ═══════════════════════════════════════════════════════════════════════════
// lounge.js — TV mode, artboard 2a "The Lounge". Sandbox only (wip/lobby-lab/).
//
// Spec: wip/tv-mode-design/README.md (read whole). Design reference:
// wip/tv-mode-design/TV Mode.dc.html, artboard `2a` + its x-dc runtime.
// Plan: docs/superpowers/plans/2026-09-17-tv-lounge-2a.md
//
// Why its own file, and its own renderer:
//   lobby.js's lbSet() rebuilds every mount with innerHTML = ''. That is fine
//   for the phone — it has no live state below the DOM. The rail does: a
//   scrollLeft, a rAF handle, an in-flight smooth scroll and a drag. A rebuild
//   on every keycap tap would reset the rail to position zero mid-drift. So
//   the Lounge builds its DOM ONCE per mount and patches in place after
//   (lgApply), and lobby.js's two mount functions became idempotent to suit.
//
// Live instances (Pane 3's #wide-canvas and tv.html's #tv-app can both be up)
// are tracked in LG_INSTANCES; each owns its own rail scroll and rAF, and is
// torn down when its root leaves the document — the § Timer Lifecycle rule
// (logic-engine.md) applied to a rAF, exactly as nt.js does for ntRafHandle.
//
// Shared with the phone lobby, never duplicated: lbState.count / .onePhone
// (the two filters ARE the phone's filters), lbWhyOut, lbSortByFit, lbGame,
// lbFitLine, lbControllerSVG, LB_NO_STICKER, lbEsc. Those all resolve at CALL
// time, which is what lets this file load before lobby.js.
// ═══════════════════════════════════════════════════════════════════════════

// ── The Lounge's own state. The two FILTERS are not here — they live in
// lbState.count / lbState.onePhone, because they are the same two questions
// the phone asks and a player moving between layouts keeps their answer.
const LOUNGE = {
  shelf: null,        // open shelf id, or null for the picker
  sel: null,          // selected game id, or null for the boxed-set stack
  focus: 0,           // rail keyboard focus, an index into LG_ORDER
  spinning: false,    // Random Game tween in flight
  plainCta: false,    // #plaincta — flips all 20 Play labels to "Play"
};

// A fixed, designed shuffle — NOT games.js order. It spaces the brand hues so
// no two neighbouring boxes read as the same colour. Verified against games.js
// by verify-lounge.js, both directions.
const LG_ORDER = ['pko','li5','cjar','cld','gm','nat','flw','dsd','ygi','shp','bld','ss','frt','gth','dyb','jec','nt','comb','lttp','pass'];
const LG_ITEM = 166;                       // 150px box + 16px gap
const LG_COPIES = 5;                       // 5, not 3: a 1920 viewport must never see the seam
const LG_W = LG_ORDER.length * LG_ITEM;    // 3320 — one full list

// ── Colour: ink by luminance, label by darkening ─────────────────────────────
// README § 6: "Ink on brand fills is chosen by luminance (>0.3 -> #2B1B45,
// else white); label colours are the brand hex darkened toward plum when too
// pale for white ground." Same principle as ui-style.md § Menu Title
// Treatment — except there the app takes white ink on the four light brands
// by owner direction; here the brand fill is a big flat band, not a button,
// and the mock's own rule governs.
function lgLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function lgInk(hex) { return lgLum(hex) > 0.3 ? '#2B1B45' : '#FFFFFF'; }
function lgLabel(hex) { return lgLum(hex) > 0.45 ? `color-mix(in oklab, ${hex} 70%, #2B1B45)` : hex; }

// ── Deterministic per-game tilt and sway phase ──────────────────────────────
// Hash of the id, so a game's sticker sits at the same angle on every load and
// in every screenshot. Range +/-7deg (README § 5b).
function lgTilt(id) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 15) - 7) + 'deg';
}
function lgSwaySeed(id) {
  let h = 0; for (const ch of id) h = (h * 37 + ch.charCodeAt(0)) % 991;
  return (h % 140) / 100;
}

// ── The rail's arithmetic ────────────────────────────────────────────────────
// Keep scrollLeft inside the middle copies so the ends are never on screen.
function lgWrap(sl) {
  if (sl < LG_W * 1.5) return sl + LG_W;
  if (sl > LG_W * 3.5) return sl - LG_W;
  return sl;
}
// Which of the 5 copies of `idx` is nearest where we already are. Without
// this, selecting index 0 while sitting on index 19 hauls the rail backwards
// past all 20 boxes — the visible "yank" README § 7.5 warns about.
function lgNearestCopy(sl, idx) {
  let best = 0, bestDist = Infinity;
  for (let c = 0; c < LG_COPIES; c++) {
    const d = Math.abs((c * LG_ORDER.length + idx) * LG_ITEM - sl);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// ── Copy helpers ─────────────────────────────────────────────────────────────
// The pane heading is two-toned: everything but the last word in plum, the
// last word in the game's label colour (ui-style.md § Menu Title Treatment).
function lgSplitName(name) {
  const w = name.split(' ');
  return w.length > 1 ? { a: w.slice(0, -1).join(' ') + ' ', b: w[w.length - 1] } : { a: '', b: name };
}

// ── The JS half of the reduced-motion contract ───────────────────────────────
// css/styles.css's global block zeroes animation/transition durations and CSS
// scroll-behavior. It reaches NONE of: the rail's rAF drift, scrollTo's
// explicit {behavior:'smooth'} (a JS option that overrides the CSS property),
// or the Random spin's own 1800 ms tween. Each checks this itself. Reference
// shape: combReducedMotion(), js/games/comb.js:1309.
function lgReduced() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

if (typeof module !== 'undefined') module.exports = {
  LOUNGE, LG_ORDER, LG_ITEM, LG_COPIES, LG_W,
  lgLum, lgInk, lgLabel, lgTilt, lgSwaySeed, lgWrap, lgNearestCopy, lgSplitName, lgReduced,
};
if (typeof window !== 'undefined') window.LOUNGE = LOUNGE;
