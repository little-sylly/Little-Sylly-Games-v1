// ═══════════════════════════════════════════════════════════════════════════
// lounge-lib.js — Premium lounge: the moulded-plastic helper, canvas-drawn
// surface patterns and the material set. Spec § 4.
//
// Pure: THREE, a canvas factory and smoothNormals are INJECTED, so
// tools/verify-lounge-props.js can drive it under Node. No DOM, no globals.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function louRoundedRect(THREE, w, h, r) {
    const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* ExtrudeGeometry puts bevelThickness on BOTH ends, so the caller's depth d
     is the total: the straight run is d - 2*bevel. Centred unless opt.center
     === false (the dial's wedge keeps its origin at the dial's centre). */
  function louExtrude(THREE, shape, d, bevel, opt, smoothNormals) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(d - 2 * bevel, 0.0005), bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: opt.bevelSegments || 4, curveSegments: opt.curveSegments || 12 });
    if (opt.center !== false) geo.center();
    if (opt.smooth !== false && smoothNormals) smoothNormals(THREE, geo, opt.crease || 35);
    return geo;
  }

  /* Re-map a FLAT geometry's UVs to 0..1 across its own xy bounding box.
     ExtrudeGeometry and ShapeGeometry both hand out raw x/y in METRES — right
     for a repeating speckle, useless for anything that has to land in a
     particular PLACE on the face (a wordmark, a decal). Flat only: it reads x/y
     and ignores z, so an extruded part's side walls come out stretched. The
     dial's star face is the reference caller. */
  function louUvFit(THREE, geo) {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    if (!p || !uv) return geo;
    geo.computeBoundingBox(); const b = geo.boundingBox;
    const sx = (b.max.x - b.min.x) || 1, sy = (b.max.y - b.min.y) || 1;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / sx, (p.getY(i) - b.min.y) / sy);
    uv.needsUpdate = true; return geo;
  }

  /* A RECTILINEAR outline (every corner a right angle) with a radius per
     corner, offset outward by `offset` — the one construction behind a window
     hole, the frame round it and a plate tucked under that frame. Deriving all
     three from one corner list is what keeps them concentric: an offset corner
     grows its radius by `offset` if convex and shrinks it if concave, so a
     frame drawn as `offset +fw` round a hole drawn at 0 has an even band all
     the way round by construction (plan § 1, "derive it from the feature").
     `corners` is CCW, [x, y, r]; the result is densely sampled — every
     `step` metres along a straight run — because a part that is going to be
     BENT round a cylinder needs vertices along its length (see louBend). */
  function louRoundPoly(THREE, corners, offset = 0, step = 0.003, arcSegs = 0) {
    const n = corners.length, out = [];
    const layout = (off) => corners.map((c, i) => {
      const a = corners[(i + n - 1) % n], b = corners[(i + 1) % n];
      const li = Math.hypot(c[0] - a[0], c[1] - a[1]), lo = Math.hypot(b[0] - c[0], b[1] - c[1]);
      const ei = [(c[0] - a[0]) / li, (c[1] - a[1]) / li], eo = [(b[0] - c[0]) / lo, (b[1] - c[1]) / lo];
      const ni = [ei[1], -ei[0]], no = [eo[1], -eo[0]];                  // outward = right of travel, for CCW
      const convex = ei[0] * eo[1] - ei[1] * eo[0] > 0;
      const k = off / (1 + ni[0] * no[0] + ni[1] * no[1]);
      const p = [c[0] + (ni[0] + no[0]) * k, c[1] + (ni[1] + no[1]) * k];
      return { p, ei, eo, convex, r: Math.max(0.0004, c[2] + (convex ? off : -off)) };
    });
    const ends = (c) => [[c.p[0] - c.ei[0] * c.r, c.p[1] - c.ei[1] * c.r], [c.p[0] + c.eo[0] * c.r, c.p[1] + c.eo[1] * c.r]];
    /* `arcSegs` MATCHES the sampling across offsets: every corner gets exactly
       that many arc segments and every straight run the count it has at
       offset 0, so two outlines of one corner list correspond point for point
       and can be stitched into a strip (louRibbon). */
    const q = layout(offset), q0 = arcSegs ? layout(0) : null;
    q.forEach((c, i) => {
      const [t1, t2] = ends(c);
      const s = c.convex ? 1 : -1;
      const C = [t1[0] - c.ei[1] * c.r * s, t1[1] + c.ei[0] * c.r * s];  // left of travel when convex
      const a0 = Math.atan2(t1[1] - C[1], t1[0] - C[0]);
      let da = Math.atan2(t2[1] - C[1], t2[0] - C[0]) - a0;
      if (s > 0 && da < 0) da += Math.PI * 2; if (s < 0 && da > 0) da -= Math.PI * 2;
      const segs = arcSegs || Math.max(6, Math.ceil(Math.abs(da) * c.r / (step * 0.5)));
      for (let j = 0; j <= segs; j++) { const a = a0 + da * j / segs; out.push(new THREE.Vector2(C[0] + Math.cos(a) * c.r, C[1] + Math.sin(a) * c.r)); }
      const t3 = ends(q[(i + 1) % n])[0];
      let m;
      if (arcSegs) { const u = ends(q0[i])[1], v = ends(q0[(i + 1) % n])[0]; m = Math.max(1, Math.round(Math.hypot(v[0] - u[0], v[1] - u[1]) / step)); }
      else m = Math.floor(Math.hypot(t3[0] - t2[0], t3[1] - t2[1]) / step);
      for (let j = 1; j < m; j++) out.push(new THREE.Vector2(t2[0] + (t3[0] - t2[0]) * j / m, t2[1] + (t3[1] - t2[1]) * j / m));
    });
    return out;
  }

  /* A moulded BAND swept along a rounded outline — a bezel, a trim, a rim.
     `profile` is its cross-section as [offset, height] pairs, walked from the
     inside edge, up, over the top and down the outside; each pair becomes one
     copy of the outline (matched sampling, see arcSegs above) and neighbours
     are stitched into a strip. That is the whole reason it exists: an
     ExtrudeGeometry of a thin band is triangulated by earcut into FANS whose
     triangles span half the part, and bending those (louBend) multiplied the
     jukebox's frame to 57,000 triangles. A strip has none of that, and its
     section is a true round-over instead of a bevel. Flat, like everything
     louBend takes: x/y are the outline's plane, z is height off it. */
  function louRibbon(THREE, corners, profile, step = 0.003, arcSegs = 12) {
    const rings = profile.map(([o, z]) => ({ pts: louRoundPoly(THREE, corners, o, step, arcSegs), z }));
    const N = rings[0].pts.length, pos = [], uv = [], idx = [];
    rings.forEach(r => r.pts.forEach(p => { pos.push(p.x, p.y, r.z); uv.push(p.x, p.y); }));
    for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < N; i++) {
      const a = k * N + i, b = k * N + (i + 1) % N, c = (k + 1) * N + (i + 1) % N, d = (k + 1) * N + i;
      idx.push(a, c, b, a, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); return geo;
  }

  /* A cross-section for louRibbon: a slab from offset x0 to x1, h tall, its
     two top edges rounded over with radius b. */
  function louRoundSection(x0, x1, h, b, n = 5) {
    const out = [[x0, 0], [x0, h - b]];
    for (let i = 1; i <= n; i++) { const t = (i / n) * Math.PI / 2; out.push([x0 + b - b * Math.cos(t), h - b + b * Math.sin(t)]); }
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI / 2; out.push([x1 - b + b * Math.sin(t), h - b + b * Math.cos(t)]); }
    out.push([x1, h - b], [x1, 0]);
    return out;
  }

  /* ── Upholstery (room pass, round 2 — the couch) ──────────────────────────
     A PILLOW: a box w×h×d with EVERY edge rounded to radius r, and optional bulges on named faces.
     `moulded` can't do this: an extrusion rounds its profile's corners but only bevels its two
     ends, so a cushion's front edge came out square. Built from a BoxGeometry grid whose lines are
     crowded into the rounded bands (`band` per band, `mid` across the flat), each vertex pushed out
     from its clamped core point to radius r — a true rounded box with no triangles wasted on the
     flats. `puff` is { '+y': metres, '-z': … }: that face swells by the amount at its centre,
     falling to nothing at its rounded edges, which is what makes a cushion look stuffed rather
     than moulded. Centred on the origin before the puff; the caller measures its box.
     `mid` may be [x, y, z] (room pass, item 12 — the bookshelf): a tall thin board wants its rows
     along its length, where a baked gradient runs, not the same count across its 2 cm edge. */
  function louPillow(THREE, w, h, d, r, opt = {}, smoothNormals) {
    const k = opt.band || 4, M = [].concat(opt.mid || 6), m = [0, 1, 2].map(a => M[Math.min(a, M.length - 1)]), n = m.map(v => 2 * k + v), S = [w / 2, h / 2, d / 2];
    r = Math.min(r, S[0] * 0.98, S[1] * 0.98, S[2] * 0.98);
    const core = S.map(s => s - r), puff = opt.puff || {};
    const remap = (t, a) => {   // a grid coordinate in [-1, 1] → crowded into the bands
      const i = Math.round((t + 1) / 2 * n[a]);
      if (i <= k) return -S[a] + (i / k) * r;
      if (i >= n[a] - k) return core[a] + ((i - (n[a] - k)) / k) * r;
      return -core[a] + ((i - k) / m[a]) * 2 * core[a];
    };
    const geo = new THREE.BoxGeometry(2, 2, 2, n[0], n[1], n[2]), pos = geo.attributes.position;
    const p = [0, 0, 0], c = [0, 0, 0];
    for (let i = 0; i < pos.count; i++) {
      for (let a = 0; a < 3; a++) { p[a] = remap(pos.array[i * 3 + a], a); c[a] = Math.min(Math.max(p[a], -core[a]), core[a]); }
      const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2], L = Math.hypot(dx, dy, dz) || 1, nv = [dx / L, dy / L, dz / L];
      let bulge = 0;
      Object.keys(puff).forEach(f => {
        const a = 'xyz'.indexOf(f[1]), s = f[0] === '-' ? -1 : 1, face = Math.max(0, s * nv[a]);
        if (!face) return;
        let fall = face;
        for (let b = 0; b < 3; b++) if (b !== a && core[b] > 1e-6) { const u = c[b] / core[b]; fall *= 1 - u * u; }
        bulge += puff[f] * fall;
      });
      pos.setXYZ(i, c[0] + nv[0] * (r + bulge), c[1] + nv[1] * (r + bulge), c[2] + nv[2] * (r + bulge));
    }
    geo.computeVertexNormals();
    // each box face is its own grid, so the faces meet on duplicate vertices: average across them
    if (smoothNormals) smoothNormals(THREE, geo, 80);
    return geo;
  }

  /* Several indexed geometries → one, each placed by [geometry, position, euler]. Position and
     normal only: the fabric samples triplanar and wants no UVs. The lamp's own merge (lou-props)
     is the same shape; the couch needed it in the room, which does not see lou-props. Disposes
     its inputs. */
  function louMerge(THREE, parts) {
    const pos = [], nor = [], idx = []; let off = 0;
    parts.forEach(([geo, p, r]) => {
      const mtx = new THREE.Matrix4().compose(new THREE.Vector3(...(p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
      const g = geo.index ? geo.clone() : geo.clone(); g.applyMatrix4(mtx);
      if (!g.attributes.normal) g.computeVertexNormals();
      const a = g.attributes.position, q = g.attributes.normal;
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); }
      if (g.index) g.index.array.forEach(v => idx.push(v + off)); else for (let i = 0; i < a.count; i++) idx.push(i + off);
      off += a.count; g.dispose(); geo.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setIndex(idx); return out;
  }

  /* Piping: a round cord of radius `rad` along the seam round ONE face of a pillow (half-sizes S,
     edge radius r). The seam sits where a sewn cushion's does — on the rounded edge, half way
     round it (45°), so it is neither on the flat nor under the cushion. `face` is '+y', '-x', ….
     A louRibbon with a circular profile, so the straight runs cost two rings, not two hundred. */
  const LOU_S45 = Math.SQRT1_2;
  function louSeam(THREE, S, r, face, rad = 0.0045, step = 0.08) {
    const a = 'xyz'.indexOf(face[1]), sg = face[0] === '-' ? -1 : 1;
    r = Math.min(r, S[0] * 0.98, S[1] * 0.98, S[2] * 0.98);
    const others = [0, 1, 2].filter(b => b !== a);   // the loop's plane, in axis order
    const hu = S[others[0]] - r + r * LOU_S45, hv = S[others[1]] - r + r * LOU_S45, cr = r * LOU_S45;
    const corners = [[-hu, -hv, cr], [hu, -hv, cr], [hu, hv, cr], [-hu, hv, cr]];
    const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI * 2; prof.push([Math.cos(t) * rad, Math.sin(t) * rad]); }
    const geo = louRibbon(THREE, corners, prof, step, 6);
    // ribbon space (outline u,v; height z) → the face's plane at the seam's depth along axis a
    const at = sg * (S[a] - r + r * LOU_S45), p = geo.attributes.position, out = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const o = [0, 0, 0]; o[others[0]] = p.getX(i); o[others[1]] = p.getY(i); o[a] = at + p.getZ(i);
      out.set(o, i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(out, 3)); geo.deleteAttribute('uv');
    geo.computeVertexNormals();
    /* Mapping (u, v, height) onto a face's axes is a rotation for some faces and a MIRROR for
       others, and a mirror turns the winding inside out. Ring 2 of the profile is its top
       (t = 90°, +rad along axis a, whichever side the face is on), so its normal must point +a. */
    if (geo.attributes.normal.array[2 * (p.count / prof.length) * 3 + a] < 0) {
      const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      geo.computeVertexNormals();
    }
    return geo;
  }

  /* A cylindrical WALL band from y0 to y1 with a hole cut through it: the
     jukebox's lavender body round its window. Built as columns, not as an
     extruded shape — earcut fills a band this wide with 40 cm fans. Each
     column runs from y0 up to where the vertical line meets the hole's
     outline, and from its top back up to y1; where the line misses the hole
     the two halves simply meet. Columns straddle every vertical run of the
     outline so its sides land exactly. The cut edge itself is not built:
     whatever hole this is, a frame covers its edge (see the jukebox). Outer
     face at R, inner at R − thick; uv in metres, for a speckle bump. */
  function louHoledBand(THREE, corners, R, thick, y0, y1, opt = {}) {
    const loop = louRoundPoly(THREE, corners, opt.offset || 0, 0.0008);
    let umin = Infinity, umax = -Infinity; loop.forEach(p => { umin = Math.min(umin, p.x); umax = Math.max(umax, p.x); });
    const cols = new Set(), coarse = opt.coarse || 0.006, fine = opt.fine || 0.0025, C = Math.PI * R;
    for (let u = -C; u < umin - 0.004; u += coarse) cols.add(+u.toFixed(6));
    for (let u = umin - 0.004; u <= umax + 0.004; u += fine) cols.add(+u.toFixed(6));
    for (let u = umax + 0.004; u < C; u += coarse) cols.add(+u.toFixed(6));
    cols.add(+C.toFixed(6));
    for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length];
      if (Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) > 1e-6) { cols.add(p.x - 1e-5); cols.add(p.x + 1e-5); } }
    const us = [...cols].sort((a, b) => a - b), NL = opt.rowsBelow || 4, NU = opt.rowsAbove || 6, per = NL + NU + 2;
    const cut = (u) => {
      const ys = [];
      for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length];
        if ((p.x <= u && q.x > u) || (q.x <= u && p.x > u)) ys.push(p.y + (q.y - p.y) * (u - p.x) / (q.x - p.x)); }
      if (ys.length < 2) { const m = (y0 + y1) / 2; return [m, m]; }
      return [Math.min.apply(null, ys), Math.max.apply(null, ys)];
    };
    const pos = [], nrm = [], uv = [], idx = [];
    [[R, 1], [R - thick, -1]].forEach(([r, s], face) => {
      const base = face * us.length * per;
      us.forEach(u => {
        const [b, t] = cut(u), a = u / R, sx = Math.sin(a), cz = Math.cos(a);
        for (let k = 0; k <= NL; k++) { const y = y0 + (b - y0) * k / NL; pos.push(r * sx, y, r * cz); nrm.push(s * sx, 0, s * cz); uv.push(u, y); }
        for (let k = 0; k <= NU; k++) { const y = t + (y1 - t) * k / NU; pos.push(r * sx, y, r * cz); nrm.push(s * sx, 0, s * cz); uv.push(u, y); }
      });
      for (let j = 0; j < us.length - 1; j++) [[0, NL], [NL + 1, NU]].forEach(([k0, rows]) => {
        for (let k = k0; k < k0 + rows; k++) {
          const a = base + j * per + k, b = a + per, c = b + 1, d = a + 1;
          if (s > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
        }
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); return geo;
  }

  /* Bend a FLAT part round a vertical cylinder: x is arc length measured at
     radius R0 (so every part bent with the same R0 lines up by ANGLE whatever
     its own depth), y is height, z is out of the surface. `z0` shifts the
     whole part in or out — the wall is bent at z0 −4 mm so its OUTER face is
     R0, the frame at 0 so it sits on it.

     SUBDIVIDE FIRST. ExtrudeGeometry and earcut hand out triangles that span
     a whole face — a 20 cm triangle bent round a 12 cm radius is a chord cut
     straight through the cylinder. Every edge longer than `maxDx` IN X is
     split at its midpoint until none is left. That stays crack-free across
     neighbours: whether an edge splits depends only on the edge itself, and
     (a+b)/2 is bit-identical from both sides. Only x matters — a tall thin
     triangle bends perfectly well. 10 mm is plenty: a 10 mm chord on the
     jukebox's 118 mm radius sags 0.1 mm, and the count grows with the
     SQUARE of a wide triangle's span, so feed it densely-sampled outlines.

     Normals are recomputed AFTER the bend (a flat part's normals all point
     the same way) and smoothed with a crease, like everything else here. */
  function louBend(THREE, geo, R0, opt, smoothNormals) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position.array, U = g.attributes.uv ? g.attributes.uv.array : null;
    const maxDx = opt.maxDx || 0.010, z0 = opt.z0 || 0;
    const V = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], U ? U[i * 2] : 0, U ? U[i * 2 + 1] : 0];
    const mid = (a, b) => a.map((v, k) => (v + b[k]) / 2);
    const work = [], pos = [], uv = [];
    for (let i = 0; i < P.length / 3; i += 3) work.push([V(i), V(i + 1), V(i + 2)]);
    while (work.length) {
      const t = work.pop();
      const d0 = Math.abs(t[0][0] - t[1][0]), d1 = Math.abs(t[1][0] - t[2][0]), d2 = Math.abs(t[2][0] - t[0][0]);
      const m = Math.max(d0, d1, d2);
      if (m <= maxDx) {
        t.forEach(v => { const a = v[0] / R0, r = R0 + z0 + v[2]; pos.push(r * Math.sin(a), v[1], r * Math.cos(a)); uv.push(v[3], v[4]); });
        continue;
      }
      if (m === d0) { const M = mid(t[0], t[1]); work.push([t[0], M, t[2]], [M, t[1], t[2]]); }
      else if (m === d1) { const M = mid(t[1], t[2]); work.push([t[0], t[1], M], [t[0], M, t[2]]); }
      else { const M = mid(t[2], t[0]); work.push([t[0], t[1], M], [M, t[1], t[2]]); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.computeVertexNormals();
    if (opt.smooth !== false && smoothNormals) smoothNormals(THREE, out, opt.crease || 35);
    if (geo !== g) g.dispose(); geo.dispose();
    return out;
  }

  /* Deterministic pseudo-random: a texture is the same on every mount. */
  const louRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* ─────────────────────────────────────────────────────────────────────────
     A bunny ear: a CRESCENT-section tube swept along a bent curve.

     Three's TubeGeometry can only sweep a circle, and a circle is exactly what
     made the telly's first ears read as sausages on a stick. A real ear is a
     rounded BACK with a scooped-out FRONT, and that scoop is most of the
     silhouette — it is what catches the light down the ear's length and what
     the inner-ear colour fills. So the sweep is hand-built.

     THE FRAME IS DELIBERATELY NOT FRENET. The curve is planar (it lives in y–z;
     the caller leans and splays the finished mesh), so the stable frame is the
     constant world X across the ear and N = X × T through it. Frenet normals
     roll at an inflection and would twist the scoop around the ear mid-length.

     Cross-section, θ around the ring:
         across  = cos θ                                 — the full ellipse, always
         through = sin θ · (1 − scoop · sin θ)            — FRONT half only (sin θ > 0)
     With scoop > 1 the valley at θ = π/2 sits BEHIND the spine while two ridges
     stand proud at sin θ = 1/(2·scoop). That is the groove, and it closes itself
     at θ = 0 and π where it rejoins the ellipse — no seam to hide.

     TIP: girth falls to zero over the last radius-worth of arc length, so the
     closure is a true hemisphere of the ear's own radius rather than a flat
     disc pretending to be one. `getPointAt` (arc length), never `getPoint`, is
     what makes that identity hold.

     FLOP: pass `opt.flop` — a SECOND spine, same girth and ring counts — and the
     result carries `flop.apply(k)`, a 0→1 lerp from the upright pose to that
     one. Both poses come out of the same `pose()`, so they are compatible
     vertex-for-vertex; that identity is the whole trick and it is why the second
     spine must have roughly the SAME ARC LENGTH (an ear folds, it does not
     stretch). Keep the first few spine points identical and the lower half
     cannot drift while the top folds over.

     Local frame: root at the origin, +y up, +z forward (the scoop faces +z).
     Returns the outer shell, the inner-ear sheet — the SAME surface a hair
     proud, front only, so it is a colour change exactly where the groove starts
     and not a second lobe floating in it — the tip point, and `flop` (null
     unless asked for).
     ───────────────────────────────────────────────────────────────────────── */
  function louBunnyEar(THREE, points, opt, smoothNormals) {
    const W = opt.width !== undefined ? opt.width : 0.058;      // half-width, across the ear
    const T = opt.thick !== undefined ? opt.thick : 0.070;      // half-thickness, through it
    const SCOOP = opt.scoop !== undefined ? opt.scoop : 1.30;
    /* `thickBias` < 1 keeps the lobe's VOLUME while its outline narrows — see
       `ring` below. The material left at the centre of a scooped section is
       thick·(2 − scoop): worth computing, because deepening the bowl to make
       the dish read hollows the lobe out at the same time and nothing in a
       front-on view shows it. */
    const TH_BIAS = opt.thickBias !== undefined ? opt.thickBias : 1;
    const SEG = opt.segments || 64, RAD = opt.radial || 32;
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    const L = Math.max(curve.getLength(), 1e-6);
    /* Girth keyframes: a root flare that fillets into the shell it grows out of
       (without it the ear looks bolted on — the same lesson the controller's ear
       boss records), a waist, then a swell, then the taper.

       INTERPOLATED WITH A MONOTONE CUBIC, NOT SMOOTHSTEP. This is the whole
       reason the ear's outline used to read as "a series of straight edges
       rather than a smooth curve": smoothstep has ZERO SLOPE AT BOTH ENDS of
       every span, so the profile went flat at every keyframe — a flat girth is
       a parallel-sided silhouette, i.e. a straight run — and then bent hard in
       between. Fritsch–Carlson tangents flow through a keyframe instead, and
       zero only at a genuine local extremum (the waist and the belly), which is
       where the outline SHOULD be momentarily parallel.

       Note the contrast with `scoopAt` below, which still uses smoothstep and
       is right to: that one joins two CONSTANT regions, so zero slope at the
       joins is exactly what it wants. */
    const KEYS = opt.profile || [[0, 1.18], [0.09, 0.88], [0.40, 0.92], [0.70, 1.06]];
    const END = KEYS[KEYS.length - 1][1];
    const TIP = Math.max(0.5, 1 - (Math.max(W, T) * END) / L);
    const smoothstep = (a) => a * a * (3 - 2 * a);
    const KN = KEYS.length;
    const slope = [], tan = [];
    for (let i = 0; i < KN - 1; i++) slope.push((KEYS[i + 1][1] - KEYS[i][1]) / Math.max(KEYS[i + 1][0] - KEYS[i][0], 1e-9));
    for (let i = 0; i < KN; i++) {
      if (i === 0) { tan.push(slope[0]); continue; }
      if (i === KN - 1) { tan.push(slope[KN - 2]); continue; }
      const a = slope[i - 1], b = slope[i];
      if (a * b <= 0) { tan.push(0); continue; }                       // a genuine extremum
      const m = (a + b) / 2, cap = 3 * Math.min(Math.abs(a), Math.abs(b));
      tan.push(Math.sign(m) * Math.min(Math.abs(m), cap));             // Fritsch-Carlson limiter
    }
    function keyGirth(t) {
      if (t <= KEYS[0][0]) return KEYS[0][1];
      /* Past the last key the profile CONTINUES on its own tangent rather than
         flattening, so the tip closure below joins it without a crease. */
      if (t >= KEYS[KN - 1][0]) return Math.max(END * 0.15, END + tan[KN - 1] * (t - KEYS[KN - 1][0]));
      let i = 1; while (i < KN - 1 && t > KEYS[i][0]) i++;
      const x1 = KEYS[i - 1][0], x2 = KEYS[i][0], h = x2 - x1, u = (t - x1) / h;
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * KEYS[i - 1][1] + (u3 - 2 * u2 + u) * tan[i - 1] * h
           + (-2 * u3 + 3 * u2) * KEYS[i][1] + (u3 - u2) * tan[i] * h;
    }
    /* The tip MULTIPLIES the profile by the circular falloff rather than
       switching to it. Switching made the girth flat on the dome's side of the
       join while the shaft still had slope — a visible corner right where the
       taper meets the tip. As a product it is C1 by construction: the falloff's
       own derivative is zero at the join, so the shaft's slope carries through. */
    /* ── `opt.ellipse = { at, half }` replaces the keyframes with an ANALYTIC
       ELLIPSE, and it is what the telly uses. A bunny ear's outline simply IS an
       ellipse, and no keyframed profile interpolates its way to one: every
       interpolation scheme has to guess the curve between control points, and
       every guess shows up on a silhouette. The ellipse has no control points
       to guess between — it is C-infinity everywhere in its interior.

       It also closes its own tip, so the separate circular closure below is
       skipped: near t = at + half the profile behaves as sqrt(2d), i.e. a
       SPHERE of radius W²/(half·L). At the telly's numbers that is a ~30 mm
       tip on a 140 mm-wide ear — blunt by construction, no join to get wrong.

       Its lower end pinches too. That end lives inside the shell, under the
       boss, which is why the root no longer needs a flare keyframe at all. */
    const ELL = opt.ellipse || null;
    /* `n` makes it a SUPERellipse: 2 is a true ellipse, a little above 2 keeps
       more width through the middle (a fuller, more capsule-like lobe) at the
       cost of a blunter tip. Past about 2.3 the tip flattens visibly. */
    const ELL_N = ELL && ELL.n ? ELL.n : 2;
    function girth(t) {
      if (ELL) {
        const x = Math.abs((t - ELL.at) / ELL.half);
        if (x >= 1) return 0;
        return ELL_N === 2 ? Math.sqrt(1 - x * x) : Math.pow(1 - Math.pow(x, ELL_N), 1 / ELL_N);
      }
      if (t <= TIP) return keyGirth(t);
      const u = (t - TIP) / (1 - TIP);
      return keyGirth(t) * Math.sqrt(Math.max(0, 1 - u * u));
    }
    /* The scoop FADES OUT into the tip. Holding it constant leaves a dent in the
       closing hemisphere — the tip then ends on a concave crescent edge instead
       of a dome, which is exactly what a real ear does not do. */
    /* The scoop fades IN at the root as well as OUT at the tip. A crescent
       section has two thin horns where its front rejoins the ellipse, and if
       the ear is still fully scooped where it enters the shell those horns
       surface as a pair of knife-edged fins either side of the root. Real ears
       start their bowl above where they meet the head; so does this one. */
    const RISE0 = opt.scoopStart !== undefined ? opt.scoopStart : 0, RISE1 = opt.scoopFull !== undefined ? opt.scoopFull : 0;
    const FADE0 = opt.scoopFrom !== undefined ? opt.scoopFrom : 0.62, FADE1 = opt.scoopTo !== undefined ? opt.scoopTo : 0.95;
    function scoopAt(base, t) {
      let f = 1;
      if (RISE1 > RISE0) f = t <= RISE0 ? 0 : t >= RISE1 ? 1 : smoothstep((t - RISE0) / (RISE1 - RISE0));
      if (t >= FADE1) f = 0;
      else if (t > FADE0) f = Math.min(f, 1 - smoothstep((t - FADE0) / (FADE1 - FADE0)));
      return 1 + (base - 1) * f;
    }
    /* The inner sheet may use a SHALLOWER scoop than the lobe. It then sits
       proud of the bowl's floor and meets it on a small lip at its own edge —
       which is what reads as an inner ear stretched across the bowl rather than
       as a colour painted on its floor. Flush (same scoop) by default. */
    const IN_SCOOP = opt.innerScoop !== undefined ? opt.innerScoop : SCOOP;
    const X = new THREE.Vector3(1, 0, 0), N = new THREE.Vector3(), P = new THREE.Vector3(), Tg = new THREE.Vector3();
    const IN_SEG = opt.innerSegments || 40, IN_RAD = opt.innerRadial || 20;
    const th0 = Math.PI * (opt.innerFrom !== undefined ? opt.innerFrom : 0.10), th1 = Math.PI - th0;
    const inT0 = opt.innerT0 !== undefined ? opt.innerT0 : 0.05;
    const inT1 = opt.innerT1 !== undefined ? opt.innerT1 : 0.88;
    const LIFT = opt.innerLift !== undefined ? opt.innerLift : 0.0009;
    const MARGIN = opt.innerMargin || 0;   // >0 = concentric inset; 0 = fixed arc
    const IN_ROOT = opt.innerRoot || null; // { from, to } — taper the inlay to a point at the base

    function grid(rows, cols, base) {
      const idx = [];
      for (let i = 0; i < rows - 1; i++) for (let k = 0; k < cols; k++) {
        const a = base + i * (cols + 1) + k, b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      return idx;
    }

    /* One POSE — the whole sweep along `spine`. The girth/scoop profiles and the
       ring counts are shared, so two poses built from different spines are
       vertex-for-vertex compatible: that is what lets the flop be a straight
       lerp between them rather than a second mesh. */
    function pose(spine) {
      const curve = new THREE.CatmullRomCurve3(spine.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      function ring(t, out, k0, k1, n, offset, scoopBase) {
        P.copy(curve.getPointAt(t)); Tg.copy(curve.getTangentAt(t)).normalize();
        N.copy(X).cross(Tg).normalize();
        const g = girth(t), sc = scoopAt(scoopBase === undefined ? SCOOP : scoopBase, t);
        /* THICKNESS DOES NOT TAPER AT THE SAME RATE AS WIDTH. One girth scaling
           both axes is the obvious construction and it is why the lobe went thin
           exactly where it is seen most — the fold, up near the tip, where girth
           is small. A cartoon ear narrows in OUTLINE while keeping its volume,
           so the through-axis runs on girth^p with p < 1.
           The exponent itself eases back to 1 as girth → 0, or the tip would
           close to a chisel edge (thin across, still thick through) instead of a
           point: at girth 1 it is `bias`, at girth 0 it is 1. */
        const gT = TH_BIAS >= 1 ? g : Math.pow(g, 1 - (1 - TH_BIAS) * g);
        for (let k = 0; k <= n; k++) {
          const th = k0 + (k1 - k0) * (k / n), s = Math.cos(th), si = Math.sin(th);
          const u = si > 0 ? si * (1 - sc * si) : si;
          out.push(P.x + X.x * (W * g * s) + N.x * (T * gT * u + offset),
                   P.y + X.y * (W * g * s) + N.y * (T * gT * u + offset),
                   P.z + X.z * (W * g * s) + N.z * (T * gT * u + offset));
        }
      }
      // ── outer shell: SEG rings + a pole vertex, plus its own duplicated root ring
      const pos = [], uv = [], index = [];
      for (let i = 0; i < SEG; i++) {
        const t = i / SEG; ring(t, pos, 0, Math.PI * 2, RAD, 0);
        for (let k = 0; k <= RAD; k++) uv.push(k / RAD, t);
      }
      index.push.apply(index, grid(SEG, RAD, 0));
      const apex = pos.length / 3;
      const tipP = curve.getPointAt(1); pos.push(tipP.x, tipP.y, tipP.z); uv.push(0.5, 1);
      for (let k = 0; k < RAD; k++) { const a = (SEG - 1) * (RAD + 1) + k; index.push(a, apex, a + 1); }
      /* The root cap gets its OWN copy of ring 0. Sharing it would hand every root
         vertex an average of the cap's normal and the wall's — a 90° smear right
         where the ear leaves the shell. */
      const capBase = pos.length / 3;
      ring(0, pos, 0, Math.PI * 2, RAD, 0);
      for (let k = 0; k <= RAD; k++) uv.push(k / RAD, 0);
      const root = pos.length / 3; const rootP = curve.getPointAt(0);
      pos.push(rootP.x, rootP.y, rootP.z); uv.push(0.5, 0);
      for (let k = 0; k < RAD; k++) index.push(capBase + k + 1, root, capBase + k);

      const outer = new THREE.BufferGeometry();
      outer.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      outer.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      outer.setIndex(index); outer.computeVertexNormals();
      if (smoothNormals) smoothNormals(THREE, outer, opt.crease || 50);

      /* ── inner sheet: the front arc only, a hair proud of the groove it fills.
         CONCENTRIC, not a shape of its own. Its outline is the LOBE'S outline
         inset by a constant margin, so it follows the ear and leaves an even
         band of ear colour all the way round. The previous version tapered on a
         formula of its own and came out an egg that ignored the ear it sat in.
         sin(a) = 1 - margin/(W·girth) is what puts the sheet's edge exactly
         `margin` inside the silhouette at every t; where the lobe is narrower
         than the margin there is no sheet at all, which is what closes it into
         an almond at both ends without a taper curve. */
      const IN_MID = (th0 + th1) / 2, IN_HALF = (th1 - th0) / 2;
      const arcAt = (t) => {
        if (!MARGIN) return IN_HALF;                                  // fixed-arc fallback
        const hw = W * girth(t);
        let half = hw - MARGIN;                                        // constant inset: follows the lobe
        if (IN_ROOT && t < IN_ROOT.to) {
          /* TEARDROP. A constant inset alone ends on a flat cut above the root,
             which reads as a stamped oval rather than a sculpted cavity. Below
             `to` the inlay narrows on its own curve to a rounded point, so it
             tapers down toward the base the way a real inner ear does. The 0.6
             power is what rounds that point: it gives the boundary an infinite
             slope at the bottom, so the outline turns rather than meeting in a
             cusp. */
          const u = Math.min(1, Math.max(0, (t - IN_ROOT.from) / (IN_ROOT.to - IN_ROOT.from)));
          half = Math.min(half, hw * Math.sin(Math.PI / 2 * Math.pow(u, 0.6)) - MARGIN * 0.35);
        }
        return half <= 0 ? 0 : Math.min(IN_HALF, Math.asin(Math.min(1, half / hw)));
      };
      let lo = inT0, hi = inT1;
      if (MARGIN) {   // trim to where the lobe is actually wider than the margin
        const STEP = 1 / 512;
        for (let t = inT0; t <= inT1; t += STEP) { if (arcAt(t) > 0.03) { lo = t; break; } }
        for (let t = inT1; t >= inT0; t -= STEP) { if (arcAt(t) > 0.03) { hi = t; break; } }
      }
      const ipos = [], iuv = [];
      for (let i = 0; i < IN_SEG; i++) {
        const u = i / (IN_SEG - 1);
        const t = lo + (hi - lo) * u;
        /* never exactly zero: a collapsed ring hands computeVertexNormals a
           degenerate fan, and NaN normals with it */
        const a = Math.max(0.02, arcAt(t));
        ring(t, ipos, IN_MID - a, IN_MID + a, IN_RAD, LIFT, IN_SCOOP);
        for (let k = 0; k <= IN_RAD; k++) iuv.push(k / IN_RAD, t);
      }
      const inner = new THREE.BufferGeometry();
      inner.setAttribute('position', new THREE.Float32BufferAttribute(ipos, 3));
      inner.setAttribute('uv', new THREE.Float32BufferAttribute(iuv, 2));
      inner.setIndex(grid(IN_SEG, IN_RAD, 0)); inner.computeVertexNormals();
      if (smoothNormals) smoothNormals(THREE, inner, opt.crease || 50);

      return { outer, inner, tip: tipP.clone(), len: curve.getLength() };
    }

    const base = pose(points);
    if (!opt.flop) return { outer: base.outer, inner: base.inner, tip: base.tip, length: L, lengthFlop: null, flop: null };

    /* ── the flop, as a CPU morph between two poses of the same topology.
       Not Three's own morph targets: r128 drives those through a small fixed set
       of vertex attributes and material flags, and this is one target on two
       meshes — a lerp over ~3,000 vertices costs about 0.05 ms and stays
       drivable (and assertable) under Node, where a shader cannot be.
       Normals are lerped from the two SMOOTHED poses and renormalised, so the
       fold shades correctly the whole way over instead of only at the ends. */
    const alt = pose(opt.flop);
    function morph(geo, target) {
      const pa = geo.attributes.position, na = geo.attributes.normal;
      const basePos = Float32Array.from(pa.array), baseNrm = Float32Array.from(na.array);
      const tPos = target.attributes.position.array, tNrm = target.attributes.normal.array;
      /* Bounds must span BOTH poses or the ear pops out of frustum culling —
         and Box3.setFromObject trusts a boundingBox that is already there. */
      const bb = new THREE.Box3().setFromBufferAttribute(pa);
      bb.union(new THREE.Box3().setFromBufferAttribute(target.attributes.position));
      geo.boundingBox = bb; geo.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
      let last = -1;
      return function apply(k) {
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        if (k === last) return false;
        last = k;
        const Pp = pa.array, Nn = na.array;
        for (let i = 0; i < Pp.length; i += 3) {
          Pp[i]     = basePos[i]     + (tPos[i]     - basePos[i]) * k;
          Pp[i + 1] = basePos[i + 1] + (tPos[i + 1] - basePos[i + 1]) * k;
          Pp[i + 2] = basePos[i + 2] + (tPos[i + 2] - basePos[i + 2]) * k;
          const nx = baseNrm[i]     + (tNrm[i]     - baseNrm[i]) * k;
          const ny = baseNrm[i + 1] + (tNrm[i + 1] - baseNrm[i + 1]) * k;
          const nz = baseNrm[i + 2] + (tNrm[i + 2] - baseNrm[i + 2]) * k;
          const m = Math.hypot(nx, ny, nz) || 1;
          Nn[i] = nx / m; Nn[i + 1] = ny / m; Nn[i + 2] = nz / m;
        }
        pa.needsUpdate = true; na.needsUpdate = true;
        return true;
      };
    }
    const mo = morph(base.outer, alt.outer), mi = morph(base.inner, alt.inner);
    alt.outer.dispose(); alt.inner.dispose();   // the arrays are kept; the GPU copies are not
    return { outer: base.outer, inner: base.inner, tip: base.tip, tipFlop: alt.tip,
             length: base.len, lengthFlop: alt.len,
             flop: { apply(k) { const a = mo(k); return mi(k) || a; } } };
  }

  function louTextures(THREE, makeCanvas) {
    const wrap = (c, rx, ry, linear) => {
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding; return t;
    };
    const flat = (c) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    // tex.braid's builder, memoised per option set: the colour map and its bump are ONE field, built once
    const braidCache = {};
    const buildBraid = (P) => {
      const N = P.size, n = N * N, TAU = Math.PI * 2, rw = 0.5 / P.rings, r = louRng(P.seed);
      const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const enc = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
      // the per-texel conversions go through tables, as the wallpaper's do (a pow a channel dominated the build)
      const ENC = Uint8Array.from({ length: 4097 }, (_, k) => enc(k / 4096)), LIN = Float32Array.from({ length: 256 }, (_, b) => lin(b));
      const encF = v => ENC[v <= 0 ? 0 : v >= 1 ? 4096 : Math.round(v * 4096)];
      const rgb = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
      const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      // the bands, expanded to one [dominant, accent] per ring, OUTSIDE in, cycling if they run short
      const perRing = []; P.bands.forEach(([d, a, k]) => { for (let j = 0; j < k; j++) perRing.push([rgb(d), rgb(a)]); });
      // P.soft pulls every colour toward the palette's own mean (linear light): the same bands, less
      // contrast between them, so the rug sits back as a background item (owner, 25 Sep 2026)
      const avg = [0, 1, 2].map(ch => perRing.reduce((s, [d, a]) => s + d[ch] + a[ch], 0) / (perRing.length * 2));
      perRing.forEach(pair => pair.forEach(c => { for (let ch = 0; ch < 3; ch++) c[ch] += (avg[ch] - c[ch]) * P.soft; }));
      const ringCol = io => perRing[io % perRing.length];
      // lumps per ring: a whole number, so the braid closes at the atan2 seam; a random start so the
      // lumps of neighbouring rings never line up into spokes
      const lumps = [], start = [];
      for (let i = 0; i < P.rings; i++) { lumps.push(Math.max(3, Math.round(TAU * (i + 0.5) / P.pitch))); start.push(r()); }
      const SIN = Float32Array.from({ length: 1025 }, (_, k) => Math.sin(Math.PI * k / 1024));
      const sinP = f => SIN[Math.round(f * 1024)];
      const col = new Float32Array(n * 3), hgt = new Float32Array(n), acc = [0, 0, 0]; let inDisc = 0;
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
        const p = py * N + px, dx = (px + 0.5) / N - 0.5, dy = (py + 0.5) / N - 0.5, R = Math.hypot(dx, dy);
        const i = Math.min(P.rings - 1, Math.floor(R / rw)), t = Math.min(1, R / rw - i), side = t < 0.5 ? 0 : 1;
        const a = side ? (t - 0.5) * 2 : t * 2;
        const q = (Math.atan2(dy, dx) / TAU + 0.5) * lumps[i] + start[i] + 0.55 * (side ? a : 1 - a) + 0.5 * side;
        const k = Math.floor(q), f = q - k;
        // the lump crowns, the two columns meet in a crease, and the rope rounds into the groove between rings
        const h = 0.55 * Math.sqrt(sinP(f) * sinP(a)) + 0.45 * Math.sqrt(sinP(t));
        const [dom, acc2] = ringCol(P.rings - 1 - i), c = (((k * 2 + side) % 3) + 3) % 3 === 2 ? acc2 : dom;
        const s = (1 - P.relief + P.relief * h) * (1 + 0.06 * (hash(px, py) - 0.5));
        for (let ch = 0; ch < 3; ch++) col[p * 3 + ch] = c[ch] * s;
        hgt[p] = h;
        if (R < 0.5) { inDisc++; for (let ch = 0; ch < 3; ch++) acc[ch] += col[p * 3 + ch]; }
      }
      // hold the tone: gain the field (linear light, per channel) so the DISC averages to P.mean
      const M = rgb(P.mean), g = M.map((m, ch) => m / (acc[ch] / inDisc));
      const c = makeCanvas(N, N), img = c.getContext('2d').createImageData(N, N), out = new Uint8ClampedArray(n * 4);
      const got = [0, 0, 0];
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
        const p = py * N + px, dx = (px + 0.5) / N - 0.5, dy = (py + 0.5) / N - 0.5, inside = Math.hypot(dx, dy) < 0.5;
        for (let ch = 0; ch < 3; ch++) { const b = encF(col[p * 3 + ch] * g[ch]); out[p * 4 + ch] = b; if (inside) got[ch] += LIN[b]; }
        out[p * 4 + 3] = 255;
      }
      img.data.set(out); c.getContext('2d').putImageData(img, 0, 0);
      // the bump: the same height field at half size, 2×2 averaged, linear (a bump is data, not colour)
      const H = N / 2, bc = makeCanvas(H, H), bimg = bc.getContext('2d').createImageData(H, H), bout = new Uint8ClampedArray(H * H * 4);
      for (let py = 0; py < H; py++) for (let px = 0; px < H; px++) {
        const p = 2 * py * N + 2 * px, v = Math.round(255 * (hgt[p] + hgt[p + 1] + hgt[p + N] + hgt[p + N + 1]) / 4), j = (py * H + px) * 4;
        bout[j] = bout[j + 1] = bout[j + 2] = v; bout[j + 3] = 255;
      }
      bimg.data.set(bout); bc.getContext('2d').putImageData(bimg, 0, 0);
      const bump = new THREE.CanvasTexture(bc); bump.encoding = THREE.LinearEncoding;
      const tx = flat(c); tx.userData = tx.userData || {};   // r128's Texture has no userData
      tx.userData.louBump = bump; tx.userData.louRings = P.rings;
      // what the disc actually came out as, after quantising — the harness holds it to P.mean
      tx.userData.louMean = '#' + got.map(v => enc(v / inDisc).toString(16).padStart(2, '0')).join('');
      // the rope edge's colour: the OUTER ring's dominant strand at the same gain, shaded as the roll turns
      // down — LINEAR hex, because a material colour in r128 is linear-as-given
      tx.userData.louEdge = '#' + perRing[0][0].map((v, ch) => Math.round(255 * Math.min(1, v * g[ch] * 0.62)).toString(16).padStart(2, '0')).join('');
      return tx;
    };
    return {
      wood(base = '#dcc2a0', dark = '#b8946a', rx = 3, ry = 3) {
        const c = makeCanvas(512, 512), x = c.getContext('2d'), r = louRng(7);
        x.fillStyle = base; x.fillRect(0, 0, 512, 512);
        for (let p = 0; p < 6; p++) { x.fillStyle = 'rgba(0,0,0,' + (0.02 + r() * 0.03) + ')'; x.fillRect(0, p * 86, 512, 2); }
        x.strokeStyle = dark;
        for (let i = 0; i < 160; i++) {
          x.globalAlpha = 0.05 + r() * 0.08; x.lineWidth = 1 + r() * 1.5; x.beginPath();
          const y0 = r() * 512; x.moveTo(0, y0);
          for (let xx = 0; xx <= 512; xx += 32) x.lineTo(xx, y0 + Math.sin(xx / 70 + i) * 3);
          x.stroke();
        }
        x.globalAlpha = 1; return wrap(c, rx, ry);
      },
      /* Flatsawn GRAIN for louGrain (room pass, round 3 — the coffee table). Grain runs along u. A
         pixel field, not strokes: growth rings are the level sets of N·v plus a warp built only from
         integer-frequency sines, so the tile wraps both ways and a ring's id (mod N) does too. Each
         ring is a light earlywood band ending in a sharper dark latewood line; pores are short dashes
         along the grain. The earlywood colour is SOLVED so the tile's linear mean equals `mean` —
         the owner kept the table's honey tone (24 Sep 2026), so the grain adds detail, not a shift.
         The default sits a touch warmer than the old flat wood's mean because the lacquer's neutral
         highlight lifts blue: in the room shot the top now lands within 3/255 of the old table.
         No repeat: louGrain samples it in object space, in metres. */
      grain(mean = '#9a6a43', late = '#5a331c', size = 512, rings = 17) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), TAU = Math.PI * 2, n = size * size;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const enc = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
        const rgb = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
        const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
        const d = new Float32Array(n); let md = 0;
        for (let py = 0; py < size; py++) {
          const v = py / size, shift = Math.floor(hash(py, 3) * size);
          for (let px = 0; px < size; px++) {
            const u = px / size;
            /* Long, nearly straight lines drifting slowly (low integer frequencies only — any higher
               and every line wiggles into sand ripples), plus ONE cathedral: a ridge that lifts the
               rings near (0.3, 0.55) into nested arches, fading out well inside the tile's v wrap. */
            const dv = Math.abs(((v - 0.55) % 1 + 1.5) % 1 - 0.5);
            const cath = 4.5 * Math.exp(-(dv * dv) / 0.02) * Math.pow(0.5 + 0.5 * Math.cos(TAU * (u - 0.3)), 3);
            const warp = 1.4 * Math.sin(TAU * u + 1.3) + 0.4 * Math.sin(TAU * (2 * u + v) + 0.2) + cath;
            const f = rings * v + warp, ring = Math.floor(f), t = f - ring;
            const lateW = ss(0.55, 0.9, t) * (1 - ss(0.92, 1, t)) * (0.5 + 0.5 * hash(((ring % rings) + rings) % rings, 7));
            const pore = hash(((px + shift) % size) >> 4, py) > 0.95 ? 1 : 0;
            // fibre: a value along u per 2-px row pair, so faint streaks run with the grain
            const fu = ((px + shift) % size) / 32, fc = Math.floor(fu), fr = fu - fc;
            const fib = hash(py >> 1, fc % (size / 32)) * (1 - fr) + hash(py >> 1, (fc + 1) % (size / 32)) * fr;
            const low = 0.5 + 0.5 * Math.sin(TAU * (u + 2 * v) + 0.4) * Math.sin(TAU * (2 * u - v) + 1.9);
            const k = Math.min(1, 0.4 * lateW + 0.16 * pore + 0.1 * fib + 0.1 * low);
            d[py * size + px] = k; md += k;
          }
        }
        md /= n;
        const M = rgb(mean), D = rgb(late), E = M.map((m, i) => (m - D[i] * md) / (1 - md));
        const img = x.createImageData(size, size), px = new Uint8ClampedArray(n * 4), acc = [0, 0, 0], W = [0.299, 0.587, 0.114];
        let lum = 0;
        for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) {
          const b = enc(E[ch] + (D[ch] - E[ch]) * d[i]); px[i * 4 + ch] = b; px[i * 4 + 3] = 255; acc[ch] += lin(b); lum += W[ch] * b / 255;
        }
        img.data.set(px); x.putImageData(img, 0, 0);
        // no anisotropy: at our camera the top is not oblique enough to need it — measured, the room shot
        // matched to 0.1/255 with it on or off, and it cost ~20 ms held-state in SwiftShader
        const t = wrap(c, 1, 1); t.userData = t.userData || {};   // r128's Texture has no userData
        // what the tile actually came out as, after quantising — the harness holds it to `mean`
        t.userData.louMean = '#' + acc.map(a => enc(a / n).toString(16).padStart(2, '0')).join('');
        t.userData.louLum = lum / n;   // mean luma of the RAW (sRGB) texels — the space louGrain's roughness term reads in
        return t;
      },
      /* The WALLPAPER (room pass, round 6), a tile measured in METRES: the walls' UVs are metres
         (lounge-room.js), so `repeat` is 1/tile and a narrow wall can no longer squash the print. The
         old one repeated a 256 px tile 6×4 on both walls, so the 4 m side wall ran 30% narrower
         than the 5.6 m back one. A pixel field, like tex.grain, drawn with putImageData only:
         - two half-dropped rainbows per tile, thin bands with soft edges, each band a slightly
           different muted tint, their legs fading out so they sit IN the paper;
         - a sparse scatter of small rounded five-point stars, kept off the rainbows and each other;
         - paper: a low mottle and a fibre grain in the colour, and the same fibre (plus the ink,
           a hair proud) in a linear BUMP tile returned as userData.louBump. A bump samples through
           the map's uvTransform in r128, so it shares the tile by construction. */
      wallpaper(o = {}) {
        const P = Object.assign({
          base: '#f7cfb2', star: '#ebb294', tile: [1.8, 1.6], size: 1024, bumpSize: 512, seed: 21,
          inks: ['#e8aa8c', '#eab4a2', '#ecbd93', '#e3a98f'],     // outer → inner: terracotta, rose, apricot, clay
          arcs: [{ x: 0.45, y: 0.15, r: 0.33, pitch: 0.055 }, { x: 1.35, y: 0.95, r: 0.29, pitch: 0.05 }],
          band: 0.016, leg: 0.06, soft: 0.0022, alpha: 0.85, stars: 11,
        }, o);
        const [TW, TH] = P.tile, TAU = Math.PI * 2, r = louRng(P.seed);
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const enc = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
        // the per-texel conversions go through tables (two pow calls a channel were most of the build time)
        const LIN = Float32Array.from({ length: 256 }, (_, b) => lin(b)), ENC = Uint8Array.from({ length: 4097 }, (_, k) => enc(k / 4096));
        const encF = v => ENC[v <= 0 ? 0 : v >= 1 ? 4096 : Math.round(v * 4096)];
        const rgb = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
        const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
        const wrapD = (d, T) => d - T * Math.round(d / T);   // the nearest copy of a periodic offset
        /* The paper's two fields are TABLES sampled with wrap, not evaluated per pixel: hashing and sines
           over a million texels made the tile cost ~360 ms to build under Node. A value-noise lattice
           (smoothstep between cells) for the fibre; the mottle is only 3 cycles a tile, so 128² holds it. */
        const table = (res, f) => { const L = new Float32Array(res * res); for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) L[j * res + i] = f(i, j); return L; };
        const sample = (L, res, u, v, smooth) => {
          const fx = u * res, fy = v * res, ix = Math.floor(fx), iy = Math.floor(fy); let tx = fx - ix, ty = fy - iy;
          if (smooth) { tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty); }
          const x0 = ((ix % res) + res) % res, x1 = (x0 + 1) % res, y0 = (((iy % res) + res) % res) * res, y1 = ((y0 / res + 1) % res) * res;
          return (L[y0 + x0] * (1 - tx) + L[y0 + x1] * tx) * (1 - ty) + (L[y1 + x0] * (1 - tx) + L[y1 + x1] * tx) * ty;
        };
        const fineL = table(384, (i, j) => hash(i + 131, j)), coarseL = table(96, (i, j) => hash(i + 262, j));
        const mottleL = table(128, (i, j) => { const u = i / 128, v = j / 128;   // integer frequencies only, so it wraps
          return 0.55 * Math.sin(TAU * (u + 2 * v) + 0.7) * Math.sin(TAU * (3 * u - v) + 2.1) + 0.45 * Math.sin(TAU * (2 * u + 3 * v) + 4.0) * Math.sin(TAU * (u - 2 * v) + 1.2); });
        const mottle = (u, v) => sample(mottleL, 128, u, v, false);
        const fibre = (u, v) => 0.6 * sample(fineL, 384, u, v, true) + 0.4 * sample(coarseL, 96, u, v, true) - 0.5;

        // stars: rejection-sampled against the rainbows' discs and each other (all distances wrapped)
        const stars = [];
        for (let tries = 0; stars.length < P.stars && tries < 4000; tries++) {
          const s = { x: r() * TW, y: r() * TH, R: 0.017 + r() * 0.015, a: r() * TAU };
          const clearArc = P.arcs.every(A => Math.hypot(wrapD(s.x - A.x, TW), wrapD(s.y - A.y, TH)) > A.r + 0.08 + s.R);
          if (clearArc && stars.every(t => Math.hypot(wrapD(s.x - t.x, TW), wrapD(s.y - t.y, TH)) > 0.24)) stars.push(s);
        }
        const K1 = [0.809016994375, -0.587785252292];
        const star = (px, py, R) => {   // Inigo Quilez's 5-point star SDF, point up
          px = Math.abs(px);
          let d = Math.max(K1[0] * px + K1[1] * py, 0); px -= 2 * d * K1[0]; py -= 2 * d * K1[1];
          d = Math.max(-K1[0] * px + K1[1] * py, 0); px += 2 * d * K1[0]; py -= 2 * d * K1[1];
          px = Math.abs(px); py -= R;
          const bx = 0.48 * -K1[1], by = 0.48 * K1[0] - 1, h = Math.min(R, Math.max(0, (px * bx + py * by) / (bx * bx + by * by)));
          return Math.hypot(px - bx * h, py - by * h) * Math.sign(py * bx - px * by);
        };

        // the ink layer, composited over per pixel: premultiplied linear colour + coverage
        const N = P.size, n = N * N, mx = TW / N, my = TH / N, ink = new Float32Array(n * 3), cov = new Float32Array(n);
        const over = (i, col, c) => { if (c <= 0) return; c *= P.alpha; const k = 1 - c; ink[i * 3] = ink[i * 3] * k + col[0] * c; ink[i * 3 + 1] = ink[i * 3 + 1] * k + col[1] * c; ink[i * 3 + 2] = ink[i * 3 + 2] * k + col[2] * c; cov[i] = cov[i] * k + c; };
        // visit every pixel whose wrapped position lies in a motif's box; x/y handed over in metres from its centre
        const stamp = (cx, cy, x0, x1, y0, y1, f) => {
          const px0 = Math.floor((cx + x0) / mx), px1 = Math.ceil((cx + x1) / mx), py0 = Math.floor((cy + y0) / my), py1 = Math.ceil((cy + y1) / my);
          for (let py = py0; py <= py1; py++) for (let px = px0; px <= px1; px++) {
            const ix = ((px % N) + N) % N, iy = ((py % N) + N) % N;
            f((N - 1 - iy) * N + ix, (px + 0.5) * mx - cx, (py + 0.5) * my - cy);   // canvas rows run DOWN, metres run up
          }
        };
        const inks = P.inks.map(rgb), starInk = rgb(P.star), half = P.band / 2;
        P.arcs.forEach(A => {
          const radii = P.inks.map((_, k) => A.r - k * A.pitch), reach = A.r + half + P.soft * 2;
          stamp(A.x, A.y, -reach, reach, -P.leg - 0.01, reach, (i, dx, dy) => {
            const onLeg = dy < 0, d = onLeg ? Math.abs(dx) : Math.hypot(dx, dy);
            const fade = onLeg ? 1 - ss(0, P.leg, -dy) : 1;
            if (fade <= 0) return;
            radii.forEach((rr, k) => over(i, inks[k], fade * (1 - ss(-P.soft, P.soft, Math.abs(d - rr) - half))));
          });
        });
        stars.forEach(s => {
          const ca = Math.cos(s.a), sa = Math.sin(s.a), e = s.R + 0.01;
          stamp(s.x, s.y, -e, e, -e, e, (i, dx, dy) => over(i, starInk, 1 - ss(-P.soft, P.soft, star(ca * dx + sa * dy, -sa * dx + ca * dy, s.R) - 0.003)));
        });

        // the paper, then the colour tile (sRGB) — the mean is reported so the harness can hold the wall's tone
        const B = rgb(P.base), c = makeCanvas(N, N), img = c.getContext('2d').createImageData(N, N), out = new Uint8ClampedArray(n * 4);
        let inkSum = 0; const acc = [0, 0, 0];
        for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
          const i = py * N + px, u = (px + 0.5) / N, v = 1 - (py + 0.5) / N;
          const shade = 1 + 0.028 * mottle(u, v) + 0.035 * fibre(u, v);
          for (let ch = 0; ch < 3; ch++) { const b = encF((B[ch] * (1 - cov[i]) + ink[i * 3 + ch]) * shade); out[i * 4 + ch] = b; acc[ch] += LIN[b]; }
          out[i * 4 + 3] = 255; inkSum += cov[i];
        }
        img.data.set(out); c.getContext('2d').putImageData(img, 0, 0);
        // the bump, at its own (coarser) resolution over the same tile: fibre, a softer mottle, the ink a touch proud
        const M = P.bumpSize, bc = makeCanvas(M, M), bimg = bc.getContext('2d').createImageData(M, M), bout = new Uint8ClampedArray(M * M * 4), step = N / M;
        for (let py = 0; py < M; py++) for (let px = 0; px < M; px++) {
          const u = (px + 0.5) / M, v = 1 - (py + 0.5) / M, ci = Math.floor(py * step) * N + Math.floor(px * step);
          const h = Math.round(255 * Math.min(1, Math.max(0, 0.5 + 0.55 * fibre(u, v) + 0.08 * mottle(u, v) + 0.18 * cov[ci])));
          const j = (py * M + px) * 4; bout[j] = bout[j + 1] = bout[j + 2] = h; bout[j + 3] = 255;
        }
        bimg.data.set(bout); bc.getContext('2d').putImageData(bimg, 0, 0);
        const t = wrap(c, 1 / TW, 1 / TH), bump = wrap(bc, 1 / TW, 1 / TH, true);
        t.userData = t.userData || {};   // r128's Texture has no userData
        t.userData.louTile = [TW, TH]; t.userData.louBump = bump; t.userData.louStars = stars.length;
        t.userData.louInk = inkSum / n;   // the share of the tile under ink
        t.userData.louMean = '#' + acc.map(a => enc(a / n).toString(16).padStart(2, '0')).join('');
        return t;
      },
      /* The CURTAINS' linen (room pass, round 8), a tile in METRES like the wallpaper. The curtain's
         UVs are metres of FLAT cloth (u across it before it was gathered, v up), so a fold never
         stretches the print. A pixel field, putImageData only:
         - a slubby plain weave: every weft row and warp column its own tone, and along each weft
           pair a SLUB now and then (a stretch of thicker, paler yarn) — what says linen, not cotton;
         - a scatter of small paw prints (a pad and four toes, each an ellipse), rejection-sampled
           clear of each other with wrapped distances, each at its own turn and size, printed INTO
           the weave (the cloth's shade runs over the ink too). */
      linen(o = {}) {
        const P = Object.assign({ base: '#efe3d0', paw: '#c29a86', tile: [0.42, 0.42], size: 512, seed: 8, paws: 14, gap: 0.085, alpha: 0.8, soft: 0.0007 }, o);
        const [TW, TH] = P.tile, r = louRng(P.seed), N = P.size, n = N * N, mx = TW / N, my = TH / N;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const enc = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
        const LIN = Float32Array.from({ length: 256 }, (_, b) => lin(b)), ENC = Uint8Array.from({ length: 4097 }, (_, k) => enc(k / 4096));
        const encF = v => ENC[v <= 0 ? 0 : v >= 1 ? 4096 : Math.round(v * 4096)];
        const rgb = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
        const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
        const wrapD = (d, T) => d - T * Math.round(d / T);
        // an ellipse's distance, near enough for a soft edge a fraction of a millimetre wide
        const ell = (x, y, cx, cy, a, b, t) => { const c = Math.cos(t), s = Math.sin(t), dx = x - cx, dy = y - cy, u = c * dx + s * dy, v = -s * dx + c * dy; return (Math.hypot(u / a, v / b) - 1) * Math.min(a, b); };
        // a paw, toes up, in metres about its centre: the pad, two outer toes splayed, two inner ones higher
        const PAW = [[0, -0.0045, 0.0086, 0.0068, 0], [-0.0102, 0.0042, 0.0030, 0.0039, 0.35], [0.0102, 0.0042, 0.0030, 0.0039, -0.35],
                     [-0.0039, 0.0089, 0.0031, 0.0041, 0.1], [0.0039, 0.0089, 0.0031, 0.0041, -0.1]];
        const paws = [];
        for (let tries = 0; paws.length < P.paws && tries < 4000; tries++) {
          const p = { x: r() * TW, y: r() * TH, a: (r() - 0.5) * 1.4, s: 0.85 + r() * 0.3 };
          if (paws.every(q => Math.hypot(wrapD(p.x - q.x, TW), wrapD(p.y - q.y, TH)) > P.gap)) paws.push(p);
        }
        const cov = new Float32Array(n);
        paws.forEach(p => {
          const e = 0.02 * p.s, ca = Math.cos(p.a), sa = Math.sin(p.a);
          for (let py = Math.floor((p.y - e) / my); py <= Math.ceil((p.y + e) / my); py++) for (let px = Math.floor((p.x - e) / mx); px <= Math.ceil((p.x + e) / mx); px++) {
            const dx = (px + 0.5) * mx - p.x, dy = (py + 0.5) * my - p.y, u = (ca * dx + sa * dy) / p.s, v = (-sa * dx + ca * dy) / p.s;
            let d = Infinity; PAW.forEach(k => { d = Math.min(d, ell(u, v, k[0], k[1], k[2], k[3], k[4])); });
            const c = 1 - ss(-P.soft, P.soft, d * p.s); if (c <= 0) continue;
            const i = (N - 1 - (((py % N) + N) % N)) * N + (((px % N) + N) % N);   // canvas rows run DOWN, metres run up
            cov[i] = Math.max(cov[i], c * P.alpha);
          }
        });
        // the weave: row and column tones, and a slub along each weft PAIR (a thread is ~1 px here)
        const SL = 16, cell = N / SL, B = rgb(P.base), INK = rgb(P.paw), acc = [0, 0, 0];
        const c = makeCanvas(N, N), img = c.getContext('2d').createImageData(N, N), out = new Uint8ClampedArray(n * 4);
        let inkSum = 0;
        for (let py = 0; py < N; py++) {
          const row = hash(py, 1) - 0.5, pair = py >> 1, shift = hash(pair, 9) * SL;
          for (let px = 0; px < N; px++) {
            const i = py * N + px, f = px / cell + shift, k = Math.floor(f), t = f - k, w = t * t * (3 - 2 * t);
            const noise = hash(pair, k % SL) * (1 - w) + hash(pair, (k + 1) % SL) * w;
            const slub = ss(0.78, 0.93, noise), col = hash(px, 2) - 0.5, check = ((px + py) & 1) - 0.5;
            const shade = 0.985 + 0.05 * row + 0.03 * col + 0.07 * slub + 0.02 * check;
            for (let ch = 0; ch < 3; ch++) { const b = encF((B[ch] * (1 - cov[i]) + INK[ch] * cov[i]) * shade); out[i * 4 + ch] = b; acc[ch] += LIN[b]; }
            out[i * 4 + 3] = 255; inkSum += cov[i];
          }
        }
        img.data.set(out); c.getContext('2d').putImageData(img, 0, 0);
        const t = wrap(c, 1 / TW, 1 / TH);
        t.userData = t.userData || {};   // r128's Texture has no userData
        t.userData.louTile = [TW, TH]; t.userData.louPaws = paws.length; t.userData.louInk = inkSum / n;
        t.userData.louMean = '#' + acc.map(a => enc(a / n).toString(16).padStart(2, '0')).join('');
        return t;
      },
      /* The GARDEN beyond the window (room pass, round 8b, revised 8c). Not a picture ON the glass: the
         glass looks this up by the DIRECTION of each view ray (louWindowView), so it stands at infinity.
         The perspective is right from any angle, and it slides past the frame as the camera drifts,
         where a decal at the presets' 45–61° reads as a sticker. x is the ray's azimuth off the wall's
         normal in radians (negative = toward the back wall), y the TANGENT of its elevation.
         The painted range is only what the presets can see, with the parallax and a margin (the
         harness holds it to LOU_PRESETS). Round 8b painted 2.2 rad of it, and each view got ~110
         texels across its glass: a blur however it was drawn. Beyond the range the clamp repeats the
         edge column, which is itself sky over hedge over lawn, so a stray camera sees plain bands.
         8c (owner): "fairly visible, not a complete blur; the sunlight glow should be what softens
         it." So real structure, drawn back to front, then a 1-texel softening, then the sun's glare,
         then bokeh: a sky with soft clouds; a hazy treeline; a near tree of leaf clumps (cellular
         noise, each clump lit on its sun side) with sky between them, branches and a lit trunk; a
         hazier mid tree; a hedge textured leaf by leaf with clipped, top-lit crowns; a flower border;
         a lawn with perspective mowing stripes and the hedge's shadow. The wide shot sees ~4° at
         −60° and only low elevations, so the trunk stands there; the portrait gets the sun at the
         tree's edge and the mid tree. A pixel field (putImageData only), mixed in linear light. */
      garden(o = {}) {
        const P = Object.assign({ w: 1024, h: 512, az: [-1.22, -0.52], el: [-0.32, 0.34], seed: 11, sun: [-0.95, 0.075], blur: 1 }, o);
        const W = P.w, H = P.h, r = louRng(P.seed), [A0, A1] = P.az, [E0, E1] = P.el, [SX, SY] = P.sun;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const enc = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
        const ENC = Uint8Array.from({ length: 4097 }, (_, k) => enc(k / 4096)), encF = v => ENC[v <= 0 ? 0 : v >= 1 ? 4096 : Math.round(v * 4096)];
        const rgb = h => [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
        const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const ss = (a, b, t) => { t = (t - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
        const hyp = (a, b) => Math.sqrt(a * a + b * b);   // Math.hypot is several times slower in V8
        const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
          const h00 = hash(i, j), h10 = hash(i + 1, j), h01 = hash(i, j + 1), h11 = hash(i + 1, j + 1);
          return h00 + (h10 - h00) * a + (h01 - h00) * b + (h00 - h10 - h01 + h11) * a * b; };
        /* Every per-pixel noise runs at a fixed frequency over this small range, so its lattice is hashed
           ONCE into a grid and a lookup is only the smoothstep blend (noise() per pixel was 90% of the build). */
        const field = (fx, fy, ox = 0, oy = 0) => {
          const i0 = Math.floor(A0 * fx + ox) - 1, j0 = Math.floor(E0 * fy + oy) - 1;
          const nx = Math.ceil(A1 * fx + ox) - i0 + 2, ny = Math.ceil(E1 * fy + oy) - j0 + 2, G = new Float32Array(nx * ny);
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) G[j * nx + i] = hash(i0 + i, j0 + j);
          return (x, y) => { x = x * fx + ox; y = y * fy + oy; const fi = Math.floor(x), fj = Math.floor(y), u = x - fi, v = y - fj, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
            const k = (fj - j0) * nx + (fi - i0), h00 = G[k], h10 = G[k + 1], h01 = G[k + nx], h11 = G[k + nx + 1];
            return h00 + (h10 - h00) * a + (h01 - h00) * b + (h00 - h10 - h01 + h11) * a * b; };
        };
        /* Cellular noise: jittered points hashed once over the range. at() returns the distance to the
           nearest point (in cells) and the offset from it, so a clump of leaves can be lit on the side
           that faces the sun, and its id, so each clump can differ. */
        const cells = (size, key) => {
          const i0 = Math.floor(A0 / size) - 2, j0 = Math.floor(E0 / size) - 2, nx = Math.ceil(A1 / size) - i0 + 3, ny = Math.ceil(E1 / size) - j0 + 3;
          const PX = new Float32Array(nx * ny), PY = new Float32Array(nx * ny);
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i;
            PX[k] = (i0 + i + 0.1 + 0.8 * hash(i0 + i + key * 7919, j0 + j)) * size; PY[k] = (j0 + j + 0.1 + 0.8 * hash(i0 + i, j0 + j + key * 104729)) * size; }
          const out = { d: 1, ox: 0, oy: 0, id: 0 };
          out.at = (x, y) => { const ci = Math.floor(x / size) - i0, cj = Math.floor(y / size) - j0; let best = Infinity, bk = 0;
            for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const k = (cj + dj) * nx + ci + di, ex = x - PX[k], ey = y - PY[k], d = ex * ex + ey * ey; if (d < best) { best = d; bk = k; } }
            out.d = Math.sqrt(best) / size; out.ox = (x - PX[bk]) / size; out.oy = (y - PY[bk]) / size; out.id = bk; return out; };
          return out;
        };
        const C = { lo: rgb('#fcdcb4'), mid: rgb('#f5e2cc'), hi: rgb('#7db6df'), sun: rgb('#fff5de'), cloud: rgb('#fdf8f1'), cloudSh: rgb('#e6d8d3'),
          far: rgb('#9db189'), leafD: rgb('#27472a'), leafM: rgb('#5a8440'), leafL: rgb('#c3d06a'), trunk: rgb('#4f3c30'), trunkL: rgb('#8e725a'),
          hedgeD: rgb('#2b4820'), hedgeM: rgb('#517833'), hedgeL: rgb('#a6c05e'), lawnF: rgb('#bfd576'), lawnN: rgb('#78a345'), bokeh: rgb('#fff1cf') };
        const FLOWERS = ['#f6b3c7', '#fff09a', '#ffffff', '#d9c3f2', '#f7a399', '#ffd08a'].map(rgb);
        const X = new Float32Array(W), Y = new Float32Array(H);
        for (let i = 0; i < W; i++) X[i] = A0 + (i + 0.5) / W * (A1 - A0);
        for (let j = 0; j < H; j++) Y[j] = E1 - (j + 0.5) / H * (E1 - E0);   // canvas rows run DOWN, elevation runs up
        const px = (x) => (x - A0) / (A1 - A0) * W, py = (y) => (E1 - y) / (E1 - E0) * H;
        const cols = (x0, x1) => [Math.max(0, Math.floor(px(x0))), Math.min(W - 1, Math.ceil(px(x1)))];
        const rows = (y0, y1) => [Math.max(0, Math.floor(py(y1))), Math.min(H - 1, Math.ceil(py(y0)))];
        const buf = new Float32Array(W * H * 3);
        const blend = (k, c, a) => { buf[k] += (c[0] - buf[k]) * a; buf[k + 1] += (c[1] - buf[k + 1]) * a; buf[k + 2] += (c[2] - buf[k + 2]) * a; };
        const T = [0, 0, 0], lerp = (p, q, t, o = T) => { o[0] = p[0] + (q[0] - p[0]) * t; o[1] = p[1] + (q[1] - p[1]) * t; o[2] = p[2] + (q[2] - p[2]) * t; return o; };
        const T2 = [0, 0, 0], ramp = (d, m, l, v) => (v < 0.5 ? lerp(d, m, Math.max(0, v) * 2, T2) : lerp(m, l, Math.min(1, (v - 0.5) * 2), T2));
        const nFar = field(40, 40), nHedge = field(40, 40), nLawn = field(420, 70), nLit = field(22, 22, 7, 0), nHole = field(60, 60, 3, 9);
        const leavesA = cells(0.012, 1), leavesB = cells(0.0072, 3), hedgeLeaves = cells(0.0055, 2), nDark = field(9, 9, 2, 4);
        const LEAF = { d: 1, ox: 0, oy: 0, id: 0 };
        const leaves = { at: (x, y) => { const a = leavesA.at(x, y), da = a.d, ax = a.ox, ay = a.oy, ai = a.id, b = leavesB.at(x, y);
          if (da * 0.012 < b.d * 0.0072 * 1.25) { LEAF.d = da; LEAF.ox = ax; LEAF.oy = ay; LEAF.id = ai; } else { LEAF.d = b.d; LEAF.ox = b.ox; LEAF.oy = b.oy; LEAF.id = b.id + 99991; }
          return LEAF; } };
        // the horizon lines depend on azimuth alone: one noise per column
        const FT = new Float32Array(W), FTONE = new Float32Array(W), HT = new Float32Array(W), LT = new Float32Array(W);
        const crowns = []; for (let x = A0 - 0.05; x < A1 + 0.05;) { const w = 0.012 + r() * 0.03; crowns.push([x + w, w, 0.006 + r() * 0.022 * Math.min(1, w / 0.02), r()]); x += w * (1.1 + r() * 0.9); }
        FT.fill(-1);
        crowns.forEach(([cx, w, h, tone]) => { const [i0, i1] = [Math.max(0, Math.floor((cx - w - A0) / (A1 - A0) * W)), Math.min(W - 1, Math.ceil((cx + w - A0) / (A1 - A0) * W))];
          for (let i = i0; i <= i1; i++) { const u = (X[i] - cx) / w, top = -0.06 + h * Math.sqrt(Math.max(0, 1 - u * u)); if (u * u < 1 && top > FT[i]) { FT[i] = top; FTONE[i] = tone; } } });
        for (let i = 0; i < W; i++) { const x = X[i];
          FT[i] = Math.max(FT[i], -0.06);
          HT[i] = -0.08 + 0.012 * Math.sqrt(Math.abs(Math.sin(x * 34 + 3 * noise(x * 6, 1.5)))) + 0.004 * (noise(x * 40, 3.5) - 0.5);   // the hedge: clipped crowns
          LT[i] = -0.134 + 0.002 * noise(x * 50, 8.5); }                                                                           // its foot on the lawn
        const LUTN = 1024, LUTD = 0.8, lut = (f) => Float32Array.from({ length: LUTN + 1 }, (_, k) => f(k / LUTN * LUTD));
        const GLOW = lut(d => Math.min(1, 0.95 * Math.exp(-((d / 0.035) ** 2)) + 0.4 * Math.exp(-((d / 0.15) ** 2))));
        const GLARE = lut(d => Math.min(1, 0.7 * Math.exp(-((d / 0.03) ** 2)) + 0.2 * Math.exp(-((d / 0.09) ** 2)) + 0.06 * Math.exp(-((d / 0.28) ** 2))));
        const at = (T, d) => T[d >= LUTD ? LUTN : Math.round(d / LUTD * LUTN)];
        const sdx = (x, y) => { const dx = SX - x, dy = SY - y, l = hyp(dx, dy) || 1; T[0] = dx / l; T[1] = dy / l; return T; };   // unit vector toward the sun
        // 1. the sky, the sun's own glow in it, and the far treeline
        for (let j = 0; j < H; j++) {
          const y = Y[j], t1 = ss(-0.07, 0.04, y), t2 = ss(-0.01, 0.3, y);
          for (let i = 0; i < W; i++) {
            const x = X[i], k = (j * W + i) * 3, ds = hyp(x - SX, y - SY);
            for (let c = 0; c < 3; c++) buf[k + c] = (C.lo[c] + (C.mid[c] - C.lo[c]) * t1) * (1 - t2) + C.hi[c] * t2;
            blend(k, C.sun, at(GLOW, ds));
            const fc = 1 - ss(FT[i] - 0.004, FT[i] + 0.004, y);
            if (fc > 0) { const v = 0.2 + 0.3 * nFar(x, y) + 0.3 * ss(FT[i] - 0.02, FT[i], y) + 0.25 * FTONE[i]; blend(k, lerp(lerp(C.far, C.lo, 0.35, T2).slice(), C.mid, 0.25 * (1 - v)), fc); }
          }
        }
        // 2. clouds: soft heaps, lighter on top, thinning toward the sun's glare
        [[-0.88, 0.27], [-0.72, 0.21], [-0.6, 0.29], [-1.12, 0.3], [-0.98, 0.33]].forEach(([cx, cy]) => {
          const blobs = []; for (let b = 0; b < 7; b++) blobs.push([cx + (r() - 0.5) * 0.12, cy + (r() - 0.3) * 0.03, 0.018 + r() * 0.03]);
          const [i0, i1] = cols(cx - 0.12, cx + 0.12), [j0, j1] = rows(cy - 0.06, cy + 0.07);
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const x = X[i], y = Y[j]; let F = Infinity;
            for (let b = 0; b < blobs.length; b++) { const q = blobs[b], d = hyp(x - q[0], (y - q[1]) * 1.5) / q[2]; if (d < F) F = d; }
            if (F > 1.2) continue;
            blend((j * W + i) * 3, lerp(C.cloudSh, C.cloud, ss(cy - 0.02, cy + 0.03, y)), 0.7 * (1 - ss(0.75, 1.15, F + 0.25 * (nHole(x, y) - 0.5))));
          }
        });
        /* 3. Trees, behind the hedge, over their own bounds. The canopy's SHAPE is a union of discs; its
           surface is leaf clumps (cellular), each lit on the side toward the sun and darker toward the
           canopy's core, with sky between some. Branches and trunk go down first, so they show only
           through the gaps and below the leaves. Near the sun the leaves turn translucent yellow-green. */
        const tree = (o) => {
          const m = Math.min(o.ax, o.ay), blobs = [];
          for (let b = 0; b < o.n; b++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.72, rad = m * (0.26 + 0.2 * r());
            const q = [o.cx + Math.cos(a) * d * (o.ax - rad * 0.6), o.cy + Math.sin(a) * d * (o.ay - rad * 0.6), rad]; q.push(1 / (rad * rad)); blobs.push(q); }
          o.x0 = o.cx - o.ax; o.x1 = o.cx + o.ax; o.y1 = o.cy + o.ay; o.r1 = m * 0.46;
          const limbs = o.limbs.map(([dx, dy]) => ({ ax: o.tx, ay: o.ty, vx: dx, vy: dy, l2: dx * dx + dy * dy, x0: o.tx + Math.min(0, dx) - 0.02, x1: o.tx + Math.max(0, dx) + 0.02, y0: o.ty + Math.min(0, dy) - 0.02, y1: o.ty + Math.max(0, dy) + 0.02 }));
          const [i0, i1] = cols(o.x0 - o.r1 * 1.2, o.x1 + o.r1 * 1.2), [j0, j1] = rows(-0.1, o.y1 + o.r1 * 1.2);
          const haze = (c) => lerp(c, C.mid, o.haze, T2);
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const x = X[i], y = Y[j], k = (j * W + i) * 3;
            if (y < HT[i] - 0.004) continue;   // behind the hedge's solid body: it is painted over
            // wood: the trunk (tapering, lit on its sun side) and the limbs
            const tw = o.tw * (1 - 0.35 * ss(-0.08, o.ty, y));
            if (y < o.ty) { const u = (x - o.tx - 0.02 * (y - o.ty)) / tw; if (Math.abs(u) < 1.2) blend(k, haze(lerp(C.trunk, C.trunkL, ss(-0.6, 1, u * Math.sign(SX - o.tx)))), 1 - ss(0.85, 1.2, Math.abs(u))); }
            for (let l = 0; l < limbs.length; l++) { const L = limbs[l]; if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) continue;
              const t = Math.max(0, Math.min(1, ((x - L.ax) * L.vx + (y - L.ay) * L.vy) / L.l2)), d = hyp(x - L.ax - L.vx * t, y - L.ay - L.vy * t), w = tw * (0.55 - 0.35 * t);
              if (d < w * 1.3) blend(k, haze(C.trunk), 1 - ss(w * 0.7, w * 1.3, d)); }
            let F = Infinity; for (let b = 0; b < blobs.length; b++) { const q = blobs[b], ex = x - q[0], ey = y - q[1], d = (ex * ex + ey * ey) * q[3]; if (d < F) F = d; }
            if (F > 1.8225) continue; F = Math.sqrt(F);
            const cl = leaves.at(x * o.scale, y * o.scale), cov = (1 - ss(0.9, 1.0, F + 0.3 * (cl.d - 0.5))) * (1 - 0.95 * ss(0.62, 0.8, cl.d) * ss(0.55, 0.72, nHole(x, y)) * ss(0.3, 0.7, F));
            if (cov <= 0) continue;
            const u = sdx(x, y), lit = ss(0.28, 0.02, hyp(x - SX, y - SY)), clump = 1 - 0.7 * cl.d * cl.d;
            const hl = Math.max(0, (cl.ox * u[0] + cl.oy * u[1]) / (cl.d || 1)) * cl.d;
            const v = 0.02 + 0.36 * clump + 0.26 * hl + 0.2 * nLit(x, y) + 0.12 * ss(0, 0.3, y) - 0.25 * ss(0.85, 0.2, F) - 0.3 * ss(0.45, 0.75, nDark(x, y)) + 0.2 * (hash(cl.id, 5) - 0.5);
            const leaf = ramp(C.leafD, C.leafM, C.leafL, v).slice();
            blend(k, haze(lerp(leaf, C.leafL, 0.45 * lit * (0.3 + 0.7 * clump) * hl * 2, leaf)), cov);
          }
        };
        tree({ cx: -0.575, cy: -0.028, ax: 0.03, ay: 0.034, n: 12, tx: -0.574, ty: -0.05, tw: 0.003, limbs: [], haze: 0.3, scale: 1.6 });
        tree({ cx: -0.668, cy: 0.004, ax: 0.056, ay: 0.062, n: 18, tx: -0.665, ty: -0.03, tw: 0.0045, limbs: [[-0.022, 0.035], [0.02, 0.045]], haze: 0.14, scale: 1.4 });
        tree({ cx: -1.075, cy: 0.12, ax: 0.165, ay: 0.175, n: 30, tx: -1.05, ty: 0.03, tw: 0.012,
          limbs: [[-0.07, 0.12], [0.06, 0.1], [0.02, 0.19], [-0.03, 0.07], [0.09, 0.05]], haze: 0, scale: 1 });
        /* 4. The hedge and the lawn, in front of the trees. The hedge: clipped crowns lit from the top,
           darkening to its foot, textured leaf by leaf (a smaller cellular field), a bright rim on the
           crowns nearest the sun. The lawn: nearer is greener and darker, with mowing stripes that run
           away from the eye (lateral distance = azimuth over the tangent of the drop), grass in fine
           upright streaks, and the hedge's shadow thrown toward us, since the sun is behind it. */
        { const [j0] = rows(0, 0.0);
          for (let j = j0; j < H; j++) { const y = Y[j];
            for (let i = 0; i < W; i++) {
              const x = X[i], k = (j * W + i) * 3, hc = 1 - ss(HT[i] - 0.0025, HT[i] + 0.0025, y), lc = 1 - ss(LT[i] - 0.002, LT[i] + 0.002, y);
              if (hc > 0 && lc < 1) {
                const cl = hedgeLeaves.at(x, y), u = sdx(x, y), top = ss(LT[i], HT[i], y);
                const hl = Math.max(0, (cl.ox * u[0] + cl.oy * u[1]) / (cl.d || 1)) * cl.d;
                const v = 0.08 + 0.42 * top * top + 0.3 * (1 - cl.d * cl.d) * (0.4 + 0.6 * top) + 0.2 * hl + 0.18 * nHedge(x, y)
                  + 0.35 * ss(HT[i] - 0.006, HT[i], y) * ss(0.3, 0.0, Math.abs(x - SX));
                blend(k, ramp(C.hedgeD, C.hedgeM, C.hedgeL, v), hc);
              }
              if (lc > 0) {
                const far = ss(E0, LT[i], y), drop = Math.max(0.01, -y), lat = (x + 0.8) * 1.3 / drop;
                const stripe = 0.5 + 0.5 * Math.sin(lat * Math.PI * 2 / 0.9), shade = ss(LT[i] - 0.03, LT[i] - 0.002, y);
                const g = lerp(C.lawnN, C.lawnF, far);
                const m = (0.88 + 0.2 * stripe * (1 - 0.5 * far)) * (0.95 + 0.1 * nLawn(x, y)) * (1 - 0.32 * shade) * (1 + 0.12 * far * ss(0.35, 0, Math.abs(x - SX)));
                blend(k, [g[0] * m, g[1] * m, g[2] * m], lc);
              }
            }
          }
        }
        // 5. the flower border along the hedge's foot: small soft dots in the room's own soft colours
        const dot = (bx, by, q, c, s) => { const [i0, i1] = cols(bx - q * 1.5, bx + q * 1.5), [j0, j1] = rows(by - q * 1.5, by + q * 1.5);
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const a = s * (1 - ss(q * 0.6, q * 1.2, hyp(X[i] - bx, (Y[j] - by) * 1.4))); if (a > 0) blend((j * W + i) * 3, c, a); } };
        { const [j0, j1] = rows(-0.16, -0.12);
          for (let j = j0; j <= j1; j++) for (let i = 0; i < W; i++) { const x = X[i], y = Y[j], top = LT[i] + 0.004 + 0.004 * noise(x * 120, 1.5);
            const a = (1 - ss(top - 0.002, top + 0.002, y)) * ss(LT[i] - 0.017, LT[i] - 0.013, y); if (a <= 0) continue;
            const cl = hedgeLeaves.at(x, y); blend((j * W + i) * 3, ramp(C.hedgeD, C.hedgeM, C.hedgeL, 0.2 + 0.45 * (1 - cl.d * cl.d) + 0.2 * ss(top - 0.012, top, y)), a); } }
        for (let f = 0; f < 40; f++) { const cx = A0 + r() * (A1 - A0), base = LT[Math.min(W - 1, Math.round(px(cx)))], col = FLOWERS[Math.floor(r() * FLOWERS.length)];
          for (let n = 0; n < 5 + r() * 6; n++) dot(cx + (r() - 0.5) * 0.03, base - 0.01 + r() * 0.014, 0.0018 + r() * 0.0016, col, 0.9); }
        /* 6. A 1-texel softening (a [1 2 1] tap each way): the garden is a little past the focus, not
           a blur. The sun's glare below does the real softening, as in the owner's renders. */
        { const R = P.blur, line = new Float32Array(Math.max(W, H) * 3);
          const box = (start, step, n) => {   // a [1 2 1] tap, R times
            for (let pass = 0; pass < R; pass++) {
              for (let m = 0; m < n; m++) { const k = start + m * step; line[m * 3] = buf[k]; line[m * 3 + 1] = buf[k + 1]; line[m * 3 + 2] = buf[k + 2]; }
              for (let m = 0; m < n; m++) { const a = (m > 0 ? m - 1 : 0) * 3, b = m * 3, c = (m < n - 1 ? m + 1 : m) * 3, k = start + m * step;
                buf[k] = (line[a] + 2 * line[b] + line[c]) * 0.25; buf[k + 1] = (line[a + 1] + 2 * line[b + 1] + line[c + 1]) * 0.25; buf[k + 2] = (line[a + 2] + 2 * line[b + 2] + line[c + 2]) * 0.25; }
            }
          };
          if (R > 0) { for (let j = 0; j < H; j++) box(j * W * 3, 3, W); for (let i = 0; i < W; i++) box(i * 3, W * 3, H); }
        }
        // 7. the sun's glare over everything: it washes out the leaves round it, as a real low sun does
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const a = at(GLARE, hyp(X[i] - SX, Y[j] - SY)); if (a > 0.002) blend((j * W + i) * 3, C.sun, a);
        }
        // 8. bokeh, stamped last: a screen-blended disc with a brighter rim, thickest in the leaves round the sun
        const disc = (bx, by, q, s) => { const [i0, i1] = cols(bx - q - 0.004, bx + q + 0.004), [j0, j1] = rows(by - q - 0.004, by + q + 0.004);
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
            const d = hyp(X[i] - bx, Y[j] - by), a = s * (1 - ss(q - 0.002, q + 0.0015, d)) * (0.65 + 0.35 * ss(q * 0.4, q, d)); if (a <= 0) continue;
            const k = (j * W + i) * 3; for (let c = 0; c < 3; c++) buf[k + c] += (1 - buf[k + c]) * a * C.bokeh[c];
          } };
        for (let b = 0; b < 18; b++) { const a = r() * Math.PI * 2, d = 0.03 + 0.15 * Math.sqrt(r()); disc(SX - 0.04 + Math.cos(a) * d * 1.3, SY + 0.05 + Math.sin(a) * d, 0.005 + r() * 0.009, 0.12 + 0.28 * r()); }
        for (let b = 0; b < 7; b++) { const x = A0 + 0.05 + r() * (A1 - A0 - 0.1); disc(x, HT[Math.round(px(x))] - 0.004 + r() * 0.008, 0.004 + r() * 0.005, 0.1 + 0.2 * r()); }
        const c = makeCanvas(W, H), img = c.getContext('2d').createImageData(W, H), out = new Uint8ClampedArray(W * H * 4), acc = [0, 0, 0];
        for (let n = 0; n < W * H; n++) { for (let ch = 0; ch < 3; ch++) { const v = buf[n * 3 + ch]; out[n * 4 + ch] = encF(v); acc[ch] += v; } out[n * 4 + 3] = 255; }
        img.data.set(out); c.getContext('2d').putImageData(img, 0, 0);   // one set, as tex.linen: never a write per byte into the ImageData
        const t = flat(c);
        t.userData = t.userData || {};
        t.userData.louView = [A0, A1, E0, E1]; t.userData.louSun = [SX, SY];
        t.userData.louMean = '#' + acc.map(a => enc(a / (W * H)).toString(16).padStart(2, '0')).join('');
        return t;
      },
      /* The couch's throw CUSHIONS (room pass, round 7): ONE atlas, so the four cushions draw as one
         mesh. 2×2 cells, cell k at column k % 2, row k / 2 (v up). Each cell's design fills its
         inner 1 − 2m; the margin is the cushion's piping/button colour, which the piping's UVs
         point into. A pixel field (putImageData only), like tex.grain, so it runs under the
         harness's no-readback canvas. Colours are sRGB and mixed there — this is cloth, not a
         tone the grade was tuned on.
           0 star   — plum velvet, a gold star, scattered small stars, a running stitch
           1 round  — dusty-rose linen (the tufted round one; its pleats are geometry)
           2 sprig  — cream with a ditsy print: sage sprigs and small terracotta flowers
           3 stripe — the lumbar: ochre and cream ticking with a terracotta pinstripe */
      cushions(size = 1024, seed = 11) {
        const N = size, C = N / 2, M = 0.035, TAU = Math.PI * 2, r = louRng(seed);
        const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
        const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        const K1 = [0.809016994375, -0.587785252292];
        const star = (px, py, R) => {   // the wallpaper's 5-point star SDF, point up
          px = Math.abs(px);
          let d = Math.max(K1[0] * px + K1[1] * py, 0); px -= 2 * d * K1[0]; py -= 2 * d * K1[1];
          d = Math.max(-K1[0] * px + K1[1] * py, 0); px += 2 * d * K1[0]; py -= 2 * d * K1[1];
          px = Math.abs(px); py -= R;
          const bx = 0.48 * -K1[1], by = 0.48 * K1[0] - 1, h = Math.min(R, Math.max(0, (px * bx + py * by) / (bx * bx + by * by)));
          return Math.hypot(px - bx * h, py - by * h) * Math.sign(py * bx - px * by);
        };
        // value noise, cell-local (each cell's own field; the atlas never tiles)
        const vnoise = (u, v, f, s) => {
          const x = u * f, y = v * f, ix = Math.floor(x), iy = Math.floor(y); let tx = x - ix, ty = y - iy;
          tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          const h = (i, j) => hash(i + s * 977, j + s * 131);
          return (h(ix, iy) * (1 - tx) + h(ix + 1, iy) * tx) * (1 - ty) + (h(ix, iy + 1) * (1 - tx) + h(ix + 1, iy + 1) * tx) * ty;
        };
        const PAL = {
          // a dusty mauve, a step off the couch's own, not a plum against it (owner: it stood out too much)
          plum: rgb('#8a6474'), plumPipe: rgb('#6c4d5a'), gold: rgb('#d2b27a'), goldDeep: rgb('#a88c5c'),
          rose: rgb('#c99590'), rosePipe: rgb('#a8746f'),
          cream: rgb('#ecdcc4'), sage: rgb('#8e9b74'), terra: rgb('#c4826a'), ochreDot: rgb('#d8b066'),
          ochre: rgb('#bf9656'), ticking: rgb('#eadcc4'),
        };
        /* Tone-on-tone piping, a shade under each face: a contrasting cord round a thin edge is exactly
           what made the first build read as card. */
        const PIPE = [PAL.plumPipe, PAL.rosePipe, rgb('#cdb993'), rgb('#a88245')];
        // a plain weave, one thread over, one under, ~0.6 mm threads — cotton and linen; velvet has pile, not weave
        const WEAVE = [0, 0.06, 0.05, 0.05], TAU2 = Math.PI * 2 * 88;
        const weave = (u, v, k) => 1 + k * Math.sin(TAU2 * u) * Math.sin(TAU2 * v) + k * 0.5 * Math.sin(TAU2 * 0.5 * u + 1.3);
        // cell 0: the small stars, rejection-sampled clear of the big one and each other
        const smalls = [];
        for (let t = 0; smalls.length < 11 && t < 3000; t++) {
          const s = { x: 0.08 + r() * 0.84, y: 0.08 + r() * 0.84, R: 0.022 + r() * 0.018, a: (r() - 0.5) * 1.2 };
          if (Math.hypot(s.x - 0.5, s.y - 0.5) > 0.36 && smalls.every(q => Math.hypot(q.x - s.x, q.y - s.y) > 0.16)) smalls.push(s);
        }
        const bigA = 0.12;   // the big star sits a little turned, as a hand-appliquéd one does
        const design = [
          (u, v) => {   // star
            const nap = 1 + 0.07 * (vnoise(u, v, 5, 1) - 0.5) + 0.05 * (vnoise(u, v, 90, 2) - 0.5);
            let c = PAL.plum.map(x => x * nap);
            const ca = Math.cos(bigA), sa = Math.sin(bigA), dx = u - 0.5, dy = v - 0.49;
            const d = star(ca * dx + sa * dy, -sa * dx + ca * dy, 0.27);
            const g = mix(PAL.gold, PAL.goldDeep, ss(-0.02, 0.0, d) * 0.9);   // the appliqué's turned edge darkens
            c = mix(c, g, 1 - ss(-0.002, 0.003, d));
            if (d < 0 && d > -0.03) {   // a stitch line just inside the appliqué's edge
              const along = Math.atan2(dy, dx) * 26; c = mix(c, PAL.goldDeep, (1 - ss(0.004, 0.008, Math.abs(d + 0.016))) * (Math.sin(along * 3) > 0 ? 0.55 : 0));
            }
            smalls.forEach(s => {
              const cs = Math.cos(s.a), sn = Math.sin(s.a), ex = u - s.x, ey = v - s.y;
              if (Math.abs(ex) > s.R * 1.3 || Math.abs(ey) > s.R * 1.3) return;
              c = mix(c, PAL.gold, 0.9 * (1 - ss(-0.002, 0.003, star(cs * ex + sn * ey, -sn * ex + cs * ey, s.R))));
            });
            // a running stitch round the face, 5 % in
            const e = Math.min(u, v, 1 - u, 1 - v), run = (u + v) * 60;
            if (Math.abs(e - 0.05) < 0.004 && Math.sin(run * 2) > 0.2) c = mix(c, PAL.gold, 0.45);
            return c;
          },
          (u, v) => {   // round: linen with a slub
            const warp = vnoise(u * 0.2, v * 7, 20, 3), weft = vnoise(u * 7, v * 0.2, 20, 4);
            const k = 1 + 0.06 * (warp - 0.5) + 0.06 * (weft - 0.5) + 0.05 * (vnoise(u, v, 4, 5) - 0.5);
            return PAL.rose.map(x => x * k);
          },
          (u, v) => {   // sprig: a half-drop ditsy print
            const k = 1 + 0.04 * (vnoise(u, v, 70, 6) - 0.5) + 0.03 * (vnoise(u, v, 4, 7) - 0.5);
            let c = PAL.cream.map(x => x * k);
            const P = 1 / 7;   // motif pitch
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
              const gy = Math.floor(v / P) + oy, gx = Math.floor(u / P - (gy & 1) * 0.5) + ox;
              const cx = (gx + 0.5 + (gy & 1) * 0.5) * P, cy = (gy + 0.5) * P, h1 = hash(gx + 40, gy + 40), h2 = hash(gx + 80, gy + 11);
              const a = h1 * TAU, ca = Math.cos(a), sa = Math.sin(a), lx = ca * (u - cx) + sa * (v - cy), ly = -sa * (u - cx) + ca * (v - cy);
              if (Math.abs(lx) > P * 0.6 || Math.abs(ly) > P * 0.6) continue;
              if ((gx + gy * 3) % 2 === 0) {   // a sprig: a stem and two leaves
                const stem = Math.abs(lx) < 0.0035 && Math.abs(ly) < P * 0.3;
                const leaf = (ox2, oy2, ang) => { const q = Math.cos(ang), w = Math.sin(ang), qx = q * (lx - ox2) + w * (ly - oy2), qy = -w * (lx - ox2) + q * (ly - oy2);
                  return (qx / (P * 0.2)) ** 2 + (qy / (P * 0.08)) ** 2; };
                const l = Math.min(leaf(P * 0.1, P * 0.05, 0.6), leaf(-P * 0.1, -P * 0.07, -0.5 + Math.PI), leaf(P * 0.02, P * 0.24, 1.4));
                if (stem) c = mix(c, PAL.sage, 0.85);
                c = mix(c, PAL.sage.map(x => x * (0.9 + 0.2 * h2)), 1 - ss(0.75, 1.05, l));
              } else {   // a small five-petal flower with an ochre heart
                const rr = Math.hypot(lx, ly), th = Math.atan2(ly, lx), petal = P * (0.13 + 0.07 * Math.abs(Math.cos(2.5 * th)));
                c = mix(c, PAL.terra.map(x => x * (0.94 + 0.12 * h2)), 1 - ss(petal - 0.004, petal + 0.002, rr));
                c = mix(c, PAL.ochreDot, 1 - ss(P * 0.04, P * 0.06, rr));
              }
            }
            return c;
          },
          (u, v) => {   // stripe: ticking across the lumbar
            const k = 1 + 0.07 * (vnoise(u * 8, v * 0.3, 16, 8) - 0.5) + 0.04 * (vnoise(u, v, 80, 9) - 0.5);
            const f = ((v * 5) % 1 + 1) % 1;   // five repeats across the face
            let c = PAL.ochre;
            c = mix(c, PAL.ticking, ss(0.54, 0.56, f) * (1 - ss(0.84, 0.86, f)));
            c = mix(c, PAL.terra, ss(0.925, 0.935, f) * (1 - ss(0.955, 0.965, f)));
            return c.map(x => x * k);
          },
        ];
        const c = makeCanvas(N, N), img = c.getContext('2d').createImageData(N, N), out = new Uint8ClampedArray(N * N * 4);
        for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
          const u = (px + 0.5) / N, v = 1 - (py + 0.5) / N, col = u < 0.5 ? 0 : 1, row = v < 0.5 ? 0 : 1, k = row * 2 + col;
          const cu = (u * 2 - col - M) / (1 - 2 * M), cv = (v * 2 - row - M) / (1 - 2 * M);
          const inside = cu >= 0 && cu <= 1 && cv >= 0 && cv <= 1;
          const rgbv = inside ? design[k](cu, cv).map(x => x * weave(cu, cv, WEAVE[k])) : PIPE[k].map(x => x * (1 + 0.06 * (vnoise(u, v, 200, 10) - 0.5)));
          const j = (py * N + px) * 4; out[j] = rgbv[0]; out[j + 1] = rgbv[1]; out[j + 2] = rgbv[2]; out[j + 3] = 255;
        }
        img.data.set(out); c.getContext('2d').putImageData(img, 0, 0);
        const t = flat(c); t.userData = t.userData || {};   // r128's Texture has no userData
        t.userData.louCells = 4; t.userData.louMargin = M; t.userData.louSmallStars = smalls.length;
        return t;
      },
      weave(rx = 12, ry = 9) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#9a9a9a';
        for (let i = 0; i < 128; i += 8) { x.fillRect(i, 0, 3, 128); x.fillRect(0, i, 128, 3); }
        return wrap(c, rx, ry, true);
      },
      /* Bouclé as HEIGHT: a tileable field of looped curls, each a lit dome with a darker twist
         inside it, piled over each other so they clump the way the yarn does. The room pass (round
         2) replaced a 128 px speckle whose dots were a few mm and read as sand; these loops are
         ~1 cm across at the tile scale louBoucle samples them at (LOU_BOUCLE_TILE). No repeat is
         set here — the fabric shader samples it triplanar in object space, not through UVs. */
      boucle(size = 256, seed = 3) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), r = louRng(seed), s = size / 256;
        x.fillStyle = '#2e2e2e'; x.fillRect(0, 0, size, size);
        const loop = (cx, cy, rr, a0, sweep) => {
          const g = x.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, rr * 0.1, cx, cy, rr);
          g.addColorStop(0, 'rgba(236,236,236,1)'); g.addColorStop(0.65, 'rgba(150,150,150,1)'); g.addColorStop(1, 'rgba(60,60,60,0)');
          x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill();
          x.strokeStyle = 'rgba(70,70,70,0.6)'; x.lineWidth = rr * 0.24; x.lineCap = 'round';
          x.beginPath(); x.arc(cx + rr * 0.08, cy + rr * 0.06, rr * 0.42, a0, a0 + sweep); x.stroke();
        };
        for (let i = 0; i < 560; i++) {
          const cx = r() * size, cy = r() * size, rr = (6.5 + r() * 5) * s, a0 = r() * 7, sweep = 3.6 + r() * 1.8;
          // drawn at every wrapped copy that touches the tile, so the edges meet
          for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            const px = cx + ox * size, py = cy + oy * size;
            if (px + rr < 0 || px - rr > size || py + rr < 0 || py - rr > size) continue;
            loop(px, py, rr, a0, sweep);
          }
        }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.LinearEncoding;
        return t;
      },
      /* The round BRAIDED rug (room pass, item 11), to the mockup: many thin ropes in bands of
         colour, not a two-tone bullseye. A pixel field (putImageData only, so it runs under the
         harness's no-readback canvas). A cylinder cap's UVs are planar, so the centre lands under
         the table. Each ring is a flat three-strand braid seen from above: two columns of slanted
         lumps leaning opposite ways (the chevron), each lump one strand, the strands cycling so a
         ring mixes its band's colour with an accent the way a tweed rope does. The same height
         field is the bump (userData.louBump, half size).
         `bands` run from the OUTSIDE in: [dominant, accent, rings]. `mean` holds the disc's tone:
         the room grade (DD-26) was tuned on the old two-tone rug, whose disc mean was ~#966b4c, so
         the whole field is gained per channel (in linear light) to land on it — the palette sets
         the hues, the mean is kept. */
      braid(o = {}) {
        const P = Object.assign({
          size: 1024, rings: 34, pitch: 0.9, seed: 7, mean: '#966b4c',
          soft: 0.6, relief: 0.32,   // band contrast pulled 60% toward the mean; lump shade 0.68–1.0 (was 0.55–1.0)
          // muted, and no purple: lilac belongs to the player's props, the rug is room furniture
          bands: [['#8a5238', '#7c5a42', 2], ['#b98d4e', '#a8764a', 2], ['#c9b28e', '#b98d4e', 1], ['#9a5a3c', '#8a5238', 2],
                  ['#7c5a42', '#8a5238', 1], ['#ad6a4a', '#b98d4e', 2], ['#b98d4e', '#c9b28e', 1], ['#8e6152', '#7c5a42', 2],
                  ['#c9b28e', '#ad6a4a', 1], ['#9a5a3c', '#b98d4e', 2]],
        }, o);
        const key = JSON.stringify(P); braidCache[key] = braidCache[key] || buildBraid(P); return braidCache[key];
      },
      braidBump(o = {}) { return this.braid(o).userData.louBump; },
      /* Matte injection-moulded plastic: a fine speckle and nothing else. This is
         the prop half of the gap between the lounge and the finished controller
         (plan 2026-09-22 § 1) — same roughness/metalness, the whole difference
         was `bumpMap`. Linear, because a bump map is data and not colour.
         NOTE the repeat: ExtrudeGeometry's default UVs are raw x/y in METRES, so
         `rx` here reads as "tiles per metre", not tiles per face. */
      plasticBump(rx = 25, ry = 25, seed = 11) {
        const c = makeCanvas(256, 256), x = c.getContext('2d'), r = louRng(seed);
        x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 4200; i++) {
          const g = 128 + Math.round((r() - 0.5) * 66);
          x.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
          x.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6);
        }
        return wrap(c, rx, ry, true);
      },
      /* A tiled MOTIF — hearts, stars and plus signs, grey on grey. Same job as
         plasticBump (relief with no colour of its own) but a shape you can name:
         the dial's skirt band, where the mockup has a stamped pattern rather
         than a speckle. Drawn TWICE from one jittered lattice, a dark pass
         offset down-right under a light one, so each motif carries its own
         shadow instead of reading as a flat stencil. Linear — a bump map is
         data, not colour. */
      motifBump(rx = 8, ry = 1, seed = 5) {
        const c = makeCanvas(256, 256), x = c.getContext('2d'), r = louRng(seed);
        x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
        const heart = (cx, cy, s) => { x.beginPath(); x.moveTo(cx, cy + s * 0.8);
          x.bezierCurveTo(cx - s * 1.5, cy - s * 0.3, cx - s * 0.5, cy - s * 1.15, cx, cy - s * 0.3);
          x.bezierCurveTo(cx + s * 0.5, cy - s * 1.15, cx + s * 1.5, cy - s * 0.3, cx, cy + s * 0.8);
          x.closePath(); x.fill(); };
        const star = (cx, cy, s) => { x.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.46 : s;
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
          x.closePath(); x.fill(); };
        const plus = (cx, cy, s) => { x.fillRect(cx - s * 0.3, cy - s, s * 0.6, s * 2); x.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6); };
        const draw = [heart, star, plus];
        /* The lattice is generated ONCE, then both passes read it. Drawing each
           pass from a fresh rng() run would put the shadow somewhere else
           entirely — the two passes have to be the same shapes. */
        const cells = [];
        for (let i = 0; i < 16; i++)
          cells.push([(i % 4) * 64 + 32 + (r() - .5) * 18, ((i / 4) | 0) * 64 + 32 + (r() - .5) * 18, 8 + r() * 4, i % 3]);
        [['#5c5c5c', 1.6], ['#aaaaaa', 0]].forEach(([g, d]) => {
          x.fillStyle = g; cells.forEach(cell => draw[cell[3]](cell[0] + d, cell[1] + d, cell[2]));
        });
        return wrap(c, rx, ry, true);
      },
      /* Embossed lettering: the text as RELIEF, in whatever colour the material
         already is. The dial's centre star carries its wordmark this way — a
         colour map there would fight the `buttons` role, where a bump map leaves
         the role in charge and lets the light do the reading. Width is ESTIMATED
         from the character count, exactly as label() does and for the same
         reason: measureText reads back from the context, which the Node harness
         deliberately does not support. */
      textBump(lines, w = 256, h = 256, pct = 0.76) {
        const c = makeCanvas(w, h), x = c.getContext('2d');
        x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
        const rows = (Array.isArray(lines) ? lines : [lines]).map(s => String(s === undefined || s === null ? '' : s));
        const longest = rows.reduce((a, s) => Math.max(a, s.length), 1);
        const size = Math.max(6, Math.min((h * pct) / (rows.length * 1.15), (w * pct) / (longest * 0.55)));
        x.font = 'bold ' + Math.round(size) + 'px Fredoka, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        const step = size * 1.06, y0 = h / 2 - step * (rows.length - 1) / 2;
        [['#4c4c4c', Math.max(1, size * 0.06)], ['#c6c6c6', 0]].forEach(([g, d]) => {
          x.fillStyle = g; rows.forEach((s, i) => x.fillText(s, w / 2 + d, y0 + i * step + d));
        });
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; return t;
      },
      /* A looping ribbon through a list of hexes — the dial's neon strip, which
         the owner wants the games' own brand colours to fill out. The first hex
         is repeated at u = 1 so a band wrapped right round closes with no seam.
         Used as BOTH map and emissiveMap, with a white `emissive`, which is what
         makes the strip glow in its own colours rather than in one tint. */
      spectrum(hexes, w = 512, h = 8, rx = 1) {
        const list = (hexes && hexes.length) ? hexes : ['#ffffff'];
        const c = makeCanvas(w, h), x = c.getContext('2d');
        const grad = x.createLinearGradient(0, 0, w, 0);
        for (let i = 0; i <= list.length; i++) grad.addColorStop(i / list.length, list[i % list.length]);
        x.fillStyle = grad; x.fillRect(0, 0, w, h);
        return wrap(c, rx, 1);
      },
      /* A 7" single's face as RELIEF: fine concentric grooves with two quiet
         bands between tracks, and the flat run-out round the label. Drawn
         centred on the canvas because a CylinderGeometry cap's UVs are planar,
         (0.5, 0.5) at the axis — the same reason braid() is. */
      grooveBump(size = 256, labelFrac = 0.34) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, R = size / 2;
        x.fillStyle = '#808080'; x.fillRect(0, 0, size, size);
        const r0 = R * (labelFrac + 0.06), r1 = R * 0.97;
        for (let r = r0; r < r1; r += 1.6) {
          const band = (r - r0) / (r1 - r0), gap = Math.abs(band - 0.36) < 0.015 || Math.abs(band - 0.70) < 0.015;
          x.strokeStyle = gap ? '#8a8a8a' : ((r | 0) % 2 ? '#9c9c9c' : '#666666'); x.lineWidth = 0.9;
          x.beginPath(); x.arc(cx, cx, r, 0, Math.PI * 2); x.stroke();
        }
        x.strokeStyle = '#b8b8b8'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cx, r1, 0, Math.PI * 2); x.stroke();   // the lip
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; return t;
      },
      /* The label's relief: a printed rim, two lines of "text" and the spindle
         hole. Shared by every record — the COLOUR is each record's own material,
         so twenty labels cost one canvas. */
      labelBump(size = 128) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2;
        x.fillStyle = '#808080'; x.fillRect(0, 0, size, size);
        x.strokeStyle = '#a4a4a4'; x.lineWidth = size * 0.035; x.beginPath(); x.arc(cx, cx, size * 0.44, 0, Math.PI * 2); x.stroke();
        x.fillStyle = '#9c9c9c';
        x.fillRect(cx - size * 0.24, cx - size * 0.24, size * 0.48, size * 0.05);
        x.fillRect(cx - size * 0.16, cx + size * 0.17, size * 0.32, size * 0.045);
        x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(cx, cx, size * 0.06, 0, Math.PI * 2); x.fill();
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; return t;
      },
      /* A transport button's face: flat pastel with its glyph in a darker ink.
         Glyphs are drawn as PATHS, never as font characters — ⏯ and friends are
         missing or emoji-rendered on half the devices this runs on. */
      icon(kind, bg, ink, size = 128) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), s = size / 128;
        x.fillStyle = bg; x.fillRect(0, 0, size, size); x.fillStyle = ink;
        const tri = (x0, dir) => { x.beginPath(); x.moveTo(x0 * s, 42 * s); x.lineTo((x0 + dir * 30) * s, 64 * s); x.lineTo(x0 * s, 86 * s); x.closePath(); x.fill(); };
        const bar = (x0, w = 9) => x.fillRect(x0 * s, 42 * s, w * s, 44 * s);
        if (kind === 'playpause') { tri(34, 1); bar(72, 8); bar(86, 8); }
        else if (kind === 'prev') { bar(38); tri(80, -1); }
        else if (kind === 'next') { tri(48, 1); bar(81); }
        else if (kind === 'down') { x.fillRect(38 * s, 58 * s, 52 * s, 12 * s); }
        else if (kind === 'up') { x.fillRect(38 * s, 58 * s, 52 * s, 12 * s); x.fillRect(58 * s, 38 * s, 12 * s, 52 * s); }
        return flat(c);
      },
      /* The jukebox's screen: a rainbow waveform and a title. A PLACEHOLDER by
         the owner's word (23 Sep 2026) — the real screen arrives with the
         jukebox/karaoke feature. Round 3b (owner's pick from a reference sheet):
         a MIRRORED spiky trace, purple through to coral, drawn twice — wide and
         faint, then fine and bright — so it glows. Thin single-line styles were
         on the sheet too, but this screen is 7 cm across a room and only bold
         shapes survive that. `t` (seconds) moves it; the same `t` draws the
         same frame. It is a waveform even when nothing plays — just a low one:
         a flat line read as a dead screen from the couch.
         drawWave paints into a canvas the caller keeps, so an animated screen
         re-uploads one texture instead of making a new one per frame. */
      drawWave(c, title, playing = true, t = 0) {
        const x = c.getContext('2d'), w = c.width, h = c.height, r = louRng(29);
        x.globalAlpha = 1; x.fillStyle = '#0e1626'; x.fillRect(0, 0, w, h);
        const mid = h * 0.60, n = 92, x0 = w * 0.06, x1 = w * 0.94;
        const grad = x.createLinearGradient(x0, 0, x1, 0);
        ['#8a5cff', '#3fa9ff', '#33e0b0', '#c8f04a', '#ffc23d', '#ff6a86'].forEach((col, i, a) => grad.addColorStop(i / (a.length - 1), col));
        const bump = (u, c0, s) => Math.exp(-((u - c0) * (u - c0)) / (2 * s * s));
        const amps = [];
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1), noise = r();
          const env = 0.25 + bump(u, 0.24, 0.07) * 0.8 + bump(u, 0.50, 0.09) + bump(u, 0.75, 0.06) * 0.7;
          const beat = playing ? 0.55 + 0.45 * Math.sin(u * 23 + t * 6.5 + i * 0.9) : 1;
          amps.push(Math.min(1, env * (0.3 + 0.7 * noise) * Math.abs(beat)) * h * (playing ? 0.34 : 0.12) * Math.pow(Math.sin(Math.PI * u), 0.5));
        }
        x.strokeStyle = grad; x.lineCap = 'round';
        [[3.4, 0.28], [1.3, 1]].forEach(([lw, al]) => {
          x.globalAlpha = al; x.lineWidth = lw; x.beginPath();
          amps.forEach((a, i) => { const px = x0 + (x1 - x0) * i / (n - 1); x.moveTo(px, mid - Math.max(0.6, a)); x.lineTo(px, mid + Math.max(0.6, a)); });
          x.stroke();
        });
        x.globalAlpha = 0.45; x.lineWidth = 1; x.beginPath(); x.moveTo(x0, mid); x.lineTo(x1, mid); x.stroke();
        x.globalAlpha = 1;
        const s = String(title === undefined || title === null ? '' : title).toUpperCase();
        if (s) {
          const fit = (w * 0.40) / (s.length * 0.62);
          x.font = 'bold ' + Math.max(8, Math.round(Math.min(h * 0.10, fit))) + 'px Fredoka, sans-serif';
          x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillStyle = '#d9d2f2';
          x.fillText(s, w * 0.93, h * 0.15);
        }
        return c;
      },
      waveform(title, playing = true, w = 256, h = 128) { return flat(this.drawWave(makeCanvas(w, h), title, playing, 0)); },
      quilt(rx = 4, ry = 5) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#909090'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#404040'; x.lineWidth = 5;
        x.beginPath(); x.moveTo(0, 64); x.lineTo(64, 0); x.lineTo(128, 64); x.lineTo(64, 128); x.closePath(); x.stroke();
        return wrap(c, rx, ry, true);
      },
      /* Shrinks to fit rather than clipping: 'Shelves' on a 128 px screen drew
         as 'helve', and a long game name would lose its ending on the dial's
         readout. Width is ESTIMATED from the character count (~0.55 em for a
         bold sans) — measureText reads back from the context, which the Node
         harness deliberately does not support. */
      label(text, bg = '#f8f1dc', ink = '#2B1B45', w = 256, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d');
        x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink;
        const s = String(text === undefined || text === null ? '' : text);
        const fit = s.length ? (w * 0.88) / (s.length * 0.55) : h;
        x.font = 'bold ' + Math.max(8, Math.round(Math.min(h * 0.28, fit))) + 'px Fredoka, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(s, w / 2, h / 2); return flat(c);
      },
      /* The TV bench bay's contents (room pass, item 14): one small atlas under mats.cubby, so the
         deck's "PLAY-MAX 2000" and the floppy disks' labels are real text while the cubby stays ONE
         mesh. The top-left block is plain white: every part that is not a decal samples its centre,
         so there the map is a no-op and the part's colour is its vertex colour alone. The deck's label
         ground is the panel's own colour in sRGB (its vertex colour is the same value linear-as-given),
         so decal and panel meet without a seam. Regions: userData.louAtlas, [u0, v0, u1, v1]. */
      cubbyAtlas() {
        const W = 512, H = 256, c = makeCanvas(W, H), x = c.getContext('2d'), PANEL = '#8c7682';
        const rect = (px, py, pw, ph) => [px / W, 1 - (py + ph) / H, (px + pw) / W, 1 - py / H];
        const words = ['GAMES', 'mixtape', 'HOMEWORK', 'photos', 'art!!', 'save #2', 'music', 'DO NOT'];
        const paint = () => {
          x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
          x.fillStyle = PANEL; x.fillRect(128, 0, 384, 128);
          x.fillStyle = '#eee2d0'; x.font = 'bold 40px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText('PLAY-MAX 2000', 312, 66);
          // eight disk labels: off-white paper, a word in felt-tip, two faint rules under it
          words.forEach((s, i) => {
            const px = (i % 4) * 128, py = 128 + Math.floor(i / 4) * 64;
            x.fillStyle = '#f4efe6'; x.fillRect(px, py, 128, 64);
            x.fillStyle = '#ddd5ca'; x.fillRect(px + 10, py + 42, 108, 2); x.fillRect(px + 10, py + 54, 108, 2);
            x.fillStyle = '#5d5866'; x.font = 'bold 24px Fredoka, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
            x.fillText(s, px + 12, py + 36);
          });
        };
        paint();
        const disks = words.map((s, i) => rect((i % 4) * 128 + 3, 128 + Math.floor(i / 4) * 64 + 3, 122, 58));
        const t = flat(c); t.userData = t.userData || {};   // r128's Texture has no userData
        /* Built before the face may have loaded, and the lib touches no DOM: the host repaints it once
           the font is in (louRepaint, lounge-scene.js). */
        t.userData.louAtlas = { white: [0.125, 0.75], playMax: rect(152, 12, 320, 108), disks, panel: PANEL };
        t.userData.louRepaint = () => { paint(); t.needsUpdate = true; };
        return t;
      },
      abstract(seed = 1, w = 128, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d'), r = louRng(seed);
        const cols = ['#E9408E', '#F0A500', '#8ECAE6', '#B1BCA0', '#a97fd6'];
        x.fillStyle = '#FAFAF9'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.arc(r() * w, r() * h, 14 + r() * 30, 0, 7); x.fill(); }
        return flat(c);
      },
    };
  }

  /* ── Bouclé (room pass, round 2 — 24 Sep 2026) ─────────────────────────────
     The couch's fabric, sampled TRIPLANAR in OBJECT space instead of through UVs. An extruded or
     rounded part's UVs smear across every bevel (the old bump streaked sideways on the backs'
     faces), and a triplanar lookup has no UVs to smear. Three parts, one height field:
     - relief: the height's screen derivatives feed r128's own perturbNormalArb, copied here under
       its own name so it cannot collide with USE_BUMPMAP. `height` is the loops' real depth in
       metres, which is what that function's bumpScale means;
     - cavity: the gaps between loops are darker in COLOUR too, so the texture still reads where
       the sun doesn't reach (most of the couch is in fill light);
     - rim: a warm fresnel sheen, strongest on faces turned toward the window. Fibre catches
       grazing backlight; it is what makes the silhouettes against the window side glow in the
       mockup. Added to emissive radiance, after the contact term, and damped by it when present.
     Object space, so the loops never swim; every couch mesh is unscaled, so the tile is metres.
     Chains any existing onBeforeCompile. LOU_BOUCLE is a define so the program cache key differs
     from a plain contact-shaded material's (r128 keys on onBeforeCompile.toString() + defines). */
  const LOU_BOUCLE_TILE = 7.8;   // tiles per metre: a 256 px tile is 12.8 cm, a loop ~1 cm across
  function louBoucle(THREE, m, map, opt = {}) {
    const u = {
      uPrmBoucleMap: { value: map }, uPrmBoucleTile: { value: opt.tile || LOU_BOUCLE_TILE },
      uPrmBoucleH: { value: opt.height !== undefined ? opt.height : 0.004 },
      uPrmBoucleCav: { value: opt.cavity !== undefined ? opt.cavity : 0.32 },
      uPrmBoucleRim: { value: new THREE.Color(opt.rimColor || '#ffc996').multiplyScalar(opt.rim !== undefined ? opt.rim : 0.4) },
      uPrmBoucleLight: { value: new THREE.Vector3(...(opt.light || [-0.55, 0.45, -0.7])).normalize() },
    };
    const HEAD = 'varying vec3 vPrmBO;\nvarying vec3 vPrmBN;\n' +
      'uniform sampler2D uPrmBoucleMap;\nuniform float uPrmBoucleTile;\nuniform float uPrmBoucleH;\nuniform float uPrmBoucleCav;\nuniform vec3 uPrmBoucleRim;\nuniform vec3 uPrmBoucleLight;\n' +
      'vec3 louBW; vec3 louBH;\n' +
      'float louBoucleAt(vec3 p) {\n  vec3 q = p * uPrmBoucleTile;\n' +
      '  return texture2D(uPrmBoucleMap, q.zy).r * louBW.x + texture2D(uPrmBoucleMap, q.xz + 0.37).r * louBW.y + texture2D(uPrmBoucleMap, q.xy + 0.71).r * louBW.z;\n}\n' +
      'vec3 louBouclePerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {\n' +
      '  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos);\n' +
      '  vec3 R1 = cross(vSigmaY, surf_norm), R2 = cross(surf_norm, vSigmaX);\n' +
      '  float fDet = dot(vSigmaX, R1) * faceDir;\n' +
      '  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);\n' +
      '  return normalize(abs(fDet) * surf_norm - vGrad);\n}\n';
    // the height and its two screen-space neighbours, sampled once, before lighting needs either
    const COLOR = '#include <color_fragment>\n  {\n    vec3 bn = abs(normalize(vPrmBN)); bn *= bn; bn *= bn; louBW = bn / (bn.x + bn.y + bn.z);\n' +
      '    float h0 = louBoucleAt(vPrmBO);\n' +
      '    louBH = vec3(h0, louBoucleAt(vPrmBO + dFdx(vPrmBO)) - h0, louBoucleAt(vPrmBO + dFdy(vPrmBO)) - h0);\n' +
      '    diffuseColor.rgb *= mix(1.0 - uPrmBoucleCav, 1.0 + uPrmBoucleCav * 0.35, h0);\n  }';
    const NORMAL = '#include <normal_fragment_maps>\n  normal = louBouclePerturb(-vViewPosition, normal, uPrmBoucleH * louBH.yz, faceDirection);';
    const RIM = '#include <aomap_fragment>\n  {\n    float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);\n' +
      '    float side = clamp(dot(inverseTransformDirection(normal, viewMatrix), uPrmBoucleLight), 0.0, 1.0);\n' +
      '    float rimAo = 1.0;\n#ifdef LOU_AO_BOXES\n    rimAo = louAo;\n#endif\n' +
      '    totalEmissiveRadiance += uPrmBoucleRim * diffuseColor.rgb * 3.0 * fr * (0.25 + 0.75 * side) * (0.55 + 0.45 * louBH.x) * rimAo;\n  }';
    m.defines = Object.assign({}, m.defines, { LOU_BOUCLE: 1 });
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPrmBO;\nvarying vec3 vPrmBN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPrmBO = transformed; vPrmBN = objectNormal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HEAD)
        .replace('#include <color_fragment>', COLOR).replace('#include <normal_fragment_maps>', NORMAL).replace('#include <aomap_fragment>', RIM);
    };
    m.userData.louBoucle = u;
    m.needsUpdate = true;
    return m;
  }

  /* ── Sheen (room pass, round 7 — the cushions, 24 Sep 2026) ─────────────────
     Cloth brightens toward grazing: the fibres stand up off the surface and catch light edge-on, which
     is most of what tells cloth from card at a distance. So the diffuse light a fragment already gets
     is lifted by (1 − N·V)² — lit-dependent, so a cushion in shadow stays in shadow. Hooks the aomap
     chunk like the bouclé's rim, so the contact shade (which chains on) applies before it. LOU_SHEEN
     keeps the program cache key distinct. */
  function louSheen(THREE, m, opt = {}) {
    const u = { uPrmSheen: { value: opt.amount !== undefined ? opt.amount : 0.6 } };
    const SHEEN = '#include <aomap_fragment>\n  {\n    float louNV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\n' +
      '    float louSh = 1.0 + uPrmSheen * (1.0 - louNV) * (1.0 - louNV);\n' +
      '    reflectedLight.directDiffuse *= louSh; reflectedLight.indirectDiffuse *= louSh;\n  }';
    m.defines = Object.assign({}, m.defines, { LOU_SHEEN: 1 });
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPrmSheen;').replace('#include <aomap_fragment>', SHEEN);
    };
    m.userData.louSheen = u; m.needsUpdate = true;
    return m;
  }

  /* ── Grain (room pass, round 3 — the coffee table, 24 Sep 2026) ────────────
     Wood sampled in OBJECT space, the bouclé's method with a different field: the rounded top's
     extrude UVs smeared the old stripes across its bevel. Triplanar with sharp weights (n⁸) so two
     grain directions never visibly cross-fade, and one convention — GRAIN RUNS ALONG OBJECT X: the
     top face samples (x,z), the long edges (x,y), the ends (z,y). A part whose grain should run
     another way is BUILT along x and rotated by its mesh (the legs). Three parts:
     - colour: the tile IS the albedo (sRGB, decoded here); the material's own colour stays white;
     - relief: the field's luminance as height, through the bouclé's perturb — latewood and pores
       sit a fraction of a millimetre low;
     - roughness: darker than the tile's mean reads rougher, so the lacquer's highlight breaks on
       the grain. The lacquer itself is the material's clearcoat, which r128 lights with the
       UNPERTURBED geometryNormal — a glassy coat over textured wood, for free.
     Chains any existing onBeforeCompile; LOU_GRAIN keeps the program cache key distinct. */
  const LOU_GRAIN_TILE = [1 / 1.2, 1 / 0.6];   // tiles per metre: 1.2 m along the grain, 0.6 m across
  function louGrain(THREE, m, map, opt = {}) {
    const u = {
      uPrmGrainMap: { value: map },
      uPrmGrainTile: { value: new THREE.Vector2(...(opt.tile || LOU_GRAIN_TILE)) },
      uPrmGrainH: { value: opt.height !== undefined ? opt.height : 0.0004 },
      uPrmGrainRough: { value: opt.rough !== undefined ? opt.rough : 0.3 },
      uPrmGrainLum: { value: (map.userData || {}).louLum !== undefined ? map.userData.louLum : 0.45 },   // the tile's mean luma (a clone has no userData in r128)
    };
    const HEAD = 'varying vec3 vPrmGO;\nvarying vec3 vPrmGN;\n' +
      'uniform sampler2D uPrmGrainMap;\nuniform vec2 uPrmGrainTile;\nuniform float uPrmGrainH;\nuniform float uPrmGrainRough;\nuniform float uPrmGrainLum;\n' +
      'vec3 louGW; vec3 louGH;\n' +
      'vec3 louGrainAt(vec3 p) {\n' +
      '  return texture2D(uPrmGrainMap, p.zy * uPrmGrainTile).rgb * louGW.x + texture2D(uPrmGrainMap, p.xz * uPrmGrainTile + vec2(0.0, 0.37)).rgb * louGW.y\n' +
      '       + texture2D(uPrmGrainMap, p.xy * uPrmGrainTile + vec2(0.0, 0.61)).rgb * louGW.z;\n}\n' +
      'float louGrainLumAt(vec3 p) { return dot(louGrainAt(p), vec3(0.299, 0.587, 0.114)); }\n' +
      'vec3 louGrainPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {\n' +
      '  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos);\n' +
      '  vec3 R1 = cross(vSigmaY, surf_norm), R2 = cross(surf_norm, vSigmaX);\n' +
      '  float fDet = dot(vSigmaX, R1) * faceDir;\n' +
      '  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);\n' +
      '  return normalize(abs(fDet) * surf_norm - vGrad);\n}\n';
    const COLOR = '#include <color_fragment>\n  {\n    vec3 bn = abs(normalize(vPrmGN)); bn *= bn; bn *= bn; bn *= bn; louGW = bn / (bn.x + bn.y + bn.z);\n' +
      '    vec3 g0 = louGrainAt(vPrmGO); float h0 = dot(g0, vec3(0.299, 0.587, 0.114));\n' +
      '    louGH = vec3(h0, louGrainLumAt(vPrmGO + dFdx(vPrmGO)) - h0, louGrainLumAt(vPrmGO + dFdy(vPrmGO)) - h0);\n' +
      '    diffuseColor.rgb *= sRGBToLinear(vec4(g0, 1.0)).rgb;\n  }';
    const ROUGH = '#include <roughnessmap_fragment>\n  roughnessFactor = min(1.0, roughnessFactor + uPrmGrainRough * clamp((uPrmGrainLum - louGH.x) * 5.0, 0.0, 1.0));';
    const NORMAL = '#include <normal_fragment_maps>\n  normal = louGrainPerturb(-vViewPosition, normal, uPrmGrainH * louGH.yz, faceDirection);';
    m.defines = Object.assign({}, m.defines, { LOU_GRAIN: 1 });
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPrmGO;\nvarying vec3 vPrmGN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPrmGO = transformed; vPrmGN = objectNormal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HEAD)
        .replace('#include <color_fragment>', COLOR).replace('#include <roughnessmap_fragment>', ROUGH).replace('#include <normal_fragment_maps>', NORMAL);
    };
    m.userData.louGrain = u;
    m.needsUpdate = true;
    return m;
  }

  /* ── The window's VIEW (room pass, round 8b, 24 Sep 2026) ─────────────────
     The glass samples tex.garden by the DIRECTION from the camera through the fragment, never by its
     UVs: azimuth off the wall's normal (−x, out of the room) and the tangent of elevation, straight
     into the texture's [az0, az1] × [el0, el1]. The ray is the view-space position turned back into
     world space by the transpose of the view matrix's rotation: r128 uploads cameraPosition only to
     lit, shader or env-mapped materials, so on a MeshBasicMaterial it reads (0,0,0), and every ray
     looked out from the floor's centre, into the sky. It is linear across the plane, so the varying
     is exact. The garden is then at infinity. That costs one atan
     and one lookup per fragment of glass, a sliver of the frame. On top, the glass itself: a faint
     pale sheen, rising toward grazing as real glass does (Schlick). Unlit (MeshBasicMaterial): the
     view is its own light, and the key that comes through it is the sun's job. LOU_VIEW keeps the
     program cache key distinct. */
  function louWindowView(THREE, m, opt = {}) {
    const v = m.map.userData.louView;
    const u = { uPrmView: { value: new THREE.Vector4(v[0], v[1], v[2], v[3]) }, uPrmGlass: { value: new THREE.Color(opt.glass || '#fff4e6') },
      uPrmSheen: { value: opt.sheen !== undefined ? opt.sheen : 0.05 }, uPrmGain: { value: opt.gain !== undefined ? opt.gain : 1 } };
    const VIEW = '#ifdef USE_MAP\n  {\n    vec3 d = normalize(vPrmRay);\n' +
      '    vec2 vuv = vec2((atan(d.z, -d.x) - uPrmView.x) / (uPrmView.y - uPrmView.x), (d.y / max(length(d.xz), 1e-4) - uPrmView.z) / (uPrmView.w - uPrmView.z));\n' +
      '    diffuseColor *= mapTexelToLinear(texture2D(map, vuv));\n    diffuseColor.rgb *= uPrmGain;\n' +
      '    float f = 1.0 - abs(d.x); f = f * f * f * f * f;\n' +
      '    diffuseColor.rgb = mix(diffuseColor.rgb, uPrmGlass, clamp(uPrmSheen + 0.6 * f, 0.0, 1.0));\n  }\n#endif';
    m.defines = Object.assign({}, m.defines, { LOU_VIEW: 1 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPrmRay;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vPrmRay = vec3(dot(viewMatrix[0].xyz, mvPosition.xyz), dot(viewMatrix[1].xyz, mvPosition.xyz), dot(viewMatrix[2].xyz, mvPosition.xyz));');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPrmRay;\nuniform vec4 uPrmView;\nuniform vec3 uPrmGlass;\nuniform float uPrmSheen;\nuniform float uPrmGain;')
        .replace('#include <map_fragment>', VIEW);
    };
    m.userData.louView = u; m.needsUpdate = true;
    return m;
  }

  function louMaterials(THREE, tex) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    return {
      birch:      std({ map: tex.wood(), roughness: .6, metalness: 0 }),
      birchDark:  std({ map: tex.wood('#c9a77f', '#9d7a52'), roughness: .62 }),
      floor:      std({ map: tex.wood('#c99a6b', '#a87a4e', 6, 6), roughness: .5 }),
      /* The room pass (24 Sep 2026): the owner lifted spec D7 and § 3.2's "only the player's colours
         saturate". The room read flat because every big surface shared ONE pale value (mean HSL
         saturation 0.23 against the mockup's 0.47) — so the surfaces now separate by material:
         a peach wall, a walnut table against the pale-oak bench, a mauve couch, a warm rug. */
      /* The coffee table. It renders HONEY, not walnut, and the owner kept that tone (24 Sep 2026: it
         stays apart from the bench's pale oak, where the mockup's woods all run together) — the key
         keeps its round-1 name. Grain in object space plus a lacquer coat (louGrain). */
      walnut:     louGrain(THREE, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .55, clearcoat: .6, clearcoatRoughness: .2 }), tex.grain()),
      /* The TV bench (room pass, round 5, revised to the owner's oak media-unit reference): a warm
         light oak, still well clear of the table's darker honey. Satin, not lacquered. Many fine,
         nearly straight rings (at 34 across the tile the warp moves each one only a little, so
         the figure runs long and calm, as flatsawn oak's does), and a 2 m tile along the grain so
         the 1.9 m front never shows its cathedral twice. vertexColors: the bench bakes its open
         bay's darkness into the carcass (lounge-room.js), so every oak geometry carries colours. */
      oak:        louGrain(THREE, std({ color: '#ffffff', roughness: .55, metalness: 0, vertexColors: true }), tex.grain('#d6b085', '#a8784c', 512, 34), { tile: [1 / 2.0, 1 / 0.45], rough: 0.2 }),
      /* The bookshelf (room pass, item 12): the room's third grained wood, and its palest — birch, kept
         to the flat birch it replaces so the corner's value doesn't move, and apart from the bench's
         warmer oak beside it. Fine, close rings (birch's figure is quiet), satin like the oak. Same
         program as the oak (std + vertexColors + LOU_GRAIN), so it compiles nothing new. vertexColors:
         the shelf bakes each bay's darkness into its geometry (lounge-room.js), as the bench does. */
      birchGrain: louGrain(THREE, std({ color: '#ffffff', roughness: .58, metalness: 0, vertexColors: true }), tex.grain('#d9c09c', '#b48e66', 512, 30), { tile: [1 / 1.4, 1 / 0.4], rough: 0.2 }),
      /* the bay's contents (the Play-Max deck, the floppy-disk box): one mesh, fixed colours per vertex;
         the atlas carries only the decals' text (white everywhere else — tex.cubbyAtlas) */
      cubby:      std({ color: '#ffffff', vertexColors: true, roughness: .6, metalness: 0, map: tex.cubbyAtlas() }),
      /* the disk box's smoked acrylic lid (room pass, item 14): see-through, so the pastel disks read
         through it, dimmed as in the owner's render. Two-sided so the far wall tints what shows above
         the disks too (r128 draws a transparent DoubleSide back faces first). Casts nothing. */
      diskLid:    std({ color: '#1f2227', roughness: .25, metalness: 0, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }),
      /* The bookshelf's dressing (room pass, item 15): books and toys, each merged into one mesh, with
         fixed colours and the bay's darkness per vertex (lou-props louBuildShelf). One material per
         finish: cloth-bound board, and painted plastic. */
      shelfBooks: std({ color: '#ffffff', vertexColors: true, roughness: .85, metalness: 0 }),
      shelfToys:  std({ color: '#ffffff', vertexColors: true, roughness: .38, metalness: 0 }),
      // the bench's acorn pulls: polished nut, bronze cap, in vertex colours (louAcornGeometry)
      acorn:      std({ color: '#ffffff', vertexColors: true, roughness: .35, metalness: .85 }),
      // the wallpaper (room pass, round 6): a metre-scaled print tile plus its paper-grain bump
      wall:       ((t) => std({ map: t, bumpMap: t.userData.louBump, bumpScale: .008, roughness: .95 }))(tex.wallpaper()),
      // the braided rug (room pass, item 11): banded ropes, its tone held; the rope edge takes the outer ring
      rug:        std({ map: tex.braid(), bumpMap: tex.braidBump(), bumpScale: .006, roughness: .95 }),
      rugEdge:    std({ color: tex.braid().userData.louEdge, roughness: .95 }),
      /* The ledge cattails — fixed furniture colours (never a design role). Room pass, item 13: to the
         owner's render, a butter-yellow pot, mint leaves and rim, and lilac heads (a cousin of the
         props' lavender, as the mug's glaze is), all soft clay. The heads' fuzz is the cushions'
         cloth sheen: at this size fuzz is an edge that brightens, not fibres. */
      potCream:   std({ color: '#d6c25e', roughness: .7 }),
      leaf:       std({ color: '#5f9a70', roughness: .8, side: THREE.DoubleSide }),
      cattail:    louSheen(THREE, std({ color: '#a482b4', roughness: .95, metalness: 0 }), { amount: 0.7 }),
      soil:       std({ color: '#2a1c14', roughness: 1 }),
      /* The koala mug on the table (room pass, round 4). Fixed colours: it is furniture. A cool
         lilac-grey glaze, which is the koala AND a cousin of the props' lavender, set against the
         honey table; a glossy dark nose and eyes; soft pink inner ears and cheeks. The coffee has
         its crema in vertex colours (louBuildMug), so it is one flat disc with no texture. */
      mugGlaze:   std({ color: '#827e96', roughness: .28, metalness: 0 }),
      mugInk:     std({ color: '#35293a', roughness: .22, metalness: 0 }),
      mugBlush:   std({ color: '#f2afbd', roughness: .4, metalness: 0 }),
      coffee:     std({ color: '#ffffff', vertexColors: true, roughness: .12, metalness: 0 }),
      /* The puppy slippers on the rug (room pass, item 10). Furniture too: cream plush with chocolate
         ears, the sole band, the lining and the contact all in vertex colours (louBuildSlippers) under
         the cushions' cloth sheen; the nose and eyes glossy, like the mug's. */
      slipper:    louSheen(THREE, std({ color: '#ffffff', vertexColors: true, roughness: .95, metalness: 0 }), { amount: 0.55 }),
      slipperInk: std({ color: '#2c2226', roughness: .24, metalness: 0 }),
      /* The front plane: deliberately soft and DARK at the edge (original spec § 6) — it frames
         the shot and is the room's one genuinely shadowed mass. */
      // mauve-taupe: ties the couch to the lavender props. No bumpMap — the loops are triplanar (louBoucle)
      fabric:     louBoucle(THREE, std({ color: '#5e4346', roughness: 1 }), tex.boucle()),
      // the welt cord along the couch's seams: the same cloth, a shade lighter, smooth — it reads as a line
      fabricPiping: std({ color: '#6b4e50', roughness: .9 }),
      /* The throw cushions (room pass, round 7): one atlas (tex.cushions), and their contact with the
         seat, the back, the arm and each other baked into vertex colours (lounge-room.js) — the fabric's
         box list has no room for them, and a baked term costs nothing a frame. */
      cushion:    louSheen(THREE, std({ map: tex.cushions(), vertexColors: true, roughness: .9, metalness: 0 })),
      cream:      std({ color: '#f4efe6', roughness: .55, metalness: .05 }),
      skirting:   std({ color: '#f7f2ea', roughness: .6 }),
      plum:       std({ color: '#2B1B45', roughness: .6 }),
      black:      std({ color: '#1b1b1f', roughness: .45 }),
      chrome:     std({ color: '#cfd3d8', roughness: .25, metalness: .9 }),
      brass:      std({ color: '#c9a24a', roughness: .35, metalness: .85 }),
      /* The curtains (room pass, round 8): paw-print linen, drawn OPEN and tied back, so no longer
         see-through — opaque sorts with the room and costs no blend. They still cast nothing (lou-room).
         Both faces are cloth (DoubleSide); the folds' cavity is baked in vertex colours. The sheen is the cushions' (DD-32 § 7b): cloth by its edges. */
      curtain:    louSheen(THREE, std({ map: tex.linen(), vertexColors: true, roughness: .92, metalness: 0, side: THREE.DoubleSide }), { amount: 0.5 }),
      // the tie-backs (round 8b, to the owner's render): an oatmeal band a shade under the linen, hooked to the wall in brass
      tieback:    louSheen(THREE, std({ color: '#dcc7a6', roughness: .85, metalness: 0 }), { amount: 0.5 }),
      /* The glass (round 8b): the garden, looked up by view direction (louWindowView). Not tone-mapped:
         the painted colours ARE the daylight, and ACES at the room's exposure would grey them. It was
         a flat warm plane with the curtain drawn; the owner's word for it, open, was "solid grey/white". */
      window:     louWindowView(THREE, new THREE.MeshBasicMaterial({ map: tex.garden(), toneMapped: false })),
      yellow:     std({ color: '#F3E2A0', roughness: .55, bumpMap: tex.quilt(), bumpScale: .0025 }),
      yellowDark: std({ color: '#d9c27a', roughness: .55 }),
      paper:      std({ color: '#ffffff', roughness: .8 }),
      sleeve:     std({ color: '#ffffff', roughness: .15, transparent: true, opacity: .85 }),
      /* The cat jar's body. Plain opacity, never MeshPhysical transmission — the cost envelope
         rules that out and at this size opacity reads as glass anyway. */
      glass:      std({ color: '#dfeef5', roughness: .15, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }),
      emissive(hex, intensity = 1) { return std({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: .5 }); },
    };
  }

  function louCreateLib(THREE, deps) {
    const makeCanvas = deps.makeCanvas, smoothNormals = deps.smoothNormals || null;
    const tex = louTextures(THREE, makeCanvas);
    return {
      THREE, tex, mats: louMaterials(THREE, tex), makeCanvas,
      roundedRect: (w, h, r) => louRoundedRect(THREE, w, h, r),
      /* The caller's w/h/d are the FINISHED size. bevelSize pushes the outline
         outward, so the shape is inset by the bevel first — otherwise every
         moulded part comes out 2*bevel too wide and placements drift. */
      moulded(w, h, d, r, opt = {}) {
        const bevel = Math.min(opt.bevel !== undefined ? opt.bevel : Math.min(r / 3, d / 4), w / 2 - 1e-4, h / 2 - 1e-4, d / 2);
        const shape = louRoundedRect(THREE, w - 2 * bevel, h - 2 * bevel, Math.max(r - bevel, 1e-4));
        return louExtrude(THREE, shape, d, bevel, opt, smoothNormals);
      },
      extrude: (shape, d, bevel, opt = {}) => louExtrude(THREE, shape, d, bevel, opt, smoothNormals),
      /* See louRoundPoly / louBend above — the jukebox's window, frame and
         faceplate are all flat outlines bent round its body (round 3). */
      roundPoly: (corners, offset, step) => louRoundPoly(THREE, corners, offset, step),
      ribbon: (corners, profile, step, arcSegs) => louRibbon(THREE, corners, profile, step, arcSegs),
      roundSection: louRoundSection,
      /* See louPillow / louMerge / louSeam — the couch's upholstery (room pass, round 2). */
      pillow: (w, h, d, r, opt = {}) => louPillow(THREE, w, h, d, r, opt, smoothNormals),
      merge: (parts) => louMerge(THREE, parts),
      seam: (S, r, face, rad, step) => louSeam(THREE, S, r, face, rad, step),
      holedBand: (corners, R, thick, y0, y1, opt) => louHoledBand(THREE, corners, R, thick, y0, y1, opt),
      bend: (geo, R0, opt = {}) => louBend(THREE, geo, R0, opt, smoothNormals),
      /* See louUvFit above — 0..1 across the part's own face, for a map that
         has to land in a place rather than tile. */
      uvFit: (geo) => louUvFit(THREE, geo),
      /* See louBunnyEar above — the scooped-section sweep that replaced the old
         circular `droopEar` tube in the telly's round-1 reshape (22 Sep 2026). */
      bunnyEar: (points, opt = {}) => louBunnyEar(THREE, points, opt, smoothNormals),
      /* `shade` multiplies the role's colour — so ONE role can paint two related
         tones. The telly's inner ear is the shell colour a shade darker, which
         is what gives the hollow a shadow of its own even when the player picks
         the same colour for the shell and the ears. */
      role(role, hex, extra = {}, shade) {
        const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: .52, metalness: .06 }, extra));
        m.userData.louRole = role;
        if (shade !== undefined) { m.userData.louShade = shade; m.color.multiplyScalar(shade); }
        return m;
      },
    };
  }

  /* One loop, spec § 10: every material tagged with a role takes that role's
     colour. Returns the number of meshes repainted (the harness counts it). */
  function louApplyDesign(root, design) {
    let n = 0;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let hit = false;
      mats.forEach(m => {
        const role = m.userData && m.userData.louRole;
        if (!role || !design[role]) return;
        m.color.set(design[role]);
        if (m.userData.louShade !== undefined) m.color.multiplyScalar(m.userData.louShade);
        if (m.emissive && m.userData.louEmissive) m.emissive.set(design[role]);
        hit = true;
      });
      if (hit) n++;
    });
    return n;
  }

  /* ── Contact shade (room pass, round 1 — 24 Sep 2026) ─────────────────────
     The mockup's settled look is mostly ambient occlusion: surfaces darken where they meet, so
     furniture sits instead of floating. This is its cheap stand-in. ONE occlusion function, paid
     for two ways:
     - the big planes (floor + rug, each wall) are BAKED once at mount into a small DataTexture and
       read back by world position — one texture fetch a pixel, which is all a full-screen plane
       can afford on a phone;
     - furniture evaluates a SHORT list of boxes in its own fragment shader — what puts a crease
       where a seat meets its back. The list is capped (LOU_AO_MAX) for the same reason.
     An occluder is an axis-aligned box { c, h, r, s, k }: centre, half-size, the halo's reach, its
     depth, and a corner rounding. It shades a point by the closest point of the box, weighted by
     how much the surface faces it — so a point ON a box is never shaded by that box, and nothing
     shades itself. Rounding is for props: a round dial's square halo read as a printed rectangle.
     The same injection also lifts the room's saturation after tone mapping (`uPrmSat`) — ACES
     flattens colour, and this is the room's grade only: the props are the player's own colours
     and are never touched.
     No light and no draw call is added: the term scales what the lights already give.
     Pure — no DOM, no canvas. */
  const LOU_AO_MAX = 12;
  const louSmooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  function louContactShade(THREE) {
    /* Shared by every patched material, so one number re-tunes the whole room. `direct` is how
       much of the term also darkens DIRECT light: real AO touches only indirect, but this room's
       light is mostly direct, so a pure-indirect term would barely show. */
    const uniforms = { uPrmAoDirect: { value: 0.55 }, uPrmFloorK: { value: 0.62 }, uPrmSat: { value: 1.22 } };

    function occlusion(p, n, boxes) {
      let ao = 1;
      for (const b of boxes) {
        /* Rounded in PLAN only: the footprint's corners are rounded by k, its height stays exact.
           Rounding all three axes let a flat prop's rounding reach below the surface it sits on,
           which put that surface "inside" the prop and left a pale oval round every prop. */
        const k = b.k || 0, hx = Math.max(b.h[0] - k, 0), hz = Math.max(b.h[2] - k, 0);
        let qx = Math.min(Math.max(p[0], b.c[0] - hx), b.c[0] + hx) - p[0];
        const qy = Math.min(Math.max(p[1], b.c[1] - b.h[1]), b.c[1] + b.h[1]) - p[1];
        let qz = Math.min(Math.max(p[2], b.c[2] - hz), b.c[2] + hz) - p[2];
        const lxz = Math.hypot(qx, qz), lh = Math.max(lxz - k, 0), sc = lxz > 1e-6 ? lh / lxz : 0;
        qx *= sc; qz *= sc;
        const d = Math.hypot(qx, qy, qz);
        if (d < 1e-4 || d >= b.r) continue;
        const f = Math.min(1, Math.max(0, 0.5 + 0.5 * (n[0] * qx + n[1] * qy + n[2] * qz) / d));
        ao *= 1 - b.s * f * (1 - louSmooth(d / b.r));
      }
      return ao;
    }
    /* The room's own seams: floor/back, floor/left, the back-left corner, and a softer band under
       the ceiling line. Distances are summed (L1), which is what darkens a corner more than an edge. */
    function seams(p, R) {
      const dF = Math.max(p[1], 0), dB = Math.max(p[2] - R.backZ, 0), dL = Math.max(p[0] - R.leftX, 0), dC = Math.max(R.ceilY - p[1], 0);
      const s = (d, r, k) => k + (1 - k) * louSmooth(d / r);
      return s(dF + dB, 0.5, 0.55) * s(dF + dL, 0.5, 0.55) * s(dB + dL, 0.6, 0.62) * s(dC + dB, 0.45, 0.8) * s(dC + dL, 0.45, 0.8);
    }
    /* A plane: `axis` names the two world axes the texture spans ('xz' floor, 'xy' back wall, 'zy'
       left wall), `u`/`v` their world ranges, `at` the fixed third coordinate, `n` the normal. */
    function bake(plane, boxes, R, w = 192, h = 160) {
      const data = new Uint8Array(w * h * 4), p = [0, 0, 0];
      const [u0, u1] = plane.u, [v0, v1] = plane.v;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const a = u0 + (i + 0.5) / w * (u1 - u0), b = v0 + (j + 0.5) / h * (v1 - v0);
        if (plane.axis === 'xz') { p[0] = a; p[1] = plane.at; p[2] = b; }
        else if (plane.axis === 'xy') { p[0] = a; p[1] = b; p[2] = plane.at; }
        else { p[0] = plane.at; p[1] = b; p[2] = a; }
        const v = Math.round(255 * occlusion(p, plane.n, boxes) * seams(p, R)), k = (j * w + i) * 4;
        data[k] = data[k + 1] = data[k + 2] = v; data[k + 3] = 255;
      }
      const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
      t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
      return t;
    }
    /* A world AABB over one or more objects, as an occluder. `lift` raises its floor: an object
       resting on a surface has that surface lying exactly ON its box's bottom face, which reads as
       "the box's own surface" and is skipped — a pale footprint inside a dark halo, the first
       render's bug. Lifted a few mm, the surface underneath is shaded like the contact it is. */
    function box(objs, r, s, lift = 0, round = 0) {
      const b = new THREE.Box3(); [].concat(objs).forEach(o => b.expandByObject(o)); b.min.y += lift;
      const c = new THREE.Vector3(), h = new THREE.Vector3(); b.getCenter(c); b.getSize(h).multiplyScalar(0.5);
      return { c: c.toArray(), h: h.toArray(), r, s, k: round * Math.min(h.x, h.z) };
    }

    const VERT = '#include <project_vertex>\n  vPrmW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vPrmN = normalize(mat3(modelMatrix) * objectNormal);';
    const APPLY = '#include <aomap_fragment>\n  float louAo = louContact();\n  reflectedLight.indirectDiffuse *= louAo; reflectedLight.indirectSpecular *= louAo;\n  reflectedLight.directDiffuse *= mix(1.0, louAo, uPrmAoDirect);';
    const HEAD = 'varying vec3 vPrmW;\nvarying vec3 vPrmN;\nuniform float uPrmAoDirect;\nuniform float uPrmFloorK;\nuniform float uPrmSat;\n';
    const GRADE = '#include <tonemapping_fragment>\n  gl_FragColor.rgb = max(mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, uPrmSat), 0.0);';
    const PLANE_FN = 'uniform sampler2D uPrmAoMap;\nuniform vec4 uPrmAoRect;\n' +
      'float louContact() {\n  vec2 w = LOU_AO_AXES;\n  return texture2D(uPrmAoMap, (w - uPrmAoRect.xy) / uPrmAoRect.zw).r;\n}\n';
    // H.xz arrives already shrunk by the plan rounding K, which is added back as a distance; H.y is exact
    const BOX_FN = 'uniform vec4 uPrmBoxC[LOU_AO_BOXES];\nuniform vec4 uPrmBoxH[LOU_AO_BOXES];\nuniform float uPrmBoxK[LOU_AO_BOXES];\n' +
      'float louContact() {\n  vec3 p = vPrmW, n = normalize(vPrmN); float ao = 1.0;\n' +
      '  for (int i = 0; i < LOU_AO_BOXES; i++) {\n' +
      '    vec4 C = uPrmBoxC[i], H = uPrmBoxH[i];\n' +
      '    vec3 q = clamp(p, C.xyz - H.xyz, C.xyz + H.xyz) - p;\n' +
      '    float lxz = length(q.xz); q.xz *= max(lxz - uPrmBoxK[i], 0.0) / max(lxz, 1e-6); float d = length(q);\n' +
      '    if (d > 1e-4 && d < C.w) {\n' +
      '      float f = clamp(0.5 + 0.5 * dot(n, q) / d, 0.0, 1.0);\n' +
      '      ao *= 1.0 - H.w * f * (1.0 - smoothstep(0.0, 1.0, d / C.w));\n    }\n  }\n' +
      '  return ao * mix(uPrmFloorK, 1.0, smoothstep(0.0, 0.14, p.y));\n}\n';

    /* Chains whatever onBeforeCompile the material already has (the couch's bouclé, louBoucle):
       replacing it would silently drop that patch, with no error anywhere. */
    function inject(m, defines, fn, extra) {
      m.defines = Object.assign({}, m.defines, defines);
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        prev.call(m, sh, r);
        Object.assign(sh.uniforms, uniforms, extra);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPrmW;\nvarying vec3 vPrmN;').replace('#include <project_vertex>', VERT);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + HEAD + fn).replace('#include <aomap_fragment>', APPLY).replace('#include <tonemapping_fragment>', GRADE);
      };
      m.needsUpdate = true;
      return m;
    }
    const AXES = { xz: 'vPrmW.xz', xy: 'vPrmW.xy', zy: 'vPrmW.zy' };
    /* A plane material reads its own bake. One material per plane: a material shared by two walls
       would need two maps, so the caller gives each wall its own. */
    function patchPlane(m, plane, t) {
      const rect = new THREE.Vector4(plane.u[0], plane.v[0], plane.u[1] - plane.u[0], plane.v[1] - plane.v[0]);
      m.userData.louAo = { mode: 'plane', axis: plane.axis, map: t };
      return inject(m, { LOU_AO_AXES: AXES[plane.axis] }, PLANE_FN, { uPrmAoMap: { value: t }, uPrmAoRect: { value: rect } });
    }
    function patchBoxes(m, boxes) {
      const list = boxes.slice(0, LOU_AO_MAX);
      m.userData.louAo = { mode: 'boxes', count: list.length };
      return inject(m, { LOU_AO_BOXES: list.length }, BOX_FN, {
        uPrmBoxC: { value: list.map(b => new THREE.Vector4(b.c[0], b.c[1], b.c[2], b.r)) },
        uPrmBoxH: { value: list.map(b => { const k = b.k || 0; return new THREE.Vector4(Math.max(b.h[0] - k, 0), b.h[1], Math.max(b.h[2] - k, 0), b.s); }) },
        uPrmBoxK: { value: list.map(b => b.k || 0) },
      });
    }
    /* The room grade and nothing else, for a material whose contact is already baked (the throw
       cushions): no box loop, no bake read. Chains any existing hook, like inject. */
    function patchGrade(m) {
      m.defines = Object.assign({}, m.defines, { LOU_GRADE_ONLY: 1 });
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        prev.call(m, sh, r);
        Object.assign(sh.uniforms, uniforms);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPrmSat;').replace('#include <tonemapping_fragment>', GRADE);
      };
      m.userData.louAo = { mode: 'grade' }; m.needsUpdate = true;
      return m;
    }
    return { uniforms, occlusion, seams, bake, box, patchPlane, patchBoxes, patchGrade, MAX: LOU_AO_MAX };
  }

  const api = { louCreateLib, louApplyDesign, louRoundedRect, louUvFit, louRoundPoly, louBend, louRibbon, louRoundSection, louHoledBand, louContactShade, louBoucle, louSheen, louPillow, louMerge, louSeam, LOU_BOUCLE_TILE, louGrain, LOU_GRAIN_TILE, louWindowView };
  if (typeof window !== 'undefined') window.LouLib = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
