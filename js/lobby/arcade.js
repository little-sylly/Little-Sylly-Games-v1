// ═══════════════════════════════════════════════════════════════════════════
// arcade.js — the Arcade (SW v254): the cabinet registry and the room you pick
// one from. A place in the house like the jukebox — always open, no Konami, no
// unlock. Until SW v253 the arcade was a category inside Secret Mode's terminal;
// spec: docs/superpowers/specs/2026-10-18-arcade-room-design.md.
//
// ARC_CABINETS is the WHOLE registration. Every consumer iterates it — the
// room's row (arcRender), engine.js resetToLobby() (every stop()), and the
// keyboard-Konami guard in secret-mode.js — so a new cabinet is one entry here
// + one file in js/arcade/ and nothing else. Cabinets are NOT Sylly Games: no
// MP config, no identity doc, no Sylly Mode. `start`/`stop` are lazy arrows, so
// a cabinet's file may load after this one. Since SW v259 two OPTIONAL fields,
// lazy too: `preview` (the cabinet's attract scene on its CRT on the Floor — see
// arcPreview*) and `best` (its session board's top score, for the HI line).
//
// The room is a lobby PLACE, not a layout: the router's arcadeOpen/arcadeClose
// (lobby-router.js) open and close it, and its ✕ goes back to the layout it was
// opened from. A cabinet's ✕ comes back HERE (arcExitCabinet), not to the lobby.
//
// SW v257 — the "Arcade Floor" (spec § 3.1). The room is a row of little
// cabinets, one per game, painted in the player's saved controller colours
// (shell / plate / ears / buttons — the same roles the Lounge's props wear).
// The row is a native scroll-snap strip; whichever cabinet crosses its centre is
// the selection, reported by an IntersectionObserver — so there is no RAF loop
// and no scroll timer. One timer (the launch beat), cleared in arcStop() —
// resetToLobby() and arcClose() both call it (logic-engine.md § Timer Lifecycle).
//
// Depends on: engine.js (showScreen, playPillClick), secret-mode.js
// (playSecretBeep — the cabinets' own voice), lobby-host.js (lobbyDispatch),
// controller.js (ctlReadDesign — optional; the factory lilac is the fallback).
// ═══════════════════════════════════════════════════════════════════════════

const ARC_CABINETS = [
  { id: 'asherplane',  label: 'ASHERPLANE',       screen: 'screen-arcade-asherplane',
    start: () => apStart(),  stop: () => resetArcade(), preview: () => apPreview(), best: () => apBest(),
    blurb: 'Fly over the islands, shoot the Bandits, beat the boss.', accent: '#3fa9ff' },
  { id: 'minesweeper', label: 'DEEP-SEA SWEEP',   screen: 'screen-arcade-minesweeper',
    start: () => msStart(),  stop: () => resetArcadeMinesweeper(), preview: () => msPreview(), best: () => msBest(),
    blurb: 'Sweep the sea floor. Mind the mines.', accent: '#22d3ee' },
  { id: 'chicken',     label: 'OTHER SIDE',       screen: 'screen-arcade-chicken',
    start: () => ckStart(),  stop: () => resetArcadeChicken(), preview: () => ckPreview(), best: () => ckBest(),
    blurb: 'Why did the chicken cross the road? Find out.', accent: '#c8f04a' },
  { id: 'slice',       label: 'CHOP SALAD',       screen: 'screen-arcade-slice',
    start: () => slStart(),  stop: () => resetArcadeSlice(), preview: () => slPreview(), best: () => slBest(),
    blurb: 'Swipe the fruit. Skip the bombs.', accent: '#ffe500' },
  { id: 'cookiejar',   label: 'COOKIE JAR',       screen: 'screen-arcade-cookiejar',
    start: () => hjStart(),  stop: () => resetArcadeCookieJar(), preview: () => hjPreview(), best: () => hjBest(),
    blurb: 'Hold to grab cookies. Let go before anyone looks.', accent: '#d9925a' },
  { id: 'stacking',    label: 'STACKING ORDER',   screen: 'screen-arcade-stacking',
    start: () => stoStart(), stop: () => resetArcadeStacking(), preview: () => stoPreview(), best: () => stoBest(),
    blurb: 'Drop the animals. Build the tower. Don’t let it lean.', accent: '#ff8a4c' },
  { id: 'bluff',       label: 'BEYOND THE BLUFF', screen: 'screen-arcade-bluff',
    start: () => bbStart(),  stop: () => resetArcadeBluff(), preview: () => bbPreview(), best: () => bbBest(),
    blurb: 'Climb the dice cliff before The Depths catch you.', accent: '#ff6a86' },
  { id: 'coldshot',    label: 'COLD SHOT',        screen: 'screen-arcade-coldshot',
    start: () => cshStart(), stop: () => resetArcadeColdShot(), preview: () => cshPreview(), best: () => cshBest(),
    blurb: 'Snowball the smug penguins off the floe. Don’t let it sink.', accent: '#8ecae6' },
  { id: 'traceroute',  label: 'TRACE ROUTE',      screen: 'screen-arcade-traceroute',
    start: () => trcStart(), stop: () => resetArcadeTraceRoute(), preview: () => trcPreview(), best: () => trcBest(),
    blurb: 'Swipe the signal through the Node. Find the Egress.', accent: '#34d399' },
];

