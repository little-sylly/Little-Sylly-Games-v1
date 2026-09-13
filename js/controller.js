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
       sticker for the first time in a session goes through here. */
    ctlRedrawShell(); ctlRedrawEars(); ctlWake();
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
        /* THE BORDER. Its colour is chosen per texel from the atlas pixel
           ALREADY underneath: a light shell gets a dark border, a dark shell a
           light one. Per-texel is what makes a sticker straddling the
           faceplate edge work with no special case — and because a recolour
           re-enters ctlRedrawShell and re-stamps every sticker from scratch,
           borders re-derive against the new shell colour for free.

           Coverage is the ring average, so the outer edge antialiases instead
           of stepping. */
        const lum = (0.2126 * D[o] + 0.7152 * D[o + 1] + 0.0722 * D[o + 2]) / 255;
        const bc = lum > 0.5 ? 28 : 242;
        const a2 = Math.min(1, hgt * CTL_BORDER_FIRM);
        D[o]     = D[o]     * (1 - a2) + bc * a2;
        D[o + 1] = D[o + 1] * (1 - a2) + bc * a2;
        D[o + 2] = D[o + 2] * (1 - a2) + bc * a2;
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
  ctlGeo = geo;                      // the sticker surface needs geo.userData later
  ctlBuildPlateUV(geo);

  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06,
                                                 bumpMap: ctlBumpTex, bumpScale: 0.035 });
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
  showScreen('screen-workshop');
  const stage = document.getElementById('ctl-stage');
  if (!ctlEnsureBuilt()) return;
  ctlPressEnabled = true;          // the Konami is live HERE and nowhere else
  // Task 6 defines ctlKonamiPress. The typeof guard is what keeps this task
  // independently shippable: between the two commits the Workshop opens and the
  // buttons press, they just feed no code yet.
  ctlOnPress = (typeof ctlKonamiPress === 'function') ? ctlKonamiPress : null;
  ctlOnTap = null;
  ctlApplyDesign(ctlDraft);
  ctlMount(stage);
  ctlBindPointer(stage);
  ctlRenderPanel();
}

function ctlCloseWorkshop() {
  ctlTeardown();
  ctlDraft = null;
  ctlDesign = ctlReadDesign();     // discard unsaved changes
  showScreen('screen-lobby');
  ctlMountLobby();
}

function ctlRenderPanel() {
  const panel = document.getElementById('ctl-panel');
  if (!panel) return;
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
  panel.appendChild(card);
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
  ctlDraft = Object.assign({}, CTL_DEFAULTS);
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
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
