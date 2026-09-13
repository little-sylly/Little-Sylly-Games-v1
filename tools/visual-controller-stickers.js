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

  return { before, after: A, canvas: ctlCanvas.width, bumpCanvas: ctlBumpCanvas.width, ear,
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
