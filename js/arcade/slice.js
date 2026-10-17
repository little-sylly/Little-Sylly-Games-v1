// ═══════════════════════════════════════════════════════════════════════════
// slice.js — ARCADE CABINET 04. Swipe-to-slice fruit (Fruit Ninja lineage),
// procedural canvas art. Set in the Fruit Salad world: the same eight fruit,
// a picnic tablecloth, the same puns — and, if you like, the Fruity
// Personalities themselves.
// NOT a Sylly Game: no multiplayer, no Sylly Mode, no harness. The one menu
// choice is cosmetic (which fruit art you slice).
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//
// Integration notes
//  - Prefix is `sl` (the character art uses `slc`, inside the same namespace).
//    Screen id: screen-arcade-slice. DOM: #sl-stage (the pointer target,
//    touch-action:none) wrapping #sl-canvas, plus #btn-sl-exit. The title is
//    the SL_TITLE constant so it can be renamed without touching anything else
//    here (the lobby button label is the only other place it's written).
//  - engine.js resetToLobby() should call resetArcadeSlice() alongside
//    resetArcade(), resetArcadeMinesweeper() and resetArcadeChicken().
//  - There are NO setTimeouts in this file. Staggered tosses, attract-screen
//    respawns, jingles and every other delayed effect are scheduled against
//    slClock and run from the RAF loop, so cancelling the loop IS the whole teardown.
//
// The Fruit Salad tie-in
//  - SL_FRUIT holds Fruit Salad's eight fruit, in the deck's order, plus the
//    one thing that must never end up in a fruit salad: a broccoli.
//  - Two art styles, picked on the start screen (slArt, remembered for the
//    session like the high scores):
//      'plain'  — plain produce (SL_FRUIT's whole/half drawings).
//      'fruity' — the Fruity Personalities (SL_CHARS): Smug Banana, Sour
//                 Lemon, Charming Peach, Dramatic Grape, Chill Watermelon,
//                 Sus Pear, Panicked Strawberry, Angry Apple, and a Sneaky
//                 Broccoli. Each is drawn in code with a little idle animation
//                 and goes cross-eyed-dizzy on its sliced halves.
//    The character art is self-contained (one draw(g, t, mood) per fruit,
//    centred on 0,0, body radius ~30) so it can be lifted out for Fruit
//    Salad's own card faces.
//  - Every fruit on screen is drawn through slDrawWhole / slDrawHalf and
//    nothing else; those two pick the style. Hit radii come from SL_FRUIT
//    in both styles, so the toggle never changes how the game plays.
//  - The words are Fruit Salad's: drop three and you're FRUIT LOOPED; slice
//    the broccoli and it's VEGETABLES?! (the quit prompt is "Vegetables
//    Instead?"); five in one swipe is a FRUIT SALAD; and the scores screen
//    asks ORANGE YOU GLAD IT'S OVER?
//
// How a run works (classic rules, nothing else)
//  - Fruit is tossed up from below the board in waves. Swipe through a fruit
//    to slice it: +1. Three or more in one swipe is a combo, worth +1 per
//    fruit on top.
//  - A whole fruit falling off the bottom is a strike. Three strikes ends the
//    run. Every 100 points wins one strike back.
//  - Slice the broccoli and the run ends on the spot.
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const SL_W = 360;
const SL_H = 640;
const SL_TAU = Math.PI * 2;

const SL_TITLE = 'CHOP SALAD';   // working title — the one place to rename the cabinet

// ── Tuning ───────────────────────────────────────────────────────────────────
const SL_GRAV            = 780;    // px/sec² at normal speed
const SL_APEX_MIN        = 120;    // a toss peaks somewhere between these two heights (y px)…
const SL_APEX_MAX        = 300;
const SL_RAMP_SCORE      = 200;    // difficulty is fully ramped by this score
const SL_SPEED_RAMP      = 0.35;   // every toss plays this much faster at full difficulty
const SL_OVERLAP_D       = 0.3;    // below this difficulty a wave waits for an empty board
const SL_FIRST_WAVE_MS   = 700;
const SL_GAP_MAX_MS      = 650;    // pause before the next wave, shrinking to…
const SL_GAP_MIN_MS      = 300;    // …this at full difficulty
const SL_STAGGER_MS      = 240;    // a one-after-another wave launches this far apart (less when hard)
const SL_BLADE_MIN_SPEED = 0.12;   // logical px/ms. A finger moving slower than this doesn't cut.
const SL_HIT_PAD         = 6;      // px of forgiveness round every fruit
const SL_TRAIL_MS        = 120;    // how long a point of the blade trail lingers
const SL_COMBO_GAP_MS    = 260;    // a swipe's combo closes once nothing's been cut for this long
const SL_COMBO_MIN       = 3;
const SL_SALAD_MIN       = 5;      // a combo this big is a FRUIT SALAD
const SL_LIFE_EVERY      = 100;    // points per strike won back
const SL_MAX_STRIKES     = 3;
const SL_SPLAT_MS        = 3200;   // juice stays on the board this long
const SL_MAX_SPLATS      = 14;
const SL_RESPAWN_MS      = 900;    // attract screen: a sliced fruit pops back after this
const SL_DYING_MS        = 1700;   // death beat before scores
const SL_TOP_N           = 5;
const SL_FRUIT_SIZE      = 1.3;    // every fruit in play is drawn (and hit-tested) this much bigger than its art
const SL_LINEUP_SCALE    = 0.98;   // the attract screen's cast
const SL_CHAR_K          = 0.86;   // character art units → fruit art units (keeps bodies inside the hit circle)
const SL_CHAR_SPIN       = 0.45;   // personalities tumble slower, so you can see their faces

// ── Palette ──────────────────────────────────────────────────────────────────
// Fruit Salad's own: electric lemon and dark ink, on a deep-teal picnic
// gingham (teal sits opposite the warm fruit, so everything pops off it).
const SL_BG       = '#05070D';
const SL_LEMON    = '#FFE500';   // Fruit Salad's brand colour
const SL_LEMON_DK = '#C9A200';   // its shadow side (button lips)
const SL_INK      = '#1F1A17';   // and its dark ink
const SL_CREAM    = '#FFF6DC';
const SL_RED      = '#F43F3F';
const SL_PINK     = '#FF8FB1';
const SL_TEAL     = '#0B5563';   // the tablecloth
const SL_PANEL    = 'rgba(28,23,20,0.94)';
const SL_SCRIM    = 'rgba(4,30,36,0.74)';
// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// AP_SOUND / MS_SOUND / CK_SOUND. Inherits isMuted and masterVolume for free.
const SL_SOUND = {
  toss:      () => playSecretBeep(220),
  vegToss:   () => playSecretBeep(1568),   // played twice: "watch out, there's a vegetable"
  miss:      () => playSecretBeep(147),
  veg:       () => playSecretBeep(98),
  phew:      () => playSecretBeep(1175),   // a strike won back
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
};
const SL_SLICE_NOTES  = [659, 784, 880, 988, 1175, 1319, 1568, 1760];   // each cut in one swipe climbs the scale
const SL_COMBO_JINGLE = [1047, 1319, 1568];
const SL_PHEW_JINGLE  = [1175, 1568];
const SL_OVER_JINGLE  = [392, 330, 262];

// What the big word says for each way to go
const SL_DEATH_WORDS = { loop: 'FRUIT LOOPED!', veg: 'VEGETABLES?!' };

// ── Layout (logical px) ──────────────────────────────────────────────────────
const SL_BTN_PLAY     = { x: 40,  y: 544, w: 280, h: 60 };
const SL_TOG_PLAIN    = { x: 26,  y: 486, w: 118, h: 42 };   // the art toggle: two halves of one pill
const SL_TOG_FRUITY   = { x: 144, y: 486, w: 190, h: 42 };
const SL_SLOTS = [
  { x:  60, y: 296, w: 66, h: 84 },
  { x: 147, y: 296, w: 66, h: 84 },
  { x: 234, y: 296, w: 66, h: 84 },
];
const SL_BTN_OK       = { x: 80,  y: 446, w: 200, h: 60 };
const SL_BTN_LB_AGAIN = { x: 24,  y: 534, w: 192, h: 60 };
const SL_BTN_LB_MENU  = { x: 228, y: 534, w: 108, h: 60 };

// The attract screen's cast: the whole Fruit Salad deck, then the one to avoid.
const SL_LINEUP = [
  ['banana', 54, 296], ['lemon', 138, 296], ['peach', 222, 296], ['grape', 306, 296],
  ['watermelon', 54, 380], ['pear', 138, 380], ['strawberry', 222, 380], ['apple', 306, 380],
  ['broccoli', 104, 450],
];

// ── Runtime state ────────────────────────────────────────────────────────────
let slCanvas = null;
let slCtx    = null;
let slBoard  = null;     // the tablecloth, painted once per size into its own canvas
let slRaf    = null;     // TIMER — cancel in every teardown (logic-engine.md)
let slLastT  = 0;
let slState  = 'attract';   // attract | playing | dying | nameEntry | leaderboard
let slClock  = 0;           // ms of un-paused time. Every delayed effect is scheduled against this.

let slItems  = [];          // whole fruit in the air: { kind, x, y, vx, vy, rot, spin, scale, pin, born, ph }
let slHalves = [];          // sliced halves: { kind, side, cut, x, y, vx, vy, rot, spin, scale, ph }
let slSplats = [];          // juice on the table: { x, y, colour, blobs, at }
let slParts  = [];
let slTexts  = [];          // floating words: { x, y, at, life, lines: [[text, font, colour]] }
let slMarks  = [];          // red ✕ where a fruit was dropped: { x, at }
let slTrail  = [];          // the blade: [{ x, y, at, brk }] — brk starts a new stroke
let slEvents = [];          // [{ at, fn }] — slClock-scheduled effects (replaces setTimeout)

let slWave     = 0;         // waves launched this run
let slPending  = 0;         // staggered launches still to come in the current wave
let slWaveAt   = null;      // when the next wave goes, once the board is ready for it
let slScore    = 0;
let slLastScore = 0;
let slScorePopAt = -1e9;
let slStrikes  = 0;
let slStrikeAt = -1e9;
let slPhewAt   = -1e9;
let slNextLifeAt = SL_LIFE_EVERY;
let slSliced   = 0;         // fruit cut this run — the hint goes once you've got the idea
let slCombo    = { n: 0, at: 0, x: 0, y: 0 };
let slDeath    = null;      // { kind, at, x, y }
let slFlashAt  = -1e9;
let slShake    = 0;         // seconds remaining
let slTitleCutAt = 0;       // the attract title's slash glint replays from here

// Which art the fruit wear: 'fruity' (the Fruity Personalities) or 'plain'.
// A session choice like the high scores — NOT reset by resetArcadeSlice().
let slArt = 'fruity';

// The single pointer currently allowed to act on #sl-stage — null when free.
// A second finger is ignored entirely (same rule as apPtrId / msPtrId / ckPtrId).
let slPtrId = null;
// The live press: { state, blade, x, y, ts }. `state` is the slState when the
// finger went down, so the press that tapped PLAY can't also slice, and a
// swipe that was cutting when the run ended stops cutting.
let slPress = null;

// Session leaderboard, highest first. Deliberately NOT cleared by
// resetArcadeSlice() — scores last the afternoon, not forever.
let slBoardScores = [];

const SL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let slInitials = [0, 0, 0];

// ── Small helpers ────────────────────────────────────────────────────────────
function slRand(a, b) { return a + Math.random() * (b - a); }
function slRandInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function slClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function slPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function slDifficulty() { return slClamp(slScore / SL_RAMP_SCORE, 0, 1); }
function slSpeedMul() { return 1 + SL_SPEED_RAMP * slDifficulty(); }

function slEaseOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1, u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

// Tiny seeded PRNG (mulberry32), so the table's wood grain is the same every
// time it's repainted on a resize.
function slSeeded(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fruit art ────────────────────────────────────────────────────────────────
// Every fruit is drawn in its own frame: centre (0,0), upright, at its natural
// size (`r` is the hit radius). The caller handles position, spin and scale.
//   path(g)   — the silhouette, as a path (used for fills, clips and outlines)
//   whole(g)  — the uncut fruit
//   half(g)   — the cut face, drawn inside a half-plane clip the caller sets up
function slEllipse(g, x, y, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, SL_TAU);
}

function slInk(g, w = 2.5) {
  g.lineJoin = 'round';
  g.lineWidth = w;
  g.strokeStyle = SL_INK;
  g.stroke();
}

function slStem(g, x0, y0, x1, y1, colour) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo((x0 + x1) / 2 - 2, (y0 + y1) / 2, x1, y1);
  g.lineCap = 'round';
  g.lineWidth = 6; g.strokeStyle = SL_INK; g.stroke();
  g.lineWidth = 3; g.strokeStyle = colour; g.stroke();
  g.lineCap = 'butt';
}

function slLeaf(g, x, y, ang, len, wid, colour) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -wid, len, 0);
  g.quadraticCurveTo(len * 0.5, wid, 0, 0);
  g.closePath();
  g.fillStyle = colour; g.fill();
  slInk(g, 2);
  g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.75, 0);
  g.lineWidth = 1; g.strokeStyle = 'rgba(31,26,23,0.4)'; g.stroke();
  g.restore();
}

// Shading for a roundish fruit, inside a clip to its silhouette: a soft light
// from the top-left, the rim falling away into the fruit's dark tone, and a
// glossy highlight — the same lighting the Fruity Personalities use.
function slHexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function slShade(g, d) {
  const [cx, cy, R] = d.shade || [-4, -5, d.r];
  const rim = g.createRadialGradient(cx, cy, R * 0.45, cx + R * 0.1, cy + R * 0.12, R * 1.25);
  rim.addColorStop(0, slHexA(d.dark, 0));
  rim.addColorStop(1, slHexA(d.dark, 0.85));
  g.fillStyle = rim;
  g.fillRect(-70, -70, 140, 140);
  const lit = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 1, cx - R * 0.35, cy - R * 0.4, R * 0.75);
  lit.addColorStop(0, 'rgba(255,255,255,0.45)');
  lit.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lit;
  g.fillRect(-70, -70, 140, 140);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  slEllipse(g, cx - R * 0.34, cy - R * 0.38, R * 0.24, R * 0.12, -0.65);
  g.fill();
}

function slWholeGeneric(g, d) {
  d.path(g);
  g.fillStyle = d.skin;
  g.fill();
  g.save();
  d.path(g);
  g.clip();
  if (d.pattern) d.pattern(g, d);
  slShade(g, d);
  g.restore();
  d.path(g);
  slInk(g);
  if (d.extras) d.extras(g, d);
}

// The cut face: flesh, then whatever's inside (seeds, pit, segments), then the
// rind as a band just inside the silhouette (a stroke clipped to the shape).
function slHalfGeneric(g, d) {
  g.save();
  d.path(g);
  g.clip();
  g.fillStyle = d.flesh;
  g.fillRect(-70, -70, 140, 140);
  if (d.inside) d.inside(g, d);
  if (d.pith) {
    d.path(g);
    g.lineWidth = (d.rind + d.pithW) * 2;
    g.strokeStyle = d.pith;
    g.stroke();
  }
  d.path(g);
  g.lineWidth = d.rind * 2;
  g.strokeStyle = d.skin;
  g.stroke();
  g.restore();
  d.path(g);
  slInk(g);
  if (d.extras) d.extras(g, d);
}

// Banana — a crescent lying on its back, stalk on the right.
function slPathBanana(g) {
  g.beginPath();
  g.moveTo(-30, -15);
  g.bezierCurveTo(-22, 22, 22, 22, 30, -15);
  g.bezierCurveTo(16, -2, -16, -2, -30, -15);
  g.closePath();
}
function slWholeBanana(g, d) {
  slPathBanana(g);
  g.fillStyle = d.skin;
  g.fill();
  g.save();
  slPathBanana(g);
  g.clip();
  g.beginPath();                                   // the underside, in shadow
  g.moveTo(-30, -15);
  g.bezierCurveTo(-22, 22, 22, 22, 30, -15);
  g.lineWidth = 11; g.strokeStyle = d.dark; g.stroke();
  g.beginPath();                                   // shine along the top
  g.moveTo(-19, -5);
  g.bezierCurveTo(-9, 4, 9, 4, 19, -5);
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
  g.fillStyle = '#7A5A2E';                         // the dark tip
  g.beginPath(); g.arc(-30, -15, 5, 0, SL_TAU); g.fill();
  g.restore();
  slPathBanana(g);
  slInk(g);
  slStem(g, 27, -13, 34, -21, '#8D6E3F');
}
function slInsideBanana(g) {
  g.fillStyle = '#D9BC7E';
  for (let t = 0.18; t <= 0.83; t += 0.13) {       // seeds along the middle of the curve
    const u = 1 - t;
    const x = u * u * u * -30 + 3 * u * u * t * -19 + 3 * u * t * t * 19 + t * t * t * 30;
    const y = u * u * u * -15 + 3 * u * u * t * 10 + 3 * u * t * t * 10 + t * t * t * -15;
    g.beginPath(); g.arc(x, y, 1.4, 0, SL_TAU); g.fill();
  }
}
function slExtrasBanana(g) { slStem(g, 27, -13, 34, -21, '#8D6E3F'); }

