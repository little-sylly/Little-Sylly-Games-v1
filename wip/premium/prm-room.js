// ═══════════════════════════════════════════════════════════════════════════
// prm-room.js — Premium lounge: the shell. Walls, floor, rug, furniture, the
// curtain, the floor lamp, two prints. Spec § 6. Everything is geometry; every
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
    const R = { floorY: 0, backZ: -1.55, leftX: -1.6, benchZ: -1.15, benchTopY: 0.52, tableTopY: 0.44, tableX: 0.35, tableZ: 0.05, armTopY: 0.58, seatTopY: 0.47, sillTopY: 0.68, sideTableTopY: 0.565 };
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

    // rug — receives every table prop's contact shadow (round in Task 3)
    add('rug', moulded(2.3, 1.7, 0.012, 0.08, { bevel: 0.004 }), mats.rug, [R.tableX, 0.006, R.tableZ], FLAT);

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

    // bookshelf unit, wall-mounted right of the bench; books + trinkets are props (prmBuildShelf)
    const S = { x: 1.55, w: 0.85, d: 0.22, ys: [1.12, 1.48, 1.84], side: 0.02 }; S.z = R.backZ + S.d / 2;
    add('shelfBack', new THREE.BoxGeometry(S.w, 0.9, 0.01), mats.birchDark, [S.x, 1.5, R.backZ + 0.005]);
    add('shelfSideL', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x - S.w / 2, 1.5, S.z], null, { cast: true });
    add('shelfSideR', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x + S.w / 2, 1.5, S.z], null, { cast: true });
    S.ys.forEach((y, i) => add('shelfBoard' + i, new THREE.BoxGeometry(S.w, 0.02, S.d), mats.birch, [S.x, y, S.z], null, { cast: true }));

    // side table (top surface = sideTableTopY) — carries the photo-carousel lamp
    add('sideTableTop', new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), mats.birch, [-1.7, R.sideTableTopY - 0.015, -2.1], null, { cast: true });
    [0, 1, 2].forEach(i => { const a = i * 2 * Math.PI / 3;
      add('sideTableLeg' + i, new THREE.CylinderGeometry(0.015, 0.018, 0.55, 12), mats.birchDark,
          [-1.7 + Math.sin(a) * 0.15, 0.27, -2.1 + Math.cos(a) * 0.15], [Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]); });

    // the couch we are sitting on: a seat cushion along the bottom of frame (top = seatTopY) and the arm
    // it belongs to, left of the table, reaching ahead of the seat so its front shows bottom-left
    add('seat', moulded(1.3, 0.47, 1.0, 0.09), mats.fabric, [0.07, R.seatTopY - 0.235, 1.08], null, { cast: true });
    add('couchArm', moulded(0.4, 0.58, 0.95, 0.09), mats.fabric, [-0.62, R.armTopY - 0.29, 0.925], null, { cast: true });

    // window on the LEFT wall — the visible source of the key. Centre sits toward the back so the
    // whole opening is in frame from the couch. Sill = a birch ledge the plant sits on (step 3).
    const WZ = -0.90, WY = 1.25, WW = 0.75, WH = 1.1;
    add('window', new THREE.PlaneGeometry(WW, WH), mats.window, [R.leftX + 0.005, WY, WZ], [0, Math.PI / 2, 0]);
    add('sill', new THREE.BoxGeometry(0.16, 0.03, 0.9), mats.birch, [R.leftX + 0.08, R.sillTopY - 0.015, WZ], null, { cast: true });
    /* Drawn, in two halves, a 0.10 m slit at about 40 % of the width (spec D5). The halves do NOT
       cast: the sun light passes through the curtain as a real drawn curtain glows and diffuses —
       the slit's bright stripe is its own narrow light in prm-scene.js, not a shadow cut-out. */
    const CUR_W = 1.0, GAP = 0.10, halfW = (CUR_W - GAP) / 2, gapAt = WZ - CUR_W / 2 + CUR_W * 0.40;
    add('curtainL', prmCurtainGeometry(lib, halfW, 2.2, 4), mats.curtain, [R.leftX + 0.12, 1.15, gapAt - GAP / 2 - halfW / 2], [0, Math.PI / 2, 0], { cast: false });
    add('curtainR', prmCurtainGeometry(lib, halfW, 2.2, 4), mats.curtain, [R.leftX + 0.12, 1.15, gapAt + GAP / 2 + halfW / 2], [0, Math.PI / 2, 0], { cast: false });

    // two prints on the shelf wall
    const print = (id, x, y, seed) => {
      add('print' + id, new THREE.BoxGeometry(0.22, 0.28, 0.02), mats.birchDark, [x, y, R.backZ + 0.01]);
      add('print' + id + 'Face', new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: tex.abstract(seed), roughness: .9 }), [x, y, R.backZ + 0.021]);
    };
    print('A', 1.35, 2.4, 1); print('B', 1.8, 2.3, 5);

    g.userData.prmRoom = R; g.userData.prmShelf = S;
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

  const api = { prmBuildRoom, prmCurtainGeometry };
  if (typeof window !== 'undefined') window.PrmRoom = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
