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
// SW v257 — the "Arcade Floor" (spec § 3.1): one cabinet per game, painted in
// the player's saved controller colours (shell / plate / ears / buttons — the
// same roles the Lounge's props wear), on a native scroll-snap row; whichever
// cabinet crosses its centre is the selection, reported by an IntersectionObserver.
//
// SW v260 — the ring (spec § 3.3). With WebGL the cabinets are the Lounge's own
// model (lounge-props.js louBuildArcade), all in ONE Three.js scene, standing on
// a ring with their backs to an invisible ball: the centred one faces us, its
// neighbours turn away and show their sides. The row is still there, invisible,
// as the input — its scroll turns the ring. The room runs ONE loop (arcLoop: the
// live preview + the scene), stopped by arcStop(); the renderer lives while the
// arcade does and is released by arcStop() from arcClose() and resetToLobby()
// (logic-engine.md § Timer Lifecycle). Without WebGL: the CSS cabinet row.
//
// Depends on: engine.js (showScreen, playPillClick), secret-mode.js
// (playSecretBeep — the cabinets' own voice), lobby-host.js (lobbyDispatch,
// lobbyWebgl), controller.js (ctlReadDesign — optional; the factory lilac is the
// fallback), three.min.js + lounge-lib.js + lounge-props.js + controller-body.js
// (the ring — optional; absent, the CSS row).
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

/* The CSS cabinet — the fallback when there is no WebGL to draw the ring with.
   The bear's ears on the panda's one-piece body. Glow first, then ears, then
   body — positioned siblings paint in DOM order, so the ears sit behind the hood
   and the accent pool sits behind everything. Every row is `.arc-row` (the layout
   + scroll-snap box, never transformed — snap reads the TRANSFORMED box) around
   `.arc-m`, which carries the depth. The marquee is the number and the name; the
   screen is the game's own menu scene (a cabinet's `preview`), PRESS START, and
   HI only when the session board has one (spec § 3.2). */
const ARC_MARQ_HTML = '<span class="arc-m-marq-text"><b class="arc-m-num"></b><span class="arc-m-name"></span></span>';
const ARC_CRT_HTML =
  '<span class="arc-crt">' +
    '<canvas class="arc-crt-view" aria-hidden="true"></canvas>' +
    '<span class="arc-crt-hi"></span>' +
    '<span class="arc-crt-press">Press start</span>' +
    '<span class="arc-crt-coin">Insert coin</span>' +
  '</span>';
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

/* ── The ring (SW v260, spec § 3.3) ─────────────────────────────────────────
   A row on the ring is only an invisible hit-box, one PROJECTED pitch wide (the
   distance on screen from the centred cabinet to its neighbour), so a swipe of
   one pitch turns the ring one step. Its game's screen is drawn into the row's
   `.arc-crt-view` exactly as on the CSS cabinet — a fixed-size canvas of the
   glass's own aspect — and composited (arcPaintFace) onto the model's glass. */
const ARC_FACE_W = 480, ARC_FACE_H = 260;   // the CRT glass, 86.4 × 46.8 mm (louBuildArcade GW × GH)
const ARC_MARQ_W = 512, ARC_MARQ_H = 76;    // the marquee glass, 98 × 14.5 mm
const ARC_GL_ROW_HTML =
  `<canvas class="arc-crt-view" width="${ARC_FACE_W}" height="${ARC_FACE_H}" aria-hidden="true"></canvas>` +
  '<span class="arc-sr"><b class="arc-m-num"></b> <span class="arc-m-name"></span> <span class="arc-crt-hi"></span></span>';
/* step: degrees between two cabinets round the ring (the radius follows — see arcRingR) — stepWide on a
   floor wider than it is tall, where a flatter ring lets more cabinets fan out to the sides; gap: metres
   between two backs; lift: the camera's height over the decks, in degrees; fov: its lens; fill: the
   centred cabinet's share of the floor's height; cy: where its middle sits, from the top; out: how far
   (metres) the centred cabinet steps out of the ring toward us — the hero in the spotlight. Mutable, so
   a review script can try another ring and call arcGlFit(). */
const ARC_RING = { step: 50, stepWide: 30, gap: 0.006, lift: 20, fov: 44, fill: 0.52, cy: 0.6, out: 0.09 };
const ARC_RING_SHOW = 3;          // cabinets drawn either side of the centred one
const ARC_CAB_H = 0.234;          // the model ears to feet, metres
const ARC_CAB_BACK = 0.066, ARC_CAB_HALF = 0.065;   // its back face behind its origin, and its half-width
const ARC_SPIN_MS = 650;          // the ring spins in when the room opens
const ARC_SPIN_FROM = 1.5;        // …from this many steps away
const ARC_BEATS = { ghost: 0.3, hiscore: 0.3, twitch: 0.2, flicker: 0.2 };   // the arrival beat, never twice running