// Lemon — an oval with a nub at each end.
function slPathLemon(g) {
  g.beginPath();
  g.moveTo(-30, 0);
  g.bezierCurveTo(-27, -5, -22, -19, 0, -19);
  g.bezierCurveTo(22, -19, 27, -5, 30, 0);
  g.bezierCurveTo(27, 5, 22, 19, 0, 19);
  g.bezierCurveTo(-22, 19, -27, 5, -30, 0);
  g.closePath();
}
function slPatternLemon(g) {
  g.fillStyle = 'rgba(190,140,0,0.35)';
  [[-12, -6], [-4, 9], [8, -9], [14, 5], [2, -2], [-17, 6], [19, -4], [-6, -12]].forEach(([x, y]) => {
    g.beginPath(); g.arc(x, y, 1.1, 0, SL_TAU); g.fill();
  });
}
function slInsideLemon(g, d) {
  g.strokeStyle = d.pith;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = k * SL_TAU / 10;
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 24, Math.sin(a) * 17);
  }
  g.stroke();
  g.fillStyle = d.pith;
  g.beginPath(); g.arc(0, 0, 3, 0, SL_TAU); g.fill();
}

// Peach — round, a little heart-shaped at the top, with a cleft and a leaf.
function slPathPeach(g) {
  g.beginPath();
  g.moveTo(0, -20);
  g.bezierCurveTo(8, -27, 27, -22, 26, 0);
  g.bezierCurveTo(25, 18, 12, 26, 0, 26);
  g.bezierCurveTo(-12, 26, -25, 18, -26, 0);
  g.bezierCurveTo(-27, -22, -8, -27, 0, -20);
  g.closePath();
}
function slPatternPeach(g) {
  g.fillStyle = 'rgba(242,87,122,0.42)';           // the blush
  g.beginPath(); g.arc(11, 6, 19, 0, SL_TAU); g.fill();
  g.beginPath();                                   // the cleft
  g.moveTo(0, -20);
  g.quadraticCurveTo(-7, 2, 3, 24);
  g.lineWidth = 2; g.strokeStyle = 'rgba(176,60,40,0.55)'; g.stroke();
}
function slExtrasPeach(g) {
  slStem(g, 0, -20, 1, -26, '#7A4A2A');
  slLeaf(g, 1, -24, -0.75, 15, 11, '#66BB6A');
}
function slInsidePeach(g) {
  g.fillStyle = '#FFA43C';
  slEllipse(g, 0, 2, 13, 15); g.fill();
  g.fillStyle = '#8D4A2C';
  slEllipse(g, 0, 2, 8.5, 11); g.fill();
  g.lineWidth = 1.5; g.strokeStyle = '#5D2E18'; g.stroke();
  g.beginPath();
  g.moveTo(-3, -5); g.quadraticCurveTo(-1, 2, -3, 9);
  g.moveTo(3, -4);  g.quadraticCurveTo(1, 2, 3, 8);
  g.lineWidth = 1.2; g.strokeStyle = '#6B3820'; g.stroke();
}

// Grapes — a bunch of six, drawn back to front so each one sits in front of
// the one behind it.
const SL_GRAPES = [[-15, -11], [15, -11], [0, -14], [-8, 2], [8, 2], [0, 15]];
const SL_GRAPE_R = 9;
function slPathGrape(g) {
  g.beginPath();
  SL_GRAPES.forEach(([x, y]) => { g.moveTo(x + SL_GRAPE_R, y); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU); });
}
function slGrapeStem(g) {
  slStem(g, 0, -20, 2, -30, '#7A5A2E');
  slLeaf(g, 2, -26, -0.2, 13, 10, '#66BB6A');
}
function slWholeGrape(g, d) {
  slGrapeStem(g);
  SL_GRAPES.forEach(([x, y]) => {
    g.beginPath(); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU);
    g.fillStyle = d.dark; g.fill();
    g.beginPath(); g.arc(x - 1.6, y - 1.8, SL_GRAPE_R - 1.6, 0, SL_TAU);
    g.fillStyle = d.skin; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    slEllipse(g, x - 3.4, y - 4, 2.6, 1.5, -0.6); g.fill();
    g.beginPath(); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU);
    slInk(g, 2);
  });
}
function slHalfGrape(g, d) {
  slGrapeStem(g);
  SL_GRAPES.forEach(([x, y]) => {
    g.save();
    g.beginPath(); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU);
    g.clip();
    g.fillStyle = d.flesh; g.fillRect(x - 10, y - 10, 20, 20);
    g.fillStyle = '#B9D98C'; slEllipse(g, x, y, 1.8, 3); g.fill();
    g.beginPath(); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU);
    g.lineWidth = 4; g.strokeStyle = d.skin; g.stroke();
    g.restore();
    g.beginPath(); g.arc(x, y, SL_GRAPE_R, 0, SL_TAU);
    slInk(g, 2);
  });
}

// Watermelon — the big one. Stripes follow the curve of the rind.
function slPathMelon(g) { slEllipse(g, 0, 0, 34, 30); }
function slPatternMelon(g, d) {
  g.strokeStyle = d.stripe;
  g.lineWidth = 5;
  g.lineJoin = 'round';
  for (let k = -3; k <= 3; k++) {
    g.beginPath();
    for (let j = 0; j <= 10; j++) {
      const y = -30 + j * 6;
      const bulge = Math.sqrt(Math.max(0, 1 - (y / 31) * (y / 31)));
      const x = (k * 10.5 + (j % 2 ? 2.2 : -2.2)) * bulge;
      if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
}
function slInsideMelon(g) {
  g.fillStyle = SL_INK;
  for (let k = 0; k < 9; k++) {
    const a = k * SL_TAU / 9 + 0.35;
    slEllipse(g, Math.cos(a) * 18, Math.sin(a) * 15, 1.8, 3.2, a - Math.PI / 2); g.fill();
  }
  for (let k = 0; k < 5; k++) {
    const a = k * SL_TAU / 5 + 0.9;
    slEllipse(g, Math.cos(a) * 8, Math.sin(a) * 7, 1.6, 2.8, a - Math.PI / 2); g.fill();
  }
}

// Pear — small shoulders, big bottom.
function slPathPear(g) {
  g.beginPath();
  g.moveTo(0, -27);
  g.bezierCurveTo(8, -27, 10, -17, 11, -11);
  g.bezierCurveTo(13, -5, 24, -1, 24, 11);
  g.bezierCurveTo(24, 23, 12, 27, 0, 27);
  g.bezierCurveTo(-12, 27, -24, 23, -24, 11);
  g.bezierCurveTo(-24, -1, -13, -5, -11, -11);
  g.bezierCurveTo(-10, -17, -8, -27, 0, -27);
  g.closePath();
}
function slPatternPear(g) {
  g.fillStyle = 'rgba(110,130,20,0.45)';
  [[-10, 4], [6, 10], [-4, 18], [14, 16], [3, -6], [-15, 15], [9, 0]].forEach(([x, y]) => {
    g.beginPath(); g.arc(x, y, 1.1, 0, SL_TAU); g.fill();
  });
}
function slExtrasPear(g) {
  slStem(g, 0, -26, 2, -35, '#7A4A2A');
  slLeaf(g, 2, -31, -0.3, 14, 10, '#66BB6A');
}
function slInsidePear(g) {
  g.strokeStyle = '#E7DA9C';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(0, -20);
  g.bezierCurveTo(1, -6, 8, 2, 7, 11);
  g.bezierCurveTo(6, 18, -6, 18, -7, 11);
  g.bezierCurveTo(-8, 2, -1, -6, 0, -20);
  g.stroke();
  g.fillStyle = '#5D3A1A';
  slEllipse(g, -2.6, 9, 1.8, 3, 0.3); g.fill();
  slEllipse(g, 2.6, 9, 1.8, 3, -0.3); g.fill();
}

// Strawberry — a rounded heart pointing down, seeds and a leafy top.
function slPathBerry(g) {
  g.beginPath();
  g.moveTo(0, -19);
  g.bezierCurveTo(10, -25, 24, -19, 22, -7);
  g.bezierCurveTo(20, 5, 8, 19, 0, 23);
  g.bezierCurveTo(-8, 19, -20, 5, -22, -7);
  g.bezierCurveTo(-24, -19, -10, -25, 0, -19);
  g.closePath();
}
function slPatternBerry(g) {
  g.fillStyle = '#FFE082';
  for (let row = 0; row < 6; row++) {
    const y = -12 + row * 7;
    for (let x = -21 + (row % 2) * 4; x <= 21; x += 8) { slEllipse(g, x, y, 1.1, 1.9); g.fill(); }
  }
}
function slExtrasBerry(g) {
  [2.85, -2.5, -1.57, -0.64, 0.29].forEach(a => {
    g.save();
    g.translate(0, -18);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(6, -4.5, 13, 0);
    g.quadraticCurveTo(6, 4.5, 0, 0);
    g.closePath();
    g.fillStyle = '#43A047'; g.fill();
    slInk(g, 1.6);
    g.restore();
  });
  slStem(g, 0, -19, 1, -27, '#43A047');
}
function slInsideBerry(g) {
  g.save();
  g.translate(0, -3);
  g.scale(0.5, 0.55);
  slPathBerry(g);
  g.restore();
  g.fillStyle = '#FFD3D9';
  g.fill();
  g.strokeStyle = '#FFBFC8';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = k * SL_TAU / 8;
    g.moveTo(Math.cos(a) * 9, -3 + Math.sin(a) * 9);
    g.lineTo(Math.cos(a) * 18, -1 + Math.sin(a) * 18);
  }
  g.stroke();
}

// Apple — two lobes on top, a dip at the bottom, stem and leaf.
function slPathApple(g) {
  g.beginPath();
  g.moveTo(0, -17);
  g.bezierCurveTo(10, -28, 30, -22, 27, -2);
  g.bezierCurveTo(25, 17, 12, 28, 4, 25);
  g.bezierCurveTo(2, 24, -2, 24, -4, 25);
  g.bezierCurveTo(-12, 28, -25, 17, -27, -2);
  g.bezierCurveTo(-30, -22, -10, -28, 0, -17);
  g.closePath();
}
function slExtrasApple(g) {
  slStem(g, 0, -16, 3, -30, '#7A4A2A');
  slLeaf(g, 3, -25, -0.45, 15, 11, '#4CAF50');
}
function slInsideApple(g) {
  g.strokeStyle = '#EBD592';
  g.lineWidth = 1.5;
  slEllipse(g, 0, 2, 8, 12); g.stroke();
  g.fillStyle = '#5D3A1A';
  slEllipse(g, -3.5, 1, 2.2, 3.6, 0.35); g.fill();
  slEllipse(g, 3.5, 1, 2.2, 3.6, -0.35); g.fill();
}

// Broccoli — the bomb. Florets on a pale stalk, a grumpy face so it reads as
// "not one of the fruit" at a glance, and a pulsing red glow (see slDrawWhole).
// The stalk is wound the same way as the floret arcs so the union fills solid.
// Florets are back to front; the last one is the face, kept smooth.

// ── The Fruity Personalities ───────────────────────────────────────────────
// Fruit Salad's eight Sylly Mode characters, drawn in code. Each one is drawn
// in its own frame: centre (0,0), upright, body radius about 30 units, with
// rubber-hose arms and legs that reach a little further.
//   draw(g, t, mood) — t is a clock in ms for the idle animation (blinks,
//                      tears, steam…); mood is 'idle', or 'dizzy' for the
//                      sliced halves (spiral eyes, wobbly mouth).
//   body(g)          — the main silhouette as a path (the halves' cut face).
// Nothing here touches game state, so this block can be lifted out whole to
// draw Fruit Salad's card faces. Layer order inside each draw: limbs behind,
// body, face, limbs in front, props.
// Each character is drawn in its own frame: centre (0,0), upright, body
// radius about 30 units. draw(g, t, mood): t is a clock in ms (idle
// animation), mood is 'idle' or 'dizzy' (the sliced halves).

function slcInk(g, w = 2.6) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = w; g.strokeStyle = SL_INK; g.stroke();
}
function slcEll(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, SL_TAU); }

// Soft 3-D fill: light from the top-left, rim darkening to the bottom-right.
function slcFill(g, path, c, lx = -10, ly = -12, R = 40) {
  path(g);
  const rg = g.createRadialGradient(lx, ly, 2, lx + 4, ly + 6, R);
  rg.addColorStop(0, c.light);
  rg.addColorStop(0.5, c.base);
  rg.addColorStop(1, c.dark);
  g.fillStyle = rg;
  g.fill();
}
function slcGloss(g, x, y, rx, ry, rot = -0.6) {
  g.fillStyle = 'rgba(255,255,255,0.75)';
  slcEll(g, x, y, rx, ry, rot); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  slcEll(g, x + rx * 1.25, y + ry * 1.6, rx * 0.22, ry * 0.4, rot); g.fill();
}
// A rim of reflected light along the lower edge, inside a clip to the body.
function slcRim(g, path, colour, dx = 4, dy = 5) {
  g.save();
  path(g); g.clip();
  g.translate(-dx, -dy);
  path(g);
  g.lineWidth = 3; g.strokeStyle = colour; g.stroke();
  g.restore();
}

// Eyes: white, ink rim, pupil looking (px, py) in −1…1, catchlight.
function slcEye(g, x, y, rx, ry, px = 0, py = 0, pr = 0.55) {
  slcEll(g, x, y, rx, ry);
  g.fillStyle = '#FFFFFF'; g.fill();
  slcInk(g, 2);
  const r = Math.min(rx, ry) * pr;
  const ex = x + px * (rx - r) * 0.85, ey = y + py * (ry - r) * 0.85;
  g.fillStyle = SL_INK;
  slcEll(g, ex, ey, r, r * 1.08); g.fill();
  g.fillStyle = '#FFFFFF';
  g.beginPath(); g.arc(ex - r * 0.35, ey - r * 0.4, r * 0.34, 0, SL_TAU); g.fill();
}
// A lid over the top of an eye, down to `lidY` (a line tilted by `tilt`).
function slcLid(g, x, y, rx, ry, lidY, tilt, skin) {
  g.save();
  slcEll(g, x, y, rx + 0.6, ry + 0.6); g.clip();
  g.beginPath();
  g.moveTo(x - rx - 2, y - ry - 4);
  g.lineTo(x + rx + 2, y - ry - 4);
  g.lineTo(x + rx + 2, lidY + tilt);
  g.lineTo(x - rx - 2, lidY - tilt);
  g.closePath();
  g.fillStyle = skin; g.fill();
  g.beginPath(); g.moveTo(x - rx - 2, lidY - tilt); g.lineTo(x + rx + 2, lidY + tilt);
  slcInk(g, 2.2);
  g.restore();
  slcEll(g, x, y, rx, ry); slcInk(g, 2);
}
function slcLine(g, pts, w = 2.4) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  slcInk(g, w);
}
function slcCurve(g, x0, y0, cx, cy, x1, y1, w = 2.4) {
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); slcInk(g, w);
}
function slcBlush(g, x, y, rx = 4.5, ry = 2.6, a = 0.5) {
  g.fillStyle = `rgba(255,90,120,${a})`;
  slcEll(g, x, y, rx, ry); g.fill();
}
// A spiral, for the dizzy eyes on a sliced half.
function slcSpiral(g, x, y, r, t) {
  slcEll(g, x, y, r, r); g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 1.8);
  g.beginPath();
  const turn = t / 160;
  for (let a = 0; a <= SL_TAU * 2.2; a += 0.3) {
    const rr = r * 0.85 * (a / (SL_TAU * 2.2));
    const px = x + Math.cos(a + turn) * rr, py = y + Math.sin(a + turn) * rr;
    if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  slcInk(g, 1.5);
}
// Rubber-hose limbs: an ink noodle ending in a white glove (or a shoe).
function slcArm(g, x0, y0, cx, cy, x1, y1) {
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1);
  slcInk(g, 3.2);
}
function slcHand(g, x, y, r = 4.6, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  slcEll(g, -r * 0.7, -r * 0.55, r * 0.45, r * 0.38, -0.6);      // thumb
  g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 1.8);
  slcEll(g, 0, 0, r, r * 0.92); g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 2);
  g.fillStyle = 'rgba(31,26,23,0.12)';
  slcEll(g, r * 0.25, r * 0.3, r * 0.55, r * 0.4, 0.3); g.fill();
  g.restore();
}
function slcLeg(g, x0, y0, x1, y1, dir = 1) {
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (x1 - x0) * 0.2, (y0 + y1) / 2, x1, y1);
  slcInk(g, 3.2);
  slcEll(g, x1 + dir * 2.6, y1 + 1.2, 5, 3.1);
  g.fillStyle = SL_INK; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  slcEll(g, x1 + dir * 1.5, y1 - 0.2, 2, 0.9); g.fill();
}
function slcLeaf(g, x, y, ang, len, wid, colour = '#5DBB63') {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -wid, len, 0);
  g.quadraticCurveTo(len * 0.5, wid, 0, 0);
  g.closePath();
  const lg = g.createLinearGradient(0, -wid, 0, wid);
  lg.addColorStop(0, '#9BE08F'); lg.addColorStop(1, colour);
  g.fillStyle = lg; g.fill(); slcInk(g, 2);
  g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.78, 0);
  g.lineWidth = 1; g.strokeStyle = 'rgba(31,26,23,0.45)'; g.stroke();
  g.restore();
}
function slcStem(g, x0, y0, x1, y1, colour = '#7A4A2A') {
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - 2, (y0 + y1) / 2, x1, y1);
  g.lineCap = 'round';
  g.lineWidth = 6.5; g.strokeStyle = SL_INK; g.stroke();
  g.lineWidth = 3.4; g.strokeStyle = colour; g.stroke();
}
function slcBlink(t, ph) { return ((t + ph) % 3400) < 130; }
function slcDizzyMouth(g, x, y, w = 5) {
  g.beginPath();
  g.moveTo(x - w, y);
  for (let i = 1; i <= 4; i++) g.lineTo(x - w + i * w / 2, y + (i % 2 ? -1.6 : 1.6));
  slcInk(g, 2);
}

