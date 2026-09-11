// ═══════════════════════════════════════════════════════════════════════════
// controller-body.js — 3D controller GEOMETRY. Nothing else.
//
// Ported verbatim from docs/controller-prototype/standalone-stickerless.html
// (lines 74-708 — the first <script> block, ending at the close of
// buildControls; line 709 is that block's closing </script> tag), which is
// now a FROZEN reference artefact. This file is the single copy: the
// prototype carried the same code duplicated inline, and every fix in that
// session had to be applied twice by hand (handoff v3 § 4.2). That is
// closed — edit here, never there.
//
// Pure: takes THREE as an argument, touches no DOM, reads no globals. That is
// what lets tools/verify-controller-body.js drive it under Node.
//
// ⚠ Read controller-handoff-v3.md § 3 before touching rotation, curvature or
// the ear geometry. Three non-obvious bugs are already fixed in here and the
// sign conventions are not guessable.
// ═══════════════════════════════════════════════════════════════════════════

function buildBody(THREE, opt = {}) {
  const N        = opt.grid   || 132;
  const RIM      = opt.rim    || 0.55;   // how far in the rounded edge rolls
  const FRONT_H  = opt.frontH || 0.42;
  const BACK_H   = opt.backH  || 0.30;
  const GRIP_A   = opt.gripA  || 0.20;   // grip swell amplitude -- a bump,
                                         // not a mound: the front is flat, so a
                                         // tall back mound looks unbalanced
  const GRIP_R   = opt.gripR  || 1.05;   // grip swell falloff radius

  /* ---- 1. silhouette ---- */
  const s = new THREE.Shape();
  s.moveTo(0, 0.80);
  s.bezierCurveTo(-0.50, 1.00, -1.10, 1.00, -1.55, 0.84);
  s.bezierCurveTo(-1.95, 0.70, -2.12, 0.40, -2.18, 0.00);
  s.bezierCurveTo(-2.32, -0.86, -2.30, -1.56, -1.92, -1.86);
  s.bezierCurveTo(-1.54, -2.17, -1.05, -1.95, -0.82, -1.42);
  s.bezierCurveTo(-0.62, -0.97, -0.45, -0.73, 0.00, -0.69);
  s.bezierCurveTo(0.45, -0.73, 0.62, -0.97, 0.82, -1.42);
  s.bezierCurveTo(1.05, -1.95, 1.54, -2.17, 1.92, -1.86);
  s.bezierCurveTo(2.30, -1.56, 2.32, -0.86, 2.18, 0.00);
  s.bezierCurveTo(2.12, 0.40, 1.95, 0.70, 1.55, 0.84);
  s.bezierCurveTo(1.10, 1.00, 0.50, 1.00, 0.00, 0.80);
  const poly = s.extractPoints(64).shape;

  function shellSDF(px, py) {
    let best = Infinity, inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j], b = poly[i];
      const ex = b.x - a.x, ey = b.y - a.y, wx = px - a.x, wy = py - a.y;
      const L2 = ex * ex + ey * ey;
      // extractPoints repeats points where curves join; a zero-length
      // segment makes t NaN and poisons the whole distance
      if (L2 < 1e-12) { best = Math.min(best, Math.hypot(wx, wy)); continue; }
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / L2));
      best = Math.min(best, Math.hypot(wx - ex * t, wy - ey * t));
      if ((b.y > py) !== (a.y > py) &&
          px < b.x + (py - b.y) / (a.y - b.y) * (a.x - b.x)) inside = !inside;
    }
    return inside ? best : -best;
  }

  /* ---- 2. ears, unioned into the silhouette ----
     Same place and size as the originals (x=+/-0.84, y=1.02), but expressed
     as distance fields and smooth-maxed with the shell, so the join is a
     moulded fillet instead of a visible seam between two meshes.
     EAR_BLEND is the fillet radius: raise it for a softer merge. */
  // A near-HORIZONTAL segment swept by a radius gives a wide, flat-topped tab
  // with rounded ends -- the shape of the originals. A vertical segment gives
  // a horn, which is not what these are.
  function smax(a, b, k) {   // smooth maximum == smooth union of two solids
    const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (a - b) / k));
    return a * h + b * (1 - h) + k * h * (1 - h);
  }
  function segDist(px, py, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    return Math.hypot(wx - ex * t, wy - ey * t);
  }
  /* Ears are NOT part of this surface. They are plates standing off the back
     with an air gap behind them, and a height field holds one z per sheet per
     point, so it cannot express that gap -- three attempts at approximating it
     all came out as stubby nubs. They are built separately by buildEars()
     below. The single-surface rule exists so stickers work, and ears take no
     stickers, so nothing is lost: the raycast only targets the body mesh, so
     they are unstickerable for free. */
  const sdf = (px, py) => shellSDF(px, py);

  /* ---- 3. height field ---- */
  const roll = d => { if (d <= 0) return 0; if (d >= RIM) return 1; const t = 1 - d / RIM; return Math.sqrt(1 - t * t); };
  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;

  // LOWER HALF of each leg only. A hand wraps the leg below the deck, not the
  // flank beside the buttons. Raise the first y value to shorten further.
  const LEGS = [[-1.62, -0.95, -1.90, -1.78], [1.62, -0.95, 1.90, -1.78]];
  function gripBulge(x, y) {
    let g = 0;
    for (const L of LEGS) {
      // A quartic bell, (1-u^2)^2, rather than a smoothstep. Smoothstep
      // saturates near its top, which is what gave the swell a flat peak --
      // this one falls away from the centreline the whole way, so it reads
      // as a hill. Value and slope both reach zero at u=1, so there is still
      // no ridge where it meets the flat.
      const u = Math.min(1, segDist(x, y, L[0], L[1], L[2], L[3]) / GRIP_R);
      const k = 1 - u * u;
      g = Math.max(g, GRIP_A * k * k);
    }
    return g;
  }

  /* A raised boss under each ear. Without it the ear plates look bolted on --
     they jut straight out of a flat back. This swells the back sheet where the
     ear base lands so the plate grows out of a mound instead.
     It needs its OWN falloff: the shell height is gated by roll(d), which goes
     to zero at the rim, and the ear bases sit right at the top edge where
     roll(d) has already died. BOSS_GATE ramps in over a much shorter distance,
     so the boss is still at full height where the ears actually are, while
     still returning to zero exactly at d=0 so the two sheets stay sealed. */
  const BOSS = [{ x: -0.84, y: 0.84, rx: 0.60, ry: 0.52 },
                { x:  0.84, y: 0.84, rx: 0.60, ry: 0.52 }];
  const BOSS_A = opt.bossA !== undefined ? opt.bossA : 0.26;   // above ~0.30 the
                        // boss breaks through the ear plate's back face as a nub
  const BOSS_GATE = 0.09;
  function earBoss(x, y) {
    let b = 0;
    for (const p of BOSS) {
      const u = Math.min(1, Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry));
      const k = 1 - u * u;
      b = Math.max(b, BOSS_A * k * k);
    }
    return b;
  }

  const heightF = (d) => FRONT_H * roll(d);
  const heightB = (d, x, y) => roll(d) * (BACK_H + gripBulge(x, y))
                             + earBoss(x, y) * smooth(d / BOSS_GATE);

  /* ---- 4. grid ---- */
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const p of poly) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
  const pad = 0.04;
  minx -= pad; maxx += pad; miny -= pad; maxy += pad;
  const M = Math.round(N * (maxy - miny) / (maxx - minx));
  const W = N + 1;
  const gx = i => minx + (maxx - minx) * i / N;
  const gy = j => miny + (maxy - miny) * j / M;
  const dx = (maxx - minx) / N, dy = (maxy - miny) / M;

  const D = new Float32Array(W * (M + 1));
  for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) D[j * W + i] = sdf(gx(i), gy(j));
  const dAt = (i, j) => D[j * W + i];

  /* ---- 5. normals, analytically from the height field ----
     This is what made the last prototype look lumpy. The geometry is
     non-indexed, so computeVertexNormals() gives every triangle its own
     face normal -- flat shading, the same faceting bug as the old model.
     A height field has an exact normal though: for z = f(x,y) it is
     (-df/dx, -df/dy, 1). Differencing f on the grid and sampling that per
     vertex makes the surface genuinely smooth at ANY resolution, so
     smoothness stops depending on triangle count. */
  function heightGrid(back) {
    const Z = new Float32Array(W * (M + 1));
    for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
      const d = Math.max(0, dAt(i, j));
      Z[j * W + i] = back ? -heightB(d, gx(i), gy(j)) : heightF(d);
    }
    return Z;
  }
  function gradients(Z) {
    const GX = new Float32Array(W * (M + 1)), GY = new Float32Array(W * (M + 1));
    for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(N, i + 1);
      const j0 = Math.max(0, j - 1), j1 = Math.min(M, j + 1);
      GX[j * W + i] = (Z[j * W + i1] - Z[j * W + i0]) / ((i1 - i0) * dx);
      GY[j * W + i] = (Z[j1 * W + i] - Z[j0 * W + i]) / ((j1 - j0) * dy);
    }
    return { GX, GY };
  }
  const ZF = heightGrid(false), ZB = heightGrid(true);
  const GF = gradients(ZF), GB = gradients(ZB);

  function bilin(A, fi, fj) {
    const i0 = Math.max(0, Math.min(N - 1, Math.floor(fi))), j0 = Math.max(0, Math.min(M - 1, Math.floor(fj)));
    const tx = fi - i0, ty = fj - j0;
    return A[j0 * W + i0] * (1 - tx) * (1 - ty) + A[j0 * W + i0 + 1] * tx * (1 - ty)
         + A[(j0 + 1) * W + i0] * (1 - tx) * ty + A[(j0 + 1) * W + i0 + 1] * tx * ty;
  }
  /* The rim crack lived here. Sampling the height GRID bilinearly gives a
     non-zero z at a boundary vertex, because the cell's outside corners hold
     0 and its inside corners hold the full height -- so the front sheet
     landed slightly above zero and the back sheet slightly below, and the two
     never met. The body was literally unzipped along its whole silhouette.
     Interpolating the DISTANCE field instead and evaluating the height from
     that gives exactly d=0 at a boundary vertex (the clip put it there by
     linear interpolation along the cell edge), so both sheets return exactly
     z=0 and the seam closes. Normals still come from the grid -- that part
     was fine. */
  function P(fi, fj, back) {
    const x = minx + (maxx - minx) * fi / N, y = miny + (maxy - miny) * fj / M;
    const d = Math.max(0, bilin(D, fi, fj));
    return new THREE.Vector3(x, y, back ? -heightB(d, x, y) : heightF(d, x, y));
  }
  function Nrm(fi, fj, back) {
    const G = back ? GB : GF;
    const a = bilin(G.GX, fi, fj), b = bilin(G.GY, fi, fj);
    const n = back ? new THREE.Vector3(a, b, -1) : new THREE.Vector3(-a, -b, 1);
    return n.normalize();
  }

  /* ---- 6. UVs ----
     Straight planar mapping per island. The previous arc-length scheme
     normalised each grid row against the globally longest row, which sheared
     narrow rows badly and let two surface points land on one texel -- that is
     what produced the ghost duplicate stickers. Planar (x,y) is monotonic in
     both axes, so it is injective by construction: one texel, one point on
     the body, always. The cost is texel density falling off where the surface
     turns steeply, which is confined to the rim roll.
     u is mirrored on the back sheet because it is seen from behind; v is
     inverted on both because canvas y runs down while the model's y runs up. */
  const island = (u, v, back) => [(back ? 1 - u : u) * 0.98 + 0.01,
                                  (1 - v) * 0.48 + (back ? 0.01 : 0.51)];

  const pos = [], nor = [], uv = [];
  function emit(tri, back) {
    for (const c of tri) {
      const p = P(c[0], c[1], back), n = Nrm(c[0], c[1], back);
      pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
      const a = island((p.x - minx) / (maxx - minx), (p.y - miny) / (maxy - miny), back);
      uv.push(a[0], a[1]);
    }
  }

  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const dv = corners.map(c => dAt(c[0], c[1]));
    if (dv.every(d => d <= 0)) continue;
    let cell;
    if (dv.every(d => d > 0)) cell = corners;
    else {
      cell = [];
      for (let k = 0; k < 4; k++) {
        const a = corners[k], b = corners[(k + 1) % 4], da = dv[k], db = dv[(k + 1) % 4];
        if (da > 0) cell.push(a);
        if ((da > 0) !== (db > 0)) {
          const t = da / (da - db);
          cell.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      if (cell.length < 3) continue;
    }
    for (let k = 1; k < cell.length - 1; k++) {
      emit([cell[0], cell[k], cell[k + 1]], false);
      emit([cell[0], cell[k + 1], cell[k]], true);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
  /* RIM / FRONT_H / BACK_H / roll are exposed because the sticker
     rasteriser has to integrate arc length ACROSS the rim, and that
     needs the same roll profile the surface was built from -- not a
     re-derived approximation of it. */
  geo.userData = { minx, maxx, miny, maxy, N, M, sdf, heightF, heightB, poly,
                   RIM, FRONT_H, BACK_H, roll };
  return geo;
}

/* Crease-aware normal smoothing. ExtrudeGeometry gives every side and bevel
   facet its own hard normal; averaging coincident normals below a crease
   angle removes the faceting while leaving genuine edges crisp. */
function smoothNormals(THREE, geo, creaseDeg) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, n = pos.count;
  const cosC = Math.cos((creaseDeg === undefined ? 35 : creaseDeg) * Math.PI / 180);
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
    let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(i);
  }
  const out = new Float32Array(n * 3);
  for (const [, idx] of buckets) for (const i of idx) {
    const ax = nrm.getX(i), ay = nrm.getY(i), az = nrm.getZ(i);
    let sx = 0, sy = 0, sz = 0;
    for (const j of idx) {
      const bx = nrm.getX(j), by = nrm.getY(j), bz = nrm.getZ(j);
      if (ax * bx + ay * by + az * bz >= cosC) { sx += bx; sy += by; sz += bz; }
    }
    const L = Math.hypot(sx, sy, sz) || 1;
    out[i * 3] = sx / L; out[i * 3 + 1] = sy / L; out[i * 3 + 2] = sz / L;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return geo;
}

/* Ears: the original construction, unchanged -- a half-ellipse extruded into a
   flat plate, mounted BEHIND the shell's back face so it stands clear of it
   with only the crown over the top edge. This is the shape a height field
   could not hold. Returns an array of meshes to add alongside the body. */
function buildEars(THREE, material) {
  /* A FULL ellipse, not the original half. The half-ellipse's flat chord is
     what you can see as a hard line across the base of each ear: wherever that
     straight bottom edge crosses the boss it draws a crease. A full ellipse has
     no chord at all -- its lower half simply sinks into the boss and there is
     no edge left to see. The visible crown above the shell is unchanged. */
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.36, 0.52, 0, Math.PI * 2, false, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .20, curveSegments: 36,
    bevelEnabled: true, bevelThickness: .075, bevelSize: .075, bevelSegments: 7 });
  geo.center();
  smoothNormals(THREE, geo, 35);
  return [-1, 1].map(side => {
    const m = new THREE.Mesh(geo.clone(), material);
    m.position.set(side * 0.84, 0.80, -0.44);
    m.rotation.x = -0.30; m.rotation.z = -side * 0.12;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  });
}



