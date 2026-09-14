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

/* The ear crown is 0.36 by 0.52 and its outer 0.075 is bevel, so a sticker is
   held to what will actually lie flat on it. Deliberately NOT added to
   CTL_GROUPS: that array drives the colour-swatch UI and the hex validator. */
const CTL_EAR_MAX_R = 0.26;
const CTL_SURFACES = ['shell', 'earL', 'earR'];

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
  out.stickers = [];
  try {
    const raw = localStorage.getItem(CTL_STORAGE_KEY);
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (o.v !== CTL_STATE_VERSION) return out;
    for (const k of CTL_GROUPS) if (ctlIsHex(o[k])) out[k] = o[k];
    /* Independently validated, so a malformed placement array costs the player
       their stickers and not their colours. The legality probe is only
       available once the surface has been built (it is lazy — spec § 5.2), so
       rule 6 is applied later, by ctlEnsureStickerSurface, rather than skipped. */
    out.stickers = ctlValidateStickers(o.stickers, {
      known: ctlStickerManifest ? new Set(ctlStickerManifest.map(s => s.id)) : null,
    });
  } catch (_) { /* fall through to the factory design */ }
  return out;
}

function ctlWriteDesign(design) {
  try {
    localStorage.setItem(CTL_STORAGE_KEY, JSON.stringify({
      v: CTL_STATE_VERSION,                       // NOT bumped — see spec D7
      shell:   design.shell,
      plate:   design.plate,
      ears:    design.ears,
      buttons: design.buttons,
      stickers: Array.isArray(design.stickers) ? design.stickers : [],
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

// ── Konami adapter ───────────────────────────────────────────────────────────
/* The Konami sequence is entered on the REAL buttons. This is a mapping and
   nothing else: the buffer, the retro beeps, the arcade unlock and the hand-off
   to the terminal all stay in secret-mode.js, untouched.
   It is this small only because the prototype already resolves which d-pad arm
   was pressed from the raycast hit point — one rocker mesh, four cardinals,
   with a diagonal forced to a single axis the way a real pivot forces it.
   No geometry and no press logic changes. */
const CTL_KONAMI_DIRS = { Up: 'U', Down: 'D', Left: 'L', Right: 'R' };
const CTL_KONAMI_BUTTONS = { 'Face A': 'A', 'Face B': 'B', 'Start': 'S' };

function ctlKonamiCode(name, dir) {
  if (name === 'D-pad') return CTL_KONAMI_DIRS[dir] || null;
  return CTL_KONAMI_BUTTONS[name] || null;
}

// ── The sticker inventory ────────────────────────────────────────────────────
/* Runtime-cached, never precached — a sticker ships by dropping a PNG in the
   folder and adding one manifest line, with no sw.js edit and no CACHE_NAME
   bump. Same contract as data/packs/ and data/music/, and the opposite of
   data/art/'s precached-and-version-bumped one, which is for default art that
   IS part of the app version. See logic-engine.md § PWA Guardian.

   The file shape is data/music/'s — one flat manifest — rather than
   data/packs/'s folder-per-item + registry.json: a pack carries a whole
   settings/word-list config, a sticker carries four fields. */
const CTL_STICKER_DIR = 'data/stickers/';

let ctlStickerManifest = null;   // null until the first load resolves

/* Total by construction, same defensive shape as ctlReadDesign. Anything
   malformed becomes a DROPPED ENTRY, never a throw and never a partial record
   the renderer would later trip over. `unlocked` is reserved for the
   achievements sub-project (spec D3) and defaults to true: today every sticker
   is free to everyone, exactly like every colour. */
function ctlValidateManifest(raw) {
  const out = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (!Array.isArray(raw.stickers)) return out;
  const seen = new Set();
  for (const e of raw.stickers) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const str = v => typeof v === 'string' && v.length > 0;
    if (!str(e.id) || !str(e.label) || !str(e.image)) continue;
    if (seen.has(e.id)) continue;          // first occurrence wins
    seen.add(e.id);
    out.push({ id: e.id, label: e.label, image: e.image, unlocked: e.unlocked !== false });
  }
  return out;
}

/* One fetch for the life of the page. Every failure path — offline before the
   first fetch, a 404, malformed JSON — resolves to an empty inventory, which
   renders as a book with nothing in it rather than an error on a screen the
   player reached by tapping a toy. */
function ctlLoadStickerManifest() {
  if (ctlStickerManifest) return Promise.resolve(ctlStickerManifest);
  return fetch(CTL_STICKER_DIR + 'manifest.json')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(raw => (ctlStickerManifest = ctlValidateManifest(raw)));
}

function ctlStickerById(id) {
  if (!ctlStickerManifest) return null;
  for (const e of ctlStickerManifest) if (e.id === id) return e;
  return null;
}

/* Placement validation — spec § 6, rules 1-7. Total by construction, same
   defensive shape the colour read already uses: this runs on the app's front
   door, and a hand-edited or half-written localStorage value must yield a
   controller, never a throw.

   The two optional probes are injected rather than reached for, so this stays
   pure and the harness can drive every rule under Node with no geometry:
     known — a Set of manifest ids; omit to skip rule 2
     legal — (rec) => boolean; omit to skip rule 6

   Rule 6 is the subtle one. plan() is consulted for its `ok` flag ONLY and its
   returned coordinates are thrown away. Feeding them back moves the anchor a
   fraction of a texel per load, monotonically, and a sticker that creeps
   across the shell over months is close to undiagnosable after the fact. */
function ctlValidateStickers(raw, opts) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const known = opts && opts.known;
  const legal = opts && opts.legal;
  const num = v => typeof v === 'number' && isFinite(v);
  const seen = new Set();

  for (const e of raw) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;          // 1
    if (typeof e.id !== 'string' || !e.id) continue;                        // 1
    if (CTL_SURFACES.indexOf(e.surface) < 0) continue;                      // 1
    if (known && !known.has(e.id)) continue;                                // 2
    if (seen.has(e.id)) continue;                                           // 5 (first wins)

    if (e.surface === 'shell') {
      if (!num(e.x) || !num(e.y) || !num(e.size) || !num(e.rot)) continue;  // 3
      if (e.size <= 0) continue;                                            // 3
      if (e.chart !== 'rim' && e.chart !== 'tangent') continue;             // 4 — never guessed
      const rec = { id: e.id, surface: 'shell', x: e.x, y: e.y,
                    back: e.back === true, rot: e.rot, size: e.size, chart: e.chart };
      if (legal && !legal(rec)) continue;                                   // 6 — ok flag only
      seen.add(e.id); out.push(rec);
    } else {
      if (!num(e.u) || !num(e.v) || !num(e.r) || !num(e.rot)) continue;     // 3
      if (e.r <= 0) continue;                                               // 7
      if (e.u < 0 || e.u > 1 || e.v < 0 || e.v > 1) continue;               // 7
      seen.add(e.id);
      out.push({ id: e.id, surface: e.surface, u: e.u, v: e.v,
                 r: Math.min(e.r, CTL_EAR_MAX_R), rot: e.rot });            // 7 — re-clamped
    }
  }
  return out;
}


// ── The placement state machine ──────────────────────────────────────────────
/* Pure reducers over a plain { stickers, armed, selected, history } object,
   deliberately separated from every DOM-touching render call — the same split
   js/lib/physics.js and controller-body.js already establish in this codebase.
   That is what lets tools/verify-controller-stickers.js drive the whole
   Idle/Armed/Selected table under Node with no browser at all.

   Nothing here mutates its input: each action returns a new state. The render
   layer reads the result; it never reaches in and edits a placement directly. */
const CTL_STICKER_HISTORY_MAX = 30;   // a Workshop session, not a document history

function ctlStickerMode(st) {
  if (st.armed) return 'armed';
  if (st.selected >= 0 && st.selected < st.stickers.length) return 'selected';
  return 'idle';
}

/* Snapshot the whole array. It is at most one entry per design in the
   inventory, so a deep copy is a handful of small objects — far cheaper to
   reason about than a per-action inverse patch, and it makes undo of a
   relocate, a delete and a place the single line below. */
function ctlStickerPush(st) {
  const h = st.history.concat([st.stickers.map(s => Object.assign({}, s))]);
  return h.length > CTL_STICKER_HISTORY_MAX ? h.slice(h.length - CTL_STICKER_HISTORY_MAX) : h;
}

function ctlStickerReduce(st, a) {
  const S = st.stickers;
  const next = (patch) => Object.assign({ stickers: S, armed: st.armed,
                                          selected: st.selected, history: st.history }, patch);
  switch (a.t) {
    /* One rule, every state (spec § 7): an unplaced tile arms, a placed tile
       selects, and the tile that is already current deselects. So a book tap
       can interrupt anything to jump to another design, and there is no dead
       state to get stuck in. */
    case 'bookTap': {
      const idx = S.findIndex(s => s.id === a.id);
      if (idx >= 0) {
        return next(st.selected === idx ? { armed: null, selected: -1 }
                                        : { armed: null, selected: idx });
      }
      return next(st.armed === a.id ? { armed: null, selected: -1 }
                                    : { armed: a.id, selected: -1 });
    }

    case 'place': {
      if (!st.armed) return st;
      const history = ctlStickerPush(st);
      const stickers = S.concat([Object.assign({ id: st.armed }, a.rec)]);
      return { stickers, armed: null, selected: stickers.length - 1, history };
    }

    case 'relocate': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const history = ctlStickerPush(st);
      const stickers = S.slice();
      stickers[i] = Object.assign({ id: S[i].id }, a.rec);
      return { stickers, armed: null, selected: i, history };
    }

    /* Rotate and size are dragged on a slider, so they deliberately do NOT
       push history on every input event — the Workshop would fill the stack
       with a hundred intermediate values from one gesture. Undo steps over the
       whole adjustment to the last place/relocate/delete, which is the unit a
       player thinks in. */
    case 'adjust': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const stickers = S.slice();
      stickers[i] = Object.assign({}, S[i], a.patch);
      return next({ stickers });
    }

    case 'hit':
      return (a.index >= 0 && a.index < S.length)
        ? next({ armed: null, selected: a.index })
        : st;

    case 'delete': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const history = ctlStickerPush(st);
      return { stickers: S.slice(0, i).concat(S.slice(i + 1)),
               armed: null, selected: -1, history };
    }

    case 'done':
      return next({ armed: null, selected: -1 });

    case 'undo': {
      if (!st.history.length) return st;
      const stickers = st.history[st.history.length - 1];
      return { stickers, armed: null, selected: -1,
               history: st.history.slice(0, st.history.length - 1) };
    }

    default:
      return st;
  }
}

// ══ RENDERER ══ everything below needs THREE, a document and a canvas ═══════

let ctlBuilt = false;
let ctlScene, ctlCamera, ctlRenderer, ctlRig, ctlBody, ctlControls, ctlEars, ctlFloor;
let ctlCanvas, ctlCtx, ctlTex, ctlEarCanvas, ctlEarCtx, ctlEarTex;
let ctlBumpCanvas, ctlBumpCtx, ctlBumpTex;
let ctlEarBumpCanvas, ctlEarBumpCtx, ctlEarBumpTex;
let ctlEarScale = 1;                // world units -> UV, set by ctlBuildEarUV
let ctlShellMat, ctlEarMat;
let ctlGeo = null;                  // retained: geo.userData is what the surface needs
let ctlStickerSurface = null;       // lazily built — see ctlEnsureStickerSurface
let ctlStickerPad = null;           // padPairs(4), computed once with the surface
const ctlStickerImages = {};        // id -> { img, data } once decoded
const CTL_BUTTON_MATS = new Set();
let ctlMountEl = null;

