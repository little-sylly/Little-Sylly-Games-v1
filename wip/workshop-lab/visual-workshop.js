/* visual-workshop.js — SANDBOX screenshots of the Workshop phone lab.

       node wip/workshop-lab/visual-workshop.js [design]   → wip/workshop-lab/shots/*.png

   Per design, per size: the Paint side; the Stickers side; a sticker IN HAND
   (the moment the controller must stay visible); and the controller with two
   stickers placed through the real tap path. Also asserts the two things the
   brief makes load-bearing, so a design that breaks them reads as a failure:
     · the sticker surface is NOT built on open;
     · with a sticker in hand the stage is on screen and at least 180 px tall.
   Serves the repo on a free port (Playwright is not a project dependency —
   absent, exit 0). ANGLE-over-swiftshader, as tools/visual-lobby.js explains. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'shots');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) { try { return require(c); } catch (_) {} }
  return null;
}
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
    if (p.endsWith(path.sep)) p = path.join(p, 'index.html');
    fs.readFile(p, (err, buf) => { if (err) { rsp.writeHead(404); rsp.end(); return; } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); rsp.end(buf); });
  });
  srv.listen(0, '127.0.0.1', () => res(srv));
});

const DEMO = { shell: '#8ECAE6', plate: '#F9A8D4', ears: '#F9A8D4', buttons: '#3A3D52' };
// The owner's phone is an iPhone SE (2nd gen): 375 × 667, ~548 visible inside a
// browser's toolbars, and 320 × ~452 visible with iOS Display Zoom on — the
// width the owner's own screenshots came from. Always test the SE.
const SIZES = [[390, 844, '390'], [375, 667, 'se'], [375, 548, 'se-browser'], [320, 452, 'se-zoom'], [360, 640, '360s'], [844, 390, 'side']];
const DESIGNS = ['standin', 'pocket', 'drawer', 'belt'];

(async () => {
  const pw = loadPlaywright(); if (!pw) { console.log('Playwright not found — skipped.'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}/wip/workshop-lab/room.html`;
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const errs = [], fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); };

  for (const [vw, vh, tag] of SIZES) {
    for (const d of DESIGNS) {
      if (only && only !== d) continue;
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: vw < 500, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
      const page = await ctx.newPage();
      const id = `${d}/${tag}`;
      page.on('pageerror', e => errs.push(`${id}: ${e}`));
      page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(`${id} console: ${m.text()}`); });
      await page.goto(base + '?phone=' + d);
      await page.waitForFunction(() => window.wlReady, null, { timeout: 20000 });
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      await page.evaluate(x => wlDebug.paint(x), DEMO);
      await page.waitForSelector('#ctl-sticker-book .ctl-sticker-tile', { state: 'attached', timeout: 15000 });
      check(!(await page.evaluate(() => !!ctlStickerSurface)), `${id}: sticker surface built on open`);
      const shot = async n => page.screenshot({ path: path.join(OUT, `${d}-${tag}-${n}.png`) });

      // Paint (the drawer opens its sheet to Paint first).
      if (d === 'drawer' && tag !== 'side') await page.click('.wp-grab');
      await page.waitForTimeout(700);
      await shot('1-paint');

      // Stickers side.
      if (d === 'pocket' || d === 'drawer') await page.click('.wp-seg [data-tab="stickers"]');
      if (d === 'standin') await page.evaluate(() => document.querySelector('#ctl-sticker-book').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await shot('2-stickers');

      // A sticker in hand. The stand-in's pinned stage can cover the sheet (sideways
      // it covers nearly all of it — a finding, not a harness bug), so its tile is
      // tapped through the DOM; every phone design must take a real click.
      const pickTile = n => d === 'standin'
        ? page.evaluate(n => document.querySelectorAll('#ctl-sticker-book .ctl-sticker-tile')[n].click(), n)
        : page.click('#ctl-sticker-book .ctl-sticker-tile >> nth=' + n);
      await pickTile(3);
      await page.waitForFunction(() => ctlStickerMode(ctlStickerState) === 'armed', null, { timeout: 15000 });
      await page.waitForTimeout(500);
      const stage = await page.evaluate(() => {
        const r = document.getElementById('ctl-stage').getBoundingClientRect();
        const top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight);
        return { visible: Math.round(bot - top), h: Math.round(r.height) };
      });
      const want = vh < 500 ? 120 : 180;   // 452 visible cannot give 180 and still hold the tools
      check(stage.visible >= want, `${id}: stage ${stage.visible}px on screen with a sticker in hand (want ≥ ${want})`);
      // Nothing in the tools may sit under the footer / off the bottom of the room.
      const clash = await page.evaluate(() => {
        const f = document.querySelector('.wp-foot'), s = document.querySelector('.wks-stickers');
        if (!f || !s) return 0;
        return Math.max(0, Math.round(s.getBoundingClientRect().bottom - f.getBoundingClientRect().top));
      });
      check(clash === 0, `${id}: the stickers run ${clash}px under the footer`);
      await shot('3-in-hand');

      // Put two on, through the real tap path — aimed at points ON the model.
      const aim = (fx, fy) => page.evaluate(([fx, fy]) => {
        const U = ctlGeo.userData, r = document.getElementById('ctl-stage').getBoundingClientRect();
        ctlBody.updateMatrixWorld(true);
        const v = new THREE.Vector3(U.minx + (U.maxx - U.minx) * fx, U.miny + (U.maxy - U.miny) * fy, 0)
          .applyMatrix4(ctlBody.matrixWorld).project(ctlCamera);
        return { x: r.x + (v.x + 1) / 2 * r.width, y: r.y + (1 - v.y) / 2 * r.height };
      }, [fx, fy]);
      let p = await aim(0.17, 0.16);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(300);
      await page.click('#btn-ctl-sticker-done');
      await pickTile(7);
      p = await aim(0.60, 0.80);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(700);
      await shot('4-placed');
      const res = await page.evaluate(() => ctlStickerState.stickers.length + ' placed · ' + ctlStickerMode(ctlStickerState));
      check(res.startsWith('2 placed'), `${id}: expected 2 placed, got ${res}`);
      console.log('shot', id.padEnd(14), `stage ${stage.visible}/${stage.h}px in hand ·`, res);
      await ctx.close();
    }
  }
  await browser.close(); srv.close();
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'all checks passed');
})();
