// ═══════════════════════════════════════════════════════════════════════════
// controller.js — the 3D controller: the lobby ornament, the Workshop, and the
// Konami input surface. Prefix: ctl
//
// Depends on: js/lib/three.min.js (THREE), js/lib/controller-body.js
//             (ControllerBody), js/engine.js (GAME_BRAND_HEX,
//             LOBBY_COLOUR_ORDER, showScreen, isMuted, masterVolume,
//             sfxEnabled, getAudioCtx), js/secret-mode.js (smHandleButton —
//             forward reference, called only from a user gesture)
//
// Loaded immediately BEFORE secret-mode.js: it replaces DOM that secret-mode
// binds to at parse time.
//
// The file has two halves, split by the "══ RENDERER ══" marker below. The half
// above it is pure — no DOM, no THREE, no canvas — which is what lets
// tools/verify-controller-state.js evaluate it under Node.
// ═══════════════════════════════════════════════════════════════════════════

// ── Colour state ─────────────────────────────────────────────────────────────
/* The prototype's stand-in palette, kept deliberately: this is the FACTORY
   look, and it is not one of the twenty brand colours. Reset returns here, so
   the factory controller stays reachable and stays distinguishable from any
   design a player could have built out of the palette. */
const CTL_DEFAULTS = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
const CTL_GROUPS = ['shell', 'plate', 'ears', 'buttons'];

const CTL_STORAGE_KEY   = 'sylly_controller';
const CTL_STATE_VERSION = 1;

let ctlDesign = Object.assign({}, CTL_DEFAULTS);

function ctlIsHex(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); }

/* Total by construction. This runs on the app's front door, so every failure
   path — absent, malformed, wrong-typed, wrong-version, a localStorage that
   throws outright in private mode — resolves to the factory design rather than
   throwing. A field is validated for hex SHAPE, not for palette membership:
   the factory colours are themselves outside the twenty, and a 21st game's
   colour must be readable before this file has ever heard of it. */
function ctlReadDesign() {
  const out = Object.assign({}, CTL_DEFAULTS);
  try {
    const raw = localStorage.getItem(CTL_STORAGE_KEY);
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (o.v !== CTL_STATE_VERSION) return out;
    for (const k of CTL_GROUPS) if (ctlIsHex(o[k])) out[k] = o[k];
  } catch (_) { /* fall through to the factory design */ }
  return out;
}

function ctlWriteDesign(design) {
  try {
    localStorage.setItem(CTL_STORAGE_KEY, JSON.stringify({
      v: CTL_STATE_VERSION,
      shell:   design.shell,
      plate:   design.plate,
      ears:    design.ears,
      buttons: design.buttons,
    }));
  } catch (_) { /* storage unavailable — the session still works, it just won't persist */ }
}

// ── Palette ──────────────────────────────────────────────────────────────────
/* READ from GAME_BRAND_HEX, never copied. A 21st game appears in the Workshop
   with zero edits here, and a brand recolour propagates for free.
   Object.values() order carries no meaning, so the swatches follow
   LOBBY_COLOUR_ORDER — the same hue walk the lobby's Colour sort uses, so both
   surfaces agree about what "next to" means. */
function ctlPalette() {
  const src   = (typeof GAME_BRAND_HEX === 'object' && GAME_BRAND_HEX) ? GAME_BRAND_HEX : {};
  const ids   = Object.keys(src);
  const order = (typeof LOBBY_COLOUR_ORDER !== 'undefined' && Array.isArray(LOBBY_COLOUR_ORDER))
    ? LOBBY_COLOUR_ORDER.filter(id => src[id]).concat(ids.filter(id => LOBBY_COLOUR_ORDER.indexOf(id) < 0))
    : ids;
  return order.map(id => ({ id: id, hex: src[id] }));
}

// ══ RENDERER ══ everything below needs THREE, a document and a canvas ═══════

let ctlBuilt = false;
let ctlScene, ctlCamera, ctlRenderer, ctlRig, ctlBody, ctlControls, ctlEars, ctlFloor;
let ctlCanvas, ctlCtx, ctlTex, ctlEarCanvas, ctlEarCtx, ctlEarTex;
let ctlShellMat, ctlEarMat;
const CTL_BUTTON_MATS = new Set();
let ctlMountEl = null;