// ── SMUG BANANA ─────────────────────────────────────────────────────────────
// Half peeled, hands on hips, one brow up, very pleased with itself.
function slcBananaBody(g) {
  g.beginPath();
  g.moveTo(-15, -13);
  g.bezierCurveTo(-22, 8, -14, 28, 7, 34);
  g.bezierCurveTo(10, 35, 12, 33, 11, 31);
  g.bezierCurveTo(4, 22, 15, 4, 15, -13);
  g.quadraticCurveTo(0, -9, -15, -13);
  g.closePath();
}
const SLC_BANANA = { base: '#FFD93B', light: '#FFF4A3', dark: '#E39E0C' };
function slcPeelFlap(g, x0, x1, tx, ty, bend) {
  g.beginPath();
  g.moveTo(x0, -13);
  g.quadraticCurveTo(tx + bend, -16, tx, ty);
  g.quadraticCurveTo((x1 + tx) / 2, -6, x1, -12);
  g.closePath();
  const pg = g.createLinearGradient(x0, -13, tx, ty);
  pg.addColorStop(0, '#FFF6C4'); pg.addColorStop(1, '#FFD84A');
  g.fillStyle = pg; g.fill(); slcInk(g, 2.2);
  g.fillStyle = '#5B4022'; g.beginPath(); g.arc(tx, ty, 1.7, 0, SL_TAU); g.fill();
}
function slcBanana(g, t, mood) {
  // the back flap, standing up behind the fruit
  g.beginPath();
  g.moveTo(-5, -12); g.quadraticCurveTo(-4, -30, 3, -38); g.quadraticCurveTo(9, -28, 8, -12); g.closePath();
  g.fillStyle = '#F0B81F'; g.fill(); slcInk(g, 2.2);
  g.fillStyle = '#5B4022'; g.beginPath(); g.arc(3, -37, 1.6, 0, SL_TAU); g.fill();
  // the peeled flesh
  g.beginPath();
  g.moveTo(-11, -12);
  g.bezierCurveTo(-13, -30, -4, -36, 0, -35);
  g.bezierCurveTo(5, -34, 12, -28, 11, -12);
  g.closePath();
  const fg = g.createLinearGradient(-12, -30, 12, -12);
  fg.addColorStop(0, '#FFFCEE'); fg.addColorStop(1, '#F2DC9A');
  g.fillStyle = fg; g.fill(); slcInk(g);
  g.beginPath(); g.moveTo(-5, -27); g.quadraticCurveTo(-7, -20, -5, -14);
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(160,120,50,0.45)'; g.stroke();
  // hands on hips (the arms sit behind the body's edges)
  slcArm(g, -15, 2, -31, 8, -17, 17);
  slcArm(g, 13, 2, 29, 8, 13, 17);

  slcFill(g, slcBananaBody, SLC_BANANA, -10, -6, 36);
  g.save(); slcBananaBody(g); g.clip();
  g.beginPath(); g.moveTo(-10, -8); g.bezierCurveTo(-16, 8, -10, 22, 4, 30);
  g.lineWidth = 1.4; g.strokeStyle = 'rgba(190,130,10,0.45)'; g.stroke();
  g.fillStyle = 'rgba(122,90,46,0.5)';
  [[-14, 16, 1.4], [-9, 24, 1.1], [10, 8, 1]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, SL_TAU); g.fill(); });
  g.restore();
  slcBananaBody(g); slcInk(g);
  g.fillStyle = '#5B4022'; slcEll(g, 10, 33, 2.6, 2, 0.6); g.fill();
  slcGloss(g, -15, 4, 1.8, 5.5, 0.15);
  slcHand(g, -17, 17, 4.4, 0.2);
  slcHand(g, 13, 17, 4.4, -0.2);

  // the two front flaps, drooping over the shoulders
  slcPeelFlap(g, -15, -4, -24, -1, -8);
  slcPeelFlap(g, 15, 5, 23, 0, 8);

  const ex = [-6, 5], ey = 0;
  if (mood === 'dizzy') {
    ex.forEach(x => slcSpiral(g, x, ey, 4.4, t));
    slcDizzyMouth(g, 0, 10, 5);
  } else {
    ex.forEach(x => slcEye(g, x, ey, 4.2, 5, 0.8, 0.2));
    const blink = slcBlink(t, 900);
    slcLid(g, ex[0], ey, 4.2, 5, blink ? 6 : 1.2, 0.5, '#FFE45C');
    slcLid(g, ex[1], ey, 4.2, 5, blink ? 6 : 0.6, -0.4, '#FFE45C');
    slcLine(g, [[-10, -6.5], [-2.5, -6]], 2.2);                         // flat brow
    slcCurve(g, 1.5, -8, 5.5, -12.5, 9.5, -8.5, 2.2);                   // the raised one
    g.beginPath(); g.moveTo(-6, 10.5); g.bezierCurveTo(-2, 12.5, 4, 12, 8, 7);   // smirk
    slcInk(g, 2.2);
    slcCurve(g, 7, 5.5, 9, 7, 8.6, 9.1, 1.6);                           // dimple
  }
}

// ── SOUR LEMON ──────────────────────────────────────────────────────────────
function slcLemonBody(g) {
  g.beginPath();
  g.moveTo(-33, 0);
  g.bezierCurveTo(-30, -6, -25, -21, 0, -21);
  g.bezierCurveTo(25, -21, 30, -6, 33, 0);
  g.bezierCurveTo(30, 6, 25, 21, 0, 21);
  g.bezierCurveTo(-25, 21, -30, 6, -33, 0);
  g.closePath();
}
const SLC_LEMON = { base: '#FFE500', light: '#FFFAB0', dark: '#E0A800' };
function slcLemon(g, t, mood) {
  const sh = mood === 'dizzy' ? 0 : Math.sin(t / 22) * 0.7;   // shuddering from the sourness
  g.translate(sh, 0);
  slcLeg(g, -7, 18, -9, 29, -1);
  slcLeg(g, 7, 18, 9, 29, 1);
  slcStem(g, 2, -20, 4, -26);
  slcLeaf(g, 4, -24, -0.35, 15, 9);
  slcFill(g, slcLemonBody, SLC_LEMON, -12, -10, 40);
  g.save(); slcLemonBody(g); g.clip();
  g.fillStyle = 'rgba(200,150,0,0.35)';
  [[-18, -8], [-6, 12], [10, -12], [18, 8], [-22, 8], [22, -5], [-10, -15], [14, 15], [-26, -2], [26, 3]]
    .forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.1, 0, SL_TAU); g.fill(); });
  g.restore();
  slcLemonBody(g); slcInk(g);
  slcGloss(g, -16, -12, 6, 2.6, -0.35);

  if (mood === 'dizzy') {
    slcSpiral(g, -9, -3, 4.6, t); slcSpiral(g, 9, -3, 4.6, t);
    slcDizzyMouth(g, 0, 9, 5);
  } else {
    // eyes squeezed shut: > <
    slcLine(g, [[-14, -7], [-7, -3], [-14, 1]], 2.6);
    slcLine(g, [[14, -7], [7, -3], [14, 1]], 2.6);
    slcLine(g, [[-16, -12], [-6, -9]], 2.6);                // brows knitted down
    slcLine(g, [[16, -12], [6, -9]], 2.6);
    // puckered mouth
    slcEll(g, 0, 9, 3.4, 2.8); g.fillStyle = '#7A2E2E'; g.fill(); slcInk(g, 2);
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * SL_TAU / 6 + 0.25;
      g.moveTo(Math.cos(a) * 4.8, 9 + Math.sin(a) * 4.2);
      g.lineTo(Math.cos(a) * 6.8, 9 + Math.sin(a) * 5.8);
    }
    g.lineWidth = 1.3; g.strokeStyle = 'rgba(31,26,23,0.6)'; g.stroke();
    slcCurve(g, -18, 1, -16, 4, -18, 6, 1.4);                // scrunched cheeks
    slcCurve(g, 18, 1, 16, 4, 18, 6, 1.4);
  }
  // little fists, shaking
  const f = mood === 'dizzy' ? 0 : Math.sin(t / 40) * 1.2;
  slcArm(g, -28, 5, -34, 6, -37, 12 + f);
  slcArm(g, 28, 5, 34, 6, 37, 12 - f);
  slcHand(g, -37, 12 + f, 4.4, 0.3);
  slcHand(g, 37, 12 - f, 4.4, -0.3);
}

// ── CHARMING PEACH ──────────────────────────────────────────────────────────
function slcPeachBody(g) {
  g.beginPath();
  g.moveTo(0, -21);
  g.bezierCurveTo(9, -29, 30, -24, 29, 0);
  g.bezierCurveTo(28, 20, 14, 29, 0, 29);
  g.bezierCurveTo(-14, 29, -28, 20, -29, 0);
  g.bezierCurveTo(-30, -24, -9, -29, 0, -21);
  g.closePath();
}
const SLC_PEACH = { base: '#FFB07A', light: '#FFE3C2', dark: '#EE6F52' };
function slcFlower(g, x, y, r, spin) {
  g.save(); g.translate(x, y); g.rotate(spin);
  for (let k = 0; k < 5; k++) {
    const a = k * SL_TAU / 5;
    slcEll(g, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.52, r * 0.4, a);
    g.fillStyle = '#FF7FB0'; g.fill(); slcInk(g, 1.5);
  }
  g.beginPath(); g.arc(0, 0, r * 0.32, 0, SL_TAU); g.fillStyle = '#FFE500'; g.fill(); slcInk(g, 1.4);
  g.restore();
}
function slcPeach(g, t, mood) {
  slcLeg(g, -5, 26, 2, 35, 1);
  slcLeg(g, 5, 26, -2, 35, -1);
  // the flower hand reaches up behind the right shoulder
  slcArm(g, 25, 8, 34, 2, 32, -10);
  g.beginPath(); g.moveTo(32, -10); g.lineTo(35, -20); g.lineWidth = 2; g.strokeStyle = '#2E7D32'; g.stroke();
  slcFlower(g, 35, -22, 7, mood === 'dizzy' ? 0 : Math.sin(t / 500) * 0.3);
  slcHand(g, 32, -10, 4.4, -0.4);
  slcFill(g, slcPeachBody, SLC_PEACH, -10, -10, 40);
  g.save(); slcPeachBody(g); g.clip();
  const bg = g.createRadialGradient(12, 8, 2, 12, 8, 22);
  bg.addColorStop(0, 'rgba(242,70,110,0.55)'); bg.addColorStop(1, 'rgba(242,70,110,0)');
  g.fillStyle = bg; g.fillRect(-30, -30, 60, 60);
  g.beginPath(); g.moveTo(0, -21); g.quadraticCurveTo(-9, 2, 2, 28);   // the cleft
  g.lineWidth = 1.8; g.strokeStyle = 'rgba(176,60,40,0.45)'; g.stroke();
  g.restore();
  slcPeachBody(g); slcInk(g);
  slcGloss(g, -17, -12, 5, 2.6, -0.7);
  slcStem(g, 0, -21, 1, -28);
  slcLeaf(g, 1, -26, -0.75, 15, 9);

  if (mood === 'dizzy') {
    slcSpiral(g, -9, -2, 4.6, t); slcSpiral(g, 9, -2, 4.6, t);
    slcDizzyMouth(g, 0, 10, 5);
  } else {
    // a wink on the left…
    slcCurve(g, -14, -2, -9, 2.5, -4, -2, 2.4);
    slcLine(g, [[-14, -2], [-16, -4.5]], 1.8);
    // …and a big lashy eye on the right
    const blink = slcBlink(t, 2100);
    if (blink) slcCurve(g, 4, -1, 9, 3, 14, -1, 2.4);
    else {
      slcEye(g, 9, -2, 4.6, 5.6, -0.1, 0.1, 0.6);
      slcLine(g, [[12.6, -6.4], [15.4, -8.6]], 1.8);
      slcLine(g, [[10.2, -7.6], [11.6, -10.6]], 1.8);
    }
    slcCurve(g, -16, -9, -11, -12, -6, -9.5, 2);             // brows
    slcCurve(g, 5, -11, 10, -14, 15, -11, 2);
    slcBlush(g, -16, 6); slcBlush(g, 16, 6);
    g.beginPath(); g.moveTo(-6, 7.5); g.bezierCurveTo(-3, 13, 4, 13, 7, 7);   // the charming smile
    g.quadraticCurveTo(0, 9.5, -6, 7.5); g.closePath();
    g.fillStyle = '#8A2D3B'; g.fill(); slcInk(g, 2);
    // a twinkle
    const tw = 0.5 + 0.5 * Math.sin(t / 260);
    g.save(); g.translate(-21, -8); g.scale(0.4 + tw * 0.6, 0.4 + tw * 0.6);
    g.beginPath();
    g.moveTo(0, -5); g.quadraticCurveTo(0, 0, 5, 0); g.quadraticCurveTo(0, 0, 0, 5);
    g.quadraticCurveTo(0, 0, -5, 0); g.quadraticCurveTo(0, 0, 0, -5);
    g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
  }
  // the other hand on her hip
  slcArm(g, -25, 10, -34, 14, -26, 20);
  slcHand(g, -26, 20, 4.2, 0);
}