/* CHANGE FROM THE PROTOTYPE (1), NOW CONDITIONAL: 1024 until stickers are
   needed, then 2048.

   A colour-only atlas holds a flat fill and one inset polygon, and a 2048
   square canvas is 16 MB of memory per atlas on a phone for no visible gain.
   But a sticker of radius 0.18 covers about 7.8% of the atlas width — 80 px at
   1024 against source art of ~512 px, which is visibly soft, and 160 px at
   2048, which is not. So the atlas GROWS, once, inside
   ctlEnsureStickerSurface(): a player who only ever recolours never pays for
   the resolution, and a player who places a sticker pays once.

   Everything downstream is expressed in fractions of CTL_ATLAS, so the resize
   is a canvas resize plus a plate-UV rebuild plus a repaint. The order in
   ctlEnsureStickerSurface is forced: the surface and its pad pairs both close
   over the atlas size at construction, so the resize must happen FIRST. */
let CTL_ATLAS = 1024;
const CTL_ATLAS_STICKERS = 2048;
/* 1024, was 512. The 2x2 cap grid ctlBuildEarUV lays down needs a 512
   quadrant per cap; at 512 each cap would have had 256. */
const CTL_EAR_ATLAS = 1024;

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
   colour onto itself — it was dropped for the colour-only port and is back as
   ctlPadEdges() below, now that there is something on the rim to bleed. */
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

/* CHANGE FROM THE PROTOTYPE (3), NOW CONDITIONAL: the bump atlas exists but
   stays black while there are no stickers.

   The prototype pairs each colour atlas with a greyscale height atlas so the
   renderer lights a sticker's edge as a raised lip. A bare shell is height zero
   everywhere, so on a stickerless controller this is a uniformly black texture
   — which costs a canvas but keeps the material contract identical whether or
   not stickers are present, so no material has to be rebuilt when the first one
   lands. bumpScale is deliberately small: this is a sticker on a shell, not a
   puffy dome.

   willReadFrequently is not decoration here: the rasteriser below does a
   getImageData/putImageData pair per sticker per sheet, and without the hint a
   GPU-backed canvas reads back over the bus every time. */
function ctlBuildAtlases() {
  ctlCanvas = document.createElement('canvas');
  ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
  ctlCtx = ctlCanvas.getContext('2d', { willReadFrequently: true });
  ctlTex = new THREE.CanvasTexture(ctlCanvas);
  ctlTex.flipY = false; ctlTex.anisotropy = 8; ctlTex.encoding = THREE.sRGBEncoding;

  ctlBumpCanvas = document.createElement('canvas');
  ctlBumpCanvas.width = ctlBumpCanvas.height = CTL_ATLAS;
  ctlBumpCtx = ctlBumpCanvas.getContext('2d', { willReadFrequently: true });
  ctlBumpTex = new THREE.CanvasTexture(ctlBumpCanvas);
  ctlBumpTex.flipY = false; ctlBumpTex.anisotropy = 8;

  ctlEarCanvas = document.createElement('canvas');
  ctlEarCanvas.width = ctlEarCanvas.height = CTL_EAR_ATLAS;
  ctlEarCtx = ctlEarCanvas.getContext('2d', { willReadFrequently: true });
  ctlEarTex = new THREE.CanvasTexture(ctlEarCanvas);
  ctlEarTex.flipY = false; ctlEarTex.anisotropy = 8; ctlEarTex.encoding = THREE.sRGBEncoding;

  ctlEarBumpCanvas = document.createElement('canvas');
  ctlEarBumpCanvas.width = ctlEarBumpCanvas.height = CTL_EAR_ATLAS;
  ctlEarBumpCtx = ctlEarBumpCanvas.getContext('2d', { willReadFrequently: true });
  ctlEarBumpTex = new THREE.CanvasTexture(ctlEarBumpCanvas);
  ctlEarBumpTex.flipY = false; ctlEarBumpTex.anisotropy = 8;
}

// ── Stickers: the surface ────────────────────────────────────────────────────
/* THE TUNED NUMBERS. js/lib/controller-sticker-surface.js contains none of
   these — every keep-out is opt.exclude and the tolerance is opt.maxDistort
   (whose default is a stricter 0.10). Building the surface with {} compiles,
   runs, and silently lets stickers paint INSIDE the stick-well holes, where
   they show straight through. tools/verify-controller-stickers.js § 2 asserts
   all four refuse.

   Grips are deliberately NOT a keep-out — that was removed at the owner's
   request because it refused too many spots that felt placeable. Curvature
   alone governs them. Measured consequence: at 0.14 nothing on the body is
   ever refused for curvature (the highest distortion anywhere is 0.0864), so
   maxDistort is currently an inert dial. It is also the ONLY lever for grip
   and ear warping: if a real-device check says the worst spots look too
   stretched, 0.05-0.06 is the useful range — spec § 12.1 tabulates what each
   value costs. */
const CTL_STICKER_OPT = {
  exclude: [{ x: -1.25, y:  0.20, r: 0.33, back: false },   // left stick well
            { x:  1.25, y: -0.85, r: 0.33, back: false },   // right stick well
            { x: -0.84, y:  0.84, r: 0.45, back: true  },   // left ear boss
            { x:  0.84, y:  0.84, r: 0.45, back: true  }],  // right ear boss
  maxDistort: 0.14,
};

/* Idempotent and lazy. Measured at 339 ms on a desktop at 2048; a low-end
   phone is plausibly 3-5x that, which is why it is never on the app's front
   door. Called from the Stickers tab's first open, and from the deferred
   lobby path when a SAVED design already has stickers (see ctlApplyDesign). */
function ctlEnsureStickerSurface() {
  if (ctlStickerSurface) return true;
  if (!ctlBuilt || !ctlGeo || !window.StickerSurface) return false;

  // Order is forced: the surface and its pad pairs both close over the atlas
  // size at construction, so the resize has to land first.
  if (CTL_ATLAS !== CTL_ATLAS_STICKERS) {
    CTL_ATLAS = CTL_ATLAS_STICKERS;
    ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
    ctlBumpCanvas.width = ctlBumpCanvas.height = CTL_ATLAS;
    ctlBuildPlateUV(ctlGeo);          // plate UVs are in atlas pixels
  }

  ctlStickerSurface = window.StickerSurface.StickerSurface(
    ctlGeo.userData, CTL_ATLAS, CTL_STICKER_OPT);
  ctlStickerPad = ctlStickerSurface.padPairs(4);

  /* Rule 6 of the load validation (spec § 6) needs the surface, which did not
     exist when ctlReadDesign ran. Apply it now to both the live design and any
     open draft — a placement made illegal by a future body-geometry change is
     dropped rather than rendered somewhere invalid. The ok flag ONLY: its
     returned coordinates are discarded, or saved stickers creep. */
  const legal = r => ctlStickerSurface.plan(r.x, r.y, r.back, r.size).ok;
  const known = ctlStickerManifest ? new Set(ctlStickerManifest.map(s => s.id)) : null;
  for (const d of [ctlDesign, ctlDraft]) {
    if (d && Array.isArray(d.stickers)) d.stickers = ctlValidateStickers(d.stickers, { known, legal });
  }

  /* ctlOpenWorkshop seeded the editing state from ctlDraft before any of
     this existed, and the loop above has just REPLACED that array. Left
     alone the two disagree, and the next dispatch writes the un-validated
     list straight back over the top — so rule 6 would hold until the first
     tap and then silently undo itself. Re-point, keeping the history. */
  if (ctlDraft && Array.isArray(ctlDraft.stickers)) {
    ctlStickerState = { stickers: ctlDraft.stickers, armed: null, selected: -1,
                        history: ctlStickerState.history };
  }

  ctlRedrawShell();
  ctlRedrawEars();
  ctlWake();
  return true;
}

/* Decoded once per design, held as ImageData so the per-texel loop can sample
   it directly. Bilinear, because a wrapped sticker is magnified where the
   surface turns and nearest-neighbour there looks like a broken JPEG. */
function ctlStickerImage(id) {
  const hit = ctlStickerImages[id];
  if (hit) return hit.data ? hit : null;      // present but still loading
  const entry = ctlStickerById(id);
  if (!entry) return null;
  const rec = { img: new Image(), data: null };
  ctlStickerImages[id] = rec;
  rec.img.onload = () => {
    const c = document.createElement('canvas');
    c.width = rec.img.width; c.height = rec.img.height;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(rec.img, 0, 0);
    rec.data = cx.getImageData(0, 0, c.width, c.height);
    /* The atlas was painted before this arrived, so repaint now. Placing a
       sticker for the first time in a session goes through here — and so
       does the lobby ornament on a cold load with several stickers already
       on it, where every image finishes decoding within a frame or two of
       each other. Scheduled rather than direct: a burst of N arrivals costs
       one texture re-upload instead of N (see ctlScheduleRedraw). */
    ctlScheduleRedraw();
  };
  rec.img.onerror = () => { /* a missing image is simply an absent sticker */ };
  rec.img.src = CTL_STICKER_DIR + entry.image;
  return null;
}