/* CHANGE FROM THE PROTOTYPE (1): 1024, not 2048.
   The prototype's atlas is sized for stickers rasterised in surface space. A
   colour-only atlas holds a flat fill and one inset polygon, and a 2048 square
   canvas is 16 MB of memory per atlas on a phone for no visible gain. The
   faceplate map is expressed in fractions of ATLAS, so this scales cleanly.
   The sticker sub-project restores 2048 when it needs the resolution. */
const CTL_ATLAS = 1024;
const CTL_EAR_ATLAS = 512;

function ctlReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function ctlBuildScene() {
  ctlScene = new THREE.Scene();
  ctlScene.background = null;          // CHANGE (2): transparent, so the stone-50 page shows through
  ctlCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  ctlRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  ctlRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // r128 renders washed-out without this: the canvas texture and the output
  // buffer both have to be told they're sRGB, or every colour is lifted.
  ctlRenderer.outputEncoding = THREE.sRGBEncoding;
  ctlRenderer.physicallyCorrectLights = false;
  // ACES rolls the highlights off instead of clipping them, and the exposure
  // lift keeps the mid purples from going muddy once the curve is applied.
  ctlRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  ctlRenderer.toneMappingExposure = 1.05;
  ctlRenderer.shadowMap.enabled = true;
  ctlRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Three-point rig, the prototype's intensities and colours unchanged. The RIM
     light is a warm pink from BEHIND the body: it lights no surface the camera
     sees head-on, only the rolled edge, which is what separates the silhouette
     from the background and makes the shell read as a solid object. */
  ctlScene.add(new THREE.HemisphereLight(0xFFF6EE, 0x4A3F63, .75));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  key.position.set(-3.2, 5.4, 5.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 22;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 3; key.shadow.bias = -.0012;
  ctlScene.add(key);
  const fill = new THREE.DirectionalLight(0xC9B6FF, .5); fill.position.set(4.5, -1.2, 3.5); ctlScene.add(fill);
  const rim  = new THREE.DirectionalLight(0xFF9AD0, .75); rim.position.set(1.6, 2.2, -5); ctlScene.add(rim);

  /* ShadowMaterial is invisible except where something shadows it, so the page
     background still shows through the catcher plane. Visibility is toggled
     per mount (ctlMount's `floor` option) — the lobby's 150px scenery mount
     has no headroom below the controller for a contact shadow to land in
     without being clipped by the mount's own bounding box, so it mounts with
     the floor hidden; the Workshop's taller stage keeps it. */
  ctlFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ opacity: .16 }));
  ctlFloor.rotation.x = -Math.PI / 2; ctlFloor.position.y = -3.0; ctlFloor.receiveShadow = true;
  ctlScene.add(ctlFloor);

  ctlRig = new THREE.Group();
  ctlScene.add(ctlRig);
}

/* ── The faceplate outline, without StickerSurface ──────────────────────────
   The prototype's buildPlateUV() maps the plate polygon through
   SURF.toAtlas(), which LOOKS like a hard dependency on sticker-surface.js.
   It is not. toAtlas is:

       toAtlas(x,y,back) = WARP_D <= 0 || !U.warpXY
                           ? plainAtlas(x,y,back)
                           : plainAtlas(U.warpXY(x,y,back))

   and `warpXY` is never defined — body.js's geo.userData carries
   { minx,maxx,miny,maxy,N,M,sdf,heightF,heightB,poly,RIM,FRONT_H,BACK_H,roll }
   and nothing else. sticker-surface.js only ever READS warpXY. So in the
   shipped prototype toAtlas IS plainAtlas, and plainAtlas is the eight lines
   below, over geo.userData alone. This port is bit-identical to the prototype's
   current output — the prototype's own comment about "the same warped map the
   geometry uses" describes an intent that was never wired up.

   The second apparent dependency, padEdges(), bleeds colour across the atlas
   seam so a sticker wrapping the rim shows no crease. With no stickers the
   atlas is a uniform fill at the rim on both sides, so the bleed is a copy of a
   colour onto itself. Dropped. The sticker sub-project brings both back. */