// ── DRAMATIC GRAPE ──────────────────────────────────────────────────────────
// One big grape at the front wears the face; the bunch crowds round it.
const SLC_GRAPES = [
  [-19, -17], [-6, -22], [7, -22], [20, -17],
  [-26, -3], [26, -3],
  [-19, 11], [19, 11], [-9, 21], [9, 21], [0, 29],
];
const SLC_GRAPE_R = 9.5;
const SLC_FACE_GRAPE = [0, -1, 16];
function slcGrapeBody(g) {
  g.beginPath();
  SLC_GRAPES.forEach(([x, y]) => { g.moveTo(x + SLC_GRAPE_R, y); g.arc(x, y, SLC_GRAPE_R, 0, SL_TAU); });
  const [fx, fy, fr] = SLC_FACE_GRAPE;
  g.moveTo(fx + fr, fy); g.arc(fx, fy, fr, 0, SL_TAU);
}
function slcOneGrape(g, x, y, r) {
  g.beginPath(); g.arc(x, y, r, 0, SL_TAU);
  const rg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r + 1);
  rg.addColorStop(0, '#DDB0F7'); rg.addColorStop(0.55, '#9B59C9'); rg.addColorStop(1, '#5A2A80');
  g.fillStyle = rg; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  slcEll(g, x - r * 0.4, y - r * 0.45, r * 0.28, r * 0.15, -0.6); g.fill();
  g.beginPath(); g.arc(x, y, r, 0, SL_TAU);
  slcInk(g, 2.2);
}
function slcGrape(g, t, mood) {
  // the flung-out arm, behind
  slcArm(g, -26, 6, -40, 8, -41, -6);
  slcHand(g, -41, -6, 4.4, -1);
  slcStem(g, 0, -26, 3, -37, '#7A5A2E');
  slcLeaf(g, 3, -33, -0.15, 15, 10);
  SLC_GRAPES.forEach(([x, y]) => slcOneGrape(g, x, y, SLC_GRAPE_R));
  const [fx, fy, fr] = SLC_FACE_GRAPE;
  slcOneGrape(g, fx, fy, fr);

  if (mood === 'dizzy') {
    slcSpiral(g, -6, -3, 4.4, t); slcSpiral(g, 6, -3, 4.4, t);
    slcDizzyMouth(g, 0, 8, 4.5);
  } else {
    // swooning: eyes shut, brows tragic, mouth wailing
    slcCurve(g, -10, -3, -6, -6.5, -2, -3, 2.3);
    slcCurve(g, 2, -3, 6, -6.5, 10, -3, 2.3);
    [[-9.5, -3.2, -11.5, -0.6], [-7, -4.6, -8, -2], [9.5, -3.2, 11.5, -0.6], [7, -4.6, 8, -2]]
      .forEach(([a, b, c, d]) => slcLine(g, [[a, b], [c, d]], 1.4));
    slcLine(g, [[-10, -10], [-3, -12]], 2.2);
    slcLine(g, [[10, -10], [3, -12]], 2.2);
    const w = 1 + Math.sin(t / 90) * 0.12;
    slcEll(g, 0, 7.5, 3.6 * w, 4.8 / w); g.fillStyle = '#4A1530'; g.fill(); slcInk(g, 2);
    g.fillStyle = '#E8678A'; slcEll(g, 0, 10, 2.2, 1.3); g.fill();
    // a tear, forever falling
    const k = ((t / 900) % 1);
    g.globalAlpha = 1 - k * 0.8;
    g.beginPath();
    const tx = 10, ty = 0 + k * 13;
    g.moveTo(tx, ty - 4); g.quadraticCurveTo(tx + 3, ty, tx, ty + 2.5); g.quadraticCurveTo(tx - 3, ty, tx, ty - 4);
    g.fillStyle = '#8FD8FF'; g.fill(); slcInk(g, 1.4);
    g.globalAlpha = 1;
  }
  // back of the hand to the brow
  slcArm(g, 27, 2, 32, -24, 12, -16);
  slcHand(g, 12, -16, 4.6, 2.4);
}

// ── CHILL WATERMELON ────────────────────────────────────────────────────────
function slcMelonBody(g) { slcEll(g, 0, 0, 36, 31); }
const SLC_MELON = { base: '#43A047', light: '#9BE08F', dark: '#1B5E20' };
function slcDrink(g, x, y) {
  g.save(); g.translate(x, y); g.rotate(0.12);
  g.beginPath(); g.moveTo(5, -10); g.lineTo(11, -21); g.lineWidth = 1.8; g.strokeStyle = '#FF5A8A'; g.stroke();
  g.beginPath(); g.moveTo(-8, -9); g.lineTo(8, -9); g.lineTo(4, 6); g.lineTo(-4, 6); g.closePath();
  const lg = g.createLinearGradient(0, -9, 0, 6);
  lg.addColorStop(0, '#FFF27A'); lg.addColorStop(1, '#FF9F43');
  g.fillStyle = lg; g.fill(); slcInk(g, 2);
  g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
  g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 11); g.moveTo(-4, 11); g.lineTo(4, 11); slcInk(g, 2);
  // the paper umbrella
  g.beginPath(); g.moveTo(-4, -9); g.lineTo(-9, -19); g.lineWidth = 1.4; g.strokeStyle = SL_INK; g.stroke();
  g.beginPath(); g.moveTo(-17, -16); g.quadraticCurveTo(-11, -27, -2, -22); g.closePath();
  g.fillStyle = '#4FC3F7'; g.fill(); slcInk(g, 1.6);
  g.restore();
}
function slcMelon(g, t, mood) {
  g.rotate(-0.08);
  slcLeg(g, -8, 28, -16, 36, -1);
  slcLeg(g, 8, 28, 18, 34, 1);
  // a hand tucked behind the head
  slcArm(g, -30, -8, -44, -18, -30, -28);
  slcHand(g, -30, -28, 4.4, 0);
  slcFill(g, slcMelonBody, SLC_MELON, -12, -12, 44);
  g.save(); slcMelonBody(g); g.clip();
  g.strokeStyle = '#1F6A2C'; g.lineWidth = 5.5; g.lineJoin = 'round';
  for (let k = -3; k <= 3; k++) {
    g.beginPath();
    for (let j = 0; j <= 24; j++) {
      const y = -31 + j * 2.6;
      const bulge = Math.sqrt(Math.max(0, 1 - (y / 32) * (y / 32)));
      const x = (k * 11 + Math.sin(y / 3.2 + k) * 2.2) * bulge;
      if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
  slcMelonBody(g); slcInk(g);
  slcGloss(g, -20, -16, 7, 3, -0.6);

  // shades — knocked crooked on a dizzy half
  const dz = mood === 'dizzy';
  if (dz) { slcSpiral(g, -10, -3, 4.8, t); slcSpiral(g, 10, -3, 4.8, t); }
  g.save();
  if (dz) { g.translate(2, 9); g.rotate(0.35); }
  [[-1, -11], [1, 11]].forEach(([s, x]) => {
    g.beginPath();
    g.moveTo(x - 9, -9); g.lineTo(x + 9, -9);
    g.quadraticCurveTo(x + 9, 3, x, 3); g.quadraticCurveTo(x - 9, 3, x - 9, -9);
    g.closePath();
    const lg = g.createLinearGradient(0, -9, 0, 3);
    lg.addColorStop(0, '#24324A'); lg.addColorStop(1, '#0D1320');
    g.fillStyle = lg; g.fill(); slcInk(g, 2.2);
    g.beginPath(); g.moveTo(x - 6, -6); g.lineTo(x - 1, -6); g.moveTo(x - 6, -3); g.lineTo(x - 4, -3);
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
  });
  slcLine(g, [[-2, -8], [2, -8]], 2.6);
  slcLine(g, [[-20, -8], [-31, -11]], 2.2);
  g.restore();

  if (dz) slcDizzyMouth(g, 0, 12, 5);
  else {
    g.beginPath(); g.moveTo(-9, 11); g.bezierCurveTo(-4, 16, 6, 15, 10, 8);   // easy grin
    g.quadraticCurveTo(1, 12, -9, 11); g.closePath();
    g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 2);
  }
  // the other hand holds a cold drink
  slcArm(g, 30, 8, 40, 14, 38, 4);
  slcDrink(g, 42, -2);
  slcHand(g, 38, 4, 4.4, 0.4);
}

// ── SUS PEAR ────────────────────────────────────────────────────────────────
function slcPearBody(g) {
  g.beginPath();
  g.moveTo(0, -26);
  g.bezierCurveTo(9, -26, 11, -16, 12, -10);
  g.bezierCurveTo(14, -4, 26, 0, 26, 12);
  g.bezierCurveTo(26, 25, 13, 29, 0, 29);
  g.bezierCurveTo(-13, 29, -26, 25, -26, 12);
  g.bezierCurveTo(-26, 0, -14, -4, -12, -10);
  g.bezierCurveTo(-11, -16, -9, -26, 0, -26);
  g.closePath();
}
const SLC_PEAR = { base: '#C0D63A', light: '#EEF7A6', dark: '#7E9A1E' };
function slcPear(g, t, mood) {
  slcLeg(g, -7, 27, -8, 37, -1);
  slcLeg(g, 7, 27, 9, 37, 1);
  slcFill(g, slcPearBody, SLC_PEAR, -8, -4, 38);
  g.save(); slcPearBody(g); g.clip();
  g.fillStyle = 'rgba(110,130,20,0.4)';
  [[-14, 4], [6, 14], [-4, 22], [16, 18], [-18, 18], [12, 4]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.2, 0, SL_TAU); g.fill(); });
  g.fillStyle = 'rgba(255,140,60,0.25)';
  slcEll(g, 14, 16, 11, 9); g.fill();
  g.restore();
  slcPearBody(g); slcInk(g);
  slcGloss(g, -16, 4, 4, 2.4, -0.9);

  // the fedora, cocked
  g.save(); g.translate(1, -27); g.rotate(-0.16);
  slcEll(g, 0, 2, 22, 5.5);
  g.fillStyle = '#4A3B2E'; g.fill(); slcInk(g, 2.2);
  g.beginPath();
  g.moveTo(-13, 1); g.bezierCurveTo(-14, -12, -6, -15, 0, -11);
  g.bezierCurveTo(6, -15, 14, -12, 13, 1); g.closePath();
  const hg = g.createLinearGradient(0, -14, 0, 1);
  hg.addColorStop(0, '#6B5642'); hg.addColorStop(1, '#3E3126');
  g.fillStyle = hg; g.fill(); slcInk(g, 2.2);
  g.beginPath(); g.moveTo(-13, -3); g.quadraticCurveTo(0, -1, 13, -3); g.lineTo(13, 1); g.quadraticCurveTo(0, 3, -13, 1); g.closePath();
  g.fillStyle = '#FFE500'; g.fill(); slcInk(g, 1.6);
  g.restore();

  const look = mood === 'dizzy' ? 0 : (Math.sin(t / 700) > 0 ? -0.85 : 0.85);
  if (mood === 'dizzy') {
    slcSpiral(g, -7, -2, 4.6, t); slcSpiral(g, 7, -2, 4.6, t);
  } else {
    // narrowed eyes, sliding side to side over the shades
    [-7, 7].forEach(x => {
      slcEye(g, x, -3, 4.4, 4.6, look, 0.3);
      slcLid(g, x, -3, 4.4, 4.6, -3.5, x < 0 ? -0.6 : 0.6, '#D5E65C');
    });
    slcLine(g, [[-12, -9], [-3, -8]], 2.2);
    slcCurve(g, 3, -9, 8, -12.5, 13, -10, 2.2);
  }
  // shades slid down the nose
  [-7, 7].forEach(x => {
    g.beginPath();
    g.moveTo(x - 6.5, 3); g.lineTo(x + 6.5, 3); g.quadraticCurveTo(x + 6, 10, x, 10); g.quadraticCurveTo(x - 6, 10, x - 6.5, 3);
    g.closePath();
    g.fillStyle = '#121826'; g.fill(); slcInk(g, 2);
    g.beginPath(); g.moveTo(x - 4, 5); g.lineTo(x - 1, 5); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
  });
  slcLine(g, [[-0.5, 4], [0.5, 4]], 2.4);
  if (mood === 'dizzy') slcDizzyMouth(g, 1, 16, 4.5);
  else slcLine(g, [[-4, 16], [-1, 15], [2, 16.5], [6, 15]], 2.2);     // a "hmm" squiggle
  // a hand stroking the chin
  slcArm(g, 24, 10, 22, 24, 9, 20);
  slcHand(g, 9, 20, 4.2, 0.5);
}

// ── PANICKED STRAWBERRY ─────────────────────────────────────────────────────
function slcBerryBody(g) {
  g.beginPath();
  g.moveTo(0, -21);
  g.bezierCurveTo(11, -28, 28, -21, 26, -7);
  g.bezierCurveTo(24, 7, 10, 22, 0, 27);
  g.bezierCurveTo(-10, 22, -24, 7, -26, -7);
  g.bezierCurveTo(-28, -21, -11, -28, 0, -21);
  g.closePath();
}
const SLC_BERRY = { base: '#E53950', light: '#FF9AA8', dark: '#A3172F' };
function slcBerry(g, t, mood) {
  const jx = mood === 'dizzy' ? 0 : Math.sin(t / 17) * 0.9, jy = mood === 'dizzy' ? 0 : Math.cos(t / 23) * 0.6;
  g.translate(jx, jy);
  // legs mid-scramble
  const run = mood === 'dizzy' ? 0 : Math.sin(t / 70) * 4;
  slcLeg(g, -6, 22, -10 + run, 33, -1);
  slcLeg(g, 6, 22, 10 - run, 33, 1);
  slcFill(g, slcBerryBody, SLC_BERRY, -10, -12, 40);
  g.save(); slcBerryBody(g); g.clip();
  for (let row = 0; row < 7; row++) {
    const y = -14 + row * 6.6;
    for (let x = -24 + (row % 2) * 4.5; x <= 24; x += 9) {
      if (Math.abs(x) < 15 && y > -10 && y < 14) continue;     // keep the face clear
      g.fillStyle = '#FFE082'; slcEll(g, x, y, 1.2, 2); g.fill();
    }
  }
  g.restore();
  slcBerryBody(g); slcInk(g);
  slcGloss(g, -15, -13, 5, 2.4, -0.6);
  [2.85, -2.5, -1.57, -0.64, 0.29].forEach(a => {
    g.save(); g.translate(0, -20); g.rotate(a);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, -5, 14, 0); g.quadraticCurveTo(7, 5, 0, 0); g.closePath();
    g.fillStyle = '#43A047'; g.fill(); slcInk(g, 1.8);
    g.restore();
  });
  slcStem(g, 0, -21, 1, -29, '#43A047');

  if (mood === 'dizzy') {
    slcSpiral(g, -8, -6, 5, t); slcSpiral(g, 8, -6, 5, t);
    slcDizzyMouth(g, 0, 8, 5);
  } else {
    const q = Math.sin(t / 30) * 0.25;
    slcEye(g, -8, -6, 5.4, 6.6, q, 0, 0.3);
    slcEye(g, 8, -6, 5.4, 6.6, -q, 0, 0.3);
    slcCurve(g, -14, -15, -10, -19, -4, -16, 2.2);
    slcCurve(g, 4, -16, 10, -19, 14, -15, 2.2);
    // the scream
    g.beginPath();
    g.moveTo(-5, 4); g.quadraticCurveTo(0, 2, 5, 4); g.quadraticCurveTo(7, 16, 0, 17); g.quadraticCurveTo(-7, 16, -5, 4);
    g.closePath();
    g.fillStyle = '#4A0E1C'; g.fill(); slcInk(g, 2);
    g.fillStyle = '#FF6F87'; slcEll(g, 0, 14, 3, 1.8); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(-3.6, 3.6, 7.2, 2.4);
    // sweat, flying off
    [[0, -22, -14, -0.9], [350, 22, -14, 0.9], [700, -26, 0, -1.3]].forEach(([ph, x, y, dir]) => {
      const k = ((t + ph) % 1050) / 1050;
      g.globalAlpha = 1 - k;
      const dx = x + dir * k * 10, dy = y - k * 6 + k * k * 12;
      g.beginPath();
      g.moveTo(dx, dy - 4); g.quadraticCurveTo(dx + 3, dy, dx, dy + 2.5); g.quadraticCurveTo(dx - 3, dy, dx, dy - 4);
      g.fillStyle = '#8FD8FF'; g.fill(); slcInk(g, 1.3);
      g.globalAlpha = 1;
    });
  }
  // hands clapped to the cheeks
  slcArm(g, -22, 6, -28, 14, -17, 7);
  slcArm(g, 22, 6, 28, 14, 17, 7);
  slcHand(g, -17, 7, 4.4, 0.6);
  slcHand(g, 17, 7, 4.4, -0.6);
}