function ctlSampleImage(im, sx, sy, out) {
  const x = Math.max(0, Math.min(im.width - 1.001, sx - 0.5));
  const y = Math.max(0, Math.min(im.height - 1.001, sy - 0.5));
  const x0 = x | 0, y0 = y | 0, tx = x - x0, ty = y - y0, W = im.width, D = im.data;
  for (let k = 0; k < 4; k++) {
    const a = D[(y0 * W + x0) * 4 + k],       b = D[(y0 * W + x0 + 1) * 4 + k];
    const c = D[((y0 + 1) * W + x0) * 4 + k], d = D[((y0 + 1) * W + x0 + 1) * 4 + k];
    out[k] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
}

/* The border's width as a fraction of the sticker radius, and equally the
   amount the ART is inset by so the border always has somewhere to go.
   Deliberately the same as the lip ramp it replaces: the border IS the lip,
   made visible. */
const CTL_BORDER = 0.055;

/* How hard the border fills its band. The ring average tops out at 0.8 in the
   border band (al is 0 there by definition, so at most four of the five
   samples can be opaque), which is why a multiplier is needed at all: without
   one the ring never reaches its own colour.

   Measured on the worst case the spec names — flw on FRT #FFE500, 1.01:1 —
   over the 7,521 texels the border actually owns, as decile buckets of
   luminance against a shell sitting at 0.855:
     1.6  core at 0.30-0.40, a second band left stranded at 0.60-0.70
     2.4  core at 0.10-0.20, second band 0.40-0.50
     3.2  core at 0.10-0.20, second band pulled down to 0.30-0.40
   The width never changes — that is CTL_BORDER — only how opaque the ring is
   within it, so this saturates rather than thickens. 1.6 reads as a soft grey
   smudge; 3.2 reads as a cut edge. Past about 4 the outer fall-off starts to
   step instead of fading. */
const CTL_BORDER_FIRM = 3.2;

/* The real rasteriser, ported from the prototype's stamp(). NOT the stampFlat
   / OLD_WAY debug path, which pasted the sticker into the atlas with drawImage
   and inherited every distortion the atlas parameterisation has; it is not
   ported at all.

   This runs the other way round. For each atlas texel the sticker could touch,
   it asks the surface where that texel is and which part of the sticker lands
   there. Nothing about the atlas layout enters the answer, so the rim roll and
   the grip bulges stop mattering and a sticker running off the front island
   simply continues onto the back one.

   The die-cut border (spec D8) is the one part of this with no prototype
   precedent. Measured over the shipped nineteen: every one is near-white
   dominant, and against FRT's #FFE500 the worst (flw) contrasts at 1.01:1 —
   the same colour. The bump lip cannot rescue that on its own, because the
   ramp only exists INSIDE the sticker's own alpha, so a matching shell gives a
   faint relief outline around a flat blank plateau. */
function ctlStampShell(s) {
  const S = ctlStickerSurface;
  if (!S) return;
  const rec = ctlStickerImage(s.id);
  if (!rec) return;                       // not decoded yet; onload repaints
  const im = rec.data;
  const chart = S.makeChart(s), R = s.size, px = [0, 0, 0, 0];
  const W = im.width, H = im.height, DA = im.data;

  /* THE ART IS INSET, rather than the border added outside it (spec D8). All
     nineteen shipped stickers are full-bleed — measured: zero transparent
     margin on all four edges of every one — so a border drawn inside the
     existing [-R,R] square would clip. Insetting makes the border
     unconditional and costs future sticker authoring nothing: artwork that
     DOES carry a margin simply gets a slightly wider gap, which is harmless. */
  const AR = R * (1 - CTL_BORDER);        // the radius the artwork now occupies
  const eb = R * CTL_BORDER;              // ring radius = border width

  /* Alpha of the ARTWORK at a chart coordinate, under the inset mapping. Used
     both for the ring average and for the outside test, so the two can never
     disagree about where the artwork ends. */
  const alphaAt = (a, b) => {
    if (a < -AR || a > AR || b < -AR || b > AR) return 0;
    const x = (a / AR * 0.5 + 0.5) * W, y = (0.5 - b / AR * 0.5) * H;
    const xi = x < 0 ? 0 : (x > W - 1 ? W - 1 : x | 0);
    const yi = y < 0 ? 0 : (y > H - 1 ? H - 1 : y | 0);
    return DA[(yi * W + xi) * 4 + 3] / 255;
  };

  for (const bx of S.boxes(s)) {
    const w = bx.x1 - bx.x0, h = bx.y1 - bx.y0;
    if (w <= 0 || h <= 0) continue;
    const dst = ctlCtx.getImageData(bx.x0, bx.y0, w, h), D = dst.data;
    const bst = ctlBumpCtx.getImageData(bx.x0, bx.y0, w, h), B = bst.data;
    let touched = false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const xy = S.fromAtlas(bx.x0 + i + 0.5, bx.y0 + j + 0.5, bx.back);
      const c = chart(xy[0], xy[1], bx.back);
      if (!c) continue;
      const o = (j * w + i) * 4;

      ctlSampleImage(im, (c[0] / AR * 0.5 + 0.5) * W, (0.5 - c[1] / AR * 0.5) * H, px);
      const al = (c[0] < -AR || c[0] > AR || c[1] < -AR || c[1] > AR) ? 0 : px[3] / 255;

      /* The ring average is computed BEFORE the alpha early-out — that
         reordering is the whole mechanism. A texel with al ~ 0 but hgt > 0 is
         in the band just OUTSIDE the artwork, which is exactly the band the
         border occupies. Averaging over the ring also spreads the height ramp
         over the border width rather than the one or two texels of the image's
         own antialiased edge: a one-texel cliff makes the bump map sparkle
         instead of catching the light. */
      const hgt = (al + alphaAt(c[0] + eb, c[1]) + alphaAt(c[0] - eb, c[1])
                      + alphaAt(c[0], c[1] + eb) + alphaAt(c[0], c[1] - eb)) / 5;
      if (al <= 0.004 && hgt <= 0.004) continue;   // genuinely outside: untouched

      /* Height first, so the border stands proud WITH the artwork — it is part
         of the same piece of vinyl, and a border at height zero would read as
         painted on rather than cut out. Overlaps keep the taller. */
      const hv = hgt * 255;
      if (hv > B[o]) { B[o] = B[o + 1] = B[o + 2] = hv; B[o + 3] = 255; }

      if (al > 0.004) {
        // inside the artwork — colours go down flat, no baked shading
        D[o]     = D[o]     * (1 - al) + px[0] * al;
        D[o + 1] = D[o + 1] * (1 - al) + px[1] * al;
        D[o + 2] = D[o + 2] * (1 - al) + px[2] * al;
      } else {
        /* THE BORDER — light shells only get the height ramp above, not a
           painted ring: the sticker's own near-white die-cut edge already
           reads fine against a light surface, so an added dark ring was
           redundant padding on top of padding. A DARK shell still gets the
           light ring (242) — chosen per texel from the atlas pixel ALREADY
           underneath, so a sticker straddling the faceplate edge still works
           with no special case, and a recolour re-derives it for free since
           ctlRedrawShell re-stamps every sticker from scratch.

           Coverage is the ring average, so the outer edge antialiases instead
           of stepping. */
        const lum = (0.2126 * D[o] + 0.7152 * D[o + 1] + 0.0722 * D[o + 2]) / 255;
        if (lum <= 0.5) {
          const bc = 242;
          const a2 = Math.min(1, hgt * CTL_BORDER_FIRM);
          D[o]     = D[o]     * (1 - a2) + bc * a2;
          D[o + 1] = D[o + 1] * (1 - a2) + bc * a2;
          D[o + 2] = D[o + 2] * (1 - a2) + bc * a2;
        }
      }
      D[o + 3] = 255; touched = true;
    }
    if (touched) {
      ctlCtx.putImageData(dst, bx.x0, bx.y0);
      ctlBumpCtx.putImageData(bst, bx.x0, bx.y0);
    }
  }
}

/* Both islands stop dead at the silhouette and the renderer filters texels
   bilinearly, so along the crest it mixes painted texels with the unpainted
   atlas behind them and draws a hard line exactly where the two sheets meet.
   That line is what read as stickers being "cut off at the seam" even when
   they had wrapped correctly. Bleeding the painted edge a few texels outward
   gives the filter something sensible to reach for. Both atlases get it:
   padding only the colours would leave the height map with a cliff at the
   crest, and the renderer lights that cliff as a crease across every wrap. */
function ctlPadEdges(boxes) {
  const PAD = ctlStickerPad;
  if (!PAD || !PAD.dst.length) return;
  const regions = boxes && boxes.length
    ? boxes.map(b => ({ x0: Math.max(0, b.x0 - 12), y0: Math.max(0, b.y0 - 12),
                        x1: Math.min(CTL_ATLAS, b.x1 + 12), y1: Math.min(CTL_ATLAS, b.y1 + 12) }))
    : [{ x0: 0, y0: 0, x1: CTL_ATLAS, y1: CTL_ATLAS }];
  for (const r of regions) {
    const w = r.x1 - r.x0, h = r.y1 - r.y0;
    if (w <= 0 || h <= 0) continue;
    const im = ctlCtx.getImageData(r.x0, r.y0, w, h), D = im.data;
    const bm = ctlBumpCtx.getImageData(r.x0, r.y0, w, h), BD = bm.data;
    for (let i = 0; i < PAD.dst.length; i++) {
      const dy = (PAD.dst[i] / CTL_ATLAS) | 0, dx = PAD.dst[i] - dy * CTL_ATLAS;
      if (dx < r.x0 || dx >= r.x1 || dy < r.y0 || dy >= r.y1) continue;
      const sy = (PAD.src[i] / CTL_ATLAS) | 0, sx = PAD.src[i] - sy * CTL_ATLAS;
      if (sx < r.x0 || sx >= r.x1 || sy < r.y0 || sy >= r.y1) continue;
      const d = ((dy - r.y0) * w + (dx - r.x0)) * 4, s = ((sy - r.y0) * w + (sx - r.x0)) * 4;
      D[d] = D[s]; D[d + 1] = D[s + 1]; D[d + 2] = D[s + 2]; D[d + 3] = 255;
      BD[d] = BD[s]; BD[d + 1] = BD[s + 1]; BD[d + 2] = BD[s + 2]; BD[d + 3] = 255;
    }
    ctlCtx.putImageData(im, r.x0, r.y0);
    ctlBumpCtx.putImageData(bm, r.x0, r.y0);
  }
}

/* Recolouring repaints what the atlas is FILLED with, never material.color: the
   shell material's colour multiplies its whole map, so tinting it would tint
   every sticker placed on it later too. The buttons are the opposite case —
   solid untextured materials sharing no painted surface — so they take
   material.color directly. */
function ctlRedrawShell() {
  ctlCtx.fillStyle = ctlDesign.shell;
  ctlCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS);
  // bare shell is height zero; only stickers stand proud of it
  if (ctlBumpCtx) { ctlBumpCtx.fillStyle = '#000'; ctlBumpCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS); }
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
  /* Stickers go on AFTER the plate, so one can straddle the faceplate edge.
     A recolour re-enters here and re-stamps every sticker from scratch, which
     is what lets the die-cut border (Task 6) re-derive against the new shell
     colour for free. */
  if (ctlStickerSurface) {
    for (const s of ctlDesign.stickers || []) if (s.surface === 'shell') ctlStampShell(s);
    ctlPadEdges(null);
    if (ctlBumpTex) ctlBumpTex.needsUpdate = true;
  }
  ctlTex.needsUpdate = true;
}

/* ── Ear UVs ──────────────────────────────────────────────────────────────
   buildEars returns ExtrudeGeometry's DEFAULT UVs, which are meaningless for
   painting: the shipped colour-only build never noticed, because it only ever
   flood-fills the ear atlas. Ported from the prototype.

   Planar UVs over BOTH outward-facing caps. The ellipse extrusion has one cap
   that used to be the only stickerable "crown" and a second, opposite cap that
   was parked as bevel/side; each now gets its own band within the ear's half of
   the canvas — a 2x2 grid, left/right ear by column and front/back cap by row.
   Mixed-normal triangles (the bevel, the rim) are parked on a SINGLE texel of
   bare ear colour, so nothing smears across either cap and a tap there can be
   rejected cheaply (see ctlPlanEarSticker).

   The ears each hold geo.clone(), so per-mesh UVs are safe. This must NOT be
   pushed down into controller-body.js: that module is shared geometry with its
   own contract harness, and these UVs are this renderer's business. */
function ctlBuildEarUV() {
  const HALF = [0.25, 0.75];                    // ear column centres
  const VBAND = { back: 0.74, front: 0.26 };    // cap band centres
  ctlEars.forEach((m, idx) => {
    const g = m.geometry, p = g.attributes.position.array, nm = g.attributes.normal.array;
    let hw = 0, hh = 0;
    for (let i = 0; i < p.length; i += 3) {
      hw = Math.max(hw, Math.abs(p[i])); hh = Math.max(hh, Math.abs(p[i + 1]));
    }
    // 0.40 not 0.94: half the height, two bands not one
    ctlEarScale = Math.min(0.46 / (2 * hw), 0.40 / (2 * hh));
    /* Which local cap — +Z or -Z in the ellipse's OWN space — actually faces
       the controller's front. Read off the mesh's own fixed rotation rather
       than assumed, so this keeps working if buildEars' tilt numbers change. */
    const q = new THREE.Quaternion().setFromEuler(m.rotation);
    m.userData.earQ = q;
    const frontIsPosZ = new THREE.Vector3(0, 0, 1).applyQuaternion(q).z
                      > new THREE.Vector3(0, 0, -1).applyQuaternion(q).z;
    const uv = new Float32Array(p.length / 3 * 2);
    for (let t = 0; t < p.length / 3; t += 3) {
      let side = null, consistent = true;
      for (let k = 0; k < 3; k++) {
        const nz = nm[(t + k) * 3 + 2];
        const s = nz < -0.35 ? (frontIsPosZ ? 'back' : 'front')
                : (nz >  0.35 ? (frontIsPosZ ? 'front' : 'back') : null);
        if (k === 0) side = s; else if (s !== side) consistent = false;
      }
      if (!consistent) side = null;
      for (let k = 0; k < 3; k++) {
        const i = t + k;
        if (side) {
          uv[i * 2]     = HALF[idx] + p[i * 3] * ctlEarScale;
          uv[i * 2 + 1] = VBAND[side] - p[i * 3 + 1] * ctlEarScale;
        } else {
          uv[i * 2] = 0.998; uv[i * 2 + 1] = 0.004;   // the parked texel
        }
      }
    }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  });
}

