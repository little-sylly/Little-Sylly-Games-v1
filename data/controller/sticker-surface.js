/* ============================================================
   Surface-space sticker rasteriser.

   A sticker is no longer pasted into the atlas with drawImage.
   It is ANCHORED TO THE SURFACE, and the atlas is filled by asking,
   for each texel the sticker could touch, "where on the sticker is
   this bit of the body?" -- the inverse direction. That is what
   makes the result independent of how the atlas happens to be
   parameterised, so the rim roll and the grip bulges stop
   distorting it, and a sticker that runs off one island simply
   continues onto the other.

   Two charts, because no single one is well behaved everywhere:

   RIM chart, for stickers near the perimeter.
     p = arc length ALONG the outline   (from the nearest outline point)
     q = arc length ACROSS the roll, signed: + on the front sheet,
         - on the back, 0 exactly at the crest.
     q is exact surface distance, so a sticker wrapping the edge keeps
     its size all the way over. p carries the fan -- the outline is
     shorter further in, and no flattening removes that. The chart is
     degenerate at the medial axis, so it is only used near the edge.

   TANGENT chart, for stickers on the flats.
     Direction from projecting onto the tangent plane at the anchor,
     radius from true 3D distance to the anchor. Using the 3D radius
     rather than the projected one is what keeps a sticker its proper
     size as it climbs a grip bulge -- projected radius is the shadow
     of the sticker, not the sticker.

   Neither chart is isometric; nothing can be, the surface is doubly
   curved. Error goes as (sticker radius / local radius)^2 -- see
   MAX_RATIO below.
   ============================================================ */

