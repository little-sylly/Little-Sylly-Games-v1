/* smoke-arcade.js — drive every Arcade cabinet in real headless Chromium, over the
   REAL index.html, through the REAL path (room → arcLaunch → cabinet → ✕ → room).

       node tools/smoke-arcade.js            # every cabinet in ARC_CABINETS
       node tools/smoke-arcade.js coldshot   # just one (by id)

   The half verify-arcade.js cannot see: that a cabinet actually LAUNCHES, takes a
   tap and a drag without throwing, and that its ✕ hands the screen back to the room
   with nothing left painting. It iterates ARC_CABINETS, so a new cabinet is covered
   the moment it is registered — nothing to add here.

   Always launch through the room. Calling cab.start() directly skips the lobby
   router's `arcade` state, and the router's next dispatch repaints the lobby
   underneath the cabinet (found 20 Oct 2026 — looked like a cabinet bug, wasn't).

   Does NOT judge feel, balance or layout beyond "the canvas has a size": that is the
   phone play-test. Needs Playwright, deliberately NOT a project dependency — absent,
   it says so and exits 0 (same contract as tools/visual-lobby.js). */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) {
    try { return require(c); } catch (_) {}
  }
  return null;
}
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (err, buf) => {
        if (err) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); rsp.end(buf);
      });
    });
    srv.listen(0, () => res(srv));
  });
}

// Which screens (sections) are on screen right now.
const shown = pg => pg.evaluate(() => [...document.querySelectorAll('section[id^=screen-]')]
  .filter(e => e.style.display !== 'none' && e.style.display !== '').map(e => e.id));

(async () => {
  const pw = loadPlaywright();
  if (!pw) { console.log('Playwright not installed — smoke-arcade skipped (not a project dependency).'); return; }
  const only = process.argv[2];
  const srv = await serve();
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await pg.waitForTimeout(1500);

  const cabs = await pg.evaluate(() => ARC_CABINETS.map(c => ({ id: c.id, label: c.label, screen: c.screen })));
  console.log(`\n══ Arcade smoke — ${cabs.length} cabinet(s), real path, 375×667 ══`);

  for (const cab of cabs.filter(c => !only || c.id === only)) {
    console.log(`\n── ${cab.id}  (${cab.label})`);
    const errsBefore = errs.length;
    const px = await pg.evaluate(id => {
      const c = ARC_CABINETS.find(x => x.id === id);
      const cv = document.getElementById(c.screen).querySelector('canvas');
      return cv ? cv.id.replace(/-canvas$/, '') : null;
    }, cab.id);
    ok(!!px, 'screen has a <prefix>-canvas');
    if (!px) continue;

    // Twice: the second entry proves re-entry after ✕ works (stale state, double loops).
    for (const lap of [1, 2]) {
      await pg.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' }));
      await pg.waitForTimeout(400);
      ok((await shown(pg)).includes('screen-arcade'), `lap ${lap}: the room opens`);

      await pg.evaluate(id => arcLaunch(id), cab.id);
      await pg.waitForTimeout(700);                       // the launch beat is ~260 ms
      const up = await shown(pg);
      ok(up.length === 1 && up[0] === cab.screen, `lap ${lap}: only ${cab.screen} is on screen (got ${up.join(',') || 'none'})`);

      const box = await pg.locator(`#${px}-canvas`).boundingBox();
      ok(!!box && box.width > 100 && box.height > 200, `lap ${lap}: canvas is sized (${box ? Math.round(box.width) + '×' + Math.round(box.height) : 'none'})`);
      if (!box) break;

      // A tap where a PLAY button usually sits, a tap mid-stage, then a sideways drag.
      for (const fy of [0.68, 0.5]) { await pg.mouse.click(box.x + box.width / 2, box.y + box.height * fy); await pg.waitForTimeout(500); }
      await pg.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
      await pg.mouse.down();
      await pg.mouse.move(box.x + box.width / 2 + 70, box.y + box.height * 0.5, { steps: 6 });
      await pg.mouse.up();
      await pg.waitForTimeout(1200);
      const still = await shown(pg);
      ok(still.length === 1 && still[0] === cab.screen, `lap ${lap}: still on the cabinet after a tap and a drag (got ${still.join(',') || 'none'})`);

      await pg.click(`#btn-${px}-exit`);
      await pg.waitForTimeout(300);
      const back = await shown(pg);
      ok(back.length === 1 && back[0] === 'screen-arcade', `lap ${lap}: ✕ returns to the room and nothing else paints (got ${back.join(',') || 'none'})`);
    }
    ok(errs.length === errsBefore, `no console errors${errs.length > errsBefore ? ' — ' + errs.slice(errsBefore).join(' | ') : ''}`);
  }

  await browser.close(); srv.close();
  console.log(`\n══ ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
})();