const ARC_LAUNCH_MS    = 480;   // the coin beat: INSERT COIN flashes, two notes, then the cabinet takes the screen
const ARC_COIN_NOTE_MS = 180;   // when the second note lands inside it
const ARC_TICKS_MAX    = 12;    // past this many cabinets the strip's ticks become one scrubber rail
const ARC_ROLES = ['shell', 'plate', 'ears', 'buttons'];   // controller.js CTL_GROUPS

/* What every cabinet's screen and marquee carry, in both builds below (spec
   § 3.2). The marquee is the number and the name — the cabinet's first focus
   point — so the screen never repeats it: it is the game's own menu scene
   (a cabinet's `preview`), PRESS START, and HI only when the session board has one. */
const ARC_MARQ_HTML = '<span class="arc-m-marq-text"><b class="arc-m-num"></b><span class="arc-m-name"></span></span>';
const ARC_CRT_HTML =
  '<span class="arc-crt">' +
    '<canvas class="arc-crt-view" aria-hidden="true"></canvas>' +
    '<span class="arc-crt-hi"></span>' +
    '<span class="arc-crt-press">Press start</span>' +
    '<span class="arc-crt-coin">Insert coin</span>' +
  '</span>';

/* The CSS cabinet — the fallback when there is no WebGL to render the model
   with. The bear's ears on the panda's one-piece body. Glow first, then ears,
   then body — positioned siblings paint in DOM order, so the ears sit behind
   the hood and the accent pool sits behind everything. */
/* Every row is `.arc-row` (layout + scroll-snap box, never transformed — snap reads the TRANSFORMED box, so a
   ring transform on the row itself moves its own snap point) around `.arc-m`, which carries the ring. */
const ARC_MACHINE_HTML =
  '<span class="arc-m">' +
  '<span class="arc-m-glow"></span>' +
  '<span class="arc-m-ear is-l"></span><span class="arc-m-ear is-r"></span>' +
  '<span class="arc-m-body">' +
    '<span class="arc-m-marq">' + ARC_MARQ_HTML + '</span>' +
    '<span class="arc-m-bezel">' + ARC_CRT_HTML + '</span>' +
    '<span class="arc-m-deck"><span class="arc-m-stick"></span><span class="arc-m-btns"><i></i><i></i><i></i><i></i></span></span>' +
    '<span class="arc-m-door"><span class="arc-m-slot"></span><span class="arc-m-lamp"></span></span>' +
  '</span></span>';

/* SW v259 — the real model (spec § 3.2, 4a). The Lounge's cabinet
   (lounge-props.js louBuildArcade, built `blank`) rendered ONCE into a picture
   every row wears; the marquee text, the CRT and the coin lamp are DOM laid over
   the places in the picture where the model's own glass and lamp landed. */
const ARC_SHOT_HTML =
  '<span class="arc-m">' +
  '<span class="arc-m-glow"></span>' +
  '<img class="arc-m-shot" alt="" draggable="false">' +
  ARC_MARQ_HTML + ARC_CRT_HTML +
  '<span class="arc-m-lamp"></span></span>';
const ARC_SHOT_ASPECT = 0.66;   // a row's width / height (css/arcade.css .arc-track --w)

