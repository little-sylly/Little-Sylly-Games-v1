/* visual-lobby.js — the lobby's four layouts in real headless Chromium, over the
   REAL index.html (SW v231). The tier no pure harness reaches: boot tiering, the
   router seam every game's exit goes through, the ornament's moves, the Lounge's
   room, and the offline paths.

       node tools/visual-lobby.js

   Needs Playwright, which is deliberately NOT a project dependency — absent, it
   says so and exits 0. Serves the repo itself on a free port.

   Three rules this file keeps, each learned the hard way:
   1. Visibility is GEOMETRY (BUG-19). shown() measures a box and nothing else —
      never the hidden attribute, never a style.display the code under test wrote.
   2. Service workers are BLOCKED in every context: an active SW answers fetches
      Playwright's route() never sees, and would make the offline scenarios lie.
   3. ANGLE-over-swiftshader, not plain swiftshader — the plain one reports a
      WebGL context and rasterises nothing (see visual-controller-stickers.js). */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const section = n => console.log('── ' + n + ' ──');

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
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

const SCREENS = { lounge: 'screen-lounge', tv: 'screen-tv', shelves: 'screen-shelves', original: 'screen-lobby' };
const SLOTS = { tv: 'tv-controller', shelves: 'shelves-controller', original: 'lobby-controller' };
const shown = (page, id) => page.evaluate(i => {
  const el = document.getElementById(i); if (!el) return false;
  const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
}, id);
async function onlyLayout(page, layout) {
  for (const [id, scr] of Object.entries(SCREENS)) if ((id === layout) !== await shown(page, scr)) return false;
  return true;
}
const booted = page => page.waitForFunction(() => window.lobbyReady === true, null, { timeout: 30000 });
const settle = (page, ms) => page.waitForTimeout(ms);
const canvasParent = page => page.evaluate(() => (typeof ctlRenderer !== 'undefined' && ctlRenderer && ctlRenderer.domElement.parentElement)
  ? ctlRenderer.domElement.parentElement.id : null);