let arcSel = 0;              // the centred cabinet — memory only, survives leaving the room
let arcLaunchTimer = null;
let arcKeysBound = false;
let arcObserver = null;      // IntersectionObserver on the row — whichever cabinet crosses the centre is selected
let arcScrubbing = false;    // a pointer is down on the position strip
let arcScrubDragged = false; // …and has moved, so the row follows instantly rather than gliding
let arcPrev = null;          // the one live preview { i, a } — the centred cabinet's screen, stepped by arcLoop
let arcPreviewQuiet = false; // true only while a preview's own code runs — secret-mode.js playSecretBeep stays silent
let arcRaf = null;           // the room's ONE loop (arcLoop)
let arcLoopLast = 0;
let arcGl = null;            // the ring while the arcade is open { renderer, scene, ring, cam, cabs, … }
let arcGlFailed = false;     // no WebGL, or a build that threw: the CSS row for the rest of the session
let arcSteerTo = null;       // a key/tap/strip glide's destination: the centre observer keeps quiet until the row lands there
let arcCabRO = null;         // the playing cabinet's canvas, watched: its header follows the canvas's width
let arcAmbTimer = null;      // the playing cabinet's ambient light (arcAmbient), 10 fps

/* SW v259 — 4b: the screen is the game. A cabinet's optional `preview()` hands
   back an adapter { w, h, fy, begin(canvas, ctx), step(dt), draw(), end() }:
   begin() borrows the canvas it is given, step()/draw() run its attract scene
   with the card off, end() hands everything back so the next start() takes its
   own canvas again. The ROOM owns the loop, for the centred cabinet; every other
   screen keeps a still frame drawn on open. */
const ARC_PREVIEW_WARM_S = 1.2;   // a still frame shows the scene this far in, not its empty first frame

function arcIsUp() {
  const el = document.getElementById('screen-arcade');
  return !!el && el.style.display !== 'none';
}

function arcPad(n) { return String(n).padStart(2, '0'); }

/* The global reduced-motion block reaches CSS only; a smooth scrollTo() and the
   ring's loop are JS and would still move (ui-style.md § Motion Standard). */
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

/* HI and the session board's best, or nothing — never "HI 0". A cabinet's
   best() formats its own score (a time, a height); boards are memory only. */
function arcBest(cab) {
  if (typeof cab.best !== 'function') return '';
  let b = null; try { b = cab.best(); } catch (_) { b = null; }
  return b === null || b === undefined || b === '' ? '' : 'HI ' + b;
}

// A preview's own code, silenced: an attract demo may beep, and in the room it must not.
function arcQuiet(fn) { arcPreviewQuiet = true; try { return fn(); } finally { arcPreviewQuiet = false; } }

/* Size a screen's canvas to its box (a ring row's canvas is never laid out: it
   keeps the glass's fixed size), then fit the game's logical w × h to COVER it:
   the CRT is wide and every game is tall, so `fy` (0 top … 1 bottom) says which
   band of the scene the screen shows. */
function arcPreviewSetup(canvas, a) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth ? Math.round(canvas.clientWidth * dpr) : canvas.width;
  const ch = canvas.clientHeight ? Math.round(canvas.clientHeight * dpr) : canvas.height;
  if (canvas.width !== cw) canvas.width = Math.max(1, cw);
  if (canvas.height !== ch) canvas.height = Math.max(1, ch);
  const ctx = canvas.getContext('2d'), s = Math.max(canvas.width / a.w, canvas.height / a.h), fy = a.fy === undefined ? 0.5 : a.fy;
  ctx.setTransform(s, 0, 0, s, (canvas.width - a.w * s) / 2, (canvas.height - a.h * s) * fy);
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
  const a = arcPrev.a; arcPrev = null;
  try { arcQuiet(() => a.end()); } catch (_) {}
}

// Run the centred cabinet's scene live — arcLoop steps it. Reduced motion keeps every screen still.
function arcPreviewPlay(i) {
  if (arcPrev && arcPrev.i === i) return;
  arcPreviewStop();
  if (arcReducedMotion()) return;
  const canvas = arcRowView(i);
  const a = arcAdapter(ARC_CABINETS[i]);
  if (!a || !canvas) return;
  try { arcQuiet(() => { a.begin(canvas, arcPreviewSetup(canvas, a)); for (let t = 0; t < ARC_PREVIEW_WARM_S; t += 1 / 30) a.step(1 / 30); }); }
  catch (_) { try { arcQuiet(() => a.end()); } catch (__) {} return; }
  arcPrev = { i, a };
  arcLoopStart();
}

function arcRowView(i) {
  const row = document.querySelectorAll('#arc-list .arc-row')[i];
  return row ? row.querySelector('.arc-crt-view') : null;
}

/* ── The room's one loop ─────────────────────────────────────────────────────
   Steps the live preview and, on the ring, draws the scene. Never runs under
   reduced motion (the ring then draws once per scroll event, arcGlOnScroll).
   Stops itself when there is nothing left to drive. */
function arcLoopStart() {
  if (arcRaf !== null || arcReducedMotion()) return;
  if (!arcPrev && !arcGl) return;
  arcRaf = requestAnimationFrame(arcLoop);
}
function arcLoopStop() {
  if (arcRaf !== null) cancelAnimationFrame(arcRaf);
  arcRaf = null; arcLoopLast = 0;
}
function arcLoop(now) {
  arcRaf = null;
  const dt = arcLoopLast ? Math.min((now - arcLoopLast) / 1000, 0.05) : 0; arcLoopLast = now;
  const p = arcPrev;
  if (p) {
    try { arcQuiet(() => { p.a.step(dt); p.a.draw(); }); }
    catch (_) { arcPreviewStop(); }
  }
  if (arcGl && arcIsUp()) arcGlFrame(now, dt);
  if (arcPrev || (arcGl && arcIsUp())) arcRaf = requestAnimationFrame(arcLoop);
  else arcLoopLast = 0;
}