let arcSel = 0;              // the centred cabinet — memory only, survives leaving the room
let arcLaunchTimer = null;
let arcKeysBound = false;
let arcObserver = null;      // IntersectionObserver on the row — whichever cabinet crosses the centre is selected
let arcScrubbing = false;    // a pointer is down on the position strip
let arcScrubDragged = false; // …and has moved, so the row follows instantly rather than gliding
let arcShot = null;          // the rendered cabinet { key, url, rects } — one per controller design, memory only
let arcShotFailed = false;   // no WebGL (or a render that threw): the CSS cabinet for the rest of the session
let arcPrev = null;          // the one live preview { i, a, raf, last } — the centred cabinet's screen
let arcPreviewQuiet = false; // true only while a preview's own code runs — secret-mode.js playSecretBeep stays silent

/* SW v259 — 4b: the screen is the game. A cabinet's optional `preview()` hands
   back an adapter { w, h, fy, begin(canvas, ctx), step(dt), draw(), end() }:
   begin() borrows the canvas it is given, step()/draw() run its attract scene
   with the card off, end() hands everything back so the next start() takes its
   own canvas again. The ROOM owns the loop — one RAF, for the centred cabinet;
   every other screen keeps a still frame drawn on open. */
const ARC_PREVIEW_WARM_S = 1.2;   // a still frame shows the scene this far in, not its empty first frame

function arcIsUp() {
  const el = document.getElementById('screen-arcade');
  return !!el && el.style.display !== 'none';
}

function arcPad(n) { return String(n).padStart(2, '0'); }

/* The global reduced-motion block reaches CSS only; a smooth scrollTo() is JS
   and would still glide (ui-style.md § Motion Standard). */
function arcReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

// The cabinets wear the player's controller: the same four roles as the Lounge's props.
function arcPaintPalette() {
  const room = document.getElementById('screen-arcade');
  if (!room || typeof ctlReadDesign !== 'function') return;   // the CSS defaults are the factory lilac
  const d = ctlReadDesign();
  ARC_ROLES.forEach(k => { if (d[k]) room.style.setProperty('--arc-' + k, d[k]); });
}

/* The four role colours the room is painted in right now — read back off the
   room's own CSS variables, so the factory lilac and a saved design are one path. */
function arcDesign() {
  const room = document.getElementById('screen-arcade');
  const cs = room ? getComputedStyle(room) : null, out = {};
  ARC_ROLES.forEach(k => { out[k] = (cs && cs.getPropertyValue('--arc-' + k).trim()) || '#a97fd6'; });
  return out;
}

/* Render the model once for this design. A short-lived renderer: one frame,
   read back, then disposed and its context let go (a phone has few to spare).
   The camera looks down the CRT's normal from a little above it, through a
   narrow lens, so the glass lands as a near-rectangle and the deck reads from
   above; the whole cabinet is then fitted to the row's 0.66 frame. Returns
   null — and the room falls back to the CSS cabinet — when anything is missing. */
