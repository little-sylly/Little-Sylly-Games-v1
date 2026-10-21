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
     seeded. Deep-Sea Sweep's board is scores since the dive (Oct 2026), like every other cabinet's. */
  const BOARDS = { asherplane: 'apLeaderboard', minesweeper: 'msScores', chicken: 'ckBoard', slice: 'slBoardScores',
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
      const b = window.eval(board), seeded = { name: 'TST', score: 1234, depth: 300 };
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
    await pg.click(`#btn-${px}-exit`); await pg.waitForTimeout(600);
    ok(await pg.evaluate(id => ARC_CABINETS[arcSel].id === id && document.getElementById('arc-count').textContent.startsWith(arcPad(ARC_CABINETS.findIndex(c => c.id === id) + 1)), cab.id),
      '✕ back to the room: it is still on the cabinet you left (not back at 01)');
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

  /* ── the ring (SW v260, spec § 3.3): one scene of the real cabinets, ONE loop, released with the room.
     Rules and state only — how it looks is visual-check's job. Skipped where the browser has no WebGL. */
  console.log('\n── the ring');
  await pg.evaluate(() => { arcSel = 3; lobbyDispatch({ t: 'arcadeOpen' }); });
  if (!(await pg.evaluate(() => !!arcGl))) {
    ok(await pg.evaluate(() => typeof lobbyWebgl !== 'undefined' && lobbyWebgl === false && !document.querySelector('#arc-list.is-gl')),
      'no ring: only because there is no WebGL, and the CSS row stands instead');
  } else {
    await pg.waitForFunction(() => arcGl && arcGl.ms.first !== null, null, { timeout: 120000 });   // software GL compiles slowly
    const ms = await pg.evaluate(() => arcGl.ms);
    console.log(`     (first open: build ${ms.build} ms, first frame ${ms.first} ms — software GL)`);
    ok(await pg.evaluate(() => arcGl.cabs.length === ARC_CABINETS.length && document.querySelectorAll('#screen-arcade .arc-gl').length === 1),
      'one canvas, one cabinet model per ARC_CABINETS entry');
    ok(await pg.evaluate(() => arcRaf !== null), 'the room runs its one loop');
    // the scroll turns the ring, and the cabinet that comes round does a turn
    await pg.evaluate(() => { arcGl.lastBeat = ''; const t = document.getElementById('arc-list'); t.scrollLeft += arcGl.pitch; });
    await pg.waitForFunction(() => arcSel === 4 && arcGl.live === 4, null, { timeout: 60000 });
    ok(await pg.evaluate(() => Math.abs(arcGl.ring.rotation.y + 4 * arcGl.step * Math.PI / 180) < 0.02), 'one pitch of scroll turns the ring one step');
    ok(await pg.evaluate(() => arcGl.lastBeat !== ''), 'the cabinet that comes round to the front plays an arrival beat');
    /* the keys (owner, 21 Oct 2026 — desktop): a key's smooth glide crosses the centre band, and the observer used to
       name the row halfway past (a jump back) and then ignore the row leaving (the number stuck). After a run of
       presses, quick and slow, the number must be the cabinet that is actually in the middle. */
    await pg.evaluate(() => { arcSelect(2, false); document.getElementById('btn-arc-start').focus(); });
    await pg.waitForTimeout(300);
    for (const [k, gap] of [['ArrowRight', 60], ['ArrowRight', 450], ['ArrowRight', 60], ['ArrowRight', 60], ['ArrowLeft', 450], ['ArrowRight', 700]]) {
      await pg.keyboard.press(k); await pg.waitForTimeout(gap);
    }
    await pg.waitForTimeout(1500);
    const keys = await pg.evaluate(() => {
      const t = document.getElementById('arc-list'), mid = t.scrollLeft + t.clientWidth / 2;
      let best = -1, bd = Infinity; [...t.querySelectorAll('.arc-row')].forEach((m, k) => { const d = Math.abs(m.offsetLeft + m.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      return { sel: arcSel, centred: best, count: document.getElementById('arc-count').textContent };
    });
    ok(keys.sel === 6 && keys.centred === 6 && keys.count.startsWith('07'), `keys: four right, a left, a right — on 07, the number agrees with the centre (sel ${keys.sel + 1}, centred ${keys.centred + 1}, ${keys.count})`);
    await pg.evaluate(() => { arcSelect(4, false); }); await pg.waitForTimeout(400);
    // a tap on a neighbour's model selects it
    const at = await pg.evaluate(() => {
      const g = arcGl, h = g.cabs[5].holder, p = h.localToWorld(new THREE.Vector3(0, 0.12, 0)).project(g.cam), r = g.canvas.getBoundingClientRect();
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
    });
    await pg.mouse.click(at.x, at.y);
    await pg.waitForFunction(() => arcSel === 5, null, { timeout: 30000 }).catch(() => {});
    ok(await pg.evaluate(() => arcSel === 5), 'a tap on a neighbour\'s model selects it');
    // the launch: the press, INSERT COIN, the push-in — then no loop while the cabinet plays, the ring kept
    await pg.evaluate(() => arcLaunch(ARC_CABINETS[arcSel].id));
    ok(await pg.evaluate(() => !!arcGl.coin && (!!arcGl.push || arcReducedMotion())), 'a launch shows INSERT COIN and pushes into the glass');
    await pg.waitForFunction(() => arcLaunchTimer === null, null, { timeout: 30000 });
    ok(await pg.evaluate(() => arcRaf === null && !!arcGl), 'while a cabinet plays: no loop, the ring kept for the way back');
    await pg.evaluate(() => arcExitCabinet());
    ok(await pg.evaluate(() => arcRaf !== null && !!arcGl && arcGl.push === null), '✕ back to the room: the same ring, the loop running again');
    await pg.evaluate(() => arcStop());
    ok(await pg.evaluate(() => arcRaf === null && arcGl === null && !document.querySelector('#screen-arcade .arc-gl')), 'arcStop() stops the loop and releases the renderer');
    await pg.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' })); await pg.waitForTimeout(300);
    await pg.evaluate(() => resetToLobby()); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => arcRaf === null && arcGl === null && !document.querySelector('#screen-arcade .arc-gl')), 'resetToLobby() with the ring up releases it');
  }
  {
    await ctx.close();   // one page at a time: two busy pages starve each other's load event
    const rctx = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const rp = await rctx.newPage();
    await rp.goto(`http://localhost:${srv.address().port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await rp.waitForFunction(() => typeof lobbyDispatch === 'function', null, { timeout: 30000 }); await rp.waitForTimeout(1500);
    await rp.evaluate(() => lobbyDispatch({ t: 'arcadeOpen' })); await rp.waitForTimeout(500);
    ok(await rp.evaluate(() => arcPrev === null), 'reduced motion: no screen runs live');
    ok(await rp.evaluate(() => arcRaf === null), 'reduced motion: the room runs no loop (the ring draws on scroll)');
    ok(await rp.evaluate(() => { const cv = document.querySelector('#arc-list .arc-row.is-sel .arc-crt-view');
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0;
      for (let k = 3; k < d.length; k += 4) if (d[k] > 0) lit++; return lit > d.length / 8; }), 'reduced motion: the screen still shows its still frame');
    await rctx.close();
  }

  await browser.close(); srv.close();
  console.log(`\n══ ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
})();
