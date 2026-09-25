// review-prop.js — render one prop's review sheet (prop-review.html) to a PNG.
// The prop-quality rounds' gate before anything is shown to the owner (plan
// docs/superpowers/plans/2026-09-22-premium-prop-quality.md § 1). Run from the repo root:
//   NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/review/review-prop.js jukebox coded
//   → wip/premium/shots/review-jukebox-coded.png
// Asserts nothing: it is an instrument, like the balance simulators. Exits 1
// only if the page throws, so a broken builder cannot hand over a blank sheet.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..', '..'), SHOTS = path.join(__dirname, '..', 'shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const prop = process.argv[2] || 'jukebox', pal = process.argv[3] || 'mock', extra = process.argv[4] || '';
function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) { try { return require(c); } catch (_) {} }
  throw new Error('Playwright not found — see .claude/skills/visual-check/SKILL.md § 2');
}
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, '127.0.0.1', async () => {
  const pw = loadPlaywright();
  const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1280 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/wip/premium/review/prop-review.html?prop=${prop}&pal=${pal}&${extra}`);
  const done = await pg.waitForFunction(() => window.reviewDone === true, null, { timeout: 60000 }).then(() => true, () => false);
  fs.mkdirSync(SHOTS, { recursive: true });
  const tag = (extra.match(/beat=(\w+)/) || [])[1] || (/open=1/.test(extra) ? 'open' : ''); const out = path.join(SHOTS, `review-${prop}-${pal}${tag ? '-' + tag : ''}.png`);
  await pg.screenshot({ path: out });
  await b.close(); srv.close();
  if (!done || errs.length) { console.error('review page failed:\n' + errs.join('\n')); process.exit(1); }
  console.log('wrote ' + path.relative(ROOT, out));
});