/* The die-cut border (spec D8) on the ear, done in 2D.
   ─────────────────────────────────────────────────────────────────────────
   D8 says EVERY sticker, and an ear sticker has the same problem the shell
   one does: the ears take a colour from the same 20 brand hexes, so near-white
   art on FRT's #FFE500 ears measures the same 1.01:1 it does on the shell.

   The shell chooses the border colour per texel because the shell atlas holds
   TWO colours and a sticker can straddle the faceplate edge. The ear atlas is
   a flat fill of one colour, so per-texel and per-ear are the same answer —
   one luminance test on ctlDesign.ears gives it, and nothing is lost.

   The outline itself is a ring of offset silhouette draws rather than a blur:
   a blur fades, and a die cut does not. Eight is enough at this size — the
   silhouette is drawn at the sticker's own scale, so gaps between adjacent
   offsets are sub-texel. */
const CTL_EAR_BORDER_STEPS = 8;

function ctlEarSilhouette(im, w, h, hex) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';    // keep the alpha, replace the colour
  g.fillStyle = hex;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/* The ears get their own texture rather than a corner of the body atlas: they
   are separate meshes standing off the boss — that is WHY they are separate,
   the height field cannot do the undercut — so nothing ever crosses between
   the two, and a second small canvas costs far less than repacking the body's
   islands. Their outward face is close to flat, so this is plain 2D drawing:
   no chart and no per-texel rasteriser, because the crown has almost no
   curvature to correct for. */
function ctlRedrawEars() {
  ctlEarCtx.fillStyle = ctlDesign.ears;
  ctlEarCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS);
  if (ctlEarBumpCtx) { ctlEarBumpCtx.fillStyle = '#000'; ctlEarBumpCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS); }

  /* One luminance test for the whole atlas — see ctlEarSilhouette's note on
     why per-texel buys nothing here. Light ears skip the painted ring below
     entirely (matches ctlStampShell) — the sticker's own near-white die-cut
     edge already reads fine there, so a dark ring on top was redundant. */
  const en = parseInt(ctlDesign.ears.slice(1), 16);
  const elum = (0.2126 * ((en >> 16) & 255) + 0.7152 * ((en >> 8) & 255)
                + 0.0722 * (en & 255)) / 255;
  const borderHex = '#f2f2f2';

  for (const s of ctlDesign.stickers || []) {
    if (s.surface !== 'earL' && s.surface !== 'earR') continue;
    const rec = ctlStickerImage(s.id);
    if (!rec) continue;                      // not decoded yet; onload repaints
    const im = rec.img;
    const w = s.r * 2 * ctlEarScale * CTL_EAR_ATLAS, h = w * im.height / im.width;
    /* The art is inset and the border drawn in the freed band, exactly as on
       the shell (spec D8) — so `r` means the same thing on both surfaces: the
       whole footprint, border included, not the artwork plus an overhang. */
    const aw = w * (1 - CTL_BORDER), ah = h * (1 - CTL_BORDER);
    const off = Math.max(1, w * CTL_BORDER * 0.5);

    ctlEarCtx.save(); ctlEarBumpCtx.save();
    /* Clipped to its own quadrant — ear column (left/right) AND cap band
       (front/back). A sticker near a region's inner edge would otherwise paint
       across into whichever neighbour shares that edge. u/v are the raycast's
       full-atlas UVs and already carry both offsets; do not add them again. */
    for (const g of [ctlEarCtx, ctlEarBumpCtx]) {
      g.beginPath();
      g.rect(s.u < 0.5 ? 0 : CTL_EAR_ATLAS / 2, s.v > 0.5 ? CTL_EAR_ATLAS / 2 : 0,
             CTL_EAR_ATLAS / 2, CTL_EAR_ATLAS / 2);
      g.clip();
      g.translate(s.u * CTL_EAR_ATLAS, s.v * CTL_EAR_ATLAS);
      g.rotate(s.rot);
    }

    // the die-cut edge goes down first, as a ring of offset silhouettes —
    // only on a DARK ear; a light one relies on the sticker's own border
    if (elum <= 0.5) {
      const sil = ctlEarSilhouette(im, aw, ah, borderHex);
      for (let k = 0; k < CTL_EAR_BORDER_STEPS; k++) {
        const a = k * 2 * Math.PI / CTL_EAR_BORDER_STEPS;
        ctlEarCtx.drawImage(sil, -aw / 2 + Math.cos(a) * off, -ah / 2 + Math.sin(a) * off, aw, ah);
      }
    }
    // colours go down flat, exactly as on the shell — no baked shading
    ctlEarCtx.drawImage(im, -aw / 2, -ah / 2, aw, ah);

    /* Height: the sticker's own silhouette in white, blurred just enough to
       turn its cut edge into a short ramp. Same lip the shell gets, done with
       a 2D blur rather than per-texel because the ear cap is flat. Drawn at
       the FULL w/h so the border stands proud with the artwork, as it does on
       the shell — a border at height zero would read as painted on rather than
       cut out.
       'lighten' takes the per-pixel MAX against what is already there, so a
       stack of overlapping stickers reads as the tallest at each point.
       'lighter' was tried first and was the actual cause of ear stickers
       looking puffy and blown out: it SUMS every overlap, so a handful of them
       saturated to solid white over a spreading area. Do not change it back. */
    ctlEarBumpCtx.globalCompositeOperation = 'lighten';
    try { ctlEarBumpCtx.filter = 'blur(' + Math.max(1, w * CTL_BORDER * 0.9) + 'px) brightness(0) invert(1)'; } catch (e) {}
    ctlEarBumpCtx.drawImage(im, -w / 2, -h / 2, w, h);
    ctlEarBumpCtx.filter = 'none'; ctlEarBumpCtx.globalCompositeOperation = 'source-over';
    ctlEarCtx.restore(); ctlEarBumpCtx.restore();
  }
  ctlEarTex.needsUpdate = true;
  if (ctlEarBumpTex) ctlEarBumpTex.needsUpdate = true;
}

/* The crown is 0.36 by 0.52 and its outer 0.075 is bevel, so a sticker is held
   to what will actually lie flat on it. A sticker cannot run from the ear onto
   the shell: there is a real gap between them, and no parameterisation bridges
   a gap. Returns a placement record, or null with a refusal already reported. */
function ctlPlanEarSticker(uv, want, rot) {
  /* Everything that is not an outward cap shares one parked texel, so a tap on
     the side or the bevel would paint that texel and flood the whole rim of the
     ear with it. */
  if (uv.y < 0.05 || uv.x > 0.99) return { ok: false, reason: 'earSide' };
  const r = Math.min(want, CTL_EAR_MAX_R);
  return { ok: true, rec: { surface: uv.x < 0.5 ? 'earL' : 'earR',
                            u: uv.x, v: uv.y, r: r, rot: rot },
           capped: r < want - 1e-4 };
}

// ── Sticker editing: live state and the tap gesture ──────────────────────────
/* One place decides what a refusal means, so nothing can disagree about
   whether a spot is legal. Ported verbatim from standalone.html:2000, plus the
   ear side (standalone.html:2022). */
const CTL_REFUSAL = {
  off:     'That is off the edge of the controller.',
  ring:    'The stick rings and the bosses behind the ears are off-limits.',
  edge:    'Too tight an edge to wrap around — try a smaller sticker or move in a bit.',
  curve:   'Too curved here for a sticker this big — try a smaller one.',
  earSide: 'That is the side of the ear — stickers go on its face.',
};

let ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };

/* A burst of 'adjust' patches (a slider drag, a live sticker reposition, or
   several sticker images decoding back-to-back on the lobby ornament) each
   want the canvas re-rasterised and both textures re-uploaded to the GPU —
   the expensive half of a redraw. Doing that once per event in the burst is
   what made the sliders feel clunky. This collapses any such burst into ONE
   redraw on the next frame, however many callers asked for one in between. */
let ctlRedrawScheduled = false;
function ctlScheduleRedraw() {
  if (ctlRedrawScheduled) return;
  ctlRedrawScheduled = true;
  requestAnimationFrame(() => {
    ctlRedrawScheduled = false;
    ctlRedrawShell();
    ctlRedrawEars();
    ctlWake();
  });
}

/* The reducer is pure and returns a NEW stickers array on every structural
   action, so ctlDraft has to be re-pointed at it each time. Assigning the
   array (rather than mutating in place) is deliberate: ctlApplyDesign does
   Object.assign({}, ctlDesign, design), which would otherwise leave ctlDesign
   and ctlDraft sharing one array and make "discard unsaved changes" a lie. */
function ctlStickerDispatch(action) {
  const before = ctlStickerState;
  ctlStickerState = ctlStickerReduce(before, action);
  if (ctlStickerState === before) return;         // a no-op action
  if (ctlDraft) ctlDraft.stickers = ctlStickerState.stickers;
  ctlDesign.stickers = ctlStickerState.stickers;
  /* 'adjust' (the rotate/size sliders, and a live sticker drag — see
     ctlBindPointer) fires in rapid bursts and touches neither the sticker
     list nor the selection, so the gallery/colour panel need not rebuild on
     every tick — only the canvas, and that through the coalesced path. */
  if (action.t === 'adjust') { ctlScheduleRedraw(); return; }
  ctlRedrawShell();
  ctlRedrawEars();
  ctlWake();
  ctlRenderPanel();
}

function ctlStickerSay(msg) {
  const el = document.getElementById('ctl-sticker-say');
  if (el) el.textContent = msg || '';
}

/* The size slider in body units. The prototype's conversion, unchanged: the
   slider is a percentage of half the body's width. */
function ctlStickerWantRadius() {
  const el = document.getElementById('ctl-sticker-size');
  const pct = el ? +el.value : 18;
  const U = ctlGeo.userData;
  return (pct / 100) * (U.maxx - U.minx) / 1.96;
}

function ctlStickerWantRot() {
  const el = document.getElementById('ctl-sticker-rot');
  return (el ? +el.value : 0) * Math.PI / 180;
}

/* Which placement, if any, did this tap land on? Compared in the sticker's own
   chart space, so a wrapped sticker is hit correctly on both sheets and the
   test matches exactly what was painted — ctlStampShell bounds the stamp at
   the same |c| <= size. */
function ctlStickerHitIndex(xy, back) {
  const S = ctlStickerSurface;
  if (!S) return -1;
  const list = ctlStickerState.stickers;
  // last painted is on top, so search backwards
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.surface !== 'shell') continue;
    const c = S.makeChart(s)(xy[0], xy[1], back);
    if (c && Math.abs(c[0]) <= s.size && Math.abs(c[1]) <= s.size) return i;
  }
  return -1;
}

function ctlStickerEarHitIndex(uv) {
  const list = ctlStickerState.stickers;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.surface !== 'earL' && s.surface !== 'earR') continue;
    // same quadrant, and within the sticker's own UV footprint
    if ((uv.x < 0.5) !== (s.u < 0.5)) continue;
    if ((uv.y > 0.5) !== (s.v > 0.5)) continue;
    const half = s.r * ctlEarScale;
    if (Math.abs(uv.x - s.u) <= half && Math.abs(uv.y - s.v) <= half) return i;
  }
  return -1;
}

/* Shared by the tap gesture and the drag-to-reposition gesture below: casts
   from a pointer event against the body + ears and returns the first hit
   with a uv, or null. */
function ctlStickerRay(ev) {
  const r = ctlRenderer.domElement.getBoundingClientRect();
  _ctlPtr.x =  ((ev.clientX - r.left) / r.width)  * 2 - 1;
  _ctlPtr.y = -((ev.clientY - r.top)  / r.height) * 2 + 1;
  _ctlRay.setFromCamera(_ctlPtr, ctlCamera);
  const hits = _ctlRay.intersectObjects([ctlBody].concat(ctlEars), false);
  return (hits.length && hits[0].uv) ? hits[0] : null;
}