function ctlPlainAtlas(U, x, y, back) {
  const u = (x - U.minx) / (U.maxx - U.minx);
  const v = (y - U.miny) / (U.maxy - U.miny);
  return [((back ? 1 - u : u) * 0.98 + 0.01) * CTL_ATLAS,
          ((1 - v) * 0.48 + (back ? 0.01 : 0.51)) * CTL_ATLAS];
}

let ctlPlateUV = null;
function ctlBuildPlateUV(geo) {
  const U = geo.userData, P = U.poly;
  const cx = (U.minx + U.maxx) / 2, cy = (U.miny + U.maxy) / 2;
  ctlPlateUV = P.map(p => {
    const x = cx + (p.x - cx) * 0.88, y = cy + (p.y - cy) * 0.87;
    return ctlPlainAtlas(U, x, y, false);
  });
}

function ctlShade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
}

/* CHANGE FROM THE PROTOTYPE (3): no bump atlas.
   The prototype pairs each colour atlas with a greyscale height atlas so the
   renderer lights a sticker's edge as a raised lip. A bare shell is height zero
   everywhere, so that atlas would be uniformly black — a no-op costing two more
   full-size canvases. bumpMap/bumpScale come off the materials with it. The
   sticker sub-project restores both; the comment block at
   standalone-stickerless.html:1601 explains why it matters then. */
function ctlBuildAtlases() {
  ctlCanvas = document.createElement('canvas');
  ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
  ctlCtx = ctlCanvas.getContext('2d');
  ctlTex = new THREE.CanvasTexture(ctlCanvas);
  ctlTex.flipY = false; ctlTex.anisotropy = 8; ctlTex.encoding = THREE.sRGBEncoding;

  ctlEarCanvas = document.createElement('canvas');
  ctlEarCanvas.width = ctlEarCanvas.height = CTL_EAR_ATLAS;
  ctlEarCtx = ctlEarCanvas.getContext('2d');
  ctlEarTex = new THREE.CanvasTexture(ctlEarCanvas);
  ctlEarTex.flipY = false; ctlEarTex.anisotropy = 8; ctlEarTex.encoding = THREE.sRGBEncoding;
}

/* Recolouring repaints what the atlas is FILLED with, never material.color: the
   shell material's colour multiplies its whole map, so tinting it would tint
   every sticker placed on it later too. The buttons are the opposite case —
   solid untextured materials sharing no painted surface — so they take
   material.color directly. */
function ctlRedrawShell() {
  ctlCtx.fillStyle = ctlDesign.shell;
  ctlCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS);
  if (ctlPlateUV && ctlPlateUV.length) {
    ctlCtx.save();
    ctlCtx.beginPath();
    ctlCtx.moveTo(ctlPlateUV[0][0], ctlPlateUV[0][1]);
    for (let i = 1; i < ctlPlateUV.length; i++) ctlCtx.lineTo(ctlPlateUV[i][0], ctlPlateUV[i][1]);
    ctlCtx.closePath();
    ctlCtx.fillStyle = ctlDesign.plate;
    ctlCtx.fill();
    // the hairline carries the separation, so the two fills do not have to
    ctlCtx.lineWidth = CTL_ATLAS * 0.004;
    ctlCtx.strokeStyle = ctlShade(ctlDesign.plate, -0.14);
    ctlCtx.stroke();
    ctlCtx.restore();
  }
  ctlTex.needsUpdate = true;
}

function ctlRedrawEars() {
  ctlEarCtx.fillStyle = ctlDesign.ears;
  ctlEarCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS);
  ctlEarTex.needsUpdate = true;
}

function ctlSetButtonColour(hex) {
  CTL_BUTTON_MATS.forEach(m => {
    m.color.setHex(parseInt(hex.slice(1), 16)).convertSRGBToLinear();
  });
}

function ctlApplyDesign(design) {
  if (design) ctlDesign = Object.assign({}, ctlDesign, design);
  if (!ctlBuilt) return;
  ctlRedrawShell();
  ctlRedrawEars();
  ctlSetButtonColour(ctlDesign.buttons);
  ctlWake();
}

