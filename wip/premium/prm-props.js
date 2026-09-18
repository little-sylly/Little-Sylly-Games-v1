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
     side table top 0.565. x/z mirror prmRoom's tableX/tableZ/benchZ — keep
     them in step by hand; the harness footprint check is what catches drift.
     A builder's group origin is its resting base. */
  const PRM_PLACES = {
    tv:            { pos: [ 0.16, 0.52, -1.10] },                      // dead on the camera's view axis — the telly is the focus
    jukebox:       { pos: [-0.72, 0.52, -1.10] },                      // left, balancing the window and the sill plant
    dial:          { pos: [ 0.62, 0.44,  0.02] },
    binder:        { pos: [ 0.03, 0.44, -0.08], rot: [0, 0.18, 0] },
    phone:         { pos: [ 0.33, 0.44,  0.26], rot: [0, -0.35, 0] },  // front-centre: the Shelves door, and Scene B's hero
    controller:    { pos: [-0.50, 0.47,  0.42], rot: [0, -0.30, 0] },  // on the couch return's seat, not on an arm
    lamp:          { pos: [ 1.25, 0.43, -1.44] },                      // the shelf's LOWEST board
    shelfContents: { pos: [0, 0, 0] },
  };
  /* Builders register here, one per task: id → (ctx, shared) => Group. */
  const PRM_BUILDERS = {};

  function prmBuildAll(ctx) {
    const shared = {};   // the TV and the jukebox now build their own ears; nothing is shared
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
    /* Droopy bunny ears (owner, 19 Sep 2026 — the "Bunny Beats" reference): each ear rises from
       the cabinet top, leans outward, then folds forward and down past the front top edge. The
       tip is a flattened sphere cap in the ear colour. */
    /* The fold has to bring the tip visibly DOWN, not just forward: a fold that travels mostly along
       +z is foreshortened to nothing from the couch and the ear reads as a straight antenna. This
       curve rises, arcs over the front edge and hangs the tip low, in front of the screen top. */
    const EAR_R = 0.062, EAR_PTS = [[0, 0, 0], [0, 0.12, 0.0], [0.01, 0.22, 0.04], [0.03, 0.25, 0.12], [0.05, 0.16, 0.21], [0.06, 0.06, 0.24]];
    [-1, 1].forEach(side => {
      const ear = lib.droopEar(EAR_PTS, EAR_R, 0.55);
      const e = new THREE.Mesh(ear.outer, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.castShadow = e.receiveShadow = true;
      e.position.set(side * 0.165, cy + H / 2 - 0.01, -0.06); e.rotation.set(0, 0, -side * 0.34); e.scale.x = side < 0 ? -1 : 1;
      const inner = new THREE.Mesh(ear.inner, plate); inner.name = 'inner'; inner.receiveShadow = true; e.add(inner);
      const tipGeo = new THREE.SphereGeometry(EAR_R, 14, 10); tipGeo.scale(0.55, 1, 1);
      const tip = new THREE.Mesh(tipGeo, ears); tip.name = 'tip'; tip.position.copy(ear.tip); tip.castShadow = true; e.add(tip);
      g.add(e);
    });
    [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.12], [0.24, 0.12]].forEach(([x, z], i) =>
      g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.02, 0.022, FEET, 16), shell, 'foot' + i, [x, FEET / 2, z])));
    g.userData.api = { screen, tick() { return false; } };
    return g;
  }
  PRM_BUILDERS.tv = (ctx) => prmBuildTV(ctx.lib, ctx.design, { attractTexture: ctx.attractTexture });

  /* Pure: the rotation a spin ends on. Cartridge i sits at angle i·slot on the
     ring; spinner rotation θ = -k·slot brings k to the front. Always at least
     `turns` full turns forward, then the shortest forward distance. */
  function prmSpinPlan(n, currentRot, targetIdx, turns = 3) {
    const TAU = Math.PI * 2, slot = TAU / n, want = -targetIdx * slot;
    let delta = ((want - currentRot) % TAU + TAU) % TAU; if (delta < 1e-9) delta = TAU;
    return { targetIdx, endRot: currentRot + turns * TAU + delta, durationMs: 1800 };
  }

  /* The cartridge caddy. Base = shell, top plate/boss/wedge = plate, one soft
     ring in the buttons colour (all that is left of the RGB), twenty generic
     cartridges in their games' brand colours with the stickers as labels. */
  function prmBuildDial(lib, design, games, stickerUrl) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'dial');
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ring = lib.role('buttons', design.buttons, { emissive: design.buttons, emissiveIntensity: .35, transparent: true, opacity: .9 }); ring.userData.prmEmissive = true;
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.16, 0.165, 0.05, 48), shell, 'base', [0, 0.025, 0]));
    g.add(prmMesh(THREE, new THREE.TorusGeometry(0.155, 0.005, 8, 64), ring, 'ring', [0, 0.02, 0], [Math.PI / 2, 0, 0], false));
    const spinner = new THREE.Group(); spinner.name = 'spinner'; spinner.position.y = 0.05; g.add(spinner);
    spinner.add(prmMesh(THREE, new THREE.CylinderGeometry(0.145, 0.145, 0.012, 48), plate, 'topPlate', [0, 0.006, 0]));
    spinner.add(prmMesh(THREE, new THREE.CylinderGeometry(0.045, 0.045, 0.012, 32), plate, 'boss', [0, 0.018, 0]));
    spinner.add(prmMesh(THREE, new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ map: lib.tex.label('★', '#ffffff', '#2B1B45', 128, 128), roughness: .5 }), 'bossLabel', [0, 0.0251, 0], [-Math.PI / 2, 0, 0], false));
    const n = games.length, slot = Math.PI * 2 / n, r = 0.115, REST = 0.03;
    const cartGeo = lib.moulded(0.03, 0.038, 0.007, 0.004, { bevelSegments: 2 });
    const cartridges = games.map((game, i) => {
      const a = i * slot, cg = new THREE.Group(); cg.name = 'cart-' + game.id; cg.userData.gameId = game.id; cg.userData.restY = REST;
      cg.position.set(Math.sin(a) * r, REST, Math.cos(a) * r); cg.rotation.y = a;
      cg.add(prmMesh(THREE, cartGeo, new THREE.MeshStandardMaterial({ color: game.brandHex, roughness: .5 }), 'cartBody', [0, 0, 0]));
      const labelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6, transparent: true }); labelMat.userData.prmImage = stickerUrl(game.id);
      cg.add(prmMesh(THREE, new THREE.PlaneGeometry(0.022, 0.022), labelMat, 'cartLabel', [0, 0.002, 0.0042], null, false));
      spinner.add(cg); return cg;
    });
    // fixed wedge housing, front-right, with the little display on top
    const a0 = -75 * Math.PI / 180, a1 = -25 * Math.PI / 180, wedge = new THREE.Shape();
    wedge.absarc(0, 0, 0.09, a0, a1, false); wedge.absarc(0, 0, 0.17, a1, a0, true); wedge.closePath();
    const wedgeGeo = lib.extrude(wedge, 0.05, 0.006, { center: false }); wedgeGeo.rotateX(-Math.PI / 2);
    g.add(prmMesh(THREE, wedgeGeo, plate, 'wedge', [0, 0.056, 0]));
    const am = (a0 + a1) / 2, dispMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#1a1a1a', '#e9ffe9', 256, 96), roughness: .3, emissive: '#3a5a3a', emissiveIntensity: .3 });
    g.add(prmMesh(THREE, new THREE.PlaneGeometry(0.05, 0.018), dispMat, 'display', [Math.cos(am) * 0.13, 0.113, -Math.sin(am) * 0.13], [-Math.PI / 2, 0, -am - Math.PI / 2], false));
    /* After a spin lands, the dial holds still long enough for the chosen
       cartridge to be read and for the camera to push into the telly (the
       scene waits 250 ms, then a 600 ms tween). Resuming the idle drift the
       instant the tween ends slides the winner off the front while the player
       is still looking at it. */
    const HOLD_MS = 2000;
    let rot = 0, driftPauseUntil = 0, risen = null, spinning = null, lastNow = 0; const motion = prmMotion();
    const api = {
      spinner, cartridges, isSpinning: () => !!spinning,
      setDisplay(text) { const old = dispMat.map; dispMat.map = lib.tex.label(text, '#1a1a1a', '#e9ffe9', 256, 96); dispMat.needsUpdate = true; if (old) old.dispose(); },
      rise(k, instant) {
        if (risen !== null && risen !== k) { const prev = cartridges[risen]; motion.add(prev.position.y, REST, 200, prmEaseOutCubic, v => prev.position.y = v); }
        const c = cartridges[k]; risen = k;
        if (instant) c.position.y = REST + 0.012; else motion.add(c.position.y, REST + 0.012, 200, prmEaseOutBack, v => c.position.y = v);
        api.setDisplay(games[k].gameName);
      },
      spin(rand, opt = {}) {
        if (spinning) return spinning;
        const k = Math.min(n - 1, Math.floor(rand() * n));
        /* Reduced motion: show the result, skip the journey (spec § 11). Not
           tracked as `spinning` — there is no tween to guard against. */
        if (opt.instant) { rot = -k * slot; spinner.rotation.y = rot; api.rise(k, true); return Promise.resolve(games[k].id); }
        driftPauseUntil = Infinity;
        const plan = prmSpinPlan(n, rot, k);
        spinning = new Promise(res => {
          motion.add(rot, plan.endRot, plan.durationMs, prmEaseOutCubic, v => { rot = v; spinner.rotation.y = v; },
            () => { api.rise(k); spinning = null; driftPauseUntil = lastNow + HOLD_MS; res(games[k].id); });
        });
        return spinning;
      },
      pauseDrift(ms, now) { driftPauseUntil = now + ms; },
      tick(now, dt, reduced) {
        lastNow = now;
        let active = motion.tick(now);
        if (!spinning && !reduced && now >= driftPauseUntil) { rot += dt * 0.07; spinner.rotation.y = rot; active = true; }
        return active;
      },
    };
    g.userData.api = api; return g;
  }
  PRM_BUILDERS.dial = (ctx) => prmBuildDial(ctx.lib, ctx.design, ctx.games, id => { const s = (ctx.stickers.list || []).find(x => x.id === id); return ctx.stickers.base + (s ? s.image : id + '.png'); });

  function prmStarShape(THREE, R, r, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    s.closePath(); return s;
  }

  /* The cat jar (owner, 19 Sep 2026 — the "Lavender Cat" reference). A see-through cylinder with
     two records standing inside it, on a base ring carrying the knob and four candy buttons; a
     dome lid with a rim, two triangular cat ears and two lit eyes. Replaces the arched cabinet
     wholesale but keeps every pick id and the same api, so the scene's wiring is untouched.
     shell → lid + base · plate → record labels + inner ears · ears → cat ears · buttons → knob,
     buttons, eyes. */
  function prmBuildJukebox(lib, design) {
    const { THREE, mats } = lib; const g = new THREE.Group();
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const eyes = lib.role('buttons', design.buttons, { emissive: design.buttons, emissiveIntensity: .6, roughness: .3 });
    eyes.userData.prmEmissive = true;
    const JR = 0.11, JH = 0.16, BASE_H = 0.035, LID_R = 0.118;
    const jarBottom = BASE_H, jarTop = BASE_H + JH, recY = jarBottom + JH / 2;

    g.add(prmMesh(THREE, new THREE.CylinderGeometry(LID_R, LID_R + 0.005, BASE_H, 32), shell, 'base', [0, BASE_H / 2, 0]));
    /* Open-ended so we see the records through both walls; no shadow, or the jar casts a solid
       black drum on the bench and stops reading as glass at all. */
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(JR, JR, JH, 48, 1, true), mats.glass, 'jar', [0, jarBottom + JH / 2, 0], null, false));

    const recGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.005, 48);
    const record = prmMesh(THREE, recGeo, mats.black, 'jukebox-record', [0, recY, 0.025], [Math.PI / 2, 0, 0]);
    prmTag(record, 'jukebox-record'); g.add(record);
    const labelMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#2B1B45', '#ffffff', 256, 256), roughness: .6 });
    const label = prmMesh(THREE, new THREE.CircleGeometry(0.028, 32), labelMat, 'recordLabel', [0, recY, 0.0281], null, false);
    g.add(label);
    const back = prmMesh(THREE, recGeo, mats.black, 'recordBack', [0.012, recY, -0.03], [Math.PI / 2, 0.18, 0]);
    back.add(prmMesh(THREE, new THREE.CircleGeometry(0.028, 32), plate, 'recordBackLabel', [0, 0.0031, 0], [-Math.PI / 2, 0, 0], false));
    g.add(back);

    // the control strip on the base's front
    const knob = prmMesh(THREE, new THREE.CylinderGeometry(0.014, 0.016, 0.018, 24), buttons, 'jukebox-knob', [-0.06, BASE_H / 2, LID_R + 0.008], [Math.PI / 2, 0, 0]);
    prmTag(knob, 'jukebox-knob'); g.add(knob);
    const capGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.008, 20);
    [-0.02, 0.0, 0.02, 0.04].forEach((x, i) => g.add(prmMesh(THREE, capGeo, buttons, 'button' + i, [x + 0.01, BASE_H / 2, LID_R + 0.003], [Math.PI / 2, 0, 0])));

    // the lid: a dome, a rim, two cat ears with paler inners, two lit eyes
    g.add(prmMesh(THREE, new THREE.SphereGeometry(LID_R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell, 'lid', [0, jarTop, 0]));
    g.add(prmMesh(THREE, new THREE.TorusGeometry(LID_R, 0.009, 10, 48), shell, 'lidRim', [0, jarTop, 0], [Math.PI / 2, 0, 0]));
    const earGeo = new THREE.ConeGeometry(0.036, 0.075, 4); earGeo.scale(1, 1, 0.55); earGeo.rotateY(Math.PI / 4);
    const innerGeo = new THREE.ConeGeometry(0.02, 0.045, 4); innerGeo.scale(1, 1, 0.55); innerGeo.rotateY(Math.PI / 4);
    [-1, 1].forEach(side => {
      /* On TOP of the dome, not inside it: the dome's own radius is 0.118, so an ear parked near
         jarTop simply vanishes into the lid. */
      const e = prmMesh(THREE, earGeo, ears, side < 0 ? 'earL' : 'earR', [side * 0.072, jarTop + 0.125, -0.005], [0, 0, -side * 0.30]);
      e.add(prmMesh(THREE, innerGeo, plate, 'inner', [0, -0.008, 0.014], null, false));
      g.add(e);
    });
    [-1, 1].forEach(side => g.add(prmMesh(THREE, new THREE.SphereGeometry(0.009, 12, 10), eyes, side < 0 ? 'eyeL' : 'eyeR', [side * 0.038, jarTop + 0.050, 0.102], null, false)));

    let playing = false;
    g.userData.api = {
      setLabel(text) { const old = labelMat.map; labelMat.map = lib.tex.label(text, '#2B1B45', '#ffffff', 256, 256); labelMat.needsUpdate = true; if (old) old.dispose(); },
      setPlaying(b) { playing = !!b; },
      // 33 rpm, now seen through the glass
      tick(now, dt, reduced) { if (!playing || reduced) return false; const d = dt * 3.49; record.rotateY(d); label.rotation.z += d; return true; },
    };
    return g;
  }
  PRM_BUILDERS.jukebox = (ctx) => prmBuildJukebox(ctx.lib, ctx.design);

  /* The flip phone: lower half with the keypad flat on the table, upper half
     hinged open ~110° with its screen facing the camera. Body = shell, screen
     surround = plate, keys = buttons. */
  function prmBuildPhone(lib, design) {
    const { THREE } = lib; const g = new THREE.Group(); prmTag(g, 'phone');
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate), buttons = lib.role('buttons', design.buttons, { roughness: .4 });
    const PW = 0.05, PL = 0.10, PT = 0.012, FLAT = [-Math.PI / 2, 0, 0];
    g.add(prmMesh(THREE, lib.moulded(PW, PL, PT, 0.008), shell, 'lower', [0, PT / 2, 0], FLAT));
    const keyGeo = new THREE.BoxGeometry(0.009, 0.003, 0.007);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.add(prmMesh(THREE, keyGeo, buttons, 'key' + r + c, [(c - 1) * 0.013, PT + 0.0015, 0.005 + r * 0.011], null, false));
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(0, PT, -PL / 2); hinge.rotation.x = -110 * Math.PI / 180; g.add(hinge);
    hinge.add(prmMesh(THREE, lib.moulded(PW, PL, PT * 0.8, 0.008), shell, 'upper', [0, PT * 0.4, PL / 2], FLAT));
    hinge.add(prmMesh(THREE, lib.moulded(PW - 0.008, PL - 0.02, 0.002, 0.005), plate, 'surround', [0, -0.0008, PL / 2], [Math.PI / 2, 0, 0], false));
    const screenMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('Shelves', '#dcefff', '#2B1B45', 128, 192), emissive: '#dcefff', emissiveIntensity: .5, roughness: .3 });
    screenMat.emissiveMap = screenMat.map;
    hinge.add(prmMesh(THREE, new THREE.PlaneGeometry(PW - 0.014, PL - 0.03), screenMat, 'screen', [0, -0.0022, PL / 2], [Math.PI / 2, 0, 0], false));
    g.userData.api = { tick(now, dt, reduced) { if (reduced) { screenMat.emissiveIntensity = .5; return false; } screenMat.emissiveIntensity = .5 + Math.sin(now / 640) * 0.03; return true; } };
    return g;
  }
  PRM_BUILDERS.phone = (ctx) => prmBuildPhone(ctx.lib, ctx.design);

  /* The stickerbook: the soft-yellow quilted binder (fixed colour), a cover
     hinged on the spine, ten stickers on the open page and ten on the cover's
     inside. A prop today; PRM_ACTIONS.binder is its dormant door. */
  function prmBuildBinder(lib, stickerIds, stickerUrl) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'binder');
    const BW = 0.20, BH = 0.24, T = 0.03, FLAT = [-Math.PI / 2, 0, 0];
    g.add(prmMesh(THREE, lib.moulded(BW, BH, T, 0.015), mats.yellow, 'base', [0, T / 2, 0], FLAT));
    g.add(prmMesh(THREE, new THREE.BoxGeometry(BW - 0.02, T - 0.012, BH - 0.02), mats.paper, 'pages', [0.005, T / 2, 0], null, false));
    const grid = (parent, ids, y, flip) => ids.forEach((id, i) => {
      const cx = (i % 2 - 0.5) * 0.075, cz = (Math.floor(i / 2) - 2) * 0.042, rot = flip ? [Math.PI / 2, 0, 0] : FLAT;
      parent.add(prmMesh(THREE, new THREE.PlaneGeometry(0.065, 0.036), mats.sleeve, 'sleeve-' + id, [cx, y, cz], rot, false));
      const sm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6, transparent: true }); sm.userData.prmImage = stickerUrl(id);
      parent.add(prmMesh(THREE, new THREE.PlaneGeometry(0.03, 0.03), sm, 'sticker-' + id, [cx, y + (flip ? -0.0006 : 0.0006), cz], rot, false));
    });
    /* The page rides just ABOVE the base's top face — at T - 0.005 its stickers
       sat 4 mm inside the slab, so the opened binder showed a blank page. When
       the cover is shut it closes over them, which is what hides them then. */
    const page = new THREE.Group(); page.name = 'page'; page.position.set(0.005, T + 0.001, 0); g.add(page);
    grid(page, stickerIds.slice(0, 10), 0.0006, false);
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(-BW / 2, T, 0); g.add(hinge);
    hinge.add(prmMesh(THREE, lib.moulded(BW, BH, 0.008, 0.015), mats.yellow, 'cover', [BW / 2, 0.004, 0], FLAT));
    hinge.add(prmMesh(THREE, lib.extrude(prmStarShape(THREE, 0.028, 0.013), 0.003, 0.0008), mats.yellowDark, 'star', [BW / 2, 0.0095, 0], FLAT, false));
    const inside = new THREE.Group(); inside.name = 'coverInside'; inside.position.set(BW / 2, 0, 0); hinge.add(inside);
    grid(inside, stickerIds.slice(10, 20), -0.0006, true);
    let open = false; const motion = prmMotion();
    g.userData.api = {
      isOpen: () => open,
      openCover(instant) { open = !open; const to = open ? Math.PI * 0.92 : 0; if (instant) { hinge.rotation.z = to; return; } motion.add(hinge.rotation.z, to, 400, prmEaseOutCubic, v => hinge.rotation.z = v); },
      tick(now) { return motion.tick(now); },
    };
    return g;
  }
  PRM_BUILDERS.binder = (ctx) => prmBuildBinder(ctx.lib, ctx.games.map(g => g.id), id => { const s = (ctx.stickers.list || []).find(x => x.id === id); return ctx.stickers.base + (s ? s.image : id + '.png'); });

  /* Pure: which image goes in which ring slot. rows × panels.length slots,
     filled in manifest order and repeating — so a 9-panel set fills one row of
     nine, and a second row repeats from the start. */
  function prmLampSlots(manifest) {
    const rows = Math.max(1, manifest.rows | 0), panels = manifest.panels || [], out = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < panels.length; col++) { const p = panels[(row * panels.length + col) % panels.length]; out.push({ id: p.id, image: p.image, row, col }); }
    return out;
  }

  /* The photo-carousel lamp, ported from lampshade-hero.html at metre scale:
     birch base, brass stem/hoops/posts, a lit tube, and one card per slot
     carrying a portrait from the manifest. Drag-to-flick with friction. */
  function prmBuildLamp(lib, lampPanels) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'lamp');
    const slots = prmLampSlots(lampPanels.manifest), n = lampPanels.manifest.panels.length, rows = Math.max(1, lampPanels.manifest.rows | 0);
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.065, 0.068, 0.02, 32), mats.birch, 'base', [0, 0.01, 0]));
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12), mats.brass, 'stem', [0, 0.05, 0]));
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 20), mats.emissive('#ffe2b8', 1.2), 'tube', [0, 0.15, 0], null, false));
    const spin = new THREE.Group(); spin.name = 'spinGroup'; g.add(spin);
    const CARD = 0.05, GAP = 0.006, R = 0.075, TOP = 0.215, pitch = CARD + GAP;
    const bottomY = TOP - rows * pitch;
    [TOP, bottomY + 0.01].forEach((y, i) => spin.add(prmMesh(THREE, new THREE.TorusGeometry(R, 0.0025, 6, 64), mats.brass, 'hoop' + i, [0, y, 0], [Math.PI / 2, 0, 0], false)));
    for (let v = 0; v < n; v += 2) { const a = (v + 0.5) * Math.PI * 2 / n; spin.add(prmMesh(THREE, new THREE.CylinderGeometry(0.002, 0.002, TOP - bottomY, 6), mats.brass, 'post' + v, [Math.sin(a) * R, (TOP + bottomY) / 2, Math.cos(a) * R], null, false)); }
    const cardGeo = new THREE.BoxGeometry(CARD, CARD, 0.002), filmGeo = new THREE.PlaneGeometry(CARD * 0.74, CARD * 0.74);
    slots.forEach(s => {
      const a = s.col * Math.PI * 2 / n, y = TOP - s.row * pitch - CARD / 2 - 0.004;
      const card = prmMesh(THREE, cardGeo, mats.cream, 'card-' + s.row + '-' + s.col, [Math.sin(a) * R, y, Math.cos(a) * R], [0, a, 0], false); spin.add(card);
      const fm = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .35, roughness: .6 });
      fm.userData.prmImage = lampPanels.base + s.image; fm.userData.prmEmissiveMap = true;
      card.add(prmMesh(THREE, filmGeo, fm, 'film-' + s.id, [0, 0, 0.0011], null, false));
    });
    const IDLE = 0.21;   // rad/s ≈ 2 rpm
    let vel = IDLE, dragging = false;
    g.userData.api = {
      flick(v) { vel = v; dragging = false; },
      nudge(v) { dragging = true; spin.rotation.y += v; },
      tick(now, dt, reduced) {
        if (reduced || dragging) { dragging = false; return false; }
        vel *= Math.pow(0.955, dt * 60); if (Math.abs(vel) < IDLE) vel += (IDLE - vel) * 0.02;
        spin.rotation.y += vel * dt; return true;
      },
    };
    return g;
  }
  PRM_BUILDERS.lamp = (ctx) => prmBuildLamp(ctx.lib, ctx.lampPanels);

  /* Trinkets are easter eggs: looks only, never a pick target, never a door.
     `unlocked` is the seam a future earning system flips (spec § 7.9). */
  const PRM_TRINKETS_V1 = [
    { id: 'mini-controller', builder: 'controller', unlocked: true },
    { id: 'mini-lamp',       builder: 'lamp',       unlocked: true },
    { id: 'plant',           builder: 'plant',      unlocked: true },
    { id: 'studio-print',    builder: 'print',      unlocked: true },
    { id: 'game-stack',      builder: 'stack',      unlocked: true },
  ];
  function prmBuildShelf(lib, trinkets, games, S) {
    const { THREE, mats } = lib; const g = new THREE.Group();
    const heights = [0.2, 0.17, 0.22, 0.15, 0.19, 0.16, 0.21, 0.18, 0.2, 0.14];
    let x = S.x - S.w / 2 + S.side + 0.02; const y = S.ys[1] + 0.01;   // books on the MIDDLE board (the lamp owns the lowest)
    heights.forEach((h, i) => {
      const col = new THREE.Color(games[(i * 3) % games.length].brandHex).lerp(new THREE.Color('#8f8a85'), 0.5), t = 0.02 + (i % 3) * 0.006;
      const b = prmMesh(THREE, new THREE.BoxGeometry(t, h, 0.16), new THREE.MeshStandardMaterial({ color: col, roughness: .8 }), 'book' + i, [x + t / 2, y + h / 2, S.z + 0.02]);
      if (i === 6) b.rotation.z = -0.12; g.add(b); x += t + 0.004;
    });
    const mini = {
      controller() { const m = new THREE.Group(); m.add(prmMesh(THREE, lib.moulded(0.06, 0.035, 0.014, 0.012), new THREE.MeshStandardMaterial({ color: '#a97fd6', roughness: .5 }), 'miniBody', [0, 0.012, 0], [-Math.PI / 2 + 0.3, 0, 0]));
        [-1, 1].forEach(s => m.add(prmMesh(THREE, new THREE.SphereGeometry(0.008, 12, 10), new THREE.MeshStandardMaterial({ color: '#a97fd6' }), 'miniEar', [s * 0.02, 0.03, -0.006]))); return m; },
      lamp() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.02, 0.02, 0.006, 20), mats.birch, 'miniBase', [0, 0.003, 0]));
        m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.005, 0.005, 0.045, 12), mats.emissive('#ffe2b8', 1), 'miniTube', [0, 0.03, 0], null, false));
        m.add(prmMesh(THREE, new THREE.TorusGeometry(0.02, 0.0015, 6, 32), mats.brass, 'miniHoop', [0, 0.05, 0], [Math.PI / 2, 0, 0], false)); return m; },
      plant() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.025, 0.02, 0.04, 20), new THREE.MeshStandardMaterial({ color: '#c9795a', roughness: .8 }), 'pot', [0, 0.02, 0]));
        [[0, 0.06, 0], [0.015, 0.05, 0.01], [-0.014, 0.052, -0.008]].forEach((p, i) => m.add(prmMesh(THREE, new THREE.SphereGeometry(0.022, 14, 12), new THREE.MeshStandardMaterial({ color: '#7fa86b', roughness: .9 }), 'leaf' + i, p))); return m; },
      print() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.BoxGeometry(0.07, 0.09, 0.008), mats.birchDark, 'frame', [0, 0.045, 0], [-0.15, 0, 0]));
        m.add(prmMesh(THREE, new THREE.PlaneGeometry(0.058, 0.078), new THREE.MeshStandardMaterial({ map: lib.tex.label('★', '#FAFAF9', '#E9408E', 128, 160), roughness: .9 }), 'printFace', [0, 0.045 + 0.0006, 0.0041], [-0.15, 0, 0], false)); return m; },
      stack() { const m = new THREE.Group(); [3, 7, 12].forEach((gi, i) => m.add(prmMesh(THREE, new THREE.BoxGeometry(0.08, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: games[gi % games.length].brandHex, roughness: .6 }), 'box' + i, [0, 0.01 + i * 0.021, 0], [0, (i - 1) * 0.15, 0]))); return m; },
    };
    const pitch = S.w / 5, y2 = S.ys[2] + 0.01;   // trinket easter eggs top out the unit
    trinkets.forEach((t, i) => {
      if (!t.unlocked || !mini[t.builder]) return;
      const tg = mini[t.builder](); tg.name = 'trinket-' + t.id; tg.position.set(S.x - S.w / 2 + pitch * (i + 0.5), y2, S.z); g.add(tg);
    });
    return g;
  }
  PRM_BUILDERS.shelfContents = (ctx) => prmBuildShelf(ctx.lib, PRM_TRINKETS_V1, ctx.games, ctx.roomData.prmShelf);

  const api = { PRM_ACTIONS, PRM_TAB_ORDER, PRM_PLACES, PRM_BUILDERS, PRM_ATTRACT_LINES, prmBuildAll, prmMotion, prmEaseOutCubic, prmEaseOutBack, prmMesh, prmTag, prmAttract, prmSpinPlan, prmLampSlots, prmBuildShelf, PRM_TRINKETS_V1 };
  if (typeof window !== 'undefined') window.PrmProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
