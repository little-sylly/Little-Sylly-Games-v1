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

  const api = { PRM_ACTIONS, PRM_TAB_ORDER, PRM_PLACES, PRM_BUILDERS, PRM_ATTRACT_LINES, prmBuildAll, prmMotion, prmEaseOutCubic, prmEaseOutBack, prmMesh, prmTag, prmAttract };
  if (typeof window !== 'undefined') window.PrmProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