function ctlEnsureBuilt() {
  if (ctlBuilt) return true;
  if (typeof THREE === 'undefined' || !window.ControllerBody) return false;

  ctlBuildScene();
  ctlBuildAtlases();

  const geo = ControllerBody.buildBody(THREE, {});
  ctlBuildPlateUV(geo);

  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06 });
  ctlBody = new THREE.Mesh(geo, ctlShellMat);
  ctlBody.castShadow = true; ctlBody.receiveShadow = true;
  ctlRig.add(ctlBody);

  ctlEarMat = new THREE.MeshStandardMaterial({ map: ctlEarTex, roughness: .52, metalness: .06 });
  ctlEars = ControllerBody.buildEars(THREE, ctlEarMat);
  ctlEars.forEach(m => ctlRig.add(m));

  ctlControls = ControllerBody.buildControls(THREE, geo);
  ctlRig.add(ctlControls.group);

  /* The customisable "buttons" group: both sticks, both stick wells, the whole
     d-pad including its hub, and both shoulders. The four face buttons and
     Select/Start keep their own fixed accent colours and are deliberately NOT
     customisable — same as the prototype. */
  ctlControls.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const parentIsDpad = o.parent && o.parent.name === 'D-pad';
    if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || parentIsDpad
        || / stick$/.test(o.name) || / well$/.test(o.name)) {
      CTL_BUTTON_MATS.add(o.material);
    }
  });

  ctlBuilt = true;
  ctlDesign = ctlReadDesign();
  ctlApplyDesign(null);
  return true;
}

const CTL_TILT_MAX = 0.30;    // radians a stick can lean before it stops
const CTL_TILT_RATE = 0.005;  // radians per pixel dragged
const CTL_ROCK = 0.13;        // radians the D-pad plate leans on a full press

let ctlRotX = 0, ctlRotY = 0, ctlVelY = 0;
let ctlRaf = null;
const _ctlE = new THREE.Euler(), _ctlQ = new THREE.Quaternion();

function ctlApplyTilt(m) {
  const d = m.userData;
  _ctlE.set(d.tiltX || 0, 0, d.tiltZ || 0);
  m.quaternion.copy(d.baseQuat).multiply(_ctlQ.setFromEuler(_ctlE));
}

/* Is anything still moving? The loop reschedules only while this is true, so a
   controller sitting still on the lobby costs nothing. */
function ctlBusy() {
  if (ctlDragging || ctlHeldStick) return true;
  if (Math.abs(ctlVelY) > 0.0005) return true;
  for (const m of ctlControls.pressables) {
    const d = m.userData;
    if ((d.t || 0) > 0.002) return true;
    if (d.tiltX || d.tiltZ || d.vTiltX || d.vTiltZ) return true;
  }
  return false;
}

function ctlWake() { if (ctlRaf === null && ctlBuilt) ctlRaf = requestAnimationFrame(ctlTick); }

// Cancelled in the Workshop ✕, on the Konami success path, and in
// resetToLobby() — logic-engine.md § Timer Lifecycle applies to a rAF handle
// exactly as it does to a setInterval.
function ctlStop() { if (ctlRaf !== null) { cancelAnimationFrame(ctlRaf); ctlRaf = null; } }

