// ═══════════════════════════════════════════════════════════════════════════
// lounge-room.js — Premium lounge: the shell. Walls, floor, rug, furniture, the
// curtain, the window, the sill plant, two prints, the couch's throw cushions (room pass, round 7).
// Spec § 6 + the 2026-09-19 re-block. Everything is geometry; every
// patterned surface is a canvas texture from lou-lib. Fixed warm neutrals —
// never the player's colours (the props are what pop).
// Pure: takes lib, touches no DOM. Nothing here is a pick target.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function louBuildRoom(lib) {
    const { THREE, mats, tex } = lib;
    /* The re-block (spec 2026-09-19 § 3.1): a corner about 3.2 m wide and 1.9 m
       deep, the bench a metre behind a table that sits right of centre, and a
       seat we are sitting on. Every prop reads its surface from here. */
    const R = { floorY: 0, backZ: -1.55, leftX: -1.6, benchZ: -1.15, benchTopY: 0.52, tableTopY: 0.44, tableX: 0.35, tableZ: 0.05, armTopY: 0.58, seatTopY: 0.47, sillTopY: 0.70 };
    const g = new THREE.Group(); g.name = 'room';
    const add = (name, geo, mat, pos, rot, o = {}) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      m.receiveShadow = o.receive !== false; m.castShadow = !!o.cast; g.add(m); return m;
    };
    const FLAT = [-Math.PI / 2, 0, 0];   // a moulded slab extrudes along z; this lays it on the floor

    // walls + trim — the planes overhang the frame; the cornice is the one line that says "room" at the top
    /* The walls' UVs are METRES (room pass, round 6), so the wallpaper's tile is the same size on both:
       v is the height above the floor, u runs along the back wall from its left end and carries on,
       reversed, down the side wall, so the print is continuous round the corner. With 0..1 UVs the
       4 m side wall squeezed the same repeat 30% narrower than the 5.6 m back wall. */
    const WALL = { backW: 5.6, leftW: 4.0, H: 3.2 };
    WALL.cornerU = R.leftX + WALL.backW / 2;   // back wall: u = x + W/2, so the corner sits here
    const metreUV = (geo, w, h, u0) => {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + u0, uv.getY(i) * h);
      return geo;
    };
    /* The side wall is turned +90° about y, so its local +x runs toward -z and u grows toward the corner
       (seen from the room that is still left-to-right, so the print is not mirrored). The corner is at
       local x = -backZ, i.e. 0..1 u = (W/2 - backZ)/W, and it must land on cornerU. */
    add('wallBack', metreUV(new THREE.PlaneGeometry(WALL.backW, WALL.H), WALL.backW, WALL.H, 0), mats.wall, [0.0, 1.6, R.backZ]);
    add('wallLeft', metreUV(new THREE.PlaneGeometry(WALL.leftW, WALL.H), WALL.leftW, WALL.H, WALL.cornerU - (WALL.leftW / 2 - R.backZ)), mats.wall, [R.leftX, 1.6, 0.0], [0, Math.PI / 2, 0]);
    // skirtingBack is built with the bookshelf below: it stops at the unit's sides (item 12)
    add('skirtingLeft', new THREE.BoxGeometry(0.02, 0.1, 4.0), mats.skirting, [R.leftX + 0.01, 0.05, 0.0]);
    add('cornice', new THREE.BoxGeometry(5.6, 0.06, 0.04), mats.skirting, [0.0, 3.17, R.backZ + 0.02]);
    add('floor', new THREE.PlaneGeometry(9, 9), mats.floor, [0.5, 0, 0.5], FLAT);

    // rug — round braided jute under the table; receives every table prop's contact shadow
    add('rug', new THREE.CylinderGeometry(0.88, 0.88, 0.012, 48), mats.rug, [R.tableX, 0.006, R.tableZ]);
    add('rugEdge', new THREE.TorusGeometry(0.88, 0.012, 8, 64), mats.rugEdge, [R.tableX, 0.008, R.tableZ], FLAT);

    /* Coffee table (top surface = tableTopY), right of centre so it is not stacked under the telly.
       The room pass, round 3: a thick top with EVERY edge rounded (a pillow with no puff — `moulded`
       only rounds an extrusion's profile) over an apron that ties the legs together, on square legs
       that taper to the floor. Top + apron are ONE merge, so the names the contact pass and the
       harness read are unchanged. The grain runs along OBJECT x (louGrain): the top and the long rails
       are built that way already; the end rails' outer faces sample (z,y), so their grain runs along
       them too; each leg is built lying along x and stood up by its mesh. */
    const TOP_T = 0.05, TOP_R = 0.018, LEG = 0.048, LEG_FOOT = 0.62, APRON_H = 0.07, APRON_T = 0.02;
    const legAt = [[-0.48, 0.22], [0.48, 0.22], [-0.48, -0.22], [0.48, -0.22]];
    const underY = -TOP_T / 2 - APRON_H / 2, railZ = 0.22 + LEG / 2 - APRON_T / 2 - 0.008, railX = 0.48 + LEG / 2 - APRON_T / 2 - 0.008;
    add('tableTop', lib.merge([
      [lib.pillow(1.1, TOP_T, 0.62, TOP_R, { band: 4, mid: 4 }), [0, 0, 0]],
      [lib.pillow(0.96, APRON_H, APRON_T, 0.004, { band: 2, mid: 2 }), [0, underY, railZ]],
      [lib.pillow(0.96, APRON_H, APRON_T, 0.004, { band: 2, mid: 2 }), [0, underY, -railZ]],
      [lib.pillow(APRON_T, APRON_H, 0.44, 0.004, { band: 2, mid: 2 }), [railX, underY, 0]],
      [lib.pillow(APRON_T, APRON_H, 0.44, 0.004, { band: 2, mid: 2 }), [-railX, underY, 0]],
    ]), mats.walnut, [R.tableX, R.tableTopY - TOP_T / 2, R.tableZ], null, { cast: true });
    const legH = R.tableTopY - TOP_T;
    const legGeo = () => {   // lying along x, foot at -x: every cross-section scales toward the foot
      const geo = lib.pillow(legH, LEG, LEG, 0.007, { band: 3, mid: 4 }), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const s = LEG_FOOT + (1 - LEG_FOOT) * (p.array[i * 3] / legH + 0.5);
        p.array[i * 3 + 1] *= s; p.array[i * 3 + 2] *= s;
      }
      return geo;
    };
    legAt.forEach(([x, z], i) =>
      add('tableLeg' + i, legGeo(), mats.walnut, [R.tableX + x, legH / 2, R.tableZ + z], [0, 0, Math.PI / 2], { cast: true }));

    /* TV bench, slightly LEFT of centre (the table is right). The room pass, round 5 (24 Sep 2026,
       revised to the owner's reference, a mid-century oak media unit): a thin crisp top with a small
       overhang, two full-height drawer fronts, an OPEN centre bay with a shelf, on a rail frame
       whose tapered corner legs splay. The bay holds the Play-Max deck (spec § 6 — it had been
       sealed inside the old solid body) and a floppy-disk box (item 14). Three meshes of oak:
       `bench` (the carcass, one merge), the two fronts, and `benchBase` (rails + legs). The grain
       runs along object x. The bay's darkness is baked into the carcass's vertex colours: the
       contact shade skips a point INSIDE its own occluder box, so without it the bay would light
       as brightly as the front. */
    const BX = -0.15, BENCH = { W: 1.9, D: 0.46, Y0: 0.13, TOP_T: 0.025, TOP_OH: 0.012, CW: 0.62, PANEL: 0.02,
      SHELF_Y: 0.305, GAP: 0.003, DOOR_T: 0.02, RAIL_H: 0.035, LEG: 0.042, SPLAY: 0.2, SPLAY_Z: 0.12 };
    const B = BENCH; B.TOP0 = R.benchTopY - B.TOP_T; B.CH = B.TOP0 - B.Y0; B.BW = (B.W - B.CW) / 2;
    // world-space box of the open bay, the one place inside the stand anything may sit
    B.open = { x: [BX - B.CW / 2, BX + B.CW / 2], y: [B.Y0 + B.PANEL, B.TOP0], z: [R.benchZ - B.D / 2 + 0.012, R.benchZ + B.D / 2] };
    /* Cavity: 1 at the bay's mouth, darkening toward its back. Every oak geometry carries a colour
       attribute (white outside the bay) — a vertexColors material with none reads BLACK. */
    const cavity = (x, y, z) => (Math.abs(x) < B.CW / 2 + 0.006 && y > B.Y0 - 1e-3 && y < B.TOP0 + 1e-3)
      ? 1 - 0.68 * Math.pow(Math.min(1, Math.max(0, (B.D / 2 - z) / B.D)), 0.8) : 1;
    const tint = (geo, f) => {
      const p = geo.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = f ? f(p.getX(i), p.getY(i), p.getZ(i)) : 1; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
    };
    const blockX = B.CW / 2 + B.BW / 2;
    add('bench', tint(lib.merge([
      [lib.pillow(B.W + 2 * B.TOP_OH, B.TOP_T, B.D + B.TOP_OH, 0.005, { band: 2, mid: 6 }), [0, B.TOP0 + B.TOP_T / 2, B.TOP_OH / 2]],
      // the two drawer carcasses, set back by a front's thickness; their inner faces are the bay's sides
      [lib.pillow(B.BW, B.CH, B.D - B.DOOR_T, 0.004, { band: 2, mid: 1 }), [-blockX, B.Y0 + B.CH / 2, -B.DOOR_T / 2]],
      [lib.pillow(B.BW, B.CH, B.D - B.DOOR_T, 0.004, { band: 2, mid: 1 }), [blockX, B.Y0 + B.CH / 2, -B.DOOR_T / 2]],
      // the bay: floor, back and shelf, each running 5 mm into the carcasses so no seam opens
      [lib.pillow(B.CW + 0.01, B.PANEL, B.D, 0.003, { band: 2, mid: 2 }), [0, B.Y0 + B.PANEL / 2, 0]],
      [lib.pillow(B.CW + 0.01, B.CH, 0.012, 0.002, { band: 2, mid: 2 }), [0, B.Y0 + B.CH / 2, -B.D / 2 + 0.006]],
      [lib.pillow(B.CW + 0.01, 0.018, B.D - 0.03, 0.003, { band: 2, mid: 2 }), [0, B.SHELF_Y, -0.015]],
    ]), cavity), mats.oak, [BX, 0, R.benchZ], null, { cast: true });
    /* Full-height fronts over each carcass, a 3 mm reveal all round, their faces flush with the bay's
       floor edge. Each is built off its own origin (the left one shifted up the tile) so the two show
       different boards, not one board twice. */
    const frontZ = R.benchZ + B.D / 2, DH = B.CH - 2 * B.GAP, DW = B.BW - 2 * B.GAP;
    [['L', -1, 0.31], ['R', 1, 0]].forEach(([s, side, shift]) => {
      const x = BX + side * blockX, y = B.Y0 + B.CH / 2;
      const geo = tint(lib.pillow(DW, DH, B.DOOR_T, 0.004, { band: 2, mid: 1 })); geo.translate(0, shift, 0);
      add('benchDrawer' + s, geo, mats.oak, [x, y - shift, frontZ - B.DOOR_T / 2]);
      // the pull, centred high on the front — a knob at the wide camera, an acorn up close
      add('benchKnob' + s, louAcornGeometry(lib), mats.acorn, [x, B.Y0 + B.CH * 0.72, frontZ]);
    });
    /* The base: a rail frame tucked under the carcass, on tapered legs — four corner legs splayed out
       and back (the mid-century stance), two plain ones under each side of the bay. Built lying along
       x and stood up by each part's rotation, so the grain runs down every leg; then the whole base
       is lifted so its lowest point is exactly the floor. */
    const benchLegGeo = (len) => {
      const geo = lib.pillow(len, B.LEG, B.LEG, 0.006, { band: 2, mid: 1 }), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const s = 0.6 + 0.4 * (p.array[i * 3] / len + 0.5); p.array[i * 3 + 1] *= s; p.array[i * 3 + 2] *= s; }
      return geo;
    };
    const bRailY = B.Y0 - B.RAIL_H / 2 + 0.004, bRailZ = B.D / 2 - 0.05, bRailX = B.W / 2 - 0.05, legTop = B.Y0 - 0.01;
    const legs = [];
    const leg = (x, z, a, e) => {   // top at (x, legTop, z); foot swung by a (about z) and e (about x)
      const len = legTop / (Math.cos(a) * Math.cos(e)), d = [Math.sin(a), -Math.cos(a) * Math.cos(e), -Math.cos(a) * Math.sin(e)];
      legs.push([benchLegGeo(len), [x + d[0] * len / 2, legTop + d[1] * len / 2, z + d[2] * len / 2], [e, 0, Math.PI / 2 + a]]);
    };
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => leg(sx * (bRailX - 0.02), sz * (bRailZ - 0.01), sx * B.SPLAY, -sz * B.SPLAY_Z)));
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => leg(sx * B.CW / 2, sz * (bRailZ - 0.01), 0, -sz * 0.04)));
    const base = lib.merge([
      [lib.pillow(2 * bRailX + 0.03, B.RAIL_H, 0.026, 0.004, { band: 2, mid: 1 }), [0, bRailY, bRailZ]],
      [lib.pillow(2 * bRailX + 0.03, B.RAIL_H, 0.026, 0.004, { band: 2, mid: 1 }), [0, bRailY, -bRailZ]],
      [lib.pillow(0.026, B.RAIL_H, 2 * bRailZ, 0.004, { band: 2, mid: 1 }), [bRailX, bRailY, 0]],
      [lib.pillow(0.026, B.RAIL_H, 2 * bRailZ, 0.004, { band: 2, mid: 1 }), [-bRailX, bRailY, 0]],
    ].concat(legs));
    base.computeBoundingBox(); base.translate(0, -base.boundingBox.min.y, 0);
    add('benchBase', tint(base), mats.oak, [BX, 0, R.benchZ], null, { cast: true });
    // the bay's contents: the Play-Max deck on the shelf, the floppy-disk box under it (one mesh), and the box's smoked lid
    const cub = louCubbyGeometry(lib, B, cavity);
    add('cubby', cub.geometry, mats.cubby, [BX, 0, R.benchZ]);
    add('cubbyLid', cub.lid, mats.diskLid, [BX, 0, R.benchZ], null, { receive: false });
    B.diskBox = cub.box;

    /* Bookshelf: a LOW floor-standing unit right of the bench. The frame's top edge crosses the
       back wall at only ~1.37 m from this camera, so a wall-mounted unit at chest height is simply
       out of shot — every board has to live below that. The photo-carousel lamp takes the lowest
       board (owner, 19 Sep 2026) where it is nearest the eye and a real tap target; the two boards
       above it are dressed with books and toys (item 15, lou-props louBuildShelf). */
    /* x sits clear of the bench's right edge (0.80) by a visible gap, not a hairline. */
    const S = { x: 1.52, w: 0.80, d: 0.22, ys: [0.42, 0.80, 1.18], side: 0.02, h: 1.35 }; S.z = R.backZ + S.d / 2;
    /* The room pass, item 12 (25 Sep 2026): the unit brought up to the table's and the stand's finish —
       no new objects on it. Birch in object-space grain (mats.birchGrain), every edge rounded, a bullnose
       top, and a one-piece back (owner: planks were too busy). As in the owner's mockup, a BOTTOM
       board (shelfBoardBase, top at 10 cm) sits under the lamp's board, with no apron under it: the
       sides stand as legs, and between them a short gap (8 cm) runs to the floor, open and in shadow,
       backed by the back panel. The gap is kept free on purpose (S.under). The sides are built
       lying along x and stood up by their mesh, so the grain runs up them. The contact shade skips a
       point inside its own box, and every inner face of an open shelf is inside it, so each bay's
       darkness is BAKED into the vertex colours, as the bench's bay is: darker toward the back, under
       the board above, and into the corners. The names, S, and the back's face (backZ + 0.01, where
       the lamp draws its pool) are unchanged. Unit frame below: X, Y, Z about (S.x, 0, S.z).
       The rows are a BUDGET, measured: the same shelf at 13.3k triangles cost +4.6% held-state, at
       5.6k +2.7%, and the two are indistinguishable at 2×. Add rows only where a gradient needs them. */
    const SH = { TOP_T: 0.025, BOARD_T: 0.02, SET: 0.004, BASE_Y: 0.09 };
    SH.IW = S.w / 2 - S.side / 2; SH.ZF = S.d / 2; SH.ZB = -S.d / 2 + 0.01; SH.UNDER = S.h - SH.TOP_T / 2;
    const boardYs = [SH.BASE_Y].concat(S.ys), hb = SH.BOARD_T / 2;
    // the floor is the gap's floor, so it counts as a surface below it
    const tops = [0].concat(boardYs.map(y => y + hb)), bottoms = boardYs.map(y => y - hb).concat([SH.UNDER]);
    // the base board's top, and the world-space box of the gap under it: floor to board, side to side, back panel to front
    S.inner = SH.IW; S.baseY = SH.BASE_Y + hb;
    S.under = { x: [S.x - SH.IW, S.x + SH.IW], y: [0, SH.BASE_Y - hb], z: [S.z + SH.ZB, S.z + SH.ZF] };
    const shelfCav = (X, Y, Z, ny, nz) => {
      if (Math.abs(X) > SH.IW + 0.002 || Y > SH.UNDER + 0.002) return 1;        // the outer faces and the top
      if (nz > 0.5 && Z > SH.ZF - 0.02) return 1;                               // front edges: at the mouth
      const depth = Math.min(1, Math.max(0, (SH.ZF - Z) / (SH.ZF - SH.ZB)));
      if (boardYs.some(y => Math.abs(Y - y) < hb - 0.001)) return 1 - 0.3 * depth;   // a board's own edge, inside its thickness
      const above = Math.min(...bottoms.filter(b => b >= Y - 1e-4)), below = Math.max(...tops.filter(t => t <= Y + 1e-4));
      const du = above - Y, dl = Y - below, ds = SH.IW - Math.abs(X);
      let o = 0.4 * Math.pow(depth, 0.9) + 0.2 * Math.exp(-du / 0.045) * (0.35 + 0.65 * depth)
        + 0.1 * Math.exp(-dl / 0.02) * depth + 0.16 * Math.exp(-ds / 0.03) * (0.3 + 0.7 * depth);
      if (ny < -0.5) o += 0.12;                                                  // a board's underside sees only the bay
      // the gap under the base board is near-black in the mockup: low, deep and shut in on three sides
      if (Y < SH.BASE_Y - hb) return 1 - Math.min(0.84, o + 0.12 + 0.3 * depth);
      return 1 - Math.min(0.7, o);
    };
    /* the shelf's dressing (item 15, lou-props louBuildShelf) bakes its contents with this same term, so
       a book darkens toward the back and under the board above exactly as the bay around it does; and
       it needs the top bay's ceiling, the underside of the top */
    S.cav = shelfCav; S.topUnder = SH.UNDER;
    // colour a geometry by where its vertices land in the unit frame, once placed at pos with rot
    const shelfBake = (geo, pos, rot, k = 1) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), v = new THREE.Vector3(), n = new THREE.Vector3();
      const p = geo.attributes.position, nr = geo.attributes.normal, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyQuaternion(q).add(new THREE.Vector3(pos[0] - S.x, pos[1], pos[2] - S.z));
        n.fromBufferAttribute(nr, i).applyQuaternion(q);
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * shelfCav(v.x, v.y, v.z, n.y, n.z);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
    };
    const shelfPart = (name, geo, pos, rot, shift, cast = true) => {   // shift: slide the geometry along its grain so no two boards show the same figure
      if (shift) { geo.translate(shift, 0, 0); const d = new THREE.Vector3(-shift, 0, 0).applyEuler(new THREE.Euler(...(rot || [0, 0, 0]))); pos = [pos[0] + d.x, pos[1] + d.y, pos[2] + d.z]; }
      return add(name, shelfBake(geo, pos, rot), mats.birchGrain, pos, rot, { cast });
    };
    const UP = [0, 0, Math.PI / 2];
    /* The back wall's skirting, in two runs that stop at the unit's sides. Its face is backZ + 0.02, a
       centimetre PROUD of the shelf's back, so run straight through it showed as a white band in the
       gap under the base board. */
    { const x0 = -WALL.backW / 2, x1 = S.x - S.w / 2 - S.side / 2, x2 = S.x + S.w / 2 + S.side / 2, x3 = WALL.backW / 2;
      add('skirtingBack', lib.merge([[new THREE.BoxGeometry(x1 - x0, 0.1, 0.02), [(x0 + x1) / 2, 0, 0]], [new THREE.BoxGeometry(x3 - x2, 0.1, 0.02), [(x2 + x3) / 2, 0, 0]]]),
        mats.skirting, [0, 0.05, R.backZ + 0.01]); }
    // the sides: floor to 3 mm into the top, lying along x and stood up
    const sideLen = SH.UNDER + 0.003;
    [['L', -1, 0.37], ['R', 1, 0]].forEach(([s, sx, shift]) =>
      shelfPart('shelfSide' + s, lib.pillow(sideLen, S.side, S.d, 0.004, { band: 1, mid: [18, 1, 2] }), [S.x + sx * S.w / 2, sideLen / 2, S.z], UP, shift));
    // the boards: 5 mm into each side, 3 mm into the back, set 4 mm behind the sides' front edge
    const boardD = SH.ZF - SH.SET - SH.ZB + 0.003, boardZ = S.z + (SH.ZF - SH.SET + SH.ZB - 0.003) / 2;
    const board = () => lib.pillow(2 * SH.IW + 0.01, SH.BOARD_T, boardD, 0.003, { band: 1, mid: [8, 1, 3] });
    S.ys.forEach((y, i) => shelfPart('shelfBoard' + i, board(), [S.x, y, boardZ], null, [0.21, 0.47, 0.83][i]));
    shelfPart('shelfBoardBase', board(), [S.x, SH.BASE_Y, boardZ], null, 0.6);   // under the lamp's board; its own name, so S.ys keeps meaning "the three the props use"
    // the top: 2 cm proud of the sides and the front, flush to the wall, its edge a soft bullnose
    shelfPart('shelfTop', lib.pillow(S.w + 0.04, SH.TOP_T, S.d + 0.02, 0.009, { band: 3, mid: [4, 1, 2] }), [S.x, S.h, S.z + 0.01], null, 0.12);
    /* The back: ONE plain panel, the grain running up it. It was eight V-groove boards, and the owner
       found them too busy; the last board, a shade lighter than its neighbour, read as a post in the
       corner. Still a grid rather than a box: only its face is ever seen, and a grid puts its rows where
       the bays' gradients run (every 6 cm, plus one at each board face) and its columns close to the
       sides, where the corners darken. Built in unit X/Y and handed to a mesh turned UP, so the grain
       (object x) runs vertically. Its face is exactly backZ + 0.01. */
    {
      const W = 2 * SH.IW + 0.01, rows = [], xs = [];
      [0, 0.012, 0.035, 0.07].forEach(e => xs.push(-W / 2 + e, W / 2 - e));
      for (let x = -0.3; x <= 0.3 + 1e-6; x += 0.1) xs.push(x);
      const cols = [...new Set(xs.map(x => +x.toFixed(4)))].sort((a, b) => a - b);
      for (let y = 0; y < SH.UNDER + 0.002; y += 0.06) rows.push(y);
      rows.push(SH.UNDER + 0.002); tops.concat(bottoms).forEach(y => rows.push(y));
      const Ys = [...new Set(rows.map(y => +y.toFixed(4)))].sort((a, b) => a - b), cy = (SH.UNDER + 0.002) / 2;
      const pos = [], colr = [], idx = [];
      Ys.forEach(Y => cols.forEach(c => {
        pos.push(Y - cy, -c, SH.ZB);   // unit (X, Y, Z) → the mesh's local frame, undone by UP
        const v = shelfCav(c, Y, SH.ZB, 0, 1); colr.push(v, v, v);
      }));
      const nc = cols.length;
      for (let r = 0; r < Ys.length - 1; r++) for (let c = 0; c < nc - 1; c++) {
        const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1; idx.push(a, d, b, b, d, e);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
      geo.setIndex(idx); geo.computeVertexNormals();
      // face the room: the winding above depends on the UP turn, so check it rather than trust it
      if (geo.attributes.normal.getZ(nc + 1) < 0) { idx.forEach((v, i) => { if (i % 3 === 1) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; } }); geo.setIndex(idx); geo.computeVertexNormals(); }
      add('shelfBack', geo, mats.birchGrain, [S.x, cy, S.z], UP);
    }

    /* The U-shaped couch (owner, 19 Sep 2026, second pass). Three runs wrapping the coffee table
       on the left, the front and the right. The right run is the point of the U: that side of the
       room has no wall, no door and nothing else to stop the eye, so the couch closes the space
       itself and the scene reads as somewhere enclosed rather than a set that runs out.

       Two measured constraints decide the numbers, not taste:
       - The bottom of frame crosses seat height at z = 0.72, so the FRONT run must reach back past
         that or its whole length sits below the shot — which is what happened the first time.
       - Every back panel must OVERLAP its seat, not merely touch it. Boxes that meet on an exact
         plane still read as two objects: both pieces are moulded with rounded edges, so at the
         shared line each one curves away and leaves a groove with the floor showing through it.
         The backs therefore reach 6 cm into the seat horizontally and run down to the floor,
         the way a real couch's back panel continues down behind the cushion. */
    const BACK_H = 0.41, BACK_T = 0.13, BACK_BITE = 0.06;
    /* frontZ1 sits BEHIND the camera (z 1.50), so the front back-rest is what we are leaning on
       rather than a pale wall across the bottom of the shot — which is what it was at 1.35. The
       arms are wide enough to leave the table its air; a tighter U swallowed the rug whole. */
    const U = { frontZ0: 0.55, frontZ1: 1.50, armZ0: -0.30, armZ1: 0.60, leftX: -0.95, rightX: 1.55, innerL: -0.42, innerR: 1.10 };
    // the back's own thickness: its own + the bite it takes out of the seat
    const backT = BACK_T + BACK_BITE;
    const backOff = BACK_T / 2 - BACK_BITE / 2;   // centre offset from the seat's outer face
    const span = (a, b) => b - a, mid = (a, b) => (a + b) / 2;

    /* The room pass, round 2 (24 Sep 2026): upholstered, not moulded. Each named piece is now a
       MERGE of its parts (lib.pillow: every edge rounded, faces that swell), so the names the
       contact pass and the harness key on still hold, and the couch draws as nine meshes, not
       thirty. A seat run is a base on a recessed plinth with separate cushions on top; a back is
       a tight back, one stuffed panel with a rolled top (the mockup's is tight, not loose
       cushions); an arm is a fat roll that caps the back's thickness too. Piping follows the
       cushion tops and the arms' ends, as one extra mesh (on a back, a closed seam loop drew
       long vertical lines down the panel; the mockup's back has none worth that). */
    const CUSH_R = 0.07, CUSH_PUFF = 0.034, BASE_TOP = 0.26, PLINTH_H = 0.045, PLINTH_IN = 0.035, CUSH_GAP = 0.012;
    const seams = [];   // [geometry, position] — every piping cord, merged into one mesh at the end
    const faces = {};   // name → the piece's real surface (louPillowFace), for the throw cushions to settle on
    const pil = (S, r, puff, opt = {}) => lib.pillow(S[0] * 2, S[1] * 2, S[2] * 2, r, Object.assign({ puff }, opt));
    /* A pillow of half-sizes S whose TOP lands exactly on `top` once its puff is in — so the harness's
       "seat top equals seatTopY" still holds for a crowned cushion. */
    const topAt = (top, S, puff) => top - S[1] - ((puff && puff['+y']) || 0);
    /* One seat run: x0..x1 by z0..z1 footprint, cushions split along `along` ('x' or 'z'), their
       fronts facing `front` ('-z', '+x', '-x'); the cushions start `backAt` in from the back side. */
    function seatRun(name, x0, x1, z0, z1, cushions) {
      const cx = mid(x0, x1), cz = mid(z0, z1), parts = [];
      const baseS = [span(x0, x1) / 2, (BASE_TOP - PLINTH_H + 0.005) / 2, span(z0, z1) / 2];
      parts.push([pil(baseS, 0.045, null, { mid: 4 }), [0, PLINTH_H - 0.005 + baseS[1], 0]]);
      parts.push([pil([baseS[0] - PLINTH_IN, PLINTH_H / 2, baseS[2] - PLINTH_IN], 0.01, null, { band: 2, mid: 1 }), [0, PLINTH_H / 2, 0]]);
      cushions.forEach(c => {
        const S = [span(c.x0, c.x1) / 2 - CUSH_GAP / 2, 0, span(c.z0, c.z1) / 2 - CUSH_GAP / 2];
        S[1] = (R.seatTopY - CUSH_PUFF - BASE_TOP + 0.01) / 2;
        const puff = { '+y': CUSH_PUFF, [c.front]: 0.018 };
        const y = topAt(R.seatTopY, S, puff);
        parts.push([pil(S, CUSH_R, puff, { mid: 8 }), [mid(c.x0, c.x1) - cx, y, mid(c.z0, c.z1) - cz]]);
        (faces[name] = faces[name] || []).push(louPillowFace([mid(c.x0, c.x1), y, mid(c.z0, c.z1)], S, CUSH_R, puff, '+y'));
        seams.push([lib.seam(S, CUSH_R, '+y'), [mid(c.x0, c.x1), y, mid(c.z0, c.z1)]]);
      });
      const m = add(name, lib.merge(parts), mats.fabric, [cx, 0, cz], null, { cast: true });
      m.userData.louCushions = cushions.length;   // merged away, so recorded for the harness
      return m;
    }
    // the backs' and arms' inner faces, which bound the cushions
    const backIn = { front: U.frontZ1 + backOff - backT / 2, left: U.leftX - backOff + backT / 2, right: U.rightX + backOff - backT / 2 };
    const ARM_D = 0.30, ARM_R = 0.10, armZ1 = U.armZ0 + BACK_BITE, armZ0 = armZ1 - ARM_D;   // bites the seat by BACK_BITE, as before
    const PROUD = 0.012;   // a cushion's front stands a touch proud of its base, as a real one does
    const frontX = [backIn.left, backIn.right], third = span(frontX[0], frontX[1]) / 3;
    seatRun('seatFront', U.leftX - 0.025, U.rightX + 0.025, U.frontZ0, U.frontZ1,
      [0, 1, 2].map(i => ({ x0: frontX[0] + i * third, x1: frontX[0] + (i + 1) * third, z0: U.frontZ0 - PROUD, z1: backIn.front + 0.02, front: '-z' })));
    seatRun('seatLeft', U.leftX, U.innerL, U.armZ0, U.armZ1,
      [{ x0: backIn.left - 0.02, x1: U.innerL + PROUD, z0: armZ1 - 0.01, z1: U.frontZ0, front: '+x' }]);
    seatRun('seatRight', U.innerR, U.rightX, U.armZ0, U.armZ1,
      [{ x0: U.innerR - PROUD, x1: backIn.right + 0.02, z0: armZ1 - 0.01, z1: U.frontZ0, front: '-x' }]);

    /* Backs: floor to the rolled top, each still biting into its seat (the harness's overlap rule —
       two pieces that only touch leave a groove with the floor showing through it). The seat face
       swells; the top rolls. */
    const BACK_TOP = R.seatTopY + BACK_H, BACK_R = 0.085;
    function back(name, cx, cz, S, face) {
      const puff = { [face]: 0.035, '+y': 0.018 };
      const y = topAt(BACK_TOP, S, puff);
      faces[name] = louPillowFace([cx, y, cz], S, BACK_R, puff, face);
      return add(name, pil(S, BACK_R, puff), mats.fabric, [cx, y, cz], null, { cast: true });
    }
    const backS = (a, b) => [a / 2, (BACK_TOP - 0.018 - 0.03) / 2, b / 2];
    back('backFront', mid(U.leftX, U.rightX), U.frontZ1 + backOff, backS(span(U.leftX, U.rightX) + 0.05, backT), '-z');
    back('backLeft', U.leftX - backOff, mid(U.armZ0, U.frontZ1), backS(backT, span(U.armZ0, U.frontZ1)), '+x');
    back('backRight', U.rightX + backOff, mid(U.armZ0, U.frontZ1), backS(backT, span(U.armZ0, U.frontZ1)), '-x');

    /* Arms: a fat roll capping each open end of the U, wide enough to cover the back's thickness
       so the outer sides run flush, and standing a touch proud of the cushions at the table end. */
    function arm(name, x0, x1, end) {
      const S = [span(x0, x1) / 2, 0, ARM_D / 2], puff = { '+y': 0.014, [end]: 0.02, '+z': 0.012 };
      S[1] = (R.armTopY - 0.014 - PLINTH_H + 0.005) / 2;
      const cx = mid(x0, x1), cz = mid(armZ0, armZ1), y = topAt(R.armTopY, S, puff);
      seams.push([lib.seam(S, ARM_R, end), [cx, y, cz]]);
      return add(name, lib.merge([
        [pil(S, ARM_R, puff, { mid: 6 }), [0, y, 0]],
        [pil([S[0] - PLINTH_IN, PLINTH_H / 2, S[2] - PLINTH_IN], 0.01, null, { band: 2, mid: 1 }), [0, PLINTH_H / 2, 0]],
      ]), mats.fabric, [cx, 0, cz], null, { cast: true });
    }
    arm('armLeft', backIn.left - backT, U.innerL + 0.02, '+x');
    arm('armRight', U.innerR - 0.02, backIn.right + backT, '-x');
    add('couchPiping', lib.merge(seams), mats.fabricPiping, [0, 0, 0]);

    /* The throw cushions (room pass, round 7): two corner clusters, each where a back meets its arm,
       which is where the camera actually sees the couch. The planes they settle against are the
       couch's own faces, measured from the numbers above, not guessed. */
    /* Each face is a function of the point, read off the couch piece's own shape: the seat's crown and
       the back's swell are real, so a cushion settles into them instead of through them (a flat plane at
       the back's corner let the lumbar sink 1.7 cm into its swell further along). A cushion sinks a
       centimetre into the seat and a few millimetres into the back, as soft things do. Off a piece's
       footprint the seat falls back to its base; the back simply stops constraining. */
    const along = (fn, fallback, sink, sign) => (p) => { const v = fn(p); return v === null ? fallback : sign * (v - sign * sink); };
    /* The seat under a cushion is the highest of the seat cushions there: a side run's own, and the
       front run's where the two meet (the round sits across that seam, at the near end of the left run). */
    const seatOf = (...runs) => (p) => { let top = null; runs.forEach(r => faces[r].forEach(fn => { const v = fn(p); if (v !== null && (top === null || v > top)) top = v; })); return top; };
    const cushionFaces = {
      seatY: R.seatTopY - 0.012,   // where a cushion's foot is first set down, before it settles
      left:  { seat: along(seatOf('seatLeft', 'seatFront'), BASE_TOP, 0.015, 1), back: along(faces.backLeft, -Infinity, 0.004, 1), backX: backIn.left, armZ: armZ1 + 0.003 },
      right: { seat: along(seatOf('seatRight', 'seatFront'), BASE_TOP, 0.015, 1), back: along(faces.backRight, -Infinity, 0.004, -1), backX: backIn.right, armZ: armZ1 + 0.003 },
      armTopY: R.armTopY,
    };
    const cush = louBuildCushions(lib, cushionFaces);
    const cm = add('cushions', cush.geometry, mats.cushion, [0, 0, 0], null, { cast: true });
    cm.userData.louCushions = cush.list; cm.userData.louCushionBoxes = cush.boxes;

    // window on the LEFT wall — the visible source of the key. Centre sits toward the back so the
    // whole opening is in frame from the couch.
    const WZ = -1.05, WY = 1.25, WW = 0.72, WH = 1.1, Y0 = WY - WH / 2;
    /* The room pass, round 8b (24 Sep 2026), to the owner's render. Round 8's frame was four boxes and
       its sill a 4 cm plank: under the bar the polished pieces set (owner). Now every piece is swept
       (louRibbon), turned (a lathe) or a rounded box (louPillow), and none has a hard edge. Each is
       built along its own x and turned onto the wall by ONWALL, so the oak's grain runs along the sill
       and the rod. */
    const ONWALL = [0, Math.PI / 2, 0];   // local x → world −z (along the wall), local z → world +x (into the room)
    const QTR = Math.PI / 2;
    const arc = (cx, cy, rad, a0, a1, n = 5) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; });
    // the glass: the garden, looked up by view direction (louWindowView). 4 cm over the opening, so the sash always laps it.
    const glass = add('window', new THREE.PlaneGeometry(WW + 0.04, WH + 0.04), mats.window, [R.leftX + 0.003, WY, WZ], ONWALL, { receive: false });
    glass.userData.louOpening = { z: [WZ - WW / 2, WZ + WW / 2], y: [Y0, Y0 + WH] };   // the clear opening, for the harness's view rays
    /* The CASING: a moulded surround 5.5 cm deep, standing in for the wall's thickness (the wall is a
       plane, so the reveal stands proud rather than cut in). The profile runs from the opening's edge:
       the lining out to a rounded arris, a narrow face, a cove down to the outer field, and a round-over
       back to the wall. Its rectangle runs a sill's thickness below the glass, so the sill board is the
       reveal's floor and the casing's bottom rail is the apron under it. The SASH sits just proud of the
       glass: a glazing bead, a step, and a broad rail with rounded inner corners, as the render has.
       Its profile runs on past the opening into the casing and the sill, so no corner shows a gap.
       A repeated point is a crease: the strip's normals are shared along it otherwise. */
    const SILL = { t: 0.028, d: 0.078, ear: 0.025 }, CAS = { d: 0.055, w: 0.055 }, SASH = 0.05;
    const casing = [[0, 0], ...arc(0.009, CAS.d - 0.009, 0.009, Math.PI, QTR), [0.018, CAS.d],
      ...arc(0.026, CAS.d, 0.008, Math.PI, 1.5 * Math.PI), ...arc(CAS.w - 0.01, CAS.d - 0.018, 0.01, QTR, 0), [CAS.w, 0]];
    const sash = [[0, 0], ...arc(0.005, 0.004, 0.005, Math.PI, QTR, 4), [0.010, 0.009], [0.010, 0.009],
      ...arc(0.017, 0.017, 0.007, Math.PI, QTR), [0.085, 0.024], [0.085, 0.024], [0.085, 0]];
    const rect = (w, h, r) => [[-w / 2, -h / 2, r], [w / 2, -h / 2, r], [w / 2, h / 2, r], [-w / 2, h / 2, r]];
    add('windowFrame', lib.merge([
      [lib.ribbon(rect(WW, WH + SILL.t, 0.004), casing, 0.05), [0, -SILL.t / 2, 0]],
      [lib.ribbon(rect(WW - 2 * SASH, WH - 2 * SASH, 0.014), sash, 0.05), [0, 0, 0]],
    ]), mats.skirting, [R.leftX, WY, WZ], ONWALL);
    // two brass pulls on the sash's bottom rail, as in the render
    const pull = (x) => [
      [new THREE.CylinderGeometry(0.0034, 0.0034, 0.058, 12), [x, 0, 0.013], [0, 0, QTR]],
      [new THREE.SphereGeometry(0.0036, 12, 8), [x - 0.029, 0, 0.013]], [new THREE.SphereGeometry(0.0036, 12, 8), [x + 0.029, 0, 0.013]],
      [new THREE.CylinderGeometry(0.0024, 0.003, 0.013, 8), [x - 0.022, 0, 0.0065], [QTR, 0, 0]],
      [new THREE.CylinderGeometry(0.0024, 0.003, 0.013, 8), [x + 0.022, 0, 0.0065], [QTR, 0, 0]],
    ];
    add('windowPulls', lib.merge([...pull(-0.16), ...pull(0.16)]), mats.brass, [R.leftX + 0.024, Y0 + 0.017, WZ], ONWALL);
    /* The SILL: an oak board with a bullnose all round, its top level with the glass's foot. It sits in
       the reveal and runs 2.3 cm past the casing's face and 2.5 cm past each side: the curtains still
       hang clear in front of it (the owner's round-8 defect, which the harness now walks vertex by vertex). */
    R.sillTopY = Y0;
    add('sill', tint(lib.pillow(WW + 2 * CAS.w + 2 * SILL.ear, SILL.t, SILL.d + 0.004, 0.011)), mats.oak, [R.leftX + (SILL.d - 0.004) / 2, Y0 - SILL.t / 2, WZ], ONWALL, { cast: true });
    /* Drawn OPEN and tied back, a half to each side (the mockup). The halves still do NOT cast: the
       linen is thin, so the sun comes in round and through it either way, and the light rig stays as
       tuned (spec D5's drawn curtain never cast either). The slit light in lounge-scene.js now reads as
       the beam through the open window. The rod runs 12 cm past the casing's opening at the open end,
       so each half stacks on WALL, not glass, and only its swag crosses the frame, as a real pair does.
       Round 8b: the rod stands 10.5 cm off the wall (was 8), to clear the casing, and it is turned:
       a 12 mm oak pole on bracket, a ball finial at the open end, a socket plate on the back wall at the
       corner, where a rod run into a corner is fixed. Rings carry each half at its heading's pleats. */
    const ROD_X = 0.105, ROD_Y = 2.02, ROD_R = 0.012, ROD = [R.backZ + 0.008, WZ + WW / 2 + 0.155], ROD_C = (ROD[0] + ROD[1]) / 2;
    const rodLen = ROD[1] - ROD[0], onRod = (z) => -(z - ROD_C);   // world z → the rod's local x
    const CURTAIN = { top: 0.30, folds: 5, a0: 0.012 };           // louCurtainGeometry's own defaults, which place the rings
    const HALVES = [['curtainL', R.backZ + 0.055, 1], ['curtainR', ROD[1] - 0.02, -1]];
    const finial = [[0, 0], [0.017, 0], [0.018, 0.002], [0.018, 0.008], [0.016, 0.010], [0.010, 0.013], [0.009, 0.016], [0.011, 0.019]];
    for (let i = 1; i <= 12; i++) { const t = -Math.PI / 3 + (i / 12) * (Math.PI / 2 + Math.PI / 3); finial.push([0.022 * Math.cos(t), 0.038 + 0.022 * Math.sin(t)]); }
    const bracket = (x) => [
      [new THREE.CylinderGeometry(0.02, 0.021, 0.006, 20), [x, 0, 0.003], [QTR, 0, 0]],                           // the wall plate
      [new THREE.CylinderGeometry(0.0055, 0.0065, ROD_X - ROD_R - 0.004, 10), [x, 0, (ROD_X - ROD_R - 0.004) / 2], [QTR, 0, 0]],   // the arm
      [new THREE.TorusGeometry(ROD_R + 0.004, 0.004, 8, 16, Math.PI), [x, 0, ROD_X], [0, QTR, Math.PI]],             // the cradle, under the pole
    ];
    const rings = [];
    HALVES.forEach(([, zOut, dir]) => { for (let k = 0; k <= CURTAIN.folds; k++) {
      const u = k < CURTAIN.folds ? (k + 0.25) / CURTAIN.folds : 1, z = zOut + dir * (CURTAIN.a0 + u * CURTAIN.top);
      rings.push([new THREE.TorusGeometry(0.019, 0.0035, 8, 24), [onRod(z), -0.0035, ROD_X], [0, QTR, 0]]);
    } });
    add('curtainRod', tint(lib.merge([
      [new THREE.CylinderGeometry(ROD_R, ROD_R, rodLen, 20), [0, 0, ROD_X], [0, 0, QTR]],
      [new THREE.LatheGeometry(finial.map(([r, y]) => new THREE.Vector2(r, y)), 20), [onRod(ROD[1]), 0, ROD_X], [0, 0, QTR]],
      [new THREE.CylinderGeometry(0.024, 0.024, 0.008, 24), [onRod(R.backZ + 0.004), 0, ROD_X], [0, 0, QTR]],          // the corner's socket plate
      [new THREE.CylinderGeometry(0.016, 0.016, 0.012, 20), [onRod(ROD[0] + 0.006), 0, ROD_X], [0, 0, QTR]],
      ...bracket(onRod(ROD[1] - 0.008)), ...bracket(onRod(WZ)),
      ...rings,
    ])), mats.oak, [R.leftX, ROD_Y, ROD_C], ONWALL);
    /* Neither casts NOR receives: the sun is the one caster, it stands outside behind the cloth, and
       nothing that casts stands between them (the walls don't), so the VSM lookup could only ever
       return "lit". Measured on the live scene, receiving was a third of the curtains' whole cost.
       Each band hooks to the wall on a brass hook behind the bundle's outer side (the render). */
    const half = (name, zOut, dir) => {
      const c = louCurtainGeometry(lib, Object.assign({ dir, off: ROD_X, yTop: ROD_Y - 0.03 }, CURTAIN));
      const m = add(name, c.geometry, mats.curtain, [R.leftX, 0, zOut], null, { cast: false, receive: false });
      add(name.replace('curtain', 'tieback'), louTiebackGeometry(lib, c.tie), mats.tieback, [R.leftX, 0, zOut], null, { receive: false });
      const t = c.tie, z = dir * (t.ac - t.ra * 0.45), reach = t.xb + 0.004;
      add(name.replace('curtain', 'tiebackHook'), lib.merge([
        [new THREE.CylinderGeometry(0.008, 0.009, 0.004, 16), [0.002, t.y, z], [0, 0, QTR]],
        [new THREE.CylinderGeometry(0.0022, 0.0022, reach, 8), [reach / 2, t.y, z], [0, 0, QTR]],
        [new THREE.SphereGeometry(0.0038, 10, 8), [reach, t.y + 0.003, z]],
      ]), mats.brass, [R.leftX, 0, zOut], null, { receive: false });
      m.userData.louTie = c.tie; return m;
    };
    HALVES.forEach(([name, zOut, dir]) => half(name, zOut, dir));   // the back half, stacked toward the corner, is the one the wide shot sees
    // the window light (room pass, item 9): a bloom over the frame and a few shafts to the sun's pool
    R.sunPool = [0.45, 0.05, -0.30];   // where the sun spot aims (lou-scene reads it) — the shafts land there too
    louBuildWindowLight(lib, g, { wallX: R.leftX, open: glass.userData.louOpening, sun: mats.window.map.userData.louSun, pool: R.sunPool });

    /* The cattails (owner, 19 Sep 2026) — furniture: no pick id, no design role. On a small birch
       ledge on the BACK wall, just past the back curtain's stack, as in the mockup: the old sill put
       them in the curtains' way. R.ledgeTopY is the ledge's top. */
    R.ledgeTopY = 0.74;
    const LEDGE = { x0: R.leftX + 0.16, x1: R.leftX + 0.44, d: 0.15 };
    /* Item 13 (25 Sep 2026): the ledge to the bookshelf's finish — the same grained birch, every edge
       rounded. birchGrain is vertex-coloured, so the ledge carries a flat white colour: nothing of it
       sits in a bay. */
    { const lg = lib.pillow(LEDGE.x1 - LEDGE.x0, 0.025, LEDGE.d, 0.006, { band: 2, mid: [4, 1, 2] });
      lg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(lg.attributes.position.count * 3).fill(1), 3));
      add('ledge', lg, mats.birchGrain, [(LEDGE.x0 + LEDGE.x1) / 2, R.ledgeTopY - 0.0125, R.backZ + LEDGE.d / 2], null, { cast: true }); }
    /* Built to the render's proportions at an 8 cm pot, then set 1.2× so it holds the room at the lounge
       mockup's size; forward of the ledge's centre so the leaves toward the wall stay off it. */
    const plant = louBuildPlant(lib); plant.scale.setScalar(1.2);
    plant.position.set((LEDGE.x0 + LEDGE.x1) / 2, R.ledgeTopY, R.backZ + LEDGE.d / 2 + 0.012); g.add(plant);

    /* The koala mug (room pass, round 4): the table's front-left corner, the one patch of the hero
       zone nothing uses — in front of the binder (which opens toward -x, away from it) and left of
       the phone. Face to the camera, so the handle stands in profile on the right, as the mockup's. */
    const mug = louBuildMug(lib); mug.position.set(R.tableX - 0.31, R.tableTopY, R.tableZ + 0.16); mug.rotation.y = -0.06; g.add(mug);
    /* The one thing in the shell that moves. It rides whatever frame the scene is already drawing and
       never asks for one, so it adds no frames — lounge-scene.js calls this and ignores the result. */
    g.userData.louTick = (now, reduced) => mug.userData.louTick(now, reduced);

    /* The puppy slippers (room pass, item 10): stepped out of on the left couch, as the mockup's are —
       SIDE BY SIDE, heels at the couch's base (x -0.42), toes pointing away from it into the room,
       turned a little toward the camera and splayed a touch, the way a pair falls when you slip out
       of them sitting down (owner, 25 Sep 2026: the first pose, staggered toes-to-camera, read as
       walked, not left). The table top overhangs to x -0.20, so the pair stands where the floor shows
       under its front edge; poses were chosen by raycast from the wide preset, and the harness holds
       the heels, the pairing, the ears and the faces. */
    R.rugTopY = 0.012;
    g.add(louBuildSlippers(lib, [
      { x: -0.309, y: R.rugTopY, z: -0.056, yaw: 1.09, scale: 0.86 },
      { x: -0.304, y: R.rugTopY, z: 0.056, yaw: 1.21, scale: 0.86, patch: [-0.02, 0.05, 0.015] },   // the near one; the patch is round its right eye (its -x)
    ]));

    // two prints on the shelf wall
    const print = (id, x, y, seed) => {
      add('print' + id, new THREE.BoxGeometry(0.22, 0.28, 0.02), mats.birchDark, [x, y, R.backZ + 0.01]);
      add('print' + id + 'Face', new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: tex.abstract(seed), roughness: .9 }), [x, y, R.backZ + 0.021]);
    };
    print('A', -0.88, 1.18, 1); print('B', -0.52, 1.06, 5);   // above the jukebox: over the telly they cluttered it

    g.userData.louRoom = R; g.userData.louShelf = S; g.userData.louBench = BENCH;
    return g;
  }

  /* ── Throw cushions (room pass, round 7 — 24 Sep 2026) ─────────────────────
     The owner's brief: shape and placement sell it more than the print. So each cushion is built
     the way a real one sits:
     1. SEWN: two faces stitched at a rim, plump in the middle and pinched to nothing at the seam,
        the sides drawn in so the corners stand out as ears, a piping cord round the seam. The
        round one is gathered to a covered button, its pleats radiating out.
     2. HANDLED: creases fanning in from each corner where the cover pulls, a soft fold where it
        bends, and a slump — the top flops forward over a bend, not a hinge.
     3. SETTLED: placed by hand, then PRESSED against the seat, the back, the arm and its neighbour.
        Anything past a plane is eased back onto it (a soft max, so the contact edge is rounded,
        not cut) and pushed sideways by part of what it lost, which is the bulge a squashed cushion
        makes. Two cushions that overlap are both pressed to a plane between them, bounded to where
        they actually touch — so the one behind is dented where the one in front leans on it.
     4. SHADED: the same planes give the contact term — dark where a cushion meets something —
        baked into vertex colours with the creases' cavity. Zero cost a frame, and it spends
        nothing from the fabric's 12-box budget, which the couch already mostly fills.
     All of it merges into ONE mesh on ONE atlas (tex.cushions). Local frame of a cushion: face +z,
     up +y; it is built standing and posed from its FOOT (bottom-centre of the rim). */
  const LOU_CUSHION_CELL = { star: 0, round: 1, sprig: 2, stripe: 3 };
  function louCushionShape(c, rnd) {
    const TAU = Math.PI * 2, ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const P = [], UV = [], CAV = [], EDGE = [], IX = [];
    const k = LOU_CUSHION_CELL[c.cell], cu0 = (k % 2) * 0.5, cv0 = Math.floor(k / 2) * 0.5, M = 0.035;
    const cell = (a, b) => [cu0 + 0.5 * (M + (1 - 2 * M) * a), cv0 + 0.5 * (M + (1 - 2 * M) * b)];
    const pipeUV = [cu0 + 0.5 * M * 0.4, cv0 + 0.5 * M * 0.4];
    // cav: how deep in a crease; edge: 0 at the plump middle → 1 at the seam (the form shading)
    const vert = (p, uv, cav, edge = 0) => { P.push(p[0], p[1], p[2]); UV.push(uv[0], uv[1]); CAV.push(cav); EDGE.push(edge); return P.length / 3 - 1; };
    const rim = [];   // the seam's outline, in order, z = 0: [x, y]
    let H;
    if (c.shape === 'square') {
      const W = c.w / 2; H = c.h / 2; const T = c.t / 2, n = c.n || 30;
      const corner = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => ({ a, b, A: c.wrinkle * (0.5 + rnd()), ph: rnd() * TAU }));
      const lump = [rnd() * TAU, rnd() * TAU];
      const g = (t) => Math.sin(t * Math.PI / 2);   // crowd the grid toward the seam, where the shape turns
      const xy = (u, v) => [u * W * (1 - c.pinch * (1 - v * v)), v * H * (1 - c.pinch * (1 - u * u))];
      const surf = (u, v, side) => {
        /* STUFFED TO THE SEAM: the square root turns the face vertical at the rim, so the two faces meet
           in a round bead, not a knife edge (the first build tapered to nothing and read as paper). The
           power keeps the middle full; the crown gives it a gentle dome; the corners still thin to ears. */
        const ku = 1 - Math.pow(Math.abs(u), 2.6), kv = 1 - Math.pow(Math.abs(v), 2.6);
        const f = Math.sqrt(Math.max(0, ku * kv)) * (0.8 + 0.2 * (1 - u * u) * (1 - v * v)), held = Math.min(1, f * 2.5);
        let dz = 0, cav = 0;
        corner.forEach(q => {   // creases fanning in from the corner, where the cover pulls
          const dx = u - q.a, dy = v - q.b, rr = Math.hypot(dx, dy), da = -q.a * Math.SQRT1_2, db = -q.b * Math.SQRT1_2;
          const th = Math.atan2(da * dy - db * dx, da * dx + db * dy), env = ss(0.03, 0.28, rr) * (1 - ss(0.4, 1.2, rr));
          const gr = Math.pow(Math.max(0, Math.cos(8 * th + q.ph)), 1.5) * env;
          dz -= q.A * gr; cav += 1.0 * gr;
        });
        if (c.fold && side > 0) {   // the soft fold where the cushion bends: the front bunches at the spine's turn
          const fo = Math.exp(-Math.pow((v - (2 * (c.bendAt || 0.6) - 1)) / 0.13, 2)) * Math.pow(1 - u * u, 0.8);
          dz -= c.fold * fo; cav += 0.7 * fo;
        }
        const thick = side > 0 ? T : T * (c.backT || 1);
        const z = side * (thick * f * (1 + 0.05 * Math.sin(2.1 * u + lump[0]) * Math.sin(1.7 * v + lump[1])) + dz * held);
        const p = xy(u, v); return [[p[0], p[1], z], Math.min(1, cav * held), 1 - f];
      };
      [1, -1].forEach(side => {
        const base = P.length / 3;
        for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
          const u = g(-1 + 2 * i / n), v = g(-1 + 2 * j / n), [p, cav, edge] = surf(u, v, side);
          vert(p, cell(side > 0 ? (u + 1) / 2 : (1 - u) / 2, (v + 1) / 2), cav, edge);
        }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const a = base + j * (n + 1) + i, b = a + 1, d = a + n + 1, e = d + 1;
          if (side > 0) IX.push(a, b, e, a, e, d); else IX.push(a, e, b, a, d, e);
        }
      });
      const edge = [];
      for (let i = 0; i < n; i++) edge.push([g(-1 + 2 * i / n), -1]);
      for (let i = 0; i < n; i++) edge.push([1, g(-1 + 2 * i / n)]);
      for (let i = 0; i < n; i++) edge.push([g(1 - 2 * i / n), 1]);
      for (let i = 0; i < n; i++) edge.push([-1, g(1 - 2 * i / n)]);
      edge.forEach(([u, v]) => rim.push(xy(u, v)));
    } else {   // round, gathered to a covered button
      const R = c.r; H = R; const T = c.t / 2, nr = c.rings || 18, np = c.segs || 72, pleats = c.pleats || 12;
      const ph = rnd() * TAU, radius = (p) => R * (1 + c.scallop * Math.cos(pleats * p + ph));
      const surf = (rho, p, side) => {
        /* Stuffed to the seam like the squares, so its side reads as a band and the disc as plump. The
           button pulls a SHALLOW, WIDE dish (a deep narrow one hid the button in its own well from
           above, and read as sucked in), and the pleats start at the button's edge, so they visibly
           come from it. */
        const f = Math.sqrt(Math.max(0, 1 - Math.pow(rho, 2.6))) * (0.85 + 0.15 * (1 - rho * rho));
        const dimple = Math.exp(-Math.pow(rho / 0.34, 2)), env = ss(0.06, 0.16, rho) * (1 - ss(0.4, 0.9, rho));
        const groove = Math.pow(0.5 + 0.5 * Math.cos(pleats * p + ph), 2) * env;
        const z = side * (T * f - T * c.dimple * dimple - c.pleat * groove);
        const rr = rho * radius(p);
        return [[rr * Math.cos(p), rr * Math.sin(p), z], Math.min(1, 0.8 * groove + 0.35 * Math.exp(-Math.pow(rho / 0.12, 2))), 1 - f];
      };
      const rhoAt = (kk) => 0.45 * (kk / nr) + 0.55 * Math.sin(Math.PI / 2 * kk / nr);
      [1, -1].forEach(side => {
        const base = P.length / 3;
        for (let kk = 0; kk <= nr; kk++) for (let s = 0; s < np; s++) {
          const rho = rhoAt(kk), p = s / np * TAU, [q, cav, edge] = surf(rho, p, side);
          vert(q, cell(0.5 + 0.5 * rho * Math.cos(p) * side, 0.5 + 0.5 * rho * Math.sin(p)), cav, edge);
        }
        for (let kk = 0; kk < nr; kk++) for (let s = 0; s < np; s++) {
          const a = base + kk * np + s, b = base + kk * np + (s + 1) % np, d = a + np, e = b + np;
          // wound so the front's normal is +z: kk runs outward, s runs anticlockwise, and radial × tangential is +z
          if (side > 0) IX.push(a, e, b, a, d, e); else IX.push(a, b, e, a, e, d);
        }
        // the covered button, sitting in the dimple — the front's only: the back is never seen
        if (side < 0) return;
        const bz = T - T * c.dimple + (c.button || 0.02) * 0.15, BR = c.button || 0.02, bb = P.length / 3, bs = 8, bt = 12;
        for (let a = 0; a <= bs; a++) for (let s = 0; s < bt; s++) {
          const th = a / bs * Math.PI, p = s / bt * TAU, st = Math.sin(th);
          vert([BR * st * Math.cos(p), BR * st * Math.sin(p), bz + BR * 0.6 * Math.cos(th)], pipeUV, 0.2 + 0.3 * st * st);
        }
        for (let a = 0; a < bs; a++) for (let s = 0; s < bt; s++) {
          const i0 = bb + a * bt + s, i1 = bb + a * bt + (s + 1) % bt, i2 = i0 + bt, i3 = i1 + bt;
          if (side > 0) IX.push(i0, i2, i3, i0, i3, i1); else IX.push(i0, i3, i2, i0, i1, i3);
        }
      });
      for (let s = 0; s < np; s++) { const p = s / np * TAU, rr = radius(p); rim.push([rr * Math.cos(p), rr * Math.sin(p)]); }
    }
    // the piping: a round cord along the seam, closed, its cross-section in (outward, z)
    const pr = c.pipe || 0.0068, ps = 10, nb = P.length / 3, L = rim.length;
    for (let i = 0; i < L; i++) {
      const a = rim[(i + L - 1) % L], b = rim[(i + 1) % L], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      let ox = ty / tl, oy = -tx / tl; if (ox * rim[i][0] + oy * rim[i][1] < 0) { ox = -ox; oy = -oy; }
      for (let s = 0; s < ps; s++) { const q = s / ps * TAU; vert([rim[i][0] + ox * pr * Math.cos(q), rim[i][1] + oy * pr * Math.cos(q), pr * Math.sin(q)], pipeUV, 0.15, 1); }
    }
    for (let i = 0; i < L; i++) for (let s = 0; s < ps; s++) {
      const a = nb + i * ps + s, b = nb + i * ps + (s + 1) % ps, d = nb + ((i + 1) % L) * ps + s, e = nb + ((i + 1) % L) * ps + (s + 1) % ps;
      IX.push(a, d, e, a, e, b);
    }
    return { P, UV, CAV, EDGE, IX, H };
  }

  /* Pose a cushion: bend its spine, then stand it at `foot` turned by yaw (about y), leaned back by
     `lean` (about its own x) and rolled by `roll` (about its face normal). The bend is a real one —
     a spine whose angle eases from 0 to `bend` round `bendAt` (0 bottom … 1 top), each point carried
     out along the spine's normal by its thickness, so the inside of the bend bunches and the outside
     stretches. Positive bend flops the top forward. Returns world positions. */
  function louCushionPose(THREE, sh, c) {
    const H = sh.H, n = 64, ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const th = [], cy = [], cz = []; let y = -H, z = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n; th.push((c.bend || 0) * ss((c.bendAt || 0.6) - 0.3, (c.bendAt || 0.6) + 0.3, t)); cy.push(y); cz.push(z);
      y += Math.cos(th[i]) * 2 * H / n; z += Math.sin(th[i]) * 2 * H / n;
    }
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(c.lean || 0), c.yaw || 0, c.roll || 0, 'YXZ'));
    const foot = new THREE.Vector3(...c.foot), v = new THREE.Vector3(), out = new Float32Array(sh.P.length);
    for (let i = 0; i < sh.P.length; i += 3) {
      const t = Math.min(n, Math.max(0, (sh.P[i + 1] + H) / (2 * H) * n)), i0 = Math.min(n - 1, Math.floor(t)), f = t - i0;
      const a = th[i0] + (th[i0 + 1] - th[i0]) * f, py = cy[i0] + (cy[i0 + 1] - cy[i0]) * f, pz = cz[i0] + (cz[i0 + 1] - cz[i0]) * f, d = sh.P[i + 2];
      v.set(sh.P[i], py - d * Math.sin(a) + H, pz + d * Math.cos(a)).applyQuaternion(q).add(foot);
      out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
    }
    return out;
  }

  /* Press world positions against a plane { n, d, k, spread, top, reach, at, rad }: dot(n, p) >= d is
     free space. A soft max eases whatever lies past it back onto it; `spread` of what was lost goes
     sideways from the cushion's centre (the bulge). `top` bounds a short face (the arm) in height,
     `at`/`rad` bound a contact to a disc round a point (a neighbouring cushion). */
  /* The surface of one lib.pillow face as a function of a point: the coordinate along the face's axis
     at the point's other two coordinates, or null off the pillow's footprint. It mirrors louPillow — a
     rounded box of half-sizes S and edge radius r, the face's puff falling off across its core — so
     the couch's real seat crown and back swell can be settled against, not a plane through them. */
  function louPillowFace(C, S, r, puff, face) {
    const a = 'xyz'.indexOf(face[1]), s = face[0] === '-' ? -1 : 1, [b, c] = [0, 1, 2].filter(k => k !== a);
    r = Math.min(r, S[0] * 0.98, S[1] * 0.98, S[2] * 0.98);
    const core = S.map(v => v - r), p0 = puff[face] || 0;
    return (p) => {
      const pb = p[b] - C[b], pc = p[c] - C[c], cb = Math.min(Math.max(pb, -core[b]), core[b]), cc = Math.min(Math.max(pc, -core[c]), core[c]);
      const dd = (pb - cb) * (pb - cb) + (pc - cc) * (pc - cc);
      /* just off the footprint the surface carries on from the rounded edge's equator and falls away at
         45° (a drape over the edge has something to follow); well off it, there is no surface */
      if (dd >= r * r) { const out = Math.sqrt(dd) - r; return out > r ? null : C[a] + s * (core[a] - out); }
      const na = Math.sqrt(r * r - dd) / r, fall = (core[b] > 1e-6 ? 1 - (cb / core[b]) * (cb / core[b]) : 1) * (core[c] > 1e-6 ? 1 - (cc / core[c]) * (cc / core[c]) : 1);
      return C[a] + s * (core[a] + na * (r + p0 * na * fall));
    };
  }

  function louCushionPress(P, plane, centre) {
    const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const [nx, ny, nz] = plane.n, k = plane.k || 0.012, sp = plane.spread === undefined ? 0.35 : plane.spread;
    for (let i = 0; i < P.length; i += 3) {
      let w = 1;
      if (plane.top !== undefined) w *= 1 - ss(plane.top - 0.02, plane.top + 0.05, P[i + 1]);
      if (plane.at) {
        const ax = P[i] - plane.at[0], ay = P[i + 1] - plane.at[1], az = P[i + 2] - plane.at[2], dn = ax * nx + ay * ny + az * nz;
        w *= 1 - ss(plane.rad * 0.6, plane.rad, Math.hypot(ax - dn * nx, ay - dn * ny, az - dn * nz));
      }
      if (w <= 0) continue;
      const pd = typeof plane.d === 'function' ? plane.d([P[i], P[i + 1], P[i + 2]]) : plane.d;
      if (!isFinite(pd)) continue;
      const h = P[i] * nx + P[i + 1] * ny + P[i + 2] * nz - pd, lift = (0.5 * (h + Math.sqrt(h * h + k * k)) - h) * w;
      if (lift < 1e-6) continue;
      let tx = P[i] - centre[0], ty = P[i + 1] - centre[1], tz = P[i + 2] - centre[2]; const tn = tx * nx + ty * ny + tz * nz;
      tx -= tn * nx; ty -= tn * ny; tz -= tn * nz; const tl = Math.hypot(tx, ty, tz) || 1;
      P[i] += nx * lift + tx / tl * lift * sp; P[i + 1] += ny * lift + ty / tl * lift * sp; P[i + 2] += nz * lift + tz / tl * lift * sp;
    }
  }

  /* The four cushions and where they sit. `F` is the couch's faces (louBuildRoom): the seat top, each
     back's inner face, each arm's inner face. Two clusters, both in the wide camera's view:
     - left corner: the plum star, set diagonally into the corner, and the dusty-rose round one in
       front of it, leaning back on it with its foot toward the room (clear of the controller);
     - right corner: the cream print the same way, and the ochre lumbar slumped across its foot.
     The rear cushion of each pair is pressed first; the front one is then SETTLED onto it. */
  function louBuildCushions(lib, F) {
    const THREE = lib.THREE, rnd = louCushionRng(29);
    const L = F.left, Rt = F.right;
    const spec = [
      { id: 'star', cell: 'star', shape: 'square', w: 0.38, h: 0.38, t: 0.24, pinch: 0.09, wrinkle: 0.022, fold: 0.014, backT: 0.85,
        foot: [L.backX + 0.15, F.seatY, L.armZ + 0.16], yaw: 0.55, lean: 0.42, roll: 0.07, bend: 0.38, bendAt: 0.62, side: 'left' },
      { id: 'round', cell: 'round', shape: 'round', r: 0.15, t: 0.13, dimple: 0.2, pleat: 0.008, scallop: 0.005, pleats: 12, button: 0.021,
        /* LYING FLAT, face up, a cushion to sit on (owner, 24 Sep 2026) — it leans on nothing, so there
           is no angle to read wrong and nothing to overlap. The pose hangs a cushion from its foot, so
           lying down (lean π/2) its centre is one radius behind the foot: this centres it at z 0.60, over
           the seam where the left run meets the front run, half out of the wide frame, clear of the pad. */
        foot: [-0.60, F.seatY, 0.60 + 0.15], yaw: 0, lean: Math.PI / 2, roll: 0.4, bend: 0, bendAt: 0.5, side: 'left', lies: true },
      { id: 'sprig', cell: 'sprig', shape: 'square', w: 0.38, h: 0.38, t: 0.24, pinch: 0.09, wrinkle: 0.022, fold: 0.009, backT: 0.85,
        foot: [Rt.backX - 0.15, F.seatY, Rt.armZ + 0.18], yaw: -0.60, lean: 0.42, roll: -0.08, bend: 0.24, bendAt: 0.58, side: 'right' },
      { id: 'stripe', cell: 'stripe', shape: 'square', w: 0.38, h: 0.25, t: 0.13, pinch: 0.05, wrinkle: 0.009, fold: 0.006, n: 28,
        foot: [Rt.backX - 0.18, F.seatY, Rt.armZ + 0.30], yaw: -0.68, lean: 0.85, roll: 0.10, bend: 0.12, bendAt: 0.5, side: 'right', leansOn: 'sprig' },
    ];
    const couch = (side) => {
      const f = F[side], sx = side === 'left' ? 1 : -1;
      return [{ n: [0, 1, 0], d: f.seat, k: 0.014 }, { n: [sx, 0, 0], d: f.back, k: 0.012 }, { n: [0, 0, 1], d: f.armZ, k: 0.012, top: F.armTopY - 0.02 }];
    };
    const centreOf = (P) => { const c = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) { c[0] += P[i]; c[1] += P[i + 1]; c[2] += P[i + 2]; } return c.map(v => v / (P.length / 3)); };
    const built = {};
    spec.forEach(c => {
      const sh = louCushionShape(c, rnd), P = louCushionPose(THREE, sh, c), planes = couch(c.side);
      /* its STUFFING, for the harness: the closed surfaces' signed volume, posed and then settled. A press
         dents a cushion; it must never empty one — a drape that pulled a leaning disc's whole front face
         into the seat turned it inside out and passed every other check. */
      const volume = () => { let v = 0; const ix = sh.IX; for (let t = 0; t < ix.length; t += 3) { const a = ix[t] * 3, b = ix[t + 1] * 3, d = ix[t + 2] * 3;
        v += P[a] * (P[b + 1] * P[d + 2] - P[b + 2] * P[d + 1]) - P[a + 1] * (P[b] * P[d + 2] - P[b + 2] * P[d]) + P[a + 2] * (P[b] * P[d + 1] - P[b + 1] * P[d]); } return v / 6; };
      const vol0 = volume();
      let centre = centreOf(P);
      /* Gravity, cheaply. Pressing only ever pushes a cushion OUT of a surface, so where the seat fell
         away under it (the front roll, the crease under the back) its bottom was left in the air — the
         lumbar's corner floated 6 cm over the front roll. So before any press, a cushion RESTS: it drops
         (or rises) until its lowest point meets the seat under it; then it DRAPES under its own weight:
         every UNDERSIDE point near the bottom closes its gap to the seat directly below it — fully at the foot,
         fading out 6 cm up, never more than 3 cm (a cushion slumps, it does not pour: at 12 cm and 6 cm
         it pulled a leaning disc's whole lower back down into a skirt below its front, DD-32 § 7c). A tilted disc's
         rim rises away from its foot, so measuring against the seat under the MIDDLE left the round
         hovering over the front roll; this measures against the seat under each point. Then the presses. */
      const seatAt = (x, z) => F[c.side].seat([x, 0, z]);
      const drape = () => {
        // only an UNDERSIDE carries weight: pulling every low point down collapsed a leaning disc's front face into the seat
        const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.BufferAttribute(P, 3)); tmp.setIndex(sh.IX); tmp.computeVertexNormals();
        const ny = tmp.attributes.normal.array;
        let lowY = Infinity; for (let i = 1; i < P.length; i += 3) lowY = Math.min(lowY, P[i]);
        for (let i = 0; i < P.length; i += 3) {
          const gap = P[i + 1] - seatAt(P[i], P[i + 2]), w = Math.min(1, Math.max(0, 1 - (P[i + 1] - lowY) / 0.06));
          const under = Math.min(1, Math.max(0, (-ny[i + 1] - 0.1) / 0.5));
          if (gap > 0) P[i + 1] -= Math.min(0.03, gap) * w * w * under;
        }
        tmp.dispose(); centre = centreOf(P);
      };
      const settleDown = () => {
        let gap = Infinity; for (let i = 0; i < P.length; i += 3) gap = Math.min(gap, P[i + 1] - seatAt(P[i], P[i + 2]));
        for (let i = 1; i < P.length; i += 3) P[i] -= gap;
        drape();
        for (let it = 0; it < 2; it++) planes.forEach(pl => louCushionPress(P, pl, centre));
      };
      settleDown();
      if (c.leansOn) {
        /* Settle onto the one behind. Looking along the line between their centres, bin both into 2 cm
           patches across it and find the patch where this one comes nearest the other (its back against
           the other's front, patch by patch — the two extremes on their own can sit at different places
           across the face, where the one behind has already curved away). Slide this one back until it
           bites `bite` in there, then press BOTH to the plane half way through the bite, bounded to a disc
           round that spot, so the rest of the one behind is left alone. */
        const B = built[c.leansOn], cb = centreOf(B.P), n = new THREE.Vector3(centre[0] - cb[0], 0, centre[2] - cb[2]).normalize();   // level: sliding back must never lift it off the seat
        const e1 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), e2 = n.clone().cross(e1), N = n.toArray();
        const rad = (c.shape === 'round' ? c.r : Math.min(c.w, c.h) / 2) * 0.9, CELL = 0.02;
        const proj = (p, i) => { const x = p[i] - cb[0], y = p[i + 1] - cb[1], z = p[i + 2] - cb[2];
          return [x * N[0] + y * N[1] + z * N[2], Math.round((x * e1.x + y * e1.y + z * e1.z) / CELL) + ',' + Math.round((x * e2.x + y * e2.y + z * e2.z) / CELL)]; };
        const front = new Map();
        for (let i = 0; i < B.P.length; i += 3) { const [t, key] = proj(B.P, i); if (!(front.get(key) >= t)) front.set(key, t); }
        let gap = Infinity, spot = null, depth = 0;
        for (let i = 0; i < P.length; i += 3) {
          const [t, key] = proj(P, i), f = front.get(key);
          if (f !== undefined && t - f < gap) { gap = t - f; depth = f; spot = [P[i], P[i + 1], P[i + 2]]; }
        }
        const bite = 0.025, move = gap + bite;   // after the move, this one sits `bite` INSIDE the other at that spot
        for (let i = 0; i < P.length; i += 3) { P[i] -= N[0] * move; P[i + 2] -= N[2] * move; }
        const lift = P[1];   // resting again on the seat where it now lies may move it a little in y — carry the contact point with it
        settleDown(); const dy = P[1] - lift;
        // the contact point: that spot, moved with this cushion, put on the plane half way through the bite
        const s0 = [spot[0] - N[0] * move, spot[1] + dy, spot[2] - N[2] * move], mid = depth - bite / 2;
        const off = (s0[0] - cb[0]) * N[0] + (s0[1] - cb[1]) * N[1] + (s0[2] - cb[2]) * N[2] - mid;
        const at = [s0[0] - N[0] * off, s0[1] - N[1] * off, s0[2] - N[2] * off], d = at[0] * N[0] + at[1] * N[1] + at[2] * N[2];
        const contact = { n: N, d, k: 0.016, at, rad, spread: 0.3 };
        louCushionPress(P, contact, centre);
        louCushionPress(B.P, { n: N.map(x => -x), d: -d, k: 0.016, at, rad, spread: 0.2 }, cb);
        B.planes.push({ n: N.map(x => -x), d: -d, at, rad }); planes.push(contact);
        // the contact press nudged it toward the room, over the seat's front roll: drape again, then back out of the couch
        drape(); planes.forEach(pl => { if (pl !== contact) louCushionPress(P, pl, centre); });
      }
      built[c.id] = { c, sh, P, planes, vol0, volume };
    });
    // merge, with normals per cushion, and the contact term baked from the planes
    const pos = [], nor = [], uv = [], col = [], idx = [], boxes = { left: new THREE.Box3(), right: new THREE.Box3() }, list = [];
    const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    Object.values(built).forEach(({ c, sh, P, planes, vol0, volume }) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(sh.IX); g.computeVertexNormals();
      const N = g.attributes.normal.array, off = pos.length / 3, lo = new THREE.Vector3(1e9, 1e9, 1e9);
      for (let i = 0; i < P.length / 3; i++) {
        const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], q = [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]];
        let ao = (1 - 0.45 * sh.CAV[i]) * (1 - 0.28 * Math.pow(sh.EDGE[i], 1.4));
        planes.forEach(pl => {
          let w = 1;
          if (pl.top !== undefined) w *= 1 - ss(pl.top - 0.02, pl.top + 0.05, p[1]);
          if (pl.at) { const ax = p[0] - pl.at[0], ay = p[1] - pl.at[1], az = p[2] - pl.at[2], dn = ax * pl.n[0] + ay * pl.n[1] + az * pl.n[2];
            w *= 1 - ss(pl.rad * 0.6, pl.rad, Math.hypot(ax - dn * pl.n[0], ay - dn * pl.n[1], az - dn * pl.n[2])); }
          const pd = typeof pl.d === 'function' ? pl.d(p) : pl.d; if (!isFinite(pd)) return;
          const h = p[0] * pl.n[0] + p[1] * pl.n[1] + p[2] * pl.n[2] - pd, face = Math.min(1, Math.max(0, 0.5 - 0.5 * (q[0] * pl.n[0] + q[1] * pl.n[1] + q[2] * pl.n[2])));
          ao *= 1 - 0.55 * w * face * (1 - ss(0, 0.07, h));
        });
        pos.push(...p); nor.push(...q); uv.push(sh.UV[i * 2], sh.UV[i * 2 + 1]); col.push(ao, ao, ao);
        boxes[c.side].expandByPoint(new THREE.Vector3(...p)); lo.min(new THREE.Vector3(...p));
      }
      sh.IX.forEach(v => idx.push(v + off));
      list.push({ id: c.id, cell: c.cell, shape: c.shape, side: c.side, leansOn: c.leansOn || null, lies: !!c.lies, verts: P.length / 3, lowY: lo.y, vol0, vol: volume() });
      g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const box = (b) => { const c = new THREE.Vector3(), h = new THREE.Vector3(); b.getCenter(c); b.getSize(h).multiplyScalar(0.5); return { c: c.toArray(), h: h.toArray() }; };
    return { geometry: geo, list, boxes: [box(boxes.left), box(boxes.right)] };
  }
  const louCushionRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* What lives in the bench's open bay (room pass, item 14, to the owner's two renders,
     archived with the sandbox). ONE opaque mesh in vertex colours (mats.cubby) plus the disk box's
     smoked lid (mats.diskLid). Coordinates are the bench's (x about its centre, y world, z about
     benchZ). Everything takes the bay's cavity darkening, and a baked contact shade where it stands.
     - On the shelf, the PLAY-MAX 2000 (`play max.png`): a soft cream box, a mauve label panel with its
       name in cream, a pale-gold slot, a green LED, and five pastel keys (play, rewind, fast forward,
       record, power). Placed on the render's measured fractions of the front (x from the left edge,
       y from the bottom); the keys' printed names are left off: at this distance they are noise.
     - Under it, a floppy-disk box (`floppy disc box.png`), in place of the old game-box stack, which
       read as the bookshelf's books: a mint base with a raised back and a hinge knuckle, a smoked lid
       whose front slopes back, and nine pastel disks standing in a row, leaning back, their labels
       stepping up toward the back. The box is turned so the room sees it three-quarter on, as the
       render does: its front end and one long side.
     The atlas (tex.cubbyAtlas) carries only text: the deck's label and the disks' labels. Every other
     part samples its white block, so its colour is its vertex colour. */
  const LOU_DECK = { W: 0.39, H: 0.09, D: 0.26, R: 0.013 };
  const LOU_DISKBOX = { W: 0.115, L: 0.235, H: 0.12, BASE: 0.05, X: -0.075, Z: 0.072, YAW: -0.7, N: 9, LEAN: 0.12 };
  function louCubbyGeometry(lib, B, cavity) {
    const { THREE, mats } = lib, A = mats.cubby.map.userData.louAtlas, parts = [], meta = [];
    // uv: an atlas rect for a decal (the geometry's own 0..1 uvs mapped into it), else the white texel
    const put = (geo, pos, hex, rot, rect) => {
      const n = geo.attributes.position.count, uv = new Float32Array(n * 2), src = geo.attributes.uv;
      for (let k = 0; k < n; k++) {
        if (rect) { uv[k * 2] = rect[0] + src.getX(k) * (rect[2] - rect[0]); uv[k * 2 + 1] = rect[1] + src.getY(k) * (rect[3] - rect[1]); }
        else { uv[k * 2] = A.white[0]; uv[k * 2 + 1] = A.white[1]; }
      }
      parts.push([geo, pos, rot]); meta.push([n, new THREE.Color(hex), uv]);
    };
    const floorY = B.Y0 + B.PANEL, shelfY = B.SHELF_Y + 0.009;

    // ── the Play-Max 2000 ──
    const P = LOU_DECK, front = B.D / 2 - 0.035, fx = (f) => -P.W / 2 + f * P.W, fy = (f) => shelfY + f * P.H;
    put(lib.pillow(P.W, P.H, P.D, P.R, { band: 3, mid: [3, 2, 2] }), [0, shelfY + P.H / 2, front - P.D / 2], '#d6c8af');
    const pw = 0.31 * P.W, ph = 0.59 * P.H;
    // the panel is the atlas's label ground, in sRGB there and linear-as-given here: one value, no seam
    put(lib.pillow(pw, ph, 0.004, 0.002, { band: 1, mid: 1 }), [fx(0.375), fy(0.515), front + 0.0005], new THREE.Color(A.panel).convertSRGBToLinear());
    put(new THREE.PlaneGeometry(pw - 0.004, ph - 0.004), [fx(0.375), fy(0.515), front + 0.0028], '#ffffff', null, A.playMax);
    put(lib.pillow(0.143 * P.W, 0.0055, 0.003, 0.0012, { band: 1, mid: 1 }), [fx(0.715), fy(0.8), front + 0.0004], '#d6b755');   // the slot
    put(new THREE.SphereGeometry(0.0028, 8, 6), [fx(0.925), fy(0.8), front + 0.0006], '#559a32');                                 // the LED
    ['#d25f68', '#dc6f35', '#5f85be', '#ce4a41', '#8b6cbe'].forEach((hex, i) =>
      put(lib.pillow(0.056 * P.W, 0.16 * P.H, 0.008, 0.0035, { band: 1, mid: 1 }), [fx(0.645 + 0.07 * i), fy(0.43), front + 0.001], hex));

    // ── the floppy-disk box: built in its own frame (origin under its base's centre, +z its front end), then turned ──
    const K = LOU_DISKBOX, boxM = new THREE.Matrix4().makeTranslation(K.X, floorY, K.Z).multiply(new THREE.Matrix4().makeRotationY(K.YAW));
    const at = (geo, pos, rot) => geo.applyMatrix4(boxM.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1))));
    const mint = '#7cad95';
    put(at(lib.pillow(K.W, K.BASE, K.L, 0.009, { band: 2, mid: 1 }), [0, K.BASE / 2, 0]), [0, 0, 0], mint);
    put(at(lib.pillow(K.W, 0.07, 0.04, 0.012, { band: 2, mid: 1 }), [0, 0.035, -K.L / 2 + 0.02]), [0, 0, 0], mint);          // the raised back
    put(at(new THREE.CylinderGeometry(0.021, 0.021, K.W + 0.006, 18, 1), [0, 0.048, -K.L / 2 + 0.024], [0, 0, Math.PI / 2]), [0, 0, 0], '#6a9c84');   // the hinge knuckle
    // the disks: 90 mm wide, their hidden feet inside the base; leaning back, each a touch taller than the one in front
    const dMat = ['#65b78a', '#e27c8b', '#e0b745', '#9579d6', '#e58b5d', '#6790d2', '#5b409f', '#52545c', '#202128'];
    const pitch = (K.L - 0.072) / (K.N - 1), foot = 0.035;
    dMat.forEach((hex, i) => {
      const h = 0.071 + 0.001 * i, z = K.L / 2 - 0.022 - i * pitch, rot = [-K.LEAN, 0, 0];
      const c = [0, foot + (h / 2) * Math.cos(K.LEAN), z - (h / 2) * Math.sin(K.LEAN)];
      put(at(new THREE.BoxGeometry(0.09, h, 0.0033), c, rot), [0, 0, 0], hex);
      // its label, on the face toward the box's front, near the top
      const up = h / 2 - 0.021, lc = [0, c[1] + up * Math.cos(K.LEAN) + 0.0018 * Math.sin(K.LEAN), c[2] - up * Math.sin(K.LEAN) + 0.0018 * Math.cos(K.LEAN)];
      put(at(new THREE.PlaneGeometry(0.068, 0.032), lc, rot), [0, 0, 0], '#ffffff', null, A.disks[i % A.disks.length]);
    });
    // the star sticker on the lid, toward the back
    const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.0078 : 0.0165; k ? star.lineTo(r * Math.cos(a), r * Math.sin(a)) : star.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    put(at(new THREE.ShapeGeometry(star), [0.012, K.H + 0.0004, -0.045], [-Math.PI / 2, 0, 0.3]), [0, 0, 0], '#9574ce');

    /* ── beside the box, filler (owner, 25 Sep): three sticky-note pads stacked askew, and a pencil left
       lying in front of them. Square and short, so they read as notes, not the shelf's books. Plain. ── */
    [['#ebc846', 0.15], ['#e97a93', -0.12], ['#85c495', 0.32]].forEach(([hex, ry], i) =>
      put(lib.pillow(0.076, 0.013, 0.076, 0.002, { band: 1, mid: 1 }), [0.175 + 0.004 * i, floorY + 0.0065 + 0.013 * i, 0.075 - 0.003 * i], hex, [0, ry, 0]));
    { const PR = 0.0038, len = 0.11, yaw = 0.42, px = 0.17, pz = 0.175, py = floorY + PR;   // hexagonal: rests on an edge, never through the floor
      const d = [-Math.cos(yaw), Math.sin(yaw)], along = (s) => [px + d[0] * s, py, pz + d[1] * s], rot = [0, yaw, Math.PI / 2];
      put(new THREE.CylinderGeometry(PR, PR, len, 6, 1), along(0), '#ce9325', rot);                                           // the body
      put(new THREE.CylinderGeometry(PR * 0.98, PR * 0.98, 0.006, 8, 1), along(-len / 2 - 0.003), '#9a9ba0', rot);             // ferrule
      put(new THREE.CylinderGeometry(PR * 0.95, PR * 0.95, 0.008, 8, 1), along(-len / 2 - 0.01), '#d96a7c', rot);             // eraser
      put(new THREE.CylinderGeometry(PR, 0.0012, 0.016, 6, 1), along(len / 2 + 0.008), '#cd9259', [0, yaw, -Math.PI / 2]);     // the sharpened wood
      put(new THREE.ConeGeometry(0.0012, 0.004, 6), along(len / 2 + 0.018), '#262428', rot); }              // the lead

    const geo = lib.merge(parts), p = geo.attributes.position, col = new Float32Array(p.count * 3), uvs = new Float32Array(p.count * 2);
    // a contact shade where anything stands: the last centimetre above the bay floor and the shelf top
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    let i = 0;
    meta.forEach(([n, c, uv]) => {
      uvs.set(uv, i * 2);
      for (let k = 0; k < n; k++, i++) {
        const y = p.getY(i), f = cavity(p.getX(i), y, p.getZ(i)) * (1 - 0.35 * (1 - ss(0, 0.012, Math.min(Math.abs(y - floorY), Math.abs(y - shelfY)))));
        col[i * 3] = c.r * f; col[i * 3 + 1] = c.g * f; col[i * 3 + 2] = c.b * f;
      }
    });
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // the smoked lid: over the base's rim to the lid's top, from the front end back into the raised back; its front slopes back 2.2 cm
    const zf = K.L / 2 + 0.002, zb = -K.L / 2 + 0.036, y0 = K.BASE - 0.006, lid = lib.pillow(K.W + 0.004, K.H - y0, zf - zb, 0.006, { band: 2, mid: 1 });
    lid.translate(0, y0 + (K.H - y0) / 2, (zf + zb) / 2);
    { const q = lid.attributes.position, zc = (zf + zb) / 2;
      for (let k = 0; k < q.count; k++) { const z = q.getZ(k); if (z > zc) q.setZ(k, z - 0.022 * ((q.getY(k) - y0) / (K.H - y0)) * ((z - zc) / (zf - zc))); } }
    lid.computeVertexNormals(); lid.applyMatrix4(boxM);
    return { geometry: geo, lid, box: { x: K.X, z: K.Z, yaw: K.YAW, W: K.W, L: K.L, H: K.H, N: K.N } };
  }

  /* The drawer pull: a brass ACORN, oak's own seed. The mockup's was a bunny, but the telly on the
     same bench already IS the bunny, and the pull must not pull focus — at our camera it is ~20 px,
     a knob; only up close is it an acorn. One mesh: a lathe (a pointed nut under a cap whose side
     ripples into scale rings, a stub stem on top) on a neck and a round backplate. The cap, stem,
     neck and plate are aged bronze, the nut polished brass — vertex colours, one material.
     Origin = the point on the drawer face it screws into; it stands out along +z, cap up. */
  const LOU_ACORN = { NUT_R: 0.011, NECK: 0.013, CAP_Y: 0.0034 };
  function louAcornGeometry(lib) {
    const { THREE } = lib, A = LOU_ACORN, prof = [];
    // bottom to top up the OUTSIDE, so the lathe's normals face out
    [[0, -0.017], [0.0022, -0.0162], [0.0055, -0.0135], [0.0085, -0.009], [0.0104, -0.004], [A.NUT_R, 0], [0.0107, 0.003]].forEach(p => prof.push(p));
    const capAt = prof.length;
    prof.push([0.0107, A.CAP_Y], [0.0128, A.CAP_Y + 0.0002]);   // the cap's underside: a ledge out over the nut
    for (let i = 1; i <= 9; i++) {                              // its side: three scale rings, narrowing upward
      const t = i / 9; prof.push([0.0128 - 0.001 * t + 0.0005 * Math.abs(Math.sin(t * Math.PI * 3)), A.CAP_Y + 0.0002 + 0.007 * t]);
    }
    prof.push([0.008, 0.0128], [0.0045, 0.0133], [0.0021, 0.0135], [0.0019, 0.0172], [0.0015, 0.019], [0, 0.0192]);
    const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20), nLathe = lathe.attributes.position.count;
    const neck = new THREE.CylinderGeometry(0.0034, 0.0034, A.NECK, 10), plate = new THREE.CylinderGeometry(0.0078, 0.0085, 0.003, 20);
    const geo = lib.merge([
      [lathe, [0, 0, A.NECK + A.NUT_R * 0.8]],
      [neck, [0, A.CAP_Y, A.NECK / 2], [Math.PI / 2, 0, 0]],
      [plate, [0, A.CAP_Y, 0.0015], [Math.PI / 2, 0, 0]],
    ]);
    const n = geo.attributes.position.count, col = [], brass = new THREE.Color('#d8b25a'), bronze = new THREE.Color('#5a3e17');
    for (let i = 0; i < n; i++) { const c = i < nLathe && i % prof.length < capAt ? brass : bronze; col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.userData.louAcorn = { capAt, points: prof.length, nLathe };
    return geo;
  }

  /* The ledge plant: cattails. Room pass, item 13 (25 Sep 2026), built to the owner's render
     (the owner's reference render, archived with the sandbox), measured against its pot (100 px = 8 cm):
     - a tall butter-yellow cylinder (height 1.55 × its width) with a softly rounded foot, and a thick
       mint rim flush with it, lipped over into the pot;
     - six broad mint strap leaves fanning from the rim, about a pot and a half across;
     - three lilac heads on mint stems, LUMPY (four soft segments, creased between), the centre one
       tipped with a green spike, the left leaning out, the right hooked over;
     - the whole plant is 3.3 pot widths tall.
     Four meshes: the pot, the soil, everything green merged (rim, leaves, stems, spikes) and the
     three heads merged — the heads under the cushions' cloth sheen, which is the fuzz at this size.
     Fixed colours, no pick id: it is furniture. Group origin = the pot's base, so the caller drops it
     straight onto its ledge (R.ledgeTopY). The front of the plant faces +z. */
  function louBuildPlant(lib) {
    const { THREE, mats } = lib; const g = new THREE.Group(); g.name = 'plant';
    const mesh = (name, geo, mat, cast = true) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
    };
    const R = 0.04, PH = 0.124, RIM = 0.022, LIP = 0.0048, SOIL = PH - 0.013;
    const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)); });
    // the pot: centre of the foot → a 9 mm rounded foot → straight up to under the rim
    const FOOT = 0.009;
    mesh('pot', new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...arc(R - FOOT, FOOT, FOOT, -Math.PI / 2, 0, 5), new THREE.Vector2(R, PH - RIM + 0.002)], 28), mats.potCream);
    // soil: a dark disc just inside the lip, unseen from most of the room but not a hole
    const soil = new THREE.CircleGeometry(R - LIP + 0.001, 20); soil.rotateX(-Math.PI / 2); soil.translate(0, SOIL, 0);
    mesh('soil', soil, mats.soil, false);

    /* A tube swept along a curve through pts, its radius rad(t) (t 0..1 along it). A radius of 0 at an
       end closes it to a point, so a head needs no caps. The seam's normals are averaged across the
       wrap so no line runs down it. */
    const tube = (pts, rad, T, Rd) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0)));
      const geo = new THREE.TubeGeometry(curve, T, 1, Rd, false), p = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
      for (let i = 0; i <= T; i++) {
        curve.getPointAt(i / T, c); const r = rad(i / T);
        for (let j = 0; j <= Rd; j++) { const k = i * (Rd + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); }
      }
      geo.computeVertexNormals();
      const n = geo.attributes.normal;
      for (let i = 0; i <= T; i++) {
        const a = i * (Rd + 1), b = a + Rd; v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
        n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z);
      }
      return geo;
    };
    /* A strap leaf leaving the rim at angle a (0 = +x, π/2 = +z, toward the room): it rises out of the
       pot, arcs over and droops at its tip. Three vertices across, the midrib sunk into a channel, so
       it catches light on one side of the fold and not the other. Its width swells off the base and
       closes to a point. */
    const leaf = (a, L, lift, droop, W) => {
      const S = 10, pos = [], idx = [], d = [Math.cos(a), Math.sin(a)], side = [-Math.sin(a), 0, Math.cos(a)];
      const curve = new THREE.CatmullRomCurve3([[R - 0.024, -0.008], [R - 0.013, 0.012 * lift], [R + 0.002, 0.026 * lift], [R + L * 0.16, 0.032 * lift - droop * 0.4], [R + L * 0.32, 0.026 * lift - droop]]
        .map(([o, u]) => new THREE.Vector3(d[0] * o, PH + u, d[1] * o)));
      const c = new THREE.Vector3(), tg = new THREE.Vector3();
      for (let i = 0; i <= S; i++) {
        const t = i / S; curve.getPointAt(t, c); curve.getTangentAt(t, tg);
        const w = W * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.8), f = -0.3 * w;
        const nx = side[1] * tg.z - side[2] * tg.y, ny = side[2] * tg.x - side[0] * tg.z, nz = side[0] * tg.y - side[1] * tg.x;
        pos.push(c.x - side[0] * w, c.y, c.z - side[2] * w, c.x + nx * f, c.y + ny * f, c.z + nz * f, c.x + side[0] * w, c.y, c.z + side[2] * w);
        if (i) { const o = (i - 1) * 3; idx.push(o, o + 3, o + 1, o + 1, o + 3, o + 4, o + 1, o + 4, o + 2, o + 2, o + 4, o + 5); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      return geo;
    };
    // the rim: a band proud of the pot by a hair (its lower edge is the line between the two colours),
    // rounded over the top and down the inside to the soil
    const rimProfile = [new THREE.Vector2(R - 0.001, PH - RIM - 0.0005), new THREE.Vector2(R + 0.0008, PH - RIM + 0.0012),
      ...arc(R + 0.0008 - LIP / 2, PH - LIP / 2, LIP / 2, 0, Math.PI, 6), new THREE.Vector2(R - LIP + 0.0008, SOIL - 0.002)];
    const green = [[new THREE.LatheGeometry(rimProfile, 28)]];
    // six leaves: [angle, reach, lift, droop, half-width] — spread across the front and sides, the wall's side shorter
    [[-0.3, 0.05, 1.15, 0.004, 0.0105], [0.45, 0.056, 1.0, 0.012, 0.011], [1.25, 0.05, 1.3, 0.006, 0.01],
     [2.0, 0.058, 1.05, 0.012, 0.011], [2.85, 0.052, 1.2, 0.005, 0.0105], [-2.3, 0.04, 1.35, 0.002, 0.009]]
      .forEach(([a, L, lift, droop, W]) => green.push([leaf(a, L, lift, droop, W)]));
    // the stems, then the heads on them: [stem points, head points, spike points or null]
    const STEM_R = 0.0021, HEAD_R = 0.0112, LUMPS = 4;
    const PLANT = [
      [[[0, SOIL, 0.002], [0.001, 0.15, 0.002], [0, 0.192, 0.002]], [[0, 0.186, 0.002], [0.0012, 0.22, 0.002], [0, 0.251, 0.002]], [[0, 0.246, 0.002], [0, 0.264, 0.002]]],
      [[[-0.004, SOIL, 0.006], [-0.009, 0.14, 0.007], [-0.02, 0.171, 0.008]], [[-0.019, 0.166, 0.008], [-0.03, 0.198, 0.008], [-0.042, 0.227, 0.008]], [[-0.04, 0.223, 0.008], [-0.046, 0.236, 0.008]]],
      [[[0.004, SOIL, -0.004], [0.012, 0.14, -0.005], [0.024, 0.176, -0.006]], [[0.023, 0.171, -0.006], [0.031, 0.203, -0.006], [0.047, 0.219, -0.006], [0.063, 0.208, -0.006], [0.068, 0.192, -0.006]], null],
    ];
    const heads = [];
    PLANT.forEach(([stem, head, spike]) => {
      green.push([tube(stem, t => STEM_R * (1.15 - 0.3 * t), 8, 6)]);
      if (spike) green.push([tube(spike, t => 0.0015 * Math.pow(1 - t, 0.6), 3, 5)]);
      // an ellipse at each end (so it closes round, not to a cone) over four soft lumps, creased between
      const E = 0.14, cap = t => { const e = t < E ? (E - t) / E : t > 1 - E ? (t - 1 + E) / E : 0; return Math.sqrt(Math.max(0, 1 - e * e)); };
      heads.push([tube(head, t => HEAD_R * cap(t) * (0.87 + 0.13 * Math.pow(Math.abs(Math.sin(Math.PI * LUMPS * t)), 0.45)), head.length > 3 ? 40 : 28, 10)]);
    });
    mesh('plantGreen', lib.merge(green), mats.leaf);
    mesh('cattails', lib.merge(heads), mats.cattail);
    g.userData.louPlant = { blades: 6, heads: PLANT.length };
    return g;
  }

  /* The koala mug. A cat would have been the jukebox again, and a panda's black patches would be
     the darkest thing in the room, pulling the eye off the props. A koala is the Australian one and
     the ears ARE the animal: big, round and fluffy, a silhouette no other animal has, so it still
     reads when the face is a few pixels. (Owner offered panda or koala, 24 Sep 2026.)

     Group origin = the foot's base, so the caller drops it straight onto tableTopY. The face looks
     down +z; the handle is on +x. Parts:
     - `mug`       one mesh: the lathe body (foot ring, barrel belly, rolled lip, an inner wall and
                   floor), the handle and both ears, merged — one glaze, one draw call;
     - `mugFace`   the nose and eyes, merged;
     - `mugBlush`  the inner ears and the cheeks, merged;
     - `mugCoffee` a disc at the fill line, its crema in vertex colours;
     - `mugSteam`  a billboard whose wisps are drawn in its shader. No texture, no shadow, no depth
                   write. It moves only when the scene draws a frame anyway, and stands still under
                   reduced motion (it is still there — nothing travels, nothing is lost). */
  const LOU_MUG = { H: 0.09, RIM: 0.035, WALL: 0.0045, FLOOR: 0.009, FILL: 0.013 };
  function louBuildMug(lib) {
    const { THREE, mats } = lib, M = LOU_MUG; const g = new THREE.Group(); g.name = 'mugGroup';
    const mesh = (name, geo, mat, cast = true) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
    };
    // the outer wall: a barrel that bellies ~3 mm past its rim — chunky, which is what reads as cute
    const Y0 = 0.004;
    const rOut = (y) => { const t = (y - Y0) / (M.H - Y0); return 0.0335 + (M.RIM - 0.0335) * t + 0.0042 * Math.sin(Math.PI * t); };
    const rIn = (y) => rOut(y) - M.WALL;
    const arc = (cx, cy, r, a0, a1, n, out) => { for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); } };
    /* Up the outside, over the lip, down the inside: that order is what makes a LatheGeometry's
       normals face out on the outer wall and into the cavity on the inner one (the harness checks). */
    const prof = [new THREE.Vector2(0, 0.0022), new THREE.Vector2(0.024, 0.0022), new THREE.Vector2(0.0265, 0), new THREE.Vector2(0.0295, 0)];
    arc(0.0295, Y0, Y0, -Math.PI / 2, 0, 5, prof);                     // the foot's rounded heel
    const LIP = M.WALL / 2, yLip = M.H - LIP;
    for (let i = 1; i <= 24; i++) { const y = Y0 + (yLip - Y0) * i / 24; prof.push(new THREE.Vector2(rOut(y), y)); }
    arc(rOut(yLip) - LIP, yLip, LIP, 0, Math.PI, 8, prof);             // the rolled lip
    const yCorner = M.FLOOR + 0.006;
    for (let i = 1; i <= 20; i++) { const y = yLip - (yLip - yCorner) * i / 20; prof.push(new THREE.Vector2(rIn(y), y)); }
    arc(rIn(yCorner) - 0.006, yCorner, 0.006, 0, -Math.PI / 2, 5, prof);   // the inner floor's cove
    prof.push(new THREE.Vector2(0, M.FLOOR));
    const body = new THREE.LatheGeometry(prof, 48);

    // the handle: a D in the xz = 0 plane, both ends buried in the wall, flattened into a band
    const yU = 0.068, yL = 0.026;
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(rOut(yU) - 0.003, yU, 0), new THREE.Vector3(rOut(yU) + 0.029, yU + 0.006, 0),
      new THREE.Vector3(rOut(yL) + 0.031, yL - 0.008, 0), new THREE.Vector3(rOut(yL) - 0.003, yL, 0));
    const handle = new THREE.TubeGeometry(curve, 40, 0.0052, 12, false); handle.scale(1, 1, 1.3);

    /* The ears. A flattened sphere with a scalloped rim — the fluff, in the silhouette — sitting ON
       the lip at ±54° round from the face, turned half way back toward the front so they read big
       from the couch, and splayed outward. The pink inner ear is the same recipe, smaller, proud of
       the ear's front face. Built facing +z, then rolled, turned and placed. */
    const disc = (R, T, scallop, lobes) => {
      const s = new THREE.SphereGeometry(1, 28, 14), p = s.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), f = R * (1 + scallop * Math.cos(lobes * Math.atan2(y, x)));
        p.setXYZ(i, x * f, y * f, p.getZ(i) * T);
      }
      s.computeVertexNormals(); return s;
    };
    const EAR = { R: 0.02, T: 0.0045, at: 0.94, face: 0.5, splay: 0.3, rr: 0.034, y: M.H + 0.011 };
    const ears = [], inner = [];
    [1, -1].forEach(side => {
      const place = (geo) => {
        geo.rotateZ(-side * EAR.splay); geo.rotateY(side * EAR.face);
        geo.translate(side * EAR.rr * Math.sin(EAR.at), EAR.y, EAR.rr * Math.cos(EAR.at)); return geo;
      };
      ears.push([place(disc(EAR.R, EAR.T, 0.06, 9)), [0, 0, 0]]);
      const pink = disc(0.0125, 0.0024, 0.05, 7); pink.translate(0, -0.0025, EAR.T * 0.7);
      inner.push([place(pink), [0, 0, 0]]);
    });
    const body3 = mesh('mug', lib.merge([[body, [0, 0, 0]], [handle, [0, 0, 0]]].concat(ears)), mats.mugGlaze);

    // the face, pressed onto the wall at azimuth a (from +z toward +x), height y
    const onWall = (geo, a, y, sink) => { geo.rotateY(a); geo.translate((rOut(y) + sink) * Math.sin(a), y, (rOut(y) + sink) * Math.cos(a)); return [geo, [0, 0, 0]]; };
    const blob = (sx, sy, sz) => { const s = new THREE.SphereGeometry(1, 16, 10); s.scale(sx, sy, sz); return s; };
    mesh('mugFace', lib.merge([
      onWall(blob(0.0068, 0.0082, 0.0036), 0, 0.041, 0.0004),                       // the big koala nose
      onWall(blob(0.0026, 0.003, 0.0013), 0.3, 0.054, 0.0002),                      // eyes, either side of it
      onWall(blob(0.0026, 0.003, 0.0013), -0.3, 0.054, 0.0002),
    ]), mats.mugInk, false);
    mesh('mugBlush', lib.merge(inner.concat([
      onWall(blob(0.0058, 0.0036, 0.0011), 0.5, 0.037, 0.0001),
      onWall(blob(0.0058, 0.0036, 0.0011), -0.5, 0.037, 0.0001),
    ])), mats.mugBlush, false);

    // the coffee: a disc at the fill line, tucked a hair into the wall, dark in the middle and crema at the edge
    const yC = M.H - M.FILL, rC = rIn(yC) + 0.0006;
    const cof = new THREE.CircleGeometry(rC, 40); cof.rotateX(-Math.PI / 2); cof.translate(0, yC, 0);
    { const p = cof.attributes.position, col = [], dark = new THREE.Color('#3f2416'), light = new THREE.Color('#8f5d3a'), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const t = Math.hypot(p.getX(i), p.getZ(i)) / rC; c.copy(dark).lerp(light, t * t); col.push(c.r, c.g, c.b); }
      cof.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
    mesh('mugCoffee', cof, mats.coffee, false);

    // the steam
    const SW = 0.075, SH = 0.12, steamGeo = new THREE.PlaneGeometry(SW, SH, 1, 1); steamGeo.translate(0, SH / 2, 0);
    const uniforms = { uTime: { value: LOU_MUG_STILL_T }, uColor: { value: new THREE.Color('#fff3e6') }, uOpacity: { value: 0.62 } };
    const steamMat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, fog: false,
      vertexShader: [
        'varying vec2 vUv;',
        /* A cylindrical billboard: up stays world up, the width turns to face the eye — so a push-in
           that swings round the table never catches the steam edge-on. */
        'void main() {',
        '  vUv = uv;',
        '  vec3 c = (modelMatrix * vec4(0.0, position.y, 0.0, 1.0)).xyz;',
        '  vec3 r = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(c + r * position.x, 1.0);',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform vec3 uColor; uniform float uOpacity;',
        'varying vec2 vUv;',
        // one wisp: a soft line that sways more the higher it gets, widens, and breaks into puffs
        'float wisp(vec2 uv, float t, float ph) {',
        '  float y = uv.y;',
        '  float sway = (sin(y * 7.0 - t * 1.0 + ph) * 0.10 + sin(y * 3.0 + t * 0.5 + ph * 2.0) * 0.06) * y;',
        '  float x = uv.x - 0.5 - sway, w = mix(0.045, 0.16, y);',
        '  return exp(-x * x / (w * w)) * (0.55 + 0.45 * sin(y * 11.0 - t * 1.6 + ph * 3.0 + x * 6.0));',
        '}',
        'void main() {',
        '  float a = wisp(vUv, uTime, 0.0) + 0.7 * wisp(vUv + vec2(0.09, 0.0), uTime * 1.15, 2.1);',
        '  float fade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.42, 1.0, vUv.y));',
        '  gl_FragColor = vec4(uColor, clamp(a * fade * uOpacity, 0.0, 1.0));',
        '}'].join('\n'),
    });
    const steam = mesh('mugSteam', steamGeo, steamMat, false); steam.receiveShadow = false;
    steam.position.y = yC - 0.004; steam.renderOrder = 2;

    /* Drawn-frame time, or a fixed pose under reduced motion. Returns nothing: the steam must never be
       the reason a frame is drawn (that would be ~60 room frames a second for a wisp). */
    g.userData.louTick = (now, reduced) => { uniforms.uTime.value = reduced ? LOU_MUG_STILL_T : now / 1000; };
    g.userData.louMug = { H: M.H, rim: rOut(yLip), coffeeY: yC, coffeeR: rC, innerAtCoffee: rIn(yC), rOut, rIn, ears: 2, steam: uniforms };
    body3.userData.louHandleSide = '+x';
    return g;
  }
  const LOU_MUG_STILL_T = 1.7;   // a pose where both wisps are up and apart — the frozen frame should look like steam

  /* ── The slippers (room pass, item 10 — 25 Sep 2026) ────────────────────────
     A pair of puppy slippers, kicked off on the rug in front of the left couch, as the mockup has
     them (its are bunny/cat; the telly is the bunny, the jukebox the cat and the mug the koala, so
     these are DOGS — the owner offered bears or dogs, and a bear's round ears would repeat the
     koala's). Floppy ears are the silhouette no other animal in the room has.

     One slipper, local frame: sole on y = 0, toe down +z, centred on its footprint. The body is ONE
     star-shaped surface over a superellipse footprint (wider at the ball than the heel): for each
     angle round the footprint a profile runs across the sole, round a bead edge, up a short side
     with a welted sole band, round a top edge and in over the top to the centre. The top's height
     is one function: a puffy dome at the front that peaks at the instep, and behind the THROAT an
     open heel — a rolled collar down to a footbed. The lining inside it is vertex colour, darkened
     the deeper it sits, and so is the contact at the foot and the eye patch: the plush is one mesh,
     one material, no texture. The ears, muzzle and tongue merge into it (their colours per part);
     the nose and eyes are the second mesh, glossy.

     Both slippers merge into those two meshes in ROOM coordinates, so the pair draws as two. */
  const LOU_SLIPPER = {
    L: 0.25, A: 0.047, TAPER: 0.16, N: 2.5,          // footprint: length, half-width at the middle, ball wider than heel, squareness
    RIM: 0.02, PEAK: 0.086, ZPK: 0.025, BACK: 0.06,  // the toe bun: height at its edge, at its crown, where the crown is, how far it runs back
    COL: 0.046, FB: 0.021, THROAT: -0.012, TW: 0.018, // the open heel: collar height, footbed height, where the bun stops, the throat's roll
    SOLE: 0.011, WELT: 0.0016, EB: 0.006, ET: 0.009, // the sole band's height and how proud it stands; the bottom and collar edge radii
    CZ: 0.03,                                        // the polar grid's centre: at the crown, clear of the throat's drop
  };
  // Colours are authored the way every material colour here is (r128: a hex is taken as linear), so they run dark
  const LOU_SLIPPER_COL = { plush: '#eee2cf', muzzle: '#fbf6ee', ear: '#4a2c20', sole: '#3a2a24', lining: '#dfa29c', tongue: '#e9899b' };
  function louSlipperShape() {
    const S = LOU_SLIPPER, b = S.L / 2;
    const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const aOf = (z) => S.A * (1 + S.TAPER * z / b);
    const halfW = (z) => aOf(z) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(z / b)), S.N)), 1 / S.N);
    // distance from the centre (0, CZ) to the footprint's edge along angle th (x = cos, z = sin): bisection
    const rimAt = (th) => {
      const c = Math.cos(th), s = Math.sin(th); let lo = 0, hi = S.L;
      for (let i = 0; i < 40; i++) {
        const t = (lo + hi) / 2, x = t * c, z = S.CZ + t * s;
        const f = Math.abs(z) >= b ? 2 : Math.pow(Math.abs(x / aOf(z)), S.N) + Math.pow(Math.abs(z / b), S.N);
        if (f > 1) hi = t; else lo = t;
      }
      return lo;
    };
    /* The top's height at (x, z), dr from the edge (only the open heel reads dr — it is where the
       collar stands). The bun is a PRODUCT of an across term and an along term, each a root that
       stands vertical where it reaches zero — so it falls to RIM on the whole outline, toe included,
       and meets the side's vertical without an edge: the roundness is the function's, not a fillet's.
       o is 1 behind the throat: the heel's footbed and collar take over there, the collar's outer
       edge a quarter round of radius ET, again vertical where it meets the side. */
    const dome = (x, z) => {
      const w = Math.max(halfW(z), 1e-4), xn = Math.min(1, Math.abs(x) / w), zq = Math.min(1, (z - S.ZPK) / (z > S.ZPK ? b - S.ZPK : -S.BACK));
      return S.RIM + (S.PEAK - S.RIM) * Math.sqrt(1 - xn * xn) * Math.pow(1 - zq * zq, 0.4);
    };
    const open = (z) => ss(S.THROAT + S.TW, S.THROAT - S.TW, z);
    const wall = (dr) => ss(0.026, S.ET, dr);   // 1 on the collar's top → 0 on the footbed
    const edge = (dr) => (dr < S.ET ? S.ET - Math.sqrt(S.ET * S.ET - (S.ET - dr) * (S.ET - dr)) : 0);
    const top = (x, z, dr) => { const o = open(z); return (1 - o) * dome(x, z) + o * (S.FB + (S.COL - S.FB) * wall(dr) - edge(dr)); };
    // the surface's normal at (x, z), for pressing a feature onto the dome
    const normal = (x, z) => {
      const e = 0.0015, hx = (dome(x + e, z) - dome(x - e, z)) / (2 * e), hz = (dome(x, z + e) - dome(x, z - e)) / (2 * e);
      const n = [-hx, 1, -hz], l = Math.hypot(n[0], n[1], n[2]); return n.map(v => v / l);
    };
    return { S, b, halfW, rimAt, dome, open, wall, top, normal, ss };
  }
  function louSlipperGeometry(lib, opt = {}) {
    const { THREE } = lib, F = louSlipperShape(), S = F.S, NT = opt.nt || 64, K = opt.k || 30;
    const col = (hex) => new THREE.Color(hex), C = {}; Object.keys(LOU_SLIPPER_COL).forEach(k => { C[k] = col(LOU_SLIPPER_COL[k]); });
    const P = [], CL = [], IX = [];
    const push = (x, y, z, c) => { P.push(x, y, z); CL.push(c.r, c.g, c.b); };
    const patch = opt.patch;   // [x, z, r]: a chocolate patch round one eye, in the plush's own colours
    /* The angles, spaced by ARC LENGTH round the outline, not evenly: the centre sits forward, so
       even steps left the heel's curve — the far end — faceted. */
    const TH = []; { const M = 720, len = [0]; let prev = null;
      for (let m = 0; m <= M; m++) { const t = m / M * Math.PI * 2, r = F.rimAt(t), q = [r * Math.cos(t), r * Math.sin(t)];
        if (prev) len.push(len[len.length - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1])); prev = q; }
      for (let i = 0, m = 0; i < NT; i++) { const want = len[M] * i / NT; while (len[m + 1] < want) m++; TH.push((m + (want - len[m]) / (len[m + 1] - len[m])) / M * Math.PI * 2); } }
    let NP = 0;
    for (let i = 0; i < NT; i++) {
      const th = TH[i], cx = Math.cos(th), sz = Math.sin(th), R = F.rimAt(th);
      const at = (d) => [d * cx, S.CZ + d * sz];
      const prof = [];   // [d, y, kind, dr]
      for (let k = 0; k <= 5; k++) prof.push([(R - S.EB + S.WELT) * k / 5, 0, 'sole']);
      for (let k = 1; k <= 3; k++) { const a = -Math.PI / 2 + (Math.PI / 2) * k / 3; prof.push([R - S.EB + S.WELT + S.EB * Math.cos(a), S.EB + S.EB * Math.sin(a), 'sole']); }
      prof.push([R + S.WELT, S.SOLE - 0.0008, 'sole']);
      prof.push([R, S.SOLE + 0.0008, 'side']);   // the welt's step: the sole band stands proud of the plush
      const [ex, ez] = at(R), hs = F.top(ex, ez, 0);
      prof.push([R, (S.SOLE + hs) / 2, 'side']);
      /* The top, rim to centre. It leaves the side VERTICAL (a root going to zero), so the first
         samples crowd quadratically onto the rim; after that the spacing follows a density with a
         bump where this ray crosses the throat, so the heel's drop is resolved on every ray, not
         stepped across them (the first build's jagged throat). */
      for (let k = 0; k <= 5; k++) { const dr = S.ET * (k / 5) * (k / 5); const [x, z] = at(R - dr); prof.push([R - dr, F.top(x, z, dr), 'top', dr]); }
      const D = R - S.ET, dt = sz < -1e-3 ? (S.THROAT - S.CZ) / sz : 1e9, M = 240, cum = [0];
      for (let m = 1; m <= M; m++) { const d = D * (1 - (m - 0.5) / M); cum.push(cum[m - 1] + 1 + 5 * Math.exp(-Math.pow((d - dt) / (1.3 * S.TW), 2))); }
      for (let k = 1, m = 1; k <= K; k++) {
        const want = cum[M] * k / K; while (m < M && cum[m] < want) m++;
        const f = (m - 1 + (want - cum[m - 1]) / (cum[m] - cum[m - 1])) / M, d = D * (1 - f), [x, z] = at(d);
        prof.push([d, F.top(x, z, R - d), 'top', R - d]);
      }
      NP = prof.length;
      prof.forEach(([d, y, kind, dr]) => {
        const [x, z] = at(d), c = new THREE.Color();
        if (kind === 'sole') c.copy(C.sole);
        else if (kind === 'side') c.copy(C.plush).multiplyScalar(0.72 + 0.28 * F.ss(S.SOLE, 0.04, y));   // the contact at the foot, baked
        else {
          const o = F.open(z), lw = o * F.ss(0.011, 0.02, dr);   // inside the collar's lip: lining
          const deep = Math.min(1, Math.max(0, (y - S.FB) / (S.COL - S.FB)));
          c.copy(C.plush).lerp(col('#000000').copy(C.lining).multiplyScalar(0.6 + 0.4 * deep), lw);
          if (patch && lw < 0.5) { const q = F.ss(patch[2], patch[2] * 0.7, Math.hypot(x - patch[0], z - patch[1])); c.lerp(C.ear, q); }
        }
        push(x, y, z, c);
      });
    }
    // (a, c, b): the profile runs up the side as the angle runs round, and this order faces out
    for (let i = 0; i < NT; i++) { const i2 = (i + 1) % NT; for (let j = 0; j < NP - 1; j++) {
      const a = i * NP + j, b = i2 * NP + j, c = i * NP + j + 1, d = i2 * NP + j + 1;
      IX.push(a, c, b, b, c, d);
    } }
    const body = new THREE.BufferGeometry();
    body.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); body.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
    body.setIndex(IX); body.computeVertexNormals();
    // the two poles (the sole's middle, the dome's): every angle's copy takes the mean, so no star shows
    { const n = body.attributes.normal; [0, NP - 1].forEach(j => {
      const m = [0, 0, 0]; for (let i = 0; i < NT; i++) { const v = i * NP + j; m[0] += n.getX(v); m[1] += n.getY(v); m[2] += n.getZ(v); }
      const l = Math.hypot(m[0], m[1], m[2]); for (let i = 0; i < NT; i++) n.setXYZ(i * NP + j, m[0] / l, m[1] / l, m[2] / l);
    }); }

    /* The EARS: a teardrop, flattened, BENT along its length at a constant curvature — a cantilever
       droop — so it leaves the head tilted up a little, rolls over, and hangs down the slipper's side
       with a gap, as a floppy plush ear does. Built for +x, turned π for the other side. */
    const ear = (side) => {
      const len = 0.05, hw = 0.022, th = 0.005, a0 = -0.15, a1 = -1.95, kap = (a0 - a1) / len;
      const g = new THREE.SphereGeometry(1, 20, 14), p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const s = (p.getX(v) + 1) / 2 * len, w = p.getZ(v) * hw * (0.62 + 0.55 * s / len), t = p.getY(v) * th;
        const a = a0 - kap * s, cx = (Math.sin(a0) - Math.sin(a)) / kap, cy = (Math.cos(a) - Math.cos(a0)) / kap;
        p.setXYZ(v, cx - t * Math.sin(a), cy + t * Math.cos(a), w);
      }
      g.computeVertexNormals(); g.rotateY(0.3);   // swept back a touch
      if (side < 0) g.rotateY(Math.PI);
      // close in, so a pair can stand side by side without their ears meeting
      const rx = side * 0.031, rz = 0.035; g.translate(rx, F.dome(rx, rz) - 0.004, rz); return g;
    };
    // a feature pressed onto the dome at (x, z): its thin axis along the surface normal
    const onDome = (g, x, z, lift) => {
      const n = F.normal(x, z), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(n[0], n[1], n[2]));
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); g.translate(x + n[0] * lift, F.dome(x, z) + n[1] * lift, z + n[2] * lift); return g;
    };
    const blob = (sx, sy, sz, w = 16, h = 12) => { const s = new THREE.SphereGeometry(1, w, h); s.scale(sx, sy, sz); return s; };
    // the muzzle is sunk into the bun, not perched on it: in profile it is the face's front, not a bulb
    const MZ = 0.092, MY = F.dome(0, MZ) - 0.008, muzzle = blob(0.021, 0.015, 0.018, 20, 14); muzzle.rotateX(-0.35); muzzle.translate(0, MY, MZ);
    const tongue = blob(0.0068, 0.0024, 0.0095); tongue.rotateX(0.6); tongue.translate(0, MY - 0.0078, MZ + 0.021);   // lolling out under the muzzle's front
    const coloured = [[body, null], [ear(1), C.ear], [ear(-1), C.ear], [muzzle, C.muzzle], [tongue, C.tongue]];
    const nose = blob(0.0086, 0.0062, 0.006); nose.rotateX(-0.5); nose.translate(0, MY + 0.0105, MZ + 0.0145);
    const eyes = [1, -1].map(sd => onDome(blob(0.0052, 0.0064, 0.0026, 14, 10), sd * 0.02, 0.05, 0.0006));
    // the face's centres, for the harness's "is it seen" rays
    const features = [nose, ...eyes].map(e => { e.computeBoundingBox(); return e.boundingBox.getCenter(new THREE.Vector3()); });
    return { coloured, ink: [nose, ...eyes], shape: F, features };
  }
  function louBuildSlippers(lib, pose) {
    const { THREE, mats } = lib, g = new THREE.Group(); g.name = 'slippersGroup';
    const plush = [], ink = [], boxes = [], feet = [], features = [];
    pose.forEach((p, k) => {
      const sc = p.scale || 1;   // a child's pair is the builder's slipper scaled down
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.yaw, 0)), new THREE.Vector3(sc, sc, sc));
      const s = louSlipperGeometry(lib, { patch: p.patch }), box = new THREE.Box3();
      s.coloured.forEach(([geo, c], j) => { geo.applyMatrix4(m); geo.computeBoundingBox(); box.union(geo.boundingBox); plush.push([geo, c, j === 1 || j === 2 ? k : -1]); });
      s.ink.forEach(geo => { geo.applyMatrix4(m); ink.push([geo, [0, 0, 0]]); });
      boxes.push({ min: box.min.toArray(), max: box.max.toArray() });
      s.features.forEach(v => features.push(v.applyMatrix4(m).toArray()));
      // the footprint's outline in room coordinates (the harness walks it against its neighbours)
      const F = s.shape, out = [];
      for (let i = 0; i < 48; i++) { const th = i / 48 * Math.PI * 2, R = F.rimAt(th) + F.S.WELT, v = new THREE.Vector3(R * Math.cos(th), 0, F.S.CZ + R * Math.sin(th)).applyMatrix4(m); out.push([v.x, v.z]); }
      feet.push(out);
    });
    // the plush: one merge that keeps each part's colour (lib.merge keeps position and normal only)
    const P = [], N = [], CL = [], IX = [], ears = pose.map(() => []); let off = 0;   // ears: per slipper, [first vertex, count] of each ear
    plush.forEach(([geo, c, earOf]) => {
      const p = geo.attributes.position, n = geo.attributes.normal, vc = geo.attributes.color;
      if (earOf >= 0) ears[earOf].push([off, p.count]);
      for (let i = 0; i < p.count; i++) {
        P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i));
        if (vc) CL.push(vc.getX(i), vc.getY(i), vc.getZ(i)); else CL.push(c.r, c.g, c.b);
      }
      if (geo.index) geo.index.array.forEach(v => IX.push(v + off)); else for (let i = 0; i < p.count; i++) IX.push(i + off);
      off += p.count; geo.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); geo.setIndex(IX);
    const body = new THREE.Mesh(geo, mats.slipper); body.name = 'slippers'; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const face = new THREE.Mesh(lib.merge(ink), mats.slipperInk); face.name = 'slipperFace'; face.castShadow = false; face.receiveShadow = true; g.add(face);
    g.userData.louSlippers = { pairs: pose.length, boxes, feet, pose, features, ears };
    return g;
  }

  /* ── The window light (room pass, item 9, 25 Sep 2026) ─────────────────────
     Two additive sheets, static, in the room's one pass: no light, no caster, no post-process.
     BLOOM — a plane standing in front of the curtains. Each fragment follows its own view ray back to
       the glass plane, so the halo sits on the opening from every angle however far the plane stands
       off the wall: a warm rim bleeding over the casing and the curtains' edges, and the painted sun's
       flare where it hides just behind the frame (the garden puts it at the tree's edge).
     SHAFTS — a box sheared along the light, from the opening to the pool the sun spot lights. Each
       fragment integrates its ray's path through the box in 8 steps; two or three soft bands across
       the beam are the shafts. There is no depth texture, so a shaft is haze in front of whatever it
       passes, never cut by it — which is why it stays faint. */
  function louBuildWindowLight(lib, g, o) {
    const { THREE } = lib;
    const [z0, z1] = o.open.z, [y0, y1] = o.open.y, zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
    const [az, el] = o.sun, sun = new THREE.Vector3(-Math.cos(az), el, Math.sin(az)).normalize();   // toward the painted sun
    const vert = 'varying vec3 vWorld;\nvoid main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false };

    const bloomU = {
      uSun: { value: sun }, uOpen: { value: new THREE.Vector4(z0, z1, y0, y1) }, uWallX: { value: o.wallX + 0.003 },
      uColor: { value: new THREE.Color('#ffc890') }, uRim: { value: 0.22 }, uRimW: { value: 0.07 }, uInside: { value: 0.03 }, uFlare: { value: 0.4 },
    };
    const bloom = new THREE.Mesh(new THREE.PlaneGeometry((z1 - z0) + 1.0, (y1 - y0) + 0.8), new THREE.ShaderMaterial(Object.assign({
      uniforms: bloomU, vertexShader: vert,
      fragmentShader: [
        'uniform vec3 uSun; uniform vec4 uOpen; uniform float uWallX; uniform vec3 uColor; uniform float uRim, uRimW, uInside, uFlare;',
        'varying vec3 vWorld;',
        // distance from a point on the glass plane (z, y) to the opening: 0 inside
        'float outside(vec2 q) { vec2 c = 0.5 * vec2(uOpen.x + uOpen.y, uOpen.z + uOpen.w), h = 0.5 * vec2(uOpen.y - uOpen.x, uOpen.w - uOpen.z);',
        '  return length(max(abs(q - c) - h, 0.0)); }',
        'void main() {',
        '  vec3 d = vWorld - cameraPosition;',
        '  vec3 p = cameraPosition + d * ((uWallX - cameraPosition.x) / d.x);',
        '  float o = outside(p.zy);',
        '  float g = o > 0.0 ? uRim * exp(-o / uRimW) : uInside;',
        // the sun: where its ray from THIS eye meets the glass says how far behind the frame it hides
        '  vec3 s = cameraPosition + uSun * ((uWallX - cameraPosition.x) / uSun.x);',
        '  float leak = exp(-pow(outside(s.zy) / 0.14, 2.0)), c = dot(normalize(d), uSun);',
        '  g += uFlare * leak * (exp((c - 1.0) * 900.0) + 0.35 * exp((c - 1.0) * 90.0));',
        '  gl_FragColor = vec4(uColor * g, 1.0);',
        '}'].join('\n'),
    }, additive)));
    bloom.name = 'windowBloom'; bloom.position.set(o.wallX + 0.2, yc, zc); bloom.rotation.y = Math.PI / 2;
    bloom.renderOrder = 3; g.add(bloom);

    /* The beam's frame: a (across the opening, along z), b (up the opening), l (along the light), each
       0..1. The box is baked into world space, and the shader carries the inverse back to that cube. */
    const L = new THREE.Vector3(o.pool[0] - o.wallX, o.pool[1] - yc, o.pool[2] - zc).normalize().multiplyScalar(2.7);
    // a runs z1 → z0 so the matrix keeps a positive determinant: a mirrored box's winding flips, and
    // the NEAR faces would cull (the far ones drawn instead are cut by anything standing in the beam)
    const M = new THREE.Matrix4().set(0, 0, L.x, o.wallX, 0, y1 - y0, L.y, y0, z0 - z1, 0, L.z, z1, 0, 0, 0, 1);
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0.5, 0.5, 0.5); box.applyMatrix4(M);
    const shaftU = {
      uInv: { value: M.clone().invert() }, uColor: { value: new THREE.Color('#ffd6a0') }, uK: { value: 1.2 },
      uBands: { value: new THREE.Vector4(0.2, 0.47, 0.78, 0.07) }, uBandK: { value: new THREE.Vector3(1.0, 0.55, 0.8) },
    };
    const shafts = new THREE.Mesh(box, new THREE.ShaderMaterial(Object.assign({
      uniforms: shaftU, vertexShader: vert,
      fragmentShader: [
        'uniform mat4 uInv; uniform vec3 uColor; uniform float uK; uniform vec4 uBands; uniform vec3 uBandK;',
        'varying vec3 vWorld;',
        'float band(float a, float c, float k) { float x = (a - c) / uBands.w; return k * exp(-x * x); }',
        'void main() {',
        '  vec3 ro = (uInv * vec4(cameraPosition, 1.0)).xyz, rd = (uInv * vec4(vWorld, 1.0)).xyz - ro;',
        // the ray's span inside the unit cube; t = 1 is this fragment
        '  vec3 ia = 1.0 / rd, ta = -ro * ia, tb = (1.0 - ro) * ia, tn = min(ta, tb), tf = max(ta, tb);',
        '  float t0 = max(max(tn.x, tn.y), max(tn.z, 0.0)), t1 = min(min(tf.x, tf.y), tf.z);',
        '  if (t1 <= t0) discard;',
        '  vec3 wd = vWorld - cameraPosition; float dt = (t1 - t0) / 8.0, acc = 0.0;',
        '  for (int i = 0; i < 8; i++) {',
        '    float t = t0 + dt * (float(i) + 0.5); vec3 q = ro + rd * t;',
        // banded up the opening, not across it: a sheet of constant b holds the wall's z, so the
        // presets (looking down −z) see each one edge-on — a streak — where bands across z overlap into haze
        '    float streak = band(q.y, uBands.x, uBandK.x) + band(q.y, uBands.y, uBandK.y) + band(q.y, uBands.z, uBandK.z);',
        '    float wide = smoothstep(0.0, 0.2, q.x) * smoothstep(1.0, 0.8, q.x);',
        '    float along = smoothstep(0.0, 0.08, q.z) * pow(1.0 - q.z, 1.6);',
        '    acc += streak * wide * along * step(0.0, cameraPosition.y + wd.y * t);',   // nothing below the floor
        '  }',
        '  gl_FragColor = vec4(uColor * (uK * acc * dt * length(wd)), 1.0);',
        '}'].join('\n'),
    }, additive)));
    shafts.name = 'windowShafts'; shafts.renderOrder = 3; g.add(shafts);
    [bloom, shafts].forEach(m => { m.castShadow = false; m.receiveShadow = false; m.userData.louNoSolid = true; });
    return { bloom, shafts };
  }

  /* ── The curtains (room pass, round 8, 24 Sep 2026) ────────────────────────
     One half of a pair, drawn OPEN and tied back, to the mockup. Built in the wall's frame, origin at
     the half's outer end of the rod: x off the wall (into the room), y up (absolute), z ALONG the wall
     toward the window (`dir` mirrors it). A grid over the FLAT cloth, u across it and y up it, so the
     linen's metre UVs never stretch, laid onto three things:
     - the SPAN at each height, outer edge to inner edge: the stack on the rod at the top, swept down
       to a narrow bundle at the tie (the inner edge falls near-vertical, then swings in: the swag),
       then flaring out again to the floor like a bell;
     - the FOLDS, a sine across u as deep as the cloth must fold to fit that span (a zig-zag of fixed
       cloth length: the narrower the span, the deeper), each fold's depth jittered so none is stamped;
     - the PINCH: at the tie every point is squeezed inside the band's ellipse, and just above and
       below it the cloth bellies out where the band holds it back.
     Returns the geometry and the band's ellipse (`tie`), so the tie-back is built round exactly it. */
  function louCurtainGeometry(lib, o = {}) {
    const { THREE } = lib;
    const P = Object.assign({ yTop: 1.99, yBot: 0.02, yTie: 0.95, flat: 0.95, folds: 5, top: 0.30, pinch: 0.075, bot: 0.26, a0: 0.012, off: 0.08, dir: 1, seed: 3, nu: 50 }, o);
    const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const hash = (k) => { let h = Math.imul(k + P.seed * 131, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    // the inner edge at height y, measured from the outer edge a0
    const span = (y) => {
      if (y >= P.yTie) { const s = (P.yTop - y) / (P.yTop - P.yTie); return P.top + (P.pinch - P.top) * Math.pow(Math.min(1, Math.max(0, s)), 1.7); }
      const t = Math.min(1, Math.max(0, (P.yTie - y) / (P.yTie - P.yBot))); return P.pinch + (P.bot - P.pinch) * (1 - Math.pow(1 - t, 2.4));
    };
    const L = P.flat / P.folds;
    /* A zig-zag's amplitude for fixed cloth per fold, capped at a slope of 3: past that a fold's flank
       stands edge-on to the camera, and the cloth sheen (brightest edge-on) drew a hairline down every
       one. Under the band the cap lifts, so the pinch stays a round bundle rather than a ribbon. */
    const depth = (w, y) => Math.min(Math.sqrt(Math.max(L * L - (w / P.folds) ** 2, 0)) / 4,
      (3 + 6 * Math.exp(-(((y - P.yTie) / 0.1) ** 2))) * w / P.folds / (2 * Math.PI));
    const jit = Array.from({ length: P.folds + 1 }, (_, k) => 0.8 + 0.4 * hash(k));
    const jitAt = (u) => { const f = u * P.folds, k = Math.min(P.folds - 1, Math.floor(f)), t = f - k, w = (1 - Math.cos(Math.PI * t)) / 2; return jit[k] * (1 - w) + jit[k + 1] * w; };
    // the band: an ellipse round the bundle, its back on a hook just clear of the frame, its front over the folds
    const Atie = depth(P.pinch, P.yTie);
    const tie = { y: P.yTie, xb: P.off - Atie * 1.6, xf: P.off + Atie * 0.85, a0: P.a0 - 0.004, a1: P.a0 + P.pinch + 0.004, h: 0.034, dir: P.dir };
    tie.xc = (tie.xb + tie.xf) / 2; tie.rx = (tie.xf - tie.xb) / 2; tie.ac = (tie.a0 + tie.a1) / 2; tie.ra = (tie.a1 - tie.a0) / 2;
    const Q = 0.84;   // how far inside the band the cloth is squeezed (1 = the band's centreline)
    // rows: fine through the pinch, coarse where the cloth hangs straight
    const ys = []; for (let y = P.yBot; y < P.yTop; y += 0.006 + 0.034 * ss(0.03, 0.14, Math.abs(y - P.yTie))) ys.push(y); ys.push(P.yTop);
    const pos = [], uv = [], col = [], idx = [], NU = P.nu;
    ys.forEach(y => {
      const w = span(y), A0 = depth(w, y);
      const dy = y - P.yTie, pouf = 1 + 0.55 * (Math.exp(-(((dy - 0.085) / 0.06) ** 2)) + 0.7 * Math.exp(-(((dy + 0.075) / 0.055) ** 2)));
      const hold = 1 - ss(0.022, 0.07, Math.abs(dy));   // 1 under the band, easing to 0 either side
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const fold = Math.sin(Math.PI * 2 * P.folds * u);
        let x = P.off + A0 * pouf * jitAt(u) * fold, a = P.a0 + u * w;
        if (hold > 0) {
          const ex = (x - tie.xc) / tie.rx, ea = (a - tie.ac) / tie.ra, q = Math.hypot(ex, ea);
          if (q > Q) { const k = 1 + (Q / q - 1) * hold; x = tie.xc + ex * tie.rx * k; a = tie.ac + ea * tie.ra * k; }
        }
        /* The fold's cavity, baked (the cushions' method, DD-32): a valley, back toward the wall, sees
           less of the room than a crest, and the bundle under the band less again. Only the fill
           lights this cloth, so without it the folds were drawn and never shaded. */
        const k = (0.74 + 0.26 * (0.5 + 0.5 * fold)) * (1 - 0.14 * hold);
        pos.push(x, y, a * P.dir); uv.push(u * P.flat, y); col.push(k, k, k);
      }
    });
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < NU; i++) {
      const p = j * (NU + 1) + i, q = p + NU + 1;
      if (P.dir < 0) idx.push(p, p + 1, q, p + 1, q + 1, q); else idx.push(p, q, p + 1, p + 1, q, q + 1);   // front face to the room (+x)
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    geo.userData.louGrid = { nu: NU, ys, yTie: P.yTie, span: ys.map(span) };   // the harness reads fold slopes row by row
    return { geometry: geo, tie };
  }
  /* The tie-back: a flat band round the curtain's ellipse at the tie, a little outside it (the cloth is
     squeezed to Q of it), 3.4 cm tall and 8 mm thick. A round tube along the ellipse, then scaled up in
     y: the loop lies flat, so the scale only stretches its cross-section into a band. */
  function louTiebackGeometry(lib, tie) {
    const { THREE } = lib, pts = [];
    for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; pts.push(new THREE.Vector3(tie.xc + Math.cos(t) * tie.rx, 0, (tie.ac + Math.sin(t) * tie.ra) * tie.dir)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.004, 8, true);
    geo.scale(1, tie.h / 0.008, 1); geo.translate(0, tie.y, 0);
    return geo;
  }

  const api = { louBuildRoom, louCurtainGeometry, louTiebackGeometry, louBuildPlant, louBuildMug, LOU_MUG, louBuildSlippers, louSlipperShape, LOU_SLIPPER };
  if (typeof window !== 'undefined') window.LouRoom = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
