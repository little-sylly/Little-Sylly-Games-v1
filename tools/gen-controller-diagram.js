/* ============================================================
   gen-controller-diagram.js — builds the Workshop How-to Step 1
   diagram's SVG from the controller's OWN geometry.

   Why this file exists: three hand-drawn attempts at that silhouette
   all shipped visibly wrong (shared-implementation-notes TG-13). The
   real outline was never unreachable — buildBody()'s shell carries it
   as geo.userData.poly, and buildEars()/buildShoulder() are literals.
   So the diagram is MEASURED, not drawn.

   Run:  node tools/gen-controller-diagram.js
   Then paste the emitted <svg> block over the one in index.html
   (grep "Test the buttons"). Asserts nothing; exits 0.
   ============================================================ */
global.window = global;
const path = require('path');
const LIB = p => require(path.join(__dirname, '..', 'js', 'lib', p));
const THREE = LIB('three.min.js');
LIB('controller-body.js');
const U = global.window.ControllerBody.buildBody(THREE, {}).userData;

/* ---- 1. the shell outline -------------------------------------------
   extractPoints repeats a point wherever two curves join; those
   duplicates give zero-length segments that poison the arc table. */
const poly = [];
for (const p of U.poly) {
  const q = poly[poly.length - 1];
  if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-9) poly.push({ x: p.x, y: p.y });
}
const N = poly.length, cum = [0];
for (let i = 1; i <= N; i++) {
  const a = poly[i - 1], b = poly[i % N];
  cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
}
function atArc(s) {
  let lo = 0, hi = N;
  while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = poly[lo], b = poly[(lo + 1) % N], seg = cum[lo + 1] - cum[lo] || 1;
  const t = (s - cum[lo]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
// outward normal, direction decided by the body's own SDF (as buildShoulder does)
function normAt(s) {
  const e = 0.004, c = atArc(s), a = atArc(Math.max(0, s - e)), b = atArc(s + e);
  let tx = b.x - a.x, ty = b.y - a.y;
  const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
  let ox = ty, oy = -tx;
  if (U.sdf(c.x + ox * .01, c.y + oy * .01) > U.sdf(c.x, c.y)) { ox = -ox; oy = -oy; }
  return { c, ox, oy };
}

/* ---- 2. the map -----------------------------------------------------
   Flat front-view schematic: x,y straight through, y flipped for SVG's
   downward axis, ONE uniform scale so the shape is not distorted.
   S/TX/TY are framing choices — they set how much of the 440x320 box
   the body fills, leaving the side gutters the labels live in. */
const S = 59.5, TX = 220, TY = 137;
const PX = p => ({ x: S * p.x + TX, y: TY - S * p.y });
const f = n => Math.round(n * 10) / 10;

/* ---- 3. Douglas-Peucker, so 641 points become ~70 of markup ---- */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  let mi = 0, md = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d > md) { md = d; mi = i; }
  }
  return md > tol ? dp(pts.slice(0, mi + 1), tol).slice(0, -1).concat(dp(pts.slice(mi), tol))
                  : [a, b];
}
function pathOf(realPts, tol) {
  let s = realPts.map(PX);
  if (tol) {                                 // split the loop so DP can't chord across it
    const h = Math.floor(s.length / 2);
    s = dp(s.slice(0, h + 1), tol).slice(0, -1).concat(dp(s.slice(h), tol));
  }
  return s.map((p, i) => (i ? 'L' : 'M') + f(p.x) + ',' + f(p.y)).join('') + 'Z';
}

/* ---- 4. the parts ---------------------------------------------------
   Shoulder: the real swept band, outline arc s=1.35..2.34 with the same
   radial span buildShoulder uses (inner edge buried, outer edge proud),
   which is why it reads as a bumper standing off the rim.
   The arc walks -x from top centre, so side=+1 lands on the LEFT in SVG. */