function ctlTick() {
  ctlRaf = null;
  if (!ctlDragging) { ctlRotY += ctlVelY; ctlVelY *= 0.94; }
  for (const m of ctlControls.pressables) {
    const t = m.userData.t || 0;
    if (t > 0.002) {
      m.userData.t = t * 0.84;
      m.position.copy(m.userData.rest).addScaledVector(m.userData.axis, -m.userData.press * t);
    } else if (t) { m.userData.t = 0; m.position.copy(m.userData.rest); }
    /* Pre-multiplying the tilt onto baseQuat applies it in the PARENT's frame,
       so the pivot lands on the seated origin — the centre of the cross, where
       the real pivot post sits. Post-multiplying would pivot about the plate's
       own tilted frame and the centre would wander. */
    if (m.userData.rocker && m.userData.baseQuat) {
      const a = CTL_ROCK * (m.userData.t || 0);
      _ctlE.set(-a * (m.userData.dirY || 0), a * (m.userData.dirX || 0), 0);
      m.quaternion.copy(_ctlQ.setFromEuler(_ctlE)).multiply(m.userData.baseQuat);
    }
    /* A released stick eases back on a velocity spring rather than an
       exponential decay, so it overshoots centre slightly and settles — the
       prototype's .34 / .62 constants, which give the sprung-gimbal feel. */
    const d = m.userData;
    if (m !== ctlHeldStick && d.baseQuat && (d.tiltX || d.tiltZ || d.vTiltX || d.vTiltZ)) {
      d.vTiltX = ((d.vTiltX || 0) - (d.tiltX || 0) * 0.34) * 0.62;
      d.vTiltZ = ((d.vTiltZ || 0) - (d.tiltZ || 0) * 0.34) * 0.62;
      d.tiltX = (d.tiltX || 0) + d.vTiltX; d.tiltZ = (d.tiltZ || 0) + d.vTiltZ;
      if (Math.abs(d.tiltX) < 1e-4 && Math.abs(d.tiltZ) < 1e-4 &&
          Math.abs(d.vTiltX) < 1e-4 && Math.abs(d.vTiltZ) < 1e-4) {
        d.tiltX = d.tiltZ = d.vTiltX = d.vTiltZ = 0;
      }
      ctlApplyTilt(m);
    }
  }
  ctlRig.rotation.set(ctlRotX, ctlRotY, 0);
  ctlRenderer.render(ctlScene, ctlCamera);
  if (ctlBusy()) ctlRaf = requestAnimationFrame(ctlTick);
}

/* `floor` defaults to true (the Workshop's roomier stage). The lobby's small
   scenery mount passes false — see the comment on ctlFloor's construction. */
function ctlMount(el, { floor = true } = {}) {
  if (!el || !ctlEnsureBuilt()) return false;
  ctlMountEl = el;
  if (ctlFloor) ctlFloor.visible = floor;
  el.appendChild(ctlRenderer.domElement);
  ctlResize();
  ctlWake();
  return true;
}

function ctlUnmount() {
  ctlStop();
  if (ctlRenderer && ctlRenderer.domElement && ctlRenderer.domElement.parentElement) {
    ctlRenderer.domElement.parentElement.removeChild(ctlRenderer.domElement);
  }
  ctlMountEl = null;
}

function ctlResize() {
  if (!ctlMountEl || !ctlBuilt) return;
  const w = ctlMountEl.clientWidth, h = ctlMountEl.clientHeight;
  if (!w || !h) return;
  ctlRenderer.setSize(w, h, false);
  ctlCamera.aspect = w / h;
  ctlCamera.position.set(0, 0.4, w / h < 0.9 ? 12 : 9.5);
  ctlCamera.lookAt(0, -0.2, 0);
  ctlCamera.updateProjectionMatrix();
  ctlWake();
}
window.addEventListener('resize', ctlResize);

const CTL_CLICK_MOVE_MAX = 6;    // px — beyond this a pointer-up is a drag, not a tap
const CTL_CLICK_TIME_MAX = 400;  // ms

let ctlDragging = false, ctlHeldStick = null;
let ctlLast = null, ctlStickLast = null, ctlDownPos = null, ctlDownTime = 0;
const _ctlPtr = new THREE.Vector2(), _ctlRay = new THREE.Raycaster();

/* Assigned by the Konami adapter (Task 6). Called as ctlOnPress(name, dir)
   where dir is 'Up'|'Down'|'Left'|'Right' for the d-pad and undefined
   otherwise. Left null on the lobby mount: the lobby's single tap opens the
   Workshop, and the code is only live where the buttons are big enough to
   press deliberately. */
let ctlOnPress = null;