// ── ANGRY APPLE ─────────────────────────────────────────────────────────────
function slcAppleBody(g) {
  g.beginPath();
  g.moveTo(0, -18);
  g.bezierCurveTo(11, -30, 33, -24, 30, -2);
  g.bezierCurveTo(28, 18, 14, 30, 5, 27);
  g.bezierCurveTo(2, 26, -2, 26, -5, 27);
  g.bezierCurveTo(-14, 30, -28, 18, -30, -2);
  g.bezierCurveTo(-33, -24, -11, -30, 0, -18);
  g.closePath();
}
const SLC_APPLE = { base: '#E53935', light: '#FF9C8F', dark: '#9E1512' };
function slcSteam(g, t) {
  [[0, -10], [500, 10]].forEach(([ph, x]) => {
    const k = ((t + ph) % 1000) / 1000;
    g.globalAlpha = 0.95 * (1 - k);
    const y = -30 - k * 14, r = 3 + k * 4;
    [[-r * 0.8, 0], [r * 0.8, 0], [0, -r * 0.7]].forEach(([dx, dy]) => {
      g.beginPath(); g.arc(x + dx + (x < 0 ? -k * 6 : k * 6), y + dy, r, 0, SL_TAU);
      g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(31,26,23,0.5)'; g.stroke();
    });
    g.globalAlpha = 1;
  });
}
function slcApple(g, t, mood) {
  const stomp = mood === 'dizzy' ? 0 : Math.max(0, Math.sin(t / 110)) * 3;
  slcLeg(g, -8, 25, -11, 35 - stomp, -1);
  slcLeg(g, 8, 25, 11, 35, 1);
  if (mood !== 'dizzy') slcSteam(g, t);
  slcFill(g, slcAppleBody, SLC_APPLE, -11, -10, 42);
  g.save(); slcAppleBody(g); g.clip();
  g.strokeStyle = 'rgba(255,220,120,0.25)'; g.lineWidth = 1.2;
  [[-20, -8, -22, 10], [18, -12, 21, 6], [-6, 14, -2, 22]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  g.restore();
  slcAppleBody(g); slcInk(g);
  slcGloss(g, -18, -12, 5.5, 2.6, -0.7);
  slcStem(g, 0, -17, 3, -31);
  slcLeaf(g, 3, -26, -0.45, 15, 9, '#4CAF50');

  if (mood === 'dizzy') {
    slcSpiral(g, -9, -3, 4.8, t); slcSpiral(g, 9, -3, 4.8, t);
    slcDizzyMouth(g, 0, 10, 5);
  } else {
    [-9, 9].forEach(x => {
      slcEye(g, x, -2, 5, 5.2, -Math.sign(x) * 0.25, 0.2, 0.5);
      slcLid(g, x, -2, 5, 5.2, -3, x < 0 ? -2.2 : 2.2, '#F4524D');
    });
    // thick V brows
    g.beginPath(); g.moveTo(-17, -12); g.lineTo(-3, -6.5); g.lineTo(-3.5, -4.5); g.lineTo(-17, -9.5); g.closePath();
    g.fillStyle = SL_INK; g.fill(); slcInk(g, 1.5);
    g.beginPath(); g.moveTo(17, -12); g.lineTo(3, -6.5); g.lineTo(3.5, -4.5); g.lineTo(17, -9.5); g.closePath();
    g.fill(); slcInk(g, 1.5);
    // gritted teeth
    g.beginPath();
    g.moveTo(-9, 9); g.quadraticCurveTo(0, 5, 9, 9); g.lineTo(9, 14); g.quadraticCurveTo(0, 11, -9, 14); g.closePath();
    g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 2);
    g.beginPath();
    g.moveTo(-9, 11.5); g.quadraticCurveTo(0, 8, 9, 11.5);
    [-4.5, 0, 4.5].forEach(x => { g.moveTo(x, x === 0 ? 7 : 7.6); g.lineTo(x, x === 0 ? 12.6 : 13.2); });
    g.lineWidth = 1.3; g.strokeStyle = SL_INK; g.stroke();
    // the cross-popping vein
    g.save(); g.translate(19, -17); g.rotate(0.3);
    g.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      g.moveTo(sx * 1.5, sy * 4.5); g.quadraticCurveTo(sx * 1.5, sy * 1.5, sx * 4.5, sy * 1.5);
    });
    g.lineWidth = 2.2; g.strokeStyle = '#FFFFFF'; g.stroke();
    g.restore();
  }
  // fists up
  const sh = mood === 'dizzy' ? 0 : Math.sin(t / 45) * 1.5;
  slcArm(g, -27, 4, -38, 4, -35, -10 + sh);
  slcArm(g, 27, 4, 38, 4, 35, -10 - sh);
  slcHand(g, -35, -10 + sh, 5, 0.2);
  slcHand(g, 35, -10 - sh, 5, -0.2);
}

// ── SNEAKY BROCCOLI (the one to avoid) ──────────────────────────────────────
const SLC_FLORETS = [[-14, -11, 11.5], [14, -11, 11.5], [0, -18, 12], [-12, 3, 10], [12, 3, 10], [0, -4, 13]];
function slcBrocBody(g) {
  g.beginPath();
  g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(6, 24); g.quadraticCurveTo(0, 29, -6, 24); g.closePath();
  SLC_FLORETS.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, SL_TAU); });
}
function slcBroccoli(g, t, mood, faceless) {
  g.beginPath();
  g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(6, 24); g.quadraticCurveTo(0, 29, -6, 24); g.closePath();
  const sg = g.createLinearGradient(-7, 0, 7, 0);
  sg.addColorStop(0, '#C7E592'); sg.addColorStop(1, '#8DBE52');
  g.fillStyle = sg; g.fill(); slcInk(g);
  SLC_FLORETS.forEach(([x, y, r], i) => {
    const face = i === SLC_FLORETS.length - 1;
    g.beginPath(); g.arc(x, y, r, 0, SL_TAU);
    const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
    rg.addColorStop(0, '#8FD47F'); rg.addColorStop(0.6, '#3E9A44'); rg.addColorStop(1, '#22662A');
    g.fillStyle = rg; g.fill();
    if (!face || faceless) {
      g.fillStyle = 'rgba(160,230,140,0.75)';
      [[-0.35, -0.4], [0.25, -0.45], [-0.5, 0.1], [0.1, -0.05], [0.45, 0.2]].forEach(([u, v]) => {
        g.beginPath(); g.arc(x + u * r, y + v * r, r * 0.2, 0, SL_TAU); g.fill();
      });
    }
    g.beginPath(); g.arc(x, y, r, 0, SL_TAU); slcInk(g, 2.2);
  });
  if (faceless) return;
  if (mood === 'dizzy') {
    slcSpiral(g, -5, -7, 4, t); slcSpiral(g, 5, -7, 4, t);
    slcDizzyMouth(g, 0, 3, 4);
    return;
  }
  // a sly, scheming look
  const look = Math.sin(t / 600) > 0 ? 0.8 : -0.8;
  [-5, 5].forEach(x => {
    slcEye(g, x, -7, 4, 4.4, look, 0.2, 0.55);
    slcLid(g, x, -7, 4, 4.4, -6.5, x < 0 ? 1 : -1, '#3E9A44');
  });
  slcLine(g, [[-10, -14], [-2, -11]], 2.4);
  slcLine(g, [[10, -14], [2, -11]], 2.4);
  g.beginPath(); g.moveTo(-7, 1); g.bezierCurveTo(-3, 7, 4, 7, 8, 0);
  g.quadraticCurveTo(0, 3, -7, 1); g.closePath();
  g.fillStyle = '#FFFFFF'; g.fill(); slcInk(g, 1.8);
}

const SL_CHARS = {
  banana:     { body: slcBananaBody, draw: slcBanana,  flesh: '#FFF6D6', name: 'SMUG BANANA' },
  lemon:      { body: slcLemonBody,  draw: slcLemon,   flesh: '#FFF27A', name: 'SOUR LEMON' },
  peach:      { body: slcPeachBody,  draw: slcPeach,   flesh: '#FFC857', name: 'CHARMING PEACH' },
  grape:      { body: slcGrapeBody,  draw: slcGrape,   flesh: '#DCEDC8', name: 'DRAMATIC GRAPE' },
  watermelon: { body: slcMelonBody,  draw: slcMelon,   flesh: '#FF5367', name: 'CHILL WATERMELON' },
  pear:       { body: slcPearBody,   draw: slcPear,    flesh: '#FBF8DC', name: 'SUS PEAR' },
  strawberry: { body: slcBerryBody,  draw: slcBerry,   flesh: '#FF7A8A', name: 'PANICKED STRAWBERRY' },
  apple:      { body: slcAppleBody,  draw: slcApple,   flesh: '#FFF4CC', name: 'ANGRY APPLE' },
  broccoli:   { body: slcBrocBody,   draw: slcBroccoli, flesh: '#D7EBB5', name: 'SNEAKY BROCCOLI' },
};


// ── The deck ─────────────────────────────────────────────────────────────────
function slWholeBroccoliPlain(g) { slcBroccoli(g, slClock, 'idle', true); }

// Keys and order match Fruit Salad's deck (the frt doc's fruit table). `r` is
// the hit radius at art size — the same in both art styles.
const SL_FRUIT = {
  banana:     { r: 25, path: slPathBanana, whole: slWholeBanana, half: slHalfGeneric,
                inside: slInsideBanana, extras: slExtrasBanana,
                skin: '#FFD93B', dark: '#E0A10E', flesh: '#FFF6D6', rind: 3, juice: '#FFF0B3' },
  lemon:      { r: 24, path: slPathLemon, whole: slWholeGeneric, half: slHalfGeneric,
                pattern: slPatternLemon, inside: slInsideLemon, shade: [-4, -4, 25],
                skin: SL_LEMON, dark: '#D9A800', flesh: '#FFF27A', pith: '#FFFDE8', pithW: 2.5, rind: 2.5,
                juice: '#FFF04D' },
  peach:      { r: 26, path: slPathPeach, whole: slWholeGeneric, half: slHalfGeneric,
                pattern: slPatternPeach, extras: slExtrasPeach, inside: slInsidePeach,
                skin: '#FFB07A', dark: '#E8704F', flesh: '#FFC857', rind: 2.5, juice: '#FFB347' },
  grape:      { r: 24, path: slPathGrape, whole: slWholeGrape, half: slHalfGrape,
                skin: '#9B59B6', dark: '#6C3483', flesh: '#DCEDC8', juice: '#C77DFF' },
  watermelon: { r: 33, path: slPathMelon, whole: slWholeGeneric, half: slHalfGeneric,
                pattern: slPatternMelon, inside: slInsideMelon, shade: [-5, -6, 33],
                skin: '#43A047', dark: '#1B5E20', stripe: '#1F6A2C', flesh: '#FF5367',
                pith: '#F4FFE6', pithW: 3, rind: 4, juice: '#FF4060' },
  pear:       { r: 26, path: slPathPear, whole: slWholeGeneric, half: slHalfGeneric,
                pattern: slPatternPear, extras: slExtrasPear, inside: slInsidePear, shade: [-4, -1, 27],
                skin: '#C0D63A', dark: '#7E9A1E', flesh: '#FBF8DC', rind: 2.5, juice: '#E9F29B' },
  strawberry: { r: 23, path: slPathBerry, whole: slWholeGeneric, half: slHalfGeneric,
                pattern: slPatternBerry, extras: slExtrasBerry, inside: slInsideBerry, shade: [-4, -6, 23],
                skin: '#E53950', dark: '#A3172F', flesh: '#FF7A8A', rind: 2, juice: '#FF3355' },
  apple:      { r: 26, path: slPathApple, whole: slWholeGeneric, half: slHalfGeneric,
                extras: slExtrasApple, inside: slInsideApple,
                skin: '#E53935', dark: '#A31A17', flesh: '#FFF4CC', rind: 2.5, juice: '#FFEFB0' },
  broccoli:   { r: 27, veg: true, path: slcBrocBody, whole: slWholeBroccoliPlain, half: slHalfGeneric,
                skin: '#3E9A44', flesh: '#D7EBB5', rind: 3, juice: '#7CB342' },
};
const SL_FRUIT_KINDS = ['banana', 'lemon', 'peach', 'grape', 'watermelon', 'pear', 'strawberry', 'apple'];