function shoulder(side) {
  const S0 = 1.35, S1 = 2.34, NS = 34, inn = [], out = [];
  for (let i = 0; i < NS; i++) {
    const fr = normAt(S0 + (S1 - S0) * (i / (NS - 1)));
    inn.push({ x: side * (fr.c.x + fr.ox * -0.10), y: fr.c.y + fr.oy * -0.10 });
    out.push({ x: side * (fr.c.x + fr.ox * 0.09), y: fr.c.y + fr.oy * 0.09 });
  }
  return inn.concat(out.reverse());
}
/* D-pad: the real cross (cw .095, cl .30) plus its .03 bevel. K is the one
   deliberate exaggeration in the diagram — at true size the arms are 15 px
   wide in a 440 box and the direction arrows stop reading. */
const K = 1.25;
function cross(cx, cy) {
  const w = 0.125 * K, l = 0.33 * K;
  return [[w, w], [l, w], [l, -w], [w, -w], [w, -l], [-w, -l],
          [-w, -w], [-l, -w], [-l, w], [-w, w], [-w, l], [w, l]]
    .map(o => ({ x: cx + o[0], y: cy + o[1] }));
}

const P = {};
P.body = pathOf(poly, 0.45);
P.shL  = pathOf(shoulder(1), 0.25);
P.shR  = pathOf(shoulder(-1), 0.25);
P.dpad = pathOf(cross(-1.38, -0.85), 0);
/* ears: full ellipses rx .36 ry .52 at (±.84,.80). rotation.x −0.30 foreshortens
   y in a front view; rotation.z −side*.12 becomes +side*.12 deg once y flips. */
const earR = PX({ x: 0.84, y: 0.80 }), earL = PX({ x: -0.84, y: 0.80 });
P.ear = { cxR: f(earR.x), cxL: f(earL.x), cy: f(earR.y),
          rx: f(0.36 * S), ry: f(0.52 * Math.cos(0.30) * S), rot: f(0.12 * 180 / Math.PI) };

const C = {};
[['Lstick', -1.25, 0.20], ['Rstick', 1.25, -0.85],
 ['Y', 1.18, 0.48], ['B', 1.48, 0.18], ['A', 1.18, -0.12], ['X', 0.88, 0.18],
 ['Select', -0.32, -0.30], ['Start', 0.32, -0.30]].forEach(r => {
  const p = PX({ x: r[1], y: r[2] }); C[r[0]] = { x: f(p.x), y: f(p.y) };
});
// real radii, lightly rounded: face cap .150, stick top .24, well mean .27, tube .11
const RF = f(0.150 * S * 1.17), RS = f(0.24 * S * 0.84), RW = f(0.27 * S), WT = f(0.11 * S);
const dc = PX({ x: -1.38, y: -0.85 });
function arrow(a) {                                   // D-pad direction triangles
  const L = 0.33 * K * S, x = dc.x, y = dc.y;
  const t = { u: [[x - 4, y - L + 11], [x + 4, y - L + 11], [x, y - L + 4]],
              d: [[x - 4, y + L - 11], [x + 4, y + L - 11], [x, y + L - 4]],
              l: [[x - L + 11, y - 4], [x - L + 11, y + 4], [x - L + 4, y]],
              r: [[x + L - 11, y - 4], [x + L - 11, y + 4], [x + L - 4, y]] }[a];
  return t.map(p => f(p[0]) + ',' + f(p[1])).join(' ');
}

const BODY = '#d9d5cf', BTN = '#a855f7', WELL = '#7c3aed', LEAD = '#a8a29e', INK = '#44403c';
const I = '            ';
const lab = (x, y, t, anchor) =>
  I + '<text x="' + x + '" y="' + y + '" font-size="13" font-weight="700" fill="' + INK +
  '" text-anchor="' + anchor + '">' + t + '</text>';
const line = (x1, y1, x2, y2) =>
  I + '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
  '" stroke="' + LEAD + '" stroke-width="2"/>';
const ell = (cx, rot) =>
  I + '<ellipse cx="' + cx + '" cy="' + P.ear.cy + '" rx="' + P.ear.rx + '" ry="' + P.ear.ry +
  '" fill="' + BODY + '" transform="rotate(' + rot + ' ' + cx + ' ' + P.ear.cy + ')"/>';
