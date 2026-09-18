// ═══════════════════════════════════════════════════════════════════════════
// prm-scene.js — Premium lounge: renderer, lights, env map, camera rig,
// picking, the motion contract and the host contract. Spec §§ 3, 9, 11, 13.
//
// The scene never calls showScreen, never reads localStorage, never touches
// Music directly: everything that leaves the room goes through the host
// callbacks validated in prmValidateHost. Only prmMount touches the DOM; the
// pure functions above it are what verify-prm-props.js loads under Node.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  /* Seated on the couch, the table pushed up to our knees: eye height just
     behind the table's near edge, which is the bottom of frame. Portrait is
     re-aimed in the re-block's step 6. */
  const PRM_PRESETS = {
    wide:     { pos: [-0.05, 1.32, 1.50], look: [0.15, 0.28, -1.05], fov: 46 },
    portrait: { pos: [0.00, 1.55, 1.75], look: [0.00, 0.45,  0.25], fov: 52 },
  };
  const PRM_REQUIRED = ['games', 'stickers', 'design', 'lampPanels', 'music', 'enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  const PRM_FUNCS = ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  const PRM_HOVER_LIFT = 0.003, PRM_PUSH_MS = 600, PRM_FADE_AT_MS = 400, PRM_ATTRACT_MS = 100, PRM_PARALLAX = 0.035;

  function prmValidateHost(host) {
    if (!host || typeof host !== 'object') throw new Error('prmMount: host object required');
    const missing = PRM_REQUIRED.filter(k => host[k] === undefined);
    if (missing.length) throw new Error('prmMount: host is missing ' + missing.join(', '));
    PRM_FUNCS.forEach(k => { if (typeof host[k] !== 'function') throw new Error('prmMount: host.' + k + ' must be a function'); });
    if (host.openStickerbook !== undefined && typeof host.openStickerbook !== 'function') throw new Error('prmMount: host.openStickerbook must be a function when given');
    if (!Array.isArray(host.games) || host.games.length === 0) throw new Error('prmMount: host.games must be a non-empty array');
    return true;
  }
  function prmReducedMotion() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  /* TV mode's floor, reused (wip/lobby-lab/lobby.js LB_TV_MIN_W/H). No device sniffing. */
  function prmEligible(w, h, webgl) { return w >= 900 && h >= 500 && !!webgl; }

  /* A procedural environment: four emissive planes through PMREM. Zero assets;
     it is what makes matte plastic read as plastic (spec § 3.2). */
  function prmBuildEnvMap(THREE, renderer) {
    const env = new THREE.Scene(); env.background = new THREE.Color('#bdb4a8');
    const plane = (w, h, pos, rot, hex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); env.add(m); };
    plane(6, 3, [-3, 3, 0], [0, Math.PI / 2, 0], '#e8c9a2');    // warm, above-left (the lamp side)
    plane(4, 4, [3, 2, 0], [0, -Math.PI / 2, 0], '#aec4d8');    // cool, right (the window side)
    plane(8, 8, [0, -2, 0], [Math.PI / 2, 0, 0], '#5b514a');    // dark floor
    plane(8, 8, [0, 5, 0], [-Math.PI / 2, 0, 0], '#cfc4b6');    // pale ceiling
    const pmrem = new THREE.PMREMGenerator(renderer); const rt = pmrem.fromScene(env, 0.04); pmrem.dispose();
    return rt.texture;
  }

  function prmMount(canvasEl, host) {
    prmValidateHost(host);
    const THREE = window.THREE, CB = window.ControllerBody, P = window.PrmProps;
    const reduced = () => (host.reducedMotion !== undefined ? !!host.reducedMotion : prmReducedMotion());
    const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const lib = window.PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals });
    let design = Object.assign({}, host.design);
    const timers = { raf: null, interval: null, timeouts: new Set() };
    const later = (fn, ms) => { const id = setTimeout(() => { timers.timeouts.delete(id); fn(); }, ms); timers.timeouts.add(id); return id; };

    // renderer + scene
    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.80;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#efe6dc'); scene.fog = new THREE.Fog('#b59a80', 2.8, 6.5);
    scene.environment = prmBuildEnvMap(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 30);
    const lookAt = new THREE.Vector3();

    // lights — spec § 3.2: the three visible sources each have a real light behind them
    const key = new THREE.SpotLight('#ffd9b0', 1.75, 14, 0.85, 0.45, 1);
    key.position.set(-2.1, 1.95, -0.6); key.target.position.set(0.15, 0.30, -0.1);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 3;
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight('#cfe0ef', '#e2c9ae', 0.30));
    const tvLight = new THREE.PointLight('#bfe6d0', 0.6, 2.5, 2); tvLight.position.set(-0.25, 0.9, -2.0); scene.add(tvLight);
    const bulb = new THREE.PointLight('#ffd7a0', 0.5, 1.5, 2); bulb.position.set(-1.7, 0.75, -2.1); scene.add(bulb);
    const dialLight = new THREE.PointLight(design.buttons || '#ffffff', 0.25, 0.6, 2); dialLight.position.set(0.35, 0.5, 0.3); scene.add(dialLight);

    // room + props
    const room = window.PrmRoom.prmBuildRoom(lib); scene.add(room);
    const attract = P.prmAttract(makeCanvas, host.games);
    const attractTex = new THREE.CanvasTexture(attract.canvas); attractTex.encoding = THREE.sRGBEncoding;
    const ctx = { lib, design, games: host.games, stickers: host.stickers, lampPanels: host.lampPanels, ControllerBody: CB, attractTexture: attractTex, roomData: room.userData };
    const props = new THREE.Group(); props.name = 'props'; scene.add(props);
    const built = P.prmBuildAll(ctx);
    Object.keys(built).forEach(id => {
      const g = built[id], pl = P.PRM_PLACES[id];
      if (pl) { g.position.set(pl.pos[0], pl.pos[1], pl.pos[2]); if (pl.rot) g.rotation.set(pl.rot[0], pl.rot[1], pl.rot[2]); }
      props.add(g);
    });
    scene.updateMatrixWorld(true);

    // pick nodes: any object carrying prmId; every mesh under it points back at it
    const nodes = {}, pickables = [];
    props.traverse(o => { if (o.userData.prmId) { nodes[o.userData.prmId] = o; o.userData.restY = o.position.y; } });
    props.traverse(o => {
      if (!o.isMesh) return; let p = o;
      while (p && !p.userData.prmId) p = p.parent;
      if (p && p.userData.prmId) { o.userData.prmPickNode = p; pickables.push(o); }
    });
    let shadowDirty = true;

    // images: stickers, lamp portraits — loaded here, never by a builder
    const loader = new THREE.TextureLoader();
    props.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.userData.prmImage) return;
      const m = o.material;
      loader.load(m.userData.prmImage, t => { t.encoding = THREE.sRGBEncoding; m.map = t; if (m.userData.prmEmissiveMap) m.emissiveMap = t; m.needsUpdate = true; shadowDirty = true; wake(); });
    });
    (host.stickers.list || []).forEach(s => { const img = new Image(); img.onload = () => attract.attach(s.id, img); img.src = host.stickers.base + s.image; });

    // motion
    const camTweens = P.prmMotion(), hoverTweens = P.prmMotion();
    let hovered = null, focused = -1, busy = false, parallaxT = { x: 0, y: 0 }, parallax = { x: 0, y: 0 };
    const hud = { focus: document.getElementById('prm-focus'), fade: document.getElementById('prm-fade') };
    function setHover(node) {
      if (hovered === node) return;
      /* The un-hover must honour reduced motion too — it travels just as visibly as the lift,
         and it was unguarded until the re-block moved a prop under the harness's first pointer
         position and the "RAF is idle" check finally saw it. */
      if (hovered) { const h = hovered;
        if (reduced()) h.position.y = h.userData.restY;
        else hoverTweens.add(h.position.y, h.userData.restY, 150, P.prmEaseOutCubic, v => h.position.y = v); }
      hovered = node;
      if (node && !reduced()) hoverTweens.add(node.position.y, node.userData.restY + PRM_HOVER_LIFT, 150, P.prmEaseOutCubic, v => node.position.y = v);
      canvasEl.style.cursor = node ? 'pointer' : ''; shadowDirty = true; wake();
    }
    function applyPreset(name) {
      const pr = PRM_PRESETS[name] || PRM_PRESETS.wide;
      camera.position.set(pr.pos[0], pr.pos[1], pr.pos[2]); lookAt.set(pr.look[0], pr.look[1], pr.look[2]);
      camera.fov = pr.fov; camera.updateProjectionMatrix(); camera.lookAt(lookAt); wake();
    }
    let preset = 'wide'; applyPreset(preset);
    /* Aim at what the prop LOOKS like, not where its origin is. The TV screen
       is a slice of a 1.2 m sphere, so its origin sits a metre behind the back
       wall — pushing in on that flew the camera through the wall. A bounding
       box is the visible thing for every prop, whatever its geometry. */
    function pushIn(target, done) {
      const p = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());
      later(() => hud.fade && hud.fade.classList.add('on'), reduced() ? 0 : PRM_FADE_AT_MS);
      if (reduced()) { later(done, 220); return; }
      const from = camera.position.clone(), look0 = lookAt.clone(), to = p.clone().add(new THREE.Vector3(0, 0, 0.45));
      camTweens.add(0, 1, PRM_PUSH_MS, P.prmEaseOutCubic, t => { camera.position.lerpVectors(from, to, t); lookAt.lerpVectors(look0, p, t); camera.lookAt(lookAt); }, done);
      wake();
    }
    function fadeOut(done) { if (hud.fade) hud.fade.classList.add('on'); later(done, 220); }
    function resetView() { if (hud.fade) hud.fade.classList.remove('on'); busy = false; camTweens.clear(); applyPreset(preset); }
    function tweenTurn(node) { const from = node.userData.turn || 0, to = from + Math.PI / 6; node.userData.turn = to; hoverTweens.add(from, to, 120, P.prmEaseOutCubic, v => node.rotation.y = v); wake(); }
    function syncJukebox() {
      const jb = built.jukebox && built.jukebox.userData.api; if (!jb) return;
      const np = host.music.nowPlaying(); jb.setPlaying(!!np);
      let label = 'Quiet';
      if (np) { const g = host.games.find(x => x.id === np.key); label = np.title || (g ? g.gameName : np.key); }
      jb.setLabel(label); wake();
    }
    syncJukebox();

    // actions — the interpreter for PRM_ACTIONS
    function activate(id) {
      const a = P.PRM_ACTIONS[id], node = nodes[id]; if (!a || !node || busy) return;
      if (a.local === 'flick') { built.lamp.userData.api.flick(4.0); wake(); return; }
      if (a.turn) tweenTurn(node);
      if (a.spin) {
        busy = true; const api = built.dial.userData.api;
        api.spin(host.rand || Math.random, { instant: reduced() }).then(gameId => {
          later(() => pushIn(nodes['tv-screen'], () => { busy = false; host.enterTV(gameId); }), reduced() ? 600 : 250);
        }); wake(); return;
      }
      if (a.callback === 'openStickerbook') {
        if (typeof host.openStickerbook === 'function') host.openStickerbook();
        else built.binder.userData.api[a.fallback](reduced());
        wake(); return;
      }
      if (a.callback === 'music.next') {
        const keys = host.music.keys || []; if (!keys.length) return;
        const np = host.music.nowPlaying(); const i = keys.indexOf(np && np.key);
        host.music.playFor(keys[(i + 1) % keys.length]); syncJukebox(); return;
      }
      if (a.pushIn) { busy = true; pushIn(nodes[a.pushIn], () => { busy = false; host[a.callback](a.arg === undefined ? null : a.arg); }); return; }
      if (a.fade) { busy = true; fadeOut(() => { busy = false; host[a.callback](); }); return; }
      host[a.callback]();
    }

    // pointer: hover, tap, the lamp's drag-to-flick, parallax
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down = null, dragLamp = null;
    function pick(ev) {
      const r = canvasEl.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(pickables, false);
      return hits.length ? hits[0].object.userData.prmPickNode : null;
    }
    const onMove = ev => {
      const r = canvasEl.getBoundingClientRect();
      parallaxT.x = ((ev.clientX - r.left) / r.width - 0.5) * 2; parallaxT.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
      if (dragLamp) { dragLamp.vel = (ev.clientX - dragLamp.x) * 0.02; dragLamp.x = ev.clientX; built.lamp.userData.api.nudge(dragLamp.vel); wake(); return; }
      setHover(busy ? null : pick(ev)); wake();
    };
    const onDown = ev => { const n = pick(ev); down = { x: ev.clientX, y: ev.clientY, t: performance.now(), node: n }; if (n && n.userData.prmId === 'lamp') dragLamp = { x: ev.clientX, vel: 0 }; };
    const onUp = ev => {
      if (dragLamp) { built.lamp.userData.api.flick(dragLamp.vel * 12); dragLamp = null; wake(); }
      if (!down) return; const d = Math.hypot(ev.clientX - down.x, ev.clientY - down.y), dt = performance.now() - down.t;
      if (down.node && d < 6 && dt < 400) activate(down.node.userData.prmId);
      down = null;
    };
    const onLeave = () => { parallaxT.x = 0; parallaxT.y = 0; setHover(null); wake(); };
    canvasEl.addEventListener('pointermove', onMove); canvasEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp); canvasEl.addEventListener('pointerleave', onLeave);

    // keyboard / remote — one tab stop, arrows move, Enter/Space activate, spec § 9.2
    const order = () => P.PRM_TAB_ORDER.filter(id => nodes[id]);
    function drawFocus() {
      const el = hud.focus; if (!el) return;
      const ids = order(); if (focused < 0 || !ids[focused]) { el.style.display = 'none'; return; }
      const node = nodes[ids[focused]]; const box = new THREE.Box3().setFromObject(node);
      const r = canvasEl.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < 8; i++) {
        const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
        const sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height;
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      }
      el.style.display = 'block'; el.style.left = (x0 - 6) + 'px'; el.style.top = (y0 - 6) + 'px'; el.style.width = (x1 - x0 + 12) + 'px'; el.style.height = (y1 - y0 + 12) + 'px';
    }
    function focus(id) { const ids = order(); focused = ids.indexOf(id); drawFocus(); }
    const onKey = ev => {
      const ids = order(); if (!ids.length) return;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { focused = (focused + 1) % ids.length; drawFocus(); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { focused = (focused - 1 + ids.length) % ids.length; drawFocus(); ev.preventDefault(); }
      else if ((ev.key === 'Enter' || ev.key === ' ') && focused >= 0) { activate(ids[focused]); ev.preventDefault(); }
      else if (ev.key === 'Escape') { focused = -1; drawFocus(); }
    };
    canvasEl.addEventListener('keydown', onKey);
    canvasEl.addEventListener('blur', () => { focused = -1; drawFocus(); });

    // the attract loop, 10 fps, only while visible; one frozen frame under reduced motion
    const t0 = performance.now(); let attractDrawn = false;
    timers.interval = setInterval(() => {
      if (document.hidden) return;
      if (reduced()) { if (attractDrawn) return; attractDrawn = true; attract.draw(0); }
      else attract.draw((performance.now() - t0) / 1000);
      attractTex.needsUpdate = true; wake();
    }, PRM_ATTRACT_MS);

    // render on demand: run while something animates, then stop
    let last = 0, frames = 0;
    function wake() { if (timers.raf === null) timers.raf = requestAnimationFrame(frame); }
    function frame(now) {
      timers.raf = null;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      let active = camTweens.tick(now); active = hoverTweens.tick(now) || active;
      Object.keys(built).forEach(id => { const api = built[id].userData.api; if (api && api.tick && api.tick(now, dt, reduced())) active = true; });
      if (!reduced()) {
        const tx = parallaxT.x * PRM_PARALLAX, ty = parallaxT.y * PRM_PARALLAX * 0.6;
        if (Math.abs(tx - parallax.x) > 1e-4 || Math.abs(ty - parallax.y) > 1e-4) {
          parallax.x += (tx - parallax.x) * 0.08; parallax.y += (ty - parallax.y) * 0.08; active = true;
          if (!camTweens.active()) { const pr = PRM_PRESETS[preset]; camera.position.set(pr.pos[0] + parallax.x, pr.pos[1] - parallax.y, pr.pos[2]); camera.lookAt(lookAt); }
        }
      }
      if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
      renderer.render(scene, camera); frames++;
      if (focused >= 0) drawFocus();
      if (active) timers.raf = requestAnimationFrame(frame); else last = 0;
    }
    function resize() {
      const w = canvasEl.clientWidth || 1280, h = canvasEl.clientHeight || 720;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); shadowDirty = true; wake();
    }
    window.addEventListener('resize', resize); resize();

    const api = {
      setDesign(d) { design = Object.assign(design, d); window.PrmLib.prmApplyDesign(props, design); if (design.buttons) dialLight.color.set(design.buttons); shadowDirty = true; wake(); },
      setPreset(name) { preset = PRM_PRESETS[name] ? name : 'wide'; resetView(); },
      resetView, activate, focus, built, nodes,
      dispose() {
        if (timers.raf !== null) cancelAnimationFrame(timers.raf); timers.raf = null;
        clearInterval(timers.interval); timers.timeouts.forEach(clearTimeout); timers.timeouts.clear();
        canvasEl.removeEventListener('pointermove', onMove); canvasEl.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp); canvasEl.removeEventListener('pointerleave', onLeave);
        canvasEl.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
        renderer.dispose();
      },
    };
    if (host.debug) window.prmDebug = { cameraMatrix: () => camera.matrixWorld.elements.slice(), frames: () => frames, isRunning: () => timers.raf !== null, nodes: () => Object.keys(nodes), api };
    wake();
    return api;
  }

  const api = { prmMount, prmValidateHost, prmEligible, prmReducedMotion, prmBuildEnvMap, PRM_PRESETS, PRM_REQUIRED };
  if (typeof window !== 'undefined') window.PrmScene = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
