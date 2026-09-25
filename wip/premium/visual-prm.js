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
  /* SwiftShader screenshots of the live room take 13–20 s each (measured 23 Sep 2026, a render
     loop that never idles at 2–3 fps), so Playwright's default 30 s left no headroom and the
     portrait shot timed out on a busy machine — flaky, not failing: identical code passed and
     failed on consecutive runs. A timeout here measures the host, not the scene. */
  const SHOT = { timeout: 120000 };
  const settle = async (page) => { await page.waitForFunction(() => window.prmReady === true, null, { timeout: 20000 }); await page.waitForTimeout(1500); };

  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url); await settle(page);
    await page.screenshot({ path: path.join(SHOTS, `wide-${w}.png`), ...SHOT });
    ok(true, `screenshot wide-${w}.png`);
    if (w === 1280) {
      /* Wait for the counter to MOVE, not a fixed 600 ms: a SwiftShader frame is ~770 ms since the room
         pass's round 3 (the table's grain), longer than that window, so a live loop could fail it. A
         stopped loop still fails — it never advances in 5 s. */
      const f0 = await page.evaluate(() => window.prmDebug.frames());
      const f1 = await page.waitForFunction(f => window.prmDebug.frames() > f, f0, { timeout: 5000 }).then(() => page.evaluate(() => window.prmDebug.frames())).catch(() => f0);
      ok(f1 > f0, 'normal motion: the loop keeps rendering while the idle rotations run');
      // spec 2026-09-19 § 7 items 6 and 8 — the light rig and the mood, measured
      const lights = await page.evaluate(() => window.prmDebug.lights());
      const casters = lights.filter(l => l.castShadow);
      ok(casters.length === 1, `exactly one shadow-casting light (${casters.map(l => l.name).join(',') || 'none'})`);
      ok(casters[0] && casters[0].position[0] < -1.6, 'the caster sits outside the left wall (the window is the light)');
      ok(!lights.some(l => l.name === 'bulb'), 'no floor-lamp bulb light remains');
      /* The rig by NAME (room pass, item 9). Round 1's window glow was swallowed by a comment on its
         own line and nothing noticed for seven rounds: no check named a light. A light added or lost
         now fails here, and the list is the one place the rig is written down. */
      const RIG = ['dialLight', 'fill', 'lampFill', 'slit', 'sun', 'tvLight'];
      const names = lights.map(l => l.name).sort();
      ok(JSON.stringify(names) === JSON.stringify(RIG), `the light rig is exactly ${RIG.join(', ')} (got ${names.join(', ')})`);
      const aim = await page.evaluate(() => { const S = window.prmDebug.three, t = S.scene.getObjectByName('sun').target.position; return { t: t.toArray(), pool: S.room.userData.prmRoom.sunPool }; });
      ok(aim.t.every((v, i) => Math.abs(v - aim.pool[i]) < 1e-9), `the sun aims at the pool the window's shafts land on (${aim.t.join(', ')})`);
      const grid = await page.evaluate(() => window.prmDebug.lumaGrid(8, 5));
      const mean = grid.reduce((a, b) => a + b, 0) / grid.length, lo = Math.min(...grid), hi = Math.max(...grid);
      /* The room pass (24 Sep 2026) lifted spec D7's "darker" — but brightness was never the gap:
         the owner's mockup measures mean luma 113 on this same grid, BELOW the old room's 121. What
         read as flat was colour: HSL saturation 0.23 against the mockup's 0.47. So the band stays,
         and saturation gets a floor of its own. */
      ok(mean > 60 && mean < 150, `frame is neither dim nor blown (mean luma ${mean.toFixed(0)}, want 60–150)`);
      ok(hi / Math.max(lo, 1) >= 2.2, `there is a lit wall and a dark corner (patch range ${lo.toFixed(0)}–${hi.toFixed(0)})`);
      const sat = await page.evaluate(() => window.prmDebug.saturation());
      ok(sat >= 0.30, `the room is not flat (mean HSL saturation ${sat.toFixed(3)}, want >= 0.30; was 0.23 before the room pass, mockup 0.47)`);
      const lampBox = await page.evaluate(() => window.prmDebug.screenBox('lamp'));
      ok(lampBox && lampBox.h >= 48, `the photo lamp is a reachable target on the shelf (${lampBox ? lampBox.h.toFixed(0) : '?'} px tall at 1280x720, want >= 48)`);
      /* Prop round 3: the jukebox's dormant door is its whole body, answered by
         the prop's own bop. The pick id is not the prop id, so the scene has to
         find the api through the action's `prop` — and prmMount's activate() is
         out of every Node harness's reach, which makes this the only check that
         the routing is actually live. */
      await page.evaluate(() => window.prmApi.activate('jukebox-knob'));
      const bopped = await page.waitForFunction(() => window.prmDebug.api.built.jukebox.userData.api.bopAmount() > 0.001, null, { timeout: 5000 }).then(() => true, () => false);
      ok(bopped, "a tap on the jukebox's body (its dormant door) hops it — the scene found the prop's bop");
      await page.evaluate(() => window.prmApi.setPreset('portrait')); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, `portrait-preset-${w}.png`), ...SHOT });
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
  await page.screenshot({ path: path.join(SHOTS, 'reduced-1280.png'), ...SHOT });
  // the honest card below the floor
  const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await small.goto(url); await small.waitForFunction(() => window.prmReady === true);
  ok(await small.evaluate(() => document.getElementById('prm-card').classList.contains('on')), 'portrait phone shows the honest card');
  // keyboard: Tab into the canvas, arrows walk the order, Enter activates the dial (spin), Escape clears
  const kb = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  /* Record every sfx name the scene asks for. A send site with no receiver
     cannot be wrong in a way one device notices -- the scene's own state is
     right whatever it names -- and no pure harness reaches prmMount's activate()
     at all, so this is the only tier that can tell a wired hook from a dead one.
     Swapping the factory keeps the real page wiring in the path: index.html
     still builds the host exactly as it does for a player. */
  await kb.addInitScript(() => {
    window.__sfx = [];
    const wait = setInterval(() => {
      if (!window.PrmSfx) return; clearInterval(wait);
      const real = window.PrmSfx.prmCreateSfx;
      window.PrmSfx.prmCreateSfx = function (...a) {
        const inst = real.apply(this, a);
        return Object.assign({}, inst, { play(n) { window.__sfx.push(n); return inst.play(n); } });
      };
    }, 0);
  });
  await kb.goto(url); await settle(kb);
  await kb.focus('#prm-canvas'); await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('ArrowRight'); await kb.waitForTimeout(100);
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'block'), 'keyboard: focus ring is drawn');
  await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('Enter');
  /* Poll rather than sleep a fixed span: the spin is 1800 ms + a 250 ms beat +
     a 600 ms push-in, and every one of those advances only when the render loop
     ticks — which under SwiftShader is ~3.5 fps, so a fixed 2.6 s wait checks
     too early on this machine and would still be a lie on a fast one. */
  const handedOff = await kb.waitForFunction(() => /TV mode would open on /.test(document.getElementById('prm-status').textContent), null, { timeout: 12000 }).then(() => true, () => false);
  ok(handedOff, 'keyboard: Enter on the dial spins and hands a game to TV mode');
  const heard = await kb.evaluate(() => window.__sfx.slice());
  ok(heard.join(',') === 'dialPress', `the button's click is the dial's one sound (got ${JSON.stringify(heard)})`);
  await kb.evaluate(() => window.prmApi.resetView()); await kb.keyboard.press('Escape');
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'none'), 'keyboard: Escape clears the ring');
  /* Prop round 4: the phone rests closed, and its door is a flip, a push-in on
     the lit screen, then the Shelves. The pure tier drives the prop's open()
     directly; only here does a tap go through prmMount's activate() and the
     page's real host — so this is what proves the door waits on the flip and
     names its sound, and that walking back in finds the phone put down. */
  await kb.evaluate(() => { window.__sfx.length = 0; });
  ok(await kb.evaluate(() => !window.prmApi.built.phone.userData.api.isOpen()), 'the phone rests closed in the room');
  await kb.evaluate(() => window.prmApi.activate('phone'));
  const shelved = await kb.waitForFunction(() => /Shelves would open/.test(document.getElementById('prm-status').textContent), null, { timeout: 12000 }).then(() => true, () => false);
  ok(shelved && await kb.evaluate(() => { const a = window.prmApi.built.phone.userData.api; return a.isOpen() && a.backlight() === 1; }),
     'a tap flips it open and lights it, and only then opens the Shelves');
  const heardPhone = await kb.evaluate(() => window.__sfx.slice());
  ok(heardPhone.join(',') === 'phoneOpen', `the flip's clack is the phone's one sound (got ${JSON.stringify(heardPhone)})`);
  await kb.evaluate(() => window.prmApi.resetView());
  ok(await kb.evaluate(() => !window.prmApi.built.phone.userData.api.isOpen()), 'and Reset view puts it back down, closed');
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

  /* Reset view, taken DURING a transition — which is a first-class move, not an
     edge case: #prm-hud sits above #prm-fade precisely "so Reset view stays
     reachable", and the status line tells the player to use it to come back.
     pushIn() schedules its fade through later(), so a reset that abandoned only
     the camera tween left that timeout armed: the room faded itself out a beat
     after the player had asked to be back in it, with no door taken. */
  /* Its OWN context: this file's `ctx` is reducedMotion:'reduce' throughout,
     which collapses pushIn's fade to later(..., 0) — it then lands BEFORE a
     separately-dispatched reset instead of after it, and the check passes
     while proving nothing. The race only exists at full motion, so ask for it. */
  const rvCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
  const rv = await rvCtx.newPage(); await rv.goto(url); await settle(rv);
  /* The CLASS, not the computed opacity. Opacity is a 200 ms transition the
     compositor starts when it feels like it — on a stopped room under
     SwiftShader it read '0' for a second after the class was already back on,
     which is long enough to pass this check while the pane lights up behind it.
     The class is the fact; the opacity is a consequence of it. */
  const faded = () => rv.evaluate(() => document.getElementById('prm-fade').classList.contains('on'));
  await rv.evaluate(() => window.prmApi.activate('tv-screen'));   // a plain pushIn door, no spin in front of it
  await rv.evaluate(() => window.prmApi.resetView());
  ok(!(await faded()), 'Reset view during a push-in clears the pane at once');
  await rv.waitForTimeout(1500);   // well past PRM_FADE_AT_MS — a surviving timeout has fired by now
  ok(!(await faded()), 'and no abandoned timeout fades the room out behind it');
  await rv.close(); await rvCtx.close();

  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