function StickerSurface(U, ATLAS, opt) {
  opt = opt || {};
  const RIM = U.RIM, FH = U.FRONT_H, BH = U.BACK_H;
  const GRIDW = opt.gridW || 320;

  /* ---- 1. outline, resampled at uniform arc length ----
     userData.poly comes from extractPoints and repeats points where
     curves join; those zero-length segments have to go or the arc
     length and the tangents are both poisoned. */
  const OUT = (function () {
    const p = [];
    for (const q of U.poly) {
      const l = p[p.length - 1];
      if (!l || Math.hypot(q.x - l.x, q.y - l.y) > 1e-9) p.push({ x: q.x, y: q.y });
    }
    while (p.length > 1 &&
           Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) < 1e-9) p.pop();
    const cum = [0];
    let L = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      L += Math.hypot(b.x - a.x, b.y - a.y); cum.push(L);
    }
    const n = opt.outlineN || 256;
    const xs = new Float64Array(n + 1), ys = new Float64Array(n + 1);
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const t = L * k / n;
      while (j < cum.length - 2 && cum[j + 1] < t) j++;
      const a = p[j], b = p[(j + 1) % p.length];
      const f = (t - cum[j]) / (cum[j + 1] - cum[j] || 1);
      xs[k] = a.x + (b.x - a.x) * f; ys[k] = a.y + (b.y - a.y) * f;
    }
    /* signed curvature per sample: POSITIVE where the outline bulges
       outward. The offset curve at inward distance d has local scale
       (1 - kappa*d), so this sign decides whether the surface fans out
       or crowds in as a sticker crosses the rim. Sign is calibrated
       against the leftmost point, which is unambiguously convex. */
    const kap = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const P = i => { const q = ((i % n) + n) % n; return [xs[q], ys[q]]; };
      const a = P(k - 1), b = P(k), c = P(k + 1);
      const ab = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const bc = Math.hypot(c[0]-b[0], c[1]-b[1]);
      const ca = Math.hypot(a[0]-c[0], a[1]-c[1]);
      const cross = (b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1]);
      kap[k] = (ab*bc*ca > 1e-12) ? 2 * cross / (ab * bc * ca) : 0;
    }
    let lk = 0;
    for (let k = 0; k < n; k++) if (xs[k] < xs[lk]) lk = k;
    if (kap[lk] < 0) for (let k = 0; k < n; k++) kap[k] = -kap[k];
    /* Smoothed with a small moving average. A near-degenerate triple of
       resampled points -- b almost collinear with a and c, or the two
       segments almost equal and opposite -- throws a single-sample
       curvature spike from floating-point noise rather than real
       geometry (measured near both ears: two isolated samples reading
       around -2.9 against neighbours around +0.45 -- the same spurious
       spike on both sides, not an asymmetry in the shell). That spike
       reaching wrapCap or the rim chart's fan correction is what was
       cutting wraps near the ears some of the time and not others,
       depending on exactly where the anchor's own sample landed relative
       to it. A real curvature feature spans many samples and survives
       averaging with its neighbours; noise from one bad triple does not. */
    /* A MEDIAN filter, not an average or a clamp -- both of those were
       tried here first and both were wrong for a different reason. An
       average only pulled the ears' spurious spike from -2.9 to about
       -2.1, since it still blends the bad sample's full weight in. A
       hard clamp afterward did silence it, but a second pass over the
       WHOLE outline found a wide, ~170-sample stretch legitimately
       pinned at that same clamp -- the grip corner, a real, sharp
       feature this code already treats as a genuine keep-out elsewhere.
       Clamping had quietly flattened that corner's true curvature too,
       which is the likely cause of the new "weirdness along the side
       edge": a real hard limit reading as softer than it is.
       A median survives exactly this distinction. The ear spike is one
       sample out of five in its window, so the window's median is one of
       the four normal neighbours and the spike vanishes outright,
       whatever its magnitude. The grip corner is the same value across
       many consecutive samples, so its own median is itself -- a wide
       real feature passes through a small window essentially unchanged. */
    const kapM = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const w = [];
      for (let o = -2; o <= 2; o++) w.push(kap[((k + o) % n + n) % n]);
      w.sort((x, y) => x - y);
      kapM[k] = w[2];
    }
    for (let k = 0; k < n; k++) kap[k] = kapM[k];
    /* inward unit normal per sample. Which perpendicular is "inward"
       depends on the winding, so it is settled once by asking the real
       sdf which side of sample 0 is inside, then applied to all. */
    const nxs = new Float64Array(n + 1), nys = new Float64Array(n + 1);
    for (let k = 0; k <= n; k++) {
      const a = k === 0 ? n - 1 : k - 1, b = (k + 1) % n;
      let tx = xs[b] - xs[a], ty = ys[b] - ys[a];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      nxs[k] = -ty; nys[k] = tx;
    }
    if (U.sdf(xs[0] + nxs[0] * 0.02, ys[0] + nys[0] * 0.02) < 0)
      for (let k = 0; k <= n; k++) { nxs[k] = -nxs[k]; nys[k] = -nys[k]; }
    return { xs, ys, nxs, nys, n, L, kap };
  })();

  /* ---- 2. lookup grid ----
     Distance and outline arc position, sampled once and read back
     bilinearly. Both are smooth away from the medial axis, and calling
     the real sdf() per texel -- a 640-segment scan -- would be hopeless.
     Distance is taken from the resampled outline in the SAME pass as the
     arc position rather than from U.sdf, which halves the build; the two
     differ only by the chord error of the resampling, about 0.001.
     Arc position is stored as cos/sin of its angle so that interpolation
     crosses the seam at s=0 without tearing. */
  const GW = GRIDW;
  const GH = Math.max(2, Math.round(GW * (U.maxy - U.miny) / (U.maxx - U.minx)));
  const gD = new Float32Array(GW * GH);
  const gC = new Float32Array(GW * GH), gS = new Float32Array(GW * GH);
  (function () {
    const n = OUT.n, xs = OUT.xs, ys = OUT.ys;
    for (let j = 0; j < GH; j++) {
      const py = U.miny + (U.maxy - U.miny) * j / (GH - 1);
      for (let i = 0; i < GW; i++) {
        const px = U.minx + (U.maxx - U.minx) * i / (GW - 1);
        let best = Infinity, bk = 0, bt = 0, inside = false;
        for (let k = 0; k < n; k++) {
          const ax = xs[k], ay = ys[k], bx = xs[k + 1], by = ys[k + 1];
          const ex = bx - ax, ey = by - ay, wx = px - ax, wy = py - ay;
          const L2 = ex * ex + ey * ey;
          const t = L2 < 1e-14 ? 0 : Math.max(0, Math.min(1, (wx * ex + wy * ey) / L2));
          const qx = wx - ex * t, qy = wy - ey * t, dd = qx * qx + qy * qy;
          if (dd < best) { best = dd; bk = k; bt = t; }
          if ((by > py) !== (ay > py) && px < bx + (py - by) / (ay - by) * (ax - bx))
            inside = !inside;
        }
        const dist = Math.sqrt(best);
        gD[j * GW + i] = inside ? dist : -dist;
        const a2 = 2 * Math.PI * (bk + bt) / n;
        gC[j * GW + i] = Math.cos(a2); gS[j * GW + i] = Math.sin(a2);
      }
    }
  })();

  function bilin(A, fi, fj) {
    const i0 = Math.max(0, Math.min(GW - 2, Math.floor(fi)));
    const j0 = Math.max(0, Math.min(GH - 2, Math.floor(fj)));
    const tx = fi - i0, ty = fj - j0;
    return A[j0 * GW + i0] * (1 - tx) * (1 - ty) + A[j0 * GW + i0 + 1] * tx * (1 - ty)
         + A[(j0 + 1) * GW + i0] * (1 - tx) * ty + A[(j0 + 1) * GW + i0 + 1] * tx * ty;
  }
  /* d and outline arc position at any (x,y). */
  function field(x, y) {
    const fi = (x - U.minx) / (U.maxx - U.minx) * (GW - 1);
    const fj = (y - U.miny) / (U.maxy - U.miny) * (GH - 1);
    const c = bilin(gC, fi, fj), s = bilin(gS, fi, fj);
    let a = Math.atan2(s, c); if (a < 0) a += 2 * Math.PI;
    /* the module's own grid, not the body's. The two agree, but the
       body's is built at geometry resolution and this one is finer,
       and the rim chart measures arc length right where the surface
       turns hardest -- it is worth the extra precision. The atlas warp
       still goes through the body's field, so the map and the geometry
       cannot drift apart. */
    return { d: bilin(gD, fi, fj), s: OUT.L * a / (2 * Math.PI) };
  }

  /* ---- 3. arc length across the roll ----
     roll() has infinite slope at d=0, so the integrand is steep right at
     the crest; the table is fine enough to carry it. Past the rim the
     sheet is flat and arc length is just distance. */
  function arcTable(H) {
    const n = 4096, t = new Float64Array(n + 1);
    let s = 0;
    for (let i = 0; i < n; i++) {
      const d0 = RIM * i / n, d1 = RIM * (i + 1) / n;
      s += Math.hypot(d1 - d0, H * (U.roll(d1) - U.roll(d0)));
      t[i + 1] = s;
    }
    return t;
  }
  const ATF = arcTable(FH), ATB = arcTable(BH);

  /* The back sheet is NOT a pure roll. earBoss() ramps 0.26 over only
     0.09 of distance, right where the rim is, and gripBulge() adds its
     own slope, so a single table of BACK_H*roll(d) understates the real
     surface run under the ears by a factor of three. Integrating the
     actual height at each point fixes it, but that integral is far too
     slow to run per texel, so what is gridded is the RATIO of the true
     run to the table's. That ratio is smooth and tends to 1 at the crest
     (smoothstep has zero slope at its foot, so the boss contributes no
     arc there), which is what makes it safe to interpolate -- the raw
     arc length is not, it goes as sqrt(d) and bilinear mangles that. */
  function trueAcross(x, y, d) {
    if (d <= 0) return 0;
    const dm = Math.min(d, RIM), n = 64;
    let s = 0, pd = 0, pz = -U.heightB(0, x, y);
    for (let i = 1; i <= n; i++) {
      const t = dm * (i / n) * (i / n);           // clustered at the crest,
      const z = -U.heightB(t, x, y);              // where the integrand spikes
      s += Math.hypot(t - pd, z - pz); pd = t; pz = z;
    }
    return s + Math.max(0, d - RIM);
  }
  const gR = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const x = U.minx + (U.maxx - U.minx) * i / (GW - 1);
      const y = U.miny + (U.maxy - U.miny) * j / (GH - 1);
      const d = gD[j * GW + i];
      if (d <= 1e-4) { gR[j * GW + i] = 1; continue; }
      const base = arcLookup(ATB, d);
      gR[j * GW + i] = base > 1e-9 ? trueAcross(x, y, d) / base : 1;
    }
  }

  function arcLookup(tab, d) {
    if (d <= 0) return 0;
    if (d >= RIM) return tab[tab.length - 1] + (d - RIM);
    const f = d / RIM * (tab.length - 1), i = Math.floor(f);
    return tab[i] + (tab[i + 1] - tab[i]) * (f - i);
  }
  function acrossInv(tab, a) {          // how far in, for a given surface run
    if (a <= 0) return 0;
    const top = tab[tab.length - 1];
    if (a >= top) return RIM + (a - top);
    let lo = 0, hi = tab.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] < a) lo = m; else hi = m; }
    const f = (a - tab[lo]) / (tab[hi] - tab[lo] || 1);
    return RIM * (lo + f) / (tab.length - 1);
  }

  /* signed surface run from the crest to this point: + on the front
     sheet, - on the back, 0 exactly at the crest. Exact on the front
     (heightF depends on d alone); table times the terrain ratio on the
     back. This is the coordinate that makes a wrapped sticker keep its
     size all the way over the edge. */
  function across(x, y, back) {
    const fi = (x - U.minx) / (U.maxx - U.minx) * (GW - 1);
    const fj = (y - U.miny) / (U.maxy - U.miny) * (GH - 1);
    const d = Math.max(0, bilin(gD, fi, fj));
    if (!back) return arcLookup(ATF, d);
    return -arcLookup(ATB, d) * bilin(gR, fi, fj);
  }

  /* position and inward normal at an arc position along the outline --
     the frame the atlas warp displaces along */
  function outlineAt(s0) {
    const n = OUT.n, f = s0 / OUT.L * n;
    let i = Math.floor(f); const t = f - i; i = ((i % n) + n) % n;
    const j = (i + 1) % n;
    let nx = OUT.nxs[i] * (1 - t) + OUT.nxs[j] * t;
    let ny = OUT.nys[i] * (1 - t) + OUT.nys[j] * t;
    const l = Math.hypot(nx, ny) || 1;
    return [OUT.xs[i] * (1 - t) + OUT.xs[j] * t,
            OUT.ys[i] * (1 - t) + OUT.ys[j] * t, nx / l, ny / l];
  }

  function kappaAt(s0) {
    const n = OUT.n, f = s0 / OUT.L * n;
    const i = ((Math.floor(f) % n) + n) % n, t = f - Math.floor(f);
    return OUT.kap[i] * (1 - t) + OUT.kap[(i + 1) % n] * t;
  }

  /* ---- 4. surface point and normal ---- */
  function point(x, y, back, d) {
    if (d === undefined) d = field(x, y).d;
    d = d > 0 ? d : 0;
    return back ? [x, y, -U.heightB(d, x, y)] : [x, y, U.heightF(d)];
  }
  function normal(x, y, back) {
    const h = 0.01;
    const z = (a, b) => point(a, b, back)[2];
    const zx = (z(x + h, y) - z(x - h, y)) / (2 * h);
    const zy = (z(x, y + h) - z(x, y - h)) / (2 * h);
    const n = [-zx, -zy, 1], L = Math.hypot(n[0], n[1], n[2]);
    return [n[0] / L, n[1] / L, n[2] / L];
  }

  /* ---- 5. atlas <-> (x, y, sheet) ----
     Exactly the map buildBody emits, and its inverse. u is mirrored on
     the back sheet because that sheet is seen from behind; v is inverted
     on both because canvas y runs down. */
  const nx = x => (x - U.minx) / (U.maxx - U.minx);
  const ny = y => (y - U.miny) / (U.maxy - U.miny);
  const WARP_D = U.WARP_D || 0;
  const wDepth = U.warpDepth || ((d) => d);
  const wDepthInv = U.warpDepthInv || ((d) => d);
  /* how far the warp can shift a point -- needed to size footprints,
     since a world-space box no longer maps to an atlas box of the same
     proportions */
  const WARP_MAX = (function () {
    let m = 0;
    for (let i = 1; i < 400; i++) {
      const d = WARP_D * i / 400;
      m = Math.max(m, wDepth(d, false) - d, wDepth(d, true) - d);
    }
    return m;
  })();

  function plainAtlas(x, y, back) {
    const u = nx(x), v = ny(y);
    return [((back ? 1 - u : u) * 0.98 + 0.01) * ATLAS,
            ((1 - v) * 0.48 + (back ? 0.01 : 0.51)) * ATLAS];
  }
  /* A surface point's atlas position. Inside the warp band it is pushed
     inward along the outline normal so that atlas depth tracks surface
     arc length; outside the band, and anywhere off the body, it is the
     plain planar map. */
  function toAtlas(x, y, back) {
    if (WARP_D <= 0 || !U.warpXY) return plainAtlas(x, y, back);
    const w = U.warpXY(x, y, back);
    return plainAtlas(w[0], w[1], back);
  }
  /* and back again. Moving along the distance gradient changes distance
     by exactly the amount moved, so the warped point sits at atlas depth
     w(d) on the same normal ray -- which makes the inverse a lookup of
     the depth and a step back along that ray, no search. */
  function fromAtlas(px, py, back) {
    let u = (px / ATLAS - 0.01) / 0.98;
    if (back) u = 1 - u;
    const v = 1 - (py / ATLAS - (back ? 0.01 : 0.51)) / 0.48;
    const X = U.minx + (U.maxx - U.minx) * u, Y = U.miny + (U.maxy - U.miny) * v;
    if (WARP_D <= 0 || !U.distGrad) return [X, Y];
    const dp = U.dist(X, Y);
    if (dp <= 0 || dp >= WARP_D) return [X, Y];
    /* Step back along the gradient by however much the warp moved the
       point. The gradient turns slightly over that step, so the estimate
       is refined against the gradient where the point actually lands --
       two passes is already inside a texel. */
    const shift = dp - wDepthInv(dp, back);
    let bx = X, by = Y;
    for (let it = 0; it < 2; it++) {   // two passes lands inside a texel
      const g = U.distGrad(bx, by);
      bx = X - g[0] * shift; by = Y - g[1] * shift;
    }
    return [bx, by];
  }

  /* ---- 6. charts ----
     Each returns sticker-local coordinates in WORLD units, or null if
     this point is not part of the sticker's patch. */
  const wrapArc = t => { const L = OUT.L; t -= L * Math.round(t / L); return t; };

  /* Keep-out discs, in body coordinates, per sheet. The stick wells are
     the case that matters: the ring is a torus standing on the deck and
     anything painted inside it shows through the hole. Tested against
     the SURFACE point, not the atlas point, so the hole stays circular
     on the model rather than in the texture. */
  const EXCL = opt.exclude || [];
  function blocked(x, y, back) {
    for (let i = 0; i < EXCL.length; i++) {
      const e = EXCL[i];
      if (e.back !== undefined && e.back !== back) continue;
      const dx = x - e.x, dy = y - e.y;
      if (dx * dx + dy * dy < e.r * e.r) return true;
    }
    return false;
  }

  /* Local tangent-plane basis at a surface anchor -- shared by the chart
     AND by anything outside this module that needs to draw a consistent
     "0 degrees" at a point (the live placement preview, in particular).

     T is the analytic surface tangent along +y in the (x,y) domain
     (dP/dy), not a fixed world vector flattened onto the tangent plane.
     The old build projected world "up" onto the tangent plane -- and
     swapped to world "right" once the normal tipped past 0.9 -- but
     "up projected here" rotates every time the normal does, which is
     everywhere on a doubly-curved shell, so the same rotation setting
     pointed a visibly different way in different spots. A parametric
     tangent has no such freedom: it is already IN the tangent plane by
     construction (no projection, no arbitrary reference vector) and it
     turns smoothly with the surface, the same way a UV tangent basis
     does for normal-mapping in any other engine -- see makeChart. */
  function tangentFrame(x, y, back) {
    const d0 = field(x, y).d;
    const P0 = point(x, y, back, d0), N = normal(x, y, back);
    const h = 0.01;
    const Pm = point(x, y - h, back), Pp = point(x, y + h, back);
    let T = [Pp[0] - Pm[0], Pp[1] - Pm[1], Pp[2] - Pm[2]];
    const TL = Math.hypot(T[0], T[1], T[2]);
    T = TL > 1e-9 ? [T[0] / TL, T[1] / TL, T[2] / TL] : [1, 0, 0];
    const Bv = [N[1]*T[2]-N[2]*T[1], N[2]*T[0]-N[0]*T[2], N[0]*T[1]-N[1]*T[0]];
    return { P0, N, T, Bv, d0 };
  }

  function makeChart(st) {
    const R = st.size, cs = Math.cos(-st.rot), sn = Math.sin(-st.rot);
    const spin = (a, b) => [a * cs - b * sn, a * sn + b * cs];

    if (st.chart === 'rim') {
      const f0 = field(st.x, st.y);
      const q0 = across(st.x, st.y, st.back);
      const k0 = kappaAt(f0.s);
      /* The outline is shorter further in -- scale (1 - kappa*d) -- so a
         sticker crossing the rim would otherwise fan out along the edge.
         The correction applies that same scale to the chart, which makes
         the along-edge size right at the point's own depth instead of
         only at the crest. It cannot be removed entirely: the factor
         depends on d, so no single flattening satisfies every depth at
         once. That residue is the irreducible part. */
      return function (x, y, back) {
        const f = field(x, y);
        if (f.d <= 0 || blocked(x, y, back)) return null;
        const q = across(x, y, back);
        const fan = Math.max(0.2, 1 - k0 * f.d);
        return spin(wrapArc(f.s - f0.s) * fan, q - q0);
      };
    }

    const { P0, N, T, Bv, d0 } = tangentFrame(st.x, st.y, st.back);
    return function (x, y, back) {
      const f = field(x, y);
      if (f.d <= 0 || blocked(x, y, back)) return null;
      const P = point(x, y, back, f.d);
      const dv = [P[0] - P0[0], P[1] - P0[1], P[2] - P0[2]];
      /* a is along -Bv (T x N, "world right" for someone whose up is T and
         who is looking along -N), b is along T ("world up"). Swapped from
         a straight (dv.T, dv.Bv) on purpose: T is the up-ish tangent, but
         feeding it to a (the horizontal axis spin() expects) wires world
         up to the STICKER'S right edge, and Bv (=NxT, which points to
         that viewer's LEFT) to the sticker's top -- every sticker at
         rot=0 came out rotated a quarter turn with its own top pointed
         off to the side rather than up. This was there before this
         session's tangentFrame change and probably always was: the old
         per-point-random basis scattered the error across many different
         apparent angles, which read as noise rather than a single
         consistent mistake, and only became obvious once rotation held
         still across the whole surface. */
      let a = -(dv[0] * Bv[0] + dv[1] * Bv[1] + dv[2] * Bv[2]);
      let b = dv[0] * T[0] + dv[1] * T[1] + dv[2] * T[2];
      /* direction from the tangent plane, RADIUS from the true 3D
         distance. The projected radius is the sticker's shadow and
         shrinks as the surface tilts away; the 3D one does not. */
      const rp = Math.hypot(a, b);
      if (rp > 1e-9) {
        const r3 = Math.hypot(dv[0], dv[1], dv[2]);
        a *= r3 / rp; b *= r3 / rp;
      }
      if (Math.abs(a) > R * 3 || Math.abs(b) > R * 3) return null;
      /* Folding guard. Projection from a single anchor stops being
         injective once the surface has curled away from the anchor's
         normal by more than a right angle; past that, two points can
         land on the same bit of sticker -- the ghost-duplicate failure
         from the old decal build. Rejecting those texels is what keeps
         this projection one-to-one over its patch. */
      /* Only worth asking near the rim. Past RIM the sheet is flat, its
         normal cannot have turned away from the anchor's, and the check
         was costing four extra evaluations of the height field on every
         texel of every sticker sitting on the deck. */
      /* Both this texel and the anchor sitting on flat ground means the
         surface cannot have turned anywhere near a right angle between
         them, so the guard cannot fire and its four extra evaluations of
         the height field are pure cost. */
      if (f.d < 0.20 || d0 < 0.20) {
        const Np = normal(x, y, back);
        if (Np[0]*N[0] + Np[1]*N[1] + Np[2]*N[2] < 0.05) return null;
      }
      return spin(a, b);
    };
  }

  /* ---- 7. footprint ----
     A generous xy box around the anchor. Along the outline and across
     the roll both cost at least as much projected distance as surface
     distance, so a box of 1.6R never clips the patch. */
  function sheets(st) { return st.chart === 'rim' ? [false, true] : [st.back]; }
  function boxes(st) {
    /* a square patch reaches sqrt(2) radii to its corners; the rest is
       for the warp, which moves atlas positions relative to world ones */
    const R = st.size * (st.chart === 'rim' ? 1.6 : 1.45) + WARP_MAX;
    const out = [];
    for (const back of sheets(st)) {
      const c1 = toAtlas(st.x - R, st.y - R, back), c2 = toAtlas(st.x + R, st.y + R, back);
      /* clamped to this island's own band. Points outside it invert to
         (x,y) off the body and get rejected anyway, but a sticker near
         the top of the shell would otherwise scan hundreds of thousands
         of texels belonging to the other sheet to find that out. */
      /* integers, always: these are texel indices, and a fractional
         bound walks the scan off the four-byte pixel stride and scatters
         the paint across the atlas */
      const vLo = Math.ceil((back ? 0.01 : 0.51) * ATLAS);
      const vHi = Math.floor((back ? 0.49 : 0.99) * ATLAS);
      out.push({
        back,
        x0: Math.max(Math.ceil(0.01 * ATLAS), Math.floor(Math.min(c1[0], c2[0]))),
        y0: Math.max(vLo, Math.floor(Math.min(c1[1], c2[1]))),
        x1: Math.min(Math.floor(0.99 * ATLAS), Math.ceil(Math.max(c1[0], c2[0]))),
        y1: Math.min(vHi, Math.ceil(Math.max(c1[1], c2[1])))
      });
    }
    return out;
  }

  /* ---- 8. how big a sticker may be here ----
     Distortion goes as (radius / local radius)^2. The roll contributes
     a fixed curvature H^2/RIM at the crest; the outline contributes its
     own. Their product is the Gaussian curvature, and 1/sqrt(K) is the
     radius the sticker has to stay under a fraction of. On the flats
     there is nothing to correct for, so the cap is the shell itself. */
  /* Calibrated by measuring, not derived. The tangent chart turned out to
     tolerate far more than the second-order estimate suggested -- a 0.5
     radius sticker on the deck measures 8% compression, not the 30-odd
     the old constant was guarding against -- and the cap was quietly
     eating most of the size slider's range. */
  const MAX_RATIO = opt.maxRatio || 1.0;

  /* curvature of the cross-rim profile at this point, measured on the
     ACTUAL height function rather than assumed from the roll -- the ear
     boss and the grip bulges both bend it, and the boss bends it hard. */
  function profileCurvature(x, y, back, d) {
    const h = Math.max(2e-3, d * 0.3);
    const z = t => { const u = Math.max(0, t);
      return back ? -U.heightB(u, x, y) : U.heightF(u); };
    const z1 = (z(d + h) - z(d - h)) / (2 * h);
    const z2 = (z(d + h) - 2 * z(d) + z(d - h)) / (h * h);
    return Math.abs(z2) / Math.pow(1 + z1 * z1, 1.5);
  }
  /* curvature of the outline itself, from three samples around the
     nearest point. Taken as the WORST over a short window, because a
     corner sitting just off the anchor still catches the sticker --
     the notch in the top edge between the ears is exactly this case. */
  function outlineCurvature(s0) {
    const n = OUT.n;
    const P = i => { const k = ((i % n) + n) % n; return [OUT.xs[k], OUT.ys[k]]; };
    const k0 = Math.round(s0 / OUT.L * n);
    let worst = 0;
    for (let o = -3; o <= 3; o++) {
      const a = P(k0 + o - 1), b = P(k0 + o), c = P(k0 + o + 1);
      const ab = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const bc = Math.hypot(c[0]-b[0], c[1]-b[1]);
      const ca = Math.hypot(a[0]-c[0], a[1]-c[1]);
      const area = Math.abs((b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1])) / 2;
      if (ab*bc*ca > 1e-12) worst = Math.max(worst, 4 * area / (ab * bc * ca));
    }
    return worst;
  }
  /* Gaussian curvature is the product of the two, and a flat sticker of
     radius r on a patch of radius 1/sqrt(K) compresses by about
     (r*sqrt(K))^2/6 at its edge. MAX_RATIO is where that is acceptable. */
  function capAt(x, y, back) {
    const f = field(x, y);
    if (f.d < -0.02) return 0;                 // genuinely off the body
    const d = Math.max(0.01, f.d);             // an anchor ON the crest is legal
    const K = profileCurvature(x, y, back, d) * outlineCurvature(f.s);
    return K <= 1e-9 ? Infinity : MAX_RATIO / Math.sqrt(K);
  }
  /* Two different failure modes, so two different limits.

     A sticker that stays on ONE sheet is projected from its anchor and
     the error is second order -- (radius/local radius)^2 -- so it can be
     generous. A sticker that WRAPS uses the rim chart, whose error is
     first order in the outline curvature: the outline is shorter further
     in by (1 - kappa*d), and a wrapped sticker spans a range of d on
     both sheets at once. No flattening removes that, so the limit is on
     how much depth the sticker is allowed to span. */
  const FAN_TOL = opt.fanTol || 0.12;    // along-edge scale allowed to vary
  const KMAX    = opt.kMax   || 0.60;    // outline too tight to wrap at all

  /* Gaussian curvature of the surface itself, straight from the Hessian
     of the height field. Better than reasoning about the roll and the
     outline separately: this one number already contains the rim, the
     grip bulges and the ear bosses, and it is what actually decides how
     badly a flat sticker has to deform to lie down here. */
  function gaussK(x, y, back) {
    const h = 0.03;
    const z = (a2, b2) => point(a2, b2, back)[2];
    const z0 = z(x, y);
    const zx = (z(x + h, y) - z(x - h, y)) / (2 * h);
    const zy = (z(x, y + h) - z(x, y - h)) / (2 * h);
    const zxx = (z(x + h, y) - 2 * z0 + z(x - h, y)) / (h * h);
    const zyy = (z(x, y + h) - 2 * z0 + z(x, y - h)) / (h * h);
    const zxy = (z(x + h, y + h) - z(x + h, y - h)
               - z(x - h, y + h) + z(x - h, y - h)) / (4 * h * h);
    const w = 1 + zx * zx + zy * zy;
    const K = Math.abs(zxx * zyy - zxy * zxy) / (w * w);
    /* Clamped. roll() is a genuine quarter-circle profile with a
       vertical tangent exactly at the crest (d=0) -- correct, that is
       what makes the rim round rather than creased -- but it means the
       height field has a real kink there: infinite slope approaching
       from the body side, flat approaching from off the body. A fixed
       h=0.03 stencil straddling that kink does not converge to "very
       curved", it goes UNSTABLE: walking a single point in from d=0.20
       to d=0.005 measured 1.8, 1.0, 5.4, 1.7, 14.6, 2.2, 6.0 -- no trend,
       just noise, exactly like the outline's spurious spike earlier in
       this session, same mechanism, different code path. Every value
       measured elsewhere on this shell, including genuinely curved spots
       (grip bulges, near the ears), topped out around 5.5; the clamp
       sits comfortably above that and well below where the instability
       starts, so it silences the noise without touching any real
       feature this shell actually has. */
    return Math.min(8, K);
  }
  /* Distortion estimate AT THE SIZE ACTUALLY ASKED FOR, reported rather
     than used to shrink anything -- see plan(). Same relation this used
     to invert to get a cap: a flat sticker of radius r on a patch of
     Gaussian curvature K compresses by about (r*sqrt(K))^2/6 at its
     edge. Sampled at the worst point under the footprint, not just the
     centre under the anchor, same as before. */
  function flatDistortion(x, y, back, r) {
    /* Sampled on three rings of twelve rather than one ring of eight, and
       reduced by the MEAN OF THE WORST QUARTER rather than the outright
       maximum.

       The maximum was the bug behind "it refuses, I nudge, now it works".
       With only eight probes, moving the cursor slightly swung each probe
       onto or off a sharp feature, and because one probe alone could veto
       the placement, the verdict flipped on and off. Measured along a line
       across the back the signal read 2, 8, 3, 16, 3, 8, 2 -- oscillating,
       which is aliasing, not curvature; real curvature varies smoothly.

       A trimmed mean still rises properly where a region is genuinely
       curved (many probes high together) but ignores a lone spike, so the
       answer changes gradually as you move and stays the same when you
       come back to the same spot. Predictability matters more here than
       catching every last bad texel: a rule you cannot anticipate is worse
       than one that is slightly permissive. */
    const rr = r || 0.2;
    const samples = [gaussK(x, y, back)];
    for (let ring = 1; ring <= 3; ring++) {
      const rad = rr * 0.3 * ring;
      for (let i = 0; i < 12; i++) {
        const a2 = 2 * Math.PI * i / 12 + ring * 0.37;   // stagger, so rings don't probe the same rays
        const px = x + rad * Math.cos(a2), py = y + rad * Math.sin(a2);
        if (field(px, py).d <= 0) continue;
        samples.push(gaussK(px, py, back));
      }
    }
    samples.sort((a, b) => b - a);
    const n = Math.max(1, Math.round(samples.length * 0.25));
    let sum = 0;
    for (let i = 0; i < n; i++) sum += samples[i];
    return Math.min(0.95, (r * r * (sum / n)) / 6);
  }
  /* largest wrap whose depth span keeps the fan inside FAN_TOL, using the
     WORST outline curvature along the stretch of edge the sticker covers
     -- a sticker centred on a gentle run can still reach a corner, which
     is exactly what the notch between the ears does. */
  function wrapCap(x, y, want) {
    const s0 = field(x, y).s, n = OUT.n;
    const span = Math.max(1, Math.round((want || 0.25) / OUT.L * n));
    let k = 0;
    for (let o = -span; o <= span; o++) {
      const idx = ((Math.round(s0 / OUT.L * n) + o) % n + n) % n;
      k = Math.max(k, Math.abs(OUT.kap[idx]));
    }
    if (k * RIM > KMAX) return 0;
    if (k < 1e-6) return RIM;
    const dEach = FAN_TOL / k / 2;
    return Math.min(arcLookup(ATF, dEach), arcLookup(ATB, dEach));
  }

  /* Decide how a placement is drawn.

     The size is now always the size asked for. It used to shrink and
     retry when a wrap didn't fit cleanly, and cap itself against local
     curvature everywhere else -- which kept every sticker looking
     equally crisp, but meant the same slider setting came out a
     different real size depending on where you clicked, with nothing
     telling you why. A real sticker pressed onto a curve does not do
     that: it stays its size and distorts. That is what happens here now
     -- flatDistortion reports how much, for the UI to show, and it is
     never used to change the size. The two refusals that remain are
     genuine: an outline too tight to wrap at any size without folding,
     and the crest of a corner where the roll consumes its own radius of
     curvature and there is nowhere flat to fall back to either. */
  /* ---- keep-out zones ----
     The shell is divided into places a sticker CAN lie down properly and
     places it cannot, and the second kind is refused outright rather than
     quietly fudged. Every previous build tried to fudge: it shrank the
     sticker to hide curvature (so the same slider gave different sizes),
     or drew a crest-crossing sticker flat (so it came out cut in half at
     the seam). Both were the code trying to say yes to a placement that
     the surface cannot actually take.

     Four reasons a spot is refused, each with its own cause:
       'ring'  - a hard keep-out disc: stick wells, ear bosses. Painted
                 texels there show through a hole in the model.
       'grip'  - the grip swells. A 0.20 bell over a 1.05 radius is far
                 too tight for a flat sticker, and these are also where
                 your hands go, so nothing should be stuck there anyway.
       'edge'  - the sticker reaches the crest but the outline is too
                 tight to wrap around without folding. THIS is what was
                 producing the half-stickers on the sides.
       'curve' - anywhere else the measured compression exceeds tolerance.
     The last one is measured, not hand-drawn, so it scales with the size
     asked for: a small sticker is legal in spots a large one is not,
     which is exactly how a real sticker behaves. */
  const MAX_DISTORT = opt.maxDistort || 0.10;

  function plan(x, y, back, want) {
    const f = field(x, y);
    if (f.d <= -0.02) return { ok: false, reason: 'off' };
    if (blocked(x, y, back)) return { ok: false, reason: 'ring' };
    const q0 = Math.abs(across(x, y, back));
    /* Reach, not radius. The patch is a square, so its corners sit 1.41
       radii out; testing the radius alone let stickers whose corners
       crossed the crest be drawn flat, and they were then cut dead
       along the seam instead of wrapping. */
    if (want * Math.SQRT2 > q0) {
      const w = wrapCap(x, y, want);
      if (w > 0) {
        /* Centre it on the crest. A click near the edge is typically a
           tenth of a unit of SURFACE from the crest while being only a
           couple of hundredths away in plan -- the rim is nearly
           vertical, so distance across it and distance along the deck
           are wildly different things. Left where it was clicked, the
           sticker sits almost entirely on the front with a sliver over
           the edge, which reads as being cut off rather than wrapped.
           The nudge is invisible on the model and makes the wrap even. */
        let ax = x, ay = y;
        if (q0 < want * 1.45) {
          const o = outlineAt(f.s);
          ax = o[0] + o[2] * 0.001; ay = o[1] + o[3] * 0.001;
        }
        return { ok: true, chart: 'rim', size: want, x: ax, y: ay, wrapped: true, distortion: 0 };
      }
      /* It reaches the crest and cannot wrap. Refuse it. Drawing it flat
         here is what cut stickers in half along the seam. */
      return { ok: false, reason: 'edge' };
    }
    const dist = flatDistortion(x, y, back, want);
    if (dist > MAX_DISTORT) return { ok: false, reason: 'curve', distortion: dist };
    return { ok: true, chart: 'tangent', size: want, distortion: dist };
  }

  /* ---- edge padding ----
     Both islands stop dead at the silhouette, and the renderer filters
     texels bilinearly, so along the crest it mixes painted texels with
     the unpainted atlas behind them and draws a hard line right where
     the two sheets meet -- the seam reads as a cut even when the sticker
     wrapped correctly. The fix is the standard one for texture atlases:
     bleed the painted edge a few texels outward so filtering has
     something sensible to reach for.

     The pairs are worked out once, by walking the outline at roughly one
     texel per step and stepping outward from it, and then just copied on
     every repaint. */
  function padPairs(width) {
    const w = width || 4;
    const texel = (U.maxx - U.minx) / (0.98 * ATLAS);
    const steps = Math.ceil(OUT.L / texel);
    const dst = [], src = [];
    for (const back of [false, true]) {
      for (let i = 0; i < steps; i++) {
        const o = outlineAt(OUT.L * i / steps);
        const sa = plainAtlas(o[0] + o[2] * texel * 1.5, o[1] + o[3] * texel * 1.5, back);
        const sx = Math.round(sa[0]), sy = Math.round(sa[1]);
        if (sx < 0 || sy < 0 || sx >= ATLAS || sy >= ATLAS) continue;
        for (let k = 1; k <= w; k++) {
          const da = plainAtlas(o[0] - o[2] * texel * k, o[1] - o[3] * texel * k, back);
          const dx = Math.round(da[0]), dy = Math.round(da[1]);
          if (dx < 0 || dy < 0 || dx >= ATLAS || dy >= ATLAS) continue;
          dst.push(dy * ATLAS + dx); src.push(sy * ATLAS + sx);
        }
      }
    }
    return { dst: Int32Array.from(dst), src: Int32Array.from(src) };
  }

  return { field, point, normal, blocked, padPairs, outlineAt, plainAtlas, toAtlas, fromAtlas, makeChart, boxes, sheets,
           flatDistortion, wrapCap, plan, gaussK, kappaAt, outline: OUT, across, acrossInv, arcLookup, ATF, ATB, tangentFrame };
}

if (typeof module !== 'undefined') module.exports = { StickerSurface };