/* Assigned to ctlOnTap in the Workshop. The pointer handlers are UNCHANGED:
   ctlBindPointer already tells a tap from a drag, and that disambiguation is
   flagged as fragile in controller-handoff-v3.md § 3.1. Dragging still rotates
   the view — placing, selecting and relocating are all the same single tap
   (spec D6), which is exactly why this needed no new gesture. */
function ctlStickerTap(ev) {
  if (!ctlStickerSurface) return;
  const hit0 = ctlStickerRay(ev);
  if (!hit0) return;
  const hits = [hit0];

  const mode = ctlStickerMode(ctlStickerState);

  // ---- an ear ----
  if (hits[0].object !== ctlBody) {
    const uv = hits[0].uv;
    const hitIdx = ctlStickerEarHitIndex(uv);
    if (mode === 'idle') { if (hitIdx >= 0) ctlStickerSelect(hitIdx); return; }
    /* Tapping a DIFFERENT already-placed sticker while one is selected
       re-selects it rather than relocating the old one onto it — to move a
       sticker on top of another, drag it there instead (ctlStickerDragTo
       has no such guard: dragging onto an occupied spot is still allowed). */
    if (mode === 'selected' && hitIdx >= 0 && hitIdx !== ctlStickerState.selected) {
      ctlStickerSelect(hitIdx);
      return;
    }
    const plan = ctlPlanEarSticker(uv, ctlStickerWantRadius(), ctlStickerWantRot());
    if (!plan.ok) { ctlStickerSay(CTL_REFUSAL[plan.reason]); return; }
    ctlStickerDispatch({ t: mode === 'armed' ? 'place' : 'relocate', rec: plan.rec });
    ctlStickerSay('On the ear' + (plan.capped ? ' — sized down to fit the face.' : '.'));
    return;
  }

  // ---- the shell ----
  const uv = hits[0].uv, back = uv.y < 0.50;
  const xy = ctlStickerSurface.fromAtlas(uv.x * CTL_ATLAS, uv.y * CTL_ATLAS, back);
  const hitIdx = ctlStickerHitIndex(xy, back);
  if (mode === 'idle') { if (hitIdx >= 0) ctlStickerSelect(hitIdx); return; }
  if (mode === 'selected' && hitIdx >= 0 && hitIdx !== ctlStickerState.selected) {
    ctlStickerSelect(hitIdx);
    return;
  }
  const want = ctlStickerWantRadius();
  const p = ctlStickerSurface.plan(xy[0], xy[1], back, want);
  if (!p.ok) { ctlStickerSay(CTL_REFUSAL[p.reason] || 'Cannot place a sticker there.'); return; }
  /* plan() returns x/y only on the rim branch, where it nudges the anchor onto
     the crest so the wrap is even. A flat placement keeps the tapped point. */
  const rec = { surface: 'shell',
                x: p.x !== undefined ? p.x : xy[0],
                y: p.y !== undefined ? p.y : xy[1],
                back: back, rot: ctlStickerWantRot(), size: p.size, chart: p.chart };
  ctlStickerDispatch({ t: mode === 'armed' ? 'place' : 'relocate', rec: rec });
  ctlStickerSay(p.chart === 'rim' ? 'Wrapped over the edge.'
                                  : 'Placed on the ' + (back ? 'back' : 'front') + '.');
}

/* Selects placement `index` and, if the selection actually changed, surfaces
   it: switches to the Stickers tab and rings its book tile — the Tap-Hold
   Reference pattern (ui-style.md), reused here for a plain tap since a
   selection with nothing visible changing on screen isn't really feedback. */
function ctlStickerSelect(index) {
  const before = ctlStickerState.selected;
  ctlStickerDispatch({ t: 'hit', index: index });
  if (ctlStickerState.selected === before) return;   // out of range — a no-op
  ctlStickerGoToBook(ctlStickerState.stickers[index].id);
}

function ctlStickerGoToBook(id) {
  ctlActiveTab = 'stickers';
  ctlRenderPanel();
  refHighlightRow(document.getElementById('ctl-sticker-book'), 'data-ctl-sticker-id', id,
    'ctl-sticker-ref-row-ping');
}

/* The reverse of ctlStickerGoToBook: picking a placed sticker from the book
   rotates the model to bring it into view, instead of leaving the player to
   hunt for it by dragging.

   FIRST VERSION of this aimed at the sticker's raw local POINT — atan2(-x,z)
   on ctlStickerSurface.point(), on the reasoning that rotating a point's
   (x,z) onto the +Z axis brings it in front of the camera. That is true for
   a point on a sphere or cylinder, and false here: the front/back faces are
   parameterised nearly FLAT (point()'s x/y ARE the atlas x/y, unwarped —
   see its own comment), so a sticker sitting at x=1.2 on an otherwise flat
   front measured a 70° yaw purely from its lateral offset, spinning a
   face-on sticker to a steep, unwanted angle. Measured across a spread of
   front/back placements: point-based yaw ranged ±109°; normal-based below.

   The FIX aims at the local surface NORMAL instead — the vector that
   actually encodes "which way does this patch face," independent of how far
   sideways the parameterisation happens to put it. The same atan2(-n[0],n[2])
   rotates that normal onto +Z, i.e. turns the model until the sticker's own
   surface points straight at the camera: near 0° for anywhere on the mostly-
   flat front, and only the real curvature (a rim, the back's own gentle
   dome) contributes any yaw at all. Only yaw moves; the player's own tilt
   (ctlRotX) is left alone. */
function ctlStickerAimYaw(normal) {
  return Math.atan2(-normal[0], normal[2]);
}

/* Ears have no ctlStickerSurface.normal() of their own (that API is shell-
   only), so the aim normal is approximate: read at the same shell-atlas
   coordinate CTL_STICKER_OPT already uses for that ear's boss keep-out
   (x = ∓0.84, y = 0.84), which sits right where the real ear mounts — the
   shell's own curvature there is a reasonable stand-in for the ear cap's
   outward direction. Good enough to bring the ear into view; this is a
   camera convenience, not a placement.

   normal(x,y,back)'s OWN formula is n=[-zx,-zy,1] — always biased toward
   local +Z, because it treats point()'s z as a height field the way you
   would for a single graph z=f(x,y) opening upward. That is the right
   outward direction for the FRONT sheet (z=heightF, bulging toward +Z) but
   exactly backwards for the BACK sheet (z=-heightB, bulging toward -Z):
   measured at (0,0), normal(0,0,true) returns the identical [0,0,1] that
   normal(0,0,false) does, when the back's true outward direction is
   [0,0,-1]. A back-placed sticker's aim yaw came out near 0° instead of
   near 180° — "snaps to the front" exactly as reported. Nothing ELSE that
   calls normal() (makeChart's tangent frame) cares about this: it only
   needs a vector perpendicular to the local tangent plane to build a self-
   consistent basis, and gets one either way. This is the first caller that
   needs the true facing direction, so the correction belongs here. */
function ctlStickerAimNormal(s) {
  const back = s.surface === 'shell' ? s.back : s.v > 0.5;
  const n = s.surface === 'shell'
    ? ctlStickerSurface.normal(s.x, s.y, back)
    : ctlStickerSurface.normal(s.surface === 'earL' ? -0.84 : 0.84, 0.84, back);
  return back ? [-n[0], -n[1], -n[2]] : n;
}

function ctlStickerGoToModel(s) {
  if (!ctlStickerSurface) return;
  ctlRotYTarget = ctlStickerAimYaw(ctlStickerAimNormal(s));
  ctlWake();
}

// ── Sticker editing: drag-to-reposition ──────────────────────────────────────
/* A press that lands on the ALREADY-SELECTED placement starts a live drag
   instead of rotating the view (see ctlBindPointer); anywhere else, dragging
   is untouched. Set by ctlBindPointer's pointerdown, read by pointermove and
   pointerup. */
let ctlStickerDragActive = false;

/* Does this raycast hit land on the sticker that is currently selected? The
   only question a pointerdown needs answered to decide rotate-view vs
   drag-sticker. */
function ctlStickerHitIsSelected(hit) {
  if (!ctlStickerSurface || ctlStickerState.selected < 0) return false;
  if (hit.object !== ctlBody) return ctlStickerEarHitIndex(hit.uv) === ctlStickerState.selected;
  const uv = hit.uv, back = uv.y < 0.50;
  const xy = ctlStickerSurface.fromAtlas(uv.x * CTL_ATLAS, uv.y * CTL_ATLAS, back);
  return ctlStickerHitIndex(xy, back) === ctlStickerState.selected;
}

/* The drag preview: a flat 2D ghost that follows the pointer directly (no
   raycast-to-screen projection needed — the pointer event already carries
   its own screen position), instead of re-rasterising the real sticker onto
   the 3D shell every frame. That rasterisation is the expensive part (a
   canvas fill plus a full 2048² texture re-upload per event — see
   ctlScheduleRedraw's own note) and a drag can fire it 30+ times a second;
   moving a cheap DOM element costs nothing by comparison. The REAL sticker
   is left exactly where it was for the whole drag and only actually moves
   once, on release — see ctlStickerDragCommit. */
let ctlDragGhostEl = null;
function ctlEnsureDragGhost() {
  if (ctlDragGhostEl) return ctlDragGhostEl;
  const stage = document.getElementById('ctl-stage');
  if (!stage) return null;
  const el = document.createElement('div');
  el.className = 'ctl-drag-ghost';
  el.style.display = 'none';
  stage.appendChild(el);
  ctlDragGhostEl = el;
  return el;
}

/* Legal (green) / refused (red) ring — the same distinction CTL_REFUSAL's
   text already carries, just visible without reading it mid-drag. */
function ctlUpdateDragGhost(ev, ok, imgSrc, diameterPx) {
  const el = ctlEnsureDragGhost();
  if (!el) return;
  const stage = document.getElementById('ctl-stage');
  const r = stage.getBoundingClientRect();
  el.style.display = 'block';
  el.style.left = (ev.clientX - r.left) + 'px';
  el.style.top = (ev.clientY - r.top) + 'px';
  el.style.width = el.style.height = diameterPx + 'px';
  el.style.backgroundImage = 'url(' + imgSrc + ')';
  el.style.borderColor = ok ? '#22c55e' : '#ef4444';
}

function ctlHideDragGhost() {
  if (ctlDragGhostEl) ctlDragGhostEl.style.display = 'none';
}

/* Roughly the on-screen size a sticker of this body-space radius reads at —
   not pixel-exact (the real placement is decided by the raycast on release,
   not by this), just close enough that the ghost feels like the sticker
   rather than a generic dot. Inverts ctlStickerWantRadius()'s own
   percentage-of-half-body-width conversion. */
function ctlDragGhostDiameter(curRadius) {
  const U = ctlGeo.userData;
  const pct = curRadius / ((U.maxx - U.minx) / 1.96);
  const stage = document.getElementById('ctl-stage');
  const w = stage ? stage.getBoundingClientRect().width : 300;
  return Math.max(24, Math.min(140, pct * w * 0.92));
}

/* The one placement the drag would commit if released right now — null
   whenever the pointer is over an illegal spot, which is what makes "let go
   over a refused spot" a no-op instead of snapping back to something else. */
let ctlStickerDragPending = null;

/* One frame of the live drag: re-plan the selected sticker's position under
   the current pointer, exactly as a tap would — same legality checks, same
   refusal messages — but only moves the GHOST. Nothing is dispatched, no
   texture is touched, until the drag ends (ctlStickerDragCommit). Rotation
   and size are carried over unchanged; this only moves the sticker. */