function ctlTryPress(ev) {
  const r = ctlRenderer.domElement.getBoundingClientRect();
  _ctlPtr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  _ctlPtr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  _ctlRay.setFromCamera(_ctlPtr, ctlCamera);
  const h = _ctlRay.intersectObjects(ctlControls.pressables, true);
  if (!h.length) return false;
  /* Buttons raycast against their own list alone, so nothing stopped a front
     button's ray reaching it through empty space while the controller was
     rotated to show the back. Check the shell along the same ray and refuse
     whenever it sits closer: a real button can't be pressed through the case. */
  const hb = _ctlRay.intersectObject(ctlBody, false);
  if (hb.length && hb[0].distance < h[0].distance - 1e-4) return false;
  let o = h[0].object;
  while (o && !o.userData.rest) o = o.parent;
  if (!o) return false;
  o.userData.t = 1;
  /* One cross, four directions: which arm was pressed comes from WHERE on the
     plate the ray landed. dgeo was rotated so its thickness runs along local Y,
     which maps the shape's own +y to local -z — hence the sign flip. Dominant
     axis wins, so a diagonal still resolves to a single cardinal, the way a
     real pivot forces it to. */
  if (o.userData.rocker) {
    const lp = o.worldToLocal(h[0].point.clone());
    if (Math.abs(lp.x) > Math.abs(lp.z)) { o.userData.dirX = Math.sign(lp.x); o.userData.dirY = 0; }
    else { o.userData.dirY = Math.sign(-lp.z); o.userData.dirX = 0; }
    o.userData.dir = (o.userData.dirY > 0 ? 'Up' : o.userData.dirY < 0 ? 'Down' :
                      o.userData.dirX > 0 ? 'Right' : 'Left');
  }
  if (!o.userData.pressed) {
    o.userData.pressed = true;
    ctlVoiceFor(o.name);
    if (typeof ctlOnPress === 'function') ctlOnPress(o.name, o.userData.dir);
  }
  if (o.name && o.name.indexOf('stick') >= 0) {
    ctlHeldStick = o;
    ctlStickLast = { x: ev.clientX, y: ev.clientY };
    ctlMountEl.setPointerCapture(ev.pointerId);
  }
  ctlWake();
  return true;
}

function ctlBindPointer(el) {
  if (el.dataset.ctlBound === '1') return;
  el.dataset.ctlBound = '1';

  el.addEventListener('pointerdown', ev => {
    ctlDownPos = { x: ev.clientX, y: ev.clientY };
    ctlDownTime = performance.now();
    if (ctlPressEnabled && ctlTryPress(ev)) return;
    ctlDragging = true;
    ctlLast = { x: ev.clientX, y: ev.clientY };
    el.setPointerCapture(ev.pointerId);
    ctlWake();
  });

  el.addEventListener('pointermove', ev => {
    if (ctlHeldStick) {
      const d = ctlHeldStick.userData;
      d.tiltZ = Math.max(-CTL_TILT_MAX, Math.min(CTL_TILT_MAX, (d.tiltZ || 0) - (ev.clientX - ctlStickLast.x) * CTL_TILT_RATE));
      d.tiltX = Math.max(-CTL_TILT_MAX, Math.min(CTL_TILT_MAX, (d.tiltX || 0) + (ev.clientY - ctlStickLast.y) * CTL_TILT_RATE));
      d.vTiltX = d.vTiltZ = 0;
      ctlStickLast = { x: ev.clientX, y: ev.clientY };
      ctlApplyTilt(ctlHeldStick);
      ctlWake();
      return;
    }
    if (!ctlDragging) return;
    const dx = ev.clientX - ctlLast.x, dy = ev.clientY - ctlLast.y;
    ctlRotY += dx * 0.008; ctlRotX += dy * 0.006; ctlVelY = dx * 0.008;
    ctlRotX = Math.max(-1.2, Math.min(1.2, ctlRotX));
    ctlLast = { x: ev.clientX, y: ev.clientY };
    ctlWake();
  });

  el.addEventListener('pointerup', ev => {
    const dx = ev.clientX - (ctlDownPos ? ctlDownPos.x : ev.clientX);
    const dy = ev.clientY - (ctlDownPos ? ctlDownPos.y : ev.clientY);
    const wasTap = ctlDownPos && Math.hypot(dx, dy) < CTL_CLICK_MOVE_MAX
                   && (performance.now() - ctlDownTime) < CTL_CLICK_TIME_MAX;
    const wasStick = !!ctlHeldStick;
    ctlDragging = false; ctlHeldStick = null; ctlDownPos = null;
    /* The spin-down is JS-driven, so the global prefers-reduced-motion CSS
       block cannot reach it (ui-style.md § Motion Standard). Under reduced
       motion the controller settles where it was let go rather than coasting —
       it still shows every face, it just skips the journey. */
    if (ctlReducedMotion()) ctlVelY = 0;
    for (const m of ctlControls.pressables) {
      if (m.userData.pressed) { m.userData.pressed = false; ctlVoiceRelease(); }
    }
    if (wasTap && !wasStick && typeof ctlOnTap === 'function') ctlOnTap(ev);
    ctlWake();
  });
}

