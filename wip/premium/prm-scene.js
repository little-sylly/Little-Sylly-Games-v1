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
    /* Scene B preview, re-aimed for the smaller box. It centres on the TABLE, not the controller:
       at 9:16 the frame spans only ~0.7 m across at this distance, and the controller now lives on
       the couch a metre to the left, so the spec's "controller is the hero" framing no longer fits.
       That is a Scene B design question for its own round — flagged, not silently resolved here. */
    portrait: { pos: [0.33, 1.22, 0.92], look: [0.33, 0.40, -0.30], fov: 54 },
  };
  const PRM_REQUIRED = ['games', 'stickers', 'design', 'lampPanels', 'music', 'enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  const PRM_FUNCS = ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  /* Optional host callbacks: absent is fine (the door is dormant), present
     must be a function. Adding a third dormant door means adding it here and
     flagging its action `optional: true` — no third hardcoded name. */
  const PRM_OPTIONAL_FUNCS = ['openStickerbook', 'openJukebox'];
  /* Optional host EFFECTS — validated the same way, but deliberately not in the
     list above, because that one is about dormant DOORS and a door is a thing
     with a destination. `sfx(name)` is the shell's audio hook: the scene names
     a moment, the page decides what it sounds like. Absent is silence, which is
     the right default for a sandbox and for any host that has no audio yet.
     Same split shell-host.js already draws for openSound — "an EFFECT, not one
     of the router's actions". */
  const PRM_EFFECT_FUNCS = ['sfx'];
  const PRM_HOVER_LIFT = 0.003, PRM_PUSH_MS = 600, PRM_FADE_AT_MS = 400, PRM_ATTRACT_MS = 100, PRM_PARALLAX = 0.035;
  /* The arrival beat (the phone tier's one-way handoff). A blocking
     choreography beat — the player cannot act through it and the duration IS
     the pacing budget — so it sits outside ui-style.md § Motion Standard's
     300 ms ceiling under the same sanctioned exception as the dial spin and
     CJAR's flip.
     Prop round 4 (owner, 23 Sep 2026) gave it a new ending: the phone now RESTS
     CLOSED, so the pan lands on a shut clamshell, which flips open (starting
     FLIP_LEAD before the pan settles, so the two overlap), and the camera then
     pushes in on the lit screen as the room fades. Budget:
     380 hold + 1100 pan − 220 overlap + 480 flip + 60 + 600 push = 2.40 s,
     inside the 2.5 s "a beat, not a wait" line the harnesses hold it to. */
  const PRM_ARRIVE_HOLD_MS = 380, PRM_ARRIVE_PAN_MS = 1100, PRM_ARRIVE_FLIP_LEAD_MS = 220, PRM_ARRIVE_STILL_MS = 700;
  /* The flip belongs to the scene's choreography, not the prop, so the scene
     passes it in and can budget against it. The pause is the beat between the
     backlight coming up and the camera moving — long enough to see it is on. */
  const PRM_PHONE_FLIP_MS = 480, PRM_PHONE_PAUSE_MS = 60;
  /* The binder's cover (the stickerbook door): heavier than a flip-phone lid,
     so a longer fall, and a longer pause to see it land before the push-in. */
  const PRM_BINDER_FLIP_MS = 700, PRM_BINDER_PAUSE_MS = 120;
  /* [flip ms, pause ms, when its sound plays]. The phone's clack IS the hinge
     letting go, so it plays as the flip starts; the binder's flump is the cover
     LANDING, so it waits for the swing (review finding, 23 Sep 2026). */
  const PRM_OPEN_TIMING = { phone: [PRM_PHONE_FLIP_MS, PRM_PHONE_PAUSE_MS, 'start'], binder: [PRM_BINDER_FLIP_MS, PRM_BINDER_PAUSE_MS, 'land'] };
  /* How much of the view the screen fills at the end of a push-in on it, in
     its tighter dimension. */
  const PRM_FOCUS_FILL = 0.8;

  function prmValidateHost(host) {
    if (!host || typeof host !== 'object') throw new Error('prmMount: host object required');
    const missing = PRM_REQUIRED.filter(k => host[k] === undefined);
    if (missing.length) throw new Error('prmMount: host is missing ' + missing.join(', '));
    PRM_FUNCS.forEach(k => { if (typeof host[k] !== 'function') throw new Error('prmMount: host.' + k + ' must be a function'); });
    PRM_OPTIONAL_FUNCS.concat(PRM_EFFECT_FUNCS).forEach(k => { if (host[k] !== undefined && typeof host[k] !== 'function') throw new Error('prmMount: host.' + k + ' must be a function when given'); });
    if (!Array.isArray(host.games) || host.games.length === 0) throw new Error('prmMount: host.games must be a non-empty array');
    return true;
  }
  function prmReducedMotion() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  /* TV mode's floor, reused (wip/lobby-lab/lobby.js LB_TV_MIN_W/H). No device sniffing.
     `reducedData` is spec § 13's third condition, now a real parameter rather
     than a line of prose — it is optional, so every existing 3-argument call
     still reads exactly the same. */
  function prmEligible(w, h, webgl, reducedData) { return w >= 900 && h >= 500 && !!webgl && !reducedData; }
  /* The ARRIVAL floor, which deliberately has no size condition: a phone can
     never stay in the lounge, but it can be shown the way out of one. At or
     above this and below prmEligible, the room is mounted lean and plays the
     beat; below this there is no context to animate with, so the same
     destination is reached without the journey. The player only ever sees two
     outcomes — the interactive lounge, or the Shelves (owner, 22 Sep 2026). */
  function prmCanArrive(webgl, reducedData) { return !!webgl && !reducedData; }
  /* The beat's whole duration, so a caller budgets a timeout against the real
     numbers instead of guessing at them. */
  function prmArriveMs(reduced) {
    return reduced ? PRM_ARRIVE_STILL_MS + 220
      : PRM_ARRIVE_HOLD_MS + PRM_ARRIVE_PAN_MS - PRM_ARRIVE_FLIP_LEAD_MS + PRM_PHONE_FLIP_MS + PRM_PHONE_PAUSE_MS + PRM_PUSH_MS;
  }

  /* A procedural environment: four emissive planes through PMREM. Zero assets;
     it is what makes matte plastic read as plastic (spec § 3.2). */
  function prmBuildEnvMap(THREE, renderer) {
    const env = new THREE.Scene(); env.background = new THREE.Color('#332e29');
    const plane = (w, h, pos, rot, hex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); env.add(m); };
    plane(6, 3, [-3, 3, 0], [0, Math.PI / 2, 0], '#9c8468');    // warm, above-left (the window side)
    plane(4, 4, [3, 2, 0], [0, -Math.PI / 2, 0], '#6b7783');    // cool, right, dimmer than before
    plane(8, 8, [0, -2, 0], [Math.PI / 2, 0, 0], '#3a332e');    // dark floor
    plane(8, 8, [0, 5, 0], [-Math.PI / 2, 0, 0], '#6a6259');    // ceiling — ambient, kept low so the key can pool
    const pmrem = new THREE.PMREMGenerator(renderer); const rt = pmrem.fromScene(env, 0.04); pmrem.dispose();
    return rt.texture;
  }

  /* The room pass, round 1 (plan 2026-09-22 § 2 "The room pass"): contact shade. Runs once, after
     the props are placed, because their rest-pose boxes are occluders too — the telly darkens the
     wall behind it and the bench under it. The planes are baked; the furniture evaluates short box
     lists in-shader (prm-lib prmContactShade). Adds no light, no draw call, no shadow caster. */
  function prmContactPass(THREE, lib, room, built) {
    const cs = window.PrmLib.prmContactShade(THREE), R = Object.assign({ ceilY: 3.2 }, room.userData.prmRoom);
    const get = (n) => room.getObjectByName(n);
    const B = (names, r, s) => cs.box([].concat(names).map(get), r, s);
    const couch = ['seatFront', 'seatLeft', 'seatRight', 'backFront', 'backLeft', 'backRight', 'armLeft', 'armRight'].map(n => B(n, 0.32, 0.55));
    const table = B('tableTop', 0.7, 0.5), legs = [0, 1, 2, 3].map(i => B('tableLeg' + i, 0.08, 0.45));
    const bench = B(['bench', 'benchBase'], 0.28, 0.55);   // the carcass and its legs: one occluder, down to the floor
    const shelf = B(['shelfSideL', 'shelfSideR', 'shelfTop', 'shelfBack'], 0.22, 0.5);
    const sill = B('sill', 0.06, 0.4), ledge = B('ledge', 0.12, 0.4);   // the window's shallow nose; the plant's ledge on the back wall (round 8)
    const prop = (id) => (built[id] ? [cs.box(built[id], 0.07, 0.45, 0.004, 0.8)] : []);   // tight: the sun already drops their shadows
    const props = ['tv', 'jukebox', 'dial', 'binder', 'phone', 'lamp'].flatMap(prop);
    // the koala mug is room, not a prop, but it sits on the table like one (room pass, round 4)
    const mug = cs.box(get('mug'), 0.07, 0.45, 0.004, 0.8);
    props.push(mug);
    /* The slippers (room pass, item 10) are one merged mesh, so each gets its box from the builder's
       record, not from an object: tight and low, so the rug darkens under each foot and not in the gap
       between them. Floor bake only — they shade nothing that moves. */
    const sl = get('slippersGroup'), feet = sl ? sl.userData.prmSlippers.boxes.map(b => {
      const h = [0, 1, 2].map(i => (b.max[i] - b.min[i]) / 2);
      return { c: [0, 1, 2].map(i => (b.max[i] + b.min[i]) / 2), h, r: 0.05, s: 0.5, k: 0.8 * Math.min(h[0], h[2]) };
    }) : [];
    const all = couch.concat([table, bench, shelf, sill, ledge], legs, props, prop('controller'), feet);
    // planes — one material each, so each can read its own bake
    const own = (n) => { const m = get(n); m.material = m.material.clone(); return m.material; };
    const planes = {
      floor:    { axis: 'xz', u: [R.leftX, 2.8], v: [R.backZ, 2.0], at: 0.006, n: [0, 1, 0] },
      wallBack: { axis: 'xy', u: [-2.8, 2.8], v: [0, 3.2], at: R.backZ + 0.004, n: [0, 0, 1] },
      wallLeft: { axis: 'zy', u: [-2.0, 2.0], v: [0, 3.2], at: R.leftX + 0.004, n: [1, 0, 0] },
    };
    const maps = {};
    /* The floor under the bookshelf (room pass, item 12): the gap under its base board is open, and
       the floor there lies INSIDE the shelf's own box, which skips it — it baked fully lit, and read
       as another board. One more box, the gap itself lifted 40% of its height off the floor, shades
       it as the shadow it is. Floor only. */
    const U = room.userData.prmShelf && room.userData.prmShelf.under, lift = U ? 0.4 * U.y[1] : 0;
    const gap = U ? [{ c: [(U.x[0] + U.x[1]) / 2, (lift + U.y[1]) / 2, (U.z[0] + U.z[1]) / 2], h: [(U.x[1] - U.x[0]) / 2, (U.y[1] - lift) / 2, (U.z[1] - U.z[0]) / 2], r: 0.2, s: 0.75, k: 0 }] : [];
    Object.keys(planes).forEach(k => { maps[k] = cs.bake(planes[k], k === 'floor' ? all.concat(gap) : all, R); cs.patchPlane(own(k), planes[k], maps[k]); });
    // the rug reads the floor's bake: it lies on the same plane
    ['rug', 'rugEdge'].forEach(n => cs.patchPlane(own(n), planes.floor, maps.floor));
    // furniture: each material gets only the boxes that can reach it
    cs.patchBoxes(lib.mats.fabric, couch.concat(prop('controller')));
    /* The throw cushions (room pass, round 7) cast NO box onto the couch. One axis-aligned box round a
       diagonal pair was far bigger than the cushions: it drew a hard-edged rectangle on the back panel
       beside them (a surface inside a box is never shaded by it) — the owner's "indents" (DD-32 § 7c).
       Their contact with the seat, back and arm is baked into their own vertex colours, so their
       material needs no box loop either: only the room grade. */
    const cushions = get('cushions');
    if (cushions) cs.patchGrade(lib.mats.cushion);
    // the curtains and their tie-backs (room pass, round 8): cloth, graded like the cushions, no box loop
    [lib.mats.curtain, lib.mats.tieback].forEach(m => cs.patchGrade(m));
    /* the shelf's books and toys (room pass, item 15): the bay's darkness and their contact are baked
       into their vertex colours, and the shelf's own box skips everything inside it, so the grade alone */
    [lib.mats.shelfBooks, lib.mats.shelfToys].forEach(m => cs.patchGrade(m));
    // the slippers: their contact with the rug is baked into their vertex colours, so the grade alone
    if (sl) [lib.mats.slipper, lib.mats.slipperInk].forEach(m => cs.patchGrade(m));
    // the piping sits in the same creases, and must take the room grade like the cloth it trims
    cs.patchBoxes(lib.mats.fabricPiping, couch);
    const wood = [table, bench, shelf].concat(props);
    [lib.mats.birch, lib.mats.birchDark, lib.mats.birchGrain, lib.mats.walnut, lib.mats.oak, lib.mats.acorn, lib.mats.cubby, lib.mats.diskLid].forEach(m => cs.patchBoxes(m, wood));
    /* The mug takes the room grade like the rest of the furniture, and one tight box — the table
       top with a 3.5 cm reach — so its foot sits down into its contact instead of the whole mug
       dimming under the table's floor-sized halo. */
    const foot = [B('tableTop', 0.035, 0.5)];
    [lib.mats.mugGlaze, lib.mats.mugInk, lib.mats.mugBlush, lib.mats.coffee].forEach(m => cs.patchBoxes(m, foot));
    return { uniforms: cs.uniforms, maps, boxes: all.length };
  }

  /* `opts` is what THIS mount wants, as distinct from `host`, which describes
     the doors and never changes between tiers. Keeping the tier decision out
     of the host is what lets prmValidateHost stay exactly as strict as it was. */
  function prmMount(canvasEl, host, opts) {
    prmValidateHost(host);
    const mountOpts = opts || {};
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
    /* Room pass round 1 (24 Sep 2026): spec D7's "darker, not dark" (0.56) lifted by the owner.
       Brightness was never the gap — the mockup's mean luma is BELOW ours — colour and contrast were. */
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.66;
    /* VSM, not PCFSoft: r128's PCFSoft path never reads shadow.radius for a spot light, so the sun's
       radius was a no-op. VSM's blur is paid only when the map re-renders, which autoUpdate = false
       keeps to the frames where something moved. */
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#d9c7b4'); scene.fog = new THREE.Fog('#b59a80', 2.8, 6.5);
    scene.environment = prmBuildEnvMap(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 30);
    const lookAt = new THREE.Vector3();

    // room first — the lights read its constants
    const room = window.PrmRoom.prmBuildRoom(lib); scene.add(room);
    const RM = room.userData.prmRoom;

    // lights — spec 2026-09-19 § 3.2: the window IS the light. One shadow-casting sun outside the left
    // wall, wide and warm, plus a narrow bright spot for the slit's stripe; a low fill; the telly's spill.
    const sun = new THREE.SpotLight('#ffcf9a', 4.2, 8, 0.40, 0.5, 1); sun.name = 'sun';
    sun.position.set(RM.leftX - 0.6, 1.80, -0.75); sun.target.position.set(RM.sunPool[0], RM.sunPool[1], RM.sunPool[2]);   // the window's shafts land on the same pool
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; sun.shadow.radius = 6;
    scene.add(sun, sun.target);
    const slit = new THREE.SpotLight('#ffd9ae', 3.4, 5, 0.15, 0.6, 1); slit.name = 'slit';
    slit.position.set(RM.leftX - 0.3, 1.7, -0.62); slit.target.position.set(0.25, 0.02, -0.25);
    scene.add(slit, slit.target);
    /* The fill was cool and nearly off (0.035), so everything the sun missed fell to brown-black.
       Warm now, and high enough that the contact shade has ambient light to take away. */
    const fill = new THREE.HemisphereLight('#ffd6b0', '#b77d58', 0.2); fill.name = 'fill'; scene.add(fill);
    const tvLight = new THREE.PointLight('#bfe6d0', 0.6, 2.5, 2); tvLight.name = 'tvLight'; tvLight.position.set(0.16, 0.9, -0.85); scene.add(tvLight);
    /* No window-glow point light (room pass, item 9). Round 1 meant to widen one, and the edit ran a
       comment over its own statement, so the room has been tuned and approved WITHOUT it ever since.
       The window's brightness is now the bloom and the shafts (prm-room prmBuildWindowLight), ~2%
       held-state. A revived light was +3.2%, and it moved every approved look (DD-35). */
    const dialLight = new THREE.PointLight(design.buttons || '#ffffff', 0.25, 0.6, 2); dialLight.name = 'dialLight'; dialLight.position.set(0.60, 0.5, 0.0); scene.add(dialLight);
    const attract = P.prmAttract(makeCanvas, host.games);
    const attractTex = new THREE.CanvasTexture(attract.canvas); attractTex.encoding = THREE.sRGBEncoding;
    const ctx = { lib, design, games: host.games, stickers: host.stickers, lampPanels: host.lampPanels, ControllerBody: CB, attractTexture: attractTex, roomData: room.userData, skipProps: mountOpts.skipProps || null };
    const props = new THREE.Group(); props.name = 'props'; scene.add(props);
    const built = P.prmBuildAll(ctx);
    Object.keys(built).forEach(id => {
      const g = built[id], pl = P.PRM_PLACES[id];
      if (pl) { g.position.set(pl.pos[0], pl.pos[1], pl.pos[2]); if (pl.rot) g.rotation.set(pl.rot[0], pl.rot[1], pl.rot[2]); }
      props.add(g);
    });
    scene.updateMatrixWorld(true);
    const contact = prmContactPass(THREE, lib, room, built);

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
    // the bench bay's atlas (the Play-Max's name, the disk labels) repainted once Fredoka is in; a page without the face keeps the fallback
    const cubbyMap = lib.mats.cubby.map;
    if (cubbyMap && cubbyMap.userData.prmRepaint && document.fonts && document.fonts.load)
      document.fonts.load('bold 40px Fredoka').then(f => { if (f && f.length) { cubbyMap.userData.prmRepaint(); wake(); } }, () => {});

    // motion
    const camTweens = P.prmMotion(), hoverTweens = P.prmMotion();
    let hovered = null, focused = -1, busy = false, parallaxT = { x: 0, y: 0 }, parallax = { x: 0, y: 0 };
    /* `paused` is the shell's stop switch (W5): a hidden room must cost
       nothing, and CSS alone cannot do it — the attract interval further down
       calls wake() ten times a second whatever the canvas's display is.
       Declared here, ahead of wake()'s own definition, because syncJukebox()
       below calls wake() synchronously during mount — a `let` declared next
       to wake() itself would still be in its temporal dead zone at that call.
       Stopping is NOT disposing: rebuilding re-runs every procedural texture
       and the PMREM pass, which is the whole reason the room is kept. */
    let paused = false;
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
    /* A prop can say exactly where to look instead (api.focusPose: a point, the
       outward normal of the face, and the face's size). The phone does: its
       screen is a 42 mm face at an angle, and the bounding box of an open
       clamshell is mostly air. The camera then stops on the face's normal at
       the distance that fills PRM_FOCUS_FILL of the view with it — worked out
       from THIS camera's fov and aspect, so portrait and widescreen both land
       on a filled screen and neither clips it. */
    function focusDist(pose) {
      const t = 2 * Math.tan(camera.fov * Math.PI / 360);
      return Math.max(pose.h / (PRM_FOCUS_FILL * t), pose.w / (PRM_FOCUS_FILL * t * camera.aspect), camera.near * 1.5);
    }
    function pushIn(target, done) {
      const api = target.userData.api, pose = api && api.focusPose ? api.focusPose() : null;
      const p = pose ? pose.point : new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());
      later(() => hud.fade && hud.fade.classList.add('on'), reduced() ? 0 : PRM_FADE_AT_MS);
      if (reduced()) { later(done, 220); return; }
      const from = camera.position.clone(), look0 = lookAt.clone();
      const to = pose ? p.clone().addScaledVector(pose.normal, focusDist(pose)) : p.clone().add(new THREE.Vector3(0, 0, 0.45));
      camTweens.add(0, 1, PRM_PUSH_MS, P.prmEaseOutCubic, t => { camera.position.lerpVectors(from, to, t); lookAt.lerpVectors(look0, p, t); camera.lookAt(lookAt); }, done);
      wake();
    }
    function fadeOut(done) { if (hud.fade) hud.fade.classList.add('on'); later(done, 220); }
    /* The phone door's second half, shared by a tap and by the arrival beat:
       flip it open, wait for the backlight, push in on the screen. A phone
       with no `open` (a host building an older prop) just fades, so the door
       never depends on the scenery. `sound` is off for the arrival: nobody
       has touched anything yet, and a browser refuses audio before a gesture. */
    /* Generalised for the binder (the stickerbook prototype, 23 Sep 2026): any
       prop whose door has an 'open' field goes the same way, with its own timing and its
       own sound, named '<id>Open'. */
    function openProp(id, done, sound) {
      const node = nodes[id], api = node && node.userData.api, quiet = reduced();
      if (!api || typeof api.open !== 'function') { fadeOut(done); return; }
      const [ms, pause, when] = PRM_OPEN_TIMING[id] || [undefined, PRM_PHONE_PAUSE_MS, 'start'];
      if (sound && when !== 'land') sfx(id + 'Open');
      api.open({ ms, instant: quiet }).then(() => { if (sound && when === 'land') sfx(id + 'Open'); later(() => pushIn(node, done), quiet ? 400 : pause); });
      wake();
    }
    /* The arrival beat. Nobody tapped anything — this is the room introducing
       itself to a device that cannot keep it — so it opens on the portrait
       preset, holds long enough to read as a place, pans to the clamshell and
       hands over. `busy` is held for the WHOLE beat, hold included, so a stray
       touch on the way through cannot start a second transition.

       The PAN is still a pan: the camera drifts a third of the way in while the
       LOOK does the real work, which keeps the room readable on the way. What
       changed in prop round 4 is the ending. Spec § 7.4 ruled out a camera dive
       into the clamshell as a joke; the owner reversed that on 23 Sep 2026 —
       the phone now rests closed, and the way to the Shelves is to flip it
       open and go in through its screen, the same as a tap. The dive is short,
       it is aimed at a lit screen rather than at a lump of plastic, and it
       lands where the screen said it would. */
    function arrive(done) {
      const target = nodes['phone'];
      /* Nothing to pan to is not a reason to strand anyone: fade and hand over
         regardless, so the destination never depends on the scenery. */
      if (!target) { busy = true; fadeOut(() => { busy = false; done(); }); return; }
      busy = true;
      preset = 'portrait'; applyPreset(preset);
      const p = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());
      const from = camera.position.clone(), look0 = lookAt.clone();
      const to = from.clone().lerp(p.clone().add(new THREE.Vector3(0, 0.10, 0.34)), 0.34);
      const finish = () => { busy = false; done(); };
      if (reduced()) {
        /* Nothing travels — and nothing is lost either. The standard asks for
           the end state, not for the feature to be dropped (ui-style.md
           § Motion Standard, combReducedMotion()'s shape): the room is shown
           already framed on the clamshell, held long enough to actually read,
           then cut. A player with the setting on still learns there is a lounge
           and still sees the thing it is handing them to — open, since the open
           phone is the end state (the flip is the journey). */
        camera.position.copy(to); lookAt.copy(p); camera.lookAt(lookAt);
        if (target.userData.api && target.userData.api.open) target.userData.api.open({ instant: true });
        wake();
        later(() => { if (hud.fade) hud.fade.classList.add('on'); later(finish, 220); }, PRM_ARRIVE_STILL_MS);
        return;
      }
      later(() => {
        camTweens.add(0, 1, PRM_ARRIVE_PAN_MS, P.prmEaseOutCubic,
          t => { camera.position.lerpVectors(from, to, t); lookAt.lerpVectors(look0, p, t); camera.lookAt(lookAt); });
        /* The flip starts as the pan is settling — an ease-out cubic has
           covered 99% of its distance by then — and the push-in waits on the
           flip, so the pan has always finished before it starts. */
        later(() => openProp('phone', finish, false), PRM_ARRIVE_PAN_MS - PRM_ARRIVE_FLIP_LEAD_MS);
        wake();
      }, PRM_ARRIVE_HOLD_MS);
    }
    /* A door transition has TWO halves — a camera tween and one or more later()
       timeouts — and this cleared only the first. pushIn() schedules its fade at
       PRM_FADE_AT_MS, so a dial tapped on the way out could land that timeout
       AFTER the player was already back in the room, re-lighting an opaque pane
       over a lounge that had just been reset. Abandoning a transition means
       abandoning both halves; leaving either running is how the room ends up
       obeying a door nobody is standing at any more. */
    /* The same goes for a prop a door changed on the way out: the phone is
       left OPEN by its door, and a room walked back into should be the room
       as it rests. Any prop api with a `reset` gets one. */
    function resetView() {
      timers.timeouts.forEach(clearTimeout); timers.timeouts.clear(); if (hud.fade) hud.fade.classList.remove('on'); busy = false; camTweens.clear();
      Object.keys(built).forEach(id => { const a = built[id].userData.api; if (a && typeof a.reset === 'function') a.reset(); });
      shadowDirty = true; applyPreset(preset);
    }
    function tweenTurn(node) { const from = node.userData.turn || 0, to = from + Math.PI / 6; node.userData.turn = to; hoverTweens.add(from, to, 120, P.prmEaseOutCubic, v => node.rotation.y = v); wake(); }
    function syncJukebox() {
      const jb = built.jukebox && built.jukebox.userData.api; if (!jb) return;
      const np = host.music.nowPlaying(); jb.setPlaying(!!np);
      let label = 'Quiet';
      if (np) { const g = host.games.find(x => x.id === np.key); label = np.title || (g ? g.gameName : np.key); }
      jb.setLabel(label); wake();
    }
    syncJukebox();

    /* The audio hook. Never throws into a caller: a page whose AudioContext is
       suspended, blocked or simply absent must not be able to break a door. */
    function sfx(name) { if (typeof host.sfx === 'function') { try { host.sfx(name); } catch (_) {} } }

    // actions — the interpreter for PRM_ACTIONS
    function activate(id) {
      const a = P.PRM_ACTIONS[id], node = nodes[id]; if (!a || !node || busy) return;
      if (a.local === 'flick') { built.lamp.userData.api.flick(4.0); wake(); return; }
      if (a.turn) tweenTurn(node);
      if (a.spin) {
        busy = true; const api = built.dial.userData.api;
        /* One named moment: the button's click. A hum for the length of the spin
           was built alongside it and cut by the owner the same day — the seam is
           what matters here, not how many names go through it. */
        const quiet = reduced();
        sfx('dialPress');
        api.spin(host.rand || Math.random, { instant: quiet }).then(gameId => {
          later(() => pushIn(nodes['tv-screen'], () => { busy = false; host.enterTV(gameId); }), quiet ? 600 : 250);
        }); wake(); return;
      }
      /* A dormant door: call the host callback if this host supplies one,
         otherwise fall back to the prop's own api when the action names one.
         `a.prop` names the prop whose api holds the fallback when the pick id
         is not the prop's own — the jukebox's body answers as 'jukebox-knob'.
         Flag-driven, so a third dormant door needs no third name. */
      if (a.optional) {
        const owner = built[a.prop || id];
        if (typeof host[a.callback] === 'function') {
          /* A supplied optional door with an 'open' field is a real door now: the binder
             flips, the camera pushes in, then the host opens the stickerbook. */
          if (a.open) { busy = true; openProp(id, () => { busy = false; host[a.callback](); }, true); return; }
          host[a.callback]();
        } else if (a.fallback && owner && owner.userData.api) owner.userData.api[a.fallback](reduced());
        wake(); return;
      }
      if (a.callback === 'music.next') {
        const keys = host.music.keys || []; if (!keys.length) return;
        const np = host.music.nowPlaying(); const i = keys.indexOf(np && np.key);
        host.music.playFor(keys[(i + 1) % keys.length]); syncJukebox(); return;
      }
      if (a.open) { busy = true; openProp(id, () => { busy = false; host[a.callback](); }, true); return; }
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
      if (document.hidden || paused) return;
      if (reduced()) { if (attractDrawn) return; attractDrawn = true; attract.draw(0); }
      else attract.draw((performance.now() - t0) / 1000);
      attractTex.needsUpdate = true; wake();
    }, PRM_ATTRACT_MS);

    // render on demand: run while something animates, then stop
    let last = 0, frames = 0;
    function wake() { if (!paused && timers.raf === null) timers.raf = requestAnimationFrame(frame); }
    function frame(now) {
      timers.raf = null;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      /* Shadows, spec § 11 — "set needsUpdate only when a prop moves". It was
         specified and never implemented: shadowDirty was set at init, on a
         texture load, on hover, on resize and on setDesign, and by NOTHING in
         this loop. So every animated prop (the binder's cover, the lamp's spin,
         the record, the dial) ran against a frozen map and only caught up on
         the next unrelated hover — the visible lag when the binder opens.
         A camera tween is deliberately NOT a reason to redraw it: the map is
         rendered from the light, so moving the eye cannot change it. */
      const camActive = camTweens.tick(now);
      let propActive = hoverTweens.tick(now);   // the hover lift and tweenTurn both MOVE props
      Object.keys(built).forEach(id => { const api = built[id].userData.api; if (api && api.tick && api.tick(now, dt, reduced())) propActive = true; });
      /* The room's own motion (the mug's steam). Its result is deliberately ignored: it rides this
         frame and never asks for the next, and it moves no shadow caster. */
      if (room.userData.prmTick) room.userData.prmTick(now, reduced());
      if (propActive) shadowDirty = true;
      let active = camActive || propActive;
      /* `!busy` closes a gap the push-in never exposed. A transition with a
         live camTween was already safe (the inner guard below), but the arrival
         beat holds `busy` for 420 ms BEFORE its tween exists, and a touch
         landing in that window would parallax the camera off the opening
         framing. No transition should be steerable. */
      if (!reduced() && !busy) {
        const tx = parallaxT.x * PRM_PARALLAX, ty = parallaxT.y * PRM_PARALLAX * 0.6;
        if (Math.abs(tx - parallax.x) > 1e-4 || Math.abs(ty - parallax.y) > 1e-4) {
          parallax.x += (tx - parallax.x) * 0.08; parallax.y += (ty - parallax.y) * 0.08; active = true;
          if (!camTweens.active()) { const pr = PRM_PRESETS[preset]; camera.position.set(pr.pos[0] + parallax.x, pr.pos[1] - parallax.y, pr.pos[2]); camera.lookAt(lookAt); }
        }
      }
      if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
      renderer.render(scene, camera); frames++;
      if (focused >= 0) drawFocus();
      if (active && !paused) timers.raf = requestAnimationFrame(frame); else last = 0;
    }
    function resize() {
      const w = canvasEl.clientWidth || 1280, h = canvasEl.clientHeight || 720;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); shadowDirty = true; wake();
    }
    window.addEventListener('resize', resize); resize();

    const api = {
      /* `onDesign` is for a colour that lives in a drawn texture rather than a
         material — the phone's screen mascot is painted in the ears colour. */
      setDesign(d) {
        design = Object.assign(design, d); window.PrmLib.prmApplyDesign(props, design); if (design.buttons) dialLight.color.set(design.buttons);
        Object.keys(built).forEach(id => { const a = built[id].userData.api; if (a && typeof a.onDesign === 'function') a.onDesign(design); });
        shadowDirty = true; wake();
      },
      setPreset(name) { preset = PRM_PRESETS[name] ? name : 'wide'; resetView(); },
      resetView, arrive, activate, focus, built, nodes,
      /* Call a prop's api from outside the scene and re-render — the shell tells
         the binder what the collection is. A missing prop or api is a no-op. */
      withProp(id, fn) { const a = built[id] && built[id].userData.api; if (!a) return; try { fn(a); } catch (_) {} shadowDirty = true; wake(); },
      stop() { paused = true; if (timers.raf !== null) cancelAnimationFrame(timers.raf); timers.raf = null; last = 0; },
      resume() { paused = false; resize(); },
      dispose() {
        if (timers.raf !== null) cancelAnimationFrame(timers.raf); timers.raf = null;
        clearInterval(timers.interval); timers.timeouts.forEach(clearTimeout); timers.timeouts.clear();
        canvasEl.removeEventListener('pointermove', onMove); canvasEl.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp); canvasEl.removeEventListener('pointerleave', onLeave);
        canvasEl.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
        Object.values(contact.maps).forEach(t => t.dispose());   // the contact bakes live in uniforms, not in any material's map
        renderer.dispose();
      },
    };
    if (host.debug) window.prmDebug = {
      cameraMatrix: () => camera.matrixWorld.elements.slice(), frames: () => frames, isRunning: () => timers.raf !== null, nodes: () => Object.keys(nodes), api,
      three: { renderer, scene, camera, room, contact },   // debug only — lets a tuning script sweep the light rig in one page
      /* Mean HSL saturation (0–1) of the frame, straight off the GL buffer after a fresh render. The
         mood's other half beside lumaGrid: the room read "flat" at 0.23 against the mockup's 0.47. */
      saturation() {
        renderer.render(scene, camera); const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let s = 0, n = 0;
        for (let i = 0; i < px.length; i += 4 * 23) {
          const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
          s += d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); n++;
        }
        return s / n;
      },
      lights() { const out = []; scene.traverse(o => { if (o.isLight) out.push({ name: o.name, type: o.type, castShadow: !!o.castShadow, position: o.position.toArray() }); }); return out; },
      /* Mean luma (0–255) of a cols×rows grid of patches, read straight off the GL buffer after a fresh
         render — same task, so no preserveDrawingBuffer needed. Row 0 is the TOP of the frame. */
      lumaGrid(cols = 8, rows = 5) {
        renderer.render(scene, camera); const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const out = []; const pw = Math.floor(W / cols), ph = Math.floor(H / rows);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          let sum = 0, n = 0;
          for (let y = (rows - 1 - r) * ph; y < (rows - r) * ph; y += 4) for (let x = c * pw; x < (c + 1) * pw; x += 4) { const i = (y * W + x) * 4; sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; }
          out.push(sum / n);
        }
        return out;
      },
      screenBox(id) {
        const node = nodes[id]; if (!node) return null; const box = new THREE.Box3().setFromObject(node); const r = canvasEl.getBoundingClientRect();
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
          const sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height; x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
        return { w: x1 - x0, h: y1 - y0 };
      },
    };
    wake();
    return api;
  }

  const api = { prmMount, prmValidateHost, prmEligible, prmCanArrive, prmArriveMs, prmReducedMotion, prmBuildEnvMap, prmContactPass, PRM_PRESETS, PRM_REQUIRED, PRM_FUNCS, PRM_OPTIONAL_FUNCS, PRM_EFFECT_FUNCS };
  if (typeof window !== 'undefined') window.PrmScene = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