function ctlStickerDragTo(ev) {
  const hit = ctlStickerRay(ev);
  const sel = ctlStickerState.stickers[ctlStickerState.selected];
  if (!sel) return;
  const curRadius = sel.surface === 'shell' ? sel.size : sel.r;
  const entry = ctlStickerById(sel.id);
  const imgSrc = entry ? CTL_STICKER_DIR + entry.image : '';
  const diameter = ctlDragGhostDiameter(curRadius);

  if (!hit) { ctlStickerDragPending = null; ctlUpdateDragGhost(ev, false, imgSrc, diameter); return; }

  if (hit.object !== ctlBody) {
    const plan = ctlPlanEarSticker(hit.uv, curRadius, sel.rot);
    ctlUpdateDragGhost(ev, plan.ok, imgSrc, diameter);
    if (!plan.ok) { ctlStickerDragPending = null; ctlStickerSay(CTL_REFUSAL[plan.reason]); return; }
    /* r must travel too — dragging in from the shell leaves no r on the
       sticker at all (only a shell placement carries size), and ear hit-
       testing/stamping both read s.r directly. */
    ctlStickerDragPending = { surface: plan.rec.surface, u: plan.rec.u, v: plan.rec.v, r: plan.rec.r };
    ctlStickerSay(plan.capped ? 'On the ear — sized down to fit the face.' : '');
    return;
  }

  const uv = hit.uv, back = uv.y < 0.50;
  const xy = ctlStickerSurface.fromAtlas(uv.x * CTL_ATLAS, uv.y * CTL_ATLAS, back);
  const p = ctlStickerSurface.plan(xy[0], xy[1], back, curRadius);
  ctlUpdateDragGhost(ev, p.ok, imgSrc, diameter);
  if (!p.ok) { ctlStickerDragPending = null; ctlStickerSay(CTL_REFUSAL[p.reason] || 'Cannot place a sticker there.'); return; }
  ctlStickerDragPending = {
    surface: 'shell',
    x: p.x !== undefined ? p.x : xy[0],
    y: p.y !== undefined ? p.y : xy[1],
    back: back, size: p.size, chart: p.chart,
  };
  ctlStickerSay('');
}

/* Drag release: commit the last legal position in ONE dispatch (still
   through 'adjust', so the whole drag remains one undo step), or do nothing
   if the pointer was released over an illegal spot — the sticker simply
   stays where it started. Either way the ghost comes down. */
function ctlStickerDragCommit() {
  if (ctlStickerDragPending) ctlStickerDispatch({ t: 'adjust', patch: ctlStickerDragPending });
  ctlStickerDragPending = null;
  ctlHideDragGhost();
}

function ctlSetButtonColour(hex) {
  CTL_BUTTON_MATS.forEach(m => {
    m.color.setHex(parseInt(hex.slice(1), 16)).convertSRGBToLinear();
  });
}

/* A design with stickers needs the surface; a design without one never builds
   it. So the trigger is the DESIGN, not the screen — which is what lets the
   lobby ornament show a decorated controller while preserving the guarantee
   that colour-only use pays nothing (spec § 5.2).

   Deferred exactly the way ctlMountLobby already defers buildBody: this runs
   on the app's front door, and the build is the single most expensive thing
   the feature does. */
let ctlStickerBuildQueued = false;
function ctlMaybeBuildStickerSurface() {
  if (ctlStickerSurface || ctlStickerBuildQueued) return;
  if (!ctlDesign || !Array.isArray(ctlDesign.stickers) || !ctlDesign.stickers.length) return;
  ctlStickerBuildQueued = true;
  const run = () => {
    /* The manifest gates rule 2 of the load validation, so it has to land
       first — otherwise every placement is dropped as an unknown id. The flag
       is held ACROSS the fetch rather than released as this callback starts:
       released early, a second ctlApplyDesign (a colour tapped in the Workshop
       while the fetch is in flight) queues a parallel run whose known-only
       pass would write the un-probed list back over the one the first run's
       legality probe had already pruned. */
    ctlLoadStickerManifest().then(() => {
      ctlStickerBuildQueued = false;
      if (ctlStickerSurface) return;          // the Stickers tab got there first
      ctlDesign.stickers = ctlValidateStickers(ctlDesign.stickers, {
        known: new Set(ctlStickerManifest.map(s => s.id)),
      });
      ctlEnsureStickerSurface();     // re-validates with the legality probe and repaints
    });
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 0);
}

function ctlApplyDesign(design) {
  if (design) ctlDesign = Object.assign({}, ctlDesign, design);
  if (!ctlBuilt) return;
  ctlRedrawShell();
  ctlRedrawEars();
  ctlSetButtonColour(ctlDesign.buttons);
  ctlMaybeBuildStickerSurface();   // no-op unless this design actually has stickers
  ctlWake();
}

function ctlEnsureBuilt() {
  if (ctlBuilt) return true;
  if (typeof THREE === 'undefined' || !window.ControllerBody) return false;

  ctlBuildScene();
  ctlBuildAtlases();

  const geo = ControllerBody.buildBody(THREE, {});
  ctlGeo = geo;                      // the sticker surface needs geo.userData later
  ctlBuildPlateUV(geo);

  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06,
                                                 bumpMap: ctlBumpTex, bumpScale: 0.035 });
  ctlBody = new THREE.Mesh(geo, ctlShellMat);
  ctlBody.castShadow = true; ctlBody.receiveShadow = true;
  ctlRig.add(ctlBody);

  ctlEarMat = new THREE.MeshStandardMaterial({ map: ctlEarTex, roughness: .52, metalness: .06,
                                               bumpMap: ctlEarBumpTex, bumpScale: 0.035 });
  ctlEars = ControllerBody.buildEars(THREE, ctlEarMat);
  ctlBuildEarUV();                   // buildEars ships default UVs — see the note there
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
/* Non-null while auto-rotating to a book-selected sticker (ctlStickerGoToModel)
   — the yaw ctlTick eases ctlRotY toward, taking the shortest way round.
   null the instant a manual drag grabs the view (see ctlBindPointer's
   pointerdown) or the tween arrives. */
let ctlRotYTarget = null;
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
  if (ctlRotYTarget !== null) return true;
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
  if (ctlRotYTarget !== null) {
    /* Shortest way round — wrap the delta into (-PI, PI] before easing, or a
       target just past the wrap point would spin the long way. Reduced
       motion (a RAF-driven animation CSS cannot reach — ui-style.md § Motion
       Standard) snaps straight to the target instead of travelling. */
    let d = ((ctlRotYTarget - ctlRotY + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (Math.abs(d) < 0.01 || ctlReducedMotion()) { ctlRotY = ctlRotYTarget; ctlRotYTarget = null; }
    else ctlRotY += d * 0.18;
  } else if (!ctlDragging) { ctlRotY += ctlVelY; ctlVelY *= 0.94; }
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

/* View-only zoom (Workshop stage only — see ctlBindZoom). Not part of the
   saved design: it resets to 1 whenever the Workshop is (re)opened, the same
   way the camera itself resets on every mount. */
let ctlZoom = 1;
const CTL_ZOOM_MIN = 0.55, CTL_ZOOM_MAX = 1.7;

function ctlResize() {
  if (!ctlMountEl || !ctlBuilt) return;
  const w = ctlMountEl.clientWidth, h = ctlMountEl.clientHeight;
  if (!w || !h) return;
  ctlRenderer.setSize(w, h, false);
  ctlCamera.aspect = w / h;
  ctlCamera.position.set(0, 0.4, (w / h < 0.9 ? 12 : 9.5) * ctlZoom);
  ctlCamera.lookAt(0, -0.2, 0);
  ctlCamera.updateProjectionMatrix();
  ctlWake();
}
window.addEventListener('resize', ctlResize);

function ctlSetZoom(z) {
  ctlZoom = Math.max(CTL_ZOOM_MIN, Math.min(CTL_ZOOM_MAX, z));
  ctlResize();
}

/* Wheel (desktop) + pinch (touch) zoom. Workshop stage only — the lobby
   ornament is small and decorative, and its mount never calls this. Wheel
   needs preventDefault so the page itself doesn't scroll under the stage;
   pinch tracks the distance between the two active pointers and scales the
   zoom by how that distance changes between move events, so it composes
   naturally with however far in/out the player already is. */
function ctlBindZoom(el) {
  if (el.dataset.ctlZoomBound === '1') return;
  el.dataset.ctlZoomBound = '1';

  el.addEventListener('wheel', ev => {
    ev.preventDefault();
    ctlSetZoom(ctlZoom * (1 + ev.deltaY * 0.0015));
  }, { passive: false });

  const pinch = new Map();   // pointerId -> {x,y}
  let pinchStartDist = null, pinchStartZoom = 1;

  el.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch') return;
    pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch.size === 2) {
      const [a, b] = [...pinch.values()];
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartZoom = ctlZoom;
      // A second finger landing means this gesture is a pinch, not a
      // rotate — ctlBindPointer's drag tracking has no per-pointer identity,
      // so without this the first finger's in-progress rotate would keep
      // fighting the pinch for the same shared ctlLast.
      ctlDragging = false;
    }
  });
  el.addEventListener('pointermove', ev => {
    if (!pinch.has(ev.pointerId)) return;
    pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch.size !== 2 || !pinchStartDist) return;
    const [a, b] = [...pinch.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    ctlSetZoom(pinchStartZoom * (pinchStartDist / Math.max(1, dist)));
  });
  const pinchEnd = ev => { pinch.delete(ev.pointerId); pinchStartDist = null; };
  el.addEventListener('pointerup', pinchEnd);
  el.addEventListener('pointercancel', pinchEnd);
}

const CTL_CLICK_MOVE_MAX = 6;    // px — beyond this a pointer-up is a drag, not a tap
const CTL_CLICK_TIME_MAX = 400;  // ms

let ctlDragging = false, ctlHeldStick = null;
/* Set on a pointerdown that ctlTryPress consumed as a real button press,
   while nothing was armed/selected yet — read on the matching pointerup to
   stop that same gesture ALSO arming/selecting/placing a sticker sitting on
   or near the button (ctlStickerTap's raycast has no idea a button already
   claimed this gesture). Once a sticker IS armed/selected, a tap landing on
   a button's spot is allowed to place it there too, same as any other point
   on the shell — this only guards the idle case. */
let ctlButtonPressSuppressesTap = false;
let ctlLast = null, ctlStickLast = null, ctlDownPos = null, ctlDownTime = 0;
const _ctlPtr = new THREE.Vector2(), _ctlRay = new THREE.Raycaster();

/* Assigned by the Konami adapter (Task 6). Called as ctlOnPress(name, dir)
   where dir is 'Up'|'Down'|'Left'|'Right' for the d-pad and undefined
   otherwise. Left null on the lobby mount: the lobby's single tap opens the
   Workshop, and the code is only live where the buttons are big enough to
   press deliberately. */
let ctlOnPress = null;

/* A single ray against a small, curved button mesh misses at exactly the
   edges a fingertip is least precise about, and gets worse the further the
   controller has been spun off dead-centre (the button's screen-space
   footprint foreshortens). Rather than pad the geometry itself — the button
   meshes are ported, load-bearing shapes shared with the Konami direction
   read in ctlTryPress below — try the exact point first, then a small ring of
   offsets around it in screen space, and take the first hit that isn't
   occluded by the shell. This enlarges the effective hit area without
   touching a single vertex. */
const CTL_PRESS_FUDGE_PX = [
  [0, 0], [6, 0], [-6, 0], [0, 6], [0, -6], [5, 5], [-5, 5], [5, -5], [-5, -5],
];