let ctlPressEnabled = false;   // the lobby mount leaves the buttons inert
let ctlOnTap = null;           // assigned per mount

// ── Button voices ────────────────────────────────────────────────────────────
/* Ported from standalone-stickerless.html:1516-1556. The prototype opened its
   own AudioContext and ignored mute; this routes through the engine's shared
   context and the suite's standard guard (logic-engine.md § Audio Function
   Catalogue) instead of adding a second audio system. playSecretBeep in
   secret-mode.js is the existing precedent for a non-engine file carrying its
   own synth — this is not a new pattern. */
let ctlNoise = null;
function ctlNoiseBuffer(c) {
  if (ctlNoise) return ctlNoise;
  const n = c.sampleRate * .25, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  ctlNoise = b;
  return b;
}
function ctlThock(c, { cut = 1600, q = 1.1, dur = .055, gain = .3 } = {}) {
  const s = c.createBufferSource(); s.buffer = ctlNoiseBuffer(c);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = cut; f.Q.value = q;
  const g = c.createGain(), t = c.currentTime;
  g.gain.setValueAtTime(gain * masterVolume, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + .02);
}
function ctlBlip(c, { freq = 600, dur = .16, gain = .12, type = 'triangle', slide = 0 } = {}) {
  const o = c.createOscillator(); o.type = type; const g = c.createGain(), t = c.currentTime;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain * masterVolume, t + .006);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
const CTL_VOICE = {
  face:   n => { const c = getAudioCtx(); ctlThock(c, { cut: 2300, dur: .05, gain: .26 }); ctlBlip(c, { freq: n, gain: .13, dur: .19 }); },
  dpad:   () => { const c = getAudioCtx(); ctlThock(c, { cut: 3200, q: 1.6, dur: .035, gain: .3 }); ctlBlip(c, { freq: 1180, gain: .05, dur: .05, type: 'square' }); },
  stick:  () => { const c = getAudioCtx(); ctlThock(c, { cut: 620, q: .8, dur: .09, gain: .34 }); ctlBlip(c, { freq: 190, gain: .11, dur: .14, type: 'sine', slide: .7 }); },
  bumper: () => { const c = getAudioCtx(); ctlThock(c, { cut: 1050, dur: .07, gain: .3 }); ctlBlip(c, { freq: 330, gain: .09, dur: .12 }); },
  menu:   () => { const c = getAudioCtx(); ctlThock(c, { cut: 2600, dur: .04, gain: .18 }); ctlBlip(c, { freq: 880, gain: .06, dur: .09, type: 'sine' }); },
  release:() => { const c = getAudioCtx(); ctlThock(c, { cut: 2900, q: 1.4, dur: .03, gain: .11 }); },
};
/* Original note assignment for the four face caps. */
const CTL_FACE_NOTE = { 'Face Y': 830.61, 'Face B': 739.99, 'Face A': 554.37, 'Face X': 659.25 };
function ctlVoiceFor(name) {
  if (isMuted || !sfxEnabled) return;
  if (CTL_FACE_NOTE[name]) return CTL_VOICE.face(CTL_FACE_NOTE[name]);
  if (name === 'D-pad') return CTL_VOICE.dpad();
  if (name && name.indexOf('stick') >= 0) return CTL_VOICE.stick();
  if (name === 'L button' || name === 'R button') return CTL_VOICE.bumper();
  return CTL_VOICE.menu();
}
function ctlVoiceRelease() {
  if (isMuted || !sfxEnabled) return;
  CTL_VOICE.release();
}