function arcModelShot(design) {
  const key = ARC_ROLES.map(k => design[k]).join('|');
  if (arcShot && arcShot.key === key) return arcShot;
  if (arcShotFailed || typeof THREE === 'undefined' || !window.LouLib || !window.LouProps || !window.ControllerBody) return null;
  // the lobby probed WebGL at boot (lobby-host.js lobbyWebgl); without it THREE logs an error trying, so don't
  if (typeof lobbyWebgl !== 'undefined' && lobbyWebgl === false) { arcShotFailed = true; return null; }
  let renderer = null, root = null;
  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const H = Math.max(640, Math.min(1280, Math.round(560 * dpr))), W = Math.round(H * ARC_SHOT_ASPECT);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    /* Lit for the player's colour, not for a mood: no tone mapping (ACES washed #a97fd6 out to
       #e4d8e6) and plain white light. No environment map either — its PMREM pass was ~85% of the
       render (measured in software GL: ~2.4 s with it, ~0.3 s without). */
    renderer.toneMapping = THREE.NoToneMapping;
    const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const lib = LouLib.louCreateLib(THREE, { makeCanvas, smoothNormals: ControllerBody.smoothNormals, lite: true });
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#5a5060', 0.45));
    const key0 = new THREE.DirectionalLight('#ffffff', 0.7); key0.position.set(-0.6, 1.2, 1.0); scene.add(key0);
    const rim = new THREE.DirectionalLight('#d8c8ff', 0.3); rim.position.set(0.8, 0.5, -0.8); scene.add(rim);
    root = LouProps.louBuildArcade(lib, design, null, null, { blank: true });
    scene.add(root); root.updateMatrixWorld(true);
    const faces = root.userData.louArcadeFaces, glass = faces.screen.mesh;
    // down the glass's normal, then 8° higher still
    const n = new THREE.Vector3(0, 0, 1).transformDirection(glass.matrixWorld);
    const dir = n.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.14).normalize();
    const box = new THREE.Box3().setFromObject(root), mid = box.getCenter(new THREE.Vector3());
    const cam = new THREE.PerspectiveCamera(20, ARC_SHOT_ASPECT, 0.05, 10);
    cam.position.copy(mid).addScaledVector(dir, 1.1); cam.lookAt(mid);
    // fit: project the box, widen or narrow the lens to fill 92% of the frame, then centre it
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    const extent = () => { cam.updateMatrixWorld(); cam.updateProjectionMatrix(); let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
      corners.forEach(c => { const p = c.clone().project(cam); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      return { x0, x1, y0, y1 }; };
    let e = extent();
    const s = Math.max((e.x1 - e.x0) / 2, (e.y1 - e.y0) / 2) / 0.92;
    cam.fov = 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * s) * 180 / Math.PI;
    e = extent();
    cam.setViewOffset(W, H, ((e.x0 + e.x1) / 2) * W / 2, -((e.y0 + e.y1) / 2) * H / 2, W, H);
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const url = canvas.toDataURL('image/png');
    // where the glass and the lamp landed, in % of the picture
    const rect = (f) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const p = new THREE.Vector3(sx * f.w / 2, sy * f.h / 2, 0).applyMatrix4(f.mesh.matrixWorld).project(cam);
        const px = (p.x + 1) / 2 * 100, py = (1 - p.y) / 2 * 100;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
      return { l: x0, t: y0, w: x1 - x0, h: y1 - y0 }; };
    const lampP = root.getObjectByName('coinLamp').getWorldPosition(new THREE.Vector3()).project(cam);
    arcShot = { key, url, screen: rect(faces.screen), marquee: rect(faces.marquee), lamp: { l: (lampP.x + 1) / 2 * 100, t: (1 - lampP.y) / 2 * 100 } };
    return arcShot;
  } catch (_) {
    arcShotFailed = true; return null;
  } finally {
    if (root) root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); if (o.material.bumpMap) o.material.bumpMap.dispose(); o.material.dispose(); } });
    if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch (_) {} }
  }
}

/* HI and the session board's best, or nothing — never "HI 0". A cabinet's
   best() formats its own score (a time, a height); boards are memory only. */
function arcBest(cab) {
  if (typeof cab.best !== 'function') return '';
  let b = null; try { b = cab.best(); } catch (_) { b = null; }
  return b === null || b === undefined || b === '' ? '' : 'HI ' + b;
}

// A preview's own code, silenced: an attract demo may beep, and in the room it must not.
function arcQuiet(fn) { arcPreviewQuiet = true; try { return fn(); } finally { arcPreviewQuiet = false; } }

/* Size a screen's canvas to its box, then fit the game's logical w × h to COVER
   it: the CRT is wide and every game is tall, so `fy` (0 top … 1 bottom) says
   which band of the scene the screen shows. */
function arcPreviewSetup(canvas, a) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.max(1, Math.round(canvas.clientWidth * dpr)), ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== cw) canvas.width = cw;
  if (canvas.height !== ch) canvas.height = ch;
  const ctx = canvas.getContext('2d'), s = Math.max(cw / a.w, ch / a.h), fy = a.fy === undefined ? 0.5 : a.fy;
  ctx.setTransform(s, 0, 0, s, (cw - a.w * s) / 2, (ch - a.h * s) * fy);
  return ctx;
}

// The cabinet's adapter, or null when it has none (or it throws) — that screen keeps the accent pool.
function arcAdapter(cab) {
  if (typeof cab.preview !== 'function') return null;
  try { return cab.preview() || null; } catch (_) { return null; }
}

// One still frame: begin, run the scene a moment, draw, hand back.
function arcPreviewStill(i, canvas) {
  const a = arcAdapter(ARC_CABINETS[i]);
  if (!a || !canvas) return;
  try {
    arcQuiet(() => {
      a.begin(canvas, arcPreviewSetup(canvas, a));
      for (let t = 0; t < ARC_PREVIEW_WARM_S; t += 1 / 30) a.step(1 / 30);
      a.draw();
    });
  } catch (_) {}
  try { arcQuiet(() => a.end()); } catch (_) {}
}