/* ── The ring: build, fit, draw, release ────────────────────────────────────── */

/* The ring's radius: the smallest at which two neighbours' back corners just
   clear each other (plus ARC_RING.gap) — backs to the ball, fronts out. */
function arcRingR(step) {
  const half = step * Math.PI / 360;
  return ARC_CAB_BACK + (ARC_CAB_HALF + ARC_RING.gap) / Math.tan(half);
}

function arcCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// A soft white disc fading to nothing — tinted, it is a contact shadow, a pool of light or a halo.
function arcSoftTex(THREE, inner) {
  const c = arcCanvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(inner, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* The stage light behind the ring: five beams fanning up from below the
   cabinets and a halo where the centred one's head is. White, tinted by the
   accent; additive, so it only ever adds light to the room's dark. */
function arcBeamTex(THREE) {
  const W = 256, H = 256, c = arcCanvas(W, H), x = c.getContext('2d');
  x.globalCompositeOperation = 'lighter';
  [-0.5, -0.24, 0, 0.24, 0.5].forEach((a, k) => {
    x.save(); x.translate(W / 2, H); x.rotate(a);
    const g = x.createLinearGradient(0, 0, 0, -H);
    g.addColorStop(0, `rgba(255,255,255,${k === 2 ? 0.5 : 0.32})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(-3, 0); x.lineTo(-22, -H * 1.1); x.lineTo(22, -H * 1.1); x.lineTo(3, 0); x.closePath(); x.fill();
    x.restore();
  });
  const h = x.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.36);
  h.addColorStop(0, 'rgba(255,255,255,.55)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = h; x.fillRect(0, 0, W, H);
  return new THREE.CanvasTexture(c);
}

/* The marquee: the number and the name in the accent, on black glass — painted
   once. Here (not in a Lounge builder) a canvas may be measured. */
function arcPaintMarquee(c, cab, i) {
  const x = c.getContext('2d'), W = c.width, H = c.height, num = arcPad(i + 1), name = cab.label, gap = 14;
  x.setTransform(1, 0, 0, 1, 0, 0); x.shadowBlur = 0; x.globalAlpha = 1;
  x.fillStyle = '#050507'; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
  glow.addColorStop(0, cab.accent + '44'); glow.addColorStop(1, cab.accent + '00');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  let px = 46, nw = 0, tw = 0;
  const fit = () => { x.font = `700 ${px}px Fredoka, system-ui, sans-serif`; nw = x.measureText(num).width; tw = nw + gap + x.measureText(name).width; };
  fit(); while (tw > W - 40 && px > 14) { px -= 2; fit(); }
  const left = (W - tw) / 2;
  x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = cab.accent; x.shadowColor = cab.accent; x.shadowBlur = 16;
  x.globalAlpha = 0.6; x.fillText(num, left, H / 2 + 2);
  x.globalAlpha = 1; x.fillText(name, left + nw + gap, H / 2 + 2);
  x.shadowBlur = 0;
}

/* The glass: the game's screen (the row's .arc-crt-view), then HI, PRESS START
   on the centred one (blinking, steady under reduced motion), INSERT COIN during
   the launch beat, scanlines and a sheen. The composite is the texture, so a
   still frame can be repainted without its PRESS START. */
function arcPaintFace(i, now) {
  const g = arcGl, c = g && g.cabs[i];
  if (!c) return;
  const cab = ARC_CABINETS[i], x = c.face.getContext('2d'), W = ARC_FACE_W, H = ARC_FACE_H;
  const view = arcRowView(i), row = view && view.parentElement;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.shadowBlur = 0;
  x.fillStyle = '#050507'; x.fillRect(0, 0, W, H);
  const pool = x.createRadialGradient(W / 2, H / 2, 6, W / 2, H / 2, W * 0.6);
  pool.addColorStop(0, cab.accent + '55'); pool.addColorStop(1, cab.accent + '00');
  x.fillStyle = pool; x.fillRect(0, 0, W, H);
  if (view) x.drawImage(view, 0, 0, W, H);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const coin = g.coin && g.coin.i === i ? now - g.coin.t0 : -1;
  if (coin >= 0) {
    x.fillStyle = '#050507'; x.fillRect(0, 0, W, H);
    x.globalAlpha = coin < 450 && coin % 150 >= 75 ? 0.15 : 1;
    x.font = '700 40px ui-monospace, Menlo, Consolas, monospace';
    x.fillStyle = cab.accent; x.shadowColor = cab.accent; x.shadowBlur = 18;
    x.fillText('INSERT COIN', W / 2, H / 2);
    x.globalAlpha = 1; x.shadowBlur = 0;
  } else {
    x.shadowColor = '#000'; x.shadowBlur = 10;
    const hi = row ? row.querySelector('.arc-crt-hi').textContent : '';
    if (hi) { x.font = '700 22px ui-monospace, Menlo, Consolas, monospace'; x.fillStyle = cab.accent; x.fillText(hi, W / 2, 24); }
    const blinkOn = arcReducedMotion() || (now % 1200) < 744;
    if (i === arcSel && blinkOn) { x.font = '700 28px ui-monospace, Menlo, Consolas, monospace'; x.fillStyle = '#ffffff'; x.fillText('PRESS START', W / 2, H - 30); }
    x.shadowBlur = 0;
  }
  x.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);   // light scanlines
  const vig = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.5)');
  x.fillStyle = vig; x.fillRect(0, 0, W, H);
  c.faces.screen.tex.needsUpdate = true;
}

/* Build the ring for this design: every cabinet a real louBuildArcade on a lite
   lib, wearing its own two canvases. Returns false — and the room uses the CSS
   row — when anything is missing or throws. The first open is timed into
   arcGl.ms (build, first frame) so a phone's cost can be read off. */
function arcGlStart(track) {
  const design = arcDesign(), key = ARC_ROLES.map(k => design[k]).join('|');
  if (arcGl && arcGl.key === key) return true;   // back from a cabinet: the ring is already standing
  arcGlRelease();
  if (arcGlFailed || typeof THREE === 'undefined' || !window.LouLib || !window.LouProps || !window.ControllerBody) return false;
  // the lobby probed WebGL at boot (lobby-host.js lobbyWebgl); without it THREE logs an error trying, so don't
  if (typeof lobbyWebgl !== 'undefined' && lobbyWebgl === false) { arcGlFailed = true; return false; }
  const floor = track.parentElement;
  try {
    const t0 = performance.now();
    const lib = LouLib.louCreateLib(THREE, { makeCanvas: arcCanvas, smoothNormals: ControllerBody.smoothNormals, lite: true });
    const scene = new THREE.Scene(), ring = new THREE.Group();
    scene.add(ring);
    const blob = arcSoftTex(THREE, 0.35), shadowGeo = new THREE.PlaneGeometry(0.19, 0.2);
    const shadowM = new THREE.MeshBasicMaterial({ color: '#000000', map: blob, transparent: true, opacity: 0.6, depthWrite: false });
    const cabs = ARC_CABINETS.map((cab, i) => {
      const face = arcCanvas(ARC_FACE_W, ARC_FACE_H), marq = arcCanvas(ARC_MARQ_W, ARC_MARQ_H);
      arcPaintMarquee(marq, cab, i);
      const root = LouProps.louBuildArcade(lib, design, [{ label: cab.label, accent: cab.accent }], null, { faces: { screen: face, marquee: marq } });
      const holder = new THREE.Group(); holder.userData.arcI = i; holder.add(root);
      const shadow = new THREE.Mesh(shadowGeo, shadowM); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.0005, 0.006); shadow.renderOrder = -1;
      holder.add(shadow);
      ring.add(holder);
      const lamp = root.getObjectByName('coinLamp');
      return { holder, root, api: root.userData.api, face, marq, faces: root.userData.louArcadeFaces, lamp };
    });
    const tBuild = performance.now() - t0;
    // lit for the player's colour, not for a mood (DD-62): white light, no environment map, no tone mapping
    scene.add(new THREE.HemisphereLight('#ffffff', '#4a4054', 0.34));
    const key0 = new THREE.DirectionalLight('#ffffff', 0.6); key0.position.set(-0.6, 1.2, 1.0); scene.add(key0);
    const rim = new THREE.DirectionalLight('#d8c8ff', 0.4); rim.position.set(0.8, 0.6, -0.9); scene.add(rim);
    // the one coloured light: low in front of the centred cabinet, in its accent
    const light = new THREE.PointLight('#ffffff', 0.3, 0.45, 1.5); light.position.set(0, 0.03, 0.14 + ARC_RING.out); scene.add(light);
    const poolM = new THREE.MeshBasicMaterial({ color: '#ffffff', map: arcSoftTex(THREE, 0.2), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), poolM); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.0003, 0.05 + ARC_RING.out); pool.renderOrder = -2;
    scene.add(pool);
    const beamM = new THREE.MeshBasicMaterial({ color: '#ffffff', map: arcBeamTex(THREE), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const beams = new THREE.Group(), beamPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), beamM);
    beamPlane.position.set(0, 0.8, 0); beams.add(beamPlane); beams.position.set(0, -0.12, -0.75); beams.renderOrder = -3;
    scene.add(beams);
    scene.fog = new THREE.Fog('#07060b', 1, 2);
    const canvas = document.createElement('canvas'); canvas.className = 'arc-gl'; canvas.setAttribute('aria-hidden', 'true');
    floor.insertBefore(canvas, track);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    const cam = new THREE.PerspectiveCamera(ARC_RING.fov, 1, 0.02, 6);
    arcGl = { key, lib, scene, ring, cabs, light, pool, beams, canvas, renderer, cam, track, floor,
      tint: new THREE.Color(ARC_CABINETS[arcSel] ? ARC_CABINETS[arcSel].accent : '#ffffff'), tmp: new THREE.Color(),
      base: null, spin: null, push: null, coin: null, live: -1, lastBeat: '', pitch: 0, ro: null,
      ms: { build: Math.round(tBuild), first: null } };
    track.addEventListener('click', arcGlOnClick);
    track.addEventListener('scroll', arcGlOnScroll, { passive: true });
    if (typeof ResizeObserver === 'function') {
      arcGl.ro = new ResizeObserver(() => { if (!arcGl || !arcIsUp()) return; arcGlFit(); arcCentre(false); arcGlRender(); });
      arcGl.ro.observe(floor);
    }
    // Fredoka may still be on its way: once it is in, the marquees are repainted in it
    if (document.fonts && document.fonts.load) document.fonts.load('700 40px Fredoka').then(() => {
      if (!arcGl || arcGl.cabs !== cabs) return;
      cabs.forEach((c, i) => { arcPaintMarquee(c.marq, ARC_CABINETS[i], i); c.faces.marquee.tex.needsUpdate = true; });
      arcGlRender();
    }).catch(() => {});
    return true;
  } catch (_) {
    arcGlRelease(); arcGlFailed = true;
    const left = floor && floor.querySelector('.arc-gl'); if (left) left.remove();
    return false;
  }
}

/* Fit the camera to the floor: the centred cabinet takes ARC_RING.fill of its
   height (and never more than half its width), seen from ARC_RING.lift above,
   its middle at ARC_RING.cy. Then the row learns the projected pitch and where
   the cabinet stands, so its hit-boxes and focus ring sit on the model. */
function arcGlFit() {
  const g = arcGl;
  if (!g) return;
  const W = g.floor.clientWidth, H = g.floor.clientHeight;
  if (!W || !H) return;
  g.renderer.setSize(W, H);
  g.step = W / H >= 1.2 ? ARC_RING.stepWide : ARC_RING.step;
  const R = arcRingR(g.step), st = g.step * Math.PI / 180;
  g.ring.position.set(0, 0, -R);
  g.R = R;
  const cam = g.cam, half = Math.tan(ARC_RING.fov * Math.PI / 360), aspect = W / H;
  cam.fov = ARC_RING.fov; cam.aspect = aspect;
  const D = Math.max(ARC_CAB_H / (ARC_RING.fill * 2 * half), (2 * ARC_CAB_HALF) / (0.5 * 2 * half * aspect));
  const lift = ARC_RING.lift * Math.PI / 180, target = new THREE.Vector3(0, ARC_CAB_H * 0.47, 0.01 + ARC_RING.out);
  cam.position.set(0, target.y + D * Math.sin(lift), target.z + D * Math.cos(lift));
  cam.lookAt(target);
  cam.setViewOffset(W, H, 0, (0.5 - ARC_RING.cy) * H, W, H);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  g.base = { pos: cam.position.clone(), target, oy: (0.5 - ARC_RING.cy) * H, fov: ARC_RING.fov };
  g.push = null;
  g.scene.fog.near = D; g.scene.fog.far = D + 0.34;   // a step round the ring is a step into the dark
  // the pitch: the centred cabinet's middle to its neighbour's, on screen, before the ring turns
  const px = (v) => { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
  const mid = ARC_CAB_H * 0.5, a = px(new THREE.Vector3(0, mid, ARC_RING.out)), b = px(new THREE.Vector3(R * Math.sin(st), mid, R * Math.cos(st) - R));
  g.pitch = Math.max(40, Math.abs(b.x - a.x));
  const top = px(new THREE.Vector3(0, ARC_CAB_H, ARC_RING.out - 0.03)).y, foot = px(new THREE.Vector3(0, 0, ARC_RING.out + 0.08)).y;
  arcGlPose(arcGlU());
  g.track.style.setProperty('--arc-pitch', g.pitch.toFixed(2) + 'px');
  g.track.style.setProperty('--arc-ct', Math.max(0, top).toFixed(1) + 'px');
  g.track.style.setProperty('--arc-ch', Math.max(40, foot - top).toFixed(1) + 'px');
}

// Where the ring stands right now, in cabinets: read off the row's scroll, so it follows the finger.
function arcGlU() {
  const g = arcGl, n = ARC_CABINETS.length;
  if (!g || !g.pitch) return arcSel;
  return Math.max(0, Math.min(n - 1, g.track.scrollLeft / g.pitch));
}

/* Stand the ring at u (in cabinets): each one at its angle round the circle, and
   the one nearest the front stepped out of it toward us by up to ARC_RING.out. */
function arcGlPose(u) {
  const g = arcGl, st = g.step * Math.PI / 180;
  g.ring.rotation.y = -u * st;
  g.cabs.forEach((c, i) => {
    const d = Math.abs(i - u), k = Math.max(0, 1 - d), r = g.R + ARC_RING.out * k * k * (3 - 2 * k);
    c.holder.position.set(r * Math.sin(i * st), 0, r * Math.cos(i * st)); c.holder.rotation.y = i * st;
    c.holder.visible = d <= ARC_RING_SHOW + 0.4;
  });
}

// The arrival beat: weighted, never the one that played last.
function arcPickBeat() {
  const g = arcGl, pool = Object.keys(ARC_BEATS).filter(n => n !== g.lastBeat);
  let r = Math.random() * pool.reduce((s, n) => s + ARC_BEATS[n], 0);
  for (const n of pool) { r -= ARC_BEATS[n]; if (r < 0) return (g.lastBeat = n); }
  return (g.lastBeat = pool[pool.length - 1]);
}

const arcEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);   // in-out cubic: the push-in is a blocking beat

/* One frame of the ring: where the scroll has it (plus the spin-in), the
   centred cabinet's own beats once it has settled there, its face, the light
   following the accent, the push-in during the coin beat, then the draw. */
function arcGlFrame(now, dt) {
  const g = arcGl, reduced = arcReducedMotion(), u = arcGlU();
  let ur = u;
  if (g.spin) {
    if (g.spin.t0 === null) g.spin.t0 = now;
    const k = Math.min(1, (now - g.spin.t0) / ARC_SPIN_MS);
    ur += g.spin.from * Math.pow(1 - k, 3);
    if (k >= 1) g.spin = null;
  }
  arcGlPose(ur);
  // a cabinet that has just come round to the front does a turn, then idles on its own beats
  const near = Math.round(u);
  if (!g.spin && !g.coin && Math.abs(u - near) < 0.02 && near !== g.live) {
    if (g.live >= 0 && g.cabs[g.live]) g.cabs[g.live].api.reset();
    g.live = near;
    if (!reduced) g.cabs[near].api.startBeat(arcPickBeat());
  }
  const live = g.cabs[g.live];
  if (live) {
    live.api.tick(now, dt, reduced);
    if (live.api.currentBeat() !== 'hiscore') { live.lamp.material.emissive.set(ARC_CABINETS[g.live].accent); live.lamp.material.emissiveIntensity = 1.3; }
  }
  // the light and the pool turn to the centred cabinet's accent
  const acc = ARC_CABINETS[Math.max(0, Math.min(ARC_CABINETS.length - 1, near))].accent;
  g.tint.lerp(g.tmp.set(acc), reduced ? 1 : Math.min(1, dt * 6));
  g.light.color.copy(g.tint); g.pool.material.color.copy(g.tint); g.beams.children[0].material.color.copy(g.tint);
  if (!reduced) g.beams.rotation.z = 0.06 * Math.sin(now / 1700);
  if (arcSel >= 0 && g.cabs[arcSel]) arcPaintFace(arcSel, now);
  if (g.push) arcGlPush(now);
  g.renderer.render(g.scene, g.cam);
  if (g.ms.first === null) g.ms.first = Math.round(performance.now() - g.t0open);
}

// The launch beat's camera: from where it stands into the centred cabinet's glass.
function arcGlPush(now) {
  const g = arcGl, p = g.push, cam = g.cam;
  if (p.t0 === null) p.t0 = now;
  const k = arcEase(Math.min(1, (now - p.t0) / ARC_LAUNCH_MS));
  cam.position.lerpVectors(g.base.pos, p.to, k);
  const look = g.base.target.clone().lerp(p.at, k);
  cam.lookAt(look);
  cam.setViewOffset(cam.view.fullWidth, cam.view.fullHeight, 0, g.base.oy * (1 - k), cam.view.fullWidth, cam.view.fullHeight);
  cam.updateProjectionMatrix();
}

// Draw once, outside the loop (reduced motion, a resize, a repaint while the loop is off).
function arcGlRender() {
  if (!arcGl || !arcIsUp()) return;
  if (arcRaf !== null) return;   // the loop draws the next frame anyway
  arcGlFrame(performance.now(), 0);
}

function arcGlOnScroll() { if (arcReducedMotion()) arcGlRender(); }

// A tap on the floor: whichever cabinet it lands on (the nearest one wins). The centred one plays.
function arcGlOnClick(e) {
  if (!arcGl || e.detail === 0) return;   // a keyboard "click" on a row is the row's own (arcRender)
  const g = arcGl, r = g.canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) }, g.cam);
  const hits = ray.intersectObjects(g.cabs.filter(c => c.holder.visible).map(c => c.root), true);
  if (!hits.length) return;
  let o = hits[0].object; while (o && o.userData.arcI === undefined) o = o.parent;
  if (!o) return;
  const i = o.userData.arcI;
  if (i === arcSel) arcLaunch(ARC_CABINETS[i].id); else arcSelect(i);
}

// Let the ring go: its loop, its listeners, every geometry, material and texture, then the context.
function arcGlRelease() {
  const g = arcGl;
  if (!g) return;
  arcGl = null;
  if (g.ro) g.ro.disconnect();
  g.track.removeEventListener('click', arcGlOnClick);
  g.track.removeEventListener('scroll', arcGlOnScroll);
  const seen = new Set();
  g.scene.traverse(o => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    const m = o.material;
    if (m && !seen.has(m)) { seen.add(m); ['map', 'emissiveMap', 'bumpMap'].forEach(k => { if (m[k] && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); } }); m.dispose(); }
  });
  try { g.renderer.dispose(); g.renderer.forceContextLoss(); } catch (_) {}
  g.canvas.remove();
  g.track.classList.remove('is-gl');
}

/* ── The row ───────────────────────────────────────────────────────────────── */

// Tap a side cabinet to centre it; tap the centred one (or START) to play.
function arcRender() {
  const track = document.getElementById('arc-list');
  if (!track) return;
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  track.innerHTML = '';
  const t0 = performance.now();
  const gl = arcGlStart(track);
  if (gl) arcGl.t0open = t0;
  track.classList.toggle('is-gl', gl);
  const n = ARC_CABINETS.length;
  ARC_CABINETS.forEach((cab, i) => {
    const m = document.createElement('button');
    m.className = 'arc-row';
    m.dataset.arcId = cab.id;
    m.style.setProperty('--arc-accent', cab.accent);
    m.setAttribute('aria-label', `${cab.label}, ${i + 1} of ${n}`);
    m.innerHTML = gl ? ARC_GL_ROW_HTML : ARC_MACHINE_HTML;
    m.querySelector('.arc-m-num').textContent = arcPad(i + 1);
    m.querySelector('.arc-m-name').textContent = cab.label;
    if (!gl) m.style.setProperty('--mqc', cab.label.length + 4);   // the marquee's text sizes to its longest line
    m.querySelector('.arc-crt-hi').textContent = arcBest(cab);
    m.addEventListener('click', () => (i === arcSel ? arcLaunch(cab.id) : arcSelect(i)));
    track.appendChild(m);
  });
  // every screen gets its still now (laid out, so the canvases have a size); the centred one goes live in arcPaintSel
  track.querySelectorAll('.arc-row').forEach((m, i) => arcPreviewStill(i, m.querySelector('.arc-crt-view')));
  if (gl) {
    const now = performance.now();
    arcGl.cabs.forEach((c, i) => { c.api.reset(); arcPaintFace(i, now); });
    arcGl.live = -1; arcGl.coin = null;
    arcGlFit();
    arcGl.spin = arcReducedMotion() ? null : { t0: null, from: arcSel < ARC_CABINETS.length - 1 ? ARC_SPIN_FROM : -ARC_SPIN_FROM };
  }
  arcRenderStrip();
  arcPaintSel();
  arcCentre(false);
  arcWatchCentre(track);
  if (gl) { arcGlRender(); arcLoopStart(); }
}

/* Native scroll-snap does the swiping; this only reports where it settled.
   The root margin shrinks the row to a 2% band down its middle, so exactly one
   cabinet can be "in view" — the one under the centre line. */
function arcWatchCentre(track) {
  if (typeof IntersectionObserver !== 'function') return;
  /* The observer only says "something crossed the centre band". WHICH cabinet is centred is read from
     layout (offsetLeft, which ignores transforms): the CSS row scales the neighbours, and their
     transformed boxes can touch the band while the centred one still owns the middle. */
  arcObserver = new IntersectionObserver(() => arcSyncCentre(track), { root: track, rootMargin: '0px -49% 0px -49%', threshold: 0 });
  Array.prototype.forEach.call(track.children, m => arcObserver.observe(m));
}

/* Whichever row's layout centre is nearest the middle is the selection. Every
   crossing counts — a row LEAVING the band is as much news as one entering, and
   the last event of a glide is often a leave. While a glide the room started is
   under way (arcSteerTo) the rows it passes are not news: the selection is
   already where it is going, and naming the one halfway past would jump back. */
function arcSyncCentre(track) {
  if (!arcIsUp() || !track.clientWidth) return;   // a hidden room measures every row at 0: that is not a selection (a playing cabinet's)
  const mid = track.scrollLeft + track.clientWidth / 2;
  let best = -1, bestD = Infinity;
  Array.prototype.forEach.call(track.querySelectorAll('.arc-row'), (m, k) => {
    const d = Math.abs(m.offsetLeft + m.offsetWidth / 2 - mid);
    if (d < bestD) { bestD = d; best = k; }
  });
  if (arcSteerTo !== null) { if (best === arcSteerTo) arcSteerTo = null; return; }
  if (best >= 0 && best !== arcSel) { arcSel = best; playSecretBeep(660); arcPaintSel(); }
}

// Scroll the selected cabinet to the middle of the row.
function arcCentre(smooth) {
  const track = document.getElementById('arc-list');
  const m = track && track.children[arcSel];
  if (!m) return;
  const left = m.offsetLeft + m.offsetWidth / 2 - track.clientWidth / 2;
  if (smooth && !arcReducedMotion() && typeof track.scrollTo === 'function') {
    arcSteerTo = Math.abs(track.scrollLeft - left) > 1 ? arcSel : null;
    track.scrollTo({ left, behavior: 'smooth' });
  } else { arcSteerTo = null; track.scrollLeft = left; }
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
    const was = m.classList.contains('is-sel');
    m.classList.toggle('is-sel', i === arcSel);
    m.style.setProperty('--a', Math.abs(i - arcSel));   // the CSS row's depth: how far from the centred one
    m.classList.toggle('is-far', Math.abs(i - arcSel) > 3);
    m.setAttribute('aria-current', String(i === arcSel));
    if (arcGl && was && i !== arcSel) arcPaintFace(i, performance.now());   // its PRESS START goes with the selection
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
  if (arcGl) { arcPaintFace(arcSel, performance.now()); arcGlRender(); }
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
  /* A wide window: the header is held to the canvas's column (--arc-cab-w), and the game's own picture,
     blurred, spills out round it — the screen lighting the room. Only where there is room either side. */
  arcCabStop();
  const cv = sec.querySelector('[id$="-stage"] > canvas');
  if (!cv) return;
  let amb = sec.querySelector('.arc-amb');
  if (!amb) { amb = document.createElement('canvas'); amb.className = 'arc-amb'; amb.setAttribute('aria-hidden', 'true'); sec.insertBefore(amb, sec.firstChild); }
  const fit = () => { sec.style.setProperty('--arc-cab-w', cv.offsetWidth + 'px'); sec.classList.toggle('is-wide', sec.clientWidth - cv.offsetWidth > 80); };
  if (typeof ResizeObserver === 'function') { arcCabRO = new ResizeObserver(fit); arcCabRO.observe(cv); arcCabRO.observe(sec); }
  arcAmbTimer = setInterval(() => arcAmbient(sec, cv, amb), arcReducedMotion() ? 1000 : 100);
}

/* One frame of the ambient light: the game's picture, carried past its frame. The canvas is drawn
   where it stands (in a tiny copy of the screen) and its own edge strips are stretched out to the
   screen's edges — the sea, the road, the sky go on — then CSS blurs it all up. Never the middle
   blown up: that is where the menu cards are, and enlarged they are only blobs. */
const ARC_AMB_EDGE = 0.04;   // the share of the canvas's width (and height) each stretched strip takes
function arcAmbient(sec, cv, amb) {
  if (!sec.classList.contains('is-wide') || !cv.width || !cv.height || sec.style.display === 'none') return;
  const sr = sec.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  if (!sr.width || !cr.width) return;
  const W = 96, k = W / sr.width, H = Math.max(8, Math.round(sr.height * k));
  if (amb.width !== W) amb.width = W;
  if (amb.height !== H) amb.height = H;
  const x = amb.getContext('2d'), cx = (cr.left - sr.left) * k, cy = (cr.top - sr.top) * k, cw = cr.width * k, ch = cr.height * k;
  const ew = Math.max(1, Math.round(cv.width * ARC_AMB_EDGE)), eh = Math.max(1, Math.round(cv.height * ARC_AMB_EDGE));
  try {
    x.drawImage(cv, 0, 0, cv.width, eh, cx, 0, cw, cy + 1);                                   // top
    x.drawImage(cv, 0, cv.height - eh, cv.width, eh, cx, cy + ch - 1, cw, H - cy - ch + 1);    // bottom
    x.drawImage(cv, 0, 0, ew, cv.height, 0, 0, cx + 1, H);                                     // left, to the screen's edge
    x.drawImage(cv, cv.width - ew, 0, ew, cv.height, cx + cw - 1, 0, W - cx - cw + 1, H);      // right
    x.drawImage(cv, cx, cy, cw, ch);                  // the picture itself, under the real one
  } catch (_) {}
}

function arcCabStop() {
  if (arcAmbTimer) { clearInterval(arcAmbTimer); arcAmbTimer = null; }
  if (arcCabRO) { arcCabRO.disconnect(); arcCabRO = null; }
}

/* The launch beat. On the ring: the cabinet's own press (the stick snaps, the
   buttons flash), INSERT COIN on its glass, and the camera pushes into the CRT
   before the cabinet takes the screen. The loop stops then; the ring stays built
   for the way back. */
function arcLaunch(id) {
  const cab = ARC_CABINETS.find(c => c.id === id);
  if (!cab || arcLaunchTimer) return;   // a double-tap must not start it twice
  const i = ARC_CABINETS.indexOf(cab);
  arcDressCabinet(cab, i);
  if (i !== arcSel) { arcSel = i; arcPaintSel(); arcCentre(false); }
  const m = document.querySelectorAll('#arc-list .arc-row')[i];
  if (m) m.classList.add('is-coin');   // the CSS screen flashes INSERT COIN
  arcPreviewStop();                    // the game takes its own canvas back before start()
  const reduced = arcReducedMotion();
  if (arcGl) {
    const g = arcGl, c = g.cabs[i];
    g.spin = null;
    if (g.live >= 0 && g.live !== i && g.cabs[g.live]) g.cabs[g.live].api.reset();
    g.live = i; g.coin = { i, t0: performance.now() };
    c.api.press(reduced);
    if (!reduced) {
      arcGlPose(i); g.ring.updateMatrixWorld(true);
      const f = c.api.focusPose(), d = c.faces.screen.w / (0.9 * 2 * Math.tan(g.cam.fov * Math.PI / 360) * g.cam.aspect);
      g.push = { t0: null, to: f.point.clone().addScaledVector(f.normal, d), at: f.point.clone() };
    }
    arcPaintFace(i, performance.now());
    arcGlRender(); arcLoopStart();
  }
  playSecretBeep(523);
  arcLaunchTimer = setTimeout(() => {
    playSecretBeep(784);
    arcLaunchTimer = setTimeout(() => {
      arcLaunchTimer = null;
      arcLoopStop();
      if (arcGl) { arcGl.coin = null; arcGl.push = null; }
      cab.start();
    }, ARC_LAUNCH_MS - ARC_COIN_NOTE_MS);
  }, ARC_COIN_NOTE_MS);
}

// Called by lobby-host.js when the router opens the room, and by a cabinet's ✕ on the way back.
function arcOpen() {
  arcStop(true);   // keep the ring: back from a cabinet it is already standing
  arcPaintPalette();
  showScreen('screen-arcade');
  arcRender();
  arcBindKeys();
}

// The router closed the room — lobbyPresent's showScreen takes it down.
function arcClose() { arcStop(); }

// Every timer and loop the room runs; and, unless asked to keep it, the ring itself.
function arcStop(keepRing) {
  if (arcLaunchTimer) { clearTimeout(arcLaunchTimer); arcLaunchTimer = null; }
  arcCabStop();
  arcSteerTo = null;
  arcPreviewStop();
  arcLoopStop();
  if (arcObserver) { arcObserver.disconnect(); arcObserver = null; }
  if (!keepRing) arcGlRelease();
  else if (arcGl) { arcGl.coin = null; arcGl.push = null; }
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
(function arcBindRow() {
  const t = document.getElementById('arc-list');
  const take = () => { arcSteerTo = null; };
  t.addEventListener('pointerdown', take, { passive: true });
  t.addEventListener('wheel', take, { passive: true });
  t.addEventListener('touchstart', take, { passive: true });
  t.addEventListener('scrollend', () => { arcSteerTo = null; if (arcIsUp()) arcSyncCentre(t); });
})();
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