// THE fruit-art seam (see the header): everything on screen that is a fruit
// goes through these two, and they pick the art style.
function slDrawWhole(kind, x, y, rot, scale, ph = 0) {
  const g = slCtx, d = SL_FRUIT[kind];
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  // a soft shadow on the cloth below, so the fruit reads as up in the air
  g.fillStyle = 'rgba(0,20,24,0.22)';
  slEllipse(g, 7, 12, d.r * 0.95, d.r * 0.8); g.fill();
  if (d.veg) {   // the red "don't" glow doesn't spin with it
    const p = 0.5 + 0.5 * Math.sin(slClock / 140);
    const R = d.r + 18;
    const rg = g.createRadialGradient(0, 0, 8, 0, 0, R);
    rg.addColorStop(0, `rgba(255,60,60,${(0.45 + 0.3 * p).toFixed(3)})`);
    rg.addColorStop(1, 'rgba(255,60,60,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(0, 0, R, 0, SL_TAU); g.fill();
  }
  g.rotate(rot);
  if (slArt === 'fruity') {
    g.scale(SL_CHAR_K, SL_CHAR_K);
    SL_CHARS[kind].draw(g, slClock + ph, 'idle');
  } else {
    d.whole(g, d);
  }
  g.restore();
}

// The sliced halves of a personality come two at a time and there can be a
// dozen on screen after a big combo, so each dizzy pose is drawn once into a
// small sprite (per fruit, per size, per screen resolution) and stamped from
// there. The whole fruit stay live, so their idle animations keep running.
const SL_SPRITE_R = 52;          // character units: room for arms, hats and steam
let slSprites = {};              // 'kind@px' → canvas. Emptied by slResize().
function slCharSprite(kind, scale) {
  if (!slCanvas || typeof document === 'undefined') return null;
  const px = slCanvas.width / SL_W * scale;                // device px per character unit
  const key = kind + '@' + px.toFixed(2);
  if (slSprites[key]) return slSprites[key];
  const size = Math.ceil(SL_SPRITE_R * 2 * px);
  if (!size) return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.setTransform(px, 0, 0, px, SL_SPRITE_R * px, SL_SPRITE_R * px);
  SL_CHARS[kind].draw(g, 0, 'dizzy');
  slSprites[key] = cv;
  return cv;
}

// `cut` is the angle of the cut line in the fruit's own frame, and `side`
// (+1/−1) which side of it this half is. Plain fruit show the cut face (the
// flesh and what's inside); a personality shows itself, sliced and dizzy,
// with a band of flesh along the cut.
function slDrawHalf(h) {
  const g = slCtx, d = SL_FRUIT[h.kind];
  g.save();
  g.translate(h.x, h.y);
  g.rotate(h.rot);
  g.scale(h.scale, h.scale);
  g.save();
  g.rotate(h.cut);
  g.beginPath();
  g.rect(-90, h.side > 0 ? 0 : -90, 180, 90);
  g.restore();
  g.clip();
  if (slArt === 'fruity') {
    const c = SL_CHARS[h.kind];
    g.scale(SL_CHAR_K, SL_CHAR_K);
    const spr = slCharSprite(h.kind, h.scale * SL_CHAR_K);
    if (spr) g.drawImage(spr, -SL_SPRITE_R, -SL_SPRITE_R, SL_SPRITE_R * 2, SL_SPRITE_R * 2);
    else c.draw(g, slClock + (h.ph || 0), 'dizzy');
    g.save();
    c.body(g);
    g.clip();
    g.rotate(h.cut);
    g.beginPath(); g.moveTo(-90, 0); g.lineTo(90, 0);
    g.lineWidth = 13; g.strokeStyle = c.flesh; g.stroke();
    g.lineWidth = 13; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.setLineDash([2, 5]); g.stroke(); g.setLineDash([]);
    g.lineWidth = 3.5; g.strokeStyle = SL_INK; g.stroke();
    g.restore();
    g.restore();
    return;
  }
  d.half(g, d);
  // ink along the cut edge, so the half has a full outline
  g.save();
  d.path(g);
  g.clip();
  g.rotate(h.cut);
  g.beginPath(); g.moveTo(-80, 0); g.lineTo(80, 0);
  g.lineWidth = 3; g.strokeStyle = SL_INK; g.stroke();
  g.restore();
  g.restore();
}

// ── The tablecloth ───────────────────────────────────────────────────────────
// Deep-teal picnic gingham: see-through white bands both ways (so the
// crossings come out twice as light), a fine weave, a few soft folds, and a
// pool of light in the middle where the slicing happens.
function slPaintBoard(g) {
  const S = 40;
  g.fillStyle = SL_TEAL;
  g.fillRect(0, 0, SL_W, SL_H);
  g.fillStyle = 'rgba(190,255,245,0.1)';
  for (let x = -S / 2; x < SL_W; x += S * 2) g.fillRect(x, 0, S, SL_H);
  for (let y = -S / 2; y < SL_H; y += S * 2) g.fillRect(0, y, SL_W, S);
  // the weave
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(0,0,0,0.07)';
  g.beginPath();
  for (let k = -SL_H; k < SL_W; k += 3) { g.moveTo(k, 0); g.lineTo(k + SL_H, SL_H); }
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.03)';
  g.beginPath();
  for (let k = 0; k < SL_W + SL_H; k += 5) { g.moveTo(k, 0); g.lineTo(k - SL_H, SL_H); }
  g.stroke();
  // soft folds in the cloth
  [[-60, 120, 260, 520, 0.07], [120, -40, 420, 300, -0.06], [-20, 420, 300, 700, 0.05]].forEach(([x0, y0, x1, y1, a]) => {
    const fg = g.createLinearGradient(x0, y0, x1, y1);
    const c = a > 0 ? '255,255,255' : '0,0,0', A = Math.abs(a);
    fg.addColorStop(0, `rgba(${c},0)`);
    fg.addColorStop(0.45, `rgba(${c},${A})`);
    fg.addColorStop(0.55, `rgba(${a > 0 ? '0,0,0' : '255,255,255'},${A * 0.7})`);
    fg.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = fg;
    g.fillRect(0, 0, SL_W, SL_H);
  });
  // light in the middle, darker toward the edges
  const lg = g.createRadialGradient(SL_W / 2, SL_H * 0.44, 20, SL_W / 2, SL_H * 0.44, SL_H * 0.55);
  lg.addColorStop(0, 'rgba(255,248,220,0.13)');
  lg.addColorStop(1, 'rgba(255,248,220,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, SL_W, SL_H);
  const vg = g.createRadialGradient(SL_W / 2, SL_H * 0.45, SL_H * 0.25, SL_W / 2, SL_H * 0.45, SL_H * 0.78);
  vg.addColorStop(0, 'rgba(2,20,24,0)');
  vg.addColorStop(1, 'rgba(2,20,24,0.62)');
  g.fillStyle = vg;
  g.fillRect(0, 0, SL_W, SL_H);
}

// ── Entry ────────────────────────────────────────────────────────────────────
function slStart() {
  slCanvas = document.getElementById('sl-canvas');
  slCtx    = slCanvas.getContext('2d');
  showScreen('screen-arcade-slice');
  slResize();
  slEnterState('attract');
}

// attract and playing start from a fresh table; name entry and the scores sit
// over the table as it was (halves still falling, juice still fading).
function slEnterState(next) {
  if (next === 'attract' || next === 'playing') slNewRun(next === 'attract');
  if (next === 'attract') slTitleCutAt = slClock;
  slState = next;
  // Only the death beat shakes; a state change can arrive mid-shake.
  slShake = 0;
  if (!slRaf) { slLastT = 0; slRaf = requestAnimationFrame(slLoop); }
}

function slNewRun(withLineup) {
  slItems   = [];
  slHalves  = [];
  slSplats  = [];
  slParts   = [];
  slTexts   = [];
  slMarks   = [];
  slEvents  = [];
  slWave    = 0;
  slPending = 0;
  slWaveAt  = null;
  slScore   = 0;
  slScorePopAt = -1e9;
  slStrikes = 0;
  slStrikeAt = -1e9;
  slPhewAt  = -1e9;
  slNextLifeAt = SL_LIFE_EVERY;
  slSliced  = 0;
  slCombo   = { n: 0, at: 0, x: 0, y: 0 };
  slDeath   = null;
  slFlashAt = -1e9;
  if (withLineup) SL_LINEUP.forEach(([kind, x, y], i) => slAddPinned(kind, x, y, slClock + 120 + i * 70));
}

// A lineup fruit on the attract screen: it bobs in place instead of flying,
// and pops in (scale 0 → 1) from `born`.
function slAddPinned(kind, x, y, born) {
  slItems.push({ kind, x, y, vx: 0, vy: 0, rot: 0, spin: 0, scale: SL_LINEUP_SCALE,
                 pin: { x, y, ph: x * 0.05 + y * 0.03 }, born, ph: x * 31 + y * 17 });
}

// ── Waves ────────────────────────────────────────────────────────────────────
// A wave waits until the board is ready for it: early on that means empty, so
// a beginner only ever has one wave to deal with; later, once everything in
// the air has started falling, so waves overlap.
function slUpdateWaves() {
  if (slPending > 0) return;
  const d = slDifficulty();
  const ready = d < SL_OVERLAP_D ? slItems.length === 0 : slItems.every(it => it.vy > 0);
  if (!ready) { slWaveAt = null; return; }
  if (slWaveAt === null) {
    slWaveAt = slClock + (slWave === 0 ? SL_FIRST_WAVE_MS : SL_GAP_MAX_MS - (SL_GAP_MAX_MS - SL_GAP_MIN_MS) * d);
  }
  if (slClock >= slWaveAt) { slWaveAt = null; slLaunchWave(); }
}

function slLaunchWave() {
  const d = slDifficulty(), w = slWave++;
  const EARLY = [1, 2, 1, 2, 3];   // a gentle first few waves, and no broccoli yet
  const n = w < EARLY.length ? EARLY[w] : slRandInt(d > 0.25 ? 2 : 1, 2 + Math.round(d * 4));
  let veg = 0;
  if (w >= EARLY.length && Math.random() < 0.22 + d * 0.33) veg = d > 0.6 && Math.random() < 0.3 ? 2 : 1;
  const kinds = [];
  for (let i = 0; i < n; i++) kinds.push(slPick(SL_FRUIT_KINDS));
  for (let i = 0; i < veg; i++) kinds.splice(slRandInt(0, kinds.length), 0, 'broccoli');

  const stagger = w >= EARLY.length && kinds.length >= 3 && Math.random() < 0.3 + d * 0.3;
  if (!stagger) {   // a volley: everything at once
    kinds.forEach(k => slLaunch(k, slRand(40, SL_W - 40)));
    SL_SOUND.toss();
    if (veg) slVegCue();
    return;
  }
  // One after another, sweeping across the board.
  const step = SL_STAGGER_MS - d * 80;
  const ltr = Math.random() < 0.5;
  kinds.forEach((k, i) => {
    const t = i / (kinds.length - 1);
    const x = 50 + (SL_W - 100) * (ltr ? t : 1 - t);
    slPending++;
    slEvents.push({ at: slClock + i * step, fn: () => {
      slPending--;
      if (slState !== 'playing') return;
      slLaunch(k, x);
      SL_SOUND.toss();
      if (k === 'broccoli') slVegCue();
    } });
  });
}

function slVegCue() {
  SL_SOUND.vegToss();
  slEvents.push({ at: slClock + 100, fn: () => { if (slState === 'playing') SL_SOUND.vegToss(); } });
}

// Toss one item up from just below the board. The flight is solved so it
// peaks at a chosen height and lands back at a chosen x, both on screen, so
// nothing ever leaves by the sides where you can't reach it.
function slLaunch(kind, x) {
  const d = SL_FRUIT[kind];
  const y = SL_H + d.r * SL_FRUIT_SIZE + 6;
  const apex = slRand(SL_APEX_MIN, SL_APEX_MAX);
  const vy = -Math.sqrt(2 * SL_GRAV * (y - apex));
  const T = 2 * -vy / SL_GRAV;
  const xEnd = slClamp(SL_W / 2 + (SL_W / 2 - x) * slRand(0.1, 0.8) + slRand(-50, 50), 30, SL_W - 30);
  const spin = slRand(-3.5, 3.5) * (slArt === 'fruity' ? SL_CHAR_SPIN : 1);
  const rot = slArt === 'fruity' ? slRand(-0.6, 0.6) : Math.random() * SL_TAU;   // faces start roughly upright
  slItems.push({ kind, x, y, vx: (xEnd - x) / T, vy, rot, spin, scale: SL_FRUIT_SIZE,
                 pin: null, born: slClock, ph: Math.random() * 5000 });
}

// ── Loop ─────────────────────────────────────────────────────────────────────
function slLoop(now) {
  slRaf = null;
  if (!slLastT) slLastT = now;
  const dt = Math.min((now - slLastT) / 1000, 0.05);   // a backgrounded tab can't bank time
  slLastT = now;

  // Freeze behind the global sound overlay, same as asherplane — it covers
  // the stage, and nothing should run over a child who can't see it.
  const so     = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  if (!paused) slUpdate(dt);
  slDraw();
  if (!slRaf) slRaf = requestAnimationFrame(slLoop);
}

function slUpdate(dt) {
  slClock += dt * 1000;
  if (slShake > 0) slShake = Math.max(0, slShake - dt);

  // Slicing the broccoli stops the clock on everything still whole.
  const frozen = slState === 'dying' && slDeath.kind === 'veg';
  const pdt = dt * slSpeedMul();

  for (const it of slItems) {
    if (it.pin) {
      it.x   = it.pin.x;
      it.y   = it.pin.y + Math.sin(slClock / 600 + it.pin.ph) * 4;
      it.rot = Math.sin(slClock / 900 + it.pin.ph * 1.3) * 0.18;
      continue;
    }
    if (frozen) continue;
    it.vy  += SL_GRAV * pdt;
    it.x   += it.vx * pdt;
    it.y   += it.vy * pdt;
    it.rot += it.spin * pdt;
  }
  const gone = slItems.filter(it => !it.pin && it.vy > 0 && it.y - SL_FRUIT[it.kind].r * it.scale - 10 > SL_H);
  if (gone.length) {
    slItems = slItems.filter(it => !gone.includes(it));
    gone.forEach(slDropped);
  }

  slHalves.forEach(h => {
    h.vy  += SL_GRAV * pdt;
    h.x   += h.vx * pdt;
    h.y   += h.vy * pdt;
    h.rot += h.spin * pdt;
  });
  slHalves = slHalves.filter(h => h.y < SL_H + 90 || h.vy < 0);

  slParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.spin) p.rot += p.spin * dt;
    if (p.grow) p.r += p.grow * dt;
    p.life -= dt;
  });
  slParts  = slParts.filter(p => p.life > 0);
  slSplats = slSplats.filter(s => slClock - s.at < SL_SPLAT_MS);
  slTexts  = slTexts.filter(t => slClock - t.at < t.life);
  slMarks  = slMarks.filter(m => slClock - m.at < 1000);
  slTrail  = slTrail.filter(p => slClock - p.at < SL_TRAIL_MS);

  if (slCombo.n && slClock - slCombo.at > SL_COMBO_GAP_MS) slFinishCombo();
  if (slState === 'playing') slUpdateWaves();
  if (slState === 'dying' && slClock - slDeath.at >= SL_DYING_MS) slAfterDeath();

  if (slEvents.length) {
    const due = slEvents.filter(e => slClock >= e.at);
    slEvents  = slEvents.filter(e => slClock <  e.at);
    due.forEach(e => e.fn());
  }
}

// ── Slicing ──────────────────────────────────────────────────────────────────
// One blade segment, a → b. Anything it passes through is cut, nearest-first
// along the swipe, so a broccoli early in the stroke ends it there.
function slCut(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  if (L2 < 1) return;
  const ang = Math.atan2(dy, dx);
  const hits = [];
  for (const it of slItems) {
    if (slClock < it.born) continue;                    // still waiting to pop in
    const rr = SL_FRUIT[it.kind].r * it.scale + SL_HIT_PAD;
    if (it.y - rr > SL_H) continue;                      // not on screen yet
    const t  = slClamp(((it.x - ax) * dx + (it.y - ay) * dy) / L2, 0, 1);
    const ex = ax + dx * t - it.x, ey = ay + dy * t - it.y;
    if (ex * ex + ey * ey <= rr * rr) hits.push({ it, t });
  }
  hits.sort((a, b) => a.t - b.t);
  for (const h of hits) {
    if (slState !== 'playing' && slState !== 'attract') break;
    slSlice(h.it, ang);
  }
}

function slSlice(it, ang) {
  slItems = slItems.filter(o => o !== it);
  const d = SL_FRUIT[it.kind];
  slSpawnHalves(it, ang);
  slSlashFx(it, ang);
  if (d.veg) slVegBurst(it.x, it.y, it.pin ? 0.4 : 1);
  else { slJuice(it, ang); slSplat(it); }

  if (it.pin) {   // the attract screen's demo: no score, and it comes back
    playSecretBeep(d.veg ? 98 : slPick(SL_SLICE_NOTES.slice(0, 4)));
    const { x, y } = it.pin;
    slEvents.push({ at: slClock + SL_RESPAWN_MS, fn: () => {
      if (slState === 'attract') slAddPinned(it.kind, x, y, slClock);
    } });
    return;
  }
  if (d.veg) { slDie('veg', it.x, it.y); return; }

  slSliced++;
  slAddScore(1);
  slCombo.n++;
  slCombo.at = slClock;
  slCombo.x  = it.x;
  slCombo.y  = it.y;
  playSecretBeep(SL_SLICE_NOTES[Math.min(slCombo.n, SL_SLICE_NOTES.length) - 1]);
}

function slAddScore(k) {
  slScore += k;
  slScorePopAt = slClock;
  while (slScore >= slNextLifeAt) {
    slNextLifeAt += SL_LIFE_EVERY;
    if (slStrikes > 0) {
      slStrikes--;
      slPhewAt = slClock;
      slTexts.push({ x: 298, y: 80, at: slClock, life: 900, lines: [['PHEW!', 'bold 18px monospace', SL_CREAM]] });
      SL_PHEW_JINGLE.forEach((f, i) => slEvents.push({ at: slClock + 200 + i * 90, fn: () => playSecretBeep(f) }));
    }
  }
}

function slFinishCombo() {
  const c = slCombo;
  if (c.n >= SL_COMBO_MIN && slState === 'playing') {
    slAddScore(c.n);
    const salad = c.n >= SL_SALAD_MIN;
    slTexts.push({ x: slClamp(c.x, 110, SL_W - 110), y: slClamp(c.y, 140, 500), at: slClock, life: 1100,
                   tilt: slRand(-0.12, 0.12), pop: true, lines: [
      [salad ? 'FRUIT SALAD!' : `${c.n} FRUIT COMBO`, `bold ${salad ? 30 : 22}px monospace`, salad ? SL_LEMON : SL_CREAM],
      ['+' + c.n, 'bold 34px monospace', SL_LEMON],
    ] });
    slConfetti(c.x, c.y, salad ? 46 : 18);
    SL_COMBO_JINGLE.forEach((f, i) => slEvents.push({ at: slClock + 60 + i * 80, fn: () => playSecretBeep(f) }));
  }
  slCombo = { n: 0, at: 0, x: 0, y: 0 };
}

// A whole item fell off the bottom. Only fruit counts — letting the broccoli
// go is exactly right.
function slDropped(it) {
  if (SL_FRUIT[it.kind].veg || slState !== 'playing') return;
  slStrikes++;
  slStrikeAt = slClock;
  slMarks.push({ x: slClamp(it.x, 20, SL_W - 20), at: slClock });
  SL_SOUND.miss();
  if (slStrikes >= SL_MAX_STRIKES) slDie('loop', it.x, SL_H - 40);
}

function slDie(kind, x, y) {
  slFinishCombo();   // a combo that was mid-swipe still counts
  slDeath = { kind, at: slClock, x, y };
  slLastScore = slScore;
  if (kind === 'veg') {
    SL_SOUND.veg();
    slEvents.push({ at: slClock + 120, fn: () => playSecretBeep(82) });
    slShake = 0.45;
    slFlashAt = slClock;
  } else {
    slShake = 0.2;
  }
  SL_OVER_JINGLE.forEach((f, k) => slEvents.push({ at: slClock + 650 + k * 140, fn: () => playSecretBeep(f) }));
  // Deliberately NOT slEnterState(): that zeroes slShake, and the shake is
  // the point of this state. The RAF loop is already running.
  slState = 'dying';
}

function slAfterDeath() {
  if (slQualifies(slLastScore)) {
    slInitials = [0, 0, 0];
    SL_SOUND.highScore();
    slEnterState('nameEntry');
  } else {
    slEnterState('leaderboard');
  }
}