/* ============================================================
   Controls: sticks, D-pad, face buttons, start/select, L/R.

   Every control is SEATED on the body's own height field rather than
   placed at a hand-picked z. seat() asks the field for the surface
   height and normal at (x,y) and orients the part to match, so the
   deck can be reshaped -- FRONT_H, RIM, the silhouette -- and every
   button follows it automatically instead of floating or sinking.
   ============================================================ */
/* L/R shoulder buttons -- swept bar on the RIDGE.

   Measured off the old build rather than re-derived. The original SHOULDER
   polygon's 184 points all sit OUTSIDE the silhouette (signed distance -0.06
   at the inner edge to -0.28 at the outer, so a bar 0.22 thick standing off
   the edge), extruded 0.22 deep and translated to z -0.11, which puts it
   dead-centre on the slab's mid-plane. Front and back equally. That is the
   ridge, and that is what an L/R button is.

   Every previous attempt here put it on the FRONT FACE, because it was built
   by sampling heightF -- the front sheet's height function. heightF does not
   know the back sheet exists, so no choice of seam depth or pad width could
   ever have got it over the edge. It was the wrong construction, not the
   wrong numbers.

   The construction that works: walk the silhouette by arc length, build a
   frame at each sample from the outline tangent and the outward normal, and
   sweep a rounded-rect cross-section that straddles z = 0. The body is never
   sampled at all -- the bar is positioned relative to the OUTLINE, which is
   the one thing the old and new bodies share exactly.

   One number could not be ported straight across. The old shell's 0.18 bevel
   put material 0.18 outside the outline for the bar to nest into; the new
   body has none -- both sheets meet at exactly z=0 at d=0, a knife edge. So
   the radial span shifts inboard: the bar's inner edge is buried INSIDE the
   body and only its outer part stands proud. Same thickness, same depth,
   same arc -- just moved in far enough to have something to hold on to. */
