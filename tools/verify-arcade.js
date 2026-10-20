// ═══════════════════════════════════════════════════════════════
// verify-arcade.js — the arcade cabinet registration harness.
//
// ARC_CABINETS (js/lobby/arcade.js, SW v254 — was SM_ARCADE in secret-mode.js) is
// the whole contract: the Arcade room's list renders from it, engine.js's
// resetToLobby() tears every cabinet down through its stop(), and the keyboard
// Konami guard checks every cabinet screen through it.
// A cabinet is only really registered when SEVEN seams agree, and every one
// of them fails SILENTLY:
//   • missing allScreens[] entry  → ghost screen, canvas paints under the app
//   • missing <script src>        → start() throws ReferenceError on launch
//   • missing precache entry      → the cabinet is absent offline only
//   • missing stop()              → its RAF loop runs under every later screen
//   • wrong DOM id                → getElementById null-throws inside start()
//   • a global collision          → clobbers a game 20 screens away
// None of that shows up in single-cabinet play-testing, which is why it is
// asserted mechanically here.
//
// Usage:  node tools/verify-arcade.js
// Depends on: nothing (Node built-ins only)
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const R    = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Body of a top-level `function name() { … }` by brace matching. Returns null
// when the declaration isn't there at all, so a caller can tell "no such
// function" apart from "function with an empty body".
function fnBody(src, name) {
  const decl = `function ${name}(`;
  const at = src.indexOf(decl);
  if (at === -1) return null;
  const open = src.indexOf('{', at);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  return null;
}

let pass = 0, fail = 0;
const ok  = m => { pass++; console.log(`  ✓ ${m}`); };
const bad = m => { fail++; console.log(`  ✗ ${m}`); };
const is  = (cond, m) => cond ? ok(m) : bad(m);

const secret   = R('js/secret-mode.js');
const arcade   = R('js/lobby/arcade.js');
const lobbyHtml = R('src/screens/lobby.html');
const engine   = R('js/engine.js');
const markup   = R('src/screens/arcade.html');
const scripts  = R('src/screens/_scripts-3.html');
const sw       = R('sw.js');

// ── Parse ARC_CABINETS out of arcade.js ──────────────────────────────────────
// Read rather than eval: the file is full of browser globals.
const block = arcade.match(/const ARC_CABINETS = \[([\s\S]*?)\n\];/);
if (!block) { console.log('✗ ARC_CABINETS not found in js/lobby/arcade.js'); process.exit(1); }

const CABS = [...block[1].matchAll(
  /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*screen:\s*'([^']+)',\s*start:\s*\(\)\s*=>\s*(\w+)\(\),\s*stop:\s*\(\)\s*=>\s*(\w+)\(\)/g
)].map(m => ({ id: m[1], label: m[2], screen: m[3], start: m[4], stop: m[5] }));

console.log('\n══ Arcade cabinet registration ══\n');
console.log(`ARC_CABINETS declares ${CABS.length} cabinet(s): ${CABS.map(c => c.id).join(', ')}\n`);