function ctlTryPress(ev) {
  const r = ctlRenderer.domElement.getBoundingClientRect();
  let h = null;
  for (const [ox, oy] of CTL_PRESS_FUDGE_PX) {
    _ctlPtr.x = ((ev.clientX + ox - r.left) / r.width) * 2 - 1;
    _ctlPtr.y = -((ev.clientY + oy - r.top) / r.height) * 2 + 1;
    _ctlRay.setFromCamera(_ctlPtr, ctlCamera);
    const hit = _ctlRay.intersectObjects(ctlControls.pressables, true);
    if (!hit.length) continue;
    /* Buttons raycast against their own list alone, so nothing stopped a
       front button's ray reaching it through empty space while the
       controller was rotated to show the back. Check the shell along the
       same ray and refuse whenever it sits closer: a real button can't be
       pressed through the case. */
    const hb = _ctlRay.intersectObject(ctlBody, false);
    if (hb.length && hb[0].distance < hit[0].distance - 1e-4) continue;
    h = hit;
    break;
  }
  if (!h) return false;
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
    /* ANY touch on the stage is the player taking manual control — a button
       press or a sticker-drag-start cancels an in-flight auto-rotate exactly
       as much as grabbing to rotate does. This has to sit before every
       branch below, not just the rotate one, or a press that happens to hit
       the sticker mid-tween (see ctlStickerDragActive) leaves the tween
       fighting the drag. */
    ctlRotYTarget = null;
    if (ctlPressEnabled && ctlTryPress(ev)) {
      ctlButtonPressSuppressesTap = ctlStickerSurface
        ? ctlStickerMode(ctlStickerState) === 'idle' : false;
      return;
    }
    ctlButtonPressSuppressesTap = false;
    /* A press that lands on the currently-selected sticker starts a live
       drag instead of rotating the view — everywhere else, unchanged. Only
       worth a raycast at all when something is actually selected (never
       true on the lobby mount, which never edits stickers). */
    if (ctlStickerSurface && ctlStickerState.selected >= 0) {
      const hit = ctlStickerRay(ev);
      if (hit && ctlStickerHitIsSelected(hit)) {
        ctlStickerDragActive = true;
        el.setPointerCapture(ev.pointerId);
        ctlWake();
        return;
      }
    }
    ctlDragging = true;
    ctlLast = { x: ev.clientX, y: ev.clientY };
    el.setPointerCapture(ev.pointerId);
    ctlWake();
  });

  el.addEventListener('pointermove', ev => {
    if (ctlStickerDragActive) { ctlStickerDragTo(ev); return; }
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
    const wasStickerDrag = ctlStickerDragActive;
    ctlDragging = false; ctlHeldStick = null; ctlDownPos = null;
    ctlStickerDragActive = false;
    /* The whole drag has been a cheap ghost following the pointer — this is
       the one point the real sticker actually moves (see ctlStickerDragTo's
       note on why). A release with no movement never armed a pending patch,
       so this is correctly a no-op then, same as before. */
    if (wasStickerDrag) ctlStickerDragCommit();
    /* The spin-down is JS-driven, so the global prefers-reduced-motion CSS
       block cannot reach it (ui-style.md § Motion Standard). Under reduced
       motion the controller settles where it was let go rather than coasting —
       it still shows every face, it just skips the journey. */
    if (ctlReducedMotion()) ctlVelY = 0;
    for (const m of ctlControls.pressables) {
      if (m.userData.pressed) { m.userData.pressed = false; ctlVoiceRelease(); }
    }
    /* A drag that never moved has already left the sticker exactly where it
       was — nothing for a tap to redo, and ctlStickerTap would only push a
       spurious no-op history entry. A button press with nothing armed/
       selected must not ALSO arm/select/place whatever sticker happens to
       sit under that button (ctlButtonPressSuppressesTap, set on the
       matching pointerdown) — but once something IS armed/selected, this tap
       is allowed through so it can still be placed at a button's spot, same
       as any other point on the shell. */
    if (wasTap && !wasStick && !wasStickerDrag && !ctlButtonPressSuppressesTap
        && typeof ctlOnTap === 'function') ctlOnTap(ev);
    ctlWake();
  });

  /* A cancelled gesture (the browser reclaiming the pointer mid-drag — a
     scroll, an OS gesture) is not a release: drop the pending ghost patch
     rather than commit it, but still bring the ghost down, or it is left
     floating on screen with no pointer driving it. */
  el.addEventListener('pointercancel', () => {
    ctlDragging = false; ctlHeldStick = null; ctlDownPos = null;
    if (ctlStickerDragActive) { ctlStickerDragActive = false; ctlStickerDragPending = null; ctlHideDragGhost(); }
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
    /* This is DEFERRED by up to 1200 ms, and ctlCloseWorkshop() schedules one
       on its way out — so a player who reopens the Workshop inside that window
       gets the stale callback landing on top of it: the canvas is pulled back
       to the lobby mount, ctlPressEnabled goes false and ctlOnTap becomes the
       lobby's, leaving an empty stage whose every tap reopens the Workshop.
       If the mount is not on screen, this callback is simply out of date. */
    if (!el.offsetParent && !el.getClientRects().length) return;
    if (!ctlEnsureBuilt()) return;
    ctlPressEnabled = false;         // the lobby's buttons are scenery
    ctlOnPress = null;
    ctlOnTap = () => { playLaunch(); ctlOpenWorkshop(); };
    /* The lobby ornament is never zoomed — but this isn't the only path back
       to it (the Konami/gateway return calls ctlTeardown() directly, never
       ctlCloseWorkshop), so the reset belongs at the one place every return
       to the lobby mount actually passes through, not at ctlCloseWorkshop. */
    ctlZoom = 1;
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
   and the Workshop (a different mount element) all take the early return.
   The first nudge fires quickly (1s) — a player may not linger on the lobby
   or may have scrolled past the fold before the "few seconds" cadence would
   otherwise have caught them; every nudge after that is 3-5s apart. */
const CTL_IDLE_NUDGE_FIRST_MS = 1000;
const CTL_IDLE_NUDGE_MIN_MS = 3000;
const CTL_IDLE_NUDGE_MAX_MS = 5000;
let ctlIdleNudgeArmed = false;

function ctlScheduleIdleNudge() {
  if (ctlIdleNudgeArmed) return;   // one chain, however many times the lobby (re)mounts
  ctlIdleNudgeArmed = true;
  const nextDelay = () => CTL_IDLE_NUDGE_MIN_MS + Math.random() * (CTL_IDLE_NUDGE_MAX_MS - CTL_IDLE_NUDGE_MIN_MS);
  const fire = () => {
    setTimeout(fire, nextDelay());
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
  setTimeout(fire, CTL_IDLE_NUDGE_FIRST_MS);
}

document.addEventListener('DOMContentLoaded', ctlMountLobby);

// ── The Workshop ─────────────────────────────────────────────────────────────
const CTL_GROUP_LABELS = {
  shell:   { name: 'Shell',     hint: 'The body, front and back.' },
  plate:   { name: 'Face',      hint: 'The panel the sticks sit on.' },
  ears:    { name: 'Ears',      hint: 'The two grips either side.' },
  buttons: { name: 'Buttons',   hint: 'Sticks, D-pad and shoulders.' },
};

/* The design being edited. Unsaved changes are discarded on exit, so the lobby
   always reflects the last SAVED state — which is why this is a copy rather
   than a live pointer at ctlDesign. */
let ctlDraft = null;

/* Which of the four parts the palette below is currently painting. One
   palette shown at a time (pill-select, then colour) rather than four
   identical 20-swatch grids stacked on top of each other — the same shape
   the settings overlay already uses for a pill group (ui-style.md § Settings
   Layout Standard), just picking a part instead of a value. */
let ctlActiveGroup = 'shell';

function ctlOpenWorkshop() {
  ctlDraft = Object.assign({}, ctlReadDesign());
  ctlActiveGroup = 'shell';
  ctlActiveTab = 'colours';
  showScreen('screen-workshop');
  const stage = document.getElementById('ctl-stage');
  if (!ctlEnsureBuilt()) return;
  ctlPressEnabled = true;          // the Konami is live HERE and nowhere else
  // Task 6 defines ctlKonamiPress. The typeof guard is what keeps this task
  // independently shippable: between the two commits the Workshop opens and the
  // buttons press, they just feed no code yet.
  ctlOnPress = (typeof ctlKonamiPress === 'function') ? ctlKonamiPress : null;
  /* No-ops until the surface exists, i.e. until the Stickers tab has been
     opened — so the Colours tab behaves exactly as it did, and the lobby is
     untouched (ctlMountLobby assigns its own ctlOnTap). */
  ctlOnTap = ctlStickerTap;
  ctlStickerState = { stickers: (ctlDraft.stickers || []).slice(),
                      armed: null, selected: -1, history: [] };
  ctlZoom = 1;   // a view convenience, not part of the saved design — see ctlSetZoom
  ctlApplyDesign(ctlDraft);
  ctlMount(stage);
  ctlBindPointer(stage);
  ctlBindZoom(stage);
  ctlRenderPanel();
}

function ctlCloseWorkshop() {
  ctlTeardown();
  ctlDraft = null;
  /* The history is a Workshop session, not a document history: an unsaved
     edit must not survive the ✕ (the line below already restores the saved
     placements). */
  ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
  ctlDesign = ctlReadDesign();     // discard unsaved changes
  showScreen('screen-lobby');
  ctlMountLobby();   // resets ctlZoom to 1 itself — see the note there
}

/* Which tab the panel is showing. Two, not three (spec D4): the placed list
   lives INSIDE the Stickers tab as the book itself — one surface to scan
   rather than two. */
let ctlActiveTab = 'colours';

function ctlRenderPanel() {
  const tabs = document.getElementById('ctl-tabs');
  if (tabs) {
    tabs.querySelectorAll('[data-ctl-tab]').forEach(b => {
      const on = b.getAttribute('data-ctl-tab') === ctlActiveTab;
      // .pill must ALWAYS stay on — only pill-active-* is toggled
      // (ui-style.md § Settings Layout Standard, pill toggle rule)
      b.classList.toggle('pill-active-purple', on);
    });
  }
  const colours = document.getElementById('ctl-panel-colours');
  const stickers = document.getElementById('ctl-panel-stickers');
  if (colours)  colours.style.display  = ctlActiveTab === 'colours'  ? 'flex' : 'none';
  if (stickers) stickers.style.display = ctlActiveTab === 'stickers' ? 'flex' : 'none';
  if (ctlActiveTab === 'colours') ctlRenderColourCard();
  else { ctlRenderStickerBook(); ctlSyncStickerControls(); }
}

/* Unchanged from the colour-only build except for the container it renders
   into — it used to own #ctl-panel outright. */
function ctlRenderColourCard() {
  const panel = document.getElementById('ctl-panel-colours');
  if (!panel) return;
  /* ctlStickerDispatch repaints the panel, and it reads the draft — so the
     one caller that could ever arrive here outside the Workshop must bounce. */
  if (!ctlDraft) return;
  panel.innerHTML = '';
  const palette = ctlPalette();
  const meta = CTL_GROUP_LABELS[ctlActiveGroup];

  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3';

  // Part picker — which of the four the palette below is about to paint.
  const pills = document.createElement('div');
  pills.className = 'flex gap-2 flex-wrap';
  for (const group of CTL_GROUPS) {
    const p = document.createElement('button');
    p.className = 'pill' + (group === ctlActiveGroup ? ' pill-active-purple' : '');
    p.textContent = CTL_GROUP_LABELS[group].name;
    p.addEventListener('click', () => {
      if (group === ctlActiveGroup) return;
      playPillClick();
      ctlActiveGroup = group;
      ctlRenderPanel();
    });
    pills.appendChild(p);
  }
  card.appendChild(pills);

  const hint = document.createElement('p');
  hint.className = 'text-stone-400 text-sm';
  hint.textContent = meta.hint;
  card.appendChild(hint);

  /* Six columns: 6 × 44 px + 5 × 6 px of gap = 294 px, inside the 312 px a
     max-w-sm card leaves once its own padding is taken. Twenty swatches land
     as 6/6/6/2. */
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-6 gap-1.5';
  for (const sw of palette) {
    const b = document.createElement('button');
    b.className = 'ctl-swatch' + (ctlDraft[ctlActiveGroup].toUpperCase() === sw.hex.toUpperCase() ? ' ctl-swatch-on' : '');
    b.style.backgroundColor = sw.hex;
    b.setAttribute('aria-label', meta.name + ' — ' + sw.hex);
    b.addEventListener('click', () => ctlSelectColour(ctlActiveGroup, sw.hex));
    grid.appendChild(b);
  }
  card.appendChild(grid);

  const rand = document.createElement('button');
  rand.id = 'btn-ctl-randomise';
  rand.className = 'min-h-11 w-full rounded-xl active:scale-95 hover:brightness-110 text-white font-semibold text-sm transition-all duration-150';
  rand.style.background = 'linear-gradient(90deg, ' + ctlRainbowGradientStops().join(', ') + ')';
  rand.textContent = 'Randomise All';
  rand.addEventListener('click', ctlRandomiseAll);
  card.appendChild(rand);

  panel.appendChild(card);
}

/* The Randomise All button's rainbow: every LIVE game colour, read from
   GAME_BRAND_HEX (never copied), so a 21st game or a recoloured existing one
   moves the gradient with it — zero edits here, the same guarantee
   ctlPalette() already makes for the swatch grid. Owner asked for pink first
   and purple last specifically, so those two are pinned at the ends and
   everything else keeps its position from LOBBY_COLOUR_ORDER (the suite's
   own hue walk, already used for the lobby's own Colour sort) in between —
   one canonical colour order, not a bespoke one invented for this button. */
function ctlRainbowGradientStops() {
  const src = (typeof GAME_BRAND_HEX === 'object' && GAME_BRAND_HEX) ? GAME_BRAND_HEX : {};
  const PINK = 'btn-dstw', PURPLE = 'btn-great-minds';
  const order = (typeof LOBBY_COLOUR_ORDER !== 'undefined' && Array.isArray(LOBBY_COLOUR_ORDER))
    ? LOBBY_COLOUR_ORDER : Object.keys(src);
  const middle = order.filter(id => id !== PINK && id !== PURPLE && src[id]);
  const ids = [PINK].concat(middle, [PURPLE]).filter(id => src[id]);
  return ids.length ? ids.map(id => src[id]) : ['#EC4899', '#A855F7'];
}

/* Picks a random brand swatch for each of the four parts at once. Owner-
   directed exception to § Action Button Standard's brand/neutral/destructive
   rule (the same kind of exception FRT's literal-hex heading is) — a gradient
   was asked for specifically, to make the button read as "chance", not a
   decision. Reuses ctlPalette() so a 21st game's colour is in the draw with
   zero edits here, same as the swatch grid above. */
function ctlRandomiseAll() {
  const palette = ctlPalette();
  if (!palette.length || !ctlDraft) return;
  playPillClick();
  for (const group of CTL_GROUPS) {
    ctlDraft[group] = palette[Math.floor(Math.random() * palette.length)].hex;
  }
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
}

/* The book: one tile per manifest entry. A PLACED tile stays tappable and
   SELECTS its placement rather than re-arming the design (spec D2 + § 7) —
   which matters because a sticker on the back face or an ear may not be
   visible from the current camera angle, and selecting from the book sidesteps
   having to rotate to find it. */
function ctlRenderStickerBook() {
  const book = document.getElementById('ctl-sticker-book');
  if (!book) return;
  book.innerHTML = '';

  if (!ctlStickerManifest) {
    const p = document.createElement('p');
    p.className = 'text-stone-400 text-sm col-span-4';
    p.textContent = 'Getting the stickers out…';
    book.appendChild(p);
    return;
  }
  if (!ctlStickerManifest.length) {
    const p = document.createElement('p');
    p.className = 'text-stone-400 text-sm col-span-4';
    // Offline before the manifest was ever fetched is a legitimate path, and it
    // is not an error — there simply are no stickers to show yet.
    p.textContent = 'No stickers yet — they turn up as they are drawn.';
    book.appendChild(p);
    return;
  }

  const placedIdx = {};
  ctlStickerState.stickers.forEach((s, i) => { placedIdx[s.id] = i; });

  for (const e of ctlStickerManifest) {
    const i = placedIdx[e.id];
    const isPlaced = i !== undefined;
    const isArmed = ctlStickerState.armed === e.id;
    const isSelected = isPlaced && ctlStickerState.selected === i;

    const b = document.createElement('button');
    b.className = 'ctl-sticker-tile ctl-sticker-ref-row' +
      ((isArmed || isSelected) ? ' ctl-sticker-tile-on' : '') +
      (isPlaced ? ' ctl-sticker-tile-placed' : '');
    b.setAttribute('data-ctl-sticker-id', e.id);   // ctlStickerGoToBook's hook
    b.setAttribute('aria-label', e.label + (isPlaced ? ' — on the controller' : ''));
    b.setAttribute('aria-pressed', String(isArmed || isSelected));

    const img = document.createElement('img');
    img.src = CTL_STICKER_DIR + e.image;
    img.alt = '';
    img.className = 'w-full h-full object-contain pointer-events-none';
    b.appendChild(img);

    if (isPlaced) {
      const dot = document.createElement('span');
      dot.className = 'ctl-sticker-dot';
      dot.setAttribute('aria-hidden', 'true');
      b.appendChild(dot);
    }

    b.addEventListener('click', () => {
      playPillClick();
      ctlStickerDispatch({ t: 'bookTap', id: e.id });
      const m = ctlStickerMode(ctlStickerState);
      ctlStickerSay(m === 'armed' ? 'Tap the controller to put it on.'
                  : m === 'selected' ? 'Tap somewhere else to move it.'
                  : '');
      // The reverse of tapping a sticker on the model to jump to its book
      // tile: picking an already-placed one from the book rotates the model
      // to it. Not on 'armed' — an unplaced tile has no location to face.
      if (m === 'selected') ctlStickerGoToModel(ctlStickerState.stickers[ctlStickerState.selected]);
    });
    book.appendChild(b);
  }
}

/* Synced, never rebuilt — the sliders are static markup precisely so a repaint
   of the book cannot interrupt a drag.

   The card outlives the selection. Spec § 7 gives the sliders and Done to
   Armed/Selected and Delete to Selected, but says Undo "appears whenever
   ctlStickerHistory has an entry to pop" — no state qualifier. Hiding the whole
   card in Idle would take Undo away one tap after Done, which is exactly when a
   player wants it, so the card shows whenever ANY of its controls applies. */
function ctlSyncStickerControls() {
  const row = document.getElementById('ctl-sticker-controls');
  if (!row) return;
  const mode = ctlStickerMode(ctlStickerState);
  const editing = mode !== 'idle';
  const canUndo = ctlStickerState.history.length > 0;
  row.style.display = (editing || canUndo) ? 'flex' : 'none';

  const sliders = document.getElementById('ctl-sticker-sliders');
  if (sliders) sliders.style.display = editing ? 'flex' : 'none';
  const done = document.getElementById('btn-ctl-sticker-done');
  if (done) done.style.display = editing ? '' : 'none';
  const del = document.getElementById('btn-ctl-sticker-delete');
  if (del) del.style.display = mode === 'selected' ? '' : 'none';   // nothing to remove while Armed
  const undo = document.getElementById('btn-ctl-sticker-undo');
  if (undo) undo.style.display = canUndo ? '' : 'none';

  const sel = ctlStickerState.stickers[ctlStickerState.selected];
  if (mode === 'selected' && sel) {
    const rot = document.getElementById('ctl-sticker-rot');
    const size = document.getElementById('ctl-sticker-size');
    if (rot) rot.value = String(Math.round(sel.rot * 180 / Math.PI));
    if (size && ctlGeo) {
      const U = ctlGeo.userData;
      const r = sel.surface === 'shell' ? sel.size : sel.r;
      size.value = String(Math.round(r * 1.96 / (U.maxx - U.minx) * 100));
    }
  }
}

function ctlSelectColour(group, hex) {
  playPillClick();
  ctlDraft[group] = hex;
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
}

document.getElementById('btn-ctl-save').addEventListener('click', () => {
  playDone();
  ctlWriteDesign(ctlDraft);
  ctlDesign = Object.assign({}, ctlDraft);
  ctlCloseWorkshop();
});

document.getElementById('btn-ctl-reset').addEventListener('click', () => {
  playWhoosh();
  /* CTL_DEFAULTS has no stickers key, so assigning it alone left the previous
     placements attached to a factory-coloured shell — a Reset that resets
     three-quarters of the design. */
  ctlDraft = Object.assign({}, CTL_DEFAULTS, { stickers: [] });
  ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
});

// ── The tab bar ──────────────────────────────────────────────────────────────
document.querySelectorAll('#ctl-tabs [data-ctl-tab]').forEach(b => {
  b.addEventListener('click', () => {
    const tab = b.getAttribute('data-ctl-tab');
    if (tab === ctlActiveTab) return;
    playPillClick();
    ctlActiveTab = tab;
    if (tab === 'stickers') ctlOpenStickersTab();
    else { ctlStickerDispatch({ t: 'done' }); ctlRenderPanel(); }
  });
});

/* First open pays for the manifest fetch and the surface build. Measured at
   339 ms on a desktop; a low-end phone is plausibly 3-5x that, so the panel
   says what it is doing rather than sitting blank. */
function ctlOpenStickersTab() {
  ctlRenderPanel();                       // shows "Getting the stickers out…"
  ctlLoadStickerManifest().then(() => {
    ctlEnsureStickerSurface();
    ctlRenderPanel();
    ctlStickerSay(ctlStickerState.stickers.length
      ? 'Tap a sticker to move it, or pick a new one.'
      : 'Pick a sticker, then tap the controller.');
  });
}

/* Live on input, so the sticker resizes/turns under the finger. These
   deliberately do NOT push undo history — a single drag would otherwise fill
   the stack with a hundred intermediate values; undo steps over the whole
   adjustment to the last place/relocate/remove (see ctlStickerReduce). */
['ctl-sticker-rot', 'ctl-sticker-size'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const sel = ctlStickerState.stickers[ctlStickerState.selected];
    if (!sel || !ctlGeo) return;
    const patch = id === 'ctl-sticker-rot'
      ? { rot: ctlStickerWantRot() }
      : (sel.surface === 'shell'
          ? { size: ctlStickerWantRadius() }
          : { r: Math.min(ctlStickerWantRadius(), CTL_EAR_MAX_R) });
    ctlStickerDispatch({ t: 'adjust', patch: patch });
  });
});

