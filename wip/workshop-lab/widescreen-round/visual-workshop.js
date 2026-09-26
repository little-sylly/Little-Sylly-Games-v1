/* visual-workshop.js — SANDBOX screenshots of the Workshop lab, every design.

       node wip/workshop-lab/visual-workshop.js [design]   → wip/workshop-lab/shots/*.png

   Two shots per design at 1440×860 and one at 1280×720: the Paint side, then the
   Stickers side with a sticker actually placed through the real tap path.
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

(async () => {
  const pw = loadPlaywright(); if (!pw) { console.log('Playwright not found — skipped.'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}/wip/workshop-lab/index.html`;
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const errs = [];
  for (const [vw, vh, tag] of [[1440, 860, 'wide'], [1280, 720, 'laptop']]) {
    for (const d of ['bench', 'shop', 'mat']) {
      if (only && only !== d) continue;
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
      const page = await ctx.newPage();
      page.on('pageerror', e => errs.push(`${tag}/${d}: ${e}`));
      page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(`${tag}/${d} console: ${m.text()}`); });
      await page.goto(base + '#' + d);
      await page.waitForFunction(() => window.wlReady, null, { timeout: 20000 });
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      await page.evaluate(x => wlDebug.paint(x), DEMO);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${d}-paint-${tag}.png`) });

      // Stickers: open the side (a no-op in B), wait for the sheet, arm one, tap the model's left grip.
      if (d !== 'shop') await page.evaluate(() => wlDebug.tab('stickers'));
      await page.waitForSelector('#ctl-sticker-book .wl-st', { timeout: 15000 });
      await page.waitForFunction(() => typeof ctlStickerSurface !== 'undefined' && ctlStickerSurface, null, { timeout: 15000 });
      // Aim at points ON THE MODEL (fractions of the body's own bounds, projected
      // through the real camera) — where the model sits differs per design.
      const aim = (fx, fy) => page.evaluate(([fx, fy]) => {
        const U = ctlGeo.userData, r = document.getElementById('ctl-stage').getBoundingClientRect();
        ctlBody.updateMatrixWorld(true);
        const v = new THREE.Vector3(U.minx + (U.maxx - U.minx) * fx, U.miny + (U.maxy - U.miny) * fy, 0)
          .applyMatrix4(ctlBody.matrixWorld).project(ctlCamera);
        return { x: r.x + (v.x + 1) / 2 * r.width, y: r.y + (1 - v.y) / 2 * r.height };
      }, [fx, fy]);
      const taps = [[0.17, 0.16, 3], [0.60, 0.80, 7]];
      for (const [fx, fy, n] of taps) {
        await page.click(`#ctl-sticker-book .wl-st >> nth=${n}`);
        const p = await aim(fx, fy);
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(300);
        if (n === 3) await page.evaluate(() => document.getElementById('btn-ctl-sticker-done').click());
      }
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, `${d}-stickers-${tag}.png`) });
      console.log('shot', d, tag, await page.evaluate(() => ctlStickerState.stickers.length + ' placed · ' + ctlStickerMode(ctlStickerState)));
      await ctx.close();
    }
  }
  await browser.close(); srv.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
})();