// Every entry must have parsed — a malformed one silently vanishes from CABS
// and would make every check below pass by omission.
const entryCount = (block[1].match(/\{\s*id:/g) || []).length;
is(entryCount === CABS.length,
  `all ${entryCount} ARC_CABINETS entries parsed (id/label/screen/start/stop each present)`);

// ── Per-cabinet: the seven seams ─────────────────────────────────────────────
const prefixes = {};
for (const c of CABS) {
  console.log(`\n── ${c.id}  (${c.label})`);
  const rel = `js/arcade/${c.id}.js`;
  const abs = path.join(ROOT, rel);

  if (!fs.existsSync(abs)) { bad(`${rel} exists`); continue; }
  ok(`${rel} exists`);
  const src = R(rel);

  // 1. entry + teardown are defined in that cabinet's own file
  is(new RegExp(`^function ${c.start}\\(`, 'm').test(src), `${c.start}() defined in ${c.id}.js`);
  is(new RegExp(`^function ${c.stop}\\(`, 'm').test(src),  `${c.stop}() defined in ${c.id}.js`);

  // 2. start() navigates to the screen the registry names
  is(src.includes(`showScreen('${c.screen}')`), `${c.start}() shows ${c.screen}`);

  // 3. the screen is registered in allScreens[] — else it never hides
  is(new RegExp(`'${c.screen}'`).test(engine.match(/const allScreens = \[([\s\S]*?)\n\];/)[1]),
    `${c.screen} in engine.js allScreens[]`);

  // 4. markup exists, with the stage/canvas/exit ids the code reaches for
  const px = (src.match(/getElementById\('(\w+)-canvas'\)/) || [])[1];
  is(!!px, `${c.id}.js names a <prefix>-canvas`);
  if (px) {
    prefixes[px] = c.id;
    is(markup.includes(`id="screen-arcade-${c.id}"`), `${c.screen} markup in arcade.html`);
    is(markup.includes(`id="${px}-stage"`),           `#${px}-stage in markup`);
    is(markup.includes(`id="${px}-canvas"`),          `#${px}-canvas in markup`);
    is(markup.includes(`id="btn-${px}-exit"`),        `#btn-${px}-exit in markup`);
    is(src.includes(`getElementById('btn-${px}-exit')`), `${c.id}.js wires #btn-${px}-exit`);
    // touch-action:none on the stage — without it the browser eats the drag
    const stage = markup.match(new RegExp(`id="${px}-stage"[^>]*>`));
    is(!!stage && /touch-action:\s*none/.test(stage[0]), `#${px}-stage sets touch-action:none`);
    // the exit must tear its own cabinet down before leaving
    is(new RegExp(`btn-${px}-exit'\\)[\\s\\S]{0,400}?${c.stop}\\(\\);?\\s*arcExitCabinet\\(\\)`).test(src),
      `exit button calls ${c.stop}() then arcExitCabinet() (back to the room)`);
  }

  // 5. the script tag — without it start() is a ReferenceError
  is(scripts.includes(`js/arcade/${c.id}.js`), `<script src> in _scripts-3.html`);

  // 6. precached — else the cabinet is missing offline only
  is(new RegExp(`'js/arcade/${c.id}\\.js'`).test(sw), `'${rel}' in sw.js PRECACHE_URLS`);

  // 7. house rules: one RAF loop, and the teardown must actually cancel it.
  // The body is taken by brace matching, not a lazy regex — a regex that
  // silently fails to match yields an empty body, and "empty body has no
  // cancelAnimationFrame" is the right answer for the wrong reason.
  is(/cancelAnimationFrame/.test(src), `${c.id}.js cancels its RAF handle`);
  const stopBody = fnBody(src, c.stop);
  is(stopBody !== null, `${c.stop}() body located`);
  is(stopBody !== null && /cancelAnimationFrame/.test(stopBody),
    `${c.stop}() cancels the RAF loop`);
}

// ── Cross-cabinet: prefixes must be unique ───────────────────────────────────
console.log('\n── registry-wide');
is(Object.keys(prefixes).length === CABS.length,
  `all ${CABS.length} cabinet prefixes distinct (${Object.keys(prefixes).join(', ')})`);

// ── engine.js must tear down THROUGH the registry ────────────────────────────
// A hardcoded single call is the bug this harness exists to prevent: it tears
// down one cabinet and leaves every other loop painting under the next screen.
const reset = engine.match(/function resetToLobby\(\)[\s\S]*?\n\}/);
is(!!reset && /ARC_CABINETS\.forEach\(cab => \{[\s\S]{0,80}?cab\.stop\(\)/.test(reset[0]),
  'resetToLobby() tears down every cabinet via ARC_CABINETS.forEach(cab => cab.stop())');
is(!!reset && /arcStop\(\)/.test(reset[0]), "resetToLobby() clears the room's launch beat (arcStop)");
is(!!reset && !/if \(typeof resetArcade === 'function'\) resetArcade\(\);/.test(reset[0]),
  'resetToLobby() no longer hardcodes a single cabinet teardown');

// The keyboard-Konami guard must cover every cabinet, not just the first one —
// the arrow keys are several cabinets' steering.
is(/\['screen-arcade'\]\.concat\(ARC_CABINETS\.map\(cab => cab\.screen\)\)\.some\(/.test(secret),
  'keyboard Konami guard checks the room and every cabinet screen (not just asherplane)');

// ── The room (SW v254) ───────────────────────────────────────────────────────
console.log('\n── the Arcade room');
is(/'screen-arcade'/.test(engine.match(/const allScreens = \[([\s\S]*?)\n\];/)[1]), 'screen-arcade in engine.js allScreens[]');
for (const id of ['screen-arcade', 'arc-list', 'arc-blurb', 'btn-arc-start', 'btn-arc-close'])
  is(lobbyHtml.includes(`id="${id}"`), `#${id} in src/screens/lobby.html`);
is(/ARC_CABINETS\.forEach/.test(fnBody(arcade, 'arcRender') || ''), 'the room lists from ARC_CABINETS');
is(/ARC_CABINETS\.forEach\(cab => \{[\s\S]{0,60}?cab\.stop\(\)/.test(fnBody(arcade, 'arcExitCabinet') || ''), "a cabinet's ✕ stops every cabinet before the room returns");
is(/clearTimeout\(arcLaunchTimer\)/.test(fnBody(arcade, 'arcStop') || ''), 'arcStop() clears the launch beat');
is(scripts.includes('js/lobby/arcade.js'), 'arcade.js <script src> in _scripts-3.html');
is(/'js\/lobby\/arcade\.js'/.test(sw) && /'css\/arcade\.css'/.test(sw), 'arcade.js + arcade.css in sw.js PRECACHE_URLS');
// No unlock any more, and nothing left pointing at the old Secret Mode arcade.
const stale = [];
const walkAll = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) { if (!p.includes('_archive')) walkAll(p); }
  else if (/\.(js|html)$/.test(e.name) && /\b(SM_ARCADE|smArcadeUnlocked|smArcadeLastId|smLaunchArcade|smRenderArcade|smOpenArcadeMenu|smShowArcadeTile)\b/.test(R(p))) stale.push(p);
} };
walkAll('js'); walkAll('src');
is(stale.length === 0, stale.length ? `stale Secret Mode arcade references: ${stale.join(', ')}` : 'no Secret Mode arcade references left (js/, src/)');

// ── Global collisions: arcade vs production, and arcade vs arcade ────────────
// Everything is a global here (no ES modules), so a stray unprefixed symbol in
// a cabinet can clobber a game 20 screens away.
const DECL = /^(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
const declsOf = file => {
  const s = R(file), out = new Set(); let m;
  DECL.lastIndex = 0;
  while ((m = DECL.exec(s))) out.add(m[1]);
  return out;
};
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) { if (!p.includes('arcade')) walk(p, out); }
    else if (e.name.endsWith('.js') && !/three\.min|tailwind-play/.test(e.name)) out.push(p);
  }
  return out;
};
const prodNames = new Map();
for (const f of walk('js')) for (const n of declsOf(f)) if (!prodNames.has(n)) prodNames.set(n, f);