// Stop the live preview. Its canvas keeps the last frame it drew.
function arcPreviewStop() {
  if (!arcPrev) return;
  if (arcPrev.raf) cancelAnimationFrame(arcPrev.raf);
  const a = arcPrev.a; arcPrev = null;
  try { arcQuiet(() => a.end()); } catch (_) {}
}

// Run the centred cabinet's scene live. Reduced motion keeps every screen still.
function arcPreviewPlay(i) {
  if (arcPrev && arcPrev.i === i) return;
  arcPreviewStop();
  if (arcReducedMotion()) return;
  const row = document.querySelectorAll('#arc-list .arc-row')[i];
  const canvas = row && row.querySelector('.arc-crt-view');
  const a = arcAdapter(ARC_CABINETS[i]);
  if (!a || !canvas) return;
  try { arcQuiet(() => { a.begin(canvas, arcPreviewSetup(canvas, a)); for (let t = 0; t < ARC_PREVIEW_WARM_S; t += 1 / 30) a.step(1 / 30); }); }
  catch (_) { try { arcQuiet(() => a.end()); } catch (__) {} return; }
  const p = arcPrev = { i, a, raf: null, last: 0 };
  const frame = (now) => {
    if (arcPrev !== p) return;
    const dt = p.last ? Math.min((now - p.last) / 1000, 0.05) : 0; p.last = now;
    try { arcQuiet(() => { p.a.step(dt); p.a.draw(); }); }
    catch (_) { arcPreviewStop(); return; }
    p.raf = requestAnimationFrame(frame);
  };
  p.raf = requestAnimationFrame(frame);
}

// The overlays sit at the same place on every row, so they are set once, on the row.
function arcPlaceShot(track, shot) {
  const set = (p, r) => { track.style.setProperty(`--${p}l`, r.l + '%'); track.style.setProperty(`--${p}t`, r.t + '%');
    if (r.w !== undefined) { track.style.setProperty(`--${p}w`, r.w + '%'); track.style.setProperty(`--${p}h`, r.h + '%'); track.style.setProperty(`--${p}hn`, r.h); track.style.setProperty(`--${p}wn`, r.w); } };
  set('mq', shot.marquee); set('sc', shot.screen); set('lp', shot.lamp);
}

// The row. Tap a side cabinet to centre it; tap the centred one (or START) to play.
function arcRender() {
  const track = document.getElementById('arc-list');
  if (!track) return;
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  track.innerHTML = '';
  const n = ARC_CABINETS.length;
  const shot = arcModelShot(arcDesign());
  track.classList.toggle('is-shot', !!shot);
  if (shot) arcPlaceShot(track, shot);
  ARC_CABINETS.forEach((cab, i) => {
    const m = document.createElement('button');
    m.className = 'arc-row';
    m.dataset.arcId = cab.id;
    m.style.setProperty('--arc-accent', cab.accent);
    m.setAttribute('aria-label', `${cab.label}, ${i + 1} of ${n}`);
    m.innerHTML = shot ? ARC_SHOT_HTML : ARC_MACHINE_HTML;
    if (shot) m.querySelector('.arc-m-shot').src = shot.url;
    m.querySelector('.arc-m-num').textContent = arcPad(i + 1);
    m.querySelector('.arc-m-name').textContent = cab.label;
    m.style.setProperty('--mqc', cab.label.length + 4);   // the marquee's text sizes to its longest line
    m.querySelector('.arc-crt-hi').textContent = arcBest(cab);
    m.addEventListener('click', () => (i === arcSel ? arcLaunch(cab.id) : arcSelect(i)));
    track.appendChild(m);
  });
  // every screen gets its still now (laid out, so the canvases have a size); the centred one goes live in arcPaintSel
  track.querySelectorAll('.arc-row').forEach((m, i) => arcPreviewStill(i, m.querySelector('.arc-crt-view')));
  arcRenderStrip();
  arcPaintSel();
  arcCentre(false);
  arcWatchCentre(track);
}

/* Native scroll-snap does the swiping; this only reports where it settled.
   The root margin shrinks the row to a 2% band down its middle, so exactly one
   cabinet can be "in view" — the one under the centre line. */