function buildShoulder(THREE, geo, side, material, opt) {
  opt = opt || {};
  const U = geo.userData;

  const S0     = opt.s0     !== undefined ? opt.s0     : 1.35;  // arc start (from top centre)
  const S1     = opt.s1     !== undefined ? opt.s1     : 2.34;  // arc end
  const R_IN   = opt.rIn    !== undefined ? opt.rIn    : -0.13; // inner edge, negative = inside body
  const R_OUT  = opt.rOut   !== undefined ? opt.rOut   :  0.09; // outer edge, positive = proud
  const ZH     = opt.zh     !== undefined ? opt.zh     :  0.15; // half depth either side of z=0
  const ROUND  = opt.round  !== undefined ? opt.round  :  0.055;
  const NSEG   = opt.nseg   !== undefined ? opt.nseg   : 64;    // samples along the arc
  const CSEG   = opt.cseg   !== undefined ? opt.cseg   : 5;     // samples per rounded corner
  const TAPER  = opt.taper  !== undefined ? opt.taper  :  0.55; // end-cap softening

  /* ---- 1. arc-length parameterisation of the outline ----
     U.poly comes from extractPoints, which repeats a point wherever two
     curves join. Those duplicates give zero-length segments, which poison
     both the cumulative length and the tangent, so drop them first. */
  const raw = U.poly, poly = [];
  for (const p of raw) {
    const q = poly[poly.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-9) poly.push({ x: p.x, y: p.y });
  }
  const N = poly.length;
  const cum = [0];
  for (let i = 1; i <= N; i++) {
    const a = poly[i - 1], b = poly[i % N];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  function atArc(s) {
    // binary search the segment containing arc length s, then lerp
    let lo = 0, hi = N;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = poly[lo], b = poly[(lo + 1) % N];
    const seg = cum[lo + 1] - cum[lo] || 1;
    const t = (s - cum[lo]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /* ---- 2. centreline and frames ----
     The tangent is taken from a finite difference in arc length rather than
     from adjacent poly vertices, so the frame stays smooth even where the
     source polyline is unevenly sampled. The outward normal is the tangent
     rotated a quarter turn; which of the two directions is outward is
     decided by asking the body's own SDF, not assumed from winding. */
  const eps = 0.004;
  const frames = [];
  for (let i = 0; i < NSEG; i++) {
    const s = S0 + (S1 - S0) * (i / (NSEG - 1));
    const c = atArc(s);
    const a = atArc(Math.max(0, s - eps)), b = atArc(s + eps);
    let tx = b.x - a.x, ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    let ox = ty, oy = -tx;
    if (U.sdf(c.x + ox * 0.01, c.y + oy * 0.01) > U.sdf(c.x, c.y)) { ox = -ox; oy = -oy; }
    frames.push({ cx: c.x, cy: c.y, ox, oy, tx, ty });
  }

  /* ---- 3. cross-section: rounded rect in the (radial, z) plane ----
     Carries its own 2D normal, so the swept normal is exact: the flats stay
     flat, the corners round off, and nothing needs a crease-angle pass. */
  const prof = [];
  const ri = R_IN + ROUND, ro = R_OUT - ROUND, zi = -ZH + ROUND, zo = ZH - ROUND;
  function edge(r0, z0, r1, z1, nr, nz, n) {
    for (let k = 0; k < n; k++) {
      const t = k / n;
      prof.push({ r: r0 + (r1 - r0) * t, z: z0 + (z1 - z0) * t, nr, nz });
    }
  }
  function corner(cr, cz, a0, a1) {
    for (let k = 0; k < CSEG; k++) {
      const a = a0 + (a1 - a0) * (k / CSEG);
      const nr = Math.cos(a), nz = Math.sin(a);
      prof.push({ r: cr + nr * ROUND, z: cz + nz * ROUND, nr, nz });
    }
  }
  edge(ri, -ZH, ro, -ZH, 0, -1, 4);          // back face
  corner(ro, zi, -Math.PI / 2, 0);           // back-outer corner
  edge(R_OUT, zi, R_OUT, zo, 1, 0, 4);       // outer face (the visible crown)
  corner(ro, zo, 0, Math.PI / 2);            // front-outer corner
  edge(ro, ZH, ri, ZH, 0, 1, 4);             // front face
  corner(ri, zo, Math.PI / 2, Math.PI);      // front-inner corner
  edge(R_IN, zo, R_IN, zi, -1, 0, 4);        // inner face (buried in the body)
  corner(ri, zi, Math.PI, Math.PI * 1.5);    // back-inner corner
  const M = prof.length;

  /* ---- 4. sweep ----
     Both ends pull the profile in toward its own centre over the last few
     rings, so the bar finishes with a softened end rather than a cut stub.
     side = +1 mirrors x, which flips handedness -- so the triangle winding
     flips with it, or the whole bar renders inside-out. */
  const pos = [], nor = [];
  const mirror = side > 0;
  const sx = mirror ? -1 : 1;
  const rc = (R_IN + R_OUT) / 2;

  function vert(i, j) {
    const f = frames[i], p = prof[j];
    // end taper: scale the profile about its own centre near either end
    const u = Math.min(i, NSEG - 1 - i) / (NSEG - 1);
    const k = TAPER < 1 ? 1 - (1 - TAPER) * Math.pow(Math.max(0, 1 - u * 8), 3) : 1;
    const r = rc + (p.r - rc) * k, z = p.z * k;
    return {
      p: [(f.cx + f.ox * r) * sx, f.cy + f.oy * r, z],
      n: [(p.nr * f.ox) * sx, p.nr * f.oy, p.nz]
    };
  }
  /* Orientation is decided per triangle by comparing the geometric normal
     against the normal the profile already carries, rather than by assuming
     a winding order. It has to be: the frame (outward, z, tangent) is
     LEFT-handed, so a counter-clockwise profile sweeps to inward-facing
     triangles -- and the outward direction is chosen at runtime from the
     SDF, so the handedness is not even constant along the arc. Getting this
     wrong culls the front faces and the bar renders see-through. */
  function tri(A, B, C) {
    const ux = B.p[0] - A.p[0], uy = B.p[1] - A.p[1], uz = B.p[2] - A.p[2];
    const vx = C.p[0] - A.p[0], vy = C.p[1] - A.p[1], vz = C.p[2] - A.p[2];
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
    const o = (gx * A.n[0] + gy * A.n[1] + gz * A.n[2]) < 0 ? [A, C, B] : [A, B, C];
    for (const v of o) { pos.push(v.p[0], v.p[1], v.p[2]); nor.push(v.n[0], v.n[1], v.n[2]); }
  }
  for (let i = 0; i < NSEG - 1; i++) {
    for (let j = 0; j < M; j++) {
      const j2 = (j + 1) % M;
      const a = vert(i, j), b = vert(i, j2), c = vert(i + 1, j2), d = vert(i + 1, j);
      tri(a, b, c); tri(a, c, d);
    }
  }
  // flat caps, fanned from the profile centroid, normal along the arc tangent
  for (const [i, dir] of [[0, -1], [NSEG - 1, 1]]) {
    const f = frames[i];
    const cn = [f.tx * dir * sx, f.ty * dir, 0];
    const mid = { p: [(f.cx + f.ox * rc) * sx, f.cy + f.oy * rc, 0], n: cn };
    for (let j = 0; j < M; j++) {
      const a = vert(i, j), b = vert(i, (j + 1) % M);
      const A = { p: a.p, n: cn }, B = { p: b.p, n: cn };
      if (dir > 0) tri(mid, A, B); else tri(mid, B, A);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  // presses inward along the mid-arc radial, the way a bumper actually moves
  const fm = frames[Math.floor(NSEG / 2)];
  mesh.userData.rest = new THREE.Vector3(0, 0, 0);
  mesh.userData.axis = new THREE.Vector3(-fm.ox * sx, -fm.oy, 0).normalize();
  mesh.userData.press = 0.05;
  mesh.name = side < 0 ? 'L button' : 'R button';
  return mesh;
}

function buildControls(THREE, geo) {
  const U = geo.userData;
  const fz = (x, y) => U.heightF(Math.max(0, U.sdf(x, y)));
  function fn(x, y) {                       // surface normal, by differencing
    const h = 0.02;
    const zx = (fz(x + h, y) - fz(x - h, y)) / (2 * h);
    const zy = (fz(x, y + h) - fz(x, y - h)) / (2 * h);
    return new THREE.Vector3(-zx, -zy, 1).normalize();
  }
  const group = new THREE.Group(), pressables = [];
  const UP = new THREE.Vector3(0, 1, 0);

  /* Palette and material response ported from controller-three.html.
     Two things beyond the hex values matter here: the face buttons carry a
     faint self-emission (the old build's `emissiveIntensity:.10`), which is
     what keeps the small caps from going dead under the new ACES curve; and
     roughness drops from .42 to .34, so the key light leaves a tight
     specular rather than a broad sheen. */
  const mat = (hex, rough, emiss) => {
    const m = new THREE.MeshStandardMaterial({ roughness: rough === undefined ? .42 : rough, metalness: .04 });
    m.color.setHex(hex).convertSRGBToLinear();
    if (emiss) { m.emissive.setHex(hex).convertSRGBToLinear(); m.emissiveIntensity = emiss; }
    return m;
  };
  function seat(mesh, x, y, lift, press, name, inert) {
    const n = fn(x, y);
    mesh.quaternion.setFromUnitVectors(UP, n);
    mesh.position.set(x, y, fz(x, y)).addScaledVector(n, lift || 0);
    mesh.userData.rest = mesh.position.clone();
    mesh.userData.axis = n.clone();
    mesh.userData.press = press === undefined ? 0.055 : press;
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (name) mesh.name = name;
    // remembered so a tilted stick can spring back to its seated orientation
    mesh.userData.baseQuat = mesh.quaternion.clone();
    group.add(mesh);
    // inert = static trim (stick wells, D-pad hub): seated and lit like
    // everything else, but never pressed and never raycast against
    if (!inert) pressables.push(mesh);
    return mesh;
  }
  // a lathe profile makes a domed button in ONE mesh, so it raycasts and
  // presses as a single object
  /* LatheGeometry needs its profile ordered BOTTOM-TO-TOP or the winding comes
     out reversed and every button renders inside-out -- backfaces culled, so
     they look like they are sunk into the deck with only a thin rim showing.
     The profiles below read top-down because that is easier to write, so
     reverse them here. */
  const lathe = pts => new THREE.LatheGeometry(
    pts.slice().reverse().map(p => new THREE.Vector2(p[0], p[1])), 40);

  // taken down again so the shrunken faceplate still contains the cluster
  // with room to spare; height left alone so they stay domed, not flat discs
  const BTN = lathe([[0, .14], [.090, .135], [.135, .105], [.150, .055], [.150, -.08]]);
  const SMALL = lathe([[0, .07], [.05, .065], [.075, .04], [.08, 0], [.08, -.06]]);
  /* The stick is now ONLY the part that tilts. The old build's flared base
     is gone from this profile and has become the static WELL below, because
     a tilt has to pivot at the socket with something stationary covering it
     -- the previous single-mesh stick rotated its own base out of the deck,
     which is exactly the giveaway. The stem narrows to .10 at the bottom so
     it clears the well's .215 inner radius at full lean. */
  const STICK = lathe([[0, .40], [.14, .385], [.24, .33], [.23, .24],
                       [.11, .16], [.10, -.02]]);
  // torus axis is Z; rotate it to Y so seat() can align it like the lathes
  const WELLG = new THREE.TorusGeometry(.27, .055, 14, 40);
  WELLG.rotateX(Math.PI / 2);

  // light scheme. The ported lighting/tone-mapping stays; only the hues
  // revert. `mat` still accepts an emissive term if a cap ever needs one.
  const SHELL = mat(0xb388e0), STICK_M = mat(0x8f66c4),
        DPAD  = mat(0x8f66c4), MENU  = mat(0xf2eef7);
  const FACE = [mat(0xf5e6a3), mat(0xf7b9d2), mat(0xa6e5de), mat(0xd2ea9e)];

  // left stick, D-pad, right stick -- exact positions from the original
  // controller-three.html build (makeStick(-1.25,0.20)/makeStick(1.25,-0.85),
  // D=[-1.25,-0.85]), not a re-derived approximation. The new silhouette is
  // close enough in scale to the old one that these numbers land correctly.
  const WELL_M = mat(0x7a55ab, .60);
  [[-1.25, 0.20, 'Left'], [1.25, -0.85, 'Right']].forEach(([x, y, n]) => {
    seat(new THREE.Mesh(WELLG, WELL_M), x, y, .02, 0, n + ' well', true);
    seat(new THREE.Mesh(STICK, STICK_M), x, y, 0, .07, n + ' stick');
  });

  /* The D-pad is ONE extruded plus-shape, not two crossed boxes. Two boxes
     would need an invisible parent to seat and press as a unit, and the
     raycaster skips the children of anything invisible -- so it would render
     fine and never be clickable. */
  /* The D-pad is ONE cross that rocks on a central pivot -- not four
     separate buttons. A real D-pad is a single moulded plate sitting on a
     hard pivot beneath its centre; pressing a direction tilts the whole
     plate that way, sinking the pressed arm and lifting the opposite one.
     The pivot is what stops all four switches closing at once.

     So the mesh stays one object and the DIRECTION is read from where the
     raycast landed on it, rather than from which of four meshes was hit.
     The rocking itself is applied in buildControls' parent space (see the
     tick loop), so the pivot sits at the seated origin -- the centre of the
     cross -- which is where the real pivot post is. */
  const cw = 0.095, cl = 0.30;
  const cross = new THREE.Shape();
  cross.moveTo(cw, cw);
  [[cl, cw], [cl, -cw], [cw, -cw], [cw, -cl], [-cw, -cl], [-cw, -cw],
   [-cl, -cw], [-cl, cw], [-cw, cw], [-cw, cl], [cw, cl]].forEach(p => cross.lineTo(p[0], p[1]));
  cross.closePath();
  const dgeo = new THREE.ExtrudeGeometry(cross, { depth: .10, bevelEnabled: true,
    bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 2 });
  dgeo.rotateX(-Math.PI / 2);   // extrude axis Z -> Y, so seat() can align it
  dgeo.center();
  smoothNormals(THREE, dgeo, 35);
  // nudged outboard off the leg's inner edge (was -1.25)
  const dpad = seat(new THREE.Mesh(dgeo, DPAD), -1.38, -0.85, .04, .02, 'D-pad');
  dpad.userData.rocker = true;   // the tick loop tilts this one instead of sinking it
  /* Hub is a CHILD of the cross, not a sibling: it has to rock with the
     plate or it would shear through the arms on every press. */
  const hubG = new THREE.CylinderGeometry(.085, .085, .11, 24);
  const hub = new THREE.Mesh(hubG, mat(0x6f4a9e, .55));
  hub.position.y = .03; hub.castShadow = true; dpad.add(hub);

  // four face buttons in a diamond -- centre and radius from the original
  // (1.18, 0.18), R=.34.
  const FC = [1.18, 0.18], R = 0.30;   // cluster pulled in with the plate
  const FNAME = ['Y', 'B', 'A', 'X'];
  [[0, R], [R, 0], [0, -R], [-R, 0]].forEach((o, i) =>
    seat(new THREE.Mesh(BTN, FACE[i]), FC[0] + o[0], FC[1] + o[1], 0, undefined, 'Face ' + FNAME[i]));

  // start / select -- original x=(-0.32,0.32), y=-0.42
  // raised off the lower deck (was y -0.42)
  seat(new THREE.Mesh(SMALL, MENU), -0.32, -0.30, 0, .035, 'Select');
  seat(new THREE.Mesh(SMALL, MENU),  0.32, -0.30, 0, .035, 'Start');

  /* L and R are swept ribbons following the silhouette's own top-edge-to-
     corner arc (see buildShoulder) rather than a single seated box -- a
     rigid box either floats or clips against this body's curved rim. */
  [-1, 1].forEach(side => {
    const m = buildShoulder(THREE, geo, side, SHELL);
    if (!m) return;
    group.add(m); pressables.push(m);
  });

  return { group, pressables };
}

window.ControllerBody = { buildBody, buildControls, buildEars, buildShoulder, smoothNormals };