// ── The lobby mount ──────────────────────────────────────────────────────────
/* Deferred one frame past first paint. buildBody walks a distance field over a
   grid and is the single most expensive thing this feature does; running it
   inline would stall the app's front door on exactly the devices least able to
   afford it. The mount is empty until it lands — a placeholder that flashes and
   is replaced reads worse than the object simply arriving. */
function ctlMountLobby() {
  const el = document.getElementById('lobby-controller');
  if (!el) return;
  const start = () => {
    if (!ctlEnsureBuilt()) return;
    ctlPressEnabled = false;         // the lobby's buttons are scenery
    ctlOnPress = null;
    ctlOnTap = () => { playLaunch(); ctlOpenWorkshop(); };
    ctlMount(el, { floor: false });   // no headroom below the mount for the contact shadow
    ctlBindPointer(el);
    ctlScheduleIdleNudge();
  };
  if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 0);
}

// Keyboard equivalence for the tap — the mount is role="button".
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (document.activeElement && document.activeElement.id === 'lobby-controller') {
    e.preventDefault();
    playLaunch();
    ctlOpenWorkshop();
  }
});

/* Full teardown. Called from resetToLobby() and from the Workshop's ✕. The rAF
   handle is a timer under logic-engine.md § Timer Lifecycle; the scene itself
   is deliberately kept — rebuilding it is the expensive part and the lobby
   wants it back immediately. */
function ctlTeardown() {
  ctlStop();
  ctlHeldStick = null;
  ctlDragging = false;
  ctlDownPos = null;
  ctlOnPress = null;
  ctlPressEnabled = false;
  if (ctlBuilt) {
    for (const m of ctlControls.pressables) {
      const d = m.userData;
      d.t = 0; d.pressed = false;
      d.tiltX = d.tiltZ = d.vTiltX = d.vTiltZ = 0;
      if (d.rest) m.position.copy(d.rest);
      if (d.baseQuat) m.quaternion.copy(d.baseQuat);
    }
  }
}

/* ── Idle nudge — the lobby scenery invites a tap ─────────────────────────────
   A small, randomly-signed spin every few seconds, reusing the exact coast-
   and-settle physics a real drag release already has (ctlVelY + ctlTick's
   friction) rather than a second animation system. Self-scheduling chain that
   runs for the life of the page, same shape as the resize listener above —
   it is not tied to a single timed phase, so there is no single exit point to
   cancel it from. It is near-zero cost when it declines to act: reduced
   motion, an active drag/stick-hold, a game in progress (screen-lobby hidden)
   and the Workshop (a different mount element) all take the early return. */
const CTL_IDLE_NUDGE_MIN_MS = 4000;
const CTL_IDLE_NUDGE_MAX_MS = 7500;
let ctlIdleNudgeArmed = false;

function ctlScheduleIdleNudge() {
  if (ctlIdleNudgeArmed) return;   // one chain, however many times the lobby (re)mounts
  ctlIdleNudgeArmed = true;
  const fire = () => {
    setTimeout(fire, CTL_IDLE_NUDGE_MIN_MS + Math.random() * (CTL_IDLE_NUDGE_MAX_MS - CTL_IDLE_NUDGE_MIN_MS));
    if (ctlReducedMotion()) return;                 // no unsolicited motion
    if (ctlDragging || ctlHeldStick) return;         // never fight the player's own drag
    const lobbyEl = document.getElementById('lobby-controller');
    const screenLobby = document.getElementById('screen-lobby');
    if (ctlMountEl !== lobbyEl) return;              // Workshop mount, or not mounted
    if (!screenLobby || screenLobby.style.display === 'none') return;  // a game is on screen
    const sign = Math.random() < 0.5 ? -1 : 1;
    ctlVelY = sign * (0.02 + Math.random() * 0.02);  // small — a wiggle, not a spin
    ctlWake();
  };
  setTimeout(fire, CTL_IDLE_NUDGE_MIN_MS + Math.random() * (CTL_IDLE_NUDGE_MAX_MS - CTL_IDLE_NUDGE_MIN_MS));
}

document.addEventListener('DOMContentLoaded', ctlMountLobby);