// ── Pieces, juice and particles ──────────────────────────────────────────────
function slSpawnHalves(it, ang) {
  const nx = -Math.sin(ang), ny = Math.cos(ang);   // the cut's normal — halves part along it
  const push = 60 + Math.random() * 50;
  [1, -1].forEach(side => slHalves.push({
    kind: it.kind, side, scale: it.scale, cut: ang - it.rot, rot: it.rot, ph: it.ph,
    x:  it.x + nx * side * 2,
    y:  it.y + ny * side * 2,
    vx: it.vx * 0.5 + nx * side * push + Math.cos(ang) * 25,
    vy: it.vy * 0.3 + ny * side * push - 30,
    spin: it.spin * 0.5 + side * (1.5 + Math.random() * 2.5),
  }));
}

function slJuice(it, ang) {
  const d = SL_FRUIT[it.kind];
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const n = it.kind === 'watermelon' ? 24 : 16;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const along = (Math.random() - 0.3) * 160;
    const out = (40 + Math.random() * 180) * side;
    slParts.push({ x: it.x, y: it.y,
                   vx: Math.cos(ang) * along + nx * out, vy: Math.sin(ang) * along + ny * out - 40,
                   grav: 520, drag: 1.2, life: 0.35 + Math.random() * 0.45, max: 0.8,
                   kind: 'drop', r: (1.8 + Math.random() * 3.2) * it.scale, colour: d.juice });
  }
}

// The moment of the cut: a bright slash across the fruit, a ring of juice
// colour and a few sparkles.
function slSlashFx(it, ang) {
  const d = SL_FRUIT[it.kind], R = d.r * it.scale;
  slParts.push({ x: it.x, y: it.y, vx: 0, vy: 0, life: 0.2, max: 0.2, kind: 'slash', ang, r: R * 1.9 });
  slParts.push({ x: it.x, y: it.y, vx: 0, vy: 0, life: 0.32, max: 0.32, kind: 'ring', r: R * 0.6, grow: R * 5,
                 colour: d.veg ? '#FF5A5A' : d.juice });
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * SL_TAU, sp = 60 + Math.random() * 120;
    slParts.push({ x: it.x, y: it.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, drag: 2.5,
                   life: 0.35 + Math.random() * 0.25, max: 0.6, kind: 'spark', r: 3 + Math.random() * 3,
                   rot: Math.random(), spin: 6, colour: '#FFFFFF' });
  }
}

// Combo confetti in all the fruit's colours.
function slConfetti(x, y, n) {
  const cols = [SL_LEMON, '#FF5367', '#FFB07A', '#C77DFF', '#7FD67A', '#FFFFFF', '#4FC3F7'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * SL_TAU, sp = 120 + Math.random() * 260;
    slParts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, grav: 520, drag: 1.4,
                   life: 0.7 + Math.random() * 0.6, max: 1.3, kind: 'bit', r: 2 + Math.random() * 2.5,
                   rot: Math.random() * 3, spin: (Math.random() - 0.5) * 14, colour: slPick(cols) });
  }
}

function slSplat(it) {
  const d = SL_FRUIT[it.kind], R = d.r * it.scale;
  const blobs = [{ x: 0, y: 0, r: R * 0.55 }];
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * SL_TAU, dist = R * (0.4 + Math.random() * 0.9);
    blobs.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: 2 + Math.random() * R * 0.22 });
  }
  slSplats.push({ x: it.x, y: it.y, colour: d.juice, blobs, at: slClock });
  if (slSplats.length > SL_MAX_SPLATS) slSplats.shift();
}

function slVegBurst(x, y, k) {
  const greens = ['#2E7D32', '#43A047', '#66BB6A', '#A5D06B'];
  for (let i = 0; i < 26 * k; i++) {
    const a = Math.random() * SL_TAU, s = 80 + Math.random() * 260;
    slParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 300, drag: 1.5,
                   life: 0.6 + Math.random() * 0.6, max: 1.2, kind: 'bit', r: 2 + Math.random() * 3,
                   rot: Math.random() * 3, spin: (Math.random() - 0.5) * 10, colour: slPick(greens) });
  }
  for (let i = 0; i < 7 * k; i++) {
    const a = Math.random() * SL_TAU, s = 20 + Math.random() * 50;
    slParts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
                   life: 0.9 + Math.random() * 0.4, max: 1.3, kind: 'puff', r: 10 + Math.random() * 8, grow: 40,
                   colour: '#A5D06B' });
  }
}

// ── Session leaderboard — highest first ──────────────────────────────────────
function slQualifies(score) {
  if (score <= 0) return false;
  if (slBoardScores.length < SL_TOP_N) return true;
  return score > slBoardScores[slBoardScores.length - 1].score;
}

function slSubmitScore(name, score) {
  slBoardScores.push({ name, score });
  slBoardScores.sort((a, b) => b.score - a.score);
  slBoardScores = slBoardScores.slice(0, SL_TOP_N);
}

// ── Drawing ──────────────────────────────────────────────────────────────────
function slRR(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function slDraw() {
  const g = slCtx;
  g.save();
  if (slShake > 0) {
    g.translate((Math.random() - 0.5) * 48 * slShake, (Math.random() - 0.5) * 48 * slShake);
  }
  g.fillStyle = SL_TEAL;
  g.fillRect(-30, -30, SL_W + 60, SL_H + 60);
  if (slBoard && slBoard.width && slBoard.height) g.drawImage(slBoard, 0, 0, SL_W, SL_H);

  slDrawSplats();
  slHalves.forEach(slDrawHalf);
  slItems.forEach(it => {
    let k = 1;
    if (it.pin) {   // the lineup pops in
      const t = (slClock - it.born) / 260;
      if (t <= 0) return;
      k = t < 1 ? slEaseOutBack(t) : 1;
    }
    slDrawWhole(it.kind, it.x, it.y, it.rot, it.scale * k, it.ph);
  });
  slDrawParts();

  if (slState === 'attract') {
    slDrawAttract();
  } else if (slState === 'playing' || slState === 'dying') {
    slDrawMarks();
    slDrawHud();
    slDrawTexts();
    if (slState === 'dying') {
      const f = 1 - (slClock - slFlashAt) / 380;
      if (f > 0) {
        g.fillStyle = `rgba(236,248,220,${(0.85 * f).toFixed(3)})`;
        g.fillRect(-30, -30, SL_W + 60, SL_H + 60);
      }
      slDrawDeathText();
    }
  } else {
    g.fillStyle = SL_SCRIM;
    g.fillRect(-30, -30, SL_W + 60, SL_H + 60);
    if (slState === 'nameEntry') slDrawNameEntry();
    else slDrawLeaderboard();
  }
  slDrawTrail();   // the blade is always on top
  g.restore();
}

function slDrawSplats() {
  const g = slCtx;
  slSplats.forEach(s => {
    const left = SL_SPLAT_MS - (slClock - s.at);
    g.globalAlpha = 0.6 * slClamp(left / 1200, 0, 1);
    g.fillStyle = s.colour;
    g.beginPath();
    s.blobs.forEach(b => { g.moveTo(s.x + b.x + b.r, s.y + b.y); g.arc(s.x + b.x, s.y + b.y, b.r, 0, SL_TAU); });
    g.fill();
  });
  g.globalAlpha = 1;
}

// A pointed lens shape along the x axis — the slash streak and the title glint.
function slLens(g, L, w) {
  g.beginPath();
  g.moveTo(-L, 0);
  g.quadraticCurveTo(0, -w, L, 0);
  g.quadraticCurveTo(0, w, -L, 0);
  g.fill();
}

function slSparkle(g, x, y, r, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.moveTo(0, -r); g.quadraticCurveTo(0, 0, r, 0); g.quadraticCurveTo(0, 0, 0, r);
  g.quadraticCurveTo(0, 0, -r, 0); g.quadraticCurveTo(0, 0, 0, -r);
  g.fill();
  g.restore();
}

function slDrawParts() {
  const g = slCtx;
  slParts.forEach(p => {
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    const f = Math.max(0, p.life / p.max);   // 1 → 0 over the particle's life
    g.fillStyle = p.colour;
    if (p.kind === 'puff') {
      g.globalAlpha = a * 0.5;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, SL_TAU); g.fill();
    } else if (p.kind === 'bit') {
      g.globalAlpha = a;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      g.restore();
    } else if (p.kind === 'slash') {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.ang);
      g.globalAlpha = f;
      const L = p.r * (1.15 - f * 0.25);
      g.fillStyle = 'rgba(255,229,0,0.6)';
      slLens(g, L * 1.06, 3 + 10 * f);
      g.fillStyle = '#FFFFFF';
      slLens(g, L, 1 + 4 * f);
      g.restore();
    } else if (p.kind === 'ring') {
      g.globalAlpha = f * 0.9;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, SL_TAU);
      g.lineWidth = 1 + 5 * f; g.strokeStyle = p.colour; g.stroke();
    } else if (p.kind === 'spark') {
      g.globalAlpha = a;
      slSparkle(g, p.x, p.y, p.r * (0.5 + f * 0.5), p.rot);
    } else {
      g.globalAlpha = a;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, SL_TAU); g.fill();
      if (p.r > 3) {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath(); g.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.32, 0, SL_TAU); g.fill();
      }
    }
  });
  g.globalAlpha = 1;
}

// The blade: a white streak with an electric-lemon glow, thick at the
// fingertip and tapering away as the trail ages. Each stroke is filled as one
// tapered ribbon (not segment by segment), so the see-through glow has no
// darker beads where segments would overlap.
function slDrawTrail() {
  const strokes = [];
  slTrail.forEach(p => {
    if (p.brk || !strokes.length) strokes.push([]);   // brk starts a new stroke — never join the two
    strokes[strokes.length - 1].push(p);
  });
  strokes.forEach(pts => {
    if (pts.length < 2) return;
    const n = pts.length;
    const width = i => Math.max(0.5, (1 - (slClock - pts[i].at) / SL_TRAIL_MS) * (2 + 9 * i / (n - 1)));
    slRibbon(pts, i => width(i) * 2.6, 'rgba(255,229,0,0.4)');
    slRibbon(pts, width, '#FFFFFF');
  });
}

function slRibbon(pts, widthAt, fill) {
  const g = slCtx, n = pts.length, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, w = widthAt(i) / 2;
    left.push([pts[i].x + nx * w, pts[i].y + ny * w]);
    right.push([pts[i].x - nx * w, pts[i].y - ny * w]);
  }
  const outline = left.concat(right.reverse());
  let area = 0;
  outline.forEach(([x, y], i) => { const [x2, y2] = outline[(i + 1) % outline.length]; area += x * y2 - x2 * y; });
  g.beginPath();
  outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  // A round fingertip, wound the same way as the ribbon so the overlap stays filled.
  const tip = pts[n - 1], r = widthAt(n - 1) / 2;
  g.moveTo(tip.x + r, tip.y);
  g.arc(tip.x, tip.y, r, 0, SL_TAU, area < 0);
  g.fillStyle = fill;
  g.fill();
}

