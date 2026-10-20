/* add-cabinet.js — integrate an Arcade cabinet file into the real game.

       node tools/add-cabinet.js <id> --blurb "One line." --accent "#34d399" [options]

   Does the seams that are identical every time (docs/code-map.md § Arcade Cabinets;
   js/arcade/arcade-cabinet-prompt.md Step 6):

     1  ARC_CABINETS entry            js/lobby/arcade.js
     2  allScreens[] entry            js/engine.js
     3  cabinet <section> markup      src/screens/_secret.html
     4  <script src>                  src/screens/_scripts-3.html
     5  PRECACHE_URLS + CACHE_NAME    sw.js
     6  header "ARCADE CABINET 0N"    js/arcade/<id>.js
     7  roster row + code-map row     js/arcade/arcade-roster.md, docs/code-map.md
     then: node tools/build-index.js, verify-build-fresh, verify-arcade, smoke-arcade.

   Everything is READ from the cabinet file — id, prefix (from getElementById('xx-canvas')),
   label (XX_TITLE), entry (xxStart) and teardown (resetArcade*). What the file cannot say
   comes from flags: --blurb and --accent are required (the room's one-liner and row colour).

   Options
     --label "X"     override the room label (default: the file's XX_TITLE)
     --bump          force a CACHE_NAME bump      --no-bump   never bump
                     (default: bump once per uncommitted batch — only if sw.js still
                     carries the version in git HEAD, so a batch of cabinets costs ONE
                     bump; it says so either way)
     --no-check      skip the build + harnesses   --dry       print the plan, write nothing

   Still by hand (narrative, not mechanical): CLAUDE.md Current Focus + sw-changelog,
   docs/deferred-work.md, a shared-implementation-notes entry if a lesson emerged.

   ARC_ROOT=<dir> points it at another tree (used to prove it against a scratch copy;
   implies --no-check). A seam already present is reported and left alone, so a half-done
   integration can be finished by re-running. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = process.env.ARC_ROOT ? path.resolve(process.env.ARC_ROOT) : path.resolve(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const val = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const id = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && /^--(blurb|accent|label)$/.test(argv[i - 1])));
const DRY = flag('dry'), NOCHECK = flag('no-check') || !!process.env.ARC_ROOT;
const die = m => { console.error('✗ ' + m); process.exit(1); };

if (!id) die('usage: node tools/add-cabinet.js <id> --blurb "One line." --accent "#hex" [--label X] [--bump|--no-bump] [--no-check] [--dry]');
const blurb = val('blurb'), accent = val('accent');
if (!blurb) die('--blurb is required (the one line under the room list)');
if (!accent || !/^#[0-9a-fA-F]{6}$/.test(accent)) die('--accent is required, as #rrggbb (the room row\'s highlight)');

// ── read the cabinet ────────────────────────────────────────────────────────
const rel = `js/arcade/${id}.js`;
if (!fs.existsSync(path.join(ROOT, rel))) die(`${rel} not found`);
const src = R(rel);
const px = (src.match(/getElementById\('(\w+)-canvas'\)/) || [])[1];
if (!px) die(`${rel} never calls getElementById('<prefix>-canvas') — cannot derive the prefix`);
const startFn = `${px}Start`;
if (!new RegExp(`^function ${startFn}\\(`, 'm').test(src)) die(`${rel} has no function ${startFn}()`);
const stopFn = (src.match(/^function (resetArcade\w*)\(/m) || [])[1];
if (!stopFn) die(`${rel} has no function resetArcade*() teardown`);
const screen = `screen-arcade-${id}`;
if (!src.includes(`showScreen('${screen}')`)) die(`${startFn}() does not showScreen('${screen}')`);
if (!new RegExp(`getElementById\\('btn-${px}-exit'\\)[\\s\\S]{0,400}?${stopFn}\\(\\);?\\s*arcExitCabinet\\(\\)`).test(src))
  die(`the ✕ handler must call ${stopFn}(); arcExitCabinet(); — see the skeleton`);
const label = val('label') || (src.match(new RegExp(`const ${px.toUpperCase()}_TITLE\\s*=\\s*'([^']+)'`)) || [])[1];
if (!label) die(`no ${px.toUpperCase()}_TITLE constant and no --label`);

// ── plan: collect every write, apply at the end ─────────────────────────────
const writes = new Map();                          // file → new text
const cur = f => writes.has(f) ? writes.get(f) : R(f);
const put = (f, s) => writes.set(f, s);
const notes = [];
const say = (ok, m) => { notes.push((ok ? '  ✓ ' : '  · ') + m); };

const arcadeSrc = R('js/lobby/arcade.js');
const block = arcadeSrc.match(/const ARC_CABINETS = \[([\s\S]*?)\n\];/);
if (!block) die('ARC_CABINETS not found in js/lobby/arcade.js');
const existing = [...block[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map(m => m[1]);
const num = existing.includes(id) ? existing.indexOf(id) + 1 : existing.length + 1;
const NN = String(num).padStart(2, '0');

// prefix collision with an already-registered cabinet
for (const other of existing.filter(o => o !== id)) {
  const o = (R(`js/arcade/${other}.js`).match(/getElementById\('(\w+)-canvas'\)/) || [])[1];
  if (o === px) die(`prefix "${px}" is already taken by ${other}.js`);
}

// 1 ── registry
if (existing.includes(id)) say(false, 'registry: already registered');
else {
  const q = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const text =
`  { id: '${id}', label: '${q(label)}', screen: '${screen}',
    start: () => ${startFn}(), stop: () => ${stopFn}(),
    blurb: '${q(blurb)}', accent: '${accent.toLowerCase()}' },`;
  put('js/lobby/arcade.js', arcadeSrc.replace(block[0], () => `const ARC_CABINETS = [${block[1]}\n${text}\n];`));
  if (cur('js/lobby/arcade.js') === arcadeSrc) die('could not insert into ARC_CABINETS');
  say(true, `registry: ${id} → #${NN}`);
}

// 2 ── allScreens[]
{
  const f = 'js/engine.js', s = R(f);
  const m = s.match(/const allScreens = \[([\s\S]*?)\n\];/);
  if (!m) die('allScreens[] not found in engine.js');
  if (m[1].includes(`'${screen}'`)) say(false, 'allScreens[]: already there');
  else { put(f, s.replace(m[0], () => `const allScreens = [${m[1]}\n  '${screen}',\n];`)); say(true, `allScreens[]: '${screen}'`); }
}

// 3 ── markup
{
  const f = 'src/screens/_secret.html', s = R(f);
  if (s.includes(`id="${screen}"`)) say(false, 'markup: already there');
  else {
    const at = s.lastIndexOf('<!-- ══ ARCADE CABINET');
    const close = at < 0 ? -1 : s.indexOf('\n  </section>\n', at);
    if (close < 0) die('no existing cabinet <section> in _secret.html to insert after');
    const T = label.toUpperCase();
    const sec =
`
  <!-- ══ ARCADE CABINET ${NN} — ${T} ══ -->
  <section id="${screen}" style="display:none"
    class="relative flex flex-col w-full h-screen bg-black font-mono overflow-hidden">
    <div class="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
      <div class="text-green-400 text-xs tracking-widest opacity-60 select-none">${T}</div>
      <div class="flex items-center gap-2">
        <button class="btn-open-sound text-xl text-green-400 active:scale-90 transition-transform duration-100 min-h-11 min-w-11">🔊</button>
        <button id="btn-${px}-exit" class="text-green-400 text-lg font-bold active:scale-90 transition-transform duration-100 min-h-11 min-w-11">✕</button>
      </div>
    </div>
    <div id="${px}-stage" class="flex-1 min-h-0 flex items-center justify-center" style="touch-action:none">
      <canvas id="${px}-canvas" class="block"></canvas>
    </div>
  </section>
`;
    const end = close + '\n  </section>\n'.length;
    put(f, s.slice(0, end) + sec + s.slice(end));
    say(true, `markup: #${screen} (#${px}-stage, #${px}-canvas, #btn-${px}-exit)`);
  }
}

// 4 ── script tag
{
  const f = 'src/screens/_scripts-3.html', s = R(f), tag = `  <script src="js/arcade/${id}.js"></script>\n`;
  if (s.includes(`js/arcade/${id}.js`)) say(false, 'script tag: already there');
  else {
    const all = [...s.matchAll(/ *<script src="js\/arcade\/[\w-]+\.js"><\/script>\n/g)];
    if (!all.length) die('no js/arcade <script src> in _scripts-3.html to insert after');
    const last = all[all.length - 1], end = last.index + last[0].length;
    put(f, s.slice(0, end) + tag + s.slice(end)); say(true, `script tag: js/arcade/${id}.js`);
  }
}

// 5 ── precache + CACHE_NAME
{
  const f = 'sw.js', s = R(f);
  let t = s;
  if (s.includes(`'js/arcade/${id}.js'`)) say(false, 'precache: already there');
  else {
    const all = [...s.matchAll(/ *'js\/arcade\/[\w-]+\.js',\n/g)];
    if (!all.length) die('no js/arcade entry in PRECACHE_URLS to insert after');
    const last = all[all.length - 1], end = last.index + last[0].length;
    t = s.slice(0, end) + `  'js/arcade/${id}.js',\n` + s.slice(end); say(true, `precache: 'js/arcade/${id}.js'`);
  }
  const m = t.match(/const CACHE_NAME = 'sylly-games-v(\d+)';/);
  if (!m) die('CACHE_NAME not found in sw.js');
  let headVer = null;
  try { headVer = (cp.execSync('git show HEAD:sw.js', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    .match(/const CACHE_NAME = 'sylly-games-v(\d+)';/) || [])[1]; } catch (_) {}
  // A re-run that added nothing must not bump; otherwise one bump per uncommitted batch.
  const addedSomething = notes.some(n => n.startsWith('  ✓'));
  const bump = flag('bump') ? true : flag('no-bump') ? false : (addedSomething && (headVer === null || headVer === m[1]));
  if (bump) { t = t.replace(m[0], `const CACHE_NAME = 'sylly-games-v${+m[1] + 1}';`); say(true, `CACHE_NAME: v${m[1]} → v${+m[1] + 1}`); }
  else say(false, `CACHE_NAME: left at v${m[1]} (${flag('no-bump') ? '--no-bump' : !addedSomething ? 'nothing new to ship' : 'already bumped since HEAD v' + headVer + ' — one bump per batch'})`);
  if (t !== s) put(f, t);
}

// 6 ── header number
{
  const s = R(rel);
  if (/ARCADE CABINET 0N/.test(s)) { put(rel, s.replace('ARCADE CABINET 0N', `ARCADE CABINET ${NN}`)); say(true, `header: ARCADE CABINET ${NN}`); }
  else say(false, 'header: no "ARCADE CABINET 0N" placeholder (left alone)');
}

// 7 ── roster + code-map (rows only; the narrative docs stay by hand)
{
  const swNow = (cur('sw.js').match(/sylly-games-v(\d+)/) || [])[1];
  const f = 'js/arcade/arcade-roster.md';
  if (fs.existsSync(path.join(ROOT, f))) {
    const s = R(f), lines = s.split('\n');
    const i = lines.findIndex(l => l.startsWith('|') && l.includes(`\`${id}.js\``));
    if (i < 0) say(false, 'roster: no row for this cabinet — add one by hand');
    else if (/Shipped/.test(lines[i])) say(false, 'roster: row already Shipped');
    else {
      const cells = lines[i].split('|');                       // ['', '#', cabinet, file, prefix, genre, world, status, '']
      cells[1] = ` ${NN} `; cells[cells.length - 2] = ` Shipped (SW v${swNow}) `;
      lines[i] = cells.join('|'); put(f, lines.join('\n')); say(true, `roster: row → #${NN}, Shipped (SW v${swNow})`);
    }
  } else say(false, 'roster: file not found');
  const g = 'docs/code-map.md', cm = R(g);
  if (cm.includes(`\`#${screen}\``)) say(false, 'code-map: row already there');
  else {
    const rows = [...cm.matchAll(/^\| \d\d \| [^\n]*`#screen-arcade-[^\n]*\n/gm)];
    if (!rows.length) say(false, 'code-map: no cabinet table found — add the row by hand');
    else {
      const last = rows[rows.length - 1], end = last.index + last[0].length;
      const row = `| ${NN} | ${label.toUpperCase()} | \`${id}\` | \`${px}\` | \`#${screen}\` | \`${startFn}()\` | \`${stopFn}()\` |\n`;
      put(g, cm.slice(0, end) + row + cm.slice(end)); say(true, `code-map: row #${NN}`);
    }
  }
}

// ── apply ───────────────────────────────────────────────────────────────────
console.log(`\n${DRY ? 'DRY RUN — ' : ''}${label} (id ${id}, prefix ${px}, entry ${startFn}(), teardown ${stopFn}()) → cabinet #${NN}\n`);
console.log(notes.join('\n'));
if (DRY) { console.log(`\nWould write: ${[...writes.keys()].join(', ') || '(nothing)'}`); process.exit(0); }
for (const [f, s] of writes) fs.writeFileSync(path.join(ROOT, f), s);

const run = cmd => { try { return { ok: true, out: cp.execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
                     catch (e) { return { ok: false, out: (e.stdout || '').toString() + (e.stderr || '').toString() }; } };
if (!NOCHECK) {
  console.log('\n── build + checks');
  let green = true;
  for (const cmd of ['node tools/build-index.js', 'node tools/verify-build-fresh.js', 'node tools/verify-arcade.js', 'node tools/smoke-arcade.js ' + id]) {
    const r = run(cmd), tail = r.out.trim().split('\n').slice(-1)[0];
    console.log(`  ${r.ok ? '✓' : '✗'} ${cmd}  — ${tail}`);
    if (!r.ok) { green = false; console.log(r.out.split('\n').filter(l => /✗|FAIL/.test(l)).join('\n')); }
  }
  if (!green) { console.log('\n✗ a check failed — the seams are written; fix the cause and re-run (it is idempotent).'); process.exit(1); }
}
console.log(`\nStill by hand: CLAUDE.md Current Focus (+ move the outgoing SW entry to docs/sw-changelog.md),
docs/deferred-work.md (play-test + offline-check counts), shared-implementation-notes if a lesson emerged.
Then a real-phone play-test.`);
