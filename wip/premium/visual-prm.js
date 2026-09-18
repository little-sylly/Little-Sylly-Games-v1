// visual-prm.js — real headless Chromium over wip/premium/index.html: the two
// composition screenshots the owner reviews, plus the two contract checks no
// Node harness can make — under prefers-reduced-motion the camera never moves
// and the RAF goes idle. Run from the repo root:
//   NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(__dirname, 'shots');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}
function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) { try { return require(c); } catch (_) {} }
  throw new Error('Playwright not found — see .claude/skills/visual-check/SKILL.md § 2');
}
(async () => {
  const pw = loadPlaywright(); const { server, port } = await serve();
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const url = `http://127.0.0.1:${port}/wip/premium/index.html?seed=7`;
  const settle = async (page) => { await page.waitForFunction(() => window.prmReady === true, null, { timeout: 20000 }); await page.waitForTimeout(1500); };

  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url); await settle(page);
    await page.screenshot({ path: path.join(SHOTS, `wide-${w}.png`) });
    ok(true, `screenshot wide-${w}.png`);
    if (w === 1280) {
      const f0 = await page.evaluate(() => window.prmDebug.frames()); await page.waitForTimeout(600);
      const f1 = await page.evaluate(() => window.prmDebug.frames());
      ok(f1 > f0, 'normal motion: the loop keeps rendering while the idle rotations run');
      // spec 2026-09-19 § 7 items 6 and 8 — the light rig and the mood, measured
      const lights = await page.evaluate(() => window.prmDebug.lights());
      const casters = lights.filter(l => l.castShadow);
      ok(casters.length === 1, `exactly one shadow-casting light (${casters.map(l => l.name).join(',') || 'none'})`);
      ok(casters[0] && casters[0].position[0] < -1.6, 'the caster sits outside the left wall (the window is the light)');
      ok(!lights.some(l => l.name === 'bulb'), 'no floor-lamp bulb light remains');
      const grid = await page.evaluate(() => window.prmDebug.lumaGrid(8, 5));
      const mean = grid.reduce((a, b) => a + b, 0) / grid.length, lo = Math.min(...grid), hi = Math.max(...grid);
      ok(mean > 60 && mean < 150, `frame is darker, not dark (mean luma ${mean.toFixed(0)}, want 60–150)`);
      ok(hi / Math.max(lo, 1) >= 2.2, `there is a lit wall and a dark corner (patch range ${lo.toFixed(0)}–${hi.toFixed(0)})`);
      await page.evaluate(() => window.prmApi.setPreset('portrait')); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, `portrait-preset-${w}.png`) });
    }
    await page.close();
  }
  // reduced motion: camera frozen, RAF idle
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await page.goto(url); await settle(page);
  await page.mouse.move(400, 300); await page.waitForTimeout(300);
  const m0 = await page.evaluate(() => window.prmDebug.cameraMatrix()); const f0 = await page.evaluate(() => window.prmDebug.frames());
  await page.mouse.move(900, 500); await page.waitForTimeout(2000);
  const m1 = await page.evaluate(() => window.prmDebug.cameraMatrix()); const f1 = await page.evaluate(() => window.prmDebug.frames());
  ok(JSON.stringify(m0) === JSON.stringify(m1), 'reduced motion: the camera matrix never changes (no parallax, no drift)');
  ok(f1 - f0 <= 2, `reduced motion: the RAF is idle (frames advanced ${f1 - f0}, allow ≤2 for the pointer-move repaint)`);
  const running = await page.evaluate(() => window.prmDebug.isRunning());
  ok(!running, 'reduced motion: no RAF scheduled once settled');
  await page.screenshot({ path: path.join(SHOTS, 'reduced-1280.png') });
  // the honest card below the floor
  const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await small.goto(url); await small.waitForFunction(() => window.prmReady === true);
  ok(await small.evaluate(() => document.getElementById('prm-card').classList.contains('on')), 'portrait phone shows the honest card');
  // keyboard: Tab into the canvas, arrows walk the order, Enter activates the dial (spin), Escape clears
  const kb = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await kb.goto(url); await settle(kb);
  await kb.focus('#prm-canvas'); await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('ArrowRight'); await kb.waitForTimeout(100);
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'block'), 'keyboard: focus ring is drawn');
  await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('Enter');
  /* Poll rather than sleep a fixed span: the spin is 1800 ms + a 250 ms beat +
     a 600 ms push-in, and every one of those advances only when the render loop
     ticks — which under SwiftShader is ~3.5 fps, so a fixed 2.6 s wait checks
     too early on this machine and would still be a lie on a fast one. */
  const handedOff = await kb.waitForFunction(() => /TV mode would open on /.test(document.getElementById('prm-status').textContent), null, { timeout: 12000 }).then(() => true, () => false);
  ok(handedOff, 'keyboard: Enter on the dial spins and hands a game to TV mode');
  await kb.evaluate(() => window.prmApi.resetView()); await kb.keyboard.press('Escape');
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'none'), 'keyboard: Escape clears the ring');
  await kb.close();
  // reduced motion: a dial spin resolves instantly and the camera cuts (no tween)
  const rmp = await ctx.newPage(); await rmp.goto(url); await settle(rmp);
  const before = await rmp.evaluate(() => window.prmDebug.cameraMatrix());
  await rmp.evaluate(() => window.prmApi.activate('dial')); await rmp.waitForTimeout(150);
  const mid = await rmp.evaluate(() => window.prmDebug.cameraMatrix());
  ok(JSON.stringify(before) === JSON.stringify(mid), 'reduced motion: no camera tween in the first 150 ms of a spin');
  await rmp.waitForTimeout(1200);
  ok(await rmp.evaluate(() => /TV mode would open on /.test(document.getElementById('prm-status').textContent)), 'reduced motion: the dial still hands a game to TV mode');
  await rmp.close();
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
