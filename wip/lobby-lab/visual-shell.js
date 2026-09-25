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
     bounding box is the visible thing whatever the positioning scheme.

     And the `hidden` PROPERTY is not that thing either. This helper used to
     short-circuit on `el.hidden` before it ever measured, which made it blind
     to the only way hiding actually fails here: `hidden` is an attribute whose
     display:none comes from an ordinary, beatable CSS rule. `.shell-view[hidden]`
     (0,2,0) lost to `#shell-phone` (1,0,0), so the phone pane sat lit over the
     lounge at a full 1280x800 while this file printed 57/57 green. The router
     was never wrong; the stylesheet was. Measure the box, only the box. */
  const shown = (page, id) => page.evaluate(i => { const el = document.getElementById(i); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, id);

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

  /* ── below the floor: the one-way arrival beat (Scene B) ─────────────────
     This block used to assert the honest card. Building the beat is what
     retired it: a phone no longer gets an apology, it gets a real path — the
     room, a pan to the clamshell, and the Shelves. One way.

     The sampler below is the reason this lives in a browser at all. Whether
     the camera TRAVELLED is invisible to verify-shell.js (which has no camera)
     and to a check on the final matrix (which cannot tell a pan from a cut).
     Counting distinct matrices across the beat separates the two, and it is
     the same instrument that proves reduced motion does NOT travel. */
  const ARRIVE_INIT = `
    (function () {
      let _v;
      Object.defineProperty(window, 'PrmScene', {
        configurable: true,
        get() { return _v; },
        set(v) {
          _v = v;
          const mount = v.prmMount;
          v.prmMount = function () {
            const api = mount.apply(this, arguments);
            const arrive = api.arrive;
            api.arrive = function (done) {
              window.__arriveCalled = (window.__arriveCalled || 0) + 1;
              const seen = new Set(); window.__cam = seen;
              let stop = false;
              const tick = () => { if (stop) return; seen.add(JSON.stringify(window.prmDebug.cameraMatrix())); requestAnimationFrame(tick); };
              requestAnimationFrame(tick);
              return arrive.call(this, function () { stop = true; seen.add(JSON.stringify(window.prmDebug.cameraMatrix())); done(); });
            };
            return api;
          };
        }
      });
    })();
  `;
  {
    const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const smallErrors = []; small.on('pageerror', e => smallErrors.push(String(e)));
    await small.addInitScript(ARRIVE_INIT);
    await small.goto(base); await settle(small);

    // The room IS built below the floor now — that is the change. But lean.
    await small.waitForFunction(() => window.prmApi !== null, null, { timeout: 40000 });
    ok(true, 'below the floor the room is mounted, not refused');
    ok(await small.evaluate(() => document.getElementById('prm-card') === null),
       'and the honest card is gone from the shell entirely');

    /* The lean mount. Measured 21 Sep 2026: the controller is 87% of the prop
       build (859 ms of 990 at CPU 4x), and it is out of the portrait framing
       anyway. A real absence, not a hidden mesh. */
    ok(await small.evaluate(() => window.prmApi.built.controller === undefined),
       'the arrival tier skips the controller — 87% of the prop build, and off-frame');
    ok(await small.evaluate(() => window.prmDebug.nodes().indexOf('controller') === -1),
       'so it has no pick node either');
    ok(await small.evaluate(() => !!window.prmApi.built.phone),
       'but the clamshell it pans to is built');

    // The beat runs, exactly once, and it is the room's own door that ends it.
    await small.waitForFunction(() => window.shellState().arrival !== 'none', null, { timeout: 40000 });
    await small.screenshot({ path: path.join(SHOTS, 'shell-arrival-390.png') });
    await small.waitForFunction(() => window.shellState().view === 'shelves', null, { timeout: 40000 });
    ok(await small.evaluate(() => window.__arriveCalled === 1), 'the beat played exactly once');
    ok(await small.evaluate(() => window.shellState().arrival === 'done'), 'and closed itself on the way out');
    const travelled = await small.evaluate(() => window.__cam.size);
    ok(travelled >= 2, `the camera actually panned — ${travelled} distinct matrices across the beat`);

    ok(await shown(small, 'shell-phone'), 'it lands in the Shelves');
    ok(!(await shown(small, 'shell-premium')), 'and the lounge pane is put away');
    await small.screenshot({ path: path.join(SHOTS, 'shell-arrival-landed-390.png') });

    /* ONE-WAY, measured rather than assumed. lobby.js renders all four views
       in its in-phone strip and the shell does not own that markup, so this
       is the check that the refusal AND the hiding both actually landed.
       Geometry, never the `hidden` property: `.lb-seg { display:flex }` is an
       author rule that beats the UA's `[hidden]` outright (BUG-19). */
    const premiumSeg = await small.evaluate(() => {
      const b = [...document.querySelectorAll('#shelves-canvas .lb-switch .lb-seg')]
        .find(x => x.getAttribute('aria-label') === 'Premium');
      if (!b) return { found: false };
      const r = b.getBoundingClientRect();
      return { found: true, boxed: r.width > 0 && r.height > 0 };
    });
    ok(premiumSeg.found, "the phone's own switcher still renders a Premium segment");
    ok(premiumSeg.boxed === false, 'but it is genuinely not shown — measured as a box, not as .hidden');
    await small.evaluate(() => window.shellDispatch({ t: 'go', view: 'premium' }));
    await small.waitForTimeout(300);
    ok(await small.evaluate(() => window.shellState().view === 'shelves'),
       'and a go to premium is refused outright — there is no path back into the lounge');

    ok(!(await shown(small, 'shell-dock')), 'the dock is not forced up any more — the Shelves ship their own switcher');
    ok(smallErrors.length === 0, `no uncaught page errors below the floor (${smallErrors.slice(0, 2).join(' | ') || 'none'})`);
    await small.close();
  }

  // ── below the floor, reduced motion: the end state, never the journey ─────
  {
    /* ui-style.md § Motion Standard: a RAF beat must honour the setting in JS
       itself, and honour what it actually asks — nothing TRAVELS, not "the
       feature is dropped". The player still sees the room and still sees what
       it is handing them to; the camera simply starts where it would have
       finished. One distinct matrix is that claim, exactly. */
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.addInitScript(ARRIVE_INIT);
    await rp.goto(base); await settle(rp);
    await rp.waitForFunction(() => window.prmApi !== null, null, { timeout: 40000 });
    await rp.waitForFunction(() => window.shellState().view === 'shelves', null, { timeout: 40000 });
    ok(await rp.evaluate(() => window.__arriveCalled === 1), 'reduced motion: the beat still plays');
    const still = await rp.evaluate(() => window.__cam.size);
    ok(still === 1, `reduced motion: nothing travels — ${still} distinct camera matrix across the beat`);
    ok(await rp.evaluate(() => window.shellState().arrival === 'done'), 'and it still reaches the Shelves');
    await rp.screenshot({ path: path.join(SHOTS, 'shell-arrival-reduced-390.png') });
    await rp.close(); await rctx.close();
  }

  // ── no WebGL at all: the same destination, without the journey ─────────
  {
    /* The third CODE path, and deliberately not a third OUTCOME (owner,
       22 Sep 2026): a device that cannot animate is not shown a different kind
       of screen, it just arrives quietly. This is the tier that must never
       strand anyone, so it is worth a real run rather than an argument. */
    const np = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const npErrors = []; np.on('pageerror', e => npErrors.push(String(e)));
    await np.addInitScript(`
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type) {
        if (String(type).indexOf('webgl') === 0) return null;
        return g.apply(this, arguments);
      };
    `);
    await np.goto(base); await settle(np);
    await np.waitForFunction(() => window.shellState().view === 'shelves', null, { timeout: 40000 });
    ok(await np.evaluate(() => window.prmApi === null), 'with no WebGL context, no room is built at all');
    ok(await shown(np, 'shell-phone'), 'and the player still lands in the Shelves — never stranded on an empty lounge');
    ok(await np.evaluate(() => window.shellState().arrival === 'done'), 'the same one-way rule applies afterwards');
    ok(npErrors.length === 0, `no uncaught page errors with no WebGL (${npErrors.slice(0, 2).join(' | ') || 'none'})`);
    await np.close();
  }

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

    /* ── The return destination itself (shared-implementation-notes DD-18) ──
       Everything above proves the hook end-to-end through the sandbox's own
       door, which always wants the DEFAULT screen. These three drive
       ctlOpenWorkshop directly to pin the parameter: a non-default destination
       is honoured, the bare call is unchanged, and the destination does not
       outlive its session.

       Read as GEOMETRY, never as .style.display — BUG-19's lesson. A check that
       consults the property the code under test writes can only confirm the
       renderer agrees with itself; a box is the honest answer. #live-screens
       therefore stays visible for the whole probe, and is put away at the end. */
    const boxed = (id) => lp.evaluate((i) => {
      const el = document.getElementById(i);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, id);
    // A destination that is a real registered screen but is NOT the lobby.
    // screen-who-first ships in _shell.html and is in the engine's allScreens[].
    const probe = async (opts) => lp.evaluate((o) => {
      window.__ctlReturnFired = null;
      document.getElementById('live-screens').hidden = false;
      const hook = (design) => { window.__ctlReturnFired = design; };
      window.ctlOpenWorkshop(o ? { returnScreen: o, onReturn: hook } : undefined);
    }, opts || null);

    await probe('screen-who-first');
    await lp.waitForFunction(() => document.getElementById('screen-workshop').getBoundingClientRect().height > 0,
      null, { timeout: 20000 });
    await lp.click('#btn-ctl-exit');
    await lp.waitForFunction(() => document.getElementById('screen-workshop').getBoundingClientRect().height === 0,
      null, { timeout: 20000 });
    ok(await boxed('screen-who-first'), 'a custom returnScreen is where the Workshop lands');
    ok(!(await boxed('screen-lobby')), 'and screen-lobby is NOT shown — the hardcoding is gone');
    const fired = await lp.evaluate(() => window.__ctlReturnFired);
    ok(fired && typeof fired.shell === 'string',
       'onReturn ran, and was handed the design that survived the close');

    await probe(null);
    await lp.waitForFunction(() => document.getElementById('screen-workshop').getBoundingClientRect().height > 0,
      null, { timeout: 20000 });
    await lp.click('#btn-ctl-exit');
    await lp.waitForFunction(() => document.getElementById('screen-workshop').getBoundingClientRect().height === 0,
      null, { timeout: 20000 });
    ok(await boxed('screen-lobby'), 'the bare call still lands on the lobby — the default is unchanged');
    /* Defended twice over — ctlOpenWorkshop rewrites the pair on every entry AND
       ctlTeardown clears it. Mutating either alone leaves this green; only
       removing both turns it (and its two neighbours) red. Verified 21 Sep 2026. */
    ok(!(await boxed('screen-who-first')),
       'and the previous session\'s destination did not persist');
    ok((await lp.evaluate(() => window.__ctlReturnFired)) === null,
       'a bare open fires no onReturn, so the lobby keeps its own remount');

    await lp.evaluate(() => { document.getElementById('live-screens').hidden = true; });

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

  // ── Walking back IN through a door the room opened ────────────────────────
  /* Every check above leaves Premium by shellDispatch or the dock — the one
     way out a player never takes. The room's own exits are transitions: the
     phone runs fadeOut() and the dial runs pushIn(), and BOTH leave #prm-fade
     lit, deliberately, so the handoff to the next layout is seamless. Only
     resetView() ever clears it, and nothing called it on the way back in, so
     the lounge returned underneath an opaque off-white pane. Going out by the
     front door and in by the window is how a whole class of transition state
     stays invisible: assert the round trip a player actually makes. */
  {
    const fadeLit = (p) => p.evaluate(() => getComputedStyle(document.getElementById('prm-fade')).opacity !== '0');
    for (const [door, landing] of [['phone', 'shelves'], ['dial', 'tv']]) {
      const dp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await dp.goto(`${base}?seed=7`); await settle(dp);
      await dp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
      ok(!(await fadeLit(dp)), `the ${door} door: the lounge starts unfaded`);

      await dp.evaluate(d => window.prmApi.activate(d), door);
      await dp.waitForFunction(v => window.shellState().view === v, landing, { timeout: 20000 });
      ok(await fadeLit(dp), `and taking it to ${landing} does fade the room out, as the handoff intends`);

      await dp.evaluate(() => window.shellDispatch({ t: 'go', view: 'premium' }));
      await dp.waitForFunction(() => window.shellState().view === 'premium', null, { timeout: 15000 });
      /* Poll, don't sleep. The pane clears by a 200 ms opacity transition that
         starts whenever the compositor gets to it — behind a resumed room's
         first heavy frames under swiftshader that was well past a fixed 600 ms
         wait, which failed this for timing reasons while the fix was in. If the
         defect is present the pane never clears at all and this times out.
         12 s, not 4 (room pass round 1, 24 Sep 2026): a resumed room's frames
         run ~0.7 s each under swiftshader, and timed runs cleared in 3.8–5.8 s
         BEFORE that round's contact shade and 5.0–6.5 s after it — the 4 s cap
         was measuring the host. The defect this guards is "never"; frame cost
         is measured separately, by a held-state probe (DD-25 § 3). */
      let cleared = true;
      try { await dp.waitForFunction(() => getComputedStyle(document.getElementById('prm-fade')).opacity === '0', null, { timeout: 12000 }); }
      catch (_) { cleared = false; }
      ok(cleared, `and walking back in through the ${door} door shows the room, not a blank pane`);
      await dp.close();
    }
  }

  // ── the stickerbook: the binder's door, a sticker peeled onto its sleeve, and back ─
  /* Prototype, 23 Sep 2026 (spec 2026-09-23-stickerbook-achievements-design.md).
     The whole loop a player walks: press Play on a game (the real sheet CTA, so
     the event hook is proven, not assumed), tap the binder, the cover flips and
     the camera pushes in, the book is up over a stopped room; the new sticker
     waits in the tray; a tap flies it to its sleeve; the placement survives a
     reload; ✕ lands back in a running lounge with the binder SHUT and the fade
     pane clear — the same "walk back in" trap as the section above. */
  {
    const sp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; sp.on('pageerror', e => errs.push(e.message));
    /* Record every named sound WITH the binder's hinge angle at that moment — the
       flump is "the cover landing", so it must play once the cover is down. */
    await sp.addInitScript(() => {
      window.__sfx = [];
      /* Intercept the ASSIGNMENT, not poll for it: the shell builds its sfx in the
         same task prm-sfx.js loads in, before any interval could fire. */
      let lib;
      Object.defineProperty(window, 'PrmSfx', { configurable: true, get() { return lib; }, set(v) {
        const real = v.prmCreateSfx;
        v.prmCreateSfx = function (...a) {
          const inst = real.apply(this, a);
          return Object.assign({}, inst, { play(n) { const b = window.prmApi && window.prmApi.built.binder; window.__sfx.push({ n, angle: b ? b.userData.api.angle() : null }); return inst.play(n); } });
        };
        lib = v; } });
    });
    await sp.goto(`${base}?seed=7`); await settle(sp);
    await sp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
    await sp.evaluate(() => { try { localStorage.removeItem('lsg_sandbox_achievements'); } catch (_) {} window.shellAchDispatch({ t: 'reset' }); });

    // a Play press earns the sticker — through the Shelves sheet's real CTA
    await sp.evaluate(() => { window.shellDispatch({ t: 'go', view: 'shelves' }); window.lbSet({ sheet: 'cjar' }); });
    await sp.waitForSelector('#lb-play', { timeout: 10000 });
    await sp.click('#lb-play');
    ok(await sp.evaluate(() => (window.shellAch().plays.cjar || 0) === 1), 'pressing Play on Cookie Jar counts one play');
    ok(await sp.evaluate(() => document.getElementById('shell-toast').classList.contains('on')), 'and the shell says a new sticker is in the binder');
    await sp.evaluate(() => window.shellDispatch({ t: 'go', view: 'premium' }));
    await sp.waitForFunction(() => window.shellState().view === 'premium' && window.shellState().room === 'running', null, { timeout: 15000 });
    ok(await sp.evaluate(() => window.prmApi.built.binder.userData.api.collection().tray.indexOf('cjar') !== -1), 'the 3D binder\'s tray now holds it');

    // the door: flip, push in, the book
    await sp.evaluate(() => window.prmApi.activate('binder'));
    await sp.waitForFunction(() => window.shellState().stickerbook === true, null, { timeout: 20000 });
    ok(await sp.evaluate(() => window.prmApi.built.binder.userData.api.isOpen()), 'the binder flipped open on the way in');
    { const heard = await sp.evaluate(() => window.__sfx.filter(s => s.n === 'binderOpen'));
      ok(heard.length === 1 && heard[0].angle > Math.PI - 0.2, `the flump plays once, as the cover LANDS (at ${heard.length ? heard[0].angle.toFixed(2) : '—'} rad of π)`); }
    ok(await sp.evaluate(() => !document.getElementById('shell-stickerbook').hidden), 'the stickerbook is up');
    ok(await sp.evaluate(() => window.shellState().room === 'idle' && window.prmDebug.isRunning() === false), 'and the room under it is stopped, not disposed');
    ok(await sp.evaluate(() => getComputedStyle(document.getElementById('prm-hud')).visibility === 'hidden'), 'the lounge heading is out of the way');
    ok(await sp.evaluate(() => !!document.querySelector('.sb-tray-item[data-id="cjar"]')), 'Cookie Jar waits in the tray');
    ok(await sp.evaluate(() => document.querySelectorAll('.sb-sleeve[data-state="locked"]').length >= 7), 'unearned sleeves show as locked');
    const layout = await sp.evaluate(() => { const b = document.querySelector('.sb-binder').getBoundingClientRect(), s = document.querySelector('.sb-spread').getBoundingClientRect();
      return { inside: s.right <= b.right + 0.5 && s.left >= b.left - 0.5, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
    ok(layout.inside && layout.sw <= layout.cw, 'the spread fits inside the binder, no sideways scroll');
    await sp.screenshot({ path: path.join(SHOTS, 'shell-stickerbook-1280.png') });

    // a locked sleeve explains itself; the tray sticker is tapped onto its sleeve
    await sp.click('.sb-sleeve[data-id="li5"]');
    ok(/once to unlock/.test(await sp.evaluate(() => document.getElementById('sb-pop').textContent)), 'tapping a locked sleeve says how to unlock it');
    await sp.click('.sb-tray-item[data-id="cjar"]');
    /* Cookie Jar's sleeve is on page 5, not the open spread, so the book turns
       under the tap — the ghost must still be measured off a LIVE tray item. */
    ok(await sp.waitForFunction(() => { const g = document.querySelector('.sb-ghost'); return !!g && g.getBoundingClientRect().width > 20; }, null, { timeout: 2000 }).then(() => true, () => false),
      'the tap flies a real-sized sticker to a sleeve on another page');
    await sp.waitForFunction(() => window.shellAch().placed.cjar === true, null, { timeout: 5000 });
    ok(await sp.evaluate(() => { const s = document.querySelector('.sb-sleeve[data-id="cjar"]'); return !!s && s.dataset.state === 'placed'; }), 'a tap peels it onto its own sleeve (the book turned to its page)');
    ok(await sp.evaluate(() => !document.querySelector('.sb-tray-item[data-id="cjar"]') && !document.querySelector('.sb-ghost')), 'and it has left the tray, with no ghost left behind');
    ok(await sp.evaluate(() => { try { return JSON.parse(localStorage.getItem('lsg_sandbox_achievements')).placed.cjar === true; } catch (_) { return false; } }), 'the placement is stored');

    // the dev panel reaches the 100% tag
    await sp.evaluate(() => { document.getElementById('sb-dev').open = true; document.getElementById('sb-dev-game').value = 'cjar'; });
    await sp.click('[data-dev="5"]'); await sp.click('[data-dev="5"]');
    ok(await sp.evaluate(() => !!document.querySelector('.sb-sleeve[data-id="cjar"] .sb-tag')), 'ten plays: the 100% Complete tag');

    // a DRAG onto a sleeve on another page (the book turns under the drag)
    await sp.evaluate(() => ['li5', 'gm', 'ss'].forEach(id => window.shellAchDispatch({ t: 'devAdd', id, n: 1 })));
    await sp.waitForSelector('.sb-tray-item[data-id="li5"]');
    { const c = await sp.evaluate(() => { const r = document.querySelector('.sb-tray-item[data-id="li5"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await sp.mouse.move(c[0], c[1]); await sp.mouse.down(); await sp.mouse.move(c[0] + 12, c[1] + 4, { steps: 3 });
      const t = await sp.evaluate(() => { const s = document.querySelector('.sb-sleeve[data-id="li5"]'); if (!s) return null; const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, s.classList.contains('sb-target')]; });
      ok(t && t[2], 'dragging turns the book to its sleeve, which glows');
      if (t) await sp.mouse.move(t[0], t[1], { steps: 8 });
      await sp.mouse.up();
      ok(await sp.waitForFunction(() => window.shellAch().placed.li5 === true, null, { timeout: 3000 }).then(() => true, () => false), 'dropped on its own sleeve, it is placed');
      await sp.waitForTimeout(400);
      ok(await sp.evaluate(() => !document.querySelector('.sb-ghost') && !document.querySelector('.sb-target')), 'and no ghost or glow is left behind'); }

    // a second finger mid-drag must not strand the first finger's ghost
    { const at = await sp.evaluate(() => ['gm', 'ss'].map(id => { const r = document.querySelector(`.sb-tray-item[data-id="${id}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
      await sp.evaluate((at) => {
        const fire = (type, id, x, y, el) => (el || document.elementFromPoint(x, y)).dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, pointerType: 'touch' }));
        const a = document.querySelector('.sb-tray-item[data-id="gm"]'), b = document.querySelector('.sb-tray-item[data-id="ss"]');
        fire('pointerdown', 1, at[0][0], at[0][1], a); fire('pointermove', 1, at[0][0] + 30, at[0][1] + 20, a);
        fire('pointerdown', 2, at[1][0], at[1][1], b); fire('pointerup', 2, at[1][0], at[1][1], b);
        fire('pointerup', 1, 5, 5, a);
      }, at);
      await sp.waitForTimeout(700);
      ok(await sp.evaluate(() => !document.querySelector('.sb-ghost')), 'a second finger mid-drag leaves no stranded ghost');
      ok(await sp.evaluate(() => [...document.querySelectorAll('.sb-tray-item')].every(n => getComputedStyle(n).visibility !== 'hidden')), 'and every tray sticker is back in view'); }

    // ✕: back to a running lounge, binder shut, no pane
    await sp.click('#sb-close');
    await sp.waitForFunction(() => window.shellState().stickerbook === false && window.shellState().room === 'running', null, { timeout: 15000 });
    ok(await sp.evaluate(() => document.getElementById('shell-stickerbook').hidden), 'the ✕ closes the book');
    ok(await sp.evaluate(() => !window.prmApi.built.binder.userData.api.isOpen()), 'and the binder is shut again');
    let cleared = true;
    try { await sp.waitForFunction(() => getComputedStyle(document.getElementById('prm-fade')).opacity === '0', null, { timeout: 4000 }); } catch (_) { cleared = false; }
    ok(cleared, 'and the room shows, not the push-in\'s fade pane');
    ok(await sp.evaluate(() => getComputedStyle(document.getElementById('prm-hud')).visibility !== 'hidden'), 'with its heading back');

    // a reload keeps the book
    await sp.reload(); await settle(sp);
    ok(await sp.evaluate(() => window.shellAch().placed.cjar === true && window.shellAch().plays.cjar === 11), 'a reload keeps the plays and the placement');
    ok(errs.length === 0, 'no page errors along the way' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await sp.evaluate(() => { try { localStorage.removeItem('lsg_sandbox_achievements'); } catch (_) {} });
    await sp.close();

    // phone width: the tray strip over one page
    const pp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pp.goto(`${base}?reduced`); await settle(pp);
    await pp.evaluate(() => { window.shellAchDispatch({ t: 'reset' }); window.shellAchDispatch({ t: 'devAdd', id: 'gm', n: 2 }); window.shellDispatch({ t: 'stickerbookOpen' }); });
    await pp.waitForFunction(() => !document.getElementById('shell-stickerbook').hidden, null, { timeout: 15000 });
    const ph = await pp.evaluate(() => ({ pages: document.querySelectorAll('.sb-page').length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      label: document.getElementById('sb-pages').textContent }));
    ok(ph.pages === 1 && ph.sw <= ph.cw && ph.label === 'Page 1 of 5', `phone: one page at a time, no sideways scroll (${ph.label})`);
    { const ta = await pp.evaluate(() => { const l = document.querySelector('.sb-tray-list'); return getComputedStyle(l).touchAction; });
      ok(/pan-x/.test(ta), `phone: the tray strip still scrolls sideways under a finger (touch-action ${ta})`); }
    await pp.screenshot({ path: path.join(SHOTS, 'shell-stickerbook-390.png') });
    await pp.evaluate(() => { window.shellAchDispatch({ t: 'reset' }); try { localStorage.removeItem('lsg_sandbox_achievements'); } catch (_) {} });
    await pp.close();
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
