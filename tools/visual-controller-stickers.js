/* Visual verification for the controller sticker rasteriser.
   ─────────────────────────────────────────────────────────────────────────────
   The other three controller harnesses (verify-controller-body / -state /
   -stickers) are pure Node: they drive the geometry module and the pure half of
   js/controller.js with no browser at all, which is exactly what makes them
   fast and exactly what blinds them to every line below the "══ RENDERER ══"
   marker. The rasteriser IS that code. A stamp that paints nothing, an atlas
   that never grows, a wrap that stops dead at the seam — all three pass 157
   green checks without complaint.

   So this one runs the real page in real Chromium and reads real texels.

       node tools/visual-controller-stickers.js
       node tools/visual-controller-stickers.js --shot out.png   (also writes a render)

   It needs Playwright, which is deliberately NOT a project dependency — the app
   has no build step and no npm (CLAUDE.md § Anti-Patterns), and this is dev
   tooling that only Claude Code's own install carries. With Playwright absent
   it says so and exits 0, so it can never turn a checkout red for a missing
   optional tool. It serves the repo itself on a free port; nothing external.

   Two traps worth knowing, both cost real time to find:

   1. "Count texels that differ from the shell fill" is a useless metric. The
      faceplate polygon already differs over ~1.1M texels, and a sticker on the
      deck lands INSIDE it — the count moves by about one whether the stamp ran
      or not. Diff the with-sticker atlas against the bare one instead.

   2. Chromium's plain --use-gl=swiftshader produces a WebGL context that
      reports itself available, throws nothing, and rasterises NOTHING: every
      readPixels comes back fully transparent and every screenshot is blank.
      ANGLE-over-swiftshader actually draws. */

const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SHOT = process.argv.indexOf('--shot') >= 0 ? process.argv[process.argv.indexOf('--shot') + 1] : null;

/* The one refusal this harness asserts by value — it is the message a
   player sees most, and copying it here is what would catch it being
   quietly reworded away from the prototype's (spec § 7). */
const CTL_REFUSAL_RING = 'The stick rings and the bosses behind the ears are off-limits.';
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader',
                 '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