const pth = (fill, d) => I + '<path fill="' + fill + '" d="' + d + '"/>';
const circ = (c, r, fill, stroke) => I + '<circle cx="' + c.x + '" cy="' + c.y + '" r="' + r +
  '" fill="' + fill + (stroke ? '" stroke="' + WELL + '" stroke-width="' + WT : '') + '"/>';
const poly4 = a => I + '<polygon points="' + arrow(a) + '" fill="#fff"/>';
const pill = c => I + '<rect x="' + f(c.x - 8.5) + '" y="' + f(c.y - 4) +
  '" width="17" height="8" rx="4" fill="' + BTN + '"/>';

console.log([
'          <svg viewBox="0 0 440 320" class="w-full max-w-[300px] mx-auto" role="img"',
'            aria-label="Diagram of the controller\'s front, with every button labelled">',
I + '<!-- SILHOUETTE, EARS, SHOULDERS AND BUTTON POSITIONS ARE GENERATED, NOT DRAWN.',
I + '     Every one of them is projected from the controller\'s own geometry in',
I + '     js/lib/controller-body.js by tools/gen-controller-diagram.js — re-run that',
I + '     and paste; do not hand-edit the numbers. Three hand-drawn attempts at this',
I + '     shape all shipped visibly wrong. See shared-implementation-notes TG-13. -->',
I + '<!-- ears — the real rx .36 / ry .52 ellipses, seated and tilted as buildEars does -->',
ell(P.ear.cxL, -P.ear.rot),
ell(P.ear.cxR, P.ear.rot),
I + '<!-- shell — buildBody()\'s own outline: wide wings, a shallow top valley, two',
I + '     grips hanging down, and a shallow arch between them -->',
pth(BODY, P.body),
I + '<!-- L / R — the real swept band: inner edge buried, outer edge proud of the rim -->',
pth(BTN, P.shL),
pth(BTN, P.shR),
I + '<!-- sticks — the well ring, and the cap that tilts inside it -->',
circ(C.Lstick, RW, 'none', true),
circ(C.Lstick, RS, BTN),
circ(C.Rstick, RW, 'none', true),
circ(C.Rstick, RS, BTN),
I + '<!-- D-pad — the one shape that keeps its markings, so a direction still',
I + '     reads as a direction -->',
pth(BTN, P.dpad),
poly4('u'), poly4('d'), poly4('l'), poly4('r'),
I + '<!-- face buttons — the real diamond: centre (1.18, 0.18), radius .30 -->',
circ(C.Y, RF, BTN), circ(C.B, RF, BTN), circ(C.A, RF, BTN), circ(C.X, RF, BTN),
I + '<!-- select / start -->',
pill(C.Select), pill(C.Start),
'',
I + '<!-- leaders + labels — each routed the SHORT way to open surface, so',
I + '     nothing has to cross the body to reach its label -->',
line(55, 26, 106, 86),   lab(8, 20, 'L Button', 'start'),
line(385, 26, 334, 86),  lab(432, 20, 'R Button', 'end'),
'',
line(72, 128, 126, 126), lab(8, 132, 'Left Stick', 'start'),
line(72, 200, 114, 192), lab(8, 206, 'D-pad', 'start'),
'',
line(368, 92, 299, 102), lab(372, 96, 'Y Button', 'start'),
line(368, 126, 319, 126), lab(372, 130, 'B Button', 'start'),
line(368, 160, 299, 151), lab(372, 164, 'A Button', 'start'),
line(368, 200, 312, 190), lab(372, 204, 'Right Stick', 'start'),
'',
line(224, 78, 264, 119), lab(220, 72, 'X Button', 'middle'),
'',
line(190, 272, 201, 164), lab(190, 288, 'Select', 'middle'),
line(252, 272, 239, 164), lab(252, 288, 'Start', 'middle'),
'          </svg>'
].join('\n'));
