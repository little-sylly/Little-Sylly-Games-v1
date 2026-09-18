// ═══════════════════════════════════════════════════════════════════════════
// prm-room.js — Premium lounge: the shell. Walls, floor, rug, furniture, the
// curtain, the window, the sill plant, two prints. Spec § 6 + the 2026-09-19 re-block. Everything is geometry; every
// patterned surface is a canvas texture from prm-lib. Fixed warm neutrals —
// never the player's colours (the props are what pop).
// Pure: takes lib, touches no DOM. Nothing here is a pick target.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function prmBuildRoom(lib) {
    const { THREE, mats, tex } = lib;
    const moulded = lib.moulded.bind(lib);
    /* The re-block (spec 2026-09-19 § 3.1): a corner about 3.2 m wide and 1.9 m
       deep, the bench a metre behind a table that sits right of centre, and a
       seat we are sitting on. Every prop reads its surface from here. */
    const R = { floorY: 0, backZ: -1.55, leftX: -1.6, benchZ: -1.15, benchTopY: 0.52, tableTopY: 0.44, tableX: 0.35, tableZ: 0.05, armTopY: 0.58, seatTopY: 0.47, sillTopY: 0.68 };
    const g = new THREE.Group(); g.name = 'room';
    const add = (name, geo, mat, pos, rot, o = {}) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      m.receiveShadow = o.receive !== false; m.castShadow = !!o.cast; g.add(m); return m;
    };
    const FLAT = [-Math.PI / 2, 0, 0];   // a moulded slab extrudes along z; this lays it on the floor

    // walls + trim — the planes overhang the frame; the cornice is the one line that says "room" at the top
    add('wallBack', new THREE.PlaneGeometry(5.6, 3.2), mats.wall, [0.0, 1.6, R.backZ]);
    add('wallLeft', new THREE.PlaneGeometry(4.0, 3.2), mats.wall, [R.leftX, 1.6, 0.0], [0, Math.PI / 2, 0]);
    add('skirtingBack', new THREE.BoxGeometry(5.6, 0.1, 0.02), mats.skirting, [0.0, 0.05, R.backZ + 0.01]);
    add('skirtingLeft', new THREE.BoxGeometry(0.02, 0.1, 4.0), mats.skirting, [R.leftX + 0.01, 0.05, 0.0]);
    add('cornice', new THREE.BoxGeometry(5.6, 0.06, 0.04), mats.skirting, [0.0, 3.17, R.backZ + 0.02]);
    add('floor', new THREE.PlaneGeometry(9, 9), mats.floor, [0.5, 0, 0.5], FLAT);

    // rug — round braided jute under the table; receives every table prop's contact shadow
    add('rug', new THREE.CylinderGeometry(0.88, 0.88, 0.012, 48), mats.rug, [R.tableX, 0.006, R.tableZ]);
    add('rugEdge', new THREE.TorusGeometry(0.88, 0.012, 8, 64), mats.rugEdge, [R.tableX, 0.008, R.tableZ], FLAT);

    // coffee table (top surface = tableTopY), right of centre so it is not stacked under the telly
    add('tableTop', moulded(1.1, 0.62, 0.04, 0.05), mats.birch, [R.tableX, R.tableTopY - 0.02, R.tableZ], FLAT, { cast: true });
    [[-0.48, 0.22], [0.48, 0.22], [-0.48, -0.22], [0.48, -0.22]].forEach(([x, z], i) =>
      add('tableLeg' + i, new THREE.CylinderGeometry(0.02, 0.025, 0.4, 16), mats.birchDark, [R.tableX + x, 0.2, R.tableZ + z], null, { cast: true }));

    // TV bench: body spans y 0.08..0.52 on two short legs; the deck lives in the open middle. Slightly LEFT of centre (the table is right)
    const BX = -0.15;
    add('bench', moulded(1.9, 0.44, 0.46, 0.05), mats.birch, [BX, 0.30, R.benchZ], null, { cast: true });
    add('benchDrawerL', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [BX - 0.65, 0.30, R.benchZ + 0.235]);
    add('benchDrawerR', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [BX + 0.65, 0.30, R.benchZ + 0.235]);
    add('benchKnobL', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [BX - 0.65, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    add('benchKnobR', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [BX + 0.65, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    [BX - 0.85, BX + 0.85].forEach((x, i) => add('benchLeg' + i, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12), mats.birchDark, [x, 0.04, R.benchZ]));
    add('deck', moulded(0.42, 0.1, 0.3, 0.015), mats.cream, [BX, 0.30, R.benchZ + 0.06], null, { cast: true });
    for (let i = 0; i < 4; i++) add('deckKey' + i, new THREE.BoxGeometry(0.03, 0.012, 0.02), mats.plum, [BX - 0.12 + i * 0.045, 0.315, R.benchZ + 0.215]);

    /* Bookshelf: a LOW floor-standing unit right of the bench. The frame's top edge crosses the
       back wall at only ~1.37 m from this camera, so a wall-mounted unit at chest height is simply
       out of shot — every board has to live below that. The photo-carousel lamp takes the lowest
       board (owner, 19 Sep 2026) where it is nearest the eye and a real tap target; books sit above
       it and the trinket easter eggs top out the unit. */
    /* x sits clear of the bench's right edge (0.80) by a visible gap, not a hairline. */
    const S = { x: 1.52, w: 0.80, d: 0.22, ys: [0.42, 0.80, 1.18], side: 0.02, h: 1.35 }; S.z = R.backZ + S.d / 2;
    add('shelfBack', new THREE.BoxGeometry(S.w, S.h, 0.01), mats.birchDark, [S.x, S.h / 2, R.backZ + 0.005]);
    add('shelfSideL', new THREE.BoxGeometry(S.side, S.h, S.d), mats.birch, [S.x - S.w / 2, S.h / 2, S.z], null, { cast: true });
    add('shelfSideR', new THREE.BoxGeometry(S.side, S.h, S.d), mats.birch, [S.x + S.w / 2, S.h / 2, S.z], null, { cast: true });
    S.ys.forEach((y, i) => add('shelfBoard' + i, new THREE.BoxGeometry(S.w, 0.02, S.d), mats.birch, [S.x, y, S.z], null, { cast: true }));
    add('shelfTop', new THREE.BoxGeometry(S.w + 0.04, 0.025, S.d + 0.02), mats.birch, [S.x, S.h, S.z], null, { cast: true });

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
         The backs therefore reach 6 cm into the seat horizontally and drop 20 cm below its top,
         the way a real couch's back panel continues down behind the cushion. */
    const SEAT_H = 0.47, BACK_H = 0.41, BACK_T = 0.13, BACK_BITE = 0.06, BACK_DROP = 0.20;
    /* frontZ1 sits BEHIND the camera (z 1.50), so the front back-rest is what we are leaning on
       rather than a pale wall across the bottom of the shot — which is what it was at 1.35. The
       arms are wide enough to leave the table its air; a tighter U swallowed the rug whole. */
    const U = { frontZ0: 0.55, frontZ1: 1.50, armZ0: -0.30, armZ1: 0.60, leftX: -0.95, rightX: 1.55, innerL: -0.42, innerR: 1.10 };
    const seatY = R.seatTopY - SEAT_H / 2;
    // the back's own box: thickness + the bite it takes out of the seat, dropped below the seat top
    const backT = BACK_T + BACK_BITE, backH = BACK_H + BACK_DROP;
    const backY = R.seatTopY + BACK_H / 2 - BACK_DROP / 2;
    const backOff = BACK_T / 2 - BACK_BITE / 2;   // centre offset from the seat's outer face
    const span = (a, b) => b - a, mid = (a, b) => (a + b) / 2;

    add('seatFront', moulded(span(U.leftX, U.rightX) + 0.05, SEAT_H, span(U.frontZ0, U.frontZ1), 0.09), mats.fabric,
        [mid(U.leftX, U.rightX), seatY, mid(U.frontZ0, U.frontZ1)], null, { cast: true });
    add('seatLeft', moulded(span(U.leftX, U.innerL), SEAT_H, span(U.armZ0, U.armZ1), 0.09), mats.fabric,
        [mid(U.leftX, U.innerL), seatY, mid(U.armZ0, U.armZ1)], null, { cast: true });
    add('seatRight', moulded(span(U.innerR, U.rightX), SEAT_H, span(U.armZ0, U.armZ1), 0.09), mats.fabric,
        [mid(U.innerR, U.rightX), seatY, mid(U.armZ0, U.armZ1)], null, { cast: true });
    // backs — each shares a face with its own seat, so the U reads as one piece of furniture
    add('backFront', moulded(span(U.leftX, U.rightX) + 0.05, backH, backT, 0.06), mats.fabric,
        [mid(U.leftX, U.rightX), backY, U.frontZ1 + backOff], null, { cast: true });
    add('backLeft', moulded(backT, backH, span(U.armZ0, U.frontZ1), 0.06), mats.fabric,
        [U.leftX - backOff, backY, mid(U.armZ0, U.frontZ1)], null, { cast: true });
    add('backRight', moulded(backT, backH, span(U.armZ0, U.frontZ1), 0.06), mats.fabric,
        [U.rightX + backOff, backY, mid(U.armZ0, U.frontZ1)], null, { cast: true });
    // arms capping the U's two open ends, facing the telly — they bite into the seat for the same reason
    const ARM_D = 0.18 + BACK_BITE;
    add('armLeft', moulded(span(U.leftX, U.innerL), 0.58, ARM_D, 0.09), mats.fabric,
        [mid(U.leftX, U.innerL), R.armTopY - 0.29, U.armZ0 - 0.09 + BACK_BITE / 2], null, { cast: true });
    add('armRight', moulded(span(U.innerR, U.rightX), 0.58, ARM_D, 0.09), mats.fabric,
        [mid(U.innerR, U.rightX), R.armTopY - 0.29, U.armZ0 - 0.09 + BACK_BITE / 2], null, { cast: true });

    // window on the LEFT wall — the visible source of the key. Centre sits toward the back so the
    // whole opening is in frame from the couch. Sill = a birch ledge the plant sits on (step 3).
    const WZ = -1.05, WY = 1.25, WW = 0.72, WH = 1.1;   // the slit sits toward the FAR end, and the plant sits in it
    add('window', new THREE.PlaneGeometry(WW, WH), mats.window, [R.leftX + 0.005, WY, WZ], [0, Math.PI / 2, 0]);
    /* The sill protrudes PAST the curtain line into the room, so the plant stands in front of the
       drapes and reads as a silhouette against them. Sitting it flush with the wall put the curtain
       in front of the plant and the whole left-side flair simply never appeared in frame. */
    add('sill', new THREE.BoxGeometry(0.28, 0.03, 0.82), mats.birch, [R.leftX + 0.14, R.sillTopY - 0.015, WZ], null, { cast: true });
    /* Drawn, in two halves, a 0.10 m slit at about 40 % of the width (spec D5). The halves do NOT
       cast: the sun light passes through the curtain as a real drawn curtain glows and diffuses —
       the slit's bright stripe is its own narrow light in prm-scene.js, not a shadow cut-out. */
    /* Drawn back to a hand-width gap at 25% of the run, with the cattails standing in it. The two
       halves are sized ASYMMETRICALLY around that gap: giving both the same width (CUR_W - GAP)/2
       pushed the short half straight through the back wall, because an off-centre gap does not
       split a run evenly. The curtain hugs the wall so the plant clears it and catches the sun. */
    const CUR_W = 0.80, GAP = 0.17, CUR_X = R.leftX + 0.07;
    const curZ0 = WZ - CUR_W / 2, curZ1 = WZ + CUR_W / 2, gapAt = curZ0 + CUR_W * 0.25;
    const curL = [curZ0, gapAt - GAP / 2], curR = [gapAt + GAP / 2, curZ1];
    add('curtainL', prmCurtainGeometry(lib, curL[1] - curL[0], 2.2, 2), mats.curtain, [CUR_X, 1.15, (curL[0] + curL[1]) / 2], [0, Math.PI / 2, 0], { cast: false });
    add('curtainR', prmCurtainGeometry(lib, curR[1] - curR[0], 2.2, 4), mats.curtain, [CUR_X, 1.15, (curR[0] + curR[1]) / 2], [0, Math.PI / 2, 0], { cast: false });

    // the cattails on the sill (owner, 19 Sep 2026) — furniture: no pick id, no design role
    // standing IN the curtains' gap, so the sun actually reaches it
    const plant = prmBuildPlant(lib); plant.position.set(R.leftX + 0.20, R.sillTopY, gapAt); g.add(plant);

    // two prints on the shelf wall
    const print = (id, x, y, seed) => {
      add('print' + id, new THREE.BoxGeometry(0.22, 0.28, 0.02), mats.birchDark, [x, y, R.backZ + 0.01]);
      add('print' + id + 'Face', new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: tex.abstract(seed), roughness: .9 }), [x, y, R.backZ + 0.021]);
    };
    print('A', -0.88, 1.18, 1); print('B', -0.52, 1.06, 5);   // above the jukebox: over the telly they cluttered it

    g.userData.prmRoom = R; g.userData.prmShelf = S;
    return g;
  }

  /* The sill plant: cattails. A cylinder pot with a collar, arcing blades, and three fuzzy heads
     on thin stems. Chosen over the fly-trap for the same reason the whole left side exists — it is
     read as a SILHOUETTE against a backlit curtain, and three tall spikes survive that where a
     blobby mass becomes a smudge. Fixed colours, no pick id: it is furniture.
     Group origin = the pot's base, so the caller drops it straight onto sillTopY. */
  function prmBuildPlant(lib) {
    const { THREE, mats } = lib; const g = new THREE.Group(); g.name = 'plant';
    const mesh = (name, geo, mat, pos, rot, cast = true) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
    };
    const PH = 0.085;
    mesh('pot', new THREE.CylinderGeometry(0.043, 0.038, PH, 24), mats.potCream, [0, PH / 2, 0]);
    mesh('potCollar', new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), mats.leaf, [0, PH - 0.008, 0]);
    mesh('soil', new THREE.CylinderGeometry(0.04, 0.04, 0.008, 20), mats.plum, [0, PH - 0.002, 0], null, false);

    // blades — flattened tapered cones fanning out and arcing over
    const bladeGeo = new THREE.CylinderGeometry(0.0015, 0.011, 0.13, 6); bladeGeo.translate(0, 0.065, 0); bladeGeo.scale(1, 1, 0.3);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.5, lean = 0.32 + (i % 3) * 0.16;
      mesh('blade' + i, bladeGeo, mats.leaf, [Math.cos(a) * 0.012, PH, Math.sin(a) * 0.012],
           [Math.sin(a) * lean, -a, -Math.cos(a) * lean]);
    }
    // three cattails: a thin stem with a fuzzy head, each a different height
    const headGeo = new THREE.CylinderGeometry(0.0105, 0.0105, 0.055, 12);
    const capGeo = new THREE.SphereGeometry(0.0105, 12, 8);
    [[0.0, 0.20], [-0.018, 0.165], [0.019, 0.145]].forEach(([dx, len], i) => {
      const dz = i * 0.008 - 0.008;
      mesh('stem' + i, new THREE.CylinderGeometry(0.0025, 0.003, len, 6), mats.leaf, [dx, PH + len / 2, dz], [0, 0, -dx * 1.6], false);
      const head = mesh('cattail' + i, headGeo, mats.cattail, [dx * 1.16, PH + len + 0.026, dz]);
      // rounded ends, so the head reads as a fuzzy sausage rather than a cut cylinder
      [['capA', 0.0275], ['capB', -0.0275]].forEach(([n, y]) => {
        const cap = new THREE.Mesh(capGeo, mats.cattail); cap.name = n; cap.position.y = y;
        cap.castShadow = true; head.add(cap);
      });
    });
    return g;
  }

  /* A sine-wave strip extruded to the curtain's height. Drawn in the shape's
     XY plane, extruded along z, then rotated so the extrusion stands up (y)
     and the wave runs along z. */
  function prmCurtainGeometry(lib, w, h, waves) {
    const { THREE } = lib; const amp = 0.04, thick = 0.012, N = 64;
    const s = new THREE.Shape();
    const wave = (t) => Math.sin(t * Math.PI * 2 * waves) * amp;
    s.moveTo(-w / 2, wave(0));
    for (let i = 1; i <= N; i++) { const t = i / N; s.lineTo(-w / 2 + t * w, wave(t)); }
    for (let i = N; i >= 0; i--) { const t = i / N; s.lineTo(-w / 2 + t * w, wave(t) + thick); }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 });
    geo.center(); geo.rotateX(-Math.PI / 2);
    return geo;
  }

  const api = { prmBuildRoom, prmCurtainGeometry, prmBuildPlant };
  if (typeof window !== 'undefined') window.PrmRoom = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