// Text with a dark-ink outline reads on cloth, fruit and juice alike.
function slOutlined(text, x, y, font, fill, align = 'left', lw = 6) {
  const g = slCtx;
  g.font = font;
  g.textAlign = align;
  g.lineJoin = 'round';
  g.lineWidth = lw;
  g.strokeStyle = SL_INK;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

// Plain text, no outline (for text that sits on a panel).
function slLabel(text, x, y, size, fill, align = 'center') {
  const g = slCtx;
  g.font = `bold ${size}px monospace`;
  g.textAlign = align;
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

function slDrawX(x, y, s, colour, pop) {
  const g = slCtx;
  g.save();
  g.translate(x, y);
  const k = 1 + pop * 0.6;
  g.scale(k, k);
  g.beginPath();
  g.moveTo(-s, -s); g.lineTo(s, s);
  g.moveTo(s, -s);  g.lineTo(-s, s);
  g.lineCap = 'round';
  g.lineWidth = s * 0.95 + 5; g.strokeStyle = SL_INK; g.stroke();
  g.lineWidth = s * 0.95;     g.strokeStyle = colour; g.stroke();
  g.restore();
}

function slDrawHud() {
  const g = slCtx;
  const tg = g.createLinearGradient(0, 0, 0, 110);
  tg.addColorStop(0, 'rgba(2,24,28,0.5)');
  tg.addColorStop(1, 'rgba(2,24,28,0)');
  g.fillStyle = tg;
  g.fillRect(0, 0, SL_W, 110);

  const pop = Math.max(0, 1 - (slClock - slScorePopAt) / 180);
  g.save();
  g.translate(18, 54);
  g.scale(1 + pop * 0.2, 1 + pop * 0.2);
  slOutlined(String(slScore), 0, 0, 'bold 42px monospace', '#FFFFFF', 'left', 8);
  g.restore();
  const best = slBoardScores[0];
  if (best) slOutlined('BEST ' + Math.max(best.score, slScore), 18, 80, 'bold 14px monospace', SL_LEMON, 'left', 5);

  // Strikes, small to big like the classic. Lit ones are red; the one just
  // won back pulses.
  const xs = [262, 296, 332], sizes = [7.5, 9, 10.5];
  for (let i = 0; i < SL_MAX_STRIKES; i++) {
    const on = i < slStrikes;
    let pop2 = 0;
    if (on && i === slStrikes - 1) pop2 = Math.max(0, 1 - (slClock - slStrikeAt) / 260);
    if (!on && i === slStrikes) pop2 = Math.max(0, 1 - (slClock - slPhewAt) / 400);
    slDrawX(xs[i], 36, sizes[i], on ? SL_RED : 'rgba(255,246,220,0.35)', pop2);
  }

  if (slState === 'playing' && slSliced === 0) {   // a ghost swipe shows how
    const k = (slClock % 1400) / 1400;
    slOutlined('SWIPE TO SLICE', SL_W / 2, 596, 'bold 18px monospace', SL_LEMON, 'center', 6);
    if (k < 0.5) {
      const u = k / 0.5, x0 = 110, x1 = 250, y0 = 560, y1 = 548;
      g.save();
      g.globalAlpha = 1 - u;
      g.translate(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
      g.rotate(Math.atan2(y1 - y0, x1 - x0));
      g.fillStyle = 'rgba(255,229,0,0.5)'; slLens(g, 40, 7);
      g.fillStyle = '#FFFFFF'; slLens(g, 34, 2.5);
      g.restore();
    }
  }
}

function slDrawMarks() {
  const g = slCtx;
  slMarks.forEach(m => {
    const age = slClock - m.at;
    g.globalAlpha = slClamp((1000 - age) / 400, 0, 1);
    slDrawX(m.x, 610, 10, SL_RED, Math.max(0, 1 - age / 200));
  });
  g.globalAlpha = 1;
}

function slDrawTexts() {
  const g = slCtx;
  slTexts.forEach(t => {
    const age = slClock - t.at;
    const rise = (age / t.life) * 30;
    const grow = t.pop ? slEaseOutBack(Math.min(1, age / 220)) : Math.min(1, age / 120);
    g.globalAlpha = slClamp((t.life - age) / 300, 0, 1);
    g.save();
    g.translate(t.x, t.y - rise);
    if (t.tilt) g.rotate(t.tilt);
    const s = t.pop ? grow : 0.7 + 0.3 * grow;
    g.scale(s, s);
    t.lines.forEach(([text, font, colour], i) => slOutlined(text, 0, i * 34, font, colour, 'center', 7));
    g.restore();
  });
  g.globalAlpha = 1;
}

function slDrawDeathText() {
  const g = slCtx, age = slClock - slDeath.at;
  const veg = slDeath.kind === 'veg';
  const word = SL_DEATH_WORDS[slDeath.kind];
  const t = slEaseOutBack(Math.min(1, age / 260));
  g.save();
  g.translate(SL_W / 2, 268);
  g.rotate(-0.06 + Math.sin(age / 140) * 0.02);
  g.scale(t, t);
  slRR(g, -160, -30, 320, 72, 18);
  g.fillStyle = SL_INK; g.fill();
  slRR(g, -160, -36, 320, 72, 18);
  g.fillStyle = SL_PANEL; g.fill();
  g.lineWidth = 3; g.strokeStyle = veg ? '#8BD45B' : SL_LEMON; g.stroke();
  g.textBaseline = 'middle';
  slOutlined(word, 0, 1, 'bold 36px monospace', veg ? '#B6F09C' : SL_LEMON, 'center', 7);
  g.textBaseline = 'alphabetic';
  g.restore();
  if (age > 500) {
    slOutlined('SCORE ' + slLastScore, SL_W / 2, 346, 'bold 24px monospace', '#FFFFFF', 'center', 7);
  }
}

// Buttons: 'lemon' is the big juicy one; 'ink' is the quiet one beside it.
function slDrawButton(r, label, size = 22, kind = 'lemon') {
  const g = slCtx;
  slRR(g, r.x, r.y + 5, r.w, r.h, 16);
  g.fillStyle = kind === 'lemon' ? SL_LEMON_DK : '#0E0B0A';
  g.fill();
  g.lineWidth = 3; g.strokeStyle = SL_INK; g.stroke();
  slRR(g, r.x, r.y, r.w, r.h, 16);
  if (kind === 'lemon') {
    const lg = g.createLinearGradient(0, r.y, 0, r.y + r.h);
    lg.addColorStop(0, '#FFF59A');
    lg.addColorStop(0.5, SL_LEMON);
    lg.addColorStop(1, '#FFD000');
    g.fillStyle = lg;
  } else {
    g.fillStyle = SL_INK;
  }
  g.fill();
  g.lineWidth = 3; g.strokeStyle = kind === 'lemon' ? SL_INK : SL_CREAM; g.stroke();
  slRR(g, r.x + 10, r.y + 6, r.w - 20, Math.min(16, r.h * 0.28), 8);
  g.fillStyle = kind === 'lemon' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.07)';
  g.fill();
  g.textBaseline = 'middle';
  slLabel(label, r.x + r.w / 2, r.y + r.h / 2 + 2, size, kind === 'lemon' ? SL_INK : SL_CREAM);
  g.textBaseline = 'alphabetic';
}

// A dark panel with a lemon rim and a chunky ink lip under it.
function slPanel(x, y, w, h) {
  const g = slCtx;
  slRR(g, x, y + 6, w, h, 20);
  g.fillStyle = SL_INK; g.fill();
  slRR(g, x, y, w, h, 20);
  g.fillStyle = SL_PANEL; g.fill();
  g.lineWidth = 3; g.strokeStyle = SL_LEMON; g.stroke();
  slRR(g, x + 7, y + 7, w - 14, h - 14, 14);
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,229,0,0.22)'; g.stroke();
}

// The title, already sliced: one steep slash through both words, the top-left
// half nudged up and away so a hairline of cloth shows through, and a glint
// that runs down the cut every few seconds.
const SL_TITLE_CUT = [96, 214, 264, 62];   // x0, y0 (bottom-left) → x1, y1 (top-right)
function slDrawTitle() {
  const g = slCtx;
  const words = SL_TITLE.split(' ');
  const lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [SL_TITLE];
  const ys = lines.length > 1 ? [116, 184] : [150];
  const longest = Math.max(...lines.map(s => s.length));
  const size = Math.min(66, Math.floor(330 / (longest * 0.6)));
  const [x0, y0, x1, y1] = SL_TITLE_CUT;
  const dx = x1 - x0, dy = y1 - y0;
  const E0 = [x0 - dx * 3, y0 - dy * 3], E1 = [x1 + dx * 3, y1 + dy * 3];
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center';
  g.lineJoin = 'round';
  [[-1, -4, -5], [1, 3, 3]].forEach(([side, ox, oy]) => {
    g.save();
    g.beginPath();
    g.moveTo(E0[0], E0[1]); g.lineTo(E1[0], E1[1]);
    g.lineTo(side < 0 ? -3000 : 3000, side < 0 ? -3000 : 3000);
    g.closePath();
    g.clip();
    g.translate(ox, oy);
    lines.forEach((text, i) => {
      const y = ys[i];
      g.lineWidth = 12; g.strokeStyle = SL_INK;
      g.strokeText(text, SL_W / 2, y + 6);       // the drop shadow
      g.fillStyle = SL_INK; g.fillText(text, SL_W / 2, y + 6);
      g.strokeText(text, SL_W / 2, y);
      const fg = g.createLinearGradient(0, y - size * 0.75, 0, y);
      fg.addColorStop(0, '#FFF7A8');
      fg.addColorStop(0.55, SL_LEMON);
      fg.addColorStop(1, '#FFC400');
      g.fillStyle = fg;
      g.fillText(text, SL_W / 2, y);
    });
    g.restore();
  });
  // the glint along the cut
  const k = ((slClock - slTitleCutAt) % 2800) / 2800;
  if (k < 0.22) {
    const u = k / 0.22;
    const len = Math.hypot(dx, dy);
    g.save();
    g.translate(x0 + dx * u, y0 + dy * u);
    g.rotate(Math.atan2(dy, dx));
    g.globalAlpha = Math.sin(u * Math.PI);
    g.fillStyle = 'rgba(255,229,0,0.6)'; slLens(g, len * 0.22, 7);
    g.fillStyle = '#FFFFFF'; slLens(g, len * 0.18, 2.4);
    g.restore();
  }
}

// The art toggle: one pill, two halves. The lit half is the art in play.
function slDrawToggle() {
  const g = slCtx, a = SL_TOG_PLAIN, b = SL_TOG_FRUITY;
  const x = a.x, y = a.y, w = a.w + b.w, h = a.h;
  slRR(g, x, y + 4, w, h, h / 2);
  g.fillStyle = SL_INK; g.fill();
  slRR(g, x, y, w, h, h / 2);
  g.fillStyle = SL_PANEL; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,229,0,0.75)'; g.stroke();
  const on = slArt === 'plain' ? a : b;
  slRR(g, on.x + 5, on.y + 5, on.w - 10, on.h - 10, (h - 10) / 2);
  const lg = g.createLinearGradient(0, on.y, 0, on.y + on.h);
  lg.addColorStop(0, '#FFF59A'); lg.addColorStop(1, '#FFD400');
  g.fillStyle = lg; g.fill();
  g.textBaseline = 'middle';
  slLabel('PLAIN', a.x + a.w / 2 + 2, y + h / 2 + 1, 15, slArt === 'plain' ? SL_INK : 'rgba(255,246,220,0.7)');
  slLabel('PERSONALITIES', b.x + b.w / 2 - 2, y + h / 2 + 1, 15, slArt === 'fruity' ? SL_INK : 'rgba(255,246,220,0.7)');
  g.textBaseline = 'alphabetic';
}

function slDrawAttract() {
  const g = slCtx;
  const tg = g.createLinearGradient(0, 0, 0, 250);
  tg.addColorStop(0, 'rgba(2,24,28,0.6)');
  tg.addColorStop(1, 'rgba(2,24,28,0)');
  g.fillStyle = tg;
  g.fillRect(0, 0, SL_W, 250);

  slOutlined('A FRUIT SALAD SIDE DISH', SL_W / 2, 46, 'bold 13px monospace', SL_CREAM, 'center', 5);
  slDrawTitle();
  slOutlined("SWIPE TO SLICE · DON'T DROP THREE", SL_W / 2, 234, 'bold 12px monospace', SL_CREAM, 'center', 5);

  const wob = Math.sin(slClock / 220) * 2;
  slOutlined('NOT THIS ONE!', 140 + wob, 457, 'bold 17px monospace', '#FF8A8A', 'left', 6);

  slDrawToggle();
  slDrawButton(SL_BTN_PLAY, 'PLAY', 30);
  const best = slBoardScores[0];
  slOutlined(best ? `BEST ${best.score} · ${best.name}` : 'NO SCORES YET', SL_W / 2, 630, 'bold 13px monospace',
             best ? SL_LEMON : 'rgba(255,246,220,0.6)', 'center', 5);
}

function slDrawNameEntry() {
  const g = slCtx;
  slPanel(24, 100, 312, 320);
  slOutlined('NEW HIGH SCORE!', SL_W / 2, 150, 'bold 26px monospace', SL_LEMON, 'center', 6);
  slLabel(String(slLastScore), SL_W / 2, 210, 46, SL_CREAM);
  slLabel('TAP A LETTER TO CHANGE IT', SL_W / 2, 258, 12, 'rgba(255,246,220,0.75)');
  SL_SLOTS.forEach((r, i) => {
    slRR(g, r.x, r.y, r.w, r.h, 12);
    g.fillStyle = 'rgba(255,229,0,0.08)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = SL_LEMON; g.stroke();
    g.textBaseline = 'middle';
    slLabel(SL_ALPHABET[slInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 3, 46, SL_LEMON);
    g.textBaseline = 'alphabetic';
  });
  slDrawButton(SL_BTN_OK, 'OK', 26);
}

function slDrawLeaderboard() {
  const g = slCtx;
  slPanel(24, 56, 312, 456);
  slLabel("ORANGE YOU GLAD IT'S OVER?", SL_W / 2, 92, 12, 'rgba(255,246,220,0.75)');
  slOutlined('HIGH SCORES', SL_W / 2, 132, 'bold 30px monospace', SL_LEMON, 'center', 7);
  slLabel(`THIS RUN: ${slLastScore}`, SL_W / 2, 164, 15, SL_CREAM);
  g.fillStyle = 'rgba(255,229,0,0.25)';
  g.fillRect(56, 182, 248, 2);
  if (slBoardScores.length === 0) slLabel('NO SCORES YET', SL_W / 2, 300, 15, 'rgba(255,246,220,0.5)');
  slBoardScores.forEach((e, i) => {
    const y = 228 + i * 56;
    const top = i === 0;
    if (top) {
      slRR(g, 40, y - 30, 280, 48, 14);
      g.fillStyle = 'rgba(255,229,0,0.12)'; g.fill();
    }
    slDrawWhole(SL_FRUIT_KINDS[i], 70, y - 7, 0, 0.5, i * 700);
    slLabel(`${e.name}`, 102, y + 1, 24, top ? SL_LEMON : SL_CREAM, 'left');
    slLabel(String(e.score), 304, y + 1, 24, top ? SL_LEMON : SL_CREAM, 'right');
  });
  slDrawButton(SL_BTN_LB_AGAIN, 'PLAY AGAIN', 20);
  slDrawButton(SL_BTN_LB_MENU, 'MENU', 18, 'ink');
}

// ── Input ────────────────────────────────────────────────────────────────────
function slToLogical(e) {
  const r = slCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * SL_W / r.width,
           y: (e.clientY - r.top)  * SL_H / r.height };
}

function slHit(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Menu buttons fire on press (like the other cabinets). Returns true when the
// press was a menu tap, so it doesn't also become a blade.
function slOnDown(p) {
  if (slState === 'attract') {
    if (slHit(SL_BTN_PLAY, p)) { SL_SOUND.select(); slEnterState('playing'); return true; }
    if (slHit(SL_TOG_PLAIN, p))  { slSetArt('plain');  return true; }
    if (slHit(SL_TOG_FRUITY, p)) { slSetArt('fruity'); return true; }
    return false;
  }
  if (slState === 'nameEntry') {
    for (let i = 0; i < SL_SLOTS.length; i++) {
      if (!slHit(SL_SLOTS[i], p)) continue;
      slInitials[i] = (slInitials[i] + 1) % SL_ALPHABET.length;
      SL_SOUND.select();
      return true;
    }
    if (slHit(SL_BTN_OK, p)) {
      SL_SOUND.select();
      slSubmitScore(slInitials.map(i => SL_ALPHABET[i]).join(''), slLastScore);
      slEnterState('leaderboard');
    }
    return true;
  }
  if (slState === 'leaderboard') {
    if (slHit(SL_BTN_LB_AGAIN, p)) { SL_SOUND.select(); slEnterState('playing'); }
    else if (slHit(SL_BTN_LB_MENU, p)) { SL_SOUND.select(); slEnterState('attract'); }
    return true;
  }
  return false;
}

// The art toggle. Cosmetic only — the same fruit, the same hit circles.
function slSetArt(art) {
  if (slArt === art) return;
  slArt = art;
  SL_SOUND.select();
  slTitleCutAt = slClock;
}

function slTrailPush(p, brk) {
  slTrail.push({ x: p.x, y: p.y, at: slClock, brk });
  if (slTrail.length > 40) slTrail.shift();
}

// Move the blade to p. It always draws; it only cuts when the finger is
// actually swiping, so a resting fingertip on a fruit does nothing.
function slBladeTo(pr, p, ts) {
  if (pr.state !== slState) { pr.blade = false; return; }   // the run ended under the finger
  const dx = p.x - pr.x, dy = p.y - pr.y, len = Math.hypot(dx, dy);
  if (len < 1) return;
  const fast = len / Math.max(1, ts - pr.ts) >= SL_BLADE_MIN_SPEED;
  const ax = pr.x, ay = pr.y;
  pr.x = p.x; pr.y = p.y; pr.ts = ts;
  slTrailPush(p, false);
  if (fast) slCut(ax, ay, p.x, p.y);
}

function slStagePointer(e, phase) {
  if (phase === 'down') {
    if (slPtrId !== null) return;              // stage already claimed by another finger
    slPtrId = e.pointerId;
    const p = slToLogical(e);
    const menu = slOnDown(p);
    const blade = !menu && (slState === 'playing' || slState === 'attract');
    slPress = { state: slState, blade, x: p.x, y: p.y, ts: e.timeStamp };
    if (blade) slTrailPush(p, true);
    return;
  }

  if (e.pointerId !== slPtrId) return;         // not the pointer we claimed — ignore

  if (phase === 'move') {
    const pr = slPress;
    if (!pr || !pr.blade) return;
    // A fast flick can travel a long way between frames; the coalesced events
    // keep the blade's path (and what it cuts) faithful to the finger.
    const list = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    (list.length ? list : [e]).forEach(ev => { if (pr.blade) slBladeTo(pr, slToLogical(ev), ev.timeStamp); });
    return;
  }

  // up / cancel — release the stage; lifting the finger closes the swipe's combo
  slPtrId = null;
  slPress = null;
  slFinishCombo();
}

(function slBindInput() {
  const stage = document.getElementById('sl-stage');
  stage.addEventListener('pointerdown',        e => { stage.setPointerCapture(e.pointerId); slStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',        e => { if (e.buttons) slStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',          e => slStagePointer(e, 'up'));
  stage.addEventListener('pointercancel',      e => slStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => slStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',        e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-slice').style.display !== 'none';

  // Slicing needs a pointer (a mouse drag works on desktop); the keyboard
  // can only start a run (and ← → pick the art).
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    if (slState === 'attract' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      SL_SOUND.select();
      slEnterState('playing');
    } else if (slState === 'attract' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      slSetArt(e.key === 'ArrowLeft' ? 'plain' : 'fruity');
    }
  });

  document.getElementById('btn-sl-exit').addEventListener('click', () => {
    resetArcadeSlice();
    resetToLobby();
  });

  // A child WILL put the iPad down mid-run. Stop the loop (everything only
  // moves inside slUpdate, so the run is frozen, not lost) and drop any
  // half-finished swipe, since its pointerup may never arrive.
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (slRaf) { cancelAnimationFrame(slRaf); slRaf = null; }
      slPress = null;
      slPtrId = null;
    } else if (!slRaf) {
      slLastT = 0;
      slRaf = requestAnimationFrame(slLoop);
    }
  });
})();

// Same approach as apResize/msResize/ckResize: fit the fixed 360×640 logical
// canvas into its container, backing store at (CSS scale × devicePixelRatio).
// The tablecloth never changes, so it's painted once per size into slBoard.
function slResize() {
  if (!slCanvas) return;
  const box   = slCanvas.parentElement;
  const scale = Math.min(box.clientWidth / SL_W, box.clientHeight / SL_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  slCanvas.style.width  = Math.floor(SL_W * scale) + 'px';
  slCanvas.style.height = Math.floor(SL_H * scale) + 'px';
  slCanvas.width        = Math.floor(SL_W * scale * dpr);
  slCanvas.height       = Math.floor(SL_H * scale * dpr);
  slCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  slSprites = {};   // the halves' sprites were drawn for the old resolution

  slBoard = slBoard || document.createElement('canvas');
  slBoard.width  = slCanvas.width;
  slBoard.height = slCanvas.height;
  if (slBoard.width && slBoard.height) {
    const bg = slBoard.getContext('2d');
    bg.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    slPaintBoard(bg);
  }
}

// Called from engine.js resetToLobby() (add it beside resetArcade()).
function resetArcadeSlice() {
  if (slRaf) { cancelAnimationFrame(slRaf); slRaf = null; }
  slState  = 'attract';
  slPress  = null;
  slPtrId  = null;
  slEvents = [];
  slParts  = [];
  slTrail  = [];
  slShake  = 0;
  // slBoardScores and slArt are NOT cleared — see their declarations above.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-slice').style.display !== 'none') slResize();
});
