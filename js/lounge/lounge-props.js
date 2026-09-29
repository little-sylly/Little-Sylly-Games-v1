// ═══════════════════════════════════════════════════════════════════════════
// lounge-props.js — Premium lounge: the props. One pure builder per prop plus the
// DATA the scene runs on: what each pick id does (LOU_ACTIONS), where each prop
// sits (LOU_PLACES), the keyboard order (LOU_TAB_ORDER). Spec §§ 7, 8, 9.
//
// Pure: every builder takes lib (which carries THREE) and data, touches no DOM,
// loads no image — a material that wants one is tagged userData.louImage = url
// and lounge-scene.js loads it after mount. verify-lounge-props.js drives all of it
// under Node.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  /* What a tap on each pick id does. `callback` names a host callback; `local`
     names a prop api call. The scene interprets the flags — see louMount. */
  const LOU_ACTIONS = {
    'tv-screen':      { callback: 'enterTV', arg: null, pushIn: 'tv-screen' },
    'tv-channel':     { callback: 'openSwitcher', turn: true },
    'tv-volume':      { callback: 'openSound', turn: true },
    /* W4 — a dormant door to the undecided karaoke/jukebox feature, NOT the
       sound overlay (that is the telly's volume dial). Since prop round 3
       (owner, 23 Sep 2026) there is no knob: "clicking the jukebox itself
       (anywhere) will be the door", so the id — kept, because the harness and
       the shell both name it — now tags the jukebox's whole BODY. It can no
       longer `turn` (tweenTurn would spin the entire cabinet), so with nobody
       supplying openJukebox the answer is the prop's own `bop`, a small hop.
       `prop` names whose api that is: the pick id is not the prop id here,
       unlike the binder's. SW v233 built the room it leads to: a host that
       supplies openJukebox gets a push-in on the cat and then the jukebox
       screen; one that does not still gets the bop. It is a tab stop now, just
       before the records. */
    'jukebox-knob':   { callback: 'openJukebox', optional: true, prop: 'jukebox', fallback: 'bop', pushIn: 'jukebox-knob' },
    'jukebox-record': { callback: 'music.next' },
    'dial':           { callback: 'enterTV', spin: true, pushIn: 'tv-screen' },
    /* Prop round 4 (owner, 23 Sep 2026): the phone rests CLOSED. A tap flips it
       open (`open` names the prop api that does it; the scene waits on its
       promise), the backlight comes up, and the camera pushes in on the screen
       before the Shelves — the prop tells the scene where the screen is
       (api.focusPose). It used to fade straight out. */
    'phone':          { callback: 'enterShelves', open: 'open', pushIn: 'phone' },
    'controller':     { callback: 'openWorkshop' },
    'lamp':           { local: 'flick' },
    /* Prop round 5 + the stickerbook prototype (owner, 23 Sep 2026): the same
       shape as the phone — the cover flips open, the camera pushes in on the
       open spread (api.focusPose), then the host opens the book. Still optional:
       a host with no openStickerbook gets the old cover flip (fallback). */
    'binder':         { callback: 'openStickerbook', optional: true, open: 'open', pushIn: 'binder', fallback: 'openCover' },
    /* Little Sylly's two paintings over the jukebox. An EFFECT, not a place: the host opens a gallery
       overlay above the room (the room stays put behind it), so no push-in and no fade. `arg` names
       the painting; a host with no openPainting leaves the frames as plain wall art. */
    'painting-a':     { callback: 'openPainting', arg: 'birches', optional: true },
    'painting-b':     { callback: 'openPainting', arg: 'toucan',  optional: true },
  };
  /* Keyboard / remote order, spec § 9.2. */
  const LOU_TAB_ORDER = ['tv-screen', 'jukebox-knob', 'jukebox-record', 'painting-a', 'painting-b', 'dial', 'binder', 'phone', 'controller', 'lamp'];
  /* World placement per prop group. y values sit on the room's surfaces
     (lounge-room.js louRoom): bench top 0.52, table top 0.44, arm top 0.58,
     side table top 0.565. x/z mirror louRoom's tableX/tableZ/benchZ — keep
     them in step by hand; the harness footprint check is what catches drift.
     A builder's group origin is its resting base. */
  const LOU_PLACES = {
    tv:            { pos: [ 0.16, 0.52, -1.10] },                      // dead on the camera's view axis — the telly is the focus
    jukebox:       { pos: [-0.72, 0.52, -1.10] },                      // left, balancing the window and the sill plant
    dial:          { pos: [ 0.62, 0.44,  0.02] },
    binder:        { pos: [ 0.03, 0.44, -0.08], rot: [0, 0.18, 0] },
    phone:         { pos: [ 0.33, 0.44,  0.26], rot: [0, -0.35, 0] },  // front-centre: the Shelves door, and Scene B's hero
    controller:    { pos: [-0.68, 0.47,  0.22], rot: [0, -0.30, 0] },  // on the U's left run, not on an arm
    'painting-a':  { pos: [-0.88, 1.18, -1.55] },                      // on the back wall (louRoom backZ), above the jukebox — over the telly they cluttered it
    'painting-b':  { pos: [-0.52, 1.06, -1.55] },
    lamp:          { pos: [ 1.52, 0.43, -1.425] },                     // the shelf's LOWEST board, 15 mm proud of centre so a swinging photo clears the back panel
    shelfContents: { pos: [0, 0, 0] },
  };
  /* Builders register here, one per task: id → (ctx, shared) => Group. */
  const LOU_BUILDERS = {};

  /* ctx.skipProps names prop ids this mount does not want built at all.
     It exists for the phone tier's arrival beat: the controller is 87% of the
     prop build (measured 21 Sep 2026 — 859 ms of 990 at CPU 4x, against
     53 ms for the next heaviest), and it is the difference between a two-second
     arrival and a stall on exactly the hardware the beat is for. Skipping is a
     real omission, not a hidden mesh: the id never enters `built`, so it has no
     pick node, no tab stop and no placement — LOU_TAB_ORDER already filters on
     `nodes[id]` and activate() already returns on a missing node, so nothing
     downstream needs to know. */
  function louBuildAll(ctx) {
    const shared = {};   // the TV and the jukebox now build their own ears; nothing is shared
    const out = {};
    const skip = ctx && ctx.skipProps ? ctx.skipProps : [];
    Object.keys(LOU_BUILDERS).forEach(id => {
      if (skip.indexOf(id) !== -1) return;
      const g = LOU_BUILDERS[id](ctx, shared); g.name = id; out[id] = g;
    });
    return out;
  }

  /* Tiny tween list. add() queues; tick(now) advances all and returns whether
     any is still running — the scene's render-on-demand loop reads that. */
  function louMotion() {
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
  const louEaseOutCubic = p => 1 - Math.pow(1 - p, 3);
  const louEaseOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  /* Helpers every builder uses. tag() marks a pick node. */
  function louMesh(THREE, geo, mat, name, pos, rot, cast = true) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = cast; m.receiveShadow = true; return m;
  }
  function louTag(obj, id) { obj.userData.louId = id; return obj; }

  /* The TV's attract screen, spec § 8. Pure drawing on an injected canvas; the
     scene turns it into a CanvasTexture and calls draw() at ~10 fps. */
  const LOU_ATTRACT_LINES = ['Tap the telly to browse the box.', 'Game night. No excuses.', 'Twenty games. One couch.', 'Pick a game, any game.'];
  function louAttract(makeCanvas, games, lines = LOU_ATTRACT_LINES) {
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

  /* The player's controller. With the Workshop's painted model available
     (host.controllerParts → js/controller.js ctlModelParts) it wears the real
     atlas — stickers and the plate outline — on the Workshop's own geometry, so
     the app pays ONE buildBody. Materials stay the room's own: a room material
     carries shader patches (contact shade, grade) that must never reach the
     Workshop's render, so only geometry and textures are borrowed, and both are
     tagged so the scene's dispose() leaves them alone. No parts → flat colour,
     exactly as before. Never monochrome. */
  function louBuildController(lib, design, CB, getParts, ctx = {}) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, 'controller');
    let parts = null;
    try { parts = typeof getParts === 'function' ? getParts() : null; } catch (_) { parts = null; }
    const painted = (texMap, bumpMap) => {
      const m = lib.role('painted', '#ffffff', { map: texMap, bumpMap, bumpScale: 0.035 });
      m.userData.louSharedMaps = true;   // role 'painted' is in no design, so louApplyDesign leaves it white
      return m;
    };
    const geo = parts ? parts.geo : CB.buildBody(THREE, {});
    const body = new THREE.Mesh(geo, parts ? painted(parts.tex, parts.bumpTex) : lib.role('shell', design.shell));
    body.name = 'body'; body.castShadow = body.receiveShadow = true;
    if (parts) body.userData.louSharedGeometry = true;
    const inner = new THREE.Group(); inner.name = 'rig'; inner.add(body);
    if (parts) {
      parts.ears.forEach(src => {
        const e = new THREE.Mesh(src.geometry, painted(parts.earTex, parts.earBumpTex));
        e.position.copy(src.position); e.quaternion.copy(src.quaternion); e.scale.copy(src.scale);
        e.castShadow = e.receiveShadow = true; e.userData.louSharedGeometry = true;
        inner.add(e);
      });
    } else {
      CB.buildEars(THREE, lib.role('ears', design.ears)).forEach(m => inner.add(m));
    }
    const controls = CB.buildControls(THREE, geo); inner.add(controls.group);
    controls.group.traverse(o => {
      if (!o.isMesh || !o.material) return; o.castShadow = true;
      const pd = o.parent && o.parent.name === 'D-pad';
      if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || pd || / stick$/.test(o.name) || / well$/.test(o.name)) {
        o.material = o.material.clone(); o.material.userData.louRole = 'buttons'; o.material.color.set(design.buttons);
      }
    });
    /* Body units are ~4.6 wide; 0.036 makes it ~16.5 cm. Face up, leaning toward the camera. */
    inner.scale.setScalar(0.036); inner.rotation.x = -Math.PI / 2 + 0.28;
    inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner); inner.position.y = -bb.min.y;   // rest the lowest point on the group origin
    g.add(inner);
    g.userData.api = louControllerIdle(THREE, inner, controls.group, ctx.rand || Math.random, ctx.sfx);
    return g;
  }

  /* ── The controller's idle beats (controller animation round, owner 26 Sep 2026) ──
     The controller is the room's focus prop, so every 8-14 s it does one small
     thing a real controller does when it is left on a couch:
       rumble  — two buzz pulses, chattering in place (a room voice, lounge-sfx.js)
       sticks  — both thumbsticks circle 1.5 turns, opposite ways, and spring home
       pair    — the face buttons light in turn round the diamond, twice: looking
                 for a player. Silent, and nothing travels
       konami  — RARE (10%): ↑↑↓↓←→←→ B A Start, each press with the Workshop's
                 own button voice and secret beep. A HINT ONLY: it names sounds,
                 it never reaches smHandleButton, so it cannot unlock anything.
     No timers: the scheduler reads `now` from the scene's frame, which the attract
     loop wakes at 10 fps whenever the room is on screen. A gap in `now` means the
     scene was stopped (a door, the Workshop) — the beat is dropped at rest and the
     next one re-armed, so nothing is ever caught half-pressed. Under reduced
     motion nothing moves; only the Konami's SOUND plays, because the sound is the
     hint (ui-style.md § Motion Standard: reduced motion, not reduced information). */
  const LOU_CTL_FIRST_MS = [3000, 5000];
  const LOU_CTL_STOPPED_MS = 1500;   // a longer silence between frames than this means the scene was stopped, not a slow frame
  const LOU_CTL_GAP_MS = [8000, 14000];
  const LOU_CTL_BEATS = [{ kind: 'konami', w: 0.10 }, { kind: 'rumble', w: 0.35 }, { kind: 'sticks', w: 0.30 }, { kind: 'pair', w: 0.25 }];
  /* The code as buttons — the D-pad's four arms, then two face caps and Start.
     Button names are controller-body.js's mesh names, so the host can hand each
     to ctlVoiceFor unchanged. */
  const LOU_CTL_KONAMI = [['D-pad', 'Up'], ['D-pad', 'Up'], ['D-pad', 'Down'], ['D-pad', 'Down'], ['D-pad', 'Left'], ['D-pad', 'Right'], ['D-pad', 'Left'], ['D-pad', 'Right'], ['Face B'], ['Face A'], ['Start']];
  const LOU_CTL_KONAMI_STEP_MS = 260, LOU_CTL_KONAMI_BREATH_MS = 140;   // an even, deliberate cadence, with a breath before B
  const LOU_CTL_PRESS = { down: 60, hold: 120, up: 190 };               // one press: sink by 60 ms, let go at 120, home by 190
  const LOU_CTL_PRESS_GLOW = 0.9;  // how brightly a Konami key lights at the bottom of its press
  const LOU_CTL_ROCK = 0.13;      // radians the D-pad plate leans — js/controller.js CTL_ROCK, so it rocks like the Workshop's
  const LOU_CTL_STICK_MS = 1700, LOU_CTL_STICK_TILT = 0.24, LOU_CTL_STICK_TURNS = 1.5;
  const LOU_CTL_RUMBLE_PULSES = [[0, 260], [360, 640]];
  const LOU_CTL_RUMBLE = { pos: 0.0011, lift: 0.0004, rot: 0.015 };   // metres / radians — a chatter, never a hop
  const LOU_CTL_FACES = ['Face Y', 'Face B', 'Face A', 'Face X'];      // clockwise round the diamond
  const LOU_CTL_PAIR_MS = 1600, LOU_CTL_PAIR_GLOW = 1.1;
  const louCtlKonamiAt = i => i * LOU_CTL_KONAMI_STEP_MS + (i >= 8 ? LOU_CTL_KONAMI_BREATH_MS : 0);
  const LOU_CTL_KONAMI_MS = louCtlKonamiAt(LOU_CTL_KONAMI.length - 1) + LOU_CTL_PRESS.up + 60;
  const louSmooth = p => p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);

  function louControllerIdle(THREE, inner, group, rand, sfx) {
    const say = name => { if (typeof sfx === 'function') { try { sfx(name); } catch (_) {} } };
    const part = n => group.getObjectByName(n);
    const sticks = ['Left stick', 'Right stick'].map(part).filter(Boolean);
    const faces = LOU_CTL_FACES.map(part).filter(Boolean);
    const glowBase = faces.map(m => m.material.emissiveIntensity);
    /* A pressed Konami key also LIGHTS with its press. The travel is true to scale (2 mm, the
       Workshop's rock) and invisible from the couch camera — seen in real Chromium, 26 Sep 2026 —
       so without it the beeps seemed to come from nowhere. Each part owns its material (the
       caps from buildControls, the D-pad a per-prop clone), so lighting one lights nothing else. */
    const lit = {};
    LOU_CTL_KONAMI.forEach(([n]) => { const m = part(n); if (m && !lit[n]) lit[n] = { m, c: m.material.emissive.clone(), i: m.material.emissiveIntensity }; });
    function light(name, e) {
      const L = lit[name]; if (!L) return; const mat = L.m.material;
      if (e > 0) { mat.emissive.copy(mat.color); mat.emissiveIntensity = L.i + LOU_CTL_PRESS_GLOW * e; }
      else { mat.emissive.copy(L.c); mat.emissiveIntensity = L.i; }
    }
    const rest = { pos: inner.position.clone(), rot: inner.rotation.clone() };
    const E = new THREE.Euler(), Q = new THREE.Quaternion();
    const between = r => r[0] + rand() * (r[1] - r[0]);
    let beat = null, nextAt = null, last = null, lastKind = null;

    // One press envelope, 0..1 — shared by the D-pad's rock and a cap's sink.
    const pressE = tau => tau < 0 || tau >= LOU_CTL_PRESS.up ? 0 : tau < LOU_CTL_PRESS.down ? louSmooth(tau / LOU_CTL_PRESS.down)
      : tau < LOU_CTL_PRESS.hold ? 1 : 1 - louSmooth((tau - LOU_CTL_PRESS.hold) / (LOU_CTL_PRESS.up - LOU_CTL_PRESS.hold));
    function pose(m, e, dir) {
      const d = m.userData;
      if (d.rocker) {
        const a = LOU_CTL_ROCK * e, dx = dir === 'Right' ? 1 : dir === 'Left' ? -1 : 0, dy = dir === 'Up' ? 1 : dir === 'Down' ? -1 : 0;
        m.quaternion.copy(Q.setFromEuler(E.set(-a * dy, a * dx, 0))).multiply(d.baseQuat);   // parent-frame rock, as ctlTick does
      } else m.position.copy(d.rest).addScaledVector(d.axis, -d.press * e);
    }
    function tilt(m, x, z) { m.quaternion.copy(m.userData.baseQuat).multiply(Q.setFromEuler(E.set(x, 0, z))); }

    // Everything a beat can touch, put back exactly — the end of every beat and every drop.
    function home() {
      inner.position.copy(rest.pos); inner.rotation.copy(rest.rot);
      group.traverse(o => { const d = o.userData; if (d && d.rest) o.position.copy(d.rest); if (d && d.baseQuat) o.quaternion.copy(d.baseQuat); });
      faces.forEach((m, i) => { m.material.emissiveIntensity = glowBase[i]; });
      Object.keys(lit).forEach(n => light(n, 0));
    }

    const RUN = {
      konami: { ms: LOU_CTL_KONAMI_MS, frame(tau, b, quiet) {
        LOU_CTL_KONAMI.forEach(([name, dir], i) => {
          const at = tau - louCtlKonamiAt(i);
          if (at < 0 || b.fired[i] === 3) return;
          if (!b.fired[i] && at >= LOU_CTL_PRESS.up) { b.fired[i] = 3; return; }   // a press a long frame skipped whole stays silent: a hitch never fires a burst of beeps
          if (!b.fired[i]) { b.fired[i] = 1; say('controllerPress:' + name); say('konamiBeep'); }
          if (at >= LOU_CTL_PRESS.hold && b.fired[i] === 1) { b.fired[i] = 2; say('controllerRelease'); }
          const m = part(name); if (m && !quiet) { pose(m, pressE(at), dir); light(name, pressE(at)); }   // pressE is 0 past `up`: this frame lands it home
          if (at >= LOU_CTL_PRESS.up) b.fired[i] = 3;
        });
      } },
      rumble: { ms: LOU_CTL_RUMBLE_PULSES[1][1] + 40, start() { say('controllerRumble'); }, frame(tau) {
        const p = LOU_CTL_RUMBLE_PULSES.find(([a, z]) => tau >= a && tau < z);
        const env = p ? Math.min(1, (tau - p[0]) / 30, (p[1] - tau) / 60) : 0;
        const j = () => (Math.random() * 2 - 1) * env;   // presentation only: kept off `rand` so the schedule never depends on frame rate
        inner.position.set(rest.pos.x + j() * LOU_CTL_RUMBLE.pos, rest.pos.y + Math.abs(j()) * LOU_CTL_RUMBLE.lift, rest.pos.z + j() * LOU_CTL_RUMBLE.pos);
        inner.rotation.set(rest.rot.x, rest.rot.y, rest.rot.z + j() * LOU_CTL_RUMBLE.rot);
      } },
      sticks: { ms: LOU_CTL_STICK_MS, frame(tau) {
        const env = Math.min(louSmooth(tau / 250), louSmooth((LOU_CTL_STICK_MS - tau) / 300));
        const th = 2 * Math.PI * LOU_CTL_STICK_TURNS * louSmooth(tau / LOU_CTL_STICK_MS), A = LOU_CTL_STICK_TILT * env;
        sticks.forEach((m, i) => { const s = i ? -1 : 1; tilt(m, A * Math.sin(s * th), A * Math.cos(s * th)); });
      } },
      pair: { ms: LOU_CTL_PAIR_MS, frame(tau) {
        const slot = LOU_CTL_PAIR_MS / (2 * faces.length);   // two laps
        faces.forEach((m, i) => {
          let e = 0; for (let lap = 0; lap < 2; lap++) e = Math.max(e, 1 - Math.abs(tau - (lap * faces.length + i + 0.5) * slot) / (slot * 1.4));
          m.material.emissiveIntensity = glowBase[i] + LOU_CTL_PAIR_GLOW * louSmooth(e);
        });
      } },
    };

    function pick() {
      const pool = LOU_CTL_BEATS.filter(b => b.kind === 'konami' || b.kind !== lastKind);
      let r = rand() * pool.reduce((s, b) => s + b.w, 0);
      for (const b of pool) { r -= b.w; if (r < 0) return b.kind; }
      return pool[pool.length - 1].kind;
    }
    function begin(kind, now) {
      home(); beat = { kind, t0: now, fired: [] }; lastKind = kind;
      if (RUN[kind].start) RUN[kind].start();
    }
    function drop(now) { if (beat) home(); beat = null; nextAt = now + between(LOU_CTL_FIRST_MS); }

    return {
      tick(now, dt, reduced) {
        const gap = last !== null && now - last > LOU_CTL_STOPPED_MS; last = now;
        if (nextAt === null || gap) { drop(now); return false; }
        if (!beat && now >= nextAt) {
          const kind = pick();
          if (!reduced || kind === 'konami') begin(kind, now);
          nextAt = now + between(LOU_CTL_GAP_MS);
          if (!beat) return false;
        }
        if (!beat) return false;
        const tau = now - beat.t0, run = RUN[beat.kind];
        if (tau >= run.ms) { home(); beat = null; return true; }   // exactly home, and one frame to show it
        run.frame(tau, beat, reduced);
        return true;   // even a reduced (sound-only) Konami: at the attract loop's 10 fps its beeps would lose their rhythm
      },
      /* Start a beat now — the debug hook and the harness's way in. */
      idle(kind, now) { if (RUN[kind]) begin(kind, now === undefined ? (last === null ? 0 : last) : now); },
      idleState: () => ({ kind: beat ? beat.kind : null, nextAt }),
    };
  }
  LOU_BUILDERS.controller = (ctx) => louBuildController(ctx.lib, ctx.design, ctx.ControllerBody, ctx.controllerParts, ctx);

  /* A rounded-rect PATH at an arbitrary centre — the hole version of
     lib.roundedRect, which always centres on the origin. The telly's screen
     aperture sits above the face's centre, and a Shape's curves cannot be
     translated after the fact. */
  function louRoundedPath(THREE, w, h, r, cx, cy) {
    const p = new THREE.Path(); const x = cx - w / 2, y = cy - h / 2; r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
    return p;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     The telly — "Bunny Beats", reshaped to the owner's rendered mockup
     (round 1, plan docs/superpowers/plans/2026-09-22-premium-prop-quality.md).

     TWO MASSES, NOT ONE. The mockup's side views show a fine seam a third of
     the way back: a proud front FACE capping a slightly smaller rear SHELL.
     Building it as one box is what made the first pass read as a lozenge with a
     picture stuck on it — and the seam is a customisation surface in its own
     right, so it has to be real geometry. The four colour sections are the
     controller's: shell (rear mass + feet), plate (front face + inner ears),
     ears, buttons (the two dials).

     Everything is ROUNDED, never chamfered-square: corner radius is a third of
     the height and the moulded bevel is heavy, front and back.

     Deliberately absent, per the owner: the rear outlet, the rear panel and its
     legend, and the rear breathing holes. The vents live on the LEFT flank —
     which is the side the wide preset's camera actually sees (camera x −0.05,
     telly x +0.16), exactly as the hero render frames it.

     Both dials survive the reshape: the mockup HAS knobs, so `tv-channel` (the
     only route to the dock, W6) and `tv-volume` (the only route to the sound
     overlay) keep their doors. No re-homing needed — § 5 of the plan is closed.
     ───────────────────────────────────────────────────────────────────────── */
  function louBuildTV(lib, design, opts = {}) {
    const { THREE, mats } = lib;
    const W = 0.58, H = 0.48, D = 0.40, FEET = 0.016;
    const FACE_D = 0.085, FACE_R = 0.155, FACE_BEV = 0.024;          // the proud front mass
    const SEAM = 0.024;                                              // how much the face overhangs the shell, total
    /* The shell reaches most of the way up to the face's back plane and its
       bevel is kept modest, or the rounded front edge curls away well before
       the junction and the face reads as a slab standing off the cabinet
       instead of capping it. It must still finish BEHIND the screen well. */
    const SH_W = W - SEAM, SH_H = H - SEAM, SH_D = D - FACE_D + 0.030, SH_BEV = 0.045;
    const APW = 0.40, APH = 0.295, AP_R = 0.045, SCR_Y = 0.035;      // screen aperture, offset up the face
    const GW = 0.38, GH = 0.275, GR = 1.05;                          // glass chord + its sphere radius
    const g = new THREE.Group();
    const cy = FEET + H / 2;                                          // body centre, so the feet rest on the group origin
    const faceZ = D / 2 - FACE_D / 2, poleZ = D / 2 - 0.008;          // glass front pole, just inside the face

    /* The prop half of the controller gap (plan § 1): same roughness and
       metalness as always, plus the bump map that was the whole difference. */
    /* COARSE and very shallow. ExtrudeGeometry's default UVs are raw x/y in
       metres on the caps but a compressed contour/depth pair on the bevel and
       side walls, so a fine repeat smears into vertical streaks exactly where
       the light catches the moulding. Big speckles, barely any scale: the point
       is that the plastic is not perfectly smooth, never a visible texture. */
    const BUMP = lib.tex.plasticBump(11, 11);
    /* The ears get their OWN instance at a much lower repeat: the swept lobe's
       UVs run 0..1 over its whole length, where the extruded parts' run in
       metres, so one repeat value cannot serve both — shared, the speckle came
       out three times finer on the ears than on the cabinet. */
    const EAR_BUMP = lib.tex.plasticBump(3, 3, 19);
    const shell   = lib.role('shell',   design.shell,   { bumpMap: BUMP, bumpScale: 0.0005 });
    const plate   = lib.role('plate',   design.plate,   { bumpMap: BUMP, bumpScale: 0.0005 });
    /* COLOUR FLIP (owner, 23 Sep): the outer lobe takes SHELL, the same role as
       the boss and the cabinet it grows out of — that is most of what makes the
       root junction read as one continuous form rather than a part bolted on.
       `ears` is now the INLAY, which is the piece that wants its own colour.
       The shade keeps it distinct on a default palette that paints both the
       same; it is mild, so a chosen ear colour still reads as itself. */
    const ears    = lib.role('shell',   design.shell,   { bumpMap: EAR_BUMP, bumpScale: 0.0004 });
    const earIn   = lib.role('ears',    design.ears,    { bumpMap: EAR_BUMP, bumpScale: 0.0003, side: THREE.DoubleSide }, 0.86);
    const buttons = lib.role('buttons', design.buttons, { roughness: .34 });

    // ── the rear shell. Kept plain by request; the heavy bevel does the rounding.
    g.add(louMesh(THREE, lib.moulded(SH_W, SH_H, SH_D, 0.145, { bevel: SH_BEV, curveSegments: 32, bevelSegments: 10, crease: 45 }),
      shell, 'body', [0, cy, -D / 2 + SH_D / 2]));

    /* ── the front face. An aperture, not a window: the bevel closes a hole in
       by bevelSize on each side, so the cut is that much oversize — the same
       correction the old bezel carried. */
    const faceShape = lib.roundedRect(W - 2 * FACE_BEV, H - 2 * FACE_BEV, FACE_R - FACE_BEV);
    faceShape.holes.push(louRoundedPath(THREE, APW + 2 * FACE_BEV, APH + 2 * FACE_BEV, AP_R + FACE_BEV, 0, SCR_Y));
    g.add(louMesh(THREE, lib.extrude(faceShape, FACE_D, FACE_BEV, { curveSegments: 30, bevelSegments: 9, crease: 30 }),
      plate, 'face', [0, cy, faceZ]));

    /* ── the dark inner bezel. A FRAME whose hole is a hair narrower than the
       glass chord, so its lip crosses the glass edge and the picture reads as
       recessed in a dark surround. A solid slab here would simply hide the
       screen — the failure the harness's raycast exists to catch. */
    const WELL_BEV = 0.003;
    const wellShape = lib.roundedRect(APW + 0.03 - 2 * WELL_BEV, APH + 0.03 - 2 * WELL_BEV, AP_R + 0.012 - WELL_BEV);
    wellShape.holes.push(louRoundedPath(THREE, GW - 0.006 + 2 * WELL_BEV, GH - 0.006 + 2 * WELL_BEV, 0.03 + WELL_BEV, 0, 0));
    g.add(louMesh(THREE, lib.extrude(wellShape, 0.035, WELL_BEV, { curveSegments: 30, bevelSegments: 6, crease: 25 }),
      mats.black, 'screenWell', [0, cy + SCR_Y, faceZ + 0.0105]));

    // ── the glass: a slice of a 1.05 m sphere, bulging toward the couch
    const phiL = GW / GR, thL = GH / GR;
    const screenGeo = new THREE.SphereGeometry(GR, 56, 42, Math.PI / 2 - phiL / 2, phiL, Math.PI / 2 - thL / 2, thL);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#dfeee4', emissive: '#ffffff', emissiveIntensity: 0.48, roughness: .25, metalness: 0 });
    if (opts.attractTexture) { screenMat.map = opts.attractTexture; screenMat.emissiveMap = opts.attractTexture; }
    const screen = louMesh(THREE, screenGeo, screenMat, 'screen', [0, cy + SCR_Y, poleZ - GR], null, false);
    louTag(screen, 'tv-screen'); g.add(screen);
    g.add(louMesh(THREE, new THREE.PlaneGeometry(GW - 0.02, GH - 0.017),
      new THREE.MeshBasicMaterial({ color: '#cfe9dc', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
      'screenGlow', [0, cy + SCR_Y, poleZ + 0.0035], null, false));

    /* ── the control strip. Left to right as the mockup runs it: the oval tuner,
       two decorative pips, the remote eye, the round volume knob. The two DIALS
       take the buttons role (they are the doors, and the owner's "the knobs are
       colour customisable"); the pips are 2 cm of fixed trim and keep the
       reference's confetti rather than collapsing into one flat row. */
    const STRIP = cy - 0.176, KNOB_Z = D / 2 + 0.006;
    function slot(len, wide, tilt) {   // the pale groove across a knob's crown
      const s = louMesh(THREE, new THREE.BoxGeometry(len, 0.005, wide), mats.cream, 'slot', [0, 0.0145, 0], [0, tilt, 0], false);
      return s;
    }
    const ovalGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.028, 30); ovalGeo.scale(1.7, 1, 1);
    const chan = louMesh(THREE, ovalGeo, buttons, 'tv-channel', [-0.10, STRIP, KNOB_Z], [Math.PI / 2, 0, 0]);
    chan.add(slot(0.044, 0.007, 0.35)); louTag(chan, 'tv-channel'); g.add(chan);
    const vol = louMesh(THREE, new THREE.CylinderGeometry(0.031, 0.033, 0.028, 32), buttons, 'tv-volume', [0.175, STRIP, KNOB_Z], [Math.PI / 2, 0, 0]);
    vol.add(slot(0.010, 0.036, 0)); louTag(vol, 'tv-volume'); g.add(vol);
    const pipGeo = new THREE.CylinderGeometry(0.0115, 0.0115, 0.016, 20);
    [['#9db8cf', -0.035], ['#f0a6b0', -0.002]].forEach(([hex, x], i) =>
      g.add(louMesh(THREE, pipGeo, new THREE.MeshStandardMaterial({ color: hex, roughness: .4, metalness: .04 }),
        'pip' + i, [x, STRIP, D / 2 + 0.002], [Math.PI / 2, 0, 0])));
    g.add(louMesh(THREE, new THREE.SphereGeometry(0.0095, 16, 12), mats.black, 'remoteEye', [0.10, STRIP, D / 2 + 0.001], null, false));

    /* ── the left flank's breathing slots. Dark boxes a fraction proud of the
       shell: at this scale a recess reads by its shadow, and a real cut would
       cost a hole in a moulded box for nothing. */
    for (let i = 0; i < 9; i++)
      g.add(louMesh(THREE, new THREE.BoxGeometry(0.004, 0.005, 0.075), mats.black,
        'vent' + i, [-SH_W / 2 + 0.0015, cy + 0.03 - i * 0.014, 0.02], null, false));

    /* ── the ears. Both STAND STRAIGHT (owner reference, 22 Sep): a long tapered
       almond rising from the shell's crown with only a slight outward lean —
       not the forward hook the first reshape gave them. The life comes from
       motion instead: the RIGHT ear flops over every few seconds and comes back
       (see the api's tick below), which is why it alone carries a second pose.

       Colour: the outer lobe is the `ears` role, the scooped inner is the
       `shell` role. That is deliberate and owner-set — the shell is barely
       visible from the couch (a sliver of one flank), so tying the ear's inner
       to it is what makes that quarter of the palette readable at all. */
    const EAR_PTS  = [[0, -0.075, -0.006], [0, 0.052, -0.004], [0, 0.146, 0.000],
                      [0, 0.237, 0.008], [0, 0.325, 0.016]];
    /* The root sinks 0.075 into the shell, not 0.045: the profile's flare is a
       fillet and must stay BELOW the crown, or it surfaces as a pair of thin fins
       either side of each ear. Every `t` in the profile and the inner-sheet range
       is a fraction of the WHOLE spine including that buried fifth, which is why
       the keys sit where they do. The inner sheet also stops well short of the
       tip: up there the lobe's scoop has faded out, so inner and outer coincide
       and the sheet's own lift surfaces as a dark spike through the lobe.

       The flop keeps the first THREE points of the upright spine — the lower
       half cannot drift — and folds the rest over at the same arc length, since
       an ear folds and does not stretch. Toward +x, i.e. outward for the right
       ear; a left-ear flop would need this mirrored. */
    const EAR_FLOP = [[0, -0.075, -0.006], [0, 0.052, -0.004], [0, 0.146, 0.000],
                      [0.064, 0.206, 0.025], [0.141, 0.175, 0.053]];
    /* SPOON, not a tube: narrow where it leaves the shell, bellying out through
       the middle, drawing back in toward the tip. A near-parallel profile is
       what made the previous pass read as a stalk. */
    /* CHIBI PROPORTIONS: slim in outline, fat in section. Two numbers do it and
       both were wrong before.
         · material at the centre = thick·(2 − scoop). At 0.087/1.66 that was
           30 mm in a 100 mm section — the lobe was 70% hollow, which is what
           read as paper-thin the moment it folded. 0.118/1.36 is 76 mm in a
           140 mm section: two and a half times the stock, and the dish is still
           66 mm deep because the section grew with it.
         · `thickBias` stops the thickness tapering as fast as the width, so the
           volume survives up at the tip where the fold actually happens. */
    const EAR_OPT  = { width: 0.072, thick: 0.118, scoop: 1.36, innerScoop: 1.33, thickBias: 0.55,
                       segments: 96, radial: 48, innerSegments: 64, innerRadial: 32,
                       /* An ELLIPSE, not keyframes. A bunny ear's outline is one,
                          and no interpolation of control points gets there — the
                          guesses BETWEEN the points are exactly what a silhouette
                          shows. `at` is where it is widest along the spine, `half`
                          its reach; the lower end pinches out under the boss and
                          the upper end IS the tip, closing itself. */
                       ellipse: { at: 0.56, half: 0.44, n: 2.05 },
                       /* HOLLOWED, not painted: the lobe's scoop is deep enough
                          that its two ridges stand well proud, and the inner
                          sheet sits almost on the bowl's floor (innerScoop only
                          a hair shallower, enough to win the depth test) so the
                          ear colour reads as a wall rising around it. */
                       scoopStart: 0.20, scoopFull: 0.42, scoopFrom: 0.88, scoopTo: 0.99,
                       /* CONCENTRIC: the inner's outline is the lobe's, inset by
                          a constant 17 mm, so it follows the ear instead of being
                          an egg of its own and the ear-colour band is even. */
                       innerMargin: 0.024, innerRoot: { from: 0.28, to: 0.58 },
                       innerT0: 0.20, innerT1: 1.0, innerLift: 0.0006 };
    /* A low boss under each root. A leaning tube meeting a FLAT plane is
       near-tangent on its downhill side, and that intersection reads as a thin
       fin no matter how deeply the root is buried — the fix is to give it a
       mound to come out of, not more burial. Same reason the controller carries
       a boss under each of its ears. Shell material: it is the cabinet swelling
       to meet the ear, not part of the ear. */
    let earFlop = null;
    [-1, 1].forEach(side => {
      const bossGeo = new THREE.SphereGeometry(0.092, 32, 20); bossGeo.scale(1, 0.21, 0.90);
      g.add(louMesh(THREE, bossGeo, shell, side < 0 ? 'earBossL' : 'earBossR',
        [side * 0.105, cy + SH_H / 2 - 0.010, -0.02]));
    });
    [-1, 1].forEach(side => {
      const ear = lib.bunnyEar(EAR_PTS, side > 0 ? Object.assign({ flop: EAR_FLOP }, EAR_OPT) : EAR_OPT);
      const e = new THREE.Mesh(ear.outer, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.castShadow = e.receiveShadow = true;
      /* Mounted a touch BELOW the crown: the lean tips the root's outer side
         up by about a centimetre, and anything the flare leaves above the
         shell surfaces as a fin. */
      e.position.set(side * 0.105, cy + SH_H / 2 - 0.018, -0.02);
      e.rotation.set(0, 0, -side * 0.09);
      e.userData.tipLocal = ear.tip.clone();
      if (ear.tipFlop) { e.userData.tipFlopLocal = ear.tipFlop.clone(); e.userData.earSpans = [ear.length, ear.lengthFlop]; }
      const inner = new THREE.Mesh(ear.inner, earIn); inner.name = 'inner'; inner.receiveShadow = true; e.add(inner);
      g.add(e);
      if (ear.flop) earFlop = ear.flop;
    });

    /* ── four low pads, just enough to lift it off the bench. Each hangs from a
       pivot at its TOP so the hop can splay it outward and down without moving
       where it meets the cabinet. */
    const FOOT_SPAN = 0.195, footPivots = [];
    [[-FOOT_SPAN, -0.125], [FOOT_SPAN, -0.125], [-FOOT_SPAN, 0.125], [FOOT_SPAN, 0.125]].forEach(([x, z], i) => {
      const pv = new THREE.Group(); pv.name = 'footPivot' + i; pv.position.set(x, FEET, z);
      pv.add(louMesh(THREE, lib.moulded(0.075, 0.055, FEET, 0.024, { bevel: 0.005, curveSegments: 20 }),
        shell, 'foot' + i, [0, -FEET / 2, 0], [Math.PI / 2, 0, 0]));
      g.add(pv); footPivots.push({ pv, side: x < 0 ? -1 : 1 });
    });

    /* Everything rides on a rig, so the whole telly can rock and hop while the
       GROUP origin stays exactly where LOU_PLACES rests it on the bench. */
    const rig = new THREE.Group(); rig.name = 'rig';
    while (g.children.length) rig.add(g.children[0]);
    g.add(rig);

    /* ── THE IDLE. Three beats, shuffled, so the telly reads as a creature that
       happens to be furniture rather than furniture with a tic:

         flop  the right ear folds over and comes back
         sway  a curious lean to the LEFT — the whole cabinet rocks about its
               left feet, so the right side lifts off the bench
         hop   a small quick bounce; the feet splay outward and down while it is
               airborne, the way legs do

       The order is shuffled and the gap between beats is random, but NEVER the
       same beat twice running — a fixed cycle is exactly what makes an idle read
       as a machine. The stream is a seeded LCG, never Math.random: two devices
       looking at the same lounge should not differ, and the harness needs the
       beat order reproducible.

       These run 400–1200 ms, past ui-style's 300 ms ceiling. That ceiling is
       about UI chrome feedback, where input is live the whole time; this is prop
       choreography, like the record's spin and the binder's cover.

       Reduced motion: all three sit at rest. Each beat is a LOOP whose end state
       is the telly as it already stands, so freezing them loses no information —
       unlike combReducedMotion(), where the end state carries a number. */
    const SWAY_RAD = 0.055, HOP_H = 0.028, HOP_TUCK = 0.34;
    const BEAT_MS = { flop: 960, sway: 1200, hop: 400 };
    const BEAT_NAMES = Object.keys(BEAT_MS);
    /* up / hold / back, the shape every beat but the hop uses */
    const seg = (e, up, hold, back) =>
      e < up ? louEaseOutCubic(e / up)
        : e < up + hold ? 1
          : e < up + hold + back ? 1 - louEaseOutCubic((e - up - hold) / back) : 0;
    let flopK = 0, swayK = 0, hopK = 0;
    let beat = null, beatT0 = null, beatAt = null, lastBeat = '', beatSeed = 20260922;
    const rnd = () => { beatSeed = (beatSeed * 1664525 + 1013904223) >>> 0; return beatSeed / 4294967296; };
    const gap = () => 2400 + rnd() * 2600;
    const pick = () => { const pool = BEAT_NAMES.filter(n => n !== lastBeat); return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]; };
    /* Sway and hop both write the rig, so one function owns it. The lift is what
       keeps the LEFT feet planted while it leans: rotating about the group origin
       alone would drive them through the bench. */
    function applyRig() {
      const a = SWAY_RAD * swayK;
      rig.rotation.z = a;
      rig.position.y = FOOT_SPAN * Math.sin(a) + HOP_H * hopK;
      /* NEGATIVE side: pushing off on your toes points the sole down and
         OUTWARD. The positive sign swings the pad's outer corner UP and drops
         the inner one, which reads as the feet turning in — the opposite
         gesture, and the reason this is written the long way round. */
      const tuck = HOP_TUCK * hopK;
      footPivots.forEach(f => { f.pv.rotation.z = -f.side * tuck; });
    }
    function rest() {
      if (!flopK && !swayK && !hopK) return;
      if (flopK && earFlop) earFlop.apply(0);
      flopK = swayK = hopK = 0; applyRig();
    }
    g.userData.api = {
      screen,
      tick(now, dt, reduced) {
        if (reduced) { rest(); beat = null; beatT0 = null; beatAt = null; return false; }
        if (beatAt === null) { beatAt = now + gap(); return false; }
        if (beat === null) { if (now < beatAt) return false; beat = lastBeat = pick(); beatT0 = now; }
        const e = now - beatT0, done = e >= BEAT_MS[beat];
        let k = 0;
        if (!done) {
          if (beat === 'flop') k = seg(e, 260, 400, 300);
          else if (beat === 'sway') k = seg(e, 340, 380, 480);
          else k = Math.sin(Math.PI * (e / BEAT_MS.hop));
        }
        if (beat === 'flop') { if (k !== flopK) { flopK = k; if (earFlop) earFlop.apply(k); } }
        else if (beat === 'sway') { swayK = k; applyRig(); }
        else { hopK = k; applyRig(); }
        if (done) { beat = null; beatT0 = null; beatAt = now + gap(); return false; }
        return true;
      },
      flopAmount: () => flopK,
      swayAmount: () => swayK,
      hopAmount:  () => hopK,
      currentBeat: () => beat,
    };
    return g;
  }
  LOU_BUILDERS.tv = (ctx) => louBuildTV(ctx.lib, ctx.design, { attractTexture: ctx.attractTexture });

  /* Pure: the rotation a spin ends on. Cartridge i sits at angle i·slot on the
     ring; spinner rotation θ = -k·slot brings k to the front. Always at least
     `turns` full turns forward, then the shortest forward distance. */
  function louSpinPlan(n, currentRot, targetIdx, turns = 3) {
    const TAU = Math.PI * 2, slot = TAU / n, want = -targetIdx * slot;
    let delta = ((want - currentRot) % TAU + TAU) % TAU; if (delta < 1e-9) delta = TAU;
    return { targetIdx, endRot: currentRot + turns * TAU + delta, durationMs: 1800 };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     The cartridge dial — reshaped to the owner's rendered mockup (round 2,
     plan docs/superpowers/plans/2026-09-22-premium-prop-quality.md).

     THE LID IS THE WHOLE IDEA. The greybox stood all twenty cartridges in a
     packed ring on an open cake, which reads as exactly what it is: a countable
     inventory. The mockup covers a little more than two thirds of the deck with
     a fixed lid and leaves one MOUTH open, so at any moment five or six games
     are out and the rest are simply somewhere under there. The owner's brief
     said the count should not be obvious; a lid is the only thing that hides it,
     and it costs nothing — the carousel underneath is unchanged and still holds
     one cartridge per game.

     So the prop is three masses, not one: a dished BASE, a SPINNER sunk into its
     well, and a fixed LID bridging over the top.

     Colour sections, owner-mapped (23 Sep 2026) — the same four roles the
     controller and the telly use:
       shell   → the body: base, stamped skirt, collar, lid, hub stack, button cap
       plate   → the raised bumps on the lid (ribs + mouth hood) AND the whole
                 right-hand wedge the readout sits on
       ears    → the spinning disc that holds the slots, and the slots themselves
       buttons → the centre star, its wordmark relief, and the readout's own bump
    (Re-mapped 23 Sep from the owner's colour-coded render. Worth reading as a
    rule rather than a list: each role now owns ONE readable mass, so a picked
    colour lands somewhere a player can point at.)
     The neon strip belongs to NONE of them. It is filled with the twenty games'
     own brand colours (lib.tex.spectrum), which is what the owner means by "our
     game colours will eventually fill it out" — one role colour there would
     throw all of that away.

     Deliberately absent, per the owner: the mockup's rear ports (charger, LAN,
     USB). The neon, which an earlier round had cut, is explicitly back.

     `dial` is still the one pick id and still the door that spins. The centre is
     a BUTTON in the sense the owner asked for — it presses in and rebounds as
     the spin's first beat — not a second pick node, so LOU_ACTIONS, the host
     contract and louSpinPlan are all untouched.
     ───────────────────────────────────────────────────────────────────────── */
  function louBuildDial(lib, design, games, stickerUrl) {
    const { THREE, mats } = lib; const g = new THREE.Group(); louTag(g, 'dial');
    const A = d => d * Math.PI / 180;

    /* Heights, bottom to top. Everything is ABSOLUTE in the group's own space —
       the spinner group sits at y = 0 and its parts carry real heights — because
       three masses interleaving vertically is impossible to keep straight in
       local offsets. The one clearance that matters: a cartridge's top (Y_DECK +
       CART_H) must clear the lid's underside (Y_LID), or the carousel grinds. */
    const Y_WELL = 0.024, Y_DECK = 0.033, Y_RIM = 0.044;
    /* The card is SHORTER and sits DEEPER (owner, round 2b): 30 mm of card with
       the bottom 10 mm swallowed by a 10 mm rail, so only 20 mm stands proud
       where 36 mm used to. That plus the shorter base is most of "much flatter"
       — the prop went 124 mm to 93 mm tall on an unchanged 391 mm span.
       CART_SEAT is how far up the holder the card starts, and it is part of the
       clearance sum: an earlier pass measured CART_H alone against the lid and
       left one millimetre, because the card also sat 3 mm up its rail. Card top
       = Y_DECK + CART_SEAT + CART_H, and that is what has to clear Y_LID. */
    const CART_W = 0.030, CART_H = 0.030, CART_D = 0.0065, CART_SEAT = 0, RAIL_H = 0.010;
    const Y_LID = 0.067, LID_D = 0.012, Y_LID_TOP = Y_LID + LID_D;
    const R_OUT = 0.174, R_DECK = 0.150, R_CART = 0.130;
    const R_HUB = 0.070, R_LID_IN = 0.086, R_LID_OUT = R_OUT + 0.003;
    // NOTE R_CART below leaves 5 mm between a card's outer corner and the collar wall.
    const R_CAP = 0.074, CAP_D = 0.015;
    /* The slot mouths the cartridges pass through, one at each end of the
       opening. See louSlotJamb below for why they are a doorway and not a wall
       with a hole in it. */
    /* The wall spans from the lid's inner edge (0.086) out to inside the collar
       (0.173), so it reads as the cabinet's END FACE with a slot in it. At 60 mm
       it stopped short of both and read as a loose plate standing in the gap. */
    const JAMB_W = 0.086, JAMB_AP_W = 0.026, JAMB_T = 0.007;
    const DISC_H = 0.0072, DISC_GAP = 0.0022;
    const Y_HUB = Y_DECK + 4 * DISC_H + 3 * DISC_GAP;          // 0.0866 — the cap's seat
    const PRESS = 0.005;                                        // how far the button sinks

    /* The mouth, in CARTRIDGE-ANGLE space: a = 0 is the front (+Z), +a swings
       toward +X. 108° open leaves 70% of the ring covered — the owner's "a
       little more than 2/3", measured off the mockup. Its centre is where a spin
       parks the winner, which is also roughly where the wide preset's camera
       sits (the dial is at x +0.62, the camera at x −0.05, so the room sees this
       prop from about −24°). */
    const MOUTH0 = A(-90), MOUTH1 = A(18), LAND = (MOUTH0 + MOUTH1) / 2;
    /* Shape space → world: louExtrude lays a shape in xy and extrudes along z;
       a mesh rotated −90° about X sends shape z to world y and shape y to world
       −z. So a shape point at angle φ lands at cartridge-angle φ + 90°. */
    const SH = a => a - Math.PI / 2;

    /* Surfaces. Same roughness/metalness as every prop; the bump map is the
       whole difference the plan's § 1 is about. Repeats are "tiles per metre" —
       ExtrudeGeometry's default UVs are raw x/y in metres. */
    const BUMP = lib.tex.plasticBump(13, 13);
    const shell    = lib.role('shell',   design.shell,   { bumpMap: BUMP, bumpScale: 0.0005 });
    const plate    = lib.role('plate',   design.plate,   { bumpMap: BUMP, bumpScale: 0.0005 });
    const ears     = lib.role('ears',    design.ears,    { bumpMap: BUMP, bumpScale: 0.0005 });
    const buttons  = lib.role('buttons', design.buttons, { bumpMap: BUMP, bumpScale: 0.0004, roughness: .44 });
    /* The stamped skirt is the BODY's colour now, not its own section — it is a
       texture on the shell, not a part. A LatheGeometry's and a CylinderGeometry's
       UVs run 0..1 around and 0..1 up, so this one repeats in TILES, not metres,
       and needs its own instance: the same split the telly's ears needed.
       84 tiles round a 1.09 m circumference against a 13 mm band = SQUARE tiles,
       and square is the whole requirement — stretched, the same canvas drew each
       motif at 20 x 5 mm and the band read as a dotted line rather than a stamp.
       Work the repeat out from the band's real aspect, never by eye. */
    const shellBand = lib.role('shell',  design.shell,   { bumpMap: lib.tex.motifBump(84, 1), bumpScale: 0.0026 });
    /* The wordmark is RELIEF, not ink: a colour map here would fight the
       `buttons` role and the owner's fourth colour section would stop working.
       "even if it cant be read at that font size" — so it is the light that
       reads it, which is exactly what a bump map is for. */
    const starInk  = lib.role('buttons', design.buttons, { bumpMap: lib.tex.textBump(['Little', 'Sylly'], 256, 256), bumpScale: 0.0034, roughness: .44 });

    /* The neon. One ribbon through all twenty brand hexes, used as BOTH map and
       emissiveMap over a white `emissive` — that is what makes it glow in its
       own colours instead of one tint. Not a design role, on purpose. */
    const SPECTRUM = lib.tex.spectrum(games.map(x => x.brandHex));
    /* 0.55 rather than the first pass's 0.8: over the spectrum map the higher
       value clipped the middle of the strip to flat white and the twenty brand
       colours only survived at its two ends — which is the one thing this strip
       exists to show. The SPIN value is what the owner asked to be noticeably
       stronger, so the gap between them is the effect, not the absolute. */
    const NEON_BASE = 0.55, NEON_SPIN = 1.9;
    const neonMats = [];
    function neonMat(extra) {
      const m = new THREE.MeshStandardMaterial(Object.assign({
        map: SPECTRUM, emissiveMap: SPECTRUM, emissive: '#ffffff',
        emissiveIntensity: NEON_BASE, roughness: .3, metalness: 0 }, extra || {}));
      neonMats.push(m); return m;
    }
    /* A per-material multiplier setNeon honours, so the stack keeps its level
       relative to the rim through the spin boost rather than catching up to it
       the first time anything brightens. */
    const louDim = (m, k) => { m.userData.louDim = k; return m; };

    /* ── the base: a dished lathe, not a cylinder. Its profile carries the
       stamped band's face, a recessed CHANNEL for the neon (light leaking out of
       a groove reads as a fitted strip; a band stuck on the outside reads as a
       sticker), the rounded rim, and the inner wall down to the well the spinner
       drops into. */
    const prof = [];
    const pt = (r, y) => prof.push(new THREE.Vector2(r, y));
    const corner = (cr, cy, rad, a0, a1, n = 7) => {
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; prof.push(new THREE.Vector2(cr + Math.cos(a) * rad, cy + Math.sin(a) * rad)); }
    };
    pt(0, 0); pt(R_OUT - 0.005, 0);
    corner(R_OUT - 0.005, 0.005, 0.005, -Math.PI / 2, 0);
    pt(R_OUT, 0.009); pt(R_OUT, 0.022);                       // the stamped band's face
    pt(R_OUT - 0.0055, 0.0250);                               // into the channel
    pt(R_OUT - 0.0075, 0.0275); pt(R_OUT - 0.0075, 0.0315);   // channel floor — the neon sits here
    pt(R_OUT - 0.0055, 0.0340); pt(R_OUT - 0.0005, 0.0365);   // back out
    corner(R_OUT - 0.005, 0.0390, 0.005, 0, Math.PI / 2);     // rim crown
    pt(R_DECK + 0.008, Y_RIM);
    corner(R_DECK + 0.008, Y_RIM - 0.0035, 0.0035, Math.PI / 2, Math.PI);
    pt(R_DECK + 0.004, 0.030); pt(R_DECK + 0.004, Y_WELL); pt(0, Y_WELL);
    g.add(louMesh(THREE, new THREE.LatheGeometry(prof, 80), shell, 'base', [0, 0, 0]));

    /* The stamped band and the neon are each a thin open cylinder a hair proud
       of the face behind them — cheap, and it keeps the base one lathe. */
    g.add(louMesh(THREE, new THREE.CylinderGeometry(R_OUT + 0.0006, R_OUT + 0.0006, 0.013, 96, 1, true),
      shellBand, 'skirtBand', [0, 0.0155, 0], null, false));
    g.add(louMesh(THREE, new THREE.CylinderGeometry(R_OUT - 0.0068, R_OUT - 0.0068, 0.0042, 96, 1, true),
      neonMat({ side: THREE.DoubleSide }), 'neonRing', [0, 0.0295, 0], null, false));
    /* The bloom: a slightly larger additive sleeve that writes no depth, so the
       strip has a halo instead of a hard edge. Never a caster. */
    g.add(louMesh(THREE, new THREE.CylinderGeometry(R_OUT + 0.0018, R_OUT + 0.0018, 0.010, 96, 1, true),
      neonMat({ transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      'neonGlow', [0, 0.0295, 0], null, false));

    /* ── the spinner. Sunk into the well so only the deck's rim and the hub show
       above the base — the carousel reads as part of the machine, not a tray
       sitting on it. */
    const spinner = new THREE.Group(); spinner.name = 'spinner'; g.add(spinner);
    const deck = [];
    deck.push(new THREE.Vector2(0, Y_WELL + 0.001), new THREE.Vector2(R_DECK - 0.006, Y_WELL + 0.001));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI * i / 8;
      deck.push(new THREE.Vector2(R_DECK - 0.006 + Math.cos(a) * 0.006,
        (Y_WELL + 0.001 + Y_DECK) / 2 + Math.sin(a) * ((Y_DECK - Y_WELL - 0.001) / 2))); }
    deck.push(new THREE.Vector2(R_DECK - 0.006, Y_DECK), new THREE.Vector2(0, Y_DECK));
    spinner.add(louMesh(THREE, new THREE.LatheGeometry(deck, 72), ears, 'deck', [0, 0, 0]));

    /* The hub: four stacked plates with the neon showing between them. In the
       mockup this is the one place the light is INSIDE the machine rather than
       around it, and it is the only thing that makes a spin readable when every
       cartridge happens to be under the lid. */
    for (let k = 0; k < 4; k++) {
      const y0 = Y_DECK + k * (DISC_H + DISC_GAP), r = R_HUB - k * 0.0018, p = [];
      p.push(new THREE.Vector2(0, y0), new THREE.Vector2(r - 0.003, y0));
      for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + Math.PI * i / 6;
        p.push(new THREE.Vector2(r - 0.003 + Math.cos(a) * 0.003, y0 + DISC_H / 2 + Math.sin(a) * (DISC_H / 2))); }
      p.push(new THREE.Vector2(r - 0.003, y0 + DISC_H), new THREE.Vector2(0, y0 + DISC_H));
      spinner.add(louMesh(THREE, new THREE.LatheGeometry(p, 56), shell, 'hub' + k, [0, 0, 0]));
      /* Dimmer than the rim by design: this one is glimpsed between plates,
         where the rim is an open channel, and at matching intensity the stack
         read as candy stripes instead of a lit seam. */
      if (k < 3) spinner.add(louMesh(THREE, new THREE.CylinderGeometry(r - 0.0030, r - 0.0030, DISC_GAP + 0.0012, 56, 1, true),
        louDim(neonMat({ side: THREE.DoubleSide, emissiveIntensity: NEON_BASE * 0.7 }), 0.7), 'hubNeon' + k, [0, y0 + DISC_H + DISC_GAP / 2, 0], null, false));
    }

    /* ── the cartridges. One per game, evenly round the full ring; the LID is
       what hides most of them, not a shorter list. Base angle LAND + i·slot, so
       the spinner's rest rotation −k·slot (louSpinPlan, untouched) parks
       cartridge k at LAND — the middle of the mouth. */
    const n = games.length, slot = Math.PI * 2 / n, REST = Y_DECK;
    const cartGeo = lib.moulded(CART_W, CART_H, CART_D, 0.004, { bevelSegments: 3, curveSegments: 10 });
    const railGeo = lib.moulded(CART_W + 0.008, 0.011, RAIL_H, 0.0026, { bevelSegments: 3, curveSegments: 8 });
    const glowGeo = lib.moulded(CART_W + 0.016, 0.019, 0.0024, 0.004, { bevelSegments: 2, curveSegments: 8 });
    const cartridges = games.map((game, i) => {
      const a = LAND + i * slot, cg = new THREE.Group();
      cg.name = 'cart-' + game.id; cg.userData.gameId = game.id; cg.userData.restY = REST;
      cg.position.set(Math.sin(a) * R_CART, REST, Math.cos(a) * R_CART); cg.rotation.y = a;
      /* The holder and its light. Each slot glows in ITS OWN game's colour — the
         same idea as the rim strip, one cartridge at a time. Tagged so setNeon
         can boost it at a lower level than the strip without a second list. */
      const glow = new THREE.MeshStandardMaterial({ color: game.brandHex, emissive: game.brandHex,
        emissiveIntensity: NEON_BASE * 1.05, roughness: .35, transparent: true, opacity: .92, depthWrite: false });
      glow.userData.louSlotGlow = true; neonMats.push(glow);
      cg.add(louMesh(THREE, glowGeo, glow, 'cartGlow', [0, 0.0012, 0], [-Math.PI / 2, 0, 0], false));
      cg.add(louMesh(THREE, railGeo, ears, 'cartRail', [0, RAIL_H / 2, 0], [-Math.PI / 2, 0, 0]));
      cg.add(louMesh(THREE, cartGeo, new THREE.MeshStandardMaterial({ color: game.brandHex, roughness: .5, metalness: .04, bumpMap: BUMP, bumpScale: 0.0004 }),
        'cartBody', [0, CART_SEAT + CART_H / 2, 0]));
      const labelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6, transparent: true }); const url = stickerUrl(game.id); if (url) labelMat.userData.louImage = url;   // unlisted → the plain white label
      /* Centred on what is VISIBLE, not on the card: the rail now swallows the
         bottom third, and a label centred on the card puts a third of the
         sticker inside the holder. */
      cg.add(louMesh(THREE, new THREE.PlaneGeometry(0.017, 0.017), labelMat, 'cartLabel',
        [0, CART_SEAT + (RAIL_H + CART_H) / 2, CART_D / 2 + 0.0004], null, false));
      spinner.add(cg); return cg;
    });

    /* ── the lid. An annular sector with the mouth cut out of it: the outer arc
       runs the LONG way round from the mouth's far lip, the inner arc comes
       back. Above every cartridge and below nothing — it is the top of the prop
       apart from the button and the housing. */
    const lidShape = new THREE.Shape();
    lidShape.absarc(0, 0, R_LID_OUT, SH(MOUTH1), SH(MOUTH0) + Math.PI * 2, false);
    lidShape.absarc(0, 0, R_LID_IN, SH(MOUTH0) + Math.PI * 2, SH(MOUTH1), true);
    lidShape.closePath();
    const lidGeo = lib.extrude(lidShape, LID_D, 0.0035, { center: false, curveSegments: 44, bevelSegments: 5, crease: 30 });
    lidGeo.rotateX(-Math.PI / 2);
    g.add(louMesh(THREE, lidGeo, shell, 'lid', [0, Y_LID + 0.0035, 0]));

    /* ── the collar, and it is the part that makes the lid a LID.
       Without it the lid is a flying saucer on nothing: a 32 mm band of open
       air runs right round between the base's rim and the lid's underside, and
       every cartridge the lid is there to hide is plainly visible through it
       from any seat in the room. A pure side view is the only thing that shows
       this — from above, and from the hero three-quarter, the lid looked
       finished. (Plan § 1: review a prop in the view that exposes the defect.)
       So the machine's outer WALL rises over exactly the covered arc and stops
       at the mouth, which is what turns the mouth from a gap in a disc into an
       opening cut in a shell. It overhangs the rim by 3 mm, deliberately: that
       shadow line is the seam between the two masses, the same trick the
       telly's proud front face uses. */
    /* DERIVED from the rim, never a literal. Flattening the base moved Y_RIM
       from 54.5 to 44 mm and a hardcoded 0.050 left the collar starting 6 mm
       ABOVE it — a band of open air right round, with the cartridges showing
       through it, which is precisely the defect the collar was added to fix.
       When one feature has to follow another, derive it from that feature. */
    const COLLAR_Y = Y_RIM - 0.005, R_COLLAR_IN = 0.152;
    /* Collar and lid END TOGETHER. An earlier pass ran the collar 6° past the
       lid to put solid wall under the hood, which worked — and then buried the
       near slot mouth behind that extra wall, so one end of the carousel showed
       an opening and the other showed a blank. The hood now sits on the lid
       instead (see below), which needs no lip, and both ends read alike. */
    const collarShape = new THREE.Shape();
    collarShape.absarc(0, 0, R_LID_OUT, SH(MOUTH1), SH(MOUTH0) + Math.PI * 2, false);
    collarShape.absarc(0, 0, R_COLLAR_IN, SH(MOUTH0) + Math.PI * 2, SH(MOUTH1), true);
    collarShape.closePath();
    const collarGeo = lib.extrude(collarShape, Y_LID - COLLAR_Y + 0.004, 0.0030, { center: false, curveSegments: 44, bevelSegments: 4, crease: 30 });
    collarGeo.rotateX(-Math.PI / 2);
    g.add(louMesh(THREE, collarGeo, shell, 'collar', [0, COLLAR_Y + 0.0030, 0]));

    /* Ribs — the mockup's raised spokes. Placed across the covered arc, never
       over the mouth: a rib hanging in the opening would read as a broken lid. */
    const ribGeo = lib.moulded(0.082, 0.030, 0.010, 0.012, { bevelSegments: 5, curveSegments: 16 });
    [78, 158, 238].forEach((deg, i) => {
      const a = A(deg), r = 0.130;
      g.add(louMesh(THREE, ribGeo, plate, 'rib' + i, [Math.sin(a) * r, Y_LID_TOP - 0.0015, Math.cos(a) * r], [-Math.PI / 2, 0, -a]));
    });
    /* The hood over the mouth's leading lip — the mockup's rectangular overhang,
       the thing a cartridge visibly slides under. Centred 6° INSIDE the lid, so
       the lid carries all but the last ~15 mm of it and only that last bit
       overhangs the opening: a hood, not a diving board. */
    const HOOD_A = MOUTH0 - A(6);
    g.add(louMesh(THREE, lib.moulded(0.058, 0.034, 0.013, 0.011, { bevelSegments: 5, curveSegments: 16 }),
      plate, 'hood', [Math.sin(HOOD_A) * R_CART, Y_LID_TOP - 0.001, Math.cos(HOOD_A) * R_CART], [-Math.PI / 2, 0, -HOOD_A]));

    /* ── the slot mouths. A cartridge used to rotate straight into a solid end
       face at each side of the opening, which reads as the carousel grinding
       into the cabinet. Each end now carries a DOORWAY the card visibly passes
       through, which is also what the reference has: a dark aperture with a thin
       frame, one card halfway into it.

       Sized off the card's swept CROSS-SECTION, not its outline. A cartridge
       travels tangentially, so what has to fit through is its depth (6.5 mm) by
       its height — and the widest thing on the sled is the glow plate's 19 mm of
       RADIAL spread, not the card's 30 mm of width, which runs along the
       direction of travel and never touches the frame. Hence a 26 mm aperture in
       a 60 mm wall: a slot, not a hole.

       The frame is open at the BOTTOM on purpose (louSlotJamb draws an arch, not
       a rectangle with a hole). The rail and its light sit on the spinning deck
       and sweep through at deck level, so any bottom rail on a FIXED wall would
       be a part the carousel grinds against. */
    /* JAMB_Y is the wall's UNDERSIDE, half a millimetre clear of the spinning
       deck. louExtrude with center:false starts the geometry at −bevel, so the
       mesh sits that much higher again — get this wrong by two millimetres and
       a fixed wall is embedded in a part that turns. */
    const JAMB_BEV = 0.0012, JAMB_Y = Y_DECK + 0.0005;
    const jambGeo = lib.extrude(louSlotJamb(THREE, JAMB_W, (Y_LID + 0.004) - JAMB_Y, JAMB_AP_W, (Y_DECK + CART_H + 0.003) - JAMB_Y),
      JAMB_T, JAMB_BEV, { center: false, curveSegments: 8, bevelSegments: 3, crease: 32 });
    /* Two degrees INSIDE the covered arc, not two degrees into the opening. The
       first placement put both walls in the mouth itself, where each stood in
       open air with no lid above it and read as a loose panel; tucked just under
       the lid's edge, the lid overhangs the slot and it reads as a mouth cut
       into the cabinet. Either way a cartridge comes to rest 2° off it, so one
       card is always caught halfway through — which is the reference's pose. */
    [MOUTH0 - A(2), MOUTH1 + A(2)].forEach((a, i) =>
      g.add(louMesh(THREE, jambGeo, shell, 'jamb' + i,
        [Math.sin(a) * R_CART, JAMB_Y + JAMB_BEV, Math.cos(a) * R_CART], [0, a - Math.PI / 2, 0])));

    /* ── the display housing. The wedge is the `plate` section (the owner's
       green); the raised block the readout sits in is `buttons` (the yellow),
       paired with the star. */
    /* Its inner radius is the COLLAR's, not something smaller. At 0.096 the
       wedge was a solid block standing in the cartridge corridor for 60° of arc
       — every card swept straight through it, and the far slot mouth was buried
       inside it. It is part of the cabinet WALL, so it starts where the wall
       does; the lid covers everything inboard of that. (A latent bug, not a new
       one: it dates from the greybox and no harness could see it, because
       nothing measured a moving part against a fixed one.) */
    const HA = A(50), housing = new THREE.Shape();
    housing.absarc(0, 0, 0.205, SH(A(20)), SH(A(80)), false);
    housing.absarc(0, 0, R_COLLAR_IN, SH(A(80)), SH(A(20)), true);   // 2 mm clear of the spinning deck's rim
    housing.closePath();
    /* It reaches ABOVE the lid, not up to it. At lid height the block and the
       lid are one continuous pale mass and the readout sits in the seam between
       them, which is where the first pass put it — invisible from the couch and
       almost invisible from straight down. */
    const HOUSE_TOP = Y_LID_TOP + 0.005;
    /* Seated at y = the bevel, not below it: louExtrude with center:false runs
       local z from −bevel, so placing this at 0.008 with a 0.010 bevel sank the
       block 2 mm THROUGH the table. A builder's group origin is its resting
       base — the footprint check reads the box, not the intent. */
    const houseGeo = lib.extrude(housing, HOUSE_TOP, 0.010, { center: false, curveSegments: 32, bevelSegments: 5, crease: 32 });
    houseGeo.rotateX(-Math.PI / 2);
    g.add(louMesh(THREE, houseGeo, plate, 'housingBase', [0, 0.010, 0]));
    g.add(louMesh(THREE, lib.moulded(0.100, 0.052, 0.016, 0.013, { bevelSegments: 5, curveSegments: 18 }),
      buttons, 'housingBump', [Math.sin(HA) * 0.177, HOUSE_TOP, Math.cos(HA) * 0.177], [-Math.PI / 2, 0, -HA]));

    /* ── the readout. DARK UNTIL A GAME IS LOADED, per the owner: no slot number,
       no year, no idle chatter — a blank panel, then one name. `emissive` is the
       switch, so the off state costs nothing and reads as genuinely off. */
    const DISP_Y = HOUSE_TOP + 0.0085;
    g.add(louMesh(THREE, lib.moulded(0.072, 0.032, 0.004, 0.005, { bevelSegments: 3, curveSegments: 10 }),
      mats.black, 'displayWell', [Math.sin(HA) * 0.177, DISP_Y - 0.001, Math.cos(HA) * 0.177], [-Math.PI / 2, 0, -HA], false));
    const dispMat = new THREE.MeshStandardMaterial({ color: '#0b0e14', emissive: '#0b0e14', emissiveIntensity: 0, roughness: .5, metalness: 0 });
    g.add(louMesh(THREE, new THREE.PlaneGeometry(0.062, 0.024), dispMat, 'display',
      [Math.sin(HA) * 0.177, DISP_Y + 0.0018, Math.cos(HA) * 0.177], [-Math.PI / 2, 0, -HA], false));

    /* ── the button: circle, star, wordmark, in that order, exactly as the owner
       described it. It is a GROUP so the press is one y tween over the lot. It
       sits 4 mm proud of the lid inside a 14 mm collar of open well, which is
       what gives "indents further" something to indent into. */
    const button = new THREE.Group(); button.name = 'button'; g.add(button);
    const cap = [];
    cap.push(new THREE.Vector2(0, Y_HUB), new THREE.Vector2(R_CAP - 0.006, Y_HUB));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI * i / 8;
      cap.push(new THREE.Vector2(R_CAP - 0.006 + Math.cos(a) * 0.006, Y_HUB + CAP_D / 2 + Math.sin(a) * (CAP_D / 2))); }
    cap.push(new THREE.Vector2(R_CAP - 0.006, Y_HUB + CAP_D), new THREE.Vector2(0, Y_HUB + CAP_D));
    button.add(louMesh(THREE, new THREE.LatheGeometry(cap, 64), shell, 'buttonCap', [0, 0, 0]));
    /* TILT, never a half turn. The first pass spun the badge by π to point a
       spike away from the camera and mirrored the wordmark doing it: a shape
       laid flat by rotateX(−π/2) maps local +y to world −z, so it reads the
       right way round from the couch at rotation 0 and INSIDE OUT at π — and a
       five-point star is not symmetric under a half turn, so the badge and its
       lettering cannot be rotated independently to fix it. −12° is a tilt the
       mockup has anyway, and it is small enough to keep the text upright. */
    const STAR_SPIN = A(-12), STAR_Y = Y_HUB + CAP_D - 0.0008, STAR_D = 0.0070;
    const starGeo = lib.extrude(louStarShape(THREE, 0.0555, 0.0262, 5, 0.26), STAR_D, 0.0020, { center: false, curveSegments: 10, bevelSegments: 6, crease: 40 });
    button.add(louMesh(THREE, starGeo, buttons, 'star', [0, STAR_Y, 0], [-Math.PI / 2, 0, STAR_SPIN]));
    /* The wordmark's own face: the SAME star a hair inset and a hair proud, so
       the relief lands inside the badge and nowhere else. ShapeGeometry hands
       out raw metre UVs like everything else — uvFit is what puts the text in
       the middle of the badge instead of in one texel of it. */
    const starFace = lib.uvFit(new THREE.ShapeGeometry(louStarShape(THREE, 0.0508, 0.0240, 5, 0.26), 10));
    button.add(louMesh(THREE, starFace, starInk, 'starText', [0, STAR_Y + STAR_D - 0.0009, 0], [-Math.PI / 2, 0, STAR_SPIN], false));

    /* After a spin lands, the dial holds still long enough for the chosen
       cartridge to be read and for the camera to push into the telly (the
       scene waits 250 ms, then a 600 ms tween). Resuming the idle drift the
       instant the tween ends slides the winner off the front while the player
       is still looking at it. */
    const HOLD_MS = 2000, RISE = 0.010;
    let rot = 0, driftPauseUntil = 0, risen = null, spinning = null, lastNow = 0; const motion = louMotion();
    function setNeon(v) {
      neonMats.forEach(m => { m.emissiveIntensity = v * (m.userData.louSlotGlow ? 1.05 : m.userData.louDim || 1); });
    }
    /* The press. One tween down, one back — the owner's "indents further", and
       the beat the click sound lands on. Under reduced motion it is skipped
       outright rather than shortened: nothing should travel. */
    function press(instant) {
      if (instant) return;
      motion.add(0, -PRESS, 90, louEaseOutCubic, v => button.position.y = v,
        () => motion.add(-PRESS, 0, 260, louEaseOutBack, v => button.position.y = v));
    }
    const api = {
      spinner, cartridges, button, isSpinning: () => !!spinning,
      /* Blank is genuinely blank — no texture, no glow. The panel only ever says
         one thing, and only after a spin. */
      setDisplay(text) {
        const old = dispMat.map; const s = String(text === undefined || text === null ? '' : text);
        dispMat.map = s ? lib.tex.label(s, '#0d1117', '#8affc0', 256, 96) : null;
        dispMat.emissive.set(s ? '#39d98a' : '#0d1117');
        dispMat.emissiveIntensity = s ? 0.75 : 0;
        dispMat.needsUpdate = true; if (old) old.dispose();
      },
      press,
      rise(k, instant) {
        if (risen !== null && risen !== k) { const prev = cartridges[risen]; motion.add(prev.position.y, REST, 200, louEaseOutCubic, v => prev.position.y = v); }
        const c = cartridges[k]; risen = k;
        if (instant) c.position.y = REST + RISE; else motion.add(c.position.y, REST + RISE, 200, louEaseOutBack, v => c.position.y = v);
        api.setDisplay(games[k].gameName);
      },
      spin(rand, opt = {}) {
        if (spinning) return spinning;
        const k = Math.min(n - 1, Math.floor(rand() * n));
        /* Reduced motion: show the result, skip the journey (spec § 11). Not
           tracked as `spinning` — there is no tween to guard against. */
        if (opt.instant) { rot = -k * slot; spinner.rotation.y = rot; setNeon(NEON_BASE); api.rise(k, true); return Promise.resolve(games[k].id); }
        press(false);
        driftPauseUntil = Infinity;
        /* The strip brightens for the length of the spin and settles back as the
           winner rises — the owner's "noticeably stronger while spinning". It
           rides the same tween list as everything else, so it cannot outlive a
           tick, and it needs no timer of its own. */
        motion.add(NEON_BASE, NEON_SPIN, 260, louEaseOutCubic, setNeon);
        const plan = louSpinPlan(n, rot, k);
        spinning = new Promise(res => {
          motion.add(rot, plan.endRot, plan.durationMs, louEaseOutCubic, v => { rot = v; spinner.rotation.y = v; },
            () => {
              motion.add(NEON_SPIN, NEON_BASE, 420, louEaseOutCubic, setNeon);
              api.rise(k); spinning = null; driftPauseUntil = lastNow + HOLD_MS; res(games[k].id);
            });
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
  LOU_BUILDERS.dial = (ctx) => louBuildDial(ctx.lib, ctx.design, ctx.games, id => { const s = (ctx.stickers.list || []).find(x => x.id === id); return s ? ctx.stickers.base + s.image : null; });   // only what the manifest lists: no guessed file, no 404

  /* An ARCH, not a rectangle with a hole: `w` x `h` overall with a `apW` x `apH`
     opening rising from the bottom edge, so the shape has no bottom rail at all.
     That is the whole reason it is not a `holes.push()` — the dial's slot mouths
     are fixed and the cartridge sled sweeps through them at deck level, so a
     bottom rail would be a part the carousel grinds against. Drawn in
     (radial, height); the caller stands it up with rotation.y = a − π/2. */
  function louSlotJamb(THREE, w, h, apW, apH, r = 0.004) {
    const s = new THREE.Shape(), hw = w / 2, aw = apW / 2;
    s.moveTo(-hw, 0);
    s.lineTo(-hw, h - r);   s.quadraticCurveTo(-hw, h, -hw + r, h);
    s.lineTo(hw - r, h);    s.quadraticCurveTo(hw, h, hw, h - r);
    s.lineTo(hw, 0);
    s.lineTo(aw, 0);
    s.lineTo(aw, apH - r);  s.quadraticCurveTo(aw, apH, aw - r, apH);
    s.lineTo(-aw + r, apH); s.quadraticCurveTo(-aw, apH, -aw, apH - r);
    s.lineTo(-aw, 0);
    s.closePath(); return s;
  }

  /* `round` (0..~0.5) cuts every vertex with a quadratic through it, turning the
     sharp star into the soft blob star the dial's mockup has. 0 is the old
     shape exactly, which is what the binder's little star still asks for —
     a bevel alone cannot do this: it rounds the EDGE of the extrusion, not the
     outline, so a sharp point stays a sharp point in silhouette. */
  function louStarShape(THREE, R, r, n = 5, round = 0) {
    const s = new THREE.Shape(), N = n * 2, pts = [];
    for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    if (!round) {
      pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
      s.closePath(); return s;
    }
    const k = Math.min(round, 0.49);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const start = lerp(pts[0], pts[1], k); s.moveTo(start[0], start[1]);
    for (let i = 1; i <= N; i++) {
      const cur = pts[i % N], nxt = pts[(i + 1) % N], prev = pts[i - 1];
      const inb = lerp(prev, cur, 1 - k), out = lerp(cur, nxt, k);
      s.lineTo(inb[0], inb[1]); s.quadraticCurveTo(cur[0], cur[1], out[0], out[1]);
    }
    s.closePath(); return s;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     The cat jukebox — reshaped to the owner's rendered mockup (prop-quality
     round 3, plan docs/superpowers/plans/2026-09-22-premium-prop-quality.md).

     NOT A JAR. The greybox was a see-through cylinder on a thin ring; the
     mockup is an opaque lavender TUB with a WINDOW cut in its front — the back
     ~200° of the record band is solid wall, and only the front is glass. Its
     parts, bottom to top: a base with a fillet, a wall band carrying the
     window, a round bezel ring at the head's rim, and a tall superellipse
     head. The window's bottom edge STEPS UP round the screen tab, and the
     frame follows it — which is why the hole, the frame and the faceplate are
     all one corner list (`WIN`) run through lib.roundPoly at three offsets,
     then bent round the body with lib.bend. Derived, so they cannot drift.

     THE RECORDS ARE SPOKES, not a stack. They stand on edge in a ring round a
     central column, each in the plane of its own radius — which is why the
     one dead ahead reads as a thin sliver and the ones either side show their
     faces, exactly as the mockup has it. Ten of them, labelled in the games'
     brand colours — and relabelled behind the back wall as they turn, so the
     magazine holds every game without ever holding them all at once.

     Colour sections, owner-mapped 23 Sep 2026 (the mockup's own colours are
     ignored — the design roles paint it):
       shell    the main body — base, wall band, head (and its interior)
       plate    the "face": the window frame, the bezel ring, eyes and nose
       ears     the ears and the pads they stand on
       buttons  the control faceplate (the panel under the screen)
     The five transport buttons and the screen keep the mockup's own colours.

     DOORS (owner, 23 Sep): "clicking the jukebox itself (anywhere) will be the
     door to the feature". So `jukebox-knob` — the id is kept, the knob is
     gone — tags the whole BODY, and a tap bops the prop instead of twisting a
     part that no longer exists. `jukebox-record` stays on the carousel
     (music.next), the one live door; the carousel is a child of the body, so
     hovering either lifts what should lift. The GLASS is deliberately outside
     both: were it pickable, every tap on a record would land on the glass in
     front of it and open the wrong door.
     ───────────────────────────────────────────────────────────────────────── */
  function louBuildJukebox(lib, design, games, sfx) {
    const { THREE, mats } = lib;
    const say = name => { if (typeof sfx === 'function') { try { sfx(name); } catch (_) {} } };
    const g = new THREE.Group();
    const R = 0.118, WALL = 0.004;                                   // body radius, wall thickness
    const FIL = 0.009, Y_BASE = 0.050;                                // the base: bottom fillet, top
    const Y_FLOOR = 0.051, Y_T = 0.176;                               // the record bay: floor, ceiling
    const Y_RING0 = 0.172, RING_H = 0.010;                            // the bezel ring at the head's rim
    const Y_HEAD0 = 0.180, HH = 0.128, HEAD_N = 2.8;                  // head: rim, height, superellipse n
    /* The window, in (arc length at R, height). It spans ±78°, so from the
       couch — which sits ~15° to its right — the right-hand post lands near the
       silhouette, as in the mockup. VB/VT are the opening's bottom and top; the
       notch is where it steps up round the screen tab. */
    const HW = R * 78 * Math.PI / 180, VB = 0.066, VT = 0.174;
    const TW = 0.052, VTAB = 0.084;
    const RW = 0.020, RN0 = 0.006, RN1 = 0.012;                       // corner radii: window, notch foot, notch top
    const WIN = [[-HW, VB, RW], [-TW, VB, RN0], [-TW, VTAB, RN1], [TW, VTAB, RN1],
                 [TW, VB, RN0], [HW, VB, RW], [HW, VT, RW], [-HW, VT, RW]];
    /* The frame is the window offset OUT by FW and IN by FIN — the overhang is
       what hides the wall's cut edge. The faceplate tucks TUCK under the frame,
       so its top edge is the window offset by FW − TUCK: derived, never tuned. */
    const FW = 0.007, FIN = 0.002, FRAME_D = 0.0065, FRAME_BEV = 0.0022;
    const TUCK = 0.0015, FP_D = 0.0055, FP_BEV = 0.002, FP_W = 0.090, FP_Y0 = 0.010;
    /* THE CAROUSEL. Clearance is a SUM (plan § 1): the record's inner edge is
       RC − RR = 20 mm, against an 11 mm column, and its outer edge 100 mm
       against glass at R − 5 mm = 113 mm. The corridor raycast in the harness
       is the claim; this comment is only the arithmetic behind it. The deck
       sits LOW, so the holder's top is under the window's bottom rail and the
       records drop out of sight behind it, as the mockup's do. */
    const COL_R = 0.011, DECK_R = 0.104, DECK_H = 0.006, HOLD_H = 0.007, SINK = 0.004;
    const RR = 0.040, RC = 0.060, REC_T = 0.0016, LABEL_R = 0.0135, N_REC = 10;
    const REC_Y = Y_FLOOR + DECK_H + HOLD_H - SINK + RR;
    const SPIN = 0.3;                                                 // rad/s — a magazine turning, not 33 rpm

    /* Bump maps. Bent parts keep ExtrudeGeometry's UVs in METRES, so repeat is
       tiles per metre (the telly's 11/m). A lathe's UVs run 0..1 round the
       circumference and up the profile, so it needs its own repeat. */
    const BUMP = lib.tex.plasticBump(11, 11), LATHE_BUMP = lib.tex.plasticBump(8, 2.2, 13), EAR_BUMP = lib.tex.plasticBump(1.4, 0.8, 19);
    const B = (map, s) => ({ bumpMap: map, bumpScale: s });
    const shell   = lib.role('shell', design.shell, B(BUMP, 0.0005));
    const shellL  = lib.role('shell', design.shell, B(LATHE_BUMP, 0.0005));
    const shellIn = lib.role('shell', design.shell, B(LATHE_BUMP, 0.0004), 0.80);   // the bay's floor/ceiling/column
    const plate   = lib.role('plate', design.plate, B(BUMP, 0.0004));
    const plateL  = lib.role('plate', design.plate, B(LATHE_BUMP, 0.0004));
    const eyeMat  = lib.role('plate', design.plate, { emissive: design.plate, emissiveIntensity: 0.7, roughness: .22 });
    eyeMat.userData.louEmissive = true;
    const ears    = lib.role('ears', design.ears, B(EAR_BUMP, 0.0004));
    const earIn   = lib.role('ears', design.ears, Object.assign(B(EAR_BUMP, 0.0003), { side: THREE.DoubleSide }), 0.82);
    const face    = lib.role('buttons', design.buttons, B(BUMP, 0.0005));

    const body = new THREE.Group(); body.name = 'body'; louTag(body, 'jukebox-knob');
    const add = (parent, geo, mat, name, pos, rot, cast) => { const m = louMesh(THREE, geo, mat, name, pos || [0, 0, 0], rot, cast); parent.add(m); return m; };

    // ── the base: a solid of revolution with a filleted foot
    const baseProf = [new THREE.Vector2(0.0001, 0)];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI / 2; baseProf.push(new THREE.Vector2(R - FIL + Math.cos(a) * FIL, FIL + Math.sin(a) * FIL)); }
    baseProf.push(new THREE.Vector2(R, Y_BASE + 0.001));
    add(body, new THREE.LatheGeometry(baseProf, 128), shellL, 'base');

    /* ── the wall band: the whole circumference, with the window cut through
       it. Columns, not an extruded shape (lib.holedBand) — the frame covers the
       cut edge, so the wall need only get the hole's outline right. */
    add(body, lib.holedBand(WIN, R, WALL, Y_BASE, Y_T), shell, 'wall');

    /* ── the frame round the window (plate): a moulded band swept along the
       window's own outline, from FIN inside it to FW outside, FRAME_D proud,
       its top edges rounded over. A ribbon, not an extrusion — see lib. */
    add(body, lib.bend(lib.ribbon(WIN, lib.roundSection(-FIN, FW, FRAME_D, FRAME_BEV, 5), 0.003, 12), R, { crease: 55 }), plate, 'frame');

    // ── the bezel ring at the head's rim (the mockup's part 3), a lathed rounded section
    const ringProf = lib.roundPoly([[R - 0.006, Y_RING0, 0.0015], [R + 0.0055, Y_RING0, 0.004], [R + 0.0055, Y_RING0 + RING_H, 0.004], [R - 0.006, Y_RING0 + RING_H, 0.0015]], 0, 0.002);
    ringProf.push(ringProf[0].clone());
    add(body, new THREE.LatheGeometry(ringProf, 128), plateL, 'ring');

    // ── the bay: floor, ceiling and the fixed column the carousel turns round
    add(body, new THREE.CircleGeometry(R - WALL, 96).rotateX(-Math.PI / 2), shellIn, 'floor', [0, Y_FLOOR, 0], null, false);
    add(body, new THREE.CircleGeometry(R - WALL, 96).rotateX(Math.PI / 2), shellIn, 'ceiling', [0, Y_T - 0.001, 0], null, false);
    add(body, new THREE.CylinderGeometry(COL_R, COL_R, Y_T - Y_FLOOR, 40, 1, true), shellIn, 'column', [0, (Y_FLOOR + Y_T) / 2, 0]);

    /* ── the head: a SUPERELLIPSE of revolution, written down rather than keyed
       (plan § 1). n 2.4 is fuller than a hemisphere through the shoulders —
       the mockup's head is a capsule top, and a sphere read as a bald dome. */
    const headAt = (t) => new THREE.Vector2(R * Math.pow(Math.cos(t), 2 / HEAD_N), HH * Math.pow(Math.sin(t), 2 / HEAD_N));
    const headProf = []; for (let i = 0; i <= 72; i++) headProf.push(headAt((i / 72) * Math.PI / 2));
    headProf[72].x = 0.0001;
    add(body, new THREE.LatheGeometry(headProf, 128), shellL, 'head', [0, Y_HEAD0, 0]);
    /* The head as a FUNCTION, so the face and the ear pads sit on it exactly.
       F = (ρ/R)^n + (h/HH)^n is homogeneous of degree n, so the point on the
       surface along any ray from the rim's centre is one power away — no
       search. The normal is ∇F. */
    const O = new THREE.Vector3(0, Y_HEAD0, 0);
    function onHead(dir) {
      const d = dir.clone().normalize(), rho = Math.hypot(d.x, d.z), h = Math.max(d.y, 1e-6);
      const t = Math.pow(Math.pow(rho / R, HEAD_N) + Math.pow(h / HH, HEAD_N), -1 / HEAD_N);
      const p = O.clone().addScaledVector(d, t), pr = Math.hypot(p.x, p.z) || 1e-9, ph = Math.max(p.y - Y_HEAD0, 1e-9);
      const gr = HEAD_N * Math.pow(pr, HEAD_N - 1) / Math.pow(R, HEAD_N), gh = HEAD_N * Math.pow(ph, HEAD_N - 1) / Math.pow(HH, HEAD_N);
      return { p, n: new THREE.Vector3(gr * p.x / pr, gh, gr * p.z / pr).normalize() };
    }
    // a point on the head at azimuth `az` (0 = straight ahead), `h` above its rim
    function headPoint(az, h) {
      const rr = R * Math.pow(1 - Math.pow(Math.min(h / HH, 0.999), HEAD_N), 1 / HEAD_N);
      return onHead(new THREE.Vector3(Math.sin(az) * rr, h, Math.cos(az) * rr));
    }
    // orient an object so local +z is `n` and local +y is as close to `up` as allows
    function faceAlong(obj, n, up = new THREE.Vector3(0, 1, 0)) {
      const z = n.clone().normalize(), y = up.clone().addScaledVector(z, -up.dot(z)).normalize(), x = new THREE.Vector3().crossVectors(y, z);
      obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    }

    /* ── the face (owner round 3b: "as cat-like as possible").
       EYES are glowing lenses — taller than wide, like a cat's — each with two
       white glints so they read as wet and alive rather than as buttons. Each
       also carries a hidden SMILE: the closed, happy ∩ of a cat's slow blink
       (the owner's reference), its inner end dipping toward the nose. The
       smile beat squashes the lens shut and swaps the arc in — the cartoon
       blink, which reads from the couch where a lid sliding down would not.
       The NOSE is a cat's: a soft inverted triangle with a rounded top, puffy
       and well proud. Under it, a short philtrum and an ω mouth. */
    const EYE_A = 0.0128 * 0.90, EYE_B = 0.0128 * 1.10, EYE_C = 0.0128 * 0.40, EYE_SINK = 0.0015;
    const eyeGeo = new THREE.SphereGeometry(0.0128, 40, 24); eyeGeo.scale(0.90, 1.10, 0.40);
    const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    /* a point ON the lens, in its own frame — where a glint has to sit */
    const onLens = (u, v, lift) => new THREE.Vector3(u * EYE_A, v * EYE_B, EYE_C * Math.sqrt(Math.max(0, 1 - u * u - v * v)) + lift);
    const tube = (pts, r, name) => {
      const grp = new THREE.Group(); grp.name = name;
      const curve = new THREE.CatmullRomCurve3(pts);
      const body_ = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 10, false), null); body_.name = name + 'Line'; grp.add(body_);
      [pts[0], pts[pts.length - 1]].forEach((p, i) => { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), null); c.name = name + 'End' + i; c.position.copy(p); grp.add(c); });
      return grp;
    };
    const painted = (grp, mat) => { grp.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.receiveShadow = true; } }); return grp; };
    const eyes = [];
    [-1, 1].forEach(side => {
      const s = headPoint(side * 0.44, 0.056), inward = -side;   // local +x is the viewer's right
      const pivot = new THREE.Group(); pivot.name = side < 0 ? 'eyePivotL' : 'eyePivotR';
      pivot.position.copy(s.p).addScaledVector(s.n, -EYE_SINK); faceAlong(pivot, s.n); body.add(pivot);
      const lens = add(pivot, eyeGeo, eyeMat, side < 0 ? 'eyeL' : 'eyeR', null, null, false);
      [[-0.38, 0.40, 0.0026], [0.30, -0.36, 0.0012]].forEach(([u, v, r], i) => {
        const gl = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10).scale(1, 1, 0.3), glintMat);
        gl.name = 'glint' + i; gl.position.copy(onLens(u, v, 0.0002)); lens.add(gl);
      });
      /* The arc sits ON the head (the lens centre is sunk EYE_SINK), bowing
         back with the head's own curvature so its ends do not float. */
      const zAt = (xx) => EYE_SINK + 0.0007 - (xx * xx) / (2 * 0.105);
      const bez = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-inward * 1.05 * EYE_A, -0.05 * EYE_B, 0), new THREE.Vector3(-inward * 0.55 * EYE_A, 0.90 * EYE_B, 0),
        new THREE.Vector3(inward * 0.50 * EYE_A, 0.90 * EYE_B, 0), new THREE.Vector3(inward * 1.05 * EYE_A, -0.45 * EYE_B, 0));
      const arcPts = bez.getPoints(16).map(p => p.setZ(zAt(p.x)));
      const smile = painted(tube(arcPts, 0.0021, side < 0 ? 'smileL' : 'smileR'), eyeMat);
      smile.visible = false; pivot.add(smile);
      eyes.push({ lens, smile });
    });
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-0.0085, 0.0065);
    noseShape.quadraticCurveTo(0, 0.0088, 0.0085, 0.0065);                            // a rounded top
    noseShape.quadraticCurveTo(0.0118, 0.0058, 0.0097, 0.0024);
    noseShape.bezierCurveTo(0.0070, -0.0022, 0.0032, -0.0072, 0.0011, -0.0088);         // down to a soft point
    noseShape.quadraticCurveTo(0, -0.0097, -0.0011, -0.0088);
    noseShape.bezierCurveTo(-0.0032, -0.0072, -0.0070, -0.0022, -0.0097, 0.0024);
    noseShape.quadraticCurveTo(-0.0118, 0.0058, -0.0085, 0.0065);
    { const s = headPoint(0, 0.037);
      const nose = add(body, lib.extrude(noseShape, 0.008, 0.0028, { curveSegments: 16, bevelSegments: 6 }), plate, 'nose', null, null, false);
      nose.position.copy(s.p).addScaledVector(s.n, 0.0008); faceAlong(nose, s.n); }
    const MOUTH_H = 0.0225, mouthMat = lib.role('plate', design.plate, { roughness: .45 }, 0.72);
    { const s = headPoint(0, MOUTH_H), mouth = new THREE.Group(); mouth.name = 'mouth';
      mouth.position.copy(s.p); faceAlong(mouth, s.n); body.add(mouth);
      const zAt = (xx) => 0.0009 - (xx * xx) / (2 * 0.118), r = 0.0042;
      const lobe = (dir) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = -Math.PI * i / 14; pts.push(new THREE.Vector3(dir * (r - r * Math.cos(a)), r * Math.sin(a) + 0.0006 * (i === 14 ? 1 : 0), 0)); } return pts.map(p => p.setZ(zAt(p.x))); };
      mouth.add(painted(tube(lobe(-1), 0.0011, 'mouthL'), mouthMat));
      mouth.add(painted(tube(lobe(1), 0.0011, 'mouthR'), mouthMat));
      mouth.add(painted(tube([new THREE.Vector3(0, 0.0058, zAt(0)), new THREE.Vector3(0, 0.0028, zAt(0)), new THREE.Vector3(0, 0, zAt(0))], 0.0011, 'philtrum'), mouthMat)); }

    /* ── the ears, each on a PAD that hugs the head. The pad is not a separate
       lump pushed into the shell: it is the head's own surface lifted along its
       own normal, with a superellipse edge — so it follows the curvature
       exactly and meets it on a clean rim, which is the "swappable ear set"
       seam the mockup draws. Built in the TANGENT PLANE at the ear's root and
       projected back on, because up near the crown azimuth lines converge and
       an ellipse in (azimuth, height) would pinch. */
    const PAD_A = 0.050, PAD_B = 0.036, PAD_H = 0.005, PAD_NR = 18, PAD_NA = 64;
    function earPad(centre) {
      const n0 = centre.n, tq = new THREE.Vector3(0, 1, 0).addScaledVector(n0, -n0.y).normalize(), tp = new THREE.Vector3().crossVectors(tq, n0);
      const pos = [], uv = [], idx = [];
      const lift = (rho) => PAD_H * Math.pow(Math.max(0, 1 - Math.pow(rho, 6)), 1 / 3) - 0.0006;
      const vert = (rho, a) => {
        const q = centre.p.clone().addScaledVector(tp, PAD_A * rho * Math.cos(a)).addScaledVector(tq, PAD_B * rho * Math.sin(a));
        const s = onHead(q.sub(O)); const v = s.p.addScaledVector(s.n, lift(rho));
        pos.push(v.x, v.y, v.z); uv.push(0.5 + 0.5 * rho * Math.cos(a), 0.5 + 0.5 * rho * Math.sin(a));
      };
      vert(0, 0);
      for (let i = 1; i <= PAD_NR; i++) for (let j = 0; j <= PAD_NA; j++) vert(Math.pow(i / PAD_NR, 0.7), (j / PAD_NA) * Math.PI * 2);
      /* (tp, tq, n0) is right-handed, so α increasing is ANTICLOCKWISE seen
         from outside the head — centre → α_j → α_j+1 is the winding that
         faces the pad away from it. */
      for (let j = 0; j < PAD_NA; j++) idx.push(0, 1 + j, 2 + j);
      for (let i = 1; i < PAD_NR; i++) for (let j = 0; j < PAD_NA; j++) {
        const a = 1 + (i - 1) * (PAD_NA + 1) + j, b = a + PAD_NA + 1;
        idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    /* A CAT ear, from the same crescent sweep as the telly's bunny ears
       (lib.bunnyEar): short, wide at the root, tapering to a rounded point —
       a keyed profile, because this outline is a triangle, not an ellipse. The
       scoop is the ear's hollow front; the inner sheet is the same role a
       shade darker, the mockup's two-part ear without a second colour. */
    const EAR_PTS = [[0, -0.012, 0.000], [0, 0.014, -0.001], [0, 0.036, 0.001], [0, 0.056, 0.007]];
    const EAR_OPT = { width: 0.033, thick: 0.021, scoop: 1.36, innerScoop: 1.33, thickBias: 0.7,
                      profile: [[0, 1.04], [0.22, 1.0], [0.55, 0.70], [0.80, 0.42]],
                      segments: 72, radial: 40, innerSegments: 48, innerRadial: 24,
                      scoopStart: 0.14, scoopFull: 0.32, scoopFrom: 0.72, scoopTo: 0.96,
                      innerMargin: 0.0045, innerRoot: { from: 0.16, to: 0.36 },
                      innerT0: 0.15, innerT1: 0.95, innerLift: 0.0004 };
    [-1, 1].forEach(side => {
      /* Pulled in toward the crown (owner round 3b: closer together, more cat). */
      const root = headPoint(side * 55 * Math.PI / 180, HH * 0.84);
      const pad = add(body, earPad(root), ears, side < 0 ? 'earPadL' : 'earPadR'); pad.castShadow = true;
      const ear = lib.bunnyEar(EAR_PTS, EAR_OPT);
      const e = add(body, ear.outer, ears, side < 0 ? 'earL' : 'earR');
      /* Up leans OUTWARD about 24° and no further forward than the world's —
         taken from the head's normal it pitched the ears toward the couch once
         they moved in round the crown. The hollow faces forward and a touch
         outward, which is where the couch is. */
      const up = new THREE.Vector3(side * 0.36, 0.8, -0.04).normalize();
      const fwd = new THREE.Vector3(side * 0.12, 0, 1).addScaledVector(up, -new THREE.Vector3(side * 0.12, 0, 1).dot(up)).normalize();
      e.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, fwd), up, fwd));
      e.position.copy(root.p).addScaledVector(root.n, PAD_H * 0.5);
      const inner = new THREE.Mesh(ear.inner, earIn); inner.name = 'inner'; inner.receiveShadow = true; e.add(inner);
    });

    /* ── the control faceplate (buttons role): a wide band carrying the five
       transport buttons, with a tab rising into the window for the screen.
       Its top edge is the window's outline offset by FW − TUCK, spelled out as
       corners because only part of that outline is the plate's. */
    const TWf = TW - FW + TUCK, FP_TOP = VB - FW + TUCK, TAB_T = VTAB - FW + TUCK;
    const FP = [[-FP_W, FP_Y0, 0.012], [FP_W, FP_Y0, 0.012], [FP_W, FP_TOP, 0.008], [TWf, FP_TOP, RN0 + FW - TUCK],
                [TWf, TAB_T, RN1 - FW + TUCK], [-TWf, TAB_T, RN1 - FW + TUCK], [-TWf, FP_TOP, RN0 + FW - TUCK], [-FP_W, FP_TOP, 0.008]];
    add(body, lib.bend(lib.extrude(new THREE.Shape(lib.roundPoly(FP, -FP_BEV)), FP_D, FP_BEV, { center: false, smooth: false, bevelSegments: 5 }), R, { z0: FP_BEV, crease: 40 }), face, 'faceplate');
    /* The screen: a dark lens a hair proud of the plate, and the picture on it.
       PlaneGeometry's own 0..1 UVs survive the bend, so the canvas lands whole. */
    const SCR_Y = 0.052, SCR_W = 0.068, SCR_H = 0.034;
    const lens = lib.roundPoly([[-SCR_W / 2 - 0.003, SCR_Y - SCR_H / 2 - 0.003, 0.005], [SCR_W / 2 + 0.003, SCR_Y - SCR_H / 2 - 0.003, 0.005],
                                [SCR_W / 2 + 0.003, SCR_Y + SCR_H / 2 + 0.003, 0.005], [-SCR_W / 2 - 0.003, SCR_Y + SCR_H / 2 + 0.003, 0.005]], -0.0006);
    add(body, lib.bend(lib.extrude(new THREE.Shape(lens), 0.0016, 0.0006, { center: false, smooth: false }), R, { z0: FP_D - 0.0004, crease: 40 }), mats.black, 'screenLens', null, null, false);
    const scrGeo = new THREE.PlaneGeometry(SCR_W, SCR_H, 24, 1); scrGeo.translate(0, SCR_Y, 0);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.85, roughness: .3, metalness: 0 });
    const screen = add(body, lib.bend(scrGeo, R, { z0: FP_D + 0.0014, smooth: false }), screenMat, 'screen', null, null, false);
    /* Five transport buttons in the mockup's own pastels — the owner kept these
       out of the design roles. Left to right as the owner lists them: play /
       pause, back, next, volume down, volume up. Decorative this round: they
       come alive in the full-size jukebox view the feature will open. */
    const BTN = [['playpause', '#f4cf6a', '#8a6a1c'], ['prev', '#ee8fa6', '#9c3d55'], ['next', '#8fd3c4', '#2f7a6c'],
                 ['down', '#b2dc9a', '#4f7f3a'], ['up', '#8fb4ea', '#3a5d99']];
    const btnGeo = lib.uvFit(lib.extrude(new THREE.Shape().absarc(0, 0, 0.0078 - 0.0015, 0, Math.PI * 2, false), 0.0045, 0.0015, { curveSegments: 32, bevelSegments: 5 }));
    BTN.forEach(([kind, bg, ink], i) => {
      const a = ((i - 2) * 0.0215) / R, r = R + FP_D + 0.0012;
      const m = add(body, btnGeo, new THREE.MeshStandardMaterial({ map: lib.tex.icon(kind, bg, ink), roughness: .38, metalness: .04 }),
        'button' + i, [Math.sin(a) * r, 0.022, Math.cos(a) * r], [0, a, 0]);
      m.userData.kind = kind;
    });

    /* ── the carousel: the moving part. A deck, a low holder ring the records
       sink into, and ten records standing as spokes — the plane of each is
       its own radius, so its axis is the TANGENT (local x, turned to azimuth φ
       by the record's own group). */
    const carousel = new THREE.Group(); carousel.name = 'carousel'; louTag(carousel, 'jukebox-record');
    add(carousel, new THREE.CylinderGeometry(DECK_R, DECK_R, DECK_H, 96), shellIn, 'deck', [0, Y_FLOOR + DECK_H / 2, 0]);
    const holdProf = lib.roundPoly([[COL_R + 0.009, 0, 0.002], [DECK_R - 0.004, 0, 0.002], [DECK_R - 0.004, HOLD_H, 0.003], [COL_R + 0.009, HOLD_H, 0.003]], 0, 0.012);
    holdProf.push(holdProf[0].clone());
    add(carousel, new THREE.LatheGeometry(holdProf, 64), shellL, 'holder', [0, Y_FLOOR + DECK_H, 0]);
    /* Matte enough to stay BLACK: at roughness .32 the room's environment washed every record to mid grey. */
    const vinyl = new THREE.MeshStandardMaterial({ color: '#0a0a0d', roughness: .42, metalness: 0, envMapIntensity: .35, bumpMap: lib.tex.grooveBump(), bumpScale: 0.0008 });
    const LABEL_BUMP = lib.tex.labelBump();
    const recGeo = new THREE.CylinderGeometry(RR, RR, REC_T, 72), labGeo = new THREE.CylinderGeometry(LABEL_R, LABEL_R, REC_T + 0.0005, 40);
    /* TEN records, but EVERY game (owner round 3b, 23 Sep): "just like our
       cartridges, as long as it keeps spinning it can have the illusion of all
       the games." Twenty read as a solid fan, so the carousel stays at ten, and
       a record is RELABELLED with the next game each time it passes the back of
       the bay, behind solid wall where nobody can see it change. The ten labels
       are therefore a sliding window over the games list — no two alike while
       there are at least ten games — and a game added to the box turns up on a
       record with no edit here at all. */
    const pool = (games && games.length) ? games : [{ id: 'none', brandHex: '#ffffff' }];
    let cursor = 0;
    const nextGame = () => pool[cursor++ % pool.length];
    const records = [];
    for (let i = 0; i < N_REC; i++) {
      const gm = nextGame();
      const holder = new THREE.Group(); holder.name = 'record' + i; holder.rotation.y = (i / N_REC) * Math.PI * 2;
      holder.userData.gameId = gm.id;
      add(holder, recGeo, vinyl, 'vinyl', [0, REC_Y, RC], [0, 0, Math.PI / 2]);
      add(holder, labGeo, new THREE.MeshStandardMaterial({ color: gm.brandHex, roughness: .55, bumpMap: LABEL_BUMP, bumpScale: 0.0006 }), 'label', [0, REC_Y, RC], [0, 0, Math.PI / 2], false);
      carousel.add(holder); records.push(holder);
    }
    /* Which lap past the BACK (azimuth π) each record is on. A record changes
       label when this goes up — i.e. only while it is directly behind the
       column, with the solid back wall between it and the room. */
    const lapOf = (h) => Math.floor((carousel.rotation.y + h.rotation.y - Math.PI) / (Math.PI * 2));
    const laps = records.map(lapOf);
    function relabel() {
      records.forEach((h, i) => {
        const L = lapOf(h); if (L <= laps[i]) return; laps[i] = L;
        const gm = nextGame(); h.userData.gameId = gm.id; h.getObjectByName('label').material.color.set(gm.brandHex);
      });
    }
    body.add(carousel);

    /* ── the glass: a curved pane just inside the wall, wider than the window
       so its edges are held behind solid wall. Casts no shadow (a drum of solid
       black on the bench is exactly how the greybox stopped reading as glass)
       and is NOT under `body`, so it is never a pick target — see the header. */
    const glassGeo = new THREE.PlaneGeometry(2 * HW + 0.02, Y_T - Y_BASE, 64, 1); glassGeo.translate(0, (Y_T + Y_BASE) / 2, 0);
    const glass = louMesh(THREE, lib.bend(glassGeo, R, { z0: -WALL - 0.001, smooth: false }), mats.glass, 'glass', [0, 0, 0], null, false);
    glass.receiveShadow = false;

    const rig = new THREE.Group(); rig.name = 'rig'; rig.add(body, glass); g.add(rig);

    /* ── the singing notes: a small pool of ♪ and ♫, parked hidden at the
       mouth. They live on the GROUP, not the rig, so the rocking that goes with
       the song does not swing them about. Fixed candy colours, no role —
       like the transport buttons. */
    const noteShapes = (beamed) => {
      const head = (x, y) => { const s = new THREE.Shape(); s.absellipse(x, y, 0.0056, 0.0040, 0, Math.PI * 2, false, -0.35); return s; };
      const bar = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; };
      if (!beamed) {
        const flag = new THREE.Shape(); flag.moveTo(0.0045, 0.0215);
        flag.bezierCurveTo(0.0095, 0.0190, 0.0135, 0.0135, 0.0105, 0.0065);
        flag.bezierCurveTo(0.0112, 0.0118, 0.0082, 0.0150, 0.0045, 0.0160); flag.closePath();
        return [head(0, 0), bar(0.0040, 0.0008, 0.0058, 0.0215), flag];
      }
      const beam = new THREE.Shape(); beam.moveTo(0.0040, 0.0185); beam.lineTo(0.0178, 0.0210); beam.lineTo(0.0178, 0.0250); beam.lineTo(0.0040, 0.0225); beam.closePath();
      return [head(0, 0), head(0.0138, 0.0025), bar(0.0040, 0.0008, 0.0058, 0.0225), bar(0.0160, 0.0033, 0.0178, 0.0250), beam];
    };
    const noteGeo = [false, true].map(b => { const ge = new THREE.ExtrudeGeometry(noteShapes(b), { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 3, curveSegments: 16 }); ge.center(); return ge; });
    const NOTE_HEX = ['#ff5c9d', '#ffb627', '#22c4a2', '#4aa3ff', '#a86bff'];
    const mouthAt = headPoint(0, MOUTH_H), NOTE_FROM = mouthAt.p.clone().addScaledVector(mouthAt.n, 0.012);
    const notes = NOTE_HEX.map((hex, i) => {
      const m = new THREE.Mesh(noteGeo[i % 2], new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.22, roughness: .4, transparent: true }));
      m.name = 'note' + i; m.visible = false; m.castShadow = false; m.position.copy(NOTE_FROM); m.scale.setScalar(0.01); g.add(m);
      return m;
    });

    /* ── the screen's picture: one canvas, one texture, repainted in place.
       A placeholder by the owner's word — the real one arrives with the
       jukebox/karaoke feature. It moves while music plays, ~10 fps. */
    const scrCanvas = lib.makeCanvas(256, 128), scrTex = new THREE.CanvasTexture(scrCanvas);
    scrTex.encoding = THREE.sRGBEncoding; screenMat.map = scrTex; screenMat.emissiveMap = scrTex;
    let playing = false, title = '', waveAt = -1;
    function paint(t) { lib.tex.drawWave(scrCanvas, title, playing, t || 0); scrTex.needsUpdate = true; }
    paint(0);

    /* ── THE IDLE (owner round 3b): three beats, shuffled, never the same one
       twice running — the telly's pattern (DD-20), seeded, so two devices agree
       and the harness can reproduce it.
         smile  the slow blink: eyes squash shut into happy ∩ arcs, the head
                tips a little, and they open again
         sing   notes float out of its mouth while it rocks side to side
         roll   it tips onto its bottom rim and rolls round it once, like a
                coin settling — the contact point travels the whole rim
       All three are loops that end where they began, so under reduced motion
       the jukebox simply sits at rest and nothing is lost.
       ONE function owns the rig. Every tilt is a rotation about the point of
       the base's rim that is touching the bench, so the jukebox rolls ON the
       rim and never through the bench or off it. The pivot is on the fillet,
       not the rim's corner: the fillet is what actually meets the table. */
    const BEAT_MS = { smile: 1700, sing: 3000, roll: 2600 };
    const BEAT_NAMES = Object.keys(BEAT_MS);
    const ROLL_TILT = 0.14, SING_TILT = 0.045, SMILE_TILT = 0.05, BOP_MS = 340, BOP_H = 0.008;
    const ease = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    let tiltX = 0, tiltZ = 0, hopY = 0, beat = null, beatT0 = null, beatAt = null, lastBeat = '', beatSeed = 20260923;
    let bopT0 = null, bopping = false;
    const rnd = () => { beatSeed = (beatSeed * 1664525 + 1013904223) >>> 0; return beatSeed / 4294967296; };
    const gap = () => 2600 + rnd() * 2800;
    const pick = () => { const p = BEAT_NAMES.filter(n => n !== lastBeat); return p[Math.min(p.length - 1, Math.floor(rnd() * p.length))]; };
    const UP = new THREE.Vector3(0, 1, 0), qTmp = new THREE.Quaternion(), vTmp = new THREE.Vector3();
    function applyRig() {
      const th = Math.hypot(tiltX, tiltZ);
      rig.quaternion.identity(); rig.position.set(0, hopY, 0);
      if (th < 1e-9) return;
      const d = new THREE.Vector3(tiltX / th, 0, tiltZ / th);
      qTmp.setFromAxisAngle(new THREE.Vector3().crossVectors(UP, d).normalize(), th);
      const p = d.clone().multiplyScalar(R - FIL + FIL * Math.sin(th)); p.y = FIL - FIL * Math.cos(th);
      rig.quaternion.copy(qTmp);
      rig.position.copy(p).sub(vTmp.copy(p).applyQuaternion(qTmp)); rig.position.y += hopY - p.y;
    }
    function setEyes(shut) {   // 0 open … 1 fully the smile
      eyes.forEach(({ lens, smile }) => {
        const squash = Math.min(1, shut * 2), arc = Math.max(0, shut * 2 - 1);
        lens.visible = squash < 1; lens.scale.y = Math.max(0.06, 1 - squash);
        smile.visible = arc > 0; smile.scale.setScalar(0.6 + 0.4 * louEaseOutBack(arc));
      });
    }
    function notesAt(e) {
      notes.forEach((m, i) => {
        const born = 150 + i * 430, life = 1350, u = (e - born) / life;
        if (u <= 0 || u >= 1) { m.visible = false; return; }
        const dir = i % 2 ? 1 : -1;
        m.visible = true;
        m.position.set(NOTE_FROM.x + dir * (0.02 + 0.05 * u) + 0.008 * Math.sin(u * 9 + i),
                       NOTE_FROM.y + 0.11 * louEaseOutCubic(u), NOTE_FROM.z + 0.02 * u);
        m.rotation.set(0, 0, dir * -0.25 + 0.3 * Math.sin(u * 7 + i));
        m.scale.setScalar(0.6 + 0.4 * Math.min(1, u / 0.2));
        m.material.opacity = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
      });
    }
    function rest() {
      tiltX = tiltZ = 0; setEyes(0); notesAt(-1); applyRig();
    }
    function runBeat(name, e) {
      const T = BEAT_MS[name], p = Math.min(1, e / T);
      tiltX = tiltZ = 0;
      if (name === 'smile') {
        // shut 0→1 over 260 ms, hold, open over 300 ms; the head tips while it smiles
        const shut = e < 260 ? e / 260 : e < T - 300 ? 1 : Math.max(0, (T - e) / 300);
        setEyes(shut); tiltX = SMILE_TILT * Math.min(1, shut * 1.2) * Math.sin(Math.PI * p);
      } else if (name === 'sing') {
        notesAt(e); tiltX = SING_TILT * Math.sin(Math.PI * 2 * e / 760) * Math.sin(Math.PI * p);
      } else {
        const env = p < 0.18 ? ease(p / 0.18) : p > 0.82 ? ease((1 - p) / 0.18) : 1;
        const phi = Math.PI / 2 + Math.PI * 2 * ease(p);
        tiltX = ROLL_TILT * env * Math.sin(phi); tiltZ = ROLL_TILT * env * Math.cos(phi);
      }
    }

    g.userData.api = {
      setLabel(text) { title = text; paint(waveAt < 0 ? 0 : waveAt / 1000); },
      setPlaying(b) { const p = !!b; if (p !== playing) { playing = p; paint(0); } },
      /* the dormant door's answer: a small hop of the whole prop */
      bop(reduced) { if (reduced) return; bopping = true; bopT0 = null; },
      bopAmount: () => hopY,
      /* start a named beat now — for the review sheet and the harness */
      startBeat(name) { if (!BEAT_MS[name]) return false; beat = lastBeat = name; beatT0 = null; return true; },
      currentBeat: () => beat,
      records, notes,
      tick(now, dt, reduced) {
        let active = false;
        if (reduced) { if (beat || tiltX || tiltZ || hopY) { beat = null; beatT0 = null; beatAt = null; bopping = false; hopY = 0; rest(); } return false; }
        if (bopping) {
          if (bopT0 === null) bopT0 = now;
          const e = (now - bopT0) / BOP_MS;
          if (e >= 1) { hopY = 0; bopping = false; } else { hopY = BOP_H * Math.sin(Math.PI * e); active = true; }
        }
        if (beat === null) {
          if (beatAt === null) beatAt = now + gap();
          else if (now >= beatAt) { beat = lastBeat = pick(); beatT0 = now; if (beat === 'sing') say('jukeboxWhistle'); }
        }
        if (beat !== null) {
          if (beatT0 === null) beatT0 = now;
          const e = now - beatT0;
          if (e >= BEAT_MS[beat]) { beat = null; beatT0 = null; beatAt = now + gap(); rest(); }
          else { runBeat(beat, e); active = true; }
        }
        applyRig();
        if (playing) {
          carousel.rotation.y += dt * SPIN; relabel(); active = true;
          if (now - waveAt >= 100) { waveAt = now; paint(now / 1000); }
        }
        return active;
      },
    };
    return g;
  }
  LOU_BUILDERS.jukebox = (ctx) => louBuildJukebox(ctx.lib, ctx.design, ctx.games, ctx.sfx);

  /* ─────────────────────────────────────────────────────────────────────────
     The flip phone — round 4, to the owner's rendered mockup
     (the owner's reference render, archived with the sandbox) and their brief of 23 Sep 2026:
     it RESTS CLOSED, and only a tap flips it open, lights the screen and hands
     the player to the Shelves, the camera pushing in on the screen on the way.
     The push-in is why it is built this densely: the one moment anybody looks
     at it closely is the moment the camera flies into it.

     THE HINGE IS DESIGNED, NOT GUESSED. The lid turns about one axis, AXIS,
     that runs through a barrel sitting on the lower half's far end and two
     knuckles on the lid's. In its closed pose the whole lid lies above the
     deck, and every point of it only rises as it turns — the parts behind the
     axis are the knuckles, which are cylinders ON the axis and so turn in
     place. The lid's body starts DZ0 from the axis, a hair more than the
     barrel's radius, which is the notch the barrel turns in. The harness
     sweeps the lid through the whole flip and fires rays to prove all of it.

     CLEARANCE IS A SUM (plan § 1). Closed, the lid's inner face sits G above
     the deck; the bezel hangs FRAME_T − FRAME_EMBED below that face and the
     tallest thing on the deck stands DECK_TOP above it, so what is left is
     G − DECK_TOP − (FRAME_T − FRAME_EMBED) = 2.0 − 1.1 − 0.5 = 0.4 mm.
     Every part on the deck is sized so its top is DECK_TOP, never more.

     Colour sections — the owner delegated the mapping (23 Sep 2026):
       shell    both halves, the barrel and knuckles: the body
       plate    the screen bezel, the D-pad's OK button, the soft-key dashes and
                the camera's surround: the mockup's deeper-lavender accents
       ears     the S badge and the volume rocker. The phone has no ears, and the
                S is the one mark visible from the couch while it rests closed,
                which is the pose it is almost always seen in. The screen's
                mascot is drawn in this colour too (api.onDesign).
       buttons  the twelve keys, the control deck and the D-pad ring
     Fixed: the LCD, the call/end glyphs, and the glossy black of the camera,
     earpiece, speaker and ports.
     ───────────────────────────────────────────────────────────────────────── */
  const LOU_PHONE_OPEN_DEG = 140;   // a real clamshell opens further; this faces the screen up the camera's line
  const LOU_PHONE_FLIP_MS = 480;    // the flip plus the backlight coming up; the scene passes its own
  const LOU_PHONE_MENU = ['Shelves', 'Messages', 'Camera', 'Settings'];
  const LOU_PHONE_KEYS = [['1', 'oo'], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'],
                          ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', '+'], ['0', '_'], ['#', '']];

  /* A pill lying along x — the hinge barrel, the knuckles, the soft-key dashes.
     A lathe (so the ends are true round-overs), turned onto its side. */
  function louPillX(THREE, len, r, f, segs = 40) {
    const h = len / 2, n = 7, p = [new THREE.Vector2(0, -h)];
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; p.push(new THREE.Vector2(r - f + f * Math.cos(a), -h + f + f * Math.sin(a))); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; p.push(new THREE.Vector2(r - f + f * Math.cos(a), h - f + f * Math.sin(a))); }
    p.push(new THREE.Vector2(0, h));
    const geo = new THREE.LatheGeometry(p, segs); geo.rotateZ(-Math.PI / 2); return geo;
  }
  /* A button: a short cylinder with an elliptical dome — the OK key, the flash,
     the lens. `k` is how much of the height the straight wall takes. */
  function louDome(THREE, r, h, k = 0.5, segs = 40) {
    const p = [new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, h * k)];
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; p.push(new THREE.Vector2(Math.max(0, r * Math.cos(a)), h * k + h * (1 - k) * Math.sin(a))); }
    return new THREE.LatheGeometry(p, segs);
  }
  /* The S badge. A thick stroke along a centreline of two arcs that meet
     tangentially in the middle, so there is no corner anywhere; the ends swell
     a little, which is what makes it read as a bubble letter rather than a
     road sign. The inner radius R − hw stays positive, so it never folds. */
  function louSylShape(THREE, R, hw) {
    const cl = [], n = 36, SW = 245;
    for (let i = 0; i <= n; i++) { const a = (25 + SW * i / n) * Math.PI / 180; cl.push([Math.cos(a) * R, R + Math.sin(a) * R]); }
    for (let i = 1; i <= n; i++) { const a = (90 - SW * i / n) * Math.PI / 180; cl.push([Math.cos(a) * R, -R + Math.sin(a) * R]); }
    const N = cl.length, L = [], Rt = [];
    const width = (i) => { const u = i / (N - 1), e = Math.min(u, 1 - u); return hw * (1 + 0.22 * Math.max(0, 1 - e / 0.12)); };
    const nrm = (i) => { const a = cl[Math.max(0, i - 1)], b = cl[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };
    for (let i = 0; i < N; i++) { const [nx, ny] = nrm(i), w = width(i); L.push([cl[i][0] + nx * w, cl[i][1] + ny * w]); Rt.push([cl[i][0] - nx * w, cl[i][1] - ny * w]); }
    const pts = [], cap = (c, from, w) => { for (let k = 1; k < 12; k++) { const a = from - Math.PI * k / 12; pts.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]); } };
    L.forEach(p => pts.push(p));
    { const [nx, ny] = nrm(N - 1); cap(cl[N - 1], Math.atan2(ny, nx), width(N - 1)); }
    for (let i = N - 1; i >= 0; i--) pts.push(Rt[i]);
    { const [nx, ny] = nrm(0); cap(cl[0], Math.atan2(-ny, -nx), width(0)); }
    return new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  }

  /* The LCD. Drawn ONCE (and again only if the ears colour changes): the
     backlight is emissive on top of it, so switching it on is a number, not a
     repaint. Unlit it still shows — a transflective LCD reads by room light,
     which is exactly what a real one of these does. The highlighted row is the
     door: this phone is how you get to the Shelves, and the screen says so. */
  function louPhoneScreen(THREE, c, earHex) {
    const x = c.getContext('2d'), W = c.width, H = c.height, INK = '#26301f', LCD = '#d3dfc6';
    const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
    const rr = (x0, y0, w, h, r) => { x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.closePath(); };
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, LCD); bg.addColorStop(1, '#b8c8ac');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.fillStyle = INK; x.strokeStyle = INK;
    for (let i = 0; i < 4; i++) x.fillRect(26 + i * 11, 46 - 8 - i * 6, 7, 8 + i * 6);                  // signal
    x.lineWidth = 3; rr(W - 76, 24, 42, 22, 4); x.stroke(); x.fillRect(W - 33, 30, 5, 10); x.fillRect(W - 71, 29, 30, 12);   // battery
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 60px Fredoka, sans-serif'; x.fillText('Sylly', W / 2, 100);
    const icon = (i, cx, cy, ink) => {
      x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 3.5;
      if (i === 0) { x.strokeRect(cx - 14, cy - 13, 28, 26); x.fillRect(cx - 14, cy - 1, 28, 3); [-9, -3, 4].forEach((d, k) => x.fillRect(cx + d, cy - 10 + k, 4, 9 - k)); }
      else if (i === 1) { x.strokeRect(cx - 15, cy - 10, 30, 21); x.beginPath(); x.moveTo(cx - 15, cy - 10); x.lineTo(cx, cy + 2); x.lineTo(cx + 15, cy - 10); x.stroke(); }
      else if (i === 2) { rr(cx - 15, cy - 8, 30, 20, 4); x.stroke(); x.beginPath(); x.arc(cx, cy + 2, 6, 0, Math.PI * 2); x.stroke(); x.fillRect(cx - 5, cy - 13, 10, 5); }
      else { [-8, 0, 8].forEach((d, k) => { x.fillRect(cx - 15, cy + d - 1.5, 30, 3); x.beginPath(); x.arc(cx + [-6, 6, -1][k], cy + d, 4.5, 0, Math.PI * 2); x.fill(); }); }
    };
    LOU_PHONE_MENU.forEach((label, i) => {
      const y = 150 + i * 60, ink = i === 0 ? LCD : INK;
      if (i === 0) { x.fillStyle = INK; rr(20, y, W - 76, 52, 9); x.fill(); }
      icon(i, 52, y + 26, ink);
      x.fillStyle = ink; x.textAlign = 'left'; x.font = '600 38px Fredoka, sans-serif'; x.fillText(label, 86, y + 28);
    });
    x.fillStyle = 'rgba(38,48,31,0.22)'; x.fillRect(W - 38, 150, 6, 232); x.fillStyle = INK; rr(W - 40, 150, 10, 86, 5); x.fill();   // scroll bar
    // the mascot: Little Sylly's mouse, in the player's ear colour
    const cx = W / 2, cy = H - 118, ear = earHex, face = mix(earHex, '#ffffff', 0.55);
    x.lineWidth = 5; x.strokeStyle = INK;
    [-1, 1].forEach(s => {
      x.fillStyle = ear; x.beginPath(); x.arc(cx + s * 54, cy - 58, 36, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = mix(earHex, '#ffc6d6', 0.6); x.beginPath(); x.arc(cx + s * 54, cy - 58, 19, 0, Math.PI * 2); x.fill();
    });
    x.fillStyle = face; x.beginPath(); x.ellipse(cx, cy, 74, 62, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    [-1, 1].forEach(s => {
      x.fillStyle = INK; x.beginPath(); x.arc(cx + s * 27, cy - 4, 13, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + s * 27 + 4, cy - 9, 4.5, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(236,128,150,0.55)'; x.beginPath(); x.ellipse(cx + s * 47, cy + 18, 12, 7, 0, 0, Math.PI * 2); x.fill();
    });
    x.fillStyle = INK; x.beginPath(); x.moveTo(cx - 6, cy + 13); x.lineTo(cx + 6, cy + 13); x.lineTo(cx, cy + 20); x.closePath(); x.fill();
    x.lineWidth = 3.5; x.beginPath(); x.arc(cx - 7, cy + 24, 7, 0.1 * Math.PI, 0.95 * Math.PI); x.stroke(); x.beginPath(); x.arc(cx + 7, cy + 24, 7, 0.05 * Math.PI, 0.9 * Math.PI); x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.035)';                                                                                  // the pixel grid
    for (let yy = 0; yy < H; yy += 4) x.fillRect(0, yy, W, 1);
    for (let xx = 0; xx < W; xx += 4) x.fillRect(xx, 0, 1, H);
  }
  /* The keypad legends: one atlas, twelve cells, each key's decal UV-mapped to
     its own cell — one texture and one material for the lot. Printed in a
     translucent plum so they darken whatever colour the keys are. */
  function louPhoneKeyAtlas(makeCanvas) {
    const c = makeCanvas(768, 512), x = c.getContext('2d');
    x.clearRect(0, 0, 768, 512); x.fillStyle = 'rgba(84,58,108,0.78)'; x.textBaseline = 'middle';
    LOU_PHONE_KEYS.forEach(([d, s], i) => {
      const cx = (i % 3) * 256, cy = Math.floor(i / 3) * 128, lone = !s;
      x.textAlign = lone ? 'center' : 'right'; x.font = 'italic 600 84px Fredoka, sans-serif'; x.fillText(d, cx + (lone ? 128 : 122), cy + 66);
      if (!lone) { x.textAlign = 'left'; x.font = '500 44px Fredoka, sans-serif'; x.fillText(s, cx + 132, cy + 76); }
    });
    return c;
  }
  function louPhoneArrows(makeCanvas, rMid) {   // rMid: the ring's mid-radius as a fraction of the decal's half-width
    const c = makeCanvas(256, 256), x = c.getContext('2d'), R = 128 * rMid;
    x.clearRect(0, 0, 256, 256); x.strokeStyle = 'rgba(84,58,108,0.7)'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
    [0, 1, 2, 3].forEach(k => {
      const a = k * Math.PI / 2, px = 128 + Math.cos(a) * R, py = 128 + Math.sin(a) * R, t = [-Math.sin(a), Math.cos(a)], o = [Math.cos(a), Math.sin(a)];
      x.beginPath(); x.moveTo(px - o[0] * 5 + t[0] * 10, py - o[1] * 5 + t[1] * 10); x.lineTo(px + o[0] * 5, py + o[1] * 5); x.lineTo(px - o[0] * 5 - t[0] * 10, py - o[1] * 5 - t[1] * 10); x.stroke();
    });
    return c;
  }
  function louPhoneEnvelope(makeCanvas) {
    const c = makeCanvas(128, 96), x = c.getContext('2d');
    x.clearRect(0, 0, 128, 96);
    x.fillStyle = '#fffaf2'; x.strokeStyle = '#8c6bb8'; x.lineWidth = 6; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(12, 14); x.lineTo(116, 14); x.lineTo(116, 82); x.lineTo(12, 82); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(12, 14); x.lineTo(64, 54); x.lineTo(116, 14); x.stroke();
    x.fillStyle = '#e8607a'; x.beginPath(); x.moveTo(64, 70); x.bezierCurveTo(48, 58, 52, 44, 64, 52); x.bezierCurveTo(76, 44, 80, 58, 64, 70); x.fill();
    return c;
  }
  function louPhoneFlare(makeCanvas) {
    const c = makeCanvas(128, 128), x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.25, 'rgba(255,250,230,0.7)'); gr.addColorStop(1, 'rgba(255,245,220,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c;
  }

  function louBuildPhone(lib, design, sfx) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, 'phone');
    const say = name => { if (typeof sfx === 'function') { try { sfx(name); } catch (_) {} } };
    // ── dimensions, metres. x across, y up, z along; the hinge is at −z (away from the couch).
    const W = 0.056, L = 0.100;
    const TL = 0.011, BL = 0.0034;                  // lower half: thickness, bevel
    const TU = 0.009, BU = 0.003;                   // lid
    const KEY_T = 0.0012, KEY_EMBED = 0.0001;
    const DECK_TOP = KEY_T - KEY_EMBED;             // nothing on the deck stands taller than this (1.1 mm)
    const FRAME_T = 0.0009, FRAME_EMBED = 0.0004;   // the bezel stands 0.5 mm proud of the lid's inner face
    const G = 0.002;                                // closed gap between deck and lid face — the sum is in the header
    const RB = G + TU / 2;                          // barrel and knuckle radius: exactly down to the deck, never into it
    /* lib.extrude floors a part's straight run at 0.5 mm, so a thin moulded
       part given its full default bevel comes out THICKER than its name — the
       deck was 0.75 mm, the keys 1.3, the bezel 0.94, and the clearance sum
       above quietly lost half its margin (the harness caught it). `thin`
       picks the bevel so the floor never applies and d is the finished size. */
    const thin = (w, h, d, r, opt = {}) => lib.moulded(w, h, d, r, Object.assign({ bevel: Math.min(r / 3, (d - 0.0005) / 2) }, opt));
    const AXIS_Y = TL + G + TU / 2, AXIS_Z = -L / 2 + RB + 0.0004;
    const DZ0 = RB + 0.0006;                        // the lid body starts this far from the axis: the barrel's notch
    const LU = L / 2 - (AXIS_Z + DZ0);              // so, closed, the lid's far end meets the lower half's near end
    const BH = 0.0155, NX = BH + 0.0006;            // barrel half-length; the notch's half-width
    const OPEN = LOU_PHONE_OPEN_DEG * Math.PI / 180;

    /* Two speckle instances, per the telly's lesson: extruded parts carry UVs
       in metres, lathes carry 0..1, so one repeat cannot serve both. */
    const BUMP = lib.tex.plasticBump(34, 34, 29), LATHE_BUMP = lib.tex.plasticBump(3, 1.2, 31);
    const shell = lib.role('shell', design.shell, { bumpMap: BUMP, bumpScale: 0.00016 });
    const shellL = lib.role('shell', design.shell, { bumpMap: LATHE_BUMP, bumpScale: 0.00012 });
    const plate = lib.role('plate', design.plate, { bumpMap: BUMP, bumpScale: 0.00012 });
    const plateS = lib.role('plate', design.plate, { roughness: .42 });
    const ears = lib.role('ears', design.ears, { roughness: .42, bumpMap: BUMP, bumpScale: 0.0001 });
    const keysM = lib.role('buttons', design.buttons, { roughness: .36 });
    const deckM = lib.role('buttons', design.buttons, { roughness: .46, bumpMap: BUMP, bumpScale: 0.0001 }, 0.93);
    /* Glossy black comes out mid grey under the room's environment unless the
       reflection is turned down — the jukebox's records, DD-22 § 5. */
    const gloss = new THREE.MeshStandardMaterial({ color: '#16131b', roughness: .42, metalness: .05, envMapIntensity: .35 });
    const portM = new THREE.MeshStandardMaterial({ color: '#2c2732', roughness: .7 });
    const lensM = new THREE.MeshStandardMaterial({ color: '#0d1526', roughness: .18, metalness: .3, envMapIntensity: .6 });
    const callM = new THREE.MeshStandardMaterial({ color: '#5fb46c', roughness: .45 });
    const endM = new THREE.MeshStandardMaterial({ color: '#df665d', roughness: .45 });
    const flashM = new THREE.MeshStandardMaterial({ color: '#efe3b0', emissive: '#fff6d8', emissiveIntensity: 0, roughness: .25 });

    /* g ─ shake (the buzz: jitter about the phone's own centre)
         └ rig (tilt about the near edge, hop) ─ every part
       The group origin stays where LOU_PLACES rests it (the telly's pattern). */
    const shake = new THREE.Group(); shake.name = 'shake'; g.add(shake);
    const rig = new THREE.Group(); rig.name = 'rig'; shake.add(rig);
    const add = (parent, geo, mat, name, pos, rot, cast) => { const m = louMesh(THREE, geo, mat, name, pos || [0, 0, 0], rot, cast); parent.add(m); return m; };
    const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; };
    /* A moulded slab from a per-corner outline, (x, v) with v = −z, bottom at
       y = 0 and top at y = t. The outline is inset by the bevel first, because
       bevelSize grows it back out (the same correction lib.moulded makes). */
    const slab = (corners, t, b) => {
      const geo = lib.extrude(new THREE.Shape(lib.roundPoly(corners, -b, 0.0012)), t, b, { center: false, bevelSegments: 7, crease: 50 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0); return geo;
    };

    // ── the lower half: the far (hinge) corners a little tighter than the near ones, as in the mockup
    add(rig, slab([[-W / 2, -L / 2, 0.012], [W / 2, -L / 2, 0.012], [W / 2, L / 2, 0.009], [-W / 2, L / 2, 0.009]], TL, BL), shell, 'lower');
    add(rig, louPillX(THREE, 2 * BH, RB, 0.0024, 56), shellL, 'barrel', [0, AXIS_Y, AXIS_Z]);

    // ── the control deck: soft keys, call/end, and the D-pad ring round a lavender OK button
    const PZ0 = -0.0345, PZ1 = -0.0115, PZ = (PZ0 + PZ1) / 2, PT = 0.0007, P_TOP = TL + 0.0004;
    add(rig, flat(thin(0.045, PZ1 - PZ0, PT, 0.006)), deckM, 'deck', [0, P_TOP - PT / 2, PZ], null, false);
    const RI = 0.0056, RO = 0.0096, DP_H = TL + DECK_TOP - P_TOP;
    const ringProf = lib.roundPoly([[RI, 0, 0.0002], [RO, 0, 0.0002], [RO, DP_H, 0.00032], [RI, DP_H, 0.00032]], 0, 0.0002);
    ringProf.push(ringProf[0].clone());
    add(rig, new THREE.LatheGeometry(ringProf, 72), keysM, 'dpad', [0, P_TOP, PZ], null, false);
    add(rig, louDome(THREE, 0.0047, DP_H, 0.35, 56), plateS, 'ok', [0, P_TOP, PZ], null, false);
    const arrowTex = new THREE.CanvasTexture(louPhoneArrows(lib.makeCanvas, (RI + RO) / 2 / RO)); arrowTex.encoding = THREE.sRGBEncoding;
    add(rig, flat(new THREE.PlaneGeometry(2 * RO, 2 * RO)), new THREE.MeshStandardMaterial({ map: arrowTex, transparent: true, depthWrite: false, roughness: .5 }),
      'dpadArrows', [0, TL + DECK_TOP + 0.00004, PZ], null, false);
    [-1, 1].forEach(s => {
      add(rig, louPillX(THREE, 0.0055, 0.0004, 0.0004, 12), plateS, 'softKey' + (s < 0 ? 'L' : 'R'), [s * 0.0162, P_TOP + 0.0001, -0.0310], null, false);
      /* The handset glyph: an arc bulging toward the hinge (up, from the couch),
         with a small foot at each end. */
      const arc = new THREE.TorusGeometry(0.0022, 0.0006, 8, 24, Math.PI * 0.8); arc.rotateZ(Math.PI * 0.1);
      const m = s < 0 ? callM : endM, gz = -0.0168;
      add(rig, flat(arc), m, s < 0 ? 'call' : 'end', [s * 0.0162, P_TOP + 0.0001, gz], null, false);
      [0.1, 0.9].forEach((f, k) => { const a = Math.PI * f, foot = new THREE.SphereGeometry(0.0009, 12, 8); foot.scale(1, 0.55, 1);
        add(rig, foot, m, (s < 0 ? 'call' : 'end') + 'Foot' + k, [s * 0.0162 + Math.cos(a) * 0.0022, P_TOP + 0.0002, gz - Math.sin(a) * 0.0022], null, false); });
    });

    // ── the keypad: twelve pill keys and their legends
    const KW = 0.0132, KD = 0.0078, KPX = 0.0152, KPZ = 0.0106, KZ0 = -0.0046;
    const keyGeo = flat(thin(KW, KD, KEY_T, 0.0034, { curveSegments: 10, bevelSegments: 5 }));
    const atlas = new THREE.CanvasTexture(louPhoneKeyAtlas(lib.makeCanvas)); atlas.encoding = THREE.sRGBEncoding; atlas.anisotropy = 4;
    const legendM = new THREE.MeshStandardMaterial({ map: atlas, transparent: true, depthWrite: false, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = (c - 1) * KPX, z = KZ0 + r * KPZ;
      add(rig, keyGeo, keysM, 'key' + r + c, [x, TL + KEY_T / 2 - KEY_EMBED, z], null, false);
      const lg = new THREE.PlaneGeometry(KW * 0.84, KD * 0.8), uv = lg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / 3, 1 - (r + 1) / 4 + uv.getY(i) / 4);
      add(rig, flat(lg), legendM, 'legend' + r + c, [x, TL + DECK_TOP + 0.00004, z], null, false);
    }

    // ── the bottom: speaker slot, two mic pin-holes, the charging port; a rocker and a slot on the sides
    add(rig, flat(thin(0.014, 0.0013, 0.0007, 0.00065)), gloss, 'speaker', [0, TL - 0.00015, 0.0378], null, false);
    [-1, 1].forEach(s => add(rig, new THREE.CylinderGeometry(0.0005, 0.0005, 0.0003, 14), gloss, 'mic' + (s < 0 ? 'L' : 'R'), [s * 0.0185, TL + 0.00005, 0.0372], null, false));
    add(rig, thin(0.0075, 0.0021, 0.0008, 0.00105), portM, 'port', [0, TL / 2, L / 2 - 0.0002], null, false);
    { const sg = thin(0.0055, 0.0015, 0.0008, 0.00075); sg.rotateY(Math.PI / 2); add(rig, sg, portM, 'sideSlot', [-W / 2 + 0.0002, TL / 2, -0.006], null, false); }
    [-0.0305, -0.0215].forEach((z, k) => { const vg = thin(0.0078, 0.0023, 0.0012, 0.00115); vg.rotateY(Math.PI / 2);
      add(rig, vg, ears, 'volume' + (k ? 'Down' : 'Up'), [W / 2 + 0.0002, TL / 2, z], null, false); });

    // ── the lid: a slab notched round the barrel, on two knuckles that turn about the axis
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(0, AXIS_Y, AXIS_Z); rig.add(hinge);
    const vF = -(DZ0 + LU);
    const lidGeo = slab([[-W / 2, vF, 0.013], [W / 2, vF, 0.013], [W / 2, 0, 0.004], [NX, 0, 0.0015], [NX, -DZ0, 0.0015],
                         [-NX, -DZ0, 0.0015], [-NX, 0, 0.0015], [-W / 2, 0, 0.004]], TU, BU);
    lidGeo.translate(0, -TU / 2, 0);
    add(hinge, lidGeo, shell, 'lid');
    const KL = W / 2 - 0.0012 - NX;
    [-1, 1].forEach(s => add(hinge, louPillX(THREE, KL, RB, 0.0022, 56), shellL, 'knuckle' + (s < 0 ? 'L' : 'R'), [s * (NX + KL / 2), 0, 0]));

    /* The lid's INNER face (the screen side) faces −y while closed. Its group
       is turned half over so +y points out of that face, as it does for every
       other flat part here; that also makes local −z the lid's far end, which
       is the top of the screen. So z_local = −dz throughout. */
    const inner = new THREE.Group(); inner.name = 'lidInner'; inner.position.y = -TU / 2; inner.rotation.x = Math.PI; hinge.add(inner);
    const FZ0 = DZ0 + 0.004, FZ1 = FZ0 + 0.068, FW = 0.049, F_BOT = 0.006, F_TOP = 0.004, FR = 0.005, FB = (FRAME_T - 0.0005) / 2, LIP = 0.0004;   // FB: the extrude floor again
    const GW = FW - 2 * 0.0033, GH = FZ1 - FZ0 - F_BOT - F_TOP, GR = 0.0022;
    const fCz = (FZ0 + FZ1) / 2, gCz = (FZ0 + F_BOT + FZ1 - F_TOP) / 2;
    /* The frame's hole is LIP smaller than the glass all round, so its lip
       covers the glass's edge; the bevel shrinks a hole by FB, so it is cut
       that much oversize (the telly's correction). Shape +y is the lid's far
       end here, so the hole sits (gCz − fCz) toward it: the bottom band is
       the deeper one, as in the mockup. */
    const frameShape = lib.roundedRect(FW - 2 * FB, FZ1 - FZ0 - 2 * FB, FR - FB);
    frameShape.holes.push(louRoundedPath(THREE, GW - 2 * LIP + 2 * FB, GH - 2 * LIP + 2 * FB, GR + FB, 0, gCz - fCz));
    add(inner, flat(lib.extrude(frameShape, FRAME_T, FB, { curveSegments: 24, bevelSegments: 4, crease: 40 })), plate, 'bezel', [0, FRAME_T / 2 - FRAME_EMBED, -fCz], null, false);
    const SCR_W = 480, SCR_H = Math.round(480 * GH / GW);
    const scrCanvas = lib.makeCanvas(SCR_W, SCR_H), scrTex = new THREE.CanvasTexture(scrCanvas);
    scrTex.encoding = THREE.sRGBEncoding; scrTex.anisotropy = 4;
    const screenMat = new THREE.MeshStandardMaterial({ map: scrTex, emissiveMap: scrTex, emissive: '#e4f2d6', emissiveIntensity: 0, roughness: .3, metalness: 0 });
    let earHex = design.ears || '#a97fd6';
    const paintScreen = () => { louPhoneScreen(THREE, scrCanvas, earHex); scrTex.needsUpdate = true; };
    paintScreen();
    const screen = add(inner, flat(new THREE.PlaneGeometry(GW, GH)), screenMat, 'screen', [0, 0.00022, -gCz], null, false);
    add(inner, flat(thin(0.011, 0.0017, 0.0007, 0.00085)), gloss, 'earpiece', [0, -0.00005, -(FZ1 + (DZ0 + LU - BU - FZ1) / 2)], null, false);

    /* The lid's OUTER face — the one you see while it rests closed. No turn:
       +y is already out of the face and −z is toward the hinge, which is the
       top of the phone from the couch, so the S reads upright (plan § 1's
       mirrored-decal lesson, checked in the review sheet's close-up). */
    const outer = new THREE.Group(); outer.name = 'lidOuter'; outer.position.y = TU / 2; hinge.add(outer);
    const CX = 0.004, CZ = DZ0 + 0.0105, CS = 0.0084, CR = 0.0026, CAM_T = 0.0009;
    add(outer, flat(thin(CS, CS, CAM_T, CR)), gloss, 'camera', [CX, CAM_T / 2 - 0.0001, CZ]);
    const camRing = lib.ribbon([[-CS / 2, -CS / 2, CR], [CS / 2, -CS / 2, CR], [CS / 2, CS / 2, CR], [-CS / 2, CS / 2, CR]], lib.roundSection(0, 0.0011, 0.0008, 0.0004), 0.0006, 8);
    camRing.computeVertexNormals();
    add(outer, flat(camRing), plateS, 'cameraRing', [CX, -0.0001, CZ], null, false);
    add(outer, louDome(THREE, 0.0021, 0.00045, 0.2, 40), lensM, 'lens', [CX, CAM_T - 0.0001, CZ], null, false);
    add(outer, flat(new THREE.TorusGeometry(0.0023, 0.00022, 8, 40)), portM, 'lensRing', [CX, CAM_T - 0.00005, CZ], null, false);
    add(outer, flat(new THREE.CircleGeometry(0.00045, 14)), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 'lensGlint', [CX - 0.0007, CAM_T + 0.0004, CZ - 0.0007], null, false);
    const FLX = 0.0135, FLZ = CZ - 0.0015;
    add(outer, louDome(THREE, 0.0013, 0.0005, 0.3, 32), flashM, 'flash', [FLX, -0.0001, FLZ], null, false);
    add(outer, flat(new THREE.TorusGeometry(0.00145, 0.0002, 8, 32)), plateS, 'flashRing', [FLX, 0.00005, FLZ], null, false);
    const sGeo = flat(lib.extrude(louSylShape(THREE, 0.0021, 0.00118), 0.0009, 0.0002, { bevelSegments: 3, crease: 60 }));
    add(outer, sGeo, ears, 'badge', [0, 0.00025, DZ0 + LU - 0.019], null, false);

    /* Transients. Both rest shrunk to nothing at a point inside the phone, so
       they never widen the bounding box that the arrival beat and the hover
       read — Box3 counts invisible meshes too. */
    const flareM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(louPhoneFlare(lib.makeCanvas)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const flareMesh = add(outer, flat(new THREE.PlaneGeometry(0.03, 0.03)), flareM, 'flare', [FLX, 0.0008, FLZ], null, false);
    const envTex = new THREE.CanvasTexture(louPhoneEnvelope(lib.makeCanvas)); envTex.encoding = THREE.sRGBEncoding;
    const envM = new THREE.MeshStandardMaterial({ map: envTex, emissiveMap: envTex, emissive: '#ffffff', emissiveIntensity: .35, transparent: true, depthWrite: false, roughness: .6, side: THREE.DoubleSide });
    const envelope = add(g, new THREE.PlaneGeometry(0.013, 0.0098), envM, 'envelope', [0, 0.01, 0], null, false);

    // ── state
    let lidA = 0, light = 0, isOpen = false, opening = null;
    const setLid = (a) => { lidA = a; hinge.rotation.x = -a; };
    const setLight = (k) => { light = k; screenMat.emissiveIntensity = 0.62 * k; };
    function flareAt(k) { flareMesh.visible = k > 0.01; flareMesh.scale.setScalar(k > 0.01 ? 0.35 + 1.4 * (1 - k) : 0.001); flareM.opacity = k; }
    function envelopeAt(e) {
      const u = (e - 180) / 1250;
      if (!(u > 0 && u < 1)) { envelope.visible = false; envelope.scale.setScalar(0.001); envelope.position.set(0, 0.01, 0); return; }
      envelope.visible = true;
      envelope.position.set(0.004 * Math.sin(u * 6.5), 0.03 + 0.05 * louEaseOutCubic(u), 0.004);
      envelope.rotation.set(-0.5, 0, 0.18 * Math.sin(u * 5));
      envelope.scale.setScalar(0.6 + 0.4 * Math.min(1, u / 0.2));
      envM.opacity = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    }
    flareAt(0); envelopeAt(-1);

    /* ── THE IDLE: three beats, shuffled, never the same one twice running,
       seeded (the telly's pattern, DD-20). Closed only — an open phone is on
       its way out of the room.
         buzz  a message: two bursts of vibration skitter it on the table while
               the flash pulses as a notification light, and an envelope floats up
         snap  it rears up on its near edge to point the camera at the couch,
               fires the flash with a small jolt, and settles back
         clap  it flips half open and snaps shut — a small hop on the clap
       All three end where they began, so under reduced motion it simply rests.
       The rear-up pivots on the centre of the near bottom edge's fillet, so the
       edge rolls on the table and never through it (the jukebox's DD-22 § 10). */
    const BEAT_MS = { buzz: 1600, snap: 1400, clap: 900 };
    const BEAT_NAMES = Object.keys(BEAT_MS);
    const TILT = 0.40, CLAP = 70 * Math.PI / 180, HOP_H = 0.004;
    const PIVOT = new THREE.Vector3(0, BL, L / 2 - BL), XAX = new THREE.Vector3(1, 0, 0), vT = new THREE.Vector3();
    let tilt = 0, hop = 0, beat = null, beatT0 = null, beatAt = null, lastBeat = '', beatSeed = 20260924;
    const rnd = () => { beatSeed = (beatSeed * 1664525 + 1013904223) >>> 0; return beatSeed / 4294967296; };
    const gap = () => 2800 + rnd() * 3200;
    const pick = () => { const p = BEAT_NAMES.filter(n => n !== lastBeat); return p[Math.min(p.length - 1, Math.floor(rnd() * p.length))]; };
    const inOut = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const softBack = (p) => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
    function applyRig() {
      rig.rotation.x = tilt;
      vT.copy(PIVOT).applyAxisAngle(XAX, tilt);
      rig.position.set(0, PIVOT.y - vT.y + hop, PIVOT.z - vT.z);
    }
    function settle() { tilt = 0; hop = 0; shake.rotation.y = 0; shake.position.x = 0; flashM.emissiveIntensity = 0; flareAt(0); envelopeAt(-1); applyRig(); }
    function rest() { settle(); if (!isOpen) { setLid(0); setLight(0); } }
    function runBeat(name, e) {
      const T = BEAT_MS[name];
      if (name === 'buzz') {
        let amp = 0; [[0, 360], [560, 920]].forEach(([s, t]) => { if (e >= s && e < t) amp = Math.sin(Math.PI * (e - s) / (t - s)); });
        shake.rotation.y = 0.05 * amp * Math.sin(e * 0.31) * Math.cos(e * 0.13);
        shake.position.x = 0.0008 * amp * Math.sin(e * 0.47);
        flashM.emissiveIntensity = 1.6 * amp;
        envelopeAt(e);
      } else if (name === 'snap') {
        const UP = 380, FIRE = 560, DOWN = 1000;
        tilt = TILT * (e < UP ? louEaseOutCubic(e / UP) : e < DOWN ? 1 : 1 - inOut((e - DOWN) / (T - DOWN)));
        if (e >= FIRE && e < FIRE + 120) tilt -= 0.03 * Math.sin(Math.PI * (e - FIRE) / 120);   // the shutter's jolt
        const f = e < FIRE ? 0 : Math.max(0, 1 - (e - FIRE) / 260);
        flashM.emissiveIntensity = 7 * f; flareAt(f); applyRig();
      } else {
        const OPEN_T = 240, HOLD = 320, SHUT = 440;
        const a = e < OPEN_T ? CLAP * louEaseOutCubic(e / OPEN_T) : e < HOLD ? CLAP : e < SHUT ? CLAP * (1 - Math.pow((e - HOLD) / (SHUT - HOLD), 2)) : 0;
        setLid(a); setLight(0.35 * a / CLAP);
        hop = e >= SHUT && e < SHUT + 200 ? HOP_H * Math.sin(Math.PI * (e - SHUT) / 200) : 0;
        applyRig();
      }
    }

    g.userData.api = {
      screen,
      isOpen: () => isOpen,
      lidAngle: () => lidA,
      backlight: () => light,
      /* Flip open. Resolves once the lid is fully open and the backlight is up —
         the scene waits on it before the push-in. `instant` is reduced motion:
         the end state, no journey. Starts from wherever the lid is, and eases
         any rear-up back down over the first 40%, so a tap mid-beat never jumps. */
      open(opt = {}) {
        if (opening) return opening.promise;
        if (isOpen) return Promise.resolve();
        beat = null; beatT0 = null; beatAt = null;
        const tilt0 = tilt; hop = 0; shake.rotation.y = 0; shake.position.x = 0; flashM.emissiveIntensity = 0; flareAt(0); envelopeAt(-1);
        isOpen = true;
        if (opt.instant) { tilt = 0; applyRig(); setLid(OPEN); setLight(1); return Promise.resolve(); }
        let res; const promise = new Promise(r => { res = r; });
        opening = { t0: null, ms: opt.ms || LOU_PHONE_FLIP_MS, from: lidA, tilt0, res, promise };
        return promise;
      },
      /* Shut, at once. An open that is still running is abandoned: its promise
         never resolves, so a transition the scene has already given up on
         (resetView) cannot fire its door afterwards. */
      close() { opening = null; isOpen = false; beat = null; beatT0 = null; beatAt = null; rest(); setLid(0); setLight(0); },
      reset() { g.userData.api.close(); },
      /* Where the camera should look to fill the view with the screen. */
      focusPose() {
        screen.updateWorldMatrix(true, false);
        return { point: screen.getWorldPosition(new THREE.Vector3()), normal: new THREE.Vector3(0, 1, 0).transformDirection(screen.matrixWorld), w: GW, h: GH };
      },
      onDesign(d) { if (d && d.ears && d.ears !== earHex) { earHex = d.ears; paintScreen(); } },
      startBeat(name) { if (!BEAT_MS[name] || isOpen) return false; beat = lastBeat = name; beatT0 = null; return true; },
      currentBeat: () => beat,
      tiltAmount: () => tilt,
      hopAmount: () => hop,
      tick(now, dt, reduced) {
        let active = false;
        if (opening) {
          if (opening.t0 === null) opening.t0 = now;
          const e = now - opening.t0, T = opening.ms, FLIP = T * 0.78;
          setLid(opening.from + (OPEN - opening.from) * softBack(Math.min(1, e / FLIP)));
          tilt = opening.tilt0 * (1 - Math.min(1, e / (0.4 * T))); applyRig();
          setLight(e < T * 0.45 ? 0 : Math.min(1, (e - T * 0.45) / (T * 0.45)));
          if (e >= T) { setLid(OPEN); setLight(1); tilt = 0; applyRig(); const r = opening.res; opening = null; r(); }
          else active = true;
        }
        if (reduced || isOpen) { if (beat) { beat = null; beatT0 = null; settle(); } beatAt = null; return active; }
        if (beat === null) {
          if (beatAt === null) beatAt = now + gap();
          else if (now >= beatAt) { beat = lastBeat = pick(); beatT0 = now; if (beat === 'buzz') say('phoneAlert'); }
        }
        if (beat !== null) {
          if (beatT0 === null) beatT0 = now;
          const e = now - beatT0;
          if (e >= BEAT_MS[beat]) { beat = null; beatT0 = null; beatAt = now + gap(); rest(); }
          else { runBeat(beat, e); active = true; }
        }
        return active;
      },
    };
    return g;
  }
  LOU_BUILDERS.phone = (ctx) => louBuildPhone(ctx.lib, ctx.design, ctx.sfx);

  /* The stickerbook — prop round 5 (owner's mockup, 23 Sep 2026 —
     the reference render is archived with the sandbox). A butter-yellow quilted binder: a
     padded front cover with a debossed ring-star-"Little Sylly" badge, braided
     cord piping round both covers, a round spine, and a thick block of clear
     sleeve pages showing at the edges. Open, the inside of the front cover is
     the STICKER TRAY (earned, not yet placed) and the top page is four clear
     2×2 sleeves (the first page of the book). Fixed colours — nothing here
     follows the design.

     The hinge is the spine's own axis. The front cover turns about it by θ
     and the spine by θ/2, so at θ = π the cover lands exactly at table
     height on the left and the spine's round bulges down to touch the table:
     no separate "lower it onto the table" move, and nothing ever goes below
     y = 0. The page block and back cover never move.

     The shell tells it what the collection is (setCollection); a host that
     never does sees a demo collection, so the prop is never an empty book. */
  const LOU_BINDER_OPEN_MS = 700;
  const LOU_BINDER_POCKETS = 4, LOU_BINDER_TRAY = 3;
  function louBuildBinder(lib, stickers, base) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, 'binder');
    // ── dimensions, metres. x across (spine at −x), y up, z along (+z toward the couch).
    const W = 0.19, H = 0.22, T = 0.046;            // footprint and closed thickness
    const R = T / 2;                                // spine radius: the spine's round IS the book's thickness
    const CT = 0.0065;                              // cover board thickness
    const X0 = -W / 2 + R;                          // the spine axis (the pivot), at y = R
    const LC = W / 2 - X0;                          // a cover, spine axis to fore-edge
    const OVER = 0.005, END = 0.006;                // the covers overhang the pages: fore-edge, head/tail
    const RF = 0.014;                               // fore-edge corner radius (the spine side is square)
    const PIPE = 0.0026;                            // cord piping radius
    const FLAT = [-Math.PI / 2, 0, 0];
    /* Deeper than they look: ACES and the warm key lift a butter yellow to cream (the
       first review read #EFCF78 as near-white next to the mockup). */
    const YELLOW = '#EAC45F', YELLOW_IN = '#D6A844', CORD = '#E2B650';
    const std = o => new THREE.MeshStandardMaterial(o);
    const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

    // ── the quilt: ONE height function drives the geometry and both canvases, so the
    //    creases drawn on the texture are exactly the creases in the surface.
    const QP = 0.029, QA = 0.0042;                  // diamond pitch (along its diagonal), puff height
    const BADGE = { x: 0, y: 0.010, r: 0.047 };     // plane coords: centred on the cover's face, +y = away from the couch
    const EDGE = 0.011;                             // the puff falls to nothing this far in from the edge (under the piping)
    const edgeIn = (x, y) => {                      // distance in from the cover's outline, the rounded corners included
      const cx = LC / 2 - RF, cy = H / 2 - RF;
      if (x > cx && Math.abs(y) > cy) return RF - Math.hypot(x - cx, Math.abs(y) - cy);
      return Math.min(LC / 2 - Math.abs(x), H / 2 - Math.abs(y));
    };
    const quiltH = (x, y) => {
      const u = (x + y) * Math.SQRT1_2 / QP, v = (x - y) * Math.SQRT1_2 / QP;
      const puff = Math.pow(Math.abs(Math.sin(Math.PI * u)), 0.45) * Math.pow(Math.abs(Math.sin(Math.PI * v)), 0.45);
      const out = sstep(BADGE.r - 0.004, BADGE.r + 0.003, Math.hypot(x - BADGE.x, y - BADGE.y));   // 0 on the badge, 1 off it
      return QA * sstep(0, EDGE, edgeIn(x, y)) * (puff * out + 0.62 * (1 - out));
    };
    function quiltGeo() {
      const nx = 120, ny = Math.round(nx * H / LC), geo = new THREE.PlaneGeometry(LC, H, nx, ny), p = geo.attributes.position;
      const cx = LC / 2 - RF, cy = H / 2 - RF;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i);
        /* Round the fore-edge corners by pulling the grid's corner vertices onto
           the arc — a plane has no rounded corners of its own. */
        if (x > cx && Math.abs(y) > cy) { const dx = x - cx, dy = Math.abs(y) - cy, L = Math.hypot(dx, dy); if (L > RF) { x = cx + dx / L * RF; y = Math.sign(y) * (cy + dy / L * RF); } }
        p.setXYZ(i, x, y, quiltH(x, y));
      }
      geo.computeVertexNormals(); return geo;
    }
    /* The cover's face as a canvas, uv 0..1 over the quilt plane (canvas top =
       plane +y = the far edge, so the lettering reads upright from the couch).
       `bump` draws the same marks as relief: creases and stitches sunk, the
       star raised, the wordmark and the ring pressed in. */
    const CW = 768, CH = Math.round(CW * H / LC), PPM = CW / LC;
    const toC = (x, y) => [(x / LC + 0.5) * CW, (0.5 - y / H) * CH];
    function drawCover(bump) {
      const c = lib.makeCanvas(CW, CH), x = c.getContext('2d');
      x.fillStyle = bump ? '#808080' : YELLOW; x.fillRect(0, 0, CW, CH);
      const [bx, by] = toC(BADGE.x, BADGE.y);
      // the creases, clipped to inside the border stitch and outside the badge
      x.save(); x.beginPath();
      const inset = 0.008 * PPM; x.rect(inset, inset, CW - 2 * inset, CH - 2 * inset);
      x.moveTo(bx + BADGE.r * PPM, by); x.arc(bx, by, BADGE.r * PPM, 0, Math.PI * 2, true);
      x.clip('evenodd');
      const span = Math.ceil((LC + H) / QP) + 2, k0 = QP * Math.SQRT2;
      const line = (x0, y0, x1, y1) => { const a = toC(x0, y0), b = toC(x1, y1); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); };
      const creases = () => { for (let k = -span; k <= span; k++) { const c0 = k * k0; line(-LC, c0 + LC, LC, c0 - LC); line(-LC, -LC - c0, LC, LC - c0); } };
      x.lineCap = 'round';
      x.strokeStyle = bump ? '#4a4a4a' : 'rgba(170,122,34,0.30)'; x.lineWidth = bump ? 6 : 4; x.setLineDash([]); creases();
      x.strokeStyle = bump ? '#5e5e5e' : 'rgba(128,88,18,0.55)'; x.lineWidth = bump ? 2.2 : 1.6; x.setLineDash([7, 6]); creases();
      x.restore();
      // the border stitch, just inside the piping
      x.setLineDash([7, 6]); x.lineWidth = bump ? 2.2 : 1.6; x.strokeStyle = bump ? '#5a5a5a' : 'rgba(128,88,18,0.5)';
      x.beginPath(); x.rect(inset, inset, CW - 2 * inset, CH - 2 * inset); x.stroke(); x.setLineDash([]);
      // the badge: a double ring, a tilted star, the wordmark
      const ringCol = bump ? '#4e4e4e' : 'rgba(150,104,24,0.55)';
      [[0.043, 3.2], [0.0385, 1.8]].forEach(([r, w]) => { x.strokeStyle = ringCol; x.lineWidth = w * (bump ? 1.4 : 1); x.beginPath(); x.arc(bx, by, r * PPM, 0, Math.PI * 2); x.stroke(); });
      const TILT = -0.21, so = 0.031 * PPM, si = 0.0148 * PPM;
      const starPath = () => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + TILT + i * Math.PI / 5, rr = i % 2 ? si : so; const px = bx + Math.cos(a) * rr, py = by + Math.sin(a) * rr; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); };
      x.lineJoin = 'round';
      if (bump) { x.fillStyle = '#9a9a9a'; starPath(); x.fill(); }
      else { x.fillStyle = 'rgba(255,244,205,0.35)'; starPath(); x.fill(); }
      x.strokeStyle = ringCol; x.lineWidth = bump ? 4 : 2.6; starPath(); x.stroke();
      x.save(); x.translate(bx, by); x.rotate(TILT);
      x.font = 'bold ' + Math.round(0.0118 * PPM) + 'px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const word = (dx, dy, col) => { x.fillStyle = col; x.fillText('Little', dx, -0.0062 * PPM + dy); x.fillText('Sylly', dx, 0.0068 * PPM + dy); };
      if (bump) { word(1.5, 1.5, '#b4b4b4'); word(0, 0, '#4a4a4a'); }   // pressed IN: light below-right, dark on top
      else word(0, 0, 'rgba(140,96,20,0.62)');
      x.restore();
      return c;
    }
    const coverTex = new THREE.CanvasTexture(drawCover(false)); coverTex.encoding = THREE.sRGBEncoding; coverTex.anisotropy = 4;
    const coverBump = new THREE.CanvasTexture(drawCover(true)); coverBump.encoding = THREE.LinearEncoding;
    const quiltM = std({ map: coverTex, bumpMap: coverBump, bumpScale: 0.0014, roughness: .66, metalness: 0 });
    const boardM = std({ color: YELLOW, roughness: .64, metalness: 0, bumpMap: lib.tex.plasticBump(40, 40, 41), bumpScale: 0.00012 });
    const inM = std({ color: YELLOW_IN, roughness: .68, metalness: 0, emissive: '#ffb84a', emissiveIntensity: 0 });   // the tray floor catches the reveal's glow
    /* The cord: a diagonal twist, drawn once and repeated along the tube's length. */
    function cordCanvas(bump) {
      const c = lib.makeCanvas(64, 32), x = c.getContext('2d');
      x.fillStyle = bump ? '#909090' : CORD; x.fillRect(0, 0, 64, 32);
      x.strokeStyle = bump ? '#484848' : 'rgba(150,108,30,0.45)'; x.lineWidth = 7;
      for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 + 64, 32); x.stroke(); }
      return c;
    }
    const cordT = new THREE.CanvasTexture(cordCanvas(false)); cordT.encoding = THREE.sRGBEncoding;
    const cordB = new THREE.CanvasTexture(cordCanvas(true)); cordB.encoding = THREE.LinearEncoding;
    [cordT, cordB].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(210, 1); });
    const cordM = std({ map: cordT, bumpMap: cordB, bumpScale: 0.0006, roughness: .7, metalness: 0 });

    // ── the cover's outline: square at the spine, rounded at the fore-edge. Centred.
    const outline = (off = 0) => lib.roundPoly([[-LC / 2, -H / 2, 0.0005], [LC / 2, -H / 2, RF], [LC / 2, H / 2, RF], [-LC / 2, H / 2, 0.0005]], off, 0.003);
    const BEV = 0.0018;
    const board = () => lib.extrude(new THREE.Shape(outline(-BEV)), CT, BEV, { curveSegments: 16 });
    /* Piping round an outline at height y, in the frame the board sits in:
       shape (sx, sy) → (sx + cx, y, −sy) — the FLAT rotation's y → −z. */
    const piping = (cx, y) => {
      const pts = outline(0).map(p => new THREE.Vector3(p.x + cx, y, -p.y));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 520, PIPE, 8, true);
    };

    // ── fixed: back cover, page block, the top sleeve page
    g.add(louMesh(THREE, board(), boardM, 'backCover', [X0 + LC / 2, CT / 2, 0], FLAT));
    g.add(louMesh(THREE, piping(X0 + LC / 2, PIPE), cordM, 'backPiping', [0, 0, 0], null, false));
    const PX0 = X0 + 0.0015, PX1 = W / 2 - OVER, PW = PX1 - PX0, PH = H - 2 * END, PY0 = CT, PY1 = T - CT;
    function edgeCanvas() {
      const c = lib.makeCanvas(32, 256), x = c.getContext('2d'), n = 15, step = 256 / n;
      x.fillStyle = '#eef1f4'; x.fillRect(0, 0, 32, 256);
      for (let i = 0; i < n; i++) { const y = i * step; x.fillStyle = '#f9fafb'; x.fillRect(0, y + 2, 32, step - 5); x.fillStyle = '#a9b3be'; x.fillRect(0, y, 32, 1.6); }
      return c;
    }
    const edgeT = new THREE.CanvasTexture(edgeCanvas()); edgeT.encoding = THREE.sRGBEncoding;
    /* ONE material: the scene's image loader and the harness both read o.material.userData,
       so a material array would throw there. The top face is under the sleeve page anyway. */
    const edgeM = std({ map: edgeT, roughness: .35, metalness: 0 });
    g.add(louMesh(THREE, new THREE.BoxGeometry(PW, PY1 - PY0, PH), edgeM, 'pages', [PX0 + PW / 2, (PY0 + PY1) / 2, 0]));
    /* The top page: four clear pockets, drawn. Slots run row by row from the
       far-left pocket, as the 2D book lays them out. */
    const QX = PW / 4, QZ = PH / 4, PCX = PX0 + PW / 2;
    const POCKET_AT = [[-QX, -QZ], [QX, -QZ], [-QX, QZ], [QX, QZ]];
    function pageCanvas() {
      const cw = 512, ch = Math.round(512 * PH / PW), c = lib.makeCanvas(cw, ch), x = c.getContext('2d');
      x.fillStyle = '#dde3e9'; x.fillRect(0, 0, cw, ch);
      const m = 10, pw = (cw - 3 * m) / 2, ph = (ch - 3 * m) / 2;
      for (let i = 0; i < 4; i++) {
        const px = m + (i % 2) * (pw + m), py = m + Math.floor(i / 2) * (ph + m);
        const gr = x.createLinearGradient(px, py, px + pw, py + ph);
        gr.addColorStop(0, '#f6f8fa'); gr.addColorStop(0.45, '#eaeef2'); gr.addColorStop(0.55, '#fbfcfd'); gr.addColorStop(1, '#e8ecf0');
        x.fillStyle = gr; x.fillRect(px, py, pw, ph);
        x.strokeStyle = '#bcc5ce'; x.lineWidth = 3; x.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
      }
      return c;
    }
    const pageTopT = new THREE.CanvasTexture(pageCanvas()); pageTopT.encoding = THREE.sRGBEncoding;
    /* The idle lights the page from within (its map as the emissive map, so the
       pockets' frames still read); 0 at rest. */
    const pageM = std({ map: pageTopT, roughness: .3, emissive: '#ffcf70', emissiveMap: pageTopT, emissiveIntensity: 0 });
    g.add(louMesh(THREE, new THREE.PlaneGeometry(PW - 0.002, PH - 0.002), pageM, 'sleevePage', [PCX, PY1 + 0.0003, 0], FLAT, false));
    const filmM = std({ color: '#ffffff', roughness: .08, metalness: 0, transparent: true, opacity: .2, depthWrite: false });
    g.add(louMesh(THREE, new THREE.PlaneGeometry(PW - 0.002, PH - 0.002), filmM, 'sleeveFilm', [PCX, PY1 + 0.0011, 0], FLAT, false));

    // ── stickers: one material per sticker, shared by its pocket mesh and its tray mesh
    const list = (stickers || []).filter(s => s && s.id);
    const matOf = {};
    list.forEach(s => { const m = std({ color: '#ffffff', roughness: .5, metalness: 0, transparent: true, alphaTest: 0.05 }); m.userData.louImage = base + (s.image || s.id + '.png'); matOf[s.id] = m; });
    const POCKET_S = 0.054, TRAY_S = 0.058;
    const pockets = list.slice(0, LOU_BINDER_POCKETS).map((s, i) => {
      const m = louMesh(THREE, new THREE.PlaneGeometry(POCKET_S, POCKET_S), matOf[s.id], 'pocket-' + s.id, [PCX + POCKET_AT[i][0], PY1 + 0.0007, POCKET_AT[i][1]], FLAT, false);
      m.userData.stickerId = s.id; g.add(m); return m;
    });

    // ── the moving parts: the front cover (θ) and the spine (θ/2), both about the spine axis
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(X0, R, 0); g.add(hinge);
    const spineRig = new THREE.Group(); spineRig.name = 'spineRig'; spineRig.position.set(X0, R, 0); g.add(spineRig);
    hinge.add(louMesh(THREE, board(), boardM, 'cover', [LC / 2, R - CT / 2, 0], FLAT));
    /* No shadow from the quilt: the board under it casts the same silhouette, and
       its 38k triangles were ~15% of a SwiftShader frame in the shadow pass alone. */
    hinge.add(louMesh(THREE, quiltGeo(), quiltM, 'quilt', [LC / 2, R + 0.0002, 0], FLAT, false));
    hinge.add(louMesh(THREE, piping(LC / 2, R), cordM, 'piping', [0, 0, 0], null, false));
    { const s = new THREE.Shape(); const r = R - BEV; s.moveTo(0, r); s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.closePath();
      const geo = lib.extrude(s, H, BEV, { center: false, curveSegments: 24 }); geo.translate(0, 0, -(H / 2 - BEV));
      spineRig.add(louMesh(THREE, geo, boardM, 'spine', [0, 0, 0]));
      /* The cord carries on round both ends of the spine, so the piping reads as one
         loop from cover to cover rather than stopping at a bare roll. On R − PIPE:
         the cord's outside is the spine's round, never under the table. */
      [-1, 1].forEach((sz, i) => { const pts = []; for (let k = 0; k <= 40; k++) { const a = Math.PI / 2 + Math.PI * k / 40; pts.push(new THREE.Vector3(Math.cos(a) * (R - PIPE), Math.sin(a) * (R - PIPE), sz * (H / 2 - PIPE * 0.4))); }
        spineRig.add(louMesh(THREE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, PIPE, 8, false), cordM, 'spinePiping' + i, [0, 0, 0], null, false)); }); }
    /* The tray, on the cover's INSIDE (hinge-local −y, which faces up once the
       cover is over). A floor a shade deeper than the board and a rounded
       rim standing proud of it. Decals facing −y turn with the cover, so they
       are built pre-rotated by π in their own plane (FACE_IN) — a quarter-turn
       alone would read upside down once the cover is open. */
    const TW = LC - 0.030, TH = H - 0.034, TCX = LC / 2 + 0.004, TY = R - CT;
    const trayOutline = [[-TW / 2, -TH / 2, 0.012], [TW / 2, -TH / 2, 0.012], [TW / 2, TH / 2, 0.012], [-TW / 2, TH / 2, 0.012]];
    hinge.add(louMesh(THREE, new THREE.ShapeGeometry(new THREE.Shape(lib.roundPoly(trayOutline, 0, 0.004))), inM, 'tray', [TCX, TY - 0.0003, 0], [Math.PI / 2, 0, 0], false));
    const rimGeo = lib.ribbon(trayOutline, lib.roundSection(0, 0.004, 0.0022, 0.0012), 0.004); rimGeo.computeVertexNormals();   // a ribbon carries no normals of its own
    hinge.add(louMesh(THREE, rimGeo, boardM, 'trayRim', [TCX, TY, 0], [Math.PI / 2, 0, 0], false));
    const TRAY_SLOTS = [[-0.020, -0.056, 0.20], [0.020, 0.000, -0.13], [-0.012, 0.056, 0.09]];   // x, z (hinge-local, from the tray centre), in-plane tilt
    const trayMesh = {};
    list.forEach(s => {
      const m = louMesh(THREE, new THREE.PlaneGeometry(TRAY_S, TRAY_S), matOf[s.id], 'tray-' + s.id, [TCX, TY - 0.0011, 0], [Math.PI / 2, 0, Math.PI], false);
      m.visible = false; m.userData.stickerId = s.id; hinge.add(m); trayMesh[s.id] = m;
    });

    let coll = null;
    function setCollection(c) {
      const placed = new Set((c && c.placed) || []);
      const tray = ((c && c.tray) || []).filter(id => trayMesh[id]).slice(0, LOU_BINDER_TRAY);
      pockets.forEach(m => { m.visible = placed.has(m.userData.stickerId); });
      Object.keys(trayMesh).forEach(id => { trayMesh[id].visible = false; });
      tray.forEach((id, i) => { const m = trayMesh[id], sl = TRAY_SLOTS[i]; m.position.set(TCX + sl[0], TY - 0.0011 - i * 0.0002, sl[1]); m.rotation.set(Math.PI / 2, 0, Math.PI + sl[2]); m.visible = true; });
      coll = { tray, placed: pockets.filter(m => m.visible).map(m => m.userData.stickerId) };
    }
    /* Scenery until someone says otherwise: the first page placed, the next
       three waiting in the tray. */
    setCollection({ placed: list.slice(0, LOU_BINDER_POCKETS).map(s => s.id), tray: list.slice(LOU_BINDER_POCKETS, LOU_BINDER_POCKETS + LOU_BINDER_TRAY).map(s => s.id) });

    // ── motion: one swing at a time, promise-shaped like the phone's flip
    let theta = 0, isOpen = false, swing = null;
    /* Open, the cover lies on its own QUILTED face, whose puffs stand QA proud
       of the board (the piping less, PIPE). So the hinge rises by LIFT as it
       turns — (1 − cos θ)/2, linear in cos θ, so the lowest point over the whole
       swing is at an end stop: 0 shut, and the puff tops just touching the
       table open. Rotating about the bare spine axis sank them 3 mm into it. */
    const LIFT = QA + 0.0003;
    const setAngle = a => { theta = a; hinge.rotation.z = a; hinge.position.y = R + LIFT * (1 - Math.cos(a)) / 2; spineRig.rotation.z = a / 2; };
    const inOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    /* The cover falls the last few degrees and bounces off the table (or off
       the pages, closing): 82% of the time is the swing, the rest a small
       lift back and settle. Never past its end stop, so never into the table. */
    const swingAt = (from, to, p) => p < 0.82 ? from + (to - from) * inOut(p / 0.82) : to - (to - from) * 0.035 * Math.sin(Math.PI * (p - 0.82) / 0.18);
    function startSwing(to, ms) {
      let res = null; const promise = new Promise(r => { res = r; });
      swing = { t0: null, from: theta, to, ms, res, promise }; return promise;
    }

    /* ── THE IDLE (owner, 23 Sep 2026): two beats, and weighted rather than
       shuffled — the book keeps a secret, and most of the time it only lets it
       slip.
         peek    75%  the cover lifts a little and a small gold glow leaks out
                      of the gap, then it drops shut with a bump
         reveal  25%  it opens right up: the pages light, god-rays stand up out
                      of the spread and gold sparkles and soft bokeh drift up
                      off it (the owner's reference render, archived with the
                      sandbox), then it shuts
       Seeded, so a review pose is exact. Both end exactly at rest, so under
       reduced motion it simply rests. A beat never marks the binder open —
       isOpen is the DOOR's state. A tap mid-beat hands the cover to the door
       from wherever it is, and the beat's light fades out under it (FADE_MS)
       rather than snapping off.
       The four transients are light, not things: no depth write, no shadow
       (the glow and the rays additive; the motes alpha-blended, see motes()), and all rest shrunk to nothing inside the page block (the
       phone's lesson — Box3 counts invisible meshes). Only meshes are picked,
       and the one mesh among them (the rays) gets a no-op raycast. */
    const BEAT_MS = { peek: 1700, reveal: 3800 };
    const LOU_BINDER_ODDS_PEEK = 0.75, FADE_MS = 300, PEEK_A = 0.32;
    let beat = null, beatT0 = null, beatAt = null, beatE = 0, fading = null, beatSeed = 20260925;
    const rnd = () => { beatSeed = (beatSeed * 1664525 + 1013904223) >>> 0; return beatSeed / 4294967296; };
    const gap = () => 3600 + rnd() * 3600;           // a notch calmer than the telly and the phone
    const pick = () => rnd() < LOU_BINDER_ODDS_PEEK ? 'peek' : 'reveal';
    const smooth = (a, b, v) => sstep(a, b, v);
    const REST = new THREE.Vector3(PCX, (PY0 + PY1) / 2, 0), SCX = X0;   // inside the page block; the open spread's centre is the spine
    const glowTex = (() => { const c = lib.makeCanvas(128, 128), x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,246,220,1)'); gr.addColorStop(0.22, 'rgba(255,208,112,0.62)'); gr.addColorStop(0.55, 'rgba(255,172,64,0.18)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const dotTex = soft => { const c = lib.makeCanvas(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      if (soft) { gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.38)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
    /* The rays: streaks round an open cone, bright at the pages and gone by
       the top. Drawn once from a fixed seed; wrapped at the seam. */
    const rayTex = (() => { const c = lib.makeCanvas(256, 128), x = c.getContext('2d'); let s = 7;
      const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      for (let i = 0; i < 26; i++) { const px = r() * 256, w = 3 + r() * 13, k = 0.25 + 0.75 * r(), gr = x.createLinearGradient(0, 0, 0, 128);
        gr.addColorStop(0, 'rgba(255,217,138,0)'); gr.addColorStop(0.55, `rgba(255,217,138,${(0.3 * k).toFixed(3)})`); gr.addColorStop(0.93, `rgba(255,226,160,${k.toFixed(3)})`); gr.addColorStop(1, `rgba(255,226,160,${(0.5 * k).toFixed(3)})`);
        x.fillStyle = gr; [-256, 0, 256].forEach(o => x.fillRect(px + o - w / 2, 0, w, 128)); }
      return new THREE.CanvasTexture(c); })();
    const light = o => Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }, o);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial(light({ map: glowTex, color: '#ffc85a', opacity: 0 }))); glow.name = 'glow'; g.add(glow);
    const rayGeo = new THREE.CylinderGeometry(0.16, 0.085, 0.30, 32, 1, true); rayGeo.translate(0, 0.15, 0);
    const rays = louMesh(THREE, rayGeo, new THREE.MeshBasicMaterial(light({ map: rayTex, color: '#ffb840', opacity: 0 })), 'rays', [SCX, PY1, 0], null, false);
    rays.receiveShadow = false; rays.raycast = () => {}; g.add(rays);
    /* The motes. Their ride is closed-form in the beat's time, so any moment
       can be posed. NOT additive, unlike the glow and the rays: added to the
       lounge's birch and cream, gold saturates to white (the first review
       sheet — the sparkles barely showed). Alpha-blended with alpha per point
       (r128's vertexAlpha), they read gold on light and dark alike. */
    function motes(name, n, size, soft, tint) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) REST.toArray(pos, i * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); for (let i = 0; i < n; i++) { col[i * 4] = tint[0]; col[i * 4 + 1] = tint[1]; col[i * 4 + 2] = tint[2]; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
      const mat = new THREE.PointsMaterial({ map: dotTex(soft), size, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false });
      mat.vertexAlpha = true;
      const pts = new THREE.Points(geo, mat);
      pts.name = name; pts.frustumCulled = false; pts.userData.ride = []; g.add(pts); return pts;
    }
    const sparkles = motes('sparkles', 60, 0.018, false, [1, 0.78, 0.26]), bokeh = motes('bokeh', 14, 0.042, true, [1, 0.86, 0.48]);
    /* A fresh flight for each reveal: born over the spread (thicker at its
       middle), rising, drifting, twinkling. All are dead by 3650 ms.
       Its OWN generator (mulberry32, one seed per reveal), never the
       schedule's: ~500 draws per reveal from the shared LCG made the next pick
       a stride-506 sample of it, and those correlate — a planted 45/55 split
       still came out 35% reveals, in streaks. */
    let revealN = 0;
    function seedMotes() {
      let ms = (20260926 + 7919 * revealN++) >>> 0;
      const rnd = () => { ms = (ms + 0x6D2B79F5) >>> 0; let t = ms; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      [[sparkles, 450, 2250, 900, 500, 0.10, 0.12, 1], [bokeh, 350, 2100, 1100, 450, 0.05, 0.07, 0.55]].forEach(([p, b0, b1, l0, l1, r0, r1, br]) => {
        p.userData.ride = [];
        for (let i = 0; i < p.geometry.attributes.position.count; i++) p.userData.ride.push({
          tb: b0 + rnd() * (b1 - b0), L: l0 + rnd() * l1,
          x: SCX + (rnd() + rnd() - 1) * 0.17, z: (rnd() + rnd() - 1) * H * 0.42,
          rise: r0 + rnd() * r1, dx: (rnd() - 0.5) * 0.06, dz: (rnd() - 0.5) * 0.04,
          tw: 0.006 + rnd() * 0.012, ph: rnd() * 6.283, br: br * (0.6 + 0.4 * rnd()) });
      });
    }
    function motesAt(p, e, m) {
      const pos = p.geometry.attributes.position, col = p.geometry.attributes.color; let any = false;
      p.userData.ride.forEach((q, i) => {
        const u = (e - q.tb) / q.L;
        if (!(u > 0 && u < 1) || m <= 0) { col.setW(i, 0); return; }
        const a = Math.pow(Math.sin(Math.PI * u), 0.8) * (0.62 + 0.38 * Math.sin(q.tw * e + q.ph)) * q.br * m;
        pos.setXYZ(i, q.x + q.dx * u + 0.006 * Math.sin(u * 7 + q.ph), PY1 + 0.004 + q.rise * louEaseOutCubic(u), q.z + q.dz * u);
        col.setW(i, Math.min(1, a)); any = true;
      });
      pos.needsUpdate = true; col.needsUpdate = true; p.visible = any;
    }
    function restFx() {
      glow.visible = false; glow.material.opacity = 0; glow.scale.setScalar(0.001); glow.position.copy(REST);
      rays.visible = false; rays.material.opacity = 0; rays.scale.setScalar(0.001);
      [sparkles, bokeh].forEach(p => { const pos = p.geometry.attributes.position, col = p.geometry.attributes.color;
        for (let i = 0; i < pos.count; i++) { pos.setXYZ(i, REST.x, REST.y, REST.z); col.setW(i, 0); }
        pos.needsUpdate = true; col.needsUpdate = true; p.visible = false; });
      pageM.emissiveIntensity = 0; inM.emissiveIntensity = 0;
    }
    restFx();
    // the cover's path in each beat (the door owns it once a tap cancels the beat)
    const peekAngle = e => e < 380 ? PEEK_A * louEaseOutCubic(e / 380)
      : e < 1150 ? PEEK_A + 0.015 * Math.sin(2 * Math.PI * (e - 380) / 770)
      : e < 1480 ? PEEK_A * (1 - Math.pow((e - 1150) / 330, 2))                  // it drops: gravity, ease-in
      : e < 1700 ? 0.03 * Math.sin(Math.PI * (e - 1480) / 220) : 0;              // and bumps
    const revealAngle = e => e < 950 ? swingAt(0, Math.PI, e / 950) : e < 2850 ? Math.PI : e < 3750 ? swingAt(Math.PI, 0, (e - 2850) / 900) : 0;
    /* the beat's light at time e, times m (1, or the fade under a tap) */
    function fxAt(name, e, m) {
      if (name === 'peek') {
        const k = m * Math.max(0, Math.min(1, peekAngle(e) / PEEK_A)) * (0.94 + 0.06 * Math.sin(e * 0.013));
        glow.visible = k > 0.01; glow.position.set(PX1 - 0.012, PY1 + 0.007, 0.01);
        glow.scale.setScalar(glow.visible ? 0.07 + 0.11 * k : 0.001); glow.material.opacity = Math.min(1, 1.1 * k);
        pageM.emissiveIntensity = k > 0.01 ? 0.7 * k : 0; return;
      }
      const G = m * smooth(250, 900, e) * (1 - smooth(2500, 3000, e)) * (1 + 0.06 * Math.sin(e * 0.011));
      const on = G > 0.01;
      glow.visible = on; glow.position.set(SCX, PY1 + 0.035, 0);
      glow.scale.setScalar(on ? 0.14 + 0.26 * G : 0.001); glow.material.opacity = 0.8 * Math.min(1, G);
      rays.visible = on; rays.material.opacity = on ? 0.55 * Math.min(1, G) : 0; rays.rotation.y = e * 0.00012;
      if (on) rays.scale.set(1.6, 0.3 + 0.5 * Math.min(1, G), 1); else rays.scale.setScalar(0.001);
      pageM.emissiveIntensity = on ? 0.5 * G : 0; inM.emissiveIntensity = on ? 0.18 * G : 0;
      motesAt(sparkles, e, m); motesAt(bokeh, e, m);
    }
    function runBeat(name, e) { beatE = e; setAngle(name === 'peek' ? peekAngle(e) : revealAngle(e)); fxAt(name, e, 1); }
    /* A tap mid-beat: the beat stops, its light carries on fading from where it was. */
    function cancelBeat() {
      if (beat !== null && beatT0 !== null) fading = { name: beat, e: beatE, t0: null };
      beat = null; beatT0 = null; beatAt = null;
    }
    const restAll = () => { setAngle(0); restFx(); };

    const api = {
      isOpen: () => isOpen,
      angle: () => theta,
      /* Open. Resolves once the cover has landed; `instant` is reduced motion.
         Mid-beat, the swing starts from wherever the beat had the cover. */
      open(opt = {}) {
        if (isOpen && swing) return swing.promise;
        if (isOpen) return Promise.resolve();
        cancelBeat(); isOpen = true;
        if (opt.instant) { swing = null; fading = null; restFx(); setAngle(Math.PI); return Promise.resolve(); }
        return startSwing(Math.PI, opt.ms || LOU_BINDER_OPEN_MS);
      },
      /* Shut, at once. A swing still running is abandoned and its promise
         never resolves, so a door the scene gave up on cannot fire later. */
      close() { swing = null; isOpen = false; beat = null; beatT0 = null; beatAt = null; fading = null; restAll(); },
      reset() { api.close(); },
      /* The fallback when no host supplies openStickerbook: a toggle, as before. */
      openCover(instant) {
        cancelBeat();
        const to = isOpen ? 0 : Math.PI; isOpen = !isOpen;
        if (instant) { swing = null; fading = null; restFx(); setAngle(to); return; }
        startSwing(to, LOU_BINDER_OPEN_MS);
      },
      setCollection, collection: () => coll,
      /* Where the camera should look to fill the view with the open spread:
         its centre, a normal leaning toward the couch (straight down would put
         the camera's up vector on its line of sight), and the spread's size. */
      focusPose() {
        g.updateWorldMatrix(true, false);
        const x0 = X0 - LC, x1 = W / 2;
        return { point: new THREE.Vector3((x0 + x1) / 2, T * 0.6, 0).applyMatrix4(g.matrixWorld),
                 normal: new THREE.Vector3(0, 0.94, 0.34).normalize().transformDirection(g.matrixWorld),
                 w: (x1 - x0) * 1.04, h: H * 1.04 };
      },
      /* start a named beat now — for the review sheet and the harness */
      startBeat(name) {
        if (!BEAT_MS[name] || isOpen || swing) return false;
        fading = null; restFx(); beat = name; beatT0 = null; if (name === 'reveal') seedMotes(); return true;
      },
      currentBeat: () => beat,
      tick(now, dt, reduced) {
        let active = false;
        if (swing) {
          if (swing.t0 === null) swing.t0 = now;
          const p = Math.min(1, (now - swing.t0) / swing.ms);
          setAngle(swingAt(swing.from, swing.to, p));
          if (p >= 1) { setAngle(swing.to); const r = swing.res; swing = null; if (r) r(); }
          else active = true;
        }
        if (fading) {
          if (fading.t0 === null) fading.t0 = now;
          const p = (now - fading.t0) / FADE_MS;
          if (p >= 1 || reduced) { fading = null; restFx(); }
          else { fxAt(fading.name, fading.e + (now - fading.t0), 1 - p); active = true; }
        }
        if (reduced || isOpen || swing) { if (beat) { beat = null; beatT0 = null; restAll(); } beatAt = null; return active; }
        if (beat === null) {
          if (beatAt === null) beatAt = now + gap();
          else if (now >= beatAt) { beat = pick(); beatT0 = now; if (beat === 'reveal') seedMotes(); }
        }
        if (beat !== null) {
          if (beatT0 === null) beatT0 = now;
          const e = now - beatT0;
          if (e >= BEAT_MS[beat]) { beat = null; beatT0 = null; beatAt = now + gap(); restAll(); }
          else { runBeat(beat, e); active = true; }
        }
        return active;
      },
    };
    g.userData.api = api;
    g.userData.louBinder = { W, H, T, R, CT, X0, LC, PIPE };   // for the harness: measured against, never re-derived from
    return g;
  }
  LOU_BUILDERS.binder = (ctx) => louBuildBinder(ctx.lib, ctx.stickers.list || [], ctx.stickers.base || '');

  /* Pure: which image goes in which ring slot. rows × panels.length slots,
     filled in manifest order and repeating — so a 9-panel set fills one row of
     nine, and a second row repeats from the start. */
  function louLampSlots(manifest) {
    const rows = Math.max(1, manifest.rows | 0), panels = manifest.panels || [], out = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < panels.length; col++) { const p = panels[(row * panels.length + col) % panels.length]; out.push({ id: p.id, image: p.image, row, col }); }
    return out;
  }

  /* The photo lamp (prop round 6, owner, 23 Sep 2026), to the owner's mockup
     (the owner's reference render, archived with the sandbox): a turned oak puck, a frosted tube on
     a brass sleeve standing in its middle, and round it a brass CAGE — a
     double hoop at the top, a hoop seated in a groove in the puck, and 2n thin
     rods — carrying two tiers of polaroids, n to a tier, each hung from a
     brass clip on its rod. The tiers are staggered half a pitch, the lower one
     a little inside the upper, so it reads as hung behind it.
     The pictures still come from the manifest (data/lamp/), in order, two
     tiers always — louLampSlots with rows ≥ 2. The lower tier is turned a
     further half-turn so a portrait never hangs straight under itself.
     Fixed colours, no design roles — the binder's precedent: this is a thing
     in the room, not the player's.
     Only the cage turns; the puck and the tube stand still. Drag-to-flick with
     friction, as before — the lamp's door (LOU_ACTIONS `flick`) is unchanged. */
  const LOU_LAMP_TIERS = 2;
  function louBuildLamp(lib, lampPanels, opt = {}) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, 'lamp');
    const std = o => new THREE.MeshStandardMaterial(o);
    const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const man = (lampPanels && lampPanels.manifest) || {}, panels = man.panels || [], n = panels.length;
    const slots = louLampSlots(Object.assign({}, man, { panels, rows: Math.max(LOU_LAMP_TIERS, man.rows | 0) })).filter(s => s.row < LOU_LAMP_TIERS);
    const base = (lampPanels && lampPanels.base) || '';

    // ── sizes, metres. B is the puck's top; everything above is measured from it.
    const BR = 0.092, BH = 0.034, B = BH;
    const CR = 0.082, TOPY = B + 0.200;                   // the cage: rod circle, top hoop
    const TR = 0.034, SLEEVE = 0.032, TUBE_TOP = B + 0.172;
    const TIER_R = [0.090, 0.0855];                       // upper tier outside, lower tier inside it
    const RODS = n > 0 ? 2 * n : 18;
    /* A card's width follows the tier's pitch, so a longer manifest shrinks the
       photos rather than overlapping them. Polaroid proportions: a narrow
       border round a portrait window, a deep chin. */
    const chord = n > 0 ? 2 * TIER_R[1] * Math.sin(Math.PI / n) : 0.06;
    const CW = Math.min(0.058, chord * 0.97), FW = CW * 0.845, FH = FW * 1.18, SIDE = (CW - FW) / 2, CHIN = CW * 0.235;
    const CH = SIDE + FH + CHIN, CT = 0.0012;
    const CLIP_Y = [B + 0.170, B + 0.170 - CH - 0.0065];  // each tier's clip line (a card's top edge)

    // ── materials
    /* Honey oak with a grain you can see from the couch — lib.tex.wood is the
       room's birch, a whisper of grain meant for large surfaces. The lathe's u
       runs round the puck, so rows here become grain lines round its side and
       growth rings on its top. */
    const oakT = (() => {
      const c = lib.makeCanvas(512, 256), x = c.getContext('2d'); let s = 11; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      x.fillStyle = '#d4a86f'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,236,200,0.10)' : 'rgba(120,70,20,0.07)'; x.fillRect(0, r() * 256, 512, 4 + r() * 14); }
      for (let i = 0; i < 130; i++) {
        const y0 = r() * 256, amp = 0.6 + r() * 2.2, f = 40 + r() * 90, ph = r() * 6;
        x.strokeStyle = r() < 0.75 ? '#8d5d2c' : '#f3d6a6'; x.globalAlpha = 0.07 + r() * 0.2; x.lineWidth = 0.6 + r() * 1.6; x.beginPath();
        for (let xx = 0; xx <= 512; xx += 8) x[xx ? 'lineTo' : 'moveTo'](xx, y0 + Math.sin(xx / f + ph) * amp + Math.sin(xx / 13 + i) * 0.4);
        x.stroke();
      }
      x.globalAlpha = 1;
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.encoding = THREE.sRGBEncoding; return t;
    })();
    const oak = std({ map: oakT, bumpMap: oakT, bumpScale: 0.0004, roughness: .5, metalness: 0 });
    const brass = std({ color: '#d9a94e', roughness: .26, metalness: .92 });
    const frame = std({ color: '#f5f2ec', emissive: '#ffdcaa', emissiveIntensity: 0, roughness: .72, metalness: 0 });   // lit, the paper glows through
    const TUBE_REST = 0.06;
    const tubeM = std({ color: '#f8f5ef', emissive: '#ffd9a6', emissiveIntensity: TUBE_REST, roughness: .85, metalness: 0 });

    // ── the puck: rounded top and bottom edges, a groove the cage's foot hoop sits in
    const prof = [];
    const arc = (cx, cy, r, a0, a1, k) => { for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; prof.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); } };
    prof.push(new THREE.Vector2(0, 0));
    arc(BR - 0.004, 0.004, 0.004, -Math.PI / 2, 0, 6);
    arc(BR - 0.010, BH - 0.010, 0.010, 0, Math.PI / 2, 10);
    [[CR + 0.0032, BH], [CR + 0.0028, BH - 0.0024], [CR - 0.0028, BH - 0.0024], [CR - 0.0032, BH], [0, BH]].forEach(p => prof.push(new THREE.Vector2(p[0], p[1])));
    g.add(louMesh(THREE, new THREE.LatheGeometry(prof, 96), oak, 'base', [0, 0, 0]));

    /* ── DRAW CALLS, not triangles, are this prop's cost. Measured 23 Sep 2026:
       the first build was 66 meshes against the greybox's 28, and the live
       lounge fell from ~1.5 to ~1.1 fps under SwiftShader (each draw has a
       fixed price, in the colour pass and again in the sun's shadow pass) —
       enough to fail visual-shell's walk-back-in check every run. So parts that
       never move apart are merged at build, and the photos, which DO move
       apart (the jiggle swings each one), are merged too and posed by
       rewriting their vertices from invisible pivots (pose(), below).
       parts: [geometry, position, euler]; indexed geometry only. */
    const merge = parts => {
      const pos = [], nor = [], idx = []; let off = 0;
      parts.forEach(([geo, p, r]) => {
        const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
        const c = geo.clone(); c.applyMatrix4(m); const a = c.attributes.position, q = c.attributes.normal;
        for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); }
        c.index.array.forEach(v => idx.push(v + off)); off += a.count; c.dispose(); geo.dispose();
      });
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx); return out;
    };
    const QX = [Math.PI / 2, 0, 0];

    // ── the tube: brass sleeve, frosted body, brass rim and cap. Two meshes.
    //    Never a shadow caster — the lamp's light stands inside it.
    const tube = new THREE.Group(); tube.name = 'tube'; g.add(tube);
    const bodyH = TUBE_TOP - (B + SLEEVE);
    tube.add(louMesh(THREE, merge([
      [new THREE.CylinderGeometry(TR + 0.0016, TR + 0.0022, SLEEVE, 64), [0, B + SLEEVE / 2, 0]],
      [new THREE.TorusGeometry(TR + 0.0017, 0.0011, 8, 64), [0, B + SLEEVE, 0], QX],
      [new THREE.CylinderGeometry(TR + 0.0012, TR + 0.0012, 0.005, 64, 1, true), [0, TUBE_TOP - 0.0025, 0]],
      [new THREE.TorusGeometry(TR + 0.0012, 0.0010, 8, 64), [0, TUBE_TOP, 0], QX]]), brass, 'tubeBrass', [0, 0, 0], null, false));
    tube.add(louMesh(THREE, merge([
      [new THREE.CylinderGeometry(TR, TR, bodyH, 64, 1, true), [0, B + SLEEVE + bodyH / 2, 0]],
      [new THREE.CircleGeometry(TR + 0.0008, 64), [0, TUBE_TOP - 0.0012, 0], [-Math.PI / 2, 0, 0]]]), tubeM, 'tubeBody', [0, 0, 0], null, false));

    // ── the cage. `rig` is what the jiggle shakes (tilting about the puck's
    //    top); `spinGroup` inside it is what turns. Hoops and rods: one mesh.
    const rig = new THREE.Group(); rig.name = 'rig'; rig.position.set(0, B, 0); g.add(rig);
    const spin = new THREE.Group(); spin.name = 'spinGroup'; spin.position.set(0, -B, 0); rig.add(spin);
    spin.add(louMesh(THREE, merge([
      [new THREE.TorusGeometry(CR + 0.0004, 0.0018, 8, 96), [0, TOPY, 0], QX],
      [new THREE.TorusGeometry(CR + 0.0004, 0.0015, 8, 96), [0, TOPY - 0.0068, 0], QX],
      [new THREE.TorusGeometry(CR, 0.0014, 8, 96), [0, B - 0.0010, 0], QX],
      ...Array.from({ length: RODS }, (_, r) => { const a = r * Math.PI * 2 / RODS; return [new THREE.CylinderGeometry(0.0011, 0.0011, TOPY - B + 0.002, 6, 1, true), [Math.sin(a) * CR, (TOPY + B) / 2, Math.cos(a) * CR]]; })]),
      brass, 'cage', [0, 0, 0]));

    /* One pivot per photo, at its clip: the card hangs from it, so the jiggle
       swings each photo about the point it is actually held by. Rest pose is a
       touch of twist and lean, seeded — hung by hand, not by a machine.
       The pivots are invisible transforms; what is DRAWN is three kinds of
       merged mesh posed from them: every card frame (one mesh, the only one
       that casts), every clip (one mesh), and one mesh per portrait carrying
       both of its tiers' copies (one material per image — the scene loads
       one url per material). n + 2 draws for 2n photos. */
    const cardGeo = new THREE.BoxGeometry(CW, CH, CT), filmGeo = new THREE.PlaneGeometry(FW, FH);
    const clipGeo = TIER_R.map(R => merge([
      [new THREE.BoxGeometry(0.0042, 0.0105, CT + 0.0026), [0, 0.0012, 0]],
      [new THREE.CylinderGeometry(0.0009, 0.0009, 0.0056, 8), [0, 0.0035, 0.0019], [0, 0, Math.PI / 2]],
      [new THREE.CylinderGeometry(0.0007, 0.0007, R - CR, 6), [0, 0.004, -(R - CR) / 2], QX]]));
    let hs = 20260927; const hr = () => { hs = (hs * 1664525 + 1013904223) >>> 0; return hs / 4294967296 - 0.5; };
    const pivots = [];
    slots.forEach(s => {
      const R = TIER_R[s.row], a = (s.col + s.row * (0.5 + Math.floor(n / 2))) * Math.PI * 2 / n;
      const pv = new THREE.Object3D(); pv.name = 'photo-' + s.row + '-' + s.col; pv.userData.image = base + s.image;
      pv.position.set(Math.sin(a) * R, CLIP_Y[s.row], Math.cos(a) * R); pv.rotation.order = 'YXZ'; pv.rotation.y = a; spin.add(pv);
      const card = new THREE.Object3D(); card.name = 'cardAt-' + s.row + '-' + s.col; card.position.set(0, -CH / 2, 0); pv.add(card);
      pivots.push({ pv, card, rest: { x: -0.02 + hr() * 0.03, z: hr() * 0.05, yaw: hr() * 0.06 }, a, tier: s.row, k: pivots.length, image: s.image, id: s.id });
    });
    const filmOff = new THREE.Matrix4().makeTranslation(0, CH / 2 - SIDE - FH / 2, CT / 2 + 0.0002);
    const posed = [];
    function posedMesh(name, mat, items, cast) {
      const nv = items.reduce((c, it) => c + it.tmpl.attributes.position.count, 0), uv = items.length && items.every(it => it.tmpl.attributes.uv);
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = uv ? new Float32Array(nv * 2) : null, idx = []; let off = 0;
      items.forEach(it => { const ta = it.tmpl.attributes; if (U) U.set(ta.uv.array, off * 2); it.tmpl.index.array.forEach(v => idx.push(v + off)); off += ta.position.count; });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      if (U) geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(idx);
      const m = louMesh(THREE, geo, mat, name, [0, 0, 0], null, cast); spin.add(m); posed.push({ geo, items }); return m;
    }
    posedMesh('cards', frame, pivots.map(p => ({ p, card: true, tmpl: cardGeo })), true);
    posedMesh('clips', brass, pivots.map(p => ({ p, tmpl: clipGeo[p.tier] })), false);
    const films = [];
    pivots.forEach(p => { if (!films.some(f => f.image === p.image)) films.push({ image: p.image, id: p.id, list: [] }); films.find(f => f.image === p.image).list.push(p); });
    films.forEach(f => {
      const fm = std({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0, roughness: .55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      fm.userData.louImage = base + f.image; fm.userData.louEmissiveMap = true; f.mat = fm;
      posedMesh('film-' + f.id, fm, f.list.map(p => ({ p, card: true, extra: filmOff, tmpl: filmGeo })), false);
    });
    /* Rewrite every posed vertex from its pivot. Relative to spinGroup, where
       the merged meshes sit at identity — so the idle spin, a parent
       transform, never needs a rewrite; only the build, rest() and the jiggle's
       frames do. */
    const PM = new THREE.Matrix4(), NM = new THREE.Matrix3(), pv3 = new THREE.Vector3();
    function pose() {
      pivots.forEach(p => { p.pv.updateMatrix(); p.card.updateMatrix(); });
      posed.forEach(({ geo, items }) => {
        const P = geo.attributes.position.array, N = geo.attributes.normal.array; let o = 0;
        items.forEach(it => {
          PM.copy(it.p.pv.matrix); if (it.card) PM.multiply(it.p.card.matrix); if (it.extra) PM.multiply(it.extra);
          NM.getNormalMatrix(PM); const tp = it.tmpl.attributes.position.array, tn = it.tmpl.attributes.normal.array;
          for (let i = 0; i < tp.length; i += 3) { pv3.fromArray(tp, i).applyMatrix4(PM).toArray(P, o + i); pv3.fromArray(tn, i).applyMatrix3(NM).normalize().toArray(N, o + i); }
          o += tp.length;
        });
        geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.boundingBox = null; geo.computeBoundingSphere();
      });
    }

    /* ── THE LIGHT. The lamp is OFF at rest (the mockup is a daylight shot, and
       the room is a Saturday afternoon); the `light` beat switches it on for a
       moment. Everything here is dark and shrunk at rest:
         lampFill   a small PointLight, no shadow: the warm spill on the boards
                    above and below.
         lampPool   the light on the bookshelf wall, WITH the cage's shadows in
                    it — a canvas the lamp draws itself, projecting the real
                    rods, hoops and photos from the bulb onto the back panel.
         lampGlow   an additive halo sprite round the tube.
       Not a shadow-casting light, on purpose: the first build used a SpotLight
       with castShadow, its map rendered only while lit — and it still cost
       every frame at rest, because a second caster puts a second shadow lookup
       into every lit material's shader whatever its intensity. visual-prm's
       two frame-rate checks failed with it and passed with castShadow off. The
       room keeps its one caster, the sun (spec 2026-09-19 § 3.2); toggling
       castShadow per beat instead would recompile every material, twice a beat.
       The lights are added once, at build — never added or removed later, for
       the same recompile.
       The pool is blended dst × (1 + src): light ON the wood, in the wood's own
       colour — never additive, which whites a pale surface out (DD-24). */
    const HEART = new THREE.Vector3(0, B + 0.105, 0);
    const FILL_I = 0.55;
    const fill = new THREE.PointLight('#ffd6a0', 0, 0.6, 2); fill.name = 'lampFill'; fill.position.copy(HEART); g.add(fill);
    const WALL_Z = opt.wallZ !== undefined ? opt.wallZ : -0.115;   // the back panel's face, lamp-local
    /* The pool: x centred on the lamp, y from the lamp's foot up. 256 px
       across 0.6 m on purpose — bilinear magnification IS the shadows' soft
       edge. The first build drew 512 px and blurred every shape with
       ctx.filter: under SwiftShader that halved the room's frame rate for as
       long as the lamp was lit (0.67 fps held lit, 1.40 at rest), and the cost
       lands at the upload, inside render(), where a timer on drawPool sees
       nothing (it measured 0.7 ms). */
    const PW = 0.60, PH = 0.355, PX = 256, PY = 151, PPM = PX / PW;
    const poolC = lib.makeCanvas(PX, PY), poolX = poolC.getContext('2d', { willReadFrequently: true });   // a CPU canvas: its upload is a memory copy, not a GPU readback
    /* premultiplied on upload: the blend reads colour only, never alpha, so the
       gradient's fade and every cut-out shadow have to live IN the colour */
    const poolT = new THREE.CanvasTexture(poolC); poolT.encoding = THREE.sRGBEncoding; poolT.premultiplyAlpha = true;
    const pool = louMesh(THREE, new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: poolT, transparent: true, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.OneFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'lampPool', [0, 0, 0], null, false);
    pool.receiveShadow = false; pool.raycast = () => {}; g.add(pool);
    /* Project a lamp-local point from the bulb onto the wall plane; null when it
       is not between the bulb and the wall (the front half throws no shadow
       back). */
    const ZC = HEART.z - 0.003;
    const proj = p => { const s = (WALL_Z - HEART.z) / (p.z - HEART.z); return [(HEART.x + (p.x - HEART.x) * s + PW / 2) * PPM, (PH - (HEART.y + (p.y - HEART.y) * s)) * PPM]; };
    const clipZ = poly => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = a.z < ZC, ib = b.z < ZC;
      if (ia) out.push(a); if (ia !== ib) out.push(a.clone().lerp(b, (ZC - a.z) / (b.z - a.z))); } return out; };
    const inv = new THREE.Matrix4(), mm = new THREE.Matrix4(), V = () => new THREE.Vector3();
    const cardCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const hoopRing = (y, r) => Array.from({ length: 49 }, (_, i) => new THREE.Vector3(Math.sin(i * Math.PI / 24) * r, y, Math.cos(i * Math.PI / 24) * r));
    const HOOPS = [[hoopRing(TOPY, CR), 0.0036], [hoopRing(TOPY - 0.0068, CR), 0.003], [hoopRing(B - 0.001, CR), 0.0028]];
    let shapes = { cards: 0, rods: 0 };
    function drawPool(k) {
      const x = poolX; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, PX, PY);
      const cx = (HEART.x + PW / 2) * PPM, cy = (PH - HEART.y) * PPM, gr = x.createRadialGradient(cx, cy, 0, cx, cy, 0.30 * PPM);
      gr.addColorStop(0, `rgba(255,214,160,${(0.75 * k).toFixed(3)})`); gr.addColorStop(0.4, `rgba(255,200,140,${(0.42 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,190,120,0)');
      x.fillStyle = gr; x.fillRect(0, 0, PX, PY);
      g.updateMatrixWorld(true); inv.copy(g.matrixWorld).invert();
      const local = (o, p) => p.applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld));
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,0.82)'; x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineCap = 'round';
      let cards = 0, rods = 0;
      pivots.forEach(p => {
        const c = clipZ(cardCorners.map(([sx, sy]) => local(p.card, V().set(sx * CW / 2, sy * CH / 2, 0))));
        if (c.length < 3) return; cards++;
        x.beginPath(); c.forEach((q, i) => { const [u, v] = proj(q); if (i) x.lineTo(u, v); else x.moveTo(u, v); }); x.closePath(); x.fill();
      });
      for (let r = 0; r < RODS; r++) {
        const a = r * Math.PI * 2 / RODS, seg = clipZ([local(spin, V().set(Math.sin(a) * CR, B, Math.cos(a) * CR)), local(spin, V().set(Math.sin(a) * CR, TOPY, Math.cos(a) * CR))]);
        if (seg.length < 2) continue; rods++;
        const s0 = (WALL_Z - HEART.z) / (seg[0].z - HEART.z); x.lineWidth = Math.max(1, 0.0022 * s0 * PPM);
        const [u0, v0] = proj(seg[0]), [u1, v1] = proj(seg[1]); x.beginPath(); x.moveTo(u0, v0); x.lineTo(u1, v1); x.stroke();
      }
      HOOPS.forEach(([ring, w]) => { const pts = ring.map(p => local(spin, p.clone()));
        for (let i = 0; i < pts.length - 1; i++) { if (pts[i].z >= ZC || pts[i + 1].z >= ZC) continue;
          const s0 = (WALL_Z - HEART.z) / (pts[i].z - HEART.z); x.lineWidth = Math.max(1, w * s0 * PPM);
          const [u0, v0] = proj(pts[i]), [u1, v1] = proj(pts[i + 1]); x.beginPath(); x.moveTo(u0, v0); x.lineTo(u1, v1); x.stroke(); } });
      x.globalCompositeOperation = 'source-over';
      shapes = { cards, rods }; poolT.needsUpdate = true;
    }
    const glowTex = (() => { const c = lib.makeCanvas(128, 128), x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.3, 'rgba(255,205,140,0.5)'); gr.addColorStop(0.65, 'rgba(255,170,90,0.12)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc47a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.name = 'lampGlow'; glow.raycast = () => {}; g.add(glow);

    /* ── THE IDLE (owner, 23 Sep 2026). The cage always turns slowly — that is
       the lamp's resting life, like the dial and the jukebox's records. Over it
       two beats, weighted, never the light twice running:
         jiggle  60%  the lamp is knocked: the cage shakes for a moment and every
                      photo swings on its clip, outward only (inward is the
                      rods), each a beat after the last, and settles
         light   40%  it clicks on — a flicker, a warm hold, a fade — and the
                      photos glow through and throw their shadows on the wall
       Seeded, so a review pose is exact. Both end exactly at rest; under reduced
       motion there are no beats and no spin (as before). */
    const BEAT_MS = { jiggle: 2000, light: 3000 };
    let beat = null, beatT0 = null, beatAt = null, lastBeat = '', beatSeed = 20260928;
    const rnd = () => { beatSeed = (beatSeed * 1664525 + 1013904223) >>> 0; return beatSeed / 4294967296; };
    const gap = () => 4500 + rnd() * 4500;
    const pick = () => lastBeat === 'light' ? 'jiggle' : (rnd() < 0.6 ? 'jiggle' : 'light');
    let level = 0;
    function setLight(k) {
      level = k; const on = k > 0.002;
      fill.intensity = FILL_I * k;
      /* at rest the pool waits shrunk inside the tube (Box3 counts invisible meshes) */
      pool.visible = on; if (on) { pool.position.set(0, PH / 2, WALL_Z + 0.001); pool.scale.setScalar(1); drawPool(k); } else { pool.position.copy(HEART); pool.scale.setScalar(0.001); }
      tubeM.emissiveIntensity = TUBE_REST + 2.4 * k;
      films.forEach(f => { f.mat.emissiveIntensity = 0.55 * k; }); frame.emissiveIntensity = 0.28 * k;
      glow.visible = on; glow.material.opacity = 0.55 * k;
      if (on) { glow.position.copy(HEART); glow.scale.setScalar(0.16 + 0.06 * k); } else { glow.position.copy(HEART); glow.scale.setScalar(0.001); }
    }
    function setSwing(e) {
      const t = e / 1000, fade = 1 - sstep(1.55, 2.0, t);
      const sh = t < 0.6 ? Math.exp(-t / 0.13) * Math.sin(2 * Math.PI * 11 * t) : 0;
      rig.position.x = 0.0025 * sh * fade; rig.rotation.z = 0.03 * sh * fade; rig.rotation.x = 0.015 * sh * fade * Math.cos(2 * Math.PI * 7 * t);
      pivots.forEach(p => {
        const d = p.tier * 0.035 + ((p.k * 37) % 9) * 0.011, u = t - d;
        let x = 0, z = 0;
        if (u > 0) { const env = Math.exp(-u / 0.42) * fade, w = 2 * Math.PI * (3.1 + 0.25 * Math.sin(p.k * 2.3));
          x = -0.2 * env * (0.5 - 0.5 * Math.cos(w * u)); z = 0.065 * env * Math.sin(w * 0.8 * u + p.k); }
        p.pv.rotation.set(p.rest.x + x, p.a, p.rest.z + z);   // YXZ: turn to face out, swing about the clip, sway
      });
      pose();
    }
    /* the light's path: a double flicker up, a warm hold with a slow breath, a fade */
    const lightAt = e => e < 90 ? 0.85 * e / 90 : e < 170 ? 0.85 - 0.6 * (e - 90) / 80 : e < 260 ? 0.25 + 0.75 * (e - 170) / 90
      : e < 2300 ? 1 - 0.04 * (0.5 - 0.5 * Math.cos((e - 260) * 0.004)) : e < 2900 ? 1 - sstep(2300, 2900, e) : 0;
    function rest() {
      rig.position.set(0, B, 0); rig.rotation.set(0, 0, 0);
      pivots.forEach(p => { p.pv.rotation.set(p.rest.x, p.a, p.rest.z); p.card.rotation.y = p.rest.yaw; }); pose();
      setLight(0);
    }
    rest();
    function runBeat(name, e) { if (name === 'jiggle') setSwing(e); else setLight(lightAt(e)); }

    const IDLE = 0.21;   // rad/s ≈ 2 rpm
    let vel = IDLE, dragging = false, held = null;
    const api = {
      flick(v) { vel = v; dragging = false; },
      nudge(v) { dragging = true; spin.rotation.y += v; },
      /* start a named beat now — for the review sheet and the harness */
      startBeat(name) { if (!BEAT_MS[name]) return false; held = null; rest(); beat = lastBeat = name; beatT0 = null; return true; },
      /* Freeze a beat at one moment, cage still — for a screenshot of the live
         room, where a SwiftShader capture outlasts the beat. hold(null) lets go. */
      hold(name, at) { beat = null; beatT0 = null; beatAt = null; rest(); held = BEAT_MS[name] ? { name, at: +at || 0 } : null; if (held) runBeat(held.name, held.at); return !!held; },
      currentBeat: () => beat,
      lightLevel: () => level,
      tick(now, dt, reduced) {
        if (held) { runBeat(held.name, held.at); return true; }
        if (reduced) { if (beat || level) { beat = null; beatT0 = null; rest(); } beatAt = null; dragging = false; return false; }
        if (dragging) dragging = false;
        else { vel *= Math.pow(0.955, dt * 60); if (Math.abs(vel) < IDLE) vel += (IDLE - vel) * 0.02; spin.rotation.y += vel * dt; }
        if (beat === null) {
          if (beatAt === null) beatAt = now + gap();
          else if (now >= beatAt) { beat = lastBeat = pick(); beatT0 = now; }
        }
        if (beat !== null) {
          if (beatT0 === null) beatT0 = now;
          const e = now - beatT0;
          if (e >= BEAT_MS[beat]) { beat = null; beatT0 = null; beatAt = now + gap(); rest(); }
          else runBeat(beat, e);
        }
        return true;
      },
      /* what the last pool drew: projected photos and rods (the harness's window on a canvas it cannot read) */
      poolShapes: () => Object.assign({}, shapes),
    };
    g.userData.api = api;
    g.userData.louLamp = { BR, BH, CR, TOPY, TIER_R, CLIP_Y, CW, CH, RODS, n, HEART: HEART.toArray(), WALL_Z, PW, PH, CLIP_V: clipGeo[0].attributes.position.count };
    return g;
  }
  /* Where the shelf's back panel is, in the lamp's frame — the pool is drawn
     on it. The panel is a 10 mm board against the back wall (lounge-room.js
     `shelfBack`); the lamp stands unrotated. A mount with no room (the review
     sheet) gets the room's own figure. */
  function louLampWallZ(roomData) { const R = roomData && roomData.louRoom; return R ? (R.backZ + 0.01) - LOU_PLACES.lamp.pos[2] : -0.115; }
  LOU_BUILDERS.lamp = (ctx) => louBuildLamp(ctx.lib, ctx.lampPanels, { wallZ: louLampWallZ(ctx.roomData) });

  /* The bookshelf's dressing (room pass, item 15, 25 Sep 2026). The owner: "fill out the top two
     shelves … fun stuff, along with the books": a dinosaur, a rocket, animal figures; no people or
     characters, and nothing that lights. The round-1 boxes and trinkets are gone, and the easter-egg
     seam with them (deferred, docs/deferred-work.md). Looks only: nothing here is a pick target.

     Everything merges into TWO meshes, one per finish (mats.shelfBooks, cloth-bound board; and
     mats.shelfToys, painted plastic), with fixed colours per vertex. Each vertex also takes the shelf's
     own bay term (S.cav, the function lounge-room.js bakes the unit with), so the contents darken toward
     the back and under the board above exactly as the bay around them does, plus a 1 cm contact band
     where anything meets a board. The grade is the only shader work (lou-scene).

     A part is built in its own frame, painted THERE (a colour, or fn(p, n) of its local position and
     normal), then placed. Books are painted by face: a BoxGeometry has its own four vertices per face,
     so the spine and boards take the cover and the edges take the pages, with no seam to hide.
     Bay frame: x across from the bay's inner left side, y up from the board's top, z out from the
     unit's centre line. Deterministic: the only randomness is a fixed-seed stream. */
  const LOU_SHELF_COVERS = ['#b06a72', '#6e8f6a', '#4f8488', '#c49a45', '#6e4f78', '#d8ccb0', '#3a4868', '#c4705a', '#9a86b8', '#48664f', '#a35f45', '#6f97b8'];
  function louBuildShelf(lib, S) {
    const { THREE } = lib, V = THREE.Vector3, g = new THREE.Group();
    if (!S) return g;   // the review sheet mounts props with no room
    const C = (h) => new THREE.Color(h), E = (r) => new THREE.Euler(...(r || [0, 0, 0]));
    const M = (p, r, s) => new THREE.Matrix4().compose(new V(...(p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(E(r)), new V(...(s || [1, 1, 1])));
    let seed = 15; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const lists = { books: [], toys: [] }, items = [];
    const bays = [S.ys[1] + 0.01, S.ys[2] + 0.01], ceils = [S.ys[2] - 0.01, S.topUnder], x0 = S.x - S.inner;
    const bayAt = (bay, x, z, rotY) => M([x0 + x, bays[bay], S.z + z], [0, rotY || 0, 0]);
    /* an item: a name, its bay, and the parts it adds, in its own frame (origin at its foot) */
    const item = (id, bay, base) => {
      const box = new THREE.Box3(), rec = { id, bay, box, tris: 0 }; items.push(rec);
      return (list, geo, paint, p, r, s) => {   // p may be a whole local Matrix4
        const m = base.clone().multiply(p && p.isMatrix4 ? p : M(p, r, s)); lists[list].push({ geo, paint, m });
        const a = geo.attributes.position, v = new V(); rec.tris += (geo.index ? geo.index.count : a.count) / 3; for (let i = 0; i < a.count; i++) box.expandByPoint(v.fromBufferAttribute(a, i).applyMatrix4(m));   // exact, not a turned box's box
        return m;
      };
    };
    const PAGE = C('#e6dcc4'), INK = C('#231d24');
    const ball = (w, s = 16, r = 12) => new THREE.SphereGeometry(1, s, r).scale(...[].concat(w).concat(w, w).slice(0, 3));
    /* a tube along pts whose radius runs r0 → r1: TubeGeometry's rings pulled in about their own centres
       (its normals stay radial, which is all a gentle taper needs) */
    const tube = (pts, r0, r1, segs = 12, rad = 8) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new V(...p))), geo = new THREE.TubeGeometry(curve, segs, 1, rad, false);
      const p = geo.attributes.position, v = new V();
      for (let i = 0; i <= segs; i++) {
        const c = curve.getPointAt(i / segs), r = r0 + (r1 - r0) * i / segs;
        for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); }
      }
      return geo;
    };
    const eyes = (add, at, spread, r = 0.0022) => [-1, 1].forEach(s => add('toys', ball(r, 6, 4), INK, [at[0], at[1], at[2] + s * spread]));

    /* A book: w thick, h tall, d deep, its spine at +z, standing on y = 0. `style` dresses the spine:
       0 plain, 1 two gilt bands, 2 a pale title label, 3 one wide band in a darker shade. */
    const GILT = C('#caa55c');
    const book = (add, w, h, d, hex, style, p, r) => {
      const cover = C(hex), m = add('books', new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), (q, n) => (Math.abs(n.x) > 0.5 || n.z > 0.5 ? cover : PAGE), p, r);
      const band = (y, bh, col) => { const geo = new THREE.PlaneGeometry(w * 0.96, bh).translate(0, y, d / 2 + 0.0004).applyMatrix4(m);
        lists.books.push({ geo, paint: col, m: new THREE.Matrix4() }); };
      if (style === 1) { band(h - 0.022, 0.004, GILT); band(0.022, 0.004, GILT); }
      if (style === 2) band(h * 0.62, Math.min(0.03, h * 0.14), C('#e9e0cc'));
      if (style === 3) band(h * 0.28, 0.018, cover.clone().multiplyScalar(0.62));
    };

    let runEnd = 0;
    // ── the middle bay: a run of hardbacks, one leaning, a rocket, a stack with a dinosaur on it, blocks
    { const add = item('books-middle', 0, bayAt(0, 0, 0)); let x = 0.004, last = 0, ci = 0;
      for (let i = 0; i < 10; i++) {
        const w = 0.017 + rnd() * 0.014, h = 0.19 + rnd() * 0.07, d = 0.14 + rnd() * 0.03; ci = (ci + 1 + Math.floor(rnd() * 3)) % LOU_SHELF_COVERS.length;
        book(add, w, h, d, LOU_SHELF_COVERS[ci], i % 4 === 3 ? 0 : Math.floor(rnd() * 4), [x + w / 2, 0, 0.092 - d / 2]); x += w + 0.0015; last = h;
      }
      // the last one leans left onto the run, pivoting on its bottom-left edge; it touches the run's last top corner
      const w = 0.026, h = 0.235, d = 0.155, th = 0.2, xb = x + Math.min(h, last / Math.cos(th)) * Math.sin(th);
      const lean = new THREE.BoxGeometry(w, h, d).translate(w / 2, h / 2, 0);
      add('books', lean, (q, n) => (Math.abs(n.x) > 0.5 || n.z > 0.5 ? C('#b06a72') : PAGE), [xb, 0, 0.092 - d / 2], [0, 0, th]);
      runEnd = xb + w; }

    // the rocket: cream and coral, three fins, a porthole turned to the room
    { const add = item('rocket', 0, bayAt(0, runEnd + 0.064, -0.005, -0.5)), CREAM = C('#e3d7c0'), CORAL = C('#c4604f'), STEEL = C('#8b8680');
      const prof = [[0.0001, 0.03], [0.018, 0.03], [0.024, 0.04], [0.028, 0.07], [0.0288, 0.1], [0.0288, 0.1015], [0.0288, 0.116], [0.0288, 0.1175], [0.027, 0.15], [0.0245, 0.168], [0.024, 0.1695], [0.014, 0.196], [0.006, 0.209], [0.0001, 0.215]];
      add('toys', new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 16),
        (q) => (q.y > 0.169 || (q.y > 0.1008 && q.y < 0.1168) ? CORAL : q.y < 0.035 ? STEEL : CREAM));
      add('toys', new THREE.CylinderGeometry(0.014, 0.019, 0.02, 16), STEEL, [0, 0.022, 0]);
      const fin = new THREE.Shape(); fin.moveTo(0.022, 0.085); fin.lineTo(0.052, 0.028); fin.lineTo(0.052, 0); fin.lineTo(0.034, 0.004); fin.lineTo(0.02, 0.036); fin.closePath();
      [0, 1, 2].forEach(k => add('toys', new THREE.ExtrudeGeometry(fin, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1, curveSegments: 4 }).translate(0, 0.0012, -0.0025), CORAL, [0, 0, 0], [0, Math.PI / 2 + k * Math.PI * 2 / 3, 0]));
      // the porthole on the fin-free side, facing the rocket's +z
      add('toys', new THREE.CircleGeometry(0.0095, 18), C('#34405e'), [0, 0.134, 0.0292]);
      add('toys', new THREE.TorusGeometry(0.0098, 0.0022, 5, 16), C('#caa55c'), [0, 0.134, 0.0288]); }

    // a stack of three books lying flat, and a brontosaurus on it
    { const add = item('stack', 0, bayAt(0, runEnd + 0.214, -0.01, 0.06)); let y = 0;
      [[0.026, 0.165, 0.122, '#3a4868', 1], [0.02, 0.152, 0.116, '#c49a45', 0], [0.028, 0.142, 0.11, '#6e8f6a', 2]].forEach(([t, len, d, hex, st], i) => {
        // a book on its back: thickness up, its length across, its spine still to the room
        book(add, t, len, d, hex, st, [-len / 2 + (i - 1) * 0.006, y + t / 2, 0], [0, (i - 1) * 0.07, -Math.PI / 2]);
        y += t;
      });
      const dino = item('brontosaurus', 0, bayAt(0, runEnd + 0.207, -0.012, -0.55).multiply(M([0, y, 0])));
      const SKIN = C('#5e9a74'), BELLY = C('#a9cd93'), SPOT = C('#447a58');
      const spots = (q, n) => (n.y < -0.35 ? BELLY : (Math.sin(q.x * 9 + 1) * Math.sin(q.z * 7) * Math.cos(q.y * 5) > 0.42 && n.y > 0.1 ? SPOT : SKIN));
      dino('toys', ball(1, 18, 12), spots, [0, 0.047, 0], null, [0.046, 0.03, 0.028]);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => dino('toys', new THREE.CylinderGeometry(0.0085, 0.0098, 0.032, 8), SKIN, [sx * 0.024, 0.016, sz * 0.015]));
      dino('toys', tube([[0.028, 0.055, 0], [0.05, 0.082, 0], [0.061, 0.11, 0], [0.068, 0.126, 0]], 0.0135, 0.0072, 12, 10), SKIN);
      dino('toys', ball(1, 10, 8), SKIN, [0.077, 0.128, 0], [0, 0, -0.15], [0.0145, 0.0098, 0.0098]);
      eyes(dino, [0.082, 0.132, 0], 0.0082);
      dino('toys', tube([[-0.036, 0.05, 0], [-0.06, 0.042, 0.004], [-0.08, 0.032, 0.014], [-0.096, 0.027, 0.028]], 0.012, 0.0022, 14, 8), SKIN); }

    // shape blocks: two on the board, one on top; a raised shape on each face turned to the room
    { const add = item('blocks', 0, bayAt(0, 0.713, 0.01)), B = 0.042;
      const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.0055 : 0.013; k ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const heart = new THREE.Shape(); heart.moveTo(0, -0.012); heart.bezierCurveTo(0.004, -0.007, 0.013, -0.002, 0.012, 0.005); heart.bezierCurveTo(0.011, 0.012, 0.002, 0.012, 0, 0.006);
      heart.bezierCurveTo(-0.002, 0.012, -0.011, 0.012, -0.012, 0.005); heart.bezierCurveTo(-0.013, -0.002, -0.004, -0.007, 0, -0.012);
      const moon = new THREE.Shape(); moon.absarc(0, 0, 0.012, 0.6, Math.PI * 2 - 0.6, false); moon.absarc(0.007, 0, 0.0085, Math.PI * 2 - 1.2, 1.2, true);
      const emb = (shp) => new THREE.ExtrudeGeometry(shp, { depth: 0.0016, bevelEnabled: false, curveSegments: 6 }), CRM = C('#efe6d3');
      [[-0.023, 0, 0.14, '#c4705a', star], [0.024, 0, -0.18, '#6f97b8', heart], [0, B, 0.52, '#c49a45', moon]].forEach(([bx, by, ry, hex, shp]) => {
        const m = M([bx, by, 0], [0, ry, 0]);
        add('toys', lib.moulded(B, B, B, 0.006, { bevelSegments: 2, curveSegments: 2 }).translate(0, B / 2, 0), C(hex), m);
        add('toys', emb(shp), CRM, m.clone().multiply(M([0, B / 2, B / 2 - 0.0002])));                         // the face to the room
        add('toys', emb(shp), CRM, m.clone().multiply(M([0, B - 0.0002, 0], [-Math.PI / 2, 0, 0])));          // and the top
      }); }

    // ── the top bay, seen from below, so everything stands well forward: a few paperbacks, an elephant, a desk globe, a duck, a penguin, a turtle
    { const add = item('books-top', 1, bayAt(1, 0, 0)); let x = 0.004, ci = 5;
      for (let i = 0; i < 6; i++) {
        const w = 0.012 + rnd() * 0.01, h = 0.1 + rnd() * 0.028, d = 0.1 + rnd() * 0.02; ci = (ci + 2 + Math.floor(rnd() * 3)) % LOU_SHELF_COVERS.length;
        book(add, w, h, d, LOU_SHELF_COVERS[ci], i % 3 === 1 ? 2 : 0, [x + w / 2, 0, 0.09 - d / 2]); x += w + 0.0012;
      } }

    { const add = item('elephant', 1, bayAt(1, 0.17, 0.025, -0.5)), HIDE = C('#8e89a6'), EAR = C('#c79aa8');
      add('toys', ball(1, 16, 10), HIDE, [0, 0.043, 0], null, [0.036, 0.026, 0.025]);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => add('toys', new THREE.CylinderGeometry(0.0095, 0.0105, 0.032, 8), HIDE, [sx * 0.02, 0.016, sz * 0.013]));
      add('toys', ball(0.0205, 12, 9), HIDE, [0.037, 0.059, 0]);
      // ears: flat discs, pink on the inside (the face turned toward the head's front)
      [-1, 1].forEach(s => add('toys', ball(1, 10, 8), (q, n) => (n.x > 0.3 ? EAR : HIDE), [0.028, 0.06, s * 0.026], [0, s * 0.6, 0], [0.004, 0.019, 0.017]));
      add('toys', tube([[0.052, 0.052, 0], [0.063, 0.036, 0], [0.066, 0.02, 0], [0.074, 0.012, 0], [0.079, 0.016, 0]], 0.0068, 0.0038, 10, 7), HIDE);
      eyes(add, [0.052, 0.066, 0], 0.011, 0.0019);
      add('toys', tube([[-0.034, 0.05, 0], [-0.042, 0.038, 0], [-0.044, 0.026, 0]], 0.0018, 0.0012, 6, 5), HIDE); }

    { const add = item('globe', 1, bayAt(1, 0.335, 0.012, -0.35)), WOOD = C('#8f6a47'), BRASS = C('#b8924a');
      const SEA = C('#4a7fa6'), LAND = C('#86ad62'), ICE = C('#e6e2d6'), R = 0.043, cy = 0.074, tilt = 0.41, gx = -(R + 0.005) * Math.sin(tilt);
      add('toys', new THREE.CylinderGeometry(0.028, 0.033, 0.009, 24), WOOD, [0, 0.0045, 0]);
      add('toys', new THREE.CylinderGeometry(0.0038, 0.0045, 0.028, 10), BRASS, [0, 0.022, 0]);
      const land = (n) => { const f = Math.sin(n.x * 3.3 + 0.8) * Math.sin(n.z * 2.9 - 0.6) + 0.55 * Math.sin(n.y * 4.1 + n.x * 2.2) + 0.35 * Math.cos(n.z * 5.3 + n.y * 1.7); return f > 0.32; };
      add('toys', ball(R, 24, 16), (q, n) => (Math.abs(n.y) > 0.88 ? ICE : land(n) ? LAND : SEA), [gx, cy, 0], [0, 0, tilt]);
      // the meridian: a half ring from pole to pole down the right side, its south end on the stem (hence gx)
      add('toys', new THREE.TorusGeometry(R + 0.005, 0.0022, 5, 24, Math.PI + 0.1), BRASS, [gx, cy, 0], [0, 0, tilt - Math.PI / 2 - 0.05]); }

    { const add = item('duck', 1, bayAt(1, 0.46, 0.035, -0.6)), YEL = C('#d2a847'), BILL = C('#d0773a');
      add('toys', ball(1, 14, 10), YEL, [0, 0.021, 0], null, [0.031, 0.022, 0.024]);   // sat 1 mm into the board: a duck's bottom is flat
      add('toys', ball(1, 12, 8), YEL, [-0.027, 0.031, 0], [0, 0, 0.7], [0.012, 0.006, 0.012]);
      add('toys', ball(0.0165, 12, 9), YEL, [0.017, 0.048, 0]);
      add('toys', ball(1, 12, 8), BILL, [0.034, 0.044, 0], [0, 0, -0.1], [0.012, 0.0042, 0.0095]);
      eyes(add, [0.028, 0.054, 0], 0.0098, 0.002); }

    { const add = item('penguin', 1, bayAt(1, 0.575, 0.04, -0.5)), NAVY = C('#2d3650'), BELLY = C('#e9e3d6'), BEAK = C('#d0773a');
      add('toys', ball(1, 14, 10), (q, n) => (n.z > 0.42 && n.y < 0.75 ? BELLY : NAVY), [0, 0.033, 0], null, [0.021, 0.031, 0.019]);
      add('toys', ball(0.0145, 12, 9), (q, n) => (n.z > 0.62 && n.y < 0.3 ? BELLY : NAVY), [0, 0.067, 0.001]);
      add('toys', new THREE.ConeGeometry(0.0042, 0.011, 10), BEAK, [0, 0.065, 0.0185], [Math.PI / 2, 0, 0]);
      [-1, 1].forEach(s => add('toys', ball(1, 10, 8), NAVY, [s * 0.02, 0.035, -0.002], [0, 0, s * 0.25], [0.004, 0.017, 0.009]));
      [-1, 1].forEach(s => add('toys', ball(1, 10, 6), BEAK, [s * 0.008, 0.0018, 0.008], null, [0.0065, 0.0018, 0.0095]));
      [-1, 1].forEach(s => add('toys', ball(0.0019, 6, 4), INK, [s * 0.0055, 0.071, 0.013])); }

    { const add = item('turtle', 1, bayAt(1, 0.69, 0.045, -0.4)), SHELL = C('#6f8a4a'), PLATE = C('#8ea35d'), RIM = C('#c2ae78'), SKIN = C('#93b176');
      // the shell's plates: a lighter patch round each of a few fixed directions
      const PL = [[0, 1, 0], [0.7, 0.6, 0], [-0.7, 0.6, 0], [0, 0.6, 0.75], [0, 0.6, -0.75]].map(a => new V(...a).normalize());
      add('toys', new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), (q, n) => (PL.some(a => a.dot(n) > 0.9) ? PLATE : SHELL), [0, 0.009, 0], null, [0.035, 0.023, 0.029]);
      add('toys', new THREE.CylinderGeometry(0.036, 0.034, 0.006, 24), RIM, [0, 0.009, 0], null, [1, 1, 0.83]);
      add('toys', ball(1, 12, 10), SKIN, [0.043, 0.015, 0], null, [0.012, 0.0095, 0.0095]);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => add('toys', ball(1, 10, 6), SKIN, [sx * 0.022, 0.004, sz * 0.026], [0, sx * sz * 0.5, 0], [0.011, 0.004, 0.007]));
      eyes(add, [0.051, 0.018, 0], 0.0058, 0.0016); }

    /* merge each list into one mesh; colour × the bay term × contact */
    const tops = bays.slice().sort((a, b) => b - a);
    const contact = (y) => { const t = tops.find(b => b <= y + 1e-4); if (t === undefined) return 1; const d = y - t; return d < 0.012 ? 0.62 + 0.38 * (d / 0.012) : 1; };
    const cav = S.cav || (() => 1);
    const bake = (list) => {
      const pos = [], nor = [], col = [], idx = []; let off = 0; const lp = new V(), ln = new V(), c = new THREE.Color();
      list.forEach(({ geo, paint, m }) => {
        if (!geo.attributes.normal) geo.computeVertexNormals();
        const a = geo.attributes.position, n = geo.attributes.normal, w = geo.clone().applyMatrix4(m), wa = w.attributes.position, wn = w.attributes.normal;
        for (let i = 0; i < a.count; i++) {
          lp.fromBufferAttribute(a, i); ln.fromBufferAttribute(n, i); c.copy(typeof paint === 'function' ? paint(lp, ln) : paint);
          const X = wa.getX(i), Y = wa.getY(i), Z = wa.getZ(i), k = cav(X - S.x, Y, Z - S.z, wn.getY(i), wn.getZ(i)) * contact(Y);
          pos.push(X, Y, Z); nor.push(wn.getX(i), wn.getY(i), wn.getZ(i)); col.push(c.r * k, c.g * k, c.b * k);
        }
        if (geo.index) geo.index.array.forEach(v => idx.push(v + off)); else for (let i = 0; i < a.count; i++) idx.push(i + off);
        off += a.count; w.dispose(); geo.dispose();
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      out.setIndex(idx); return out;
    };
    g.add(louMesh(THREE, bake(lists.books), lib.mats.shelfBooks, 'shelfBooks', [0, 0, 0]));
    g.add(louMesh(THREE, bake(lists.toys), lib.mats.shelfToys, 'shelfToys', [0, 0, 0]));
    g.userData.louShelfDressing = { items: items.map(r => ({ id: r.id, bay: r.bay, tris: r.tris, min: r.box.min.toArray(), max: r.box.max.toArray() })), bays, ceils };
    return g;
  }
  LOU_BUILDERS.shelfContents = (ctx) => louBuildShelf(ctx.lib, ctx.roomData && ctx.roomData.louShelf);

  /* ── Little Sylly's paintings (owner's daughter, age 5) ────────────────────────
     The wall art over the jukebox, and the words the gallery overlay shows for each. Both halves live
     here so a painting's picture, its frame's proportions and its plaque cannot drift apart.
     `image` is the overlay's (1200 px tall), `thumb` the canvas on the wall (320 px) — both
     runtime-cached like the lamp photos, never precached (a phone never sees the Lounge).
     `aspect` is width / height of the JPEG, so the frame is cut to the picture, never the reverse. */
  const LOU_PAINTINGS_BASE = 'data/paintings/';
  const LOU_PAINTINGS = [
    { id: 'birches', pick: 'painting-a', image: 'art1.jpg', thumb: 'art1-t.jpg', aspect: 958 / 1200,
      title: 'Rainbow Birches', artist: 'Little Sylly', age: 'Age 5', medium: 'Acrylic on canvas',
      blurb: 'Tall white birch trunks, freckled with blue dashes and fat dots of pink, green and yellow, stand in front of a sky that melts from red through orange and yellow into grass green. A dark blue hill at the bottom is crowded with olive-gold blobs, and if you look up near the top, a black-and-white eye is peeking out at you. It looks like a forest that decided every day should be a sunset.' },
    { id: 'toucan', pick: 'painting-b', image: 'art2.jpg', thumb: 'art2-t.jpg', aspect: 908 / 1200,
      title: 'Big Beak Toucan', artist: 'Little Sylly', age: 'Age 5', medium: 'Acrylic on canvas',
      blurb: 'A very serious toucan sits on a brown branch, its enormous orange-and-red beak sweeping across the picture and one round blue eye looking straight at you. Its feathers are deep navy with lilac stripes, painted one flick at a time. Behind it the jungle is a party of turquoise, pink flowers, tiny red dots, and a wee white mushroom sitting right by the tip of the beak.' },
  ];

  /* One painting: a birch frame cut to the picture's proportions, and a canvas a hair proud of it.
     The canvas carries its image the way every other prop does (userData.louImage, loaded by the
     scene after mount) — so this builder stays pure. Group origin = the wall; the whole thing sits
     within 2.2 cm of it. */
  function louBuildPainting(lib, p) {
    const { THREE } = lib; const g = new THREE.Group(); louTag(g, p.pick);
    const H = 0.26, W = H * p.aspect, B = 0.014, D = 0.02;
    g.add(louMesh(THREE, new THREE.BoxGeometry(W + 2 * B, H + 2 * B, D), lib.mats.birchDark, 'paintingFrame', [0, 0, D / 2]));
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, metalness: 0 });
    mat.userData.louImage = LOU_PAINTINGS_BASE + p.thumb;
    g.add(louMesh(THREE, new THREE.PlaneGeometry(W, H), mat, 'paintingCanvas', [0, 0, D + 0.0015], null, false));
    g.userData.louPainting = p.id;
    return g;
  }
  LOU_PAINTINGS.forEach(p => { LOU_BUILDERS[p.pick] = (ctx) => louBuildPainting(ctx.lib, p); });

  const api = { LOU_PAINTINGS, LOU_PAINTINGS_BASE, louBuildPainting, LOU_ACTIONS, LOU_TAB_ORDER, LOU_PLACES, LOU_BUILDERS, LOU_ATTRACT_LINES, louBuildAll, louMotion, louEaseOutCubic, louEaseOutBack, louMesh, louTag, louAttract, louSpinPlan, louLampSlots, LOU_LAMP_TIERS, louBuildShelf, LOU_SHELF_COVERS, LOU_PHONE_OPEN_DEG, LOU_PHONE_FLIP_MS, LOU_PHONE_MENU };
  if (typeof window !== 'undefined') window.LouProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