document.getElementById('btn-ctl-sticker-undo').addEventListener('click', () => {
  playWhoosh();
  ctlStickerDispatch({ t: 'undo' });
  ctlStickerSay('Put that back.');
});
document.getElementById('btn-ctl-sticker-delete').addEventListener('click', () => {
  playExit();
  ctlStickerDispatch({ t: 'delete' });
  ctlStickerSay('Peeled it off.');
});
document.getElementById('btn-ctl-sticker-done').addEventListener('click', () => {
  playDone();
  ctlStickerDispatch({ t: 'done' });
  ctlStickerSay('');
});

/* No quit-confirm overlay: nothing is mid-round, and an unsaved colour change
   is two taps from being remade. */
document.getElementById('btn-ctl-exit').addEventListener('click', () => {
  playExit();
  ctlCloseWorkshop();
});

document.getElementById('btn-ctl-how-to').addEventListener('click', () => {
  const ov = document.getElementById('ctl-how-to-overlay');
  ov.querySelector('.overlay-data-inner').scrollTop = 0;
  ov.style.display = 'flex';
});
document.getElementById('btn-ctl-howto-close').addEventListener('click', () => {
  playDone();
  document.getElementById('ctl-how-to-overlay').style.display = 'none';
});

/* Live on the Workshop screen only. The lobby's single tap opens the Workshop;
   the Workshop is where the buttons are big enough to press deliberately.
   No progress indicator — it is a secret, and the beeps are the feedback. */
function ctlKonamiPress(name, dir) {
  const code = ctlKonamiCode(name, dir);
  if (!code) return;
  if (typeof smHandleButton === 'function') smHandleButton(code);
}