function loadPlaywright() {
  const candidates = [
    path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'),
    'playwright',
  ];
  for (const c of candidates) { try { return require(c); } catch (_) {} }
  return null;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
                '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

function serve() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }   // path.join, so separators match
      fs.readFile(file, (e, buf) => {
        if (e) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}

/* Runs INSIDE the page. Everything it returns is a number or a plain object —
   nothing here may reach back into Node. */
async function probe() {
  await ctlLoadStickerManifest();
  const before = CTL_ATLAS;
  ctlOpenWorkshop();
  const t0 = performance.now();
  const built = ctlEnsureStickerSurface();
  const surfaceMs = Math.round(performance.now() - t0);
  const idem = ctlEnsureStickerSurface();                 // must be a no-op
  const A = CTL_ATLAS;
  const id = ctlStickerManifest[ctlStickerManifest.length - 1].id;

  const grabC = () => ctlCtx.getImageData(0, 0, A, A).data.slice();
  const grabB = () => ctlBumpCtx.getImageData(0, 0, A, A).data.slice();

  const paint = async (rec) => {
    ctlDesign.stickers = []; ctlDraft.stickers = [];
    ctlRedrawShell();
    const bare = grabC();
    ctlDesign.stickers = [rec]; ctlDraft.stickers = [rec];
    ctlRedrawShell();
    for (let i = 0; i < 80 && !(ctlStickerImages[rec.id] && ctlStickerImages[rec.id].data); i++)
      await new Promise(r => setTimeout(r, 50));
    ctlRedrawShell();                                     // the decode repaints; be sure
    const now = grabC(), bump = grabB();

    /* The two islands: v in [0.51,0.99] of the atlas is the FRONT sheet,
       [0.01,0.49] the back one (ctlPlainAtlas). A rim sticker must reach both;
       a tangent one must never leave its own. */
    let front = 0, back = 0, lit = 0, tallest = 0;
    for (let i = 0, n = 0; i < now.length; i += 4, n++) {
      if (bump[i] > 8) lit++;
      if (bump[i] > tallest) tallest = bump[i];
      if (bare[i] === now[i] && bare[i + 1] === now[i + 1] && bare[i + 2] === now[i + 2]) continue;
      if ((n / A | 0) >= 0.51 * A) front++; else back++;
    }
    /* Did padEdges bleed? Count pad DESTINATION texels that changed. They sit
       outside the silhouette, where no stamp can reach, so only the bleed can
       have touched them. */
    let bled = 0;
    for (let i = 0; i < ctlStickerPad.dst.length; i++) {
      const o = ctlStickerPad.dst[i] * 4;
      if (bare[o] !== now[o] || bare[o + 1] !== now[o + 1] || bare[o + 2] !== now[o + 2]) bled++;
    }
    return { front, back, lit, tallest, bled };
  };

  const tanQ = ctlStickerSurface.plan(-1.0, -0.5, false, 0.42);
  const tan = await paint({ id, surface: 'shell', x: -1.0, y: -0.5, back: false,
                            rot: 0, size: 0.42, chart: tanQ.chart });
  /* A rim placement is stored at the coordinates plan() SNAPPED it to; the load
     path then uses them verbatim (spec § 6). */
  const rimQ = ctlStickerSurface.plan(0, 0.65, false, 0.34);
  const rim = await paint({ id, surface: 'shell', x: rimQ.x, y: rimQ.y, back: false,
                            rot: 0, size: 0.34, chart: rimQ.chart });

  const well = ctlStickerSurface.plan(-1.25, 0.20, false, 0.18);   // dead centre of a stick well

  /* The adaptive die-cut border (spec D8).

     Identifying the border needs no instrumentation: paint the same sticker on
     two different shells and take the texels whose colour DIFFERS between
     them. Opaque artwork is shell-independent and cancels; the border is
     shell-dependent by construction. (The artwork's own antialiased rim lands
     in the set too — it is the rim of the same feature, so it belongs there.)

     Then compare the border's MEAN luminance with the shell's. No cutoff, no
     magic number: on a light shell the ring must come out darker than what it
     sits on, on a dark shell lighter. Counting "dark texels" instead needs a
     threshold, and every threshold picked here was wrong — 0.16 sits below
     anything the blend produces, and counting across the whole atlas just
     measures the shell. */
  const borderId = ctlStickerById('flw') ? 'flw' : id;   // 1.01:1 on FRT — the case D8 exists for
  const bq = ctlStickerSurface.plan(-1.0, -0.5, false, 0.42);
  const borderRec = { id: borderId, surface: 'shell', x: -1.0, y: -0.5, back: false,
                      rot: 0, size: 0.42, chart: bq.chart };
  ctlStickerImage(borderId);
  for (let i = 0; i < 80 && !(ctlStickerImages[borderId] && ctlStickerImages[borderId].data); i++)
    await new Promise(r => setTimeout(r, 50));

  const lumAt = (d, o) => (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255;
  const onShell = (hex) => {
    ctlDesign.shell = hex; ctlDesign.plate = hex;
    ctlDesign.stickers = []; ctlRedrawShell();
    const bare = ctlCtx.getImageData(0, 0, A, A).data.slice();
    ctlDesign.stickers = [borderRec]; ctlRedrawShell();
    return { bare, now: ctlCtx.getImageData(0, 0, A, A).data.slice() };
  };
  const Y = onShell('#FFE500'), K = onShell('#18181B');
  let nBorder = 0, sumY = 0, sumK = 0;
  for (let o = 0; o < Y.now.length; o += 4) {
    const chY = !(Y.bare[o] === Y.now[o] && Y.bare[o+1] === Y.now[o+1] && Y.bare[o+2] === Y.now[o+2]);
    const chK = !(K.bare[o] === K.now[o] && K.bare[o+1] === K.now[o+1] && K.bare[o+2] === K.now[o+2]);
    if (!chY && !chK) continue;
    if (Y.now[o] === K.now[o] && Y.now[o+1] === K.now[o+1] && Y.now[o+2] === K.now[o+2]) continue;
    nBorder++; sumY += lumAt(Y.now, o); sumK += lumAt(K.now, o);
  }
  const border = { n: nBorder,
                   meanOnYellow: +(sumY / Math.max(1, nBorder)).toFixed(3),
                   meanOnBlack: +(sumK / Math.max(1, nBorder)).toFixed(3),
                   shellYellow: +lumAt(Y.bare, 0).toFixed(3),
                   shellBlack: +lumAt(K.bare, 0).toFixed(3),
                   id: borderId };

  /* ── EAR UVs and the flat rasteriser ──────────────────────────────────
     buildEars ships ExtrudeGeometry's default UVs and the colour-only build
     never noticed, because a flood fill does not care where the UVs point.
     So the first thing to prove is that every ear vertex now lands in its own
     quadrant of the 2x2 cap grid — or on the parked texel that mixed-normal
     triangles share. A default-UV ear fails this immediately. */
  const badUV = [];
  ctlEars.forEach((m, idx) => {
    const uv = m.geometry.attributes.uv.array;
    for (let i = 0; i < uv.length; i += 2) {
      const u = uv[i], v = uv[i + 1];
      if (u > 0.99 && v < 0.01) continue;                      // parked
      const rightColumn = idx === 0 ? (u < 0.5) : (u >= 0.5);
      if (!rightColumn || u < 0 || u > 1 || v < 0 || v > 1) badUV.push([idx, +u.toFixed(3), +v.toFixed(3)]);
    }
  });

  /* Then: does a sticker stay inside the quadrant it was placed in? The clip
     rect is the only thing stopping a sticker near a quadrant's inner edge
     from painting into whichever neighbour shares that edge. */
  const EA = CTL_EAR_ATLAS, EH = EA / 2;
  ctlDesign.ears = '#B1BCA0';
  ctlDesign.stickers = [{ id: borderId, surface: 'earL', u: 0.25, v: 0.26, r: 0.2, rot: 0 }];
  ctlRedrawEars();
  const ed = ctlEarCtx.getImageData(0, 0, EA, EA).data;
  const en = parseInt(ctlDesign.ears.slice(1), 16);
  const er = (en >> 16) & 255, eg = (en >> 8) & 255, ebv = en & 255;
  const quad = [0, 0, 0, 0];
  for (let y = 0; y < EA; y++) for (let x = 0; x < EA; x++) {
    const o = (y * EA + x) * 4;
    if (Math.abs(ed[o] - er) + Math.abs(ed[o + 1] - eg) + Math.abs(ed[o + 2] - ebv) < 24) continue;
    quad[(y < EH ? 0 : 2) + (x < EH ? 0 : 1)]++;
  }
  const earBumpLit = (() => {
    const bd = ctlEarBumpCtx.getImageData(0, 0, EA, EA).data;
    let n = 0; for (let i = 0; i < bd.length; i += 4) if (bd[i] > 8) n++; return n;
  })();

  /* The ear border, measured the same threshold-free way as the shell's: the
     ears take a colour from the same 20 brand hexes, so near-white art on
     FRT's #FFE500 ears is the same 1.01:1 the shell case is. */
  const earOn = (hex) => {
    ctlDesign.ears = hex;
    ctlDesign.stickers = []; ctlRedrawEars();
    const bare = ctlEarCtx.getImageData(0, 0, EA, EA).data.slice();
    ctlDesign.stickers = [{ id: borderId, surface: 'earL', u: 0.25, v: 0.26, r: 0.2, rot: 0 }];
    ctlRedrawEars();
    return { bare, now: ctlEarCtx.getImageData(0, 0, EA, EA).data.slice() };
  };
  const EY = earOn('#FFE500'), EK = earOn('#18181B');
  let enB = 0, esY = 0, esK = 0;
  for (let o = 0; o < EY.now.length; o += 4) {
    const cY = !(EY.bare[o] === EY.now[o] && EY.bare[o+1] === EY.now[o+1] && EY.bare[o+2] === EY.now[o+2]);
    const cK = !(EK.bare[o] === EK.now[o] && EK.bare[o+1] === EK.now[o+1] && EK.bare[o+2] === EK.now[o+2]);
    if (!cY && !cK) continue;
    if (EY.now[o] === EK.now[o] && EY.now[o+1] === EK.now[o+1] && EY.now[o+2] === EK.now[o+2]) continue;
    enB++; esY += lumAt(EY.now, o); esK += lumAt(EK.now, o);
  }
  const ear = { atlas: EA, scale: +ctlEarScale.toFixed(4), badUV: badUV.length, quad,
                bumpLit: earBumpLit, borderN: enB,
                meanOnYellow: +(esY / Math.max(1, enB)).toFixed(3),
                meanOnBlack: +(esK / Math.max(1, enB)).toFixed(3),
                side: ctlPlanEarSticker({ x: 0.25, y: 0.01 }, 0.2, 0),
                capped: ctlPlanEarSticker({ x: 0.25, y: 0.26 }, 99, 0) };

  /* ── THE TAP GESTURE ──────────────────────────────────────────────────
     ctlStickerReduce itself is covered under Node (verify-controller-stickers
     § 9-12). What only a browser can show is the WIRING around it: that a
     dispatch leaves ctlDraft, ctlDesign and the live state pointing at one
     array — the thing that makes 'discard unsaved changes' honest — and that
     the surface's own plan() is what gates a placement. */
  ctlDesign.ears = '#B1BCA0';
  ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
  ctlDesign.stickers = []; ctlDraft.stickers = [];
  const t8id = ctlStickerManifest[0].id;
  const t8 = { refusals: Object.keys(CTL_REFUSAL).sort().join(',') };
  ctlStickerDispatch({ t: 'bookTap', id: t8id });
  t8.armed = ctlStickerMode(ctlStickerState);
  const t8p = ctlStickerSurface.plan(1.16, -0.12, false, 0.18);
  ctlStickerDispatch({ t: 'place', rec: { surface: 'shell', x: 1.16, y: -0.12, back: false,
                                          rot: 0, size: t8p.size, chart: t8p.chart } });
  t8.placed = ctlStickerState.stickers.length;
  t8.mode = ctlStickerMode(ctlStickerState);
  t8.shared = ctlDraft.stickers === ctlStickerState.stickers &&
              ctlDesign.stickers === ctlStickerState.stickers;
  /* A keep-out is refused by plan(), and the refusal has copy of its own —
     spec § 7 reuses the prototype's set rather than inventing new wording. */
  const t8bad = ctlStickerSurface.plan(-1.25, 0.20, false, 0.18);
  t8.keepOut = [t8bad.ok, t8bad.reason, !!CTL_REFUSAL[t8bad.reason]];
  ctlStickerDispatch({ t: 'relocate', rec: { surface: 'shell', x: 0.4, y: -0.4, back: false,
                                             rot: 0, size: 0.18, chart: 'tangent' } });
  t8.moved = [ctlStickerState.stickers[0].x, ctlStickerState.stickers.length];
  ctlStickerDispatch({ t: 'undo' });
  t8.undone = ctlStickerState.stickers[0].x;

  return { before, after: A, canvas: ctlCanvas.width, bumpCanvas: ctlBumpCanvas.width, ear, t8,
           built, idem, surfaceMs, id, manifest: ctlStickerManifest.length,
           padPairs: ctlStickerPad.dst.length, tanQ, tan, rimQ, rim, well,
           border,
           bumpMap: !!ctlBody.material.bumpMap, bumpScale: ctlBody.material.bumpScale };
}

(async () => {
  const pw = loadPlaywright();
  if (!pw) {
    console.log('Playwright is not installed — skipping the visual check (this is not a failure).');
    console.log('The pure-Node harnesses still cover everything above the RENDERER marker:');
    console.log('  node tools/verify-controller-stickers.js');
    process.exit(0);
  }

  const { server, port } = await serve();
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  try {
    await page.goto('http://127.0.0.1:' + port + '/index.html');
    await page.waitForFunction(() => typeof ctlEnsureBuilt === 'function' && ctlEnsureBuilt(),
                               null, { timeout: 30000 });
    const r = await page.evaluate(probe);

    console.log('\n── The shell rasteriser, in a real browser ──');
    console.log('   surface built in ' + r.surfaceMs + ' ms · sticker "' + r.id + '"');
    ok(r.before === 1024 && r.after === 2048, 'the atlas grows 1024 -> 2048 on first sticker use');
    ok(r.canvas === 2048 && r.bumpCanvas === 2048, 'BOTH canvases were resized, not just the colour one');
    ok(r.built === true && r.idem === true, 'ctlEnsureStickerSurface built, and is idempotent');
    ok(r.bumpMap && r.bumpScale === 0.035, 'the shell material carries the bump map');
    ok(r.manifest === 19, 'the shipped manifest loaded: ' + r.manifest + ' stickers');
    ok(r.padPairs > 1000, 'padPairs computed at the GROWN atlas size: ' + r.padPairs);
    ok(r.tanQ.chart === 'tangent' && r.tan.front > 5000 && r.tan.back === 0,
       'a tangent sticker paints its own sheet only: front ' + r.tan.front + ', back ' + r.tan.back);
    ok(r.rimQ.chart === 'rim' && r.rim.front > 500 && r.rim.back > 500,
       'a rim sticker WRAPS onto both sheets: front ' + r.rim.front + ', back ' + r.rim.back);
    ok(r.tan.lit > 1000 && r.tan.tallest > 200,
       'the bump atlas got the sticker lip: ' + r.tan.lit + ' texels, tallest ' + r.tan.tallest);
    ok(r.rim.bled > 0, 'padEdges bled the wrap across the atlas seam: ' + r.rim.bled + ' texels');
    ok(r.well.ok === false && r.well.reason === 'ring',
       'the stick-well keep-out is wired: ' + (r.well.reason || 'ACCEPTED — CTL_STICKER_OPT is not reaching the surface'));
    ok(r.border.n > 2000, 'the die-cut border exists: ' + r.border.n + ' texels own it');
    ok(r.border.meanOnYellow < r.border.shellYellow - 0.25,
       'on a LIGHT shell the border goes dark: mean ' + r.border.meanOnYellow +
       ' against a #FFE500 shell at ' + r.border.shellYellow +
       ' ("' + r.border.id + '" measures 1.01:1 on that yellow)');
    ok(r.border.meanOnBlack > r.border.shellBlack + 0.25,
       'on a DARK shell the same border goes light: mean ' + r.border.meanOnBlack +
       ' against a #18181B shell at ' + r.border.shellBlack);
    ok(r.ear.atlas === 1024, 'the ear atlas is 1024, one 512 quadrant per cap');
    ok(r.ear.badUV === 0 && r.ear.scale > 0,
       'every ear vertex is in its own quadrant or parked (scale ' + r.ear.scale + ')');
    ok(r.ear.quad[0] > 2000 && r.ear.quad[1] === 0 && r.ear.quad[2] === 0 && r.ear.quad[3] === 0,
       'an ear sticker stays in its own quadrant: ' + JSON.stringify(r.ear.quad));
    ok(r.ear.bumpLit > 1000, 'the ear bump atlas got the lip: ' + r.ear.bumpLit + ' texels');
    ok(r.ear.borderN > 500 &&
       r.ear.meanOnYellow < r.ear.meanOnBlack - 0.2,
       'the ear sticker gets the die-cut border too (D8 says every sticker): mean ' +
       r.ear.meanOnYellow + ' on #FFE500 ears vs ' + r.ear.meanOnBlack + ' on #18181B, ' +
       r.ear.borderN + ' texels');
    ok(r.ear.side.ok === false && r.ear.side.reason === 'earSide',
       'a tap on the ear bevel is refused, not painted onto the parked texel');
    ok(r.ear.capped.ok === true && r.ear.capped.capped === true && r.ear.capped.rec.r === 0.26,
       'an oversized ear sticker is capped at CTL_EAR_MAX_R: r=' + r.ear.capped.rec.r);
    ok(r.t8.refusals === 'curve,earSide,edge,off,ring',
       'the refusal set is the prototype\'s, plus the ear side: ' + r.t8.refusals);
    ok(r.t8.armed === 'armed' && r.t8.placed === 1 && r.t8.mode === 'selected',
       'a book tap arms, a place lands one sticker and leaves it selected');
    ok(r.t8.shared === true,
       'ctlDraft, ctlDesign and the live state share one array after a dispatch');
    ok(r.t8.keepOut[0] === false && r.t8.keepOut[1] === 'ring' && r.t8.keepOut[2] === true,
       'a stick well is refused with copy of its own: ' + r.t8.keepOut[1]);
    ok(r.t8.moved[0] === 0.4 && r.t8.moved[1] === 1,
       'relocating overwrites the selected entry instead of pushing a new one');
    ok(Math.abs(r.t8.undone - 1.16) < 1e-9, 'undo puts it back where it was: x=' + r.t8.undone);

    /* ── A REAL POINTER, through the fragile path ────────────────────────
       Everything above drives the dispatcher directly, which proves nothing
       about ctlOnTap ever being called: ctlBindPointer's pointerup decides
       tap-or-drag, and controller-handoff-v3.md § 3.1 flags that as fragile.
       So aim real clicks at body points of known legality by projecting them
       through the live camera, and let Chromium deliver the events. */
    await page.evaluate(() => {
      if (document.getElementById('ctl-sticker-say')) return;
      /* Task 9 builds this element; standing one in now is what makes a
         refusal OBSERVABLE — otherwise a missed click and a refused one look
         identical, both leaving the state alone. Parked off-layout on
         purpose: appended into the flow it lengthens the page the instant it
         says anything, a scrollbar appears, the canvas shifts, and every
         later click lands beside the point that was projected for it. */
      const d = document.createElement('p');
      d.id = 'ctl-sticker-say';
      d.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(d);
    });

    /* Re-measured immediately before each click — the rect and the rig are
       both live, and one projection reused across three clicks is only right
       until something moves. */
    const clickBody = async (bx, by) => {
      const a = await page.evaluate(([x, y]) => {
        const P = ctlStickerSurface.point(x, y, false);
        const v = new THREE.Vector3(P[0], P[1], P[2]);
        ctlBody.updateWorldMatrix(true, false);
        v.applyMatrix4(ctlBody.matrixWorld).project(ctlCamera);
        const b = ctlRenderer.domElement.getBoundingClientRect();
        return { x: b.left + (v.x * 0.5 + 0.5) * b.width,
                 y: b.top + (0.5 - v.y * 0.5) * b.height };
      }, [bx, by]);
      await page.mouse.click(a.x, a.y);
    };

    const armedId = await page.evaluate(() => {
      ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
      ctlDesign.stickers = []; ctlDraft.stickers = [];
      ctlRedrawShell();
      const id = ctlStickerManifest[1].id;
      ctlStickerDispatch({ t: 'bookTap', id: id });
      return id;
    });
    await clickBody(1.16, -0.12);                       // the open front deck
    const afterTap = await page.evaluate(() => ({
      ids: ctlStickerState.stickers.map(s => s.id),
      mode: ctlStickerMode(ctlStickerState),
      say: document.getElementById('ctl-sticker-say').textContent }));
    ok(afterTap.ids.length === 1 && afterTap.ids[0] === armedId,
       'a real click on the canvas places the armed sticker: [' + afterTap.ids + ']');
    ok(afterTap.mode === 'selected' && /Placed on the front/.test(afterTap.say),
       'and it selects it and says so: "' + afterTap.say + '"');

    /* Refusals, delivered by real clicks. Which ones a finger can actually
       reach was measured, not assumed, and it is not the obvious set:
        · 'ring' speaks only at the OUTER rim of a stick well. The analogue
          stick's own mesh — plus ctlTryPress's 6 px fudge — covers the middle,
          and a pointerup that grabbed a stick never calls ctlOnTap at all
          (wasStick). Aiming at the well's centre therefore proves nothing:
          it looks exactly like a refusal, and is asserted separately below.
        · 'off' is unreachable by tap and always will be — there is no
          geometry off the edge of the body for a ray to hit.
        · 'edge' is the one a player meets in normal use, at any tight fold. */
    const clickRefusal = async (bx, by) => {
      await page.evaluate(() => {
        const id = ctlStickerManifest[2].id;
        // bookTap TOGGLES: re-arming the same id would disarm it instead
        if (ctlStickerState.armed !== id) ctlStickerDispatch({ t: 'bookTap', id: id });
        document.getElementById('ctl-sticker-say').textContent = '';
      });
      await clickBody(bx, by);
      return page.evaluate(() => ({ n: ctlStickerState.stickers.length,
        say: document.getElementById('ctl-sticker-say').textContent }));
    };

    const ringHit = await clickRefusal(1.24, -0.542);      // the right well's rim
    ok(ringHit.n === 1 && ringHit.say === CTL_REFUSAL_RING,
       'a real click on a stick well\'s rim is refused in the prototype\'s words: "' +
       ringHit.say + '"');

    const edgeHit = await clickRefusal(-0.68, -0.902);     // too tight a fold to wrap
    ok(edgeHit.n === 1 && /^Too tight an edge to wrap around/.test(edgeHit.say),
       'and a fold too tight to wrap says so: "' + edgeHit.say + '"');

    const stickHit = await clickRefusal(-1.25, 0.20);      // the stick itself
    ok(stickHit.n === 1 && stickHit.say === '',
       'a tap that grabs an analogue stick places nothing and says nothing — ' +
       'the stick swallows it before ctlOnTap, and the well is a keep-out anyway');

    // and with nothing armed, a click on the sticker selects it instead
    await page.evaluate(() => { ctlStickerState = Object.assign({}, ctlStickerState,
                                                 { armed: null, selected: -1 }); });
    await clickBody(1.16, -0.12);
    const afterPick = await page.evaluate(() => ctlStickerState.selected);
    ok(afterPick === 0,
       'tapping a placed sticker with nothing armed selects it: ' + afterPick);


    /* ── The two orderings the Workshop can be in ────────────────────────
       ctlOnTap is assigned on OPEN, but the surface is not built until the
       Stickers tab is first shown. So the handler spends the whole Colours
       tab armed and surface-less, and must be inert there. */
    const parked = await page.evaluate(() => {
      const P = ctlStickerSurface.point(1.16, -0.12, false);
      const v = new THREE.Vector3(P[0], P[1], P[2]);
      ctlBody.updateWorldMatrix(true, false);
      v.applyMatrix4(ctlBody.matrixWorld).project(ctlCamera);
      const b = ctlRenderer.domElement.getBoundingClientRect();
      ctlStickerDispatch({ t: 'bookTap', id: ctlStickerManifest[3].id });
      document.getElementById('ctl-sticker-say').textContent = '';
      const n = ctlStickerState.stickers.length;
      ctlStickerSurface = null;                       // as it is on the Colours tab
      return { n: n, x: b.left + (v.x * 0.5 + 0.5) * b.width,
               y: b.top + (0.5 - v.y * 0.5) * b.height };
    });
    await page.mouse.click(parked.x, parked.y);
    const inert = await page.evaluate(() => ({ n: ctlStickerState.stickers.length,
      say: document.getElementById('ctl-sticker-say').textContent }));
    ok(inert.n === parked.n && inert.say === '',
       'the Colours tab is untouched: armed but surface-less, the tap is inert');

    /* And the other ordering, which is the one that bites. ctlOpenWorkshop
       seeds the editing state from ctlDraft; the surface build is where rule 6
       finally has enough to run, and it REPLACES ctlDraft.stickers with the
       validated array. Left un-re-pointed the two silently disagree, and the
       next dispatch writes the un-validated list back over the top — rule 6
       holding until the first tap and then undoing itself. */
    const reseed = await page.evaluate(() => {
      const ok1 = { id: ctlStickerManifest[0].id, surface: 'shell', x: 1.16, y: -0.12,
                    back: false, rot: 0, size: 0.18, chart: 'tangent' };
      const bad = { id: ctlStickerManifest[1].id, surface: 'shell', x: -1.25, y: 0.20,
                    back: false, rot: 0, size: 0.18, chart: 'tangent' };
      ctlDraft = Object.assign({}, ctlReadDesign(), { stickers: [ok1, bad] });
      ctlDesign = Object.assign({}, ctlDesign, { stickers: [ok1, bad] });
      ctlStickerState = { stickers: ctlDraft.stickers.slice(),   // as ctlOpenWorkshop seeds it
                          armed: null, selected: -1, history: [] };
      ctlEnsureStickerSurface();                                 // as the tab's first open does
      return { same: ctlStickerState.stickers === ctlDraft.stickers,
               ids: ctlStickerState.stickers.map(s => s.id) };
    });
    ok(reseed.same === true && reseed.ids.length === 1,
       'building the surface re-points the live state at the array rule 6 just ' +
       'validated: [' + reseed.ids + ']');

    /* ── The tab itself, at a phone's width ──────────────────────────────
       A second page rather than a resize: the checks above own a 900x1400
       rig and a live camera, and re-laying that out underneath them to ask a
       CSS question would make every earlier projection stale. 390 px is the
       suite's reference width (ui-style.md). */
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    phone.on('pageerror', e => errs.push('390px: ' + String(e)));
    phone.on('console', m => { if (m.type() === 'error') errs.push('390px console: ' + m.text()); });
    await phone.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'networkidle' });
    await phone.waitForFunction(() => typeof ctlEnsureBuilt === 'function' && ctlEnsureBuilt(),
                                null, { timeout: 20000 });
    await phone.evaluate(() => { ctlOpenWorkshop(); });
    await phone.click('#ctl-tabs [data-ctl-tab="stickers"]');
    await phone.waitForFunction(() => ctlStickerManifest && ctlStickerManifest.length,
                                null, { timeout: 20000 });

    const box = await phone.evaluate(() => {
      const R = el => el.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.ctl-sticker-tile')].map(R);
      const pills = [...document.querySelectorAll('#ctl-tabs [data-ctl-tab]')].map(R);
      const sec = document.getElementById('screen-workshop');
      return {
        n: tiles.length,
        minW: Math.round(Math.min(...tiles.map(t => t.width))),
        minH: Math.round(Math.min(...tiles.map(t => t.height))),
        perRow: tiles.filter(t => Math.round(t.top) === Math.round(tiles[0].top)).length,
        pillRows: new Set(pills.map(p => Math.round(p.top))).size,
        secX: sec.scrollWidth > sec.clientWidth,
        docX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    ok(box.minW >= 44 && box.minH >= 44,
       'every book tile clears the 44 px touch minimum: ' + box.n + ' at ' +
       box.minW + 'x' + box.minH + ', ' + box.perRow + ' across');
    ok(box.pillRows === 1, 'the two tab pills sit on one line at 390 px');
    ok(box.secX === false && box.docX === false,
       'nothing scrolls sideways at 390 px: the Workshop section and the document both fit');

    const ctrls = await phone.evaluate(() => {
      ctlStickerDispatch({ t: 'bookTap', id: ctlStickerManifest[0].id });
      const p = ctlStickerSurface.plan(1.16, -0.12, false, ctlStickerWantRadius());
      /* plan() only returns x/y for the rim chart — the same guard ctlStickerTap
         carries, and the one thing that makes this record legal. */
      ctlStickerDispatch({ t: 'place', rec: { id: ctlStickerManifest[0].id, surface: 'shell',
        x: p.x !== undefined ? p.x : 1.16, y: p.y !== undefined ? p.y : -0.12,
        back: false, rot: 0, size: p.size, chart: p.chart } });
      const H = id => Math.round(document.getElementById(id).getBoundingClientRect().height);
      return { mode: ctlStickerMode(ctlStickerState),
               row: getComputedStyle(document.getElementById('ctl-sticker-controls')).display,
               undo: H('btn-ctl-sticker-undo'), del: H('btn-ctl-sticker-delete'),
               done: H('btn-ctl-sticker-done'),
               badges: document.querySelectorAll('.ctl-sticker-tile-placed .ctl-sticker-dot').length };
    });
    ok(ctrls.mode === 'selected' && ctrls.row === 'flex' &&
       ctrls.undo >= 44 && ctrls.del >= 44 && ctrls.done >= 44,
       'a selected placement raises the controls card, all three buttons >= 44 tall: ' +
       ctrls.undo + '/' + ctrls.del + '/' + ctrls.done);
    ok(ctrls.badges === 1, 'and the placed tile is badged in the book: ' + ctrls.badges);

    /* Each body is its OWN overflow-y-auto region. On the shared parent the two
       shared one scrollTop, and hopping to the shorter Colours body clamped the
       book's 436 down to 117 — measured, before this was moved onto the bodies. */
    const trip = await phone.evaluate(() => {
      const cols = document.getElementById('ctl-panel-colours');
      const stk = document.getElementById('ctl-panel-stickers');
      stk.scrollTop = 150;                    // mid-way, so no clamp can confuse this
      const before = Math.round(stk.scrollTop);
      document.querySelector('#ctl-tabs [data-ctl-tab="colours"]').click();
      const coloursTop = Math.round(cols.scrollTop);
      document.querySelector('#ctl-tabs [data-ctl-tab="stickers"]').click();
      return { before: before, after: Math.round(stk.scrollTop), coloursTop: coloursTop,
               parent: getComputedStyle(document.getElementById('ctl-panel')).overflowY,
               body: getComputedStyle(stk).overflowY };
    });
    ok(trip.body === 'auto' && trip.parent !== 'auto' &&
       trip.before === 150 && trip.after === 150 && trip.coloursTop === 0,
       'the two bodies are independent scroll regions: the book keeps ' + trip.after +
       ' across a hop to Colours, which sits at ' + trip.coloursTop);

    /* Spec § 7: "Undo appears whenever ctlStickerHistory has an entry to pop" —
       no state qualifier. The card therefore outlives the selection. */
    const idle = await phone.evaluate(() => {
      const D = id => getComputedStyle(document.getElementById(id)).display;
      return { mode: ctlStickerMode(ctlStickerState), history: ctlStickerState.history.length,
               row: D('ctl-sticker-controls'), undo: D('btn-ctl-sticker-undo'),
               del: D('btn-ctl-sticker-delete'), done: D('btn-ctl-sticker-done'),
               sliders: D('ctl-sticker-sliders') };
    });
    ok(idle.mode === 'idle' && idle.history === 1 && idle.row !== 'none' &&
       idle.undo !== 'none' && idle.del === 'none' && idle.done === 'none' &&
       idle.sliders === 'none',
       'back in Idle the card keeps Undo alone — spec § 7 puts no state on it, and ' +
       'Done is one tap from the placement you might want back');

    /* Leave the Workshop and go straight back in. ctlMountLobby defers its real
       work through requestIdleCallback(start, { timeout: 1200 }) and
       ctlCloseWorkshop() schedules one on its way out, so the stale callback can
       land on top of the reopened Workshop — pulling the canvas back to the lobby
       mount and leaving a 0x0 stage that reopens the Workshop on every tap. This
       is what made the real-click checks above fail intermittently: they were
       clicking a canvas that had been moved out from under them. */
    const reopened = await phone.evaluate(() => {
      ctlCloseWorkshop();
      ctlOpenWorkshop();
      return true;
    });
    await phone.waitForTimeout(1600);          // past the idle callback's own timeout
    const kept = await phone.evaluate(() => {
      const r = ctlRenderer.domElement.getBoundingClientRect();
      return { parent: ctlRenderer.domElement.parentElement.id, press: ctlPressEnabled,
               w: Math.round(r.width), h: Math.round(r.height) };
    });
    ok(reopened && kept.parent === 'ctl-stage' && kept.press === true &&
       kept.w > 0 && kept.h > 0,
       'reopening the Workshop at once survives a stale deferred lobby mount: ' +
       'the rig is in ' + kept.parent + ' at ' + kept.w + 'x' + kept.h);
    await phone.close();

    ok(errs.length === 0, 'no page errors: ' + (errs.join(' | ') || 'none'));

    if (SHOT) {
      const url = await page.evaluate(() => {
        ctlRenderer.setSize(760, 760, false);
        ctlCamera.aspect = 1; ctlCamera.updateProjectionMatrix();
        ctlRig.rotation.set(0, 0, 0);
        ctlRenderer.render(ctlScene, ctlCamera);
        return ctlRenderer.domElement.toDataURL('image/png');
      });
      fs.writeFileSync(SHOT, Buffer.from(url.split(',')[1], 'base64'));
      console.log('  ---- wrote ' + SHOT);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
