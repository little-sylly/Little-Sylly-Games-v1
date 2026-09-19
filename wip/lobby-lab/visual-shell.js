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

  // ── ?live: the real Workshop, and the design round-trip ───────────────────
  {
    const lp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const liveErrors = []; lp.on('pageerror', e => liveErrors.push(String(e)));
    await lp.goto(`${base}?live&seed=7`);
    await lp.waitForFunction(() => window.shellReady === true && window.shellLive === true, null, { timeout: 40000 });
    await lp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });

    ok(await lp.evaluate(() => typeof window.ctlOpenWorkshop === 'function'), 'the shipped controller.js loaded');
    ok(await lp.evaluate(() => typeof window.openSoundOverlay === 'function'), 'the shipped engine.js loaded');
    ok(await lp.evaluate(() => document.getElementById('screen-workshop') !== null), '_shell.html supplied screen-workshop');
    ok(await lp.evaluate(() => document.getElementById('sound-overlay') !== null), '_sound.html supplied the sound overlay');
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true), 'and all of it starts out of the way');
    ok(liveErrors.length === 0, `no uncaught page errors while loading the shipped engine (${liveErrors.slice(0, 2).join(' | ') || 'none'})`);

    // Three.js is shared — the Workshop costs no extra library bytes on top of
    // the room. Worth banking for the production round's install maths.
    ok(await lp.evaluate(() => document.querySelectorAll('script[src*="three.min.js"]').length === 1),
       'one vendored Three serves both the room and the Workshop');

    // The controller prop opens the real Workshop.
    await lp.evaluate(() => window.prmApi.activate('controller'));
    await lp.waitForFunction(() => document.getElementById('screen-workshop').style.display === 'flex', null, { timeout: 20000 });
    ok(true, 'the controller prop opens the real screen-workshop');
    ok(await lp.evaluate(() => window.shellState().workshop === true), 'and the router knows it');
    ok(await lp.evaluate(() => window.prmDebug.isRunning() === false), 'the room stopped while the Workshop is up (W5)');
    await lp.screenshot({ path: path.join(SHOTS, 'shell-live-workshop-1280.png') });

    // Save a changed shell colour and come back.
    /* ctlDraft is `let`-declared at controller.js's top level, so (like the
       mp* variables logic-engine.md documents) it is a global LEXICAL binding,
       never a window property — window.ctlDraft is undefined even though
       controller.js is fully loaded. Accessed bare, it resolves fine: the
       function passed to evaluate() runs directly in the page's realm. */
    await lp.evaluate(() => { ctlDraft.shell = '#10B981'; window.ctlApplyDesign(ctlDraft); });
    await lp.click('#btn-ctl-save');
    await lp.waitForFunction(() => window.shellState().workshop === false, null, { timeout: 20000 });

    ok(await lp.evaluate(() => window.shellState().view === 'premium'),
       'saving returns to the lounge, NOT to screen-lobby (spec § 1.1.1)');
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true), 'and the shipped screens go back out of the way');
    ok(await lp.evaluate(() => window.shellState().design.shell === '#10B981'), 'the saved design reached the router');
    ok(await lp.evaluate(() => JSON.parse(localStorage.getItem('sylly_controller')).shell === '#10B981'), 'and sylly_controller holds it');

    // The room repainted — the half no pure harness can reach.
    await lp.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });
    ok(true, 'the room restarted on the way back');
    const repainted = await lp.evaluate(() => {
      let hit = false;
      window.prmApi.built.controller.traverse(o => {
        if (o.isMesh && o.material && o.material.userData.prmRole === 'shell' && o.material.color.getHexString() === '10b981') hit = true;
      });
      return hit;
    });
    ok(repainted, "the controller prop's shell repainted in the saved colour — the round-trip, closed");
    await lp.screenshot({ path: path.join(SHOTS, 'shell-live-return-1280.png') });

    // The ✕ path: discards, and still lands on the lounge.
    await lp.evaluate(() => window.prmApi.activate('controller'));
    await lp.waitForFunction(() => window.shellState().workshop === true, null, { timeout: 20000 });
    await lp.evaluate(() => { ctlDraft.shell = '#FFE500'; window.ctlApplyDesign(ctlDraft); });
    await lp.click('#btn-ctl-exit');
    await lp.waitForFunction(() => window.shellState().workshop === false, null, { timeout: 20000 });
    ok(await lp.evaluate(() => window.shellState().view === 'premium'), 'the exit path lands on the lounge too');
    ok(await lp.evaluate(() => window.shellState().design.shell === '#10B981'), 'and the unsaved edit is discarded — one wrapper covers both exits');

    // The telly's volume dial reaches the real overlay.
    await lp.evaluate(() => window.prmApi.activate('tv-volume'));
    await lp.waitForFunction(() => document.getElementById('sound-overlay').style.display === 'flex', null, { timeout: 20000 });
    ok(true, "the telly's volume dial opens the real sound overlay");
    await lp.click('#btn-sound-overlay-done');
    await lp.waitForFunction(() => document.getElementById('live-screens').hidden === true, null, { timeout: 20000 });
    ok(true, 'and closing it puts the shipped screens away again');

    // W4 — the jukebox knob is NOT the sound overlay, even with the engine loaded.
    await lp.evaluate(() => window.prmApi.activate('jukebox-knob'));
    await lp.waitForTimeout(400);
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true),
       'the jukebox knob opens nothing — a dormant door, not the sound overlay (W4)');

    await lp.close();
  }

  // ── W5: the room is kept, stopped, and disposed exactly once ──────────────
  {
    const lc = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await lc.goto(`${base}?seed=7`); await settle(lc);
    await lc.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
    await lc.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });

    await lc.evaluate(() => window.shellDispatch({ t: 'go', view: 'shelves' }));
    await lc.waitForFunction(() => window.shellState().room === 'idle', null, { timeout: 15000 });
    ok(await lc.evaluate(() => document.getElementById('prm-canvas') !== null), 'leaving Premium leaves the canvas in the DOM (W5)');
    ok(await lc.evaluate(() => window.prmApi !== null), 'and the scene is kept, not disposed');
    await lc.waitForFunction(() => window.prmDebug.isRunning() === false, null, { timeout: 20000 });
    ok(true, 'and the RAF is stopped — a hidden room costs nothing');

    // The attract interval must not wake it back up. It ticks every 100 ms.
    const f0 = await lc.evaluate(() => window.prmDebug.frames());
    await lc.waitForTimeout(1200);
    const f1 = await lc.evaluate(() => window.prmDebug.frames());
    ok(f1 === f0, `a stopped room renders no frames at all (advanced ${f1 - f0} over 1.2 s, want 0)`);

    await lc.evaluate(() => window.shellDispatch({ t: 'go', view: 'premium' }));
    await lc.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });
    ok(true, 'returning to Premium restarts the same scene');
    /* isRunning() flips true the instant resume()'s resize() schedules the
       RAF — synchronously, before that frame() callback has actually run and
       incremented the counter. Poll for the real effect rather than racing it. */
    await lc.waitForFunction(n => window.prmDebug.frames() > n, f1, { timeout: 5000 });
    ok(true, 'and it renders again');

    // A round trip through every view never rebuilds it.
    const built0 = await lc.evaluate(() => window.prmDebug.nodes().length);
    for (const v of ['tv', 'shelves', 'original', 'premium']) {
      await lc.evaluate(x => window.shellDispatch({ t: 'go', view: x }), v);
      await lc.waitForFunction(x => window.shellState().view === x, v, { timeout: 15000 });
    }
    ok(await lc.evaluate(() => window.prmDebug.nodes().length) === built0, 'four view switches later it is still the same scene');
    await lc.close();
  }

  // ── reduced motion: the room is still honest inside the shell ─────────────
  {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(`${base}?seed=7`); await settle(rp);
    await rp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
    await rp.waitForTimeout(1500);

    const m0 = await rp.evaluate(() => window.prmDebug.cameraMatrix());
    await rp.mouse.move(400, 300); await rp.mouse.move(900, 500); await rp.waitForTimeout(1200);
    const m1 = await rp.evaluate(() => window.prmDebug.cameraMatrix());
    ok(JSON.stringify(m0) === JSON.stringify(m1), 'reduced motion: the camera never moves inside the shell either');
    ok(await rp.evaluate(() => window.prmDebug.isRunning() === false), 'reduced motion: the loop settles idle');

    // The doors still work, they just do not travel.
    await rp.evaluate(() => window.prmApi.activate('phone'));
    await rp.waitForFunction(() => window.shellState().view === 'shelves', null, { timeout: 20000 });
    ok(true, 'reduced motion: the clamshell phone still reaches the Shelves');
    await rp.screenshot({ path: path.join(SHOTS, 'shell-reduced-1280.png') });
    await rp.close(); await rctx.close();
  }

  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