const arcNames = new Map();          // name -> [cabinet files]
for (const c of CABS) {
  const rel = `js/arcade/${c.id}.js`;
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  for (const n of declsOf(rel)) {
    if (!arcNames.has(n)) arcNames.set(n, []);
    arcNames.get(n).push(c.id);
  }
}
const vsProd = [...arcNames].filter(([n]) => prodNames.has(n));
is(vsProd.length === 0,
  vsProd.length ? `arcade↔production global collisions: ${vsProd.map(([n, f]) => `${n} (${f}/${prodNames.get(n)})`).join(', ')}`
                : `no arcade↔production global collisions (${arcNames.size} cabinet globals checked)`);
const vsArc = [...arcNames].filter(([, f]) => f.length > 1);
is(vsArc.length === 0,
  vsArc.length ? `arcade↔arcade global collisions: ${vsArc.map(([n, f]) => `${n} (${f.join('+')})`).join(', ')}`
               : 'no arcade↔arcade global collisions');

// Only the teardowns may be unprefixed — anything else is a leak waiting to
// collide with a game added later. A cabinet may carry SUB-namespaces under its
// own prefix (slice.js's SLC_*/slc* hold the Fruity Personalities art), so the
// test is "starts with the prefix", not "equals prefix + underscore".
const stops = new Set(CABS.map(c => c.stop));
const leaks = [];
for (const c of CABS) {
  const rel = `js/arcade/${c.id}.js`;
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  const px = (R(rel).match(/getElementById\('(\w+)-canvas'\)/) || [])[1] || c.id;
  const upper = px.toUpperCase();
  for (const n of declsOf(rel)) {
    if (stops.has(n)) continue;
    if (n.startsWith(px) || n.startsWith(upper)) continue;
    leaks.push(`${n} (${c.id})`);
  }
}
is(leaks.length === 0,
  leaks.length ? `unprefixed cabinet globals: ${leaks.join(', ')}`
               : 'every cabinet global is prefixed (only resetArcade* are not)');

// ── Build freshness: markup lives in a partial, index.html is generated ──────
const idx = R('index.html');
for (const c of CABS) {
  is(idx.includes(`id="screen-arcade-${c.id}"`) && idx.includes(`js/arcade/${c.id}.js`),
    `${c.id} present in the generated index.html`);
}

console.log(`\n══ ${pass} passed, ${fail} failed ══\n`);
process.exit(fail ? 1 : 0);