function arcWatchCentre(track) {
  if (typeof IntersectionObserver !== 'function') return;
  /* The observer only says "something crossed the centre band". WHICH cabinet is centred is read from
     layout (offsetLeft, which ignores transforms): the arch turns and pushes the neighbours back, and
     their transformed boxes can touch the band while the centred one still owns the middle. */
  arcObserver = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = -1, bestD = Infinity;
    Array.prototype.forEach.call(track.querySelectorAll('.arc-row'), (m, k) => {
      const d = Math.abs(m.offsetLeft + m.offsetWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (best >= 0 && best !== arcSel) { arcSel = best; playSecretBeep(660); arcPaintSel(); }
  }, { root: track, rootMargin: '0px -49% 0px -49%', threshold: 0 });
  Array.prototype.forEach.call(track.children, m => arcObserver.observe(m));
}

// Scroll the selected cabinet to the middle of the row.
function arcCentre(smooth) {
  const track = document.getElementById('arc-list');
  const m = track && track.children[arcSel];
  if (!m) return;
  const left = m.offsetLeft + m.offsetWidth / 2 - track.clientWidth / 2;
  if (smooth && !arcReducedMotion() && typeof track.scrollTo === 'function') track.scrollTo({ left, behavior: 'smooth' });
  else track.scrollLeft = left;
}

/* The position strip: one tick per cabinet, or one rail + thumb past
   ARC_TICKS_MAX — a single control either way, so 20 cabinets never mean 20
   sub-44px targets. Tap anywhere to jump, drag to scrub. */
function arcRenderStrip() {
  const s = document.getElementById('arc-scrub');
  if (!s) return;
  const n = ARC_CABINETS.length;
  const rail = n > ARC_TICKS_MAX;
  s.classList.toggle('is-rail', rail);
  s.innerHTML = rail ? '<b class="arc-thumb"></b>' : '<i></i>'.repeat(n);
  s.style.setProperty('--arc-n', n);
  s.setAttribute('aria-valuemin', '1');
  s.setAttribute('aria-valuemax', String(n));
}

function arcPaintSel() {
  const cab = ARC_CABINETS[arcSel];
  if (!cab) return;
  const n = ARC_CABINETS.length;
  const room = document.getElementById('screen-arcade');
  if (room) room.style.setProperty('--arc-accent', cab.accent);   // START, the strip and the floor pool
  document.querySelectorAll('#arc-list .arc-row').forEach((m, i) => {
    m.classList.toggle('is-sel', i === arcSel);
    m.style.setProperty('--d', i - arcSel); m.style.setProperty('--a', Math.abs(i - arcSel));   // the ring: signed distance and its size
    m.classList.toggle('is-far', Math.abs(i - arcSel) > 3);
    m.setAttribute('aria-current', String(i === arcSel));
  });
  document.querySelectorAll('#arc-scrub i').forEach((t, i) => t.classList.toggle('is-on', i === arcSel));
  const s = document.getElementById('arc-scrub');
  if (s) {
    s.style.setProperty('--arc-i', arcSel);
    s.setAttribute('aria-valuenow', String(arcSel + 1));
    s.setAttribute('aria-valuetext', `${cab.label}, ${arcSel + 1} of ${n}`);
  }
  const count = document.getElementById('arc-count');
  if (count) count.textContent = `${arcPad(arcSel + 1)} / ${arcPad(n)}`;
  const blurb = document.getElementById('arc-blurb');
  if (blurb) blurb.textContent = `${cab.label}. ${cab.blurb}`;
  if (arcIsUp() && !arcLaunchTimer) arcPreviewPlay(arcSel);
}

// A row, not a ring: the ends stop rather than wrap.
function arcSelect(i, smooth = true) {
  const next = Math.max(0, Math.min(ARC_CABINETS.length - 1, i));
  if (next === arcSel) return;
  arcSel = next;
  playSecretBeep(660);
  arcPaintSel();
  arcCentre(smooth);
}

function arcScrubAt(e) {
  const s = document.getElementById('arc-scrub');
  const r = s.getBoundingClientRect();
  if (!r.width) return;
  arcSelect(Math.floor(((e.clientX - r.left) / r.width) * ARC_CABINETS.length), !arcScrubDragged);
}

/* The cabinet's screen wears the room (spec § 3.2 4c): the room's palette, the
   cabinet's accent, and its number beside its name in the header. */
function arcDressCabinet(cab, i) {
  const sec = document.getElementById(cab.screen);
  if (!sec) return;
  const room = document.getElementById('screen-arcade'), cs = room ? getComputedStyle(room) : null;
  if (cs) ARC_ROLES.forEach(k => { const v = cs.getPropertyValue('--arc-' + k).trim(); if (v) sec.style.setProperty('--arc-' + k, v); });
  sec.style.setProperty('--arc-accent', cab.accent);
  const num = sec.querySelector('.arc-cab-num');
  if (num) num.textContent = arcPad(i + 1);
}

function arcLaunch(id) {
  const cab = ARC_CABINETS.find(c => c.id === id);
  if (!cab || arcLaunchTimer) return;   // a double-tap must not start it twice
  const i = ARC_CABINETS.indexOf(cab);
  arcDressCabinet(cab, i);
  if (i !== arcSel) { arcSel = i; arcPaintSel(); arcCentre(false); }
  const m = document.querySelectorAll('#arc-list .arc-row')[i];
  if (m) m.classList.add('is-coin');   // the screen flashes INSERT COIN
  arcPreviewStop();                    // the game takes its own canvas back before start()
  playSecretBeep(523);
  arcLaunchTimer = setTimeout(() => {
    playSecretBeep(784);
    arcLaunchTimer = setTimeout(() => { arcLaunchTimer = null; cab.start(); }, ARC_LAUNCH_MS - ARC_COIN_NOTE_MS);
  }, ARC_COIN_NOTE_MS);
}

// Called by lobby-host.js when the router opens the room.
function arcOpen() {
  arcStop();
  arcPaintPalette();
  showScreen('screen-arcade');
  arcRender();
  arcBindKeys();
}

// The router closed the room — lobbyPresent's showScreen takes it down.
function arcClose() { arcStop(); }

function arcStop() {
  if (arcLaunchTimer) { clearTimeout(arcLaunchTimer); arcLaunchTimer = null; }
  arcPreviewStop();
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  arcScrubbing = false;
  document.querySelectorAll('#arc-list .is-coin').forEach(m => m.classList.remove('is-coin'));
}

// A cabinet's ✕: tear every cabinet down and walk back to the select screen.
// The router never left `arcade: true`, so nothing else needs telling.
function arcExitCabinet() {
  ARC_CABINETS.forEach(cab => { try { cab.stop(); } catch (_) {} });
  arcOpen();
}

// Desktop: ←/→ (and ↑/↓) to move, Enter/Space to play, Escape to leave. Only
// while the room itself is up — a cabinet's own keys never reach here.
function arcBindKeys() {
  if (arcKeysBound) return;
  arcKeysBound = true;
  document.addEventListener('keydown', e => {
    if (!arcIsUp()) return;
    const so = document.getElementById('sound-overlay');
    if (so && so.style.display && so.style.display !== 'none') return;   // the sound sheet keeps its own keys
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown')    { e.preventDefault(); arcSelect(arcSel + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp')  { e.preventDefault(); arcSelect(arcSel - 1); }
    else if (k === 'Enter' || k === ' ') {
      const a = document.activeElement;
      // 🔊 and ✕ keep their own Enter; a cabinet or START plays the centred cabinet.
      if (a && a.tagName === 'BUTTON' && !a.classList.contains('arc-row') && a.id !== 'btn-arc-start') return;
      e.preventDefault(); arcLaunch(ARC_CABINETS[arcSel].id);
    }
    else if (k === 'Escape') { e.preventDefault(); lobbyDispatch({ t: 'arcadeClose' }); }
  });
}

document.getElementById('btn-arc-start').addEventListener('click', () => arcLaunch(ARC_CABINETS[arcSel].id));
document.getElementById('btn-arc-close').addEventListener('click', () => {
  playPillClick();
  lobbyDispatch({ t: 'arcadeClose' });
});
(function arcBindScrub() {
  const s = document.getElementById('arc-scrub');
  s.addEventListener('pointerdown', e => {
    e.preventDefault();   // a tap is not a focus — the keyboard ring stays for the keyboard
    arcScrubbing = true; arcScrubDragged = false;
    try { s.setPointerCapture(e.pointerId); } catch (_) {}
    arcScrubAt(e);
  });
  s.addEventListener('pointermove', e => { if (!arcScrubbing) return; arcScrubDragged = true; arcScrubAt(e); });
  const end = () => { arcScrubbing = false; arcScrubDragged = false; };
  s.addEventListener('pointerup', end);
  s.addEventListener('pointercancel', end);
})();
