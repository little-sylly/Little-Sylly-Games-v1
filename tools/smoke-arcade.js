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

  /* The Floor's screens (SW v259, spec § 3.2 4b): each cabinet's session board, so best() can be
     seeded. Deep-Sea Sweep keeps one board per sea state, of times. */
  const BOARDS = { asherplane: 'apLeaderboard', minesweeper: 'msBoards.hard', chicken: 'ckBoard', slice: 'slBoardScores',
    cookiejar: 'hjScores', stacking: 'stoScores', bluff: 'bbScores', coldshot: 'cshScores', traceroute: 'trcScores' };

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

    // ── its screen on the Floor: the attract scene, card off, on a canvas it is handed
    const pv = await pg.evaluate(([id, px, board]) => {
      const c = ARC_CABINETS.find(x => x.id === id), out = {};
      out.hooks = typeof c.preview === 'function' && typeof c.best === 'function';
      if (!out.hooks) return out;
      const a = c.preview();
      out.adapter = !!a && a.w > 0 && a.h > 0 && ['begin', 'step', 'draw', 'end'].every(k => typeof a[k] === 'function');
      const own = document.getElementById(px + '-canvas'), ownWH = own.width + 'x' + own.height;
      const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:90px';
      document.body.appendChild(cv);
      const real = window.playSecretBeep; let leaks = 0, hushed = 0;
      window.playSecretBeep = () => { if (arcPreviewQuiet) hushed++; else leaks++; };
      try { arcPreviewStill(ARC_CABINETS.indexOf(c), cv); } finally { window.playSecretBeep = real; }
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0;
      for (let k = 3; k < d.length; k += 4) if (d[k] > 0) lit++;
      out.paint = lit / (cv.width * cv.height); out.leaks = leaks; out.hushed = hushed;
      out.ownUntouched = own.width + 'x' + own.height === ownWH;
      out.handedBack = window.eval(px + 'Previewing') === false && window.eval(px + 'Canvas') === null;
      cv.remove();
      // best(): nothing on a fresh board, a string once someone has a score
      const b = window.eval(board), seeded = id === 'minesweeper' ? { name: 'TST', time: 41234 } : { name: 'TST', score: 1234 };
      out.fresh = b.length ? 'board not fresh' : c.best();
      b.push(seeded); out.seeded = c.best(); b.splice(b.indexOf(seeded), 1);
      return out;
    }, [cab.id, px, BOARDS[cab.id]]);
    ok(pv.hooks, 'registers preview() and best()');
    if (pv.hooks) {
      ok(pv.adapter, 'preview() hands back { w, h, begin, step, draw, end }');
      ok(pv.paint > 0.9, `a still frame paints the canvas it was given (${Math.round(pv.paint * 100)}% of it)`);
      ok(pv.ownUntouched, 'and leaves the cabinet\'s own canvas alone');
      ok(pv.handedBack, 'end() hands the game back: not previewing, its canvas let go');
      ok(pv.leaks === 0, `silent: no beep escapes the preview (${pv.hushed} hushed, ${pv.leaks} leaked)`);
      ok(pv.fresh === null, `best() is null on a fresh board (got ${JSON.stringify(pv.fresh)})`);
      ok(typeof pv.seeded === 'string' && pv.seeded.length > 0, `best() is a string once there is a score (${JSON.stringify(pv.seeded)})`);
    }
    // the live preview follows the selection, and stops before the game takes its canvas back
    await pg.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' }));
    await pg.waitForTimeout(400);
    await pg.evaluate(id => arcSelect(ARC_CABINETS.findIndex(c => c.id === id), false), cab.id);
    await pg.waitForTimeout(300);
    ok(await pg.evaluate(id => !!arcPrev && arcPrev.i === ARC_CABINETS.findIndex(c => c.id === id), cab.id), 'centred, its screen runs live');
    ok(await pg.evaluate(id => { const row = document.querySelector('#arc-list .arc-row.is-sel');
      return !!row && row.querySelector('.arc-crt-hi').textContent === '' && row.querySelector('.arc-m-name').textContent === ARC_CABINETS.find(c => c.id === id).label; }, cab.id),
       'the marquee carries its name; no HI line without a score');
    await pg.evaluate(id => arcLaunch(id), cab.id);
    ok(await pg.evaluate(() => arcPrev === null), 'a launch stops the live preview at once');
    await pg.waitForTimeout(700);
    await pg.click(`#btn-${px}-exit`); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => !!arcPrev && arcPrev.i === arcSel), '✕ back to the room: the centred screen runs live again');
    await pg.evaluate(() => lobbyDispatch({ t: 'arcadeClose' })); await pg.waitForTimeout(300);

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

  // ── the room's preview lifecycle (Timer Lifecycle: every RAF has its clear sites)
  console.log('\n── the Floor\'s live preview');
  await pg.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' })); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => !!arcPrev), 'the room opens with the centred screen live');
  await pg.evaluate(() => arcStop());
  ok(await pg.evaluate(() => arcPrev === null), 'arcStop() stops it');
  await pg.evaluate(() => arcPreviewPlay(arcSel)); await pg.evaluate(() => resetToLobby()); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => arcPrev === null && document.getElementById('screen-arcade').style.display === 'none'), 'resetToLobby() with a preview running stops it');
  {
    await ctx.close();   // one page at a time: two busy pages starve each other's load event
    const rctx = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const rp = await rctx.newPage();
    await rp.goto(`http://localhost:${srv.address().port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await rp.waitForFunction(() => typeof lobbyDispatch === 'function', null, { timeout: 30000 }); await rp.waitForTimeout(1500);
    await rp.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' })); await rp.waitForTimeout(500);
    ok(await rp.evaluate(() => arcPrev === null), 'reduced motion: no screen runs live');
    ok(await rp.evaluate(() => { const cv = document.querySelector('#arc-list .arc-row.is-sel .arc-crt-view');
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0;
      for (let k = 3; k < d.length; k += 4) if (d[k] > 0) lit++; return lit > d.length / 8; }), 'reduced motion: the screen still shows its still frame');
    await rctx.close();
  }

  await browser.close(); srv.close();
  console.log(`\n══ ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
})();
