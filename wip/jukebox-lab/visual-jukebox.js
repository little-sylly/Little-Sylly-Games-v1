/* visual-jukebox.js — SANDBOX screenshots of the Jukebox room, every design, wide + phone.

       node wip/jukebox-lab/visual-jukebox.js        → wip/jukebox-lab/shots/*.png

   Serves the repo on a free port (Playwright is not a project dependency — absent, exit 0).
   ANGLE-over-swiftshader, as tools/visual-lobby.js explains: plain swiftshader draws nothing. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'shots');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) { try { return require(c); } catch (_) {} }
  return null;
}
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
    fs.readFile(p, (err, buf) => { if (err) { rsp.writeHead(404); rsp.end(); return; } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); rsp.end(buf); });
  });
  srv.listen(0, '127.0.0.1', () => res(srv));
});

(async () => {
  const pw = loadPlaywright(); if (!pw) { console.log('Playwright not found — skipped.'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/wip/jukebox-lab/index.html`;
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const errs = [];
  const only = process.argv[2];
  for (const [vw, vh, tag] of [[1440, 860, 'wide'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(tag + ': ' + e));
    page.on('console', m => { if (m.type() === 'error') errs.push(tag + ' console: ' + m.text()); });
    await page.goto(url + '#crate');
    await page.waitForFunction(() => window.jbxDebug);
    await page.waitForTimeout(1500);
    // software GL makes every frame slow, so CSS fades stall mid-way and shots show in-between colours
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    for (const d of ['crate', 'setlist']) {
      if (only && only !== d) continue;
      await page.evaluate(d => { jbxDebug.setDesign(d); jbxDebug.show('quiet-hunting', true, 0.38); }, d);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, `${d}-${tag}.png`), fullPage: tag === 'phone' });
      console.log('shot', d, tag);
    }
    if (only === 'album') {
      await page.evaluate(() => { jbxDebug.setDesign('shelf'); });
      await page.click('.dC-tile >> nth=17');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `shelf-album-${tag}.png`), fullPage: tag === 'phone' });
      console.log('shot shelf-album', tag);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
})();
