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

  /* The jukebox: an arched cabinet (shell), inset panel (plate), grille, two
     knobs + four candy caps (buttons), a record with a label, a brass antenna
     with a lit bead, and ears that are shorter, rounder and angled out. */
  function prmBuildJukebox(lib, design, opts = {}) {
    const { THREE, mats } = lib; const g = new THREE.Group(); const W = 0.30, H = 0.44, D = 0.24, cy = H / 2;
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const arch = (w, h) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, -h / 2); s.lineTo(r, -h / 2); s.lineTo(r, h / 2 - r); s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.lineTo(-r, -h / 2); return s; };
    g.add(prmMesh(THREE, lib.extrude(arch(W, H), D, 0.02), shell, 'cabinet', [0, cy, 0]));
    g.add(prmMesh(THREE, lib.extrude(arch(W - 0.05, H - 0.05), 0.02, 0.005), plate, 'panel', [0, cy, D / 2 + 0.005]));
    for (let i = 0; i < 6; i++) g.add(prmMesh(THREE, new THREE.BoxGeometry(0.12, 0.005, 0.006), mats.plum, 'grille' + i, [0, cy + 0.12 - i * 0.012, D / 2 + 0.02], null, false));
    const knobGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.02, 24);
    const knob = prmMesh(THREE, knobGeo, buttons, 'jukebox-knob', [-0.09, cy + 0.02, D / 2 + 0.025], [Math.PI / 2, 0, 0]); prmTag(knob, 'jukebox-knob'); g.add(knob);
    g.add(prmMesh(THREE, knobGeo, buttons, 'knobR', [0.09, cy + 0.02, D / 2 + 0.025], [Math.PI / 2, 0, 0]));
    const capGeo = new THREE.CylinderGeometry(0.011, 0.012, 0.008, 20);
    [[0, 0.045], [0, 0.005], [-0.02, 0.025], [0.02, 0.025]].forEach(([x, y], i) => g.add(prmMesh(THREE, capGeo, buttons, 'cap' + i, [x, cy + y, D / 2 + 0.02], [Math.PI / 2, 0, 0])));
    const record = prmMesh(THREE, new THREE.CylinderGeometry(0.085, 0.085, 0.005, 48), mats.black, 'jukebox-record', [0, cy - 0.11, D / 2 + 0.02], [Math.PI / 2, 0, 0]); prmTag(record, 'jukebox-record'); g.add(record);
    const labelMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#2B1B45', '#ffffff', 256, 256), roughness: .6 });
    const label = prmMesh(THREE, new THREE.CircleGeometry(0.032, 32), labelMat, 'recordLabel', [0, cy - 0.11, D / 2 + 0.0231], null, false); g.add(label);
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.003, 0.003, 0.06, 8), mats.brass, 'antenna', [0, H + 0.03, -0.02], null, false));
    g.add(prmMesh(THREE, new THREE.SphereGeometry(0.008, 12, 10), mats.emissive('#ffd27a', 1.5), 'bead', [0, H + 0.065, -0.02], null, false));
    if (opts.earGeometry) [-1, 1].forEach(side => {
      const e = new THREE.Mesh(opts.earGeometry, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.scale.set(0.17, 0.14, 0.17); e.position.set(side * 0.11, H + 0.02, -0.03); e.rotation.set(-0.1, 0, -side * 0.45);
      e.castShadow = e.receiveShadow = true; g.add(e);
    });
    let playing = false;
    g.userData.api = {
      setLabel(text) { const old = labelMat.map; labelMat.map = lib.tex.label(text, '#2B1B45', '#ffffff', 256, 256); labelMat.needsUpdate = true; if (old) old.dispose(); },
      setPlaying(b) { playing = !!b; },
      tick(now, dt, reduced) { if (!playing || reduced) return false; const d = dt * 3.49; record.rotateY(d); label.rotation.z += d; return true; },   // 33 rpm
    };
    return g;
  }
  PRM_BUILDERS.jukebox = (ctx, shared) => prmBuildJukebox(ctx.lib, ctx.design, { earGeometry: shared.earGeometry });

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

  const api = { PRM_ACTIONS, PRM_TAB_ORDER, PRM_PLACES, PRM_BUILDERS, PRM_ATTRACT_LINES, prmBuildAll, prmMotion, prmEaseOutCubic, prmEaseOutBack, prmMesh, prmTag, prmAttract, prmSpinPlan };
  if (typeof window !== 'undefined') window.PrmProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
