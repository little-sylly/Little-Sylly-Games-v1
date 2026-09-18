// ═══════════════════════════════════════════════════════════════════════════
// prm-props.js — Premium lounge: the props. One pure builder per prop plus the
// DATA the scene runs on: what each pick id does (PRM_ACTIONS), where each prop
// sits (PRM_PLACES), the keyboard order (PRM_TAB_ORDER). Spec §§ 7, 8, 9.
//
// Pure: every builder takes lib (which carries THREE) and data, touches no DOM,
// loads no image — a material that wants one is tagged userData.prmImage = url
// and prm-scene.js loads it after mount. verify-prm-props.js drives all of it
// under Node.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  /* What a tap on each pick id does. `callback` names a host callback; `local`
     names a prop api call. The scene interprets the flags — see prmMount. */
  const PRM_ACTIONS = {
    'tv-screen':      { callback: 'enterTV', arg: null, pushIn: 'tv-screen' },
    'tv-channel':     { callback: 'openSwitcher', turn: true },
    'tv-volume':      { callback: 'openSound', turn: true },
    'jukebox-knob':   { callback: 'openSound' },
    'jukebox-record': { callback: 'music.next' },
    'dial':           { callback: 'enterTV', spin: true, pushIn: 'tv-screen' },
    'phone':          { callback: 'enterShelves', fade: true },
    'controller':     { callback: 'openWorkshop' },
    'lamp':           { local: 'flick' },
    'binder':         { callback: 'openStickerbook', optional: true, fallback: 'openCover' },
  };
  /* Keyboard / remote order, spec § 9.2. */
  const PRM_TAB_ORDER = ['tv-screen', 'jukebox-record', 'dial', 'binder', 'phone', 'controller', 'lamp'];
  /* World placement per prop group. y values sit on the room's surfaces
     (prm-room.js prmRoom): bench top 0.52, table top 0.44, arm top 0.58,
     side table top 0.565. A builder's group origin is its resting base. */
  const PRM_PLACES = {
    tv:            { pos: [-0.20, 0.52, -2.50] },
    jukebox:       { pos: [ 0.85, 0.52, -2.50] },
    dial:          { pos: [ 0.35, 0.44,  0.30] },
    binder:        { pos: [-0.25, 0.44,  0.20], rot: [0, 0.18, 0] },
    phone:         { pos: [ 0.55, 0.44,  0.57], rot: [0, -0.5, 0] },
    controller:    { pos: [-1.30, 0.58,  1.30], rot: [0, -0.35, 0] },
    lamp:          { pos: [-1.70, 0.565, -2.10] },
    shelfContents: { pos: [0, 0, 0] },
  };
  /* Builders register here, one per task: id → (ctx, shared) => Group. */
  const PRM_BUILDERS = {};

  function prmBuildAll(ctx) {
    const shared = { earGeometry: ctx.ControllerBody ? ctx.ControllerBody.buildEars(ctx.lib.THREE, ctx.lib.mats.cream)[0].geometry : null };
    const out = {};
    Object.keys(PRM_BUILDERS).forEach(id => { const g = PRM_BUILDERS[id](ctx, shared); g.name = id; out[id] = g; });
    return out;
  }

  /* Tiny tween list. add() queues; tick(now) advances all and returns whether
     any is still running — the scene's render-on-demand loop reads that. */
  function prmMotion() {
    const tweens = [];
    return {
      add(from, to, ms, ease, onUpdate, onDone) { tweens.push({ from, to, ms, ease, onUpdate, onDone, t0: null }); },
      tick(now) {
        for (let i = tweens.length - 1; i >= 0; i--) {
          const tw = tweens[i]; if (tw.t0 === null) tw.t0 = now;
          const p = Math.min(1, (now - tw.t0) / tw.ms);
          tw.onUpdate(tw.from + (tw.to - tw.from) * tw.ease(p));
          if (p >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
        }
        return tweens.length > 0;
      },
      active: () => tweens.length > 0,
      clear() { tweens.length = 0; },
    };
  }
  const prmEaseOutCubic = p => 1 - Math.pow(1 - p, 3);
  const prmEaseOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  /* Helpers every builder uses. tag() marks a pick node. */
  function prmMesh(THREE, geo, mat, name, pos, rot, cast = true) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = cast; m.receiveShadow = true; return m;
  }
  function prmTag(obj, id) { obj.userData.prmId = id; return obj; }

  /* The TV's attract screen, spec § 8. Pure drawing on an injected canvas; the
     scene turns it into a CanvasTexture and calls draw() at ~10 fps. */
  const PRM_ATTRACT_LINES = ['Tap the telly to browse the box.', 'Game night. No excuses.', 'Twenty games. One couch.', 'Pick a game, any game.'];
  function prmAttract(makeCanvas, games, lines = PRM_ATTRACT_LINES) {
    const W = 512, H = 384, c = makeCanvas(W, H), x = c.getContext('2d');
    const imgs = {}; let frame = 0;
    function draw(tSec) {
      x.fillStyle = '#e4f0e8'; x.fillRect(0, 0, W, H);
      const pitch = 150, speed = 50, span = games.length * pitch, off = (tSec * speed) % span;
      games.forEach((g, i) => {
        [W + i * pitch - off, W + i * pitch - off - span].forEach(px => {
          if (px < -pitch || px > W + pitch) return;
          const img = imgs[g.id];
          if (img) x.drawImage(img, px, 170, 110, 110);
          else { x.fillStyle = g.brandHex; x.beginPath(); x.arc(px + 55, 225, 45, 0, 7); x.fill(); }
        });
      });
      x.fillStyle = '#2B1B45'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold 44px Fredoka, sans-serif'; x.fillText("LITTLE SYLLY'S LOUNGE", W / 2, 90);
      x.font = '22px Fredoka, sans-serif'; x.fillText(lines[Math.floor(tSec / 6) % lines.length], W / 2, 330);
      x.fillStyle = 'rgba(0,0,0,0.06)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);   // scanlines
      frame++;
    }
    return { canvas: c, draw, attach(id, img) { imgs[id] = img; }, frames: () => frame };
  }

  // ── builders are appended below by Tasks 5–9 ──────────────────────────────

  /* The player's controller: the shipped geometry, mounted with the design's
     flat colours. Stickers and the plate outline come with the production
     round (the atlas painter lives in js/controller.js). Never monochrome. */
  function prmBuildController(lib, design, CB) {
    const { THREE } = lib; const g = new THREE.Group(); prmTag(g, 'controller');
    const geo = CB.buildBody(THREE, {});
    const body = new THREE.Mesh(geo, lib.role('shell', design.shell)); body.name = 'body'; body.castShadow = body.receiveShadow = true;
    const inner = new THREE.Group(); inner.name = 'rig'; inner.add(body);
    CB.buildEars(THREE, lib.role('ears', design.ears)).forEach(m => inner.add(m));
    const controls = CB.buildControls(THREE, geo); inner.add(controls.group);
    controls.group.traverse(o => {
      if (!o.isMesh || !o.material) return; o.castShadow = true;
      const pd = o.parent && o.parent.name === 'D-pad';
      if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || pd || / stick$/.test(o.name) || / well$/.test(o.name)) {
        o.material = o.material.clone(); o.material.userData.prmRole = 'buttons'; o.material.color.set(design.buttons);
      }
    });
    /* Body units are ~4.6 wide; 0.036 makes it ~16.5 cm. Face up, leaning toward the camera. */
    inner.scale.setScalar(0.036); inner.rotation.x = -Math.PI / 2 + 0.28;
    inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner); inner.position.y = -bb.min.y;   // rest the lowest point on the group origin
    g.add(inner);
    g.userData.api = { tick() { return false; } };
    return g;
  }
  PRM_BUILDERS.controller = (ctx) => prmBuildController(ctx.lib, ctx.design, ctx.ControllerBody);

  /* The telly: a CRT silhouette in the controller's material language. Body =
     shell, bezel = plate, dials = buttons, ears = the controller's own ear
     geometry scaled up and stood upright. The screen is a sphere section. */
  function prmBuildTV(lib, design, opts = {}) {
    const { THREE, mats } = lib; const W = 0.62, H = 0.48, D = 0.40, FEET = 0.03;
    const g = new THREE.Group();
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const cy = FEET + H / 2;   // body centre, so the feet rest on the group origin
    g.add(prmMesh(THREE, lib.moulded(W, H, D, 0.06), shell, 'body', [0, cy, 0]));
    // screen: sphere section facing +z, bulging ~2 cm proud of the bezel
    const R = 1.2, sw = 0.40, sh = 0.30, phiL = sw / R, thL = sh / R;
    /* The bezel is a FRAME, not a plate: an aperture the glass shows through.
       Cut it with a hole rather than a solid slab, or it sits in the screen's
       own depth range and hides it completely. The bevel closes the hole in by
       bevelSize on each side, so the cut is that much oversize. */
    const BEZ_BEV = 0.006;
    const bezelShape = lib.roundedRect(W - 0.04, H - 0.04, 0.05);
    bezelShape.holes.push(lib.roundedRect(sw + 0.02 + 2 * BEZ_BEV, sh + 0.02 + 2 * BEZ_BEV, 0.03));
    g.add(prmMesh(THREE, lib.extrude(bezelShape, 0.03, BEZ_BEV, { crease: 25 }), plate, 'bezel', [0, cy, D / 2 + 0.005]));
    const screenGeo = new THREE.SphereGeometry(R, 40, 30, Math.PI / 2 - phiL / 2, phiL, Math.PI / 2 - thL / 2, thL);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#dfeee4', emissive: '#ffffff', emissiveIntensity: 0.48, roughness: .25, metalness: 0 });
    if (opts.attractTexture) { screenMat.map = opts.attractTexture; screenMat.emissiveMap = opts.attractTexture; }
    const screen = prmMesh(THREE, screenGeo, screenMat, 'screen', [-0.05, cy, D / 2 + 0.02 - R], null, false); prmTag(screen, 'tv-screen'); g.add(screen);
    const glow = prmMesh(THREE, new THREE.PlaneGeometry(sw + 0.04, sh + 0.04),
      new THREE.MeshBasicMaterial({ color: '#cfe9dc', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }), 'screenGlow', [-0.05, cy, D / 2 + 0.03], null, false); g.add(glow);
    // two dials on the control strip, each with a chrome rim and a mark that turns with it
    const dialGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.03, 28), rimGeo = new THREE.TorusGeometry(0.036, 0.006, 10, 36);
    [['tv-channel', 0.10], ['tv-volume', -0.04]].forEach(([id, dy]) => {
      const d = prmMesh(THREE, dialGeo, buttons, id, [0.22, cy + dy, D / 2 + 0.03], [Math.PI / 2, 0, 0]); prmTag(d, id);
      d.add(prmMesh(THREE, new THREE.BoxGeometry(0.004, 0.004, 0.02), mats.plum, id + '-mark', [0, 0.016, -0.02]));
      g.add(d); g.add(prmMesh(THREE, rimGeo, mats.chrome, id + '-rim', [0.22, cy + dy, D / 2 + 0.035]));
    });
    for (let i = 0; i < 6; i++) g.add(prmMesh(THREE, new THREE.BoxGeometry(0.09, 0.006, 0.006), mats.plum, 'grille' + i, [0.22, cy - 0.12 - i * 0.014, D / 2 + 0.022], null, false));
    if (opts.earGeometry) [-1, 1].forEach(side => {
      const e = new THREE.Mesh(opts.earGeometry, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.scale.setScalar(0.24); e.position.set(side * 0.2, cy + H / 2 + 0.06, -0.04); e.rotation.set(-0.12, 0, -side * 0.1);
      e.castShadow = e.receiveShadow = true; g.add(e);
    });
    [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.12], [0.24, 0.12]].forEach(([x, z], i) =>
      g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.02, 0.022, FEET, 16), shell, 'foot' + i, [x, FEET / 2, z])));
    g.userData.api = { screen, tick() { return false; } };
    return g;
  }
  PRM_BUILDERS.tv = (ctx, shared) => prmBuildTV(ctx.lib, ctx.design, { earGeometry: shared.earGeometry, attractTexture: ctx.attractTexture });

  const api = { PRM_ACTIONS, PRM_TAB_ORDER, PRM_PLACES, PRM_BUILDERS, PRM_ATTRACT_LINES, prmBuildAll, prmMotion, prmEaseOutCubic, prmEaseOutBack, prmMesh, prmTag, prmAttract };
  if (typeof window !== 'undefined') window.PrmProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