(async () => {
  const pw = loadPlaywright();
  if (!pw) { console.log('Playwright not found — visual-lobby skipped (exit 0).'); return; }
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/index.html?lobbydebug`;
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const errs = [];
  /* `aborting`: this context aborts routes on purpose (section 9), and Chromium
     echoes every aborted request as a console "Failed to load resource" error.
     Only THAT echo is forgiven, and only there — a real 404 still fails. */
  const open = async (viewport, extra = {}, aborting = false) => {
    const ctx = await browser.newContext(Object.assign({ viewport, serviceWorkers: 'block' }, extra));
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      if (aborting && /Failed to load resource: net::ERR_FAILED/.test(m.text())) return;
      errs.push('console: ' + m.text());
    });
    return { ctx, page };
  };

  try {
    section('1 — a widescreen boots into the Lounge, with no flash of Original');
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => {
        window.__origSeen = 0; const t0 = performance.now();
        const tick = () => { const el = document.getElementById('screen-lobby');
          if (el && el.getClientRects().length && el.getBoundingClientRect().height > 0) window.__origSeen++;
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      await page.goto(base); await booted(page);
      ok(await onlyLayout(page, 'lounge'), '1280x800 boots into the Lounge and nothing else');
      await settle(page, 3100);
      ok(await page.evaluate(() => window.__origSeen) === 0, 'Original is never laid out during boot');
      ok(await page.evaluate(() => !!lobbyScene && !!window.louDebug && window.louDebug.isRunning()), 'the room is mounted and running');
      ok(await page.evaluate(() => lobbyOffered('lounge') && lobbyOffered('tv')), 'a widescreen is offered every layout');

      section('4 — every layout: Play reaches the game, quitting lands back on that layout');
      const plays = {
        shelves:  async () => { await page.evaluate(() => lbSet({ folder: lbGame('frt').shelves[0], sheet: 'frt' })); await page.click('#lb-play'); },
        tv:       async () => { await page.evaluate(() => tvSelect('frt')); await page.click('#tv-app .lb-lg-play'); },
        original: async () => { await page.click('#btn-frt'); },
      };
      for (const layout of ['shelves', 'tv', 'original']) {
        await page.evaluate(v => lobbyGo(v), layout); await settle(page, 400);
        ok(await onlyLayout(page, layout), `${layout} is up, alone`);
        await plays[layout](); await settle(page, 400);
        ok(await shown(page, 'screen-frt-menu'), `${layout}: Play reaches Fruit Salad's menu`);
        ok(await page.evaluate(() => !ctlOrnamentIsLive()), `${layout}: the ornament is not live during a game`);
        // tvDrop() deletes #tv-app.__tv with its RAF + clock — gone means stopped (Timer Lifecycle).
        if (layout === 'tv') ok(await page.evaluate(() => !document.getElementById('tv-app').__tv), "tv: the rail's RAF and clock are stopped during a game");
        await page.click('#btn-frt-menu-back'); await settle(page, 400);     // the game's own resetToLobby()
        ok(await onlyLayout(page, layout), `${layout}: quitting lands back on ${layout}`);
      }
      // The Lounge has no Play of its own — it is entered by a door, and a game started
      // through that door belongs to the layout the door opened (O4).
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 400);
      await page.evaluate(() => lobbyDispatch({ t: 'enterTV', gameId: 'frt' })); await settle(page, 400);
      await page.click('#tv-app .lb-lg-play'); await settle(page, 400);
      await page.click('#btn-frt-menu-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'tv'), 'Lounge → the telly → a game → quit lands on TV, the launching layout');
      ok(await page.evaluate(() => GAMES.filter(g => !lobbyButtonFor(g.id)).map(g => g.id).join(',')) === '',
         'all 20 games resolve to a lobby button');

      section('5 — the Workshop returns to where it was opened');
      for (const layout of ['shelves', 'tv', 'original']) {
        await page.evaluate(v => lobbyGo(v), layout);
        await page.waitForFunction(s => typeof ctlRenderer !== 'undefined' && ctlRenderer && ctlRenderer.domElement.parentElement
          && ctlRenderer.domElement.parentElement.id === s, SLOTS[layout], { timeout: 15000 }).catch(() => {});
        ok(await canvasParent(page) === SLOTS[layout], `${layout}: the ornament canvas is in ${SLOTS[layout]}`);
        await page.evaluate(() => ctlOnTap()); await settle(page, 300);
        ok(await shown(page, 'screen-workshop'), `${layout}: the ornament opens the Workshop`);
        if (layout === 'tv') ok(await page.evaluate(() => !document.getElementById('tv-app').__tv), "tv: the rail's RAF and clock are stopped behind the Workshop");
        await page.click('#btn-ctl-save'); await settle(page, 500);
        ok(await onlyLayout(page, layout) && await canvasParent(page) === SLOTS[layout], `${layout}: Save returns to ${layout}, canvas in its slot`);
      }
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 400);
      await page.evaluate(() => lobbyDispatch({ t: 'workshopOpen' })); await settle(page, 500);
      ok(await shown(page, 'screen-workshop'), 'the Lounge\'s controller door opens the Workshop');
      await page.click('#btn-ctl-save'); await settle(page, 600);
      ok(await onlyLayout(page, 'lounge') && await page.evaluate(() => window.louDebug.isRunning()), 'Save returns to a running Lounge');
      ok(await page.evaluate(() => { let hit = false; lobbyScene.built.controller.traverse(o => { if (o.isMesh && o.material.map === ctlTex) hit = true; }); return hit; }),
         'the Lounge\'s controller wears the Workshop\'s painted atlas');

      section('6 — the Konami gateway and the Terminal return to the last layout');
      await page.evaluate(() => lobbyGo('tv')); await settle(page, 300);
      await page.evaluate(() => smOpenGateway()); await settle(page, 300);
      await page.click('#sm-btn-exit'); await settle(page, 400);
      ok(await onlyLayout(page, 'tv'), 'the gateway\'s exit lands on TV');
      await page.evaluate(() => lobbyGo('original')); await settle(page, 300);
      await page.evaluate(() => smOpenArcadeMenu()); await settle(page, 500);
      await page.click('#sm-terminal-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'original'), 'the Terminal\'s back lands on Original');
      /* From a layout that is NOT Original too: the pre-seam code always showed
         screen-lobby, so a check that only starts from Original cannot tell the
         seam from its absence (the mutation pass caught exactly that). */
      await page.evaluate(() => lobbyGo('shelves')); await settle(page, 300);
      await page.evaluate(() => smOpenArcadeMenu()); await settle(page, 500);
      await page.click('#sm-terminal-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'shelves'), 'the Terminal\'s back lands on Shelves');

      section('7 — the idle nudge runs in every ornament layout, and always comes home');
      /* Sampled across the window, not compared at its end: since the home spring (26 Sep 2026)
         a nudge can settle back onto EXACTLY its starting yaw inside 5.6 s on a fast machine.
         The bound is the bug the spring fixed — with random-signed coasts and no way home, the
         yaw random-walked to -2.1 rad (edge-on, nearly its back) within a minute. */
      for (const layout of ['shelves', 'tv', 'original']) {
        await page.evaluate(v => lobbyGo(v), layout); await settle(page, 500);
        const r0 = await page.evaluate(() => ctlRotY); let moved = false, far = 0;
        for (let i = 0; i < 28; i++) { await settle(page, 200);
          const [r, off] = await page.evaluate(() => [ctlRotY, Math.abs(ctlYawOffHome())]); if (r !== r0) moved = true; far = Math.max(far, off); }
        ok(moved, `${layout}: the ornament nudges itself`);
        ok(far < 0.6, `${layout}: a wiggle, never a turn away (max ${far.toFixed(2)} rad off home)`);
      }
      await page.evaluate(() => lobbyGo('shelves')); await settle(page, 300);
      await page.evaluate(() => { ctlRotY = 4.0; ctlVelY = 0; ctlWake(); });
      await page.waitForFunction(() => Math.abs(ctlYawOffHome()) < 0.05, null, { timeout: 60000 }).catch(() => {});
      ok(await page.evaluate(() => Math.abs(ctlYawOffHome()) < 0.05), 'a controller spun off its pose in a slot glides home');

      section('8 — the stickerbook: full, empty tray, nothing written');
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 400);
      const keys0 = await page.evaluate(() => Object.keys(localStorage).sort().join());
      await page.evaluate(() => lobbyDispatch({ t: 'stickerbookOpen' })); await settle(page, 600);
      ok(await shown(page, 'stickerbook-overlay'), 'the binder opens the book');
      ok(await page.evaluate(() => document.querySelectorAll('#stickerbook-overlay .sb-tray-item').length === 0), 'the tray is empty');
      ok(await page.evaluate(() => { const p = Achievements.achProgress(lobbyBook, Achievements.achAllPlaced(lobbyBook)); return p.done === p.total; }), 'every tier reads complete');
      await page.click('#sb-close'); await settle(page, 500);
      ok(!await shown(page, 'stickerbook-overlay') && await page.evaluate(() => window.louDebug.isRunning()), '✕ returns to a running Lounge');
      ok(await page.evaluate(() => Object.keys(localStorage).sort().join()) === keys0, 'no localStorage key was written');

      section('10 — one ornament canvas, ever');
      ok(await page.evaluate(() => document.querySelectorAll('.ctl-ornament canvas').length) <= 1, 'at most one canvas across the three slots');

      section('12 — back into the Lounge after a door lit the fade');
      /* Push-in + fade, then enterTV. Waited for, not slept: the push-in is a
         time-based tween that only completes on rendered frames, and software
         GL renders the full room slowly. */
      await page.evaluate(() => lobbyScene.activate('tv-screen'));
      await page.waitForFunction(() => lobbyState.view === 'tv', null, { timeout: 10000 }).catch(() => {});
      await settle(page, 300);
      ok(await onlyLayout(page, 'tv'), 'the telly screen door leads to TV');
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 500);
      ok(await page.evaluate(() => getComputedStyle(document.getElementById('lou-fade')).opacity) === '0', 'the fade is cleared on return — the room is visible');

      section('14 — the Lounge controller\'s Konami is a hint, never an unlock');
      /* The idle beat only NAMES sounds; the host routes them to the Workshop's own voices.
         Nothing on that path may reach the code's buffer or the gateway. Software GL frames
         are slow enough that some presses fall inside one frame and stay silent, so this
         asserts the route and the absence of an unlock, not the count (the pure harness,
         verify-lounge-props.js, owns the sequence). */
      await page.evaluate(() => {
        window.__kh = { heard: [], voices: [], beeps: 0, handled: 0, gateway: 0 };
        const h = lobbyHost.sfx; lobbyHost.sfx = n => { window.__kh.heard.push(n); h(n); };
        const vf = ctlVoiceFor; window.ctlVoiceFor = n => { window.__kh.voices.push(n); return vf(n); };
        const pb = playSecretBeep; window.playSecretBeep = f => { window.__kh.beeps++; return pb(f); };
        const hb = smHandleButton; window.smHandleButton = c => { window.__kh.handled++; return hb(c); };
        const og = smOpenGateway; window.smOpenGateway = () => { window.__kh.gateway++; return og(); };
        smKonamiBuffer = [];
        lobbyScene.withProp('controller', a => a.idle('konami', performance.now()));
      });
      await page.waitForFunction(() => lobbyScene.built.controller.userData.api.idleState().kind === null, null, { timeout: 30000 }).catch(() => {});
      /* A frame gap over LOU_CTL_STOPPED_MS (1.5 s) drops the whole beat at rest — by design,
         it is how the prop tells a stopped scene from a slow one — and a software-GL stall can
         do exactly that (seen 2 runs in 5, 26 Sep 2026: 0 voices, 0 beeps). This check is about
         the ROUTE, so a beat that was dropped whole is run once more, never more. */
      if (await page.evaluate(() => window.__kh.heard.length === 0)) {
        await page.evaluate(() => lobbyScene.withProp('controller', a => a.idle('konami', performance.now())));
        await page.waitForFunction(() => lobbyScene.built.controller.userData.api.idleState().kind === null, null, { timeout: 30000 }).catch(() => {});
      }
      const kh = await page.evaluate(() => Object.assign({}, window.__kh, { buf: smKonamiBuffer.length }));
      ok(kh.heard.some(n => n.indexOf('controllerPress:') === 0) && kh.voices.length > 0 && kh.beeps > 0,
         `the room's Konami plays the Workshop's own voices (${kh.voices.length} press voices, ${kh.beeps} beeps)`);
      ok(kh.handled === 0 && kh.gateway === 0 && kh.buf === 0, 'and never reaches the code\'s buffer or the gateway');
      ok(await onlyLayout(page, 'lounge'), 'the Lounge is still the only layout up');

      section('15 — the jukebox: the cat\'s door, a song held through the lobby, ✕ back to the Lounge');
      /* Software GL stalls CSS transitions, so a chip mid-transition screenshots as
         unselected — turn them off for this screen. Visibility is still geometry. */
      await page.addStyleTag({ content: '#screen-jukebox *, #screen-jukebox *::before { transition: none !important; }' });
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 400);
      await page.evaluate(() => lobbyScene.activate('jukebox-knob'));
      await page.waitForFunction(() => lobbyState.jukebox === true, null, { timeout: 10000 }).catch(() => {});
      await page.waitForFunction(() => Jukebox.debug().tracks > 0, null, { timeout: 10000 }).catch(() => {});
      ok(await shown(page, 'screen-jukebox') && !await shown(page, 'screen-lounge'), 'the cat\'s door opens the jukebox screen, and only it');
      ok(await page.evaluate(() => !window.louDebug.isRunning() && Jukebox.debug().stageRunning),
         'the Lounge\'s RAF is stopped while the jukebox\'s own stage runs — one scene at a time');
      // The catalogue churns (docs/deferred-work.md § Jukebox) — compare against the manifest, never a pinned count.
      const jbxWant = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/music/jukebox/manifest.json'), 'utf8')).tracks.length;
      ok(await page.evaluate(() => Jukebox.debug().tracks) === jbxWant, `the catalogue loads from data/music/jukebox/ (${jbxWant} songs)`);
      ok(await page.evaluate(() => document.getElementById('jbx-tab-records').getAttribute('aria-selected') === 'true'), 'Records is the default view');
      await page.click('#jbx-find'); await settle(page, 200);
      ok(await page.evaluate(() => document.getElementById('jbx-tab-list').getAttribute('aria-selected') === 'true'
        && document.activeElement && document.activeElement.id === 'jbx-search'), '"Find a song" opens the List with the search focused');
      await page.fill('#jbx-search', 'stakeout'); await settle(page, 200);
      ok(await page.evaluate(() => document.querySelectorAll('#jbx-pick .dB-row').length) === 1, 'the search narrows the List to one song');
      await page.click('#jbx-pick .dB-row[data-id="the-stakeout"]');
      await page.waitForFunction(() => Jukebox.debug().playing, null, { timeout: 15000 }).catch(() => {});
      ok(await page.evaluate(() => Music.heldKey() === 'the-stakeout' && Jukebox.debug().playing), 'a tap on a row holds that song and it plays');
      ok(await page.evaluate(() => (Music.nowPlaying() || {}).title === 'The Stakeout'), 'Music reports it as what is playing');
      await page.screenshot({ path: path.join(os.tmpdir(), 'visual-lobby-jukebox.png') });
      await page.click('#jbx-close'); await settle(page, 500);
      ok(await onlyLayout(page, 'lounge') && !await shown(page, 'screen-jukebox'), '✕ lands back on the Lounge, jukebox gone');
      ok(await page.evaluate(() => window.louDebug.isRunning() && !Jukebox.debug().stageRunning && !Jukebox.debug().waveRaf),
         'the room runs again; both jukebox RAF loops are stopped (Timer Lifecycle)');
      ok(await page.evaluate(() => getComputedStyle(document.getElementById('lou-fade')).opacity) === '0', 'the door\'s fade is cleared — the room is visible');
      await page.evaluate(() => lobbyGo('shelves')); await settle(page, 400);
      ok(await page.evaluate(() => Music.heldKey() === 'the-stakeout' && !Music.deck().paused), 'the song is held through lobby navigation');
      await page.evaluate(() => lbSet({ folder: lbGame('frt').shelves[0], sheet: 'frt' })); await page.click('#lb-play'); await settle(page, 400);
      ok(await shown(page, 'screen-frt-menu') && await page.evaluate(() => Music.heldKey() === null), 'a game lets go of it — the game\'s music takes the room back');
      await page.click('#btn-frt-menu-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'shelves'), 'and quitting the game still lands on Shelves');
      // Paused and left: the house music comes back. And resetToLobby with the jukebox up.
      await page.evaluate(() => lobbyGo('lounge')); await settle(page, 400);
      await page.evaluate(() => lobbyDispatch({ t: 'jukeboxOpen' })); await settle(page, 600);
      ok(await page.evaluate(() => Jukebox.debug().currentId === 'the-stakeout' && !Jukebox.debug().playing), 'reopened, it shows the last record, not playing');
      await page.click('#screen-jukebox .jbx-key.k-play');
      await page.waitForFunction(() => Jukebox.debug().playing, null, { timeout: 15000 }).catch(() => {});
      await page.click('#screen-jukebox .jbx-key.k-play'); await settle(page, 300);
      ok(await page.evaluate(() => Music.heldKey() === 'the-stakeout' && Music.deck().paused), 'the play key pauses it');
      await page.click('#jbx-close'); await settle(page, 500);
      ok(await page.evaluate(() => Music.heldKey() === null), 'closed while paused, the song is let go — the house music comes back');
      await page.evaluate(() => lobbyDispatch({ t: 'jukeboxOpen' })); await settle(page, 500);
      await page.evaluate(() => resetToLobby()); await settle(page, 500);
      ok(await onlyLayout(page, 'lounge') && !await shown(page, 'screen-jukebox') && await page.evaluate(() => !Jukebox.debug().stageRunning && !Jukebox.isOpen()),
         'resetToLobby with the jukebox up lands on the Lounge with its loops stopped');

      section('13 — resizing below a layout\'s floor');
      await page.evaluate(() => lobbyGo('tv')); await settle(page, 300);
      await page.setViewportSize({ width: 700, height: 800 });
      /* Waited for, not slept: the resize event can land well after 400 ms on a
         page busy in software GL. Still a geometry check — a box, not a flag. */
      await page.waitForFunction(() => { const el = document.getElementById('lb-tv-handoff-back');
        if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; },
        null, { timeout: 5000 }).catch(() => {});
      ok(await shown(page, 'lb-tv-handoff-back'), 'TV below its floor shows the hand-off card');
      await page.click('#lb-tv-handoff-back'); await settle(page, 400);
      ok(await onlyLayout(page, 'shelves'), 'and its button goes to Shelves');
      ok(await page.evaluate(() => !lobbyOffered('tv')), 'TV is not offered below its floor');
      await ctx.close();
    }

    section('2 — a phone plays the arrival beat, lands in Shelves, and cannot go back');
    for (const reduced of [false, true]) {
      const { ctx, page } = await open({ width: 390, height: 844 }, reduced ? { reducedMotion: 'reduce' } : {});
      /* Counted ACROSS THE BEAT — from arrive() to its done — as the sandbox's
         harness did. The claim is "nothing travels during the beat"; the frames
         before it (mount, first resize) are not the beat, and a cut to the
         beat's still pose is exactly what reduced motion asks for. */
      await ctx.addInitScript(() => {
        let v; window.__mats = new Set(); window.__beats = 0;
        Object.defineProperty(window, 'LouScene', { configurable: true, get() { return v; }, set(x) {
          v = x; const mount = x.louMount;
          x.louMount = function () {
            const api = mount.apply(this, arguments), arrive = api.arrive;
            api.arrive = function (done) {
              window.__beats++;
              let stop = false;
              const snap = () => window.__mats.add(window.louDebug.cameraMatrix().map(n => n.toFixed(4)).join(','));
              const tick = () => { if (stop) return; snap(); requestAnimationFrame(tick); };
              requestAnimationFrame(tick);
              return arrive.call(this, function () { stop = true; snap(); done(); });
            };
            return api;
          };
        } });
      });
      await page.goto(base);
      await page.waitForFunction(() => typeof lobbyState !== 'undefined' && lobbyState.view === 'shelves', null, { timeout: 30000 });
      const n = await page.evaluate(() => window.__mats.size);
      ok(await page.evaluate(() => window.__beats === 1), `${reduced ? 'reduced: ' : ''}the beat plays exactly once`);
      if (reduced) ok(n === 1, `reduced motion: the camera never travels (${n} distinct matrix)`);
      else ok(n >= 8, `the arrival camera travels (${n} distinct matrices)`);
      await settle(page, 400);
      ok(await onlyLayout(page, 'shelves'), `${reduced ? 'reduced: ' : ''}the beat hands to Shelves`);
      if (!reduced) {
        ok(await page.evaluate(() => !lobbyOffered('lounge')), 'the Lounge is closed to a handed-out phone');
        ok(await page.evaluate(() => ![...document.querySelectorAll('#shelves-canvas .lb-switch .lb-seg')].some(b => b.getAttribute('aria-label') === 'Lounge')),
           'Shelves\' switch does not offer it');
        await page.evaluate(() => lobbyGo('lounge')); await settle(page, 300);
        ok(await onlyLayout(page, 'shelves'), 'lobbyGo(\'lounge\') is refused');

        section('11 — a stale deferred ornament mount lands in the CURRENT slot');
        await page.evaluate(() => lobbyGo('original'));               // before Shelves' deferred attach can land
        await settle(page, 2000);
        ok(await canvasParent(page) === 'lobby-controller', 'the canvas ends in Original\'s slot, not Shelves\'');
      }
      await ctx.close();
    }

    section('3 — no WebGL goes straight to Shelves');
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : orig.call(this, t, ...a); };
      });
      await page.goto(base); await booted(page);
      ok(await onlyLayout(page, 'shelves'), 'no WebGL: Shelves directly');
      ok(await page.evaluate(() => lobbyScene === null && !lobbyOffered('lounge')), 'no room, and the Lounge is not offered');
      await ctx.close();
    }

    section('9 — each runtime-cached source fails alone');
    const offline = [
      ['lamp manifest', ['**/data/lamp/**']],
      ['sticker manifest', ['**/data/stickers/manifest.json']],
      ['both', ['**/data/lamp/**', '**/data/stickers/**']],
    ];
    for (const [label, routes] of offline) {
      const { ctx, page } = await open({ width: 1280, height: 800 }, {}, true);
      for (const r of routes) await ctx.route(r, route => route.abort());
      await page.goto(base); await booted(page);
      ok(await onlyLayout(page, 'lounge') && await page.evaluate(() => !!lobbyScene && window.louDebug.isRunning()), `${label} offline: the Lounge still mounts and runs`);
      if (label !== 'lamp manifest') {
        await page.evaluate(() => lobbyDispatch({ t: 'stickerbookOpen' })); await settle(page, 1200);
        ok(!await shown(page, 'stickerbook-overlay'), `${label} offline: the book does not open`);
        ok(/could not load/i.test(await page.evaluate(() => document.getElementById('lou-status').textContent)), `${label} offline: the room says why`);
      }
      await ctx.close();
    }

    section('16 — the reconnect prompt over the real lobby (SW v236)');
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => {
        localStorage.setItem('sylly_rejoin', JSON.stringify({ code: 'ABCD', game: 'comb', ts: Date.now() }));
      });
      await page.goto(base); await booted(page); await settle(page, 400);
      ok(await shown(page, 'mp-rejoin-overlay'), 'a fresh key opens the prompt over the Lounge');
      ok(/Honeycomb Hills/.test(await page.evaluate(() => document.getElementById('mp-rejoin-heading').textContent)), '  …naming the game');
      // 16b: an ACCEPT enters the game WITHOUT a lobby button — the room must stop, then come back.
      await page.evaluate(() => {
        window.syllyDeviceUid = 'uV';
        mpApplyRejoinAccept({ game: 'comb', playerSlots: [{ uid: 'uH', nickname: 'Ali' }, { uid: 'uV', nickname: 'Bec' }, { uid: 'u2', nickname: 'Cam' }],
                              mpLobbyStyle: 'individual', gameSettings: {} });
      });
      await settle(page, 300);
      ok(!await shown(page, 'mp-rejoin-overlay'), '16b the prompt closed');
      ok(await page.evaluate(() => !window.louDebug.isRunning()), '16b the Lounge room stopped when the game took the screen');
      await page.evaluate(() => resetToLobby()); await settle(page, 800);
      ok(await onlyLayout(page, 'lounge') && await page.evaluate(() => window.louDebug.isRunning()), '16b resetToLobby brings the Lounge back, running');
      ok(await page.evaluate(() => localStorage.getItem('sylly_rejoin') === null), '16b teardown cleared the key');
      await ctx.close();
    }
    {
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await ctx.addInitScript(() => { localStorage.setItem('sylly_rejoin', '{not json'); });
      await page.goto(base); await booted(page); await settle(page, 400);
      ok(!await shown(page, 'mp-rejoin-overlay'), 'a corrupt key opens nothing and throws nothing');
      await ctx.close();
    }

    section("17 — the places row: the rooms' doors outside the Lounge (SW v238)");
    {
      // A phone never keeps the Lounge, so these are its only way into the jukebox and
      // the stickerbook. Each must go through the router and close back to its opener.
      const { ctx, page } = await open({ width: 375, height: 667 });
      await page.goto(base); await booted(page); await settle(page, 300);
      for (const [view, scr, sel] of [['shelves', 'screen-shelves', '#shelves-canvas'], ['original', 'screen-lobby', '#screen-lobby']]) {
        await page.evaluate(v => lobbyGo(v), view); await settle(page, 300);
        await page.click(`${sel} [data-lobby-place="jukebox"]`); await settle(page, 600);
        ok(await shown(page, 'screen-jukebox') && await page.evaluate(() => lobbyState.jukebox), `${view}: 🎵 opens the jukebox through the router`);
        await page.click('#jbx-close'); await settle(page, 300);
        ok(await onlyLayout(page, view), `${view}: its ✕ comes back to ${view}`);
        await page.click(`${sel} [data-lobby-place="stickers"]`); await settle(page, 400);
        ok(await page.evaluate(() => lobbyState.stickerbook && !document.getElementById('stickerbook-overlay').hidden), `${view}: 📒 opens the stickerbook`);
        await page.click('#sb-close'); await settle(page, 300);
        ok(await onlyLayout(page, view) && await page.evaluate(() => !lobbyState.stickerbook), `${view}: closing it comes back to ${view}`);
      }
      await ctx.close();
    }
    {
      // TV keeps its own compact icon pair (DD-49's second round) rather than
      // Shelves/Classic's labelled row, but the same two buttons through the
      // same router actions — proved at TV's own widescreen floor.
      const { ctx, page } = await open({ width: 1280, height: 800 });
      await page.goto(base); await booted(page); await settle(page, 300);
      await page.evaluate(() => lobbyGo('tv')); await settle(page, 300);
      await page.click('#tv-app [data-lobby-place="jukebox"]'); await settle(page, 600);
      ok(await shown(page, 'screen-jukebox') && await page.evaluate(() => lobbyState.jukebox), 'tv: 🎵 opens the jukebox through the router');
      await page.click('#jbx-close'); await settle(page, 300);
      ok(await onlyLayout(page, 'tv'), "tv: its ✕ comes back to tv");
      await page.click('#tv-app [data-lobby-place="stickers"]'); await settle(page, 400);
      ok(await page.evaluate(() => lobbyState.stickerbook && !document.getElementById('stickerbook-overlay').hidden), 'tv: 📒 opens the stickerbook');
      await page.click('#sb-close'); await settle(page, 300);
      ok(await onlyLayout(page, 'tv') && await page.evaluate(() => !lobbyState.stickerbook), 'tv: closing it comes back to tv');
      await ctx.close();
    }

    ok(errs.length === 0, 'no page errors on any device' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  } catch (e) {
    fail++; console.log('  FAIL harness threw: ' + (e && e.stack || e));
  } finally {
    await browser.close(); srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
