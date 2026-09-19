// visual-shell.js — real headless Chromium over wip/lobby-lab/shell.html: the
// tier neither pure harness reaches. Serves the repo root, as visual-prm.js
// does. Run from the repo root:
//   NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js
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
  const base = `http://127.0.0.1:${port}/wip/lobby-lab/shell.html`;
  const settle = (page) => page.waitForFunction(() => window.shellReady === true, null, { timeout: 30000 });
  /* offsetParent is unusable here: it is spec'd to return null for any
     position:fixed element (#shell-dock), regardless of visibility — a real,
     on-screen 262x34 dock reads as "not shown" under that check. A non-empty
     bounding box is the visible thing whatever the positioning scheme. */
  const shown = (page, id) => page.evaluate(i => { const el = document.getElementById(i); if (!el || el.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, id);

  // ── the four views ────────────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}?seed=7`); await settle(page);
  await page.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });

  ok(await shown(page, 'shell-premium'), 'the shell opens on Premium');
  ok(!(await shown(page, 'shell-tv')), 'the TV pane is hidden on Premium');
  ok(!(await shown(page, 'shell-phone')), 'the phone pane is hidden on Premium');
  ok(!(await shown(page, 'shell-dock')), 'the dock is hidden on Premium (W6)');
  await page.screenshot({ path: path.join(SHOTS, 'shell-premium-1280.png') });

  // W6 — the telly's channel dial summons the dock without leaving the room
  await page.evaluate(() => window.prmApi.activate('tv-channel'));
  await page.waitForFunction(() => window.shellState().switcher === true, null, { timeout: 15000 });
  ok(await shown(page, 'shell-dock'), 'the channel dial summons the dock');
  ok(await shown(page, 'shell-premium'), 'and summoning it does not leave the room');

  for (const [view, pane] of [['tv', 'shell-tv'], ['shelves', 'shell-phone'], ['original', 'shell-phone'], ['premium', 'shell-premium']]) {
    await page.evaluate(v => window.shellDispatch({ t: 'go', view: v }), view);
    await page.waitForFunction(v => window.shellState().view === v, view, { timeout: 15000 });
    ok(await shown(page, pane), `the ${view} view mounts ${pane}`);
    const others = ['shell-premium', 'shell-tv', 'shell-phone'].filter(p => p !== pane);
    for (const o of others) ok(!(await shown(page, o)), `the ${view} view hides ${o}`);
    if (view !== 'premium') await page.screenshot({ path: path.join(SHOTS, `shell-${view}-1280.png`) });
  }

  // The real layouts actually rendered, not just empty boxes.
  await page.evaluate(() => window.shellDispatch({ t: 'go', view: 'tv' }));
  await page.waitForFunction(() => document.querySelector('#tv-app .lb-tv-full') !== null, null, { timeout: 15000 });
  ok(true, 'the TV view mounts the real Lounge renderer');
  await page.evaluate(() => window.shellDispatch({ t: 'go', view: 'shelves' }));
  await page.waitForFunction(() => document.querySelector('#shelves-canvas .lb-phone') !== null, null, { timeout: 15000 });
  ok(true, 'the shelves view mounts the real phone renderer');

  // The dock and the phone's own switcher are one path — both go through lbSet.
  await page.evaluate(() => { document.querySelectorAll('#shell-dock .lb-seg')[2].click(); });
  await page.waitForFunction(() => window.shellState().view === 'tv', null, { timeout: 15000 });
  ok(true, "the dock's TV button routes through the router");

  ok(errors.length === 0, `no uncaught page errors (${errors.slice(0, 2).join(' | ') || 'none'})`);
  await page.close();

  // ── the honest card below the floor ───────────────────────────────────────
  const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await small.goto(base); await settle(small);
  ok(await small.evaluate(() => document.getElementById('prm-card').classList.contains('on')), 'below the floor, the lounge shows the honest card');
  ok(await small.evaluate(() => window.prmApi === null), 'and no WebGL room is built at all');
  ok(await shown(small, 'shell-dock'), 'the dock is forced visible below the floor, so the other three are reachable');
  ok(await small.evaluate(() => document.querySelector('#shell-dock [data-shell-view="premium"]').hidden === true), 'and Premium is not offered');
  await small.screenshot({ path: path.join(SHOTS, 'shell-gate-390.png') });
  await small.close();

  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
