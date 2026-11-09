/* capture-screens.js — the before/after set for a game's revamp pass (UI revamp
   Stage 0 · docs/rules/ui-revamp.md § 7 · R1 and R15).

       node tools/capture-screens.js <abbr> before|after [--size 375x667] [--reduced] [--overlays]

   Serves the repo, opens the REAL index.html in headless Chromium (the visual-check
   skill's renderer) and screenshots every <section id="screen-…"> in the game's
   partial(s) — src/screens/<abbr>.html plus <abbr>-*.html — into the git-ignored
   wip/revamp/<abbr>/<before|after>/, numbered in markup order, with an index.json.
   --overlays also shows each <div id="…-overlay"> in those partials, one at a time.

   A screen is shown with showScreen() and NOTHING else, so most gameplay screens come
   out as their empty shell. To seed state, drop an optional
   wip/revamp/<abbr>/seed.js:  module.exports = { all: async page => {}, 'screen-x': async page => {} }
   (page.evaluate inside; the visual-check skill § 3 has the `let`-binding trap).

   Needs Playwright, deliberately NOT a project dependency — absent, it says so and
   exits 0. Service workers are blocked; ANGLE-over-swiftshader as visual-lobby.js. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

const args = process.argv.slice(2);
const abbr = args[0], phase = args[1];
const flag = n => args.includes('--' + n);
const opt  = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
if (!abbr || !/^(before|after)$/.test(phase || '')) {
  console.log('usage: node tools/capture-screens.js <abbr> before|after [--size 375x667] [--reduced] [--overlays]');
  process.exit(1);
}
const [vw, vh] = opt('size', '375x667').split('x').map(Number);

const partials = fs.readdirSync(path.join(ROOT, 'src/screens'))
  .filter(f => f === abbr + '.html' || f.startsWith(abbr + '-'));
if (!partials.length) { console.log(`no partial for "${abbr}" in src/screens/`); process.exit(1); }
const markup  = partials.map(f => fs.readFileSync(path.join(ROOT, 'src/screens', f), 'utf8')).join('\n');
// Any tag (LI5's menu is a <main>), plus screen-<abbr>-… living in a shared partial
// (screen-li5-monitor is in _mp.html).
const SCREEN_RE = /<(?:section|main|div)\b[^>]*\bid="(screen-[^"]+)"/g;
const shared  = fs.readdirSync(path.join(ROOT, 'src/screens')).filter(f => f.startsWith('_'))
  .map(f => fs.readFileSync(path.join(ROOT, 'src/screens', f), 'utf8')).join('\n');
const screens = [...new Set([
  ...[...markup.matchAll(SCREEN_RE)].map(m => m[1]),
  ...[...shared.matchAll(SCREEN_RE)].map(m => m[1]).filter(id => id.startsWith(`screen-${abbr}-`)),
])];
const overlays = flag('overlays') ? [...markup.matchAll(/<div\b[^>]*\bid="([a-z0-9-]+-overlay)"/g)].map(m => m[1]) : [];

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

(async () => {
  const pw = loadPlaywright();
  if (!pw) { console.log('Playwright not found — capture-screens skipped (exit 0). See the visual-check skill § 2.'); return; }
  const outDir = path.join(ROOT, 'wip', 'revamp', abbr, phase);
  fs.mkdirSync(outDir, { recursive: true });
  const seedFile = path.join(ROOT, 'wip', 'revamp', abbr, 'seed.js');
  const seed = fs.existsSync(seedFile) ? require(seedFile) : {};
  const srv = await serve();
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, serviceWorkers: 'block',
                                         reducedMotion: flag('reduced') ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?lobbydebug`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.lobbyReady === true, null, { timeout: 30000 }).catch(() => {});
  // Leave the lobby the way a game launch does: its 3D room keeps rendering otherwise,
  // and under software GL that makes every screenshot take ~20 s.
  await page.evaluate(() => { if (typeof lobbyLeaveForGame === 'function') lobbyLeaveForGame(); });
  if (seed.all) await seed.all(page);

  const shots = [];
  let n = 0;
  const shoot = async (kind, id, show) => {
    n++;
    const file = `${String(n).padStart(2, '0')}-${id}.png`;
    const before = errs.length;
    try {
      await page.evaluate(show, id);
      if (seed[id]) await seed[id](page);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
      shots.push({ kind, id, file, errors: errs.slice(before) });
      console.log(`  ${file}${errs.length > before ? '   (threw: ' + errs[errs.length - 1].slice(0, 80) + ')' : ''}`);
    } catch (e) {
      shots.push({ kind, id, file: null, errors: [String(e)] });
      console.log(`  ${id} — could not capture: ${String(e).split('\n')[0]}`);
    }
  };
  console.log(`capture-screens: ${abbr} ${phase} at ${vw}×${vh} → wip/revamp/${abbr}/${phase}/`);
  for (const id of screens) await shoot('screen', id, sid => showScreen(sid));
  for (const id of overlays) {
    await shoot('overlay', id, oid => {
      document.querySelectorAll('[id$="-overlay"]').forEach(o => { if (o.style.display === 'flex') o.style.display = 'none'; });
      const el = document.getElementById(oid); if (el) el.style.display = 'flex';
    });
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
    abbr, phase, viewport: [vw, vh], reducedMotion: flag('reduced'), when: new Date().toISOString(), shots,
  }, null, 2));
  console.log(`${shots.filter(s => s.file).length} captured, ${shots.filter(s => s.errors.length).length} with page errors`);
  await browser.close();
  srv.close();
})();
